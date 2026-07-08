from datetime import datetime

from pydantic import BaseModel, Field


class ComparisonRequest(BaseModel):
    paper_ids: list[str] = Field(..., min_length=2, max_length=5)


class PaperComparisonNote(BaseModel):
    paper_id: str
    title: str
    unique_points: list[str]


class ComparisonResult(BaseModel):
    paper_ids: list[str]
    similarities: list[str]
    differences: list[str]
    per_paper: list[PaperComparisonNote]
    generated_at: datetime
