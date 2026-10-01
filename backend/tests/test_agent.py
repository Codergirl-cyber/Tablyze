import json
import os
import sys
import unittest
from unittest.mock import patch

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from agent import agent
from agent.llm import LLMProvider


class ScriptedLLM(LLMProvider):
    def __init__(self, responses):
        self.responses = list(responses)
        self.messages = []

    def chat(self, messages, *, json_mode=False):
        self.messages.append(messages)
        response = self.responses.pop(0)
        return json.dumps(response) if isinstance(response, dict) else response


class AgentInvestigationTests(unittest.TestCase):
    def setUp(self):
        self.dataframe = pd.DataFrame(
            {"measure": [1.0, None, 3.0], "group": ["a", "b", "a"]}
        )

    def test_one_tool_then_finish(self):
        llm = ScriptedLLM(
            [
                {"action": "run_tool", "tool": "get_missing_values", "reason": "Inspect nulls."},
                {"action": "finish", "reason": "The result answers the question."},
                {"answer": "One missing value was found.", "evidence": []},
            ]
        )

        result = agent.investigate("Which columns have missing values?", self.dataframe, llm)

        self.assertEqual(result["tools_used"], ["get_missing_values"])
        self.assertEqual(len(result["investigation"]), 1)

    def test_malformed_decision_retries_once(self):
        llm = ScriptedLLM(
            [
                "not json",
                {"action": "finish", "reason": "The answer is already supported."},
                {"answer": "No tool was needed.", "evidence": []},
            ]
        )

        result = agent.investigate("Is there anything to inspect?", self.dataframe, llm)

        self.assertEqual(result["tools_used"], [])
        self.assertIn("Return valid JSON only", llm.messages[1][1]["content"])

    def test_next_decision_receives_prior_actual_result(self):
        llm = ScriptedLLM(
            [
                {"action": "run_tool", "tool": "profile_dataset", "reason": "Inspect the dataset."},
                {"action": "run_tool", "tool": "get_missing_values", "reason": "Profile shows columns to inspect."},
                {"action": "finish", "reason": "Missingness was checked."},
                {"answer": "The dataset has missing values.", "evidence": []},
            ]
        )

        result = agent.investigate("What unusual patterns exist?", self.dataframe, llm)

        self.assertEqual(result["tools_used"], ["profile_dataset", "get_missing_values"])
        second_decision_user_message = llm.messages[1][1]["content"]
        self.assertIn('"rows": 3', second_decision_user_message)
        self.assertIn("profile_dataset", second_decision_user_message)

    def test_stops_at_configured_step_limit(self):
        llm = ScriptedLLM(
            [
                {"action": "run_tool", "tool": "profile_dataset", "reason": "Continue."},
                {"action": "run_tool", "tool": "get_missing_values", "reason": "Continue."},
                {"answer": "Evidence collected.", "evidence": []},
            ]
        )

        with patch.object(agent, "MAX_AGENT_STEPS", 2):
            result = agent.investigate("Inspect this data.", self.dataframe, llm)

        self.assertEqual(len(result["tools_used"]), 2)
        self.assertIn("limit reached (2 steps)", result["answer"])
        self.assertEqual(len(llm.messages), 3)

    def test_invalid_tool_is_not_executed(self):
        llm = ScriptedLLM(
            [{"action": "run_tool", "tool": "execute_python", "reason": "Try code."}]
        )

        with patch.object(agent, "run_tool") as run_tool:
            with self.assertRaises(agent.AgentError) as raised:
                agent.investigate("Inspect this data.", self.dataframe, llm)

        run_tool.assert_not_called()
        self.assertEqual(raised.exception.code, "invalid_tool_selection")

    def test_tool_failure_is_controlled(self):
        llm = ScriptedLLM(
            [{"action": "run_tool", "tool": "profile_dataset", "reason": "Profile."}]
        )
        with patch.object(agent, "run_tool", side_effect=RuntimeError("private details")):
            with self.assertRaises(agent.AgentError) as raised:
                agent.investigate("Inspect this data.", self.dataframe, llm)

        self.assertEqual(raised.exception.code, "tool_failure")
        self.assertNotIn("private details", str(raised.exception))

    def test_evidence_must_reference_an_executed_tool(self):
        llm = ScriptedLLM(
            [
                {"action": "run_tool", "tool": "get_missing_values", "reason": "Check nulls."},
                {"action": "finish", "reason": "Done."},
                {
                    "answer": "A missing value was found.",
                    "evidence": [
                        {"finding": "Observed missing values.", "source": "get_missing_values", "value": 1},
                        {"finding": "Unsupported number.", "source": "get_missing_values", "value": 999},
                        {"finding": "Invented correlation.", "source": "get_correlations", "value": 0.99},
                    ],
                },
            ]
        )

        result = agent.investigate("Which columns have missing values?", self.dataframe, llm)

        self.assertEqual([item["source"] for item in result["evidence"]], ["get_missing_values"])


if __name__ == "__main__":
    unittest.main()