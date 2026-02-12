param(
  [Parameter(Mandatory=$true)]
  [string]$BaseUrl,

  [Parameter(Mandatory=$true)]
  [string]$Jwt,

  [Parameter(Mandatory=$true)]
  [string]$PhoneNumber,

  [Parameter(Mandatory=$true)]
  [ValidateSet('image','document','audio','video','sticker')]
  [string]$Type,

  [Parameter(Mandatory=$true)]
  [string]$FilePath,

  [string]$Caption,
  [string]$Filename,

  [string]$OutFile
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (!(Test-Path -LiteralPath $FilePath)) {
  throw "FilePath not found: $FilePath"
}

# Normalize base url
$base = $BaseUrl.TrimEnd('/')

$sendUrl = "$base/api/whatsapp/send-media"

if (-not $OutFile -or $OutFile.Trim().Length -eq 0) {
  $ext = [System.IO.Path]::GetExtension($FilePath)
  if (-not $ext) { $ext = '.bin' }
  $OutFile = Join-Path -Path (Get-Location) -ChildPath ("downloaded-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + $ext)
}

$resolvedFilename = $Filename
if (-not $resolvedFilename -or $resolvedFilename.Trim().Length -eq 0) {
  $resolvedFilename = [System.IO.Path]::GetFileName($FilePath)
}

Write-Host "Sending media to $sendUrl" -ForegroundColor Cyan

# Build multipart/form-data using .NET (works in Windows PowerShell 5.1)
$handler = New-Object System.Net.Http.HttpClientHandler
$client = New-Object System.Net.Http.HttpClient($handler)
$client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Bearer', $Jwt)

try {
  $content = New-Object System.Net.Http.MultipartFormDataContent

  $content.Add((New-Object System.Net.Http.StringContent($PhoneNumber)), 'phone_number')
  $content.Add((New-Object System.Net.Http.StringContent($Type)), 'type')
  if ($Caption -and $Caption.Trim().Length -gt 0) {
    $content.Add((New-Object System.Net.Http.StringContent($Caption)), 'caption')
  }
  if ($resolvedFilename -and $resolvedFilename.Trim().Length -gt 0) {
    $content.Add((New-Object System.Net.Http.StringContent($resolvedFilename)), 'filename')
  }

  $bytes = [System.IO.File]::ReadAllBytes($FilePath)
  $fileContent = New-Object System.Net.Http.ByteArrayContent(,$bytes)
  $fileContent.Headers.ContentType = New-Object System.Net.Http.Headers.MediaTypeHeaderValue('application/octet-stream')
  $content.Add($fileContent, 'file', $resolvedFilename)

  $resp = $client.PostAsync($sendUrl, $content).GetAwaiter().GetResult()
  $respText = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()

  if (-not $resp.IsSuccessStatusCode) {
    throw "Send failed ($($resp.StatusCode)): $respText"
  }

  $sendResult = $respText | ConvertFrom-Json
  $mediaId = $sendResult.media_id
  $wamid = $sendResult.whatsapp_message_id

  Write-Host "Send OK: wamid=$wamid media_id=$mediaId" -ForegroundColor Green

  if (-not $mediaId) {
    Write-Warning 'No media_id returned. Nothing to download.'
    return
  }

  $downloadUrl = "$base/api/whatsapp/media/$mediaId?filename=$([System.Uri]::EscapeDataString($resolvedFilename))"
  Write-Host "Downloading via proxy: $downloadUrl" -ForegroundColor Cyan

  $req = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $downloadUrl)
  $req.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $Jwt)

  $downloadResp = $client.SendAsync($req, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
  if (-not $downloadResp.IsSuccessStatusCode) {
    $err = $downloadResp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    throw "Download failed ($($downloadResp.StatusCode)): $err"
  }

  $stream = $downloadResp.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
  $fs = [System.IO.File]::Open($OutFile, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
  try {
    $stream.CopyTo($fs)
  } finally {
    $fs.Dispose()
    $stream.Dispose()
  }

  $ct = $downloadResp.Content.Headers.ContentType
  Write-Host "Downloaded to: $OutFile" -ForegroundColor Green
  if ($ct) { Write-Host "Content-Type: $ct" -ForegroundColor DarkGray }

} finally {
  $client.Dispose()
}
