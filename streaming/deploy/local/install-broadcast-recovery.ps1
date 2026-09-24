$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'runtime-path.ps1')
$rctvProject = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$rctvLauncher = Join-Path $PSScriptRoot 'start-broadcast.ps1'
$rctvHiddenLauncher = Join-Path $PSScriptRoot 'check-broadcast-hidden.vbs'
$rctvScriptHost = Join-Path $env:WINDIR 'System32/wscript.exe'
if (-not (Test-Path -LiteralPath $rctvHiddenLauncher) -or -not (Test-Path -LiteralPath $rctvScriptHost)) { throw 'The windowless recovery launcher is missing.' }
$rctvUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$rctvTaskName = 'RCTV 19 Broadcast Recovery'
$rctvArguments = '//B //Nologo "' + $rctvHiddenLauncher + '" "' + $env:RCTV_BROADCAST_DIRECTORY + '"'
$rctvExisting = Get-ScheduledTask -TaskName $rctvTaskName -ErrorAction SilentlyContinue
if ($rctvExisting -and -not (($rctvExisting.Actions.Arguments -like ('*' + $rctvLauncher + '*')) -or ($rctvExisting.Actions.Arguments -like ('*' + $rctvHiddenLauncher + '*')))) {
    throw 'A different task uses this name; nothing changed.'
}
$rctvAction = New-ScheduledTaskAction -Execute $rctvScriptHost -Argument $rctvArguments -WorkingDirectory $rctvProject
$rctvTriggers = @(
    New-ScheduledTaskTrigger -AtLogOn -User $rctvUser
    New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
)
$rctvPrincipal = New-ScheduledTaskPrincipal -UserId $rctvUser -LogonType Interactive -RunLevel Limited
# No execution deadline: a recovered background child must not be killed by a task timeout.
$rctvSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) -Hidden
Register-ScheduledTask -TaskName $rctvTaskName -Action $rctvAction -Trigger $rctvTriggers -Principal $rctvPrincipal -Settings $rctvSettings -Description 'Checks the existing local broadcast helper every minute while signed in. Restarts it if absent; respects intentional stop-broadcast pauses. No credentials stored in this task.' -Force | Out-Null

# Keep the already-installed sign-in shortcut, but make it respect intentional pauses too.
$rctvShortcutPath = Join-Path ([Environment]::GetFolderPath('Startup')) 'RCTV 19 Broadcast.lnk'
if (Test-Path -LiteralPath $rctvShortcutPath) {
    $rctvShortcut = (New-Object -ComObject WScript.Shell).CreateShortcut($rctvShortcutPath)
    if ($rctvShortcut.Arguments.Contains($rctvLauncher) -or $rctvShortcut.Arguments.Contains($rctvHiddenLauncher)) {
        $rctvShortcut.TargetPath = $rctvScriptHost
        $rctvShortcut.Arguments = $rctvArguments
        $rctvShortcut.WindowStyle = 7
        $rctvShortcut.Save()
    }
}
Start-ScheduledTask -TaskName $rctvTaskName
Write-Output 'Broadcast recovery installed for the current signed-in user; checks every minute and at sign-in.'
