import logging

from fastapi import APIRouter, HTTPException, Query

from app.config.dependencies import ArxivClientDep, EmbeddingServiceDep, SearchCacheDep, VectorStoreDep
from app.config.settings import get_settings
from app.models.paper import Paper, SearchResponse
from app.utils.exceptions import ExternalAPIError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["search"])


async def _index_papers(
    papers: list[Paper],
    embedding_service: EmbeddingServiceDep,
    vector_store: VectorStoreDep,
) -> None:
    """Batch-embeds and stores search results so /api/papers/{id}/similar and
    later RAG retrieval can find them. Best-effort: indexing failures are
    logged, not surfaced as a search failure."""
    if not papers:
        return
    try:
        settings = get_settings()
        abstracts = [paper.abstract for paper in papers]
        embeddings = await embedding_service.embed_batch(abstracts)
        await vector_store.upsert(
            collection=settings.arxiv_collection_name,
            ids=[paper.id for paper in papers],
            embeddings=embeddings,
            documents=abstracts,
            metadatas=[
                {"paper_id": paper.id, "title": paper.title, "chunk_index": "0", "source": paper.source}
                for paper in papers
            ],
        )
    except Exception:
        logger.exception("Failed to index %d search result(s) into the vector store", len(papers))


@router.get("/api/search", response_model=SearchResponse)
async def search_papers(
    arxiv_client: ArxivClientDep,
    cache: SearchCacheDep,
    embedding_service: EmbeddingServiceDep,
    vector_store: VectorStoreDep,
    q: str = Query(..., min_length=1, description="Free-text search query"),
    max_results: int = Query(10, ge=1, le=50),
) -> SearchResponse:
    cache_key = f"{q}:{max_results}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        papers = await arxiv_client.search(query=q, max_results=max_results)
    except ExternalAPIError as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": "external_api_error", "detail": exc.detail, "retryable": exc.retryable},
        ) from exc

    await _index_papers(papers, embedding_service, vector_store)

    result = SearchResponse(query=q, count=len(papers), papers=papers)
    cache.set(cache_key, result)
    return result
