import { expect, it } from 'vitest';
import { BLOCK } from '../core';
import { TerrainGenerator, blockIndex } from './terrain';

it('erzeugt deterministische Höhlengänge und höhenabhängige Erzadern', () => {
  const terrain = new TerrainGenerator(123);
  let coal = 0, iron = 0, caves = 0, highCoal = 0, connected = 0;
  for (let cz = -1; cz <= 1; cz++) for (let cx = -1; cx <= 1; cx++) {
    const data = terrain.generate(cx, cz);
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const h = terrain.height(cx * 16 + x, cz * 16 + z);
      expect(data[blockIndex(x, 0, z)]).toBe(BLOCK.BEDROCK);
      for (let y = 4; y < h - 6; y++) {
        const id = data[blockIndex(x, y, z)];
        if (id === BLOCK.COAL_ORE) { coal++; if (y >= 48) highCoal++; }
        if (id === BLOCK.IRON_ORE) { iron++; expect(y).toBeLessThan(48); }
        if (id === BLOCK.AIR) {
          caves++;
          if (data[blockIndex(x, y + 1, z)] === BLOCK.AIR) connected++;
        }
      }
    }
  }
  expect(caves).toBeGreaterThan(100);
  expect(connected / caves).toBeGreaterThan(0.5);
  expect(coal).toBeGreaterThan(iron);
  expect(iron).toBeGreaterThan(0);
  expect(highCoal).toBeGreaterThan(0);
});
