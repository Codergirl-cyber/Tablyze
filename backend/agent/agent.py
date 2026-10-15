"""Data Agent for investigating questions about uploaded datasets."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

import pandas as pd

from analysis import analyze_dataframe
from . import llm_client
from .llm_client import LLMError
from .tools import REGISTERED_TOOLS, TOOL_DESCRIPTIONS, run_tool


logger = logging.getLogger(__name__)

MAX_AGENT_STEPS = max(1, int(os.getenv("MAX_AGENT_STEPS", "5")))


class AgentError(Exception):
    """Error raised during agent investigation."""

    def __init__(
        self,
        message: str,
        code: str = "agent_error",
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code


def _parse_json_object(text: str) -> dict[str, Any]:
    """Parse a JSON object, even if extra text surrounds it."""

    if not isinstance(text, str) or not text.strip():
        raise AgentError(
            "The language model returned an empty response.",
            code="llm_empty_response",
        )

    text = text.strip()

    # First, try parsing the entire response.
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    # Remove Markdown code fences.
    cleaned = re.sub(
        r"^\s*```(?:json)?\s*|\s*```\s*$",
        "",
        text,
        flags=re.IGNORECASE,
    ).strip()

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    # Try to locate a JSON object inside surrounding text.
    decoder = json.JSONDecoder()

    for match in re.finditer(r"\{", cleaned):
        try:
            parsed, _ = decoder.raw_decode(cleaned[match.start():])

            if isinstance(parsed, dict):
                return parsed

        except json.JSONDecodeError:
            continue

    raise AgentError(
        "The language model returned malformed JSON.",
        code="llm_malformed_response",
    )


def _complete(messages: list[dict[str, str]]) -> str:
    """Request a response from the configured LLM."""

    try:
        return llm_client.complete(messages, json_mode=True)

    except LLMError:
        logger.exception("LLM request failed.")
        raise

    except Exception as exc:
        logger.exception("Unexpected LLM error.")

        raise AgentError(
            "The language model request failed.",
            code="llm_request_failed",
        ) from exc


def _tool_descriptions() -> str:
    """Return the registered tool descriptions as JSON."""

    return json.dumps(
        TOOL_DESCRIPTIONS,
        ensure_ascii=False,
        default=str,
    )


def decide_next_action(
    question: str,
    dataframe_summary: dict[str, Any],
    previous_steps: list[dict[str, Any]],
) -> dict[str, Any]:
    """Ask the LLM to select the next registered analysis tool."""

    messages = [
        {
            "role": "system",
            "content": (
                "You are a data-analysis planning assistant.\n"
                "You must return one valid JSON object only.\n"
                "Do not call functions or tools yourself.\n"
                "Choose tools only from the supplied available_tools.\n"
                'To execute a tool, return: '
                '{"action":"run_tool","tool":"TOOL_NAME",'
                '"reason":"short explanation"}\n'
                'When no further analysis is necessary, return: '
                '{"action":"finish","reason":"short explanation"}\n'
                "Do not invent tool names.\n"
                "Avoid repeating a tool that has already produced "
                "a successful result unless additional analysis is needed."
            ),
        },
        {
            "role": "user",
            "content": json.dumps(
                {
                    "question": question,
                    "dataframe_summary": dataframe_summary,
                    "previous_steps": previous_steps,
                    "available_tools": _tool_descriptions(),
                },
                ensure_ascii=False,
                default=str,
            ),
        },
    ]

    for attempt in range(2):
        response = _complete(messages)

        try:
            action = _parse_json_object(response)
            action_type = action.get("action")

            if action_type == "finish":
                return action

            if action_type != "run_tool":
                raise AgentError(
                    "The language model returned an invalid action.",
                    code="llm_invalid_action",
                )

            tool_name = action.get("tool")
            if (
                not isinstance(tool_name, str)
                or tool_name not in REGISTERED_TOOLS
            ):
                raise AgentError(
                    "The language model selected an unknown tool.",
                    code="llm_invalid_tool",
                )

            return action
        except AgentError as exc:
            retryable_codes = {
                "llm_empty_response",
                "llm_malformed_response",
                "llm_invalid_action",
                "llm_invalid_tool",
            }
            if attempt == 1 or exc.code not in retryable_codes:
                raise

            messages.extend(
                [
                    {"role": "assistant", "content": response},
                    {
                        "role": "user",
                        "content": (
                            "Your previous response could not be used: "
                            f"{exc}. Return valid JSON only, using exactly "
                            "the required action format and a tool from "
                            "available_tools."
                        ),
                    },
                ]
            )

    raise AgentError(
        "The language model returned an invalid action.",
        code="llm_invalid_action",
    )


def synthesize_answer(
    question: str,
    dataframe_summary: dict[str, Any],
    tool_outputs: list[dict[str, Any]],
) -> dict[str, Any]:
    """Generate a final answer based on the available analysis results."""

    messages = [
        {
            "role": "system",
            "content": (
                "You are a careful data analyst.\n"
                "Answer the user's question using only the supplied "
                "dataset summary and analysis tool results.\n"
                "Do not invent statistics or findings.\n"
                "Return one valid JSON object with this structure:\n"
                '{"answer":"your answer","evidence":'
                '[{"source":"tool name","finding":"supported finding"}]}\n'
                "If evidence is insufficient, explain the limitation.\n"
                "Do not call functions or tools yourself."
            ),
        },
        {
            "role": "user",
            "content": json.dumps(
                {
                    "question": question,
                    "dataframe_summary": dataframe_summary,
                    "tool_outputs": tool_outputs,
                },
                ensure_ascii=False,
                default=str,
            ),
        },
    ]

    response = _complete(messages)
    result = _parse_json_object(response)

    answer = result.get("answer")
    evidence = result.get("evidence", [])

    if not isinstance(answer, str):
        raise AgentError(
            "The language model returned an invalid answer.",
            code="llm_invalid_answer",
        )

    if not isinstance(evidence, list):
        evidence = []

    valid_evidence: list[dict[str, str]] = []

    for item in evidence:
        if not isinstance(item, dict):
            continue

        source = item.get("source")
        finding = item.get("finding")

        if isinstance(source, str) and isinstance(finding, str):
            valid_evidence.append(
                {
                    "source": source,
                    "finding": finding,
                }
            )

    return {
        "answer": answer,
        "evidence": valid_evidence,
    }


def investigate(
    question: str,
    dataframe: Any,
) -> dict[str, Any]:
    """Investigate a question about a dataframe using registered tools."""

    if not isinstance(question, str) or not question.strip():
        raise AgentError(
            "Please provide a question.",
            code="invalid_question",
        )

    if dataframe is None:
        raise AgentError(
            "No dataset is available for analysis.",
            code="missing_dataframe",
        )

    if not isinstance(dataframe, pd.DataFrame):
        raise AgentError(
            "The uploaded dataset is not a valid DataFrame.",
            code="invalid_dataframe",
        )

    question = question.strip()

    try:
        # Calculate dataset analysis once and reuse it for every tool.
        dataframe_summary = analyze_dataframe(dataframe)

        steps: list[dict[str, Any]] = []

        for step_number in range(MAX_AGENT_STEPS):
            action = decide_next_action(
                question=question,
                dataframe_summary=dataframe_summary,
                previous_steps=steps,
            )

            if action.get("action") == "finish":
                logger.info(
                    "Agent finished investigation: %s",
                    action.get("reason", ""),
                )
                break

            tool_name = action["tool"]
            reason = action.get("reason", "")

            logger.info(
                "Running agent tool %s (step %s/%s)",
                tool_name,
                step_number + 1,
                MAX_AGENT_STEPS,
            )

            try:
                # IMPORTANT:
                # run_tool requires three arguments:
                # tool name, DataFrame, and precomputed analysis.
                tool_result = run_tool(
                    tool_name,
                    dataframe,
                    dataframe_summary,
                )

                steps.append(
                    {
                        "tool": tool_name,
                        "reason": reason,
                        "result": tool_result,
                    }
                )

            except Exception as exc:
                logger.exception(
                    "Tool execution failed: %s",
                    tool_name,
                )

                steps.append(
                    {
                        "tool": tool_name,
                        "reason": reason,
                        "error": str(exc),
                    }
                )

        # Only pass the collected tool outputs to the answer generator.
        tool_outputs = [
            {
                "tool": step["tool"],
                "result": step.get("result"),
                "error": step.get("error"),
            }
            for step in steps
        ]

        # Avoid asking the LLM to invent an answer when no tool succeeded.
        successful_steps = [
            step for step in steps if "result" in step
        ]

        if steps and not successful_steps:
            raise AgentError(
                "The investigation could not produce any successful "
                "analysis results. Check the backend logs.",
                code="no_successful_tools",
            )

        final_result = synthesize_answer(
            question=question,
            dataframe_summary=dataframe_summary,
            tool_outputs=tool_outputs,
        )

        return {
            "question": question,
            "answer": final_result["answer"],
            "evidence": final_result["evidence"],
            "tools_used": [
                step["tool"] for step in successful_steps
            ],
            "tool_results": tool_outputs,
            "investigation": steps,
        }

    except LLMError as exc:
        logger.exception("LLM error during investigation.")

        raise AgentError(
            "The language model request failed. Check the backend logs.",
            code="llm_unavailable",
        ) from exc

    except AgentError:
        raise

    except Exception as exc:
        logger.exception("Investigation failed.")

        raise AgentError(
            "The investigation failed. Check the backend logs.",
            code="investigation_failed",
        ) from exc