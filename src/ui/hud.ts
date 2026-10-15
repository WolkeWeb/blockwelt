/**
 * HUD während des Spiels: Fadenkreuz, Hotbar, Herzen, Luftblasen und Debug-Anzeige (F3).
 *
 * Die Spiellogik schaltet die Bildschirme und F3 um; die Oberfläche zeichnet nur den Zustand.
 *
 * @module ui/hud
 */
import type { Face, GameApi, GameState, Registry } from '../core';
import { el, formatNumber, setVisible } from './dom';
import type { IconPainter } from './icons';
import { createSlotView, type SlotView, type Tooltip } from './slots';

/** Füllstand eines Herzens: 0 leer, 1 halb, 2 voll. */
export function heartFill(health: number, index: number): 0 | 1 | 2 {
  const remaining = health - index * 2;
  if (remaining >= 2) return 2;
  if (remaining >= 1) return 1;
  return 0;
}

/** Anzahl der Luftblasen (0–10) aus verbleibender Luft. */
export function airBubbleCount(air: number, maxAir: number): number {
  if (maxAir <= 0) return 0;
  return Math.max(0, Math.min(10, Math.ceil((air / maxAir) * 10)));
}

/** Deutscher Name einer Himmelsrichtung. */
export function facingName(facing: Face): string {
  switch (facing) {
    case 'north':
      return 'Norden';
    case 'south':
      return 'Süden';
    case 'east':
      return 'Osten';
    case 'west':
      return 'Westen';
    default:
      return String(facing);
  }
}

/** Text der Debug-Anzeige (F3). */
export function debugText(state: GameState): string {
  const { debug } = state;
  return [
    'Blockwelt – Debug (F3)',
    `FPS: ${debug.fps}`,
    `Position: ${formatNumber(debug.position.x)} / ${formatNumber(debug.position.y)} / ${formatNumber(debug.position.z)}`,
    `Chunk: ${debug.chunk.x} / ${debug.chunk.z}`,
    `Blick: ${facingName(debug.facing)} (yaw ${Math.round(debug.yaw)}°, pitch ${Math.round(debug.pitch)}°)`,
    debug.target
      ? `Ziel: ${debug.target.position.x}/${debug.target.position.y}/${debug.target.position.z} (${debug.target.block})`
      : 'Ziel: –',
    `Chunks: ${debug.chunks}   Draw-Calls: ${debug.drawCalls}   Dreiecke: ${debug.triangles}`,
  ].join('\n');
}

/** Das HUD. */
export interface Hud {
  readonly element: HTMLElement;
  update(state: GameState): void;
}

/** Bildschirme, auf denen Hotbar und Herzen sichtbar sind. */
const HUD_SCREENS = new Set(['playing', 'paused', 'dead']);

const HEART_COUNT = 10;
const BUBBLE_COUNT = 10;

/** Erzeugt das HUD. */
export function createHud(options: {
  registry: Registry;
  game: GameApi;
  painter: IconPainter;
  tooltip: Tooltip;
}): Hud {
  const { registry, game, painter, tooltip } = options;
  const element = el('div', 'bw-hud');

  const crosshair = el('div', 'bw-crosshair');
  const clickHint = el('div', 'bw-click-hint', 'Klicken zum Spielen');
  const bottom = el('div', 'bw-bottom');
  const status = el('div', 'bw-status');
  const hearts = el('div', 'bw-hearts');
  const air = el('div', 'bw-air');
  const hotbar = el('div', 'bw-hotbar bw-grid bw-grid-9');

  status.append(hearts, air);
  bottom.append(status, hotbar);
  element.append(crosshair, clickHint, bottom);

  const heartFills: HTMLElement[] = [];
  for (let i = 0; i < HEART_COUNT; i++) {
    const heart = el('span', 'bw-heart');
    const base = el('span', 'bw-heart-base', '♥');
    const fill = el('span', 'bw-heart-fill', '♥');
    heart.append(base, fill);
    hearts.append(heart);
    heartFills.push(fill);
  }

  const bubbles: HTMLElement[] = [];
  for (let i = 0; i < BUBBLE_COUNT; i++) {
    const bubble = el('div', 'bw-bubble');
    air.append(bubble);
    bubbles.push(bubble);
  }

  const slotContext = { registry, game, painter, tooltip, drag: { from: null } };
  const hotbarSlots: SlotView[] = [];
  for (let i = 0; i < 9; i++) {
    const slot = createSlotView(null, slotContext);
    hotbar.append(slot.element);
    hotbarSlots.push(slot);
  }

  const debug = el('div', 'bw-debug');
  element.append(debug);

  return {
    element,
    update(state) {
      const hudVisible = HUD_SCREENS.has(state.screen) && state.world !== null;
      setVisible(element, hudVisible || state.debugVisible);
      setVisible(bottom, hudVisible);
      setVisible(crosshair, state.screen === 'playing');
      setVisible(clickHint, state.screen === 'playing' && !state.pointerLocked);

      if (hudVisible) {
        for (let i = 0; i < HEART_COUNT; i++) {
          const filled = heartFill(state.health, i);
          heartFills[i].style.width = filled === 2 ? '100%' : filled === 1 ? '50%' : '0%';
        }

        setVisible(air, state.underwater);
        const bubblesShown = state.underwater ? airBubbleCount(state.air, state.maxAir) : 0;
        bubbles.forEach((bubble, index) => setVisible(bubble, index < bubblesShown));

        const slots = state.inventory.slots;
        hotbarSlots.forEach((slot, index) => {
          slot.update(slots[index] ?? null, index === state.inventory.selected);
        });
      }

      setVisible(debug, state.debugVisible);
      if (state.debugVisible) debug.textContent = debugText(state);
    },
  };
}
