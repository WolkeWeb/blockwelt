/**
 * Crafting-Rezepte: Bretter, Stöcke, Werkbank, Fackeln und alle Werkzeuge.
 *
 * Muster werden im Raster frei verschoben und waagerecht gespiegelt (siehe `core/registry.ts`).
 * Muster bis 2×2 passen ins Inventar, größere nur an die Werkbank.
 */
import type { Recipe } from '../core';

/** Muster + Zutaten für ein Werkzeug; `head` ist Holz (Bretter) oder Bruchstein. */
function toolRecipe(id: string, pattern: readonly string[], key: Record<string, string>): Recipe {
  return { type: 'shaped', id, pattern, key, result: { item: id, count: 1 } };
}

/** Die vier Werkzeugmuster, jeweils für Holz und Stein. */
function toolRecipes(): Recipe[] {
  const recipes: Recipe[] = [];
  const materials: ReadonlyArray<{ prefix: string; head: string }> = [
    { prefix: 'wooden', head: 'planks' },
    { prefix: 'stone', head: 'cobblestone' },
  ];
  for (const { prefix, head } of materials) {
    const key = { H: head, S: 'stick' };
    recipes.push(
      toolRecipe(`${prefix}_pickaxe`, ['HHH', ' S ', ' S '], key),
      toolRecipe(`${prefix}_axe`, ['HH', 'HS', ' S'], key),
      toolRecipe(`${prefix}_shovel`, ['H', 'S', 'S'], key),
      toolRecipe(`${prefix}_sword`, ['H', 'H', 'S'], key),
    );
  }
  return recipes;
}

export const RECIPES: readonly Recipe[] = [
  // Ein Stamm ergibt vier Bretter.
  { type: 'shapeless', id: 'planks', ingredients: ['log'], result: { item: 'planks', count: 4 } },
  // Zwei Bretter übereinander ergeben vier Stöcke.
  { type: 'shaped', id: 'stick', pattern: ['P', 'P'], key: { P: 'planks' }, result: { item: 'stick', count: 4 } },
  // Werkbank aus vier Brettern.
  {
    type: 'shaped',
    id: 'crafting_table',
    pattern: ['PP', 'PP'],
    key: { P: 'planks' },
    result: { item: 'crafting_table', count: 1 },
  },
  // Fackel: Kohle über einem Stock ergibt vier Fackeln.
  { type: 'shaped', id: 'torch', pattern: ['C', 'S'], key: { C: 'coal', S: 'stick' }, result: { item: 'torch', count: 4 } },

  ...toolRecipes(),
];
