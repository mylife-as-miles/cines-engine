/* AUTOPILOT · set: CITY, the hottest hours (Q09 12–32)
   Bleached cream-white English streets at noon in a heatwave. Every view is through a pane: a stopped car's windscreen
   (the sun in its frit), a shop window (the heat over the tarmac given back as refraction in its glass), an upper sash
   window looking down (islands of shade on a white road), a bus shelter's scratched side panel (the dog in its slit of
   shade), a café window (a man at a roadside stall pouring melting ice into a bucket). Shadows shrink to slits; glare
   stands in for shade; nothing moves but the heat. No wind: awnings, flags and hanging baskets hang still.
   Views: street · shopwindow · crossing · shelter · stall (film/api/city.md). The people and the dog come from RIG
   ('pedestrian', 'stallman', 'dog'); anchors give where and how big. Deterministic; static layers cached under 'city|...'. */
(function () {
  'use strict';
  const W = OTM.W, H = OTM.H, P = LC.P, TAU = Math.PI * 2;
  const { rgba, mix, clamp, lerp, rng, vnoise } = OTM;
  const deg = d => d * Math.PI / 180;
  const warn = m => { if (window.FILM && FILM.warn) FILM.warn('city: ' + m); };

  // =====================================================================================
  // KIT (as in the car park and office sets)
  // =====================================================================================
  const pool = {};
  function scratch(name, w, h, box) {
    w = w || W; h = h || H; let g = pool[name];
    if (!g || g.canvas.width !== w || g.canvas.height !== h) g = pool[name] = OTM.makeCanvas(w, h).getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    if (box) g.clearRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4); else g.clearRect(0, 0, w, h); return g;
  }
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  function mkCam(o) {
    o = Object.assign({ cx: W / 2, cy: H / 2, yaw: 0, pitch: 0, roll: 0 }, o);
    const c = LC.camera(o), cyw = Math.cos(o.yaw), syw = Math.sin(o.yaw), cp = Math.cos(o.pitch), sp = Math.sin(o.pitch), cr = Math.cos(o.roll), sr = Math.sin(o.roll);
    c.pos = [o.x, o.y, o.z]; c.o = o;
    c.view = q => { const dx = q[0] - o.x, dy = q[1] - o.y, dz = q[2] - o.z; const x1 = dx * cyw - dz * syw, z1 = dx * syw + dz * cyw; const y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp; return [x1 * cr + y2 * sr, -x1 * sr + y2 * cr, z2]; };
    c.sp = v => [o.cx + o.f * v[0] / v[2], o.cy - o.f * v[1] / v[2], v[2]];
    return c;
  }
  function mirrorCam(cam, o, n) {
    const refl = q => { const d = (q[0] - o[0]) * n[0] + (q[1] - o[1]) * n[1] + (q[2] - o[2]) * n[2]; return [q[0] - 2 * d * n[0], q[1] - 2 * d * n[1], q[2] - 2 * d * n[2]]; };
    const m = { f: cam.f, cx: cam.cx, cy: cam.cy, k: cam.k, o: cam.o, mirror: true, pos: refl(cam.pos) };
    m.p = (x, y, z) => cam.p(refl(Array.isArray(x) ? x : [x, y, z])); m.view = q => cam.view(refl(q)); m.sp = cam.sp; return m;
  }
  function clipNear(vs, zn) {
    const out = [];
    for (let i = 0; i < vs.length; i++) { const a = vs[i], b = vs[(i + 1) % vs.length], ia = a[2] > zn, ib = b[2] > zn; if (ia) out.push(a); if (ia !== ib) { const t = (zn - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, zn]); } }
    return out;
  }
  function path3(cam, pts) { const vs = clipNear(pts.map(cam.view), 0.05), p = new Path2D(); vs.forEach((v, i) => { const s = cam.sp(v); if (i) p.lineTo(s[0], s[1]); else p.moveTo(s[0], s[1]); }); if (vs.length) p.closePath(); return p; }
  function scr3(cam, pts) { return clipNear(pts.map(cam.view), 0.05).map(v => cam.sp(v)); }
  function fill3(g, cam, pts, style, alpha) { g.save(); if (alpha != null) g.globalAlpha = alpha; g.fillStyle = style; g.fill(path3(cam, pts)); g.restore(); }
  function line3(g, cam, a, b, style, w) { const s = clipNear([cam.view(a), cam.view(b)], 0.05); if (s.length < 2) return; const p0 = cam.sp(s[0]), p1 = cam.sp(s[1]); g.strokeStyle = style; g.lineWidth = w; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
  function bboxOf(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
  function box3(g, cam, a, b, col) {
    const [x0, y0, z0] = a, [x1, y1, z1] = b, Pp = cam.pos, F = [];
    if (Pp[2] < z0) F.push(['zn', [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]]]);
    if (Pp[2] > z1) F.push(['zp', [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]]);
    if (Pp[0] < x0) F.push(['xn', [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]]]);
    if (Pp[0] > x1) F.push(['xp', [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]]);
    if (Pp[1] > y1) F.push(['top', [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]]);
    if (Pp[1] < y0) F.push(['bottom', [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]]);
    F.forEach(([k, pts]) => { const c = typeof col === 'function' ? col(k) : (col[k] || col.side); if (c) fill3(g, cam, pts, c); });
  }
  const cached = (c, key, fn, w, h) => c.cache('city|' + key, fn, w, h);
  const quarter = (c, key, fn) => c.cache('city|' + key, (g, cv) => { g.scale(0.25, 0.25); fn(g, cv); }, W / 4, H / 4);
  const blurInto = (g, fn, px) => { const l = LC.layer(g.canvas.width, g.canvas.height); fn(l); g.drawImage(LC.blurred(l.canvas, px, false), 0, 0); };
  // heat: redraw a band of an image in thin rows, each slid sideways by rising waves (refraction in the air)
  function heatBand(g, img, y0, y1, t, amp, o) {
    o = o || {}; const step = o.step || 3, sx = o.sx || 0, sy = o.sy || 0;
    for (let y = Math.floor(y0); y < y1; y += step) { const u = (y - y0) / Math.max(1, y1 - y0), a = amp * Math.sin(Math.PI * u) * (0.7 + 0.3 * Math.sin(u * 7 + t * 0.9));
      const off = a * (Math.sin(y * 0.21 - t * 7.5) * 0.65 + Math.sin(y * 0.083 + t * 3.7 + 1.3) * 0.35);
      g.drawImage(img, sx, y - sy, img.width - sx, step, off, y, img.width - sx, step); }
  }

  // =====================================================================================
  // PALETTE: noon heat. Bleached cream-white; brick sun-faded; shadows shrunk to slits; glare for shade.
  // =====================================================================================
  const CP = {
    sky: ['#F7F3E7', '#F2EBDA', '#E9E8DF'], sun: '#FFFDF4',
    brick: [['#CFA88B', '#A9846B', '#6E5244'], ['#D2B396', '#AD8D73', '#725A49'], ['#C59A7E', '#A07A63', '#674A3D'], ['#D9C7AA', '#B4A086', '#77664F']],
    render: ['#EFE7D3', '#CFC5AE', '#8E8572'], stone: '#F1EBDC', tar: ['#CBC4B4', '#B3AC9D', '#8F897C'], pave: ['#E1DACA', '#C9C1AF'], line: '#F7F4EA',
    shade: '#4E4E4A', slit: '#2F3231', glassSky: '#E6EAE4', glassDark: '#3C4446', metal: ['#46524F', '#2C3533', '#ECEDE4'],
    leaf: ['#9AA272', '#77805A', '#4F5641'], awning: ['#E6DCC6', '#8FA49E'],
  };
  const SUN = nrm([0.25, 0.92, 0.3]);     // high and a little south: shadows short

  // ---------- a terraced street: brick or render, sash windows, shopfronts, cornices ----------
  // a building front at x = side * xf, facing the road, from z0 to z1, height h; o: {kind, seed, lit (0..1), shop}
  function frontage(g, cam, side, xf, z0, z1, h, o) {
    o = o || {}; const x = side * xf, R = rng('bld' + Math.round(z0 * 10) + side + (o.seed || ''));
    const pal = o.render ? CP.render : CP.brick[Math.floor(R() * CP.brick.length)], lit = o.lit == null ? 1 : o.lit;
    const wallC = mix(pal[1], pal[0], lit), F = (y0, y1, za, zb, c, a) => fill3(g, cam, [[x, y0, za], [x, y1, za], [x, y1, zb], [x, y0, zb]], c, a);
    F(0, h, z0, z1, wallC);
    if (!o.render) for (let y = 0.45; y < h; y += 0.45) line3(g, cam, [x, y, z0], [x, y, z1], rgba(pal[2], 0.07), 1);
    // the shopfront: fascia, glass, stall riser, a recessed door; the glass gives back the white street
    const sf = o.shop !== false;
    if (sf) { F(2.95, 3.45, z0 + 0.15, z1 - 0.15, R() < 0.5 ? '#E9E2CF' : mix('#5E7470', '#B7C1B9', 0.5 + lit * 0.3)); F(3.45, 3.52, z0 + 0.1, z1 - 0.1, CP.stone);
      F(0.55, 2.9, z0 + 0.25, z1 - 0.25, mix(CP.glassDark, CP.glassSky, 0.55 + 0.25 * lit)); F(0, 0.55, z0 + 0.25, z1 - 0.25, mix(pal[2], '#3E4442', 0.4));
      const dz = z0 + (z1 - z0) * (R() < 0.5 ? 0.18 : 0.72); F(0, 2.6, dz, dz + 1.0, '#2E3838');
      for (let z = z0 + 0.25; z < z1 - 0.3; z += 1.3) line3(g, cam, [x, 0.55, z], [x, 2.9, z], rgba('#2E3838', 0.7), 1.5);
      // the glare in a shop window: a hard white slab where the sun's angle catches it
      if (R() < 0.6) { const za = z0 + 0.4 + R() * (z1 - z0 - 1.6); F(0.7, 2.8, za, za + 0.5 + R() * 0.8, rgba('#FFFFFF', 0.55 * lit + 0.2)); }
      // the awning's slit of shade under the fascia
      F(2.6, 2.95, z0 + 0.2, z1 - 0.2, rgba(CP.slit, 0.35)); }
    // upper storeys: sash windows in pairs, stone sills and lintels, glass full of sky
    const floors = Math.floor((h - 3.8) / 2.9);
    for (let f = 0; f < floors; f++) { const y0 = 4.2 + f * 2.9, nW = Math.max(2, Math.floor((z1 - z0) / 2.1));
      for (let i = 0; i < nW; i++) { const zc = z0 + (i + 0.5) * (z1 - z0) / nW, za = zc - 0.5, zb = zc + 0.5;
        F(y0 - 0.12, y0, za - 0.08, zb + 0.08, CP.stone); F(y0 + 1.75, y0 + 1.95, za - 0.06, zb + 0.06, mix(CP.stone, pal[1], 0.3));
        const glare = R() < 0.25 * lit;
        F(y0, y0 + 1.75, za, zb, glare ? '#FBFAF2' : mix(CP.glassSky, CP.glassDark, 0.25 + R() * 0.35));
        F(y0 + 0.86, y0 + 0.92, za, zb, '#EDE8DA'); line3(g, cam, [x, y0, zc], [x, y0 + 1.75, zc], rgba('#EDE8DA', 0.9), 1.2);
        F(y0, y0 + 1.75, za, za + 0.08, rgba(CP.slit, 0.45 * lit + 0.15)); } }
    // cornice and parapet; a slit of shadow under the cornice
    F(h - 0.5, h - 0.25, z0, z1, mix(CP.stone, pal[1], 0.15)); F(h - 0.62, h - 0.5, z0, z1, rgba(CP.slit, 0.5)); F(h - 0.25, h + 0.35, z0, z1, mix(wallC, pal[2], 0.15));
    // the party wall line
    line3(g, cam, [x, 0, z0], [x, h + 0.35, z0], rgba(pal[2], 0.35), 1.2);
  }
  function lampPost(g, cam, x, z, o) {
    o = o || {}; const b = cam.p(x, 0, z), t = cam.p(x, 4.6, z); if (b[2] <= 0.3) return; const k = cam.f / b[2];
    g.fillStyle = CP.metal[1]; g.fillRect(b[0] - 0.07 * k, t[1], 0.14 * k, b[1] - t[1]); g.fillRect(b[0] - 0.12 * k, b[1] - 0.6 * k, 0.24 * k, 0.6 * k);
    g.fillStyle = CP.metal[2]; g.fillRect(b[0] - 0.035 * k, t[1], 0.025 * k, b[1] - t[1]);
    g.fillStyle = CP.metal[1]; g.fillRect(t[0] - 0.16 * k, t[1] - 0.45 * k, 0.32 * k, 0.45 * k); g.fillStyle = '#F4F2E8'; g.fillRect(t[0] - 0.11 * k, t[1] - 0.4 * k, 0.22 * k, 0.3 * k);
    if (o.basket) { // a hanging basket, its flowers drooping in the heat, the chain dead straight: no wind
      const bx = t[0] + 0.55 * k * (o.side || 1), by = t[1] + 0.25 * k; g.strokeStyle = CP.metal[1]; g.lineWidth = Math.max(1, 0.02 * k); g.beginPath(); g.moveTo(t[0], t[1] - 0.2 * k); g.lineTo(bx, t[1] - 0.2 * k); g.lineTo(bx, by); g.stroke();
      const R = rng('basket' + x + z); g.fillStyle = '#4E5440'; g.beginPath(); g.ellipse(bx, by + 0.12 * k, 0.24 * k, 0.16 * k, 0, 0, TAU); g.fill();
      for (let i = 0; i < 18; i++) { const u = R() * 2 - 1, d = 0.1 + R() * 0.32; g.strokeStyle = R() < 0.5 ? '#7E7A58' : '#9A8E66'; g.lineWidth = Math.max(1, 0.02 * k); g.beginPath(); g.moveTo(bx + u * 0.22 * k, by + 0.14 * k); g.quadraticCurveTo(bx + u * 0.3 * k, by + 0.2 * k, bx + u * 0.26 * k, by + (0.14 + d) * k); g.stroke();
        g.fillStyle = R() < 0.5 ? '#C9AE8A' : '#B89A74'; g.beginPath(); g.arc(bx + u * 0.26 * k, by + (0.14 + d) * k, Math.max(1, 0.03 * k), 0, TAU); g.fill(); } }
  }
  function tree(g, cam, x, z, r, h, o) {
    o = o || {}; const b = cam.p(x, 0, z), top = cam.p(x, h, z); if (b[2] <= 0.4) return; const k = cam.f / b[2], R = rng('ctree' + x + z);
    g.fillStyle = '#7A6E58'; g.fillRect(b[0] - 0.14 * k, top[1], 0.28 * k, b[1] - top[1]); g.fillStyle = 'rgba(255,250,236,0.35)'; g.fillRect(b[0] - 0.14 * k, top[1], 0.07 * k, b[1] - top[1]);
    const blobs = []; for (let i = 0; i < 9; i++) blobs.push([top[0] + (R() - 0.5) * 1.5 * r * k, top[1] - (0.2 + R() * 0.9) * r * k, (0.38 + R() * 0.3) * r * k]);
    const crown = new Path2D(); blobs.forEach(([cx, cy, rr]) => { const pts = []; for (let i = 0; i < 22; i++) { const a = i / 22 * TAU, n = 0.82 + 0.25 * vnoise(Math.cos(a) * 2 + cx * 0.01, Math.sin(a) * 2, 3); pts.push([cx + Math.cos(a) * rr * n, cy + Math.sin(a) * rr * n * 0.86]); } crown.addPath(LC.pathPts(pts)); });
    g.fillStyle = CP.leaf[1]; g.fill(crown); g.save(); g.clip(crown);
    blobs.forEach(([cx, cy, rr]) => { g.fillStyle = CP.leaf[0]; g.beginPath(); g.ellipse(cx + rr * 0.15, cy - rr * 0.45, rr * 0.8, rr * 0.5, 0, 0, TAU); g.fill(); });
    g.fillStyle = rgba(CP.leaf[2], 0.8); g.beginPath(); g.ellipse(top[0], top[1] + 0.05 * r * k, 1.1 * r * k, 0.35 * r * k, 0, 0, TAU); g.fill(); g.restore();
    return;
    const pts = [];
    for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, n = 0.7 + 0.36 * vnoise(Math.cos(a) * 2.2 + x, Math.sin(a) * 2.2, 3) + 0.12 * vnoise(Math.cos(a) * 8 + z, Math.sin(a) * 8, 5); pts.push([top[0] + Math.cos(a) * r * k * n * 0.8, top[1] - r * k * 0.25 + Math.sin(a) * r * k * n * 1.1]); }
    const cr = LC.pathPts(pts); g.fillStyle = CP.leaf[0]; g.fill(cr);
    g.save(); g.clip(cr); g.fillStyle = CP.leaf[1]; g.beginPath(); g.ellipse(top[0] - 0.12 * r * k, top[1] + 0.25 * r * k, r * k, r * k * 0.7, 0, 0, TAU); g.fill();
    g.fillStyle = CP.leaf[2]; g.beginPath(); g.ellipse(top[0], top[1] + 0.62 * r * k, r * k * 0.9, r * k * 0.35, 0, 0, TAU); g.fill(); g.restore();
  }
  // a parked car in the noon glare: a dark body, its roof and glass a slab of white
  function parkedCar(g, cam, x, z, len, o) {
    o = o || {}; const c = o.color || '#5E6466';
    box3(g, cam, [x - 0.88, 0.25, z], [x + 0.88, 0.95, z + len], { top: mix(c, '#F4F2EA', 0.5), side: mix(c, '#000000', 0.25), zn: mix(c, '#000000', 0.35), zp: mix(c, '#000000', 0.35) });
    box3(g, cam, [x - 0.72, 0.95, z + len * 0.25], [x + 0.72, 1.42, z + len * 0.72], { top: '#F7F6EE', side: '#DDE2DC', zn: '#E9EDE6', zp: '#C9CEC8' });
    fill3(g, cam, [[x - 0.95, 0.002, z - 0.1], [x + 0.95, 0.002, z - 0.1], [x + 0.95, 0.002, z + len + 0.1], [x - 0.95, 0.002, z + len + 0.1]], rgba(CP.slit, 0.75));
    [z + 0.6, z + len - 0.6].forEach(wz => { const p = cam.p(x + (cam.pos[0] < x ? -0.9 : 0.9), 0.3, wz), k = cam.f / Math.max(0.3, p[2]); g.fillStyle = '#141616'; g.beginPath(); g.ellipse(p[0], p[1], 0.12 * k, 0.3 * k, 0, 0, TAU); g.fill(); });
  }

  // =====================================================================================
  // FIGURES (demos only; RIG draws the people and the dog in the film)
  // =====================================================================================
  function figure(g, x, y, k, o) {
    o = o || {}; const f = o.facing || 1, ph = o.phase || 0, walk = o.body === 'walk' ? 1 : 0; g.save(); g.translate(x, y); g.scale(k * f, k);
    const sw = Math.sin(ph * TAU) * 0.22 * walk; g.fillStyle = o.color || '#3A3C3A'; const S = pts => g.fill(LC.smooth(pts));
    S([[-0.07, -0.9], [0.05, -0.9], [0.06 + sw * 0.5, -0.45], [0.1 + sw, -0.02], [0.0 + sw, 0], [-0.02 + sw * 0.3, -0.45]]);
    S([[-0.05, -0.9], [0.07, -0.9], [0.04 - sw * 0.3, -0.45], [0.02 - sw, 0], [-0.08 - sw, -0.02], [-0.06 - sw * 0.5, -0.45]]);
    S([[-0.17, -0.92], [0.17, -0.92], [0.2, -1.2], [0.18, -1.42], [0.06, -1.46], [-0.06, -1.46], [-0.19, -1.42], [-0.2, -1.2]]);
    g.beginPath(); g.ellipse(0.01, -1.6, 0.085, 0.11, 0, 0, TAU); g.fill();
    if (o.arms === 'pour') S([[0.12, -1.42], [0.2, -1.4], [0.42, -1.3], [0.5, -1.22], [0.44, -1.18], [0.2, -1.26]]);
    else S([[0.13, -1.42], [0.2, -1.38], [0.22 - sw * 0.6, -1.0], [0.16 - sw * 0.6, -0.98], [0.12, -1.3]]);
    if (o.rim) { g.strokeStyle = o.rim; g.lineWidth = 0.02; g.beginPath(); g.ellipse(0.01, -1.6, 0.085, 0.11, 0, -2.4, -0.6); g.stroke(); g.beginPath(); g.moveTo(-0.17, -1.42); g.quadraticCurveTo(0, -1.5, 0.18, -1.42); g.stroke(); }
    g.restore();
  }
  // a dog lying on its side in the shade, head on its paws, panting (the RIG dog replaces it)
  function dogFigure(g, x, y, k, o) {
    o = o || {}; const f = o.facing || 1, pant = Math.sin((o.t || 0) * 9) * 0.008; g.save(); g.translate(x, y); g.scale(k * f, k);
    g.fillStyle = o.color || '#6E5A44'; const S = pts => g.fill(LC.smooth(pts));
    S([[-0.42, -0.02], [-0.38, -0.2 - pant], [-0.1, -0.27 - pant], [0.22, -0.25], [0.36, -0.16], [0.4, -0.04], [0.1, 0.0]]);
    S([[0.32, -0.12], [0.42, -0.24], [0.58, -0.26], [0.68, -0.2], [0.7, -0.1], [0.6, -0.04], [0.4, -0.04]]);
    S([[0.44, -0.24], [0.5, -0.34], [0.56, -0.25]]);
    S([[0.3, -0.03], [0.74, -0.04], [0.76, 0.0], [0.3, 0.01]]); S([[-0.5, -0.06], [-0.42, -0.1], [-0.36, -0.06], [-0.6, 0.0]]);
    g.fillStyle = '#8A3E3A'; g.beginPath(); g.ellipse(0.7, -0.08 + pant * 2, 0.025, 0.04, 0.3, 0, TAU); g.fill();
    g.fillStyle = rgba('#F2E8D2', 0.5); g.beginPath(); g.moveTo(-0.38, -0.2 - pant); g.quadraticCurveTo(-0.1, -0.29, 0.22, -0.25); g.lineTo(0.2, -0.235); g.quadraticCurveTo(-0.1, -0.27, -0.37, -0.19); g.fill();
    g.restore();
  }
  function person(g, who, pose, opts) {
    if (window.RIG && RIG.CHAR && RIG.CHAR[who] && typeof RIG.draw === 'function') { try { return RIG.draw(g, who, pose, opts || {}); } catch (e) { warn('RIG.draw ' + who + ': ' + e.message); } }
    if (who === 'dog') dogFigure(g, pose.at[0], pose.at[1], pose.scale, { facing: pose.facing, t: pose.t, color: opts && opts.color });
    else figure(g, pose.at[0], pose.at[1], pose.scale, { facing: pose.facing, body: pose.body, phase: pose.phase, arms: pose.arms, color: opts && opts.color, rim: opts && opts.rim });
    return null;
  }

  // =====================================================================================
  // STREET (Q09 12–32): glass, brick and metal under the noon sun, from a stopped car: the high street runs away from us,
  // the sun high in the windscreen's frit, the tarmac's far end liquid with heat. Nothing stirs: the flag hangs, the
  // baskets hang, the trees are still. s.windscreen (default true), s.heat (0..1, default 1)
  // -------------------------------------------------------------------------------------
  const ST = { cam: () => mkCam({ x: -1.55, y: 1.22, z: 0, yaw: deg(2.5), pitch: deg(4), f: 1080 }) };
  const STREET_BLDS = (() => { const out = [], R = rng('street-blds'); [-1, 1].forEach(side => { let z = 2; while (z < 140) { const w = 6 + R() * 4, h = 9 + R() * 4; out.push({ side, z0: z, z1: z + w, h, render: R() < 0.22 }); z += w; } }); return out; })();
  function streetScene(g, cam, o) {
    o = o || {};
    const sky = LC.lin(g, 0, 0, 0, cam.p(0, 1.2, 400)[1], [[0, CP.sky[2]], [0.6, CP.sky[1]], [1, CP.sky[0]]]); g.fillStyle = sky; g.fillRect(0, 0, g.canvas.width, g.canvas.height);
    // the road, the pavements, kerbs
    fill3(g, cam, [[-4.2, 0, 0], [4.2, 0, 0], [4.2, 0, 400], [-4.2, 0, 400]], CP.tar[0]);
    [-1, 1].forEach(s => { fill3(g, cam, [[s * 4.2, 0.12, 0], [s * 7.5, 0.12, 0], [s * 7.5, 0.12, 400], [s * 4.2, 0.12, 400]], CP.pave[0]); fill3(g, cam, [[s * 4.2, 0, 0], [s * 4.2, 0.12, 0], [s * 4.2, 0.12, 400], [s * 4.2, 0, 400]], s < 0 ? '#F2EEE2' : CP.pave[1]);
      for (let z = 1; z < 160; z += 0.9) line3(g, cam, [s * 4.25, 0.121, z], [s * 7.5, 0.121, z], rgba('#8F897C', 0.12), 1); });
    // road markings: the centre line in dashes, a zebra ahead, the give-way at the junction
    for (let z = 3; z < 240; z += 9) fill3(g, cam, [[-0.06, 0.003, z], [0.06, 0.003, z], [0.06, 0.003, z + 4], [-0.06, 0.003, z + 4]], CP.line);
    for (let i = 0; i < 12; i++) { const x = -4.0 + i * 0.7; fill3(g, cam, [[x, 0.003, 24], [x + 0.42, 0.003, 24], [x + 0.42, 0.003, 27], [x, 0.003, 27]], rgba(CP.line, 0.95)); }
    // the buildings, near to far each side
    STREET_BLDS.slice().sort((a, b) => b.z0 - a.z0).forEach(b => frontage(g, cam, b.side, 7.5, b.z0, b.z1, b.h, { render: b.render, lit: b.side < 0 ? 1 : 0.35, seed: 's' }));
    // shade: shrunk to slits along the base of the shaded side, under the awnings
    fill3(g, cam, [[4.2, 0.125, 0], [7.5, 0.125, 0], [7.5, 0.125, 140], [4.2, 0.125, 140]], rgba(CP.slit, 0.0));
    fill3(g, cam, [[6.6, 0.126, 0], [7.5, 0.126, 0], [7.5, 0.126, 140], [6.6, 0.126, 140]], rgba(CP.slit, 0.55));
    fill3(g, cam, [[-7.5, 0.126, 0], [-7.1, 0.126, 0], [-7.1, 0.126, 140], [-7.5, 0.126, 140]], rgba(CP.slit, 0.4));
    // the end of the vista: a church tower and the heat-white haze
    { const a = cam.p(-3, 0, 260), b = cam.p(3, 26, 260); g.fillStyle = mix(CP.render[1], CP.sky[0], 0.55); g.fillRect(a[0], b[1], b[0] - a[0], a[1] - b[1]); const sp = cam.p(0, 34, 260); g.beginPath(); g.moveTo(a[0] + (b[0] - a[0]) * 0.25, b[1]); g.lineTo(sp[0], sp[1]); g.lineTo(a[0] + (b[0] - a[0]) * 0.75, b[1]); g.closePath(); g.fill(); }
    // street furniture: lamp posts with hanging baskets, bollards, a railing, trees, parked cars and a van
    [10, 34, 58, 82].forEach((z, i) => { lampPost(g, cam, -4.6, z, { basket: true, side: 1 }); lampPost(g, cam, 4.6, z + 12, { basket: true, side: -1 }); });
    [16, 46, 76].forEach(z => tree(g, cam, 5.6, z, 2.4, 5.2));
    for (let z = 2; z < 30; z += 2.2) box3(g, cam, [-4.45, 0.12, z], [-4.33, 1.0, z + 0.12], { side: '#262E2C', top: '#F4F2E8', xp: '#3A4442' });
    for (let z = 30; z < 70; z += 0.5) line3(g, cam, [4.4, 0.12, z], [4.4, 1.05, z], rgba(CP.metal[1], 0.9), 1.4); line3(g, cam, [4.4, 1.05, 30], [4.4, 1.05, 70], CP.metal[2], 1.5);
    parkedCar(g, cam, 3.15, 8, 4.2, { color: '#6A6F70' }); parkedCar(g, cam, 3.15, 19, 4.4, { color: '#2E3A44' }); parkedCar(g, cam, -3.15, 40, 4.2, { color: '#8E8678' });
    box3(g, cam, [2.2, 0.3, 50], [4.1, 2.5, 55.5], { top: '#FBFAF4', xn: '#E6E4DA', zn: '#D4D1C6', side: '#C9C5B8' });
    // a flag on a pole over a doorway, hanging dead straight: no wind
    { const fp = cam.p(-7.5, 7.0, 30), fe = cam.p(-6.2, 7.6, 30), k = cam.f / Math.max(0.3, fp[2]); g.strokeStyle = CP.metal[1]; g.lineWidth = Math.max(1, 0.04 * k); g.beginPath(); g.moveTo(fp[0], fp[1]); g.lineTo(fe[0], fe[1]); g.stroke();
      g.fillStyle = '#B9B6AA'; g.beginPath(); g.moveTo(fe[0], fe[1]); g.lineTo(fe[0] + 0.05 * k, fe[1] + 1.6 * k); g.lineTo(fe[0] - 0.35 * k, fe[1] + 1.65 * k); g.lineTo(fe[0] - 0.4 * k, fe[1] + 0.1 * k); g.closePath(); g.fill(); }
  }
  const street = {
    back(c, t, s) {
      s = s || {}; const g = c.g, cam = ST.cam();
      const sc = cached(c, 'street|scene', sg => streetScene(sg, cam));
      g.drawImage(sc, 0, 0);
      // heat: the far tarmac and everything standing on it waver in a band about the horizon
      const hz = cam.p(0, 0, 300)[1], k = s.heat == null ? 1 : s.heat;
      if (k > 0) { const vx = cam.p(0, 0, 300)[0], bw = 460, y0 = Math.floor(hz - 34), y1 = Math.ceil(hz + 20), hb = scratch('ct-heat', W, H, { x: vx - bw / 2, y: y0, w: bw, h: y1 - y0 });
        hb.save(); hb.beginPath(); hb.rect(vx - bw / 2, y0, bw, y1 - y0); hb.clip(); heatBand(hb, sc, y0, y1, t, 3.2 * k, { step: 2 }); hb.restore();
        hb.globalCompositeOperation = 'destination-in'; hb.fillStyle = LC.lin(hb, vx - bw / 2, 0, vx + bw / 2, 0, [[0, '#000000', 0], [0.35, '#000000', 1], [0.65, '#000000', 1], [1, '#000000', 0]]); hb.fillRect(vx - bw / 2, y0, bw, y1 - y0); hb.globalCompositeOperation = 'source-over';
        g.drawImage(hb.canvas, vx - bw / 2, y0, bw, y1 - y0, vx - bw / 2, y0, bw, y1 - y0);
        g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.lin(g, 0, hz - 30, 0, hz + 30, [[0, '#FFFFFF', 0], [0.5, '#FFFFFF', 0.28 * k], [1, '#FFFFFF', 0]]); g.fillRect(0, hz - 30, W, 60); g.restore(); }
      const em = quarter(c, 'street|em', eg => { eg.fillStyle = 'rgba(255,253,244,0.5)'; eg.fillRect(0, 0, W, cam.p(0, 0, 300)[1] - 40); });
      c.em.save(); c.em.globalAlpha = 0.5; c.em.drawImage(em, 0, 0, W, H); c.em.restore();
    },
    front(c, t, s) {
      s = s || {}; if (s.windscreen === false) return; const g = c.g;
      g.drawImage(cached(c, 'street|screen', fg => {
        const top = 150, dash = 890, glass = new Path2D(); glass.moveTo(60, top); glass.lineTo(1860, top); glass.lineTo(1912, dash); glass.lineTo(8, dash); glass.closePath();
        // the windscreen: the dashboard laid in it upside down, wiper arcs and dust lit by the high sun
        fg.save(); fg.clip(glass); fg.globalCompositeOperation = 'screen'; fg.fillStyle = LC.lin(fg, 0, dash - 220, 0, dash, [[0, '#E9E4D6', 0], [1, '#E9E4D6', 0.26]]); fg.fillRect(0, dash - 220, W, 220);
        for (let x = 420; x < 1120; x += 26) { fg.fillStyle = 'rgba(40,40,40,0.14)'; fg.fillRect(x, dash - 46, 10, 30); }
        fg.lineCap = 'round'; const pv = [1000, 1250]; for (let i = 0; i < 50; i++) { const r = 760 + i * 10; fg.strokeStyle = rgba('#FFF8E8', 0.025 + 0.03 * vnoise(i, 1, 4)); fg.lineWidth = 1; fg.beginPath(); fg.arc(pv[0], pv[1], r, -Math.PI * 0.86, -Math.PI * 0.4); fg.stroke(); }
        fg.restore();
        LC.specks(fg, glass, { x: 0, y: top, w: W, h: dash - top }, 'city-ws', { n: 900, color: '#FFF6E2', rMin: 0.5, rMax: 1.6, aMin: 0.08, aMax: 0.42, scratch: 0.1, near: { x: 1240, y: 120, r: 760 } });
        // the frit, the sun pressing into its dot-matrix from above
        fg.fillStyle = '#060808'; fg.fillRect(0, 0, W, top + 40);
        for (let row = 0; row < 7; row++) { const y = top + 44 + row * 11, r0 = 4.6 * (1 - row / 7.2); for (let x = (row % 2) * 6; x < W; x += 12) { const d = Math.hypot(x - 1240, y - 120), r = r0 * clamp(0.3 + d / 420, 0.3, 1); fg.fillStyle = d < 420 ? rgba('#3A3024', 0.5 + 0.5 * clamp(d / 420, 0, 1)) : '#060808'; fg.beginPath(); fg.arc(x, y, r, 0, TAU); fg.fill(); } }
        fg.save(); fg.globalCompositeOperation = 'screen'; fg.fillStyle = LC.rad(fg, 1240, 110, 0, 620, [[0, '#FFFDF4', 0.95], [0.12, '#FFF6E2', 0.6], [0.4, '#F6E8C8', 0.16], [1, '#F6E8C8', 0]]); fg.fillRect(600, 0, 1320, 700); fg.restore();
        // headliner, the pillars, the dashboard (dark: the subtitle band)
        fg.fillStyle = LC.lin(fg, 0, 0, 0, top, [[0, '#3C3A34'], [1, '#55524A']]); fg.fillRect(0, 0, W, top - 8); fg.fillStyle = 'rgba(255,240,210,0.25)'; fg.fillRect(900, top - 10, 700, 3);
        const ap = new Path2D(); ap.moveTo(1800, 0); ap.lineTo(W, 0); ap.lineTo(W, dash + 30); ap.bezierCurveTo(1890, 600, 1860, 330, 1800, 0); ap.closePath(); fg.fillStyle = '#26241F'; fg.fill(ap);
        const lp = new Path2D(); lp.moveTo(0, 0); lp.lineTo(110, 0); lp.bezierCurveTo(66, 330, 34, 600, 0, dash + 30); lp.closePath(); fg.fill(lp);
        fg.fillStyle = LC.lin(fg, 0, dash, 0, H, [[0, '#2C2B27'], [0.2, '#1A1B19'], [1, '#0D0E0D']]); fg.fillRect(0, dash, W, H - dash); fg.fillStyle = 'rgba(240,226,196,0.2)'; fg.fillRect(0, dash, W, 3);
        for (let x = 420; x < 1120; x += 26) { fg.fillStyle = '#0B0C0B'; fg.fillRect(x, dash + 14, 10, 22); }
      }), 0, 0);
      const e = c.em; e.fillStyle = 'rgba(255,253,244,1)'; e.beginPath(); e.arc(1240, 110, 120, 0, TAU); e.fill();
    },
    anchors: {}, light: { x: 1240, y: 100, color: '#FFFDF4' },
  };

  // =====================================================================================
  // SHOPWINDOW (Q09 12–32): a hardware shop's window on the hot pavement. Through it, a display of electric fans, not
  // turning; laid over them, the street behind us, white, its far tarmac boiling in the glass as refraction. s.heat 0..1
  // -------------------------------------------------------------------------------------
  const SW = { cam: () => mkCam({ x: 2.6, y: 1.5, z: -1.9, yaw: deg(-42), pitch: deg(1), f: 1250 }), glass: { x: 0, z0: -3, z1: 3.2, y0: 0.6, y1: 3.0 } };
  function shopDisplay(g, cam) {
    // the shop inside, dim and cool: shelves, boxes, a pyramid of fans on the display bed
    const X = -0.02;
    fill3(g, cam, [[X, 0.6, -3], [X, 3.0, -3], [X, 3.0, 3.2], [X, 0.6, 3.2]], '#2E3536');
    fill3(g, cam, [[-4, 0, -3], [-4, 3.2, -3], [-4, 3.2, 3.2], [-4, 0, 3.2]], '#3A4443');
    fill3(g, cam, [[-4, 0.6, -3], [-0.05, 0.6, -3], [-0.05, 0.6, 3.2], [-4, 0.6, 3.2]], '#4A5150');
    for (let y = 0.9; y < 3; y += 0.45) box3(g, cam, [-3.9, y, -2.8], [-3.5, y + 0.03, 3.0], { top: '#5A6260', xp: '#3E4645' });
    const R = rng('shopboxes'); for (let i = 0; i < 28; i++) { const z = -2.7 + R() * 5.4, y = 0.93 + Math.floor(R() * 4) * 0.45; box3(g, cam, [-3.88, y, z], [-3.6, y + 0.2 + R() * 0.15, z + 0.25 + R() * 0.3], { xp: mix('#8C8070', '#5E6866', R()), top: '#A69C88' }); }
    // the fans: round guards on stands, three high, still
    const fan = (x, y, z, r) => { const c = cam.p(x, y, z), k = cam.f / c[2]; g.strokeStyle = '#2A3132'; g.lineWidth = Math.max(1.5, 0.03 * k); g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[0], cam.p(x, y - r - 0.25, z)[1]); g.stroke();
      g.fillStyle = '#E4E8E2'; g.beginPath(); g.ellipse(c[0], c[1], r * k * 0.62, r * k, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(40,48,48,0.7)'; g.lineWidth = 1; for (let i = 1; i < 5; i++) { g.beginPath(); g.ellipse(c[0], c[1], r * k * 0.62 * i / 5, r * k * i / 5, 0, 0, TAU); g.stroke(); }
      g.fillStyle = '#7E8784'; for (let b = 0; b < 3; b++) { g.save(); g.translate(c[0], c[1]); g.scale(0.62, 1); g.rotate(b * TAU / 3 + x * 3); g.beginPath(); g.ellipse(0, -r * k * 0.45, r * k * 0.18, r * k * 0.4, 0, 0, TAU); g.fill(); g.restore(); }
      g.fillStyle = '#3A4243'; g.beginPath(); g.arc(c[0], c[1], r * k * 0.1, 0, TAU); g.fill(); };
    [[-0.7, 1.0, -2.2, 0.2], [-0.7, 1.0, -1.1, 0.2], [-0.7, 1.0, 0.0, 0.2], [-0.7, 1.0, 1.1, 0.2], [-0.7, 1.0, 2.2, 0.2], [-1.0, 1.52, -1.6, 0.22], [-1.0, 1.52, -0.5, 0.22], [-1.0, 1.52, 0.6, 0.22], [-1.0, 1.52, 1.7, 0.22], [-1.3, 2.06, -1.0, 0.24], [-1.3, 2.06, 0.2, 0.24], [-1.3, 2.06, 1.4, 0.24]].forEach(f => fan(...f));
    fill3(g, cam, [[-0.05, 0.6, -3], [-1.6, 0.6, -3], [-1.6, 0.6, 3.2], [-0.05, 0.6, 3.2]], '#59605E');
  }
  function behindUs(g, mc) {
    // what the window gives back: the street behind us, white; the far side's terrace and the sky; the far tarmac
    const sky = LC.lin(g, 0, 0, 0, H, [[0, CP.sky[2]], [0.5, CP.sky[1]], [1, CP.sky[0]]]); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    fill3(g, mc, [[0.2, 0.12, -40], [3.2, 0.12, -40], [3.2, 0.12, 40], [0.2, 0.12, 40]], CP.pave[0]);
    fill3(g, mc, [[3.2, 0, -60], [12, 0, -60], [12, 0, 60], [3.2, 0, 60]], CP.tar[0]);
    for (let z = -60; z < 60; z += 9) fill3(g, mc, [[7.5, 0.003, z], [7.6, 0.003, z], [7.6, 0.003, z + 4], [7.5, 0.003, z + 4]], CP.line);
    fill3(g, mc, [[12, 0.12, -60], [14.5, 0.12, -60], [14.5, 0.12, 60], [12, 0.12, 60]], CP.pave[1]);
    let z = -40; const R = rng('reflterrace'); while (z < 40) { const w = 6 + R() * 3; frontage(g, mc, 1, 14.5, z, z + w, 9 + R() * 3, { lit: 1, seed: 'r' }); z += w; }
    parkedCar(g, mc, 4.2, -6, 4.3, { color: '#3E4A55' }); parkedCar(g, mc, 4.2, 4, 4.2, { color: '#8E8678' });
  }
  const shopwindow = {
    back(c, t, s) {
      s = s || {}; const g = c.g, cam = SW.cam(), G = SW.glass;
      g.drawImage(cached(c, 'shop|back', bg => {
        bg.fillStyle = CP.sky[0]; bg.fillRect(0, 0, W, H);
        // the pavement, the shop's front: brick piers, the fascia board, the stall riser in old tiles
        fill3(bg, cam, [[0, 0.0, -8], [6, 0.0, -8], [6, 0.0, 8], [0, 0.0, 8]], CP.pave[0]);
        for (let z = -8; z < 8; z += 0.9) line3(bg, cam, [0, 0.001, z], [6, 0.001, z], rgba('#8F897C', 0.16), 1);
        for (let x = 0.9; x < 6; x += 0.9) line3(bg, cam, [x, 0.001, -8], [x, 0.001, 8], rgba('#8F897C', 0.16), 1);
        fill3(bg, cam, [[0, 0, -8], [0, 4.2, -8], [0, 4.2, 8], [0, 0, 8]], CP.brick[0][1]); for (let y = 0.3; y < 4.2; y += 0.3) line3(bg, cam, [0.001, y, -8], [0.001, y, 8], rgba(CP.brick[0][2], 0.12), 1);
        fill3(bg, cam, [[0.01, 0, G.z0 - 0.4], [0.01, 0.6, G.z0 - 0.4], [0.01, 0.6, G.z1 + 0.4], [0.01, 0, G.z1 + 0.4]], '#4E6460');
        for (let z = G.z0 - 0.4; z < G.z1 + 0.4; z += 0.15) line3(bg, cam, [0.012, 0, z], [0.012, 0.6, z], 'rgba(220,226,214,0.25)', 1);
        fill3(bg, cam, [[0.01, 3.05, G.z0 - 0.4], [0.01, 3.6, G.z0 - 0.4], [0.01, 3.6, G.z1 + 0.4], [0.01, 3.05, G.z1 + 0.4]], '#3E5652');
        fill3(bg, cam, [[0.012, 3.12, G.z0 - 0.3], [0.012, 3.53, G.z0 - 0.3], [0.012, 3.53, G.z1 + 0.3], [0.012, 3.12, G.z1 + 0.3]], '#E3DBC8');
        // the window's own shade: a slit under the fascia; the step's shadow
        fill3(bg, cam, [[0.02, 2.9, G.z0], [0.02, 3.05, G.z0], [0.02, 3.05, G.z1], [0.02, 2.9, G.z1]], rgba(CP.slit, 0.6));
        fill3(bg, cam, [[0, 0.001, G.z0 - 0.4], [0.35, 0.001, G.z0 - 0.4], [0.35, 0.001, G.z1 + 0.4], [0, 0.001, G.z1 + 0.4]], rgba(CP.slit, 0.55));
      }), 0, 0);
      // the glass: the display through it, the street over it, the heat boiling in the reflection's far tarmac
      const gq = [[0.02, G.y0, G.z0], [0.02, G.y1, G.z0], [0.02, G.y1, G.z1], [0.02, G.y0, G.z1]], gp = path3(cam, gq);
      const disp = cached(c, 'shop|display', dg => { dg.fillStyle = '#2E3536'; dg.fillRect(0, 0, W, H); shopDisplay(dg, cam); });
      const mc = mirrorCam(cam, [0.02, 0, 0], [1, 0, 0]), refl = cached(c, 'shop|refl', rg => behindUs(rg, mc));
      g.save(); g.clip(gp); g.drawImage(disp, 0, 0);
      g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.68; g.drawImage(refl, 0, 0); g.globalAlpha = 1;
      const hz = mc.p(30, 0, -60)[1], hz2 = mc.p(30, 0, 60)[1], k = s.heat == null ? 1 : s.heat;
      if (k > 0) { const y0 = Math.min(hz, hz2) - 110, y1 = Math.max(hz, hz2) + 80; g.globalAlpha = 0.68; heatBand(g, refl, y0, y1, t, 9 * k, { step: 3 }); g.globalAlpha = 1; }
      g.globalCompositeOperation = 'source-over';
      g.restore();
      // glazing bars
      [G.z0 + (G.z1 - G.z0) * 0.5].forEach(z => box3(g, cam, [0, G.y0, z - 0.035], [0.05, G.y1, z + 0.035], { xp: '#3E5652', side: '#2E403D' }));
      box3(g, cam, [0, G.y1 - 0.05, G.z0], [0.06, G.y1, G.z1], { xp: '#3E5652', bottom: '#2A3A37' }); box3(g, cam, [0, G.y0, G.z0], [0.06, G.y0 + 0.05, G.z1], { xp: '#4E6460', top: '#8EA29C' });
    },
    front(c, t, s) {
      const g = c.g, cam = SW.cam(), G = SW.glass, gp = path3(cam, [[0.02, G.y0, G.z0], [0.02, G.y1, G.z0], [0.02, G.y1, G.z1], [0.02, G.y0, G.z1]]);
      g.drawImage(cached(c, 'shop|front', fg => { fg.save(); fg.clip(gp);
        LC.glare(fg, null, { x: 900, y: 420, angle: -1.15, color: '#FFFFFF', bands: [{ d: -300, w: 200, a: 0.08 }, { d: -190, w: 26, a: 0.12 }, { d: 330, w: 240, a: 0.05 }] });
        LC.specks(fg, null, { x: 0, y: 0, w: W, h: H }, 'shop-dust', { n: 700, color: '#FFFFFF', rMin: 0.5, rMax: 1.5, aMin: 0.05, aMax: 0.28, scratch: 0.14, near: { x: 1300, y: 300, r: 900 } });
        LC.smudge(fg, 1150, 720, 70, 40, 0.2, 'shop-hand', '#FFFFFF', 0.08); fg.restore();
        fg.fillStyle = LC.lin(fg, 0, 880, 0, H, [[0, '#2A2C2A', 0], [1, '#2A2C2A', 0.4]]); fg.fillRect(0, 880, W, 200); }), 0, 0);
    },
    anchors: {}, light: { x: 1300, y: -200, color: '#FFFDF4' },
  };

  // =====================================================================================
  // CROSSING (Q09 12–32): from an upper window, the street below: a pedestrian crosses the white road from one island of
  // shade (under a plane tree, near) to another (the awning's slit, far). The sash window's glass, its dust and the room
  // faint in it are the pane. anchors.path: from/to on the ground, with scales; the figure's own shadow is a dark slit.
  // -------------------------------------------------------------------------------------
  const CX = { cam: () => mkCam({ x: -1.2, y: 8.2, z: -7.2, yaw: deg(8), pitch: deg(-43), f: 1300 }) };
  const crossing = {
    back(c, t, s) {
      const g = c.g;
      g.drawImage(cached(c, 'crossing|back', bg => {
        const cam = CX.cam(); bg.fillStyle = CP.tar[0]; bg.fillRect(0, 0, W, H);
        fill3(bg, cam, [[-4.2, 0, -30], [4.2, 0, -30], [4.2, 0, 60], [-4.2, 0, 60]], CP.tar[0]);
        const R = rng('tarpatch'); for (let i = 0; i < 40; i++) { const x = (R() - 0.5) * 8, z = -10 + R() * 40, w = 0.4 + R() * 1.5; fill3(bg, cam, [[x, 0.001, z], [x + w, 0.001, z + 0.1], [x + w * 0.9, 0.001, z + 0.6], [x - 0.1, 0.001, z + 0.5]], rgba(R() < 0.5 ? '#D6CFC0' : '#A8A193', 0.4)); }
        [-1, 1].forEach(sd => { fill3(bg, cam, [[sd * 4.2, 0.12, -30], [sd * 9, 0.12, -30], [sd * 9, 0.12, 60], [sd * 4.2, 0.12, 60]], CP.pave[0]);
          for (let z = -30; z < 60; z += 0.9) line3(bg, cam, [sd * 4.2, 0.121, z], [sd * 9, 0.121, z], rgba('#8F897C', 0.14), 1);
          fill3(bg, cam, [[sd * 4.2, 0, -30], [sd * 4.2, 0.12, -30], [sd * 4.2, 0.12, 60], [sd * 4.2, 0, 60]], '#F4F1E6'); });
        // the zebra, its beacons; the centre line
        for (let i = 0; i < 12; i++) { const x = -4.05 + i * 0.7; fill3(bg, cam, [[x, 0.003, 1.4], [x + 0.42, 0.003, 1.4], [x + 0.42, 0.003, 4.4], [x, 0.003, 4.4]], CP.line); }
        for (let z = -30; z < 60; z += 9) if (z < 0 || z > 6) fill3(bg, cam, [[-0.06, 0.003, z], [0.06, 0.003, z], [0.06, 0.003, z + 4], [-0.06, 0.003, z + 4]], CP.line);
        for (let i = 0; i < 10; i++) { fill3(bg, cam, [[-4.1, 0.003, -0.4 - i * 1.0], [-3.9, 0.003, -0.4 - i * 1.0], [-3.9, 0.003, -0.9 - i * 1.0], [-4.1, 0.003, -0.9 - i * 1.0]], CP.line); fill3(bg, cam, [[3.9, 0.003, 6.2 + i], [4.1, 0.003, 6.2 + i], [4.1, 0.003, 6.7 + i], [3.9, 0.003, 6.7 + i]], CP.line); }
        [[-4.5, 2.9], [4.5, 2.9]].forEach(([x, z]) => { const b = cam.p(x, 0.12, z), tp = cam.p(x, 2.6, z), k = cam.f / b[2]; bg.strokeStyle = '#1E2322'; bg.lineWidth = 0.1 * k; bg.beginPath(); bg.moveTo(b[0], b[1]); bg.lineTo(tp[0], tp[1]); bg.stroke();
          bg.strokeStyle = '#F2F0E6'; bg.setLineDash([0.25 * k, 0.25 * k]); bg.beginPath(); bg.moveTo(b[0], b[1]); bg.lineTo(tp[0], tp[1]); bg.stroke(); bg.setLineDash([]); bg.fillStyle = '#E8A060'; bg.beginPath(); bg.arc(tp[0], tp[1], 0.16 * k, 0, TAU); bg.fill(); bg.fillStyle = 'rgba(255,240,220,0.7)'; bg.beginPath(); bg.arc(tp[0] - 0.05 * k, tp[1] - 0.05 * k, 0.06 * k, 0, TAU); bg.fill(); });
        // the far side: shopfronts seen from above, the awning, its slit of shade on the pavement
        fill3(bg, cam, [[9, 0.12, -30], [9, 8, -30], [9, 8, 60], [9, 0.12, 60]], CP.brick[1][1]);
        fill3(bg, cam, [[8.95, 0.6, -30], [8.95, 2.9, -30], [8.95, 2.9, 60], [8.95, 0.6, 60]], mix(CP.glassSky, CP.glassDark, 0.45));
        fill3(bg, cam, [[7.6, 2.6, -2], [9, 3.0, -2], [9, 3.0, 9], [7.6, 2.6, 9]], CP.awning[0]);
        for (let z = -2; z < 9; z += 0.5) fill3(bg, cam, [[7.6, 2.601, z], [9, 3.001, z], [9, 3.001, z + 0.25], [7.6, 2.601, z + 0.25]], rgba(CP.awning[1], 0.7));
        fill3(bg, cam, [[7.4, 0.121, -2], [9, 0.121, -2], [9, 0.121, 9], [7.4, 0.121, 9]], rgba(CP.slit, 0.78));
        fill3(bg, cam, [[8.6, 0.121, -30], [9, 0.121, -30], [9, 0.121, 60], [8.6, 0.121, 60]], rgba(CP.slit, 0.55));
        // the near side: a plane tree, seen from above, and its pool of shade
        const sh = []; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, n = 0.85 + 0.25 * vnoise(Math.cos(a) * 2, Math.sin(a) * 2, 7); sh.push([-6.0 + Math.cos(a) * 2.6 * n, 0.121, 2.2 + Math.sin(a) * 2.2 * n]); }
        fill3(bg, cam, sh, rgba(CP.slit, 0.8));
        { const R3 = rng('dapple'); for (let i = 0; i < 46; i++) { const a = R3() * TAU, d = Math.sqrt(R3()) * 2.0, x0 = -6.0 + Math.cos(a) * d * 1.1, z0 = 2.2 + Math.sin(a) * d, rr = 0.06 + R3() * 0.18, pts = []; for (let j = 0; j < 10; j++) { const b = j / 10 * TAU; pts.push([x0 + Math.cos(b) * rr, 0.122, z0 + Math.sin(b) * rr * 0.8]); } fill3(bg, cam, pts, rgba(CP.pave[0], 0.85)); } }
        for (let i = 0; i < 3; i++) { const x = -2.5 + i * 2.6, z = 8 + i * 5; const pts = []; for (let j = 0; j < 16; j++) { const b = j / 16 * TAU; pts.push([x + Math.cos(b) * 0.32, 0.004, z + Math.sin(b) * 0.32]); } fill3(bg, cam, pts, '#9C968A'); fill3(bg, cam, pts.map(q => [q[0] * 0.98 + x * 0.02, 0.005, q[2] * 0.98 + z * 0.02]), rgba('#5E5A52', 0.3)); }
        { const c0 = cam.p(-5.2, 6.9, -2.2), k = cam.f / c0[2], pts = []; for (let i = 0; i < 44; i++) { const a = i / 44 * TAU, n = 0.8 + 0.28 * vnoise(Math.cos(a) * 2.4 + 3, Math.sin(a) * 2.4, 4); pts.push([c0[0] + Math.cos(a) * 2.6 * k * n, c0[1] + Math.sin(a) * 2.0 * k * n]); }
          const cr = LC.pathPts(pts); bg.fillStyle = CP.leaf[1]; bg.fill(cr); bg.save(); bg.clip(cr); bg.fillStyle = CP.leaf[0]; bg.beginPath(); bg.ellipse(c0[0] + 0.6 * k, c0[1] - 0.5 * k, 2.2 * k, 1.6 * k, 0, 0, TAU); bg.fill();
          const R2 = rng('leafy'); for (let i = 0; i < 60; i++) { bg.fillStyle = R2() < 0.5 ? rgba(CP.leaf[2], 0.6) : rgba('#C9CC9A', 0.5); bg.beginPath(); bg.arc(c0[0] + (R2() - 0.5) * 5 * k, c0[1] + (R2() - 0.5) * 4 * k, (0.15 + R2() * 0.25) * k, 0, TAU); bg.fill(); } bg.restore(); }
        // a parked van and its slit of shadow, a bin, a bench in the sun
        box3(bg, cam, [2.2, 0.3, 12], [4.0, 2.4, 17.5], { top: '#FBFAF4', xn: '#E2DFD4', zn: '#D4D0C4', side: '#CFCBBE' }); fill3(bg, cam, [[2.1, 0.002, 12], [4.1, 0.002, 12], [4.1, 0.002, 17.6], [2.1, 0.002, 17.6]], rgba(CP.slit, 0.5));
        box3(bg, cam, [-5.6, 0.12, 8.5], [-5.2, 1.0, 8.9], { top: '#3A4442', side: '#2A3231' });
      }), 0, 0);
    },
    front(c, t, s) {
      const g = c.g;
      // the sash window: the glass's dust and the faint room in it, a heat haze over the white road, the sash's bars
      g.drawImage(cached(c, 'crossing|leaves', lg => { const cam = CX.cam(); blurInto(lg, l => { const c0 = cam.p(-3.4, 7.6, -4.6), k = cam.f / c0[2], R = rng('nearleaves');
        for (let i = 0; i < 70; i++) { const x = c0[0] + (R() - 0.7) * 1.6 * k, y = c0[1] + (R() - 0.3) * 1.5 * k; l.fillStyle = R() < 0.4 ? CP.leaf[0] : R() < 0.6 ? CP.leaf[2] : CP.leaf[1]; l.beginPath(); l.ellipse(x, y, (0.1 + R() * 0.12) * k, (0.06 + R() * 0.08) * k, R() * 3, 0, TAU); l.fill(); } }, 14); }), 0, 0);
      g.drawImage(cached(c, 'crossing|pane', fg => {
        fg.save(); fg.globalCompositeOperation = 'screen'; fg.fillStyle = 'rgba(230,234,226,0.1)'; fg.fillRect(0, 0, W, H);
        blurInto(fg, l => { l.fillStyle = 'rgba(200,206,196,0.22)'; l.fillRect(1400, 0, 520, H); l.fillStyle = 'rgba(240,236,224,0.18)'; l.beginPath(); l.ellipse(1640, 250, 140, 60, 0, 0, TAU); l.fill(); }, 30);
        LC.glare(fg, null, { x: 800, y: 500, angle: -1.05, color: '#FFFFFF', bands: [{ d: -260, w: 180, a: 0.06 }, { d: -170, w: 22, a: 0.09 }, { d: 380, w: 220, a: 0.04 }] });
        fg.restore();
        LC.specks(fg, null, { x: 0, y: 0, w: W, h: H }, 'sash-dust', { n: 600, color: '#FFFFFF', rMin: 0.5, rMax: 1.4, aMin: 0.05, aMax: 0.25, scratch: 0.12, near: { x: 800, y: 300, r: 1000 } });
        // the meeting rail across the bottom, the stile at the right (painted timber, out of focus), the sill
        blurInto(fg, l => { l.fillStyle = '#E9E5D8'; l.fillRect(0, 930, W, 70); l.fillStyle = '#B9B4A4'; l.fillRect(0, 990, W, 90); l.fillStyle = '#C9C4B4'; l.fillRect(1810, 0, 110, H); l.fillStyle = '#F4F1E8'; l.fillRect(1810, 0, 14, H); }, 8);
        fg.fillStyle = LC.lin(fg, 0, 960, 0, H, [[0, '#2A2C2A', 0], [1, '#2A2C2A', 0.55]]); fg.fillRect(0, 960, W, 120);
      }), 0, 0);
    },
    anchors: {}, light: { x: 900, y: -400, color: '#FFFDF4' },
  };

  // =====================================================================================
  // SHELTER (Q09 12–32): low beside a bus shelter, looking through its side panel: scratched glass, its band of dots, the
  // white street in it. Beyond the glass, in the slit of shade under the roof, a dog lies on the paving, panting.
  // anchors.dog: where it lies (RIG 'dog'); s.heat 0..1 (the road beyond wavers)
  // -------------------------------------------------------------------------------------
  const SH = { cam: () => mkCam({ x: -1.7, y: 0.86, z: 0.95, yaw: deg(84), pitch: deg(-1.5), f: 1150 }) };
  const shelter = {
    back(c, t, s) {
      s = s || {}; const g = c.g;
      const sc = cached(c, 'shelter|back', bg => {
        const cam = SH.cam(); bg.fillStyle = CP.sky[0]; bg.fillRect(0, 0, W, H);
        // across the road: the terrace in full sun, a parked car glinting
        fill3(bg, cam, [[-30, 0, 4], [30, 0, 4], [30, 0, 30], [-30, 0, 30]], CP.tar[0]);
        let z = -20; const R = rng('shelter-terr'); const xs = [-20]; while (xs[xs.length - 1] < 30) xs.push(xs[xs.length - 1] + 6 + R() * 3);
        for (let i = 0; i < xs.length - 1; i++) { const x0 = xs[i], x1 = xs[i + 1], h = 9 + R() * 3, pal = CP.brick[i % 4]; fill3(bg, cam, [[x0, 0, 15], [x1, 0, 15], [x1, h, 15], [x0, h, 15]], pal[0]);
          for (let f = 0; f < 2; f++) for (let k2 = 0; k2 < 2; k2++) { const wx = x0 + (k2 + 0.5) * (x1 - x0) / 2; fill3(bg, cam, [[wx - 0.5, 4.2 + f * 2.9, 14.99], [wx + 0.5, 4.2 + f * 2.9, 14.99], [wx + 0.5, 5.95 + f * 2.9, 14.99], [wx - 0.5, 5.95 + f * 2.9, 14.99]], R() < 0.3 ? '#FBFAF2' : CP.glassSky); }
          fill3(bg, cam, [[x0 + 0.3, 0.6, 14.99], [x1 - 0.3, 0.6, 14.99], [x1 - 0.3, 2.9, 14.99], [x0 + 0.3, 2.9, 14.99]], mix(CP.glassDark, CP.glassSky, 0.6)); fill3(bg, cam, [[x0, h - 0.6, 14.98], [x1, h - 0.6, 14.98], [x1, h - 0.45, 14.98], [x0, h - 0.45, 14.98]], rgba(CP.slit, 0.4)); }
        fill3(bg, cam, [[-30, 0.12, 12], [30, 0.12, 12], [30, 0.12, 15], [-30, 0.12, 15]], CP.pave[0]);
        parkedCar(bg, cam, 2.5, 8.0, 4.2, { color: '#4E5A62' });
        // our pavement, the kerb, the shelter's slab of shade
        fill3(bg, cam, [[-30, 0.12, -6], [30, 0.12, -6], [30, 0.12, 3.6], [-30, 0.12, 3.6]], CP.pave[0]);
        for (let x = -30; x < 30; x += 0.9) line3(bg, cam, [x, 0.121, -6], [x, 0.121, 3.6], rgba('#8F897C', 0.14), 1);
        fill3(bg, cam, [[-30, 0, 3.6], [30, 0, 3.6], [30, 0.12, 3.6], [-30, 0.12, 3.6]], '#F4F1E6');
        fill3(bg, cam, [[-0.2, 0.122, -0.1], [3.4, 0.122, -0.1], [3.4, 0.122, 1.35], [-0.2, 0.122, 1.35]], rgba(CP.slit, 0.82));
        // the shelter: the back panel (glass, the white street in it), the perch seat, the roof's edge
        fill3(bg, cam, [[0, 0.25, -0.05], [3.2, 0.25, -0.05], [3.2, 2.3, -0.05], [0, 2.3, -0.05]], 'rgba(214,222,214,0.4)');
        box3(bg, cam, [0.3, 0.62, 0.0], [2.9, 0.68, 0.32], { top: '#7E8A86', zp: '#4A5654', side: '#5E6A68' });
        [0.0, 3.2].forEach(x => box3(bg, cam, [x - 0.04, 0.12, -0.08], [x + 0.04, 2.45, -0.0], { side: CP.metal[1], zp: CP.metal[0] }));
        box3(bg, cam, [-0.1, 2.45, -0.15], [3.3, 2.55, 1.45], { bottom: '#3A4442', zp: '#E8E6DC', side: '#C9C6BA', top: '#F4F2EA' });
      });
      g.drawImage(sc, 0, 0);
      const k = s.heat == null ? 1 : s.heat, hz = SH.cam().p(0, 0, 30)[1]; if (k > 0) { g.save(); g.beginPath(); g.rect(0, hz - 40, W, 140); g.clip(); heatBand(g, sc, hz - 40, hz + 100, t, 3.5 * k); g.restore(); }
    },
    front(c, t, s) {
      const g = c.g, cam = SH.cam();
      // the near side panel: glass in a steel frame, dots at two heights, scratches, dust; the street in it
      g.drawImage(cached(c, 'shelter|panel', fg => {
        const q = [[-0.02, 0.18, 1.35], [-0.02, 0.18, -0.05], [-0.02, 2.4, -0.05], [-0.02, 2.4, 1.35]], pp = path3(cam, q), sp = scr3(cam, q), bb = bboxOf(sp);
        fg.save(); fg.clip(pp);
        fg.fillStyle = 'rgba(200,214,210,0.12)'; fg.fill(pp);
        fg.globalCompositeOperation = 'screen'; fg.fillStyle = LC.lin(fg, bb.x, 0, bb.x + bb.w, 0, [[0, '#FFFFFF', 0.18], [0.5, '#FFFFFF', 0.05], [1, '#FFFFFF', 0.12]]); fg.fill(pp);
        LC.glare(fg, null, { x: bb.x + bb.w * 0.5, y: bb.y + bb.h * 0.45, angle: -1.2, color: '#FFFFFF', bands: [{ d: -bb.w * 0.25, w: bb.w * 0.2, a: 0.1 }, { d: -bb.w * 0.1, w: 16, a: 0.14 }] });
        fg.globalCompositeOperation = 'source-over';
        // manifestation: a band of white dots at about eye height for an adult, another lower
        [1.55, 1.0].forEach(hh => { for (let zz = -0.02; zz < 1.33; zz += 0.055) { const p = cam.p(-0.02, hh, zz), kk = cam.f / p[2]; fg.fillStyle = 'rgba(250,250,244,0.72)'; fg.beginPath(); fg.arc(p[0], p[1], 0.016 * kk, 0, TAU); fg.fill(); } });
        // scratched-in graffiti: fine bright lines etched into the glass
        const R = rng('etch'); fg.strokeStyle = 'rgba(255,255,250,0.35)'; fg.lineWidth = 1.2; for (let i = 0; i < 18; i++) { const x = bb.x + bb.w * (0.15 + R() * 0.7), y = bb.y + bb.h * (0.3 + R() * 0.4); fg.beginPath(); fg.moveTo(x, y); for (let j = 0; j < 4; j++) fg.lineTo(x + (R() - 0.3) * 70, y + (R() - 0.5) * 40); fg.stroke(); }
        LC.specks(fg, null, bb, 'shelter-dust', { n: 900, color: '#FFFFFF', rMin: 0.5, rMax: 1.6, aMin: 0.06, aMax: 0.35, scratch: 0.18, near: { x: bb.x + bb.w * 0.6, y: bb.y, r: 900 } });
        fg.restore();
        // the frame: steel posts and the bottom rail, close and soft
        blurInto(fg, l => { const fr = (a, b, w) => { const p0 = cam.p(...a), p1 = cam.p(...b); l.strokeStyle = CP.metal[1]; l.lineWidth = w; l.beginPath(); l.moveTo(p0[0], p0[1]); l.lineTo(p1[0], p1[1]); l.stroke(); l.strokeStyle = rgba(CP.metal[2], 0.7); l.lineWidth = w * 0.12; l.beginPath(); l.moveTo(p0[0] + w * 0.3, p0[1]); l.lineTo(p1[0] + w * 0.3, p1[1]); l.stroke(); };
          fr([-0.02, 0.0, 1.38], [-0.02, 2.6, 1.38], 46); fr([-0.02, 0.0, -0.05], [-0.02, 2.6, -0.05], 30); fr([-0.02, 0.2, 1.38], [-0.02, 0.2, -0.05], 30); }, 5);
        fg.fillStyle = LC.lin(fg, 0, 880, 0, H, [[0, '#2A2C2A', 0], [1, '#2A2C2A', 0.5]]); fg.fillRect(0, 880, W, 200);
      }), 0, 0);
    },
    anchors: {}, light: { x: 1500, y: -300, color: '#FFFDF4' },
  };

  // =====================================================================================
  // STALL (Q09 12–32): from inside a café, through its window, a roadside stall on the bright pavement: a man pours a bag
  // of melting ice into a galvanised bucket of drinks under a faded striped awning that hangs dead still.
  // s.pour 0..1 (the ice falling, the meltwater splashing); anchors.man (RIG 'stallman'), anchors.hands (where the pour starts)
  // -------------------------------------------------------------------------------------
  const SL = { cam: () => mkCam({ x: -0.4, y: 1.0, z: -1.9, yaw: deg(6), pitch: deg(6), f: 1250 }), bucket: [0.55, 0, 2.55] };
  const stall = {
    back(c, t, s) {
      s = s || {}; const g = c.g;
      g.drawImage(cached(c, 'stall|back', bg => {
        const cam = SL.cam(); bg.fillStyle = CP.sky[0]; bg.fillRect(0, 0, W, H);
        // the street beyond the stall: road, the far terrace in full sun
        fill3(bg, cam, [[-30, 0, 5.2], [30, 0, 5.2], [30, 0, 40], [-30, 0, 40]], CP.tar[0]);
        let x = -22; const R = rng('stall-terr'); while (x < 30) { const w = 6 + R() * 3, h = 9 + R() * 3; const pal = CP.brick[Math.floor(R() * 4)];
          fill3(bg, cam, [[x, 0, 16], [x + w, 0, 16], [x + w, h, 16], [x, h, 16]], pal[0]);
          for (let f = 0; f < 2; f++) for (let k2 = 0; k2 < 2; k2++) { const wx = x + (k2 + 0.5) * w / 2; fill3(bg, cam, [[wx - 0.5, 4.2 + f * 2.9, 15.99], [wx + 0.5, 4.2 + f * 2.9, 15.99], [wx + 0.5, 5.95 + f * 2.9, 15.99], [wx - 0.5, 5.95 + f * 2.9, 15.99]], R() < 0.3 ? '#FBFAF2' : CP.glassSky); }
          fill3(bg, cam, [[x + 0.3, 0.6, 15.99], [x + w - 0.3, 0.6, 15.99], [x + w - 0.3, 2.9, 15.99], [x + 0.3, 2.9, 15.99]], mix(CP.glassDark, CP.glassSky, 0.6)); x += w; }
        fill3(bg, cam, [[-30, 0.12, 13], [30, 0.12, 13], [30, 0.12, 16], [-30, 0.12, 16]], CP.pave[0]);
        // our pavement, the kerb
        fill3(bg, cam, [[-30, 0.12, 0.2], [30, 0.12, 0.2], [30, 0.12, 5.2], [-30, 0.12, 5.2]], CP.pave[0]);
        for (let xx = -30; xx < 30; xx += 0.9) line3(bg, cam, [xx, 0.121, 0.2], [xx, 0.121, 5.2], rgba('#8F897C', 0.14), 1);
        fill3(bg, cam, [[-30, 0, 5.2], [30, 0, 5.2], [30, 0.12, 5.2], [-30, 0.12, 5.2]], '#F4F1E6');
        // the stall: a trestle with crates of fruit, the awning's shade as a hard slab on the paving
        fill3(bg, cam, [[-1.4, 0.123, 2.0], [2.2, 0.123, 2.0], [2.2, 0.123, 3.6], [-1.4, 0.123, 3.6]], rgba(CP.slit, 0.78));
        box3(bg, cam, [-1.2, 0.12, 2.9], [1.0, 0.86, 3.6], { zn: '#8E7A60', top: '#B9A383', side: '#7A6650' });
        const R2 = rng('fruit'); [[-1.1, 3.0], [-0.4, 3.0], [0.3, 3.0]].forEach(([cx, cz], i) => { box3(bg, cam, [cx, 0.86, cz], [cx + 0.6, 1.02, cz + 0.45], { zn: '#A08A6C', top: '#5E4E3C', side: '#8A765C' });
          for (let j = 0; j < 22; j++) { const p = cam.p(cx + 0.06 + R2() * 0.48, 1.02 + R2() * 0.04, cz + 0.05 + R2() * 0.3), k = cam.f / p[2]; bg.fillStyle = ['#C98A4A', '#B9A048', '#9E5A40'][i]; bg.beginPath(); bg.arc(p[0], p[1], 0.04 * k, 0, TAU); bg.fill(); bg.fillStyle = 'rgba(255,250,236,0.55)'; bg.beginPath(); bg.arc(p[0] - 0.012 * k, p[1] - 0.014 * k, 0.012 * k, 0, TAU); bg.fill(); } });
        // the awning: faded stripes, hanging dead straight; its frame
        // the awning from beneath: its underside in the glare coming through it, stripes running back; the valance hanging dead still
        const aw = [[-1.5, 2.2, 1.7], [2.3, 2.2, 1.7], [2.3, 2.3, 4.0], [-1.5, 2.3, 4.0]]; fill3(bg, cam, aw, '#E9DFC9');
        for (let xs = -1.5; xs < 2.3; xs += 0.42) fill3(bg, cam, [[xs, 2.199, 1.7], [xs + 0.21, 2.199, 1.7], [xs + 0.21, 2.299, 4.0], [xs, 2.299, 4.0]], rgba(CP.awning[1], 0.55));
        fill3(bg, cam, aw, 'rgba(255,248,226,0.18)');
        for (let xs = -1.5; xs < 2.3; xs += 0.21) fill3(bg, cam, [[xs, 2.2, 1.7], [xs + 0.19, 2.2, 1.7], [xs + 0.17, 2.0, 1.69], [xs + 0.02, 2.0, 1.69]], Math.round((xs + 1.5) / 0.21) % 2 ? '#EFE6D2' : mix(CP.awning[1], '#FFFFFF', 0.25));
        line3(bg, cam, [-1.5, 2.2, 1.69], [2.3, 2.2, 1.69], rgba(CP.slit, 0.5), 2);
        [-1.45, 2.25].forEach(xx => box3(bg, cam, [xx - 0.025, 0.12, 1.7], [xx + 0.025, 2.2, 1.75], { side: CP.metal[1] }));
      }), 0, 0);
      // the bucket on its crate at the front of the stall, galvanised, catching the sun; drinks cans in its water
      const cam = SL.cam(), [bx, , bz] = SL.bucket, pour = clamp(s.pour == null ? 0.6 : s.pour, 0, 1);
      g.drawImage(cached(c, 'stall|bucket', bg2 => { box3(bg2, cam, [bx - 0.35, 0.12, bz - 0.3], [bx + 0.35, 0.5, bz + 0.3], { zn: '#9C8668', top: '#B9A383', side: '#857058' });
        const b0 = cam.p(bx, 0.5, bz), b1 = cam.p(bx, 0.86, bz), k = cam.f / b0[2], rx0 = 0.2 * k, rx1 = 0.25 * k;
        bg2.fillStyle = LC.lin(bg2, b0[0] - rx1, 0, b0[0] + rx1, 0, [[0, '#7E8784'], [0.3, '#E8ECE6'], [0.42, '#FFFFFF'], [0.55, '#A9B1AD'], [1, '#5E6664']]);
        bg2.beginPath(); bg2.moveTo(b0[0] - rx0, b0[1]); bg2.lineTo(b1[0] - rx1, b1[1]); bg2.ellipse(b1[0], b1[1], rx1, rx1 * 0.28, 0, Math.PI, 0, true); bg2.lineTo(b0[0] + rx0, b0[1]); bg2.ellipse(b0[0], b0[1], rx0, rx0 * 0.28, 0, 0, Math.PI); bg2.closePath(); bg2.fill();
        bg2.strokeStyle = 'rgba(60,66,64,0.4)'; bg2.lineWidth = 1.5; [0.25, 0.6].forEach(u => { const y = lerp(b0[1], b1[1], u), rx = lerp(rx0, rx1, u); bg2.beginPath(); bg2.ellipse(b0[0], y, rx, rx * 0.28, 0, 0, Math.PI); bg2.stroke(); });
        bg2.fillStyle = '#4E5856'; bg2.beginPath(); bg2.ellipse(b1[0], b1[1], rx1 * 0.94, rx1 * 0.26, 0, 0, TAU); bg2.fill();
        bg2.fillStyle = '#8FA4A2'; bg2.beginPath(); bg2.ellipse(b1[0], b1[1] + 3, rx1 * 0.86, rx1 * 0.2, 0, 0, TAU); bg2.fill();
        const R = rng('cans'); for (let i = 0; i < 7; i++) { const cx = b1[0] + (R() - 0.5) * rx1 * 1.4, cy = b1[1] - 4 + R() * 6; bg2.fillStyle = ['#B9C2BE', '#8C6450', '#5E7A84', '#C9B48A'][i % 4]; bg2.fillRect(cx - 0.035 * k, cy - 0.11 * k, 0.07 * k, 0.11 * k); bg2.fillStyle = 'rgba(255,255,255,0.7)'; bg2.fillRect(cx - 0.035 * k, cy - 0.11 * k, 0.07 * k, 0.012 * k); }
        bg2.strokeStyle = '#5E6664'; bg2.lineWidth = Math.max(1.5, 0.012 * k); bg2.beginPath(); bg2.ellipse(b1[0], b1[1] - 0.12 * k, rx1 * 1.02, 0.2 * k, 0, Math.PI * 1.05, Math.PI * 1.95); bg2.stroke(); }), 0, 0);
    },
    front(c, t, s) {
      s = s || {}; const g = c.g, cam = SL.cam(), [bx, , bz] = SL.bucket, pour = clamp(s.pour == null ? 0.6 : s.pour, 0, 1);
      // the ice: a bag tipped from his hands (s.hands, a screen point; default the anchor), cubes falling half-melted, water, splashes
      if (pour > 0) { const hp = s.hands || stall.anchors.hands, top = [hp[0], hp[1], 0], rim = cam.p(bx, 0.88, bz), k = cam.f / rim[2], R = rng('ice');
        g.save(); g.fillStyle = 'rgba(214,232,236,0.4)'; g.beginPath(); g.moveTo(top[0] - 0.04 * k, top[1]); g.quadraticCurveTo(top[0] + 0.05 * k, (top[1] + rim[1]) / 2, rim[0] - 0.05 * k, rim[1] - 4); g.lineTo(rim[0] + 0.06 * k, rim[1] - 4); g.quadraticCurveTo(top[0] + 0.12 * k, (top[1] + rim[1]) / 2, top[0] + 0.05 * k, top[1]); g.closePath(); g.fill();
        for (let i = 0; i < 26; i++) { const u = ((R() + t * (0.9 + R() * 0.5)) % 1), x = lerp(top[0], rim[0], u) + (R() - 0.5) * 0.08 * k, y = lerp(top[1], rim[1] - 6, u * u * 0.4 + u * 0.6), sz = (0.018 + R() * 0.02) * k;
          g.fillStyle = 'rgba(236,246,248,0.85)'; g.save(); g.translate(x, y); g.rotate(R() * 3 + t * 4); g.fillRect(-sz / 2, -sz / 2, sz, sz); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fillRect(-sz / 2, -sz / 2, sz * 0.4, sz * 0.4); g.restore(); }
        for (let i = 0; i < 14; i++) { const a = -Math.PI * (0.15 + R() * 0.7), d = (0.04 + ((R() + t * 2.2) % 1) * 0.12) * k; g.fillStyle = 'rgba(236,246,248,0.7)'; g.beginPath(); g.arc(rim[0] + Math.cos(a) * d * 1.6, rim[1] - 6 + Math.sin(a) * d, 1.5 + R() * 2, 0, TAU); g.fill(); }
        g.restore(); }
      // the café window: its glazing bar, the room faint in the glass (a pendant lamp, a chair back), dust, the sill
      g.drawImage(cached(c, 'stall|pane', fg => {
        fg.save(); fg.globalCompositeOperation = 'screen';
        blurInto(fg, l => { l.fillStyle = 'rgba(214,206,186,0.35)'; l.beginPath(); l.ellipse(560, 140, 120, 50, 0, 0, TAU); l.fill(); l.fillStyle = 'rgba(180,170,150,0.22)'; l.fillRect(1320, 520, 300, 360); l.fillStyle = 'rgba(200,196,180,0.12)'; l.fillRect(0, 0, W, H); }, 24);
        LC.glare(fg, null, { x: 900, y: 450, angle: -1.1, color: '#FFFFFF', bands: [{ d: -280, w: 190, a: 0.06 }, { d: -180, w: 22, a: 0.09 }, { d: 390, w: 220, a: 0.04 }] });
        fg.restore();
        LC.specks(fg, null, { x: 0, y: 0, w: W, h: H }, 'cafe-dust', { n: 640, color: '#FFFFFF', rMin: 0.5, rMax: 1.4, aMin: 0.05, aMax: 0.26, scratch: 0.12, near: { x: 1300, y: 200, r: 1000 } });
        blurInto(fg, l => { l.fillStyle = '#2E2A26'; l.fillRect(1540, 0, 54, H); l.fillStyle = 'rgba(240,226,200,0.5)'; l.fillRect(1540, 0, 6, H); l.fillStyle = '#3A342E'; l.fillRect(0, 960, W, 120); l.fillStyle = 'rgba(240,226,200,0.4)'; l.fillRect(0, 958, W, 4);
          l.fillStyle = '#E8E2D6'; l.beginPath(); l.ellipse(300, 975, 70, 18, 0, 0, TAU); l.fill(); l.fillStyle = '#3A2A20'; l.beginPath(); l.ellipse(300, 972, 52, 12, 0, 0, TAU); l.fill(); }, 9);
        fg.fillStyle = LC.lin(fg, 0, 900, 0, H, [[0, '#1E1C1A', 0], [1, '#1E1C1A', 0.5]]); fg.fillRect(0, 900, W, 180);
      }), 0, 0);
    },
    anchors: {}, light: { x: 1400, y: -300, color: '#FFFDF4' },
  };

  // ---------- anchors ----------
  (() => {
    const cx = CX.cam(), a0 = cx.p(-5.8, 0.12, 2.6), a1 = cx.p(-3.9, 0, 2.9), a2 = cx.p(3.9, 0, 2.9), a3 = cx.p(8.0, 0.12, 3.2);
    crossing.anchors = { path: { from: [a0[0], a0[1]], kerbNear: [a1[0], a1[1]], kerbFar: [a2[0], a2[1]], to: [a3[0], a3[1]], scaleFrom: cx.f / a0[2], scaleTo: cx.f / a3[2], note: 'from the plane tree\'s shade (near left) over the zebra to the awning\'s slit (far right); seen from above: a short figure, its shadow a dark slit at its feet' } };
    const sh = SH.cam(), d = sh.p(1.25, 0.12, 0.55); shelter.anchors = { dog: { x: d[0], y: d[1], scale: sh.f / d[2], facing: -1, note: 'lying under the bench in the shelter\'s slit of shade, behind the side panel\'s glass; head toward us' } };
    const sl = SL.cam(), m = sl.p(0.05, 0.12, 3.25), hd = sl.p(SL.bucket[0] - 0.12, 1.38, SL.bucket[2] - 0.05), bk = sl.p(SL.bucket[0], 0.88, SL.bucket[2]);
    stall.anchors = { man: { x: m[0], y: m[1], scale: sl.f / m[2], note: 'behind the bucket, three-quarter, pouring (RIG stallman)' }, hands: [hd[0], hd[1]], bucket: [bk[0], bk[1]] };
    const sw = SW.cam(); shopwindow.anchors = { glass: scr3(sw, [[0.02, 0.6, -3], [0.02, 3.0, -3], [0.02, 3.0, 3.2], [0.02, 0.6, 3.2]]).map(p => [p[0], p[1]]) };
    street.anchors = { horizon: ST.cam().p(0, 0, 300)[1], zebra: (() => { const p = ST.cam().p(0, 0, 25.5); return [p[0], p[1]]; })() };
  })();

  // =====================================================================================
  // THE SET
  // =====================================================================================
  SETS.city = {
    views: { street, shopwindow, crossing, shelter, stall },
    demos: [
      { name: 'street: glass, brick and metal under the sun', draw(c, t) { const v = SETS.city.views.street; v.back(c, t, {}); v.front(c, t, {}); } },
      { name: 'shopwindow: the heat in the glass', draw(c, t) { const v = SETS.city.views.shopwindow; v.back(c, t, {}); v.front(c, t, {}); } },
      { name: 'crossing: from one island of shade to another', draw(c, t) { const v = SETS.city.views.crossing; v.back(c, t, {}); const a = v.anchors.path, u = 0.55;
        const x = lerp(a.kerbNear[0], a.kerbFar[0], u), y = lerp(a.kerbNear[1], a.kerbFar[1], u), k = lerp(a.scaleFrom, a.scaleTo, u);
        c.g.fillStyle = 'rgba(47,50,49,0.75)'; c.g.beginPath(); c.g.ellipse(x + 0.06 * k, y + 0.02 * k, 0.32 * k, 0.12 * k, 0.2, 0, TAU); c.g.fill();
        person(c.g, 'pedestrian', { at: [x, y], scale: k * 0.82, view: 'profile', facing: 1, body: 'walk', phase: t * 0.9 }, { color: '#3A3C3A', rim: '#FFFDF4' }); v.front(c, t, {}); } },
      { name: 'shelter: a dog in the slit of shade', draw(c, t) { const v = SETS.city.views.shelter; v.back(c, t, {}); const a = v.anchors.dog; person(c.g, 'dog', { at: [a.x, a.y], scale: a.scale, facing: a.facing, body: 'lie', pant: 1, phase: t, t }, { color: '#6E5A44', light: { x: 1500, y: -300, color: '#FFFDF4' } }); v.front(c, t, {}); } },
      { name: 'stall: pouring melting ice', draw(c, t) { const v = SETS.city.views.stall, s = { pour: 0.7 }; v.back(c, t, s); const a = v.anchors.man;
        const inf = person(c.g, 'stallman', { at: [a.x, a.y], scale: a.scale, view: 'three', yaw: 30, facing: 1, body: 'stand', armR: 'reachLow', armL: 'hold', head: { nod: 0.45, turn: 0.1 } }, { light: { x: 1400, y: -300, color: '#FFFDF4' } });
        if (inf && inf.hands) s.hands = [(inf.hands.R[0] + inf.hands.L[0]) / 2, (inf.hands.R[1] + inf.hands.L[1]) / 2]; v.front(c, t, s); } },
    ],
  };
})();
