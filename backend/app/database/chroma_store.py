import asyncio
import logging

import chromadb
from chromadb.api.models.Collection import Collection

from app.models.vector import VectorMatch
from app.utils.exceptions import RAGRetrievalError

logger = logging.getLogger(__name__)


class ChromaVectorStore:
    """VectorStore implementation backed by a local ChromaDB PersistentClient.

    Uses local on-disk persistence (no separate Chroma server process) so the
    whole stack runs with just `uvicorn` + `next dev` for the hackathon demo.
    Collections are created with cosine similarity space, matching the
    normalized embeddings produced by sentence-transformers models.
    """

    def __init__(self, persist_directory: str) -> None:
        self._client = chromadb.PersistentClient(path=persist_directory)
        self._collections: dict[str, Collection] = {}
        logger.info("ChromaDB persistent client initialized at %s", persist_directory)

    def _get_collection(self, name: str) -> Collection:
        if name not in self._collections:
            self._collections[name] = self._client.get_or_create_collection(
                name=name, metadata={"hnsw:space": "cosine"}
            )
        return self._collections[name]

    async def upsert(
        self,
        collection: str,
        ids: list[str],
        embeddings: list[list[float]],
        documents: list[str],
        metadatas: list[dict[str, str]],
    ) -> None:
        try:
            coll = self._get_collection(collection)
            await asyncio.to_thread(
                coll.upsert, ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas
            )
        except Exception as exc:
            raise RAGRetrievalError(f"Vector store upsert failed: {exc}") from exc

    async def query(
        self,
        collection: str,
        embedding: list[float],
        top_k: int,
        where: dict[str, object] | None = None,
    ) -> list[VectorMatch]:
        try:
            coll = self._get_collection(collection)
            result = await asyncio.to_thread(
                coll.query,
                query_embeddings=[embedding],
                n_results=top_k,
                where=where,
            )
        except Exception as exc:
            raise RAGRetrievalError(f"Vector store query failed: {exc}") from exc

        ids = result.get("ids", [[]])[0]
        documents = result.get("documents") or [[]]
        metadatas = result.get("metadatas") or [[]]
        distances = result.get("distances") or [[]]

        matches: list[VectorMatch] = []
        for i, match_id in enumerate(ids):
            distance = distances[0][i]
            matches.append(
                VectorMatch(
                    id=match_id,
                    document=documents[0][i],
                    metadata=dict(metadatas[0][i]),
                    distance=distance,
                    similarity=1.0 - distance,
                )
            )
        return matches

    async def get_embedding(self, collection: str, id: str) -> list[float] | None:
        try:
            coll = self._get_collection(collection)
            result = await asyncio.to_thread(coll.get, ids=[id], include=["embeddings"])
        except Exception as exc:
            raise RAGRetrievalError(f"Vector store lookup failed: {exc}") from exc

        embeddings = result.get("embeddings")
        if embeddings is None or len(embeddings) == 0:
            return None
        return list(embeddings[0])

    async def get_metadata(self, collection: str, id: str) -> dict[str, str] | None:
        try:
            coll = self._get_collection(collection)
            result = await asyncio.to_thread(coll.get, ids=[id], include=["metadatas"])
        except Exception as exc:
            raise RAGRetrievalError(f"Vector store lookup failed: {exc}") from exc

        metadatas = result.get("metadatas")
        if not metadatas:
            return None
        return dict(metadatas[0])
