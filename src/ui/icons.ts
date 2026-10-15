/**
 * Item-Symbole aus dem Textur-Atlas.
 *
 * Die HTML-Oberfläche kann das Atlas-Bild nicht direkt adressieren, deshalb wird es einmal
 * in eine Daten-URL verwandelt und je Symbol per `background-position` ausgeschnitten.
 * Ohne Atlas (oder ohne passende Kachel) zeichnet die Oberfläche die Ersatzfarbe des Items.
 *
 * @module ui/icons
 */
import type { ItemDef, TextureAtlas, UVRect } from '../core';
import { hexColor } from './dom';

/** Vergrößerung der 16-px-Kacheln in der Oberfläche. */
export const ICON_SCALE = 2;

/** Fertige Hintergrundwerte für ein Symbol-Rechteck (reine Berechnung, testbar). */
export interface IconBackground {
  readonly backgroundImage: string;
  readonly backgroundSize: string;
  readonly backgroundPosition: string;
  readonly imageRendering: string;
}

/** Berechnet die CSS-Hintergrundwerte für eine Kachel im Atlas. */
export function iconBackground(
  region: UVRect,
  atlasWidth: number,
  atlasHeight: number,
  url: string,
  scale = ICON_SCALE,
): IconBackground {
  return {
    backgroundImage: `url("${url}")`,
    backgroundSize: `${atlasWidth * scale}px ${atlasHeight * scale}px`,
    backgroundPosition: `${-region.u0 * atlasWidth * scale}px ${-region.v0 * atlasHeight * scale}px`,
    imageRendering: 'pixelated',
  };
}

/** Liest das Atlas-Bild als Daten-URL (nur mit HTML-Canvas möglich). */
export function atlasDataUrl(atlas: TextureAtlas | null): string | null {
  if (!atlas) return null;
  const image = atlas.image;
  if (typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement) {
    try {
      return image.toDataURL();
    } catch {
      return null;
    }
  }
  return null;
}

/** Zeichnet Item-Symbole in ein Element. */
export interface IconPainter {
  /** Setzt Symbol (oder Ersatzfarbe) eines Elements. `null` löscht die Darstellung. */
  paint(element: HTMLElement, item: ItemDef | null): void;
  /** Ist der Atlas nutzbar? */
  readonly hasAtlas: boolean;
}

/** Erzeugt einen Symbol-Zeichner für den übergebenen Atlas. */
export function createIconPainter(atlas: TextureAtlas | null): IconPainter {
  const url = atlasDataUrl(atlas);
  const layout = atlas?.layout ?? null;
  const usable = url !== null && layout !== null;

  return {
    hasAtlas: usable,
    paint(element, item) {
      const { style } = element;
      style.backgroundImage = '';
      style.backgroundPosition = '';
      style.backgroundSize = '';
      style.backgroundColor = '';
      if (!item) return;

      const region = usable && layout && item.icon ? layout.regions[item.icon] : undefined;
      if (usable && layout && region && url) {
        Object.assign(style, iconBackground(region, layout.width, layout.height, url));
        return;
      }
      style.backgroundColor = hexColor(item.color);
      style.borderRadius = '3px';
    },
  };
}
