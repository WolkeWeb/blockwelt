/**
 * Prozedurale 16×16-Texturen für Blöcke und Items.
 *
 * Jede Textur entsteht aus festen Farben und einem deterministischen Zufallsgenerator
 * (Seed = Texturname) – keine Vorlagen, keine Minecraft-Inhalte. Die Namen sind zugleich
 * die Schlüssel im Textur-Atlas (`core/registry.ts`, `AtlasLayout.regions`).
 *
 * `src/data/` verwendet exakt diese Namen in `BlockDef.textures` und `ItemDef.icon`.
 *
 * @module assets/textures
 */
import { createRng, type Rng } from './rng';
import { TILE_SIZE, clearPixel, createTile, drawLine, drawRect, setPixel, shade, type Tile } from './tile';

/** Texturen, die Blöcke verwenden. */
export const BLOCK_TEXTURE_NAMES = [
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
] as const;

/** Texturen für Items ohne Block (Stöcke, Kohle, Werkzeuge). */
export const ITEM_TEXTURE_NAMES = [
  'stick',
  'coal',
  'wooden_pickaxe',
  'wooden_axe',
  'wooden_shovel',
  'wooden_sword',
  'stone_pickaxe',
  'stone_axe',
  'stone_shovel',
  'stone_sword',
] as const;

/** Alle Texturnamen in fester Reihenfolge (bestimmt das Atlas-Layout). */
export const TEXTURE_NAMES = [...BLOCK_TEXTURE_NAMES, ...ITEM_TEXTURE_NAMES] as const;

/** Name einer Textur im Atlas. */
export type TextureName = (typeof TEXTURE_NAMES)[number];

// ---------------------------------------------------------------------------
// Farbpalette (0xRRGGBB)
// ---------------------------------------------------------------------------

const COLOR = {
  dirt: 0x86603e,
  grass: 0x5b9b3a,
  grassLight: 0x74b34a,
  grassDark: 0x477f2b,
  stone: 0x7d7d7d,
  cobble: 0x9a9a9a,
  cobbleDark: 0x565656,
  bedrock: 0x555555,
  sand: 0xd9cf90,
  gravel: 0x82807d,
  bark: 0x6b5032,
  barkDark: 0x4a3520,
  woodTop: 0xa0763f,
  woodTopDark: 0x82602f,
  planks: 0xa8834d,
  planksDark: 0x7a5c33,
  leaves: 0x3f7f2a,
  leavesLight: 0x5aa03a,
  leavesDark: 0x2c5f1c,
  glass: 0xcfe6ef,
  water: 0x2f5fd0,
  coal: 0x1b1b1b,
  coalLight: 0x3a3a3a,
  iron: 0xd8af93,
  ironDark: 0xb08a6a,
  handle: 0x8a6535,
  handleDark: 0x6b4a26,
  woodTool: 0xa07840,
  stoneTool: 0x9a9a9a,
  flame: 0xffd24a,
  flameEdge: 0xff9a2e,
} as const;

// ---------------------------------------------------------------------------
// Erzeugung
// ---------------------------------------------------------------------------

/** Erzeugt alle Texturen in fester Reihenfolge. */
export function generateTextures(): Map<TextureName, Tile> {
  const tiles = new Map<TextureName, Tile>();
  for (const name of TEXTURE_NAMES) tiles.set(name, generateTexture(name));
  return tiles;
}

/** Erzeugt eine einzelne Textur deterministisch aus ihrem Namen. */
export function generateTexture(name: TextureName): Tile {
  const rng = createRng(`blockwelt:${name}`);
  return createBlockTexture(name, rng) ?? createItemTexture(name, rng);
}

function createBlockTexture(name: TextureName, rng: Rng): Tile | null {
  switch (name) {
    case 'grass_top':
      return grassTop(rng);
    case 'grass_side':
      return grassSide(rng);
    case 'dirt':
      return noisy(COLOR.dirt, 14, rng, 6);
    case 'stone':
      return noisy(COLOR.stone, 12, rng, 4);
    case 'cobblestone':
      return cobblestone(rng);
    case 'bedrock':
      return bedrock(rng);
    case 'sand':
      return noisy(COLOR.sand, 12, rng, 3);
    case 'gravel':
      return gravel(rng);
    case 'log_side':
      return logSide(rng);
    case 'log_top':
      return logTop(rng);
    case 'planks':
      return planks(rng);
    case 'leaves':
      return leaves(rng);
    case 'glass':
      return glass(rng);
    case 'water':
      return water(rng);
    case 'coal_ore':
      return ore(rng, COLOR.coal, COLOR.coalLight, 4);
    case 'iron_ore':
      return ore(rng, COLOR.iron, COLOR.ironDark, 4);
    case 'crafting_table_top':
      return craftingTableTop(rng);
    case 'crafting_table_side':
      return craftingTableSide(rng);
    case 'crafting_table_front':
      return craftingTableFront(rng);
    case 'torch':
      return torch();
    default:
      return null;
  }
}

function createItemTexture(name: TextureName, rng: Rng): Tile {
  if (name === 'stick') return stick();
  if (name === 'coal') return coalItem(rng);
  if (name.startsWith('wooden_') || name.startsWith('stone_')) {
    const material = name.startsWith('wooden_') ? COLOR.woodTool : COLOR.stoneTool;
    const kind = name.replace(/^(wooden|stone)_/, '');
    return tool(kind, material);
  }
  return createTile();
}

// ---------------------------------------------------------------------------
// Block-Texturen
// ---------------------------------------------------------------------------

/** Rauschen aus einer Grundfarbe (mit optionalen dunklen Sprenkeln). */
function noisy(base: number, spread: number, rng: Rng, speckles = 0, speckleColor = 0): Tile {
  const tile = createTile();
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      setPixel(tile, x, y, shade(base, Math.round((rng.next() - 0.5) * 2 * spread)));
    }
  }
  for (let i = 0; i < speckles; i++) {
    const color = speckleColor || shade(base, -spread * 2);
    drawRect(tile, rng.int(0, 15), rng.int(0, 15), rng.int(1, 2), 1, color);
  }
  return tile;
}

function grassTop(rng: Rng): Tile {
  const tile = noisy(COLOR.grass, 16, rng);
  for (let i = 0; i < 26; i++) {
    const color = rng.chance(0.5) ? COLOR.grassLight : COLOR.grassDark;
    setPixel(tile, rng.int(0, 15), rng.int(0, 15), shade(color, rng.int(-10, 10)));
  }
  return tile;
}

function grassSide(rng: Rng): Tile {
  const tile = noisy(COLOR.dirt, 12, rng);
  for (let x = 0; x < TILE_SIZE; x++) {
    const h = 3 + rng.int(0, 2);
    for (let y = 0; y < h; y++) {
      const color = y === h - 1 && rng.chance(0.4) ? COLOR.grassDark : COLOR.grass;
      setPixel(tile, x, y, shade(color, rng.int(-12, 12)));
    }
  }
  return tile;
}

function cobblestone(rng: Rng): Tile {
  const tile = noisy(COLOR.cobbleDark, 10, rng);
  const cells: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 13; i++) cells.push({ x: rng.int(0, 15), y: rng.int(0, 15) });
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      let best = Number.POSITIVE_INFINITY;
      for (const c of cells) {
        // Kacheln umlaufend, damit kein Randmuster entsteht
        const dx = Math.min(Math.abs(x - c.x), TILE_SIZE - Math.abs(x - c.x));
        const dy = Math.min(Math.abs(y - c.y), TILE_SIZE - Math.abs(y - c.y));
        best = Math.min(best, Math.hypot(dx, dy));
      }
      if (best < 2.3) setPixel(tile, x, y, shade(COLOR.cobble, rng.int(-22, 22)));
      else if (best < 3.1) setPixel(tile, x, y, shade(COLOR.cobbleDark, rng.int(-14, 14)));
    }
  }
  return tile;
}

function bedrock(rng: Rng): Tile {
  const tile = createTile();
  for (let by = 0; by < 4; by++) {
    for (let bx = 0; bx < 4; bx++) {
      const block = shade(COLOR.bedrock, rng.int(-28, 28));
      drawRect(tile, bx * 4, by * 4, 4, 4, block);
      for (let i = 0; i < 3; i++) {
        setPixel(tile, bx * 4 + rng.int(0, 3), by * 4 + rng.int(0, 3), shade(block, rng.int(-30, 30)));
      }
    }
  }
  return tile;
}

function gravel(rng: Rng): Tile {
  const tile = noisy(COLOR.gravel, 22, rng);
  const pebbles = [0xa8a8a8, 0x6f6f6f, 0x8a7a6a, 0xbdbdbd, 0x5d5d5d];
  for (let i = 0; i < 30; i++) {
    const color = shade(rng.pick(pebbles), rng.int(-12, 12));
    drawRect(tile, rng.int(0, 15), rng.int(0, 15), rng.int(1, 2), rng.int(1, 2), color);
  }
  return tile;
}

function logSide(rng: Rng): Tile {
  const tile = createTile();
  for (let x = 0; x < TILE_SIZE; x++) {
    const streak = Math.round(Math.sin(x * 1.9) * 9);
    for (let y = 0; y < TILE_SIZE; y++) {
      setPixel(tile, x, y, shade(COLOR.bark, streak + rng.int(-8, 8)));
    }
  }
  for (let i = 0; i < 5; i++) {
    const x = rng.int(1, 14);
    const y = rng.int(0, 15);
    const h = rng.int(3, 8);
    for (let dy = 0; dy < h; dy++) setPixel(tile, x, (y + dy) % TILE_SIZE, shade(COLOR.barkDark, rng.int(-8, 8)));
  }
  return tile;
}

function logTop(rng: Rng): Tile {
  const tile = createTile();
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d > 6.6) {
        setPixel(tile, x, y, shade(COLOR.bark, rng.int(-10, 10)));
        continue;
      }
      const band = Math.floor(d / 1.5) % 2 === 0 ? COLOR.woodTop : COLOR.woodTopDark;
      setPixel(tile, x, y, shade(band, rng.int(-8, 8)));
    }
  }
  return tile;
}

function planks(rng: Rng): Tile {
  const tile = createTile();
  const plankShades = [rng.int(-8, 8), rng.int(-8, 8), rng.int(-8, 8), rng.int(-8, 8)];
  const seams = [rng.int(2, 5), rng.int(7, 10), rng.int(11, 14), rng.int(1, 4)];
  for (let y = 0; y < TILE_SIZE; y++) {
    const plank = Math.floor(y / 4);
    for (let x = 0; x < TILE_SIZE; x++) {
      const base = shade(COLOR.planks, plankShades[plank] + rng.int(-6, 6));
      const border = y % 4 === 0 || x === seams[plank];
      setPixel(tile, x, y, border ? COLOR.planksDark : base);
    }
  }
  return tile;
}

function leaves(rng: Rng): Tile {
  const tile = createTile();
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const color = rng.chance(0.25) ? COLOR.leavesLight : rng.chance(0.3) ? COLOR.leavesDark : COLOR.leaves;
      setPixel(tile, x, y, shade(color, rng.int(-14, 14)));
    }
  }
  // Löcher: einzelne Pixel und kleine Gruppen dürchlässig
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      if (rng.chance(0.13)) clearPixel(tile, x, y);
    }
  }
  for (let i = 0; i < 4; i++) {
    const x = rng.int(1, 14);
    const y = rng.int(1, 14);
    clearPixel(tile, x, y);
    clearPixel(tile, x + 1, y);
    clearPixel(tile, x, y + 1);
  }
  return tile;
}

function glass(rng: Rng): Tile {
  const tile = createTile();
  for (let i = 0; i < TILE_SIZE; i++) {
    setPixel(tile, i, 0, COLOR.glass, 200);
    setPixel(tile, i, TILE_SIZE - 1, COLOR.glass, 200);
    setPixel(tile, 0, i, COLOR.glass, 200);
    setPixel(tile, TILE_SIZE - 1, i, COLOR.glass, 200);
  }
  for (let i = 0; i < TILE_SIZE; i++) {
    setPixel(tile, i, 1, shade(COLOR.glass, -30), 120);
    setPixel(tile, 1, i, shade(COLOR.glass, -30), 120);
  }
  drawLine(tile, 3, 12, 11, 4, 0xffffff, 2);
  setPixel(tile, rng.int(2, 4), rng.int(2, 5), 0xffffff, 90);
  return tile;
}

function water(rng: Rng): Tile {
  const tile = createTile();
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const wave = Math.round(Math.sin(y * 0.8 + x * 0.35) * 14);
      setPixel(tile, x, y, shade(COLOR.water, wave + rng.int(-6, 6)), 168);
    }
  }
  for (let i = 0; i < 6; i++) {
    drawRect(tile, rng.int(0, 13), rng.int(0, 15), rng.int(2, 3), 1, shade(COLOR.water, 40), 150);
  }
  return tile;
}

function ore(rng: Rng, main: number, accent: number, blobs: number): Tile {
  const tile = noisy(COLOR.stone, 12, rng);
  for (let i = 0; i < blobs; i++) {
    const cx = rng.int(2, 13);
    const cy = rng.int(2, 13);
    const r = rng.int(1, 2);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.hypot(dx, dy) > r + 0.3) continue;
        const color = Math.hypot(dx, dy) < r - 0.4 ? main : shade(main, -30);
        setPixel(tile, cx + dx, cy + dy, shade(color, rng.int(-12, 12)));
      }
    }
    setPixel(tile, cx, cy - 1, accent);
  }
  return tile;
}

function craftingTableTop(rng: Rng): Tile {
  const tile = planks(rng);
  // 3×3-Raster
  for (let i = 1; i < TILE_SIZE - 1; i++) {
    setPixel(tile, i, 1, COLOR.planksDark);
    setPixel(tile, i, TILE_SIZE - 2, COLOR.planksDark);
    setPixel(tile, 1, i, COLOR.planksDark);
    setPixel(tile, TILE_SIZE - 2, i, COLOR.planksDark);
  }
  for (const pos of [6, 10]) {
    for (let i = 2; i < TILE_SIZE - 2; i++) {
      setPixel(tile, pos, i, COLOR.barkDark);
      setPixel(tile, i, pos, COLOR.barkDark);
    }
  }
  return tile;
}

function craftingTableSide(rng: Rng): Tile {
  const tile = planks(rng);
  for (let i = 0; i < TILE_SIZE; i++) {
    setPixel(tile, i, 3, COLOR.planksDark);
    setPixel(tile, i, TILE_SIZE - 4, COLOR.planksDark);
  }
  for (const x of [3, 12]) for (let y = 0; y < TILE_SIZE; y++) setPixel(tile, x, y, shade(COLOR.planksDark, -8));
  return tile;
}

function craftingTableFront(rng: Rng): Tile {
  const tile = planks(rng);
  drawRect(tile, 3, 4, 10, 9, shade(COLOR.planks, -26));
  drawRect(tile, 4, 5, 8, 7, shade(COLOR.planks, -10));
  // Werkzeug-Silhouette
  drawLine(tile, 5, 11, 10, 6, COLOR.barkDark, 1);
  drawLine(tile, 6, 6, 10, 6, COLOR.barkDark, 1);
  drawLine(tile, 5, 11, 11, 11, COLOR.barkDark, 1);
  for (const x of [6, 9]) setPixel(tile, x, 9, COLOR.barkDark);
  return tile;
}

function torch(): Tile {
  const tile = createTile();
  for (let y = 7; y < TILE_SIZE; y++) {
    setPixel(tile, 7, y, COLOR.handle);
    setPixel(tile, 8, y, COLOR.handleDark);
  }
  for (let y = 4; y <= 6; y++) {
    setPixel(tile, 6, y, COLOR.flameEdge);
    setPixel(tile, 7, y, COLOR.flame);
    setPixel(tile, 8, y, COLOR.flame);
    setPixel(tile, 9, y, COLOR.flameEdge);
  }
  setPixel(tile, 7, 3, COLOR.flameEdge);
  setPixel(tile, 8, 3, COLOR.flameEdge);
  setPixel(tile, 5, 5, COLOR.flameEdge);
  setPixel(tile, 10, 5, COLOR.flameEdge);
  return tile;
}

// ---------------------------------------------------------------------------
// Item-Texturen
// ---------------------------------------------------------------------------

function stick(): Tile {
  const tile = createTile();
  drawLine(tile, 4, 13, 11, 4, COLOR.handle, 2);
  drawLine(tile, 4, 14, 11, 5, COLOR.handleDark, 1);
  return tile;
}

function coalItem(rng: Rng): Tile {
  const tile = createTile();
  const blobs: Array<[number, number, number]> = [
    [7, 8, 4],
    [6, 6, 3],
    [10, 10, 3],
    [9, 6, 2],
    [6, 10, 2],
  ];
  for (const [cx, cy, r] of blobs) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.hypot(dx, dy) > r) continue;
        setPixel(tile, cx + dx, cy + dy, shade(COLOR.coal, rng.int(-6, 14)));
      }
    }
  }
  setPixel(tile, 6, 6, COLOR.coalLight);
  setPixel(tile, 7, 7, COLOR.coalLight);
  return tile;
}

function tool(kind: string, head: number): Tile {
  const tile = createTile();
  drawLine(tile, 3, 14, 10, 7, COLOR.handle, 2);
  drawLine(tile, 4, 14, 11, 7, COLOR.handleDark, 1);
  const outline = shade(head, -40);
  switch (kind) {
    case 'pickaxe':
      drawLine(tile, 5, 4, 9, 2, head, 2);
      drawLine(tile, 9, 2, 14, 5, head, 2);
      drawLine(tile, 5, 4, 9, 2, outline, 1);
      drawLine(tile, 9, 2, 14, 5, outline, 1);
      setPixel(tile, 4, 5, head);
      setPixel(tile, 14, 6, head);
      break;
    case 'axe':
      drawRect(tile, 8, 2, 5, 6, head);
      drawRect(tile, 7, 3, 1, 4, head);
      clearPixel(tile, 12, 3);
      clearPixel(tile, 12, 7);
      drawLine(tile, 8, 2, 12, 2, outline, 1);
      drawLine(tile, 12, 3, 12, 6, outline, 1);
      break;
    case 'shovel':
      drawRect(tile, 9, 2, 4, 5, head);
      clearPixel(tile, 9, 2);
      clearPixel(tile, 12, 2);
      clearPixel(tile, 9, 6);
      clearPixel(tile, 12, 6);
      drawLine(tile, 9, 3, 12, 3, outline, 1);
      drawLine(tile, 9, 3, 9, 5, outline, 1);
      break;
    case 'sword':
      drawLine(tile, 3, 13, 13, 3, head, 2);
      drawLine(tile, 4, 14, 14, 4, outline, 1);
      drawLine(tile, 2, 8, 8, 14, COLOR.handleDark, 2);
      setPixel(tile, 1, 9, COLOR.handle);
      setPixel(tile, 9, 15, COLOR.handle);
      break;
    default:
      break;
  }
  return tile;
}
