# Blockwelt – Blöcke, Items und Rezepte

Alle Inhalte stammen aus `src/data/blocks.ts`, `src/data/items.ts` und `src/data/recipes.ts`.
Texturen werden prozedural erzeugt (`src/assets/`). Koordinaten: Y ist oben, 1 Einheit = 1 Block.

## Blöcke

Härte `-1` = unzerstörbar. „Werkzeug (Stufe)": bevorzugtes Werkzeug und Mindeststufe für einen Drop
(`0` = droppt immer, `1` = Holz, `2` = Stein).

| Block | ID | Technisch | Härte | Transparenz | Licht | Drop | Werkzeug (Stufe) |
|-------|----|-----------|-------|-------------|-------|------|------------------|
| Luft | 0 | `air` | 0 | unsichtbar | – | nichts | – |
| Grasblock | 1 | `grass` | 0,6 | undurchsichtig | – | Erde | Schaufel (0) |
| Erde | 2 | `dirt` | 0,5 | undurchsichtig | – | Erde | Schaufel (0) |
| Stein | 3 | `stone` | 1,5 | undurchsichtig | – | Bruchstein | Spitzhacke (1) |
| Bruchstein | 4 | `cobblestone` | 2 | undurchsichtig | – | Bruchstein | Spitzhacke (1) |
| Grundgestein | 5 | `bedrock` | −1 | undurchsichtig | – | nichts | – |
| Sand | 6 | `sand` | 0,5 | undurchsichtig | – | Sand | Schaufel (0) |
| Kies | 7 | `gravel` | 0,6 | undurchsichtig | – | Kies | Schaufel (0) |
| Holzstamm | 8 | `log` | 2 | undurchsichtig | – | Holzstamm | Axt (0) |
| Bretter | 9 | `planks` | 2 | undurchsichtig | – | Bretter | Axt (0) |
| Blätter | 10 | `leaves` | 0,2 | cutout | – | nichts | – |
| Glas | 11 | `glass` | 0,3 | cutout | – | nichts | – |
| Wasser | 12 | `water` | 0 | halbdurchsichtig | – | nichts | – |
| Kohleerz | 13 | `coal_ore` | 3 | undurchsichtig | – | Kohle | Spitzhacke (1) |
| Eisenerz | 14 | `iron_ore` | 3 | undurchsichtig | – | Eisenerz | Spitzhacke (2) |
| Werkbank | 15 | `crafting_table` | 2,5 | undurchsichtig | – | Werkbank | Axt (0) |
| Fackel | 16 | `torch` | 0 | cutout | 14 | Fackel | – |

Hinweise:

- **Blätter** und **Glas** droppen nichts (es gibt keine Schere).
- **Eisenerz** droppt sich selbst, braucht aber eine Steinspitzhacke.
- **Wasser** ist flüssig (man schwimmt) und ersetzbar; **Fackel** leuchtet mit Stufe 14.
- Lichtdurchlässigkeit: Luft und Glas 0, Blätter 1, Wasser 2, undurchsichtige Blöcke 15.

## Items

Werkzeuge sind nicht stapelbar (Stapelgröße 1). „Tempo" ist der Abbau-Multiplikator für Blöcke mit
passendem bevorzugtem Werkzeug; Schaden in halben Herzen.

| Item | ID | Stapel | Typ | Stufe | Haltbarkeit | Tempo | Schaden |
|------|----|--------|-----|-------|-------------|-------|---------|
| Stock | `stick` | 64 | – | – | – | – | – |
| Kohle | `coal` | 64 | – | – | – | – | – |
| Holzspitzhacke | `wooden_pickaxe` | 1 | Spitzhacke | 1 | 59 | 2× | 2 |
| Holzaxt | `wooden_axe` | 1 | Axt | 1 | 59 | 2× | 3 |
| Holzschaufel | `wooden_shovel` | 1 | Schaufel | 1 | 59 | 2× | 2 |
| Holzschwert | `wooden_sword` | 1 | Schwert | 1 | 59 | 2× | 4 |
| Steinspitzhacke | `stone_pickaxe` | 1 | Spitzhacke | 2 | 131 | 4× | 3 |
| Steinaxt | `stone_axe` | 1 | Axt | 2 | 131 | 4× | 4 |
| Steinschaufel | `stone_shovel` | 1 | Schaufel | 2 | 131 | 4× | 3 |
| Steinschwert | `stone_sword` | 1 | Schwert | 2 | 131 | 4× | 5 |

Zusätzlich gibt es zu jedem platzierbaren Block ein Item mit derselben ID wie der technische
Blockname (z. B. `stone` → Stein, `torch` → Fackel). Mit der Hand dauert ein Block etwa
`Härte × 1,5` Sekunden.

## Rezepte

Muster werden im Raster frei verschoben und waagerecht gespiegelt. Muster bis 2×2 passen ins
Inventar, größere nur an die Werkbank. `H` = Holzwerkzeug-Material (Bretter), `S` = Bruchstein
(Steinwerkzeug), `T` = Stock.

| Ergebnis | Menge | Art | Zutaten / Muster | Wo |
|----------|-------|-----|------------------|----|
| Bretter | 4 | formlos | 1 Holzstamm | überall |
| Stock | 4 | geformt | `T` / `T` (Bretter übereinander) | überall |
| Werkbank | 1 | geformt | `BB` / `BB` (4 Bretter) | überall |
| Fackel | 4 | geformt | `K` / `T` (Kohle über Stock) | überall |
| Holzspitzhacke | 1 | geformt | `BBB` / ` T ` / ` T ` | Werkbank |
| Holzaxt | 1 | geformt | `BB` / `BT` / ` T` | Werkbank |
| Holzschaufel | 1 | geformt | `B` / `T` / `T` | Werkbank |
| Holzschwert | 1 | geformt | `B` / `B` / `T` | Werkbank |
| Steinspitzhacke | 1 | geformt | `CCC` / ` T ` / ` T ` | Werkbank |
| Steinaxt | 1 | geformt | `CC` / `CT` / ` T` | Werkbank |
| Steinschaufel | 1 | geformt | `C` / `T` / `T` | Werkbank |
| Steinschwert | 1 | geformt | `C` / `C` / `T` | Werkbank |

Dabei ist `B` = Bretter, `C` = Bruchstein, `K` = Kohle, `T` = Stock.
