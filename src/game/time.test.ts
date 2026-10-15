import { describe, expect, it } from 'vitest';
import { dayTimeFromTicks } from './time';

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
