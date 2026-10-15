/**
 * Item-Definitionen.
 * PLATZHALTER aus Phase 0: nur die Block-Items der Platzhalter-Blöcke. Wird in Phase 1 (O3) erweitert.
 */
import type { BlockDef, ItemDef } from '../core';

/** Erzeugt zu jedem Block (außer Luft) ein Block-Item mit gleicher ID wie der Blockname. */
export function blockItems(blocks: readonly BlockDef[]): ItemDef[] {
  return blocks
    .filter((block) => block.shape !== 'none')
    .map((block) => ({
      id: block.name,
      displayName: block.displayName,
      maxStack: 64,
      icon: block.textures?.north ?? null,
      color: block.color,
      block: block.id,
      tool: null,
    }));
}
