def chunk_text(text: str, max_chars: int = 1000, overlap_chars: int = 100) -> list[str]:
    """Fixed-size character-window chunking with overlap.

    Deliberately simple (no semantic/layout-aware chunking) — sufficient for
    arXiv abstracts (Phase 2) and PDF page text (Phase 6) within hackathon
    time constraints.
    """
    text = text.strip()
    if len(text) <= max_chars:
        return [text] if text else []

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + max_chars
        chunks.append(text[start:end].strip())
        if end >= len(text):
            break
        start = end - overlap_chars
    return [c for c in chunks if c]
