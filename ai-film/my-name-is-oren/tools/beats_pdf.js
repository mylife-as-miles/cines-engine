// Render design/BEATS.md as a printable beat sheet: design/BEATS.pdf (A4 landscape).
//
//   node tools/beats_pdf.js            (from the production folder)
//
// The markdown is the source; this only lays it out. It understands what BEATS.md uses: # and ## headings,
// paragraphs, pipe tables, **bold**, *italic* and `code`. Fonts are local (Liberation Mono, with Courier metrics, for the title, as on
// the screenplay; Inter for the text; Chromium cannot use the installed Type 1 Courier 10 Pitch), so the render needs no network.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const HERE = path.resolve(__dirname, '..');
const SRC = path.join(HERE, 'design', 'BEATS.md');
const OUT = path.join(HERE, 'design', 'BEATS.pdf');
const DATE = '19 November 2026';

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = s => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>');
const cells = row => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

function toHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0, para = [], section = null;
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const close = () => { if (section) { out.push('</section>'); section = null; } };
  while (i < lines.length) {
    const ln = lines[i];
    if (/^# /.test(ln)) { flush(); i++; continue; }                     // the title is drawn by the template
    if (/^## /.test(ln)) {
      flush(); close();
      const t = ln.slice(3).trim();
      const m = t.match(/^([IVX]+)\. (.+?) \((.+)\)$/);                  // "I. The polite street (0:00–0:34)"
      section = m ? 'movement' : 'plain';
      out.push(`<section class="${section}">`);
      out.push(m ? `<h2><span class="num">${m[1]}</span><span class="name">${inline(m[2])}</span><span class="span">${m[3]}</span></h2>`
                 : `<h2>${inline(t)}</h2>`);
      i++; continue;
    }
    if (/^\|/.test(ln)) {
      flush();
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      const kind = head.length === 5 ? 'beats' : head.length === 3 ? 'markers' : 'threads';
      out.push(`<table class="${kind}"><thead><tr>${head.map(h => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>` +
        body.map(r => `<tr>${r.map((c, k) => kind === 'beats' && k === 2
          ? `<td>${c.split(', ').map(id => `<span class="id">${inline(id)}</span>`).join(', ')}</td>`   // keep "A30–A33" whole
          : `<td>${inline(c)}</td>`).join('')}</tr>`).join('') + '</tbody></table>');
      continue;
    }
    if (ln.trim() === '') { flush(); i++; continue; }
    para.push(ln.trim()); i++;
  }
  flush(); close();
  return out.join('\n');
}

const CSS = `
@page { size: A4 landscape; margin: 13mm 14mm 15mm 14mm; }
:root { --ink: #1b1b1a; --soft: #5c5a55; --rule: #d9d5cc; --band: #f3f0e8; --hivis: #e2b714; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: Inter, 'Liberation Sans', sans-serif; color: var(--ink); font-size: 8.6pt; line-height: 1.42; background: #fff; }
.title { display: grid; grid-template-columns: 1fr auto; align-items: end; border-bottom: 2.2pt solid var(--ink); padding-bottom: 7pt; margin-bottom: 10pt; }
.title h1 { font-family: 'Liberation Mono', monospace; font-weight: 700; font-size: 26pt; letter-spacing: .04em; margin: 0; line-height: 1; }
.title .sub { font-size: 10pt; color: var(--soft); margin-top: 5pt; }
.title .meta { text-align: right; font-size: 8.4pt; color: var(--soft); line-height: 1.5; }
.title .meta b { color: var(--ink); font-weight: 600; }
.title .bar { display: inline-block; width: 26pt; height: 5pt; background: var(--hivis); margin-bottom: 6pt; }
p { margin: 0 0 6pt; max-width: 235mm; }
code { font-family: 'JetBrains Mono', monospace; font-size: .9em; background: var(--band); padding: 0 2pt; border-radius: 2pt; }
section { margin-top: 12pt; break-inside: avoid; }
section.plain h2 { font-size: 11pt; font-weight: 700; margin: 0 0 5pt; letter-spacing: .01em; }
section.movement h2 { display: flex; align-items: baseline; gap: 8pt; margin: 0 0 5pt; padding: 3pt 0 4pt 9pt; border-left: 5pt solid var(--hivis); font-size: 12pt; }
h2 .num { font-family: 'Liberation Mono', monospace; font-weight: 700; min-width: 22pt; }
h2 .name { font-weight: 700; }
h2 .span { margin-left: auto; font-family: 'JetBrains Mono', monospace; font-size: 8.5pt; font-weight: 500; color: var(--soft); }
table { width: 100%; border-collapse: collapse; margin: 0 0 4pt; }
thead { display: table-header-group; }
th { text-align: left; font-size: 7pt; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: var(--soft); border-bottom: 1pt solid var(--ink); padding: 3pt 6pt 3pt 0; }
td { vertical-align: top; padding: 4.5pt 8pt 4.5pt 0; border-bottom: .6pt solid var(--rule); }
tr { break-inside: avoid; }
table.beats td:nth-child(1) { width: 15%; }
table.beats td:nth-child(2) { width: 8.5%; font-family: 'JetBrains Mono', monospace; font-size: 7.8pt; white-space: nowrap; }
table.beats td:nth-child(3) { width: 12.5%; font-family: 'JetBrains Mono', monospace; font-size: 7.4pt; color: var(--soft); }
table.beats td:nth-child(3) .id { white-space: nowrap; }
table.beats td:nth-child(4) { width: 41%; }
table.beats td:nth-child(5) { width: 23%; color: #2e2c28; font-style: italic; }
table.beats td:nth-child(5) strong { font-style: normal; background: var(--hivis); padding: 0 2.5pt; color: var(--ink); }
table.beats td:nth-child(1) strong { font-family: 'JetBrains Mono', monospace; font-weight: 700; margin-right: 3pt; }
table.markers { width: 62%; }
table.markers td:nth-child(3) { font-family: 'JetBrains Mono', monospace; font-size: 7.8pt; }
table.threads td:nth-child(1) { width: 12%; }
`;

(async () => {
  const md = fs.readFileSync(SRC, 'utf8');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>My Name Is Oren: beats</title><style>${CSS}</style></head><body>
<header class="title"><div><span class="bar"></span><h1>MY NAME IS OREN</h1><div class="sub">Beat sheet · 32 beats in seven movements · contest cut 6:45</div></div>
<div class="meta"><b>A film by Osita Miles</b><br>Written by Osita Miles<br>Draft · ${DATE}</div></header>
${toHtml(md)}
</body></html>`;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: OUT, format: 'A4', landscape: true, printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;font-family:Inter,sans-serif;font-size:7pt;color:#77736b;padding:0 14mm;display:flex;justify-content:space-between">
      <span>My Name Is Oren · Beats · Draft · ${DATE}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  });
  await browser.close();
  console.log(OUT);
})();
