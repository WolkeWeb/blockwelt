# Aufgaben: Codex

**Branch: `codex`. Ordner: `src/world/`, `src/physics/`, `src/render/`.**
Die Engine: Welt, Physik, Darstellung. Runde 2 – Stand der letzten Runde und bekannte Fehler: `docs/RUNDE.md`.
Die Verträge in `src/core/` sind fest (neu seit Runde 1: `BLOCK.FLOWING_WATER`, `SNOW`, `SANDSTONE`, `FURNACE`, `CHEST`,
`Renderer.spawnBlockParticles`). Performance ist wichtig – miss sie, statt zu raten.

**Fertig heißt:** `npm run check` grün **und** `npm run e2e` grün. Unit-Tests allein reichen nicht: In Runde 1 war die
Kamera im echten Spiel falsch herum geneigt, obwohl alle Tests grün waren. Prüfe sichtbare Änderungen im Browser
(`npm run build && npm run preview`, dann Welt über das Menü anlegen) oder mit einem Playwright-Screenshot.

Offene Fehler zuerst:

- [ ] X13 Leistung im echten Spiel: FPS und Framezeiten im laufenden Spiel messen (nicht auf der Benchmark-Seite),
      hardwarebeschleunigt wie in X12, Sichtweite 8 und 12, stehend und laufend; Zeit von „Neue Welt erstellen“ bis alle
      Chunks gemesht sind. Engpässe beheben (Kandidat: das 48×48×128-Lichtfeld pro Chunk-Mesh). Messwerte in die
      Notizdatei. Benchmark-Rohdaten und Bilder (`*.png`, `*-results.json`, `*-baseline.*`) aus `src/render/` entfernen;
      das Benchmark-Skript darf bleiben und schreibt künftig nach `test-results/`.
- [ ] X14 Darstellung nacharbeiten: Fackel als schmaler Stab (2/16 breit, 10/16 hoch, laut Vertrag `shape: 'torch'`)
      statt der gekreuzten Flächen aus Phase 2; Wolken als flache Wolkenschicht aus Rasterzellen statt einzelner Quader;
      Unterwasser: Nebelfarbe und -dichte so, dass man unter Wasser klar „im Wasser“ ist, aber 8–10 Blöcke weit sieht.

Neue Inhalte:

- [ ] X15 Fließendes Wasser: `BLOCK.WATER` ist Quelle, `BLOCK.FLOWING_WATER` fließt. Ausbreitung seitlich bis 7 Stufen,
      nach unten unbegrenzt, über Ticks verteilt (`update`, begrenzte Arbeit pro Aufruf); Rückzug, wenn die Quelle
      entfernt wird. Stufen verwaltet die Welt intern; Änderungen gehen über `onBlockChanged`. Im Mesh: Oberflächenhöhe je
      Stufe, keine Flächen zwischen Wasser und fließendem Wasser. Frisch erzeugte Chunks sind ruhig (keine Kettenreaktion
      beim Laden). Unit-Tests (Quelle setzen, Quelle entfernen, Treppe hinunter, über Chunk-Grenzen).
- [ ] X16 Biome: Temperatur- und Feuchte-Noise, weiche Übergänge, deterministisch aus dem Seed. Mindestens Ebene, Wald
      (dichter mit Bäumen), Wüste (Sand mit Sandstein darunter, keine Bäume), verschneite Berge (Schnee ab ca. Höhe 95).
      Strände und Meer bleiben. Unit-Tests (gleicher Seed = gleiche Welt, jedes Biom kommt in einem festen Ausschnitt vor).
- [ ] X17 Partikel: `spawnBlockParticles(position, block)` – 8–16 kleine Würfel oder Quads mit Textur-Ausschnitt bzw.
      Farbe des Blocks, Schwerkraft, prallen nicht durch den Boden, verschwinden nach ca. 1 s. Fester Pool, kein
      Speicherwachstum bei Dauer-Abbau. Unit-Test für Pool und Lebensdauer.
- [ ] X18 Ofen und Truhe zeichnen: Vorderseite nach Blickrichtung beim Setzen ist (noch) nicht im Vertrag – Vorderseite
      deshalb fest nach Süden. Prüfen, dass Blöcke mit Texturen je Seite (`BlockDef.textures`) richtig orientiert sind
      (Oberseite oben, Seiten nicht gespiegelt oder gekippt). Unit-Test für die UV-Ausrichtung jeder Seite.
