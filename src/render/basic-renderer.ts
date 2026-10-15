/**
 * PLATZHALTER aus Phase 0: Grundszene mit three.js.
 * Zeichnet die Chunk-Meshes der Welt mit Vertex-Farben, einen einfachen Himmel (Hintergrundfarbe + Nebel)
 * und einen Auswahlrahmen. Wird in Phase 1 (X5, X6, X9–X12) ausgebaut.
 */
import * as THREE from 'three';
import {
  CHUNK_SIZE,
  DEFAULT_RENDER_DISTANCE,
  chunkKey,
  type CameraState,
  type ChunkMesh,
  type CreateRenderer,
  type FrameTime,
  type MeshBuffers,
  type RenderStats,
  type Renderer,
  type Unsubscribe,
  type Vec3,
  type World,
} from '../core';

const DAY_SKY = new THREE.Color(0x87b8eb);
const NIGHT_SKY = new THREE.Color(0x0b1026);
const WATER_FOG = new THREE.Color(0x1d3f7a);

function toGeometry(buffers: MeshBuffers): THREE.BufferGeometry | null {
  if (buffers.indices.length === 0) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(buffers.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(buffers.normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(buffers.uvs, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(buffers.colors, 3));
  geometry.setAttribute('light', new THREE.BufferAttribute(buffers.light, 2));
  geometry.setIndex(new THREE.BufferAttribute(buffers.indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

class BasicRenderer implements Renderer {
  private renderer: THREE.WebGLRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);
  private readonly chunks = new Map<string, THREE.Group>();
  private readonly materials = {
    opaque: new THREE.MeshBasicMaterial({ vertexColors: true }),
    cutout: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    translucent: new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    }),
  };
  private readonly selection: THREE.LineSegments;
  private readonly fog = new THREE.Fog(DAY_SKY.clone(), 50, 120);
  private world: World | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private renderDistance = DEFAULT_RENDER_DISTANCE;
  private breakProgress = 0;

  constructor() {
    this.camera.rotation.order = 'YXZ';
    this.scene.background = DAY_SKY.clone();
    this.scene.fog = this.fog;
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004));
    this.selection = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
    this.selection.visible = false;
    this.scene.add(this.selection);
    this.setRenderDistance(this.renderDistance);
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  setWorld(world: World | null): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers = [];
    for (const key of [...this.chunks.keys()]) this.removeChunk(key);
    this.world = world;
    if (!world) return;
    for (const mesh of world.getChunkMeshes()) this.addChunk(mesh);
    this.unsubscribers.push(
      world.onChunkMesh((mesh) => this.addChunk(mesh)),
      world.onChunkUnloaded((cx, cz) => this.removeChunk(chunkKey(cx, cz))),
    );
  }

  private addChunk(mesh: ChunkMesh): void {
    const key = chunkKey(mesh.cx, mesh.cz);
    this.removeChunk(key);
    const group = new THREE.Group();
    group.position.set(mesh.cx * CHUNK_SIZE, 0, mesh.cz * CHUNK_SIZE);
    for (const pass of ['opaque', 'cutout', 'translucent'] as const) {
      const geometry = toGeometry(mesh[pass]);
      if (!geometry) continue;
      const object = new THREE.Mesh(geometry, this.materials[pass]);
      object.renderOrder = pass === 'translucent' ? 1 : 0;
      group.add(object);
    }
    this.chunks.set(key, group);
    this.scene.add(group);
  }

  private removeChunk(key: string): void {
    const group = this.chunks.get(key);
    if (!group) return;
    for (const child of group.children) (child as THREE.Mesh).geometry.dispose();
    this.scene.remove(group);
    this.chunks.delete(key);
  }

  private resize(): void {
    if (!this.renderer || !this.canvas) return;
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    const size = this.renderer.getSize(new THREE.Vector2());
    if (size.x !== width || size.y !== height) {
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  render(camera: CameraState, time: FrameTime): void {
    if (!this.renderer) return;
    this.resize();

    const light = time.day.skyLight;
    const sky = NIGHT_SKY.clone().lerp(DAY_SKY, light);
    const background = camera.underwater ? WATER_FOG : sky;
    (this.scene.background as THREE.Color).copy(background);
    this.fog.color.copy(background);
    const far = this.renderDistance * CHUNK_SIZE;
    this.fog.near = camera.underwater ? 2 : far * 0.6;
    this.fog.far = camera.underwater ? 24 : far;
    const brightness = Math.max(light, 0.25);
    for (const material of Object.values(this.materials)) material.color.setScalar(brightness);

    if (this.camera.fov !== camera.fov) {
      this.camera.fov = camera.fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.position.set(camera.position.x, camera.position.y, camera.position.z);
    this.camera.rotation.set(camera.pitch, camera.yaw, 0);

    const lines = this.selection.material as THREE.LineBasicMaterial;
    lines.color.setRGB(this.breakProgress, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  setRenderDistance(chunks: number): void {
    this.renderDistance = chunks;
    this.camera.far = (chunks + 2) * CHUNK_SIZE * 1.5;
    this.camera.updateProjectionMatrix();
  }

  setSelection(block: Vec3 | null): void {
    this.selection.visible = block !== null;
    if (block) this.selection.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
  }

  setBreakProgress(progress: number): void {
    this.breakProgress = Math.min(1, Math.max(0, progress));
  }

  getStats(): RenderStats {
    const info = this.renderer?.info.render;
    return { drawCalls: info?.calls ?? 0, triangles: info?.triangles ?? 0, chunks: this.chunks.size };
  }

  dispose(): void {
    this.setWorld(null);
    for (const material of Object.values(this.materials)) material.dispose();
    this.selection.geometry.dispose();
    (this.selection.material as THREE.Material).dispose();
    this.renderer?.dispose();
    this.renderer = null;
  }
}

/** Erzeugt den (Platzhalter-)Renderer. Registry und Atlas werden in Phase 0 noch nicht genutzt. */
export const createBasicRenderer: CreateRenderer = () => new BasicRenderer();
