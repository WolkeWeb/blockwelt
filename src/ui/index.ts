/**
 * Oberfläche als HTML/CSS-Overlay. Spricht ausschließlich über die `GameApi` aus `src/core/game.ts`.
 * Zuständig: OpenCode
 *
 * Aufbau:
 * - `.bw-hud`     Fadenkreuz, Hotbar, Herzen, Luftblasen, Debug (F3)
 * - `.bw-overlay` Bildschirme: Start, Weltauswahl, Laden, Pause, Einstellungen, Inventar, Werkbank, Tod
 *
 * Die Spiellogik bestimmt den Bildschirm (`GameState.screen`) und wertet E/Esc/F3 aus; die Oberfläche
 * zeichnet nur und ruft bei Klicks die Aktionen der GameApi auf.
 */
import type { CreateUi, GameState } from '../core';
import './styles.css';
import { el } from './dom';
import { createHud } from './hud';
import { createIconPainter } from './icons';
import { createTooltip } from './slots';

export const createUi: CreateUi = ({ root, game, atlas }) => {
  const container = el('div', 'bw-root');
  const painter = createIconPainter(atlas);
  const tooltip = createTooltip(container);
  const hud = createHud({ registry: game.registry, game, painter, tooltip });

  container.append(hud.element);
  root.append(container);

  const render = (state: GameState): void => {
    hud.update(state);
  };

  const unsubscribe = game.subscribe(render);

  return {
    dispose() {
      unsubscribe();
      container.remove();
    },
  };
};
