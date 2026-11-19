#!/usr/bin/env node
// Renders a graphics page frame by frame with headless Chromium (Playwright) and pipes the frames to ffmpeg.
//
// The page contract (see assets/gfx_template.html):
//   <canvas id="c" width=W height=H>, window.draw(mode, t) draws the frame for `mode` at `t` seconds,
//   window.READY = true once fonts and images have loaded. Optional window.PLAN is set from --plan <json>.
//
// Usage:
//   node canvas_render.js <page.html> stills <out_dir> <mode:t> [<mode:t> ...]      PNG stills, for review
//   node canvas_render.js <page.html> seq <mode> <t0> <t1> <out.mov|out.mp4>          a sequence
// Options: --fps 24  --plan plan.json  --size 1920x1080
// A .mov output keeps the alpha (QuickTime RLE, for overlaying); .mp4 is opaque H.264 (CRF 14).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');

const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) { opt[argv[i].slice(2)] = argv[i + 1]; argv.splice(i, 2); i--; }
const [page, cmd, ...rest] = argv;
if (!page || !['stills', 'seq'].includes(cmd)) { console.error(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 14).join('\n')); process.exit(1); }
const fps = +(opt.fps || 24), [W, H] = (opt.size || '1920x1080').split('x').map(Number);

(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto('file://' + path.resolve(page));
  await p.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  if (opt.plan) await p.evaluate(plan => { window.PLAN = plan; }, JSON.parse(fs.readFileSync(opt.plan, 'utf8')));
  const shot = async (mode, t) => Buffer.from((await p.evaluate(([m, t]) => { window.draw(m, t); return document.getElementById('c').toDataURL('image/png'); }, [mode, t])).split(',')[1], 'base64');

  if (cmd === 'stills') {
    const [outDir, ...specs] = rest; fs.mkdirSync(outDir, { recursive: true });
    for (const s of specs) { const [m, t] = s.split(':'); fs.writeFileSync(path.join(outDir, `${m}_${t}.png`), await shot(m, +t)); }
    console.log(specs.length, 'stills ->', outDir);
  } else {
    const [mode, t0, t1, out] = rest, alpha = out.endsWith('.mov'), n = Math.round((+t1 - +t0) * fps);
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'png', '-r', String(fps), '-i', '-',
      ...(alpha ? ['-c:v', 'qtrle'] : ['-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p']), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < n; i++) { const buf = await shot(mode, +t0 + i / fps); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); }
    ff.stdin.end(); const code = await new Promise(r => ff.on('close', r));
    console.log(mode, n, 'frames ->', out, code ? `(ffmpeg exited ${code})` : '');
  }
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  await browser.close();
})();
