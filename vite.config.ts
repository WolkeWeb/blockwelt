import { defineConfig } from 'vitest/config';

export default defineConfig({
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
