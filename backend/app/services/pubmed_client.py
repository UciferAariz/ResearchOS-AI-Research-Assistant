import logging
from datetime import datetime
from xml.etree import ElementTree

import httpx

from app.models.paper import Paper
from app.utils.exceptions import ExternalAPIError
from app.utils.retry import external_api_retry

logger = logging.getLogger(__name__)

PUBMED_ID_PREFIX = "pubmed:"

_MONTH_ABBREVIATIONS = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}


def _parse_pub_date(article: ElementTree.Element) -> datetime:
    date_el = article.find("./Journal/JournalIssue/PubDate")
    if date_el is None:
        return datetime(1970, 1, 1)

    year_text = date_el.findtext("Year") or (date_el.findtext("MedlineDate") or "")[:4]
    try:
        year = int(year_text)
    except ValueError:
        return datetime(1970, 1, 1)

    month_text = date_el.findtext("Month") or "1"
    month = _MONTH_ABBREVIATIONS.get(month_text)
    if month is None:
        try:
            month = int(month_text)
        except ValueError:
            month = 1

    try:
        day = int(date_el.findtext("Day") or "1")
    except ValueError:
        day = 1

    try:
        return datetime(year, month, day)
    except ValueError:
        return datetime(year, 1, 1)


def _extract_abstract(article: ElementTree.Element) -> str:
    parts: list[str] = []
    for abstract_text in article.findall("./Abstract/AbstractText"):
        label = abstract_text.get("Label")
        text = "".join(abstract_text.itertext()).strip()
        if not text:
            continue
        parts.append(f"{label}: {text}" if label else text)
    return " ".join(parts) if parts else "No abstract available."


def _extract_authors(article: ElementTree.Element) -> list[str]:
    authors: list[str] = []
    for author in article.findall("./AuthorList/Author"):
        last_name = author.findtext("LastName")
        fore_name = author.findtext("ForeName")
        collective_name = author.findtext("CollectiveName")
        if last_name and fore_name:
            authors.append(f"{fore_name} {last_name}")
        elif last_name:
            authors.append(last_name)
        elif collective_name:
            authors.append(collective_name)
    return authors


def _extract_pdf_url(pubmed_article: ElementTree.Element, pmid: str) -> str:
    for article_id in pubmed_article.findall("./PubmedData/ArticleIdList/ArticleId"):
        if article_id.get("IdType") == "pmc":
            pmcid = (article_id.text or "").strip()
            if pmcid:
                return f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmcid}/pdf/"
    # PubMed rarely exposes a direct PDF; fall back to the abstract page.
    return f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"


def _pubmed_article_to_paper(pubmed_article: ElementTree.Element) -> Paper | None:
    medline_citation = pubmed_article.find("MedlineCitation")
    if medline_citation is None:
        return None
    pmid = medline_citation.findtext("PMID")
    article = medline_citation.find("Article")
    if not pmid or article is None:
        return None

    title = " ".join("".join(el.itertext()) for el in article.findall("ArticleTitle"))
    title = " ".join(title.split()) or "Untitled"
    pub_date = _parse_pub_date(article)

    return Paper(
        id=f"{PUBMED_ID_PREFIX}{pmid}",
        title=title,
        authors=_extract_authors(article),
        abstract=_extract_abstract(article),
        published=pub_date,
        updated=pub_date,
        pdf_url=_extract_pdf_url(pubmed_article, pmid),
        source="pubmed",
    )


class PubMedClient:
    """PaperSourceClient implementation backed by the NCBI E-utilities API:
    esearch resolves a free-text query to PMIDs, efetch pulls the full
    records. Paper ids are prefixed with `pubmed:` so
    CompositePaperSourceClient can route lookups here without colliding with
    arXiv or upload ids.
    """

    def __init__(self, base_url: str, timeout_seconds: float, api_key: str = "") -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds
        self._api_key = api_key

    def _params(self, extra: dict[str, str | int]) -> dict[str, str | int]:
        params: dict[str, str | int] = dict(extra)
        if self._api_key:
            params["api_key"] = self._api_key
        return params

    @external_api_retry
    async def _esearch(self, client: httpx.AsyncClient, query: str, max_results: int) -> list[str]:
        response = await client.get(
            f"{self._base_url}/esearch.fcgi",
            params=self._params(
                {"db": "pubmed", "term": query, "retmax": max_results, "retmode": "json"}
            ),
        )
        response.raise_for_status()
        data = response.json()
        return [str(pmid) for pmid in data.get("esearchresult", {}).get("idlist", [])]

    @external_api_retry
    async def _efetch(self, client: httpx.AsyncClient, pmids: list[str]) -> list[Paper]:
        if not pmids:
            return []
        response = await client.get(
            f"{self._base_url}/efetch.fcgi",
            params=self._params({"db": "pubmed", "id": ",".join(pmids), "retmode": "xml"}),
        )
        response.raise_for_status()
        root = ElementTree.fromstring(response.text)
        papers: list[Paper] = []
        for pubmed_article in root.findall(".//PubmedArticle"):
            try:
                paper = _pubmed_article_to_paper(pubmed_article)
            except (KeyError, ValueError) as exc:
                logger.warning("Skipping malformed PubMed entry: %s", exc)
                continue
            if paper is not None:
                papers.append(paper)
        return papers

    async def search(self, query: str, max_results: int) -> list[Paper]:
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(self._timeout_seconds), follow_redirects=True
            ) as client:
                pmids = await self._esearch(client, query, max_results)
                return await self._efetch(client, pmids)
        except httpx.HTTPStatusError as exc:
            raise ExternalAPIError(
                f"PubMed API returned {exc.response.status_code}", retryable=False
            ) from exc
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise ExternalAPIError(f"PubMed API request failed: {exc}", retryable=True) from exc

    async def get_by_id(self, paper_id: str) -> Paper | None:
        pmid = paper_id[len(PUBMED_ID_PREFIX) :] if paper_id.startswith(PUBMED_ID_PREFIX) else paper_id
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(self._timeout_seconds), follow_redirects=True
            ) as client:
                papers = await self._efetch(client, [pmid])
        except httpx.HTTPStatusError as exc:
            raise ExternalAPIError(
                f"PubMed API returned {exc.response.status_code}", retryable=False
            ) from exc
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise ExternalAPIError(f"PubMed API request failed: {exc}", retryable=True) from exc
        return papers[0] if papers else None
