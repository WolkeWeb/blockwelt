import { describe, expect, it } from 'vitest';
import { createRegistry } from './index';
import { RECIPES } from './recipes';

describe('Rezepte (O4)', () => {
  const registry = createRegistry();
  const knownItems = new Set(registry.items.map((item) => item.id));

  it('verwendet ausschließlich existierende Items', () => {
    for (const recipe of RECIPES) {
      if (recipe.type === 'shaped') {
        for (const [symbol, item] of Object.entries(recipe.key)) {
          expect(knownItems.has(item), `${recipe.id}: Zutat ${symbol} = ${item}`).toBe(true);
        }
      } else {
        for (const item of recipe.ingredients) {
          expect(knownItems.has(item), `${recipe.id}: Zutat ${item}`).toBe(true);
        }
      }
      expect(knownItems.has(recipe.result.item), `${recipe.id}: Ergebnis ${recipe.result.item}`).toBe(true);
    }
  });

  it('gibt jedem Rezept eine eindeutige ID', () => {
    const ids = RECIPES.map((recipe) => recipe.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('hält geformte Muster gültig (gleiche Zeilenlänge, Symbole belegt)', () => {
    for (const recipe of RECIPES) {
      if (recipe.type !== 'shaped') continue;
      const width = recipe.pattern[0].length;
      expect(recipe.pattern.length, recipe.id).toBeGreaterThanOrEqual(1);
      expect(recipe.pattern.length, recipe.id).toBeLessThanOrEqual(3);
      for (const row of recipe.pattern) expect(row.length, recipe.id).toBe(width);
      for (const row of recipe.pattern) {
        for (const symbol of row) {
          if (symbol === ' ') continue;
          expect(recipe.key[symbol], `${recipe.id}: Symbol "${symbol}" fehlt im key`).toBeDefined();
        }
      }
    }
  });

  it('enthält Bretter, Stöcke, Werkbank, Fackeln und alle acht Werkzeuge', () => {
    const results = RECIPES.map((recipe) => recipe.result.item);
    for (const expected of [
      'planks',
      'stick',
      'crafting_table',
      'torch',
      'wooden_pickaxe',
      'wooden_axe',
      'wooden_shovel',
      'wooden_sword',
      'stone_pickaxe',
      'stone_axe',
      'stone_shovel',
      'stone_sword',
    ]) {
      expect(results, expected).toContain(expected);
    }
  });

  it('stellt Bretter formlos aus einem Stamm her', () => {
    const planks = RECIPES.find((recipe) => recipe.id === 'planks');
    expect(planks).toMatchObject({
      type: 'shapeless',
      ingredients: ['log'],
      result: { item: 'planks', count: 4 },
    });
  });
});
