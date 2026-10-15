/**
 * HUD während des Spiels. Aktuell: die Hotbar unten mittig.
 * (Fadenkreuz, Herzen, Luftblasen und Debug-Anzeige folgen in O8.)
 *
 * Die Spiellogik bestimmt Auswahl und Bildschirm; die Oberfläche zeichnet nur den Zustand.
 *
 * @module ui/hud
 */
import type { GameApi, GameState, Registry } from '../core';
import { el, setVisible } from './dom';
import type { IconPainter } from './icons';
import { createSlotView, type SlotView, type Tooltip } from './slots';

/** Das HUD. */
export interface Hud {
  readonly element: HTMLElement;
  update(state: GameState): void;
}

/** Bildschirme, auf denen das HUD sichtbar ist. */
const HUD_SCREENS = new Set(['playing', 'paused', 'dead']);

/** Erzeugt das HUD. */
export function createHud(options: {
  registry: Registry;
  game: GameApi;
  painter: IconPainter;
  tooltip: Tooltip;
}): Hud {
  const { registry, game, painter, tooltip } = options;
  const element = el('div', 'bw-hud');
  const bottom = el('div', 'bw-bottom');
  const hotbar = el('div', 'bw-hotbar bw-grid bw-grid-9');
  bottom.append(hotbar);
  element.append(bottom);

  const slotContext = { registry, game, painter, tooltip, drag: { from: null } };
  const hotbarSlots: SlotView[] = [];
  for (let i = 0; i < 9; i++) {
    const slot = createSlotView(null, slotContext);
    hotbar.append(slot.element);
    hotbarSlots.push(slot);
  }

  return {
    element,
    update(state) {
      const visible = HUD_SCREENS.has(state.screen) && state.world !== null;
      setVisible(element, visible);
      if (!visible) return;

      const slots = state.inventory.slots;
      hotbarSlots.forEach((slot, index) => {
        slot.update(slots[index] ?? null, index === state.inventory.selected);
      });
    },
  };
}
