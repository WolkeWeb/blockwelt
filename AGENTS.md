# Blockwelt – gemeinsame Regeln für alle Agents

Projekt: ein Minecraft-ähnliches Voxel-Spiel im Browser.
Stack: TypeScript (strict), Vite, Three.js, simplex-noise, Vitest, Playwright.

Drei Agents arbeiten **gleichzeitig**, jeder in einem eigenen Git-Worktree auf einem eigenen Branch.
Damit es beim Zusammenführen keine Konflikte gibt, gehört jeder Ordner genau einem Agent.

## Wer darf was?

| Agent       | Branch     | Aufgabenliste       | Darf ändern                                   |
|-------------|------------|---------------------|-----------------------------------------------|
| Claude Code | `claude`   | `tasks/claude.md`   | `src/game/`, `src/save/`, `src/main.ts`       |
| Codex       | `codex`    | `tasks/codex.md`    | `src/world/`, `src/physics/`, `src/render/`   |
| OpenCode    | `opencode` | `tasks/opencode.md` | `src/ui/`, `src/data/`, `src/assets/`, `docs/` |

Gesperrt in Phase 1 (nur Claude in Phase 0 und Phase 2):
`src/core/` (die Verträge), `package.json`, `vite.config.ts`, `tsconfig.json`, `.github/`.

Jeder Agent hat eine eigene Notizdatei: `notes/claude.md`, `notes/codex.md`, `notes/opencode.md`.

## Regeln

1. **Nur in deinen eigenen Ordnern arbeiten.** Tests für deinen Code (`*.test.ts`) liegen ebenfalls dort.
2. **`src/core/` nie ändern.** Fehlt dir dort etwas, trag es in deiner Notizdatei unter
   „Wünsche an die Verträge“ ein und arbeite mit einer lokalen Lösung in deinem Ordner weiter.
3. **Keine neuen npm-Pakete.** Alles Nötige ist in Phase 0 installiert.
4. **Aufgaben strikt der Reihe nach.** Nach jeder Aufgabe:
   `npm run check` muss grün sein → Checkbox in deiner Aufgabenliste abhaken (`[x]`) →
   committen mit der Nachricht `<ID>: <Titel>` (z. B. `X3: Höhlen und Erzadern`).
5. **Keine Rückfragen.** Bei Unklarheiten sinnvoll entscheiden und die Entscheidung in deiner Notizdatei festhalten.
6. **Festgefahren?** Nach drei erfolglosen Anläufen die Aufgabe mit `[!]` markieren, den Grund in die Notizdatei schreiben, mit der nächsten weitermachen.
7. **Keine Original-Minecraft-Inhalte:** keine Texturen, Sounds, Logos oder Markennamen. Texturen werden prozedural erzeugt.
8. **Keine Zusatzfeatures** außerhalb deiner Liste. Ideen gehören in die Notizdatei.
9. **Wenn alle Aufgaben abgehakt sind: aufhören.**

## Technische Eckdaten (gelten für alle)

- Koordinaten: Y ist oben, Blöcke liegen auf ganzzahligen Koordinaten, 1 Einheit = 1 Block.
- Chunks: 16 × 16 Blöcke Grundfläche, 128 Blöcke hoch. Wasserspiegel auf Höhe 62.
- Logik läuft mit festen 20 Ticks pro Sekunde, gerendert wird per `requestAnimationFrame`.
- Ein Tag dauert 20 Minuten Echtzeit.
- Spieler-Hitbox 0,6 × 1,8 × 0,6, Augenhöhe 1,62, Reichweite 5 Blöcke.
- Ziel: 60 FPS bei Sichtweite 8 Chunks auf einem normalen Laptop.
- Entwickelt wird auf **Windows (PowerShell)**. Shell-Befehle müssen dort funktionieren; keine bash-Skripte,
  npm-Scripts plattformunabhängig, Pfade nie fest mit `/` oder `\` zusammenbauen (Node `path` nutzen).
- Die einzige Schnittstelle zwischen den Bereichen sind die Verträge in `src/core/`.
  Jeder Bereich exportiert über seine `index.ts` genau das, was der Vertrag verlangt.
