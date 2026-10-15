/**
 * Merkt sich, welche Blöcke der Spieler verändert hat, und wandelt sie in speicherbare Chunk-Daten um.
 */
import { CHUNK_HEIGHT, CHUNK_SIZE, chunkKey, toChunkCoord, type BlockId } from '../core';
import type { ChunkChanges } from './types';

/** Position eines Blocks innerhalb seines Chunks als einzelne Zahl: `(y × 16 + z) × 16 + x` (x, z lokal 0–15). */
export function cellIndex(x: number, y: number, z: number): number {
  const lx = ((Math.floor(x) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const lz = ((Math.floor(z) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  return (Math.floor(y) * CHUNK_SIZE + lz) * CHUNK_SIZE + lx;
}

/** Umkehrung von {@link cellIndex}: Weltkoordinaten zu Chunk `(cx, cz)` und Index. */
export function cellPosition(cx: number, cz: number, index: number): { x: number; y: number; z: number } {
  const lx = index % CHUNK_SIZE;
  const lz = Math.floor(index / CHUNK_SIZE) % CHUNK_SIZE;
  const y = Math.floor(index / (CHUNK_SIZE * CHUNK_SIZE));
  return { x: cx * CHUNK_SIZE + lx, y, z: cz * CHUNK_SIZE + lz };
}

interface TrackedChunk {
  readonly cx: number;
  readonly cz: number;
  readonly cells: Map<number, BlockId>;
}

/** Sammelt Blockänderungen pro Chunk und weiß, welche Chunks seit dem letzten Speichern verändert wurden. */
export class ChangeTracker {
  private readonly chunks = new Map<string, TrackedChunk>();
  private readonly dirty = new Set<string>();

  /** Hält eine Änderung fest. Ungültige Höhen werden ignoriert. */
  record(x: number, y: number, z: number, block: BlockId): void {
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    const cx = toChunkCoord(x);
    const cz = toChunkCoord(z);
    const key = chunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = { cx, cz, cells: new Map() };
      this.chunks.set(key, chunk);
    }
    chunk.cells.set(cellIndex(x, y, z), block);
    this.dirty.add(key);
  }

  /** Übernimmt gespeicherte Änderungen (gelten danach als gespeichert, nicht als verändert). */
  load(saved: readonly ChunkChanges[]): void {
    for (const entry of saved) {
      const key = chunkKey(entry.cx, entry.cz);
      const cells = new Map<number, BlockId>();
      entry.indices.forEach((index, i) => cells.set(index, entry.blocks[i]!));
      this.chunks.set(key, { cx: entry.cx, cz: entry.cz, cells });
    }
  }

  /** Ruft `apply` für jede bekannte Änderung auf (z. B. `world.setBlock`). */
  forEach(apply: (x: number, y: number, z: number, block: BlockId) => void): void {
    for (const chunk of this.chunks.values()) {
      for (const [index, block] of chunk.cells) {
        const pos = cellPosition(chunk.cx, chunk.cz, index);
        apply(pos.x, pos.y, pos.z, block);
      }
    }
  }

  /** Ob es ungespeicherte Änderungen gibt. */
  get hasDirty(): boolean {
    return this.dirty.size > 0;
  }

  /** Anzahl veränderter Blöcke insgesamt. */
  get size(): number {
    let n = 0;
    for (const chunk of this.chunks.values()) n += chunk.cells.size;
    return n;
  }

  /** Liefert die seit dem letzten Aufruf veränderten Chunks (vollständig) und markiert alles als gespeichert. */
  takeDirty(): ChunkChanges[] {
    const result: ChunkChanges[] = [];
    for (const key of this.dirty) {
      const chunk = this.chunks.get(key);
      if (!chunk) continue;
      result.push({ cx: chunk.cx, cz: chunk.cz, indices: [...chunk.cells.keys()], blocks: [...chunk.cells.values()] });
    }
    this.dirty.clear();
    return result;
  }

  /** Markiert Chunks wieder als ungespeichert (wenn das Schreiben fehlgeschlagen ist). */
  markDirty(chunks: readonly ChunkChanges[]): void {
    for (const c of chunks) this.dirty.add(chunkKey(c.cx, c.cz));
  }
}
