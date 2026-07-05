# BizLens local dev starter (Windows PowerShell)
Set-Location $PSScriptRoot

Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Starting BizLens on http://localhost:3001 ..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray
npm run dev:3001
