// A contact sheet of frames:  node tools/strip.js <from> <to> <step> [out.png] [cols]
const { open } = require('./film'); const fs = require('fs'); const { execFileSync } = require('child_process'); const path = require('path');
(async () => {
  const [a, b, s] = [+process.argv[2] || 0, +process.argv[3] || 30, +process.argv[4] || 3]; const out = process.argv[5] || `out/strip_${a}_${b}.png`; const cols = +process.argv[6] || 4;
  const tmp = path.resolve('out/strip_tmp'); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  const { browser, page, errs } = await open(); let n = 0;
  for (let t = a; t <= b + 1e-6; t += s) {
    const url = await page.evaluate(t => { FILM.renderAt(t); return document.querySelector('canvas').toDataURL('image/jpeg', 0.85); }, t);
    fs.writeFileSync(path.join(tmp, `f${String(n++).padStart(3, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await browser.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(tmp, 'f%03d.jpg'), '-vf', `scale=480:-1,tile=${cols}x${Math.ceil(n / cols)}:padding=4:color=0x202020`, '-frames:v', '1', out]);
  if (errs.length) console.log([...new Set(errs)].join('\n')); console.log(`wrote ${out} (${n} frames)`);
})();
