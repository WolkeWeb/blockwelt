/** Dedicated integration harness: independent of the other agents' game/UI implementations. */
import { BLOCK, BLOCK_NAMES, type BlockDef, type Registry, type FrameTime, type CameraState, type TextureAtlas } from '../core';
import { createWorld } from '../world';
import { createRenderer } from './index';

const palette = [0, 0x65a447, 0x936747, 0x898c90, 0x727677, 0x41454b, 0xe1cf91, 0xa3a09b, 0x745137, 0xbd9158, 0x418944, 0xc0dce9, 0x447db3, 0x55555c, 0xad8b71, 0xa87d47, 0xffc86b];
const image = document.createElement('canvas'); image.width = 16 * 17; image.height = 16;
const ctx = image.getContext('2d')!;
const regions: Record<string, { u0: number; u1: number; v0: number; v1: number }> = {};
const blocks: BlockDef[] = Object.values(BLOCK).map(id => {
  const name = BLOCK_NAMES[id];
  regions[name] = { u0: (id * 16 + 0.5) / image.width, u1: (id * 16 + 15.5) / image.width, v0: 0.5 / 16, v1: 15.5 / 16 };
  ctx.fillStyle = `#${palette[id].toString(16).padStart(6, '0')}`; ctx.fillRect(id * 16, 0, 16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (id === BLOCK.LEAVES && (x * 7 + y * 11) % 9 < 2 || id === BLOCK.GLASS && x > 1 && x < 14 && y > 1 && y < 14) ctx.clearRect(id * 16 + x, y, 1, 1);
    else { ctx.fillStyle = `rgba(0,0,0,${(x * 13 + y * 7) % 5 * 0.025})`; ctx.fillRect(id * 16 + x, y, 1, 1); }
  }
  return { id, name, displayName: name, hardness: id === BLOCK.BEDROCK ? -1 : 1,
    solid: id !== BLOCK.AIR && id !== BLOCK.WATER && id !== BLOCK.TORCH,
    transparency: id === BLOCK.AIR ? 'invisible' : id === BLOCK.WATER ? 'translucent' : [BLOCK.LEAVES, BLOCK.GLASS, BLOCK.TORCH].includes(id as 10) ? 'cutout' : 'opaque',
    shape: id === BLOCK.AIR ? 'none' : id === BLOCK.WATER ? 'liquid' : id === BLOCK.TORCH ? 'torch' : 'cube',
    lightLevel: id === BLOCK.TORCH ? 14 : 0, lightOpacity: [BLOCK.AIR, BLOCK.GLASS, BLOCK.TORCH].includes(id as 0) ? 0 : id === BLOCK.LEAVES ? 1 : id === BLOCK.WATER ? 2 : 15,
    replaceable: id === BLOCK.AIR || id === BLOCK.WATER, color: palette[id],
    textures: { top: name, bottom: name, north: name, south: name, east: name, west: name },
    drop: null, preferredTool: null, requiredToolLevel: 0 };
});
const registry: Registry = { blocks, items: [], recipes: [], smelting: [], textureNames: Object.keys(regions),
  getBlockDef: id => blocks[id] ?? blocks[BLOCK.STONE], getBlockDefByName: name => blocks.find(b => b.name === name), getItemDef: () => undefined };
const atlas: TextureAtlas = { image, layout: { width: image.width, height: image.height, tileSize: 16, regions } };
const world = createWorld({ seed: 42, blocks, atlas: atlas.layout });
const renderer = createRenderer({ registry, atlas });
const canvas = document.querySelector<HTMLCanvasElement>('#benchmark')!;
renderer.attach(canvas); renderer.setWorld(world); renderer.setRenderDistance(8);
const loaded = new Set<string>(), meshes = new Set<string>();
let lastMesh = performance.now(), maxUpdateMs = 0, updateMs: number[] = [];
world.onChunkLoaded((x, z) => loaded.add(`${x},${z}`));
world.onChunkMesh(m => { meshes.add(`${m.cx},${m.cz}`); lastMesh = performance.now(); });
world.onChunkUnloaded((x, z) => { loaded.delete(`${x},${z}`); meshes.delete(`${x},${z}`); });
const camera = { position: { x: 8, y: 82, z: 8 }, yaw: 0, pitch: -0.18, fov: 70, underwater: false } satisfies CameraState;
let mode = 'stationary', running = true, last = performance.now(), elapsed = 0, ticks = 0;
let frames: number[] = [], renderMs: number[] = [], calls: number[] = [], triangles: number[] = [];
let sampleStarted = 0;
const gl = canvas.getContext('webgl2')!;
const extension = gl.getExtension('WEBGL_debug_renderer_info');
const gpu = extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) as string : 'unavailable';
const snapshot = () => ({ loaded: loaded.size, meshes: meshes.size, settled: meshes.size === 197 && performance.now() - lastMesh > 1000,
  maxUpdateMs, stats: renderer.getStats(), gpu, expectedChunks: 197 });
const quantile = (values: number[], q: number) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * q)] ?? 0;
const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
function frame(now: number): void {
  if (!running) return;
  const delta = now - last; last = now; elapsed += delta / 1000;
  const motion = (now - sampleStarted) / 1000;
  if (mode === 'moving') { camera.position.x = 8 + Math.sin(motion * 0.4) * 5; camera.position.z = 8 + Math.cos(motion * 0.4) * 5; camera.yaw = motion * 0.2; }
  if (now - ticks >= 50) {
    const start = performance.now(); world.update(camera.position, 8);
    const duration = performance.now() - start; maxUpdateMs = Math.max(maxUpdateMs, duration); updateMs.push(duration); ticks = now;
  }
  const time: FrameTime = { day: { ticks: 6000, totalTicks: 6000, fraction: 0.25, sunAngle: Math.PI / 2, skyLight: 1 }, alpha: 0, delta: delta / 1000, elapsed };
  const start = performance.now(); renderer.render(camera, time);
  if (sampleStarted) {
    frames.push(delta); renderMs.push(performance.now() - start);
    const stats = renderer.getStats(); calls.push(stats.drawCalls); triangles.push(stats.triangles);
  }
  if (now % 500 < 30) document.querySelector('#stats')!.textContent = JSON.stringify({ ...snapshot(), fps: Math.round(1000 / (average(frames.slice(-120)) || delta)) }, null, 2);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
const api = {
  snapshot,
  async sample(seconds = 10, movement = false) {
    mode = movement ? 'moving' : 'stationary';
    frames = []; renderMs = []; calls = []; triangles = []; updateMs = []; sampleStarted = performance.now();
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    const durationMs = performance.now() - sampleStarted; sampleStarted = 0; mode = 'stationary';
    let meshBytes = 0;
    for (const mesh of world.getChunkMeshes()) for (const b of [mesh.opaque, mesh.cutout, mesh.translucent])
      meshBytes += b.positions.byteLength + b.normals.byteLength + b.uvs.byteLength + b.colors.byteLength + b.light.byteLength + b.indices.byteLength;
    return { ...snapshot(), movement, durationMs, frames: frames.length, fps: frames.length * 1000 / durationMs,
      frameP50: quantile(frames, 0.5), frameP95: quantile(frames, 0.95), frameMax: Math.max(...frames),
      renderP95: quantile(renderMs, 0.95), updateP95: quantile(updateMs, 0.95), meanDrawCalls: average(calls), meanTriangles: average(triangles), meshBytes };
  },
  clear() { renderer.setWorld(null); world.dispose(); loaded.clear(); meshes.clear(); return renderer.getStats(); },
  dispose() { running = false; renderer.dispose(); world.dispose(); },
};
declare global { interface Window { blockweltBenchmark: typeof api } }
window.blockweltBenchmark = api;
