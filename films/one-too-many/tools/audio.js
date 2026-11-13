// Render a sequence's soundtrack offline and report levels: node tools/audio.js Q05 [out.wav]
// Prints peak and RMS per second (so silences, holes and hits are visible) and any missing sound names.
const { open } = require('./film'); const fs = require('fs');
(async () => {
  const [id, out] = process.argv.slice(2);
  const { browser, page, errs } = await open(id);
  const r = await page.evaluate(async () => {
    const seq = FILM.seqs[0]; const b = await FILM.renderAudio(seq, 24000); const d = b.getChannelData(0), sr = b.sampleRate; const per = [];
    for (let s = 0; s < Math.ceil(b.duration); s++) { let pk = 0, ss = 0, n = 0; for (let i = s * sr; i < Math.min(d.length, (s + 1) * sr); i++) { const v = Math.abs(d[i]); pk = Math.max(pk, v); ss += v * v; n++; } per.push([pk, Math.sqrt(ss / Math.max(1, n))]); }
    const ev = FILM.score(seq); return { per, warn: FILM.warnings || [], cues: ev.cues.length, beds: ev.beds.length, holes: ev.holes.length, dur: seq.dur };
  });
  const db = v => v > 0 ? (20 * Math.log10(v)).toFixed(0).padStart(4) : ' -inf';
  console.log(`${id}: ${r.dur}s, ${r.beds} beds, ${r.cues} cues, ${r.holes} holes`);
  r.per.forEach(([pk, rms], s) => console.log(`${String(s).padStart(4)}s  peak ${db(pk)} dB  rms ${db(rms)} dB  ${'#'.repeat(Math.max(0, Math.round((60 + 20 * Math.log10(rms + 1e-9)) / 2)))}`));
  if (r.warn.length) console.log('warnings: ' + r.warn.join('; '));
  const u = [...new Set(errs)]; if (u.length) console.log(u.slice(0, 10).join('\n'));
  if (out) { const b64 = await page.evaluate(() => FILM.wav(0, 44100)); fs.writeFileSync(out, Buffer.from(b64, 'base64')); console.log('wrote ' + out); }
  await browser.close();
})();
