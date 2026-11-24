/* LONG DISTANCE — the characters (RIG). Him, Her, the coworker over the divider, the passengers on the bus.
   Look B, Grain and Gloss: people are sculpted, not drawn. Heads and hands are the kit's signed-distance sculptures (the same
   faces as GG.CAST, so the strip, the waterfall and the doorway are one face), lit in cut bands and laid with paper. Bodies and
   clothes are cut paper: hand-cut edges, their own textures, soft lifted shadows, two or three posterised bands of light.

   Everything costly is rendered once and kept: a head or hand is sculpted per (character, pose, angle, lids, mouth, light, scale),
   its parameters quantised so a shot animated on twos needs only a handful of distinct sculptures, and each body layer is cut
   once per pose state. The rig keeps its own least-recently-used cache with a memory budget (RIG.cacheBudgetPx).

   The rig carries its own copy of the kit's head sculpture and renderer (kit/look_b.js: makeSDF, head, render3D), unchanged in
   shape and shading, with what the film needs added: the red paper band that rises up his neck and ears (flush), the band of
   colour draining from his face (pale), a jaw that drops a little with the mouth, and the jaw's shadow on the throat. The
   renderer starts each ray near the surface and skips features that provably cannot change the surface (about half the cost),
   and keeps each head's geometry (a G-buffer) so lids, gaze, flush, pale and light changes only reshade it. If the kit's
   sculpture changes, change it here too.
   Deterministic: no Math.random, no Date. API: film/api/rig.md. Demos: node tools/set.js rig 1 */
(function (G) {
  'use strict';
  const O = G.OTM, GG = G.GG, W = O.W, H = O.H;
  const { clamp, lerp, mix, hexToRgb, vnoise, fbm, rng, makeCanvas } = O;
  const S = O.S;
  const RIG = G.RIG = { version: 1 };
  const now = () => (G.performance ? G.performance.now() : 0);
  // the mouth envelopes (audio/voice_env.js, written by tools/voice_env.py) load beside the rig; RIG.ready resolves when they have
  RIG.ready = (function () {
    if (G.FILM_VOICE_ENV || !G.document) return Promise.resolve(true);
    const cs = G.document.currentScript; const base = cs && cs.src ? cs.src.replace(/film\/rig\.js(\?.*)?$/, '') : '../';
    return new Promise(res => { const sc = G.document.createElement('script'); sc.src = base + 'audio/voice_env.js'; sc.onload = () => res(true); sc.onerror = () => { console.warn('[rig] audio/voice_env.js not found: run python3 tools/voice_env.py'); res(false); }; G.document.head.appendChild(sc); });
  })();

  // ================================================================ small utils
  const rgb01 = hex => hexToRgb(hex).map(v => v / 255);
  const toHex = a => '#' + a.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const mulHex = (a, b, k) => { const x = hexToRgb(a), y = hexToRgb(b); return toHex(x.map((v, i) => v * y[i] / 255 * (k == null ? 1 : k))); };
  const lum = hex => { const [r, g, b] = hexToRgb(hex); return 0.299 * r + 0.587 * g + 0.114 * b; };
  const grey = (hex, k) => { const L = lum(hex); return toHex(hexToRgb(hex).map(v => lerp(v, L, k))); };
  const q = (v, step) => Math.round((v || 0) / step) * step;
  const qf = (v, step) => +q(v, step).toFixed(4);
  const ss01 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const devScale = g => { const m = g.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; };
  // render scales come in steps of 2^(1/5) (about 15 %), always rounded up, so a slow push re-sculpts rarely and stays crisp
  const qScale = R => Math.pow(2, Math.ceil(Math.log2(Math.max(4, R)) * 5 - 1e-6) / 5);
  const twos = t => Math.floor(t * 12 + 1e-6) / 12;
  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], mul: (a, k) => [a[0] * k, a[1] * k],
    len: a => Math.hypot(a[0], a[1]), norm: a => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; },
    perp: a => [-a[1], a[0]], lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
    rot: (a, r) => [a[0] * Math.cos(r) - a[1] * Math.sin(r), a[0] * Math.sin(r) + a[1] * Math.cos(r)], dot: (a, b) => a[0] * b[0] + a[1] * b[1],
  };
  RIG.V = V;

  // ================================================================ the cache: least recently used, with a memory budget
  // Map keeps insertion order, so a hit moves the entry to the end and eviction takes from the front: O(1) both ways.
  const LRU = new Map();
  RIG.cacheBudgetPx = 64e6;          // ≈ 256 MB of canvas memory (4 bytes a pixel): about 260 heads at 300 px, or 30 full-frame layers
  RIG.stats = { hits: 0, misses: 0, sculpts: 0, sculptMs: 0, layers: 0, layerMs: 0, px: 0, evicted: 0, log: [] };
  function cget(key) { const e = LRU.get(key); if (e) { LRU.delete(key); LRU.set(key, e); RIG.stats.hits++; } else RIG.stats.misses++; return e; }
  function cput(key, e) {
    e.px = (e.px || 0) + (e.img ? e.img.width * e.img.height : 0) + (e.shadow ? e.shadow.width * e.shadow.height : 0);
    LRU.set(key, e); RIG.stats.px += e.px;
    while (RIG.stats.px > RIG.cacheBudgetPx && LRU.size > 1) { const k = LRU.keys().next().value; if (k === key) break; RIG.stats.px -= LRU.get(k).px; LRU.delete(k); RIG.stats.evicted++; }
    return e;
  }
  RIG.cacheClear = () => { LRU.clear(); RIG.stats.px = 0; if (typeof GLRU !== 'undefined') { GLRU.clear(); gBytes = 0; } };
  RIG.cacheInfo = () => ({ entries: LRU.size, mpx: +(RIG.stats.px / 1e6).toFixed(1), budgetMpx: RIG.cacheBudgetPx / 1e6, gbufs: GLRU.size, gbufMB: Math.round(gBytes / 1e6), hits: RIG.stats.hits, misses: RIG.stats.misses, sculpts: RIG.stats.sculpts, reshades: RIG.stats.reshades || 0, sculptMs: Math.round(RIG.stats.sculptMs), layers: RIG.stats.layers, layerMs: Math.round(RIG.stats.layerMs), evicted: RIG.stats.evicted });
  function logCost(kind, key, ms) { RIG.stats.log.push([kind, key.slice(0, 90), Math.round(ms)]); if (RIG.stats.log.length > 400) RIG.stats.log.shift(); }

  // ================================================================ light
  // One light per shot, read two ways: `keys` (+ an optional phone) light the sculptures (view space, head units; posterised
  // unless they are the phone's); `paper` shades the cut-paper body: a multiply for the costume colours, the direction the light
  // comes from on screen (for the lit edge and the core shadow), and their colours.
  const LIGHTS = {
    night: { amb: '#323C58', keys: [{ dir: [0.3, -0.7, 0.4], col: '#7E92C0', k: 0.22, poster: [0.4], levels: [1] }],
      phone: { col: '#FFC09A', k: 2.0, falloff: 1.4, wrap: 0.25, z: 0.9 },
      paper: { mul: '#5A6A90', gain: 0.95, from: [0.35, -0.9], lit: '#7E93C2', litA: 0.32, shade: '#0C1019', shadeA: 0.55 }, skinMul: '#8E9AB8', shadow: '#05060A' },
    later: { amb: '#2A3350', keys: [{ dir: [0.36, -0.7, 0.4], col: '#6E82B0', k: 0.18, poster: [0.4], levels: [1] }],
      phone: { col: '#FFC09A', k: 2.0, falloff: 1.4, wrap: 0.25, z: 0.9 },
      paper: { mul: '#4E5D84', gain: 0.92, from: [0.4, -0.9], lit: '#6E82B0', litA: 0.28, shade: '#0C1019', shadeA: 0.6 }, skinMul: '#8692B0', shadow: '#05060A' },
    pendant: { amb: '#56494F', keys: [{ dir: [0.1, -0.5, 0.86], col: '#F6D6B0', k: 0.66, poster: [0.04, 0.42], levels: [0.86, 1], wrap: 0.25 }],
      phone: { col: '#CDEFF3', k: 0.75, falloff: 2.2, z: 0.9 },
      paper: { mul: '#F0E2D2', gain: 1.0, from: [0.05, -1], lit: '#E8D2B4', litA: 0.42, shade: '#2A2329', shadeA: 0.55 }, skinMul: '#FFFFFF', shadow: '#0E0A0C' },
    day: { amb: '#6A6C72', keys: [{ dir: [-0.72, -0.28, 0.62], col: '#E6EBEE', k: 0.62, poster: [0.12, 0.5], levels: [0.55, 1] }],
      phone: { col: '#C8EEF2', k: 0.5, falloff: 1.6, z: 0.9 },
      paper: { mul: '#E4E2DC', gain: 1.0, from: [-0.8, -0.55], lit: '#C9C6BD', litA: 0.45, shade: '#2A2C30', shadeA: 0.5 }, skinMul: '#FFFFFF', shadow: '#16171B' },
    dusk: { amb: '#4E5672', keys: [{ dir: [-0.7, -0.3, 0.6], col: '#AEBCD8', k: 0.5, poster: [0.15, 0.5], levels: [0.5, 1] }],
      phone: { col: '#FFC5A0', k: 1.2, falloff: 1.5, wrap: 0.2, z: 0.9 },
      paper: { mul: '#A8B2C8', gain: 0.95, from: [-0.8, -0.55], lit: '#9AA8C4', litA: 0.38, shade: '#1C2232', shadeA: 0.55 }, skinMul: '#D6DCEA', shadow: '#0C0E16' },
    bathroom: { amb: '#7A8088', keys: [{ dir: [0.55, -0.35, 0.7], col: '#E8EEF2', k: 0.55, poster: [0.15, 0.5], levels: [0.6, 1] }],
      phone: { col: '#FFC5A0', k: 0.9, falloff: 1.4, z: 0.9 },
      paper: { mul: '#E8ECEE', gain: 1.0, from: [0.7, -0.6], lit: '#F0F2F2', litA: 0.38, shade: '#3A4048', shadeA: 0.45 }, skinMul: '#F4F6F8', shadow: '#20242A' },
    office: { amb: '#6E7570', keys: [{ dir: [0.05, -0.85, 0.5], col: '#E6F0E6', k: 0.5, poster: [0.2, 0.55], levels: [0.6, 1] }],
      phone: { col: '#FFC5A0', k: 0.9, falloff: 1.4, z: 0.9 },
      paper: { mul: '#DCE2DA', gain: 1.0, from: [0.05, -1], lit: '#E2EAE0', litA: 0.38, shade: '#3A403C', shadeA: 0.45 }, skinMul: '#F2F6F0', shadow: '#1A1E1C' },
    stairwell: { amb: '#5A5C60', keys: [{ dir: [-0.45, -0.75, 0.5], col: '#DCDCD8', k: 0.5, poster: [0.3], levels: [1] }],
      phone: { col: '#FFD0B8', k: 1.3, falloff: 1.3, wrap: 0.2, z: 0.9 },
      paper: { mul: '#C8C8C4', gain: 0.95, from: [-0.5, -0.85], lit: '#D2D2CC', litA: 0.35, shade: '#26282C', shadeA: 0.55 }, skinMul: '#E2E2E0', shadow: '#121316' },
    bus: { amb: '#2E3550', keys: [{ dir: [-0.85, -0.2, 0.5], col: '#F0A050', k: 0.7, poster: [0.3], levels: [1] }, { dir: [0.6, -0.4, 0.5], col: '#6A80B8', k: 0.25, poster: [0.4], levels: [1] }],
      phone: { col: '#FFC5A0', k: 1.3, falloff: 1.3, wrap: 0.2, z: 0.9 },
      paper: { mul: '#6A7096', gain: 0.95, from: [-0.95, -0.3], lit: '#E09048', litA: 0.42, shade: '#0E1222', shadeA: 0.6 }, skinMul: '#B0B2C8', shadow: '#06070E' },
    flat: { amb: '#6C6A68', keys: [{ dir: [-0.5, -0.5, 0.7], col: '#F0ECE4', k: 0.55, poster: [0.12, 0.5], levels: [0.55, 1] }],
      phone: { col: '#FFC5A0', k: 0.9, falloff: 1.4, z: 0.9 },
      paper: { mul: '#ECEAE4', gain: 1.0, from: [-0.6, -0.8], lit: '#E8E4DA', litA: 0.4, shade: '#2A2A2E', shadeA: 0.45 }, skinMul: '#FFFFFF', shadow: '#16161A' },
  };
  RIG.LIGHTS = LIGHTS;
  // RIG.light('night', { phone: [x, y] }) : a shot's light. The phone (world px, where its screen is) adds its smooth light to every
  // sculpture, from that point. Options: phone, phoneZ (head units toward us), phoneK, phoneCol, keyK (scales the keys), amb.
  RIG.light = function (name, o) {
    const base = LIGHTS[name] || LIGHTS.flat; o = o || {};
    const L = Object.assign({}, base, { name: name, paper: Object.assign({}, base.paper, o.paper || {}) });
    if (o.amb) L.amb = o.amb;
    if (o.keys) L.keys = o.keys; else if (o.keyK != null) L.keys = base.keys.map(k => Object.assign({}, k, { k: k.k * o.keyK }));
    if (o.phone) { L.phoneAt = o.phone; L.phone = Object.assign({}, base.phone, o.phoneCol ? { col: o.phoneCol } : {}, o.phoneK != null ? { k: o.phoneK } : {}, o.phoneZ != null ? { z: o.phoneZ } : {}); }
    if (o.phoneAlpha != null && L.phone) L.phone = Object.assign({}, L.phone, { k: L.phone.k * o.phoneAlpha });
    // soft faces (the review of cut 1): in grey daylight, bathroom and office light the faces take one gentle cut, the shadow side
    // still holding most of the key, and the cut's edge barely wobbles; no hard pale islands. o.soft 0..1 (0: the old hard bands)
    const soft = o.soft != null ? o.soft : (SOFT[name] || 0);
    if (soft > 0) L.keys = L.keys.map(k => k.poster && !k.smooth ? Object.assign({}, k, { poster: [lerp(k.poster[0], 0.18, soft)], levels: [1], floor: 0.68 * soft, jit: lerp(1, 0.3, soft) }) : k);
    L.soft = soft;
    return L;
  };
  const SOFT = { day: 1, dusk: 1, bathroom: 0.8, office: 0.8, flat: 0.6, stairwell: 0.5 };
  const asLight = l => !l ? RIG.light('flat') : typeof l === 'string' ? RIG.light(l) : (l.paper ? l : Object.assign(RIG.light(l.name || 'flat'), l));
  RIG.asLight = asLight;
  // the lights for one sculpture at world (hx, hy), scale s (px per unit): the phone becomes a point light relative to it
  function sculptLights(L, hx, hy, s, flipX) {
    const out = (L.keys || []).map(k => Object.assign({}, k));   // (keys may carry `floor`: the level of the shadow side)
    if (L.phoneAt && L.phone && L.phone.k > 0.01) {
      const ph = L.phone; const px = qf((L.phoneAt[0] - hx) / s, 0.1), py = qf((L.phoneAt[1] - hy) / s, 0.1);
      out.push({ pos: [px, py, ph.z == null ? 0.9 : ph.z], col: ph.col, k: qf(ph.k, 0.05), falloff: ph.falloff || 1.4, wrap: ph.wrap || 0 });
    }
    if (flipX) out.forEach(k => { if (k.dir) k.dir = [-k.dir[0], k.dir[1], k.dir[2]]; if (k.pos) k.pos = [-k.pos[0], k.pos[1], k.pos[2]]; });
    return { amb: L.amb, lights: out };
  }
  const lightKey = sl => sl.amb + '|' + sl.lights.map(k => [k.dir ? 'd' + k.dir.map(v => v.toFixed(2)) : 'p' + k.pos.map(v => v.toFixed(2)), k.col, (+k.k).toFixed(2), k.poster || '', k.levels || '', k.wrap || 0, k.falloff || 0, k.local ? 'L' : '', k.floor || 0, k.jit == null ? '' : k.jit].join(',')).join(';');

  // ================================================================ the sculpture renderer (the kit's render3D, split in two)
  // geom3D marches the rays (from just in front of the coarse pass's hits, which roughly halves the cost) and keeps, per pixel hit,
  // where it hit, its normal, occlusion and material: a G-buffer. shade3D lights it with the kit's own shading. Anything that only
  // colours the surface (lids, gaze, brows, smile, flush, pale, the light) reshades a kept G-buffer instead of sculpting again.
  const GSTRIDE = 14;
  function geom3D(o) {
    const M = o.M, sdf = o.sdf, s = o.s, ss = o.ss || 2, b = o.bounds, sd = o.seed || 1, warpAmp = o.warp || 0;
    const w = Math.ceil((b[2] - b[0]) * s), h = Math.ceil((b[3] - b[1]) * s), w2 = Math.ceil(w * ss), h2 = Math.ceil(h * ss);
    const T = [[M[0][0], M[1][0], M[2][0]], [M[0][1], M[1][1], M[2][1]], [M[0][2], M[1][2], M[2][2]]];
    const dlx = -T[0][2], dly = -T[1][2], dlz = -T[2][2];
    const ex = (o.extent || 3), e = o.eps || 0.0016, aoK = o.aoK == null ? 1 : o.aoK;
    const inv = 1 / (s * ss);
    const cw = Math.ceil(w2 / 8), chh = Math.ceil(h2 / 8); const ct = new Float32Array(cw * chh).fill(-1);
    for (let j = 0; j < h2; j += 8) for (let i = 0; i < w2; i += 8) {
      const X = b[0] + (i + 4) * inv, Y = b[1] + (j + 4) * inv; const ox = T[0][0] * X + T[0][1] * Y + T[0][2] * ex, oy = T[1][0] * X + T[1][1] * Y + T[1][2] * ex, oz = T[2][0] * X + T[2][1] * Y + T[2][2] * ex;
      let t = 0; for (let k = 0; k < 80 && t < ex * 2; k++) { const d = sdf(ox + dlx * t, oy + dly * t, oz + dlz * t); if (d < 8 * inv * 1.5) { ct[(j >> 3) * cw + (i >> 3)] = t; break; } t += d * 0.9; }
    }
    const cn = new Float32Array(cw * chh).fill(-1);
    for (let cj = 0; cj < chh; cj++) for (let ci = 0; ci < cw; ci++) {
      let m = 1e9; for (let b2 = -1; b2 <= 1; b2++) for (let a2 = -1; a2 <= 1; a2++) { const x2 = ci + a2, y2 = cj + b2; if (x2 < 0 || y2 < 0 || x2 >= cw || y2 >= chh) continue; const v = ct[y2 * cw + x2]; if (v >= 0 && v < m) m = v; }
      cn[cj * cw + ci] = m < 1e9 ? m : -1;
    }
    const MARGIN = 0.1;                                   // start this far (head units) in front of the nearest coarse hit
    let cap = 1 << 16, data = new Float32Array(cap * GSTRIDE), idx = new Int32Array(cap), n = 0;
    for (let j = 0; j < h2; j++) for (let i = 0; i < w2; i++) {
      const tn = cn[(j >> 3) * cw + (i >> 3)]; if (tn < 0) continue;
      let px = i, py = j; const wx = (i / ss) + b[0] * s, wy = (j / ss) + b[1] * s;
      if (warpAmp) { px += ((vnoise(wx * 0.07, wy * 0.07, sd + 61) - 0.5) * 2 + (vnoise(wx * 0.45, wy * 0.45, sd + 62) - 0.5) * 0.7) * warpAmp * ss; py += ((vnoise(wx * 0.07 + 40, wy * 0.07, sd + 63) - 0.5) * 2 + (vnoise(wx * 0.45, wy * 0.45 + 9, sd + 64) - 0.5) * 0.7) * warpAmp * ss; }
      const X = b[0] + (px + 0.5) * inv, Y = b[1] + (py + 0.5) * inv;
      const ox = T[0][0] * X + T[0][1] * Y + T[0][2] * ex, oy = T[1][0] * X + T[1][1] * Y + T[1][2] * ex, oz = T[2][0] * X + T[2][1] * Y + T[2][2] * ex;
      let t = Math.max(0, tn - MARGIN), hit = false, x = 0, y = 0, z = 0;
      if (t > 0 && sdf(ox + dlx * t, oy + dly * t, oz + dlz * t) < 0.002) t = 0;     // started inside: march from the front
      const tEnd = Math.min(ex * 2, tn + (o.depth || 1.5));
      for (let k = 0; k < 110 && t < tEnd; k++) { x = ox + dlx * t; y = oy + dly * t; z = oz + dlz * t; const d = sdf(x, y, z); if (d < 0.0008) { hit = true; break; } t += d * 0.92; }
      if (!hit) continue;
      const mat = o.matOf ? o.matOf(x, y, z) : 0;          // the last march step evaluated the sdf at this very point
      const a1 = sdf(x + e, y - e, z - e), a2 = sdf(x - e, y - e, z + e), a3 = sdf(x - e, y + e, z - e), a4 = sdf(x + e, y + e, z + e);
      let nx = a1 - a2 - a3 + a4, ny = -a1 - a2 + a3 + a4, nz = -a1 + a2 - a3 + a4; const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      const o1 = sdf(x + nx * 0.025 * aoK, y + ny * 0.025 * aoK, z + nz * 0.025 * aoK), o2 = sdf(x + nx * 0.07 * aoK, y + ny * 0.07 * aoK, z + nz * 0.07 * aoK);
      const ao = clamp(1 - 5 / aoK * (Math.max(0, 0.025 * aoK - o1) + 0.5 * Math.max(0, 0.07 * aoK - o2)), 0.35, 1);
      if (n >= cap) { const d2 = new Float32Array(cap * 2 * GSTRIDE); d2.set(data); data = d2; const i2 = new Int32Array(cap * 2); i2.set(idx); idx = i2; cap *= 2; }
      const q0 = n * GSTRIDE; idx[n] = j * w2 + i;
      data[q0] = x; data[q0 + 1] = y; data[q0 + 2] = z; data[q0 + 3] = nx; data[q0 + 4] = ny; data[q0 + 5] = nz; data[q0 + 6] = mat; data[q0 + 7] = ao;
      data[q0 + 8] = M[0][0] * nx + M[0][1] * ny + M[0][2] * nz; data[q0 + 9] = M[1][0] * nx + M[1][1] * ny + M[1][2] * nz; data[q0 + 10] = M[2][0] * nx + M[2][1] * ny + M[2][2] * nz;
      data[q0 + 11] = M[0][0] * x + M[0][1] * y + M[0][2] * z; data[q0 + 12] = M[1][0] * x + M[1][1] * y + M[1][2] * z; data[q0 + 13] = M[2][0] * x + M[2][1] * y + M[2][2] * z;
      n++;
    }
    return { w, h, w2, h2, n, data: data.subarray(0, n * GSTRIDE), idx: idx.subarray(0, n), b, s, ss, M, seed: sd, bytes: n * (GSTRIDE * 4 + 4) };
  }
  function shade3D(gb, o) {
    const mode = o.mode || 'grain', grain = mode === 'grain', gloss = mode === 'gloss', flash = mode === 'flash';
    const M = gb.M, out = o.out, sd = gb.seed, { w, h, w2, h2, b, s, ss } = gb;
    const cv = makeCanvas(w2, h2), cg = cv.getContext('2d'), img = cg.createImageData(w2, h2), D = img.data;
    const lights = (o.lights || [{ dir: [-0.5, -0.4, 0.75], col: [1, 0.95, 0.9], k: 1, poster: [0.12, 0.5] }]).map(L => {
      const qq = Object.assign({ k: 1, wrap: 0 }, L);
      if (qq.dir) { let [x, y, z] = qq.dir; if (qq.local) { const vx = M[0][0] * x + M[0][1] * y + M[0][2] * z, vy = M[1][0] * x + M[1][1] * y + M[1][2] * z, vz = M[2][0] * x + M[2][1] * y + M[2][2] * z; x = vx; y = vy; z = vz; } const l = Math.hypot(x, y, z) || 1; qq.d = [x / l, y / l, z / l]; }
      qq.c = Array.isArray(qq.col) ? qq.col : rgb01(qq.col || '#FFFFFF'); return qq;
    });
    const amb = o.amb ? (Array.isArray(o.amb) ? o.amb : rgb01(o.amb)) : [0.25, 0.25, 0.3];
    const G = gb.data, I = gb.idx, soft = o.soft || 0;
    for (let k0 = 0; k0 < gb.n; k0++) {
      const q0 = k0 * GSTRIDE, pix = I[k0], i = pix % w2, j = (pix - i) / w2;
      const wx = (i / ss) + b[0] * s, wy = (j / ss) + b[1] * s;
      const x = G[q0], y = G[q0 + 1], z = G[q0 + 2], nx = G[q0 + 3], ny = G[q0 + 4], nz = G[q0 + 5], mat = G[q0 + 6]; let ao = G[q0 + 7];
      const vx = G[q0 + 8], vy = G[q0 + 9], vz = G[q0 + 10], hx = G[q0 + 11], hy = G[q0 + 12], hz = G[q0 + 13];
      o.albedo(x, y, z, nx, ny, nz, mat, vx, vy, vz);
      // soft (daylight) faces: the light reads the head's big form, not every bump: the normal is blended toward an ellipsoid's (the
      // neck's cylinder below the jaw), the cut does not wobble, and the occlusion is soft. One light, one shadow.
      let lvx = vx, lvy = vy, lvz = vz;
      if (soft > 0 && o.proxy === 'head') { let px2, py2, pz2; if (y > 0.46) { px2 = x; py2 = 0; pz2 = z + 0.08; } else { px2 = x / 0.13; py2 = (y - 0.05) / 0.2; pz2 = (z + 0.02) / 0.18; }
        const pl = Math.sqrt(px2 * px2 + py2 * py2 + pz2 * pz2) || 1; const kk = (mat === 2 ? 0.45 : 0.85) * soft; let bx = nx * (1 - kk) + px2 / pl * kk, by = ny * (1 - kk) + py2 / pl * kk, bz = nz * (1 - kk) + pz2 / pl * kk; const bl = Math.sqrt(bx * bx + by * by + bz * bz) || 1; bx /= bl; by /= bl; bz /= bl;
        lvx = M[0][0] * bx + M[0][1] * by + M[0][2] * bz; lvy = M[1][0] * bx + M[1][1] * by + M[1][2] * bz; lvz = M[2][0] * bx + M[2][1] * by + M[2][2] * bz; }
      const jit = grain ? (vnoise(wx * 0.045, wy * 0.045, sd + 77) - 0.5) * 0.12 * (1 - soft) : 0;
      let lr = amb[0], lg = amb[1], lb = amb[2];
      if (soft > 0) ao = lerp(1, ao, 0.5 * (1 - 0.5 * soft));
      else if (grain && o.aoPoster !== false) ao = ao > 0.62 + jit ? 1 : (o.aoLow || 0.7);
      if (gloss) ao = lerp(1, ao, 0.35);
      lr *= lerp(1, ao, 0.9); lg *= lerp(1, ao, 0.9); lb *= lerp(1, ao, 0.9);
      let spec2 = 0;
      for (let li = 0; li < lights.length; li++) {
        const L = lights[li]; let dx, dy, dz, att = 1;
        if (L.pos) { dx = L.pos[0] - hx; dy = L.pos[1] - hy; dz = L.pos[2] - hz; const dl = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1; dx /= dl; dy /= dl; dz /= dl; att = L.falloff ? 1 / (1 + (dl / L.falloff) * (dl / L.falloff)) : 1; }
        else { dx = L.d[0]; dy = L.d[1]; dz = L.d[2]; }
        let k = lvx * dx + lvy * dy + lvz * dz; k = (k + L.wrap) / (1 + L.wrap); k = Math.max(0, k) * att;
        if (L.poster && (grain || flash) && !L.smooth) { const pts = L.poster; let lv = L.floor || 0; for (let qq = 0; qq < pts.length; qq++) if (k > pts[qq] + jit * (L.jit == null ? 1 : L.jit)) lv = (L.levels ? L.levels[qq] : (qq + 1) / pts.length); k = lv; }
        if (L.rim) { const fr = Math.pow(1 - Math.max(0, vz), L.rim); k *= fr; if (grain) k = k > 0.25 + jit ? 1 : 0; }
        k *= L.k * (mat === 1 ? 0.95 : 1) * (L.ao === false ? 1 : lerp(1, ao, 0.5));
        lr += L.c[0] * k; lg += L.c[1] * k; lb += L.c[2] * k;
        if (gloss && !L.rim) { const hx2 = dx, hy2 = dy, hz2 = dz + 1, hl = Math.sqrt(hx2 * hx2 + hy2 * hy2 + hz2 * hz2) || 1; const ndh = Math.max(0, (vx * hx2 + vy * hy2 + vz * hz2) / hl); spec2 += Math.pow(ndh, mat === 2 ? 18 : 22) * (mat === 2 ? 0.3 : 0.07) * L.k * att; }
      }
      let r = out[0] * lr, g2 = out[1] * lg, bb = out[2] * lb;
      if (gloss) { r += spec2; g2 += spec2 * 0.95; bb += spec2 * 0.92; }
      if (flash) { r = r * 1.08 + 0.03; g2 = g2 * 1.04 + 0.03; bb = bb * 0.98 + 0.02; }
      const qi = pix * 4; D[qi] = clamp(r * 255, 0, 255); D[qi + 1] = clamp(g2 * 255, 0, 255); D[qi + 2] = clamp(bb * 255, 0, 255); D[qi + 3] = 255;
    }
    cg.putImageData(img, 0, 0);
    if (ss === 1) return { canvas: cv, x: b[0] * s, y: b[1] * s, w, h };
    const outC = makeCanvas(w, h), og = outC.getContext('2d'); og.imageSmoothingQuality = 'high'; og.drawImage(cv, 0, 0, w, h);
    return { canvas: outC, x: b[0] * s, y: b[1] * s, w, h };
  }
  function render3D(o) { return shade3D(o.gbuf || geom3D(o), o); }
  // the kept G-buffers: their own small LRU (they are large: ~10 MB for a 300 px head)
  const GLRU = new Map(); let gBytes = 0; RIG.gbufBudgetBytes = 160e6;
  function gget(key) { const e = GLRU.get(key); if (e) { GLRU.delete(key); GLRU.set(key, e); } return e; }
  function gput(key, gb) { GLRU.set(key, gb); gBytes += gb.bytes; while (gBytes > RIG.gbufBudgetBytes && GLRU.size > 1) { const k = GLRU.keys().next().value; if (k === key) break; gBytes -= GLRU.get(k).bytes; GLRU.delete(k); } return gb; }

  // ================================================================ SDF primitives (as the kit's)
  const rotM = GG.rotM, basisM = GG.basisM;
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  const smax = (a, b, k) => -smin(-a, -b, k);
  function sdE(x, y, z, rx, ry, rz) { const ax = x / rx, ay = y / ry, az = z / rz; const k0 = Math.sqrt(ax * ax + ay * ay + az * az); const bx = ax / rx, by = ay / ry, bz = az / rz; const k1 = Math.sqrt(bx * bx + by * by + bz * bz) || 1e-6; return k0 * (k0 - 1) / k1; }
  function sdCap(x, y, z, ax, ay, az, bx, by, bz, r) { const px = x - ax, py = y - ay, pz = z - az, dx = bx - ax, dy = by - ay, dz = bz - az; const h = clamp((px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz), 0, 1); const qx = px - dx * h, qy = py - dy * h, qz = pz - dz * h; return Math.sqrt(qx * qx + qy * qy + qz * qz) - r; }
  function sdCone(x, y, z, ax, ay, az, bx, by, bz, r1, r2) { const px = x - ax, py = y - ay, pz = z - az, dx = bx - ax, dy = by - ay, dz = bz - az; const L2 = dx * dx + dy * dy + dz * dz; const h = clamp((px * dx + py * dy + pz * dz) / L2, 0, 1); const qx = px - dx * h, qy = py - dy * h, qz = pz - dz * h; return Math.sqrt(qx * qx + qy * qy + qz * qz) - lerp(r1, r2, h); }
  function lerpTab(tab, x) { if (x <= tab[0][0]) return tab[0][1]; for (let i = 1; i < tab.length; i++) if (x <= tab[i][0]) { const t = (x - tab[i - 1][0]) / (tab[i][0] - tab[i - 1][0]); const s = t * t * (3 - 2 * t); return lerp(tab[i - 1][1], tab[i][1], s); } return tab[tab.length - 1][1]; }
  const HAIRLINE = {
    short: [[0, -0.345], [0.45, -0.325], [0.85, -0.25], [1.15, -0.06], [1.32, 0.05], [1.5, -0.02], [1.75, 0.0], [2.2, 0.16], [Math.PI, 0.24]],
    long: [[0, -0.36], [0.5, -0.33], [0.95, -0.2], [1.25, 0.02], [1.6, 0.1], [2.2, 0.3], [Math.PI, 0.35]],
  };
  // the cast: the kit's two, plus the coworker (a sculpture of his own, in the same clay)
  const CAST = Object.assign({}, GG.CAST, {
    coworker: { jawW: 0.318, chin: 1.0, nose: 1.06, neckR: 0.19, browK: 1.25, lipsW: 0.95, lipsT: 0.7, eyeK: 0.9,
      skin: '#C9A088', lips: '#9C6A5E', hair: '#5A5048', hairHi: '#8A8076', iris: '#3A4A52', sclera: '#E0D8CA', brows: '#4A4038',
      stubble: 0.5, freckles: 0, blush: '#C07A68', blushK: 0.1, lash: '#2A2420', lashK: 0.7 },
  });
  RIG.CAST = CAST;

  // the head's signed distance (the kit's makeSDF; additions: a jaw that drops with the mouth, and the hair's noise is only
  // evaluated near the hair, which changes nothing but the cost)
  function makeSDF(spec, M) {
    const C = spec.cast || CAST[spec.who], hairStyle = spec.hair || (spec.who === 'her' ? 'bob' : 'short');
    const glo = spec.mode === 'gloss';
    const age = spec.age || 0;
    const jw = C.jawW * (glo ? 0.97 : 1) * (1 + 0.04 * age), ch = C.chin * (1 + 0.06 * age), nk = C.nose * (glo ? 0.82 : 1), nR = spec.neckR || C.neckR, sh = glo ? 0 : 1, lipZ = glo ? -0.012 : 0;
    const drop = (spec.open || 0) >= 0.2 ? 0.0085 : 0;          // the jaw drops a little when the mouth is open (two states: cheap to keep)
    const lowY = (glo ? -0.016 : 0) - drop * 0.6, lowY2 = (glo ? -0.016 : 0) - drop;
    const asym = sh * (spec.asym == null ? 1 : spec.asym);
    const comp = { s: 0, e: 0, h: 0 };
    const hl = HAIRLINE[hairStyle === 'short' ? 'short' : 'long'];
    const part = spec.part == null ? 0.12 : spec.part;
    const sd = spec.seed || 1;
    const neckLen = spec.neckLen == null ? 1.1 : spec.neckLen;
    const gx = (x, y, z) => M[0][0] * x + M[0][1] * y + M[0][2] * z, gy = (x, y, z) => M[1][0] * x + M[1][1] * y + M[1][2] * z, gz = (x, y, z) => M[2][0] * x + M[2][1] * y + M[2][2] * z;
    // each feature below is skipped only when a cheap bound proves it cannot change the blend (smin(d, f, k) == d when f >= d + k):
    // the surface is exactly the kit's, at about half the cost
    const L3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
    const cheekK = spec.cheek || 0, cheekS = spec.cheekSide || -1;
    function f(x, y, z) {
      const ax = Math.abs(x);
      let d = sdE(x, y + 0.14, z + 0.05, 0.352, 0.41, 0.42);
      d = smin(d, sdE(x, y - 0.075, z - 0.085, 0.316, 0.27, 0.255), 0.08);
      d = smin(d, sdE(x, y - 0.27 - lowY, z - 0.035, jw, 0.165, 0.24), 0.09);
      if (L3(x, y - 0.385 - lowY2, z - 0.19) - 0.1 * ch - 0.09 < d) d = smin(d, sdE(x, y - 0.385 - lowY2, z - 0.19, 0.1 * ch, 0.062, 0.085), 0.07);
      if (L3(x, y + 0.075, z - 0.245) - 0.272 - 0.08 < d) d = smin(d, sdE(x, y + 0.075, z - 0.245, 0.272, 0.062, 0.09), 0.06);
      if (L3(ax - 0.188, y - 0.07, z - 0.2) - 0.112 - 0.09 < d) d = smin(d, sdE(ax - 0.188, y - 0.07, z - 0.2, 0.112, 0.072, 0.09), 0.07);
      if (age && L3(ax - 0.17, y - 0.22, z - 0.15) - 0.1 - 0.08 < d) d = smin(d, sdE(ax - 0.17, y - 0.22, z - 0.15, 0.1, 0.085, 0.085 + 0.012 * age), 0.08);   // the lower cheeks, a little fuller
      if (cheekK && L3(x - cheekS * 0.19, y - 0.25, z - 0.17) - 0.1 * cheekK - 0.09 < d) d = smin(d, sdE(x - cheekS * 0.19, y - 0.25, z - 0.17, 0.09 * cheekK, 0.085 * cheekK, 0.1 * cheekK), 0.07);
      if (L3(x, y - 0.2 - drop * 0.5, z - 0.33) - 0.27 - drop - 0.08 < d) {
        d = smin(d, sdCone(x, y, z, 0, -0.02, 0.322, 0, 0.18, 0.395 + 0.03 * nk, 0.03, 0.046 * nk), 0.05);
        d = smin(d, sdE(x, y - 0.208, z - 0.352, 0.072 * nk, 0.036, 0.046), 0.03);
        d = smin(d, sdE(x, y - 0.3, z - 0.262, 0.132, 0.074, 0.1), 0.06);
        d = smin(d, sdE(x, y - 0.287, z - 0.334 - lipZ, 0.07 * C.lipsW, 0.019 * C.lipsT, 0.033), 0.02);
        d = smin(d, sdE(x, y - 0.33 - drop, z - 0.325 - lipZ, 0.064 * C.lipsW, 0.024 * C.lipsT, 0.034), 0.02);
      }
      if (L3(ax - 0.152, y + 0.006, z - 0.345) - 0.084 - 0.06 + d < 0) d = smax(d, -sdE(ax - 0.152, y + 0.006, z - 0.345, 0.084, 0.054, 0.062), 0.05);
      d = smin(d, sdCap(x, y, z, 0, 0.2, -0.08, 0, 0.2 + neckLen, -0.12, nR), 0.12);
      if (L3(ax - 0.338, y - 0.075, z + 0.045) - 0.112 - 0.035 < d) d = smin(d, sdE(ax - 0.338, y - 0.075, z + 0.045, 0.042, 0.112, 0.068), 0.025);
      comp.s = d;
      const e = Math.sqrt((ax - 0.152) * (ax - 0.152) + y * y + (z - 0.244) * (z - 0.244)) - 0.078;
      comp.e = e;
      const near = Math.min(d, e);
      let hd = 1e3;
      if (hairStyle === 'short') {
        const base = sdE(x + 0.004, y + 0.175, z + 0.07, 0.38, 0.432, 0.462);
        if (base - 0.1 > near) hd = 1e3;                      // the hair cannot be the nearest thing here: skip its noise
        else {
          const th = Math.abs(Math.atan2(x, z));
          const yh = lerpTab(hl, th) + (vnoise(x * 22 + 3, z * 22, sd) - 0.5) * 0.03;
          const bump = (fbm(x * 9 + 11, y * 9 + z * 6, sd + 4, 3) - 0.5) * 0.05 + (vnoise(x * 30, z * 30 + y * 10, sd + 2) - 0.5) * 0.012;
          hd = base - 0.01 - bump - 0.02 * ss01(-0.25, -0.5, y);
          hd = smax(hd, (y - yh) * 0.7, 0.025);
        }
      } else if (hairStyle === 'bob' || hairStyle === 'long') {
        const base = sdE(x, y + 0.165, z + 0.06, 0.374, 0.43, 0.452);
        const reach = hairStyle === 'bob' ? Math.min(base, (Math.sqrt((x / 0.42) * (x / 0.42) + ((z + 0.055) / 0.46) * ((z + 0.055) / 0.46)) - 1) * 0.39 + Math.max(0, y - 0.32)) : -1;
        if (hairStyle === 'bob' && reach - 0.09 > near) hd = 1e3;
        else {
          const yF = x < part ? -0.37 + 0.2 * ss01(part, -0.3, x) : -0.37 + 0.13 * ss01(part, 0.34, x);
          const th = Math.abs(Math.atan2(x, z));
          const yh = lerp(lerpTab(hl, th), yF, 1 - ss01(0.75, 1.25, th)) + (vnoise(x * 16, z * 16, sd) - 0.5) * 0.015;
          const cap = base - 0.014 - 0.012 * ss01(part + 0.15, part - 0.2, x) * ss01(-0.2, -0.45, y);
          let capd = smax(cap, (y - yh) * 0.7, 0.03);
          const win = Math.max(sdE(x, y - 0.2, z - 0.27, 0.292, 0.54, 0.34), (yh - y) * 0.8);
          if (hairStyle === 'bob') {
            const cutY = (spec.hem == null ? 0.285 : spec.hem) + 0.02 * x + (vnoise(x * 40, z * 40, sd + 3) - 0.5) * 0.012;
            const rx = 0.388 + 0.03 * ss01(-0.1, 0.28, y), rz = 0.44 + 0.02 * ss01(-0.1, 0.28, y);
            const kq = Math.sqrt((x / rx) * (x / rx) + ((z + 0.055) / rz) * ((z + 0.055) / rz));
            let bob = (kq - 1) * 0.39 - (fbm(x * 7, y * 16, sd + 8, 2) - 0.5) * 0.018;
            bob = smax(bob, (y - cutY) * 0.9, 0.025);
            bob = smax(bob, (-0.2 - y), 0.05);
            bob = smax(bob, -win, 0.03);
            capd = smin(capd, bob, 0.05);
          } else {
            const vx = gx(x, y, z), vy = gy(x, y, z), vz = gz(x, y, z);
            const top = spec.hairTop == null ? -0.05 : spec.hairTop, bot = spec.hairLen == null ? 1.25 : spec.hairLen;
            const curt = (s) => { const t = clamp((vy - top) / (bot - top), 0, 1); const wave = Math.sin(vy * 11 + s * 1.7 + sd) * 0.022 * t;
              const cx = s * (0.36 + 0.2 * t) + wave + (spec.hairSwing || 0) * t * t;
              const kx = (vx - cx) / (0.065 + 0.05 * t), kz = (vz + 0.06 + 0.12 * t) / 0.15; const dd = (Math.sqrt(kx * kx + kz * kz) - 1) * 0.08;
              return smax(smax(dd, vy - bot + 0.04 * Math.abs(vx - cx) * 6, 0.05), top - vy, 0.08); };
            const back = sdE(vx, vy - 0.3, vz + 0.2, 0.42, 0.62, 0.2);
            let fall = smin(curt(-1), curt(1), 0.1); fall = smin(fall, back, 0.12);
            fall = smax(fall, -win, 0.035);
            capd = smin(capd, fall, 0.07);
          }
          hd = capd;
        }
      }
      comp.h = hd;
      return Math.min(d, e, hd);
    }
    f.comp = comp; f.hairStyle = hairStyle; f.asym = asym;
    return f;
  }

  // flush: the colour rising on the skin of his neck, round the jaw's sides, the ears last; cut paper (two cut steps with a
  // hand-cut edge) but the same skin, reddened, under the same light. pale: pallor, the whole face's colour leaving: desaturated
  // and cooler, the blush gone, the lips greyed (no band, no patches).
  function headBands(spec, C) {
    const fl = spec.flush || 0, ea = spec.ears || 0, pa = spec.pale || 0, sd = spec.seed || 1, nkEnd = 0.2 + (spec.neckLen == null ? 1.1 : spec.neckLen);
    if (!fl && !ea && !pa) return null;
    // the flush's top edge rises from below the collar (0) to the jaw's sides (0.8); the ears go from the lobe up (0.8..1, or `ears`)
    const yNeck = lerp(nkEnd + 0.06, 0.24, clamp(fl / 0.8, 0, 1));
    const yEar = Math.min(fl > 0.8 ? lerp(0.24, -0.09, (fl - 0.8) / 0.2) : 9, ea > 0 ? lerp(0.24, -0.09, ea) : 9);
    // the blood under the skin: the skin deepens toward a ruddy red (darker, not orange), so it reads as colour, not a red cloth
    const redden = (out, k) => { const r = out[0], g = out[1], b = out[2]; out[0] = lerp(r, r * 1.0 + 0.012, k); out[1] = lerp(g, g * 0.7, k); out[2] = lerp(b, b * 0.76, k); };
    return function (x, y, z, out, isLip) {
      const ax = Math.abs(x), ang = Math.atan2(x, z);
      if (pa > 0) { const Lm = 0.3 * out[0] + 0.59 * out[1] + 0.11 * out[2], k = 0.42 * pa * (isLip ? 0.9 : 1);
        out[0] = lerp(out[0], Lm * 1.03 - 0.012, k); out[1] = lerp(out[1], Lm * 1.03 + 0.004, k); out[2] = lerp(out[2], Lm * 1.03 + 0.022, k); }
      if (!fl && !ea) return;
      const cut = (vnoise(ang * 2.2 + 3, sd * 0.37, sd + 91) - 0.5) * 0.05 + (vnoise(ang * 9, sd * 0.37 + 4, sd + 92) - 0.5) * 0.016;
      // the face's front (cheeks, mouth, chin) keeps its colour: the flush climbs the neck, the throat, the jaw's sides
      const front = z > 0.12 && y < 0.47 && ax < 0.26;
      const ear = ax > 0.29 && z < 0.09 && y > -0.1 && y < 0.25;
      let k = 0;
      if (fl > 0 && !front && !ear) { const yy = yNeck + cut; if (y > yy) k = y > yy + 0.07 ? 0.7 : 0.42; }
      if (ear) { const yy = Math.min(yEar, fl > 0 ? yNeck : 9) + cut * 0.4; if (y > yy) k = Math.max(k, y > yy + 0.05 ? 0.72 : 0.45); }
      if (k) redden(out, k);
    };
  }

  // a head (the kit's head(), with the bands and the jaw): returns {canvas, x, y, w, h, M, proj} with x,y the canvas's top-left
  // relative to the head's origin (between the eyes) at render scale s
  function sculptHead(spec) {
    const C = spec.cast || CAST[spec.who]; const mode = spec.mode || 'grain', grain = mode === 'grain', gloss = mode === 'gloss', flash = mode === 'flash';
    const M = rotM(spec.yaw || 0, spec.pitch || 0, spec.roll || 0);
    const sdf = makeSDF(spec, M), comp = sdf.comp;
    const s = spec.s, b = spec.bounds;
    const skin = rgb01(spec.skin || C.skin), lipsC = rgb01(spec.lips || C.lips), hairC = rgb01(spec.hairCol || C.hair), hairHi = rgb01(spec.hairHi || C.hairHi);
    const iris = rgb01(C.iris), scl = rgb01(C.sclera), browC = rgb01(C.brows), lashC = rgb01(C.lash), blushC = rgb01(C.blush);
    const eyesOpen = spec.eyes == null ? 0.85 : spec.eyes, smile = spec.smile || 0, mOpen = spec.open || 0, browR = spec.brow || 0;
    const gz0 = spec.gaze || [0, 0]; let gvx = gz0[0], gvy = gz0[1], gvz = 1; { const l = Math.hypot(gvx, gvy, gvz); gvx /= l; gvy /= l; gvz /= l; }
    const sd = spec.seed || 1, asym = sdf.asym;
    const warpAmp = grain ? (spec.warp == null ? 1.1 : spec.warp) : (flash ? 0.5 : 0);
    const bands = grain ? headBands(spec, C) : null;
    const drop = mOpen >= 0.2 ? 0.0085 : 0, age = spec.age || 0;
    const out = [0, 0, 0];
    function albedo(x, y, z, nlx, nly, nlz, mat) {
      const ax = Math.abs(x), side = x < 0 ? -1 : 1;
      if (mat === 2) {
        const st = fbm(x * 40 + y * 4, y * 9 + z * 30, sd + 21, 3), st2 = vnoise(x * 90 + z * 40, y * 20, sd + 5);
        const k = grain ? (st > 0.63 ? 0.32 : st < 0.36 ? -0.15 : 0) + (st2 > 0.78 ? 0.18 : 0) : flash ? 0 : (st - 0.5) * 0.3;
        for (let c = 0; c < 3; c++) out[c] = hairC[c] + (hairHi[c] - hairC[c]) * Math.max(0, k) + hairC[c] * Math.min(0, k);
        return;
      }
      if (mat === 1) {
        const ex = (ax - 0.152), ey = y + (grain ? asym * side * 0.0035 : 0), hw = 0.074 * C.eyeK; const u = clamp(ex / hw, -1.2, 1.2);
        const uu = Math.max(0, 1 - u * u);
        const closedLine = 0.012 * Math.pow(uu, 0.8);
        const upOpen = -0.046 * C.eyeK * Math.pow(uu, 0.62) * (1 - 0.12 * u);
        const upper = lerp(closedLine, upOpen, eyesOpen), lower = (0.024 - 0.024 * smile * smile) * Math.pow(uu, 0.75) - 0.012 * smile * smile * Math.pow(uu, 1.5) + 0.002;
        const lashT = (0.006 + 0.004 * clamp(u, 0, 1)) * C.lashK * (0.7 + 0.3 * eyesOpen) + (eyesOpen < 0.25 ? 0.002 : 0);
        out[0] = skin[0] * 0.97; out[1] = skin[1] * 0.93; out[2] = skin[2] * 0.93;
        if (Math.abs(u) < 1 && ey > upper - lashT && ey < upper + 0.0025) { out[0] = lashC[0]; out[1] = lashC[1]; out[2] = lashC[2]; return; }
        if (Math.abs(u) < 1 && ey > upper && ey < lower) {
          const qx = x - side * 0.152, qy = y, qz = z - 0.244, ql = Math.sqrt(qx * qx + qy * qy + qz * qz) || 1;
          const dot = (qx * gvx + qy * gvy + qz * gvz) / ql, ang = Math.acos(clamp(dot, -1, 1));
          if (ang < 0.17) { out[0] = 0.05; out[1] = 0.04; out[2] = 0.04; }
          else if (ang < 0.47) { const r = ang > 0.42 ? 0.6 : 1; out[0] = iris[0] * r; out[1] = iris[1] * r; out[2] = iris[2] * r; }
          else { const cd = 1 - 0.18 * Math.abs(u); out[0] = scl[0] * cd; out[1] = scl[1] * cd; out[2] = scl[2] * cd; }
          if (ey < upper + 0.012) { out[0] *= 0.72; out[1] *= 0.72; out[2] *= 0.74; }
          return;
        }
        if (eyesOpen > 0.3 && Math.abs(u) < 0.95 && Math.abs(ey - (upper - 0.024 - 0.008 * uu)) < 0.0035) { out[0] *= 0.82; out[1] *= 0.78; out[2] *= 0.78; }
        if (bands) bands(x, y, z, out, false);
        return;
      }
      out[0] = skin[0]; out[1] = skin[1]; out[2] = skin[2];
      // the jaw's cast shadow on the throat (the renderer casts none): strongest right under the jaw, a cut edge further down
      if (!gloss && y > 0.38 && z > -0.24) { const ns = spec.neckShade == null ? 0.3 : spec.neckShade; const edge = 0.56 + 0.05 * (vnoise(x * 18, z * 18, sd + 95) - 0.5) + 0.04 * Math.abs(x);
        const k = ns * ss01(0.36, 0.44, y) * (grain ? (y < edge ? 1 : 0.35) : 1 - 0.65 * ss01(edge - 0.04, edge + 0.04, y)); out[0] *= 1 - k; out[1] *= 1 - k * 1.05; out[2] *= 1 - k * 0.95; }
      const bd = ((ax - 0.165) * (ax - 0.165) + (y - 0.13) * (y - 0.13)) / 0.006; const bk = C.blushK * Math.exp(-bd) * (flash ? 0.3 : gloss ? 1.6 : 1) * (1 - (spec.pale || 0) * 0.8);
      out[0] += (blushC[0] - out[0]) * bk; out[1] += (blushC[1] - out[1]) * bk; out[2] += (blushC[2] - out[2]) * bk;
      if (ax > 0.3 && z < 0.06 && y > -0.04 && y < 0.18) { const ix = (y - 0.075) / 0.07, iz = (z + 0.04) / 0.045; if (ix * ix + iz * iz < 1 && Math.abs(nlx) > 0.5) { out[0] *= 0.72; out[1] *= 0.62; out[2] *= 0.6; } }
      if (C.stubble && z > -0.05 && y > 0.12) {
        const zone = ss01(0.17, 0.23, y + 0.22 * (0.3 - ax)) * (y > 0.27 && y < 0.36 && ax < 0.072 ? 0 : 1) * (1 - ss01(0.5, 0.58, y + (0.33 - ax) * 0.25)) * (ax > 0.31 && y < 0.24 ? 0 : 1);
        const n = grain ? (GG.hash2(Math.floor(x * 260), Math.floor(y * 260 + z * 120), sd) > 0.5 ? 1 : 0.35) : 0.7;
        const k = zone * (spec.stubble == null ? 0.2 : spec.stubble) * n * (flash ? 0.5 : 1);
        out[0] *= 1 - k * 0.95; out[1] *= 1 - k * 0.92; out[2] *= 1 - k * 0.78;
      }
      if (C.freckles && grain && z > 0.12 && y > -0.05 && y < 0.2 && ax < 0.27) {
        const dens = Math.exp(-((ax - 0.1) * (ax - 0.1) / 0.02 + (y - 0.085) * (y - 0.085) / 0.006)) + 0.6 * Math.exp(-(x * x / 0.002 + (y - 0.14) * (y - 0.14) / 0.004));
        const fx = x * 75, fy = y * 75 + z * 30, ix = Math.floor(fx), iy = Math.floor(fy);
        const hh = GG.hash2(ix, iy, sd + 41);
        if (hh < dens * 0.42) { const cx = ix + 0.25 + 0.5 * GG.hash2(ix, iy, sd + 42), cy = iy + 0.25 + 0.5 * GG.hash2(ix, iy, sd + 43); const r = 0.18 + 0.2 * GG.hash2(ix, iy, sd + 44);
          if ((fx - cx) * (fx - cx) + (fy - cy) * (fy - cy) < r * r) { out[0] *= 0.8; out[1] *= 0.68; out[2] *= 0.6; } }
      }
      if (z > 0.2 && ax > 0.05 && ax < 0.26 && y < -0.05 && y > -0.2) {
        const u = (ax - 0.158) / 0.088; if (Math.abs(u) < 1) {
          const yb = -0.112 - 0.02 * (1 - u * u) - browR * 0.018 * (1 - u) * 0.5 - smile * 0.008 + 0.012 * u + (grain ? asym * side * 0.004 : 0);
          const th = 0.016 * C.browK * (1 - 0.45 * (u + 1) / 2) * (u < -0.8 ? (1 + (u + 0.8) * 2.5) : 1);
          if (Math.abs(y - yb) < th) { const hk = grain ? (vnoise(ax * 300, y * 120, sd + 9) > 0.32 ? 1 : 0.45) : 0.92; out[0] = lerp(out[0], browC[0], hk); out[1] = lerp(out[1], browC[1], hk); out[2] = lerp(out[2], browC[2], hk); return; }
        }
      }
      if (y > 0.2 && y < 0.25 && ax < 0.06 && nly > 0.35 && z > 0.3) { const nx2 = (ax - 0.032) / 0.017, ny2 = (y - 0.232) / 0.009; if (nx2 * nx2 + ny2 * ny2 < 1) { out[0] *= 0.35; out[1] *= 0.28; out[2] *= 0.28; return; } }
      if (age > 0 && !gloss && z > 0.17) {
        // under the eyes: a soft darker crescent below the lower lid and a faint cut crease at its foot
        const ue = (ax - 0.152) / 0.085, yy = y - (0.045 + 0.018 * ue * ue);
        if (Math.abs(ue) < 1 && yy > -0.012 && yy < 0.03) { const k = age * (yy > 0.02 ? 0.14 : 0.08) * (1 - ue * ue); out[0] *= 1 - k; out[1] *= 1 - k * 1.15; out[2] *= 1 - k * 1.05; }
        // from the nose's wings to the mouth's corners, faint
        if (y > 0.21 && y < 0.36 && ax > 0.05 && ax < 0.15) { const t = clamp((y - 0.22) / 0.12, 0, 1), cx = 0.075 + 0.036 * t, dd = Math.abs(ax - cx); if (dd < 0.0032 * (1 - 0.5 * t) + 0.001) { const k = 0.075 * age; out[0] *= 1 - k; out[1] *= 1 - k * 1.1; out[2] *= 1 - k * 1.1; } }
      }
      if (smile > 0.35 && z > 0.2 && y > 0.2 && y < 0.36 && ax > 0.05 && ax < 0.14) {
        const t = clamp((y - 0.22) / 0.11, 0, 1), cx = 0.072 + 0.035 * t + 0.012 * smile, d = Math.abs(ax - cx);
        if (d < 0.0055 * (1 - 0.6 * t) + 0.001) { const k = (smile - 0.35) * (gloss ? 0.18 : 0.42); out[0] *= 1 - k; out[1] *= 1 - k * 1.1; out[2] *= 1 - k * 1.1; }
      }
      let isLip = false;
      if (z > 0.2 && y > 0.24 && y < 0.43 + drop && ax < 0.12) {
        const wl = 0.068 * C.lipsW * (1 + 0.3 * smile), u = ax / wl;
        if (u < 1.08) {
          const uu = Math.max(0, 1 - u * u);
          const ym = 0.311 - smile * 0.032 * u * u + (grain ? asym * x * 0.03 : 0) + mOpen * 0.002;
          const upT = 0.021 * C.lipsT * Math.pow(uu, 0.5) * (1 - 0.35 * smile * u) - 0.004 * Math.exp(-(ax / 0.012) * (ax / 0.012)), loT = 0.027 * C.lipsT * Math.pow(uu, 0.6) * (1 - 0.25 * mOpen);
          const gap = mOpen * 0.1 * Math.pow(uu, 0.55);
          if (u < 1 && y > ym - 0.003 && y < ym + gap) {
            const tt = (y - ym) / Math.max(gap, 1e-4);
            if (tt < 0.5 && Math.abs(u) < 0.9 && spec.teeth !== false) { out[0] = 0.92; out[1] = 0.89; out[2] = 0.84; if (!gloss && Math.abs((ax / wl) * 6 % 1 - 0.5) > 0.46) { out[0] *= 0.8; out[1] *= 0.8; out[2] *= 0.8; } }
            else { out[0] = flash ? 0.16 : 0.32; out[1] = flash ? 0.04 : 0.1; out[2] = flash ? 0.05 : 0.1; }
            return;
          } else if (u < 1 && ((y < ym && y > ym - upT) || (y > ym + gap && y < ym + gap + loT))) {
            const lo = y > ym; const k = lo ? 1 : 0.84; out[0] = lipsC[0] * k; out[1] = lipsC[1] * k; out[2] = lipsC[2] * k; isLip = true;
          } else if (Math.abs(y - ym) < 0.0045 && u < 1.08 && mOpen < 0.05) { out[0] *= 0.55; out[1] *= 0.45; out[2] *= 0.45; }
        }
      }
      if (bands) bands(x, y, z, out, isLip);
    }
    let gb = spec.gkey ? gget(spec.gkey) : null; const fresh = !gb;
    if (!gb) { gb = geom3D({ sdf, matOf: () => { const cs = comp.s, ce = comp.e, chh = comp.h; return (chh <= cs + 0.002 && chh <= ce + 0.002) ? 2 : (ce < cs ? 1 : 0); }, M, s, ss: spec.ss, bounds: b, seed: sd, warp: warpAmp, aoK: spec.aoK }); if (spec.gkey) gput(spec.gkey, gb); }
    const R = shade3D(gb, { albedo, out, lights: spec.lights, amb: spec.amb, mode, aoPoster: spec.aoPoster, aoLow: spec.aoLow, soft: spec.soft || 0, proxy: 'head' });
    return Object.assign(R, { M, fresh });
  }

  // the bounds of a posed head (view units around its origin): a box round the skull, hair and neck, turned with the head
  function headBounds(spec) {
    const M = rotM(spec.yaw || 0, spec.pitch || 0, spec.roll || 0); const nk = 0.2 + (spec.neckLen == null ? 1.1 : spec.neckLen) + 0.2;
    const hairW = spec.hair === 'long' ? 0.66 : 0.5, hairY = spec.hair === 'long' ? 1.35 : nk;
    let x0 = 9, y0 = 9, x1 = -9, y1 = -9;
    for (const x of [-hairW, hairW]) for (const y of [-0.66, Math.max(nk, hairY)]) for (const z of [-0.58, 0.5]) {
      const vx = M[0][0] * x + M[0][1] * y + M[0][2] * z, vy = M[1][0] * x + M[1][1] * y + M[1][2] * z;
      x0 = Math.min(x0, vx); x1 = Math.max(x1, vx); y0 = Math.min(y0, vy); y1 = Math.max(y1, vy);
    }
    return [x0 - 0.03, y0 - 0.03, x1 + 0.03, y1 + 0.03];
  }

  // ================================================================ baking: paper texture, the lifted shadow, grain for the gloss layer
  function bakeSculpt(R, o) {
    // R: {canvas, x, y} at render scale; o: {tex, texSeed, kind, texScale, shadowBlur (px), gl}
    const cv = R.canvas, w = cv.width, h = cv.height;
    const img = makeCanvas(w, h), g = img.getContext('2d'); g.drawImage(cv, 0, 0);
    if (o.tex) {
      const t = makeCanvas(w, h).getContext('2d'); t.fillStyle = GG.texPattern(t, o.kind || 'paper', o.texSeed || 5, o.texScale || 1); t.fillRect(0, 0, w, h);
      t.globalCompositeOperation = 'destination-in'; t.drawImage(cv, 0, 0);
      g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = o.tex; g.drawImage(t.canvas, 0, 0); g.restore();
    }
    let shadow = null, spad = 0;
    if (o.shadowBlur != null) {
      spad = Math.ceil(o.shadowBlur * 2.2 + 2);
      const sc = makeCanvas(w + 2 * spad, h + 2 * spad), sg = sc.getContext('2d');
      const m = makeCanvas(w, h).getContext('2d'); m.drawImage(cv, 0, 0); m.globalCompositeOperation = 'source-in'; m.fillStyle = o.shadowColor || '#05060A'; m.fillRect(0, 0, w, h);
      sg.filter = `blur(${Math.max(0.5, o.shadowBlur)}px)`; sg.drawImage(m.canvas, spad, spad); shadow = sc;
    }
    return { img, shadow, spad, ox: -R.x, oy: -R.y };
  }
  // draw a baked sculpture: e (entry) rendered at scale Rq, its origin at world (x, y) with world scale s; sh: {dx, dy, alpha} in head units
  function placeSculpt(g, e, x, y, k, sh, flip, alpha) {
    // k = world units per canvas px (= s / Rq)
    g.save();
    if (alpha != null && alpha < 1) g.globalAlpha = alpha;
    g.translate(x, y); if (flip) g.scale(-1, 1);
    if (e.shadow && sh && sh.alpha > 0) { g.save(); g.globalAlpha *= sh.alpha; g.drawImage(e.shadow, (-e.ox - e.spad) * k + (flip ? -sh.dx : sh.dx), (-e.oy - e.spad) * k + sh.dy, e.shadow.width * k, e.shadow.height * k); g.restore(); }
    g.drawImage(e.img, -e.ox * k, -e.oy * k, e.img.width * k, e.img.height * k);
    g.restore();
  }
  // grain for a piece drawn in the gloss layer (which skips the film's finish): the film's own grain tile, this frame's seed
  function glGrain(c, e, x, y, k, flip) {
    const w = e.img.width, h = e.img.height; const t = tmpCanvas('glgrain', w, h);
    t.drawImage(e.img, 0, 0); t.globalCompositeOperation = 'source-atop'; t.globalAlpha = 0.16;
    const seed = ((c.frame || 0) % 8) + 1; t.fillStyle = t.createPattern(O.grainTile(seed), 'repeat'); t.globalCompositeOperation = 'overlay'; t.fillRect(0, 0, w, h);
    t.globalCompositeOperation = 'destination-in'; t.globalAlpha = 1; t.drawImage(e.img, 0, 0);
    return t.canvas;
  }
  const _tmp = {};
  function tmpCanvas(name, w, h) {
    let c = _tmp[name]; if (!c || c.width < w || c.height < h) { c = _tmp[name] = makeCanvas(Math.max(w, c ? c.width : 0), Math.max(h, c ? c.height : 0)); }
    const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, c.width, c.height); return g;
  }

  // ================================================================ heads
  const HEAD_DEF = {
    him: { hair: 'short', lids: 0.72, neck: 0.6, neckR: 0.205, stubble: 0.1, seed: 7, neckShade: 0.52, aoK: 0.5 },
    her: { hair: 'bob', lids: 0.78, neck: 0.56, neckR: 0.172, stubble: 0, seed: 41, part: 0.14, neckShade: 0.34, aoK: 0.7 },
    coworker: { hair: 'short', lids: 0.7, neck: 0.55, neckR: 0.21, stubble: 0.07, seed: 63, neckShade: 0.3, aoK: 0.6 },
  };
  // mouth steps (0 closed .. 3 wide) as the kit's opening; small: faces are quiet
  const MOUTH = [0, 0.13, 0.26, 0.4];
  RIG.MOUTH = MOUTH;
  function targetOf(c, p) { return p && (p.target === 'gl' || p.gl) ? c.gl : (p && p.target && p.target.canvas ? p.target : c.g); }

  /* RIG.head(c, who, p): a sculpted head. p: {x, y (world px of the point between the eyes), s (px per head height), yaw, pitch,
     roll, lids (eye opening 0 shut..1 wide), gaze [x,y], brows (-1 knit..1 raised), smile 0..1, mouth (step 0..3, or a number
     0..1 as `open`), cheek (a mouthful, 0..1), flush 0..1 (neck band rising, ears last), ears 0..1 (ears alone), pale 0..1 (the
     colour draining from the forehead down), light (RIG.light(..) or a name), mode ('grain' | 'gloss' | 'flash'), neck (neck
     length in head units), shadow ({dx,dy,alpha,blur} in head units, or false), alpha, target ('gl' for the gloss layer)} */
  RIG.head = function (c, who, p) {
    p = p || {}; const g = targetOf(c, p); const D = HEAD_DEF[who] || HEAD_DEF.him;
    const s = p.s || 300, x = p.x || 0, y = p.y || 0;
    const mode = p.mode || 'grain', toGl = g === c.gl;
    const Rq = qScale(s * devScale(g) * (p.res || 1));
    const L = asLight(p.light);
    const mouthOpen = p.open != null ? p.open : (p.mouth == null ? 0 : (Number.isInteger(p.mouth) ? MOUTH[clamp(p.mouth, 0, 3)] : p.mouth));
    const spec = {
      who, hair: p.hair || D.hair, mode, yaw: qf(p.yaw, 0.04), pitch: qf(p.pitch, 0.04), roll: qf(p.roll, 0.04),
      eyes: qf(p.lids != null ? p.lids : (p.eyes != null ? p.eyes : D.lids - (who === 'her' && (p.mode || 'grain') === 'grain' && p.age !== 0 ? 0.06 : 0)), 0.1), gaze: [qf((p.gaze || [0, 0])[0], 0.1), qf((p.gaze || [0, 0])[1], 0.1)],
      brow: qf(p.brows != null ? p.brows : p.brow, 0.25), smile: qf(p.smile, 0.125), open: qf(mouthOpen, 0.01), cheek: qf(p.cheek, 0.25), cheekSide: p.cheekSide || -1,
      flush: qf(p.flush, 1 / 16), ears: qf(p.ears, 1 / 8), pale: qf(p.pale, 1 / 12), neckLen: qf(p.neck != null ? p.neck : D.neck, 0.05), neckR: p.neckR || D.neckR,
      stubble: p.stubble != null ? p.stubble : D.stubble, seed: p.seed || D.seed, part: D.part, neckShade: qf(p.neckShade != null ? p.neckShade : D.neckShade * (1 - 0.45 * (L.soft || 0)), 0.02), aoK: D.aoK,
      hairLen: p.hairLen, hairTop: p.hairTop, hem: p.hem, aoPoster: p.aoPoster, teeth: p.teeth, aoLow: L.soft ? qf(lerp(0.7, 0.86, L.soft), 0.02) : undefined,
      age: qf(p.age != null ? p.age : (who === 'her' && mode === 'grain' ? 0.6 : 0), 0.1), soft: qf(L.soft || 0, 0.1),
    };
    if (who === 'coworker') spec.cast = CAST.coworker;
    const sl = p.lights ? { amb: p.amb || L.amb, lights: p.lights } : sculptLights(L, x, y, s, false);
    const tex = mode === 'grain' ? (p.tex == null ? 0.42 : p.tex) : 0;
    const key = 'H|' + who + '|' + Rq.toFixed(2) + '|' + JSON.stringify(spec) + '|' + lightKey(sl) + '|' + tex + '|' + (toGl ? 'gl' : 'w');
    let e = cget(key);
    if (!e) {
      const t0 = now();
      const bounds = p.bounds || headBounds(spec);
      const ss = p.ss || (Rq < 330 ? 1.3 : Rq < 560 ? 1.15 : 1.0);
      // the geometry depends only on these; lids, gaze, brows, smile, flush, pale and the light only reshade it
      const gkey = 'G|' + who + '|' + Rq.toFixed(2) + '|' + ss + '|' + JSON.stringify([spec.hair, spec.mode, spec.aoK, spec.warp, spec.age, spec.yaw, spec.pitch, spec.roll, spec.open >= 0.2, spec.cheek, spec.cheekSide, spec.neckLen, spec.neckR, spec.seed, spec.part, spec.hairLen, spec.hairTop, spec.hem, bounds.map(v => +v.toFixed(3))]);
      const R = sculptHead(Object.assign({}, spec, { s: Rq, ss, bounds, lights: sl.lights, amb: sl.amb, gkey }));
      e = bakeSculpt(R, { tex, texSeed: (spec.seed || 5) + 10, kind: 'paper', texScale: Rq / s, shadowBlur: mode === 'gloss' ? null : 0.04 * Rq, shadowColor: L.shadow });
      e.Rq = Rq; const ms = now() - t0; e.ms = ms; if (R.fresh) RIG.stats.sculpts++; else RIG.stats.reshades = (RIG.stats.reshades || 0) + 1; RIG.stats.sculptMs += ms; logCost(R.fresh ? 'head' : 'reshade', key, ms);
      cput(key, e);
    }
    const k = s / Rq;
    const sh = p.shadow === false ? null : Object.assign({ dx: 0.03 * s, dy: 0.04 * s, alpha: 0.42 }, p.shadow ? { dx: (p.shadow.dx != null ? p.shadow.dx : 0.03) * s, dy: (p.shadow.dy != null ? p.shadow.dy : 0.04) * s, alpha: p.shadow.alpha != null ? p.shadow.alpha : 0.42 } : {});
    if (toGl && mode === 'grain') { const gc = glGrain(c, e); const e2 = Object.assign({}, e, { img: gc }); g.save(); placeSculpt(g, e2, x, y, k, sh, false, p.alpha); g.restore(); }
    else placeSculpt(g, e, x, y, k, sh, false, p.alpha);
    const M = rotM(spec.yaw, spec.pitch, spec.roll);
    const proj = (lx, ly, lz) => [x + (M[0][0] * lx + M[0][1] * ly + M[0][2] * lz) * s, y + (M[1][0] * lx + M[1][1] * ly + M[1][2] * lz) * s];
    return { x, y, s, key, entry: e, M, proj,
      chin: proj(0, 0.44, 0.2), neck: proj(0, 0.62, -0.02), neckBase: proj(0, 0.2 + spec.neckLen, -0.12), crown: proj(0, -0.58, -0.05),
      earL: proj(-0.34, 0.07, -0.04), earR: proj(0.34, 0.07, -0.04), nose: proj(0, 0.19, 0.43), mouth: proj(0, 0.31 + mouthOpen * 0.05, 0.36),
      eyeL: proj(-0.152, 0, 0.32), eyeR: proj(0.152, 0, 0.32), jawL: proj(-0.27, 0.3, 0.05), jawR: proj(0.27, 0.3, 0.05) };
  };
  // the screen's smooth light on a face, in the gloss layer (no bands, no grain): clipped to the head's own silhouette
  RIG.faceGlow = function (c, hd, o) {
    o = o || {}; const e = hd.entry; if (!e) return; const k = hd.s / e.Rq; const w = e.img.width, h = e.img.height;
    const t = tmpCanvas('fglow', w, h); const gx = ((o.x - hd.x) / k) + e.ox, gy = ((o.y - hd.y) / k) + e.oy, r = (o.r || hd.s) / k;
    const gr = t.createRadialGradient(gx, gy, 0, gx, gy, r); const cc = hexToRgb(o.color || '#FFC5A0'), a = o.alpha == null ? 0.35 : o.alpha;
    [[0, 1], [0.35, 0.55], [0.7, 0.18], [1, 0]].forEach(([u, v]) => gr.addColorStop(u, `rgba(${cc[0]},${cc[1]},${cc[2]},${v * a})`));
    t.fillStyle = gr; t.fillRect(0, 0, w, h); t.globalCompositeOperation = 'destination-in'; t.drawImage(e.img, 0, 0);
    const g = c.gl; g.save(); g.globalCompositeOperation = 'screen'; g.drawImage(t.canvas, 0, 0, w, h, hd.x - e.ox * k, hd.y - e.oy * k, w * k, h * k); g.restore();
  };

  // ================================================================ lip sync
  // RIG.mouthFor('L014', t): the mouth step (0..3) for a voiced line, t seconds after the line's start (its `at`). The phone's
  // lines return 0: nobody's mouth moves to them. Read on twos (the envelope is at 12 drawings a second).
  RIG.voiceEnv = () => G.FILM_VOICE_ENV || {};
  RIG.mouthFor = function (lineId, t) {
    const env = (G.FILM_VOICE_ENV || {})[lineId]; if (!env || !env.length || t < 0) return 0;
    const i = Math.floor(t * 12 + 1e-6); return i < env.length ? env[i] : 0;
  };
  // the mouth for whichever of these lines is playing at local time lt: lines = [{id, at}], as in a sequence's `lines`
  RIG.mouthAt = function (lines, lt) { for (const L of lines) { const v = RIG.mouthFor(L.id, lt - L.at); if (v) return v; } return 0; };
  // his wordless murmur (Q01): syllables at about four a second in phrases, with breaths between; deterministic
  RIG.murmur = function (t, seed) {
    const tt = twos(t), sd = seed || 5; const phrase = vnoise(tt * 0.55, 0.3, sd);
    if (phrase < 0.38) return 0;                                                   // a pause between phrases
    const syl = Math.sin(tt * Math.PI * 2 * (3.4 + vnoise(tt * 0.3, 1.7, sd + 1) * 1.6) + vnoise(tt, 3, sd) * 2);
    return syl > 0.55 ? 2 : syl > -0.15 ? 1 : 0;
  };
  // a chew (Q06): the jaw and cheek working on a mouthful, about 1.4 chews a second; stop it by holding `t`
  RIG.chew = function (t) { const ph = (twos(t) * 1.4) % 1; return { mouth: ph < 0.35 ? 1 : 0, cheek: ph < 0.5 ? 0.5 : 0.75, cheekSide: -1 }; };
  // breath: the 2-3 px rise at 0.25 Hz, on twos (px)
  RIG.breath = (t, amp, hz) => Math.sin(twos(t) * Math.PI * 2 * (hz || 0.25)) * (amp == null ? 2.5 : amp);
  // a blink: 1 when open; dips over three drawings, about every 4-6 s (seeded)
  RIG.blink = function (t, seed) {
    const tt = twos(t), period = 4.6 + 1.4 * vnoise(Math.floor(tt / 5), 0.5, seed || 3); const ph = tt % period;
    return ph < 1 / 12 ? 0.35 : ph < 2 / 12 ? 0.05 : ph < 3 / 12 ? 0.45 : 1;
  };

  // ================================================================ hands (the kit's posable hand, on the faster renderer)
  // local units: wrist (0,0,0) to the middle fingertip ~ 1. x along the hand, y across it (index -y, pinky +y), z out of its back.
  const FINGERS = [
    { p: [0.45, -0.108, 0.0], l: [0.2, 0.12, 0.1], r: [0.053, 0.048, 0.042] },
    { p: [0.47, -0.036, 0.006], l: [0.225, 0.135, 0.105], r: [0.055, 0.05, 0.043] },
    { p: [0.455, 0.036, 0.0], l: [0.21, 0.125, 0.1], r: [0.052, 0.047, 0.041] },
    { p: [0.42, 0.104, -0.012], l: [0.165, 0.1, 0.085], r: [0.045, 0.041, 0.036] },
  ];
  function handBones(pose) {
    const fp = pose.fingers || [[-0.12, 0.3, 0.35, 0.2], [-0.03, 0.3, 0.35, 0.2], [0.06, 0.32, 0.38, 0.2], [0.16, 0.35, 0.4, 0.22]];
    const tp = pose.thumb || [0.75, 0.55, 0.25, 0.2];
    const segs = [];
    FINGERS.forEach((F, i) => {
      const [sp, f1, f2, f3] = fp[i]; let P0 = F.p.slice(); let phi = 0; const ca = Math.cos(sp), sa = Math.sin(sp);
      [f1, f2, f3].forEach((fl, k) => { phi += fl; const dir = [ca * Math.cos(phi), sa * Math.cos(phi), -Math.sin(phi)]; const P1 = [P0[0] + dir[0] * F.l[k], P0[1] + dir[1] * F.l[k], P0[2] + dir[2] * F.l[k]];
        const nd = [ca * Math.sin(phi), sa * Math.sin(phi), Math.cos(phi)];          // the back of the phalanx (where a nail is)
        segs.push([P0[0], P0[1], P0[2], P1[0], P1[1], P1[2], F.r[k], k === 2 ? F.r[k] * 0.86 : F.r[k + 1] || F.r[k], k === 2 ? 1 : 0, nd[0], nd[1], nd[2]]); P0 = P1; });
    });
    if (pose.thumb !== null) {
      // a true thumb: about a quarter of a phone's width at the nail (0.09 hand lengths across), tapering from its root
      let P0 = [0.12, -0.115, -0.035]; const [th, ph, f1, f2] = tp; const Ls = [0.17, 0.13, 0.11], Rr = [0.06, 0.05, 0.044];
      let d = [Math.cos(th) * Math.cos(ph), -Math.sin(th) * Math.cos(ph), -Math.sin(ph)];
      const ax = (() => { const z = [0, 0, 1]; const c = [d[1] * z[2] - d[2] * z[1], d[2] * z[0] - d[0] * z[2], d[0] * z[1] - d[1] * z[0]]; const l = Math.hypot(...c) || 1; return c.map(v => v / l); })();
      const rot = (v, a) => { const c = Math.cos(a), s = Math.sin(a), k = ax, dt = k[0] * v[0] + k[1] * v[1] + k[2] * v[2]; const cr = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]]; return [v[0] * c + cr[0] * s + k[0] * dt * (1 - c), v[1] * c + cr[1] * s + k[1] * dt * (1 - c), v[2] * c + cr[2] * s + k[2] * dt * (1 - c)]; };
      [0, f1, f2].forEach((fl, k) => { d = rot(d, fl); const P1 = [P0[0] + d[0] * Ls[k], P0[1] + d[1] * Ls[k], P0[2] + d[2] * Ls[k]];
        const nd = [d[1] * ax[2] - d[2] * ax[1], d[2] * ax[0] - d[0] * ax[2], d[0] * ax[1] - d[1] * ax[0]];   // d x axis: away from the pad
        segs.push([P0[0], P0[1], P0[2], P1[0], P1[1], P1[2], Rr[k], k === 2 ? Rr[k] * 0.8 : Rr[k + 1], k === 2 ? 1 : 0, nd[0], nd[1], nd[2]]); P0 = P1; });
    }
    return segs;
  }
  function sculptHand(spec) {
    const mode = spec.mode || 'grain', grain = mode === 'grain';
    const M = basisM(spec.basis.x, spec.basis.z);
    const pose = spec.pose || {};
    const segs = handBones(pose);
    const wb = pose.wristBend || 0, foreL = pose.fore == null ? 1.2 : pose.fore, foreR = pose.foreR || 0.125;
    let fDir = [-Math.cos(wb), 0, -Math.sin(wb)];
    if (pose.fdir) { const v = pose.fdir, l = Math.hypot(v[0], v[1], v[2]) || 1; fDir = [(M[0][0] * v[0] + M[1][0] * v[1] + M[2][0] * v[2]) / l, (M[0][1] * v[0] + M[1][1] * v[1] + M[2][1] * v[2]) / l, (M[0][2] * v[0] + M[1][2] * v[1] + M[2][2] * v[2]) / l]; }
    let EL = null, UA = null;
    if (pose.upper) { EL = [fDir[0] * foreL, fDir[1] * foreL, fDir[2] * foreL]; const v = pose.upper.dir, l = Math.hypot(v[0], v[1], v[2]) || 1, L2 = pose.upper.len || 1.2;
      const u = [(M[0][0] * v[0] + M[1][0] * v[1] + M[2][0] * v[2]) / l, (M[0][1] * v[0] + M[1][1] * v[1] + M[2][1] * v[2]) / l, (M[0][2] * v[0] + M[1][2] * v[1] + M[2][2] * v[2]) / l];
      UA = [EL[0] + u[0] * L2, EL[1] + u[1] * L2, EL[2] + u[2] * L2]; }
    const comp = { d: 0, nail: 0, sl: 1e3 };
    const only = pose.only ? [].concat(pose.only) : null;
    const onlySegs = only ? segs.filter((qq, i) => (only.indexOf('thumb') >= 0 && i >= 12) || (only.indexOf('tips') >= 0 && i < 12 && i % 3 >= 1) || (only.indexOf('dist') >= 0 && i < 12 && i % 3 === 2) || (only.indexOf('fingers') >= 0 && i < 12)) : null;
    const upR = pose.upper ? (pose.upper.r || foreR * 1.35) : 0;
    function sdf(x, y, z) {
      if (onlySegs) { let d = 1e3, nl = 1e3, ni = -1; for (let i = 0; i < onlySegs.length; i++) { const qq = onlySegs[i]; const dd = sdCone(x, y, z, qq[0], qq[1], qq[2], qq[3], qq[4], qq[5], qq[6], qq[7]); d = smin(d, dd, 0.025); if (qq[8] && dd < nl) { nl = dd; ni = i; } } comp.nail = nl; comp.ni = ni; comp.d = d; comp.sl = 1e3; return d; }
      let d = sdE(x - 0.23, y, z + 0.004, 0.245, 0.165, 0.055);
      d = smin(d, sdE(x - 0.43, y, z, 0.07, 0.15, 0.046), 0.05);
      d = smin(d, sdE(x - 0.13, y + 0.095, z + 0.04, 0.13, 0.075, 0.052), 0.05);
      const fz = 1.3;
      if (!pose.noFore) d = smin(d, sdCone(x, y, z * fz, 0.02, 0, 0, fDir[0] * foreL, fDir[1] * foreL, fDir[2] * foreL * fz, 0.098, foreR * 1.15), 0.08);
      if (EL) d = smin(d, sdCone(x, y, z, EL[0], EL[1], EL[2], UA[0], UA[1], UA[2], foreR * 1.12, upR), 0.06);
      let nail = 1e3, ni = -1;
      for (let i = 0; i < segs.length; i++) { const qq = segs[i]; const dd = sdCone(x, y, z, qq[0], qq[1], qq[2], qq[3], qq[4], qq[5], qq[6], qq[7]); d = smin(d, dd, 0.025); if (qq[8] && dd < nail) { nail = dd; ni = i; } }
      comp.nail = nail; comp.ni = ni; comp.d = d; comp.sl = 1e3;
      return d;
    }
    const skin = rgb01(spec.skin || '#B47C58'), nailC = rgb01(spec.nail || '#D9A894');
    const out = [0, 0, 0], sd = spec.seed || 5;
    const segList = onlySegs || segs;
    function albedo(x, y, z, nx, ny, nz, mat) {
      out[0] = skin[0]; out[1] = skin[1]; out[2] = skin[2];
      // a nail: on the distal part of the last phalanx, on its back (each segment knows which way its back faces)
      if (mat >= 10) { const qq = segList[mat - 10]; if (qq) { const ax2 = qq[3] - qq[0], ay2 = qq[4] - qq[1], az2 = qq[5] - qq[2]; const h = ((x - qq[0]) * ax2 + (y - qq[1]) * ay2 + (z - qq[2]) * az2) / (ax2 * ax2 + ay2 * ay2 + az2 * az2);
        if (h > 0.3 && nx * qq[9] + ny * qq[10] + nz * qq[11] > 0.45) { out[0] = nailC[0]; out[1] = nailC[1]; out[2] = nailC[2]; if (h > 0.92) { out[0] = lerp(out[0], 1, 0.25); out[1] = lerp(out[1], 0.97, 0.25); out[2] = lerp(out[2], 0.94, 0.25); } } } }
      if (spec.knuckle && mat === 0 && x > 0.4 && x < 0.52 && nz > 0.5) { const k = spec.knuckle * 0.12; out[0] += (1 - out[0]) * k; out[1] += (1 - out[1]) * k * 0.9; out[2] += (1 - out[2]) * k * 0.85; }
    }
    // bounds: round every bone, the forearm and the upper arm, in view space
    let bounds = spec.bounds;
    if (!bounds) {
      let x0 = 9, y0 = 9, x1 = -9, y1 = -9; const add = (p, r) => { const vx = M[0][0] * p[0] + M[0][1] * p[1] + M[0][2] * p[2], vy = M[1][0] * p[0] + M[1][1] * p[1] + M[1][2] * p[2]; x0 = Math.min(x0, vx - r); x1 = Math.max(x1, vx + r); y0 = Math.min(y0, vy - r); y1 = Math.max(y1, vy + r); };
      (onlySegs || segs).forEach(qq => { add([qq[0], qq[1], qq[2]], qq[6] + 0.03); add([qq[3], qq[4], qq[5]], qq[7] + 0.03); });
      if (!onlySegs) { [[0, 0, 0], [0.45, -0.17, 0], [0.45, 0.17, 0], [0.1, 0.17, -0.06]].forEach(pp => add(pp, 0.1)); if (!pose.noFore) add([fDir[0] * foreL, fDir[1] * foreL, fDir[2] * foreL], foreR * 1.2 + 0.04); if (EL) add(UA, upR + 0.05); }
      bounds = [x0, y0, x1, y1];
    }
    const R = render3D({ sdf, matOf: () => (comp.nail <= comp.d + 0.006 && comp.ni >= 0 ? 10 + comp.ni : 0), albedo, out, M, s: spec.s, ss: spec.ss || 1.3,
      bounds, lights: spec.lights, amb: spec.amb, mode, seed: sd, warp: grain ? (spec.warp == null ? 1.0 : spec.warp) : 0, aoPoster: spec.aoPoster, aoLow: spec.aoLow, eps: 0.0012, extent: 2.5 });
    const proj = (lx, ly, lz) => [(M[0][0] * lx + M[0][1] * ly + M[0][2] * lz), (M[1][0] * lx + M[1][1] * ly + M[1][2] * lz)];
    return Object.assign(R, { M, proj, segs, EL, UA, fDir, foreL });
  }

  // ---- the hand poses. Each is drawn as a right hand in a canonical orientation; RIG.hand turns it (rot or fore) and mirrors it
  // (flip) for the other hand. `grip` is where the held thing sits (hand units), for props and the phone module.
  const FING = {
    flat: [[-0.12, 0.08, 0.06, 0.04], [-0.04, 0.08, 0.06, 0.04], [0.05, 0.08, 0.06, 0.04], [0.14, 0.1, 0.08, 0.05]],
    relax: [[-0.05, 0.3, 0.5, 0.3], [-0.015, 0.38, 0.55, 0.32], [0.02, 0.45, 0.58, 0.32], [0.055, 0.52, 0.6, 0.34]],
    rest: [[-0.12, 0.45, 0.35, 0.2], [-0.04, 0.5, 0.35, 0.2], [0.05, 0.5, 0.35, 0.2], [0.13, 0.45, 0.3, 0.2]],
    cup: [[-0.08, 0.6, 0.6, 0.35], [-0.03, 0.65, 0.6, 0.35], [0.03, 0.7, 0.6, 0.35], [0.09, 0.75, 0.6, 0.35]],
    fist: [[-0.05, 1.45, 1.35, 0.6], [0, 1.5, 1.35, 0.6], [0.05, 1.5, 1.3, 0.55], [0.1, 1.45, 1.2, 0.5]],
    grip: [[-0.06, 0.3, 1.45, 0.75], [-0.02, 0.3, 1.5, 0.75], [0.03, 0.3, 1.45, 0.75], [0.08, 0.3, 1.35, 0.7]],
    keys: [[-0.1, 0.5, 0.45, 0.3], [-0.03, 0.45, 0.5, 0.3], [0.04, 0.5, 0.5, 0.3], [0.12, 0.55, 0.5, 0.3]],
    // behind a phone: straight along its back, the last two joints curling round its far edge
    phone: [[-0.07, 0.1, 1.3, 0.55], [-0.025, 0.1, 1.35, 0.55], [0.02, 0.1, 1.3, 0.55], [0.065, 0.14, 1.25, 0.5]],
    // under a soft bag: nearly flat, a little cupped
    under: [[-0.07, 0.14, 0.22, 0.12], [-0.02, 0.14, 0.24, 0.12], [0.03, 0.14, 0.24, 0.12], [0.08, 0.17, 0.27, 0.14]],
  };
  const lerpF = (a, b, t) => a.map((r, i) => r.map((v, j) => lerp(v, b[i][j], t)));
  RIG.FING = FING;
  function phoneGrip(p, r0) {
    const r = p.reach == null ? r0 : p.reach, tp = p.tap || 0;
    return { basis: { x: [-1, -0.06, 0.04], z: [0.04, 0.1, -1] }, fingers: FING.phone,
      thumb: [lerp(1.3, 0.62, r), lerp(0.42, 0.52, r) - tp * 0.32, lerp(0.15, 0.32, r), lerp(0.1, 0.25, r)], fdir: [0.3, 0.95, 0.2], fore: 0.5, foreR: 0.13, grip: [0.39, -0.24, 0.1], phoneSize: [0.38, 0.79] };
  }
  const HANDS = {
    // hanging at the side (front view, his right hand on screen left): palm to the thigh, thumb toward us
    relax: p => ({ basis: { x: [0.1, 1, 0.18], z: [-0.62, 0.05, 0.78] }, fingers: lerpF(FING.relax, FING.cup, p.close || 0), thumb: [0.38, 0.75, 0.45, 0.35], fdir: [-0.04, -1, 0], fore: 0.45, foreR: 0.15 }),
    // resting over the phone the way you would touch a sleeping shoulder (B1): fingers draped down its back, no thumb
    rest: p => ({ basis: { x: [-0.55, 0.75, 0.35], z: [0.05, -0.4, 0.92] }, fingers: FING.rest, thumb: null, fdir: [0.75, -0.45, -0.4], fore: p.foreLen || 1.2, foreR: 0.17, grip: [0.55, 0, -0.12] }),
    // palm down on a flat surface (a desk, the phone face down): fingers long, the thumb tucked alongside
    flat: p => ({ basis: { x: [1, 0.25, -0.35], z: [0, -0.72, 0.7] }, fingers: lerpF(FING.flat, FING.rest, p.close || 0), thumb: [0.55, 0.45, 0.3, 0.2], fdir: [-1, 0.25, 0.35], fore: 0.5, foreR: 0.15, grip: [0.5, 0, -0.1] }),
    // round the pan's handle (B2)
    pan: p => ({ basis: { x: [0.95, 0.1, 0.25], z: [0.0, -0.55, 0.85] }, fingers: FING.fist, thumb: [0.9, 0.2, -0.6, -0.4], fdir: [-0.55, 0.55, -0.6], fore: 0.5, foreR: 0.15, grip: [0.42, 0.0, -0.1] }),
    // the fork (B2): a closed fist round the handle, the thumb along it
    fork: p => ({ basis: { x: [-0.35, -0.75, 0.55], z: [0.75, -0.15, 0.6] }, fingers: FING.fist, thumb: [1.1, 0.95, -0.9, -0.5], fdir: [0.15, 0.9, -0.4], fore: 0.4, foreR: 0.15, grip: [0.4, -0.02, -0.12] }),
    // the toothbrush at his mouth: a loose fist, thumb along the handle
    brush: p => ({ basis: { x: [0.85, -0.25, -0.35], z: [0.1, -0.7, 0.7] }, fingers: lerpF(FING.fist, FING.cup, 0.25), thumb: [0.7, 0.6, -0.4, -0.2], fdir: [-0.4, 0.9, -0.1], fore: 0.45, foreR: 0.13, grip: [0.42, -0.02, -0.12] }),
    // keyboard: palm down, fingers curled onto the keys
    keys: p => ({ basis: { x: [0.9, 0.3, -0.4], z: [0, -0.75, 0.66] }, fingers: FING.keys, thumb: [0.45, 0.6, 0.35, 0.25], fdir: [-1, 0.25, 0.35], fore: 0.5, foreR: 0.15 }),
    // the phone held up, screen to the viewer, fingers round its far edge, thumb on the near edge (B3). thumbReach 0..1 moves the
    // thumb across the glass (typing, swiping); tap 0..1 lifts it
    // the phone held in one hand, screen to the viewer (B3, and every insert): the phone's back on the palm and fingers, only the
    // fingertips round its far edge, the thumb at its near edge; reach 0..1 sends the thumb up across the glass (typing, swiping),
    // tap 0..1 lifts it. grip is the centre of a true-size phone (0.5 x 1.03 hand lengths), upright when the hand is unturned.
    phone: p => phoneGrip(p, 0),
    thumb: p => phoneGrip(p, 0.5),
    // the phone at his ear: fingers up its back, thumb under it
    ear: p => ({ basis: { x: [0.12, -1, 0.05], z: [-0.45, 0, 0.88] }, fingers: lerpF(FING.rest, FING.cup, 0.5), thumb: [0.7, 0.9, 0.4, 0.3], fdir: [0.15, 1, -0.2], fore: 0.6, foreR: 0.15, grip: [0.45, -0.05, -0.12] }),
    // her hand at the back of her neck, where her hair used to be (B3)
    nape: p => ({ basis: { x: [-0.75, 0.55, -0.35], z: [0.2, 0.3, 0.93] }, fingers: [[-0.12, 0.5, 0.45, 0.2], [-0.04, 0.55, 0.45, 0.2], [0.05, 0.55, 0.45, 0.2], [0.14, 0.55, 0.4, 0.2]], thumb: [0.6, 0.3, 0.1, 0.1], fdir: [0.9, -0.3, -0.2], fore: 0.3, foreR: 0.12 }),
    // the bag held from underneath, palm up, the fingers cupping its far side, the thumb over the top on the broken zip. zip 0..1
    // worries the thumb along it
    // the bag held by its end (cut 2): the palm against the bag's end, the back of the hand to us, the fingers lying over the bag's front,
    // the thumb along the top on the broken zip (zip: its worrying phase). Draw the bag first, then this hand. For the screen-right end
    // the hand is mirrored (flip), so its fingers run left over the bag. grip: the bag's end
    bag: p => { const z = p.zip || 0, w = Math.sin(z * Math.PI * 2); return { basis: { x: [1, 0.3, -0.12], z: [-0.22, 0.05, 0.97] }, fingers: lerpF(FING.rest, FING.cup, 0.6),
      thumb: [0.2 + 0.05 * w, 0.42, 0.12 + 0.12 * w, 0.08 + 0.1 * w], fdir: [-0.75, 0.62, -0.25], fore: 0.4, foreR: 0.15, grip: [0.3, 0.05, -0.12] }; },
    // the old grip (palm up under the bag, the thumb up over it), kept for compatibility
    bagUnder: p => { const z = p.zip || 0, w = Math.sin(z * Math.PI * 2); return { basis: { x: [1, 0.05, 0.3], z: [0, 1, -0.15] }, fingers: FING.under,
      thumb: [0.2 + 0.06 * w, 1.1, 0.8 + 0.12 * w, 0.45 + 0.1 * w], fdir: [-1, 0.1, 0.3], fore: 0.4, foreR: 0.15, grip: [0.4, -0.1, -0.2] }; },
    // the bus rail overhead: a fist round the bar, knuckles to us, the forearm hanging from it
    railBack: p => ({ basis: { x: [0.05, -1, -0.2], z: [0, 0.2, -1] }, fingers: lerpF(FING.fist, FING.cup, 0.2), thumb: [0.8, 1.1, 0.6, 0.5], fdir: [0.06, 1, 0.1], fore: 0.5, foreR: 0.13, grip: [0.48, 0, -0.12] }),
    rail: p => ({ basis: { x: [0.05, -1, 0.2], z: [0, 0.2, 1] }, fingers: lerpF(FING.fist, FING.cup, 0.15), thumb: [0.75, 1.15, 0.7, 0.55], fdir: [0.08, 1, -0.1], fore: 0.5, foreR: 0.15, grip: [0.48, 0, -0.12] }),
    // the door's edge: fingers round it (behind the door: clip them with p.clip), the back of the hand to us. tight 0..1
    door: p => { const t = p.tight || 0; return { basis: { x: [1, 0.1, -0.15], z: [0.05, -0.2, 1] }, fingers: lerpF([[-0.06, 0.9, 0.7, 0.3], [-0.02, 0.95, 0.7, 0.3], [0.03, 0.95, 0.7, 0.3], [0.08, 0.9, 0.6, 0.3]], FING.fist, t * 0.55),
      thumb: [0.55 - 0.15 * t, 0.45, 0.35, 0.25], fdir: [-0.9, 0.35, -0.1], fore: 0.45, foreR: 0.15, knuckle: t }; },
    // holding an object out, palm up (the trade: her phone, his bag). close 0..1
    offer: p => ({ basis: { x: [1, 0.05, -0.3], z: [0, lerp(0.72, 0.3, p.tilt || 0), lerp(-0.68, -0.95, p.tilt || 0)] }, fingers: lerpF(FING.rest, FING.cup, p.close || 0), thumb: [0.6, 0.8 + 0.3 * (p.close || 0), 0.45, 0.35], fdir: [-1, 0.05, 0.3], fore: 0.45, foreR: 0.15, grip: [0.4, 0, -0.18] }),
    // reaching to take: thumb and fingers open, closing to a pinch (close 0..1)
    take: p => { const c = p.close || 0; return { basis: { x: [1, 0.15, 0.05], z: [0, -0.35, 0.95] }, fingers: lerpF([[-0.1, 0.25, 0.2, 0.1], [-0.03, 0.3, 0.25, 0.12], [0.04, 0.4, 0.35, 0.18], [0.11, 0.55, 0.45, 0.25]], [[-0.04, 0.75, 0.6, 0.3], [0, 0.8, 0.6, 0.3], [0.04, 0.9, 0.7, 0.35], [0.09, 1.0, 0.75, 0.4]], c),
      thumb: [lerp(0.75, 0.5, c), lerp(0.85, 1.15, c), lerp(0.3, 0.5, c), lerp(0.2, 0.4, c)], fdir: [-1, 0.1, 0.2], fore: 0.45, foreR: 0.15, grip: [0.62, -0.08, -0.1] }; },
    // her hand on the bag strap at her chest: a loose fist round it
    strap: p => ({ basis: { x: [0.85, 0.35, 0.3], z: [0.05, -0.3, 0.95] }, fingers: lerpF(FING.fist, FING.cup, 0.4), thumb: [0.55, 0.95, 0.55, 0.45], fdir: [-0.6, 0.8, -0.1], fore: 0.4, foreR: 0.14, grip: [0.45, 0, -0.1] }),
    // carrying the bag down at the side by its top
    carry: p => ({ basis: { x: [0.08, 1, 0.1], z: [-0.5, 0, 0.86] }, fingers: lerpF(FING.cup, FING.fist, 0.6), thumb: [0.55, 1.0, 0.55, 0.45], fdir: [0, -1, 0], fore: 0.45, foreR: 0.15, grip: [0.55, -0.05, -0.12] }),
  };
  RIG.HANDS = HANDS;
  // the hands' skin, matched to the face's in the same light (cut 2: the hands read peach-orange against his face). A hand turns more
  // of itself to the light than a face (no brow, no stubble, no eye sockets), so its paper is cut a little darker than the face's.
  const SKIN = { him: { skin: '#A47152', nail: '#C49A86' }, her: { skin: '#DDB59C', nail: '#E6C4B4' }, coworker: { skin: '#BC967F', nail: '#D2AE9C' } };

  /* RIG.hand(c, who, pose, p): a sculpted hand. pose: a name from RIG.HANDS (or a pose object). p: {x, y (the wrist, world px),
     s (px per hand length), rot (radians, turns the pose about the view axis) or fore ([dx,dy]: screen direction from the wrist to
     the elbow; the pose turns to match), flip (the other hand: mirrored), foreLen (sculpted forearm length, hand units), upper
     ({dir:[x,y,z], len, r}: a sculpted upper arm, for bare arms), only ('thumb' | 'tips' | 'fingers' | [...]: just those, to
     draw over the phone in the gloss layer), close/tight/reach/tap/zip (pose controls 0..1), clip ({a:[x,y], b:[x,y]}: keep the
     part left of the line a->b; the fingers round a door's edge), light, mode, target ('gl'), shadow, alpha}
     Returns {x, y, s, tips, thumb, grip, elbow, angle} in world px. */
  RIG.hand = function (c, who, pose, p) {
    p = p || {}; const g = targetOf(c, p); const sk = SKIN[who] || SKIN.him;
    const s = p.s || 200, x = p.x || 0, y = p.y || 0, mode = p.mode || 'grain', toGl = g === c.gl, flip = !!p.flip;
    const base = typeof pose === 'string' ? (HANDS[pose] || HANDS.relax)(p) : (typeof pose === 'function' ? pose(p) : pose);
    const P = Object.assign({}, base);
    if (p.foreLen != null) P.fore = qf(p.foreLen, 0.05);
    if (p.foreR != null) P.foreR = p.foreR;
    if (p.upper) P.upper = p.upper;
    if (p.only === 'hand') P.noFore = true; else if (p.only) P.only = p.only;
    if (p.noThumb) P.thumb = null;
    // the turn: explicit rot, or match the pose's forearm to p.fore (screen direction wrist->elbow; mirrored first when flipped)
    let rot = p.rot || 0;
    if (p.fore && P.fdir) { const d = flip ? [-p.fore[0], p.fore[1]] : p.fore; rot = Math.atan2(d[1], d[0]) - Math.atan2(P.fdir[1], P.fdir[0]); }
    rot = qf(Math.atan2(Math.sin(rot), Math.cos(rot)), 0.05);
    const cr = Math.cos(rot), sr = Math.sin(rot), R3 = v => v ? [v[0] * cr - v[1] * sr, v[0] * sr + v[1] * cr, v[2]] : v;
    // a sculpted upper arm given in world space (upperW.dir: elbow -> shoulder on screen): into the pose's own frame
    if (p.upperW) { let d = p.upperW.dir; if (flip) d = [-d[0], d[1]]; const u = [d[0] * cr + d[1] * sr, -d[0] * sr + d[1] * cr]; P.upper = { dir: [u[0], u[1], p.upperW.z || 0], len: qf(p.upperW.len, 0.05), r: p.upperW.r || 0.26 }; }
    const basis = { x: R3(P.basis.x), z: R3(P.basis.z) }; const fdir = R3(P.fdir); const upper = P.upper ? Object.assign({}, P.upper, { dir: R3(P.upper.dir) }) : null;
    const pose2 = { fingers: P.fingers, thumb: P.thumb, fdir, fore: P.fore, foreR: P.foreR, wristBend: P.wristBend, upper, only: P.only, noFore: P.noFore };
    const L = asLight(p.light);
    const Rq = qScale(s * devScale(g) * (p.res || 1));
    // the phone's light on a hand: hands hold it from behind or lie beside it, so they take a little of it, never the face's dose
    const sl = sculptLights(L.phone ? Object.assign({}, L, { phone: Object.assign({}, L.phone, { k: L.phone.k * 0.35 }) }) : L, x, y, s, flip);
    const tex = mode === 'grain' ? (p.tex == null ? 0.42 : p.tex) : 0;
    const skin = p.skin || sk.skin;
    const qa = v => v == null ? v : (Array.isArray(v) ? v.map(qa) : (typeof v === 'number' ? +v.toFixed(3) : v));
    const key = 'K|' + who + '|' + Rq.toFixed(2) + '|' + JSON.stringify(qa(pose2)) + '|' + JSON.stringify(qa(basis)) + '|' + lightKey(sl) + '|' + mode + '|' + skin + '|' + (P.knuckle ? P.knuckle.toFixed(2) : 0) + '|' + tex + (toGl ? '|gl' : '');
    let e = cget(key);
    if (!e) {
      const t0 = now();
      const ss = p.ss || (Rq < 260 ? 1.4 : Rq < 480 ? 1.2 : 1.0);
      const R = sculptHand({ basis, pose: pose2, s: Rq, ss, lights: sl.lights, amb: sl.amb, mode, skin, aoLow: L.soft ? lerp(0.7, 0.86, L.soft) : undefined, nail: p.nail || sk.nail, seed: (who === 'her' ? 71 : 31) + (flip ? 3 : 0), knuckle: P.knuckle || 0 });
      e = bakeSculpt(R, { tex, texSeed: who === 'her' ? 62 : 18, kind: 'paper', texScale: Rq / s, shadowBlur: mode === 'gloss' ? null : 0.045 * Rq, shadowColor: L.shadow });
      e.Rq = Rq; e.M = R.M; e.proj = R.proj; e.segs = R.segs; e.EL = R.EL; e.UA = R.UA;
      const ms = now() - t0; e.ms = ms; RIG.stats.sculpts++; RIG.stats.sculptMs += ms; logCost('hand', key, ms);
      cput(key, e);
    }
    const k = s / Rq;
    const sh = p.shadow === false ? null : { dx: (p.shadow && p.shadow.dx != null ? p.shadow.dx : 0.035) * s, dy: (p.shadow && p.shadow.dy != null ? p.shadow.dy : 0.05) * s, alpha: p.shadow && p.shadow.alpha != null ? p.shadow.alpha : (toGl ? 0.3 : 0.45) };
    g.save();
    if (p.clip) { const a = p.clip.a, b = p.clip.b, d = V.norm(V.sub(b, a)), n = [d[1], -d[0]], F = 6000; g.beginPath(); g.moveTo(a[0] - d[0] * F, a[1] - d[1] * F); g.lineTo(b[0] + d[0] * F, b[1] + d[1] * F); g.lineTo(b[0] + d[0] * F + n[0] * F, b[1] + d[1] * F + n[1] * F); g.lineTo(a[0] - d[0] * F + n[0] * F, a[1] - d[1] * F + n[1] * F); g.closePath(); g.clip(); }
    if (toGl && mode === 'grain') placeSculpt(g, Object.assign({}, e, { img: glGrain(c, e) }), x, y, k, sh, flip, p.alpha);
    else placeSculpt(g, e, x, y, k, sh, flip, p.alpha);
    g.restore();
    const W2 = (l) => { const v = e.proj(l[0], l[1], l[2]); return [x + (flip ? -v[0] : v[0]) * s, y + v[1] * s]; };
    const tipsL = e.segs.filter(qq => qq[8]).map(qq => [qq[3], qq[4], qq[5]]);
    const gr = P.grip || [0.45, 0, -0.1];
    const res = { x, y, s, rot, flip, key, entry: e, tips: tipsL.slice(0, 4).map(W2), thumb: tipsL[4] ? W2(tipsL[4]) : null, grip: W2(gr), elbow: e.EL ? W2(e.EL) : null, shoulder: e.UA ? W2(e.UA) : null,
      knuckles: W2([0.47, -0.02, 0.03]), angle: Math.atan2(W2([1, 0, 0])[1] - y, W2([1, 0, 0])[0] - x) };
    // a held phone at true size, centred on the grip, upright when the pose is unturned (angle: radians, the phone's tilt)
    if (P.phoneSize) res.phone = { x: res.grip[0], y: res.grip[1], w: P.phoneSize[0] * s, h: P.phoneSize[1] * s, angle: flip ? -rot : rot };
    return res;
  };
  // ================================================================ cut paper: the figure engine
  // A figure is a list of ops in draw order, in figure space (head units, origin at the point between the eyes, y down):
  //   {type:'paper', key, box:[x0,y0,x1,y1], draw(pen), breath}   a cut-paper layer, cut once per key and kept
  //   {type:'head', p}  {type:'hand', pose, p, at:[x,y], fore:[dx,dy]}   sculptures (their own caches)
  //   {type:'live', draw(c, toWorld, s)}   drawn every frame in world space (small things that move every drawing)
  // Each paper layer is clipped to what the camera can see (plus a margin) and snapped to a grid, so a close-up cuts only what
  // shows. `breath` (0..1) lifts a layer with the chest by fig.breath px.
  const _cres = {};
  function cres(g, path, dx, dy, color, alpha, blur) {
    const w = g.canvas.width, h = g.canvas.height; let c = _cres.c; if (!c || c.width < w || c.height < h) c = _cres.c = makeCanvas(Math.max(w, c ? c.width : 0), Math.max(h, c ? c.height : 0));
    const t = c.getContext('2d'); t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'source-over'; t.globalAlpha = 1; t.filter = 'none'; t.clearRect(0, 0, w, h);
    t.setTransform(g.getTransform()); t.fillStyle = color; t.fill(path); t.globalCompositeOperation = 'destination-out'; if (blur) t.filter = `blur(${blur}px)`; t.translate(-dx, -dy); t.fill(path);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha == null ? 1 : alpha; g.drawImage(c, 0, 0, w, h, 0, 0, w, h); g.restore();
  }
  function makePen(g, R, box, L, flip, fig) {
    const from = flip ? [-L.paper.from[0], L.paper.from[1]] : L.paper.from.slice();
    const pen = { g, R, box, L, from, fig, rk: clamp(R / 320, 0.7, 2.0) };
    pen.P = u => (u[2] ? [(u[0] - box[0]) * R, (u[1] - box[1]) * R, 1] : [(u[0] - box[0]) * R, (u[1] - box[1]) * R]);
    pen.col = hex => mulHex(hex, L.paper.mul, L.paper.gain);
    // the same paper in more light keeps its hue and brightens (a touch of the light's colour); in shade it darkens toward the room
    const scale = (hex, f) => toHex(hexToRgb(hex).map(v => v * f));
    pen.lit = (hex, k) => { k = k == null ? 1 : k; return mix(scale(pen.col(hex), 1 + 0.42 * k * (L.paper.litGain || 1)), L.paper.lit, L.paper.litA * 0.35 * k); };
    pen.dark = (hex, k) => { k = k == null ? 1 : k; return mix(scale(pen.col(hex), 1 - 0.36 * k), L.paper.shade, L.paper.shadeA * 0.4 * k); };
    pen.blob = pts => GG.blob(pts.map(pen.P));
    pen.poly = pts => S().poly(pts.map(pen.P));
    pen.ell = (cx, cy, rx, ry, rot) => S().ellipse((cx - box[0]) * R, (cy - box[1]) * R, rx * R, ry * R, rot || 0);
    pen.path = (shape, rough, seed) => shape.path(rough == null ? 1.1 * pen.rk : rough * pen.rk, seed || 3);
    // a piece of cut paper: fill, its own texture at its own phase, the soft shadow that lifts it (offsets in head units)
    pen.piece = (shape, fill, o) => { o = o || {}; const lift = o.lift === false ? null : (o.lift || [0.02, 0.03]);
      return GG.piece(g, shape, { fill, rough: (o.rough == null ? 1.1 : o.rough) * pen.rk, seed: o.seed || 3, tex: o.tex == null ? 0.6 : o.tex, kind: o.kind || 'cloth', texScale: o.texScale || 0.85 * Math.min(1.15, Math.sqrt(pen.rk)),
        lift: lift ? [lift[0] * R, lift[1] * R] : null, liftBlur: (o.liftBlur == null ? 0.035 : o.liftBlur) * R, liftAlpha: o.liftAlpha == null ? 0.5 : o.liftAlpha, liftColor: L.shadow }); };
    // the light's two cut edges on a piece: the lit rim toward the light and the core shadow away from it (widths in head units)
    pen.shade = (path, hex, o) => { o = o || {}; const lw = (o.lit == null ? 0.07 : o.lit) * R, dw = (o.core == null ? 0.09 : o.core) * R;
      if (dw > 0) cres(g, path, -from[0] * dw, -from[1] * dw, pen.dark(hex, o.darkK), o.coreA == null ? 0.85 : o.coreA);
      if (lw > 0) cres(g, path, from[0] * lw, from[1] * lw, pen.lit(hex, o.litK), o.litA == null ? 0.9 : o.litA); };
    // posterised bands across a piece, dark -> light toward the light. Without o.center they are the figure's own bands, laid
    // from one centre, so they run on across torso and sleeves like one light cut into the whole figure
    pen.bands = (path, hex, o) => { o = o || {}; const c0 = o.center || (fig && fig.bandC) || [0, 1.9], sz = o.size || (fig && fig.bandS) || 1.5;
      const a = pen.P([c0[0] - from[0] * sz, c0[1] - from[1] * sz]), b = pen.P([c0[0] + from[0] * sz, c0[1] + from[1] * sz]);
      GG.bands(g, path, a, b, [pen.dark(hex, 0.55), pen.col(hex), pen.lit(hex, 0.6)], { stops: o.stops || [0, 0.3, 0.74], rough: 2.2 * pen.rk, seed: o.seed || 5 }); };
    // a fold: a dark crease and the lit lip beside it
    pen.fold = (pts, hex, o) => { o = o || {}; const w = (o.w || 0.022) * R; g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = o.darkCol || pen.dark(hex, 1.1); g.globalAlpha = o.alpha == null ? 0.75 : o.alpha; g.lineWidth = w; g.stroke(GG.spline(pts.map(pen.P), false));
      g.translate(from[0] * w * 0.9, from[1] * w * 0.9); g.strokeStyle = o.litCol || pen.lit(hex, 0.9); g.globalAlpha *= 0.7; g.lineWidth = w * 0.5; g.stroke(GG.spline(pts.map(pen.P), false)); g.restore(); };
    pen.line = (pts, color, w, alpha) => { g.save(); g.lineCap = 'round'; g.strokeStyle = color; g.globalAlpha = alpha == null ? 1 : alpha; g.lineWidth = w * R; g.stroke(GG.spline(pts.map(pen.P), false)); g.restore(); };
    pen.dot = (x, y, r, color) => { g.fillStyle = color; g.beginPath(); const p = pen.P([x, y]); g.arc(p[0], p[1], r * R, 0, 7); g.fill(); };
    pen.clip = path => { g.save(); g.clip(path); };
    pen.unclip = () => g.restore();
    return pen;
  }
  // the camera's view in figure units (so a layer only cuts what shows)
  function visibleBox(g, fig, margin) {
    const inv = g.getTransform().inverse(); const xs = [], ys = []; const r = -(fig.rot || 0), cr = Math.cos(r), sr = Math.sin(r);
    [[0, 0], [W, 0], [0, H], [W, H]].forEach(([x, y]) => { const wx = inv.a * x + inv.c * y + inv.e - fig.x, wy = inv.b * x + inv.d * y + inv.f - fig.y; const ux = (wx * cr - wy * sr) / fig.s / (fig.sx || 1), uy = (wx * sr + wy * cr) / fig.s; xs.push(ux * (fig.flip ? -1 : 1)); ys.push(uy); });
    const m = margin == null ? 0.6 : margin; return [Math.min(...xs) - m, Math.min(...ys) - m, Math.max(...xs) + m, Math.max(...ys) + m];
  }
  const paperKeyOf = (L, flip) => [L.paper.mul, L.paper.gain, L.paper.from.map(v => v.toFixed(2)), L.paper.lit, L.paper.litA, L.paper.shade, L.paper.shadeA, L.shadow, flip ? 'F' : ''].join(',');
  function drawFigure(c, fig) {
    const g = targetOf(c, fig); const s = fig.s, flip = !!fig.flip; const dev = devScale(g); const Rq = qScale(s * dev * (fig.res || 1));
    const rot = fig.rot || 0, cr = Math.cos(rot), sr = Math.sin(rot), sx = fig.sx || 1;
    const L0 = asLight(fig.light); const L = rot ? Object.assign({}, L0, { paper: Object.assign({}, L0.paper, { from: V.rot(L0.paper.from, -rot) }) }) : L0;
    const pk = paperKeyOf(L, flip); const vis = visibleBox(g, fig);
    const toWorld = (u, by) => { const fx = (flip ? -u[0] : u[0]) * s * sx, fy = u[1] * s - (by || 0); return [fig.x + fx * cr - fy * sr, fig.y + fx * sr + fy * cr]; };
    const toWorldDir = d => { const fx = (flip ? -d[0] : d[0]) * sx, fy = d[1]; return [fx * cr - fy * sr, fx * sr + fy * cr]; };
    const squash = d => sx === 1 ? 1 : Math.hypot(d[0] * sx, d[1]) / (Math.hypot(d[0], d[1]) || 1);
    const out = { heads: {}, hands: {}, toWorld: u => toWorld(u, 0) };
    for (const op of fig.ops) {
      if (!op) continue;
      const by = (op.breath == null ? 1 : op.breath) * (fig.breath || 0);
      if (op.type === 'paper') {
        let b = [Math.max(op.box[0], vis[0]), Math.max(op.box[1], vis[1]), Math.min(op.box[2], vis[2]), Math.min(op.box[3], vis[3])];
        if (b[2] <= b[0] || b[3] <= b[1]) continue;
        const sn = 0.25; b = [Math.floor(b[0] / sn) * sn, Math.floor(b[1] / sn) * sn, Math.ceil(b[2] / sn) * sn, Math.ceil(b[3] / sn) * sn];
        const key = 'P|' + fig.who + '|' + Rq.toFixed(2) + '|' + pk + '|' + (fig.costumeKey || '') + '|' + op.key + '|' + b.join(',');
        let e = cget(key);
        if (!e) {
          const t0 = now(); const w = Math.max(1, Math.ceil((b[2] - b[0]) * Rq)), h = Math.max(1, Math.ceil((b[3] - b[1]) * Rq));
          const cv = makeCanvas(w, h); const pen = makePen(cv.getContext('2d'), Rq, b, L, flip, fig);
          op.draw(pen);
          e = cput(key, { img: cv, box: b }); const ms = now() - t0; RIG.stats.layers++; RIG.stats.layerMs += ms; logCost('paper', key, ms);
        }
        g.save();
        // a collar sits under the jaw: where a bowed chin comes down in front of it, the chin wins
        const hd0 = out.heads.head; if (op.underJaw && hd0) { const J = [[-2.5, 0.1, -0.05], [-0.37, 0.1, -0.05], [-0.31, 0.29, 0.05], [-0.18, 0.41, 0.17], [0, 0.465, 0.22], [0.18, 0.41, 0.17], [0.31, 0.29, 0.05], [0.37, 0.1, -0.05], [2.5, 0.1, -0.05], [2.5, 6, -0.05], [-2.5, 6, -0.05]].map(q2 => hd0.proj(q2[0], q2[1], q2[2]));
          g.beginPath(); J.forEach((q2, k) => k ? g.lineTo(q2[0], q2[1]) : g.moveTo(q2[0], q2[1])); g.closePath(); g.clip(); }
        g.translate(fig.x, fig.y); if (rot) g.rotate(rot); g.translate(0, -by); if (flip) g.scale(-1, 1); if (sx !== 1) g.scale(sx, 1); if (fig.alpha != null) g.globalAlpha = fig.alpha;
        g.drawImage(e.img, b[0] * s, b[1] * s, (b[2] - b[0]) * s, (b[3] - b[1]) * s); g.restore();
      } else if (op.type === 'head') {
        const a0 = op.at || [0, 0]; if (a0[0] < vis[0] - 0.9 || a0[0] > vis[2] + 0.9 || a0[1] < vis[1] - 1.4 || a0[1] > vis[3] + 0.9) continue;   // off frame
        const p = Object.assign({}, op.p); const at = toWorld(op.at || [0, 0], by);
        if (flip) { p.yaw = -(p.yaw || 0); p.roll = -(p.roll || 0); if (p.gaze) p.gaze = [-p.gaze[0], p.gaze[1]]; }
        if (rot) p.roll = (p.roll || 0) + rot;
        out.heads[op.name || 'head'] = RIG.head(c, fig.who, Object.assign(p, { x: at[0], y: at[1], s: s * (op.scale || 1), light: L0, target: fig.target, alpha: fig.alpha }));
      } else if (op.type === 'hand') {
        if (!op.p.upperW && (op.at[0] < vis[0] - 0.7 || op.at[0] > vis[2] + 0.7 || op.at[1] < vis[1] - 0.7 || op.at[1] > vis[3] + 0.7)) continue;   // off frame
        const at = toWorld(op.at, by); const p = Object.assign({}, op.p, { x: at[0], y: at[1], s: s * (op.scale || HSCALE[fig.who] || 0.72), light: L0, target: op.target || fig.target, alpha: fig.alpha });
        p.flip = !!op.p.flip !== flip; if (op.fore) { p.fore = toWorldDir(op.fore); if (p.foreLen) p.foreLen *= squash(op.fore); } else if (rot || flip) p.rot = (flip ? -(op.p.rot || 0) : (op.p.rot || 0)) + rot;
        if (op.p.upperW) p.upperW = Object.assign({}, op.p.upperW, { dir: toWorldDir(op.p.upperW.dir), len: op.p.upperW.len * squash(op.p.upperW.dir) });
        out.hands[op.name || 'hand'] = RIG.hand(c, fig.who, op.pose, p);
        if (op.p.over) (out.overs = out.overs || []).push({ pose: op.pose, p: Object.assign({}, p, { only: op.p.over === 'all' ? (op.p.sleeved ? 'hand' : null) : op.p.over, target: 'gl', shadow: { alpha: 0.28 } }) });
      } else if (op.type === 'live') op.draw(c, u => toWorld(u, by), s, out, toWorldDir);
    }
    // the parts of the hands that hold the phone, again, in the gloss layer: call out.over(c) after the phone module has drawn it
    out.over = (c2) => { (out.overs || []).forEach(o => RIG.hand(c2 || c, fig.who, o.pose, o.p)); };
    out.info = fig.info || {}; return out;
  }
  const HSCALE = { him: 0.68, her: 0.62, coworker: 0.66 };
  RIG.drawFigure = drawFigure;

  // ---- limbs: two segments with an elbow (or knee): rounded on the outside of the bend, creased on the inside
  function limbPts(A, B, C, wA, wB, wC, o) {
    o = o || {}; const u1 = V.norm(V.sub(B, A)), u2 = V.norm(V.sub(C, B)), n1 = V.perp(u1), n2 = V.perp(u2);
    const turn = V.sub(u2, u1), tl = V.len(turn), inner = tl > 1e-3 ? V.mul(turn, 1 / tl) : n1;
    const bent = tl > 0.18; const pts = [];
    const sides = [1, -1].map(sg => {
      const isIn = bent && V.dot(V.mul(n1, sg), inner) > 0; const sp = [];
      if (o.cap) sp.push(V.add(A, V.add(V.mul(n1, sg * wA * 0.47), V.mul(u1, -wA * 0.12))));
      else sp.push([...V.add(A, V.mul(n1, sg * wA / 2)), 1]);
      if (o.bulge && !isIn) sp.push(V.add(V.lerp(A, B, 0.32), V.mul(n1, sg * (lerp(wA, wB, 0.32) / 2 + o.bulge))));
      sp.push(V.add(V.lerp(A, B, 0.62), V.mul(n1, sg * lerp(wA, wB, 0.62) / 2)));
      if (!bent) sp.push(V.add(B, V.mul(n1, sg * wB / 2)));
      else if (isIn) { const cosH = Math.max(0.5, Math.sqrt((1 + V.dot(u1, u2)) / 2)); sp.push(V.add(B, V.add(V.mul(inner, (wB / 2) / cosH * 0.86), V.mul(u1, -0.02)))); }
      else { sp.push(V.add(B, V.mul(n1, sg * wB / 2 * 1.02))); sp.push(V.add(B, V.mul(inner, -wB / 2 * 1.08))); sp.push(V.add(B, V.mul(n2, sg * wB / 2 * 1.02))); }
      sp.push(V.add(V.lerp(B, C, 0.4), V.mul(n2, sg * lerp(wB, wC, 0.4) / 2)));
      sp.push([...V.add(C, V.mul(n2, sg * wC / 2)), 1]);
      return { sp, isIn };
    });
    const a = sides[0].sp, b = sides[1].sp.slice().reverse();
    const cap = o.cap ? [V.add(A, V.add(V.mul(n1, -wA * 0.3), V.mul(u1, -wA * 0.34))), V.add(A, V.mul(u1, -wA * 0.42)), V.add(A, V.add(V.mul(n1, wA * 0.3), V.mul(u1, -wA * 0.34)))] : [];
    return { pts: cap.slice(2).concat(a, b, cap.slice(0, 2)), inner, bent, u1, u2, n1, n2, innerPt: V.add(B, V.mul(inner, wB / 2 * 0.9)) };
  }
  RIG.limbPts = limbPts;
  // 2-bone IK in the picture plane: shoulder A, target T, lengths, bend +1/-1 (which side the elbow goes)
  function ik(A, T, l1, l2, bend) {
    const d = V.sub(T, A); let L = V.len(d); const u = V.norm(d);
    if (L > l1 + l2 - 1e-4) { const k = (l1 + l2 - 1e-4) / L; L = l1 + l2 - 1e-4; return { E: V.add(A, V.mul(u, l1)), W: V.add(A, V.mul(u, L)), reach: k }; }
    L = Math.max(L, Math.abs(l1 - l2) + 1e-3);
    const ca = clamp((l1 * l1 + L * L - l2 * l2) / (2 * l1 * L), -1, 1), a = Math.acos(ca) * (bend || 1);
    return { E: V.add(A, V.mul(V.rot(u, a), l1)), W: T, reach: 1 };
  }
  RIG.ik = ik;
  const bboxOf = (pts, pad) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }); const m = pad == null ? 0.3 : pad; return [x0 - m, y0 - m, x1 + m, y1 + m]; };
  const kq = (a, st) => a.map(v => Array.isArray(v) ? kq(v, st) : (typeof v === 'number' ? q(v, st || 0.02).toFixed(2) : v)).join(',');
  // ================================================================ costumes (look_b.md)
  const COSTUME = {
    tee: { body: '#465650', kind: 'cloth', tex: 0.6, rib: '#3E4C47', sleeve: 'short', label: 'his faded green tee (night)' },
    shirt: { body: '#7488A8', kind: 'cloth', tex: 0.55, placket: true, buttons: '#D6DCE0', collar: '#8E98A4', stain: '#7A5A44', sleeve: 'cuff', cuff: '#8E98A4', label: 'the pale blue office shirt, a day past clean' },
    sweater: { body: '#4A4541', kind: 'wool', tex: 0.75, rib: '#55504B', sleeve: 'rib', cuff: '#524D48', label: 'the grey-brown sweater, stretched rib collar' },
    coat: { body: '#2C4A44', kind: 'wool', tex: 0.78, lit: '#4A7066', shadeC: '#1A2E2A', buttons: '#16221F', strap: '#8A5C3A', strapLit: '#C08E62', bag: '#7A4E30', sleeve: 'coat', cuff: '#2F4E47', label: 'her bottle-green coat, collar up, tan strap' },
    coworker: { body: '#6E6A72', kind: 'wool', tex: 0.7, rib: '#5E5A62', sleeve: 'rib', cuff: '#5E5A62', label: 'a cardigan' },
  };
  RIG.COSTUME = COSTUME;
  const LEGS = { him: { trousers: '#363B45', home: '#2E3440', shoe: '#2A211C', sock: '#5E5A56' }, her: { trousers: '#2A2B31', shoe: '#2B2420', sock: '#2A2B31' }, coworker: { trousers: '#3A3A40', shoe: '#2A2420' } };
  const SKINCOL = { him: '#B47C58', her: '#E6BDA2', coworker: '#C9A088' };
  // proportions in head units (1 = the head, crown to chin), from the point between the eyes
  const PROP = {
    him: { neckW: 0.19, shY: 1.07, sw: 0.74, l1: 1.3, l2: 1.12, armW: [0.34, 0.29, 0.24], bareW: [0.27, 0.23, 0.17], hipY: 3.3, hipW: 0.38, kneeY: 5.0, ankY: 6.5, floorY: 6.78, legW: [0.74, 0.5, 0.42],
      T: [[0.55, 0.2, 0.18, 0], [0.72, 0.44, 0.27, 0], [0.9, 0.72, 0.33, 0.02], [1.22, 0.82, 0.42, 0.05], [1.65, 0.78, 0.46, 0.08], [2.15, 0.7, 0.43, 0.07], [2.6, 0.66, 0.41, 0.08], [3.1, 0.7, 0.4, 0.03], [3.45, 0.72, 0.4, 0]] },
    her: { neckW: 0.16, shY: 1.03, sw: 0.68, l1: 1.22, l2: 1.04, armW: [0.36, 0.32, 0.29], bareW: [0.22, 0.19, 0.15], hipY: 3.0, hipW: 0.32, kneeY: 4.7, ankY: 6.15, floorY: 6.4, legW: [0.62, 0.48, 0.38],
      T: [[0.52, 0.16, 0.15, 0], [0.72, 0.46, 0.27, 0], [0.9, 0.78, 0.33, 0.02], [1.2, 0.8, 0.38, 0.05], [1.62, 0.72, 0.42, 0.07], [2.2, 0.64, 0.38, 0.04], [2.75, 0.74, 0.4, 0.02], [3.6, 0.84, 0.42, 0], [4.45, 0.9, 0.44, 0]] },
  };
  PROP.coworker = PROP.him;
  RIG.PROP = PROP;
  function section(T, y) { if (y <= T[0][0]) return T[0]; for (let i = 1; i < T.length; i++) if (y <= T[i][0]) { const u = (y - T[i - 1][0]) / (T[i][0] - T[i - 1][0]), s2 = u * u * (3 - 2 * u); return T[i - 1].map((v, k) => lerp(v, T[i][k], k ? s2 : u)); } return T[T.length - 1]; }
  // the torso turned by tau (0 faces us, + turns toward screen right): each level an ellipse (half-width a, half-depth b,
  // pushed forward by c), seen from the side by tau. Returns the silhouette and where the front centre line falls.
  function torsoGeo(T, tau, y0, y1, o) {
    o = o || {}; const ct = Math.cos(tau), st = Math.sin(tau), ox = o.ox || 0, lean = o.lean || 0;
    const at = y => { const [, a, b, c] = section(T, y); const hw = Math.sqrt(a * a * ct * ct + b * b * st * st) * (o.wide || 1); const sh = ox + lean * (y - y0) * -0.35; const cx = c * st + sh; return { l: cx - hw, r: cx + hw, cx, front: cx + (b + 0.02) * st * 0.92, back: cx - (b + 0.02) * st * 0.92 }; };
    const ys = []; const n = o.n || 9; for (let i = 0; i <= n; i++) ys.push(lerp(y0, y1, i / n));
    const left = ys.map(y => [at(y).l, y]), right = ys.map(y => [at(y).r, y]);
    return { at, left, right, ys };
  }
  RIG.torsoGeo = torsoGeo;

  /* person(o): the ops of a standing (or cropped) figure. o: {who, costume, tau (body turn), lean, head: {...face}, arms: {L, R}
     (screen-left and screen-right arm in figure space: {to:[x,y] wrist target | E:[x,y], W:[x,y]; bend ±1; hand: pose; hp: {...};
     front: true to cross in front of the body; sleeve: 'roll' | 'cuff' | ...}), legs: false | {stance, weight, bend, feet}, back:
     true (seen from behind), crop: y (nothing cut below), extra: {afterTorso: [ops], afterHead: [ops], end: [ops]}} */
  function person(o) {
    const who = o.who, Pp = PROP[who] || PROP.him, cos = COSTUME[o.costume] || COSTUME.shirt, back = !!o.back, tau = back ? Math.PI - (o.tau || Math.PI) : (o.tau || 0);
    const ct = Math.cos(tau), st = Math.sin(tau), lean = o.lean || 0;
    const nx = -0.1 * st * (back ? -1 : 1);                    // the neck sits behind the face (in front of it, from behind)
    const T = Pp.T; const yBot = o.costume === 'coat' ? T[T.length - 1][0] : (o.untucked ? 3.42 : 3.32);
    const crop = o.crop == null ? 99 : o.crop;
    const geo = torsoGeo(T, tau, T[0][0], Math.min(yBot, crop + 0.3), { ox: nx, lean });
    const shY = Pp.shY, sw = Pp.sw;
    const shoulder = sgn => { const x = sgn * sw * ct + nx - 0.02 * st + lean * -0.05; return [x, shY + (o.shrug || 0) * -0.08 + (sgn < 0 ? (o.tilt || 0) : -(o.tilt || 0)) * 0.08]; };
    const SL = shoulder(-1), SR = shoulder(1);
    const ops = []; const key0 = [who, o.costume, tau.toFixed(2), back ? 'B' : '', (o.lean || 0).toFixed(2), (o.shrug || 0).toFixed(2), (o.tilt || 0).toFixed(2), o.untucked ? 'u' : '', crop === 99 ? '' : crop.toFixed(1)].join(',');
    const ARM = o.arms || {};
    const armGeo = (side, spec) => {
      if (!spec) return null; const S0 = side === 'L' ? SL : SR; const sgn = side === 'L' ? -1 : 1; const l1 = (spec.len && spec.len[0]) || Pp.l1, l2 = (spec.len && spec.len[1]) || Pp.l2;
      let E, Wr;
      if (spec.E && spec.W) { E = spec.E; Wr = spec.W; }
      else if (spec.to) { const r = ik(S0, spec.to, l1 * (spec.f1 || 1), l2 * (spec.f2 || 1), (spec.bend || 1) * sgn * -1); E = r.E; Wr = r.W; }
      else { const a1 = spec.a1 == null ? 0.06 : spec.a1, a2 = spec.a2 == null ? 0.12 : spec.a2; E = V.add(S0, V.mul([Math.sin(a1 * -sgn), Math.cos(a1)], l1 * (spec.f1 || 1))); Wr = V.add(E, V.mul([Math.sin(a2 * -sgn), Math.cos(a2)], l2 * (spec.f2 || 1))); }
      return { S: S0, E, W: Wr, sgn, spec };
    };
    const AL = armGeo('L', ARM.L), AR = armGeo('R', ARM.R);
    const legs = o.legs === false || crop < Pp.hipY ? null : Object.assign({ stance: 0.12, weight: 0, bend: 0 }, o.legs || {});
    // -- legs
    if (legs && legs.joints) ops.push(...legOpsJoints(who, o, Pp, legs.joints, key0));
    else if (legs) ops.push(...legOps(who, o, Pp, tau, legs, key0));
    // -- arms behind the body: the far arm when turned, or any arm marked back
    const behind = []; const front = [];
    [[AL, 'L'], [AR, 'R']].forEach(([A, side]) => { if (!A) return; const isFar = (tau > 0.15 && side === 'R') || (tau < -0.15 && side === 'L');
      // from behind, whatever he holds in front of him is behind his back
      if (back) { if (A.spec.over) front.push([A, side]); else if (A.spec.front || A.spec.behind || isFar) behind.push([A, side]); else front.push([A, side]); return; }
      if (A.spec.front) front.push([A, side]); else if (A.spec.behind || isFar) behind.push([A, side]); else front.push([A, side]); });
    behind.forEach(([A, side]) => ops.push(...armOps(who, o, cos, A, side, key0)));
    if (o.costume === 'coat' && !back) ops.push(coatCollarBack(who, o, geo, key0));
    if ((o.costume === 'sweater' || o.costume === 'tee' || o.costume === 'coworker') && !back) ops.push(crewBack(who, o, cos, geo, key0));
    // -- the torso
    ops.push(torsoOp(who, o, cos, geo, tau, back, key0, SL, SR));
    if (o.extra && o.extra.afterTorso) ops.push(...o.extra.afterTorso);
    // arms that are in front of the body but behind the head (a hand at the back of the neck)
    front.filter(([A2]) => A2.spec.beforeHead).forEach(([A2, side]) => ops.push(...armOps(who, o, cos, A2, side, key0)));
    // -- the head
    if (o.head !== false) {
      // the head pivots on the neck: wherever it turns, its neck meets the collar
      const NECK = { tee: 0.36, sweater: 0.38, coworker: 0.38, shirt: 0.44, coat: 0.5 };
      const hp = Object.assign({ yaw: (back ? Math.PI - tau : tau) * 0.8, neck: NECK[o.costume] || 0.45 }, o.head || {}); const Mh = rotM(hp.yaw || 0, hp.pitch || 0, hp.roll || 0);
      const nkx = Mh[0][1] * 0.6 + Mh[0][2] * -0.1, nky = Mh[1][1] * 0.6 + Mh[1][2] * -0.1;
      const at = o.headAt || [nx - nkx, 0.6 - nky];
      ops.push({ type: 'head', p: hp, at });
    }
    if (o.extra && o.extra.afterHead) ops.push(...o.extra.afterHead);
    ops.push(collarOp(who, o, cos, geo, tau, back, key0));
    if (o.costume === 'coat' && !back && o.strap !== false) ops.push(strapOp(who, o, cos, geo, tau, key0, SL, SR));
    // -- the arms in front, the near one last
    front.filter(([A2]) => !A2.spec.beforeHead).sort((a, b) => (a[0].spec.order || 0) - (b[0].spec.order || 0)).forEach(([A, side]) => ops.push(...armOps(who, o, cos, A, side, key0)));
    if (o.extra && o.extra.end) ops.push(...o.extra.end);
    return { ops, geo, SL, SR, AL, AR, info: { shoulders: [SL, SR], elbows: [AL && AL.E, AR && AR.E], wrists: [AL && AL.W, AR && AR.W], neck: [nx, T[0][0]], hips: [0, Pp.hipY], feet: legs ? Pp.floorY : null } };
  }
  RIG.person = person;

  function legOps(who, o, Pp, tau, legs, key0) {
    const ct = Math.cos(tau), st = Math.sin(tau); const lc = LEGS[who] || LEGS.him; const home = o.costume === 'sweater' || o.costume === 'tee';
    const trousers = who === 'him' ? (home ? lc.home : lc.trousers) : lc.trousers;
    const shoe = home && who === 'him' && !o.shoes ? lc.sock : lc.shoe;
    const ops = [];
    const hip = sgn => [sgn * Pp.hipW * ct + 0.02 * st, Pp.hipY];
    const one = (sgn, far) => {
      const H0 = hip(sgn); const wt = legs.weight || 0; const st2 = legs.stance + (legs.feet || 0);
      const foot = [H0[0] + sgn * st2 * ct + (legs.step ? legs.step * (sgn > 0 ? 1 : -1) : 0), Pp.ankY - (sgn * wt > 0 ? 0 : 0.02 * Math.abs(wt))];
      const kneeOff = (legs.bend || 0) * 0.25 + (sgn * wt < 0 ? 0.08 * Math.abs(wt) : 0);
      const K = [lerp(H0[0], foot[0], 0.5) + kneeOff * (st > 0 ? 1 : st < 0 ? -1 : 0.4), Pp.kneeY - (legs.bend || 0) * 0.15];
      const key = 'leg' + sgn + ',' + key0 + ',' + kq([H0, K, foot, legs.bend || 0, tau]) + trousers + shoe;
      const W0 = Pp.legW; const box = bboxOf([H0, K, foot, [foot[0] + 0.6, Pp.floorY + 0.15], [foot[0] - 0.6, Pp.floorY + 0.15]], 0.45);
      ops.push({ type: 'paper', key, box, breath: 0, draw(pen) {
        const lp = limbPts(H0, K, foot, W0[0], W0[1], W0[2]);
        const sh = pen.blob(lp.pts); const path = pen.piece(sh, pen.col(far ? mix(trousers, '#000000', 0.15) : trousers), { seed: 200 + sgn * 7, kind: 'cloth', tex: 0.55, lift: [0.02, 0.03] });
        pen.shade(path, trousers, { lit: 0.05, core: 0.08 });
        if (lp.bent) pen.fold([V.add(lp.innerPt, V.mul(lp.u1, -0.25)), lp.innerPt, V.add(lp.innerPt, V.mul(lp.u2, 0.2))], trousers, { w: 0.02 });
        pen.fold([V.lerp(H0, K, 0.25), V.add(V.lerp(H0, K, 0.6), [0.03 * sgn, 0])], trousers, { w: 0.016, alpha: 0.4 });
        // the shoe (or a sock), pointed the way the body faces
        const dir = st >= 0 ? 1 : -1; const len = 0.55 * (0.55 + 0.45 * Math.abs(st)), toe = [foot[0] + dir * len * (0.35 + 0.65 * Math.abs(st)) + sgn * 0.05 * ct, Pp.floorY - 0.06];
        const heel = [foot[0] - dir * 0.12 * Math.abs(st) - sgn * 0.02, Pp.floorY - 0.04];
        const sp = pen.blob([[heel[0] - 0.12 * dir, Pp.floorY - 0.02, 1], [foot[0] - 0.16 * dir, foot[1] + 0.02], [foot[0] + 0.16 * dir, foot[1] + 0.06], [toe[0] - 0.05 * dir, toe[1] - 0.12], [toe[0] + 0.05 * dir, toe[1] - 0.02], [toe[0], Pp.floorY + 0.02, 1]]);
        const spp = pen.piece(sp, pen.col(shoe), { seed: 220 + sgn, kind: 'card', tex: 0.45, lift: [0.015, 0.02] });
        pen.shade(spp, shoe, { lit: 0.04, core: 0.05 });
      } });
    };
    // the far leg first
    const farSgn = tau >= 0 ? 1 : -1; one(farSgn, true); one(-farSgn, false);
    return ops;
  }

  function sleeveCol(cos) { return cos.body; }
  // an arm: the sleeve (with its elbow), the sculpted hand at the wrist, the cuff over the hand's wrist; bare arms are sculpted whole
  function armOps(who, o, cos, A, side, key0) {
    const Pp = PROP[who] || PROP.him; let spec = A.spec; const ops = [];
    const S0 = A.S, E = A.E, Wr = A.W; const sleeve = spec.sleeve || cos.sleeve;
    const key = 'arm' + side + ',' + key0 + ',' + kq([S0, E, Wr]) + ',' + sleeve + (spec.roll || '');
    const box = bboxOf([S0, E, Wr], 0.45);
    const bare = sleeve === 'short';
    const handS = HSCALE[who] || 0.72; let sleeveOp = null, handOp = null, cuffOp = null;
    if (spec.prop && spec.prop.before) ops.push(...[].concat(spec.prop.before));
    if (!bare) {
      const w = Pp.armW; const rolled = spec.roll ? clamp(spec.roll, 0, 1) : 0;      // rolled: the sleeve ends between the wrist and the elbow
      const Wend = rolled ? V.lerp(Wr, E, rolled * 0.75) : Wr; spec._Wend = Wend;
      sleeveOp = { type: 'paper', key: key + ',sl', box, draw(pen) {
        const wEnd = rolled ? lerp(w[2], w[1], rolled * 0.6) : w[2];
        const lp = limbPts(S0, E, Wend, w[0], w[1], wEnd, { bulge: 0.02, cap: true });
        const col = cos.body; const folded = V.dot(lp.u1, lp.u2) < -0.35;
        let path;
        if (!folded) { path = pen.piece(pen.blob(lp.pts), pen.col(col), { seed: 300 + (side === 'L' ? 0 : 11), kind: cos.kind, tex: cos.tex * 0.8, lift: [0.025, 0.035] });
          pen.bands(path, col, { seed: 402 }); pen.shade(path, col, { lit: 0.045, core: 0.07, litA: 0.6, coreA: 0.65 }); }
        else {
          // folded hard (a fork at his mouth): the upper arm and the forearm cut as two pieces, the forearm over it, the elbow round
          const up = limbPts(S0, V.lerp(S0, E, 0.5), V.add(E, V.mul(lp.u1, w[1] * 0.4)), w[0], lerp(w[0], w[1], 0.5), w[1], { bulge: 0.02, cap: true });
          const pu = pen.piece(pen.blob(up.pts), pen.col(col), { seed: 301 + (side === 'L' ? 0 : 11), kind: cos.kind, tex: cos.tex * 0.8, lift: [0.025, 0.035] }); pen.bands(pu, col, { seed: 402 }); pen.shade(pu, col, { lit: 0.045, core: 0.07, litA: 0.6, coreA: 0.65 });
          const fo = limbPts(V.add(E, V.mul(lp.u2, -w[1] * 0.35)), V.lerp(E, Wend, 0.5), Wend, w[1] * 1.05, lerp(w[1], wEnd, 0.5), wEnd, { cap: true });
          path = pen.piece(pen.blob(fo.pts), pen.col(col), { seed: 302 + (side === 'L' ? 0 : 11), kind: cos.kind, tex: cos.tex * 0.8, lift: [0.03, 0.045] }); pen.bands(path, col, { seed: 402 }); pen.shade(path, col, { lit: 0.045, core: 0.07, litA: 0.6, coreA: 0.65 });
          pen.fold([V.add(E, V.mul(lp.u2, w[1] * 0.3)), V.add(E, V.add(V.mul(lp.u2, w[1] * 0.75), V.mul(lp.n2, w[1] * 0.25)))], col, { w: 0.02, alpha: 0.55 });
        }
        if (lp.bent && !folded) { const ip = lp.innerPt; [[-0.22, 0.05], [-0.14, -0.06], [0.16, 0.06]].forEach(([d, off], i) => { const a = V.add(ip, V.mul(i < 2 ? lp.u1 : lp.u2, d)), b = V.add(ip, V.mul(V.perp(i < 2 ? lp.u1 : lp.u2), off * (V.dot(V.perp(lp.u1), lp.inner) > 0 ? -1 : 1))); pen.fold([a, V.lerp(a, b, 0.5), b], col, { w: 0.02, alpha: 0.6 }); }); }
        // set-in sleeve seam at the shoulder (coat, sweater)
        if (cos.kind === 'wool') pen.fold([V.add(S0, V.mul(lp.n1, -w[0] * 0.45)), V.add(S0, V.mul(lp.u1, 0.1)), V.add(S0, V.mul(lp.n1, w[0] * 0.45))], col, { w: 0.016, alpha: 0.45 });
        if (rolled) { // the rolled cuff
          const u = lp.u2, n = lp.n2, c0 = Wend, ww = lerp(w[2], w[1], rolled * 0.6) * 1.12;
          const rp = pen.blob([[...V.add(c0, V.add(V.mul(n, ww / 2), V.mul(u, -0.13))), 1], [...V.add(c0, V.add(V.mul(n, ww / 2 + 0.02), V.mul(u, 0.03))), 1], [...V.add(c0, V.add(V.mul(n, -ww / 2 - 0.02), V.mul(u, 0.03))), 1], [...V.add(c0, V.add(V.mul(n, -ww / 2), V.mul(u, -0.13))), 1]]);
          const rpp = pen.piece(rp, pen.col(cos.cuff || col), { seed: 330, kind: cos.kind, tex: cos.tex, lift: [0.015, 0.02] }); pen.shade(rpp, cos.cuff || col, { lit: 0.04, core: 0.03 });
        }
      } };
    } else {
      // the tee's short sleeve over the top of a sculpted bare arm (drawn after the arm, below)
    }
    // the hand (bare arms: the whole forearm and upper arm sculpted)
    const hp = Object.assign({}, spec.hp || {});
    const fore = V.sub(E, Wr);
    if (bare) { const hs = handS; hp.foreLen = qf(V.len(fore) / hs * 0.98, 0.05); const ud = V.sub(S0, E); hp.upperW = { dir: [ud[0], ud[1]], len: V.len(ud) / hs * 0.8, r: 0.28 }; hp.foreR = 0.22; }
    if (!bare && spec.roll && spec._Wend) hp.foreLen = qf((V.len(V.sub(spec._Wend, Wr)) + 0.06) / handS, 0.05);    // bare forearm up to the roll
    else if (!bare && hp.foreLen == null) hp.foreLen = spec.handAt ? 0.2 : 0.42;     // a placed hand's stub stays under its cuff
    if (!bare) hp.sleeved = true;
    // every arm ends in a hand: hand: false means an easy hand (handless: true for an arm truly hidden to the wrist)
    if (spec.hand === false && !spec.handless) { spec = Object.assign({}, spec, { hand: 'relax' }); hp.close = hp.close == null ? 0.55 : hp.close; }
    if (spec.hand !== false && !spec.handless) { if (spec.handAt) handOp = { type: 'hand', name: side, pose: spec.hand || 'relax', p: Object.assign(hp, { flip: (side === 'R') !== !!spec.flipHand, rot: spec.handRot || 0 }), at: spec.handAt };
      else handOp = { type: 'hand', name: side, pose: spec.hand || 'relax', p: Object.assign(hp, { flip: (side === 'R') !== !!spec.flipHand }), at: Wr, fore: V.norm(fore) }; }
    // the cuff over the wrist
    if (!bare && !spec.roll) {
      const w = Pp.armW[2] * (sleeve === 'coat' ? 1.16 : 1.06); const u = V.norm(V.sub(Wr, E)), n = V.perp(u);
      const cl = sleeve === 'coat' ? 0.2 : sleeve === 'rib' ? 0.16 : 0.13;
      cuffOp = { type: 'paper', key: key + ',cf', box: bboxOf([Wr, E], 0.4), draw(pen) {
        const c0 = V.add(Wr, V.mul(u, 0.03));
        const pts = [[...V.add(c0, V.add(V.mul(n, w / 2), V.mul(u, -cl))), 1], [...V.add(c0, V.mul(n, w / 2 + 0.01)), 1], V.add(c0, V.mul(u, 0.015)), [...V.add(c0, V.mul(n, -w / 2 - 0.01)), 1], [...V.add(c0, V.add(V.mul(n, -w / 2), V.mul(u, -cl))), 1]];
        const col = cos.cuff || cos.body; const path = pen.piece(pen.blob(pts), pen.col(col), { seed: 340 + (side === 'L' ? 0 : 5), kind: cos.kind, tex: cos.tex, lift: [0.015, 0.025] });
        pen.shade(path, col, { lit: 0.035, core: 0.04 });
        if (sleeve === 'rib') { pen.clip(path); for (let k = -4; k <= 4; k++) { const a = V.add(c0, V.add(V.mul(n, k * w / 9), V.mul(u, -cl))), b = V.add(c0, V.mul(n, k * w / 9)); pen.line([a, b], pen.dark(col, 0.7), 0.008, 0.6); } pen.unclip(); }
        if (sleeve === 'cuff') pen.dot(c0[0] + n[0] * w * 0.3 - u[0] * cl * 0.5, c0[1] + n[1] * w * 0.3 - u[1] * cl * 0.5, 0.018, pen.col(cos.buttons || '#D6DCE0'));
      } };
    }
    // the order: the hand first, then the sleeve over its forearm, then the cuff at the wrist (no bare forearm above a cuff).
    // B2's cheat (handAt: the fist above its cuff) keeps sleeve, hand, cuff.
    // hp.thumbOver: the hand is drawn without its thumb, then the prop it holds (spec.prop.mid), then the same hand's thumb alone on it
    const thumbOp = handOp && hp.thumbOver ? Object.assign({}, handOp, { name: side + 'thumb', p: Object.assign({}, handOp.p, { only: 'thumb', noThumb: false, thumbOver: false, shadow: { alpha: 0.3 } }) }) : null;
    if (thumbOp) handOp.p.noThumb = true;
    if (bare) { if (handOp) ops.push(handOp); }
    else if (spec.handAt) { ops.push(sleeveOp); if (handOp) ops.push(handOp); if (cuffOp) ops.push(cuffOp); }
    else { if (handOp) ops.push(handOp); ops.push(sleeveOp); if (cuffOp) ops.push(cuffOp); }
    if (thumbOp) { if (spec.prop && spec.prop.mid) ops.push(...[].concat(spec.prop.mid)); ops.push(thumbOp); }
    if (bare) {
      // the short sleeve of the tee over the top of the sculpted arm: a domed cap, flaring a little to a slanted hem
      const w = Pp.armW[0] * 1.05; const u = V.norm(V.sub(E, S0)), n = V.perp(u); const end = V.add(S0, V.mul(u, 0.5));
      ops.push({ type: 'paper', key: key + ',ts', box: bboxOf([S0, end], 0.45), draw(pen) {
        const at = (t, k) => V.add(V.add(S0, V.mul(u, t)), V.mul(n, k));
        const pts = [at(-0.17, 0), at(-0.13, w * 0.32), at(0.05, w * 0.52), [...at(0.5, w * 0.6), 1], at(0.53, 0), [...at(0.44, -w * 0.58), 1], at(0.05, -w * 0.52), at(-0.13, -w * 0.32)];
        const path = pen.piece(pen.blob(pts), pen.col(cos.body), { seed: 350 + (side === 'L' ? 0 : 3), kind: 'cloth', tex: cos.tex, lift: [0.02, 0.03] });
        pen.bands(path, cos.body, { seed: 403 }); pen.shade(path, cos.body, { lit: 0.04, core: 0.05, litA: 0.6, coreA: 0.6 });
        pen.fold([at(0.38, w * 0.4), at(0.3, 0), at(0.36, -w * 0.35)], cos.body, { w: 0.016, alpha: 0.45 });
      } });
    }
    if (spec.prop && spec.prop.after) ops.push(...[].concat(spec.prop.after));
    return ops;
  }

  // the torso piece for each costume
  function torsoOp(who, o, cos, geo, tau, back, key0, SL, SR) {
    const T = (PROP[who] || PROP.him).T; const y0 = T[0][0] + 0.06;
    const key = 'torso,' + key0 + ',' + (o.stain === false ? 'ns' : '');
    const pts = geo.left.concat(geo.right.slice().reverse());
    const box = bboxOf(pts.concat([SL, SR]), 0.5);
    return { type: 'paper', key, box, draw(pen) {
      const L0 = geo.left, R0 = geo.right, at = geo.at, yB = geo.ys[geo.ys.length - 1];
      // shoulder line: from the neck out over the trapezius to round shoulders (the arms cover their outer edge)
      const nk = at(T[0][0]), top = at(T[1][0]);
      const outline = [];
      outline.push([nk.l + 0.02, T[0][0] + 0.02]);
      outline.push([top.l, T[1][0] - 0.02]);
      outline.push([SL[0] + 0.02, SL[1] - 0.14]);
      outline.push([SL[0] - 0.12, SL[1] + 0.06]);
      L0.forEach(p => { if (p[1] > SL[1] + 0.35) outline.push(p); });
      const hemL = [L0[L0.length - 1][0], yB], hemR = [R0[R0.length - 1][0], yB];
      outline.push([hemL[0] + 0.02, yB + 0.02, 1]);
      if (o.costume === 'coat') { outline.push([lerp(hemL[0], hemR[0], 0.5), yB + 0.05]); }
      outline.push([hemR[0] - 0.02, yB + 0.02, 1]);
      R0.slice().reverse().forEach(p => { if (p[1] > SR[1] + 0.35) outline.push(p); });
      outline.push([SR[0] + 0.12, SR[1] + 0.06]);
      outline.push([SR[0] - 0.02, SR[1] - 0.14]);
      outline.push([top.r, T[1][0] - 0.02]);
      outline.push([nk.r - 0.02, T[0][0] + 0.02]);
      const col = cos.body; const sh = pen.blob(outline);
      const path = pen.piece(sh, pen.col(col), { seed: 400 + (who === 'her' ? 9 : 0), kind: cos.kind, tex: cos.tex, lift: [0.03, 0.04], liftBlur: 0.05 });
      pen.bands(path, col, { seed: 401 });
      pen.shade(path, col, { lit: 0.05, core: 0.08, litA: 0.6, coreA: 0.6 });
      const front = y => at(y).front; const st = Math.sin(tau);
      pen.clip(path);
      if (o.costume === 'shirt' && !back) {
        // the placket and its buttons, a crease from each armpit, the belt line, the coffee mark
        pen.line([[front(0.85), 0.85], [front(1.8), 1.8], [front(2.8), 2.8], [front(3.4), 3.4]], pen.dark(col, 0.9), 0.018, 0.7);
        [1.35, 1.95, 2.55].forEach(y => pen.dot(front(y) + 0.04, y, 0.022, pen.col(cos.buttons)));
        pen.fold([[at(1.55).l + 0.15, 1.55], [at(1.95).l + 0.32, 1.95], [at(2.4).l + 0.38, 2.45]], col, { w: 0.022, alpha: 0.55 });
        pen.fold([[at(1.6).r - 0.14, 1.6], [at(2.0).r - 0.3, 2.0], [at(2.5).r - 0.34, 2.5]], col, { w: 0.022, alpha: 0.55 });
        pen.fold([[at(2.9).l + 0.1, 2.95], [lerp(at(3).l, at(3).r, 0.5), 3.02], [at(2.9).r - 0.1, 2.95]], col, { w: 0.02, alpha: 0.45 });
        if (o.stain !== false) { pen.g.fillStyle = pen.col(cos.stain); pen.g.globalAlpha = 0.5; const p = pen.P([front(2.3) + 0.22, 2.3]); pen.g.beginPath(); pen.g.ellipse(p[0], p[1], 0.05 * pen.R, 0.036 * pen.R, 0.4, 0, 7); pen.g.fill(); pen.g.globalAlpha = 1; }
        if (yB > 3.25 && !o.untucked) { pen.g.fillStyle = pen.col('#2A2622'); const a = pen.P([at(3.25).l - 0.1, 3.22]), b = pen.P([at(3.25).r + 0.1, 3.36]); pen.g.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); }
      }
      if (o.costume === 'tee') {
        pen.fold([[at(1.7).l + 0.2, 1.7], [at(2.2).l + 0.45, 2.25]], col, { w: 0.022, alpha: 0.5 });
        pen.fold([[at(2.6).r - 0.2, 2.5], [at(2.9).r - 0.5, 2.95]], col, { w: 0.022, alpha: 0.45 });
      }
      if (o.costume === 'sweater') {
        pen.fold([[at(1.7).l + 0.18, 1.75], [at(2.1).l + 0.35, 2.1], [at(2.5).l + 0.4, 2.55]], col, { w: 0.026, alpha: 0.5 });
        pen.fold([[at(1.8).r - 0.2, 1.8], [at(2.2).r - 0.38, 2.25]], col, { w: 0.026, alpha: 0.45 });
        if (yB > 3.1) { const rb = pen.blob([[at(3.12).l - 0.02, 3.1, 1], [at(3.12).r + 0.02, 3.1, 1], [at(3.4).r + 0.02, yB + 0.05, 1], [at(3.4).l - 0.02, yB + 0.05, 1]]); const rp = pen.piece(rb, pen.col(cos.rib), { seed: 412, kind: 'wool', tex: 0.7, lift: [0, 0.02] });
          for (let k = 0; k <= 40; k++) { const x = lerp(at(3.2).l, at(3.2).r, k / 40); pen.line([[x, 3.12], [x, yB]], pen.dark(cos.rib, 0.6), 0.008, 0.5); } }
      }
      if (o.costume === 'coat' && !back) {
        // the front edge, the buttons, two flap pockets, the shoulder seams; the coat falls straight to the knee
        const fx = y => front(y) - 0.07 * (st >= 0 ? 1 : -1);
        pen.fold([[fx(1.0), 1.0], [fx(1.8), 1.8], [fx(2.6), 2.6], [fx(3.6), 3.6], [fx(4.4), 4.45]], col, { w: 0.03, alpha: 0.8, darkCol: pen.col(cos.shadeC) });
        [1.75, 2.35, 2.95].forEach(y => { const bx = fx(y) + 0.1 * (st >= 0 ? 1 : 0.6); pen.dot(bx, y, 0.045, pen.col(cos.buttons)); pen.dot(bx - 0.012, y - 0.012, 0.014, pen.lit(col, 0.8)); });
        [-1, 1].forEach(sg => { const y = 3.05, cx2 = at(y).cx + sg * 0.42 * Math.cos(tau) + 0.1 * st, w2 = 0.36 * (0.6 + 0.4 * Math.cos(tau));
          const fl = pen.blob([[cx2 - w2 / 2, y, 1], [cx2 + w2 / 2, y - 0.015, 1], [cx2 + w2 / 2 - 0.01, y + 0.12, 1], [cx2 - w2 / 2 + 0.01, y + 0.13, 1]]);
          const fp = pen.piece(fl, pen.col(col), { seed: 420 + sg, kind: 'wool', tex: 0.7, lift: [0.01, 0.02] }); pen.shade(fp, col, { lit: 0.025, core: 0.03 }); });
        pen.fold([[at(1.8).l + 0.12, 1.85], [at(2.6).l + 0.2, 2.7], [at(3.8).l + 0.15, 4.1]], col, { w: 0.028, alpha: 0.45 });
        pen.fold([[at(2.4).r - 0.15, 2.5], [at(3.4).r - 0.25, 3.5], [at(4.2).r - 0.2, 4.4]], col, { w: 0.028, alpha: 0.4 });
      }
      if (back) {
        const cx2 = at(1.5).cx;
        pen.fold([[cx2 - 0.35, 1.2], [cx2 - 0.1, 1.55], [cx2 + 0.2, 1.75]], col, { w: 0.028, alpha: 0.45 });
        pen.fold([[cx2 + 0.3, 1.25], [cx2 + 0.4, 1.7], [cx2 + 0.35, 2.2]], col, { w: 0.028, alpha: 0.4 });
      }
      pen.unclip();
    } };
  }
  // the coat's turned-up collar behind the neck (before the head) and its front (after)
  // ---- collars. Thin pieces of cloth that sit on the garment at the base of the neck (never a pad round it). The parts in front of
  // the neck are clipped under the jaw at draw time (underJaw), so a bowed chin comes in front of the collar.
  function coatCollarBack(who, o, geo, key0) {
    const nk = geo.at(0.55); return { type: 'paper', key: 'ccb2,' + key0, box: [nk.l - 0.5, 0.1, nk.r + 0.5, 1.1], draw(pen) {
      // the turned-up collar's back: a band standing behind the neck, showing either side of it
      const c = COSTUME.coat; const cx = nk.cx;
      const p = pen.blob([[cx - 0.33, 0.78], [cx - 0.33, 0.56], [cx - 0.22, 0.44], [cx, 0.41], [cx + 0.22, 0.44], [cx + 0.33, 0.56], [cx + 0.33, 0.78]]);
      const path = pen.piece(p, pen.dark(c.body, 0.5), { seed: 430, kind: 'wool', tex: 0.6, lift: [0.006, 0.012] }); pen.shade(path, c.body, { lit: 0.02, core: 0.03 });
    } };
  }
  function crewBack(who, o, cos, geo, key0) {
    const nk = geo.at(0.6), cx = nk.cx; const sw = o.costume !== 'tee';
    return { type: 'paper', key: 'crewb2,' + key0, box: [cx - 0.5, 0.3, cx + 0.5, 0.8], draw(pen) {
      // the inside of the band behind the neck: a thin dark arc either side of it
      const col = sw ? cos.body : cos.rib; const hw = 0.24, th = sw ? 0.045 : 0.035;
      const band = pen.blob([[cx - hw, 0.62, 1], [cx - hw * 0.55, 0.53], [cx, 0.51], [cx + hw * 0.55, 0.53], [cx + hw, 0.62, 1], [cx + hw * 0.55, 0.53 + th], [cx, 0.51 + th], [cx - hw * 0.55, 0.53 + th]]);
      pen.piece(band, pen.dark(col, 0.55), { seed: 447, kind: sw ? 'wool' : 'cloth', tex: 0.5, lift: false });
    } };
  }
  // the garment under a collar (its yoke), in the torso's own bands, unlifted, so it joins the torso as one piece of cloth
  function yoke(pen, cos, pts) { const pth = pen.piece(pen.blob(pts), pen.col(cos.body), { seed: 400 + 31, kind: cos.kind, tex: cos.tex, lift: false }); pen.bands(pth, cos.body, { seed: 401 }); return pth; }
  function collarOp(who, o, cos, geo, tau, back, key0) {
    const nk = geo.at(0.6); const st = Math.sin(tau), cx = nk.cx, fr = geo.at(0.75).front;
    return { type: 'paper', key: 'col2,' + key0, box: [nk.l - 0.7, 0.2, nk.r + 0.7, 1.4], underJaw: true, draw(pen) {
      const col = cos.collar || cos.rib || cos.body;
      if (o.costume === 'shirt' && !back) {
        // the shirt's collar: a narrow stand round the neck, and two flat points lying on the shirt, open at the throat; crushed
        // (the far point a little curled up). The neck shows above it.
        const V0 = [fr, 0.8], sg = st >= 0 ? 1 : -1;
        [-1, 1].forEach((side, i) => { const far = side === sg; const k = far ? 0.75 : 1;
          const stand = pen.blob([[cx + side * 0.215, 0.54, 1], [cx + side * 0.225, 0.6], [lerp(cx + side * 0.2, V0[0], 0.55), 0.73], [V0[0] + side * 0.012, V0[1], 1], [V0[0] + side * 0.03, V0[1] - 0.05], [lerp(cx + side * 0.17, V0[0], 0.5), 0.67], [cx + side * 0.175, 0.56, 1]]);
          pen.piece(stand, pen.col(mix(col, '#000000', 0.06)), { seed: 438 + i, kind: 'cloth', tex: 0.45, lift: [0.004, 0.008] });
          const pt = pen.blob([[cx + side * 0.21, 0.57, 1], [cx + side * (0.25 + 0.06 * k), 0.66], [cx + side * (0.27 + 0.07 * k), 0.8 + (far ? -0.02 : 0.02), 1], [lerp(cx + side * 0.12, V0[0], 0.4), 0.8], [V0[0] + side * 0.035, V0[1] - 0.01, 1], [lerp(cx + side * 0.19, V0[0], 0.55), 0.7]]);
          const pth = pen.piece(pt, pen.col(far ? mix(col, '#FFFFFF', 0.06) : col), { seed: 440 + i, kind: 'cloth', tex: 0.45, lift: [0.008, 0.014], liftAlpha: 0.4 });
          pen.shade(pth, col, { lit: 0.018, core: 0.02 }); });
      } else if ((o.costume === 'sweater' || o.costume === 'coworker' || o.costume === 'tee') && !back) {
        // the front of the crew neck: a narrow ribbed band at the base of the neck, dipping a little at the throat (the sweater's
        // stretched a touch more); under it the garment again (the yoke), so the neck's end never shows below the band
        const sw = o.costume !== 'tee', dip = sw ? 0.17 : 0.14, th = sw ? 0.055 : 0.04, hw = 0.235;
        yoke(pen, cos, [[cx - hw - 0.03, 0.62], [cx - hw * 0.72, 0.58 + dip * 0.6 + th * 0.6], [fr, 0.58 + dip + th * 0.6], [cx + hw * 0.72, 0.58 + dip * 0.6 + th * 0.6], [cx + hw + 0.03, 0.62], [cx + 0.42, 1.05], [fr, 1.18], [cx - 0.42, 1.05]]);
        const band = pen.blob([[cx - hw - 0.01, 0.58, 1], [cx - hw * 0.7, 0.58 + dip * 0.6], [fr, 0.58 + dip], [cx + hw * 0.7, 0.58 + dip * 0.6], [cx + hw + 0.01, 0.58, 1], [cx + hw + 0.03, 0.58 + th * 0.8], [cx + hw * 0.72, 0.58 + dip * 0.6 + th], [fr, 0.58 + dip + th], [cx - hw * 0.72, 0.58 + dip * 0.6 + th], [cx - hw - 0.03, 0.58 + th * 0.8]]);
        const rc = sw ? mix(col, '#000000', 0.05) : cos.rib; const pth = pen.piece(band, pen.col(rc), { seed: 445, kind: sw ? 'wool' : 'cloth', tex: 0.55, lift: [0.003, 0.006], liftAlpha: 0.35 });
        if (sw) { pen.clip(pth); for (let k = -18; k <= 18; k++) { const u = k / 18, x = cx + u * (hw + 0.02); const y0 = 0.58 + dip * (1 - u * u); pen.line([[x, y0 - 0.02], [x, y0 + th + 0.02]], pen.dark(rc, 0.5), 0.005, 0.4); } pen.unclip(); }
        pen.shade(pth, rc, { lit: 0.012, core: 0.015 });
      } else if (o.costume === 'coat' && !back) {
        // the turned-up collar's two fronts: narrow, lying against the neck's sides and down to a V at the throat
        const Lc = pen.blob([[cx - 0.33, 0.88], [cx - 0.33, 0.62], [cx - 0.25, 0.5], [cx - 0.17, 0.54], [fr - 0.03, 0.97, 1], [cx - 0.24, 1.0]]);
        const Rc = pen.blob([[cx + 0.33, 0.88], [cx + 0.24, 1.0], [fr + 0.04, 0.98, 1], [cx + 0.17, 0.54], [cx + 0.25, 0.5], [cx + 0.33, 0.62]]);
        [Lc, Rc].forEach((sh, i) => { const c2 = COSTUME.coat; const pth = pen.piece(sh, pen.col(i === (st >= 0 ? 0 : 1) ? c2.body : mix(c2.body, c2.lit, 0.2)), { seed: 450 + i, kind: 'wool', tex: 0.6, lift: [0.008, 0.016], liftAlpha: 0.4 }); pen.shade(pth, c2.body, { lit: 0.025, core: 0.03 }); });
      } else if (back) {
        // from behind: the garment's yoke over the neck's end, the band across the back of the neck on it
        yoke(pen, cos, [[cx - 0.3, 0.69], [cx - 0.2, 0.62], [cx, 0.6], [cx + 0.2, 0.62], [cx + 0.3, 0.69], [cx + 0.5, 1.1], [cx, 1.2], [cx - 0.5, 1.1]]);
        // the collar from behind is cloth lying flat on the garment (cut 2: never a pad): a band no wider than the neck, square at
        // its ends, in the garment's own colour and bands, unlifted; a shirt's shows its fold as one dark line, a knit its ribs
        const th = cos.kind === 'wool' ? 0.05 : o.costume === 'shirt' ? 0.08 : 0.04, hw = 0.215;
        const outer = pen.blob([[cx - hw - 0.02, 0.665, 1], [cx - hw, 0.585, 1], [cx, 0.565], [cx + hw, 0.585, 1], [cx + hw + 0.02, 0.665, 1], [cx + hw * 0.6, 0.575 + th + 0.01], [cx, 0.565 + th], [cx - hw * 0.6, 0.575 + th + 0.01]]);
        const bc = o.costume === 'shirt' ? cos.body : (cos.rib || cos.body);
        const pth = pen.piece(outer, pen.col(mix(bc, '#000000', 0.04)), { seed: 449, kind: cos.kind, tex: cos.tex * 0.8, lift: false }); pen.bands(pth, bc, { seed: 401 });
        pen.line([[cx - hw - 0.01, 0.66], [cx - hw * 0.5, 0.575 + th + 0.005], [cx, 0.565 + th], [cx + hw * 0.5, 0.575 + th + 0.005], [cx + hw + 0.01, 0.66]], pen.dark(bc, 0.9), 0.01, 0.55);
        if (cos.kind === 'wool') { pen.clip(pth); for (let k = -11; k <= 11; k++) { const x = cx + k * 0.02; pen.line([[x, 0.54], [x, 0.7]], pen.dark(bc, 0.45), 0.004, 0.35); } pen.unclip(); }
      }
    } };
  }
  // her bag's tan strap across the coat, the bag at her hip
  function strapOp(who, o, cos, geo, tau, key0, SL, SR) {
    const st = Math.sin(tau); const sh = st >= 0 ? SL : SR; const hipX = geo.at(2.9)[st >= 0 ? 'r' : 'l'];
    return { type: 'paper', key: 'strap,' + key0, box: bboxOf([sh, [hipX, 3.1]], 0.6), draw(pen) {
      const a = [sh[0] + (st >= 0 ? 0.22 : -0.22), sh[1] - 0.05], b = [hipX + (st >= 0 ? 0.05 : -0.05), 2.85];
      const d = V.norm(V.sub(b, a)), n = V.perp(d), w = 0.05;
      const sp = pen.blob([[...V.add(a, V.mul(n, w)), 1], [...V.add(b, V.mul(n, w)), 1], [...V.add(b, V.mul(n, -w)), 1], [...V.add(a, V.mul(n, -w)), 1]]);
      const pth = pen.piece(sp, pen.col(cos.strap), { seed: 460, kind: 'card', tex: 0.55, lift: [0.012, 0.02] }); pen.shade(pth, cos.strap, { lit: 0.02, core: 0.02 });
      const bx = b[0] + (st >= 0 ? 0.02 : -0.02); const bag = pen.blob([[bx - 0.26, 2.82], [bx + 0.24, 2.8], [bx + 0.28, 3.25], [bx - 0.28, 3.27]]);
      const bp = pen.piece(bag, pen.col(cos.bag), { seed: 462, kind: 'card', tex: 0.5, lift: [0.02, 0.03] }); pen.shade(bp, cos.bag, { lit: 0.035, core: 0.04 });
      pen.fold([[bx - 0.24, 2.92], [bx, 2.94], [bx + 0.24, 2.9]], cos.bag, { w: 0.016, alpha: 0.6 });
    } };
  }
  // ================================================================ props (cut paper) the characters hold
  // the old floral makeup bag, its zip broken at one end (look_b.md palette). c: centre (figure units), w: width
  function bagShape(pen, c, w, o) {
    o = o || {}; const h = w * 0.52, x = c[0], y = c[1];
    const sh = pen.blob([[x - w * 0.47, y - h * 0.36], [x - w * 0.14, y - h * 0.5], [x + w * 0.32, y - h * 0.47], [x + w * 0.5, y - h * 0.3], [x + w * 0.52, y + h * 0.27], [x + w * 0.36, y + h * 0.5], [x - w * 0.27, y + h * 0.52], [x - w * 0.49, y + h * 0.28]]);
    const path = pen.piece(sh, pen.col('#D9C1B4'), { seed: 501, kind: 'cloth', tex: 0.7, lift: [0.03, 0.045] });
    pen.clip(path); const r = rng('flor' + (o.seed || 1));
    for (let i = 0; i < 22; i++) { const fx = x - w * 0.55 + r() * w * 1.1, fy = y - h * 0.55 + r() * h * 1.1, fs = w * (0.035 + r() * 0.04), col = pen.col(['#B9666A', '#C98A5E', '#7A8E6A', '#9C6E8E'][i % 4]);
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + r(); const p = pen.P([fx + Math.cos(a) * fs * 0.55, fy + Math.sin(a) * fs * 0.55]); pen.g.fillStyle = col; pen.g.beginPath(); pen.g.ellipse(p[0], p[1], fs * 0.42 * pen.R, fs * 0.26 * pen.R, a, 0, 7); pen.g.fill(); }
      pen.dot(fx, fy, fs * 0.2, pen.col('#E8C96A')); pen.line([[fx + fs * 0.5, fy + fs * 0.4], [fx + fs, fy + fs * 1.1], [fx + fs * 1.6, fy + fs]], pen.col('#6E7E5A'), w * 0.008, 0.9); }
    pen.g.save(); pen.g.globalCompositeOperation = 'multiply'; pen.g.fillStyle = 'rgba(190,180,170,0.4)'; pen.g.fillRect(0, 0, pen.g.canvas.width, pen.g.canvas.height); pen.g.restore(); pen.unclip();
    pen.shade(path, '#D9C1B4', { lit: w * 0.05, core: w * 0.07 });
    // the zip along the top: teeth, the slider gone, the last inch gaping
    const zl = [x - w * 0.42, y - h * 0.36], zm = [x + w * 0.2, y - h * 0.44], zr = [x + w * 0.47, y - h * 0.3];
    pen.line([zl, V.lerp(zl, zm, 0.5), zm], pen.col('#7A6A50'), w * 0.028, 1);
    pen.g.save(); pen.g.setLineDash([w * 0.01 * pen.R, w * 0.01 * pen.R]); pen.line([zl, V.lerp(zl, zm, 0.5), zm], pen.col('#C8A858'), w * 0.01, 1);
    pen.line([zm, [x + w * 0.34, y - h * 0.52], [zr[0], zr[1] - h * 0.1]], pen.col('#C8A858'), w * 0.01, 1); pen.line([zm, [x + w * 0.34, y - h * 0.34], [zr[0], zr[1] + h * 0.08]], pen.col('#C8A858'), w * 0.01, 1); pen.g.restore();
    const gp = pen.blob([[zm[0] + w * 0.02, zm[1]], [x + w * 0.34, y - h * 0.48], [zr[0] - w * 0.02, zr[1] - h * 0.05], [x + w * 0.34, y - h * 0.38]]); pen.g.fillStyle = pen.col('#2E2624'); pen.g.fill(pen.path(gp, 0.5, 503));
    return { path, zip: [zl, zm, zr] };
  }
  RIG.bagShape = bagShape;
  // RIG.bag(c, x, y, s, o): the makeup bag alone in world px (s = px per head unit), e.g. on the wardrobe shelf. o.light
  RIG.bag = function (c, x, y, s, o) {
    o = o || {}; drawFigure(c, { who: 'prop', x, y, s, light: o.light, rot: o.rot || 0, ops: [{ type: 'paper', key: 'bag' + (o.seed || 1), box: [-0.55, -0.4, 0.55, 0.4], draw(pen) { bagShape(pen, [0, 0], 0.72, o); } }], target: o.target });
  };
  function forkPiece(pen, a, b, twirl) {
    const u = V.norm(V.sub(b, a)), n = V.perp(u); pen.line([a, V.add(b, V.mul(u, -0.1))], pen.col('#9EA2A6'), 0.028, 1);
    const nb = V.add(b, V.mul(u, -0.11)); const head = pen.poly([V.add(nb, V.mul(n, 0.02)), V.add(V.add(nb, V.mul(n, 0.045)), V.mul(u, 0.035)), V.add(V.add(nb, V.mul(n, -0.045)), V.mul(u, 0.035)), V.add(nb, V.mul(n, -0.02))]);
    pen.g.fillStyle = pen.col('#9EA2A6'); pen.g.fill(pen.path(head, 0.3, 510));
    [-0.033, -0.011, 0.011, 0.033].forEach(o2 => pen.line([V.add(V.add(nb, V.mul(n, o2)), V.mul(u, 0.034)), V.add(b, V.mul(n, o2 * 0.9))], pen.col('#9EA2A6'), 0.01, 1));
    pen.line([V.add(a, V.mul(n, 0.008)), V.add(nb, V.mul(n, 0.008))], pen.lit('#C8CCD0', 1), 0.008, 0.8);
    if (twirl) { const tw = pen.blob([V.add(b, [-0.08, -0.1]), V.add(b, [0.06, -0.12]), V.add(b, [0.08, -0.02]), V.add(b, [0.015, 0.035]), V.add(b, [-0.07, 0])]); const tp = pen.piece(tw, pen.col('#B0502F'), { seed: 511, kind: 'paper', tex: 0.6, lift: [0.008, 0.015] });
      [[-0.06, -0.08, 0.06, -0.04], [-0.055, -0.035, 0.065, 0.005]].forEach(([x0, y0, x1, y1]) => pen.line([V.add(b, [x0, y0]), V.add(b, [0, y0 - 0.03]), V.add(b, [x1, y1])], pen.col('#EEC47C'), 0.011, 0.85)); }
  }
  function panPiece(pen, c, rx, ry, handleTo) {
    const hd = pen.poly([[c[0] - rx + 0.06, c[1] - 0.025], [handleTo[0], handleTo[1] - 0.03], [handleTo[0], handleTo[1] + 0.035], [c[0] - rx + 0.06, c[1] + 0.03]]);
    const hp = pen.piece(hd, pen.col('#1E1A1C'), { seed: 520, kind: 'card', tex: 0.4, lift: [0.015, 0.03] }); pen.shade(hp, '#4A4044', { lit: 0.012, core: 0 });
    const rim = pen.piece(pen.ell(c[0], c[1], rx, ry, -0.03), pen.col('#2A2628'), { seed: 521, kind: 'card', tex: 0.5, lift: [0.03, 0.05] }); pen.shade(rim, '#6A5E58', { lit: 0.018, core: 0 });
    pen.piece(pen.ell(c[0], c[1] + 0.01, rx - 0.05, ry - 0.03, -0.03), pen.col('#171416'), { seed: 522, kind: 'card', tex: 0.4, lift: false });
    pen.piece(pen.ell(c[0] + 0.01, c[1] + 0.035, rx - 0.09, ry - 0.06, -0.03), pen.col('#2E2A2C'), { seed: 523, kind: 'card', tex: 0.5, lift: false });
    const food = pen.blob([[c[0] - rx * 0.72, c[1] + 0.05], [c[0] - rx * 0.45, c[1] - 0.05], [c[0] + 0.03, c[1] - 0.075], [c[0] + rx * 0.56, c[1] - 0.02], [c[0] + rx * 0.74, c[1] + 0.05], [c[0] + rx * 0.34, c[1] + 0.12], [c[0] - rx * 0.4, c[1] + 0.12]]);
    const fp = pen.piece(food, pen.col('#A2452C'), { seed: 524, kind: 'paper', tex: 0.6, lift: [0.006, 0.012] });
    pen.clip(fp); const r = rng('pasta'); for (let i = 0; i < 26; i++) { const x = c[0] - rx * 0.75 + r() * rx * 1.5, y = c[1] - 0.08 + r() * 0.2; pen.line([[x, y], [x + 0.06, y - 0.02 + r() * 0.04], [x + 0.11, y + r() * 0.03 - 0.015]], r() < 0.55 ? pen.col('#EEC47C') : pen.col('#6E2416'), 0.012, 0.8); } pen.unclip();
  }

  // ================================================================ poses
  // A pose turns p into a figure: {ops, info, rot?, costume}. Every pose takes p.x, p.y (world px of the point between his or her
  // eyes), p.s (px per head height), p.flip (mirror: face the other way), p.light, p.face ({yaw, pitch, lids, gaze, mouth, ...}
  // over the pose's own), p.t (seconds, on twos: the breath and the blinks), p.costume.
  const twosOr = t => t == null ? null : twos(t);
  function faceOf(p, base, seed) {
    const f = Object.assign({}, base || {}, p.face || {});
    if (p.t != null && p.blink !== false && !(p.face && p.face.lids != null && p.face.lids < 0.2)) { const b = RIG.blink(p.t, seed || 3); if (b < 1) f.lids = (f.lids == null ? 0.75 : f.lids) * b; }
    return f;
  }
  const lerpPt = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const toFig = (p, w) => [(w[0] - p.x) / p.s * (p.flip ? -1 : 1), (w[1] - p.y) / p.s];       // a world point into figure units
  const POSES = { him: {}, her: {}, coworker: {} };
  RIG.POSES = POSES;

  // ---------------------------------------------------------------- him
  // standing, the arms easy (any costume)
  // the back views (view: 'back'): the camera behind him. p.tau turns the body a little (0.2: a sliver of his left side); the head's
  // own yaw is about PI (p.face.yaw: PI - 0.4 shows the line of his cheek). Arms reaching forward (keys, the phone at his chest) are
  // hidden by his back, their elbows showing; an arm up to the bus rail shows over his shoulder.
  function backView(who, p, costume, d) {
    return person({ who, costume, back: true, tau: Math.PI - (p.tau == null ? d.tau : p.tau), lean: p.lean || d.lean || 0, shrug: p.shrug || d.shrug || 0, tilt: p.tilt || 0,
      head: faceOf(p, d.face, 3), arms: d.arms, legs: d.legs, crop: p.crop == null ? d.crop : p.crop, extra: d.extra });
  }
  POSES.him.stand = p => {
    if (p.view === 'back') return backView('him', p, p.costume || 'sweater', { tau: 0.2, face: { yaw: Math.PI - 0.3, pitch: 0.05, lids: 0.7 },
      arms: { L: p.armL || { a1: -0.07, a2: 0.12, hand: 'relax' }, R: p.armR || { a1: -0.06, a2: 0.1, hand: 'relax' } }, legs: p.legs || {} });
    const r = person({ who: 'him', costume: p.costume || 'sweater', tau: p.tau == null ? 0.25 : p.tau, lean: p.lean || 0, shrug: p.shrug, head: faceOf(p, { yaw: 0.2, lids: 0.7 }, 3),
      arms: { L: p.armL || { a1: -0.07, a2: 0.12, hand: 'relax' }, R: p.armR || { a1: -0.06, a2: 0.1, hand: 'relax' } }, legs: p.legs || {}, crop: p.crop });
    return r;
  };
  // standing with the bag held low in front, from underneath, thumb on the broken zip; head bowed, shoulders a little in (Q09, Q10)
  // turn a hand partly toward its 2D forearm (a forearm coming at the camera is foreshortened: turning it fully points the hand wrong)
  function partRot(E, W, fdir, flip, k) { const d = V.sub(E, W), d2 = flip ? [-d[0], d[1]] : d; let a = Math.atan2(d2[1], d2[0]) - Math.atan2(fdir[1], fdir[0]); a = Math.atan2(Math.sin(a), Math.cos(a)); return (flip ? -1 : 1) * a * k; }
  // hands: 2 (default) the bag held low in front in both hands; 1: in one hand from underneath (the other arm easy). The holding hand
  // is palm up under the bag's end, the bag over it, then the same hand's thumb (alone) over the bag's top on the broken zip
  POSES.him.bag = p => {
    const back = p.view === 'back'; const z = p.zip || 0; const two = !back && (p.hands == null ? 2 : p.hands) >= 2;
    const bagC = p.bagAt ? toFig(p, p.bagAt) : back ? [1.2, 1.55] : two ? [0.3, 2.86] : [0.62, 2.95];
    const hold = { type: 'paper', key: 'bagprop' + kq([bagC]), box: [bagC[0] - 0.6, bagC[1] - 0.45, bagC[0] + 0.6, bagC[1] + 0.45], breath: 0.6, draw(pen) { bagShape(pen, bagC, 0.74); } };
    // his hand round the bag's screen-right end, its thumb along the zip; with two hands the other at the left end
    const Wr = [bagC[0] + 0.56, bagC[1] - 0.02], Wl = [bagC[0] - 0.56, bagC[1] - 0.02];
    const Er = back ? [0.75, 1.9] : [0.92, 2.36], El = [-0.72, 2.4];
    const armR = { E: Er, W: Wr, hand: 'bag', hp: { zip: z }, handAt: Wr, handRot: 0, flipHand: false, front: true, order: 2, prop: { before: hold } };
    const armL = back ? { to: [0.3, 2.5], bend: 1, hand: false, handless: true, front: true }
      : two ? { E: El, W: Wl, hand: 'bag', hp: { zip: 0.25 }, handAt: Wl, handRot: 0, front: true, order: 3 }
      : { a1: -0.06, a2: 0.12, hand: 'relax' };
    const r = person({ who: 'him', costume: p.costume || 'sweater', tau: back ? 2.6 : (p.tau == null ? 0.45 : p.tau), back, lean: 0.06, shrug: 0.25, head: faceOf(p, back ? { yaw: 1.45, pitch: 0.25, roll: 0.78, lids: 0.3, gaze: [0, 0.7] } : { yaw: 0.35, pitch: 0.42, lids: 0.32, gaze: [0, 0.6] }, 3),
      arms: { L: armL, R: armR }, legs: p.legs || { stance: 0.1 }, crop: p.crop });
    r.info.bag = bagC; r.info.zip = V.add(bagC, [0.15, -0.18]); return r;
  };
  // at the door: one hand on the door's edge (p.edge, world px), tightening (p.tight); the other arm easy (Q08)
  POSES.him.door = p => {
    const edge = p.edge ? toFig(p, p.edge) : [1.25, 1.75];
    const r = person({ who: 'him', costume: p.costume || 'sweater', tau: p.tau == null ? 0.3 : p.tau, lean: p.lean || 0, head: faceOf(p, { yaw: 0.15, lids: 0.68 }, 3),
      arms: { L: { a1: -0.06, a2: 0.12, hand: 'relax' }, R: { to: edge, bend: -1, hand: 'door', hp: { tight: p.tight || 0, clip: null }, front: true } }, legs: p.legs || {}, crop: p.crop });
    r.info.edge = edge; return r;
  };
  // standing on the bus: one hand up on the rail, the phone in the other at his chest, earbuds in (Q05)
  POSES.him.bus = p => {
    const sway = p.sway || 0; const rail = p.rail ? toFig(p, p.rail) : [-0.55, -1.2];
    const buds = { type: 'live', draw(c, toW, s, out) { const hd = out.heads.head; if (!hd) return; const g = targetOf(c, p); [hd.earL, hd.earR].forEach((e, i) => { const vis = i === 0 ? hd.M[2][0] < 0.2 : hd.M[2][0] > -0.2; if (!vis) return; g.fillStyle = '#E6E0D4'; g.beginPath(); g.ellipse(e[0], e[1] + s * 0.03, s * 0.035, s * 0.03, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(e[0] + s * 0.01, e[1] + s * 0.045, s * 0.03, s * 0.012, 0, 0, 7); g.fill(); }); } };
    if (p.view === 'back') return backView('him', p, p.costume || 'shirt', { tau: 0.15, lean: sway, face: { yaw: Math.PI - 0.25, pitch: 0.32, lids: 0.6, gaze: [0, 0.5] },
      arms: { L: { to: rail, bend: -1, hand: 'railBack' }, R: { E: [0.72, 2.3], W: [0.2, 2.05], handless: true, hand: false, front: true } }, legs: p.legs || { stance: 0.16 }, extra: { afterHead: [buds] } });
    const r = person({ who: 'him', costume: p.costume || 'shirt', tau: p.tau == null ? 0.2 : p.tau, lean: sway, tilt: sway * 2, head: faceOf(p, { yaw: 0.15, pitch: 0.3, lids: 0.6, gaze: [0.1, 0.5] }, 3),
      arms: { L: { to: rail, bend: -1, hand: 'rail' }, R: { E: [0.7, 2.35], W: [0.2, 2.05], hand: 'thumb', hp: { flip: true, reach: p.thumb == null ? 0.4 : p.thumb, over: 'thumb' }, front: true } }, legs: p.legs || { stance: 0.16 }, crop: p.crop, extra: { afterHead: [buds] } });
    r.info.phone = [0.2, 1.8]; r.phoneHand = 'R'; return r;
  };
  // eating from the pan at the counter, the fork in the other hand; fork 0 (over the pan) .. 1 (at his mouth) (Q06, B2)
  POSES.him.counter = p => {
    // measured from B2: the sleeves hang to the cuffs, the forearms come at us, foreshortened; the pan at his chest by its handle
    const fk = clamp(p.fork || 0, 0, 1); const PAN = [0.1, 1.88];
    // fork 0: B2's cheat (the sleeve hangs to its cuff, the fist above it); fork 1: the forearm up from the elbow, the tines at his lips
    const fHand = lerpPt([0.93, 1.66], [0.32, 0.8], fk), fRot = -0.53 * fk, fW = lerpPt([0.95, 1.86], [0.45, 0.97], fk), fE = lerpPt([0.98, 1.5], [1.05, 1.7], fk);
    const forkTop = lerpPt(V.add(fHand, [-0.02, -0.3]), V.add(fHand, [0.14, 0.06]), fk), forkTip = lerpPt(V.add(fHand, [-0.4, 0.22]), [0.04, 0.38], fk);
    const pan = { type: 'paper', key: 'pan', box: [PAN[0] - 0.95, PAN[1] - 0.35, PAN[0] + 0.8, PAN[1] + 0.35], breath: 0.7, draw(pen) { panPiece(pen, PAN, 0.61, 0.2, [-0.66, 1.9]); } };
    const fk2 = kq([forkTop, forkTip]);
    const forkA = { type: 'paper', key: 'forkA' + fk2, box: bboxOf([forkTop, forkTip], 0.25), breath: 0.7, draw(pen) { forkPiece(pen, forkTop, forkTip, true); } };
    const forkB = { type: 'paper', key: 'forkB' + fk2, box: bboxOf([forkTop, forkTip], 0.25), breath: 0.7, draw(pen) { forkPiece(pen, V.lerp(forkTop, forkTip, 0.5), forkTip, true); } };
    const r = person({ who: 'him', costume: p.costume || 'shirt', tau: p.tau == null ? 0.2 : p.tau, crop: p.crop == null ? 2.45 : p.crop, untucked: true, head: faceOf(p, { yaw: 0.72, pitch: 0.48, lids: 0.82, gaze: [0.22, 0.32], brows: 0.35 }, 3),
      arms: { L: { E: [-0.84, 1.52], W: [-0.8, 1.92], hand: 'pan', handAt: [-0.68, 1.884], front: true, order: 1 }, R: { E: fE, W: fW, hand: 'fork', handAt: fHand, handRot: fRot, flipHand: true, front: true, order: 2, prop: { before: forkA, after: forkB } } },
      legs: false, extra: { afterTorso: [pan] } });
    r.info.pan = PAN; r.info.fork = forkTip; return r;
  };
  // at the basin, brushing (seen in the mirror): brush is the stroke's phase, foam 0..1 (Q02, Q07)
  POSES.him.basin = p => {
    const ph = p.brush == null ? 0 : p.brush, foam = p.foam == null ? 1 : p.foam, dx = Math.sin(ph * Math.PI * 2) * 0.05;
    const W0 = [-0.42 + dx, 0.5];
    const brush = { type: 'paper', key: 'brush' + kq([W0]), box: [W0[0] - 0.5, 0.2, W0[0] + 0.5, 1.1], breath: 1, draw(pen) {
      const a = V.add(W0, [0.1, 0.0]), b = [0.0 + dx * 0.4, 0.32]; pen.line([a, b], pen.col('#4A6E9E'), 0.05, 1); pen.line([V.add(a, [0.01, -0.012]), V.add(b, [0.01, -0.012])], pen.lit('#7A9CC8', 1), 0.012, 0.8); } };
    const froth = { type: 'live', draw(c, toW, s, out) { const hd = out.heads.head; if (!hd || foam <= 0) return; const g = targetOf(c, p); const m = hd.mouth; const r = rng('foam' + Math.round(ph * 4));
      g.save(); g.fillStyle = '#E6E2D8'; for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + r(); const rr = s * (0.016 + 0.018 * r()) * foam; g.globalAlpha = 0.9; g.beginPath(); g.ellipse(m[0] + Math.cos(a) * s * 0.06 * (0.7 + r() * 0.5), m[1] + Math.sin(a) * s * 0.018 + s * 0.005, rr, rr * 0.8, 0, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(120,120,128,0.35)'; g.beginPath(); g.ellipse(m[0] + s * 0.02, m[1] + s * 0.03, s * 0.05 * foam, s * 0.008, 0, 0, 7); g.fill(); g.restore(); } };
    const r = person({ who: 'him', costume: p.costume || 'tee', tau: p.tau == null ? -0.08 : p.tau, lean: 0.12, crop: p.crop == null ? 2.9 : p.crop, head: faceOf(p, { yaw: -0.05, pitch: 0.12, lids: 0.6, gaze: [0, 0.1], mouth: 1 }, 3),
      arms: { L: { E: [-0.8, 1.85], W: W0, hand: 'brush', front: true, order: 2, prop: { after: brush } }, R: { a1: 0.05, a2: 0.1, hand: 'relax' } }, legs: false, extra: { afterHead: [froth] } });
    return r;
  };
  // at a desk: sitting, hands on the keyboard; reach 0..1 sends the near hand to the phone (p.phone, world px) (Q03)
  POSES.him.desk = p => {
    const ph = p.phone ? toFig(p, p.phone) : [1.35, 2.35]; const rc = clamp(p.reach || 0, 0, 1);
    const kR = [0.38, 2.38], kL = [-0.35, 2.4];
    if (p.view === 'back') {
      // from behind at the desk: his arms forward to the keyboard (hidden), elbows out; reach sends his right hand out to the phone
      const r2 = backView('him', p, p.costume || 'shirt', { tau: 0.12, lean: 0.12, crop: 3.4, face: { yaw: Math.PI - 0.2, pitch: 0.12, lids: 0.62 },
        arms: { L: { E: [-0.98, 2.2], W: [-0.42, 2.45], hand: false, handless: true, front: true }, R: rc > 0.05 ? { E: lerpPt([0.98, 2.2], [1.3, 2.1], rc), W: lerpPt([0.42, 2.45], ph, rc), hand: 'flat', hp: { flip: true, over: rc > 0.9 ? 'all' : null }, over: true } : { E: [0.98, 2.2], W: [0.42, 2.45], hand: false, handless: true, front: true } }, legs: false });
      r2.info.phone = ph; return r2;
    }
    const r = person({ who: 'him', costume: p.costume || 'shirt', tau: p.tau == null ? 0.3 : p.tau, lean: 0.1, crop: p.crop == null ? 3.4 : p.crop, head: faceOf(p, { yaw: 0.3, pitch: 0.2, lids: 0.62, gaze: [0, 0.1] }, 3),
      arms: { L: { E: [-0.88, 2.25], W: kL, hand: 'keys', front: true }, R: { E: lerpPt([0.98, 2.3], [1.15, 2.05], rc), W: lerpPt(kR, V.add(ph, [-0.25, 0.05]), rc), hand: rc > 0.5 ? 'flat' : 'keys', hp: { flip: true, over: rc > 0.9 ? 'all' : null }, front: true } }, legs: false });
    r.info.phone = ph;
    return r;
  };
  // sitting on a step, forearms on his knees, the phone in both hands; tilt 0 (looking at it low) .. 1 (tilted to his chest) (Q04)
  POSES.him.step = p => {
    const tl = clamp(p.tilt || 0, 0, 1); const P0 = lerpPt([0.0, 2.3], [0.0, 1.75], tl);
    const tr = LEGS.him.trousers, shoe = LEGS.him.shoe;
    // seen from in front and a little below: the shins come down to the step below, the knees up at his belly, the thighs
    // foreshortened toward us; his forearms rest on them and the phone is between his hands
    const shins = { type: 'paper', key: 'stepshins', box: [-1.2, 2.2, 1.2, 5.2], breath: 0, draw(pen) {
      [-1, 1].forEach((sg, i) => { const K = [sg * 0.44, 2.5], A = [sg * 0.47, 4.35];
        const sh2 = pen.blob([[K[0] - 0.26, K[1]], [K[0] + 0.26, K[1]], [A[0] + 0.21, A[1], 1], [A[0] - 0.21, A[1], 1]]); const sp = pen.piece(sh2, pen.col(tr), { seed: 600 + i, tex: 0.55, lift: [0.02, 0.03] }); pen.shade(sp, tr, { lit: 0.05, core: 0.07 });
        pen.fold([[A[0] - 0.15, A[1] - 0.25], [A[0], A[1] - 0.2], [A[0] + 0.15, A[1] - 0.26]], tr, { w: 0.016, alpha: 0.45 });
        const ft = pen.blob([[A[0] - 0.25, A[1] - 0.06], [A[0] + 0.25, A[1] - 0.06], [A[0] + 0.3 + sg * 0.05, A[1] + 0.24, 1], [A[0] - 0.3 + sg * 0.05, A[1] + 0.24, 1]]); const fp = pen.piece(ft, pen.col(shoe), { seed: 604 + i, kind: 'card', tex: 0.45, lift: [0.02, 0.03] }); pen.shade(fp, shoe, { lit: 0.03, core: 0.04 }); });
    } };
    const knees = { type: 'paper', key: 'stepknees', box: [-1.2, 1.9, 1.2, 3.1], breath: 0, draw(pen) {
      [-1, 1].forEach((sg, i) => { const K = [sg * 0.44, 2.42]; const th = pen.blob([[K[0] - 0.36, K[1] + 0.25], [K[0] - 0.34, K[1] - 0.12], [K[0], K[1] - 0.3], [K[0] + 0.34, K[1] - 0.12], [K[0] + 0.36, K[1] + 0.25], [K[0], K[1] + 0.33]]);
        const tp2 = pen.piece(th, pen.col(i ? tr : mix(tr, '#000000', 0.08)), { seed: 602 + i, tex: 0.55, lift: [0.025, 0.045] }); pen.bands(tp2, tr, { center: [0, 2.2], size: 1.2, seed: 605 }); pen.shade(tp2, tr, { lit: 0.05, core: 0.06 });
        pen.fold([[K[0] - 0.2, K[1] + 0.12], [K[0], K[1] + 0.2], [K[0] + 0.2, K[1] + 0.1]], tr, { w: 0.02, alpha: 0.5 }); });
    } };
    const r = person({ who: 'him', costume: p.costume || 'shirt', tau: p.tau == null ? 0 : p.tau, lean: 0.3, shrug: 0.2, crop: 2.55, head: faceOf(p, { yaw: 0, pitch: lerp(0.55, 0.32, tl), lids: 0.55, gaze: [0, 0.5] }, 3),
      arms: { L: { E: [-0.66, 2.18], W: [-0.12, P0[1] + 0.12], hand: 'thumb', hp: { reach: p.thumb == null ? 0.4 : p.thumb, tap: p.tap || 0, over: 'thumb' }, front: true, order: 2 }, R: { E: [0.66, 2.2], W: [0.14, P0[1] + 0.16], hand: 'relax', hp: { close: 0.8, flip: true }, front: true, order: 1 } },
      legs: false, extra: { afterTorso: [shins, knees] } });
    r.info.phone = P0; r.phoneHand = 'L'; return r;
  };
  // sitting on the couch, the phone at his ear (Q11)
  POSES.him.sit = p => {
    const seat = { type: 'paper', key: 'sitlegs' + (p.costume || 'sweater'), box: [-1.2, 2.8, 2.4, 6.0], breath: 0, draw(pen) {
      const tr = LEGS.him.home, sock = LEGS.him.sock;
      [-1, 1].forEach((sg, i) => { const H0 = [sg * 0.3 + 0.1, 3.25], K = [sg * 0.35 + 1.1, 3.55], A = [sg * 0.3 + 1.05, 5.3];
        const lp = limbPts(H0, K, A, 0.72, 0.5, 0.4); const sp = pen.piece(pen.blob(lp.pts), pen.col(i ? tr : mix(tr, '#000000', 0.12)), { seed: 610 + i, tex: 0.55, lift: [0.02, 0.03] }); pen.shade(sp, tr, { lit: 0.05, core: 0.07 });
        const ft = pen.blob([[A[0] - 0.2, A[1] - 0.05], [A[0] + 0.2, A[1] - 0.05], [A[0] + 0.42, A[1] + 0.2, 1], [A[0] - 0.22, A[1] + 0.2, 1]]); const fp = pen.piece(ft, pen.col(sock), { seed: 612 + i, tex: 0.6, lift: [0.015, 0.02] }); pen.shade(fp, sock, { lit: 0.03, core: 0.03 }); });
    } };
    const r = person({ who: 'him', costume: p.costume || 'sweater', tau: p.tau == null ? 0.35 : p.tau, lean: 0.15, crop: 3.3, head: faceOf(p, { yaw: 0.25, pitch: 0.25, lids: 0.45, gaze: [0, 0.4] }, 3),
      arms: { L: { E: [-0.66, 1.95], W: [-0.55, 0.62], hand: 'ear', hp: { over: 'all' }, front: true }, R: { E: [0.85, 2.35], W: [0.75, 3.1], hand: 'relax', hp: { flip: true } } }, legs: false, extra: { afterTorso: [seat] } });
    r.info.phone = [-0.43, 0.2]; return r;
  };
  // walking (profile), the arms swinging; phase 0..1, carry: 'bag' (the makeup bag in the near hand)
  function walkOps(who, p, costume) {
    const ph = ((p.phase || 0) % 1 + 1) % 1, a = Math.sin(ph * Math.PI * 2), b = Math.cos(ph * Math.PI * 2);
    const Pp = PROP[who]; const stride = who === 'her' ? 0.62 : 0.72;
    const lift = Math.abs(b) * -0.05;
    const legJ = sg => { const s2 = sg * a; const H0 = [0.05, Pp.hipY]; const foot = [0.12 + s2 * stride, Pp.ankY - Math.max(0, -sg * b) * 0.22]; const K = [lerp(H0[0], foot[0], 0.5) + 0.12 + Math.max(0, -sg * b) * 0.22, Pp.kneeY - Math.max(0, -sg * b) * 0.12]; return [H0, K, foot]; };
    const carry = p.carry === 'bag';
    const swing = (sg) => ({ a1: -sg * a * 0.32, a2: -sg * a * 0.32 - 0.25, hand: 'relax', hp: {} });
    const armN = carry ? { E: [0.02 - a * 0.1, Pp.shY + Pp.l1 * 0.98], W: [0.05 - a * 0.18, Pp.shY + Pp.l1 + Pp.l2 * 0.96], hand: 'carry' } : swing(1);
    const r = person({ who, costume, tau: 1.25, head: faceOf(p, { yaw: 1.05, pitch: 0.12, lids: 0.68 }, who === 'her' ? 5 : 3), headAt: [0, lift],
      arms: { L: Object.assign(armN, { front: true, order: 3 }), R: Object.assign(swing(-1), { behind: true }) },
      legs: { joints: { far: legJ(-1), near: legJ(1) } }, extra: carry ? { end: [{ type: 'paper', key: 'carrybag' + kq([a]), box: [-1, 3.2, 1.2, 5], breath: 0, draw(pen) { const W2 = [0.05 - a * 0.18, Pp.shY + Pp.l1 + Pp.l2 * 0.96]; bagShape(pen, [W2[0] + 0.05, W2[1] + 0.48], 0.66); } }] } : null });
    return r;
  }
  POSES.him.walk = p => walkOps('him', p, p.costume || 'sweater');
  // lying on his side, his head on the pillow at the left, facing us (B1). arm: 'rest' (the hand over the phone at p.phone, world
  // px; reach 0..1 brings it there), 'hold' (the phone up in front of his face), 'tuck'. cover: the duvet's colour, or false (the
  // couch: the whole body, in the sweater)
  POSES.him.lie = p => {
    const cover = p.cover === undefined ? '#29324B' : p.cover; const costume = p.costume || (cover ? 'tee' : 'sweater');
    const rot = p.rot == null ? -1.42 : p.rot; const cr = Math.cos(-rot), sr = Math.sin(-rot);
    const sxL = p.sx || (cover ? 0.56 : 0.72); const fromWorld = w => { const dx = (w[0] - p.x) / p.s, dy = (w[1] - p.y) / p.s; const fx = dx * cr - dy * sr, fy = dx * sr + dy * cr; return [fx / sxL * (p.flip ? -1 : 1), fy]; };
    const phone = p.phone ? fromWorld(p.phone) : [-0.9, 0.45]; const rc = clamp(p.reach == null ? 1 : p.reach, 0, 1);
    const armMode = p.arm || 'rest';
    let armR;
    // B1: the wrist above and behind the phone's top edge, the forearm coming from above, the fingers draped down its back
    if (armMode === 'rest') { const W2 = lerpPt([-0.75, 1.05], V.add(phone, [0.56, 0.1]), rc), E2 = lerpPt([-0.05, 1.75], V.add(phone, [1.45, 0.72]), rc); armR = { E: E2, W: W2, hand: rc > 0.4 ? 'rest' : 'relax', flipHand: true, hp: rc > 0.4 ? { over: rc > 0.9 ? 'all' : null } : { close: 0.6 }, front: true, order: 2 }; }
    else if (armMode === 'hold') armR = { E: [0.2, 2.05], W: [-0.95, 0.75], hand: 'thumb', hp: { reach: p.thumb == null ? 0.4 : p.thumb, tap: p.tap || 0, over: 'thumb' }, front: true, order: 2 };
    else armR = { E: [0.25, 2.1], W: [-0.25, 1.4], hand: 'relax', hp: { close: 0.6 }, front: true, order: 2 };
    const legs = { joints: { far: [[0.35, 3.3], [-0.75, 4.35], [-0.35, 5.75]], near: [[-0.2, 3.3], [-1.05, 4.5], [-0.75, 5.85]] } };
    const extra = { end: [] };
    let duvetOps = null;
    if (cover) {
      // the duvet over him: his shape under it (shoulder, hip, the knees drawn up), its edge turned over his shoulder
      const body = { type: 'paper', key: 'duvet' + cover, box: [-2.2, 0.6, 2.4, 7.5], breath: 0.3, draw(pen) {
        const sh = pen.blob([[0.9, 1.0], [1.15, 1.9], [1.1, 3.0], [1.0, 3.6], [0.4, 4.3], [0.3, 5.4], [0.2, 6.6], [-0.4, 7.3], [-1.6, 7.0], [-1.95, 5.6], [-1.8, 4.3], [-1.3, 3.4], [-1.35, 2.2], [-1.2, 1.25], [-0.4, 0.95]]);
        const pth = pen.piece(sh, pen.col(cover), { seed: 640, kind: 'cloth', tex: 0.6, lift: [0.06, 0.03], liftBlur: 0.08, liftAlpha: 0.7 }); pen.shade(pth, cover, { lit: 0.08, core: 0.1 });
        [[[0.6, 2.2], [0.1, 2.7], [-0.5, 2.8]], [[0.5, 4.0], [-0.1, 4.6], [-0.4, 5.2]], [[-0.2, 1.6], [-0.7, 2.1]], [[-0.9, 3.4], [-1.3, 3.9]]].forEach(f => pen.fold(f, cover, { w: 0.04, alpha: 0.6 }));
      } };
      const fold = { type: 'paper', key: 'duvetfold' + cover, box: [-1.6, 0.6, 1.6, 2.2], breath: 0.3, draw(pen) {
        const sh = pen.blob([[1.0, 0.98], [1.18, 1.35], [1.0, 1.7], [0.45, 1.8], [-0.4, 1.72], [-1.25, 1.6], [-1.3, 1.3], [-0.8, 1.1], [0.0, 1.02]]);
        const pth = pen.piece(sh, pen.lit(cover, 0.35), { seed: 642, kind: 'cloth', tex: 0.6, lift: [0.04, 0.02], liftBlur: 0.06, liftAlpha: 0.7 }); pen.shade(pth, cover, { lit: 0.06, core: 0.05 });
      } };
      duvetOps = { body, fold };
      extra.afterTorso = [body];
    }
    const r = person({ who: 'him', costume, tau: p.tau == null ? 0.2 : p.tau, lean: 0, head: faceOf(p, { yaw: -0.42, pitch: 0.05, roll: 0.06, lids: 0.3, smile: 0.3, gaze: [0, 0.3], neck: 0.55 }, 3),
      arms: { L: { E: [-0.35, 2.0], W: [-0.55, 2.9], hand: cover ? false : 'relax', hp: { close: 0.6 }, behind: true }, R: armR },
      legs: cover ? false : legs, extra });
    if (duvetOps) {
      // the arm comes out from under the duvet's turned edge: put the fold after the arm's sleeve but before its hand
      const i = r.ops.findIndex(o => o && o.type === 'paper' && /armR.*,ts$/.test(o.key)); if (i >= 0) r.ops.splice(i + 1, 0, duvetOps.fold); else r.ops.push(duvetOps.fold);
    }
    r.rot = rot; r.sx = p.sx || (cover ? 0.56 : 0.72); r.info.phone = phone; return r;
  };


  // ---------------------------------------------------------------- the couch: sitting, lying along it, lying down, getting up
  /* POSES.him.couch: u 0 (sitting) .. 1 (lying on his side along the couch, facing us, knees bent); rise 0..1 (from sitting to standing).
     Lying down is u 0 -> 1; getting up is u 1 -> 0, then rise 0 -> 1 (then cut or dissolve to 'stand' at fig.info.head).
     The hip stays on the seat (p.hip, world px: the seat point under his hip; give it for transitions); the upper body turns about it
     and the legs are cut in the world's frame, bending to keep his feet inside the couch (p.fit: world x of the far arm's inner face).
     p.dir: 1 his feet to screen right (lying, his head to the left), -1 the other way. p.arm: 'rest' (hands easy; lying: his hand
     over the phone at p.phone, world px, beside his face), 'hold' (the phone up in front of his face, texting), 'ear' (sitting: the
     phone at his ear), 'lap' (sitting: the phone in his lap), 'tuck'. p.seat: heads from the hip down to the floor (1.9). p.lie: the
     body's angle lying (-1.48; less tilts his head up onto the couch's arm). */
  function couchPose(who, p) {
    const s = p.s, dir = p.dir || (p.flip ? -1 : 1), flip = dir < 0;
    const u = clamp(p.u == null ? 1 : p.u, 0, 1), rise = u > 0.001 ? 0 : clamp(p.rise || 0, 0, 1);
    const e = ss01(0, 1, u), er = ss01(0, 1, rise), seatH = p.seat == null ? 1.9 : p.seat;
    // staged, never one plank: lying down, the torso tips first (et), bending at the waist, his bottom hand goes to the seat to take
    // his weight, and the legs swing up after it (el), the knees lifting; getting up runs the same path back (the legs come off
    // first, then he pushes up). Rising, he leans over his feet, hands on his knees, and comes upright.
    const et = ss01(0.1, 1, u), el = ss01(0.38, 0.95, u);
    const theta = lerp(-0.08, p.lie == null ? -1.48 : p.lie, et) + 0.42 * Math.sin(Math.PI * er) + 0.08 * er;
    const thW = theta * dir;
    // where the hip is: given (transitions), or from the head (p.x, p.y) for a held pose
    const hipUp = 1.58 * er, hipFwd = 0.3 * er;
    let H;
    if (p.hip) H = [p.hip[0] + hipFwd * dir * s, p.hip[1] - hipUp * s];
    else H = [p.x - 3.3 * Math.sin(thW) * s, p.y + 3.3 * Math.cos(thW) * s];
    const seatPt = [H[0] - hipFwd * dir * s, H[1] + hipUp * s];
    // the upper body: a person cropped at the hip, turned about the hip
    const origin = [H[0] + 3.3 * Math.sin(thW) * s, H[1] - 3.3 * Math.cos(thW) * s];
    const cr = Math.cos(thW), sr = Math.sin(thW);
    const toF = w => { const dx = w[0] - origin[0], dy = w[1] - origin[1]; const fx = (dx * cr + dy * sr) / s, fy = (-dx * sr + dy * cr) / s; return [flip ? -fx : fx, fy]; };
    const arm = p.arm || 'rest';
    // arm keys in figure units: sitting, lying (and standing for the rise)
    const sitL = arm === 'ear' ? { E: [-0.66, 1.95], W: [-0.55, 0.62], hand: 'ear', hp: { over: 'all' } } : arm === 'lap' || arm === 'hold' ? { E: [-0.75, 2.25], W: [-0.1, 2.85], hand: 'thumb', hp: { reach: 0.3, over: 'thumb' } } : { E: [-0.82, 2.22], W: [-0.5, 3.0], hand: 'relax', hp: { close: 0.4 } };
    // lying: the phone's spot is beside his face on the seat (figure [-0.62, 0.38]); his top arm (R) comes over from his shoulder,
    // the upper arm foreshortened toward us, the forearm across his collar, the hand laid over the phone. Holding the phone up
    // (texting) is the bottom arm's forearm, out from under him in front of his face.
    const spot = [-0.62, 0.38], ph = p.phone ? toF(p.phone) : spot;
    let lieL, lieR;
    if (arm === 'hold' || arm === 'lap' || arm === 'ear') lieL = { E: [-0.75, 2.1], W: [-1.0, 0.8], hand: 'thumb', hp: { reach: 0.3, over: 'thumb' } };
    else lieL = { E: [-0.52, 1.85], W: [-0.62, 1.25], hand: false, handless: true, behind: true };
    const standL = { E: [-0.78, 2.35], W: [-0.7, 3.45], hand: 'relax', hp: { close: 0.3 } };
    lieR = arm === 'rest' || arm === 'tuck' ? (arm === 'rest' ? { E: [0.86, 0.9], W: V.add(ph, [0.62, 0.1]), hand: 'rest', flipHand: true, hp: { over: 'all' } } : { E: [0.8, 1.9], W: [-0.2, 1.4], hand: 'relax', hp: { close: 0.6 } })
      : { E: [0.8, 2.25], W: [0.5, 3.2], hand: 'relax', hp: { close: 0.4 } };
    const sitR = { E: [0.82, 2.3], W: [0.7, 3.05], hand: 'relax', hp: { close: 0.4 } }, standR = { E: [0.76, 2.35], W: [0.68, 3.45], hand: 'relax', hp: { close: 0.3 } };
    const mixArm = (a, b, k, fr) => Object.assign({}, k < 0.5 ? a : b, { E: lerpPt(a.E, b.E, k), W: lerpPt(a.W, b.W, k) }, fr ? { front: true } : {});
    // sitting three-quarter, his right arm is the far one (behind him); lying, it is the top arm, over his body
    let aL = rise > 0 ? mixArm(sitL, standL, er, true) : mixArm(sitL, lieL, e, !lieL.behind || e < 0.5), aR = rise > 0 ? mixArm(sitR, standR, er, false) : mixArm(sitR, lieR, e, e > 0.5);
    if (aL.behind && e < 0.5) delete aL.behind;
    aL.order = 1; aR.order = 2;
    // the legs (world-aligned frame at the hip, x toward his feet, y down)
    const fitX = p.fit != null ? (p.fit - H[0]) * dir / s - 0.45 : 9;
    let Kl = [1.22, 0.42], Al = [2.18, 0.1];
    if (Al[0] > fitX) { const k = clamp((Al[0] - fitX) / 0.9, 0, 1); Al = [Math.max(1.45, fitX), lerp(0.1, -0.05, k)]; Kl = [lerp(1.22, 1.05, k), lerp(0.42, 0.62, k)]; }
    const Ks = [1.05, -0.04], As = [1.0, seatH - 0.28];
    let K, A, footDir;
    if (rise > 0) { const Aw = [As[0] - hipFwd, As[1] + hipUp]; const r2 = ik([0, 0], Aw, 1.78, 1.5, -1); K = r2.E; A = Aw; footDir = [1, 0.05]; }
    else { K = V.add(lerpPt(Ks, Kl, el), [-0.12 * Math.sin(Math.PI * el), -0.3 * Math.sin(Math.PI * el)]); A = V.add(lerpPt(As, Al, el), [0, -0.5 * Math.sin(Math.PI * el)]); footDir = V.norm(lerpPt([1, 0.05], [0.3, 1], el)); }
    // the arms that take his weight: the bottom hand flat on the seat by his hip while he tips (or sits up); rising, both on his knees
    const sup = ss01(0.08, 0.3, u) * (1 - ss01(0.78, 0.97, u));
    if (sup > 0.01) { const P = toF([H[0] - 0.95 * dir * s, H[1] + 0.05 * s]); aL = Object.assign({}, aL, { E: undefined, W: undefined, to: lerpPt(aL.W, P, sup), bend: -1, front: true, hand: sup > 0.45 ? 'flat' : aL.hand, hp: sup > 0.45 ? { close: 0.2 } : aL.hp }); delete aL.behind; delete aL.handless; }
    if (rise > 0) { const push = Math.sin(Math.PI * Math.min(1, er * 1.3)); if (push > 0.05) { const kw = [H[0] + K[0] * dir * s, H[1] + K[1] * s], kf = toF(kw);
      aL = Object.assign({}, aL, { E: undefined, W: undefined, to: lerpPt(aL.W, V.add(kf, [-0.25, -0.1]), push), bend: 1, hand: push > 0.4 ? 'flat' : aL.hand });
      aR = Object.assign({}, aR, { E: undefined, W: undefined, to: lerpPt(aR.W, V.add(kf, [0.1, -0.05]), push), bend: -1, hand: push > 0.4 ? 'flat' : aR.hand, hp: { flip: true }, front: true }); } }
    const lc = LEGS.him, tr = lc.home, sock = lc.sock;
    const legKey = 'couchlegs' + kq([K, A, footDir]) + (p.costume || 'sweater');
    const legs = { type: 'paper', key: legKey, box: bboxOf([[0, 0], K, A, V.add(A, V.mul(footDir, 0.5))], 0.7), breath: 0, draw(pen) {
      [[0, 1], [1, 0]].forEach(([far, i]) => {
        const off = far ? [0.08, -0.1] : [0, 0]; const H0 = V.add([0.05, 0], off), K0 = V.add(K, off), A0 = V.add(A, V.add(off, far ? [0.06, -0.04] : [0, 0]));
        const lp = limbPts(H0, K0, A0, 0.8, 0.52, 0.4); const col = far ? mix(tr, '#000000', 0.18) : tr;
        const pth = pen.piece(pen.blob(lp.pts), pen.col(col), { seed: 640 + i, kind: 'cloth', tex: 0.55, lift: [0.02, 0.03] }); pen.bands(pth, tr, { center: [0.8, 0], size: 1.6, seed: 642 }); pen.shade(pth, tr, { lit: 0.05, core: 0.07 });
        if (lp.bent) pen.fold([V.add(lp.innerPt, V.mul(lp.u1, -0.22)), lp.innerPt, V.add(lp.innerPt, V.mul(lp.u2, 0.18))], tr, { w: 0.02, alpha: 0.6 });
        // the knee's round, the fold behind it
        const kn = pen.piece(pen.ell(K0[0], K0[1], 0.27, 0.25, 0), pen.col(col), { seed: 644 + i, kind: 'cloth', tex: 0.5, lift: false }); pen.shade(kn, tr, { lit: 0.03, core: 0.03 });
        const fd = footDir, fn = [-fd[1], fd[0]];
        const ft = pen.blob([[...V.add(A0, V.mul(fn, -0.17)), 1], V.add(V.add(A0, V.mul(fd, 0.42)), V.mul(fn, -0.12)), V.add(A0, V.add(V.mul(fd, 0.5), V.mul(fn, 0.04))), [...V.add(A0, V.add(V.mul(fd, 0.36), V.mul(fn, 0.15))), 1], [...V.add(A0, V.mul(fn, 0.18)), 1]]);
        const fp = pen.piece(ft, pen.col(far ? mix(sock, '#000000', 0.15) : sock), { seed: 646 + i, kind: 'wool', tex: 0.6, lift: [0.015, 0.02] }); pen.shade(fp, sock, { lit: 0.03, core: 0.03 });
      });
      // the seat of the trousers round the hip, under the sweater's hem
      const hp = pen.piece(pen.ell(0.05, -0.02, 0.62, 0.5, 0), pen.col(tr), { seed: 648, kind: 'cloth', tex: 0.5, lift: [0.02, 0.03] }); pen.shade(hp, tr, { lit: 0.04, core: 0.05 });
    } };
    // the head stays nearer upright than the body while he tips (it leads the body down, and up again)
    const face = faceOf(p, { yaw: lerp(0.28, -0.42, et), pitch: lerp(0.25, 0.05, et), roll: lerp(0, 0.06, et) - (theta + 0.08) * 0.42 * Math.sin(Math.PI * et), lids: lerp(0.45, 0.32, e), gaze: [lerp(0.05, 0, e), lerp(0.4, 0.3, e)] }, 3);
    const up = person({ who: 'him', costume: p.costume || 'sweater', tau: lerp(0.35, 0.2, et), lean: 0.4 * Math.sin(Math.PI * et) + 0.25 * Math.sin(Math.PI * er), head: face, arms: { L: aL, R: aR }, legs: false, crop: 3.5, untucked: true });
    const parts = [{ x: H[0], y: H[1], flip, ops: [legs], breath: 0 }, { x: origin[0], y: origin[1], rot: thW, flip, ops: up.ops }];
    const spotW = (() => { const fx = flip ? -spot[0] : spot[0]; return [origin[0] + (fx * cr - spot[1] * sr) * s, origin[1] + (fx * sr + spot[1] * cr) * s]; })();
    const phone = arm === 'rest' && e > 0.5 ? (p.phone || spotW) : null;
    return { parts, phoneHand: (arm === 'ear' || arm === 'lap' || arm === 'hold') ? 'L' : null, worldInfo: { hip: H, seat: seatPt, head: origin, knee: [H[0] + K[0] * dir * s, H[1] + K[1] * s], feet: [H[0] + A[0] * dir * s, H[1] + A[1] * s], phone, phoneSpot: spotW } };
  }
  POSES.him.couch = p => couchPose('him', p);
  POSES.him.liedown = p => couchPose('him', Object.assign({}, p, { u: p.u == null ? 0 : p.u }));
  POSES.him.getup = p => { const g = clamp(p.u == null ? 0 : p.u, 0, 1); return couchPose('him', Object.assign({}, p, { u: g < 0.5 ? 1 - g * 2 : 0, rise: g < 0.5 ? 0 : (g - 0.5) * 2 })); };

  // ---------------------------------------------------------------- her
  POSES.her.stand = p => person({ who: 'her', costume: 'coat', tau: p.tau == null ? 0.3 : p.tau, head: faceOf(p, { yaw: 0.25, lids: 0.76 }, 5),
    arms: { L: p.armL || { a1: -0.06, a2: 0.12, hand: 'relax' }, R: p.armR || { a1: -0.05, a2: 0.1, hand: 'relax' } }, legs: p.legs || { stance: 0.08 }, crop: p.crop });
  // in the doorway: square to him, one hand on her strap, the other down (Q08)
  POSES.her.doorway = p => person({ who: 'her', costume: 'coat', tau: p.tau == null ? 0.08 : p.tau, head: faceOf(p, { yaw: 0.05, pitch: 0.04, lids: 0.76, gaze: [0, 0] }, 5),
    arms: { L: { to: [-0.12, 1.55], bend: 1, hand: 'strap', front: true }, R: { a1: -0.05, a2: 0.1, hand: 'relax' } }, legs: p.legs || { stance: 0.08 }, crop: p.crop });
  // just inside the door like a guest: coat on, both hands together on the strap at her waist; eyes travel (p.face) (Q08)
  POSES.her.guest = p => person({ who: 'her', costume: 'coat', tau: p.tau == null ? 0.42 : p.tau, head: faceOf(p, { yaw: 0.4, pitch: 0.05, lids: 0.74 }, 5),
    arms: { L: { to: [0.18, 2.45], bend: 1, hand: 'relax', hp: { close: 0.5 }, front: true, order: 2 }, R: { to: [0.42, 2.4], bend: -1, hand: 'relax', hp: { close: 0.6, flip: true }, front: true, order: 1 } }, legs: p.legs || { stance: 0.06, weight: 0.4 }, crop: p.crop });
  // the phone: hold 0 (up between them, the screen to him) .. 1 (turned back to her, studying it); nape 0..1 (her free hand rises to
  // the back of her neck, where her hair used to be); reach 0..1 (the trade: her arm out to him). Q09, Q10, B3
  POSES.her.phone = p => {
    const hold = clamp(p.hold == null ? 0 : p.hold, 0, 1), np = clamp(p.nape || 0, 0, 1), rch = clamp(p.reach || 0, 0, 1);
    const Wup = [1.05, 1.15], Wback = [0.62, 1.95], Wreach = [1.75, 2.0];
    let Wp = lerpPt(Wup, Wback, hold); Wp = lerpPt(Wp, Wreach, rch);
    const Ep = lerpPt(lerpPt([0.8, 2.12], [0.82, 2.4], hold), [1.25, 1.95], rch);
    // the nape arm: from hanging to up behind her head
    // the nape: the elbow comes up and forward (in front of her shoulder, at her chin), the hand goes back under the bob's hem
    const midN = [[0, [-0.86, 2.15], [-0.78, 3.15]], [0.45, [-1.12, 1.55], [-0.98, 0.98]], [1, [-0.86, 0.6], [-0.3, 0.36]]];
    const nk2 = i => { const a = midN[i], b2 = midN[i + 1], u = ss01(a[0], b2[0], np); return [lerpPt(a[1], b2[1], u), lerpPt(a[2], b2[2], u)]; };
    const [En, Wn] = np <= 0.45 ? nk2(0) : nk2(1);
    const phoneHand = hold < 0.5 ? 'phone' : 'offer';
    const r = person({ who: 'her', costume: 'coat', tau: p.tau == null ? 0.42 : p.tau, head: faceOf(p, { yaw: lerp(0.55, 0.3, hold), pitch: lerp(0.06, 0.4, hold), lids: lerp(0.72, 0.5, hold), gaze: lerp(0, 1, hold) ? [lerp(0.45, 0.1, hold), lerp(0.06, 0.5, hold)] : [0.45, 0.06] }, 5),
      arms: { L: { E: En, W: Wn, hand: np > 0.4 ? 'nape' : 'relax', hp: np > 0.4 ? {} : { close: 0.4 }, beforeHead: np > 0.3 }, R: { E: Ep, W: Wp, hand: rch > 0.5 ? 'offer' : phoneHand, hp: { flip: hold < 0.5, reach: p.thumb || 0, tap: p.tap || 0, close: 0.3, over: rch > 0.5 ? null : 'thumb' }, front: true } },
      legs: p.legs || { stance: 0.06 }, crop: p.crop });
    r.info.phone = V.add(Wp, hold < 0.5 ? [0.05, -0.32] : [0.24, -0.08]); r.info.phoneFacing = hold < 0.5 ? 'out' : 'her'; r.phoneHand = rch > 0.5 ? null : 'R'; return r;
  };
  POSES.her.phone_up = p => POSES.her.phone(Object.assign({}, p, { hold: p.hold || 0 }));
  POSES.her.phone_back = p => POSES.her.phone(Object.assign({}, p, { hold: p.hold == null ? 1 : p.hold }));
  // very still: the phone low in her hand, eyes down, no breath (Q10, 40-44)
  POSES.her.still = p => POSES.her.phone(Object.assign({ hold: 1, face: Object.assign({ lids: 0.45, gaze: [0, 0.6], pitch: 0.3 }, p.face || {}) }, p, { t: null }));
  POSES.her.walk = p => walkOps('her', p, 'coat');

  function legOpsJoints(who, o, Pp, joints, key0) {
    const lc = LEGS[who] || LEGS.him; const home = o.costume === 'sweater' || o.costume === 'tee'; const trousers = who === 'him' ? (home ? lc.home : lc.trousers) : lc.trousers; const shoe = home && who === 'him' ? lc.sock : lc.shoe;
    return [['far', joints.far], ['near', joints.near]].map(([nm, J], i) => ({ type: 'paper', key: 'legJ' + nm + key0 + kq(J) + trousers, box: bboxOf(J, 0.6), breath: 0, draw(pen) {
      const [H0, K, A] = J; const lp = limbPts(H0, K, A, Pp.legW[0], Pp.legW[1], Pp.legW[2]);
      const col = i ? trousers : mix(trousers, '#000000', 0.15); const pth = pen.piece(pen.blob(lp.pts), pen.col(col), { seed: 230 + i, tex: 0.55, lift: [0.02, 0.03] }); pen.shade(pth, trousers, { lit: 0.05, core: 0.08 });
      if (lp.bent) pen.fold([V.add(lp.innerPt, V.mul(lp.u1, -0.22)), lp.innerPt, V.add(lp.innerPt, V.mul(lp.u2, 0.18))], trousers, { w: 0.02 });
      const d = V.norm(V.sub(A, K)), n = V.perp(d), fwd = n[0] > 0 ? n : V.mul(n, -1);
      const ft = pen.blob([[...V.add(A, V.mul(fwd, -0.14)), 1], V.add(A, V.mul(d, 0.16)), V.add(V.add(A, V.mul(fwd, 0.42)), V.mul(d, 0.16)), [...V.add(V.add(A, V.mul(fwd, 0.48)), V.mul(d, 0.04)), 1], V.add(A, V.mul(fwd, 0.18))]);
      const fp = pen.piece(ft, pen.col(shoe), { seed: 240 + i, kind: 'card', tex: 0.45, lift: [0.015, 0.02] }); pen.shade(fp, shoe, { lit: 0.03, core: 0.04 });
    } }));
  }

  /* RIG.draw(c, who, pose, p): a whole figure in cut paper with its sculpted head and hands. who: 'him' | 'her'. pose: a name from
     RIG.POSES[who]. Returns {heads, hands, toWorld, info, phone?} with world points (see film/api/rig.md). */
  RIG.draw = function (c, who, pose, p) {
    p = Object.assign({ x: 960, y: 300, s: 200 }, p || {}); const P = (POSES[who] || {})[pose];
    if (!P) { (G.FILM && FILM.warn ? FILM.warn : console.warn)('[rig] no pose ' + who + '/' + pose); return null; }
    const built = P(p);
    const breath = p.breath != null ? p.breath : (p.t != null && pose !== 'still' ? RIG.breath(p.t, p.breathAmp == null ? 2.5 * Math.min(2, p.s / 250) : p.breathAmp) : 0);
    if (built.parts) {
      // a figure in parts (the couch): each part its own frame; heads, hands and overs merged
      const outs = built.parts.map(pt => drawFigure(c, { who, x: pt.x, y: pt.y, s: p.s, flip: pt.flip, rot: pt.rot || 0, light: p.light, breath: pt.breath == null ? breath : pt.breath, ops: pt.ops, target: p.target, alpha: p.alpha, res: p.res }));
      const main = outs[outs.length - 1]; const out = { heads: {}, hands: {}, toWorld: main.toWorld, info: Object.assign({}, built.worldInfo), pose, who };
      outs.forEach(o2 => { Object.assign(out.heads, o2.heads); Object.assign(out.hands, o2.hands); });
      out.over = c2 => outs.forEach(o2 => o2.over(c2));
      const ph = built.phoneHand && out.hands[built.phoneHand];
      if (ph) out.phone = { x: ph.grip[0], y: ph.grip[1], h: p.s * 0.7, w: p.s * 0.34, angle: ph.flip ? -ph.rot : ph.rot, facing: 'out', hand: ph };
      else if (built.worldInfo && built.worldInfo.phone) out.phone = { x: built.worldInfo.phone[0], y: built.worldInfo.phone[1], h: p.s * 0.7, w: p.s * 0.34, angle: 0, facing: 'up' };
      return out;
    }
    const out = drawFigure(c, { who, x: p.x, y: p.y, s: p.s, flip: p.flip, rot: built.rot || 0, sx: built.sx || 1, light: p.light, breath, ops: built.ops, target: p.target, alpha: p.alpha, res: p.res });
    const info = {}; for (const k in built.info) { const v = built.info[k]; info[k] = Array.isArray(v) && typeof v[0] === 'number' ? out.toWorld(v) : (Array.isArray(v) ? v.map(q2 => Array.isArray(q2) ? out.toWorld(q2) : q2) : v); }
    out.info = info; out.pose = pose; out.who = who;
    if (built.info.phone) { const ph = built.phoneHand && out.hands[built.phoneHand]; const at = ph && pose !== 'trade' ? ph.grip : info.phone; out.phone = { x: at[0], y: at[1], h: p.s * 0.7, w: p.s * 0.34, angle: ph ? (ph.flip ? -ph.rot : ph.rot) : 0, facing: built.info.phoneFacing || 'out', hand: ph || null }; }
    return out;
  };

  // ================================================================ an arm from a shoulder (for shots that frame only an arm)
  /* RIG.arm(c, who, p): one arm, in its sleeve, from a shoulder point to a target, solved with a natural elbow, ending in a hand.
     p: {shoulder: [x, y], target: [x, y] (world px: where the wrist goes), s (px per head; the arm is about 2.4 heads long), hand (a
     RIG.HANDS pose), hp ({close, reach, tight, zip, over, rot...}: the hand's fields), side ('R' his right arm / her right: the
     hand's handedness; 'L' the other), bend ('down' (default: the elbow drops below the line, as gravity has it), 'up', 'out' (away
     from the body's centre p.body: [x, y]), or 1 / -1), costume ('sweater' | 'shirt' | 'tee' | 'coat'), light, target canvas,
     handAt / handRot (place the hand itself, for a foreshortened forearm)}.
     The arm never locks straight: a target past 97 % of the reach keeps a slight bend and the hand stops short (out.reach < 1).
     Returns {hand, elbow, wrist, shoulder, reach, over(c)} in world px. Draw the sleeve under anything the hand holds with over(c). */
  RIG.arm = function (c, who, p) {
    p = Object.assign({ s: 200, side: 'R', hand: 'relax', bend: 'down' }, p || {});
    const s = p.s, Pp = PROP[who] || PROP.him, cosName = p.costume || (who === 'her' ? 'coat' : 'sweater'), cos = COSTUME[cosName] || COSTUME.sweater;
    const S0 = [0, 0], T0 = [(p.target[0] - p.shoulder[0]) / s, (p.target[1] - p.shoulder[1]) / s];
    const l1 = Pp.l1 * (p.len || 1), l2 = Pp.l2 * (p.len || 1); const dist = V.len(T0), maxR = (l1 + l2) * 0.97;
    const T = dist > maxR ? V.mul(T0, maxR / dist) : T0;
    const E1 = ik(S0, T, l1, l2, 1).E, E2 = ik(S0, T, l1, l2, -1).E;
    let E;
    if (p.bend === 1 || p.bend === -1) E = ik(S0, T, l1, l2, p.bend).E;
    else if (p.bend === 'up') E = E1[1] < E2[1] ? E1 : E2;
    else if (p.bend === 'out' && p.body) { const b = [(p.body[0] - p.shoulder[0]) / s, (p.body[1] - p.shoulder[1]) / s]; E = V.len(V.sub(E1, b)) > V.len(V.sub(E2, b)) ? E1 : E2; }
    else E = E1[1] > E2[1] ? E1 : E2;
    // the canonical hand is a right hand: the figure engine's screen-left arm draws it unmirrored, its screen-right arm mirrored
    const side = p.side === 'L' ? 'R' : 'L';
    const spec = Object.assign({ E, W: T, hand: p.hand, hp: Object.assign({}, p.hp || {}), front: true }, p.handAt ? { handAt: [(p.handAt[0] - p.shoulder[0]) / s, (p.handAt[1] - p.shoulder[1]) / s], handRot: p.handRot || 0 } : {});
    const ops = armOps(who, { costume: cosName }, cos, { S: S0, E, W: T, spec }, side, 'armhelper' + cosName);
    const out = drawFigure(c, { who, x: p.shoulder[0], y: p.shoulder[1], s, light: p.light, ops, target: p.target2 || p.canvas, alpha: p.alpha });
    const h = out.hands[side];
    return { hand: h, elbow: out.toWorld(E), wrist: out.toWorld(T), shoulder: p.shoulder.slice(), reach: Math.min(1, maxR / Math.max(dist, 1e-6)), over: out.over };
  };

  // ================================================================ the coworker, the passengers
  /* RIG.coworker(c, p): a coworker looking over a divider (Q03). p: {x, y (his head), s, rise 0..1 (from just his crown over the
     divider to his shoulders and arms on it: the set's divider top is p.top, world y), look 0..1 (his head turns to the desk),
     light, flip, t}. The divider itself is the set's; draw it after him (its top edge covers his chest). */
  POSES.coworker = {};
  POSES.coworker.over = p => {
    const look = clamp(p.look || 0, 0, 1);
    const r = person({ who: 'coworker', costume: 'coworker', tau: lerp(0.1, 0.35, look), lean: 0.12, crop: 2.6, head: faceOf(p, { yaw: lerp(0.0, 0.55, look), pitch: lerp(0.05, 0.3, look), lids: 0.62, gaze: [lerp(0, 0.4, look), lerp(0, 0.35, look)], brows: 0.15 }, 9),
      arms: { L: { E: [-0.95, 2.1], W: [-0.45, 1.72], hand: 'flat', front: true }, R: { E: [0.95, 2.15], W: [0.5, 1.75], hand: 'flat', hp: { flip: true }, front: true } }, legs: false });
    return r;
  };
  RIG.coworker = function (c, p) {
    p = Object.assign({ s: 150 }, p); const rise = clamp(p.rise == null ? 1 : p.rise, 0, 1);
    return RIG.draw(c, 'coworker', 'over', Object.assign({}, p, { y: p.y + (1 - rise) * p.s * 1.4 }));
  };
  // the passengers: close paper silhouettes in the bus's dusk (Q05). Five kinds; seen from behind or the side, a rim of the window's
  // sodium light on one edge. p: {x, y (the head), s, kind 0..4, side (true: profile), light, rim ('#E09048'), dark ('#141A2C')}
  const PASSENGER = [
    { hair: 'short', coat: 0.95, hood: false, collar: true },
    { hair: 'bun', coat: 0.85, hood: false, strap: true },
    { hair: 'cap', coat: 1.0, hood: false },
    { hair: 'long', coat: 0.88, hood: false, strap: true },
    { hair: 'hood', coat: 1.05, hood: true },
  ];
  RIG.passenger = function (c, p) {
    p = Object.assign({ s: 200, kind: 0 }, p); const K = PASSENGER[((p.kind | 0) % 5 + 5) % 5]; const side = !!p.side;
    const L = asLight(p.light || 'bus'); const dark = p.dark || mulHex('#232838', L.paper.mul, 1.0), rim = p.rim || L.paper.lit;
    const ops = [{ type: 'paper', key: 'pass' + p.kind + (side ? 's' : '') + dark + rim, box: [-1.9, -0.9, 1.9, 4.2], draw(pen) {
      const w = K.coat; const g = pen.g;
      // shoulders and coat
      const body = side ? pen.blob([[-0.25, 0.5], [0.35, 0.55], [0.7, 0.95], [0.75, 2.0], [0.7, 4.2, 1], [-0.75, 4.2, 1], [-0.7, 1.4], [-0.55, 0.85]])
        : pen.blob([[-0.25, 0.5], [0.25, 0.5], [0.95 * w, 0.95], [1.1 * w, 1.6], [1.15 * w, 4.2, 1], [-1.15 * w, 4.2, 1], [-1.1 * w, 1.6], [-0.95 * w, 0.95]]);
      const bp = pen.piece(body, dark, { seed: 700 + p.kind, kind: 'wool', tex: 0.45, lift: [0.04, 0.03], liftAlpha: 0.6 });
      // the head
      let head;
      if (K.hair === 'hood') head = pen.blob([[-0.48, 0.65], [-0.52, -0.1], [-0.3, -0.55], [0.0, -0.66], [0.32, -0.55], [0.52, -0.1], [0.48, 0.65]]);
      else if (side) head = pen.blob([[-0.38, 0.1], [-0.36, -0.35], [-0.05, -0.6], [0.3, -0.48], [0.42, -0.1], [0.46, 0.12], [0.38, 0.3], [0.32, 0.5], [0.0, 0.62], [-0.25, 0.55]]);
      else head = pen.blob([[-0.38, 0.35], [-0.42, -0.1], [-0.3, -0.48], [0.0, -0.6], [0.3, -0.48], [0.42, -0.1], [0.38, 0.35], [0.18, 0.62], [-0.18, 0.62]]);
      const hp = pen.piece(head, mix(dark, '#000000', 0.12), { seed: 710 + p.kind, kind: 'paper', tex: 0.4, lift: [0.03, 0.03], liftAlpha: 0.6 });
      if (K.hair === 'bun') pen.piece(pen.ell(0.05, -0.62, 0.17, 0.14, 0), mix(dark, '#000000', 0.15), { seed: 712, tex: 0.4, lift: false });
      if (K.hair === 'cap') pen.piece(pen.blob([[-0.44, -0.12], [-0.4, -0.48], [0.0, -0.66], [0.4, -0.48], [0.72, -0.2], [0.44, -0.1]]), mix(dark, '#000000', 0.2), { seed: 713, tex: 0.4, lift: false });
      if (K.hair === 'long') pen.piece(pen.blob([[-0.44, -0.2], [-0.32, -0.55], [0.32, -0.55], [0.46, -0.2], [0.5, 1.2], [-0.5, 1.2]]), mix(dark, '#000000', 0.18), { seed: 714, tex: 0.4, lift: false });
      if (K.collar) pen.piece(pen.blob([[-0.5, 0.75], [-0.3, 0.45], [0.3, 0.45], [0.5, 0.75], [0.3, 0.9], [-0.3, 0.9]]), mix(dark, '#FFFFFF', 0.05), { seed: 715, tex: 0.5, lift: [0.01, 0.02] });
      if (K.strap) pen.line([[0.55 * w, 0.85], [-0.4, 2.2], [-0.95 * w, 3.0]], mix(dark, '#000000', 0.25), 0.07, 0.9);
      // the sodium rim on the window side
      cres(g, bp, -pen.from[0] * -0.05 * pen.R, -pen.from[1] * -0.05 * pen.R, rim, 0.85);
      cres(g, hp, -pen.from[0] * -0.04 * pen.R, -pen.from[1] * -0.04 * pen.R, rim, 0.85);
    } }];
    return drawFigure(c, { who: 'passenger', x: p.x, y: p.y, s: p.s, flip: p.flip, light: L, ops, target: p.target, alpha: p.alpha });
  };

  // ================================================================ the trade (Q10): phone for bag on the centre line, fingers never touching
  // One timeline for the two-shot poses and the insert. u 0..1: reach (0-0.35: she holds out the phone, he the bag from underneath),
  // take (0.35-0.6: his free hand takes the phone by its near edge, hers the bag by its far end), swap (0.62), withdraw (0.66-1).
  const sm = (u, a, b) => { const t = clamp((u - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function tradeTime(u) { return { reach: sm(u, 0, 0.35), take: sm(u, 0.35, 0.6), swap: u >= 0.62, back: sm(u, 0.66, 1) }; }
  RIG.tradeTime = tradeTime;
  // the two-shot poses: each faces the other across the centre line. p.u, p.line ([x, y] world: where the phone and the bag cross;
  // stand each about 1.8 heads from it). Returns info.phone (its centre while she holds it; his grip after) and info.bag.
  function tradePose(who, p) {
    const T = tradeTime(p.u || 0); const lineF = p.line ? toFig(p, p.line) : [1.45, 2.2];
    const Pm = V.add(lineF, [0, -0.3]), Bm = V.add(lineF, [-0.02, 0.22]);
    const relaxL = { a1: -0.06, a2: 0.12, hand: 'relax' };
    const ops = []; let arms, phoneAt, bagAt, phoneHand = null;
    if (who === 'him') {
      // his far arm holds the bag out from underneath; his near arm comes across for the phone
      const bagHome = [0.42, 2.8], bagC = T.swap ? null : lerpPt(bagHome, Bm, T.reach);
      const Wg = T.swap ? lerpPt(V.add(Bm, [-0.5, 0.1]), [0.62, 3.05], T.back) : V.add(bagC, [-0.5, 0.1]);
      const Wt = T.swap ? lerpPt(V.add(Pm, [-0.95, 0.04]), [0.35, 2.05], T.back) : lerpPt([-0.55, 3.1], V.add(Pm, [-0.95, 0.04]), T.take);
      const hold = bagC ? { type: 'paper', key: 'tbag' + kq([bagC]), box: [bagC[0] - 0.6, bagC[1] - 0.45, bagC[0] + 0.6, bagC[1] + 0.45], breath: 0.4, draw(pen) { bagShape(pen, bagC, 0.74); } } : null;
      const gRot = T.swap ? 0 : 0.05;
      arms = { R: Object.assign({ to: Wg, bend: -1, front: true, order: 1 }, T.swap && T.back > 0.5 ? { hand: 'relax' } : { hand: 'bag', hp: { zip: 0 }, flipHand: true, handAt: Wg, handRot: gRot, prop: hold ? { before: hold } : null }),
        L: T.take > 0.02 || T.swap ? { to: Wt, bend: 1, hand: 'take', hp: { close: T.swap ? 1 : 0.3 + 0.7 * T.take, over: T.take > 0.6 || T.swap ? 'fingers' : null }, front: true, order: 2 } : relaxL };
      phoneAt = T.swap ? V.add(Wt, [0.62, -0.04]) : Pm; bagAt = bagC; if (T.swap) phoneHand = 'L';
    } else {
      // her near arm holds the phone out on her palm; her far arm comes for the bag and takes it by its far end
      const phHome = [0.95, 1.95], phC = T.swap ? null : lerpPt(phHome, Pm, T.reach);
      const Wg = T.swap ? lerpPt(V.add(Pm, [-0.26, 0.12]), [-0.78, 3.0], T.back) : V.add(phC, [-0.26, 0.12]);      // her palm under the phone
      const bagC = T.swap ? lerpPt(Bm, [0.45, 2.75], T.back) : null;
      const Wt = T.swap ? V.add(bagC, [-0.72, -0.1]) : lerpPt([0.78, 3.0], V.add(Bm, [-0.72, -0.1]), T.take);
      const hold = bagC ? { type: 'paper', key: 'tbagH' + kq([bagC]), box: [bagC[0] - 0.6, bagC[1] - 0.45, bagC[0] + 0.6, bagC[1] + 0.45], breath: 0.4, draw(pen) { bagShape(pen, bagC, 0.74); } } : null;
      arms = { L: T.swap && T.back > 0.4 ? relaxL : { to: Wg, bend: 1, hand: 'offer', hp: { close: 0.3, tilt: 0.6, over: T.swap ? null : 'thumb' }, front: true, order: 1 },
        R: T.take > 0.02 || T.swap ? Object.assign({ to: Wt, bend: -1, hand: 'take', hp: { close: T.swap ? 1 : 0.3 + 0.7 * T.take }, flipHand: true, front: true, order: 2 }, hold ? { prop: { before: hold } } : {}) : { a1: -0.05, a2: 0.1, hand: 'relax' } };
      phoneAt = phC; bagAt = bagC;
    }
    const r = person({ who, costume: who === 'him' ? (p.costume || 'sweater') : 'coat', tau: p.tau == null ? 0.45 : p.tau, lean: 0.04,
      head: faceOf(p, who === 'him' ? { yaw: 0.45, pitch: 0.3, lids: 0.4, gaze: [0.2, 0.45] } : { yaw: 0.45, pitch: 0.2, lids: 0.55, gaze: [0.2, 0.35] }, who === 'him' ? 3 : 5),
      arms, legs: p.legs || { stance: 0.08 }, crop: p.crop });
    if (phoneAt) r.info.phone = phoneAt; if (bagAt) r.info.bag = bagAt; r.phoneHand = phoneHand; r.info.phoneFacing = 'flat'; r.info.line = lineF; return r;
  }
  POSES.him.trade = p => tradePose('him', p);
  POSES.her.trade = p => tradePose('her', p);

  /* RIG.trade(c, u, p): the hands insert: the same two poses seen close, so each forearm comes from its own shoulder off frame (his
     from the left, hers from the right) at the angle the two-shot has. p: {x, y (the centre line, world px: where the phone and bag
     cross), s (px per hand length; ~300-400 fills the frame), light, t}. Returns {phone: {x, y, w, h, angle, facing: 'flat'},
     him, her (the figures), over(c)}: draw the phone at .phone, then over(c). Fingers never touch. */
  RIG.trade = function (c, u, p) {
    p = Object.assign({ x: 960, y: 560, s: 360 }, p); const L = asLight(p.light || 'day');
    const sh = p.s / HSCALE.him, sr = sh * 0.95, line = [p.x, p.y];
    const him = RIG.draw(c, 'him', 'trade', { x: p.x - 1.45 * sh, y: p.y - 2.2 * sh, s: sh, light: L, t: p.t, u, line, breath: 0 });
    const her = RIG.draw(c, 'her', 'trade', { x: p.x + 1.45 * sr, y: p.y - 2.05 * sr, s: sr, light: L, t: p.t, u, line, flip: true, breath: 0 });
    const ph = (him.phone) || her.phone; const T = tradeTime(u);
    // the phone tilted toward us (its back on her palm, then its face as he takes it): never edge-on
    return { phone: ph ? Object.assign({}, ph, { w: 0.34 * sh, h: 0.7 * sh, angle: T.swap ? -0.35 : -0.2, pitch: 0.55, spin: Math.PI / 2, facing: T.swap ? 'face' : 'back' }) : null, him, her, over: c2 => { him.over(c2 || c); her.over(c2 || c); } };
  };
  const FILM_ease = u => (a, b) => { const t = clamp((u - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  // ================================================================ demos: node tools/set.js rig 1  (each 4 s, on plain paper in the shot's palette)
  const PAPER = { night: '#171C2A', pendant: '#2A2329', day: '#7C7B76', dusk: '#4C536A', bathroom: '#B9BEC0', office: '#858B84', stairwell: '#6E6E70', bus: '#1C2336', flat: '#7C7B76' };
  function paperBg(c, col, seed) {
    col = PAPER[col] || col;
    const cv = c.cache('RIG|bg|' + col + '|' + (seed || 1), (g) => { g.fillStyle = col; g.fillRect(0, 0, W, H); const p = new Path2D(); p.rect(0, 0, W, H); GG.texture(g, p, 0.55, seed || 3, 'paper');
      const vg = g.createLinearGradient(0, 0, 0, H); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.18)'); g.fillStyle = vg; g.fillRect(0, 0, W, H); });
    c.reset(); c.g.drawImage(cv, 0, 0);
  }
  RIG.paperBg = paperBg;
  // a few plain paper pieces for context (cached): [shape points or {rect}, fill, lift]
  function props(c, key, list) {
    const cv = c.cache('RIG|props|' + key, (g) => { list.forEach(([pts, fill, o]) => { o = o || {}; const sh = pts.rect ? S().rect(...pts.rect) : GG.blob(pts); const pth = GG.piece(g, sh, { fill, rough: 1.2, seed: o.seed || 7, tex: o.tex == null ? 0.55 : o.tex, kind: o.kind || 'card', lift: o.lift || [6, 10], liftAlpha: o.liftAlpha == null ? 0.55 : o.liftAlpha, liftBlur: 10 }); if (o.edge) GG.crescent(g, pth, o.edge[0], o.edge[1], o.edge[2], 0.8); }); });
    c.reset(); c.g.drawImage(cv, 0, 0);
  }
  // a stand-in phone for the demos only (the film's phone is PHONE, film/phone.js): a black slab, a soft lit screen, in gloss
  function demoPhone(c, ph, o) {
    if (!ph) return; o = o || {}; const g = c.gl; g.save(); g.translate(ph.x, ph.y); g.rotate(ph.angle || 0);
    const w = ph.w, h = ph.h; if (o.back) { g.fillStyle = '#121316'; g.fill(GG.rrect(-w / 2, -h / 2, w, h, w * 0.14)); g.strokeStyle = 'rgba(200,210,230,0.25)'; g.lineWidth = 1.2; g.stroke(GG.rrect(-w / 2, -h / 2, w, h, w * 0.14)); g.restore(); return; }
    g.fillStyle = '#000000'; g.fill(GG.rrect(-w / 2, -h / 2, w, h, w * 0.16));
    const gr = g.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, o.top || '#FFD9C2'); gr.addColorStop(1, o.bottom || '#FF9CB0'); g.fillStyle = gr; g.fill(GG.rrect(-w / 2 + w * 0.06, -h / 2 + w * 0.06, w * 0.88, h - w * 0.12, w * 0.1));
    g.restore();
  }
  const seg = (t, a, b) => { const u = clamp((t - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  // a plain cut-paper couch for the demos: the back, the seat, two arms (the far arm's inner face at x 1530)
  function couchProps(c) { props(c, 'couchB', [[[[300, 470], [1640, 460], [1660, 690], [290, 700]], '#6B665E', { kind: 'cloth', lift: [0, -8], edge: [-6, -8, '#8E897F'] }], [[[300, 690], [1640, 680], [1650, 760], [290, 770]], '#746F67', { kind: 'cloth', lift: [0, 6] }], [[[300, 760], [1650, 750], [1660, 880], [290, 890]], '#625D56', { kind: 'cloth', lift: [0, -10], edge: [0, -6, '#837E76'] }]]); }
  function couchFront(c) { props(c, 'couchF', [[[[1530, 520], [1680, 510], [1690, 880], [1530, 890]], '#5E5952', { kind: 'cloth', lift: [-10, 0], edge: [-6, -6, '#8A857C'] }], [[[180, 520], [330, 515], [335, 890], [175, 895]], '#5E5952', { kind: 'cloth', lift: [10, 0], edge: [6, -6, '#8A857C'] }]]); }
  const keyv = (t, ks) => { if (t <= ks[0][0]) return ks[0][1]; for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) { const u = seg(t, ks[i - 1][0], ks[i][0]); return Array.isArray(ks[i][1]) ? ks[i][1].map((v, k) => lerp(ks[i - 1][1][k], v, u)) : lerp(ks[i - 1][1], ks[i][1], u); } return ks[ks.length - 1][1]; };
  RIG.demos = [
    { name: 'him lie: bed, night; his hand comes to rest over the phone', draw(c, t) { const tt = twos(t); paperBg(c, 'night');
      props(c, 'pillows', [[[[150, 262], [420, 246], [700, 262], [748, 330], [736, 470], [680, 520], [400, 530], [170, 512], [134, 400]], '#2A3349', { kind: 'cloth', lift: [8, 18], edge: [-6, -14, '#3E4A68'] }],
        [[[168, 560, 1], [720, 548, 1], [770, 640], [756, 820, 1], [430, 846], [186, 836, 1], [150, 700]], '#2E3852', { kind: 'cloth', lift: [-10, 26], edge: [0, -10, '#4C5B82'] }]]);
      const ph = { x: 566, y: 652, w: 206, h: 100, angle: -0.03 }; const L = RIG.light('night', { phone: [560, 610] });
      GG.glow(c.g, 540, 600, 420, '#FFAE8A', 0.3, 'screen', 0.8);
      const f = RIG.draw(c, 'him', 'lie', { x: 452, y: 398, s: 300, light: L, t, phone: [560, 640], reach: seg(tt, 0.3, 2.6), face: { lids: lerp(0.38, 0.12, seg(tt, 2.4, 3.6)), smile: 0.35 } });
      demoPhone(c, ph, { back: true }); f.over(c); } },
    { name: 'back views: standing, at the desk, on the bus', draw(c, t) { const tt = twos(t); paperBg(c, 'office'); const L = RIG.light('office');
      RIG.draw(c, 'him', 'stand', { x: 330, y: 220, s: 115, light: L, t, view: 'back' });
      props(c, 'bvdesk', [[{ rect: [700, 640, 560, 40] }, '#9A9E96', {}], [{ rect: [820, 380, 300, 200] }, '#3A3E44', {}]]);
      RIG.draw(c, 'him', 'desk', { x: 960, y: 300, s: 130, light: L, t, view: 'back', reach: seg(tt, 1.5, 2.6), phone: [1240, 640] });
      props(c, 'bvdesk2', [[{ rect: [690, 680, 580, 420] }, '#8A8E86', { lift: [0, -10] }]]);
      RIG.draw(c, 'him', 'bus', { x: 1600, y: 260, s: 115, light: RIG.light('bus'), t, view: 'back', rail: [1530, 110] }); c.g.fillStyle = '#9EA2A6'; c.g.fillRect(1400, 100, 400, 10); } },
    { name: 'her age: 0 (the photographs, then) and 0.6 (the visit, now); day light, soft', draw(c, t) { paperBg(c, 'day'); const L = RIG.light('day');
      RIG.head(c, 'her', { x: 600, y: 420, s: 420, light: L, age: 0, lids: 0.78, yaw: -0.2, neck: 0.4 }); RIG.head(c, 'her', { x: 1320, y: 420, s: 420, light: L, yaw: -0.2, neck: 0.4 }); } },
    { name: 'RIG.arm: from a shoulder off frame, a natural elbow, a hand at the end', draw(c, t) { const tt = twos(t); paperBg(c, 'day'); const L = RIG.light('day');
      props(c, 'armcush', [[{ rect: [380, 640, 1200, 300] }, '#77726A', { kind: 'cloth', lift: [0, -8] }]]);
      const tg = [lerp(820, 960, seg(tt, 0.5, 2.5)), lerp(560, 700, seg(tt, 0.5, 2.5))];
      const a = RIG.arm(c, 'him', { shoulder: [420, -80], target: tg, s: 300, hand: 'flat', hp: { close: 0.3 }, light: L, costume: 'sweater' });
      RIG.arm(c, 'her', { shoulder: [1820, 120], target: [1380, 420], s: 280, hand: 'offer', hp: { close: 0.3, tilt: 0.5 }, side: 'L', light: L }); } },
    { name: 'couch: he lies down (sit -> lie), his feet inside the couch', draw(c, t) { const tt = twos(t); paperBg(c, 'day'); const L = RIG.light('day');
      couchProps(c); RIG.draw(c, 'him', 'liedown', { hip: [900, 690], s: 120, light: L, t, u: seg(tt, 0.3, 3.4), fit: 1530, arm: 'rest' }); couchFront(c); } },
    { name: 'couch: lying, his hand over the phone beside his face (Q11)', draw(c, t) { const tt = twos(t); paperBg(c, 'dusk'); const PH = [527, 702]; const L = RIG.light('dusk', { phone: PH, phoneCol: '#FFD6BE', phoneK: 1.2 });
      couchProps(c); GG.glow(c.g, PH[0], PH[1] - 20, 260, '#FFD6BE', 0.35, 'screen', 0.6);
      const f = RIG.draw(c, 'him', 'couch', { hip: [900, 690], s: 120, light: L, t, u: 1, fit: 1530, arm: 'rest', face: { lids: lerp(0.35, 0.04, seg(tt, 0.5, 3)) } });
      if (f.phone) demoPhone(c, { x: f.phone.x, y: f.phone.y, w: 84, h: 12, angle: 0 }, { back: true }); f.over(c); couchFront(c); } },
    { name: 'couch: lying texting, then he gets up (Q08)', draw(c, t) { const tt = twos(t); paperBg(c, 'day'); const L = RIG.light('day');
      couchProps(c); const g = seg(tt, 0.4, 3.6); const f = RIG.draw(c, 'him', 'getup', { hip: [900, 690], s: 120, light: L, t, u: g, fit: 1530, arm: g < 0.3 ? 'hold' : 'rest' });
      if (f.phone && f.phone.hand) demoPhone(c, { x: f.phone.x, y: f.phone.y, w: 40, h: 82, angle: f.phone.angle }, { top: '#FFD9C2', bottom: '#FF9CB0' }); f.over(c); couchFront(c); } },
    { name: 'him lie: the couch at dusk; the phone by his face, his eyes close', draw(c, t) { const tt = twos(t); paperBg(c, 'dusk');
      props(c, 'couch', [[[[60, 600], [1860, 590], [1880, 1100], [40, 1100]], '#5E6070', { kind: 'cloth', lift: [0, -10] }], [[[60, 520], [420, 470], [470, 640], [80, 700]], '#666876', { kind: 'cloth', edge: [-6, -8, '#80828E'] }]]);
      const L = RIG.light('dusk', { phone: [480, 690], phoneCol: '#FFD6BE', phoneK: 1.4 });
      const f = RIG.draw(c, 'him', 'lie', { x: 380, y: 560, s: 200, light: L, t, cover: false, phone: [470, 700], reach: 1, face: { lids: lerp(0.45, 0, seg(tt, 0.8, 3.0)), smile: 0.1 } });
      demoPhone(c, { x: 480, y: 712, w: 118, h: 60, angle: -0.02 }, { back: true }); f.over(c); } },
    { name: 'him counter (B2): eating from the pan; he stops chewing', draw(c, t) { const tt = twos(t); paperBg(c, 'pendant');
      const L = RIG.light('pendant', { phone: [1335, 880] }); const fork = keyv(tt, [[0, 0], [0.6, 1], [1.2, 1], [1.8, 0]]); const ch = tt < 2.6 ? RIG.chew(tt) : { mouth: 0, cheek: 0.6, cheekSide: -1 };
      const f = RIG.draw(c, 'him', 'counter', { x: 846, y: 296, s: 292, light: L, t, fork, face: Object.assign({ yaw: tt < 1.8 ? 0.35 : 0.72, pitch: tt < 1.8 ? 0.3 : 0.48, gaze: [0.22, 0.32] }, ch) });
      props(c, 'counter', [[{ rect: [-40, 952, 2000, 200] }, '#4A3B36', { lift: [0, -12], edge: [0, 6, '#8C7258'] }]]);
      demoPhone(c, { x: 1335, y: 890, w: 122, h: 222, angle: 0.03 }, { top: '#D8F4F6', bottom: '#5FC0B8' }); } },
    { name: 'him basin: brushing in the mirror; a smile through the foam', draw(c, t) { const tt = twos(t); paperBg(c, 'bathroom');
      const L = RIG.light('bathroom'); RIG.draw(c, 'him', 'basin', { x: 900, y: 330, s: 260, light: L, t, brush: tt * 2.2, foam: 1, face: { smile: seg(tt, 2.4, 3.0) * 0.5, lids: 0.6 } });
      props(c, 'basin', [[{ rect: [-40, 1010, 2000, 120] }, '#D8DADA', { lift: [0, -8], edge: [0, 6, '#F0F0EE'] }]]); } },
    { name: 'him desk: at the keyboard; then he turns the phone face down', draw(c, t) { const tt = twos(t); paperBg(c, 'office');
      const L = RIG.light('office'); const reach = seg(tt, 2.0, 2.9);
      const f = RIG.draw(c, 'him', 'desk', { x: 760, y: 330, s: 230, light: L, t, reach, phone: [1180, 902], face: { yaw: tt < 2 ? 0.3 : 0.45, gaze: tt < 2 ? [0, 0.1] : [0.3, 0.4] } });
      props(c, 'desk', [[{ rect: [-40, 905, 2000, 200] }, '#9A9E96', { lift: [0, -10], edge: [0, 6, '#C4C8BE'] }]]);
      if (reach < 0.9) demoPhone(c, { x: 1180, y: 880, w: 92, h: 50, angle: 0.02 }, {}); else demoPhone(c, { x: 1180, y: 880, w: 92, h: 50, angle: 0.02 }, { back: true }); f.over(c); } },
    { name: 'him step: the colour comes up his neck', draw(c, t) { const tt = twos(t); paperBg(c, 'stairwell');
      props(c, 'step', [[{ rect: [-40, 920, 2000, 200] }, '#8A8A86', { lift: [0, -10], edge: [0, 6, '#ABABA6'] }]]);
      const f0 = { x: 960, y: 300, s: 220 }; const L = RIG.light('stairwell', { phone: [960, 300 + 2.45 * 220], phoneK: 1.2 });
      const f = RIG.draw(c, 'him', 'step', Object.assign({}, f0, { light: L, t, tilt: 0.0, face: { flush: seg(tt, 0.2, 3.6), pitch: 0.5, lids: 0.5 } }));
      demoPhone(c, f.phone ? { x: f.phone.x, y: f.phone.y - f0.s * 0.12, w: f0.s * 0.32, h: f0.s * 0.62, angle: f.phone.angle } : null, { top: '#E8D2C4', bottom: '#C8A898' }); f.over(c); } },
    { name: 'him bus: the rail, the stranger close; his ears go red', draw(c, t) { const tt = twos(t); paperBg(c, 'bus');
      props(c, 'buswin', [[{ rect: [0, 80, 1920, 420] }, '#3A4468', { kind: 'paper', lift: [0, 0], liftAlpha: 0 }], [{ rect: [0, 300, 1920, 90] }, '#B8743C', { kind: 'paper', lift: [0, 0], liftAlpha: 0 }]]);
      const L = RIG.light('bus', { phone: [1010, 300 + 2.0 * 240], phoneK: 1.0 });
      RIG.passenger(c, { x: 330, y: 330, s: 260, kind: 2, light: L }); RIG.passenger(c, { x: 1560, y: 300, s: 250, kind: 1, light: L, flip: true });
      const f = RIG.draw(c, 'him', 'bus', { x: 960, y: 330, s: 240, light: L, t, face: { ears: seg(tt, 0.4, 2.2), yaw: tt > 2.8 ? -0.35 : 0.1, gaze: tt > 2.8 ? [-0.4, 0.2] : [0.1, 0.5] } });
      RIG.passenger(c, { x: 1700, y: 520, s: 330, kind: 0, light: L, side: true, flip: true }); const hh = f.hands.R; if (hh) demoPhone(c, { x: hh.grip[0], y: hh.grip[1], w: 76, h: 150, angle: -0.15 }, { top: '#F4E2D8', bottom: '#D6A4B4' }); f.over(c); } },
    { name: 'him walk: by day', draw(c, t) { const tt = twos(t); paperBg(c, 'day'); const L = RIG.light('day');
      RIG.draw(c, 'him', 'walk', { x: 380 + tt * 290, y: 180, s: 120, light: L, t, phase: tt * 0.9 }); RIG.draw(c, 'him', 'walk', { x: 1500 - tt * 250, y: 200, s: 110, light: L, t: t + 1, phase: tt * 0.9 + 0.5, flip: true, carry: 'bag' }); } },
    { name: 'him door: the colour leaves his face; his hand tightens on the edge', draw(c, t) { const tt = twos(t); paperBg(c, 'day');
      const edgeX = 1290; props(c, 'door', [[{ rect: [edgeX, -40, 700, 1200] }, '#9A968C', { lift: [-14, 0], edge: [-8, 0, '#B6B2A8'] }]]);
      const L = RIG.light('day'); const f = RIG.draw(c, 'him', 'door', { x: 860, y: 330, s: 240, light: L, t, edge: [edgeX + 20, 330 + 1.65 * 240], tight: seg(tt, 2.9, 3.3), face: { pale: seg(tt, 0.4, 2.6), lids: 0.82, smile: 0, yaw: 0.05, gaze: [0.05, 0] } });
      props(c, 'door2', [[{ rect: [edgeX, -40, 40, 1200] }, '#8A867C', { lift: [-6, 0] }]]); } },
    { name: 'him bag: eyes down, his thumb worries the broken zip', draw(c, t) { const tt = twos(t); paperBg(c, 'day'); const L = RIG.light('day');
      RIG.draw(c, 'him', 'bag', { x: 880, y: 250, s: 240, light: L, t, zip: tt * 0.75 }); } },
    { name: 'between (B3): she holds the phone up; her hand goes to her nape', draw(c, t) { const tt = twos(t); paperBg(c, 'day'); const L = RIG.light('day');
      props(c, 'rect', [[{ rect: [1360, 52, 280, 228] }, '#868580', { tex: 0.3, lift: [0, 0], liftAlpha: 0 }]]);
      const her = RIG.draw(c, 'her', 'phone_up', { x: 1222, y: 444, s: 212, light: L, t, flip: true, nape: seg(tt, 0.5, 2.6) });
      RIG.draw(c, 'him', 'bag', { x: 344, y: 392, s: 320, light: L, t, view: 'back', zip: tt * 0.6 });
      demoPhone(c, her.phone ? { x: her.phone.x, y: her.phone.y, w: 80, h: 156, angle: her.phone.angle } : null, { top: '#9FE6F2', bottom: '#2FAE7D' }); her.over(c); } },
    { name: 'him sit: the couch, the phone at his ear', draw(c, t) { const tt = twos(t); paperBg(c, 'dusk'); const L = RIG.light('dusk');
      props(c, 'couch2', [[[[200, 640], [1700, 620], [1720, 1100], [180, 1100]], '#5E6070', { kind: 'cloth', lift: [0, -10] }]]);
      const f = RIG.draw(c, 'him', 'sit', { x: 900, y: 330, s: 230, light: L, t, face: { lids: lerp(0.5, 0.2, seg(tt, 1, 3)) } }); demoPhone(c, f.phone ? { x: f.phone.x, y: f.phone.y, w: 70, h: 150, angle: 0.1 } : null, { back: true }); f.over(c); } },
    { name: 'her doorway: in the doorway, coat on', draw(c, t) { const tt = twos(t); paperBg(c, 'day');
      props(c, 'doorway', [[{ rect: [560, -40, 70, 1200] }, '#A09C92', {}], [{ rect: [1290, -40, 70, 1200] }, '#A09C92', {}], [{ rect: [630, -40, 660, 1200] }, '#5E5E5C', { tex: 0.7, lift: [0, 0], liftAlpha: 0 }]]);
      RIG.draw(c, 'her', 'doorway', { x: 960, y: 170, s: 118, light: RIG.light('day'), t }); } },
    { name: 'her guest: just inside, like a guest; her eyes travel the room', draw(c, t) { const tt = twos(t); paperBg(c, 'day');
      const yaw = keyv(tt, [[0, 0.1], [0.8, 0.55], [1.8, 0.8], [2.8, -0.2], [3.6, 0.3]]), gz = keyv(tt, [[0, [0, 0]], [0.8, [0.3, -0.1]], [1.8, [0.4, 0.15]], [2.8, [-0.4, 0]], [3.6, [0.1, 0.05]]]);
      RIG.draw(c, 'her', 'guest', { x: 900, y: 170, s: 118, light: RIG.light('day'), t, face: { yaw, gaze: gz } }); } },
    { name: 'her phone up: the screen to him; her hand rises to her nape', draw(c, t) { const tt = twos(t); paperBg(c, 'day'); const L = RIG.light('day');
      const f = RIG.draw(c, 'her', 'phone_up', { x: 1050, y: 300, s: 240, light: L, t, flip: true, nape: seg(tt, 0.6, 2.8) });
      demoPhone(c, f.phone ? { x: f.phone.x, y: f.phone.y, w: 0.34 * 240, h: 0.68 * 240, angle: f.phone.angle } : null, { top: '#9FE6F2', bottom: '#2FAE7D' }); f.over(c); } },
    { name: 'her phone back: she turns it and studies it; thumb on the glass', draw(c, t) { const tt = twos(t); paperBg(c, 'day'); const L = RIG.light('day', { phone: [920, 300 + 1.7 * 250], phoneCol: '#C8EEF2', phoneK: 0.5 });
      const f = RIG.draw(c, 'her', 'phone_back', { x: 960, y: 300, s: 250, light: L, t, flip: true, thumb: 0.3 + 0.3 * Math.sin(tt * 1.6) });
      demoPhone(c, f.phone ? { x: f.phone.x, y: f.phone.y, w: 0.3 * 250, h: 0.2 * 250, angle: -0.2 } : null, { back: true }); f.over(c); } },
    { name: 'her still: she goes very still', draw(c, t) { paperBg(c, 'day'); RIG.draw(c, 'her', 'still', { x: 960, y: 420, s: 420, light: RIG.light('day'), t, flip: true, face: { lids: 0.55, gaze: [0.05, 0.55], pitch: 0.22, yaw: -0.25 } }); } },
    { name: 'her walk: she leaves with the bag', draw(c, t) { const tt = twos(t); paperBg(c, 'day');
      RIG.draw(c, 'her', 'walk', { x: 1500 - tt * 260, y: 190, s: 118, light: RIG.light('day'), t, phase: tt * 0.95, flip: true, carry: 'bag' }); } },
    { name: 'faces: him (smile, murmur, heavy lids, stopped chewing, shock and pale, ashamed)', draw(c, t) { const tt = twos(t); paperBg(c, '#6E6C68'); const L = RIG.light('day');
      const F = [{ smile: 0.6, lids: 0.6, yaw: 0.2 }, { mouth: RIG.murmur(tt), smile: 0.3, lids: 0.55, yaw: -0.25, roll: 0.05 }, { lids: 0.22, yaw: 0.1, pitch: 0.12 }, { cheek: 0.6, cheekSide: -1, lids: 0.82, yaw: 0.55, pitch: 0.4, gaze: [0.2, 0.3] }, { pale: 1, lids: 0.86, brows: 0.25, yaw: 0.05 }, { pitch: 0.48, lids: 0.24, gaze: [0, 0.6], yaw: 0.3 }];
      F.forEach((f, i) => RIG.head(c, 'him', Object.assign({ x: 170 + i * 316, y: 430, s: 250, light: L, neck: 0.42 }, f))); } },
    { name: 'faces: her (tired, looking away, the breath drawn and swallowed, stillness)', draw(c, t) { const tt = twos(t); paperBg(c, '#7C7B76'); const L = RIG.light('day');
      const breath = tt < 2 ? { mouth: 1, brows: 0.25, pitch: -0.04 } : { mouth: 0, brows: 0, pitch: 0.06 };
      const F = [{ lids: 0.7, yaw: 0.25 }, { yaw: -0.6, lids: 0.68, gaze: [-0.35, 0.05] }, Object.assign({ lids: 0.72, yaw: 0.15 }, breath), { lids: 0.5, gaze: [0, 0.55], pitch: 0.2, yaw: -0.15 }, { lids: 0.66, gaze: [0.4, 0.06], yaw: -0.56, pitch: 0.06, mouth: 1 }];
      F.forEach((f, i) => RIG.head(c, 'her', Object.assign({ x: 200 + i * 380, y: 430, s: 270, light: L, neck: 0.4 }, f))); } },
    { name: 'flush: the red paper band rising up his neck, his ears last', draw(c, t) { const tt = twos(t); paperBg(c, 'stairwell');
      RIG.draw(c, 'him', 'stand', { x: 960, y: 380, s: 460, costume: 'shirt', light: RIG.light('stairwell', { phone: [900, 380 + 1.6 * 460], phoneK: 1.1 }), t, crop: 2.4, tau: 0.3, face: { flush: seg(tt, 0.1, 3.7), yaw: 0.35, pitch: 0.3, lids: 0.45, gaze: [0, 0.5] } }); } },
    { name: 'lip sync: his take (L014) and hers (L016) drive the mouths', draw(c, t) { const tt = twos(t); paperBg(c, '#7C7B76'); const L = RIG.light('day');
      const a = RIG.mouthFor('L014', tt), b = RIG.mouthFor('L016', tt);
      RIG.head(c, 'him', { x: 620, y: 460, s: 360, light: L, mouth: a, yaw: 0.3, lids: 0.6, gaze: [0, 0.3], neck: 0.4 }); RIG.head(c, 'her', { x: 1300, y: 460, s: 340, light: L, mouth: b, yaw: -0.3, lids: 0.72, neck: 0.4 });
      const env = G.FILM_VOICE_ENV || {}; [['L014', 420], ['L016', 1100]].forEach(([id, x0]) => { const e2 = env[id] || []; const g = c.g; for (let i = 0; i < Math.min(48, e2.length); i++) { g.fillStyle = i === Math.floor(tt * 12) ? '#F3ECDD' : 'rgba(40,40,44,0.55)'; g.fillRect(x0 + i * 8, 960 - e2[i] * 14 - 3, 6, e2[i] * 14 + 3); } }); } },
    { name: 'hands I: over the phone, the typing thumb, the fork, the rail', draw(c, t) { const tt = twos(t); paperBg(c, '#6E6C68'); const L = RIG.light('flat');
      RIG.hand(c, 'him', 'rest', { x: 300, y: 260, s: 250, light: L, foreLen: 0.9 }); 
      const tp = { x: 880, y: 640, s: 260, light: L, reach: 0.5 + 0.3 * Math.sin(tt * 4), tap: (Math.floor(tt * 6) % 2) * 0.5 }; const th = RIG.hand(c, 'him', 'thumb', tp); demoPhone(c, { x: th.grip[0], y: th.grip[1] - 40, w: 160, h: 320, angle: th.rot }, {}); RIG.hand(c, 'him', 'thumb', Object.assign({}, tp, { only: 'thumb', target: 'gl' }));
      drawFigure(c, { who: 'prop', x: 1360, y: 330, s: 260, light: L, ops: [{ type: 'paper', key: 'hfork', box: [-1, -1, 1, 1], draw(pen) { forkPiece(pen, [-0.02, -0.3], [-0.4, 0.22], true); } }] });
      RIG.hand(c, 'him', 'fork', { x: 1360, y: 330, s: 250, light: L }); drawFigure(c, { who: 'prop', x: 1360, y: 330, s: 260, light: L, ops: [{ type: 'paper', key: 'hfork2', box: [-1, -1, 1, 1], draw(pen) { forkPiece(pen, [-0.21, -0.04], [-0.4, 0.22], true); } }] });
      RIG.hand(c, 'him', 'rail', { x: 1720, y: 300, s: 240, light: L });
      c.g.fillStyle = '#9EA2A6'; c.g.fillRect(1560, 170, 330, 14); } },
    { name: 'hands II: the door edge, the phone at the ear, the bag and its zip, her nape, her thumb on the glass', draw(c, t) { const tt = twos(t); paperBg(c, '#7C7B76'); const L = RIG.light('day');
      props(c, 'h2door', [[{ rect: [330, 60, 220, 420] }, '#9A968C', { lift: [-10, 0] }]]);
      RIG.hand(c, 'him', 'door', { x: 180, y: 300, s: 230, light: L, tight: seg(tt, 1, 2.2), clip: { a: [330, 600], b: [330, 0] } });
      RIG.hand(c, 'him', 'ear', { x: 760, y: 420, s: 230, light: L });
      drawFigure(c, { who: 'prop', x: 1220, y: 330, s: 300, light: L, ops: [{ type: 'paper', key: 'h2bag', box: [-0.6, -0.4, 0.6, 0.45], draw(pen) { bagShape(pen, [0, 0], 0.74); } }] });
      RIG.hand(c, 'him', 'bag', { x: 1220 + 0.5 * 300, y: 330 + 0.02 * 300, s: 0.68 * 300, light: L, zip: tt * 0.8, flip: true });
      RIG.hand(c, 'her', 'nape', { x: 1640, y: 280, s: 230, light: L });
      const gp = { x: 1300, y: 1010, s: 220, light: L, reach: 0.3 + 0.5 * seg(tt % 2, 0, 1.5) }; const gh = RIG.hand(c, 'her', 'thumb', gp); demoPhone(c, { x: gh.grip[0], y: gh.grip[1] - 40, w: 130, h: 260, angle: gh.rot }, { top: '#9FE6F2', bottom: '#2FAE7D' }); RIG.hand(c, 'her', 'thumb', Object.assign({}, gp, { only: 'thumb', target: 'gl' })); } },
    { name: 'grips: the phone (true size) in her hand and his, the typing thumb, the bag in one hand', draw(c, t) { const tt = twos(t); paperBg(c, 'day'); const L = RIG.light('day');
      const one = (who, pose, x, y, s, o) => { const hp = Object.assign({ x, y, s, light: L }, o); const h = RIG.hand(c, who, pose, hp); demoPhone(c, h.phone, { top: '#9FE6F2', bottom: '#2FAE7D' }); RIG.hand(c, who, pose, Object.assign({}, hp, { only: ['thumb', 'dist'], target: 'gl', shadow: { alpha: 0.28 } })); return h; };
      one('her', 'phone', 300, 760, 300, { fore: [0.3, 1] }); one('him', 'thumb', 820, 800, 320, { fore: [0.35, 1], reach: 0.5 + 0.45 * Math.sin(tt * 2.2), tap: (Math.floor(tt * 6) % 3 === 0) ? 0.6 : 0 });
      drawFigure(c, { who: 'prop', x: 1530, y: 560, s: 420, light: L, ops: [{ type: 'paper', key: 'gbag', box: [-0.6, -0.4, 0.6, 0.45], draw(pen) { bagShape(pen, [0, 0], 0.74); } }] });
      RIG.hand(c, 'him', 'bag', { x: 1530 + 0.5 * 420, y: 560 + 0.02 * 420, s: 0.68 * 420, light: L, zip: tt * 0.75, flip: true }); } },
    { name: 'the trade, two-shot: each holds out one arm; phone and bag cross on the centre line', draw(c, t) { const tt = twos(t); paperBg(c, 'day'); const L = RIG.light('day');
      const u = seg(tt, 0.1, 3.7), line = [960, 300 + 2.2 * 190];
      const him = RIG.draw(c, 'him', 'trade', { x: 960 - 1.45 * 190, y: 300, s: 190, light: L, t, u, line, crop: 4.6 });
      const her = RIG.draw(c, 'her', 'trade', { x: 960 + 1.45 * 190, y: 300 + 0.25 * 190, s: 180, light: L, t, u, line, flip: true, crop: 4.4 });
      const ph = him.phone || her.phone; demoPhone(c, ph ? { x: ph.x, y: ph.y, w: 0.7 * 190, h: 0.3 * 190, angle: -0.2 } : null, { back: true }); him.over(c); her.over(c);
      c.g.save(); c.g.strokeStyle = 'rgba(255,255,255,0.12)'; c.g.setLineDash([6, 8]); c.g.beginPath(); c.g.moveTo(960, 0); c.g.lineTo(960, 1080); c.g.stroke(); c.g.restore(); } },
    { name: 'the trade (Q10): phone for bag on the centre line; her fingers never touch his', draw(c, t) { const tt = twos(t); paperBg(c, 'day'); const L = RIG.light('day');
      const tr = RIG.trade(c, seg(tt, 0.1, 3.8), { x: 960, y: 520, s: 330, light: L, t }); demoPhone(c, tr.phone ? { x: tr.phone.x, y: tr.phone.y, w: tr.phone.h * 0.95, h: tr.phone.w * 0.95, angle: tr.phone.angle } : null, { back: true }); tr.over(c); } },
    { name: 'coworker: a look over the divider (Q03)', draw(c, t) { const tt = twos(t); paperBg(c, 'office'); const L = RIG.light('office');
      RIG.coworker(c, { x: 1100, y: 340, s: 210, light: L, t, rise: seg(tt, 0.2, 1.4), look: seg(tt, 1.4, 2.2) });
      props(c, 'divider', [[{ rect: [-40, 640, 2000, 520] }, '#A3A79E', { lift: [0, -12], edge: [0, 8, '#C8CCC2'] }]]); } },
    { name: 'passengers: close paper silhouettes on the evening bus (Q05)', draw(c, t) { paperBg(c, 'bus'); const L = RIG.light('bus');
      props(c, 'buswin2', [[{ rect: [0, 60, 1920, 380] }, '#3A4468', { kind: 'paper', lift: [0, 0], liftAlpha: 0 }], [{ rect: [0, 250, 1920, 70] }, '#B8743C', { kind: 'paper', lift: [0, 0], liftAlpha: 0 }]]);
      [[200, 360, 220, 3], [560, 330, 200, 1], [900, 380, 240, 4], [1280, 340, 210, 2], [1640, 360, 230, 0]].forEach(([x, y, s, k]) => RIG.passenger(c, { x, y, s, kind: k, light: L, flip: k % 2 === 1 }));
      RIG.passenger(c, { x: 120, y: 520, s: 420, kind: 0, light: L, side: true }); RIG.passenger(c, { x: 1800, y: 560, s: 400, kind: 3, light: L, side: true, flip: true }); } },
  ];

})(window);
