# Blockwelt – Steuerung

Alle Tasten gelten im laufenden Spiel. Die Spiellogik wertet Tastatur und Maus aus; das HUD zeigt den
Zustand an.

## Bewegung

| Taste | Wirkung |
|-------|---------|
| `W` | vorwärts |
| `S` | rückwärts |
| `A` | nach links |
| `D` | nach rechts |
| `Leertaste` | springen – im Wasser: aufwärts schwimmen – im Kreativmodus: aufsteigen |
| `Shift` | schleichen (langsam; man fällt nicht von Kanten) – im Kreativmodus: absteigen |
| `W` halten, dann `Strg` | sprinten (schneller) – erst `W`, dann `Strg` drücken: `Strg` + `W` schließt im Browser sonst den Tab |
| Doppelt `W` | sprinten (Alternative zu `Strg`) |

Gehen ≈ 4,3 Blöcke/s, Sprinten ≈ 5,6 Blöcke/s, Schleichen ≈ 1,3 Blöcke/s. Die Sprunghöhe beträgt
etwa 1,25 Blöcke.

## Umsehen und Spielen

| Eingabe | Wirkung |
|---------|---------|
| Maus bewegen | umsehen (nur mit gefangenem Mauszeiger; ein Klick ins Bild fängt ihn – solange das nicht passiert ist, steht „Klicken zum Spielen“ im Bild) |
| Linke Maustaste (halten) | Block abbauen bzw. angreifen |
| Rechte Maustaste | Block setzen, Werkbank öffnen (Rechtsklick auf die Werkbank; mit `Shift` wird stattdessen ein Block an die Werkbank gesetzt) |
| `1` … `9` | Hotbar-Slot wählen |
| Mausrad | Hotbar durchblättern |

Die Reichweite beträgt 5 Blöcke (ab der Augenhöhe). Abgebaute Blöcke landen als Drop im Inventar.

## Inventar und Crafting

| Taste / Eingabe | Wirkung |
|-----------------|---------|
| `E` | Inventar öffnen und schließen (mit 2×2-Crafting) |
| Rechtsklick auf Werkbank | Werkbank öffnen (3×3-Crafting) |
| Linke Maustaste auf Slot | Stapel aufnehmen / ablegen / zusammenlegen / mit dem Mauszeiger tauschen |
| Rechte Maustaste auf Slot | halben Stapel aufnehmen bzw. ein einzelnes Item ablegen |
| `Shift` + linke Maustaste | Stapel direkt verschieben (Hotbar ↔ Hauptinventar, Crafting → Inventar) |
| Linke Maustaste auf Ergebnis-Slot | einmal craften (`Shift`: so oft wie möglich) |
| Ziehen (Drag & Drop) | Stapel direkt in einen anderen Slot verschieben (tauscht, wenn das Ziel belegt ist) |

Beim Schließen wandern Items aus dem Crafting-Raster und vom Mauszeiger zurück ins Inventar.
Fährt man über ein Item, erscheint der Name als Tooltip. Werkzeuge zeigen an der Hotbar einen
Haltbarkeitsbalken (grün → gelb → rot), solange sie benutzt sind.

## Bildschirme

| Taste | Wirkung |
|-------|---------|
| `Esc` | Pausenmenü öffnen (der Browser gibt dabei den Mauszeiger frei) bzw. offenen Bildschirm schließen |
| `F3` | Debug-Anzeige ein- und ausblenden (FPS, Position, Chunk, Blickrichtung, Ziel, Chunks, Draw-Calls, Dreiecke) |

Im Pausenmenü gibt es „Weiterspielen", „Einstellungen" und „Speichern und zum Titel". Der
Todesbildschirm bietet „Wiederbeleben". Die Einstellungen (aus Startbildschirm oder Pause) regeln
Sichtweite (2–16 Chunks), Sichtfeld (30–110°) und Mausempfindlichkeit (0,1–3).

## Kreativmodus

Der Kreativmodus bietet unendliche Blöcke, sofortiges Abbauen und keinen Schaden. Neue Kreativ-Welten starten
mit einer gefüllten Hotbar. Zweimal schnell `Leertaste` schaltet das Fliegen ein und aus; beim Fliegen steigt
man mit `Leertaste` auf und sinkt mit `Shift`. Im Überlebensmodus gibt es Leben (10 Herzen), Fallschaden und
Ertrinken (Luftblasen erscheinen nur unter Wasser).
