import * as THREE from 'three';

/** Sort quads as units, preserving AO-dependent triangulation and winding. */
export function sortTransparentFaces(geometry: THREE.BufferGeometry, eye: THREE.Vector3): void {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  if (!index) return;
  let faces = geometry.userData.faces as { indices: number[]; center: THREE.Vector3 }[] | undefined;
  if (!faces) {
    faces = [];
    for (let i = 0; i < index.count; i += 6) {
      const indices = Array.from({ length: 6 }, (_, k) => index.getX(i + k));
      const vertices = [...new Set(indices)];
      const center = new THREE.Vector3();
      for (const v of vertices) center.add(new THREE.Vector3().fromBufferAttribute(position, v));
      center.divideScalar(vertices.length);
      faces.push({ indices, center });
    }
    geometry.userData.faces = faces;
  }
  faces.sort((a, b) => b.center.distanceToSquared(eye) - a.center.distanceToSquared(eye));
  let i = 0;
  for (const face of faces) for (const vertex of face.indices) index.setX(i++, vertex);
  index.needsUpdate = true;
}
