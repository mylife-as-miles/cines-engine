// Render the film to MP4 and lay Sanguis et Terra under it.
//   node tools/export.js [out/crownfall-credits.mp4] [--workers 3] [--from 0] [--to <seconds>] [--scale 1] [--no-audio]
// Frames come from FILM.renderAt(i / 24), piped as JPEG into one ffmpeg encoder per worker, then concatenated.
const { open } = require('./film'); const { spawn, execFileSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const argv = process.argv.slice(2); const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const OUT = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'out/crownfall-credits.mp4';
const WORKERS = +opt('workers', 3), SCALE = +opt('scale', 1);
const TMP = path.resolve(path.dirname(OUT), 'export_tmp'); fs.mkdirSync(TMP, { recursive: true });
async function renderRange(id, a, b) {
  const { browser, page, errs } = await open();
  const w = Math.round(1920 * SCALE / 2) * 2, h = Math.round(1080 * SCALE / 2) * 2, file = path.join(TMP, `seg_${String(id).padStart(2, '0')}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-r', '24', '-i', '-', '-vf', `scale=${w}:${h}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'medium', '-crf', SCALE < 1 ? '21' : '17', '-tune', 'grain', '-pix_fmt', 'yuv420p', '-r', '24', file]);
  ff.stderr.on('data', d => process.stderr.write(`[ffmpeg ${id}] ${d}`)); const t0 = Date.now();
  for (let i = a; i < b; i++) {
    const url = await page.evaluate(t => { FILM.renderAt(t); return document.querySelector('canvas').toDataURL('image/jpeg', 0.94); }, i / 24 + 1e-4);
    if (!ff.stdin.write(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if ((i - a) % 480 === 0) console.log(`worker ${id}: ${i - a}/${b - a} frames (${((i - a) / Math.max((Date.now() - t0) / 1000, 1e-3)).toFixed(1)} fps)`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close();
  const u = [...new Set(errs)]; if (u.length) console.log(`worker ${id} console:\n  ` + u.slice(0, 10).join('\n  '));
  return file;
}
(async () => {
  const probe = await open(); const total = await probe.page.evaluate(() => FILM.total); await probe.browser.close();
  const from = Math.round(+opt('from', 0) * 24), to = Math.round(Math.min(total, +opt('to', total)) * 24);
  console.log(`film ${total.toFixed(2)} s; frames ${from}..${to} with ${WORKERS} workers at scale ${SCALE}`);
  const per = Math.ceil((to - from) / WORKERS), jobs = [];
  for (let k = 0; k < WORKERS; k++) { const a = from + k * per, b = Math.min(to, a + per); if (a < b) jobs.push(renderRange(k, a, b)); }
  const segs = await Promise.all(jobs); const list = path.join(TMP, 'segs.txt'); fs.writeFileSync(list, segs.map(f => `file '${f}'`).join('\n'));
  const video = path.join(TMP, 'video.mp4'); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);
  if (!argv.includes('--no-audio')) {
    const music = path.resolve(__dirname, '../audio/sanguis-et-terra.mp3'), ss = (from / 24).toFixed(3), dur = ((to - from) / 24).toFixed(3);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-ss', ss, '-t', dur, '-i', music, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', OUT]);
  } else fs.copyFileSync(video, OUT);
  console.log('wrote ' + OUT);
})();
