import {
  BLOCK, CHUNK_HEIGHT, CHUNK_SIZE, chunkKey, toChunkCoord,
  type BlockChange, type BlockId, type ChunkMesh, type CreateWorld, type Unsubscribe,
  type Vec3, type World, type WorldOptions,
} from '../core';
import { blockIndex } from './terrain';
import { EngineWorkers, HALO_SIZE, haloIndex } from './workers';

interface Chunk {
  readonly cx: number;
  readonly cz: number;
  readonly data: Uint16Array;
  mesh: ChunkMesh | null;
  dirty: boolean;
  revision: number;
  meshing: boolean;
}
class Listeners<A extends unknown[]> {
  private readonly set = new Set<(...args: A) => void>();
  add(listener: (...args: A) => void): Unsubscribe { this.set.add(listener); return () => this.set.delete(listener); }
  emit(...args: A): void { for (const listener of [...this.set]) listener(...args); }
  clear(): void { this.set.clear(); }
}

class VoxelWorld implements World {
  readonly seed: number;
  private readonly workers: EngineWorkers;
  private readonly chunks = new Map<string, Chunk>();
  /** Sparse edit journal survives unloading; generated data and meshes do not. */
  private readonly edits = new Map<string, Map<number, BlockId>>();
  private readonly generating = new Set<string>();
  private readonly blockChanged = new Listeners<[BlockChange]>();
  private readonly chunkLoaded = new Listeners<[number, number]>();
  private readonly chunkMesh = new Listeners<[ChunkMesh]>();
  private readonly chunkUnloaded = new Listeners<[number, number]>();
  private center = { x: 0, z: 0, radius: 0 };
  private disposed = false;

  constructor(options: WorldOptions) { this.seed = options.seed; this.workers = new EngineWorkers(options); }
  private chunkAt(x: number, z: number): Chunk | undefined { return this.chunks.get(chunkKey(toChunkCoord(x), toChunkCoord(z))); }
  getBlock(x: number, y: number, z: number): BlockId {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (y < 0) return BLOCK.BEDROCK;
    if (y >= CHUNK_HEIGHT) return BLOCK.AIR;
    const c = this.chunkAt(x, z);
    return c ? c.data[blockIndex(x - c.cx * CHUNK_SIZE, y, z - c.cz * CHUNK_SIZE)] : BLOCK.AIR;
  }
  setBlock(x: number, y: number, z: number, id: BlockId): boolean {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (this.disposed || y < 0 || y >= CHUNK_HEIGHT) return false;
    const cx = toChunkCoord(x), cz = toChunkCoord(z), key = chunkKey(cx, cz);
    const lx = x - cx * CHUNK_SIZE, lz = z - cz * CHUNK_SIZE, i = blockIndex(lx, y, lz);
    const c = this.chunks.get(key);
    if (c?.data[i] === id) return true;
    let changes = this.edits.get(key);
    if (!changes) this.edits.set(key, changes = new Map());
    changes.set(i, id);
    if (!c) return true;
    const previous = c.data[i]; c.data[i] = id;
    this.markDirty(cx, cz);
    // AO samples diagonal chunks as well as face neighbors.
    for (const dx of [0, ...(lx === 0 ? [-1] : lx === 15 ? [1] : [])])
      for (const dz of [0, ...(lz === 0 ? [-1] : lz === 15 ? [1] : [])]) this.markDirty(cx + dx, cz + dz);
    this.blockChanged.emit({ x, y, z, previous, current: id });
    return true;
  }
  private markDirty(cx: number, cz: number): void {
    const c = this.chunks.get(chunkKey(cx, cz));
    if (c) { c.dirty = true; c.revision++; }
  }
  private neighborsDirty(cx: number, cz: number): void {
    for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) this.markDirty(cx + x, cz + z);
  }
  isLoaded(x: number, z: number): boolean { return !!this.chunkAt(Math.floor(x), Math.floor(z)); }
  getSurfaceHeight(x: number, z: number): number {
    if (!this.isLoaded(x, z)) return -1;
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) if (this.getBlock(x, y, z) !== BLOCK.AIR) return y;
    return -1;
  }
  private distance(cx: number, cz: number): number { return (cx - this.center.x) ** 2 + (cz - this.center.z) ** 2; }
  update(position: Vec3, renderDistance: number): void {
    if (this.disposed) return;
    const radius = Math.max(0, Math.min(16, Math.floor(renderDistance)));
    this.center = { x: toChunkCoord(position.x), z: toChunkCoord(position.z), radius };
    for (const [key, c] of this.chunks) if (this.distance(c.cx, c.cz) > (radius + 1) ** 2) {
      this.chunks.delete(key); this.neighborsDirty(c.cx, c.cz); this.chunkUnloaded.emit(c.cx, c.cz);
    }
    const dirty = [...this.chunks.values()].filter(c => c.dirty && !c.meshing)
      .sort((a, b) => this.distance(a.cx, a.cz) - this.distance(b.cx, b.cz));
    // Bounded snapshots; expensive generation/meshing happens in workers.
    for (const c of dirty.slice(0, 2)) {
      if (!this.workers.available) break;
      this.meshChunk(c);
    }
    const missing: [number, number, number][] = [];
    for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
      const cx = this.center.x + dx, cz = this.center.z + dz, d = dx * dx + dz * dz, key = chunkKey(cx, cz);
      if (d <= radius * radius && !this.chunks.has(key) && !this.generating.has(key)) missing.push([d, cx, cz]);
    }
    missing.sort((a, b) => a[0] - b[0]);
    for (const [, cx, cz] of missing.slice(0, 2)) {
      if (!this.workers.available) break;
      const key = chunkKey(cx, cz);
      this.generating.add(key);
      this.workers.run({ kind: 'generate', cx, cz }, result => {
        this.generating.delete(key);
        if (!result || this.disposed || this.distance(cx, cz) > (this.center.radius + 1) ** 2) return;
        const data = result as Uint16Array;
        for (const [i, id] of this.edits.get(key) ?? []) data[i] = id;
        this.chunks.set(key, { cx, cz, data, mesh: null, dirty: true, revision: 1, meshing: false });
        this.neighborsDirty(cx, cz); this.chunkLoaded.emit(cx, cz);
      });
    }
  }
  private meshChunk(c: Chunk): void {
    const halo = new Uint16Array(HALO_SIZE * HALO_SIZE * CHUNK_HEIGHT);
    for (let y = 0; y < CHUNK_HEIGHT; y++) for (let z = -1; z <= 16; z++) for (let x = -1; x <= 16; x++)
      halo[haloIndex(x, y, z)] = this.getBlock(c.cx * 16 + x, y, c.cz * 16 + z);
    const revision = c.revision;
    c.dirty = false; c.meshing = true;
    this.workers.run({ kind: 'mesh', cx: c.cx, cz: c.cz, revision, halo }, result => {
      c.meshing = false;
      if (!result) { c.dirty = true; return; }
      if (this.disposed || this.chunks.get(chunkKey(c.cx, c.cz)) !== c || revision !== c.revision) return;
      c.mesh = result as ChunkMesh; this.chunkMesh.emit(c.mesh);
    });
  }
  onBlockChanged(listener: (change: BlockChange) => void): Unsubscribe { return this.blockChanged.add(listener); }
  onChunkLoaded(listener: (cx: number, cz: number) => void): Unsubscribe { return this.chunkLoaded.add(listener); }
  onChunkMesh(listener: (mesh: ChunkMesh) => void): Unsubscribe { return this.chunkMesh.add(listener); }
  onChunkUnloaded(listener: (cx: number, cz: number) => void): Unsubscribe { return this.chunkUnloaded.add(listener); }
  *getChunkMeshes(): Iterable<ChunkMesh> { for (const c of this.chunks.values()) if (c.mesh) yield c.mesh; }
  dispose(): void {
    this.disposed = true; this.workers.dispose(); this.chunks.clear(); this.edits.clear(); this.generating.clear();
    for (const l of [this.blockChanged, this.chunkLoaded, this.chunkMesh, this.chunkUnloaded]) l.clear();
  }
}
export const createVoxelWorld: CreateWorld = options => new VoxelWorld(options);
