import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { collectErrors, createWorldViaMenu, gameState, holdMouse, lockPointer, waitForState } from './helpers';
import { countColors, decodePng } from './png';

test('Seite lädt, Welt über das Menü startet, Canvas rendert, keine Fehler in der Konsole', async ({ page }, testInfo) => {
  const errors = collectErrors(page);

  const canvas = page.locator('canvas#game');
  await createWorldViaMenu(page, 'Smoketest', '1', 'creative');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width).toBeGreaterThan(100);
  expect(box?.height).toBeGreaterThan(100);
  await page.waitForTimeout(1000);

  // Screenshot ablegen und prüfen, dass wirklich etwas zu sehen ist (Himmel und Boden, nicht einfarbig)
  const screenshot = await page.screenshot({ path: join('test-results', 'smoke.png') });
  await testInfo.attach('smoke', { body: screenshot, contentType: 'image/png' });
  const image = decodePng(screenshot);
  expect(countColors(image)).toBeGreaterThan(1);
  const top = image.data.subarray(0, 4);
  const bottomOffset = image.width * (image.height - 1) * 4;
  const bottom = image.data.subarray(bottomOffset, bottomOffset + 4);
  expect([...top.subarray(0, 3)]).not.toEqual([...bottom.subarray(0, 3)]);

  expect(errors, `Konsolenfehler:\n${errors.join('\n')}`).toEqual([]);
});

test('Spielstand: abgebauter Block und Position bleiben nach Neuladen der Seite erhalten', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await createWorldViaMenu(page, 'Speichertest', '5', 'creative');
  await lockPointer(page);
  await page.mouse.move(640, 360);
  await page.mouse.move(640, 600, { steps: 8 });
  await waitForState(page, 'state.debug.target !== null', 10_000);
  const before = (await gameState(page)).debug.target!;
  // Kreativ: sofort abbauen
  await holdMouse(page, 'left', 60);
  await waitForState(page, `JSON.stringify(state.debug.target?.position) !== '${JSON.stringify(before.position)}'`, 5_000);
  const after = await gameState(page);
  const targetAfterBreak = after.debug.target;

  // Speichern und zum Titel, Seite neu laden, Welt aus der Liste laden
  await page.evaluate(() => document.exitPointerLock());
  await waitForState(page, "state.screen === 'paused'", 5_000);
  await page.getByRole('button', { name: 'Speichern und zum Titel' }).click();
  await waitForState(page, "state.screen === 'title'", 10_000);
  await page.reload();
  await page.getByRole('button', { name: 'Spielen' }).click();
  await expect(page.getByText('Speichertest')).toBeVisible();
  await page.getByRole('button', { name: 'Laden' }).first().click();
  await waitForState(page, "state.screen === 'playing' && state.debug.chunks > 0");
  await waitForState(page, 'state.debug.target !== null', 10_000);
  await page.screenshot({ path: join('test-results', 'speichertest.png') });
  await testInfo.attach('speichertest', { path: join('test-results', 'speichertest.png'), contentType: 'image/png' });
  const reloaded = await gameState(page);
  expect(reloaded.world?.name).toBe('Speichertest');
  expect(reloaded.debug.position.x).toBeCloseTo(after.debug.position.x, 3);
  expect(reloaded.debug.position.z).toBeCloseTo(after.debug.position.z, 3);
  // Gleiche Blickrichtung, gleicher Blick: Der abgebaute Block fehlt weiterhin, also trifft der Strahl dasselbe wie vorher.
  expect(reloaded.debug.target?.position).toEqual(targetAfterBreak?.position);
  expect(reloaded.debug.target?.position).not.toEqual(before.position);
  expect(errors, `Konsolenfehler:\n${errors.join('\n')}`).toEqual([]);
});
