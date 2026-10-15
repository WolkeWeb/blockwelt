/**
 * Packt die prozeduralen Kacheln in einen Textur-Atlas (Layout laut `core/registry.ts`)
 * und malt sie auf ein Canvas.
 *
 * Das Layout ist reine Daten und wird auch ohne Canvas berechnet (Tests, Worker-Meshing).
 *
 * @module assets/atlas
 */
import type { AtlasLayout, TextureAtlas, UVRect } from '../core';
import { TILE_SIZE, type Tile } from './tile';
import { TEXTURE_NAMES, type TextureName } from './textures';

/** Kacheln pro Zeile im Atlas. */
export const ATLAS_COLUMNS = 8;

/**
 * Berechnet das Atlas-Layout für die übergebenen Texturnamen.
 * `v` wächst nach unten (Bildkoordinaten), wie im Vertrag festgelegt.
 */
export function computeAtlasLayout(names: readonly string[], columns = ATLAS_COLUMNS): AtlasLayout {
  const count = Math.max(names.length, 1);
  const cols = Math.max(1, Math.min(columns, count));
  const rows = Math.ceil(count / cols);
  const width = cols * TILE_SIZE;
  const height = rows * TILE_SIZE;

  const regions: Record<string, UVRect> = {};
  names.forEach((name, index) => {
    const x = index % cols;
    const y = Math.floor(index / cols);
    regions[name] = {
      u0: (x * TILE_SIZE) / width,
      v0: (y * TILE_SIZE) / height,
      u1: ((x + 1) * TILE_SIZE) / width,
      v1: ((y + 1) * TILE_SIZE) / height,
    };
  });

  return { tileSize: TILE_SIZE, width, height, regions };
}

/** Erzeugt ein Zeichen-Canvas (bevorzugt HTML für `toDataURL`, sonst OffscreenCanvas). */
export function createAtlasCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas | null {
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  return null;
}

function get2d(
  canvas: HTMLCanvasElement | OffscreenCanvas,
): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
  if (typeof HTMLCanvasElement !== 'undefined' && canvas instanceof HTMLCanvasElement) {
    return canvas.getContext('2d');
  }
  return (canvas as OffscreenCanvas).getContext('2d');
}

/** Zeichnet alle Kacheln in fester Reihenfolge auf ein Canvas und liefert den fertigen Atlas. */
export function buildAtlas(tiles: ReadonlyMap<TextureName, Tile>): TextureAtlas | null {
  const names = TEXTURE_NAMES.filter((name) => tiles.has(name));
  const layout = computeAtlasLayout(names);
  const canvas = createAtlasCanvas(layout.width, layout.height);
  if (!canvas) return null;
  const ctx = get2d(canvas);
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  const cols = layout.width / TILE_SIZE;
  names.forEach((name, index) => {
    const tile = tiles.get(name);
    if (!tile) return;
    const x = (index % cols) * TILE_SIZE;
    const y = Math.floor(index / cols) * TILE_SIZE;
    const image = ctx.createImageData(TILE_SIZE, TILE_SIZE);
    image.data.set(tile.data);
    ctx.putImageData(image, x, y);
  });

  return { layout, image: canvas };
}
