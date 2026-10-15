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
import type { CreateUi, GameState, Screen } from '../core';
import './styles.css';
import { el, setVisible } from './dom';
import { createHud } from './hud';
import { createIconPainter } from './icons';
import { createContainerPanel, type Panel, type PanelContext } from './inventory';
import { createCursorLayer, createTooltip } from './slots';

export const createUi: CreateUi = ({ root, game, atlas }) => {
  const container = el('div', 'bw-root');
  const overlay = el('div', 'bw-overlay');
  const dim = el('div', 'bw-dim');
  overlay.append(dim);

  const painter = createIconPainter(atlas);
  const tooltip = createTooltip(container);
  const hud = createHud({ registry: game.registry, game, painter, tooltip });
  const pointer = { x: 0, y: 0 };
  const panelContext: PanelContext = { registry: game.registry, game, painter, tooltip, pointer };
  const cursor = createCursorLayer({ registry: game.registry, game, painter, tooltip, drag: { from: null } });

  container.append(hud.element, overlay, cursor.element);
  root.append(container);

  const panels = new Map<Screen, Panel>();
  let lastScreen: Screen | null = null;

  function build(screen: Screen): Panel | null {
    switch (screen) {
      case 'inventory':
        return createContainerPanel('inventory', panelContext, cursor);
      case 'workbench':
        return createContainerPanel('workbench', panelContext, cursor);
      default:
        return null;
    }
  }

  function panelFor(screen: Screen): Panel | null {
    let panel = panels.get(screen) ?? null;
    if (!panel) {
      const created = build(screen);
      if (!created) return null;
      panel = created;
      panels.set(screen, panel);
      overlay.append(panel.element);
    }
    return panel;
  }

  function render(state: GameState): void {
    const changed = state.screen !== lastScreen;
    if (changed) tooltip.hide();

    const active = panelFor(state.screen);
    for (const [screen, panel] of panels) setVisible(panel.element, screen === state.screen);
    if (active && changed) active.onShow?.();
    active?.update(state);

    hud.update(state);
    setVisible(dim, state.screen !== 'playing');
    overlay.style.pointerEvents = state.screen === 'playing' ? 'none' : 'auto';

    lastScreen = state.screen;
  }

  const onMouseMove = (event: MouseEvent): void => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  };
  window.addEventListener('mousemove', onMouseMove);

  const unsubscribe = game.subscribe(render);

  return {
    dispose() {
      unsubscribe();
      window.removeEventListener('mousemove', onMouseMove);
      container.remove();
      panels.clear();
    },
  };
};
