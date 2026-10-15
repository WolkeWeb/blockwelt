import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { directionFromAngles } from '../core';
import { applyCameraState } from './basic-renderer';

describe('applyCameraState', () => {
  it('blickt genau wie directionFromAngles (pitch positiv = nach oben)', () => {
    const camera = new THREE.PerspectiveCamera();
    for (const [yaw, pitch] of [[0, 0], [0, 0.6], [0, -0.6], [1.2, -0.4], [-2.5, 1.1]]) {
      applyCameraState(camera, { position: { x: 1, y: 2, z: 3 }, yaw, pitch });
      camera.updateMatrixWorld();
      const look = camera.getWorldDirection(new THREE.Vector3());
      const expected = directionFromAngles(yaw, pitch);
      expect(look.x).toBeCloseTo(expected.x, 5);
      expect(look.y).toBeCloseTo(expected.y, 5);
      expect(look.z).toBeCloseTo(expected.z, 5);
    }
  });
});
