import { describe, expect, it } from 'vitest';
import type { ItemStack } from '../core';
import {
  clickContainer,
  clickStack,
  flushToInventory,
  moveContainerSlot,
  type Container,
} from './container';
import { HOTBAR_SIZE, INVENTORY_SIZE, addItem, emptySlots, removeFromSlot } from './inventory';

const MAX: Record<string, number> = { pickaxe: 1, stone: 64, dirt: 64 };
const items = { getItemDef: (id: string) => ({ maxStack: MAX[id] ?? 64 }) as never };
const s = (item: string, count: number): ItemStack => ({ item, count });
const container = (over: Partial<Container> = {}): Container => ({
  inventory: emptySlots(),
  crafting: emptySlots(4),
  cursor: null,
  ...over,
});
const inv = (entries: Record<number, ItemStack>) => {
  const slots = emptySlots();
  for (const [i, v] of Object.entries(entries)) slots[Number(i)] = v;
  return slots;
};

describe('Inventar-Größe', () => {
  it('hat 9 Hotbar- und 27 Hauptslots', () => {
    expect(HOTBAR_SIZE).toBe(9);
    expect(INVENTORY_SIZE - HOTBAR_SIZE).toBe(27);
    expect(emptySlots()).toHaveLength(36);
  });
});

describe('addItem', () => {
  it('füllt erst vorhandene Stapel, dann leere Slots', () => {
    const r = addItem(inv({ 3: s('stone', 60) }), items, s('stone', 10));
    expect(r.slots[3]).toEqual(s('stone', 64));
    expect(r.slots[0]).toEqual(s('stone', 6));
    expect(r.remainder).toBeNull();
  });
  it('Werkzeuge stapeln nicht', () => {
    const r = addItem(inv({ 0: s('pickaxe', 1) }), items, s('pickaxe', 1));
    expect(r.slots[0]).toEqual(s('pickaxe', 1));
    expect(r.slots[1]).toEqual(s('pickaxe', 1));
  });
  it('meldet den Rest bei vollem Inventar', () => {
    const full = emptySlots().map(() => s('dirt', 64));
    const r = addItem(full, items, s('stone', 5));
    expect(r.remainder).toEqual(s('stone', 5));
    expect(r.slots).toEqual(full);
  });
  it('verändert die Eingabe nicht', () => {
    const slots = emptySlots();
    addItem(slots, items, s('stone', 1));
    expect(slots.every((x) => x === null)).toBe(true);
  });
});

describe('removeFromSlot', () => {
  it('verringert oder leert den Slot', () => {
    expect(removeFromSlot(inv({ 0: s('stone', 3) }), 0, 1)[0]).toEqual(s('stone', 2));
    expect(removeFromSlot(inv({ 0: s('stone', 1) }), 0, 1)[0]).toBeNull();
  });
});

describe('clickStack', () => {
  it('links: aufnehmen, ablegen', () => {
    expect(clickStack(s('stone', 5), null, 'left', items)).toEqual({ slot: null, cursor: s('stone', 5) });
    expect(clickStack(null, s('stone', 5), 'left', items)).toEqual({ slot: s('stone', 5), cursor: null });
    expect(clickStack(null, null, 'left', items)).toEqual({ slot: null, cursor: null });
  });
  it('links: zusammenlegen mit Überlauf', () => {
    expect(clickStack(s('stone', 60), s('stone', 10), 'left', items)).toEqual({
      slot: s('stone', 64),
      cursor: s('stone', 6),
    });
  });
  it('links: verschiedene Items tauschen', () => {
    expect(clickStack(s('dirt', 2), s('stone', 7), 'left', items)).toEqual({
      slot: s('stone', 7),
      cursor: s('dirt', 2),
    });
  });
  it('rechts: halben Stapel aufnehmen (aufgerundet)', () => {
    expect(clickStack(s('stone', 5), null, 'right', items)).toEqual({ slot: s('stone', 2), cursor: s('stone', 3) });
    expect(clickStack(s('stone', 1), null, 'right', items)).toEqual({ slot: null, cursor: s('stone', 1) });
  });
  it('rechts: einzelnes Item ablegen', () => {
    expect(clickStack(null, s('stone', 3), 'right', items)).toEqual({ slot: s('stone', 1), cursor: s('stone', 2) });
    expect(clickStack(s('stone', 1), s('stone', 1), 'right', items)).toEqual({ slot: s('stone', 2), cursor: null });
  });
  it('rechts: anderes Item tauscht', () => {
    expect(clickStack(s('dirt', 2), s('stone', 7), 'right', items)).toEqual({
      slot: s('stone', 7),
      cursor: s('dirt', 2),
    });
  });
  it('volle Stapel ändern nichts', () => {
    const r = clickStack(s('stone', 64), s('stone', 3), 'left', items);
    expect(r).toEqual({ slot: s('stone', 64), cursor: s('stone', 3) });
  });
});

describe('clickContainer', () => {
  it('Shift-Klick verschiebt Hotbar → Hauptinventar und zurück', () => {
    let c = container({ inventory: inv({ 2: s('stone', 5) }) });
    c = clickContainer(c, { area: 'inventory', index: 2 }, 'left', true, items);
    expect(c.inventory[2]).toBeNull();
    expect(c.inventory[HOTBAR_SIZE]).toEqual(s('stone', 5));
    c = clickContainer(c, { area: 'inventory', index: HOTBAR_SIZE }, 'left', true, items);
    expect(c.inventory[0]).toEqual(s('stone', 5));
  });
  it('Shift-Klick aus dem Crafting-Raster geht ins Inventar', () => {
    let c = container({ crafting: [s('dirt', 2), null, null, null] });
    c = clickContainer(c, { area: 'crafting', index: 0 }, 'left', true, items);
    expect(c.crafting[0]).toBeNull();
    expect(c.inventory[0]).toEqual(s('dirt', 2));
  });
  it('ungültige Slots werden ignoriert', () => {
    const c = container();
    expect(clickContainer(c, { area: 'inventory', index: 99 }, 'left', false, items)).toBe(c);
  });
  it('normaler Klick nutzt den Mauszeiger', () => {
    let c = container({ inventory: inv({ 0: s('stone', 4) }) });
    c = clickContainer(c, { area: 'inventory', index: 0 }, 'left', false, items);
    expect(c.cursor).toEqual(s('stone', 4));
    c = clickContainer(c, { area: 'crafting', index: 1 }, 'left', false, items);
    expect(c.crafting[1]).toEqual(s('stone', 4));
    expect(c.cursor).toBeNull();
  });
});

describe('moveContainerSlot', () => {
  it('verschiebt, legt zusammen und tauscht', () => {
    let c = container({ inventory: inv({ 0: s('stone', 5), 1: s('dirt', 2), 2: s('stone', 62) }) });
    c = moveContainerSlot(c, { area: 'inventory', index: 0 }, { area: 'inventory', index: 5 }, items);
    expect(c.inventory[5]).toEqual(s('stone', 5));
    expect(c.inventory[0]).toBeNull();
    c = moveContainerSlot(c, { area: 'inventory', index: 5 }, { area: 'inventory', index: 2 }, items);
    expect(c.inventory[2]).toEqual(s('stone', 64));
    expect(c.inventory[5]).toEqual(s('stone', 3));
    c = moveContainerSlot(c, { area: 'inventory', index: 1 }, { area: 'inventory', index: 5 }, items);
    expect(c.inventory[1]).toEqual(s('stone', 3));
    expect(c.inventory[5]).toEqual(s('dirt', 2));
  });
});

describe('flushToInventory', () => {
  it('räumt Raster und Mauszeiger ins Inventar', () => {
    const c = container({ crafting: [s('stone', 2), null, s('dirt', 1), null], cursor: s('stone', 3) });
    const { container: after, overflow } = flushToInventory(c, items);
    expect(after.crafting.every((x) => x === null)).toBe(true);
    expect(after.cursor).toBeNull();
    expect(after.inventory[0]).toEqual(s('stone', 5));
    expect(after.inventory[1]).toEqual(s('dirt', 1));
    expect(overflow).toEqual([]);
  });
});
