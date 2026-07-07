from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

PaperSource = Literal["arxiv", "pubmed", "upload"]


class Paper(BaseModel):
    id: str
    title: str
    authors: list[str] = Field(default_factory=list)
    abstract: str
    published: datetime
    updated: datetime
    pdf_url: str
    source: PaperSource = "arxiv"


class SearchResponse(BaseModel):
    query: str
    count: int
    papers: list[Paper]
