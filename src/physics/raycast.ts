import { FACE_NORMALS, type Face, type Raycast } from '../core';

/** Amanatides-Woo traversal. Ties cross all touched planes, skipping zero-volume cells. */
export const raycast: Raycast = (world, blocks, origin, direction, maxDistance) => {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  if (!Number.isFinite(length) || length === 0 || !Number.isFinite(maxDistance) || maxDistance < 0 ||
      ![origin.x, origin.y, origin.z].every(Number.isFinite)) return null;
  const d = [direction.x / length, direction.y / length, direction.z / length];
  const o = [origin.x, origin.y, origin.z];
  const cell = o.map(Math.floor), step = d.map(Math.sign);
  const delta = d.map(v => v === 0 ? Infinity : Math.abs(1 / v));
  const next = d.map((v, i) => v === 0 ? Infinity : ((cell[i] + (v > 0 ? 1 : 0)) - o[i]) / v);
  const faces: Face[] = [d[0] > 0 ? 'west' : 'east', d[1] > 0 ? 'bottom' : 'top', d[2] > 0 ? 'north' : 'south'];
  const dominant = d.reduce((best, value, i) => Math.abs(value) > Math.abs(d[best]) ? i : best, 0);
  let face = faces[dominant], distance = 0;
  while (distance <= maxDistance) {
    const [x, y, z] = cell;
    if (!world.isLoaded(x, z)) return null;
    const blockId = world.getBlock(x, y, z), def = blocks.getBlockDef(blockId);
    if (def.shape !== 'none' && def.shape !== 'liquid') {
      const n = FACE_NORMALS[face];
      return { block: { x, y, z }, blockId, face, place: { x: x + n.x, y: y + n.y, z: z + n.z },
        point: { x: origin.x + d[0] * distance, y: origin.y + d[1] * distance, z: origin.z + d[2] * distance }, distance };
    }
    distance = Math.min(...next);
    if (distance > maxDistance) break;
    const tied = next.map((v, i) => Math.abs(v - distance) < 1e-10 ? i : -1).filter(i => i >= 0);
    const axis = tied.reduce((best, i) => Math.abs(d[i]) > Math.abs(d[best]) ? i : best, tied[0]);
    face = faces[axis];
    for (const i of tied) { cell[i] += step[i]; next[i] += delta[i]; }
  }
  return null;
};
