$dashboardUrl = "http://localhost:7777/api/agents"

# Read session info from temp file
$stateFile = "$env:TEMP\mc-agent-$PID.json"
if (Test-Path $stateFile) {
    $state = Get-Content $stateFile | ConvertFrom-Json
    $payload = @{
        agent = "claude-code"
        sessionId = $state.sessionId
        pid = $PID
        status = "offline"
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri "$dashboardUrl/deregister" -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 2 | Out-Null
    } catch {}

    Remove-Item $stateFile -ErrorAction SilentlyContinue
} else {
    # No state file, try with just PID
    $payload = @{ agent = "claude-code"; pid = $PID; status = "offline" } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$dashboardUrl/deregister" -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 2 | Out-Null
    } catch {}
}
