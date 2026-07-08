import json
import logging
from collections.abc import AsyncIterator
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from sse_starlette.sse import EventSourceResponse

from app.config.dependencies import ArxivClientDep, LLMProviderDep, SummaryCacheDep
from app.models.paper import Paper
from app.models.summary import PaperSummary
from app.services.llm.interfaces import LLMProvider
from app.services.llm.prompts import build_summary_messages
from app.utils.exceptions import ExternalAPIError, LLMError

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
async def get_paper(paper_id: str, arxiv_client: ArxivClientDep) -> Paper:
    paper = await arxiv_client.get_by_id(paper_id)
    if paper is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "not_found",
                "detail": f"No arXiv paper found with id '{paper_id}'",
                "retryable": False,
            },
        )
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
                "detail": f"No arXiv paper found with id '{paper_id}'",
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
