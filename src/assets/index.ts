/**
 * Prozedurale Texturen und Textur-Atlas.
 * Zuständig: OpenCode
 *
 * `createTextureAtlas` erzeugt alle 16×16-Texturen deterministisch und packt sie in einen Atlas
 * (Format laut `src/core/registry.ts`). Ohne Canvas-Umgebung (z. B. in Tests) gibt es `null` –
 * dann zeichnen Welt und Oberfläche nur die Farben aus den Definitionen.
 */
import type { CreateTextureAtlas } from '../core';
import { buildAtlas } from './atlas';
import { generateTextures } from './textures';

export { BLOCK_TEXTURE_NAMES, ITEM_TEXTURE_NAMES, TEXTURE_NAMES, generateTexture, generateTextures } from './textures';
export { ATLAS_COLUMNS, buildAtlas, computeAtlasLayout, createAtlasCanvas } from './atlas';
export { createRng, hashString, type Rng } from './rng';
export { TILE_SIZE, createTile, getPixel, setPixel, shade, type Tile } from './tile';

export const createTextureAtlas: CreateTextureAtlas = () => buildAtlas(generateTextures());
