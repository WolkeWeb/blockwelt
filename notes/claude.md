# Notizen: Claude Code

## Entscheidungen

### Phase 0
- **C0-1 Versionen:** jeweils die aktuelle stabile Version zum Zeitpunkt des Setups (Okt. 2026):
  TypeScript 7 (native `tsc`), Vite 8, Vitest 5, Playwright 1.64, three 0.186, simplex-noise 4.
  Die `package-lock.json` enthält die Windows-Binärpakete (rolldown, lightningcss, TypeScript), `npm ci` läuft also unter Windows.
- **C0-1 Vitest-Konfiguration** steckt mit in `vite.config.ts` (kein eigenes `vitest.config.ts`). Unit-Tests: `src/**/*.test.ts`,
  Umgebung `node` (wer DOM braucht, muss es selbst simulieren – kein jsdom, keine neuen Pakete).
- **C0-1 Chromium für Playwright** wird automatisch vor jedem `npm run e2e` installiert (`pree2e` → `scripts/ensure-browser.mjs`,
  nach dem ersten Mal sofort fertig). Ohne Internet kann man über die Umgebungsvariable `PW_CHROMIUM_PATH` einen
  vorhandenen Chromium angeben.
- **C0-1 E2E gegen den Produktions-Build:** Playwright startet `npm run build && npm run preview` (Port 4173),
  nicht den Dev-Server. So fallen auch Fehler im Build/`base`-Pfad auf. Chromium läuft mit SwiftShader-Flags,
  damit WebGL auch ohne Grafikkarte funktioniert.
- **C0-1 tsconfig:** `strict`, `verbatimModuleSyntax` (Typen also mit `import type` importieren), `noUncheckedIndexedAccess`
  bewusst aus (Voxel-Code mit vielen Array-Zugriffen bliebe sonst unlesbar).
- **Arbeitsweise Phase 0:** Phase 0 wurde in einer Linux-Umgebung erstellt und per Git-Bundle ins Windows-Repo übernommen.
  Alle Scripts sind trotzdem plattformunabhängig (kein `rm`, keine Umgebungsvariablen-Syntax in npm-Scripts).
- **C0-2** Jeder `src`-Ordner hat eine `index.ts` als einzigen öffentlichen Einstiegspunkt. Querverweise zwischen Bereichen
  laufen nur über `src/core/`; die Fabriken der Bereiche werden ausschließlich in `src/main.ts` zusammengesteckt.
  `docs/README.md` existiert nur, damit der Ordner im Git landet.

## Wünsche an die Verträge

## Ideen
