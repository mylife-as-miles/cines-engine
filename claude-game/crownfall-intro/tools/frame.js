// One frame:  node tools/frame.js <seconds> [out.png] [--subs] [--scene N]   (prints how long the frame took to draw)
const { open, flags } = require('./film'); const fs = require('fs'); const path = require('path');
(async () => {
  const args = process.argv.slice(2), t = +args[0] || 0, out = args[1] && !args[1].startsWith('--') ? args[1] : `out/frame_${t}.png`;
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const { browser, page, errs } = await open(flags(args));
  const r = await page.evaluate(t => { const t0 = performance.now(); FILM.renderAt(t); const ms = performance.now() - t0; return { ms, url: document.querySelector('canvas').toDataURL('image/png') }; }, t);
  fs.writeFileSync(out, Buffer.from(r.url.split(',')[1], 'base64')); await browser.close();
  if (errs.length) console.log([...new Set(errs)].join('\n')); console.log(`wrote ${out} (${r.ms.toFixed(0)} ms, first draw)`);
})();
