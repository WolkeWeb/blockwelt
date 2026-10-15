import { BLOCK, CHUNK_HEIGHT, CHUNK_SIZE, type BlockId, type ChunkMesh, type WorldOptions } from '../core';
import { buildChunkMesh } from './mesher';
import { TerrainGenerator } from './terrain';

export const HALO_SIZE = CHUNK_SIZE + 2;
export const haloIndex = (x: number, y: number, z: number): number => (y * HALO_SIZE + z + 1) * HALO_SIZE + x + 1;
export type EngineJob =
  | { kind: 'generate'; cx: number; cz: number }
  | { kind: 'mesh'; cx: number; cz: number; revision: number; halo: Uint16Array };
export type EngineResult = Uint16Array | ChunkMesh;

export function executeJob(job: EngineJob, options: WorldOptions, terrain: TerrainGenerator): EngineResult {
  if (job.kind === 'generate') return terrain.generate(job.cx, job.cz);
  return buildChunkMesh(job.cx, job.cz, job.revision, options.blocks, (x, y, z): BlockId => {
    if (y < 0) return BLOCK.BEDROCK;
    if (y >= CHUNK_HEIGHT) return BLOCK.AIR;
    return job.halo[haloIndex(x - job.cx * CHUNK_SIZE, y, z - job.cz * CHUNK_SIZE)];
  }, options.atlas);
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
    slot.worker.postMessage(job, job.kind === 'mesh' ? [job.halo.buffer] : []);
  }
  dispose(): void {
    this.disposed = true;
    for (const slot of this.slots) { slot.worker.terminate(); slot.done = null; slot.job = null; }
    this.slots.length = 0;
  }
}
