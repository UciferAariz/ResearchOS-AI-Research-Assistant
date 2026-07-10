from datetime import datetime

from pydantic import BaseModel, Field


class ComparisonRequest(BaseModel):
    paper_ids: list[str] = Field(..., min_length=2, max_length=5)


class ComparisonPaperSummary(BaseModel):
    paper_id: str
    title: str
    authors: list[str]
    source: str


class ComparisonDimension(BaseModel):
    label: str
    # One value per paper, in the same order as `ComparisonResult.paper_ids`.
    values: list[str]


class ComparisonResult(BaseModel):
    paper_ids: list[str]
    papers: list[ComparisonPaperSummary]
    dimensions: list[ComparisonDimension]
    assistant_take: str
    generated_at: datetime
