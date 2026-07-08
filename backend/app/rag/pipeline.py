import logging

from app.database.interfaces import VectorStore
from app.embeddings.interfaces import EmbeddingService
from app.models.chat import ChatTurn, Citation
from app.models.llm import ChatMessage
from app.rag.prompts import build_rag_messages
from app.rag.retriever import Retriever
from app.services.interfaces import PaperSourceClient

logger = logging.getLogger(__name__)


class RAGPipeline:
    """Ties retrieval to generation: fetch grounding context, build a
    citation-numbered prompt, and hand the messages to the LLM. Both the
    non-streaming and SSE chat routes share this so retrieval/citation
    logic lives in exactly one place."""

    def __init__(
        self,
        retriever: Retriever,
        arxiv_client: PaperSourceClient,
        embedding_service: EmbeddingService,
        vector_store: VectorStore,
        collection: str,
    ) -> None:
        self._retriever = retriever
        self._arxiv_client = arxiv_client
        self._embedding_service = embedding_service
        self._vector_store = vector_store
        self._collection = collection

    async def _ensure_indexed(self, paper_id: str) -> None:
        """Chat can be asked about a paper the user hasn't searched for yet
        (e.g. a direct link), so index its abstract on first mention rather
        than requiring a prior /api/search call."""
        existing = await self._vector_store.get_embedding(self._collection, paper_id)
        if existing is not None:
            return
        paper = await self._arxiv_client.get_by_id(paper_id)
        if paper is None:
            return
        [embedding] = await self._embedding_service.embed_batch([paper.abstract])
        await self._vector_store.upsert(
            collection=self._collection,
            ids=[paper.id],
            embeddings=[embedding],
            documents=[paper.abstract],
            metadatas=[
                {
                    "paper_id": paper.id,
                    "title": paper.title,
                    "chunk_index": "0",
                    "source": paper.source,
                }
            ],
        )

    async def build_prompt(
        self, query: str, history: list[ChatTurn], paper_id: str | None, top_k: int
    ) -> tuple[list[ChatMessage], list[Citation]]:
        if paper_id:
            await self._ensure_indexed(paper_id)

        matches = await self._retriever.retrieve(query, top_k=top_k, paper_id=paper_id)
        citations = [
            Citation(
                index=i,
                paper_id=match.metadata.get("paper_id", match.id),
                title=match.metadata.get("title", "Unknown title"),
                snippet=match.document,
                similarity=match.similarity,
            )
            for i, match in enumerate(matches, start=1)
        ]
        messages = build_rag_messages(query, history, matches)
        return messages, citations
