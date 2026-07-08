import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.logging_config import configure_logging
from app.config.settings import get_settings
from app.database.chroma_store import ChromaVectorStore
from app.embeddings.sentence_transformer_service import SentenceTransformerEmbeddingService
from app.rag.pipeline import RAGPipeline
from app.rag.retriever import Retriever
from app.routes import chat, embeddings, health, papers, search, similarity
from app.services.arxiv_client import ArxivClient
from app.services.cache_service import TTLCacheService
from app.services.llm.fireworks_provider import FireworksLLMProvider

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
    app.state.llm_provider = FireworksLLMProvider(
        api_key=settings.fireworks_api_key,
        model=settings.fireworks_model,
        base_url=settings.fireworks_base_url,
        timeout_seconds=settings.fireworks_request_timeout_seconds,
    )
    app.state.summary_cache = TTLCacheService(
        maxsize=settings.summary_cache_max_size,
        ttl_seconds=settings.summary_cache_ttl_seconds,
    )
    app.state.retriever = Retriever(
        vector_store=app.state.vector_store,
        embedding_service=app.state.embedding_service,
        collection=settings.arxiv_collection_name,
    )
    app.state.rag_pipeline = RAGPipeline(
        retriever=app.state.retriever,
        arxiv_client=app.state.arxiv_client,
        embedding_service=app.state.embedding_service,
        vector_store=app.state.vector_store,
        collection=settings.arxiv_collection_name,
    )

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
    app.include_router(papers.router)
    app.include_router(chat.router)

    return app


app = create_app()
