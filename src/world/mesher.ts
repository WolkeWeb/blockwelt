/**
 * Einfaches Meshing (PLATZHALTER aus Phase 0): nur sichtbare Flächen, eine Farbe pro Block,
 * kein Atlas, keine Ambient Occlusion, volles Himmelslicht.
 */
import {
  CHUNK_HEIGHT,
  CHUNK_SIZE,
  FACE_NORMALS,
  FACES,
  type BlockDef,
  type BlockId,
  type ChunkMesh,
  type Face,
  type MeshBuffers,
} from '../core';

/** Eckpunkte jeder Fläche (gegen den Uhrzeigersinn von außen gesehen), relativ zur Blockecke. */
const FACE_CORNERS: Record<Face, readonly [number, number, number][]> = {
  top: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
  bottom: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
  north: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
  south: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
  east: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
  west: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
};

/** Leichte Abschattung je Seite, damit Kanten ohne Licht erkennbar sind. */
const FACE_SHADE: Record<Face, number> = { top: 1, bottom: 0.5, north: 0.8, south: 0.8, east: 0.65, west: 0.65 };

class BufferBuilder {
  positions: number[] = [];
  normals: number[] = [];
  uvs: number[] = [];
  colors: number[] = [];
  light: number[] = [];
  indices: number[] = [];

  addFace(x: number, y: number, z: number, face: Face, color: number): void {
    const base = this.positions.length / 3;
    const n = FACE_NORMALS[face];
    const shade = FACE_SHADE[face];
    const r = ((color >> 16) & 0xff) / 255;
    const g = ((color >> 8) & 0xff) / 255;
    const b = (color & 0xff) / 255;
    const uv = [0, 1, 1, 1, 1, 0, 0, 0];
    FACE_CORNERS[face].forEach(([cx, cy, cz], i) => {
      this.positions.push(x + cx, y + cy, z + cz);
      this.normals.push(n.x, n.y, n.z);
      this.uvs.push(uv[i * 2], uv[i * 2 + 1]);
      this.colors.push(r * shade, g * shade, b * shade);
      this.light.push(1, 0);
    });
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  build(): MeshBuffers {
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      uvs: new Float32Array(this.uvs),
      colors: new Float32Array(this.colors),
      light: new Float32Array(this.light),
      indices: new Uint32Array(this.indices),
    };
  }
}

/** Blockabfrage in Weltkoordinaten (für Nachbarn über Chunk-Grenzen). */
export type BlockLookup = (x: number, y: number, z: number) => BlockId;

/** Baut das Mesh eines Chunks. */
export function buildChunkMesh(
  cx: number,
  cz: number,
  revision: number,
  blocks: readonly BlockDef[],
  getBlock: BlockLookup,
): ChunkMesh {
  const opaque = new BufferBuilder();
  const cutout = new BufferBuilder();
  const translucent = new BufferBuilder();
  const ox = cx * CHUNK_SIZE;
  const oz = cz * CHUNK_SIZE;
  const def = (id: BlockId): BlockDef | undefined => blocks[id];

  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const id = getBlock(ox + lx, y, oz + lz);
        const block = def(id);
        if (!block || block.transparency === 'invisible' || block.shape === 'none') continue;
        const target =
          block.transparency === 'opaque' ? opaque : block.transparency === 'cutout' ? cutout : translucent;
        for (const face of FACES) {
          const n = FACE_NORMALS[face];
          const neighborId = getBlock(ox + lx + n.x, y + n.y, oz + lz + n.z);
          const neighbor = def(neighborId);
          const hidden =
            neighbor !== undefined &&
            (neighbor.transparency === 'opaque' || (neighborId === id && block.transparency !== 'opaque'));
          if (!hidden) target.addFace(lx, y, lz, face, block.color);
        }
      }
    }
  }
  return { cx, cz, revision, opaque: opaque.build(), cutout: cutout.build(), translucent: translucent.build() };
}
