import json
import logging
import os
import traceback
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv


logger = logging.getLogger(__name__)

# Load .env from the Tablyze project root.
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=ENV_FILE, override=False)


class LLMError(Exception):
    """Raised when an LLM request fails."""

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _timeout_seconds() -> int:
    """Return the configured request timeout."""

    try:
        return max(1, int(os.getenv("LLM_TIMEOUT_SECONDS", "60")))
    except ValueError:
        return 60


def _request_json(
    url: str,
    headers: dict,
    payload: dict,
    timeout: int,
) -> dict:
    """Send an HTTP POST request and parse the JSON response."""

    request = Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urlopen(request, timeout=timeout) as response:
            response_text = response.read().decode("utf-8")
            return json.loads(response_text)

    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")

        logger.error("========== LLM API ERROR ==========")
        logger.error("HTTP Status: %s", exc.code)
        logger.error("Error Details: %s", error_body)
        logger.error("===================================")

        raise LLMError(
            f"LLM API returned HTTP {exc.code}: {error_body[:500]}",
            status_code=exc.code,
        ) from exc

    except URLError as exc:
        logger.exception("Unable to connect to the LLM API.")

        raise LLMError(
            f"Could not connect to the LLM API: {exc.reason}"
        ) from exc

    except json.JSONDecodeError as exc:
        logger.exception("The LLM API returned invalid JSON.")

        raise LLMError(
            "The LLM API returned an invalid JSON response."
        ) from exc

    except TimeoutError as exc:
        logger.exception("The LLM API request timed out.")

        raise LLMError(
            "The LLM API request timed out."
        ) from exc


def _extract_openai_content(response: dict) -> str:
    """Extract assistant text from an OpenAI-compatible response."""

    try:
        content = response["choices"][0]["message"]["content"]

        if isinstance(content, str):
            return content

        if isinstance(content, list):
            text_parts = []

            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    text_parts.append(item.get("text", ""))

            if text_parts:
                return "\n".join(text_parts)

        raise ValueError("Assistant response contains no text.")

    except (KeyError, IndexError, TypeError, ValueError) as exc:
        logger.exception("Unexpected OpenAI-compatible response format.")

        raise LLMError(
            "Could not extract text from the LLM response."
        ) from exc


def _ollama(
    messages: list[dict],
    json_mode: bool = False,
) -> str:
    """Send a request to Ollama."""

    base_url = os.getenv(
        "OLLAMA_BASE_URL",
        "http://localhost:11434",
    ).rstrip("/")

    model = os.getenv("LLM_MODEL", "llama3.2")

    url = f"{base_url}/api/chat"

    headers = {
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
    }

    if json_mode:
        payload["format"] = "json"

    response = _request_json(
        url,
        headers,
        payload,
        _timeout_seconds(),
    )

    try:
        return response["message"]["content"]

    except (KeyError, TypeError) as exc:
        raise LLMError(
            "Unexpected Ollama response format."
        ) from exc


def _groq(
    messages: list[dict],
    json_mode: bool = False,
) -> str:
    """Send a request to Groq."""

    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise LLMError(
            "GROQ_API_KEY is missing from the project .env file."
        )

    model = os.getenv(
        "LLM_MODEL",
        "llama-3.3-70b-versatile",
    )

    url = "https://api.groq.com/openai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "Tablyze/1.0",
    }

    payload = {
        "model": model,
        "messages": messages,
    }

    if not model.startswith("openai/gpt-oss-"):
        payload["temperature"] = 0.2

    if json_mode:
        payload["response_format"] = {
            "type": "json_object",
        }

    response = _request_json(
        url,
        headers,
        payload,
        _timeout_seconds(),
    )

    return _extract_openai_content(response)


def _gemini_messages(messages: list[dict]) -> list[dict]:
    """Convert chat messages into Gemini's contents format."""

    contents = []
    system_parts = []

    for message in messages:
        role = message.get("role", "user")
        content = message.get("content", "")

        if not isinstance(content, str):
            content = json.dumps(content, default=str)

        if role == "system":
            system_parts.append(content)
            continue

        gemini_role = "model" if role == "assistant" else "user"

        contents.append(
            {
                "role": gemini_role,
                "parts": [{"text": content}],
            }
        )

    return contents, "\n\n".join(system_parts)


def _gemini(
    messages: list[dict],
    json_mode: bool = False,
) -> str:
    """Send a request to the Gemini API."""

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise LLMError(
            "GEMINI_API_KEY is missing from the project .env file."
        )

    model = os.getenv(
        "LLM_MODEL",
        "gemini-2.5-flash",
    )

    url = (
        "https://generativelanguage.googleapis.com/v1beta/"
        f"models/{model}:generateContent"
    )

    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key,
    }

    contents, system_instruction = _gemini_messages(messages)

    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.2,
        },
    }

    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}],
        }

    if json_mode:
        payload["generationConfig"]["responseMimeType"] = (
            "application/json"
        )

    response = _request_json(
        url,
        headers,
        payload,
        _timeout_seconds(),
    )

    try:
        parts = response["candidates"][0]["content"]["parts"]
        text_parts = [
            part["text"]
            for part in parts
            if isinstance(part, dict) and "text" in part
        ]

        if not text_parts:
            raise ValueError("Gemini returned no text.")

        return "\n".join(text_parts)

    except (KeyError, IndexError, TypeError, ValueError) as exc:
        logger.exception("Unexpected Gemini response format.")

        raise LLMError(
            "Could not extract text from the Gemini response."
        ) from exc


def complete(
    messages: list[dict],
    json_mode: bool = False,
) -> str:
    """Send a chat request using the configured LLM provider."""

    provider = os.getenv(
        "LLM_PROVIDER",
        "groq",
    ).strip().lower()

    logger.info(
        "Sending LLM request: provider=%s, json_mode=%s",
        provider,
        json_mode,
    )

    try:
        if provider == "groq":
            return _groq(messages, json_mode)

        if provider == "ollama":
            return _ollama(messages, json_mode)

        if provider == "gemini":
            return _gemini(messages, json_mode)

        raise LLMError(
            f"Unsupported LLM provider: {provider}. "
            "Use groq, ollama, or gemini."
        )

    except LLMError:
        raise

    except Exception as exc:
        logger.error(
            "Unexpected error while calling the LLM:\n%s",
            traceback.format_exc(),
        )

        raise LLMError(
            "Unexpected error while communicating with the LLM."
        ) from exc