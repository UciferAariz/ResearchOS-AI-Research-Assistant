# redeploy.ps1 — point the deployed Vercel frontend at a new backend tunnel URL.
#
# Usage (from the frontend/ folder):
#   .\redeploy.ps1 https://some-random-words.trycloudflare.com
#
# Run this each time you restart the notebook and cloudflared prints a new URL.
# It: verifies the backend is reachable, swaps the production NEXT_PUBLIC_API_URL,
# and redeploys from a git-free copy (the repo's commit author isn't linked to the
# Vercel account, so a direct deploy from the repo gets silently blocked).

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$TunnelUrl
)

$ErrorActionPreference = "Stop"
$TunnelUrl = $TunnelUrl.TrimEnd('/')
$FrontendDir = $PSScriptRoot
$CopyDir = Join-Path $env:TEMP "frontend-deploy-copy"

Write-Host "==> 1/4  Checking backend is reachable at $TunnelUrl/docs ..." -ForegroundColor Cyan
try {
    $resp = Invoke-WebRequest -Uri "$TunnelUrl/docs" -UseBasicParsing -TimeoutSec 25
} catch {
    throw "Backend not reachable at $TunnelUrl/docs. Is uvicorn running and the tunnel up? ($_)"
}
if ($resp.StatusCode -ne 200) { throw "Backend returned HTTP $($resp.StatusCode), expected 200." }
Write-Host "    OK (HTTP 200)" -ForegroundColor Green

Write-Host "==> 2/4  Swapping production NEXT_PUBLIC_API_URL ..." -ForegroundColor Cyan
Push-Location $FrontendDir
try {
    # rm may fail if the var doesn't exist yet — that's fine, keep going.
    try { npx vercel env rm NEXT_PUBLIC_API_URL production --yes } catch { Write-Host "    (no existing var to remove)" }
    $TunnelUrl | npx vercel env add NEXT_PUBLIC_API_URL production
    if ($LASTEXITCODE -ne 0) { throw "vercel env add failed (exit $LASTEXITCODE)" }
} finally {
    Pop-Location
}
Write-Host "    Set to $TunnelUrl" -ForegroundColor Green

Write-Host "==> 3/4  Copying to git-free build dir ($CopyDir) ..." -ForegroundColor Cyan
if (Test-Path $CopyDir) { Remove-Item -Recurse -Force $CopyDir }
New-Item -ItemType Directory -Path $CopyDir | Out-Null
# robocopy exit codes 0-7 are success; 8+ are failures.
robocopy $FrontendDir $CopyDir /E /XD node_modules .next .git /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed (exit $LASTEXITCODE)" }
$global:LASTEXITCODE = 0
Write-Host "    Copied (node_modules/.next/.git excluded, .vercel kept)" -ForegroundColor Green

Write-Host "==> 4/4  Deploying to production ..." -ForegroundColor Cyan
Push-Location $CopyDir
try {
    npx vercel --prod --yes
    if ($LASTEXITCODE -ne 0) { throw "vercel deploy failed (exit $LASTEXITCODE)" }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Done. Live at https://frontend-ucifer-pros.vercel.app" -ForegroundColor Green
Write-Host "Give it a few seconds, then hard-refresh the page." -ForegroundColor Green
