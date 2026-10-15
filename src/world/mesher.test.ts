import { describe, expect, it } from 'vitest';
import { BLOCK, type BlockDef } from '../core';
import { buildChunkMesh } from './mesher';
import { BLOCKS } from './test-blocks';

const mesh = (cells: [number, number, number, number][], blocks: readonly BlockDef[] = BLOCKS) =>
  buildChunkMesh(0, 0, 1, blocks, (x, y, z) => cells.find(c => c[0] === x && c[1] === y && c[2] === z)?.[3] ?? BLOCK.AIR);

describe('Meshing', () => {
  it('entfernt innere Flächen, auch an Chunk-Grenzen', () => {
    expect(mesh([[0, 2, 0, BLOCK.STONE]]).opaque.indices.length).toBe(36);
    expect(mesh([[0, 2, 0, BLOCK.STONE], [1, 2, 0, BLOCK.STONE]]).opaque.indices.length).toBe(60);
    expect(mesh([[0, 2, 0, BLOCK.STONE], [-1, 2, 0, BLOCK.STONE]]).opaque.indices.length).toBe(30);
  });
  it('schattiert Ecken mit zwei Seiten stärker als freie Ecken', () => {
    const result = mesh([[1, 2, 1, BLOCK.STONE], [0, 3, 1, BLOCK.STONE], [1, 3, 0, BLOCK.STONE]]).opaque;
    const corner = Array.from(result.colors.slice(0, 12));
    expect(Math.min(...corner)).toBeLessThan(Math.max(...corner));
    expect(Math.min(...corner)).toBeCloseTo(0x80 / 255 * 0.4);
  });
  it('nutzt Atlas-Rechtecke und Weiß; fehlende Kacheln behalten ihre Ersatzfarbe', () => {
    const regions = { stone: { u0: 0.25, u1: 0.5, v0: 0.5, v1: 0.75 } };
    const defs = BLOCKS.map(b => b.id === BLOCK.STONE ? { ...b, textures: {
      top: 'stone', bottom: 'missing', north: 'stone', south: 'stone', east: 'stone', west: 'stone',
    } } : b);
    const result = buildChunkMesh(0, 0, 1, defs, (x, y, z) => x === 1 && y === 2 && z === 1 ? BLOCK.STONE : BLOCK.AIR,
      { tileSize: 16, width: 64, height: 64, regions }).opaque;
    expect(Array.from(result.uvs.slice(0, 8))).toEqual([0.25, 0.75, 0.5, 0.75, 0.5, 0.5, 0.25, 0.5]);
    expect(result.colors[0]).toBe(1);
    expect(result.uvs[8]).toBe(-1);
    expect(result.colors[12]).toBeCloseTo(0x80 / 255 * 0.5);
  });
});
