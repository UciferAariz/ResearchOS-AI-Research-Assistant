import math

from app.embeddings.interfaces import EmbeddingService
from app.models.paper import Paper
from app.models.recommendation import RecommendedPaper
from app.services.interfaces import PaperSourceClient

# How many extra arXiv candidates to pull per seed paper before ranking down
# to max_results, so filtering out seeds/duplicates still leaves enough to fill
# the requested count.
CANDIDATE_MULTIPLIER = 3


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def _centroid(embeddings: list[list[float]]) -> list[float]:
    return [sum(dim) / len(embeddings) for dim in zip(*embeddings)]


class Recommender:
    """Discovers arXiv papers related to a set of seed papers.

    Unlike /api/papers/{id}/similar (nearest neighbor search restricted to
    whatever's already in the vector store), this pulls fresh candidates
    straight from arXiv via keyword search on the seeds' titles, then ranks
    them by cosine similarity between each candidate's abstract embedding and
    the centroid of the seed papers' abstract embeddings — so it can surface
    papers the user has never searched for or indexed.
    """

    def __init__(self, arxiv_client: PaperSourceClient, embedding_service: EmbeddingService) -> None:
        self._arxiv_client = arxiv_client
        self._embedding_service = embedding_service

    async def recommend(self, seeds: list[Paper], max_results: int) -> list[RecommendedPaper]:
        seed_embeddings = await self._embedding_service.embed_batch([p.abstract for p in seeds])
        centroid = _centroid(seed_embeddings)

        query = " ".join(p.title for p in seeds)
        candidates = await self._arxiv_client.search(
            query=query, max_results=max_results * CANDIDATE_MULTIPLIER
        )

        seed_ids = {p.id for p in seeds}
        candidates = [c for c in candidates if c.id not in seed_ids]
        if not candidates:
            return []

        candidate_embeddings = await self._embedding_service.embed_batch(
            [c.abstract for c in candidates]
        )
        scored = [
            RecommendedPaper(paper=paper, similarity=_cosine_similarity(centroid, embedding))
            for paper, embedding in zip(candidates, candidate_embeddings)
        ]
        scored.sort(key=lambda r: r.similarity, reverse=True)
        return scored[:max_results]
