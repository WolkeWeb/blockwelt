/**
 * Crafting-Logik: findet das passende Rezept zu einem Raster und verbraucht die Zutaten.
 *
 * - Geformte Rezepte passen an jeder Stelle im Raster und dürfen waagerecht gespiegelt sein.
 * - Formlose Rezepte passen bei gleichen Zutaten in beliebiger Anordnung.
 * - Ein Rezept passt nur, wenn im Raster **nichts außer den Zutaten** liegt.
 * - Die Rezepte kommen aus der Registry; Muster, die nicht ins Raster passen (z. B. 3×3 im 2×2-Raster), finden nie.
 */
import type { ItemId, ItemStack, Recipe, RecipeResult, ShapedRecipe, ShapelessRecipe } from '../core';

/** Kantenlänge des Crafting-Rasters: 2 im Inventar, 3 an der Werkbank. */
export type GridSize = 2 | 3;

type Cell = ItemId | null;

/** Teil des Rasters, der nicht leer ist: Zeilen von Zellen (oder `null`, wenn das Raster leer ist). */
function trimmedGrid(grid: readonly (ItemStack | null)[], size: number): Cell[][] | null {
  let minRow = size;
  let maxRow = -1;
  let minCol = size;
  let maxCol = -1;
  for (let i = 0; i < size * size; i++) {
    if (!grid[i]) continue;
    const row = Math.floor(i / size);
    const col = i % size;
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row);
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col);
  }
  if (maxRow < 0) return null;
  const rows: Cell[][] = [];
  for (let r = minRow; r <= maxRow; r++) {
    const row: Cell[] = [];
    for (let c = minCol; c <= maxCol; c++) row.push(grid[r * size + c]?.item ?? null);
    rows.push(row);
  }
  return rows;
}

function patternCells(recipe: ShapedRecipe): Cell[][] {
  return recipe.pattern.map((line) =>
    [...line].map((ch) => (ch === ' ' ? null : (recipe.key[ch] ?? null))),
  );
}

function sameCells(a: readonly (readonly Cell[])[], b: readonly (readonly Cell[])[]): boolean {
  return a.length === b.length && a.every((row, r) => row.length === b[r]!.length && row.every((cell, c) => cell === b[r]![c]));
}

function matchesShaped(recipe: ShapedRecipe, cells: Cell[][]): boolean {
  const pattern = patternCells(recipe);
  if (sameCells(pattern, cells)) return true;
  return sameCells(pattern.map((row) => row.slice().reverse()), cells);
}

function matchesShapeless(recipe: ShapelessRecipe, cells: Cell[][]): boolean {
  const have = cells.flat().filter((c): c is ItemId => c !== null).sort();
  const want = recipe.ingredients.slice().sort();
  return have.length === want.length && have.every((item, i) => item === want[i]);
}

/**
 * Sucht das Rezept zum Raster.
 * @param recipes Alle Rezepte (aus der Registry).
 * @param grid `size × size` Slots, zeilenweise.
 * @param size Kantenlänge des Rasters.
 */
export function findRecipe(recipes: readonly Recipe[], grid: readonly (ItemStack | null)[], size: GridSize): Recipe | null {
  const cells = trimmedGrid(grid, size);
  if (!cells) return null;
  for (const recipe of recipes) {
    if (recipe.type === 'shaped' ? matchesShaped(recipe, cells) : matchesShapeless(recipe, cells)) return recipe;
  }
  return null;
}

/** Ergebnis-Stapel eines Rezepts. */
export function resultStack(result: RecipeResult): ItemStack {
  return { item: result.item, count: result.count };
}

/** Was im Ergebnis-Slot liegt, oder `null`, wenn kein Rezept passt. */
export function craftResult(recipes: readonly Recipe[], grid: readonly (ItemStack | null)[], size: GridSize): ItemStack | null {
  const recipe = findRecipe(recipes, grid, size);
  return recipe ? resultStack(recipe.result) : null;
}

/** Raster nach einmaligem Craften: von jedem belegten Slot wird ein Stück verbraucht. */
export function consumeIngredients(grid: readonly (ItemStack | null)[]): (ItemStack | null)[] {
  return grid.map((slot) => (slot && slot.count > 1 ? { ...slot, count: slot.count - 1 } : null));
}
