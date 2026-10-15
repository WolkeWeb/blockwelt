# Runde 1 – Bericht

Stand: 15.10.2026, nach Phase 2 (Zusammenführen auf `main`).
Geprüft mit `npm run check` (35 Testdateien, 181 Unit-Tests, Build) und `npm run e2e` (3 Browser-Tests,
darunter ein 60-Sekunden-Spieltest mit Screenshots in `test-results/`).

## Was funktioniert

Das Spiel ist im Browser spielbar: Titelbildschirm → Weltauswahl → neue Welt (Name, Seed, Modus) → Welt lädt
in wenigen Sekunden → laufen, springen, schwimmen, abbauen, bauen, Inventar und Werkbank benutzen, speichern.

| Bereich | Stand |
|---|---|
| Welt (Codex) | Terrain mit Hügeln, Bergen, Stränden und Meer, Bäume über Chunk-Grenzen, Höhlen, Kohle- und Eisenerz. Chunks laden und entladen in Web Workern, näheste zuerst. |
| Darstellung (Codex) | Textur-Atlas, Ambient Occlusion, Sonnen- und Fackellicht (Flood-Fill), Wasser/Blätter/Glas in eigenen Durchgängen, Himmel mit Tageszeiten, Sonne, Mond, Sternen und Wolken, Auswahlrahmen und 10 Rissstufen, Frustum-Culling. |
| Physik (Codex) | AABB-Kollision, Sprung ≈ 1,25 Blöcke, Schwimmen, Schleichen ohne Absturz an Kanten, exakter DDA-Raycast. |
| Spiellogik (Claude) | Steuerung inkl. Sprinten und Schleichen, Abbauzeiten nach Härte und Werkzeug, Drops ins Inventar, Setzen mit Hitbox-Prüfung, Inventar (36 Slots, Klick/Rechtsklick/Shift), Crafting 2×2 und 3×3 (verschiebbar, gespiegelt), Werkzeug-Haltbarkeit, Tag/Nacht, Kreativ (Fliegen per Doppel-Leertaste) und Überleben (Fallschaden, Ertrinken, Tod, Respawn), Speichern in IndexedDB (nur Änderungen, Autosave alle 30 s). |
| Oberfläche und Inhalte (OpenCode) | Prozedurale Texturen für alle Blöcke und Items, 17 Blöcke, Werkzeuge aus Holz und Stein, Rezepte, Hotbar mit Haltbarkeitsbalken, Herzen, Luftblasen, F3-Debug, Inventar, Werkbank, alle Menüs, Doku in `docs/STEUERUNG.md` und `docs/BLOECKE.md`. |

## Kritische Prüfung der Branches

Alle drei Branches hatten alle Aufgaben abgehakt, Merges ohne Konflikte, `npm run check` sofort grün.
Erst das Spielen im Browser (Playwright mit Screenshots) zeigte, was nicht stimmte:

- **claude** (schnell fertig, aber im Kern vollständig): Alle Regeln sind in kleine, getestete Module aufgeteilt.
  Schwachstellen: `src/game/game.ts` (rund 900 Zeilen, verdrahtet alles) hat **keinen einzigen Unit-Test**;
  der Atlas wurde nie an die Welt übergeben (`atlas: null`); Muster mit Leerzeichen am Rand (`' S '`) hätten nie gepasst;
  Respawn ging auch aus dem Pausenmenü; ein kurzer Klick zum Abbauen ging bei niedriger Bildrate verloren.
  Behoben in Phase 2. Offen: Sprinten mit `Strg` kollidiert mit `Strg + W` (Tab schließen) – siehe Fehlerliste.
- **codex** (fachlich stark, Performance gemessen): Der Renderer drehte die Kamera mit dem **falschen
  Pitch-Vorzeichen** – wer nach unten sah, sah nach oben, Auswahlrahmen und Fadenkreuz passten nicht zusammen.
  Die Unit-Tests konnten das nicht finden, weil sie Renderer und Spiellogik nie zusammen prüfen. Außerdem
  wurden Sterne vor dem Gelände gezeichnet, Wolken leuchteten nachts, Fackeln waren volle Würfel, Unterwasser-Nebel
  kaum sichtbar. Alles behoben, dazu ein Test, der Kamera und `directionFromAngles` vergleicht.
- **opencode** (O6/O7 nur halb fertig): Das **2×2- und 3×3-Crafting-Raster wurde als eine Spalte** angezeigt
  (CSS fehlte) – geformte Rezepte waren damit praktisch nicht legbar. Außerdem blieb das Item-Symbol am Mauszeiger
  nach dem Schließen des Inventars stehen. Beides behoben, der Spieltest prüft jetzt das Raster.

Platzhalter entfernt: Der Autostart der „Platzhalter-Welt“ in `main.ts` ist weg, das Spiel startet im Menü.

## Was (noch) nicht funktioniert / bekannte Fehler

1. **`Strg` + `W` schließt den Browser-Tab**, wenn man `Strg` zuerst drückt. Sprinten deshalb erst `W`, dann `Strg`
   (steht in STEUERUNG.md). Abhilfe kommt in Runde 2 (C10).
2. **Fackeln** lassen sich überall setzen: in die Luft an jede Seitenfläche, an die Unterseite, auf andere Fackeln;
   sie bleiben stehen, wenn der Block darunter verschwindet.
3. **Bei niedriger Bildrate** (unter ca. 15 FPS) kann ein kurzer Rechtsklick zwei Blöcke setzen
   (mehrere Ticks pro Frame bei gehaltener Taste).
4. **Keine Item-Drops in der Welt:** Abgebautes wandert direkt ins Inventar; ist es voll, geht der Drop verloren.
5. **Eisenerz** droppt sich selbst, es gibt noch keinen Ofen und kein Eisen.
6. **Leistung im echten Spiel nicht gemessen.** Codex hat 60 FPS bei Sichtweite 8 auf einer eigenen Benchmark-Seite
   gemessen (Intel-Laptop). In den Tests hier läuft Chromium mit Software-Rendering (3–10 FPS) – das sagt nichts
   über echte Hardware. Die erste Welt braucht einige Sekunden, bis alle 197 Chunks geladen sind.
7. `src/game/game.ts` hat keine eigenen Unit-Tests (nur über die Browser-Tests abgedeckt).
8. Benchmark-Rohdaten und Bilder (rund 700 kB PNG) liegen in `src/render/` statt außerhalb des Quellcodes.
9. Kleinigkeiten: Kohle-Symbol auf dunklem Slot kaum erkennbar; Wolken sind große flache Quader; der Ladebildschirm
   zeigt keinen Fortschritt; E2E-Tests laufen noch nicht in GitHub Actions.

## Vorbereitet für Runde 2 (Verträge in `src/core/` erweitert)

- Neue Block-IDs: `FURNACE` (17), `CHEST` (18), `SNOW` (19), `SANDSTONE` (20), `FLOWING_WATER` (21) – vorerst mit
  schlichten Definitionen ohne Textur.
- `ItemDef.fuelSeconds`, `SmeltingRecipe`, `Registry.smelting`.
- Bildschirme `furnace` und `chest`, Slot-Bereich `container`, `GameState.container` (`BlockContainerState`).
- `Settings.volume`, Ereignisse `footstep` und `smelted`, `GameState.pointerLocked`.
- `Renderer.spawnBlockParticles(position, block)` (zurzeit ohne Wirkung).

**Bewusst noch nicht:** Tiere und Monster. Dafür braucht es einen eigenen Entity-Vertrag (Zustand, Bewegung,
Darstellung, Schaden), der alle drei Bereiche berührt. Er wird in Phase 2 von Runde 2 vorbereitet, wenn
Wasser, Biome und Öfen stehen.

## Notizen der Agents

Die Notizdateien in `notes/` sind für Runde 2 geleert. Die Entscheidungen aus Runde 1 (u. a. die Begründungen der
Verträge aus Phase 0 und die Performance-Messung von Codex) stehen in der Git-Historie:
`git show 607a91c:notes/claude.md`, `…:notes/codex.md`, `…:notes/opencode.md`.

## Wie geprüft wurde

- `npm run check` – TypeScript, 181 Unit-Tests, Produktions-Build.
- `npm run e2e` (Produktions-Build, Chromium mit SwiftShader):
  - `smoke.spec.ts`: Welt über das Menü, Canvas zeigt Himmel und Boden, keine Konsolenfehler;
    Spielstand (abgebauter Block, Position) übersteht ein Neuladen der Seite.
  - `playtest.spec.ts`: 60 Sekunden spielen nur mit Maus und Tastatur – laufen, umsehen, abbauen (Risse sichtbar,
    Drop im Inventar), bauen, Inventar öffnen und ein Item ins 2×2-Raster legen, Pause, F3.
    Screenshots `test-results/spiel-01-titel.png` bis `spiel-10-debug.png`.
- Zusätzlich von Hand per Skript geprüft (nicht als Test eingecheckt): Crafting-Kette Stamm → Bretter → Werkbank →
  Werkbank setzen und öffnen, Kreativmodus mit Fliegen, Nacht mit Fackeln, Schwimmen, Ertrinken, Fallschaden,
  Tod und Respawn, Speichern und Laden über die Weltliste.
