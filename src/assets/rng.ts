/**
 * Winziger deterministischer Zufallsgenerator für die prozeduralen Texturen.
 *
 * Alle Texturen werden mit einem festen Seed aus ihrem Namen erzeugt – dadurch sehen sie
 * bei jedem Start exakt gleich aus (Vertrag: `createTextureAtlas` ist deterministisch).
 *
 * @module assets/rng
 */

/** Zufallsquelle mit festem Startwert. */
export interface Rng {
  /** Nächste Zahl im Bereich [0, 1). */
  next(): number;
  /** Ganzzahl in [min, max] (beide inklusive). */
  int(min: number, max: number): number;
  /** `true` mit Wahrscheinlichkeit `p` (0–1). */
  chance(p: number): boolean;
  /** Zufälliger Eintrag aus `items`. */
  pick<T>(items: readonly T[]): T;
}

/** Stabiler 32-Bit-Hash eines Textes (FNV-1a). Gleicher Text → gleiche Zahl. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Erzeugt einen Zufallsgenerator aus einer Zahl oder einem Text. */
export function createRng(seed: number | string): Rng {
  let state = (typeof seed === 'string' ? hashString(seed) : seed) | 0;
  const next = (): number => {
    // mulberry32
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length) % items.length],
  };
}
