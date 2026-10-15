/**
 * Welt: Terrain, Chunks, Meshing, Licht. Erfüllt den Vertrag aus src/core/world.ts.
 * Zuständig: Codex
 */
import type { CreateWorld } from '../core';
import { createFlatWorld } from './flat-world';

/** Erzeugt eine Welt (Phase 0: flache Platzhalter-Welt). */
export const createWorld: CreateWorld = createFlatWorld;
