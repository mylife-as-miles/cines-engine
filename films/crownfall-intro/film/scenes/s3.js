/* Scene 3, The Seven Great Houses [L12–L17].
   The map of Aethelgard divides into seven territories around the seven halls, each house's arms rising on its hall.
   The camera visits each house through what it holds, drawn as a small illumination opening on the map: soldiers on a
   mountain pass, crowded granaries, merchants counting coin, furnaces, clerks sealing the blood registries, patrols
   escorting travellers through the forest, a rookery of the First-Born. Then a tapestry: the Seven joining hands; as the
   camera nears, the hands become knives pointed at one another. */
(function () {
  'use strict';
  const K = window.KIT, P = K.P, W = K.W, H = K.H;
  const SCENES = window.SCENES = window.SCENES || {};
  const { clamp, lerp, smooth, ease, easeOut, span, win, rng } = K;
  const INKC = a => `rgba(32,21,12,${a})`;
  const HOUSE = k => K.HOUSES.find(h => h.key === k);

  // ---------------------------------------------------------------- the seven territories (nearest hall, bent by noise, inside the realm)
  const GW = 1000, GH = 825, GS = 2;            // grid cells of 2 map units
  let TERR = null;
  function territories() {
    if (TERR) return TERR;
    const D = K.map.D, halls = D.halls, realm = K.canvas(GW, GH), rx = realm.getContext('2d');
    rx.scale(1 / GS, 1 / GS); rx.beginPath(); for (const p of D.realm) { rx.moveTo(p[0][0], p[0][1]); for (const q of p) rx.lineTo(q[0], q[1]); rx.closePath(); } rx.fillStyle = '#fff'; rx.fill();
    const inside = rx.getImageData(0, 0, GW, GH).data, lab = new Int8Array(GW * GH).fill(-1);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const k = j * GW + i; if (inside[k * 4 + 3] < 128) continue;
      const u = i * GS, v = j * GS, wu = u + (K.fbm(u / 260, v / 260, 3, 31) - 0.5) * 190, wv = v + (K.fbm(u / 260 + 9, v / 260 + 4, 3, 37) - 0.5) * 190;
      let best = 1e12, bi = 0; for (let h = 0; h < halls.length; h++) { const d = (wu - halls[h][0]) ** 2 + (wv - halls[h][1]) ** 2; if (d < best) { best = d; bi = h; } }
      lab[k] = bi;
    }
    const wash = K.canvas(GW, GH), wx = wash.getContext('2d'), wimg = wx.createImageData(GW, GH);
    const bord = K.canvas(GW, GH), bx = bord.getContext('2d'), bimg = bx.createImageData(GW, GH);
    const cols = D.hallHouses.map(k => { const n = parseInt(HOUSE(k).field.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; });
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const k = j * GW + i, l = lab[k]; if (l < 0) continue; const c = cols[l];
      wimg.data[k * 4] = c[0]; wimg.data[k * 4 + 1] = c[1]; wimg.data[k * 4 + 2] = c[2]; wimg.data[k * 4 + 3] = 255;
      const r = i + 1 < GW ? lab[k + 1] : l, d = j + 1 < GH ? lab[k + GW] : l;
      if ((r >= 0 && r !== l) || (d >= 0 && d !== l)) { for (const q of [k, k + 1, k + GW]) if (q < GW * GH) { bimg.data[q * 4] = 140; bimg.data[q * 4 + 1] = 36; bimg.data[q * 4 + 2] = 24; bimg.data[q * 4 + 3] = 235; } }
    }
    wx.putImageData(wimg, 0, 0); bx.putImageData(bimg, 0, 0);
    TERR = { wash, bord };
    return TERR;
  }

  // ---------------------------------------------------------------- the vignettes: small illuminations on the map
  const VW = 420, VH = 280;
  function frame(c, x0, y0, a, sheen) {
    c.save(); c.globalAlpha *= a;
    c.fillStyle = '#e6d6b2'; c.fillRect(x0, y0, VW, VH);
    K.gold(c, cc => { cc.beginPath(); cc.rect(x0 - 10, y0 - 10, VW + 20, VH + 20); cc.rect(x0, y0, VW, VH); }, x0 - 10, y0 - 10, x0 + VW + 10, y0 + VH + 10, { sheen, outlineW: 1.2, rule: 'evenodd' });
    c.restore();
  }
  const ground = (c, x0, y0, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x0, y0 + VH); c.lineTo(x0, y0 + VH * 0.78); c.quadraticCurveTo(x0 + VW / 2, y0 + VH * 0.72, x0 + VW, y0 + VH * 0.8); c.lineTo(x0 + VW, y0 + VH); c.closePath(); c.fill(); };
  const sky = (c, x0, y0, a, b) => { const g = c.createLinearGradient(0, y0, 0, y0 + VH); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(x0, y0, VW, VH); };
  const VIG = {
    armies(c, x0, y0, t) {
      sky(c, x0, y0, '#a9b4b8', '#e2d6bc');
      c.fillStyle = '#8a8f8c'; c.beginPath(); c.moveTo(x0, y0 + 190); c.lineTo(x0 + 90, y0 + 50); c.lineTo(x0 + 180, y0 + 170); c.lineTo(x0 + 260, y0 + 70); c.lineTo(x0 + VW, y0 + 200); c.lineTo(x0 + VW, y0 + VH); c.lineTo(x0, y0 + VH); c.closePath(); c.fill();
      c.fillStyle = 'rgba(245,246,248,0.9)'; for (const [px, py] of [[90, 50], [260, 70]]) { c.beginPath(); c.moveTo(x0 + px, y0 + py); c.lineTo(x0 + px + 22, y0 + py + 30); c.lineTo(x0 + px - 22, y0 + py + 30); c.closePath(); c.fill(); }
      c.fillStyle = '#6a6c66'; c.beginPath(); c.moveTo(x0, y0 + 236); c.quadraticCurveTo(x0 + 200, y0 + 196, x0 + VW, y0 + 222); c.lineTo(x0 + VW, y0 + VH); c.lineTo(x0, y0 + VH); c.closePath(); c.fill();
      for (let i = 0; i < 9; i++) { const u = ((i / 9 + t * 0.035) % 1), px = x0 + 20 + u * (VW - 40), py = y0 + 232 - Math.sin(u * Math.PI) * 26 + 4; K.figure(c, px, py, 56, { kind: 'armour', head: 'helm', hold: i === 4 ? 'banner' : 'spear', walk: t * 5.5 + i * 1.1, face: 1, fill: '#1e1712', banner: HOUSE('armies'), t }); }
    },
    grain(c, x0, y0, t) {
      sky(c, x0, y0, '#d7c08a', '#efe1bc'); ground(c, x0, y0, '#b39a5e');
      c.fillStyle = '#5a3d22'; c.beginPath(); c.moveTo(x0 + 60, y0 + 220); c.lineTo(x0 + 60, y0 + 120); c.lineTo(x0 + 140, y0 + 70); c.lineTo(x0 + 220, y0 + 120); c.lineTo(x0 + 220, y0 + 220); c.closePath(); c.fill();
      c.fillStyle = '#2a1c10'; c.fillRect(x0 + 118, y0 + 160, 44, 60);
      c.fillStyle = '#7a5a30'; c.beginPath(); c.moveTo(x0 + 250, y0 + 220); c.lineTo(x0 + 250, y0 + 90); c.quadraticCurveTo(x0 + 280, y0 + 60, x0 + 310, y0 + 90); c.lineTo(x0 + 310, y0 + 220); c.closePath(); c.fill();
      c.fillStyle = '#c9a85e'; for (let i = 0; i < 14; i++) { const px = x0 + 40 + (i % 7) * 26, py = y0 + 238 + Math.floor(i / 7) * 14; c.beginPath(); c.ellipse(px, py, 13, 9, 0, 0, 6.283); c.fill(); c.strokeStyle = INKC(0.5); c.lineWidth = 1; c.stroke(); }
      for (let i = 0; i < 4; i++) { const u = (i / 4 + t * 0.05) % 1; K.figure(c, x0 + 230 + u * 170, y0 + 252, 50, { kind: 'tunic', head: i % 2 ? 'hood' : 'cap', hold: 'bundle', walk: t * 5 + i, face: -1, fill: '#2a1d12' }); }
      c.strokeStyle = 'rgba(230,200,120,0.8)'; c.lineWidth = 2; for (let i = 0; i < 8; i++) { const yy = y0 + 95 + ((t * 60 + i * 15) % 120); c.beginPath(); c.moveTo(x0 + 280 + Math.sin(i) * 3, yy); c.lineTo(x0 + 280 + Math.sin(i) * 3, yy + 6); c.stroke(); }
    },
    roads(c, x0, y0, t) {
      sky(c, x0, y0, '#c9b78e', '#eadcbc'); ground(c, x0, y0, '#a8905e');
      c.strokeStyle = '#7a6440'; c.lineWidth = 26; c.beginPath(); c.moveTo(x0 - 10, y0 + 250); c.quadraticCurveTo(x0 + 210, y0 + 200, x0 + VW + 10, y0 + 236); c.stroke();
      c.fillStyle = '#5a3d22'; c.fillRect(x0 + 120, y0 + 168, 170, 12); c.fillRect(x0 + 130, y0 + 180, 8, 36); c.fillRect(x0 + 272, y0 + 180, 8, 36);
      c.fillStyle = '#2c3f78'; c.fillRect(x0 + 120, y0 + 162, 170, 8);
      for (let i = 0; i < 6; i++) { const h = 4 + (i % 3) * 3; for (let k = 0; k < h; k++) { c.fillStyle = k % 2 ? '#e6c46a' : '#b8913a'; c.beginPath(); c.ellipse(x0 + 170 + i * 16, y0 + 160 - k * 3, 6, 2.2, 0, 0, 6.283); c.fill(); } }
      c.save(); c.fillStyle = '#d6b45a'; K.device(c, 'scales', x0 + 260, y0 + 136, 26); c.restore();
      K.figure(c, x0 + 100, y0 + 216, 78, { kind: 'robe', head: 'cap', arm: 1.3 + 0.15 * Math.sin(t * 3), bend: 0.5, face: 1, fill: '#24180e' });
      K.figure(c, x0 + 318, y0 + 216, 76, { kind: 'robe', head: 'hood', arm: 1.1, bend: 0.6, face: -1, fill: '#24180e' });
      const cu = (t * 0.06) % 1; K.horse(c, x0 + 30 + cu * 300, y0 + 262, 34, { walk: t * 6, face: 1, fill: '#2a1d12' }); c.fillStyle = '#3a2716'; c.fillRect(x0 - 20 + cu * 300, y0 + 230, 46, 18); c.beginPath(); c.arc(x0 - 8 + cu * 300, y0 + 252, 8, 0, 6.283); c.arc(x0 + 18 + cu * 300, y0 + 252, 8, 0, 6.283); c.fill();
    },
    iron(c, x0, y0, t) {
      sky(c, x0, y0, '#3a2a22', '#6a4a36');
      c.fillStyle = '#2a1d16'; c.beginPath(); c.moveTo(x0 + 70, y0 + VH); c.lineTo(x0 + 70, y0 + 140); c.quadraticCurveTo(x0 + 170, y0 + 30, x0 + 270, y0 + 140); c.lineTo(x0 + 270, y0 + VH); c.closePath(); c.fill();
      c.fillStyle = '#1a120e'; c.fillRect(x0 + 205, y0 + 10, 30, 100);
      const fl = 0.85 + 0.15 * Math.sin(t * 9) + 0.08 * Math.sin(t * 23);
      c.fillStyle = `rgba(255,${150 + 40 * fl},60,1)`; c.beginPath(); c.moveTo(x0 + 130, y0 + VH - 30); c.lineTo(x0 + 130, y0 + 180); c.quadraticCurveTo(x0 + 170, y0 + 140, x0 + 210, y0 + 180); c.lineTo(x0 + 210, y0 + VH - 30); c.closePath(); c.fill();
      K.glow(c, x0 + 170, y0 + 210, 160 * fl, [255, 150, 60], 0.6);
      c.fillStyle = '#1a120e'; c.fillRect(x0 + 300, y0 + 214, 60, 16); c.fillRect(x0 + 316, y0 + 230, 28, 26);
      const hit = Math.max(0, Math.sin(t * 4.2)); K.figure(c, x0 + 360, y0 + 260, 92, { kind: 'tunic', head: 'bare', hold: 'raised', arm: lerp(2.9, 1.7, hit), bend: lerp(0.4, 0.1, hit), face: -1, fill: '#120c08', belt: true });
      if (hit > 0.92) K.glow(c, x0 + 330, y0 + 212, 40, [255, 220, 150], 0.8);
      K.embers(c, t, { n: 26, heat: 0.9, x: x0 + 100, y: y0, w: 280, h: 240, seed: 404 });
      K.smoke(c, t, { n: 6, x: x0 + 190, y: y0 - 120, w: 70, h: 140, color: [40, 32, 28], alpha: 0.5, size: 90, seed: 405 });
    },
    laws(c, x0, y0, t) {
      sky(c, x0, y0, '#d9c094', '#a8865a');
      // a tall window of light behind the clerks
      c.fillStyle = 'rgba(255,240,205,0.55)'; c.beginPath(); c.moveTo(x0 + 175, y0 + 175); c.lineTo(x0 + 175, y0 + 60); c.quadraticCurveTo(x0 + 210, y0 + 25, x0 + 245, y0 + 60); c.lineTo(x0 + 245, y0 + 175); c.closePath(); c.fill();
      c.fillStyle = '#3a2818'; c.fillRect(x0 + 40, y0 + 190, 340, 16); c.fillRect(x0 + 60, y0 + 206, 12, 60); c.fillRect(x0 + 348, y0 + 206, 12, 60);
      // the registry: an open book with a tree of bloodlines
      c.fillStyle = '#efe4c8'; c.beginPath(); c.moveTo(x0 + 130, y0 + 186); c.quadraticCurveTo(x0 + 170, y0 + 170, x0 + 210, y0 + 182); c.quadraticCurveTo(x0 + 250, y0 + 170, x0 + 290, y0 + 186); c.lineTo(x0 + 290, y0 + 192); c.lineTo(x0 + 130, y0 + 192); c.closePath(); c.fill();
      c.save(); c.translate(x0 + 210, y0 + 150); c.strokeStyle = 'rgba(120,30,20,0.8)'; c.lineWidth = 1.2; const tr = (x, y, d, a) => { if (d > 3) return; const L = 22 - d * 5; const nx = x + Math.cos(a) * L, ny = y + Math.sin(a) * L; c.beginPath(); c.moveTo(x, y); c.lineTo(nx, ny); c.stroke(); tr(nx, ny, d + 1, a - 0.5); tr(nx, ny, d + 1, a + 0.5); }; tr(0, 30, 0, -Math.PI / 2); c.restore();
      c.fillStyle = 'rgba(248,240,220,0.0)';
      K.figure(c, x0 + 95, y0 + 262, 86, { kind: 'robe', head: 'coif', arm: 1.5, bend: 0.4, face: 1, fill: '#1e140c' });
      const st = Math.max(0, Math.sin(t * 2.4)); K.figure(c, x0 + 330, y0 + 262, 86, { kind: 'robe', head: 'cap', arm: lerp(1.2, 1.7, st), bend: 0.6, face: -1, fill: '#1e140c' });
      c.fillStyle = '#9b2f1f'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x0 + 300 - i * 18, y0 + 186, 6, 0, 6.283); c.fill(); }
      c.fillStyle = '#e8dcc0'; for (let i = 0; i < 5; i++) c.fillRect(x0 + 52 + i * 14, y0 + 176 - (i % 2) * 4, 10, 14);
      K.glow(c, x0 + 210, y0 + 120, 120, [255, 200, 120], 0.35);
    },
    frontier(c, x0, y0, t) {
      sky(c, x0, y0, '#8d9a90', '#d6cfb2');
      c.fillStyle = '#4b5a4e'; const r = rng(55); for (let i = 0; i < 30; i++) { const px = x0 + r() * VW, py = y0 + 140 + r() * 50, h = 60 + r() * 70; c.beginPath(); c.moveTo(px, py - h); c.lineTo(px + h * 0.25, py); c.lineTo(px - h * 0.25, py); c.closePath(); c.fill(); }
      // mist in the clearing, so the patrol stands out against it
      const mg = c.createLinearGradient(0, y0 + 150, 0, y0 + 250); mg.addColorStop(0, 'rgba(228,224,206,0)'); mg.addColorStop(0.5, 'rgba(228,224,206,0.85)'); mg.addColorStop(1, 'rgba(228,224,206,0.3)'); c.fillStyle = mg; c.fillRect(x0, y0 + 150, VW, 110);
      ground(c, x0, y0, '#8a8e6c');
      for (let i = 0; i < 5; i++) { const u = (i / 6 + t * 0.03) % 1, trav = i === 1 || i === 3; K.figure(c, x0 + 30 + u * (VW - 60), y0 + 254, trav ? 60 : 68, { kind: trav ? 'cloak' : 'armour', head: trav ? 'hood' : 'kettle', hold: trav ? 'bundle' : 'spear', walk: t * 5 + i, face: 1, fill: '#151a14' }); }
      c.fillStyle = '#151a14'; for (const i of [0, 1, 10, 11]) { const px = x0 + (i / 12) * VW + 10, h = 110 + (i % 3) * 30; c.beginPath(); c.moveTo(px, y0 + VH - h); c.lineTo(px + h * 0.22, y0 + VH); c.lineTo(px - h * 0.22, y0 + VH); c.closePath(); c.fill(); }
    },
    beasts(c, x0, y0, t) {
      sky(c, x0, y0, '#4a3e5a', '#9a8aa0');
      c.fillStyle = '#2a2232'; c.beginPath(); c.moveTo(x0 + VW, y0 + VH); c.lineTo(x0 + VW, y0 + 60); c.lineTo(x0 + 300, y0 + 90); c.lineTo(x0 + 260, y0 + 170); c.lineTo(x0 + 200, y0 + VH); c.closePath(); c.fill();
      // a First-Born perched, chained; its wings breathe
      const br = Math.sin(t * 1.2) * 0.06;
      c.save(); c.translate(x0 + 300, y0 + 96); c.fillStyle = '#15101a';
      c.beginPath(); c.moveTo(-20, 0); c.quadraticCurveTo(-50, -60 - br * 200, -150, -90 - br * 300); c.lineTo(-110, -50); c.lineTo(-140, -40); c.lineTo(-90, -20); c.quadraticCurveTo(-60, 0, -30, 10); c.closePath(); c.fill();
      c.beginPath(); c.ellipse(0, 0, 40, 18, -0.3, 0, 6.283); c.fill();
      c.beginPath(); c.moveTo(20, -8); c.quadraticCurveTo(50, -40, 64, -52); c.lineTo(84, -46); c.lineTo(68, -38); c.quadraticCurveTo(52, -20, 34, 6); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-36, 6); c.quadraticCurveTo(-80, 30, -120, 20); c.lineTo(-40, 14); c.fill();
      c.restore();
      c.strokeStyle = '#8a8a90'; c.lineWidth = 2; c.setLineDash([5, 3]); c.beginPath(); c.moveTo(x0 + 330, y0 + 104); c.quadraticCurveTo(x0 + 300, y0 + 180, x0 + 250, y0 + 230); c.stroke(); c.setLineDash([]);
      for (let i = 0; i < 3; i++) K.figure(c, x0 + 60 + i * 60, y0 + 262, 70, { kind: 'cloak', head: 'hood', hold: i === 1 ? 'banner' : 'staff', face: 1, fill: '#140f18', banner: HOUSE('beasts'), t });
    },
  };
  // where each vignette opens, beside its hall (map units), and when (fractions of its line)
  const ORDER = [['armies', 'L13', 0.0, 0.33], ['grain', 'L13', 0.33, 0.66], ['roads', 'L13', 0.66, 1.0], ['iron', 'L14', 0.0, 0.3], ['laws', 'L14', 0.3, 0.68], ['frontier', 'L14', 0.68, 1.0], ['beasts', 'L15', 0.0, 1.0]];
  function hallOf(key) { const D = K.map.D, i = D.hallHouses.indexOf(key); return { x: D.halls[i][0], y: D.halls[i][1], i }; }
  function vigPos(key) { const h = hallOf(key); const right = h.x < 1150; return { x: right ? h.x + 48 : h.x - 48 - VW, y: h.y - VH * 0.7 }; }

  // ---------------------------------------------------------------- the tapestry
  const TW = 2200, TH = 900;
  function tapBase() {
    return K.cached('s3:tap', () => {
      const c = K.canvas(TW, TH), x = c.getContext('2d');
      x.drawImage(K.linen(TW, TH, 77, { base: [210, 192, 152], step: 4 }), 0, 0);
      // borders: bands of stitched beasts and knots, in the manner of an embroidered chronicle
      for (const [y0, y1] of [[0, 120], [TH - 120, TH]]) {
        x.fillStyle = 'rgba(170,140,96,0.35)'; x.fillRect(0, y0, TW, y1 - y0);
        x.strokeStyle = '#6b3a24'; x.lineWidth = 4; x.setLineDash([7, 4]); x.beginPath(); x.moveTo(0, y0 + 8); x.lineTo(TW, y0 + 8); x.moveTo(0, y1 - 8); x.lineTo(TW, y1 - 8); x.stroke();
        x.setLineDash([]); for (let k = 0; k < 22; k++) { const cx = 50 + k * 100, cy = (y0 + y1) / 2; x.strokeStyle = k % 2 ? '#2f4a3a' : '#7a2e1e'; x.lineWidth = 5; x.beginPath(); x.moveTo(cx - 34, cy + 22); x.lineTo(cx + 34, cy - 22); x.stroke(); x.strokeStyle = '#a07a3a'; x.beginPath(); x.ellipse(cx + (k % 2 ? 26 : -26), cy, 12, 18, 0, 0, 6.283); x.stroke(); }
      }
      return c;
    });
  }
  // a stitched figure: outline in running stitch, body in laid wool with couching lines
  function stitchFigure(x, cx, base, h, house, face, knife, t, i) {
    const S = v => v * h;
    const wool = house.field, trim = house.charge;
    x.save(); x.translate(cx, base);
    const laid = (path, col) => { path(); x.fillStyle = col; x.fill(); x.save(); path(); x.clip(); x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 2; for (let k = -h; k < h; k += 6) { x.beginPath(); x.moveTo(k, S(-1.1)); x.lineTo(k + S(0.3), S(0.1)); x.stroke(); } x.restore(); path(); x.strokeStyle = '#3a2416'; x.lineWidth = 3.5; x.setLineDash([9, 4]); x.stroke(); x.setLineDash([]); };
    // legs
    laid(() => { x.beginPath(); x.rect(S(-0.07), S(-0.33), S(0.05), S(0.33)); x.rect(S(0.02), S(-0.33), S(0.05), S(0.33)); }, '#4a3a2a');
    // tunic in the house's colour, its arms on the chest
    laid(() => { x.beginPath(); x.moveTo(S(-0.12), S(-0.78)); x.lineTo(S(0.12), S(-0.78)); x.lineTo(S(0.17), S(-0.3)); x.lineTo(S(-0.17), S(-0.3)); x.closePath(); }, wool);
    x.save(); x.fillStyle = trim; if (house.device !== 'none') K.device(x, house.device, 0, S(-0.55), S(0.08)); x.restore();
    // head with a small crown of thread
    laid(() => { x.beginPath(); x.ellipse(0, S(-0.87), S(0.06), S(0.075), 0, 0, 6.283); }, '#e0c49a');
    x.fillStyle = '#c9a14a'; x.beginPath(); x.moveTo(S(-0.06), S(-0.93)); x.lineTo(S(-0.06), S(-0.99)); x.lineTo(S(-0.03), S(-0.96)); x.lineTo(0, S(-1.01)); x.lineTo(S(0.03), S(-0.96)); x.lineTo(S(0.06), S(-0.99)); x.lineTo(S(0.06), S(-0.93)); x.closePath(); x.fill();
    x.restore();
  }
  // arms: joined hands (k=0) become knives pointed at the neighbour (k=1)
  function stitchArms(x, ax, bx, base, h, k, t, seed) {
    const S = v => v * h, sh = base + S(-0.74), mid = (ax + bx) / 2;
    x.save(); x.lineCap = 'round'; x.strokeStyle = '#3a2416';
    // joined: two arms meeting in a clasp above the gap
    if (k < 1) { x.globalAlpha = 1 - k; x.lineWidth = S(0.045); x.beginPath(); x.moveTo(ax + S(0.11), sh); x.quadraticCurveTo(mid - S(0.05), sh - S(0.12), mid, sh - S(0.1)); x.quadraticCurveTo(mid + S(0.05), sh - S(0.12), bx - S(0.11), sh); x.stroke(); x.strokeStyle = '#d8b88a'; x.lineWidth = S(0.03); x.stroke(); x.fillStyle = '#e0c49a'; x.beginPath(); x.arc(mid, sh - S(0.1), S(0.035), 0, 6.283); x.fill(); x.strokeStyle = '#3a2416'; x.lineWidth = 2.5; x.stroke(); }
    // knives: each draws back an arm and points a blade at the other
    if (k > 0) {
      x.globalAlpha = k;
      for (const [from, dir] of [[ax, 1], [bx, -1]]) {
        const hx = from + dir * S(0.2), hy = sh + S(0.02) + (dir > 0 ? -S(0.02) : S(0.02));
        x.strokeStyle = '#3a2416'; x.lineWidth = S(0.045); x.beginPath(); x.moveTo(from + dir * S(0.11), sh); x.lineTo(hx, hy); x.stroke(); x.strokeStyle = '#d8b88a'; x.lineWidth = S(0.03); x.stroke();
        // the blade: stitched in pale silver thread, a red thread along its edge
        x.fillStyle = '#c9ccd2'; x.beginPath(); x.moveTo(hx, hy - S(0.018)); x.lineTo(hx + dir * S(0.17), hy); x.lineTo(hx, hy + S(0.018)); x.closePath(); x.fill(); x.strokeStyle = '#3a2416'; x.lineWidth = 2.5; x.stroke();
        x.strokeStyle = 'rgba(155,47,31,0.9)'; x.lineWidth = 2; x.beginPath(); x.moveTo(hx + dir * S(0.02), hy + S(0.012)); x.lineTo(hx + dir * S(0.15), hy + S(0.003)); x.stroke();
        x.fillStyle = '#5a3a22'; x.fillRect(hx - S(0.03), hy - S(0.012), S(0.06), S(0.024));
      }
    }
    x.restore();
  }

  SCENES[3] = {
    join: 'dissolve', joinDur: 1.4,
    draw(ctx, t, sc) {
      const L12 = K.cue('L12'), L13 = K.cue('L13'), L14 = K.cue('L14'), L15 = K.cue('L15'), L16 = K.cue('L16'), L17 = K.cue('L17');
      const tapIn = L16.start - 0.9;
      const D = K.map.D, blod = D.places.blodsetl;
      if (t < tapIn + 1.4) {
        // ---- the map, divided; the camera visits each house
        const keys = [{ t: sc.start, x: 1040, y: 880, z: 0.86 }, { t: L12.end, x: 1000, y: 900, z: 0.92 }];
        for (const [k, cue, a, b] of ORDER) { const C = K.cue(cue), ts = lerp(C.start, C.end, a), te = lerp(C.start, C.end, b), h = hallOf(k), vp = vigPos(k); keys.push({ t: ts + 0.15, x: (h.x + vp.x + VW / 2) / 2, y: (h.y + vp.y + VH / 2) / 2 + 20, z: 1.85 }); keys.push({ t: Math.max(ts + 0.5, te - 0.25), x: (h.x + vp.x + VW / 2) / 2 + 6, y: (h.y + vp.y + VH / 2) / 2 + 24, z: 1.95 }); }
        keys.push({ t: L15.end + 0.3, x: 1000, y: 860, z: 0.95 });
        const cam = K.camPath(t, keys);
        ctx.fillStyle = '#120d09'; ctx.fillRect(0, 0, W, H);
        ctx.save(); K.cam(ctx, cam.x, cam.y, cam.z);
        K.map.draw(ctx, {});
        const T = territories(), grow = ease(span(t, sc.start + 0.4, L12.end + 0.4)), rad = 60 + grow * 1500;
        ctx.save(); ctx.beginPath(); ctx.arc(blod.x, blod.y, rad, 0, 6.283); ctx.clip();
        ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.22; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(T.wash, 0, 0, 2000, 1650);
        ctx.globalAlpha = 0.9; ctx.drawImage(T.bord, 0, 0, 2000, 1650); ctx.restore();
        // the Blood-Throne at Blodsetl, a red seal
        const sealA = smooth(span(t, L12.start, L12.start + 1));
        if (sealA > 0) { K.glow(ctx, blod.x, blod.y, 70, [200, 40, 30], 0.35 * sealA); }
        // the arms of each house rise on its hall
        D.hallHouses.forEach((k, i) => { const a = smooth(span(t, L12.start + 0.5 + i * 0.32, L12.start + 1.1 + i * 0.32)); if (a <= 0) return; const h = hallOf(k); ctx.save(); ctx.translate(h.x, h.y - 30 - 10 * (1 - a)); K.shield(ctx, 0, 0, 22, HOUSE(k), { alpha: a, sheen: 0.4 + 0.3 * Math.sin(t + i) }); ctx.restore(); });
        // vignettes open beside their halls, then fold away
        for (const [k, cue, a, b] of ORDER) {
          const C = K.cue(cue), ts = lerp(C.start, C.end, a) - 0.15, te = lerp(C.start, C.end, b) + 0.2, va = win(t, ts, te + 0.6, 0.45, 0.6);
          if (va <= 0) continue;
          const vp = vigPos(k), h = hallOf(k);
          ctx.save(); ctx.globalAlpha = va; ctx.strokeStyle = 'rgba(155,47,31,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(h.x, h.y - 20); ctx.lineTo(vp.x + (vp.x > h.x ? 0 : VW), vp.y + VH / 2); ctx.stroke(); ctx.restore();
          const Lv = K.layer('s3:vig', VW * 2, VH * 2), vx = Lv.getContext('2d'); vx.scale(2, 2);
          frame(vx, 0, 0, 1, 0.5); vx.save(); vx.beginPath(); vx.rect(0, 0, VW, VH); vx.clip(); VIG[k](vx, 0, 0, t); vx.restore();
          vx.save(); vx.globalCompositeOperation = 'multiply'; vx.globalAlpha = 0.25; K.tile(vx, K.paperGrain(), 0, 0, VW, VH); vx.restore();
          const open = easeOut(clamp((t - ts) / 0.5));
          ctx.save(); ctx.globalAlpha = va; ctx.translate(vp.x + VW / 2, vp.y + VH / 2); ctx.scale(lerp(0.6, 1, open), lerp(0.6, 1, open));
          ctx.shadowColor = 'rgba(30,18,8,0.45)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; ctx.drawImage(Lv, -VW / 2, -VH / 2, VW, VH); ctx.restore();
          K.gold(ctx, cc => { cc.beginPath(); cc.rect(vp.x - 10, vp.y - 10, VW + 20, VH + 20); cc.rect(vp.x, vp.y, VW, VH); }, vp.x - 10, vp.y - 10, vp.x + VW + 10, vp.y + VH + 10, { sheen: 0.3 + 0.4 * span(t, ts, te), outlineW: 1.2, rule: 'evenodd', alpha: va });
        }
        ctx.restore();
        K.specks(ctx, t, { kind: 'dust', n: 40, alpha: 0.3, seed: 303 });
      }
      if (t >= tapIn) {
        // ---- the tapestry: joined hands become knives
        const a = smooth(span(t, tapIn, tapIn + 1.4)), knife = smooth(span(t, L17.start + 0.4, L17.start + 2.6));
        const u = span(t, tapIn, sc.end + 1.4), z = lerp(0.82, 2.1, ease(span(t, L17.start - 0.4, L17.end + 1.2))) * (1 + 0.02 * u), cx = lerp(TW / 2, TW / 2 + 140, ease(span(t, L17.start, L17.end + 1))), cy = lerp(TH / 2, TH / 2 - 120, ease(span(t, L17.start - 0.4, L17.end + 1)));
        const L = K.layer('s3:tapL'), x = L.getContext('2d');
        x.fillStyle = '#16100a'; x.fillRect(0, 0, W, H);
        x.save(); K.cam(x, cx, cy, z); x.drawImage(tapBase(), 0, 0);
        const order = ['beasts', 'armies', 'roads', 'laws', 'grain', 'iron', 'frontier'], base = TH - 170, fh = 520, gap = 280, x0 = TW / 2 - gap * 3;
        for (let i = 0; i < 6; i++) stitchArms(x, x0 + i * gap, x0 + (i + 1) * gap, base, fh, knife, t, i);
        order.forEach((k, i) => stitchFigure(x, x0 + i * gap, base, fh, HOUSE(k), 1, knife, t, i));
        // the long thread of the border, one red strand pulling taut at the end
        const taut = smooth(span(t, L17.end - 0.2, sc.end));
        x.strokeStyle = `rgba(155,47,31,${0.6 + 0.4 * taut})`; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 150); for (let k = 0; k <= 40; k++) x.lineTo(k * TW / 40, 150 + Math.sin(k * 0.9 + t) * 4 * (1 - taut)); x.stroke();
        x.restore();
        K.vignette(x, 0.55, '20,10,4', 0.3);
        ctx.globalAlpha = a; ctx.drawImage(L, 0, 0); ctx.globalAlpha = 1;
        // the light lowers as the knives appear
        if (knife > 0) { ctx.fillStyle = `rgba(30,10,6,${0.25 * knife})`; ctx.fillRect(0, 0, W, H); }
      }
      K.paperTooth(ctx, 0.1);
      K.vignette(ctx, 0.45, '20,12,6', 0.35);
    },
  };
})();
