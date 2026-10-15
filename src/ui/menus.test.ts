import { describe, expect, it } from 'vitest';
import { deathLabel, modeLabel } from './menus';

describe('Menüs (O9)', () => {
  it('nennt die Spielmodi auf Deutsch', () => {
    expect(modeLabel('survival')).toBe('Überleben');
    expect(modeLabel('creative')).toBe('Kreativ');
  });

  it('beschreibt jede Todesursache', () => {
    expect(deathLabel('fall')).toContain('gefallen');
    expect(deathLabel('drown')).toContain('ertrunken');
    expect(deathLabel('void')).toContain('Leere');
    expect(deathLabel('other')).toContain('gestorben');
    expect(deathLabel(null)).toContain('gestorben');
  });
});
