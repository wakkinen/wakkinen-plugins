$dashboardUrl = "http://localhost:7777/api/agents"
$projectPath = (Get-Location).Path
$projectName = Split-Path $projectPath -Leaf

# Walk up the process tree to find the stable claude.exe PID
# Chain: claude.exe -> cmd.exe (run-hook.cmd) -> powershell.exe (this script)
$currentPid = $PID
$claudePid = $null
while ($currentPid) {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$currentPid" -ErrorAction SilentlyContinue
    if (-not $proc) { break }
    if ($proc.Name -eq 'claude.exe') {
        $claudePid = $proc.ProcessId
        break
    }
    $currentPid = $proc.ParentProcessId
}

if (-not $claudePid) { exit 0 }

$sessionId = [guid]::NewGuid().ToString().Substring(0,8)

# Store session info keyed by stable claude.exe PID
$stateFile = "$env:TEMP\mc-agent-$claudePid.json"
@{
    sessionId = $sessionId
    pid = $claudePid
    project = $projectName
    cwd = $projectPath
} | ConvertTo-Json | Set-Content $stateFile

$payload = @{
    agent = "claude-code"
    sessionId = $sessionId
    pid = $claudePid
    project = $projectName
    cwd = $projectPath
    startedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "active"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$dashboardUrl/register" -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 2 | Out-Null
} catch {
    # Dashboard not running - silently ignore
}
