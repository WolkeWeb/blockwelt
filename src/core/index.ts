/**
 * Verträge zwischen allen Bereichen. Nur Claude ändert diesen Ordner (Phase 0 und Phase 2).
 *
 * Übersicht:
 * - `types.ts`    Grundtypen (Vec3, BlockId, ItemId, ItemStack, Face, GameMode) und feste Eckdaten
 * - `blocks.ts`   feste IDs der bekannten Blöcke
 * - `registry.ts` Blöcke, Items, Rezepte, Registry, Textur-Atlas → `src/data/`, `src/assets/`
 * - `world.ts`    World-Interface, Chunk-Meshes → `src/world/`
 * - `physics.ts`  PlayerBody, stepPlayer, raycast → `src/physics/`
 * - `render.ts`   Renderer-Interface, Kamera, Tageszeit → `src/render/`
 * - `game.ts`     GameApi (Zustand, Aktionen, Events) für die Oberfläche → `src/game/`, `src/ui/`
 * - `events.ts`   typisierter Event-Bus
 */
export * from './types';
export * from './blocks';
export * from './registry';
export * from './world';
export * from './physics';
export * from './render';
export * from './game';
export * from './events';
