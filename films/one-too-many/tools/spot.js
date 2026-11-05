// Dump a music-spotting pack per sequence: timing, beds (the synthesised score and ambiences), the Extra's silences,
// ducks, story cues, and every line with its on-screen timing.  node tools/spot.js out/spot
const { open } = require('./film');
const fs = require('fs'); const path = require('path');
(async () => {
  const dir = process.argv[2] || 'out/spot'; fs.mkdirSync(dir, { recursive: true });
  const { browser, page } = await open(null);
  const seqs = await page.evaluate(() => FILM.seqs.map(s => { const ev = FILM.score(s); const r = x => Math.round(x * 100) / 100;
    return { id: s.id, title: s.title, start: r(s.start), dur: r(s.dur),
      beds: ev.beds.map(b => ({ name: b.name, t0: r(b.t0), t1: r(b.t1), level: b.p.level, steps: b.p.steps })),
      holes: ev.holes.map(h => ({ t0: r(h.t0), dur: r(h.dur) })), ducks: ev.ducks.map(d => ({ t0: r(d.t0), t1: r(d.t1), level: d.level })),
      cues: ev.cues.filter(c => !c.name.startsWith('land.')).map(c => ({ name: c.name, t: r(c.t), level: c.p.level })),
      lines: s.lines.map(L => { const T = FILM.lineTiming(L); return { id: L.id, who: T.who, text: T.text, at: r(T.at), end: r(T.end) }; }) }; }));
  await browser.close();
  seqs.forEach(s => fs.writeFileSync(path.join(dir, s.id + '.json'), JSON.stringify(s, null, 1)));
  console.log(seqs.map(s => `${s.id} ${s.title} ${s.start}+${s.dur} beds:${s.beds.length} lines:${s.lines.length}`).join('\n'));
})();
