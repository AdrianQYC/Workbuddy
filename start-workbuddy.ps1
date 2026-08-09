$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$hostName = "127.0.0.1"
$port = 5173
$pidFile = Join-Path $root ".workbuddy-service.pid"
$logFile = Join-Path $root ".workbuddy-service.log"
$scriptPath = [System.IO.Path]::GetFullPath($MyInvocation.MyCommand.Path)

Set-Content -LiteralPath $logFile -Value "" -Encoding UTF8

function Write-WorkbuddyLog {
  param([string]$Message)

  $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
}

function Get-WorkbuddyStamp {
  $files = @("index.html", "app.js", "styles.css", "sw.js", "manifest.webmanifest")
  $latest = 0L
  foreach ($file in $files) {
    $path = Join-Path $root $file
    if ([System.IO.File]::Exists($path)) {
      $ticks = ([System.IO.File]::GetLastWriteTimeUtc($path)).Ticks
      if ($ticks -gt $latest) { $latest = $ticks }
    }
  }
  return $latest
}

$url = "http://localhost:$port/index.html?wb=$(Get-WorkbuddyStamp)"

function Get-ContentType {
  param([string]$Path)

  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8"; break }
    ".css" { "text/css; charset=utf-8"; break }
    ".js" { "text/javascript; charset=utf-8"; break }
    ".json" { "application/json; charset=utf-8"; break }
    ".webmanifest" { "application/manifest+json; charset=utf-8"; break }
    ".svg" { "image/svg+xml; charset=utf-8"; break }
    default { "application/octet-stream" }
  }
}

function Send-Response {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [byte[]]$Body,
    [string]$ContentType
  )

  $headerText = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Length: $($Body.Length)`r`nContent-Type: $ContentType`r`nConnection: close`r`nCache-Control: no-store, max-age=0, must-revalidate`r`nPragma: no-cache`r`nExpires: 0`r`n`r`n"
  $header = [System.Text.Encoding]::ASCII.GetBytes($headerText)
  $Stream.Write($header, 0, $header.Length)
  if ($Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
}

function Resolve-RequestPath {
  param([string]$RequestTarget)

  $pathOnly = $RequestTarget.Split("?")[0]
  if ([string]::IsNullOrWhiteSpace($pathOnly) -or $pathOnly -eq "/") {
    $pathOnly = "/index.html"
  }

  $relative = [System.Uri]::UnescapeDataString($pathOnly.TrimStart("/")).Replace("/", [System.IO.Path]::DirectorySeparatorChar)
  $fullPath = [System.IO.Path]::GetFullPath((Join-Path $root $relative))
  $rootFull = [System.IO.Path]::GetFullPath($root)

  if ($fullPath -ne $rootFull -and -not $fullPath.StartsWith($rootFull + [System.IO.Path]::DirectorySeparatorChar)) {
    return $null
  }

  return $fullPath
}

function Get-ChromePath {
  $candidates = @(
    (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
    (Join-Path $env:LocalAppData "Google\Chrome\Application\chrome.exe")
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and [System.IO.File]::Exists($candidate)) {
      return $candidate
    }
  }

  $command = Get-Command chrome.exe -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  return $null
}

function Open-Workbuddy {
  $chromePath = Get-ChromePath
  if ($chromePath) {
    Start-Process -FilePath $chromePath -ArgumentList @("--app=$url") | Out-Null
    return
  }

  Start-Process $url
}

function Test-WorkbuddyServiceProcess {
  param([int]$ProcessId)

  $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if (-not $process -or ($process.ProcessName -notin @("powershell", "pwsh"))) {
    return $false
  }

  try {
    $escaped = $scriptPath.Replace("\", "\\")
    $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
    return $cim -and $cim.CommandLine -and ($cim.CommandLine -like "*$scriptPath*" -or $cim.CommandLine -like "*$escaped*")
  } catch {
    return $true
  }
}

function Stop-RecordedWorkbuddyService {
  if (-not [System.IO.File]::Exists($pidFile)) { return $false }
  try {
    $processId = [int](Get-Content -LiteralPath $pidFile -Raw -Encoding UTF8)
    if (Test-WorkbuddyServiceProcess $processId) {
      Stop-Process -Id $processId -Force
      Start-Sleep -Milliseconds 300
    }
    Remove-Item -LiteralPath $pidFile -ErrorAction SilentlyContinue
    return $true
  } catch {
    Remove-Item -LiteralPath $pidFile -ErrorAction SilentlyContinue
    return $false
  }
}

try {
  Write-WorkbuddyLog "Starting Workbuddy service. Root=$root Url=$url"
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse($hostName), $port)
  $listener.Start()
  Set-Content -LiteralPath $pidFile -Value $PID -Encoding UTF8
} catch {
  Write-WorkbuddyLog "Port bind failed: $($_.Exception.Message)"
  if (Stop-RecordedWorkbuddyService) {
    try {
      Write-WorkbuddyLog "Stopped recorded service and retrying."
      $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse($hostName), $port)
      $listener.Start()
      Set-Content -LiteralPath $pidFile -Value $PID -Encoding UTF8
    } catch {
      Write-WorkbuddyLog "Retry bind failed: $($_.Exception.Message)"
      Open-Workbuddy
      exit 0
    }
  } else {
    Write-WorkbuddyLog "Could not stop a recorded service. Opening browser only."
    Open-Workbuddy
    exit 0
  }
}

Open-Workbuddy
Write-Host ""
Write-Host "Workbuddy 已启动：$url"
Write-Host "这个窗口就是 Workbuddy 的本地服务。"
Write-Host "使用时请保持窗口打开；用完后关闭 Workbuddy 页面，再手动关闭这个窗口。"
Write-Host ""

while ($true) {
  if (-not $listener.Pending()) {
    Start-Sleep -Milliseconds 250
    continue
  }

  $client = $listener.AcceptTcpClient()
  try {
    $client.ReceiveTimeout = 1500
    $stream = $client.GetStream()
    $stream.ReadTimeout = 1500
    $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
    $requestLine = $reader.ReadLine()
    if ([string]::IsNullOrWhiteSpace($requestLine)) {
      $client.Close()
      continue
    }

    while ($true) {
      $line = $reader.ReadLine()
      if ([string]::IsNullOrEmpty($line)) { break }
    }

    $parts = $requestLine.Split(" ")
    if ($parts.Count -lt 2) {
      Send-Response $stream 400 "Bad Request" ([System.Text.Encoding]::UTF8.GetBytes("Bad request")) "text/plain; charset=utf-8"
      continue
    }

    $filePath = Resolve-RequestPath $parts[1]
    if ($null -eq $filePath -or -not [System.IO.File]::Exists($filePath)) {
      Send-Response $stream 404 "Not Found" ([System.Text.Encoding]::UTF8.GetBytes("Not found")) "text/plain; charset=utf-8"
      continue
    }

    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    Send-Response $stream 200 "OK" $bytes (Get-ContentType $filePath)
  } catch {
    try {
      Send-Response $stream 500 "Internal Server Error" ([System.Text.Encoding]::UTF8.GetBytes("Server error")) "text/plain; charset=utf-8"
    } catch {}
  } finally {
    $client.Close()
  }
}

$listener.Stop()
Remove-Item -LiteralPath $pidFile -ErrorAction SilentlyContinue
