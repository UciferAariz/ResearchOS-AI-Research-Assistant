> **Update (2026-07-08): notebook storage persists across session stop/restart**, including `/opt/venv` where dependencies get installed. If you've already run this once today, skip straight to:
> ```bash
> cd /workspace/ResearchOS-AI-Research-Assistant/backend
> source /opt/venv/bin/activate
> uvicorn app.main:app --host 0.0.0.0 --port 8000
> ```
> No need to re-clone or re-`pip install`. Full results from the first run are in `docs/gpu_evidence.md`. The steps below are for a fresh notebook/environment only.

# Running Phase 2 on the AMD ROCm notebook

This machine (Windows, Intel GPU) can't install `chromadb` (no prebuilt Windows
wheel for `chroma-hnswlib` on this Python version) or ROCm PyTorch (Linux-only
wheels). Everything else was written and verified here — sentence-transformers
embedding generation was confirmed working end-to-end on CPU. Do this on the
notebook once you have GPU access:

## 1. Sync the code

```bash
git clone https://github.com/UciferAariz/ResearchOS-AI-Research-Assistant.git
cd ResearchOS-AI-Research-Assistant/backend
```

If you get `server certificate verification failed. CAfile: none` (seen on the `hf-*` container image — missing CA bundle, unrelated to the repo), use:
```bash
git -c http.sslVerify=false clone https://github.com/UciferAariz/ResearchOS-AI-Research-Assistant.git
```

## 2. Confirm ROCm is visible

```bash
rocm-smi
rocminfo | grep -i "gfx\|Marketing"
```

Note the ROCm version and `gfx` arch (e.g. `gfx1100`) — you need the matching PyTorch wheel index below, *unless* torch is already preinstalled (see step 3).

## 3. Check for a preinstalled torch+ROCm venv before installing anything

This container image had ROCm PyTorch **already installed** at `/opt/venv` (not the base `python3`/`pip3`) — check before spending time on a fresh install:

```bash
which -a python python3
ls /opt
source /opt/venv/bin/activate   # if it exists
python -c "import torch; print(torch.__version__, torch.cuda.is_available())"
```

If that prints `True`, skip straight to installing just the missing Phase 2 packages into this same venv:
```bash
pip install -r requirements-rocm.txt   # sentence-transformers + chromadb only — torch already present
pip install -r requirements.txt
```

**Only if no preinstalled torch+ROCm venv exists**, build one from scratch:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# ROCm-specific torch build FIRST (replace rocm6.1 with your actual version from step 2)
pip install torch torchvision --index-url https://download.pytorch.org/whl/rocm6.1

# Then the rest of the Phase 2 deps (installs cleanly on Linux — no C++ build tools needed)
pip install -r requirements-rocm.txt
```

## 4. Smoke-test the GPU before running the app

```bash
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0), torch.__version__)"
```

Expected: `True <AMD GPU name> 2.x.x+rocm6.1` (or similar). If this prints `False`,
stop here and fix the torch/ROCm install — don't move on to the app yet.

Note: `get_device_name(0)` returned an **empty string** on the `gfx1100`/ROCm 7.2
container we tested on, even though `is_available()` was `True` and the GPU worked
correctly for embeddings — a cosmetic quirk of that build, not a real problem. If
you hit the same thing, confirm the GPU identity via `rocm-smi --showproductname`
or `rocminfo | grep -i gfx` instead.

## 5. Run the backend

```bash
cp .env.example .env   # fill in FIREWORKS_API_KEY later, not needed for Phase 2
uvicorn app.main:app --reload --port 8000
```

Startup logs should show a line like:
`Embedding model 'sentence-transformers/all-MiniLM-L6-v2' loaded on device=cuda (<AMD GPU name>), torch=...`

(ROCm builds of PyTorch report through the CUDA API namespace — `device=cuda` on an AMD box is expected, not a bug.)

## 6. Verify Phase 2 end-to-end

```bash
# 1. GPU benchmark — the core "AMD GPU usage" proof artifact
curl -X POST "http://localhost:8000/api/embeddings/benchmark?num_texts=50"
# → {"device":"cuda","device_name":"<AMD GPU>","...,"texts_per_sec": <number>}

# 2. Search (auto-indexes results into ChromaDB)
curl "http://localhost:8000/api/search?q=transformer+attention&max_results=5"

# 3. Similarity — pick a paper id from the search response above
curl "http://localhost:8000/api/papers/<paper_id>/similar"
# → ranked nearest neighbors with similarity scores, no LLM involved

# 4. Restart uvicorn, then repeat step 3 to confirm ChromaDB persistence survives a restart
ls chroma_data/   # should already exist and be non-empty after step 2
```

## 6b. High-value use of remaining GPU time (time-budgeted — see the GPU Notebook Session Plan in the plan file)

```bash
# Populate a diverse demo corpus so similarity/recommendations look good later
# without needing another GPU session (~15-20 min for ~100 papers).
bash scripts/index_demo_corpus.sh http://localhost:8000

# Sweep the benchmark across batch sizes and cpu-vs-gpu — writes
# gpu_benchmark_results.json, which becomes README/demo-script evidence.
bash scripts/benchmark_sweep.sh http://localhost:8000 gpu_benchmark_results.json
```

The benchmark endpoint also accepts an optional `?device=cpu|cuda` override
(`scripts/benchmark_sweep.sh` uses this) for an in-session CPU-vs-GPU speedup
comparison without touching the default embedding path every other endpoint uses.

## 6c. Backup before stopping the notebook (storage may be ephemeral)

```bash
tar -czf researchos_gpu_backup.tar.gz chroma_data/ gpu_benchmark_results.json
```

Download `researchos_gpu_backup.tar.gz` via the JupyterLab file browser to this
machine, and unpack `chroma_data/` into `backend/chroma_data` here so the
persisted vector index survives even if the notebook environment is wiped.

## 7. Run the frontend against it

On this Windows machine (or the notebook, either works since it's just a browser client):

```bash
cd frontend
npm run dev
```

Set `frontend/.env.local`'s `NEXT_PUBLIC_API_URL` to wherever the backend is
reachable (`http://localhost:8000` if same machine, or the notebook's address/tunnel
otherwise). Search, then click "Show related papers" on a result card, and try
the "Run benchmark" button on the GPU panel at the bottom of the page.

## What to report back

- The exact `device_name` string and `texts_per_sec` from the benchmark endpoint — this goes straight into the hackathon README/demo script.
- Whether ChromaDB persistence survived a restart (step 6.4).
- Any install snags specific to the notebook's environment (different ROCm version, missing system packages, etc.) so I can adjust `requirements-rocm.txt`/docs.

Once this is confirmed working, Phase 2 is done and we move to Phase 3 (Fireworks/Gemma LLM + summarization).
