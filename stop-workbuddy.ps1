$ErrorActionPreference = "SilentlyContinue"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $root ".workbuddy-service.pid"

if (-not [System.IO.File]::Exists($pidFile)) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show("No running Workbuddy local service was found.", "Workbuddy") | Out-Null
  exit 0
}

$processId = [int](Get-Content -LiteralPath $pidFile -Raw -Encoding UTF8)
$process = Get-Process -Id $processId

if (-not $process -or ($process.ProcessName -notin @("powershell", "pwsh"))) {
  Remove-Item -LiteralPath $pidFile -ErrorAction SilentlyContinue
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show("No running Workbuddy local service was found.", "Workbuddy") | Out-Null
  exit 0
}

Stop-Process -Id $processId -Force
Remove-Item -LiteralPath $pidFile -ErrorAction SilentlyContinue

Add-Type -AssemblyName PresentationFramework
[System.Windows.MessageBox]::Show("Workbuddy local service has been stopped.", "Workbuddy") | Out-Null
