// Contact sheet of a sequence: node tools/strip.js Q02 [stepSeconds=1] [out.png] [cols=6]
//   (or ALL for the whole video, or a global range "120-140"). Frames are every step seconds through the sequence's span on the
//   narration clock; each tile is labelled with its global time, sequence-local time and shot name. Prints ms per frame,
//   the placeholders still in use and any warnings (missing anchors, shots outside their sequence, draw errors).
const { open } = require('./film');
(async () => {
  const [id = 'Q01', step = '1', out, cols = '6'] = process.argv.slice(2);
  const { browser, page, errs } = await open();
  const res = await page.evaluate(async ({ id, step, cols }) => {
    let a, b, title, seq = null;
    if (/^\d+(\.\d+)?-\d+(\.\d+)?$/.test(id)) { [a, b] = id.split('-').map(Number); title = 'range ' + id; }
    else if (id.toUpperCase() === 'ALL') { a = 0; b = FILM.total; title = 'all'; }
    else { seq = FILM.seqs.find(s => s.id.toUpperCase() === id.toUpperCase().slice(0, 3)); if (!seq) return { error: 'no sequence ' + id + ' (have ' + FILM.seqs.map(s => s.id).join(', ') + ')' }; a = seq.start; b = seq.end; title = seq.title; }
    const times = []; for (let t = a; t < b - 1e-6; t += step) times.push(+t.toFixed(3)); if (b - times[times.length - 1] > step * 0.5) times.push(+(b - 0.05).toFixed(3));
    const tw = 480, th = 270, C = cols, R = Math.ceil(times.length / C), lab = 44;
    const sheet = document.createElement('canvas'); sheet.width = C * tw; sheet.height = R * (th + lab); const g = sheet.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, sheet.width, sheet.height);
    const ms = []; const src = document.querySelector('canvas');
    for (let i = 0; i < times.length; i++) {
      const t0 = performance.now(); FILM.renderAt(times[i]); src.getContext('2d').getImageData(0, 0, 1, 1); ms.push(performance.now() - t0);   // the 1-pixel read makes Chrome finish the frame
      const x = (i % C) * tw, y = Math.floor(i / C) * (th + lab); g.drawImage(src, x, y, tw, th);
      const sh = FILM.shotAt(times[i]); const w = FILM.wordAt(times[i]);
      g.fillStyle = '#ddd'; g.font = '15px monospace';
      g.fillText(`${times[i].toFixed(2)}s  (${sh.seq.id} +${(times[i] - sh.seq.start).toFixed(2)})  ${w ? '"' + w.w + '"' : ''}`, x + 6, y + th + 17);
      g.fillStyle = '#9ad'; g.fillText((sh.name || '').slice(0, 52), x + 6, y + th + 36);
    }
    const shots = seq ? seq.shots.map(s => [+s.at.toFixed(2), s.name, s.in ? (s.in.type || s.in) : 'cut']) : [];
    return { url: sheet.toDataURL('image/png'), ms, times, a, b, title, shots, placeholders: ART.report(), warnings: FILM.warnings || [] };
  }, { id, step: +step, cols: +cols });
  if (res.error) { console.log(res.error); errs.forEach(e => console.log(e)); await browser.close(); process.exit(2); }
  const fs = require('fs'); const file = out || `out/strip_${id}.png`;
  fs.writeFileSync(file, Buffer.from(res.url.split(',')[1], 'base64'));
  const avg = res.ms.reduce((x, y) => x + y, 0) / res.ms.length, mx = Math.max(...res.ms);
  console.log(`${id} "${res.title}" ${res.a.toFixed(2)}-${res.b.toFixed(2)} s (${(res.b - res.a).toFixed(2)} s), ${res.shots.length} shots, ${res.times.length} frames -> ${file}`);
  console.log(`render ms/frame: avg ${avg.toFixed(1)}, max ${mx.toFixed(1)} (the first frame includes setup and cache fills)`);
  if (res.shots.length) console.log('shots:\n  ' + res.shots.map(s => `${s[0].toFixed(2).padStart(7)}  ${String(s[2]).padEnd(5)} ${s[1]}`).join('\n  '));
  const ph = res.placeholders; if (ph.sets.length || ph.figures.length) console.log(`placeholders: sets [${ph.sets.join(', ')}], figures [${ph.figures.join(', ')}]`);
  if (res.warnings.length) console.log('warnings:\n  ' + res.warnings.join('\n  '));
  const uniq = [...new Set(errs)].filter(e => !/\[film\]/.test(e)); if (uniq.length) console.log('console:\n  ' + uniq.slice(0, 20).join('\n  '));
  await browser.close();
})();
