# The encoder and recovery task must resolve the same private folder.
function Get-RctvRuntimeDirectory {
    $rctvDirectory = $env:RCTV_BROADCAST_DIRECTORY
    if (-not $rctvDirectory) { $rctvDirectory = Join-Path $env:USERPROFILE '.rctv19-streaming' }
    if (-not [IO.Path]::IsPathRooted($rctvDirectory)) { throw 'RCTV_BROADCAST_DIRECTORY must be an absolute private path.' }
    $rctvDirectory = [IO.Path]::GetFullPath($rctvDirectory).TrimEnd([IO.Path]::DirectorySeparatorChar)
    if ($rctvDirectory -match '(?i)[\\/]OneDrive(?:[\\/ -]|$)') { throw 'Keep the private RCTV 19 folder outside OneDrive.' }
    if ([IO.Path]::GetFileName($rctvDirectory) -notmatch '^\.?rctv19(?:[-_].*)?$') { throw 'Use a dedicated private directory whose name begins with rctv19.' }
    return $rctvDirectory
}
$env:RCTV_BROADCAST_DIRECTORY = Get-RctvRuntimeDirectory
