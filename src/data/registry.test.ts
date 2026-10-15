import { describe, expect, it } from 'vitest';
import { BLOCK } from '../core';
import { createRegistry } from './index';

describe('Registry (Platzhalter)', () => {
  const registry = createRegistry();

  it('ist dicht nach ID sortiert und beginnt mit Luft', () => {
    registry.blocks.forEach((block, index) => expect(block.id).toBe(index));
    expect(registry.getBlockDef(BLOCK.AIR).name).toBe('air');
  });

  it('enthält die fünf Platzhalter-Blöcke mit festen IDs', () => {
    for (const id of [BLOCK.GRASS, BLOCK.DIRT, BLOCK.STONE, BLOCK.LOG, BLOCK.LEAVES]) {
      expect(registry.getBlockDef(id).name).not.toMatch(/^unknown/);
    }
  });

  it('liefert für unbekannte IDs einen Platzhalter statt undefined', () => {
    expect(registry.getBlockDef(9999).color).toBe(0xff00ff);
  });

  it('hat zu jedem Block ein Block-Item', () => {
    expect(registry.getItemDef('stone')?.block).toBe(BLOCK.STONE);
  });
});
