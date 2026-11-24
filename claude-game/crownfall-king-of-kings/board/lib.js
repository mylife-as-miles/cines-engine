// Shared by render.js, animatic.js and proof.js: serve the board folder, open board.html in headless Chromium
// (SwiftShader WebGL, no GPU needed), read spec files.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = __dirname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain' };

function serve(root = ROOT) {
  const server = http.createServer((req, res) => {
    const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

async function openBoard(o = {}) {
  const server = o.server ?? await serve();
  const browser = o.browser ?? await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => console.error('page error:', e.message));
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|GL Driver Message/.test(m.text())) console.error('page:', m.text()); });
  const qs = []; if (o.msaa !== undefined) qs.push(`msaa=${o.msaa}`); if (o.shadow) qs.push(`shadow=${o.shadow}`);
  const q = qs.length ? '?' + qs.join('&') : '';
  await page.goto(`http://127.0.0.1:${server.address().port}/board.html${q}`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
  return { server, browser, page, async close() { await page.close(); if (!o.browser) await browser.close(); if (!o.server) server.close(); } };
}

// a spec: {title, scene?, shots:[...]} — several specs join in order
// (also the shot list's skeleton: {scenes: [{n, slug, shots: [{id, set_hint, …}]}]})
function readSpecs(files) {
  return files.map(f => {
    const spec = JSON.parse(fs.readFileSync(f, 'utf8'));
    spec._file = f;
    const raw = spec.shots ?? (spec.scenes ?? []).flatMap(sc => sc.shots ?? []);
    spec.shots = raw.map(s => ({ ...s, n: s.n ?? s.id, scene: s.scene ?? s.set ?? s.set_hint ?? spec.scene }));
    return spec;
  });
}
function shotDur(s) {
  if (typeof s.dur === 'number') return s.dur;
  const m = String(s.time ?? '').match(/([\d.]+)\D+([\d.]+)/);
  return m ? +m[2] - +m[1] : 4;
}
function args(argv) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const nx = argv[i + 1]; if (nx === undefined || nx.startsWith('--')) opt[k] = true; else { opt[k] = nx; i++; } }
    else pos.push(a);
  }
  return { pos, opt };
}
const dataToBuf = (url) => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');

module.exports = { ROOT, serve, openBoard, readSpecs, shotDur, args, dataToBuf };
