/* SEVEN DAYS OF NO · SETS kit (global SETS)
   Backgrounds drawn in the look of design/refs: flat fills, even dark outlines, one darker flat shadow shape per surface,
   warm peach walls with big soft light shapes, sunset windows, teal and blue accents.
   Palette and line widths come from the Characters kit (POV.C, POV.LW) when it is loaded; a copy is kept as a fallback.

   Every set:  const S = SETS.office(g, opts)  draws the full 1920x1080 frame and returns
     { floorY, wallY, zoom, anchors: {name: {x, y, s}}, anchorsSet, toScreen(x,y), apply(g), tint }
   anchors are in the coordinate space g had when the set was called (camera applied); s is the suggested figure
   scale there (1 = an 800 px tall standing figure) times the camera zoom. apply(g) applies the same camera so a
   figure can be drawn in set coordinates. tint is a multiply colour suggestion for figures (null = none).
   opts.cam = {x, y, zoom}: the set point kept at the frame centre and the zoom (>= 1, clamped to the set's edges).
   SETS.<name>Front(g, opts) draws the pieces a character stands behind (same opts, same camera).
   Static layers are cached on offscreen canvases keyed by the static opts; live parts (clock hands, panels, text)
   are drawn every frame. Await SETS.ready() once before the first frame (it loads the embedded font). */
(function (global) {
  'use strict';
  const W = 1920, H = 1080, TAU = Math.PI * 2;

  // ---------------------------------------------------------------- palette and line widths
  const FALLBACK = {
    ink: '#1c1c1c', skin: '#FCEBCB', hoodie: '#3A8594', hoodieSh: '#2F7280', white: '#FFFFFF',
    officeWallSide: '#FCC374', officeWallSideSh: '#E9A46B', officeWallBack: '#FBEABF', officeWallBackSh: '#F1C6A3', officeFloor: '#FDB569', officeFloorShadow: '#DC9967',
    officeDesk: '#EE8E5C', officeDeskLeg: '#B4C9DC', officeMonitor: '#B6CEE6', officeChair: '#DE875B', officePot: '#B6D0EA', leaf: '#87A26A', leafSh: '#6F8C57',
    windowFrame: '#FBB973', glassTop: '#FDCDB0', glassLow: '#FFE3B5', cloud: '#FEE6CC', cloudBlue: '#C9D3E3',
    livWall: '#C19280', livWallSh: '#B28173', livLampLight: '#EFC995', livFloor: '#B9714B', livFloorShadow: '#9A5E4C', livRug: '#BE917A',
    sofa: '#A9684C', sofaMid: '#915647', sofaSh: '#764540', pillow: '#DA9855', pillowSh: '#BC8157', lampShade: '#FCB953', lampPole: '#9B8981',
    curtain: '#B98E7F', door: '#935A47', doorFrame: '#AE7156', table: '#CD8B5F', tableSh: '#9C6752', livPot: '#8085A7', livLeaf: '#5F7357',
    stBrickBldg: '#B5714A', stBrickWin: '#854C32', stTan: '#BD8249', stOrange: '#F5A454', stSky: '#FCE9A7', stPier: '#C2753E', stRight: '#E77944',
    stDoorFrame: '#C45831', stDoor: '#88553B', stDoorGlass: '#5E9695', stLedgeTop: '#F4D780', stLedgeFace: '#9F9079', stPave: '#FBE689', stPaveLine: '#D9C26E',
    stTree: '#81A73A', stTreeSh: '#6D9233', stTrunk: '#9D6B3B', stPost: '#A9A8A3', stShadow: '#E2BF69',
    phone: '#3D3F48', phoneScreen: '#BFE3F2', box: '#C9995F', boxSh: '#B0834E', boxTop: '#D8AC74', tape: '#E3C38E',
    bubRed: '#E37F78', bubGreen: '#77CC81', bubBlue: '#7BAFE1', bubYellow: '#F4BF54', badgeRed: '#E5534B', clockRim: '#A3ADB8', clockFace: '#FDFEFA',
    tintEvening: '#D2B9C2',
  };
  // set-only colours (sampled from the refs where they exist there)
  const X = {
    inkSoft: '#6B4426',      // window frames and wall corners are drawn in a warm brown in the refs
    cork: '#D79F6E', corkFrame: '#D3956A', note: '#FBF6EF', noteBlue: '#A0CFE1', noteYellow: '#F8E696', pin: '#E26B5B',
    picture: '#E39362', deskSh: '#D97C4F', terracotta: '#F2A264', terracottaSh: '#D9874D', keyboard: '#F3F7F8', wheel: '#464646', pole: '#5E6064',
    teal: '#3A8594', tealLight: '#7FC4C9', tealPale: '#BFE3E0', plain: '#9DCFC6',
  };
  function pal() { return Object.assign({}, FALLBACK, (global.POV && global.POV.C) || {}, X); }
  function lws() {
    const L = (global.POV && global.POV.LW) || { figure: 5, detail: 3.1, set: 3.5, setDetail: 2.4 };
    // big furniture a little heavier than POV.LW.set (refs: desk edges ~4 px at 1920), small things at POV.LW.set.
    return { big: +(L.set * 1.3).toFixed(2), small: L.set, detail: L.setDetail, arch: +(L.set * 0.8).toFixed(2), frame: L.figure + 1 };
  }
  let C = pal(), LW = lws(), INK = C.ink;
  function refresh() { C = pal(); LW = lws(); INK = C.ink; }

  // ---------------------------------------------------------------- colour helpers
  function hex(c) { c = c.replace('#', ''); if (c.length === 3) c = c.split('').map(ch => ch + ch).join(''); const n = parseInt(c, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function toHex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  function dark(a, k) { const A = hex(a); return toHex(A[0] * k, A[1] * k, A[2] * k); }
  function mulTo(base, target) { const A = hex(base), B = hex(target); return toHex(255 * B[0] / A[0], 255 * B[1] / A[1], 255 * B[2] / A[2]); }
  function rgba(a, al) { const A = hex(a); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + al + ')'; }

  // ---------------------------------------------------------------- deterministic PRNG
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  // ---------------------------------------------------------------- canvas and path helpers
  function mkCanvas(w, h) {
    if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    return new OffscreenCanvas(w, h);
  }
  function paint(g, fill, lw, ink) {
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (lw) { g.lineWidth = lw; g.strokeStyle = ink || INK; g.stroke(); }
  }
  function rectP(g, x, y, w, h) { g.beginPath(); g.rect(x, y, w, h); }
  function rrP(g, x, y, w, h, r) {
    const rr = Array.isArray(r) ? r : [r, r, r, r];
    const [a, b, c, d] = rr.map(v => Math.max(0, Math.min(v, w / 2, h / 2)));
    g.beginPath(); g.moveTo(x + a, y); g.lineTo(x + w - b, y); g.arcTo(x + w, y, x + w, y + b, b); g.lineTo(x + w, y + h - c);
    g.arcTo(x + w, y + h, x + w - c, y + h, c); g.lineTo(x + d, y + h); g.arcTo(x, y + h, x, y + h - d, d); g.lineTo(x, y + a); g.arcTo(x, y, x + a, y, a); g.closePath();
  }
  function polyP(g, p, open) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); if (!open) g.closePath(); }
  function ellP(g, cx, cy, rx, ry) { g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); }
  function line(g, x1, y1, x2, y2, lw, ink) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineWidth = lw; g.strokeStyle = ink || INK; g.stroke(); }
  // shape(): fill a path, lay one flat shadow shape inside it, then outline it.
  function shape(g, path, fill, lw, sh, shPath, ink) {
    path(); if (fill) { g.fillStyle = fill; g.fill(); }
    if (sh && shPath) { g.save(); path(); g.clip(); shPath(); g.fillStyle = sh; g.fill(); g.restore(); }
    if (lw) { path(); g.lineWidth = lw; g.strokeStyle = ink || INK; g.stroke(); }
  }
  function clipDo(g, path, fn, evenodd) { g.save(); path(); evenodd ? g.clip('evenodd') : g.clip(); fn(); g.restore(); }
  function soft(g, blur, fn) { g.save(); if (blur > 0) g.filter = 'blur(' + blur + 'px)'; fn(); g.restore(); }
  function overlay(g, op, fn) { g.save(); g.globalCompositeOperation = op; fn(); g.restore(); }
  // a soft-edged flat shape (light pools, floor shadows)
  function softFill(g, blur, colour, path, op) { g.save(); if (op) g.globalCompositeOperation = op; if (blur > 0) g.filter = 'blur(' + blur + 'px)'; path(); g.fillStyle = colour; g.fill(); g.restore(); }

  // ---------------------------------------------------------------- font (Nunito, SIL OFL, embedded at the end of this file)
  const FONT_FAMILY = "'Nunito', 'Inter', 'DejaVu Sans', sans-serif";
  function font(weight, px) { return weight + ' ' + px + 'px ' + FONT_FAMILY; }
  let fontState = 0, fontPromise = null;
  function ready() {
    if (fontPromise) return fontPromise;
    if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !SETS._fontData) { fontState = 2; fontPromise = Promise.resolve(); return fontPromise; }
    const ff = new FontFace('Nunito', 'url(data:font/woff2;base64,' + SETS._fontData + ')', { weight: '200 1000', style: 'normal' });
    fontPromise = ff.load().then(f => { document.fonts.add(f); fontState = 1; }).catch(() => { fontState = 2; });
    return fontPromise;
  }

  // ---------------------------------------------------------------- layer cache and camera
  const CACHE = new Map(); const CACHE_MAX = 10;
  function layer(key, res, draw) {
    const k = key + '@' + res + (fontState === 1 ? 'f' : 'n');
    let c = CACHE.get(k);
    if (c) { CACHE.delete(k); CACHE.set(k, c); return c; }
    c = mkCanvas(Math.round(W * res), Math.round(H * res));
    const lg = c.getContext('2d');
    lg.scale(res, res); lg.lineJoin = 'round'; lg.lineCap = 'round';
    refresh(); draw(lg);
    CACHE.set(k, c);
    while (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
    return c;
  }
  function camXf(cam) {
    const z = Math.max(1, (cam && cam.zoom) || 1);
    let cx = cam && cam.x != null ? cam.x : W / 2, cy = cam && cam.y != null ? cam.y : H / 2;
    const hw = W / 2 / z, hh = H / 2 / z;
    cx = Math.max(hw, Math.min(W - hw, cx)); cy = Math.max(hh, Math.min(H - hh, cy));
    return { z, ox: W / 2 - cx * z, oy: H / 2 - cy * z };
  }
  function resFor(z) { return z <= 1.001 ? 1 : z <= 1.5 ? 1.5 : 2; }
  function blit(g, xf, canvas, alpha) {
    g.save(); g.transform(xf.z, 0, 0, xf.z, xf.ox, xf.oy);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (alpha != null) g.globalAlpha *= alpha;
    g.drawImage(canvas, 0, 0, W, H); g.restore();
  }
  function live(g, xf, fn) { g.save(); g.transform(xf.z, 0, 0, xf.z, xf.ox, xf.oy); g.lineJoin = 'round'; g.lineCap = 'round'; refresh(); fn(g); g.restore(); }
  function result(xf, anchorsSet, floorY, wallY, extra) {
    const anchors = {};
    for (const k in anchorsSet) { const a = anchorsSet[k]; anchors[k] = Object.assign({}, a, { x: a.x * xf.z + xf.ox, y: a.y * xf.z + xf.oy, s: (a.s || 1) * xf.z }); }
    return Object.assign({
      floorY: floorY * xf.z + xf.oy, wallY: wallY * xf.z + xf.oy, zoom: xf.z, anchors, anchorsSet, tint: null,
      toScreen: (x, y) => ({ x: x * xf.z + xf.ox, y: y * xf.z + xf.oy }),
      apply: (g) => g.transform(xf.z, 0, 0, xf.z, xf.ox, xf.oy),
    }, extra || {});
  }

  // ================================================================ shared props
  // Sky inside a window pane, clipped by the caller. kind: sunset | evening | morning | dusk | night | day
  function sky(g, x, y, w, h, kind, seed) {
    const r = rng(seed || 7);
    const grad = (stops) => { const gr = g.createLinearGradient(0, y, 0, y + h); stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(x - 2, y - 2, w + 4, h + 4); };
    const cloud = (cx, cy, s, col) => { g.beginPath(); g.moveTo(cx - 60 * s, cy); g.arc(cx - 35 * s, cy - 8 * s, 22 * s, Math.PI, TAU * 0.87); g.arc(cx + 2 * s, cy - 20 * s, 30 * s, Math.PI * 1.05, TAU * 0.98); g.arc(cx + 40 * s, cy - 6 * s, 20 * s, Math.PI * 1.25, TAU); g.lineTo(cx + 60 * s, cy); g.closePath(); g.fillStyle = col; g.fill(); };
    const hills = (base, col, top, amp) => {
      g.beginPath(); g.moveTo(x - 4, y + h + 4); g.lineTo(x - 4, base);
      const n = 5; for (let i = 0; i <= n; i++) { const px = x + w * i / n, py = base - amp * (0.4 + 0.6 * Math.abs(Math.sin(i * 1.7 + seed))); g.quadraticCurveTo(px - w / n / 2, py - amp * 0.5, px, py); }
      g.lineTo(x + w + 4, y + h + 4); g.closePath(); g.fillStyle = col; g.fill();
      if (top) { g.save(); g.clip(); g.translate(0, amp * 0.35); g.fillStyle = top; g.fill(); g.restore(); }
    };
    const mountains = (base, col, lightCol, amp) => {
      const peaks = [[0, 0.35], [0.22, 1], [0.42, 0.45], [0.62, 0.85], [0.84, 0.4], [1.05, 0.7]];
      g.beginPath(); g.moveTo(x - 4, y + h + 4); g.lineTo(x - 4, base - amp * 0.3);
      for (let i = 1; i < peaks.length; i++) { const [px, ph] = peaks[i], [qx] = peaks[i - 1]; const vx = x + w * (qx + px) / 2, vy = base - amp * 0.18; g.lineTo(vx, vy); g.quadraticCurveTo(x + w * (px - 0.02), base - amp * ph * 1.12, x + w * (px + 0.05), base - amp * ph * 0.8); }
      g.lineTo(x + w + 4, y + h + 4); g.closePath(); g.fillStyle = col; g.fill();
      g.save(); g.clip(); g.fillStyle = lightCol;
      for (let i = 1; i < peaks.length; i++) { const [px, ph] = peaks[i]; polyP(g, [x + w * px, base - amp * ph, x + w * (px - 0.11), base + 4, x + w * (px - 0.03), base + 4]); g.fill(); }
      g.restore();
    };
    const streaks = (al) => {
      g.save(); g.globalAlpha = al; g.fillStyle = '#FFFFFF';
      for (const [o, ww] of [[0.18, 0.12], [0.44, 0.06]]) { const x0 = x + w * o; polyP(g, [x0, y + h, x0 + w * ww, y + h, x0 + w * ww + h * 0.85, y, x0 + h * 0.85, y]); g.fill(); }
      g.restore();
    };
    if (kind === 'sunset') {           // office refs: peach to cream, cream clouds, lavender cloud bank low
      grad([[0, C.glassTop], [1, C.glassLow]]);
      cloud(x + w * 0.22, y + h * 0.3, w / 300, C.cloud); cloud(x + w * 0.82, y + h * 0.5, w / 380, C.cloud);
      hills(y + h * 0.86, C.cloudBlue, '#DCE0EC', h * 0.08);
      streaks(0.32);
    } else if (kind === 'evening') {   // living refs: orange-pink to sun yellow, lavender hills, bright sun low
      grad([[0, '#F9A07F'], [0.55, '#FCC382'], [1, '#FDDF86']]);
      soft(g, 18, () => { ellP(g, x + w * 0.72, y + h * 0.88, w * 0.32, h * 0.16); g.fillStyle = 'rgba(255,240,170,0.9)'; g.fill(); });
      cloud(x + w * 0.2, y + h * 0.22, w / 380, '#FDC9A2');
      mountains(y + h * 0.9, '#BBAAC6', '#CFBDCC', h * 0.13);
      streaks(0.28);
    } else if (kind === 'morning') {
      grad([[0, '#BFE0EE'], [0.7, '#E9F3EE'], [1, '#FFF1D2']]);
      cloud(x + w * 0.25, y + h * 0.28, w / 330, '#FFFFFF'); cloud(x + w * 0.78, y + h * 0.45, w / 420, '#FFFFFF');
      hills(y + h * 0.86, '#BCD3C6', '#CFE0D4', h * 0.07);
      streaks(0.4);
    } else if (kind === 'dusk') {
      grad([[0, '#45497F'], [0.55, '#9A6C93'], [0.86, '#E8957A'], [1, '#F6B783']]);
      for (let i = 0; i < 7; i++) { const sx = x + r() * w, sy = y + r() * h * 0.45; g.fillStyle = 'rgba(255,246,220,' + (0.5 + r() * 0.5).toFixed(2) + ')'; ellP(g, sx, sy, 2.4, 2.4); g.fill(); }
      hills(y + h * 0.87, '#5E557F', '#6E6390', h * 0.07);
      streaks(0.1);
    } else if (kind === 'night') {
      grad([[0, '#232650'], [1, '#3F4278']]);
      for (let i = 0; i < 14; i++) { const sx = x + r() * w, sy = y + r() * h * 0.7; g.fillStyle = 'rgba(255,248,225,' + (0.45 + r() * 0.55).toFixed(2) + ')'; ellP(g, sx, sy, 2 + r() * 1.6, 2 + r() * 1.6); g.fill(); }
      const mx = x + w * 0.7, my = y + h * 0.26, mr = Math.min(w, h) * 0.09;
      soft(g, 14, () => { ellP(g, mx, my, mr * 2, mr * 2); g.fillStyle = 'rgba(255,240,200,0.25)'; g.fill(); });
      ellP(g, mx, my, mr, mr); g.fillStyle = '#FFF3CF'; g.fill();
      ellP(g, mx + mr * 0.45, my - mr * 0.2, mr * 0.85, mr * 0.85); g.fillStyle = '#2C2F5C'; g.fill();
      hills(y + h * 0.87, '#1C1E3E', '#22244A', h * 0.07);
      streaks(0.06);
    } else { // day
      grad([[0, '#A9DDF1'], [1, '#D3F0F8']]);
      cloud(x + w * 0.3, y + h * 0.3, w / 330, '#FFFFFF'); cloud(x + w * 0.8, y + h * 0.55, w / 420, '#FFFFFF');
      streaks(0.35);
    }
  }

  // Window: outer frame, two panes with a mullion, a sill. f: {frame, frameSh, ink, sky, seed, sill:true}
  function windowBox(g, x, y, w, h, f) {
    f = f || {};
    const frame = f.frame || C.windowFrame, sh = f.frameSh || dark(frame, 0.86), ink = f.ink || X.inkSoft, lw = f.lw || 3;
    const t = f.t || Math.round(w * 0.055), mull = f.mull || Math.round(w * 0.052);
    rectP(g, x, y, w, h); paint(g, frame, 0);
    // flat shadow inside the frame: the top and left inner rebate
    const gx = x + t, gy = y + t, gw = w - 2 * t, gh = h - 2 * t;
    const pw = (gw - mull) / 2;
    const panes = [[gx, gy, pw, gh], [gx + pw + mull, gy, pw, gh]];
    for (const p of panes) {
      clipDo(g, () => rectP(g, p[0], p[1], p[2], p[3]), () => sky(g, gx, gy, gw, gh, f.sky || 'sunset', f.seed || 3));
      // inner rebate shadow (one flat darker shape)
      polyP(g, [p[0] - 8, p[1] - 8, p[0] + p[2] + 8, p[1] - 8, p[0] + p[2], p[1], p[0], p[1], p[0], p[1] + p[3], p[0] - 8, p[1] + p[3] + 8]); paint(g, sh, 0);
      rectP(g, p[0], p[1], p[2], p[3]); paint(g, null, lw * 0.85, ink);
      rectP(g, p[0] - 8, p[1] - 8, p[2] + 16, p[3] + 16); paint(g, null, lw * 0.7, ink);
    }
    rectP(g, x, y, w, h); paint(g, null, lw, ink);
    if (f.sill !== false) {
      const sx = x - w * 0.03, sw = w * 1.06, sy = y + h, sh2 = Math.max(26, h * 0.075);
      shape(g, () => rectP(g, sx, sy, sw, sh2), frame, lw, sh, () => rectP(g, sx, sy + sh2 * 0.55, sw, sh2), ink);
    }
  }

  // Leaf: base (x,y), angle a (radians, 0 = right), length L, width wd. Half the blade in the shadow colour.
  function leaf(g, x, y, a, L, wd, col, sh, lw) {
    const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
    const tx = x + ca * L, ty = y + sa * L, mx = x + ca * L * 0.5, my = y + sa * L * 0.5;
    const p1x = mx + nx * wd * 2, p1y = my + ny * wd * 2, p2x = mx - nx * wd * 2, p2y = my - ny * wd * 2;
    const path = () => { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(p1x, p1y, tx, ty); g.quadraticCurveTo(p2x, p2y, x, y); g.closePath(); };
    path(); g.fillStyle = col; g.fill();
    g.save(); path(); g.clip(); g.beginPath(); g.moveTo(x, y); g.lineTo(tx, ty); g.quadraticCurveTo(p2x, p2y, x, y); g.fillStyle = sh; g.fill(); g.restore();
    path(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.moveTo(x + ca * L * 0.08, y + sa * L * 0.08); g.lineTo(x + ca * L * 0.78, y + sa * L * 0.78); g.lineWidth = lw * 0.6; g.stroke();
  }
  // Pot plant. kind 'tall' (office/living refs) or 'small' (desk). x = centre, y = floor (pot bottom).
  function plant(g, x, y, s, o) {
    o = o || {};
    const pot = o.pot || C.officePot, potSh = o.potSh || dark(pot, 0.88), lf = o.leaf || C.leaf, lfs = o.leafSh || C.leafSh;
    const lw = (o.lw || LW.small);
    if (o.kind === 'small') {
      const pw = 58 * s, ph = 50 * s;
      for (const [a, L] of [[-2.0, 62], [-1.75, 74], [-1.45, 80], [-1.2, 70], [-0.95, 56]]) leaf(g, x, y - ph + 4 * s, a, L * s, 9 * s, lf, lfs, lw * 0.8);
      shape(g, () => polyP(g, [x - pw / 2, y - ph, x + pw / 2, y - ph, x + pw * 0.4, y, x - pw * 0.4, y]), pot, lw, potSh, () => polyP(g, [x + pw * 0.12, y - ph, x + pw / 2, y - ph, x + pw * 0.4, y, x + pw * 0.08, y]));
      shape(g, () => rectP(g, x - pw * 0.56, y - ph - 12 * s, pw * 1.12, 14 * s), pot, lw, null, null);
      return;
    }
    const pw = 128 * s, ph = 112 * s, rimH = 24 * s;
    const top = y - ph;
    // stem
    const SH = 250 * s;
    g.beginPath(); g.moveTo(x, top + 4); g.quadraticCurveTo(x - 6 * s, top - SH * 0.55, x + 2 * s, top - SH); g.lineWidth = 7 * s + lw * 2; g.strokeStyle = INK; g.stroke();
    g.lineWidth = 7 * s; g.strokeStyle = lfs; g.stroke();
    const L = (o.leafLen || 1) * s;
    const leaves = [[0.22, -2.8, 128], [0.3, -0.36, 124], [0.5, -2.45, 120], [0.58, -0.68, 116], [0.76, -2.15, 104], [0.82, -1.02, 100], [1.0, -1.6, 92]];
    for (const [t, a, len] of leaves) leaf(g, x - 3 * s * Math.sin(t * 5), top - SH * t, a, len * L, 25 * L, lf, lfs, lw * 0.85);
    // pot: tapered body, rim, one darker side
    shape(g, () => polyP(g, [x - pw * 0.45, top + rimH, x + pw * 0.45, top + rimH, x + pw * 0.38, y, x - pw * 0.38, y]), pot, lw, potSh,
      () => polyP(g, [x + pw * 0.16, top + rimH, x + pw * 0.45, top + rimH, x + pw * 0.38, y, x + pw * 0.12, y]));
    shape(g, () => rectP(g, x - pw / 2, top, pw, rimH), pot, lw, potSh, () => rectP(g, x + pw * 0.2, top, pw * 0.3, rimH));
  }

  // Wall clock. time: hours as a number (17.5) or 'h:mm'. Draws rim, face, numbers, hands.
  function parseTime(t) {
    if (t == null) return 17;
    if (typeof t === 'number') return t;
    const m = String(t).match(/(\d+)[:.](\d+)/); if (!m) return 17;
    let h = +m[1], mi = +m[2]; if (/pm/i.test(t) && h < 12) h += 12; return h + mi / 60;
  }
  function clockFace(g, x, y, r, shadowCol) {
    if (shadowCol) { ellP(g, x + r * 0.09, y + r * 0.12, r, r); paint(g, shadowCol, 0); }
    ellP(g, x, y, r, r); paint(g, C.clockRim, LW.small);
    ellP(g, x - r * 0.04, y - r * 0.05, r * 0.86, r * 0.86); g.save(); g.clip(); ellP(g, x + r * 0.06, y + r * 0.07, r * 0.95, r * 0.95); g.restore();
    ellP(g, x, y, r * 0.82, r * 0.82); paint(g, C.clockFace, LW.detail);
    g.fillStyle = '#2b2b2b'; g.font = font(700, Math.round(r * 0.16)); g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = i / 12 * TAU - Math.PI / 2; g.fillText(String(i), x + Math.cos(a) * r * 0.66, y + Math.sin(a) * r * 0.66 + r * 0.012); }
  }
  function clockHands(g, x, y, r, time) {
    const hrs = parseTime(time), h = (hrs % 12), m = (hrs * 60) % 60;
    const ah = h / 12 * TAU - Math.PI / 2, am = m / 60 * TAU - Math.PI / 2;
    g.lineCap = 'round'; g.strokeStyle = '#1c1c1c';
    line(g, x, y, x + Math.cos(ah) * r * 0.4, y + Math.sin(ah) * r * 0.4, r * 0.075);
    line(g, x, y, x + Math.cos(am) * r * 0.62, y + Math.sin(am) * r * 0.62, r * 0.05);
    ellP(g, x, y, r * 0.06, r * 0.06); paint(g, '#1c1c1c', 0);
  }
  function clock(g, x, y, r, time, shadowCol) { clockFace(g, x, y, r, shadowCol); clockHands(g, x, y, r, time); }

  // Floor shadow under furniture / feet: soft flat ellipse
  function floorShadow(g, cx, cy, rx, ry, col, blur) { softFill(g, blur == null ? 5 : blur, col, () => ellP(g, cx, cy, rx, ry)); }

  // ================================================================ OFFICE
  // Layout scaled from refs 04/06/09/11 (x1.395). view: 'desk' (back desk and corkboard on the left wall, refs 04/06/11)
  // or 'door' (the left wall in perspective with the doorway, ref 09).
  const OF = { wallX: 653, floorY: 841, vp: [1876, 509] };
  function vpY(px, py, x) { const [vx, vy] = OF.vp; return vy + (py - vy) * (vx - x) / (vx - px); } // line through (px,py) to the VP, at x

  function officeLeftDesk(g) {
    const WX = OF.wallX, FY = OF.floorY;
    rectP(g, 0, 0, WX, FY); paint(g, C.officeWallSide, 0);
    // picture (darker orange panel, ref top-left)
    rectP(g, -10, 126, 147, 205); paint(g, X.picture, LW.small);
    // corkboard with notes (ref 04)
    const cx = 230, cy = 95, cw = 356, ch = 257;
    rectP(g, cx, cy, cw, ch); paint(g, X.corkFrame, LW.small);
    rectP(g, cx + 16, cy + 16, cw - 32, ch - 32); paint(g, X.cork, LW.detail);
    const note = (x, y, w, h, col, lines, rot) => {
      g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(rot || 0);
      shape(g, () => rectP(g, -w / 2, -h / 2, w, h), col, LW.detail, dark(col, 0.93), () => polyP(g, [w / 2, -h / 2, w / 2, h / 2, w * 0.2, h / 2]));
      g.strokeStyle = '#8f8a84'; g.lineWidth = 2;
      for (let i = 0; i < lines; i++) { const ly = -h / 2 + h * 0.28 + i * h * 0.14; g.beginPath(); g.moveTo(-w * 0.32, ly); g.lineTo(w * (i % 3 === 2 ? 0.1 : 0.32), ly); g.stroke(); }
      ellP(g, 0, -h / 2 + 9, 5.5, 5.5); paint(g, X.pin, 1.6);
      g.restore();
    };
    note(cx + 50, cy + 36, 86, 112, X.note, 5, 0);
    note(cx + 165, cy + 34, 56, 58, X.noteBlue, 0, 0.02);
    note(cx + 255, cy + 38, 58, 58, X.noteYellow, 0, -0.03);
    note(cx + 88, cy + 160, 58, 56, X.noteYellow, 0, 0.05);
    note(cx + 178, cy + 128, 122, 94, X.note, 5, 0);
  }
  function officeLeftDoor(g) {
    const WX = OF.wallX, FY = OF.floorY;
    const yFloor = (x) => vpY(WX, FY, x);
    polyP(g, [0, 0, WX, 0, WX, FY, 0, yFloor(0)]); paint(g, C.officeWallSide, 0);
    // doorway: outer frame and opening, edges toward the VP
    const D = officeDoorGeom();
    // corridor seen through the opening
    clipDo(g, () => polyP(g, D.open), () => {
      g.fillStyle = '#FDF1D2'; g.fillRect(0, 0, WX, H);
      polyP(g, [D.open[0] - 40, D.open[7] - 120, D.open[2] + 40, D.open[5] - 120, D.open[4] + 40, D.open[5] + 40, D.open[6] - 40, D.open[7] + 40]); paint(g, '#F8C886', 0);
      line(g, 0, D.open[7] - 120, WX, D.open[5] - 120, LW.detail, X.inkSoft);
      // the open door leaf against the corridor wall
      polyP(g, [D.open[0], D.open[1], D.open[0] + 70, D.open[1] + 40, D.open[6] + 70, D.open[7] - 30, D.open[6], D.open[7]]); paint(g, '#E7A36E', LW.small);
      polyP(g, [D.open[0] + 42, D.open[1] + 26, D.open[0] + 70, D.open[1] + 40, D.open[6] + 70, D.open[7] - 30, D.open[6] + 42, D.open[7] - 16]); paint(g, '#D38E5C', 0);
    });
    officeDoorFrame(g, D);
  }
  function officeDoorGeom() {
    // outer frame corners (TL, TR, BR, BL) and opening, from ref 09
    const WX = OF.wallX, FY = OF.floorY;
    const xl = 118, xr = 495, xli = 164, xri = 444;
    const top = (x) => vpY(xl, 30, x), topIn = (x) => vpY(xli, 72, x), fl = (x) => vpY(WX, FY, x);
    return {
      outer: [xl, top(xl), xr, top(xr), xr, fl(xr), xl, fl(xl)],
      open: [xli, topIn(xli), xri, topIn(xri), xri, fl(xri), xli, fl(xli)],
      floorMid: [(xli + xri) / 2, fl((xli + xri) / 2)],
    };
  }
  function officeDoorFrame(g, D) {
    const frame = '#D08F5F', frameSh = '#B97A4E';
    g.save(); g.beginPath(); polyP(g, D.outer); g.moveTo(D.open[0], D.open[1]); g.lineTo(D.open[6], D.open[7]); g.lineTo(D.open[4], D.open[5]); g.lineTo(D.open[2], D.open[3]); g.closePath();
    g.fillStyle = frame; g.fill('evenodd');
    // one darker flat shape: the inner reveal (left jamb face and lintel underside)
    g.clip('evenodd');
    polyP(g, [D.open[0] - 14, D.open[1] - 14, D.open[2], D.open[3] - 12, D.open[2], D.open[3], D.open[0], D.open[1], D.open[6], D.open[7], D.open[6] - 14, D.open[7]]); g.fillStyle = frameSh; g.fill();
    g.restore();
    polyP(g, D.outer); paint(g, null, LW.big);
    polyP(g, D.open); paint(g, null, LW.small);
  }

  function officeHeroDesk(g, o) {
    // ref 09/11 desk at x 1005-1367: blue-grey legs, orange modesty panel, orange top; side-view monitor; keyboard; small plant
    const x0 = 1005, x1 = 1367, ty = 617, th = 26;
    floorShadow(g, 1186, 952, 205, 20, C.officeFloorShadow, 6);
    const leg = C.officeDeskLeg, legSh = dark(leg, 0.85);
    // back legs (shorter, behind panel)
    shape(g, () => polyP(g, [1050, ty + th, 1072, ty + th, 1062, 900, 1044, 900]), legSh, LW.small);
    shape(g, () => polyP(g, [1300, ty + th, 1322, ty + th, 1330, 900, 1312, 900]), legSh, LW.small);
    // modesty panel
    shape(g, () => rectP(g, 1085, ty + th + 18, 205, 220), '#EB8755', LW.big, X.deskSh, () => rectP(g, 1085, ty + th + 18, 205, 26));
    // crossbar under the top
    shape(g, () => rectP(g, x0 + 22, ty + th, x1 - x0 - 44, 22), leg, LW.small, legSh, () => rectP(g, x0 + 22, ty + th + 12, x1 - x0 - 44, 10));
    // front legs, slightly splayed
    shape(g, () => polyP(g, [1028, ty + th, 1054, ty + th, 1044, 962, 1016, 962]), leg, LW.small, legSh, () => polyP(g, [1044, ty + th, 1054, ty + th, 1044, 962, 1034, 962]));
    shape(g, () => polyP(g, [1318, ty + th, 1344, ty + th, 1358, 962, 1330, 962]), leg, LW.small, legSh, () => polyP(g, [1334, ty + th, 1344, ty + th, 1358, 962, 1348, 962]));
    // top
    shape(g, () => rrP(g, x0, ty, x1 - x0, th, 4), '#E9905C', LW.big, '#D47A4C', () => rectP(g, x0, ty + th * 0.55, x1 - x0, th));
    // small plant (terracotta)
    plant(g, 1076, ty + 1, 1, { kind: 'small', pot: X.terracotta, potSh: X.terracottaSh });
    // monitor, side view (ref 09): thin slanted screen facing left, casing behind, neck curving back to a flat base
    const mon = C.officeMonitor, monSh = dark(mon, 0.84);
    shape(g, () => rrP(g, 1158, ty - 9, 96, 11, 4), monSh, LW.small);
    g.beginPath(); g.moveTo(1214, ty - 6); g.quadraticCurveTo(1236, ty - 60, 1206, ty - 118);
    g.lineWidth = 15 + LW.small * 2; g.strokeStyle = INK; g.stroke(); g.lineWidth = 15; g.strokeStyle = monSh; g.stroke();
    shape(g, () => polyP(g, [1178, 386, 1204, 396, 1214, 560, 1190, 572]), monSh, LW.small);
    shape(g, () => polyP(g, [1150, 380, 1180, 376, 1192, 572, 1162, 578]), mon, LW.small, '#DDEBF6', () => polyP(g, [1154, 380, 1160, 380, 1172, 578, 1166, 578]));
    // keyboard
    shape(g, () => polyP(g, [1262, ty - 9, 1336, ty - 9, 1342, ty, 1254, ty]), X.keyboard, LW.detail);
    if (o.night) {
      // desk lamp (warm), drawn lit after the night grade
    }
  }
  function officeChair(g) {
    // office chair facing left (ref 06), seat ~ (1450-1690, 753-809)
    const c = C.officeChair, cs = dark(c, 0.84);
    floorShadow(g, 1572, 960, 125, 16, C.officeFloorShadow, 5);
    // base: pole and star with casters
    shape(g, () => rectP(g, 1560, 800, 22, 90), X.pole, LW.small);
    const legs = [[1478, 932], [1666, 932], [1532, 948], [1618, 948]];
    for (const [lx, ly] of legs) { g.beginPath(); g.moveTo(1571, 890); g.lineTo(lx, ly - 10); g.lineWidth = 14 + LW.small * 2; g.strokeStyle = INK; g.stroke(); g.lineWidth = 14; g.strokeStyle = '#55575C'; g.stroke(); }
    for (const [lx, ly] of legs) { ellP(g, lx, ly - 2, 14, 14); paint(g, X.wheel, LW.small); }
    // back (on the right, the sitter faces left): a rounded pad on a bent post, and a thick seat
    g.beginPath(); g.moveTo(1640, 786); g.quadraticCurveTo(1712, 790, 1712, 720); g.lineWidth = 14 + LW.small * 2; g.strokeStyle = INK; g.stroke(); g.lineWidth = 14; g.strokeStyle = X.pole; g.stroke();
    shape(g, () => { g.save(); g.translate(1716, 640); g.rotate(0.1); rrP(g, -34, -100, 68, 190, 30); g.restore(); }, c, LW.big, cs, () => { g.save(); g.translate(1716, 640); g.rotate(0.1); rectP(g, 4, -110, 40, 210); g.restore(); });
    shape(g, () => rrP(g, 1448, 754, 248, 46, 22), c, LW.big, cs, () => rectP(g, 1440, 780, 270, 30));
  }

  function officeStatic(g, o) {
    const WX = OF.wallX, FY = OF.floorY, view = o.view || 'desk';
    // walls and floor
    rectP(g, WX, 0, W - WX, FY); paint(g, C.officeWallBack, 0);
    rectP(g, 0, FY, W, H - FY); paint(g, C.officeFloor, 0);
    if (view === 'door') officeLeftDoor(g); else officeLeftDesk(g);
    // back wall items
    windowBox(g, 1284, 84, 537, 446, { sky: o.night ? 'night' : 'sunset', seed: 11 });
    clockFace(g, 960, 212, 95, '#E6C39F');
    // big soft light shapes (refs: a darker arc across the top of the back wall, a darker diagonal on the left wall)
    overlay(g, 'multiply', () => {
      clipDo(g, () => rectP(g, WX, 0, W - WX, FY), () => softFill(g, 3, mulTo(C.officeWallBack, C.officeWallBackSh), () => { g.beginPath(); g.moveTo(WX - 20, 112); g.bezierCurveTo(950, 34, 1330, 36, W + 20, 222); g.lineTo(W + 20, -20); g.lineTo(WX - 20, -20); g.closePath(); }));
      const leftClip = view === 'door' ? () => polyP(g, [0, 0, WX, 0, WX, FY, 0, vpY(WX, FY, 0)]) : () => rectP(g, 0, 0, WX, FY);
      clipDo(g, leftClip, () => softFill(g, 3, mulTo(C.officeWallSide, C.officeWallSideSh), () => { g.beginPath(); g.moveTo(WX + 20, 62); g.quadraticCurveTo(330, 112, -20, 270); g.lineTo(-20, -20); g.lineTo(WX + 20, -20); g.closePath(); }));
      // the floor: a long soft darker band at the front, one lighter pool under the window
    });
    if (view === 'door') { const D = officeDoorGeom(); officeDoorFrame(g, D); }
    if (!o.night) for (const [a, b2] of [[1320, 1540], [1575, 1790]]) softFill(g, 10, 'rgba(255,240,200,0.30)', () => polyP(g, [a - 40, FY + 30, b2 - 40, FY + 30, b2 - 330, H + 10, a - 330, H + 10]), 'screen');
    // wall/floor lines
    if (view === 'door') line(g, 0, vpY(WX, FY, 0), WX, FY, LW.arch, INK); else line(g, 0, FY, WX, FY, LW.arch, INK);
    line(g, WX, FY, W, FY, LW.arch, INK);
    line(g, WX, -5, WX, FY, LW.arch, INK);
    // furniture
    if (view !== 'door') officeBackDesk(g);
    plant(g, 704, 837, 1);
    officeHeroDesk(g, o);
    if (o.chair === true) officeChair(g);
    if (o.night) officeNight(g);
  }
  function officeBackDesk(g) {
    const FY = OF.floorY;
    floorShadow(g, 250, FY + 4, 300, 10, C.officeFloorShadow, 4);
    // chair back behind the desk
    shape(g, () => { g.beginPath(); g.moveTo(151, 590); g.lineTo(151, 520); g.quadraticCurveTo(156, 470, 242, 468); g.quadraticCurveTo(328, 470, 332, 520); g.lineTo(332, 590); g.closePath(); }, C.officeChair, LW.big, dark(C.officeChair, 0.88), () => rectP(g, 260, 460, 90, 140));
    // monitor (front view, cropped by the frame edge)
    shape(g, () => rrP(g, -30, 398, 156, 150, 12), C.officeMonitor, LW.big, dark(C.officeMonitor, 0.9), () => polyP(g, [60, 398, 140, 398, 140, 560, 20, 560]));
    shape(g, () => rectP(g, 14, 548, 34, 22), C.officeMonitor, LW.small);
    shape(g, () => rectP(g, -10, 568, 76, 10), C.officeMonitor, LW.small);
    // desk: top and front
    shape(g, () => rectP(g, -10, 600, 533, FY - 600 + 2), '#EB8A57', LW.big, X.deskSh, () => rectP(g, -10, 600, 533, 24));
    shape(g, () => rectP(g, -10, 575, 557, 28), '#E38A5B', LW.big, '#D07A4D', () => rectP(g, -10, 591, 557, 14));
  }
  function officeNight(g) {
    // grade the whole room cool and dark, keeping a warm pool around the desk lamp; then light the lamp and monitor
    const lx = 1290, ly = 560;
    overlay(g, 'multiply', () => {
      const gr = g.createRadialGradient(lx, ly, 40, lx, ly, 1100);
      gr.addColorStop(0, '#F2D2A6'); gr.addColorStop(0.25, '#B49AB0'); gr.addColorStop(0.6, '#7B7AA6'); gr.addColorStop(1, '#5C5F90');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    });
    // window glass stays night-dark (redraw on top so the moon is not dimmed)
    clipDo(g, () => { const x = 1284, y = 84, w = 537, h = 446, t = Math.round(w * 0.055), m = Math.round(w * 0.052), gw = w - 2 * t, pw = (gw - m) / 2; g.beginPath(); g.rect(x + t, y + t, pw, h - 2 * t); g.rect(x + t + pw + m, y + t, pw, h - 2 * t); },
      () => { sky(g, 1284 + 30, 84 + 30, 537 - 60, 446 - 60, 'night', 11); });
    // lamp glow
    softFill(g, 40, 'rgba(255,196,110,0.42)', () => ellP(g, lx, ly + 30, 330, 230), 'screen');
    softFill(g, 24, 'rgba(255,214,140,0.5)', () => polyP(g, [lx - 40, ly - 40, lx + 40, ly - 40, lx + 190, 640, lx - 190, 640]), 'screen');
    // monitor glow on the wall
    softFill(g, 30, 'rgba(170,220,255,0.35)', () => ellP(g, 1110, 470, 90, 120), 'screen');
    // the desk lamp: angled arm, cone shade (lit)
    const base = [1300, 615];
    shape(g, () => ellP(g, base[0], base[1] - 4, 36, 9), '#3E6F78', LW.small);
    g.beginPath(); g.moveTo(base[0], base[1] - 6); g.lineTo(base[0] + 30, 520); g.lineTo(base[0] - 8, 470);
    g.lineWidth = 9 + LW.small * 2; g.strokeStyle = INK; g.stroke(); g.lineWidth = 9; g.strokeStyle = X.teal; g.stroke();
    ellP(g, base[0] + 30, 520, 9, 9); paint(g, X.teal, LW.detail);
    shape(g, () => polyP(g, [base[0] - 8, 452, base[0] - 70, 520, base[0] + 2, 548, base[0] + 22, 470]), X.teal, LW.small, C.hoodieSh || '#2F7280', () => polyP(g, [base[0] - 8, 452, base[0] + 22, 470, base[0] + 2, 548, base[0] - 20, 540]));
    ellP(g, base[0] - 34, 534, 38, 12); g.save(); g.translate(0, 0); paint(g, '#FFE9A8', LW.detail); g.restore();
  }

  function officeAnchors(o) {
    const D = officeDoorGeom();
    return {
      left: { x: 318, y: 962, s: 1 },          // hero standing, ref 11
      right: { x: 1618, y: 962, s: 1 },        // boss standing, ref 11
      center: { x: 900, y: 962, s: 1 },
      desk: { x: 1186, y: 617, s: 1 },         // top of the hero's desk (centre)
      deskPhone: { x: 1265, y: 612, s: 1 },    // a spot on the desk top for the phone
      chair: { x: 1560, y: 760, s: 1 },        // seat of the office chair (hips), sitter faces left
      backDesk: { x: 250, y: 575, s: 1 },
      door: { x: o.view === 'door' ? D.floorMid[0] : 318, y: o.view === 'door' ? 935 : 962, s: o.view === 'door' ? 0.95 : 1 }, // standing in the doorway
      doorway: { x: D.floorMid[0], y: D.floorMid[1], s: 0.95 },
      window: { x: 1552, y: 307, s: 1 },
      clock: { x: 960, y: 212, s: 1, r: 95 },
      plant: { x: 704, y: 837, s: 1 },
    };
  }

  const SETS = {};
  SETS.office = function (g, o) {
    o = o || {};
    const xf = camXf(o.cam), key = 'office|' + (o.view || 'desk') + '|' + (o.night ? 1 : 0) + '|' + (o.chair === true ? 1 : 0);
    blit(g, xf, layer(key, resFor(xf.z), (lg) => officeStatic(lg, o)));
    live(g, xf, (g2) => clockHands(g2, 960, 212, 95, o.clock != null ? o.clock : 17));
    return result(xf, officeAnchors(o), 962, OF.floorY, { tint: o.night ? '#9C98C4' : null });
  };
  SETS.officeFront = function (g, o) {
    o = o || {};
    const xf = camXf(o.cam), parts = o.parts || (o.view === 'door' ? ['door'] : []);
    if (!parts.length) return result(xf, officeAnchors(o), 962, OF.floorY);
    const key = 'officeFront|' + (o.view || 'desk') + '|' + parts.join(',') + '|' + (o.night ? 1 : 0);
    blit(g, xf, layer(key, resFor(xf.z), (lg) => {
      if (parts.includes('door') && o.view === 'door') {
        // the side wall around the opening and the frame: a figure standing in the doorway is seen through the opening
        const D = officeDoorGeom(), WX = OF.wallX, FY = OF.floorY;
        clipDo(lg, () => { lg.beginPath(); polyP(lg, [0, 0, D.outer[2] + 2, 0, D.outer[4] + 2, vpY(WX, FY, D.outer[4]) + 2, 0, vpY(WX, FY, 0) + 2]); lg.moveTo(D.open[0], D.open[1]); lg.lineTo(D.open[6], D.open[7] + 60); lg.lineTo(D.open[4], D.open[5] + 60); lg.lineTo(D.open[2], D.open[3]); lg.closePath(); }, () => officeStatic(lg, o), true);
      }
      if (parts.includes('desk')) officeHeroDesk(lg, o);
    }));
    return result(xf, officeAnchors(o), 962, OF.floorY);
  };

  // ================================================================ LIVING ROOM (refs 03/07)
  const LV = { corner: 1263, floorY: 830 };
  const LIV_PAL = {
    evening: { wall: '#C19280', wallSh: '#B08072', lit: '#EFC995', floor: '#B9714B', floorSh: '#9A5E4C', floorLit: '#DB8F55', rug: '#BE917A', rugSh: '#AE8270',
      sofa: '#A9684C', sofaMid: '#915647', sofaSh: '#7E4A42', pillow: '#DA9855', pillowSh: '#BC8157', curtain: '#CFA387', curtainSh: '#B98E7F',
      door: '#935A47', doorSh: '#82503F', frame: '#AE7156', table: '#CD8B5F', tableTop: '#D99A6C', tableSh: '#9C6752', pot: '#8085A7', leaf: '#5F7357', leafSh: '#4E604A',
      shade: '#FFC55A', shadeSh: '#F4A94A', pole: '#9B8981', winFrame: '#D6976C', picFrame: '#BD7F5B', picA: '#C98F68', picB: '#C07752', base: '#B57658', rod: '#7E6E72', sky: 'evening', lamp: true, tint: '#D2B9C2' },
    morning: { wall: '#EBCDB3', wallSh: '#DDB79D', lit: '#FFF2DC', floor: '#CF915F', floorSh: '#B57A51', floorLit: '#E6AE78', rug: '#E2C2A7', rugSh: '#D1AF94',
      sofa: '#B9775A', sofaMid: '#A3654F', sofaSh: '#8C5546', pillow: '#E8B062', pillowSh: '#D19A55', curtain: '#E3C4AC', curtainSh: '#D2AF97',
      door: '#A86A52', doorSh: '#975E48', frame: '#C4876A', table: '#D99A6C', tableTop: '#E5AA7C', tableSh: '#B27A58', pot: '#8E96BD', leaf: '#6F8A64', leafSh: '#5E7756',
      shade: '#F6DDA8', shadeSh: '#E9C98F', pole: '#A8968E', winFrame: '#E8B78C', picFrame: '#CC8C66', picA: '#DCA27A', picB: '#CF8A62', base: '#C98A6A', rod: '#8C7C7E', sky: 'morning', lamp: false, tint: null },
    dusk: { wall: '#9E7C86', wallSh: '#8A6A78', lit: '#E7B98A', floor: '#8F5A4A', floorSh: '#744842', floorLit: '#C47E52', rug: '#A6817B', rugSh: '#94716D',
      sofa: '#8F5849', sofaMid: '#7B4B42', sofaSh: '#663E3B', pillow: '#C68752', pillowSh: '#A9714B', curtain: '#A3827F', curtainSh: '#8E6F70',
      door: '#7A4C44', doorSh: '#68403B', frame: '#8F6153', table: '#AD7759', tableTop: '#B9825F', tableSh: '#865A4B', pot: '#6E7399', leaf: '#4E604C', leafSh: '#405140',
      shade: '#FFC55A', shadeSh: '#F4A94A', pole: '#8A7A78', winFrame: '#A97F70', picFrame: '#9A6A56', picA: '#A87A64', picB: '#9C6750', base: '#8E6050', rod: '#6A5D66', sky: 'dusk', lamp: true, tint: '#B8A2BC' },
  };
  function livRightFloor(x) { return LV.floorY + 2 + (x - LV.corner) * (62 / (W - LV.corner)); }
  function doorQuad(xl, xr, topL, topR) { return [xl, topL, xr, topR, xr, livRightFloor(xr), xl, livRightFloor(xl)]; }

  function curtain(g, x, y, w, h, P, flip) {
    const path = () => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.quadraticCurveTo(x + w * (flip ? 1.04 : 0.98), y + h * 0.6, x + w * (flip ? 1.1 : 1.02), y + h); g.lineTo(x - w * (flip ? 0.02 : 0.1), y + h); g.quadraticCurveTo(x - w * (flip ? 0.0 : 0.04), y + h * 0.6, x, y); g.closePath(); };
    path(); paint(g, P.curtain, 0);
    clipDo(g, path, () => {
      g.fillStyle = P.curtainSh;
      for (let i = 0; i < 3; i++) { const fx = x + w * (0.18 + i * 0.3); polyP(g, [fx, y, fx + w * 0.11, y, fx + w * 0.13 + (flip ? 4 : -4), y + h, fx - (flip ? -4 : 4), y + h]); g.fill(); }
    });
    g.strokeStyle = INK; g.lineWidth = LW.detail;
    for (let i = 0; i < 4; i++) { const fx = x + w * (0.18 + i * 0.22); g.beginPath(); g.moveTo(fx, y + 18); g.quadraticCurveTo(fx - 3, y + h * 0.6, fx + (flip ? 6 : -6), y + h - 4); g.stroke(); }
    path(); paint(g, null, LW.small);
    // gathered heading under the rod
    for (let i = 0; i < 4; i++) { ellP(g, x + w * (0.125 + i * 0.25), y + 6, w * 0.125, 9); paint(g, P.curtain, LW.detail); }
  }

  function floorLamp(g, x, P) {
    // ref 03: tapered shade (31-209, 248-405), thin pole, round base, pull chain
    const top = 248, bot = 405;
    floorShadow(g, x, 905, 92, 14, P.floorSh, 4);
    shape(g, () => ellP(g, x, 893, 64, 18), P.pole, LW.small, dark(P.pole, 0.85), () => rectP(g, x - 70, 895, 140, 20));
    shape(g, () => rectP(g, x - 6, bot - 4, 12, 890 - bot), P.pole, LW.small);
    line(g, x + 34, bot, x + 34, bot + 70, 2.2); ellP(g, x + 34, bot + 76, 6, 6); paint(g, P.pole, 2);
    shape(g, () => polyP(g, [x - 58, top, x + 58, top, x + 90, bot, x - 90, bot]), P.lamp ? P.shade : P.shade, LW.big, P.shadeSh, () => polyP(g, [x + 22, top, x + 58, top, x + 90, bot, x + 40, bot]));
    if (P.lamp) { softFill(g, 14, 'rgba(255,232,160,0.55)', () => polyP(g, [x - 56, top + 6, x + 56, top + 6, x + 84, bot - 6, x - 84, bot - 6]), 'screen'); polyP(g, [x - 58, top, x + 58, top, x + 90, bot, x - 90, bot]); paint(g, null, LW.big); }
  }

  function sofa(g, P) {
    // frontal mid-century sofa (ref 03), x 188-1151
    floorShadow(g, 670, 925, 520, 34, P.floorSh, 8);
    const legs = [[262, 878, 236, 965], [1078, 878, 1104, 965], [372, 878, 362, 925], [968, 878, 978, 925]];
    for (const [x1, y1, x2, y2] of legs) shape(g, () => polyP(g, [x1 - 13, y1, x1 + 13, y1, x2 + 6, y2, x2 - 6, y2]), '#5C3D39', LW.small);
    // back
    shape(g, () => rrP(g, 236, 527, 868, 250, [46, 46, 10, 10]), P.sofa, LW.big, P.sofaMid, () => rectP(g, 236, 700, 868, 90));
    // seat cushions (top face and front)
    shape(g, () => polyP(g, [318, 722, 1022, 722, 1030, 770, 310, 770]), P.sofa, LW.big, P.sofaMid, () => rectP(g, 300, 756, 740, 20));
    line(g, 670, 724, 670, 770, LW.small);
    shape(g, () => rrP(g, 300, 768, 740, 112, 10), P.sofaMid, LW.big, P.sofaSh, () => rectP(g, 300, 846, 740, 40));
    line(g, 670, 772, 670, 846, LW.small);
    // arms with flared rounded tops, one darker side face each
    const arm = (x0, flip) => {
      const w = 150, sx = flip ? -1 : 1, X0 = flip ? x0 + w : x0;
      shape(g, () => { g.beginPath(); g.moveTo(X0 + sx * 18, 890); g.lineTo(X0 + sx * 6, 690); g.quadraticCurveTo(X0 - sx * 6, 640, X0 + sx * 50, 636); g.lineTo(X0 + sx * (w - 22), 640); g.quadraticCurveTo(X0 + sx * (w + 6), 646, X0 + sx * (w - 4), 700); g.lineTo(X0 + sx * (w - 14), 890); g.closePath(); }, P.sofa, LW.big, P.sofaMid,
        () => polyP(g, [X0 + sx * (w - 48), 700, X0 + sx * (w + 20), 690, X0 + sx * (w + 20), 900, X0 + sx * (w - 40), 900]));
    };
    arm(188, false); arm(1001, true);
    // cushions (mustard), tilted, one shadow half
    const pillow = (cx, cy, rot) => {
      g.save(); g.translate(cx, cy); g.rotate(rot);
      const path = () => { g.beginPath(); g.moveTo(-82, -70); g.quadraticCurveTo(0, -84, 82, -70); g.quadraticCurveTo(94, 0, 82, 70); g.quadraticCurveTo(0, 82, -82, 70); g.quadraticCurveTo(-94, 0, -82, -70); g.closePath(); };
      shape(g, path, P.pillow, LW.big, P.pillowSh, () => polyP(g, [-100, 20, 100, -40, 100, 100, -100, 100]));
      g.restore();
    };
    pillow(395, 655, -0.16); pillow(946, 655, 0.16);
  }

  function coffeeTable(g, P) {
    floorShadow(g, 1075, 1050, 380, 22, P.floorSh, 6);
    const leg = (x1, y1, x2, y2) => shape(g, () => polyP(g, [x1 - 13, y1, x1 + 13, y1, x2 + 7, y2, x2 - 7, y2]), P.table, LW.small, P.tableSh, () => polyP(g, [x1 + 2, y1, x1 + 13, y1, x2 + 7, y2, x2, y2]));
    leg(892, 900, 902, 1000); leg(1258, 900, 1248, 1000);
    leg(748, 905, 724, 1072); leg(1402, 905, 1426, 1072);
    shape(g, () => polyP(g, [744, 830, 1406, 830, 1446, 866, 704, 866]), P.tableTop, LW.big, P.table, () => polyP(g, [1150, 830, 1406, 830, 1446, 866, 1200, 866]));
    shape(g, () => rrP(g, 704, 866, 742, 40, [0, 0, 8, 8]), P.table, LW.big, P.tableSh, () => rectP(g, 704, 890, 742, 20));
  }

  function livingStatic(g, o, tod) {
    const P = LIV_PAL[tod] || LIV_PAL.evening, CX = LV.corner, FY = LV.floorY;
    // walls
    rectP(g, 0, 0, CX, FY); paint(g, P.wall, 0);
    polyP(g, [CX, 0, W, 0, W, livRightFloor(W), CX, livRightFloor(CX)]); paint(g, mix(P.wall, P.wallSh, 0.25), 0);
    // floor
    polyP(g, [0, FY, CX, FY, CX, livRightFloor(CX), W, livRightFloor(W), W, H, 0, H]); paint(g, P.floor, 0);
    // lamp light cones on the left wall (ref 03/07) or the morning beam from the window
    if (P.lamp) {
      clipDo(g, () => rectP(g, 0, 0, CX, FY), () => {
        softFill(g, 70, rgba(P.lit, 0.3), () => ellP(g, 130, 330, 330, 420));
        softFill(g, 5, rgba(P.lit, 0.8), () => polyP(g, [70, 252, 170, 252, 330, -20, -60, -20]));
        softFill(g, 5, rgba(P.lit, 0.8), () => polyP(g, [34, 402, 206, 402, 400, FY + 20, -110, FY + 20]));
      });
      softFill(g, 22, rgba(P.floorLit, 0.85), () => ellP(g, 120, 900, 300, 70));
    } else {
      clipDo(g, () => rectP(g, 0, 0, W, FY + 2), () => softFill(g, 14, rgba(P.lit, 0.45), () => polyP(g, [693, 160, 1010, 160, 1250, FY + 20, 820, FY + 20])));
      softFill(g, 14, rgba(P.lit, 0.4), () => polyP(g, [800, FY + 4, 1260, FY + 4, 1560, H, 980, H]));
    }
    // window, curtains, rod
    windowBox(g, 360, 105, 333, 404, { frame: P.winFrame, sky: P.sky, seed: 5, ink: '#5E3A2A', t: 22, mull: 18 });
    curtain(g, 251, 70, 112, 452, P, false); curtain(g, 690, 70, 112, 452, P, true);
    shape(g, () => rrP(g, 222, 62, 610, 12, 6), P.rod, LW.detail);
    ellP(g, 222, 68, 12, 12); paint(g, P.rod, LW.detail); ellP(g, 832, 68, 12, 12); paint(g, P.rod, LW.detail);
    // picture (two-tone abstract, ref 03)
    shape(g, () => rectP(g, 988, 216, 212, 265), P.picFrame, LW.small);
    shape(g, () => rectP(g, 1002, 230, 184, 237), P.picA, LW.detail, P.picB, () => { g.beginPath(); g.moveTo(1000, 228); g.lineTo(1190, 228); g.lineTo(1190, 300); g.quadraticCurveTo(1090, 330, 1000, 400); g.closePath(); });
    // door with frame on the right wall
    const outer = doorQuad(1423, 1814, 122, 104), inner = doorQuad(1462, 1776, 156, 140);
    shape(g, () => polyP(g, outer), P.frame, LW.small, dark(P.frame, 0.9), () => polyP(g, [outer[0], outer[1], outer[2], outer[3], outer[2], outer[3] + 18, outer[0], outer[1] + 18]));
    shape(g, () => polyP(g, inner), P.door, LW.small, P.doorSh, () => polyP(g, [inner[0], inner[1], inner[0] + 26, inner[1], inner[6] + 26, inner[7], inner[6], inner[7]]));
    for (const hy of [262, 720]) shape(g, () => rrP(g, 1458, hy, 10, 34, 3), '#7A6266', LW.detail);
    shape(g, () => rrP(g, 1728, 494, 22, 72, 6), '#8B7A80', LW.detail);
    shape(g, () => rrP(g, 1690, 500, 58, 14, 7), '#9C8B90', LW.detail);
    ellP(g, 1739, 548, 4, 6); paint(g, '#3A2E30', 0);
    // baseboard on the right wall
    polyP(g, [CX, livRightFloor(CX) - 18, outer[0], livRightFloor(outer[0]) - 18, outer[0], livRightFloor(outer[0]), CX, livRightFloor(CX)]); paint(g, P.base, LW.detail);
    polyP(g, [outer[2], livRightFloor(outer[2]) - 18, W, livRightFloor(W) - 18, W, livRightFloor(W), outer[2], livRightFloor(outer[2])]); paint(g, P.base, LW.detail);
    // top band of shade over both walls (multiply), drawn over the curtains as in the refs
    overlay(g, 'multiply', () => {
      const m = mulTo(P.wall, P.wallSh);
      clipDo(g, () => rectP(g, 0, 0, CX, FY), () => softFill(g, 4, m, () => { g.beginPath(); g.moveTo(240, -20); g.bezierCurveTo(520, 110, 900, 112, CX + 20, 96); g.lineTo(CX + 20, -20); g.closePath(); }));
      clipDo(g, () => rectP(g, CX, 0, W - CX, H), () => softFill(g, 4, m, () => { g.beginPath(); g.moveTo(CX - 20, 80); g.bezierCurveTo(1500, 92, 1780, 170, W + 20, 300); g.lineTo(W + 20, -20); g.lineTo(CX - 20, -20); g.closePath(); }));
      if (P.lamp) clipDo(g, () => rectP(g, 0, 0, CX, FY), () => softFill(g, 6, mulTo(P.wall, P.wallSh), () => polyP(g, [0, 150, 40, 330, 0, 400])));
    });
    // architecture lines
    line(g, CX, -5, CX, livRightFloor(CX), LW.arch * 0.8, '#5E3A2A');
    line(g, 0, FY, CX, FY, LW.arch, INK); line(g, CX, livRightFloor(CX), W, livRightFloor(W), LW.arch, INK);
    // rug (front, in perspective)
    shape(g, () => polyP(g, [490, 950, 1550, 950, 1650, H + 10, 400, H + 10]), P.rug, LW.small, P.rugSh, () => polyP(g, [490, 950, 1550, 950, 1556, 962, 486, 962]));
    // furniture
    plant(g, 1275, 866, 0.95, { pot: P.pot, potSh: dark(P.pot, 0.86), leaf: P.leaf, leafSh: P.leafSh });
    floorShadow(g, 1275, 870, 90, 12, P.floorSh, 4);
    floorLamp(g, 120, P);
    sofa(g, P);
    if (o.table !== false) coffeeTable(g, P);
  }
  function livingAnchors(o) {
    return {
      sofa: { x: 670, y: 742, s: 1 }, sofa_seat_l: { x: 500, y: 742, s: 1 }, sofa_seat_r: { x: 840, y: 742, s: 1 },
      table: { x: 1075, y: 848, s: 1 }, tablePhone: { x: 1180, y: 846, s: 1 },
      door: { x: 1619, y: 975, s: 1 }, window: { x: 527, y: 307, s: 1 }, lamp: { x: 120, y: 326, s: 1 }, plant: { x: 1275, y: 866, s: 1 },
      left: { x: 330, y: 990, s: 1.02 }, right: { x: 1560, y: 990, s: 1.02 }, center: { x: 960, y: 990, s: 1.02 },
    };
  }
  function bird(g, x, y, s, t) {
    const f = Math.sin(t * TAU * 3) * 0.5 + 0.5;
    g.beginPath(); g.moveTo(x - 22 * s, y - (6 + 10 * f) * s); g.quadraticCurveTo(x - 10 * s, y - 10 * s, x, y); g.quadraticCurveTo(x + 10 * s, y - 10 * s, x + 22 * s, y - (6 + 10 * f) * s);
    g.lineWidth = 3.4 * s; g.strokeStyle = '#3C3036'; g.stroke();
  }
  SETS.living = function (g, o) {
    o = o || {};
    const tod = LIV_PAL[o.tod] ? o.tod : 'evening';
    const xf = camXf(o.cam), base = (t) => 'living|' + t + '|' + (o.table === false ? 0 : 1);
    blit(g, xf, layer(base(tod), resFor(xf.z), (lg) => livingStatic(lg, o, tod)));
    if (o.todTo && LIV_PAL[o.todTo] && o.todK > 0) blit(g, xf, layer(base(o.todTo), resFor(xf.z), (lg) => livingStatic(lg, o, o.todTo)), Math.min(1, o.todK));
    if (o.bird != null) live(g, xf, (g2) => clipDo(g2, () => rectP(g2, 382, 127, 289, 360), () => { const k = o.bird; bird(g2, 360 + k * 360, 250 - 40 * Math.sin(k * 3), 1, k * 4); }));
    const P = LIV_PAL[o.todTo && o.todK >= 0.5 ? o.todTo : tod];
    return result(xf, livingAnchors(o), 990, LV.floorY, { tint: P.tint });
  };
  SETS.livingFront = function (g, o) {
    o = o || {};
    const tod = LIV_PAL[o.tod] ? o.tod : 'evening', xf = camXf(o.cam);
    if (o.table !== false) {
      blit(g, xf, layer('livingFront|' + tod, resFor(xf.z), (lg) => coffeeTable(lg, LIV_PAL[tod])));
      if (o.todTo && LIV_PAL[o.todTo] && o.todK > 0) blit(g, xf, layer('livingFront|' + o.todTo, resFor(xf.z), (lg) => coffeeTable(lg, LIV_PAL[o.todTo])), Math.min(1, o.todK));
    }
    return result(xf, livingAnchors(o), 990, LV.floorY);
  };

  // ================================================================ STREET (ref 05)
  const ST = { ledge: (x) => [684 - 49 * x / 1444, 725 - 69 * x / 1444, 851 - 118 * x / 1444] }; // ledge top edge, face top, face bottom at x
  function streetBuildings(g) {
    // pale sky
    rectP(g, 0, 0, W, 900); paint(g, C.stSky, 0);
    // orange stepped building (centre)
    shape(g, () => polyP(g, [700, 209, 963, 209, 963, -10, 1205, -10, 1205, 60, 1360, 60, 1360, 300, 1460, 300, 1460, 760, 700, 760]), C.stOrange, LW.small,
      dark(C.stOrange, 0.93), () => polyP(g, [1290, 60, 1360, 60, 1360, 300, 1460, 300, 1460, 760, 1290, 760]));
    // soft diagonal light across it
    clipDo(g, () => polyP(g, [700, 209, 963, 209, 963, -10, 1205, -10, 1205, 60, 1360, 60, 1360, 300, 1460, 300, 1460, 760, 700, 760]),
      () => softFill(g, 12, 'rgba(255,236,170,0.35)', () => polyP(g, [930, -10, 1080, -10, 820, 760, 670, 760])));
    // tan building behind the tree
    shape(g, () => rectP(g, 420, -10, 300, 770), C.stTan, LW.small, dark(C.stTan, 0.92), () => rectP(g, 660, -10, 60, 770));
    // brick building (left) with dark windows and a shadow side
    shape(g, () => rectP(g, -10, -10, 440, 770), C.stBrickBldg, LW.small, dark(C.stBrickBldg, 0.88), () => rectP(g, 392, -10, 40, 770));
    for (const [wx, ww] of [[-20, 70], [112, 74], [244, 72]]) for (const [wy, wh] of [[21, 160], [258, 156]]) {
      shape(g, () => rectP(g, wx, wy, ww, wh), C.stBrickWin, LW.small, dark(C.stBrickWin, 0.85), () => rectP(g, wx, wy, ww, 14));
    }
  }
  function streetGround(g) {
    const L = ST.ledge;
    // low wall: top face and front face
    polyP(g, [0, L(0)[0], 1460, L(1460)[0], 1460, L(1460)[1], 0, L(0)[1]]); paint(g, C.stLedgeTop, LW.small);
    polyP(g, [0, L(0)[1], 1460, L(1460)[1], 1460, L(1460)[2], 0, L(0)[2]]); paint(g, C.stLedgeFace, LW.small);
    // pavement
    polyP(g, [0, L(0)[2], 1460, L(1460)[2], W, 700, W, H, 0, H]); paint(g, C.stPave, 0);
    // a long soft light band and slab joints in perspective
    softFill(g, 20, 'rgba(255,248,210,0.3)', () => polyP(g, [0, 900, 1600, 760, 1920, 800, 0, 1010]));
    g.strokeStyle = C.stPaveLine; g.lineWidth = 3;
    const lines = [[0, 905, 1920, 742], [0, 1062, 1920, 860], [520, 772, 120, H], [1040, 742, 860, H], [1560, 760, 1720, H], [300, 820, -60, 1000]];
    for (const [a, b, c, d] of lines) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
    line(g, 0, L(0)[2], 1460, L(1460)[2], LW.small, INK);
  }
  function streetTree(g) {
    floorShadow(g, 512, 700, 70, 9, dark(C.stLedgeTop, 0.85), 3);
    // trunk forking below the canopy, branches running up into it
    const trunkPath = () => { g.beginPath(); g.moveTo(494, 690); g.lineTo(500, 560); g.lineTo(440, 470); g.lineTo(458, 460); g.lineTo(510, 530); g.lineTo(522, 440); g.lineTo(540, 444); g.lineTo(530, 560); g.lineTo(534, 690); g.closePath(); };
    shape(g, trunkPath, C.stTrunk, LW.small, dark(C.stTrunk, 0.85), () => rectP(g, 518, 430, 30, 270));
    // canopy: a scalloped blob, lower right in shade; outline drawn once around the union
    const pts = [[506, 150, 70], [440, 205, 62], [600, 205, 64], [400, 300, 66], [630, 300, 62], [430, 392, 56], [584, 400, 60], [506, 280, 110], [506, 380, 60]];
    const blob = () => { g.beginPath(); for (const [x, y, r] of pts) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } };
    const fillBlob = () => { blob(); g.fillStyle = C.stTree; g.fill(); g.save(); blob(); g.clip(); g.beginPath(); g.ellipse(610, 400, 150, 120, -0.5, 0, TAU); g.fillStyle = C.stTreeSh; g.fill(); g.restore(); };
    g.lineWidth = LW.small * 2; g.strokeStyle = INK; blob(); g.stroke();
    fillBlob();
  }
  function streetLamp(g) {
    floorShadow(g, 209, 888, 54, 9, C.stShadow, 3);
    const post = C.stPost, sh = dark(post, 0.86);
    shape(g, () => rectP(g, 197, -20, 26, 600), post, LW.small, sh, () => rectP(g, 212, -20, 11, 600));
    shape(g, () => polyP(g, [188, 600, 232, 600, 246, 880, 174, 880]), post, LW.small, sh, () => polyP(g, [214, 600, 232, 600, 246, 880, 224, 880]));
    shape(g, () => rrP(g, 180, 572, 60, 30, 8), post, LW.small);
    shape(g, () => rrP(g, 168, 872, 84, 16, 5), post, LW.small);
  }
  function streetNear(g) {
    // near building on the right: brick quoins on its corner, orange-red wall, door
    shape(g, () => polyP(g, [1530, -10, W + 10, -10, W + 10, 912, 1530, 892]), C.stRight, LW.small, dark(C.stRight, 0.93), () => polyP(g, [1530, -10, 1600, -10, 1600, 894, 1530, 892]));
    softFill(g, 14, 'rgba(255,220,170,0.25)', () => polyP(g, [1640, -10, 1760, -10, 1560, 900, 1440, 900]));
    // door
    shape(g, () => rectP(g, 1752, 314, 200, 590), C.stDoorFrame, LW.small);
    shape(g, () => rectP(g, 1796, 356, 160, 548), C.stDoor, LW.small, dark(C.stDoor, 0.88), () => rectP(g, 1796, 356, 160, 20));
    shape(g, () => rectP(g, 1832, 396, 120, 226), C.stDoorGlass, LW.small, dark(C.stDoorGlass, 0.86), () => polyP(g, [1832, 396, 1952, 396, 1832, 520]));
    // quoins: alternate long/short blocks
    let y = -10, i = 0;
    while (y < 892) { const h = 82, long = i % 2 === 0; shape(g, () => rectP(g, 1444, y, long ? 150 : 104, h), C.stPier, LW.small, dark(C.stPier, 0.9), () => rectP(g, 1444, y + h - 14, 150, 14)); y += h; i++; }
  }
  function streetStatic(g, o) {
    streetBuildings(g); streetGround(g); streetTree(g); streetLamp(g); streetNear(g);
  }
  function streetAnchors() {
    return { left: { x: 765, y: 962, s: 1 }, right: { x: 1220, y: 962, s: 1 }, center: { x: 990, y: 962, s: 1 }, far: { x: 980, y: 860, s: 0.85 },
      corner: { x: 1444, y: 960, s: 1 }, lamp: { x: 209, y: 886, s: 1 }, offL: { x: -200, y: 962, s: 1 }, offR: { x: 2120, y: 962, s: 1 } };
  }
  SETS.street = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('street', resFor(xf.z), (lg) => streetStatic(lg, o)));
    return result(xf, streetAnchors(), 962, 851);
  };
  SETS.streetFront = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('streetFront', resFor(xf.z), (lg) => streetNear(lg)));
    return result(xf, streetAnchors(), 962, 851);
  };

  // ================================================================ PLAIN (ref 08)
  SETS.plain = function (g, o) {
    o = o || {}; const col = o.color || X.plain, vig = o.vignette == null ? 0.1 : o.vignette;
    const xf = camXf(o.cam);
    blit(g, xf, layer('plain|' + col + '|' + vig, 1, (lg) => {
      lg.fillStyle = col; lg.fillRect(0, 0, W, H);
      if (vig > 0) overlay(lg, 'multiply', () => { const gr = lg.createRadialGradient(W / 2, H * 0.46, H * 0.35, W / 2, H * 0.5, H * 1.05); gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(1, mix('#FFFFFF', dark(col, 0.7), vig * 1.5)); lg.fillStyle = gr; lg.fillRect(0, 0, W, H); });
    }));
    return result(xf, { center: { x: 960, y: 1180, s: 1.15 }, left: { x: 560, y: 1180, s: 1.15 }, right: { x: 1360, y: 1180, s: 1.15 }, stand: { x: 960, y: 980, s: 1 } }, 1180, 1080);
  };

  // ================================================================ shared room helpers
  function wallBand(g, wall, wallSh, clipRect, curve) {
    overlay(g, 'multiply', () => clipDo(g, () => rectP(g, clipRect[0], clipRect[1], clipRect[2], clipRect[3]), () => softFill(g, 4, mulTo(wall, wallSh), () => { g.beginPath(); g.moveTo(curve[0], curve[1]); g.bezierCurveTo(curve[2], curve[3], curve[4], curve[5], curve[6], curve[7]); g.lineTo(curve[6], -20); g.lineTo(curve[0], -20); g.closePath(); })));
  }
  function planks(g, y0, col, lineCol) {
    rectP(g, 0, y0, W, H - y0); paint(g, col, 0);
    g.strokeStyle = lineCol; g.lineWidth = 3;
    const rows = []; let y = y0, h = 26; while (y < H) { rows.push(y); y += h; h *= 1.22; }
    rows.forEach((ry, i) => { if (i) { g.beginPath(); g.moveTo(0, ry); g.lineTo(W, ry); g.stroke(); } const nh = (rows[i + 1] || H) - ry; for (let x = (i * 337) % 520 + 80; x < W; x += 520) { g.beginPath(); g.moveTo(x, ry); g.lineTo(x - 6, ry + nh); g.stroke(); } });
  }
  function box(g, x, y, w, h, o) {
    o = o || {}; const top = o.top == null ? Math.min(34, h * 0.16) : o.top;
    const bc = C.box, bs = C.boxSh, bt = C.boxTop;
    // top face (thin, perspective), front face with one shadow band on the right, tape, marker scribble
    if (top > 0) { shape(g, () => polyP(g, [x + 10, y - top, x + w - 10, y - top, x + w, y, x, y]), bt, LW.small); if (!o.open) { rectP(g, x + w / 2 - 18, y - top, 36, top); paint(g, C.tape, LW.detail); } }
    if (o.open) {
      shape(g, () => polyP(g, [x + 4, y, x + w * 0.46, y, x + w * 0.38, y - h * 0.32, x - w * 0.06, y - h * 0.26]), bt, LW.small, bs, () => polyP(g, [x - 20, y - h * 0.4, x + w * 0.12, y - h * 0.4, x + w * 0.2, y + 2, x - 20, y]));
      shape(g, () => polyP(g, [x + w * 0.54, y, x + w - 4, y, x + w * 1.08, y - h * 0.24, x + w * 0.64, y - h * 0.32]), bt, LW.small);
    }
    shape(g, () => rectP(g, x, y, w, h), bc, LW.big, bs, () => polyP(g, [x + w * 0.78, y, x + w, y, x + w, y + h, x + w * 0.72, y + h]));
    if (!o.open) { rectP(g, x + w / 2 - 18, y, 36, Math.min(h * 0.32, 70)); paint(g, C.tape, LW.detail); }
    if (o.label !== false) {
      g.strokeStyle = '#2a2a2a'; g.lineWidth = 4.5; g.beginPath();
      const lx = x + w * 0.16, ly = y + h * 0.58, lw2 = w * 0.36;
      g.moveTo(lx, ly); for (let i = 1; i <= 6; i++) g.lineTo(lx + lw2 * i / 6, ly + (i % 2 ? -10 : 6)); g.stroke();
      g.beginPath(); g.moveTo(lx + 4, ly + 30); g.lineTo(lx + lw2 * 0.7, ly + 26); g.stroke();
    }
  }

  // ================================================================ MUM'S KITCHEN
  const KI = { wall: '#F8DAA2', wallSh: '#EDC28A', tile: '#FFF3DA', tileLine: '#EAD3AE', cab: '#7DBAB4', cabSh: '#66A39E', cabLow: '#5E9E9F', cabLowSh: '#4F8889', top: '#D9A06A', topSh: '#BD8456', floor: '#D88E5E', floorB: '#E5A070', fridge: '#F4EEE3', fridgeSh: '#DDD3C3' };
  function kitchenIsland(g) {
    floorShadow(g, 960, 1070, 520, 26, '#B8734A', 8);
    shape(g, () => rectP(g, 470, 868, 980, 260), KI.cabLow, LW.big, KI.cabLowSh, () => rectP(g, 1300, 868, 150, 260));
    for (const x of [710, 960, 1210]) line(g, x, 900, x, 1100, LW.small);
    for (const x of [690, 730, 940, 980, 1190, 1230]) { ellP(g, x, 960, 7, 7); paint(g, '#F4E3C3', LW.detail); }
    shape(g, () => rrP(g, 440, 836, 1040, 38, 8), KI.top, LW.big, KI.topSh, () => rectP(g, 440, 858, 1040, 20));
    // teapot and cup on the island
    shape(g, () => { g.beginPath(); g.ellipse(640, 790, 62, 50, 0, Math.PI * 0.95, Math.PI * 2.05); g.lineTo(700, 836); g.lineTo(580, 836); g.closePath(); }, '#E37F78', LW.small, '#C9665F', () => rectP(g, 650, 730, 70, 110));
    shape(g, () => polyP(g, [698, 800, 744, 770, 750, 778, 706, 820]), '#E37F78', LW.small);
    shape(g, () => rrP(g, 616, 732, 48, 14, 6), '#E37F78', LW.small);
    shape(g, () => { g.beginPath(); g.moveTo(1240, 800); g.lineTo(1300, 800); g.lineTo(1294, 836); g.lineTo(1246, 836); g.closePath(); }, '#FFFFFF', LW.small, '#E9E2D6', () => rectP(g, 1276, 790, 30, 50));
    g.beginPath(); g.arc(1306, 816, 12, -1.2, 1.2); g.lineWidth = LW.small; g.strokeStyle = INK; g.stroke();
  }
  function kitchenStatic(g, o) {
    const FY = 880;
    rectP(g, 0, 0, W, FY); paint(g, KI.wall, 0);
    // floor: two-tone terracotta tiles in rows
    rectP(g, 0, FY, W, H - FY); paint(g, KI.floor, 0);
    { let y = FY, h = 40, row = 0; while (y < H) { const tw = 120 + row * 30; for (let x = -(row % 2) * tw / 2; x < W; x += tw * 2) { rectP(g, x, y, tw, h); paint(g, KI.floorB, 0); } y += h; h *= 1.25; row++; }
      g.strokeStyle = '#C47A4D'; g.lineWidth = 2.5; y = FY; h = 40; while (y < H) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); y += h; h *= 1.25; } }
    // splashback tiles
    rectP(g, 0, 440, W, 190); paint(g, KI.tile, 0);
    g.strokeStyle = KI.tileLine; g.lineWidth = 2.5;
    for (let y = 440; y <= 630; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (let x = 0; x <= W; x += 64) { g.beginPath(); g.moveTo(x, 440); g.lineTo(x, 630); g.stroke(); }
    line(g, 0, 440, W, 440, LW.detail);
    // window with a scalloped valance
    windowBox(g, 800, 150, 400, 270, { sky: o.sky || 'sunset', seed: 21, frame: '#F6E3BE', t: 22, mull: 18, sill: false });
    shape(g, () => rectP(g, 780, 420, 440, 24), '#F6E3BE', LW.small, '#E3CBA0', () => rectP(g, 780, 434, 440, 12), X.inkSoft);
    shape(g, () => { g.beginPath(); g.moveTo(784, 138); g.lineTo(1216, 138); g.lineTo(1216, 196); for (let i = 7; i >= 0; i--) { const x = 784 + i * 54; g.arc(x + 27, 196, 27, 0, Math.PI, false); } g.closePath(); }, C.bubRed, LW.small, '#CF6A63', () => rectP(g, 784, 138, 432, 18));
    plant(g, 1120, 420, 0.9, { kind: 'small', pot: '#F2F0EA', potSh: '#D8D4CA' });
    // upper cabinets
    const upper = (x, w) => {
      shape(g, () => rectP(g, x, 110, w, 300), KI.cab, LW.big, KI.cabSh, () => rectP(g, x, 380, w, 30));
      const n = Math.round(w / 170); for (let i = 1; i < n; i++) line(g, x + w * i / n, 110, x + w * i / n, 410, LW.small);
      for (let i = 0; i < n; i++) { const kx = x + w * (i + 0.5) / n + (i % 2 ? -w / n * 0.36 : w / n * 0.36); ellP(g, kx, 360, 8, 8); paint(g, '#F4E3C3', LW.detail); }
    };
    upper(90, 640); upper(1290, 270);
    // utensil rail with ladle, spatula, whisk
    line(g, 160, 470, 640, 470, 5);
    const hook = (x, len, kind) => {
      line(g, x, 470, x, 470 + len, 5, INK); line(g, x, 470, x, 470 + len, 2.5, '#B0B5BA');
      if (kind === 0) { ellP(g, x, 470 + len + 18, 22, 18); paint(g, '#B0B5BA', LW.detail); }
      else if (kind === 1) { rrP(g, x - 18, 470 + len, 36, 40, 6); paint(g, '#E2A35E', LW.detail); }
      else { ellP(g, x, 470 + len + 10, 14, 26); paint(g, null, LW.detail); }
    };
    hook(250, 70, 0); hook(360, 60, 1); hook(470, 64, 2); hook(570, 74, 0);
    // fridge
    floorShadow(g, 1735, FY + 4, 170, 10, '#B8734A', 4);
    shape(g, () => rrP(g, 1590, 120, 290, FY - 120, 18), KI.fridge, LW.big, KI.fridgeSh, () => rectP(g, 1830, 110, 60, FY));
    line(g, 1592, 420, 1878, 420, LW.small);
    shape(g, () => rrP(g, 1612, 300, 16, 90, 8), '#C9CED3', LW.small); shape(g, () => rrP(g, 1612, 450, 16, 120, 8), '#C9CED3', LW.small);
    for (const [mx, my, mc] of [[1700, 220, C.bubRed], [1760, 260, C.bubYellow], [1730, 520, C.bubBlue]]) { ellP(g, mx, my, 14, 14); paint(g, mc, LW.detail); }
    shape(g, () => { g.save(); g.translate(1760, 590); g.rotate(0.06); rectP(g, -48, -58, 96, 116); g.restore(); }, '#FFFFFF', LW.detail);
    g.save(); g.translate(1760, 590); g.rotate(0.06); ellP(g, -10, -14, 18, 18); paint(g, C.bubYellow, 2); g.beginPath(); g.moveTo(-40, 40); g.quadraticCurveTo(0, 10, 40, 40); g.lineWidth = 3; g.strokeStyle = C.leaf; g.stroke(); g.restore();
    // counter: lower cabinets, worktop
    shape(g, () => rectP(g, -10, 652, 1600, 210), KI.cabLow, LW.big, KI.cabLowSh, () => rectP(g, -10, 652, 1600, 22));
    for (let x = 190; x < 1590; x += 200) line(g, x, 674, x, 862, LW.small);
    for (let x = 90; x < 1590; x += 200) { ellP(g, x + (x % 400 < 200 ? 70 : -70), 720, 8, 8); paint(g, '#F4E3C3', LW.detail); }
    shape(g, () => rectP(g, -10, 862, 1600, 20), '#3F6E70', LW.small);
    shape(g, () => rrP(g, -14, 618, 1610, 38, 6), KI.top, LW.big, KI.topSh, () => rectP(g, -14, 640, 1610, 20));
    // worktop objects: utensil crock, kettle, mug, chopping board, fruit bowl
    shape(g, () => rrP(g, 230, 540, 70, 80, 10), '#F2F0EA', LW.small, '#D8D4CA', () => rectP(g, 276, 530, 30, 100));
    for (const [dx, dh] of [[-14, 70], [4, 86], [18, 64]]) { line(g, 265 + dx, 540, 265 + dx * 1.6, 540 - dh, 10); line(g, 265 + dx, 540, 265 + dx * 1.6, 540 - dh, 5, '#C98E5A'); ellP(g, 265 + dx * 1.6, 540 - dh, 9, 13); paint(g, '#C98E5A', LW.detail); }
    // kettle (coral)
    shape(g, () => { g.beginPath(); g.moveTo(430, 618); g.lineTo(560, 618); g.quadraticCurveTo(566, 520, 520, 500); g.lineTo(470, 500); g.quadraticCurveTo(424, 520, 430, 618); g.closePath(); }, C.bubRed, LW.small, '#C9665F', () => polyP(g, [520, 490, 580, 490, 580, 630, 524, 630]));
    shape(g, () => polyP(g, [438, 560, 398, 530, 392, 538, 432, 590]), C.bubRed, LW.small);
    g.beginPath(); g.moveTo(462, 502); g.quadraticCurveTo(495, 440, 528, 502); g.lineWidth = 9 + LW.small * 2; g.strokeStyle = INK; g.stroke(); g.lineWidth = 9; g.strokeStyle = '#3F3F44'; g.stroke();
    shape(g, () => rrP(g, 640, 560, 54, 58, 8), X.teal, LW.small, C.hoodieSh || '#2F7280', () => rectP(g, 672, 550, 30, 80));
    g.beginPath(); g.arc(694, 588, 14, -1.3, 1.3); g.lineWidth = LW.small; g.strokeStyle = INK; g.stroke();
    shape(g, () => { g.save(); g.translate(1010, 560); g.rotate(-0.12); rrP(g, -70, -90, 140, 180, 26); g.restore(); }, '#E2B07A', LW.small, '#CF9B66', () => { g.save(); g.translate(1010, 560); g.rotate(-0.12); rectP(g, 30, -100, 50, 200); g.restore(); });
    g.save(); g.translate(1010, 560); g.rotate(-0.12); ellP(g, 0, -64, 12, 12); paint(g, KI.tile, LW.detail); g.restore();
    for (const [fx, fy, fc] of [[1260, 580, '#F4A454'], [1300, 572, '#F4A454'], [1338, 584, C.bubRed], [1282, 556, '#9ACB6A']]) { ellP(g, fx, fy, 24, 24); paint(g, fc, LW.small); }
    shape(g, () => { g.beginPath(); g.moveTo(1220, 588); g.lineTo(1380, 588); g.quadraticCurveTo(1370, 620, 1340, 618); g.lineTo(1260, 618); g.quadraticCurveTo(1230, 620, 1220, 588); g.closePath(); }, '#F2F0EA', LW.small, '#D8D4CA', () => rectP(g, 1300, 580, 90, 50));
    // light: wall band and soft window beams
    wallBand(g, KI.wall, KI.wallSh, [0, 0, W, 440], [-20, 120, 600, 30, 1400, 30, W + 20, 140]);
    clipDo(g, () => rectP(g, 0, 440, 1590, 178), () => softFill(g, 12, 'rgba(255,248,226,0.4)', () => polyP(g, [820, 444, 1180, 444, 1300, FY, 760, FY]), 'screen'));
    softFill(g, 14, 'rgba(255,244,214,0.3)', () => polyP(g, [760, FY + 2, 1300, FY + 2, 1460, H, 640, H]), 'screen');
    line(g, 0, FY, 1590, FY, LW.arch);
    if (o.island) kitchenIsland(g);
  }
  function kitchenAnchors() { return { center: { x: 960, y: 985, s: 1 }, left: { x: 600, y: 985, s: 1 }, right: { x: 1320, y: 985, s: 1 }, counter: { x: 960, y: 620, s: 1 }, window: { x: 1000, y: 285, s: 1 }, island: { x: 960, y: 836, s: 1 } }; }
  SETS.mumKitchen = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('kitchen|' + (o.sky || 'sunset') + '|' + (o.island ? 1 : 0), resFor(xf.z), (lg) => kitchenStatic(lg, o)));
    return result(xf, kitchenAnchors(), 985, 880);
  };
  SETS.mumKitchenFront = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('kitchenFront', resFor(xf.z), (lg) => kitchenIsland(lg)));
    return result(xf, kitchenAnchors(), 985, 880);
  };

  // ================================================================ FRIEND'S FLAT (moving boxes; colours from ref 10)
  const FF = { wall: '#EBDCBF', wallSh: '#DCC8A3', floor: '#C79764', floorLine: '#A37850', skirt: '#E2D3B6', curtain: '#6C8FAB', curtainSh: '#5B7C97', frame: '#F3EAD6' };
  function flatFrontBoxes(g) {
    floorShadow(g, 1700, 1086, 300, 24, '#9A7048', 8);
    box(g, 1460, 900, 520, 240, { top: 40 });
    box(g, 1560, 700, 340, 200, { top: 34, open: true });
  }
  function flatStatic(g, o) {
    const FY = 846;
    rectP(g, 0, 0, W, FY); paint(g, FF.wall, 0);
    planks(g, FY, FF.floor, FF.floorLine);
    // ghosts of pictures that were taken down, and their nails
    for (const [x, y, w, h] of [[560, 200, 230, 280], [840, 250, 120, 150]]) { rectP(g, x, y, w, h); paint(g, '#F4E9D2', 0); ellP(g, x + w / 2, y - 16, 4, 4); paint(g, '#6A5A4A', 0); }
    // window with blue curtains (ref 10)
    windowBox(g, 1260, 110, 500, 450, { sky: o.sky || 'sunset', seed: 31, frame: FF.frame, ink: '#6B5A48', t: 24, mull: 20 });
    const cur = (x, flip) => {
      const path = () => { g.beginPath(); g.moveTo(x, 78); g.lineTo(x + 130, 78); g.quadraticCurveTo(x + 134 + (flip ? 10 : -10), 360, x + 136 + (flip ? 14 : -6), 600); g.lineTo(x - (flip ? -6 : 14), 600); g.quadraticCurveTo(x - 4, 360, x, 78); g.closePath(); };
      shape(g, path, FF.curtain, LW.small, FF.curtainSh, () => { g.beginPath(); for (const fx of [x + 26, x + 78]) { g.rect(fx, 70, 22, 540); } });
      g.strokeStyle = INK; g.lineWidth = LW.detail; for (const fx of [x + 48, x + 102]) { g.beginPath(); g.moveTo(fx, 96); g.lineTo(fx + (flip ? 6 : -6), 590); g.stroke(); }
    };
    cur(1160, false); cur(1730, true);
    shape(g, () => rrP(g, 1130, 64, 760, 14, 7), '#9C9C9A', LW.detail); ellP(g, 1130, 71, 12, 12); paint(g, '#9C9C9A', LW.detail); ellP(g, 1890, 71, 12, 12); paint(g, '#9C9C9A', LW.detail);
    wallBand(g, FF.wall, FF.wallSh, [0, 0, W, FY], [-20, 150, 500, 40, 1300, 20, W + 20, 120]);
    softFill(g, 14, 'rgba(255,246,226,0.45)', () => polyP(g, [1290, 600, 1730, 600, 1300, FY, 760, FY]));
    softFill(g, 14, 'rgba(255,240,210,0.35)', () => polyP(g, [760, FY + 4, 1300, FY + 4, 1000, H, 360, H]));
    // skirting
    shape(g, () => rectP(g, -10, FY - 22, W + 20, 22), FF.skirt, LW.small);
    // stacks of moving boxes
    floorShadow(g, 300, FY + 30, 290, 18, '#9A7048', 6);
    box(g, 60, 600, 440, 262, {}); box(g, 110, 400, 340, 200, { top: 30 }); box(g, 190, 268, 190, 132, { top: 24, label: false });
    floorShadow(g, 700, FY + 26, 170, 14, '#9A7048', 6);
    box(g, 560, 690, 300, 172, {}); box(g, 590, 548, 240, 142, { top: 28, open: true });
    // rolled rug leaning, terracotta plant waiting to move, one box by the window
    shape(g, () => { g.save(); g.translate(1050, 860); g.rotate(-0.12); rrP(g, -32, -450, 64, 452, 30); g.restore(); }, '#C66A55', LW.small, '#A8564A', () => { g.save(); g.translate(1050, 860); g.rotate(-0.12); rectP(g, 8, -470, 40, 480); g.restore(); });
    g.save(); g.translate(1050, 860); g.rotate(-0.12);
    for (const by of [-330, -120]) { rectP(g, -33, by, 66, 12); paint(g, '#E8D5A8', LW.detail); }
    ellP(g, 0, -446, 32, 13); paint(g, '#E9B07A', LW.small);
    g.beginPath(); g.ellipse(0, -446, 20, 8, 0, 0.3, TAU * 0.9); g.lineWidth = LW.detail; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.ellipse(0, -446, 9, 3.5, 0, 0.3, TAU * 0.85); g.stroke();
    g.restore();
    floorShadow(g, 1620, FY + 34, 180, 14, '#9A7048', 6);
    box(g, 1470, 712, 300, 160, { top: 28 });
    plant(g, 1330, 876, 0.75, { pot: '#BE7552', potSh: '#A5623F', leaf: '#7FA25F', leafSh: '#6A8A4E' });
    if (o.front !== false && o.frontInBg) flatFrontBoxes(g);
  }
  function flatAnchors() { return { center: { x: 960, y: 985, s: 1 }, left: { x: 640, y: 985, s: 1 }, right: { x: 1300, y: 985, s: 1 }, window: { x: 1510, y: 335, s: 1 }, boxes: { x: 280, y: 600, s: 1 } }; }
  SETS.friendFlat = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('flat|' + (o.sky || 'sunset'), resFor(xf.z), (lg) => flatStatic(lg, o)));
    return result(xf, flatAnchors(), 985, 846);
  };
  SETS.friendFlatFront = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('flatFront', resFor(xf.z), (lg) => flatFrontBoxes(lg)));
    return result(xf, flatAnchors(), 985, 846);
  };

  // ================================================================ PARTY (hook montage)
  const PA = { wall: '#F4BB98', wallSh: '#E6A27F', floor: '#C98B5E', floorLine: '#A9714B', cloth: '#5FB0B5', clothSh: '#4A969B', frame: '#E9A97C' };
  const CHAIN = ['#3A8594', '#F4BF54', '#E37F78', '#7BAFE1', '#77CC81'];
  function paperChain(g, x0, y0, x1, y1, sag, n, phase) {
    const pt = (t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + sag * 4 * t * (1 - t)];
    for (let i = 0; i <= n; i++) {
      const t = i / n, [x, y] = pt(t), [xa, ya] = pt(Math.min(1, t + 0.01)), a = Math.atan2(ya - y, xa - x);
      g.save(); g.translate(x, y); g.rotate(a);
      const col = CHAIN[(i + phase) % CHAIN.length];
      if (i % 2 === 0) { ellP(g, 0, 0, 26, 17); g.lineWidth = 9 + LW.detail * 2; g.strokeStyle = INK; g.stroke(); g.lineWidth = 9; g.strokeStyle = col; g.stroke(); }
      else { ellP(g, 0, 0, 24, 7); g.lineWidth = 8 + LW.detail * 2; g.strokeStyle = INK; g.stroke(); g.lineWidth = 8; g.strokeStyle = col; g.stroke(); }
      g.restore();
    }
  }
  function rosette(g, x, y, r, col) { // paper fan rosette
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; polyP(g, [x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a + TAU / 12) * r, y + Math.sin(a + TAU / 12) * r]); paint(g, i % 2 ? col : dark(col, 0.85), 0); }
    g.beginPath(); for (let i = 0; i <= 12; i++) { const a = i / 12 * TAU; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); paint(g, null, LW.detail);
    ellP(g, x, y, r * 0.28, r * 0.28); paint(g, '#FFF4E3', LW.detail);
  }
  function bunting(g, x0, y0, x1, y1, sag, n) {
    const pt = (t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + sag * 4 * t * (1 - t)];
    g.beginPath(); for (let i = 0; i <= 40; i++) { const [x, y] = pt(i / 40); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
    for (let i = 0; i < n; i++) { const [ax, ay] = pt((i + 0.15) / n), [bx, by] = pt((i + 0.85) / n); const mx = (ax + bx) / 2, my = (ay + by) / 2 + 70; shape(g, () => polyP(g, [ax, ay, bx, by, mx, my]), CHAIN[(i + 2) % CHAIN.length], LW.detail, null, null); }
  }
  function balloon(g, x, y, r, col, tx, ty) {
    g.beginPath(); g.moveTo(x, y + r * 1.2 + 10); g.bezierCurveTo(x - 30, y + r * 1.6 + 60, x + 30, (y + ty) / 2 + 60, tx, ty); g.lineWidth = 2.6; g.strokeStyle = INK; g.stroke();
    shape(g, () => { g.beginPath(); g.moveTo(x, y + r * 1.2); g.bezierCurveTo(x - r * 1.35, y + r * 0.6, x - r * 1.1, y - r * 1.2, x, y - r * 1.15); g.bezierCurveTo(x + r * 1.1, y - r * 1.2, x + r * 1.35, y + r * 0.6, x, y + r * 1.2); g.closePath(); }, col, LW.small, dark(col, 0.85), () => { g.beginPath(); g.ellipse(x + r * 0.5, y + r * 0.35, r * 0.75, r * 1.1, -0.3, 0, TAU); });
    shape(g, () => polyP(g, [x - 9, y + r * 1.32, x + 9, y + r * 1.32, x, y + r * 1.18]), col, LW.detail);
    ellP(g, x - r * 0.42, y - r * 0.5, r * 0.13, r * 0.24); g.fillStyle = 'rgba(255,255,255,0.65)'; g.fill();
  }
  function snackTable(g) {
    floorShadow(g, 1310, 975, 360, 22, '#9C6644', 7);
    for (const x of [1010, 1610]) shape(g, () => rectP(g, x - 12, 820, 24, 150), '#9C6A48', LW.small);
    // tablecloth: top face, draped front with folds and a scalloped hem
    shape(g, () => polyP(g, [990, 636, 1630, 636, 1650, 662, 970, 662]), PA.cloth, LW.big);
    shape(g, () => { g.beginPath(); g.moveTo(970, 662); g.lineTo(1650, 662); g.lineTo(1656, 830); for (let i = 9; i >= 0; i--) { const x = 964 + i * 69.2; g.quadraticCurveTo(x + 34.6, 856, x, 830); } g.closePath(); }, PA.cloth, LW.big, PA.clothSh,
      () => { g.beginPath(); for (const x of [1060, 1250, 1440, 1610]) g.rect(x, 650, 34, 220); });
    // chips bowl, cake with candles, cups, jug
    shape(g, () => { g.beginPath(); g.moveTo(1030, 610); for (let i = 0; i < 7; i++) g.lineTo(1040 + i * 20, 590 - (i % 2) * 18); g.lineTo(1170, 610); g.closePath(); }, C.bubYellow, LW.detail);
    shape(g, () => { g.beginPath(); g.moveTo(1020, 608); g.lineTo(1180, 608); g.quadraticCurveTo(1170, 648, 1100, 650); g.quadraticCurveTo(1030, 648, 1020, 608); g.closePath(); }, C.bubRed, LW.small, '#C9665F', () => rectP(g, 1120, 600, 70, 60));
    shape(g, () => rrP(g, 1230, 560, 170, 82, 10), '#FFF6EA', LW.small, '#EADFCF', () => rectP(g, 1350, 550, 60, 100));
    shape(g, () => { g.beginPath(); g.moveTo(1230, 586); g.lineTo(1400, 586); g.lineTo(1400, 572); g.quadraticCurveTo(1400, 560, 1388, 560); g.lineTo(1242, 560); g.quadraticCurveTo(1230, 560, 1230, 572); g.closePath(); }, '#F2A7B6', LW.detail);
    for (const cx of [1275, 1315, 1355]) { rectP(g, cx - 5, 526, 10, 34); paint(g, X.tealLight, LW.detail); ellP(g, cx, 514, 6, 10); paint(g, C.bubYellow, 2); }
    for (let i = 0; i < 3; i++) shape(g, () => polyP(g, [1440 + i * 4, 640 - i * 22, 1500 - i * 4, 640 - i * 22, 1494 - i * 4, 596 - i * 22, 1446 + i * 4, 596 - i * 22]), i % 2 ? X.teal : C.bubRed, LW.detail);
    shape(g, () => { g.beginPath(); g.moveTo(1540, 640); g.lineTo(1600, 640); g.lineTo(1596, 560); g.lineTo(1580, 548); g.lineTo(1556, 548); g.lineTo(1544, 560); g.closePath(); }, 'rgba(255,255,255,0.9)', LW.small);
    rectP(g, 1546, 590, 50, 48); paint(g, '#F4A454', 0);
    g.beginPath(); g.moveTo(1544, 560); g.lineTo(1556, 548); g.lineTo(1580, 548); g.lineTo(1596, 560); g.lineTo(1600, 640); g.lineTo(1540, 640); g.closePath(); paint(g, null, LW.small);
  }
  function partyStatic(g, o) {
    const FY = 846;
    rectP(g, 0, 0, W, FY); paint(g, PA.wall, 0);
    planks(g, FY, PA.floor, PA.floorLine);
    windowBox(g, 220, 160, 400, 380, { sky: o.sky || 'dusk', seed: 41, frame: PA.frame, t: 22, mull: 18 });
    wallBand(g, PA.wall, PA.wallSh, [0, 0, W, FY], [-20, 200, 600, 60, 1300, 60, W + 20, 220]);
    softFill(g, 40, 'rgba(255,230,190,0.35)', () => ellP(g, 1300, 520, 560, 320), 'screen');
    line(g, 0, FY, W, FY, LW.arch);
    // decorations
    paperChain(g, -30, 40, 960, 54, 150, 26, 0); paperChain(g, 960, 54, 1950, 30, 160, 26, 2);
    for (const [rx, ry, rc] of [[960, 54, C.bubYellow], [-10, 40, X.teal], [1930, 32, C.bubRed]]) rosette(g, rx, ry, 46, rc);
    bunting(g, -20, 250, 1940, 230, 90, 16);
    balloon(g, 1760, 380, 70, X.teal, 1630, 650);
    balloon(g, 860, 360, 86, C.bubRed, 990, 650);
    snackTable(g);
  }
  function partyAnchors() { return { left: { x: 480, y: 985, s: 1 }, center: { x: 800, y: 985, s: 1 }, right: { x: 1560, y: 985, s: 1 }, table: { x: 1310, y: 636, s: 1 }, behindTable: { x: 1310, y: 930, s: 0.95 } }; }
  SETS.party = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('party|' + (o.sky || 'dusk'), resFor(xf.z), (lg) => partyStatic(lg, o)));
    return result(xf, partyAnchors(), 985, 846, { tint: null });
  };
  SETS.partyFront = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('partyFront', resFor(xf.z), (lg) => snackTable(lg)));
    return result(xf, partyAnchors(), 985, 846);
  };

  // ================================================================ easing and text helpers
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t), 3);
  const easeInCubic = (t) => Math.pow(clamp(t), 3);
  const easeOutBack = (t) => { t = clamp(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  function wrap(g, text, maxW) {
    const words = String(text).split(/\s+/); const lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); return lines;
  }
  function handset(g, x, y, s, col) { // phone handset glyph
    g.save(); g.translate(x, y); g.rotate(-0.75); g.scale(s, s);
    g.beginPath(); g.moveTo(-14, -26); g.quadraticCurveTo(-24, 0, -14, 26); g.lineTo(-4, 26); g.lineTo(-2, 12); g.lineTo(-8, 8); g.quadraticCurveTo(-11, 0, -8, -8); g.lineTo(-2, -12); g.lineTo(-4, -26); g.closePath();
    g.fillStyle = col; g.fill(); g.restore();
  }
  function msgGlyph(g, x, y, s, col) {
    g.save(); g.translate(x, y); g.scale(s, s); rrP(g, -20, -16, 40, 28, 10); g.fillStyle = col; g.fill();
    polyP(g, [-8, 10, -14, 22, 2, 10]); g.fill(); g.restore();
  }

  // ================================================================ CALL (split screen)
  function panelFrame(g, r, cb, rad) {
    rad = rad || 44;
    rrP(g, r.x + 12, r.y + 14, r.w, r.h, rad); g.fillStyle = 'rgba(110,52,24,0.22)'; g.fill();
    rrP(g, r.x, r.y, r.w, r.h, rad); g.fillStyle = '#FFF4E3'; g.fill();
    const inner = { x: r.x + 14, y: r.y + 14, w: r.w - 28, h: r.h - 28 };
    g.save(); rrP(g, inner.x, inner.y, inner.w, inner.h, rad - 12); g.clip();
    if (cb) cb(g, inner); else { g.fillStyle = '#E9C9A5'; g.fillRect(inner.x, inner.y, inner.w, inner.h); }
    g.restore();
    g.lineJoin = 'round';
    rrP(g, inner.x, inner.y, inner.w, inner.h, rad - 12); paint(g, null, 3.5);
    rrP(g, r.x, r.y, r.w, r.h, rad); paint(g, null, LW.frame);
    return inner;
  }
  function callBadge(g, x, y, k, t) {
    const pulse = 1 + 0.05 * Math.sin((t || 0) * TAU * 1.2);
    const s = easeOutBack(k) * pulse; if (s <= 0.01) return;
    g.save(); g.translate(x, y); g.scale(s, s);
    for (const [r, al] of [[74, 0.18], [60, 0.3]]) { ellP(g, 0, 0, r, r); g.fillStyle = 'rgba(255,248,232,' + al + ')'; g.fill(); }
    ellP(g, 0, 0, 46, 46); paint(g, X.teal, LW.frame);
    handset(g, 2, 0, 1.05, '#FFFFFF');
    g.restore();
  }
  SETS.call = function (g, o) {
    o = o || {}; refresh();
    const bg = o.bg || '#F2AE72';
    blit(g, camXf(null), layer('callbg|' + bg, 1, (lg) => {
      lg.fillStyle = bg; lg.fillRect(0, 0, W, H);
      softFill(lg, 16, 'rgba(255,232,190,0.35)', () => polyP(lg, [500, -20, 900, -20, 420, H + 20, 20, H + 20]));
      softFill(lg, 16, 'rgba(255,232,190,0.25)', () => polyP(lg, [1300, -20, 1460, -20, 980, H + 20, 820, H + 20]));
    }));
    const k = o.k == null ? 1 : o.k, split = o.split == null ? 0.5 : clamp(o.split);
    const M = o.margin == null ? 40 : o.margin, G = o.gap == null ? 34 : o.gap, top = M, ph = H - 2 * top, avail = W - 2 * M - G;
    const lw = avail * split, rw = avail - lw, e = easeOutCubic(k);
    const L = { x: M - (1 - e) * (lw + M + 60), y: top + (o.dropL || 0), w: lw, h: ph };
    const R = { x: M + lw + G + (1 - e) * (rw + M + 60), y: top + (o.dropR || 0), w: rw, h: ph };
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    let li = null, ri = null;
    if (L.w > 40) li = panelFrame(g, L, o.left);
    if (R.w > 40) ri = panelFrame(g, R, o.right);
    if (o.badge !== false && L.w > 40 && R.w > 40) callBadge(g, M + lw + G / 2, H / 2, o.badgeK == null ? clamp((k - 0.4) / 0.6) : o.badgeK, o.t);
    g.restore();
    return { left: li, right: ri, floorY: H, anchors: {} };
  };
  // Fit a 1920x1080 set into a rect (cover), keeping set point (x, y) at the rect centre. Call inside a panel callback.
  SETS.fit = function (g, r, o) {
    o = o || {};
    const s = Math.max(r.w / W, r.h / H) * (o.zoom || 1);
    const hw = r.w / 2 / s, hh = r.h / 2 / s;
    const fx = clamp(o.x == null ? W / 2 : o.x, hw, W - hw), fy = clamp(o.y == null ? H / 2 : o.y, hh, H - hh);
    g.translate(r.x + r.w / 2, r.y + r.h / 2); g.scale(s, s); g.translate(-fx, -fy);
    return { s, x: fx, y: fy };
  };

  // ================================================================ PHONE SCREEN
  const PH = { w: 520, h: 1000, r: 74, sx: -240, sy: -480, sw: 480, sh: 960, sr: 54 };
  function phoneBody(g) {
    // side buttons
    for (const [y, h] of [[-250, 70], [-160, 110]]) { rrP(g, -PH.w / 2 - 9, y, 14, h, 5); paint(g, '#2E3038', 3); }
    rrP(g, PH.w / 2 - 5, -200, 14, 130, 5); paint(g, '#2E3038', 3);
    rrP(g, -PH.w / 2, -PH.h / 2, PH.w, PH.h, PH.r); paint(g, C.phone, 0);
    g.save(); rrP(g, -PH.w / 2, -PH.h / 2, PH.w, PH.h, PH.r); g.clip(); polyP(g, [PH.w / 2 - 26, -PH.h / 2, PH.w / 2, -PH.h / 2, PH.w / 2, PH.h / 2, PH.w / 2 - 26, PH.h / 2]); g.fillStyle = '#2C2E35'; g.fill(); g.restore();
    rrP(g, -PH.w / 2, -PH.h / 2, PH.w, PH.h, PH.r); paint(g, null, LW.frame);
  }
  function statusBar(g, o, light) {
    const col = light ? '#FFFFFF' : '#1c1c1c';
    rrP(g, -62, -466, 124, 36, 18); g.fillStyle = '#121216'; g.fill();
    g.fillStyle = col; g.font = font(800, 24); g.textBaseline = 'middle'; g.textAlign = 'left';
    if (o.mode === 'chat') g.fillText(o.time || '9:41', -200, -447);
    for (let i = 0; i < 4; i++) { rrP(g, 118 + i * 9, -440 - i * 5, 6, 8 + i * 5, 2); g.fill(); }
    const b = o.battery == null ? 0.8 : clamp(o.battery);
    rrP(g, 160, -458, 46, 23, 6); g.lineWidth = 2.5; g.strokeStyle = col; g.stroke();
    rrP(g, 207, -451, 4, 9, 2); g.fill();
    rrP(g, 164, -454, Math.max(3, 38 * b), 15, 3); g.fillStyle = b < 0.2 ? C.badgeRed : col; g.fill();
  }
  function lockScreen(g, o) {
    const gr = g.createLinearGradient(0, PH.sy, 0, PH.sy + PH.sh); gr.addColorStop(0, '#2C6E7B'); gr.addColorStop(1, '#86C7C8');
    g.fillStyle = gr; g.fillRect(PH.sx, PH.sy, PH.sw, PH.sh);
    ellP(g, 90, -120, 210, 210); g.fillStyle = 'rgba(214,240,232,0.22)'; g.fill();
    g.beginPath(); g.moveTo(PH.sx, 300); g.quadraticCurveTo(-60, 200, 80, 280); g.quadraticCurveTo(180, 330, 240, 260); g.lineTo(240, 480); g.lineTo(PH.sx, 480); g.closePath(); g.fillStyle = '#3F8C98'; g.fill();
    g.beginPath(); g.moveTo(PH.sx, 380); g.quadraticCurveTo(0, 320, 240, 400); g.lineTo(240, 480); g.lineTo(PH.sx, 480); g.closePath(); g.fillStyle = '#2F7280'; g.fill();
    statusBar(g, o, true);
    // padlock
    g.save(); g.translate(0, -378); g.strokeStyle = '#FFFFFF'; g.lineWidth = 5; g.beginPath(); g.arc(0, -6, 11, Math.PI, 0); g.stroke(); rrP(g, -16, -6, 32, 24, 5); g.fillStyle = '#FFFFFF'; g.fill(); g.restore();
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#FFFFFF';
    g.font = font(700, 30); g.fillText(o.date || 'Wednesday, 12 March', 0, -300);
    g.font = font(900, 150); g.fillText(o.time || '9:41', 0, -150);
    const notes = o.notes || [];
    let y = -60;
    const shown = o.notesK == null ? notes.length : o.notesK;
    notes.forEach((n, i) => {
      const k = clamp(shown - i); if (k <= 0) return;
      const e = easeOutBack(k), hgt = 132;
      g.save(); g.globalAlpha *= clamp(k * 3); g.translate(0, y + hgt / 2); g.scale(0.85 + 0.15 * e, 0.85 + 0.15 * e); g.translate(0, (1 - e) * 30);
      const extra = Math.min(2, Math.max(0, (n.count || 1) - 1));
      for (let j = extra; j >= 1; j--) { rrP(g, -220 + j * 16, -hgt / 2 + j * 14, 440 - j * 32, hgt, 30); paint(g, j === 1 ? '#EDE6DA' : '#DCD3C6', 3); }
      rrP(g, -220, -hgt / 2, 440, hgt, 30); paint(g, 'rgba(255,252,246,0.97)', 3.2);
      const icol = n.icon === 'call' ? C.bubGreen : n.icon === 'mail' ? C.bubRed : C.bubBlue;
      ellP(g, -160, 0, 36, 36); paint(g, icol, 3);
      if (n.icon === 'call') handset(g, -158, 0, 0.8, '#FFFFFF'); else msgGlyph(g, -160, -2, 0.9, '#FFFFFF');
      g.textAlign = 'left'; g.fillStyle = '#1c1c1c'; g.font = font(900, 29); g.fillText(n.title || '', -108, -14);
      g.font = font(700, 27); g.fillStyle = '#3a3a3a';
      const body = wrap(g, n.body || '', 290); g.fillText(body[0] || '', -108, 26); if (body[1]) { g.fillText(body[1], -108, 58); }
      g.textAlign = 'right'; g.font = font(700, 21); g.fillStyle = '#8a8580'; g.fillText(n.time || 'now', 200, -14);
      g.restore();
      y += (hgt + 22 + extra * 14) * easeOutCubic(k);
    });
  }
  function chatScreen(g, o) {
    g.fillStyle = '#FBF3E7'; g.fillRect(PH.sx, PH.sy, PH.sw, PH.sh);
    // header
    rectP(g, PH.sx, PH.sy, PH.sw, 160); paint(g, '#FFFFFF', 0); line(g, PH.sx, PH.sy + 160, PH.sx + PH.sw, PH.sy + 160, 3);
    statusBar(g, o, false);
    g.strokeStyle = X.teal; g.lineWidth = 6; g.beginPath(); g.moveTo(-196, -394); g.lineTo(-212, -374); g.lineTo(-196, -354); g.stroke();
    ellP(g, -144, -374, 36, 36); paint(g, o.avatarColor || '#A6A6A6', 3);
    g.fillStyle = '#FFFFFF'; g.font = font(900, 34); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((o.contact || '?').charAt(0).toUpperCase(), -144, -372);
    g.textAlign = 'left'; g.fillStyle = '#1c1c1c'; g.font = font(900, 32); g.fillText(o.contact || '', -92, -388);
    g.fillStyle = '#7d8f8a'; g.font = font(700, 22); g.fillText(o.status == null ? 'online' : o.status, -92, -354);
    // input bar
    rectP(g, PH.sx, 370, PH.sw, 110); paint(g, '#FFFFFF', 0); line(g, PH.sx, 370, PH.sx + PH.sw, 370, 2.5);
    rrP(g, -214, 390, 352, 64, 32); paint(g, '#F6F1EA', 3);
    g.font = font(700, 26); g.textBaseline = 'middle';
    const draft = o.draft || '';
    if (draft) {
      g.save(); rrP(g, -200, 392, 326, 60, 30); g.clip();
      const tw = g.measureText(draft).width, x0 = Math.min(-192, 120 - tw);
      g.fillStyle = '#1c1c1c'; g.fillText(draft, x0, 423);
      if (Math.floor((o.t || 0) * 2.4) % 2 === 0) rectP(g, x0 + tw + 3, 405, 3, 36), paint(g, X.teal, 0);
      g.restore();
    } else { g.fillStyle = '#A9A29A'; g.fillText(o.placeholder || 'Message', -190, 423); }
    ellP(g, 180, 422, 34, 34); paint(g, X.teal, 3);
    g.fillStyle = '#FFFFFF'; polyP(g, [166, 406, 200, 422, 166, 438, 172, 422]); g.fill();
    // messages, laid out from the bottom up
    g.save(); rectP(g, PH.sx, PH.sy + 162, PH.sw, 370 - (PH.sy + 162)); g.clip();
    const msgs = (o.messages || []).slice();
    if (o.typing) msgs.push({ from: o.typing, typing: true, k: o.typingK == null ? 1 : o.typingK });
    g.font = font(700, 29);
    const lay = msgs.map(m => {
      const k = m.k == null ? 1 : clamp(m.k);
      if (m.typing) return { m, k, lines: [], w: 112, h: 62 };
      const lines = wrap(g, m.text || '', 300); const w = Math.max(...lines.map(l => g.measureText(l).width)) + 46;
      return { m, k, lines, w, h: lines.length * 38 + 30 };
    });
    let y = 350;
    for (let i = lay.length - 1; i >= 0; i--) {
      const L = lay[i]; if (L.k <= 0) continue;
      const e = easeOutBack(L.k), me = L.m.from === 'me';
      const bx = me ? 214 - L.w : -214, by = y - L.h;
      g.save(); g.globalAlpha *= clamp(L.k * 3);
      const ox = me ? bx + L.w : bx, oy = by + L.h;
      g.translate(ox, oy); g.scale(0.5 + 0.5 * e, 0.5 + 0.5 * e); g.translate(-ox, -oy);
      const fill = me ? X.teal : '#FFFFFF';
      g.beginPath(); rrP(g, bx, by, L.w, L.h, 28); paint(g, fill, 3);
      // tail
      g.beginPath(); if (me) { g.moveTo(bx + L.w - 26, by + L.h - 1.5); g.quadraticCurveTo(bx + L.w + 4, by + L.h + 2, bx + L.w + 14, by + L.h + 12); g.quadraticCurveTo(bx + L.w + 2, by + L.h - 6, bx + L.w - 4, by + L.h - 22); }
      else { g.moveTo(bx + 26, by + L.h - 1.5); g.quadraticCurveTo(bx - 4, by + L.h + 2, bx - 14, by + L.h + 12); g.quadraticCurveTo(bx - 2, by + L.h - 6, bx + 4, by + L.h - 22); }
      g.fillStyle = fill; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      if (L.m.typing) {
        for (let d = 0; d < 3; d++) { const b = Math.sin(((o.t || 0) * 2.2 - d * 0.18) * TAU) * 0.5 + 0.5; ellP(g, bx + 32 + d * 24, by + L.h / 2 - b * 7, 8, 8); g.fillStyle = me ? '#FFFFFF' : '#9C958C'; g.fill(); }
      } else {
        g.fillStyle = me ? '#FFFFFF' : '#1c1c1c'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = font(700, 29);
        L.lines.forEach((l, j) => g.fillText(l, bx + 23, by + 44 + j * 38));
      }
      g.restore();
      y -= (L.h + 22) * easeOutCubic(L.k);
    }
    g.restore();
  }
  SETS.phoneScreen = function (g, o) {
    o = o || {}; refresh();
    if (o.bg !== false) {
      const bg = o.bg || '#F2B587';
      blit(g, camXf(null), layer('phonebg|' + bg, 1, (lg) => {
        lg.fillStyle = bg; lg.fillRect(0, 0, W, H);
        softFill(lg, 60, 'rgba(255,236,200,0.45)', () => ellP(lg, 960, 540, 560, 520));
        softFill(lg, 14, 'rgba(255,236,200,0.3)', () => polyP(lg, [260, -20, 520, -20, 120, H + 20, -140, H + 20]));
        softFill(lg, 14, 'rgba(255,236,200,0.25)', () => polyP(lg, [1500, -20, 1640, -20, 1240, H + 20, 1100, H + 20]));
      }));
    }
    const buzz = o.buzz || 0, t = o.t || 0;
    const jx = buzz ? Math.sin(t * TAU * 22) * 7 * buzz : 0, jr = buzz ? Math.sin(t * TAU * 17) * 0.012 * buzz : 0;
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    g.translate((o.x == null ? 960 : o.x) + jx, o.y == null ? 540 : o.y); g.rotate((o.rot || 0) + jr); const sc = o.scale || 1; g.scale(sc, sc);
    rrP(g, -PH.w / 2 + 16, -PH.h / 2 + 22, PH.w, PH.h, PH.r); g.fillStyle = 'rgba(100,48,22,0.22)'; g.fill();
    phoneBody(g);
    g.save(); rrP(g, PH.sx, PH.sy, PH.sw, PH.sh, PH.sr); g.clip();
    if (o.mode === 'chat') chatScreen(g, o); else lockScreen(g, o);
    g.restore();
    rrP(g, PH.sx, PH.sy, PH.sw, PH.sh, PH.sr); paint(g, null, 3);
    if (buzz > 0.05) { g.strokeStyle = INK; g.lineWidth = 5; for (const sx of [-1, 1]) for (const dy of [-60, 0, 60]) { g.beginPath(); g.moveTo(sx * (PH.w / 2 + 34), dy - 18); g.quadraticCurveTo(sx * (PH.w / 2 + 50), dy, sx * (PH.w / 2 + 34), dy + 18); g.globalAlpha = buzz; g.stroke(); g.globalAlpha = 1; } }
    g.restore();
    return { screen: { x: (o.x == null ? 960 : o.x) + PH.sx * (o.scale || 1), y: (o.y == null ? 540 : o.y) + PH.sy * (o.scale || 1), w: PH.sw * (o.scale || 1), h: PH.sh * (o.scale || 1) } };
  };

  // ================================================================ DAY CARD, PILL, STAMP
  SETS.dayCard = function (g, label, sub, k, o) {
    o = o || {}; refresh();
    const kin = clamp(k), kout = clamp((k || 0) - 1);
    const e = easeOutBack(kin / 0.55), a = clamp(kin / 0.1) * (1 - easeInCubic(kout));
    if (a <= 0.001) return;
    const cx = o.x == null ? 960 : o.x, cy = o.y == null ? 470 : o.y, sc = (o.scale || 1) * (0.35 + 0.65 * e) * (1 + 0.08 * kout);
    const col = o.color || X.teal, colSh = o.colorSh || dark(col, 0.8);
    g.save(); g.globalAlpha *= a; g.lineJoin = 'round'; g.lineCap = 'round';
    g.translate(cx, cy - 60 * kout); g.rotate(-0.13 * (1 - e) - 0.03); g.scale(sc, sc);
    g.font = font(900, 138); if ('letterSpacing' in g) g.letterSpacing = '6px';
    const tw = g.measureText(label).width, w = tw + 160, h = 200, r = 56;
    rrP(g, -w / 2 + 14, -h / 2 + 18, w, h, r); g.fillStyle = 'rgba(70,32,16,0.28)'; g.fill();
    shape(g, () => rrP(g, -w / 2, -h / 2, w, h, r), col, 0, colSh, () => rectP(g, -w / 2, h * 0.2, w, h));
    rrP(g, -w / 2 + 14, -h / 2 + 14, w - 28, h - 28, r - 14); g.lineWidth = 3.5; g.strokeStyle = 'rgba(255,248,236,0.55)'; g.stroke();
    rrP(g, -w / 2, -h / 2, w, h, r); paint(g, null, 7.5);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = colSh; g.fillText(label, 3, 16);
    g.fillStyle = '#FFF8EC'; g.fillText(label, 0, 8);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    if (sub) {
      const e2 = easeOutBack((kin - 0.28) / 0.5);
      if (e2 > 0.01) {
        g.save(); g.translate(0, h / 2 + 10); g.rotate(0.04 * (1 - e2) + 0.035); g.scale(e2, e2);
        g.font = font(900, 54); const tw2 = g.measureText(sub).width, w2 = tw2 + 80, h2 = 88;
        rrP(g, -w2 / 2 + 8, -h2 / 2 + 10, w2, h2, h2 / 2); g.fillStyle = 'rgba(70,32,16,0.25)'; g.fill();
        shape(g, () => rrP(g, -w2 / 2, -h2 / 2, w2, h2, h2 / 2), '#FFD47E', 0, '#F5B95C', () => rectP(g, -w2 / 2, h2 * 0.18, w2, h2));
        rrP(g, -w2 / 2, -h2 / 2, w2, h2, h2 / 2); paint(g, null, 6);
        g.fillStyle = '#1c1c1c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sub, 0, 4);
        g.restore();
      }
    }
    g.restore();
  };
  // A rounded label or button. o: size (font px), fill, color (text), lw, pad, dim 0..1, lit 0..1, press 0..1, rot, scale
  SETS.pill = function (g, x, y, text, o) {
    o = o || {}; refresh();
    const size = o.size || 56, fill = o.fill || '#FFF4E3', tc = o.color || '#1c1c1c', lwid = o.lw == null ? 6 : o.lw;
    g.save(); g.lineJoin = 'round'; g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.scale) g.scale(o.scale, o.scale);
    g.font = font(900, size);
    const tw = g.measureText(text).width, padX = o.padX || size * 0.75, h = o.h || size * 1.7, w = Math.max(o.minW || 0, tw + padX * 2), r = o.r == null ? h / 2 : o.r;
    const press = clamp(o.press || 0), depth = size * 0.16;
    if (o.lit) { softFill(g, 20, 'rgba(255,226,120,' + (0.75 * clamp(o.lit)) + ')', () => rrP(g, -w / 2 - 26, -h / 2 - 26, w + 52, h + 52 + depth, r + 26)); }
    rrP(g, -w / 2, -h / 2 + depth, w, h, r); paint(g, dark(fill, 0.72), lwid);
    g.translate(0, depth * press);
    shape(g, () => rrP(g, -w / 2, -h / 2, w, h, r), fill, 0, dark(fill, 0.9), () => rectP(g, -w / 2, h * 0.16, w, h));
    rrP(g, -w / 2, -h / 2, w, h, r); paint(g, null, lwid);
    g.fillStyle = tc; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, size * 0.04);
    if (o.dim) { rrP(g, -w / 2 - lwid, -h / 2 - lwid, w + lwid * 2, h + depth + lwid * 2, r + lwid); g.fillStyle = 'rgba(70,60,60,' + (0.55 * clamp(o.dim)) + ')'; g.fill(); }
    g.restore();
    return { w, h: h + depth };
  };
  // A rubber stamp that slams down: k 0..1 (lands by k = 0.3, settles after). o: size, color, rot
  SETS.stamp = function (g, x, y, text, k, o) {
    o = o || {}; refresh(); if (!(k > 0)) return;
    const col = o.color || C.badgeRed, size = o.size || 120;
    const land = clamp(k / 0.3), s = land < 1 ? 2.3 - 1.3 * easeInCubic(land) : 1 + 0.07 * Math.exp(-(k - 0.3) * 12) * Math.cos((k - 0.3) * 40);
    g.save(); g.globalAlpha *= land < 1 ? 0.25 + 0.6 * land : 0.92; g.translate(x, y); g.rotate(o.rot == null ? -0.2 : o.rot); g.scale(s, s);
    g.font = font(1000, size); if ('letterSpacing' in g) g.letterSpacing = (size * 0.06) + 'px';
    const tw = g.measureText(text).width, w = tw + size * 0.7, h = size * 1.3;
    rrP(g, -w / 2, -h / 2, w, h, size * 0.18); g.lineWidth = size * 0.1; g.strokeStyle = col; g.stroke();
    rrP(g, -w / 2 + size * 0.13, -h / 2 + size * 0.13, w - size * 0.26, h - size * 0.26, size * 0.1); g.lineWidth = size * 0.035; g.stroke();
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, size * 0.03, size * 0.06);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.restore();
  };

  // ================================================================ exports
  SETS.W = W; SETS.H = H;
  SETS.ready = ready;
  SETS.font = font; SETS.FONT = FONT_FAMILY;
  SETS.pal = () => (refresh(), C);
  SETS.lw = () => (refresh(), LW);
  SETS.clock = (g, x, y, r, time) => { refresh(); g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; clock(g, x, y, r, time, null); g.restore(); };
  SETS.plant = (g, x, y, s, o) => { refresh(); g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; plant(g, x, y, s, o); g.restore(); };
  SETS.sky = (g, x, y, w, h, kind, seed) => { refresh(); sky(g, x, y, w, h, kind, seed); };
  SETS.clearCache = () => CACHE.clear();
  SETS._util = { mix, dark, mulTo, rgba, rng, rrP, polyP, ellP, shape, paint, camXf };
  global.SETS = SETS;
})(typeof window !== 'undefined' ? window : globalThis);

/* Nunito (latin, variable 200-1000), Copyright 2014 The Nunito Project Authors, SIL Open Font License 1.1 */
(typeof window !== 'undefined' ? window : globalThis).SETS._fontData = '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';
