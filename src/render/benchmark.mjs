import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const software = process.argv.includes('--software');
const server = await createServer({ server: { host: '127.0.0.1', port: 4175, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ headless: true, channel: process.env.PW_CHROMIUM_PATH ? undefined : 'msedge',
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
  args: ['--ignore-gpu-blocklist', ...(software ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [])] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  page.on('console', message => { if (message.type() === 'error') { errors.push(message.text()); console.error(message.text()); } });
  console.log('Loading 197 chunks at render distance 8…');
  const loadStart = performance.now();
  await page.goto('http://127.0.0.1:4175/blockwelt/src/render/benchmark.html');
  const progress = setInterval(async () => console.log('Loading:', await page.evaluate(() => window.blockweltBenchmark?.snapshot()).catch(() => 'starting')), 20000);
  try { await page.waitForFunction(() => window.blockweltBenchmark?.snapshot().settled, undefined, { timeout: 180000 }); }
  finally { clearInterval(progress); }
  const loadMs = performance.now() - loadStart;
  console.log('World settled:', await page.evaluate(() => window.blockweltBenchmark.snapshot()));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.collectGarbage');
  const loadedHeap = await cdp.send('Runtime.getHeapUsage');
  const stationary = await page.evaluate(() => window.blockweltBenchmark.sample(10, false));
  console.log('Stationary:', stationary);
  const moving = await page.evaluate(() => window.blockweltBenchmark.sample(10, true));
  console.log('Moving:', moving);
  await page.screenshot({ path: path.join(directory, 'benchmark.png') });
  const afterClear = await page.evaluate(() => window.blockweltBenchmark.clear());
  await cdp.send('HeapProfiler.collectGarbage');
  const clearedHeap = await cdp.send('Runtime.getHeapUsage');
  await page.evaluate(() => window.blockweltBenchmark.dispose());
  const results = { timestamp: new Date().toISOString(), browser: await browser.version(), software,
    platform: os.platform(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, viewport: '1280×720 DPR 1', loadMs,
    stationary, moving, loadedHeap, afterClear, clearedHeap, errors };
  await writeFile(path.join(directory, software ? 'benchmark-software.json' : 'benchmark-results.json'), JSON.stringify(results, null, 2));
  if (errors.length || afterClear.chunks !== 0) throw new Error('Benchmark detected browser errors or leaked chunk meshes');
} finally { await browser.close(); await server.close(); }
