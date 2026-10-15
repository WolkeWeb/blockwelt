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
- **C0-3 Verträge** (Kurzfassung, Details als JSDoc in `src/core/`):
  - `BlockId` ist eine Zahl (kompakt in Chunks), `ItemId` ein Text (`snake_case`). Das Item eines Blocks heißt wie der Block (`BlockDef.name`).
  - Feste IDs der bekannten Blöcke stehen in `core/blocks.ts` (`BLOCK.GRASS` usw.), damit Codex (Generator) und
    OpenCode (Definitionen) parallel arbeiten können. Zusätzliche Blöcke ab ID 100.
  - Alle Definitionen sind reine Daten (Structured Clone), damit Codex sie an Web Worker schicken kann.
    `WorldOptions` bekommt deshalb `blocks` (Array) und das Atlas-*Layout* statt Registry/Bild.
  - Atlas-UVs: normiert, `v` wächst nach unten (Bildkoordinaten) → Renderer nutzt `flipY = false`.
  - Meshing gehört zur Welt (`ChunkMesh` mit Durchgängen opaque/cutout/translucent, Licht als eigenes Vertex-Attribut
    [Himmel, Block]); der Renderer zeigt die Meshes nur an. Positionen relativ zum Chunk-Ursprung.
  - `World.setBlock` auf nicht geladene Chunks merkt die Änderung vor → Spielstände lassen sich ohne Extra-API einspielen.
  - `World.getSurfaceHeight` und `onChunkLoaded` ergänzt (für den Spawn-Punkt in C9).
  - Physik: `stepPlayer` und `raycast` bekommen zusätzlich die Blockdefinitionen (`blocks`) als Parameter, weil sie
    `solid`/`shape` kennen müssen. Fallstrecke führt die Physik im `PlayerBody` (`fallDistance`) und meldet Landungen.
  - Yaw-Konvention: `yaw = 0` blickt nach Norden (−Z), positiv dreht nach links (wie three.js `rotation.y`).
  - Tageszeit: Tick 0 = Sonnenaufgang, 6000 = Mittag; Sonne geht im Osten (+X) auf. `skyLight` 0,2–1 als Faktor.
  - Renderer bekommt die Welt per `setWorld(world | null)` (Welt wechselt beim Laden, Renderer bleibt).
  - GameApi: Die **Spiellogik** wertet alle Tasten aus, auch E/Esc/F3, und führt `screen`. Die Oberfläche zeichnet nur
    den Zustand und ruft bei Klicks Aktionen auf. So gibt es kein doppeltes Umschalten.
  - Zustand ist ein unveränderlicher Schnappschuss; `change`-Event höchstens einmal pro Frame.
  - `createEventBus` liegt als kleiner gemeinsamer Baustein in `core/events.ts` (einzige Implementierung in `core/`
    außer winzigen Hilfsfunktionen wie `toChunkCoord`).
- **C0-4 Platzhalter:** Jeder Bereich exportiert seine Fabrik über `index.ts` mit dem Vertrags-Typ
  (`createRegistry`, `createTextureAtlas`, `createWorld`, `stepPlayer`/`raycast`, `createRenderer`, `createUi`).
  Die Implementierungen dahinter sind bewusst schlicht und dürfen in Phase 1 komplett ersetzt werden.
  - `data/`: fünf Blöcke + Luft, Block-Items automatisch, keine Rezepte. `buildRegistry` füllt ID-Lücken mit Platzhaltern.
  - `assets/`: `createTextureAtlas` liefert `null` (Atlas kommt mit O1) – alle zeichnen Farben.
  - `world/`: flache Welt (Gras auf Y 63), synchron, max. 4 Chunks pro `update`, Meshing mit Flächen-Culling.
  - `render/`: `MeshBasicMaterial` mit Vertex-Farben, Himmel als Hintergrundfarbe + Nebel, Helligkeit über `skyLight`.
  - `ui/`: nur Fadenkreuz.
  - `game/`: Stub mit Freiflug, Maus-Blick, Tasten E/F3/1–9/Mausrad, Tageszeit, Auswahlrahmen. Kein Abbauen, kein Speichern.
  - Tests anderer Bereiche bauen sich ihre Testdaten selbst (z. B. eigene `BlockDef`s), statt `src/data` zu importieren.

## Wünsche an die Verträge

## Ideen
