import { describe, expect, it } from 'vitest';
import { durabilityColor, durabilityPercent } from './slots';

describe('Haltbarkeitsbalken (O5)', () => {
  it('rechnet den Anteil in Prozent', () => {
    expect(durabilityPercent(59, 59)).toBe(100);
    expect(durabilityPercent(30, 60)).toBeCloseTo(50);
    expect(durabilityPercent(0, 59)).toBe(0);
  });

  it('zeigt bei einem neuen Werkzeug (kein Feld) keinen Balken', () => {
    expect(durabilityPercent(undefined, 59)).toBeNull();
  });

  it('begrenzt Werte auf den gültigen Bereich', () => {
    expect(durabilityPercent(120, 59)).toBe(100);
    expect(durabilityPercent(-5, 59)).toBe(0);
  });

  it('färbt den Balken grün, gelb und rot', () => {
    expect(durabilityColor(100)).toBe('#4ce04c');
    expect(durabilityColor(40)).toBe('#e0d24c');
    expect(durabilityColor(10)).toBe('#e04c4c');
  });
});
