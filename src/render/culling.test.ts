import * as THREE from 'three';
import { expect, it } from 'vitest';
import { ChunkCuller } from './culling';

it('verwirft Chunks hinter und seitlich der Kamera und zeigt sie nach Drehung wieder', () => {
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 128);
  const culler = new ChunkCuller();
  const groupAt = (x: number, z: number) => {
    const group = new THREE.Group(), mesh = new THREE.Object3D();
    mesh.userData.worldBounds = new THREE.Box3(new THREE.Vector3(x, -5, z), new THREE.Vector3(x + 16, 5, z + 16));
    group.add(mesh); return group;
  };
  const front = groupAt(-8, -48), back = groupAt(-8, 32), side = groupAt(100, -32);
  culler.update([front, back, side], camera);
  expect(front.visible).toBe(true); expect(back.visible).toBe(false); expect(side.visible).toBe(false);
  camera.rotation.y = Math.PI;
  culler.update([front, back, side], camera);
  expect(front.visible).toBe(false); expect(back.visible).toBe(true);
});
