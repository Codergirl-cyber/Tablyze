"""Modular LLM provider abstraction (Ollama for local / open models)."""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Raised when the LLM provider fails or is unavailable."""


class LLMProvider(ABC):
    @abstractmethod
    def chat(self, messages: list[dict[str, str]], *, json_mode: bool = False) -> str:
        raise NotImplementedError


class OllamaProvider(LLMProvider):
    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        timeout_seconds: float = 120.0,
    ) -> None:
        self.base_url = (base_url or os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")).rstrip(
            "/"
        )
        self.model = model or os.getenv("OLLAMA_MODEL", "llama3.2")
        self.timeout_seconds = timeout_seconds

    def chat(self, messages: list[dict[str, str]], *, json_mode: bool = False) -> str:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
        }
        if json_mode:
            payload["format"] = "json"

        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{self.base_url}/api/chat",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
                raw = resp.read().decode("utf-8")
        except urllib.error.URLError as exc:
            raise LLMError(
                f"Ollama is not reachable at {self.base_url}. "
                "Start Ollama locally or set OLLAMA_BASE_URL / LLM_PROVIDER."
            ) from exc
        except TimeoutError as exc:
            raise LLMError("Ollama request timed out.") from exc

        try:
            data = json.loads(raw)
            content = data.get("message", {}).get("content", "")
            if not isinstance(content, str) or not content.strip():
                raise LLMError("Ollama returned an empty response.")
            return content.strip()
        except json.JSONDecodeError as exc:
            raise LLMError("Ollama returned invalid JSON.") from exc


def get_llm_provider() -> LLMProvider:
    provider = (os.getenv("LLM_PROVIDER") or "ollama").strip().lower()
    if provider == "ollama":
        return OllamaProvider()
    raise LLMError(
        f"Unsupported LLM_PROVIDER '{provider}'. Supported: ollama."
    )
