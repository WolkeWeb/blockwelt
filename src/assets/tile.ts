/**
 * Kleine Zeichenhilfen für 16×16-Pixel-Kacheln (RGBA, zeilenweise, 4 Bytes pro Pixel).
 *
 * Bewusst ohne Canvas: Die Kacheln sind reine Pixel-Daten und damit überall (auch ohne DOM)
 * erzeug- und prüfbar. Erst der Atlas (`atlas.ts`) malt sie auf ein Canvas.
 *
 * @module assets/tile
 */

/** Kantenlänge einer Textur in Pixeln. */
export const TILE_SIZE = 16;

/** Eine 16×16-Kachel als RGBA-Bytes. */
export interface Tile {
  readonly data: Uint8ClampedArray;
}

/** Erzeugt eine vollständig durchsichtige Kachel. */
export function createTile(): Tile {
  return { data: new Uint8ClampedArray(TILE_SIZE * TILE_SIZE * 4) };
}

/** Setzt ein Pixel (außerhalb liegende Koordinaten werden ignoriert). */
export function setPixel(tile: Tile, x: number, y: number, color: number, alpha = 255): void {
  if (x < 0 || y < 0 || x >= TILE_SIZE || y >= TILE_SIZE) return;
  const i = (y * TILE_SIZE + x) * 4;
  tile.data[i] = (color >> 16) & 0xff;
  tile.data[i + 1] = (color >> 8) & 0xff;
  tile.data[i + 2] = color & 0xff;
  tile.data[i + 3] = alpha;
}

/** Liest ein Pixel als [r, g, b, a] (0 für außerhalb). */
export function getPixel(tile: Tile, x: number, y: number): [number, number, number, number] {
  if (x < 0 || y < 0 || x >= TILE_SIZE || y >= TILE_SIZE) return [0, 0, 0, 0];
  const i = (y * TILE_SIZE + x) * 4;
  return [tile.data[i], tile.data[i + 1], tile.data[i + 2], tile.data[i + 3]];
}

/** Macht ein Pixel durchsichtig. */
export function clearPixel(tile: Tile, x: number, y: number): void {
  setPixel(tile, x, y, 0, 0);
}

/** Hellt eine Farbe auf (`delta > 0`) oder dunkelt sie ab (`delta < 0`). */
export function shade(color: number, delta: number): number {
  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
  const r = clamp(((color >> 16) & 0xff) + delta);
  const g = clamp(((color >> 8) & 0xff) + delta);
  const b = clamp((color & 0xff) + delta);
  return (r << 16) | (g << 8) | b;
}

/** Füllt ein Rechteck (mit Clipping). */
export function drawRect(tile: Tile, x: number, y: number, w: number, h: number, color: number, alpha = 255): void {
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) setPixel(tile, x + dx, y + dy, color, alpha);
}

/** Zeichnet eine Linie (`thickness` Pixel breit, quadratische Stempel). */
export function drawLine(
  tile: Tile,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: number,
  thickness = 1,
): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  const half = Math.floor(thickness / 2);
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    for (let oy = -half; oy <= half; oy++) for (let ox = -half; ox <= half; ox++) setPixel(tile, x + ox, y + oy, color);
  }
}
