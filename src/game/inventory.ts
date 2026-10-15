/**
 * Inventar-Modell: reine Funktionen auf unveränderlichen Slot-Listen.
 * Stapel (`ItemStack`) werden nie verändert, sondern immer durch neue ersetzt.
 */
import type { ItemStack, Registry } from '../core';

/** Anzahl der Hotbar-Slots (Index 0–8). */
export const HOTBAR_SIZE = 9;
/** Gesamtzahl der Slots: 9 Hotbar + 27 Hauptinventar. */
export const INVENTORY_SIZE = 36;

/** Was die Inventar-Logik von der Registry braucht. */
export type ItemInfo = Pick<Registry, 'getItemDef'>;

/** Größte erlaubte Stapelgröße eines Items (unbekannte Items: 64). */
export function maxStackOf(items: ItemInfo, item: string): number {
  return items.getItemDef(item)?.maxStack ?? 64;
}

/** Leere Slot-Liste. */
export function emptySlots(size: number = INVENTORY_SIZE): (ItemStack | null)[] {
  return new Array<ItemStack | null>(size).fill(null);
}

/** Ob zwei Stapel zusammengelegt werden dürfen (gleiches Item, kein angebrochenes Werkzeug). */
export function canMerge(a: ItemStack, b: ItemStack): boolean {
  return a.item === b.item && a.durability === undefined && b.durability === undefined;
}

/** Ergebnis von {@link addItem}. */
export interface AddResult {
  /** Neue Slot-Liste. */
  readonly slots: (ItemStack | null)[];
  /** Was nicht mehr hineinpasste, oder `null`. */
  readonly remainder: ItemStack | null;
}

/**
 * Legt einen Stapel ins Inventar: erst auf vorhandene, nicht volle Stapel, dann in leere Slots
 * (jeweils Hotbar zuerst, von links).
 */
export function addItem(slots: readonly (ItemStack | null)[], items: ItemInfo, stack: ItemStack): AddResult {
  const next = slots.slice();
  const max = maxStackOf(items, stack.item);
  let left = stack.count;
  for (let i = 0; i < next.length && left > 0; i++) {
    const slot = next[i];
    if (slot && canMerge(slot, stack) && slot.count < max) {
      const moved = Math.min(max - slot.count, left);
      next[i] = { ...slot, count: slot.count + moved };
      left -= moved;
    }
  }
  for (let i = 0; i < next.length && left > 0; i++) {
    if (next[i] === null) {
      const moved = Math.min(max, left);
      next[i] = { ...stack, count: moved };
      left -= moved;
    }
  }
  return { slots: next, remainder: left > 0 ? { ...stack, count: left } : null };
}

/** Nimmt `count` Stück aus einem Slot (der Slot wird leer, wenn nichts übrig bleibt). */
export function removeFromSlot(
  slots: readonly (ItemStack | null)[],
  index: number,
  count: number,
): (ItemStack | null)[] {
  const next = slots.slice();
  const slot = next[index];
  if (!slot) return next;
  next[index] = slot.count > count ? { ...slot, count: slot.count - count } : null;
  return next;
}
