"""Minimal Data Agent: plan tools, execute, synthesize evidence-backed answers."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

from analysis import analyze_dataframe
from agent.llm import LLMError, LLMProvider, get_llm_provider
from agent.tools import REGISTERED_TOOLS, TOOL_DESCRIPTIONS, run_tool

logger = logging.getLogger(__name__)

MAX_AGENT_STEPS = max(1, int(os.getenv("MAX_AGENT_STEPS", "5")))


class AgentError(Exception):
    def __init__(self, message: str, *, code: str = "agent_error"):
        super().__init__(message)
        self.code = code


def _parse_json_object(text: str) -> dict[str, Any]:
    text = text.strip()
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
    raise AgentError("LLM returned malformed JSON.", code="llm_malformed_response")


def _result_contains(value: Any, result: Any) -> bool:
    if value == result:
        return True
    if isinstance(result, dict):
        return any(_result_contains(value, item) for item in result.values())
    if isinstance(result, list):
        return any(_result_contains(value, item) for item in result)
    return False


def decide_next_action(
    question: str,
    steps: list[dict[str, Any]],
    llm: LLMProvider,
) -> dict[str, str]:
    tool_lines = "\n".join(
        f"- {name}: {desc}" for name, desc in TOOL_DESCRIPTIONS.items()
    )
    system = (
        "You are an iterative data investigator. Choose exactly one next action using the "
        "actual prior tool results, or finish if the evidence is sufficient. Use only the "
        "available tools. Respond with JSON only, in one of these forms: "
        '{"action":"run_tool","tool":"tool_name","reason":"..."} or '
        '{"action":"finish","reason":"..."}.'
    )
    user = (
        f"Original question:\n{question}\n\n"
        f"Available tools:\n{tool_lines}\n\n"
        f"Previous investigation steps and actual results (JSON):\n"
        f"{json.dumps(steps, default=str)}\n"
    )
    raw = llm.chat(
        [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        json_mode=True,
    )
    payload = _parse_json_object(raw)
    action = payload.get("action")
    reason = payload.get("reason")
    if action not in {"run_tool", "finish"} or not isinstance(reason, str) or not reason.strip():
        raise AgentError("LLM returned an invalid investigation decision.", code="llm_malformed_response")
    if action == "finish":
        return {"action": action, "reason": reason.strip()}

    tool_name = payload.get("tool")
    if not isinstance(tool_name, str) or tool_name not in REGISTERED_TOOLS:
        raise AgentError("LLM requested an unavailable analysis tool.", code="invalid_tool_selection")
    return {"action": action, "tool": tool_name, "reason": reason.strip()}


def synthesize_answer(
    question: str,
    tool_outputs: list[dict[str, Any]],
    llm: LLMProvider,
) -> dict[str, Any]:
    system = (
        "You are a data analyst. Answer ONLY using the tool results provided. "
        "Do not invent numbers, correlations, or column names. "
        "If evidence is insufficient, say so. "
        "Respond with JSON: "
        '{"answer": "...", "evidence": [{"finding": "...", "source": "tool_name", "value": ...}]}. '
        "Each evidence item must cite a tool from tools_used and use values present in the results."
    )
    user = (
        f"Question: {question}\n\n"
        f"Tool results (JSON):\n{json.dumps(tool_outputs, default=str)}\n"
    )
    raw = llm.chat(
        [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        json_mode=True,
    )
    payload = _parse_json_object(raw)
    answer = payload.get("answer")
    evidence = payload.get("evidence")
    if not isinstance(answer, str) or not answer.strip():
        raise AgentError("LLM did not produce an answer.", code="llm_malformed_response")
    if not isinstance(evidence, list):
        evidence = []
    available_tools = {output["tool"] for output in tool_outputs}
    cleaned_evidence: list[dict[str, Any]] = []
    for item in evidence:
        if (
            isinstance(item, dict)
            and item.get("finding")
            and isinstance(item.get("source"), str)
            and item["source"] in available_tools
            and (
                "value" not in item
                or any(
                    output["tool"] == item["source"]
                    and _result_contains(item["value"], output["result"])
                    for output in tool_outputs
                )
            )
        ):
            cleaned_evidence.append(
                {
                    "finding": str(item["finding"]),
                    "source": str(item["source"]),
                    "value": item.get("value"),
                }
            )
    return {"answer": answer.strip(), "evidence": cleaned_evidence}


def _step_summary(result: dict[str, Any]) -> str:
    summary = json.dumps(result.get("result", {}), ensure_ascii=True, default=str)
    if len(summary) > 240:
        return summary[:237] + "..."
    return summary


def investigate(question: str, dataframe, llm: LLMProvider | None = None) -> dict[str, Any]:
    q = (question or "").strip()
    if not q:
        raise AgentError("Question must not be empty.", code="invalid_question")
    if dataframe is None or len(dataframe.index) == 0:
        raise AgentError("Dataset is empty.", code="empty_dataset")

    provider = llm or get_llm_provider()

    steps: list[dict[str, Any]] = []
    try:
        analysis = analyze_dataframe(dataframe)
        for _ in range(MAX_AGENT_STEPS):
            decision = decide_next_action(q, steps, provider)
            if decision["action"] == "finish":
                break
            tool_name = decision["tool"]
            try:
                result = run_tool(tool_name, dataframe, analysis)
            except Exception as exc:
                logger.exception("Tool execution failed: %s", tool_name)
                raise AgentError(
                    "An analysis tool failed while processing the dataset.",
                    code="tool_failure",
                ) from exc
            steps.append({"tool": tool_name, "reason": decision["reason"], "result": result})

        reached_limit = len(steps) == MAX_AGENT_STEPS
        synthesis = synthesize_answer(q, [step["result"] for step in steps], provider)
    except LLMError as exc:
        raise AgentError(str(exc), code="llm_unavailable") from exc

    answer = synthesis["answer"]
    if reached_limit:
        answer += f"\n\nInvestigation limit reached ({MAX_AGENT_STEPS} steps); this answer uses the evidence collected so far."

    return {
        "question": q,
        "answer": answer,
        "evidence": synthesis["evidence"],
        "tools_used": [step["tool"] for step in steps],
        "tool_results": [step["result"] for step in steps],
        "investigation": [
            {
                "step": index,
                "tool": step["tool"],
                "reason": step["reason"],
                "summary": _step_summary(step["result"]),
            }
            for index, step in enumerate(steps, start=1)
        ],
    }
