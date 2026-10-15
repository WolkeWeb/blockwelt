import { expect, it } from 'vitest';
import * as THREE from 'three';
import { sortTransparentFaces } from './transparency';

it('sortiert transparente Flächen bei wechselnder Kameraseite von hinten nach vorne', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, 1,0,0, 1,1,0, 0,1,0, 0,0,8, 1,0,8, 1,1,8, 0,1,8], 3));
  geometry.setIndex([0,1,2, 0,2,3, 4,5,6, 4,6,7]);
  sortTransparentFaces(geometry, new THREE.Vector3(0, 0, -2));
  expect(geometry.getIndex()!.getX(0)).toBe(4);
  sortTransparentFaces(geometry, new THREE.Vector3(0, 0, 10));
  expect(geometry.getIndex()!.getX(0)).toBe(0);
  geometry.dispose();
});
