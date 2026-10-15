# Aufgaben: Codex

**Branch: `codex`. Ordner: `src/world/`, `src/physics/`, `src/render/`.**
Die Engine: Welt, Physik, Darstellung. Ersetze die Platzhalter aus Phase 0 durch echte Implementierungen.
Die Verträge in `src/core/` sind fest. Performance ist wichtig – miss sie, statt zu raten.

- [x] X1 Terrain: Höhenkarte aus mehreren Noise-Oktaven, deterministisch aus dem Seed.
      Ebenen, Hügel, gelegentlich Berge bis ca. Höhe 110, Strände aus Sand an Wasserkanten, Wasser bis Höhe 62.
      Schichten: Gras → 3–4 Erde → Stein, unten eine unzerstörbare Grundschicht. Unit-Tests (gleicher Seed = gleiche Welt).
- [x] X2 Bäume: Stamm + Blätterkrone, zufällig aber deterministisch verteilt, auch über Chunk-Grenzen hinweg korrekt.
- [x] X3 Höhlen (3D-Noise, „Spaghetti“-Gänge) und Erzadern (Kohle häufig und hoch, Eisen seltener und tiefer).
- [x] X4 Chunk-Verwaltung: Chunks rund um den Spieler laden/entladen je nach Sichtweite, näheste zuerst.
      Generierung und Meshing in Web Workern, damit das Spiel nicht ruckelt.
- [x] X5 Meshing: nur sichtbare Flächen, Texturen aus dem Atlas (Format laut Vertrag; solange kein Atlas da ist, Farben),
      Ambient Occlusion pro Ecke. `setBlock` baut nur betroffene Chunks neu, inkl. Nachbarn an der Grenze.
- [x] X6 Transparente Blöcke: Wasser (leicht durchsichtig, Oberfläche etwas tiefer), Blätter (alphagetestet), Glas.
      Getrennte Render-Durchgänge, richtige Sortierung.
- [x] X7 Physik: AABB-Kollision Achse für Achse, Schwerkraft, Sprung auf ca. 1,25 Blöcke Höhe,
      Bodenreibung, Schwimmen und langsameres Sinken im Wasser, Schleichen verhindert Fallen von Kanten.
      Unit-Tests für typische Fälle (Wand, Decke, Kante, Treppe aus Blöcken).
- [ ] X8 Raycast mit DDA-Verfahren: exakter getroffener Block und getroffene Fläche. Unit-Tests.
- [ ] X9 Licht: Sonnenlicht von oben (fällt durch Luft, Glas, Blätter abgeschwächt) und Blocklicht von leuchtenden
      Blöcken, Ausbreitung per Flood-Fill (Stufen 0–15), über Chunk-Grenzen. Reagiert auf setBlock.
      Licht wird ins Mesh gebacken; die Tageszeit verändert nur die Stärke des Sonnenlichts im Shader.
- [ ] X10 Himmel: Farbverlauf je Tageszeit, Sonne und Mond, Sterne nachts, Nebel am Rand der Sichtweite, einfache Wolken.
- [ ] X11 Auswahlrahmen um den anvisierten Block und Abbau-Risse (10 Stufen) als Overlay.
- [ ] X12 Performance: Frustum-Culling, Speicher entladener Chunks freigeben, FPS bei Sichtweite 8 messen
      (Playwright oder Dev-Overlay). Engpässe beheben. Messwerte in `notes/codex.md` eintragen.







