import time
from typing import Literal

from fastapi import APIRouter, Query

from app.config.dependencies import EmbeddingServiceDep
from app.models.embedding import BenchmarkResult

router = APIRouter(tags=["embeddings"])

_SAMPLE_TEXT = (
    "Transformers have become the dominant architecture for sequence modeling, "
    "relying on self-attention to capture long-range dependencies without recurrence."
)


@router.post("/api/embeddings/benchmark", response_model=BenchmarkResult)
async def benchmark_embeddings(
    embedding_service: EmbeddingServiceDep,
    num_texts: int = Query(50, ge=1, le=1000),
    device: Literal["cpu", "cuda"] | None = Query(
        None, description="Override the embedding device for a CPU-vs-GPU comparison run"
    ),
) -> BenchmarkResult:
    """Proves AMD GPU (ROCm) usage: batch-embeds `num_texts` sample abstracts and
    reports throughput. On a ROCm machine, device_name will be the AMD GPU name;
    on this dev machine (no AMD GPU) it reports CPU — same code path either way.

    Pass `?device=cpu` on a GPU-enabled machine to force a CPU run for an
    in-session speedup comparison, without touching the default embedding path
    every other endpoint uses.
    """
    texts = [_SAMPLE_TEXT] * num_texts
    device_info = embedding_service.get_device_info()
    effective_device = device or device_info.device
    effective_device_name = device_info.device_name if effective_device == device_info.device else "CPU"

    start = time.perf_counter()
    await embedding_service.embed_batch(texts, device_override=device)
    elapsed_ms = (time.perf_counter() - start) * 1000

    return BenchmarkResult(
        device=effective_device,
        device_name=effective_device_name,
        batch_size=num_texts,
        num_texts=num_texts,
        elapsed_ms=elapsed_ms,
        texts_per_sec=num_texts / (elapsed_ms / 1000) if elapsed_ms > 0 else 0.0,
    )
