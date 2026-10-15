import { describe, expect, it } from 'vitest';
import { BLOCK, SEA_LEVEL, type BlockDef } from '../core';
import { findSpawn, type SpawnWorld } from './spawn';

const def = (over: Partial<BlockDef>): BlockDef =>
  ({ solid: true, transparency: 'opaque', shape: 'cube', ...over }) as BlockDef;
const defs: Record<number, BlockDef> = {
  [BLOCK.AIR]: def({ solid: false, transparency: 'invisible', shape: 'none' }),
  [BLOCK.STONE]: def({}),
  [BLOCK.GRASS]: def({}),
  [BLOCK.WATER]: def({ solid: false, transparency: 'translucent', shape: 'liquid' }),
  [BLOCK.LEAVES]: def({ transparency: 'cutout' }),
};
const registry = { getBlockDef: (id: number) => defs[id]! };

/** Welt aus einer Höhenfunktion: Boden bis zur Höhe (Block `top`), darüber Luft. */
function worldFrom(height: (x: number, z: number) => { y: number; block: number } | null, loaded = true): SpawnWorld {
  const at = (x: number, z: number) => height(x, z);
  return {
    isLoaded: () => loaded,
    getSurfaceHeight: (x, z) => at(x, z)?.y ?? -1,
    getBlock: (x, y, z) => {
      const h = at(x, z);
      return h && y === h.y ? h.block : BLOCK.AIR;
    },
  };
}

describe('findSpawn', () => {
  it('nimmt die Mitte, wenn dort Land über dem Wasser liegt', () => {
    const world = worldFrom(() => ({ y: SEA_LEVEL + 1, block: BLOCK.GRASS }));
    expect(findSpawn(world, registry)).toEqual({ x: 8.5, y: SEA_LEVEL + 2, z: 8.5 });
  });

  it('weicht Wasser aus und sucht das nächste Land', () => {
    const world = worldFrom((x) => (x >= 20 ? { y: 65, block: BLOCK.GRASS } : { y: SEA_LEVEL, block: BLOCK.WATER }));
    const spawn = findSpawn(world, registry);
    expect(spawn.x).toBe(20.5);
    expect(spawn.y).toBe(66);
  });

  it('steht nicht auf Baumkronen', () => {
    const world = worldFrom((x) => (x < 12 ? { y: 80, block: BLOCK.LEAVES } : { y: 66, block: BLOCK.GRASS }));
    expect(findSpawn(world, registry).x).toBe(12.5);
  });

  it('Notlösung ohne passenden Platz: knapp über dem Meer', () => {
    const world = worldFrom(() => ({ y: SEA_LEVEL, block: BLOCK.WATER }));
    const spawn = findSpawn(world, registry, 10);
    expect(spawn.y).toBeGreaterThan(SEA_LEVEL);
  });

  it('ungeladene Welt: Notlösung statt Absturz', () => {
    const spawn = findSpawn(worldFrom(() => null, false), registry, 5);
    expect(spawn).toEqual({ x: 8.5, y: SEA_LEVEL + 3, z: 8.5 });
  });
});
