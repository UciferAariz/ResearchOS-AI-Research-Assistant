import logging

from app.database.interfaces import VectorStore
from app.embeddings.interfaces import EmbeddingService
from app.models.chat import ChatTurn, Citation
from app.models.llm import ChatMessage
from app.models.paper import Paper
from app.rag.indexing import index_paper_text
from app.rag.prompts import build_rag_messages
from app.rag.retriever import Retriever
from app.services.interfaces import PaperSourceClient
from app.services.pdf_service import PdfDownloader, PdfExtractionError, extract_text
from app.utils.exceptions import ExternalAPIError

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
        pdf_downloader: PdfDownloader,
    ) -> None:
        self._retriever = retriever
        self._arxiv_client = arxiv_client
        self._embedding_service = embedding_service
        self._vector_store = vector_store
        self._collection = collection
        self._pdf_downloader = pdf_downloader

    async def _indexing_text(self, paper: Paper) -> str:
        """Prefer the full PDF text for grounding (Phase 6) over the abstract
        alone, since most user questions ask about methodology/results/limitations
        that never appear in the abstract. Falls back to the abstract whenever the
        PDF can't be fetched or parsed (network failure, scanned/image-only PDF,
        encrypted PDF) so chat never hard-fails just because full-text indexing did.
        """
        if not paper.pdf_url:
            return paper.abstract
        try:
            pdf_bytes = await self._pdf_downloader.download(paper.pdf_url)
            text = extract_text(pdf_bytes)
        except (ExternalAPIError, PdfExtractionError) as exc:
            logger.warning("Falling back to abstract for %s: %s", paper.id, exc)
            return paper.abstract
        return text if text.strip() else paper.abstract

    async def _ensure_indexed(self, paper_id: str) -> str:
        """Chat can be asked about a paper the user hasn't searched for yet
        (e.g. a direct link), so index it on first mention rather than
        requiring a prior /api/search call.

        Returns the canonical id the paper ended up indexed under. arXiv
        normalizes ids to include a version suffix (e.g. `2501.00005` ->
        `2501.00005v1`), so a caller-supplied unversioned id must be resolved
        to that canonical form before it can be used as a retrieval filter —
        otherwise the chunk is indexed under one id and queried under
        another, and retrieval silently returns nothing.
        """
        existing = await self._vector_store.get_embedding(self._collection, paper_id)
        if existing is not None:
            return paper_id
        paper = await self._arxiv_client.get_by_id(paper_id)
        if paper is None:
            return paper_id
        text = await self._indexing_text(paper)
        await index_paper_text(
            self._vector_store, self._embedding_service, self._collection, paper, text
        )
        return paper.id

    async def build_prompt(
        self, query: str, history: list[ChatTurn], paper_id: str | None, top_k: int
    ) -> tuple[list[ChatMessage], list[Citation]]:
        resolved_paper_id = paper_id
        if paper_id:
            resolved_paper_id = await self._ensure_indexed(paper_id)

        matches = await self._retriever.retrieve(query, top_k=top_k, paper_id=resolved_paper_id)
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
