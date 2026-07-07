import logging
from datetime import datetime

import feedparser
import httpx

from app.models.paper import Paper
from app.utils.exceptions import ExternalAPIError
from app.utils.retry import external_api_retry

logger = logging.getLogger(__name__)


def _parse_datetime(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ")


def _extract_pdf_url(entry: feedparser.FeedParserDict) -> str:
    for link in entry.get("links", []):
        if link.get("title") == "pdf" or link.get("type") == "application/pdf":
            return str(link["href"])
    # Fall back to the abstract page URL if no explicit pdf link was found.
    return str(entry.get("id", ""))


def _entry_to_paper(entry: feedparser.FeedParserDict) -> Paper:
    raw_id = entry.get("id", "")
    arxiv_id = raw_id.rsplit("/abs/", 1)[-1] if "/abs/" in raw_id else raw_id
    authors = [author.get("name", "") for author in entry.get("authors", [])]
    return Paper(
        id=arxiv_id,
        title=" ".join(entry.get("title", "").split()),
        authors=authors,
        abstract=" ".join(entry.get("summary", "").split()),
        published=_parse_datetime(entry["published"]),
        updated=_parse_datetime(entry["updated"]),
        pdf_url=_extract_pdf_url(entry),
        source="arxiv",
    )


class ArxivClient:
    """PaperSourceClient implementation backed by the raw arXiv Atom API.

    We hit the Atom endpoint directly (rather than the `arxiv` PyPI package) so we
    keep full control over the httpx client, timeout, and retry behavior used
    consistently across this project's external API calls.
    """

    def __init__(self, base_url: str, timeout_seconds: float) -> None:
        self._base_url = base_url
        self._timeout_seconds = timeout_seconds

    @external_api_retry
    async def search(self, query: str, max_results: int) -> list[Paper]:
        params: dict[str, str | int] = {
            "search_query": f"all:{query}",
            "start": 0,
            "max_results": max_results,
        }
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(self._timeout_seconds), follow_redirects=True
            ) as client:
                response = await client.get(self._base_url, params=params)
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ExternalAPIError(
                f"arXiv API returned {exc.response.status_code}", retryable=False
            ) from exc
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise ExternalAPIError(f"arXiv API request failed: {exc}", retryable=True) from exc

        feed = feedparser.parse(response.text)
        papers: list[Paper] = []
        for entry in feed.entries:
            try:
                papers.append(_entry_to_paper(entry))
            except (KeyError, ValueError) as exc:
                logger.warning("Skipping malformed arXiv entry %s: %s", entry.get("id"), exc)
        return papers
