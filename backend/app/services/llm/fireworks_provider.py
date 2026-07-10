import json
import logging
from collections.abc import AsyncIterator

import httpx

from app.models.llm import ChatMessage
from app.utils.exceptions import ExternalAPIError, LLMError
from app.utils.retry import external_api_retry

logger = logging.getLogger(__name__)


class FireworksLLMProvider:
    """LLMProvider implementation backed by Fireworks AI's OpenAI-compatible
    chat completions endpoint. A thin custom client (not the `openai` SDK)
    keeps this provider honest as a swappable LLMProvider implementation
    rather than coupling to OpenAI SDK assumptions.
    """

    def __init__(self, api_key: str, model: str, base_url: str, timeout_seconds: float = 30.0) -> None:
        self._api_key = api_key
        self._model = model
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"}

    @external_api_retry
    async def complete(
        self,
        messages: list[ChatMessage],
        *,
        json_mode: bool = False,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> str:
        payload: dict[str, object] = {
            "model": self._model,
            "messages": [m.model_dump() for m in messages],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": False,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(self._timeout_seconds)) as client:
                response = await client.post(
                    f"{self._base_url}/chat/completions", json=payload, headers=self._headers()
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ExternalAPIError(
                f"Fireworks API returned {exc.response.status_code}: {exc.response.text}",
                retryable=False,
            ) from exc
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise ExternalAPIError(f"Fireworks API request failed: {exc}", retryable=True) from exc

        data = response.json()
        usage = data.get("usage", {})
        logger.info(
            "Fireworks completion: model=%s prompt_tokens=%s completion_tokens=%s",
            self._model,
            usage.get("prompt_tokens"),
            usage.get("completion_tokens"),
        )
        choices = data.get("choices", [])
        if not choices:
            raise LLMError("Fireworks API returned no choices", retryable=False)
        content = choices[0]["message"]["content"]
        return str(content)

    async def stream(
        self,
        messages: list[ChatMessage],
        *,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> AsyncIterator[str]:
        payload = {
            "model": self._model,
            "messages": [m.model_dump() for m in messages],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True,
        }
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(self._timeout_seconds)) as client:
                async with client.stream(
                    "POST", f"{self._base_url}/chat/completions", json=payload, headers=self._headers()
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        data_str = line[len("data:") :].strip()
                        if data_str == "[DONE]":
                            break
                        chunk = json.loads(data_str)
                        choices = chunk.get("choices") or []
                        if not choices:
                            continue
                        delta = choices[0].get("delta", {}).get("content")
                        if delta:
                            yield delta
        except httpx.HTTPStatusError as exc:
            raise ExternalAPIError(
                f"Fireworks API returned {exc.response.status_code}", retryable=False
            ) from exc
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise ExternalAPIError(f"Fireworks API request failed: {exc}", retryable=True) from exc
