import { join } from 'node:path';
import { expect, test, type ConsoleMessage } from '@playwright/test';
import { countColors, decodePng } from './png';

test('Seite lädt, Canvas rendert eine Welt, keine Fehler in der Konsole', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('./');
  await expect(page).toHaveTitle('Blockwelt');

  const canvas = page.locator('canvas#game');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width).toBeGreaterThan(100);
  expect(box?.height).toBeGreaterThan(100);

  // Warten, bis die Welt läuft und Chunks gezeichnet werden
  await page.waitForFunction(() => {
    const state = window.__blockwelt?.game.getState();
    return state?.screen === 'playing' && state.debug.chunks > 0 && state.debug.triangles > 0;
  });
  await page.waitForTimeout(1000);

  // Screenshot ablegen und prüfen, dass wirklich etwas zu sehen ist (Himmel und Boden, nicht einfarbig)
  const screenshot = await page.screenshot({ path: join('test-results', 'smoke.png') });
  await testInfo.attach('smoke', { body: screenshot, contentType: 'image/png' });
  const image = decodePng(screenshot);
  expect(countColors(image)).toBeGreaterThan(1);
  const top = image.data.subarray(0, 4);
  const bottomOffset = (image.width * (image.height - 1)) * 4;
  const bottom = image.data.subarray(bottomOffset, bottomOffset + 4);
  expect([...top.subarray(0, 3)]).not.toEqual([...bottom.subarray(0, 3)]);

  expect(errors, `Konsolenfehler:\n${errors.join('\n')}`).toEqual([]);
});
