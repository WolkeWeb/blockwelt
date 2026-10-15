# Aufgaben: Claude Code

Diese Liste hat drei Phasen. Arbeite immer nur die Phase ab, die im Startprompt genannt wird.

---

## Phase 0 – Fundament
**Modell: Opus. Branch: `main`. Läuft ALLEIN, bevor die anderen starten.**

Ziel: ein lauffähiges Grundgerüst mit klaren Verträgen, gegen die Codex und OpenCode
ohne Rückfrage bauen können. Jeder Bereich bekommt eine einfache, funktionierende Platzhalter-Implementierung.

- [x] C0-1 Projekt-Setup: Vite + TypeScript strict + three + simplex-noise + Vitest + Playwright (Chromium installieren).
      Scripts: `dev`, `build`, `test`, `e2e`, `check` (= `tsc --noEmit && vitest run && vite build`). `.gitignore` anlegen. Alle Scripts müssen unter Windows in PowerShell laufen.
- [x] C0-2 Ordnerstruktur aus AGENTS.md anlegen: `src/core, game, save, world, physics, render, ui, data, assets`,
      dazu `docs/`, `notes/` (mit je einer Notizdatei pro Agent, Abschnitte „Entscheidungen“, „Wünsche an die Verträge“, „Ideen“).
      Jeder `src`-Ordner hat eine `index.ts`.
- [x] C0-3 Verträge in `src/core/`, ausführlich mit JSDoc kommentiert:
      - `types.ts`: Vec3, BlockId, ItemId, ItemStack, Face, GameMode
      - `registry.ts`: BlockDef (Härte, Transparenz, Lichtstärke, Drop, Textur-Namen je Seite, bevorzugtes Werkzeug),
        ItemDef, Recipe (geformt/formlos, 2×2/3×3), Registry-Interface, Textur-Atlas-Format (Name → UV-Rechteck)
      - `world.ts`: World-Interface (getBlock, setBlock, isLoaded, update(spielerPosition, sichtweite),
        onBlockChanged, seed), Fabrik `createWorld(options)`
      - `physics.ts`: PlayerBody (Position, Geschwindigkeit, onGround, inWater), `stepPlayer(...)`,
        `raycast(world, origin, dir, maxDist)` → Block + getroffene Fläche
      - `render.ts`: Renderer-Interface (attach(canvas), render(kamera, zeitInfo), setRenderDistance,
        setSelection(block | null), setBreakProgress(0..1))
      - `game.ts`: GameApi für die Oberfläche: Zustand (Inventar, Hotbar-Auswahl, Leben, Luft, Modus, Tageszeit,
        Abbau-Fortschritt, offener Bildschirm) + Aktionen (Slot klicken/verschieben, craften, Welt starten/laden,
        Pause, Einstellungen) + typisierter Event-Bus
- [x] C0-4 Platzhalter-Implementierungen, alles lauffähig:
      `world/` flache Welt mit einfachem Meshing (eine Farbe pro Block), `physics/` freies Fliegen ohne Kollision
      plus einfacher Raycast, `render/` Grundszene, `ui/` nur ein Fadenkreuz,
      `data/` fünf Blöcke (Gras, Erde, Stein, Holzstamm, Blätter) ohne Texturen, `game/` minimaler GameApi-Stub.
- [x] C0-5 `main.ts` verdrahtet alles: Szene, Kamera, Pointer-Lock, Logik-Tick (20 TPS), Render-Loop.
- [x] C0-6 Playwright-Smoketest: Seite lädt, Canvas rendert, keine Console-Errors, Screenshot nach `test-results/`.
- [x] C0-7 GitHub-Actions-Workflow: Push auf `main` → `npm run check` → Deploy auf GitHub Pages
      (`base` in vite.config passend zum Repo-Namen `blockwelt`).
- [x] C0-8 `npm run check` und `npm run e2e` grün. Alles auf `main` committen. Dann STOPPEN.

---

## Phase 1 – Spiellogik
**Modell: Sonnet. Branch: `claude`. Läuft parallel zu Codex und OpenCode.**
Ordner: `src/game/`, `src/save/`, `src/main.ts`.
Nutze die anderen Bereiche ausschließlich über die Verträge in `src/core/`.

- [x] C1 Spieler-Steuerung: WASD, Maus, Springen, Sprinten (Strg/Doppel-W), Schleichen (Shift, nicht von Kanten fallen).
      Nutzt `stepPlayer` aus dem Physik-Vertrag.
- [x] C2 Blöcke abbauen: Abbauzeit abhängig von Härte und Werkzeug, Fortschritt an Renderer und Oberfläche melden,
      Drop landet im Inventar. Blöcke setzen: nicht in die eigene Hitbox, nur an die getroffene Fläche.
- [x] C3 Inventar-Modell: 27 Slots + 9 Hotbar, Stapel bis 64 (Werkzeuge 1), Hotbar-Auswahl per Mausrad und 1–9,
      Slots tauschen/teilen/zusammenlegen, Rechtsklick-Verhalten wie gewohnt. Unit-Tests.
- [x] C4 Crafting-Logik: 2×2 und 3×3, geformte und formlose Rezepte, Rezepte verschiebbar im Raster,
      gespiegelte Rezepte erlaubt, liest Rezepte aus der Registry. Unit-Tests.
- [x] C5 Werkzeuge: Haltbarkeit, Abbau-Bonus je Material, manche Blöcke droppen nur mit passendem Werkzeug.
- [x] C6 Tag/Nacht-Zyklus: Tageszeit als Zustand, Sonnenwinkel und Himmelslicht für den Renderer bereitstellen.
- [ ] C7 Spielmodi: Kreativ (fliegen per Doppel-Leertaste, unendliche Blöcke, sofortiges Abbauen)
      und Überleben (Leben, Fallschaden ab 4 Blöcken, Ertrinken, Respawn).
- [ ] C8 Speichern/Laden in IndexedDB: Weltliste, nur veränderte Blöcke/Chunks speichern, Spielerzustand, Autosave alle 30 s.
- [ ] C9 GameApi vollständig implementieren, sodass die Oberfläche (OpenCode) nur darüber arbeitet.
      Spawn-Punkt: sicherer Platz an der Oberfläche über dem Wasser.

---

## Phase 2 – Zusammenführen
**Modell: Opus. Branch: `main`. Erst starten, wenn alle drei Listen erledigt sind.**

- [ ] C2-1 Branches nacheinander nach `main` mergen: `codex`, dann `claude`, dann `opencode`. Konflikte sauber lösen.
- [ ] C2-2 Platzhalter entfernen, die jetzt überflüssig sind; alles richtig verdrahten.
- [ ] C2-3 `npm run check` und `npm run e2e`. Einen Playwright-Test ergänzen, der 60 Sekunden spielt
      (Welt erzeugen, laufen, Block abbauen, Block setzen, Inventar öffnen) und Screenshots macht.
      Screenshots ansehen, gefundene Fehler beheben.
- [ ] C2-4 Alle Dateien in `notes/` lesen, sinnvolle Vertragswünsche umsetzen, `[!]`-Aufgaben prüfen.
- [ ] C2-5 Kurzen Bericht `docs/RUNDE.md` schreiben: was funktioniert, was nicht, bekannte Fehler.
- [ ] C2-6 Neue Aufgabenlisten für die nächste Runde in `tasks/` schreiben – gleiches Format, gleiche Ordner-Zuständigkeiten,
      schwere Engine-Aufgaben an Codex, kleine klare Aufgaben an OpenCode. Offene Fehler zuerst.
      Kandidaten: Tiere und Monster, fließendes Wasser, Biome, Öfen/Schmelzen, Truhen, Sounds (prozedural), Partikel.
- [ ] C2-7 Notizdateien leeren, alles auf `main` committen und pushen (löst den Deploy aus). Dann STOPPEN.
