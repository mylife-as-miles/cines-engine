// Render every demo of a set (or of the character rig: node tools/set.js rig): node tools/set.js kitchen [timeOffsetInDemo=1] [out.png]
// Each demo gets 4 s; the sheet shows each demo at the given offset plus its render time.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const [name, off = '1', out] = process.argv.slice(2);
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/willReadFrequently/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../film/settest.html') + '?set=' + name);
  await page.waitForFunction(() => window.FILM_READY === true, null, { timeout: 60000 });
  const res = await page.evaluate(off => {
    const seq = FILM.seqs[0]; if (!seq) return { error: 'no demos' };
    const tw = 960, th = 540, C = 2, n = seq.shots.length, R = Math.ceil(n / C); const sheet = document.createElement('canvas'); sheet.width = C * tw; sheet.height = R * (th + 30);
    const g = sheet.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, sheet.width, sheet.height); const ms = [];
    seq.shots.forEach((s, i) => { const cv = document.querySelector('canvas'); FILM.renderAt(s.at + off); cv.getContext('2d').getImageData(0, 0, 1, 1); const t0 = performance.now(); FILM.renderAt(s.at + off + 1 / 24); cv.getContext('2d').getImageData(0, 0, 1, 1); ms.push(performance.now() - t0); const x = (i % C) * tw, y = Math.floor(i / C) * (th + 30); g.drawImage(document.querySelector('canvas'), x, y, tw, th); g.fillStyle = '#ddd'; g.font = '18px monospace'; g.fillText(s.name + '  ' + ms[i].toFixed(0) + ' ms', x + 8, y + th + 21); });
    return { url: sheet.toDataURL('image/png'), names: seq.shots.map(s => s.name), ms, warnings: FILM.warnings || [] };
  }, +off);
  if (res.error) { console.log(res.error); console.log(errs.join('\n')); await browser.close(); process.exit(2); }
  const file = out || `out/set_${name}.png`; fs.writeFileSync(file, Buffer.from(res.url.split(',')[1], 'base64'));
  console.log(`${name}: ${res.names.length} demos -> ${file}`); res.names.forEach((n, i) => console.log(`  ${n}: ${res.ms[i].toFixed(0)} ms/frame`));
  if (res.warnings.length) console.log('warnings: ' + res.warnings.join('; ')); const u = [...new Set(errs)]; if (u.length) console.log(u.slice(0, 20).join('\n'));
  await browser.close();
})();
