/**
 * Tag/Nacht-Zyklus. Die Tageszeit ist ein einziger Zähler (`totalTicks`); alles andere wird daraus berechnet.
 * Konvention (siehe `DayTime` in `core/render.ts`): Tick 0 = Sonnenaufgang, 6000 = Mittag, 12 000 = Sonnenuntergang,
 * 18 000 = Mitternacht. Ein Tag hat `DAY_LENGTH_TICKS` = 24 000 Ticks (20 Minuten).
 */
import { DAY_LENGTH_TICKS, type DayTime, type Vec3 } from '../core';

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

/** Richtung zur Sonne als Einheitsvektor: geht im Osten (+X) auf, steht mittags im Zenit, geht im Westen (−X) unter. */
export function sunDirection(day: DayTime): Vec3 {
  return { x: Math.cos(day.sunAngle), y: Math.sin(day.sunAngle), z: 0 };
}

/** Richtung zum Mond: genau gegenüber der Sonne. */
export function moonDirection(day: DayTime): Vec3 {
  const sun = sunDirection(day);
  return { x: -sun.x, y: -sun.y, z: 0 };
}

/** Ob die Sonne unter dem Horizont steht. */
export function isNight(day: DayTime): boolean {
  return Math.sin(day.sunAngle) < 0;
}

/** Name der Tageszeit für Meldungen und Debug-Ausgaben. */
export function dayPhase(day: DayTime): 'morning' | 'day' | 'evening' | 'night' {
  const f = day.fraction;
  if (f < 0.1) return 'morning';
  if (f < 0.4) return 'day';
  if (f < 0.55) return 'evening';
  return 'night';
}
