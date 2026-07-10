import json
import logging
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Query, UploadFile
from sse_starlette.sse import EventSourceResponse

from app.config.dependencies import (
    ArxivClientDep,
    EmbeddingServiceDep,
    LLMProviderDep,
    RAGPipelineDep,
    SummaryCacheDep,
    UploadStoreDep,
    VectorStoreDep,
)
from app.config.settings import get_settings
from app.models.paper import Paper
from app.models.summary import PaperSummary
from app.rag.indexing import index_paper_pages, index_paper_text
from app.services.llm.interfaces import LLMProvider
from app.services.llm.prompts import build_summary_messages
from app.services.pdf_service import PdfExtractionError, extract_pages
from app.services.upload_store import UPLOAD_ID_PREFIX
from app.utils.exceptions import EmbeddingError, ExternalAPIError, LLMError, RAGRetrievalError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["papers"])


def _as_string_list(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]
    return [str(value)]


async def _generate_summary(paper: Paper, llm_provider: LLMProvider) -> PaperSummary:
    messages = build_summary_messages(paper, want_json=True)
    try:
        # Reasoning models (e.g. deepseek-v4-pro) can spend a chunk of the token
        # budget on internal reasoning before emitting the final JSON, so give
        # this call more headroom than the 1024-token default.
        raw = await llm_provider.complete(messages, json_mode=True, max_tokens=2048)
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise LLMError(f"Model did not return valid JSON: {exc}", retryable=True) from exc

    return PaperSummary(
        paper_id=paper.id,
        key_contributions=_as_string_list(parsed.get("key_contributions", "Not specified in abstract")),
        methodology=str(parsed.get("methodology", "Not specified in abstract")),
        limitations=_as_string_list(parsed.get("limitations", "Not specified in abstract")),
        future_work=_as_string_list(parsed.get("future_work", "Not specified in abstract")),
        generated_at=datetime.now(timezone.utc),
    )


async def _stream_summary_events(paper: Paper, llm_provider: LLMProvider) -> AsyncIterator[dict[str, str]]:
    messages = build_summary_messages(paper, want_json=False)
    try:
        async for token in llm_provider.stream(messages):
            yield {"event": "token", "data": token}
    except ExternalAPIError as exc:
        yield {"event": "error", "data": exc.detail}
        return
    yield {"event": "done", "data": ""}


@router.get("/api/papers/{paper_id}", response_model=Paper)
async def get_paper(
    paper_id: str,
    background_tasks: BackgroundTasks,
    arxiv_client: ArxivClientDep,
    pipeline: RAGPipelineDep,
) -> Paper:
    paper = await arxiv_client.get_by_id(paper_id)
    if paper is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "not_found",
                "detail": f"No paper found with id '{paper_id}'",
                "retryable": False,
            },
        )
    # Warm the full-text index the moment the paper's page is opened, so by
    # the time the user asks their first question in chat it's usually
    # already indexed (or well underway) rather than starting from scratch.
    # Fires after this response is sent — doesn't add to page-load latency.
    background_tasks.add_task(pipeline.prefetch, paper.id)
    return paper


@router.get("/api/papers/{paper_id}/summary", response_model=None)
async def get_paper_summary(
    paper_id: str,
    arxiv_client: ArxivClientDep,
    llm_provider: LLMProviderDep,
    cache: SummaryCacheDep,
    stream: bool = Query(False),
) -> PaperSummary | EventSourceResponse:
    paper = await arxiv_client.get_by_id(paper_id)
    if paper is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "not_found",
                "detail": f"No paper found with id '{paper_id}'",
                "retryable": False,
            },
        )

    if stream:
        return EventSourceResponse(_stream_summary_events(paper, llm_provider))

    cached = cache.get(paper_id)
    if cached is not None:
        return cached

    try:
        summary = await _generate_summary(paper, llm_provider)
    except ExternalAPIError as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": "llm_error", "detail": exc.detail, "retryable": exc.retryable},
        ) from exc
    except LLMError as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": "llm_json_error", "detail": exc.detail, "retryable": exc.retryable},
        ) from exc

    cache.set(paper_id, summary)
    return summary


def _derive_title(text: str, filename: str) -> str:
    for line in text.splitlines():
        candidate = line.strip()
        if len(candidate) >= 8:
            return candidate[:200]
    return filename.rsplit(".", 1)[0] or "Untitled upload"


def _derive_abstract(text: str) -> str:
    collapsed = " ".join(text.split())
    return collapsed[:1000] if collapsed else "No extractable text found in this PDF."


@router.post("/api/papers/upload", response_model=Paper)
async def upload_paper(
    vector_store: VectorStoreDep,
    embedding_service: EmbeddingServiceDep,
    upload_store: UploadStoreDep,
    file: UploadFile = File(...),
) -> Paper:
    """Ingests a user-uploaded PDF: extracts its text, indexes it in chunks for
    RAG chat (Phase 6), and registers it as a Paper so /api/papers/{id} and
    /api/chat can address it just like an arXiv paper."""
    settings = get_settings()

    content_type = file.content_type or ""
    filename = file.filename or ""
    if not (
        content_type.startswith(("application/pdf", "application/octet-stream"))
        or filename.lower().endswith(".pdf")
    ):
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_file_type", "detail": "Only PDF files are supported", "retryable": False},
        )

    pdf_bytes = await file.read()
    if len(pdf_bytes) > settings.pdf_upload_max_bytes:
        raise HTTPException(
            status_code=413,
            detail={
                "error": "file_too_large",
                "detail": f"PDF exceeds the {settings.pdf_upload_max_bytes // (1024 * 1024)}MB limit",
                "retryable": False,
            },
        )

    try:
        pages = extract_pages(pdf_bytes)
    except PdfExtractionError as exc:
        raise HTTPException(
            status_code=422,
            detail={"error": "pdf_extraction_error", "detail": str(exc), "retryable": False},
        ) from exc

    text = "\n\n".join(p for p in pages if p.strip())
    now = datetime.now(timezone.utc)
    paper = Paper(
        id=f"{UPLOAD_ID_PREFIX}{uuid.uuid4().hex[:12]}",
        title=_derive_title(text, file.filename or "upload.pdf"),
        authors=[],
        abstract=_derive_abstract(text),
        published=now,
        updated=now,
        pdf_url="",
        source="upload",
    )
    upload_store.add(paper)

    try:
        if text.strip():
            await index_paper_pages(
                vector_store, embedding_service, settings.arxiv_collection_name, paper, pages
            )
        else:
            # No extractable text at all (scanned/image-only PDF) — index the
            # derived-abstract placeholder instead. Not page-scoped, since there's
            # no real page content to attribute it to.
            await index_paper_text(
                vector_store,
                embedding_service,
                settings.arxiv_collection_name,
                paper,
                paper.abstract,
                full_text=False,
            )
    except (EmbeddingError, RAGRetrievalError) as exc:
        # Uploading should not fail just because indexing failed (e.g. a
        # transient embedding or vector-store hiccup). The paper is already
        # registered, so return it and log the indexing failure for ops.
        logger.warning("PDF upload succeeded but indexing failed for %s: %s", paper.id, exc)

    return paper
