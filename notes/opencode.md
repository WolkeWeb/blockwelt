# Notizen: OpenCode

## Entscheidungen

- **O1 – Texturen:** Die Pixel entstehen in `src/assets/tile.ts` + `textures.ts` als reine RGBA-Daten
  (kein Canvas) und werden mit einem festen Seed je Texturname (`mulberry32`, `rng.ts`) erzeugt.
  Erst `atlas.ts` malt sie auf ein Canvas. Vorteil: deterministisch, auch ohne DOM prüfbar.
  Ohne Canvas-Umgebung (Tests) liefert `createTextureAtlas()` `null` – wie im Vertrag vorgesehen.
  Der Atlas hat 8 Kacheln pro Zeile (16 px), `v` wächst nach unten (Bildkoordinaten).
  Neben den Blocktexturen erzeugt O1 zusätzlich die Item-Symbole (Stock, Kohle, 8 Werkzeuge),
  weil O5/O6 Symbole „aus der Textur" brauchen.
- **O2 – Blöcke:** Eisenerz droppt sich selbst, braucht aber eine Steinspitzhacke (`requiredToolLevel: 2`),
  weil es (noch) kein Roheisen-Item gibt. Blätter und Glas droppen nichts (keine Schere im Spiel).
  Wasser ist `replaceable` (hineinsetzen möglich), Fackel `cutout` mit `lightLevel: 14`.

## Wünsche an die Verträge

## Ideen
