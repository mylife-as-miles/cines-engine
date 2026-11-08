/* The map of Aethelgard in iron-gall ink (K.map), drawn from film/mapdata.js: shapes traced from the creator's working
   map "Blood-Throne of Aethelgard" (proposals, not canon), drawn in the manner of the creator's own ink version.
   Two cached layers in map units (2000 x 1650): paper() holds the vellum and its washes, ink() the lines, glyphs and
   names on a transparent sheet, to be laid over the paper with 'multiply'. inkRegion() redraws the ink of one area at
   a higher scale for close shots. draw(ctx, opts) lays both down in map units under the current transform. */
(function () {
  'use strict';
  const K = window.KIT, P = K.P, D = window.MAPDATA;
  if (!D) return;
  const { rng, lerp, clamp } = K;
  const SC = 1.25;                               // canvas pixels per map unit for the whole sheet
  const LIGHT = '#f3ead7', RED = '#9b2f1f', REDA = a => `rgba(155,47,31,${a})`, INK = a => `rgba(32,21,12,${a})`;
  const M = K.map = { D, W: D.w, H: D.h, SC };

  // ---------------------------------------------------------------- lookups
  M.place = k => D.places[k];
  M.hall = i => ({ x: D.halls[i][0], y: D.halls[i][1], house: K.HOUSES.find(h => h.key === D.hallHouses[i]) });
  M.halls = () => D.halls.map((_, i) => M.hall(i));
  M.home = D.home;
  function addPoly(ctx, pts) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
  function inPoly(x, y, pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  M.inSea = (x, y) => D.coast.some(p => inPoly(x, y, p));
  M.inRealm = (x, y) => D.realm.some(p => inPoly(x, y, p));
  // smoothed copy of a closed polygon (Chaikin), for softer coasts
  function chaikin(pts, n = 2, closed = true) { let p = pts; for (let k = 0; k < n; k++) { const q = []; const L = p.length; for (let i = 0; i < (closed ? L : L - 1); i++) { const a = p[i], b = p[(i + 1) % L]; q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } if (!closed) { q.unshift(p[0]); q.push(p[L - 1]); } p = q; } return p; }
  // offset a closed polygon along its normals (positive: to the left of travel)
  function offset(pts, d) {
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) { const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; out.push([pts[i][0] - dy / l * d, pts[i][1] + dx / l * d]); }
    return out;
  }
  function area(pts) { let s = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]); return s / 2; }
  const COAST = D.coast.map(p => chaikin(p, 2)), LAKES = D.lakes.map(p => chaikin(p, 2)), GLAC = D.glacier.map(p => chaikin(p, 1)), FERAL = D.feral.map(p => chaikin(p, 1)), REALM = D.realm.map(p => chaikin(p, 1)), LAVA = D.lava.map(p => chaikin(p, 2));
  // label boxes: no trees or peaks under the names
  const LABEL_BOX = D.labels.map(l => { const w = l.t.length * (l.s * 0.62 + l.sp), h = l.s * 1.2; return l.rot ? [l.x - h / 2, l.y - w / 2, h, w] : [l.x - w / 2, l.y - l.s, w, h]; })
    .concat(Object.values(D.places).filter(p => p.name).map(p => [p.x - 10, p.y - 12, (p.name.length + 2) * 13 + 30, 44]));
  const underLabel = (x, y) => LABEL_BOX.some(b => x > b[0] && x < b[0] + b[2] && y > b[1] && y < b[1] + b[3]);
  const boxHitsLabel = (x0, y0, x1, y1) => LABEL_BOX.some(b => x1 > b[0] && x0 < b[0] + b[2] && y1 > b[1] && y0 < b[1] + b[3]);
  const PEAKS = (() => {
    const out = [], src = D.peaks.map((p, i) => [p[0], p[1], p[2] * 1.15, i]).sort((a, b) => b[2] - a[2]);
    for (const p of src) {
      if (D.glacier.some(g => inPoly(p[0], p[1] - p[2] * 0.5, g)) && p[0] > 1060) continue;
      if (boxHitsLabel(p[0] - p[2] * 0.62, p[1] - p[2] * 1.3, p[0] + p[2] * 0.62, p[1])) continue;
      if (Object.values(D.places).some(q => q.kind === 'volcano' && Math.hypot(q.x - p[0], q.y - p[1]) < (q.s || 50) * 0.9)) continue;
      if (out.every(q => Math.hypot(q[0] - p[0], (q[1] - p[1]) * 1.3) > (q[2] + p[2]) * 0.3)) out.push(p);
    }
    return out.sort((a, b) => a[1] - b[1]);
  })();

  // ---------------------------------------------------------------- the paper
  M.paper = () => K.cached('map:paper', () => {
    const c = K.canvas(D.w * SC, D.h * SC), x = c.getContext('2d'), r = rng(808);
    x.drawImage(K.parchment(c.width, c.height, 2024, { base: [228, 214, 184], dark: [120, 90, 56], folds: [{ x: 0.5 }, { y: 0.5 }], edge: 0.75, stains: 4 }), 0, 0);
    x.scale(SC, SC);
    // the lands beyond the frontier, a pale grey wash
    x.save(); x.beginPath(); x.rect(0, 0, D.w, D.h); for (const p of REALM) addPoly(x, p); for (const p of COAST) addPoly(x, p); x.clip('evenodd');
    x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(104,94,82,0.2)'; x.fillRect(0, 0, D.w, D.h); x.restore();
    // the sea: a mottled grey-brown wash, darker along the coast
    x.save(); x.beginPath(); for (const p of COAST) addPoly(x, p); x.clip();
    x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(96,86,74,0.34)'; x.fillRect(0, 0, D.w, D.h);
    for (let i = 0; i < 70; i++) { const px = r() * 700, py = r() * D.h, rad = 40 + r() * 160, g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, `rgba(70,60,50,${0.05 + r() * 0.08})`); g.addColorStop(1, 'rgba(70,60,50,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, rad, 0, 6.283); x.fill(); }
    x.filter = 'blur(10px)'; x.strokeStyle = 'rgba(70,60,50,0.28)'; x.lineWidth = 26; x.beginPath(); for (const p of COAST) addPoly(x, p); x.stroke(); x.filter = 'none';
    x.restore();
    // lakes
    x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(96,86,74,0.34)'; x.beginPath(); for (const p of LAKES) addPoly(x, p); x.fill(); x.restore();
    // the glacier, pale
    x.save(); x.beginPath(); for (const p of GLAC) addPoly(x, p); x.clip(); x.globalCompositeOperation = 'screen'; x.fillStyle = 'rgba(255,252,246,0.55)'; x.fillRect(0, 0, D.w, D.h); x.restore();
    // the Feral Ranges, a faint russet wash
    x.save(); x.beginPath(); for (const p of FERAL) addPoly(x, p); x.clip(); x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(150,96,64,0.1)'; x.fillRect(0, 0, D.w, D.h); x.restore();
    // lava fields, dark
    x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(60,44,36,0.28)'; x.beginPath(); for (const p of LAVA) addPoly(x, p); x.fill(); x.restore();
    return c;
  });

  // ---------------------------------------------------------------- the ink (drawn in map units on a transparent sheet)
  function tree(x, px, py, h, k) {
    x.save(); x.translate(px, py);
    x.beginPath(); x.moveTo(0, -h); x.lineTo(0.27 * h, -0.48 * h); x.lineTo(0.11 * h, -0.48 * h); x.lineTo(0.34 * h, -0.12 * h); x.lineTo(0.05 * h, -0.12 * h); x.lineTo(0.05 * h, 0); x.lineTo(-0.05 * h, 0); x.lineTo(-0.05 * h, -0.12 * h); x.lineTo(-0.34 * h, -0.12 * h); x.lineTo(-0.11 * h, -0.48 * h); x.lineTo(-0.27 * h, -0.48 * h); x.closePath();
    x.fillStyle = LIGHT; x.fill(); x.strokeStyle = INK(0.86); x.lineWidth = 0.75; x.stroke();
    x.beginPath(); x.moveTo(0, -h); x.lineTo(0.27 * h, -0.48 * h); x.lineTo(0.11 * h, -0.48 * h); x.lineTo(0.34 * h, -0.12 * h); x.lineTo(0, -0.12 * h); x.closePath(); x.fillStyle = INK(k ? 0.55 : 0.4); x.fill();
    x.restore();
  }
  function peak(x, px, py, s, seed) {
    const r = rng(seed), lean = (r() - 0.5) * 0.25 * s, top = [px + lean, py - s * (0.95 + r() * 0.35)], L = [px - s * 0.62, py], R = [px + s * 0.62, py];
    x.beginPath(); x.moveTo(L[0], L[1]); x.lineTo(top[0], top[1]); x.lineTo(R[0], R[1]); x.closePath(); x.fillStyle = LIGHT; x.fill();
    // shadowed east face, hatched along the slope
    x.save(); x.beginPath(); x.moveTo(top[0], top[1]); x.lineTo(R[0], R[1]); x.lineTo(px + s * 0.06, py); x.closePath(); x.clip();
    x.strokeStyle = INK(0.72); x.lineWidth = Math.max(0.5, s * 0.022); const n = 6 + Math.floor(s / 5);
    for (let k = 0; k <= n; k++) { const u = k / n, ax = lerp(top[0], R[0], u), ay = lerp(top[1], R[1], u); x.beginPath(); x.moveTo(ax, ay); x.lineTo(ax - s * 0.5, ay + s * 0.62); x.stroke(); }
    x.restore();
    x.strokeStyle = INK(0.9); x.lineWidth = Math.max(0.7, s * 0.03); x.lineJoin = 'round';
    x.beginPath(); x.moveTo(L[0], L[1]); x.lineTo(top[0], top[1]); x.lineTo(R[0], R[1]); x.stroke();
    x.lineWidth = Math.max(0.5, s * 0.018); x.beginPath(); x.moveTo(top[0], top[1]); x.lineTo(px + s * 0.06 + (r() - 0.5) * s * 0.1, py - s * 0.15); x.stroke();
  }
  function volcano(x, p) {
    const s = p.s || 50, cx = p.x, cy = p.y, top = cy - s * 1.25, cw = s * 0.16;
    x.beginPath(); x.moveTo(cx - s * 0.95, cy); x.lineTo(cx - cw, top); x.lineTo(cx + cw, top); x.lineTo(cx + s * 0.95, cy); x.closePath(); x.fillStyle = LIGHT; x.fill();
    x.save(); x.clip(); x.strokeStyle = INK(0.75); x.lineWidth = 0.9; for (let k = 0; k < 22; k++) { const u = k / 22, ax = lerp(cx + cw * 0.2, cx + s * 0.95, u), ay = lerp(top, cy, u); x.beginPath(); x.moveTo(ax, ay); x.lineTo(ax - s * 0.6, ay + s * 0.9); x.stroke(); } x.restore();
    x.strokeStyle = INK(0.92); x.lineWidth = 1.5; x.beginPath(); x.moveTo(cx - s * 0.95, cy); x.lineTo(cx - cw, top); x.moveTo(cx + cw, top); x.lineTo(cx + s * 0.95, cy); x.stroke();
    x.fillStyle = RED; x.beginPath(); x.ellipse(cx, top, cw * 1.05, cw * 0.4, 0, 0, 6.283); x.fill(); x.strokeStyle = INK(0.9); x.lineWidth = 1; x.stroke();
    x.strokeStyle = REDA(0.85); x.lineWidth = 1.4; for (const [dx, ex] of [[-0.3, -0.35], [0.25, 0.4]]) { x.beginPath(); x.moveTo(cx + dx * cw * 2, top + 2); x.quadraticCurveTo(cx + ex * s * 0.5, top + s * 0.5, cx + ex * s * 0.75, top + s * 0.95); x.stroke(); }
    // smoke, in the old way: outlined puffs
    x.strokeStyle = INK(0.55); x.lineWidth = 0.9; x.fillStyle = LIGHT;
    for (let k = 0; k < 4; k++) { const px = cx + k * s * 0.18, py = top - s * 0.28 - k * s * 0.22, rr = s * (0.1 + k * 0.035); x.beginPath(); x.arc(px, py, rr, 0, 6.283); x.fill(); x.stroke(); }
  }
  function symbol(x, p) {
    const { x: px, y: py } = p;
    x.lineWidth = 1.3;
    switch (p.kind) {
      case 'seat': x.strokeStyle = RED; x.beginPath(); x.arc(px, py, 11, 0, 6.283); x.stroke(); x.beginPath(); x.arc(px, py, 6.5, 0, 6.283); x.stroke(); x.fillStyle = RED; x.beginPath(); x.arc(px, py, 3, 0, 6.283); x.fill(); break;
      case 'arena': x.strokeStyle = INK(0.9); x.fillStyle = LIGHT; x.beginPath(); x.ellipse(px, py, 11, 7, 0, 0, 6.283); x.fill(); x.stroke(); x.fillStyle = RED; x.fillRect(px - 3.5, py - 3.5, 3.5, 3.5); x.fillRect(px, py, 3.5, 3.5); x.fillStyle = INK(0.9); x.fillRect(px, py - 3.5, 3.5, 3.5); x.fillRect(px - 3.5, py, 3.5, 3.5); break;
      case 'town': x.strokeStyle = INK(0.9); x.fillStyle = LIGHT; x.beginPath(); x.arc(px, py, 5.5, 0, 6.283); x.fill(); x.stroke(); x.fillStyle = INK(0.9); x.beginPath(); x.arc(px, py, 2, 0, 6.283); x.fill(); break;
      case 'spire': x.fillStyle = INK(0.9); x.beginPath(); x.moveTo(px, py - 22); x.lineTo(px + 3, py - 4); x.lineTo(px - 3, py - 4); x.closePath(); x.fill(); x.strokeStyle = INK(0.9); x.beginPath(); x.arc(px, py, 3.5, 0, 6.283); x.stroke(); break;
      case 'shard': x.fillStyle = 'rgba(92,62,140,0.9)'; x.beginPath(); x.moveTo(px, py - 12); x.lineTo(px + 4, py); x.lineTo(px, py + 4); x.lineTo(px - 4, py); x.closePath(); x.fill(); break;
      default: break;
    }
  }
  function hallGlyph(x, px, py, s = 1) {
    x.save(); x.translate(px, py); x.scale(s, s); x.fillStyle = RED; x.strokeStyle = INK(0.9); x.lineWidth = 1;
    x.beginPath(); x.moveTo(-9, 0); x.lineTo(-9, -6); x.lineTo(0, -12); x.lineTo(9, -6); x.lineTo(9, 0); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = LIGHT; x.fillRect(-2, -5, 4, 5); x.restore();
  }
  function village(x, px, py) { x.strokeStyle = INK(0.85); x.fillStyle = LIGHT; x.lineWidth = 0.9; x.beginPath(); x.moveTo(-5 + px, py); x.lineTo(-5 + px, py - 5); x.lineTo(px, py - 9); x.lineTo(px + 5, py - 5); x.lineTo(px + 5, py); x.closePath(); x.fill(); x.stroke(); }
  function rookery(x, px, py) { x.strokeStyle = RED; x.lineWidth = 1.2; x.fillStyle = LIGHT; x.beginPath(); x.arc(px, py, 7, 0, 6.283); x.fill(); x.stroke(); x.beginPath(); x.moveTo(px - 4, py - 2); x.lineTo(px, py + 2.5); x.lineTo(px + 4, py - 2); x.stroke(); }
  function lair(x, px, py) { x.strokeStyle = RED; x.lineWidth = 1.2; x.beginPath(); x.arc(px, py, 7, 0, 6.283); x.stroke(); x.fillStyle = RED; x.beginPath(); x.arc(px, py, 2.6, 0, 6.283); x.fill(); x.beginPath(); x.arc(px + 7, py - 7, 3, -1.6, 0.2); x.stroke(); }
  function label(x, l) {
    x.save(); x.translate(l.x, l.y); if (l.rot) x.rotate(l.rot * Math.PI / 180);
    const col = l.red ? 'rgba(128,36,24,0.9)' : l.blue ? 'rgba(48,72,92,0.85)' : l.faint ? INK(0.55) : INK(0.86);
    x.font = `500 ${l.s}px Cinzel`; x.letterSpacing = l.sp + 'px'; x.textAlign = 'center'; x.fillStyle = col; x.fillText(l.t, l.sp / 2, 0); x.restore();
  }
  function placeName(x, p) {
    if (!p.name) return;
    const big = p.kind === 'seat' || p.kind === 'spire';
    x.save(); x.letterSpacing = big ? '2px' : '0px'; x.fillStyle = INK(0.88);
    const dx = p.kind === 'volcano' ? 0 : 16, align = p.kind === 'volcano' ? 'center' : 'left', dy = p.kind === 'volcano' ? 18 : big ? 6 : 5;
    x.textAlign = align; x.font = big ? '700 22px Cinzel' : p.kind === 'volcano' ? 'italic 400 15px "EB Garamond"' : 'italic 400 19px "EB Garamond"';
    x.fillText(p.name, p.x + dx, p.y + dy);
    if (p.note) { x.font = 'italic 400 15px "EB Garamond"'; x.letterSpacing = '0px'; x.fillText(p.note, p.x + dx + (big ? 2 : 0), p.y + dy + 17); }
    x.restore();
  }
  function dotted(x, pts, gap, rad, col) { const q = K.resample(pts, gap); x.fillStyle = col; for (const p of q) { x.beginPath(); x.arc(p[0], p[1], rad, 0, 6.283); x.fill(); } }
  function dashDot(x, pts, col, w = 1.3) { x.save(); x.strokeStyle = col; x.lineWidth = w; x.setLineDash([12, 5, 2, 5]); x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts) x.lineTo(p[0], p[1]); x.stroke(); x.restore(); }
  function nearAny(px, py, polys, d) { for (const pl of polys) for (const q of pl) if (Math.abs(q[0] - px) < d && Math.abs(q[1] - py) < d) return true; return false; }
  // runs of a closed polygon whose points satisfy keep()
  function runs(pts, keep) { const out = []; let cur = []; for (let i = 0; i <= pts.length; i++) { const p = pts[i % pts.length]; if (keep(p)) cur.push(p); else { if (cur.length > 1) out.push(cur); cur = []; } } if (cur.length > 1) out.push(cur); return out; }

  // drawInk(x, box): every line of the map in map units; box [x0,y0,x1,y1] culls glyphs outside a close shot
  function drawInk(x, box) {
    const r = rng(4511), vis = (px, py, m = 60) => !box || (px > box[0] - m && px < box[2] + m && py > box[1] - m && py < box[3] + m);
    x.lineCap = 'round'; x.lineJoin = 'round';
    // sea: rhumb lines from the compass, wave marks, ripples along the coast
    x.save(); x.beginPath(); for (const p of COAST) addPoly(x, p); x.clip();
    x.strokeStyle = INK(0.14); x.lineWidth = 0.7; for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; x.beginPath(); x.moveTo(237, 187); x.lineTo(237 + Math.cos(a) * 2400, 187 + Math.sin(a) * 2400); x.stroke(); }
    x.strokeStyle = INK(0.38); x.lineWidth = 0.8;
    for (let i = 0; i < 260; i++) { const px = 70 + r() * 640, py = 60 + r() * 1560; if (!M.inSea(px, py) || !vis(px, py)) continue; x.beginPath(); x.moveTo(px - 6, py); x.quadraticCurveTo(px - 3, py - 3, px, py); x.quadraticCurveTo(px + 3, py + 3, px + 6, py); x.stroke(); }
    for (const p of COAST) { const sgn = area(p) > 0 ? 1 : -1; for (let k = 1; k <= 5; k++) { x.strokeStyle = INK(0.34 * (1 - k / 6.5)); x.lineWidth = 0.8; x.beginPath(); addPoly(x, offset(p, sgn * k * 4.2)); x.stroke(); } }
    x.restore();
    // coast and lakes
    x.strokeStyle = INK(0.95); x.fillStyle = INK(0.95);
    for (const p of COAST) { const loop = p.concat([p[0]]); for (const run of runs(loop, q => q[0] > 6 && q[0] < D.w - 6 && q[1] > 6 && q[1] < D.h - 6)) K.nib(x, run, { w: 2.6, angle: -0.6, min: 0.45, taper: 0.002, jit: 0.25, seed: 9 }); }
    for (const p of LAKES) { x.lineWidth = 1.4; x.beginPath(); addPoly(x, p); x.stroke(); x.save(); x.beginPath(); addPoly(x, p); x.clip(); const sgn = area(p) > 0 ? -1 : 1; for (let k = 1; k <= 3; k++) { x.strokeStyle = INK(0.3 * (1 - k / 4)); x.lineWidth = 0.7; x.beginPath(); addPoly(x, offset(p, sgn * k * 3)); x.stroke(); } x.restore(); x.strokeStyle = INK(0.95); }
    // rivers, thin at the source
    x.fillStyle = INK(0.85); for (const rv of D.rivers) { const pts = K.resample(rv, 4); K.nib(x, K.wobble(pts, 1.2, 0.05, 3), { w: 2.2, angle: 0.3, min: 0.55, taper: 0.35, seed: 4 }); }
    // the glacier: crevasses and a fringed edge
    x.save(); x.beginPath(); for (const p of GLAC) addPoly(x, p); x.clip(); x.strokeStyle = INK(0.42); x.lineWidth = 0.8;
    for (let i = 0; i < 230; i++) { const px = 650 + r() * 720, py = 180 + r() * 300; if (!vis(px, py)) continue; const a = (r() - 0.5) * 0.8 + Math.atan2(py - 300, px - 1000) + 1.57; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 7, py + Math.sin(a) * 7); x.stroke(); }
    x.restore();
    x.strokeStyle = INK(0.7); x.lineWidth = 1; for (const p of GLAC) { const q = K.resample(p.concat([p[0]]), 5); x.beginPath(); for (let i = 0; i < q.length; i++) { const [px, py] = q[i]; const j = (i % 2) ? 2.5 : -1; i ? x.lineTo(px + j * 0.5, py + j) : x.moveTo(px, py); } x.stroke(); }
    // the Feral Ranges: diagonal hatching; their edge, the Wildmearc, dashed in red
    x.save(); x.beginPath(); for (const p of FERAL) addPoly(x, p); x.clip(); x.strokeStyle = REDA(0.22); x.lineWidth = 0.9;
    for (let k = -1700; k < 2000; k += 9) { x.beginPath(); x.moveTo(1100 + k, 0); x.lineTo(1100 + k + 1300, 1300); x.stroke(); }
    x.restore();
    x.save(); x.strokeStyle = REDA(0.85); x.lineWidth = 1.6; x.setLineDash([10, 7]);
    for (const p of FERAL) for (const run of runs(p, q => q[0] < 1760 && q[1] > 200 && !nearAny(q[0], q[1], GLAC, 8))) { x.beginPath(); x.moveTo(run[0][0], run[0][1]); for (const q of run) x.lineTo(q[0], q[1]); x.stroke(); }
    x.restore();
    // the realm's frontier where it meets other lands (not the sea)
    for (const p of REALM) for (const run of runs(p, q => !nearAny(q[0], q[1], COAST, 14) && q[0] > 8 && q[0] < D.w - 8 && q[1] > 82)) dashDot(x, run, REDA(0.85), 1.5);
    // lava fields: stipple and red runnels
    for (const p of LAVA) { x.save(); x.beginPath(); addPoly(x, p); x.clip(); x.fillStyle = INK(0.55); let xs = 1e9, ys = 1e9, xe = -1e9, ye = -1e9; for (const q of p) { xs = Math.min(xs, q[0]); ys = Math.min(ys, q[1]); xe = Math.max(xe, q[0]); ye = Math.max(ye, q[1]); } for (let i = 0; i < (xe - xs) * (ye - ys) / 22; i++) { const px = xs + r() * (xe - xs), py = ys + r() * (ye - ys); x.fillRect(px, py, 1.1, 1.1); } x.strokeStyle = REDA(0.9); x.lineWidth = 1.6; for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 12; i++) pts.push([lerp(xs + 8, xe - 8, i / 12), lerp(ys, ye, 0.3 + k * 0.2) + Math.sin(i * 1.3 + k * 2) * 8]); K.line(x, pts, 1); } x.restore(); x.strokeStyle = INK(0.8); x.lineWidth = 1; x.beginPath(); addPoly(x, p); x.stroke(); }
    // the Concord railway
    { const rl = D.rail; x.strokeStyle = INK(0.75); x.lineWidth = 1; for (const off of [-1.8, 1.8]) { x.beginPath(); rl.forEach((p, i) => i ? x.lineTo(p[0], p[1] + off) : x.moveTo(p[0], p[1] + off)); x.stroke(); } const q = K.resample(rl, 7); x.lineWidth = 0.8; for (const p of q) { x.beginPath(); x.moveTo(p[0], p[1] - 3.5); x.lineTo(p[0], p[1] + 3.5); x.stroke(); } }
    // roads, dotted in red
    for (const rd of D.roads) dotted(x, rd, 6.5, 1.25, REDA(0.85));
    // forests and mountains, back to front
    const glyphs = [];
    for (const t of D.trees) if (vis(t[0], t[1]) && !underLabel(t[0], t[1])) glyphs.push({ y: t[1], f: () => tree(x, t[0], t[1], 10 + (t[0] * 7 + t[1] * 13) % 5 + t[2], (t[0] + t[1]) % 3 === 0) });
    for (const p of PEAKS) if (vis(p[0], p[1])) glyphs.push({ y: p[1], f: () => peak(x, p[0], p[1], p[2], 300 + p[3]) });
    for (const p of Object.values(D.places)) if (p.kind === 'volcano' && vis(p.x, p.y)) glyphs.push({ y: p.y + 1, f: () => volcano(x, p) });
    glyphs.sort((a, b) => a.y - b.y); for (const g of glyphs) g.f();
    // places
    for (const v of D.villages) village(x, v[0], v[1]);
    for (const q of D.rookeries) rookery(x, q[0], q[1]);
    for (const q of D.lairs) lair(x, q[0], q[1]);
    for (const p of Object.values(D.places)) symbol(x, p);
    if (M.drawHalls !== false) D.halls.forEach(h => hallGlyph(x, h[0], h[1]));
    // names
    for (const l of D.labels) label(x, l);
    for (const p of Object.values(D.places)) placeName(x, p);
    // the rose and the border
    x.save(); x.globalCompositeOperation = 'source-over'; K.compass(x, 237, 187, 78, 0.5); x.restore();
    x.save(); x.font = '600 20px Cinzel'; x.textAlign = 'center'; x.fillStyle = INK(0.9); x.fillText('N', 237, 98); x.restore();
    x.strokeStyle = INK(0.85); x.lineWidth = 2; x.strokeRect(14, 14, D.w - 28, D.h - 28); x.lineWidth = 0.8; x.strokeRect(22, 22, D.w - 44, D.h - 44);
    x.fillStyle = RED; for (const [cx, cy] of [[18, 18], [D.w - 18, 18], [18, D.h - 18], [D.w - 18, D.h - 18], [D.w / 2, 18], [D.w / 2, D.h - 18], [18, D.h / 2], [D.w - 18, D.h / 2]]) { x.beginPath(); x.moveTo(cx, cy - 6); x.lineTo(cx + 6, cy); x.lineTo(cx, cy + 6); x.lineTo(cx - 6, cy); x.closePath(); x.fill(); }
  }
  M.ink = () => K.cached('map:ink', () => { const c = K.canvas(D.w * SC, D.h * SC), x = c.getContext('2d'); x.scale(SC, SC); drawInk(x, null); return c; });
  // inkRegion(x0, y0, w, h, s): the ink of one area at s pixels per unit (for close shots); cached by its arguments
  M.inkRegion = (x0, y0, w, h, s) => K.cached(`map:ink:${x0},${y0},${w},${h},${s}`, () => { const c = K.canvas(w * s, h * s), x = c.getContext('2d'); x.scale(s, s); x.translate(-x0, -y0); drawInk(x, [x0, y0, x0 + w, y0 + h]); return c; });
  // draw(ctx, o): lay the map down in map units under the current transform. o.ink (0..1) fades the ink; o.paper (0..1);
  //   o.region [x0,y0,w,h,s] uses a sharper ink for that area (falls back to the sheet elsewhere)
  M.draw = (ctx, o = {}) => {
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = o.paper != null ? o.paper : 1; ctx.drawImage(M.paper(), 0, 0, D.w, D.h);
    const ia = o.ink != null ? o.ink : 1;
    if (ia > 0) {
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = ia; ctx.drawImage(M.ink(), 0, 0, D.w, D.h);
      if (o.region) { const [x0, y0, w, h, s] = o.region; ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip(); ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(M.paper(), x0 * SC, y0 * SC, w * SC, h * SC, x0, y0, w, h); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(M.inkRegion(x0, y0, w, h, s), x0, y0, w, h); ctx.restore(); }
    }
    ctx.restore();
  };
  M.hallGlyph = hallGlyph;
})();
