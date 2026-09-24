param(
    [Parameter(Mandatory = $true)][ValidatePattern('^[A-Za-z0-9]+$')][string]$PackageId,
    [Parameter(Mandatory = $true)][ValidatePattern('^\d+\.\d+\.\d+$')][string]$Version,
    [Parameter(Mandatory = $true)][ValidatePattern('^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)[0-9.]+$')][string]$DeviceIp
)

$ErrorActionPreference = 'Stop'
$rctvAddress = $null
if (-not [Net.IPAddress]::TryParse($DeviceIp, [ref]$rctvAddress) -or $rctvAddress.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork) { throw 'Supply the currently verified private IPv4 address of the intended Roku TV.' }
if (-not $env:RCTV_BROADCAST_DIRECTORY) { throw 'Set the explicit private RCTV_BROADCAST_DIRECTORY before downloading a signed package.' }
. (Join-Path $PSScriptRoot '../deploy/local/runtime-path.ps1')
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outputDirectory = Join-Path $projectRoot 'dist\roku'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$outputFile = Join-Path $outputDirectory "rctv19-$Version.pkg"
$url = "http://$DeviceIp/pkgs/$PackageId.pkg"

Write-Host 'Enter the Roku TV developer-mode password. It will not be displayed or saved.'
$securePassword = Read-Host 'Roku TV password' -AsSecureString
$handler = [System.Net.Http.HttpClientHandler]::new()
$handler.Credentials = [System.Net.NetworkCredential]::new('rokudev', $securePassword)
$client = [System.Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(60)
try {
    # Roku challenges with HTTP Digest, so the password itself is never sent.
    $response = $client.GetAsync($url, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
    $response.EnsureSuccessStatusCode() | Out-Null
    $source = $response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
    $destination = [System.IO.File]::Open($outputFile, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write)
    try { $source.CopyTo($destination) }
    finally { $destination.Dispose(); $source.Dispose() }
}
finally { $client.Dispose(); $handler.Dispose() }

$package = Get-Item -LiteralPath $outputFile
if ($package.Length -lt 200000) {
    throw "The downloaded package is unexpectedly small ($($package.Length) bytes)."
}
Write-Host "Signed Roku package saved: $outputFile ($($package.Length) bytes)"
