import { expect, it } from 'vitest';
import { BlockSelection, crackPixels, crackStage } from './selection';

it('liefert genau zehn fortschreitende Rissstufen aus einem eigenen Muster', () => {
  expect(crackStage(0)).toBe(-1); expect(crackStage(NaN)).toBe(-1);
  let previous = 0;
  for (let stage = 0; stage < 10; stage++) {
    expect(crackStage(stage / 10 + 0.01)).toBe(stage);
    const pixels = crackPixels(stage);
    const count = pixels.filter((v, i) => i % 4 === 3 && v > 0).length;
    expect(count).toBeGreaterThan(previous); previous = count;
  }
  expect(crackStage(1)).toBe(9); expect(crackStage(12)).toBe(9);
});
it('positioniert Rahmen und Overlay gemeinsam und setzt Risse bei Zielwechsel zurück', () => {
  const selection = new BlockSelection();
  selection.setBlock({ x: -1, y: 2, z: 3 }); selection.setProgress(0.6);
  expect(selection.group.position.toArray()).toEqual([-0.5, 2.5, 3.5]);
  expect(selection.cracks.visible).toBe(true);
  selection.setBlock({ x: 0, y: 2, z: 3 });
  expect(selection.cracks.visible).toBe(false);
  selection.setBlock(null); expect(selection.group.visible).toBe(false);
  selection.dispose(); expect(selection.group.children).toHaveLength(0);
});
