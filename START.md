# So startest du Blockwelt (Windows)

Alle Befehle in **PowerShell**. Am bequemsten im Windows Terminal (bei Windows 11 schon dabei).

## Einmalig vorbereiten

Installiert und eingeloggt sein müssen:
- **Git for Windows** (Claude Code braucht es) und **Node.js 22+**
- **GitHub CLI** (`gh auth login`)
- **Claude Code** (`claude`), **Codex CLI** (`codex`), **OpenCode** (`opencode`) – jeweils einmal starten und anmelden

Dann den Ordner `blockwelt` aus dem ZIP z. B. nach `C:\Users\<du>\dev\blockwelt` entpacken und dort:

```powershell
cd $HOME\dev\blockwelt
git init -b main
git add .
git commit -m "Aufgabenlisten"
gh repo create blockwelt --public --source . --push
```

Im Repo auf GitHub unter *Settings → Pages* als Quelle „GitHub Actions“ wählen.

> **Wichtig:** Die Agents laufen ohne Nachfragen. Unter Windows haben sie damit Zugriff auf dein ganzes
> Benutzerkonto, nicht nur auf den Projektordner. Sie sind angewiesen, nur im Projekt zu arbeiten, aber
> lass auf dem PC nichts offen, was nicht kaputtgehen darf. Wer auf Nummer sicher gehen will, nimmt
> einen eigenen Windows-Benutzer nur fürs Vibecoding.

## Phase 0 – Fundament (nur Claude Opus, ca. 1 Stunde)

```powershell
powershell -ExecutionPolicy Bypass -File .\run-agent.ps1 phase0
```

Wenn Claude fertig ist: `git push`. Unter `https://<dein-user>.github.io/blockwelt/` sollte eine flache
Platzhalter-Welt erscheinen.

## Phase 1 – alle drei gleichzeitig

```powershell
powershell -ExecutionPolicy Bypass -File .\phase1.ps1
powershell -ExecutionPolicy Bypass -File .\start-agents.ps1
```

Das erste Skript legt neben dem Projekt drei Arbeitskopien an (`blockwelt-claude`, `blockwelt-codex`,
`blockwelt-opencode`). Das zweite öffnet ein Terminal mit drei Tabs, in denen die Agents mit ihrem Auftrag starten:

| Tab      | Agent                     | Was du tust                                                    |
|----------|---------------------------|----------------------------------------------------------------|
| claude   | Claude Code mit Sonnet    | nichts                                                         |
| codex    | Codex (deine Standard-Einstellung) | nichts – am besten vorher in Codex das stärkste Modell mit hoher Reasoning-Stufe einstellen |
| opencode | OpenCode                  | günstiges Go-Modell wählen, dann **Strg+V** und **Enter** (der Prompt liegt in der Zwischenablage) |

Hört ein Agent zwischendurch auf oder ist ein Limit leer: nach dem Reset im Tab einfach **„weiter“**
schreiben. Er sieht an den Häkchen in seiner Aufgabenliste, wo er war.

## Phase 2 – Zusammenführen (Claude Opus)

Wenn alle drei Listen abgehakt sind (`[!]` zählt auch), im Hauptordner:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-agent.ps1 phase2
```

Danach ist das Spiel online, und in `tasks/` stehen die Listen für die nächste Runde.
Nächste Runde: wieder `phase1.ps1` und `start-agents.ps1` (die Arbeitskopien werden dabei neu angelegt –
also erst nach Phase 2 ausführen, sonst geht unfertige Arbeit verloren).

## Notbremse

- Ein Agent dreht durch: im Tab **Esc** bzw. **Strg+C**, dann neu anweisen.
- Ein Bereich ist kaputt: in der jeweiligen Arbeitskopie `git reset --hard main`.
- Was die Agents entschieden haben, steht in `notes\`.
- Codex macht unter Windows Probleme mit seiner Sandbox: Codex beenden und im Tab
  `codex --dangerously-bypass-approvals-and-sandbox "Arbeite tasks/codex.md komplett ab. Halte dich an AGENTS.md."` starten.
