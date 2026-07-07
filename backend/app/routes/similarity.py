from fastapi import APIRouter, HTTPException, Query

from app.config.dependencies import VectorStoreDep
from app.config.settings import get_settings
from app.models.vector import VectorMatch

router = APIRouter(tags=["similarity"])


@router.get("/api/papers/{paper_id}/similar", response_model=list[VectorMatch])
async def get_similar_papers(
    paper_id: str,
    vector_store: VectorStoreDep,
    top_k: int = Query(5, ge=1, le=20),
) -> list[VectorMatch]:
    """Pure vector-distance nearest neighbors — no LLM involved. Requires the
    paper to have been indexed already (search results are auto-indexed)."""
    settings = get_settings()
    collection = settings.arxiv_collection_name

    embedding = await vector_store.get_embedding(collection, paper_id)
    if embedding is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "not_indexed",
                "detail": f"Paper '{paper_id}' has not been indexed yet. Search for it first.",
                "retryable": False,
            },
        )

    matches = await vector_store.query(collection, embedding, top_k=top_k + 1)
    return [match for match in matches if match.id != paper_id][:top_k]
