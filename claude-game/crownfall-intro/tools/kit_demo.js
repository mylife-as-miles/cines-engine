// A sheet of the kit's pieces, to check the look:  node tools/kit_demo.js [out.png]
const { open } = require('./film'); const fs = require('fs');
(async () => {
  const out = process.argv[2] || 'out/kit_demo.png';
  const { browser, page, errs } = await open();
  const r = await page.evaluate(() => {
    const K = KIT, P = K.P, c = document.querySelector('canvas'), x = c.getContext('2d'); const t0 = performance.now();
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over';
    const page = K.cached('demo:page', () => K.parchment(1920, 1080, 11, { folds: [{ x: 0.5 }] }));
    x.drawImage(page, 0, 0);
    // coast with hachure, mountains, trees, compass
    const cst = K.coast(420, 300, 300, 190, 5, 0.32);
    K.hachure(x, cst, 6, 7);
    K.ink(x, c2 => { c2.lineWidth = 2.2; K.poly(c2, cst); c2.stroke(); }, { bleed: 1.5 });
    for (let i = 0; i < 9; i++) K.mountain(x, 300 + i * 32 + (i % 2) * 10, 290 + (i % 3) * 18, 34, 100 + i);
    for (let i = 0; i < 14; i++) K.tree(x, 420 + (i % 7) * 22, 380 + Math.floor(i / 7) * 24, 18, 'pine', { solid: i % 2 === 0 });
    K.compass(x, 760, 200, 70, 0.5);
    K.text(x, 'AETHELGARD', 430, 470, '600 30px Cinzel', K.rgba(P.ink, 0.85), 10, 'center');
    // nib calligraphy and a wash
    const pts = K.bez([[120, 640], [220, 520], [320, 760], [420, 640], [520, 520], [620, 760], [720, 640]], 24);
    K.ink(x, c2 => K.nib(c2, pts, { w: 14, jit: 0.2, seed: 3 }), { bleed: 1.2 });
    K.wash(x, c2 => { c2.beginPath(); c2.ellipse(300, 880, 170, 90, 0.2, 0, 6.283); }, P.vermilion, 0.45, { bbox: [120, 780, 360, 200] });
    K.wash(x, c2 => { c2.beginPath(); c2.ellipse(560, 900, 150, 80, -0.2, 0, 6.283); }, P.ultramarine, 0.45, { bbox: [400, 800, 320, 200] });
    // figures in a row
    const kinds = [['robe', 'crown', 'staff'], ['robe', 'hood', 'none'], ['tunic', 'cap', 'spear'], ['armour', 'helm', 'spear'], ['child', 'bare', 'none'], ['robe', 'veil', 'scroll'], ['tunic', 'hood', 'torch'], ['cloak', 'coif', 'banner']];
    kinds.forEach(([kind, head, hold], i) => K.figure(x, 960 + i * 110, 560, kind === 'child' ? 150 : 230, { kind, head, hold, mode: 'multiply', walk: i % 3 === 0 ? i : undefined, face: i % 2 ? -1 : 1, t: 1, bannerFill: P.vermilion }));
    K.horse(x, 1180, 1000, 220, { walk: 1.2, mode: 'multiply', rider: { head: 'helm', hold: 'spear' } });
    // shields and banners
    K.HOUSES.forEach((h, i) => K.shield(x, 1500 + (i % 4) * 100, 660 + Math.floor(i / 4) * 150, 38, h));
    K.shield(x, 1800, 810, 38, K.LESSER);
    K.banner(x, 1600, 900, 90, 160, K.HOUSES[6], 2.0, { wind: 0.6 });
    K.banner(x, 1760, 900, 90, 160, K.BLANK, 2.0, { wind: 0.4 });
    // gold leaf disc
    K.gold(x, c2 => { c2.beginPath(); c2.arc(860, 860, 70, 0, 6.283); }, 790, 790, 930, 930, { sheen: 0.55 });
    K.paperTooth(x, 0.15); K.vignette(x, 0.4); K.grain(x, 1, 0.045);
    return { ms: performance.now() - t0, url: c.toDataURL('image/png') };
  });
  fs.writeFileSync(out, Buffer.from(r.url.split(',')[1], 'base64')); await browser.close();
  if (errs.length) console.log([...new Set(errs)].join('\n')); console.log(`wrote ${out} (${r.ms.toFixed(0)} ms)`);
})();
