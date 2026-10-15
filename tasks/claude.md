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
Nutze die anderen Bereiche ausschließlich über die Verträge in `src/core/`.
Die Verträge für Runde 2 (Ofen, Truhe, `container`-Slots, `footstep`, `smelted`, `Settings.volume`,
`spawnBlockParticles`) stehen schon in `src/core/` – lies sie zuerst.

**Fertig heißt:** `npm run check` grün **und** `npm run e2e` grün. Jede Regel bekommt Unit-Tests. Eine Aufgabe ist erst
abgehakt, wenn alles darin Verlangte umgesetzt ist – lieber `[!]` mit Begründung als ein halbes `[x]`.

Offene Fehler zuerst:

- [ ] C10 Sprinten ohne `Strg`+`W`-Falle: Im Browser schließt `Strg` + `W` den Tab, wenn `Strg` zuerst gedrückt wird.
      Sprinten zusätzlich auf `R` legen (gedrückt halten = sprinten, solange `W` gehalten wird), Doppel-W bleibt.
      `Strg` nur noch werten, wenn `W` schon gehalten wird. Im Vollbild, falls verfügbar, `navigator.keyboard.lock()`
      für `KeyW` nutzen (Fehler still abfangen). Entscheidung in der Notizdatei festhalten.
- [ ] C11 Fackel-Regeln: Fackeln nur auf die Oberseite fester, undurchsichtiger Blöcke setzen (nicht an Seiten,
      Unterseiten, andere Fackeln, Blätter, Glas). Verschwindet der Block darunter, fällt die Fackel ab und landet
      als Drop im Inventar. Unit-Tests.
- [ ] C12 Eingabe bei niedriger Bildrate: Ein Rechtsklick setzt genau einen Block, auch wenn in einem Frame mehrere Ticks
      laufen (gehaltene Taste: erst nach 5 Ticks Wiederholung, gezählt in Ticks, nicht in Frames). Gleiches für das
      Abbauen im Kreativmodus. Unit-Tests mit simulierten Ticks.
- [ ] C13 `src/game/game.ts` testbar machen: `Input` so schneiden, dass sich Eingaben ohne DOM einspeisen lassen
      (z. B. eine kleine Eingabe-Schnittstelle, die `main.ts` mit echten Events füttert). Unit-Tests für die GameApi
      mit Fake-Welt, Fake-Renderer und Speicher im Arbeitsspeicher: Welt anlegen → `playing`, Block abbauen (Drop im
      Inventar), Block setzen, Inventar schließen (Raster und Mauszeiger zurück ins Inventar), Tod → Respawn,
      Speichern und Laden.

Neue Inhalte:

- [ ] C14 Truhen: Rechtsklick auf `BLOCK.CHEST` öffnet `screen = 'chest'` mit `GameState.container` (27 Slots).
      `clickSlot`/`moveSlot` für `area: 'container'` wie im Inventar, Shift-Klick zwischen Truhe und Inventar.
      Inhalt pro Block speichern (`src/save/`), beim Abbauen der Truhe landet der Inhalt im Inventar (Überlauf mit Meldung).
      Shift + Rechtsklick setzt stattdessen einen Block (wie an der Werkbank). Unit-Tests.
- [ ] C15 Öfen und Schmelzen: Rechtsklick auf `BLOCK.FURNACE` öffnet `screen = 'furnace'`. Slots 0 Zutat, 1 Brennstoff,
      2 Ergebnis (nur herausnehmen). Schmelzen nach `registry.smelting` und `ItemDef.fuelSeconds`, `burn` und `progress`
      im Zustand, Ereignis `smelted`. Öfen arbeiten weiter, wenn der Bildschirm zu ist (solange ihr Chunk geladen ist),
      und werden gespeichert. Shift-Klick aus dem Inventar: Brennstoff → Slot 1, sonst → Slot 0. Unit-Tests.
- [ ] C16 Geräusch- und Effekt-Auslöser: Ereignis `footstep` (Block unter den Füßen) beim Gehen auf festem Boden
      ca. alle 0,4 s, beim Sprinten öfter, nicht beim Schleichen, Fliegen oder Schwimmen. `spawnBlockParticles` wird
      beim Abbauen bereits aufgerufen – prüfen, dass es auch für sofort abgebaute Blöcke (Kreativ) passiert.
- [ ] C17 Einstellungen: `Settings.volume` (0–1, Standard 0,8) laden, begrenzen und speichern (schon im Vertrag;
      prüfen, dass alte Spielstände ohne `volume` sauber geladen werden). Unit-Test.
- [ ] C18 Spawn und Laden: Der Spawn-Punkt liegt nie im Wasser und nie unter Blättern; gibt es im Umkreis keinen
      sicheren Platz, wird weiter gesucht (bis 256 Blöcke) statt über dem Meer abzusetzen. Unit-Tests mit Fake-Welten.

---

## Phase 2 – Zusammenführen (Runde 2)
**Modell: Opus. Branch: `main`. Erst starten, wenn alle drei Listen erledigt sind.**

- [ ] C2-1 Branches nacheinander nach `main` mergen: `codex`, dann `claude`, dann `opencode`. Konflikte sauber lösen.
      Bei jedem Branch kritisch prüfen, ob die abgehakten Aufgaben wirklich vollständig umgesetzt sind.
- [ ] C2-2 Platzhalter entfernen, die jetzt überflüssig sind (u. a. `return null` für Ofen/Truhe in `src/ui/index.ts`,
      leeres `spawnBlockParticles`); alles richtig verdrahten.
- [ ] C2-3 `npm run check` und `npm run e2e`. Den Spieltest (`e2e/playtest.spec.ts`) erweitern: Werkbank craften und
      setzen, Truhe benutzen, Ofen mit Kohle befeuern und etwas schmelzen, Fackel setzen. Screenshots ansehen,
      gefundene Fehler beheben.
- [ ] C2-4 Alle Dateien in `notes/` lesen, sinnvolle Vertragswünsche umsetzen, `[!]`-Aufgaben prüfen.
      Vertrag für Tiere und Monster entwerfen (Entities: Zustand, Bewegung über die Physik, Darstellung im Renderer,
      Schaden und KI in der Spiellogik), damit die nächste Runde sie parallel bauen kann.
- [ ] C2-5 E2E-Tests (`npm run e2e`) zusätzlich in GitHub Actions laufen lassen (Chromium mit SwiftShader).
- [ ] C2-6 Bericht `docs/RUNDE.md` fortschreiben: was funktioniert, was nicht, bekannte Fehler.
- [ ] C2-7 Neue Aufgabenlisten für die nächste Runde in `tasks/` schreiben – gleiches Format, gleiche Ordner-Zuständigkeiten,
      schwere Engine-Aufgaben an Codex, kleine klare Aufgaben an OpenCode. Offene Fehler zuerst.
      Kandidaten: Tiere und Monster, Item-Drops in der Welt, Betten/Schlafen, Hunger, Erze und Werkzeuge aus Eisen ausbauen.
- [ ] C2-8 Notizdateien leeren, alles auf `main` committen und pushen (löst den Deploy aus). Dann STOPPEN.
