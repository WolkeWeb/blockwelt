// Installiert Chromium für Playwright (einmalig, danach sofort fertig).
// Wird automatisch vor `npm run e2e` ausgeführt. Läuft unter Windows, macOS und Linux.
// Wer bereits einen passenden Chromium hat (z. B. in einer abgeschotteten Umgebung ohne Download),
// setzt PW_CHROMIUM_PATH auf dessen ausführbare Datei – dann wird nichts installiert.
import { spawnSync } from 'node:child_process';

if (process.env.PW_CHROMIUM_PATH) {
  console.log(`Nutze vorhandenen Chromium: ${process.env.PW_CHROMIUM_PATH}`);
  process.exit(0);
}

const result = spawnSync('npx', ['playwright', 'install', 'chromium'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
