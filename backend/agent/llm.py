"""Backward-compatible provider interface for injected agent test doubles."""

from __future__ import annotations

from abc import ABC, abstractmethod
from agent.llm_client import LLMError


class LLMProvider(ABC):
    @abstractmethod
    def chat(self, messages: list[dict[str, str]], *, json_mode: bool = False) -> str:
        raise NotImplementedError


class ClientProvider(LLMProvider):
    def chat(self, messages: list[dict[str, str]], *, json_mode: bool = False) -> str:
        from agent.llm_client import complete

        return complete(messages, json_mode=json_mode)


def get_llm_provider() -> LLMProvider:
    return ClientProvider()
