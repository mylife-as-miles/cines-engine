/* AUTOPILOT · set: CARPARK, the office car park (Q07 at 8:32 in the morning, Q10 at 5:40 in the evening)
   A business park of blue glass. Daniel's block (A) faces east across the rows of bays to a second block (B), so every
   pane in the car park has something to give back: the car windows hold the blocks and the sky, the blocks hold each
   other, the entrance door holds the car park. All glass is a planar mirror computed in true perspective (LC.camera),
   over a dark interior: in the evening every pane is copper and nothing can be seen through any of it.
   Views: arrival · space · crossing · door · rows · heat (documented in film/api/carpark.md).
   Daniel's car is SETS.car.exterior when the car set provides it; until then a placeholder with the same proportions
   (a small dark teal-grey five-door hatchback). Deterministic. Static layers are cached (keys 'carpark|...'). */
(function () {
  'use strict';
  const W = OTM.W, H = OTM.H, P = LC.P, TAU = Math.PI * 2;
  const { rgba, mix, clamp, lerp, rng, vnoise, fbm } = OTM;
  const deg = d => d * Math.PI / 180;

  // =====================================================================================
  // KIT: scratch canvases, vectors, a camera with rays and near clipping, planar mirrors
  // =====================================================================================
  const pool = {};
  function scratch(name, w, h) {
    w = w || W; h = h || H; let g = pool[name];
    if (!g || g.canvas.width !== w || g.canvas.height !== h) g = pool[name] = OTM.makeCanvas(w, h).getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, w, h); return g;
  }
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const dirAE = (az, el) => [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];   // compass azimuth (x east, z north)
  // camera: LC.camera plus world position, camera-space view(), screen projection of camera space, and rays
  function mkCam(o) {
    o = Object.assign({ cx: W / 2, cy: H / 2, yaw: 0, pitch: 0, roll: 0 }, o);
    const c = LC.camera(o), cyw = Math.cos(o.yaw), syw = Math.sin(o.yaw), cp = Math.cos(o.pitch), sp = Math.sin(o.pitch), cr = Math.cos(o.roll), sr = Math.sin(o.roll);
    c.pos = [o.x, o.y, o.z]; c.o = o;
    c.view = q => { const dx = q[0] - o.x, dy = q[1] - o.y, dz = q[2] - o.z; const x1 = dx * cyw - dz * syw, z1 = dx * syw + dz * cyw; const y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp; return [x1 * cr + y2 * sr, -x1 * sr + y2 * cr, z2]; };
    c.sp = v => [o.cx + o.f * v[0] / v[2], o.cy - o.f * v[1] / v[2], v[2]];
    c.ray = (sx, sy) => { const x3 = (sx - o.cx) / o.f, y3 = (o.cy - sy) / o.f; const x1 = cr * x3 - sr * y3, y2 = sr * x3 + cr * y3; const dy = cp * y2 + sp, z1 = -sp * y2 + cp; return nrm([cyw * x1 + syw * z1, dy, -syw * x1 + cyw * z1]); };
    return c;
  }
  // the same camera seeing the world in a plane mirror (o: a point on the glass, n: its outward normal)
  function mirrorCam(cam, o, n) {
    const refl = q => { const d = (q[0] - o[0]) * n[0] + (q[1] - o[1]) * n[1] + (q[2] - o[2]) * n[2]; return [q[0] - 2 * d * n[0], q[1] - 2 * d * n[1], q[2] - 2 * d * n[2]]; };
    const m = { f: cam.f, cx: cam.cx, cy: cam.cy, k: cam.k, o: cam.o, mirror: true, plane: { o, n }, pos: refl(cam.pos) };
    m.p = (x, y, z) => cam.p(refl(Array.isArray(x) ? x : [x, y, z]));
    m.view = q => cam.view(refl(q)); m.sp = cam.sp; m.pts = a => a.map(q => m.p(q));
    m.ray = (sx, sy) => { const d = cam.ray(sx, sy), k = 2 * dot(d, n); return [d[0] - k * n[0], d[1] - k * n[1], d[2] - k * n[2]]; };
    m.front = q => (q[0] - o[0]) * n[0] + (q[1] - o[1]) * n[1] + (q[2] - o[2]) * n[2] > 0;    // only what stands before the glass is in it
    return m;
  }
  function clipNear(vs, zn) {
    const out = [];
    for (let i = 0; i < vs.length; i++) { const a = vs[i], b = vs[(i + 1) % vs.length], ia = a[2] > zn, ib = b[2] > zn; if (ia) out.push(a); if (ia !== ib) { const t = (zn - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, zn]); } }
    return out;
  }
  // a world polygon as a screen path (clipped at the near plane)
  function path3(cam, pts, open) {
    const vs = clipNear(pts.map(cam.view), 0.06), p = new Path2D();
    vs.forEach((v, i) => { const s = cam.sp(v); if (i) p.lineTo(s[0], s[1]); else p.moveTo(s[0], s[1]); }); if (vs.length && !open) p.closePath(); return p;
  }
  function fill3(g, cam, pts, style, alpha) { g.save(); if (alpha != null) g.globalAlpha = alpha; g.fillStyle = style; g.fill(path3(cam, pts)); g.restore(); }
  function line3(g, cam, a, b, style, w) { const va = cam.view(a), vb = cam.view(b); if (va[2] < 0.06 && vb[2] < 0.06) return; const s = clipNear([va, vb, vb], 0.06); const p0 = cam.sp(s[0]), p1 = cam.sp(s[1] || s[0]); g.strokeStyle = style; g.lineWidth = w; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
  function bboxOf(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
  function newell(pts) { let nx = 0, ny = 0, nz = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); } return nrm([nx, ny, nz]); }
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
    p.forEach(q => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  // a cached layer (full frame by default); everything in this set is keyed 'carpark|...'
  const cached = (c, key, fn, w, h) => c.cache('carpark|' + key, fn, w, h);
  const quarter = (c, key, fn) => c.cache('carpark|' + key, (g, cv) => { g.scale(0.25, 0.25); fn(g, cv); }, W / 4, H / 4);   // emissive layers

  // =====================================================================================
  // LIGHT: morning (8:32, the heat already up, the sun in the east) and evening (5:40, the low copper sun in the west)
  // =====================================================================================
  const LIGHT = {
    morning: { az: deg(112), el: deg(30), sunC: '#FFF3DC', rim: '#FFE9C4', glow: '#FFF6E6',
      sky: [[-1.6, '#6C6B66'], [-0.02, '#8D8B84'], [0, '#F2ECDC'], [0.08, '#E6E6DC'], [0.3, '#C8D3CF'], [0.75, '#A8B9BA'], [1.6, '#97AAAE']],
      paintSky: '#D9E0DA', paintSun: '#FFF3DC', shade: 0.46, glassTint: '#9FBAC0', interior: '#0B1416',
      tar: ['#A39F96', '#8C8880', '#5E5C57'], line: '#ECE8DC', hedge: ['#4E6658', '#3A4F45', '#24332D'], tree: ['#5B766A', '#435C51', '#2A3B34'] },
    evening: { az: deg(296), el: deg(11), sunC: '#F7A963', rim: '#FFB877', glow: '#FFD49A',
      sky: [[-1.6, '#2B2427'], [-0.02, '#46363A'], [0, '#F0B07A'], [0.07, '#D79E80'], [0.25, '#A28B92'], [0.7, '#6E7389'], [1.6, '#5A6178']],
      paintSky: '#9C93A2', paintSun: '#F5A764', shade: 0.6, glassTint: '#C98858', interior: '#120D0E',
      tar: ['#B3805C', '#7E5D4B', '#3A2F31'], line: '#EAC29C', hedge: ['#6D5A3C', '#3E3A30', '#22231F'], tree: ['#7A6A45', '#4A4835', '#262A24'] },
  };
  function sunDir(L, o) { return dirAE(o && o.az != null ? o.az : L.az, o && o.el != null ? o.el : L.el); }
  function stopsAt(st, e) { if (e <= st[0][0]) return st[0][1]; for (let i = 1; i < st.length; i++) if (e <= st[i][0]) { const a = st[i - 1], b = st[i]; return mix(a[1], b[1], (e - a[0]) / (b[0] - a[0])); } return st[st.length - 1][1]; }
  // the sky (and the ground, below the horizon) seen along any camera's rays, filled into a clip: works for mirrors too
  function skyFill(g, cam, clip, box, L) {
    const el = (x, y) => Math.asin(clamp(cam.ray(x, y)[1], -1, 1));
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2, e0 = el(cx, cy), ex = el(cx + 24, cy) - e0, ey = el(cx, cy + 24) - e0;
    const len = Math.hypot(ex, ey) || 1e-9, ux = ex / len, uy = ey / len;
    const pr = [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]].map(([x, y]) => (x - cx) * ux + (y - cy) * uy);
    const s0 = Math.min(...pr) - 2, s1 = Math.max(...pr) + 2, p0 = [cx + ux * s0, cy + uy * s0], p1 = [cx + ux * s1, cy + uy * s1];
    const gr = g.createLinearGradient(p0[0], p0[1], p1[0], p1[1]); let prev = null;
    for (let i = 0; i <= 28; i++) { const t = i / 28, e = el(lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t));
      if (prev != null && prev < 0 !== e < 0) { const tz = t - 1 / 28 * (e / (e - prev)); gr.addColorStop(clamp(tz - 0.0005, 0, 1), stopsAt(L.sky, -0.021)); gr.addColorStop(clamp(tz + 0.0005, 0, 1), stopsAt(L.sky, 0.001)); }
      gr.addColorStop(t, stopsAt(L.sky, e)); prev = e; }
    g.save(); if (clip) g.clip(clip); g.fillStyle = gr; g.fillRect(box.x - 1, box.y - 1, box.w + 2, box.h + 2); g.restore();
  }
  // the sun (or its reflection): a hot disc in posterised rings, and the glow it lays on the air
  function sunAt(g, cam, L, o) {
    o = o || {}; const d = sunDir(L, o.sun); if (cam.mirror && dot(d, cam.plane.n) <= 0) return null;
    const ref = cam.mirror ? cam.plane.o : cam.pos, s = cam.p(add(ref, mul(d, 5000))); if (s[2] <= 0) return null;
    const r = o.r || 26, k = o.k == null ? 1 : o.k;
    g.save(); if (o.clip) g.clip(o.clip); g.globalCompositeOperation = 'screen';
    g.fillStyle = LC.rad(g, s[0], s[1], 0, r * 26, [[0, L.glow, 0.55 * k], [0.12, L.glow, 0.22 * k], [0.4, L.glow, 0.07 * k], [1, L.glow, 0]]); g.fillRect(s[0] - r * 26, s[1] - r * 26, r * 52, r * 52);
    [[r * 9, 0.06], [r * 5.4, 0.08], [r * 3.1, 0.12], [r * 1.9, 0.2]].forEach(([rr, a]) => { g.fillStyle = rgba(L.glow, a * k); g.beginPath(); g.arc(s[0], s[1], rr, 0, TAU); g.fill(); });
    g.globalCompositeOperation = 'source-over'; g.fillStyle = rgba(P.sunWhite, Math.min(1, k)); g.beginPath(); g.arc(s[0], s[1], r, 0, TAU); g.fill();
    g.restore(); return s;
  }

  // =====================================================================================
  // THE WORLD: two blocks of glass, the rows of bays, the hedges and trees, the lamp posts, the parked cars
  // =====================================================================================
  const A = { o: [0, 0, -46], a: [0, 0, 1], n: [1, 0, 0], w: 84, h: 14.6, floors: 4, bay: 1.5, name: 'A' };     // Daniel's block, facing east
  const B = { o: [62, 0, 64], a: [0, 0, -1], n: [-1, 0, 0], w: 124, h: 14.6, floors: 4, bay: 1.8, name: 'B' };  // the block across the car park, facing west
  const ENTRANCE = { z0: -1.6, z1: 1.6, top: 2.6 };                                                              // the glass doors of A
  const ROWS = [ // bays: x0..x1 (depth), heading of the cars parked in it (compass), z range
    { x0: 6.0, x1: 10.8, h: deg(270), z0: -30, z1: 36, row: 1 },
    { x0: 16.8, x1: 21.6, h: deg(270), z0: -30, z1: 36, row: 2 },
    { x0: 21.6, x1: 26.4, h: deg(90), z0: -30, z1: 36, row: 3 },
    { x0: 32.4, x1: 37.2, h: deg(90), z0: -30, z1: 36, row: 4 },
  ];
  const DANIEL = { x: 8.45, z: 12.0, h: deg(270) };      // his usual space: row 1, nose to block A
  const BAYW = 2.4;
  const PAINTS = ['#A6ACAC', '#D2D3CD', '#1C1F20', '#2B3446', '#55302D', '#676C6D', '#58697A', '#4E5A50', '#8E8678', '#3E4A55', '#C9CBC4', '#2F3233'];
  const TYPES = ['hatch', 'hatch', 'hatch', 'saloon', 'estate', 'suv', 'hatch', 'suv', 'saloon'];
  function parked(tod) {
    const out = [], R = rng('carpark-bays-' + tod), fill = tod === 'evening' ? 0.42 : 0.8;
    ROWS.forEach(rw => {
      for (let z = rw.z0 + BAYW / 2; z < rw.z1; z += BAYW) {
        if (rw.row === 1 && Math.abs(z) < 4.2) continue;                                   // the walkway to the entrance
        const isD = rw.row === 1 && Math.abs(z - DANIEL.z) < 0.5; const r = R(), r2 = R(), r3 = R(), r4 = R();
        if (isD) continue;
        if (r > fill && !(rw.row === 1 && Math.abs(z - DANIEL.z) < 3)) continue;           // his neighbours are always there
        const type = TYPES[Math.floor(r2 * TYPES.length)], B0 = BODIES[type];
        const x = (rw.x0 + rw.x1) / 2 + (rw.h === deg(270) ? -1 : 1) * (2.4 - B0.L / 2 - 0.2) + (r4 - 0.5) * 0.3;
        out.push({ x, z: z + (r3 - 0.5) * 0.35, h: rw.h + (r4 - 0.5) * 0.04, type, paint: PAINTS[Math.floor(r3 * PAINTS.length)], seed: 'car' + Math.round(z * 10) + rw.row });
      }
    });
    return out;
  }
  const TREES = (() => { const out = [], R = rng('carpark-trees'); for (let z = -44; z < 70; z += 8.5) out.push({ x: 44 + (R() - 0.5) * 2, z: z + (R() - 0.5) * 2, r: 3.0 + R() * 1.2, h: 3.0 + R() * 0.8, seed: z }); return out; })();
  const LAMPS = [[13.8, -8], [13.8, 18], [29.4, -12], [29.4, 14], [29.4, 40], [13.8, 44]];

  // ---------- facades: a curtain wall of blue glass; every panel gives back what stands before it, each a touch out of true ----------
  function facadePt(F, s, t) { return [F.o[0] + F.a[0] * s, t, F.o[2] + F.a[2] * s]; }
  // what a block's glass reflects (drawn through a mirror camera)
  function reflectScene(g, mc, L, tod, o) {
    o = o || {};
    const box = o.box || { x: 0, y: 0, w: W, h: H };
    skyFill(g, mc, o.clip, box, L);
    g.save(); if (o.clip) g.clip(o.clip);
    sunAt(g, mc, L, { r: o.sunR || 22, k: o.sunK == null ? 1 : o.sunK, sun: o.sun });
    // the other block, and the trees and hedges between
    [A, B].forEach(F => { if (mc.front(facadePt(F, F.w / 2, 4))) facadeFlat(g, mc, F, L, tod); });
    TREES.forEach(T => { if (mc.front([T.x, 0, T.z])) tree(g, mc, T, L, true); });
    if (o.cars !== false) (o.carList || []).forEach(cr => { if (mc.front([cr.x, 0.7, cr.z])) carBlob(g, mc, cr, L); });
    g.restore();
  }
  // a block seen small or in a reflection: glass in bands, spandrels, the roof edge
  function facadeFlat(g, cam, F, L, tod) {
    const tint = tod === 'evening' ? (F.name === 'B' ? '#C97E4E' : '#4A4650') : (F.name === 'B' ? '#6E8790' : '#B9C9C8');
    const spand = tod === 'evening' ? (F.name === 'B' ? '#8A5A3E' : '#2E2C33') : (F.name === 'B' ? '#46575C' : '#8B9796');
    fill3(g, cam, [facadePt(F, 0, 0), facadePt(F, F.w, 0), facadePt(F, F.w, F.h + 0.8), facadePt(F, 0, F.h + 0.8)], tint);
    for (let j = 1; j <= F.floors; j++) { const t = j * 3.6; fill3(g, cam, [facadePt(F, 0, t - 0.5), facadePt(F, F.w, t - 0.5), facadePt(F, F.w, t + 0.4), facadePt(F, 0, t + 0.4)], spand); }
    fill3(g, cam, [facadePt(F, 0, 0), facadePt(F, F.w, 0), facadePt(F, F.w, 0.5), facadePt(F, 0, 0.5)], spand);
  }
  // a block close: per-panel reflections (each pane slightly out of true), mullions, spandrels, the soffit and roof edge
  function facade(g, cam, F, L, tod, o) {
    o = o || {}; const n = F.n; if (dot(n, sub(cam.pos, facadePt(F, F.w / 2, 4))) <= 0) return;
    const mc = mirrorCam(cam, facadePt(F, 0, 0), n);
    const outline = path3(cam, [facadePt(F, 0, 0), facadePt(F, F.w, 0), facadePt(F, F.w, F.h + 0.9), facadePt(F, 0, F.h + 0.9)]);
    // 1. the reflection (one render), then laid into each pane with its own small error
    const rf = scratch('cp-facade'); reflectScene(rf, mc, L, tod, { carList: o.carList, sunR: o.sunR, sunK: o.sunK, sun: o.sun });
    const tintC = tod === 'evening' ? '#7E7690' : '#8FB0BA';                  // the blue of the glass
    rf.save(); rf.globalCompositeOperation = 'multiply'; rf.fillStyle = tintC; rf.fillRect(0, 0, W, H); rf.restore();
    g.save(); g.clip(outline); g.fillStyle = tod === 'evening' ? '#141418' : '#22343A'; g.fillRect(0, 0, W, H); g.restore();
    const R = rng('panes' + F.name + tod), bay = F.bay;
    const sMin = o.s0 == null ? 0 : o.s0, sMax = o.s1 == null ? F.w : o.s1;
    for (let j = 0; j < F.floors; j++) {
      const t0 = j === 0 ? 0.35 : j * 3.6 + 0.4, t1 = (j + 1) * 3.6 - 0.5;
      for (let s = Math.floor(sMin / bay) * bay; s < sMax; s += bay) {
        if (o.skip && o.skip(s, j)) continue;
        const q = [facadePt(F, s, t0), facadePt(F, s + bay, t0), facadePt(F, s + bay, t1), facadePt(F, s, t1)];
        const pp = path3(cam, q), dx = (R() - 0.5) * 5, dy = (R() - 0.5) * 6, a = 0.82 + R() * 0.18;
        g.save(); g.clip(pp); g.globalAlpha = a; g.drawImage(rf.canvas, dx, dy); g.restore();
        if (R() < 0.18) { g.save(); g.clip(pp); g.fillStyle = 'rgba(8,14,16,0.16)'; g.fill(pp); g.restore(); }   // a blind lowered behind this one
      }
    }
    // 2. spandrels at every floor, the plinth, the parapet
    const spC = tod === 'evening' ? ['#3A3440', '#26232C'] : ['#9AA6A4', '#6F7C7B'];
    for (let j = 1; j <= F.floors; j++) { const t = j * 3.6; fill3(g, cam, [facadePt(F, sMin, t - 0.5), facadePt(F, sMax, t - 0.5), facadePt(F, sMax, t + 0.4), facadePt(F, sMin, t + 0.4)], j === F.floors ? spC[0] : spC[1]); }
    fill3(g, cam, [facadePt(F, sMin, F.h - 0.2), facadePt(F, sMax, F.h - 0.2), facadePt(F, sMax, F.h + 0.9), facadePt(F, sMin, F.h + 0.9)], spC[0]);
    fill3(g, cam, [facadePt(F, sMin, 0), facadePt(F, sMax, 0), facadePt(F, sMax, 0.35), facadePt(F, sMin, 0.35)], tod === 'evening' ? '#1C1A1F' : '#55605F');
    // 3. mullions: the vertical fins catch the light on one edge
    const mull = tod === 'evening' ? ['#4A4250', '#1E1C22'] : ['#D8DEDA', '#7D8A88'];
    for (let s = Math.ceil(sMin / bay) * bay; s <= sMax; s += bay) {
      const a0 = facadePt(F, s, 0), a1 = facadePt(F, s, F.h - 0.2), k = cam.k(Math.max(0.5, cam.view(a0)[2]));
      line3(g, cam, a0, a1, mull[1], Math.max(1, 0.06 * k)); line3(g, cam, add(a0, mul(F.a, 0.03)), add(a1, mul(F.a, 0.03)), mull[0], Math.max(0.8, 0.025 * k));
    }
    for (let j = 1; j < F.floors; j++) { const t = j * 3.6 - 0.5; line3(g, cam, facadePt(F, sMin, t), facadePt(F, sMax, t), mull[0], 1.2); }
  }

  // ---------- trees, hedges, lamp posts ----------
  function tree(g, cam, T, L, flat) {
    const base = cam.p(T.x, 0, T.z); if (base[2] <= 0.3) return; const k = cam.f / base[2];
    const top = cam.p(T.x, T.h + T.r * 0.9, T.z), R = rng('tree' + T.seed), pts = [];
    const cx = top[0], cy = top[1], rr = T.r * k;
    for (let a = 0; a < 30; a++) { const t = a / 30 * TAU, n = 0.78 + 0.34 * vnoise(Math.cos(t) * 1.7 + T.seed, Math.sin(t) * 1.7, 5); pts.push([cx + Math.cos(t) * rr * n, cy + Math.sin(t) * rr * n * 0.92]); }
    const crown = LC.pathPts(pts);
    g.fillStyle = L.tree[2]; g.fillRect(base[0] - 0.12 * k, top[1], 0.24 * k, base[1] - top[1]);
    if (!flat) { g.save(); g.translate(-L.sunSide * 0.06 * rr || 0, 0); g.fillStyle = L.tree[0]; g.fill(crown); g.restore(); }
    g.fillStyle = flat ? L.tree[1] : L.tree[1]; g.save(); if (!flat) g.translate((L.sunSide || 0) * 0.08 * rr, 0.06 * rr); g.fill(crown); g.restore();
    if (!flat) { g.save(); g.clip(crown); g.fillStyle = rgba(L.tree[2], 0.5); g.beginPath(); g.ellipse(cx + (L.sunSide || 0) * 0.3 * rr, cy + 0.35 * rr, rr * 0.9, rr * 0.55, 0, 0, TAU); g.fill(); g.restore(); }
  }
  function lamp(g, cam, x, z, L, tod) {
    const b = cam.p(x, 0, z), t = cam.p(x, 7.6, z); if (b[2] <= 0.3) return; const k = cam.f / b[2];
    g.fillStyle = tod === 'evening' ? '#2A2629' : '#5D6766'; g.fillRect(b[0] - 0.06 * k, t[1], 0.12 * k, b[1] - t[1]);
    const hd = cam.p(x + 0.5, 7.6, z); g.fillRect(Math.min(t[0], hd[0]) - 0.1 * k, t[1] - 0.08 * k, Math.abs(hd[0] - t[0]) + 0.6 * k, 0.14 * k);
    g.fillStyle = rgba(L.rim, tod === 'evening' ? 0.75 : 0.5); g.fillRect(b[0] + (L.sunSide || 1) * 0.03 * k - 0.01 * k, t[1], Math.max(1, 0.025 * k), b[1] - t[1]);
  }

  // =====================================================================================
  // THE CAR: a lofted body in true perspective. Daniel's (placeholder) and every parked car.
  // =====================================================================================
  // spine: the top contour from the front bumper's foot to the rear's (u forward, v up, metres);
  // ws / rf / rr / rw: indices of the windscreen base, roof front, roof rear, rear-window base
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
  const DCAR = { type: 'hatch', paint: '#33464B', plateR: '#E6E0C6' };     // Daniel's: a small dark teal-grey five-door hatch
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
  BODIES.hatch.faces = bodyFaces(BODIES.hatch); BODIES.saloon.faces = bodyFaces(BODIES.saloon); BODIES.estate.faces = bodyFaces(BODIES.estate); BODIES.suv.faces = bodyFaces(BODIES.suv);
  // glasshouse side parametrised: a (0 front .. 1 rear), s (0 beltline .. 1 roof)
  function gh(Bd, sg, a, s) {
    const S = Bd.spine, hw = Bd.Wd / 2, b0 = S[Bd.ws], b1 = S[Bd.rw], t0 = S[Bd.rf], t1 = S[Bd.rr];
    const bu = lerp(b0[0], b1[0], a), bv = lerp(b0[1], b1[1], a), tu = lerp(t0[0], t1[0], a), tv = lerp(t0[1], t1[1], a);
    return [lerp(bu, tu, s), lerp(bv, tv, s), sg * lerp(hw - 0.03, hw - Bd.tumble, s)];
  }
  function beltAt(Bd, u) { const S = Bd.spine, b0 = S[Bd.ws], b1 = S[Bd.rw]; return lerp(b0[1], b1[1], clamp((u - b0[0]) / (b1[0] - b0[0]), 0, 1)); }

  // a car in the world. cr: {x, z, h, type, paint, seed, door (0..1 driver's door open), blink (0..1), plate}
  // o: {L (light), tod, env(g, mirrorCam, clip, box) for its glass, glassK (how much the glass gives back), detail}
  function drawCar(g, cam, cr, o) {
    const Bd = BODIES[cr.type || 'hatch'], fr = carFrame(cr), L = o.L, sun = sunDir(L, o.sun), camL = fr.loc(cam.pos), hw = Bd.Wd / 2;
    const Wp = q => fr.w(q[0], q[1], q[2]);
    const base = cr.paint;
    const tone = (nL, part) => {           // three values for paint: lit, sky, shade; glossy tops take the sky
      const nW = nrm(add(add(mul(fr.F, nL[0]), [0, nL[1], 0]), mul(fr.R, nL[2]))), d = dot(nW, sun);
      let c = d > 0.28 ? mix(base, L.paintSun, 0.28 + 0.2 * d) : d > -0.02 ? mix(base, L.paintSky, 0.16) : mix(base, '#000000', L.shade);
      if (nW[1] > 0.55) c = mix(c, L.paintSky, 0.34);
      return c;
    };
    // shadow on the ground: the footprint and the roof pushed along the sun
    { const pts = []; const lift = q => { const h = q[1]; return [q[0] - sun[0] / sun[1] * h, q[2] - sun[2] / sun[1] * h]; };
      [[Bd.spine[0][0], 0, hw + 0.04], [Bd.spine[0][0], 0, -hw - 0.04], [Bd.spine[Bd.spine.length - 1][0], 0, hw + 0.04], [Bd.spine[Bd.spine.length - 1][0], 0, -hw - 0.04]].forEach(q => { const w = Wp(q); pts.push([w[0], w[2]]); });
      if (sun[1] > 0.05) [[Bd.spine[Bd.rf][0], Bd.spine[Bd.rf][1], hw - Bd.tumble], [Bd.spine[Bd.rf][0], Bd.spine[Bd.rf][1], -hw + Bd.tumble], [Bd.spine[Bd.rr][0], Bd.spine[Bd.rr][1], hw - Bd.tumble], [Bd.spine[Bd.rr][0], Bd.spine[Bd.rr][1], -hw + Bd.tumble], [Bd.spine[2][0], Bd.spine[2][1], hw], [Bd.spine[2][0], Bd.spine[2][1], -hw]].forEach(q => pts.push(lift(Wp(q))));
      const hh = hull(pts); fill3(g, cam, hh.map(p => [p[0], 0.005, p[1]]), rgba(o.tod === 'evening' ? '#140F12' : '#1A2224', 0.62));
      const fp = [[Bd.spine[0][0] - 0.2, 0, hw - 0.1], [Bd.spine[0][0] - 0.2, 0, -hw + 0.1], [Bd.spine[Bd.spine.length - 1][0] + 0.2, 0, -hw + 0.1], [Bd.spine[Bd.spine.length - 1][0] + 0.2, 0, hw - 0.1]].map(Wp);
      fill3(g, cam, fp.map(p => [p[0], 0.006, p[2]]), rgba('#060909', 0.8)); }
    // wheels: the far pair first
    const wheel = (u, sg, near) => {
      const pts = [], wv = sg * (hw - (near ? 0.04 : 0.1)); for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; pts.push(Wp([u + Math.cos(a) * Bd.r, Bd.r + Math.sin(a) * Bd.r, wv])); }
      fill3(g, cam, pts, '#121515');
      if (near) { const rim = []; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; rim.push(Wp([u + Math.cos(a) * Bd.r * 0.62, Bd.r + Math.sin(a) * Bd.r * 0.62, wv + sg * 0.01])); }
        fill3(g, cam, rim, o.tod === 'evening' ? '#5A4A44' : '#8E9593'); const hub = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; hub.push(Wp([u + Math.cos(a) * Bd.r * 0.2, Bd.r + Math.sin(a) * Bd.r * 0.2, wv + sg * 0.015])); } fill3(g, cam, hub, '#2A2E2E');
        const sl = Wp([u + Bd.r * 0.45, Bd.r + Bd.r * 0.42, wv + sg * 0.012]), sl2 = Wp([u - Bd.r * 0.1, Bd.r + Bd.r * 0.6, wv + sg * 0.012]); line3(g, cam, sl, sl2, rgba(L.rim, 0.5), 1.4); }
    };
    const nearSg = camL[2] > 0 ? 1 : -1;
    Bd.ax.forEach(u => wheel(u, -nearSg, false));
    // faces, far to near, backs culled
    const faces = Bd.faces.filter(f => dot(f.n, sub(camL, f.c)) > 0).map(f => ({ f, d: cam.view(Wp(f.c))[2] })).sort((a, b) => b.d - a.d);
    const door = cr.door || 0;
    faces.forEach(({ f }) => {
      const ptsW = f.pts.map(Wp);
      if (f.glass) { glassPane(g, cam, ptsW, f, o, fr, Bd); return; }
      const col = tone(f.n, f.part); const pp = path3(cam, ptsW);
      g.fillStyle = col; g.fill(pp);
      if (f.part === 'side') sideDetail(g, cam, Bd, f.sg, Wp, col, o, cr);
      if (f.part === 'rearface' || (f.part === 'top' && f.i === Bd.spine.length - 3)) rearDetail(g, cam, Bd, Wp, f, o, cr);
      if (f.part === 'frontface' || f.i === 1) frontDetail(g, cam, Bd, Wp, f, o, cr);
    });
    // pillars and trims over the side glass that faces us
    if (true) { const sg = nearSg; const P4 = (a0, a1) => [gh(Bd, sg, a0, 0), gh(Bd, sg, a1, 0), gh(Bd, sg, a1, 1), gh(Bd, sg, a0, 1)].map(Wp);
      const dk = mix(base, '#000000', 0.55);
      fill3(g, cam, P4(0, 0.045), dk); fill3(g, cam, P4(Bd.pB - 0.02, Bd.pB + 0.025), '#0E1112');
      fill3(g, cam, [gh(Bd, sg, Bd.pC, 0), gh(Bd, sg, 1, 0), gh(Bd, sg, 1, 1), gh(Bd, sg, Bd.pC + 0.06, 1)].map(Wp), tone([0, 0.25, sg], 'side'));
      const top = [gh(Bd, sg, 0, 1), gh(Bd, sg, 1, 1)].map(Wp); line3(g, cam, top[0], top[1], '#0C0F10', Math.max(1.2, 0.03 * cam.k(Math.max(0.5, cam.view(top[0])[2]))));
      const bl = [gh(Bd, sg, 0, 0), gh(Bd, sg, 1, 0)].map(Wp); line3(g, cam, bl[0], bl[1], '#0A0C0D', Math.max(1.2, 0.035 * cam.k(Math.max(0.5, cam.view(bl[0])[2]))));
      // the roof edge catches the light
      if (dot(sun, [0, 1, 0]) > 0) line3(g, cam, add(top[0], [0, 0.012, 0]), add(top[1], [0, 0.012, 0]), rgba(L.rim, 0.55), 1.5); }
    Bd.ax.forEach(u => wheel(u, nearSg, true));
    // wing mirrors
    for (const sg of [1, -1]) { if (sg !== nearSg) continue; const m0 = Bd.spine[Bd.ws][0] - 0.12, mv = Bd.spine[Bd.ws][1] + 0.06;
      fill3(g, cam, [[m0, mv, sg * hw], [m0, mv, sg * (hw + 0.2)], [m0 - 0.16, mv + 0.02, sg * (hw + 0.2)], [m0 - 0.2, mv + 0.13, sg * (hw + 0.16)], [m0 - 0.02, mv + 0.14, sg * hw]].map(Wp), tone([0.2, 0.3, sg], 'side')); }
    // the open driver's door (right side, hinged at the front), drawn last: it stands out toward us
    if (door > 0.01) openDoor(g, cam, Bd, fr, cr, o, tone);
  }
  function sideDetail(g, cam, Bd, sg, Wp, col, o, cr) {
    const L = o.L, hw = Bd.Wd / 2, S = Bd.spine, k = cam.k(Math.max(0.5, cam.view(Wp([0, 0.6, sg * hw]))[2]));
    // the horizon laid along the paint: the upper flank gives back the sky, the lower the ground
    const ey = clamp(cam.pos[1] * 0.55 + 0.25, 0.5, 0.9), side = [];
    for (let i = 0; i <= Bd.ws; i++) side.push([S[i][0], S[i][1], sg * hw]); for (let i = Bd.rw; i < S.length; i++) side.push([S[i][0], S[i][1], sg * hw]);
    g.save(); g.clip(path3(cam, side.map(Wp)));
    fill3(g, cam, [[3, ey, sg * hw], [-3, ey, sg * hw], [-3, 2, sg * hw], [3, 2, sg * hw]].map(Wp), mix(col, L.paintSky, 0.16));
    fill3(g, cam, [[3, 0, sg * hw], [-3, 0, sg * hw], [-3, 0.42, sg * hw], [3, 0.42, sg * hw]].map(Wp), rgba('#000000', 0.22));
    // door shut lines and handles
    const uB = lerp(S[Bd.ws][0], S[Bd.rw][0], Bd.pB), uA = S[Bd.ws][0] + 0.05, uC = lerp(S[Bd.ws][0], S[Bd.rw][0], Bd.pC) + 0.05;
    [uA, uB, uC].forEach(u => line3(g, cam, Wp([u, 0.34, sg * hw]), Wp([u, beltAt(Bd, u) - 0.02, sg * hw]), rgba('#000000', 0.45), Math.max(1, 0.012 * k)));
    [uB + 0.18, uC + 0.12].forEach(u => fill3(g, cam, [[u, 0.86, sg * hw], [u - 0.17, 0.86, sg * hw], [u - 0.17, 0.9, sg * hw], [u, 0.9, sg * hw]].map(Wp), rgba('#000000', 0.5)));
    // wheel arches
    Bd.ax.forEach(u => { const pts = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * i / 14; pts.push(Wp([u + Math.cos(a) * (Bd.r + 0.05), Bd.r + Math.sin(a) * (Bd.r + 0.06), sg * hw])); } pts.push(Wp([u - Bd.r - 0.05, 0.2, sg * hw]), Wp([u + Bd.r + 0.05, 0.2, sg * hw])); fill3(g, cam, pts, '#0A0C0C'); });
    g.restore();
    // the shoulder line takes the light along its top
    line3(g, cam, Wp([S[Bd.ws][0], S[Bd.ws][1] - 0.01, sg * hw]), Wp([S[Bd.rw][0], S[Bd.rw][1] - 0.01, sg * hw]), rgba(L.rim, 0.3), 1.2);
  }
  function rearDetail(g, cam, Bd, Wp, f, o, cr) {
    const L = o.L, hw = Bd.Wd / 2, S = Bd.spine, n = S.length, a = S[n - 3], b = S[n - 2], c = S[n - 1];
    if (f.part !== 'rearface' && f.i !== n - 3) return;
    const P2 = (t, w) => { const u = lerp(a[0], b[0], t), v = lerp(a[1], b[1], t); return Wp([u, v, w]); };
    if (f.i === n - 3) {
      // tail lamps at the corners, wrapping a little; the indicators blink amber
      const blink = cr.blink || 0;
      for (const sg of [1, -1]) {
        fill3(g, cam, [P2(0.05, sg * (hw - 0.02)), P2(0.05, sg * (hw - 0.36)), P2(0.42, sg * (hw - 0.36)), P2(0.42, sg * (hw - 0.02))], '#4A1C1C');
        fill3(g, cam, [P2(0.08, sg * (hw - 0.05)), P2(0.08, sg * (hw - 0.33)), P2(0.2, sg * (hw - 0.33)), P2(0.2, sg * (hw - 0.05))], blink > 0 ? mix('#5E3A22', '#FFC27A', blink) : '#5E3A22');
        fill3(g, cam, [P2(0.05, sg * (hw - 0.02)), P2(0.05, sg * (hw - 0.36)), P2(0.08, sg * (hw - 0.36)), P2(0.08, sg * (hw - 0.02))], rgba(L.rim, 0.35));
      }
      // the number plate (a UK rear plate, bleached to cream in this light) and the badge
      fill3(g, cam, [P2(0.32, -0.26), P2(0.32, 0.26), P2(0.6, 0.26), P2(0.6, -0.26)], '#1A1D1E');
      fill3(g, cam, [P2(0.35, -0.24), P2(0.35, 0.24), P2(0.57, 0.24), P2(0.57, -0.24)], cr.plateR || '#E2DCC4');
      for (let i = 0; i < 7; i++) { const w0 = -0.2 + i * 0.058 + (i > 3 ? 0.03 : 0); fill3(g, cam, [P2(0.4, w0), P2(0.4, w0 + 0.035), P2(0.52, w0 + 0.035), P2(0.52, w0)], 'rgba(30,30,30,0.6)'); }
    }
    if (f.part === 'rearface') { const Q = (t, w) => Wp([lerp(b[0], c[0], t), lerp(b[1], c[1], t), w]); fill3(g, cam, [Q(0.55, -hw + 0.1), Q(0.55, hw - 0.1), Q(1, hw - 0.1), Q(1, -hw + 0.1)], 'rgba(0,0,0,0.35)'); line3(g, cam, Q(0.12, -hw + 0.05), Q(0.12, hw - 0.05), rgba(L.rim, 0.25), 1); }
  }
  function frontDetail(g, cam, Bd, Wp, f, o, cr) {
    const L = o.L, hw = Bd.Wd / 2, S = Bd.spine;
    if (f.i === 1) { const P2 = (t, w) => Wp([lerp(S[1][0], S[2][0], t), lerp(S[1][1], S[2][1], t), w]);
      for (const sg of [1, -1]) fill3(g, cam, [P2(0.1, sg * (hw - 0.04)), P2(0.1, sg * (hw - 0.42)), P2(0.85, sg * (hw - 0.38)), P2(0.85, sg * (hw - 0.06))], o.tod === 'evening' ? '#8A6A58' : '#C9D0CC');
      fill3(g, cam, [P2(0.15, -0.36), P2(0.15, 0.36), P2(0.75, 0.36), P2(0.75, -0.36)], '#141718'); }
    if (f.part === 'frontface') { const P2 = (t, w) => Wp([lerp(S[0][0], S[1][0], t), lerp(S[0][1], S[1][1], t), w]);
      fill3(g, cam, [P2(0.12, -hw + 0.2), P2(0.12, hw - 0.2), P2(0.45, hw - 0.25), P2(0.45, -hw + 0.25)], '#121516');
      fill3(g, cam, [P2(0.5, -0.26), P2(0.5, 0.26), P2(0.82, 0.26), P2(0.82, -0.26)], '#E4E2DA'); }
  }
  // the glass: a mirror of whatever the view says stands around it, over a dark cabin. Nothing is seen through it.
  function glassPane(g, cam, ptsW, f, o, fr, Bd) {
    const L = o.L, pp = path3(cam, ptsW), sp = ptsW.map(q => cam.p(q)), box = bboxOf(sp);
    if (box.w < 1 || box.h < 1) return;
    g.save(); g.clip(pp); g.fillStyle = L.interior; g.fill(pp);
    let n = newell(ptsW); const cW = ptsW.reduce((s, p) => add(s, p), [0, 0, 0]).map(v => v / ptsW.length); if (dot(n, sub(cam.pos, cW)) < 0) n = mul(n, -1);
    if (o.uprightGlass && f.part === 'rear') n = nrm([n[0], n[1] * 0.45, n[2]]);    // the hatch glass is curved: read it a little more upright
    const mc = mirrorCam(cam, cW, n);
    const rg = scratch('cp-glass'); const rb = { x: Math.max(0, Math.floor(box.x) - 2), y: Math.max(0, Math.floor(box.y) - 2), w: Math.ceil(box.w) + 4, h: Math.ceil(box.h) + 4 };
    if (o.env) o.env(rg, mc, null, rb, f); else skyFill(rg, mc, null, rb, L);
    const fres = clamp(0.62 + 0.38 * Math.pow(1 - Math.abs(dot(n, nrm(sub(cam.pos, cW)))), 2), 0, 1) * (o.glassK == null ? 1 : o.glassK);
    g.globalAlpha = fres; g.drawImage(rg.canvas, rb.x, rb.y, rb.w, rb.h, rb.x, rb.y, rb.w, rb.h); g.globalAlpha = 1;
    g.globalCompositeOperation = 'multiply'; g.fillStyle = mix('#FFFFFF', L.glassTint, 0.35); g.fill(pp); g.globalCompositeOperation = 'source-over';
    // a soft streak along the glass
    const ang = Math.atan2(sp[1][1] - sp[0][1], sp[1][0] - sp[0][0]) + 1.1;
    LC.glare(g, null, { x: box.x + box.w * 0.4, y: box.y + box.h * 0.5, angle: ang, color: '#FFFFFF', bands: [{ d: -box.w * 0.08, w: Math.max(4, box.w * 0.1), a: 0.07 }, { d: box.w * 0.06, w: Math.max(2, box.w * 0.02), a: 0.1 }] });
    g.restore();
    g.strokeStyle = 'rgba(6,8,9,0.85)'; g.lineWidth = Math.max(1, box.w / 260); g.stroke(pp);
  }
  // the driver's door (right, UK) swung open on its front hinge: outer skin, window, the doorway behind it dark
  function openDoor(g, cam, Bd, fr, cr, o, tone) {
    const hw = Bd.Wd / 2, S = Bd.spine, sg = 1, ang = (cr.door || 0) * deg(62);
    const uA = S[Bd.ws][0] + 0.05, uB = lerp(S[Bd.ws][0], S[Bd.rw][0], Bd.pB) - 0.01;
    // the doorway: the opening in the flank, black (the cabin is never seen)
    const op = [[uA, 0.36, sg * hw], [uB, 0.36, sg * hw], gh(Bd, sg, Bd.pB - 0.02, 0.96), gh(Bd, sg, 0.05, 0.96)];
    fill3(g, cam, op.map(q => fr.w(...q)), '#050707');
    const rot = q => { const du = q[0] - uA, dw = q[2] - sg * hw; const ca = Math.cos(ang), sa = Math.sin(ang); return [uA + du * ca, q[1], sg * hw + du * sa * sg + dw]; };
    const skin = [[uA, 0.36, sg * hw], [uB, 0.36, sg * hw], [uB, beltAt(Bd, uB), sg * hw], [uA, beltAt(Bd, uA), sg * hw]].map(rot).map(q => fr.w(...q));
    const win = [gh(Bd, sg, 0.05, 0), gh(Bd, sg, Bd.pB - 0.02, 0), gh(Bd, sg, Bd.pB - 0.02, 0.96), gh(Bd, sg, 0.05, 0.96)].map(rot).map(q => fr.w(...q));
    const edge = [[uB, 0.36, sg * hw], [uB, 0.36, sg * (hw - 0.1)], [uB, beltAt(Bd, uB), sg * (hw - 0.1)], [uB, beltAt(Bd, uB), sg * hw]].map(rot).map(q => fr.w(...q));
    const nS = newell(skin); const outward = dot(nS, sub(cam.pos, skin[0])) > 0;
    fill3(g, cam, edge, '#0C0E0F');
    if (outward) { fill3(g, cam, skin, tone([Math.sin(ang) * -1, 0, Math.cos(ang)], 'side')); glassPane(g, cam, win, { part: 'door' }, o, fr, Bd); }
    else { fill3(g, cam, skin, '#151819'); fill3(g, cam, win, '#0A0D0E'); }
    const fw = [win[2], win[3]]; line3(g, cam, fw[0], fw[1], '#0B0E0F', 3);
  }
  // a car at a distance or in a reflection: a dark lozenge with a lit roof
  function carBlob(g, cam, cr, L) {
    const Bd = BODIES[cr.type || 'hatch'], fr = carFrame(cr), hw = Bd.Wd / 2, Sp = Bd.spine;
    const lo = [[Sp[0][0], 0.3, hw], [Sp[0][0], 0.3, -hw], [Sp[Sp.length - 1][0], 0.3, -hw], [Sp[Sp.length - 1][0], 0.3, hw]];
    const pts = []; lo.forEach(q => { pts.push(fr.w(...q)); pts.push(fr.w(q[0], 0.95, q[2])); }); [[Sp[Bd.rf][0], Sp[Bd.rf][1], hw - Bd.tumble], [Sp[Bd.rr][0], Sp[Bd.rr][1], hw - Bd.tumble], [Sp[Bd.rf][0], Sp[Bd.rf][1], -hw + Bd.tumble], [Sp[Bd.rr][0], Sp[Bd.rr][1], -hw + Bd.tumble]].forEach(q => pts.push(fr.w(...q)));
    const sp = pts.map(q => cam.p(q)); if (sp.some(s => s[2] <= 0.3)) return;
    g.fillStyle = mix(cr.paint, '#000000', 0.45); g.fill(LC.pathPts(hull(sp.map(s => [s[0], s[1]]))));
  }

  // ---------- the ground: tarmac, worn bay lines, kerbs, the footpath and its low hedge ----------
  function ground(g, cam, L, tod, o) {
    o = o || {};
    // tarmac to the horizon (one big plane, near-clipped)
    const far = 400; const gp = [[-far, 0, -far], [far, 0, -far], [far, 0, far], [-far, 0, far]];
    const pp = path3(cam, gp), hz = cam.p(add(cam.pos, mul(nrm([Math.sin(cam.o.yaw), 0, Math.cos(cam.o.yaw)]), 3000)))[1];
    g.fillStyle = LC.lin(g, 0, hz, 0, H, [[0, L.tar[0]], [0.25, L.tar[1]], [1, mix(L.tar[1], L.tar[2], 0.5)]]); g.fill(pp);
    // the footpath along block A, its kerb, and the low hedge on the planting strip
    fill3(g, cam, [[0, 0.01, -60], [4.4, 0.01, -60], [4.4, 0.01, 70], [0, 0.01, 70]], tod === 'evening' ? '#5E4C46' : '#B5B1A6');
    fill3(g, cam, [[4.4, 0.0, -60], [4.4, 0.13, -60], [4.4, 0.13, 70], [4.4, 0.0, 70]], tod === 'evening' ? '#C99A72' : '#D9D6CC');
    fill3(g, cam, [[4.4, 0.13, -60], [5.7, 0.13, -60], [5.7, 0.13, 70], [4.4, 0.13, 70]], L.hedge[2]);
    fill3(g, cam, [[4.55, 0.13, -60], [4.55, 0.72, -60], [4.55, 0.72, 70], [4.55, 0.13, 70]], L.hedge[1]);
    fill3(g, cam, [[4.55, 0.72, -60], [5.6, 0.72, -60], [5.6, 0.72, 70], [4.55, 0.72, 70]], L.hedge[0]);
    fill3(g, cam, [[5.6, 0.13, -60], [5.6, 0.72, -60], [5.6, 0.72, 70], [5.6, 0.13, 70]], L.hedge[tod === 'evening' ? 0 : 1]);
    fill3(g, cam, [[5.7, 0.0, -60], [5.7, 0.13, -60], [5.7, 0.13, 70], [5.7, 0.0, 70]], tod === 'evening' ? '#E0A87A' : '#DCD9CF');
    // the walkway across the hedge to the entrance
    fill3(g, cam, [[4.4, 0.135, -1.8], [5.7, 0.135, -1.8], [5.7, 0.135, 1.8], [4.4, 0.135, 1.8]], tod === 'evening' ? '#6A5650' : '#BDB9AE');
    // bay lines, worn
    const R = rng('lines'); g.save(); g.lineCap = 'butt';
    ROWS.forEach(rw => { for (let z = rw.z0; z <= rw.z1 + 0.01; z += BAYW) { if (rw.row === 1 && Math.abs(z) < 4.3) continue; const wear = 0.55 + 0.45 * R();
      fill3(g, cam, [[rw.x0 + 0.15, 0.012, z - 0.05], [rw.x1 - 0.1, 0.012, z - 0.05], [rw.x1 - 0.1, 0.012, z + 0.05], [rw.x0 + 0.15, 0.012, z + 0.05]], rgba(L.line, 0.75 * wear)); }
      fill3(g, cam, [[rw.row % 2 ? rw.x1 - 0.05 : rw.x0 - 0.05, 0.012, rw.z0], [rw.row % 2 ? rw.x1 + 0.05 : rw.x0 + 0.05, 0.012, rw.z0], [rw.row % 2 ? rw.x1 + 0.05 : rw.x0 + 0.05, 0.012, rw.z1], [rw.row % 2 ? rw.x1 - 0.05 : rw.x0 - 0.05, 0.012, rw.z1]], rgba(L.line, 0.35)); });
    // oil shadows in the bays and tyre-polished tracks
    ROWS.forEach(rw => { for (let z = rw.z0 + BAYW / 2; z < rw.z1; z += BAYW) { const xc = (rw.x0 + rw.x1) / 2, r = R();
      const s = []; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; s.push([xc + Math.cos(a) * (0.5 + r * 0.4), 0.011, z + Math.sin(a) * 0.32]); } fill3(g, cam, s, rgba('#1E2020', 0.12 + 0.1 * r)); } });
    // the walkway's zebra to the entrance
    for (let i = 0; i < 7; i++) { const x = 5.9 + i * 0.62; fill3(g, cam, [[x, 0.012, -1.5], [x + 0.36, 0.012, -1.5], [x + 0.36, 0.012, 1.5], [x, 0.012, 1.5]], rgba(L.line, 0.8)); }
    g.restore();
  }

  // =====================================================================================
  // DANIEL'S CAR: SETS.car.exterior when the car set exists, otherwise the placeholder
  // =====================================================================================
  // pose: {x, z, h} in this set's world; s: {door, blink}. The anchor (screen point under the car's centre, px per metre,
  // the car's heading relative to the camera) is returned and is what the car set needs.
  function carAnchor(cam, pose) {
    const c = cam.p(pose.x, 0, pose.z), k = cam.f / Math.max(0.1, c[2]);
    const rel = Math.atan2(Math.sin(pose.h - cam.o.yaw), Math.cos(pose.h - cam.o.yaw));
    return { x: c[0], y: c[1], scale: k, heading: rel, yaw: cam.o.yaw, depth: c[2] };
  }
  function danielsCar(c, g, cam, pose, s, L, tod, env) {
    const an = carAnchor(cam, pose);
    if (window.SETS && SETS.car && typeof SETS.car.exterior === 'function' && !(s && s.placeholderCar)) {
      try {
        SETS.car.exterior(g, { x: an.x, y: an.y, scale: an.scale, heading: an.heading, angle: an.heading, cam, camera: cam, pose, world: { x: pose.x, z: pose.z, h: pose.h },
          tod, door: s && s.door || 0, doorOpen: s && s.door || 0, blink: s && s.blink || 0, indicators: s && s.blink || 0, reflect: env, env, t: c && c.t, c });
        return an;
      } catch (e) { if (window.FILM) FILM.warn('carpark: SETS.car.exterior failed (' + e.message + '), drawing the placeholder'); }
    }
    drawCar(g, cam, Object.assign({ type: DCAR.type, paint: DCAR.paint, plateR: DCAR.plateR }, pose, { door: s && s.door || 0, blink: s && s.blink || 0 }), { L, tod, env, uprightGlass: true });
    return an;
  }

  // =====================================================================================
  // PLACEHOLDER FIGURES for the demos (RIG draws the people in the film)
  // =====================================================================================
  function figure(g, x, y, k, o) {
    o = o || {}; const f = o.facing || 1, ph = o.phase || 0, walk = o.walk ? 1 : 0;
    g.save(); g.translate(x, y); g.scale(k * f, k);
    const sw = Math.sin(ph * TAU) * 0.22 * walk, col = o.color || '#1B2426';
    g.fillStyle = col; const S = pts => g.fill(LC.smooth(pts));
    S([[-0.07, -0.9], [0.05, -0.9], [0.06 + sw * 0.5, -0.45], [0.1 + sw, -0.02], [0.0 + sw, 0], [-0.02 + sw * 0.3, -0.45]]);
    S([[-0.05, -0.9], [0.07, -0.9], [0.04 - sw * 0.3, -0.45], [0.02 - sw, 0], [-0.08 - sw, -0.02], [-0.06 - sw * 0.5, -0.45]]);
    S([[-0.17, -0.92], [0.17, -0.92], [0.2, -1.2], [0.18, -1.42], [0.06, -1.46], [-0.06, -1.46], [-0.19, -1.42], [-0.2, -1.2]]);
    S([[-0.04, -1.44], [0.04, -1.44], [0.045, -1.52], [-0.045, -1.52]]);
    g.beginPath(); g.ellipse(0.01, -1.62, 0.085, 0.11, 0, 0, TAU); g.fill();
    if (o.armsUp) S([[0.14, -1.4], [0.22, -1.38], [0.36, -1.22], [0.42, -1.12], [0.36, -1.08], [0.2, -1.2]]);
    else { S([[0.13, -1.42], [0.2, -1.38], [0.22 - sw * 0.6, -1.0], [0.16 - sw * 0.6, -0.98], [0.12, -1.3]]); }
    if (o.rim) { g.strokeStyle = o.rim; g.lineWidth = 0.022; g.beginPath(); g.ellipse(0.01, -1.62, 0.085, 0.11, 0, -1.9, 0.2); g.stroke(); g.beginPath(); g.moveTo(0.06, -1.46); g.quadraticCurveTo(0.17, -1.44, 0.19, -1.3); g.stroke(); }
    g.restore();
  }
  function rigOr(g, who, pose, o) {
    if (window.RIG && typeof RIG.draw === 'function') { try { RIG.draw(g, who, pose, o); return; } catch (e) { /* fall through to the placeholder */ } }
    figure(g, o.x, o.y, o.scale, o);
  }

  // =====================================================================================
  // VIEWS
  // =====================================================================================
  const lightOf = s => LIGHT[(s && s.tod) === 'evening' ? 'evening' : 'morning'];
  const todOf = s => (s && s.tod) === 'evening' ? 'evening' : 'morning';

  // -------------------------------------------------------------------------------------
  // ARRIVAL (Q07 4–10): through the windscreen as he pulls into his usual space. Block A's glass front fills the
  // glass ahead, holding the sky and the morning sun; the bay's lines run under the bonnet; his neighbours either side.
  // s.pull 0..1 (1 = stopped in the bay), s.windscreen (default true: a simple cabin frame; false when the car set's
  // driver POV is laid over this view), s.engine (0..1: the slight shiver while the engine runs)
  // -------------------------------------------------------------------------------------
  const ARR = { over: 1.12, eye: [8.0, 1.17, 12.37], yaw: deg(-90), pitch: deg(4.5), f: 1180 };
  function arrivalCam(over) { return mkCam({ x: ARR.eye[0], y: ARR.eye[1], z: ARR.eye[2], yaw: ARR.yaw, pitch: ARR.pitch, f: ARR.f * over, cx: W * over / 2, cy: H * over / 2 }); }
  const arrival = {
    back(c, t, s) {
      s = s || {}; const g = c.g, L = LIGHT.morning, over = ARR.over, pull = s.pull == null ? 1 : s.pull;
      const lay = cached(c, 'arrival|world', (lg) => {
        const cam = arrivalCam(over); L.sunSide = -1;
        skyFill(lg, cam, null, { x: 0, y: 0, w: W * over, h: H * over }, L);
        ground(lg, cam, L, 'morning');
        const cars = parked('morning').filter(cr => cr.x < 12 && Math.abs(cr.z - 12) < 30);
        facade(lg, cam, A, L, 'morning', { carList: parked('morning'), sunR: 30, s0: 30, s1: 84, skip: (s0, j) => j === 0 && s0 + A.o[2] > ENTRANCE.z0 - 3 && s0 + A.o[2] < ENTRANCE.z1 + 1.5 });
        cars.sort((a, b) => cam.view([b.x, 0, b.z])[2] - cam.view([a.x, 0, a.z])[2]).forEach(cr => { if (cam.view([cr.x, 0.5, cr.z])[2] > 1.2) drawCar(lg, cam, cr, { L, tod: 'morning', env: (rg, mc, cl, box) => reflectScene(rg, mc, L, 'morning', { box, cars: false }) }); });
      }, Math.round(W * over), Math.round(H * over));
      // the creep forward: the world grows about the point ahead, the last half metre
      const k = lerp(1 / over * 1.0, 1, pull) , sh = (s.engine || 0) * 0.6 * Math.sin(t * 47);
      g.save(); g.translate(W / 2, H / 2 + sh); g.scale(k * over / over, k * over / over); g.translate(-W * over / 2, -H * over / 2); g.drawImage(lay, 0, 0); g.restore();
      const em = quarter(c, 'arrival|em', eg => { const cam = arrivalCam(1); sunAt(eg, mirrorCam(cam, facadePt(A, 0, 0), A.n), L, { r: 34, k: 1 }); });
      c.em.save(); c.em.globalAlpha = 0.8; c.em.drawImage(em, 0, 0, W, H); c.em.restore();
    },
    front(c, t, s) {
      s = s || {}; if (s.windscreen === false) return; const g = c.g;
      const fr = cached(c, 'arrival|cabin', fg => cabinFrame(fg, LIGHT.morning, 'morning'));
      g.drawImage(fr, 0, 0);
    },
    anchors: { kerb: [960, 846], facade: [960, 420], entrance: [1612, 610], scale: 140 },
    light: { x: 420, y: 140, color: '#FFF3DC' },
  };
  // a plain windscreen frame (used when the car set's own cabin is not laid over a through-the-windscreen view)
  function cabinFrame(g, L, tod) {
    const top = 150, dash = 880;
    const glass = new Path2D(); glass.moveTo(70, top); glass.lineTo(1850, top); glass.lineTo(1910, dash); glass.lineTo(10, dash); glass.closePath();
    g.save(); g.clip(glass); g.globalCompositeOperation = 'screen';
    g.fillStyle = LC.lin(g, 0, dash - 200, 0, dash, [[0, '#D9D2C2', 0], [1, '#D9D2C2', 0.18]]); g.fillRect(0, dash - 200, W, 200);
    for (let x = 400; x < 1120; x += 26) { g.fillStyle = 'rgba(40,40,40,0.15)'; g.fillRect(x, dash - 44, 10, 30); }
    g.restore();
    LC.glare(g, glass, { x: 700, y: 400, angle: -1.05, color: '#FFFFFF', bands: [{ d: -200, w: 120, a: 0.05 }, { d: -130, w: 18, a: 0.07 }, { d: 340, w: 200, a: 0.03 }] });
    LC.specks(g, glass, { x: 0, y: top, w: W, h: dash - top }, 'cp-wsdust', { n: 700, color: '#FFF3DA', rMin: 0.5, rMax: 1.5, aMin: 0.06, aMax: 0.35, scratch: 0.1, near: { x: 420, y: 160, r: 700 } });
    // frit
    g.fillStyle = '#060808'; g.fillRect(0, 0, W, top + 40);
    for (let row = 0; row < 7; row++) { const y = top + 44 + row * 11, r = 4.6 * (1 - row / 7.2); for (let x = (row % 2) * 6; x < W; x += 12) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } }
    // headliner, pillars, dash
    g.fillStyle = LC.lin(g, 0, 0, 0, top, [[0, '#3A3A35'], [1, '#4E4C45']]); g.fillRect(0, 0, W, top - 6);
    g.fillStyle = '#26251F'; g.fillRect(0, top - 8, W, 5);
    const ap = new Path2D(); ap.moveTo(1790, 0); ap.lineTo(W, 0); ap.lineTo(W, dash + 30); ap.bezierCurveTo(1880, 600, 1850, 330, 1790, 0); ap.closePath(); g.fillStyle = '#22211D'; g.fill(ap);
    const lp = new Path2D(); lp.moveTo(0, 0); lp.lineTo(120, 0); lp.bezierCurveTo(70, 330, 40, 600, 0, dash + 30); lp.closePath(); g.fill(lp);
    g.fillStyle = LC.lin(g, 0, dash, 0, H, [[0, '#2A2A27'], [0.2, '#191A18'], [1, '#0C0D0C']]); g.fillRect(0, dash, W, H - dash);
    g.fillStyle = 'rgba(232,214,180,0.14)'; g.fillRect(0, dash, W, 3);
    for (let x = 400; x < 1120; x += 26) { g.fillStyle = '#0A0B0A'; g.fillRect(x, dash + 14, 10, 22); }
    const bn = LC.smooth([[1180, H + 20], [1210, dash + 34], [1330, dash - 10], [1490, dash - 24], [1650, dash - 10], [1770, dash + 34], [1800, H + 20]]); g.fillStyle = '#111211'; g.fill(bn); g.strokeStyle = 'rgba(236,216,180,0.16)'; g.lineWidth = 2.5; g.stroke(bn);
    // the mirror holds only the road behind
    const mq = LC.rrect(800, 168, 330, 104, 40); g.fillStyle = '#121516'; g.fill(LC.rrect(792, 160, 346, 120, 46));
    g.save(); g.clip(mq); g.fillStyle = LC.lin(g, 0, 168, 0, 272, [[0, '#DADCD2'], [0.45, '#C4CAC4'], [0.5, '#7C7E78'], [1, '#5C5E5A']]); g.fillRect(800, 168, 330, 104);
    g.fillStyle = '#4A5650'; for (let i = 0; i < 6; i++) g.fillRect(820 + i * 52, 206 - (i % 3) * 4, 40, 18 + (i % 2) * 6);
    g.fillStyle = '#2C3436'; g.fillRect(800, 224, 330, 6); g.restore();
    g.strokeStyle = 'rgba(240,236,224,0.35)'; g.lineWidth = 1.5; g.stroke(mq);
    g.fillStyle = '#0D0F10'; g.fillRect(950, top - 10, 30, 30);
  }

  // -------------------------------------------------------------------------------------
  // SPACE (Q07 10–16 morning; Q10 18–28 evening): his car in its usual space, rear three-quarter from the driver's side.
  // Morning: block A's glass beyond, front-lit, holding the sky; the rear window holds block B and the sky, nothing else.
  // Evening: the low sun behind the car, its rear in shade, the rear window a copper mirror.
  // s.tod, s.door (0..1 the driver's door), s.blink (0..1 the indicators), s.car (false: leave the car to the sequence)
  // -------------------------------------------------------------------------------------
  const SPC = { cam: o => mkCam(Object.assign({ x: 15.6, y: 1.32, z: 16.3, yaw: deg(-118), pitch: deg(-2.5), f: 1650 }, o || {})) };
  function spaceEnv(L, tod) { return (rg, mc, cl, box) => reflectScene(rg, mc, L, tod, { box, carList: parked(tod), sunR: 16 }); }
  const space = {
    back(c, t, s) {
      s = s || {}; const g = c.g, tod = todOf(s), L = lightOf(s);
      const lay = cached(c, 'space|' + tod, lg => {
        const cam = SPC.cam(); const Lv = Object.assign({}, L, tod === 'evening' ? { az: deg(258), el: deg(7) } : {}); Lv.sunSide = tod === 'evening' ? 1 : -1;
        skyFill(lg, cam, null, { x: 0, y: 0, w: W, h: H }, Lv);
        if (tod === 'evening') sunAt(lg, cam, Lv, { r: 30 });
        ground(lg, cam, Lv, tod);
        facade(lg, cam, A, Lv, tod, { carList: parked(tod), sunR: 22, s0: 20, s1: 84 });
        entranceFront(lg, cam, Lv, tod);
        LAMPS.forEach(([x, z]) => { if (x < 14) lamp(lg, cam, x, z, Lv, tod); });
        const cars = parked(tod).filter(cr => cr.x < 23 && cam.view([cr.x, 0.5, cr.z])[2] > 2);
        cars.sort((a, b) => cam.view([b.x, 0, b.z])[2] - cam.view([a.x, 0, a.z])[2]).forEach(cr => drawCar(lg, cam, cr, { L: Lv, tod, env: spaceEnv(Lv, tod) }));
        if (tod === 'evening') { lg.save(); lg.globalCompositeOperation = 'multiply'; lg.fillStyle = LC.lin(lg, 0, 0, 0, H, [[0, '#E8D8E0'], [0.6, '#C9B6B8'], [1, '#9C8C92']]); lg.fillRect(0, 0, W, H); lg.restore(); }
      });
      g.drawImage(lay, 0, 0);
      if (s.car !== false) space.car(c, t, s);
    },
    car(c, t, s) {
      s = s || {}; const tod = todOf(s), L = lightOf(s), cam = SPC.cam(); const Lv = Object.assign({}, L, tod === 'evening' ? { az: deg(258), el: deg(7) } : {});
      const key = 'space|car|' + tod + '|' + Math.round((s.door || 0) * 24);
      const cv = cached(c, key, cg => { danielsCar(c, cg, cam, DANIEL, { door: s.door || 0 }, Lv, tod, spaceEnv(Lv, tod)); });
      c.g.drawImage(cv, 0, 0);
      if (s.blink > 0) blinkers(c, cam, DANIEL, s.blink, tod);
    },
    front(c, t, s) {
      s = s || {}; const g = c.g, tod = todOf(s);
      const fr = cached(c, 'space|front|' + tod, fg => {
        // the air between: a veil of heat haze low over the tarmac, and the sun's flare
        if (tod === 'evening') { fg.globalCompositeOperation = 'screen'; fg.fillStyle = LC.rad(fg, 1560, 600, 0, 900, [[0, '#F2A65E', 0.22], [0.5, '#E4894A', 0.06], [1, '#E4894A', 0]]); fg.fillRect(0, 0, W, H); }
        else { fg.globalCompositeOperation = 'screen'; fg.fillStyle = LC.lin(fg, 0, 0, 0, H, [[0, '#FFF6E6', 0.1], [0.5, '#FFF6E6', 0.0], [1, '#FFF6E6', 0.0]]); fg.fillRect(0, 0, W, H); }
        fg.globalCompositeOperation = 'source-over'; fg.fillStyle = LC.lin(fg, 0, 880, 0, H, [[0, '#0B1112', 0], [1, '#0B1112', 0.42]]); fg.fillRect(0, 880, W, 200);
      });
      g.drawImage(fr, 0, 0);
    },
    anchors: {},       // filled below once the camera exists
    light: { x: 300, y: 80, color: '#FFF3DC' },
  };
  function blinkers(c, cam, pose, k, tod) {
    const Bd = BODIES.hatch, fr = carFrame(pose), hw = Bd.Wd / 2, S = Bd.spine, n = S.length;
    [1, -1].forEach(sg => { const p = cam.p(fr.w(lerp(S[n - 3][0], S[n - 2][0], 0.14), lerp(S[n - 3][1], S[n - 2][1], 0.14), sg * (hw - 0.18)));
      const e = c.em; e.save(); e.globalAlpha = k; e.fillStyle = '#FFB060'; e.beginPath(); e.arc(p[0], p[1], 26, 0, TAU); e.fill(); e.restore();
      const g = c.g; g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, p[0], p[1], 0, 60, [[0, '#FFD9A0', 0.9 * k], [0.3, '#F2A65E', 0.4 * k], [1, '#F2A65E', 0]]); g.fillRect(p[0] - 60, p[1] - 60, 120, 120); g.restore(); });
  }
  // the entrance of block A: canopy, the glass doors' frame (the doors themselves are the DOOR view)
  function entranceFront(g, cam, L, tod) {
    const ev = tod === 'evening';
    fill3(g, cam, [[0, 3.1, -4.2], [3.0, 3.1, -4.2], [3.0, 3.1, 4.2], [0, 3.1, 4.2]], ev ? '#1E1B20' : '#6E7877');
    fill3(g, cam, [[3.0, 3.1, -4.2], [3.0, 3.45, -4.2], [3.0, 3.45, 4.2], [3.0, 3.1, 4.2]], ev ? '#3A3036' : '#D2D8D4');
    [-3.9, 3.9].forEach(z => fill3(g, cam, [[2.85, 0, z - 0.08], [2.95, 0, z - 0.08], [2.95, 3.1, z - 0.08], [2.85, 3.1, z - 0.08]], ev ? '#141215' : '#4A5453'));
  }

  // -------------------------------------------------------------------------------------
  // CROSSING (Q07 16–24): a row of parked cars side-on; the camera tracks with Daniel and only his reflection is seen,
  // passing through their side windows, broken by the pillars and the gaps between cars. Above the roofs, the far side of
  // the car park and block B. s.track (metres travelled along the row; the cars slide past), s.reflect(g, R): draw Daniel
  // into the reflection (R.x, R.y: the virtual image's feet; R.scale px/m; R.facing; the glass clip is applied by the set)
  // -------------------------------------------------------------------------------------
  const CRS = { d: 2.7, eye: 1.18, f: 1200, carsX: 6.6 };
  const CROSS_CARS = (() => { const out = [], R = rng('crossing-cars'); let z = 26; for (let i = 0; i < 9; i++) { const type = ['hatch', 'saloon', 'hatch', 'estate', 'suv', 'hatch', 'saloon', 'hatch', 'estate'][i]; const Bd = BODIES[type]; z -= Bd.L / 2 + 0.6 + R() * 0.6; out.push({ x: CRS.carsX, z, h: deg(0), type, paint: ['#A6ACAC', '#2B3446', '#D2D3CD', '#55302D', '#676C6D', '#1C1F20', '#8E8678', '#58697A', '#C9CBC4'][i], seed: 'x' + i }); z -= Bd.L / 2; } return out; })();
  function crossCam(track) { return mkCam({ x: CRS.carsX - 0.9 - CRS.d, y: CRS.eye, z: 18 - track, yaw: deg(90), pitch: deg(1), f: CRS.f }); }
  const crossing = {
    back(c, t, s) {
      s = s || {}; const g = c.g, L = Object.assign({}, LIGHT.morning, { az: deg(118), el: deg(29), sunSide: 1 }), track = s.track || 0;
      // the far side (above the roofs): cached once and slid at its own rate
      const farL = cached(c, 'crossing|far', fg => {
        const cam = crossCam(0); fg.save(); fg.translate(0, 0);
        const wide = mkCam(Object.assign({}, cam.o, { cx: 1300, f: CRS.f })); const cw = mkCam({ x: cam.pos[0], y: cam.pos[1], z: cam.pos[2], yaw: cam.o.yaw, pitch: cam.o.pitch, f: CRS.f, cx: 1600, cy: H / 2 });
        skyFill(fg, cw, null, { x: 0, y: 0, w: 3200, h: H }, L);
        sunAt(fg, cw, L, { r: 26 });
        facadeFlat(fg, cw, B, L, 'morning');
        TREES.forEach(T => tree(fg, cw, T, L, false));
        LAMPS.forEach(([x, z]) => lamp(fg, cw, x, z, L, 'morning'));
        ground(fg, cw, L, 'morning');
        parked('morning').filter(cr => cr.x > 14).sort((a, b) => cw.view([b.x, 0, b.z])[2] - cw.view([a.x, 0, a.z])[2]).forEach(cr => drawCar(fg, cw, cr, { L, tod: 'morning', env: (rg, mc, cl, box) => skyFill(rg, mc, null, box, L) }));
        fg.restore();
      }, 3200, H);
      const farShift = track * CRS.f / 26;           // the far side moves slowly
      g.drawImage(farL, -(1600 - W / 2) + farShift, 0);
      // the near row, drawn live (the camera moves past it)
      const cam = crossCam(track);
      const env = (rg, mc, cl, box) => { reflectScene(rg, mc, L, 'morning', { box, carList: [], sunR: 18 });
        // block A's sunlit face, behind us, the strongest thing in these windows
        facade(rg, mc, A, Object.assign({}, L), 'morning', { carList: [], s0: 30, s1: 84 }); };
      const envC = (rg, mc, cl, box) => { skyFill(rg, mc, null, box, L); facadeFlat(rg, mc, A, Object.assign({}, L, { az: L.az }), 'morning'); };
      CROSS_CARS.forEach(cr => { const v = cam.view([cr.x, 0.7, cr.z]); if (Math.abs(v[0] / v[2]) < 1.6) drawCar(g, cam, cr, { L, tod: 'morning', env: envC, glassK: 1.15 }); });
    },
    front(c, t, s) {
      s = s || {}; const g = c.g, track = s.track || 0, cam = crossCam(track);
      // Daniel's reflection: drawn by the sequence into a scratch layer, kept to the side glass, crushed like a mirror
      if (s.reflect) {
        const rg = scratch('cp-cross-refl');
        const dist = CRS.d + 0.9 + 1.1;   // the virtual image: as far behind the glass as he is in front of it
        const R = { x: W / 2 + (s.offset || 0), y: cam.p(CRS.carsX + dist, 0, cam.pos[2])[1], scale: CRS.f / (CRS.d + dist + 0.9), facing: s.facing || -1, t, light: crossing.light };
        rg.save(); s.reflect(rg, R); rg.restore();
        const mk = scratch('cp-cross-mask');
        CROSS_CARS.forEach(cr => { const v = cam.view([cr.x, 0.7, cr.z]); if (Math.abs(v[0] / v[2]) > 1.6) return; const Bd = BODIES[cr.type], fr = carFrame(cr);
          const sg = fr.loc(cam.pos)[2] > 0 ? 1 : -1; mk.fillStyle = '#fff'; mk.fill(path3(cam, [gh(Bd, sg, 0.045, 0.02), gh(Bd, sg, Bd.pB - 0.02, 0.02), gh(Bd, sg, Bd.pB - 0.02, 0.97), gh(Bd, sg, 0.045, 0.97)].map(q => fr.w(...q))));
          mk.fill(path3(cam, [gh(Bd, sg, Bd.pB + 0.025, 0.02), gh(Bd, sg, Bd.pC, 0.02), gh(Bd, sg, Bd.pC + 0.06, 0.97), gh(Bd, sg, Bd.pB + 0.025, 0.97)].map(q => fr.w(...q)))); });
        rg.globalCompositeOperation = 'destination-in'; rg.drawImage(mk.canvas, 0, 0);
        g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.85; g.drawImage(rg.canvas, 0, 0); g.restore();
      }
      const fr = cached(c, 'crossing|front', fg => { fg.fillStyle = LC.lin(fg, 0, 860, 0, H, [[0, '#0B1112', 0], [1, '#0B1112', 0.5]]); fg.fillRect(0, 860, W, 220);
        fg.globalCompositeOperation = 'screen'; fg.fillStyle = LC.rad(fg, 1500, -120, 0, 900, [[0, '#FFF6E6', 0.32], [1, '#FFF6E6', 0]]); fg.fillRect(0, 0, W, H); });
      g.drawImage(fr, 0, 0);
    },
    anchors: { reflection: { y: 0, scale: 0 }, beltline: 0, roofline: 0 },
    light: { x: 1500, y: -100, color: '#FFF0D8' },
  };

  // -------------------------------------------------------------------------------------
  // DOOR (Q07 ~20–24): the entrance's glass door sighs shut behind him. Outside, facing the doors: the door swings closed
  // on its hinge, the car park and the sun's glint sliding across its glass as it turns; through it the cool lobby, where
  // Daniel walks away (drawn by the sequence between back and front). s.door: 1 = open (swung out toward us) .. 0 = shut.
  // -------------------------------------------------------------------------------------
  const DR = { cam: () => mkCam({ x: 6.4, y: 1.45, z: -0.9, yaw: deg(-90), pitch: deg(3), f: 1500 }), hinge: [0.02, 0, 1.15], width: 1.1, height: 2.45 };
  function lobby(g, cam, L) {
    // the lobby behind the glass: cool, deep, lit from above; reception desk, a plant, the lift doors
    fill3(g, cam, [[-12, 0, -9], [-0.05, 0, -9], [-0.05, 0, 9], [-12, 0, 9]], '#5F706E');
    fill3(g, cam, [[-12, 3.6, -9], [-0.05, 3.6, -9], [-0.05, 3.6, 9], [-12, 3.6, 9]], '#2E3C3D');
    fill3(g, cam, [[-12, 0, -9], [-12, 3.6, -9], [-12, 3.6, 9], [-12, 0, 9]], '#3E5050');
    fill3(g, cam, [[-12, 0, 9], [-0.05, 0, 9], [-0.05, 3.6, 9], [-12, 3.6, 9]], '#34464A');
    fill3(g, cam, [[-12, 0, -9], [-0.05, 0, -9], [-0.05, 3.6, -9], [-12, 3.6, -9]], '#2A3A3C');
    for (let x = -11; x < 0; x += 2.2) fill3(g, cam, [[x, 3.59, -3], [x + 0.6, 3.59, -3], [x + 0.6, 3.59, 3], [x, 3.59, 3]], '#DCE4E0');
    // floor sheen: the ceiling lights laid on polished stone
    for (let x = -11; x < 0; x += 2.2) fill3(g, cam, [[x, 0.01, -2.5], [x + 0.5, 0.01, -2.5], [x + 0.5, 0.01, 2.5], [x, 0.01, 2.5]], 'rgba(214,226,222,0.25)');
    // lift doors at the back, brushed steel
    [-2.2, 1.2].forEach(z => { fill3(g, cam, [[-11.98, 0, z], [-11.98, 0, z + 1.4], [-11.98, 2.4, z + 1.4], [-11.98, 2.4, z]], '#8C9A98'); line3(g, cam, [-11.97, 0, z + 0.7], [-11.97, 2.4, z + 0.7], '#56625F', 2); });
    // reception desk
    fill3(g, cam, [[-7, 0, -6.5], [-7, 0, -2.5], [-7, 1.1, -2.5], [-7, 1.1, -6.5]], '#B9C3BE');
    fill3(g, cam, [[-7, 1.1, -6.5], [-7, 1.1, -2.5], [-7.7, 1.1, -2.5], [-7.7, 1.1, -6.5]], '#E1E6E1');
    fill3(g, cam, [[-7, 0, -2.5], [-7.7, 0, -2.5], [-7.7, 1.1, -2.5], [-7, 1.1, -2.5]], '#7F8D8A');
    // a tall plant by the glass
    { const b = cam.p(-1.2, 0, 4.2), k = cam.f / b[2]; g.fillStyle = '#2B3A35'; g.fillRect(b[0] - 0.22 * k, b[1] - 0.5 * k, 0.44 * k, 0.5 * k); const R = rng('lobbyplant'); g.fillStyle = '#3C5248';
      for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.4, l = (0.6 + R() * 0.9) * k; g.save(); g.translate(b[0], b[1] - 0.5 * k); g.rotate(a + Math.PI / 2); g.beginPath(); g.ellipse(0, -l / 2, 0.08 * k, l / 2, 0, 0, TAU); g.fill(); g.restore(); } }
  }
  const door = {
    back(c, t, s) {
      s = s || {}; const g = c.g, L = Object.assign({}, LIGHT.morning, { sunSide: -1 });
      const lay = cached(c, 'door|back', lg => {
        const cam = DR.cam();
        lobby(lg, cam, L);
        // the fixed glass either side and above the doors: the car park in it
        facade(lg, cam, A, L, 'morning', { carList: parked('morning'), sunR: 18, s0: 30, s1: 60, skip: (s0, j) => j === 0 && s0 + A.o[2] > -2.6 && s0 + A.o[2] < 1.6 });
        // the doorway itself (the opening the door closes)
        entranceFront(lg, cam, L, 'morning');
        ground(lg, cam, L, 'morning');
      });
      g.drawImage(lay, 0, 0);
      // the doorway: lobby seen straight through where the door is not (cut back over the facade layer)
      const op = cached(c, 'door|open', og => { const cam = DR.cam(); og.save(); og.clip(path3(cam, [[0, 0, -1.15], [0, 0, 1.15], [0, DR.height, 1.15], [0, DR.height, -1.15]])); lobby(og, cam, L); og.restore();
        // the frame of the opening
        fill3(og, cam, [[0.02, 0, -1.2], [0.02, 0, -1.12], [0.02, 2.55, -1.12], [0.02, 2.55, -1.2]], '#3E4847'); fill3(og, cam, [[0.02, 0, 1.12], [0.02, 0, 1.2], [0.02, 2.55, 1.2], [0.02, 2.55, 1.12]], '#3E4847');
        fill3(og, cam, [[0.02, 2.45, -1.2], [0.02, 2.45, 1.2], [0.02, 2.6, 1.2], [0.02, 2.6, -1.2]], '#2A3231'); });
      g.drawImage(op, 0, 0);
    },
    front(c, t, s) {
      s = s || {}; const g = c.g, L = LIGHT.morning, cam = DR.cam(), open = clamp(s.door == null ? 0 : s.door, 0, 1);
      // two leaves: the left one fixed shut; the right one (hinged at z = +1.15) swings out toward us
      const leaf = (z0, z1, ang, key) => {
        const hz = z1, rot = q => { const dz = q[2] - hz, dx = q[0]; const ca = Math.cos(ang), sa = Math.sin(ang); return [dx * ca - dz * sa * -1 * 0 + dz * Math.sin(ang) * -1 + q[0] * 0 + 0.03 + (-dz) * sa, q[1], hz + dz * ca]; };
        const corners = [[0.03, 0.05, z0], [0.03, 0.05, z1], [0.03, DR.height, z1], [0.03, DR.height, z0]].map(q => { const dz = q[2] - hz; return [0.03 - dz * Math.sin(ang), q[1], hz + dz * Math.cos(ang)]; });
        let n = newell(corners); if (dot(n, sub(cam.pos, corners[0])) < 0) n = mul(n, -1);
        const pp = path3(cam, corners), mc = mirrorCam(cam, corners[0], n), box = bboxOf(corners.map(q => cam.p(q)));
        const rg = scratch('cp-door-refl');
        reflectScene(rg, mc, L, 'morning', { box, carList: parked('morning'), sunR: 24 });
        g.save(); g.clip(pp);
        g.globalAlpha = 0.22; g.fillStyle = '#9FBAC0'; g.fill(pp); g.globalAlpha = 1;
        g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.62; g.drawImage(rg.canvas, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        // manifestation: a band of frosted dots at eye level, and a lower one
        [1.5, 0.95].forEach(hh => { for (let zz = z0 + 0.06; zz < z1 - 0.04; zz += 0.07) { const q = [0.03 - (zz - hz) * Math.sin(ang), hh, hz + (zz - hz) * Math.cos(ang)], sp = cam.p(q), k = cam.f / sp[2]; g.fillStyle = 'rgba(236,242,238,0.55)'; g.beginPath(); g.arc(sp[0], sp[1], 0.017 * k, 0, TAU); g.fill(); } });
        g.restore();
        // the frame: slim aluminium, the pull handle (a steel bar that holds the sun)
        g.strokeStyle = '#4A5554'; g.lineWidth = 0.05 * cam.f / Math.max(1, cam.view(corners[1])[2]); g.stroke(pp);
        const hq = [0.03 - (z0 + 0.12 - hz) * Math.sin(ang) + Math.cos(ang) * 0.07, 0, hz + (z0 + 0.12 - hz) * Math.cos(ang) + Math.sin(ang) * 0.07];
        const h0 = cam.p(hq[0], 0.75, hq[2]), h1 = cam.p(hq[0], 1.65, hq[2]), kk = cam.f / h0[2];
        g.lineCap = 'round'; g.strokeStyle = '#7C8886'; g.lineWidth = 0.035 * kk; g.beginPath(); g.moveTo(h0[0], h0[1]); g.lineTo(h1[0], h1[1]); g.stroke();
        g.strokeStyle = '#F6F2E6'; g.lineWidth = 0.01 * kk; g.beginPath(); g.moveTo(h0[0] - 0.008 * kk, h0[1]); g.lineTo(h1[0] - 0.008 * kk, h1[1]); g.stroke();
        return pp;
      };
      leaf(-1.12, 0.0, 0, 'L');
      leaf(0.0, 1.12, open * deg(78), 'R');
      // the heat outside: a faint warm veil; the subtitle band kept calm by the doormat's shade
      const fr = cached(c, 'door|front', fg => { fg.fillStyle = LC.lin(fg, 0, 870, 0, H, [[0, '#0B1112', 0], [1, '#0B1112', 0.45]]); fg.fillRect(0, 870, W, 210); });
      g.drawImage(fr, 0, 0);
    },
    anchors: {},
    light: { x: 1700, y: 120, color: '#FFF3DC' },
  };

  // -------------------------------------------------------------------------------------
  // ROWS (Q10 18–24): the car park at 5:40. The low sun behind us turns every windscreen and rear window copper; long
  // shadows run away from us; block B across the car park blazes. Daniel walks to his car (anchors.path).
  // -------------------------------------------------------------------------------------
  const RWS = { cam: () => mkCam({ x: 2.2, y: 1.72, z: 2.5, yaw: deg(68), pitch: deg(-3.5), f: 1250 }) };
  const rows = {
    back(c, t, s) {
      s = s || {}; const g = c.g, L = Object.assign({}, LIGHT.evening, { az: deg(278), el: deg(9), sunSide: -1 });
      const lay = cached(c, 'rows|back', lg => {
        const cam = RWS.cam();
        skyFill(lg, cam, null, { x: 0, y: 0, w: W, h: H }, L);
        facade(lg, cam, B, L, 'evening', { carList: [], sunR: 30, sunK: 1.2 });
        TREES.forEach(T => tree(lg, cam, T, L, false));
        ground(lg, cam, L, 'evening');
        LAMPS.forEach(([x, z]) => lamp(lg, cam, x, z, L, 'evening'));
        const env = (rg, mc, cl, box) => { skyFill(rg, mc, null, box, L); sunAt(rg, mc, L, { r: 14, k: 1.2 }); };
        const all = parked('evening').concat([Object.assign({ type: 'hatch', paint: DCAR.paint, plateR: DCAR.plateR }, DANIEL)]);
        all.filter(cr => cam.view([cr.x, 0.5, cr.z])[2] > 2).sort((a, b) => cam.view([b.x, 0, b.z])[2] - cam.view([a.x, 0, a.z])[2]).forEach(cr => drawCar(lg, cam, cr, { L, tod: 'evening', env, glassK: 1.3 }));
        // the whole frame bathed: a copper wash from the left, the sky's violet laid into the shadows
        lg.save(); lg.globalCompositeOperation = 'soft-light'; lg.fillStyle = LC.lin(lg, 0, 0, W, 0, [[0, '#F2A65E', 0.35], [1, '#F2A65E', 0.05]]); lg.fillRect(0, 0, W, H); lg.restore();
      });
      g.drawImage(lay, 0, 0);
      const em = quarter(c, 'rows|em', eg => { const cam = RWS.cam(); const L2 = Object.assign({}, L);
        parked('evening').concat([DANIEL]).forEach(cr => { const p = cam.p(cr.x, 1.1, cr.z); if (p[2] > 2 && p[0] > 0 && p[0] < W) { eg.fillStyle = 'rgba(242,166,94,0.35)'; eg.beginPath(); eg.arc(p[0], p[1], 3000 / p[2], 0, TAU); eg.fill(); } }); });
      c.em.save(); c.em.globalAlpha = 0.7; c.em.drawImage(em, 0, 0, W, H); c.em.restore();
    },
    front(c, t, s) {
      const g = c.g; const fr = cached(c, 'rows|front', fg => { fg.fillStyle = LC.lin(fg, 0, 860, 0, H, [[0, '#120D0E', 0], [1, '#120D0E', 0.5]]); fg.fillRect(0, 860, W, 220);
        fg.globalCompositeOperation = 'screen'; fg.fillStyle = LC.rad(fg, -200, 300, 0, 1200, [[0, '#F7A963', 0.28], [1, '#F7A963', 0]]); fg.fillRect(0, 0, W, H); });
      g.drawImage(fr, 0, 0);
    },
    anchors: {},
    light: { x: -300, y: 300, color: '#F7A963' },
  };

  // -------------------------------------------------------------------------------------
  // HEAT (Q10 24–28): his car's driver's door open, a dense wave of trapped heat pouring out (refraction in the air);
  // the low sun beyond, the door's glass a copper mirror; the rear of the car out of frame. s.door 0..1, s.heat 0..1
  // -------------------------------------------------------------------------------------
  const HT = { cam: () => mkCam({ x: 4.45, y: 1.38, z: 17.4, yaw: deg(118), pitch: deg(-6), f: 1500 }) };
  const heat = {
    back(c, t, s) {
      s = s || {}; const g = c.g, L = Object.assign({}, LIGHT.evening, { az: deg(300), el: deg(8), sunSide: -1 });
      const lay = cached(c, 'heat|back', lg => {
        const cam = HT.cam();
        skyFill(lg, cam, null, { x: 0, y: 0, w: W, h: H }, L);
        facade(lg, cam, B, L, 'evening', { carList: [] });
        TREES.forEach(T => tree(lg, cam, T, L, false));
        ground(lg, cam, L, 'evening');
        LAMPS.forEach(([x, z]) => lamp(lg, cam, x, z, L, 'evening'));
        const env = (rg, mc, cl, box) => { skyFill(rg, mc, null, box, L); sunAt(rg, mc, L, { r: 14, k: 1.2 }); facadeFlat(rg, mc, B, L, 'evening'); };
        parked('evening').filter(cr => cam.view([cr.x, 0.5, cr.z])[2] > 3).sort((a, b) => cam.view([b.x, 0, b.z])[2] - cam.view([a.x, 0, a.z])[2]).forEach(cr => drawCar(lg, cam, cr, { L, tod: 'evening', env, glassK: 1.3 }));
      });
      g.drawImage(lay, 0, 0);
      if (s.car !== false) heat.car(c, t, s);
    },
    car(c, t, s) {
      s = s || {}; const L = Object.assign({}, LIGHT.evening, { az: deg(300), el: deg(8) }), cam = HT.cam(), d = s.door == null ? 1 : s.door;
      const cv = cached(c, 'heat|car|' + Math.round(d * 24), cg => danielsCar(c, cg, cam, DANIEL, { door: d }, L, 'evening', (rg, mc, cl, box) => { skyFill(rg, mc, null, box, L); sunAt(rg, mc, L, { r: 16, k: 1.3 }); facadeFlat(rg, mc, B, L, 'evening'); }));
      c.g.drawImage(cv, 0, 0);
    },
    front(c, t, s) {
      s = s || {}; const g = c.g, k = s.heat == null ? 1 : s.heat, cam = HT.cam();
      // the heat: the air above the doorway refracts in rising, wavering bands (resampled from the frame drawn so far)
      if (k > 0.01) {
        const top = cam.p(DANIEL.x - 0.4, 1.9, DANIEL.z + 1.3), bot = cam.p(DANIEL.x - 0.4, 0.6, DANIEL.z + 1.0);
        const bx = Math.round(top[0] - 360), by = Math.round(top[1] - 260), bw = 720, bh = Math.round(bot[1] - top[1] + 380);
        shimmer(c, bx, by, bw, bh, t, k, 'heat');
      }
      const fr = cached(c, 'heat|front', fg => { fg.fillStyle = LC.lin(fg, 0, 860, 0, H, [[0, '#120D0E', 0], [1, '#120D0E', 0.5]]); fg.fillRect(0, 860, W, 220);
        fg.globalCompositeOperation = 'screen'; fg.fillStyle = LC.rad(fg, 1500, 520, 0, 1100, [[0, '#F7A963', 0.24], [1, '#F7A963', 0]]); fg.fillRect(0, 0, W, H); });
      g.drawImage(fr, 0, 0);
    },
    anchors: {},
    light: { x: 1500, y: 520, color: '#F7A963' },
  };
  // refraction shimmer over a device-space box of what has been drawn: slices displaced by rising waves, feathered at the edges
  function shimmer(c, bx, by, bw, bh, t, k, seed) {
    const g = c.g, m = g.getTransform(), dx0 = Math.round(m.a * bx + m.e), dy0 = Math.round(m.d * by + m.f), dw = Math.round(bw * m.a), dh = Math.round(bh * m.d);
    const src = scratch('cp-shim-src', dw, dh); src.drawImage(g.canvas, dx0, dy0, dw, dh, 0, 0, dw, dh);
    const out = scratch('cp-shim-out', dw, dh), step = 3;
    for (let y = 0; y < dh; y += step) { const u = y / dh; const amp = k * (2.5 + 6 * (1 - u)) * (0.6 + 0.4 * Math.sin(u * 9 + t * 1.3));
      const off = amp * (Math.sin(y * 0.11 - t * 9.0) * 0.6 + Math.sin(y * 0.047 + t * 4.3 + 1.7) * 0.4);
      out.drawImage(src.canvas, 0, y, dw, step, off, y, dw, step); }
    out.globalCompositeOperation = 'destination-in';
    const mk = cached(c, 'shimmask|' + seed + '|' + dw + 'x' + dh, mg => { mg.fillStyle = LC.rad(mg, dw / 2, dh * 0.62, 0, Math.max(dw, dh) * 0.52, [[0, '#000', 1], [0.6, '#000', 0.85], [1, '#000', 0]]); mg.fillRect(0, 0, dw, dh); }, dw, dh);
    out.drawImage(mk, 0, 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(out.canvas, dx0, dy0); g.restore();
  }

  // ---------- anchors (screen points and scales for the choreography) ----------
  (() => {
    const cs = SPC.cam(), an = carAnchor(cs, DANIEL), fr = carFrame(DANIEL), dd = cs.p(fr.w(0.35, 0, 1.45)), rr = cs.p(fr.w(-2.6, 0, 1.1));
    space.anchors = { car: an, driverDoor: [dd[0], dd[1]], driverDoorScale: cs.f / dd[2], walkAway: { from: [dd[0], dd[1]], to: [rr[0] + 260, rr[1] + 140], scale: cs.f / rr[2] }, rearWindow: (() => { const q = cs.p(fr.w(-1.72, 1.2, 0)); return [q[0], q[1]]; })() };
    const cd = DR.cam(), d0 = cd.p(-1.0, 0, 0.6), d1 = cd.p(-7.5, 0, -1.8);
    door.anchors = { daniel: { from: [d0[0], d0[1]], to: [d1[0], d1[1]], scaleFrom: cd.f / d0[2], scaleTo: cd.f / d1[2] }, hinge: (() => { const q = cd.p(0.03, 1.2, 1.12); return [q[0], q[1]]; })() };
    const cr = RWS.cam(), dA = carAnchor(cr, DANIEL), w0 = cr.p(3.2, 0, 4.5), w1 = cr.p(5.0, 0, 13.1);
    rows.anchors = { car: dA, path: { from: [w0[0], w0[1]], to: [w1[0], w1[1]], scaleFrom: cr.f / w0[2], scaleTo: cr.f / w1[2] } };
    const ch = HT.cam(), hA = carAnchor(ch, DANIEL), fr2 = carFrame(DANIEL), st = ch.p(fr2.w(0.0, 0, 2.15));
    heat.anchors = { car: hA, daniel: [st[0], st[1]], danielScale: ch.f / st[2] };
    const cc = crossCam(0); crossing.anchors = { reflection: { x: W / 2, y: cc.p(CRS.carsX + CRS.d + 2.0, 0, cc.pos[2])[1], scale: CRS.f / (CRS.d * 2 + 2.9) }, beltline: cc.p(CRS.carsX - 0.9, 1.0, cc.pos[2])[1], roofline: cc.p(CRS.carsX - 0.7, 1.45, cc.pos[2])[1] };
    const ca = arrivalCam(1); const ke = ca.p(5.7, 0.13, 12.37), fa = ca.p(0, 2.5, 12.37), en = ca.p(0, 1.2, 0);
    arrival.anchors = { kerb: [ke[0], ke[1]], facade: [fa[0], fa[1]], entrance: [en[0], en[1]], scale: ca.f / 7.9 };
  })();

  // =====================================================================================
  // THE SET
  // =====================================================================================
  SETS.carpark = {
    views: { arrival, space, crossing, door, rows, heat },
    // helpers for the choreography: Daniel's car as this set draws it, and its anchor in any view's camera
    car: { danielsCar, anchor: carAnchor, pose: DANIEL, BODIES },
    demos: [
      { name: 'arrival: pulling in, 8:32', draw(c, t) { const v = SETS.carpark.views.arrival; v.back(c, t, { pull: 1 }); v.front(c, t, {}); } },
      { name: 'space: morning, the locks (blink)', draw(c, t) { const v = SETS.carpark.views.space, s = { tod: 'morning', blink: 1 }; v.back(c, t, s);
        const a = v.anchors; rigOr(c.g, 'daniel', 'walk', { x: a.walkAway.from[0] + 140, y: a.walkAway.from[1] + 30, scale: a.walkAway.scale * 1.02, facing: 1, walk: true, phase: 0.2, rim: '#FFE9C4' }); v.front(c, t, s); } },
      { name: 'crossing: his reflection along the windows', draw(c, t) { const v = SETS.carpark.views.crossing; v.back(c, t, { track: 2 + t * 1.2 });
        v.front(c, t, { track: 2 + t * 1.2, reflect: (g, R) => figure(g, R.x, R.y, R.scale, { facing: R.facing, walk: true, phase: t * 1.6, color: '#C9A88A', rim: '#FFF0D8' }) }); } },
      { name: 'door: sighing shut (half way)', draw(c, t) { const v = SETS.carpark.views.door, s = { door: 0.45 }; v.back(c, t, s); const a = v.anchors.daniel;
        figure(c.g, lerp(a.from[0], a.to[0], 0.5), lerp(a.from[1], a.to[1], 0.5), lerp(a.scaleFrom, a.scaleTo, 0.5), { facing: -1, walk: true, phase: 0.3, color: '#26343A' }); v.front(c, t, s); } },
      { name: 'door: shut', draw(c, t) { const v = SETS.carpark.views.door, s = { door: 0 }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'space: evening, the door opened', draw(c, t) { const v = SETS.carpark.views.space, s = { tod: 'evening', door: 1 }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'rows: evening, every windscreen copper', draw(c, t) { const v = SETS.carpark.views.rows; v.back(c, t, {}); const a = v.anchors.path; figure(c.g, lerp(a.from[0], a.to[0], 0.4), lerp(a.from[1], a.to[1], 0.4), lerp(a.scaleFrom, a.scaleTo, 0.4), { facing: 1, walk: true, phase: 0.6, color: '#1A1416', rim: '#F7A963' }); v.front(c, t, {}); } },
      { name: 'heat: the open door, the heat pouring out', draw(c, t) { const v = SETS.carpark.views.heat, s = { door: 1, heat: 1 }; v.back(c, t, s); const a = v.anchors; figure(c.g, a.daniel[0], a.daniel[1], a.danielScale, { facing: -1, color: '#141012', rim: '#F7A963' }); v.front(c, t, s); } },
    ],
  };
})();
