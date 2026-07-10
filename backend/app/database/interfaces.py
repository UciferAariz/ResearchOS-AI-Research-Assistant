from typing import Protocol

from app.models.vector import VectorMatch


class VectorStore(Protocol):
    """A collection-scoped vector store (ChromaDB now; the interface is what
    Phase 4's Retriever and Phase 6/7's ingestion/recommendation services
    depend on, not the concrete implementation)."""

    async def upsert(
        self,
        collection: str,
        ids: list[str],
        embeddings: list[list[float]],
        documents: list[str],
        metadatas: list[dict[str, str]],
    ) -> None: ...

    async def query(
        self,
        collection: str,
        embedding: list[float],
        top_k: int,
        where: dict[str, object] | None = None,
    ) -> list[VectorMatch]: ...

    async def get_embedding(self, collection: str, id: str) -> list[float] | None: ...

    async def get_metadata(self, collection: str, id: str) -> dict[str, str] | None: ...
