import json
import os
import sys
import unittest
import urllib.error
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from agent import llm_client


class FakeResponse:
    def __init__(self, payload, status=200):
        self.payload = json.dumps(payload).encode("utf-8")
        self.status = status

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def read(self):
        return self.payload


class LLMClientTests(unittest.TestCase):
    def setUp(self):
        self.messages = [{"role": "user", "content": "Return JSON."}]

    def test_ollama_request_shape(self):
        response = {"message": {"content": '{"ok": true}'} }
        with patch.dict(os.environ, {"LLM_PROVIDER": "ollama", "LLM_MODEL": "local-model", "LLM_BASE_URL": "http://localhost:11434", "LLM_TIMEOUT_SECONDS": "12"}, clear=True):
            with patch("agent.llm_client.urllib.request.urlopen", return_value=FakeResponse(response)) as request:
                result = llm_client.complete(self.messages, json_mode=True)

        payload = json.loads(request.call_args.args[0].data.decode("utf-8"))
        self.assertEqual(result, '{"ok": true}')
        self.assertEqual(request.call_args.args[0].full_url, "http://localhost:11434/api/chat")
        self.assertEqual(payload["model"], "local-model")
        self.assertEqual(payload["format"], "json")
        self.assertEqual(request.call_args.kwargs["timeout"], 12.0)

    def test_groq_request_shape(self):
        response = {"choices": [{"message": {"content": '{"ok": true}'}}]}
        with patch.dict(os.environ, {"LLM_PROVIDER": "groq", "GROQ_API_KEY": "secret", "LLM_MODEL": "groq-model"}, clear=True):
            with patch("agent.llm_client.urllib.request.urlopen", return_value=FakeResponse(response)) as request:
                result = llm_client.complete(self.messages, json_mode=True)

        payload = json.loads(request.call_args.args[0].data.decode("utf-8"))
        self.assertEqual(result, '{"ok": true}')
        self.assertEqual(request.call_args.args[0].full_url, "https://api.groq.com/openai/v1/chat/completions")
        self.assertEqual(payload["response_format"], {"type": "json_object"})
        self.assertEqual(request.call_args.args[0].get_header("Authorization"), "Bearer secret")

    def test_gemini_request_shape(self):
        response = {"candidates": [{"content": {"parts": [{"text": '{"ok": true}'}]}}]}
        messages = [
            {"role": "system", "content": "Be precise."},
            {"role": "user", "content": "Return JSON."},
        ]
        with patch.dict(os.environ, {"LLM_PROVIDER": "gemini", "GEMINI_API_KEY": "secret", "LLM_MODEL": "gemini-model"}, clear=True):
            with patch("agent.llm_client.urllib.request.urlopen", return_value=FakeResponse(response)) as request:
                result = llm_client.complete(messages, json_mode=True)

        payload = json.loads(request.call_args.args[0].data.decode("utf-8"))
        self.assertEqual(result, '{"ok": true}')
        self.assertIn("models/gemini-model:generateContent?key=secret", request.call_args.args[0].full_url)
        self.assertEqual(payload["generationConfig"]["responseMimeType"], "application/json")
        self.assertEqual(payload["systemInstruction"]["parts"][0]["text"], "Be precise.")

    def test_missing_key_and_unknown_provider(self):
        with patch.dict(os.environ, {"LLM_PROVIDER": "groq"}, clear=True):
            with self.assertRaisesRegex(llm_client.LLMError, "GROQ_API_KEY"):
                llm_client.complete(self.messages)
        with patch.dict(os.environ, {"LLM_PROVIDER": "other"}, clear=True):
            with self.assertRaises(llm_client.LLMError):
                llm_client.complete(self.messages)

    def test_retries_transient_server_failure_once(self):
        response = {"message": {"content": "ok"}}
        with patch.dict(os.environ, {"LLM_PROVIDER": "ollama"}, clear=True):
            with patch(
                "agent.llm_client.urllib.request.urlopen",
                side_effect=[FakeResponse({}, 503), FakeResponse(response)],
            ) as request:
                self.assertEqual(llm_client.complete(self.messages), "ok")
        self.assertEqual(request.call_count, 2)

    def test_retries_timeout_once(self):
        response = {"message": {"content": "ok"}}
        with patch.dict(os.environ, {"LLM_PROVIDER": "ollama"}, clear=True):
            with patch(
                "agent.llm_client.urllib.request.urlopen",
                side_effect=[TimeoutError(), FakeResponse(response)],
            ) as request:
                self.assertEqual(llm_client.complete(self.messages), "ok")
        self.assertEqual(request.call_count, 2)

    def test_does_not_retry_client_failure_and_does_not_expose_key(self):
        error = urllib.error.HTTPError("http://provider", 401, "bad", {}, None)
        with patch.dict(os.environ, {"LLM_PROVIDER": "groq", "GROQ_API_KEY": "secret-key"}, clear=True):
            with patch("agent.llm_client.urllib.request.urlopen", side_effect=error) as request:
                with self.assertRaises(llm_client.LLMError) as raised:
                    llm_client.complete(self.messages)
        self.assertEqual(request.call_count, 1)
        self.assertNotIn("secret-key", str(raised.exception))


if __name__ == "__main__":
    unittest.main()