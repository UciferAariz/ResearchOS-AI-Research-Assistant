from app.database.chunking import chunk_text
from app.database.interfaces import VectorStore
from app.embeddings.interfaces import EmbeddingService
from app.models.paper import Paper


async def index_paper_text(
    vector_store: VectorStore,
    embedding_service: EmbeddingService,
    collection: str,
    paper: Paper,
    text: str,
) -> int:
    """Chunk `text` (an abstract or full PDF text), embed each chunk, and
    upsert into the vector store. The first chunk keeps `paper.id` as its bare
    vector id (no suffix) so `VectorStore.get_embedding(collection, paper.id)`
    continues to work as an "is this paper indexed at all" check regardless of
    how many chunks it ended up with. Returns the number of chunks indexed.
    """
    chunks = chunk_text(text)
    if not chunks:
        return 0

    embeddings = await embedding_service.embed_batch(chunks)
    ids = [paper.id if i == 0 else f"{paper.id}::chunk{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "paper_id": paper.id,
            "title": paper.title,
            "chunk_index": str(i),
            "source": paper.source,
        }
        for i in range(len(chunks))
    ]
    await vector_store.upsert(
        collection=collection,
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
    )
    return len(chunks)
