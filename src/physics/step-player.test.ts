import { describe, expect, it } from 'vitest';
import { BLOCK, type BlockDef, type BlockSource, type MovementInput, type PlayerBody } from '../core';
import { stepPlayer } from './step-player';

const defs = { getBlockDef: (id: number) => ({ id, solid: id !== BLOCK.AIR && id !== BLOCK.WATER,
  shape: id === BLOCK.AIR ? 'none' : id === BLOCK.WATER ? 'liquid' : 'cube' }) as BlockDef };
const idle: MovementInput = { forward: 0, strafe: 0, yaw: 0, jump: false, sneak: false, sprint: false, flying: false };
const bodyAt = (x = 0.5, y = 1, z = 0.5): PlayerBody => ({ position: { x, y, z }, velocity: { x: 0, y: 0, z: 0 }, onGround: true, inWater: false, headInWater: false, fallDistance: 0 });
const source = (fn: (x: number, y: number, z: number) => number): BlockSource => ({ getBlock: (x, y, z) => fn(Math.floor(x), Math.floor(y), Math.floor(z)), isLoaded: () => true });
const floor = source((_x, y) => y < 1 ? BLOCK.STONE : BLOCK.AIR);
const run = (world: BlockSource, body: PlayerBody, input: Partial<MovementInput>, ticks = 20) => {
  for (let i = 0; i < ticks; i++) stepPlayer(world, defs, body, { ...idle, ...input }, 0.05);
};

describe('Spielerphysik', () => {
  it('stoppt an Wänden auch bei hoher Geschwindigkeit, gleitet entlang der Wand', () => {
    const world = source((x, y) => y < 1 || x === 2 ? BLOCK.STONE : BLOCK.AIR);
    const body = bodyAt();
    run(world, body, { strafe: 1, forward: 1 });
    expect(body.position.x).toBeCloseTo(1.7);
    expect(body.position.z).toBeLessThan(-1);
    body.velocity.x = 1000;
    run(world, body, {}, 1);
    expect(body.position.x).toBeLessThanOrEqual(1.7 + 1e-6);
  });
  it('springt ca. 1,25 Blöcke hoch und landet; meldet die Fallstrecke einmal', () => {
    const body = bodyAt();
    stepPlayer(floor, defs, body, { ...idle, jump: true }, 0.05);
    let highest = body.position.y, landings = 0;
    for (let i = 0; i < 30; i++) {
      const result = stepPlayer(floor, defs, body, idle, 0.05);
      highest = Math.max(highest, body.position.y);
      if (result.landed) { landings++; expect(result.fallDistance).toBeCloseTo(1.25, 1); }
    }
    expect(highest - 1).toBeCloseTo(1.25, 1);
    expect(body.position.y).toBeCloseTo(1);
    expect(landings).toBe(1);
  });
  it('stößt mit dem Kopf an die Decke', () => {
    const world = source((_x, y) => y < 1 || y === 3 ? BLOCK.STONE : BLOCK.AIR);
    const body = bodyAt();
    run(world, body, { jump: true }, 2);
    expect(body.position.y + 1.8).toBeLessThanOrEqual(3 + 1e-6);
    expect(body.velocity.y).toBeLessThanOrEqual(0);
  });
  it('verhindert beim Schleichen auch diagonales Fallen von Kanten', () => {
    const world = source((x, y, z) => y === 0 && x === 0 && z === 0 ? BLOCK.STONE : BLOCK.AIR);
    const body = bodyAt();
    run(world, body, { strafe: 1, forward: -1, sneak: true }, 100);
    expect(body.position.y).toBeCloseTo(1);
    expect(body.position.x).toBeLessThan(1.3);
    expect(body.position.z).toBeLessThan(1.3);
    run(world, body, { strafe: 1 }, 20);
    expect(body.position.y).toBeLessThan(1);
  });
  it('muss volle Blockstufen überspringen und kann darauf stehen', () => {
    const world = source((x, y) => y < 1 || x === 1 && y === 1 || x >= 2 && y <= 2 ? BLOCK.STONE : BLOCK.AIR);
    const body = bodyAt();
    run(world, body, { strafe: 1 }, 10);
    expect(body.position.x).toBeCloseTo(0.7);
    run(world, body, { strafe: 1, jump: true }, 1);
    run(world, body, { strafe: 1 }, 11);
    expect(body.position.x).toBeGreaterThan(1);
    expect(body.position.x).toBeLessThanOrEqual(1.7 + 1e-6);
    run(world, body, {}, 10);
    expect(body.position.y).toBeCloseTo(2);
    run(world, body, { strafe: 1, jump: true }, 1);
    run(world, body, { strafe: 1 }, 11);
    run(world, body, {}, 10);
    expect(body.position.y).toBeCloseTo(3);
  });
  it('bremst am Boden und schwimmt bzw. sinkt langsam im Wasser', () => {
    const dry = bodyAt(); run(floor, dry, { strafe: 1 }, 20);
    expect(dry.velocity.x).toBeCloseTo(4.3, 1);
    run(floor, dry, {}, 10); expect(Math.abs(dry.velocity.x)).toBeLessThan(0.01);
    const wetWorld = source((_x, y) => y < 1 ? BLOCK.STONE : y < 10 ? BLOCK.WATER : BLOCK.AIR);
    const wet = bodyAt(0.5, 4); wet.onGround = false;
    run(wetWorld, wet, {}, 20);
    expect(wet.velocity.y).toBeGreaterThan(-0.71);
    expect(wet.headInWater).toBe(true);
    const before = wet.position.y;
    run(wetWorld, wet, { jump: true }, 20);
    expect(wet.position.y).toBeGreaterThan(before + 1);
    expect(wet.fallDistance).toBe(0);
  });
  it('behandelt ungeladene Chunks als fest, fliegt mit Kollision und erlaubt explizites noClip', () => {
    const unloaded = { ...floor, isLoaded: (x: number) => x < 1 };
    const body = bodyAt(); run(unloaded, body, { flying: true, strafe: 1 });
    expect(body.position.x).toBeCloseTo(0.7);
    run(unloaded, body, { flying: true, noClip: true, strafe: 1 });
    expect(body.position.x).toBeGreaterThan(2);
  });
});
