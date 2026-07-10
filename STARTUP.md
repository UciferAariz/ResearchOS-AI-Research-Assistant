# ResearchOS — Daily Startup Runbook

How to bring the whole system up yourself after opening the notebook: start the
backend, expose it, and connect the live Vercel frontend to it. No help needed.

**Mental model — what survives a notebook restart and what doesn't:**

| Thing | Survives restart? | Action needed each time |
|---|---|---|
| Cloned repo under `/workspace/...` | ✅ yes, but goes **stale** | `git pull` (step 1) |
| `backend/.env` (Fireworks key, CORS) | ✅ yes | none — already set |
| `/workspace/cloudflared.deb` file | ✅ yes | reinstall from it (fast) |
| Python deps in `/opt/venv` (`chromadb` etc.) | ❌ **wiped** | reinstall (step 1) |
| `cloudflared` binary itself | ❌ **wiped** | reinstall (step 2) |
| The `trycloudflare.com` tunnel URL | ❌ **changes every time** | update Vercel (step 4) |

The two annoying facts: the venv deps get wiped, and the tunnel URL is different
on every restart — which is why the frontend has to be re-pointed and redeployed
each session (`NEXT_PUBLIC_API_URL` is baked in at build time).

---

## TL;DR checklist

1. **Terminal 1** — install deps + start backend
2. **Terminal 2** — install cloudflared + start tunnel → copy the URL
3. On your **Windows machine** — one command: `.\redeploy.ps1 <tunnel-url>`
4. Open https://frontend-ucifer-pros.vercel.app and use it.

---

## Step 1 — Backend (Notebook, Terminal 1)

```bash
cd /workspace/ResearchOS-AI-Research-Assistant

# The clone persists across restarts but does NOT auto-update — pull first so
# you're not running stale code. Same cert workaround as the initial clone.
git -c http.sslVerify=false pull origin main

cd backend
source /opt/venv/bin/activate

# Reinstall the deps that get wiped (torch+ROCm is preinstalled, these aren't).
# If they're already present this is a no-op and finishes in seconds.
pip install -r requirements-rocm.txt      # chromadb + sentence-transformers
pip install -r requirements.txt

# Start the API (leave this terminal running)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Wait for `Uvicorn running on http://0.0.0.0:8000` and the
`Embedding model ... loaded on device=cuda` line. Sanity check in another shell:
`curl http://localhost:8000/docs` → should return HTML.

> If the repo isn't there at all (totally fresh env), first:
> `cd /workspace && git -c http.sslVerify=false clone https://github.com/UciferAariz/ResearchOS-AI-Research-Assistant.git`
> then `cd ResearchOS-AI-Research-Assistant/backend && cp .env.example .env`,
> put your `FIREWORKS_API_KEY` and the `CORS_ALLOW_ORIGINS` line (see step 5) into
> `.env`, and run the pip installs above.

## Step 2 — Tunnel (Notebook, Terminal 2)

`cloudflared` gets wiped, but the installer `.deb` persists in `/workspace`, so
reinstall from it (this is the ~instant path — do NOT re-download the binary):

```bash
dpkg -i /workspace/cloudflared.deb
cloudflared tunnel --url http://localhost:8000
```

Ignore the `ICMP proxy`/`ping_group_range` warnings and the connectivity
pre-check FAILs — the tunnel still registers. Copy the URL from the banner:

```
Your quick Tunnel has been created! Visit it at:
  https://SOME-RANDOM-WORDS.trycloudflare.com      ← copy this
```

Leave this terminal running too.

## Step 3 — Point the frontend at it (Windows machine)

The deployed frontend bakes in the backend URL at build time, so a new tunnel URL
means one env-var swap + redeploy. That's fully automated by the helper script:

```powershell
cd C:\Users\Azra\Desktop\ResearchOS\frontend
.\redeploy.ps1 https://SOME-RANDOM-WORDS.trycloudflare.com
```

The script: (1) checks the backend is reachable through the tunnel, (2) swaps the
production `NEXT_PUBLIC_API_URL`, (3) redeploys from a git-free copy (needed because
the repo's commit-author isn't linked to the Vercel account — a direct deploy from
the repo gets silently blocked), (4) prints the live URL. Takes ~1 min.

If you'd rather do it by hand, the equivalent commands are in the "Manual Vercel
steps" section at the bottom.

## Step 4 — Use it

Open **https://frontend-ucifer-pros.vercel.app** and try the Assistant (chat),
Search, and Compare.

---

## Step 5 — One-time config already baked into `backend/.env` (FYI, not a daily step)

These persist in `/workspace`, so you don't redo them — but if `.env` ever gets
lost, these two lines are what make chat and the browser work:

```
FIREWORKS_API_KEY=<your fireworks key>
CORS_ALLOW_ORIGINS=["http://localhost:3000","https://frontend-ucifer-pros.vercel.app"]
```

- **No `FIREWORKS_API_KEY`** → chat streams the citations then dies with
  "Chat request failed." (Search/similarity still work — they run on the GPU, no key.)
- **Vercel URL missing from `CORS_ALLOW_ORIGINS`** → chat/search fail *in the
  browser only* (curl works fine) because the browser blocks the response for
  lack of an `access-control-allow-origin` header.

After editing `.env`, always **Ctrl+C uvicorn and restart it** — it only reads
`.env` at startup.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ModuleNotFoundError: No module named 'chromadb'` on uvicorn start | venv deps wiped | Step 1 pip installs |
| `cloudflared: command not found` | binary wiped | `dpkg -i /workspace/cloudflared.deb` |
| Site loads but "Something went wrong while searching" | tunnel URL changed / stale in Vercel | rerun Step 3 with the new URL |
| Chat: citations appear then "Chat request failed" | missing/invalid `FIREWORKS_API_KEY` | set it in `.env`, restart uvicorn |
| Works in `curl` but fails in browser | Vercel origin not in `CORS_ALLOW_ORIGINS` | add it to `.env`, restart uvicorn |
| `vercel` says "codebase isn't linked" | link lost | `npx vercel link --yes --project frontend --scope ucifer-pros` in `frontend/` |

### Manual Vercel steps (if not using redeploy.ps1)

```powershell
cd C:\Users\Azra\Desktop\ResearchOS\frontend
npx vercel env rm NEXT_PUBLIC_API_URL production --yes
"https://SOME-RANDOM-WORDS.trycloudflare.com" | npx vercel env add NEXT_PUBLIC_API_URL production
# copy to a folder with no .git, keep .vercel, then deploy from there:
$dst = "$env:TEMP\frontend-deploy-copy"; if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
robocopy . $dst /E /XD node_modules .next .git | Out-Null
cd $dst; npx vercel --prod --yes
```

The canonical alias `frontend-ucifer-pros.vercel.app` auto-repoints to whatever was
last promoted to production — no separate alias step needed.

---

## Want to stop redeploying every time? (optional, one-time)

The redeploy-per-session pain exists only because the quick tunnel URL is random.
A **named Cloudflare tunnel** gives a stable hostname you set once in Vercel and
never touch again. Requires a free Cloudflare account + a domain on Cloudflare.
See https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
— worth it if this stops being a hackathon demo and becomes something you run often.
