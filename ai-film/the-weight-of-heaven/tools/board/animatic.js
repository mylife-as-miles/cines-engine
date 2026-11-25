// Animatic from a board spec: node animatic.js <shots.json> <out.mp4> [lead-in.mp4 lead-in-seconds]
// (Copied from My Name Is Oren. Added for The Weight of Heaven: "stateTo" moves the set within a shot (numbers in the
// state are eased from "state" to "stateTo" between stateStart and stateEnd, as fractions of the shot); "black": true
// is a card over black; spec.audio (a WAV path) replaces the silent track, e.g. a click on the song's bars.)
// Each shot is held for its length at 24 fps; "move" animates the camera (e.g. a dolly-in to "move.to"), "handheld"
// adds a small drift (metres); "lines" are subtitles [{t0, t1, text}] in seconds from the shot's start.
// An optional lead-in clip (e.g. the end of the previous sequence) plays first, so the join can be judged.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const [, , shotsFile, outFile, leadIn, leadSecs] = process.argv;
const spec = JSON.parse(fs.readFileSync(shotsFile, 'utf8'));
const FPS = 24, root = __dirname;
const frameDir = fs.mkdtempSync(path.join(os.tmpdir(), 'animatic-'));
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html' : 'text/javascript' });
  fs.createReadStream(p).pipe(res);
});
const dur = s => { const m = s.time.match(/([\d.]+)\D+([\d.]+)/); return +m[2] - +m[1]; };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/board.html`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
  let n = 0;
  let t0 = 0;
  for (const s of spec.shots) {
    s.t0 = t0; t0 += dur(s);
    const frames = Math.round(dur(s) * FPS);
    for (let i = 0; i < frames; i++) {
      const t = i / FPS, u = frames > 1 ? i / (frames - 1) : 0;
      const jpg = await page.evaluate(async ({ s, t, u, title }) => {
        const ease = x => x * x * (3 - 2 * x);
        const lerp = (a, b, k) => a.map((v, j) => v + (b[j] - v) * k);
        if (s.black) {
          const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
          const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 1280, 720);
          g.fillStyle = 'rgba(245,197,66,0.9)'; g.font = 'bold 18px sans-serif'; g.fillText(`${title} · ${s.camText}`, 14, 26);
          if (s.card) { g.font = 'italic 28px serif'; g.fillStyle = '#bbb'; g.textAlign = 'center'; g.fillText(s.card, 640, 372); }
          return c.toDataURL('image/jpeg', 0.92);
        }
        let st = JSON.parse(JSON.stringify(s.state || {}));
        if (s.stateTo) {
          const k2 = ease(Math.min(1, Math.max(0, (u - (s.stateStart ?? 0)) / ((s.stateEnd ?? 1) - (s.stateStart ?? 0)))));
          for (const [key, v] of Object.entries(s.stateTo)) if (typeof v === 'number') st[key] = (st[key] ?? 0) + (v - (st[key] ?? 0)) * k2;
        }
        let cam = JSON.parse(JSON.stringify(s.cam));
        if (s.move && s.move.to) {
          const k = ease(Math.min(1, Math.max(0, (u - (s.move.start ?? 0)) / ((s.move.end ?? 1) - (s.move.start ?? 0)))));
          cam.pos = lerp(s.cam.pos, s.move.to.pos, k); cam.target = lerp(s.cam.target, s.move.to.target, k);
        }
        if (s.handheld) {                       // slow, breathing drift: a few sines, no jitter
          const a = s.handheld, w = (f, p) => Math.sin(t * f * 2 * Math.PI + p);
          cam.pos = [cam.pos[0] + a * (0.6 * w(0.23, 0) + 0.4 * w(0.61, 1)), cam.pos[1] + a * (0.5 * w(0.31, 2) + 0.3 * w(0.83, 3)), cam.pos[2] + a * 0.4 * w(0.19, 4)];
          cam.target = [cam.target[0] + a * 0.5 * w(0.27, 5), cam.target[1] + a * 0.4 * w(0.37, 6), cam.target[2]];
        }
        const load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = src; });
        window.setState(st); window.setTime(s.t0 + t); const im = await load(window.renderShot(cam));
        const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
        const g = c.getContext('2d'); g.drawImage(im, 0, 0);
        const band = 1280 / 2.35, bar = (720 - band) / 2;
        g.fillStyle = '#000'; g.fillRect(0, 0, 1280, bar); g.fillRect(0, 720 - bar, 1280, bar);   // the 2.35:1 matte, as the film will be
        g.fillStyle = 'rgba(245,197,66,0.9)'; g.font = 'bold 18px sans-serif';
        g.fillText(`${title} · SHOT ${s.n} · ${s.camText}`, 14, 26);
        const line = (s.lines || []).find(l => t >= l.t0 && t < l.t1);
        if (line) {
          g.font = 'italic 30px serif'; g.textAlign = 'center';
          g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(line.text, 640, 720 - bar + 46);
          g.fillStyle = '#fff'; g.fillText(line.text, 640, 720 - bar + 46);
        }
        return c.toDataURL('image/jpeg', 0.92);
      }, { s, t, u, title: spec.title });
      fs.writeFileSync(path.join(frameDir, `f${String(n++).padStart(5, '0')}.jpg`), Buffer.from(jpg.split(',')[1], 'base64'));
    }
    console.log(`shot ${s.n}: ${frames} frames`);
  }
  await browser.close(); server.close();
  const body = path.join(frameDir, 'body.mp4');
  const audioIn = spec.audio ? ['-i', spec.audio] : ['-f', 'lavfi', '-t', String(n / FPS), '-i', 'anullsrc=r=48000:cl=stereo'];
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(frameDir, 'f%05d.jpg'),
    ...audioIn, '-t', String(n / FPS),
    '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', '-c:a', 'aac', body]);
  if (leadIn) {
    const lead = path.join(frameDir, 'lead.mp4');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-sseof', `-${leadSecs || 3}`, '-i', leadIn, '-vf',
      'scale=1280:720,setsar=1,fps=24,drawbox=x=0:y=0:w=1280:h=87:color=black:t=fill,drawbox=x=0:y=633:w=1280:h=87:color=black:t=fill',
      '-af', 'aresample=48000', '-ac', '2', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', lead]);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', lead, '-i', body, '-filter_complex',
      '[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]', '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18',
      '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', outFile]);
  } else fs.copyFileSync(body, outFile);
  fs.rmSync(frameDir, { recursive: true, force: true });
  console.log('wrote', outFile);
})().catch(e => { console.error(e); process.exit(1); });
