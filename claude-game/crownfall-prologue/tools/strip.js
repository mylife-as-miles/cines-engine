// A contact sheet of frames:  node tools/strip.js <from> <to> <step> [out.png] [cols] [--subs] [--scene N]
const { open, flags } = require('./film'); const fs = require('fs'); const { execFileSync } = require('child_process'); const path = require('path');
(async () => {
  const args = process.argv.slice(2), pos = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] === '--scene'));
  const [a, b, s] = [+pos[0] || 0, +pos[1] || 30, +pos[2] || 3]; const out = pos[3] || `out/strip_${a}_${b}.png`; const cols = +pos[4] || 4;
  const tmp = path.resolve(path.dirname(path.resolve(out)), 'strip_tmp_' + process.pid); fs.mkdirSync(tmp, { recursive: true });
  const { browser, page, errs } = await open(flags(args)); let n = 0, ms = 0;
  for (let t = a; t <= b + 1e-6; t += s) {
    const r = await page.evaluate(t => { const t0 = performance.now(); FILM.renderAt(t); const ms = performance.now() - t0; return { ms, url: document.querySelector('canvas').toDataURL('image/jpeg', 0.85) }; }, t);
    ms = Math.max(ms, n ? r.ms : 0);
    fs.writeFileSync(path.join(tmp, `f${String(n++).padStart(3, '0')}.jpg`), Buffer.from(r.url.split(',')[1], 'base64'));
  }
  await browser.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(tmp, 'f%03d.jpg'), '-vf', `scale=480:-1,tile=${cols}x${Math.ceil(n / cols)}:padding=4:color=0x202020`, '-frames:v', '1', out]);
  fs.rmSync(tmp, { recursive: true, force: true });
  if (errs.length) console.log([...new Set(errs)].join('\n')); console.log(`wrote ${out} (${n} frames; slowest after the first ${ms.toFixed(0)} ms)`);
})();
