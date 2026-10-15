# Aufgaben: OpenCode

**Branch: `opencode`. Ordner: `src/ui/`, `src/data/`, `src/assets/`, `docs/`.**
Inhalte und Oberfläche. Runde 2 – Stand der letzten Runde und bekannte Fehler: `docs/RUNDE.md`.
Die Oberfläche spricht nur mit der `GameApi` aus `src/core/game.ts` – sie greift nie direkt auf Welt, Physik oder Renderer zu.
Oberfläche als HTML/CSS-Overlay über dem Canvas (kein Framework). Pixeliger Look, gut lesbar.

**Fertig heißt:** `npm run check` grün **und** `npm run e2e` grün **und** im Browser angesehen
(`npm run build && npm run preview`, Welt über das Menü anlegen). In Runde 1 wurde das Crafting-Raster als
eine einzige Spalte angezeigt, obwohl alle Tests grün waren – sichtbare Arbeit also immer auch ansehen.

Offene Fehler zuerst:

- [ ] O11 Lesbarkeit: Item-Symbole auf dunklen Slots erkennbar machen (Kohle ist kaum zu sehen) – z. B. heller Umriss
      oder hellerer Slot-Hintergrund. Ladebildschirm mit kleiner Animation, damit man sieht, dass etwas passiert.
- [ ] O12 Texturen für die neuen Blöcke: Ofen (vorne, Seite, oben), Truhe (vorne, Seite, oben), Schnee, Sandstein
      (oben, Seite, unten). Blockdefinitionen in `src/data/blocks.ts` mit diesen Texturen versehen (Vorderseite = `south`).
      Für `flowing_water` kein Block-Item erzeugen (nicht setzbar, nicht im Inventar).
- [ ] O13 Eisen und neue Rezepte: Item Eisenbarren, Werkzeuge aus Eisen (Stufe 3, Speed 6, Haltbarkeit 250) samt Symbolen
      und Rezepten; Ofen (8 Bruchstein im Ring), Truhe (8 Bretter im Ring), Sandstein (4 Sand, 2×2).
      Ofen-Rezepte in `registry.smelting` (Eisenerz → Eisenbarren, Sand → Glas, Bruchstein → Stein, Holzstamm → Kohle)
      und Brennwerte `fuelSeconds` (Kohle 80, Holzstamm 15, Bretter 15, Stock 5, Holzwerkzeuge 10). Tests: jedes Rezept
      verwendet nur existierende Items, jeder Brennstoff hat einen Wert > 0.

Neue Bildschirme und Geräusche:

- [ ] O14 Truhen-Bildschirm (`screen = 'chest'`): 27 Slots aus `GameState.container` (`area: 'container'`) über
      Hauptinventar und Schnellleiste, Klick/Rechtsklick/Shift-Klick/Ziehen wie im Inventar.
- [ ] O15 Ofen-Bildschirm (`screen = 'furnace'`): Zutat oben, Brennstoff unten, Ergebnis rechts, dazwischen Flamme
      (Füllstand aus `burn`) und Pfeil (Fortschritt aus `progress`), darunter Inventar wie gewohnt.
- [ ] O16 Prozedurale Geräusche: in `src/assets/` mit Web Audio erzeugt (keine Audiodateien, nichts aus anderen Spielen):
      Abbauen und Setzen je Material (Stein, Holz, Erde/Gras, Sand, Glas), Schritte (`footstep`), Schaden, Aufheben,
      Craften, Werkzeug kaputt, Schmelzen fertig. Abgespielt in `src/ui/` auf die Ereignisse der GameApi,
      Lautstärke aus `settings.volume`. Der AudioContext startet erst nach der ersten Benutzeraktion.
- [ ] O17 Einstellungen: Regler „Lautstärke“ (0–100 %) über `updateSettings({ volume })`.
- [ ] O18 Doku: `docs/STEUERUNG.md` und `docs/BLOECKE.md` um Ofen, Truhe, Eisen, neue Blöcke, Rezepte und
      Ofen-Rezepte ergänzen (Tabellen aus den Definitionen ableiten).
