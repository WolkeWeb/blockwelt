/**
 * Spawn-Punkt: ein sicherer Platz an der Oberfläche, über dem Wasser.
 */
import { CHUNK_HEIGHT, SEA_LEVEL, type Registry, type Vec3, type World } from '../core';

/** Was die Suche von der Welt braucht. */
export type SpawnWorld = Pick<World, 'getBlock' | 'getSurfaceHeight' | 'isLoaded'>;

/**
 * Ob die Spalte (x, z) ein guter Spawn-Platz ist:
 * Oberfläche über dem Meeresspiegel, fester undurchsichtiger Boden (kein Wasser, keine Blätter) und zwei Blöcke Platz darüber.
 * @returns Höhe der obersten Blockzeile (Boden) oder `null`.
 */
function safeGround(world: SpawnWorld, registry: Pick<Registry, 'getBlockDef'>, x: number, z: number): number | null {
  if (!world.isLoaded(x, z)) return null;
  const y = world.getSurfaceHeight(x, z);
  if (y <= SEA_LEVEL || y + 2 >= CHUNK_HEIGHT) return null;
  const ground = registry.getBlockDef(world.getBlock(x, y, z));
  if (!ground.solid || ground.transparency !== 'opaque') return null;
  for (const dy of [1, 2]) {
    const above = registry.getBlockDef(world.getBlock(x, y + dy, z));
    if (above.solid || above.shape === 'liquid') return null;
  }
  return y;
}

/**
 * Sucht ab dem Weltmittelpunkt spiralförmig nach außen den nächsten sicheren Platz.
 * Gibt die Fußposition (Mitte des Blocks) zurück. Gibt es keinen, wird die höchste geladene Spalte nahe der Mitte
 * genommen, im Notfall ein Punkt knapp über dem Meer.
 *
 * @param radius Suchradius in Blöcken.
 * @param centerX Mittelpunkt der Suche (Standard 8).
 * @param centerZ Mittelpunkt der Suche (Standard 8).
 */
export function findSpawn(
  world: SpawnWorld,
  registry: Pick<Registry, 'getBlockDef'>,
  radius = 64,
  centerX = 8,
  centerZ = 8,
): Vec3 {
  let best: { y: number; x: number; z: number } | null = null;
  for (let r = 0; r <= radius; r++) {
    // Ring mit Kantenlänge r um die Mitte
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const x = centerX + dx;
        const z = centerZ + dz;
        const ground = safeGround(world, registry, x, z);
        if (ground !== null) return { x: x + 0.5, y: ground + 1, z: z + 0.5 };
        if (r <= 16 && world.isLoaded(x, z)) {
          const top = world.getSurfaceHeight(x, z);
          if (best === null || top > best.y) best = { y: top, x, z };
        }
      }
    }
  }
  if (best && best.y > SEA_LEVEL) return { x: best.x + 0.5, y: best.y + 2, z: best.z + 0.5 };
  return { x: centerX + 0.5, y: SEA_LEVEL + 3, z: centerZ + 0.5 };
}
