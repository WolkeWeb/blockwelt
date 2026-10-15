/**
 * Spieltest (C2-3): spielt rund 60 Sekunden wie ein Mensch – nur mit Maus und Tastatur, keine Abkürzungen über
 * private Felder. Welt über das Menü anlegen, laufen, Block abbauen, Block setzen, Inventar öffnen und benutzen,
 * Pause. Unterwegs entstehen Screenshots in `test-results/` (spiel-01 … spiel-10).
 */
import { expect, test } from '@playwright/test';
import {
  collectErrors,
  createWorldViaMenu,
  gameState,
  holdMouse,
  lockPointer,
  shot,
  waitForState,
} from './helpers';

const PLAY_SECONDS = 60;

test('60 Sekunden spielen: laufen, abbauen, bauen, Inventar', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);

  // 1. Welt über das Menü anlegen (Überleben, fester Seed)
  await page.goto('./');
  await shot(page, testInfo, 'spiel-01-titel');
  await createWorldViaMenu(page, 'Spieltest', '42', 'survival');
  const started = Date.now();
  await page.waitForTimeout(2_000);
  await shot(page, testInfo, 'spiel-02-welt', 40);
  let state = await gameState(page);
  expect(state.mode).toBe('survival');
  expect(state.health).toBe(state.maxHealth);
  expect(state.inventory.slots.every((slot) => slot === null)).toBe(true);

  // Ereignisse mitschreiben (nur lesend über den Event-Bus der GameApi)
  await page.evaluate(() => {
    const log: string[] = [];
    (window as unknown as { __events: string[] }).__events = log;
    const events = window.__blockwelt!.game.events;
    events.on('blockBroken', () => log.push('blockBroken'));
    events.on('blockPlaced', () => log.push('blockPlaced'));
    events.on('itemPickedUp', () => log.push('itemPickedUp'));
  });
  const events = () => page.evaluate(() => (window as unknown as { __events: string[] }).__events.slice());

  // 2. Ins Spiel klicken (Pointer-Lock) und laufen: vorwärts mit Springen, dann seitwärts
  await lockPointer(page);
  const start = (await gameState(page)).debug.position;
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(350);
  }
  await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyA');
  state = await gameState(page);
  const moved = Math.hypot(state.debug.position.x - start.x, state.debug.position.z - start.z);
  expect(moved, 'Spieler hat sich nicht bewegt').toBeGreaterThan(1);
  await shot(page, testInfo, 'spiel-03-gelaufen', 40);

  // 3. Umsehen: Maus nach rechts und nach unten, bis ein Block anvisiert ist
  const yawBefore = state.debug.yaw;
  await page.mouse.move(640, 360);
  await page.mouse.move(840, 360, { steps: 8 });
  await page.mouse.move(840, 560, { steps: 8 });
  await waitForState(page, 'state.debug.target !== null', 5_000);
  state = await gameState(page);
  expect(state.debug.yaw).not.toBeCloseTo(yawBefore, 1);
  expect(state.debug.pitch).toBeLessThan(-20);

  // 4. Abbauen: linke Maustaste halten, Risse sichtbar, Drop landet im Inventar
  const target = state.debug.target!;
  await page.mouse.down();
  await waitForState(page, 'state.breakProgress > 0.2', 10_000);
  await shot(page, testInfo, 'spiel-04-abbauen', 40);
  await waitForState(page, 'state.inventory.slots.some((slot) => slot !== null)', 15_000);
  await page.mouse.up();
  state = await gameState(page);
  expect(await events()).toContain('blockBroken');
  expect(await events()).toContain('itemPickedUp');
  const picked = state.inventory.slots[0];
  expect(picked, 'Drop liegt im ersten Hotbar-Slot').not.toBeNull();
  expect(state.breakProgress).toBe(0);
  expect(state.debug.target?.position).not.toEqual(target.position);
  await shot(page, testInfo, 'spiel-05-abgebaut', 40);

  // 5. Bauen: Rechtsklick setzt den Block aus der Hand an die anvisierte Fläche
  await page.keyboard.press('Digit1');
  await waitForState(page, 'state.debug.target !== null', 5_000);
  await holdMouse(page, 'right', 60);
  await page.waitForTimeout(300);
  state = await gameState(page);
  expect(await events()).toContain('blockPlaced');
  expect(state.inventory.slots[0]?.count ?? 0).toBe(picked!.count - 1);
  await shot(page, testInfo, 'spiel-06-gebaut', 40);

  // Noch ein paar Blöcke abbauen, damit genug zum Ablegen da ist
  await holdMouse(page, 'left', 2_500);

  // 6. Inventar öffnen (E): 2×2-Raster, Item ins Raster legen und wieder schließen
  await page.keyboard.press('KeyE');
  await waitForState(page, "state.screen === 'inventory'", 5_000);
  const panel = page.locator('.bw-container').filter({ hasText: 'Inventar' });
  await expect(panel).toBeVisible();
  const grid = panel.locator('.bw-crafting .bw-grid > *');
  await expect(grid).toHaveCount(4);
  const [a, b, c] = await Promise.all([0, 1, 2].map((i) => grid.nth(i).boundingBox()));
  expect(b!.x, '2×2-Raster: zweiter Slot rechts neben dem ersten').toBeGreaterThan(a!.x + 10);
  expect(c!.y, '2×2-Raster: dritter Slot unter dem ersten').toBeGreaterThan(a!.y + 10);
  const hotbar = panel.locator('.bw-grid-9').nth(1).locator(':scope > *');
  await hotbar.nth(0).click();
  await waitForState(page, 'state.inventory.cursor !== null', 2_000);
  await grid.nth(0).click({ button: 'right' });
  await waitForState(page, 'state.inventory.crafting.slots[0] !== null', 2_000);
  await shot(page, testInfo, 'spiel-07-inventar', 40);
  await page.keyboard.press('KeyE');
  await waitForState(page, "state.screen === 'playing'", 5_000);
  state = await gameState(page);
  expect(state.inventory.cursor, 'Mauszeiger-Stapel geht beim Schließen zurück ins Inventar').toBeNull();
  expect(state.inventory.crafting.slots.every((slot) => slot === null)).toBe(true);
  expect(state.inventory.slots.filter(Boolean).length).toBeGreaterThan(0);
  await expect(page.locator('.bw-cursor-item'), 'kein Item-Symbol bleibt am Mauszeiger hängen').toBeHidden();

  // 7. Pause über den Verlust des Pointer-Locks (wie Esc im Browser), dann weiterspielen
  await page.evaluate(() => document.exitPointerLock());
  await waitForState(page, "state.screen === 'paused'", 5_000);
  await shot(page, testInfo, 'spiel-08-pause', 40);
  await page.getByRole('button', { name: 'Weiterspielen' }).click();
  await waitForState(page, "state.screen === 'playing'", 5_000);
  await page.waitForFunction(() => document.pointerLockElement?.id === 'game', null, { timeout: 5_000 });

  // 8. Weiterspielen, bis 60 Sekunden um sind: herumlaufen, umsehen, gelegentlich graben
  let round = 0;
  while (Date.now() - started < PLAY_SECONDS * 1000) {
    const key = ['KeyW', 'KeyD', 'KeyS', 'KeyA'][round % 4];
    await page.keyboard.down(key);
    await page.keyboard.press('Space');
    await page.waitForTimeout(600);
    await page.keyboard.up(key);
    await page.mouse.move(640 + ((round * 97) % 300) - 150, 400, { steps: 4 });
    if (round % 3 === 0) await holdMouse(page, 'left', 800);
    round++;
  }
  state = await gameState(page);
  expect(state.screen).toBe('playing');
  expect(state.health).toBeGreaterThan(0);
  expect(state.debug.chunks).toBeGreaterThan(20);
  expect(state.debug.fps).toBeGreaterThan(0);
  expect(state.time.totalTicks).toBeGreaterThan(3000 + 40 * 20);
  await shot(page, testInfo, 'spiel-09-nach-60s', 40);

  // 9. Debug-Anzeige (F3)
  await page.keyboard.press('F3');
  await waitForState(page, 'state.debugVisible', 2_000);
  await shot(page, testInfo, 'spiel-10-debug', 40);

  expect(errors, `Konsolenfehler:\n${errors.join('\n')}`).toEqual([]);
});
