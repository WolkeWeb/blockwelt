/**
 * Steuerlogik rund um die Bewegung: Sprinten (Strg oder zweimal schnell W) und die Umrechnung der Tasten
 * in eine `MovementInput` für `stepPlayer`.
 */
import type { MovementInput } from '../core';

/** Zeitfenster für ein Doppeltippen in Ticks (0,3 s). */
export const DOUBLE_TAP_TICKS = 6;

/** Gedrückte Tasten, wie sie die Bewegung braucht. */
export interface MovementKeys {
  readonly forward: boolean;
  readonly back: boolean;
  readonly left: boolean;
  readonly right: boolean;
  readonly jump: boolean;
  readonly sneak: boolean;
  readonly ctrl: boolean;
}

/**
 * Merkt sich, ob der Spieler sprintet.
 * Sprint beginnt mit Strg + vorwärts oder durch zweimal schnelles W; er endet, sobald W losgelassen wird oder der Spieler schleicht.
 */
export class SprintTracker {
  private lastTap = Number.NEGATIVE_INFINITY;
  private doubleTapActive = false;

  /**
   * Ein Tick.
   * @param tick Laufende Tick-Nummer.
   * @param wPressed W wurde seit dem letzten Tick neu gedrückt.
   * @param keys Aktuell gehaltene Tasten.
   * @returns Ob der Spieler in diesem Tick sprintet.
   */
  update(tick: number, wPressed: boolean, keys: MovementKeys): boolean {
    if (wPressed) {
      if (tick - this.lastTap <= DOUBLE_TAP_TICKS) this.doubleTapActive = true;
      this.lastTap = tick;
    }
    if (!keys.forward || keys.sneak) this.doubleTapActive = false;
    return keys.forward && !keys.sneak && (keys.ctrl || this.doubleTapActive);
  }

  reset(): void {
    this.lastTap = Number.NEGATIVE_INFINITY;
    this.doubleTapActive = false;
  }
}

/** Baut die Steuerung für einen Physikschritt. */
export function buildMovementInput(keys: MovementKeys, yaw: number, sprint: boolean, flying: boolean): MovementInput {
  return {
    forward: (keys.forward ? 1 : 0) - (keys.back ? 1 : 0),
    strafe: (keys.right ? 1 : 0) - (keys.left ? 1 : 0),
    yaw,
    jump: keys.jump,
    sneak: keys.sneak,
    sprint,
    flying,
  };
}
