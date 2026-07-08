class ResearchOSError(Exception):
    """Base class for all application-raised errors."""

    def __init__(self, detail: str, retryable: bool = False) -> None:
        super().__init__(detail)
        self.detail = detail
        self.retryable = retryable


class ExternalAPIError(ResearchOSError):
    """Raised when a call to an external API (arXiv, Fireworks, ...) fails."""


class EmbeddingError(ResearchOSError):
    """Raised when embedding generation fails."""


class RAGRetrievalError(ResearchOSError):
    """Raised when retrieval from the vector store fails."""


class LLMError(ResearchOSError):
    """Raised when an LLM completion fails or returns unusable output."""
