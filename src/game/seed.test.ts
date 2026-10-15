import { describe, expect, it } from 'vitest';
import { parseSeed } from './game';

describe('parseSeed', () => {
  it('nimmt Ganzzahlen direkt', () => {
    expect(parseSeed('12345')).toBe(12345);
    expect(parseSeed('-7')).toBe(-7);
  });
  it('macht aus Text immer dieselbe Zahl', () => {
    expect(parseSeed('Blockwelt')).toBe(parseSeed('Blockwelt'));
    expect(parseSeed('Blockwelt')).not.toBe(parseSeed('blockwelt'));
  });
  it('würfelt bei leerem Text', () => {
    expect(Number.isInteger(parseSeed(''))).toBe(true);
  });
});
