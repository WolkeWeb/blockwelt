import { describe, expect, it } from 'vitest';
import { DAY_LENGTH_TICKS, FACE_NORMALS, FACES, directionFromAngles, toChunkCoord } from './types';
import { BLOCK, BLOCK_NAMES } from './blocks';

describe('core/types', () => {
  it('Chunk-Koordinaten runden auch bei negativen Werten richtig ab', () => {
    expect(toChunkCoord(0)).toBe(0);
    expect(toChunkCoord(15.9)).toBe(0);
    expect(toChunkCoord(16)).toBe(1);
    expect(toChunkCoord(-1)).toBe(-1);
    expect(toChunkCoord(-16)).toBe(-1);
    expect(toChunkCoord(-17)).toBe(-2);
  });

  it('Blickrichtung: yaw 0 = Norden (−Z), yaw π/2 = Westen (−X), pitch π/2 = oben', () => {
    const n = directionFromAngles(0, 0);
    expect(n.x).toBeCloseTo(0);
    expect(n.z).toBeCloseTo(-1);
    const w = directionFromAngles(Math.PI / 2, 0);
    expect(w.x).toBeCloseTo(-1);
    expect(directionFromAngles(0, Math.PI / 2).y).toBeCloseTo(1);
  });

  it('jede Seite hat eine Normale', () => {
    for (const face of FACES) expect(FACE_NORMALS[face]).toBeDefined();
  });

  it('ein Tag dauert 24 000 Ticks', () => {
    expect(DAY_LENGTH_TICKS).toBe(24000);
  });

  it('jede bekannte Block-ID hat einen Namen und IDs sind eindeutig', () => {
    const ids = Object.values(BLOCK);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(BLOCK_NAMES[id]).toMatch(/^[a-z_]+$/);
  });
});
