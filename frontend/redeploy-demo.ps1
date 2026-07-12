# redeploy-demo.ps1 — deploy the Vercel frontend in DEMO MODE (no backend needed).
#
# Usage (from the frontend/ folder):
#   .\redeploy-demo.ps1
#
# Demo mode (NEXT_PUBLIC_DEMO_MODE=true) makes the site serve realistic,
# pre-made data entirely client-side (see services/demo.ts), so judges can
# explore search / read / summarize / chat / compare / GPU-benchmark with the
# GPU notebook offline. Deploys from a git-free copy because the repo's commit
# author isn't linked to the Vercel account (a direct repo deploy gets blocked).
#
# To go back to the LIVE backend later: remove the flag and redeploy —
#   npx vercel env rm NEXT_PUBLIC_DEMO_MODE production --yes
#   .\redeploy.ps1 <tunnel-url>

$ErrorActionPreference = "Stop"
$FrontendDir = $PSScriptRoot
$CopyDir = Join-Path $env:TEMP "frontend-deploy-copy"

Write-Host "==> 1/3  Enabling demo mode (NEXT_PUBLIC_DEMO_MODE=true) on production ..." -ForegroundColor Cyan
Push-Location $FrontendDir
try {
    try { npx vercel env rm NEXT_PUBLIC_DEMO_MODE production --yes } catch { Write-Host "    (no existing var to remove)" }
    "true" | npx vercel env add NEXT_PUBLIC_DEMO_MODE production
    if ($LASTEXITCODE -ne 0) { throw "vercel env add failed (exit $LASTEXITCODE)" }
} finally {
    Pop-Location
}
Write-Host "    Demo mode enabled" -ForegroundColor Green

Write-Host "==> 2/3  Copying to git-free build dir ($CopyDir) ..." -ForegroundColor Cyan
if (Test-Path $CopyDir) { Remove-Item -Recurse -Force $CopyDir }
New-Item -ItemType Directory -Path $CopyDir | Out-Null
robocopy $FrontendDir $CopyDir /E /XD node_modules .next .git /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed (exit $LASTEXITCODE)" }
$global:LASTEXITCODE = 0
Write-Host "    Copied (node_modules/.next/.git excluded, .vercel kept)" -ForegroundColor Green

Write-Host "==> 3/3  Deploying to production ..." -ForegroundColor Cyan
Push-Location $CopyDir
try {
    npx vercel --prod --yes
    if ($LASTEXITCODE -ne 0) { throw "vercel deploy failed (exit $LASTEXITCODE)" }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Done. Live (demo mode) at https://frontend-ucifer-pros.vercel.app" -ForegroundColor Green
Write-Host "Give it a few seconds, then hard-refresh the page." -ForegroundColor Green
