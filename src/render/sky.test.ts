import { expect, it } from 'vitest';
import { Sky, skyPalette } from './sky';
import type { DayTime } from '../core';

const day = (fraction: number, skyLight: number): DayTime => ({ totalTicks: fraction * 24000, ticks: fraction * 24000,
  fraction, sunAngle: fraction * Math.PI * 2, skyLight });

it('zeigt Sonne am Mittag, Mond und Sterne nachts und folgt der Kamera', () => {
  const sky = new Sky(), eye = { x: 123, y: 70, z: -45 };
  sky.update(eye, day(0.25, 1), 10, 240, false);
  expect(sky.sun.visible).toBe(true); expect(sky.moon.visible).toBe(false); expect(sky.stars.visible).toBe(false);
  expect(sky.group.position.toArray()).toEqual([123, 70, -45]);
  expect(sky.sun.position.y).toBeGreaterThan(0);
  sky.update(eye, day(0.75, 0.2), 10, 240, false);
  expect(sky.sun.visible).toBe(false); expect(sky.moon.visible).toBe(true); expect(sky.stars.visible).toBe(true);
  sky.update(eye, day(0.75, 0.2), 10, 240, true);
  expect(sky.sun.visible || sky.moon.visible || sky.stars.visible).toBe(false);
  sky.dispose(); expect(sky.group.children).toHaveLength(0);
});
it('liefert einen helleren Tageshimmel und warmen Horizont bei Sonnenuntergang', () => {
  const noon = skyPalette(day(0.25, 1)), night = skyPalette(day(0.75, 0.2)), dusk = skyPalette(day(0.5, 0.5));
  expect(noon.zenith.b).toBeGreaterThan(night.zenith.b);
  expect(dusk.horizon.r).toBeGreaterThan(dusk.horizon.b);
});
