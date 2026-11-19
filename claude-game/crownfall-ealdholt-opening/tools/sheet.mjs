// A contact sheet from rendered frames: node tools/sheet.mjs <frames-dir> <out.jpg> [--cols 6] [--w 480]
// Each frame is labelled with its file name (its time or frame number).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [dir, out] = process.argv.slice(2);
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
const cols = +arg('cols', 6), width = +arg('w', 480);
const files = fs.readdirSync(dir).filter((f) => /\.png$/.test(f) && f !== 'shoot-error.png').sort();
if (!files.length) { console.log('no frames in ' + dir); process.exit(1); }
const rows = Math.ceil(files.length / cols);
const inputs = files.flatMap((f) => ['-i', path.join(dir, f)]);
const labelled = files.map((f, i) => `[${i}:v]scale=${width}:-2,drawtext=text='${f.replace(/\.png$/, '').replace(/^t0?/, '').replace(/^f0*/, 'f')}':x=8:y=8:fontsize=${Math.round(width / 22)}:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=4[v${i}]`).join(';');
const grid = files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) ? Array.from({ length: i % cols }, (_, k) => `w${k}`).join('+') : 0}_${Math.floor(i / cols) ? Array.from({ length: Math.floor(i / cols) }, (_, k) => `h${k * cols}`).join('+') : 0}`).join('|')}:fill=black`;
const filter = files.length === 1 ? labelled.replace(`[v0]`, '') : `${labelled};${grid}`;
const run = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', filter, '-frames:v', '1', '-q:v', '3', out], { stdio: 'inherit' });
console.log(run.status === 0 ? `sheet of ${files.length} frame(s), ${cols} x ${rows}: ${out}` : 'ffmpeg failed');
