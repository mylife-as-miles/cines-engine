// Paint the arena skies and write them out:  node tools/export.js [out dir] [--only eclipse|violet]
//   out/sky-<name>.webp          the panorama the game ships (4096 x 1280, WebP quality 0.9)
//   out/sky-<name>-preview.jpg   a 1600-wide look at it
// Prints each file's size and SHA-256 for the game's provenance record.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const crypto = require('crypto'); const { execFileSync } = require('child_process');
(async () => {
  const args = process.argv.slice(2), out = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : path.join(__dirname, '../out')), only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch(); const page = await browser.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '../film/headless.html'));
  await page.waitForFunction(() => window.SKIES_READY === true);
  const names = await page.evaluate(() => SKIES.names);
  for (const name of names) {
    if (only && name !== only) continue;
    const r = await page.evaluate(name => { const t0 = performance.now(), c = SKIES.paint(name); return { ms: performance.now() - t0, w: c.width, h: c.height, webp: c.toDataURL('image/webp', 0.9), png: c.toDataURL('image/png') }; }, name);
    const file = path.join(out, `sky-${name}.webp`), bytes = Buffer.from(r.webp.split(',')[1], 'base64'); fs.writeFileSync(file, bytes);
    const png = path.join(out, `sky-${name}.png`); fs.writeFileSync(png, Buffer.from(r.png.split(',')[1], 'base64'));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-vf', 'scale=1600:-1', '-q:v', '3', path.join(out, `sky-${name}-preview.jpg`)]); fs.unlinkSync(png);
    console.log(`${path.basename(file)}  ${r.w}x${r.h}  ${bytes.length} bytes  sha256 ${crypto.createHash('sha256').update(bytes).digest('hex')}  (painted in ${(r.ms / 1000).toFixed(1)} s)`);
  }
  await browser.close(); if (errs.length) { console.log(errs.join('\n')); process.exit(1); }
})();
