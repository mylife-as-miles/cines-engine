// Build film/data.js (window.CREDITS) from credits/credits-data.json: the credits gathered from every Crownfall branch,
// each entry with the branch and file it came from (see credits/credits-data.md).
//   node tools/build_data.js [credits/credits-data.json]
// Cards follow a film's end titles: small role labels over names, one card at a time, at most three groups to a row.
// The data's long evidence notes are shortened here into on-screen labels; nothing is credited that the data lacks.
const fs = require('fs'); const path = require('path');
const SRC = process.argv[2] || path.join(__dirname, '../credits/credits-data.json');
const D = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const CREATOR = D.creator.name;
const cards = [];
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
const cut = s => clean(String(s || '').split(/\s\(|;|: /)[0]);       // "Rock library (a, b, c); note" -> "Rock library"
const rowsOf = (groups, per) => { const r = []; for (let i = 0; i < groups.length; i += per) r.push(groups.slice(i, i + per)); return r; };
const SOURCES = ['Poly Haven', 'Sketchfab', 'ambientCG', 'MakeHuman', '100STYLE', 'KitBash3D', 'Meshy', 'Fab', 'Rork'];
const shortSource = s => { s = clean(s); const gh = s.match(/github\.com\/([\w.-]+\/[\w.-]+)/); if (gh) return gh[1]; const k = SOURCES.find(x => new RegExp('\\b' + x + '\\b', 'i').test(s)); return k ? (k === '100STYLE' ? '100STYLE dataset' : k) : ''; };
const LIC = { 'CC0-1.0': 'CC0', 'CC-BY-4.0': 'CC BY 4.0', 'MIT': 'MIT', 'OFL-1.1': 'SIL OFL 1.1' };
const shortLic = l => { l = clean(l); for (const k of Object.keys(LIC)) if (l.startsWith(k)) return LIC[k]; return /fab standard/i.test(l) ? 'Fab Standard License' : ''; };
// names as they should read on screen
function screenNames(names) {
  const out = [];
  for (let n of names || []) {
    n = clean(n);
    if (/^original crownfall work|^claude track|game's own figures/i.test(n)) continue;     // covered by the main credits
    if (/^supplied by the creator|creator-owned|^osita miles/i.test(n)) { out.push(CREATOR); continue; }
    if (/^generated during the codex/i.test(n)) continue;           // the portrait's generator is not recorded: not credited
    n = n.replace(/^generated (via|with) /i, '').replace(/\s*\((processing|photography)\)/i, ' ($1)');
    n = n.replace(/\s*\((authors? not recorded|names not in the committed tree|no individual author listed)\)/i, '');
    n = n.replace(/^Poly Haven artists$/i, 'Poly Haven');
    n = n.replace(/^Author\/seller not recorded.*$/i, 'Licensed via Fab');
    // "Team (Person A, Person B)" credits each named person; "x (some note)" keeps x
    const m = n.match(/^(.*?)\s*\((.*)\)$/);
    if (m && !/^(processing|photography)$/i.test(m[2])) {
      out.push(clean(m[1]));
      if (m[2].includes(',') || /^digitised by /i.test(m[2])) for (const p of m[2].replace(/^digitised by /i, '').split(/,\s*/)) out.push(clean(p));
      continue;
    }
    out.push(n);
  }
  return [...new Set(out)];
}
function pushGroups(header, groups, opts) {
  opts = opts || {};
  let page = [], names = 0;
  const flush = () => { if (!page.length) return; cards.push(Object.assign({ header, rows: rowsOf(page, page.length === 4 ? 2 : 3) }, opts)); page = []; names = 0; };
  for (const g of groups) {
    if (g.names.length > 8) {
      flush();
      const cols = []; for (let i = 0; i < g.names.length; i += 9) cols.push(g.names.slice(i, i + 9));
      for (let i = 0; i < cols.length; i += 4) cards.push(Object.assign({ header, dense: true, rows: [cols.slice(i, i + 4).map((c, k) => ({ role: k === 0 ? g.role : ' ', names: c, note: k === 0 ? g.note : undefined }))] }, opts));
      continue;
    }
    if (page.length >= (opts.maxGroups || 6) || names + g.names.length > 14) flush();
    page.push(g); names += g.names.length;
  }
  flush();
}

// 1. the creator (the director card is drawn before the title)
const director = [[{ role: 'Created, written and directed by', names: [CREATOR] }]];
pushGroups(null, [
  { role: 'Game director', names: [CREATOR] },
  { role: 'Game design', names: [CREATOR] },
  { role: 'World and lore', names: [CREATOR] },
  { role: 'Art direction', names: [CREATOR] },
]);

// 2. development partners and AI tools
const ai = Object.fromEntries((D.ai || []).map(a => [a.name.split(' ')[0].toLowerCase(), a]));
const partners = [];
if (ai.claude) partners.push({ role: 'AI development partner · Anthropic', names: ['Claude'], note: 'Villagers · environments · My Legacy · arena look development' });
if (ai.codex) partners.push({ role: 'AI development partner · OpenAI', names: ['Codex'], note: 'Campaign · battlefields · Legacy interface · source worlds · integration' });
if (partners.length) pushGroups('Development partners', partners);
const tools = [];
if (ai.rork) tools.push({ role: "Original King's Gambit chess game", names: ['Rork'], note: 'Chess figures, their animation and in-match audio' });
if (ai.meshy) tools.push({ role: 'Arena organic set', names: ['Meshy'] });
if (ai.suno) tools.push({ role: 'Music tool', names: ['Suno'] });
if (tools.length) pushGroups('Built with', tools);

// 3. music: the theme lands on the lift in Sanguis et Terra near 63 s
cards.push({ header: 'Music', pinAt: 63.2, hold: 6.5, keepRows: true, rows: [[{ role: 'End credits theme', names: ['Sanguis et Terra'] }], [{ role: 'Music by', names: [CREATOR] }]] });
const music = D.music || [];
if (music.length > 1) cards.push({ header: 'The Crownfall soundtrack', rows: [[{ role: 'Composed by ' + CREATOR, names: music.map(m => clean(m.title)) }]] });

// 4. third-party art, code and sources, as the data groups them (references only inspired the work: not listed)
const SECTION_TITLE = {
  "ORIGINAL KING'S GAMBIT CHESS GAME": "The original King's Gambit",
  'SUPPLIED ARTWORK AND CREATURE': 'Artwork',
  'CHARACTER ART SOURCES (EALDHOLT VILLAGERS)': 'The villagers of Ealdholt',
  'ENVIRONMENT TEXTURES (EALDHOLT)': 'Ealdholt surfaces',
  'SOURCE WORLDS AND ADAPTED CODE': 'Source worlds and adapted code',
  "ARENA SOURCES (KING'S GAMBIT ECLIPSE ARENA, BLENDER)": 'The eclipse arena',
  'LICENSED PRIVATE INPUTS (NOT IN THE PUBLIC REPOSITORY)': 'Licensed assets',
};
for (const sec of D.sections || []) {
  if (/^REFERENCES/i.test(sec.heading)) continue;
  const groups = [];
  for (const e of sec.entries || []) {
    const names = screenNames(e.names); if (!names.length) continue;
    const src = shortSource(e.source); const note = [names.some(n => src && n.toLowerCase().includes(src.toLowerCase())) ? '' : src, shortLic(e.licence)].filter(Boolean).join(' · ');
    let role = cut(e.label);
    const RENAME = { 'Skull showing treponemal disease': 'The colossal skull (scan)', 'Hand Nadia': 'The stone hand (scan: Hand Nadia)', 'Base human bodies, shape targets, 64-bone rig and weights': 'Base human bodies and rig',
      'Skin textures, eyes, teeth, tongue and eyelashes': 'Skin, eyes and teeth', 'Facial expression targets': 'Facial expressions and visemes', 'Motion capture': 'Motion capture (100STYLE)' };
    role = RENAME[role] || role;
    groups.push({ role, names, note: note || undefined });
  }
  if (groups.length) pushGroups(SECTION_TITLE[clean(sec.heading).toUpperCase()] || cut(sec.heading), groups);
}

// 5. typefaces (the game's, plus those this film is set in) and software
const fonts = (D.fonts || []).map(f => ({ family: cut(f.family), designer: f.designer ? cut(f.designer) : `The ${cut(f.family)} Project Authors`, licence: shortLic(f.licence) || 'SIL OFL 1.1' }));
for (const extra of [{ family: 'Oswald', designer: 'The Oswald Project Authors', licence: 'SIL OFL 1.1' }]) if (!fonts.some(f => f.family === extra.family)) fonts.push(extra);
pushGroups('Typefaces', fonts.map(f => ({ role: f.family, names: [f.designer], note: f.licence })), { maxGroups: 8 });
const sw = [...new Set((D.software || []).map(s => clean(s.name).split(' (')[0].replace(/\s+v?\d+(\.\d+)*(-rc\.\d+)?$/i, '').replace(/\s+\d+$/, '')))];
pushGroups('Built with open-source software', [{ role: 'With thanks to their authors and contributors', names: sw }]);

// the music cards land on the lift near 63 s: put the King's Gambit and artwork cards before them so the pace stays even
{
  const mi = cards.findIndex(c => c.header === 'Music'); const music2 = cards.splice(mi, 2);
  const ai2 = cards.findIndex(c => c.header === 'Artwork'); cards.splice(ai2 + 1, 0, ...music2);
}
const out = { director, cards, closing: { line1: 'A PROJECT EON GAME', line2: `© 2026 ${CREATOR.toUpperCase()}. ALL RIGHTS RESERVED.`, thanks: 'THANK YOU FOR PLAYING' } };
fs.writeFileSync(path.join(__dirname, '../film/data.js'), '// Built by tools/build_data.js from credits/credits-data.json. Do not edit by hand.\nwindow.CREDITS = ' + JSON.stringify(out, null, 1) + ';\n');
console.log(`film/data.js: ${cards.length} cards`);
for (const c of cards) console.log(' -', c.header || '(creator)', '|', c.rows.map(r => r.map(g => g.role + ': ' + g.names.join(', ')).join(' || ')).join(' // ').slice(0, 230));
