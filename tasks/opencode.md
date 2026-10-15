# Aufgaben: OpenCode

**Branch: `opencode`. Ordner: `src/ui/`, `src/data/`, `src/assets/`, `docs/`.**
Inhalte und Oberfläche. Die Oberfläche spricht nur mit der `GameApi` aus `src/core/game.ts` –
sie greift nie direkt auf Welt, Physik oder Renderer zu.
Oberfläche als HTML/CSS-Overlay über dem Canvas (kein Framework). Pixeliger Look, gut lesbar.

- [x] O1 Prozedurale Texturen: Ein Generator in `src/assets/` zeichnet 16×16-Pixel-Texturen per Canvas
      und packt sie in einen Atlas (Format laut `src/core/registry.ts`). Feste Zufallszahlen, damit sie immer gleich aussehen.
      Texturen: Gras oben, Gras Seite, Erde, Stein, Bruchstein, Grundgestein, Sand, Kies, Holzstamm Seite,
      Holzstamm oben, Bretter, Blätter (mit Löchern), Glas, Wasser, Kohleerz, Eisenerz, Werkbank (oben/Seite/vorne), Fackel.
- [x] O2 Block-Definitionen in `src/data/blocks.ts` für alle Blöcke aus O1: Härte, Transparenz, Lichtstärke
      (Fackel 14), Drop (Stein → Bruchstein, Gras → Erde, Blätter → nichts), bevorzugtes Werkzeug.
- [x] O3 Items in `src/data/items.ts`: Stock, Kohle, Werkzeuge aus Holz und Stein (Spitzhacke, Axt, Schaufel, Schwert)
      mit Haltbarkeit und Abbau-Geschwindigkeit.
- [x] O4 Rezepte in `src/data/recipes.ts`: Bretter aus Stamm, Stöcke, Werkbank, Fackeln, alle Werkzeuge aus O3.
      Ein Test prüft, dass jedes Rezept nur existierende Items verwendet.
- [ ] O5 Hotbar unten mittig: 9 Slots, Auswahlrahmen, Item-Symbol (aus der Textur), Anzahl, Haltbarkeitsbalken.
- [ ] O6 Inventar-Bildschirm (Taste E): 27 + 9 Slots, 2×2-Crafting mit Ergebnis-Slot, Item am Mauszeiger,
      Klick/Rechtsklick/Shift-Klick über die GameApi. Tooltip mit Item-Namen.
- [ ] O7 Werkbank-Bildschirm (Rechtsklick auf Werkbank): 3×3-Crafting, sonst wie O6.
- [ ] O8 HUD: Fadenkreuz, Herzen, Luftblasen (nur unter Wasser), Debug-Anzeige mit F3 (FPS, Position, Chunk, Blickrichtung).
- [ ] O9 Menüs: Startbildschirm mit Spieltitel „Blockwelt“, Weltauswahl (neu mit Name, Seed und Modus / laden / löschen),
      Pausenmenü (Esc), Einstellungen (Sichtweite 2–16, Sichtfeld, Mausempfindlichkeit), Todesbildschirm mit Respawn.
- [ ] O10 Doku: `docs/STEUERUNG.md` (alle Tasten) und `docs/BLOECKE.md` (alle Blöcke, Items und Rezepte als Tabelle).
