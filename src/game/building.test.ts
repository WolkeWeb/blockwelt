import { describe, expect, it } from 'vitest';
import { BLOCK, type BlockDef } from '../core';
import { blockOverlapsPlayer, canPlaceBlock } from './building';

const def = (id: number, solid: boolean, replaceable: boolean): BlockDef =>
  ({ id, solid, replaceable }) as unknown as BlockDef;
const defs: Record<number, BlockDef> = {
  [BLOCK.AIR]: def(BLOCK.AIR, false, true),
  [BLOCK.WATER]: def(BLOCK.WATER, false, true),
  [BLOCK.STONE]: def(BLOCK.STONE, true, false),
  [BLOCK.TORCH]: def(BLOCK.TORCH, false, false),
};
const registry = { getBlockDef: (id: number) => defs[id]! };
const worldOf = (cells: Record<string, number>, loaded = true) => ({
  getBlock: (x: number, y: number, z: number) => cells[`${x},${y},${z}`] ?? BLOCK.AIR,
  isLoaded: () => loaded,
});

describe('blockOverlapsPlayer', () => {
  const feet = { x: 0.5, y: 10, z: 0.5 };
  it('erkennt Überlappung mit Füßen und Kopf', () => {
    expect(blockOverlapsPlayer({ x: 0, y: 10, z: 0 }, feet)).toBe(true);
    expect(blockOverlapsPlayer({ x: 0, y: 11, z: 0 }, feet)).toBe(true);
  });
  it('Block direkt unter den Füßen oder über dem Kopf stört nicht', () => {
    expect(blockOverlapsPlayer({ x: 0, y: 9, z: 0 }, feet)).toBe(false);
    expect(blockOverlapsPlayer({ x: 0, y: 12, z: 0 }, feet)).toBe(false);
  });
  it('Nachbarblock außerhalb der Breite stört nicht', () => {
    expect(blockOverlapsPlayer({ x: 1, y: 10, z: 0 }, feet)).toBe(false);
    expect(blockOverlapsPlayer({ x: -1, y: 10, z: 0 }, feet)).toBe(false);
  });
});

describe('canPlaceBlock', () => {
  const feet = { x: 0.5, y: 10, z: 0.5 };
  it('setzt in Luft und Wasser, nicht in feste Blöcke', () => {
    const world = worldOf({ '5,10,5': BLOCK.WATER, '6,10,5': BLOCK.STONE });
    expect(canPlaceBlock(world, registry, { x: 4, y: 10, z: 5 }, BLOCK.STONE, feet)).toBe(true);
    expect(canPlaceBlock(world, registry, { x: 5, y: 10, z: 5 }, BLOCK.STONE, feet)).toBe(true);
    expect(canPlaceBlock(world, registry, { x: 6, y: 10, z: 5 }, BLOCK.STONE, feet)).toBe(false);
  });
  it('nicht in die eigene Hitbox, aber nichtfeste Blöcke dürfen', () => {
    const world = worldOf({});
    expect(canPlaceBlock(world, registry, { x: 0, y: 10, z: 0 }, BLOCK.STONE, feet)).toBe(false);
    expect(canPlaceBlock(world, registry, { x: 0, y: 10, z: 0 }, BLOCK.TORCH, feet)).toBe(true);
  });
  it('nicht außerhalb der Welt oder in ungeladene Chunks', () => {
    expect(canPlaceBlock(worldOf({}), registry, { x: 5, y: 128, z: 5 }, BLOCK.STONE, feet)).toBe(false);
    expect(canPlaceBlock(worldOf({}), registry, { x: 5, y: -1, z: 5 }, BLOCK.STONE, feet)).toBe(false);
    expect(canPlaceBlock(worldOf({}, false), registry, { x: 5, y: 10, z: 5 }, BLOCK.STONE, feet)).toBe(false);
  });
});
