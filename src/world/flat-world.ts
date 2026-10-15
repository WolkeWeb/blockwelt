/**
 * PLATZHALTER aus Phase 0: flache Welt, synchron im Hauptthread erzeugt.
 * Schichten: Y 0 Stein … Y 59 Stein, Y 60–62 Erde, Y 63 Gras. Darüber Luft.
 * Wird in Phase 1 (X1–X5) durch die echte Welt ersetzt.
 */
import {
  BLOCK,
  CHUNK_HEIGHT,
  CHUNK_SIZE,
  chunkKey,
  toChunkCoord,
  type BlockChange,
  type BlockDef,
  type BlockId,
  type ChunkMesh,
  type CreateWorld,
  type Unsubscribe,
  type Vec3,
  type World,
  type WorldOptions,
} from '../core';
import { buildChunkMesh } from './mesher';

/** Höhe der Grasoberfläche der flachen Welt. */
export const FLAT_SURFACE_Y = 63;

/** Wie viele Chunks pro `update`-Aufruf höchstens erzeugt bzw. gemesht werden. */
const CHUNKS_PER_UPDATE = 4;

interface Chunk {
  readonly cx: number;
  readonly cz: number;
  readonly data: Uint16Array;
  mesh: ChunkMesh | null;
  dirty: boolean;
  revision: number;
}

function index(lx: number, y: number, lz: number): number {
  return (y * CHUNK_SIZE + lz) * CHUNK_SIZE + lx;
}

function generateFlat(): Uint16Array {
  const data = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);
  for (let y = 0; y <= FLAT_SURFACE_Y; y++) {
    const id = y === FLAT_SURFACE_Y ? BLOCK.GRASS : y >= FLAT_SURFACE_Y - 3 ? BLOCK.DIRT : BLOCK.STONE;
    data.fill(id, index(0, y, 0), index(0, y + 1, 0));
  }
  return data;
}

class Listeners<A extends unknown[]> {
  private readonly set = new Set<(...args: A) => void>();
  add(listener: (...args: A) => void): Unsubscribe {
    this.set.add(listener);
    return () => this.set.delete(listener);
  }
  emit(...args: A): void {
    for (const listener of [...this.set]) listener(...args);
  }
  clear(): void {
    this.set.clear();
  }
}

class FlatWorld implements World {
  readonly seed: number;
  private readonly blocks: readonly BlockDef[];
  private readonly chunks = new Map<string, Chunk>();
  private readonly pending = new Map<string, Map<number, BlockId>>();
  private readonly blockChanged = new Listeners<[BlockChange]>();
  private readonly chunkLoaded = new Listeners<[number, number]>();
  private readonly chunkMesh = new Listeners<[ChunkMesh]>();
  private readonly chunkUnloaded = new Listeners<[number, number]>();

  constructor(options: WorldOptions) {
    this.seed = options.seed;
    this.blocks = options.blocks;
  }

  private chunkAt(x: number, z: number): Chunk | undefined {
    return this.chunks.get(chunkKey(toChunkCoord(x), toChunkCoord(z)));
  }

  getBlock(x: number, y: number, z: number): BlockId {
    x = Math.floor(x);
    y = Math.floor(y);
    z = Math.floor(z);
    if (y < 0) return BLOCK.BEDROCK;
    if (y >= CHUNK_HEIGHT) return BLOCK.AIR;
    const chunk = this.chunkAt(x, z);
    if (!chunk) return BLOCK.AIR;
    return chunk.data[index(x - chunk.cx * CHUNK_SIZE, y, z - chunk.cz * CHUNK_SIZE)];
  }

  setBlock(x: number, y: number, z: number, id: BlockId): boolean {
    x = Math.floor(x);
    y = Math.floor(y);
    z = Math.floor(z);
    if (y < 0 || y >= CHUNK_HEIGHT) return false;
    const cx = toChunkCoord(x);
    const cz = toChunkCoord(z);
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;
    const chunk = this.chunks.get(chunkKey(cx, cz));
    if (!chunk) {
      const key = chunkKey(cx, cz);
      let changes = this.pending.get(key);
      if (!changes) this.pending.set(key, (changes = new Map()));
      changes.set(index(lx, y, lz), id);
      return true;
    }
    const i = index(lx, y, lz);
    const previous = chunk.data[i];
    if (previous === id) return true;
    chunk.data[i] = id;
    chunk.dirty = true;
    // Nachbarn an der Grenze neu bauen
    if (lx === 0) this.markDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) this.markDirty(cx + 1, cz);
    if (lz === 0) this.markDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) this.markDirty(cx, cz + 1);
    this.blockChanged.emit({ x, y, z, previous, current: id });
    return true;
  }

  private markDirty(cx: number, cz: number): void {
    const chunk = this.chunks.get(chunkKey(cx, cz));
    if (chunk) chunk.dirty = true;
  }

  isLoaded(x: number, z: number): boolean {
    return this.chunkAt(Math.floor(x), Math.floor(z)) !== undefined;
  }

  getSurfaceHeight(x: number, z: number): number {
    if (!this.isLoaded(x, z)) return -1;
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      if (this.getBlock(x, y, z) !== BLOCK.AIR) return y;
    }
    return -1;
  }

  update(playerPosition: Vec3, renderDistance: number): void {
    const pcx = toChunkCoord(playerPosition.x);
    const pcz = toChunkCoord(playerPosition.z);

    // Entladen
    for (const [key, chunk] of this.chunks) {
      const dx = chunk.cx - pcx;
      const dz = chunk.cz - pcz;
      if (dx * dx + dz * dz > (renderDistance + 1) * (renderDistance + 1)) {
        this.chunks.delete(key);
        this.chunkUnloaded.emit(chunk.cx, chunk.cz);
      }
    }

    // Laden: näheste zuerst
    const missing: [number, number, number][] = [];
    for (let dz = -renderDistance; dz <= renderDistance; dz++) {
      for (let dx = -renderDistance; dx <= renderDistance; dx++) {
        const d = dx * dx + dz * dz;
        if (d > renderDistance * renderDistance) continue;
        if (!this.chunks.has(chunkKey(pcx + dx, pcz + dz))) missing.push([d, pcx + dx, pcz + dz]);
      }
    }
    missing.sort((a, b) => a[0] - b[0]);
    for (const [, cx, cz] of missing.slice(0, CHUNKS_PER_UPDATE)) this.loadChunk(cx, cz);

    // Meshen: näheste zuerst, Nachbarn müssen geladen sein (sonst fehlen Flächen an der Grenze)
    const dirty = [...this.chunks.values()]
      .filter((c) => c.dirty && this.neighborsLoaded(c.cx, c.cz))
      .sort((a, b) => (a.cx - pcx) ** 2 + (a.cz - pcz) ** 2 - ((b.cx - pcx) ** 2 + (b.cz - pcz) ** 2));
    for (const chunk of dirty.slice(0, CHUNKS_PER_UPDATE)) {
      chunk.dirty = false;
      chunk.revision++;
      chunk.mesh = buildChunkMesh(chunk.cx, chunk.cz, chunk.revision, this.blocks, (x, y, z) =>
        this.getBlock(x, y, z),
      );
      this.chunkMesh.emit(chunk.mesh);
    }
  }

  private neighborsLoaded(cx: number, cz: number): boolean {
    return (
      this.chunks.has(chunkKey(cx + 1, cz)) &&
      this.chunks.has(chunkKey(cx - 1, cz)) &&
      this.chunks.has(chunkKey(cx, cz + 1)) &&
      this.chunks.has(chunkKey(cx, cz - 1))
    );
  }

  private loadChunk(cx: number, cz: number): void {
    const key = chunkKey(cx, cz);
    const chunk: Chunk = { cx, cz, data: generateFlat(), mesh: null, dirty: true, revision: 0 };
    const changes = this.pending.get(key);
    if (changes) {
      for (const [i, id] of changes) chunk.data[i] = id;
      this.pending.delete(key);
    }
    this.chunks.set(key, chunk);
    this.markDirty(cx + 1, cz);
    this.markDirty(cx - 1, cz);
    this.markDirty(cx, cz + 1);
    this.markDirty(cx, cz - 1);
    this.chunkLoaded.emit(cx, cz);
  }

  onBlockChanged(listener: (change: BlockChange) => void): Unsubscribe {
    return this.blockChanged.add(listener);
  }
  onChunkLoaded(listener: (cx: number, cz: number) => void): Unsubscribe {
    return this.chunkLoaded.add(listener);
  }
  onChunkMesh(listener: (mesh: ChunkMesh) => void): Unsubscribe {
    return this.chunkMesh.add(listener);
  }
  onChunkUnloaded(listener: (cx: number, cz: number) => void): Unsubscribe {
    return this.chunkUnloaded.add(listener);
  }

  *getChunkMeshes(): Iterable<ChunkMesh> {
    for (const chunk of this.chunks.values()) if (chunk.mesh) yield chunk.mesh;
  }

  dispose(): void {
    this.chunks.clear();
    this.pending.clear();
    for (const l of [this.blockChanged, this.chunkLoaded, this.chunkMesh, this.chunkUnloaded]) l.clear();
  }
}

/** Erzeugt die (Platzhalter-)Welt. */
export const createFlatWorld: CreateWorld = (options) => new FlatWorld(options);
