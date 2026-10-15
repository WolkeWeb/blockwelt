import { describe, expect, it } from 'vitest';
import { dayPhase, dayTimeFromTicks, isNight, moonDirection, sunDirection } from './time';

describe('Tageszeit', () => {
  it('Mittag ist hell, Mitternacht dunkel', () => {
    expect(dayTimeFromTicks(6000).skyLight).toBeCloseTo(1);
    expect(dayTimeFromTicks(18000).skyLight).toBeCloseTo(0.2);
  });
  it('rechnet über mehrere Tage', () => {
    const t = dayTimeFromTicks(24000 * 3 + 6000);
    expect(t.ticks).toBe(6000);
    expect(t.fraction).toBeCloseTo(0.25);
  });
});

describe('Sonne und Mond', () => {
  it('Sonne geht im Osten auf, steht mittags oben, geht im Westen unter', () => {
    const rise = sunDirection(dayTimeFromTicks(0));
    expect(rise.x).toBeCloseTo(1);
    expect(rise.y).toBeCloseTo(0);
    expect(sunDirection(dayTimeFromTicks(6000)).y).toBeCloseTo(1);
    const set = sunDirection(dayTimeFromTicks(12000));
    expect(set.x).toBeCloseTo(-1);
  });
  it('Mond steht gegenüber', () => {
    const day = dayTimeFromTicks(6000);
    expect(moonDirection(day).y).toBeCloseTo(-1);
    expect(isNight(day)).toBe(false);
    expect(isNight(dayTimeFromTicks(18000))).toBe(true);
  });
  it('Himmelslicht wächst vom Sonnenuntergang zur Nacht stetig kleiner', () => {
    let last = 2;
    for (let tick = 9000; tick <= 15000; tick += 500) {
      const light = dayTimeFromTicks(tick).skyLight;
      expect(light).toBeLessThanOrEqual(last);
      last = light;
    }
    expect(dayTimeFromTicks(0).skyLight).toBeGreaterThan(0.2);
  });
  it('benennt Tagesabschnitte', () => {
    expect(dayPhase(dayTimeFromTicks(0))).toBe('morning');
    expect(dayPhase(dayTimeFromTicks(6000))).toBe('day');
    expect(dayPhase(dayTimeFromTicks(12000))).toBe('evening');
    expect(dayPhase(dayTimeFromTicks(18000))).toBe('night');
  });
  it('Zeit läuft über Tagesgrenzen und negative Werte', () => {
    expect(dayTimeFromTicks(-1000).ticks).toBe(23000);
  });
});
