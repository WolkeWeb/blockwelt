import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import type { ChunkMesh, Registry, World } from '../core';
import { createRenderer } from './index';

it('gibt Chunk-Geometrien beim Entladen und Weltwechsel frei und meldet Listener ab', () => {
  const renderer = createRenderer({ registry: {} as Registry, atlas: null });
  const empty = () => ({ positions: new Float32Array(), normals: new Float32Array(), colors: new Float32Array(),
    light: new Float32Array(), uvs: new Float32Array(), indices: new Uint32Array() });
  const mesh: ChunkMesh = { cx: 0, cz: 0, revision: 1, opaque: { ...empty(),
    positions: new Float32Array([0,0,0, 1,0,0, 1,1,0]), indices: new Uint32Array([0,1,2]) }, cutout: empty(), translucent: empty() };
  let onMesh: (mesh: ChunkMesh) => void = () => {}, onUnload: (x: number, z: number) => void = () => {};
  const offMesh = vi.fn(), offUnload = vi.fn();
  const world = { getChunkMeshes: () => [mesh],
    onChunkMesh: (fn: typeof onMesh) => { onMesh = fn; return offMesh; },
    onChunkUnloaded: (fn: typeof onUnload) => { onUnload = fn; return offUnload; },
  } as unknown as World;
  const dispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
  renderer.setWorld(world); expect(renderer.getStats().chunks).toBe(1);
  onUnload(0, 0); expect(renderer.getStats().chunks).toBe(0); expect(dispose).toHaveBeenCalledTimes(1);
  onMesh(mesh); expect(renderer.getStats().chunks).toBe(1);
  renderer.setWorld(null); expect(renderer.getStats().chunks).toBe(0); expect(dispose).toHaveBeenCalledTimes(2);
  expect(offMesh).toHaveBeenCalledOnce(); expect(offUnload).toHaveBeenCalledOnce();
  renderer.dispose(); dispose.mockRestore();
});
