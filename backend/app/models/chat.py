from typing import Literal

from pydantic import BaseModel, Field


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: list[ChatTurn] = Field(default_factory=list)
    paper_id: str | None = None
    top_k: int = Field(5, ge=1, le=10)


class Citation(BaseModel):
    index: int
    paper_id: str
    title: str
    snippet: str
    similarity: float
    page: int | None = None


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
