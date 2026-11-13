// From the frames shot in the game to the films: averages the motion-blur subframes, lays the title over the last
// shot, adds the soundtrack and encodes.
//   node tools/finish.mjs [--frames out/shoot] [--title out/title] [--mix out/mix.wav] [--size 1280x720]
//     -> out/house-ealdholt-opening-1080p.mp4    the master (H.264 CRF 15, BT.709, AAC 256k), at --size (default 1920x1080)
//     -> out/game/crownfall-ealdholt-opening.mp4  the cut the game ships (1280x720, CRF 26 capped at 4.2 Mbit/s, AAC 160k, faststart)
// The picture is the game's own and is not graded here. It opens out of black, and the title's own dark closes it.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
const frames = path.resolve(ROOT, arg('frames', 'out/shoot')), titles = path.resolve(ROOT, arg('title', 'out/title')), mix = path.resolve(ROOT, arg('mix', 'out/mix.wav'));
const [WIDTH, HEIGHT] = arg('size', '1920x1080').split('x').map(Number);
const pngSize = (file) => { const b = Buffer.alloc(24), fd = fs.openSync(file, 'r'); fs.readSync(fd, b, 0, 24, 0); fs.closeSync(fd); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const run = (args) => { const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], { stdio: 'inherit' }); if (r.status !== 0) process.exit(1); };

// one picture per film frame: a frame shot as subframes (fNNNNN_k.png) is their average
const flat = path.join(ROOT, 'out', 'frames'); fs.mkdirSync(flat, { recursive: true });
const all = fs.readdirSync(frames);
let averaged = 0;
for (let i = 0; i < 900; i++) {
  const id = `f${String(i).padStart(5, '0')}`, target = path.join(flat, `${id}.png`);
  const single = path.join(frames, `${id}.png`);
  if (fs.existsSync(single)) {
    if (fs.existsSync(target) && fs.statSync(target).mtimeMs >= fs.statSync(single).mtimeMs && pngSize(target).join() === [WIDTH, HEIGHT].join()) continue;
    // a frame shot at another size is brought to the master's
    if (pngSize(single).join() === [WIDTH, HEIGHT].join()) fs.copyFileSync(single, target);
    else run(['-i', single, '-vf', `scale=${WIDTH}:${HEIGHT}:flags=lanczos`, '-frames:v', '1', target]);
    continue;
  }
  const subs = all.filter((f) => f.startsWith(`${id}_`)).sort();
  if (!subs.length) { console.log(`frame ${id} is missing in ${frames}`); process.exit(1); }
  const newest = Math.max(...subs.map((f) => fs.statSync(path.join(frames, f)).mtimeMs));
  if (fs.existsSync(target) && fs.statSync(target).mtimeMs >= newest) continue;
  const inputs = subs.flatMap((f) => ['-i', path.join(frames, f)]);
  run([...inputs, '-filter_complex', `${subs.map((_, k) => `[${k}:v]`).join('')}mix=inputs=${subs.length}:normalize=1,scale=${WIDTH}:${HEIGHT}:flags=lanczos,format=rgb24`, '-frames:v', '1', target]);
  averaged++;
}
if (averaged) console.log(`${averaged} frame(s) averaged from their subframes`);

const titleFiles = fs.existsSync(titles) ? fs.readdirSync(titles).filter((f) => /^t\d{5}\.png$/.test(f)).sort() : [];
if (!titleFiles.length) { console.log(`no title frames in ${titles}: run node tools/title.mjs first`); process.exit(1); }
const first = +titleFiles[0].slice(1, 6);
if (first + titleFiles.length !== 900) { console.log(`the title frames should run from ${first} to 899; found ${titleFiles.length}`); process.exit(1); }
// the soundtrack: the mix made here (out/mix.wav), or the one that came with the repository (made elsewhere and committed)
const sound = [mix, path.join(ROOT, 'audio', 'ealdholt-opening-mix.m4a')].find((file) => fs.existsSync(file));
const hasMix = !!sound;
console.log(hasMix ? `soundtrack: ${path.relative(ROOT, sound)}` : 'no soundtrack yet (out/mix.wav or audio/ealdholt-opening-mix.m4a): encoding the picture with a silent track');

const master = path.join(ROOT, 'out', `house-ealdholt-opening-${HEIGHT}p.mp4`);
const graph = `[0:v]fade=t=in:st=0:d=1.6[p];[1:v]format=rgba,scale=${WIDTH}:${HEIGHT}:flags=lanczos,setpts=PTS+${first}/30/TB[t];[p][t]overlay=eof_action=pass,format=yuv420p[v]`;
run(['-framerate', '30', '-i', path.join(flat, 'f%05d.png'), '-framerate', '30', '-start_number', String(first), '-i', path.join(titles, 't%05d.png'),
  ...(hasMix ? ['-i', sound] : ['-f', 'lavfi', '-t', '30', '-i', 'anullsrc=r=48000:cl=stereo']),
  '-filter_complex', graph, '-map', '[v]', '-map', '2:a',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-r', '30',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-t', '30', '-movflags', '+faststart', master]);
fs.mkdirSync(path.join(ROOT, 'out', 'game'), { recursive: true });
const game = path.join(ROOT, 'out', 'game', 'crownfall-ealdholt-opening.mp4');
run(['-i', master, '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-maxrate', '4200k', '-bufsize', '8400k', '-tune', 'film', '-pix_fmt', 'yuv420p', '-r', '30',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', game]);
for (const f of [master, game]) console.log(`${(fs.statSync(f).size / 1048576).toFixed(1)} MB  ${path.relative(ROOT, f)}`);
