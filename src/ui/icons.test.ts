import { describe, expect, it } from 'vitest';
import type { UVRect } from '../core';
import { atlasDataUrl, iconBackground } from './icons';

describe('Item-Symbole aus dem Atlas (O5)', () => {
  const region: UVRect = { u0: 0.25, v0: 0.5, u1: 0.375, v1: 0.75 };

  it('rechnet UV-Rechtecke in Hintergrundposition und -größe um', () => {
    const background = iconBackground(region, 128, 64, 'data:image/png;base64,abc', 2);
    expect(background.backgroundSize).toBe('256px 128px');
    // u0 * Breite * Skalierung = 0.25 * 128 * 2 = 64
    expect(background.backgroundPosition).toBe('-64px -64px');
    expect(background.backgroundImage).toContain('data:image/png');
    expect(background.imageRendering).toBe('pixelated');
  });

  it('liefert ohne Atlas keine Daten-URL', () => {
    expect(atlasDataUrl(null)).toBeNull();
  });
});
