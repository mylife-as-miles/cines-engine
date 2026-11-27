#!/usr/bin/env node
// Render the story type (gfx/type.html).
//   node gfx/type_render.js still <mode> <t> <out.png> [--look A] [--bg plate.jpg]
//   node gfx/type_render.js seq <mode> <seconds> <out.mov|out.mp4> [--look A] [--bg plate.jpg] [--fps 24]
//   node gfx/type_render.js board <out.png>          three looks x three moments over the film's plates
// A .mov keeps the alpha (QuickTime RLE) to lay over a plate; with --bg the plate is drawn underneath (previews).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) { opt[argv[i].slice(2)] = argv[i + 1]; argv.splice(i, 2); i--; }
const ROOT = path.resolve(__dirname, '..'), PAGE = opt.page ? path.resolve(opt.page) : path.join(__dirname, 'type.html');
const url = f => f ? 'file://' + path.resolve(f) : null;

(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto('file://' + PAGE);
  await p.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  const frame = async (mode, t, look, bg) => {
    await p.evaluate(async ([l, b]) => { window.LOOK = l; await window.setBG(b); }, [look || 'A', url(bg)]);
    const data = await p.evaluate(([m, t]) => { window.draw(m, t); return document.getElementById('c').toDataURL('image/png'); }, [mode, t]);
    return Buffer.from(data.split(',')[1], 'base64');
  };
  const [cmd, ...rest] = argv;
  if (cmd === 'still') {
    const [mode, t, out] = rest; fs.writeFileSync(out, await frame(mode, +t, opt.look, opt.bg)); console.log('wrote', out);
  } else if (cmd === 'seq') {
    const [mode, secs, out] = rest, fps = +(opt.fps || 24), n = Math.round(+secs * fps), alpha = out.endsWith('.mov');
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'png', '-r', String(fps), '-i', '-',
      ...(alpha ? ['-c:v', 'qtrle'] : ['-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709']), out],
      { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < n; i++) { const b = await frame(mode, i / fps, opt.look, opt.bg); if (!ff.stdin.write(b)) await new Promise(r => ff.stdin.once('drain', r)); }
    ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log(mode, n, 'frames ->', out);
  } else if (cmd === 'cam') {          // the plate move of a moment, per frame, for gfx/plate_type.py
    const [mode, secs, out] = rest, fps = +(opt.fps || 24), n = Math.round(+secs * fps);
    const cams = await p.evaluate(([m, n, fps]) => Array.from({ length: n }, (_, i) => window.plateCam ? window.plateCam(m, i / fps) : null), [mode, n, fps]);
    fs.writeFileSync(out, JSON.stringify(cams)); console.log('cam', n, '->', out);
  } else if (cmd === 'board') {
    const [out] = rest, tmp = fs.mkdtempSync('/tmp/typeboard-');
    const moments = [['place_2014', 3, 'frames/graded/checkin_hall/wide.jpg'], ['yes', 6, 'frames/graded/void_stage/bags.jpg'],
      ['death_2017', 3, 'frames/graded/void_stage/dawn_high.jpg']];
    const tiles = [];
    for (const look of ['A', 'B', 'C']) for (const [m, t, bg] of moments) {
      const f = path.join(tmp, `${look}_${m}.png`); fs.writeFileSync(f, await frame(m, t, look, path.join(ROOT, bg))); tiles.push(f);
    }
    const inputs = tiles.flatMap(f => ['-i', f]), n = tiles.length;
    const sc = tiles.map((_, i) => `[${i}]scale=960:540[s${i}]`).join(';');
    const layout = tiles.map((_, i) => `${(i % 3) * 960}_${Math.floor(i / 3) * 540}`).join('|');
    execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', `${sc};${tiles.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${n}:layout=${layout}`, out]);
    console.log('board ->', out, '(rows: looks A, B, C; columns: 2014 / CHINA, YES, DEATH SENTENCE / 2017)');
  }
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  await browser.close();
})();
