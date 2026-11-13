// Lay the prologue out on its voices: node tools/build_timeline.js [final]
// Reads narration/script.json and narration/<set>/lines.json (each take's duration), places every line, and writes
//   film/timeline.js          window.TIMELINE: the cold open and its title (scene 0), scenes 1-8 with each line's start,
//                             end and speaker, and the Chapter One card. Scenes key their pictures to these times
//                             (K.cue('L07')), so new takes re-time the whole film.
//   narration/<set>/cues.vtt  the subtitles (character lines carry their speaker)
//   narration/<set>/placement.json  where tools/mix.py puts each take
const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const set = process.argv[2] || 'final';
const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'narration/script.json'), 'utf8'));
const M = JSON.parse(fs.readFileSync(path.join(ROOT, `narration/${set}/lines.json`), 'utf8'));
const dur = Object.fromEntries(M.lines.map(l => [l.id, l.dur]));

// picture before a scene's first line, and after its last line's pause
const PRE = { 0: 2.6, 1: 2.4, 2: 1.4, 3: 2.6, 4: 1.6, 5: 1.6, 6: 1.6, 7: 1.4, 8: 3.4 };
const TAIL = { 0: 6.4, 1: 1.2, 2: 1.4, 3: 1.0, 4: 2.0, 5: 1.6, 6: 0.6, 7: 3.0, 8: 1.6 };
const GAP = 0.34;              // silence between lines unless a line sets its own pause
const CHAPTER = 11.0;          // CHAPTER ONE / THE PAWN WHO WOULD NOT DIE, and its epigraph
const r3 = x => Math.round(x * 1000) / 1000;

let t = 0;
const scenes = [];
for (const sc of S.scenes) {
  const start = t; t += PRE[sc.n];
  const lines = [];
  for (const l of S.lines.filter(x => x.scene === sc.n)) {
    if (l.cut) { lines.push({ id: l.id, speaker: l.speaker || 'narrator', text: '', start: r3(t), end: r3(t), cut: true }); continue; }   // left out of this cut
    if (dur[l.id] == null) throw new Error(`no take for ${l.id} in narration/${set}/lines.json`);
    lines.push({ id: l.id, speaker: l.speaker || 'narrator', text: l.subtitle || l.text, ...(l.lang ? { lang: l.lang, spoken: l.text } : {}), start: r3(t), end: r3(t + dur[l.id]) });
    t += dur[l.id] + (l.pause != null ? l.pause : GAP);
  }
  // scene 0's tail carries the prologue title; it begins as the whisper ends
  const title = sc.n === 0 ? [r3(t - 0.2), r3(t + TAIL[0] - 0.4)] : undefined;
  t += TAIL[sc.n];
  scenes.push({ n: sc.n, name: sc.name, start: r3(start), end: r3(t), lines, ...(title ? { title } : {}) });
}
const chapter = [r3(t - 0.4), r3(t - 0.4 + CHAPTER)]; t = chapter[1];
const total = r3(t + 0.6);
const TL = { voice: M.voice, set, total, scenes, chapter };
fs.writeFileSync(path.join(ROOT, 'film/timeline.js'), '// Built by tools/build_timeline.js from the takes. Do not edit by hand.\nwindow.TIMELINE = ' + JSON.stringify(TL, null, 1) + ';\n');

const vt = s => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${x.toFixed(3).padStart(6, '0')}`; };
const who = { cael: 'CAEL', voice: 'THE VOICE', rider: 'SORN RIDER', captain: 'CAPTAIN', guard: 'GATE GUARD', arbiter: 'ARBITER', herald: 'HERALD', killer: 'MASKED MAN' };
const cues = scenes.flatMap(s => s.lines).filter(l => !l.cut).map((l, i) => `${i + 1}\n${vt(l.start)} --> ${vt(l.end + 0.25)}\n${who[l.speaker] ? `<v ${who[l.speaker]}>` : ''}${l.text}\n`);
fs.writeFileSync(path.join(ROOT, `narration/${set}/cues.vtt`), 'WEBVTT\n\n' + cues.join('\n'));
fs.writeFileSync(path.join(ROOT, `narration/${set}/placement.json`), JSON.stringify({ total, lines: scenes.flatMap(s => s.lines).filter(l => !l.cut).map(l => ({ id: l.id, speaker: l.speaker, file: `${l.id}.wav`, start: l.start, end: l.end })) }, null, 1));

const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
console.log(`timeline from narration/${set}: total ${fmt(total)}`);
for (const s of scenes) console.log(`  S${s.n} ${fmt(s.start)}–${fmt(s.end)} (${(s.end - s.start).toFixed(1)} s, ${s.lines.filter(l => !l.cut).length} lines)  ${s.name}${s.title ? `   [title ${fmt(s.title[0])}–${fmt(s.title[1])}]` : ''}`);
console.log(`  CHAPTER ONE ${fmt(chapter[0])}–${fmt(chapter[1])}`);
