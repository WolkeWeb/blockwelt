/**
 * Vertrag für die Welt (Bereich `src/world/`, Codex).
 *
 * Die Welt verwaltet Blockdaten in Chunks (16 × 16 × 128), erzeugt sie deterministisch aus dem Seed,
 * lädt/entlädt sie rund um den Spieler und baut daraus Meshes, die der Renderer nur noch anzeigt.
 *
 * `src/world/index.ts` exportiert `createWorld` mit der Signatur {@link CreateWorld}.
 *
 * @module core/world
 */

import type { AtlasLayout, BlockDef } from './registry';
import type { BlockId, Unsubscribe, Vec3 } from './types';

/** Optionen zum Erzeugen einer Welt. Reine Daten, dürfen an Worker geschickt werden. */
export interface WorldOptions {
  /** Seed als 32-Bit-Ganzzahl. Gleicher Seed = gleiche Welt (bis auf gespeicherte Änderungen). */
  readonly seed: number;
  /** Alle Blockdefinitionen (`registry.blocks`): dicht, `blocks[id].id === id`. */
  readonly blocks: readonly BlockDef[];
  /** Atlas-Layout für Textur-Koordinaten oder `null` (dann Farben aus `BlockDef.color`). */
  readonly atlas: AtlasLayout | null;
}

/** Eine Blockänderung. */
export interface BlockChange {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Block vor der Änderung. */
  readonly previous: BlockId;
  /** Block nach der Änderung. */
  readonly current: BlockId;
}

/**
 * Vertex-Daten eines Teil-Meshes. Alle Arrays beschreiben dieselben Vertices; Index `i` gehört zu
 * `positions[3i..3i+2]`, `uvs[2i..2i+1]` usw. Dreiecke gegen den Uhrzeigersinn = Vorderseite (three.js-Standard).
 */
export interface MeshBuffers {
  /** Positionen x, y, z **relativ zum Chunk-Ursprung** (`cx * 16`, `0`, `cz * 16`). */
  readonly positions: Float32Array;
  /** Normalen x, y, z. */
  readonly normals: Float32Array;
  /** Textur-Koordinaten u, v laut Atlas (siehe `UVRect`). Ohne Atlas beliebig (z. B. 0). */
  readonly uvs: Float32Array;
  /**
   * Farbe r, g, b (0–1) je Vertex: Blockfarbe (ohne Atlas) bzw. Weiß/Tönung (mit Atlas),
   * multipliziert mit Ambient Occlusion.
   */
  readonly colors: Float32Array;
  /**
   * Licht je Vertex, zwei Werte 0–1: [Himmelslicht, Blocklicht].
   * Der Renderer berechnet: `helligkeit = max(himmelslicht * zeitInfo.day.skyLight, blocklicht)`.
   */
  readonly light: Float32Array;
  /** Dreiecks-Indizes. */
  readonly indices: Uint32Array;
}

/**
 * Fertiges Mesh eines Chunks, getrennt nach Render-Durchgang.
 * Leere Durchgänge haben leere Arrays (nicht `null`).
 */
export interface ChunkMesh {
  /** Chunk-Koordinate X (`Math.floor(x / 16)`). */
  readonly cx: number;
  /** Chunk-Koordinate Z. */
  readonly cz: number;
  /** Zählt bei jedem Neuaufbau dieses Chunks hoch. Ältere Revisionen dürfen verworfen werden. */
  readonly revision: number;
  /** Undurchsichtige Flächen (`transparency: 'opaque'`). */
  readonly opaque: MeshBuffers;
  /** Alpha-getestete Flächen (`'cutout'`: Blätter, Glas, Fackel). */
  readonly cutout: MeshBuffers;
  /** Halbdurchsichtige Flächen (`'translucent'`: Wasser). Werden zuletzt und sortiert gezeichnet. */
  readonly translucent: MeshBuffers;
}

/**
 * Die Welt. Alle Koordinaten sind Block-Koordinaten (ganzzahlig; Kommazahlen werden mit `Math.floor` abgerundet).
 */
export interface World {
  /** Der Seed, mit dem die Welt erzeugt wurde. */
  readonly seed: number;

  /**
   * Block an einer Position.
   * Unterhalb von Y = 0 → `BLOCK.BEDROCK`, ab Y = 128 → `BLOCK.AIR`,
   * in nicht geladenen Chunks → `BLOCK.AIR` (mit {@link isLoaded} prüfen).
   */
  getBlock(x: number, y: number, z: number): BlockId;

  /**
   * Setzt einen Block. Löst {@link onBlockChanged} aus und baut die betroffenen Meshes neu
   * (inklusive Nachbar-Chunks an der Grenze). Gibt `false` zurück, wenn Y außerhalb 0–127 liegt.
   * Ist der Chunk nicht geladen, wird die Änderung vorgemerkt und beim Erzeugen des Chunks angewendet
   * (so kann die Spiellogik gespeicherte Änderungen jederzeit einspielen); dann gibt es kein Event, Rückgabe `true`.
   * Setzen auf denselben Block ist erlaubt und ändert nichts (kein Event).
   */
  setBlock(x: number, y: number, z: number, id: BlockId): boolean;

  /** Ob der Chunk, der die Spalte (x, z) enthält, erzeugt und abfragbar ist. */
  isLoaded(x: number, z: number): boolean;

  /**
   * Y-Koordinate des höchsten Blocks in der Spalte (x, z), der nicht Luft ist (Wasser zählt mit),
   * oder `-1`, wenn die Spalte leer oder nicht geladen ist.
   */
  getSurfaceHeight(x: number, z: number): number;

  /**
   * Lädt Chunks im Umkreis `renderDistance` (in Chunks, kreisförmig) um die Spielerposition,
   * näheste zuerst, und entlädt Chunks außerhalb (`renderDistance + 1`).
   * Wird von der Spiellogik einmal pro Tick aufgerufen und darf nicht blockieren:
   * pro Aufruf nur begrenzt Arbeit, Rest im Hintergrund (Worker) oder in späteren Aufrufen.
   */
  update(playerPosition: Vec3, renderDistance: number): void;

  /** Meldet jede Blockänderung (über `setBlock` oder welteigene Vorgänge). */
  onBlockChanged(listener: (change: BlockChange) => void): Unsubscribe;

  /** Meldet, dass ein Chunk erzeugt wurde und abfragbar ist. */
  onChunkLoaded(listener: (cx: number, cz: number) => void): Unsubscribe;

  /** Meldet ein neues oder neu gebautes Chunk-Mesh (für den Renderer). */
  onChunkMesh(listener: (mesh: ChunkMesh) => void): Unsubscribe;

  /** Meldet, dass ein Chunk entladen wurde; sein Mesh ist zu entfernen. */
  onChunkUnloaded(listener: (cx: number, cz: number) => void): Unsubscribe;

  /** Alle aktuell vorhandenen Meshes (z. B. wenn der Renderer eine bereits laufende Welt übernimmt). */
  getChunkMeshes(): Iterable<ChunkMesh>;

  /** Gibt alle Ressourcen frei (Worker beenden, Speicher). Danach ist die Welt unbenutzbar. */
  dispose(): void;
}

/** Signatur der Fabrik, die `src/world/index.ts` als `createWorld` exportiert. */
export type CreateWorld = (options: WorldOptions) => World;
