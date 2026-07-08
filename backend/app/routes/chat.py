import json
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.config.dependencies import LLMProviderDep, RAGPipelineDep
from app.models.chat import ChatRequest, ChatResponse
from app.rag.pipeline import RAGPipeline
from app.services.llm.interfaces import LLMProvider
from app.utils.exceptions import ExternalAPIError, LLMError, RAGRetrievalError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


@router.post("/api/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    pipeline: RAGPipelineDep,
    llm_provider: LLMProviderDep,
) -> ChatResponse:
    try:
        messages, citations = await pipeline.build_prompt(
            request.message, request.history, request.paper_id, request.top_k
        )
    except RAGRetrievalError as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": "rag_retrieval_error", "detail": exc.detail, "retryable": exc.retryable},
        ) from exc
    except ExternalAPIError as exc:
        # Raised by the arXiv lookup inside build_prompt (auto-indexing an
        # unseen paper_id), not the LLM call below — label it distinctly so
        # arXiv outages aren't mistaken for Fireworks/LLM failures.
        raise HTTPException(
            status_code=502,
            detail={"error": "paper_source_error", "detail": exc.detail, "retryable": exc.retryable},
        ) from exc

    try:
        answer = await llm_provider.complete(messages, max_tokens=1024)
    except ExternalAPIError as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": "llm_error", "detail": exc.detail, "retryable": exc.retryable},
        ) from exc
    except LLMError as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": "llm_error", "detail": exc.detail, "retryable": exc.retryable},
        ) from exc

    return ChatResponse(answer=answer, citations=citations)


async def _stream_chat_events(
    request: ChatRequest, pipeline: RAGPipeline, llm_provider: LLMProvider
) -> AsyncIterator[dict[str, str]]:
    try:
        messages, citations = await pipeline.build_prompt(
            request.message, request.history, request.paper_id, request.top_k
        )
    except (RAGRetrievalError, ExternalAPIError) as exc:
        yield {"event": "error", "data": exc.detail}
        return

    # Citations are known before generation starts (retrieval happens first),
    # so send them immediately rather than waiting for the full answer.
    yield {"event": "citations", "data": json.dumps([c.model_dump() for c in citations])}

    try:
        async for token in llm_provider.stream(messages):
            yield {"event": "token", "data": token}
    except ExternalAPIError as exc:
        yield {"event": "error", "data": exc.detail}
        return
    yield {"event": "done", "data": ""}


@router.post("/api/chat/stream", response_model=None)
async def chat_stream(
    request: ChatRequest,
    pipeline: RAGPipelineDep,
    llm_provider: LLMProviderDep,
) -> EventSourceResponse:
    return EventSourceResponse(_stream_chat_events(request, pipeline, llm_provider))
