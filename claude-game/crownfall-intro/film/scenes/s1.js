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

  // ---------------------------------------------------------------- the scene: a desk, a page, a king
  // ink spreads across the map in its own space, so the reveal lies on the page whatever the camera does
  const MF = () => K.cached('s1:mapField', () => K.field(500, 412, [{ x: 0.44, y: 0.66 }, { x: 0.3, y: 0.42, d: 0.06 }, { x: 0.58, y: 0.36, d: 0.1 }, { x: 0.36, y: 0.9, d: 0.12 }, { x: 0.74, y: 0.76, d: 0.16 }, { x: 0.82, y: 0.3, d: 0.22 }], 1301, { warp: 0.24, scale: 3.4, grain: 0.05 }));
  function revealedInk(p) {
    const ink = K.map.ink(), w = Math.round(ink.width / 2), h = Math.round(ink.height / 2), L = K.layer('s1:inkrev', w, h), x = L.getContext('2d');
    x.drawImage(ink, 0, 0, w, h);
    const F = MF(), m = K.mask(F, p, 0.03); x.globalCompositeOperation = 'destination-in'; x.imageSmoothingQuality = 'high'; x.drawImage(m, 0, 0, w, h);
    // the wet front: ink pooling darker where it is still spreading
    x.globalCompositeOperation = 'source-over'; const r = K.rim(F, p, 0.025, 0.008), R = K.layer('s1:inkrim', w, h), rx = R.getContext('2d'); rx.drawImage(r, 0, 0, w, h); rx.globalCompositeOperation = 'source-in'; rx.fillStyle = 'rgba(30,20,12,0.7)'; rx.fillRect(0, 0, w, h);
    x.drawImage(R, 0, 0);
    return L;
  }
  function standingFlame(c, b, t, a, i) {
    if (!b || a <= 0) return; const s = b[2] * 2.3, fl = 1 + 0.12 * Math.sin(t * 11 + i * 3) + 0.08 * Math.sin(t * 17 + i);
    c.save(); c.globalAlpha = a; c.translate(b[0], b[1]); c.scale(s, s * fl);
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-8, -5, -7, -14, 0, -28); c.bezierCurveTo(1, -18, 8, -14, 6, -5); c.quadraticCurveTo(4, 0, 0, 0); c.closePath();
    const g = c.createLinearGradient(0, 0, 0, -28); g.addColorStop(0, '#9b2f1f'); g.addColorStop(0.5, '#e08a30'); g.addColorStop(1, '#f8dc86'); c.fillStyle = g; c.fill(); c.restore();
    K.glow(c, b[0], b[1] - 12 * s, 70 * s, [255, 170, 80], 0.55 * a);
  }
  // the illumination, seen straight on; cam {x, y, z} in world units
  function drawPanel(c, t, cam, sc) {
    const L4 = K.cue('L04'), L5 = K.cue('L05'), z = cam.z;
    const faceFade = 1 - smooth(span(t, L4.start + 0.15, L4.start + 1.5)), tearP = easeOut(span(t, L4.start + 1.6, L4.start + 2.9));
    const gone = smooth(span(t, L5.start + 0.2, L5.start + 2.6)), reach = smooth(span(t, L5.start + 1.2, L5.start + 3.0));
    c.fillStyle = '#100b07'; c.fillRect(0, 0, W, H);
    c.save(); K.cam(c, cam.x, cam.y, z);
    const upper = K.cached('s1:upper', () => K.parchment(2000, 1040, 2025, { base: [228, 214, 184], dark: [120, 90, 56], edge: 0.6, stains: 2, foxing: 40 }));
    c.drawImage(upper, 0, -1030, 2000, 1040);
    c.drawImage(panelBase(), PX, PY, PW, PH);
    // the rulers stand a little nearer than the wall behind them: they drift against it as the camera moves
    c.save(); c.translate((cam.x - KX) * -0.03, (cam.y - (PY + PH / 2)) * -0.02); for (const f of RULERS) drawRuler(c, f, reach); c.restore();
    if (gone < 1) {
      const Lk = K.layer('s1:king'), kx = Lk.getContext('2d');
      kx.save(); K.cam(kx, cam.x, cam.y, z); kx.drawImage(kingSheet(), PX, PY, PW, PH);
      if (faceFade > 0) { kx.globalAlpha = faceFade; kx.drawImage(faceSheet(), FB[0], FB[1], FB[2], FB[3]); }
      kx.restore();
      if (gone > 0) {
        const F2 = K.cached('s1:liftField', () => K.field(320, 180, [{ x: 0.5, y: 0.0 }, { x: 0.3, y: 0.1, d: 0.1 }, { x: 0.7, y: 0.12, d: 0.12 }], 1777, { warp: 0.3, scale: 4 }));
        const m = K.mask(F2, gone * 1.15, 0.06), Lm2 = K.layer('s1:kingmask'), mx = Lm2.getContext('2d');
        mx.save(); K.cam(mx, cam.x, cam.y, z); mx.drawImage(m, KX - 260, KY - KH - 70, 520, KH + 90); mx.restore();
        kx.save(); kx.globalCompositeOperation = 'destination-out'; kx.drawImage(Lm2, 0, 0); kx.restore();
      }
      c.drawImage(Lk, 0, 0, W, H, cam.x - W / 2 / z, cam.y - H / 2 / z, W / z, H / z);
    }
    if (gone > 0) { c.save(); c.globalAlpha = 0.08 * gone; c.globalCompositeOperation = 'multiply'; c.drawImage(kingSheet(), PX, PY, PW, PH); c.restore(); }
    tear(c, tearP, t);
    if (gone > 0 && gone < 1) {
      const r = rng(5150); c.save();
      for (let i = 0; i < 110; i++) { const u = r(), x0 = KX + (r() - 0.5) * 320, y0 = KY - KH * (0.1 + 0.95 * r()), born = u * 0.8, a = clamp((gone - born) * 4) * (1 - clamp((gone - born - 0.3) * 3)); if (a <= 0) continue; const age = gone - born; c.globalAlpha = a; c.fillStyle = i % 3 ? '#d6b25e' : i % 2 ? '#2c3f78' : '#9b2f1f'; c.save(); c.translate(x0 + Math.sin(age * 9 + i) * 14, y0 - age * 200); c.rotate(age * 6 + i); c.fillRect(-2.5, -1.5, 5, 3); c.restore(); }
      c.restore();
    }
    c.restore();
    // a candle off to the left: its light rakes across the leaf and the paint, breathing
    const fl = 0.85 + 0.1 * Math.sin(t * 7.3) + 0.05 * Math.sin(t * 13.1), lx = W * (0.18 + 0.05 * Math.sin(t * 0.21)), ly = H * 0.42;
    c.save(); c.globalCompositeOperation = 'multiply'; const g = c.createRadialGradient(lx, ly, 60, lx, ly, W * 1.05); g.addColorStop(0, 'rgba(255,240,215,1)'); g.addColorStop(0.5, 'rgba(205,168,120,1)'); g.addColorStop(1, 'rgba(58,38,22,1)'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
    c.save(); c.globalCompositeOperation = 'screen'; const g2 = c.createRadialGradient(lx, ly, 0, lx, ly, W * 0.6); g2.addColorStop(0, `rgba(255,196,120,${0.2 * fl})`); g2.addColorStop(1, 'rgba(255,196,120,0)'); c.fillStyle = g2; c.fillRect(0, 0, W, H); c.restore();
    // motes turning in the light
    K.specks(c, t, { kind: 'dust', n: 70, alpha: 0.5, seed: 101 });
  }

  SCENES[1] = {
    join: 'dissolve', joinDur: 1.2,
    draw(ctx, t, sc) {
      const L1 = K.cue('L01'), L2 = K.cue('L02'), L4 = K.cue('L04'), L5 = K.cue('L05');
      const tUp = L1.start + 0.8, tDown = L5.start + 2.4, sw = 0.55;     // the tilt up to the king, the tilt back down to the land
      const flicker = 0.85 + 0.1 * Math.sin(t * 7.3) + 0.05 * Math.sin(t * 13.1);
      // A: the map on a desk, low, the camera drifting in as the ink spreads across it
      const deskA = () => {
        const u = span(t, sc.start, tUp + sw), V = { cx: lerp(880, 1010, ease(u)), cy: lerp(1240, 760, ease(u)), th: lerp(1.12, 1.0, u), D: lerp(820, 1250, ease(u)), f: 1150, oy: lerp(170, 110, u) };
        const p = ease(span(t, sc.start + 0.1, L1.start + 0.4)) * 1.12;
        const Ld = K.layer('s1:deskA'), x = Ld.getContext('2d');
        K.map.drawTilted(x, V, { ink: p < 1.1 ? revealedInk(p) : null, light: [1250, 1150], flicker });
        K.specks(x, t, { kind: 'dust', n: 50, alpha: 0.45, seed: 77 });
        return Ld;
      };
      // C: back on the desk; seven flames stand up on the seven halls
      const deskC = () => {
        const u = span(t, tDown - sw, sc.end + 1.4), V = { cx: lerp(980, 1060, ease(u)), cy: lerp(700, 930, ease(u)), th: lerp(0.86, 0.98, ease(u)), D: lerp(1500, 1750, ease(u)), f: 1250, oy: 90 };
        const Ld = K.layer('s1:deskC'), x = Ld.getContext('2d');
        K.map.drawTilted(x, V, { light: [1000, 1000], flicker });
        const f0 = L5.end + 0.1;
        K.map.halls().forEach((hl, i) => standingFlame(x, K.map.project(hl.x, hl.y, 0, V), t, smooth(span(t, f0 + i * 0.22, f0 + i * 0.22 + 0.5)), i));
        K.specks(x, t, { kind: 'dust', n: 40, alpha: 0.4, seed: 79 });
        return Ld;
      };
      const panelCam = K.camPath(t, [
        { t: tUp - sw, x: KX, y: PY + PH / 2 - 60, z: 1.22 },
        { t: L2.start, x: KX, y: PY + PH / 2 + 10, z: 1.35 },
        { t: L4.start - 0.3, x: KX, y: FACE.y + 70, z: 2.7 },
        { t: L4.start + 1.3, x: FACE.x, y: FACE.y + 4, z: 4.6 },
        { t: L5.start + 0.3, x: FACE.x, y: FACE.y + 12, z: 4.1 },
        { t: L5.start + 2.2, x: KX, y: PY + PH / 2 + 30, z: 1.42 },
        { t: tDown + sw, x: KX, y: PY + PH / 2 + 80, z: 1.32 },
      ]);
      const blurPair = (img, dy, a) => { ctx.save(); ctx.globalAlpha = a; ctx.drawImage(img, 0, dy); ctx.globalAlpha = a * 0.35; ctx.drawImage(img, 0, dy - 24 * Math.sign(dy || 1)); ctx.drawImage(img, 0, dy + 24 * Math.sign(dy || 1)); ctx.restore(); };
      ctx.fillStyle = '#0c0805'; ctx.fillRect(0, 0, W, H);
      if (t < tUp - sw) { ctx.drawImage(deskA(), 0, 0); }
      else if (t < tUp + sw) {
        // the camera tilts up off the desk to the illumination standing above it
        const u = ease(span(t, tUp - sw, tUp + sw));
        const A = deskA(); blurPair(A, u * H * 0.9, 1);
        const Lp = K.layer('s1:panelL'), px = Lp.getContext('2d'); drawPanel(px, t, panelCam, sc); blurPair(Lp, -(1 - u) * H * 0.9, smooth(u * 1.4));
      } else if (t < tDown - sw) {
        drawPanel(ctx, t, panelCam, sc);
      } else if (t < tDown + sw) {
        const u = ease(span(t, tDown - sw, tDown + sw));
        const Lp = K.layer('s1:panelL'), px = Lp.getContext('2d'); drawPanel(px, t, panelCam, sc); blurPair(Lp, -u * H * 0.9, 1);
        const C = deskC(); blurPair(C, (1 - u) * H * 0.9, smooth(u * 1.4));
      } else { ctx.drawImage(deskC(), 0, 0); }
      K.paperTooth(ctx, 0.1);
      K.vignette(ctx, 0.55, '14,8,4', 0.32);
      K.grade(ctx, '#e8b070', 'soft-light', 0.1);
    },
  };
})();
