from pydantic import BaseModel, Field

from app.models.paper import Paper


class RecommendationRequest(BaseModel):
    paper_ids: list[str] = Field(..., min_length=1, max_length=5)
    max_results: int = Field(10, ge=1, le=20)


class RecommendedPaper(BaseModel):
    paper: Paper
    similarity: float


class RecommendationResponse(BaseModel):
    seed_paper_ids: list[str]
    recommendations: list[RecommendedPaper]
