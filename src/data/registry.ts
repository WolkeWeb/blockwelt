/**
 * Baut aus Block-, Item- und Rezeptlisten eine Registry nach dem Vertrag in `core/registry.ts`.
 */
import type { BlockDef, BlockId, ItemDef, ItemId, Recipe, Registry, SmeltingRecipe } from '../core';

/** Platzhalter für unbekannte Block-IDs (und Lücken in der ID-Folge). */
function unknownBlock(id: BlockId): BlockDef {
  return {
    id,
    name: id === -1 ? 'unknown' : `unknown_${id}`,
    displayName: 'Unbekannter Block',
    hardness: 1,
    solid: true,
    transparency: 'opaque',
    shape: 'cube',
    lightLevel: 0,
    lightOpacity: 15,
    replaceable: false,
    color: 0xff00ff,
    textures: null,
    drop: null,
    preferredTool: null,
    requiredToolLevel: 0,
  };
}

/**
 * Erzeugt eine Registry. Blöcke dürfen in beliebiger Reihenfolge übergeben werden; das Ergebnis ist dicht nach ID sortiert.
 * Doppelte IDs oder Namen sind ein Programmierfehler und werfen sofort.
 */
export function buildRegistry(
  blockList: readonly BlockDef[],
  itemList: readonly ItemDef[],
  recipes: readonly Recipe[],
  smelting: readonly SmeltingRecipe[] = [],
): Registry {
  const maxId = blockList.reduce((max, block) => Math.max(max, block.id), 0);
  const blocks: BlockDef[] = [];
  for (let id = 0; id <= maxId; id++) blocks.push(unknownBlock(id));
  const seen = new Set<BlockId>();
  const byName = new Map<string, BlockDef>();
  for (const block of blockList) {
    if (seen.has(block.id)) throw new Error(`Block-ID ${block.id} ist doppelt vergeben`);
    if (byName.has(block.name)) throw new Error(`Blockname "${block.name}" ist doppelt vergeben`);
    seen.add(block.id);
    byName.set(block.name, block);
    blocks[block.id] = block;
  }

  const items = new Map<ItemId, ItemDef>();
  for (const item of itemList) {
    if (items.has(item.id)) throw new Error(`Item-ID "${item.id}" ist doppelt vergeben`);
    items.set(item.id, item);
  }

  const textureNames = new Set<string>();
  for (const block of blocks) {
    if (block.textures) for (const name of Object.values(block.textures)) textureNames.add(name);
  }
  for (const item of itemList) if (item.icon) textureNames.add(item.icon);

  const fallback = unknownBlock(-1);

  return {
    blocks,
    items: [...items.values()],
    recipes,
    smelting,
    textureNames: [...textureNames],
    getBlockDef: (id) => blocks[id] ?? fallback,
    getBlockDefByName: (name) => byName.get(name),
    getItemDef: (id) => items.get(id),
  };
}
