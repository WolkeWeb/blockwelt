/**
 * Inventar- und Werkbank-Bildschirm.
 *
 * Beide teilen sich den Aufbau: Crafting-Raster + Ergebnis, Hauptinventar (3×9) und Hotbar (1×9).
 * Das Inventar hat 2×2, die Werkbank 3×3 Rasterfelder.
 *
 * Klicks, Rechtsklicks, Shift-Klicks und Drag & Drop gehen ausschließlich über die {@link GameApi}.
 *
 * @module ui/inventory
 */
import type { GameApi, GameState, ItemStack, Registry, SlotRef } from '../core';
import { el } from './dom';
import type { IconPainter } from './icons';
import { createSlotView, type CursorLayer, type DragState, type SlotView, type Tooltip } from './slots';

/** Ein Bildschirm-Panel der Oberfläche. */
export interface Panel {
  readonly element: HTMLElement;
  /** Aktualisiert den Inhalt aus dem Spielzustand. */
  update(state: GameState): void;
  /** Wird beim Wechsel auf diesen Bildschirm aufgerufen. */
  onShow?(): void;
}

/** Gemeinsame Abhängigkeiten aller Panels. */
export interface PanelContext {
  readonly registry: Registry;
  readonly game: GameApi;
  readonly painter: IconPainter;
  readonly tooltip: Tooltip;
  /** Position des Mauszeigers in Fensterkoordinaten. */
  readonly pointer: { x: number; y: number };
}

interface SlotGroup {
  readonly element: HTMLElement;
  readonly slots: SlotView[];
}

function slotGroup(className: string, refs: readonly SlotRef[], ctx: PanelContext, drag: DragState): SlotGroup {
  const element = el('div', `bw-grid ${className}`);
  const slotContext = { registry: ctx.registry, game: ctx.game, painter: ctx.painter, tooltip: ctx.tooltip, drag };
  const slots = refs.map((ref) => {
    const view = createSlotView(ref, slotContext);
    element.append(view.element);
    return view;
  });
  return { element, slots };
}

/** Stapel eines Inventar-Slot-Index. */
function inventoryStack(state: GameState, index: number): ItemStack | null {
  return state.inventory.slots[index] ?? null;
}

/** Erzeugt den Inventar- (2×2) oder Werkbank-Bildschirm (3×3). */
export function createContainerPanel(kind: 'inventory' | 'workbench', ctx: PanelContext, cursor: CursorLayer): Panel {
  const size = kind === 'inventory' ? 2 : 3;
  const drag: DragState = { from: null };

  const element = el('div', 'bw-panel bw-container');
  const title = el('div', 'bw-panel-title', kind === 'inventory' ? 'Inventar' : 'Werkbank');

  const craftingRefs: SlotRef[] = Array.from({ length: size * size }, (_, index) => ({ area: 'crafting', index }));
  const crafting = slotGroup(`bw-grid-${size}`, craftingRefs, ctx, drag);
  const result = createSlotView({ area: 'result' }, {
    registry: ctx.registry,
    game: ctx.game,
    painter: ctx.painter,
    tooltip: ctx.tooltip,
    drag,
  });
  const craftingArea = el('div', 'bw-crafting');
  craftingArea.append(crafting.element, el('div', 'bw-arrow', '➜'), result.element);

  const mainRefs: SlotRef[] = Array.from({ length: 27 }, (_, i) => ({ area: 'inventory', index: i + 9 }));
  const main = slotGroup('bw-grid-9', mainRefs, ctx, drag);

  const hotbarRefs: SlotRef[] = Array.from({ length: 9 }, (_, index) => ({ area: 'inventory', index }));
  const hotbar = slotGroup('bw-grid-9', hotbarRefs, ctx, drag);

  element.append(
    title,
    craftingArea,
    el('div', 'bw-row-title', 'Hauptinventar'),
    main.element,
    el('div', 'bw-separator'),
    el('div', 'bw-row-title', 'Schnellleiste'),
    hotbar.element,
  );

  return {
    element,
    update(state) {
      const inventory = state.inventory;
      for (let i = 0; i < craftingRefs.length; i++) {
        crafting.slots[i].update(inventory.crafting.slots[i] ?? null);
      }
      result.update(inventory.crafting.result);
      for (let i = 0; i < mainRefs.length; i++) main.slots[i].update(inventoryStack(state, i + 9));
      for (let i = 0; i < hotbarRefs.length; i++) hotbar.slots[i].update(inventoryStack(state, i), i === inventory.selected);
      cursor.update(inventory.cursor, ctx.pointer.x, ctx.pointer.y, inventory.cursor !== null);
    },
  };
}
