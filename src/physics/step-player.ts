import {
  PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_EYE_HEIGHT,
  type StepPlayer, type BlockSource, type BlockDefSource, type Vec3,
} from '../core';

const HALF = PLAYER_WIDTH / 2;
const EPS = 1e-7;
const GRAVITY = 24;
const JUMP = Math.sqrt(2 * GRAVITY * 1.25);
type Axis = 'x' | 'y' | 'z';
const bounds = (p: Vec3): { min: Vec3; max: Vec3 } => ({
  min: { x: p.x - HALF, y: p.y, z: p.z - HALF },
  max: { x: p.x + HALF, y: p.y + PLAYER_HEIGHT, z: p.z + HALF },
});

/** Swept AABB, clipped against every crossed block plane, so high velocities cannot tunnel. */
function sweep(world: BlockSource, blocks: BlockDefSource, p: Vec3, axis: Axis, delta: number): number {
  if (!delta) return 0;
  const box = bounds(p), startMin = box.min[axis], startMax = box.max[axis];
  box.min[axis] += Math.min(0, delta); box.max[axis] += Math.max(0, delta);
  let allowed = delta;
  for (let y = Math.floor(box.min.y + EPS); y <= Math.floor(box.max.y - EPS); y++)
    for (let z = Math.floor(box.min.z + EPS); z <= Math.floor(box.max.z - EPS); z++)
      for (let x = Math.floor(box.min.x + EPS); x <= Math.floor(box.max.x - EPS); x++) {
        if (world.isLoaded(x, z) && !blocks.getBlockDef(world.getBlock(x, y, z)).solid) continue;
        const plane = { x, y, z }[axis];
        if (delta > 0 && plane >= startMax - EPS) allowed = Math.min(allowed, Math.max(0, plane - startMax));
        if (delta < 0 && plane + 1 <= startMin + EPS) allowed = Math.max(allowed, Math.min(0, plane + 1 - startMin));
      }
  return allowed;
}
function supported(world: BlockSource, blocks: BlockDefSource, p: Vec3): boolean {
  return sweep(world, blocks, p, 'y', -0.08) > -0.08 + EPS;
}
function water(world: BlockSource, blocks: BlockDefSource, p: Vec3): boolean {
  const box = bounds(p);
  for (let y = Math.floor(box.min.y); y <= Math.floor(box.max.y - EPS); y++)
    for (let z = Math.floor(box.min.z); z <= Math.floor(box.max.z - EPS); z++)
      for (let x = Math.floor(box.min.x); x <= Math.floor(box.max.x - EPS); x++)
        if (world.isLoaded(x, z) && blocks.getBlockDef(world.getBlock(x, y, z)).shape === 'liquid' && p.y < y + 0.875) return true;
  return false;
}

export const stepPlayer: StepPlayer = (world, blocks, body, input, dt) => {
  if (!Number.isFinite(dt) || dt <= 0) return { landed: false, fallDistance: 0 };
  const seconds = Math.min(dt, 1), steps = Math.ceil(seconds / 0.01), h = seconds / steps;
  const sin = Math.sin(input.yaw), cos = Math.cos(input.yaw);
  let ix = -sin * input.forward + cos * input.strafe;
  let iz = -cos * input.forward - sin * input.strafe;
  const magnitude = Math.max(1, Math.hypot(ix, iz)); ix /= magnitude; iz /= magnitude;
  let landed = false, fallDistance = 0;
  let jumpAvailable = input.jump;
  for (let step = 0; step < steps; step++) {
    body.inWater = water(world, blocks, body.position);
    const flying = input.flying || input.noClip;
    const speed = flying ? (input.sprint ? 20 : 10) : body.inWater ? 2.2 : input.sneak ? 1.3 : input.sprint ? 5.6 : 4.3;
    const response = flying ? 30 : body.inWater ? 6 : body.onGround ? 30 : 12;
    const blend = 1 - Math.exp(-response * h);
    body.velocity.x += (ix * speed - body.velocity.x) * blend;
    body.velocity.z += (iz * speed - body.velocity.z) * blend;
    if (flying) body.velocity.y = ((input.jump ? 1 : 0) - (input.sneak ? 1 : 0)) * speed;
    else if (body.inWater) {
      body.velocity.y += ((input.jump ? 3.4 : input.sneak ? -2.5 : -0.7) - body.velocity.y) * (1 - Math.exp(-5 * h));
    } else if (jumpAvailable && body.onGround) { body.velocity.y = JUMP; body.onGround = false; jumpAvailable = false; }

    const previousGround = body.onGround;
    const acceleration = flying || body.inWater ? 0 : GRAVITY;
    const dy = body.velocity.y * h - acceleration * h * h / 2;
    body.velocity.y -= acceleration * h;
    const movedY = input.noClip ? dy : sweep(world, blocks, body.position, 'y', dy);
    body.position.y += movedY;
    body.onGround = dy < 0 && movedY > dy + EPS;
    if (Math.abs(movedY - dy) > EPS) body.velocity.y = 0;
    if (flying || body.inWater) body.fallDistance = 0;
    else if (movedY < 0) body.fallDistance += -movedY;
    if (body.onGround) {
      if (!previousGround) { landed = true; fallDistance = Math.max(fallDistance, body.fallDistance); }
      body.fallDistance = 0;
    }
    let dx = body.velocity.x * h, dz = body.velocity.z * h;
    if (input.sneak && body.onGround && !flying) {
      const safe = (x: number, z: number) => supported(world, blocks, { x: body.position.x + x, y: body.position.y, z: body.position.z + z });
      const reduce = (v: number) => Math.abs(v) < 0.01 ? 0 : v - Math.sign(v) * 0.01;
      while (dx && !safe(dx, 0)) dx = reduce(dx);
      while (dz && !safe(0, dz)) dz = reduce(dz);
      while ((dx || dz) && !safe(dx, dz)) { dx = reduce(dx); dz = reduce(dz); }
    }
    for (const axis of ['x', 'z'] as const) {
      const delta = axis === 'x' ? dx : dz;
      const moved = input.noClip ? delta : sweep(world, blocks, body.position, axis, delta);
      body.position[axis] += moved;
      if (Math.abs(moved - delta) > EPS) body.velocity[axis] = 0;
    }
  }
  body.inWater = water(world, blocks, body.position);
  const eye = { ...body.position, y: body.position.y + PLAYER_EYE_HEIGHT };
  body.headInWater = world.isLoaded(eye.x, eye.z) && blocks.getBlockDef(world.getBlock(eye.x, eye.y, eye.z)).shape === 'liquid' && eye.y % 1 < 0.875;
  if (body.inWater || input.flying || input.noClip) body.fallDistance = 0;
  return { landed, fallDistance };
};
