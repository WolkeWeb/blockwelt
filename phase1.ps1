# Legt für jeden Agent eine eigene Arbeitskopie (Git-Worktree) auf einem eigenen Branch an.
# Bei erneutem Aufruf (nächste Runde) werden alte Arbeitskopien und Branches ersetzt.
# Aufruf im Hauptordner:  powershell -ExecutionPolicy Bypass -File .\phase1.ps1

Set-Location $PSScriptRoot

function Assert-Ok($was) {
    if ($LASTEXITCODE -ne 0) { Write-Host "Fehler bei: $was" -ForegroundColor Red; exit 1 }
}

if ((git branch --show-current) -ne 'main') {
    Write-Host 'Bitte im Hauptordner auf Branch main ausführen.' -ForegroundColor Red
    exit 1
}

$parent = Split-Path $PSScriptRoot -Parent

foreach ($agent in 'claude', 'codex', 'opencode') {
    $dir = Join-Path $parent "blockwelt-$agent"

    if (Test-Path $dir) {
        git worktree remove --force "$dir"; Assert-Ok "Arbeitskopie $agent entfernen"
    }
    git show-ref --verify --quiet "refs/heads/$agent"
    if ($LASTEXITCODE -eq 0) {
        git branch -D $agent | Out-Null; Assert-Ok "Branch $agent löschen"
    }

    git worktree add -b $agent "$dir" main; Assert-Ok "Arbeitskopie $agent anlegen"
    Push-Location $dir
    npm ci --silent; Assert-Ok "npm ci für $agent"
    Pop-Location

    Write-Host "OK  $agent bereit in $dir" -ForegroundColor Green
}

Write-Host ''
Write-Host 'Jetzt die Agents starten:  powershell -ExecutionPolicy Bypass -File .\start-agents.ps1'
