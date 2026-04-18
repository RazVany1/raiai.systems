$ErrorActionPreference = 'Stop'
$taskName = 'RAI_DiverT_Snapshot_Every_30_Minutes'
$repoPath = 'C:\Users\R\raiai.systems'
$scriptPath = 'C:\Users\R\raiai.systems\scripts\generate_divert_snapshot.ps1'

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'Refresh DiverT crypto snapshot every 30 minutes' -Force
Write-Host "Scheduled task created/updated: $taskName"
Write-Host "Repo: $repoPath"
Write-Host "Script: $scriptPath"
