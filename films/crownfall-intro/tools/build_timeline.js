// Lay the film out on the narration: node tools/build_timeline.js [working|final]
// Reads narration/script.json and narration/<set>/lines.json (each take's duration), places every line, and writes
//   film/timeline.js          window.TIMELINE: the studio card, the seven scenes with each line's start and end, the
//                             YEAR 33 card and the title. Scenes key their pictures to these times, so a new voice
//                             re-times the whole film.
//   narration/<set>/cues.vtt  the subtitles
//   narration/<set>/placement.json  where tools/mix.js puts each take
const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const set = process.argv[2] || (fs.existsSync(path.join(ROOT, 'narration/final/lines.json')) ? 'final' : 'working');
const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'narration/script.json'), 'utf8'));
const M = JSON.parse(fs.readFileSync(path.join(ROOT, `narration/${set}/lines.json`), 'utf8'));
const dur = Object.fromEntries(M.lines.map(l => [l.id, l.dur]));

const STUDIO = [0, 8.6];                 // Project EON, out of black
const PRE = { 1: 2.8, 2: 1.3, 3: 1.3, 4: 2.6, 5: 1.3, 6: 2.0, 7: 2.0 };   // picture before a scene's first line
const TAIL = { 1: 1.9, 2: 0.6, 3: 2.0, 4: 2.8, 5: 1.2, 6: 1.3, 7: 1.8 };  // picture after its last line's pause
const GAP = 0.32;                        // silence between lines unless a line sets its own pause
const YEAR33 = 5.4, TITLE = 15.0;        // the dateline card, then CROWNFALL / AETHELGARD and the tagline
const r3 = x => Math.round(x * 1000) / 1000;

let t = STUDIO[1] - 0.6;                 // the first page rises as the studio mark fades
const scenes = [];
for (const sc of S.scenes) {
  const start = t; t += PRE[sc.n];
  const lines = [];
  for (const l of S.lines.filter(x => x.scene === sc.n)) {
    if (l.cut) { lines.push({ id: l.id, text: '', start: r3(t), end: r3(t), cut: true }); continue; }   // left out of this cut
    if (dur[l.id] == null) throw new Error(`no take for ${l.id} in narration/${set}/lines.json`);
    lines.push({ id: l.id, text: l.text, start: r3(t), end: r3(t + dur[l.id]), ...(l.added ? { added: true } : {}) });
    t += dur[l.id] + (l.pause != null ? l.pause : GAP);
  }
  t += TAIL[sc.n];
  scenes.push({ n: sc.n, name: sc.name, start: r3(start), end: r3(t), lines });
}
const year33 = [r3(t), r3(t + YEAR33)]; t += YEAR33 - 0.8;
const title = [r3(t), r3(t + TITLE)]; t += TITLE;
const total = r3(t + 0.5);
const TL = { voice: M.voice, set, total, studio: STUDIO, scenes, year33, title };
fs.writeFileSync(path.join(ROOT, 'film/timeline.js'), '// Built by tools/build_timeline.js from the narration takes. Do not edit by hand.\nwindow.TIMELINE = ' + JSON.stringify(TL, null, 1) + ';\n');

const vt = s => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${x.toFixed(3).padStart(6, '0')}`; };
const cues = scenes.flatMap(s => s.lines).filter(l => !l.cut).map((l, i) => `${i + 1}\n${vt(l.start)} --> ${vt(l.end + 0.25)}\n${l.text}\n`);
fs.writeFileSync(path.join(ROOT, `narration/${set}/cues.vtt`), 'WEBVTT\n\n' + cues.join('\n'));
fs.writeFileSync(path.join(ROOT, `narration/${set}/placement.json`), JSON.stringify({ total, lines: scenes.flatMap(s => s.lines).filter(l => !l.cut).map(l => ({ id: l.id, file: `${l.id}.wav`, start: l.start, end: l.end })) }, null, 1));

const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
console.log(`timeline from narration/${set} (${M.voice}): total ${fmt(total)}`);
console.log(`  studio ${fmt(STUDIO[0])}–${fmt(STUDIO[1])}`);
for (const s of scenes) console.log(`  S0${s.n} ${fmt(s.start)}–${fmt(s.end)} (${(s.end - s.start).toFixed(1)} s, ${s.lines.length} lines)  ${s.name}`);
console.log(`  YEAR 33 ${fmt(year33[0])}–${fmt(year33[1])}   title ${fmt(title[0])}–${fmt(title[1])}`);
