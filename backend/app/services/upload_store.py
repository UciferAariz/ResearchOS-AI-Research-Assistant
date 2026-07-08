from app.models.paper import Paper
from app.services.interfaces import PaperSourceClient

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
    """PaperSourceClient that resolves arXiv ids via ArxivClient and
    `upload-`-prefixed ids via the in-memory upload store, so routes and the
    RAG pipeline can treat both paper sources identically."""

    def __init__(self, arxiv_client: PaperSourceClient, upload_store: UploadedPaperStore) -> None:
        self._arxiv_client = arxiv_client
        self._upload_store = upload_store

    async def search(self, query: str, max_results: int) -> list[Paper]:
        return await self._arxiv_client.search(query, max_results)

    async def get_by_id(self, paper_id: str) -> Paper | None:
        if paper_id.startswith(UPLOAD_ID_PREFIX):
            return self._upload_store.get(paper_id)
        return await self._arxiv_client.get_by_id(paper_id)
