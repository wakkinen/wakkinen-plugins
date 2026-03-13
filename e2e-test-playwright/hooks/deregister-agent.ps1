$dashboardUrl = "http://localhost:7777/api/agents"
$payload = @{
    agent = "claude-code"
    pid = $PID
    status = "offline"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$dashboardUrl/deregister" -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 2 | Out-Null
} catch {
    # Dashboard not running - silently ignore
}
