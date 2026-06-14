$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Users\R\raiai.systems"
$ScriptPath = Join-Path $ProjectRoot "scripts\run_rsi_top_scan_and_deploy.py"
$LogDir = Join-Path $ProjectRoot "logs"
$LogPath = Join-Path $LogDir "rsi-top-scan.log"
$TempOut = Join-Path $LogDir "rsi-top-last-run.tmp"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location $ProjectRoot

$stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $LogPath -Encoding UTF8 -Value "[$stamp] START RSI TOP scan+deploy"

& python $ScriptPath > $TempOut 2>&1
$exitCode = $LASTEXITCODE
if (Test-Path $TempOut) {
  Get-Content -Path $TempOut -ErrorAction SilentlyContinue | Add-Content -Path $LogPath -Encoding UTF8
  Remove-Item -Path $TempOut -Force -ErrorAction SilentlyContinue
}

$stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
if ($exitCode -eq 0) {
  Add-Content -Path $LogPath -Encoding UTF8 -Value "[$stamp] OK RSI TOP scan+deploy"
} else {
  Add-Content -Path $LogPath -Encoding UTF8 -Value "[$stamp] FAIL RSI TOP scan+deploy exit=$exitCode"
}

exit $exitCode
