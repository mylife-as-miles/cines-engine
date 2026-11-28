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
  // cache resolution from the full device scale: camera zoom times whatever transform g already has (SETS.fit, a shake)
  function devRes(g, xf) { const m = g.getTransform ? g.getTransform() : null; return resFor(xf.z * (m ? Math.hypot(m.a, m.b) : 1)); }
  // Blit a cached layer through the camera. Only the visible part of the source is drawn (device bounds, an optional
  // clip hint from SETS.call panels, and the layer's bbox), so zoom 1 is a 1:1 copy (~1 ms in headless Chromium);
  // a scaled blit costs more (~8 ms for a full frame), which is why front layers carry a bbox.
  let CLIP_HINT = null;
  function blit(g, xf, canvas, alpha, bbox) {
    const res = canvas.width / W;
    g.save(); g.transform(xf.z, 0, 0, xf.z, xf.ox, xf.oy);
    if (alpha != null) g.globalAlpha *= alpha;
    const m = g.getTransform ? g.getTransform() : null;
    if (!m || Math.abs(m.b) > 1e-9 || Math.abs(m.c) > 1e-9 || m.a <= 0 || m.d <= 0) {
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'medium'; g.drawImage(canvas, 0, 0, W, H); g.restore(); return;
    }
    const dev = CLIP_HINT || { x: 0, y: 0, w: g.canvas ? g.canvas.width : W, h: g.canvas ? g.canvas.height : H };
    const B = bbox || { x: 0, y: 0, w: W, h: H };
    let x0 = Math.max(B.x, 0, (dev.x - m.e) / m.a), y0 = Math.max(B.y, 0, (dev.y - m.f) / m.d);
    let x1 = Math.min(B.x + B.w, W, (dev.x + dev.w - m.e) / m.a), y1 = Math.min(B.y + B.h, H, (dev.y + dev.h - m.f) / m.d);
    if (x1 <= x0 || y1 <= y0) { g.restore(); return; }
    // snap the source rect to whole source pixels
    const px0 = Math.max(0, Math.floor(x0 * res)), py0 = Math.max(0, Math.floor(y0 * res));
    const px1 = Math.min(canvas.width, Math.ceil(x1 * res)), py1 = Math.min(canvas.height, Math.ceil(y1 * res));
    const k = 1 / res;
    let dx = m.a * px0 * k + m.e, dy = m.d * py0 * k + m.f, dw = m.a * (px1 - px0) * k, dh = m.d * (py1 - py0) * k;
    const oneToOne = Math.abs(dw - (px1 - px0)) < 1e-6 && Math.abs(dh - (py1 - py0)) < 1e-6;
    if (oneToOne) { dx = Math.round(dx); dy = Math.round(dy); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    // 'low' = plain bilinear: ~6 ms for a full scaled frame here, against ~11 ms for 'medium' (mipmapped)
    g.imageSmoothingEnabled = !oneToOne; g.imageSmoothingQuality = 'low';
    g.drawImage(canvas, px0, py0, px1 - px0, py1 - py0, dx, dy, dw, dh);
    g.restore();
  }
  function live(g, xf, fn) { g.save(); g.transform(xf.z, 0, 0, xf.z, xf.ox, xf.oy); g.lineJoin = 'round'; g.lineCap = 'round'; refresh(); fn(g); g.restore(); }
  function result(xf, anchorsSet, floorY, wallY, extra) {
    const anchors = {};
    for (const k in anchorsSet) { const a = anchorsSet[k]; if (!a) continue; anchors[k] = Object.assign({}, a, { x: a.x * xf.z + xf.ox, y: a.y * xf.z + xf.oy, s: (a.s || 1) * xf.z }); }
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
    const top = (x) => vpY(xl, 4, x), topIn = (x) => vpY(xli, 46, x), fl = (x) => vpY(WX, FY, x);
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
    // the desk lamp: base, two-part arm, cone head tipped toward the desk, bright opening
    const bx = 1300, by = 615, ex = 1334, ey = 528, hx = 1290, hy = 474;
    shape(g, () => ellP(g, bx, by - 5, 38, 10), X.teal, LW.small, C.hoodieSh || '#2F7280', () => rectP(g, bx - 40, by - 4, 80, 12));
    g.beginPath(); g.moveTo(bx, by - 10); g.lineTo(ex, ey); g.lineTo(hx, hy);
    g.lineWidth = 9 + LW.small * 2; g.strokeStyle = INK; g.stroke(); g.lineWidth = 9; g.strokeStyle = X.teal; g.stroke();
    ellP(g, ex, ey, 9, 9); paint(g, X.teal, LW.detail);
    g.save(); g.translate(hx, hy); g.rotate(0.62);
    shape(g, () => polyP(g, [-16, -10, 16, -10, 50, 66, -50, 66]), X.teal, LW.small, C.hoodieSh || '#2F7280', () => polyP(g, [4, -10, 16, -10, 50, 66, 20, 66]));
    ellP(g, 0, 66, 50, 13); paint(g, '#FFF1C2', LW.small);
    g.restore();
    ellP(g, hx, hy - 4, 10, 10); paint(g, X.teal, LW.detail);
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
      backDesk: o.view === 'door' ? undefined : { x: 250, y: 575, s: 1 },
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
    blit(g, xf, layer(key, devRes(g, xf), (lg) => officeStatic(lg, o)));
    live(g, xf, (g2) => clockHands(g2, 960, 212, 95, o.clock != null ? o.clock : 17));
    return result(xf, officeAnchors(o), 962, OF.floorY, { tint: o.night ? '#9C98C4' : null });
  };
  SETS.officeFront = function (g, o) {
    o = o || {};
    const xf = camXf(o.cam), parts = o.parts || (o.view === 'door' ? ['door'] : []);
    if (!parts.length) return result(xf, officeAnchors(o), 962, OF.floorY);
    const key = 'officeFront|' + (o.view || 'desk') + '|' + parts.join(',') + '|' + (o.night ? 1 : 0);
    blit(g, xf, layer(key, devRes(g, xf), (lg) => {
      if (parts.includes('door') && o.view === 'door') {
        // the side wall around the opening and the frame: a figure standing in the doorway is seen through the opening
        const D = officeDoorGeom(), WX = OF.wallX, FY = OF.floorY;
        clipDo(lg, () => { lg.beginPath(); polyP(lg, [0, 0, D.outer[2] + 2, 0, D.outer[4] + 2, vpY(WX, FY, D.outer[4]) + 2, 0, vpY(WX, FY, 0) + 2]); lg.moveTo(D.open[0], D.open[1]); lg.lineTo(D.open[6], D.open[7] + 60); lg.lineTo(D.open[4], D.open[5] + 60); lg.lineTo(D.open[2], D.open[3]); lg.closePath(); }, () => officeStatic(lg, o), true);
      }
      if (parts.includes('desk')) officeHeroDesk(lg, o);
    }), null, parts.includes('desk') ? (parts.includes('door') ? null : { x: 980, y: 360, w: 420, h: 640 }) : { x: 0, y: 0, w: 520, h: 1060 });
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
    blit(g, xf, layer(base(tod), devRes(g, xf), (lg) => livingStatic(lg, o, tod)));
    if (o.todTo && LIV_PAL[o.todTo] && o.todK > 0) blit(g, xf, layer(base(o.todTo), devRes(g, xf), (lg) => livingStatic(lg, o, o.todTo)), Math.min(1, o.todK));
    if (o.bird != null) live(g, xf, (g2) => clipDo(g2, () => rectP(g2, 382, 127, 289, 360), () => { const k = o.bird; bird(g2, 360 + k * 360, 250 - 40 * Math.sin(k * 3), 1, k * 4); }));
    const P = LIV_PAL[o.todTo && o.todK >= 0.5 ? o.todTo : tod];
    return result(xf, livingAnchors(o), 990, LV.floorY, { tint: P.tint });
  };
  SETS.livingFront = function (g, o) {
    o = o || {};
    const tod = LIV_PAL[o.tod] ? o.tod : 'evening', xf = camXf(o.cam);
    if (o.table !== false) {
      const bb = { x: 680, y: 816, w: 800, h: 264 };
      blit(g, xf, layer('livingFront|' + tod, devRes(g, xf), (lg) => coffeeTable(lg, LIV_PAL[tod])), null, bb);
      if (o.todTo && LIV_PAL[o.todTo] && o.todK > 0) blit(g, xf, layer('livingFront|' + o.todTo, devRes(g, xf), (lg) => coffeeTable(lg, LIV_PAL[o.todTo])), Math.min(1, o.todK), bb);
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
    blit(g, xf, layer('street', devRes(g, xf), (lg) => streetStatic(lg, o)));
    return result(xf, streetAnchors(), 962, 851);
  };
  SETS.streetFront = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('streetFront', devRes(g, xf), (lg) => streetNear(lg)), null, { x: 1420, y: 0, w: 500, h: 930 });
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
    softFill(g, 16, 'rgba(255,244,214,0.16)', () => polyP(g, [760, FY + 2, 1300, FY + 2, 1460, H, 640, H]), 'screen');
    line(g, 0, FY, 1590, FY, LW.arch);
    if (o.island) kitchenIsland(g);
  }
  function kitchenAnchors() { return { center: { x: 960, y: 985, s: 1 }, left: { x: 600, y: 985, s: 1 }, right: { x: 1320, y: 985, s: 1 }, counter: { x: 960, y: 620, s: 1 }, window: { x: 1000, y: 285, s: 1 }, island: { x: 960, y: 836, s: 1 } }; }
  SETS.mumKitchen = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('kitchen|' + (o.sky || 'sunset') + '|' + (o.island ? 1 : 0), devRes(g, xf), (lg) => kitchenStatic(lg, o)));
    return result(xf, kitchenAnchors(), 985, 880);
  };
  SETS.mumKitchenFront = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('kitchenFront', devRes(g, xf), (lg) => kitchenIsland(lg)), null, { x: 420, y: 720, w: 1080, h: 360 });
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
    blit(g, xf, layer('flat|' + (o.sky || 'sunset'), devRes(g, xf), (lg) => flatStatic(lg, o)));
    return result(xf, flatAnchors(), 985, 846);
  };
  SETS.friendFlatFront = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('flatFront', devRes(g, xf), (lg) => flatFrontBoxes(lg)), null, { x: 1420, y: 640, w: 500, h: 440 });
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
    blit(g, xf, layer('party|' + (o.sky || 'dusk'), devRes(g, xf), (lg) => partyStatic(lg, o)));
    return result(xf, partyAnchors(), 985, 846, { tint: null });
  };
  SETS.partyFront = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('partyFront', devRes(g, xf), (lg) => snackTable(lg)), null, { x: 940, y: 480, w: 740, h: 520 });
    return result(xf, partyAnchors(), 985, 846);
  };

  // ================================================================ CLOSE-UPS: window and clock
  // windowView: the living-room window filling the frame (Q04 "the window goes to dusk", "a calm sunset, a bird").
  // opts: tod (evening|morning|dusk), todTo + todK (crossfade), bird (0..1 across the glass), cam
  function windowViewStatic(g, tod) {
    const P = LIV_PAL[tod] || LIV_PAL.evening;
    rectP(g, 0, 0, W, H); paint(g, P.wall, 0);
    if (P.lamp) softFill(g, 80, rgba(P.lit, 0.35), () => ellP(g, 60, 600, 420, 700));
    windowBox(g, 470, 110, 980, 760, { frame: P.winFrame, sky: P.sky, seed: 5, ink: '#5E3A2A', t: 52, mull: 40, lw: 4.5 });
    curtain(g, 250, 40, 260, 1010, P, false); curtain(g, 1410, 40, 260, 1010, P, true);
    shape(g, () => rrP(g, 200, 26, 1520, 24, 12), P.rod, LW.small);
    ellP(g, 200, 38, 24, 24); paint(g, P.rod, LW.small); ellP(g, 1720, 38, 24, 24); paint(g, P.rod, LW.small);
    plant(g, 1280, 870, 1.0, { kind: 'small', pot: P.pot, potSh: dark(P.pot, 0.86), leaf: P.leaf, leafSh: P.leafSh });
    overlay(g, 'multiply', () => softFill(g, 6, mulTo(P.wall, P.wallSh), () => { g.beginPath(); g.moveTo(-20, 160); g.bezierCurveTo(600, 30, 1300, 30, W + 20, 160); g.lineTo(W + 20, -20); g.lineTo(-20, -20); g.closePath(); }));
  }
  SETS.windowView = function (g, o) {
    o = o || {}; const tod = LIV_PAL[o.tod] ? o.tod : 'evening', xf = camXf(o.cam);
    blit(g, xf, layer('windowView|' + tod, devRes(g, xf), (lg) => windowViewStatic(lg, tod)));
    if (o.todTo && LIV_PAL[o.todTo] && o.todK > 0) blit(g, xf, layer('windowView|' + o.todTo, devRes(g, xf), (lg) => windowViewStatic(lg, o.todTo)), Math.min(1, o.todK));
    if (o.bird != null) live(g, xf, (g2) => clipDo(g2, () => rectP(g2, 522, 162, 876, 656), () => { const k = o.bird; bird(g2, 440 + k * 1040, 420 - 120 * Math.sin(k * 3.1), 2.2, k * 5); }));
    return result(xf, { window: { x: 960, y: 490, s: 1 }, glass: { x: 960, y: 490, s: 1, w: 876, h: 656 }, sill: { x: 960, y: 870, s: 1 } }, 1080, 1080, { tint: (LIV_PAL[tod] || {}).tint || null });
  };
  // clockView: a big wall clock on the office wall. opts: clock (time), night, cam
  SETS.clockView = function (g, o) {
    o = o || {}; const xf = camXf(o.cam), night = !!o.night;
    blit(g, xf, layer('clockView|' + (night ? 1 : 0), devRes(g, xf), (lg) => {
      rectP(lg, 0, 0, W, H); paint(lg, C.officeWallBack, 0);
      overlay(lg, 'multiply', () => softFill(lg, 6, mulTo(C.officeWallBack, C.officeWallBackSh), () => { lg.beginPath(); lg.moveTo(-20, 230); lg.bezierCurveTo(500, 60, 1300, 50, W + 20, 260); lg.lineTo(W + 20, -20); lg.lineTo(-20, -20); lg.closePath(); })); 
      softFill(lg, 14, 'rgba(255,248,226,0.35)', () => polyP(lg, [1300, -20, 1600, -20, 1100, H + 20, 800, H + 20]));
      clockFace(lg, 960, 540, 380, '#E6C39F');
      if (night) overlay(lg, 'multiply', () => { const gr = lg.createRadialGradient(1500, 900, 60, 1200, 700, 1500); gr.addColorStop(0, '#E9C6A0'); gr.addColorStop(0.4, '#9A8CB0'); gr.addColorStop(1, '#5E6192'); lg.fillStyle = gr; lg.fillRect(0, 0, W, H); });
    }));
    live(g, xf, (g2) => clockHands(g2, 960, 540, 380, o.clock != null ? o.clock : 17));
    return result(xf, { clock: { x: 960, y: 540, s: 1, r: 380 } }, 1080, 1080, { tint: night ? '#9C98C4' : null });
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
    const m = g.getTransform ? g.getTransform() : null, prev = CLIP_HINT;
    if (m && Math.abs(m.b) < 1e-9 && Math.abs(m.c) < 1e-9) CLIP_HINT = { x: m.a * inner.x + m.e, y: m.d * inner.y + m.f, w: m.a * inner.w, h: m.d * inner.h };
    try { if (cb) cb(g, inner); else { g.fillStyle = '#E9C9A5'; g.fillRect(inner.x, inner.y, inner.w, inner.h); } } finally { CLIP_HINT = prev; }
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
  // Phone body 620x1050 (fills the frame height at scale 1); screen text sized to read on a phone watching the video:
  // bubbles 46 px, card titles 46 px, card bodies 42 px. All text comes from opts (no contact or date defaults).
  const PH = { w: 620, h: 1050, r: 84, sx: -288, sy: -503, sw: 576, sh: 1006, sr: 60 };
  const PHT = { bubble: 46, bubbleLine: 58, title: 46, body: 42, small: 30, status: 32, name: 46, input: 38 };
  function phoneBody(g) {
    for (const [y, h] of [[-270, 80], [-170, 120]]) { rrP(g, -PH.w / 2 - 10, y, 16, h, 6); paint(g, '#2E3038', 3); }
    rrP(g, PH.w / 2 - 6, -220, 16, 140, 6); paint(g, '#2E3038', 3);
    rrP(g, -PH.w / 2, -PH.h / 2, PH.w, PH.h, PH.r); paint(g, C.phone, 0);
    g.save(); rrP(g, -PH.w / 2, -PH.h / 2, PH.w, PH.h, PH.r); g.clip(); polyP(g, [PH.w / 2 - 28, -PH.h / 2, PH.w / 2, -PH.h / 2, PH.w / 2, PH.h / 2, PH.w / 2 - 28, PH.h / 2]); g.fillStyle = '#2C2E35'; g.fill(); g.restore();
    rrP(g, -PH.w / 2, -PH.h / 2, PH.w, PH.h, PH.r); paint(g, null, LW.frame);
  }
  function statusBar(g, o, light) {
    const col = light ? '#FFFFFF' : '#1c1c1c', y = PH.sy + 40, R = PH.sx + PH.sw;
    rrP(g, -72, PH.sy + 18, 144, 42, 21); g.fillStyle = '#121216'; g.fill();
    g.fillStyle = col; g.font = font(800, PHT.status); g.textBaseline = 'middle'; g.textAlign = 'left';
    if (o.mode === 'chat' && o.time) g.fillText(o.time, PH.sx + 44, y);
    for (let i = 0; i < 4; i++) { rrP(g, R - 148 + i * 11, y + 9 - (10 + i * 6), 7, 10 + i * 6, 2); g.fill(); }
    const b = o.battery == null ? 0.8 : clamp(o.battery);
    rrP(g, R - 92, y - 14, 54, 28, 7); g.lineWidth = 3; g.strokeStyle = col; g.stroke();
    rrP(g, R - 37, y - 6, 5, 12, 2); g.fill();
    rrP(g, R - 88, y - 10, Math.max(4, 46 * b), 20, 4); g.fillStyle = b < 0.2 ? C.badgeRed : col; g.fill();
  }
  function lockScreen(g, o) {
    const sx = PH.sx, sy = PH.sy, sw = PH.sw, sh = PH.sh, L = sx + 18, cw = sw - 36;
    const gr = g.createLinearGradient(0, sy, 0, sy + sh); gr.addColorStop(0, '#2C6E7B'); gr.addColorStop(1, '#86C7C8');
    g.fillStyle = gr; g.fillRect(sx, sy, sw, sh);
    ellP(g, 110, -120, 250, 250); g.fillStyle = 'rgba(214,240,232,0.22)'; g.fill();
    g.beginPath(); g.moveTo(sx, 320); g.quadraticCurveTo(-70, 210, 90, 300); g.quadraticCurveTo(210, 350, sx + sw, 270); g.lineTo(sx + sw, sy + sh); g.lineTo(sx, sy + sh); g.closePath(); g.fillStyle = '#3F8C98'; g.fill();
    g.beginPath(); g.moveTo(sx, 410); g.quadraticCurveTo(0, 340, sx + sw, 420); g.lineTo(sx + sw, sy + sh); g.lineTo(sx, sy + sh); g.closePath(); g.fillStyle = '#2F7280'; g.fill();
    statusBar(g, o, true);
    // padlock
    g.save(); g.translate(0, sy + 122); g.strokeStyle = '#FFFFFF'; g.lineWidth = 6; g.beginPath(); g.arc(0, -8, 13, Math.PI, 0); g.stroke(); rrP(g, -19, -8, 38, 29, 6); g.fillStyle = '#FFFFFF'; g.fill(); g.restore();
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#FFFFFF';
    if (o.date) { g.font = font(800, 40); g.fillText(o.date, 0, sy + 212); }
    g.font = font(900, 184); g.fillText(o.time || '9:41', 0, sy + 380);
    const notes = o.notes || [];
    let y = sy + 420;
    const shown = o.notesK == null ? notes.length : o.notesK;
    notes.forEach((n, i) => {
      const k = clamp(shown - i); if (k <= 0) return;
      const e = easeOutBack(k);
      g.font = font(700, PHT.body);
      const body = wrap(g, n.body || '', cw - 170), hgt = 120 + body.length * 50;
      g.save(); g.globalAlpha *= clamp(k * 3); g.translate(0, y + hgt / 2); g.scale(0.85 + 0.15 * e, 0.85 + 0.15 * e); g.translate(0, (1 - e) * 30);
      const extra = Math.min(2, Math.max(0, (n.count || 1) - 1));
      for (let j = extra; j >= 1; j--) { rrP(g, L + j * 18, -hgt / 2 + j * 16, cw - j * 36, hgt, 34); paint(g, j === 1 ? '#EDE6DA' : '#DCD3C6', 3.5); }
      rrP(g, L, -hgt / 2, cw, hgt, 34); paint(g, 'rgba(255,252,246,0.97)', 3.5);
      const icol = noteColour(n.icon), ix = L + 64, iy = -hgt / 2 + 64;   // noteColour/noteGlyph: call, mail, msg, bank, transfer
      ellP(g, ix, iy, 44, 44); paint(g, icol, 3.5);
      noteGlyph(g, n.icon, ix, iy, 1.0, '#FFFFFF');
      const tx = L + 130;
      g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#1c1c1c'; g.font = font(900, PHT.title); g.fillText(n.title || '', tx, -hgt / 2 + 76);
      g.font = font(700, PHT.body); g.fillStyle = '#333333';
      body.forEach((l, j) => g.fillText(l, tx, -hgt / 2 + 130 + j * 50));
      if (n.time) { g.textAlign = 'right'; g.font = font(700, PHT.small); g.fillStyle = '#8a8580'; g.fillText(n.time, L + cw - 26, -hgt / 2 + 66); }
      g.restore();
      y += (hgt + 26 + extra * 16) * easeOutCubic(k);
    });
  }
  function chatScreen(g, o) {
    const sx = PH.sx, sy = PH.sy, sw = PH.sw, sh = PH.sh, R = sx + sw, headH = 196, inTop = sy + sh - 136;
    g.fillStyle = '#FBF3E7'; g.fillRect(sx, sy, sw, sh);
    // header
    rectP(g, sx, sy, sw, headH); paint(g, '#FFFFFF', 0); line(g, sx, sy + headH, R, sy + headH, 3.5);
    statusBar(g, o, false);
    const hy = sy + 132;
    g.strokeStyle = X.teal; g.lineWidth = 7; g.beginPath(); g.moveTo(sx + 50, hy - 24); g.lineTo(sx + 30, hy); g.lineTo(sx + 50, hy + 24); g.stroke();
    if (o.contact) {
      ellP(g, sx + 118, hy, 46, 46); paint(g, o.avatarColor || '#A6A6A6', 3.5);
      g.fillStyle = '#FFFFFF'; g.font = font(900, 44); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(o.contact).charAt(0).toUpperCase(), sx + 118, hy + 2);
      g.textAlign = 'left'; g.fillStyle = '#1c1c1c'; g.font = font(900, PHT.name); g.fillText(o.contact, sx + 184, hy - 16);
      if (o.status !== '') { g.fillStyle = '#6f827d'; g.font = font(700, PHT.small); g.fillText(o.status == null ? 'online' : o.status, sx + 184, hy + 28); }
    }
    // input bar
    rectP(g, sx, inTop, sw, sy + sh - inTop); paint(g, '#FFFFFF', 0); line(g, sx, inTop, R, inTop, 3);
    const fx = sx + 22, fy = inTop + 22, fw = sw - 140, fh = 80;
    rrP(g, fx, fy, fw, fh, 40); paint(g, '#F6F1EA', 3.5);
    g.font = font(700, PHT.input); g.textBaseline = 'middle';
    const draft = o.draft || '';
    if (draft) {
      g.save(); rrP(g, fx + 4, fy + 2, fw - 8, fh - 4, 38); g.clip();
      const tw = g.measureText(draft).width, x0 = Math.min(fx + 28, fx + fw - 30 - tw);
      g.fillStyle = '#1c1c1c'; g.fillText(draft, x0, fy + fh / 2 + 2);
      if (Math.floor((o.t || 0) * 2.4) % 2 === 0) { rectP(g, x0 + tw + 4, fy + 18, 4, fh - 36); paint(g, X.teal, 0); }
      g.restore();
    } else if (o.placeholder !== '') { g.fillStyle = '#A9A29A'; g.fillText(o.placeholder || 'Message', fx + 28, fy + fh / 2 + 2); }
    const bx = R - 62, by = fy + fh / 2;
    ellP(g, bx, by, 42, 42); paint(g, X.teal, 3.5);
    g.fillStyle = '#FFFFFF'; polyP(g, [bx - 18, by - 20, bx + 24, by, bx - 18, by + 20, bx - 10, by]); g.fill();
    // messages, laid out from the bottom up
    g.save(); rectP(g, sx, sy + headH + 2, sw, inTop - (sy + headH + 2)); g.clip();
    const msgs = (o.messages || []).slice();
    if (o.typing) msgs.push({ from: o.typing, typing: true, k: o.typingK == null ? 1 : o.typingK });
    g.font = font(700, PHT.bubble);
    const maxW = Math.round(sw * 0.72), padX = 30, padY = 24;
    const lay = msgs.map(m => {
      const k = m.k == null ? 1 : clamp(m.k);
      if (m.typing) return { m, k, lines: [], w: 150, h: 84 };
      const lines = wrap(g, m.text || '', maxW); const w = Math.max(...lines.map(l => g.measureText(l).width)) + padX * 2;
      return { m, k, lines, w, h: lines.length * PHT.bubbleLine + padY * 2 - 8 };
    });
    let y = inTop - 26;
    const lx = sx + 26, rx = R - 26;
    for (let i = lay.length - 1; i >= 0; i--) {
      const L = lay[i]; if (L.k <= 0) continue;
      const e = easeOutBack(L.k), me = L.m.from === 'me';
      const bx2 = me ? rx - L.w : lx, by2 = y - L.h;
      g.save(); g.globalAlpha *= clamp(L.k * 3);
      const ox = me ? bx2 + L.w : bx2, oy = by2 + L.h;
      g.translate(ox, oy); g.scale(0.5 + 0.5 * e, 0.5 + 0.5 * e); g.translate(-ox, -oy);
      const fill = me ? X.teal : '#FFFFFF';
      // tail first, then the bubble over its root, so the outline reads as one shape
      g.beginPath();
      if (me) { g.moveTo(bx2 + L.w - 40, by2 + L.h - 2); g.quadraticCurveTo(bx2 + L.w + 2, by2 + L.h + 4, bx2 + L.w + 18, by2 + L.h + 14); g.quadraticCurveTo(bx2 + L.w + 2, by2 + L.h - 10, bx2 + L.w - 2, by2 + L.h - 34); }
      else { g.moveTo(bx2 + 40, by2 + L.h - 2); g.quadraticCurveTo(bx2 - 2, by2 + L.h + 4, bx2 - 18, by2 + L.h + 14); g.quadraticCurveTo(bx2 - 2, by2 + L.h - 10, bx2 + 2, by2 + L.h - 34); }
      g.closePath(); paint(g, fill, 3.5);
      rrP(g, bx2, by2, L.w, L.h, 34); paint(g, fill, 0);
      g.save(); rrP(g, bx2, by2, L.w, L.h, 34); g.lineWidth = 3.5; g.strokeStyle = INK; g.stroke(); g.restore();
      // re-cover the outline where the tail joins
      g.beginPath(); if (me) { g.moveTo(bx2 + L.w - 38, by2 + L.h - 6); g.lineTo(bx2 + L.w - 4, by2 + L.h - 30); g.lineTo(bx2 + L.w - 4, by2 + L.h - 6); } else { g.moveTo(bx2 + 38, by2 + L.h - 6); g.lineTo(bx2 + 4, by2 + L.h - 30); g.lineTo(bx2 + 4, by2 + L.h - 6); }
      g.closePath(); g.fillStyle = fill; g.fill();
      if (L.m.typing) {
        for (let d = 0; d < 3; d++) { const bb = Math.sin(((o.t || 0) * 2.2 - d * 0.18) * TAU) * 0.5 + 0.5; ellP(g, bx2 + 42 + d * 33, by2 + L.h / 2 - bb * 9, 11, 11); g.fillStyle = me ? '#FFFFFF' : '#9C958C'; g.fill(); }
      } else {
        g.fillStyle = me ? '#FFFFFF' : '#1c1c1c'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = font(700, PHT.bubble);
        L.lines.forEach((l, j) => g.fillText(l, bx2 + padX, by2 + padY + 38 + j * PHT.bubbleLine));
      }
      g.restore();
      y -= (L.h + 26) * easeOutCubic(L.k);
    }
    g.restore();
  }
  SETS.phoneScreen = function (g, o) {
    o = o || {}; refresh();
    if (o.bg !== false) {
      const bg = o.bg || '#F2B587';
      blit(g, camXf(null), layer('phonebg|' + bg, 1, (lg) => {
        lg.fillStyle = bg; lg.fillRect(0, 0, W, H);
        softFill(lg, 60, 'rgba(255,236,200,0.45)', () => ellP(lg, 960, 540, 600, 520));
        softFill(lg, 14, 'rgba(255,236,200,0.3)', () => polyP(lg, [240, -20, 500, -20, 100, H + 20, -160, H + 20]));
        softFill(lg, 14, 'rgba(255,236,200,0.25)', () => polyP(lg, [1520, -20, 1660, -20, 1260, H + 20, 1120, H + 20]));
      }));
    }
    const buzz = o.buzz || 0, t = o.t || 0, sc = o.scale || 1, cx = o.x == null ? 960 : o.x, cy = o.y == null ? 540 : o.y;
    const jx = buzz ? Math.sin(t * TAU * 22) * 7 * buzz : 0, jr = buzz ? Math.sin(t * TAU * 17) * 0.012 * buzz : 0;
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    g.translate(cx + jx, cy); g.rotate((o.rot || 0) + jr); g.scale(sc, sc);
    rrP(g, -PH.w / 2 + 18, -PH.h / 2 + 24, PH.w, PH.h, PH.r); g.fillStyle = 'rgba(100,48,22,0.22)'; g.fill();
    phoneBody(g);
    g.save(); rrP(g, PH.sx, PH.sy, PH.sw, PH.sh, PH.sr); g.clip();
    if (o.mode === 'chat') chatScreen(g, o); else lockScreen(g, o);
    g.restore();
    rrP(g, PH.sx, PH.sy, PH.sw, PH.sh, PH.sr); paint(g, null, 3.5);
    if (buzz > 0.05) { g.strokeStyle = INK; g.lineWidth = 6; g.globalAlpha = buzz; for (const sxn of [-1, 1]) for (const dy of [-70, 0, 70]) { g.beginPath(); g.moveTo(sxn * (PH.w / 2 + 36), dy - 22); g.quadraticCurveTo(sxn * (PH.w / 2 + 56), dy, sxn * (PH.w / 2 + 36), dy + 22); g.stroke(); } g.globalAlpha = 1; }
    g.restore();
    return { screen: { x: cx + PH.sx * sc, y: cy + PH.sy * sc, w: PH.sw * sc, h: PH.sh * sc } };
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

  // ================================================================ FIRSTBORN IN AN AFRICAN HOME: the second video's sets
  // Rooms (same contract as above: SETS.<name>(g, o) -> {floorY, anchors, tint, ...}, SETS.<name>Front, cached static layers):
  //   maternity, home (view 'lounge' | 'dining', tod 'day' | 'evening' | 'night', tv), kitchen, shop, school (view 'class' | 'board'),
  //   partyHall (also SETS.party(g, {hall: true})).
  // Graphic stages: lifePath (milestones, progress; result.at(u)), lab, courtroom, podium, bankCounter (signs), doorTrio (labels).
  // Screens and cards: phoneScreen modes 'bank' and 'call' and o.banner; badge, jobCard, rulesBoard, billCard; SETS.icon (milestone icons).
  // Test pages: src/SETS_<name>.html (?o={...}&fig=1&anchors=1&bench=1); renders in frames/SET_<name>.png.
  const SKIN = ['#A9714F', '#8E5B3E', '#C08A63', '#7A4B32'];   // brown skin tones for photo busts (blank faces)
  const NIGHT = [[0, '#F2D2A6'], [0.22, '#B49AB0'], [0.6, '#7B7AA6'], [1, '#5C5F90']];
  const EVE = [[0, '#FFF6EA'], [0.45, '#F6DCC6'], [1, '#DDB2A6']];
  // radial multiply grade (night, evening), centred on the light source
  function grade(g, lx, ly, r0, r1, stops) {
    overlay(g, 'multiply', () => { const gr = g.createRadialGradient(lx, ly, r0, lx, ly, r1); stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
  }
  // Tiled floor in one-point perspective from y0 down: rows deepen toward the front, joints run to (vpx, vpy).
  // o: col, alt (checker colour), line, vpx, vpy, step (joint spacing at y0), h0 (first row), grow, lw
  function tileFloor(g, y0, o) {
    const vpx = o.vpx == null ? W / 2 : o.vpx, vpy = o.vpy == null ? y0 - 540 : o.vpy, step = o.step || 160;
    rectP(g, 0, y0, W, H - y0 + 2); paint(g, o.col, 0);
    const rows = []; let y = y0, h = o.h0 || 32; while (y < H) { rows.push(y); y += h; h *= (o.grow || 1.3); } rows.push(Math.max(y, H + 1));
    const xAt = (x0, yy) => vpx + (x0 - vpx) * (yy - vpy) / (y0 - vpy);
    const R = Math.max(vpx, W - vpx) + step, xs = [];
    for (let x = vpx - Math.ceil(R / step) * step + (o.off || 0); x <= vpx + R; x += step) xs.push(x);
    if (o.alt) {
      g.fillStyle = o.alt;
      for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < xs.length - 1; j++) if ((i + j) % 2) { const a = rows[i], b = rows[i + 1]; polyP(g, [xAt(xs[j], a), a, xAt(xs[j + 1], a), a, xAt(xs[j + 1], b), b, xAt(xs[j], b), b]); g.fill(); }
    }
    g.strokeStyle = o.line; g.lineWidth = o.lw || 2.5;
    g.beginPath(); for (const r of rows) { g.moveTo(0, r); g.lineTo(W, r); } for (const x of xs) { g.moveTo(x, y0); g.lineTo(xAt(x, H + 20), H + 20); } g.stroke();
  }
  // Burglar-proof bars over a window's glass (the Nigerian window): uprights, two rails, a row of loops between them.
  function burglarBars(g, x, y, w, h, col) {
    col = col || '#5A504C';
    const n = Math.max(3, Math.round(w / 52));
    g.save(); rectP(g, x, y, w, h); g.clip();
    g.lineCap = 'butt';
    const bar = (x1, y1, x2, y2, wd) => { line(g, x1, y1, x2, y2, wd + 3, INK); line(g, x1, y1, x2, y2, wd, col); };
    for (const fy of [0.36, 0.64]) bar(x - 10, y + h * fy, x + w + 10, y + h * fy, 6);
    for (let i = 1; i < n; i++) bar(x + w * i / n, y - 10, x + w * i / n, y + h + 10, 6);
    for (let i = 0; i < n; i++) { const cx = x + w * (i + 0.5) / n, cy = y + h * 0.5, rx = w / n * 0.36, ry = h * 0.1; ellP(g, cx, cy, rx, ry); g.lineWidth = 7; g.strokeStyle = INK; g.stroke(); g.lineWidth = 4; g.strokeStyle = col; g.stroke(); }
    g.restore();
  }
  // Louvre window (glass blades over the sky), the West African classroom/kitchen window. o: sky, seed, frame, bars, ink
  function louvreWindow(g, x, y, w, h, o) {
    o = o || {};
    const frame = o.frame || '#E8D3AE', sh = dark(frame, 0.86), ink = o.ink || X.inkSoft, t = o.t || 18;
    const ix = x + t, iy = y + t, iw = w - 2 * t, ih = h - 2 * t, cols = o.cols || (iw > 330 ? 2 : 1), mull = 14, pw = (iw - mull * (cols - 1)) / cols;
    rectP(g, x, y, w, h); paint(g, frame, 0);
    for (let c = 0; c < cols; c++) {
      const px = ix + c * (pw + mull);
      clipDo(g, () => rectP(g, px, iy, pw, ih), () => {
        sky(g, ix, iy, iw, ih, o.sky || 'day', o.seed || 9);
        const n = Math.max(5, Math.round(ih / 40)), bh = ih / n;
        for (let i = 0; i < n; i++) {
          const by = iy + i * bh;
          polyP(g, [px - 2, by + 3, px + pw + 2, by + 3, px + pw + 2, by + bh * 0.62, px - 2, by + bh * 0.62]); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fill();
          line(g, px - 2, by + bh * 0.62, px + pw + 2, by + bh * 0.62, 2, rgba(ink, 0.55));
          line(g, px - 2, by + 3, px + pw + 2, by + 3, 1.6, 'rgba(255,255,255,0.7)');
        }
        // clips that hold the blades
        for (const cx of [px + 6, px + pw - 6]) { rectP(g, cx - 4, iy, 8, ih); paint(g, mix(frame, '#9AA3AA', 0.5), 0); }
      });
      polyP(g, [px - 7, iy - 7, px + pw + 7, iy - 7, px + pw, iy, px, iy, px, iy + ih, px - 7, iy + ih + 7]); paint(g, sh, 0);
      rectP(g, px, iy, pw, ih); paint(g, null, 2.6, ink);
      if (o.bars) burglarBars(g, px, iy, pw, ih, o.barCol);
    }
    rectP(g, x, y, w, h); paint(g, null, 3, ink);
    if (o.sill !== false) { const sy = y + h; shape(g, () => rectP(g, x - w * 0.03, sy, w * 1.06, 24), frame, 3, sh, () => rectP(g, x - w * 0.03, sy + 13, w * 1.06, 12), ink); }
  }
  // A bust in a photo: rounded shoulders, a blank round head, one hat or hairstyle. Faces stay blank (no real people).
  function bust(g, cx, base, r, skin, cloth, hat, hatCol) {
    const lw = Math.max(1.4, r * 0.09);
    if (hat === 'puffs') for (const sx of [-1, 1]) { ellP(g, cx + sx * r * 0.85, base - r * 3.05, r * 0.42, r * 0.42); paint(g, hatCol, lw); }
    if (hat === 'gele') { // a fanned headwrap rising above the head
      g.beginPath(); g.moveTo(cx - r * 1.05, base - r * 2.35); g.quadraticCurveTo(cx - r * 1.75, base - r * 3.7, cx - r * 0.5, base - r * 4.05);
      g.quadraticCurveTo(cx + r * 0.2, base - r * 3.5, cx + r * 0.65, base - r * 4.1); g.quadraticCurveTo(cx + r * 1.85, base - r * 3.75, cx + r * 1.05, base - r * 2.35); g.closePath(); paint(g, hatCol, lw);
      line(g, cx - r * 0.25, base - r * 3.6, cx + r * 0.3, base - r * 2.9, lw * 0.8);
    }
    // shoulders
    g.beginPath(); g.moveTo(cx - r * 1.95, base + 6); g.quadraticCurveTo(cx - r * 2.0, base - r * 1.45, cx, base - r * 1.5); g.quadraticCurveTo(cx + r * 2.0, base - r * 1.45, cx + r * 1.95, base + 6); g.closePath();
    paint(g, hat === 'cap' ? '#33333D' : cloth, lw);
    if (hat === 'cap') { polyP(g, [cx - r * 0.5, base - r * 1.42, cx + r * 0.5, base - r * 1.42, cx, base - r * 0.7]); paint(g, '#FFFFFF', lw * 0.8); }
    else { g.beginPath(); g.moveTo(cx - r * 0.42, base - r * 1.48); g.quadraticCurveTo(cx, base - r * 0.95, cx + r * 0.42, base - r * 1.48); paint(g, null, lw * 0.8); }
    // head (and neck under it)
    rectP(g, cx - r * 0.32, base - r * 1.9, r * 0.64, r * 0.5); paint(g, skin, 0);
    ellP(g, cx, base - r * 2.45, r, r * 1.06); paint(g, skin, lw);
    if (hat === 'hair' || hat === 'puffs') { g.save(); ellP(g, cx, base - r * 2.45, r, r * 1.06); g.clip(); ellP(g, cx, base - r * 3.05, r * 1.15, r * 0.82); g.fillStyle = hatCol; g.fill(); g.restore(); ellP(g, cx, base - r * 2.45, r, r * 1.06); paint(g, null, lw); }
    if (hat === 'gele') { g.beginPath(); g.ellipse(cx, base - r * 2.95, r * 1.08, r * 0.62, 0, Math.PI, TAU); g.closePath(); paint(g, hatCol, lw); }
    if (hat === 'fila') { g.save(); g.translate(cx + r * 0.1, base - r * 3.25); g.rotate(-0.16); rrP(g, -r * 0.95, -r * 0.42, r * 1.9, r * 0.72, [r * 0.5, r * 0.6, 3, 3]); paint(g, hatCol, lw); g.restore(); }
    if (hat === 'cap') {
      polyP(g, [cx - r * 1.45, base - r * 3.25, cx, base - r * 3.75, cx + r * 1.45, base - r * 3.25, cx, base - r * 2.8]); paint(g, '#2E2E36', lw);
      line(g, cx + r * 0.2, base - r * 3.3, cx + r * 1.15, base - r * 2.75, lw * 1.2, '#F4BF54');
    }
    if (hat === 'wrap') { g.beginPath(); g.moveTo(cx - r * 1.6, base + 6); g.quadraticCurveTo(cx - r * 1.5, base - r * 1.6, cx, base - r * 1.7); g.quadraticCurveTo(cx + r * 1.5, base - r * 1.6, cx + r * 1.6, base + 6); g.closePath(); paint(g, hatCol, lw); }
  }
  // [x 0..1, shoulder base 0..1, head radius (fraction of the photo width), skin index or colour, cloth, hat, hat colour]
  const PHOTO_KINDS = {
    family: [[0.28, 0.98, 0.12, 1, '#3A8594', 'fila', '#2F7280'], [0.7, 0.98, 0.115, 0, '#E37F78', 'gele', '#F4BF54'], [0.43, 1.06, 0.085, 2, '#F4BF54', 'puffs', '#2A1E18'], [0.58, 1.06, 0.085, 3, '#7BAFE1', 'hair', '#2A1E18']],
    couple: [[0.32, 1.0, 0.16, 1, '#FBF6EF', 'fila', '#E9A73F'], [0.69, 1.0, 0.15, 0, '#E9A73F', 'gele', '#E9A73F']],
    grad: [[0.5, 1.0, 0.2, 2, '#33333D', 'cap', '#2E2E36']],
    baby: [[0.5, 1.0, 0.22, '#FCEBCB', '#3A8594', 'wrap', '#3A8594']],
    elders: [[0.32, 1.0, 0.15, 3, '#8085A7', 'fila', '#6E5893'], [0.69, 1.0, 0.145, 1, '#77CC81', 'gele', '#3A8594']],
  };
  // A framed photo on the wall. kind: family | couple | grad | baby | elders. o: frame, bg (backdrop), wallSh
  function photo(g, x, y, w, h, kind, o) {
    o = o || {};
    const fr = o.frame || '#C98A3E', frSh = dark(fr, 0.8), t = Math.max(9, Math.min(w, h) * 0.075);
    rectP(g, x + 8, y + 10, w, h); paint(g, o.wallSh || 'rgba(120,60,30,0.16)', 0);
    shape(g, () => rectP(g, x, y, w, h), fr, LW.small, frSh, () => polyP(g, [x + w, y, x + w, y + h, x, y + h, x + t, y + h - t, x + w - t, y + h - t, x + w - t, y + t]));
    const ix = x + t, iy = y + t, iw = w - 2 * t, ih = h - 2 * t;
    clipDo(g, () => rectP(g, ix, iy, iw, ih), () => {
      g.fillStyle = o.bg || '#A9CFE0'; g.fillRect(ix, iy, iw, ih);
      ellP(g, ix + iw / 2, iy + ih * 0.42, iw * 0.46, ih * 0.42); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fill();
      for (const p of (PHOTO_KINDS[kind] || PHOTO_KINDS.family)) bust(g, ix + iw * p[0], iy + ih * p[1], iw * p[2], typeof p[3] === 'number' ? SKIN[p[3]] : p[3], p[4], p[5], p[6]);
      polyP(g, [ix + iw * 0.62, iy, ix + iw * 0.8, iy, ix + iw * 0.3, iy + ih, ix + iw * 0.12, iy + ih]); g.fillStyle = 'rgba(255,255,255,0.13)'; g.fill();
    });
    rectP(g, ix, iy, iw, ih); paint(g, null, LW.detail);
  }
  // A lace doily (the sofa-back cover): straight top, scalloped hem, a row of holes.
  function doily(g, cx, y, w, h, col) {
    const n = Math.max(4, Math.round(w / 26)), r = w / n / 2, x0 = cx - w / 2;
    const path = () => { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + w, y); g.lineTo(x0 + w, y + h); for (let i = n - 1; i >= 0; i--) g.arc(x0 + (i + 0.5) * w / n, y + h, r, 0, Math.PI, false); g.closePath(); };
    path(); paint(g, col || '#FFF6E6', LW.detail);
    g.fillStyle = dark(col || '#FFF6E6', 0.86);
    for (let i = 0; i < n; i++) { ellP(g, x0 + (i + 0.5) * w / n, y + h + r * 0.15, r * 0.32, r * 0.32); g.fill(); }
    for (let i = 0; i < n - 1; i++) { ellP(g, x0 + (i + 1) * w / n, y + h * 0.55, r * 0.26, r * 0.26); g.fill(); }
  }
  // A clock face with a rim colour of its own (C.clockRim is swapped for the call)
  function clockFaceRim(g, x, y, r, rim, sh) { const k = C.clockRim; C.clockRim = rim || k; clockFace(g, x, y, r, sh); C.clockRim = k; }
  // Standing fan: base, pole and the motor seen from the front (static). Blades and cage are live (fanFace).
  function fanStatic(g, x, fy, s, P) {
    const hy = fy - 500 * s;
    floorShadow(g, x, fy + 4, 86 * s, 13 * s, P.floorSh, 4);
    shape(g, () => { g.beginPath(); g.moveTo(x - 74 * s, fy); g.quadraticCurveTo(x - 70 * s, fy - 30 * s, x, fy - 32 * s); g.quadraticCurveTo(x + 70 * s, fy - 30 * s, x + 74 * s, fy); g.closePath(); }, P.fanBody, LW.small, P.fanBodySh, () => rectP(g, x + 12 * s, fy - 40 * s, 80 * s, 50 * s));
    shape(g, () => rectP(g, x - 10 * s, fy - 260 * s, 20 * s, 230 * s), P.fanBody, LW.small, P.fanBodySh, () => rectP(g, x + 3 * s, fy - 270 * s, 8 * s, 250 * s));
    shape(g, () => rrP(g, x - 16 * s, fy - 282 * s, 32 * s, 40 * s, 6 * s), P.fanBody, LW.small, P.fanBodySh, () => rectP(g, x + 4 * s, fy - 290 * s, 16 * s, 50 * s));
    shape(g, () => rectP(g, x - 6 * s, hy, 12 * s, fy - 282 * s - hy), P.fanPole || '#C9CED3', LW.small);
    shape(g, () => rrP(g, x - 34 * s, hy - 20 * s, 68 * s, 64 * s, 22 * s), P.fanBody, LW.small, P.fanBodySh, () => rectP(g, x + 8 * s, hy - 30 * s, 40 * s, 80 * s));
    return { x, y: hy - 8 * s, r: 92 * s };
  }
  function fanFace(g, F, a, P) {
    const { x, y, r } = F;
    ellP(g, x, y, r, r); g.fillStyle = 'rgba(255,255,255,0.16)'; g.fill();
    for (let i = 0; i < 3; i++) {
      g.save(); g.translate(x, y); g.rotate(a + i * TAU / 3);
      g.beginPath(); g.moveTo(r * 0.12, -r * 0.08); g.bezierCurveTo(r * 0.3, -r * 0.5, r * 0.86, -r * 0.42, r * 0.84, -r * 0.02); g.bezierCurveTo(r * 0.8, r * 0.24, r * 0.34, r * 0.22, r * 0.12, r * 0.08); g.closePath();
      paint(g, P.blade, LW.detail);
      g.beginPath(); g.moveTo(r * 0.2, -r * 0.03); g.bezierCurveTo(r * 0.4, -r * 0.3, r * 0.7, -r * 0.3, r * 0.78, -r * 0.08); g.lineTo(r * 0.76, r * 0.04); g.bezierCurveTo(r * 0.6, -r * 0.06, r * 0.4, -r * 0.04, r * 0.2, r * 0.03); g.closePath(); g.fillStyle = P.bladeSh; g.fill();
      g.restore();
    }
    g.strokeStyle = rgba(INK, 0.75); g.lineWidth = 1.5; g.beginPath();
    for (let i = 0; i < 18; i++) { const b = i / 18 * TAU; g.moveTo(x + Math.cos(b) * r * 0.2, y + Math.sin(b) * r * 0.2); g.lineTo(x + Math.cos(b) * r, y + Math.sin(b) * r); } g.stroke();
    ellP(g, x, y, r * 0.6, r * 0.6); g.lineWidth = 1.5; g.stroke();
    ellP(g, x, y, r, r); paint(g, null, LW.small + 1.5, INK); ellP(g, x, y, r - 3, r - 3); g.lineWidth = 2.5; g.strokeStyle = P.fanBody; g.stroke();
    ellP(g, x, y, r * 0.2, r * 0.2); paint(g, P.fanBody, LW.small);
    ellP(g, x, y, r * 0.09, r * 0.09); paint(g, P.blade, LW.detail);
  }
  // TV: bezel, little feet, and the glass (dark when off, pale glowing blue when on)
  function tvBody(g, x, y, w, h) {
    shape(g, () => polyP(g, [x + w * 0.3, y + h + 6, x + w * 0.36, y + h + 6, x + w * 0.33, y + h + 22, x + w * 0.24, y + h + 22]), '#2B2D33', LW.small);
    shape(g, () => polyP(g, [x + w * 0.64, y + h + 6, x + w * 0.7, y + h + 6, x + w * 0.76, y + h + 22, x + w * 0.67, y + h + 22]), '#2B2D33', LW.small);
    shape(g, () => rrP(g, x - 9, y - 9, w + 18, h + 18, 7), '#34363D', LW.small, '#26282E', () => rectP(g, x - 9, y + h, w + 18, 10));
    ellP(g, x + w / 2, y + h + 4, 2.5, 2.5); g.fillStyle = '#E5534B'; g.fill();
  }
  function tvGlass(g, x, y, w, h, on, flick) {
    if (on) {
      const k = flick == null ? 0 : flick;
      rectP(g, x, y, w, h); paint(g, mix('#CFEFF7', '#E8F2FF', k), 0);
      ellP(g, x + w * 0.5, y + h * 0.5, w * 0.42, h * 0.38); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill();
      rectP(g, x, y + h * (0.55 + 0.1 * k), w, h * 0.45); g.fillStyle = rgba('#9FD3E6', 0.35); g.fill();
    } else {
      rectP(g, x, y, w, h); paint(g, '#3A4150', 0);
      polyP(g, [x + w * 0.55, y, x + w * 0.75, y, x + w * 0.4, y + h, x + w * 0.2, y + h]); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fill();
    }
    rectP(g, x, y, w, h); paint(g, null, LW.detail);
  }
  // A pot of jollof rice: a wide aluminium pot (or an enamel one), orange rice heaped over the rim, a ladle. (cx, by) = pot bottom.
  function ricePot(g, cx, by, s, o) {
    o = o || {};
    const w = 300 * s, h = 190 * s, top = by - h, pot = o.pot || '#C9CED3', potSh = o.potSh || '#A9B0B8', rice = o.rice || '#F08A3C', riceSh = o.riceSh || '#D9712E';
    if (o.shadow !== false) floorShadow(g, cx, by + 4, w * 0.62, 16 * s, o.floorSh || 'rgba(120,60,30,0.3)', 5);
    // handles
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * w * 0.53, top + h * 0.28, 26 * s, 18 * s, 0, 0, TAU); g.lineWidth = 11 * s + 2 * LW.small; g.strokeStyle = INK; g.stroke(); g.lineWidth = 11 * s; g.strokeStyle = potSh; g.stroke(); }
    // rice heap (behind the front rim)
    const heap = () => { g.beginPath(); g.moveTo(cx - w * 0.47, top + 6 * s); g.bezierCurveTo(cx - w * 0.42, top - h * 0.4, cx - w * 0.15, top - h * 0.62, cx + w * 0.02, top - h * 0.6); g.bezierCurveTo(cx + w * 0.22, top - h * 0.6, cx + w * 0.44, top - h * 0.38, cx + w * 0.47, top + 6 * s); g.closePath(); };
    shape(g, heap, rice, LW.small, riceSh, () => { g.beginPath(); g.ellipse(cx + w * 0.32, top - h * 0.05, w * 0.3, h * 0.42, -0.4, 0, TAU); });
    // grains and a few peas/peppers on top
    const r = rng(o.seed || 17);
    for (let i = 0; i < 26; i++) { const a = r() * Math.PI, rr = r(); const gx = cx + Math.cos(a) * w * 0.4 * rr, gy = top - Math.sin(a) * h * 0.52 * rr + 4 * s; ellP(g, gx, gy, 5 * s, 2.6 * s); g.fillStyle = r() < 0.15 ? '#77CC81' : r() < 0.2 ? '#E5534B' : rgba('#FFE2B0', 0.8); g.fill(); }
    // the pot body: rim, body with one darker side
    shape(g, () => { g.beginPath(); g.moveTo(cx - w / 2, top); g.lineTo(cx + w / 2, top); g.lineTo(cx + w * 0.47, by - 14 * s); g.quadraticCurveTo(cx + w * 0.46, by, cx + w * 0.38, by); g.lineTo(cx - w * 0.38, by); g.quadraticCurveTo(cx - w * 0.46, by, cx - w * 0.47, by - 14 * s); g.closePath(); }, pot, LW.big, potSh,
      () => polyP(g, [cx + w * 0.18, top, cx + w * 0.6, top, cx + w * 0.6, by + 10, cx + w * 0.12, by + 10]));
    shape(g, () => rrP(g, cx - w * 0.53, top - 10 * s, w * 1.06, 22 * s, 10 * s), pot, LW.small, potSh, () => rectP(g, cx - w * 0.6, top + 2 * s, w * 1.2, 20 * s));
    line(g, cx - w * 0.36, top + h * 0.3, cx - w * 0.36, by - h * 0.18, 5 * s, 'rgba(255,255,255,0.55)');
    if (o.ladle !== false) {
      g.save(); g.translate(cx + w * 0.16, top - h * 0.45); g.rotate(0.5);
      shape(g, () => rrP(g, -8 * s, -150 * s, 16 * s, 160 * s, 8 * s), '#B9772F', LW.small, '#9C6227', () => rectP(g, 1 * s, -160 * s, 10 * s, 180 * s));
      g.restore();
    }
    if (o.heart) { // the aunties' rice: a little heart on the heap
      const hx = cx - w * 0.06, hy = top - h * 0.34, hs = 26 * s;
      g.beginPath(); g.moveTo(hx, hy + hs * 0.9); g.bezierCurveTo(hx - hs * 1.4, hy, hx - hs * 0.6, hy - hs * 1.0, hx, hy - hs * 0.35); g.bezierCurveTo(hx + hs * 0.6, hy - hs * 1.0, hx + hs * 1.4, hy, hx, hy + hs * 0.9); g.closePath(); paint(g, '#E5534B', LW.small);
    }
    return { x: cx, y: top - h * 0.3, top: top - h * 0.6 };
  }
  // A dining chair. view 'side' (in profile, facing +1 right or -1 left) or 'back' (seen from the front of the table: the back rises behind it)
  function chair(g, x, fy, s, view, facing, col, colSh, cush) {
    const seatY = fy - 205 * s, f = facing || 1;
    if (view === 'back') {
      for (const sx of [-1, 1]) shape(g, () => rectP(g, x + sx * 92 * s - 9 * s, seatY - 300 * s, 18 * s, 300 * s + 205 * s), col, LW.small, colSh, () => rectP(g, x + sx * 92 * s + 2 * s, seatY - 300 * s, 9 * s, 520 * s));
      shape(g, () => rrP(g, x - 104 * s, seatY - 300 * s, 208 * s, 46 * s, 10 * s), col, LW.small, colSh, () => rectP(g, x - 110 * s, seatY - 272 * s, 220 * s, 22 * s));
      for (const fx of [-0.4, 0, 0.4]) shape(g, () => rectP(g, x + fx * 92 * s - 6 * s, seatY - 254 * s, 12 * s, 200 * s), col, LW.detail);
      shape(g, () => rectP(g, x - 100 * s, seatY - 60 * s, 200 * s, 26 * s), col, LW.small, colSh, () => rectP(g, x - 100 * s, seatY - 46 * s, 200 * s, 14 * s));
      return { x, y: seatY };
    }
    const bx = x - f * 80 * s;
    shape(g, () => polyP(g, [bx - 9 * s, seatY, bx + 9 * s, seatY, bx + 9 * s - f * 10 * s, seatY - 280 * s, bx - 9 * s - f * 10 * s, seatY - 280 * s]), col, LW.small, colSh, () => rectP(g, bx, seatY - 290 * s, 12 * s, 300 * s));
    shape(g, () => rrP(g, bx - 14 * s - f * 12 * s, seatY - 300 * s, 28 * s, 140 * s, 10 * s), col, LW.small, colSh, () => rectP(g, bx - f * 12 * s, seatY - 310 * s, 18 * s, 160 * s));
    for (const lx of [x - 74 * s, x + 74 * s]) shape(g, () => rectP(g, lx - 8 * s, seatY, 16 * s, 205 * s), col, LW.small, colSh, () => rectP(g, lx + 1 * s, seatY, 7 * s, 205 * s));
    line(g, x - 70 * s, seatY + 120 * s, x + 70 * s, seatY + 120 * s, 8 * s + 2 * LW.detail); line(g, x - 70 * s, seatY + 120 * s, x + 70 * s, seatY + 120 * s, 8 * s, col);
    shape(g, () => rrP(g, x - 92 * s, seatY - 10 * s, 184 * s, 24 * s, 6 * s), col, LW.small, colSh, () => rectP(g, x - 92 * s, seatY + 4 * s, 184 * s, 12 * s));
    if (cush) shape(g, () => rrP(g, x - 82 * s, seatY - 26 * s, 164 * s, 20 * s, 8 * s), cush, LW.detail, dark(cush, 0.85), () => rectP(g, x - 82 * s, seatY - 14 * s, 164 * s, 10 * s));
    return { x, y: seatY };
  }
  // money text: draws '₦' as an N with two bars (the kit font has no naira sign), otherwise fillText. align: left | center | right
  function moneyText(g, text, x, y, align) {
    text = String(text);
    if (text.indexOf('₦') < 0) { g.textAlign = align || 'left'; g.fillText(text, x, y); return g.measureText(text).width; }
    const parts = text.split('₦'), wN = g.measureText('N').width;
    let tw = 0; parts.forEach((p, i) => { tw += g.measureText(p).width; if (i < parts.length - 1) tw += wN; });
    let cx = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
    const m = /(\d+(?:\.\d+)?)px/.exec(g.font), px = m ? +m[1] : 40;
    const base = g.textBaseline;
    g.textAlign = 'left';
    parts.forEach((p, i) => {
      g.fillText(p, cx, y); cx += g.measureText(p).width;
      if (i < parts.length - 1) {
        g.fillText('N', cx, y);
        // bar heights relative to the baseline (cap height ~0.7 em); middle baseline shifts them
        const off = base === 'middle' ? px * 0.35 : base === 'top' ? px * 0.85 : 0;
        for (const f of [0.3, 0.46]) { g.fillRect(cx - px * 0.07, y + off - px * f - px * 0.035, wN + px * 0.14, px * 0.07); }
        cx += wN;
      }
    });
    return tw;
  }
  // text that shrinks to fit a width (never under min px)
  function fitFont(g, text, weight, px, maxW, min) { let p = px; g.font = font(weight, p); while (p > (min || 40) && g.measureText(String(text)).width > maxW) { p -= 2; g.font = font(weight, p); } return p; }
  // a soft-edged ellipse without a blur filter (cheap enough for live drawing): a radial gradient squashed to the ellipse
  function softEll(g, cx, cy, rx, ry, col) {
    const m = /rgba?\(([^)]+)\)/.exec(col), parts = m ? m[1].split(',').map(Number) : hex(col).concat([1]);
    const c0 = 'rgba(' + parts[0] + ',' + parts[1] + ',' + parts[2] + ',' + (parts[3] == null ? 1 : parts[3]) + ')', c1 = 'rgba(' + parts[0] + ',' + parts[1] + ',' + parts[2] + ',0)';
    g.save(); g.translate(cx, cy); g.scale(1, ry / rx);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, c0); gr.addColorStop(0.6, c0.replace(/,([\d.]+)\)$/, (a, v) => ',' + (v * 0.8).toFixed(3) + ')')); gr.addColorStop(1, c1);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
  }

  // ================================================================ MATERNITY (Q01 "born", Q02 the young parents): a bright hospital room
  // SETS.maternity(g, o): o.sky ('morning' default | day | sunset | evening | night), o.bed (false hides the hospital bed), o.t (monitor pulse),
  // o.clock. Anchors: cot (the mattress, where the newborn lies), cotFloor, parentL, parentR (standing either side of the cot),
  // bed (sitting on the bed edge), bedHead (head on the pillow), left, center, right, window, monitor, clock.
  // SETS.maternityFront: the clear front wall of the cot (draw it after the baby so the baby lies inside).
  const MT = { FY: 830, wall: '#FBEFD6', wallSh: '#F0D6B4', wain: '#BFE3E0', wainSh: '#A8D3CE', rail: '#7FC4C9', floor: '#F5D9B2', floorAlt: '#F1CFA4', floorLine: '#E2BA8A', floorSh: '#D6A576',
    metal: '#C9D3DC', metalSh: '#A9B6C2', plastic: '#B6CEE6', plasticSh: '#9DB8D4', sheet: '#FFFFFF', sheetSh: '#E3EBEF', blanket: '#F2A57E', blanketSh: '#DD8C66', curtain: '#9DCFC6', curtainSh: '#86BDB4',
    cot: { cx: 860, top: 598, bot: 714, wt: 350, wb: 312, mat: 652 } };
  function cotBack(g) {
    const K = MT.cot, cx = K.cx;
    floorShadow(g, cx, 942, 200, 15, MT.floorSh, 5);
    // trolley: two posts, a cabinet with a drawer, a foot bar on castors
    for (const sx of [-1, 1]) shape(g, () => rectP(g, cx + sx * 128 - 9, 730, 18, 196), MT.metal, LW.small, MT.metalSh, () => rectP(g, cx + sx * 128 + 1, 730, 8, 196));
    shape(g, () => rrP(g, cx - 168, 906, 336, 18, 8), MT.metal, LW.small, MT.metalSh, () => rectP(g, cx - 170, 916, 340, 10));
    for (const sx of [-1, 1]) { shape(g, () => rectP(g, cx + sx * 150 - 6, 922, 12, 12), MT.metalSh, LW.detail); ellP(g, cx + sx * 150, 940, 12, 12); paint(g, '#55575C', LW.small); }
    shape(g, () => rrP(g, cx - 140, 770, 280, 104, 10), MT.plastic, LW.big, MT.plasticSh, () => rectP(g, cx - 140, 846, 280, 30));
    line(g, cx - 140, 820, cx + 140, 820, LW.detail);
    shape(g, () => rrP(g, cx - 40, 790, 80, 14, 7), '#FFFFFF', LW.detail);
    // tray under the basin
    shape(g, () => rrP(g, cx - K.wb / 2 - 14, K.bot, K.wb + 28, 22, 8), MT.metal, LW.small, MT.metalSh, () => rectP(g, cx - 200, K.bot + 12, 400, 12));
    // the basin seen through its clear front: back wall tint, mattress, a sheet with little stars
    const basin = () => polyP(g, [cx - K.wt / 2, K.top, cx + K.wt / 2, K.top, cx + K.wb / 2, K.bot, cx - K.wb / 2, K.bot]);
    basin(); paint(g, 'rgba(222,242,246,0.9)', 0);
    clipDo(g, basin, () => {
      rectP(g, cx - 200, K.mat, 400, K.bot - K.mat); paint(g, '#FFFFFF', 0);
      rectP(g, cx - 200, K.mat, 400, 12); paint(g, '#EAF1F4', 0);
      line(g, cx - 200, K.mat, cx + 200, K.mat, LW.detail);
      g.fillStyle = '#F4BF54'; for (let i = 0; i < 6; i++) { ellP(g, cx - 130 + i * 52, K.mat + 34 + (i % 2) * 14, 4.5, 4.5); g.fill(); }
    });
    line(g, cx - K.wt / 2 + 14, K.top + 10, cx + K.wt / 2 - 14, K.top + 10, LW.detail, rgba(INK, 0.4));
  }
  function cotFront(g) {
    const K = MT.cot, cx = K.cx;
    const basin = () => polyP(g, [cx - K.wt / 2, K.top, cx + K.wt / 2, K.top, cx + K.wb / 2, K.bot, cx - K.wb / 2, K.bot]);
    basin(); g.fillStyle = 'rgba(214,238,242,0.16)'; g.fill();
    clipDo(g, basin, () => {
      g.fillStyle = 'rgba(255,255,255,0.5)';
      polyP(g, [cx + 96, K.top, cx + 124, K.top, cx + 92, K.bot, cx + 64, K.bot]); g.fill();
      polyP(g, [cx + 136, K.top, cx + 148, K.top, cx + 116, K.bot, cx + 104, K.bot]); g.fill();
    });
    basin(); paint(g, null, LW.small);
    shape(g, () => rrP(g, cx - K.wt / 2 - 6, K.top - 8, K.wt + 12, 16, 8), '#E6F4F7', LW.small);
    // a blank name card on the front
    shape(g, () => rrP(g, cx - 150, K.bot - 52, 96, 40, 8), '#FFFFFF', LW.detail, '#E3EBEF', () => rectP(g, cx - 150, K.bot - 26, 96, 14));
    g.fillStyle = MT.rail; polyP(g, [cx - 136, K.bot - 40, cx - 118, K.bot - 40, cx - 127, K.bot - 24]); g.fill();
    line(g, cx - 108, K.bot - 38, cx - 66, K.bot - 38, 3, '#C9D3DC'); line(g, cx - 108, K.bot - 28, cx - 80, K.bot - 28, 3, '#C9D3DC');
  }
  function hospitalBed(g) {
    floorShadow(g, 1590, 936, 330, 18, MT.floorSh, 6);
    for (const lx of [1350, 1820]) { shape(g, () => rectP(g, lx - 8, 790, 16, 120), MT.metal, LW.small, MT.metalSh, () => rectP(g, lx + 1, 790, 7, 120)); ellP(g, lx, 922, 15, 15); paint(g, '#55575C', LW.small); }
    shape(g, () => rrP(g, 1300, 776, 580, 26, 8), MT.metal, LW.small, MT.metalSh, () => rectP(g, 1300, 790, 580, 14));
    // head board (right) and foot board (left)
    shape(g, () => rrP(g, 1846, 492, 46, 330, 16), MT.plastic, LW.big, MT.plasticSh, () => rectP(g, 1874, 484, 30, 350));
    shape(g, () => rrP(g, 1282, 590, 42, 232, 14), MT.plastic, LW.big, MT.plasticSh, () => rectP(g, 1308, 584, 30, 250));
    // mattress, pillow, a blanket folded back near the pillow and hanging over the near side
    shape(g, () => rrP(g, 1316, 668, 536, 60, 16), MT.sheet, LW.big, MT.sheetSh, () => rectP(g, 1310, 708, 550, 30));
    shape(g, () => { g.beginPath(); g.moveTo(1690, 668); g.quadraticCurveTo(1680, 622, 1716, 616); g.quadraticCurveTo(1770, 610, 1830, 618); g.quadraticCurveTo(1852, 636, 1840, 668); g.closePath(); }, MT.sheet, LW.small, MT.sheetSh, () => rectP(g, 1690, 650, 170, 20));
    const bl = () => { g.beginPath(); g.moveTo(1334, 662); g.quadraticCurveTo(1480, 652, 1640, 660); g.quadraticCurveTo(1652, 700, 1646, 752); g.quadraticCurveTo(1600, 766, 1560, 756); g.quadraticCurveTo(1500, 770, 1440, 756); g.quadraticCurveTo(1390, 768, 1344, 756); g.quadraticCurveTo(1326, 704, 1334, 662); g.closePath(); };
    shape(g, bl, MT.blanket, LW.big, MT.blanketSh, () => { g.beginPath(); g.moveTo(1300, 728); g.quadraticCurveTo(1480, 716, 1670, 726); g.lineTo(1670, 800); g.lineTo(1300, 800); g.closePath(); });
    shape(g, () => { g.beginPath(); g.moveTo(1600, 659); g.quadraticCurveTo(1622, 657, 1642, 660); g.quadraticCurveTo(1654, 704, 1648, 750); g.quadraticCurveTo(1620, 742, 1604, 748); g.quadraticCurveTo(1610, 700, 1600, 659); g.closePath(); }, MT.sheet, LW.small, MT.sheetSh, () => rectP(g, 1590, 720, 70, 40));
    g.strokeStyle = INK; g.lineWidth = LW.detail; g.beginPath(); g.moveTo(1336, 690); g.quadraticCurveTo(1470, 682, 1600, 688); g.stroke();
  }
  function maternityStatic(g, o) {
    const FY = MT.FY, skyK = o.sky || 'morning';
    rectP(g, 0, 0, W, FY); paint(g, MT.wall, 0);
    rectP(g, 0, 560, W, FY - 560); paint(g, MT.wain, 0);
    tileFloor(g, FY, { col: MT.floor, alt: MT.floorAlt, line: MT.floorLine, vpx: 900, vpy: 300, step: 180, h0: 34 });
    // window with a roller blind
    windowBox(g, 230, 140, 480, 360, { sky: skyK, seed: 51, frame: '#F6E6C8', ink: X.inkSoft, t: 24, mull: 20 });
    shape(g, () => rectP(g, 254, 164, 432, 84), '#FFF7E6', LW.detail, '#F0E3C6', () => rectP(g, 254, 228, 432, 20), X.inkSoft);
    shape(g, () => rrP(g, 240, 150, 460, 22, 11), '#FFFFFF', LW.detail, null, null, X.inkSoft);
    line(g, 640, 248, 640, 300, 2, X.inkSoft); ellP(g, 640, 306, 6, 6); paint(g, '#FFFFFF', 2, X.inkSoft);
    // privacy curtain on its ceiling track (right)
    line(g, 1560, 26, W + 10, 26, 6, '#B9C3CC'); line(g, 1560, 26, W + 10, 26, 2, INK);
    curtain(g, 1716, 30, 220, 790, MT, true);
    // the medical rail above the bed: outlets, a little light
    shape(g, () => rrP(g, 1330, 438, 470, 56, 12), '#F4F7F8', LW.small, '#DCE4E8', () => rectP(g, 1330, 474, 470, 20));
    for (const [ox, oc] of [[1380, '#77CC81'], [1440, '#7BAFE1'], [1500, '#F4F7F8'], [1560, '#F4F7F8']]) { ellP(g, ox, 462, 13, 13); paint(g, oc, LW.detail); ellP(g, ox, 462, 4, 4); paint(g, '#55575C', 0); }
    shape(g, () => rrP(g, 1620, 452, 150, 22, 10), '#FFF4C9', LW.detail);
    // the monitor on a wall arm (screen glows blank; the glow pulses live)
    softFill(g, 34, 'rgba(180,240,232,0.55)', () => rrP(g, 1360, 200, 260, 200, 40), 'screen');
    shape(g, () => rrP(g, 1636, 270, 30, 70, 8), '#E3E9ED', LW.small);
    g.beginPath(); g.moveTo(1650, 305); g.lineTo(1600, 300); g.lineWidth = 16 + LW.small * 2; g.strokeStyle = INK; g.stroke(); g.lineWidth = 16; g.strokeStyle = '#D5DCE1'; g.stroke();
    shape(g, () => rrP(g, 1384, 222, 220, 160, 16), '#E3E9ED', LW.big, '#C9D3DA', () => rectP(g, 1384, 352, 220, 32));
    rrP(g, 1402, 240, 184, 112, 8); paint(g, '#CFF6EF', LW.detail);
    for (const [bx, bc] of [[1540, '#77CC81'], [1566, '#F4BF54']]) { ellP(g, bx, 367, 6, 6); paint(g, bc, 1.6); }
    // sanitiser and a little picture (sun over hills)
    shape(g, () => rrP(g, 770, 380, 58, 92, 10), '#FFFFFF', LW.small, '#E3EBEF', () => rectP(g, 802, 380, 30, 92));
    shape(g, () => rrP(g, 790, 472, 18, 14, 3), '#B6CEE6', LW.detail);
    shape(g, () => rectP(g, 1070, 214, 170, 132), '#F2A264', LW.small);
    clipDo(g, () => rectP(g, 1082, 226, 146, 108), () => { g.fillStyle = '#FFF1D2'; g.fillRect(1082, 226, 146, 108); ellP(g, 1190, 262, 20, 20); g.fillStyle = '#F4BF54'; g.fill(); ellP(g, 1110, 360, 90, 50); g.fillStyle = '#9DCFC6'; g.fill(); ellP(g, 1210, 370, 80, 54); g.fillStyle = '#7FC4C9'; g.fill(); });
    rectP(g, 1082, 226, 146, 108); paint(g, null, LW.detail);
    // light: top band, window beams on wall and floor
    wallBand(g, MT.wall, MT.wallSh, [0, 0, W, 560], [-20, 150, 620, 40, 1300, 40, W + 20, 160]);
    clipDo(g, () => rectP(g, 0, 0, W, FY), () => softFill(g, 12, 'rgba(255,250,232,0.35)', () => polyP(g, [700, 160, 760, 160, 1100, FY + 10, 900, FY + 10]), 'screen'));
    softFill(g, 16, 'rgba(255,248,226,0.4)', () => polyP(g, [250, FY + 6, 700, FY + 6, 980, H, 260, H]), 'screen');
    // rail, skirting, floor line
    shape(g, () => rectP(g, -10, 548, W + 20, 20), MT.rail, LW.small, dark(MT.rail, 0.88), () => rectP(g, -10, 560, W + 20, 8));
    rectP(g, -10, FY - 16, W + 20, 16); paint(g, MT.wainSh, LW.detail);
    line(g, 0, FY, W, FY, LW.arch);
    clockFaceRim(g, 960, 172, 64, '#A3ADB8', mix(MT.wall, MT.wallSh, 0.85));
    if (o.bed !== false) hospitalBed(g);
    cotBack(g);
  }
  function maternityAnchors(o) {
    return {
      cot: { x: MT.cot.cx, y: MT.cot.mat, s: 1 }, cotFloor: { x: MT.cot.cx, y: 940, s: 1 },
      parentL: { x: 545, y: 975, s: 1 }, parentR: { x: 1175, y: 975, s: 1 },
      bed: o.bed === false ? undefined : { x: 1480, y: 672, s: 1 }, bedHead: o.bed === false ? undefined : { x: 1760, y: 630, s: 1 },
      left: { x: 380, y: 985, s: 1.02 }, center: { x: 960, y: 985, s: 1.02 }, right: { x: 1520, y: 985, s: 1.02 },
      window: { x: 470, y: 320, s: 1 }, monitor: { x: 1494, y: 296, s: 1 }, clock: { x: 960, y: 172, s: 1, r: 64 },
    };
  }
  SETS.maternity = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('maternity|' + (o.sky || 'morning') + '|' + (o.bed === false ? 0 : 1), devRes(g, xf), (lg) => maternityStatic(lg, o)));
    live(g, xf, (g2) => {
      clockHands(g2, 960, 172, 64, o.clock != null ? o.clock : 8.25);
      const p = 0.5 + 0.5 * Math.sin((o.t || 0) * TAU * 1.1);
      rrP(g2, 1402, 240, 184, 112, 8); g2.fillStyle = 'rgba(255,255,255,' + (0.08 + 0.22 * p).toFixed(3) + ')'; g2.fill();
      ellP(g2, 1514, 367, 6, 6); g2.fillStyle = 'rgba(229,83,75,' + (0.3 + 0.7 * p).toFixed(3) + ')'; g2.fill();
    });
    return result(xf, maternityAnchors(o), 985, MT.FY);
  };
  SETS.maternityFront = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    if (o.cot !== false) blit(g, xf, layer('maternityFront', devRes(g, xf), (lg) => cotFront(lg)), null, { x: 660, y: 580, w: 400, h: 150 });
    return result(xf, maternityAnchors(o), 985, MT.FY);
  };

  // ================================================================ HOME (the family's living room in a Nigerian home)
  // SETS.home(g, o): o.view 'lounge' (default: sofa set with lace covers, standing fan, TV on its cabinet, wall clock, family photos,
  // the front door) | 'dining' (the dining table and chairs, the glass cabinet, a calendar, the kitchen doorway).
  // o.tod 'day' | 'evening' | 'night' (todTo + todK crossfade as in living); o.tv (true: the screen glows; at night it lights the room);
  // o.lamp (night: the tube light on; default on unless the TV is), o.fan (false stops the fan), o.doorOpen (lounge), o.table (false: no
  // centre table), o.food (dining, false: bare table), o.clock, o.t.
  // Anchors (lounge): sofaL, sofaM, sofaR, armchair (seats), tv (screen centre), tvFront, door (standing just inside), doorway (standing
  // in the opening), table (centre table top), fan, clock, window, photos, left, center, right.
  // Anchors (dining): seat1, seat2, seat3 (behind the table, facing out), seatL, seatR (table ends, in profile), table, standL, standR,
  // doorway, clock, window, calendar, left, center, right.
  // SETS.homeFront: lounge: the centre table (and the door frame when the door is open); dining: the table with its cloth and food.
  const HM = { FY: 820, CX: 1600, wall: '#F6D3A2', wallSh: '#E8B884', side: '#EDC591', floor: '#E4AB77', floorAlt: '#DDA26E', floorLine: '#CB8F5F', floorSh: '#B9774E',
    sofa: '#9E4A43', sofaMid: '#8A3F3A', sofaSh: '#74332F', lace: '#FFF6E6', cushA: '#E9A73F', cushASh: '#CF8E30', cushB: '#3A8594', cushBSh: '#2F7280',
    curtain: '#E2A23E', curtainSh: '#C88A2E', rod: '#7E5A3E', winFrame: '#F3E2C4', wood: '#8E5634', woodSh: '#774629', woodLt: '#B0703F', woodLtSh: '#965E35',
    door: '#8A5236', doorSh: '#764429', doorFrame: '#B07446', rug: '#B9473F', rugSh: '#A13D36', rugBorder: '#E9B04A',
    fanBody: '#F3F0E8', fanBodySh: '#D9D3C6', blade: '#7BAFE1', bladeSh: '#6497C9', fanPole: '#C9CED3', cloth: '#FFF4E3', clothSh: '#EADCC6' };
  const TVNIGHT = [[0, '#D6E2F4'], [0.18, '#A9B2D6'], [0.55, '#76769F'], [1, '#4F5285']];
  const HOME_TOD = { day: { sky: 'day', tint: null }, evening: { sky: 'evening', tint: '#E9CDBE' }, night: { sky: 'night', tint: '#9C98C4' } };
  function hmSideFloor(x) { return HM.FY + (x - HM.CX) * (66 / (W - HM.CX)); }
  function hmDoorQuads() {
    const q = (xl, xr, tl, tr) => [xl, tl, xr, tr, xr, hmSideFloor(xr), xl, hmSideFloor(xl)];
    return { outer: q(1668, 1878, 104, 80), inner: q(1696, 1850, 130, 110) };
  }
  // sofa or armchair, frontal: back, seat, front, flared arms, lace covers, two cushions. Returns seat anchors.
  function homeSofa(g, x0, x1, P, n) {
    const aw = n > 1 ? 96 : 82, yb = n > 1 ? 506 : 532, ys = 716, yf = 762, yfb = 864, legY = 936, armTop = 640;
    floorShadow(g, (x0 + x1) / 2, legY - 4, (x1 - x0) * 0.56, 22, P.floorSh, 7);
    for (const [lx, ly, d] of [[x0 + 44, legY, 1], [x1 - 44, legY, -1], [x0 + aw + 40, legY - 34, 0], [x1 - aw - 40, legY - 34, 0]]) shape(g, () => polyP(g, [lx - 12, yfb, lx + 12, yfb, lx + 6 - d * 8, ly, lx - 6 - d * 8, ly]), '#4E3330', LW.small);
    shape(g, () => rrP(g, x0 + 34, yb, x1 - x0 - 68, ys - yb + 50, [42, 42, 8, 8]), P.sofa, LW.big, P.sofaMid, () => rectP(g, x0, ys - 30, x1 - x0, 90));
    const sx0 = x0 + aw - 6, sx1 = x1 - aw + 6, sw = (sx1 - sx0) / n;
    for (let i = 1; i < n; i++) line(g, sx0 + sw * i, yb + 34, sx0 + sw * i, ys - 10, LW.small);
    shape(g, () => polyP(g, [sx0, ys, sx1, ys, sx1 + 8, yf, sx0 - 8, yf]), P.sofa, LW.big, P.sofaMid, () => rectP(g, sx0 - 20, yf - 14, sx1 - sx0 + 40, 20));
    shape(g, () => rrP(g, sx0 - 12, yf - 4, sx1 - sx0 + 24, yfb - yf + 4, 10), P.sofaMid, LW.big, P.sofaSh, () => rectP(g, sx0 - 20, yfb - 34, sx1 - sx0 + 40, 40));
    for (let i = 1; i < n; i++) { line(g, sx0 + sw * i, ys + 2, sx0 + sw * i + (i - n / 2) * 4, yf, LW.small); line(g, sx0 + sw * i, yf, sx0 + sw * i, yfb - 2, LW.small); }
    for (let i = 0; i < n; i++) doily(g, sx0 + sw * (i + 0.5), yb + 22, Math.min(150, sw * 0.62), 40, P.lace);
    const arm = (X0, sx) => {
      shape(g, () => { g.beginPath(); g.moveTo(X0 + sx * 14, yfb + 8); g.lineTo(X0 + sx * 4, armTop + 50); g.quadraticCurveTo(X0 - sx * 6, armTop + 4, X0 + sx * 36, armTop); g.lineTo(X0 + sx * (aw - 16), armTop + 4); g.quadraticCurveTo(X0 + sx * (aw + 6), armTop + 10, X0 + sx * (aw - 2), armTop + 56); g.lineTo(X0 + sx * (aw - 10), yfb + 8); g.closePath(); }, P.sofa, LW.big, P.sofaMid,
        () => polyP(g, [X0 + sx * (aw - 32), armTop + 56, X0 + sx * (aw + 20), armTop + 46, X0 + sx * (aw + 20), yfb + 20, X0 + sx * (aw - 26), yfb + 20]));
      doily(g, X0 + sx * aw * 0.46, armTop - 4, aw * 0.72, 22, P.lace);
    };
    arm(x0, 1); arm(x1, -1);
    const pillow = (cx, cy, rot, col, sh, s) => {
      g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(s, s);
      const path = () => { g.beginPath(); g.moveTo(-72, -62); g.quadraticCurveTo(0, -74, 72, -62); g.quadraticCurveTo(82, 0, 72, 62); g.quadraticCurveTo(0, 72, -72, 62); g.quadraticCurveTo(-82, 0, -72, -62); g.closePath(); };
      shape(g, path, col, LW.big, sh, () => polyP(g, [-90, 18, 90, -36, 90, 90, -90, 90]));
      g.restore();
    };
    const ps = n > 1 ? 1 : 0.8;
    pillow(sx0 + 70 * ps, ys - 58 * ps, -0.14, P.cushA, P.cushASh, ps);
    if (n > 1) pillow(sx1 - 70, ys - 58, 0.14, P.cushB, P.cushBSh, 1);
    const seats = []; for (let i = 0; i < n; i++) seats.push({ x: sx0 + sw * (i + 0.5), y: ys + 22, s: 1 });
    return seats;
  }
  function homeWindowGlass(g, x, y, w, h, t, m, skyK, barCol) {
    const gw = w - 2 * t, pw = (gw - m) / 2;
    for (const px of [x + t, x + t + pw + m]) { clipDo(g, () => rectP(g, px, y + t, pw, h - 2 * t), () => sky(g, x + t, y + t, gw, h - 2 * t, skyK, 61)); burglarBars(g, px, y + t, pw, h - 2 * t, barCol); rectP(g, px, y + t, pw, h - 2 * t); paint(g, null, 2.6, X.inkSoft); }
  }
  function homeWindow(g, x, y, w, h, skyK, P) {
    const t = 20, m = 18;
    windowBox(g, x, y, w, h, { sky: skyK, seed: 61, frame: P.winFrame, ink: X.inkSoft, t, mull: m });
    homeWindowGlass(g, x, y, w, h, t, m, skyK, skyK === 'night' ? '#3B3437' : '#5A504C');
    curtain(g, x - 96, y - 38, 106, h + 92, P, false); curtain(g, x + w - 10, y - 38, 106, h + 92, P, true);
    shape(g, () => rrP(g, x - 118, y - 46, w + 236, 12, 6), P.rod, LW.detail);
    for (const ex of [x - 118, x + w + 118]) { ellP(g, ex, y - 40, 11, 11); paint(g, P.rod, LW.detail); }
  }
  function tubeLight(g, x, y, w, on) {
    if (on) softFill(g, 30, 'rgba(255,250,228,0.6)', () => ellP(g, x + w / 2, y + 10, w * 0.75, 70), 'screen');
    shape(g, () => rrP(g, x, y, w, 22, 6), '#F4F1EA', LW.small, '#DCD6CA', () => rectP(g, x, y + 14, w, 8));
    shape(g, () => rrP(g, x + 14, y + 22, w - 28, 16, 8), on ? '#FFFDF2' : '#E9ECEE', LW.detail);
  }
  function tvCabinet(g, x, y, w, P) {
    const h = 172;
    floorShadow(g, x + w / 2, y + h + 26, w * 0.56, 12, P.floorSh, 5);
    for (const lx of [x + 22, x + w - 22]) shape(g, () => polyP(g, [lx - 9, y + h, lx + 9, y + h, lx + 6, y + h + 24, lx - 6, y + h + 24]), P.woodSh, LW.small);
    shape(g, () => rectP(g, x, y + 18, w, h - 18), P.wood, LW.big, P.woodSh, () => rectP(g, x, y + h - 26, w, 26));
    // two glass doors with things inside, an open middle shelf with a decoder
    const dw = (w - 30) / 3;
    for (const [dx, glass] of [[x + 10, 1], [x + 20 + dw * 2, 1]]) {
      shape(g, () => rectP(g, dx, y + 32, dw, h - 66), '#6E4A3A', LW.small, '#5E3E31', () => rectP(g, dx, y + 32, dw, 18));
      if (glass) { for (let i = 0; i < 5; i++) { rectP(g, dx + 10 + i * 13, y + 70, 10, 56); paint(g, ['#E37F78', '#F4BF54', '#7BAFE1', '#77CC81', '#FBF6EF'][i], 1.4); } polyP(g, [dx + dw * 0.55, y + 32, dx + dw * 0.8, y + 32, dx + dw * 0.4, y + h - 34, dx + dw * 0.15, y + h - 34]); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fill(); }
      ellP(g, dx + (dx < x + w / 2 ? dw - 10 : 10), y + h * 0.55, 4, 4); paint(g, '#E9B04A', 1.4);
    }
    shape(g, () => rectP(g, x + 15 + dw, y + 32, dw, h - 66), '#5E3E31', LW.small);
    shape(g, () => rrP(g, x + 22 + dw, y + 72, dw - 14, 30, 4), '#2E2F34', LW.small, '#25262B', () => rectP(g, x + 22 + dw, y + 92, dw - 14, 10));
    ellP(g, x + dw + dw * 0.75, y + 84, 3.5, 3.5); g.fillStyle = '#77CC81'; g.fill();
    shape(g, () => rrP(g, x - 8, y, w + 16, 22, 4), P.woodLt, LW.big, P.woodLtSh, () => rectP(g, x - 8, y + 13, w + 16, 9));
    doily(g, x + w / 2, y + 20, w * 0.5, 16, P.lace);
  }
  function plasticFlowers(g, x, y, s) {
    for (const [a, l, c] of [[-1.9, 110, '#E37F78'], [-1.55, 130, '#F4BF54'], [-1.25, 104, '#FFFFFF'], [-1.7, 84, '#E37F78']]) {
      const ex = x + Math.cos(a) * l * s, ey = y - 60 * s + Math.sin(a) * l * s;
      line(g, x, y - 60 * s, ex, ey, 3, '#5F7357');
      for (let i = 0; i < 5; i++) { const b = i / 5 * TAU; ellP(g, ex + Math.cos(b) * 9 * s, ey + Math.sin(b) * 9 * s, 7 * s, 7 * s); paint(g, c, 1.4); }
      ellP(g, ex, ey, 5 * s, 5 * s); paint(g, '#F4BF54', 1.2);
    }
    leaf(g, x, y - 58 * s, -2.3, 46 * s, 8 * s, '#87A26A', '#6F8C57', 1.6); leaf(g, x, y - 58 * s, -0.8, 42 * s, 8 * s, '#87A26A', '#6F8C57', 1.6);
    shape(g, () => { g.beginPath(); g.moveTo(x - 20 * s, y); g.quadraticCurveTo(x - 30 * s, y - 34 * s, x - 12 * s, y - 62 * s); g.lineTo(x + 12 * s, y - 62 * s); g.quadraticCurveTo(x + 30 * s, y - 34 * s, x + 20 * s, y); g.closePath(); }, '#7FC4C9', LW.small, '#5FA9AF', () => rectP(g, x + 2 * s, y - 70 * s, 30 * s, 80 * s));
  }
  function homeDoor(g, P, open) {
    const D = hmDoorQuads(), o = D.outer, i = D.inner;
    if (open) {
      clipDo(g, () => polyP(g, i), () => {
        g.fillStyle = '#FFF0CF'; g.fillRect(1600, 0, 320, H);
        polyP(g, [1690, 600, 1860, 590, 1860, 940, 1690, 940]); paint(g, '#E9C27C', 0);
        softFill(g, 10, 'rgba(255,255,255,0.5)', () => polyP(g, [1700, 160, 1760, 160, 1840, 940, 1720, 940]));
      });
      // the leaf swung into the room against the side wall, hinge on the far edge
      shape(g, () => polyP(g, [i[0], i[1], i[0] - 66, i[1] - 30, i[6] - 66, i[7] + 34, i[6], i[7]]), P.door, LW.small, P.doorSh, () => polyP(g, [i[0] - 40, i[1] - 18, i[0] - 66, i[1] - 30, i[6] - 66, i[7] + 34, i[6] - 40, i[7] + 20]));
    } else {
      shape(g, () => polyP(g, i), P.door, LW.small, P.doorSh, () => polyP(g, [i[0], i[1], i[0] + 24, i[1] - 2, i[6] + 24, i[7] + 1, i[6], i[7]]));
      // two raised panels per half, in perspective
      const lerpQ = (u, v) => { const tx = i[0] + (i[2] - i[0]) * u, ty = i[1] + (i[3] - i[1]) * u, bx = i[6] + (i[4] - i[6]) * u, by = i[7] + (i[5] - i[7]) * u; return [tx + (bx - tx) * v, ty + (by - ty) * v]; };
      for (const [u0, u1] of [[0.22, 0.48], [0.56, 0.84]]) for (const [v0, v1] of [[0.07, 0.43], [0.52, 0.92]]) {
        const a = lerpQ(u0, v0), b = lerpQ(u1, v0), c = lerpQ(u1, v1), d = lerpQ(u0, v1);
        polyP(g, [a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]]); paint(g, P.doorSh, LW.detail);
      }
      const hd = lerpQ(0.9, 0.52);
      shape(g, () => rrP(g, hd[0] - 8, hd[1] - 34, 16, 68, 5), '#C9A15A', LW.detail); shape(g, () => rrP(g, hd[0] - 34, hd[1] - 6, 36, 12, 6), '#D8B26A', LW.detail);
      ellP(g, hd[0], hd[1] + 20, 3, 4); paint(g, '#3A2E30', 0);
      for (const v of [0.18, 0.78]) { const hp = lerpQ(0.02, v); shape(g, () => rrP(g, hp[0] - 5, hp[1] - 16, 10, 32, 3), '#7A6266', LW.detail); }
    }
    // frame (evenodd ring)
    g.save(); g.beginPath(); polyP(g, o); g.moveTo(i[0], i[1]); g.lineTo(i[6], i[7]); g.lineTo(i[4], i[5]); g.lineTo(i[2], i[3]); g.closePath(); g.fillStyle = P.doorFrame; g.fill('evenodd'); g.clip('evenodd');
    polyP(g, [o[0], o[1], o[2], o[3], o[2], o[3] + 16, o[0], o[1] + 16]); g.fillStyle = dark(P.doorFrame, 0.88); g.fill(); g.restore();
    polyP(g, o); paint(g, null, LW.small); polyP(g, i); paint(g, null, LW.small);
  }
  function homeDoorMat(g) {
    const sf = hmSideFloor;
    shape(g, () => polyP(g, [1676, sf(1676) + 12, 1866, sf(1866) + 12, 1812, sf(1812) + 70, 1600, sf(1600) + 62]), '#9C6A48', LW.small, '#865A3D', () => polyP(g, [1640, sf(1640) + 44, 1840, sf(1840) + 44, 1812, sf(1812) + 70, 1600, sf(1600) + 62]));
    // a pair of flip-flops by the door
    for (const [sx, sy, a, c] of [[1700, sf(1700) + 36, -0.25, '#3A8594'], [1748, sf(1748) + 40, -0.1, '#3A8594']]) {
      g.save(); g.translate(sx, sy); g.rotate(a); ellP(g, 0, 0, 16, 34); paint(g, c, LW.detail); g.beginPath(); g.moveTo(-12, 4); g.lineTo(0, -16); g.lineTo(12, 4); g.lineWidth = 3; g.strokeStyle = '#F4BF54'; g.stroke(); g.restore();
    }
  }
  function centreTable(g, P, noShadow) {
    if (!noShadow) floorShadow(g, 935, 978, 270, 16, P.floorSh, 6);
    const leg = (x1, y1, x2, y2) => shape(g, () => polyP(g, [x1 - 10, y1, x1 + 10, y1, x2 + 6, y2, x2 - 6, y2]), P.wood, LW.small, P.woodSh, () => polyP(g, [x1 + 1, y1, x1 + 10, y1, x2 + 6, y2, x2, y2]));
    leg(780, 900, 768, 972); leg(1090, 900, 1102, 972); leg(830, 896, 836, 940); leg(1040, 896, 1034, 940);
    shape(g, () => rectP(g, 790, 930, 290, 12), P.wood, LW.detail);
    // glass top in a wooden frame, a bowl of fruit and a biscuit tin
    shape(g, () => polyP(g, [776, 862, 1094, 862, 1124, 892, 746, 892]), 'rgba(196,226,232,0.9)', LW.big, 'rgba(160,200,210,0.9)', () => polyP(g, [960, 862, 1094, 862, 1124, 892, 1000, 892]));
    polyP(g, [990, 864, 1020, 864, 950, 890, 920, 890]); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill();
    shape(g, () => rrP(g, 746, 890, 378, 16, [0, 0, 6, 6]), P.wood, LW.small, P.woodSh, () => rectP(g, 746, 898, 378, 8));
    for (const [fx, fy, fc] of [[836, 846, '#F4BF54'], [866, 840, '#77CC81'], [890, 848, '#E37F78']]) { ellP(g, fx, fy, 18, 18); paint(g, fc, LW.detail); }
    shape(g, () => { g.beginPath(); g.moveTo(810, 852); g.lineTo(916, 852); g.quadraticCurveTo(910, 874, 880, 874); g.lineTo(846, 874); g.quadraticCurveTo(816, 874, 810, 852); g.closePath(); }, '#FBF6EF', LW.detail);
    shape(g, () => rrP(g, 996, 826, 70, 44, 6), '#E5534B', LW.detail, '#C9443D', () => rectP(g, 1040, 820, 30, 54));
    shape(g, () => rrP(g, 992, 820, 78, 12, 4), '#F4BF54', LW.detail);
  }
  function homeLounge(g, o, tod) {
    const P = HM, FY = P.FY, CX = P.CX, T = HOME_TOD[tod];
    tileFloor(g, FY, { col: P.floor, alt: P.floorAlt, line: P.floorLine, vpx: 860, vpy: 280, step: 200, h0: 36 });
    rectP(g, 0, 0, CX, FY); paint(g, P.wall, 0);
    polyP(g, [CX, 0, W, 0, W, hmSideFloor(W), CX, hmSideFloor(CX)]); paint(g, P.side, 0);
    // skirting
    rectP(g, -10, FY - 18, CX + 10, 18); paint(g, P.woodLt, LW.detail);
    polyP(g, [CX, hmSideFloor(CX) - 18, W, hmSideFloor(W) - 18, W, hmSideFloor(W), CX, hmSideFloor(CX)]); paint(g, P.woodLt, LW.detail);
    homeWindow(g, 120, 168, 330, 300, T.sky, P);
    tubeLight(g, 1330, 150, 220, tod !== 'day');
    // family wall: the clock and the photos
    clockFaceRim(g, 935, 116, 52, '#C98A3E', mix(P.wall, P.wallSh, 0.9));
    photo(g, 828, 196, 214, 172, 'family', { frame: '#C98A3E' });
    photo(g, 690, 222, 112, 140, 'grad', { frame: '#9C6A48', bg: '#E7C9A0' });
    photo(g, 1068, 222, 112, 140, 'baby', { frame: '#9C6A48', bg: '#F6D9E0' });
    homeDoor(g, P, !!o.doorOpen);
    // light: top band on both walls, the window's light
    wallBand(g, P.wall, P.wallSh, [0, 0, CX, FY], [-20, 120, 600, 34, 1200, 30, CX + 20, 96]);
    overlay(g, 'multiply', () => clipDo(g, () => polyP(g, [CX, 0, W, 0, W, H, CX, H]), () => softFill(g, 4, mulTo(P.side, P.wallSh), () => { g.beginPath(); g.moveTo(CX - 20, 84); g.bezierCurveTo(1700, 96, 1840, 150, W + 20, 260); g.lineTo(W + 20, -20); g.lineTo(CX - 20, -20); g.closePath(); })));
    if (tod === 'day') {
      clipDo(g, () => rectP(g, 0, 0, CX, FY), () => softFill(g, 12, 'rgba(255,248,226,0.3)', () => polyP(g, [450, 190, 500, 190, 760, FY, 600, FY]), 'screen'));
      softFill(g, 16, 'rgba(255,246,220,0.35)', () => polyP(g, [130, FY + 4, 460, FY + 4, 780, H, 300, H]), 'screen');
    }
    line(g, CX, -5, CX, hmSideFloor(CX), LW.arch * 0.8, '#5E3A2A');
    line(g, 0, FY, CX, FY, LW.arch); line(g, CX, hmSideFloor(CX), W, hmSideFloor(W), LW.arch);
    homeDoorMat(g);
    // rug
    shape(g, () => polyP(g, [560, 880, 1320, 880, 1420, H + 10, 460, H + 10]), P.rugBorder, LW.small);
    shape(g, () => polyP(g, [590, 892, 1290, 892, 1378, H + 10, 502, H + 10]), P.rug, LW.detail, P.rugSh, () => polyP(g, [590, 892, 1290, 892, 1296, 906, 586, 906]));
    g.strokeStyle = P.rugBorder; g.lineWidth = 4; for (const [a, b] of [[940, 930], [940, 1010]]) { g.beginPath(); g.moveTo(a - 60, b); g.lineTo(a, b - 22); g.lineTo(a + 60, b); g.lineTo(a, b + 22); g.closePath(); g.stroke(); }
    // furniture: TV on its cabinet, fan, armchair, sofa
    tvCabinet(g, 1290, 690, 300, P);
    tvBody(g, 1318, 530, 244, 136);
    tvGlass(g, 1318, 530, 244, 136, !!o.tv);
    if (o.tv) softFill(g, 30, 'rgba(200,236,255,0.5)', () => ellP(g, 1440, 598, 200, 130), 'screen');
    plasticFlowers(g, 1300, 690, 0.8);
    homeSofa(g, 110, 450, P, 1);
    const F = fanStatic(g, 532, 902, 0.92, P);
    homeSofa(g, 612, 1258, P, 2);
    if (o.table !== false) centreTable(g, P);
    homeLoungeLight(g, o, tod);
    return F;
  }
  function homeLoungeLight(g, o, tod) {
    // evening and night: grade the room toward its light, then relight the glass, the tube and the screen
    if (tod === 'day') return;
    const T = HOME_TOD[tod], tvLit = !!o.tv, lampOn = o.lamp != null ? !!o.lamp : (tod === 'evening' || !tvLit);
    if (tod === 'night') { if (tvLit && !lampOn) grade(g, 1440, 600, 40, 1400, TVNIGHT); else grade(g, 1440, 170, 60, 1600, NIGHT); }
    else grade(g, 1440, 170, 80, 1500, EVE);
    homeWindowGlass(g, 120, 168, 330, 300, 20, 18, T.sky, tod === 'night' ? '#3B3437' : '#5A504C');
    if (lampOn) { tubeLight(g, 1330, 150, 220, true); softFill(g, 40, 'rgba(255,236,190,0.28)', () => ellP(g, 1440, 220, 420, 220), 'screen'); }
    if (tvLit) { softFill(g, 36, 'rgba(170,210,255,0.3)', () => ellP(g, 1440, 600, 230, 150), 'screen'); softFill(g, 30, 'rgba(170,210,255,0.12)', () => polyP(g, [1318, 680, 1562, 680, 1480, H, 820, H]), 'screen'); }
  }
  // keep only the pixels the piece drew before a lighting pass (the grade would paint the empty parts of a front layer)
  function maskedPass(lg, pass) {
    const c = lg.canvas, m = mkCanvas(c.width, c.height); m.getContext('2d').drawImage(c, 0, 0);
    pass(lg);
    lg.save(); lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'destination-in'; lg.drawImage(m, 0, 0); lg.restore();
  }
  function homeLoungeAnchors(o) {
    const sf = hmSideFloor;
    return {
      sofaL: { x: 820, y: 738, s: 1 }, sofaM: { x: 935, y: 738, s: 1 }, sofaR: { x: 1050, y: 738, s: 1 }, armchair: { x: 280, y: 738, s: 1 },
      tv: { x: 1440, y: 598, s: 1, w: 244, h: 136 }, tvFront: { x: 1440, y: 985, s: 1 },
      door: { x: 1730, y: 968, s: 0.98 }, doorway: { x: 1772, y: sf(1772) + 6, s: 0.9 }, table: { x: 935, y: 862, s: 1 },
      fan: { x: 532, y: 440, s: 1 }, clock: { x: 935, y: 116, s: 1, r: 52 }, window: { x: 285, y: 318, s: 1 }, photos: { x: 935, y: 282, s: 1 },
      left: { x: 330, y: 990, s: 1.02 }, center: { x: 960, y: 990, s: 1.02 }, right: { x: 1500, y: 990, s: 1.02 },
    };
  }
  // ---------------------------------------------------------------- dining view
  function calendar(g, x, y, w, h) {
    line(g, x + w / 2, y - 40, x + w * 0.2, y, 2); line(g, x + w / 2, y - 40, x + w * 0.8, y, 2); ellP(g, x + w / 2, y - 42, 5, 5); paint(g, '#6A5A4A', 0);
    shape(g, () => rectP(g, x, y, w, h), '#FFFDF6', LW.small, '#EFE6D6', () => rectP(g, x + w * 0.8, y, w * 0.2, h));
    clipDo(g, () => rectP(g, x + 10, y + 10, w - 20, h * 0.42), () => { g.fillStyle = '#9FCFE0'; g.fillRect(x, y, w, h); ellP(g, x + w * 0.3, y + h * 0.42, w * 0.5, h * 0.16); g.fillStyle = '#87A26A'; g.fill(); ellP(g, x + w * 0.75, y + h * 0.12, 14, 14); g.fillStyle = '#F4BF54'; g.fill(); });
    rectP(g, x + 10, y + 10, w - 20, h * 0.42); paint(g, null, LW.detail);
    rectP(g, x + 10, y + h * 0.46, w - 20, 16); paint(g, '#E5534B', 0);
    const gx = x + 12, gy = y + h * 0.46 + 24, cw = (w - 24) / 7, chh = (h * 0.5 - 30) / 5;
    g.fillStyle = '#D8CFC2';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) { rectP(g, gx + c * cw + 3, gy + r * chh + 3, cw - 6, chh - 6); g.fill(); }
    ellP(g, gx + 4.5 * cw, gy + 2.5 * chh, cw * 0.55, chh * 0.6); g.lineWidth = 3; g.strokeStyle = '#E5534B'; g.stroke();
  }
  function glassCabinet(g, x, y, w, h, P) {
    floorShadow(g, x + w / 2, y + h + 8, w * 0.6, 12, P.floorSh, 5);
    shape(g, () => rectP(g, x, y, w, h), P.wood, LW.big, P.woodSh, () => rectP(g, x + w - 26, y, 26, h));
    const gy = y + 24, gh = h * 0.56, iw = (w - 44) / 2;
    for (const gx of [x + 16, x + 28 + iw]) {
      shape(g, () => rectP(g, gx, gy, iw, gh), '#F3E6D2', LW.small);
      for (const sy of [gy + gh * 0.36, gy + gh * 0.7]) line(g, gx, sy, gx + iw, sy, LW.detail);
      // plates standing, cups, a gold-rimmed dish
      for (let i = 0; i < 2; i++) { ellP(g, gx + iw * (0.3 + i * 0.4), gy + gh * 0.2, iw * 0.17, iw * 0.17); paint(g, '#FFFFFF', LW.detail); ellP(g, gx + iw * (0.3 + i * 0.4), gy + gh * 0.2, iw * 0.1, iw * 0.1); paint(g, null, 1.5, '#E9B04A'); }
      for (let i = 0; i < 3; i++) shape(g, () => rrP(g, gx + 12 + i * iw * 0.3, gy + gh * 0.52, iw * 0.2, gh * 0.16, 4), ['#7BAFE1', '#E37F78', '#F4BF54'][i], LW.detail);
      shape(g, () => { g.beginPath(); g.ellipse(gx + iw / 2, gy + gh * 0.84, iw * 0.34, gh * 0.08, 0, 0, Math.PI); g.closePath(); }, '#FFFFFF', LW.detail);
      polyP(g, [gx + iw * 0.6, gy, gx + iw * 0.8, gy, gx + iw * 0.35, gy + gh, gx + iw * 0.15, gy + gh]); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fill();
      rectP(g, gx, gy, iw, gh); paint(g, null, LW.small);
      const dy = gy + gh + 16;
      shape(g, () => rectP(g, gx, dy, iw, h - (dy - y) - 20), P.woodLt, LW.small, P.woodLtSh, () => rectP(g, gx, dy, iw, 14));
      ellP(g, gx + (gx < x + w / 2 ? iw - 12 : 12), dy + 40, 5, 5); paint(g, '#E9B04A', 1.4);
    }
    shape(g, () => rectP(g, x - 10, y - 18, w + 20, 22), P.woodLt, LW.big, P.woodLtSh, () => rectP(g, x - 10, y - 6, w + 20, 10));
  }
  function kitchenDoorway(g, x, y, w, P) {
    const FY = P.FY;
    shape(g, () => rectP(g, x - 18, y - 18, w + 36, FY - y + 18), P.doorFrame, LW.small);
    rectP(g, x, y, w, FY - y); paint(g, '#F8DFA6', LW.small);
    softFill(g, 12, 'rgba(255,255,255,0.4)', () => polyP(g, [x + 30, y, x + 90, y, x + 140, FY, x + 40, FY]));
    // a patterned curtain hanging in the doorway, slightly parted
    const cur = (cx, cw, flip) => {
      const path = () => { g.beginPath(); g.moveTo(cx, y - 4); g.lineTo(cx + cw, y - 4); g.quadraticCurveTo(cx + cw + (flip ? 8 : -20), (y + FY) / 2, cx + cw + (flip ? 4 : -34), FY - 30); g.lineTo(cx + (flip ? 30 : 0), FY - 30); g.quadraticCurveTo(cx + (flip ? 14 : 0), (y + FY) / 2, cx, y - 4); g.closePath(); };
      shape(g, path, '#3A8594', LW.small, '#2F7280', () => { g.beginPath(); for (const fx of [cx + cw * 0.25, cx + cw * 0.65]) g.rect(fx, y - 10, cw * 0.14, FY); });
      clipDo(g, path, () => { g.fillStyle = '#F4BF54'; for (let r = 0; r < 9; r++) for (let c = 0; c < 3; c++) { ellP(g, cx + cw * (0.2 + c * 0.32) + (r % 2) * 14, y + 30 + r * 66, 9, 9); g.fill(); } });
      path(); paint(g, null, LW.small);
    };
    cur(x + 4, w * 0.52, false); cur(x + w * 0.5, w * 0.48, true);
    shape(g, () => rrP(g, x - 24, y - 16, w + 48, 12, 6), P.rod, LW.detail);
  }
  function diningTable(g, P, o, noShadow) {
    if (!noShadow) floorShadow(g, 960, 932, 520, 20, P.floorSh, 7);
    for (const lx of [500, 1420]) shape(g, () => rectP(g, lx - 13, 700, 26, 226), P.wood, LW.small, P.woodSh, () => rectP(g, lx + 2, 700, 11, 226));
    shape(g, () => polyP(g, [488, 572, 1432, 572, 1452, 612, 468, 612]), P.cloth, LW.big, P.clothSh, () => polyP(g, [468, 600, 1452, 600, 1452, 612, 468, 612]));
    // the cloth hangs over the front edge with a lace hem
    shape(g, () => { g.beginPath(); g.moveTo(468, 612); g.lineTo(1452, 612); g.lineTo(1456, 690); const n = 22; for (let i = n - 1; i >= 0; i--) { const x = 464 + (i + 0.5) * 992 / n; g.arc(x, 690, 992 / n / 2, 0, Math.PI, false); } g.closePath(); }, P.cloth, LW.big, P.clothSh,
      () => { g.beginPath(); g.rect(460, 612, 1000, 16); });
    g.fillStyle = P.clothSh; for (let i = 0; i < 22; i++) { ellP(g, 464 + (i + 0.5) * 992 / 22, 694, 5, 5); g.fill(); }
    if (o.food !== false) {
      // a food flask (cooler), a bowl of stew, a plate stack, a water jug and cups
      shape(g, () => rrP(g, 700, 512, 130, 82, 18), '#E37F78', LW.small, '#C9665F', () => rectP(g, 780, 500, 60, 110));
      shape(g, () => { g.beginPath(); g.ellipse(765, 512, 66, 14, 0, 0, TAU); }, '#F4BF54', LW.small);
      shape(g, () => rrP(g, 748, 486, 34, 20, 6), '#F4BF54', LW.detail);
      shape(g, () => { g.beginPath(); g.moveTo(880, 556); g.lineTo(1040, 556); g.quadraticCurveTo(1030, 596, 960, 598); g.quadraticCurveTo(890, 596, 880, 556); g.closePath(); }, '#FBF6EF', LW.small, '#E9E0D2', () => rectP(g, 980, 550, 70, 50));
      shape(g, () => { g.beginPath(); g.ellipse(960, 556, 80, 12, 0, 0, TAU); }, '#C9443D', LW.detail);
      for (let i = 0; i < 4; i++) shape(g, () => { g.beginPath(); g.ellipse(1120, 590 - i * 9, 60, 11, 0, 0, TAU); }, '#FFFFFF', LW.detail);
      shape(g, () => { g.beginPath(); g.moveTo(1222, 594); g.lineTo(1276, 594); g.lineTo(1284, 520); g.lineTo(1214, 520); g.closePath(); }, 'rgba(220,240,246,0.95)', LW.small);
      rectP(g, 1219, 548, 61, 44); g.fillStyle = 'rgba(123,175,225,0.55)'; g.fill();
      g.beginPath(); g.moveTo(1282, 532); g.quadraticCurveTo(1310, 540, 1282, 576); g.lineWidth = LW.small; g.strokeStyle = INK; g.stroke();
      for (const cx of [580, 1350]) shape(g, () => { g.beginPath(); g.moveTo(cx - 20, 596); g.lineTo(cx + 20, 596); g.lineTo(cx + 24, 556); g.lineTo(cx - 24, 556); g.closePath(); }, 'rgba(220,240,246,0.95)', LW.small);
    }
  }
  function homeDining(g, o, tod) {
    const P = HM, FY = P.FY, T = HOME_TOD[tod];
    tileFloor(g, FY, { col: P.floor, alt: P.floorAlt, line: P.floorLine, vpx: 960, vpy: 280, step: 200, h0: 36 });
    rectP(g, 0, 0, W, FY); paint(g, P.wall, 0);
    rectP(g, -10, FY - 18, W + 20, 18); paint(g, P.woodLt, LW.detail);
    homeWindow(g, 795, 160, 330, 290, T.sky, P);
    clockFaceRim(g, 1430, 190, 58, '#C98A3E', mix(P.wall, P.wallSh, 0.9));
    calendar(g, 1440, 320, 150, 210);
    photo(g, 150, 150, 170, 140, 'elders', { frame: '#C98A3E', bg: '#E7C9A0' });
    photo(g, 470, 220, 150, 120, 'couple', { frame: '#9C6A48', bg: '#A9CFE0' });
    kitchenDoorway(g, 1690, 190, 200, P);
    // the pendant lamp over the table
    line(g, 960, -10, 960, 70, 3);
    shape(g, () => polyP(g, [930, 70, 990, 70, 1030, 118, 890, 118]), '#F4BF54', LW.small, '#E0A43E', () => polyP(g, [972, 70, 990, 70, 1030, 118, 990, 118]));
    wallBand(g, P.wall, P.wallSh, [0, 0, W, FY], [-20, 140, 600, 40, 1300, 40, W + 20, 140]);
    if (tod === 'day') { softFill(g, 16, 'rgba(255,246,220,0.35)', () => polyP(g, [790, FY + 4, 1130, FY + 4, 1300, H, 640, H]), 'screen'); }
    line(g, 0, FY, W, FY, LW.arch);
    glassCabinet(g, 60, 340, 320, 548, P);
    for (const cx of [640, 960, 1280]) chair(g, cx, 880, 0.92, 'back', 1, P.wood, P.woodSh);
    chair(g, 368, 905, 0.95, 'side', 1, P.wood, P.woodSh, '#E9A73F');
    chair(g, 1552, 905, 0.95, 'side', -1, P.wood, P.woodSh, '#E9A73F');
    diningTable(g, P, o);
    homeDiningLight(g, o, tod);
  }
  function homeDiningLight(g, o, tod) {
    if (tod === 'day') return;
    const T = HOME_TOD[tod];
    if (tod === 'night') grade(g, 960, 130, 60, 1500, NIGHT); else grade(g, 960, 130, 80, 1500, EVE);
    homeWindowGlass(g, 795, 160, 330, 290, 20, 18, T.sky, tod === 'night' ? '#3B3437' : '#5A504C');
    polyP(g, [890, 118, 1030, 118, 1020, 126, 900, 126]); paint(g, '#FFF4D0', LW.detail);
    softFill(g, 40, 'rgba(255,230,170,0.4)', () => polyP(g, [890, 120, 1030, 120, 1460, 620, 460, 620]), 'screen');
  }
  function homeDiningAnchors() {
    return {
      seat1: { x: 640, y: 691, s: 0.92 }, seat2: { x: 960, y: 691, s: 0.92 }, seat3: { x: 1280, y: 691, s: 0.92 },
      seatL: { x: 368, y: 710, s: 0.95, facing: 1 }, seatR: { x: 1552, y: 710, s: 0.95, facing: -1 },
      table: { x: 960, y: 590, s: 1 }, standL: { x: 220, y: 985, s: 1.02 }, standR: { x: 1720, y: 985, s: 1.02 }, doorway: { x: 1790, y: 905, s: 0.9 },
      clock: { x: 1430, y: 190, s: 1, r: 58 }, window: { x: 960, y: 305, s: 1 }, calendar: { x: 1515, y: 425, s: 1 },
      left: { x: 330, y: 990, s: 1.02 }, center: { x: 960, y: 990, s: 1.02 }, right: { x: 1560, y: 990, s: 1.02 },
    };
  }
  function homeKey(o, tod) { const v = o.view === 'dining' ? 'dining' : 'lounge'; return 'home|' + v + '|' + tod + '|' + (o.tv ? 1 : 0) + (o.lamp == null ? 'a' : o.lamp ? 1 : 0) + (o.doorOpen ? 1 : 0) + (o.table === false ? 0 : 1) + (o.food === false ? 0 : 1); }
  SETS.home = function (g, o) {
    o = o || {};
    const tod = HOME_TOD[o.tod] ? o.tod : 'day', dining = o.view === 'dining', xf = camXf(o.cam);
    let F = null;
    const draw = (t) => (lg) => { if (dining) homeDining(lg, o, t); else F = homeLounge(lg, o, t); };
    blit(g, xf, layer(homeKey(o, tod), devRes(g, xf), draw(tod)));
    if (o.todTo && HOME_TOD[o.todTo] && o.todK > 0) blit(g, xf, layer(homeKey(o, o.todTo), devRes(g, xf), draw(o.todTo)), Math.min(1, o.todK));
    const t = o.t || 0, todNow = o.todTo && o.todK >= 0.5 ? o.todTo : tod;
    live(g, xf, (g2) => {
      if (dining) { clockHands(g2, 1430, 190, 58, o.clock != null ? o.clock : 19); return; }
      clockHands(g2, 935, 116, 52, o.clock != null ? o.clock : (todNow === 'night' ? 0.1 : 17.2));
      const fanP = todNow === 'night' ? Object.assign({}, HM, { blade: '#6C7FA8', bladeSh: '#5A6B92', fanBody: '#B9B4C8' }) : todNow === 'evening' ? Object.assign({}, HM, { blade: '#7A9FD0', bladeSh: '#6688BC', fanBody: '#EAD9D0' }) : HM;
      fanFace(g2, { x: 532, y: 902 - 500 * 0.92 - 8 * 0.92, r: 92 * 0.92 }, o.fan === false ? 0.4 : t * TAU * 1.6, fanP);
      if (o.tv) { const r = rng(1 + Math.floor(t * 2.5)); r(); tvGlass(g2, 1318, 530, 244, 136, true, 0.5 + 0.5 * Math.sin(t * 9) * r()); }
    });
    const T = HOME_TOD[todNow];
    return result(xf, dining ? homeDiningAnchors() : homeLoungeAnchors(o), 990, HM.FY, { tint: o.tv && todNow === 'night' ? '#A3ABCF' : T.tint });
  };
  SETS.homeFront = function (g, o) {
    o = o || {};
    const tod = HOME_TOD[o.tod] ? o.tod : 'day', dining = o.view === 'dining', xf = camXf(o.cam);
    const doorPart = !dining && !!o.doorOpen, tablePart = dining || o.table !== false;
    const piece = (t) => (lg) => {
      if (tablePart) {
        if (dining) diningTable(lg, HM, o, true); else centreTable(lg, HM, true);
        if (t !== 'day') maskedPass(lg, (g2) => dining ? homeDiningLight(g2, o, t) : homeLoungeLight(g2, o, t));
      }
      // the open front door: the side wall around the opening and its frame, so a figure in the doorway stands inside it
      if (doorPart) clipDo(lg, () => { const i = hmDoorQuads().inner; polyP(lg, [HM.CX, 0, W, 0, W, hmSideFloor(W) + 2, HM.CX, hmSideFloor(HM.CX) + 2]); lg.moveTo(i[0], i[1]); lg.lineTo(i[6], i[7] + 60); lg.lineTo(i[4], i[5] + 60); lg.lineTo(i[2], i[3]); lg.closePath(); }, () => homeLounge(lg, Object.assign({}, o, { table: false }), t), true);
    };
    if (tablePart || doorPart) {
      const bb = dining ? { x: 450, y: 470, w: 1020, h: 470 } : doorPart ? { x: 740, y: 0, w: 1180, h: 990 } : { x: 740, y: 820, w: 390, h: 170 };
      const key = (t) => 'homeFront|' + homeKey(o, t) + (doorPart ? 'd' : '');
      blit(g, xf, layer(key(tod), devRes(g, xf), piece(tod)), null, bb);
      if (o.todTo && HOME_TOD[o.todTo] && o.todK > 0) blit(g, xf, layer(key(o.todTo), devRes(g, xf), piece(o.todTo)), Math.min(1, o.todK), bb);
    }
    return result(xf, dining ? homeDiningAnchors() : homeLoungeAnchors(o), 990, HM.FY);
  };

  // ================================================================ KITCHEN (a homely Nigerian kitchen corner; mumKitchen above is the fitted one)
  // SETS.kitchen(g, o): o.sky ('day' default | morning | sunset | evening | night), o.steam (false: no steam), o.t.
  // Anchors: cook (standing at the cooker), pot (the pot on the burner), counter, sink (standing at the sink), freezer (its lid),
  // mortar, window, left, center, right. SETS.kitchenFront draws nothing (it returns the anchors).
  const KT = { FY: 840, wall: '#F7DCA4', wallSh: '#EAC287', tile: '#FFF7E6', tileLine: '#E6D2AE', floor: '#D9915F', floorAlt: '#D0885A', floorLine: '#B8774A', floorSh: '#A86A43',
    top: '#E8DCC8', topSh: '#D3C4AA', cab: '#B0703F', cabSh: '#965E35', freezer: '#F4F1EA', freezerSh: '#DCD6CA', shelf: '#9C6A48', shelfSh: '#86593C', steel: '#C9CED3', steelSh: '#A9B0B8' };
  function enamelPot(g, cx, by, w, h, col, lid) {
    const sh = dark(col, 0.85);
    for (const sx of [-1, 1]) shape(g, () => rrP(g, cx + sx * (w / 2 + 2) - (sx < 0 ? 22 : 0), by - h * 0.78, 22, 12, 6), col, LW.detail);
    shape(g, () => { g.beginPath(); g.moveTo(cx - w / 2, by - h); g.lineTo(cx + w / 2, by - h); g.lineTo(cx + w * 0.46, by - 8); g.quadraticCurveTo(cx + w * 0.45, by, cx + w * 0.38, by); g.lineTo(cx - w * 0.38, by); g.quadraticCurveTo(cx - w * 0.45, by, cx - w * 0.46, by - 8); g.closePath(); }, col, LW.small, sh, () => rectP(g, cx + w * 0.16, by - h - 4, w * 0.4, h + 8));
    shape(g, () => rrP(g, cx - w / 2 - 4, by - h - 6, w + 8, 12, 6), '#FFFFFF', LW.detail);
    if (lid) { shape(g, () => { g.beginPath(); g.ellipse(cx, by - h - 6, w * 0.47, h * 0.24, 0, Math.PI, TAU); g.closePath(); }, col, LW.small, sh, () => rectP(g, cx + w * 0.1, by - h - 40, w * 0.4, 40)); shape(g, () => rrP(g, cx - 14, by - h - h * 0.24 - 18, 28, 14, 6), '#FFFFFF', LW.detail); }
  }
  function steamWisps(g, x, y, s, k) {
    g.save(); g.lineWidth = 6 * s; g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const ph = (k + i / 3) % 1, yy = y - ph * 90 * s, a = Math.sin(ph * Math.PI); g.globalAlpha = a * 0.9; g.beginPath(); const xx = x + (i - 1) * 24 * s; g.moveTo(xx, yy); g.bezierCurveTo(xx - 14 * s, yy - 18 * s, xx + 14 * s, yy - 30 * s, xx, yy - 48 * s); g.stroke(); }
    g.restore();
  }
  function kitchenCornerStatic(g, o) {
    const P = KT, FY = P.FY;
    tileFloor(g, FY, { col: P.floor, alt: P.floorAlt, line: P.floorLine, vpx: 980, vpy: 300, step: 190, h0: 34 });
    rectP(g, 0, 0, W, FY); paint(g, P.wall, 0);
    // splashback tiles behind the counter
    rectP(g, 470, 420, 1330, 172); paint(g, P.tile, 0);
    g.strokeStyle = P.tileLine; g.lineWidth = 2.5; g.beginPath();
    for (let y = 420; y <= 592; y += 43) { g.moveTo(470, y); g.lineTo(1800, y); } for (let x = 470; x <= 1800; x += 58) { g.moveTo(x, 420); g.lineTo(x, 592); } g.stroke();
    rectP(g, 470, 420, 1330, 172); paint(g, null, LW.detail);
    // louvre window with bars over the sink, a little valance
    louvreWindow(g, 1340, 120, 360, 290, { sky: o.sky || 'day', seed: 71, frame: '#F3E2C4', bars: true });
    shape(g, () => { g.beginPath(); g.moveTo(1324, 104); g.lineTo(1716, 104); g.lineTo(1716, 150); for (let i = 6; i >= 0; i--) g.arc(1324 + (i + 0.5) * 56, 150, 28, 0, Math.PI, false); g.closePath(); }, '#E5534B', LW.small, '#C9443D', () => rectP(g, 1324, 104, 392, 16));
    g.fillStyle = '#FFF4E3'; for (let i = 0; i < 7; i++) for (let j = 0; j < 2; j++) { rectP(g, 1334 + i * 56 + j * 28, 122 + j * 14, 14, 14); g.fill(); }
    // shelves with enamel bowls, cups on hooks, jars, a stack of plates, a radio
    for (const sy of [214, 336]) { shape(g, () => rectP(g, 510, sy, 680, 20), P.shelf, LW.small, P.shelfSh, () => rectP(g, 510, sy + 12, 680, 8)); for (const bx of [540, 1160]) shape(g, () => polyP(g, [bx - 8, sy + 20, bx + 8, sy + 20, bx + 8, sy + 60, bx - 8, sy + 44]), P.shelf, LW.detail); }
    [['#E5534B', 120], ['#3A8594', 100], ['#F4BF54', 80]].forEach(([c, w], i) => { const by = 214 - i * 26; shape(g, () => { g.beginPath(); g.moveTo(600 - w / 2, by - 26); g.lineTo(600 + w / 2, by - 26); g.quadraticCurveTo(600 + w * 0.42, by, 600, by); g.quadraticCurveTo(600 - w * 0.42, by, 600 - w / 2, by - 26); g.closePath(); }, c, LW.detail, dark(c, 0.86), () => rectP(g, 610, by - 30, w, 34)); line(g, 600 - w / 2, by - 26, 600 + w / 2, by - 26, 4, '#FFFFFF'); });
    for (let i = 0; i < 4; i++) shape(g, () => rrP(g, 720 + i * 46, 166, 34, 48, 6), ['#FBF6EF', '#F4BF54', '#E5534B', '#FBF6EF'][i], LW.detail, null, null);
    for (let i = 0; i < 4; i++) shape(g, () => rrP(g, 718 + i * 46, 160, 38, 12, 4), '#9C6A48', LW.detail);
    shape(g, () => rrP(g, 940, 132, 150, 82, 14), '#3A8594', LW.small, '#2F7280', () => rectP(g, 1040, 128, 60, 90));
    ellP(g, 978, 173, 24, 24); paint(g, '#2E3038', LW.detail); for (let i = 0; i < 3; i++) line(g, 1018, 158 + i * 14, 1070, 158 + i * 14, 3, '#BFE3E0');
    line(g, 1060, 132, 1086, 96, 3); ellP(g, 1087, 94, 4, 4); paint(g, INK, 0);
    for (let i = 0; i < 5; i++) shape(g, () => { g.beginPath(); g.ellipse(640, 336 - i * 9, 66, 10, 0, 0, TAU); }, '#FFFFFF', LW.detail);
    for (let i = 0; i < 5; i++) { const jx = 770 + i * 70; shape(g, () => rrP(g, jx, 270, 46, 66, 8), 'rgba(236,246,248,0.95)', LW.detail); rectP(g, jx + 4, 296, 38, 36); paint(g, ['#E5534B', '#F4BF54', '#9C6A48', '#77CC81', '#E98A3C'][i], 0); shape(g, () => rrP(g, jx - 2, 262, 50, 12, 4), '#E5534B', LW.detail); }
    for (const [hx, c] of [[1070, '#FFFFFF'], [1120, '#7BAFE1']]) { line(g, hx, 356, hx, 372, 3); shape(g, () => rrP(g, hx - 18, 372, 36, 40, 6), c, LW.detail); g.beginPath(); g.arc(hx + 20, 390, 10, -1.3, 1.3); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); }
    wallBand(g, P.wall, P.wallSh, [0, 0, W, FY], [-20, 110, 600, 30, 1300, 30, W + 20, 120]);
    clipDo(g, () => rectP(g, 0, 0, W, FY), () => softFill(g, 12, 'rgba(255,248,226,0.35)', () => polyP(g, [1350, 420, 1690, 420, 1500, FY, 1060, FY]), 'screen'));
    line(g, 0, FY, W, FY, LW.arch);
    // chest freezer with things on top
    floorShadow(g, 250, 908, 220, 14, P.floorSh, 5);
    shape(g, () => rrP(g, 60, 626, 380, 274, 14), P.freezer, LW.big, P.freezerSh, () => rectP(g, 380, 620, 70, 290));
    line(g, 64, 662, 436, 662, LW.small);
    shape(g, () => rrP(g, 190, 670, 120, 16, 8), '#C9CED3', LW.detail);
    shape(g, () => rrP(g, 52, 600, 396, 30, 10), P.freezer, LW.big, P.freezerSh, () => rectP(g, 52, 618, 396, 12));
    ellP(g, 408, 640, 6, 6); paint(g, '#77CC81', 1.5);
    shape(g, () => { g.beginPath(); g.moveTo(100, 600); g.lineTo(250, 600); g.lineTo(236, 548); g.lineTo(114, 548); g.closePath(); }, '#C98A55', LW.small, '#A8703F', () => rectP(g, 200, 540, 60, 70));
    g.strokeStyle = INK; g.lineWidth = 2; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(108 + i * 34, 552); g.lineTo(104 + i * 36, 598); g.stroke(); }
    for (const [tx, ty, tc] of [[138, 540, '#E5534B'], [172, 532, '#E5534B'], [206, 542, '#E98A3C'], [156, 516, '#77CC81']]) { ellP(g, tx, ty, 20, 18); paint(g, tc, LW.detail); }
    shape(g, () => rrP(g, 300, 470, 80, 130, 18), '#E5534B', LW.small, '#C9443D', () => rectP(g, 350, 460, 40, 150));
    shape(g, () => rrP(g, 306, 458, 68, 22, 8), '#FFFFFF', LW.detail);
    // counter: cabinets, an open bay with the gas cylinder, the worktop
    shape(g, () => rectP(g, 470, 618, 1330, 214), P.cab, LW.big, P.cabSh, () => rectP(g, 470, 618, 1330, 20));
    shape(g, () => rectP(g, 500, 650, 230, 170), '#6E4A3A', LW.small);
    for (let x = 760; x < 1800; x += 208) { shape(g, () => rectP(g, x, 650, 190, 170), P.cab, LW.small, P.cabSh, () => rectP(g, x, 650, 190, 12)); ellP(g, x + (x % 416 < 208 ? 170 : 20), 700, 6, 6); paint(g, '#E9B04A', LW.detail); }
    shape(g, () => rectP(g, 470, 828, 1330, 14), '#6E4A3A', LW.detail);
    // gas cylinder in the bay, hose up to the cooker
    shape(g, () => rrP(g, 548, 690, 128, 132, 34), '#3A8594', LW.small, '#2F7280', () => rectP(g, 630, 680, 60, 150));
    shape(g, () => rrP(g, 590, 668, 44, 26, 6), '#C9CED3', LW.detail);
    rectP(g, 552, 740, 120, 18); paint(g, '#F4BF54', LW.detail);
    g.beginPath(); g.moveTo(612, 668); g.bezierCurveTo(600, 630, 690, 640, 700, 600); g.lineWidth = 7 + LW.detail * 2; g.strokeStyle = INK; g.stroke(); g.lineWidth = 7; g.strokeStyle = '#E98A3C'; g.stroke();
    shape(g, () => rrP(g, 456, 586, 1358, 36, 6), P.top, LW.big, P.topSh, () => rectP(g, 456, 606, 1358, 16));
    // sink under the window, with a tap
    shape(g, () => polyP(g, [1390, 592, 1650, 592, 1640, 604, 1400, 604]), '#9AA3AA', LW.detail);
    g.beginPath(); g.moveTo(1520, 590); g.lineTo(1520, 530); g.quadraticCurveTo(1520, 504, 1546, 504); g.quadraticCurveTo(1570, 504, 1572, 528); g.lineWidth = 9 + LW.small * 2; g.strokeStyle = INK; g.stroke(); g.lineWidth = 9; g.strokeStyle = P.steel; g.stroke();
    shape(g, () => rrP(g, 1496, 556, 20, 12, 4), P.steel, LW.detail); shape(g, () => rrP(g, 1524, 556, 20, 12, 4), P.steel, LW.detail);
    // the cooker: a tabletop two-burner on the worktop, a pot of soup steaming, a frying pan
    shape(g, () => rrP(g, 520, 540, 340, 50, 8), P.steel, LW.big, P.steelSh, () => rectP(g, 520, 568, 340, 22));
    for (const kx of [560, 600, 780, 820]) { ellP(g, kx, 576, 9, 9); paint(g, '#2E3038', LW.detail); }
    for (const bx of [620, 770]) { g.beginPath(); g.ellipse(bx, 540, 56, 8, 0, 0, TAU); paint(g, '#2E3038', LW.detail); }
    enamelPot(g, 624, 536, 160, 112, '#E5534B', true);
    shape(g, () => { g.beginPath(); g.ellipse(776, 528, 64, 12, 0, 0, TAU); }, '#3A3C42', LW.small);
    shape(g, () => rrP(g, 834, 520, 90, 12, 6), '#3A3C42', LW.small);
    // chopping board with plantain and a knife, a bowl of tomatoes and peppers, a kettle
    shape(g, () => rrP(g, 930, 568, 230, 22, 8), '#D9A86A', LW.small, '#C08E52', () => rectP(g, 930, 580, 230, 10));
    for (const [px, py, a] of [[990, 556, -0.08], [1080, 552, 0.06]]) { g.save(); g.translate(px, py); g.rotate(a); g.beginPath(); g.moveTo(-58, 6); g.quadraticCurveTo(0, -22, 58, 2); g.quadraticCurveTo(0, -4, -58, 14); g.closePath(); paint(g, '#F4BF54', LW.detail); g.restore(); }
    shape(g, () => polyP(g, [1120, 560, 1190, 548, 1194, 556, 1124, 568]), '#D8DDE2', LW.detail);
    shape(g, () => { g.beginPath(); g.moveTo(1190, 568); g.lineTo(1330, 568); g.quadraticCurveTo(1320, 590, 1290, 590); g.lineTo(1230, 590); g.quadraticCurveTo(1200, 590, 1190, 568); g.closePath(); }, '#7BAFE1', LW.small, '#6497C9', () => rectP(g, 1270, 560, 70, 34));
    for (const [tx, ty, tc] of [[1222, 552, '#E5534B'], [1256, 546, '#E5534B'], [1292, 552, '#E98A3C'], [1240, 528, '#C9443D'], [1276, 530, '#77CC81']]) { ellP(g, tx, ty, 18, 16); paint(g, tc, LW.detail); }
    // mortar and pestle on the floor, a water drum at the right
    floorShadow(g, 1236, 932, 70, 10, P.floorSh, 4);
    shape(g, () => { g.beginPath(); g.moveTo(1180, 790); g.lineTo(1292, 790); g.quadraticCurveTo(1262, 860, 1276, 930); g.lineTo(1196, 930); g.quadraticCurveTo(1210, 860, 1180, 790); g.closePath(); }, '#B0703F', LW.small, '#965E35', () => rectP(g, 1240, 780, 60, 160));
    shape(g, () => { g.beginPath(); g.ellipse(1236, 790, 56, 10, 0, 0, TAU); }, '#7A4B32', LW.detail);
    g.save(); g.translate(1262, 776); g.rotate(0.32); shape(g, () => rrP(g, -9, -220, 18, 240, 9), '#C98A55', LW.small, '#A8703F', () => rectP(g, 1, -230, 10, 260)); g.restore();
    floorShadow(g, 1860, 936, 90, 12, P.floorSh, 4);
    shape(g, () => rrP(g, 1790, 700, 150, 232, 22), '#3E7FB8', LW.big, '#336CA0', () => rectP(g, 1890, 690, 60, 250));
    for (const ry of [760, 860]) line(g, 1792, ry, 1938, ry, LW.small);
    shape(g, () => rrP(g, 1782, 684, 166, 26, 10), '#3E7FB8', LW.small, '#336CA0', () => rectP(g, 1782, 700, 166, 10));
    // the steam is drawn live
  }
  function kitchenCornerAnchors() {
    return { cook: { x: 700, y: 975, s: 1 }, pot: { x: 624, y: 410, s: 1 }, counter: { x: 1040, y: 588, s: 1 }, sink: { x: 1520, y: 975, s: 1 }, freezer: { x: 250, y: 600, s: 1 },
      mortar: { x: 1236, y: 930, s: 1 }, window: { x: 1520, y: 265, s: 1 }, left: { x: 300, y: 985, s: 1.02 }, center: { x: 960, y: 985, s: 1.02 }, right: { x: 1560, y: 985, s: 1.02 } };
  }
  SETS.kitchen = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('kitchenCorner|' + (o.sky || 'day'), devRes(g, xf), (lg) => kitchenCornerStatic(lg, o)));
    if (o.steam !== false) live(g, xf, (g2) => steamWisps(g2, 624, 380, 1, ((o.t || 0) * 0.45) % 1));
    return result(xf, kitchenCornerAnchors(), 985, KT.FY);
  };
  SETS.kitchenFront = function (g, o) { o = o || {}; return result(camXf(o.cam), kitchenCornerAnchors(), 985, KT.FY); };

  // ================================================================ SHOP (the corner kiosk for the salt errand)
  // SETS.shop(g, o): o.sky ('day' default | morning | sunset). Anchors: customer (standing at the counter), seller (seated behind the
  // counter: the seat point; give the figure sellerFloor.y as its floor so the feet stay behind the panel), sellerFloor, counter (counter top centre), coins (the coin tray), left, center, right.
  // SETS.shopFront: the counter ledge, its jars and bread, and the front panel (draw it after the seller).
  const SP = { sky: '#FCE9A7', wall: '#EDB872', wallSh: '#DDA05C', ground: '#EBCB92', groundSh: '#D9B47A', kiosk: '#3A8594', kioskSh: '#2F7280', trim: '#F4BF54', trimSh: '#DCA640',
    inside: '#7A4E36', insideSh: '#68402C', shelf: '#C98A55', shelfSh: '#A8703F', zinc: '#B9C3CC', zincSh: '#9AA6B2' };
  function goods(g, x0, x1, y, h, seed) {
    const r = rng(seed), cols = ['#E5534B', '#F4BF54', '#7BAFE1', '#77CC81', '#E98A3C', '#FBF6EF', '#3A8594', '#B07BD0'];
    let x = x0 + 6;
    while (x < x1 - 30) {
      const k = r(), c = cols[Math.floor(r() * cols.length)];
      if (k < 0.4) { // a box with a blank label
        const w = 46 + r() * 26, bh = h * (0.7 + r() * 0.28); if (x + w > x1 - 4) break;
        shape(g, () => rectP(g, x, y - bh, w, bh), c, LW.detail, dark(c, 0.85), () => rectP(g, x + w * 0.72, y - bh, w * 0.28, bh));
        rrP(g, x + 7, y - bh * 0.66, w * 0.56, bh * 0.3, 4); paint(g, '#FFFFFF', 1.4); x += w + 6;
      } else if (k < 0.72) { // tins
        for (let i = 0; i < 2 && x < x1 - 40; i++) { const w = 34, bh = h * 0.52; shape(g, () => rrP(g, x, y - bh, w, bh, 4), '#D8DDE2', LW.detail, '#B9C0C8', () => rectP(g, x + 24, y - bh, 10, bh)); rectP(g, x, y - bh * 0.7, w, bh * 0.4); paint(g, c, 1.4); x += w + 4; } x += 6;
      } else { // bottles
        for (let i = 0; i < 2 && x < x1 - 30; i++) { const w = 24, bh = h * 0.82; shape(g, () => { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - bh * 0.6); g.quadraticCurveTo(x + 2, y - bh * 0.72, x + 8, y - bh * 0.78); g.lineTo(x + 8, y - bh); g.lineTo(x + 16, y - bh); g.lineTo(x + 16, y - bh * 0.78); g.quadraticCurveTo(x + 22, y - bh * 0.72, x + w, y - bh * 0.6); g.lineTo(x + w, y); g.closePath(); }, c === '#FBF6EF' ? '#9C5A3C' : c, LW.detail); rectP(g, x + 2, y - bh * 0.45, w - 4, bh * 0.18); paint(g, '#FFFFFF', 1.2); x += w + 5; } x += 6;
      }
    }
  }
  function sachetStrip(g, x, y, n, c1, c2) {
    line(g, x, y - 14, x, y + 2, 2);
    for (let i = 0; i < n; i++) { const c = i % 2 ? c2 : c1, yy = y + i * 31; shape(g, () => rectP(g, x - 14, yy, 28, 29), c, 1.6, dark(c, 0.86), () => rectP(g, x - 14, yy + 20, 28, 9)); rectP(g, x - 7, yy + 7, 14, 8); paint(g, '#FFFFFF', 0); }
  }
  function shopCounter(g) {
    const P = SP;
    shape(g, () => rectP(g, 540, 664, 880, 236), P.kiosk, LW.big, P.kioskSh, () => rectP(g, 540, 664, 880, 24));
    for (const px of [580, 1000]) shape(g, () => rectP(g, px, 708, 380, 160), mix(P.kiosk, '#FFFFFF', 0.12), LW.small, P.kioskSh, () => rectP(g, px, 708, 380, 14));
    for (const px of [580, 1000]) { rectP(g, px + 20, 730, 340, 10); paint(g, P.trim, LW.detail); }
    shape(g, () => rrP(g, 520, 636, 920, 32, 6), P.shelf, LW.big, P.shelfSh, () => rectP(g, 520, 654, 920, 14));
    // sweet jars, the coin tray, bread in its bag
    for (const [jx, c] of [[600, '#E5534B'], [690, '#F4BF54'], [780, '#77CC81']]) {
      shape(g, () => rrP(g, jx - 34, 552, 68, 86, 14), 'rgba(236,246,248,0.9)', LW.small);
      const r = rng(jx); for (let i = 0; i < 9; i++) { ellP(g, jx - 20 + r() * 40, 600 + r() * 30, 9, 9); paint(g, i % 3 ? c : '#FFFFFF', 1.2); }
      shape(g, () => rrP(g, jx - 30, 540, 60, 16, 5), '#E5534B', LW.detail);
      polyP(g, [jx + 8, 560, jx + 18, 560, jx + 10, 630, jx, 630]); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill();
    }
    shape(g, () => { g.beginPath(); g.ellipse(900, 632, 54, 10, 0, 0, TAU); }, '#C9CED3', LW.small);
    for (const [bx, by] of [[1220, 636], [1300, 636]]) shape(g, () => rrP(g, bx - 46, by - 64, 92, 64, 24), '#E6A15C', LW.small, '#CE8A47', () => rectP(g, bx - 46, by - 22, 92, 22));
    for (const [bx, by] of [[1220, 636], [1300, 636]]) { rrP(g, bx - 50, by - 68, 100, 70, 26); g.fillStyle = 'rgba(255,255,255,0.28)'; g.fill(); line(g, bx - 30, by - 50, bx + 30, by - 50, 3, 'rgba(255,255,255,0.7)'); }
  }
  function shopStatic(g, o) {
    const P = SP, GY = 760;
    rectP(g, 0, 0, W, GY); paint(g, o.sky === 'sunset' ? '#FDD3A6' : P.sky, 0);
    // a cloud, a compound wall and a house behind, an electric pole and wires
    for (const [cx, cy, s] of [[1500, 90, 1.2], [300, 70, 0.9]]) { g.beginPath(); g.moveTo(cx - 70 * s, cy); g.arc(cx - 40 * s, cy - 8 * s, 26 * s, Math.PI, TAU * 0.9); g.arc(cx + 4 * s, cy - 22 * s, 34 * s, Math.PI * 1.05, TAU * 0.98); g.arc(cx + 46 * s, cy - 6 * s, 22 * s, Math.PI * 1.25, TAU); g.lineTo(cx + 70 * s, cy); g.closePath(); g.fillStyle = '#FFF6DE'; g.fill(); }
    shape(g, () => polyP(g, [1540, 330, 1720, 230, 1960, 330, 1960, 760, 1540, 760]), '#F2C38A', LW.small, '#E1AE74', () => rectP(g, 1540, 330, 70, 440));
    shape(g, () => polyP(g, [1520, 336, 1720, 222, 1960, 336, 1960, 350, 1720, 238, 1520, 350]), '#B5714A', LW.small);
    louvreWindow(g, 1700, 420, 170, 190, { sky: 'day', seed: 3, frame: '#FFF4E3', bars: true, sill: false });
    shape(g, () => rectP(g, -10, 470, W + 20, 290), P.wall, LW.small, P.wallSh, () => rectP(g, -10, 470, W + 20, 30));
    for (let x = -10; x < W; x += 160) line(g, x, 500, x, 760, LW.detail, rgba(INK, 0.35));
    shape(g, () => rectP(g, -10, 456, W + 20, 22), '#F6D3A2', LW.small);
    shape(g, () => rectP(g, 1846, -20, 28, 800), '#C9C2B5', LW.small, '#B0A99C', () => rectP(g, 1862, -20, 12, 800));
    shape(g, () => rectP(g, 1800, 60, 120, 14), '#9C9488', LW.small);
    g.strokeStyle = INK; g.lineWidth = 2.4; for (const [y0, sag] of [[66, 60], [74, 90]]) { g.beginPath(); g.moveTo(1800, y0); g.quadraticCurveTo(900, y0 + sag * 2, -20, y0 + 20); g.stroke(); }
    // a tree at the left
    shape(g, () => { g.beginPath(); g.moveTo(150, 770); g.lineTo(162, 520); g.lineTo(120, 430); g.lineTo(140, 422); g.lineTo(176, 488); g.lineTo(196, 400); g.lineTo(214, 404); g.lineTo(196, 540); g.lineTo(202, 770); g.closePath(); }, C.stTrunk, LW.small, dark(C.stTrunk, 0.85), () => rectP(g, 186, 390, 30, 390));
    const pts = [[170, 170, 90], [80, 250, 80], [270, 240, 86], [60, 360, 74], [300, 350, 76], [180, 300, 120], [170, 410, 70]];
    const blob = () => { g.beginPath(); for (const [x, y, r] of pts) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } };
    g.lineWidth = LW.small * 2; g.strokeStyle = INK; blob(); g.stroke(); blob(); g.fillStyle = C.stTree; g.fill();
    g.save(); blob(); g.clip(); g.beginPath(); g.ellipse(290, 410, 170, 130, -0.5, 0, TAU); g.fillStyle = C.stTreeSh; g.fill(); g.restore();
    // ground: a sandy street with a few pebbles and a long soft light band
    rectP(g, 0, GY, W, H - GY); paint(g, P.ground, 0);
    line(g, 0, GY, W, GY, LW.small);
    softFill(g, 20, 'rgba(255,248,214,0.35)', () => polyP(g, [0, 900, 1920, 820, 1920, 900, 0, 1000]));
    const r = rng(83); g.fillStyle = P.groundSh; for (let i = 0; i < 40; i++) { ellP(g, r() * W, GY + 30 + r() * 300, 4 + r() * 6, 2 + r() * 3); g.fill(); }
    // the kiosk: zinc roof, awning, the open front with stocked shelves, sachet strips
    floorShadow(g, 980, 906, 560, 22, P.groundSh, 8);
    shape(g, () => rectP(g, 520, 240, 920, 664), P.kiosk, LW.big, P.kioskSh, () => rectP(g, 1380, 240, 60, 664));
    shape(g, () => rectP(g, 560, 300, 840, 340), P.inside, LW.small, P.insideSh, () => rectP(g, 560, 300, 840, 40));
    for (const [sy, h] of [[400, 80], [500, 80], [600, 80]]) { goods(g, 566, 1394, sy, h, sy); shape(g, () => rectP(g, 560, sy, 840, 14), P.shelf, LW.small, P.shelfSh, () => rectP(g, 560, sy + 8, 840, 6)); }
    for (const [sx, n, a, b] of [[596, 4, '#F4BF54', '#E5534B'], [636, 3, '#7BAFE1', '#FBF6EF'], [1324, 3, '#77CC81', '#F4BF54'], [1364, 4, '#E5534B', '#FBF6EF']]) sachetStrip(g, sx, 324, n, a, b);
    shape(g, () => polyP(g, [470, 244, 1490, 244, 1470, 196, 490, 196]), P.zinc, LW.big, P.zincSh, () => polyP(g, [470, 230, 1490, 230, 1490, 244, 470, 244]));
    g.strokeStyle = P.zincSh; g.lineWidth = 3; g.beginPath(); for (let x = 520; x < 1460; x += 34) { g.moveTo(x, 198); g.lineTo(x - 6, 242); } g.stroke();
    shape(g, () => { g.beginPath(); g.moveTo(500, 244); g.lineTo(1460, 244); g.lineTo(1476, 300); for (let i = 15; i >= 0; i--) g.arc(484 + (i + 0.5) * 62, 300, 31, 0, Math.PI, false); g.closePath(); }, '#FFF4E3', LW.small);
    clipDo(g, () => { g.beginPath(); g.moveTo(500, 244); g.lineTo(1460, 244); g.lineTo(1476, 300); for (let i = 15; i >= 0; i--) g.arc(484 + (i + 0.5) * 62, 300, 31, 0, Math.PI, false); g.closePath(); }, () => {
      g.fillStyle = '#E5534B'; for (let i = 0; i < 16; i += 2) { polyP(g, [500 + i * 60, 244, 560 + i * 60, 244, 578 + i * 62, 340, 484 + i * 62, 340]); g.fill(); }
      rectP(g, 480, 244, 1010, 14); g.fillStyle = 'rgba(120,40,30,0.25)'; g.fill();
    });
    g.beginPath(); g.moveTo(500, 244); g.lineTo(1460, 244); g.lineTo(1476, 300); for (let i = 15; i >= 0; i--) g.arc(484 + (i + 0.5) * 62, 300, 31, 0, Math.PI, false); g.closePath(); paint(g, null, LW.small);
    // crates of bottles at the right, a wooden bench at the left
    for (const [cx, cy] of [[1560, 904], [1560, 820]]) {
      shape(g, () => rectP(g, cx - 90, cy - 84, 180, 84), '#F4BF54', LW.small, '#DCA640', () => rectP(g, cx + 50, cy - 84, 40, 84));
      for (let i = 0; i < 4; i++) { rectP(g, cx - 76 + i * 40, cy - 64, 30, 18); paint(g, '#DCA640', LW.detail); }
      if (cy === 820) for (let i = 0; i < 5; i++) { ellP(g, cx - 72 + i * 36, cy - 92, 13, 7); paint(g, ['#E5534B', '#77CC81', '#E5534B', '#7BAFE1', '#E5534B'][i], 1.6); }
    }
    floorShadow(g, 360, 908, 150, 10, P.groundSh, 4);
    for (const lx of [260, 460]) shape(g, () => rectP(g, lx - 8, 820, 16, 86), '#9C6A48', LW.small);
    shape(g, () => rrP(g, 230, 806, 260, 22, 6), '#B0703F', LW.small, '#965E35', () => rectP(g, 230, 818, 260, 10));
    shopCounter(g);
  }
  function shopAnchors() {
    return { customer: { x: 800, y: 985, s: 1 }, seller: { x: 1110, y: 800, s: 0.92 }, sellerFloor: { x: 1110, y: 890, s: 0.92 }, counter: { x: 980, y: 636, s: 1 }, coins: { x: 900, y: 630, s: 1 },
      bench: { x: 360, y: 806, s: 0.95 }, left: { x: 340, y: 985, s: 1.02 }, center: { x: 960, y: 985, s: 1.02 }, right: { x: 1600, y: 985, s: 1.02 } };
  }
  SETS.shop = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('shop|' + (o.sky || 'day'), devRes(g, xf), (lg) => shopStatic(lg, o)));
    return result(xf, shopAnchors(), 985, 760);
  };
  SETS.shopFront = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('shopFront', devRes(g, xf), (lg) => shopCounter(lg)), null, { x: 510, y: 530, w: 940, h: 380 });
    return result(xf, shopAnchors(), 985, 760);
  };

  // ================================================================ SCHOOL (a classroom, or the results noticeboard)
  // SETS.school(g, o): o.view 'class' (default: the blackboard with chalk marks and no legible writing, louvre windows, the teacher's
  // table, two wooden desks in profile facing the board) | 'board' (the corridor noticeboard of results sheets; o.highlight = index of
  // the sheet to light, 0-7, o.highlightK 0..1). o.sky, o.clock.
  // Anchors (class): teacher (standing at the board), board, desk1, desk2 (desk seats, sitters face left), table (teacher's table top),
  // left, center, right. Anchors (board): board, sheet0..sheet7 (sheet centres), left, center, right.
  // SETS.schoolFront: class: the near desk (desk2) over its sitter.
  const SC = { FY: 840, wall: '#FBE7C0', wallSh: '#EFCFA0', lower: '#8FC2B0', lowerSh: '#7DAF9D', board: '#2F5E57', boardSh: '#294F4A', frame: '#B0703F', frameSh: '#965E35',
    floor: '#D9B08A', floorAlt: '#D3A881', floorLine: '#BF9269', floorSh: '#AE7F58', desk: '#C98A55', deskSh: '#A8703F', cork: '#D79F6E', corkFrame: '#B0703F' };
  function schoolDesk(g, x0, fy, s, noShadow) {
    // a two-seater wooden desk in profile, the sitter facing left: slanted top on the left, bench on the right, a back rest
    const P = SC, top = fy - 350 * s;
    if (!noShadow) floorShadow(g, x0 + 220 * s, fy + 4, 250 * s, 14 * s, P.floorSh, 5);
    for (const lx of [x0 + 24 * s, x0 + 204 * s, x0 + 270 * s, x0 + 420 * s]) shape(g, () => rectP(g, lx - 9 * s, lx > x0 + 250 * s ? fy - 205 * s : top, 18 * s, lx > x0 + 250 * s ? 205 * s : fy - top), P.desk, LW.small, P.deskSh, () => rectP(g, lx + 2 * s, top, 7 * s, fy));
    shape(g, () => rectP(g, x0 + 16 * s, fy - 54 * s, 412 * s, 16 * s), P.desk, LW.small, P.deskSh, () => rectP(g, x0 + 16 * s, fy - 46 * s, 412 * s, 8 * s));
    shape(g, () => rectP(g, x0 + 438 * s - 9 * s, fy - 470 * s, 18 * s, 470 * s), P.desk, LW.small, P.deskSh, () => rectP(g, x0 + 438 * s, fy - 480 * s, 9 * s, 480 * s));
    shape(g, () => rrP(g, x0 + 412 * s, fy - 470 * s, 40 * s, 150 * s, 6 * s), P.desk, LW.small, P.deskSh, () => rectP(g, x0 + 434 * s, fy - 480 * s, 20 * s, 170 * s));
    shape(g, () => rectP(g, x0 + 20 * s, top + 16 * s, 190 * s, 74 * s), P.deskSh, LW.small);
    for (let i = 0; i < 3; i++) shape(g, () => rectP(g, x0 + 34 * s + i * 30 * s, top + 40 * s, 24 * s, 50 * s), ['#7BAFE1', '#E5534B', '#F4BF54'][i], LW.detail);
    shape(g, () => polyP(g, [x0 + 4 * s, top + 6 * s, x0 + 230 * s, top - 18 * s, x0 + 232 * s, top - 2 * s, x0 + 6 * s, top + 22 * s]), P.desk, LW.small, P.deskSh, () => polyP(g, [x0, top + 14 * s, x0 + 236 * s, top - 10 * s, x0 + 236 * s, top, x0, top + 26 * s]));
    shape(g, () => rrP(g, x0 + 250 * s, fy - 214 * s, 196 * s, 20 * s, 5 * s), P.desk, LW.small, P.deskSh, () => rectP(g, x0 + 250 * s, fy - 204 * s, 196 * s, 10 * s));
    return { x: x0 + 340 * s, y: fy - 214 * s, s: s * 0.98, facing: -1 };
  }
  const DESK1 = [1210, 900, 0.86], DESK2 = [1420, 1020, 1.06];
  function chalkMarks(g, x, y, w, h) {
    g.save(); g.strokeStyle = 'rgba(250,250,240,0.85)'; g.lineWidth = 4; g.lineCap = 'round';
    const r = rng(29);
    for (let row = 0; row < 4; row++) {
      let cx = x + 50 + (row === 0 ? 80 : 0); const cy = y + 70 + row * 64, end = x + w * (0.45 + r() * 0.15);
      while (cx < end) { const len = 30 + r() * 70; g.beginPath(); g.moveTo(cx, cy); for (let t = 0; t <= 1.001; t += 0.1) g.lineTo(cx + len * t, cy + Math.sin(t * Math.PI * (3 + r() * 2)) * 9); g.stroke(); cx += len + 22; }
    }
    // geometry on the right: a triangle, a circle, a little arrow, an underline
    g.beginPath(); g.moveTo(x + w * 0.66, y + h * 0.7); g.lineTo(x + w * 0.8, y + h * 0.28); g.lineTo(x + w * 0.92, y + h * 0.7); g.closePath(); g.stroke();
    ellP(g, x + w * 0.79, y + h * 0.56, 34, 34); g.stroke();
    g.beginPath(); g.moveTo(x + 60, y + h * 0.84); g.lineTo(x + w * 0.42, y + h * 0.84); g.stroke();
    g.restore();
  }
  function classStatic(g, o) {
    const P = SC, FY = P.FY;
    tileFloor(g, FY, { col: P.floor, alt: P.floorAlt, line: P.floorLine, vpx: 860, vpy: 300, step: 200, h0: 34 });
    rectP(g, 0, 0, W, FY); paint(g, P.wall, 0);
    rectP(g, 0, 580, W, FY - 580); paint(g, P.lower, 0);
    shape(g, () => rectP(g, -10, 572, W + 20, 14), P.frame, LW.small);
    // blackboard with a wooden frame and a chalk tray
    shape(g, () => rectP(g, 190, 140, 1000, 396), P.frame, LW.big, P.frameSh, () => rectP(g, 190, 516, 1000, 20));
    shape(g, () => rectP(g, 212, 160, 956, 356), P.board, LW.small, P.boardSh, () => polyP(g, [212, 160, 1168, 160, 1168, 180, 232, 180, 232, 516, 212, 516]));
    chalkMarks(g, 212, 160, 956, 356);
    softFill(g, 20, 'rgba(255,255,255,0.08)', () => polyP(g, [700, 160, 820, 160, 640, 516, 520, 516]));
    shape(g, () => rectP(g, 180, 536, 1020, 18), P.frame, LW.small, P.frameSh, () => rectP(g, 180, 546, 1020, 8));
    for (const [cx, c] of [[300, '#FFFFFF'], [330, '#F4BF54'], [360, '#FFFFFF']]) shape(g, () => rrP(g, cx, 526, 22, 9, 4), c, 1.6);
    shape(g, () => rrP(g, 1020, 514, 80, 24, 5), '#6E4A3A', LW.detail); shape(g, () => rectP(g, 1024, 532, 72, 8), '#F2EDE4', 1.4);
    clockFaceRim(g, 690, 80, 46, '#A3ADB8', mix(P.wall, P.wallSh, 0.9));
    // a chart beside the board: coloured blocks, no letters
    shape(g, () => rectP(g, 1230, 200, 160, 220), '#FFFDF6', LW.small, '#EFE6D6', () => rectP(g, 1360, 200, 30, 220));
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { rrP(g, 1248 + c * 44, 220 + r * 48, 34, 36, 6); paint(g, ['#E5534B', '#F4BF54', '#7BAFE1', '#77CC81'][(r + c) % 4], 1.4); }
    louvreWindow(g, 1460, 150, 380, 330, { sky: o.sky || 'day', seed: 91, frame: '#F3E2C4', cols: 2 });
    wallBand(g, P.wall, P.wallSh, [0, 0, W, 572], [-20, 110, 600, 20, 1300, 20, W + 20, 110]);
    clipDo(g, () => rectP(g, 0, 0, W, FY), () => softFill(g, 12, 'rgba(255,248,226,0.3)', () => polyP(g, [1470, 480, 1830, 480, 1500, FY, 1020, FY]), 'screen'));
    softFill(g, 16, 'rgba(255,246,220,0.3)', () => polyP(g, [1020, FY + 4, 1500, FY + 4, 1260, H, 600, H]), 'screen');
    line(g, 0, FY, W, FY, LW.arch);
    // teacher's table: books, a register, the hand bell
    floorShadow(g, 330, 896, 230, 14, P.floorSh, 5);
    shape(g, () => rectP(g, 130, 664, 400, 224), P.desk, LW.big, P.deskSh, () => rectP(g, 130, 664, 400, 24));
    shape(g, () => rectP(g, 170, 708, 320, 150), mix(P.desk, '#FFFFFF', 0.08), LW.small, P.deskSh, () => rectP(g, 170, 708, 320, 12));
    shape(g, () => rrP(g, 116, 642, 428, 26, 6), P.desk, LW.big, P.deskSh, () => rectP(g, 116, 656, 428, 12));
    for (let i = 0; i < 5; i++) shape(g, () => rectP(g, 170 + i * 3, 624 - i * 14, 150, 14), ['#7BAFE1', '#E5534B', '#77CC81', '#F4BF54', '#7BAFE1'][i], LW.detail);
    shape(g, () => rectP(g, 350, 630, 110, 14), '#3A8594', LW.detail);
    shape(g, () => { g.beginPath(); g.moveTo(466, 640); g.lineTo(506, 640); g.quadraticCurveTo(502, 600, 486, 596); g.quadraticCurveTo(470, 600, 466, 640); g.closePath(); }, '#E9B04A', LW.small, '#CF9530', () => rectP(g, 488, 590, 30, 60));
    shape(g, () => rrP(g, 480, 562, 12, 36, 5), '#6E4A3A', LW.detail);
    schoolDesk(g, DESK1[0], DESK1[1], DESK1[2]);
    schoolDesk(g, DESK2[0], DESK2[1], DESK2[2]);
  }
  function classAnchors() {
    const d1 = { x: DESK1[0] + 340 * DESK1[2], y: DESK1[1] - 214 * DESK1[2], s: DESK1[2] * 0.98, facing: -1 }, d2 = { x: DESK2[0] + 340 * DESK2[2], y: DESK2[1] - 214 * DESK2[2], s: DESK2[2] * 0.98, facing: -1 };
    return { teacher: { x: 700, y: 975, s: 1 }, board: { x: 690, y: 338, s: 1 }, desk1: d1, desk2: d2, table: { x: 330, y: 642, s: 1 },
      left: { x: 360, y: 985, s: 1.02 }, center: { x: 900, y: 985, s: 1.02 }, right: { x: 1300, y: 985, s: 1.02 }, clock: { x: 690, y: 80, s: 1, r: 46 } };
  }
  const SHEETS = [[400, 190, 210, 270, -0.02], [640, 176, 210, 280, 0.015], [880, 196, 210, 270, -0.01], [1120, 180, 210, 280, 0.02], [1360, 192, 190, 260, -0.015], [460, 420, 230, 200, 0.01], [760, 430, 230, 190, -0.02], [1180, 424, 260, 196, 0.012]];
  function sheet(g, x, y, w, h, rot, seed) {
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(rot);
    rectP(g, -w / 2 + 6, -h / 2 + 8, w, h); paint(g, 'rgba(110,60,30,0.2)', 0);
    shape(g, () => rectP(g, -w / 2, -h / 2, w, h), '#FFFFFF', LW.detail, '#EEF0F2', () => polyP(g, [w / 2, -h / 2, w / 2, h / 2, w * 0.25, h / 2]));
    rectP(g, -w / 2 + 16, -h / 2 + 18, w * 0.6, 12); paint(g, '#9AA3AA', 0);
    const r = rng(seed), rows = Math.floor((h - 60) / 22);
    for (let i = 0; i < rows; i++) { const ry = -h / 2 + 48 + i * 22; rectP(g, -w / 2 + 16, ry, w * (0.25 + r() * 0.2), 7); paint(g, '#C9CED3', 0); rectP(g, w * 0.18, ry, w * 0.16, 7); paint(g, '#C9CED3', 0); }
    line(g, w * 0.12, -h / 2 + 42, w * 0.12, h / 2 - 12, 1.4, '#C9CED3');
    ellP(g, 0, -h / 2 + 10, 7, 7); paint(g, '#E26B5B', 1.6);
    g.restore();
  }
  function boardStatic(g, o) {
    const P = SC, FY = P.FY;
    tileFloor(g, FY, { col: P.floor, alt: P.floorAlt, line: P.floorLine, vpx: 960, vpy: 300, step: 200, h0: 34 });
    rectP(g, 0, 0, W, FY); paint(g, P.wall, 0);
    rectP(g, 0, 640, W, FY - 640); paint(g, P.lower, 0);
    shape(g, () => rectP(g, -10, 632, W + 20, 14), P.frame, LW.small);
    shape(g, () => rectP(g, 330, 120, 1240, 520), P.corkFrame, LW.big, P.frameSh, () => rectP(g, 330, 616, 1240, 24));
    shape(g, () => rectP(g, 352, 142, 1196, 476), P.cork, LW.small, dark(P.cork, 0.92), () => polyP(g, [352, 142, 1548, 142, 1548, 160, 370, 160, 370, 618, 352, 618]));
    const r = rng(5); g.fillStyle = dark(P.cork, 0.88); for (let i = 0; i < 90; i++) { ellP(g, 360 + r() * 1180, 150 + r() * 460, 2.5, 2.5); g.fill(); }
    SHEETS.forEach((s, i) => sheet(g, s[0], s[1], s[2], s[3], s[4], i + 3));
    louvreWindow(g, 1650, 170, 220, 330, { sky: o.sky || 'day', seed: 93, frame: '#F3E2C4', cols: 1 });
    wallBand(g, P.wall, P.wallSh, [0, 0, W, 632], [-20, 90, 600, 20, 1300, 20, W + 20, 90]);
    softFill(g, 16, 'rgba(255,246,220,0.3)', () => polyP(g, [1650, FY + 4, 1880, FY + 4, 1700, H, 1300, H]), 'screen');
    line(g, 0, FY, W, FY, LW.arch);
    // a long bench under the board
    floorShadow(g, 960, 902, 460, 14, P.floorSh, 5);
    for (const lx of [560, 1360]) shape(g, () => rectP(g, lx - 10, 790, 20, 110), P.desk, LW.small, P.deskSh, () => rectP(g, lx + 2, 790, 8, 110));
    shape(g, () => rrP(g, 500, 772, 920, 24, 6), P.desk, LW.small, P.deskSh, () => rectP(g, 500, 786, 920, 10));
  }
  function boardAnchors() {
    const a = { board: { x: 950, y: 380, s: 1 }, left: { x: 420, y: 985, s: 1.02 }, center: { x: 960, y: 985, s: 1.02 }, right: { x: 1500, y: 985, s: 1.02 }, bench: { x: 960, y: 776, s: 0.95 } };
    SHEETS.forEach((s, i) => { a['sheet' + i] = { x: s[0] + s[2] / 2, y: s[1] + s[3] / 2, s: 1, w: s[2], h: s[3] }; });
    return a;
  }
  SETS.school = function (g, o) {
    o = o || {}; const xf = camXf(o.cam), board = o.view === 'board';
    blit(g, xf, layer('school|' + (board ? 'board' : 'class') + '|' + (o.sky || 'day'), devRes(g, xf), (lg) => board ? boardStatic(lg, o) : classStatic(lg, o)));
    live(g, xf, (g2) => {
      if (!board) { clockHands(g2, 690, 80, 46, o.clock != null ? o.clock : 10.4); return; }
      if (o.highlight != null && SHEETS[o.highlight]) {
        const s = SHEETS[o.highlight], k = o.highlightK == null ? 1 : clamp(o.highlightK);
        if (k > 0) {
          g2.save(); g2.translate(s[0] + s[2] / 2, s[1] + s[3] / 2); g2.rotate(s[4]);
          const ry = -s[3] / 2 + 48 + 22 * 3;
          rectP(g2, -s[2] / 2 + 10, ry - 7, (s[2] - 20) * easeOutCubic(k), 20); g2.fillStyle = 'rgba(244,224,84,0.75)'; g2.fill();
          rrP(g2, -s[2] / 2 - 10, -s[3] / 2 - 10, s[2] + 20, s[3] + 20, 10); g2.globalAlpha = k; g2.lineWidth = 6; g2.strokeStyle = '#F4BF54'; g2.stroke();
          g2.restore();
        }
      }
    });
    return result(xf, board ? boardAnchors() : classAnchors(), 985, SC.FY);
  };
  SETS.schoolFront = function (g, o) {
    o = o || {}; const xf = camXf(o.cam), board = o.view === 'board';
    if (!board && o.desk !== false) blit(g, xf, layer('schoolFront', devRes(g, xf), (lg) => schoolDesk(lg, DESK2[0], DESK2[1], DESK2[2], true)), null, { x: 1400, y: 500, w: 520, h: 540 });
    return result(xf, board ? boardAnchors() : classAnchors(), 985, SC.FY);
  };

  // ================================================================ PARTY HALL (weddings, naming ceremonies: Q06)
  // SETS.partyHall(g, o) (also SETS.party(g, { hall: true, ... })): o.theme 'wedding' (default: gold, cream, teal, coral) | 'naming'
  // (sky blue, cream, yellow, green) | 'funeral' (white, silver, charcoal, lilac; no balloons, a framed portrait on an easel on the high
  // table); o.heart (a heart on the rice); o.t.
  // Draped ceiling swags and side drapes, a backdrop with flower pillars, a stage with the high table and two throne chairs, balloon
  // columns, rows of covered guest chairs (left), a serving table with food warmers and the giant pot of jollof rice (right).
  // Anchors: highSeat1, highSeat2 (the couple's seats behind the high table, s ~0.48), stage (standing on the stage), rice (top of the
  // heap), riceSide (standing beside the pot), serve (serving table top), aisle, left, center, right.
  // SETS.partyHallFront: the high table (over the seated couple).
  const PT = { FY: 800, wall: '#F7D9B5', wallSh: '#E9BF94', floor: '#D9A06E', floorAlt: '#D29766', floorLine: '#BE8556', floorSh: '#AE7448', stage: '#B0703F', stageSh: '#965E35', steel: '#D8DDE2', steelSh: '#B9C0C8' };
  const PARTY_THEMES = {
    wedding: { a: '#F4BF54', aSh: '#DCA640', b: '#FFF4E3', bSh: '#EBDCC6', c: '#3A8594', cSh: '#2F7280', d: '#E37F78', dSh: '#C9665F' },
    naming: { a: '#7BAFE1', aSh: '#6497C9', b: '#FFF4E3', bSh: '#EBDCC6', c: '#F4BF54', cSh: '#DCA640', d: '#77CC81', dSh: '#62B26C' },
    funeral: { a: '#E4E4EA', aSh: '#C8C8D2', b: '#FFF8EE', bSh: '#ECE2D2', c: '#3B3B4C', cSh: '#2E2E3C', d: '#9A8FC0', dSh: '#8276AC', quiet: true },
  };
  function flowerBall(g, x, y, r, T, seed) {
    const rr = rng(seed || 1), cols = [T.d, T.b, T.a, T.d];
    for (let i = 0; i < 4; i++) leaf(g, x, y, i * 1.6 + 0.3, r * 1.25, r * 0.22, '#87A26A', '#6F8C57', 1.6);
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + rr(), d = i ? r * 0.55 : 0; const fx = x + Math.cos(a) * d, fy = y + Math.sin(a) * d * 0.8, fr = r * (0.36 + rr() * 0.1), c = cols[i % 4];
      for (let p = 0; p < 5; p++) { const b = p / 5 * TAU; ellP(g, fx + Math.cos(b) * fr * 0.55, fy + Math.sin(b) * fr * 0.55, fr * 0.5, fr * 0.5); paint(g, c, 1.4); }
      ellP(g, fx, fy, fr * 0.3, fr * 0.3); paint(g, T.a === c ? T.d : T.a, 1.2); }
  }
  function balloonColumn(g, x, fy, top, T) {
    const cols = [T.a, T.b, T.c, T.d];
    shape(g, () => rrP(g, x - 34, fy - 30, 68, 30, 6), T.c, LW.small, T.cSh, () => rectP(g, x, fy - 30, 34, 30));
    let i = 0;
    for (let y = fy - 60; y > top + 40; y -= 62, i++) {
      for (const [dx, dy, ci] of [[-30, 0, 0], [30, 0, 1], [0, 14, 2]]) {
        const c = cols[(i + ci) % 4], bx = x + dx, by = y + dy;
        ellP(g, bx, by, 31, 33); paint(g, c, LW.small);
        g.save(); ellP(g, bx, by, 31, 33); g.clip(); ellP(g, bx + 14, by + 12, 26, 30); g.fillStyle = dark(c, 0.88); g.fill(); g.restore();
        ellP(g, bx, by, 31, 33); paint(g, null, LW.small);
        ellP(g, bx - 11, by - 13, 5, 9); g.fillStyle = 'rgba(255,255,255,0.65)'; g.fill();
      }
    }
    balloon(g, x, top, 46, T.a, x, top + 120);
  }
  function eventChair(g, x, fy, s, T, sashC) {
    const back = fy - 380 * s, seat = fy - 200 * s;
    shape(g, () => { g.beginPath(); g.moveTo(x - 76 * s, fy); g.lineTo(x - 70 * s, seat); g.lineTo(x + 70 * s, seat); g.lineTo(x + 76 * s, fy); g.closePath(); }, '#FFFFFF', LW.small, '#E9E4DA', () => rectP(g, x + 30 * s, seat, 60 * s, 220 * s));
    g.strokeStyle = rgba(INK, 0.5); g.lineWidth = 1.6; g.beginPath(); for (const fx of [-36, 0, 36]) { g.moveTo(x + fx * s, seat + 20 * s); g.lineTo(x + fx * 1.06 * s, fy - 6); } g.stroke();
    shape(g, () => rrP(g, x - 66 * s, back, 132 * s, seat - back + 6, [40 * s, 40 * s, 4, 4]), '#FFFFFF', LW.small, '#E9E4DA', () => rectP(g, x + 28 * s, back, 50 * s, seat - back + 10));
    const by = back + (seat - back) * 0.55;
    shape(g, () => rectP(g, x - 66 * s, by - 16 * s, 132 * s, 32 * s), sashC, LW.detail, dark(sashC, 0.86), () => rectP(g, x - 66 * s, by + 4 * s, 132 * s, 12 * s));
    for (const sx of [-1, 1]) shape(g, () => { g.beginPath(); g.moveTo(x, by); g.quadraticCurveTo(x + sx * 40 * s, by - 34 * s, x + sx * 44 * s, by); g.quadraticCurveTo(x + sx * 40 * s, by + 30 * s, x, by); g.closePath(); }, sashC, LW.detail);
    for (const sx of [-1, 1]) shape(g, () => polyP(g, [x - 5 * s, by, x + 5 * s, by, x + sx * 26 * s + 6 * s, by + 70 * s, x + sx * 26 * s - 6 * s, by + 70 * s]), sashC, LW.detail);
    ellP(g, x, by, 9 * s, 9 * s); paint(g, dark(sashC, 0.9), LW.detail);
  }
  function chafingDish(g, cx, by, w, T) {
    for (const sx of [-1, 1]) shape(g, () => rectP(g, cx + sx * w * 0.38 - 4, by - 30, 8, 30), PT.steelSh, LW.detail);
    shape(g, () => rrP(g, cx - w / 2, by - 64, w, 36, 8), PT.steel, LW.small, PT.steelSh, () => rectP(g, cx + w * 0.2, by - 70, w * 0.3, 44));
    shape(g, () => { g.beginPath(); g.ellipse(cx, by - 64, w * 0.5, w * 0.26, 0, Math.PI, TAU); g.closePath(); }, PT.steel, LW.small, PT.steelSh, () => rectP(g, cx + w * 0.12, by - 64 - w * 0.3, w * 0.4, w * 0.3));
    shape(g, () => rrP(g, cx - 14, by - 64 - w * 0.26 - 12, 28, 14, 6), T.a, LW.detail);
    line(g, cx - w * 0.3, by - 76, cx - w * 0.12, by - 64 - w * 0.2, 4, 'rgba(255,255,255,0.7)');
  }
  function highTable(g, T, noShadow) {
    // table on the stage: cloth top, teal skirt with gold swags and bows, a flower centrepiece, two goblets
    shape(g, () => polyP(g, [618, 528, 1302, 528, 1314, 546, 606, 546]), T.b, LW.small, T.bSh, () => rectP(g, 600, 540, 720, 8));
    shape(g, () => { g.beginPath(); g.moveTo(606, 546); g.lineTo(1314, 546); g.lineTo(1320, 700); g.lineTo(600, 700); g.closePath(); }, T.c, LW.small, T.cSh, () => { g.beginPath(); for (let i = 0; i < 6; i++) g.rect(640 + i * 120, 546, 20, 160); });
    for (let i = 0; i < 6; i++) { const x0 = 606 + i * 118; g.beginPath(); g.moveTo(x0, 552); g.quadraticCurveTo(x0 + 59, 620, x0 + 118, 552); g.lineWidth = 14 + 2 * LW.detail; g.strokeStyle = INK; g.stroke(); g.lineWidth = 14; g.strokeStyle = T.a; g.stroke(); }
    for (let i = 0; i <= 6; i++) { const bx = 606 + i * 118; ellP(g, bx, 556, 12, 12); paint(g, T.d, LW.detail); }
    if (T.quiet) { for (const sx of [-1, 1]) line(g, 960 + sx * 30, 528, 960 + sx * 12, 420, 5); line(g, 960, 528, 960, 440, 5); photo(g, 908, 412, 104, 116, 'elders', { frame: '#3B3B4C', bg: '#E7E2EE' }); flowerBall(g, 960, 520, 26, T, 7); }
    else { flowerBall(g, 960, 494, 40, T, 7); shape(g, () => { g.beginPath(); g.moveTo(940, 528); g.lineTo(980, 528); g.lineTo(972, 500); g.lineTo(948, 500); g.closePath(); }, T.a, LW.detail); }
    for (const gx of [840, 1080]) { shape(g, () => { g.beginPath(); g.moveTo(gx - 14, 470); g.lineTo(gx + 14, 470); g.quadraticCurveTo(gx + 14, 498, gx, 500); g.quadraticCurveTo(gx - 14, 498, gx - 14, 470); g.closePath(); }, 'rgba(236,246,248,0.95)', LW.detail); line(g, gx, 500, gx, 522, 3); line(g, gx - 10, 526, gx + 10, 526, 3); line(g, gx - 14, 472, gx + 14, 472, 3, T.a); }
  }
  function partyHallStatic(g, o) {
    const T = PARTY_THEMES[o.theme] || PARTY_THEMES.wedding, FY = PT.FY;
    tileFloor(g, FY, { col: PT.floor, alt: PT.floorAlt, line: PT.floorLine, vpx: 960, vpy: 260, step: 200, h0: 34 });
    rectP(g, 0, 0, W, FY); paint(g, PT.wall, 0);
    // backdrop: pleated cream with a scalloped valance and two flower pillars
    shape(g, () => rectP(g, 470, 140, 980, 560), T.b, LW.small);
    clipDo(g, () => rectP(g, 470, 140, 980, 560), () => { g.fillStyle = T.bSh; for (let x = 470; x < 1450; x += 70) { polyP(g, [x + 40, 140, x + 70, 140, x + 66, 700, x + 44, 700]); g.fill(); } });
    g.strokeStyle = rgba(INK, 0.35); g.lineWidth = 2; g.beginPath(); for (let x = 510; x < 1450; x += 70) { g.moveTo(x, 150); g.lineTo(x - 2, 696); } g.stroke();
    shape(g, () => { g.beginPath(); g.moveTo(460, 128); g.lineTo(1460, 128); g.lineTo(1460, 190); for (let i = 9; i >= 0; i--) g.arc(460 + (i + 0.5) * 100, 190, 50, 0, Math.PI, false); g.closePath(); }, T.c, LW.small, T.cSh, () => rectP(g, 460, 128, 1000, 22));
    for (let i = 0; i <= 10; i++) { ellP(g, 460 + i * 100, 192, 11, 11); paint(g, T.a, LW.detail); }
    for (const px of [500, 1420]) for (let y = 250; y < 700; y += 70) flowerBall(g, px, y, 34, T, px + y);
    flowerBall(g, 960, 140, 52, T, 3);
    // the stage
    shape(g, () => polyP(g, [430, 690, 1490, 690, 1520, 730, 400, 730]), '#C9443D', LW.small, '#A8392F', () => polyP(g, [400, 720, 1520, 720, 1520, 730, 400, 730]));
    shape(g, () => rectP(g, 400, 730, 1120, 112), PT.stage, LW.big, PT.stageSh, () => rectP(g, 400, 730, 1120, 20));
    shape(g, () => { g.beginPath(); g.moveTo(400, 730); g.lineTo(1520, 730); g.lineTo(1520, 790); for (let i = 13; i >= 0; i--) g.arc(400 + (i + 0.5) * 80, 790, 40, 0, Math.PI, false); g.closePath(); }, T.a, LW.small, T.aSh, () => rectP(g, 400, 730, 1120, 18));
    shape(g, () => rectP(g, 860, 842, 200, 22), PT.stage, LW.small, PT.stageSh, () => rectP(g, 860, 856, 200, 8));
    // throne chairs behind the table
    for (const cx of [830, 1090]) {
      shape(g, () => { g.beginPath(); g.moveTo(cx - 74, 610); g.lineTo(cx - 74, 430); g.quadraticCurveTo(cx - 76, 366, cx - 30, 360); g.quadraticCurveTo(cx, 330, cx + 30, 360); g.quadraticCurveTo(cx + 76, 366, cx + 74, 430); g.lineTo(cx + 74, 610); g.closePath(); }, T.a, LW.small, T.aSh, () => rectP(g, cx + 40, 330, 50, 290));
      shape(g, () => { g.beginPath(); g.moveTo(cx - 54, 600); g.lineTo(cx - 54, 438); g.quadraticCurveTo(cx - 54, 388, cx - 20, 384); g.quadraticCurveTo(cx, 362, cx + 20, 384); g.quadraticCurveTo(cx + 54, 388, cx + 54, 438); g.lineTo(cx + 54, 600); g.closePath(); }, T.b, LW.detail, T.bSh, () => rectP(g, cx + 24, 360, 40, 250));
      ellP(g, cx, 340, 12, 12); paint(g, T.a, LW.detail);
    }
    highTable(g, T);
    // ceiling swags and their tails, side drapes
    const n = 7, step = 2000 / n;
    for (let i = 0; i < n; i++) {
      const x0 = -40 + i * step, x1 = x0 + step, c = i % 2 ? T.b : T.a, cs = i % 2 ? T.bSh : T.aSh;
      const sw = () => { g.beginPath(); g.moveTo(x0, -10); g.quadraticCurveTo((x0 + x1) / 2, 70, x1, -10); g.lineTo(x1, 10); g.quadraticCurveTo((x0 + x1) / 2, 190, x0, 10); g.closePath(); };
      shape(g, sw, c, LW.small, cs, () => { g.beginPath(); g.moveTo(x0, 40); g.quadraticCurveTo((x0 + x1) / 2, 150, x1, 40); g.lineTo(x1, 200); g.lineTo(x0, 200); g.closePath(); });
      g.strokeStyle = rgba(INK, 0.4); g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + 20, 6); g.quadraticCurveTo((x0 + x1) / 2, 120, x1 - 20, 6); g.stroke();
    }
    for (let i = 0; i <= n; i++) {
      const x = -40 + i * step, c = i % 2 ? T.c : T.d;
      shape(g, () => { g.beginPath(); g.moveTo(x - 16, 14); g.quadraticCurveTo(x - 24, 140, x - 12, 250); g.lineTo(x + 12, 262); g.quadraticCurveTo(x + 22, 140, x + 16, 14); g.closePath(); }, c, LW.small, dark(c, 0.86), () => rectP(g, x + 2, 10, 20, 260));
      ellP(g, x, 16, 26, 22); paint(g, c, LW.small); ellP(g, x, 16, 10, 9); paint(g, T.a, LW.detail);
    }
    for (const [x, flip] of [[-20, false], [1790, true]]) {
      const cx = flip ? x + 40 : x + 110;
      shape(g, () => { g.beginPath(); g.moveTo(x, -10); g.lineTo(x + 150, -10); g.quadraticCurveTo(flip ? x + 110 : x + 150, 380, cx, 520); g.quadraticCurveTo(flip ? x + 10 : x + 160, 700, flip ? x - 20 : x + 170, FY + 30); g.lineTo(flip ? x + 150 : x, FY + 30); g.lineTo(flip ? x + 150 : x, -10); g.closePath(); }, T.a, LW.small, T.aSh, () => { g.beginPath(); for (const fx of [x + 30, x + 80]) g.rect(fx, -10, 22, FY + 40); });
      shape(g, () => rrP(g, cx - 30, 506, 60, 28, 12), T.c, LW.small);
    }
    wallBand(g, PT.wall, PT.wallSh, [0, 0, W, FY], [-20, 180, 600, 60, 1300, 60, W + 20, 180]);
    softFill(g, 60, 'rgba(255,236,196,0.4)', () => ellP(g, 960, 420, 520, 300), 'screen');
    for (const lx of [400, 1500]) softFill(g, 26, 'rgba(255,240,210,0.3)', () => ellP(g, lx, 930, 260, 60), 'screen');
    line(g, 0, FY, 400, FY, LW.arch); line(g, 1520, FY, W, FY, LW.arch);
    // balloon columns beside the stage
    if (!T.quiet) { balloonColumn(g, 300, 830, 250, T); balloonColumn(g, 1610, 830, 250, T); }
    else for (const px of [300, 1610]) { shape(g, () => rrP(g, px - 40, 690, 80, 140, 8), T.b, LW.small, T.bSh, () => rectP(g, px + 10, 690, 30, 140)); flowerBall(g, px, 660, 46, T, px); }
    // guests' chairs (left), serving table and the rice (right)
    for (const [fy, s, xs] of [[850, 0.66, [100, 240, 380, 520, 660]], [925, 0.78, [70, 236, 402, 568]]]) xs.forEach((x, i) => eventChair(g, x, fy, s, T, i % 2 ? T.c : T.d));
    floorShadow(g, 1660, 912, 260, 14, PT.floorSh, 6);
    for (const lx of [1440, 1880]) shape(g, () => rectP(g, lx - 9, 680, 18, 228), '#8E5634', LW.small);
    shape(g, () => polyP(g, [1430, 640, 1900, 640, 1910, 660, 1420, 660]), T.b, LW.small);
    shape(g, () => { g.beginPath(); g.moveTo(1420, 660); g.lineTo(1910, 660); g.lineTo(1914, 760); for (let i = 7; i >= 0; i--) g.arc(1416 + (i + 0.5) * 62.25, 760, 31, 0, Math.PI, false); g.closePath(); }, T.b, LW.small, T.bSh, () => rectP(g, 1410, 660, 520, 14));
    chafingDish(g, 1520, 642, 130, T); chafingDish(g, 1680, 642, 130, T);
    for (let i = 0; i < 6; i++) shape(g, () => { g.beginPath(); g.ellipse(1830, 638 - i * 8, 50, 10, 0, 0, TAU); }, '#FFFFFF', LW.detail);
    ricePot(g, 1300, 958, 1.0, { floorSh: rgba(PT.floorSh, 0.8), heart: !!o.heart, seed: 23 });
  }
  function partyHallAnchors() {
    return { highSeat1: { x: 830, y: 607, s: 0.48 }, highSeat2: { x: 1090, y: 607, s: 0.48 }, stage: { x: 960, y: 708, s: 0.48 },
      rice: { x: 1300, y: 700, s: 1 }, riceSide: { x: 1080, y: 985, s: 1 }, serve: { x: 1660, y: 640, s: 1 }, aisle: { x: 900, y: 940, s: 0.95 },
      left: { x: 420, y: 990, s: 1.02 }, center: { x: 900, y: 990, s: 1.02 }, right: { x: 1640, y: 990, s: 1.02 } };
  }
  SETS.partyHall = function (g, o) {
    o = o || {}; const xf = camXf(o.cam), th = PARTY_THEMES[o.theme] ? o.theme : 'wedding';   // themes: wedding | naming | funeral
    blit(g, xf, layer('partyHall|' + th + '|' + (o.heart ? 1 : 0), devRes(g, xf), (lg) => partyHallStatic(lg, Object.assign({}, o, { theme: th }))));
    return result(xf, partyHallAnchors(), 990, PT.FY);
  };
  SETS.partyHallFront = function (g, o) {
    o = o || {}; const xf = camXf(o.cam), th = PARTY_THEMES[o.theme] ? o.theme : 'wedding';   // wedding | naming | funeral
    if (o.table !== false) blit(g, xf, layer('partyHallFront|' + th, devRes(g, xf), (lg) => highTable(lg, PARTY_THEMES[th])), null, { x: 590, y: 440, w: 740, h: 270 });
    return result(xf, partyHallAnchors(), 990, PT.FY);
  };
  // SETS.party keeps the first video's birthday room; { hall: true } (or theme: 'wedding' | 'naming') gives the hall
  { const birthday = SETS.party, birthdayFront = SETS.partyFront;
    SETS.party = function (g, o) { return o && (o.hall || PARTY_THEMES[o.theme]) ? SETS.partyHall(g, o) : birthday(g, o); };
    SETS.partyFront = function (g, o) { return o && (o.hall || PARTY_THEMES[o.theme]) ? SETS.partyHallFront(g, o) : birthdayFront(g, o); }; }

  // ================================================================ GRAPHIC STAGES
  // ---------------------------------------------------------------- milestone icons (drawn in a unit circle of radius r at x, y)
  // kinds: cot, bag (school bag), cap (graduation cap), office (briefcase), rice (pot of rice), ring, heart, house, baby, money
  function milestoneIcon(g, kind, x, y, r) {
    g.save(); g.translate(x, y); const s = r / 50, lw = Math.max(1.6, 3 * s);
    g.lineJoin = 'round'; g.lineCap = 'round';
    const P = (fn, fill, sh, shFn) => shape(g, fn, fill, lw, sh, shFn);
    if (kind === 'cot') {
      P(() => rrP(g, -34 * s, -6 * s, 68 * s, 30 * s, 4 * s), '#7BAFE1', '#6497C9', () => rectP(g, -34 * s, 14 * s, 68 * s, 12 * s));
      for (let i = 0; i < 5; i++) line(g, -26 * s + i * 13 * s, -26 * s, -26 * s + i * 13 * s, -6 * s, lw);
      line(g, -36 * s, -26 * s, 36 * s, -26 * s, lw); for (const sx of [-1, 1]) line(g, sx * 36 * s, -32 * s, sx * 36 * s, 34 * s, lw * 1.3);
      ellP(g, -10 * s, -10 * s, 10 * s, 10 * s); paint(g, '#FCEBCB', lw);
    } else if (kind === 'bag') {
      g.beginPath(); g.arc(0, -22 * s, 14 * s, Math.PI, 0); g.lineWidth = lw * 1.6; g.strokeStyle = INK; g.stroke();
      P(() => rrP(g, -28 * s, -22 * s, 56 * s, 56 * s, 14 * s), '#E5534B', '#C9443D', () => rectP(g, 10 * s, -24 * s, 20 * s, 60 * s));
      P(() => rrP(g, -18 * s, 4 * s, 36 * s, 22 * s, 6 * s), '#F4BF54', null);
      line(g, -28 * s, -6 * s, 28 * s, -6 * s, lw);
    } else if (kind === 'cap') {
      P(() => { g.beginPath(); g.moveTo(-24 * s, 0); g.lineTo(-24 * s, 20 * s); g.quadraticCurveTo(0, 32 * s, 24 * s, 20 * s); g.lineTo(24 * s, 0); g.closePath(); }, '#33333D', null);
      P(() => polyP(g, [-44 * s, -6 * s, 0, -26 * s, 44 * s, -6 * s, 0, 14 * s]), '#3F3F4A', '#2E2E36', () => polyP(g, [0, -26 * s, 44 * s, -6 * s, 0, 14 * s]));
      line(g, 0, -6 * s, 30 * s, 6 * s, lw, '#F4BF54'); line(g, 30 * s, 6 * s, 30 * s, 26 * s, lw * 1.2, '#F4BF54');
    } else if (kind === 'office') {
      P(() => rrP(g, -14 * s, -30 * s, 28 * s, 14 * s, 4 * s), null, null);
      P(() => rrP(g, -38 * s, -18 * s, 76 * s, 52 * s, 8 * s), '#9C6A48', '#86593C', () => rectP(g, -38 * s, 10 * s, 76 * s, 24 * s));
      line(g, -38 * s, 4 * s, 38 * s, 4 * s, lw); P(() => rrP(g, -7 * s, -2 * s, 14 * s, 12 * s, 3 * s), '#F4BF54', null);
    } else if (kind === 'rice') {
      g.beginPath(); g.moveTo(-34 * s, -8 * s); g.bezierCurveTo(-30 * s, -36 * s, 30 * s, -36 * s, 34 * s, -8 * s); g.closePath(); paint(g, '#F08A3C', lw);
      P(() => { g.beginPath(); g.moveTo(-36 * s, -8 * s); g.lineTo(36 * s, -8 * s); g.lineTo(32 * s, 28 * s); g.lineTo(-32 * s, 28 * s); g.closePath(); }, '#C9CED3', '#A9B0B8', () => rectP(g, 14 * s, -10 * s, 24 * s, 40 * s));
      for (const sx of [-1, 1]) { ellP(g, sx * 42 * s, 2 * s, 7 * s, 5 * s); paint(g, null, lw); }
    } else if (kind === 'ring') {
      ellP(g, 0, 10 * s, 26 * s, 26 * s); g.lineWidth = 10 * s + lw * 2; g.strokeStyle = INK; g.stroke(); g.lineWidth = 10 * s; g.strokeStyle = '#F4BF54'; g.stroke();
      P(() => polyP(g, [-12 * s, -18 * s, 12 * s, -18 * s, 18 * s, -28 * s, 0, -42 * s, -18 * s, -28 * s]), '#BFE3F2', null);
    } else if (kind === 'heart') {
      g.beginPath(); g.moveTo(0, 30 * s); g.bezierCurveTo(-56 * s, -4 * s, -24 * s, -44 * s, 0, -16 * s); g.bezierCurveTo(24 * s, -44 * s, 56 * s, -4 * s, 0, 30 * s); g.closePath(); paint(g, '#E5534B', lw);
    } else if (kind === 'house') {
      P(() => rectP(g, -28 * s, -6 * s, 56 * s, 40 * s), '#F2A264', '#D9874D', () => rectP(g, 10 * s, -6 * s, 18 * s, 40 * s));
      P(() => polyP(g, [-38 * s, -4 * s, 0, -36 * s, 38 * s, -4 * s]), '#B9473F', null);
      P(() => rectP(g, -8 * s, 12 * s, 16 * s, 22 * s), '#8A5236', null);
    } else if (kind === 'baby') {
      P(() => { g.beginPath(); g.ellipse(4 * s, 12 * s, 30 * s, 20 * s, 0, 0, TAU); }, '#3A8594', '#2F7280', () => rectP(g, 10 * s, 0, 30 * s, 40 * s));
      ellP(g, -18 * s, -8 * s, 18 * s, 18 * s); paint(g, '#FCEBCB', lw);
    } else if (kind === 'money') {
      P(() => rrP(g, -38 * s, -22 * s, 76 * s, 44 * s, 6 * s), '#77CC81', '#62B26C', () => rectP(g, -38 * s, 6 * s, 76 * s, 16 * s));
      ellP(g, 0, 0, 12 * s, 12 * s); paint(g, '#FFFFFF', lw);
    }
    g.restore();
  }
  SETS.icon = (g, kind, x, y, r) => { refresh(); g.save(); milestoneIcon(g, kind, x, y, r || 50); g.restore(); };

  // ---------------------------------------------------------------- LIFE PATH (Q02 "walk through your entire life", Q04 the queue)
  // SETS.lifePath(g, o): o.milestones (icon kinds, default ['cot', 'bag', 'cap', 'office', 'rice']), o.progress 0..1 (the road draws
  // itself to there; a milestone pops as the road reaches it; default 1), o.t.
  // The result adds at(u) -> {x, y, s, a} (screen space): the road centre at u (0 = the near end, 1 = the far end), the suggested figure
  // scale there and the road's direction (radians). Anchors: start, end, m0..mN (on the road at each milestone), sign0..signN.
  // The path lies on the ground plane: world (X, Z), Z = depth, projected by proj(); its edges are offset in world space so the bends
  // stay clean in perspective. u runs by screen length (so milestones spread over the frame); a figure at depth Z has scale 0.85 / Z.
  const LP = (() => {
    const HZ = 292, F = 600, HW = 0.25;   // horizon, px per world unit at Z = 1, half the path's width
    const proj = (X, Z) => [960 + X * F / Z, HZ + 700 / Z];
    const pts = [[-1.6, 0.86], [-0.2, 1.02], [0.9, 1.12], [1.3, 1.38], [0.9, 1.66], [-0.6, 1.8], [-1.9, 2.05], [-2.2, 2.55], [-1.4, 2.95], [1.0, 3.2], [2.6, 3.7], [2.6, 4.6], [1.4, 5.6], [0.6, 7.0]];
    const N = 420, Wd = [];
    const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
    for (let i = 0; i <= N; i++) {
      const f = i / N * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f)), t = f - k, q = (j) => pts[Math.max(0, Math.min(pts.length - 1, j))];
      Wd.push([0, 1].map(c => cr(q(k - 1)[c], q(k)[c], q(k + 1)[c], q(k + 2)[c], t)));
    }
    const S = [], L = [], R = [], Lg = [], Rg = [];
    for (let i = 0; i <= N; i++) {
      const a = Wd[Math.max(0, i - 1)], b = Wd[Math.min(N, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], d = Math.hypot(dx, dz) || 1, nx = -dz / d, nz = dx / d, [X, Z] = Wd[i];
      const c = proj(X, Z); S.push([c[0], c[1], 2 * HW * F / Z]);
      L.push(proj(X + nx * HW, Z + nz * HW)); R.push(proj(X - nx * HW, Z - nz * HW));
      Lg.push(proj(X + nx * HW * 1.16, Z + nz * HW * 1.16)); Rg.push(proj(X - nx * HW * 1.16, Z - nz * HW * 1.16));
    }
    // u by screen length, starting where the path enters the frame
    const U = [0]; for (let i = 1; i <= N; i++) U.push(U[i - 1] + (S[i][1] > H + 40 || S[i][0] < -40 ? 0 : Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1])));
    const tot = U[N]; for (let i = 0; i <= N; i++) U[i] /= tot;
    const at = (u) => { u = clamp(u); let i = 0; while (i < N - 1 && U[i + 1] < u) i++; const t = (u - U[i]) / ((U[i + 1] - U[i]) || 1); const p = S[i], q = S[i + 1], wp = Wd[i], wq = Wd[i + 1];
      const X = wp[0] + (wq[0] - wp[0]) * t, Z = wp[1] + (wq[1] - wp[1]) * t, c = proj(X, Z);
      return { x: c[0], y: c[1], w: 2 * HW * F / Z, Z, X, a: Math.atan2(q[1] - p[1], q[0] - p[0]), dX: wq[0] - wp[0], dZ: wq[1] - wp[1], i }; };
    // the bends (screen x turns back), where a sign can stand on the open outside of the curve
    const bends = []; for (let i = 2; i < N - 1; i++) { const d0 = S[i][0] - S[i - 1][0], d1 = S[i + 1][0] - S[i][0]; if (d0 * d1 < 0 && U[i] > 0.02 && U[i] < 0.97) bends.push({ u: U[i], dir: d0 > 0 ? 1 : -1 }); }
    return { S, U, L, R, Lg, Rg, N, at, proj, Wd, HW, bends };
  })();
  function lifeBg(g) {
    const gr = g.createLinearGradient(0, 0, 0, 330); gr.addColorStop(0, '#FCE3B8'); gr.addColorStop(1, '#FDF1D2'); g.fillStyle = gr; g.fillRect(0, 0, W, 340);
    softFill(g, 30, 'rgba(255,240,190,0.9)', () => ellP(g, 1500, 240, 120, 90));
    ellP(g, 1500, 236, 56, 56); paint(g, '#FFE08A', 0);
    for (const [cx, cy, s] of [[380, 110, 1.2], [1160, 80, 0.9], [1780, 140, 0.8]]) { g.beginPath(); g.moveTo(cx - 70 * s, cy); g.arc(cx - 40 * s, cy - 8 * s, 26 * s, Math.PI, TAU * 0.9); g.arc(cx + 4 * s, cy - 22 * s, 34 * s, Math.PI * 1.05, TAU * 0.98); g.arc(cx + 46 * s, cy - 6 * s, 22 * s, Math.PI * 1.25, TAU); g.lineTo(cx + 70 * s, cy); g.closePath(); g.fillStyle = '#FFF8E6'; g.fill(); }
    const hill = (base, amp, col, sh, seed) => { const r = rng(seed); g.beginPath(); g.moveTo(-10, H); g.lineTo(-10, base); for (let x = 0; x <= W + 200; x += 240) g.quadraticCurveTo(x + 120, base - amp * (0.6 + r() * 0.6), x + 240, base - amp * 0.2 * r()); g.lineTo(W + 10, H); g.closePath(); g.fillStyle = col; g.fill(); g.lineWidth = LW.small; g.strokeStyle = INK; g.stroke(); if (sh) { g.save(); g.clip(); g.translate(0, amp * 0.5); g.fillStyle = sh; g.fill(); g.restore(); } };
    hill(320, 60, '#C9D6A6', '#BCCB97', 4); hill(380, 70, '#B5CB8A', '#A9C07E', 9); hill(470, 80, '#A3C27A', null, 13);
    rectP(g, 0, 520, W, H - 520); g.fillStyle = '#A3C27A'; g.fill();
    // little trees and bushes along the way (scaled by depth)
    const r = rng(41);
    for (let i = 0; i < 26; i++) {
      const y = 360 + Math.pow(r(), 1.4) * 680, s = 0.25 + (y - 360) / 680 * 1.1, x = r() * W;
      let onRoad = false; for (let k = 0; k <= LP.N; k += 6) { const p = LP.S[k]; if (Math.abs(p[1] - y) < 60 && Math.abs(p[0] - x) < p[2] * 0.75 + 60 * s) onRoad = true; } if (onRoad) continue;
      if (r() < 0.5) { shape(g, () => rectP(g, x - 6 * s, y - 50 * s, 12 * s, 50 * s), '#9D6B3B', LW.detail); ellP(g, x, y - 80 * s, 46 * s, 50 * s); paint(g, '#7FA24E', LW.detail); g.save(); ellP(g, x, y - 80 * s, 46 * s, 50 * s); g.clip(); ellP(g, x + 24 * s, y - 60 * s, 40 * s, 40 * s); g.fillStyle = '#6C8E42'; g.fill(); g.restore(); ellP(g, x, y - 80 * s, 46 * s, 50 * s); paint(g, null, LW.detail); }
      else { for (const [dx, rr] of [[-22, 20], [0, 28], [22, 20]]) { ellP(g, x + dx * s, y - rr * s, rr * s, rr * s); paint(g, '#8DB45A', LW.detail); } }
    }
  }
  function lifeRoad(g) {
    const { L, R, Lg, Rg, S, U, N } = LP;
    const poly = (k0, k1, A, B) => { g.beginPath(); for (let i = k0; i <= k1; i++) i === k0 ? g.moveTo(A[i][0], A[i][1]) : g.lineTo(A[i][0], A[i][1]); for (let i = k1; i >= k0; i--) g.lineTo(B[i][0], B[i][1]); g.closePath(); };
    const segs = 28, M = []; for (let i = 0; i <= N; i++) M.push([(S[i][0] * 0.4 + R[i][0] * 0.6), (S[i][1] * 0.4 + R[i][1] * 0.6)]);
    for (let sgi = segs - 1; sgi >= 0; sgi--) {
      const k0 = Math.floor(N * sgi / segs), k1 = Math.min(N, Math.floor(N * (sgi + 1) / segs) + 1);
      poly(k0, k1, Lg, Rg); paint(g, '#E2B878', 0);
      poly(k0, k1, L, R); paint(g, '#F7DCA6', 0);
      // one flat shadow shape: the right-hand half of the path
      poly(k0, k1, M, R); paint(g, '#EFCD92', 0);
      g.lineWidth = LW.small; g.strokeStyle = INK;
      for (const E of [Lg, Rg]) { g.beginPath(); for (let i = k0; i <= k1; i++) i === k0 ? g.moveTo(E[i][0], E[i][1]) : g.lineTo(E[i][0], E[i][1]); g.stroke(); }
      for (let i = k0; i < k1; i++) if (Math.floor(i / 7) % 2 === 0) line(g, S[i][0], S[i][1], S[i + 1][0], S[i + 1][1], Math.max(1.5, S[i][2] * 0.035), '#FFFFFF');
    }
  }
  function lifeSign(g, x, y, s, kind, k) {
    if (k <= 0) return;
    const e = easeOutBack(k), r = 54 * s, post = 150 * s;
    g.save(); g.translate(x, y); g.scale(0.4 + 0.6 * e, 0.4 + 0.6 * e); g.globalAlpha *= clamp(k * 3);
    ellP(g, 0, 0, 34 * s, 9 * s); g.fillStyle = 'rgba(70,90,40,0.35)'; g.fill();
    shape(g, () => rectP(g, -6 * s, -post, 12 * s, post), '#9C6A48', LW.small, '#86593C', () => rectP(g, 1 * s, -post, 5 * s, post));
    ellP(g, 0, -post - r + 6 * s, r + 7 * s, r + 7 * s); paint(g, '#F4BF54', LW.small);
    ellP(g, 0, -post - r + 6 * s, r, r); paint(g, '#FFF8EC', LW.detail);
    milestoneIcon(g, kind, 0, -post - r + 6 * s, r * 0.82);
    g.restore();
  }
  function lifeLayout(o) {
    const ms = o.milestones || ['cot', 'bag', 'cap', 'office', 'rice'], n = ms.length;
    // slots: each bend (the sign on the open outside of the curve) and the far end; extra milestones go between slots
    let slots = LP.bends.concat([{ u: 0.985, dir: 0 }]);
    while (slots.length < n) { let bi = 0, bg = 0; for (let i = 0; i < slots.length - 1; i++) if (slots[i + 1].u - slots[i].u > bg) { bg = slots[i + 1].u - slots[i].u; bi = i; } slots.splice(bi + 1, 0, { u: (slots[bi].u + slots[bi + 1].u) / 2, dir: 0 }); }
    const pick = n === slots.length ? slots : Array.from({ length: n }, (_, i) => slots[Math.round(i * (slots.length - 1) / Math.max(1, n - 1))]);
    return ms.map((kind, i) => { const sl = pick[i], p = LP.at(sl.u), sc = Math.max(0.62, Math.min(0.95, 0.9 / p.Z)), off = p.w * 0.5 * 1.25 + 40 * sc;
      let sx = p.x, sy = p.y;
      if (sl.dir) { sx += sl.dir * off; sy += 6; } else { const nx = -Math.sin(p.a), ny = Math.cos(p.a), f = ny > 0 ? -1 : 1; sx += nx * off * f; sy += ny * off * f; }
      return { kind, u: sl.u, p, sx, sy, s: sc }; });
  }
  SETS.lifePath = function (g, o) {
    o = o || {}; const xf = camXf(o.cam), prog = o.progress == null ? 1 : clamp(o.progress);
    blit(g, xf, layer('lifePath|bg', devRes(g, xf), (lg) => lifeBg(lg)));
    const road = layer('lifePath|road', devRes(g, xf), (lg) => lifeRoad(lg));
    const M = lifeLayout(o);
    live(g, xf, (g2) => {
      if (prog >= 0.999) blit(g2, { z: 1, ox: 0, oy: 0 }, road);
      else if (prog > 0) {
        const { S, U, N } = LP; let k1 = 0; while (k1 < N && U[k1] < prog) k1++;
        g2.save(); g2.beginPath();
        // reveal mask: a fat stroke along the centreline up to the progress point
        for (let i = 0; i < k1; i++) { g2.moveTo(S[i][0] + S[i][2] * 0.75, S[i][1]); g2.arc(S[i][0], S[i][1], S[i][2] * 0.75, 0, TAU); }
        g2.clip(); blit(g2, { z: 1, ox: 0, oy: 0 }, road); g2.restore();
      }
      // far milestones first
      M.slice().sort((a, b) => a.sy - b.sy).forEach(m => lifeSign(g2, m.sx, m.sy, m.s, m.kind, clamp((prog - m.u + 0.02) / 0.08)));
    });
    const pa = (u) => { const p = LP.at(u); return { x: p.x, y: p.y, s: 0.85 / p.Z }; };
    const A = { start: pa(0.04), end: pa(0.98) };
    M.forEach((m, i) => { A['m' + i] = pa(m.u); A['sign' + i] = { x: m.sx, y: m.sy - (150 + 54) * m.s, s: m.s }; });
    return result(xf, A, A.start.y, 520, { at: (u) => { const p = LP.at(u); return { x: p.x * xf.z + xf.ox, y: p.y * xf.z + xf.oy, s: 0.85 / p.Z * xf.z, a: p.a }; }, milestones: M.map(m => ({ kind: m.kind, u: m.u })) });
  };

  // ---------------------------------------------------------------- LAB (Q02 "experiment / scientists")
  // SETS.lab(g, o): o.t (bubbles). Anchors: scientistL, scientistR, subject (centre), bench (worktop centre), board, beaker, left, center, right.
  const LB = { FY: 820, wall: '#E3F0E8', wallSh: '#CBE0D4', tile: '#F7FBF8', tileLine: '#D3E3DA', floor: '#DCCFBF', floorAlt: '#D4C6B5', floorLine: '#BDAE9C', floorSh: '#A99A88', cab: '#B6CEE6', cabSh: '#9DB8D4', top: '#4A4E58', topSh: '#3C4049' };
  function flask(g, x, by, w, h, liq, kind) {
    const neck = w * 0.26;
    const R = w / 2, cy = by - R, dl = Math.asin(Math.min(0.95, neck / w));
    const path = kind === 'round' ? () => { g.beginPath(); g.moveTo(x - neck / 2, by - h); g.lineTo(x - neck / 2, cy - R * Math.cos(dl)); g.arc(x, cy, R, -Math.PI / 2 - dl, -Math.PI / 2 + dl, true); g.lineTo(x + neck / 2, by - h); g.closePath(); }
      : kind === 'beaker' ? () => { g.beginPath(); g.moveTo(x - w / 2, by - h); g.lineTo(x - w / 2, by - 6); g.quadraticCurveTo(x - w / 2, by, x - w / 2 + 6, by); g.lineTo(x + w / 2 - 6, by); g.quadraticCurveTo(x + w / 2, by, x + w / 2, by - 6); g.lineTo(x + w / 2, by - h); g.closePath(); }
      : () => { g.beginPath(); g.moveTo(x - neck / 2, by - h); g.lineTo(x - neck / 2, by - h * 0.6); g.lineTo(x - w / 2, by - 8); g.quadraticCurveTo(x - w / 2, by, x - w / 2 + 8, by); g.lineTo(x + w / 2 - 8, by); g.quadraticCurveTo(x + w / 2, by, x + w / 2, by - 8); g.lineTo(x + neck / 2, by - h * 0.6); g.lineTo(x + neck / 2, by - h); g.closePath(); };
    path(); paint(g, 'rgba(236,246,248,0.85)', 0);
    clipDo(g, path, () => { rectP(g, x - w, by - h * 0.42, w * 2, h); paint(g, liq, 0); rectP(g, x - w, by - h * 0.42, w * 2, 6); paint(g, 'rgba(255,255,255,0.45)', 0); polyP(g, [x + w * 0.1, by - h, x + w * 0.24, by - h, x + w * 0.06, by, x - w * 0.08, by]); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill(); });
    path(); paint(g, null, LW.small);
  }
  function labStatic(g, o) {
    const P = LB, FY = P.FY;
    tileFloor(g, FY, { col: P.floor, alt: P.floorAlt, line: P.floorLine, vpx: 960, vpy: 280, step: 200, h0: 36 });
    rectP(g, 0, 0, W, FY); paint(g, P.wall, 0);
    rectP(g, 0, 440, W, 166); paint(g, P.tile, 0);
    g.strokeStyle = P.tileLine; g.lineWidth = 2.5; g.beginPath(); for (let y = 440; y <= 606; y += 42) { g.moveTo(0, y); g.lineTo(W, y); } for (let x = 0; x <= W; x += 56) { g.moveTo(x, 440); g.lineTo(x, 606); } g.stroke();
    line(g, 0, 440, W, 440, LW.detail);
    // shelves with bottles and jars (blank labels)
    for (const sy of [210, 330]) { shape(g, () => rectP(g, 110, sy, 820, 18), '#F4F1EA', LW.small, '#DCD6CA', () => rectP(g, 110, sy + 10, 820, 8)); }
    const r = rng(11);
    for (const sy of [210, 330]) { let x = 130; while (x < 900) { const w = 40 + r() * 30, h = 50 + r() * 50, c = ['#9C5A3C', '#7BAFE1', '#F4F1EA', '#77CC81', '#E98A3C', '#B07BD0'][Math.floor(r() * 6)]; shape(g, () => rrP(g, x, sy - h, w, h, 6), c, LW.detail, dark(c, 0.86), () => rectP(g, x + w * 0.7, sy - h, w * 0.3, h)); rrP(g, x + 6, sy - h * 0.62, w - 12, h * 0.3, 3); paint(g, '#FFFFFF', 1.4); shape(g, () => rrP(g, x + w * 0.2, sy - h - 10, w * 0.6, 12, 3), '#4A4E58', LW.detail); x += w + 14; } }
    // whiteboard with diagrams (no text)
    shape(g, () => rectP(g, 1130, 130, 660, 300), '#FFFFFF', LW.big, '#EEF2F4', () => polyP(g, [1130, 400, 1790, 400, 1790, 430, 1130, 430]));
    rectP(g, 1130, 130, 660, 300); paint(g, null, LW.big);
    shape(g, () => rectP(g, 1110, 430, 700, 14), '#C9CED3', LW.small);
    g.lineWidth = 4; g.strokeStyle = '#3E7FB8';
    const mol = [[1230, 230], [1300, 190], [1370, 230], [1370, 310], [1300, 350], [1230, 310]];
    g.beginPath(); mol.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(1370, 230); g.lineTo(1430, 196); g.moveTo(1230, 310); g.lineTo(1180, 340); g.stroke();
    for (const [mx, my, c] of [[1430, 196, '#E5534B'], [1180, 340, '#E5534B'], [1300, 190, '#3E7FB8']]) { ellP(g, mx, my, 14, 14); paint(g, c, 2.5); }
    g.strokeStyle = '#2E3038'; g.beginPath(); g.moveTo(1500, 180); g.lineTo(1500, 380); g.lineTo(1740, 380); g.stroke();
    g.strokeStyle = '#E5534B'; g.beginPath(); g.moveTo(1510, 360); g.bezierCurveTo(1580, 350, 1600, 220, 1720, 200); g.stroke();
    g.strokeStyle = '#77CC81'; g.beginPath(); g.moveTo(1510, 370); g.lineTo(1720, 300); g.stroke();
    wallBand(g, P.wall, P.wallSh, [0, 0, W, 440], [-20, 120, 600, 30, 1300, 30, W + 20, 120]);
    softFill(g, 40, 'rgba(255,240,206,0.35)', () => ellP(g, 960, 300, 700, 260), 'screen');
    line(g, 0, FY, W, FY, LW.arch);
    // the bench: cabinets, a dark worktop, glassware, a microscope, a rack of test tubes
    floorShadow(g, 960, 830, 960, 12, P.floorSh, 5);
    shape(g, () => rectP(g, 40, 622, 1840, 196), P.cab, LW.big, P.cabSh, () => rectP(g, 40, 622, 1840, 20));
    for (let x = 60; x < 1860; x += 230) { shape(g, () => rectP(g, x, 652, 210, 150), P.cab, LW.small, P.cabSh, () => rectP(g, x, 652, 210, 10)); shape(g, () => rrP(g, x + 70, 664, 70, 12, 6), '#F4F7F8', LW.detail); }
    shape(g, () => rrP(g, 24, 600, 1872, 26, 5), P.top, LW.big, P.topSh, () => rectP(g, 24, 614, 1872, 12));
    // microscope
    shape(g, () => rrP(g, 240, 584, 130, 18, 6), '#F4F7F8', LW.small, '#DCE3E8', () => rectP(g, 240, 594, 130, 8));
    g.beginPath(); g.moveTo(336, 588); g.quadraticCurveTo(370, 520, 330, 450); g.lineWidth = 26 + LW.small * 2; g.strokeStyle = INK; g.stroke(); g.lineWidth = 26; g.strokeStyle = '#F4F7F8'; g.stroke();
    shape(g, () => rectP(g, 250, 530, 90, 12), '#C9CED3', LW.detail);
    g.save(); g.translate(300, 470); g.rotate(-0.5); shape(g, () => rrP(g, -16, -70, 32, 110, 10), '#3A8594', LW.small, '#2F7280', () => rectP(g, 4, -80, 16, 130)); shape(g, () => rrP(g, -12, -92, 24, 24, 5), '#2E3038', LW.detail); g.restore();
    // rack of test tubes
    shape(g, () => rectP(g, 470, 560, 200, 16), '#F4F1EA', LW.small); shape(g, () => rectP(g, 470, 590, 200, 10), '#F4F1EA', LW.small);
    for (const lx of [478, 654]) shape(g, () => rectP(g, lx, 560, 8, 40), '#F4F1EA', LW.detail);
    ['#E5534B', '#F4BF54', '#77CC81', '#7BAFE1', '#B07BD0'].forEach((c, i) => { const tx = 500 + i * 34; rrP(g, tx - 10, 500, 20, 96, 10); paint(g, 'rgba(236,246,248,0.9)', 0); clipDo(g, () => rrP(g, tx - 10, 500, 20, 96, 10), () => { rectP(g, tx - 12, 540 + i * 4, 24, 70); paint(g, c, 0); }); rrP(g, tx - 10, 500, 20, 96, 10); paint(g, null, LW.detail); });
    shape(g, () => rectP(g, 470, 560, 200, 16), '#F4F1EA', LW.small);
    flask(g, 790, 600, 120, 160, '#5FB0B5', 'conical');
    flask(g, 920, 600, 90, 120, '#F4BF54', 'conical');
    flask(g, 1060, 600, 110, 130, '#E37F78', 'beaker');
    // a round flask on a ring stand over a little burner
    shape(g, () => rrP(g, 1220, 590, 150, 12, 4), '#5A5E66', LW.small);
    shape(g, () => rectP(g, 1350, 360, 10, 232), '#8A8F96', LW.small);
    line(g, 1355, 470, 1300, 470, 5); ellP(g, 1280, 470, 34, 8); paint(g, null, 3);
    flask(g, 1280, 470, 96, 150, '#77CC81', 'round');
    shape(g, () => rrP(g, 1262, 540, 36, 50, 6), '#3A8594', LW.small);
    shape(g, () => { g.beginPath(); g.moveTo(1280, 540); g.quadraticCurveTo(1262, 516, 1280, 492); g.quadraticCurveTo(1298, 516, 1280, 540); g.closePath(); }, '#7BAFE1', LW.detail);
    // a clipboard hanging and a little plant on the right end
    plant(g, 1700, 600, 0.8, { kind: 'small', pot: X.terracotta, potSh: X.terracottaSh });
    shape(g, () => rrP(g, 1520, 500, 80, 100, 6), '#876245', LW.small); shape(g, () => rectP(g, 1530, 512, 60, 80), '#FFFFFF', LW.detail); shape(g, () => rrP(g, 1544, 494, 32, 14, 4), '#A9ADB2', LW.detail);
    for (let i = 0; i < 4; i++) rectP(g, 1538, 530 + i * 14, 40 - (i % 2) * 12, 5), paint(g, '#C9CED3', 0);
  }
  function labAnchors() {
    return { scientistL: { x: 540, y: 985, s: 1 }, scientistR: { x: 1390, y: 985, s: 1 }, subject: { x: 960, y: 985, s: 1 }, bench: { x: 960, y: 600, s: 1 }, board: { x: 1460, y: 280, s: 1 }, beaker: { x: 1060, y: 540, s: 1 },
      left: { x: 360, y: 990, s: 1.02 }, center: { x: 960, y: 990, s: 1.02 }, right: { x: 1560, y: 990, s: 1.02 } };
  }
  SETS.lab = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('lab', devRes(g, xf), (lg) => labStatic(lg, o)));
    live(g, xf, (g2) => {
      const t = o.t || 0, r = rng(5);
      for (let i = 0; i < 7; i++) { const ph = (t * (0.5 + r() * 0.5) + r()) % 1, bx = 1020 + r() * 80, by = 596 - ph * 50; ellP(g2, bx + Math.sin(ph * 9 + i) * 4, by, 4 + r() * 4, 4 + r() * 4); g2.fillStyle = 'rgba(255,255,255,' + (0.85 * Math.sin(ph * Math.PI)).toFixed(2) + ')'; g2.fill(); }
      for (let i = 0; i < 4; i++) { const ph = (t * 0.6 + i / 4) % 1; ellP(g2, 1280 + Math.sin(ph * 7 + i) * 10, 420 - ph * 60, 6 * (1 - ph * 0.5), 6 * (1 - ph * 0.5)); g2.fillStyle = 'rgba(255,255,255,' + (0.8 * Math.sin(ph * Math.PI)).toFixed(2) + ')'; g2.fill(); }
    });
    return result(xf, labAnchors(), 990, LB.FY);
  };
  SETS.labFront = function (g, o) { o = o || {}; return result(camXf(o.cam), labAnchors(), 990, LB.FY); };

  // ---------------------------------------------------------------- COURTROOM (Q03 "if the small one cries, you did it")
  // A living-room corner turned court: Mum's bench (a raised desk with a cloth, a sound block for the wooden spoon, case files), Dad's
  // high-back chair behind it, a little dock for the accused (left), the sofa as the jury box (right). Home palette; o.tod as home.
  // Anchors: judge (standing behind the bench; the bench hides the legs), judgeSeat (sitting in the chair), gavel (the sound block),
  // accused (standing in the dock), juryL, juryR (sofa seats), left, center, right. SETS.courtroomFront: the bench and the dock.
  function courtBench(g, P) {
    shape(g, () => rectP(g, 690, 556, 540, 344), P.wood, LW.big, P.woodSh, () => rectP(g, 1170, 556, 60, 344));
    for (const [px, pw] of [[724, 220], [976, 220]]) { shape(g, () => rectP(g, px, 640, pw, 220), P.woodLt, LW.small, P.woodLtSh, () => rectP(g, px, 640, pw, 14)); rectP(g, px + 20, 664, pw - 40, 172); paint(g, null, LW.detail); }
    shape(g, () => rrP(g, 670, 532, 580, 28, 6), P.woodLt, LW.big, P.woodLtSh, () => rectP(g, 670, 548, 580, 12));
    shape(g, () => { g.beginPath(); g.moveTo(760, 556); g.lineTo(1160, 556); g.lineTo(1160, 610); for (let i = 7; i >= 0; i--) g.arc(760 + (i + 0.5) * 50, 610, 25, 0, Math.PI, false); g.closePath(); }, '#3A8594', LW.small, '#2F7280', () => rectP(g, 760, 556, 400, 14));
    shape(g, () => { g.beginPath(); g.ellipse(960, 640, 34, 34, 0, 0, TAU); }, '#F4BF54', LW.small, '#DCA640', () => rectP(g, 960, 600, 40, 80));
    ellP(g, 960, 640, 18, 18); paint(g, '#FFF4E3', LW.detail);
    // case files, a glass of water, the sound block
    for (let i = 0; i < 4; i++) shape(g, () => rectP(g, 730 + i * 3, 516 - i * 10, 150, 12), ['#F4F1EA', '#F4BF54', '#FFFFFF', '#7BAFE1'][i], LW.detail);
    shape(g, () => { g.beginPath(); g.moveTo(900, 532); g.lineTo(930, 532); g.lineTo(934, 488); g.lineTo(896, 488); g.closePath(); }, 'rgba(220,240,246,0.95)', LW.detail);
    rectP(g, 898, 506, 34, 24); g.fillStyle = 'rgba(123,175,225,0.5)'; g.fill();
    shape(g, () => rrP(g, 1080, 512, 90, 22, 5), '#7A4B32', LW.small, '#66402B', () => rectP(g, 1080, 524, 90, 10));
  }
  function courtDock(g, P) {
    shape(g, () => rectP(g, 230, 760, 330, 160), P.woodLt, LW.big, P.woodLtSh, () => rectP(g, 520, 760, 40, 160));
    for (let x = 262; x < 540; x += 46) shape(g, () => rectP(g, x, 790, 22, 110), P.wood, LW.detail);
    shape(g, () => rrP(g, 214, 740, 362, 26, 8), P.wood, LW.big, P.woodSh, () => rectP(g, 214, 754, 362, 12));
  }
  function courtStatic(g, o, tod) {
    const P = HM, FY = P.FY, T = HOME_TOD[tod];
    tileFloor(g, FY, { col: P.floor, alt: P.floorAlt, line: P.floorLine, vpx: 960, vpy: 280, step: 200, h0: 36 });
    rectP(g, 0, 0, W, FY); paint(g, P.wall, 0);
    rectP(g, -10, FY - 18, W + 20, 18); paint(g, P.woodLt, LW.detail);
    homeWindow(g, 1480, 170, 300, 280, T.sky, P);
    clockFaceRim(g, 960, 130, 60, '#C98A3E', mix(P.wall, P.wallSh, 0.9));
    photo(g, 380, 190, 180, 150, 'family', { frame: '#C98A3E' });
    photo(g, 600, 230, 100, 120, 'grad', { frame: '#9C6A48', bg: '#E7C9A0' });
    wallBand(g, P.wall, P.wallSh, [0, 0, W, FY], [-20, 130, 600, 40, 1300, 40, W + 20, 130]);
    line(g, 0, FY, W, FY, LW.arch);
    shape(g, () => polyP(g, [560, 880, 1360, 880, 1460, H + 10, 460, H + 10]), P.rugBorder, LW.small);
    shape(g, () => polyP(g, [590, 892, 1330, 892, 1418, H + 10, 502, H + 10]), P.rug, LW.detail, P.rugSh, () => polyP(g, [590, 892, 1330, 892, 1336, 906, 586, 906]));
    // Dad's high-back chair behind the bench
    shape(g, () => { g.beginPath(); g.moveTo(820, 620); g.lineTo(820, 380); g.quadraticCurveTo(820, 300, 960, 296); g.quadraticCurveTo(1100, 300, 1100, 380); g.lineTo(1100, 620); g.closePath(); }, P.sofa, LW.big, P.sofaMid, () => rectP(g, 1050, 290, 60, 340));
    for (const bx of [880, 960, 1040]) for (const by of [380, 450]) { ellP(g, bx, by, 6, 6); paint(g, P.sofaSh, LW.detail); }
    doily(g, 960, 318, 140, 40, P.lace);
    homeSofa(g, 1360, 2020, P, 2);
    courtBench(g, P);
    courtDock(g, P);
    if (tod !== 'day') { if (tod === 'night') grade(g, 960, 200, 60, 1500, NIGHT); else grade(g, 960, 200, 80, 1500, EVE); homeWindowGlass(g, 1480, 170, 300, 280, 20, 18, T.sky, tod === 'night' ? '#3B3437' : '#5A504C'); }
  }
  function courtAnchors() {
    return { judge: { x: 960, y: 905, s: 1 }, judgeSeat: { x: 960, y: 640, s: 1 }, gavel: { x: 1125, y: 512, s: 1 }, accused: { x: 395, y: 985, s: 1 },
      juryL: { x: 1570, y: 738, s: 1 }, juryR: { x: 1810, y: 738, s: 1 }, left: { x: 330, y: 990, s: 1.02 }, center: { x: 960, y: 990, s: 1.02 }, right: { x: 1560, y: 990, s: 1.02 } };
  }
  SETS.courtroom = function (g, o) {
    o = o || {}; const tod = HOME_TOD[o.tod] ? o.tod : 'day', xf = camXf(o.cam);
    blit(g, xf, layer('courtroom|' + tod, devRes(g, xf), (lg) => courtStatic(lg, o, tod)));
    live(g, xf, (g2) => clockHands(g2, 960, 130, 60, o.clock != null ? o.clock : 18.6));
    return result(xf, courtAnchors(), 990, HM.FY, { tint: HOME_TOD[tod].tint });
  };
  SETS.courtroomFront = function (g, o) {
    o = o || {}; const tod = HOME_TOD[o.tod] ? o.tod : 'day', xf = camXf(o.cam);
    const parts = o.parts || ['bench', 'dock'];
    blit(g, xf, layer('courtroomFront|' + tod + '|' + parts.join(','), devRes(g, xf), (lg) => {
      if (parts.includes('bench')) courtBench(lg, HM); if (parts.includes('dock')) courtDock(lg, HM);
      if (tod !== 'day') maskedPass(lg, (g2) => { if (tod === 'night') grade(g2, 960, 200, 60, 1500, NIGHT); else grade(g2, 960, 200, 80, 1500, EVE); });
    }), null, { x: 200, y: 480, w: 1060, h: 450 });
    return result(xf, courtAnchors(), 990, HM.FY);
  };

  // ---------------------------------------------------------------- PODIUM (Q06 "you are the United Nations")
  // A lectern on a carpeted stage with plain coloured flags (no real flags), a medallion of plain rings. o.t waves the flags.
  // Anchors: speaker (standing behind the lectern; legs hidden), lectern (its top), mic, left, right (the two sides), center.
  // SETS.podiumFront: the lectern.
  const PD = { FY: 800, wall: '#C9DDEA', wallSh: '#B3CDDF', carpet: '#4F86A6', carpetSh: '#43748F', wood: '#9C6A48', woodSh: '#86593C', gold: '#F4BF54', goldSh: '#DCA640' };
  const FLAGS = [['#3A8594', 240], ['#F4BF54', 420], ['#E37F78', 600], ['#7BAFE1', 1320], ['#77CC81', 1500], ['#B07BD0', 1680]];
  function lectern(g) {
    const P = PD;
    shape(g, () => polyP(g, [870, 600, 1050, 600, 1080, 910, 840, 910]), P.wood, LW.big, P.woodSh, () => polyP(g, [1010, 600, 1050, 600, 1080, 910, 1036, 910]));
    ellP(g, 960, 720, 46, 46); paint(g, P.gold, LW.small); ellP(g, 960, 720, 30, 30); paint(g, '#FFF4E3', LW.detail); ellP(g, 960, 720, 14, 14); paint(g, P.gold, LW.detail);
    shape(g, () => polyP(g, [826, 560, 1094, 560, 1110, 604, 810, 604]), mix(P.wood, '#FFFFFF', 0.12), LW.big, P.woodSh, () => polyP(g, [810, 594, 1110, 594, 1110, 604, 810, 604]));
    g.beginPath(); g.moveTo(1040, 562); g.quadraticCurveTo(1060, 500, 1010, 470); g.lineWidth = 5 + LW.detail * 2; g.strokeStyle = INK; g.stroke(); g.lineWidth = 5; g.strokeStyle = '#5A5E66'; g.stroke();
    g.save(); g.translate(1006, 466); g.rotate(-0.8); shape(g, () => rrP(g, -12, -22, 24, 40, 12), '#2E3038', LW.detail); g.restore();
    shape(g, () => { g.beginPath(); g.moveTo(860, 560); g.lineTo(886, 560); g.lineTo(890, 526); g.lineTo(856, 526); g.closePath(); }, 'rgba(220,240,246,0.95)', LW.detail);
  }
  function podiumStatic(g) {
    const P = PD, FY = P.FY;
    rectP(g, 0, 0, W, FY); paint(g, P.wall, 0);
    g.strokeStyle = rgba(INK, 0.22); g.lineWidth = 2.5; g.beginPath(); for (let x = 120; x < W; x += 240) { g.moveTo(x, 0); g.lineTo(x, FY); } g.stroke();
    // a medallion of plain rings
    ellP(g, 960, 270, 170, 170); paint(g, P.gold, LW.big); ellP(g, 960, 270, 140, 140); paint(g, '#FFF4E3', LW.small);
    for (const rr of [110, 80]) { ellP(g, 960, 270, rr, rr); g.lineWidth = 4; g.strokeStyle = P.goldSh; g.stroke(); }
    ellP(g, 960, 270, 44, 44); paint(g, PD.gold, LW.small);
    wallBand(g, P.wall, P.wallSh, [0, 0, W, FY], [-20, 140, 600, 40, 1300, 40, W + 20, 140]);
    softFill(g, 60, 'rgba(255,244,214,0.45)', () => ellP(g, 960, 420, 520, 320), 'screen');
    // stage and carpet
    rectP(g, 0, FY, W, H - FY); paint(g, P.carpet, 0);
    softFill(g, 30, 'rgba(255,244,214,0.18)', () => ellP(g, 960, 930, 620, 110), 'screen');
    rectP(g, 0, FY, W, 18); paint(g, P.carpetSh, 0);
    line(g, 0, FY, W, FY, LW.arch);
    for (const [, x] of FLAGS) { floorShadow(g, x, 832, 44, 8, P.carpetSh, 3); shape(g, () => rrP(g, x - 26, 812, 52, 18, 6), P.gold, LW.small); shape(g, () => rectP(g, x - 5, 160, 10, 656), '#C9CED3', LW.small, '#A9B0B8', () => rectP(g, x + 1, 160, 4, 656)); ellP(g, x, 152, 12, 12); paint(g, P.gold, LW.small); }
    floorShadow(g, 960, 915, 170, 14, P.carpetSh, 5);
  }
  function flagCloth(g, x, col, t, i) {
    const w = 150, h = 112, y = 172, ph = t * 2.2 + i * 1.3, wv = (u) => Math.sin(ph + u * 3.2) * 9 * u;
    const path = () => { g.beginPath(); g.moveTo(x + 5, y); for (let k = 1; k <= 6; k++) { const u = k / 6; g.lineTo(x + 5 + w * u, y + wv(u)); } g.lineTo(x + 5 + w, y + h + wv(1)); for (let k = 5; k >= 0; k--) { const u = k / 6; g.lineTo(x + 5 + w * u, y + h + wv(u) + u * 6); } g.closePath(); };
    path(); paint(g, col, 0);
    clipDo(g, path, () => { g.fillStyle = dark(col, 0.88); g.beginPath(); g.moveTo(x, y + h * 0.62); for (let k = 0; k <= 6; k++) { const u = k / 6; g.lineTo(x + 5 + w * u, y + h * 0.62 + wv(u) + Math.sin(ph * 0.7 + u * 4) * 8); } g.lineTo(x + w + 20, y + h + 40); g.lineTo(x, y + h + 40); g.closePath(); g.fill(); });
    path(); paint(g, null, LW.small);
  }
  function podiumAnchors() { return { speaker: { x: 960, y: 905, s: 1 }, lectern: { x: 960, y: 560, s: 1 }, mic: { x: 1006, y: 466, s: 1 }, left: { x: 470, y: 990, s: 1.02 }, right: { x: 1450, y: 990, s: 1.02 }, center: { x: 960, y: 990, s: 1.02 } }; }
  SETS.podium = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('podium', devRes(g, xf), (lg) => podiumStatic(lg)));
    live(g, xf, (g2) => FLAGS.forEach(([c, x], i) => flagCloth(g2, x, c, o.t || 0, i)));
    return result(xf, podiumAnchors(), 990, PD.FY);
  };
  SETS.podiumFront = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('podiumFront', devRes(g, xf), (lg) => lectern(lg)), null, { x: 790, y: 440, w: 340, h: 480 });
    return result(xf, podiumAnchors(), 990, PD.FY);
  };

  // ---------------------------------------------------------------- BANK COUNTER (Q05 "you are now the family bank")
  // SETS.bankCounter(g, o): the teller's counter with a glass screen (right), the queue rope behind the queue (left), a bank clock, a
  // savings poster (coins, no text). Anchors: teller (standing behind the counter; legs hidden), window (the opening in the glass),
  // counter (counter top at the window), q1..q5 (queue places, q1 at the window; queuers face right), left, center, right.
  // SETS.bankCounterFront(g, o): the counter front and the glass screen, then the signs: o.signs = [{text, k}] (up to 3 plaques hung
  // on the glass right of the window, k 0..1 pops each in) and/or o.sign = 'text' (a desk sign on the counter, o.signK). Text is 44 px.
  const BK = { FY: 820, wall: '#F3E4C8', wallSh: '#E3CDA8', band: '#3A8594', floor: '#E9D9BF', floorAlt: '#E1CFB2', floorLine: '#CDB894', floorSh: '#BBA37E', counter: '#3A8594', counterSh: '#2F7280', top: '#F3EEE6', topSh: '#DCD3C6', glass: 'rgba(200,232,240,0.32)' };
  function bankCounterPiece(g) {
    const P = BK;
    shape(g, () => rectP(g, 990, 636, 940, 270), P.counter, LW.big, P.counterSh, () => rectP(g, 990, 636, 940, 24));
    for (let x = 1020; x < 1920; x += 230) { shape(g, () => rectP(g, x, 680, 200, 196), mix(P.counter, '#FFFFFF', 0.1), LW.small, P.counterSh, () => rectP(g, x, 680, 200, 14)); rectP(g, x + 16, 700, 168, 8); paint(g, '#F4BF54', LW.detail); }
    shape(g, () => rrP(g, 970, 606, 970, 34, 6), P.top, LW.big, P.topSh, () => rectP(g, 970, 624, 970, 16));
    // the glass screen with an arched window and a slot
    const gl = () => { g.beginPath(); g.rect(1000, 230, 920, 376); g.moveTo(1180, 606); g.lineTo(1180, 400); g.arc(1300, 400, 120, Math.PI, 0); g.lineTo(1420, 606); g.closePath(); };
    gl(); g.fillStyle = P.glass; g.fill('evenodd');
    clipDo(g, gl, () => { g.fillStyle = 'rgba(255,255,255,0.4)'; for (const [a, w] of [[1060, 30], [1110, 12], [1520, 36], [1580, 14]]) { polyP(g, [a, 230, a + w, 230, a + w - 140, 606, a - 140, 606]); g.fill(); } }, true);
    g.beginPath(); g.moveTo(1000, 606); g.lineTo(1000, 230); g.lineTo(1920, 230); g.moveTo(1180, 606); g.lineTo(1180, 400); g.arc(1300, 400, 120, Math.PI, 0); g.lineTo(1420, 606); g.lineWidth = LW.small; g.strokeStyle = INK; g.stroke();
    for (const x of [1000, 1640]) shape(g, () => rectP(g, x - 8, 222, 16, 386), '#C9CED3', LW.small);
    shape(g, () => rectP(g, 990, 214, 940, 18), '#C9CED3', LW.small);
    shape(g, () => rrP(g, 1230, 590, 140, 16, 6), '#9AA3AA', LW.detail);
  }
  function bankStatic(g) {
    const P = BK, FY = P.FY;
    tileFloor(g, FY, { col: P.floor, alt: P.floorAlt, line: P.floorLine, vpx: 960, vpy: 280, step: 200, h0: 36 });
    rectP(g, 0, 0, W, FY); paint(g, P.wall, 0);
    shape(g, () => rectP(g, -10, 580, W + 20, 40), P.band, LW.small, dark(P.band, 0.88), () => rectP(g, -10, 606, W + 20, 14));
    rectP(g, -10, FY - 18, W + 20, 18); paint(g, '#D9C29C', LW.detail);
    clockFaceRim(g, 1460, 130, 56, '#A3ADB8', mix(P.wall, P.wallSh, 0.9));
    // savings poster: a stack of coins and a plant, no text
    shape(g, () => rectP(g, 280, 150, 260, 320), '#FFFDF6', LW.small, '#EFE6D6', () => rectP(g, 510, 150, 30, 320));
    clipDo(g, () => rectP(g, 298, 168, 224, 284), () => { g.fillStyle = '#BFE3E0'; g.fillRect(298, 168, 224, 284); ellP(g, 410, 470, 170, 80); g.fillStyle = '#9DCFC6'; g.fill(); });
    for (let i = 0; i < 6; i++) shape(g, () => { g.beginPath(); g.ellipse(380, 400 - i * 22, 52, 14, 0, 0, TAU); }, '#F4BF54', LW.detail, '#DCA640', () => rectP(g, 380, 400 - i * 22, 60, 20));
    leaf(g, 450, 400, -1.4, 80, 14, '#87A26A', '#6F8C57', 2); leaf(g, 450, 360, -0.6, 60, 12, '#87A26A', '#6F8C57', 2);
    rectP(g, 298, 168, 224, 284); paint(g, null, LW.detail);
    wallBand(g, P.wall, P.wallSh, [0, 0, W, 580], [-20, 120, 600, 30, 1300, 30, W + 20, 120]);
    softFill(g, 30, 'rgba(255,248,226,0.3)', () => ellP(g, 700, 420, 520, 260), 'screen');
    line(g, 0, FY, W, FY, LW.arch);
    plant(g, 880, 876, 0.85, { pot: '#B6D0EA', potSh: '#9DB8D4' }); floorShadow(g, 880, 880, 80, 10, P.floorSh, 4);
    // queue rope on its posts (behind the queue)
    const posts = [110, 370, 630];
    posts.forEach(x => { floorShadow(g, x, 884, 40, 8, P.floorSh, 3); shape(g, () => { g.beginPath(); g.ellipse(x, 876, 36, 10, 0, 0, TAU); }, '#C9CED3', LW.small); shape(g, () => rectP(g, x - 6, 520, 12, 356), '#D8DDE2', LW.small, '#B9C0C8', () => rectP(g, x + 1, 520, 5, 356)); ellP(g, x, 516, 12, 12); paint(g, '#D8DDE2', LW.small); });
    for (let i = 0; i < posts.length - 1; i++) { const a = posts[i], b = posts[i + 1]; g.beginPath(); g.moveTo(a, 530); g.quadraticCurveTo((a + b) / 2, 600, b, 530); g.lineWidth = 12 + LW.small * 2; g.strokeStyle = INK; g.stroke(); g.lineWidth = 12; g.strokeStyle = '#B9473F'; g.stroke(); }
    bankCounterPiece(g);
  }
  function bankAnchors() {
    return { teller: { x: 1300, y: 905, s: 1 }, window: { x: 1300, y: 470, s: 1 }, counter: { x: 1300, y: 606, s: 1 },
      q1: { x: 1060, y: 985, s: 1 }, q2: { x: 820, y: 985, s: 1 }, q3: { x: 590, y: 985, s: 1 }, q4: { x: 360, y: 985, s: 1 }, q5: { x: 130, y: 985, s: 1 },
      sign0: { x: 1680, y: 300, s: 1 }, sign1: { x: 1680, y: 400, s: 1 }, sign2: { x: 1680, y: 500, s: 1 }, signDesk: { x: 1560, y: 606, s: 1 },
      left: { x: 360, y: 990, s: 1.02 }, center: { x: 900, y: 990, s: 1.02 }, right: { x: 1560, y: 990, s: 1.02 } };
  }
  // a desk sign on a little stand (standing on y), or a plaque hung on the glass (centred on y)
  function signHolder(g, x, y, text, k, hung) {
    if (!(k > 0)) return;
    const e = easeOutBack(k);
    g.save(); g.translate(x, y); g.scale(e, e); g.globalAlpha *= clamp(k * 3);
    g.font = font(900, 44); const tw = g.measureText(text).width, w = tw + 48, h = 74, top = hung ? -h / 2 : -h - 14;
    if (hung) { line(g, -w * 0.3, top, 0, top - 30, 2.5); line(g, w * 0.3, top, 0, top - 30, 2.5); ellP(g, 0, top - 32, 5, 5); paint(g, '#C9CED3', 1.6); }
    else shape(g, () => polyP(g, [-30, 0, 30, 0, 18, -16, -18, -16]), '#C9CED3', LW.detail);
    rrP(g, -w / 2 + 6, top + 8, w, h, 12); g.fillStyle = 'rgba(70,32,16,0.2)'; g.fill();
    shape(g, () => rrP(g, -w / 2, top, w, h, 12), '#FFFDF6', LW.small, '#EFE6D6', () => rectP(g, -w / 2, top + h - 12, w, 12));
    g.fillStyle = '#1c1c1c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, top + h / 2 - 2);
    g.restore();
  }
  SETS.bankCounter = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('bankCounter', devRes(g, xf), (lg) => bankStatic(lg)));
    live(g, xf, (g2) => clockHands(g2, 1460, 130, 56, o.clock != null ? o.clock : 9.1));
    return result(xf, bankAnchors(), 990, BK.FY);
  };
  SETS.bankCounterFront = function (g, o) {
    o = o || {}; const xf = camXf(o.cam);
    blit(g, xf, layer('bankCounterFront', devRes(g, xf), (lg) => bankCounterPiece(lg)), null, { x: 960, y: 200, w: 960, h: 720 });
    const A = bankAnchors(), at = [A.sign0, A.sign1, A.sign2];
    live(g, xf, (g2) => {
      if (o.sign) signHolder(g2, A.signDesk.x, A.signDesk.y, String(o.sign), o.signK == null ? 1 : o.signK, false);
      (o.signs || []).slice(0, 3).forEach((s, i) => signHolder(g2, at[i].x, at[i].y, String(s.text || ''), s.k == null ? 1 : s.k, true));
    });
    return result(xf, A, 990, BK.FY);
  };

  // ---------------------------------------------------------------- DOORS (Q04 "Doctor, lawyer, engineer ... the fourth one is also doctor")
  // SETS.doorTrio(g, o): o.labels (default ['Doctor', 'Lawyer', 'Engineer']; four for the gag), o.n (doors shown: a float, each pops in
  // as n passes its index; default all), o.open {i, k} (door i swings open to light), o.glow (index lit), o.bg (false: doors only, on
  // whatever is under them), o.t. A door's colour and icon follow its label, so a second 'Doctor' matches the first. Plate text >= 44 px.
  // Anchors: door0..door3 (standing in front of each door), center.
  const DOOR_COLS = ['#3A8594', '#E37F78', '#7BAFE1', '#77CC81', '#B07BD0', '#F2A264'];
  function doorGeom(n) { const dw = n >= 4 ? 300 : 340, gap = n >= 4 ? 120 : 190, tot = n * dw + (n - 1) * gap, x0 = 960 - tot / 2; return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (dw + gap), w: dw, top: 270, bot: 850 })); }
  function doorIcon(g, label, x, y, r) {
    const l = String(label).toLowerCase();
    g.save(); g.translate(x, y);
    ellP(g, 0, 0, r, r); paint(g, '#FFF8EC', LW.small);
    if (/doc|nurse|med/.test(l)) { rectP(g, -r * 0.18, -r * 0.6, r * 0.36, r * 1.2); paint(g, '#E5534B', LW.detail); rectP(g, -r * 0.6, -r * 0.18, r * 1.2, r * 0.36); paint(g, '#E5534B', 0); line(g, -r * 0.18, -r * 0.18, -r * 0.6, -r * 0.18, LW.detail); }
    else if (/law/.test(l)) { line(g, 0, -r * 0.62, 0, r * 0.5, 4); line(g, -r * 0.6, -r * 0.4, r * 0.6, -r * 0.4, 4); for (const sx of [-1, 1]) { line(g, sx * r * 0.6, -r * 0.4, sx * r * 0.42, r * 0.06, 2); line(g, sx * r * 0.6, -r * 0.4, sx * r * 0.78, r * 0.06, 2); g.beginPath(); g.arc(sx * r * 0.6, r * 0.06, r * 0.2, 0, Math.PI); g.closePath(); paint(g, '#F4BF54', 2); } line(g, -r * 0.3, r * 0.52, r * 0.3, r * 0.52, 4); }
    else if (/eng/.test(l)) { g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, rr = i % 2 ? r * 0.5 : r * 0.68; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); paint(g, '#9AA3AA', LW.detail); ellP(g, 0, 0, r * 0.2, r * 0.2); paint(g, '#FFF8EC', LW.detail); }
    g.restore();
  }
  function oneDoor(g, d, label, col, k, openK, glow, t) {
    if (k <= 0) return;
    const e = easeOutBack(k), cx = d.x + d.w / 2;
    g.save(); g.translate(cx, d.bot); g.scale(0.5 + 0.5 * e, 0.5 + 0.5 * e); g.translate(-cx, -d.bot); g.globalAlpha *= clamp(k * 3);
    if (glow) softEll(g, cx, (d.top + d.bot) / 2 - 40, d.w * 0.95, (d.bot - d.top) * 0.75, 'rgba(255,226,120,' + (0.8 * glow).toFixed(2) + ')');
    softEll(g, cx, d.bot + 6, d.w * 0.66, 18, 'rgba(110,50,20,0.3)');
    shape(g, () => rectP(g, d.x - 22, d.top - 22, d.w + 44, d.bot - d.top + 22), '#B07446', LW.big, '#965E35', () => rectP(g, d.x - 22, d.top - 22, d.w + 44, 18));
    rectP(g, d.x, d.top, d.w, d.bot - d.top); paint(g, '#FFF4D0', 0);
    if (openK > 0) { rectP(g, d.x + 14, d.top + 14, d.w - 28, d.bot - d.top - 14); g.fillStyle = 'rgba(255,255,255,' + (0.85 * clamp(openK)).toFixed(2) + ')'; g.fill(); }
    // the leaf: shrinks toward its hinge as it opens
    const lw2 = d.w * (1 - 0.82 * clamp(openK || 0)), sk = 30 * clamp(openK || 0);
    shape(g, () => polyP(g, [d.x, d.top, d.x + lw2, d.top - sk, d.x + lw2, d.bot + sk * 0.3, d.x, d.bot]), col, LW.big, dark(col, 0.86), () => polyP(g, [d.x + lw2 * 0.8, d.top, d.x + lw2, d.top - sk, d.x + lw2, d.bot + sk * 0.3, d.x + lw2 * 0.8, d.bot]));
    if (lw2 > d.w * 0.5) {
      for (const [py, ph] of [[d.top + 40, 200], [d.top + 290, 220]]) { rectP(g, d.x + 34, py, lw2 - 68, ph); paint(g, null, LW.detail); }
      doorIcon(g, label, d.x + lw2 / 2, d.top + 140, 54);
      ellP(g, d.x + lw2 - 34, d.top + (d.bot - d.top) * 0.55, 13, 13); paint(g, '#F4BF54', LW.small);
    }
    // nameplate over the door
    const fs = fitFont(g, label, 900, 58, d.w + 40, 44); const tw = g.measureText(label).width, pw = Math.max(d.w * 0.8, tw + 50), ph = fs * 1.5;
    rrP(g, cx - pw / 2 + 6, d.top - 52 - ph + 8, pw, ph, 14); g.fillStyle = 'rgba(70,32,16,0.22)'; g.fill();
    shape(g, () => rrP(g, cx - pw / 2, d.top - 52 - ph, pw, ph, 14), '#FFF8EC', LW.small, '#EFE2CC', () => rectP(g, cx - pw / 2, d.top - 52 - ph * 0.25, pw, ph * 0.25));
    g.fillStyle = '#1c1c1c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, cx, d.top - 52 - ph / 2 + 2);
    g.restore();
  }
  SETS.doorTrio = function (g, o) {
    o = o || {}; refresh();
    const labels = o.labels || ['Doctor', 'Lawyer', 'Engineer'], n = labels.length, D = doorGeom(n), xf = camXf(o.cam);
    if (o.bg !== false) blit(g, xf, layer('doorTrio|bg', devRes(g, xf), (lg) => {
      lg.fillStyle = '#F6D3A2'; lg.fillRect(0, 0, W, 850); tileFloor(lg, 850, { col: '#E4AB77', alt: '#DDA26E', line: '#CB8F5F', vpx: 960, vpy: 300, step: 220, h0: 36 });
      wallBand(lg, '#F6D3A2', '#E8B884', [0, 0, W, 850], [-20, 130, 600, 30, 1300, 30, W + 20, 130]);
      softFill(lg, 60, 'rgba(255,244,214,0.4)', () => ellP(lg, 960, 520, 800, 360), 'screen');
      line(lg, 0, 850, W, 850, LW.arch);
    }));
    const colOf = {}; let ci = 0; labels.forEach(l => { const k = String(l).toLowerCase(); if (colOf[k] == null) colOf[k] = DOOR_COLS[ci++ % DOOR_COLS.length]; });
    const shown = o.n == null ? n : o.n;
    live(g, xf, (g2) => D.forEach((d, i) => oneDoor(g2, d, labels[i], colOf[String(labels[i]).toLowerCase()], clamp(shown - i), o.open && o.open.i === i ? o.open.k : 0, o.glow === i ? 1 : 0, o.t || 0)));
    const A = { center: { x: 960, y: 990, s: 1.02 } }; D.forEach((d, i) => { A['door' + i] = { x: d.x + d.w / 2, y: 985, s: 1 }; });
    return result(xf, A, 990, 850);
  };

  // ================================================================ PHONE SCREEN: bank app, incoming call, notification banner
  // SETS.phoneScreen keeps its lock and chat modes and adds:
  //   mode 'bank': a banking app. o.app (app name, optional), o.balanceLabel ('Balance'), o.balance (text, or a number shown as naira),
  //     o.balanceK (0..1 bump when it changes), o.title ('Salary credited'), o.amount (the credited amount; text or number), o.creditK
  //     (0..1: the card pops in), o.rows [{label, amount, out: true|false, k}] (transactions sliding in under the card; two fit,
  //     o.newestFirst puts the last row on top).
  //   mode 'call': an incoming call. o.contact (name), o.status ('incoming call'), o.avatarColor, o.answered (true: the call is on,
  //     o.timer shows its time), o.t (the rings pulse).
  //   o.banner {icon: 'transfer'|'bank'|'call'|'msg', title, body, time, k}: a notification dropping in at the top of any mode
  //     (k 0..1 slides it down, 1..2 slides it away). The lock screen's notes also take icon 'bank' and 'transfer'.
  // Text on the new screens is 40 px or more. A naira sign (U+20A6) in any amount is drawn as an N with two bars.
  function bankGlyph(g, x, y, s, col) {
    g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col;
    polyP(g, [-22, -8, 0, -22, 22, -8]); g.fill(); rectP(g, -20, 14, 40, 6); g.fill();
    for (const cx of [-14, 0, 14]) { rectP(g, cx - 3.5, -5, 7, 18); g.fill(); }
    g.restore();
  }
  function transferGlyph(g, x, y, s, col) {
    g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-18, -8); g.lineTo(12, -8); g.stroke(); polyP(g, [10, -17, 22, -8, 10, 1]); g.fill();
    g.beginPath(); g.moveTo(18, 9); g.lineTo(-12, 9); g.stroke(); polyP(g, [-10, 0, -22, 9, -10, 18]); g.fill();
    g.restore();
  }
  function noteGlyph(g, kind, x, y, s, col) {
    if (kind === 'bank') bankGlyph(g, x, y, s, col); else if (kind === 'transfer') transferGlyph(g, x, y, s, col);
    else if (kind === 'call') handset(g, x + 2, y, s, col); else msgGlyph(g, x, y - 2, s * 1.12, col);
  }
  function noteColour(kind) { return kind === 'call' ? C.bubGreen : kind === 'mail' ? C.bubRed : (kind === 'bank' || kind === 'transfer') ? X.teal : C.bubBlue; }
  function fmtMoney(v) {
    if (typeof v !== 'number') return v == null ? '' : String(v);
    const s = Math.abs(v).toFixed(2).split('.'); return (v < 0 ? '-' : '') + '₦' + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + s[1];
  }
  function bankScreen(g, o) {
    const sx = PH.sx, sy = PH.sy, sw = PH.sw, sh = PH.sh, L = sx + 30, cw = sw - 60, hh = 430;
    g.fillStyle = '#F6F1EA'; g.fillRect(sx, sy, sw, sh);
    rectP(g, sx, sy, sw, hh); paint(g, X.teal, 0);
    ellP(g, sx + sw * 0.9, sy + 120, 220, 220); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fill();
    ellP(g, sx + sw * 0.1, sy + hh, 180, 120); g.fillStyle = 'rgba(0,0,0,0.06)'; g.fill();
    statusBar(g, o, true);
    // app bar
    ellP(g, L + 30, sy + 136, 30, 30); paint(g, '#FFFFFF', 0); bankGlyph(g, L + 30, sy + 138, 0.95, X.teal);
    g.textBaseline = 'middle'; g.textAlign = 'left';
    if (o.app) { g.fillStyle = '#FFFFFF'; fitFont(g, o.app, 900, 44, cw - 90, 40); g.fillText(o.app, L + 76, sy + 138); }
    // balance
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = font(700, 40); g.fillText(o.balanceLabel == null ? 'Balance' : o.balanceLabel, L, sy + 214);
    if (o.balance != null) {
      const txt = fmtMoney(o.balance), bk = o.balanceK == null ? 0 : clamp(o.balanceK), bump = 1 + 0.12 * Math.sin(bk * Math.PI);
      g.save(); g.translate(L, sy + 278); g.scale(bump, bump); g.fillStyle = '#FFFFFF'; fitFont(g, txt, 900, 72, cw, 44); g.textBaseline = 'middle'; moneyText(g, txt, 0, 0, 'left'); g.restore();
    }
    // the credited card
    const ck = o.creditK == null ? 1 : clamp(o.creditK);
    if (ck > 0) {
      const e = easeOutBack(ck), cy = sy + 346, ch = 220;
      g.save(); g.globalAlpha *= clamp(ck * 3); g.translate(sx + sw / 2, cy + ch / 2); g.scale(0.7 + 0.3 * e, 0.7 + 0.3 * e); g.translate(-(sx + sw / 2), -(cy + ch / 2));
      rrP(g, L + 6, cy + 10, cw, ch, 30); g.fillStyle = 'rgba(40,40,40,0.12)'; g.fill();
      rrP(g, L, cy, cw, ch, 30); paint(g, '#FFFFFF', 3.5);
      ellP(g, L + 62, cy + 70, 38, 38); paint(g, C.bubGreen, 3);
      g.beginPath(); g.moveTo(L + 44, cy + 70); g.lineTo(L + 58, cy + 85); g.lineTo(L + 82, cy + 56); g.lineWidth = 7; g.strokeStyle = '#FFFFFF'; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
      const title = o.title == null ? 'Salary credited' : o.title;
      g.fillStyle = '#1c1c1c'; g.textAlign = 'left'; g.textBaseline = 'middle'; fitFont(g, title, 900, 44, cw - 130, 40); g.fillText(title, L + 118, cy + 72);
      if (o.amount != null) { const at = fmtMoney(o.amount); g.fillStyle = '#3E9E57'; fitFont(g, at, 900, 60, cw - 50, 44); moneyText(g, (String(at).charAt(0) === '+' || String(at).charAt(0) === '-') ? at : '+' + at, L + 30, cy + 160, 'left'); }
      g.restore();
    }
    // transactions: two-line rows (label, then amount), newest at the top when o.newestFirst
    let y = sy + 620;
    const rows = (o.rows || []).slice(); if (o.newestFirst) rows.reverse();
    g.save(); rectP(g, sx, sy + 600, sw, sh - 600 - 96); g.clip();
    rows.forEach((r) => {
      const k = r.k == null ? 1 : clamp(r.k); if (k <= 0) return;
      const e = easeOutCubic(k), rh = 140;
      g.save(); g.globalAlpha *= clamp(k * 2); g.translate((1 - e) * 120, 0);
      rrP(g, L, y, cw, rh - 16, 24); paint(g, '#FFFFFF', 2.5);
      const out = r.out !== false, ic = out ? C.badgeRed : C.bubGreen, my = y + (rh - 16) / 2;
      ellP(g, L + 50, my, 32, 32); paint(g, rgba(ic, 0.18), 0);
      g.save(); g.translate(L + 50, my); g.rotate(out ? -Math.PI / 4 : Math.PI * 3 / 4); g.strokeStyle = ic; g.fillStyle = ic; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-12, 0); g.lineTo(8, 0); g.stroke(); polyP(g, [6, -9, 18, 0, 6, 9]); g.fill(); g.restore();
      g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#1c1c1c'; fitFont(g, r.label || '', 700, 42, cw - 120, 40);
      g.save(); rectP(g, L + 96, y, cw - 110, rh); g.clip(); g.fillText(r.label || '', L + 96, y + 38);
      const amt = r.amount == null ? '' : fmtMoney(r.amount), amtTxt = amt && !/^[+-]/.test(amt) ? (out ? '-' : '+') + amt : amt;
      if (amtTxt) { g.fillStyle = out ? '#C9443D' : '#3E9E57'; fitFont(g, amtTxt, 900, 44, cw - 120, 40); moneyText(g, amtTxt, L + 96, y + 88, 'left'); }
      g.restore(); g.restore();
      y += rh * e;
    });
    g.restore();
    // bottom bar
    rectP(g, sx, sy + sh - 96, sw, 96); paint(g, '#FFFFFF', 0); line(g, sx, sy + sh - 96, sx + sw, sy + sh - 96, 2.5);
    for (let i = 0; i < 4; i++) { const bx = sx + sw * (i + 0.5) / 4; rrP(g, bx - 18, sy + sh - 66, 36, 36, 10); paint(g, i === 0 ? X.teal : '#D8D2C8', 0); }
  }
  function callScreen(g, o) {
    const sx = PH.sx, sy = PH.sy, sw = PH.sw, sh = PH.sh, cx = 0, t = o.t || 0;
    const gr = g.createLinearGradient(0, sy, 0, sy + sh); gr.addColorStop(0, '#2C6E7B'); gr.addColorStop(1, '#1F4E58'); g.fillStyle = gr; g.fillRect(sx, sy, sw, sh);
    statusBar(g, o, true);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = font(700, 40); g.fillText(o.answered ? (o.timer || '') : (o.status == null ? 'incoming call' : o.status), cx, sy + 170);
    if (o.contact) { g.fillStyle = '#FFFFFF'; fitFont(g, o.contact, 900, 76, sw - 60, 44); g.fillText(o.contact, cx, sy + 250); }
    const ay = sy + 520;
    if (!o.answered) for (let i = 0; i < 3; i++) { const ph = (t * 0.8 + i / 3) % 1; ellP(g, cx, ay, 130 + ph * 120, 130 + ph * 120); g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,' + (0.4 * (1 - ph)).toFixed(3) + ')'; g.stroke(); }
    ellP(g, cx, ay, 130, 130); paint(g, o.avatarColor || '#E9A73F', LW.frame);
    if (o.contact) { g.fillStyle = '#FFFFFF'; g.font = font(900, 120); g.fillText(String(o.contact).charAt(0).toUpperCase(), cx, ay + 6); }
    const by = sy + sh - 150;
    if (o.answered) { ellP(g, cx, by, 66, 66); paint(g, C.badgeRed, 4); g.save(); g.translate(cx, by); g.rotate(Math.PI * 0.75); handset(g, 0, 0, 1.4, '#FFFFFF'); g.restore(); }
    else {
      const wob = Math.sin(t * TAU * 2.2) * 0.12;
      ellP(g, cx - 150, by, 66, 66); paint(g, C.badgeRed, 4); g.save(); g.translate(cx - 150, by); g.rotate(Math.PI * 0.75); handset(g, 0, 0, 1.4, '#FFFFFF'); g.restore();
      ellP(g, cx + 150, by, 66, 66); paint(g, C.bubGreen, 4); g.save(); g.translate(cx + 150, by); g.rotate(wob); handset(g, 2, 0, 1.4, '#FFFFFF'); g.restore();
    }
  }
  function phoneBanner(g, b) {
    const k = b.k == null ? 1 : b.k; if (!(k > 0) || k >= 2) return;
    const kin = clamp(k), kout = clamp(k - 1), e = easeOutBack(kin) - easeInCubic(kout) * 1.2;
    const L = PH.sx + 16, cw = PH.sw - 32;
    g.font = font(700, 40); const body = b.body ? wrap(g, b.body, cw - 150).slice(0, 2) : [];
    const hgt = 108 + body.length * 48, y = PH.sy + 76 - (1 - e) * (hgt + 120);
    g.save();
    rrP(g, L + 4, y + 8, cw, hgt, 32); g.fillStyle = 'rgba(40,40,40,0.25)'; g.fill();
    rrP(g, L, y, cw, hgt, 32); paint(g, 'rgba(255,252,246,0.98)', 3.5);
    const ix = L + 62, iy = y + 62; ellP(g, ix, iy, 40, 40); paint(g, noteColour(b.icon || 'transfer'), 3); noteGlyph(g, b.icon || 'transfer', ix, iy, 1.0, '#FFFFFF');
    g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#1c1c1c';
    const tw = cw - 140 - (b.time ? 70 : 0); fitFont(g, b.title || '', 900, 44, tw, 40);
    g.save(); rectP(g, L + 118, y, tw + 4, hgt); g.clip(); moneyText(g, b.title || '', L + 118, y + 62, 'left'); g.restore();
    if (b.time) { g.font = font(700, 40); g.fillStyle = '#8a8580'; g.textAlign = 'right'; g.fillText(b.time, L + cw - 22, y + 62); }
    g.font = font(700, 40); g.fillStyle = '#333333'; g.textAlign = 'left'; body.forEach((l, i) => moneyText(g, l, L + 118, y + 116 + i * 48, 'left'));
    g.restore();
  }
  { const prevPhone = SETS.phoneScreen;
    SETS.phoneScreen = function (g, o) {
      o = o || {};
      if (o.mode !== 'bank' && o.mode !== 'call' && !o.banner) return prevPhone(g, o);
      refresh();
      if (o.bg !== false) {
        const bg = o.bg || '#F2B587';
        blit(g, camXf(null), layer('phonebg|' + bg, 1, (lg) => {
          lg.fillStyle = bg; lg.fillRect(0, 0, W, H);
          softFill(lg, 60, 'rgba(255,236,200,0.45)', () => ellP(lg, 960, 540, 600, 520));
          softFill(lg, 14, 'rgba(255,236,200,0.3)', () => polyP(lg, [240, -20, 500, -20, 100, H + 20, -160, H + 20]));
          softFill(lg, 14, 'rgba(255,236,200,0.25)', () => polyP(lg, [1520, -20, 1660, -20, 1260, H + 20, 1120, H + 20]));
        }));
      }
      const buzz = o.buzz || 0, t = o.t || 0, sc = o.scale || 1, cx = o.x == null ? 960 : o.x, cy = o.y == null ? 540 : o.y;
      const jx = buzz ? Math.sin(t * TAU * 22) * 7 * buzz : 0, jr = buzz ? Math.sin(t * TAU * 17) * 0.012 * buzz : 0;
      g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
      g.translate(cx + jx, cy); g.rotate((o.rot || 0) + jr); g.scale(sc, sc);
      rrP(g, -PH.w / 2 + 18, -PH.h / 2 + 24, PH.w, PH.h, PH.r); g.fillStyle = 'rgba(100,48,22,0.22)'; g.fill();
      phoneBody(g);
      g.save(); rrP(g, PH.sx, PH.sy, PH.sw, PH.sh, PH.sr); g.clip();
      if (o.mode === 'bank') bankScreen(g, o); else if (o.mode === 'call') callScreen(g, o); else if (o.mode === 'chat') chatScreen(g, o); else lockScreen(g, o);
      if (o.banner) phoneBanner(g, o.banner);
      g.restore();
      rrP(g, PH.sx, PH.sy, PH.sw, PH.sh, PH.sr); paint(g, null, 3.5);
      if (buzz > 0.05) { g.strokeStyle = INK; g.lineWidth = 6; g.globalAlpha = buzz; for (const sxn of [-1, 1]) for (const dy of [-70, 0, 70]) { g.beginPath(); g.moveTo(sxn * (PH.w / 2 + 36), dy - 22); g.quadraticCurveTo(sxn * (PH.w / 2 + 56), dy, sxn * (PH.w / 2 + 36), dy + 22); g.stroke(); } g.globalAlpha = 1; }
      g.restore();
      return { screen: { x: cx + PH.sx * sc, y: cy + PH.sy * sc, w: PH.sw * sc, h: PH.sh * sc } };
    }; }

  // ================================================================ CARDS (overlays: draw them over any set). All text >= 40 px at scale 1.
  // Each takes (g, o) with o.x, o.y (centre), o.scale, o.rot, o.k (0..1 entrance pop; 1..2 exit, as dayCard), o.t, and returns its rect.
  function cardIn(g, o, defX, defY) {
    const k = o.k == null ? 1 : o.k, kin = clamp(k), kout = clamp(k - 1);
    const e = easeOutBack(kin / 0.6), a = clamp(kin / 0.12) * (1 - easeInCubic(kout));
    if (a <= 0.001) return null;
    const x = o.x == null ? defX : o.x, y = o.y == null ? defY : o.y, sc = (o.scale || 1) * (0.4 + 0.6 * e) * (1 + 0.06 * kout);
    g.save(); g.globalAlpha *= a; g.lineJoin = 'round'; g.lineCap = 'round';
    g.translate(x, y + 60 * (1 - e) - 50 * kout); g.rotate((o.rot == null ? -0.02 : o.rot) - 0.1 * (1 - e)); g.scale(sc, sc);
    return { x, y, sc };
  }
  function strikeLine(g, x0, x1, y, k, col) {
    if (!(k > 0)) return;
    const e = easeOutCubic(k), xe = x0 + (x1 - x0) * e;
    g.save(); g.lineCap = 'round'; g.strokeStyle = col || '#E5534B'; g.lineWidth = 10;
    g.beginPath(); g.moveTo(x0 - 10, y + 4); g.bezierCurveTo(x0 + (xe - x0) * 0.3, y - 6, x0 + (xe - x0) * 0.7, y + 10, xe + 10, y - 2); g.stroke(); g.restore();
  }
  // ---------------------------------------------------------------- ID badge (and its lanyard)
  // SETS.badge(g, x, y, o): (x, y) = the clip at the top of the badge. o.text ('FIRSTBORN'), o.sub (a second line), o.color (header),
  // o.photo (false: no portrait; the portrait is the hero's round bald head in his teal hoodie), o.lanyard (true: the strap rises in a
  // V from the clip, o.strap px long), o.swing (radians), o.scale, o.k (pop). Returns {x, y, w, h} of the card.
  SETS.badge = function (g, x, y, o) {
    o = o || {}; refresh();
    const k = o.k == null ? 1 : clamp(o.k); if (k <= 0) return null;
    const e = easeOutBack(k), sc = (o.scale || 1) * (0.5 + 0.5 * e), col = o.color || X.teal, w = 300, h = 410;
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.globalAlpha *= clamp(k * 3);
    g.translate(x, y); g.scale(sc, sc);
    if (o.lanyard) { const st = o.strap || 300; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 12, -6); g.lineTo(sx * 110, -st); g.lineWidth = 26 + 2 * LW.small; g.strokeStyle = INK; g.stroke(); g.lineWidth = 26; g.strokeStyle = C.lanyard || '#3E6FA6'; g.stroke(); } }
    g.rotate(o.swing || 0);
    shape(g, () => rrP(g, -20, -14, 40, 34, 8), '#C9CED3', LW.small);
    rrP(g, -w / 2 + 8, 30, w, h, 26); g.fillStyle = 'rgba(70,32,16,0.22)'; g.fill();
    shape(g, () => rrP(g, -w / 2, 22, w, h, 26), '#FFFFFF', LW.frame - 1, '#EEF0F2', () => rectP(g, -w / 2, 22 + h - 40, w, 40));
    clipDo(g, () => rrP(g, -w / 2, 22, w, h, 26), () => { rectP(g, -w / 2, 22, w, 92); paint(g, col, 0); ellP(g, w * 0.32, 60, 70, 70); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fill(); });
    rrP(g, -46, 34, 92, 18, 9); paint(g, '#FFFFFF', 2.5);
    line(g, -w / 2, 114, w / 2, 114, LW.small);
    if (o.photo !== false) {
      shape(g, () => rrP(g, -72, 130, 144, 144, 16), '#D8ECEE', LW.small);
      clipDo(g, () => rrP(g, -72, 130, 144, 144, 16), () => {
        g.beginPath(); g.moveTo(-70, 290); g.quadraticCurveTo(-64, 230, 0, 226); g.quadraticCurveTo(64, 230, 70, 290); g.closePath(); paint(g, C.hoodie, LW.small);
        g.beginPath(); g.moveTo(-18, 228); g.lineTo(0, 252); g.lineTo(18, 228); g.closePath(); paint(g, '#FFFFFF', LW.detail);
        ellP(g, 0, 186, 46, 46); paint(g, C.skin, LW.small);
      });
      rrP(g, -72, 130, 144, 144, 16); paint(g, null, LW.small);
    }
    const name = o.text == null ? 'FIRSTBORN' : String(o.text);
    g.fillStyle = '#1c1c1c'; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitFont(g, name, 1000, 52, w - 36, 40); g.fillText(name, 0, o.photo === false ? 200 : 318);
    if (o.sub) { g.fillStyle = '#5E6064'; fitFont(g, o.sub, 800, 40, w - 36, 40); g.fillText(o.sub, 0, o.photo === false ? 256 : 366); }
    if (!o.sub) { g.fillStyle = '#1c1c1c'; for (let i = 0; i < 22; i++) { const bw = (i * 7) % 3 + 2; rectP(g, -96 + i * 9, 362, bw, 34); g.fill(); } }
    g.restore();
    return { x: x - w / 2 * sc, y: y + 22 * sc, w: w * sc, h: h * sc };
  };
  // ---------------------------------------------------------------- job offer card
  // SETS.jobCard(g, o): o.title ('JOB OFFER'), o.lines: strings or {text, strike: 0..1 (a red pen line through it)}, o.sign (false: no
  // signature line), o.badge (badge text, 'FIRSTBORN'; false hides the badge), o.badgeSub, o.badgeK (0..1), o.t (the badge swings).
  // Card 980 x 660 at scale 1, centred on (o.x, o.y). Returns {x, y, w, h, badge: {x, y}} (the badge clip, screen space).
  SETS.jobCard = function (g, o) {
    o = o || {}; refresh();
    const st = cardIn(g, o, 900, 540); if (!st) return null;
    const w = 980, h = 660, x0 = -w / 2, y0 = -h / 2;
    rrP(g, x0 + 16, y0 + 20, w, h, 30); g.fillStyle = 'rgba(70,32,16,0.25)'; g.fill();
    shape(g, () => rrP(g, x0, y0, w, h, 30), '#FFFAF0', LW.frame, '#F1E6D2', () => polyP(g, [x0, y0 + h - 60, x0 + w, y0 + h - 140, x0 + w, y0 + h, x0, y0 + h]));
    clipDo(g, () => rrP(g, x0, y0, w, h, 30), () => { rectP(g, x0, y0, w, 140); paint(g, X.teal, 0); rectP(g, x0, y0 + 112, w, 28); paint(g, C.hoodieSh || '#2F7280', 0); });
    line(g, x0, y0 + 140, x0 + w, y0 + 140, LW.small);
    rrP(g, x0, y0, w, h, 30); paint(g, null, LW.frame);
    const title = o.title == null ? 'JOB OFFER' : String(o.title);
    g.fillStyle = '#FFF8EC'; g.textAlign = 'left'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = '4px';
    fitFont(g, title, 1000, 76, w - 120, 44); g.fillText(title, x0 + 56, y0 + 66);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    const lines = (o.lines || []).map(l => typeof l === 'string' ? { text: l } : l);
    lines.forEach((l, i) => {
      const ly = y0 + 214 + i * 74; g.fillStyle = '#1c1c1c'; fitFont(g, l.text || '', 800, 48, w - (o.badge === false ? 160 : 460), 40); g.textAlign = 'left';
      ellP(g, x0 + 70, ly, 9, 9); paint(g, X.teal, 0); g.fillText(l.text || '', x0 + 100, ly + 2);
      if (l.strike) strikeLine(g, x0 + 92, x0 + 108 + g.measureText(l.text || '').width, ly + 2, l.strike);
    });
    if (o.sign !== false) { const sy = y0 + h - 90; line(g, x0 + 70, sy, x0 + 420, sy, 3, '#9AA3AA'); g.beginPath(); g.moveTo(x0 + 90, sy - 14); g.bezierCurveTo(x0 + 140, sy - 70, x0 + 170, sy + 10, x0 + 220, sy - 30); g.bezierCurveTo(x0 + 250, sy - 54, x0 + 270, sy - 6, x0 + 330, sy - 26); g.lineWidth = 4; g.strokeStyle = '#3E6FA6'; g.stroke(); }
    // gold seal
    const zx = x0 + w - 130, zy = y0 + h - 110;
    g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, r = i % 2 ? 54 : 62; g.lineTo(zx + Math.cos(a) * r, zy + Math.sin(a) * r); } g.closePath(); paint(g, '#F4BF54', LW.small);
    ellP(g, zx, zy, 38, 38); paint(g, '#FFE08A', LW.detail); ellP(g, zx, zy, 16, 16); paint(g, '#F4BF54', LW.detail);
    let badge = null;
    if (o.badge !== false) {
      const bx = x0 + w - 230, by = y0 + 150, bk = o.badgeK == null ? 1 : o.badgeK;
      const sw = Math.sin((o.t || 0) * 2.6) * 0.06 + (1 - clamp(bk)) * 0.4;
      SETS.badge(g, bx, by, { text: o.badge == null ? 'FIRSTBORN' : o.badge, sub: o.badgeSub, k: bk, lanyard: true, strap: 200, swing: sw, scale: 0.92 });
      const m = g.getTransform ? g.getTransform() : null; if (m) badge = { x: m.a * bx + m.c * by + m.e, y: m.b * bx + m.d * by + m.f };
    }
    g.restore();
    return { x: st.x - w / 2 * st.sc, y: st.y - h / 2 * st.sc, w: w * st.sc, h: h * st.sc, badge };
  };
  // ---------------------------------------------------------------- rules board
  // SETS.rulesBoard(g, o): a framed chalkboard on a nail. o.title ('HOUSE RULES'), o.rules: strings or {text, strike: 0..1, k},
  // o.ruleK (rules shown, a float; default all), o.check (true: a chalk box before each rule). 900 wide at scale 1; height follows.
  SETS.rulesBoard = function (g, o) {
    o = o || {}; refresh();
    const st = cardIn(g, o, 960, 520); if (!st) return null;
    const rules = (o.rules || []).map(r => typeof r === 'string' ? { text: r } : r), w = 900, h = 220 + Math.max(1, rules.length) * 92, x0 = -w / 2, y0 = -h / 2;
    line(g, -150, y0 + 10, 0, y0 - 80, 3); line(g, 150, y0 + 10, 0, y0 - 80, 3); ellP(g, 0, y0 - 82, 9, 9); paint(g, '#8A8F96', 2);
    rrP(g, x0 + 14, y0 + 18, w, h, 22); g.fillStyle = 'rgba(70,32,16,0.28)'; g.fill();
    shape(g, () => rrP(g, x0, y0, w, h, 22), '#B0703F', LW.frame, '#965E35', () => rectP(g, x0, y0 + h - 30, w, 30));
    shape(g, () => rectP(g, x0 + 30, y0 + 30, w - 60, h - 60), '#2F5E57', LW.small, '#294F4A', () => polyP(g, [x0 + 30, y0 + 30, x0 + w - 30, y0 + 30, x0 + w - 30, y0 + 48, x0 + 48, y0 + 48, x0 + 48, y0 + h - 30, x0 + 30, y0 + h - 30]));
    polyP(g, [x0 + w * 0.55, y0 + 30, x0 + w * 0.7, y0 + 30, x0 + w * 0.45, y0 + h - 30, x0 + w * 0.3, y0 + h - 30]); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fill();
    const title = o.title == null ? 'HOUSE RULES' : String(o.title);
    g.fillStyle = '#FFF8E6'; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = '3px';
    fitFont(g, title, 1000, 64, w - 120, 44); g.fillText(title, 0, y0 + 100); if ('letterSpacing' in g) g.letterSpacing = '0px';
    line(g, -g.measureText(title).width / 2, y0 + 142, g.measureText(title).width / 2, y0 + 142, 4, 'rgba(255,248,230,0.7)');
    const shown = o.ruleK == null ? rules.length : o.ruleK;
    rules.forEach((r, i) => {
      const k = r.k != null ? clamp(r.k) : clamp(shown - i); if (k <= 0) return;
      const ry = y0 + 210 + i * 92;
      g.save(); g.globalAlpha *= k; g.translate((1 - easeOutCubic(k)) * -40, 0);
      if (o.check) { rrP(g, x0 + 80, ry - 22, 44, 44, 6); g.lineWidth = 4; g.strokeStyle = 'rgba(255,248,230,0.85)'; g.stroke(); } else { ellP(g, x0 + 100, ry, 10, 10); g.fillStyle = '#FFF8E6'; g.fill(); }
      g.fillStyle = '#FFF8E6'; g.textAlign = 'left'; fitFont(g, r.text || '', 800, 52, w - 230, 40); g.fillText(r.text || '', x0 + 150, ry + 2);
      if (r.strike) strikeLine(g, x0 + 140, x0 + 160 + g.measureText(r.text || '').width, ry + 2, r.strike, '#F28B82');
      g.restore();
    });
    // a stub of chalk on the ledge
    shape(g, () => rrP(g, x0 + w - 200, y0 + h - 40, 60, 16, 6), '#FFFFFF', 2);
    g.restore();
    return { x: st.x - w / 2 * st.sc, y: st.y - h / 2 * st.sc, w: w * st.sc, h: h * st.sc };
  };
  // ---------------------------------------------------------------- bill / invoice
  // SETS.billCard(g, o): o.kind 'bill' (a small torn-off bill: o.title, o.amount, o.sub, o.color accent) or 'invoice' (default when
  // o.lines are given: o.title ('INVOICE'), o.lines [{label, amount}], o.total {label, amount} or text, o.stamp (text, slammed on with
  // o.stampK)). Amounts may be numbers (shown as naira) or text. 'bill' is 560 wide, 'invoice' 900 wide at scale 1.
  SETS.billCard = function (g, o) {
    o = o || {}; refresh();
    const kind = o.kind || (o.lines ? 'invoice' : 'bill');
    const st = cardIn(g, o, 960, 540); if (!st) return null;
    const acc = o.color || C.badgeRed;
    const torn = (x0, y1, w) => { const n = Math.round(w / 40); g.lineTo(x0 + w, y1); for (let i = n; i >= 0; i--) g.lineTo(x0 + w * i / n, y1 + (i % 2 ? 0 : 18)); };
    let w, h;
    if (kind === 'bill') {
      w = 560; h = 360; const x0 = -w / 2, y0 = -h / 2;
      const path = () => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + w, y0); torn(x0, y0 + h, w); g.closePath(); };
      g.save(); g.translate(12, 16); path(); g.fillStyle = 'rgba(70,32,16,0.25)'; g.fill(); g.restore();
      shape(g, path, '#FFFDF6', LW.frame - 1, '#F1E9DA', () => rectP(g, x0, y0 + h - 60, w, 80));
      clipDo(g, path, () => { rectP(g, x0, y0, w, 104); paint(g, acc, 0); });
      line(g, x0, y0 + 104, x0 + w, y0 + 104, LW.small);
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; fitFont(g, o.title || '', 1000, 54, w - 60, 40); g.fillText(o.title || '', 0, y0 + 54);
      if (o.amount != null) { g.fillStyle = '#1c1c1c'; const at = fmtMoney(o.amount); fitFont(g, at, 1000, 72, w - 60, 44); moneyText(g, at, 0, y0 + 190, 'center'); }
      if (o.sub) { g.fillStyle = '#6A6A6A'; fitFont(g, o.sub, 800, 40, w - 60, 40); g.fillText(o.sub, 0, y0 + 270); }
    } else {
      const lines = o.lines || []; w = 900; h = 260 + lines.length * 76 + (o.total != null ? 110 : 0); const x0 = -w / 2, y0 = -h / 2;
      const path = () => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + w, y0); torn(x0, y0 + h, w); g.closePath(); };
      g.save(); g.translate(14, 18); path(); g.fillStyle = 'rgba(70,32,16,0.25)'; g.fill(); g.restore();
      shape(g, path, '#FFFDF6', LW.frame, '#F1E9DA', () => polyP(g, [x0, y0 + h - 40, x0 + w, y0 + h - 120, x0 + w, y0 + h + 30, x0, y0 + h + 30]));
      clipDo(g, path, () => { rectP(g, x0, y0, w, 130); paint(g, acc, 0); });
      line(g, x0, y0 + 130, x0 + w, y0 + 130, LW.small);
      const title = o.title == null ? 'INVOICE' : String(o.title);
      g.fillStyle = '#FFFFFF'; g.textAlign = 'left'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = '4px';
      fitFont(g, title, 1000, 78, w - 120, 44); g.fillText(title, x0 + 50, y0 + 66); if ('letterSpacing' in g) g.letterSpacing = '0px';
      lines.forEach((l, i) => {
        const ly = y0 + 196 + i * 76, k = l.k == null ? 1 : clamp(l.k); if (k <= 0) return;
        g.save(); g.globalAlpha *= k;
        const amt = fmtMoney(l.amount); g.font = font(900, 46); const aw = amt ? g.measureText(String(amt).replace('₦', 'N')).width : 0;
        g.fillStyle = '#1c1c1c'; g.textBaseline = 'middle'; if (amt) moneyText(g, amt, x0 + w - 50, ly, 'right');
        fitFont(g, l.label || '', 700, 46, w - 140 - aw, 40); g.textAlign = 'left'; g.fillText(l.label || '', x0 + 50, ly);
        const lw2 = g.measureText(l.label || '').width; g.fillStyle = '#C9C2B5'; for (let x = x0 + 70 + lw2; x < x0 + w - 70 - aw; x += 18) { ellP(g, x, ly + 14, 3, 3); g.fill(); }
        g.restore();
      });
      if (o.total != null) {
        const ty = y0 + 196 + lines.length * 76 + 30, T = typeof o.total === 'object' ? o.total : { label: 'Total', amount: o.total };
        line(g, x0 + 40, ty - 36, x0 + w - 40, ty - 36, 4);
        g.fillStyle = '#1c1c1c'; g.textBaseline = 'middle'; g.font = font(1000, 58); const amt = fmtMoney(T.amount); if (amt) moneyText(g, amt, x0 + w - 50, ty + 6, 'right');
        g.textAlign = 'left'; fitFont(g, T.label || 'Total', 1000, 58, w * 0.45, 40); g.fillText(T.label || 'Total', x0 + 50, ty + 6);
      }
      if (o.stamp) { g.save(); SETS.stamp(g, x0 + w * 0.68, y0 + h * 0.42, String(o.stamp), o.stampK == null ? 1 : o.stampK, { size: 96, rot: -0.22, color: C.badgeRed }); g.restore(); }
    }
    g.restore();
    return { x: st.x - w / 2 * st.sc, y: st.y - h / 2 * st.sc, w: w * st.sc, h: h * st.sc };
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
