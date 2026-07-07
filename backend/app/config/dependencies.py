from typing import Annotated, cast

from fastapi import Depends, Request

from app.database.interfaces import VectorStore
from app.embeddings.interfaces import EmbeddingService
from app.models.paper import SearchResponse
from app.services.arxiv_client import ArxivClient
from app.services.cache_service import TTLCacheService
from app.services.interfaces import PaperSourceClient

SearchCache = TTLCacheService[SearchResponse]


def get_arxiv_client(request: Request) -> PaperSourceClient:
    return cast(ArxivClient, request.app.state.arxiv_client)


def get_search_cache(request: Request) -> SearchCache:
    return cast(SearchCache, request.app.state.search_cache)


def get_embedding_service(request: Request) -> EmbeddingService:
    return cast(EmbeddingService, request.app.state.embedding_service)


def get_vector_store(request: Request) -> VectorStore:
    return cast(VectorStore, request.app.state.vector_store)


ArxivClientDep = Annotated[PaperSourceClient, Depends(get_arxiv_client)]
SearchCacheDep = Annotated[SearchCache, Depends(get_search_cache)]
EmbeddingServiceDep = Annotated[EmbeddingService, Depends(get_embedding_service)]
VectorStoreDep = Annotated[VectorStore, Depends(get_vector_store)]
