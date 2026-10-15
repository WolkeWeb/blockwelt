/**
 * Klicks auf Slots: Inventar, Crafting-Raster und Mauszeiger als unveränderliches Modell.
 * Alle Funktionen sind rein und liefern einen neuen {@link Container}.
 */
import type { ItemStack } from '../core';
import {
  HOTBAR_SIZE,
  INVENTORY_SIZE,
  addItem,
  canMerge,
  maxStackOf,
  type AddResult,
  type ItemInfo,
} from './inventory';

/** Maustaste für Slot-Klicks. */
export type Button = 'left' | 'right';

/** Slot und Mauszeiger-Stapel nach einem Klick. */
export interface ClickResult {
  readonly slot: ItemStack | null;
  readonly cursor: ItemStack | null;
}

function withCount(stack: ItemStack, count: number): ItemStack | null {
  return count > 0 ? { ...stack, count } : null;
}

/**
 * Klick auf einen einzelnen Slot, Verhalten wie gewohnt:
 * - Links: aufnehmen / ablegen / zusammenlegen / tauschen.
 * - Rechts: halben Stapel aufnehmen / ein einzelnes Item ablegen (oder zusammenlegen).
 */
export function clickStack(
  slot: ItemStack | null,
  cursor: ItemStack | null,
  button: Button,
  items: ItemInfo,
): ClickResult {
  if (cursor === null) {
    if (slot === null) return { slot, cursor };
    if (button === 'left' || slot.count === 1) return { slot: null, cursor: slot };
    const taken = Math.ceil(slot.count / 2);
    return { slot: withCount(slot, slot.count - taken), cursor: withCount(slot, taken) };
  }
  if (slot === null) {
    if (button === 'left') return { slot: cursor, cursor: null };
    return { slot: withCount(cursor, 1), cursor: withCount(cursor, cursor.count - 1) };
  }
  if (canMerge(slot, cursor)) {
    const room = maxStackOf(items, slot.item) - slot.count;
    const moved = Math.min(room, button === 'left' ? cursor.count : 1);
    if (moved <= 0) return { slot, cursor };
    return { slot: { ...slot, count: slot.count + moved }, cursor: withCount(cursor, cursor.count - moved) };
  }
  return { slot: cursor, cursor: slot };
}

/** Legt `stack` in den Bereich `[from, to)` einer Slot-Liste (erst zusammenlegen, dann leere Slots). */
export function insertIntoRange(
  slots: readonly (ItemStack | null)[],
  items: ItemInfo,
  stack: ItemStack,
  from: number,
  to: number,
): AddResult {
  const next = slots.slice();
  const max = maxStackOf(items, stack.item);
  let left = stack.count;
  for (let i = from; i < to && left > 0; i++) {
    const slot = next[i];
    if (slot && canMerge(slot, stack) && slot.count < max) {
      const moved = Math.min(max - slot.count, left);
      next[i] = { ...slot, count: slot.count + moved };
      left -= moved;
    }
  }
  for (let i = from; i < to && left > 0; i++) {
    if (next[i] === null) {
      const moved = Math.min(max, left);
      next[i] = { ...stack, count: moved };
      left -= moved;
    }
  }
  return { slots: next, remainder: left > 0 ? { ...stack, count: left } : null };
}

/** Wo ein Slot liegt. Das Ergebnisfeld des Crafting-Rasters gehört nicht zum Container (siehe `crafting.ts`). */
export type ContainerSlot =
  | { readonly area: 'inventory'; readonly index: number }
  | { readonly area: 'crafting'; readonly index: number };

/** Alles, was per Klick bewegt werden kann: Inventar, Crafting-Raster und der Mauszeiger. */
export interface Container {
  readonly inventory: readonly (ItemStack | null)[];
  readonly crafting: readonly (ItemStack | null)[];
  readonly cursor: ItemStack | null;
}

function validSlot(container: Container, ref: ContainerSlot): boolean {
  const list = ref.area === 'inventory' ? container.inventory : container.crafting;
  return Number.isInteger(ref.index) && ref.index >= 0 && ref.index < list.length;
}

/** Stapel in einem Slot. */
export function getSlot(container: Container, ref: ContainerSlot): ItemStack | null {
  const list = ref.area === 'inventory' ? container.inventory : container.crafting;
  return list[ref.index] ?? null;
}

/** Neuer Container mit geändertem Slot. */
export function setSlot(container: Container, ref: ContainerSlot, stack: ItemStack | null): Container {
  const key = ref.area === 'inventory' ? 'inventory' : 'crafting';
  const list = container[key].slice();
  list[ref.index] = stack;
  return { ...container, [key]: list };
}

/** Klick mit der Maus auf einen Slot, inklusive Shift-Klick (schnell verschieben). */
export function clickContainer(
  container: Container,
  ref: ContainerSlot,
  button: Button,
  shift: boolean,
  items: ItemInfo,
): Container {
  if (!validSlot(container, ref)) return container;
  const slot = getSlot(container, ref);
  if (shift && container.cursor === null) {
    if (slot === null) return container;
    const emptied = setSlot(container, ref, null);
    let result: AddResult;
    if (ref.area === 'inventory') {
      // Hotbar <-> Hauptinventar
      const [from, to] = ref.index < HOTBAR_SIZE ? [HOTBAR_SIZE, INVENTORY_SIZE] : [0, HOTBAR_SIZE];
      result = insertIntoRange(emptied.inventory, items, slot, from, to);
    } else {
      result = addItem(emptied.inventory, items, slot);
    }
    const moved: Container = { ...emptied, inventory: result.slots };
    return result.remainder ? setSlot(moved, ref, result.remainder) : moved;
  }
  const result = clickStack(slot, container.cursor, button, items);
  return { ...setSlot(container, ref, result.slot), cursor: result.cursor };
}

/**
 * Drag & Drop: verschiebt den Stapel aus `from` nach `to`. Ist das Ziel leer, wandert alles hin; mit gleichem Item
 * wird zusammengelegt (Rest bleibt in `from`); sonst tauschen beide Slots die Stapel.
 */
export function moveContainerSlot(
  container: Container,
  from: ContainerSlot,
  to: ContainerSlot,
  items: ItemInfo,
): Container {
  if (!validSlot(container, from) || !validSlot(container, to)) return container;
  if (from.area === to.area && from.index === to.index) return container;
  const source = getSlot(container, from);
  if (source === null) return container;
  const target = getSlot(container, to);
  if (target === null) return setSlot(setSlot(container, from, null), to, source);
  if (canMerge(source, target)) {
    const room = maxStackOf(items, target.item) - target.count;
    const moved = Math.min(room, source.count);
    if (moved <= 0) return container;
    const merged = setSlot(container, to, { ...target, count: target.count + moved });
    return setSlot(merged, from, withCount(source, source.count - moved));
  }
  return setSlot(setSlot(container, from, target), to, source);
}

/**
 * Schließt Crafting-Raster und Mauszeiger: alle Stapel wandern ins Inventar.
 * @returns neuer Container plus Stapel, die nicht mehr hineinpassten.
 */
export function flushToInventory(
  container: Container,
  items: ItemInfo,
): { container: Container; overflow: ItemStack[] } {
  let inventory = container.inventory;
  const overflow: ItemStack[] = [];
  for (const stack of [...container.crafting, container.cursor]) {
    if (!stack) continue;
    const result = addItem(inventory, items, stack);
    inventory = result.slots;
    if (result.remainder) overflow.push(result.remainder);
  }
  return {
    container: { inventory, crafting: container.crafting.map(() => null), cursor: null },
    overflow,
  };
}
