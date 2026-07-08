from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # General
    app_name: str = "ResearchOS"
    environment: str = "development"
    cors_allow_origins: list[str] = ["http://localhost:3000"]

    # arXiv
    arxiv_api_base_url: str = "https://export.arxiv.org/api/query"
    arxiv_request_timeout_seconds: float = 15.0
    search_cache_ttl_seconds: int = 300
    search_cache_max_size: int = 256

    # Embeddings (Phase 2 — ROCm GPU if available, CPU fallback otherwise)
    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_batch_size: int = 32
    arxiv_collection_name: str = "papers_arxiv"

    # ChromaDB — absolute path so persistence doesn't depend on the CWD uvicorn was launched from.
    chroma_persist_directory: str = str(BACKEND_ROOT / "chroma_data")

    # Fireworks (Phase 3). Default is a serverless pay-per-token reasoning model for
    # development; the Gemma bonus model is a dedicated deployment used at demo time
    # via a FIREWORKS_MODEL override — see .env.example.
    fireworks_api_key: str = ""
    fireworks_model: str = "accounts/fireworks/models/deepseek-v4-pro"
    fireworks_base_url: str = "https://api.fireworks.ai/inference/v1"
    fireworks_request_timeout_seconds: float = 60.0
    summary_cache_ttl_seconds: int = 3600
    summary_cache_max_size: int = 256


@lru_cache
def get_settings() -> Settings:
    return Settings()
