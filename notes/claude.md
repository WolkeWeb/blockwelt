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
- **C0-5 main.ts:** Logik mit festem Akkumulator (20 TPS, max. 5 Ticks Nachholen pro Frame), Render per rAF mit
  Interpolationsanteil `alpha`. Maus-Blick wird pro Frame angewendet (flüssiger als pro Tick). Klick aufs Canvas →
  `game.onCanvasClick()` (Pointer-Lock), Lock verloren → Pause. In Phase 0 startet direkt eine Platzhalter-Welt
  (Seed 1, Kreativ), weil es noch kein Menü gibt. `window.__blockwelt.game` ist für Tests/Konsole zugänglich.
  FPS misst `main.ts` und gibt sie per `game.setFps` an die Debug-Werte weiter.
- **C0-5 Farben:** three.js-Farbmanagement im Platzhalter-Renderer aus (`ColorManagement.enabled = false`,
  `LinearSRGBColorSpace`), damit `BlockDef.color` so aussieht wie angegeben. Codex darf das beim echten Renderer anders lösen.
- **C0-5 Kleinkram:** leeres Favicon (`data:,`) in `index.html`, sonst meldet der Browser einen 404-Fehler in der Konsole;
  `chunkSizeWarningLimit` 1500 kB wegen three.js.
- **C0-6 Smoketest** (`e2e/smoke.spec.ts`): wartet, bis `screen === 'playing'` und Chunks mit Dreiecken gezeichnet sind,
  speichert `test-results/smoke.png` und prüft die Pixel (oben Himmel ≠ unten Boden). Dafür gibt es einen kleinen
  PNG-Decoder in `e2e/png.ts` (Node-`zlib`, kein neues Paket). Jeder `console.error` und jede unbehandelte Ausnahme
  lässt den Test fehlschlagen.
- **C0-7 Deploy:** ein Workflow `.github/workflows/deploy.yml`: Job `check` (`npm ci`, `npm run check`, bei Push auf `main`
  zusätzlich `dist/` als Pages-Artefakt hochladen) → Job `deploy` (nur Push auf `main`). Pull Requests werden nur geprüft.
  E2E läuft (noch) nicht in CI, wie in der Aufgabe festgelegt. `base: '/blockwelt/'` gilt auch für Dev-Server und Preview,
  damit lokal und online dieselben Pfade gelten → lokal `http://localhost:5173/blockwelt/`.
- **C0-8 Abschluss:** `npm run check` (7 Testdateien, 23 Tests, Build) und `npm run e2e` grün, geprüft auch mit frischem
  Klon + `npm ci`. Die E2E-Tests liefen in der Linux-Umgebung mit vorinstalliertem Chromium (`PW_CHROMIUM_PATH`);
  unter Windows lädt der erste `npm run e2e` Chromium automatisch herunter.

### Phase 1
- **Aufbau `src/game/`:** `game.ts` ist nur der Dirigent (Tick, Eingaben, Zustand, Ereignisse). Alle Regeln stecken in reinen,
  getesteten Modulen: `movement`, `tools`, `building`, `inventory`, `container`, `crafting`, `vitals`, `time`, `spawn`.
- **C1 Steuerung:** Sprint mit Strg + W oder zweimal schnell W (6 Ticks); endet beim Loslassen von W oder Schleichen.
  Schleichen-an-der-Kante ist Sache von `stepPlayer` (Vertrag), die Spiellogik gibt nur `sneak` weiter.
  Maus-Blick wird pro Frame angewendet. `Input` kennt jetzt auch Maustasten (links gehalten = abbauen, rechts = setzen).
- **C2 Abbauen:** Abbauzeit = Härte × 1,5 s; mit passendem Werkzeug geteilt durch `ToolDef.speed`; ohne nötiges Werkzeug
  (`requiredToolLevel` nicht erfüllt) Härte × 5 s und kein Drop. Hand auf Stein: 7,5 s. Härte < 0 = nie, Härte 0 und Kreativ = sofort
  (mit 5 Ticks Pause zwischen zwei Blöcken bei gehaltener Taste). Drops landen direkt im Inventar (es gibt keine Item-Entities);
  passt etwas nicht mehr hinein, geht es verloren. Setzen: nur an `hit.place`, nur in ersetzbare Zellen, feste Blöcke nicht in die
  eigene Hitbox; Rechtsklick auf eine Werkbank öffnet sie (Shift + Rechtsklick setzt stattdessen einen Block).
- **C3 Inventar:** 36 Slots (0–8 Hotbar). Linksklick nimmt/legt/legt zusammen/tauscht, Rechtsklick halbiert bzw. legt eins ab,
  Shift-Klick verschiebt Hotbar ↔ Hauptinventar bzw. Raster → Inventar. Beim Schließen von Inventar/Werkbank wandern Raster und
  Mauszeiger ins Inventar (Überlauf geht verloren, mit Meldung). Werkzeuge mit Haltbarkeit stapeln nie.
- **C4 Crafting:** Rezept-Suche über den belegten Rahmen des Rasters (verschiebbar), waagerecht gespiegelt erlaubt; im Raster darf
  nichts außer den Zutaten liegen. Klick aufs Ergebnis → Mauszeiger (ein Craft), Shift-Klick/`craft('all')` → so oft wie Platz im Inventar ist.
- **C5 Werkzeuge:** Verschleiß 1 pro abgebautem Block (Schwert 2, Blöcke mit Härte 0 kosten nichts, Kreativ nichts). Kaputte
  Werkzeuge verschwinden (`toolBroken`). Fehlendes `durability` heißt neu.
- **C6 Tag/Nacht:** Zeit läuft nur bei `playing`/`inventory`/`workbench` (nicht in Pause, Menü, Tod). Pro Frame wird zwischen
  den Ticks weitergerechnet (`totalTicks + alpha`) – dadurch ruckelt der Himmel nicht. Neue Welten starten bei Tick 3000 (Vormittag).
- **C7 Modi:** Kreativ: Doppel-Leertaste schaltet Fliegen um (kein automatisches Ende bei Landung), unendliche Blöcke, kein Drop,
  kein Schaden; neue Kreativ-Welten bekommen eine Hotbar mit Grundblöcken. Überleben: Fallschaden ab 4 Blöcken
  (`ceil(Fall − 3)` halbe Herzen), Luft 300 Ticks, danach alle 20 Ticks 2 Schaden, Heilung 1 halbes Herz pro 4 s, Sturz unter Y = −20
  tötet (Kreativ: zurück zum Spawn). Tod → Bildschirm `dead`, Inventar bleibt erhalten, Respawn am Spawn-Punkt mit vollem Leben.
- **C8 Speichern:** `src/save/`, Datenbank `blockwelt` (Stores `worlds`, `players`, `chunks`, `meta`). Pro Chunk werden nur vom Spieler
  veränderte Zellen gespeichert (Index + Block); beim Laden spielt die Spiellogik sie über `world.setBlock` ein (der Vertrag merkt
  Änderungen für ungeladene Chunks vor). Autosave alle 30 s, beim Verlassen der Welt und bei `visibilitychange`/`pagehide` (in `main.ts`).
  Ohne IndexedDB (z. B. privates Fenster) fällt `createSaveStore()` auf einen Speicher im Arbeitsspeicher zurück (mit Warnung).
  Einstellungen liegen im Store `meta`.
- **C9 GameApi / Spawn:** Beim Start einer Welt ist der Bildschirm `loading`, bis die Chunks um den Startpunkt da sind (höchstens
  20 s). Spawn = nächster Platz ab (8, 8), der über dem Meeresspiegel liegt, undurchsichtigen festen Boden hat (keine Blätter/Wasser)
  und zwei freie Blöcke darüber. `createWorld` in der GameApi gibt die `WorldInfo` sofort zurück, die Welt ist erst nach `worldLoaded` spielbereit.
- **main.ts:** Solange die Oberfläche kein Menü hat, startet `main.ts` automatisch die Welt „Platzhalter-Welt“ (laden oder neu anlegen,
  Kreativ, Seed 1). Mit `?menu` in der Adresse unterbleibt das. **Für Phase 2:** diesen Autostart entfernen, sobald das Menü der
  Oberfläche verdrahtet ist.

## Wünsche an die Verträge
- (keine zwingenden) `World.setBlock` könnte mitteilen, ob der Chunk geladen war – dann ließe sich ein Echo-Event beim Einspielen
  gespeicherter Änderungen vermeiden. Aktuell harmlos (gleiche Werte werden nur erneut vorgemerkt).

## Ideen
