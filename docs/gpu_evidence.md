# AMD GPU Usage Evidence (Phase 2)

Captured on the AMD ROCm developer notebook (team-2280), 2026-07-07/08. Session used ~35 minutes of the 4-hour daily quota.

## Hardware / software environment

- GPU: `gfx1100` (RDNA3 / Navi 31), PCI device ID `0x744b` — AMD Radeon RX 7900 XTX / Radeon PRO W7900 class
- Host CPU: AMD EPYC 9334 32-Core Processor
- ROCm: 7.2.1
- PyTorch: `2.9.1+gitff65f5b` (ROCm build — reports through the CUDA API namespace, i.e. `torch.cuda.is_available() == True` on this AMD GPU; this is expected upstream behavior, not a bug)
- `torch.cuda.get_device_name(0)` returns an empty string on this ROCm build/container (a known cosmetic quirk); GPU identity confirmed instead via `rocm-smi --showproductname` (GFX Version `gfx1100`, Card Model `0x744b`)

## Embedding benchmark sweep — `POST /api/embeddings/benchmark`

Model: `sentence-transformers/all-MiniLM-L6-v2`, batched via `model.encode(..., batch_size=32, device=..., convert_to_numpy=True)`.

| Batch size (num_texts) | GPU (texts/sec) | CPU (texts/sec) | Speedup |
|---|---|---|---|
| 10 | 555.5 | 6.51 | ~85x |
| 50 | 1664.0 | 6.77 | ~246x |
| 200 | 2750.0 | 6.81 | ~404x |
| 500 | 3130.4 | 6.83 | ~458x |

Speedup **grows with batch size** (85x → 458x) — evidence of real GPU parallelism scaling, not a fixed constant-factor difference. Raw JSON: `backend/gpu_benchmark_results.json` (git-ignored locally; regenerate anytime via `bash scripts/benchmark_sweep.sh`).

Note: the very first embedding call after model load took ~994ms for 50 texts (one-time GPU kernel compilation/warmup); all subsequent calls were in the 18–160ms range as shown above.

## End-to-end verification performed

1. **Search + auto-index**: `GET /api/search?q=transformer+attention&max_results=5` → 5 papers returned and auto-indexed into ChromaDB.
2. **Similarity (pure vector search, no LLM)**: `GET /api/papers/2209.15001v3/similar` → correctly ranked nearest neighbors by cosine similarity (0.68, 0.65, 0.55, 0.42 — ViT/attention papers ranked above an unrelated Music Transformer paper, confirming topical relevance).
3. **Persistence across restart**: stopped and restarted `uvicorn` — re-querying `/similar` for the same paper returned identical results without re-indexing, confirming ChromaDB's on-disk persistence works.
4. **Persistence across notebook session stop**: confirmed the underlying notebook storage survives a full session stop/restart (not just an in-process uvicorn restart) — future sessions won't need to reinstall `torch`/`sentence-transformers`/`chromadb` into `/opt/venv`, saving setup time against the 4hr/24hr quota.
5. **Demo corpus indexed**: `bash scripts/index_demo_corpus.sh` — ~120 papers across 10 topics (transformers, diffusion, RLHF, GNNs, LLM eval, RAG, contrastive learning, ViT, speech, federated learning) indexed for later similarity/recommendation/RAG demo material.

## Adversarial/edge notes

- `chroma-hnswlib` and ROCm PyTorch both installed cleanly on this Linux/Python 3.10 environment — the Windows/Python 3.13 build blockers hit during local development (no prebuilt wheels, missing C++ Build Tools) do not apply here.
- `pip install -r requirements.txt` downgraded a few notebook-preinstalled packages (`pydantic`, `starlette`, `httpx`, `fastapi`, `tenacity`) to our pinned versions, which printed dependency-conflict warnings against unrelated preinstalled tools (`vllm`, `mcp`, `openai-harmony`) — harmless for our app, which doesn't use those packages, but worth knowing if the notebook's other tooling is used in the same venv later.
