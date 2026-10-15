import { describe, expect, it } from 'vitest';
import { BLOCK, type BlockDefSource, type BlockSource, type PlayerBody } from '../core';
import { raycast, stepPlayer } from './index';

/** Testwelt: Boden aus Stein bis einschließlich Y = 10, darüber Luft. */
const world: BlockSource = {
  getBlock: (_x, y) => (Math.floor(y) <= 10 ? BLOCK.STONE : BLOCK.AIR),
  isLoaded: () => true,
};
const blocks: BlockDefSource = {
  getBlockDef: (id) =>
    ({ id, shape: id === BLOCK.AIR ? 'none' : 'cube', solid: id !== BLOCK.AIR }) as ReturnType<
      BlockDefSource['getBlockDef']
    >,
};

describe('Platzhalter-Physik', () => {
  it('fliegt in Blickrichtung (yaw 0 = Norden = −Z)', () => {
    const body: PlayerBody = {
      position: { x: 0, y: 20, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      onGround: false,
      inWater: false,
      headInWater: false,
      fallDistance: 0,
    };
    stepPlayer(world, blocks, body, { forward: 1, strafe: 0, yaw: 0, jump: false, sneak: false, sprint: false, flying: true }, 1);
    expect(body.position.z).toBeLessThan(0);
    expect(body.position.x).toBeCloseTo(0);
  });

  it('Raycast nach unten trifft die Oberseite des Bodens', () => {
    const hit = raycast(world, blocks, { x: 0.5, y: 13, z: 0.5 }, { x: 0, y: -1, z: 0 }, 5);
    expect(hit).not.toBeNull();
    expect(hit!.block).toEqual({ x: 0, y: 10, z: 0 });
    expect(hit!.face).toBe('top');
    expect(hit!.place).toEqual({ x: 0, y: 11, z: 0 });
  });

  it('Raycast ohne Ziel in Reichweite liefert null', () => {
    expect(raycast(world, blocks, { x: 0.5, y: 20, z: 0.5 }, { x: 0, y: -1, z: 0 }, 5)).toBeNull();
  });
});
