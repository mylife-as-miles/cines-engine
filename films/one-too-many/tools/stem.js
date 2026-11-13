// Render the bed stem: every sequence's score through the sound engine with SOUND.stem = 'bed' (beds, recorded
// ambiences, score, and the cues the map keeps as "code"; the one-shots the mixer places are left out), 48 kHz,
// concatenated into one WAV on the film's clock.
//   node tools/stem.js [out/bed.wav] [--full] [--score]
//   --full renders everything (the engine-only mix); --score leaves out the synth beds that the generated score replaces
//   (audio/score_plan.json "replaces", for each cue whose audio is in audio/score/), for tools/score_place.py to fill.
const { open } = require('./film');
const { execFileSync } = require('child_process');
const fs = require('fs'); const path = require('path');
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'out/bed.wav';
const FULL = process.argv.includes('--full');
const replaced = [];
if (process.argv.includes('--score')) {
  const root = path.resolve(__dirname, '..'); const plan = JSON.parse(fs.readFileSync(path.join(root, 'audio', 'score_plan.json'), 'utf8'));
  plan.cues.filter(c => ['.mp3', '.wav'].some(e => fs.existsSync(path.join(root, 'audio', 'score', c.id + e))))
    .forEach(c => c.replaces.forEach(name => replaced.push({ name, t0: c.start_s, t1: c.end_s })));
  console.log(`${replaced.length} replaced bed spans`);
}
(async () => {
  const TMP = path.resolve(path.dirname(OUT), 'stem_tmp'); fs.mkdirSync(TMP, { recursive: true });
  const { browser, page, errs } = await open(null);
  await page.evaluate(([full, rep]) => { SOUND.stem = full ? null : 'bed'; SOUND.replaced = rep; }, [FULL, replaced]);
  const n = await page.evaluate(() => FILM.seqs.length); const files = [];
  for (let i = 0; i < n; i++) {
    const b64 = await page.evaluate(i => FILM.wav(i, 48000), i);
    const f = path.join(TMP, `bed_${String(i).padStart(2, '0')}.wav`); fs.writeFileSync(f, Buffer.from(b64, 'base64')); files.push(f);
    process.stdout.write(`${i + 1}/${n} `);
  }
  const removed = await page.evaluate(() => SOUND.removed || []);
  if (removed.length) console.log('\nleft out for the score: ' + removed.join('; '));
  await browser.close();
  const list = path.join(TMP, 'list.txt'); fs.writeFileSync(list, files.map(f => `file '${f}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', OUT]);
  const u = [...new Set(errs)]; if (u.length) console.log('\nconsole:\n  ' + u.slice(0, 10).join('\n  '));
  console.log('\nwrote ' + OUT);
})();
