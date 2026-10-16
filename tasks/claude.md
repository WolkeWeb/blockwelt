# Aufgaben: Claude Code

Diese Liste hat drei Phasen. Arbeite immer nur die Phase ab, die im Startprompt genannt wird.
Stand der letzten Runde und bekannte Fehler: `docs/RUNDE.md`.

---

## Phase 0 – Fundament
**Erledigt in Runde 1** (Projekt-Setup, Verträge in `src/core/`, Platzhalter, `main.ts`, Smoketest, Deploy-Workflow).
Nicht erneut ausführen.

---

## Phase 1 – Spiellogik (Runde 2)
**Modell: Sonnet. Branch: `claude`. Läuft parallel zu Codex und OpenCode.**
Ordner: `src/game/`, `src/save/`, `src/main.ts`.
Nutze die anderen Bereiche ausschließlich über die Verträge in `src/core/`. Die Verträge für Runde 2 stehen schon dort –
lies sie zuerst: `KeyBindings`/`DEFAULT_KEY_BINDINGS`/`RESERVED_KEY_CODES`, `Settings.volume`/`viewBobbing`/`keys`,
`GameState.food`/`maxFood`/`eatProgress`, `ItemDef.food`, `HeldItemView` mit `Renderer.setHeldItem`,
`Renderer.spawnBlockParticles`, Ofen/Truhe (`container`-Slots, `BlockContainerState`), Ereignisse `footstep`, `swing`,
`ate`, `smelted`. Wo dort heute Platzhalter stehen (z. B. `food: 20` in `game.ts`), ersetzt du sie.

**Fertig heißt:** `npm run check` grün **und** `npm run e2e` grün. Jede Regel bekommt Unit-Tests. Eine Aufgabe ist erst
abgehakt, wenn alles darin Verlangte umgesetzt ist – lieber `[!]` mit Begründung als ein halbes `[x]`.
Andere Bereiche liefern parallel: Codex zeichnet Hand und Partikel, OpenCode baut Tastenbelegungs-Bildschirm,
Hunger-Anzeige, Geräusche und Nahrung. Du lieferst die Daten über die GameApi und die Renderer-Aufrufe – auch wenn
die Gegenstücke auf deinem Branch noch Platzhalter sind.

Fehler und was sich falsch anfühlt zuerst:

- [ ] C10 Tastenbelegung statt Strg-Sprint: Alle Bewegungstasten und `E` aus `settings.keys` lesen (nicht mehr fest im
      Code). Sprinten = Taste `keys.sprint` halten (Standard `KeyR`) oder zweimal schnell vorwärts; **Strg spielt keine
      Rolle mehr**. `updateSettings({ keys })` prüft die Belegung: unbekannte Aktionen ignorieren, fehlende Aktionen
      behalten ihre bisherige Taste; enthält die neue Belegung eine Taste aus `RESERVED_KEY_CODES` oder eine doppelt
      vergebene Taste, wird die Änderung der Belegung ganz verworfen (Meldung über das Ereignis `message`), die
      bisherige bleibt. Beim Laden wird eine ungültige gespeicherte Belegung ganz durch den Standard ersetzt
      (das Tauschen bei Doppelbelegung macht die Oberfläche). `viewBobbing` und `volume`
      laden, begrenzen, speichern; alte gespeicherte Einstellungen ohne diese Felder laden sauber mit Standardwerten.
      Unit-Tests für Prüfung und Auswertung (z. B. Belegung `forward = KeyI` → `I` läuft vorwärts, `W` nicht mehr).
- [ ] C11 Eingabe bei niedriger Bildrate: Ein Rechtsklick setzt genau einen Block, auch wenn in einem Frame mehrere Ticks
      laufen (gehaltene Taste: Wiederholung erst nach 5 Ticks, gezählt in Ticks, nicht in Frames). Gleiches für das
      Abbauen im Kreativmodus. Unit-Tests mit simulierten Ticks.
- [ ] C12 Fackel-Regeln: Fackeln nur auf die Oberseite fester, undurchsichtiger Blöcke setzen (nicht an Seiten,
      Unterseiten, andere Fackeln, Blätter, Glas). Verschwindet der Block darunter, fällt die Fackel ab und landet
      als Drop im Inventar. Unit-Tests.
- [ ] C13 Spawn nie im Wasser: Der Spawn-Punkt liegt nie im Wasser und nie unter Blättern; gibt es im Umkreis keinen
      sicheren Platz, wird weiter gesucht (bis 256 Blöcke) statt über dem Meer abzusetzen. Unit-Tests mit Fake-Welten.
- [ ] C14 `src/game/game.ts` testbar machen: `Input` so schneiden, dass sich Eingaben ohne DOM einspeisen lassen
      (z. B. eine kleine Eingabe-Schnittstelle, die `main.ts` mit echten Events füttert). Unit-Tests für die GameApi
      mit Fake-Welt, Fake-Renderer und Speicher im Arbeitsspeicher: Welt anlegen → `playing`, Block abbauen (Drop im
      Inventar), Block setzen, Inventar schließen (Raster und Mauszeiger zurück ins Inventar), Tod → Respawn,
      Speichern und Laden. Spätere Aufgaben dieser Liste testen damit auch das Zusammenspiel.
- [ ] C15 Laufgefühl: Bewegungsanimation – beim Gehen am Boden schwingt die Kamera leicht auf und ab und seitlich
      (Augenposition um wenige Hundertstel Blöcke versetzt, Phase aus der gelaufenen Strecke, weich ein- und auslaufend),
      nicht im Stand, beim Fliegen, Schwimmen oder bei `settings.viewBobbing = false`. Beim Sprinten wird das
      Sichtfeld weich um ca. 10 % weiter, beim Landen nach einem Sprung sackt die Kamera kurz ein. Ereignis `footstep`
      (Block unter den Füßen) ca. alle 0,4 s beim Gehen, beim Sprinten öfter, nicht beim Schleichen, Fliegen, Schwimmen.
      Die Rechnung steckt in einem reinen, getesteten Modul.
- [ ] C16 Hand und gehaltenes Item: Vor jedem `render` `renderer.setHeldItem(view)` aufrufen (`HeldItemView`, zwischen
      Ticks interpoliert): `item` aus dem gewählten Hotbar-Slot (`null` = leere Hand), `swing` läuft beim Abbauen in
      Schleife (ca. 6 Ticks pro Schlag) und einmal beim Setzen, beim Rechtsklick auf Werkbank/Truhe/Ofen und beim
      Linksklick ins Leere; `equip` springt beim Wechsel des Slots oder Items auf 1 und läuft in ca. 5 Ticks auf 0;
      `bobPhase`/`bobAmount` wie die Bewegungsanimation aus C15; `light` aus `time.day.skyLight` (mindestens 0,2).
      Ereignis `swing` bei jedem Schlag. Reines, getestetes Modul für den Animationszustand.
- [ ] C17 Hunger und Essen (nur Überleben): `food` 0–20 mit versteckter Sättigungsreserve. Erschöpfung wie gewohnt:
      Sprinten verbraucht am meisten, dann Springen, Abbauen, Schwimmen, Gehen; Richtwert: voller Balken hält beim
      normalen Spielen ca. 20 Minuten (eine Tageslänge). Unter 7 kein Sprinten, ab 18 Heilung (statt der bisherigen
      festen Heilung), bei 0 alle 4 s ein halbes Herz Schaden (Ursache `starve`), aber nie unter ein halbes Herz.
      Essen: rechte Maustaste mit einem Item mit `ItemDef.food` 32 Ticks halten (`eatProgress` 0–1, `HeldItemView.eat`),
      dann ein Stück verbrauchen, `food`/Reserve erhöhen, Ereignis `ate`; Loslassen bricht ab; nicht essbar bei vollem
      Balken. Kreativ: immer voll. Respawn: voll. Hunger wird gespeichert und geladen. Unit-Tests.

Neue Inhalte:

- [ ] C18 Truhen: Rechtsklick auf `BLOCK.CHEST` öffnet `screen = 'chest'` mit `GameState.container` (27 Slots).
      `clickSlot`/`moveSlot` für `area: 'container'` wie im Inventar, Shift-Klick zwischen Truhe und Inventar.
      Inhalt pro Block speichern (`src/save/`), beim Abbauen der Truhe landet der Inhalt im Inventar (Überlauf mit Meldung).
      Shift + Rechtsklick setzt stattdessen einen Block (wie an der Werkbank). Unit-Tests.
- [ ] C19 Öfen und Schmelzen: Rechtsklick auf `BLOCK.FURNACE` öffnet `screen = 'furnace'`. Slots 0 Zutat, 1 Brennstoff,
      2 Ergebnis (nur herausnehmen). Schmelzen nach `registry.smelting` und `ItemDef.fuelSeconds`, `burn` und `progress`
      im Zustand, Ereignis `smelted`. Öfen arbeiten weiter, wenn der Bildschirm zu ist (solange ihr Chunk geladen ist),
      und werden gespeichert. Shift-Klick aus dem Inventar: Brennstoff → Slot 1, sonst → Slot 0. Unit-Tests.

---

## Phase 2 – Zusammenführen (Runde 2)
**Modell: Opus. Branch: `main`. Erst starten, wenn alle drei Listen erledigt sind.**

- [ ] C2-1 Branches nacheinander nach `main` mergen: `codex`, dann `claude`, dann `opencode`. Konflikte sauber lösen.
      Bei jedem Branch kritisch prüfen, ob die abgehakten Aufgaben wirklich vollständig umgesetzt sind.
- [ ] C2-2 Platzhalter entfernen, die jetzt überflüssig sind (u. a. `return null` für Ofen/Truhe in `src/ui/index.ts`,
      leeres `spawnBlockParticles`/`setHeldItem`, feste Hunger-Werte); alles richtig verdrahten.
- [ ] C2-3 `npm run check` und `npm run e2e`. Den Spieltest (`e2e/playtest.spec.ts`) erweitern: Werkbank craften und
      setzen, Truhe benutzen, Ofen mit Kohle befeuern und etwas schmelzen, Fackel setzen, Apfel essen, Sprinten auf
      eine andere Taste legen. Screenshots ansehen (Hand und Werkzeug sichtbar? Schlag-Animation? Hunger-Anzeige?),
      Rechtsklick zwischen Inventar-Slots darf kein Browser-Menü öffnen. Gefundene Fehler beheben.
- [ ] C2-4 Alle Dateien in `notes/` lesen, sinnvolle Vertragswünsche umsetzen, `[!]`-Aufgaben prüfen.
      Vertrag für Tiere und Monster entwerfen (Entities: Zustand, Bewegung über die Physik, Darstellung im Renderer,
      Schaden und KI in der Spiellogik), damit die nächste Runde sie parallel bauen kann.
- [ ] C2-5 E2E-Tests (`npm run e2e`) zusätzlich in GitHub Actions laufen lassen (Chromium mit SwiftShader).
- [ ] C2-6 Bericht `docs/RUNDE.md` fortschreiben: was funktioniert, was nicht, bekannte Fehler.
- [ ] C2-7 Neue Aufgabenlisten für die nächste Runde in `tasks/` schreiben – gleiches Format, gleiche Ordner-Zuständigkeiten,
      schwere Engine-Aufgaben an Codex, kleine klare Aufgaben an OpenCode. Offene Fehler zuerst.
      Kandidaten: Tiere und Monster, Item-Drops in der Welt, Betten/Schlafen, Hunger, Erze und Werkzeuge aus Eisen ausbauen.
- [ ] C2-8 Notizdateien leeren, alles auf `main` committen und pushen (löst den Deploy aus). Dann STOPPEN.
