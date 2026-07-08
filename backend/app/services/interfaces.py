from typing import Protocol

from app.models.paper import Paper


class PaperSourceClient(Protocol):
    """A source of research papers (arXiv, PubMed; Semantic Scholar can implement
    this same interface later without touching routes or callers)."""

    async def search(self, query: str, max_results: int) -> list[Paper]: ...

    async def get_by_id(self, paper_id: str) -> Paper | None: ...
