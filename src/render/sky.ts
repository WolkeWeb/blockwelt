import * as THREE from 'three';
import type { DayTime, Vec3 } from '../core';

const CLOUD_WHITE = new THREE.Color(0xffffff);

export function skyPalette(day: Pick<DayTime, 'skyLight' | 'sunAngle'>): { horizon: THREE.Color; zenith: THREE.Color } {
  const daylight = THREE.MathUtils.clamp((day.skyLight - 0.2) / 0.8, 0, 1);
  const dusk = Math.pow(1 - Math.abs(Math.sin(day.sunAngle)), 8);
  return {
    horizon: new THREE.Color(0x151c38).lerp(new THREE.Color(0xb5d6ed), daylight).lerp(new THREE.Color(0xe99665), dusk * 0.65),
    zenith: new THREE.Color(0x05091b).lerp(new THREE.Color(0x5599d8), daylight),
  };
}

export class Sky {
  readonly group = new THREE.Group();
  readonly sun: THREE.Mesh;
  readonly moon: THREE.Mesh;
  readonly stars: THREE.Points;
  private readonly uniforms = { horizon: { value: new THREE.Color() }, zenith: { value: new THREE.Color() } };
  private readonly dome: THREE.Mesh;
  private readonly clouds: THREE.InstancedMesh;
  private readonly transform = new THREE.Object3D();
  private readonly inward = new THREE.Vector3();
  private readonly forward = new THREE.Vector3(0, 0, 1);

  constructor() {
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.ShaderMaterial({
      uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, depthTest: false,
      vertexShader: 'varying vec3 direction; void main() { direction = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 direction; uniform vec3 horizon; uniform vec3 zenith; void main() { float h = pow(max(normalize(direction).y, 0.0), 0.55); gl_FragColor = vec4(mix(horizon, zenith, h), 1.0); }',
    }));
    this.dome.renderOrder = -1000;
    this.dome.frustumCulled = false;
    const disk = new THREE.CircleGeometry(1, 32);
    this.sun = new THREE.Mesh(disk, new THREE.MeshBasicMaterial({ color: 0xffe8a3, depthWrite: false, depthTest: false, fog: false }));
    this.moon = new THREE.Mesh(disk.clone(), new THREE.MeshBasicMaterial({ color: 0xcbd7ed, depthWrite: false, depthTest: false, fog: false }));
    this.sun.renderOrder = this.moon.renderOrder = -800;
    let seed = 81619;
    const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
    const points: number[] = [];
    for (let i = 0; i < 900; i++) {
      const y = random() * 2 - 1, angle = random() * Math.PI * 2, r = Math.sqrt(1 - y * y);
      points.push(Math.cos(angle) * r, y, Math.sin(angle) * r);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    this.stars = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xe4edff, size: 1.5, sizeAttenuation: false,
      // depthTest bleibt an: Sterne sind transparent und landen deshalb im Transparenz-Durchgang NACH dem Gelände;
      // ohne Tiefentest würden sie als weiße Punkte vor Bergen und Blöcken erscheinen.
      transparent: true, depthWrite: false, depthTest: true, fog: false }));
    this.stars.renderOrder = -900;
    this.stars.frustumCulled = false;
    this.clouds = new THREE.InstancedMesh(new THREE.BoxGeometry(12, 1.5, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false }), 64);
    this.clouds.frustumCulled = false;
    this.group.add(this.dome, this.stars, this.sun, this.moon, this.clouds);
  }

  update(eye: Vec3, day: DayTime, elapsed: number, far: number, underwater: boolean): THREE.Color {
    const palette = skyPalette(day);
    this.uniforms.horizon.value.copy(palette.horizon); this.uniforms.zenith.value.copy(palette.zenith);
    this.group.position.set(eye.x, eye.y, eye.z);
    const radius = far * 0.85;
    this.dome.scale.setScalar(far * 0.95); this.stars.scale.setScalar(radius);
    this.stars.rotation.z = day.sunAngle;
    (this.stars.material as THREE.PointsMaterial).opacity = 1 - THREE.MathUtils.clamp((day.skyLight - 0.2) / 0.3, 0, 1);
    this.stars.visible = !underwater && day.skyLight < 0.5;
    this.sun.position.set(Math.cos(day.sunAngle) * radius, Math.sin(day.sunAngle) * radius, 0);
    this.moon.position.copy(this.sun.position).negate();
    for (const disk of [this.sun, this.moon]) {
      disk.scale.setScalar(radius * (disk === this.sun ? 0.035 : 0.03));
      this.inward.copy(disk.position).normalize().negate();
      disk.quaternion.setFromUnitVectors(this.forward, this.inward);
      disk.visible = !underwater && disk.position.y > -radius * 0.06;
    }
    this.dome.visible = !underwater; this.clouds.visible = !underwater;
    // Wolken folgen der Himmelsfarbe: tagsüber fast weiß, nachts dunkel statt hellgrau vor dem Sternenhimmel.
    const daylight = THREE.MathUtils.clamp((day.skyLight - 0.2) / 0.8, 0, 1);
    (this.clouds.material as THREE.MeshBasicMaterial).color.copy(palette.horizon).lerp(CLOUD_WHITE, 0.1 + daylight * 0.85);
    const span = far * 1.6, spacing = span / 8;
    const wrap = (v: number) => ((v + span / 2) % span + span) % span - span / 2;
    for (let i = 0; i < 64; i++) {
      this.transform.position.set(wrap(i % 8 * spacing - eye.x + elapsed * 1.2), 118 - eye.y, wrap(Math.floor(i / 8) * spacing - eye.z));
      this.transform.scale.set(1 + (i * 7 % 5) * 0.3, 1, 1 + (i * 3 % 5) * 0.2);
      this.transform.updateMatrix(); this.clouds.setMatrixAt(i, this.transform.matrix);
    }
    this.clouds.instanceMatrix.needsUpdate = true;
    return palette.horizon;
  }
  dispose(): void {
    this.group.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        object.geometry.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
        if (object instanceof THREE.InstancedMesh) object.dispose();
      }
    });
    this.group.clear();
  }
}
