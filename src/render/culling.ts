import * as THREE from 'three';

/** Chunk spheres are tall: precise world-space boxes avoid drawing chunks behind the eye. */
export class ChunkCuller {
  private readonly frustum = new THREE.Frustum();
  private readonly matrix = new THREE.Matrix4();
  update(groups: Iterable<THREE.Group>, camera: THREE.PerspectiveCamera): void {
    camera.updateMatrixWorld();
    this.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.matrix);
    for (const group of groups) {
      group.visible = false;
      for (const mesh of group.children) {
        mesh.visible = this.frustum.intersectsBox(mesh.userData.worldBounds as THREE.Box3);
        group.visible ||= mesh.visible;
      }
    }
  }
}
