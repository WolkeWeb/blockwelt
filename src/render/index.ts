/**
 * Darstellung mit Three.js. Erfüllt den Vertrag aus src/core/render.ts.
 * Zuständig: Codex
 */
import type { CreateRenderer } from '../core';
import { createBasicRenderer } from './basic-renderer';

/** Erzeugt den Three.js-Renderer mit Atlas, Licht und Himmel. */
export const createRenderer: CreateRenderer = createBasicRenderer;
