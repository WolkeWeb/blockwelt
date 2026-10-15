/**
 * Speicher im Arbeitsspeicher. Dient in Tests und als Notlösung, wenn IndexedDB nicht verfügbar ist
 * (z. B. in privaten Fenstern) – dann geht der Spielstand beim Neuladen der Seite verloren.
 */
import type { Settings, WorldInfo } from '../core';
import type { ChunkChanges, PlayerSave, SaveStore } from './types';

export function createMemoryStore(): SaveStore {
  const worlds = new Map<string, WorldInfo>();
  const players = new Map<string, PlayerSave>();
  const chunks = new Map<string, Map<string, ChunkChanges>>();
  let settings: Settings | null = null;

  const copy = <T>(value: T): T => structuredClone(value);

  return {
    async listWorlds() {
      return [...worlds.values()].map(copy).sort((a, b) => b.lastPlayed - a.lastPlayed);
    },
    async getWorld(id) {
      const info = worlds.get(id);
      return info ? copy(info) : null;
    },
    async putWorld(info) {
      worlds.set(info.id, copy(info));
    },
    async deleteWorld(id) {
      worlds.delete(id);
      players.delete(id);
      chunks.delete(id);
    },
    async loadPlayer(worldId) {
      const player = players.get(worldId);
      return player ? copy(player) : null;
    },
    async savePlayer(worldId, player) {
      players.set(worldId, copy(player));
    },
    async loadChunks(worldId) {
      return [...(chunks.get(worldId)?.values() ?? [])].map(copy);
    },
    async saveChunks(worldId, entries) {
      let map = chunks.get(worldId);
      if (!map) {
        map = new Map();
        chunks.set(worldId, map);
      }
      for (const entry of entries) map.set(`${entry.cx},${entry.cz}`, copy(entry));
    },
    async loadSettings() {
      return settings ? copy(settings) : null;
    },
    async saveSettings(next) {
      settings = copy(next);
    },
  };
}
