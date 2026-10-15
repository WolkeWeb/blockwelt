/**
 * Feste IDs der bekannten Blöcke.
 *
 * Damit Welt-Generator (Codex) und Block-Definitionen (OpenCode) gleichzeitig entstehen können,
 * stehen die numerischen IDs hier fest. `src/data/` muss für jeden Eintrag eine `BlockDef` mit genau
 * dieser `id` und genau diesem `name` liefern. Weitere Blöcke dürfen später freie IDs ab 100 belegen.
 *
 * Der technische Name (`name`) ist gleichzeitig die {@link ItemId} des zugehörigen Block-Items.
 *
 * @module core/blocks
 */

import type { BlockId } from './types';

/** Numerische IDs der Blöcke. `BLOCK.AIR` (0) ist immer Luft. */
export const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  COBBLESTONE: 4,
  BEDROCK: 5,
  SAND: 6,
  GRAVEL: 7,
  LOG: 8,
  PLANKS: 9,
  LEAVES: 10,
  GLASS: 11,
  WATER: 12,
  COAL_ORE: 13,
  IRON_ORE: 14,
  CRAFTING_TABLE: 15,
  TORCH: 16,
} as const satisfies Record<string, BlockId>;

/** Schlüssel von {@link BLOCK}, z. B. `"GRASS"`. */
export type KnownBlock = keyof typeof BLOCK;

/**
 * Technischer Name (`BlockDef.name`, zugleich ItemId) jedes bekannten Blocks.
 * Beispiel: `BLOCK_NAMES[BLOCK.LOG] === "log"`.
 */
export const BLOCK_NAMES: Readonly<Record<number, string>> = {
  [BLOCK.AIR]: 'air',
  [BLOCK.GRASS]: 'grass',
  [BLOCK.DIRT]: 'dirt',
  [BLOCK.STONE]: 'stone',
  [BLOCK.COBBLESTONE]: 'cobblestone',
  [BLOCK.BEDROCK]: 'bedrock',
  [BLOCK.SAND]: 'sand',
  [BLOCK.GRAVEL]: 'gravel',
  [BLOCK.LOG]: 'log',
  [BLOCK.PLANKS]: 'planks',
  [BLOCK.LEAVES]: 'leaves',
  [BLOCK.GLASS]: 'glass',
  [BLOCK.WATER]: 'water',
  [BLOCK.COAL_ORE]: 'coal_ore',
  [BLOCK.IRON_ORE]: 'iron_ore',
  [BLOCK.CRAFTING_TABLE]: 'crafting_table',
  [BLOCK.TORCH]: 'torch',
};
