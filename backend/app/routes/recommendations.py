import asyncio

from fastapi import APIRouter, HTTPException

from app.config.dependencies import ArxivClientDep, RecommendationCacheDep, RecommenderDep
from app.models.paper import Paper
from app.models.recommendation import RecommendationRequest, RecommendationResponse
from app.services.interfaces import PaperSourceClient
from app.utils.exceptions import ExternalAPIError

router = APIRouter(tags=["recommendations"])


def _cache_key(paper_ids: list[str], max_results: int) -> str:
    return f"{'|'.join(sorted(paper_ids))}:{max_results}"


async def _resolve_papers(paper_ids: list[str], arxiv_client: PaperSourceClient) -> list[Paper]:
    papers = await asyncio.gather(*(arxiv_client.get_by_id(paper_id) for paper_id in paper_ids))
    missing = [paper_id for paper_id, paper in zip(paper_ids, papers) if paper is None]
    if missing:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "not_found",
                "detail": f"No paper found with id(s): {', '.join(missing)}",
                "retryable": False,
            },
        )
    return [paper for paper in papers if paper is not None]


@router.post("/api/recommendations", response_model=RecommendationResponse)
async def get_recommendations(
    request: RecommendationRequest,
    arxiv_client: ArxivClientDep,
    recommender: RecommenderDep,
    cache: RecommendationCacheDep,
) -> RecommendationResponse:
    key = _cache_key(request.paper_ids, request.max_results)
    cached = cache.get(key)
    if cached is not None:
        return cached

    seeds = await _resolve_papers(request.paper_ids, arxiv_client)

    try:
        recommendations = await recommender.recommend(seeds, request.max_results)
    except ExternalAPIError as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": "external_api_error", "detail": exc.detail, "retryable": exc.retryable},
        ) from exc

    result = RecommendationResponse(
        seed_paper_ids=[paper.id for paper in seeds], recommendations=recommendations
    )
    cache.set(key, result)
    return result
