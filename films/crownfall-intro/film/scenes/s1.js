/* Scene 1, The King Who Vanished [L01–L05].
   Ink spreads across the map of Aethelgard. The camera rises past the map's border to an illumination set above it:
   the Hollow King, crowned in gold, standing over an assembly of rulers. As the camera nears, his painted face fades
   and the vellum tears where it was; then the whole figure lifts off the page, the rulers reach for the empty dais,
   and the camera falls back to the map, where seven small flames light at the seven halls. */
(function () {
  'use strict';
  const K = window.KIT, P = K.P, W = K.W, H = K.H;
  const SCENES = window.SCENES = window.SCENES || {};
  const { clamp, lerp, smooth, ease, easeOut, span, win, rng } = K;

  // the illumination sits above the map sheet, in the same world units (the map is 0..2000 x 0..1650)
  const PX = 380, PY = -880, PW = 1240, PH = 800, PS = 2;          // panel origin, size, pixels per unit
  const KX = PX + PW / 2, KY = PY + 690, KH = 470;                    // the King's feet and height
  const FACE = { x: KX, y: KY - 44 - KH * 0.868, rx: 17, ry: 21 };   // on the head (the King stands 44 up, on the dais)
  const INKC = a => `rgba(32,21,12,${a})`;

  // ---------------------------------------------------------------- the panel: frame, diaper grounds, dais, rulers
  function archPath(c, x0, y0, w, h, ap, fresh = true) { if (fresh) c.beginPath(); c.moveTo(x0, y0 + h); c.lineTo(x0, y0 + ap); c.quadraticCurveTo(x0, y0, x0 + w / 2, y0 - ap * 0.15); c.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + ap); c.lineTo(x0 + w, y0 + h); c.closePath(); }
  function diaper(c, x0, y0, w, h, a, b, step, seed) {
    const r = rng(seed);
    for (let j = 0; j * step < h + step; j++) for (let i = 0; i * step < w + step; i++) { c.fillStyle = (i + j) % 2 ? a : b; c.fillRect(x0 + i * step, y0 + j * step, step + 0.6, step + 0.6); }
    c.strokeStyle = 'rgba(240,226,190,0.55)'; c.lineWidth = 0.9;
    for (let j = 0; j * step < h + step; j++) for (let i = 0; i * step < w + step; i++) { const cx = x0 + i * step + step / 2, cy = y0 + j * step + step / 2; c.beginPath(); c.moveTo(cx - 3, cy); c.lineTo(cx + 3, cy); c.moveTo(cx, cy - 3); c.lineTo(cx, cy + 3); c.stroke(); }
    c.fillStyle = '#d9b45e'; for (let j = 0; j * step < h + step; j++) for (let i = 0; i * step < w + step; i++) { c.beginPath(); c.arc(x0 + i * step, y0 + j * step, 1.8 + r() * 0.4, 0, 6.283); c.fill(); }
  }
  const ARCHES = { c: [KX - 230, PY + 70, 460, 640, 210], l: [PX + 70, PY + 230, 340, 480, 140], r: [PX + PW - 410, PY + 230, 340, 480, 140] };
  const RULERS = (() => {
    const r = rng(1201), out = [];
    const heads = ['crown', 'crown', 'cap', 'hood', 'crown', 'veil', 'crown', 'mitre'], robes = [P.vermilion, P.verdigris, '#7a4a8a', P.ochre, P.ultramarine, '#8a3b2a', P.green, '#6d5a3a'];
    for (let i = 0; i < 8; i++) {
      const left = i < 4, k = i % 4, x = left ? PX + 115 + k * 78 : PX + PW - 115 - k * 78, h = 236 - k * 6 + r() * 10;
      out.push({ x, y: PY + 690, h, face: left ? 1 : -1, head: heads[i], robe: robes[i], hose: '#4a3626', kind: i % 3 === 2 ? 'gown' : 'robe', lean: (left ? 1 : -1) * (0.04 + r() * 0.03), arm: 0.3 + r() * 0.4, seed: i });
    }
    return out;
  })();
  function drawRuler(c, f, reach) {
    K.figure(c, f.x, f.y, f.h, { kind: f.kind, head: f.head, style: 'painted', robe: f.robe, hose: f.hose, skin: '#e2c4a0', hairCol: '#4a3220', face: f.face, lean: f.lean + reach * f.face * 0.08, arm: lerp(f.arm, 2.3, reach), bend: lerp(0.3, 0.15, reach), hold: f.seed % 4 === 1 ? 'staff' : 'none', outline: 1.5, sheen: 0.4 + f.seed * 0.05 });
  }
  function panelBase() {
    return K.cached('s1:panel', () => {
      const c = K.canvas(PW * PS, PH * PS), x = c.getContext('2d');
      x.save(); x.beginPath(); x.rect(30 * PS, 30 * PS, (PW - 60) * PS, (PH - 60) * PS); x.clip();
      x.drawImage(K.parchment(c.width, c.height, 1188, { base: [230, 216, 184], edge: 0.35, foxing: 30, stains: 1 }), 0, 0); x.restore();
      x.scale(PS, PS); x.translate(-PX, -PY);
      // grounds
      for (const [k, a, b, step] of [['c', '#8f2b1d', '#2c3f78', 26], ['l', '#3d6656', '#8f2b1d', 22], ['r', '#3d6656', '#8f2b1d', 22]]) {
        const [ax, ay, aw, ah, ap] = ARCHES[k];
        x.save(); archPath(x, ax, ay, aw, ah, ap); x.clip(); diaper(x, ax - 20, ay - ap, aw + 40, ah + ap + 20, a, b, step, 77 + step); x.restore();
      }
      // floor: a band of tiles under all three arches
      x.save(); x.beginPath(); x.rect(PX + 60, PY + 690, PW - 120, 58); x.clip(); x.fillStyle = '#b89a6a'; x.fillRect(PX + 60, PY + 690, PW - 120, 58);
      for (let i = 0; i < 40; i++) { x.fillStyle = i % 2 ? 'rgba(120,80,40,0.45)' : 'rgba(240,226,190,0.35)'; x.fillRect(PX + 60 + i * 30, PY + 690, 30, 29); x.fillStyle = i % 2 ? 'rgba(240,226,190,0.35)' : 'rgba(120,80,40,0.45)'; x.fillRect(PX + 60 + i * 30, PY + 719, 30, 29); }
      x.restore();
      // the dais, three steps of stone
      for (let s = 0; s < 3; s++) { const w = 300 - s * 70, h = 22, y0 = KY - (s + 1) * h + 22; x.fillStyle = s % 2 ? '#c9b48a' : '#d8c6a0'; x.fillRect(KX - w / 2, y0 - h, w, h); x.strokeStyle = INKC(0.8); x.lineWidth = 1.4; x.strokeRect(KX - w / 2, y0 - h, w, h); x.strokeStyle = INKC(0.3); x.lineWidth = 0.8; for (let k = 1; k < 6; k++) { x.beginPath(); x.moveTo(KX - w / 2 + k * w / 6, y0 - h); x.lineTo(KX - w / 2 + k * w / 6, y0); x.stroke(); } }
      // gold frames: the arches and an outer border
      for (const k of ['c', 'l', 'r']) { const [ax, ay, aw, ah, ap] = ARCHES[k]; K.gold(x, cc => { archPath(cc, ax - 9, ay - 9, aw + 18, ah + 9, ap + 6); archPath(cc, ax, ay, aw, ah, ap, false); }, ax, ay - ap, ax + aw, ay + ah, { sheen: 0.45, outlineW: 1.2, rule: 'evenodd' }); }
      x.save(); x.fillStyle = 'rgba(0,0,0,0)'; K.gold(x, cc => { cc.beginPath(); cc.rect(PX + 30, PY + 30, PW - 60, PH - 60); cc.rect(PX + 44, PY + 44, PW - 88, PH - 88); }, PX, PY, PX + PW, PY + PH, { sheen: 0.55, outlineW: 1.2, rule: 'evenodd' }); x.restore();
      // red and blue penwork in the corners
      x.strokeStyle = 'rgba(155,47,31,0.75)'; x.lineWidth = 1.6;
      for (const [cx, cy, sx, sy] of [[PX + 44, PY + 44, 1, 1], [PX + PW - 44, PY + 44, -1, 1], [PX + 44, PY + PH - 44, 1, -1], [PX + PW - 44, PY + PH - 44, -1, -1]]) { for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(cx + sx * 22, cy + sy * 22, 8 + k * 7, 0, 6.283); x.stroke(); } }
      return c;
    });
  }
  // the rulers, on their own sheet so they can reach at the end
  function rulersSheet(reachKey) {
    return K.cached('s1:rulers:' + reachKey, () => {
      const c = K.canvas(PW * PS, PH * PS), x = c.getContext('2d'); x.scale(PS, PS); x.translate(-PX, -PY);
      for (const f of RULERS) drawRuler(x, f, reachKey / 4);
      return c;
    });
  }

  // ---------------------------------------------------------------- the Hollow King (frontal, painted)
  function king(x, face) {
    const S = v => v * KH, cx = KX, fy = KY - 44;   // stands on the dais
    x.save(); x.translate(cx, fy);
    // mandorla of gold, rays in ink
    K.gold(x, c => { c.beginPath(); c.ellipse(0, S(-0.5), S(0.3), S(0.56), 0, 0, 6.283); }, -S(0.3), S(-1.06), S(0.3), S(0.06), { sheen: 0.6, outlineW: 1.6 });
    x.save(); x.beginPath(); x.ellipse(0, S(-0.5), S(0.3), S(0.56), 0, 0, 6.283); x.clip(); x.strokeStyle = 'rgba(110,70,20,0.35)'; x.lineWidth = 1.2;
    for (let k = 0; k < 64; k++) { const a = k / 64 * 6.283; x.beginPath(); x.moveTo(0, S(-0.84)); x.lineTo(Math.cos(a) * S(0.8), S(-0.84) + Math.sin(a) * S(0.8)); x.stroke(); } x.restore();
    const outline = c => { c.strokeStyle = INKC(0.9); c.lineWidth = 2; c.lineJoin = 'round'; c.stroke(); };
    // robe (vermilion) and mantle (ultramarine) with gold hems
    x.beginPath(); x.moveTo(S(-0.07), S(-0.78)); x.bezierCurveTo(S(-0.1), S(-0.5), S(-0.13), S(-0.2), S(-0.15), 0); x.lineTo(S(0.15), 0); x.bezierCurveTo(S(0.13), S(-0.2), S(0.1), S(-0.5), S(0.07), S(-0.78)); x.closePath(); x.fillStyle = '#9b2f1f'; x.fill(); outline(x);
    x.beginPath(); x.moveTo(S(-0.055), S(-0.8)); x.bezierCurveTo(S(-0.15), S(-0.795), S(-0.175), S(-0.66), S(-0.18), S(-0.45)); x.bezierCurveTo(S(-0.19), S(-0.22), S(-0.2), S(-0.08), S(-0.205), S(0.01)); x.lineTo(S(-0.1), S(0.01)); x.bezierCurveTo(S(-0.08), S(-0.3), S(-0.04), S(-0.55), S(0), S(-0.62));
    x.bezierCurveTo(S(0.04), S(-0.55), S(0.08), S(-0.3), S(0.1), S(0.01)); x.lineTo(S(0.205), S(0.01)); x.bezierCurveTo(S(0.2), S(-0.08), S(0.19), S(-0.22), S(0.18), S(-0.45)); x.bezierCurveTo(S(0.175), S(-0.66), S(0.15), S(-0.795), S(0.055), S(-0.8)); x.closePath();
    x.fillStyle = '#2c3f78'; x.fill(); outline(x);
    // folds and highlights in the mantle
    x.strokeStyle = 'rgba(20,24,52,0.55)'; x.lineWidth = 1.6; for (const s of [-1, 1]) for (const k of [0.115, 0.145, 0.175]) { x.beginPath(); x.moveTo(s * S(k * 0.85), S(-0.62)); x.quadraticCurveTo(s * S(k * 1.08), S(-0.3), s * S(k + 0.015), S(0)); x.stroke(); }
    x.strokeStyle = 'rgba(180,200,240,0.25)'; x.lineWidth = 2.4; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * S(0.14), S(-0.68)); x.quadraticCurveTo(s * S(0.165), S(-0.38), s * S(0.17), S(-0.05)); x.stroke(); }
    for (const s of [-1, 1]) K.gold(x, c => { c.beginPath(); c.moveTo(s * S(0.0), S(-0.62)); c.bezierCurveTo(s * S(0.04), S(-0.55), s * S(0.08), S(-0.3), s * S(0.1), S(0.01)); c.lineTo(s * S(0.115), S(0.01)); c.bezierCurveTo(s * S(0.095), S(-0.3), s * S(0.055), S(-0.56), s * S(0.012), S(-0.64)); c.closePath(); }, -S(0.12), S(-0.64), S(0.12), 0, { sheen: 0.5, outlineW: 0.8 });
    // collar and hands
    K.gold(x, c => { c.beginPath(); c.ellipse(0, S(-0.785), S(0.085), S(0.03), 0, 0, 6.283); }, -S(0.09), S(-0.82), S(0.09), S(-0.75), { sheen: 0.4, outlineW: 1 });
    for (const s of [-1, 1]) { x.beginPath(); x.ellipse(s * S(0.165), S(-0.5), S(0.022), S(0.026), 0, 0, 6.283); x.fillStyle = '#e4c6a2'; x.fill(); outline(x); }
    // sceptre (right) and orb (left)
    K.gold(x, c => { c.beginPath(); c.rect(S(0.158), S(-0.9), S(0.014), S(0.66)); }, S(0.155), S(-0.9), S(0.175), S(-0.24), { sheen: 0.55, outlineW: 0.9 });
    K.gold(x, c => { c.beginPath(); c.moveTo(S(0.165), S(-0.98)); c.lineTo(S(0.19), S(-0.92)); c.lineTo(S(0.165), S(-0.895)); c.lineTo(S(0.14), S(-0.92)); c.closePath(); }, S(0.135), S(-0.98), S(0.195), S(-0.89), { sheen: 0.6, outlineW: 0.9 });
    K.gold(x, c => { c.beginPath(); c.arc(S(-0.165), S(-0.54), S(0.042), 0, 6.283); }, S(-0.215), S(-0.59), S(-0.115), S(-0.49), { sheen: 0.5, outlineW: 1 });
    x.strokeStyle = INKC(0.7); x.lineWidth = 1.1; x.beginPath(); x.moveTo(S(-0.207), S(-0.54)); x.lineTo(S(-0.123), S(-0.54)); x.moveTo(S(-0.165), S(-0.582)); x.lineTo(S(-0.165), S(-0.498)); x.stroke();
    // neck, head, hair and beard
    x.fillStyle = '#e4c6a2'; x.fillRect(S(-0.018), S(-0.83), S(0.036), S(0.04));
    x.beginPath(); x.ellipse(0, S(-0.865), S(0.05), S(0.06), 0, 0, 6.283); x.fillStyle = '#5a3b22'; x.fill();
    x.beginPath(); x.moveTo(S(-0.034), S(-0.86)); x.quadraticCurveTo(S(-0.04), S(-0.8), 0, S(-0.785)); x.quadraticCurveTo(S(0.04), S(-0.8), S(0.034), S(-0.86)); x.closePath(); x.fillStyle = '#5a3b22'; x.fill(); outline(x);
    x.restore();
    // under the paint, bare vellum and the underdrawing
    if (face === 0) { x.save(); x.beginPath(); x.ellipse(FACE.x, FACE.y, FACE.rx, FACE.ry, 0, 0, 6.283); x.fillStyle = '#e2d2b0'; x.fill(); x.strokeStyle = INKC(0.25); x.lineWidth = 0.8; x.stroke(); x.restore(); }
    // the face, which fades (face 1 -> 0)
    if (face > 0) {
      x.save(); x.globalAlpha *= face; x.translate(FACE.x, FACE.y);
      x.beginPath(); x.ellipse(0, 0, FACE.rx, FACE.ry, 0, 0, 6.283); x.fillStyle = '#e6caa6'; x.fill(); x.strokeStyle = INKC(0.85); x.lineWidth = 1.2; x.stroke();
      x.fillStyle = 'rgba(200,120,100,0.25)'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(s * 9, 7, 5, 3.5, 0, 0, 6.283); x.fill(); }
      x.strokeStyle = INKC(0.85); x.lineWidth = 1.1;
      for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * 3, -4); x.quadraticCurveTo(s * 7.5, -7, s * 12, -4); x.stroke(); x.beginPath(); x.moveTo(s * 3.5, -1); x.quadraticCurveTo(s * 7.5, -3.6, s * 11, -1); x.quadraticCurveTo(s * 7.5, 1.2, s * 3.5, -1); x.stroke(); x.fillStyle = INKC(0.9); x.beginPath(); x.arc(s * 7.2, -1.0, 1.5, 0, 6.283); x.fill(); x.lineWidth = 1.5; x.beginPath(); x.moveTo(s * 3.4, -1.6); x.quadraticCurveTo(s * 7.5, -4.2, s * 11.2, -1.4); x.stroke(); x.lineWidth = 1.1; }
      x.beginPath(); x.moveTo(0, -2); x.lineTo(-1.5, 8); x.lineTo(1.8, 9); x.stroke();
      x.beginPath(); x.moveTo(-5, 13.6); x.quadraticCurveTo(0, 12.8, 5, 13.9); x.stroke();
      x.restore();
    }
    // the Sovereign Crown
    K.gold(x, c => { const y0 = FACE.y - FACE.ry * 0.75, w = 26, h = 28; c.beginPath(); c.moveTo(FACE.x - w, y0); c.lineTo(FACE.x - w, y0 - h * 0.6); c.lineTo(FACE.x - w * 0.55, y0 - h * 0.3); c.lineTo(FACE.x - w * 0.28, y0 - h); c.lineTo(FACE.x, y0 - h * 0.4); c.lineTo(FACE.x + w * 0.28, y0 - h); c.lineTo(FACE.x + w * 0.55, y0 - h * 0.3); c.lineTo(FACE.x + w, y0 - h * 0.6); c.lineTo(FACE.x + w, y0); c.closePath(); }, FACE.x - 26, FACE.y - FACE.ry * 0.75 - 28, FACE.x + 26, FACE.y - FACE.ry * 0.75, { sheen: 0.55, outlineW: 1.2 });
  }
  function kingSheet() {
    return K.cached('s1:king', () => { const c = K.canvas(PW * PS, PH * PS), x = c.getContext('2d'); x.scale(PS, PS); x.translate(-PX, -PY); king(x, 0); return c; });
  }
  // the face alone, sharp, for the close shot
  const FS = 6, FB = [FACE.x - 40, FACE.y - 48, 80, 96];
  function faceSheet() {
    return K.cached('s1:face', () => {
      const c = K.canvas(FB[2] * FS, FB[3] * FS), x = c.getContext('2d'); x.scale(FS, FS); x.translate(-FB[0], -FB[1]);
      x.save(); x.beginPath(); x.ellipse(FACE.x, FACE.y, FACE.rx + 1, FACE.ry + 1, 0, 0, 6.283); x.clip(); king(x, 1); x.restore(); return c;
    });
  }
  // the tear: a ragged hole with fibrous edges where the face was
  function tear(x, p, t) {
    if (p <= 0) return;
    const r = rng(9091), n = 90, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * 6.283, e = 0.72 + 0.5 * K.fbm(Math.cos(a) * 2.2 + 3, Math.sin(a) * 2.2 + 3, 4, 41); pts.push([FACE.x + Math.cos(a) * FACE.rx * 1.25 * e * p, FACE.y + Math.sin(a) * FACE.ry * 1.15 * e * p]); }
    x.save();
    // the void behind the page
    x.beginPath(); K.poly(x, pts); x.fillStyle = '#050302'; x.fill();
    x.clip(); const g = x.createRadialGradient(FACE.x, FACE.y + 6, 0, FACE.x, FACE.y, FACE.ry * 1.4); g.addColorStop(0, `rgba(150,46,22,${0.35 + 0.1 * Math.sin(t * 2)})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(FACE.x - 60, FACE.y - 60, 120, 120);
    x.restore();
    // torn fibres and a pale lip of split vellum
    x.save(); x.strokeStyle = 'rgba(238,226,200,0.9)'; x.lineWidth = 1.6; x.beginPath(); K.poly(x, pts); x.stroke();
    x.lineWidth = 0.6; for (let i = 0; i < n; i += 1) { const [px, py] = pts[i], a = Math.atan2(py - FACE.y, px - FACE.x) + Math.PI + (r() - 0.5) * 0.8, L = (2 + r() * 5) * p; x.strokeStyle = `rgba(236,224,198,${0.5 + r() * 0.5})`; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); }
    x.strokeStyle = 'rgba(60,40,20,0.35)'; x.lineWidth = 2.5; x.beginPath(); K.poly(x, pts.map(([px, py]) => [px + (px - FACE.x) * 0.08, py + (py - FACE.y) * 0.08])); x.stroke();
    x.restore();
  }

  // ---------------------------------------------------------------- seven flames at the seven halls
  function flame(x, px, py, s, t, a, seed) {
    if (a <= 0) return;
    const fl = 1 + 0.12 * Math.sin(t * 11 + seed) + 0.08 * Math.sin(t * 17.3 + seed * 2);
    x.save(); x.globalAlpha = a; x.translate(px, py); x.scale(s, s * fl);
    x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(-7, -4, -6, -12, 0, -24); x.bezierCurveTo(1, -16, 7, -12, 5, -4); x.quadraticCurveTo(3, 0, 0, 0); x.closePath();
    const g = x.createLinearGradient(0, 0, 0, -24); g.addColorStop(0, '#9b2f1f'); g.addColorStop(0.5, '#d9822f'); g.addColorStop(1, '#f6d77e'); x.fillStyle = g; x.fill();
    x.strokeStyle = INKC(0.8); x.lineWidth = 0.9 / s; x.stroke();
    x.restore();
    K.glow(x, px, py - 10 * s, 34 * s, [255, 170, 80], 0.45 * a);
  }

  // ---------------------------------------------------------------- the camera and the reveal
  let FIELD = null;
  function inkField() { if (!FIELD) FIELD = K.field(480, 270, [{ x: 0.47, y: 0.55 }, { x: 0.22, y: 0.36, d: 0.08 }, { x: 0.62, y: 0.4, d: 0.12 }, { x: 0.33, y: 0.8, d: 0.15 }, { x: 0.78, y: 0.72, d: 0.2 }], 1301, { warp: 0.22, scale: 3.2, grain: 0.05 }); return FIELD; }
  function camKeys(sc) {
    const c = n => K.cue(n);
    const L1 = c('L01'), L2 = c('L02'), L3 = c('L03'), L4 = c('L04'), L5 = c('L05');
    return [
      { t: sc.start, x: 1000, y: 860, z: 0.98 },
      { t: L1.start - 0.4, x: 1000, y: 780, z: 0.9 },
      { t: L2.start - 0.2, x: KX, y: PY + PH / 2 + 10, z: 1.3 },
      { t: L3.start, x: KX, y: KY - 300, z: 1.75 },
      { t: L4.start - 0.4, x: KX, y: FACE.y + 40, z: 3.1 },
      { t: L4.start + 1.6, x: FACE.x, y: FACE.y + 4, z: 4.6 },
      { t: L5.start + 0.5, x: FACE.x, y: FACE.y + 10, z: 4.2 },
      { t: L5.start + 2.8, x: KX, y: PY + PH / 2 + 30, z: 1.45 },
      { t: L5.end + 0.6, x: 1040, y: 860, z: 0.96 },
      { t: sc.end + 1.5, x: 1060, y: 880, z: 1.02 },
    ];
  }

  SCENES[1] = {
    join: 'dissolve', joinDur: 1.2,
    draw(ctx, t, sc) {
      const L4 = K.cue('L04'), L5 = K.cue('L05');
      const cam = K.camPath(t, camKeys(sc)), z = cam.z;
      const [hx, hy] = K.shake(t * 0.25, 4, 11);
      // the blank vellum, then the map arriving under spreading ink
      ctx.fillStyle = '#15100b'; ctx.fillRect(0, 0, W, H);
      ctx.save(); K.cam(ctx, cam.x + hx / z, cam.y + hy / z, z);
      const blank = K.cached('s1:blank', () => K.parchment(2500, 2063, 2024, { base: [228, 214, 184], dark: [120, 90, 56], folds: [{ x: 0.5 }, { y: 0.5 }], edge: 0.75, stains: 4 }));
      ctx.drawImage(blank, 0, 0, 2000, 1650);
      // the head of the page, above the map's border: one long sheet, the join sewn
      const upper = K.cached('s1:upper', () => K.parchment(2000, 1040, 2025, { base: [228, 214, 184], dark: [120, 90, 56], edge: 0.6, stains: 2, foxing: 40 }));
      ctx.drawImage(upper, 0, -1030, 2000, 1040);
      ctx.save(); ctx.strokeStyle = 'rgba(60,40,22,0.55)'; ctx.lineWidth = 2; for (let k = 0; k < 66; k++) { const x0 = 20 + k * 30; ctx.beginPath(); ctx.moveTo(x0, -6); ctx.lineTo(x0 + 12, 4); ctx.stroke(); } ctx.restore();
      ctx.restore();
      const rv = span(t, sc.start + 0.2, K.cue('L01').start + 1.6);
      const reg = z > 1.9 ? null : null;
      if (rv < 1) {
        const Lm = K.layer('s1:map'), lx = Lm.getContext('2d');
        lx.save(); K.cam(lx, cam.x + hx / z, cam.y + hy / z, z); K.map.draw(lx, { region: reg }); lx.restore();
        const F = inkField(), p = ease(rv) * 1.08;
        K.cutBy(Lm, K.mask(F, p, 0.035)); ctx.drawImage(Lm, 0, 0);
        // the wet front: a darker band of ink where it is still spreading
        const rimC = K.rim(F, p, 0.03, 0.01), Rl = K.layer('s1:rim'), rx = Rl.getContext('2d');
        rx.drawImage(rimC, 0, 0, W, H); rx.globalCompositeOperation = 'source-in'; rx.fillStyle = 'rgba(28,18,10,0.55)'; rx.fillRect(0, 0, W, H);
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(Rl, 0, 0); ctx.restore();
      } else {
        ctx.save(); K.cam(ctx, cam.x + hx / z, cam.y + hy / z, z); K.map.draw(ctx, { region: reg }); ctx.restore();
      }
      // the illumination above the map
      const faceFade = 1 - smooth(span(t, L4.start + 0.2, L4.start + 1.9));
      const tearP = easeOut(span(t, L4.start + 2.0, L4.start + 3.4));
      const gone = smooth(span(t, L5.start + 0.3, L5.start + 3.2));
      const reach = smooth(span(t, L5.start + 1.6, L5.start + 3.8));
      ctx.save(); K.cam(ctx, cam.x + hx / z, cam.y + hy / z, z);
      if (cam.y - H / 2 / z < 0) {
        ctx.drawImage(panelBase(), PX, PY, PW, PH);
        for (const f of RULERS) drawRuler(ctx, f, reach);
        // the King lifts off the page from the crown down, as flakes of paint
        if (gone < 1) {
          const Lk = K.layer('s1:king'), kx = Lk.getContext('2d');
          kx.save(); K.cam(kx, cam.x + hx / z, cam.y + hy / z, z); kx.drawImage(kingSheet(), PX, PY, PW, PH);
          if (faceFade > 0) { kx.globalAlpha = faceFade; kx.drawImage(faceSheet(), FB[0], FB[1], FB[2], FB[3]); }
          kx.restore();
          if (gone > 0) {
            const F2 = K.cached('s1:liftField', () => K.field(320, 180, [{ x: 0.5, y: 0.0 }, { x: 0.3, y: 0.1, d: 0.1 }, { x: 0.7, y: 0.12, d: 0.12 }], 1777, { warp: 0.3, scale: 4 }));
            // the field is laid over the King's own box, so it moves with the camera
            const m = K.mask(F2, gone * 1.15, 0.06), Lm2 = K.layer('s1:kingmask'), mx = Lm2.getContext('2d');
            mx.save(); K.cam(mx, cam.x + hx / z, cam.y + hy / z, z); mx.drawImage(m, KX - 260, KY - KH - 70, 520, KH + 90); mx.restore();
            kx.save(); kx.globalCompositeOperation = 'destination-out'; kx.drawImage(Lm2, 0, 0); kx.restore();
          }
          ctx.drawImage(Lk, 0, 0, W, H, cam.x + hx / z - W / 2 / z, cam.y + hy / z - H / 2 / z, W / z, H / z);
        }
        // a pale ghost where he stood
        if (gone > 0) { ctx.save(); ctx.globalAlpha = 0.08 * gone; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(kingSheet(), PX, PY, PW, PH); ctx.restore(); }
        tear(ctx, tearP, t);
        // flakes of gold and paint drifting up as he goes
        if (gone > 0 && gone < 1) {
          const r = rng(5150); ctx.save();
          for (let i = 0; i < 70; i++) { const u = r(), x0 = KX + (r() - 0.5) * 300, y0 = KY - KH * (0.1 + 0.95 * r()), born = u * 0.8, a = clamp((gone - born) * 4) * (1 - clamp((gone - born - 0.25) * 3)); if (a <= 0) continue; const age = gone - born; ctx.globalAlpha = a; ctx.fillStyle = i % 3 ? '#d6b25e' : i % 2 ? '#2c3f78' : '#9b2f1f'; ctx.save(); ctx.translate(x0 + Math.sin(age * 9 + i) * 12, y0 - age * 160); ctx.rotate(age * 6 + i); ctx.fillRect(-2.5, -1.5, 5, 3); ctx.restore(); }
          ctx.restore();
        }
      }
      // seven flames light at the halls, one after another
      const fl0 = L5.end + 0.2;
      K.map.halls().forEach((hl, i) => { const a = smooth(span(t, fl0 + i * 0.28, fl0 + i * 0.28 + 0.6)); flame(ctx, hl.x, hl.y - 13, 1.7, t, a, i * 3.1); });
      ctx.restore();
      // light, air and finish
      K.specks(ctx, t, { kind: 'dust', n: 50, alpha: 0.35, seed: 101 });
      K.paperTooth(ctx, 0.12);
      K.vignette(ctx, 0.5, '20,12,6', 0.35);
      K.grade(ctx, '#e8b070', 'soft-light', 0.12);
    },
  };
})();
