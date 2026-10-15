import { createNoise2D, createNoise3D } from 'simplex-noise';
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
  private readonly caveA;
  private readonly caveB;
  private readonly ore;
  constructor(readonly seed: number) {
    this.noise = createNoise2D(randomFromSeed(seed));
    this.caveA = createNoise3D(randomFromSeed(seed ^ 0x6ac379));
    this.caveB = createNoise3D(randomFromSeed(seed ^ 0x1234ab));
    this.ore = createNoise3D(randomFromSeed(seed ^ 0x7f9d35));
  }

  height(x: number, z: number): number {
    const n = this.noise;
    const continent = n(x / 420, z / 420);
    const hills = n(x / 95, z / 95) * 5 + n(x / 43, z / 43) * 2 + n(x / 19, z / 19);
    const mountains = Math.max(0, n(x / 280 + 90, z / 280 - 70) - 0.25) * 75;
    return Math.max(8, Math.min(110, Math.floor(63 + continent * 13 + hills + mountains)));
  }

  /** One candidate per 7×7 cell; a two-block crown may extend into any neighbor. */
  tree(cellX: number, cellZ: number): { x: number; y: number; z: number; height: number } | null {
    if (coordinateHash(this.seed ^ 9127, cellX, cellZ) > 0.28) return null;
    const x = cellX * 7 + Math.floor(coordinateHash(this.seed ^ 3719, cellX, cellZ) * 7);
    const z = cellZ * 7 + Math.floor(coordinateHash(this.seed ^ 7261, cellX, cellZ) * 7);
    const y = this.height(x, z) + 1;
    if (y <= SEA_LEVEL + 2 || y > 100) return null;
    return { x, y, z, height: 4 + Math.floor(coordinateHash(this.seed ^ 1357, x, z) * 3) };
  }

  private addTrees(data: Uint16Array, cx: number, cz: number): void {
    const ox = cx * CHUNK_SIZE, oz = cz * CHUNK_SIZE;
    const put = (x: number, y: number, z: number, id: number) => {
      const lx = x - ox, lz = z - oz;
      if (lx < 0 || lx >= 16 || lz < 0 || lz >= 16 || y < 1 || y >= 128) return;
      const i = blockIndex(lx, y, lz);
      if (data[i] === BLOCK.AIR || (id === BLOCK.LOG && data[i] === BLOCK.LEAVES)) data[i] = id;
    };
    for (let gz = Math.floor((oz - 2) / 7); gz <= Math.floor((oz + 17) / 7); gz++) {
      for (let gx = Math.floor((ox - 2) / 7); gx <= Math.floor((ox + 17) / 7); gx++) {
        const t = this.tree(gx, gz);
        if (!t) continue;
        for (let dy = t.height - 3; dy <= t.height; dy++) {
          const radius = dy === t.height ? 1 : 2;
          for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
            if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
            put(t.x + dx, t.y + dy, t.z + dz, BLOCK.LEAVES);
          }
        }
        for (let dy = 0; dy < t.height; dy++) put(t.x, t.y + dy, t.z, BLOCK.LOG);
      }
    }
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
        if (y > 3 && y < height - soil - 1) {
          const i = blockIndex(x, y, z);
          // The intersection of two warped noise isosurfaces forms narrow connected tubes.
          const a = this.caveA(wx / 34, y / 26, wz / 34);
          const b = this.caveB(wx / 34 + 11, y / 26, wz / 34 - 17);
          if (a * a + b * b < 0.022) data[i] = BLOCK.AIR;
          else if (y < 48 && this.ore(wx / 7 + 50, y / 6, wz / 7) > 0.68) data[i] = BLOCK.IRON_ORE;
          else if (y < 96 && this.ore(wx / 9, y / 7, wz / 9) > 0.56) data[i] = BLOCK.COAL_ORE;
        }
      }
    }
    this.addTrees(data, cx, cz);
    return data;
  }
}
