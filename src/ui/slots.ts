/**
 * Inventar-Slots, Tooltip und der Stapel am Mauszeiger.
 *
 * Slots kennen nur ihren {@link SlotRef} und rufen ausschließlich Aktionen der
 * {@link GameApi} auf (`clickSlot`, `moveSlot`) – nie Welt, Physik oder Renderer.
 *
 * @module ui/slots
 */
import type { GameApi, ItemStack, Registry, SlotRef } from '../core';
import { el } from './dom';
import type { IconPainter } from './icons';

/** Tooltip mit dem Item-Namen. */
export interface Tooltip {
  readonly element: HTMLElement;
  show(text: string, x: number, y: number): void;
  hide(): void;
}

/** Erzeugt einen Tooltip, der an der Maus hängt. */
export function createTooltip(parent: HTMLElement): Tooltip {
  const element = el('div', 'bw-tooltip');
  element.style.display = 'none';
  parent.append(element);
  return {
    element,
    show(text, x, y) {
      element.textContent = text;
      element.style.display = '';
      element.style.left = `${x + 14}px`;
      element.style.top = `${y + 14}px`;
    },
    hide() {
      element.style.display = 'none';
    },
  };
}

/** Anteil der verbleibenden Haltbarkeit in Prozent, oder `null` bei neuen Werkzeugen. */
export function durabilityPercent(durability: number | undefined, maxDurability: number): number | null {
  if (durability === undefined || maxDurability <= 0) return null;
  const clamped = Math.max(0, Math.min(durability, maxDurability));
  return (clamped / maxDurability) * 100;
}

/** Farbe des Haltbarkeitsbalkens (grün → gelb → rot). */
export function durabilityColor(percent: number): string {
  if (percent > 50) return '#4ce04c';
  if (percent > 25) return '#e0d24c';
  return '#e04c4c';
}

/** Gemeinsamer Zustand für Drag & Drop in einem Panel. */
export interface DragState {
  from: SlotRef | null;
}

/** Alles, was ein Slot zum Arbeiten braucht. */
export interface SlotContext {
  readonly registry: Registry;
  readonly game: GameApi;
  readonly painter: IconPainter;
  readonly tooltip: Tooltip;
  readonly drag: DragState;
}

/** Ein Slot in der Oberfläche. */
export interface SlotView {
  readonly element: HTMLElement;
  /** Aktualisiert Inhalt und Auswahlmarkierung. */
  update(stack: ItemStack | null, selected?: boolean): void;
}

/**
 * Erzeugt einen Slot. Mit `ref` ist er bedienbar (Klick, Rechtsklick, Shift-Klick, Drag & Drop),
 * ohne `ref` (z. B. die Hotbar im HUD) zeigt er nur an.
 */
export function createSlotView(ref: SlotRef | null, ctx: SlotContext): SlotView {
  const element = el('div', 'bw-slot');
  const icon = el('div', 'bw-icon');
  const count = el('span', 'bw-count');
  const bar = el('div', 'bw-durability');
  const barFill = el('span');
  bar.append(barFill);
  element.append(icon, bar, count);

  let itemName: string | null = null;

  element.addEventListener('mouseenter', (event) => {
    if (itemName) ctx.tooltip.show(itemName, event.clientX, event.clientY);
  });
  element.addEventListener('mousemove', (event) => {
    if (itemName) ctx.tooltip.show(itemName, event.clientX, event.clientY);
  });
  element.addEventListener('mouseleave', () => ctx.tooltip.hide());

  if (ref) {
    element.addEventListener('click', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      ctx.game.clickSlot(ref, 'left', event.shiftKey);
    });
    element.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      ctx.game.clickSlot(ref, 'right', event.shiftKey);
    });

    element.draggable = true;
    element.addEventListener('dragstart', (event) => {
      ctx.drag.from = ref;
      ctx.tooltip.hide();
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', '');
      }
    });
    element.addEventListener('dragover', (event) => {
      if (ctx.drag.from) {
        event.preventDefault();
        element.classList.add('bw-drop-target');
      }
    });
    element.addEventListener('dragleave', () => element.classList.remove('bw-drop-target'));
    element.addEventListener('drop', (event) => {
      event.preventDefault();
      element.classList.remove('bw-drop-target');
      const from = ctx.drag.from;
      ctx.drag.from = null;
      if (from) ctx.game.moveSlot(from, ref);
    });
    element.addEventListener('dragend', () => {
      ctx.drag.from = null;
      element.classList.remove('bw-drop-target');
    });
  }

  return {
    element,
    update(stack, selected = false) {
      element.classList.toggle('bw-selected', selected);
      const item = stack ? ctx.registry.getItemDef(stack.item) ?? null : null;
      ctx.painter.paint(icon, item);
      itemName = item?.displayName ?? null;

      count.textContent = stack && stack.count > 1 ? String(stack.count) : '';

      const percent = stack && item?.tool ? durabilityPercent(stack.durability, item.tool.maxDurability) : null;
      if (percent === null) {
        bar.style.display = 'none';
      } else {
        bar.style.display = 'block';
        barFill.style.width = `${percent}%`;
        barFill.style.background = durabilityColor(percent);
      }
    },
  };
}

/** Der Stapel, der am Mauszeiger hängt. */
export interface CursorLayer {
  readonly element: HTMLElement;
  update(stack: ItemStack | null, x: number, y: number, visible: boolean): void;
}

/** Erzeugt die Ebene für den Stapel am Mauszeiger. */
export function createCursorLayer(ctx: SlotContext): CursorLayer {
  const element = el('div', 'bw-cursor-item');
  const icon = el('div', 'bw-icon');
  const count = el('span', 'bw-count');
  element.append(icon, count);
  element.style.display = 'none';

  return {
    element,
    update(stack, x, y, visible) {
      const show = visible && stack !== null;
      element.style.display = show ? '' : 'none';
      if (!show || !stack) return;
      const item = ctx.registry.getItemDef(stack.item) ?? null;
      ctx.painter.paint(icon, item);
      count.textContent = stack.count > 1 ? String(stack.count) : '';
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
    },
  };
}
