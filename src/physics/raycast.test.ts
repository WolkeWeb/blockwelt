import { describe, expect, it } from 'vitest';
import { BLOCK, type BlockDef, type BlockSource, type Vec3 } from '../core';
import { raycast } from './raycast';
const defs = { getBlockDef: (id: number) => ({ shape: id === BLOCK.AIR ? 'none' : id === BLOCK.WATER ? 'liquid' : 'cube' }) as BlockDef };
const source = (cells: [number, number, number, number][]): BlockSource => ({ isLoaded: () => true,
  getBlock: (x, y, z) => cells.find(c => c[0] === x && c[1] === y && c[2] === z)?.[3] ?? BLOCK.AIR });

describe('DDA', () => {
  it('trifft alle sechs Seiten mit exaktem Auftreffpunkt und normierter Distanz', () => {
    const world = source([[0, 0, 0, BLOCK.STONE]]);
    const cases = [
      [{ x: -2, y: 0.5, z: 0.5 }, { x: 7, y: 0, z: 0 }, 'west', 2],
      [{ x: 3, y: 0.5, z: 0.5 }, { x: -7, y: 0, z: 0 }, 'east', 2],
      [{ x: 0.5, y: 3, z: 0.5 }, { x: 0, y: -7, z: 0 }, 'top', 2],
      [{ x: 0.5, y: -2, z: 0.5 }, { x: 0, y: 7, z: 0 }, 'bottom', 2],
      [{ x: 0.5, y: 0.5, z: -2 }, { x: 0, y: 0, z: 7 }, 'north', 2],
      [{ x: 0.5, y: 0.5, z: 3 }, { x: 0, y: 0, z: -7 }, 'south', 2],
    ] as const;
    for (const [origin, direction, face, distance] of cases) {
      const hit = raycast(world, defs, origin, direction, 5)!;
      expect(hit.face).toBe(face); expect(hit.distance).toBe(distance);
      expect(hit.block).toEqual({ x: 0, y: 0, z: 0 });
      expect(Math.hypot(hit.point.x - origin.x, hit.point.y - origin.y, hit.point.z - origin.z)).toBe(distance);
    }
  });
  it('beachtet die exakte Reichweite, negative Koordinaten und Start auf Blockgrenzen', () => {
    const world = source([[-2, 0, 0, BLOCK.STONE]]);
    expect(raycast(world, defs, { x: 0, y: 0.5, z: 0.5 }, { x: -1, y: 0, z: 0 }, 1)?.distance).toBe(1);
    expect(raycast(world, defs, { x: 0, y: 0.5, z: 0.5 }, { x: -1, y: 0, z: 0 }, 0.999)).toBeNull();
  });
  it('überspringt Wasser und stoppt vor ungeladenen Bereichen', () => {
    const world = source([[1, 0, 0, BLOCK.WATER], [2, 0, 0, BLOCK.GLASS]]);
    const origin = { x: 0.5, y: 0.5, z: 0.5 }, direction = { x: 1, y: 0, z: 0 };
    expect(raycast(world, defs, origin, direction, 5)?.blockId).toBe(BLOCK.GLASS);
    expect(raycast({ ...world, isLoaded: x => x < 2 }, defs, origin, direction, 5)).toBeNull();
  });
  it('behandelt Ecktreffer deterministisch ohne nur berührte Zellen zu treffen', () => {
    const world = source([[1, 0, 0, BLOCK.STONE], [1, 1, 1, BLOCK.GLASS]]);
    const hit = raycast(world, defs, { x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 1, z: 1 }, 5)!;
    expect(hit.blockId).toBe(BLOCK.GLASS); expect(hit.face).toBe('west');
    expect(hit.point.x).toBeCloseTo(1); expect(hit.point.y).toBeCloseTo(1); expect(hit.point.z).toBeCloseTo(1);
    expect(hit.distance).toBeCloseTo(Math.sqrt(3) / 2);
  });
  it('liefert bei Start im Block Distanz null und verwirft ungültige Strahlen', () => {
    const world = source([[0, 0, 0, BLOCK.STONE]]), origin = { x: 0.5, y: 0.5, z: 0.5 };
    expect(raycast(world, defs, origin, { x: 0, y: 1, z: 0 }, 5)?.distance).toBe(0);
    for (const direction of [{ x: 0, y: 0, z: 0 }, { x: NaN, y: 1, z: 0 }]) expect(raycast(world, defs, origin, direction, 5)).toBeNull();
  });
});
