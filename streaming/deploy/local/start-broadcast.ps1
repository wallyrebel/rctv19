param([switch]$RecoveryCheck, [switch]$ValidateOnly, [string]$RuntimeDirectory)
$ErrorActionPreference = 'Stop'
if ($RuntimeDirectory) { $env:RCTV_BROADCAST_DIRECTORY = $RuntimeDirectory }
. (Join-Path $PSScriptRoot 'runtime-path.ps1')
$rctvRuntime = $env:RCTV_BROADCAST_DIRECTORY
if ($ValidateOnly) {
    foreach ($rctvName in @('r2.env', 'mediamtx.json')) {
        $rctvHandle = [IO.File]::OpenRead((Join-Path $rctvRuntime $rctvName))
        $rctvHandle.Dispose()
    }
    $rctvSettings = Get-Content -LiteralPath (Join-Path $rctvRuntime 'mediamtx.json') -Raw | ConvertFrom-Json
    if ([IO.Path]::GetFullPath($rctvSettings.hlsDirectory) -ne (Join-Path $rctvRuntime 'live-hls')) { throw 'Receiver and uploader use different video folders.' }
    if ($rctvSettings.rtmpAddress -ne '127.0.0.1:19360' -or $rctvSettings.hlsAddress -ne '127.0.0.1:18898' -or (@($rctvSettings.paths.PSObject.Properties.Name) -join ',') -ne 'rctv19') { throw 'Receiver configuration is not isolated to RCTV 19.' }
    if (-not ((Get-Content -LiteralPath (Join-Path $rctvRuntime 'r2.env')) -match '^R2_BUCKET=rctv19-live$')) { throw 'RCTV 19 needs its own live bucket credential.' }
    Write-Output 'Private configuration is readable and receiver/uploader paths agree. No processes changed.'
    exit 0
}
$rctvUserSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$rctvLaunchMutex = New-Object System.Threading.Mutex($false, ('Local\RCTV19Launch-' + $rctvUserSid))
$rctvLaunchLocked = $false
try {
try { $rctvLaunchLocked = $rctvLaunchMutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $rctvLaunchLocked = $true }
if (-not $rctvLaunchLocked) { Write-Output 'Another broadcast launch is already in progress.'; exit 0 }
$rctvPauseFile = Join-Path $rctvRuntime 'broadcast-paused'
if ($RecoveryCheck -and (Test-Path -LiteralPath $rctvPauseFile)) {
    Write-Output 'Broadcast helper was intentionally stopped; automatic recovery is paused.'
    exit 0
}
if (-not $RecoveryCheck -and (Test-Path -LiteralPath $rctvPauseFile)) {
    Remove-Item -LiteralPath $rctvPauseFile
}
# Avoid spawning another supervisor or replacing its logs when already running.
$rctvProbe = New-Object System.Net.Sockets.TcpClient
try {
    $rctvProbe.Connect('127.0.0.1', 19361)
    Write-Output 'Broadcast helper is already running.'
    exit 0
} catch {
    # No helper is listening yet.
} finally { $rctvProbe.Dispose() }
$rctvProject = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$rctvNode = Join-Path $env:ProgramFiles 'nodejs/node.exe'
if (-not (Test-Path -LiteralPath $rctvNode)) { $rctvNode = (Get-Command node.exe -ErrorAction Stop).Source }
$rctvScript = Join-Path $rctvProject 'scripts/run-local-broadcast.mjs'
if (-not (Test-Path -LiteralPath (Join-Path $rctvRuntime 'r2.env'))) {
    throw 'This computer needs its private Cloudflare upload credential first.'
}
# A terminated supervisor can leave its receiver/uploader behind. Only stop
# processes using this installation's exact executable and private config paths.
# Do this only after confirming that no supervisor owns the status port.
$rctvReceiver = [IO.Path]::GetFullPath((Join-Path $rctvProject '.cache/mediamtx/mediamtx.exe'))
if ($env:MEDIAMTX_PATH) { $rctvReceiver = [IO.Path]::GetFullPath($env:MEDIAMTX_PATH) }
$rctvConfig = [IO.Path]::GetFullPath((Join-Path $rctvRuntime 'mediamtx.json'))
$rctvUploader = [IO.Path]::GetFullPath((Join-Path $rctvProject 'scripts/publish-live.mjs'))
$rctvOrphans = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe' OR Name = 'mediamtx.exe'" | Where-Object {
    $rctvCommand = $_.CommandLine
    $_.CommandLine -and (
        ($_.ExecutablePath -eq $rctvReceiver -and $rctvCommand.Contains($rctvConfig)) -or
        ($_.ExecutablePath -eq $rctvNode -and $rctvCommand.Contains($rctvUploader) -and $rctvCommand.Contains('--runtime=' + $rctvRuntime))
    )
})
foreach ($rctvOrphan in $rctvOrphans) {
    Stop-Process -Id $rctvOrphan.ProcessId -ErrorAction SilentlyContinue
}
$rctvStarted = Start-Process -FilePath $rctvNode -ArgumentList ('"' + $rctvScript + '"') -WorkingDirectory $rctvProject -WindowStyle Hidden -RedirectStandardOutput (Join-Path $rctvRuntime 'supervisor-out.log') -RedirectStandardError (Join-Path $rctvRuntime 'supervisor-error.log') -PassThru
$rctvReady = $false
for ($rctvAttempt = 0; $rctvAttempt -lt 25; $rctvAttempt++) {
    $rctvStarted.Refresh()
    if ($rctvStarted.HasExited) { throw ('Broadcast helper exited during startup (code ' + $rctvStarted.ExitCode + '). Check supervisor-error.log.') }
    $rctvStartupProbe = New-Object System.Net.Sockets.TcpClient
    try { $rctvStartupProbe.Connect('127.0.0.1', 19361); $rctvReady = $true; break }
    catch { Start-Sleep -Milliseconds 200 }
    finally { $rctvStartupProbe.Dispose() }
}
if (-not $rctvReady) { throw 'Broadcast helper did not open its status port after starting. Check supervisor-error.log.' }
[IO.File]::AppendAllText((Join-Path $rctvRuntime 'recovery.log'), ((Get-Date).ToUniversalTime().ToString('o') + ' Started broadcast helper PID ' + $rctvStarted.Id + [Environment]::NewLine))
Write-Output 'Broadcast helper started. Check http://127.0.0.1:19361/ for publishing status, then start the vMix/OBS stream.'
} catch {
    # Launcher errors contain installation paths, never stream keys or R2 values.
    try { [IO.File]::AppendAllText((Join-Path $rctvRuntime 'recovery.log'), ((Get-Date).ToUniversalTime().ToString('o') + ' Launcher failed at line ' + $_.InvocationInfo.ScriptLineNumber + ': ' + $_.Exception.Message + [Environment]::NewLine)) } catch { }
    throw
} finally {
    if ($rctvLaunchLocked) { $rctvLaunchMutex.ReleaseMutex() }
    $rctvLaunchMutex.Dispose()
}
