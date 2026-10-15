/**
 * Oberfläche als HTML/CSS-Overlay. Spricht nur mit der GameApi aus src/core/game.ts.
 * Zuständig: OpenCode
 *
 * PLATZHALTER aus Phase 0: nur ein Fadenkreuz, sichtbar während `screen === 'playing'`.
 */
import type { CreateUi } from '../core';

export const createUi: CreateUi = ({ root, game }) => {
  const crosshair = document.createElement('div');
  crosshair.className = 'crosshair';
  crosshair.setAttribute('aria-hidden', 'true');
  Object.assign(crosshair.style, {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: '18px',
    height: '18px',
    transform: 'translate(-50%, -50%)',
    background:
      'linear-gradient(#fff, #fff) center / 2px 100% no-repeat, linear-gradient(#fff, #fff) center / 100% 2px no-repeat',
    mixBlendMode: 'difference',
  });
  root.append(crosshair);

  const unsubscribe = game.subscribe((state) => {
    crosshair.style.display = state.screen === 'playing' ? 'block' : 'none';
  });

  return {
    dispose() {
      unsubscribe();
      crosshair.remove();
    },
  };
};
