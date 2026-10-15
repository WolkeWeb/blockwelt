import { describe, expect, it } from 'vitest';
import { SprintTracker, buildMovementInput, type MovementKeys } from './movement';

const idle: MovementKeys = { forward: false, back: false, left: false, right: false, jump: false, sneak: false, ctrl: false };
const walking: MovementKeys = { ...idle, forward: true };

describe('Sprinten', () => {
  it('Strg + vorwärts sprintet, Strg allein nicht', () => {
    const s = new SprintTracker();
    expect(s.update(0, false, { ...walking, ctrl: true })).toBe(true);
    expect(s.update(1, false, { ...idle, ctrl: true })).toBe(false);
  });

  it('zweimal schnell W sprintet bis W losgelassen wird', () => {
    const s = new SprintTracker();
    expect(s.update(0, true, walking)).toBe(false);
    expect(s.update(1, false, idle)).toBe(false);
    expect(s.update(4, true, walking)).toBe(true);
    expect(s.update(5, false, walking)).toBe(true);
    expect(s.update(6, false, idle)).toBe(false);
    expect(s.update(7, false, walking)).toBe(false);
  });

  it('zu langsames Doppeltippen zählt nicht', () => {
    const s = new SprintTracker();
    s.update(0, true, walking);
    expect(s.update(20, true, walking)).toBe(false);
  });

  it('Schleichen beendet den Sprint', () => {
    const s = new SprintTracker();
    expect(s.update(0, false, { ...walking, ctrl: true })).toBe(true);
    expect(s.update(1, false, { ...walking, ctrl: true, sneak: true })).toBe(false);
  });
});

describe('buildMovementInput', () => {
  it('rechnet Tasten in Achsen um', () => {
    const input = buildMovementInput({ ...idle, forward: true, left: true }, 1.5, false, false);
    expect(input).toMatchObject({ forward: 1, strafe: -1, yaw: 1.5, sprint: false, flying: false });
    expect(buildMovementInput({ ...idle, forward: true, back: true }, 0, false, false).forward).toBe(0);
  });
});
