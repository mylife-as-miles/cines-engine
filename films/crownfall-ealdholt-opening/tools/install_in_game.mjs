// Puts the game cut into the Crownfall checkout and brings the records of its size and hash up to date.
//   node tools/install_in_game.mjs [--game C:/Users/MILES/Documents/Crownfall] [--cut out/game/crownfall-ealdholt-opening.mp4]
// It copies the cut to "main game/public/video/crownfall-ealdholt-opening.mp4", then replaces the previous size and
// SHA-256 wherever the game records them: shared/menu/opening-film.ts, and provenance.json and SOURCES.md beside the
// film. Nothing else in those files changes; wording about the soundtrack and the source commit is edited by hand.
// The Quest's copy is made by the game's own asset sync (npm run build / check:sync), not here.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
const game = path.resolve(arg('game', 'C:/Users/MILES/Documents/Crownfall'));
const cut = path.resolve(ROOT, arg('cut', 'out/game/crownfall-ealdholt-opening.mp4'));
const ID = 'crownfall-ealdholt-opening';
const video = path.join(game, 'main game', 'public', 'video');
const records = [path.join(video, 'provenance.json'), path.join(video, 'SOURCES.md'), path.join(game, 'shared', 'menu', 'opening-film.ts')];

const provenance = JSON.parse(fs.readFileSync(records[0], 'utf8'));
const list = Object.values(provenance).find((v) => Array.isArray(v) && v.some((e) => e && e.id === ID));
const entry = list && list.find((e) => e.id === ID);
if (!entry) { console.log(`no ${ID} entry in ${records[0]}`); process.exit(1); }

const bytes = fs.readFileSync(cut);
const next = { bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
const grouped = (n) => n.toLocaleString('en-US');
fs.copyFileSync(cut, path.join(video, `${ID}.mp4`));

for (const file of records) {
  const before = fs.readFileSync(file, 'utf8');
  const after = before.split(entry.sha256).join(next.sha256)
    .split(String(entry.bytes)).join(String(next.bytes))
    .split(grouped(entry.bytes)).join(grouped(next.bytes));
  const hits = before.split(entry.sha256).length - 1;
  if (!hits) { console.log(`the previous hash is not in ${file}: nothing was changed there`); process.exitCode = 1; continue; }
  fs.writeFileSync(file, after);
  console.log(`updated ${path.relative(game, file)}`);
}
console.log(`${ID}.mp4: ${grouped(entry.bytes)} -> ${grouped(next.bytes)} bytes, sha256 ${next.sha256}`);
