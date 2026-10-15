/**
 * Darstellung mit Three.js. Erfüllt den Vertrag aus src/core/render.ts.
 * Zuständig: Codex
 */
import type { CreateRenderer } from '../core';
import { createBasicRenderer } from './basic-renderer';

/** Erzeugt den Renderer (Phase 0: Grundszene mit Vertex-Farben). */
export const createRenderer: CreateRenderer = createBasicRenderer;
