' Use the windowless Windows script host so PowerShell never flashes a console.
' Wait for its result so Task Scheduler still records startup failures.
Option Explicit
Dim shell, files, launcher, powershell, command, result, runtime
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
launcher = files.BuildPath(files.GetParentFolderName(WScript.ScriptFullName), "start-broadcast.ps1")
powershell = shell.ExpandEnvironmentStrings("%WINDIR%\System32\WindowsPowerShell\v1.0\powershell.exe")
command = Chr(34) & powershell & Chr(34) & " -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File " & Chr(34) & launcher & Chr(34) & " -RecoveryCheck"
If WScript.Arguments.Count = 1 Then
    runtime = WScript.Arguments(0)
    If InStr(runtime, Chr(34)) > 0 Then WScript.Quit 1
    command = command & " -RuntimeDirectory " & Chr(34) & runtime & Chr(34)
ElseIf WScript.Arguments.Count <> 0 Then
    WScript.Quit 1
End If
result = shell.Run(command, 0, True)
WScript.Quit result
