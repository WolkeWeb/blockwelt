import { expect, it } from 'vitest';
import { BLOCK } from '../core';
import { TerrainGenerator, blockIndex } from './terrain';

it('erzeugt Kronen über positive und negative Chunk-Grenzen hinweg', () => {
  const terrain = new TerrainGenerator(42);
  let crossings = 0;
  for (let gz = -40; gz <= 40 && crossings < 8; gz++) for (let gx = -40; gx <= 40 && crossings < 8; gx++) {
    const tree = terrain.tree(gx, gz);
    if (!tree) continue;
    const cx = Math.floor(tree.x / 16), cz = Math.floor(tree.z / 16);
    const offset = tree.x - cx * 16;
    if (offset !== 0 && offset !== 15) continue;
    const dx = offset === 0 ? -1 : 1;
    const next = terrain.generate(cx + dx, cz);
    const own = terrain.generate(cx, cz);
    expect(own[blockIndex(offset, tree.y, tree.z - cz * 16)]).toBe(BLOCK.LOG);
    expect(next[blockIndex(dx < 0 ? 15 : 0, tree.y + tree.height, tree.z - cz * 16)]).toBe(BLOCK.LEAVES);
    expect(terrain.generate(cx + dx, cz)).toEqual(next);
    crossings++;
  }
  expect(crossings).toBe(8);
});
