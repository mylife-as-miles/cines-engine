// Dump the film's sound events (every sequence's beds, cues, silences and ducks, plus the voiced lines' takes) in global
// seconds, for the offline mix: node tools/cuesheet.js [out/cuesheet.json]
// Also prints every bed and cue name in use with its count, so each can be mapped to a recording (audio/sound_map.json).
const { open } = require('./film');
(async () => {
  const out = process.argv[2] || 'out/cuesheet.json';
  const { browser, page, errs } = await open(null);
  const res = await page.evaluate(() => {
    const seqs = FILM.cuesheet();
    const ev = { total: FILM.total, seqs: seqs.map(s => ({ id: s.id, title: s.title, start: s.start, dur: s.dur })), beds: [], cues: [], silences: [], ducks: [] };
    for (const s of seqs) {
      for (const b of s.beds) ev.beds.push(Object.assign({ seq: s.id, t0g: s.start + b.t0, t1g: s.start + b.t1 }, b));
      for (const c of s.cues) ev.cues.push(Object.assign({ seq: s.id, tg: s.start + c.t }, c));
      for (const x of s.silences) ev.silences.push({ seq: s.id, t0g: s.start + x.t0, t1g: s.start + x.t1 });
      for (const d of s.ducks) ev.ducks.push({ seq: s.id, t0g: s.start + d.t0, t1g: s.start + d.t1, level: d.level });
    }
    return ev;
  });
  require('fs').writeFileSync(out, JSON.stringify(res, null, 1));
  const count = (arr, k) => arr.reduce((m, e) => (m[e[k]] = (m[e[k]] || 0) + 1, m), {});
  console.log(`film ${res.total.toFixed(2)} s, ${res.seqs.length} sequences: ${res.seqs.map(s => s.id + ' ' + s.dur).join(', ')}`);
  console.log(`${res.beds.length} beds, ${res.cues.length} cues, ${res.silences.length} silences, ${res.ducks.length} ducks -> ${out}`);
  console.log('beds: ' + Object.entries(count(res.beds, 'name')).map(([k, v]) => `${k}(${v})`).join(' '));
  console.log('cues: ' + Object.entries(count(res.cues, 'name')).sort().map(([k, v]) => `${k}(${v})`).join(' '));
  const u = [...new Set(errs)].filter(e => !/not built yet|ERR_FILE/.test(e)); if (u.length) console.log(u.slice(0, 10).join('\n'));
  await browser.close();
})();
