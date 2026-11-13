// Bakes the village's ground heights and pond level from the model into out/ground.json, for the camera rigs.
//   node tools/ground.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_FROM || 'C:/Users/MILES/Documents/Crownfall/main game/package.json');
const { chromium } = require('playwright');
const server = await startServer(0);
const browser = await chromium.launch({ headless: true, channel: 'chromium' });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/ground.html`);
await page.waitForFunction(() => window.__ground || window.__groundError, undefined, { timeout: 300000 });
const error = await page.evaluate(() => window.__groundError);
if (error) { console.log(error); process.exit(1); }
const ground = await page.evaluate(() => window.__ground);
await browser.close(); server.close();
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'out', 'ground.json'), JSON.stringify(ground));
const hs = ground.heights;
console.log(`ground ${ground.nx} x ${ground.nz}, heights ${Math.min(...hs).toFixed(2)} .. ${Math.max(...hs).toFixed(2)} m, pond at ${ground.pondY.toFixed(2)} m -> out/ground.json`);
