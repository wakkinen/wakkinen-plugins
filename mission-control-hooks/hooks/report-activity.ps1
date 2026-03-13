# PostToolUse hook - reports every tool call to Mission Control dashboard
param()

# Find stable claude.exe PID
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

# Read hook input from stdin (Claude Code pipes tool info as JSON)
$input_json = [Console]::In.ReadToEnd()

$payload = @{
    pid = $claudePid
    project = Split-Path (Get-Location).Path -Leaf
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    event = "tool_use"
    data = $input_json
} | ConvertTo-Json -Depth 3

try {
    Invoke-RestMethod -Uri "http://localhost:7777/api/agents/activity" -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 1 | Out-Null
} catch {}
