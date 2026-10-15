import { describe, expect, it } from 'vitest';
import { BLOCK, type ChunkMesh, type World } from '../core';
import { BLOCKS } from './test-blocks';
import { createWorld } from './index';
import { TerrainGenerator, blockIndex } from './terrain';

function loadedWorld(): { world: World; meshes: ChunkMesh[] } {
  const world = createWorld({ seed: 1, blocks: BLOCKS, atlas: null });
  const meshes: ChunkMesh[] = [];
  world.onChunkMesh((mesh) => meshes.push(mesh));
  for (let i = 0; i < 20; i++) world.update({ x: 8, y: 70, z: 8 }, 2);
  return { world, meshes };
}

describe('Terrain', () => {
  it('erzeugt identische Chunks unabhängig von Reihenfolge, andere Seeds unterscheiden sich', () => {
    const a = new TerrainGenerator(42), b = new TerrainGenerator(42);
    const first = a.generate(-3, 7);
    b.generate(9, 5);
    expect(b.generate(-3, 7)).toEqual(first);
    expect(new TerrainGenerator(43).generate(-3, 7)).not.toEqual(first);
  });
  it('hat Grundgestein, korrekte Deckschichten und Wasser bis 62', () => {
    const terrain = new TerrainGenerator(1);
    for (const [cx, cz] of [[0, 0], [-10, 4], [12, -9]]) {
      const data = terrain.generate(cx, cz);
      for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
        const h = terrain.height(cx * 16 + x, cz * 16 + z);
        const at = (y: number) => data[blockIndex(x, y, z)];
        expect(at(0)).toBe(BLOCK.BEDROCK);
        expect(at(h)).toBe(h <= 63 ? BLOCK.SAND : BLOCK.GRASS);
        expect(at(h - 3)).toBe(h <= 63 ? BLOCK.SAND : BLOCK.DIRT);
        if (h < 62) expect(at(62)).toBe(BLOCK.WATER);
        expect(at(127)).toBe(BLOCK.AIR);
      }
    }
  });
  it('liefert Ebenen, Hügel und Berge ohne die Höhenbegrenzung zu überschreiten', () => {
    const terrain = new TerrainGenerator(42);
    const heights: number[] = [];
    for (let z = -3000; z < 3000; z += 80) for (let x = -3000; x < 3000; x += 80) heights.push(terrain.height(x, z));
    expect(Math.min(...heights)).toBeLessThan(62);
    expect(Math.max(...heights)).toBeGreaterThan(100);
    expect(Math.max(...heights)).toBeLessThanOrEqual(110);
  });
});

describe('Welt', () => {
  it('aktualisiert gebackenes Nachbarlicht beim Setzen und Entfernen einer Fackel', () => {
    const world = createWorld({ seed: 1, blocks: BLOCKS, atlas: null });
    const update = () => { for (let i = 0; i < 12; i++) world.update({ x: 8, y: 70, z: 8 }, 1); };
    update();
    world.setBlock(16, 100, 8, BLOCK.STONE); update();
    world.setBlock(15, 100, 8, BLOCK.TORCH); update();
    const lightInNeighbor = () => Array.from([...world.getChunkMeshes()].find(m => m.cx === 1 && m.cz === 0)!.opaque.light)
      .filter((_, i) => i % 2 === 1);
    expect(Math.max(...lightInNeighbor())).toBeGreaterThan(0);
    world.setBlock(15, 100, 8, BLOCK.AIR); update();
    expect(Math.max(...lightInNeighbor())).toBe(0);
    world.dispose();
  });
  it('baut bei Änderungen nur betroffene Chunks und Grenznachbarn neu', () => {
    const { world, meshes } = loadedWorld();
    const update = () => { for (let i = 0; i < 10; i++) world.update({ x: 8, y: 70, z: 8 }, 2); };
    update(); meshes.length = 0;
    world.setBlock(8, 120, 8, BLOCK.STONE); update(); meshes.length = 0;
    world.setBlock(8, 120, 8, BLOCK.COBBLESTONE); update();
    expect(meshes.map(m => `${m.cx},${m.cz}`)).toEqual(['0,0']);
    meshes.length = 0;
    world.setBlock(15, 120, 8, BLOCK.STONE); update(); meshes.length = 0;
    world.setBlock(15, 120, 8, BLOCK.COBBLESTONE); update();
    expect(meshes.map(m => `${m.cx},${m.cz}`).sort()).toEqual(['0,0', '1,0']);
    world.dispose();
  });
  it('lädt zuerst den Spielerchunk, entlädt entfernte Daten und erhält Änderungen', () => {
    const world = createWorld({ seed: 1, blocks: BLOCKS, atlas: null });
    const loaded: string[] = [], unloaded: string[] = [];
    world.onChunkLoaded((x, z) => loaded.push(`${x},${z}`));
    world.onChunkUnloaded((x, z) => unloaded.push(`${x},${z}`));
    world.update({ x: -1, y: 70, z: -1 }, 1);
    expect(loaded[0]).toBe('-1,-1');
    world.setBlock(-1, 120, -1, BLOCK.GLASS);
    world.update({ x: 1000, y: 70, z: 1000 }, 1);
    expect(world.isLoaded(-1, -1)).toBe(false);
    expect(unloaded).toContain('-1,-1');
    world.update({ x: -1, y: 70, z: -1 }, 1);
    expect(world.getBlock(-1, 120, -1)).toBe(BLOCK.GLASS);
    world.dispose();
    world.update({ x: 0, y: 0, z: 0 }, 2);
    expect([...world.getChunkMeshes()]).toEqual([]);
  });
  it('meldet Blockänderungen und baut Meshes', () => {
    const { world, meshes } = loadedWorld();
    expect(world.isLoaded(8, 8)).toBe(true);
    expect(meshes.length).toBeGreaterThan(0);
    const changes: number[] = [];
    world.onBlockChanged((c) => changes.push(c.current));
    world.setBlock(0, 120, 0, BLOCK.LOG);
    expect(world.getBlock(0, 120, 0)).toBe(BLOCK.LOG);
    expect(changes).toEqual([BLOCK.LOG]);
    expect(world.getBlock(0, -1, 0)).toBe(BLOCK.BEDROCK);
    expect(world.getBlock(0, 128, 0)).toBe(BLOCK.AIR);
    world.dispose();
  });
  it('merkt Änderungen in nicht geladenen Chunks vor', () => {
    const world = createWorld({ seed: 1, blocks: BLOCKS, atlas: null });
    world.setBlock(1000, 120, 1000, BLOCK.LOG);
    for (let i = 0; i < 10; i++) world.update({ x: 1000, y: 70, z: 1000 }, 1);
    expect(world.getBlock(1000, 120, 1000)).toBe(BLOCK.LOG);
    world.dispose();
  });
});

