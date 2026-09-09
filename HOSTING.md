# Hosting ResearchOS for the demo

Frontend is on Vercel. Backend runs on the AMD ROCm GPU notebook and is
exposed to the internet via a Cloudflare Tunnel, since it needs the real
GPU for the embedding benchmark and isn't a normal always-on server.

## 1. Start the backend on the notebook

Follow `NOTEBOOK_SETUP.md` up through step 5 (or the "Update" shortcut at the
top if you've already set up the venv today):

```bash
cd /workspace/ResearchOS-AI-Research-Assistant/backend
source /opt/venv/bin/activate   # or .venv/bin/activate if you built your own
# make sure .env has FIREWORKS_API_KEY set, and CORS_ALLOW_ORIGINS includes
# your Vercel domain once you have it, e.g.:
# CORS_ALLOW_ORIGINS=["https://frontend-ucifer-pros.vercel.app","http://localhost:3000"]
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 2. Expose it with a Cloudflare Tunnel

In a second terminal on the same notebook:

```bash
# install cloudflared if it's not already there
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# quickest option — no Cloudflare account needed, gives a random
# https://<random>.trycloudflare.com URL that stays up as long as this runs
cloudflared tunnel --url http://localhost:8000
```

Copy the `https://<random>.trycloudflare.com` URL it prints — that's your
public backend URL. Keep this terminal running for the whole demo/judging
window; closing it kills the tunnel.

(If you want a stable, memorable URL instead of a random one, that needs a
Cloudflare account + a domain added to it, then `cloudflared tunnel create`
+ a DNS route — tell me if you want to set that up instead.)

## 3. Point the frontend at it

Back on this machine, once you have the tunnel URL:

```bash
cd frontend
npx vercel env rm NEXT_PUBLIC_API_URL production
npx vercel env add NEXT_PUBLIC_API_URL production   # paste the tunnel URL
npx vercel env rm NEXT_PUBLIC_API_URL preview
npx vercel env add NEXT_PUBLIC_API_URL preview       # paste the tunnel URL
npx vercel --prod --yes
```

## 4. Update backend CORS

`CORS_ALLOW_ORIGINS` in the notebook's `.env` needs your Vercel production
URL (and any preview URLs you test with), or the browser will block API
calls. Restart uvicorn after changing it.

## Notes

- The notebook's storage may be ephemeral between sessions — see the backup
  step (6c) in `NOTEBOOK_SETUP.md` for saving `chroma_data/` between runs.
- Every time you restart `cloudflared` with the quick-tunnel command you get
  a **new** random URL — you'll need to repeat step 3 for each fresh
  session unless you switch to a named tunnel with a fixed domain.
