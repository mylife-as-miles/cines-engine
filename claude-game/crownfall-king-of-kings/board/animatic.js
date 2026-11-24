// Animatic: node animatic.js <spec.json> [more.json ...] [--out out/animatic.mp4] [--workers 3] [--msaa 4|0] [--shadow basic|pcf]
//                            [--only n,n] [--from n] [--to n] [--cache out/animatic-cache] [--no-audio] [--crf 20]
// Joins every spec's shots in order into one 24 fps MP4 (1280x720: the 2.39:1 picture in its matte, the shot caption,
// subtitles, supers, fades). Each shot is rendered to its own cached segment (keyed by the shot, the spec header and
// the engine sources), so a re-run only renders what changed; parallel headless browsers take shots from a queue, and
// joined with ffmpeg's concat demuxer. Sound: a soft pulse track made from the shots' `pulse` cues (see README);
// silence elsewhere.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');
const { serve, openBoard, readSpecs, shotDur, args, dataToBuf, ROOT } = require('./lib');

const FPS = 24;
const { pos, opt } = args(process.argv.slice(2));
if (!pos.length) { console.error('usage: node animatic.js <spec.json> [...] [--out file.mp4] [--workers N] [--msaa 4|0] [--only n,n] [--from n] [--to n]'); process.exit(2); }
const outFile = path.resolve(opt.out ?? path.join(ROOT, 'out', 'animatic.mp4'));
const cacheDir = path.resolve(opt.cache ?? path.join(ROOT, 'out', 'animatic-cache'));
const workers = Math.max(1, +(opt.workers ?? 3));
const msaa = opt.msaa !== undefined ? +opt.msaa : 4;
const crf = String(opt.crf ?? 20);
const shadow = opt.shadow ?? 'basic';                 // one-tap shadows: faster; --shadow pcf for softer edges
fs.mkdirSync(cacheDir, { recursive: true }); fs.mkdirSync(path.dirname(outFile), { recursive: true });

// the engine's version: any change to the engine or a set re-renders every shot that uses it
function engineStamp() {
  const files = ['engine.js', 'figures.js', 'compose.js', ...fs.readdirSync(path.join(ROOT, 'sets')).map(f => 'sets/' + f)];
  const h = crypto.createHash('sha1');
  for (const f of files) h.update(f + fs.readFileSync(path.join(ROOT, f)));
  return h.digest('hex').slice(0, 10);
}

(async () => {
  const specs = readSpecs(pos);
  const stamp = engineStamp();
  // the flat shot list on one clock
  let shots = [], t0 = 0;
  for (const spec of specs) for (const s of spec.shots) {
    const dur = shotDur(s), frames = Math.max(1, Math.round(dur * FPS));
    const head = { title: spec.title, scene: spec.scene, subtitleNames: spec.subtitleNames };
    const key = crypto.createHash('sha1').update(JSON.stringify([stamp, msaa, shadow, head, s])).digest('hex').slice(0, 16);
    shots.push({ spec: head, s, dur, frames, t0, key, file: path.join(cacheDir, `${key}.mp4`) });
    t0 += frames / FPS;
  }
  const total = shots.reduce((a, x) => a + x.frames, 0);
  let sel = shots;
  if (opt.only) { const set = String(opt.only).split(','); sel = shots.filter(x => set.includes(String(x.s.n))); }
  if (opt.from) { const i = shots.findIndex(x => String(x.s.n) === String(opt.from)); if (i >= 0) sel = sel.filter(x => shots.indexOf(x) >= i); }
  if (opt.to) { const i = shots.findIndex(x => String(x.s.n) === String(opt.to)); if (i >= 0) sel = sel.filter(x => shots.indexOf(x) <= i); }
  const todo = sel.filter(x => !fs.existsSync(x.file));
  const todoFrames = todo.reduce((a, x) => a + x.frames, 0);
  console.log(`${sel.length} shots, ${sel.reduce((a, x) => a + x.frames, 0)} frames (${todo.length} shots / ${todoFrames} frames to render) on ${workers} workers, msaa ${msaa}, shadows ${shadow}`);

  // a shared queue in film order: each worker takes the next pending shot (a set switch costs well under a second)
  const queue = todo.slice();
  const started = Date.now();
  let done = 0;
  const server = await serve();
  await Promise.all(Array.from({ length: Math.min(workers, todo.length) }, async (_, wi) => {
    const B = await openBoard({ server, msaa, shadow });
    for (let x = queue.shift(); x; x = queue.shift()) {
      const ts = Date.now();
      const tmp = x.file + '.part.mp4';
      const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', crf, '-pix_fmt', 'yuv420p', '-r', String(FPS), '-g', '48',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
      const ended = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error(`ffmpeg exit ${c} on shot ${x.s.n}`)))));
      const BATCH = 6;
      for (let i = 0; i < x.frames; i += BATCH) {
        const ts2 = Array.from({ length: Math.min(BATCH, x.frames - i) }, (_, k) => (i + k) / FPS);
        const urls = await B.page.evaluate(async ({ spec, s, ts2 }) => {
          const out = [];
          for (const t of ts2) out.push(await window.frame(spec, s, t, 'animatic', { quality: 0.9 }));
          return out;
        }, { spec: x.spec, s: x.s, ts2 });
        for (const u of urls) { if (!ff.stdin.write(dataToBuf(u))) await new Promise(r => ff.stdin.once('drain', r)); }
      }
      ff.stdin.end();
      await ended;
      fs.renameSync(tmp, x.file);
      done += x.frames;
      const el = (Date.now() - started) / 1000;
      console.log(`[w${wi}] shot ${String(x.s.n).padEnd(6)} ${String(x.frames).padStart(4)} f  ${((Date.now() - ts) / 1000).toFixed(1)} s  ` +
        `(${(x.frames / ((Date.now() - ts) / 1000)).toFixed(2)} f/s)   total ${done}/${todoFrames}  eta ${((todoFrames - done) / Math.max(done / el, 1e-6) / 60).toFixed(1)} min`);
    }
    await B.close();
  }));
  server.close();

  // join the segments in order
  const list = path.join(cacheDir, `list-${process.pid}.txt`);
  fs.writeFileSync(list, sel.map(x => `file '${x.file.replace(/'/g, "'\\''")}'`).join('\n'));
  const video = path.join(cacheDir, `joined-${process.pid}.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);
  const dur = sel.reduce((a, x) => a + x.frames, 0) / FPS;
  // sound: the pulse cues on the joined clock
  const wav = path.join(cacheDir, `pulse-${process.pid}.wav`);
  let tt = 0; const cues = [];
  for (const x of sel) { for (const p of [].concat(x.s.pulse ?? [])) cues.push({ ...p, at: tt + (p.at ?? 0) }); tt += x.frames / FPS; }
  if (!opt['no-audio']) writePulse(wav, dur, cues);
  const args2 = ['-v', 'error', '-y', '-i', video];
  if (!opt['no-audio']) args2.push('-i', wav, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000');
  args2.push('-c:v', 'copy', '-movflags', '+faststart', '-shortest', outFile);
  execFileSync('ffmpeg', args2);
  for (const f of [list, video, wav]) fs.rmSync(f, { force: true });
  console.log(`wrote ${outFile}  (${sel.length} shots, ${(dur / 60).toFixed(2)} min, rendered ${todoFrames} frames in ${((Date.now() - started) / 60000).toFixed(1)} min; film total ${total} frames)`);
})().catch(e => { console.error(e); process.exit(1); });

// A soft pulse track, synthesised: cue = {at, kind: 'beat'|'stroke'|'engine'|'lock'|'bell', beats: 4, interval: 0.62,
// gain: 0.7, stumble: [1, 1, 0.6, 0]} (per-beat gains, for "three beats, two, none")
function writePulse(file, dur, cues) {
  const SR = 48000, n = Math.ceil((dur + 0.5) * SR), buf = new Float32Array(n);
  const voice = (t0, kind, g) => {
    const K = { beat: { f: 55, d: 0.32, h: 0.35 }, stroke: { f: 46, d: 0.55, h: 0.5, click: 1 }, engine: { f: 31, d: 1.8, h: 0.6 }, lock: { f: 40, d: 0.9, h: 0.4, click: 1.6 }, bell: { f: 523, d: 3.2, h: 0.2, bell: 1 } }[kind] ?? { f: 55, d: 0.32, h: 0.35 };
    const i0 = Math.floor(t0 * SR), len = Math.floor(K.d * 5 * SR);
    for (let i = 0; i < len && i0 + i < n; i++) {
      if (i0 + i < 0) continue;
      const t = i / SR, env = Math.exp(-t / K.d) * Math.min(1, t / 0.004);
      let v = Math.sin(2 * Math.PI * K.f * t) + K.h * Math.sin(2 * Math.PI * K.f * 2 * t);
      if (K.bell) v = Math.sin(2 * Math.PI * K.f * t) + 0.5 * Math.sin(2 * Math.PI * K.f * 2.76 * t) * Math.exp(-t / 0.8) + 0.3 * Math.sin(2 * Math.PI * K.f * 5.4 * t) * Math.exp(-t / 0.4);
      if (K.click) v += K.click * Math.exp(-t / 0.012) * Math.sin(2 * Math.PI * 1800 * t) * 0.5;
      buf[i0 + i] += g * 0.32 * env * v;
    }
  };
  for (const c of cues) {
    const beats = c.beats ?? (c.kind === 'beat' || !c.kind ? 4 : 1), iv = c.interval ?? 0.62;
    for (let b = 0; b < beats; b++) { const gb = c.stumble ? (c.stumble[b] ?? 0) : 1; if (gb > 0) voice(c.at + b * iv, c.kind ?? 'beat', (c.gain ?? 0.7) * gb); }
  }
  const pcm = Buffer.alloc(44 + n * 2);
  pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + n * 2, 4); pcm.write('WAVE', 8); pcm.write('fmt ', 12); pcm.writeUInt32LE(16, 16);
  pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22); pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34);
  pcm.write('data', 36); pcm.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(Math.tanh(buf[i]) * 30000))), 44 + i * 2);
  fs.writeFileSync(file, pcm);
}
