$dashboardUrl = "http://localhost:7777/api/agents"
$payload = @{
    agent = "claude-code"
    pid = $PID
    cwd = (Get-Location).Path
    project = Split-Path (Get-Location).Path -Leaf
    startedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "active"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$dashboardUrl/register" -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 2 | Out-Null
} catch {
    # Dashboard not running - silently ignore
}
