import { describe, expect, it } from 'vitest';
import type { ItemStack, Recipe } from '../core';
import { consumeIngredients, craftResult, findRecipe } from './crafting';

const recipes: Recipe[] = [
  { type: 'shapeless', id: 'planks', ingredients: ['log'], result: { item: 'planks', count: 4 } },
  { type: 'shaped', id: 'stick', pattern: ['P', 'P'], key: { P: 'planks' }, result: { item: 'stick', count: 4 } },
  {
    type: 'shaped',
    id: 'table',
    pattern: ['PP', 'PP'],
    key: { P: 'planks' },
    result: { item: 'crafting_table', count: 1 },
  },
  {
    type: 'shaped',
    id: 'pickaxe',
    pattern: ['PPP', ' S ', ' S '],
    key: { P: 'planks', S: 'stick' },
    result: { item: 'wooden_pickaxe', count: 1 },
  },
  {
    type: 'shaped',
    id: 'axe',
    pattern: ['PP', 'PS', ' S'],
    key: { P: 'planks', S: 'stick' },
    result: { item: 'wooden_axe', count: 1 },
  },
  { type: 'shapeless', id: 'mix', ingredients: ['dirt', 'gravel', 'gravel'], result: { item: 'mix', count: 1 } },
];

const s = (item: string): ItemStack => ({ item, count: 1 });
/** Raster aus Text: ein Wort pro Zelle, `.` = leer. */
const grid = (size: number, ...cells: string[]): (ItemStack | null)[] =>
  Array.from({ length: size * size }, (_, i) => (cells[i] && cells[i] !== '.' ? s(cells[i]!) : null));
const id = (r: ReturnType<typeof findRecipe>) => r?.id ?? null;

describe('Formlose Rezepte', () => {
  it('passen an jeder Stelle', () => {
    expect(id(findRecipe(recipes, grid(2, 'log', '.', '.', '.'), 2))).toBe('planks');
    expect(id(findRecipe(recipes, grid(2, '.', '.', '.', 'log'), 2))).toBe('planks');
  });
  it('brauchen genau die Zutaten in beliebiger Reihenfolge, auch mehrfach', () => {
    expect(id(findRecipe(recipes, grid(3, 'gravel', '.', 'dirt', '.', '.', 'gravel'), 3))).toBe('mix');
    expect(id(findRecipe(recipes, grid(3, 'gravel', 'dirt'), 3))).toBeNull();
    expect(id(findRecipe(recipes, grid(3, 'gravel', 'gravel', 'dirt', 'dirt'), 3))).toBeNull();
  });
});

describe('Geformte Rezepte', () => {
  it('lassen sich im Raster verschieben', () => {
    expect(id(findRecipe(recipes, grid(2, 'planks', '.', 'planks', '.'), 2))).toBe('stick');
    expect(id(findRecipe(recipes, grid(2, '.', 'planks', '.', 'planks'), 2))).toBe('stick');
    expect(id(findRecipe(recipes, grid(3, '.', '.', '.', '.', 'planks', '.', '.', 'planks', '.'), 3))).toBe('stick');
  });
  it('2x2-Rezept passt im 3x3-Raster an jeder Ecke', () => {
    const cells = ['.', '.', '.', '.', 'planks', 'planks', '.', 'planks', 'planks'];
    expect(id(findRecipe(recipes, grid(3, ...cells), 3))).toBe('table');
  });
  it('erlauben gespiegelte Muster', () => {
    const normal = grid(3, 'planks', 'planks', '.', 'planks', 'stick', '.', '.', 'stick', '.');
    const mirrored = grid(3, 'planks', 'planks', '.', 'stick', 'planks', '.', 'stick', '.', '.');
    expect(id(findRecipe(recipes, normal, 3))).toBe('axe');
    expect(id(findRecipe(recipes, mirrored, 3))).toBe('axe');
  });
  it('passen nur ohne überzählige Items', () => {
    expect(id(findRecipe(recipes, grid(2, 'planks', 'planks', 'planks', 'dirt'), 2))).toBeNull();
    expect(id(findRecipe(recipes, grid(3, 'planks', 'planks', 'planks', 'planks'), 3))).toBeNull();
  });
  it('große Muster passen nicht ins 2x2-Raster', () => {
    const big = grid(3, 'planks', 'planks', 'planks', '.', 'stick', '.', '.', 'stick', '.');
    expect(id(findRecipe(recipes, big, 3))).toBe('pickaxe');
    expect(id(findRecipe(recipes, grid(2, 'planks', 'planks', '.', 'stick'), 2))).toBeNull();
  });
  it('falsche Zutaten finden nichts', () => {
    expect(id(findRecipe(recipes, grid(2, 'dirt', '.', 'dirt', '.'), 2))).toBeNull();
  });
});

describe('Ergebnis und Verbrauch', () => {
  it('liefert das Ergebnis mit Anzahl', () => {
    expect(craftResult(recipes, grid(2, 'log'), 2)).toEqual({ item: 'planks', count: 4 });
    expect(craftResult(recipes, grid(2), 2)).toBeNull();
  });
  it('verbraucht je ein Stück pro belegtem Slot', () => {
    const before: (ItemStack | null)[] = [{ item: 'log', count: 3 }, null, s('stick'), null];
    expect(consumeIngredients(before)).toEqual([{ item: 'log', count: 2 }, null, null, null]);
  });
});

describe('Muster mit Leerzeichen am Rand', () => {
  const padded: Recipe[] = [
    { type: 'shaped', id: 'rod', pattern: [' S ', ' S '], key: { S: 'stick' }, result: { item: 'rod', count: 1 } },
  ];
  const s: ItemStack = { item: 'stick', count: 1 };

  it('passt, obwohl das Muster leere Randspalten hat', () => {
    // 3×3: Stöcke links untereinander
    expect(craftResult(padded, [s, null, null, s, null, null, null, null, null], 3)).toEqual({ item: 'rod', count: 1 });
    // 2×2: rechts untereinander
    expect(craftResult(padded, [null, s, null, s], 2)).toEqual({ item: 'rod', count: 1 });
  });
});
