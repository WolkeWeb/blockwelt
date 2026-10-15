/**
 * Datenformate für gespeicherte Welten und die Schnittstelle zum Speicher.
 * Alles ist reine Daten (Structured Clone), damit IndexedDB es direkt ablegen kann.
 */
import type { ItemStack, Settings, Vec3, WorldInfo } from '../core';

/** Gespeicherter Zustand des Spielers. */
export interface PlayerSave {
  /** Position der Füße. */
  readonly position: Vec3;
  readonly yaw: number;
  readonly pitch: number;
  readonly health: number;
  readonly air: number;
  /** Flugmodus (Kreativ). */
  readonly flying: boolean;
  /** Ausgewählter Hotbar-Slot. */
  readonly selected: number;
  /** Genau 36 Slots. */
  readonly inventory: readonly (ItemStack | null)[];
  /** Tageszeit-Zähler der Welt. */
  readonly totalTicks: number;
  /** Wiedereintrittspunkt nach dem Tod. */
  readonly spawn: Vec3;
}

/**
 * Vom Spieler veränderte Blöcke eines Chunks. Gespeichert werden nur Änderungen – alles andere erzeugt
 * die Welt wieder aus dem Seed. `indices[i]` ist die Zelle (siehe {@link cellIndex}), `blocks[i]` ihr Block.
 */
export interface ChunkChanges {
  readonly cx: number;
  readonly cz: number;
  readonly indices: readonly number[];
  readonly blocks: readonly number[];
}

/** Asynchroner Speicher für Welten. Implementierungen: IndexedDB und (für Tests/Notfall) Arbeitsspeicher. */
export interface SaveStore {
  /** Alle Welten, zuletzt gespielte zuerst. */
  listWorlds(): Promise<WorldInfo[]>;
  getWorld(id: string): Promise<WorldInfo | null>;
  /** Legt eine Welt an oder überschreibt sie. */
  putWorld(info: WorldInfo): Promise<void>;
  /** Löscht die Welt samt Spielerzustand und Chunk-Änderungen. */
  deleteWorld(id: string): Promise<void>;

  loadPlayer(worldId: string): Promise<PlayerSave | null>;
  savePlayer(worldId: string, player: PlayerSave): Promise<void>;

  /** Alle gespeicherten Chunk-Änderungen einer Welt. */
  loadChunks(worldId: string): Promise<ChunkChanges[]>;
  /** Schreibt die angegebenen Chunks (ersetzt den bisherigen Stand dieser Chunks). */
  saveChunks(worldId: string, chunks: readonly ChunkChanges[]): Promise<void>;

  loadSettings(): Promise<Settings | null>;
  saveSettings(settings: Settings): Promise<void>;
}
