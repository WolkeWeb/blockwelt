import { CHUNK_HEIGHT, type BlockDef } from '../core';
import type { BlockLookup } from './mesher';

/** Light for a mesh chunk and a full 16-block border. A level-15 flood cannot cross that border. */
export class LightField {
  readonly sky: Uint8Array;
  readonly block: Uint8Array;
  private readonly opacity: Uint8Array;
  private readonly layer: number;
  constructor(readonly ox: number, readonly oz: number, readonly width: number,
    blocks: readonly BlockDef[], getBlock: BlockLookup) {
    this.layer = width * width;
    const size = this.layer * CHUNK_HEIGHT;
    this.sky = new Uint8Array(size); this.block = new Uint8Array(size); this.opacity = new Uint8Array(size);
    for (let z = 0; z < width; z++) for (let x = 0; x < width; x++) {
      let sun = 15;
      for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
        const i = this.index(x, y, z), def = blocks[getBlock(ox + x, y, oz + z)];
        const opacity = def?.lightOpacity ?? 15;
        this.opacity[i] = opacity;
        sun = Math.max(0, sun - opacity);
        this.sky[i] = sun;
        this.block[i] = def?.lightLevel ?? 0;
      }
    }
    this.flood(this.sky);
    this.flood(this.block);
  }
  private index(x: number, y: number, z: number): number { return y * this.layer + z * this.width + x; }
  private flood(light: Uint8Array): void {
    const count = light.length, queue = new Uint32Array(count), queued = new Uint8Array(count);
    let head = 0, tail = 0, length = 0;
    const push = (i: number) => { if (!queued[i]) { queue[tail] = i; tail = (tail + 1) % count; length++; queued[i] = 1; } };
    // Seed only cells that can improve a neighbor. Full-sun air interiors need no queue entry.
    const canImprove = (i: number, n: number) => light[i] - Math.max(1, this.opacity[n]) > light[n];
    for (let i = 0; i < count; i++) {
      if (light[i] < 2) continue;
      const x = i % this.width, z = Math.floor(i / this.width) % this.width;
      if (x > 0 && canImprove(i, i - 1) || x < this.width - 1 && canImprove(i, i + 1) ||
          z > 0 && canImprove(i, i - this.width) || z < this.width - 1 && canImprove(i, i + this.width) ||
          i >= this.layer && canImprove(i, i - this.layer) || i < count - this.layer && canImprove(i, i + this.layer)) push(i);
    }
    const spread = (source: number, n: number) => {
      const level = light[source] - Math.max(1, this.opacity[n]);
      if (level > light[n]) { light[n] = level; if (level > 1) push(n); }
    };
    while (length) {
      const i = queue[head]; head = (head + 1) % count; length--; queued[i] = 0;
      const x = i % this.width, z = Math.floor(i / this.width) % this.width;
      if (x > 0) spread(i, i - 1);
      if (x < this.width - 1) spread(i, i + 1);
      if (z > 0) spread(i, i - this.width);
      if (z < this.width - 1) spread(i, i + this.width);
      if (i >= this.layer) spread(i, i - this.layer);
      if (i < count - this.layer) spread(i, i + this.layer);
    }
  }
  sample(x: number, y: number, z: number): readonly [number, number] {
    if (y >= CHUNK_HEIGHT) return [1, 0];
    x -= this.ox; z -= this.oz;
    if (y < 0 || x < 0 || z < 0 || x >= this.width || z >= this.width) return [0, 0];
    const i = this.index(x, y, z);
    return [this.sky[i] / 15, this.block[i] / 15];
  }
}
