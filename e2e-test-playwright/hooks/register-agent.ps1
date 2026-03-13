$dashboardUrl = "http://localhost:7777/api/agents"
$projectPath = (Get-Location).Path
$projectName = Split-Path $projectPath -Leaf
$sessionId = [guid]::NewGuid().ToString().Substring(0,8)

# Store session ID in temp so deregister can find it
$stateFile = "$env:TEMP\mc-agent-$PID.json"
@{
    sessionId = $sessionId
    pid = $PID
    project = $projectName
    cwd = $projectPath
} | ConvertTo-Json | Set-Content $stateFile

$payload = @{
    agent = "claude-code"
    sessionId = $sessionId
    pid = $PID
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
