// One full-resolution frame: node tools/frame.js Q02 3.5 out/q02.png    (sequence-local seconds)
//                            node tools/frame.js ALL 27.8 out/f.png     (global seconds on the narration clock)
//                            node tools/frame.js ALL w:blinks out/f.png (at a word anchor: w:<word>[#n][+offset], e.g. w:no#3+0.5)
const { open } = require('./film');
(async () => {
  const [id, t, out = 'out/frame.png'] = process.argv.slice(2).filter(a => !a.startsWith('--'));
  if (!id || t == null) { console.log('usage: node tools/frame.js <Q02|ALL> <seconds|w:word[#n][+off]> [out.png]'); process.exit(1); }
  const { browser, page, errs } = await open();
  const r = await page.evaluate(({ id, t }) => {
    let tg;
    if (/^w:/.test(t)) { const m = t.slice(2).match(/^([^#+-]+)(?:#(\d+))?([+-][\d.]+)?$/); tg = FILM.W(m[1].replace(/_/g, ' '), m[2] ? +m[2] : 1) + (m[3] ? +m[3] : 0); }
    else { tg = +t; if (id.toUpperCase() !== 'ALL') { const s = FILM.seqs.find(q => q.id.toUpperCase() === id.toUpperCase().slice(0, 3)); if (!s) return { error: 'no sequence ' + id }; tg += s.start; } }
    FILM.renderAt(tg); const sh = FILM.shotAt(tg);
    return { url: document.querySelector('canvas').toDataURL('image/png'), tg, shot: sh.seq.id + ' · ' + sh.name, warnings: FILM.warnings };
  }, { id, t });
  if (r.error) { console.log(r.error); await browser.close(); process.exit(2); }
  require('fs').writeFileSync(out, Buffer.from(r.url.split(',')[1], 'base64'));
  console.log(`ok ${out}  t=${r.tg.toFixed(3)} s  ${r.shot}`);
  if (r.warnings.length) console.log('warnings:\n  ' + r.warnings.join('\n  '));
  const uniq = [...new Set(errs)].filter(e => !/\[film\]/.test(e)); if (uniq.length) console.log(uniq.slice(0, 20).join('\n'));
  await browser.close();
})();
