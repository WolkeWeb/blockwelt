/**
 * Vertrag zwischen Spiellogik (Bereich `src/game/`, Claude) und Oberfläche (Bereich `src/ui/`, OpenCode).
 *
 * Die Oberfläche greift **nur** über die {@link GameApi} auf das Spiel zu – nie direkt auf Welt, Physik oder Renderer.
 *
 * Aufgabenteilung:
 * - **Spiellogik** wertet alle Tastatur- und Maus-Eingaben im Spiel aus (WASD, Maus, Abbauen/Setzen, 1–9, Mausrad)
 *   **und auch die Bildschirm-Tasten**: `E` (Inventar auf/zu), `Esc` (Pause bzw. Bildschirm schließen), `F3` (Debug).
 *   Sie verwaltet Pointer-Lock und den Zustand `screen`.
 * - **Oberfläche** zeichnet ausschließlich den Zustand aus {@link GameApi.getState} (HUD, Inventar, Menüs) und ruft bei
 *   Mausklicks in Menüs und Inventar die Aktionen der GameApi auf. Sie registriert **keine** eigenen Tasten-Listener
 *   für E/Esc/F3 (sonst würde doppelt umgeschaltet); Texteingaben in Formularen (Weltname, Seed) sind natürlich erlaubt,
 *   ebenso ein kurzzeitiger `keydown`-Listener, solange im Einstellungs-Bildschirm eine neue Taste für die
 *   Tastenbelegung abgefragt wird (siehe {@link KeyBindings}; das Spiel wertet dort keine Tasten aus).
 *
 * `src/ui/index.ts` exportiert `createUi` mit der Signatur {@link CreateUi}.
 *
 * @module core/game
 */

import type { EventBus } from './events';
import type { Registry, TextureAtlas } from './registry';
import type { DayTime } from './render';
import type { BlockId, Face, GameMode, ItemStack, Unsubscribe, Vec3 } from './types';

/**
 * Welcher Bildschirm gerade aktiv ist.
 * - `title`: Startbildschirm
 * - `worlds`: Weltauswahl (Liste, neu, laden, löschen)
 * - `loading`: Welt wird erzeugt/geladen
 * - `playing`: im Spiel, Pointer-Lock aktiv, nur HUD sichtbar
 * - `paused`: Pausenmenü (Spielwelt im Hintergrund, Logik angehalten)
 * - `settings`: Einstellungen (aus Titel oder Pause erreichbar)
 * - `inventory`: Inventar mit 2×2-Crafting
 * - `workbench`: Werkbank mit 3×3-Crafting
 * - `furnace`: Ofen (Zutat, Brennstoff, Ergebnis) – nur per Rechtsklick auf einen Ofen
 * - `chest`: Truhe (27 Slots) – nur per Rechtsklick auf eine Truhe
 * - `dead`: Todesbildschirm mit Respawn
 */
export type Screen =
  | 'title'
  | 'worlds'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'settings'
  | 'inventory'
  | 'workbench'
  | 'furnace'
  | 'chest'
  | 'dead';

/** Gespeicherte Welt in der Weltauswahl. */
export interface WorldInfo {
  /** Eindeutige ID (z. B. UUID). */
  readonly id: string;
  /** Vom Spieler gewählter Name. */
  readonly name: string;
  /** Seed als Zahl. */
  readonly seed: number;
  /** Spielmodus der Welt. */
  readonly mode: GameMode;
  /** Erstellt (ms seit 1970). */
  readonly createdAt: number;
  /** Zuletzt gespielt (ms seit 1970). */
  readonly lastPlayed: number;
}

/** Eingaben für eine neue Welt. */
export interface NewWorldOptions {
  /** Name der Welt (leer → „Neue Welt“). */
  readonly name: string;
  /**
   * Seed als Text, wie ihn der Spieler eintippt. Ganzzahl → direkt verwendet, sonstiger Text → per Hash
   * in eine Zahl umgerechnet, leer oder fehlend → zufällig.
   */
  readonly seed?: string;
  /** Spielmodus. */
  readonly mode: GameMode;
}

/** Einstellungen (werden von der Spiellogik gespeichert). */
/**
 * Aktionen, die der Spieler auf eigene Tasten legen kann. `Esc`, `F3`, `1`–`9` und die Maustasten sind fest.
 * - `sprint`: Sprinten, solange die Taste gehalten wird und vorwärts gelaufen wird (zusätzlich immer: zweimal schnell vorwärts).
 * - `inventory`: Inventar öffnen und schließen.
 */
export type KeyAction = 'forward' | 'back' | 'left' | 'right' | 'jump' | 'sneak' | 'sprint' | 'inventory';

/**
 * Tastenbelegung: Aktion → `KeyboardEvent.code` (layoutunabhängig, z. B. `"KeyW"`, `"Space"`, `"ShiftLeft"`).
 * Regeln: Jede Taste gehört höchstens einer Aktion – belegt der Spieler eine schon benutzte Taste neu, tauscht die
 * Oberfläche die beiden Belegungen. `Escape`, `F3`, `Digit1`–`Digit9` sowie `ControlLeft`/`ControlRight` und
 * `MetaLeft`/`MetaRight` sind nicht belegbar (Browser-Kürzel wie Strg+W). Fehlende oder ungültige Einträge ersetzt die
 * Spiellogik beim Laden durch {@link DEFAULT_KEY_BINDINGS}.
 */
export type KeyBindings = Readonly<Record<KeyAction, string>>;

/** Standard-Tastenbelegung. Sprinten liegt bewusst nicht auf Strg (Strg+W schließt im Browser den Tab). */
export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  sneak: 'ShiftLeft',
  sprint: 'KeyR',
  inventory: 'KeyE',
};

/** Tasten, die nie belegt werden dürfen (siehe {@link KeyBindings}). */
export const RESERVED_KEY_CODES: readonly string[] = [
  'Escape', 'F3', 'ControlLeft', 'ControlRight', 'MetaLeft', 'MetaRight',
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
];

export interface Settings {
  /** Sichtweite in Chunks, 2–16 (Standard 8). */
  readonly renderDistance: number;
  /** Vertikales Sichtfeld in Grad, 30–110 (Standard 70). */
  readonly fov: number;
  /** Mausempfindlichkeit als Faktor, 0,1–3 (Standard 1). */
  readonly mouseSensitivity: number;
  /** Lautstärke der Geräusche 0–1 (Standard 0,8; 0 = stumm). */
  readonly volume: number;
  /** Bewegungsanimation: Kamera und Hand schwingen beim Gehen mit (Standard `true`). */
  readonly viewBobbing: boolean;
  /** Tastenbelegung (Standard {@link DEFAULT_KEY_BINDINGS}). `updateSettings({ keys })` ersetzt die ganze Belegung. */
  readonly keys: KeyBindings;
}

/**
 * Verweis auf einen Slot.
 * - `inventory`: Index 0–8 = Hotbar (links nach rechts), 9–35 = Hauptinventar (3 Reihen à 9, oben links beginnend).
 * - `crafting`: Index im Crafting-Raster, zeilenweise (2×2: 0–3, 3×3: 0–8).
 * - `result`: der Ergebnis-Slot des Crafting-Rasters.
 * - `container`: Slot des geöffneten Block-Behälters (siehe {@link BlockContainerState}):
 *   Truhe 0–26 (3 Reihen à 9), Ofen 0 = Zutat, 1 = Brennstoff, 2 = Ergebnis (nur herausnehmen).
 */
export type SlotRef =
  | { readonly area: 'inventory'; readonly index: number }
  | { readonly area: 'crafting'; readonly index: number }
  | { readonly area: 'result' }
  | { readonly area: 'container'; readonly index: number };

/**
 * Inhalt des gerade geöffneten Block-Behälters (Truhe oder Ofen). Der Inhalt gehört zum Block in der Welt
 * und wird mit der Welt gespeichert; wird der Block abgebaut, landet er im Inventar des Spielers.
 * Shift-Klick verschiebt zwischen Behälter und Inventar (Ofen: Brennstoff in Slot 1, sonst in Slot 0).
 */
export type BlockContainerState =
  | {
      readonly kind: 'chest';
      /** Position des Blocks. */
      readonly position: Vec3;
      /** Genau 27 Slots. */
      readonly slots: readonly (ItemStack | null)[];
    }
  | {
      readonly kind: 'furnace';
      readonly position: Vec3;
      /** Genau 3 Slots: 0 Zutat, 1 Brennstoff, 2 Ergebnis. */
      readonly slots: readonly (ItemStack | null)[];
      /** Restliche Brenndauer des aktuellen Brennstoffs 0–1 (für die Flammen-Anzeige). */
      readonly burn: number;
      /** Fortschritt des aktuellen Schmelzvorgangs 0–1 (für den Pfeil). */
      readonly progress: number;
    };

/** Maustaste für Slot-Klicks. */
export type ClickButton = 'left' | 'right';

/** Zustand des Crafting-Rasters des offenen Bildschirms. */
export interface CraftingState {
  /** Kantenlänge: 2 im Inventar, 3 an der Werkbank. */
  readonly size: 2 | 3;
  /** `size × size` Slots, zeilenweise. */
  readonly slots: readonly (ItemStack | null)[];
  /** Was beim Klick auf den Ergebnis-Slot entsteht, oder `null`. */
  readonly result: ItemStack | null;
}

/** Inventar des Spielers. */
export interface InventoryState {
  /** Genau 36 Slots: 0–8 Hotbar, 9–35 Hauptinventar. `null` = leer. */
  readonly slots: readonly (ItemStack | null)[];
  /** Stapel, der gerade am Mauszeiger hängt, oder `null`. */
  readonly cursor: ItemStack | null;
  /** Ausgewählter Hotbar-Slot 0–8. */
  readonly selected: number;
  /** Crafting-Raster (nur sinnvoll bei `screen` = `inventory` oder `workbench`, sonst leeres 2×2-Raster). */
  readonly crafting: CraftingState;
}

/** Werte für die Debug-Anzeige (F3). */
export interface DebugInfo {
  /** Bilder pro Sekunde (gemittelt, ca. zweimal pro Sekunde aktualisiert). */
  readonly fps: number;
  /** Position der Füße. */
  readonly position: Vec3;
  /** Chunk-Koordinaten des Spielers. */
  readonly chunk: { readonly x: number; readonly z: number };
  /** Grobe Blickrichtung (nur `north`, `south`, `east`, `west`). */
  readonly facing: Face;
  /** Yaw und Pitch in Grad. */
  readonly yaw: number;
  readonly pitch: number;
  /** Anvisierter Block oder `null`. */
  readonly target: { readonly position: Vec3; readonly block: BlockId; readonly face: Face } | null;
  /** Geladene Chunks mit Mesh. */
  readonly chunks: number;
  /** Draw-Calls und Dreiecke des letzten Frames. */
  readonly drawCalls: number;
  readonly triangles: number;
}

/**
 * Gesamter für die Oberfläche sichtbarer Spielzustand. Unveränderlicher Schnappschuss:
 * Bei jeder Änderung entsteht ein neues Objekt (Vergleich per `!==` reicht, um Änderungen zu erkennen).
 */
export interface GameState {
  /** Aktiver Bildschirm. */
  readonly screen: Screen;
  /** Laufende Welt oder `null` (Titel, Weltauswahl). */
  readonly world: WorldInfo | null;
  /** Spielmodus der laufenden Welt (ohne Welt: `survival`). */
  readonly mode: GameMode;
  /** Inventar und Crafting. */
  readonly inventory: InventoryState;
  /** Geöffneter Block-Behälter (bei `screen` = `chest` oder `furnace`), sonst `null`. */
  readonly container: BlockContainerState | null;
  /** Leben in halben Herzen, 0–`maxHealth`. */
  readonly health: number;
  /** Maximales Leben (20 = 10 Herzen). */
  readonly maxHealth: number;
  /** Verbleibende Luft in Ticks, 0–`maxAir`. Blasen: `Math.ceil(air / maxAir * 10)`. */
  readonly air: number;
  /** Maximale Luft (300 Ticks = 15 s). */
  readonly maxAir: number;
  /**
   * Sättigung (Hunger-Anzeige) 0–`maxFood`, in halben Symbolen. Nur im Überleben relevant; im Kreativmodus immer voll.
   * Unter 7 kann man nicht sprinten, bei 0 nimmt man Schaden, ab 18 heilt man.
   */
  readonly food: number;
  /** Maximale Sättigung (20 = 10 Symbole). */
  readonly maxFood: number;
  /** Fortschritt des Essens 0–1, solange die rechte Maustaste mit Nahrung gehalten wird, sonst 0. */
  readonly eatProgress: number;
  /** Kopf unter Wasser – nur dann werden Luftblasen angezeigt. */
  readonly underwater: boolean;
  /** Tageszeit. */
  readonly time: DayTime;
  /** Abbau-Fortschritt des anvisierten Blocks 0–1 (0 = es wird nicht abgebaut). */
  readonly breakProgress: number;
  /** Ob die Debug-Anzeige (F3) eingeblendet ist. */
  readonly debugVisible: boolean;
  /**
   * Ob der Mauszeiger im Spiel gefangen ist (Pointer-Lock). Ist er es bei `screen === 'playing'` nicht
   * (z. B. direkt nach dem Laden einer Welt oder nach Esc im Inventar), reagiert das Spiel nicht auf die Maus;
   * die Oberfläche blendet dann einen Hinweis „Klicken zum Spielen“ ein.
   */
  readonly pointerLocked: boolean;
  /** Debug-Werte. */
  readonly debug: DebugInfo;
  /** Aktuelle Einstellungen. */
  readonly settings: Settings;
  /** Letzte Todesursache (für den Todesbildschirm), sonst `null`. */
  readonly deathCause: DamageCause | null;
}

/** Ursache von Schaden. */
export type DamageCause = 'fall' | 'drown' | 'void' | 'starve' | 'other';

/** Alle Ereignisse der Spiellogik. Abonnieren über `game.events.on(name, listener)`. */
export interface GameEvents {
  /** Zustand hat sich geändert (höchstens einmal pro Frame). Nutzdaten = neuer Zustand. */
  change: GameState;
  /** Bildschirm gewechselt. */
  screen: { readonly screen: Screen; readonly previous: Screen };
  /** Welt fertig geladen, Spiel läuft. */
  worldLoaded: { readonly world: WorldInfo };
  /** Welt verlassen (zurück zum Titel). */
  worldClosed: { readonly world: WorldInfo };
  /** Spieler hat einen Block abgebaut. */
  blockBroken: { readonly position: Vec3; readonly block: BlockId };
  /** Spieler hat einen Block gesetzt. */
  blockPlaced: { readonly position: Vec3; readonly block: BlockId };
  /** Items aufgenommen (z. B. Drop beim Abbauen). */
  itemPickedUp: { readonly stack: ItemStack };
  /** Gegenstand gecraftet. */
  crafted: { readonly stack: ItemStack };
  /** Werkzeug kaputtgegangen. */
  toolBroken: { readonly item: string };
  /** Spieler hat Schaden genommen (halbe Herzen). */
  damage: { readonly amount: number; readonly cause: DamageCause };
  /** Spieler ist gestorben. */
  death: { readonly cause: DamageCause };
  /** Spieler ist wieder erschienen. */
  respawn: { readonly position: Vec3 };
  /** Spielstand gespeichert. */
  saved: { readonly worldId: string };
  /** Kurze Meldung für den Spieler (z. B. als Einblendung). */
  message: { readonly text: string; readonly kind: 'info' | 'error' };
  /** Ein Schritt des Spielers auf festem Boden (für Schrittgeräusche; Block unter den Füßen). Ca. alle 0,4 s beim Gehen. */
  footstep: { readonly block: BlockId };
  /** Ofen hat einen Schmelzvorgang beendet. */
  smelted: { readonly stack: ItemStack };
  /** Spieler hat etwas gegessen (ein Stück der Nahrung). */
  ate: { readonly item: string };
  /** Schlag mit der Hand bzw. dem gehaltenen Item (Abbauen, Setzen, Klick in die Luft) – für Geräusche. */
  swing: Record<string, never>;
}

/** Schnittstelle der Spiellogik für die Oberfläche. */
export interface GameApi {
  /** Inhalte (Namen, Symbole, Stapelgrößen, Werkzeug-Haltbarkeit). */
  readonly registry: Registry;
  /** Typisierter Event-Bus. */
  readonly events: EventBus<GameEvents>;

  /** Aktueller Zustand (Schnappschuss, nicht verändern). */
  getState(): GameState;
  /** Kurzform für `events.on('change', listener)`; ruft den Listener zusätzlich sofort einmal mit dem aktuellen Zustand auf. */
  subscribe(listener: (state: GameState) => void): Unsubscribe;

  // ----- Welten und Menüs -----

  /** Gespeicherte Welten, zuletzt gespielte zuerst. */
  listWorlds(): Promise<WorldInfo[]>;
  /** Erzeugt eine neue Welt, speichert sie und startet sie (`loading` → `playing`). */
  createWorld(options: NewWorldOptions): Promise<WorldInfo>;
  /** Lädt eine gespeicherte Welt und startet sie. */
  loadWorld(id: string): Promise<void>;
  /** Löscht eine gespeicherte Welt. */
  deleteWorld(id: string): Promise<void>;
  /** Speichert und verlässt die laufende Welt, zurück zum Titel. */
  quitToTitle(): Promise<void>;

  /**
   * Wechselt den Bildschirm, z. B. `title` → `worlds`, `paused` → `settings`, `inventory` → `playing`.
   * Ungültige Wechsel (z. B. `inventory` ohne Welt) werden ignoriert.
   * Bei `playing` fordert die Spiellogik den Pointer-Lock an – deshalb direkt aus einem Klick-Handler aufrufen.
   * Beim Schließen von Inventar/Werkbank landen Items aus Raster und Mauszeiger wieder im Inventar.
   */
  setScreen(screen: Screen): void;
  /** Pausiert das Spiel (= `setScreen('paused')`). */
  pause(): void;
  /** Setzt das Spiel fort (= `setScreen('playing')`). */
  resume(): void;
  /** Nach dem Tod: am Spawn-Punkt wieder erscheinen. */
  respawn(): void;
  /** Ändert Einstellungen (nur die angegebenen Felder). Werte außerhalb des Bereichs werden begrenzt. */
  updateSettings(changes: Partial<Settings>): void;

  // ----- Inventar und Crafting -----

  /** Wählt einen Hotbar-Slot 0–8. */
  selectHotbarSlot(index: number): void;
  /**
   * Klick auf einen Slot, Verhalten wie gewohnt:
   * - Links: Stapel aufnehmen / ablegen / mit gleichem Item zusammenlegen / mit Mauszeiger tauschen.
   * - Rechts: halben Stapel aufnehmen / ein einzelnes Item ablegen.
   * - Shift + Links: Stapel direkt verschieben (Hotbar ↔ Hauptinventar, Crafting → Inventar).
   * - Ergebnis-Slot: craftet einmal (Shift: so oft wie möglich) und verbraucht die Zutaten.
   */
  clickSlot(slot: SlotRef, button: ClickButton, shift: boolean): void;
  /** Verschiebt einen Stapel direkt von einem Slot in einen anderen (Drag & Drop); tauscht, wenn das Ziel belegt ist. */
  moveSlot(from: SlotRef, to: SlotRef): void;
  /** Craftet mit dem aktuellen Raster: `one` = einmal, `all` = so oft wie möglich. Ergebnis ins Inventar. */
  craft(mode: 'one' | 'all'): void;
}

/** Optionen für die Oberfläche. */
export interface UiOptions {
  /** Element über dem Canvas, in das die Oberfläche ihr HTML hängt (`#ui`). */
  readonly root: HTMLElement;
  /** Zugriff aufs Spiel. */
  readonly game: GameApi;
  /** Textur-Atlas für Item-Symbole oder `null` (dann Farben aus `ItemDef.color`). */
  readonly atlas: TextureAtlas | null;
}

/** Handle der Oberfläche. */
export interface Ui {
  /** Entfernt die Oberfläche und alle Listener. */
  dispose(): void;
}

/** Signatur der Fabrik, die `src/ui/index.ts` als `createUi` exportiert. */
export type CreateUi = (options: UiOptions) => Ui;
