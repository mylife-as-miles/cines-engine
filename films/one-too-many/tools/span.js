// Contact sheet across the whole film in global time: node tools/span.js <from> <to> <step> [out.png] [cols=6]
//   node tools/span.js 0 900 6 out/film_overview.png        the whole film every 6 s
//   node tools/span.js bounds 3 0.5 out/film_bounds.png     every sequence boundary, 3 s either side every 0.5 s
const { open } = require('./film'); const fs = require('fs');
(async () => {
  const [a, b, step = '1', out = 'out/span.png', cols = '6'] = process.argv.slice(2);
  const { browser, page, errs } = await open(null);
  const res = await page.evaluate(async ({ a, b, step, cols }) => {
    let times = [];
    if (a === 'bounds') { const w = +b; FILM.seqs.slice(1).forEach(s => { for (let t = s.start - w; t < s.start + w - 1e-6; t += step) times.push(+t.toFixed(3)); times.push(null); }); }
    else for (let t = +a; t < Math.min(+b, FILM.total); t += step) times.push(+t.toFixed(3));
    const tw = 384, th = 216, C = cols, n = times.length, R = Math.ceil(n / C);
    const sheet = document.createElement('canvas'); sheet.width = C * tw; sheet.height = R * (th + 22); const g = sheet.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, sheet.width, sheet.height);
    const src = document.querySelector('canvas'); let ms = 0, k = 0;
    times.forEach((t, i) => { const x = (i % C) * tw, y = Math.floor(i / C) * (th + 22); if (t == null) { g.fillStyle = '#331'; g.fillRect(x, y, tw, th); return; }
      const t0 = performance.now(); FILM.renderAt(t); ms += performance.now() - t0; k++; g.drawImage(src, x, y, tw, th);
      const s = FILM.find(t); g.fillStyle = '#ddd'; g.font = '14px monospace'; const m = Math.floor(t / 60), sec = (t % 60).toFixed(1).padStart(4, '0');
      g.fillText(`${m}:${sec} ${s.id} ${(t - s.start).toFixed(1)}`, x + 4, y + th + 16); });
    return { url: sheet.toDataURL('image/jpeg', 0.85), n: k, ms: ms / Math.max(1, k), total: FILM.total, bounds: FILM.seqs.map(s => [s.id, +s.start.toFixed(2)]) };
  }, { a, b: +b || b, step: +step, cols: +cols });
  fs.writeFileSync(out, Buffer.from(res.url.split(',')[1], 'base64'));
  console.log(`${res.n} frames -> ${out}; avg ${res.ms.toFixed(1)} ms; total ${res.total.toFixed(1)} s`); console.log('starts: ' + res.bounds.map(x => x.join('@')).join(' '));
  const u = [...new Set(errs)]; if (u.length) console.log(u.slice(0, 10).join('\n'));
  await browser.close();
})();
