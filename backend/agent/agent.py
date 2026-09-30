"""Minimal Data Agent: plan tools, execute, synthesize evidence-backed answers."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from agent.llm import LLMError, LLMProvider, get_llm_provider
from agent.tools import REGISTERED_TOOLS, TOOL_DESCRIPTIONS, run_tools

logger = logging.getLogger(__name__)

MAX_TOOLS_PER_REQUEST = 7


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


def _normalize_tool_list(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    names: list[str] = []
    for item in raw:
        if isinstance(item, str) and item in REGISTERED_TOOLS and item not in names:
            names.append(item)
    return names[:MAX_TOOLS_PER_REQUEST]


def _default_tools_for_broad_question() -> list[str]:
    return [
        "profile_dataset",
        "get_missing_values",
        "get_outlier_counts",
        "get_correlations",
        "get_categorical_frequencies",
    ]


def select_tools(question: str, llm: LLMProvider) -> list[str]:
    tool_lines = "\n".join(
        f"- {name}: {desc}" for name, desc in TOOL_DESCRIPTIONS.items()
    )
    system = (
        "You are a data analysis planner. Choose which tools to run to answer the user's "
        "question about a CSV dataset. Respond with JSON only: "
        '{"tools": ["tool_name", ...]}. '
        "Use only tool names from the list. Pick the minimum set needed; "
        "for broad questions about patterns or unusual behavior, include profiling, "
        "missing values, outliers, correlations, and categorical frequencies."
    )
    user = f"Available tools:\n{tool_lines}\n\nUser question:\n{question}"
    raw = llm.chat(
        [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        json_mode=True,
    )
    try:
        payload = _parse_json_object(raw)
    except AgentError:
        logger.warning("Tool planning JSON parse failed; using heuristic defaults.")
        return _default_tools_for_broad_question()

    tools = _normalize_tool_list(payload.get("tools"))
    if not tools:
        logger.warning("LLM selected no valid tools; using heuristic defaults.")
        return _default_tools_for_broad_question()
    return tools


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
    cleaned_evidence: list[dict[str, Any]] = []
    for item in evidence:
        if isinstance(item, dict) and item.get("finding") and item.get("source"):
            cleaned_evidence.append(
                {
                    "finding": str(item["finding"]),
                    "source": str(item["source"]),
                    "value": item.get("value"),
                }
            )
    return {"answer": answer.strip(), "evidence": cleaned_evidence}


def investigate(question: str, dataframe, llm: LLMProvider | None = None) -> dict[str, Any]:
    q = (question or "").strip()
    if not q:
        raise AgentError("Question must not be empty.", code="invalid_question")
    if dataframe is None or len(dataframe.index) == 0:
        raise AgentError("Dataset is empty.", code="empty_dataset")

    provider = llm or get_llm_provider()

    try:
        tools_used = select_tools(q, provider)
        try:
            tool_outputs = run_tools(tools_used, dataframe)
        except Exception as exc:
            logger.exception("Tool execution failed")
            raise AgentError(
                "An analysis tool failed while processing the dataset.",
                code="tool_failure",
            ) from exc
        synthesis = synthesize_answer(q, tool_outputs, provider)
    except LLMError as exc:
        raise AgentError(str(exc), code="llm_unavailable") from exc

    return {
        "question": q,
        "answer": synthesis["answer"],
        "evidence": synthesis["evidence"],
        "tools_used": tools_used,
        "tool_results": tool_outputs,
    }
