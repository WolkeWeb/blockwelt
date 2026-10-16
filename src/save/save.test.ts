import { DEFAULT_KEY_BINDINGS } from '../core';
import { describe, expect, it } from 'vitest';
import type { WorldInfo } from '../core';
import { ChangeTracker, cellIndex, cellPosition } from './changes';
import { createMemoryStore } from './memory-store';
import type { PlayerSave } from './types';

const world = (id: string, lastPlayed: number): WorldInfo => ({
  id,
  name: id,
  seed: 1,
  mode: 'survival',
  createdAt: 0,
  lastPlayed,
});

const player: PlayerSave = {
  position: { x: 1, y: 70, z: 2 },
  yaw: 0.5,
  pitch: -0.2,
  health: 15,
  air: 300,
  flying: false,
  selected: 3,
  inventory: [{ item: 'stone', count: 5 }, ...new Array(35).fill(null)],
  totalTicks: 1234,
  spawn: { x: 8.5, y: 64, z: 8.5 },
};

describe('Zellen-Index', () => {
  it('rechnet Weltkoordinaten hin und zurück um, auch negativ', () => {
    for (const [x, y, z] of [
      [0, 0, 0],
      [15, 127, 15],
      [-1, 63, -17],
      [100, 5, -100],
    ] as const) {
      const cx = Math.floor(x / 16);
      const cz = Math.floor(z / 16);
      expect(cellPosition(cx, cz, cellIndex(x, y, z))).toEqual({ x, y, z });
    }
  });
});

describe('ChangeTracker', () => {
  it('merkt sich nur veränderte Chunks und räumt beim Abholen auf', () => {
    const t = new ChangeTracker();
    expect(t.hasDirty).toBe(false);
    t.record(1, 60, 1, 0);
    t.record(2, 61, 1, 3);
    t.record(-1, 60, 0, 9);
    expect(t.size).toBe(3);
    const dirty = t.takeDirty();
    expect(dirty).toHaveLength(2);
    expect(t.hasDirty).toBe(false);
    expect(t.takeDirty()).toEqual([]);
    t.record(1, 60, 1, 4);
    const again = t.takeDirty();
    expect(again).toHaveLength(1);
    // Der Chunk wird vollständig gespeichert, nicht nur die letzte Änderung
    expect(again[0]!.indices).toHaveLength(2);
  });

  it('letzte Änderung an derselben Stelle gewinnt', () => {
    const t = new ChangeTracker();
    t.record(5, 5, 5, 1);
    t.record(5, 5, 5, 2);
    expect(t.size).toBe(1);
    expect(t.takeDirty()[0]!.blocks).toEqual([2]);
  });

  it('spielt geladene Änderungen wieder ein, ohne sie als ungespeichert zu markieren', () => {
    const a = new ChangeTracker();
    a.record(20, 10, -5, 3);
    a.record(21, 11, -5, 0);
    const saved = a.takeDirty();
    const b = new ChangeTracker();
    b.load(saved);
    expect(b.hasDirty).toBe(false);
    const seen: number[][] = [];
    b.forEach((x, y, z, block) => seen.push([x, y, z, block]));
    expect(seen.sort()).toEqual([
      [20, 10, -5, 3],
      [21, 11, -5, 0],
    ]);
  });

  it('ignoriert Höhen außerhalb der Welt', () => {
    const t = new ChangeTracker();
    t.record(0, -1, 0, 1);
    t.record(0, 128, 0, 1);
    expect(t.size).toBe(0);
  });
});

describe('Speicher (Arbeitsspeicher)', () => {
  it('listet Welten, zuletzt gespielte zuerst', async () => {
    const store = createMemoryStore();
    await store.putWorld(world('a', 10));
    await store.putWorld(world('b', 20));
    expect((await store.listWorlds()).map((w) => w.id)).toEqual(['b', 'a']);
    await store.putWorld(world('a', 30));
    expect((await store.listWorlds()).map((w) => w.id)).toEqual(['a', 'b']);
    expect(await store.getWorld('zzz')).toBeNull();
  });

  it('speichert Spieler und Chunk-Änderungen pro Welt', async () => {
    const store = createMemoryStore();
    await store.putWorld(world('a', 1));
    await store.savePlayer('a', player);
    await store.saveChunks('a', [{ cx: 0, cz: 0, indices: [1], blocks: [3] }]);
    await store.saveChunks('a', [{ cx: 0, cz: 0, indices: [1, 2], blocks: [3, 4] }]);
    expect(await store.loadPlayer('a')).toEqual(player);
    expect(await store.loadChunks('a')).toEqual([{ cx: 0, cz: 0, indices: [1, 2], blocks: [3, 4] }]);
    expect(await store.loadPlayer('b')).toBeNull();
    expect(await store.loadChunks('b')).toEqual([]);
  });

  it('Löschen entfernt alles zur Welt', async () => {
    const store = createMemoryStore();
    await store.putWorld(world('a', 1));
    await store.savePlayer('a', player);
    await store.saveChunks('a', [{ cx: 0, cz: 0, indices: [1], blocks: [3] }]);
    await store.deleteWorld('a');
    expect(await store.listWorlds()).toEqual([]);
    expect(await store.loadPlayer('a')).toBeNull();
    expect(await store.loadChunks('a')).toEqual([]);
  });

  it('gibt Kopien heraus, nicht die gespeicherten Objekte', async () => {
    const store = createMemoryStore();
    await store.savePlayer('a', player);
    const loaded = (await store.loadPlayer('a'))!;
    (loaded.position as { x: number }).x = 999;
    expect((await store.loadPlayer('a'))!.position.x).toBe(1);
  });

  it('speichert Einstellungen', async () => {
    const store = createMemoryStore();
    expect(await store.loadSettings()).toBeNull();
    await store.saveSettings({ renderDistance: 6, fov: 80, volume: 0.5, mouseSensitivity: 1.5, viewBobbing: false, keys: DEFAULT_KEY_BINDINGS });
    expect(await store.loadSettings()).toEqual({ renderDistance: 6, fov: 80, volume: 0.5, mouseSensitivity: 1.5, viewBobbing: false, keys: DEFAULT_KEY_BINDINGS });
  });
});
