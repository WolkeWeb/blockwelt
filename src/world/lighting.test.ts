import { describe, expect, it } from 'vitest';
import { BLOCK } from '../core';
import { LightField } from './lighting';
import { BLOCKS } from './test-blocks';
import { buildChunkMesh } from './mesher';

describe('Licht', () => {
  it('trägt Sonne durch Luft und Glas und schwächt sie durch Blätter/Wasser ab', () => {
    const field = new LightField(0, 0, 32, BLOCKS, (x, y) => y !== 100 ? BLOCK.AIR :
      x === 1 ? BLOCK.GLASS : x === 2 ? BLOCK.LEAVES : x === 3 ? BLOCK.WATER : BLOCK.STONE);
    expect(field.sample(1, 100, 16)[0]).toBe(1);
    expect(field.sample(2, 100, 16)[0]).toBe(14 / 15);
    expect(field.sample(3, 100, 16)[0]).toBe(13 / 15);
    expect(field.sample(31, 50, 16)[0]).toBe(0);
  });
  it('breitet Blocklicht über Chunk-Grenzen aus und entfernt es nach Quellenabbau', () => {
    const lookup = (torch: boolean) => (x: number, y: number, z: number) => y === 20 ? BLOCK.STONE :
      torch && x === 15 && y === 5 && z === 16 ? BLOCK.TORCH : BLOCK.AIR;
    const field = new LightField(0, 0, 48, BLOCKS, lookup(true));
    expect(field.sample(15, 5, 16)).toEqual([0, 14 / 15]);
    expect(field.sample(16, 5, 16)).toEqual([0, 13 / 15]);
    expect(field.sample(28, 5, 16)[1]).toBe(1 / 15);
    expect(field.sample(29, 5, 16)[1]).toBe(0);
    const removed = new LightField(0, 0, 48, BLOCKS, lookup(false));
    expect(removed.sample(16, 5, 16)[1]).toBe(0);
  });
  it('blockiert Licht an festen Wänden und backt getrennte Sonnen-/Blockwerte ins Mesh', () => {
    const getBlock = (x: number, y: number, z: number) => y === 20 || x === 16 ? BLOCK.STONE :
      x === 15 && y === 5 && z === 16 ? BLOCK.TORCH : BLOCK.AIR;
    const field = new LightField(0, 0, 32, BLOCKS, getBlock);
    expect(field.sample(17, 5, 16)[1]).toBe(0);
    const mesh = buildChunkMesh(0, 1, 1, BLOCKS, getBlock, null, (x, y, z) => field.sample(x, y, z));
    expect(Array.from(mesh.cutout.light).some((v, i) => i % 2 === 1 && v === Math.fround(14 / 15))).toBe(true);
    expect(mesh.cutout.light[0]).toBe(0);
  });
});
