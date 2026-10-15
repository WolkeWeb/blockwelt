# Notizen: Codex

## Entscheidungen
- X1: Weltweite Simplex-Oktaven mit eigenem 32-Bit-PRNG. Höhen 8–110, Meer bis einschließlich Y=62; Sand bei Oberflächen bis Y=63, 3–4 Bodenschichten. Grundgestein verwendet die feste BLOCK.BEDROCK-ID; Unzerstörbarkeit durch die Blockdefinition (negative Härte) und Spiellogik.
- Änderungen an tasks/codex.md und dieser Notizdatei erfolgen gemäß der ausdrücklich verlangten Aufgabenpflege zusätzlich zu den drei eigenen Quellordnern.

## Wünsche an die Verträge

## Ideen
- X2: Baumkandidaten in globalen 7×7-Zellen; jeder Chunk berücksichtigt Kandidaten im Kronenrand von zwei Blöcken. Keine nachträglichen Nachbar-Schreibzugriffe.
- X3: Höhlen schneiden zwei 3D-Noise-Isoflächen zu verbundenen Röhren, geschützt durch mindestens drei Bodenschichten. Eigene Seed-Ströme für Höhlen/Erze; Kohle bis Y95, Eisen bis Y47.
- X4: Zwei Modul-Worker, maximal zwei neue Jobs pro Tick, distanzsortiertes Laden und Meshing. 18×18×128-Snapshots als Transferables; Revisionsprüfung verwirft veraltete Meshes. Sparse Änderungen bleiben beim Entladen, Worker und Daten werden bei dispose freigegeben. Node-Tests nutzen denselben Job-Code synchron. Vite-Worker-Build benötigt hier Sandbox-Eskalation (realpath EPERM).
