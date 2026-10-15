# Startet einen Agent mit dem passenden Modell und Prompt im Ordner dieses Skripts.
# Beispiel:  powershell -ExecutionPolicy Bypass -File .\run-agent.ps1 phase0
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('phase0', 'claude', 'codex', 'opencode', 'phase2')]
    [string]$Agent
)

Set-Location $PSScriptRoot
$Host.UI.RawUI.WindowTitle = "Blockwelt – $Agent"

$ende = 'Halte dich an AGENTS.md. Hör erst auf, wenn alles abgehakt ist.'

switch ($Agent) {
    'phase0' {
        claude --model opus --dangerously-skip-permissions "Arbeite Phase 0 aus tasks/claude.md komplett ab. $ende"
    }
    'claude' {
        claude --model sonnet --dangerously-skip-permissions "Arbeite Phase 1 aus tasks/claude.md komplett ab. $ende"
    }
    'codex' {
        codex --full-auto "Arbeite tasks/codex.md komplett ab. $ende"
    }
    'opencode' {
        $prompt = "Arbeite tasks/opencode.md komplett ab. $ende"
        Set-Clipboard -Value $prompt
        Write-Host 'Der Prompt liegt in der Zwischenablage: in OpenCode Strg+V und Enter drücken.' -ForegroundColor Yellow
        Write-Host 'Vorher in OpenCode ein günstiges Modell aus OpenCode Go wählen.' -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        opencode
    }
    'phase2' {
        claude --model opus --dangerously-skip-permissions "Arbeite Phase 2 aus tasks/claude.md komplett ab. $ende"
    }
}
