import { describe, expect, it } from 'vitest';
import { ATLAS_COLUMNS, TILE_SIZE, computeAtlasLayout, createTextureAtlas } from '../assets';
import { BLOCK_TEXTURE_NAMES, ITEM_TEXTURE_NAMES, TEXTURE_NAMES, generateTexture, generateTextures } from './textures';

describe('prozedurale Texturen', () => {
  it('erzeugt für jeden Namen eine Kachel in voller Größe', () => {
    const tiles = generateTextures();
    expect([...tiles.keys()]).toEqual([...TEXTURE_NAMES]);
    for (const name of TEXTURE_NAMES) {
      expect(tiles.get(name)?.data.length, name).toBe(TILE_SIZE * TILE_SIZE * 4);
    }
  });

  it('ist deterministisch: gleicher Name → gleiche Pixel', () => {
    const a = generateTexture('stone').data;
    const b = generateTexture('stone').data;
    expect([...a]).toEqual([...b]);
    expect([...generateTexture('planks').data]).toEqual([...generateTexture('planks').data]);
  });

  it('macht Blätter, Glas und Fackel teilweise durchsichtig, Erde nicht', () => {
    const hasTransparent = (name: (typeof TEXTURE_NAMES)[number]) => {
      const data = generateTexture(name).data;
      for (let i = 3; i < data.length; i += 4) if (data[i] === 0) return true;
      return false;
    };
    expect(hasTransparent('leaves')).toBe(true);
    expect(hasTransparent('glass')).toBe(true);
    expect(hasTransparent('torch')).toBe(true);
    expect(hasTransparent('dirt')).toBe(false);
  });

  it('färbt Wasser halbdurchsichtig (nicht voll deckend)', () => {
    const data = generateTexture('water').data;
    expect(data[3]).toBeGreaterThan(0);
    expect(data[3]).toBeLessThan(255);
  });

  it('enthält die im Auftrag geforderten Block- und Item-Texturen', () => {
    const required = [
      'grass_top',
      'grass_side',
      'dirt',
      'stone',
      'cobblestone',
      'bedrock',
      'sand',
      'gravel',
      'log_side',
      'log_top',
      'planks',
      'leaves',
      'glass',
      'water',
      'coal_ore',
      'iron_ore',
      'crafting_table_top',
      'crafting_table_side',
      'crafting_table_front',
      'torch',
    ];
    for (const name of required) expect(BLOCK_TEXTURE_NAMES).toContain(name);
    for (const name of ['stick', 'coal', 'wooden_pickaxe', 'stone_sword']) {
      expect(ITEM_TEXTURE_NAMES).toContain(name);
    }
  });
});

describe('Atlas-Layout', () => {
  it('verteilt alle Texturen in einem dichten Raster', () => {
    const layout = computeAtlasLayout([...TEXTURE_NAMES]);
    expect(layout.tileSize).toBe(TILE_SIZE);
    expect(layout.width % TILE_SIZE).toBe(0);
    expect(layout.height % TILE_SIZE).toBe(0);
    expect(Object.keys(layout.regions)).toHaveLength(TEXTURE_NAMES.length);

    for (const name of TEXTURE_NAMES) {
      const region = layout.regions[name];
      expect(region.u0, name).toBeGreaterThanOrEqual(0);
      expect(region.v0, name).toBeGreaterThanOrEqual(0);
      expect(region.u1, name).toBeLessThanOrEqual(1);
      expect(region.v1, name).toBeLessThanOrEqual(1);
      expect(region.u1).toBeGreaterThan(region.u0);
      expect(region.v1).toBeGreaterThan(region.v0);
    }
  });

  it('belegt jede Kachel im Raster genau einmal', () => {
    const layout = computeAtlasLayout([...TEXTURE_NAMES]);
    const cols = layout.width / TILE_SIZE;
    const rows = layout.height / TILE_SIZE;
    const cells = new Set<string>();
    for (const name of TEXTURE_NAMES) {
      const region = layout.regions[name];
      const x = Math.round(region.u0 * layout.width) / TILE_SIZE;
      const y = Math.round(region.v0 * layout.height) / TILE_SIZE;
      expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true);
      cells.add(`${x},${y}`);
    }
    expect(cells.size).toBe(TEXTURE_NAMES.length);
    expect(cols * rows).toBeGreaterThanOrEqual(TEXTURE_NAMES.length);
    expect(Math.min(cols, ATLAS_COLUMNS)).toBeLessThanOrEqual(ATLAS_COLUMNS);
  });

  it('liefert ohne Canvas-Umgebung (node) keinen Atlas', () => {
    expect(createTextureAtlas()).toBeNull();
  });
});
