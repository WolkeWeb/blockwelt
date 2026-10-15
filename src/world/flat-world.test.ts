import { describe, expect, it } from 'vitest';
import { BLOCK, BLOCK_NAMES, type BlockDef, type ChunkMesh, type World } from '../core';
import { createWorld } from './index';
import { FLAT_SURFACE_Y } from './flat-world';

/** Einfache Blockdefinitionen nur für Tests (ohne Abhängigkeit von src/data). */
const BLOCKS: BlockDef[] = Object.values(BLOCK)
  .sort((a, b) => a - b)
  .map((id) => ({
    id,
    name: BLOCK_NAMES[id],
    displayName: BLOCK_NAMES[id],
    hardness: 1,
    solid: id !== BLOCK.AIR,
    transparency: id === BLOCK.AIR ? 'invisible' : 'opaque',
    shape: id === BLOCK.AIR ? 'none' : 'cube',
    lightLevel: 0,
    lightOpacity: id === BLOCK.AIR ? 0 : 15,
    replaceable: id === BLOCK.AIR,
    color: 0x808080,
    textures: null,
    drop: null,
    preferredTool: null,
    requiredToolLevel: 0,
  }));

function loadedWorld(): { world: World; meshes: ChunkMesh[] } {
  const world = createWorld({ seed: 1, blocks: BLOCKS, atlas: null });
  const meshes: ChunkMesh[] = [];
  world.onChunkMesh((mesh) => meshes.push(mesh));
  for (let i = 0; i < 20; i++) world.update({ x: 8, y: 70, z: 8 }, 2);
  return { world, meshes };
}

describe('flache Platzhalter-Welt', () => {
  it('hat Gras oben, Erde darunter, Stein ganz unten', () => {
    const { world } = loadedWorld();
    expect(world.isLoaded(8, 8)).toBe(true);
    expect(world.getBlock(3, FLAT_SURFACE_Y, 3)).toBe(BLOCK.GRASS);
    expect(world.getBlock(3, FLAT_SURFACE_Y - 1, 3)).toBe(BLOCK.DIRT);
    expect(world.getBlock(3, 10, 3)).toBe(BLOCK.STONE);
    expect(world.getBlock(3, FLAT_SURFACE_Y + 1, 3)).toBe(BLOCK.AIR);
    expect(world.getSurfaceHeight(-5, -5)).toBe(FLAT_SURFACE_Y);
  });

  it('meldet Blockänderungen und baut Meshes', () => {
    const { world, meshes } = loadedWorld();
    expect(meshes.length).toBeGreaterThan(0);
    expect(meshes[0].opaque.indices.length).toBeGreaterThan(0);
    const changes: number[] = [];
    world.onBlockChanged((c) => changes.push(c.current));
    world.setBlock(0, FLAT_SURFACE_Y + 1, 0, BLOCK.LOG);
    expect(world.getBlock(0, FLAT_SURFACE_Y + 1, 0)).toBe(BLOCK.LOG);
    expect(changes).toEqual([BLOCK.LOG]);
  });

  it('merkt Änderungen in nicht geladenen Chunks vor', () => {
    const world = createWorld({ seed: 1, blocks: BLOCKS, atlas: null });
    world.setBlock(1000, 64, 1000, BLOCK.LOG);
    for (let i = 0; i < 10; i++) world.update({ x: 1000, y: 70, z: 1000 }, 1);
    expect(world.getBlock(1000, 64, 1000)).toBe(BLOCK.LOG);
  });
});
