/**
 * Inhalte: Blöcke, Items, Rezepte (Registry-Daten nach src/core/registry.ts).
 * Zuständig: OpenCode
 */
import type { CreateRegistry } from '../core';
import { BLOCKS } from './blocks';
import { ITEMS, blockItems } from './items';
import { RECIPES } from './recipes';
import { buildRegistry } from './registry';

/** Erzeugt die Registry mit allen Inhalten des Spiels. */
export const createRegistry: CreateRegistry = () =>
  buildRegistry(BLOCKS, [...blockItems(BLOCKS), ...ITEMS], RECIPES);
