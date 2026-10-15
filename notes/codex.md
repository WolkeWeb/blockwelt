# Notizen: Codex

## Entscheidungen

- Aufgabenpflege: `tasks/codex.md` und diese Notizdatei werden gemäß AGENTS.md zusätzlich zu den drei eigenen Quellordnern geändert. Keine Änderungen an fremden Bereichen, Verträgen, Konfiguration oder Paketen.
- X1: Weltweite Simplex-Oktaven mit eigenem 32-Bit-PRNG. Höhen 8–110, Meer bis einschließlich Y=62; Sand bei Oberflächen bis Y=63, 3–4 Bodenschichten. Grundgestein verwendet BLOCK.BEDROCK; die negative Härte in der Blockdefinition und die Spiellogik sichern seine Unzerstörbarkeit.
- X2: Baumkandidaten in globalen 7×7-Zellen. Jeder Chunk berücksichtigt Kandidaten im Kronenrand von zwei Blöcken, ohne nachträgliche Schreibzugriffe auf Nachbarn.
- X3: Zwei 3D-Noise-Isoflächen bilden verbundene Höhlenröhren unter geschützten Bodenschichten. Eigene Seed-Ströme für Höhlen/Erze; Kohle bis Y95, selteneres Eisen bis Y47.
- X4: Zwei Modul-Worker, maximal zwei neue Jobs pro Tick, distanzsortiertes Laden und Meshing. Transferierte Snapshots; Revisionsprüfung verwirft überholte Meshes. Sparse Änderungen bleiben beim Entladen. Node-Tests führen denselben Job-Code synchron aus. Der Vite-Worker-Build benötigt in dieser Umgebung Sandbox-Eskalation wegen realpath EPERM.
- X5: Sichtbare Flächen mit Atlas-UVs (V nach unten, flipY=false). UV=-1 kennzeichnet lokal Flächen mit Ersatzfarbe. Eck-AO berücksichtigt diagonale Nachbarn; die Triangulierung folgt der Eckabschattung. Änderungen ohne Lichtwirkung bauen nur geometrisch betroffene Chunks neu.
- X6: Freie Wasseroberflächen liegen auf 14/16, gestapeltes Wasser bleibt verbunden. Drei Render-Pässe; Alpha-Test 0,5 für Blätter/Glas, Wasser ohne Tiefenschreiben beidseitig. Three.js sortiert Chunk-Objekte; Wasser-Quads werden innerhalb der sichtbaren Meshes nach Kameradistanz sortiert.
- X7: Swept-AABB pro Achse mit 10-ms-Teilschritten und exakter vertikaler Integration. Sprunggeschwindigkeit sqrt(2·24·1,25). Beschleunigung/Reibung, Schwimmen, Fuß-/Augenabfragen, Fallstrecke und diagonaler Kantenschutz. Volle Blockstufen erfordern Springen. Der Treppentest löst Sprünge einzeln aus und setzt die oberste Stufe als Landefläche fort.
- X8: Exakte Amanatides-Woo-DDA. Gleichzeitige Achsenübergänge überspringen nur berührte Zellen; Ecktreffer wählen deterministisch nach Richtungsbetrag, dann X/Y/Z. Start im Block: Entfernung 0, Seite entgegen der dominanten Richtung.
- X9: Vertikales Sonnenlicht und Flood-Fill für Sonne/Blocklicht in Stufen 0–15 vollständig im Worker. 3×3-Chunk-Snapshots enthalten den vollen Ausbreitungsrand. Opazitäts-/Emissionsänderungen invalidieren diese Lichtnachbarschaft, auch im Inneren eines Chunks. Der Shader berechnet max(gebackene Sonne × Tageszeit, Blocklicht). Tageszeitwechsel benötigen kein neues Mesh.
- X10: Horizont-/Zenit-Verlauf, Dämmerung, Sonne/Mond, deterministische Sterne und 64 instanzierte Wolken. Sichtweitennebel verwendet die Horizontfarbe, unter Wasser dichten blauen Nebel. Kamerapitch folgt der positive-oben-Konvention des Vertrags.
- X11: Auswahlrahmen und tiefengeprüftes Overlay mit zehn eigenen prozeduralen Riss-Texturen. Zielwechsel setzt die Risse zurück. Texturen und Geometrien werden freigegeben.
- X12: Enge Welt-AABBs je Render-Pass ersetzen die zu großen Chunk-Kugeln beim Frustum-Culling. Nur sichtbare Wasserflächen werden bei Positionsänderung sortiert. Angeforderte Nachbarn werden vor dem Meshing abgewartet, damit wachsende Chunk-Ränder nicht ständig neu gemesht werden. Beim Weltwechsel werden außerdem die Three.js-Renderlisten geleert, damit alte Geometrien nicht dort festgehalten werden.

## Performance-Messung X12

Gemessen am 15.10.2026 mit Playwright/Edge 155.0.4283.45 auf Windows, Intel Core Ultra 5 125U (14 logische CPUs), Intel Graphics über ANGLE/Direct3D11. Hardwarebeschleunigung aktiv, kein Software-Rendering. 1280×720, DPR 1, Seed 42, Sichtweite 8, alle 197 Chunks geladen und gemesht. Eigene Test-Registry und prozeduraler Atlas, unabhängig von den noch parallel bearbeiteten Spiel-/UI-Bereichen. Je 10 Sekunden stationär und mit Kamerabewegung, nach mindestens einer Sekunde ohne neues Mesh.

| Messwert | Vor Optimierung, stationär | Nach Optimierung, stationär | Nach Optimierung, Bewegung |
|---|---:|---:|---:|
| FPS | 60,08 | 60,05 | 60,07 |
| Framezeit P95 | 16,8 ms | 16,8 ms | 16,8 ms |
| Größte Framezeit | 17,0 ms | 17,0 ms | 17,0 ms |
| CPU-Zeit render() P95 | 2,8 ms | 2,4 ms | 4,6 ms |
| Draw-Calls, Mittel | 139 | 127 | 146,55 |
| Dreiecke, Mittel | 447.034 | 395.902 | 352.562 |
| Welt-update() P95 | 0,2 ms | 0,3 ms | 0,3 ms |

- Im identischen stationären Blick: 8,6 % weniger Draw-Calls und 11,4 % weniger Dreiecke. Die FPS sind durch requestAnimationFrame auf ungefähr 60 begrenzt. Die Bewegungssequenz wurde für die Endmessung auf einen festen Startpunkt umgestellt; ihr Vorher-Wert wird deshalb nicht direkt verglichen.
- Vollständiges Laden und Beruhigen der 197 Chunks: 12,87 s einschließlich Vite-Startseite/Worker-Start und einer Sekunde Ruhezeit. Größter beobachteter update()-Aufruf beim Laden: 2,7 ms.
- Mesh-Arrays: 116.466.552 Byte (111,07 MiB). CDP-Backing-Speicher nach GC vor Leeren: 135.947.552 Byte (129,65 MiB), danach 6.617.512 Byte (6,31 MiB). Verbleibende Chunk-Meshes: **0**. Der Baseline-Renderer hielt nach Leeren noch 55.892.932 Byte fest; Leeren seiner Renderlisten behebt diese Retention.
- Keine Browser-, Worker- oder Shader-Fehler in der Endmessung. Zusätzliche Unit-Tests prüfen Culling beim Drehen, Freigabe von Geometrien/Listenern, veraltete Worker-Antworten, dispose und Licht-Neubauten durch setBlock über Chunk-Grenzen.
- Reproduzieren aus dem Projektordner: `node src/render/benchmark.mjs`. Optional `--software` für eine ausdrücklich getrennte SwiftShader-Messung; `PW_CHROMIUM_PATH` unterstützt einen anderen Chromium. Die Testseite läuft nur lokal über Vite und ist kein zusätzlicher Spieleinstieg im Produktions-Build.
- Rohdaten: `src/render/benchmark-baseline.json`, `src/render/benchmark-results.json`; Bildschirmbilder: `src/render/benchmark-baseline.png`, `src/render/benchmark.png`.
- Die Messung belegt das Ziel auf diesem Laptop und dieser Szene; sie ist keine Messung für alle Seeds, Hardware oder höhere Auflösungen/Sichtweiten.

## Wünsche an die Verträge

Keine Änderungen benötigt.

## Ideen

Keine Zusatzfeatures umgesetzt.
