# ResearchOS — AI Research Assistant on AMD GPUs

**ResearchOS** is an AI-powered research assistant for scientific literature. It runs
semantic search, cross-paper comparison, PDF question-answering, and citation-grounded
chat over arXiv and PubMed — with all embedding inference accelerated on an **AMD Radeon
GPU via ROCm**.

> **AMD compute at the core:** every semantic-search, similarity, recommendation, and
> RAG-retrieval query is powered by sentence-transformer embeddings computed on an AMD
> RDNA3 GPU (`gfx1100`, ROCm 7.2.1). Measured throughput scales from **85× to 458×** over
> CPU as batch size grows — see [`docs/gpu_evidence.md`](docs/gpu_evidence.md) for the full
> benchmark sweep, hardware identification, and end-to-end verification.

- **Live demo:** https://frontend-ucifer-pros.vercel.app
- **Track:** AMD Developer Hackathon — Track 3 (Unicorn / Open Innovation)

---

## Why it matters

Researchers drown in papers. Keyword search misses conceptually-related work, and reading
every candidate PDF end-to-end is impossible. ResearchOS turns a corpus of papers into a
**queryable, citation-aware knowledge base**: you find work by *meaning* not keywords,
compare methods side by side, ask questions grounded in the actual PDF text, and get
recommendations from a semantic centroid of papers you already care about — all backed by
GPU-accelerated embeddings that make the vector operations fast enough to be interactive.

## What it does

| Capability | Description |
|---|---|
| **Semantic search** | Query arXiv/PubMed; results are auto-embedded on the AMD GPU and indexed into ChromaDB for meaning-based retrieval. |
| **Similar papers** | Pure vector-space nearest-neighbour search — surfaces conceptually related work keyword search misses. |
| **Citation-grounded chat (RAG)** | Ask questions; answers are retrieved from full **PDF text** (not just abstracts), chunked, embedded on-GPU, and returned with inline citations. |
| **Paper comparison** | Compare 2–5 papers by arXiv ID — an LLM contrasts their methods, contributions, and results. |
| **PDF Q&A / upload** | Upload your own PDF; it is extracted, chunked, embedded, and made chat-queryable like any indexed paper. |
| **Recommendations** | Seed with 1–5 papers; ResearchOS averages their embeddings into a centroid and ranks fresh arXiv candidates by cosine similarity. |

## Architecture

```
Next.js frontend (Vercel)                 FastAPI backend (AMD ROCm notebook)
──────────────────────────                ─────────────────────────────────────
  search / chat / compare   ──HTTPS──▶     ┌──────────────────────────────────┐
  discover / upload / recs   (Cloudflare   │  sentence-transformers            │
                              Tunnel)      │  all-MiniLM-L6-v2  ──▶ AMD GPU    │
                                           │                       (ROCm/HIP)  │
                                           ├──────────────────────────────────┤
                                           │  ChromaDB   (persistent vectors)  │
                                           │  arXiv / PubMed clients           │
                                           │  Fireworks AI  (LLM: chat/compare)│
                                           └──────────────────────────────────┘
```

- **Embeddings** run on the AMD GPU through ROCm-built PyTorch (`torch.cuda.*` maps to the
  HIP backend on this hardware — see [`app/embeddings/device_utils.py`](backend/app/embeddings/device_utils.py)).
- **Vector store:** ChromaDB with on-disk persistence (survives restarts).
- **LLM inference** (chat, comparison summaries) is served by Fireworks AI; the embedding
  workload — the interactive, latency-sensitive path — is what runs on AMD.
- Clean layering: routes → services → RAG pipeline → embeddings/vector-store, wired via
  FastAPI dependency injection in [`app/main.py`](backend/app/main.py).

## Tech stack

**Backend:** Python, FastAPI, PyTorch (ROCm), sentence-transformers, ChromaDB, Fireworks AI, pypdf
**Frontend:** Next.js (App Router), TypeScript, deployed on Vercel
**Infra:** AMD RDNA3 GPU (`gfx1100`) + ROCm 7.2.1 developer notebook, exposed via Cloudflare Tunnel

## AMD GPU evidence

Full details in [`docs/gpu_evidence.md`](docs/gpu_evidence.md). Summary:

- **GPU:** `gfx1100` (RDNA3 / Navi 31), AMD Radeon RX 7900 XTX / PRO W7900 class
- **Host:** AMD EPYC 9334 32-Core · **ROCm:** 7.2.1 · **PyTorch:** 2.9.1 (ROCm build)
- **Embedding benchmark** (`all-MiniLM-L6-v2`, GPU vs CPU throughput):

  | Batch size | GPU (texts/s) | CPU (texts/s) | Speedup |
  |---|---|---|---|
  | 10 | 555 | 6.5 | ~85× |
  | 50 | 1,664 | 6.8 | ~246× |
  | 200 | 2,750 | 6.8 | ~404× |
  | 500 | 3,130 | 6.8 | ~458× |

  Speedup *grows* with batch size — real parallelism scaling, not a fixed offset.

## Running it

- **Live hosted demo:** https://frontend-ucifer-pros.vercel.app
- **Bring up the full stack yourself:** [`STARTUP.md`](STARTUP.md) (daily runbook) and
  [`HOSTING.md`](HOSTING.md) (backend on the AMD notebook + Cloudflare Tunnel + Vercel).
- **Notebook / GPU environment setup:** [`NOTEBOOK_SETUP.md`](NOTEBOOK_SETUP.md).

The backend requires the AMD ROCm GPU stack; local (non-GPU) machines can run the frontend
and the API import checks but not the real embedding server.

## Repository layout

```
backend/    FastAPI app — routes, RAG pipeline, embeddings, ChromaDB, LLM + arXiv/PubMed clients
frontend/   Next.js app — search, chat, compare, discover, upload, recommendations
docs/       gpu_evidence.md — AMD GPU benchmark + verification
```
