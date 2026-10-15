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

  const game = createGame({ registry, renderer, createWorld, stepPlayer, raycast, canvas });
  createUi({ root: uiRoot, game, atlas });
  window.__blockwelt = { game };

  canvas.addEventListener('click', () => game.onCanvasClick());
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas) game.onPointerLockLost();
  });

  // Phase 0: Es gibt noch kein Menü – direkt eine Platzhalter-Welt starten.
  void game.createWorld({ name: 'Platzhalter-Welt', seed: '1', mode: 'creative' });

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
