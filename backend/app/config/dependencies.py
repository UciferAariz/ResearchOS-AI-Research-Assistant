from typing import Annotated, cast

from fastapi import Depends, Request

from app.database.interfaces import VectorStore
from app.embeddings.interfaces import EmbeddingService
from app.models.comparison import ComparisonResult
from app.models.paper import SearchResponse
from app.models.summary import PaperSummary
from app.rag.pipeline import RAGPipeline
from app.rag.retriever import Retriever
from app.services.arxiv_client import ArxivClient
from app.services.cache_service import TTLCacheService
from app.services.interfaces import PaperSourceClient
from app.services.llm.fireworks_provider import FireworksLLMProvider
from app.services.llm.interfaces import LLMProvider

SearchCache = TTLCacheService[SearchResponse]
SummaryCache = TTLCacheService[PaperSummary]
ComparisonCache = TTLCacheService[ComparisonResult]


def get_arxiv_client(request: Request) -> PaperSourceClient:
    return cast(ArxivClient, request.app.state.arxiv_client)


def get_search_cache(request: Request) -> SearchCache:
    return cast(SearchCache, request.app.state.search_cache)


def get_embedding_service(request: Request) -> EmbeddingService:
    return cast(EmbeddingService, request.app.state.embedding_service)


def get_vector_store(request: Request) -> VectorStore:
    return cast(VectorStore, request.app.state.vector_store)


def get_llm_provider(request: Request) -> LLMProvider:
    return cast(FireworksLLMProvider, request.app.state.llm_provider)


def get_summary_cache(request: Request) -> SummaryCache:
    return cast(SummaryCache, request.app.state.summary_cache)


def get_retriever(request: Request) -> Retriever:
    return cast(Retriever, request.app.state.retriever)


def get_rag_pipeline(request: Request) -> RAGPipeline:
    return cast(RAGPipeline, request.app.state.rag_pipeline)


def get_comparison_cache(request: Request) -> ComparisonCache:
    return cast(ComparisonCache, request.app.state.comparison_cache)


ArxivClientDep = Annotated[PaperSourceClient, Depends(get_arxiv_client)]
SearchCacheDep = Annotated[SearchCache, Depends(get_search_cache)]
EmbeddingServiceDep = Annotated[EmbeddingService, Depends(get_embedding_service)]
VectorStoreDep = Annotated[VectorStore, Depends(get_vector_store)]
LLMProviderDep = Annotated[LLMProvider, Depends(get_llm_provider)]
SummaryCacheDep = Annotated[SummaryCache, Depends(get_summary_cache)]
RetrieverDep = Annotated[Retriever, Depends(get_retriever)]
RAGPipelineDep = Annotated[RAGPipeline, Depends(get_rag_pipeline)]
ComparisonCacheDep = Annotated[ComparisonCache, Depends(get_comparison_cache)]
