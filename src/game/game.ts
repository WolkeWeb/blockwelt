/**
 * Spiellogik – PLATZHALTER aus Phase 0 (minimaler GameApi-Stub).
 *
 * Kann bereits: eine Welt im Speicher starten, frei fliegen (WASD, Leertaste, Shift, Strg), Maus-Blick mit
 * Pointer-Lock, Hotbar-Auswahl (1–9, Mausrad), Bildschirmwechsel (E, Esc über Pointer-Lock, F3),
 * Tageszeit, anvisierten Block markieren.
 * Noch nicht: Abbauen/Setzen, Inventar-Logik, Crafting, Speichern – das kommt in Phase 1 (C1–C9).
 */
import {
  DEFAULT_RENDER_DISTANCE,
  MAX_RENDER_DISTANCE,
  MIN_RENDER_DISTANCE,
  PLAYER_EYE_HEIGHT,
  PLAYER_REACH,
  TICK_SECONDS,
  createEventBus,
  directionFromAngles,
  toChunkCoord,
  type CameraState,
  type CraftingState,
  type CreateWorld,
  type DebugInfo,
  type Face,
  type FrameTime,
  type GameApi,
  type GameEvents,
  type GameState,
  type InventoryState,
  type ItemStack,
  type MovementInput,
  type NewWorldOptions,
  type PlayerBody,
  type Raycast,
  type RaycastHit,
  type Registry,
  type Renderer,
  type Screen,
  type Settings,
  type StepPlayer,
  type Unsubscribe,
  type Vec3,
  type World,
  type WorldInfo,
} from '../core';
import { Input } from './input';
import { dayTimeFromTicks } from './time';

/** Abhängigkeiten der Spiellogik – alles kommt über die Verträge aus `src/core/`. */
export interface GameDeps {
  readonly registry: Registry;
  readonly renderer: Renderer;
  readonly createWorld: CreateWorld;
  readonly stepPlayer: StepPlayer;
  readonly raycast: Raycast;
  /** Spiel-Canvas (für Pointer-Lock und Eingaben). */
  readonly canvas: HTMLCanvasElement;
}

/** Was `main.ts` zusätzlich zur GameApi braucht. */
export interface Game extends GameApi {
  /** Ein Logik-Tick (fester Zeitschritt `TICK_SECONDS`). */
  tick(): void;
  /**
   * Zeichnet einen Frame.
   * @param alpha Anteil 0–1 zwischen letztem und nächstem Tick (für weiche Bewegung).
   * @param delta Sekunden seit dem letzten Frame.
   * @param elapsed Sekunden seit Start.
   */
  frame(alpha: number, delta: number, elapsed: number): void;
  /** Gemessene Bilder pro Sekunde für die Debug-Anzeige. */
  setFps(fps: number): void;
  /** Wird aufgerufen, wenn der Pointer-Lock verloren geht (z. B. durch Esc). */
  onPointerLockLost(): void;
  /** Wird bei einem Klick auf das Canvas aufgerufen. */
  onCanvasClick(): void;
  dispose(): void;
}

const MOUSE_FACTOR = 0.0025;
const PITCH_LIMIT = Math.PI / 2 - 0.001;
const DEFAULT_SETTINGS: Settings = { renderDistance: DEFAULT_RENDER_DISTANCE, fov: 70, mouseSensitivity: 1 };
const INVENTORY_SIZE = 36;
const START_TICKS = 3000;

function emptyCrafting(size: 2 | 3): CraftingState {
  return { size, slots: new Array<ItemStack | null>(size * size).fill(null), result: null };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Wandelt einen eingegebenen Seed-Text in eine 32-Bit-Zahl (leer = zufällig). */
export function parseSeed(text: string | undefined): number {
  const trimmed = (text ?? '').trim();
  if (trimmed === '') return (Math.random() * 0xffffffff) | 0;
  if (/^-?\d+$/.test(trimmed)) return Number(BigInt.asIntN(32, BigInt(trimmed)));
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) hash = (Math.imul(31, hash) + trimmed.charCodeAt(i)) | 0;
  return hash;
}

function facingFromYaw(yaw: number): Face {
  const a = ((yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  if (a < Math.PI / 4 || a >= (Math.PI * 7) / 4) return 'north';
  if (a < (Math.PI * 3) / 4) return 'west';
  if (a < (Math.PI * 5) / 4) return 'south';
  return 'east';
}

class StubGame implements Game {
  readonly registry: Registry;
  readonly events = createEventBus<GameEvents>();

  private readonly deps: GameDeps;
  private readonly input: Input;
  private world: World | null = null;
  private worldInfo: WorldInfo | null = null;
  private screen: Screen = 'title';
  private settings: Settings = DEFAULT_SETTINGS;
  private debugVisible = false;
  private totalTicks = START_TICKS;
  private fps = 0;
  private yaw = 0;
  private pitch = -0.35;
  private readonly body: PlayerBody = {
    position: { x: 8.5, y: 70, z: 8.5 },
    velocity: { x: 0, y: 0, z: 0 },
    onGround: false,
    inWater: false,
    headInWater: false,
    fallDistance: 0,
  };
  private previousPosition: Vec3 = { x: 8.5, y: 70, z: 8.5 };
  private target: RaycastHit | null = null;
  private inventory: InventoryState = {
    slots: new Array<ItemStack | null>(INVENTORY_SIZE).fill(null),
    cursor: null,
    selected: 0,
    crafting: emptyCrafting(2),
  };
  private state: GameState;
  private dirty = false;

  constructor(deps: GameDeps) {
    this.deps = deps;
    this.registry = deps.registry;
    this.input = new Input(deps.canvas);
    this.state = this.buildState();
  }

  // ----- Zustand -----

  private buildState(): GameState {
    const p = this.body.position;
    const stats = this.deps.renderer.getStats();
    const debug: DebugInfo = {
      fps: this.fps,
      position: { ...p },
      chunk: { x: toChunkCoord(p.x), z: toChunkCoord(p.z) },
      facing: facingFromYaw(this.yaw),
      yaw: (this.yaw * 180) / Math.PI,
      pitch: (this.pitch * 180) / Math.PI,
      target: this.target ? { position: this.target.block, block: this.target.blockId, face: this.target.face } : null,
      chunks: stats.chunks,
      drawCalls: stats.drawCalls,
      triangles: stats.triangles,
    };
    return {
      screen: this.screen,
      world: this.worldInfo,
      mode: this.worldInfo?.mode ?? 'survival',
      inventory: this.inventory,
      health: 20,
      maxHealth: 20,
      air: 300,
      maxAir: 300,
      underwater: this.body.headInWater,
      time: dayTimeFromTicks(this.totalTicks),
      breakProgress: 0,
      debugVisible: this.debugVisible,
      debug,
      settings: this.settings,
      deathCause: null,
    };
  }

  private flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.state = this.buildState();
    this.events.emit('change', this.state);
  }

  getState(): GameState {
    if (this.dirty) this.flush();
    return this.state;
  }

  subscribe(listener: (state: GameState) => void): Unsubscribe {
    const off = this.events.on('change', listener);
    listener(this.getState());
    return off;
  }

  // ----- Welten -----

  async listWorlds(): Promise<WorldInfo[]> {
    return this.worldInfo ? [this.worldInfo] : [];
  }

  async createWorld(options: NewWorldOptions): Promise<WorldInfo> {
    const now = Date.now();
    const info: WorldInfo = {
      id: `welt-${now}`,
      name: options.name.trim() || 'Neue Welt',
      seed: parseSeed(options.seed),
      mode: options.mode,
      createdAt: now,
      lastPlayed: now,
    };
    this.startWorld(info);
    return info;
  }

  async loadWorld(id: string): Promise<void> {
    if (this.worldInfo?.id === id) {
      this.setScreen('playing');
      return;
    }
    this.events.emit('message', { text: 'Speichern und Laden gibt es noch nicht.', kind: 'error' });
  }

  async deleteWorld(_id: string): Promise<void> {
    // Phase 0: nichts gespeichert
  }

  async quitToTitle(): Promise<void> {
    const info = this.worldInfo;
    this.deps.renderer.setWorld(null);
    this.world?.dispose();
    this.world = null;
    this.worldInfo = null;
    this.setScreen('title');
    if (info) this.events.emit('worldClosed', { world: info });
  }

  /** Startet eine Welt im Speicher (Phase 0: ohne Speichern). */
  private startWorld(info: WorldInfo): void {
    this.world?.dispose();
    this.setScreen('loading');
    this.world = this.deps.createWorld({ seed: info.seed, blocks: this.registry.blocks, atlas: null });
    this.worldInfo = info;
    this.deps.renderer.setWorld(this.world);
    this.deps.renderer.setRenderDistance(this.settings.renderDistance);
    this.body.position = { x: 8.5, y: 70, z: 8.5 };
    this.previousPosition = { ...this.body.position };
    this.setScreen('playing');
    this.events.emit('worldLoaded', { world: info });
  }

  // ----- Bildschirme -----

  setScreen(screen: Screen): void {
    const needsWorld: Screen[] = ['playing', 'paused', 'inventory', 'workbench', 'dead'];
    if (needsWorld.includes(screen) && !this.world) return;
    const previous = this.screen;
    if (screen === 'playing') this.input.requestLock();
    else if (previous === 'playing') this.input.releaseLock();
    if (screen === 'inventory') this.inventory = { ...this.inventory, crafting: emptyCrafting(2) };
    if (screen === 'workbench') this.inventory = { ...this.inventory, crafting: emptyCrafting(3) };
    if (screen === previous) return;
    this.screen = screen;
    this.input.clearPresses();
    this.dirty = true;
    this.events.emit('screen', { screen, previous });
  }

  pause(): void {
    this.setScreen('paused');
  }

  resume(): void {
    this.setScreen('playing');
  }

  respawn(): void {
    this.body.position = { x: 8.5, y: 70, z: 8.5 };
    this.previousPosition = { ...this.body.position };
    this.setScreen('playing');
    this.events.emit('respawn', { position: { ...this.body.position } });
  }

  updateSettings(changes: Partial<Settings>): void {
    this.settings = {
      renderDistance: Math.round(
        clamp(changes.renderDistance ?? this.settings.renderDistance, MIN_RENDER_DISTANCE, MAX_RENDER_DISTANCE),
      ),
      fov: clamp(changes.fov ?? this.settings.fov, 30, 110),
      mouseSensitivity: clamp(changes.mouseSensitivity ?? this.settings.mouseSensitivity, 0.1, 3),
    };
    this.deps.renderer.setRenderDistance(this.settings.renderDistance);
    this.dirty = true;
  }

  // ----- Inventar (Phase 0: nur Hotbar-Auswahl) -----

  selectHotbarSlot(index: number): void {
    const selected = ((Math.round(index) % 9) + 9) % 9;
    if (selected === this.inventory.selected) return;
    this.inventory = { ...this.inventory, selected };
    this.dirty = true;
  }

  clickSlot(): void {
    // Phase 1 (C3)
  }

  moveSlot(): void {
    // Phase 1 (C3)
  }

  craft(): void {
    // Phase 1 (C4)
  }

  // ----- Schleife -----

  onPointerLockLost(): void {
    if (this.screen === 'playing') this.pause();
  }

  onCanvasClick(): void {
    if (this.screen === 'playing' || this.screen === 'paused') this.resume();
  }

  private handleKeys(): void {
    if (this.input.consumePress('F3')) {
      this.debugVisible = !this.debugVisible;
      this.dirty = true;
    }
    if (this.input.consumePress('KeyE')) {
      if (this.screen === 'playing') this.setScreen('inventory');
      else if (this.screen === 'inventory' || this.screen === 'workbench') this.setScreen('playing');
    }
    if (this.input.consumePress('Escape')) {
      if (this.screen === 'inventory' || this.screen === 'workbench') this.setScreen('playing');
    }
    if (this.screen !== 'playing') return;
    for (let i = 0; i < 9; i++) if (this.input.consumePress(`Digit${i + 1}`)) this.selectHotbarSlot(i);
    const wheel = this.input.consumeWheel();
    if (wheel !== 0) this.selectHotbarSlot(this.inventory.selected + wheel);
  }

  tick(): void {
    this.handleKeys();
    const world = this.world;
    if (!world) return;
    this.totalTicks++;
    world.update(this.body.position, this.settings.renderDistance);

    this.previousPosition = { ...this.body.position };
    if (this.screen === 'playing') {
      const key = (code: string) => this.input.isDown(code);
      const input: MovementInput = {
        forward: (key('KeyW') ? 1 : 0) - (key('KeyS') ? 1 : 0),
        strafe: (key('KeyD') ? 1 : 0) - (key('KeyA') ? 1 : 0),
        yaw: this.yaw,
        jump: key('Space'),
        sneak: key('ShiftLeft') || key('ShiftRight'),
        sprint: key('ControlLeft') || key('ControlRight'),
        flying: true,
      };
      this.deps.stepPlayer(world, this.registry, this.body, input, TICK_SECONDS);
    }

    const eye = this.eyePosition(1);
    this.target = this.deps.raycast(
      world,
      this.registry,
      eye,
      directionFromAngles(this.yaw, this.pitch),
      PLAYER_REACH,
    );
    this.deps.renderer.setSelection(this.target?.block ?? null);
    this.dirty = true;
  }

  private eyePosition(alpha: number): Vec3 {
    const p = this.body.position;
    const q = this.previousPosition;
    return { x: lerp(q.x, p.x, alpha), y: lerp(q.y, p.y, alpha) + PLAYER_EYE_HEIGHT, z: lerp(q.z, p.z, alpha) };
  }

  frame(alpha: number, delta: number, elapsed: number): void {
    // Maus-Blick jeden Frame (nicht nur pro Tick) für eine flüssige Kamera
    const mouse = this.input.consumeMouse();
    if (this.screen === 'playing') {
      const factor = MOUSE_FACTOR * this.settings.mouseSensitivity;
      this.yaw -= mouse.dx * factor;
      this.pitch = clamp(this.pitch - mouse.dy * factor, -PITCH_LIMIT, PITCH_LIMIT);
    }
    const camera: CameraState = {
      position: this.eyePosition(this.screen === 'playing' ? alpha : 1),
      yaw: this.yaw,
      pitch: this.pitch,
      fov: this.settings.fov,
      underwater: this.body.headInWater,
    };
    const time: FrameTime = { day: dayTimeFromTicks(this.totalTicks), alpha, delta, elapsed };
    this.deps.renderer.render(camera, time);
    this.flush();
  }

  setFps(fps: number): void {
    this.fps = fps;
    this.dirty = true;
  }

  dispose(): void {
    this.input.dispose();
    this.world?.dispose();
    this.events.clear();
  }
}

/** Erzeugt die Spiellogik. */
export function createGame(deps: GameDeps): Game {
  return new StubGame(deps);
}
