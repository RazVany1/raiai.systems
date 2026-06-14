$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Users\R\raiai.systems"
$ScriptPath = Join-Path $ProjectRoot "scripts\run_rsi_top_scan_and_deploy.py"
$LogDir = Join-Path $ProjectRoot "logs"
$LogPath = Join-Path $LogDir "rsi-top-scan.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location $ProjectRoot

$stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $LogPath -Value "[$stamp] START RSI TOP scan+deploy"

& python $ScriptPath *>> $LogPath
$exitCode = $LASTEXITCODE

$stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
if ($exitCode -eq 0) {
  Add-Content -Path $LogPath -Value "[$stamp] OK RSI TOP scan+deploy"
} else {
  Add-Content -Path $LogPath -Value "[$stamp] FAIL RSI TOP scan+deploy exit=$exitCode"
}

exit $exitCode
