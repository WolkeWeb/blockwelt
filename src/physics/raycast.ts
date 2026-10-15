/**
 * PLATZHALTER aus Phase 0: einfacher Raycast in kleinen festen Schritten.
 * Wird in Phase 1 (X8) durch ein exaktes DDA-Verfahren ersetzt.
 */
import { FACE_NORMALS, FACES, type Face, type Raycast } from '../core';

const STEP = 0.02;

export const raycast: Raycast = (world, blocks, origin, direction, maxDistance) => {
  const len = Math.hypot(direction.x, direction.y, direction.z);
  if (len === 0) return null;
  const dx = direction.x / len;
  const dy = direction.y / len;
  const dz = direction.z / len;
  let prevX = Math.floor(origin.x);
  let prevY = Math.floor(origin.y);
  let prevZ = Math.floor(origin.z);

  for (let t = 0; t <= maxDistance; t += STEP) {
    const px = origin.x + dx * t;
    const py = origin.y + dy * t;
    const pz = origin.z + dz * t;
    const bx = Math.floor(px);
    const by = Math.floor(py);
    const bz = Math.floor(pz);
    if (bx === prevX && by === prevY && bz === prevZ && t > 0) continue;
    if (!world.isLoaded(bx, bz)) return null;
    const blockId = world.getBlock(bx, by, bz);
    const def = blocks.getBlockDef(blockId);
    if (def.shape !== 'none' && def.shape !== 'liquid') {
      // Getroffene Seite: aus welcher Nachbarzelle kam der Strahl?
      const ox = prevX - bx;
      const oy = prevY - by;
      const oz = prevZ - bz;
      let face: Face = dy > 0 ? 'bottom' : 'top';
      for (const f of FACES) {
        const n = FACE_NORMALS[f];
        if (n.x === Math.sign(ox) && n.y === Math.sign(oy) && n.z === Math.sign(oz)) face = f;
      }
      if (Math.abs(ox) + Math.abs(oy) + Math.abs(oz) > 1) {
        // Diagonaler Sprung (selten bei kleinen Schritten): Achse mit dem größten Richtungsanteil nehmen
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        const az = Math.abs(dz);
        if (ax >= ay && ax >= az) face = dx > 0 ? 'west' : 'east';
        else if (ay >= az) face = dy > 0 ? 'bottom' : 'top';
        else face = dz > 0 ? 'north' : 'south';
      }
      const n = FACE_NORMALS[face];
      return {
        block: { x: bx, y: by, z: bz },
        blockId,
        face,
        place: { x: bx + n.x, y: by + n.y, z: bz + n.z },
        point: { x: px, y: py, z: pz },
        distance: t,
      };
    }
    prevX = bx;
    prevY = by;
    prevZ = bz;
  }
  return null;
};
