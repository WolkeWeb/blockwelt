/**
 * Gemeinsame Helfer für die Browser-Tests: Konsolenfehler sammeln, Welt über das Menü anlegen,
 * Spielzustand über die GameApi lesen (`window.__blockwelt.game`, nur lesend).
 */
import { join } from 'node:path';
import { expect, type Page, type TestInfo } from '@playwright/test';
import type { GameMode, GameState } from '../src/core';
import { countColors, decodePng } from './png';

/** Sammelt `console.error` und unbehandelte Ausnahmen der Seite. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Aktueller Spielzustand (Schnappschuss der GameApi). */
export function gameState(page: Page): Promise<GameState> {
  return page.evaluate(() => {
    const game = window.__blockwelt?.game;
    if (!game) throw new Error('Spiel nicht gestartet');
    return game.getState();
  });
}

/** Wartet, bis eine Bedingung über den Spielzustand erfüllt ist. */
export async function waitForState(
  page: Page,
  predicate: string,
  timeout = 60_000,
): Promise<void> {
  await page.waitForFunction(
    (source) => {
      const state = window.__blockwelt?.game.getState();
      return state ? (new Function('state', `return (${source});`) as (s: unknown) => boolean)(state) : false;
    },
    predicate,
    { timeout, polling: 100 },
  );
}

/** Legt über Titel → Weltauswahl eine neue Welt an und wartet, bis sie spielbereit ist. */
export async function createWorldViaMenu(page: Page, name: string, seed: string, mode: GameMode): Promise<void> {
  await page.goto('./');
  await expect(page).toHaveTitle('Blockwelt');
  await expect(page.getByText('Blockwelt', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Spielen' }).click();
  const inputs = page.locator('input.bw-input');
  await inputs.nth(0).fill(name);
  await inputs.nth(1).fill(seed);
  await page.locator('select.bw-select').selectOption(mode);
  await page.getByRole('button', { name: 'Neue Welt erstellen' }).click();
  await waitForState(page, "state.screen === 'playing' && state.debug.chunks > 0 && state.debug.triangles > 0");
}

/** Klickt ins Spielbild und wartet auf den Pointer-Lock. */
export async function lockPointer(page: Page): Promise<void> {
  await page.mouse.click(640, 360);
  await page.waitForFunction(() => document.pointerLockElement?.id === 'game', null, { timeout: 5_000 });
}

/** Screenshot nach `test-results/<name>.png`, an den Bericht gehängt; prüft, dass das Bild nicht einfarbig ist. */
export async function shot(page: Page, testInfo: TestInfo, name: string, minColors = 20): Promise<Buffer> {
  const image = await page.screenshot({ path: join('test-results', `${name}.png`) });
  await testInfo.attach(name, { body: image, contentType: 'image/png' });
  expect(countColors(decodePng(image)), `Screenshot ${name} ist einfarbig`).toBeGreaterThan(minColors);
  return image;
}

/** Hält eine Maustaste für `ms` Millisekunden. */
export async function holdMouse(page: Page, button: 'left' | 'right', ms: number): Promise<void> {
  await page.mouse.down({ button });
  await page.waitForTimeout(ms);
  await page.mouse.up({ button });
}
