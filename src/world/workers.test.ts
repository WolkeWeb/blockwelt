import { afterEach, expect, it, vi } from 'vitest';
import { BLOCK, type ChunkMesh } from '../core';
import { createWorld } from './index';
import { BLOCKS } from './test-blocks';
import type { EngineJob, EngineResult } from './workers';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<EngineResult>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  job: EngineJob | null = null;
  terminated = false;
  constructor() { FakeWorker.instances.push(this); }
  postMessage(message: EngineJob | { options: unknown }): void { if ('kind' in message) this.job = message; }
  terminate(): void { this.terminated = true; }
  reply(result: EngineResult): void { this.job = null; this.onmessage?.({ data: result } as MessageEvent<EngineResult>); }
}
const buffers = () => ({ positions: new Float32Array(), normals: new Float32Array(), colors: new Float32Array(),
  light: new Float32Array(), uvs: new Float32Array(), indices: new Uint32Array() });
const emptyMesh = (job: EngineJob): ChunkMesh => ({ cx: job.cx, cz: job.cz, revision: 'revision' in job ? job.revision : 0,
  opaque: buffers(), cutout: buffers(), translucent: buffers() });
afterEach(() => { vi.unstubAllGlobals(); FakeWorker.instances = []; });

it('begrenzt Worker-Jobs und verwirft überholte Meshes nach setBlock', () => {
  vi.stubGlobal('Worker', FakeWorker);
  const world = createWorld({ seed: 1, blocks: BLOCKS, atlas: null }), received: ChunkMesh[] = [];
  world.onChunkMesh(m => received.push(m));
  world.update({ x: 0, y: 70, z: 0 }, 0);
  const worker = FakeWorker.instances[0];
  expect(worker.job?.kind).toBe('generate'); expect(FakeWorker.instances).toHaveLength(2);
  worker.reply(new Uint16Array(16 * 16 * 128));
  world.update({ x: 0, y: 70, z: 0 }, 0);
  const oldJob = worker.job!; expect(oldJob.kind).toBe('mesh');
  world.setBlock(1, 60, 1, BLOCK.STONE);
  worker.reply(emptyMesh(oldJob)); expect(received).toHaveLength(0);
  world.update({ x: 0, y: 70, z: 0 }, 0);
  const newJob = worker.job!;
  worker.reply(emptyMesh(newJob)); expect(received).toHaveLength(1);
  expect(received[0].revision).toBeGreaterThan(emptyMesh(oldJob).revision);
  world.dispose(); expect(FakeWorker.instances.every(w => w.terminated)).toBe(true);
});
it('ignoriert Ergebnisse von inzwischen weit entfernten Chunks und arbeitet nach dispose nicht weiter', () => {
  vi.stubGlobal('Worker', FakeWorker);
  const world = createWorld({ seed: 1, blocks: BLOCKS, atlas: null });
  world.update({ x: 0, y: 70, z: 0 }, 0);
  world.update({ x: 1000, y: 70, z: 1000 }, 0);
  FakeWorker.instances[0].reply(new Uint16Array(32768));
  expect(world.isLoaded(0, 0)).toBe(false);
  world.dispose(); FakeWorker.instances[1].reply(new Uint16Array(32768));
  expect(world.isLoaded(1000, 1000)).toBe(false);
});
