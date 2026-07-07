import asyncio
import logging

from sentence_transformers import SentenceTransformer

from app.embeddings.device_utils import get_device_info, select_device
from app.models.embedding import DeviceInfo
from app.utils.exceptions import EmbeddingError

logger = logging.getLogger(__name__)


class SentenceTransformerEmbeddingService:
    """EmbeddingService implementation backed by sentence-transformers.

    The model is loaded once (expensive, holds GPU memory) and reused for every
    request via the FastAPI lifespan singleton pattern — see app.main.lifespan.
    """

    def __init__(self, model_name: str, batch_size: int = 32) -> None:
        self._device = select_device()
        self._batch_size = batch_size
        try:
            self._model = SentenceTransformer(model_name, device=self._device)
        except Exception as exc:  # model download/load failures, corrupt cache, etc.
            raise EmbeddingError(f"Failed to load embedding model '{model_name}': {exc}") from exc

        info = get_device_info()
        logger.info(
            "Embedding model '%s' loaded on device=%s (%s), torch=%s",
            model_name,
            info.device,
            info.device_name,
            info.torch_version,
        )

    async def embed_batch(
        self, texts: list[str], device_override: str | None = None
    ) -> list[list[float]]:
        if not texts:
            return []
        # device_override exists solely so the Phase 2 benchmark endpoint can run an
        # in-session CPU-vs-GPU comparison; every other caller uses the device chosen
        # at startup (self._device) and never passes this.
        device = device_override or self._device
        try:
            # model.encode is a blocking call; run it off the event loop.
            embeddings = await asyncio.to_thread(
                self._model.encode,
                texts,
                batch_size=self._batch_size,
                device=device,
                convert_to_numpy=True,
                show_progress_bar=False,
            )
        except Exception as exc:
            raise EmbeddingError(f"Embedding generation failed: {exc}") from exc
        return [row.tolist() for row in embeddings]

    def get_device_info(self) -> DeviceInfo:
        return get_device_info()
