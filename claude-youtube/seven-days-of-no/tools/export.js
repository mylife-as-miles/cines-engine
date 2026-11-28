// Export the video to MP4.
//   node tools/export.js [out.mp4] [--workers 3] [--from 0] [--to <s>] [--only Q02] [--scale 1] [--crf 18] [--maxrate 6M]
//                        [--audio out/vo/narration.wav] [--no-audio] [--no-join]
// Frames are rendered headless by FILM.renderAt(i/24) on the narration clock and piped as JPEG into ffmpeg (one encoder per
// worker). --no-join keeps the per-worker segments (out/export_tmp/seg_*.mp4 and the concat list segs.txt, which ffmpeg reads
// directly) so a tight disk never holds two copies of the picture; the final mix is muxed over that list later. Without it the
// segments are joined into <out> and, unless --no-audio, the soundtrack (--audio, default the narration) is muxed, padded to
// the video's length (the end screen runs past the last word).
const { open, ROOT } = require('./film');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'); const path = require('path');

const argv = process.argv.slice(2); const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const OUT = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'out/seven_days_of_no.mp4';
const WORKERS = Math.max(1, +opt('workers', 3)), SCALE = +opt('scale', 1), CRF = opt('crf', null), ONLY = opt('only', null);
const MAXRATE = opt('maxrate', null), CAP = MAXRATE ? ['-maxrate', MAXRATE, '-bufsize', String(parseFloat(MAXRATE) * 2) + MAXRATE.replace(/[0-9.]/g, '')] : [];
const AUDIO = opt('audio', path.join(ROOT, 'out/vo/narration.wav'));
const TMP = path.resolve(path.dirname(OUT), 'export_tmp'); fs.mkdirSync(TMP, { recursive: true });

async function renderRange(id, a, b) {
  const { browser, page, errs } = await open();
  const w = Math.round(1920 * SCALE / 2) * 2, h = Math.round(1080 * SCALE / 2) * 2;
  const file = path.join(TMP, `seg_${String(id).padStart(2, '0')}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-r', '24', '-i', '-', '-vf', `scale=${w}:${h}:flags=lanczos`,
    '-c:v', 'libx264', '-preset', 'medium', '-tune', 'animation', '-crf', CRF || (SCALE < 1 ? '22' : '18'), ...CAP, '-pix_fmt', 'yuv420p', '-r', '24', file]);
  ff.stderr.on('data', d => process.stderr.write(`[ffmpeg ${id}] ${d}`));
  const t0 = Date.now();
  for (let i = a; i < b; i++) {
    const url = await page.evaluate(t => { FILM.renderAt(t); return document.querySelector('canvas').toDataURL('image/jpeg', 0.94); }, i / 24 + 1e-4);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((i - a) % 240 === 0) { const done = i - a, el = (Date.now() - t0) / 1000; console.log(`worker ${id}: ${done}/${b - a} frames (${(done / Math.max(el, 1e-3)).toFixed(1)} fps)`); }
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close();
  const u = [...new Set(errs)]; if (u.length) console.log(`worker ${id} console:\n  ` + u.slice(0, 10).join('\n  '));
  return file;
}

(async () => {
  const probe = await open();
  const info = await probe.page.evaluate(() => ({ total: FILM.total, seqs: FILM.seqs.map(s => [s.id, s.start, s.end]), warnings: FILM.warnings }));
  await probe.browser.close();
  let A = +opt('from', 0), B = Math.min(info.total, +opt('to', info.total));
  if (ONLY) { const ids = ONLY.split(',').map(s => s.trim().toUpperCase().slice(0, 3)); const S = info.seqs.filter(s => ids.includes(s[0])); if (!S.length) { console.log('no sequence ' + ONLY); process.exit(2); } A = Math.min(...S.map(s => s[1])); B = Math.max(...S.map(s => s[2])); }
  const from = Math.round(A * 24), to = Math.round(B * 24);
  console.log(`video ${info.total.toFixed(2)} s, ${info.seqs.length} sequences; frames ${from}..${to} (${((to - from) / 24).toFixed(2)} s) with ${WORKERS} workers at scale ${SCALE}`);
  if (info.warnings.length) console.log('warnings:\n  ' + info.warnings.join('\n  '));
  // clear stale segments from an earlier export so the list never mixes runs
  for (const f of fs.readdirSync(TMP)) if (/^seg_\d+\.mp4$/.test(f)) fs.unlinkSync(path.join(TMP, f));
  const per = Math.ceil((to - from) / WORKERS); const jobs = [];
  for (let k = 0; k < WORKERS; k++) { const a = from + k * per, b = Math.min(to, a + per); if (a < b) jobs.push(renderRange(k, a, b)); }
  const segs = await Promise.all(jobs);
  const list = path.join(TMP, 'segs.txt'); fs.writeFileSync(list, segs.map(f => `file '${f}'`).join('\n') + '\n');
  if (argv.includes('--no-join')) { console.log(`segments kept (${segs.length}): ${list}\n  play or mux with: ffmpeg -f concat -safe 0 -i ${path.relative(process.cwd(), list)} ...`); return; }
  const video = path.join(TMP, 'video.mp4'); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);
  segs.forEach(f => fs.unlinkSync(f));
  const withAudio = !argv.includes('--no-audio') && fs.existsSync(AUDIO);
  if (withAudio) {
    // the soundtrack from the same instant as the picture, padded with silence to the picture's length
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-ss', String(from / 24), '-i', AUDIO, '-filter_complex', `[1:a]apad,atrim=0:${(to - from) / 24}[a]`, '-map', '0:v', '-map', '[a]',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT]);
    fs.unlinkSync(video);
  } else { if (!argv.includes('--no-audio')) console.log('no audio at ' + AUDIO + ': picture only'); fs.renameSync(video, OUT); }
  console.log('wrote ' + OUT);
})();
