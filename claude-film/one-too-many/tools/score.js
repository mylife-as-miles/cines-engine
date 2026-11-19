// Dump every sequence's score (cues, beds, holes, ducks) on the film's global clock, from the sequences' own timing.
//   node tools/score.js [out.json]
const { open } = require('./film');
const fs = require('fs');
(async () => {
  const { browser, page } = await open(null);
  const out = await page.evaluate(() => FILM.seqs.map(s => { const ev = FILM.score(s); const clean = p => JSON.parse(JSON.stringify(p || {}));
    return { id: s.id, start: s.start, dur: s.dur, gain: s.gain || 0, cues: ev.cues.map(c => ({ name: c.name, t: c.t, p: clean(c.p) })), beds: ev.beds.map(b => ({ name: b.name, t0: b.t0, t1: b.t1, p: clean(b.p) })), holes: ev.holes, ducks: ev.ducks }; }));
  await browser.close();
  fs.writeFileSync(process.argv[2] || 'out/score.json', JSON.stringify(out, null, 1));
  const n = {}; out.forEach(s => s.cues.forEach(c => n[c.name] = (n[c.name] || 0) + 1));
  console.log(Object.entries(n).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join('\n'));
  const b = {}; out.forEach(s => s.beds.forEach(c => b[c.name] = (b[c.name] || 0) + 1)); console.log('beds: ' + JSON.stringify(b));
})();
