import { createNoise2D } from 'simplex-noise';
import { BLOCK, CHUNK_HEIGHT, CHUNK_SIZE, SEA_LEVEL } from '../core';

export const blockIndex = (x: number, y: number, z: number): number => (y * CHUNK_SIZE + z) * CHUNK_SIZE + x;

/** Small seeded PRNG; never depends on generation order or Math.random. */
export function randomFromSeed(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function coordinateHash(seed: number, x: number, z: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export class TerrainGenerator {
  private readonly noise;
  constructor(readonly seed: number) {
    this.noise = createNoise2D(randomFromSeed(seed));
  }

  height(x: number, z: number): number {
    const n = this.noise;
    const continent = n(x / 420, z / 420);
    const hills = n(x / 95, z / 95) * 5 + n(x / 43, z / 43) * 2 + n(x / 19, z / 19);
    const mountains = Math.max(0, n(x / 280 + 90, z / 280 - 70) - 0.25) * 75;
    return Math.max(8, Math.min(110, Math.floor(63 + continent * 13 + hills + mountains)));
  }

  generate(cx: number, cz: number): Uint16Array {
    const data = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);
    for (let z = 0; z < CHUNK_SIZE; z++) for (let x = 0; x < CHUNK_SIZE; x++) {
      const wx = cx * CHUNK_SIZE + x, wz = cz * CHUNK_SIZE + z;
      const height = this.height(wx, wz);
      const soil = 3 + Math.floor(coordinateHash(this.seed, wx, wz) * 2);
      const beach = height <= SEA_LEVEL + 1;
      for (let y = 0; y <= Math.max(height, SEA_LEVEL); y++) {
        data[blockIndex(x, y, z)] = y === 0 ? BLOCK.BEDROCK : y > height ? BLOCK.WATER :
          y === height ? (beach ? BLOCK.SAND : BLOCK.GRASS) :
          y >= height - soil ? (beach ? BLOCK.SAND : BLOCK.DIRT) : BLOCK.STONE;
      }
    }
    return data;
  }
}
