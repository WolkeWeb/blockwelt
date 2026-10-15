/**
 * Speichern und Laden (IndexedDB).
 * Zuständig: Claude Code
 */
import { createIndexedDbStore, openDatabase } from './indexeddb-store';
import { createMemoryStore } from './memory-store';
import type { SaveStore } from './types';

export { ChangeTracker, cellIndex, cellPosition } from './changes';
export { createMemoryStore } from './memory-store';
export type { ChunkChanges, PlayerSave, SaveStore } from './types';

/**
 * Erzeugt den Speicher des Spiels: IndexedDB, wenn verfügbar, sonst (z. B. in privaten Fenstern) ein
 * Speicher im Arbeitsspeicher, der beim Neuladen der Seite verloren geht. Die Datenbank wird erst beim ersten Zugriff geöffnet.
 */
export function createSaveStore(): SaveStore {
  let backend: Promise<SaveStore> | null = null;
  const open = (): Promise<SaveStore> => {
    backend ??= (async () => {
      try {
        if (typeof indexedDB === 'undefined') throw new Error('IndexedDB nicht verfügbar');
        return createIndexedDbStore(await openDatabase());
      } catch (error) {
        console.warn('Speichern im Browser nicht möglich, Spielstände gehen beim Neuladen verloren:', error);
        return createMemoryStore();
      }
    })();
    return backend;
  };
  return {
    listWorlds: async () => (await open()).listWorlds(),
    getWorld: async (id) => (await open()).getWorld(id),
    putWorld: async (info) => (await open()).putWorld(info),
    deleteWorld: async (id) => (await open()).deleteWorld(id),
    loadPlayer: async (id) => (await open()).loadPlayer(id),
    savePlayer: async (id, player) => (await open()).savePlayer(id, player),
    loadChunks: async (id) => (await open()).loadChunks(id),
    saveChunks: async (id, chunks) => (await open()).saveChunks(id, chunks),
    loadSettings: async () => (await open()).loadSettings(),
    saveSettings: async (settings) => (await open()).saveSettings(settings),
  };
}
