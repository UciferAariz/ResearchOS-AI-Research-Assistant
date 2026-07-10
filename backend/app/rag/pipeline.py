import logging
import re

from app.database.interfaces import VectorStore
from app.embeddings.interfaces import EmbeddingService
from app.models.chat import ChatTurn, Citation
from app.models.llm import ChatMessage
from app.models.paper import Paper
from app.rag.indexing import index_paper_pages, index_paper_text
from app.rag.prompts import build_rag_messages
from app.rag.retriever import Retriever
from app.services.interfaces import PaperSourceClient
from app.services.pdf_service import PdfDownloader, PdfExtractionError, extract_pages
from app.utils.exceptions import ExternalAPIError, RAGRetrievalError

logger = logging.getLogger(__name__)

# Matches "page 4", "page #4", "on page 4", and ordinal forms like "4th page" —
# covers the common phrasings for "what's on page N?" without trying to parse
# spelled-out numbers ("the fourth page").
_PAGE_PATTERNS = [
    re.compile(r"\bpage\s*#?\s*(\d+)\b", re.IGNORECASE),
    re.compile(r"\b(\d+)\s*(?:st|nd|rd|th)\s+page\b", re.IGNORECASE),
]


def _extract_page_number(query: str) -> int | None:
    for pattern in _PAGE_PATTERNS:
        match = pattern.search(query)
        if match:
            return int(match.group(1))
    return None


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

    async def _indexing_pages(self, paper: Paper) -> tuple[list[str], bool]:
        """Prefer the full PDF text for grounding (Phase 6) over the abstract
        alone, since most user questions ask about methodology/results/limitations
        that never appear in the abstract. Falls back to the abstract whenever the
        PDF can't be fetched or parsed (network failure, scanned/image-only PDF,
        encrypted PDF) so chat never hard-fails just because full-text indexing did.

        Returns `(pages, is_full_text)`: `pages` is the PDF's per-page text
        (index `i` is page `i + 1`) when full text was extracted, or a
        single-element `[abstract]` list on fallback. `is_full_text` records
        which case it was, so the caller can persist that in the vector store.
        """
        if not paper.pdf_url:
            return [paper.abstract], False
        try:
            pdf_bytes = await self._pdf_downloader.download(paper.pdf_url)
            pages = extract_pages(pdf_bytes)
        except (ExternalAPIError, PdfExtractionError) as exc:
            logger.warning("Falling back to abstract for %s: %s", paper.id, exc)
            return [paper.abstract], False
        if any(page.strip() for page in pages):
            return pages, True
        return [paper.abstract], False

    async def ensure_indexed(self, paper_id: str) -> str:
        """Make sure the paper is indexed with the best grounding available
        before retrieval runs.

        Two cases this must handle, not just "never seen before":
          * Never indexed (e.g. opened via a direct link) — index it now rather
            than requiring a prior /api/search call.
          * Indexed abstract-only — /api/search indexes every result with just
            its abstract (cheap, no PDF download). That's fine for similarity,
            but chat grounded on an abstract can't answer questions about the
            paper's body ("what's on page 4?"). So when the existing entry isn't
            already full text and a PDF is available, upgrade it in place.

        Also called proactively (as a fire-and-forget background task, see
        `prefetch`) the moment a paper's detail page is opened, so indexing is
        usually already done — or well underway — by the time the user sends
        their first chat message, rather than only starting then.

        Returns the canonical id the paper ended up indexed under. arXiv
        normalizes ids to include a version suffix (e.g. `2501.00005` ->
        `2501.00005v1`), so a caller-supplied unversioned id must be resolved
        to that canonical form before it can be used as a retrieval filter —
        otherwise the chunk is indexed under one id and queried under
        another, and retrieval silently returns nothing.
        """
        metadata = await self._vector_store.get_metadata(self._collection, paper_id)
        if metadata is not None and metadata.get("full_text") == "true":
            return paper_id

        paper = await self._arxiv_client.get_by_id(paper_id)
        if paper is None:
            return paper_id

        # Already indexed (abstract-only) with no PDF to upgrade from: keep what
        # we have instead of re-embedding the same abstract on every message.
        if metadata is not None and not paper.pdf_url:
            return paper_id

        pages, is_full_text = await self._indexing_pages(paper)
        if is_full_text:
            await index_paper_pages(
                self._vector_store, self._embedding_service, self._collection, paper, pages
            )
        else:
            await index_paper_text(
                self._vector_store,
                self._embedding_service,
                self._collection,
                paper,
                pages[0],
                full_text=False,
            )
        return paper.id

    async def prefetch(self, paper_id: str) -> None:
        """Best-effort background warm-up: index a paper's full text as soon
        as its detail page is opened, so the first chat message doesn't pay
        the PDF-download-and-parse latency. Intended to run as a FastAPI
        BackgroundTask after the page's own response has already been sent,
        so failures are logged rather than raised — there's no request left
        to fail."""
        try:
            await self.ensure_indexed(paper_id)
        except RAGRetrievalError as exc:
            logger.warning("Background prefetch failed for %s: %s", paper_id, exc)

    async def build_prompt(
        self, query: str, history: list[ChatTurn], paper_id: str | None, top_k: int
    ) -> tuple[list[ChatMessage], list[Citation]]:
        resolved_paper_id = paper_id
        if paper_id:
            resolved_paper_id = await self.ensure_indexed(paper_id)

        # A "what's on page 4?" style question gets a page-scoped retrieval
        # first — plain similarity search can easily miss the right chunk when
        # the query is just a page reference with no topical content. If that
        # page has no indexed chunks (out of range, or the paper only ended up
        # abstract-indexed), fall back to ordinary similarity search rather
        # than reporting nothing was found.
        page = _extract_page_number(query) if resolved_paper_id else None
        matches = (
            await self._retriever.retrieve(query, top_k=top_k, paper_id=resolved_paper_id, page=page)
            if page is not None
            else []
        )
        if not matches:
            matches = await self._retriever.retrieve(query, top_k=top_k, paper_id=resolved_paper_id)

        citations = [
            Citation(
                index=i,
                paper_id=match.metadata.get("paper_id", match.id),
                title=match.metadata.get("title", "Unknown title"),
                snippet=match.document,
                similarity=match.similarity,
                page=int(match.metadata["page"]) if match.metadata.get("page") else None,
            )
            for i, match in enumerate(matches, start=1)
        ]
        messages = build_rag_messages(query, history, matches)
        return messages, citations
