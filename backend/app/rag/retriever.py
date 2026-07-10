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
        self, query: str, top_k: int, paper_id: str | None = None, page: int | None = None
    ) -> list[VectorMatch]:
        """`page`, when given, scopes retrieval to chunks tagged with that PDF
        page number (see `index_paper_pages`) — used for "what's on page N?"
        questions where similarity search alone might miss the right chunk.
        Chroma requires an explicit `$and` to combine more than one top-level
        filter key, so build that only when both `paper_id` and `page` are set.
        """
        [embedding] = await self._embedding_service.embed_batch([query])
        conditions: list[dict[str, str]] = []
        if paper_id:
            conditions.append({"paper_id": paper_id})
        if page is not None:
            conditions.append({"page": str(page)})

        where: dict[str, object] | None
        if not conditions:
            where = None
        elif len(conditions) == 1:
            where = conditions[0]
        else:
            where = {"$and": conditions}

        return await self._vector_store.query(self._collection, embedding, top_k=top_k, where=where)
