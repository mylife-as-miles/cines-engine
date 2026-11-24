// Storyboard stills: node render.js <spec.json> [more.json ...] [--out dir] [--only 3.4,3.5] [--at mid|start|end|<s>]
//                                   [--raw] [--cols 3]
// Each shot is rendered at its boardTime (or --at), composed with a header (title · shot · time, camera text), the
// 2.39:1 picture and a footer (dialogue, note). Writes shot_<n>.png per shot and board.jpg, a contact sheet.
// --raw also writes the bare 2.39:1 picture (pic_<n>.png).
const fs = require('fs'), path = require('path');
const { openBoard, readSpecs, shotDur, args, dataToBuf } = require('./lib');

(async () => {
  const { pos, opt } = args(process.argv.slice(2));
  if (!pos.length) { console.error('usage: node render.js <spec.json> [...] [--out dir] [--only n,n] [--at mid|start|end|s] [--raw]'); process.exit(2); }
  const specs = readSpecs(pos);
  const outDir = opt.out ?? path.join(__dirname, 'out', 'board');
  fs.mkdirSync(outDir, { recursive: true });
  const only = opt.only ? String(opt.only).split(',') : null;
  const B = await openBoard();
  const files = [], thumbs = [];
  const t0 = Date.now();
  for (const spec of specs) for (const s of spec.shots) {
    if (only && !only.includes(String(s.n))) continue;
    const dur = shotDur(s);
    const at = opt.at ?? s.boardTime ?? 'mid';
    const t = at === 'mid' ? dur / 2 : at === 'start' ? 0 : at === 'end' ? Math.max(0, dur - 1 / 24) : +at;
    const ts = Date.now();
    const url = await B.page.evaluate(async ({ spec, s, t }) => window.frame(spec, s, t, 'still', { type: 'image/png' }), { spec: { title: spec.title, scene: spec.scene, subtitleNames: spec.subtitleNames }, s, t });
    const name = `shot_${String(s.n).replace(/[^\w.-]/g, '_')}.png`;
    fs.writeFileSync(path.join(outDir, name), dataToBuf(url));
    if (opt.raw) {
      const pic = await B.page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
      fs.writeFileSync(path.join(outDir, `pic_${String(s.n).replace(/[^\w.-]/g, '_')}.png`), dataToBuf(pic));
    }
    files.push(path.join(outDir, name));
    thumbs.push(await B.page.evaluate(() => window.thumb(640)));
    console.log(`shot ${s.n}  ${((Date.now() - ts) / 1000).toFixed(2)} s  -> ${name}`);
  }
  if (files.length) {
    const cols = +(opt.cols ?? 3);
    const sheet = await B.page.evaluate(async ({ srcs, cols }) => {
      const load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = src; });
      const ims = await Promise.all(srcs.map(load));
      const cw = 640, ch = Math.round(cw * ims[0].height / ims[0].width), rows = Math.ceil(ims.length / cols);
      const c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch;
      const g = c.getContext('2d'); g.fillStyle = '#141414'; g.fillRect(0, 0, c.width, c.height);
      ims.forEach((im, i) => g.drawImage(im, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch));
      return c.toDataURL('image/jpeg', 0.9);
    }, { srcs: thumbs, cols });
    fs.writeFileSync(path.join(outDir, 'board.jpg'), dataToBuf(sheet));
    console.log('wrote', path.join(outDir, 'board.jpg'), `(${files.length} shots, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
  await B.close();
})().catch(e => { console.error(e); process.exit(1); });
