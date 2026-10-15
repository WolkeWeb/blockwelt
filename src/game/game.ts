/**
 * Spiellogik: setzt die `GameApi` aus `core/game.ts` um und verbindet Welt, Physik und Renderer (nur über die Verträge).
 *
 * Aufgeteilt in kleine, einzeln getestete Bausteine in diesem Ordner:
 * `movement` (Sprint, Doppeltippen), `tools` (Abbauzeit, Drops, Haltbarkeit), `building` (Setzen),
 * `inventory` + `container` (Slots und Klicks), `crafting`, `vitals` (Leben, Luft), `time` (Tag/Nacht),
 * `spawn` (Spawn-Punkt). Gespeichert wird über `src/save/`.
 */
import {
  DEFAULT_RENDER_DISTANCE,
  MAX_RENDER_DISTANCE,
  MIN_RENDER_DISTANCE,
  PLAYER_EYE_HEIGHT,
  PLAYER_REACH,
  TICKS_PER_SECOND,
  TICK_SECONDS,
  BLOCK,
  createEventBus,
  directionFromAngles,
  toChunkCoord,
  type AtlasLayout,
  type CameraState,
  type ClickButton,
  type CraftingState,
  type CreateWorld,
  type DamageCause,
  type DebugInfo,
  type Face,
  type FrameTime,
  type GameApi,
  type GameMode,
  type GameEvents,
  type GameState,
  type InventoryState,
  type ItemStack,
  type NewWorldOptions,
  type PlayerBody,
  type Raycast,
  type RaycastHit,
  type Registry,
  type Renderer,
  type Screen,
  type Settings,
  type SlotRef,
  type StepPlayer,
  type ToolDef,
  type Unsubscribe,
  type Vec3,
  type World,
  type WorldInfo,
} from '../core';
import { canPlaceBlock } from './building';
import {
  MAX_AIR,
  MAX_HEALTH,
  VOID_Y,
  applyDamage,
  fallDamage,
  freshVitals,
  isDead,
  stepVitals,
  type Vitals,
} from './vitals';
import {
  clickContainer,
  flushToInventory,
  moveContainerSlot,
  type Container,
} from './container';
import { ChangeTracker, createMemoryStore, type ChunkChanges, type PlayerSave, type SaveStore } from '../save';
import { Input } from './input';
import { consumeIngredients, craftResult } from './crafting';
import { INVENTORY_SIZE, addItem, canMerge, emptySlots, maxStackOf, removeFromSlot } from './inventory';
import { DoubleTap, SprintTracker, buildMovementInput, type MovementKeys } from './movement';
import { findSpawn } from './spawn';
import { dayTimeFromTicks } from './time';
import { breakSeconds, breakTicks, canHarvest, damageTool, rollDrop, toolWear } from './tools';

/** Abhängigkeiten der Spiellogik – alles kommt über die Verträge aus `src/core/`. */
export interface GameDeps {
  readonly registry: Registry;
  readonly renderer: Renderer;
  readonly createWorld: CreateWorld;
  readonly stepPlayer: StepPlayer;
  readonly raycast: Raycast;
  /** Atlas-Layout für die Textur-Koordinaten der Chunk-Meshes, oder `null` (dann zeichnet die Welt Blockfarben). */
  readonly atlas: AtlasLayout | null;
  /** Speicher für Welten und Einstellungen. Ohne Angabe: Arbeitsspeicher (geht beim Neuladen verloren). */
  readonly store?: SaveStore;
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
  /** Speichert die laufende Welt sofort (Autosave, Verlassen der Seite). Tut nichts, wenn keine Welt läuft. */
  saveNow(): Promise<void>;
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
/** Pause in Ticks zwischen zwei Abbauvorgängen bzw. zwei gesetzten Blöcken bei gehaltener Taste. */
const ACTION_COOLDOWN_TICKS = 5;
/** So lange (in Ticks) wartet das Laden höchstens auf die Chunks um den Spawn-Punkt (20 s). */
const LOADING_TIMEOUT_TICKS = 20 * TICKS_PER_SECOND;
/** Autosave alle 30 Sekunden. */
const AUTOSAVE_TICKS = 30 * TICKS_PER_SECOND;
const START_TICKS = 3000;

function emptyCrafting(size: 2 | 3): CraftingState {
  return { size, slots: new Array<ItemStack | null>(size * size).fill(null), result: null };
}

function isContainerScreen(screen: Screen): boolean {
  return screen === 'inventory' || screen === 'workbench';
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

class GameImpl implements Game {
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
  private readonly store: SaveStore;
  private tracker = new ChangeTracker();
  private stopTracking: (() => void) | null = null;
  private saveChain: Promise<void> = Promise.resolve();
  private ticksSinceSave = 0;
  /** Läuft, solange der Bildschirm `loading` ist: wartet auf die Chunks, dann wird der Spieler gesetzt. */
  private loading: { readonly saved: PlayerSave | null; waited: number } | null = null;
  private tickCount = 0;
  private vitals: Vitals = freshVitals();
  private flying = false;
  private deathCause: DamageCause | null = null;
  private spawn: Vec3 = { x: 8.5, y: 70, z: 8.5 };
  private readonly flyTap = new DoubleTap();
  private breakProgress = 0;
  private breaking: { readonly position: Vec3; ticks: number; total: number } | null = null;
  private actionCooldown = 0;
  private readonly sprint = new SprintTracker();

  constructor(deps: GameDeps) {
    this.deps = deps;
    this.registry = deps.registry;
    this.store = deps.store ?? createMemoryStore();
    void this.store
      .loadSettings()
      .then((saved) => {
        if (saved) this.applySettings(saved);
      })
      .catch(() => {});
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
      mode: this.mode,
      inventory: this.inventory,
      health: this.vitals.health,
      maxHealth: MAX_HEALTH,
      air: this.vitals.air,
      maxAir: MAX_AIR,
      underwater: this.body.headInWater,
      time: dayTimeFromTicks(this.totalTicks),
      breakProgress: this.breakProgress,
      debugVisible: this.debugVisible,
      pointerLocked: this.input.locked,
      debug,
      settings: this.settings,
      deathCause: this.deathCause,
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
    return this.store.listWorlds();
  }

  async createWorld(options: NewWorldOptions): Promise<WorldInfo> {
    const now = Date.now();
    const info: WorldInfo = {
      id: `welt-${now.toString(36)}-${Math.floor(Math.random() * 0xffffff).toString(36)}`,
      name: options.name.trim() || 'Neue Welt',
      seed: parseSeed(options.seed),
      mode: options.mode,
      createdAt: now,
      lastPlayed: now,
    };
    await this.store.putWorld(info);
    await this.saveNow();
    this.startWorld(info, null, []);
    return info;
  }

  async loadWorld(id: string): Promise<void> {
    if (this.worldInfo?.id === id) {
      this.setScreen('playing');
      return;
    }
    const info = await this.store.getWorld(id);
    if (!info) {
      this.events.emit('message', { text: 'Diese Welt gibt es nicht mehr.', kind: 'error' });
      return;
    }
    const [player, changes] = await Promise.all([this.store.loadPlayer(id), this.store.loadChunks(id)]);
    await this.saveNow();
    this.startWorld(info, player, changes);
  }

  async deleteWorld(id: string): Promise<void> {
    if (this.worldInfo?.id === id) {
      this.events.emit('message', { text: 'Die laufende Welt kann nicht gelöscht werden.', kind: 'error' });
      return;
    }
    await this.store.deleteWorld(id);
  }

  async quitToTitle(): Promise<void> {
    const info = this.worldInfo;
    if (!info) return;
    await this.saveNow();
    this.stopTracking?.();
    this.stopTracking = null;
    this.loading = null;
    this.deps.renderer.setWorld(null);
    this.world?.dispose();
    this.world = null;
    this.worldInfo = null;
    this.resetBreaking();
    this.setScreen('title');
    this.events.emit('worldClosed', { world: info });
  }

  /** Speichert Welt-Eintrag, Spieler und alle seit dem letzten Mal veränderten Chunks. Mehrere Aufrufe laufen nacheinander. */
  saveNow(): Promise<void> {
    const info = this.worldInfo;
    if (!info || !this.world) return this.saveChain;
    this.ticksSinceSave = 0;
    const updated: WorldInfo = { ...info, lastPlayed: Date.now() };
    this.worldInfo = updated;
    const player = this.playerSave();
    const dirty = this.tracker.takeDirty();
    this.saveChain = this.saveChain
      .then(async () => {
        await this.store.putWorld(updated);
        await this.store.savePlayer(updated.id, player);
        await this.store.saveChunks(updated.id, dirty);
        this.events.emit('saved', { worldId: updated.id });
      })
      .catch((error: unknown) => {
        console.error('Speichern fehlgeschlagen:', error);
        this.tracker.markDirty(dirty);
        this.events.emit('message', { text: 'Speichern fehlgeschlagen.', kind: 'error' });
      });
    return this.saveChain;
  }

  private playerSave(): PlayerSave {
    return {
      position: { ...this.body.position },
      yaw: this.yaw,
      pitch: this.pitch,
      health: this.vitals.health,
      air: this.vitals.air,
      flying: this.flying,
      selected: this.inventory.selected,
      inventory: this.inventory.slots.map((s) => (s ? { ...s } : null)),
      totalTicks: this.totalTicks,
      spawn: { ...this.spawn },
    };
  }

  /** Startet eine Welt: erzeugt sie, spielt gespeicherte Änderungen ein und stellt den Spieler wieder her. */
  private startWorld(info: WorldInfo, saved: PlayerSave | null, changes: readonly ChunkChanges[]): void {
    this.stopTracking?.();
    this.world?.dispose();
    this.setScreen('loading');
    const world = this.deps.createWorld({ seed: info.seed, blocks: this.registry.blocks, atlas: this.deps.atlas });
    this.world = world;
    this.worldInfo = info;
    this.tracker = new ChangeTracker();
    this.tracker.load(changes);
    this.tracker.forEach((x, y, z, block) => world.setBlock(x, y, z, block));
    this.stopTracking = world.onBlockChanged((c) => this.tracker.record(c.x, c.y, c.z, c.current));
    this.deps.renderer.setWorld(world);
    this.deps.renderer.setRenderDistance(this.settings.renderDistance);
    this.ticksSinceSave = 0;
    this.resetBreaking();
    this.flyTap.reset();
    this.sprint.reset();
    this.deathCause = null;

    this.loading = { saved, waited: 0 };
    if (saved) this.restorePlayer(saved);
    else {
      this.totalTicks = START_TICKS;
      this.vitals = freshVitals();
      this.flying = false;
      this.inventory = {
        ...this.inventory,
        slots: info.mode === 'creative' ? this.creativeStarterItems() : emptySlots(),
        cursor: null,
        selected: 0,
        crafting: emptyCrafting(2),
      };
      // Vorläufig über dem Startbereich warten; der echte Spawn-Punkt wird nach dem Laden der Chunks gesucht
      this.placePlayer({ x: 8.5, y: 90, z: 8.5 });
    }
  }

  /** Ob die Chunks um `(x, z)` so weit da sind, dass der Spieler sicher dort stehen kann. */
  private chunksReady(world: World, x: number, z: number, saved: boolean): boolean {
    if (!world.isLoaded(x, z)) return false;
    if (saved) return true;
    return [-24, 40].every((d) => world.isLoaded(x + d, z) && world.isLoaded(x, z + d));
  }

  /** Ein Ladeschritt: sobald genug Chunks da sind (oder die Zeit abläuft), Spieler setzen und losspielen. */
  private advanceLoading(world: World): void {
    const loading = this.loading;
    const info = this.worldInfo;
    if (!loading || !info) return;
    loading.waited++;
    const center = loading.saved ? this.body.position : { x: 8, y: 0, z: 8 };
    const ready = this.chunksReady(world, Math.floor(center.x), Math.floor(center.z), loading.saved !== null);
    if (!ready && loading.waited < LOADING_TIMEOUT_TICKS) return;
    this.loading = null;
    if (!loading.saved) {
      this.spawn = findSpawn(world, this.registry);
      this.placePlayer(this.spawn);
    }
    this.setScreen('playing');
    this.events.emit('worldLoaded', { world: info });
  }

  private restorePlayer(saved: PlayerSave): void {
    const slots = emptySlots();
    saved.inventory.slice(0, INVENTORY_SIZE).forEach((stack, i) => {
      if (stack && this.registry.getItemDef(stack.item)) slots[i] = { ...stack };
    });
    this.inventory = {
      ...this.inventory,
      slots,
      cursor: null,
      selected: clamp(Math.round(saved.selected), 0, 8),
      crafting: emptyCrafting(2),
    };
    this.vitals = { ...freshVitals(), health: clamp(saved.health, 1, MAX_HEALTH), air: clamp(saved.air, 0, MAX_AIR) };
    this.flying = saved.flying && this.mode === 'creative';
    this.totalTicks = saved.totalTicks;
    this.yaw = saved.yaw;
    this.pitch = clamp(saved.pitch, -PITCH_LIMIT, PITCH_LIMIT);
    this.spawn = { ...saved.spawn };
    this.placePlayer(saved.position);
  }

  // ----- Bildschirme -----

  setScreen(screen: Screen): void {
    const needsWorld: Screen[] = ['playing', 'paused', 'inventory', 'workbench', 'dead'];
    if (needsWorld.includes(screen) && !this.world) return;
    const previous = this.screen;
    if (screen === 'playing') this.input.requestLock();
    else if (previous === 'playing') this.input.releaseLock();
    if (screen === previous) return;
    if (isContainerScreen(previous)) this.closeContainer();
    if (screen === 'inventory') this.inventory = { ...this.inventory, crafting: emptyCrafting(2) };
    if (screen === 'workbench') this.inventory = { ...this.inventory, crafting: emptyCrafting(3) };
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

  /** Setzt den Spieler an eine Stelle (Füße) und nimmt ihm alle Geschwindigkeit. */
  private placePlayer(position: Vec3): void {
    this.body.position = { ...position };
    this.body.velocity = { x: 0, y: 0, z: 0 };
    this.body.fallDistance = 0;
    this.body.onGround = false;
    this.previousPosition = { ...position };
  }

  /** Kreativ-Start: ein Vorrat an Blöcken in der Hotbar (es gibt keine Kreativ-Truhe). */
  private creativeStarterItems(): (ItemStack | null)[] {
    const slots = this.inventory.slots.map(() => null) as (ItemStack | null)[];
    const names = ['grass', 'dirt', 'stone', 'cobblestone', 'planks', 'log', 'glass', 'sand', 'torch'];
    let next = 0;
    for (const name of names) {
      if (next >= 9) break;
      if (this.registry.getItemDef(name)) slots[next++] = { item: name, count: 64 };
    }
    return slots;
  }

  /** Schaden für den Spieler (nur im Überleben). Bei 0 Leben: Tod. */
  private hurt(amount: number, cause: DamageCause): void {
    if (this.mode !== 'survival' || amount <= 0 || isDead(this.vitals)) return;
    this.vitals = applyDamage(this.vitals, amount);
    this.dirty = true;
    this.events.emit('damage', { amount, cause });
    if (isDead(this.vitals)) {
      this.deathCause = cause;
      this.flying = false;
      this.events.emit('death', { cause });
      this.setScreen('dead');
    }
  }

  respawn(): void {
    if (this.screen !== 'dead') return;
    this.vitals = freshVitals();
    this.deathCause = null;
    this.flying = false;
    this.sprint.reset();
    this.placePlayer(this.spawn);
    this.setScreen('playing');
    this.events.emit('respawn', { position: { ...this.body.position } });
  }

  updateSettings(changes: Partial<Settings>): void {
    this.applySettings({ ...this.settings, ...changes });
    void this.store.saveSettings(this.settings).catch(() => {});
  }

  private applySettings(changes: Partial<Settings>): void {
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

  // ----- Inventar und Crafting -----

  selectHotbarSlot(index: number): void {
    const selected = ((Math.round(index) % 9) + 9) % 9;
    if (selected === this.inventory.selected) return;
    this.inventory = { ...this.inventory, selected };
    this.dirty = true;
  }

  private container(): Container {
    const { slots, crafting, cursor } = this.inventory;
    return { inventory: slots, crafting: crafting.slots, cursor };
  }

  private applyContainer(container: Container): void {
    const { size } = this.inventory.crafting;
    const crafting: CraftingState = {
      size,
      slots: container.crafting,
      result: craftResult(this.registry.recipes, container.crafting, size),
    };
    this.inventory = { ...this.inventory, slots: container.inventory, cursor: container.cursor, crafting };
    this.dirty = true;
  }

  /** Räumt Crafting-Raster und Mauszeiger ins Inventar (beim Schließen von Inventar/Werkbank). */
  private closeContainer(): void {
    const { container, overflow } = flushToInventory(this.container(), this.registry);
    this.applyContainer(container);
    this.inventory = { ...this.inventory, crafting: emptyCrafting(2) };
    if (overflow.length > 0) this.events.emit('message', { text: 'Das Inventar ist voll.', kind: 'info' });
  }

  private containerOpen(): boolean {
    return isContainerScreen(this.screen);
  }

  clickSlot(slot: SlotRef, button: ClickButton, shift: boolean): void {
    if (!this.containerOpen()) return;
    if (slot.area === 'result') {
      this.craftFromResult(shift ? 'all' : 'cursor');
      return;
    }
    this.applyContainer(clickContainer(this.container(), slot, button, shift, this.registry));
  }

  moveSlot(from: SlotRef, to: SlotRef): void {
    if (!this.containerOpen() || from.area === 'result' || to.area === 'result') return;
    this.applyContainer(moveContainerSlot(this.container(), from, to, this.registry));
  }

  craft(mode: 'one' | 'all'): void {
    if (!this.containerOpen()) return;
    this.craftFromResult(mode === 'all' ? 'all' : 'one');
  }

  /**
   * Craftet mit dem aktuellen Raster.
   * - `cursor`: ein Stück, Ergebnis an den Mauszeiger (Klick auf den Ergebnis-Slot).
   * - `one` / `all`: einmal bzw. so oft wie möglich, Ergebnis ins Inventar (bricht ab, wenn kein Platz mehr ist).
   */
  private craftFromResult(mode: 'cursor' | 'one' | 'all'): void {
    const size = this.inventory.crafting.size;
    const limit = mode === 'all' ? 64 * 9 : 1;
    for (let n = 0; n < limit; n++) {
      const container = this.container();
      const result = craftResult(this.registry.recipes, container.crafting, size);
      if (!result) return;
      let next: Container;
      if (mode === 'cursor') {
        const cursor = container.cursor;
        const max = maxStackOf(this.registry, result.item);
        if (cursor === null) next = { ...container, cursor: result };
        else if (canMerge(cursor, result) && cursor.count + result.count <= max) {
          next = { ...container, cursor: { ...cursor, count: cursor.count + result.count } };
        } else return;
      } else {
        const added = addItem(container.inventory, this.registry, result);
        if (added.remainder) return;
        next = { ...container, inventory: added.slots };
      }
      this.applyContainer({ ...next, crafting: consumeIngredients(container.crafting) });
      this.events.emit('crafted', { stack: result });
    }
  }

  // ----- Schleife -----

  onPointerLockLost(): void {
    if (this.screen === 'playing') this.pause();
  }

  onCanvasClick(): void {
    if (this.screen === 'paused') this.resume();
    else if (this.screen === 'playing') this.input.requestLock();
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
      else if (this.screen === 'paused') this.resume();
      // Läuft das Spiel ohne Pointer-Lock (z. B. nach dem Schließen des Inventars mit Esc), öffnet Esc das Pausenmenü.
      else if (this.screen === 'playing' && !this.input.locked) this.pause();
    }
    if (this.screen !== 'playing') return;
    for (let i = 0; i < 9; i++) if (this.input.consumePress(`Digit${i + 1}`)) this.selectHotbarSlot(i);
    const wheel = this.input.consumeWheel();
    if (wheel !== 0) this.selectHotbarSlot(this.inventory.selected + wheel);
  }

  tick(): void {
    this.tickCount++;
    const wPressed = this.input.consumePress('KeyW');
    const spacePressed = this.input.consumePress('Space');
    this.handleKeys();
    const world = this.world;
    if (!world) return;
    if (this.clockRunning()) this.totalTicks++;
    if (++this.ticksSinceSave >= AUTOSAVE_TICKS) void this.saveNow();
    world.update(this.loading && !this.loading.saved ? { x: 8, y: 0, z: 8 } : this.body.position, this.settings.renderDistance);
    if (this.screen === 'loading') this.advanceLoading(world);

    this.previousPosition = { ...this.body.position };
    if (this.screen === 'playing') {
      const key = (code: string) => this.input.isDown(code);
      const keys: MovementKeys = {
        forward: key('KeyW'),
        back: key('KeyS'),
        left: key('KeyA'),
        right: key('KeyD'),
        jump: key('Space'),
        sneak: key('ShiftLeft') || key('ShiftRight'),
        ctrl: key('ControlLeft') || key('ControlRight'),
      };
      const sprinting = this.sprint.update(this.tickCount, wPressed, keys);
      if (spacePressed && this.mode === 'creative' && this.flyTap.tap(this.tickCount)) this.flying = !this.flying;
      if (this.mode !== 'creative') this.flying = false;
      const input = buildMovementInput(keys, this.yaw, sprinting, this.flying);
      const step = this.deps.stepPlayer(world, this.registry, this.body, input, TICK_SECONDS);
      this.updateVitals(step.landed ? step.fallDistance : 0);
    }

    const eye = this.eyePosition(1);
    this.target = this.deps.raycast(
      world,
      this.registry,
      eye,
      directionFromAngles(this.yaw, this.pitch),
      PLAYER_REACH,
    );
    if (this.screen === 'playing') this.updateInteraction(world);
    else this.resetBreaking();
    this.deps.renderer.setSelection(this.screen === 'playing' ? (this.target?.block ?? null) : null);
    this.dirty = true;
  }

  /** Überlebensregeln für einen Tick: Fallschaden, Ertrinken, Heilung, Sturz aus der Welt. */
  private updateVitals(fallDistance: number): void {
    if (this.mode === 'creative') {
      if (this.body.position.y < VOID_Y) this.placePlayer(this.spawn);
      return;
    }
    if (this.body.position.y < VOID_Y) {
      this.hurt(MAX_HEALTH, 'void');
      return;
    }
    this.hurt(fallDamage(fallDistance), 'fall');
    if (isDead(this.vitals)) return;
    const step = stepVitals(this.vitals, this.mode, this.body.headInWater);
    this.vitals = step.vitals;
    if (step.damage > 0 && step.cause) {
      this.events.emit('damage', { amount: step.damage, cause: step.cause });
      if (isDead(this.vitals)) {
        this.deathCause = step.cause;
        this.events.emit('death', { cause: step.cause });
        this.setScreen('dead');
      }
    }
  }

  /** Die Tageszeit läuft nur, solange gespielt wird (nicht in Pause, Menü oder nach dem Tod). */
  private clockRunning(): boolean {
    return this.screen === 'playing' || this.screen === 'inventory' || this.screen === 'workbench';
  }

  // ----- Abbauen und Setzen -----

  private get mode(): GameMode {
    return this.worldInfo?.mode ?? 'survival';
  }

  private resetBreaking(): void {
    if (this.breaking === null && this.breakProgress === 0) return;
    this.breaking = null;
    this.breakProgress = 0;
    this.deps.renderer.setBreakProgress(0);
  }

  private updateInteraction(world: World): void {
    if (this.actionCooldown > 0) this.actionCooldown--;
    const placeClick = this.input.consumeClick(2);
    // Ein kurzer Klick zählt auch dann, wenn die Taste vor dem nächsten Tick schon wieder losgelassen war
    // (bei niedriger Bildrate sonst verloren – wichtig für sofortiges Abbauen im Kreativmodus).
    const breakClick = this.input.consumeClick(0);
    const hit = this.target;

    if ((this.input.isButtonDown(0) || breakClick) && hit) this.updateBreaking(world, hit);
    else this.resetBreaking();

    const sneaking = this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight');
    if (placeClick && hit && hit.blockId === BLOCK.CRAFTING_TABLE && !sneaking) {
      this.setScreen('workbench');
      return;
    }
    const placeWanted = placeClick || (this.input.isButtonDown(2) && this.actionCooldown === 0);
    if (placeWanted && hit) this.placeBlock(world, hit);
  }

  private updateBreaking(world: World, hit: RaycastHit): void {
    const pos = hit.block;
    const current = this.breaking;
    if (!current || current.position.x !== pos.x || current.position.y !== pos.y || current.position.z !== pos.z) {
      const block = this.registry.getBlockDef(hit.blockId);
      const tool = this.heldItemDef()?.tool ?? null;
      const ticks = breakTicks(breakSeconds(block, tool, this.mode), TICKS_PER_SECOND);
      this.breaking = { position: { ...pos }, ticks: 0, total: ticks };
    }
    const breaking = this.breaking!;
    if (this.actionCooldown > 0 || !Number.isFinite(breaking.total)) return;
    breaking.ticks++;
    this.breakProgress = Math.min(1, breaking.ticks / breaking.total);
    this.deps.renderer.setBreakProgress(this.breakProgress);
    if (breaking.ticks >= breaking.total) {
      this.breakBlock(world, hit);
      this.resetBreaking();
      this.actionCooldown = ACTION_COOLDOWN_TICKS;
    }
  }

  private breakBlock(world: World, hit: RaycastHit): void {
    const pos = hit.block;
    const block = this.registry.getBlockDef(hit.blockId);
    if (!world.setBlock(pos.x, pos.y, pos.z, BLOCK.AIR)) return;
    this.events.emit('blockBroken', { position: { ...pos }, block: hit.blockId });
    if (this.mode !== 'survival') return;
    const held = this.heldStack();
    const tool = this.heldItemDef()?.tool ?? null;
    if (canHarvest(block, tool)) {
      const drop = rollDrop(block);
      if (drop) this.giveItem(drop);
    }
    if (held && tool) this.wearTool(held, tool, toolWear(block, tool));
  }

  /** Nutzt das gehaltene Werkzeug ab; ein kaputtes verschwindet. */
  private wearTool(held: ItemStack, tool: ToolDef, wear: number): void {
    if (wear <= 0) return;
    const worn = damageTool(held, tool, wear);
    const slots = this.inventory.slots.slice();
    slots[this.inventory.selected] = worn;
    this.inventory = { ...this.inventory, slots };
    if (worn === null) this.events.emit('toolBroken', { item: held.item });
    this.dirty = true;
  }

  /** Legt Items ins Inventar (was nicht passt, geht verloren – es gibt noch keine Item-Entities). */
  private giveItem(stack: ItemStack): void {
    const result = addItem(this.inventory.slots, this.registry, stack);
    const taken = stack.count - (result.remainder?.count ?? 0);
    if (taken === 0) return;
    this.inventory = { ...this.inventory, slots: result.slots };
    this.events.emit('itemPickedUp', { stack: { ...stack, count: taken } });
    this.dirty = true;
  }

  private heldStack(): ItemStack | null {
    return this.inventory.slots[this.inventory.selected] ?? null;
  }

  private heldItemDef() {
    const stack = this.heldStack();
    return stack ? this.registry.getItemDef(stack.item) : undefined;
  }

  private placeBlock(world: World, hit: RaycastHit): void {
    const held = this.heldStack();
    const blockId = held ? this.registry.getItemDef(held.item)?.block : null;
    if (!held || blockId === null || blockId === undefined) return;
    const place = hit.place;
    if (!canPlaceBlock(world, this.registry, place, blockId, this.body.position)) return;
    if (!world.setBlock(place.x, place.y, place.z, blockId)) return;
    this.actionCooldown = ACTION_COOLDOWN_TICKS;
    if (this.mode === 'survival') {
      this.inventory = { ...this.inventory, slots: removeFromSlot(this.inventory.slots, this.inventory.selected, 1) };
    }
    this.events.emit('blockPlaced', { position: { ...place }, block: blockId });
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
    // Zwischen zwei Ticks weiterlaufen lassen, damit Sonne und Licht nicht ruckeln
    const dayTicks = this.totalTicks + (this.clockRunning() ? alpha : 0);
    const time: FrameTime = { day: dayTimeFromTicks(dayTicks), alpha, delta, elapsed };
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
  return new GameImpl(deps);
}
