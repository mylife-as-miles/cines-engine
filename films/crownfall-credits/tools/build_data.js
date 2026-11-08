// Build film/data.js (window.CREDITS) from credits/credits-data.json, the credits gathered from every Crownfall branch.
//   node tools/build_data.js [credits/credits-data.json]
// Cards follow a film's end titles: small role labels over names, one card at a time, at most three groups to a row.
const fs = require('fs'); const path = require('path');
const SRC = process.argv[2] || path.join(__dirname, '../credits/credits-data.json');
const D = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const cards = [];
const rowsOf = (groups, per) => { const r = []; for (let i = 0; i < groups.length; i += per) r.push(groups.slice(i, i + per)); return r; };
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
// a card holds at most ~6 groups and ~16 names; long name lists become dense multi-column cards
function pushGroups(header, groups, opts) {
  opts = opts || {};
  let page = [], names = 0;
  const flush = () => { if (!page.length) return; cards.push(Object.assign({ header, rows: rowsOf(page, page.length === 4 ? 2 : 3) }, opts)); page = []; names = 0; };
  for (const g of groups) {
    if (g.names.length > 8) {                                // a long list: split it into columns of up to 9 names
      flush();
      const cols = []; for (let i = 0; i < g.names.length; i += 9) cols.push(g.names.slice(i, i + 9));
      for (let i = 0; i < cols.length; i += 4) {
        const part = cols.slice(i, i + 4).map((c, k) => ({ role: k === 0 ? g.role : ' ', names: c, note: k === 0 ? g.note : undefined }));
        cards.push(Object.assign({ header, dense: true, rows: [part] }, opts));
      }
      continue;
    }
    if (page.length >= 6 || names + g.names.length > 16) flush();
    page.push(g); names += g.names.length;
  }
  flush();
}

const creator = D.creator || { name: 'Osita Miles', roles: [] };
const director = [[{ role: 'Created, written and directed by', names: [creator.name] }]];
const roles = (creator.roles || []).map(clean).filter(r => r && !/created|written|directed/i.test(r));
if (roles.length) pushGroups(null, roles.map(r => ({ role: r, names: [creator.name] })));

if ((D.ai || []).length) {
  pushGroups('Development collaborators', D.ai.map(a => ({ role: (a.roles || []).slice(0, 2).map(clean).join(' · ') || 'Development', names: [a.name], note: a.maker })));
}

const music = D.music || [];
const st = music.find(m => /sanguis/i.test(m.title));
cards.push({ header: 'Music', pinAt: 63.2, hold: 6.5, rows: [[{ role: 'End credits theme', names: ['Sanguis et Terra'], note: st && st.artist && st.confirmed ? clean(st.artist) : 'From the Crownfall soundtrack' }]] });
if (music.length > 1) cards.push({ header: 'Crownfall soundtrack', rows: rowsOf(music.map(m => ({ role: m.confirmed && m.artist ? clean(m.artist) : 'Crownfall soundtrack', names: [clean(m.title)] })), 3) });

for (const sec of D.sections || []) {
  const groups = (sec.entries || []).map(e => ({ role: clean(e.label), names: (e.names || []).map(clean).filter(Boolean), note: [clean(e.source), clean(e.licence)].filter(Boolean).join(' · ') })).filter(g => g.names.length);
  if (groups.length) pushGroups(clean(sec.heading), groups);
}
if ((D.fonts || []).length) pushGroups('Typefaces', D.fonts.map(f => ({ role: clean(f.family || f.name), names: [clean(f.designer || f.foundry || f.author || '')].filter(Boolean), note: clean(f.licence) })).filter(g => g.names.length));
if ((D.software || []).length) {
  const sw = D.software.map(s => `${clean(s.name)}`);
  pushGroups('Built with open-source software', [{ role: 'With thanks to their authors and contributors', names: sw }]);
}
if ((D.thanks || []).length) pushGroups('Special thanks', [{ role: ' ', names: D.thanks.map(clean) }]);

const out = { director, cards, closing: { line1: 'A PROJECT EON GAME', line2: `© 2026 ${creator.name.toUpperCase()}. ALL RIGHTS RESERVED.`, thanks: 'THANK YOU FOR PLAYING' } };
fs.writeFileSync(path.join(__dirname, '../film/data.js'), '// Built by tools/build_data.js from credits/credits-data.json. Do not edit by hand.\nwindow.CREDITS = ' + JSON.stringify(out, null, 1) + ';\n');
console.log(`film/data.js: ${cards.length} cards`);
