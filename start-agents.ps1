# Öffnet ein Windows-Terminal-Fenster mit drei Tabs: Claude, Codex, OpenCode – jeder in seiner Arbeitskopie.
# Vorher einmal phase1.ps1 ausführen.

$parent = Split-Path $PSScriptRoot -Parent
$tabs = @()

foreach ($agent in 'claude', 'codex', 'opencode') {
    $dir = Join-Path $parent "blockwelt-$agent"
    if (-not (Test-Path $dir)) {
        Write-Host "Arbeitskopie $dir fehlt – zuerst phase1.ps1 ausführen." -ForegroundColor Red
        exit 1
    }
    $script = Join-Path $dir 'run-agent.ps1'
    $tabs += "new-tab --title $agent -d `"$dir`" powershell -NoExit -ExecutionPolicy Bypass -File `"$script`" $agent"
}

if (Get-Command wt.exe -ErrorAction SilentlyContinue) {
    Start-Process wt.exe -ArgumentList ($tabs -join ' ; ')
} else {
    Write-Host 'Windows Terminal nicht gefunden – starte drei einzelne Fenster.' -ForegroundColor Yellow
    foreach ($agent in 'claude', 'codex', 'opencode') {
        $dir = Join-Path $parent "blockwelt-$agent"
        Start-Process powershell -WorkingDirectory $dir -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $dir 'run-agent.ps1'), $agent
    }
}
