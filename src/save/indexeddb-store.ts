/**
 * Speicher in IndexedDB.
 *
 * Datenbank `blockwelt`, Version 1:
 * - `worlds`  (Schlüssel `id`)       – Weltliste ({@link WorldInfo})
 * - `players` (Schlüssel `worldId`)  – Spielerzustand je Welt
 * - `chunks`  (Schlüssel `key` = `worldId|cx,cz`, Index `byWorld`) – veränderte Blöcke je Chunk
 * - `meta`    (Schlüssel `key`)      – Einstellungen
 */
import type { Settings, WorldInfo } from '../core';
import type { ChunkChanges, PlayerSave, SaveStore } from './types';

const DB_NAME = 'blockwelt';
const DB_VERSION = 1;

interface ChunkRecord extends ChunkChanges {
  readonly key: string;
  readonly worldId: string;
}

interface PlayerRecord extends PlayerSave {
  readonly worldId: string;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB-Fehler'));
  });
}

function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB-Fehler'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB-Transaktion abgebrochen'));
  });
}

/** Öffnet die Datenbank (legt sie beim ersten Mal an). */
export function openDatabase(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = factory.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      db.createObjectStore('worlds', { keyPath: 'id' });
      db.createObjectStore('players', { keyPath: 'worldId' });
      const chunks = db.createObjectStore('chunks', { keyPath: 'key' });
      chunks.createIndex('byWorld', 'worldId');
      db.createObjectStore('meta', { keyPath: 'key' });
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error('IndexedDB lässt sich nicht öffnen'));
    open.onblocked = () => reject(new Error('IndexedDB ist blockiert'));
  });
}

/** Erzeugt einen Speicher auf einer geöffneten Datenbank. */
export function createIndexedDbStore(db: IDBDatabase): SaveStore {
  const chunkKey = (worldId: string, cx: number, cz: number) => `${worldId}|${cx},${cz}`;

  return {
    async listWorlds() {
      const all = await request<WorldInfo[]>(db.transaction('worlds').objectStore('worlds').getAll());
      return all.sort((a, b) => b.lastPlayed - a.lastPlayed);
    },
    async getWorld(id) {
      const info = await request<WorldInfo | undefined>(db.transaction('worlds').objectStore('worlds').get(id));
      return info ?? null;
    },
    async putWorld(info) {
      const tx = db.transaction('worlds', 'readwrite');
      tx.objectStore('worlds').put(info);
      await finished(tx);
    },
    async deleteWorld(id) {
      const tx = db.transaction(['worlds', 'players', 'chunks'], 'readwrite');
      tx.objectStore('worlds').delete(id);
      tx.objectStore('players').delete(id);
      tx.objectStore('chunks').delete(IDBKeyRange.bound(`${id}|`, `${id}|￿`));
      await finished(tx);
    },
    async loadPlayer(worldId) {
      const record = await request<PlayerRecord | undefined>(db.transaction('players').objectStore('players').get(worldId));
      if (!record) return null;
      const { worldId: _ignored, ...player } = record;
      return player;
    },
    async savePlayer(worldId, player) {
      const tx = db.transaction('players', 'readwrite');
      tx.objectStore('players').put({ ...player, worldId } satisfies PlayerRecord);
      await finished(tx);
    },
    async loadChunks(worldId) {
      const index = db.transaction('chunks').objectStore('chunks').index('byWorld');
      const records = await request<ChunkRecord[]>(index.getAll(worldId));
      return records.map(({ cx, cz, indices, blocks }) => ({ cx, cz, indices, blocks }));
    },
    async saveChunks(worldId, chunks) {
      if (chunks.length === 0) return;
      const tx = db.transaction('chunks', 'readwrite');
      const store = tx.objectStore('chunks');
      for (const chunk of chunks) {
        store.put({ ...chunk, key: chunkKey(worldId, chunk.cx, chunk.cz), worldId } satisfies ChunkRecord);
      }
      await finished(tx);
    },
    async loadSettings() {
      const record = await request<{ key: string; value: Settings } | undefined>(
        db.transaction('meta').objectStore('meta').get('settings'),
      );
      return record?.value ?? null;
    },
    async saveSettings(settings) {
      const tx = db.transaction('meta', 'readwrite');
      tx.objectStore('meta').put({ key: 'settings', value: settings });
      await finished(tx);
    },
  };
}
