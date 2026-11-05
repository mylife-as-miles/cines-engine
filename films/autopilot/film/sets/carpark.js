/* AUTOPILOT · set: CARPARK, the office car park (Q07 at 8:32 in the morning, Q10 at 5:40 in the evening)
   A business park of blue glass. Daniel's block (A) faces east across the rows of bays to a second block (B), so every
   pane in the car park has something to give back: the car windows hold the blocks and the sky, the blocks hold each
   other, the entrance door holds the car park. Every pane is a planar mirror computed in true perspective (LC.camera)
   over what lies behind it (an office's ceiling lights, a dark cabin); in the evening every pane is copper and nothing can
   be seen through any of it.
   Views: arrival · space · crossing · door · rows · heat (film/api/carpark.md).
   Daniel's car is SETS.car.exterior (the car set) when it exists, given this set's camera, his space, the light and a
   reflection of this world for its glass; otherwise a placeholder with the same proportions. The other cars are this set's.
   Deterministic. Static layers are cached (keys 'carpark|...'). */
(function () {
  'use strict';
  const W = OTM.W, H = OTM.H, P = LC.P, TAU = Math.PI * 2;
  const { rgba, mix, clamp, lerp, rng, vnoise } = OTM;
  const deg = d => d * Math.PI / 180;
  const warn = m => { if (window.FILM && FILM.warn) FILM.warn('carpark: ' + m); };

  // =====================================================================================
  // KIT: scratch canvases, vectors, a camera with rays and near clipping, planar mirrors
  // =====================================================================================
  const pool = {};
  // a reusable offscreen canvas; with `box`, only that region is cleared (the caller reads only that region back)
  function scratch(name, w, h, box) {
    w = w || W; h = h || H; let g = pool[name];
    if (!g || g.canvas.width !== w || g.canvas.height !== h) g = pool[name] = OTM.makeCanvas(w, h).getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    if (box) g.clearRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4); else g.clearRect(0, 0, w, h); return g;
  }
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const dirAE = (az, el) => [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];   // compass azimuth (x east, z north)
  function mkCam(o) {
    o = Object.assign({ cx: W / 2, cy: H / 2, yaw: 0, pitch: 0, roll: 0 }, o);
    const c = LC.camera(o), cyw = Math.cos(o.yaw), syw = Math.sin(o.yaw), cp = Math.cos(o.pitch), sp = Math.sin(o.pitch), cr = Math.cos(o.roll), sr = Math.sin(o.roll);
    c.pos = [o.x, o.y, o.z]; c.o = o;
    c.view = q => { const dx = q[0] - o.x, dy = q[1] - o.y, dz = q[2] - o.z; const x1 = dx * cyw - dz * syw, z1 = dx * syw + dz * cyw; const y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp; return [x1 * cr + y2 * sr, -x1 * sr + y2 * cr, z2]; };
    c.sp = v => [o.cx + o.f * v[0] / v[2], o.cy - o.f * v[1] / v[2], v[2]];
    c.ray = (sx, sy) => { const x3 = (sx - o.cx) / o.f, y3 = (o.cy - sy) / o.f; const x1 = cr * x3 - sr * y3, y2 = sr * x3 + cr * y3; const dy = cp * y2 + sp, z1 = -sp * y2 + cp; return nrm([cyw * x1 + syw * z1, dy, -syw * x1 + cyw * z1]); };
    return c;
  }
  function mirrorCam(cam, o, n) {
    const refl = q => { const d = (q[0] - o[0]) * n[0] + (q[1] - o[1]) * n[1] + (q[2] - o[2]) * n[2]; return [q[0] - 2 * d * n[0], q[1] - 2 * d * n[1], q[2] - 2 * d * n[2]]; };
    const m = { f: cam.f, cx: cam.cx, cy: cam.cy, k: cam.k, o: cam.o, mirror: true, plane: { o, n }, pos: refl(cam.pos) };
    m.p = (x, y, z) => cam.p(refl(Array.isArray(x) ? x : [x, y, z]));
    m.view = q => cam.view(refl(q)); m.sp = cam.sp; m.pts = a => a.map(q => m.p(q));
    m.ray = (sx, sy) => { const d = cam.ray(sx, sy), k = 2 * dot(d, n); return [d[0] - k * n[0], d[1] - k * n[1], d[2] - k * n[2]]; };
    m.front = q => (q[0] - o[0]) * n[0] + (q[1] - o[1]) * n[1] + (q[2] - o[2]) * n[2] > 0;
    return m;
  }
  function clipNear(vs, zn) {
    const out = [];
    for (let i = 0; i < vs.length; i++) { const a = vs[i], b = vs[(i + 1) % vs.length], ia = a[2] > zn, ib = b[2] > zn; if (ia) out.push(a); if (ia !== ib) { const t = (zn - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, zn]); } }
    return out;
  }
  function path3(cam, pts) {
    const vs = clipNear(pts.map(cam.view), 0.06), p = new Path2D();
    vs.forEach((v, i) => { const s = cam.sp(v); if (i) p.lineTo(s[0], s[1]); else p.moveTo(s[0], s[1]); }); if (vs.length) p.closePath(); return p;
  }
  function scr3(cam, pts) { return clipNear(pts.map(cam.view), 0.06).map(v => cam.sp(v)); }
  function fill3(g, cam, pts, style, alpha) { g.save(); if (alpha != null) g.globalAlpha = alpha; g.fillStyle = style; g.fill(path3(cam, pts)); g.restore(); }
  function line3(g, cam, a, b, style, w) { const s = clipNear([cam.view(a), cam.view(b)], 0.06); if (s.length < 2) return; const p0 = cam.sp(s[0]), p1 = cam.sp(s[1]); g.strokeStyle = style; g.lineWidth = w; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
  function bboxOf(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
  const onScreen = (b, m) => b.x + b.w > -(m || 0) && b.y + b.h > -(m || 0) && b.x < W + (m || 0) && b.y < H + (m || 0);
  function newell(pts) { let nx = 0, ny = 0, nz = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); } return nrm([nx, ny, nz]); }
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
    p.forEach(q => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  const cached = (c, key, fn, w, h) => c.cache('carpark|' + key, fn, w, h);
  const quarter = (c, key, fn) => c.cache('carpark|' + key, (g, cv) => { g.scale(0.25, 0.25); fn(g, cv); }, W / 4, H / 4);

  // =====================================================================================
  // LIGHT
  // =====================================================================================
  const LIGHT = {
    morning: { az: deg(112), el: deg(16), glow: '#FFF6E6', rim: '#FFE9C4',
      sky: [[-1.6, '#6C6B66'], [-0.02, '#8D8B84'], [0, '#F4EEDE'], [0.07, '#E9E8DE'], [0.28, '#CCD6D2'], [0.7, '#AABBBC'], [1.6, '#97AAAE']],
      paintSky: '#D9E0DA', paintSun: '#FFF3DC', shade: 0.5, glassTint: '#9FBAC0', interior: '#0B1416',
      tar: ['#ABA79D', '#928E85', '#66645E'], line: '#EFEBE0', hedge: ['#5D7866', '#3D5447', '#26352E'], tree: ['#6C8A74', '#486253', '#2C3D35'],
      path: '#BDB9AE', kerb: '#E2DFD5', aTint: '#8FB0BA', bTint: '#7F98A0', spand: ['#9AA6A4', '#717E7D'], mull: ['#E2E7E3', '#7D8A88'], ceil: '#3E4C4E', panel: '#E8EEEA' },
    evening: { az: deg(282), el: deg(9), glow: '#FFD49A', rim: '#FFB877',
      sky: [[-1.6, '#2B2427'], [-0.02, '#4A383A'], [0, '#F2B47A'], [0.06, '#DE9F78'], [0.2, '#B08A88'], [0.55, '#7A7890'], [1.6, '#5C6279']],
      paintSky: '#9C93A2', paintSun: '#F5A764', shade: 0.6, glassTint: '#D49060', interior: '#120D0E',
      tar: ['#B98460', '#82604C', '#3E3133'], line: '#EDC6A0', hedge: ['#8A6A40', '#4A4232', '#262620'], tree: ['#9A7A48', '#4C4836', '#272A24'],
      path: '#7E6458', kerb: '#E9B184', aTint: '#8E8090', bTint: '#F0C8A0', spand: ['#B0704A', '#6A4636'], mull: ['#E6A472', '#3A2E30'], ceil: '#2A2730', panel: '#F2D8B8' },
  };
  const sunDir = L => dirAE(L.az, L.el);
  const withSun = (L, az, el, extra) => Object.assign({}, L, { az: az != null ? az : L.az, el: el != null ? el : L.el }, extra || {});
  function stopsAt(st, e) { if (e <= st[0][0]) return st[0][1]; for (let i = 1; i < st.length; i++) if (e <= st[i][0]) { const a = st[i - 1], b = st[i]; return mix(a[1], b[1], (e - a[0]) / (b[0] - a[0])); } return st[st.length - 1][1]; }
  // the sky (and the ground below the horizon) along any camera's rays, into a box: works through mirrors too
  function skyFill(g, cam, clip, box, L) {
    const el = (x, y) => Math.asin(clamp(cam.ray(x, y)[1], -1, 1));
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2, e0 = el(cx, cy), ex = el(cx + 24, cy) - e0, ey = el(cx, cy + 24) - e0;
    const len = Math.hypot(ex, ey) || 1e-9, ux = ex / len, uy = ey / len;
    const pr = [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]].map(([x, y]) => (x - cx) * ux + (y - cy) * uy);
    const s0 = Math.min(...pr) - 2, s1 = Math.max(...pr) + 2, p0 = [cx + ux * s0, cy + uy * s0], p1 = [cx + ux * s1, cy + uy * s1];
    const gr = g.createLinearGradient(p0[0], p0[1], p1[0], p1[1]); let prev = null; const N = 24;
    for (let i = 0; i <= N; i++) { const t = i / N, e = el(lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t));
      if (prev != null && (prev < 0) !== (e < 0)) { const tz = t - (1 / N) * (e / (e - prev)); gr.addColorStop(clamp(tz - 0.0008, 0, 1), stopsAt(L.sky, -0.021)); gr.addColorStop(clamp(tz + 0.0008, 0, 1), stopsAt(L.sky, 0.001)); }
      gr.addColorStop(t, stopsAt(L.sky, e)); prev = e; }
    g.save(); if (clip) g.clip(clip); g.fillStyle = gr; g.fillRect(box.x - 1, box.y - 1, box.w + 2, box.h + 2); g.restore();
  }
  // the sun or its reflection: a hot disc in posterised rings, the glow it lays on the air
  function sunAt(g, cam, L, o) {
    o = o || {}; const d = sunDir(L); if (cam.mirror && dot(d, cam.plane.n) <= 0) return null;
    const ref = cam.mirror ? cam.plane.o : cam.pos, s = cam.p(add(ref, mul(d, 5000))); if (s[2] <= 0) return null;
    const r = o.r || 26, k = o.k == null ? 1 : o.k, gl = o.glow == null ? 1 : o.glow;
    g.save(); if (o.clip) g.clip(o.clip); g.globalCompositeOperation = 'screen';
    g.fillStyle = LC.rad(g, s[0], s[1], 0, r * 24 * gl, [[0, L.glow, 0.6 * k], [0.12, L.glow, 0.24 * k], [0.4, L.glow, 0.07 * k], [1, L.glow, 0]]); g.fillRect(s[0] - r * 24 * gl, s[1] - r * 24 * gl, r * 48 * gl, r * 48 * gl);
    [[r * 8, 0.07], [r * 4.8, 0.09], [r * 2.9, 0.13], [r * 1.8, 0.22]].forEach(([rr, a]) => { g.fillStyle = rgba(L.glow, a * k); g.beginPath(); g.arc(s[0], s[1], rr, 0, TAU); g.fill(); });
    g.globalCompositeOperation = 'source-over'; g.fillStyle = rgba(P.sunWhite, Math.min(1, k)); g.beginPath(); g.arc(s[0], s[1], r, 0, TAU); g.fill();
    g.restore(); return s;
  }
  function sunEm(e, cam, L, r, a) { const d = sunDir(L); if (cam.mirror && dot(d, cam.plane.n) <= 0) return; const ref = cam.mirror ? cam.plane.o : cam.pos, s = cam.p(add(ref, mul(d, 5000))); if (s[2] <= 0) return; e.fillStyle = rgba(P.sunWhite, a == null ? 1 : a); e.beginPath(); e.arc(s[0], s[1], r, 0, TAU); e.fill(); e.fillStyle = rgba(L.glow, 0.35 * (a == null ? 1 : a)); e.beginPath(); e.arc(s[0], s[1], r * 3, 0, TAU); e.fill(); }

  // =====================================================================================
  // THE WORLD
  // =====================================================================================
  const A = { o: [0, 0, -46], a: [0, 0, 1], n: [1, 0, 0], w: 84, h: 14.6, floors: 4, bay: 1.5, name: 'A' };     // Daniel's block, facing east
  const B = { o: [62, 0, 64], a: [0, 0, -1], n: [-1, 0, 0], w: 124, h: 14.6, floors: 4, bay: 1.8, name: 'B' };  // across the car park, facing west
  const ROWS = [
    { x0: 6.0, x1: 10.8, h: deg(270), z0: -30, z1: 36, row: 1 },
    { x0: 16.8, x1: 21.6, h: deg(270), z0: -30, z1: 36, row: 2 },
    { x0: 21.6, x1: 26.4, h: deg(90), z0: -30, z1: 36, row: 3 },
    { x0: 32.4, x1: 37.2, h: deg(90), z0: -30, z1: 36, row: 4 },
  ];
  const DANIEL = { x: 8.45, z: 12.0, h: deg(270) };      // his usual space: row 1, nose to block A
  const BAYW = 2.4;
  const PAINTS = ['#A6ACAC', '#D2D3CD', '#1C1F20', '#2B3446', '#55302D', '#676C6D', '#58697A', '#4E5A50', '#8E8678', '#3E4A55', '#C9CBC4', '#2F3233'];
  const TYPES = ['hatch', 'hatch', 'hatch', 'saloon', 'estate', 'suv', 'hatch', 'suv', 'saloon'];
  const _parked = {};
  function parked(tod) {
    if (_parked[tod]) return _parked[tod];
    const out = [], R = rng('carpark-bays'), fill = tod === 'evening' ? 0.45 : 0.82;
    ROWS.forEach(rw => {
      for (let z = rw.z0 + BAYW / 2; z < rw.z1; z += BAYW) {
        const r = R(), r2 = R(), r3 = R(), r4 = R();
        if (rw.row === 1 && Math.abs(z) < 4.2) continue;
        if (rw.row === 1 && Math.abs(z - DANIEL.z) < 0.5) continue;                       // his own space
        const keep = rw.row === 1 && Math.abs(z - DANIEL.z) < 3 && tod === 'morning';       // his neighbours are there in the morning
        if (!keep && r > fill) continue;
        const type = TYPES[Math.floor(r2 * TYPES.length)], Bd = BODIES[type];
        const x = (rw.x0 + rw.x1) / 2 + (rw.h === deg(270) ? -1 : 1) * (2.4 - Bd.L / 2 - 0.2) + (r4 - 0.5) * 0.3;
        out.push({ x, z: z + (r3 - 0.5) * 0.35, h: rw.h + (r4 - 0.5) * 0.04, type, paint: PAINTS[Math.floor(r3 * PAINTS.length)], row: rw.row });
      }
    });
    return (_parked[tod] = out);
  }
  const TREES = (() => { const out = [], R = rng('carpark-trees'); for (let z = -44; z < 70; z += 8.5) out.push({ x: 44 + (R() - 0.5) * 2, z: z + (R() - 0.5) * 2, r: 3.0 + R() * 1.2, h: 3.0 + R() * 0.8, seed: Math.round(z * 3) }); return out; })();
  const NTREES = (() => { const out = [], R = rng('carpark-ntrees'); for (let x = 2; x < 60; x += 7.5) out.push({ x: x + (R() - 0.5) * 2, z: 46 + R() * 3, r: 3.2 + R() * 1.4, h: 3.2 + R() * 0.8, seed: Math.round(x * 7) }); return out; })();
  const LAMPS = [[13.8, -8], [13.8, 18], [29.4, -12], [29.4, 14], [29.4, 40], [13.8, 44]];

  // ---------- facades ----------
  function facadePt(F, s, t) { return [F.o[0] + F.a[0] * s, t, F.o[2] + F.a[2] * s]; }
  function inPt(F, s, t, d) { return [F.o[0] + F.a[0] * s - F.n[0] * d, t, F.o[2] + F.a[2] * s - F.n[2] * d]; }
  // what stands before the glass (for any mirror): the sky, the sun, the other block, trees, hedges
  function reflectScene(g, mc, L, tod, o) {
    o = o || {}; const box = o.box || { x: 0, y: 0, w: W, h: H };
    skyFill(g, mc, o.clip, box, L);
    g.save(); if (o.clip) g.clip(o.clip);
    if (o.sun !== false) sunAt(g, mc, L, { r: o.sunR || 22, k: o.sunK == null ? 1 : o.sunK, glow: o.glow });
    [A, B].forEach(F => { if (mc.front(facadePt(F, F.w / 2, 4)) && dot(F.n, sub(mc.pos, facadePt(F, F.w / 2, 4))) > 0) facadeFlat(g, mc, F, L, tod); });
    TREES.concat(NTREES).forEach(T => { if (mc.front([T.x, 0, T.z])) tree(g, mc, T, L, true); });
    if (o.hedge !== false && mc.front([4.4, 0.5, 12])) hedgeStrip(g, mc, L, tod, true);
    g.restore();
  }
  // a block seen small or in a reflection: glass, spandrels, the parapet
  function facadeFlat(g, cam, F, L, tod) {
    const ev = tod === 'evening', isB = F.name === 'B';
    const glass = ev ? (isB ? '#D88A55' : '#3A3644') : (isB ? '#7E949A' : '#C7D2CE'), spand = ev ? (isB ? '#9A5E40' : '#26232A') : (isB ? '#4C5C60' : '#9AA4A2');
    fill3(g, cam, [facadePt(F, 0, 0), facadePt(F, F.w, 0), facadePt(F, F.w, F.h + 0.8), facadePt(F, 0, F.h + 0.8)], glass);
    for (let j = 1; j <= F.floors; j++) { const t = j * 3.6; fill3(g, cam, [facadePt(F, 0, t - 0.5), facadePt(F, F.w, t - 0.5), facadePt(F, F.w, t + 0.4), facadePt(F, 0, t + 0.4)], spand); }
    fill3(g, cam, [facadePt(F, 0, 0), facadePt(F, F.w, 0), facadePt(F, F.w, 0.4), facadePt(F, 0, 0.4)], spand);
    const mc = ev ? (isB ? 'rgba(255,214,170,0.35)' : 'rgba(10,8,10,0.4)') : 'rgba(40,52,54,0.35)';
    for (let s = 0; s <= F.w; s += F.bay * 2) line3(g, cam, facadePt(F, s, 0), facadePt(F, s, F.h), mc, 1);
  }
  // what lies behind a curtain wall: each floor's ceiling with rows of light panels, the far wall, the carpet
  function interior(g, cam, F, L, tod, s0, s1) {
    const ev = tod === 'evening';
    for (let j = 0; j < F.floors; j++) {
      const fl = j * 3.6, ce = fl + (j === 0 ? 3.3 : 2.75);
      if (cam.pos[1] > ce + 0.3 && j > 0) continue;
      const D0 = 0.3, D1 = 15;
      fill3(g, cam, [inPt(F, s0, fl, D1), inPt(F, s1, fl, D1), inPt(F, s1, ce, D1), inPt(F, s0, ce, D1)], ev ? '#1A181C' : '#26302F');
      fill3(g, cam, [inPt(F, s0, ce, D0), inPt(F, s1, ce, D0), inPt(F, s1, ce, D1), inPt(F, s0, ce, D1)], L.ceil);
      fill3(g, cam, [inPt(F, s0, fl + 0.02, D0), inPt(F, s1, fl + 0.02, D0), inPt(F, s1, fl + 0.02, D1), inPt(F, s0, fl + 0.02, D1)], ev ? '#141215' : '#1E2928');
      for (let d = 1.4; d < D1 - 0.6; d += 2.4) for (let s = Math.floor(s0 / 1.8) * 1.8 + 0.3; s < s1; s += 1.8) fill3(g, cam, [inPt(F, s, ce - 0.01, d), inPt(F, s + 1.2, ce - 0.01, d), inPt(F, s + 1.2, ce - 0.01, d + 0.6), inPt(F, s, ce - 0.01, d + 0.6)], L.panel);
      // desks and screens as low dark bands, a column now and then
      for (let d = 3; d < 13; d += 3.2) fill3(g, cam, [inPt(F, s0, fl + 0.72, d), inPt(F, s1, fl + 0.72, d), inPt(F, s1, fl + 1.1, d), inPt(F, s0, fl + 1.1, d)], ev ? 'rgba(10,8,10,0.55)' : 'rgba(16,24,24,0.5)');
    }
  }
  // a block close: interior through the glass, the reflection laid into each pane a touch out of true, spandrels, mullions
  function facade(g, cam, F, L, tod, o) {
    o = o || {}; if (dot(F.n, sub(cam.pos, facadePt(F, F.w / 2, 4))) <= 0) return;
    const cw = g.canvas.width, ch = g.canvas.height, s0 = o.s0 == null ? 0 : o.s0, s1 = o.s1 == null ? F.w : o.s1;
    const mc = mirrorCam(cam, facadePt(F, 0, 0), F.n);
    const rf = scratch('cp-fac-refl', cw, ch); reflectScene(rf, mc, L, tod, { box: { x: 0, y: 0, w: cw, h: ch }, sunR: o.sunR, sunK: o.sunK, glow: o.glow });
    rf.save(); rf.globalCompositeOperation = 'multiply'; rf.fillStyle = F.name === 'A' ? L.aTint : L.bTint; rf.fillRect(0, 0, cw, ch); rf.restore();
    const it = scratch('cp-fac-int', cw, ch); it.fillStyle = L.interior; it.fillRect(0, 0, cw, ch); interior(it, cam, F, L, tod, s0, s1);
    const R = rng('panes' + F.name + tod), bay = F.bay, ra = o.reflK == null ? 0.92 : o.reflK;
    for (let j = 0; j < F.floors; j++) {
      const t0 = j === 0 ? 0.4 : j * 3.6 + 0.4, t1 = (j + 1) * 3.6 - 0.5;
      for (let s = Math.floor(s0 / bay) * bay; s < s1; s += bay) {
        const dx = (R() - 0.5) * 5, dy = (R() - 0.5) * 6, a = 0.8 + R() * 0.2, blind = R();
        if (o.skip && o.skip(s, j)) continue;
        const q = [facadePt(F, s, t0), facadePt(F, s + bay, t0), facadePt(F, s + bay, t1), facadePt(F, s, t1)], sq = scr3(cam, q);
        if (sq.length < 3) continue; const bb = bboxOf(sq); if (bb.x > cw || bb.y > ch || bb.x + bb.w < 0 || bb.y + bb.h < 0) continue;
        const pp = path3(cam, q);
        g.save(); g.clip(pp); g.drawImage(it.canvas, 0, 0);
        if (blind < 0.16) { g.fillStyle = tod === 'evening' ? 'rgba(60,50,52,0.9)' : 'rgba(150,160,156,0.85)'; g.fill(pp); for (let y = t0 + 0.1; y < t1; y += 0.12) line3(g, cam, facadePt(F, s, y), facadePt(F, s + bay, y), 'rgba(0,0,0,0.12)', 1); }
        g.globalCompositeOperation = 'screen'; g.globalAlpha = a * ra; g.drawImage(rf.canvas, dx, dy); g.restore();
      }
    }
    // spandrels, plinth, parapet
    for (let j = 1; j <= F.floors; j++) { const t = j * 3.6; fill3(g, cam, [facadePt(F, s0, t - 0.5), facadePt(F, s1, t - 0.5), facadePt(F, s1, t + 0.4), facadePt(F, s0, t + 0.4)], j === F.floors ? L.spand[0] : L.spand[1]);
      line3(g, cam, facadePt(F, s0, t + 0.4), facadePt(F, s1, t + 0.4), rgba(L.rim, 0.5), 1.2); }
    fill3(g, cam, [facadePt(F, s0, F.h - 0.2), facadePt(F, s1, F.h - 0.2), facadePt(F, s1, F.h + 0.9), facadePt(F, s0, F.h + 0.9)], L.spand[0]);
    fill3(g, cam, [facadePt(F, s0, 0), facadePt(F, s1, 0), facadePt(F, s1, 0.4), facadePt(F, s0, 0.4)], tod === 'evening' ? '#1C1A1F' : '#55605F');
    // mullions: a fin with a lit edge and a shadow edge
    for (let s = Math.ceil(s0 / bay) * bay; s <= s1; s += bay) {
      const a0 = facadePt(F, s, 0.4), a1 = facadePt(F, s, F.h - 0.2), v = cam.view(a0); if (v[2] < 0.3) continue; const k = cam.f / v[2], sp = cam.sp(v); if (sp[0] < -50 || sp[0] > cw + 50) continue;
      line3(g, cam, a0, a1, L.mull[1], Math.max(1, 0.07 * k)); line3(g, cam, add(a0, mul(F.a, -0.025)), add(a1, mul(F.a, -0.025)), L.mull[0], Math.max(0.8, 0.022 * k));
    }
    for (let j = 0; j < F.floors; j++) { const t = j * 3.6 + 0.4; line3(g, cam, facadePt(F, s0, t), facadePt(F, s1, t), L.mull[1], 1.4); }
  }

  // ---------- trees, hedges, lamp posts ----------
  function sunSide(cam, L) { const d = sunDir(L), a = cam.p(add(cam.pos, mul(d, 1000))), c = cam.p(add(cam.pos, [Math.sin(cam.o.yaw) * 1000, 0, Math.cos(cam.o.yaw) * 1000])); return a[2] > 0 ? Math.sign(a[0] - c[0]) || 1 : -Math.sign(a[0] - c[0]) || 1; }
  function tree(g, cam, T, L, flat) {
    const base = cam.p(T.x, 0, T.z); if (base[2] <= 0.5) return; const k = cam.f / base[2];
    const top = cam.p(T.x, T.h + T.r * 0.9, T.z), pts = [], cx = top[0], cy = top[1], rr = T.r * k;
    if (cx + rr < -50 || cx - rr > g.canvas.width + 50) return;
    for (let a = 0; a < 34; a++) { const t = a / 34 * TAU, n = 0.8 + 0.3 * vnoise(Math.cos(t) * 1.8 + T.seed, Math.sin(t) * 1.8, 5) + 0.06 * vnoise(Math.cos(t) * 6 + T.seed, Math.sin(t) * 6, 9); pts.push([cx + Math.cos(t) * rr * n, cy + Math.sin(t) * rr * n * 0.9]); }
    const crown = LC.pathPts(pts);
    g.fillStyle = L.tree[2]; g.fillRect(base[0] - 0.13 * k, top[1], 0.26 * k, base[1] - top[1]);
    if (flat) { g.fillStyle = L.tree[1]; g.fill(crown); return; }
    const sd = L._side || 1;
    g.fillStyle = L.tree[0]; g.fill(crown);                                   // the lit side
    g.save(); g.clip(crown); g.translate(-sd * 0.16 * rr, 0.1 * rr); g.fillStyle = L.tree[1]; g.fill(crown); g.restore();  // the body
    g.save(); g.clip(crown); g.fillStyle = rgba(L.tree[2], 0.65); g.beginPath(); g.ellipse(cx - sd * 0.2 * rr, cy + 0.42 * rr, rr * 0.95, rr * 0.5, 0, 0, TAU); g.fill(); g.restore();
  }
  function hedgeStrip(g, cam, L, tod, flat) {
    const z0 = -60, z1 = 70;
    fill3(g, cam, [[4.55, 0.13, z0], [4.55, 0.74, z0], [4.55, 0.74, z1], [4.55, 0.13, z1]], L.hedge[flat ? 2 : 1]);
    fill3(g, cam, [[4.55, 0.74, z0], [5.6, 0.74, z0], [5.6, 0.74, z1], [4.55, 0.74, z1]], L.hedge[0]);
    fill3(g, cam, [[5.6, 0.13, z0], [5.6, 0.74, z0], [5.6, 0.74, z1], [5.6, 0.13, z1]], L.hedge[tod === 'evening' ? 0 : 1]);
  }
  function lamp(g, cam, x, z, L, tod) {
    const b = cam.p(x, 0, z), t = cam.p(x, 7.6, z); if (b[2] <= 0.5) return; const k = cam.f / b[2];
    g.fillStyle = tod === 'evening' ? '#2A2629' : '#5D6766'; g.fillRect(b[0] - 0.06 * k, t[1], 0.12 * k, b[1] - t[1]);
    g.fillRect(t[0] - 0.12 * k, t[1] - 0.07 * k, 0.9 * k, 0.14 * k);
    g.fillStyle = rgba(L.rim, tod === 'evening' ? 0.8 : 0.55); g.fillRect(b[0] + (L._side || 1) * 0.035 * k - 0.012 * k, t[1], Math.max(1, 0.024 * k), b[1] - t[1]);
  }

  // =====================================================================================
  // THE CARS (every parked car; and Daniel's when the car set is not loaded)
  // =====================================================================================
  const BODIES = {
    hatch: { L: 4.26, Wd: 1.79, r: 0.315, ax: [1.33, -1.29], tumble: 0.17, ws: 3, rf: 4, rr: 5, rw: 6, pB: 0.47, pC: 0.78,
      spine: [[2.13, 0.30], [2.13, 0.62], [2.02, 0.76], [1.00, 0.97], [0.06, 1.45], [-1.56, 1.43], [-1.86, 1.00], [-2.08, 0.66], [-2.13, 0.30]] },
    saloon: { L: 4.70, Wd: 1.81, r: 0.32, ax: [1.42, -1.40], tumble: 0.16, ws: 3, rf: 4, rr: 5, rw: 6, pB: 0.5, pC: 0.86,
      spine: [[2.35, 0.30], [2.35, 0.62], [2.24, 0.76], [0.86, 0.98], [-0.06, 1.43], [-1.10, 1.42], [-1.72, 1.04], [-2.28, 1.02], [-2.35, 0.66], [-2.36, 0.30]] },
    estate: { L: 4.62, Wd: 1.80, r: 0.32, ax: [1.40, -1.38], tumble: 0.16, ws: 3, rf: 4, rr: 5, rw: 6, pB: 0.38, pC: 0.74,
      spine: [[2.31, 0.30], [2.31, 0.62], [2.20, 0.76], [0.92, 0.98], [0.0, 1.47], [-2.02, 1.45], [-2.24, 1.02], [-2.29, 0.66], [-2.31, 0.30]] },
    suv: { L: 4.45, Wd: 1.86, r: 0.36, ax: [1.36, -1.34], tumble: 0.15, ws: 3, rf: 4, rr: 5, rw: 6, pB: 0.45, pC: 0.8,
      spine: [[2.22, 0.40], [2.22, 0.80], [2.10, 0.95], [1.02, 1.13], [0.18, 1.66], [-1.74, 1.64], [-2.08, 1.17], [-2.20, 0.80], [-2.22, 0.40]] },
  };
  const DCAR = { type: 'hatch', paint: '#33464B', plateR: '#E6E0C6' };
  function carFrame(cr) {
    const F = [Math.sin(cr.h), 0, Math.cos(cr.h)], R = [Math.cos(cr.h), 0, -Math.sin(cr.h)], o = [cr.x, 0, cr.z];
    return { F, R, o, w: (u, v, w) => [o[0] + F[0] * u + R[0] * w, v, o[2] + F[2] * u + R[2] * w], loc: q => { const d = sub(q, o); return [dot(d, F), d[1], dot(d, R)]; } };
  }
  function bodyFaces(Bd) {
    const S = Bd.spine, n = S.length, hw = Bd.Wd / 2, tb = Bd.tumble, faces = [];
    const half = i => (i === Bd.rf || i === Bd.rr) ? hw - tb : hw;
    for (let i = 0; i < n - 1; i++) {
      const a = S[i], b = S[i + 1], ha = half(i) - (i === Bd.ws ? 0.03 : 0), hb = half(i + 1) - (i + 1 === Bd.rw ? 0.03 : 0);
      faces.push({ pts: [[a[0], a[1], -ha], [a[0], a[1], ha], [b[0], b[1], hb], [b[0], b[1], -hb]], glass: i === Bd.ws || i === Bd.rr, part: i === Bd.ws ? 'windscreen' : i === Bd.rr ? 'rear' : i === n - 2 ? 'rearface' : i === 0 ? 'frontface' : 'top', i });
    }
    for (const sg of [1, -1]) {
      const side = []; for (let i = 0; i <= Bd.ws; i++) side.push([S[i][0], S[i][1], sg * hw]); for (let i = Bd.rw; i < n; i++) side.push([S[i][0], S[i][1], sg * hw]);
      faces.push({ pts: side, part: 'side', sg });
      faces.push({ pts: [[S[Bd.ws][0], S[Bd.ws][1], sg * (hw - 0.03)], [S[Bd.rf][0], S[Bd.rf][1], sg * (hw - tb)], [S[Bd.rr][0], S[Bd.rr][1], sg * (hw - tb)], [S[Bd.rw][0], S[Bd.rw][1], sg * (hw - 0.03)]], glass: true, part: 'sideglass', sg });
    }
    faces.forEach(f => { let nn = newell(f.pts); const c = f.pts.reduce((s, p) => add(s, p), [0, 0, 0]).map(v => v / f.pts.length); if (dot(nn, sub(c, [0, 0.75, 0])) < 0) nn = mul(nn, -1); f.n = nn; f.c = c; });
    return faces;
  }
  Object.keys(BODIES).forEach(k => { BODIES[k].faces = bodyFaces(BODIES[k]); });
  function gh(Bd, sg, a, s) {
    const S = Bd.spine, hw = Bd.Wd / 2, b0 = S[Bd.ws], b1 = S[Bd.rw], t0 = S[Bd.rf], t1 = S[Bd.rr];
    const bu = lerp(b0[0], b1[0], a), bv = lerp(b0[1], b1[1], a), tu = lerp(t0[0], t1[0], a), tv = lerp(t0[1], t1[1], a);
    return [lerp(bu, tu, s), lerp(bv, tv, s), sg * lerp(hw - 0.03, hw - Bd.tumble, s)];
  }
  function beltAt(Bd, u) { const S = Bd.spine, b0 = S[Bd.ws], b1 = S[Bd.rw]; return lerp(b0[1], b1[1], clamp((u - b0[0]) / (b1[0] - b0[0]), 0, 1)); }
  // a parked car. cr: {x, z, h, type, paint, door, blink, plateR}. o: {L, tod, env(g, mc, clip, box, face), glassK, upright (0..1: read the glass more upright, for copper)}
  function drawCar(g, cam, cr, o) {
    const Bd = BODIES[cr.type || 'hatch'], fr = carFrame(cr), L = o.L, sun = sunDir(L), camL = fr.loc(cam.pos), hw = Bd.Wd / 2;
    const cv = cam.view(fr.o); if (cv[2] < -3) return;
    const Wp = q => fr.w(q[0], q[1], q[2]), base = cr.paint;
    const tone = nL => {
      const nW = nrm(add(add(mul(fr.F, nL[0]), [0, nL[1], 0]), mul(fr.R, nL[2]))), d = dot(nW, sun);
      let c = d > 0.25 ? mix(base, L.paintSun, 0.16 + 0.14 * d) : d > -0.05 ? mix(base, L.paintSky, 0.1) : mix(base, '#000000', L.shade);
      if (nW[1] > 0.55) c = mix(c, L.paintSky, 0.3);
      return c;
    };
    // the shadow: footprint, and the roof pushed along the sun
    { const pts = [], Sp = Bd.spine, lift = q => { const h = q[1]; return [q[0] - sun[0] / sun[1] * h, q[2] - sun[2] / sun[1] * h]; };
      [[Sp[0][0], 0, hw + 0.04], [Sp[0][0], 0, -hw - 0.04], [Sp[Sp.length - 1][0], 0, hw + 0.04], [Sp[Sp.length - 1][0], 0, -hw - 0.04]].forEach(q => { const w = Wp(q); pts.push([w[0], w[2]]); });
      if (sun[1] > 0.05) [[Sp[Bd.rf][0], Sp[Bd.rf][1], hw - Bd.tumble], [Sp[Bd.rf][0], Sp[Bd.rf][1], -hw + Bd.tumble], [Sp[Bd.rr][0], Sp[Bd.rr][1], hw - Bd.tumble], [Sp[Bd.rr][0], Sp[Bd.rr][1], -hw + Bd.tumble], [Sp[2][0], Sp[2][1], hw], [Sp[2][0], Sp[2][1], -hw], [Sp[Sp.length - 2][0], Sp[Sp.length - 2][1], hw], [Sp[Sp.length - 2][0], Sp[Sp.length - 2][1], -hw]].forEach(q => pts.push(lift(Wp(q))));
      fill3(g, cam, hull(pts).map(p => [p[0], 0.005, p[1]]), rgba(o.tod === 'evening' ? '#140F12' : '#1A2224', 0.6));
      fill3(g, cam, [[Sp[0][0] - 0.25, 0, hw - 0.1], [Sp[0][0] - 0.25, 0, -hw + 0.1], [Sp[Sp.length - 1][0] + 0.25, 0, -hw + 0.1], [Sp[Sp.length - 1][0] + 0.25, 0, hw - 0.1]].map(Wp).map(p => [p[0], 0.006, p[2]]), rgba('#060909', 0.82)); }
    const wheel = (u, sg, near) => {
      const pts = [], wv = sg * (hw - (near ? 0.04 : 0.1)); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; pts.push(Wp([u + Math.cos(a) * Bd.r, Bd.r + Math.sin(a) * Bd.r, wv])); }
      fill3(g, cam, pts, '#121515');
      if (near) { const rim = [], hub = []; for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; rim.push(Wp([u + Math.cos(a) * Bd.r * 0.62, Bd.r + Math.sin(a) * Bd.r * 0.62, wv + sg * 0.01])); hub.push(Wp([u + Math.cos(a) * Bd.r * 0.2, Bd.r + Math.sin(a) * Bd.r * 0.2, wv + sg * 0.015])); }
        fill3(g, cam, rim, o.tod === 'evening' ? '#5A4A44' : '#8A918F'); fill3(g, cam, hub, '#2A2E2E');
        line3(g, cam, Wp([u + Bd.r * 0.45, Bd.r + Bd.r * 0.42, wv + sg * 0.012]), Wp([u - Bd.r * 0.1, Bd.r + Bd.r * 0.6, wv + sg * 0.012]), rgba(L.rim, 0.45), 1.3); }
    };
    const nearSg = camL[2] > 0 ? 1 : -1;
    Bd.ax.forEach(u => wheel(u, -nearSg, false));
    const faces = Bd.faces.filter(f => dot(f.n, sub(camL, f.c)) > 0).map(f => ({ f, d: cam.view(Wp(f.c))[2] })).sort((a, b) => b.d - a.d);
    faces.forEach(({ f }) => {
      const ptsW = f.pts.map(Wp);
      if (f.glass) { glassPane(g, cam, ptsW, f, o); return; }
      const col = tone(f.n); g.fillStyle = col; g.fill(path3(cam, ptsW));
      if (f.part === 'side') sideDetail(g, cam, Bd, f.sg, Wp, col, o);
      if (f.i === Bd.spine.length - 3) rearDetail(g, cam, Bd, Wp, o, cr);
      if (f.part === 'frontface' || f.i === 1) frontDetail(g, cam, Bd, Wp, f, o);
    });
    { const sg = nearSg, P4 = (a0, a1) => [gh(Bd, sg, a0, 0), gh(Bd, sg, a1, 0), gh(Bd, sg, a1, 1), gh(Bd, sg, a0, 1)].map(Wp);
      fill3(g, cam, P4(0, 0.045), mix(base, '#000000', 0.55)); fill3(g, cam, P4(Bd.pB - 0.02, Bd.pB + 0.025), '#0E1112');
      fill3(g, cam, [gh(Bd, sg, Bd.pC, 0), gh(Bd, sg, 1, 0), gh(Bd, sg, 1, 1), gh(Bd, sg, Bd.pC + 0.06, 1)].map(Wp), tone([0, 0.25, sg]));
      const k = cam.k(Math.max(0.5, cam.view(Wp(gh(Bd, sg, 0.5, 1)))[2]));
      const top = [gh(Bd, sg, 0, 1), gh(Bd, sg, 1, 1)].map(Wp); line3(g, cam, top[0], top[1], '#0C0F10', Math.max(1.2, 0.03 * k));
      const bl = [gh(Bd, sg, 0, 0), gh(Bd, sg, 1, 0)].map(Wp); line3(g, cam, bl[0], bl[1], '#0A0C0D', Math.max(1.2, 0.035 * k));
      if (sun[1] > 0) line3(g, cam, add(top[0], [0, 0.014, 0]), add(top[1], [0, 0.014, 0]), rgba(L.rim, 0.6), Math.max(1, 0.012 * k)); }
    Bd.ax.forEach(u => wheel(u, nearSg, true));
    { const sg = nearSg, m0 = Bd.spine[Bd.ws][0] - 0.12, mv = Bd.spine[Bd.ws][1] + 0.06;
      fill3(g, cam, [[m0, mv, sg * hw], [m0, mv, sg * (hw + 0.2)], [m0 - 0.16, mv + 0.02, sg * (hw + 0.2)], [m0 - 0.2, mv + 0.13, sg * (hw + 0.16)], [m0 - 0.02, mv + 0.14, sg * hw]].map(Wp), tone([0.2, 0.3, sg])); }
    if ((cr.door || 0) > 0.01) openDoor(g, cam, Bd, fr, cr, o, tone);
  }
  function sideDetail(g, cam, Bd, sg, Wp, col, o) {
    const L = o.L, hw = Bd.Wd / 2, S = Bd.spine, k = cam.k(Math.max(0.5, cam.view(Wp([0, 0.6, sg * hw]))[2]));
    const ey = clamp(cam.pos[1] * 0.5 + 0.2, 0.5, 0.88), side = [];
    for (let i = 0; i <= Bd.ws; i++) side.push([S[i][0], S[i][1], sg * hw]); for (let i = Bd.rw; i < S.length; i++) side.push([S[i][0], S[i][1], sg * hw]);
    g.save(); g.clip(path3(cam, side.map(Wp)));
    fill3(g, cam, [[3, ey, sg * hw], [-3, ey, sg * hw], [-3, 2, sg * hw], [3, 2, sg * hw]].map(Wp), mix(col, L.paintSky, 0.14));     // the sky laid along the upper flank
    fill3(g, cam, [[3, 0, sg * hw], [-3, 0, sg * hw], [-3, 0.44, sg * hw], [3, 0.44, sg * hw]].map(Wp), rgba('#000000', 0.25));
    const uB = lerp(S[Bd.ws][0], S[Bd.rw][0], Bd.pB), uA = S[Bd.ws][0] + 0.05, uC = lerp(S[Bd.ws][0], S[Bd.rw][0], Bd.pC) + 0.05;
    [uA, uB, uC].forEach(u => line3(g, cam, Wp([u, 0.34, sg * hw]), Wp([u, beltAt(Bd, u) - 0.02, sg * hw]), rgba('#000000', 0.45), Math.max(1, 0.012 * k)));
    [uB + 0.18, uC + 0.12].forEach(u => fill3(g, cam, [[u, 0.86, sg * hw], [u - 0.17, 0.86, sg * hw], [u - 0.17, 0.9, sg * hw], [u, 0.9, sg * hw]].map(Wp), rgba('#000000', 0.5)));
    Bd.ax.forEach(u => { const pts = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * i / 14; pts.push(Wp([u + Math.cos(a) * (Bd.r + 0.05), Bd.r + Math.sin(a) * (Bd.r + 0.06), sg * hw])); } pts.push(Wp([u - Bd.r - 0.05, 0.2, sg * hw]), Wp([u + Bd.r + 0.05, 0.2, sg * hw])); fill3(g, cam, pts, '#0A0C0C'); });
    g.restore();
    line3(g, cam, Wp([S[Bd.ws][0], S[Bd.ws][1] - 0.01, sg * hw]), Wp([S[Bd.rw][0], S[Bd.rw][1] - 0.01, sg * hw]), rgba(L.rim, 0.32), Math.max(1, 0.008 * k));
  }
  function rearDetail(g, cam, Bd, Wp, o, cr) {
    const L = o.L, hw = Bd.Wd / 2, S = Bd.spine, n = S.length, a = S[n - 3], b = S[n - 2];
    const P2 = (t, w) => Wp([lerp(a[0], b[0], t), lerp(a[1], b[1], t), w]);
    for (const sg of [1, -1]) {
      fill3(g, cam, [P2(0.05, sg * (hw - 0.02)), P2(0.05, sg * (hw - 0.36)), P2(0.42, sg * (hw - 0.36)), P2(0.42, sg * (hw - 0.02))], '#4A1C1C');
      fill3(g, cam, [P2(0.08, sg * (hw - 0.05)), P2(0.08, sg * (hw - 0.33)), P2(0.2, sg * (hw - 0.33)), P2(0.2, sg * (hw - 0.05))], cr.blink > 0 ? mix('#5E3A22', '#FFC27A', cr.blink) : '#5E3A22');
    }
    fill3(g, cam, [P2(0.32, -0.26), P2(0.32, 0.26), P2(0.6, 0.26), P2(0.6, -0.26)], '#1A1D1E');
    fill3(g, cam, [P2(0.35, -0.24), P2(0.35, 0.24), P2(0.57, 0.24), P2(0.57, -0.24)], cr.plateR || (o.tod === 'evening' ? '#E9C9A4' : '#E2DCC4'));   // UK rear plate, bleached cream
    for (let i = 0; i < 7; i++) { const w0 = -0.2 + i * 0.058 + (i > 3 ? 0.03 : 0); fill3(g, cam, [P2(0.4, w0), P2(0.4, w0 + 0.035), P2(0.52, w0 + 0.035), P2(0.52, w0)], 'rgba(30,30,30,0.55)'); }
  }
  function frontDetail(g, cam, Bd, Wp, f, o) {
    const hw = Bd.Wd / 2, S = Bd.spine;
    if (f.i === 1) { const P2 = (t, w) => Wp([lerp(S[1][0], S[2][0], t), lerp(S[1][1], S[2][1], t), w]);
      for (const sg of [1, -1]) fill3(g, cam, [P2(0.1, sg * (hw - 0.04)), P2(0.1, sg * (hw - 0.42)), P2(0.85, sg * (hw - 0.38)), P2(0.85, sg * (hw - 0.06))], o.tod === 'evening' ? '#9A7058' : '#C9D0CC');
      fill3(g, cam, [P2(0.15, -0.36), P2(0.15, 0.36), P2(0.75, 0.36), P2(0.75, -0.36)], '#141718'); }
    if (f.part === 'frontface') { const P2 = (t, w) => Wp([lerp(S[0][0], S[1][0], t), lerp(S[0][1], S[1][1], t), w]);
      fill3(g, cam, [P2(0.12, -hw + 0.2), P2(0.12, hw - 0.2), P2(0.45, hw - 0.25), P2(0.45, -hw + 0.25)], '#121516');
      fill3(g, cam, [P2(0.5, -0.26), P2(0.5, 0.26), P2(0.82, 0.26), P2(0.82, -0.26)], o.tod === 'evening' ? '#EBCDB0' : '#E4E2DA'); }
  }
  // glass: a mirror of what the view says stands around it, over a dark cabin. Nothing is ever seen through it.
  function glassPane(g, cam, ptsW, f, o) {
    const L = o.L, pp = path3(cam, ptsW), sp = scr3(cam, ptsW); if (sp.length < 3) return; const box = bboxOf(sp);
    if (box.w < 1 || box.h < 1 || !onScreen(box, 20)) return;
    g.save(); g.clip(pp); g.fillStyle = L.interior; g.fill(pp);
    let n = newell(ptsW); const cW = ptsW.reduce((s, p) => add(s, p), [0, 0, 0]).map(v => v / ptsW.length); if (dot(n, sub(cam.pos, cW)) < 0) n = mul(n, -1);
    const up = f.part === 'sideglass' ? (o.uprightSide == null ? 0.6 : o.uprightSide) : (o.upright || 0);
    if (up) n = nrm([n[0], n[1] * (1 - up), n[2]]);
    const mc = mirrorCam(cam, cW, n);
    const rb = { x: Math.max(0, Math.floor(box.x) - 2), y: Math.max(0, Math.floor(box.y) - 2), w: Math.min(W, Math.ceil(box.w) + 4), h: Math.min(H, Math.ceil(box.h) + 4) };
    const rg = scratch('cp-glass', g.canvas.width, g.canvas.height, rb);
    if (o.env) o.env(rg, mc, null, rb, f); else skyFill(rg, mc, null, rb, L);
    const fres = clamp(0.66 + 0.34 * Math.pow(1 - Math.abs(dot(n, nrm(sub(cam.pos, cW)))), 2), 0, 1) * (o.glassK == null ? 1 : o.glassK);
    g.globalAlpha = Math.min(1, fres); g.drawImage(rg.canvas, rb.x, rb.y, rb.w, rb.h, rb.x, rb.y, rb.w, rb.h); g.globalAlpha = 1;
    g.globalCompositeOperation = 'multiply'; g.fillStyle = mix('#FFFFFF', L.glassTint, 0.32); g.fill(pp); g.globalCompositeOperation = 'source-over';
    const ang = Math.atan2(sp[1][1] - sp[0][1], sp[1][0] - sp[0][0]) + 1.1;
    LC.glare(g, null, { x: box.x + box.w * 0.4, y: box.y + box.h * 0.5, angle: ang, color: '#FFFFFF', bands: [{ d: -box.w * 0.08, w: Math.max(4, box.w * 0.1), a: 0.06 }, { d: box.w * 0.06, w: Math.max(2, box.w * 0.02), a: 0.09 }] });
    g.restore();
    g.strokeStyle = 'rgba(6,8,9,0.85)'; g.lineWidth = Math.max(1, box.w / 260); g.stroke(pp);
  }
  function openDoor(g, cam, Bd, fr, cr, o, tone) {
    const hw = Bd.Wd / 2, S = Bd.spine, sg = 1, ang = (cr.door || 0) * deg(62);
    const uA = S[Bd.ws][0] + 0.05, uB = lerp(S[Bd.ws][0], S[Bd.rw][0], Bd.pB) - 0.01;
    fill3(g, cam, [[uA, 0.36, sg * hw], [uB, 0.36, sg * hw], gh(Bd, sg, Bd.pB - 0.02, 0.96), gh(Bd, sg, 0.05, 0.96)].map(q => fr.w(...q)), '#050707');
    const rot = q => { const du = q[0] - uA, dw = q[2] - sg * hw; const ca = Math.cos(ang), sa = Math.sin(ang); return [uA + du * ca, q[1], sg * hw + Math.abs(du) * sa * sg + dw]; };
    const skin = [[uA, 0.36, sg * hw], [uB, 0.36, sg * hw], [uB, beltAt(Bd, uB), sg * hw], [uA, beltAt(Bd, uA), sg * hw]].map(rot).map(q => fr.w(...q));
    const win = [gh(Bd, sg, 0.05, 0), gh(Bd, sg, Bd.pB - 0.02, 0), gh(Bd, sg, Bd.pB - 0.02, 0.96), gh(Bd, sg, 0.05, 0.96)].map(rot).map(q => fr.w(...q));
    const outward = dot(newell(skin), sub(cam.pos, skin[0])) > 0;
    if (outward) { fill3(g, cam, skin, tone([-Math.sin(ang), 0, Math.cos(ang)])); glassPane(g, cam, win, { part: 'door' }, o); }
    else { fill3(g, cam, skin, '#151819'); fill3(g, cam, win, '#0A0D0E'); }
  }

  // ---------- the ground ----------
  function ground(g, cam, L, tod, o) {
    o = o || {}; const x0 = o.x0 == null ? -400 : o.x0, far = 400;
    const hz = cam.p(add(cam.pos, [Math.sin(cam.o.yaw) * 3000, 0, Math.cos(cam.o.yaw) * 3000]))[1];
    g.fillStyle = LC.lin(g, 0, hz, 0, g.canvas.height, [[0, L.tar[0]], [0.22, L.tar[1]], [1, mix(L.tar[1], L.tar[2], 0.55)]]);
    g.fill(path3(cam, [[x0, 0, -far], [far, 0, -far], [far, 0, far], [x0, 0, far]]));
    const ev = tod === 'evening';
    // the footpath along block A (paving), its kerb, the low hedge on the planting strip
    fill3(g, cam, [[0, 0.01, -60], [4.4, 0.01, -60], [4.4, 0.01, 70], [0, 0.01, 70]], L.path);
    if (o.slabs) { for (let x = 0.6; x < 4.4; x += 0.6) line3(g, cam, [x, 0.012, o.slabs[0]], [x, 0.012, o.slabs[1]], rgba('#000000', 0.08), 1); for (let z = Math.ceil(o.slabs[0] / 0.9) * 0.9; z < o.slabs[1]; z += 0.9) line3(g, cam, [0, 0.012, z], [4.4, 0.012, z], rgba('#000000', 0.08), 1); }
    fill3(g, cam, [[4.4, 0.0, -60], [4.4, 0.13, -60], [4.4, 0.13, 70], [4.4, 0.0, 70]], L.kerb);
    fill3(g, cam, [[4.4, 0.13, -60], [5.7, 0.13, -60], [5.7, 0.13, 70], [4.4, 0.13, 70]], L.hedge[2]);
    hedgeStrip(g, cam, L, tod, false);
    fill3(g, cam, [[5.7, 0.0, -60], [5.7, 0.13, -60], [5.7, 0.13, 70], [5.7, 0.0, 70]], L.kerb);
    fill3(g, cam, [[4.4, 0.135, -1.8], [5.7, 0.135, -1.8], [5.7, 0.135, 1.8], [4.4, 0.135, 1.8]], L.path);
    const R = rng('lines'), zr = o.z || [-30, 36];
    ROWS.forEach(rw => { if (o.rows && o.rows.indexOf(rw.row) < 0) return;
      for (let z = rw.z0; z <= rw.z1 + 0.01; z += BAYW) { const wear = 0.55 + 0.45 * R(); if (rw.row === 1 && Math.abs(z) < 4.3) continue; if (z < zr[0] || z > zr[1]) continue;
        fill3(g, cam, [[rw.x0 + 0.15, 0.012, z - 0.05], [rw.x1 - 0.1, 0.012, z - 0.05], [rw.x1 - 0.1, 0.012, z + 0.05], [rw.x0 + 0.15, 0.012, z + 0.05]], rgba(L.line, 0.78 * wear)); }
      const xe = rw.row % 2 ? rw.x1 : rw.x0; fill3(g, cam, [[xe - 0.05, 0.012, Math.max(rw.z0, zr[0])], [xe + 0.05, 0.012, Math.max(rw.z0, zr[0])], [xe + 0.05, 0.012, Math.min(rw.z1, zr[1])], [xe - 0.05, 0.012, Math.min(rw.z1, zr[1])]], rgba(L.line, 0.35));
      for (let z = rw.z0 + BAYW / 2; z < rw.z1; z += BAYW) { if (z < zr[0] || z > zr[1]) continue; const xc = (rw.x0 + rw.x1) / 2, r = R(), s = []; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; s.push([xc + Math.cos(a) * (0.5 + r * 0.4), 0.011, z + Math.sin(a) * 0.32]); } fill3(g, cam, s, rgba('#1E2020', 0.1 + 0.1 * r)); } });
    for (let i = 0; i < 7; i++) { const x = 5.9 + i * 0.62; fill3(g, cam, [[x, 0.012, -1.5], [x + 0.36, 0.012, -1.5], [x + 0.36, 0.012, 1.5], [x, 0.012, 1.5]], rgba(L.line, 0.8)); }
  }
  function entranceFront(g, cam, L, tod) {
    const ev = tod === 'evening';
    fill3(g, cam, [[0, 3.1, -4.2], [3.0, 3.1, -4.2], [3.0, 3.1, 4.2], [0, 3.1, 4.2]], ev ? '#1E1B20' : '#6E7877');
    for (let x = 0.8; x < 3; x += 1.0) for (let z = -3.4; z < 3.6; z += 1.4) { const p = cam.p(x, 3.09, z), k = cam.f / Math.max(0.3, p[2]); if (p[2] > 0.3) { g.fillStyle = ev ? 'rgba(255,220,180,0.7)' : 'rgba(240,246,240,0.85)'; g.beginPath(); g.ellipse(p[0], p[1], 0.07 * k, 0.03 * k, 0, 0, TAU); g.fill(); } }
    fill3(g, cam, [[3.0, 3.1, -4.2], [3.0, 3.45, -4.2], [3.0, 3.45, 4.2], [3.0, 3.1, 4.2]], ev ? '#4A3A3A' : '#D8DDD9');
    fill3(g, cam, [[0, 3.45, -4.2], [3.0, 3.45, -4.2], [3.0, 3.45, 4.2], [0, 3.45, 4.2]], ev ? '#2A2428' : '#B9C1BE');
    [-3.9, 3.9].forEach(z => { fill3(g, cam, [[2.85, 0, z - 0.08], [2.95, 0, z - 0.08], [2.95, 3.1, z - 0.08], [2.85, 3.1, z - 0.08]], ev ? '#141215' : '#4A5453'); fill3(g, cam, [[2.95, 0, z - 0.08], [2.95, 0, z + 0.08], [2.95, 3.1, z + 0.08], [2.95, 3.1, z - 0.08]], ev ? '#3A2E2E' : '#9AA4A2'); });
  }

  // =====================================================================================
  // DANIEL'S CAR: the car set's exterior, given this set's camera, his space and this world's reflection
  // =====================================================================================
  function carAnchor(cam, pose) {
    const c = cam.p(pose.x, 0, pose.z), k = cam.f / Math.max(0.1, c[2]);
    return { x: c[0], y: c[1], scale: k, heading: pose.h, at: [pose.x, 0, pose.z], depth: c[2] };
  }
  // a reflect function in the car set's form (g, w): rebuilds the pane's plane from its facing and the usual rake of that glass
  function carReflect(cam, pose, L, tod, env, o) {
    o = o || {};
    return (g, w) => {
      const rk = { windscreen: 60, tailgate: o.tailRake == null ? 26 : o.tailRake, rear: 10, front: 10 }[w.glass]; const rake = deg(rk == null ? 12 : rk);
      let hx = Math.sin(w.yaw), hz = -Math.cos(w.yaw); const o0 = [pose.x, 1.1, pose.z];
      if (hx * (cam.pos[0] - o0[0]) + hz * (cam.pos[2] - o0[2]) < 0) { hx = -hx; hz = -hz; }
      const n = nrm([hx * Math.cos(rake), Math.sin(rake), hz * Math.cos(rake)]);
      const mc = mirrorCam(cam, [o0[0] + hx * 0.9, 1.1, o0[2] + hz * 0.9], n);
      if (env) env(g, mc, null, w.box, { part: w.glass }); else skyFill(g, mc, null, w.box, L);
    };
  }
  function danielsCar(c, g, cam, pose, s, L, tod, env, o) {
    s = s || {}; o = o || {};
    if (window.SETS && SETS.car && typeof SETS.car.exterior === 'function' && !s.placeholderCar) {
      try {
        return SETS.car.exterior(g, { cam, at: [pose.x, 0, pose.z], heading: pose.h, tod, sun: sunDir(L), doors: { driver: s.door || 0 }, indicators: s.blink || 0,
          reflect: carReflect(cam, pose, L, tod, env, o), reflectStrength: o.reflectStrength, em: o.em, t: c && c.t });
      } catch (e) { warn('SETS.car.exterior failed (' + e.message + '); drawing the placeholder'); }
    }
    drawCar(g, cam, Object.assign({}, DCAR, pose, { door: s.door || 0, blink: s.blink || 0 }), { L, tod, env, upright: o.upright == null ? 0.5 : o.upright });
    return null;
  }

  // =====================================================================================
  // FIGURES (the demos only; RIG draws the people in the film)
  // =====================================================================================
  function figure(g, x, y, k, o) {
    o = o || {}; const f = o.facing || 1, ph = o.phase || 0, walk = o.body === 'walk' || o.body === 'hurry' ? 1 : 0;
    g.save(); g.translate(x, y); g.scale(k * f, k);
    const sw = Math.sin(ph * TAU) * 0.22 * walk; g.fillStyle = o.color || '#1B2426'; const S = pts => g.fill(LC.smooth(pts));
    S([[-0.07, -0.9], [0.05, -0.9], [0.06 + sw * 0.5, -0.45], [0.1 + sw, -0.02], [0.0 + sw, 0], [-0.02 + sw * 0.3, -0.45]]);
    S([[-0.05, -0.9], [0.07, -0.9], [0.04 - sw * 0.3, -0.45], [0.02 - sw, 0], [-0.08 - sw, -0.02], [-0.06 - sw * 0.5, -0.45]]);
    S([[-0.17, -0.92], [0.17, -0.92], [0.2, -1.2], [0.18, -1.42], [0.06, -1.46], [-0.06, -1.46], [-0.19, -1.42], [-0.2, -1.2]]);
    S([[-0.04, -1.44], [0.04, -1.44], [0.045, -1.52], [-0.045, -1.52]]); g.beginPath(); g.ellipse(0.01, -1.62, 0.085, 0.11, 0, 0, TAU); g.fill();
    S([[0.13, -1.42], [0.2, -1.38], [0.22 - sw * 0.6, -1.0], [0.16 - sw * 0.6, -0.98], [0.12, -1.3]]);
    g.restore();
  }
  function person(g, who, pose, opts) {
    if (window.RIG && RIG.CHAR && RIG.CHAR[who] && typeof RIG.draw === 'function') { try { return RIG.draw(g, who, pose, opts || {}); } catch (e) { warn('RIG.draw ' + who + ': ' + e.message); } }
    figure(g, pose.at[0], pose.at[1], pose.scale, { facing: pose.facing, body: pose.body, phase: pose.phase, color: (opts && opts.color) || '#1B2426' });
    return null;
  }

  // =====================================================================================
  // VIEWS
  // =====================================================================================
  const todOf = s => (s && s.tod) === 'evening' ? 'evening' : 'morning';

  // -------------------------------------------------------------------------------------
  // ARRIVAL (Q07 4–10): through the windscreen as he pulls into his usual space and stops. Block A's glass front fills the
  // glass ahead: its ceiling lights inside, the car park and the sky laid over them, each pane a touch out of true.
  // s.pull 0..1 (the last 2.3 m; 1 = stopped), s.engine (0..1 shiver while it runs), s.windscreen (default true)
  // -------------------------------------------------------------------------------------
  const ARR = { eye: [7.95, 1.17, 12.37], back: 2.3, yaw: deg(-90), pitch: deg(6), f: 1150, over: 1.32 };
  function arrivalCam(pull, over) { over = over || 1; return mkCam({ x: ARR.eye[0] + ARR.back * (1 - pull), y: ARR.eye[1], z: ARR.eye[2], yaw: ARR.yaw, pitch: ARR.pitch, f: ARR.f, cx: W * over / 2, cy: H * over / 2 }); }
  const LA = withSun(LIGHT.morning, deg(118), deg(14), { _side: -1 });
  const arrival = {
    back(c, t, s) {
      s = s || {}; const g = c.g, pull = s.pull == null ? 1 : clamp(s.pull, 0, 1), over = ARR.over, cw = Math.round(W * over), chh = Math.round(H * over);
      // the facade (a plane facing us): rendered once from the stopped camera with overscan, then scaled for the approach
      const lay = cached(c, 'arrival|facade', lg => { const cam = arrivalCam(1, over); skyFill(lg, cam, null, { x: 0, y: 0, w: cw, h: chh }, LA);
        facade(lg, cam, A, LA, 'morning', { s0: 46, s1: 84, sunR: 30 }); entranceFront(lg, cam, LA, 'morning'); }, cw, chh);
      const d1 = ARR.eye[0], d = ARR.eye[0] + ARR.back * (1 - pull), k = d1 / d, sh = (s.engine || 0) * 0.7 * Math.sin(t * 47);
      g.save(); g.translate(W / 2, H / 2 + sh); g.scale(k, k); g.translate(-cw / 2, -chh / 2); g.drawImage(lay, 0, 0); g.restore();
      // what is nearer moves for real: the footpath, the hedge, the kerb and the bay, his neighbours either side
      const cam = arrivalCam(pull);
      if (sh) { g.save(); g.translate(0, sh); }
      ground(g, cam, LA, 'morning', { x0: 0, rows: [1], z: [2, 24], slabs: [4, 22] });
      const nb = parked('morning').filter(cr => cr.row === 1 && Math.abs(cr.z - DANIEL.z) < 6);
      nb.sort((a, b) => cam.view([b.x, 0, b.z])[2] - cam.view([a.x, 0, a.z])[2]).forEach(cr => drawCar(g, cam, cr, { L: LA, tod: 'morning', env: (rg, mc, cl, box) => { skyFill(rg, mc, null, box, LA); facadeFlat(rg, mc, A, LA, 'morning'); } }));
      if (sh) g.restore();
      const em = quarter(c, 'arrival|em', eg => { const cm = arrivalCam(1); sunEm(eg, mirrorCam(cm, facadePt(A, 0, 0), A.n), LA, 30, 0.9); });
      c.em.save(); c.em.globalAlpha = 0.8; c.em.drawImage(em, 0, 0, W, H); c.em.restore();
    },
    front(c, t, s) {
      s = s || {}; if (s.windscreen === false) return;
      c.g.drawImage(cached(c, 'arrival|cabin', fg => cabinFrame(fg)), 0, 0);
    },
    anchors: {}, light: { x: 1500, y: 160, color: '#FFF3DC' },
  };
  // a plain windscreen frame (for when the car set's own cabin is not laid over a through-the-windscreen view)
  function cabinFrame(g) {
    const top = 156, dash = 884;
    const glass = new Path2D(); glass.moveTo(80, top); glass.lineTo(1840, top); glass.lineTo(1910, dash); glass.lineTo(10, dash); glass.closePath();
    g.save(); g.clip(glass); g.globalCompositeOperation = 'screen';
    g.fillStyle = LC.lin(g, 0, dash - 210, 0, dash, [[0, '#D9D2C2', 0], [1, '#D9D2C2', 0.2]]); g.fillRect(0, dash - 210, W, 210);
    g.fillStyle = 'rgba(217,210,194,0.08)'; g.fill(LC.smooth([[1170, dash], [1250, dash - 40], [1480, dash - 54], [1700, dash - 40], [1780, dash]], true));
    for (let x = 400; x < 1120; x += 26) { g.fillStyle = 'rgba(40,40,40,0.16)'; g.fillRect(x, dash - 44, 10, 30); }
    g.restore();
    LC.glare(g, glass, { x: 700, y: 420, angle: -1.05, color: '#FFFFFF', bands: [{ d: -230, w: 130, a: 0.05 }, { d: -150, w: 18, a: 0.07 }, { d: 360, w: 210, a: 0.03 }] });
    LC.specks(g, glass, { x: 0, y: top, w: W, h: dash - top }, 'cp-wsdust', { n: 700, color: '#FFF3DA', rMin: 0.5, rMax: 1.5, aMin: 0.06, aMax: 0.32, scratch: 0.1, near: { x: 1500, y: 200, r: 700 } });
    g.fillStyle = '#060808'; g.fillRect(0, 0, W, top + 40);
    for (let row = 0; row < 7; row++) { const y = top + 44 + row * 11, r = 4.6 * (1 - row / 7.2); for (let x = (row % 2) * 6; x < W; x += 12) { if (x > 830 && x < 1090 && y < top + 120) continue; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } }
    g.fillStyle = LC.lin(g, 0, 0, 0, top, [[0, '#3A3A35'], [1, '#4E4C45']]); g.fillRect(0, 0, W, top - 6);
    g.fillStyle = '#26251F'; g.fillRect(0, top - 8, W, 5);
    const ap = new Path2D(); ap.moveTo(1780, 0); ap.lineTo(W, 0); ap.lineTo(W, dash + 30); ap.bezierCurveTo(1880, 600, 1850, 330, 1780, 0); ap.closePath(); g.fillStyle = '#22211D'; g.fill(ap);
    g.strokeStyle = 'rgba(244,220,180,0.22)'; g.lineWidth = 2; g.beginPath(); g.moveTo(1792, 10); g.bezierCurveTo(1860, 330, 1890, 600, 1906, dash); g.stroke();
    const lp = new Path2D(); lp.moveTo(0, 0); lp.lineTo(130, 0); lp.bezierCurveTo(78, 330, 42, 600, 0, dash + 30); lp.closePath(); g.fillStyle = '#22211D'; g.fill(lp);
    g.fillStyle = LC.lin(g, 0, dash, 0, H, [[0, '#2A2A27'], [0.2, '#191A18'], [1, '#0C0D0C']]); g.fillRect(0, dash, W, H - dash);
    g.fillStyle = 'rgba(232,214,180,0.14)'; g.fillRect(0, dash, W, 3);
    for (let x = 400; x < 1120; x += 26) { g.fillStyle = '#0A0B0A'; g.fillRect(x, dash + 14, 10, 22); }
    const bn = LC.smooth([[1180, H + 20], [1210, dash + 34], [1330, dash - 10], [1490, dash - 24], [1650, dash - 10], [1770, dash + 34], [1800, H + 20]]); g.fillStyle = '#111211'; g.fill(bn); g.strokeStyle = 'rgba(236,216,180,0.16)'; g.lineWidth = 2.5; g.stroke(bn);
    // the mirror: only the road behind (the car park lane, a car's bonnet, the sky); never the back seat
    const mo = LC.rrect(806, 176, 318, 98, 42); g.fillStyle = '#121516'; g.fill(LC.rrect(796, 166, 338, 118, 48));
    g.save(); g.clip(mo); g.fillStyle = LC.lin(g, 0, 176, 0, 274, [[0, '#E9E7DC'], [0.42, '#CBD3CE'], [0.52, '#8B8A84'], [1, '#6A6964']]); g.fillRect(806, 176, 318, 98);
    g.fillStyle = '#516960'; [[812, 214, 70, 16], [884, 210, 52, 20], [1010, 212, 80, 18]].forEach(([x, y, w, h]) => { g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, TAU); g.fill(); });
    g.fillStyle = '#7E8C92'; g.fillRect(938, 214, 64, 16); g.fillStyle = '#C9D2D0'; g.fillRect(944, 216, 52, 6);
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(806, 176, 318, 30); g.restore();
    g.strokeStyle = 'rgba(240,236,224,0.4)'; g.lineWidth = 1.5; g.stroke(mo);
    g.fillStyle = '#0D0F10'; g.fillRect(948, top - 14, 34, 34);
  }

  // -------------------------------------------------------------------------------------
  // SPACE (Q07 10–16 morning; Q10 18–28 evening): his car in its usual space, rear three-quarter from the driver's side.
  // Morning: block A beyond, its glass holding the sky and the sun's mirror image; the rear window holds the sky and block B.
  // Evening: the low sun behind block A, the car in shade, its rear window a copper mirror.
  // s.tod, s.door (0..1 driver's door), s.blink (0..1 indicators), s.car (false: the sequence draws the car with view.car)
  // -------------------------------------------------------------------------------------
  const SPC = { cam: () => mkCam({ x: 15.2, y: 1.18, z: 16.2, yaw: deg(-118), pitch: deg(0.5), f: 1560 }) };
  const LSm = withSun(LIGHT.morning, deg(112), deg(12.5), { _side: -1 }), LSe = withSun(LIGHT.evening, deg(262), deg(6), { _side: 1 });
  const spaceL = tod => tod === 'evening' ? LSe : LSm;
  function spaceEnv(L, tod) { return (rg, mc, cl, box) => reflectScene(rg, mc, L, tod, { box, sunR: 14, glow: 0.6 }); }
  const space = {
    back(c, t, s) {
      s = s || {}; const g = c.g, tod = todOf(s), L = spaceL(tod);
      const lay = cached(c, 'space|' + tod, lg => {
        const cam = SPC.cam();
        skyFill(lg, cam, null, { x: 0, y: 0, w: W, h: H }, L);
        facade(lg, cam, A, L, tod, { s0: 30, s1: 84, sunR: 26, reflK: tod === 'evening' ? 0.95 : 0.9 });
        entranceFront(lg, cam, L, tod);
        ground(lg, cam, L, tod, { x0: 0, z: [-4, 34], slabs: [4, 34] });
        LAMPS.forEach(([x, z]) => { if (x < 14) lamp(lg, cam, x, z, L, tod); });
        const env = (rg, mc, cl, box) => reflectScene(rg, mc, L, tod, { box, sunR: 12, glow: 0.5 });
        parked(tod).filter(cr => cr.x < 23 && cam.view([cr.x, 0.5, cr.z])[2] > 2).sort((a, b) => cam.view([b.x, 0, b.z])[2] - cam.view([a.x, 0, a.z])[2])
          .forEach(cr => drawCar(lg, cam, cr, { L, tod, env, upright: tod === 'evening' ? 0.6 : 0.2, glassK: tod === 'evening' ? 1.25 : 1 }));
        if (tod === 'evening') { lg.save(); lg.globalCompositeOperation = 'multiply'; lg.fillStyle = LC.lin(lg, 0, 0, 0, H, [[0, '#E6D6DE'], [0.55, '#CDB7B6'], [1, '#9E8C90']]); lg.fillRect(0, 0, W, H); lg.restore(); }
      });
      g.drawImage(lay, 0, 0);
      const em = quarter(c, 'space|em|' + tod, eg => { const cam = SPC.cam(); sunEm(eg, mirrorCam(cam, facadePt(A, 0, 0), A.n), L, 26, tod === 'evening' ? 0.4 : 0.9); });
      c.em.save(); c.em.globalAlpha = 0.85; c.em.drawImage(em, 0, 0, W, H); c.em.restore();
      if (s.car !== false) space.car(c, t, s);
    },
    // Daniel's car on its own (cached per state), for when he must pass behind it
    car(c, t, s) {
      s = s || {}; const tod = todOf(s), L = spaceL(tod), cam = SPC.cam(), d = clamp(s.door || 0, 0, 1), bl = (s.blink || 0) > 0.5 ? 1 : 0;
      const env = (rg, mc, cl, box) => reflectScene(rg, mc, L, tod, { box, sunR: 12, glow: 0.6 });
      const cv = cached(c, 'space|car|' + tod + '|' + Math.round(d * 20) + '|' + bl, cg => danielsCar(c, cg, cam, DANIEL, { door: d, blink: bl }, L, tod, env, { tailRake: tod === 'evening' ? 8 : 18, reflectStrength: tod === 'evening' ? 0.95 : 0.85 }));
      c.g.drawImage(cv, 0, 0);
      if (bl) blinkers(c, cam, DANIEL, s.blink, tod);
    },
    front(c, t, s) {
      s = s || {}; const tod = todOf(s);
      c.g.drawImage(cached(c, 'space|front|' + tod, fg => {
        fg.globalCompositeOperation = 'screen';
        if (tod === 'evening') { fg.fillStyle = LC.rad(fg, 1700, 380, 0, 1000, [[0, '#F2A65E', 0.2], [0.5, '#E4894A', 0.06], [1, '#E4894A', 0]]); fg.fillRect(0, 0, W, H); }
        else { fg.fillStyle = LC.rad(fg, 1180, 120, 0, 900, [[0, '#FFF6E6', 0.16], [1, '#FFF6E6', 0]]); fg.fillRect(0, 0, W, H); }
        fg.globalCompositeOperation = 'source-over'; fg.fillStyle = LC.lin(fg, 0, 840, 0, H, [[0, '#0B1112', 0], [1, '#0B1112', 0.55]]); fg.fillRect(0, 840, W, 240);
      }), 0, 0);
    },
    anchors: {}, light: { x: 1180, y: 120, color: '#FFF3DC' },
  };
  function blinkers(c, cam, pose, k, tod) {
    const ch = Math.cos(pose.h), sh = Math.sin(pose.h);
    [1, -1].forEach(sg => { const lx = sg * 0.7, lz = -1.98, w = [pose.x + lx * ch + lz * sh, 0.92, pose.z - lx * sh + lz * ch], p = cam.p(w); if (p[2] <= 0) return; const kk = cam.f / p[2];
      const e = c.em; e.save(); e.globalAlpha = k; e.fillStyle = '#FFB060'; e.beginPath(); e.arc(p[0], p[1], 0.12 * kk, 0, TAU); e.fill(); e.restore();
      const g = c.g; g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, p[0], p[1], 0, 0.28 * kk, [[0, '#FFD9A0', 0.9 * k], [0.3, '#F2A65E', 0.4 * k], [1, '#F2A65E', 0]]); g.fillRect(p[0] - 0.3 * kk, p[1] - 0.3 * kk, 0.6 * kk, 0.6 * kk); g.restore(); });
  }

  // -------------------------------------------------------------------------------------
  // CROSSING (Q07 16–24): parked cars side-on; the camera tracks with Daniel, who is only ever seen in their side windows,
  // broken by the pillars and the gaps between cars. Above the roofs, the far side of the car park and block B.
  // s.track (metres along the row), s.reflect(g, R): draw Daniel into the reflection (R.x, R.y the virtual image's feet,
  // R.scale px/m, R.facing, R.light); the set keeps it to the glass and lays it in like a mirror.
  // -------------------------------------------------------------------------------------
  const CRS = { d: 3.4, eye: 0.95, f: 1500, carsX: 6.6, behind: 1.0 };
  const CROSS_CARS = (() => { const out = [], R = rng('crossing-cars'); let z = 26; const T = ['hatch', 'saloon', 'hatch', 'estate', 'suv', 'hatch', 'saloon', 'hatch', 'estate', 'hatch'], Pp = ['#A6ACAC', '#2B3446', '#D2D3CD', '#55302D', '#676C6D', '#1C1F20', '#8E8678', '#58697A', '#C9CBC4', '#3E4A55'];
    for (let i = 0; i < T.length; i++) { const Bd = BODIES[T[i]]; z -= Bd.L / 2 + 0.55 + R() * 0.7; out.push({ x: CRS.carsX, z, h: 0, type: T[i], paint: Pp[i] }); z -= Bd.L / 2; } return out; })();
  function crossCam(track) { return mkCam({ x: CRS.carsX - 0.9 - CRS.d, y: CRS.eye, z: 18 - track, yaw: deg(90), pitch: deg(1.5), f: CRS.f }); }
  const LC_ = withSun(LIGHT.morning, deg(120), deg(26), { _side: 1 });
  function crossEnv(rg, mc, cl, box) {
    skyFill(rg, mc, null, box, LC_);
    // block A behind us, sunlit: its ground floor and the canopy; the footpath and the hedge between
    facadeFlat(rg, mc, A, Object.assign({}, LC_), 'morning');
    fill3(rg, mc, [[0, 3.1, -4.2], [3.0, 3.1, -4.2], [3.0, 3.45, 4.2], [0, 3.45, 4.2]], '#C9CFCB');
    fill3(rg, mc, [[0, 0.01, -60], [4.4, 0.01, -60], [4.4, 0.01, 70], [0, 0.01, 70]], '#C9C4B8');
    hedgeStrip(rg, mc, LC_, 'morning', true);
  }
  const crossing = {
    back(c, t, s) {
      s = s || {}; const g = c.g, track = s.track || 0, L = LC_;
      const farL = cached(c, 'crossing|far', fg => {
        const cw = mkCam({ x: CRS.carsX - 0.9 - CRS.d, y: CRS.eye, z: 18, yaw: deg(90), pitch: deg(1.5), f: CRS.f, cx: 1700, cy: H / 2 });
        skyFill(fg, cw, null, { x: 0, y: 0, w: 3400, h: H }, L);
        sunAt(fg, cw, L, { r: 26 });
        facade(fg, cw, B, L, 'morning', { s0: 20, s1: 124, reflK: 0.95 });
        TREES.forEach(T => tree(fg, cw, T, Object.assign({}, L, { _side: 1 }), false));
        LAMPS.forEach(([x, z]) => lamp(fg, cw, x, z, L, 'morning'));
        ground(fg, cw, L, 'morning', { x0: 5.8, z: [-40, 60] });
        parked('morning').filter(cr => cr.x > 14).sort((a, b) => cw.view([b.x, 0, b.z])[2] - cw.view([a.x, 0, a.z])[2]).forEach(cr => drawCar(fg, cw, cr, { L, tod: 'morning', env: (rg, mc, cl, box) => skyFill(rg, mc, null, box, L) }));
        fg.fillStyle = LC.lin(fg, 0, 560, 0, H, [[0, '#2A3433', 0], [0.3, '#2A3433', 0.55], [1, '#141B1C', 0.9]]); fg.fillRect(0, 560, 3400, H - 560);
      }, 3400, H);
      g.drawImage(farL, -(1700 - W / 2) + track * CRS.f / 22, 0);
      const cam = crossCam(track);
      // the near tarmac in the cars' shade
      fill3(g, cam, [[CRS.carsX - 0.9, 0.01, cam.pos[2] - 30], [CRS.carsX - 0.9, 0.01, cam.pos[2] + 30], [cam.pos[0] + 0.3, 0.01, cam.pos[2] + 30], [cam.pos[0] + 0.3, 0.01, cam.pos[2] - 30]], '#3E4545');
      CROSS_CARS.forEach(cr => { const v = cam.view([cr.x, 0.7, cr.z]); if (Math.abs(v[0] / v[2]) < 1.7) drawCar(g, cam, cr, { L, tod: 'morning', env: crossEnv, glassK: 1.1, uprightSide: 1 }); });
    },
    front(c, t, s) {
      s = s || {}; const g = c.g, track = s.track || 0, cam = crossCam(track);
      if (s.reflect) {
        const rg = scratch('cp-cross-refl'), dist = CRS.d + 0.9 + CRS.behind;
        const vf = cam.p(CRS.carsX + 0.9 + CRS.d + CRS.behind, 0, cam.pos[2]);
        const R = { x: W / 2 + (s.offset || 0), y: vf[1], scale: CRS.f / (CRS.d + dist), facing: s.facing == null ? -1 : s.facing, t, light: { x: 1400, y: -300, color: '#FFE9C4' } };
        rg.save(); s.reflect(rg, R); rg.restore();
        rg.globalCompositeOperation = 'multiply'; rg.fillStyle = '#B8C6C6'; rg.fillRect(0, 0, W, H);
        const mk = scratch('cp-cross-mask');
        CROSS_CARS.forEach(cr => { const v = cam.view([cr.x, 0.7, cr.z]); if (Math.abs(v[0] / v[2]) > 1.7) return; const Bd = BODIES[cr.type], fr = carFrame(cr), sg = fr.loc(cam.pos)[2] > 0 ? 1 : -1;
          mk.fillStyle = '#fff'; mk.fill(path3(cam, [gh(Bd, sg, 0.05, 0.03), gh(Bd, sg, Bd.pB - 0.025, 0.03), gh(Bd, sg, Bd.pB - 0.025, 0.96), gh(Bd, sg, 0.05, 0.96)].map(q => fr.w(...q))));
          mk.fill(path3(cam, [gh(Bd, sg, Bd.pB + 0.03, 0.03), gh(Bd, sg, Bd.pC - 0.005, 0.03), gh(Bd, sg, Bd.pC + 0.055, 0.96), gh(Bd, sg, Bd.pB + 0.03, 0.96)].map(q => fr.w(...q)))); });
        rg.globalCompositeOperation = 'destination-in'; rg.drawImage(mk.canvas, 0, 0);
        g.save(); g.globalAlpha = 0.72; g.drawImage(rg.canvas, 0, 0); g.restore();
      }
      c.g.drawImage(cached(c, 'crossing|front', fg => { fg.fillStyle = LC.lin(fg, 0, 880, 0, H, [[0, '#0B1112', 0], [1, '#0B1112', 0.45]]); fg.fillRect(0, 880, W, 200);
        fg.globalCompositeOperation = 'screen'; fg.fillStyle = LC.rad(fg, 1560, -160, 0, 1000, [[0, '#FFF6E6', 0.3], [1, '#FFF6E6', 0]]); fg.fillRect(0, 0, W, H); }), 0, 0);
    },
    anchors: {}, light: { x: 1560, y: -160, color: '#FFF0D8' },
  };

  // -------------------------------------------------------------------------------------
  // DOOR (Q07 20–24): the entrance's glass door sighs shut behind him. Close, outside: the leaf swings shut on its hinge,
  // the car park and the sun's glint sliding across its glass as it turns; through it the cool lobby where Daniel walks
  // away (the sequence draws him between back and front). s.door: 1 = open (swung out toward us), 0 = shut.
  // -------------------------------------------------------------------------------------
  const DR = { cam: () => mkCam({ x: 3.15, y: 1.42, z: -0.55, yaw: deg(-96), pitch: deg(4), f: 1250 }), z0: -1.12, zh: 1.12, height: 2.45 };
  const LD = withSun(LIGHT.morning, deg(118), deg(14), { _side: -1 });
  function lobby(g, cam) {
    fill3(g, cam, [[-12, 0, -9], [-0.05, 0, -9], [-0.05, 0, 9], [-12, 0, 9]], '#6E7F7C');
    for (let x = -11; x < 0; x += 1.2) line3(g, cam, [x, 0.005, -9], [x, 0.005, 9], 'rgba(30,40,40,0.18)', 1);
    fill3(g, cam, [[-12, 3.6, -9], [-0.05, 3.6, -9], [-0.05, 3.6, 9], [-12, 3.6, 9]], '#2E3C3D');
    fill3(g, cam, [[-12, 0, -9], [-12, 3.6, -9], [-12, 3.6, 9], [-12, 0, 9]], '#3E5050');
    fill3(g, cam, [[-12, 0, 9], [-0.05, 0, 9], [-0.05, 3.6, 9], [-12, 3.6, 9]], '#34464A');
    fill3(g, cam, [[-12, 0, -9], [-0.05, 0, -9], [-0.05, 3.6, -9], [-12, 3.6, -9]], '#2A3A3C');
    for (let x = -11; x < 0; x += 2.2) { fill3(g, cam, [[x, 3.59, -3], [x + 0.6, 3.59, -3], [x + 0.6, 3.59, 3], [x, 3.59, 3]], '#E4EBE7'); fill3(g, cam, [[x, 0.01, -2.4], [x + 0.5, 0.01, -2.4], [x + 0.5, 0.01, 2.4], [x, 0.01, 2.4]], 'rgba(214,226,222,0.28)'); }
    [-2.2, 1.0].forEach(z => { fill3(g, cam, [[-11.98, 0, z], [-11.98, 0, z + 1.4], [-11.98, 2.4, z + 1.4], [-11.98, 2.4, z]], '#8C9A98'); line3(g, cam, [-11.97, 0, z + 0.7], [-11.97, 2.4, z + 0.7], '#56625F', 2); });
    fill3(g, cam, [[-7, 0, -6.5], [-7, 0, -2.6], [-7, 1.1, -2.6], [-7, 1.1, -6.5]], '#B9C3BE');
    fill3(g, cam, [[-7, 1.1, -6.5], [-7, 1.1, -2.6], [-7.7, 1.1, -2.6], [-7.7, 1.1, -6.5]], '#E1E6E1');
    fill3(g, cam, [[-7, 0, -2.6], [-7.7, 0, -2.6], [-7.7, 1.1, -2.6], [-7, 1.1, -2.6]], '#7F8D8A');
    { const b = cam.p(-1.4, 0, 4.0), k = cam.f / b[2]; g.fillStyle = '#2B3A35'; g.fillRect(b[0] - 0.22 * k, b[1] - 0.5 * k, 0.44 * k, 0.5 * k); const R = rng('lobbyplant'); g.fillStyle = '#3C5248';
      for (let i = 0; i < 18; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.4, l = (0.6 + R() * 0.9) * k; g.save(); g.translate(b[0], b[1] - 0.5 * k); g.rotate(a + Math.PI / 2); g.beginPath(); g.ellipse(0, -l / 2, 0.08 * k, l / 2, 0, 0, TAU); g.fill(); g.restore(); } }
  }
  const door = {
    back(c, t, s) {
      s = s || {}; const g = c.g;
      g.drawImage(cached(c, 'door|back', lg => {
        const cam = DR.cam();
        skyFill(lg, cam, null, { x: 0, y: 0, w: W, h: H }, LD);
        facade(lg, cam, A, LD, 'morning', { s0: 36, s1: 56, sunR: 22, skip: (s0, j) => j === 0 && s0 + A.o[2] > -1.6 && s0 + A.o[2] < 1.4 });
        // the doorway (the lobby straight through where the leaves are not)
        lg.save(); lg.clip(path3(cam, [[0, 0, DR.z0], [0, 0, DR.zh], [0, DR.height, DR.zh], [0, DR.height, DR.z0]])); lobby(lg, cam); lg.restore();
        // transom panel over the doors, frame
        fill3(lg, cam, [[0.02, DR.height, DR.z0 - 0.08], [0.02, DR.height, DR.zh + 0.08], [0.02, DR.height + 0.16, DR.zh + 0.08], [0.02, DR.height + 0.16, DR.z0 - 0.08]], '#3A4443');
        [DR.z0 - 0.08, DR.zh].forEach(z => fill3(lg, cam, [[0.02, 0, z], [0.02, 0, z + 0.08], [0.02, DR.height + 0.16, z + 0.08], [0.02, DR.height + 0.16, z]], '#3E4847'));
        entranceFront(lg, cam, LD, 'morning');
        ground(lg, cam, LD, 'morning', { x0: 0, z: [-8, 8], slabs: [-8, 8] });
        // the doormat and the threshold, a tree's shade lying across the paving toward us
        fill3(lg, cam, [[0.05, 0.015, -1.1], [1.6, 0.015, -1.1], [1.6, 0.015, 1.1], [0.05, 0.015, 1.1]], '#2C3232');
        const sh = LC.layer(); sh.fillStyle = 'rgba(14,22,22,0.62)'; sh.beginPath(); sh.moveTo(0, 820); sh.bezierCurveTo(500, 790, 900, 840, 1300, 830); sh.bezierCurveTo(1600, 826, 1800, 870, W, 850); sh.lineTo(W, H); sh.lineTo(0, H); sh.closePath(); sh.fill();
        lg.drawImage(LC.blurred(sh.canvas, 14, false), 0, 0);
      }), 0, 0);
    },
    front(c, t, s) {
      s = s || {}; const g = c.g, cam = DR.cam(), open = clamp(s.door == null ? 0 : s.door, 0, 1);
      // the reflection the leaves carry: rendered once for a shut door, wider than the frame, slid as a leaf turns
      const PAD = 900, refl = cached(c, 'door|refl', rg => { const cw = mkCam(Object.assign({}, cam.o, { cx: W / 2 + PAD })); const mc = mirrorCam(cw, [0.03, 0, 0], [1, 0, 0]);
        reflectScene(rg, mc, LD, 'morning', { box: { x: 0, y: 0, w: W + 2 * PAD, h: H }, sunR: 26 });
        rg.globalCompositeOperation = 'multiply'; rg.fillStyle = '#A9C2C8'; rg.fillRect(0, 0, W + 2 * PAD, H); }, W + 2 * PAD, H);
      const leaf = (zA, zB, hingeZ, ang) => {
        const cs = [[zA, 0.04], [zB, 0.04], [zB, DR.height], [zA, DR.height]].map(([z, y]) => { const dz = z - hingeZ; return [0.03 + Math.abs(dz) * Math.sin(ang), y, hingeZ + dz * Math.cos(ang)]; });
        const pp = path3(cam, cs);
        g.save(); g.clip(pp);
        g.fillStyle = 'rgba(150,186,194,0.16)'; g.fill(pp);
        g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.66; g.drawImage(refl, -PAD + ang * 2 * cam.f * 0.55 * (hingeZ > 0 ? -1 : 1), 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        // manifestation: frosted dots at eye level and lower down (the law on glass doors), a smudge by the handle
        [1.52, 0.98].forEach(hh => { for (let zz = Math.min(zA, zB) + 0.06; zz < Math.max(zA, zB) - 0.04; zz += 0.065) { const dz = zz - hingeZ, q = [0.03 + Math.abs(dz) * Math.sin(ang), hh, hingeZ + dz * Math.cos(ang)], sp = cam.p(q), k = cam.f / sp[2]; g.fillStyle = 'rgba(236,242,238,0.5)'; g.beginPath(); g.ellipse(sp[0], sp[1], 0.016 * k * Math.max(0.2, Math.cos(ang)), 0.016 * k, 0, 0, TAU); g.fill(); } });
        const bb = bboxOf(scr3(cam, cs));
        LC.glare(g, null, { x: bb.x + bb.w * 0.5, y: bb.y + bb.h * 0.4, angle: -1.15, color: '#FFFFFF', bands: [{ d: -bb.w * 0.2, w: bb.w * 0.22, a: 0.05 }, { d: bb.w * 0.1, w: Math.max(2, bb.w * 0.03), a: 0.08 }] });
        g.restore();
        g.strokeStyle = '#46524F'; g.lineWidth = Math.max(2, 0.045 * cam.f / Math.max(1, cam.view(cs[1])[2])); g.stroke(pp);
        // the pull handle: a steel bar that catches the sun
        const free = zA === hingeZ ? zB : zA, hz2 = free - Math.sign(free - hingeZ) * 0.12, dz = hz2 - hingeZ, hx = 0.03 + Math.abs(dz) * Math.sin(ang) + 0.07 * Math.cos(ang), hzz = hingeZ + dz * Math.cos(ang) + 0.07 * Math.sin(ang) * Math.sign(-dz);
        const h0 = cam.p(hx, 0.78, hzz), h1 = cam.p(hx, 1.7, hzz), kk = cam.f / h0[2];
        g.lineCap = 'round'; g.strokeStyle = '#6E7A78'; g.lineWidth = 0.036 * kk; g.beginPath(); g.moveTo(h0[0], h0[1]); g.lineTo(h1[0], h1[1]); g.stroke();
        g.strokeStyle = '#FBF6EA'; g.lineWidth = 0.009 * kk; g.beginPath(); g.moveTo(h0[0] + 0.009 * kk, h0[1]); g.lineTo(h1[0] + 0.009 * kk, h1[1]); g.stroke();
      };
      leaf(DR.z0, 0.0, DR.z0, 0);                               // the fixed leaf
      leaf(0.0, DR.zh, DR.zh, open * deg(76));                  // the leaf that swings
      c.g.drawImage(cached(c, 'door|front', fg => { fg.fillStyle = LC.lin(fg, 0, 900, 0, H, [[0, '#0B1112', 0], [1, '#0B1112', 0.4]]); fg.fillRect(0, 900, W, 180); }), 0, 0);
    },
    anchors: {}, light: { x: 300, y: 120, color: '#FFF3DC' },
  };

  // -------------------------------------------------------------------------------------
  // ROWS (Q10 18–24): 5:40, down the aisle. The low sun from the left turns the windscreens along the row copper; the
  // cars' long shadows stripe the aisle; Daniel walks up it toward his car (anchors.path), small against the copper.
  // -------------------------------------------------------------------------------------
  const RWS = { cam: () => mkCam({ x: 13.2, y: 1.6, z: -9.0, yaw: deg(5), pitch: deg(-1.2), f: 1320 }) };
  const LR = withSun(LIGHT.evening, deg(272), deg(7.5), { _side: -1 });
  const rows = {
    back(c, t, s) {
      s = s || {}; const g = c.g, L = LR;
      g.drawImage(cached(c, 'rows|back', lg => {
        const cam = RWS.cam();
        skyFill(lg, cam, null, { x: 0, y: 0, w: W, h: H }, L);
        NTREES.concat(TREES).sort((a, b) => cam.view([b.x, 0, b.z])[2] - cam.view([a.x, 0, a.z])[2]).forEach(T => tree(lg, cam, T, L, false));
        facade(lg, cam, B, L, 'evening', { s0: 0, s1: 124, sunR: 20, reflK: 1 });
        ground(lg, cam, L, 'evening', { z: [-30, 36] });
        LAMPS.forEach(([x, z]) => lamp(lg, cam, x, z, L, 'evening'));
        const env = (rg, mc, cl, box) => { skyFill(rg, mc, null, box, L); sunAt(rg, mc, L, { r: 12, k: 1.3, glow: 0.8 }); if (mc.front([0, 5, 0])) facadeFlat(rg, mc, A, L, 'evening'); };
        const all = parked('evening').concat([Object.assign({ type: 'hatch', paint: DCAR.paint, plateR: '#E9C9A4', dan: true }, DANIEL)]);
        all.filter(cr => cam.view([cr.x, 0.5, cr.z])[2] > 1.5).sort((a, b) => cam.view([b.x, 0, b.z])[2] - cam.view([a.x, 0, a.z])[2]).forEach(cr => {
          if (cr.dan) danielsCar(c, lg, cam, DANIEL, {}, L, 'evening', env, { tailRake: 8, reflectStrength: 1, upright: 0.7 });
          else drawCar(lg, cam, cr, { L, tod: 'evening', env, glassK: 1.35, upright: 0.7 }); });
        lg.save(); lg.globalCompositeOperation = 'soft-light'; lg.fillStyle = LC.lin(lg, 0, 0, W, 0, [[0, '#F2A65E', 0.35], [1, '#F2A65E', 0.06]]); lg.fillRect(0, 0, W, H); lg.restore();
      }), 0, 0);
    },
    front(c, t, s) {
      c.g.drawImage(cached(c, 'rows|front', fg => { fg.fillStyle = LC.lin(fg, 0, 860, 0, H, [[0, '#120D0E', 0], [1, '#120D0E', 0.55]]); fg.fillRect(0, 860, W, 220);
        fg.globalCompositeOperation = 'screen'; fg.fillStyle = LC.rad(fg, -260, 420, 0, 1300, [[0, '#F7A963', 0.3], [1, '#F7A963', 0]]); fg.fillRect(0, 0, W, H); }), 0, 0);
    },
    anchors: {}, light: { x: -400, y: 420, color: '#F7A963' },
  };

  // -------------------------------------------------------------------------------------
  // HEAT (Q10 24–28): his car's driver's door open toward us, its glass a copper mirror of the low sun behind us; a dense
  // wave of trapped heat pours out of the doorway and over the roof (refraction in the air against block B's blazing glass).
  // The rear of the car recedes, its glass copper too. s.door 0..1, s.heat 0..1, s.car (false: draw it with view.car)
  // -------------------------------------------------------------------------------------
  const HT = { cam: () => mkCam({ x: 5.9, y: 1.42, z: 16.6, yaw: deg(146), pitch: deg(-4), f: 1340 }) };
  const LH = withSun(LIGHT.evening, deg(292), deg(8), { _side: 1 });
  function heatEnv(rg, mc, cl, box) { skyFill(rg, mc, null, box, LH); sunAt(rg, mc, LH, { r: 16, k: 1.3, glow: 0.9 }); if (mc.front([0, 5, 0])) facadeFlat(rg, mc, A, LH, 'evening'); }
  const heat = {
    back(c, t, s) {
      s = s || {}; const g = c.g, L = LH;
      g.drawImage(cached(c, 'heat|back', lg => {
        const cam = HT.cam();
        skyFill(lg, cam, null, { x: 0, y: 0, w: W, h: H }, L);
        TREES.concat(NTREES).sort((a, b) => cam.view([b.x, 0, b.z])[2] - cam.view([a.x, 0, a.z])[2]).forEach(T => tree(lg, cam, T, L, false));
        facade(lg, cam, B, L, 'evening', { s0: 0, s1: 124, sunR: 20, reflK: 1 });
        ground(lg, cam, L, 'evening', { x0: 0, z: [-30, 36] });
        LAMPS.forEach(([x, z]) => lamp(lg, cam, x, z, L, 'evening'));
        parked('evening').filter(cr => cam.view([cr.x, 0.5, cr.z])[2] > 3).sort((a, b) => cam.view([b.x, 0, b.z])[2] - cam.view([a.x, 0, a.z])[2]).forEach(cr => drawCar(lg, cam, cr, { L, tod: 'evening', env: heatEnv, glassK: 1.35, upright: 0.7 }));
      }), 0, 0);
      if (s.car !== false) heat.car(c, t, s);
    },
    car(c, t, s) {
      s = s || {}; const cam = HT.cam(), d = s.door == null ? 1 : clamp(s.door, 0, 1);
      c.g.drawImage(cached(c, 'heat|car|' + Math.round(d * 20), cg => danielsCar(c, cg, cam, DANIEL, { door: d }, LH, 'evening', heatEnv, { tailRake: 8, reflectStrength: 1, upright: 0.7 })), 0, 0);
    },
    front(c, t, s) {
      s = s || {}; const k = s.heat == null ? 1 : s.heat;
      if (k > 0.01) { const a = heat.anchors.plume; shimmer(c, a.x - a.w / 2, a.y, a.w, a.h, t, k, 'heat'); }
      c.g.drawImage(cached(c, 'heat|front', fg => { fg.fillStyle = LC.lin(fg, 0, 850, 0, H, [[0, '#120D0E', 0], [1, '#120D0E', 0.55]]); fg.fillRect(0, 850, W, 230);
        fg.globalCompositeOperation = 'screen'; fg.fillStyle = LC.rad(fg, 2100, -100, 0, 1400, [[0, '#F7A963', 0.26], [1, '#F7A963', 0]]); fg.fillRect(0, 0, W, H); }), 0, 0);
    },
    anchors: {}, light: { x: 2200, y: -200, color: '#F7A963' },
  };
  // refraction shimmer over a box of what has been drawn so far: rows displaced by rising waves, feathered at the edges
  function shimmer(c, bx, by, bw, bh, t, k, seed) {
    const g = c.g, m = g.getTransform(), dx0 = Math.round(m.a * bx + m.e), dy0 = Math.round(m.d * by + m.f), dw = Math.round(bw * m.a), dh = Math.round(bh * m.d);
    if (dw < 4 || dh < 4) return;
    const src = scratch('cp-shim-src', dw, dh); src.drawImage(g.canvas, dx0, dy0, dw, dh, 0, 0, dw, dh);
    const out = scratch('cp-shim-out', dw, dh), step = 3;
    for (let y = 0; y < dh; y += step) { const u = y / dh, amp = k * (2.2 + 7 * (1 - u)) * (0.65 + 0.35 * Math.sin(u * 9 + t * 1.3));
      const off = amp * (Math.sin(y * 0.105 + t * 9.0) * 0.6 + Math.sin(y * 0.043 + t * 4.1 + 1.7) * 0.4);
      out.drawImage(src.canvas, 0, y, dw, step, off, y, dw, step); }
    out.globalCompositeOperation = 'destination-in';
    out.drawImage(cached(c, 'shimmask|' + seed + '|' + dw + 'x' + dh, mg => { mg.fillStyle = LC.rad(mg, dw / 2, dh * 0.72, 0, Math.max(dw, dh) * 0.55, [[0, '#000000', 1], [0.55, '#000000', 0.8], [1, '#000000', 0]]); mg.fillRect(0, 0, dw, dh); }, dw, dh), 0, 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(out.canvas, dx0, dy0);
    g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.18 * k; g.drawImage(out.canvas, dx0, dy0 - 2); g.restore();
  }

  // ---------- anchors ----------
  (() => {
    // the car set's model: z forward, x right; front door hinge at z 0.93, shut line at -0.05
    const carPt = (pose, x, z) => { const ch = Math.cos(pose.h), sh = Math.sin(pose.h); return [pose.x + x * ch + z * sh, 0, pose.z - x * sh + z * ch]; };
    const cs = SPC.cam(), an = carAnchor(cs, DANIEL), dd = cs.p(carPt(DANIEL, 1.25, 0.35)), wa = cs.p(carPt(DANIEL, 1.3, -3.4)), rw = cs.p([...carPt(DANIEL, 0, -1.9)].map((v, i) => i === 1 ? 1.15 : v));
    space.anchors = { car: an, driverDoor: { x: dd[0], y: dd[1], scale: cs.f / dd[2] }, walk: { from: [dd[0], dd[1]], to: [wa[0], wa[1]], scaleFrom: cs.f / dd[2], scaleTo: cs.f / wa[2], note: 'toward the camera and block A behind us' }, rearWindow: [rw[0], rw[1]] };
    const cd = DR.cam(), d0 = cd.p(-0.6, 0, 0.5), d1 = cd.p(-7.0, 0, -1.4), hg = cd.p(0.03, 1.2, DR.zh);
    door.anchors = { daniel: { from: [d0[0], d0[1]], to: [d1[0], d1[1]], scaleFrom: cd.f / d0[2], scaleTo: cd.f / d1[2], note: 'through the doorway, away from us into the lobby' }, hinge: [hg[0], hg[1]] };
    const cr = RWS.cam(), dA = carAnchor(cr, DANIEL), w0 = cr.p(13.4, 0, -4.0), w1 = cr.p(11.6, 0, 11.4);
    rows.anchors = { car: dA, path: { from: [w0[0], w0[1]], to: [w1[0], w1[1]], scaleFrom: cr.f / w0[2], scaleTo: cr.f / w1[2] } };
    const ch = HT.cam(), hA = carAnchor(ch, DANIEL), st = ch.p(carPt(DANIEL, 1.42, 0.25)), pl = ch.p([...carPt(DANIEL, 1.0, 0.4)].map((v, i) => i === 1 ? 1.25 : v)), pk = ch.f / ch.view(carPt(DANIEL, 1.0, 0.4))[2];
    heat.anchors = { car: hA, daniel: { x: st[0], y: st[1], scale: ch.f / st[2], note: 'at the open door, recoiling' }, plume: { x: pl[0], y: pl[1] - 1.3 * pk, w: 1.9 * pk, h: 1.7 * pk } };
    const cc = crossCam(0), vf = cc.p(CRS.carsX + 0.9 + CRS.d + CRS.behind, 0, cc.pos[2]);
    crossing.anchors = { reflection: { x: W / 2, y: vf[1], scale: CRS.f / (CRS.d * 2 + 0.9 + CRS.behind), note: 'his virtual image, walking with the camera' }, beltline: cc.p(CRS.carsX - 0.9, 1.0, cc.pos[2])[1], roofline: cc.p(CRS.carsX - 0.75, 1.45, cc.pos[2])[1] };
    const ca = arrivalCam(1), ke = ca.p(5.7, 0.13, ARR.eye[2]), en = ca.p(0, 1.2, 0);
    arrival.anchors = { kerb: [ke[0], ke[1]], entrance: [en[0], en[1]], facadeScale: ca.f / ARR.eye[0] };
  })();

  // =====================================================================================
  // THE SET
  // =====================================================================================
  const rigLight = (v) => ({ light: { x: v.light.x, y: v.light.y, color: v.light.color } });
  SETS.carpark = {
    views: { arrival, space, crossing, door, rows, heat },
    car: { danielsCar, anchor: carAnchor, pose: DANIEL, reflect: carReflect },
    demos: [
      { name: 'arrival: pulling in (pull 0.6)', draw(c, t) { const v = SETS.carpark.views.arrival; v.back(c, t, { pull: 0.6, engine: 1 }); v.front(c, t, {}); } },
      { name: 'arrival: stopped, 8:32', draw(c, t) { const v = SETS.carpark.views.arrival; v.back(c, t, { pull: 1 }); v.front(c, t, {}); } },
      { name: 'space: morning, the locks blink', draw(c, t) { const v = SETS.carpark.views.space, s = { tod: 'morning', blink: 1 }; v.back(c, t, s); const a = v.anchors.walk;
        person(c.g, 'daniel', { at: [lerp(a.from[0], a.to[0], 0.35), lerp(a.from[1], a.to[1], 0.35)], scale: lerp(a.scaleFrom, a.scaleTo, 0.35), view: 'three', facing: -1, body: 'walk', phase: 0.3, outfit: 'day' }, rigLight(v)); v.front(c, t, s); } },
      { name: 'crossing: his reflection in the windows', draw(c, t) { const v = SETS.carpark.views.crossing, tr = 3.2 + t * 1.6; v.back(c, t, { track: tr });
        v.front(c, t, { track: tr, reflect: (g, R) => person(g, 'daniel', { at: [R.x, R.y], scale: R.scale, view: 'profile', facing: R.facing, body: 'hurry', phase: t * 1.7 }, { light: R.light }) }); } },
      { name: 'door: sighing shut (half way)', draw(c, t) { const v = SETS.carpark.views.door, s = { door: 0.4 }; v.back(c, t, s); const a = v.anchors.daniel;
        person(c.g, 'daniel', { at: [lerp(a.from[0], a.to[0], 0.4), lerp(a.from[1], a.to[1], 0.4)], scale: lerp(a.scaleFrom, a.scaleTo, 0.4), view: 'back', body: 'walk', phase: 0.6 }, { light: { x: 900, y: -200, color: '#E3E9E3' }, ambient: '#7E9A9C', ambientK: 0.3 }); v.front(c, t, s); } },
      { name: 'door: shut', draw(c, t) { const v = SETS.carpark.views.door, s = { door: 0 }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'space: evening, his rear window a copper mirror', draw(c, t) { const v = SETS.carpark.views.space, s = { tod: 'evening' }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'rows: evening, down the aisle', draw(c, t) { const v = SETS.carpark.views.rows; v.back(c, t, {}); const a = v.anchors.path;
        person(c.g, 'daniel', { at: [lerp(a.from[0], a.to[0], 0.3), lerp(a.from[1], a.to[1], 0.3)], scale: lerp(a.scaleFrom, a.scaleTo, 0.3), view: 'back', body: 'walk', phase: 0.5 }, rigLight(v)); v.front(c, t, {}); } },
      { name: 'heat: the open door, the heat pouring out', draw(c, t) { const v = SETS.carpark.views.heat, s = { door: 1, heat: 1 }; v.back(c, t, s); const a = v.anchors.daniel;
        person(c.g, 'daniel', { at: [a.x, a.y], scale: a.scale, view: 'threeBack', facing: 1, body: 'stand', lean: -0.3 }, rigLight(v)); v.front(c, t, s); } },
    ],
  };
})();
