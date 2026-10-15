/**
 * Vertrag für die Physik (Bereich `src/physics/`, Codex).
 *
 * `src/physics/index.ts` exportiert die Funktionen `stepPlayer` ({@link StepPlayer}) und `raycast` ({@link Raycast}).
 * Beide sind reine Funktionen ohne eigenen Zustand (abgesehen vom übergebenen `PlayerBody`).
 *
 * @module core/physics
 */

import type { Registry } from './registry';
import type { BlockId, Face, Vec3 } from './types';
import type { World } from './world';

/** Was die Physik von der Welt braucht. `World` erfüllt das; Tests können einfache Objekte übergeben. */
export type BlockSource = Pick<World, 'getBlock' | 'isLoaded'>;

/** Was die Physik von der Registry braucht. `Registry` erfüllt das. */
export type BlockDefSource = Pick<Registry, 'getBlockDef'>;

/**
 * Physikalischer Zustand des Spielers. Wird von {@link StepPlayer} direkt verändert.
 * Die Hitbox ist `PLAYER_WIDTH × PLAYER_HEIGHT × PLAYER_WIDTH` (0,6 × 1,8 × 0,6).
 */
export interface PlayerBody {
  /** Position der **Füße**: Mitte der Unterseite der Hitbox. Augen = `position.y + PLAYER_EYE_HEIGHT`. */
  position: Vec3;
  /** Geschwindigkeit in Blöcken pro Sekunde. */
  velocity: Vec3;
  /** Steht auf festem Boden (nach dem letzten Schritt). */
  onGround: boolean;
  /** Hitbox berührt einen Flüssigkeitsblock (`shape: 'liquid'`). */
  inWater: boolean;
  /** Augenhöhe liegt in einem Flüssigkeitsblock (für Ertrinken und Unterwasser-Darstellung). */
  headInWater: boolean;
  /**
   * Bisherige Fallstrecke in Blöcken seit dem letzten Bodenkontakt. Wird von der Physik geführt:
   * wächst beim Fallen, wird bei Bodenkontakt, im Wasser und beim Fliegen auf 0 gesetzt.
   */
  fallDistance: number;
}

/** Steuerung für einen Physikschritt, von der Spiellogik aus Tastatur und Maus ermittelt. */
export interface MovementInput {
  /** Vorwärts (+1) / rückwärts (−1), Zwischenwerte erlaubt. */
  forward: number;
  /** Rechts (+1) / links (−1). */
  strafe: number;
  /** Blickrichtung um die Y-Achse in Radiant (Konvention siehe `directionFromAngles` in `core/types.ts`). */
  yaw: number;
  /** Springen (am Boden) bzw. aufwärts schwimmen / fliegen. */
  jump: boolean;
  /** Schleichen: langsamer, fällt nicht von Kanten. Beim Fliegen: abwärts. */
  sneak: boolean;
  /** Sprinten: schneller (ca. 1,3×). */
  sprint: boolean;
  /** Fliegen (Kreativmodus): keine Schwerkraft, `jump` = hoch, `sneak` = runter. */
  flying: boolean;
  /** Kollision aus (nur Platzhalter/Debug). Normalerweise `false`. */
  noClip?: boolean;
}

/** Ergebnis eines Physikschritts. */
export interface StepResult {
  /** `true`, wenn der Spieler in diesem Schritt auf dem Boden gelandet ist. */
  landed: boolean;
  /** Bei `landed`: zurückgelegte Fallstrecke vor der Landung in Blöcken (Grundlage für Fallschaden), sonst 0. */
  fallDistance: number;
}

/**
 * Bewegt den Spieler um einen Zeitschritt.
 *
 * Erwartetes Verhalten der echten Implementierung: AABB-Kollision Achse für Achse, Schwerkraft,
 * Sprunghöhe ca. 1,25 Blöcke, Gehen ca. 4,3 Blöcke/s, Sprinten ca. 5,6 Blöcke/s, Schleichen ca. 1,3 Blöcke/s,
 * Bodenreibung, Schwimmen und langsames Sinken im Wasser, Schleichen verhindert Fallen von Kanten.
 * Nicht geladene Chunks gelten als fest (der Spieler fällt nicht durch die Welt, solange sie lädt).
 *
 * @param world Blockabfrage.
 * @param blocks Blockdefinitionen (für `solid`, `shape`).
 * @param body Zustand des Spielers; wird direkt verändert.
 * @param input Steuerung.
 * @param dt Zeitschritt in Sekunden (normalerweise `TICK_SECONDS` = 0,05).
 */
export type StepPlayer = (
  world: BlockSource,
  blocks: BlockDefSource,
  body: PlayerBody,
  input: MovementInput,
  dt: number,
) => StepResult;

/** Treffer eines Raycasts. */
export interface RaycastHit {
  /** Ganzzahlige Position des getroffenen Blocks. */
  readonly block: Vec3;
  /** ID des getroffenen Blocks. */
  readonly blockId: BlockId;
  /** Getroffene Seite des Blocks. */
  readonly face: Face;
  /** Position, an der ein neuer Block gesetzt würde: `block + FACE_NORMALS[face]`. */
  readonly place: Vec3;
  /** Genauer Auftreffpunkt in Weltkoordinaten. */
  readonly point: Vec3;
  /** Entfernung vom Ursprung in Blöcken. */
  readonly distance: number;
}

/**
 * Sucht den ersten anvisierbaren Block entlang eines Strahls.
 * Anvisierbar sind alle Blöcke außer `shape: 'none'` (Luft) und `shape: 'liquid'` (Wasser).
 * Nicht geladene Chunks beenden den Strahl ohne Treffer.
 *
 * @param world Blockabfrage.
 * @param blocks Blockdefinitionen.
 * @param origin Startpunkt (normalerweise die Augenposition).
 * @param direction Richtung (muss nicht normiert sein, darf aber nicht null sein).
 * @param maxDistance Maximale Länge in Blöcken (normalerweise `PLAYER_REACH`).
 * @returns Treffer oder `null`.
 */
export type Raycast = (
  world: BlockSource,
  blocks: BlockDefSource,
  origin: Vec3,
  direction: Vec3,
  maxDistance: number,
) => RaycastHit | null;
