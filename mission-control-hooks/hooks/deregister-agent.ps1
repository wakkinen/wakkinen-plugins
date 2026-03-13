$dashboardUrl = "http://localhost:7777/api/agents"

# Walk up the process tree to find the stable claude.exe PID
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

if ($claudePid) {
    $stateFile = "$env:TEMP\mc-agent-$claudePid.json"
    if (Test-Path $stateFile) {
        $state = Get-Content $stateFile | ConvertFrom-Json
        $payload = @{
            agent = "claude-code"
            sessionId = $state.sessionId
            pid = $claudePid
            status = "offline"
        } | ConvertTo-Json

        try {
            Invoke-RestMethod -Uri "$dashboardUrl/deregister" -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 2 | Out-Null
        } catch {}

        Remove-Item $stateFile -ErrorAction SilentlyContinue
    }
}
