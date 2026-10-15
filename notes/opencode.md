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
- **O3 – Items:** Werkzeugwerte: Holz Stufe 1/Speed 2/Haltbarkeit 59, Stein Stufe 2/Speed 4/Haltbarkeit 131.
  Schaden in halben Herzen: Spitzhacke 2/3, Axt 3/4, Schaufel 2/3, Schwert 4/5 (Holz/Stein).
  Anzeigenamen wie „Holzspitzhacke", „Steinschwert" (Material + Werkzeug kleingeschrieben).
- **O4 – Rezepte:** Werkzeuge nach Lehrbuchmuster (Spitzhacke 3×3, Axt 2×3, Schaufel/Schwert 1×3 –
  letztere passen nur an die Werkbank). Holz-Werkzeuge kosten Bretter, Stein-Werkzeuge Bruchstein.
  Fackel = Kohle über Stock, ergibt 4. Stock = 2 Bretter übereinander, ergibt 4.
- **O5 – Oberfläche:** Aufbau unter `src/ui/`: `dom.ts` (Helfer), `icons.ts` (Atlas-Symbole über
  Daten-URL + `background-position`, ohne Atlas Ersatzfarbe), `slots.ts` (Slot, Tooltip, Mauszeiger-Stapel),
  `hud.ts` (Hotbar), `styles.css`. Slots rufen nur `game.clickSlot`/`moveSlot` auf.
  Der Atlas wird einmal als Daten-URL gelesen und je Symbol per `background-position` ausgeschnitten
  (Skalierung 2 → 32 px pro 16-px-Kachel, `image-rendering: pixelated`).
- **O6 – Inventar:** Slots sind Divs mit `click`/`contextmenu` (Rechtsklick) → `game.clickSlot`
  (`shift` aus `event.shiftKey`) und nativem Drag & Drop → `game.moveSlot`. Der Stapel am Mauszeiger
  hängt an einem `mousemove`-Listener auf `window`. Die UI registriert keine eigenen Tasten-Listener
  für E/Esc/F3. Bei offenem Bildschirm fängt das Overlay die Zeigerereignisse ab (`pointer-events: auto`),
  damit Klicks nicht beim Canvas landen.
- **O7 – Werkbank:** Derselbe Aufbau wie das Inventar; nur das Crafting-Raster ist 3×3
  (`createContainerPanel('workbench')`). Panel und Slots werden wiederverwendet.
- **O8 – HUD:** Herzen als 10 Text-Herzen mit geclipptem Füllstand (0/50/100 %); Luftblasen als kleine
  Kreise, nur unter Wasser (`underwater`); Debug-Text mit FPS, Position, Chunk, Blickrichtung, Ziel,
  Chunks/Draw-Calls/Dreiecke. F3 schaltet die Spiellogik – die Oberfläche liest nur `debugVisible`.

## Wünsche an die Verträge

## Ideen
