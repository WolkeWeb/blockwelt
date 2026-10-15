import { describe, expect, it } from 'vitest';
import { BLOCK } from '../core';
import { TEXTURE_NAMES } from '../assets';
import { createRegistry } from './index';
import { ITEMS } from './items';

describe('Items (O3)', () => {
  const byId = new Map(ITEMS.map((item) => [item.id, item]));

  it('enthält Stock, Kohle und alle acht Werkzeuge', () => {
    expect(byId.get('stick')?.tool).toBeNull();
    expect(byId.get('coal')?.tool).toBeNull();
    for (const material of ['wooden', 'stone']) {
      for (const type of ['pickaxe', 'axe', 'shovel', 'sword']) {
        expect(byId.get(`${material}_${type}`)?.tool?.type, `${material}_${type}`).toBe(type);
      }
    }
  });

  it('gibt Werkzeugen Haltbarkeit, Stufe und Abbau-Geschwindigkeit', () => {
    const wooden = byId.get('wooden_pickaxe')?.tool;
    const stone = byId.get('stone_pickaxe')?.tool;
    expect(wooden).toMatchObject({ level: 1, speed: 2, maxDurability: 59 });
    expect(stone).toMatchObject({ level: 2, speed: 4, maxDurability: 131 });
  });

  it('gibt Schwertern den höheren Schaden (Holz 4, Stein 5)', () => {
    expect(byId.get('wooden_sword')?.tool?.attackDamage).toBe(4);
    expect(byId.get('stone_sword')?.tool?.attackDamage).toBe(5);
  });

  it('stapelt Werkzeuge nicht, Stöcke und Kohle schon', () => {
    expect(byId.get('wooden_axe')?.maxStack).toBe(1);
    expect(byId.get('stick')?.maxStack).toBe(64);
    expect(byId.get('coal')?.maxStack).toBe(64);
  });

  it('gibt jedem Item ein Symbol, das der Atlas kennt', () => {
    const known = new Set<string>(TEXTURE_NAMES);
    for (const item of ITEMS) {
      expect(item.icon, item.id).not.toBeNull();
      expect(known.has(item.icon ?? ''), item.id).toBe(true);
    }
  });

  it('nennt Werkzeuge auf Deutsch und platzierbare Blöcke mit Block-ID', () => {
    expect(byId.get('stone_sword')?.displayName).toBe('Steinschwert');
    expect(byId.get('stick')?.block).toBeNull();
    expect(byId.get('wooden_shovel')?.displayName).toBe('Holzschaufel');
    const registry = createRegistry();
    expect(registry.getItemDef('cobblestone')?.block).toBe(BLOCK.COBBLESTONE);
  });
});
