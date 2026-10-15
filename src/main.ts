/**
 * Einstiegspunkt: steckt alle Bereiche über ihre Verträge zusammen und startet die Schleifen.
 *
 * - Logik: fester Zeitschritt mit 20 Ticks pro Sekunde (Akkumulator, höchstens 5 Ticks Nachholen pro Frame).
 * - Darstellung: `requestAnimationFrame`, Kamera zwischen zwei Ticks interpoliert.
 * - Pointer-Lock: Klick aufs Canvas → Spiel fortsetzen; Verlust des Locks (Esc) → Pause.
 *
 * Zuständig: Claude Code
 */
import { TICKS_PER_SECOND, TICK_SECONDS } from './core';
import { createTextureAtlas } from './assets';
import { createRegistry } from './data';
import { createGame, type Game } from './game';
import { raycast, stepPlayer } from './physics';
import { createSaveStore } from './save';
import { createRenderer } from './render';
import { createUi } from './ui';
import { createWorld } from './world';

/** Höchstens so viele Ticks werden pro Frame nachgeholt (danach wird die Zeit verworfen, z. B. nach Tab-Wechsel). */
const MAX_TICKS_PER_FRAME = 5;

declare global {
  interface Window {
    /** Zugriff für Tests und die Browser-Konsole. */
    __blockwelt?: { game: Game };
  }
}

function showFatalError(root: HTMLElement, error: unknown): void {
  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'absolute',
    inset: '0',
    display: 'grid',
    placeItems: 'center',
    color: '#fff',
    font: '16px monospace',
    textAlign: 'center',
    padding: '16px',
  });
  box.textContent = `Blockwelt konnte nicht starten: ${error instanceof Error ? error.message : String(error)}`;
  root.append(box);
}

const PLACEHOLDER_WORLD = 'Platzhalter-Welt';

/** Lädt die zuletzt gespeicherte Platzhalter-Welt oder legt sie neu an. */
async function startPlaceholderWorld(game: Game): Promise<void> {
  const existing = (await game.listWorlds()).find((world) => world.name === PLACEHOLDER_WORLD);
  if (existing) await game.loadWorld(existing.id);
  else await game.createWorld({ name: PLACEHOLDER_WORLD, seed: '1', mode: 'creative' });
}

function start(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#game');
  const uiRoot = document.querySelector<HTMLElement>('#ui');
  if (!canvas || !uiRoot) throw new Error('#game oder #ui fehlt in index.html');

  const registry = createRegistry();
  const atlas = createTextureAtlas();
  const renderer = createRenderer({ registry, atlas });
  try {
    renderer.attach(canvas);
  } catch (error) {
    showFatalError(uiRoot, error);
    return;
  }

  const game = createGame({ registry, renderer, createWorld, stepPlayer, raycast, store: createSaveStore(), canvas });
  createUi({ root: uiRoot, game, atlas });
  window.__blockwelt = { game };

  canvas.addEventListener('click', () => game.onCanvasClick());
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas) game.onPointerLockLost();
  });

  // Beim Verlassen der Seite und beim Wechsel des Tabs speichern (zusätzlich zum Autosave alle 30 s).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void game.saveNow();
  });
  window.addEventListener('pagehide', () => void game.saveNow());

  // Solange die Oberfläche kein Menü hat (Phase 0/1): direkt die Platzhalter-Welt laden oder anlegen.
  // Mit `?menu` in der Adresse wird nichts gestartet (dann übernimmt die Oberfläche).
  if (!new URLSearchParams(location.search).has('menu')) void startPlaceholderWorld(game);

  const tickMs = TICK_SECONDS * 1000;
  const startTime = performance.now();
  let lastFrame = startTime;
  let accumulator = 0;
  let fpsFrames = 0;
  let fpsSince = startTime;

  const loop = (now: number) => {
    const delta = Math.min(Math.max(now - lastFrame, 0), 1000);
    lastFrame = now;
    accumulator += delta;
    let ticks = 0;
    while (accumulator >= tickMs && ticks < MAX_TICKS_PER_FRAME) {
      game.tick();
      accumulator -= tickMs;
      ticks++;
    }
    if (ticks === MAX_TICKS_PER_FRAME) accumulator = Math.min(accumulator, tickMs);

    game.frame(accumulator / tickMs, delta / 1000, (now - startTime) / 1000);

    fpsFrames++;
    if (now - fpsSince >= 500) {
      game.setFps(Math.round((fpsFrames * 1000) / (now - fpsSince)));
      fpsFrames = 0;
      fpsSince = now;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  console.info(`Blockwelt gestartet (${TICKS_PER_SECOND} Ticks/s).`);
}

start();
