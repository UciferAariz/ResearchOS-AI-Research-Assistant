from app.database.chunking import chunk_text
from app.database.interfaces import VectorStore
from app.embeddings.interfaces import EmbeddingService
from app.models.paper import Paper


async def _upsert_chunks(
    vector_store: VectorStore,
    embedding_service: EmbeddingService,
    collection: str,
    paper: Paper,
    chunks: list[str],
    pages: list[int] | None,
    full_text: bool,
) -> int:
    """Embed `chunks` and upsert them for `paper`. The first chunk keeps
    `paper.id` as its bare vector id (no suffix) so
    `VectorStore.get_metadata(collection, paper.id)` continues to work as an
    "is this paper indexed, and how?" check regardless of how many chunks it
    ended up with. `pages`, when given, is index-aligned to `chunks` and
    records each chunk's source page number in metadata. Returns the number of
    chunks indexed.
    """
    if not chunks:
        return 0

    embeddings = await embedding_service.embed_batch(chunks)
    ids = [paper.id if i == 0 else f"{paper.id}::chunk{i}" for i in range(len(chunks))]
    metadatas: list[dict[str, str]] = []
    for i in range(len(chunks)):
        metadata = {
            "paper_id": paper.id,
            "title": paper.title,
            "chunk_index": str(i),
            "source": paper.source,
            "full_text": "true" if full_text else "false",
        }
        if pages is not None:
            metadata["page"] = str(pages[i])
        metadatas.append(metadata)

    await vector_store.upsert(
        collection=collection,
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
    )
    return len(chunks)


async def index_paper_text(
    vector_store: VectorStore,
    embedding_service: EmbeddingService,
    collection: str,
    paper: Paper,
    text: str,
    full_text: bool = False,
) -> int:
    """Chunk `text` (an abstract or a flat body of text), embed each chunk, and
    upsert into the vector store. Returns the number of chunks indexed.

    `full_text` records, in each chunk's metadata, whether `text` is the paper's
    full text (True) or just its abstract (False). The RAG pipeline reads this
    to decide whether an already-indexed paper needs upgrading from an
    abstract-only entry (created cheaply at search time) to full-text grounding
    before chat can meaningfully answer questions about its body.

    Use `index_paper_pages` instead when per-page text is available, so chunks
    carry page numbers for page-scoped retrieval.
    """
    chunks = chunk_text(text)
    return await _upsert_chunks(
        vector_store, embedding_service, collection, paper, chunks, None, full_text
    )


async def index_paper_pages(
    vector_store: VectorStore,
    embedding_service: EmbeddingService,
    collection: str,
    paper: Paper,
    pages: list[str],
    full_text: bool = True,
) -> int:
    """Chunk a paper's full text page by page so every chunk is attributable to
    exactly one page. Each chunk is prefixed with a `[Page N]` marker (so the
    LLM can see and cite page numbers) and tagged with a `page` metadata field
    (so retrieval can be scoped to a specific page for "what's on page 4?"
    questions). Returns the number of chunks indexed.
    """
    chunks: list[str] = []
    chunk_pages: list[int] = []
    for page_number, page_text in enumerate(pages, start=1):
        for chunk in chunk_text(page_text):
            chunks.append(f"[Page {page_number}] {chunk}")
            chunk_pages.append(page_number)

    return await _upsert_chunks(
        vector_store, embedding_service, collection, paper, chunks, chunk_pages, full_text
    )
