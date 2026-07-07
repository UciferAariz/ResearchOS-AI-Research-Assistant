import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.logging_config import configure_logging
from app.config.settings import get_settings
from app.database.chroma_store import ChromaVectorStore
from app.embeddings.sentence_transformer_service import SentenceTransformerEmbeddingService
from app.routes import embeddings, health, search, similarity
from app.services.arxiv_client import ArxivClient
from app.services.cache_service import TTLCacheService

configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()

    # Expensive/stateful services are constructed once here and reused across
    # requests via app.state + FastAPI Depends(), rather than per-request.
    app.state.arxiv_client = ArxivClient(
        base_url=settings.arxiv_api_base_url,
        timeout_seconds=settings.arxiv_request_timeout_seconds,
    )
    app.state.search_cache = TTLCacheService(
        maxsize=settings.search_cache_max_size,
        ttl_seconds=settings.search_cache_ttl_seconds,
    )
    app.state.embedding_service = SentenceTransformerEmbeddingService(
        model_name=settings.embedding_model_name,
        batch_size=settings.embedding_batch_size,
    )
    app.state.vector_store = ChromaVectorStore(persist_directory=settings.chroma_persist_directory)

    logger.info("%s starting up (environment=%s)", settings.app_name, settings.environment)
    yield
    logger.info("%s shutting down", settings.app_name)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(search.router)
    app.include_router(embeddings.router)
    app.include_router(similarity.router)

    return app


app = create_app()
