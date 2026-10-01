"""Provider-agnostic HTTP client for supported LLM providers."""

from __future__ import annotations

import json
import os
from pathlib import Path
import socket
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from dotenv import load_dotenv


ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=ENV_FILE, override=False)


class LLMError(Exception):
    """Raised for configuration, transport, provider, or response failures."""


def _timeout_seconds() -> float:
    try:
        return max(0.1, float(os.getenv("LLM_TIMEOUT_SECONDS", "60")))
    except ValueError:
        return 60.0


def _request_json(
    url: str,
    payload: dict[str, Any],
    headers: dict[str, str] | None = None,
) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "User-Agent": "tabexplain/1.0",
            **(headers or {}),
        },
        method="POST",
    )
    last_error: LLMError | None = None
    for attempt in range(2):
        try:
            with urllib.request.urlopen(request, timeout=_timeout_seconds()) as response:
                status = getattr(response, "status", None)
                if status is None:
                    status = response.getcode()
                raw = response.read().decode("utf-8")
            if status >= 500:
                raise LLMError("The LLM provider returned a server error.")
            if status != 200:
                raise LLMError("The LLM provider rejected the request.")
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError as exc:
                raise LLMError("The LLM provider returned invalid JSON.") from exc
            if not isinstance(parsed, dict):
                raise LLMError("The LLM provider returned an invalid response.")
            return parsed
        except urllib.error.HTTPError as exc:
            if 400 <= exc.code < 500:
                raise LLMError("The LLM provider rejected the request.") from exc
            last_error = LLMError("The LLM provider returned a server error.")
        except (TimeoutError, socket.timeout):
            last_error = LLMError("The LLM provider request timed out.")
        except (ConnectionError, OSError):
            last_error = LLMError("The LLM provider could not be reached.")
        except urllib.error.URLError as exc:
            last_error = LLMError("The LLM provider could not be reached.")
        except LLMError as exc:
            if "server error" not in str(exc):
                raise
            last_error = exc
        if attempt == 0:
            continue
    raise last_error or LLMError("The LLM provider request failed.")


def _ollama(messages: list[dict[str, str]], json_mode: bool) -> str:
    base_url = os.getenv("LLM_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    payload: dict[str, Any] = {
        "model": os.getenv("LLM_MODEL", "llama3.2"),
        "messages": messages,
        "stream": False,
    }
    if json_mode:
        payload["format"] = "json"
    response = _request_json(f"{base_url}/api/chat", payload)
    content = response.get("message", {}).get("content")
    if not isinstance(content, str) or not content.strip():
        raise LLMError("The LLM provider returned an empty response.")
    return content.strip()


def _groq(messages: list[dict[str, str]], json_mode: bool) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise LLMError("GROQ_API_KEY is required for the Groq provider.")
    payload: dict[str, Any] = {
        "model": os.getenv("LLM_MODEL", "openai/gpt-oss-20b"),
        "messages": messages,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    response = _request_json(
        "https://api.groq.com/openai/v1/chat/completions",
        payload,
        {"Authorization": f"Bearer {api_key}"},
    )
    try:
        content = response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMError("The LLM provider returned an invalid response.") from exc
    if not isinstance(content, str) or not content.strip():
        raise LLMError("The LLM provider returned an empty response.")
    return content.strip()


def _gemini_messages(messages: list[dict[str, str]]) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    system_parts = [
        {"text": message["content"]}
        for message in messages
        if message.get("role") == "system"
    ]
    contents = [
        {
            "role": "model" if message.get("role") == "assistant" else "user",
            "parts": [{"text": message["content"]}],
        }
        for message in messages
        if message.get("role") != "system"
    ]
    return ({"parts": system_parts} if system_parts else None), contents


def _gemini(messages: list[dict[str, str]], json_mode: bool) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise LLMError("GEMINI_API_KEY is required for the Gemini provider.")
    model = os.getenv("LLM_MODEL", "gemini-2.0-flash")
    system_instruction, contents = _gemini_messages(messages)
    payload: dict[str, Any] = {"contents": contents}
    if system_instruction:
        payload["systemInstruction"] = system_instruction
    if json_mode:
        payload["generationConfig"] = {"responseMimeType": "application/json"}
    query = urllib.parse.urlencode({"key": api_key})
    response = _request_json(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?{query}",
        payload,
    )
    try:
        content = response["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMError("The LLM provider returned an invalid response.") from exc
    if not isinstance(content, str) or not content.strip():
        raise LLMError("The LLM provider returned an empty response.")
    return content.strip()


def complete(messages: list[dict[str, str]], json_mode: bool = False) -> str:
    """Complete a chat request using the provider selected by ``LLM_PROVIDER``."""
    provider = os.getenv("LLM_PROVIDER", "").strip().lower()
    if not provider:
        raise LLMError("LLM_PROVIDER is required. Use ollama, gemini, or groq.")
    if provider == "ollama":
        return _ollama(messages, json_mode)
    if provider == "groq":
        return _groq(messages, json_mode)
    if provider == "gemini":
        return _gemini(messages, json_mode)
    raise LLMError("Unknown LLM_PROVIDER. Use ollama, gemini, or groq.")