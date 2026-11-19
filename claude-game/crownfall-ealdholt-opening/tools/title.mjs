// Renders the HOUSE EALDHOLT title card (tools/title.html) as a sequence of frames with a clear ground, one per film
// frame from the moment the dark gathers to the end. tools/finish.mjs lays them over the village's last shot.
//   node tools/title.mjs [--out out/title] [--times 26,27.5,29]   (--times: only those moments, as title-<t>.png)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const require = createRequire(process.env.PLAYWRIGHT_FROM || 'C:/Users/MILES/Documents/Crownfall/main game/package.json');
const { chromium } = require('playwright');
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
const out = path.resolve(ROOT, arg('out', 'out/title'));
const times = arg('times', null);
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true, channel: 'chromium' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(path.join(HERE, 'title.html')).href);
await page.addStyleTag({ url: pathToFileURL(path.join(ROOT, 'fonts', 'fonts.css')).href });
await page.evaluate(() => window.TITLE.build());
const { T0 } = await page.evaluate(() => ({ T0: window.TITLE.T0 }));
const frames = times ? times.split(',').map(Number).map((t) => ({ t, file: `title-${t}.png` }))
  : Array.from({ length: 900 }, (_, i) => i).filter((i) => i / 30 >= T0 - 1 / 30).map((i) => ({ t: i / 30, file: `t${String(i).padStart(5, '0')}.png` }));
for (const { t, file } of frames) {
  const b64 = await page.evaluate((t) => { const c = document.getElementById('c'); window.TITLE.draw(c.getContext('2d'), t); return c.toDataURL('image/png'); }, t);
  fs.writeFileSync(path.join(out, file), Buffer.from(b64.slice(b64.indexOf(',') + 1), 'base64'));
}
await browser.close();
console.log(`${frames.length} title frame(s) from ${frames[0].t.toFixed(2)} s -> ${path.relative(ROOT, out)}`);
