/**
 * Block-Definitionen.
 * PLATZHALTER aus Phase 0: nur Luft und fünf Blöcke, ohne Texturen (nur Farben).
 * Wird in Phase 1 (O2) durch die vollständige Liste ersetzt.
 */
import { BLOCK, type BlockDef } from '../core';

/** Gemeinsame Werte eines normalen, festen Würfels. */
const solidCube = {
  solid: true,
  transparency: 'opaque',
  shape: 'cube',
  lightLevel: 0,
  lightOpacity: 15,
  replaceable: false,
  textures: null,
  preferredTool: null,
  requiredToolLevel: 0,
} as const;

export const BLOCKS: readonly BlockDef[] = [
  {
    id: BLOCK.AIR,
    name: 'air',
    displayName: 'Luft',
    hardness: 0,
    solid: false,
    transparency: 'invisible',
    shape: 'none',
    lightLevel: 0,
    lightOpacity: 0,
    replaceable: true,
    color: 0x000000,
    textures: null,
    drop: null,
    preferredTool: null,
    requiredToolLevel: 0,
  },
  {
    ...solidCube,
    id: BLOCK.GRASS,
    name: 'grass',
    displayName: 'Grasblock',
    hardness: 0.6,
    color: 0x5b9b3a,
    drop: { item: 'dirt', count: 1 },
    preferredTool: 'shovel',
  },
  {
    ...solidCube,
    id: BLOCK.DIRT,
    name: 'dirt',
    displayName: 'Erde',
    hardness: 0.5,
    color: 0x86603e,
    drop: { item: 'dirt', count: 1 },
    preferredTool: 'shovel',
  },
  {
    ...solidCube,
    id: BLOCK.STONE,
    name: 'stone',
    displayName: 'Stein',
    hardness: 1.5,
    color: 0x7d7d7d,
    drop: { item: 'stone', count: 1 },
    preferredTool: 'pickaxe',
    requiredToolLevel: 1,
  },
  {
    ...solidCube,
    id: BLOCK.LOG,
    name: 'log',
    displayName: 'Holzstamm',
    hardness: 2,
    color: 0x6b5032,
    drop: { item: 'log', count: 1 },
    preferredTool: 'axe',
  },
  {
    ...solidCube,
    id: BLOCK.LEAVES,
    name: 'leaves',
    displayName: 'Blätter',
    hardness: 0.2,
    transparency: 'cutout',
    lightOpacity: 1,
    color: 0x3f7f2a,
    drop: null,
  },
];
