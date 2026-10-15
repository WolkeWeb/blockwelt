/**
 * Item-Definitionen: Block-Items (aus den Blockdefinitionen) sowie Stöcke, Kohle und Werkzeuge.
 *
 * Symbole (`icon`) sind Texturnamen aus `src/assets/textures.ts`.
 */
import type { BlockDef, ItemDef, ToolDef, ToolType } from '../core';

/** Erzeugt zu jedem Block (außer Luft) ein Block-Item mit gleicher ID wie der Blockname. */
export function blockItems(blocks: readonly BlockDef[]): ItemDef[] {
  return blocks
    .filter((block) => block.shape !== 'none')
    .map((block) => ({
      id: block.name,
      displayName: block.displayName,
      maxStack: 64,
      icon: block.textures?.north ?? block.textures?.top ?? null,
      color: block.color,
      block: block.id,
      tool: null,
    }));
}

/** Materialstufen der Werkzeuge (siehe `ToolDef.level`). */
const MATERIAL = {
  wood: { level: 1, speed: 2, maxDurability: 59, color: 0xa07840 },
  stone: { level: 2, speed: 4, maxDurability: 131, color: 0x9a9a9a },
} as const;

type MaterialKey = keyof typeof MATERIAL;

/** Anzeigename und Grundschaden je Werkzeugart. */
const TOOL_INFO: Readonly<Record<ToolType, { label: string; attackDamage: number }>> = {
  pickaxe: { label: 'Spitzhacke', attackDamage: 2 },
  axe: { label: 'Axt', attackDamage: 3 },
  shovel: { label: 'Schaufel', attackDamage: 2 },
  sword: { label: 'Schwert', attackDamage: 4 },
};

const MATERIAL_LABEL: Readonly<Record<MaterialKey, string>> = { wood: 'Holz', stone: 'Stein' };

function tool(material: MaterialKey, type: ToolType): ItemDef {
  const grade = MATERIAL[material];
  const info = TOOL_INFO[type];
  const id = `${material === 'wood' ? 'wooden' : 'stone'}_${type}`;
  const definition: ToolDef = {
    type,
    level: grade.level,
    speed: grade.speed,
    maxDurability: grade.maxDurability,
    attackDamage: info.attackDamage + (material === 'stone' ? 1 : 0),
  };
  return {
    id,
    displayName: `${MATERIAL_LABEL[material]}${info.label.charAt(0).toLowerCase()}${info.label.slice(1)}`,
    maxStack: 1,
    icon: id,
    color: grade.color,
    block: null,
    tool: definition,
  };
}

/** Alle Nicht-Block-Items. */
export const ITEMS: readonly ItemDef[] = [
  { id: 'stick', displayName: 'Stock', maxStack: 64, icon: 'stick', color: 0x8a6535, block: null, tool: null },
  { id: 'coal', displayName: 'Kohle', maxStack: 64, icon: 'coal', color: 0x1b1b1b, block: null, tool: null },
  ...(Object.keys(MATERIAL) as MaterialKey[]).flatMap((material) =>
    (Object.keys(TOOL_INFO) as ToolType[]).map((type) => tool(material, type)),
  ),
];
