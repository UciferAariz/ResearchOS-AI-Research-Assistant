import asyncio
import logging

from app.models.paper import Paper
from app.services.interfaces import PaperSourceClient
from app.services.pubmed_client import PUBMED_ID_PREFIX

logger = logging.getLogger(__name__)

UPLOAD_ID_PREFIX = "upload-"


class UploadedPaperStore:
    """In-memory registry for user-uploaded PDFs, keyed by paper id.

    Uploaded papers have no arXiv record to look up, so this stands in for
    that lookup within a single process lifetime — sufficient for the
    hackathon demo, not durable across restarts.
    """

    def __init__(self) -> None:
        self._papers: dict[str, Paper] = {}

    def add(self, paper: Paper) -> None:
        self._papers[paper.id] = paper

    def get(self, paper_id: str) -> Paper | None:
        return self._papers.get(paper_id)


class CompositePaperSourceClient:
    """PaperSourceClient that fans searches out across arXiv and PubMed and
    routes id lookups by prefix: `upload-` to the in-memory upload store,
    `pubmed:` to PubMedClient, everything else to ArxivClient. This lets
    routes and the RAG pipeline treat all paper sources identically."""

    def __init__(
        self,
        arxiv_client: PaperSourceClient,
        upload_store: UploadedPaperStore,
        pubmed_client: PaperSourceClient | None = None,
    ) -> None:
        self._arxiv_client = arxiv_client
        self._upload_store = upload_store
        self._pubmed_client = pubmed_client

    async def search(self, query: str, max_results: int) -> list[Paper]:
        if self._pubmed_client is None:
            return await self._arxiv_client.search(query, max_results)

        results = await asyncio.gather(
            self._arxiv_client.search(query, max_results),
            self._pubmed_client.search(query, max_results),
            return_exceptions=True,
        )
        papers: list[Paper] = []
        errors: list[BaseException] = []
        for source_name, result in zip(("arxiv", "pubmed"), results):
            if isinstance(result, BaseException):
                logger.warning("Skipping %s search results: %s", source_name, result)
                errors.append(result)
                continue
            papers.extend(result)

        if errors and len(errors) == len(results):
            # Every source failed — surface the first error rather than silently
            # returning an empty result set.
            raise errors[0]
        return papers

    async def get_by_id(self, paper_id: str) -> Paper | None:
        if paper_id.startswith(UPLOAD_ID_PREFIX):
            return self._upload_store.get(paper_id)
        if paper_id.startswith(PUBMED_ID_PREFIX):
            if self._pubmed_client is None:
                return None
            return await self._pubmed_client.get_by_id(paper_id)
        return await self._arxiv_client.get_by_id(paper_id)
