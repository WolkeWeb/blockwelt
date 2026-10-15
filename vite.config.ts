import { defineConfig } from 'vitest/config';

/**
 * Das Spiel läuft auf GitHub Pages unter https://<user>.github.io/blockwelt/ – deshalb liegt alles unter /blockwelt/.
 * Auch der Dev-Server und `vite preview` nutzen diesen Pfad (http://localhost:5173/blockwelt/).
 */
export const BASE_PATH = '/blockwelt/';

export default defineConfig({
  base: BASE_PATH,
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    // three.js allein ist gut 700 kB groß – das ist für ein Spiel in Ordnung
    chunkSizeWarningLimit: 1500,
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
