from app.database.interfaces import VectorStore
from app.embeddings.interfaces import EmbeddingService
from app.models.vector import VectorMatch


class Retriever:
    """Embeds a query and fetches the top-k nearest chunks from the vector
    store, optionally scoped to a single paper. This is the only place
    Phase 4's chat pipeline touches the vector store directly."""

    def __init__(
        self, vector_store: VectorStore, embedding_service: EmbeddingService, collection: str
    ) -> None:
        self._vector_store = vector_store
        self._embedding_service = embedding_service
        self._collection = collection

    async def retrieve(
        self, query: str, top_k: int, paper_id: str | None = None
    ) -> list[VectorMatch]:
        [embedding] = await self._embedding_service.embed_batch([query])
        where = {"paper_id": paper_id} if paper_id else None
        return await self._vector_store.query(self._collection, embedding, top_k=top_k, where=where)
