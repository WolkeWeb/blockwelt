/**
 * Blöcke setzen: Regeln, ob an einer Stelle gebaut werden darf.
 */
import {
  CHUNK_HEIGHT,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  type BlockDef,
  type BlockId,
  type BlockSource,
  type Registry,
  type Vec3,
} from '../core';

/** Ob der Block `(x, y, z)` die Hitbox eines Spielers mit Füßen bei `feet` berührt (nur echtes Überlappen, Berühren zählt nicht). */
export function blockOverlapsPlayer(block: Vec3, feet: Vec3): boolean {
  const half = PLAYER_WIDTH / 2;
  return (
    block.x < feet.x + half &&
    block.x + 1 > feet.x - half &&
    block.y < feet.y + PLAYER_HEIGHT &&
    block.y + 1 > feet.y &&
    block.z < feet.z + half &&
    block.z + 1 > feet.z - half
  );
}

/**
 * Ob `blockId` an `place` gesetzt werden darf:
 * - innerhalb der Welthöhe, im geladenen Bereich,
 * - die Zielzelle ist ersetzbar (Luft, Wasser),
 * - ein fester Block darf nicht in der eigenen Hitbox landen.
 */
export function canPlaceBlock(
  world: Pick<BlockSource, 'getBlock' | 'isLoaded'>,
  registry: Pick<Registry, 'getBlockDef'>,
  place: Vec3,
  blockId: BlockId,
  feet: Vec3,
): boolean {
  if (place.y < 0 || place.y >= CHUNK_HEIGHT) return false;
  if (!world.isLoaded(place.x, place.z)) return false;
  const current: BlockDef = registry.getBlockDef(world.getBlock(place.x, place.y, place.z));
  if (!current.replaceable) return false;
  const wanted = registry.getBlockDef(blockId);
  if (wanted.solid && blockOverlapsPlayer(place, feet)) return false;
  return true;
}
