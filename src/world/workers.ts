import { BLOCK, CHUNK_HEIGHT, CHUNK_SIZE, type BlockId, type ChunkMesh, type WorldOptions } from '../core';
import { buildChunkMesh } from './mesher';
import { TerrainGenerator } from './terrain';
import { blockIndex } from './terrain';
import { LightField } from './lighting';

export interface ChunkSnapshot { cx: number; cz: number; data: Uint16Array }
export type EngineJob =
  | { kind: 'generate'; cx: number; cz: number }
  | { kind: 'mesh'; cx: number; cz: number; revision: number; chunks: ChunkSnapshot[] };
export type EngineResult = Uint16Array | ChunkMesh;

export function executeJob(job: EngineJob, options: WorldOptions, terrain: TerrainGenerator): EngineResult {
  if (job.kind === 'generate') return terrain.generate(job.cx, job.cz);
  const chunks: (Uint16Array | undefined)[] = Array(9);
  for (const c of job.chunks) chunks[(c.cz - job.cz + 1) * 3 + c.cx - job.cx + 1] = c.data;
  const getBlock = (x: number, y: number, z: number): BlockId => {
    if (y < 0) return BLOCK.BEDROCK;
    if (y >= CHUNK_HEIGHT) return BLOCK.AIR;
    const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    const dx = cx - job.cx + 1, dz = cz - job.cz + 1;
    if (dx < 0 || dx > 2 || dz < 0 || dz > 2) return BLOCK.AIR;
    return chunks[dz * 3 + dx]?.[blockIndex(x - cx * 16, y, z - cz * 16)] ?? BLOCK.AIR;
  };
  const lighting = new LightField((job.cx - 1) * 16, (job.cz - 1) * 16, 48, options.blocks, getBlock);
  return buildChunkMesh(job.cx, job.cz, job.revision, options.blocks, getBlock, options.atlas,
    (x, y, z) => lighting.sample(x, y, z));
}

/** Bounded pool, no unbounded job queue or main-thread work in browsers. */
export class EngineWorkers {
  private readonly slots: { worker: Worker; done: ((result: EngineResult | null) => void) | null; job: EngineJob | null }[] = [];
  private readonly terrain: TerrainGenerator;
  private readonly browserWorkers = typeof Worker !== 'undefined';
  private disposed = false;
  constructor(private readonly options: WorldOptions) {
    this.terrain = new TerrainGenerator(options.seed);
    if (typeof Worker === 'undefined') return; // Deterministic synchronous mode for Node tests.
    for (let i = 0; i < 2; i++) {
      const worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
      const slot = { worker, done: null, job: null } as (typeof this.slots)[number];
      worker.postMessage({ options });
      worker.onmessage = (event: MessageEvent<EngineResult>) => {
        const done = slot.done;
        slot.done = null;
        slot.job = null;
        if (!this.disposed) done?.(event.data);
      };
      worker.onerror = (event) => {
        console.error('Engine worker failed', event.message);
        const done = slot.done;
        worker.terminate();
        this.slots.splice(this.slots.indexOf(slot), 1);
        slot.done = null;
        slot.job = null;
        done?.(null);
      };
      this.slots.push(slot);
    }
  }
  get available(): boolean { return !this.disposed && (!this.browserWorkers || this.slots.some(s => !s.done)); }
  run(job: EngineJob, done: (result: EngineResult | null) => void): void {
    if (this.disposed) return;
    if (!this.browserWorkers) { done(executeJob(job, this.options, this.terrain)); return; }
    const slot = this.slots.find(s => !s.done);
    if (!slot) return;
    slot.done = done;
    slot.job = job;
    slot.worker.postMessage(job, job.kind === 'mesh' ? job.chunks.map(c => c.data.buffer) : []);
  }
  dispose(): void {
    this.disposed = true;
    for (const slot of this.slots) { slot.worker.terminate(); slot.done = null; slot.job = null; }
    this.slots.length = 0;
  }
}
