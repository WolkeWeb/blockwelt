/**
 * Grundlegende Typen und Konstanten, die alle Bereiche gemeinsam nutzen.
 *
 * Dieser Ordner (`src/core/`) ist der Vertrag zwischen den Bereichen. Er enthält nur Typen,
 * Konstanten und winzige, reine Hilfsfunktionen – keine Spiellogik. In Phase 1 darf ihn niemand ändern.
 *
 * Koordinatensystem (gilt überall):
 * - Y zeigt nach oben. 1 Einheit = 1 Block.
 * - Der Block mit den ganzzahligen Koordinaten (x, y, z) füllt den Würfel [x, x+1) × [y, y+1) × [z, z+1).
 * - Norden = −Z, Süden = +Z, Osten = +X, Westen = −X.
 *
 * @module core/types
 */

/** Dreidimensionaler Vektor bzw. Punkt. Bewusst ein einfaches Objekt (kein THREE.Vector3), damit der Vertrag ohne three auskommt. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Numerische ID eines Blocktyps (0–65535). `0` ist immer Luft.
 * Blöcke werden in Chunks als Zahlen gespeichert (z. B. `Uint16Array`).
 * Feste IDs der bekannten Blöcke stehen in {@link BLOCK} (`core/blocks.ts`).
 */
export type BlockId = number;

/**
 * Textuelle ID eines Items, `snake_case`, z. B. `"stick"` oder `"wooden_pickaxe"`.
 * Das Item eines platzierbaren Blocks hat dieselbe ID wie der technische Name des Blocks
 * (`BlockDef.name`), z. B. `"stone"`.
 */
export type ItemId = string;

/**
 * Ein Stapel gleicher Items in einem Inventar-Slot. Ein leerer Slot ist `null`, nie ein Stapel mit `count: 0`.
 * Stapel werden als unveränderlich behandelt: Wer einen Stapel ändern will, erzeugt einen neuen.
 */
export interface ItemStack {
  /** Welches Item. */
  readonly item: ItemId;
  /** Anzahl, 1 bis `ItemDef.maxStack`. */
  readonly count: number;
  /**
   * Nur bei Werkzeugen: verbleibende Haltbarkeit (1 bis `ToolDef.maxDurability`).
   * Fehlt das Feld bei einem Werkzeug, ist es neu (volle Haltbarkeit).
   */
  readonly durability?: number;
}

/**
 * Eine Seite eines Blocks.
 * - `top` = +Y, `bottom` = −Y
 * - `north` = −Z, `south` = +Z
 * - `east` = +X, `west` = −X
 */
export type Face = 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west';

/** Alle sechs Seiten in fester Reihenfolge (praktisch für Schleifen und Meshing). */
export const FACES: readonly Face[] = ['top', 'bottom', 'north', 'south', 'east', 'west'];

/** Normale (Richtung nach außen) jeder Seite als ganzzahliger Vektor. */
export const FACE_NORMALS: Readonly<Record<Face, Readonly<Vec3>>> = {
  top: { x: 0, y: 1, z: 0 },
  bottom: { x: 0, y: -1, z: 0 },
  north: { x: 0, y: 0, z: -1 },
  south: { x: 0, y: 0, z: 1 },
  east: { x: 1, y: 0, z: 0 },
  west: { x: -1, y: 0, z: 0 },
};

/**
 * Spielmodus.
 * - `survival`: Leben, Fallschaden, Ertrinken, Abbauzeit, begrenzte Blöcke.
 * - `creative`: Fliegen, unendliche Blöcke, sofortiges Abbauen, kein Schaden.
 */
export type GameMode = 'survival' | 'creative';

/** Funktion, die eine Anmeldung (Listener) wieder entfernt. */
export type Unsubscribe = () => void;

// ---------------------------------------------------------------------------
// Feste Eckdaten der Welt und des Spielers (siehe AGENTS.md)
// ---------------------------------------------------------------------------

/** Kantenlänge eines Chunks in X und Z (Blöcke). */
export const CHUNK_SIZE = 16;
/** Höhe eines Chunks und damit der Welt (Blöcke). Gültige Y-Werte: 0 bis 127. */
export const CHUNK_HEIGHT = 128;
/** Wasserspiegel: Wasser füllt alles bis einschließlich dieser Höhe (Y = 62). */
export const SEA_LEVEL = 62;

/** Logik-Ticks pro Sekunde. Die Spiellogik läuft mit festem Zeitschritt. */
export const TICKS_PER_SECOND = 20;
/** Dauer eines Ticks in Sekunden (0,05 s). */
export const TICK_SECONDS = 1 / TICKS_PER_SECOND;
/** Länge eines Tages in Ticks: 20 Minuten Echtzeit = 24 000 Ticks. */
export const DAY_LENGTH_TICKS = 20 * 60 * TICKS_PER_SECOND;

/** Breite (X und Z) der Spieler-Hitbox in Blöcken. */
export const PLAYER_WIDTH = 0.6;
/** Höhe der Spieler-Hitbox in Blöcken. */
export const PLAYER_HEIGHT = 1.8;
/** Augenhöhe über den Füßen in Blöcken. */
export const PLAYER_EYE_HEIGHT = 1.62;
/** Reichweite zum Abbauen und Setzen in Blöcken (gemessen ab Augenposition). */
export const PLAYER_REACH = 5;

/** Standard-Sichtweite in Chunks (Radius). */
export const DEFAULT_RENDER_DISTANCE = 8;
/** Kleinste und größte einstellbare Sichtweite in Chunks. */
export const MIN_RENDER_DISTANCE = 2;
export const MAX_RENDER_DISTANCE = 16;

// ---------------------------------------------------------------------------
// Kleine reine Hilfsfunktionen
// ---------------------------------------------------------------------------

/** Chunk-Koordinate zu einer Block- oder Weltkoordinate (X oder Z). Funktioniert auch für negative Werte. */
export function toChunkCoord(v: number): number {
  return Math.floor(v / CHUNK_SIZE);
}

/** Eindeutiger Schlüssel für einen Chunk, z. B. für `Map`s: `"cx,cz"`. */
export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

/**
 * Blickrichtung als Einheitsvektor.
 *
 * Konvention für alle Bereiche:
 * - `yaw` in Radiant um die Y-Achse. `yaw = 0` blickt nach Norden (−Z), positiver Yaw dreht nach links
 *   (gegen den Uhrzeigersinn von oben gesehen; `yaw = π/2` blickt nach Westen, −X). Entspricht `camera.rotation.y` in three.js.
 * - `pitch` in Radiant, positiv = nach oben, Bereich −π/2 … π/2.
 */
export function directionFromAngles(yaw: number, pitch: number): Vec3 {
  const cp = Math.cos(pitch);
  return { x: -Math.sin(yaw) * cp, y: Math.sin(pitch), z: -Math.cos(yaw) * cp };
}
