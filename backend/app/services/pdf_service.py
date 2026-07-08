import io
import logging

import httpx
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.utils.exceptions import ExternalAPIError
from app.utils.retry import external_api_retry

logger = logging.getLogger(__name__)


class PdfExtractionError(Exception):
    """Raised when PDF bytes can't be parsed into text (encrypted, corrupt, or scanned/image-only)."""


def extract_text(pdf_bytes: bytes) -> str:
    """Extract and concatenate per-page text from a PDF's raw bytes.

    Scanned/image-only PDFs yield empty per-page text (pypdf does no OCR) —
    callers should treat an empty/whitespace-only result as "no extractable text"
    rather than a hard failure.
    """
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
    except (PdfReadError, ValueError) as exc:
        raise PdfExtractionError(f"Could not parse PDF: {exc}") from exc

    if reader.is_encrypted:
        raise PdfExtractionError("PDF is password-protected")

    pages: list[str] = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception as exc:  # pypdf can raise a variety of parser-internal errors per page
            logger.warning("Skipping unreadable PDF page: %s", exc)
    return "\n\n".join(p for p in pages if p.strip())


class PdfDownloader:
    """Fetches a PDF's raw bytes from a URL (e.g. an arXiv pdf_url)."""

    def __init__(self, timeout_seconds: float) -> None:
        self._timeout_seconds = timeout_seconds

    @external_api_retry
    async def download(self, url: str) -> bytes:
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(self._timeout_seconds), follow_redirects=True
            ) as client:
                response = await client.get(url)
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ExternalAPIError(
                f"PDF download returned {exc.response.status_code}", retryable=False
            ) from exc
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise ExternalAPIError(f"PDF download failed: {exc}", retryable=True) from exc
        return response.content
