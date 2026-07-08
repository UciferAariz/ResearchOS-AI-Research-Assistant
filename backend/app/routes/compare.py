import asyncio
import json
import logging
from collections.abc import AsyncIterator
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.config.dependencies import ArxivClientDep, ComparisonCacheDep, LLMProviderDep
from app.models.comparison import ComparisonRequest, ComparisonResult, PaperComparisonNote
from app.models.paper import Paper
from app.services.interfaces import PaperSourceClient
from app.services.llm.interfaces import LLMProvider
from app.services.llm.prompts import build_comparison_messages
from app.utils.exceptions import ExternalAPIError, LLMError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["compare"])


def _cache_key(paper_ids: list[str]) -> str:
    return "|".join(sorted(paper_ids))


async def _resolve_papers(paper_ids: list[str], arxiv_client: PaperSourceClient) -> list[Paper]:
    papers = await asyncio.gather(*(arxiv_client.get_by_id(paper_id) for paper_id in paper_ids))
    missing = [paper_id for paper_id, paper in zip(paper_ids, papers) if paper is None]
    if missing:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "not_found",
                "detail": f"No arXiv paper found with id(s): {', '.join(missing)}",
                "retryable": False,
            },
        )
    return [paper for paper in papers if paper is not None]


def _as_string_list(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]
    return [str(value)]


async def _generate_comparison(papers: list[Paper], llm_provider: LLMProvider) -> ComparisonResult:
    messages = build_comparison_messages(papers, want_json=True)
    try:
        # Comparing several abstracts at once needs more headroom than a
        # single-paper summary, and reasoning models spend part of the budget
        # on internal reasoning before emitting the final JSON.
        raw = await llm_provider.complete(messages, json_mode=True, max_tokens=3072)
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise LLMError(f"Model did not return valid JSON: {exc}", retryable=True) from exc

    per_paper_raw = parsed.get("per_paper", [])
    if not isinstance(per_paper_raw, list):
        per_paper_raw = []
    per_paper = [
        PaperComparisonNote(
            paper_id=str(entry.get("paper_id", paper.id)),
            title=str(entry.get("title", paper.title)),
            unique_points=_as_string_list(entry.get("unique_points", "Not specified in abstract")),
        )
        for entry, paper in zip(per_paper_raw, papers)
    ]

    return ComparisonResult(
        paper_ids=[paper.id for paper in papers],
        similarities=_as_string_list(parsed.get("similarities", "Not specified in abstracts")),
        differences=_as_string_list(parsed.get("differences", "Not specified in abstracts")),
        per_paper=per_paper,
        generated_at=datetime.now(timezone.utc),
    )


async def _stream_comparison_events(papers: list[Paper], llm_provider: LLMProvider) -> AsyncIterator[dict[str, str]]:
    messages = build_comparison_messages(papers, want_json=False)
    try:
        async for token in llm_provider.stream(messages, max_tokens=3072):
            yield {"event": "token", "data": token}
    except ExternalAPIError as exc:
        yield {"event": "error", "data": exc.detail}
        return
    yield {"event": "done", "data": ""}


@router.post("/api/compare", response_model=ComparisonResult)
async def compare_papers(
    request: ComparisonRequest,
    arxiv_client: ArxivClientDep,
    llm_provider: LLMProviderDep,
    cache: ComparisonCacheDep,
) -> ComparisonResult:
    key = _cache_key(request.paper_ids)
    cached = cache.get(key)
    if cached is not None:
        return cached

    papers = await _resolve_papers(request.paper_ids, arxiv_client)

    try:
        result = await _generate_comparison(papers, llm_provider)
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

    cache.set(key, result)
    return result


@router.post("/api/compare/stream", response_model=None)
async def compare_papers_stream(
    request: ComparisonRequest,
    arxiv_client: ArxivClientDep,
    llm_provider: LLMProviderDep,
) -> EventSourceResponse:
    papers = await _resolve_papers(request.paper_ids, arxiv_client)
    return EventSourceResponse(_stream_comparison_events(papers, llm_provider))
