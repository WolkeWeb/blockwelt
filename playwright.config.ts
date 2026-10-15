import { defineConfig, devices } from '@playwright/test';

/** Optional: eigener Chromium, falls kein Download möglich ist (siehe scripts/ensure-browser.mjs). */
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    // Gleicher Pfad wie auf GitHub Pages (siehe `base` in vite.config.ts)
    baseURL: 'http://localhost:4173/blockwelt/',
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath,
          // WebGL auch ohne Grafikkarte (z. B. in CI) per Software-Rendering
          args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
        },
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/blockwelt/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
