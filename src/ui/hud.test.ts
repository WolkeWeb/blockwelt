import { describe, expect, it } from 'vitest';
import type { GameState } from '../core';
import { airBubbleCount, debugText, facingName, heartFill } from './hud';

describe('HUD (O8)', () => {
  it('füllt Herzen voll, halb oder leer', () => {
    expect([0, 1, 2, 3, 4].map((i) => heartFill(5, i))).toEqual([2, 2, 1, 0, 0]);
    expect([0, 9].map((i) => heartFill(20, i))).toEqual([2, 2]);
    expect(heartFill(0, 0)).toBe(0);
  });

  it('zählt Luftblasen von 0 bis 10', () => {
    expect(airBubbleCount(300, 300)).toBe(10);
    expect(airBubbleCount(150, 300)).toBe(5);
    expect(airBubbleCount(1, 300)).toBe(1);
    expect(airBubbleCount(0, 300)).toBe(0);
    expect(airBubbleCount(50, 0)).toBe(0);
  });

  it('nennt Himmelsrichtungen auf Deutsch', () => {
    expect(facingName('north')).toBe('Norden');
    expect(facingName('south')).toBe('Süden');
    expect(facingName('east')).toBe('Osten');
    expect(facingName('west')).toBe('Westen');
  });

  it('schreibt Position, Chunk und Blickrichtung in die Debug-Anzeige', () => {
    const state = {
      debug: {
        fps: 60,
        position: { x: 8.5, y: 70, z: -3.25 },
        chunk: { x: 0, z: -1 },
        facing: 'north' as const,
        yaw: 12.4,
        pitch: -30.6,
        target: { position: { x: 8, y: 69, z: -4 }, block: 1, face: 'north' as const },
        chunks: 25,
        drawCalls: 30,
        triangles: 12345,
      },
    } as unknown as GameState;

    const text = debugText(state);
    expect(text).toContain('FPS: 60');
    expect(text).toContain('Position: 8.5 / 70 / -3.3');
    expect(text).toContain('Chunk: 0 / -1');
    expect(text).toContain('Blick: Norden (yaw 12°, pitch -31°)');
    expect(text).toContain('Ziel: 8/69/-4 (1)');
    expect(text).toContain('Chunks: 25');
  });

  it('zeigt ohne Ziel einen Strich', () => {
    const state = {
      debug: {
        fps: 0,
        position: { x: 0, y: 0, z: 0 },
        chunk: { x: 0, z: 0 },
        facing: 'south' as const,
        yaw: 0,
        pitch: 0,
        target: null,
        chunks: 0,
        drawCalls: 0,
        triangles: 0,
      },
    } as unknown as GameState;
    expect(debugText(state)).toContain('Ziel: –');
  });
});
