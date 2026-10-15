/**
 * Menü-Bildschirme: Start, Weltauswahl, Laden, Pause, Einstellungen und Tod.
 *
 * Alle Aktionen laufen über die {@link GameApi}; die Spiellogik bestimmt den Bildschirm.
 *
 * @module ui/menus
 */
import type { DamageCause, GameApi, GameMode, GameState, Screen, WorldInfo } from '../core';
import { button, el, field } from './dom';
import type { Panel } from './inventory';

/** Gemeinsame Abhängigkeiten der Menüs. */
export interface MenuContext {
  readonly game: GameApi;
  /** Bildschirm, zu dem „Zurück" in den Einstellungen führt. */
  readonly getReturnScreen: () => Screen;
}

/** Anzeigename des Spielmodus. */
export function modeLabel(mode: GameMode): string {
  return mode === 'creative' ? 'Kreativ' : 'Überleben';
}

/** Text zur Todesursache. */
export function deathLabel(cause: DamageCause | null): string {
  switch (cause) {
    case 'fall':
      return 'Du bist zu tief gefallen.';
    case 'drown':
      return 'Du bist ertrunken.';
    case 'void':
      return 'Du bist in die Leere gefallen.';
    default:
      return 'Du bist gestorben.';
  }
}

/** Startbildschirm mit Spieltitel. */
export function createTitlePanel(ctx: MenuContext): Panel {
  const element = el('div', 'bw-menu');
  element.append(
    el('div', 'bw-game-title', 'Blockwelt'),
    el('div', 'bw-game-subtitle', 'Bauen, graben, überleben.'),
    (() => {
      const buttons = el('div', 'bw-buttons');
      buttons.append(
        button('Spielen', 'bw-button', () => ctx.game.setScreen('worlds')),
        button('Einstellungen', 'bw-button', () => ctx.game.setScreen('settings')),
      );
      return buttons;
    })(),
  );
  return { element, update() {} };
}

/** Ladebildschirm. */
export function createLoadingPanel(): Panel {
  const element = el('div', 'bw-menu');
  element.append(el('h2', undefined, 'Welt wird geladen …'), el('div', 'bw-empty', 'Bitte warten'));
  return { element, update() {} };
}

/** Weltauswahl: neue Welt erstellen, laden, löschen. */
export function createWorldsPanel(ctx: MenuContext): Panel {
  const element = el('div', 'bw-menu');
  const list = el('div', 'bw-world-list');

  const nameInput = el('input', 'bw-input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Neue Welt';
  nameInput.maxLength = 40;
  const seedInput = el('input', 'bw-input');
  seedInput.type = 'text';
  seedInput.placeholder = 'leer = zufällig';
  const modeSelect = el('select', 'bw-select');
  for (const mode of ['survival', 'creative'] as const) {
    const option = el('option', undefined, modeLabel(mode));
    option.value = mode;
    modeSelect.append(option);
  }

  const createButton = button('Neue Welt erstellen', 'bw-button', () => {
    createButton.disabled = true;
    void ctx.game
      .createWorld({ name: nameInput.value, seed: seedInput.value, mode: modeSelect.value as GameMode })
      .catch(() => undefined)
      .finally(() => {
        createButton.disabled = false;
      });
  });

  const form = el('div');
  form.append(
    field('Name', nameInput),
    field('Seed', seedInput),
    field('Modus', modeSelect),
    createButton,
  );

  const backButton = button('Zurück', 'bw-button', () => ctx.game.setScreen('title'));

  element.append(el('h2', undefined, 'Welt auswählen'), form, el('div', 'bw-separator'), el('div', 'bw-row-title', 'Gespeicherte Welten'), list, backButton);

  let generation = 0;

  function renderWorlds(worlds: WorldInfo[]): void {
    list.replaceChildren();
    if (worlds.length === 0) {
      list.append(el('div', 'bw-empty', 'Noch keine Welt vorhanden.'));
      return;
    }
    for (const world of worlds) {
      const row = el('div', 'bw-world-row');
      const info = el('div', 'bw-world-info');
      info.append(
        el('div', 'bw-world-name', world.name),
        el('div', 'bw-world-meta', `${modeLabel(world.mode)} · zuletzt ${new Date(world.lastPlayed).toLocaleString('de-DE')}`),
      );
      const actions = el('div', 'bw-buttons-row');
      actions.append(
        button('Laden', 'bw-button', () => void ctx.game.loadWorld(world.id).catch(() => undefined)),
        button('Löschen', 'bw-button bw-button-danger', () => {
          void ctx.game.deleteWorld(world.id).then(() => refresh());
        }),
      );
      row.append(info, actions);
      list.append(row);
    }
  }

  async function refresh(): Promise<void> {
    const current = ++generation;
    const worlds = await ctx.game.listWorlds().catch(() => [] as WorldInfo[]);
    if (current === generation) renderWorlds(worlds);
  }

  return {
    element,
    update() {},
    onShow() {
      void refresh();
    },
  };
}

/** Pausenmenü. */
export function createPausedPanel(ctx: MenuContext): Panel {
  const element = el('div', 'bw-menu');
  element.append(
    el('h2', undefined, 'Pause'),
    (() => {
      const buttons = el('div', 'bw-buttons');
      buttons.append(
        button('Weiterspielen', 'bw-button', () => ctx.game.resume()),
        button('Einstellungen', 'bw-button', () => ctx.game.setScreen('settings')),
        button('Speichern und zum Titel', 'bw-button', () => void ctx.game.quitToTitle()),
      );
      return buttons;
    })(),
  );
  return { element, update() {} };
}

/** Einstellungen: Sichtweite, Sichtfeld, Mausempfindlichkeit. */
export function createSettingsPanel(ctx: MenuContext): Panel {
  const element = el('div', 'bw-menu');

  const rows: Array<{ input: HTMLInputElement; set: (value: number) => void }> = [];
  function slider(
    label: string,
    min: number,
    max: number,
    step: number,
    apply: (value: number) => void,
  ): HTMLElement {
    const input = el('input', 'bw-slider');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    const value = el('span', 'bw-value');
    const wrapper = el('div', 'bw-field');
    const text = el('label', undefined, label);
    wrapper.append(text, input, value);
    const set = (next: number): void => {
      if (document.activeElement !== input) input.value = String(next);
      value.textContent = format(step, next);
    };
    input.addEventListener('input', () => {
      const next = Number(input.value);
      set(next);
      apply(next);
    });
    rows.push({ input, set });
    return wrapper;
  }

  function format(step: number, value: number): string {
    return step < 1 ? value.toFixed(1).replace('.', ',') : String(value);
  }

  const distance = slider('Sichtweite (Chunks)', 2, 16, 1, (value) => ctx.game.updateSettings({ renderDistance: value }));
  const fov = slider('Sichtfeld', 30, 110, 1, (value) => ctx.game.updateSettings({ fov: value }));
  const sensitivity = slider('Mausempfindlichkeit', 0.1, 3, 0.1, (value) =>
    ctx.game.updateSettings({ mouseSensitivity: value }),
  );

  element.append(
    el('h2', undefined, 'Einstellungen'),
    distance,
    fov,
    sensitivity,
    button('Zurück', 'bw-button', () => ctx.game.setScreen(ctx.getReturnScreen())),
  );

  return {
    element,
    update(state) {
      const [distanceRow, fovRow, sensitivityRow] = rows;
      distanceRow.set(state.settings.renderDistance);
      fovRow.set(state.settings.fov);
      sensitivityRow.set(state.settings.mouseSensitivity);
    },
  };
}

/** Todesbildschirm mit Respawn. */
export function createDeadPanel(ctx: MenuContext): Panel {
  const element = el('div', 'bw-menu');
  const cause = el('div', 'bw-death');
  element.append(el('h2', undefined, 'Gestorben'), cause, button('Wiederbeleben', 'bw-button', () => ctx.game.respawn()));
  return {
    element,
    update(state) {
      cause.textContent = deathLabel(state.deathCause);
    },
  };
}
