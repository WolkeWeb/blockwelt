import { describe, expect, it } from 'vitest';
import { BLOCK, BLOCK_NAMES, type BlockDef, type ChunkMesh, type World } from '../core';
import { createWorld } from './index';
import { TerrainGenerator, blockIndex } from './terrain';

export const BLOCKS: BlockDef[] = Object.values(BLOCK).sort((a, b) => a - b).map((id) => ({
  id, name: BLOCK_NAMES[id], displayName: BLOCK_NAMES[id], hardness: id === BLOCK.BEDROCK ? -1 : 1,
  solid: id !== BLOCK.AIR && id !== BLOCK.WATER && id !== BLOCK.TORCH,
  transparency: id === BLOCK.AIR ? 'invisible' : id === BLOCK.WATER ? 'translucent' : id === BLOCK.LEAVES || id === BLOCK.GLASS || id === BLOCK.TORCH ? 'cutout' : 'opaque',
  shape: id === BLOCK.AIR ? 'none' : id === BLOCK.WATER ? 'liquid' : id === BLOCK.TORCH ? 'torch' : 'cube',
  lightLevel: id === BLOCK.TORCH ? 14 : 0,
  lightOpacity: id === BLOCK.AIR || id === BLOCK.GLASS || id === BLOCK.TORCH ? 0 : id === BLOCK.LEAVES ? 1 : id === BLOCK.WATER ? 2 : 15,
  replaceable: id === BLOCK.AIR || id === BLOCK.WATER, color: 0x808080, textures: null, drop: null,
  preferredTool: null, requiredToolLevel: 0,
}));

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
