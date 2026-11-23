// Render a blocking storyboard: node render.js <shots.json> <out-dir>
// Serves board.html locally, renders each shot's camera in headless Chromium (WebGL), adds the 2.35:1 frame lines and a
// caption, and writes one PNG per shot plus a contact sheet (board.png).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const [, , shotsFile, outDir] = process.argv;
const spec = JSON.parse(fs.readFileSync(shotsFile, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const root = __dirname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/board.html`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });

  const frames = [];
  for (const [i, s] of spec.shots.entries()) {
    const url = await page.evaluate(async ({ s, title }) => {
      const load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = src; });
      const main = await load((window.setState(s.state), window.setTime(s.boardTime ?? 4), window.renderShot(s.cam)));
      const inset = s.inset ? await load(window.renderShot(s.inset)) : null;
      const c = document.createElement('canvas'); c.width = 1280; c.height = 720 + 96;
      const g = c.getContext('2d');
      g.fillStyle = '#141414'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(main, 0, 0);
      const band = 1280 / 2.35, bar = (720 - band) / 2;               // the 2.35:1 matte
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, 1280, bar); g.fillRect(0, 720 - bar, 1280, bar);
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1; g.strokeRect(0.5, bar, 1279, band);
      if (inset) {
        const w = 352, h = 198, x = 1280 - w - 16, y = bar + 12;
        g.drawImage(inset, x, y, w, h); g.strokeStyle = '#f5c542'; g.lineWidth = 3; g.strokeRect(x, y, w, h);
        g.fillStyle = '#f5c542'; g.font = 'bold 16px sans-serif'; g.fillText(s.insetLabel || 'end of move', x + 8, y + h - 10);
      }
      g.fillStyle = '#f5c542'; g.font = 'bold 22px sans-serif';
      g.fillText(`${title} · SHOT ${s.n} · ${s.time}`, 16, 30);
      g.fillStyle = '#ffffff'; g.font = '18px sans-serif'; g.fillText(s.camText, 16, bar - 14 > 40 ? bar - 14 : 56);
      g.font = 'italic 20px serif'; g.fillStyle = '#ffffff';
      const words = (s.line || '').split(' '); let line = '', y2 = 720 + 34;
      for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > 1240) { g.fillText(line, 16, y2); y2 += 26; line = w; } else line = t; }
      if (line) g.fillText(line, 16, y2);
      if (s.note) { g.font = '15px sans-serif'; g.fillStyle = '#9fd3ff'; g.fillText(s.note, 16, 720 + 86); }
      return c.toDataURL('image/png');
    }, { s, title: spec.title });
    const file = path.join(outDir, `shot${String(s.n).padStart(2, '0')}.png`);
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    frames.push(file); console.log('wrote', file);
  }
  // contact sheet: 3 across
  const sheet = await page.evaluate(async (srcs) => {
    const load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = src; });
    const ims = await Promise.all(srcs.map(load));
    const cw = 640, ch = Math.round(cw * ims[0].height / ims[0].width), cols = 3, rows = Math.ceil(ims.length / cols);
    const c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch;
    const g = c.getContext('2d'); g.fillStyle = '#141414'; g.fillRect(0, 0, c.width, c.height);
    ims.forEach((im, i) => g.drawImage(im, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch));
    return c.toDataURL('image/jpeg', 0.9);
  }, frames.map(f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')));
  fs.writeFileSync(path.join(outDir, 'board.jpg'), Buffer.from(sheet.split(',')[1], 'base64'));
  console.log('wrote', path.join(outDir, 'board.jpg'));
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
