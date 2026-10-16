# Aufgaben: OpenCode

**Branch: `opencode`. Ordner: `src/ui/`, `src/data/`, `src/assets/`, `docs/`.**
Inhalte und Oberfläche. Runde 2 – Stand der letzten Runde und bekannte Fehler: `docs/RUNDE.md`.
Die Oberfläche spricht nur mit der `GameApi` aus `src/core/game.ts` – sie greift nie direkt auf Welt, Physik oder Renderer zu.
Oberfläche als HTML/CSS-Overlay über dem Canvas (kein Framework). Pixeliger Look, gut lesbar.
Neu im Vertrag (lies `src/core/game.ts` und `src/core/registry.ts`): `KeyBindings`, `DEFAULT_KEY_BINDINGS`,
`RESERVED_KEY_CODES`, `Settings.volume`/`viewBobbing`/`keys`, `GameState.food`/`maxFood`/`eatProgress`,
`ItemDef.food`, `ItemDef.fuelSeconds`, `Registry.smelting`, Bildschirme `chest`/`furnace`, Ereignisse `footstep`,
`swing`, `ate`, `smelted`.

**Fertig heißt:** `npm run check` grün **und** `npm run e2e` grün **und** im Browser angesehen
(`npm run build && npm run preview`, Welt über das Menü anlegen). In Runde 1 wurde das Crafting-Raster als
eine einzige Spalte angezeigt, obwohl alle Tests grün waren – sichtbare Arbeit also immer auch ansehen.
Die Spiellogik (Claude) baut Hunger, Tastenbelegung und Truhen/Öfen parallel; auf deinem Branch sind die Werte im
Zustand noch Platzhalter (z. B. `food` immer 20). Baue die Oberfläche trotzdem vollständig nach dem Vertrag.

Fehler und was sich falsch anfühlt zuerst (Rückmeldung vom Spieltest):

- [ ] O11 Kein Browser-Kontextmenü: Ein Rechtsklick irgendwo auf Inventar, Werkbank, Truhe, Ofen und deren Hintergrund –
      auch genau in die Lücke zwischen zwei Slots – öffnet nie das Kontextmenü des Browsers (`contextmenu` auf dem
      ganzen Overlay unterdrücken, solange ein Bildschirm offen ist; Texteingaben in Menüs dürfen ihr Menü behalten).
      Lücken zwischen Slots so schmal machen bzw. die Slot-Fläche so vergrößern, dass ein Klick dazwischen nicht ins
      Leere geht, sondern zum nächsten Slot zählt. Auch kein Markieren von Text und kein Bild-Ziehen beim schnellen Klicken.
      Im Browser prüfen: Rechtsklick zwischen zwei Slots öffnet kein Menü.
- [ ] O12 Tastenbelegung in den Einstellungen: Abschnitt „Steuerung“ mit allen Aktionen aus `KeyAction` (deutsche
      Namen: Vorwärts, Rückwärts, Links, Rechts, Springen, Schleichen, Sprinten, Inventar) und ihrer Taste in lesbarer
      Form (z. B. „W“, „Leertaste“, „Shift links“). Klick auf eine Aktion → „Taste drücken …“ (kurzzeitiger
      `keydown`-Listener, laut Vertrag erlaubt), `Esc` bricht ab, Tasten aus `RESERVED_KEY_CODES` werden mit Hinweis
      abgelehnt, eine schon belegte Taste tauscht die beiden Aktionen. „Standard wiederherstellen“ setzt
      `DEFAULT_KEY_BINDINGS`. Gespeichert wird über `updateSettings({ keys })`. Dazu Schalter „Bewegungsanimation“
      (`viewBobbing`) und Regler „Lautstärke“ 0–100 % (`volume`). Unit-Test für die Tastennamen.
- [ ] O13 Prozedurale Geräusche: in `src/assets/` mit Web Audio erzeugt (keine Audiodateien, nichts aus anderen Spielen):
      Abbauen und Setzen je Material (Stein, Holz, Erde/Gras, Sand, Glas, Blätter), Schritte (`footstep`, je Material),
      Schlag (`swing`, leise), Schaden, Aufheben, Essen (`ate`), Craften, Werkzeug kaputt, Schmelzen fertig, Klick in
      Menüs. Abgespielt in `src/ui/` auf die Ereignisse der GameApi, Lautstärke aus `settings.volume`, leichte zufällige
      Tonhöhe, damit Wiederholungen nicht gleich klingen. Der AudioContext startet erst nach der ersten Benutzeraktion.
      Unit-Test: jedes Ereignis hat ein Geräusch, jedes Material einen Klang.
- [ ] O14 Hunger-Anzeige: 10 Hunger-Symbole rechts über der Hotbar (Gegenstück zu den Herzen links), eigenes
      schlichtes Symbol (z. B. Brotlaib), halbe Symbole aus `food`/`maxFood`; bei sehr wenig Hunger leichtes Zittern.
      Nur im Überleben sichtbar. Beim Essen ein kleiner Fortschrittsbalken über der Hotbar aus `eatProgress`.
      Todesbildschirm: Text für die Ursache `starve` („Du bist verhungert.“). Unit-Test für die halben Symbole.
- [ ] O15 Lesbarkeit: Item-Symbole auf dunklen Slots erkennbar machen (Kohle ist kaum zu sehen) – z. B. heller Umriss
      oder hellerer Slot-Hintergrund. Ladebildschirm mit kleiner Animation, damit man sieht, dass etwas passiert.

Neue Inhalte:

- [ ] O16 Nahrung: Item Apfel (Textur, `food: { nutrition: 4, saturation: 2.4 }`), Blätter droppen mit 5 % Chance einen
      Apfel. Weitere Nahrung folgt mit Tieren bzw. Getreide in einer späteren Runde. Tests: jede Nahrung hat
      `nutrition > 0` und `saturation >= 0`, Blätter droppen `apple` mit `chance` 0,05.
- [ ] O17 Texturen für die neuen Blöcke: Ofen (vorne, Seite, oben), Truhe (vorne, Seite, oben), Schnee, Sandstein
      (oben, Seite, unten). Blockdefinitionen in `src/data/blocks.ts` mit diesen Texturen versehen (Vorderseite = `south`).
      Für `flowing_water` kein Block-Item erzeugen (nicht setzbar, nicht im Inventar).
- [ ] O18 Eisen und neue Rezepte: Item Eisenbarren, Werkzeuge aus Eisen (Stufe 3, Speed 6, Haltbarkeit 250) samt Symbolen
      und Rezepten; Ofen (8 Bruchstein im Ring), Truhe (8 Bretter im Ring), Sandstein (4 Sand, 2×2).
      Ofen-Rezepte in `registry.smelting` (Eisenerz → Eisenbarren, Sand → Glas, Bruchstein → Stein, Holzstamm → Kohle)
      und Brennwerte `fuelSeconds` (Kohle 80, Holzstamm 15, Bretter 15, Stock 5, Holzwerkzeuge 10). Tests: jedes Rezept
      verwendet nur existierende Items, jeder Brennstoff hat einen Wert > 0.
- [ ] O19 Truhen-Bildschirm (`screen = 'chest'`): 27 Slots aus `GameState.container` (`area: 'container'`) über
      Hauptinventar und Schnellleiste, Klick/Rechtsklick/Shift-Klick/Ziehen wie im Inventar.
- [ ] O20 Ofen-Bildschirm (`screen = 'furnace'`): Zutat oben, Brennstoff unten, Ergebnis rechts, dazwischen Flamme
      (Füllstand aus `burn`) und Pfeil (Fortschritt aus `progress`), darunter Inventar wie gewohnt.
- [ ] O21 Doku: `docs/STEUERUNG.md` (Tastenbelegung mit Standardtasten, Sprinten auf `R`, Essen, Hunger) und
      `docs/BLOECKE.md` (Ofen, Truhe, Eisen, Nahrung, neue Blöcke, Rezepte, Ofen-Rezepte; Tabellen aus den Definitionen).
