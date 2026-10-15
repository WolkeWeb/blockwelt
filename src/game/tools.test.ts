import { describe, expect, it } from 'vitest';
import type { BlockDef, ToolDef } from '../core';
import { breakSeconds, breakTicks, canHarvest, rollDrop } from './tools';

const block = (over: Partial<BlockDef>): BlockDef =>
  ({ hardness: 1, preferredTool: null, requiredToolLevel: 0, drop: null, ...over }) as BlockDef;
const tool = (type: ToolDef['type'], level: number, speed: number): ToolDef => ({
  type,
  level,
  speed,
  maxDurability: 59,
  attackDamage: 1,
});

const stone = block({ hardness: 1.5, preferredTool: 'pickaxe', requiredToolLevel: 1 });
const dirt = block({ hardness: 0.5, preferredTool: 'shovel' });

describe('Abbauzeit', () => {
  it('mit der Hand: Härte × 1,5 s', () => {
    expect(breakSeconds(dirt, null, 'survival')).toBeCloseTo(0.75);
  });
  it('passendes Werkzeug teilt durch den Speed', () => {
    expect(breakSeconds(dirt, tool('shovel', 1, 2), 'survival')).toBeCloseTo(0.375);
    expect(breakSeconds(stone, tool('pickaxe', 2, 4), 'survival')).toBeCloseTo(0.5625);
  });
  it('falsches Werkzeug hilft nicht', () => {
    expect(breakSeconds(dirt, tool('pickaxe', 1, 2), 'survival')).toBeCloseTo(0.75);
  });
  it('ohne nötiges Werkzeug dauert es deutlich länger', () => {
    expect(breakSeconds(stone, null, 'survival')).toBeCloseTo(7.5);
  });
  it('Kreativ und Härte 0 sind sofort, Grundgestein nie', () => {
    expect(breakSeconds(stone, null, 'creative')).toBe(0);
    expect(breakSeconds(block({ hardness: 0 }), null, 'survival')).toBe(0);
    expect(breakSeconds(block({ hardness: -1 }), null, 'creative')).toBe(Number.POSITIVE_INFINITY);
  });
  it('rechnet in ganze Ticks um', () => {
    expect(breakTicks(0, 20)).toBe(1);
    expect(breakTicks(0.75, 20)).toBe(15);
    expect(breakTicks(Number.POSITIVE_INFINITY, 20)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('Drops', () => {
  it('Stein droppt nur mit Spitzhacke der nötigen Stufe', () => {
    expect(canHarvest(stone, null)).toBe(false);
    expect(canHarvest(stone, tool('shovel', 3, 2))).toBe(false);
    expect(canHarvest(stone, tool('pickaxe', 1, 2))).toBe(true);
    expect(canHarvest(dirt, null)).toBe(true);
  });
  it('würfelt Wahrscheinlichkeiten', () => {
    const b = block({ drop: { item: 'stick', count: 2, chance: 0.5 } });
    expect(rollDrop(b, () => 0.1)).toEqual({ item: 'stick', count: 2 });
    expect(rollDrop(b, () => 0.9)).toBeNull();
    expect(rollDrop(block({}))).toBeNull();
  });
});
