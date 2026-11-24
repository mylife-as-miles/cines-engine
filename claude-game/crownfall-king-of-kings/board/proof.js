// Proof: one frame per colour key, beside the bible's key (bible pp.5-10). node proof.js [--only 01_foundry,...]
// Writes proof/frames/<id>.png (the bare 2.39:1 picture), proof/keys_vs_bible.jpg and proof/extras.jpg (the close
// crown set, the hull, the four matching hand inserts), and prints the warm render time per frame.
const fs = require('fs'), path = require('path');
const { openBoard, args, dataToBuf } = require('./lib');

const KEYS = [
  { id: '01_foundry', scene: 'foundry', preset: 'key', label: '1  The foundry' },
  { id: '02_gate', scene: 'city', preset: 'gate', label: '2  The fallen gate' },
  { id: '03_held_stone', scene: 'forecourt', preset: 'heldStone', label: '3  The held stone' },
  { id: '04_gatehouse', scene: 'gatehouse', preset: 'gatehouse', label: '4  The gatehouse' },
  { id: '05_break_crown', scene: 'city', preset: 'breakCrown', label: '5  "Break the Crown!"' },
  { id: '06_open_hand', scene: 'gatehouse', preset: 'openHand', label: '6  The open hand' },
  { id: '07_fall', scene: 'fall', preset: 'fall', label: '7  The fall' },
  { id: '08_ruins', scene: 'ruins', preset: 'ruins', label: '8  The ruins at sunrise' },
  { id: '09_first_ship', scene: 'ship', preset: 'firstShip', label: '9  The first ship' },
  { id: '10_ward', scene: 'ship', preset: 'ward', label: '10  The ward' },
  { id: '11_banners', scene: 'ship', preset: 'banners', label: '10  The banners' },
];
const EXTRAS = [
  { id: 'x1_crown', scene: 'crown', preset: 'shutter', label: 'Crown close set: the stalled shutter (6.1-6.2)' },
  { id: 'x2_arcade', scene: 'crown', preset: 'arcade', label: 'Crown close set: the battery in the high arcades' },
  { id: 'x3_hull', scene: 'hull', preset: 'key', label: '9.3 Inside the hull: the scarred coupling' },
  { id: 'x4_hand_saves', scene: 'forecourt', preset: 'hand34', label: '3.4 Open: it saves' },
  { id: 'x5_hand_destroys', scene: 'gatehouse', preset: 'hand63', label: '6.3 Open: it destroys' },
  { id: 'x6_hand_protects', scene: 'ship', preset: 'hand103', label: '10.3 Open: another protects' },
  { id: 'x7_hand_war', scene: 'ship', preset: 'hand1010', label: '10.10 Closed: war' },
  { id: 'x8_wrist', scene: 'forecourt', preset: 'wrist35', label: '3.5 The wrist (shallow focus)' },
  { id: 'x9_breach_boy', scene: 'gatehouse', preset: 'breachBoy', label: '4.7 The boy under the arch, through the breach' },
];

(async () => {
  const { opt } = args(process.argv.slice(2));
  const only = opt.only ? String(opt.only).split(',') : null;
  const outDir = path.join(__dirname, 'proof'), frDir = path.join(outDir, 'frames');
  fs.mkdirSync(frDir, { recursive: true });
  const B = await openBoard();
  const times = [];
  const todo = [...KEYS, ...EXTRAS].filter(k => !only || only.includes(k.id));
  for (const k of todo) {
    const ts = Date.now();
    await B.page.evaluate(async (k) => { await window.setScene(k.scene); }, k);
    const tScene = Date.now() - ts;
    const r = await B.page.evaluate(async (k) => {
      const p = window.preset(k.preset);
      if (!p) return { err: `no preset ${k.preset} in ${k.scene}` };
      window.setState(p.state ?? {});
      window.setTime(p.t ?? 2);
      window.drawShot(p.cam);                            // warm-up (shader compile)
      const ms = [];
      for (let i = 0; i < 3; i++) { const a = performance.now(); window.setTime((p.t ?? 2) + i / 24); window.drawShot(p.cam); const gl = E.renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); ms.push(performance.now() - a); }
      window.setTime(p.t ?? 2); window.drawShot(p.cam);
      return { url: window.pictureURL('image/png'), ms };
    }, k);
    if (r.err) { console.error(r.err); continue; }
    fs.writeFileSync(path.join(frDir, `${k.id}.png`), dataToBuf(r.url));
    const warm = r.ms.slice(1).reduce((a, b) => a + b, 0) / (r.ms.length - 1);
    times.push({ id: k.id, scene: tScene, warm });
    console.log(`${k.id.padEnd(18)} set ${String(tScene).padStart(6)} ms   frame ${warm.toFixed(0).padStart(5)} ms`);
  }
  // sheets
  const mk = async (list, file, withBible) => {
    const items = list.filter(k => fs.existsSync(path.join(frDir, `${k.id}.png`))).map(k => ({
      label: k.label,
      mine: 'data:image/png;base64,' + fs.readFileSync(path.join(frDir, `${k.id}.png`)).toString('base64'),
      bible: withBible && fs.existsSync(path.join(outDir, 'bible', `${k.id}.png`)) ? 'data:image/png;base64,' + fs.readFileSync(path.join(outDir, 'bible', `${k.id}.png`)).toString('base64') : null,
    }));
    if (!items.length) return;
    const url = await B.page.evaluate(async ({ items, withBible }) => {
      const load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = src; });
      const cw = 640, ch = Math.round(640 / 2.39), lab = 30, gap = 14;
      const cols = withBible ? 2 : 3, n = items.length, rows = withBible ? n : Math.ceil(n / 3);
      const c = document.createElement('canvas'); c.width = cols * cw + (cols - 1) * gap + 2 * gap; c.height = 60 + rows * (ch + lab + gap) + gap;
      const g = c.getContext('2d'); g.fillStyle = '#101113'; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = '#D9D2C2'; g.font = '500 24px "EB Garamond", serif';
      g.fillText(withBible ? 'Crownfall: King of Kings — board frames (left) against the bible colour keys (right)' : 'Crownfall: King of Kings — board extras', gap, 38);
      for (let i = 0; i < n; i++) {
        const it = items[i];
        const r = withBible ? i : Math.floor(i / 3), col = withBible ? 0 : i % 3;
        const x = gap + col * (cw + gap), y = 60 + r * (ch + lab + gap);
        g.fillStyle = '#c9a25a'; g.font = 'bold 16px sans-serif'; g.fillText(it.label, x, y + 20);
        g.drawImage(await load(it.mine), x, y + lab, cw, ch);
        if (it.bible) { g.fillStyle = '#8b8b8b'; g.font = '14px sans-serif'; g.fillText('bible', x + cw + gap, y + 20); g.drawImage(await load(it.bible), x + cw + gap, y + lab, cw, ch); }
      }
      return c.toDataURL('image/jpeg', 0.9);
    }, { items, withBible });
    fs.writeFileSync(path.join(outDir, file), dataToBuf(url));
    console.log('wrote', path.join(outDir, file));
  };
  await mk(KEYS, 'keys_vs_bible.jpg', true);
  await mk(EXTRAS, 'extras.jpg', false);
  if (times.length) {
    const avg = times.reduce((a, b) => a + b.warm, 0) / times.length;
    console.log(`mean warm frame ${avg.toFixed(0)} ms over ${times.length} keys`);
    fs.writeFileSync(path.join(outDir, 'timing.json'), JSON.stringify(times, null, 1));
  }
  await B.close();
})().catch(e => { console.error(e); process.exit(1); });
