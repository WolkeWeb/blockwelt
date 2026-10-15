/**
 * Überlebensregeln: Leben, Luft, Fallschaden, Ertrinken und langsame Heilung.
 * Reine Funktionen auf einem unveränderlichen {@link Vitals}-Zustand, damit sich alles einzeln testen lässt.
 */
import type { DamageCause, GameMode } from '../core';

/** Maximales Leben in halben Herzen (20 = 10 Herzen). */
export const MAX_HEALTH = 20;
/** Maximale Luft in Ticks (300 = 15 Sekunden). */
export const MAX_AIR = 300;
/** Ab dieser Fallstrecke (Blöcke) gibt es Schaden. */
export const FALL_DAMAGE_THRESHOLD = 4;
/** So viel Luft kommt pro Tick über Wasser zurück. */
const AIR_REGEN_PER_TICK = 10;
/** Ticks zwischen zwei Ertrink-Schäden, wenn keine Luft mehr da ist. */
const DROWN_INTERVAL_TICKS = 20;
/** Schaden pro Ertrink-Schritt (1 Herz). */
const DROWN_DAMAGE = 2;
/** Ticks, bis sich ein halbes Herz erholt (4 Sekunden). */
const REGEN_INTERVAL_TICKS = 80;
/** Unterhalb dieser Höhe fällt der Spieler aus der Welt. */
export const VOID_Y = -20;

/** Lebenszustand des Spielers. */
export interface Vitals {
  readonly health: number;
  readonly air: number;
  /** Zählt Ticks ohne Luft bis zum nächsten Ertrink-Schaden. */
  readonly drownTimer: number;
  /** Zählt Ticks bis zur nächsten Heilung. */
  readonly regenTimer: number;
}

/** Voller Zustand zu Beginn bzw. nach dem Respawn. */
export function freshVitals(): Vitals {
  return { health: MAX_HEALTH, air: MAX_AIR, drownTimer: 0, regenTimer: 0 };
}

/**
 * Schaden durch einen Sturz. Bis 3 Blöcke Fallhöhe passiert nichts, ab 4 Blöcken
 * ein halbes Herz pro Block über 3 (4 Blöcke = 1, 10 Blöcke = 7).
 */
export function fallDamage(distance: number): number {
  if (distance < FALL_DAMAGE_THRESHOLD) return 0;
  return Math.ceil(distance - 3);
}

/** Zieht Schaden ab (Leben bleibt zwischen 0 und `MAX_HEALTH`). */
export function applyDamage(vitals: Vitals, amount: number): Vitals {
  if (amount <= 0) return vitals;
  return { ...vitals, health: Math.max(0, vitals.health - amount), regenTimer: 0 };
}

/** Ob der Spieler gestorben ist. */
export function isDead(vitals: Vitals): boolean {
  return vitals.health <= 0;
}

/** Ergebnis eines Tick-Schritts. */
export interface VitalsStep {
  readonly vitals: Vitals;
  /** Schaden in diesem Tick (halbe Herzen), 0 = keiner. */
  readonly damage: number;
  /** Ursache des Schadens, wenn `damage > 0`. */
  readonly cause: DamageCause | null;
}

/**
 * Ein Tick Luft und Heilung.
 * - Kreativ: immer voll, nie Schaden.
 * - Kopf unter Wasser: Luft sinkt um 1 pro Tick; ist sie leer, gibt es alle 20 Ticks 2 Schaden (Ertrinken).
 * - Kopf über Wasser: Luft füllt sich schnell wieder; Leben regeneriert sich langsam.
 */
export function stepVitals(vitals: Vitals, mode: GameMode, headInWater: boolean): VitalsStep {
  if (mode === 'creative') return { vitals: freshVitals(), damage: 0, cause: null };
  if (isDead(vitals)) return { vitals, damage: 0, cause: null };

  let { air, drownTimer, regenTimer, health } = vitals;
  let damage = 0;
  if (headInWater) {
    if (air > 0) {
      air--;
      drownTimer = 0;
    } else if (++drownTimer >= DROWN_INTERVAL_TICKS) {
      drownTimer = 0;
      damage = DROWN_DAMAGE;
    }
  } else {
    air = Math.min(MAX_AIR, air + AIR_REGEN_PER_TICK);
    drownTimer = 0;
  }

  if (damage === 0 && health < MAX_HEALTH) {
    if (++regenTimer >= REGEN_INTERVAL_TICKS) {
      regenTimer = 0;
      health++;
    }
  } else if (health >= MAX_HEALTH) {
    regenTimer = 0;
  }

  const next = applyDamage({ health, air, drownTimer, regenTimer }, damage);
  return { vitals: next, damage, cause: damage > 0 ? 'drown' : null };
}
