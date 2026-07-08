from collections.abc import AsyncIterator
from typing import Protocol

from app.models.llm import ChatMessage


class LLMProvider(Protocol):
    """A reasoning LLM backend (Fireworks/Gemma now; the interface is what
    Phase 4's RAGPipeline and Phase 5's comparison service depend on, not the
    concrete implementation)."""

    async def complete(
        self,
        messages: list[ChatMessage],
        *,
        json_mode: bool = False,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> str: ...

    def stream(
        self,
        messages: list[ChatMessage],
        *,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> AsyncIterator[str]: ...
