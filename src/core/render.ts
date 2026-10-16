/**
 * Vertrag für die Darstellung (Bereich `src/render/`, Codex).
 *
 * Der Renderer zeichnet mit three.js auf ein Canvas: Himmel, Chunk-Meshes der Welt, Auswahlrahmen
 * und Abbau-Risse. Er berechnet selbst keine Spiellogik; Kamera und Tageszeit bekommt er pro Frame.
 *
 * `src/render/index.ts` exportiert `createRenderer` mit der Signatur {@link CreateRenderer}.
 *
 * @module core/render
 */

import type { Registry, TextureAtlas } from './registry';
import type { ItemId } from './types';
import type { BlockId, Vec3 } from './types';
import type { World } from './world';

/**
 * Tageszeit. Wird von der Spiellogik berechnet (ein Tag = `DAY_LENGTH_TICKS` = 24 000 Ticks = 20 Minuten).
 *
 * Konvention: Tick 0 = Sonnenaufgang, 6000 = Mittag, 12 000 = Sonnenuntergang, 18 000 = Mitternacht.
 */
export interface DayTime {
  /** Ticks seit Weltbeginn (wächst immer weiter). */
  readonly totalTicks: number;
  /** Ticks innerhalb des aktuellen Tages, 0 bis 23 999. */
  readonly ticks: number;
  /** Anteil des Tages 0–1 (`ticks / 24000`): 0 Aufgang, 0,25 Mittag, 0,5 Untergang, 0,75 Mitternacht. */
  readonly fraction: number;
  /**
   * Sonnenwinkel in Radiant (`fraction × 2π`). Richtung zur Sonne: `(cos a, sin a, 0)` –
   * die Sonne geht also im Osten (+X) auf, steht mittags im Zenit und geht im Westen (−X) unter.
   * Der Mond steht genau gegenüber.
   */
  readonly sunAngle: number;
  /**
   * Stärke des Himmelslichts 0–1 (Mittag 1, Nacht ca. 0,2, weicher Übergang in der Dämmerung).
   * Multiplikator für das ins Mesh gebackene Himmelslicht.
   */
  readonly skyLight: number;
}

/** Kamera für einen Frame. Bereits zwischen zwei Ticks interpoliert. */
export interface CameraState {
  /** Augenposition in Weltkoordinaten. */
  readonly position: Vec3;
  /** Yaw in Radiant (Konvention siehe `directionFromAngles` in `core/types.ts`). */
  readonly yaw: number;
  /** Pitch in Radiant, positiv = nach oben. */
  readonly pitch: number;
  /** Vertikales Sichtfeld in Grad. */
  readonly fov: number;
  /** Kamera ist unter Wasser (z. B. für blauen Nebel). */
  readonly underwater: boolean;
}

/** Zeitinformationen für einen Frame. */
export interface FrameTime {
  /** Aktuelle Tageszeit. */
  readonly day: DayTime;
  /** Interpolationsanteil zwischen dem letzten und dem nächsten Tick, 0–1. */
  readonly alpha: number;
  /** Sekunden seit dem letzten Frame. */
  readonly delta: number;
  /** Sekunden seit Start (für Animationen wie Wasser oder Wolken). */
  readonly elapsed: number;
}

/**
 * Gehaltenes Item für die Ego-Ansicht. Alle Animationswerte berechnet die Spiellogik (bereits zwischen Ticks interpoliert);
 * der Renderer setzt sie nur in Bewegung um.
 *
 * Darstellung (Sache des Renderers): leere Hand = Arm (eigenes, schlichtes Design), Block-Item = kleiner texturierter
 * Würfel, sonstige Items und Werkzeuge = aus dem Atlas-Symbol (`ItemDef.icon`) ausgestanzte, leicht plastische Pixelgrafik,
 * Werkzeuge schräg wie gehalten. Unten rechts im Bild, eigenes festes Sichtfeld (unabhängig von `CameraState.fov`),
 * ragt nie in Wände hinein.
 */
export interface HeldItemView {
  /** Gehaltenes Item oder `null` für die leere Hand. */
  readonly item: ItemId | null;
  /** Schlag-Animation 0–1 (0 = Ruhe; läuft beim Abbauen in Schleife, beim Setzen/Klicken einmal durch). */
  readonly swing: number;
  /** Ess-Animation 0–1 (Item wandert zum Mund und wippt), 0 = isst nicht. */
  readonly eat: number;
  /** Wechsel-Animation 0–1: 1 = ganz unten (gerade gewechselt), 0 = ganz oben (bereit). */
  readonly equip: number;
  /** Laufphase in Radiant (wächst mit der gelaufenen Strecke) für das Mitschwingen. */
  readonly bobPhase: number;
  /** Stärke des Mitschwingens 0–1 (0 im Stand, beim Fliegen, Schwimmen oder bei ausgeschalteter Bewegungsanimation). */
  readonly bobAmount: number;
  /** Helligkeit 0–1 am Spieler (Himmels- bzw. Blocklicht), damit die Hand nachts nicht leuchtet. */
  readonly light: number;
}

/** Messwerte für die Debug-Anzeige. */
export interface RenderStats {
  /** Draw-Calls im letzten Frame. */
  readonly drawCalls: number;
  /** Gezeichnete Dreiecke im letzten Frame. */
  readonly triangles: number;
  /** Chunks mit Mesh in der Szene. */
  readonly chunks: number;
}

/** Der Renderer. */
export interface Renderer {
  /**
   * Bindet den Renderer an ein Canvas (WebGL-Kontext erzeugen). Einmal aufrufen.
   * Der Renderer passt sich selbst an die Anzeigegröße des Canvas an (`clientWidth`/`clientHeight`, devicePixelRatio).
   */
  attach(canvas: HTMLCanvasElement): void;

  /**
   * Setzt die anzuzeigende Welt (oder `null` für keine, z. B. im Hauptmenü). Der Renderer übernimmt vorhandene
   * Meshes über `world.getChunkMeshes()` und meldet sich für `onChunkMesh`/`onChunkUnloaded` an.
   * Beim Wechsel räumt er die alte Welt aus der Szene.
   */
  setWorld(world: World | null): void;

  /** Zeichnet einen Frame. Ohne Welt nur den Himmel. */
  render(camera: CameraState, time: FrameTime): void;

  /** Sichtweite in Chunks (für Nebel und Kamera-Far-Plane). */
  setRenderDistance(chunks: number): void;

  /** Anvisierter Block (ganzzahlige Position) für den Auswahlrahmen, oder `null`. */
  setSelection(block: Vec3 | null): void;

  /** Abbau-Fortschritt am ausgewählten Block, 0 = keine Risse, 1 = gleich kaputt (10 Stufen). */
  setBreakProgress(progress: number): void;

  /**
   * Partikel beim Abbauen: kleine Bruchstücke in der Farbe/Textur des Blocks, die aus dem Block `position`
   * (ganzzahlig) herausfallen und nach ca. 1 s verschwinden. Wird von der Spiellogik bei jedem abgebauten Block
   * aufgerufen. Ein Renderer ohne Partikel darf nichts tun.
   */
  spawnBlockParticles(position: Vec3, block: BlockId): void;

  /**
   * Was der Spieler in der Hand hält (Ego-Ansicht unten rechts) und wie es sich gerade bewegt.
   * Wird von der Spiellogik vor jedem `render` aufgerufen. Ein Renderer ohne Hand-Darstellung darf nichts tun.
   */
  setHeldItem(view: HeldItemView): void;

  /** Messwerte des letzten Frames. */
  getStats(): RenderStats;

  /** Gibt alle GPU-Ressourcen frei. */
  dispose(): void;
}

/** Optionen für den Renderer. */
export interface RendererOptions {
  /** Inhalte (Blockdefinitionen). */
  readonly registry: Registry;
  /** Textur-Atlas oder `null` (dann zeichnet die Welt Vertex-Farben). */
  readonly atlas: TextureAtlas | null;
}

/** Signatur der Fabrik, die `src/render/index.ts` als `createRenderer` exportiert. */
export type CreateRenderer = (options: RendererOptions) => Renderer;
