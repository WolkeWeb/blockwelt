/**
 * PLATZHALTER aus Phase 0: freies Fliegen ohne Kollision und ohne Schwerkraft.
 * WASD bewegt waagerecht in Blickrichtung, Springen = hoch, Schleichen = runter.
 * Wird in Phase 1 (X7) durch echte Physik ersetzt.
 */
import type { StepPlayer } from '../core';

/** Fluggeschwindigkeit in Blöcken pro Sekunde. */
const FLY_SPEED = 10;
const SPRINT_FACTOR = 2;

export const stepPlayer: StepPlayer = (_world, _blocks, body, input, dt) => {
  const speed = FLY_SPEED * (input.sprint ? SPRINT_FACTOR : 1);
  const sin = Math.sin(input.yaw);
  const cos = Math.cos(input.yaw);
  // Vorwärts = (−sin, −cos), rechts = (cos, −sin) in X/Z
  let vx = -sin * input.forward + cos * input.strafe;
  let vz = -cos * input.forward - sin * input.strafe;
  const len = Math.hypot(vx, vz);
  if (len > 1) {
    vx /= len;
    vz /= len;
  }
  const vy = (input.jump ? 1 : 0) - (input.sneak ? 1 : 0);

  body.velocity.x = vx * speed;
  body.velocity.y = vy * speed;
  body.velocity.z = vz * speed;
  body.position.x += body.velocity.x * dt;
  body.position.y += body.velocity.y * dt;
  body.position.z += body.velocity.z * dt;
  body.onGround = false;
  body.inWater = false;
  body.headInWater = false;
  body.fallDistance = 0;
  return { landed: false, fallDistance: 0 };
};
