/**
 * Tageszeit aus Ticks (Konvention siehe `DayTime` in `core/render.ts`).
 * PLATZHALTER aus Phase 0, wird in Phase 1 (C6) ausgebaut.
 */
import { DAY_LENGTH_TICKS, type DayTime } from '../core';

/** Himmelslicht in der Nacht. */
const NIGHT_LIGHT = 0.2;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Berechnet die Tageszeit aus der Gesamtzahl der Ticks. */
export function dayTimeFromTicks(totalTicks: number): DayTime {
  const ticks = ((totalTicks % DAY_LENGTH_TICKS) + DAY_LENGTH_TICKS) % DAY_LENGTH_TICKS;
  const fraction = ticks / DAY_LENGTH_TICKS;
  const sunAngle = fraction * Math.PI * 2;
  const skyLight = NIGHT_LIGHT + (1 - NIGHT_LIGHT) * smoothstep(-0.15, 0.2, Math.sin(sunAngle));
  return { totalTicks, ticks, fraction, sunAngle, skyLight };
}
