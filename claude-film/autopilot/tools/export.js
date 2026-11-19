// Export the film to MP4 with the engine's development soundtrack (the final mix is muxed over the picture: see audio/README.md).
//   node tools/export.js [out.mp4] [--workers 3] [--from 0] [--to <seconds>] [--scale 1] [--only Q01,Q02] [--no-audio]
// Frames are rendered headless by FILM.renderAt(i/24) and piped as JPEG into ffmpeg (one encoder per worker, then concatenated).
// Audio is rendered per sequence by OfflineAudioContext at 48 kHz, concatenated, and muxed.
const { open } = require('./film');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'); const path = require('path');

const argv = process.argv.slice(2); const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const OUT = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'out/autopilot.mp4';
const WORKERS = +opt('workers', 3), SCALE = +opt('scale', 1), ONLY = opt('only', null);
const TMP = path.resolve(path.dirname(OUT), 'export_tmp'); fs.mkdirSync(TMP, { recursive: true });

async function renderRange(id, a, b, total) {
  const { browser, page, errs } = await open(ONLY);
  const w = Math.round(1920 * SCALE / 2) * 2, h = Math.round(1080 * SCALE / 2) * 2;
  const file = path.join(TMP, `seg_${String(id).padStart(2, '0')}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-r', '24', '-i', '-', '-vf', `scale=${w}:${h}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'medium', '-crf', SCALE < 1 ? '22' : '18', '-pix_fmt', 'yuv420p', '-r', '24', file]);
  ff.stderr.on('data', d => process.stderr.write(`[ffmpeg ${id}] ${d}`));
  const t0 = Date.now();
  for (let i = a; i < b; i++) {
    const url = await page.evaluate(t => { FILM.renderAt(t); return document.querySelector('canvas').toDataURL('image/jpeg', 0.93); }, i / 24 + 1e-4);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((i - a) % 240 === 0) { const done = i - a, el = (Date.now() - t0) / 1000; console.log(`worker ${id}: ${done}/${b - a} frames (${(done / Math.max(el, 1e-3)).toFixed(1)} fps)`); }
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close();
  const u = [...new Set(errs)]; if (u.length) console.log(`worker ${id} console:\n  ` + u.slice(0, 10).join('\n  '));
  return file;
}

async function renderAudio() {
  const { browser, page } = await open(ONLY);
  const n = await page.evaluate(() => FILM.seqs.length); const files = [];
  for (let i = 0; i < n; i++) {
    const b64 = await page.evaluate(i => FILM.wav(i, 48000), i);
    const f = path.join(TMP, `aud_${String(i).padStart(2, '0')}.wav`); fs.writeFileSync(f, Buffer.from(b64, 'base64')); files.push(f);
    console.log('audio ' + (i + 1) + '/' + n);
  }
  await browser.close();
  const list = path.join(TMP, 'aud.txt'); fs.writeFileSync(list, files.map(f => `file '${f}'`).join('\n'));
  const wav = path.join(TMP, 'soundtrack.wav'); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', wav]);
  return wav;
}

(async () => {
  const probe = await open(ONLY); const total = await probe.page.evaluate(() => FILM.total); const seqs = await probe.page.evaluate(() => FILM.seqs.map(s => [s.id, s.start, s.dur])); await probe.browser.close();
  const from = Math.round(+opt('from', 0) * 24), to = Math.round(Math.min(total, +opt('to', total)) * 24);
  console.log(`film ${total.toFixed(2)} s, ${seqs.length} sequences; frames ${from}..${to} with ${WORKERS} workers at scale ${SCALE}`);
  const per = Math.ceil((to - from) / WORKERS); const jobs = [];
  for (let k = 0; k < WORKERS; k++) { const a = from + k * per, b = Math.min(to, a + per); if (a < b) jobs.push(renderRange(k, a, b, total)); }
  const audioP = (from === 0 && to === Math.round(total * 24) && !argv.includes('--no-audio')) ? renderAudio() : Promise.resolve(null);   // --no-audio: picture only (the final mix is muxed over it)
  const segs = await Promise.all(jobs); const wav = await audioP;
  const list = path.join(TMP, 'segs.txt'); fs.writeFileSync(list, segs.map(f => `file '${f}'`).join('\n'));
  const video = path.join(TMP, 'video.mp4'); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);
  if (wav) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT]);
  else fs.copyFileSync(video, OUT);
  console.log('wrote ' + OUT);
})();
