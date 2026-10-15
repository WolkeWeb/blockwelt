import { describe, expect, it } from 'vitest';
import { BLOCK, BLOCK_NAMES } from '../core';
import { TEXTURE_NAMES } from '../assets';
import { createRegistry } from './index';

describe('Registry', () => {
  const registry = createRegistry();

  it('ist dicht nach ID sortiert und beginnt mit Luft', () => {
    registry.blocks.forEach((block, index) => expect(block.id).toBe(index));
    expect(registry.getBlockDef(BLOCK.AIR).name).toBe('air');
  });

  it('führt für jede bekannte ID den technischen Namen aus core/blocks.ts', () => {
    for (const id of Object.values(BLOCK)) {
      expect(registry.getBlockDef(id).name, `Block ${id}`).toBe(BLOCK_NAMES[id]);
    }
  });

  it('liefert für unbekannte IDs einen Platzhalter statt undefined', () => {
    expect(registry.getBlockDef(9999).color).toBe(0xff00ff);
  });

  it('hat zu jedem Block (außer Luft) ein Block-Item mit gleicher ID', () => {
    for (const block of registry.blocks) {
      if (block.shape === 'none') {
        expect(registry.getItemDef(block.name)).toBeUndefined();
        continue;
      }
      expect(registry.getItemDef(block.name)?.block, block.name).toBe(block.id);
    }
  });

  it('verwendet nur Texturnamen, die der Atlas kennt', () => {
    const known = new Set<string>(TEXTURE_NAMES);
    for (const name of registry.textureNames) expect(known.has(name), name).toBe(true);
  });

  describe('Blockeigenschaften (O2)', () => {
    it('Stein droppt Bruchstein, Gras droppt Erde, Blätter nichts', () => {
      expect(registry.getBlockDef(BLOCK.STONE).drop).toEqual({ item: 'cobblestone', count: 1 });
      expect(registry.getBlockDef(BLOCK.GRASS).drop).toEqual({ item: 'dirt', count: 1 });
      expect(registry.getBlockDef(BLOCK.LEAVES).drop).toBeNull();
    });

    it('Grundgestein ist unzerstörbar, Fackel leuchtet 14', () => {
      expect(registry.getBlockDef(BLOCK.BEDROCK).hardness).toBeLessThan(0);
      expect(registry.getBlockDef(BLOCK.BEDROCK).drop).toBeNull();
      expect(registry.getBlockDef(BLOCK.TORCH).lightLevel).toBe(14);
    });

    it('Wasser ist flüssig, durchsichtig und ersetzbar', () => {
      const water = registry.getBlockDef(BLOCK.WATER);
      expect(water.shape).toBe('liquid');
      expect(water.transparency).toBe('translucent');
      expect(water.solid).toBe(false);
      expect(water.replaceable).toBe(true);
    });

    it('Glas und Blätter sind cutout, Luft unsichtbar', () => {
      expect(registry.getBlockDef(BLOCK.GLASS).transparency).toBe('cutout');
      expect(registry.getBlockDef(BLOCK.LEAVES).transparency).toBe('cutout');
      expect(registry.getBlockDef(BLOCK.AIR).transparency).toBe('invisible');
      expect(registry.getBlockDef(BLOCK.AIR).shape).toBe('none');
    });

    it('nennt für abbauare Blöcke das bevorzugte Werkzeug', () => {
      expect(registry.getBlockDef(BLOCK.STONE).preferredTool).toBe('pickaxe');
      expect(registry.getBlockDef(BLOCK.DIRT).preferredTool).toBe('shovel');
      expect(registry.getBlockDef(BLOCK.LOG).preferredTool).toBe('axe');
      expect(registry.getBlockDef(BLOCK.STONE).requiredToolLevel).toBe(1);
      expect(registry.getBlockDef(BLOCK.IRON_ORE).requiredToolLevel).toBe(2);
    });

    it('gibt für Erze sinnvolle Drops an', () => {
      expect(registry.getBlockDef(BLOCK.COAL_ORE).drop).toEqual({ item: 'coal', count: 1 });
      expect(registry.getBlockDef(BLOCK.IRON_ORE).drop?.item).toBe('iron_ore');
    });
  });
});
