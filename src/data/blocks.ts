/**
 * Block-Definitionen für alle Blöcke (IDs und Namen laut `src/core/blocks.ts`).
 *
 * Texturnamen entsprechen den Kacheln aus `src/assets/textures.ts` (`BlockDef.textures`
 * wird vom Renderer über das Atlas-Layout aufgelöst).
 */
import { BLOCK, type BlockDef, type BlockDrop, type BlockTextures } from '../core';

/** Textur für alle sechs Seiten. */
function all(name: string): BlockTextures {
  return { top: name, bottom: name, north: name, south: name, east: name, west: name };
}

/** Feste, undurchsichtige Würfel: gemeinsame Werte (Rest überschreibt der Block). */
const solid: Omit<BlockDef, 'id' | 'name' | 'displayName' | 'hardness' | 'color' | 'textures' | 'drop'> = {
  solid: true,
  transparency: 'opaque',
  shape: 'cube',
  lightLevel: 0,
  lightOpacity: 15,
  replaceable: false,
  preferredTool: null,
  requiredToolLevel: 0,
};

function block(
  id: number,
  name: string,
  displayName: string,
  hardness: number,
  color: number,
  textures: BlockTextures | null,
  drop: BlockDrop | null,
  extra: Partial<BlockDef> = {},
): BlockDef {
  return { ...solid, id, name, displayName, hardness, color, textures, drop, ...extra };
}

export const BLOCKS: readonly BlockDef[] = [
  {
    id: BLOCK.AIR,
    name: 'air',
    displayName: 'Luft',
    hardness: 0,
    solid: false,
    transparency: 'invisible',
    shape: 'none',
    lightLevel: 0,
    lightOpacity: 0,
    replaceable: true,
    color: 0x000000,
    textures: null,
    drop: null,
    preferredTool: null,
    requiredToolLevel: 0,
  },

  block(BLOCK.GRASS, 'grass', 'Grasblock', 0.6, 0x5b9b3a, {
    top: 'grass_top',
    bottom: 'dirt',
    north: 'grass_side',
    south: 'grass_side',
    east: 'grass_side',
    west: 'grass_side',
  }, { item: 'dirt', count: 1 }, { preferredTool: 'shovel' }),

  block(BLOCK.DIRT, 'dirt', 'Erde', 0.5, 0x86603e, all('dirt'), { item: 'dirt', count: 1 }, {
    preferredTool: 'shovel',
  }),

  block(BLOCK.STONE, 'stone', 'Stein', 1.5, 0x7d7d7d, all('stone'), { item: 'cobblestone', count: 1 }, {
    preferredTool: 'pickaxe',
    requiredToolLevel: 1,
  }),

  block(
    BLOCK.COBBLESTONE,
    'cobblestone',
    'Bruchstein',
    2,
    0x7f7f7f,
    all('cobblestone'),
    { item: 'cobblestone', count: 1 },
    { preferredTool: 'pickaxe', requiredToolLevel: 1 },
  ),

  block(BLOCK.BEDROCK, 'bedrock', 'Grundgestein', -1, 0x555555, all('bedrock'), null),

  block(BLOCK.SAND, 'sand', 'Sand', 0.5, 0xd9cf90, all('sand'), { item: 'sand', count: 1 }, {
    preferredTool: 'shovel',
  }),

  block(BLOCK.GRAVEL, 'gravel', 'Kies', 0.6, 0x82807d, all('gravel'), { item: 'gravel', count: 1 }, {
    preferredTool: 'shovel',
  }),

  block(BLOCK.LOG, 'log', 'Holzstamm', 2, 0x6b5032, {
    top: 'log_top',
    bottom: 'log_top',
    north: 'log_side',
    south: 'log_side',
    east: 'log_side',
    west: 'log_side',
  }, { item: 'log', count: 1 }, { preferredTool: 'axe' }),

  block(BLOCK.PLANKS, 'planks', 'Bretter', 2, 0xa8834d, all('planks'), { item: 'planks', count: 1 }, {
    preferredTool: 'axe',
  }),

  block(BLOCK.LEAVES, 'leaves', 'Blätter', 0.2, 0x3f7f2a, all('leaves'), null, {
    transparency: 'cutout',
    lightOpacity: 1,
  }),

  block(BLOCK.GLASS, 'glass', 'Glas', 0.3, 0xcfe6ef, all('glass'), null, {
    transparency: 'cutout',
    lightOpacity: 0,
  }),

  block(BLOCK.WATER, 'water', 'Wasser', 0, 0x2f5fd0, all('water'), null, {
    solid: false,
    transparency: 'translucent',
    shape: 'liquid',
    lightOpacity: 2,
    replaceable: true,
  }),

  block(BLOCK.COAL_ORE, 'coal_ore', 'Kohleerz', 3, 0x6b6b6b, all('coal_ore'), { item: 'coal', count: 1 }, {
    preferredTool: 'pickaxe',
    requiredToolLevel: 1,
  }),

  block(BLOCK.IRON_ORE, 'iron_ore', 'Eisenerz', 3, 0x8a8078, all('iron_ore'), {
    item: 'iron_ore',
    count: 1,
  }, { preferredTool: 'pickaxe', requiredToolLevel: 2 }),

  block(
    BLOCK.CRAFTING_TABLE,
    'crafting_table',
    'Werkbank',
    2.5,
    0xa8834d,
    {
      top: 'crafting_table_top',
      bottom: 'planks',
      north: 'crafting_table_front',
      south: 'crafting_table_side',
      east: 'crafting_table_side',
      west: 'crafting_table_side',
    },
    { item: 'crafting_table', count: 1 },
    { preferredTool: 'axe' },
  ),

  block(BLOCK.TORCH, 'torch', 'Fackel', 0, 0xffcc44, all('torch'), { item: 'torch', count: 1 }, {
    solid: false,
    transparency: 'cutout',
    shape: 'torch',
    lightLevel: 14,
    lightOpacity: 0,
  }),
];
