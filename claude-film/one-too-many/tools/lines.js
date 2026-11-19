// Audit dialogue coverage: every screenplay line L001-L249 must play exactly once, in order, with the right speaker.
//   node tools/lines.js            (all built sequences)      node tools/lines.js Q05 L050 L081   (one sequence and its range)
const { open } = require('./film');
(async () => {
  const [only, from, to] = process.argv.slice(2);
  const { browser, page, errs } = await open(only && only !== 'ALL' ? only : null);
  const r = await page.evaluate(() => ({
    seqs: FILM.seqs.map(s => ({ id: s.id, title: s.title, start: s.start, dur: s.dur, lines: s.lines.map(L => { const T = FILM.lineTiming(L); return { id: L.id, at: L.at, end: T.end, who: T.who, text: T.text, x: L.x, y: L.y }; }) })),
    all: FILM.script.filter(e => e.type === 'line').map(e => e.id), total: FILM.total,
  }));
  const used = {}; let problems = 0;
  for (const s of r.seqs) {
    let prev = ''; const conc = [];
    for (const L of s.lines) {
      (used[L.id] = used[L.id] || []).push(s.id);
      if (L.id < prev) { console.log(`${s.id}: ${L.id} is out of screenplay order (after ${prev})`); problems++; } prev = L.id > prev ? L.id : prev;
      if (L.at < 0 || L.end > s.dur + 0.01) { console.log(`${s.id}: ${L.id} runs outside the sequence (${L.at.toFixed(2)}..${L.end.toFixed(2)} of ${s.dur})`); problems++; }
    }
    // more than 3 lines at once?
    const ev = []; s.lines.forEach(L => { ev.push([L.at, 1, L.id]); ev.push([L.end, -1, L.id]); }); ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]); let n = 0;
    for (const e of ev) { n += e[1]; if (n > 3) { console.log(`${s.id}: more than 3 lines on screen at ${e[0].toFixed(2)}s`); problems++; break; } }
    console.log(`${s.id} ${s.title}: ${s.dur.toFixed(1)} s, ${s.lines.length} lines` + (s.lines.length ? ` (${s.lines[0].id}..${s.lines[s.lines.length - 1].id})` : ''));
  }
  const want = from ? r.all.filter(id => id >= from && id <= to) : (only && only !== 'ALL' ? [] : r.all);
  for (const id of want) { if (!used[id]) { console.log('MISSING ' + id); problems++; } else if (used[id].length > 1) { console.log('DUPLICATE ' + id + ' in ' + used[id].join(',')); problems++; } }
  console.log(`total ${r.total.toFixed(1)} s; ${Object.keys(used).length} line ids used; ${problems} problem(s)`);
  const u = [...new Set(errs)]; if (u.length) console.log(u.slice(0, 15).join('\n'));
  await browser.close(); process.exit(problems ? 1 : 0);
})();
