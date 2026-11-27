window.SETS = window.SETS || {};
/* LONG DISTANCE · SETS.living — the flat: kitchen and living room, one room (film/api/living.md).
   Small, tidy for one, furnished for two. The room is laid out ONCE in metres and every view is a pinhole camera on it (pitch 0, a
   shifted lens, so verticals stay vertical: C's elevations), drawn in B's cut paper: hand-cut edges, a paper texture per piece, lifted
   shadows, light in posterised bands. Nothing here is gloss: the phone (PHONE) and the characters (RIG) are drawn by the sequence
   between back() and front().
   World: X along the back wall (left to right as seen from the front door), Y up, Z from the front wall (0) to the back wall (4.2).
   His half is the kitchen (left); the empty half is the living side (right). The seam is the pale rectangle's left edge (X 2.70).
   Deterministic: no Math.random, no Date. */
(function () {
  'use strict';
  const O = window.OTM, G = window.GG, W = O.W, H = O.H, S = O.S;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const D2R = Math.PI / 180;

  // =====================================================================================================================
  // THE FLAT, in metres
  // =====================================================================================================================
  const R = {
    w: 5.4, d: 4.2, h: 2.5,
    fridge: { x0: 0.62, x1: 1.30, z0: 3.56, h: 1.80, handleX: 1.235, freezerY: 0.62, handle: [0.98, 1.64] },
    strip: { x: 1.045, y: 1.47, w: 0.052, h: 0.19, rot: -0.045 },          // the photo-booth strip under a red magnet (centre)
    note: { x: 0.80, y: 1.14, w: 0.11, h: 0.075, rot: 0.06 },               // a shopping note under a blue magnet
    kitchen: { x1: 0.60, z0: 2.55, y: 0.90 },                                // a short run along the left wall
    counter: { x0: 1.42, x1: 2.82, z0: 3.12, z1: 3.62, y: 0.92, t: 0.04 },  // the island he eats at, standing
    pendant: { x: 2.00, z: 3.92, rim: 1.98, top: 2.15, r: 0.19, rt: 0.05, bulb: 2.02 },   // over where he stands, close to the wall: B2's cone
    salt: { x: 2.22, z: 3.30, h: 0.10, r: 0.029 },                          // the seam of the counter view
    phoneSalt: { x: 2.35, z: 3.27 },                                        // where the phone leans on the salt (the empty half)
    pan: { x: 1.70, z: 3.36, r: 0.14 },
    rect: { x0: 2.70, x1: 3.18, y0: 1.52, y1: 1.90 }, nail: { x: 2.94, y: 1.948 },
    shelf: { x0: 2.66, x1: 3.30, y: 1.27, dep: 0.15, t: 0.03 },
    mugs: { his: 2.80, hers: 3.14, r: 0.042, h: 0.095, z: 4.125 },
    couch: { x0: 3.05, x1: 4.85, z0: 3.32, seat: 0.44, back: 0.86, arm: 0.62, armW: 0.13, backD: 0.26 },
    window: { z0: 3.20, z1: 4.00, y0: 0.95, y1: 2.25, mz: 3.60, my: 1.80 }, // on the right wall (X = w)
    door: { x0: 3.00, x1: 3.90, h: 2.04, leaf: 0.86 },                       // the front door, front wall (Z = 0), hinged at x0
    hooks: { x0: 2.28, x1: 2.62, y: 1.74 }, sw: { x: 2.80, y: 1.10 },
    stools: [{ x: 1.86, z: 2.82, rot: 0.5 }, { x: 2.46, z: 2.98, rot: 0 }],  // his pulled out, hers pushed in
    seamX: 2.70, floorSeam: 2.66,
    landing: { z: -1.8 },
    sun: [-0.92, -0.18, 0.34],                                              // daylight's direction of travel from the window
  };
  { const s = R.sun, l = Math.hypot(s[0], s[1], s[2]); R.sun = s.map(v => v / l); }
  R.couch.seatX0 = R.couch.x0 + R.couch.armW; R.couch.seatX1 = R.couch.x1 - R.couch.armW;
  R.couch.cw = (R.couch.seatX1 - R.couch.seatX0) / 3; R.couch.mid = (R.couch.seatX0 + R.couch.seatX1) / 2;
  R.phoneCushion = { x: R.couch.mid + 0.2, y: R.couch.seat + 0.02, z: 3.56 };  // on the cushion, just past the seam: where a head would be

  // =====================================================================================================================
  // CAMERA: pinhole, pitch 0, shifted lens; yaw 0 looks toward +Z (the back wall), yaw PI toward -Z (the front wall)
  // =====================================================================================================================
  function camera(o) {
    o = Object.assign({ cx: W / 2, cy: H / 2, yaw: 0, pitch: 0 }, o);
    const c = Math.cos(o.yaw), s = Math.sin(o.yaw), cp = Math.cos(o.pitch), sp = Math.sin(o.pitch);   // pitch < 0 looks down (only the couch's close plan uses it)
    const cs = q => { const dx = q[0] - o.x, dy = q[1] - o.y, dz = q[2] - o.z, x1 = dx * c - dz * s, z1 = dx * s + dz * c; return [x1, dy * cp - z1 * sp, dy * sp + z1 * cp]; };
    const pr = v => [o.cx + o.f * v[0] / v[2], o.cy - o.f * v[1] / v[2], v[2]];
    const p = (x, y, z) => { if (Array.isArray(x)) { z = x[2]; y = x[1]; x = x[0]; } const v = cs([x, y, z]); v[2] = Math.max(v[2], 0.02); return pr(v); };
    const depth = (x, y, z) => cs([x, y, z])[2];
    const k = (x, y, z) => o.f / Math.max(0.02, depth(x, y, z));
    // a world direction in the heads' and hands' view space (x right, y down, z toward the camera)
    const vdir = d => { const x = d[0] * c - d[2] * s, z1 = d[0] * s + d[2] * c, y = d[1] * cp - z1 * sp, z = d[1] * sp + z1 * cp; const l = Math.hypot(x, y, z) || 1; return [x / l, -y / l, -z / l]; };
    return { o, cs, pr, p, depth, k, vdir, f: o.f };
  }
  // world polygon -> screen polygon, clipped to the near plane and to the frame (plus a margin); null when nothing shows
  const MG = 240;
  function clipRect(pts) {
    let out = pts;
    for (const [ax, v, sg] of [[0, -MG, 1], [0, W + MG, -1], [1, -MG, 1], [1, H + MG, -1]]) {
      const inp = out; out = []; if (!inp.length) break;
      for (let i = 0; i < inp.length; i++) { const a = inp[i], b = inp[(i + 1) % inp.length], ai = (a[ax] - v) * sg >= 0, bi = (b[ax] - v) * sg >= 0;
        if (ai) out.push(a); if (ai !== bi) { const t = (v - a[ax]) / (b[ax] - a[ax]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
    }
    return out;
  }
  function scr(C, pts) {
    const N = 0.08, v = pts.map(C.cs), q = [];
    for (let i = 0; i < v.length; i++) { const a = v[i], b = v[(i + 1) % v.length], ai = a[2] >= N, bi = b[2] >= N;
      if (ai) q.push(a); if (ai !== bi) { const t = (N - a[2]) / (b[2] - a[2]); q.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, N]); } }
    if (q.length < 3) return null; const s2 = clipRect(q.map(C.pr)); return s2.length >= 3 ? s2 : null;
  }
  const shp = pts => S().poly(pts);
  const rough = k => clamp(k * 0.0017, 0.45, 2.4);              // the scissors' wobble grows with the piece's size on screen

  // =====================================================================================================================
  // LIGHT: one motivated light per time of day, cut into bands; colours are albedo x light level, kept between paper and ink
  // =====================================================================================================================
  // The pendant's light, as B2 draws it: on the walls a wedge whose straight sides converge toward the shade (one set of bands for every
  // vertical surface it reaches, wall and fridge alike); on the counter a soft pool, concentric ellipses under the shade. The outer band is
  // a faint soft glow, barely above the aubergine dark; the steps between bands are small; the brightness sits in a narrow warm core,
  // hottest just under the shade and just above the counter. Bands, outer to inner: half-width at the rim r0 and spread t (m per m of
  // drop); y0/y1 limit a band to a span of height (default: from the rim to the floor); soft = drawn as a blurred glow.
  const WEDGE = [
    { r0: 0.11, t: 1.05, lv: 'glow', soft: true },
    { r0: 0.07, t: 0.56, lv: 'mid' },
    { r0: 0.045, t: 0.3, lv: 'core' },
    { r0: 0.045, t: 0.3, lv: 'hot', y1: 1.56 },                     // just under the shade
    { r0: 0.045, t: 0.3, lv: 'foot', y0: 1.22 },                    // just above the counter, toward the pool
  ];
  const POOL = { rx: [1.0, 0.66, 0.4, 0.21], k: 0.42, z: 3.40 };  // the counter's pool: x radii outer to the hot core, z = x * k, centre z
  const LV = {
    night: { amb: [0.19, 0.166, 0.246], spill: [0.212, 0.182, 0.25], bands: [[0.3, 0.245, 0.27], [0.4, 0.32, 0.31], [0.52, 0.42, 0.37], [0.68, 0.545, 0.44]], wall: { glow: [0.212, 0.184, 0.248], mid: [0.262, 0.215, 0.245], core: [0.4, 0.31, 0.27], hot: [0.6, 0.455, 0.34], foot: [0.53, 0.405, 0.31] }, strip: [0.3, 0.25, 0.26],
      cold: [0.197, 0.182, 0.276], coldCore: [0.212, 0.198, 0.305], shadow: [0.13, 0.12, 0.18], warmDark: [0.25, 0.2, 0.22] },
    day: { steps: [[0.63, 0.67, 0.65], [0.71, 0.76, 0.73], [0.79, 0.84, 0.8]], pen: [0.9, 0.94, 0.9], sun: [1.03, 1.06, 0.99], shadow: [0.5, 0.54, 0.53] },
    dusk: { steps: [[0.3, 0.34, 0.48], [0.34, 0.39, 0.55], [0.39, 0.45, 0.62]], pen: [0.44, 0.5, 0.67], sun: [0.49, 0.55, 0.73], shadow: [0.22, 0.25, 0.37] },
  };
  const TOD = { night: 'night', later: 'night', morning: 'day', day: 'day', afternoon: 'day', evening: 'dusk', dusk: 'dusk' };
  const INK = [17, 20, 30], PAPER = [236, 227, 208];
  const hex = a => '#' + a.map((v, i) => clamp(Math.round(v), INK[i], PAPER[i]).toString(16).padStart(2, '0')).join('');
  const tone = (h, lv, m) => { const c = O.hexToRgb(h); m = m == null ? 1 : m; return hex(c.map((v, i) => v * lv[i] * m)); };
  const DAYX = [1.75, 3.05];                                       // daylight steps across the room: the kitchen dimmer, her half brighter
  function lights(tod) {
    const t = TOD[tod] || 'night', L = Object.assign({ tod: t }, LV[t]);
    L.night = t === 'night';
    return L;
  }
  // the light level at a world point (for small objects; big surfaces get exact band shapes)
  function levelAt(L, x, y, z, n) {
    if (L.night) {
      const P = R.pendant, top = P.rim - 0.01, vx = x - P.x;
      if (y >= top) return Math.hypot(vx, y - P.bulb, z - P.z) < 0.7 ? L.spill : L.amb;
      if (n && n[0] && n[0] * vx > 0.05) return L.amb;
      if (n && n[1] > 0.5) { const b = poolBand(x, y, z); return b >= 0 ? L.bands[b] : L.amb; }
      let lv = L.amb; WEDGE.forEach(B => { if (y <= (B.y0 || top) && y >= (B.y1 || -1) && Math.abs(vx) <= B.r0 + (top - y) * B.t) lv = L.wall[B.lv]; }); return lv;
    }
    return L.steps[x < DAYX[0] ? 0 : x < DAYX[1] ? 1 : 2];
  }
  // where a piece's lifted shadow falls (screen px per px of lift), away from the light
  function liftDir(L, C, x, y, z) {
    if (L.night) { const b = C.p(R.pendant.x, R.pendant.bulb, R.pendant.z), q = C.p(x, y, z); const dx = q[0] - b[0], dy = q[1] - b[1], l = Math.hypot(dx, dy) || 1; return [dx / l * 0.8, Math.max(0.35, dy / l)]; }
    const v = C.vdir(R.sun); return [v[0] * 0.9, 0.6];
  }

  // =====================================================================================================================
  // SURFACES: axis-aligned rectangles in the room. axis 'z': (x, y) at Z = v; 'x': (z, y) at X = v; 'y': (x, z) at Y = v.
  // n is the side the surface faces (+1 or -1 along its axis). Light falls on it in cut bands computed from the room's geometry.
  // =====================================================================================================================
  const P3 = (pl, a, b) => pl.axis === 'z' ? [a, b, pl.v] : pl.axis === 'x' ? [pl.v, b, a] : [a, pl.v, b];
  const plPts = (pl, a0, a1, b0, b1) => [[a0, b0], [a1, b0], [a1, b1], [a0, b1]].map(q => P3(pl, q[0], q[1]));
  // the wedge's band i on a vertical plane, as world points. z planes (walls, the fridge's door, seen as elevations): a trapezoid
  // hanging from the rim, straight sides. x planes (the fridge's side): lit below the height where the cone's edge reaches them.
  function wedgeRegion(pl, B) {
    const P = R.pendant, t = B.t, r0 = B.r0, rim = P.rim - 0.01, top = B.y0 || rim, yb = B.y1 != null ? B.y1 : Math.min(pl.b0, top) - 0.5; if (pl.b0 >= top || yb >= top) return null;
    if (pl.axis === 'z') { const w = y => r0 + (rim - y) * t; return [P3(pl, P.x - w(top), top), P3(pl, P.x + w(top), top), P3(pl, P.x + w(yb), yb), P3(pl, P.x - w(yb), yb)]; }
    const dx = Math.abs(pl.v - P.x) - r0, yc = Math.min(top, dx <= 0 ? top : rim - dx / t); if (yc <= Math.max(pl.b0, yb)) return null;
    return [P3(pl, pl.a0 - 1, yc), P3(pl, pl.a1 + 1, yc), P3(pl, pl.a1 + 1, yb), P3(pl, pl.a0 - 1, yb)];
  }
  // the pool's band i on a horizontal plane under the shade: an ellipse along the counter (the floor's is wider, under the lamp)
  function poolGeo(y) { const P = R.pendant, on = Math.abs(y - R.counter.y) < 0.08, s = on ? 1 : (P.rim - y) / (P.rim - R.counter.y); return { cx: P.x, cz: on ? POOL.z : P.z, s, kz: on ? POOL.k : 0.8 }; }
  function poolRegion(pl, i) {
    if (pl.v >= R.pendant.rim) return null; const q = poolGeo(pl.v), rx = POOL.rx[i] * q.s, rz = rx * q.kz, pts = [];
    for (let k = 0; k < 72; k++) { const u = k / 72 * Math.PI * 2; pts.push(P3(pl, q.cx + Math.cos(u) * rx, q.cz + Math.sin(u) * rz)); } return pts;
  }
  function poolBand(x, y, z) { const q = poolGeo(y); let b = -1; POOL.rx.forEach((r, i) => { const rx = r * q.s, rz = rx * q.kz; if (((x - q.cx) / rx) ** 2 + ((z - q.cz) / rz) ** 2 <= 1) b = i; }); return b; }
  // the shade's soft spill (its fabric glows): a disc of radius rs around the bulb, cut where it meets the plane
  function spillRegion(pl, rs) {
    const Pd = R.pendant, dd = pl.axis === 'z' ? pl.v - Pd.z : pl.axis === 'x' ? pl.v - Pd.x : pl.v - Pd.bulb; if (Math.abs(dd) >= rs) return null;
    const r = Math.sqrt(rs * rs - dd * dd), c = pl.axis === 'z' ? [Pd.x, Pd.bulb] : pl.axis === 'x' ? [Pd.z, Pd.bulb] : [Pd.x, Pd.z], pts = [];
    for (let i = 0; i < 48; i++) { const u = i / 48 * Math.PI * 2; pts.push(P3(pl, c[0] + Math.cos(u) * r, c[1] + Math.sin(u) * r * (pl.axis === 'y' ? 1 : 0.8))); }
    return pts;
  }
  // the window's light on a plane Z = zp: by day the sky's slant (falling), by night the streetlight's (rising from the street).
  // Returns {quad, mullion, transom} in world points.
  function windowLight(zp, night, grow) {
    const Wn = R.window, s = night ? [-0.75, 0.2, 0.45] : R.sun; const l = Math.hypot(s[0], s[1], s[2]); const d = s.map(v => v / l); grow = grow || 0;
    const at = (z, y) => { const t = (zp - z) / d[2]; return [R.w + d[0] * t, y + d[1] * t, zp]; };
    if (zp <= Wn.z0) return null;
    const z0 = Wn.z0 - grow, z1 = Math.min(zp - 0.01, Wn.z1 + grow), y0 = Wn.y0 - grow, y1 = Wn.y1 + grow, bw = 0.012 + grow * 0.2;
    return { quad: [at(z0, y0), at(z1, y0), at(z1, y1), at(z0, y1)],
      mullion: [at(Wn.mz - bw, y0), at(Wn.mz + bw, y0), at(Wn.mz + bw, y1), at(Wn.mz - bw, y1)],
      transom: [at(z0, Wn.my - bw), at(z1, Wn.my - bw), at(z1, Wn.my + bw), at(z0, Wn.my + bw)] };
  }
  const fillW = (g, C, pts, col, rg, seed) => { if (!pts) return null; const q = scr(C, pts); if (!q) return null; const p = shp(q).path(rg, seed); g.fillStyle = col; g.fill(p); return p; };
  // draw a surface: base light, the pendant's bands (night), the window's light (cold by night, the slant by day), the day's steps
  // o: {n, gain (band strength), sun (receives the window's light), seed, tex, kind, rough, dark (multiplier for a face turned away)}
  function surface(g, C, L, pl, albedo, o) {
    o = o || {};
    if (o.n && ((pl.axis === 'z' ? C.o.z : pl.axis === 'x' ? C.o.x : C.o.y) - pl.v) * o.n <= 0) return null;   // turned away from the camera
    const q = scr(C, plPts(pl, pl.a0, pl.a1, pl.b0, pl.b1)); if (!q) return null;
    const seed = o.seed || 5, kc = C.k(...P3(pl, (pl.a0 + pl.a1) / 2, (pl.b0 + pl.b1) / 2));
    const path = shp(q).path(o.rough == null ? rough(kc) * 0.6 : o.rough, seed);
    const m = o.dark == null ? 1 : o.dark, rg = clamp(kc * 0.006, 1.2, 4.5);
    const big = (a0, a1, b0, b1) => plPts(pl, a0, a1, b0, b1);
    g.save(); g.clip(path);
    if (L.night) {
      const Pd = R.pendant, facing = o.lamp !== false && (pl.axis === 'y' ? (pl.v < Pd.bulb ? o.n !== -1 : o.n === -1) : pl.axis === 'z' ? (o.n || -1) < 0 : (o.n || -1) * (Pd.x - pl.v) > 0);
      g.fillStyle = tone(albedo, o.nightLevel || o.level || L.amb, m); g.fill(path);
      if (o.cold && pl.axis === 'z') { const wl = windowLight(pl.v, true, 0.06), wc = windowLight(pl.v, true, 0);
        if (wl) { fillW(g, C, wl.quad, tone(albedo, L.cold, m), rg, seed + 31); fillW(g, C, wc.quad, tone(albedo, L.coldCore, m), rg, seed + 32);
          fillW(g, C, wc.mullion, tone(albedo, L.cold, m), rg * 0.4, seed + 33); fillW(g, C, wc.transom, tone(albedo, L.cold, m), rg * 0.4, seed + 34); } }
      if (facing && o.spill !== false && pl.axis === 'y' && pl.v > Pd.bulb) fillW(g, C, spillRegion(pl, 1.0), tone(albedo, L.spill, m), rg, seed + 7);   // the open top of the shade: a warm disc on the ceiling
      const gn = o.gain == null ? 1 : o.gain, boost = lv => lv.map((v, c) => L.amb[c] + (v - L.amb[c]) * gn);
      if (facing && pl.axis === 'y') L.bands.forEach((lv, i) => fillW(g, C, poolRegion(pl, i), tone(albedo, boost(lv), m), rg, seed + 11 + i));
      else if (facing) WEDGE.forEach((B, i) => { const col = tone(albedo, boost(L.wall[B.lv]), m);
        if (B.soft) { g.save(); g.filter = `blur(${clamp(kc * 0.05, 6, 40)}px)`; fillW(g, C, wedgeRegion(pl, B), col, 0, seed + 11 + i); g.restore(); }   // a glow, not a shape
        else fillW(g, C, wedgeRegion(pl, B), col, rg * 1.1, seed + 11 + i); });
      if (o.shadowPts) o.shadowPts.forEach((sp, i) => fillW(g, C, sp, tone(albedo, L.shadow, m), rg * 0.7, seed + 50 + i));
    } else {
      g.fillStyle = tone(albedo, o.level || L.steps[0], m); g.fill(path);
      if (!o.level && pl.axis !== 'x') DAYX.forEach((x0, i) => {
        const pts = pl.axis === 'z' ? [P3(pl, x0 + 0.07, pl.b1 + 1), P3(pl, pl.a1 + 1, pl.b1 + 1), P3(pl, pl.a1 + 1, pl.b0 - 1), P3(pl, x0 - 0.07, pl.b0 - 1)]
          : [P3(pl, x0 + 0.05, pl.b0 - 1), P3(pl, pl.a1 + 1, pl.b0 - 1), P3(pl, pl.a1 + 1, pl.b1 + 1), P3(pl, x0 - 0.05, pl.b1 + 1)];
        fillW(g, C, pts, tone(albedo, L.steps[i + 1], m), rg, seed + 21 + i); });
      if (o.sun && pl.axis === 'z') { const wp = windowLight(pl.v, false, 0.07), wc = windowLight(pl.v, false, 0);
        if (wp) { fillW(g, C, wp.quad, tone(albedo, L.pen, m), rg, seed + 41); fillW(g, C, wc.quad, tone(albedo, L.sun, m), rg, seed + 42);
          // the two thin mullion shadows
          fillW(g, C, wc.mullion, tone(albedo, L.pen, m * 0.97), rg * 0.35, seed + 43); fillW(g, C, wc.transom, tone(albedo, L.pen, m * 0.97), rg * 0.35, seed + 44); } }
      if (o.shadowPts) o.shadowPts.forEach((sp, i) => fillW(g, C, sp, tone(albedo, L.shadow, m), rg * 0.7, seed + 50 + i));
    }
    g.restore();
    if (o.tex !== 0) G.texture(g, path, o.tex == null ? 0.5 : o.tex, seed, o.kind || 'paper');
    return path;
  }
  // a small box face lit as one piece (cut paper with lift): pts in world, level from levelAt, face multiplier m
  function face(g, C, L, pts, albedo, o) {
    o = o || {}; const q = scr(C, pts); if (!q) return null;
    const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
    if (o.n && o.cull !== false && (o.n[0] * (C.o.x - c[0]) + o.n[1] * (C.o.y - c[1]) + o.n[2] * (C.o.z - c[2])) <= 0) return null;
    const k = C.k(c[0], c[1], c[2]), lv = o.lv || levelAt(L, c[0], c[1], c[2], o.n);
    const ld = o.lift ? liftDir(L, C, c[0], c[1], c[2]) : null, lk = o.lift ? o.lift * k : 0;
    return G.piece(g, shp(q), { fill: tone(albedo, lv, o.m), rough: o.rough == null ? rough(k) : o.rough, seed: o.seed || 9, tex: o.tex == null ? 0.5 : o.tex, kind: o.kind || 'paper',
      lift: o.lift ? [ld[0] * lk, ld[1] * lk] : null, liftAlpha: o.la == null ? 0.5 : o.la, liftBlur: o.lift ? clamp(lk * 0.9, 1.5, 16) : 0 });
  }

  // ---------------------------------------------------------------- outside the window (a real view: grain, banded), one canvas per time of day
  const _views = {};
  function outside(tod) {
    if (_views[tod]) return _views[tod];
    const w = 360, h = 585, c = O.makeCanvas(w, h), g = c.getContext('2d'), r = O.rng('city' + tod), full = new Path2D(); full.rect(0, 0, w, h);
    const sky = tod === 'night' ? ['#101626', '#141C30', '#1A2440'] : tod === 'dusk' ? ['#33466E', '#4A5E8A', '#7183AA'] : ['#AEB3AC', '#BCC0B8', '#C9CCC3'];
    sky.forEach((col, i) => { g.fillStyle = col; g.fill(S().rect(-20, h * (i / 3) - 10, w + 40, h).path(2.5, 60 + i)); });
    // the building opposite: a block of flats, its windows; a lower roofline behind it
    const bld = tod === 'night' ? '#0C111D' : tod === 'dusk' ? '#26304A' : '#8B8E88', bldD = tod === 'night' ? '#0A0E18' : tod === 'dusk' ? '#1D2539' : '#767A75';
    g.fillStyle = bldD; g.fill(S().poly([[-20, h * 0.36], [w * 0.4, h * 0.36], [w * 0.4, h * 0.3], [w + 20, h * 0.3], [w + 20, h + 20], [-20, h + 20]]).path(1.5, 70));
    g.fillStyle = bld; g.fill(S().poly([[-20, h * 0.46], [w * 0.7, h * 0.43], [w + 20, h * 0.43], [w + 20, h + 20], [-20, h + 20]]).path(1.5, 71));
    for (let j = 0; j < 7; j++) for (let i = 0; i < 6; i++) {
      const x = 14 + i * 58, y = h * 0.5 + j * 46; if (y > h) continue; const lit = r();
      let col = tod === 'day' ? (lit < 0.2 ? '#9EA19A' : '#5F635F') : tod === 'dusk' ? (lit < 0.25 ? '#D9A55A' : '#1A2133') : (lit < 0.4 ? (r() < 0.75 ? '#C99A52' : '#7E95B8') : '#0E1320');
      g.fillStyle = col; g.fill(S().rect(x, y, 30, 24).path(0.6, 80 + i + j * 7));
    }
    G.texture(g, full, 0.55, 'sky' + tod, 'paper');
    return (_views[tod] = c);
  }
  // map a canvas onto a quad of screen points [tl, tr, br, bl] (bilinear)
  const onQuad = (g, img, q) => G.warp(g, img, q, 6, 10);

  // =====================================================================================================================
  // OBJECTS
  // =====================================================================================================================
  const WALL = '#93918A', PALE = '#C0BEB4';
  const Z = (v, a0, a1, b0, b1) => ({ axis: 'z', v, a0, a1, b0, b1 }), X = (v, a0, a1, b0, b1) => ({ axis: 'x', v, a0, a1, b0, b1 }), Y = (v, a0, a1, b0, b1) => ({ axis: 'y', v, a0, a1, b0, b1 });
  // the screen ellipse of a horizontal circle
  function hEll(C, x, y, z, r) { const c = C.p(x, y, z), a = C.p(x - r, y, z), b = C.p(x + r, y, z), f = C.p(x, y, z - r), n = C.p(x, y, z + r);
    return { x: c[0], y: c[1], rx: Math.abs(b[0] - a[0]) / 2, ry: Math.max(0.6, Math.abs(f[1] - n[1]) / 2), k: C.k(x, y, z), above: C.o.y > y }; }
  const lineW = (g, C, a, b, col, w) => { const p = C.p(a), q = C.p(b); if (p[2] < 0.1 || q[2] < 0.1) return; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); };
  const softShadow = (g, C, pts, col, blur) => { const q = scr(C, pts); if (!q) return; g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = col; g.fill(shp(q).path(1, 3)); g.restore(); };
  const shadowCol = L => L.night ? 'rgba(8,6,12,0.55)' : L.tod === 'dusk' ? 'rgba(14,18,34,0.45)' : 'rgba(40,42,46,0.4)';
  const fwd = C => C.o.yaw === 0;

  // ---------------------------------------------------------------- the shell: ceiling, floors, walls, the pale rectangle and its nail
  function shell(g, C, L) {
    surface(g, C, L, Y(R.h, 0, R.w, -0.2, R.d), '#A4A29B', { n: -1, seed: 101, tex: 0.35, dark: 0.82 });
    // the floor: kitchen tiles to the seam, boards beyond; the counter's shadow under the lamp
    const P = R.pendant, K = R.counter, t = P.bulb / (P.bulb - K.y);
    const csh = [[K.x0, K.z0], [K.x1, K.z0], [K.x1, K.z1], [K.x0, K.z1]].map(([x, z]) => [P.x + (x - P.x) * t, 0, P.z + (z - P.z) * t]);
    const tiles = surface(g, C, L, Y(0, 0, R.floorSeam, -0.2, R.d), "#8C8982", { n: 1, seed: 102, kind: "card", shadowPts: L.night ? [csh] : null });
    const boards = surface(g, C, L, Y(0, R.floorSeam, R.w, -0.2, R.d), "#7E6B59", { n: 1, seed: 103, kind: "card", shadowPts: L.night ? [csh] : null });
    const lc = L.night ? 'rgba(6,4,8,0.35)' : 'rgba(30,26,22,0.28)';
    if (tiles) { g.save(); g.clip(tiles); for (let x = 0.3; x < R.floorSeam; x += 0.3) lineW(g, C, [x, 0, Math.max(0.05, C.o.z + 0.3)], [x, 0, R.d], lc, 1.2); for (let z = 0.3; z < R.d; z += 0.3) if (C.depth(1, 0, z) > 0.3) lineW(g, C, [0, 0, z], [R.floorSeam, 0, z], lc, 1.2); g.restore(); }
    if (boards) { g.save(); g.clip(boards); for (let x = R.floorSeam + 0.13; x < R.w; x += 0.13) lineW(g, C, [x, 0, Math.max(0.05, C.o.z + 0.3)], [x, 0, R.d], lc, 1.4); g.restore(); }
    lineW(g, C, [R.floorSeam, 0.002, Math.max(0.05, C.o.z + 0.3)], [R.floorSeam, 0.002, R.d], L.night ? 'rgba(150,120,90,0.35)' : 'rgba(200,190,170,0.45)', 2.5);
    surface(g, C, L, X(0, -0.2, R.d, 0, R.h), WALL, { n: 1, seed: 104, dark: 0.9 });
    surface(g, C, L, X(R.w, -0.2, R.d, 0, R.h), WALL, { n: -1, seed: 105, dark: 0.84 });
    if (fwd(C)) {
      surface(g, C, L, Z(R.d, 0, R.w, 0, R.h), WALL, { n: -1, seed: 106, cold: true, sun: true });
      // the pale rectangle: the grime around where the frame hung, then the clean wall inside it, and the nail
      const r = R.rect, q = scr(C, plPts(Z(R.d), r.x0, r.x1, r.y0, r.y1));
      if (q) { const k = C.k(r.x0, r.y0, R.d), pth = shp(q).path(0.35, 8);
        g.save(); g.filter = `blur(${clamp(k * 0.02, 2, 22)}px)`; g.strokeStyle = L.night ? 'rgba(8,6,12,0.55)' : 'rgba(52,50,46,0.34)'; g.lineWidth = clamp(k * 0.05, 4, 50); g.stroke(pth); g.restore();
        surface(g, C, L, Z(R.d - 0.0004, r.x0, r.x1, r.y0, r.y1), PALE, { n: -1, seed: 107, cold: true, sun: true, rough: 0.35, tex: 0.32, dark: L.night ? 1.35 : 1 });
        const nl = C.p(R.nail.x, R.nail.y, R.d - 0.004), nr = clamp(0.0042 * k, 1.6, 12), ld = liftDir(L, C, R.nail.x, R.nail.y, R.d);
        g.fillStyle = shadowCol(L); g.beginPath(); g.ellipse(nl[0] + ld[0] * nr * 1.6, nl[1] + ld[1] * nr * 1.6, nr * 1.4, nr * 0.8, 0.5, 0, 7); g.fill();
        g.fillStyle = tone('#4A4240', levelAt(L, R.nail.x, R.nail.y, R.d)); g.beginPath(); g.arc(nl[0], nl[1], nr, 0, 7); g.fill();
        g.fillStyle = tone('#E8D8C0', levelAt(L, R.nail.x, R.nail.y, R.d)); g.beginPath(); g.arc(nl[0] - nr * 0.3, nl[1] - nr * 0.3, nr * 0.35, 0, 7); g.fill(); }
      // skirting
      face(g, C, L, plPts(Z(R.d - 0.012), 0, R.w, 0, 0.08), '#A19E96', { n: [0, 0, -1], seed: 108, tex: 0.3 });
    }
  }
  // ---------------------------------------------------------------- the window on the right wall, and the world outside it
  function windowPiece(g, C, L) {
    const Wn = R.window, x = R.w - 0.002, corners = [[x, Wn.y1, Wn.z1], [x, Wn.y1, Wn.z0], [x, Wn.y0, Wn.z0], [x, Wn.y0, Wn.z1]];
    if (corners.some(c => C.depth(c[0], c[1], c[2]) < 0.15) || C.o.x > R.w - 0.05) return null;
    const q = corners.map(c => C.p(c)), qp = new Path2D(); q.forEach((p, i) => i ? qp.lineTo(p[0], p[1]) : qp.moveTo(p[0], p[1])); qp.closePath();
    // the far reveal (the wall's depth), seen past the frame
    face(g, C, L, [[R.w - 0.14, Wn.y0, Wn.z1], [R.w, Wn.y0, Wn.z1], [R.w, Wn.y1, Wn.z1], [R.w - 0.14, Wn.y1, Wn.z1]], WALL, { lv: L.night ? L.amb : L.steps[1], seed: 111, tex: 0.4 });
    g.save(); g.clip(qp); onQuad(g, outside(L.tod), q.map(p => [p[0], p[1]])); g.restore();
    const fr = '#C6C2B7', lv = L.night ? L.amb.map(v => v * 1.1) : L.steps[0].map(v => v * 0.85);
    const bar = (z0, z1, y0, y1, s) => face(g, C, L, [[x - 0.01, y0, z0], [x - 0.01, y0, z1], [x - 0.01, y1, z1], [x - 0.01, y1, z0]], fr, { lv, seed: s, tex: 0.35, rough: 0.6 });
    const b = 0.05, m = 0.018;
    bar(Wn.z0, Wn.z1, Wn.y1 - b, Wn.y1, 112); bar(Wn.z0, Wn.z1, Wn.y0, Wn.y0 + b, 113); bar(Wn.z0, Wn.z0 + b, Wn.y0, Wn.y1, 114); bar(Wn.z1 - b, Wn.z1, Wn.y0, Wn.y1, 115);
    bar(Wn.mz - m, Wn.mz + m, Wn.y0, Wn.y1, 116); bar(Wn.z0, Wn.z1, Wn.my - m, Wn.my + m, 117);
    // the sill
    face(g, C, L, [[R.w - 0.15, Wn.y0, Wn.z0 - 0.05], [R.w - 0.15, Wn.y0, Wn.z1 + 0.04], [R.w, Wn.y0, Wn.z1 + 0.04], [R.w, Wn.y0, Wn.z0 - 0.05]], '#BDB9AE', { n: [0, 1, 0], lv: L.night ? L.amb : L.steps[2], seed: 118, tex: 0.4, lift: 0.01 });
    face(g, C, L, [[R.w - 0.15, Wn.y0 - 0.035, Wn.z0 - 0.05], [R.w - 0.15, Wn.y0 - 0.035, Wn.z1 + 0.04], [R.w - 0.15, Wn.y0, Wn.z1 + 0.04], [R.w - 0.15, Wn.y0, Wn.z0 - 0.05]], '#A9A59B', { lv: L.night ? L.amb : L.steps[0], seed: 119, tex: 0.4 });
    return q;
  }
  // ---------------------------------------------------------------- the fridge, the strip under its magnet, a note
  // the photo-booth strip: the same two people as the rig, painted by the phone's photograph painter in 'flash' mode (PHONE.strip)
  let _strip = null; const stripCanvas = () => _strip || (_strip = (window.PHONE && PHONE.strip ? PHONE.strip : G.photoStrip)({ w: 240, h: 876, seed: 3, scale: 1.3 }));
  function stripPiece(g, C, L, exposure) {
    const s = R.strip, z = R.fridge.z0 - 0.003, cr = Math.cos(s.rot), sr = Math.sin(s.rot);
    const at = (u, v) => C.p(s.x + u * cr - v * sr, s.y + u * sr + v * cr, z);
    const tl = at(-s.w / 2, s.h / 2), tr = at(s.w / 2, s.h / 2), bl = at(-s.w / 2, -s.h / 2), br = at(s.w / 2, -s.h / 2), k = C.k(s.x, s.y, z);
    if (tl[2] < 0.1) return null;
    const l0 = levelAt(L, s.x, s.y, z, [0, 0, -1]), img = stripCanvas(), ld = liftDir(L, C, s.x, s.y, z);
    const lv = (L.night ? l0.map((v, c) => Math.max(L.strip[c], L.amb[c] + (v - L.amb[c]) * 1.6)) : l0).map(v => v * (exposure || 1));   // the print catches the lamp's spill
    const quad = new Path2D(); [tl, tr, br, bl].forEach((p, i) => i ? quad.lineTo(p[0], p[1]) : quad.moveTo(p[0], p[1])); quad.closePath();
    g.save(); g.filter = `blur(${clamp(k * 0.003, 1, 8)}px)`; g.translate(ld[0] * k * 0.004, ld[1] * k * 0.004); g.fillStyle = 'rgba(12,10,12,0.5)'; g.fill(quad); g.restore();
    g.save(); g.setTransform((tr[0] - tl[0]) / img.width, (tr[1] - tl[1]) / img.width, (bl[0] - tl[0]) / img.height, (bl[1] - tl[1]) / img.height, tl[0], tl[1]);
    g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0); g.restore();
    // a print takes the room's light: multiplied by it, never glowing
    g.save(); g.clip(quad); g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgb(${lv.map(v => clamp(Math.round(v * 255), 0, 255)).join(',')})`; g.fill(quad); g.restore();
    // a slight curl: the bottom edge lifts and catches the light
    g.save(); g.strokeStyle = tone('#F2EEE4', lv); g.globalAlpha = 0.5; g.lineWidth = clamp(k * 0.0015, 0.8, 4); g.beginPath(); g.moveTo(bl[0], bl[1]); g.lineTo(br[0], br[1]); g.stroke(); g.restore();
    // the red magnet
    const mg = at(0.002, s.h / 2 - 0.004), mr = 0.0115 * k;
    g.save(); g.filter = `blur(${clamp(k * 0.003, 1, 8)}px)`; g.fillStyle = 'rgba(12,8,10,0.5)'; g.beginPath(); g.ellipse(mg[0] + ld[0] * mr * 0.5, mg[1] + ld[1] * mr * 0.6, mr, mr * 0.9, 0, 0, 7); g.fill(); g.restore();
    g.fillStyle = tone('#B23A30', lv.map(v => Math.min(1.25, v * 1.15))); g.beginPath(); g.ellipse(mg[0], mg[1], mr, mr * 0.9, 0, 0, 7); g.fill();
    g.fillStyle = tone('#F0B8A0', lv); g.globalAlpha = 0.6; g.beginPath(); g.ellipse(mg[0] - mr * 0.35, mg[1] - mr * 0.35, mr * 0.35, mr * 0.25, -0.4, 0, 7); g.fill(); g.globalAlpha = 1;
    return { tl, tr, bl, br, k };
  }
  function fridge(g, C, L, st, sh) {
    const F = R.fridge;
    if (!fwd(C)) return;
    softShadow(g, C, plPts(Z(R.d - 0.002), F.x1 - 0.02, F.x1 + 0.09, 0, F.h + 0.02), shadowCol(L), clamp(C.k(F.x1, 1, R.d) * 0.03, 3, 20));
    { const ld = liftDir(L, C, (F.x0 + F.x1) / 2, 1, F.z0), kb = C.k(F.x1, 1, R.d); softShadow(g, C, plPts(Z(R.d - 0.003), F.x0 + ld[0] * 0.07, F.x1 + ld[0] * 0.07 + 0.03, 0, F.h + 0.03), shadowCol(L), clamp(kb * 0.025, 3, 18));
      softShadow(g, C, plPts(Y(0.002), F.x0 - 0.02, F.x1 + 0.05, F.z0 - 0.06, R.d), shadowCol(L), clamp(kb * 0.02, 3, 14)); }
    if (C.o.x > F.x1) surface(g, C, L, X(F.x1, F.z0, R.d, 0.02, F.h), '#D0CABC', { n: 1, seed: 121, dark: L.night ? 0.95 : 0.84, kind: 'card', gain: 1.6 });
    if (C.o.x < F.x0) surface(g, C, L, X(F.x0, F.z0, R.d, 0.02, F.h), '#C4BFB3', { n: -1, seed: 123, dark: 0.75, kind: 'card' });
    if (C.o.y > F.h) face(g, C, L, plPts(Y(F.h), F.x0, F.x1, F.z0, R.d), '#BDB8AC', { n: [0, 1, 0], seed: 124, tex: 0.4 });
    surface(g, C, L, Z(F.z0, F.x0, F.x1, 0.02, F.h), '#DED8CA', { n: -1, seed: 122, kind: 'card', gain: 1.6, tex: 0.5, dark: L.night ? 1 : 1.1, rough: 0.9 });
    { const lvE = levelAt(L, F.x1, 1.0, F.z0, [1, 0, 0]).map(v => v * (L.night ? 1.5 : 1.2));   // the lit corner, and the top edge
      face(g, C, L, plPts(Z(F.z0 - 0.002), F.x1 - 0.014, F.x1, 0.03, F.h - 0.01), '#E6DFD0', { lv: lvE, seed: 128, tex: 0.3, rough: 0.5 });
      face(g, C, L, plPts(Z(F.z0 - 0.002), F.x0 + 0.01, F.x1 - 0.01, F.h - 0.012, F.h), '#E6DFD0', { lv: lvE.map(v => v * 0.9), seed: 129, tex: 0.3, rough: 0.5 }); }
    const k = C.k(F.x1, 1, F.z0), dk = 'rgba(30,24,22,0.5)';
    // the door's seal and the freezer below; the handles
    lineW(g, C, [F.x0 + 0.012, F.freezerY, F.z0 - 0.002], [F.x1 - 0.012, F.freezerY, F.z0 - 0.002], dk, clamp(k * 0.004, 1, 5));
    lineW(g, C, [F.x0 + 0.012, F.h - 0.012, F.z0 - 0.002], [F.x1 - 0.012, F.h - 0.012, F.z0 - 0.002], 'rgba(30,24,22,0.25)', clamp(k * 0.003, 1, 4));
    [F.handle, [0.44, 0.56]].forEach(([y0, y1], i) => { const a = C.p(F.handleX, y0, F.z0 - 0.03), b = C.p(F.handleX, y1, F.z0 - 0.03), r = 0.011 * k;
      const lv = levelAt(L, F.handleX, (y0 + y1) / 2, F.z0, [0, 0, -1]);
      const hp = G.piece(g, S().capsule(a[0], a[1], r, b[0], b[1], r), { fill: tone('#8E867A', lv), rough: 0.5, seed: 125 + i, tex: 0.3, lift: [r * 0.6, r * 0.5], liftAlpha: 0.45, liftBlur: r * 0.6 });
      G.crescent(g, hp, -r * 0.5, 0, tone('#F0E4CE', lv), 0.8); });
    // a shopping note under a blue magnet (scribbled lines, nothing legible)
    { const n = R.note, cr = Math.cos(n.rot), sr = Math.sin(n.rot), at = (u, v) => [n.x + u * cr - v * sr, n.y + u * sr + v * cr, F.z0 - 0.003];
      const pts = [at(-n.w / 2, n.h / 2), at(n.w / 2, n.h / 2), at(n.w / 2, -n.h / 2), at(-n.w / 2, -n.h / 2)];
      const lv = levelAt(L, n.x, n.y, F.z0, [0, 0, -1]), np = face(g, C, L, pts, '#DCD2BC', { lv, seed: 127, tex: 0.5, lift: 0.004, la: 0.4 });
      if (np) { g.save(); g.clip(np); g.strokeStyle = tone('#6E6052', lv); g.lineWidth = clamp(k * 0.0022, 0.8, 3); g.lineCap = 'round';
        [0, 1, 2].forEach(i => { const a = C.p(at(-n.w * 0.36, n.h * 0.18 - i * 0.02)), b = C.p(at(n.w * (0.3 - i * 0.12), n.h * 0.16 - i * 0.02)); g.beginPath(); g.moveTo(a[0], a[1]); for (let j = 1; j <= 8; j++) { const u = j / 8; g.lineTo(lerp(a[0], b[0], u), lerp(a[1], b[1], u) + Math.sin(j * 2.1 + i) * k * 0.0012); } g.stroke(); }); g.restore(); }
      const mp = C.p(at(0, n.h / 2 - 0.004)), mr = 0.0095 * k; g.fillStyle = tone('#3B5A7A', lv.map(v => v * 1.1)); g.beginPath(); g.arc(mp[0], mp[1], mr, 0, 7); g.fill();
      g.fillStyle = tone('#A8C0D8', lv); g.globalAlpha = 0.5; g.beginPath(); g.arc(mp[0] - mr * 0.3, mp[1] - mr * 0.3, mr * 0.3, 0, 7); g.fill(); g.globalAlpha = 1; }
    sh.strip = stripPiece(g, C, L, sh.exposureStrip);
  }
  // ---------------------------------------------------------------- the kitchen run along the left wall (seen only from the wide view)
  function kitchenRun(g, C, L) {
    const K = R.kitchen; if (!fwd(C) || C.o.x < K.x1) return;
    surface(g, C, L, X(0.36, K.z0, R.d, 1.45, 2.18), '#B4AFA4', { n: 1, seed: 131, dark: 0.8, kind: 'card' });
    face(g, C, L, plPts(Y(1.45), 0, 0.36, K.z0, R.d), '#8E8A82', { n: [0, -1, 0], seed: 132, tex: 0.4 });
    surface(g, C, L, X(K.x1, K.z0, R.d, 0.1, K.y - 0.04), '#9C978C', { n: 1, seed: 133, dark: 0.82, kind: 'card' });
    face(g, C, L, plPts(Y(K.y), 0, K.x1 + 0.02, K.z0, R.d), '#B39B83', { n: [0, 1, 0], seed: 134, tex: 0.45 });
    face(g, C, L, plPts(X(K.x1 + 0.02), K.z0, R.d, K.y - 0.04, K.y), '#C2A98E', { n: [1, 0, 0], seed: 135, tex: 0.4 });
    for (let z = K.z0 + 0.55; z < R.d; z += 0.55) { lineW(g, C, [K.x1 + 0.002, 0.12, z], [K.x1 + 0.002, K.y - 0.06, z], 'rgba(20,16,14,0.35)', 1.5); lineW(g, C, [0.362, 1.47, z], [0.362, 2.16, z], 'rgba(20,16,14,0.3)', 1.5); }
  }
  // ---------------------------------------------------------------- the counter, the salt, the pan
  function saltPiece(g, C, L) {
    const s = R.salt, y0 = R.counter.y, e = hEll(C, s.x, y0, s.z, s.r), t = C.p(s.x, y0 + s.h, s.z), k = e.k, r = e.rx, lv = levelAt(L, s.x, y0 + 0.05, s.z, [0, 1, 0]);
    if (C.depth(s.x, y0, s.z) < 0.15) return;
    const ld = liftDir(L, C, s.x, y0, s.z);
    const body = S().M(t[0] - r, t[1]).L(e.x - r * 0.97, e.y).Q(e.x, e.y + e.ry * 2, e.x + r * 0.97, e.y).L(t[0] + r, t[1]).Z();
    const sp = G.piece(g, body, { fill: tone('#7C7A82', lv), rough: 0.4, seed: 141, tex: 0.3, lift: [ld[0] * k * 0.006, ld[1] * k * 0.004], liftAlpha: 0.5, liftBlur: k * 0.004 });
    g.save(); g.clip(sp); g.fillStyle = tone('#E2DCCF', lv); g.fillRect(e.x - r * 1.2, lerp(t[1], e.y, 0.42), r * 2.4, r * 6); g.fillStyle = tone('#EDE5D6', lv); g.globalAlpha = 0.45; g.fillRect(e.x + r * 0.45, t[1], r * 0.22, e.y - t[1]); g.restore();
    G.specks(g, sp, [e.x - r, lerp(t[1], e.y, 0.42), r * 2, e.y - t[1]], 26, tone('#F4ECDD', lv), 'saltgrain', 0.9, 0.6);
    const cap = S().M(t[0] - r * 1.02, t[1] + 0.004 * k).L(t[0] - r * 0.92, t[1] - 0.026 * k).L(t[0] + r * 0.92, t[1] - 0.026 * k).L(t[0] + r * 1.02, t[1] + 0.004 * k).Z();
    const cp = G.piece(g, cap, { fill: tone('#9C968E', lv), rough: 0.4, seed: 142, tex: 0.3 }); G.crescent(g, cp, 0, -Math.max(1, 0.004 * k), tone('#EADCC6', lv), 0.8);
  }
  // the pan: rim, the dark inside, the half-eaten pasta, the handle (exported for the sequences: SETS.living.pan)
  function drawPan(g, x, y, rx, ry, o) {
    o = o || {}; const lv = o.lv || [1, 1, 1], hd = o.handle == null ? Math.PI * 0.97 : o.handle, T = c => tone(c, lv);
    const hx0 = x + Math.cos(hd) * rx * 0.92, hy0 = y + Math.sin(hd) * ry * 0.92, hx1 = x + Math.cos(hd) * rx * 2.05, hy1 = y + Math.sin(hd) * ry * 2.05 + ry * 0.08;
    const hp = G.piece(g, S().capsule(hx0, hy0, ry * 0.2, hx1, hy1, ry * 0.17), { fill: T('#1E1A1C'), rough: 0.6, seed: 151, tex: 0.4, lift: [rx * 0.02, ry * 0.12], liftAlpha: 0.5, liftBlur: ry * 0.08 });
    G.crescent(g, hp, 0, -ry * 0.07, T('#8A7A70'), 0.8);
    const rp = G.piece(g, S().ellipse(x, y, rx, ry, -0.02), { fill: T('#2A2628'), rough: 0.7, seed: 152, tex: 0.5, lift: [rx * 0.03, ry * 0.2], liftAlpha: 0.6, liftBlur: ry * 0.14 });
    G.crescent(g, rp, 0, -ry * 0.09, T('#A89686'), 0.9);
    G.piece(g, S().ellipse(x, y + ry * 0.03, rx * 0.92, ry * 0.86, -0.02), { fill: T('#171416'), rough: 0.6, seed: 153, tex: 0.4 });
    G.piece(g, S().ellipse(x + rx * 0.01, y + ry * 0.15, rx * 0.84, ry * 0.68, -0.02), { fill: T('#2E2A2C'), rough: 0.6, seed: 154, tex: 0.5 });
    if (o.food !== false) {
      const fp = G.piece(g, G.blob([[x - rx * 0.72, y + ry * 0.24], [x - rx * 0.45, y - ry * 0.2], [x + rx * 0.06, y - ry * 0.34], [x + rx * 0.56, y - ry * 0.1], [x + rx * 0.72, y + ry * 0.24], [x + rx * 0.34, y + ry * 0.6], [x - rx * 0.4, y + ry * 0.6]]), { fill: T('#A2452C'), rough: 1.1, seed: 155, tex: 0.6 });
      g.save(); g.clip(fp); const r = O.rng('pasta'); g.lineCap = 'round';
      for (let i = 0; i < 36; i++) { const px = x - rx * 0.75 + r() * rx * 1.5, py = y - ry * 0.4 + r() * ry; g.strokeStyle = r() < 0.55 ? T('#EEC47C') : T('#6E2416'); g.lineWidth = Math.max(1, rx * 0.022); g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + rx * 0.11, py - ry * 0.13 + r() * ry * 0.26, px + rx * 0.19, py + (r() - 0.5) * ry * 0.17); g.stroke(); }
      g.restore(); G.crescent(g, fp, 0, -ry * 0.1, T('#E09060'), 0.55);
    }
  }
  function counter(g, C, L, st) {
    const K = R.counter, zb = K.z0 + 0.04, yb = K.y - K.t;
    if (!fwd(C) || C.depth(K.x0, K.y, K.z0) < 0.2) return;
    // the body: its front (in its own shadow under the lamp), plinth, door seams; the ends
    surface(g, C, L, Z(zb, K.x0 + 0.03, K.x1 - 0.03, 0.0, yb), '#7A7065', { n: -1, seed: 161, kind: 'card', dark: 0.92, lamp: false, nightLevel: L.warmDark });
    face(g, C, L, plPts(Z(zb - 0.002), K.x0 + 0.03, K.x1 - 0.03, 0, 0.08), '#3E3833', { n: [0, 0, -1], seed: 162, tex: 0.4 });
    [1, 2, 3].forEach(i => { const x = lerp(K.x0 + 0.03, K.x1 - 0.03, i / 4); lineW(g, C, [x, 0.1, zb - 0.003], [x, yb - 0.02, zb - 0.003], 'rgba(14,10,10,0.4)', clamp(C.k(x, 0.5, zb) * 0.003, 1, 4)); });
    if (C.o.x > K.x1 - 0.03) surface(g, C, L, X(K.x1 - 0.03, zb, K.z1 - 0.03, 0, yb), '#6E655B', { n: 1, seed: 163, kind: 'card', dark: 0.8, lamp: false, nightLevel: L.warmDark });
    if (C.o.x < K.x0 + 0.03) surface(g, C, L, X(K.x0 + 0.03, zb, K.z1 - 0.03, 0, yb), '#6E655B', { n: -1, seed: 164, kind: 'card', dark: 0.75 });
    // the slab: its top takes the lamp's pool; its lit front lip
    if (C.o.y > K.y) surface(g, C, L, Y(K.y, K.x0, K.x1, K.z0, K.z1), '#B39B83', { n: 1, seed: 165, kind: 'card', gain: 1.3 });
    const lipLv = levelAt(L, (K.x0 + K.x1) / 2, K.y, K.z0 + 0.1, [0, 1, 0]).map(v => v * 0.92);
    face(g, C, L, plPts(Z(K.z0), K.x0, K.x1, yb, K.y), '#C8AE90', { lv: lipLv, seed: 166, tex: 0.4, rough: 0.6 });
    if (C.o.x > K.x1) face(g, C, L, plPts(X(K.x1), K.z0, K.z1, yb, K.y), '#B49C82', { lv: lipLv.map(v => v * 0.85), seed: 167, tex: 0.4 });
    if (L.night && C.o.y > K.y) { const q = scr(C, plPts(Y(K.y + 0.001), 1.5, 2.6, 3.2, 3.55)); if (q) OTM.dust(g, q, 70, tone('#E0C8A0', L.bands[3]), 'crumbs'); }
    saltPiece(g, C, L);
    if (st.pan === 'counter') { const e = hEll(C, R.pan.x, K.y + 0.035, R.pan.z, R.pan.r); drawPan(g, e.x, e.y, e.rx, e.ry, { lv: levelAt(L, R.pan.x, K.y, R.pan.z, [0, 1, 0]) }); }
    if (st.bag === 'counter') { const b = C.p(2.62, K.y + 0.05, 3.32); drawBag(g, b[0], b[1], C.k(2.62, K.y, 3.32), { lv: levelAt(L, 2.62, K.y, 3.32, [0, 1, 0]), rot: -0.08 }); }
  }
  // ---------------------------------------------------------------- the pendant: cord, shade, the bulb inside it
  function pendant(g, C, L, sh) {
    const P = R.pendant; if (C.depth(P.x, P.rim, P.z) < 0.2) return;
    const et = hEll(C, P.x, P.top, P.z, P.rt), er = hEll(C, P.x, P.rim, P.z, P.r), k = er.k, ceil = C.p(P.x, R.h, P.z);
    g.save(); g.strokeStyle = L.night ? '#2A2426' : tone('#3A3632', L.steps[1]); g.lineWidth = clamp(0.006 * k, 1.2, 6); g.beginPath(); g.moveTo(ceil[0], Math.max(-50, ceil[1])); g.lineTo(et.x, et.y); g.stroke(); g.restore();
    const below = C.o.y < P.rim;
    const body = new Path2D(); body.moveTo(et.x - et.rx, et.y); body.lineTo(er.x - er.rx, er.y); body.ellipse(er.x, er.y, er.rx, er.ry, 0, Math.PI, 0, true); body.lineTo(et.x + et.rx, et.y); body.ellipse(et.x, et.y, et.rx, et.ry, 0, 0, Math.PI, true); body.closePath();
    const shade = L.night ? '#2E2A30' : tone('#56504A', L.steps[1]);
    const bp = G.piece(g, body, { fill: shade, tex: 0.4, seed: 171, kind: 'card', lift: [0, k * 0.01], liftAlpha: 0.35, liftBlur: k * 0.01 });
    G.crescent(g, bp, -er.rx * 0.08, 0, L.night ? '#4A3E3A' : tone('#7A746C', L.steps[2]), 0.8);
    if (below) {   // the opening, seen from under it
      const op = new Path2D(); op.ellipse(er.x, er.y, er.rx * 0.97, er.ry * 0.97, 0, 0, Math.PI * 2);
      g.save(); g.clip(op);
      if (L.night) { g.fillStyle = '#B98A55'; g.fill(op); g.fillStyle = '#E2B47A'; g.beginPath(); g.ellipse(er.x, er.y - er.ry * 0.2, er.rx * 0.7, er.ry * 0.7, 0, 0, 7); g.fill();
        g.fillStyle = '#FFE2AE'; g.beginPath(); g.ellipse(er.x, er.y - er.ry * 0.35, er.rx * 0.32, er.ry * 0.42, 0, 0, 7); g.fill(); }
      else { g.fillStyle = tone('#3E3A36', L.steps[0]); g.fill(op); g.fillStyle = tone('#C9C3B6', L.steps[1]); g.beginPath(); g.ellipse(er.x, er.y - er.ry * 0.35, er.rx * 0.28, er.ry * 0.38, 0, 0, 7); g.fill(); }
      g.restore();
    } else if (L.night) { g.fillStyle = '#FFE2AE'; g.beginPath(); g.ellipse(er.x, er.y + 1, er.rx * 0.9, Math.max(1.5, er.ry * 0.5), 0, 0, Math.PI); g.fill(); }
    if (L.night) { g.save(); g.strokeStyle = '#C8955A'; g.globalAlpha = 0.85; g.lineWidth = clamp(k * 0.004, 1, 4); g.beginPath(); g.ellipse(er.x, er.y, er.rx, er.ry, 0, 0, Math.PI); g.stroke(); g.restore(); }
    sh.bulb = [er.x, er.y - (below ? er.ry * 0.35 : 0), er.rx, er.ry];
  }
  // ---------------------------------------------------------------- the shelf and the two mugs: his, rinsed and put back; hers, standing in a ring of dust
  function mug(g, C, L, x, albedo, dusty, seed) {
    const s = R.shelf, M = R.mugs, y = s.y, z = M.z, e0 = hEll(C, x, y, z, M.r), e1 = hEll(C, x, y + M.h, z, M.r), k = e0.k, lv = levelAt(L, x, y + M.h / 2, z, [0, 0, -1]), ld = liftDir(L, C, x, y, z);
    if (dusty) { g.save(); g.filter = `blur(${clamp(k * 0.0016, 0.6, 4)}px)`; g.strokeStyle = tone('#D8CCB4', lv); g.globalAlpha = 0.85; g.lineWidth = clamp(k * 0.007, 1.5, 10); g.beginPath(); g.ellipse(e0.x, e0.y, e0.rx * 1.32, e0.ry * 1.32 + 1, 0, 0, 7); g.stroke(); g.restore(); }
    const hx = e1.x + e1.rx * 0.98, hy = (e0.y + e1.y) / 2;
    g.save(); g.lineWidth = Math.max(1.5, 0.0085 * k); g.strokeStyle = tone(albedo, lv.map(v => v * 0.82)); g.beginPath(); g.ellipse(hx + 0.012 * k, hy, 0.016 * k, 0.026 * k, 0, 0, 7); g.stroke(); g.restore();
    const body = S().M(e1.x - e1.rx, e1.y).L(e0.x - e0.rx * 0.96, e0.y); for (let i = 1; i < 12; i++) { const a = Math.PI - i / 12 * Math.PI; body.L(e0.x + Math.cos(a) * e0.rx * 0.96, e0.y + Math.sin(a) * e0.ry); }
    body.L(e0.x + e0.rx * 0.96, e0.y).L(e1.x + e1.rx, e1.y); for (let i = 1; i < 12; i++) { const a = -i / 12 * Math.PI; body.L(e1.x + Math.cos(a) * e1.rx, e1.y + Math.sin(a) * e1.ry); } body.Z();
    const bp = G.piece(g, body, { fill: tone(albedo, lv), rough: clamp(k * 0.0012, 0.3, 1.2), seed, tex: 0.5, lift: [ld[0] * k * 0.005, ld[1] * k * 0.004], liftAlpha: 0.5, liftBlur: clamp(k * 0.004, 1, 8) });
    G.crescent(g, bp, ld[0] * e1.rx * 0.3, 0, tone(albedo, lv.map(v => v * 0.68)), 0.85);
    if (e1.above) { g.fillStyle = tone(albedo, lv.map(v => v * 0.45)); g.beginPath(); g.ellipse(e1.x, e1.y + e1.ry * 0.08, e1.rx * 0.86, e1.ry * 0.8, 0, 0, 7); g.fill();
      if (dusty) { g.save(); g.strokeStyle = tone('#CFC4AE', lv); g.globalAlpha = 0.6; g.lineWidth = Math.max(1, k * 0.0025); g.beginPath(); g.ellipse(e1.x, e1.y, e1.rx * 0.93, e1.ry * 0.9, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.restore(); } }
    if (dusty) G.specks(g, bp, [e1.x - e1.rx, e1.y - e1.ry, e1.rx * 2, e0.y - e1.y + e1.ry], 22, tone('#D9CDB6', lv), 'mugdust' + seed, 0.9, 0.45);
  }
  function shelf(g, C, L) {
    const s = R.shelf, z0 = R.d - s.dep, k = C.k((s.x0 + s.x1) / 2, s.y, z0);
    if (!fwd(C) || C.depth(s.x0, s.y, z0) < 0.15) return;
    const ld = liftDir(L, C, (s.x0 + s.x1) / 2, s.y, R.d);
    softShadow(g, C, plPts(Z(R.d - 0.001), s.x0 + ld[0] * 0.02, s.x1 + ld[0] * 0.03, s.y - s.t - 0.06, s.y - s.t + 0.005), shadowCol(L), clamp(k * 0.012, 2, 14));
    [s.x0 + 0.07, s.x1 - 0.07].forEach((x, i) => face(g, C, L, [[x - 0.008, s.y - s.t - 0.1, R.d - 0.003], [x + 0.008, s.y - s.t - 0.1, R.d - 0.003], [x + 0.008, s.y - s.t, z0 + 0.02], [x - 0.008, s.y - s.t, z0 + 0.02]], '#3A3434', { seed: 181 + i, tex: 0.3, rough: 0.4 }));
    if (C.o.y < s.y - s.t) face(g, C, L, plPts(Y(s.y - s.t), s.x0, s.x1, z0, R.d), '#5C4C40', { n: [0, -1, 0], cull: false, seed: 183, tex: 0.45 });
    let top = null; if (C.o.y > s.y) top = face(g, C, L, plPts(Y(s.y), s.x0, s.x1, z0, R.d), '#8C7664', { n: [0, 1, 0], seed: 184, tex: 0.5 });
    if (top) { const q = scr(C, plPts(Y(s.y + 0.001), R.mugs.hers - 0.13, s.x1 - 0.01, z0 + 0.01, R.d - 0.005)); if (q) { let ar = 0; q.forEach((p, i) => { const r2 = q[(i + 1) % q.length]; ar += p[0] * r2[1] - r2[0] * p[1]; }); ar = Math.abs(ar) / 2; if (ar > 300) OTM.dust(g, q, Math.round(clamp(ar / 700, 6, 140)), tone('#CDBEA6', levelAt(L, 3.1, s.y, 4.1)), 'sheldust'); } }
    face(g, C, L, plPts(Z(z0), s.x0, s.x1, s.y - s.t, s.y), '#7A6656', { n: [0, 0, -1], seed: 185, tex: 0.45, lift: 0.004 });
    mug(g, C, L, R.mugs.his, '#B98A3C', false, 51); mug(g, C, L, R.mugs.hers, '#7E8E7A', true, 54);
  }
  // ---------------------------------------------------------------- the couch, for two, against the back wall
  function softQuad(q, rr) { const n = q.length, pts = []; for (let i = 0; i < n; i++) { const a = q[(i + n - 1) % n], b = q[i], c = q[(i + 1) % n]; pts.push([lerp(b[0], a[0], rr), lerp(b[1], a[1], rr)], [lerp(b[0], c[0], rr), lerp(b[1], c[1], rr)]); } return G.blob(pts); }
  function cushion(g, C, L, pts, albedo, o) {
    const q = scr(C, pts); if (!q || q.length < 4) return null; o = o || {};
    const c = pts.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]), k = C.k(c[0], c[1], c[2]), lv = o.lv || levelAt(L, c[0], c[1], c[2], o.n);
    const ld = liftDir(L, C, c[0], c[1], c[2]);
    const p = G.piece(g, softQuad(q.length === 4 ? q : q.slice(0, 4), o.rr || 0.16), { fill: tone(albedo, lv, o.m), rough: rough(k), seed: o.seed || 9, tex: 0.6, kind: 'cloth', lift: [ld[0] * k * 0.008, ld[1] * k * 0.007], liftAlpha: 0.45, liftBlur: clamp(k * 0.008, 2, 14) });
    if (o.hi !== false) G.crescent(g, p, 0, -clamp(k * 0.008, 2, 12), tone(albedo, lv, (o.m || 1) * 1.16), 0.85);
    return p;
  }
  function couch(g, C, L, st, sh) {
    const K = R.couch; if (!fwd(C) || C.depth(K.x0, K.seat, K.z0) < 0.2) return;
    const zb = R.d - K.backD, CO = '#6E685F', CU = '#79736A', AR = '#655F57';
    // the frame's back, its top
    surface(g, C, L, Z(zb, K.x0 + 0.02, K.x1 - 0.02, 0.1, K.back), CO, { n: -1, seed: 191, kind: 'cloth', dark: 0.86, gain: 0.8, sun: true });
    if (C.o.y > K.back) cushion(g, C, L, plPts(Y(K.back), K.x0 + 0.02, K.x1 - 0.02, zb, R.d - 0.01), CO, { n: [0, 1, 0], seed: 192, rr: 0.1 });
    // the three back cushions, leaning on it; the window's slant falls across them by day
    const zc = zb - 0.13;
    for (let i = 0; i < 3; i++) { const x0 = K.seatX0 + i * K.cw + 0.008, x1 = x0 + K.cw - 0.016;
      const p = cushion(g, C, L, [[x0, K.back - 0.035, zb - 0.02], [x1, K.back - 0.035, zb - 0.02], [x1, K.seat + 0.03, zc], [x0, K.seat + 0.03, zc]], CU, { n: [0, 0.3, -1], seed: 193 + i, m: 0.95 });
      if (p && !L.night) { const wl = windowLight(zc + 0.06, false, 0.04), wc = windowLight(zc + 0.06, false, 0); if (wl) { g.save(); g.clip(p); fillW(g, C, wl.quad, tone(CU, L.pen), 2, 197 + i); fillW(g, C, wc.quad, tone(CU, L.sun, 0.97), 2, 200 + i); fillW(g, C, wc.mullion, tone(CU, L.pen), 0.6, 203 + i); g.restore(); } } }
    // the arms
    [[K.x0, K.x0 + K.armW, 1], [K.x1 - K.armW, K.x1, -1]].forEach(([x0, x1, side], i) => {
      if (side * (C.o.x - (side > 0 ? x1 : x0)) > 0) cushion(g, C, L, [[side > 0 ? x1 : x0, K.arm, K.z0 + 0.04], [side > 0 ? x1 : x0, K.arm, R.d - 0.02], [side > 0 ? x1 : x0, K.seat, R.d - 0.02], [side > 0 ? x1 : x0, K.seat, K.z0 + 0.04]], AR, { n: [side, 0, 0], seed: 206 + i, m: 0.8, rr: 0.12 });
      if (C.o.y > K.arm) cushion(g, C, L, plPts(Y(K.arm), x0, x1, K.z0, R.d - 0.02), AR, { n: [0, 1, 0], seed: 208 + i, rr: 0.3 });
      cushion(g, C, L, plPts(Z(K.z0), x0, x1, 0.1, K.arm), AR, { n: [0, 0, -1], seed: 210 + i, m: 0.9, rr: 0.22 }); });
    // the three seat cushions: tops and fronts; the middle one is the seam
    for (let i = 0; i < 3; i++) { const x0 = K.seatX0 + i * K.cw + 0.006, x1 = x0 + K.cw - 0.012;
      if (C.o.y > K.seat) cushion(g, C, L, plPts(Y(K.seat), x0, x1, K.z0 + 0.02, zc + 0.02), CU, { n: [0, 1, 0], seed: 212 + i, rr: 0.12 });
      cushion(g, C, L, plPts(Z(K.z0), x0, x1, 0.22, K.seat), CU, { n: [0, 0, -1], seed: 215 + i, m: 0.84, rr: 0.2 }); }
    face(g, C, L, plPts(Z(K.z0 + 0.03), K.x0 + 0.04, K.x1 - 0.04, 0.06, 0.22), '#4A453F', { n: [0, 0, -1], seed: 218, tex: 0.5 });
    [K.x0 + 0.07, K.x1 - 0.07].forEach((x, i) => face(g, C, L, plPts(Z(K.z0 + 0.06), x - 0.02, x + 0.02, 0, 0.065), '#2A2622', { seed: 219 + i, tex: 0.3 }));
    if (st.bag === 'couch') { const b = C.p(K.x0 + 0.07, K.arm + 0.04, K.z0 + 0.3); drawBag(g, b[0], b[1], C.k(K.x0, K.arm, K.z0 + 0.3), { lv: levelAt(L, K.x0, K.arm, 3.6, [0, 1, 0]), rot: 0.06 }); }
  }
  // ---------------------------------------------------------------- two stools at the counter: his pulled out, hers pushed in
  function stools(g, C, L) {
    if (!fwd(C)) return;
    R.stools.forEach((s, i) => {
      if (C.depth(s.x, 0.66, s.z) < 0.3) return;
      const e = hEll(C, s.x, 0.66, s.z, 0.17), eb = hEll(C, s.x, 0.62, s.z, 0.17), k = e.k, lv = levelAt(L, s.x, 0.66, s.z, [0, 1, 0]), ld = liftDir(L, C, s.x, 0.5, s.z);
      g.save(); g.lineCap = 'round'; g.strokeStyle = tone('#2E2C2E', levelAt(L, s.x, 0.4, s.z)); g.lineWidth = clamp(k * 0.016, 1.5, 12);
      [0, 2.1, 4.2].forEach(a => { const aa = a + s.rot, tp = C.p(s.x + Math.cos(aa) * 0.09, 0.62, s.z + Math.sin(aa) * 0.09), ft = C.p(s.x + Math.cos(aa) * 0.18, 0, s.z + Math.sin(aa) * 0.18); g.beginPath(); g.moveTo(tp[0], tp[1]); g.lineTo(ft[0], ft[1]); g.stroke(); });
      const fr = hEll(C, s.x, 0.24, s.z, 0.145); g.lineWidth = clamp(k * 0.01, 1, 8); g.beginPath(); g.ellipse(fr.x, fr.y, fr.rx, fr.ry, 0, 0, 7); g.stroke(); g.restore();
      const side = S().M(eb.x - eb.rx, eb.y).L(e.x - e.rx, e.y).L(e.x + e.rx, e.y).L(eb.x + eb.rx, eb.y).Z().add(S().ellipse(eb.x, eb.y, eb.rx, eb.ry, 0));
      G.piece(g, side, { fill: tone('#5A4A3C', lv, 0.8), rough: 0.6, seed: 221 + i, tex: 0.5, lift: [ld[0] * k * 0.01, ld[1] * k * 0.012], liftAlpha: 0.45, liftBlur: k * 0.01 });
      const tp = G.piece(g, S().ellipse(e.x, e.y, e.rx, e.ry, 0), { fill: tone('#7A6450', lv), rough: 0.7, seed: 223 + i, tex: 0.55 }); G.crescent(g, tp, 0, -Math.max(1, e.ry * 0.12), tone('#7A6450', lv, 1.2), 0.8);
    });
  }
  // ---------------------------------------------------------------- the makeup bag (B3's: faded floral, the zip broken). s = px per metre at the bag
  function drawBag(g, x, y, s, o) {
    o = o || {}; const u = s * 0.22 / 330, lv = o.lv || [1, 1, 1], T = c => tone(c, lv);
    g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.scale(u, u);
    const bag = G.blob([[-150, -70], [-40, -92], [110, -84], [168, -60], [176, 50], [120, 96], [-90, 100], [-158, 50]]);
    const bp = G.piece(g, bag, { fill: T('#D9C1B4'), rough: 1.4, seed: 231, tex: 0.7, kind: 'cloth', lift: [10, 14], liftAlpha: 0.55, liftBlur: 12 });
    g.save(); g.clip(bp); const r = O.rng('flor');
    for (let i = 0; i < 26; i++) { const fx = -170 + r() * 350, fy = -90 + r() * 190, fs = 10 + r() * 14, col = T(['#B9666A', '#C98A5E', '#7A8E6A', '#9C6E8E'][i % 4]);
      for (let kk = 0; kk < 5; kk++) { const a = kk / 5 * Math.PI * 2 + r(); g.fillStyle = col; g.beginPath(); g.ellipse(fx + Math.cos(a) * fs * 0.55, fy + Math.sin(a) * fs * 0.55, fs * 0.42, fs * 0.26, a, 0, 7); g.fill(); }
      g.fillStyle = T('#E8C96A'); g.beginPath(); g.arc(fx, fy, fs * 0.2, 0, 7); g.fill(); }
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(190,180,170,0.4)'; g.fillRect(-200, -120, 420, 260); g.restore();
    G.crescent(g, bp, -10, -10, T('#F0E2D6'), 0.6); G.crescent(g, bp, 10, 12, T('#6E5A56'), 0.6);
    g.strokeStyle = T('#7A6A50'); g.lineWidth = 9; g.beginPath(); g.moveTo(-140, -70); g.lineTo(70, -66); g.stroke();
    g.strokeStyle = T('#C8A858'); g.lineWidth = 3; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(-140, -71); g.lineTo(70, -67); g.stroke();
    g.beginPath(); g.moveTo(70, -70); g.quadraticCurveTo(120, -84, 160, -72); g.stroke(); g.beginPath(); g.moveTo(70, -62); g.quadraticCurveTo(120, -48, 160, -48); g.stroke(); g.setLineDash([]);
    g.fillStyle = T('#2E2624'); g.beginPath(); g.moveTo(76, -66); g.quadraticCurveTo(124, -80, 156, -68); g.quadraticCurveTo(124, -52, 76, -66); g.fill();
    g.restore();
  }
  // ---------------------------------------------------------------- the front wall from inside: the door's opening, architrave, hooks (one empty), the switch
  function landing(g, C, L) {
    const lv = L.night ? [0.42, 0.38, 0.33] : L.tod === 'dusk' ? [0.44, 0.48, 0.6] : [0.74, 0.77, 0.79], o = (s, l) => ({ level: l || lv, lamp: false, seed: s, kind: 'card', tex: 0.7 });
    const zf = R.landing.z;
    surface(g, C, L, Y(R.h + 0.1, 1.6, 5.4, zf, 0), '#9A9890', Object.assign(o(241, lv.map(v => v * 0.7)), { n: -1 }));
    surface(g, C, L, Y(0, 1.6, 5.4, zf, 0), '#77726A', Object.assign(o(242, lv.map(v => v * 0.85)), { n: 1 }));
    surface(g, C, L, X(1.75, zf, 0, 0, 1.1), '#5C6460', Object.assign(o(243, lv.map(v => v * 0.85)), { n: 1 })); surface(g, C, L, X(1.75, zf, 0, 1.1, R.h + 0.1), '#8E908A', Object.assign(o(244, lv.map(v => v * 0.85)), { n: 1 }));
    surface(g, C, L, X(5.1, zf, 0, 0, 1.1), '#5C6460', Object.assign(o(245, lv.map(v => v * 0.8)), { n: -1 })); surface(g, C, L, X(5.1, zf, 0, 1.1, R.h + 0.1), '#8E908A', Object.assign(o(246, lv.map(v => v * 0.8)), { n: -1 }));
    surface(g, C, L, Z(zf, 1.6, 5.4, 0, 1.1), '#5C6460', Object.assign(o(247), { n: 1 })); surface(g, C, L, Z(zf, 1.6, 5.4, 1.1, R.h + 0.1), '#8E908A', Object.assign(o(248), { n: 1 }));
    face(g, C, L, plPts(Z(zf + 0.003), 1.6, 5.4, 1.085, 1.11), '#3E4442', { lv, seed: 249, tex: 0.3 });
    // the stairwell's high window band, the handrail on its brackets, the doormat outside the door
    face(g, C, L, plPts(Z(zf + 0.004), 2.2, 4.7, 1.92, 2.34), L.night ? '#262A32' : '#CDD0C8', { lv: L.night ? [1, 1, 1] : lv.map(v => v * 1.22), seed: 250, tex: 0.4 });
    for (let x = 2.2 + 0.625; x < 4.7; x += 0.625) face(g, C, L, plPts(Z(zf + 0.006), x - 0.015, x + 0.015, 1.92, 2.34), '#7A7C76', { lv, seed: 251, tex: 0.3 });
    face(g, C, L, plPts(Z(zf + 0.05), 1.75, 5.1, 0.92, 0.97), '#2E302E', { lv, seed: 252, tex: 0.3, lift: 0.02 });
    for (let x = 2.0; x < 5.1; x += 0.8) face(g, C, L, plPts(Z(zf + 0.025), x - 0.012, x + 0.012, 0.86, 0.95), '#2E302E', { lv, seed: 253, tex: 0.3 });
    face(g, C, L, plPts(Y(0.006), 3.1, 3.8, -0.62, -0.08), '#4A3F36', { lv, seed: 254, tex: 0.7, kind: 'wool' });
  }
  function frontWall(g, C, L, st) {
    const D = R.door; if (fwd(C)) return;
    const wp = surface(g, C, L, Z(0, -0.2, R.w + 0.2, 0, R.h), WALL, { n: 1, seed: 261, dark: 0.9, level: L.night ? undefined : L.steps[1] });
    if (!wp) return;
    const oq = scr(C, plPts(Z(0.002), D.x0, D.x1, 0, D.h));
    if (oq) { const op = shp(oq).path(0.3, 262); g.save(); g.clip(op); if (st.landing !== false) landing(g, C, L); else { g.fillStyle = '#16181C'; g.fill(op); } g.restore();
      g.save(); g.filter = `blur(${clamp(C.k(D.x0, 1, 0) * 0.01, 2, 10)}px)`; g.strokeStyle = 'rgba(20,20,24,0.35)'; g.lineWidth = clamp(C.k(D.x0, 1, 0) * 0.02, 3, 16); g.stroke(op); g.restore(); }
    const A = '#BEBAB0', a = 0.07, lvA = levelAt(L, 3.4, 1, 0.1).map(v => v * 1.04);
    face(g, C, L, plPts(Z(0.012), D.x0 - a, D.x0, 0, D.h + a), A, { lv: lvA, seed: 263, tex: 0.4, lift: 0.006 });
    face(g, C, L, plPts(Z(0.012), D.x1, D.x1 + a, 0, D.h + a), A, { lv: lvA, seed: 264, tex: 0.4, lift: 0.006 });
    face(g, C, L, plPts(Z(0.012), D.x0 - a, D.x1 + a, D.h, D.h + a), A, { lv: lvA, seed: 265, tex: 0.4, lift: 0.006 });
    // the hooks: his jacket on one, the other bare
    const hk = R.hooks, k = C.k(hk.x0, hk.y, 0), lvH = levelAt(L, hk.x0, hk.y, 0.05);
    face(g, C, L, plPts(Z(0.01), hk.x0 - 0.1, hk.x1 + 0.1, hk.y - 0.02, hk.y + 0.04), '#7A6656', { lv: lvH, seed: 266, tex: 0.5, lift: 0.006 });
    [hk.x0, hk.x1].forEach((x, i) => { const p = C.p(x, hk.y + 0.01, 0.03); g.fillStyle = tone('#2E2826', lvH); g.beginPath(); g.ellipse(p[0], p[1], 0.012 * k, 0.016 * k, 0, 0, 7); g.fill(); });
    { const top = C.p(hk.x0, hk.y + 0.01, 0.05), w = 0.21 * k, hgt = 0.74 * k;
      const jk = G.blob([[top[0] - w * 0.12, top[1]], [top[0] + w * 0.12, top[1]], [top[0] + w * 0.5, top[1] + hgt * 0.12], [top[0] + w * 0.56, top[1] + hgt * 0.98], [top[0] + w * 0.1, top[1] + hgt], [top[0] - w * 0.2, top[1] + hgt * 0.97], [top[0] - w * 0.52, top[1] + hgt * 0.95], [top[0] - w * 0.48, top[1] + hgt * 0.12]]);
      const jp = G.piece(g, jk, { fill: tone('#3D4450', lvH), rough: rough(k), seed: 267, tex: 0.65, kind: 'wool', lift: [-k * 0.012, k * 0.01], liftAlpha: 0.5, liftBlur: k * 0.012 });
      G.crescent(g, jp, -w * 0.06, 0, tone('#3D4450', lvH, 1.25), 0.8);
      g.save(); g.clip(jp); g.strokeStyle = tone('#232833', lvH); g.lineWidth = Math.max(1, k * 0.004); g.beginPath(); g.moveTo(top[0], top[1] + hgt * 0.08); g.lineTo(top[0] + w * 0.04, top[1] + hgt); g.stroke(); g.restore(); }
    face(g, C, L, plPts(Z(0.008), R.sw.x - 0.04, R.sw.x + 0.04, R.sw.y - 0.04, R.sw.y + 0.04), '#CBC6BA', { lv: levelAt(L, R.sw.x, R.sw.y, 0.05), seed: 268, tex: 0.3, lift: 0.004 });
  }
  // ---------------------------------------------------------------- the door leaf (drawn live: open 0..1). From inside its room face is paint; outside, the stairwell's colour.
  function leaf(g, C, L, open) {
    const D = R.door, th = clamp(open, 0, 1) * 100 * D2R, hx = D.x0 + 0.025, Lw = D.leaf, T = 0.045, H2 = D.h - 0.01;
    const ux = Math.cos(th), uz = Math.sin(th), nx = -uz, nz = ux;          // along the leaf, and its room-side normal
    const A = [hx, 0.008, 0], B = [hx + ux * Lw, 0.008, uz * Lw];
    const off = (p, s) => [p[0] + nx * T * s, p[1], p[2] + nz * T * s];
    const quad = (a, b, h) => [a, b, [b[0], h, b[2]], [a[0], h, a[2]]];
    const camSide = nx * (C.o.x - (A[0] + B[0]) / 2) + nz * (C.o.z - (A[2] + B[2]) / 2) > 0;   // the camera sees the room face
    const fA = camSide ? A : off(A, -1), fB = camSide ? B : off(B, -1), col = camSide ? '#ABA79D' : '#4E5A58';
    const lv = L.night ? L.amb.map(v => v * 1.3) : camSide ? L.steps[1] : L.steps[0];
    // the free edge's thickness
    const eq = scr(C, quad(off(B, -1), B, H2)); if (eq) { g.fillStyle = tone('#8A867C', lv, 0.85); g.fill(shp(eq).path(0.5, 271)); }
    const q = scr(C, quad(fA, fB, H2)); if (!q) return null;
    const p = shp(q).path(rough(C.k(B[0], 1, B[2])) * 0.7, 272);
    g.fillStyle = tone(col, lv); g.fill(p);
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.45; g.fillStyle = G.texPattern(g, 'card', 'leaf', 1); g.fill(p); g.restore();
    // a recessed panel line, the lever, the spyhole (room side)
    const at = (u, y) => [fA[0] + ux * u, y, fA[2] + uz * u];
    const pq = scr(C, [at(0.12, 0.25), at(Lw - 0.12, 0.25), at(Lw - 0.12, H2 - 0.25), at(0.12, H2 - 0.25)]);
    if (pq) { g.save(); g.strokeStyle = tone(col, lv, 0.8); g.lineWidth = Math.max(1, C.k(B[0], 1, B[2]) * 0.004); g.stroke(shp(pq).path(0.5, 273)); g.restore(); }
    const kk = C.k(B[0], 1, B[2]), lp = C.p(at(Lw - 0.07, 1.02)), lq = C.p(at(Lw - 0.17, 1.0));
    g.fillStyle = 'rgba(10,10,12,0.35)'; g.fill(S().capsule(lp[0] + 3, lp[1] + 4, 0.012 * kk, lq[0] + 3, lq[1] + 4, 0.01 * kk).path(0, 1)); g.fillStyle = tone('#8E8A82', lv); g.fill(S().capsule(lp[0], lp[1], 0.012 * kk, lq[0], lq[1], 0.01 * kk).path(0, 1));
    if (camSide) { const sp = C.p(at(Lw / 2, 1.55)); g.fillStyle = tone('#2A2826', lv); g.beginPath(); g.arc(sp[0], sp[1], Math.max(1.5, 0.007 * kk), 0, 7); g.fill(); }
    return { edge: (y) => C.p(B[0], y, B[2]), handle: lp };
  }
  // the stairwell side of the front wall, seen from the landing: two-tone paint, the architrave, the jambs' depth; the opening cut out
  function outerWall(g, C, L) {
    const D = R.door, v = -0.12, lv = L.night ? [0.42, 0.38, 0.33] : L.tod === 'dusk' ? [0.42, 0.46, 0.58] : [0.7, 0.73, 0.75], o = (s) => ({ level: lv, lamp: false, n: -1, seed: s, kind: 'card', tex: 0.65 });
    surface(g, C, L, Z(v, 0.8, 6.0, 0, 1.1), '#5C6460', o(281)); surface(g, C, L, Z(v, 0.8, 6.0, 1.1, 2.9), '#8E908A', o(282));
    face(g, C, L, plPts(Z(v - 0.002), 0.8, 6.0, 1.085, 1.11), '#3E4442', { lv, seed: 283, tex: 0.3 });
    const oq = scr(C, plPts(Z(v - 0.01), D.x0, D.x1, -0.05, D.h)); if (oq) { g.save(); g.globalCompositeOperation = 'destination-out'; g.fill(shp(oq).path(0.4, 284)); g.restore(); }
    // the jambs: the wall's thickness inside the opening
    if (C.o.x > D.x0) face(g, C, L, [[D.x0, 0, v], [D.x0, 0, 0], [D.x0, D.h, 0], [D.x0, D.h, v]], '#9A968C', { lv: lv.map(x => x * 0.82), seed: 285, tex: 0.4 });
    if (C.o.x < D.x1) face(g, C, L, [[D.x1, 0, 0], [D.x1, 0, v], [D.x1, D.h, v], [D.x1, D.h, 0]], '#9A968C', { lv: lv.map(x => x * 0.92), seed: 286, tex: 0.4 });
    if (C.o.y < D.h) face(g, C, L, [[D.x0, D.h, v], [D.x1, D.h, v], [D.x1, D.h, 0], [D.x0, D.h, 0]], '#9A968C', { lv: lv.map(x => x * 0.7), seed: 287, tex: 0.4 });
    const a = 0.075, AC = '#3E4644';
    face(g, C, L, plPts(Z(v - 0.015), D.x0 - a, D.x0, 0, D.h + a), AC, { lv, seed: 288, tex: 0.4, lift: 0.008 });
    face(g, C, L, plPts(Z(v - 0.015), D.x1, D.x1 + a, 0, D.h + a), AC, { lv, seed: 289, tex: 0.4, lift: 0.008 });
    face(g, C, L, plPts(Z(v - 0.015), D.x0 - a, D.x1 + a, D.h, D.h + a), AC, { lv, seed: 290, tex: 0.4, lift: 0.008 });
  }

  // =====================================================================================================================
  // VIEWS: each a camera on the same room. Anchors are world points projected per shot, returned as [x, y, pxPerMetre].
  // =====================================================================================================================
  const K = R.couch, D = R.door;
  const AW = {
    himCounter: [1.75, 1.66, 3.90], himCounterChest: [1.75, 1.28, 3.88], himCounterFeet: [1.75, 0, 3.90],
    salt: [R.salt.x, R.counter.y + R.salt.h, R.salt.z], phoneSalt: [R.phoneSalt.x, R.counter.y, R.phoneSalt.z], pan: [R.pan.x, R.counter.y, R.pan.z],
    strip: [R.strip.x, R.strip.y, R.fridge.z0], stripLast: [R.strip.x + 0.003, R.strip.y - 0.066, R.fridge.z0], fridgeHandle: [R.fridge.handleX, 1.2, R.fridge.z0 - 0.03],
    rect: [(R.rect.x0 + R.rect.x1) / 2, (R.rect.y0 + R.rect.y1) / 2, R.d], rectEdge: [R.rect.x0, (R.rect.y0 + R.rect.y1) / 2, R.d], nail: [R.nail.x, R.nail.y, R.d],
    mugHis: [R.mugs.his, R.shelf.y + R.mugs.h, R.mugs.z], mugHers: [R.mugs.hers, R.shelf.y + R.mugs.h, R.mugs.z],
    bulb: [R.pendant.x, R.pendant.bulb, R.pendant.z], window: [R.w, (R.window.y0 + R.window.y1) / 2, (R.window.z0 + R.window.z1) / 2],
    couchSeam: [K.mid, K.seat, 3.56], phoneCushion: [R.phoneCushion.x, R.phoneCushion.y, R.phoneCushion.z],
    seatL: [K.seatX0 + K.cw / 2, K.seat, 3.56], seatR: [K.seatX1 - K.cw / 2, K.seat, 3.56], armL: [K.x0 + K.armW / 2, K.arm, 3.62], armR: [K.x1 - K.armW / 2, K.arm, 3.62],
    couchHead: [K.mid - 0.2, K.seat + 0.13, 3.6], couchHeadL: [K.seatX0 + 0.1, K.arm + 0.1, 3.62], couchHeadR: [K.seatX1 - 0.1, K.arm + 0.1, 3.62],
    himBetween: [2.10, 1.62, 2.0], himBetweenFeet: [2.10, 0, 2.0], herBetween: [2.98, 1.56, 2.85], herBetweenFeet: [2.98, 0, 2.85],
    phoneHeld: [2.72, 1.34, 2.55], handsMeet: [2.70, 1.10, 2.45], bagHeld: [2.30, 1.02, 2.2],
    herInside: [3.55, 1.56, 0.75], herInsideFeet: [3.55, 0, 0.75],
    herDoorway: [3.45, 1.56, -0.28], herDoorwayFeet: [3.45, 0, -0.28], himDoor: [3.72, 1.66, 0.42], himDoorFeet: [3.72, 0, 0.42],
    himDoorway: [3.42, 1.66, 0.24], himDoorwayFeet: [3.42, 0, 0.24],
    doorHandle: [D.x0 + 0.025 + D.leaf - 0.07, 1.02, 0.02], doorJamb: [D.x1, 1.0, 0], doorHinge: [D.x0, 1.0, 0], jacket: [R.hooks.x0, 1.4, 0.06], bareHook: [R.hooks.x1, R.hooks.y, 0.03],
  };
  const ROOMLIST = ['shell', 'window', 'kitchenRun', 'shelf', 'fridge', 'couch', 'counter', 'stools', 'pendant'];
  const SHOTS = {
    room: { wide: { cam: { x: 2.70, y: 1.32, z: -0.75, f: 1380, cy: 580 }, front: ['counter', 'stools', 'pendant'], split: [R.seamX, 1.2, R.d],
      anchors: ['himCounter', 'himCounterFeet', 'salt', 'phoneSalt', 'strip', 'stripLast', 'rect', 'rectEdge', 'nail', 'mugHis', 'mugHers', 'bulb', 'window', 'couchSeam', 'phoneCushion', 'seatL', 'seatR', 'couchHead', 'couchHeadL', 'couchHeadR', 'herInside', 'herInsideFeet', 'himBetween', 'herBetween'] } },
    fridge: { insert: { cam: { x: R.strip.x + 0.012, y: R.strip.y - 0.004, z: R.fridge.z0 - 0.44, f: 1650, cy: 540 }, front: [], split: [R.strip.x + R.strip.w / 2, 1.5, R.fridge.z0],
      exposure: { night: 1.55 }, anchors: ['strip', 'stripLast', 'fridgeHandle'] } },
    counter: {
      main: { cam: { x: 2.12, y: 1.34, z: 1.92, f: 1250, cy: 590 }, front: ['counter', 'pendant'], split: AW.salt, exposure: { night: 1.12 },
        anchors: ['himCounter', 'himCounterChest', 'salt', 'phoneSalt', 'pan', 'strip', 'stripLast', 'rect', 'rectEdge', 'nail', 'mugHis', 'mugHers', 'bulb', 'fridgeHandle'] },
      close: { cam: { x: 2.05, y: 1.25, z: 1.92, f: 1800, cy: 600 }, front: ['counter', 'pendant'], split: AW.salt, exposure: { night: 1.12 },
        anchors: ['himCounter', 'himCounterChest', 'salt', 'phoneSalt', 'pan', 'rect', 'nail', 'bulb'] } },
    couch: {
      main: { cam: { x: K.mid, y: 1.02, z: 1.65, f: 1350, cy: 470 }, front: [], split: AW.couchSeam,
        anchors: ['couchSeam', 'phoneCushion', 'seatL', 'seatR', 'armL', 'armR', 'couchHead', 'couchHeadL', 'couchHeadR', 'rect', 'rectEdge', 'nail', 'mugHis', 'mugHers', 'window'] },
      close: { cam: { x: K.mid, y: 1.45, z: 2.55, f: 1700, cy: 500, pitch: -0.55 }, front: [], split: AW.couchSeam,
        anchors: ['couchSeam', 'phoneCushion', 'couchHead', 'seatL', 'seatR', 'armL', 'armR'] } },
    door: {
      inside: { cam: { x: 3.45, y: 1.35, z: 2.6, f: 1300, cy: 540, yaw: Math.PI }, front: ['leaf'], split: AW.doorJamb, open: 0,
        anchors: ['herDoorway', 'herDoorwayFeet', 'himDoor', 'himDoorFeet', 'doorHandle', 'doorJamb', 'doorHinge', 'jacket', 'bareHook'] },
      deep: { cam: { x: 3.45, y: 1.45, z: -1.7, f: 1500, cy: 560 }, landing: true, front: ['outerWall'], split: [(D.x0 + D.x1) / 2, 1.0, 0], open: 0.9,
        anchors: ['himDoorway', 'himDoorwayFeet', 'phoneCushion', 'couchSeam', 'rect', 'doorJamb', 'doorHinge'] },
      close: { cam: { x: 3.30, y: 1.62, z: -0.75, f: 1500, cy: 520 }, landing: true, front: ['outerWall'], split: AW.doorHinge, open: 0.85, blur: 4,
        anchors: ['himDoorway', 'doorJamb', 'doorHinge'] } },
    between: {
      two: { cam: { x: 2.70, y: 1.48, z: 0.55, f: 1500, cy: 520 }, front: [], split: AW.rectEdge,
        anchors: ['himBetween', 'himBetweenFeet', 'herBetween', 'herBetweenFeet', 'phoneHeld', 'handsMeet', 'bagHeld', 'strip', 'stripLast', 'rect', 'rectEdge', 'nail', 'mugHis', 'mugHers', 'couchSeam', 'phoneCushion', 'salt'] },
      her: { cam: { x: 2.85, y: 1.56, z: 1.55, f: 1900, cy: 560 }, front: [], split: AW.rectEdge, blur: 2.5, anchors: ['herBetween', 'phoneHeld', 'rect', 'rectEdge', 'nail'] },
      him: { cam: { x: 2.25, y: 1.55, z: 3.0, f: 1800, cy: 560, yaw: Math.PI }, front: [], split: AW.doorHinge, blur: 2.5, anchors: ['himBetween', 'bagHeld', 'doorHinge', 'jacket', 'bareHook'] } },
    mug: { insert: { cam: { x: (R.mugs.his + R.mugs.hers) / 2, y: 1.44, z: 3.42, f: 1500, cy: 470 }, front: [], split: [(R.mugs.his + R.mugs.hers) / 2, 1.3, R.d], anchors: ['mugHis', 'mugHers', 'rect'] } },
    rect: { insert: { cam: { x: R.rect.x0, y: 1.71, z: 3.35, f: 1500, cy: 500 }, front: [], split: AW.rectEdge, anchors: ['rect', 'rectEdge', 'nail'] } },
    hands: { insert: { cam: { x: R.seamX, y: 1.15, z: 1.6, f: 2200, cy: 520 }, front: [], split: AW.handsMeet, blur: 9, anchors: ['handsMeet', 'phoneHeld', 'bagHeld'] } },
  };
  const DEFAULT = { room: 'wide', fridge: 'insert', counter: 'main', couch: 'main', door: 'inside', between: 'two', mug: 'insert', rect: 'insert', hands: 'insert' };
  const MAINTOD = { room: 'night', fridge: 'night', counter: 'night', couch: 'day', door: 'day', between: 'day', mug: 'day', rect: 'day', hands: 'day' };
  const _cams = {};
  function shotOf(view, name) { const sp = SHOTS[view][name || DEFAULT[view]] || SHOTS[view][DEFAULT[view]]; if (!sp._cam) sp._cam = camera(sp.cam); return sp; }
  function project(C, w) { if (C.depth(w[0], w[1], w[2]) < 0.1) return null; const p = C.p(w); return [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10, Math.round(C.k(w[0], w[1], w[2]) * 10) / 10]; }
  function anchorsOf(sp) { if (sp._anch) return sp._anch; const a = {}; sp.anchors.forEach(n => { const p = project(sp._cam, AW[n]); if (p) a[n] = p; }); return (sp._anch = a); }
  function lightOf(sp, tod) {
    const C = sp._cam, t = TOD[tod] || 'night';
    if (t === 'night') { const b = C.p(AW.bulb), subj = AW[sp.anchors[0]] || AW.himCounter, d = [AW.bulb[0] - subj[0], AW.bulb[1] - subj[1], AW.bulb[2] - subj[2]];
      return { kind: 'pendant', x: b[0], y: b[1], color: '#FFE2AE', dir: C.vdir(d), poster: [0.04, 0.42], levels: [0.86, 1], k: 0.66, amb: '#56494F' }; }
    const wp = C.p(AW.window), dir = C.vdir(R.sun.map(v => -v));
    return t === 'day' ? { kind: 'window', x: wp[0], y: wp[1], color: '#E6EBEE', dir, poster: [0.12, 0.5], levels: [0.55, 1], k: 0.62, amb: '#6A6C72' }
      : { kind: 'window, going blue', x: wp[0], y: wp[1], color: '#A9B8DA', dir, poster: [0.15, 0.55], levels: [0.5, 1], k: 0.5, amb: '#3C4458' };
  }
  const stateKey = (view, sp, st) => [st.pan || '', st.bag || '', st.landing === false ? 'nl' : '', view === 'between' ? (st.door || 0) : '', st.phone === 'cushion' && (view === 'couch' || view === 'room' || view === 'door') ? 'pc' : ''].join(',');
  const _sh = {};
  // draw one layer of one shot into g (a cache canvas)
  function drawShotLayer(g, view, shotName, sp, tod, st, layer) {
    const C = sp._cam, L = lights(tod), ex = (sp.exposure || {})[L.tod];
    if (ex) ['amb', 'spill', 'cold', 'coldCore', 'shadow', 'pen', 'sun'].forEach(k => { if (L[k]) L[k] = L[k].map(v => v * ex); }), ['bands', 'steps'].forEach(k => { if (L[k]) L[k] = L[k].map(a => a.map(v => v * ex)); });
    const sh = _sh[view + shotName + L.tod] = _sh[view + shotName + L.tod] || {};
    const landingShot = !!sp.landing;
    const want = n => layer === 'back' ? !sp.front.includes(n) : sp.front.includes(n);
    if (layer === 'back' && !fwd(C)) { shell(g, C, L); frontWall(g, C, L, st); if (!sp.front.includes('leaf')) leaf(g, C, L, st.door || 0); return; }
    if (layer === 'front' && landingShot) { outerWall(g, C, L); return; }
    if (layer === 'back') { g.fillStyle = tone(WALL, L.night ? L.amb : L.steps[0]); g.fillRect(0, 0, W, H); }
    for (const n of ROOMLIST) {
      if (!want(n) && !(landingShot && layer === 'back')) continue;
      if (n === 'shell') shell(g, C, L); else if (n === 'window') sh.window = windowPiece(g, C, L); else if (n === 'kitchenRun') kitchenRun(g, C, L);
      else if (n === 'shelf') shelf(g, C, L); else if (n === 'fridge') fridge(g, C, L, st, sh); else if (n === 'couch') couch(g, C, L, st, sh);
      else if (n === 'counter') counter(g, C, L, st); else if (n === 'stools') stools(g, C, L); else if (n === 'pendant') pendant(g, C, L, sh);
    }
    if (layer === 'back' && st.phone === 'cushion' && C.o.y > K.seat) { const e = hEll(C, R.phoneCushion.x, K.seat + 0.004, R.phoneCushion.z, 0.09); g.save(); g.filter = `blur(${clamp(e.k * 0.01, 2, 12)}px)`; g.fillStyle = 'rgba(20,18,16,0.25)'; g.beginPath(); g.ellipse(e.x, e.y, e.rx * 1.1, e.ry * 0.9, 0, 0, 7); g.fill(); g.restore(); }
  }
  function layerCanvas(c, view, shotName, sp, tod, st, layer) {
    const t = TOD[tod] || MAINTOD[view], key = 'living|' + view + '|' + (shotName || DEFAULT[view]) + '|' + t + '|' + stateKey(view, sp, st) + '|' + layer;
    return c.cache(key, (g, cv) => {
      drawShotLayer(g, view, shotName || DEFAULT[view], sp, t, st, layer);
      if (layer === 'back' && sp.blur) { const tmp = O.makeCanvas(W, H), tg = tmp.getContext('2d'); tg.filter = `blur(${sp.blur}px)`; tg.drawImage(cv, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(tmp, 0, 0); g.drawImage(tmp, 0, 0); }
    }, W, H);
  }
  function makeView(view) {
    const def = shotOf(view);
    const v = {
      back(c, t, s) {
        s = s || {}; const sp = shotOf(view, s.shot), shotName = s.shot && SHOTS[view][s.shot] ? s.shot : DEFAULT[view], tod = TOD[s.tod] || MAINTOD[view];
        const blue = s.blue == null ? 0 : clamp(s.blue, 0, 1);
        c.g.drawImage(layerCanvas(c, view, shotName, sp, blue >= 1 ? 'dusk' : tod, s, 'back'), 0, 0);
        if (blue > 0 && blue < 1) { c.g.save(); c.g.globalAlpha = blue; c.g.drawImage(layerCanvas(c, view, shotName, sp, 'dusk', s, 'back'), 0, 0); c.g.restore(); }
        const L = lights(blue >= 0.5 ? 'dusk' : tod), C = sp._cam, sh = _sh[view + shotName + L.tod] || {};
        // the door leaf, live, behind whoever stands in the doorway (views from the landing)
        if (sp.landing) leaf(c.g, C, L, s.door == null ? sp.open : s.door);
        // light sources into the bloom buffer: the bulb at night, the window by day
        const em = c.em;
        const bulb = L.night ? bulbOf(C) : null;
        if (bulb) { em.fillStyle = 'rgba(255,214,150,1)'; em.beginPath(); em.ellipse(bulb[0], bulb[1], bulb[2] * 0.6, Math.max(2, bulb[3] * 0.8), 0, 0, 7); em.fill(); }
        if (!L.night && sh.window) { em.save(); em.globalAlpha = L.tod === 'day' ? 0.35 : 0.18; em.fillStyle = L.tod === 'day' ? '#DCE2E0' : '#8EA0C8'; em.beginPath(); sh.window.forEach((p, i) => i ? em.lineTo(p[0], p[1]) : em.moveTo(p[0], p[1])); em.closePath(); em.fill(); em.restore(); }
      },
      front(c, t, s) {
        s = s || {}; const sp = shotOf(view, s.shot), shotName = s.shot && SHOTS[view][s.shot] ? s.shot : DEFAULT[view], tod = TOD[s.tod] || MAINTOD[view];
        const blue = s.blue == null ? 0 : clamp(s.blue, 0, 1);
        if (sp.front.length && !(sp.front.length === 1 && sp.front[0] === 'leaf')) {
          c.g.drawImage(layerCanvas(c, view, shotName, sp, blue >= 1 ? 'dusk' : tod, s, 'front'), 0, 0);
          if (blue > 0 && blue < 1) { c.g.save(); c.g.globalAlpha = blue; c.g.drawImage(layerCanvas(c, view, shotName, sp, 'dusk', s, 'front'), 0, 0); c.g.restore(); }
        }
        if (sp.front.includes('leaf')) leaf(c.g, sp._cam, lights(tod), s.door == null ? sp.open : s.door);
        if (SET.debug) debugMarks(c.g, sp);
      },
      shots: {}, world: AW,
    };
    Object.keys(SHOTS[view]).forEach(n => { const sp = shotOf(view, n); v.shots[n] = { cam: sp._cam, anchors: anchorsOf(sp), split: sp._cam.p(sp.split)[0] / W, lights: { night: lightOf(sp, 'night'), day: lightOf(sp, 'day'), dusk: lightOf(sp, 'dusk') } }; v.shots[n].light = v.shots[n].lights[MAINTOD[view]]; });
    Object.assign(v, { cam: v.shots[DEFAULT[view]].cam, anchors: v.shots[DEFAULT[view]].anchors, split: v.shots[DEFAULT[view]].split, lights: v.shots[DEFAULT[view]].lights, light: v.shots[DEFAULT[view]].light });
    // where the door's free edge is at `open` (0..1), in this view's screen space, at height y (metres)
    v.doorEdge = (open, y, shot) => { const sp = shotOf(view, shot), th = clamp(open, 0, 1) * 100 * D2R, x = D.x0 + 0.025 + D.leaf * Math.cos(th), z = D.leaf * Math.sin(th); return project(sp._cam, [x, y == null ? 1.05 : y, z]); };
    v.project = (w, shot) => project(shotOf(view, shot)._cam, w);
    return v;
  }
  // where the bulb is on screen (for the bloom), straight from the camera, so back() never depends on front() having run
  function bulbOf(C) { const P = R.pendant; if (C.depth(P.x, P.rim, P.z) < 0.2) return null; const er = hEll(C, P.x, P.rim, P.z, P.r); return [er.x, er.y - (C.o.y < P.rim ? er.ry * 0.35 : 0), er.rx, er.ry]; }
  function debugMarks(g, sp) {
    const a = anchorsOf(sp); g.save(); g.font = '600 16px monospace'; g.lineWidth = 2;
    Object.keys(a).forEach(n => { const [x, y] = a[n]; g.strokeStyle = '#E0306A'; g.beginPath(); g.moveTo(x - 9, y); g.lineTo(x + 9, y); g.moveTo(x, y - 9); g.lineTo(x, y + 9); g.stroke(); g.fillStyle = '#F0E070'; g.fillText(n, x + 8, y - 6); });
    const sx = sp._cam.p(sp.split)[0]; g.strokeStyle = 'rgba(240,224,112,0.6)'; g.setLineDash([12, 10]); g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx, H); g.stroke(); g.restore();
  }

  // =====================================================================================================================
  // THE SET
  // =====================================================================================================================
  const SET = window.SETS.living = { views: {}, world: R, anchorsWorld: AW, camera, debug: false,
    // helpers for the sequences: the pan (in his hands) and the makeup bag, drawn in the same paper, lit by the given level
    pan: (g, x, y, pxPerM, o) => { o = o || {}; const rx = R.pan.r * pxPerM; drawPan(g, x, y, rx, rx * (o.squash == null ? 0.34 : o.squash), { lv: o.lv || lights(o.tod || 'night').bands[2], handle: o.handle, food: o.food }); },
    makeupBag: (g, x, y, pxPerM, o) => { o = o || {}; drawBag(g, x, y, pxPerM, { lv: o.lv || lights(o.tod || 'day').steps[1], rot: o.rot }); },
    levelAt: (tod, x, y, z) => levelAt(lights(tod), x, y, z),
  };
  Object.keys(SHOTS).forEach(v => { SET.views[v] = makeView(v); });

  // demos: every view at every time of day the sequences use, 4 s each
  const V = SET.views, T = window.FILM || { seg: (t, a, b) => clamp((t - a) / (b - a), 0, 1) };
  const demo = (name, view, s, extra) => ({ name, draw(c, t) { const st = typeof s === 'function' ? s(t) : s; V[view].back(c, t, st); V[view].front(c, t, st); } });
  SET.demos = [
    demo('room: night (Q06)', 'room', { tod: 'night' }),
    demo('room: day (Q08, Q10)', 'room', { tod: 'day' }),
    demo('room: dusk (Q11)', 'room', { tod: 'dusk', phone: 'cushion' }),
    demo('fridge: night (Q06)', 'fridge', { tod: 'night' }),
    demo('fridge: day (Q08)', 'fridge', { tod: 'day' }),
    demo('counter: night (Q06)', 'counter', { tod: 'night' }),
    demo('counter close: night (Q06)', 'counter', { tod: 'night', shot: 'close' }),
    demo('couch: day (Q08, Q09)', 'couch', { tod: 'day', phone: 'cushion' }),
    demo('couch: day going blue (Q11)', 'couch', t => ({ tod: 'day', blue: clamp(t / 4, 0, 1) * 0.6 + 0.2, phone: 'cushion' })),
    demo('couch close: dusk (Q11)', 'couch', { tod: 'dusk', shot: 'close', phone: 'cushion' }),
    demo('door: inside, opening, day (Q08)', 'door', t => ({ tod: 'day', door: clamp((t - 0.4) / 2.6, 0, 1) * 0.9 })),
    demo('door: from the landing, deep, day (Q08)', 'door', { tod: 'day', shot: 'deep', phone: 'cushion' }),
    demo('door: from the landing, close, day (Q08)', 'door', { tod: 'day', shot: 'close' }),
    demo('between: day (Q09, Q10)', 'between', { tod: 'day' }),
    demo('between her: day (Q10)', 'between', { tod: 'day', shot: 'her' }),
    demo('between him: day (Q10)', 'between', { tod: 'day', shot: 'him' }),
    demo('mug: day (Q08)', 'mug', { tod: 'day' }),
    demo('rect: day (Q08)', 'rect', { tod: 'day' }),
    demo('hands: day (Q10)', 'hands', { tod: 'day' }),
  ];
})();
