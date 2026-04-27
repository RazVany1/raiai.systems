$ErrorActionPreference = 'Stop'
Set-Location "C:\Users\R\raiai.systems"
if (Test-Path ".env.local") {
  Get-Content ".env.local" | ForEach-Object {
    if ($_ -match '^[^#].+=') {
      $parts = $_ -split '=', 2
      [System.Environment]::SetEnvironmentVariable($parts[0], $parts[1])
    }
  }
}
python scripts\generate_rsi_trend_snapshot.py
python scripts\generate_rsi_zone_alerts.py
python scripts\generate_paper_entry_alerts.py

$files = @(
  'public/data/rsi-trend-dashboard.json',
  'public/data/hl-lh-formation-state.json',
  'public/data/rsi-zone-alerts.json',
  'public/data/rsi-zone-alert-state.json',
  'public/data/paper-entry-alerts.json',
  'public/data/paper-entry-alert-state.json',
  'public/data/paper-position-snapshots.json'
)

$changed = git status --porcelain -- $files
if ($changed) {
  git add -- $files scripts/generate_rsi_trend_snapshot.py scripts/generate_rsi_zone_alerts.py scripts/generate_paper_entry_alerts.py app/crypto/page.tsx
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  git commit -m "Auto-refresh RSI dashboard data $stamp"
  git push origin main
}
