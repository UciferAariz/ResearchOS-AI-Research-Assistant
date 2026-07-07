from typing import Protocol

from app.models.embedding import DeviceInfo


class EmbeddingService(Protocol):
    """Generates vector embeddings for text, batched on whatever device is available
    (ROCm/CUDA GPU if present, CPU otherwise)."""

    async def embed_batch(
        self, texts: list[str], device_override: str | None = None
    ) -> list[list[float]]: ...

    def get_device_info(self) -> DeviceInfo: ...
