$ErrorActionPreference = "Stop"

$TaskName = "RAI_RSI_TOP_1D_V3_Every_30_Minutes"
$OldTaskName = "RAI_RSI_TOP_1D_V3_Every_3_Hours"
$ScriptPath = "C:\Users\R\raiai.systems\scripts\generate_rsi_trend_snapshot.ps1"
$Action = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""

# Strategia 3: scanare + deploy la 30 minute = 48 deploy windows/zi, sub limita Vercel Hobby 100/zi.
cmd /c "schtasks /Delete /TN $OldTaskName /F >NUL 2>NUL"
schtasks /Create /TN $TaskName /TR $Action /SC MINUTE /MO 30 /ST 00:05 /F | Out-Host

# Nu pornim imediat aici: evită suprapunerea peste o rulare manuală/test.
schtasks /Query /TN $TaskName /FO LIST /V | Out-Host
