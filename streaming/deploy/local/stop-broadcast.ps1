$ErrorActionPreference = 'Stop'
$rctvProject = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
. (Join-Path $PSScriptRoot 'runtime-path.ps1')
$rctvRuntime = $env:RCTV_BROADCAST_DIRECTORY
# Honor an intentional stop even when the recovery task runs or Windows signs in.
[IO.File]::WriteAllText((Join-Path $rctvRuntime 'broadcast-paused'), (Get-Date).ToUniversalTime().ToString('o'))
$rctvListener = Get-NetTCPConnection -LocalPort 19361 -State Listen -ErrorAction SilentlyContinue
if (-not $rctvListener) { Write-Output 'Broadcast helper is already stopped.'; exit }
$rctvParent = Get-CimInstance Win32_Process -Filter "ProcessId = $($rctvListener.OwningProcess)"
$rctvScript = Join-Path $rctvProject 'scripts/run-local-broadcast.mjs'
if (-not $rctvParent.CommandLine -or -not $rctvParent.CommandLine.Contains($rctvScript)) { throw 'The status port belongs to another process; nothing stopped.' }
$rctvChildren = @(Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $rctvParent.ProcessId -and $_.Name -in @('node.exe','mediamtx.exe') })
Stop-Process -Id $rctvParent.ProcessId
foreach ($rctvChild in $rctvChildren) { Stop-Process -Id $rctvChild.ProcessId -ErrorAction SilentlyContinue }
Write-Output 'Broadcast helper stopped and automatic recovery paused. Run start-broadcast.ps1 to resume.'
