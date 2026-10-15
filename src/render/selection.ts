import * as THREE from 'three';
import type { Vec3 } from '../core';

export function crackStage(progress: number): number {
  return !Number.isFinite(progress) || progress <= 0 ? -1 : Math.min(9, Math.floor(progress * 10));
}

/** Original fracture pattern, drawn into RGBA pixels without external art or canvas dependencies. */
export function crackPixels(stage: number, size = 32): Uint8Array {
  const pixels = new Uint8Array(size * size * 4);
  let seed = 91827;
  const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
  const tips: [number, number][] = [[size / 2, size / 2]];
  const put = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < size && y < size) pixels[(y * size + x) * 4 + 3] = 210;
  };
  for (let branch = 0; branch < (stage + 1) * 3; branch++) {
    const start = tips[Math.floor(random() * tips.length)], angle = random() * Math.PI * 2;
    const length = 4 + random() * 10;
    let x = Math.round(start[0]), y = Math.round(start[1]);
    const ex = Math.max(0, Math.min(size - 1, Math.round(x + Math.cos(angle) * length)));
    const ey = Math.max(0, Math.min(size - 1, Math.round(y + Math.sin(angle) * length)));
    const dx = Math.abs(ex - x), dy = -Math.abs(ey - y), sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
    let error = dx + dy;
    while (true) {
      put(x, y);
      if (x === ex && y === ey) break;
      const e2 = error * 2;
      if (e2 >= dy) { error += dy; x += sx; }
      if (e2 <= dx) { error += dx; y += sy; }
    }
    tips.push([ex, ey]);
  }
  return pixels;
}

export class BlockSelection {
  readonly group = new THREE.Group();
  readonly cracks: THREE.Mesh;
  private readonly frame: THREE.LineSegments;
  private readonly textures: THREE.DataTexture[] = [];
  private key: string | null = null;
  private stage = -1;
  constructor() {
    const box = new THREE.BoxGeometry(1.004, 1.004, 1.004);
    this.frame = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: 0x161616 }));
    box.dispose();
    for (let stage = 0; stage < 10; stage++) {
      const texture = new THREE.DataTexture(crackPixels(stage), 32, 32, THREE.RGBAFormat);
      texture.magFilter = texture.minFilter = THREE.NearestFilter;
      texture.generateMipmaps = false; texture.needsUpdate = true;
      this.textures.push(texture);
    }
    this.cracks = new THREE.Mesh(new THREE.BoxGeometry(1.006, 1.006, 1.006), new THREE.MeshBasicMaterial({
      map: this.textures[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
    }));
    this.frame.renderOrder = 3; this.cracks.renderOrder = 2;
    this.cracks.visible = false; this.group.visible = false;
    this.group.add(this.cracks, this.frame);
  }
  setBlock(block: Vec3 | null): void {
    const key = block ? `${block.x},${block.y},${block.z}` : null;
    if (key !== this.key) { this.setProgress(0); this.key = key; }
    this.group.visible = block !== null;
    if (block) this.group.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
  }
  setProgress(progress: number): void {
    const stage = crackStage(progress);
    this.cracks.visible = stage >= 0;
    if (stage === this.stage) return;
    this.stage = stage;
    if (stage >= 0) (this.cracks.material as THREE.MeshBasicMaterial).map = this.textures[stage];
  }
  dispose(): void {
    for (const texture of this.textures) texture.dispose();
    for (const object of [this.frame, this.cracks]) { object.geometry.dispose(); (object.material as THREE.Material).dispose(); }
    this.group.clear();
  }
}
