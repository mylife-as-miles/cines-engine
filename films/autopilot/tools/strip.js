// Contact sheet of a sequence: node tools/strip.js Q01 [stepSeconds=1] [out.png] [cols=6]
// Prints per-frame render times and any warnings. Times are sequence-local.
const { open } = require('./film');
(async () => {
  const [id, step = '1', out, cols = '6'] = process.argv.slice(2);
  const { browser, page, errs } = await open(id);
  const res = await page.evaluate(async ({ step, cols }) => {
    const seq = FILM.seqs[0]; if (!seq) return { error: 'no sequence loaded' };
    const times = []; for (let t = 0; t < seq.dur; t += step) times.push(+t.toFixed(3)); if (seq.dur - times[times.length - 1] > step * 0.5) times.push(+(seq.dur - 0.05).toFixed(3));
    const tw = 480, th = 270, C = cols, R = Math.ceil(times.length / C);
    const sheet = document.createElement('canvas'); sheet.width = C * tw; sheet.height = R * (th + 26); const g = sheet.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, sheet.width, sheet.height);
    const ms = []; const src = document.querySelector('canvas');
    for (let i = 0; i < times.length; i++) {
      const t0 = performance.now(); FILM.renderAt(times[i]); src.getContext('2d').getImageData(0, 0, 1, 1); ms.push(performance.now() - t0);   // the 1-pixel read makes Chrome finish the frame, so the time is the frame's own
      const x = (i % C) * tw, y = Math.floor(i / C) * (th + 26); g.drawImage(src, x, y, tw, th);
      g.fillStyle = '#ddd'; g.font = '16px monospace'; const sh = seq.shots.filter(s => s.at <= times[i]).pop();
      g.fillText(times[i].toFixed(2) + 's  ' + (sh && sh.name || ''), x + 6, y + th + 18);
    }
    return { url: sheet.toDataURL('image/png'), ms, times, dur: seq.dur, title: seq.title, shots: seq.shots.map(s => [s.at, s.name]), lines: seq.lines.length, warnings: FILM.warnings || [] };
  }, { step: +step, cols: +cols });
  if (res.error) { console.log(res.error); errs.forEach(e => console.log(e)); await browser.close(); process.exit(2); }
  const fs = require('fs'); const file = out || `out/strip_${id}.png`;
  fs.writeFileSync(file, Buffer.from(res.url.split(',')[1], 'base64'));
  const avg = res.ms.reduce((a, b) => a + b, 0) / res.ms.length, mx = Math.max(...res.ms);
  console.log(`${id} "${res.title}" ${res.dur}s, ${res.shots.length} shots, ${res.lines} lines -> ${file}`);
  console.log(`render ms: avg ${avg.toFixed(1)}, max ${mx.toFixed(1)} (first frame includes setup)`);
  if (res.warnings.length) console.log('warnings:\n  ' + res.warnings.join('\n  '));
  const uniq = [...new Set(errs)]; if (uniq.length) console.log('console:\n  ' + uniq.slice(0, 20).join('\n  '));
  await browser.close();
})();
