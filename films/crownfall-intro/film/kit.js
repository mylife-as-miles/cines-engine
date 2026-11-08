/* Crownfall: Aethelgard, opening film. The shared drawing kit (window.KIT).
   Everything is deterministic: seeded random numbers and hash noise only, never Math.random or Date, so any frame can be
   drawn at any time. Scenes (film/scenes/sNN.js) build on these pieces; the look is described in LOOK.md. */
(function () {
  'use strict';
  const W = 1920, H = 1080, FPS = 24;
  const K = window.KIT = { W, H, FPS };

  // ---------------------------------------------------------------- math
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const ease = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const easeOut = t => { t = clamp(t); return 1 - Math.pow(1 - t, 3); };
  const easeIn = t => { t = clamp(t); return t * t * t; };
  const span = (t, a, b) => clamp((t - a) / (b - a));
  // envelope: fades in over [a, a+fi], holds, fades out over [b-fo, b]
  const win = (t, a, b, fi, fo) => smooth(span(t, a, a + fi)) * (1 - smooth(span(t, b - fo, b)));
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(x, y, s) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function noise(x, y, s = 0) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, oct = 4, s = 0) { let f = 0, a = 0.5, n = 0; for (let i = 0; i < oct; i++) { f += a * noise(x, y, s + i * 17); n += a; x *= 2.03; y *= 2.03; a *= 0.5; } return f / n; }
  Object.assign(K, { clamp, lerp, smooth, ease, easeOut, easeIn, span, win, rng, hash, noise, fbm });

  // ---------------------------------------------------------------- canvases
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  const CACHE = new Map();
  // cached(key, make): build once, reuse every frame (pages, sprites, textures)
  function cached(key, make) { if (!CACHE.has(key)) CACHE.set(key, make()); return CACHE.get(key); }
  // release(prefix): free cached canvases whose key starts with prefix (a scene can call it once it is far behind)
  function release(prefix) { for (const [k, v] of CACHE) if (k.startsWith(prefix)) { if (v && v.width) { v.width = v.height = 0; } CACHE.delete(k); } }
  // layer(name): a full-frame scratch canvas, cleared and reset, reused across frames
  const LAYERS = {};
  function layer(name, w = W, h = H) {
    let c = LAYERS[name]; if (!c || c.width !== w || c.height !== h) c = LAYERS[name] = canvas(w, h);
    const x = c.getContext('2d');
    // every state back to its default (line caps, dashes, smoothing, shadows, fonts...), so no frame depends on the one before
    if (x.reset) x.reset(); else { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.setLineDash([]); x.lineCap = 'butt'; x.lineJoin = 'miter'; x.lineWidth = 1; x.shadowBlur = 0; x.shadowColor = 'rgba(0,0,0,0)'; x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'low'; x.clearRect(0, 0, w, h); }
    return c;
  }
  Object.assign(K, { canvas, cached, release, layer });

  // ---------------------------------------------------------------- palette (iron-gall ink, vellum, gold leaf, mineral pigments)
  const P = {
    black: '#060403', night: '#0c0a08',
    parch: '#d9c6a0', parchLight: '#e9dbb9', parchDark: '#a98b5d', parchEdge: '#5a3f22',
    ink: '#20150c', inkBrown: '#3b2716', sepia: '#6b4a2b', inkBlue: '#232a36',
    gold: '#c9a14a', goldHi: '#f4dfa0', goldDeep: '#7c5a22',
    vermilion: '#9b2f1f', crimson: '#7a1d17', ultramarine: '#2c3f78', azure: '#3d5f8f', violet: '#4f3473', verdigris: '#3d6656',
    green: '#2f5a46', ochre: '#b07a2c', umber: '#5c4026', bone: '#efe7d6', ash: '#9b9488', snow: '#eef0f2',
    ember: [[226, 150, 74], [205, 104, 48], [150, 44, 30], [236, 208, 160], [180, 70, 40]],
  };
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  K.P = P; K.rgba = rgba;

  // ---------------------------------------------------------------- textures
  // value-noise blotches: a small random canvas scaled up smoothly
  function blotches(x, w, h, cell, amt, rgb, mode, r) {
    const cw = Math.ceil(w / cell) + 3, ch = Math.ceil(h / cell) + 3, s = canvas(cw, ch), sx = s.getContext('2d'), img = sx.createImageData(cw, ch);
    for (let i = 0; i < cw * ch; i++) { const v = r(), k = i * 4; img.data[k] = rgb[0]; img.data[k + 1] = rgb[1]; img.data[k + 2] = rgb[2]; img.data[k + 3] = Math.floor(255 * amt * v * v); }
    sx.putImageData(img, 0, 0);
    x.save(); x.globalCompositeOperation = mode; x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(s, -cell * 1.5, -cell * 1.5, cw * cell, ch * cell); x.restore();
  }
  // parchment(w, h, seed, opts): aged vellum. opts: base [r,g,b], dark [r,g,b], edge (0..2), foxing (count), stains (count), folds ([{x}|{y}] in 0..1)
  function parchment(w, h, seed, o = {}) {
    const c = canvas(w, h), x = c.getContext('2d'), r = rng(seed);
    const base = o.base || [218, 199, 160], dark = o.dark || [112, 80, 44];
    x.fillStyle = `rgb(${base})`; x.fillRect(0, 0, w, h);
    blotches(x, w, h, w / 4, 0.26, dark, 'multiply', r);
    blotches(x, w, h, w / 11, 0.2, dark, 'multiply', r);
    blotches(x, w, h, w / 7, 0.22, [255, 246, 224], 'screen', r);
    blotches(x, w, h, w / 34, 0.12, dark, 'multiply', r);
    blotches(x, w, h, 9, 0.07, dark, 'multiply', r);
    // fibres of the skin
    x.save(); x.lineCap = 'round';
    const nf = Math.floor(w * h / 1100);
    for (let i = 0; i < nf; i++) {
      const px = r() * w, py = r() * h, L = 4 + r() * 24, a = (r() - 0.5) * 0.9, light = r() < 0.4;
      x.globalCompositeOperation = light ? 'screen' : 'multiply';
      x.strokeStyle = light ? `rgba(255,248,232,${0.04 + r() * 0.07})` : `rgba(${dark},${0.03 + r() * 0.06})`; x.lineWidth = 0.5 + r() * 0.9;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * L * 0.5 + (r() - 0.5) * 4, py + Math.sin(a) * L * 0.5 + (r() - 0.5) * 4, px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke();
    }
    x.restore();
    // foxing
    x.save(); x.globalCompositeOperation = 'multiply';
    const nfox = o.foxing != null ? o.foxing : Math.floor(w * h / 60000);
    for (let i = 0; i < nfox; i++) {
      const px = r() * w, py = r() * h, rad = 2 + r() * r() * 30, a = 0.06 + r() * 0.2;
      const g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, `rgba(118,74,32,${a})`); g.addColorStop(0.55, `rgba(128,86,44,${a * 0.45})`); g.addColorStop(1, 'rgba(128,86,44,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, rad, 0, 6.283); x.fill();
    }
    // tide-mark stains
    for (let i = 0; i < (o.stains != null ? o.stains : 3); i++) {
      const px = r() * w, py = r() * h, rad = 50 + r() * Math.min(w, h) * 0.18, sq = 0.7 + r() * 0.3;
      x.strokeStyle = `rgba(120,82,40,${0.05 + r() * 0.07})`; x.lineWidth = 2 + r() * 5; x.filter = 'blur(2px)'; x.beginPath();
      for (let k = 0; k <= 72; k++) { const a = k / 72 * 6.283, rr = rad * (1 + 0.16 * (fbm(Math.cos(a) * 1.6 + i * 9, Math.sin(a) * 1.6, 3, seed) - 0.5)); const X = px + Math.cos(a) * rr, Y = py + Math.sin(a) * rr * sq; k ? x.lineTo(X, Y) : x.moveTo(X, Y); }
      x.stroke(); x.filter = 'none';
      const g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, 'rgba(140,100,55,0)'); g.addColorStop(0.85, `rgba(140,100,55,${0.04 + r() * 0.04})`); g.addColorStop(1, 'rgba(140,100,55,0)');
      x.fillStyle = g; x.beginPath(); x.ellipse(px, py, rad, rad * sq, 0, 0, 6.283); x.fill();
    }
    // folds
    for (const f of o.folds || []) {
      x.save(); x.filter = 'blur(2.5px)';
      for (const [col, a, off, mode] of [[dark, 0.16, 2, 'multiply'], [[255, 248, 230], 0.22, -2, 'screen']]) {
        x.globalCompositeOperation = mode; x.strokeStyle = `rgba(${col},${a})`; x.lineWidth = 3; x.beginPath();
        for (let k = 0; k <= 40; k++) { const u = k / 40; const wob = (noise(u * 6, f.x != null ? 1 : 2, seed) - 0.5) * 5; if (f.x != null) { const X = f.x * w + off + wob, Y = u * h; k ? x.lineTo(X, Y) : x.moveTo(X, Y); } else { const X = u * w, Y = f.y * h + off + wob; k ? x.lineTo(X, Y) : x.moveTo(X, Y); } }
        x.stroke();
      }
      x.restore();
    }
    // aged, uneven edges
    const eg = o.edge != null ? o.edge : 1;
    if (eg > 0) {
      x.globalCompositeOperation = 'multiply';
      const nb = Math.floor((w + h) / 14);
      for (let i = 0; i < nb; i++) {
        const u = r() * 2 * (w + h); let px, py;
        if (u < w) { px = u; py = 0; } else if (u < w + h) { px = w; py = u - w; } else if (u < 2 * w + h) { px = u - w - h; py = h; } else { px = 0; py = u - 2 * w - h; }
        const rad = (40 + r() * 150) * eg, a = (0.05 + r() * 0.12) * Math.min(1, eg);
        const g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, `rgba(80,52,24,${a})`); g.addColorStop(1, 'rgba(80,52,24,0)');
        x.fillStyle = g; x.beginPath(); x.arc(px, py, rad, 0, 6.283); x.fill();
      }
      x.save(); x.translate(w / 2, h / 2); x.scale(w / h, 1);
      const g = x.createRadialGradient(0, 0, h * 0.3, 0, 0, h * 0.78);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.75, `rgba(${dark},${0.18 * eg})`); g.addColorStop(1, `rgba(74,48,22,${0.55 * eg})`);
      x.fillStyle = g; x.fillRect(-w, -h, 2 * w, 2 * h); x.restore();
    }
    x.restore();
    return c;
  }
  // linen(w, h, seed, opts): woven cloth for the tapestry (opts.base, opts.dark)
  function linen(w, h, seed, o = {}) {
    const c = canvas(w, h), x = c.getContext('2d'), r = rng(seed);
    const base = o.base || [206, 188, 150], dark = o.dark || [96, 72, 44];
    x.fillStyle = `rgb(${base})`; x.fillRect(0, 0, w, h);
    blotches(x, w, h, w / 6, 0.18, dark, 'multiply', r);
    blotches(x, w, h, w / 20, 0.1, [255, 248, 230], 'screen', r);
    const step = o.step || 4;
    x.globalCompositeOperation = 'multiply';
    for (let y = 0; y < h; y += step) { x.fillStyle = `rgba(${dark},${0.05 + r() * 0.05})`; x.fillRect(0, y, w, 1); }
    for (let X = 0; X < w; X += step) { x.fillStyle = `rgba(${dark},${0.04 + r() * 0.05})`; x.fillRect(X, 0, 1, h); }
    x.globalCompositeOperation = 'screen';
    for (let i = 0; i < w * h / 400; i++) { x.fillStyle = `rgba(255,250,236,${0.04 + r() * 0.06})`; x.fillRect(Math.floor(r() * w / step) * step + 1, Math.floor(r() * h / step) * step + 1, step - 1, step - 1); }
    x.globalCompositeOperation = 'source-over';
    return c;
  }
  // a fine paper-grain tile, drawn in screen space over pages so they stay crisp at any zoom
  function paperGrain() {
    return cached('kit:grainTile', () => {
      const s = 512, c = canvas(s, s), x = c.getContext('2d'), r = rng(4242), img = x.createImageData(s, s);
      for (let i = 0; i < s * s; i++) { const v = 128 + (r() - 0.5) * 70 + (fbm((i % s) / 6, Math.floor(i / s) / 6, 2, 3) - 0.5) * 60; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = clamp(v, 0, 255); img.data[i * 4 + 3] = 255; }
      x.putImageData(img, 0, 0); return c;
    });
  }
  function tile(ctx, img, x0, y0, w, h, ox = 0, oy = 0) {
    const tw = img.width, th = img.height;
    for (let y = y0 - ((oy % th) + th) % th; y < y0 + h; y += th) for (let X = x0 - ((ox % tw) + tw) % tw; X < x0 + w; X += tw) ctx.drawImage(img, X, y);
  }
  // paperTooth(ctx, alpha): the grain over the whole frame (overlay)
  function paperTooth(ctx, alpha = 0.18) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'overlay'; tile(ctx, paperGrain(), 0, 0, W, H); ctx.restore(); }
  Object.assign(K, { parchment, linen, paperGrain, tile, paperTooth });

  // ---------------------------------------------------------------- lines and ink
  // bez(segs, n): sample a chain of cubic beziers [[x0,y0],[c1],[c2],[x1,y1],[c1],[c2],[x2,y2],...] into a dense polyline
  function bez(p, n = 16) {
    const out = [p[0]];
    for (let i = 0; i + 3 < p.length; i += 3) {
      const [a, b, c, d] = [p[i], p[i + 1], p[i + 2], p[i + 3]];
      for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; out.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]); }
    }
    return out;
  }
  // resample(pts, step): evenly spaced points along a polyline
  function resample(pts, step) {
    const out = [pts[0]]; let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i]; const d = Math.hypot(bx - ax, by - ay); let t = step - carry;
      while (t <= d) { out.push([ax + (bx - ax) * t / d, ay + (by - ay) * t / d]); t += step; }
      carry = d - (t - step);
    }
    if (out.length < 2 || Math.hypot(out[out.length - 1][0] - pts[pts.length - 1][0], out[out.length - 1][1] - pts[pts.length - 1][1]) > step * 0.3) out.push(pts[pts.length - 1]);
    return out;
  }
  // wobble(pts, amp, freq, seed): a hand's unsteadiness along the normals
  function wobble(pts, amp, freq = 0.02, seed = 1) {
    let L = 0; return pts.map((p, i) => {
      if (i) L += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const o = (fbm(L * freq, seed * 1.7, 3, seed) - 0.5) * 2 * amp; return [p[0] - dy / l * o, p[1] + dx / l * o];
    });
  }
  function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  // nib(ctx, pts, o): a broad-nib pen stroke, filled with the current fillStyle.
  //   o.w width, o.angle nib angle (radians, default -0.7), o.min thinnest share (0.22), o.taper share of length tapered at each end,
  //   o.p how much of the stroke is drawn (0..1, for drawing on), o.jit width jitter, o.seed
  function nib(ctx, pts, o = {}) {
    const w0 = o.w || 3, ang = o.angle != null ? o.angle : -0.7, mn = o.min != null ? o.min : 0.22, taper = o.taper != null ? o.taper : 0.12, p = o.p != null ? o.p : 1;
    if (pts.length < 2 || p <= 0) return;
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = cum[cum.length - 1] || 1, end = total * clamp(p);
    const Lp = [], Rp = [];
    for (let i = 0; i < pts.length; i++) {
      let q = pts[i], c = cum[i];
      if (c > end) { const f = (end - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); q = [lerp(pts[i - 1][0], q[0], f), lerp(pts[i - 1][1], q[1], f)]; c = end; }
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      let wi = w0 * (mn + (1 - mn) * Math.abs(Math.sin(Math.atan2(dy, dx) - ang)));
      const u = c / total; if (taper > 0) wi *= smooth(Math.min(u / taper, (1 - u) / taper, 1) * 0.85 + 0.15);
      if (o.jit) wi *= 1 + o.jit * (noise(c * 0.04, 3.3, o.seed || 1) - 0.5) * 2;
      Lp.push([q[0] - dy / l * wi / 2, q[1] + dx / l * wi / 2]); Rp.push([q[0] + dy / l * wi / 2, q[1] - dx / l * wi / 2]);
      if (cum[i] > end) break;
    }
    ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]); for (const q of Lp) ctx.lineTo(q[0], q[1]); for (let i = Rp.length - 1; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]); ctx.closePath(); ctx.fill();
  }
  // line(ctx, pts, p): stroke a polyline up to share p (uses the current strokeStyle / lineWidth)
  function line(ctx, pts, p = 1) {
    if (p <= 0 || pts.length < 2) return; const total = polyLen(pts), end = total * clamp(p); let acc = 0;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc + d >= end) { const f = (end - acc) / (d || 1); ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); break; } ctx.lineTo(pts[i][0], pts[i][1]); acc += d; }
    ctx.stroke();
  }
  function poly(ctx, pts, close = true) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (close) ctx.closePath(); }
  // ink(ctx, fn, o): draw fn() as ink on paper: multiply, so the vellum shows through. o.color, o.alpha, o.bleed (px blur halo)
  function ink(ctx, fn, o = {}) {
    ctx.save(); ctx.globalCompositeOperation = o.mode || 'multiply';
    const col = o.color || P.ink; ctx.fillStyle = col; ctx.strokeStyle = col;
    if (o.bleed) { ctx.save(); ctx.filter = `blur(${o.bleed}px)`; ctx.globalAlpha = (o.alpha != null ? o.alpha : 1) * 0.28; fn(ctx); ctx.restore(); ctx.fillStyle = col; ctx.strokeStyle = col; }
    ctx.globalAlpha = o.alpha != null ? o.alpha : 1; fn(ctx); ctx.restore();
  }
  // wash(ctx, pathFn, color, alpha): a watercolour wash with pooled, darker edges and granulation
  function wash(ctx, pathFn, color, alpha = 0.5, o = {}) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    pathFn(ctx); ctx.fillStyle = rgba(color, alpha); ctx.fill();
    ctx.clip();
    ctx.filter = `blur(${o.edgeBlur || 2}px)`; ctx.strokeStyle = rgba(color, alpha * 0.9); ctx.lineWidth = o.edge || 5; pathFn(ctx); ctx.stroke(); ctx.filter = 'none';
    if (o.granulate !== false) { ctx.globalAlpha = 0.22; ctx.globalCompositeOperation = 'multiply'; const b = o.bbox; if (b) tile(ctx, grainDark(), b[0], b[1], b[2], b[3], b[0] * 0.37, b[1] * 0.61); }
    ctx.restore();
  }
  function grainDark() {
    return cached('kit:grainDark', () => {
      const s = 256, c = canvas(s, s), x = c.getContext('2d'), r = rng(77), img = x.createImageData(s, s);
      for (let i = 0; i < s * s; i++) { const v = 255 - Math.pow(r(), 3) * 120; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
      x.putImageData(img, 0, 0); return c;
    });
  }
  Object.assign(K, { bez, resample, wobble, polyLen, nib, line, poly, ink, wash });

  // ---------------------------------------------------------------- reveals: ink that spreads, pages that burn
  // field(gw, gh, seeds, seed, o): an arrival-time field in 0..1 for a gw x gh grid laid over the frame (or a page).
  //   seeds [{x, y, d}] in 0..1 of the width/height; d delays that seed. o.warp (0.15) bends the fronts with noise,
  //   o.scale noise frequency, o.grain fine edge noise. Use with mask().
  function field(gw, gh, seeds, seed, o = {}) {
    const f = new Float32Array(gw * gh), warp = o.warp != null ? o.warp : 0.15, sc = o.scale || 3, gr = o.grain != null ? o.grain : 0.035, asp = gh / gw;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const u = i / gw, v = j / gw;
      const wx = u + warp * (fbm(u * sc, v * sc, 4, seed) - 0.5), wy = v + warp * (fbm(u * sc + 7.1, v * sc + 3.3, 4, seed + 5) - 0.5);
      let best = 1e9; for (const s of seeds) { const d = Math.hypot(wx - s.x, wy - s.y * asp) + (s.d || 0); if (d < best) best = d; }
      f[j * gw + i] = best + gr * (fbm(u * 46, v * 46, 2, seed + 9) - 0.5);
    }
    let mn = 1e9, mx = -1e9; for (let k = 0; k < f.length; k++) { if (f[k] < mn) mn = f[k]; if (f[k] > mx) mx = f[k]; }
    for (let k = 0; k < f.length; k++) f[k] = (f[k] - mn) / (mx - mn);
    return { w: gw, h: gh, f, c: canvas(gw, gh), rim: canvas(gw, gh) };
  }
  // mask(F, p, soft): a canvas whose alpha is 1 where the front has passed (arrival < p). Draw it scaled over the frame and
  //   use 'destination-in' to cut a layer, or fill through it. rim(F, p, width) gives the band at the front (for char, glow).
  function mask(F, p, soft = 0.03) {
    const x = F.c.getContext('2d'), img = F.img || (F.img = x.createImageData(F.w, F.h)), d = img.data, f = F.f;
    for (let k = 0, i = 0; k < f.length; k++, i += 4) { d[i + 3] = clamp((p - f[k]) / soft) * 255; }
    x.putImageData(img, 0, 0); return F.c;
  }
  function rim(F, p, width = 0.03, soft = 0.012) {
    const x = F.rim.getContext('2d'), img = F.rimg || (F.rimg = x.createImageData(F.w, F.h)), d = img.data, f = F.f;
    for (let k = 0, i = 0; k < f.length; k++, i += 4) { const e = p - f[k]; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = (e > -soft && e < width) ? clamp(Math.min((e + soft) / soft, (width - e) / (width * 0.6))) * 255 : 0; }
    x.putImageData(img, 0, 0); return F.rim;
  }
  // cutBy(target, maskCanvas): keep only what the mask covers (mask is scaled to the target)
  function cutBy(target, m) { const x = target.getContext('2d'); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-in'; x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(m, 0, 0, target.width, target.height); x.restore(); return target; }
  Object.assign(K, { field, mask, rim, cutBy });

  // ---------------------------------------------------------------- gold leaf
  // gold(ctx, pathFn, x0, y0, x1, y1, o): burnished leaf over a path; o.sheen (0..1) moves the highlight along x0,y0 -> x1,y1;
  //   o.rule 'evenodd' for a frame drawn as two nested paths
  function gold(ctx, pathFn, x0, y0, x1, y1, o = {}) {
    const s = o.sheen != null ? o.sheen : 0.45, g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#6a4a1a'); g.addColorStop(clamp(s - 0.3), '#a9822f'); g.addColorStop(clamp(s - 0.08), '#dcbb68'); g.addColorStop(clamp(s), '#f8e7b0');
    g.addColorStop(clamp(s + 0.1), '#d2ab55'); g.addColorStop(clamp(s + 0.35), '#97722a'); g.addColorStop(1, '#6e4f1d');
    const rule = o.rule || 'nonzero';     // 'evenodd' makes a ring of two paths (a frame)
    ctx.save(); ctx.globalAlpha *= o.alpha != null ? o.alpha : 1; pathFn(ctx); ctx.fillStyle = g; ctx.fill(rule);
    ctx.clip(rule); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha *= 0.5;
    const bx = Math.min(x0, x1) - 2, by = Math.min(y0, y1) - 2; tile(ctx, goldTex(), bx, by, Math.abs(x1 - x0) + 4, Math.abs(y1 - y0) + 4, bx * 0.37, by * 0.53);
    ctx.restore();
    if (o.outline !== false) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = rgba(P.ink, 0.75); ctx.lineWidth = o.outlineW || 1.4; pathFn(ctx); ctx.stroke(); ctx.restore(); }
  }
  function goldTex() {
    return cached('kit:goldTex', () => {
      const s = 256, c = canvas(s, s), x = c.getContext('2d'), r = rng(515), img = x.createImageData(s, s);
      for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { const v = 128 + (fbm(i / 9, j / 9, 3, 8) - 0.5) * 150 + (r() - 0.5) * 40; const k = (j * s + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = clamp(v, 0, 255); img.data[k + 3] = 255; }
      x.putImageData(img, 0, 0); return c;
    });
  }
  K.gold = gold;

  // ---------------------------------------------------------------- figures (silhouettes in the manner of manuscript margins and shadow plays)
  // figure(ctx, x, y, h, o): a person standing on (x, y), h tall (crown to soles), facing o.face (1 right, -1 left).
  //   o.kind  'robe' (long gown, wide sleeves), 'gown' (fitted, long), 'tunic' (knee length, legs show), 'armour' (mail tunic, belt),
  //           'cloak' (tunic under a calf-length cloak), 'child', 'rags' (torn hem, bare shins)
  //   o.head  'bare','hair','hood','crown','helm','kettle','cap','coif','veil','mitre'
  //   o.hold  'spear','staff','banner','sword','raised','scroll','torch','bundle','basket','none' (near hand; 'raised' lifts a sword)
  //   o.walk  walk phase in radians (omit to stand); o.lean forward lean (radians); o.arm near-arm angle from hanging (+ forward),
  //           o.bend its elbow bend; o.farArm, o.farBend; o.seated (on a horse: legs astride, set by horse())
  //   o.style 'silhouette' (default: one fill, o.fill, ink) or 'painted' (o.robe, o.hose, o.skin, o.hairCol, o.veil, ink outline)
  //   o.mode composite mode ('multiply' on paper); o.shield a house (shield on the near arm); o.bannerFill / o.banner house;
  //   o.t time (torch flicker, banner wave); o.crownGold (default true); o.sheen gold highlight 0..1
  function figure(ctx, x, y, h, o = {}) {
    const f = o.face || 1, kind = o.kind || 'robe', child = kind === 'child', walk = o.walk, painted = o.style === 'painted';
    const ink = o.fill || P.ink;
    const C = painted
      ? { robe: o.robe || P.vermilion, hose: o.hose || P.umber, skin: o.skin || '#d8b48e', hair: o.hairCol || '#3b2716', veil: o.veil || '#ece4d2', steel: '#8b8e94', wood: '#5c4026' }
      : { robe: ink, hose: ink, skin: ink, hair: ink, veil: ink, steel: ink, wood: ink };
    const L = child
      ? { hx: 0.014, hy: -0.875, rx: 0.074, ry: 0.088, neck: -0.775, sh: -0.76, shw: 0.098, waist: -0.5, ww: 0.085, hip: -0.44, th: 0.205, sn: 0.195, ua: 0.15, fa: 0.13 }
      : { hx: 0.012, hy: -0.915, rx: 0.05, ry: 0.061, neck: -0.845, sh: -0.818, shw: 0.104, waist: -0.56, ww: 0.08, hip: -0.48, th: 0.23, sn: 0.21, ua: 0.19, fa: 0.17 };
    const legsShow = o.seated || ['tunic', 'armour', 'cloak', 'child', 'rags'].includes(kind);
    const HEM = { robe: [0, 0.19], gown: [0, 0.145], tunic: [-0.3, 0.13], armour: [-0.29, 0.135], cloak: [-0.3, 0.13], child: [-0.27, 0.13], rags: [-0.24, 0.14] }[kind] || [0, 0.19];
    // legs, grounded: the lower ankle sits on the ground, which gives the walk its bob
    const legs = [];
    if (legsShow && !o.seated) for (const s of [0, Math.PI]) {
      const ph = (walk != null ? walk : 0) + s, th = walk != null ? 0.42 * Math.sin(ph) : (s ? -0.045 : 0.05), flex = walk != null ? 0.06 + 0.62 * Math.max(0, Math.cos(ph)) : 0.03;
      const hipX = s ? -0.02 : 0.02, kx = hipX + Math.sin(th) * L.th, ky = L.hip + Math.cos(th) * L.th, sa = th - flex, ax = kx + Math.sin(sa) * L.sn, ay = ky + Math.cos(sa) * L.sn;
      legs.push({ hipX, kx, ky, ax, ay, far: s > 0 });
    }
    let lift = 0; if (legs.length) lift = -0.035 - Math.max(legs[0].ay, legs[1].ay);
    else if (walk != null) lift = -Math.abs(Math.sin(walk)) * 0.01;
    ctx.save(); ctx.translate(x, y); ctx.scale(f * h, h); ctx.translate(0, lift); if (o.lean) ctx.rotate(o.lean);
    if (o.mode) ctx.globalCompositeOperation = o.mode;
    const lw = (o.outline || 1.6) / h;
    const fillPart = (col, build, outline = painted) => { build(); ctx.fillStyle = col; ctx.fill(); if (outline) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = rgba(P.ink, 0.85); ctx.lineWidth = lw; ctx.lineJoin = 'round'; build(); ctx.stroke(); ctx.restore(); } };
    const taper = (pts, widths) => { const Lp = [], Rp = []; for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; Lp.push([pts[i][0] - dy / l * widths[i] / 2, pts[i][1] + dx / l * widths[i] / 2]); Rp.push([pts[i][0] + dy / l * widths[i] / 2, pts[i][1] - dx / l * widths[i] / 2]); } ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]); for (const q of Lp) ctx.lineTo(q[0], q[1]); for (let i = Rp.length - 1; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]); ctx.closePath(); };
    const legShape = (lg) => () => { taper([[lg.hipX, L.hip - 0.02], [lg.kx, lg.ky], [lg.ax, lg.ay]], [child ? 0.06 : 0.058, child ? 0.046 : 0.043, child ? 0.034 : 0.031]); ctx.moveTo(lg.ax - 0.022, lg.ay - 0.012); ctx.lineTo(lg.ax + 0.068, lg.ay + 0.012); ctx.lineTo(lg.ax + 0.07, lg.ay + 0.036); ctx.lineTo(lg.ax - 0.03, lg.ay + 0.036); ctx.closePath(); };
    // arms: shoulder -> elbow -> wrist
    const armAt = (near) => {
      const holdUp = ['spear', 'staff', 'banner', 'torch'].includes(o.hold);
      let a = near ? (o.arm != null ? o.arm : holdUp ? 0.32 : o.hold === 'raised' ? 2.6 : o.hold === 'sword' ? 0.2 : walk != null ? -0.32 * Math.sin(walk) : 0.06) : (o.farArm != null ? o.farArm : walk != null ? 0.32 * Math.sin(walk) : -0.05);
      const b = near ? (o.bend != null ? o.bend : holdUp ? 1.25 : o.hold === 'raised' ? 0.3 : 0.22) : (o.farBend != null ? o.farBend : 0.2);
      const sx = near ? 0.05 : -0.045, sy = L.sh + 0.032, ex = sx + Math.sin(a) * L.ua, ey = sy + Math.cos(a) * L.ua, wx = ex + Math.sin(a + b) * L.fa, wy = ey + Math.cos(a + b) * L.fa;
      return { sx, sy, ex, ey, wx, wy, a, b };
    };
    const drawArm = (A, sleeveCol) => {
      fillPart(sleeveCol, () => taper([[A.sx, A.sy], [A.ex, A.ey], [A.wx, A.wy]], [child ? 0.058 : 0.056, 0.044, 0.032]));
      if ((kind === 'robe' || kind === 'gown') && o.sleeve !== false) fillPart(sleeveCol, () => { ctx.beginPath(); ctx.moveTo(A.ex, A.ey); ctx.quadraticCurveTo(lerp(A.ex, A.wx, 0.7) - 0.01, lerp(A.ey, A.wy, 0.7) + 0.05, A.wx - 0.03, A.wy + (kind === 'robe' ? 0.11 : 0.06)); ctx.lineTo(A.wx + 0.012, A.wy - 0.005); ctx.lineTo(lerp(A.ex, A.wx, 0.35), lerp(A.ey, A.wy, 0.35) - 0.02); ctx.closePath(); });
      fillPart(C.skin, () => { ctx.beginPath(); ctx.ellipse(A.wx + Math.sin(A.a + A.b) * 0.012, A.wy + Math.cos(A.a + A.b) * 0.012, 0.021, 0.025, 0, 0, 6.283); });
    };
    const far = armAt(false), near = armAt(true);
    // what sits behind the body: far leg, far arm, a cloak, a bundle
    for (const lg of legs.filter(l => l.far)) fillPart(painted ? shade(C.hose, -0.25) : C.hose, legShape(lg));
    drawArm(far, painted ? shade(C.robe, -0.25) : C.robe);
    if (kind === 'cloak') fillPart(painted ? shade(C.robe, -0.15) : C.robe, () => { const sw = walk != null ? Math.sin(walk) * 0.02 : 0; ctx.beginPath(); ctx.moveTo(-0.02, L.neck + 0.005); ctx.quadraticCurveTo(-0.13, L.sh, -0.14, L.sh + 0.07); ctx.bezierCurveTo(-0.16, -0.45, -0.24 - sw, -0.25, -0.26 - sw * 2, -0.14); ctx.lineTo(0.02, -0.16); ctx.lineTo(0.06, L.sh + 0.05); ctx.closePath(); });
    if (o.hold === 'bundle') fillPart(painted ? '#7a6a52' : C.robe, () => { ctx.beginPath(); ctx.ellipse(-0.12, L.sh + 0.1, 0.085, 0.11, -0.3, 0, 6.283); });
    // body
    fillPart(C.robe, () => {
      const [hemY, hw] = o.seated ? [L.hip + 0.03, 0.12] : HEM, sw = walk != null ? Math.sin(walk * 2) * 0.012 : 0, fwd = walk != null ? 0.02 : 0, s = o.sway || 0;
      ctx.beginPath(); ctx.moveTo(-0.03, L.neck + 0.008);
      ctx.quadraticCurveTo(-L.shw + 0.005, L.neck + 0.01, -L.shw, L.sh + 0.03);
      ctx.bezierCurveTo(-L.shw - 0.006, L.sh + 0.1, -L.ww - 0.005, L.waist - 0.06, -L.ww, L.waist);
      ctx.bezierCurveTo(-L.ww - 0.03, L.waist + 0.15, -hw * 0.85 + s, hemY - 0.12, -hw - sw + s, hemY);
      if (kind === 'rags') { const n = 7; for (let k = 1; k <= n; k++) ctx.lineTo(lerp(-hw, hw, k / n) + s, hemY + (k % 2 ? 0.035 : -0.005)); }
      else ctx.quadraticCurveTo(s + fwd, hemY + (HEM[0] === 0 ? 0.012 : 0.008), hw + fwd + sw + s, hemY);
      ctx.bezierCurveTo(hw * 0.85 + s, hemY - 0.12, L.ww + 0.03, L.waist + 0.15, L.ww, L.waist);
      ctx.bezierCurveTo(L.ww + 0.005, L.waist - 0.06, L.shw + 0.006, L.sh + 0.1, L.shw, L.sh + 0.03);
      ctx.quadraticCurveTo(L.shw - 0.005, L.neck + 0.01, 0.03, L.neck + 0.008); ctx.closePath();
    });
    if (kind === 'armour' || o.belt) { ctx.save(); ctx.fillStyle = painted ? '#3a2a1a' : ink; ctx.fillRect(-L.ww - 0.012, L.waist - 0.008, 2 * L.ww + 0.024, 0.022); ctx.restore(); }
    if (painted && (kind === 'robe' || kind === 'gown')) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = rgba(P.ink, 0.35); ctx.lineWidth = lw * 0.8; for (const fx of [-0.07, -0.02, 0.04, 0.09]) { ctx.beginPath(); ctx.moveTo(fx * 0.5, L.waist + 0.05); ctx.quadraticCurveTo(fx * 0.9, -0.3, fx * 1.25, -0.02); ctx.stroke(); } ctx.restore(); }
    // legs in front of the hem; a seated rider's leg astride
    for (const lg of legs.filter(l => !l.far)) fillPart(C.hose, legShape(lg));
    if (o.seated) fillPart(C.hose, () => { taper([[0.0, L.hip + 0.02], [0.17, L.hip + 0.13], [0.15, L.hip + 0.36]], [0.07, 0.05, 0.035]); ctx.moveTo(0.13, L.hip + 0.35); ctx.lineTo(0.23, L.hip + 0.37); ctx.lineTo(0.22, L.hip + 0.395); ctx.lineTo(0.12, L.hip + 0.39); ctx.closePath(); });
    // neck and head
    fillPart(C.skin, () => { ctx.beginPath(); ctx.rect(-0.02, L.neck - 0.035, 0.042, 0.05); });
    const head = o.head || 'bare', R = L.rx, Ry = L.ry, hx = L.hx, hy = L.hy;
    if (head === 'veil') fillPart(C.veil, () => { ctx.beginPath(); ctx.moveTo(hx - R * 1.15, hy - Ry * 0.5); ctx.quadraticCurveTo(hx, hy - Ry * 1.55, hx + R * 1.1, hy - Ry * 0.55); ctx.quadraticCurveTo(hx + R * 0.4, hy + Ry * 0.5, hx - R * 0.2, hy + Ry * 2.6); ctx.lineTo(hx - R * 2.3, hy + Ry * 2.9); ctx.quadraticCurveTo(hx - R * 1.9, hy + Ry * 0.6, hx - R * 1.15, hy - Ry * 0.5); ctx.closePath(); });
    if (head === 'hair') fillPart(C.hair, () => { ctx.beginPath(); ctx.ellipse(hx - R * 0.25, hy - Ry * 0.12, R * 1.1, Ry * 1.05, -0.2, 0, 6.283); });
    fillPart(C.skin, () => { ctx.beginPath(); ctx.ellipse(hx, hy, R, Ry, 0, 0, 6.283); ctx.moveTo(hx + R * 0.86, hy - Ry * 0.15); ctx.lineTo(hx + R * 1.24, hy + Ry * 0.18); ctx.lineTo(hx + R * 0.8, hy + Ry * 0.4); ctx.closePath(); });
    if (painted && head !== 'helm') { ctx.save(); ctx.fillStyle = rgba(P.ink, 0.8); ctx.beginPath(); ctx.ellipse(hx + R * 0.5, hy - Ry * 0.1, R * 0.09, R * 0.06, 0, 0, 6.283); ctx.fill(); ctx.restore(); }
    if (head === 'hood' || head === 'coif') fillPart(head === 'hood' ? C.robe : C.veil, () => { ctx.beginPath(); ctx.moveTo(hx + R * 0.95, hy + Ry * 0.85); ctx.quadraticCurveTo(hx + R * 1.55, hy - Ry * 1.2, hx - R * 0.1, hy - Ry * 1.45); ctx.quadraticCurveTo(hx - R * 1.75, hy - Ry * 1.3, hx - R * 1.55, hy + Ry * 0.4); if (head === 'hood') { ctx.quadraticCurveTo(hx - R * 2.5, hy + Ry * 1.6, hx - R * 2.6, hy + Ry * 2.1); ctx.lineTo(hx + R * 1.9, hy + Ry * 2.0); } else ctx.lineTo(hx - R * 1.2, hy + Ry * 1.1); ctx.quadraticCurveTo(hx + R * 0.4, hy + Ry * 1.5, hx + R * 0.95, hy + Ry * 0.85); ctx.moveTo(hx + R * 0.55, hy + Ry * 0.75); ctx.quadraticCurveTo(hx + R * 1.0, hy - Ry * 0.5, hx + R * 0.2, hy - Ry * 0.95); ctx.quadraticCurveTo(hx - R * 0.5, hy - Ry * 0.4, hx + R * 0.55, hy + Ry * 0.75); });
    if (head === 'helm') fillPart(C.steel, () => { ctx.beginPath(); ctx.moveTo(hx - R * 1.12, hy + Ry * 0.25); ctx.quadraticCurveTo(hx - R * 1.15, hy - Ry * 1.35, hx + R * 0.1, hy - Ry * 1.8); ctx.quadraticCurveTo(hx + R * 1.2, hy - Ry * 1.3, hx + R * 1.12, hy + Ry * 0.25); ctx.closePath(); ctx.rect(hx + R * 0.6, hy - Ry * 0.3, R * 0.28, Ry * 1.15); });
    if (head === 'kettle') fillPart(C.steel, () => { ctx.beginPath(); ctx.moveTo(hx - R * 1.9, hy - Ry * 0.25); ctx.quadraticCurveTo(hx, hy - Ry * 0.6, hx + R * 1.9, hy - Ry * 0.25); ctx.lineTo(hx + R * 1.0, hy - Ry * 0.55); ctx.quadraticCurveTo(hx, hy - Ry * 1.9, hx - R * 1.0, hy - Ry * 0.55); ctx.closePath(); });
    if (head === 'cap') fillPart(C.robe, () => { ctx.beginPath(); ctx.ellipse(hx - R * 0.1, hy - Ry * 0.55, R * 1.08, Ry * 0.7, -0.1, Math.PI, 0); ctx.closePath(); ctx.rect(hx - R * 1.15, hy - Ry * 0.62, R * 2.3, Ry * 0.25); });
    if (head === 'mitre') fillPart(painted ? '#efe7d6' : C.robe, () => { ctx.beginPath(); ctx.moveTo(hx - R * 0.95, hy - Ry * 0.5); ctx.quadraticCurveTo(hx - R * 1.1, hy - Ry * 2.2, hx, hy - Ry * 3.0); ctx.quadraticCurveTo(hx + R * 1.1, hy - Ry * 2.2, hx + R * 0.95, hy - Ry * 0.5); ctx.closePath(); });
    if (head === 'crown') {
      const cy0 = hy - Ry * 0.6, cw = R * 1.12, chh = Ry * 1.05;
      const path = c => { c.beginPath(); c.moveTo(hx - cw, cy0); c.lineTo(hx - cw, cy0 - chh * 0.7); c.lineTo(hx - cw * 0.5, cy0 - chh * 0.35); c.lineTo(hx, cy0 - chh); c.lineTo(hx + cw * 0.5, cy0 - chh * 0.35); c.lineTo(hx + cw, cy0 - chh * 0.7); c.lineTo(hx + cw, cy0); c.closePath(); };
      if (o.crownGold !== false) { ctx.save(); ctx.globalCompositeOperation = 'source-over'; gold(ctx, path, hx - cw, cy0 - chh, hx + cw, cy0, { sheen: o.sheen != null ? o.sheen : 0.5, outlineW: lw }); ctx.restore(); } else fillPart(ink, () => path(ctx));
    }
    // what the near hand holds, then the near arm over it
    const gx = near.wx + Math.sin(near.a + near.b) * 0.012, gy = near.wy + Math.cos(near.a + near.b) * 0.012;
    ctx.lineCap = 'round';
    if (['spear', 'staff', 'banner', 'torch'].includes(o.hold)) {
      const top = o.hold === 'torch' ? gy - 0.3 : o.hold === 'staff' ? -1.05 : -1.34, bot = o.hold === 'torch' ? gy + 0.12 : 0.02;
      fillPart(C.wood, () => { ctx.beginPath(); ctx.rect(gx - (o.hold === 'staff' ? 0.011 : 0.007), top, o.hold === 'staff' ? 0.022 : 0.014, bot - top); });
      if (o.hold === 'spear') fillPart(C.steel, () => { ctx.beginPath(); ctx.moveTo(gx, top - 0.12); ctx.quadraticCurveTo(gx + 0.03, top - 0.05, gx + 0.012, top + 0.01); ctx.lineTo(gx - 0.012, top + 0.01); ctx.quadraticCurveTo(gx - 0.03, top - 0.05, gx, top - 0.12); ctx.closePath(); });
      if (o.hold === 'staff' && kind !== 'armour') fillPart(C.wood, () => { ctx.beginPath(); ctx.arc(gx + 0.03, top + 0.005, 0.035, Math.PI, Math.PI * 2.2); ctx.lineTo(gx + 0.011, top + 0.02); ctx.lineTo(gx - 0.011, top + 0.02); ctx.closePath(); });
      if (o.hold === 'banner') {
        const bw = 0.36, bh = 0.25, bx = gx + 0.007, by = top + 0.02, wv = (o.t || 0) * 2.2 + (o.seed || 0), col = o.banner ? o.banner.field : (o.bannerFill || C.robe);
        ctx.save(); ctx.scale(f, 1);
        const sx = v => v * f;
        ctx.beginPath(); ctx.moveTo(sx(bx), by); for (let k = 0; k <= 10; k++) ctx.lineTo(sx(bx + bw * k / 10), by + Math.sin(k * 0.7 + wv) * 0.014 * (k / 10)); ctx.lineTo(sx(bx + bw), by + bh * 0.55); ctx.lineTo(sx(bx + bw * 0.84), by + bh * 0.45); ctx.lineTo(sx(bx + bw * 0.82), by + bh);
        for (let k = 10; k >= 0; k--) ctx.lineTo(sx(bx + bw * 0.82 * k / 10), by + bh + Math.sin(k * 0.7 + wv) * 0.014 * (k / 10)); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
        if (o.banner && o.banner.device !== 'none') { ctx.clip(); ctx.fillStyle = o.banner.charge; device(ctx, o.banner.device, sx(bx + bw * 0.4), by + bh * 0.48, bh * 0.38); }
        ctx.restore();
      }
      if (o.hold === 'torch') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const fl = 1 + 0.18 * Math.sin((o.t || 0) * 13 + x * 0.1) + 0.1 * Math.sin((o.t || 0) * 23 + x); const g = ctx.createRadialGradient(gx, top - 0.03, 0, gx, top - 0.03, 0.13 * fl); g.addColorStop(0, 'rgba(255,224,160,0.95)'); g.addColorStop(0.25, 'rgba(244,140,56,0.6)'); g.addColorStop(1, 'rgba(120,30,10,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, top - 0.03, 0.13 * fl, 0, 6.283); ctx.fill(); ctx.restore(); }
    }
    if (o.hold === 'sword' || o.hold === 'raised') { const d = o.hold === 'raised' ? [Math.sin(near.a + near.b), Math.cos(near.a + near.b)] : [0.25, 0.97]; fillPart(C.steel, () => { taper([[gx, gy], [gx + d[0] * 0.42, gy + d[1] * 0.42]], [0.026, 0.008]); }); fillPart(C.wood, () => { ctx.beginPath(); ctx.moveTo(gx - d[1] * 0.05, gy + d[0] * 0.05); ctx.lineTo(gx + d[1] * 0.05, gy - d[0] * 0.05); ctx.lineWidth = 0.016; ctx.strokeStyle = C.wood; ctx.stroke(); ctx.beginPath(); }); }
    if (o.hold === 'scroll') fillPart(painted ? '#e8dcc0' : ink, () => { ctx.beginPath(); ctx.rect(gx - 0.014, gy - 0.065, 0.028, 0.13); });
    if (o.hold === 'basket') fillPart(painted ? '#8a6a3a' : ink, () => { ctx.beginPath(); ctx.moveTo(gx - 0.07, gy + 0.03); ctx.lineTo(gx + 0.07, gy + 0.03); ctx.lineTo(gx + 0.05, gy + 0.12); ctx.lineTo(gx - 0.05, gy + 0.12); ctx.closePath(); });
    drawArm(near, C.robe);
    if (o.shield) { const hs = o.shield === true ? null : o.shield; ctx.save(); ctx.scale(f, 1); const sx = (near.ex + 0.03) * f, sy = near.ey - 0.03; if (hs) shield(ctx, sx, sy, 0.1, hs, { shape: 'kite', rim: true }); else { shieldPath(ctx, sx, sy, 0.1, 'kite'); ctx.fillStyle = ink; ctx.fill(); } ctx.restore(); }
    ctx.restore();
  }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const m = v => clamp(Math.round(v * (1 + k)), 0, 255); return `rgb(${m(n >> 16 & 255)},${m(n >> 8 & 255)},${m(n & 255)})`; }
  // crowd(ctx, x0, x1, y, h, n, seed, o): a row of varied people between x0 and x1 standing on y; o is passed to every figure,
  //   o.kinds / o.heads / o.holds lists to choose from, o.depth (0..1) spreads them back in rows (smaller, fainter), o.walk speed
  function crowd(ctx, x0, x1, y, h, n, seed, o = {}) {
    const r = rng(seed), kinds = o.kinds || ['robe', 'tunic', 'cloak', 'gown'], heads = o.heads || ['bare', 'hood', 'cap', 'hair', 'coif'], holds = o.holds || ['none', 'none', 'staff'];
    const people = Array.from({ length: n }, (_, i) => ({ u: (i + 0.5 + (r() - 0.5) * 0.7) / n, d: o.depth ? r() * o.depth : 0, k: kinds[Math.floor(r() * kinds.length)], hd: heads[Math.floor(r() * heads.length)], hl: holds[Math.floor(r() * holds.length)], s: 0.9 + r() * 0.18, f: o.face || (r() < 0.5 ? 1 : -1), ph: r() * 6.283, ch: r() < (o.children || 0) }));
    people.sort((a, b) => b.d - a.d);
    for (const p of people) {
      const sc = (1 - p.d * 0.35) * p.s * (p.ch ? 0.62 : 1), yy = y - p.d * h * 0.35;
      figure(ctx, lerp(x0, x1, p.u), yy, h * sc, Object.assign({}, o, { kind: p.ch ? 'child' : p.k, head: p.ch ? 'bare' : p.hd, hold: p.ch ? 'none' : p.hl, face: p.f, walk: o.walk != null ? o.walk + p.ph : undefined, fill: o.depth ? mixInk(o.fill || P.ink, p.d * 0.5) : o.fill }));
    }
  }
  function mixInk(hex, k) { const n = parseInt(hex.slice(1), 16), b = [196, 178, 144]; const m = (v, i) => Math.round(lerp(v, b[i], k)); return `rgb(${m(n >> 16 & 255, 0)},${m(n >> 8 & 255, 1)},${m(n & 255, 2)})`; }
  // horse(ctx, x, y, h, o): a horse standing on (x, y), h tall at the withers, facing o.face. o.walk gait phase; o.fill; o.mode;
  //   o.caparison colour (or o.house) for a cloth over it; o.rider: figure options for a seated rider (drawn astride)
  function horse(ctx, x, y, h, o = {}) {
    const f = o.face || 1, ph = o.walk, col = o.fill || P.ink;
    ctx.save(); ctx.translate(x, y); ctx.scale(f * h, h); if (o.mode) ctx.globalCompositeOperation = o.mode; ctx.fillStyle = col;
    const bob = ph != null ? Math.sin(ph * 2) * 0.012 : 0;
    const leg = (hx, hy, off, front) => {
      const a = ph != null ? Math.sin(ph + off) * 0.36 : 0, k = ph != null ? Math.max(0, Math.cos(ph + off)) * 0.7 : 0;
      const u1 = front ? 0.34 : 0.3, kx = hx + Math.sin(a) * u1, ky = hy + Math.cos(a) * u1, b = front ? a - k : a + k * 0.8 - 0.25, fx = kx + Math.sin(b) * 0.3, fy = ky + Math.cos(b) * 0.3;
      const pa = b + (front ? 0.25 : 0.2), px = fx + Math.sin(pa) * 0.07, py = Math.min(-0.005, fy + Math.cos(pa) * 0.07);
      const pts = [[hx, hy], [kx, ky], [fx, fy], [px, py]], wd = [0.14, 0.07, 0.05, 0.055], Lp = [], Rp = [];
      for (let i = 0; i < pts.length; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(3, i + 1)], dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1; Lp.push([pts[i][0] - dy / l * wd[i] / 2, pts[i][1] + dx / l * wd[i] / 2]); Rp.push([pts[i][0] + dy / l * wd[i] / 2, pts[i][1] - dx / l * wd[i] / 2]); }
      ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]); for (const q of Lp) ctx.lineTo(q[0], q[1]); for (let i = 3; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(px - 0.035, py - 0.02); ctx.lineTo(px + 0.045, py - 0.02); ctx.lineTo(px + 0.05, py + 0.012); ctx.lineTo(px - 0.04, py + 0.012); ctx.closePath(); ctx.fill();
    };
    // far legs first (a touch lighter would read as depth; in silhouette they share the fill)
    leg(0.36, -0.7 + bob, Math.PI * 0.5, true); leg(-0.44, -0.72 + bob, Math.PI * 1.5, false);
    ctx.beginPath();
    ctx.moveTo(0.27, -1.0 + bob); ctx.bezierCurveTo(0.12, -0.95 + bob, -0.05, -0.93 + bob, -0.2, -0.955 + bob); ctx.bezierCurveTo(-0.38, -0.99 + bob, -0.52, -0.99 + bob, -0.6, -0.9 + bob);
    ctx.bezierCurveTo(-0.66, -0.82 + bob, -0.64, -0.7 + bob, -0.56, -0.64 + bob); ctx.bezierCurveTo(-0.4, -0.58 + bob, 0.15, -0.56 + bob, 0.36, -0.62 + bob);
    ctx.bezierCurveTo(0.5, -0.66 + bob, 0.55, -0.74 + bob, 0.53, -0.84 + bob);
    ctx.bezierCurveTo(0.6, -0.98 + bob, 0.66, -1.12 + bob, 0.7, -1.24 + bob);        // throat
    ctx.bezierCurveTo(0.78, -1.2 + bob, 0.9, -1.12 + bob, 0.97, -1.12 + bob);        // jaw to muzzle
    ctx.bezierCurveTo(1.01, -1.15 + bob, 1.0, -1.2 + bob, 0.95, -1.24 + bob);
    ctx.bezierCurveTo(0.88, -1.32 + bob, 0.8, -1.42 + bob, 0.72, -1.47 + bob);        // face to poll
    ctx.lineTo(0.71, -1.56 + bob); ctx.lineTo(0.665, -1.47 + bob);                  // ear
    ctx.bezierCurveTo(0.56, -1.4 + bob, 0.42, -1.16 + bob, 0.27, -1.0 + bob);       // crest
    ctx.closePath(); ctx.fill();
    // mane and tail
    ctx.beginPath(); ctx.moveTo(0.66, -1.47 + bob); for (let k = 0; k <= 8; k++) { const u = k / 8; ctx.lineTo(lerp(0.66, 0.28, u) - 0.045 - (k % 2) * 0.03, lerp(-1.47, -1.0, u) + bob + (k % 2) * 0.02); } ctx.lineTo(0.28, -1.0 + bob); ctx.closePath(); ctx.fill();
    const tw = ph != null ? Math.sin(ph) * 0.05 : 0;
    ctx.beginPath(); ctx.moveTo(-0.58, -0.93 + bob); ctx.bezierCurveTo(-0.72, -0.88 + bob, -0.76 + tw, -0.6, -0.72 + tw * 1.5, -0.36); ctx.lineTo(-0.66 + tw, -0.4); ctx.bezierCurveTo(-0.68, -0.62 + bob, -0.64, -0.8 + bob, -0.56, -0.86 + bob); ctx.closePath(); ctx.fill();
    if (o.caparison || o.house) {
      const hs = o.house; ctx.save(); ctx.fillStyle = hs ? hs.field : o.caparison;
      ctx.beginPath(); ctx.moveTo(-0.52, -0.96 + bob); ctx.bezierCurveTo(-0.2, -0.93 + bob, 0.15, -0.95 + bob, 0.42, -0.98 + bob); ctx.lineTo(0.5, -0.5 + bob); for (let k = 0; k <= 10; k++) ctx.lineTo(lerp(0.5, -0.56, k / 10), -0.48 + bob + (k % 2) * 0.035); ctx.closePath(); ctx.fill();
      if (hs && hs.device !== 'none') { ctx.clip(); ctx.fillStyle = hs.charge; device(ctx, hs.device, -0.05, -0.72 + bob, 0.17); }
      ctx.restore();
    }
    leg(0.42, -0.7 + bob, Math.PI * 1.5, true); leg(-0.38, -0.72 + bob, Math.PI * 0.5, false);
    ctx.restore();
    if (o.rider) figure(ctx, x - f * h * 0.02, y - h * (0.97 - bob) + h * 0.5 * 1.1 * 0.48, h * 1.1, Object.assign({ kind: 'tunic', face: f, fill: col, mode: o.mode }, o.rider, { walk: undefined, seated: true }));
  }
  Object.assign(K, { figure, horse, crowd, shade });

  // ---------------------------------------------------------------- heraldry
  // shieldPath(ctx, x, y, s, shape): 'heater' (default) or 'kite'; (x, y) is the centre of the chief, s the half-width
  function shieldPath(ctx, x, y, s, shape = 'heater') {
    ctx.beginPath();
    if (shape === 'kite') { ctx.moveTo(x - s, y - s * 0.6); ctx.quadraticCurveTo(x, y - s * 1.2, x + s, y - s * 0.6); ctx.quadraticCurveTo(x + s * 0.9, y + s * 1.1, x, y + s * 2.1); ctx.quadraticCurveTo(x - s * 0.9, y + s * 1.1, x - s, y - s * 0.6); }
    else { ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y - s); ctx.lineTo(x + s, y + 0.05 * s); ctx.bezierCurveTo(x + s, y + 0.75 * s, x + 0.45 * s, y + 1.05 * s, x, y + 1.25 * s); ctx.bezierCurveTo(x - 0.45 * s, y + 1.05 * s, x - s, y + 0.75 * s, x - s, y + 0.05 * s); }
    ctx.closePath();
  }
  // the seven Great Houses, told by what they hold. The names in the story concept are working placeholders: never draw them.
  const HOUSES = [
    { key: 'armies', field: '#8a2a1d', charge: '#eadfc6', device: 'tower' },     // commanded the armies
    { key: 'grain', field: '#c39a43', charge: '#2a2a1a', device: 'sheaf' },      // guarded the winter grain
    { key: 'roads', field: '#2c3f78', charge: '#e3c46c', device: 'scales' },     // controlled the roads and trade
    { key: 'iron', field: '#221d19', charge: '#cfc8b8', device: 'hammer' },      // forged the weapons
    { key: 'laws', field: '#e8dfca', charge: '#8a2a1d', device: 'tree' },        // preserved the laws and the blood registries
    { key: 'frontier', field: '#2f5a46', charge: '#e8dcbc', device: 'thorn' },   // held the dangerous frontiers
    { key: 'beasts', field: '#4c3270', charge: '#dcb963', device: 'wyvern' },    // claimed dominion over the First-Born
  ];
  const LESSER = { key: 'ealdholt', field: '#6e5236', charge: '#e4d5b2', device: 'sprig' };   // a lesser banner: Ealdholt
  const BLANK = { key: 'blank', field: '#e9e2d0', charge: '#e9e2d0', device: 'none' };
  // device(ctx, name, x, y, s): draw a charge filling about ±0.62 s around (x, y) with the current fillStyle
  function device(ctx, name, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const F = () => ctx.fill();
    switch (name) {
      case 'tower': ctx.beginPath(); ctx.moveTo(-0.38, 0.62); ctx.lineTo(-0.32, -0.3); ctx.lineTo(-0.42, -0.3); ctx.lineTo(-0.42, -0.6); for (let i = 0; i < 5; i++) { const x0 = -0.42 + i * 0.21; ctx.lineTo(x0, -0.6); ctx.lineTo(x0, -0.72); ctx.lineTo(x0 + 0.105, -0.72); ctx.lineTo(x0 + 0.105, -0.6); } ctx.lineTo(0.42, -0.6); ctx.lineTo(0.42, -0.3); ctx.lineTo(0.32, -0.3); ctx.lineTo(0.38, 0.62); ctx.closePath(); F(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.moveTo(-0.11, 0.62); ctx.lineTo(-0.11, 0.3); ctx.arc(0, 0.3, 0.11, Math.PI, 0); ctx.lineTo(0.11, 0.62); ctx.fill(); ctx.fillRect(-0.05, -0.2, 0.1, 0.18); break;
      case 'sheaf': for (let i = -4; i <= 4; i++) { const a = i * 0.09; ctx.save(); ctx.rotate(a); ctx.fillRect(-0.018, -0.35, 0.036, 0.95); ctx.beginPath(); ctx.ellipse(0, -0.48, 0.055, 0.16, 0, 0, 6.283); F(); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(0.05, -0.56 + k * 0.08, 0.03, 0.05, 0.6, 0, 6.283); F(); ctx.beginPath(); ctx.ellipse(-0.05, -0.56 + k * 0.08, 0.03, 0.05, -0.6, 0, 6.283); F(); } ctx.restore(); } ctx.fillRect(-0.24, 0.08, 0.48, 0.1); break;
      case 'scales': ctx.fillRect(-0.035, -0.62, 0.07, 1.1); ctx.fillRect(-0.55, -0.48, 1.1, 0.06); ctx.beginPath(); ctx.arc(0, -0.66, 0.07, 0, 6.283); F(); for (const sx of [-0.45, 0.45]) { ctx.lineWidth = 0.025; ctx.strokeStyle = ctx.fillStyle; ctx.beginPath(); ctx.moveTo(sx, -0.45); ctx.lineTo(sx - 0.17, -0.05); ctx.moveTo(sx, -0.45); ctx.lineTo(sx + 0.17, -0.05); ctx.stroke(); ctx.beginPath(); ctx.moveTo(sx - 0.22, -0.06); ctx.quadraticCurveTo(sx, 0.18, sx + 0.22, -0.06); ctx.closePath(); F(); } ctx.fillRect(-0.25, 0.46, 0.5, 0.08); break;
      case 'hammer': ctx.beginPath(); ctx.moveTo(-0.5, 0.18); ctx.lineTo(0.5, 0.18); ctx.lineTo(0.32, 0.3); ctx.lineTo(0.18, 0.3); ctx.lineTo(0.22, 0.56); ctx.lineTo(-0.22, 0.56); ctx.lineTo(-0.18, 0.3); ctx.lineTo(-0.4, 0.3); ctx.closePath(); F(); ctx.save(); ctx.rotate(-0.55); ctx.fillRect(-0.04, -0.68, 0.08, 0.72); ctx.fillRect(-0.24, -0.78, 0.48, 0.17); ctx.restore(); break;
      case 'tree': ctx.beginPath(); ctx.moveTo(-0.07, 0.62); ctx.lineTo(-0.05, 0.0); ctx.lineTo(0.05, 0.0); ctx.lineTo(0.07, 0.62); ctx.closePath(); F(); for (const [bx, by, r] of [[0, -0.32, 0.3], [-0.28, -0.12, 0.2], [0.28, -0.12, 0.2], [-0.18, -0.5, 0.18], [0.18, -0.5, 0.18], [0, -0.62, 0.14]]) { ctx.beginPath(); ctx.arc(bx, by, r, 0, 6.283); F(); } ctx.lineWidth = 0.05; ctx.strokeStyle = ctx.fillStyle; ctx.beginPath(); ctx.moveTo(-0.05, 0.62); ctx.quadraticCurveTo(-0.3, 0.55, -0.4, 0.62); ctx.moveTo(0.05, 0.62); ctx.quadraticCurveTo(0.3, 0.55, 0.4, 0.62); ctx.stroke(); break;
      case 'thorn': ctx.lineWidth = 0.07; ctx.strokeStyle = ctx.fillStyle; ctx.beginPath(); ctx.moveTo(-0.45, 0.55); ctx.bezierCurveTo(-0.2, 0.1, 0.1, -0.1, 0.45, -0.6); ctx.stroke(); for (let k = 0; k < 6; k++) { const u = 0.12 + k * 0.15, px = lerp(-0.45, 0.45, u), py = lerp(0.55, -0.6, u) + Math.sin(u * 3) * 0.05, side = k % 2 ? 1 : -1; ctx.beginPath(); ctx.moveTo(px - 0.04, py); ctx.lineTo(px + side * 0.17, py + side * 0.1 - 0.06); ctx.lineTo(px + 0.04, py - 0.04); ctx.closePath(); F(); } ctx.beginPath(); ctx.ellipse(0.12, -0.3, 0.12, 0.06, -0.9, 0, 6.283); F(); ctx.beginPath(); ctx.ellipse(-0.18, 0.18, 0.12, 0.06, -0.6, 0, 6.283); F(); break;
      case 'wyvern': ctx.beginPath(); ctx.moveTo(-0.05, 0.5); ctx.bezierCurveTo(-0.3, 0.55, -0.55, 0.4, -0.5, 0.2); ctx.bezierCurveTo(-0.45, 0.35, -0.25, 0.4, -0.12, 0.3); ctx.lineTo(-0.15, 0.05); ctx.lineTo(-0.6, -0.5); ctx.lineTo(-0.38, -0.42); ctx.lineTo(-0.42, -0.62); ctx.lineTo(-0.18, -0.4); ctx.lineTo(-0.15, -0.6); ctx.lineTo(0.0, -0.18); ctx.lineTo(0.12, -0.38); ctx.quadraticCurveTo(0.2, -0.6, 0.38, -0.62); ctx.lineTo(0.52, -0.55); ctx.lineTo(0.36, -0.5); ctx.quadraticCurveTo(0.25, -0.38, 0.2, -0.2); ctx.lineTo(0.15, 0.08); ctx.lineTo(0.28, 0.3); ctx.lineTo(0.18, 0.32); ctx.lineTo(0.08, 0.2); ctx.lineTo(0.05, 0.42); ctx.closePath(); F(); break;
      case 'sprig': ctx.lineWidth = 0.05; ctx.strokeStyle = ctx.fillStyle; ctx.beginPath(); ctx.moveTo(0, 0.6); ctx.quadraticCurveTo(0.04, 0.1, 0, -0.45); ctx.stroke(); for (const [a, py] of [[-0.9, 0.2], [0.9, 0.05], [-0.8, -0.15], [0.85, -0.3]]) { ctx.save(); ctx.translate(0, py); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0.17, 0, 0.17, 0.07, 0, 0, 6.283); F(); ctx.restore(); } ctx.beginPath(); ctx.ellipse(0, -0.52, 0.07, 0.09, 0, 0, 6.283); F(); ctx.fillRect(-0.08, -0.62, 0.16, 0.05); break;
      default: break;
    }
    ctx.restore();
  }
  // shield(ctx, x, y, s, house, o): a painted shield with its charge, a gold rim and soft shading. o.alpha, o.shape, o.sheen
  function shield(ctx, x, y, s, house, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha != null ? o.alpha : 1;
    shieldPath(ctx, x, y, s, o.shape); ctx.fillStyle = house.field; ctx.fill();
    ctx.save(); shieldPath(ctx, x, y, s, o.shape); ctx.clip();
    ctx.fillStyle = house.charge; if (house.device !== 'none') device(ctx, house.device, x, y + s * 0.12, s * 0.82);
    const g = ctx.createLinearGradient(x - s, y - s, x + s, y + s); g.addColorStop(0, 'rgba(255,245,220,0.22)'); g.addColorStop(0.5, 'rgba(255,245,220,0)'); g.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = g; ctx.fillRect(x - s, y - s, 2 * s, 2.4 * s);
    ctx.restore();
    if (o.rim !== false) { ctx.lineWidth = Math.max(1, s * 0.07); const gr = ctx.createLinearGradient(x - s, y - s, x + s, y + s); gr.addColorStop(0, '#f2dc9a'); gr.addColorStop(0.5, '#a98235'); gr.addColorStop(1, '#6d4f1e'); ctx.strokeStyle = gr; shieldPath(ctx, x, y, s, o.shape); ctx.stroke(); }
    ctx.restore();
  }
  // bannerCloth(house, w, h): the flat cloth of a hanging banner (cached); banner() hangs and waves it
  function bannerCloth(house, w, h, key) {
    return cached(`kit:banner:${key || house.key}:${w}x${h}`, () => {
      const c = canvas(w, h), x = c.getContext('2d');
      x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w, h * 0.86); x.lineTo(w / 2, h); x.lineTo(0, h * 0.86); x.closePath(); x.fillStyle = house.field; x.fill(); x.save(); x.clip();
      const r = rng(w + h); for (let i = 0; i < w * h / 30; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,250,235'},${0.025 + r() * 0.03})`; x.fillRect(r() * w, r() * h, 1 + r() * 2, 1); }
      x.fillStyle = house.charge; if (house.device !== 'none') device(x, house.device, w / 2, h * 0.45, w * 0.36);
      x.strokeStyle = '#c9a14a'; x.lineWidth = Math.max(2, w * 0.03); x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w, h * 0.86); x.lineTo(w / 2, h); x.lineTo(0, h * 0.86); x.closePath(); x.stroke();
      x.restore(); return c;
    });
  }
  // banner(ctx, x, y, w, h, house, t, o): a banner hanging from a crossbar at (x, y), rippling. o.wind (0..1), o.alpha, o.light
  function banner(ctx, x, y, w, h, house, t, o = {}) {
    const cloth = bannerCloth(house, Math.round(w), Math.round(h), o.key), n = 24, wind = o.wind != null ? o.wind : 0.5;
    ctx.save(); ctx.globalAlpha *= o.alpha != null ? o.alpha : 1;
    for (let i = 0; i < n; i++) {
      const u = i / n, sx = u * cloth.width, sw = cloth.width / n + 0.6;
      const ph = t * 1.7 + u * 5 + (o.seed || 0), dy = Math.sin(ph) * wind * h * 0.025 * (0.3 + u), dx = Math.sin(ph * 0.7) * wind * w * 0.01;
      ctx.drawImage(cloth, sx, 0, sw, cloth.height, x - w / 2 + u * w + dx, y + dy, sw * w / cloth.width, h);
      const sh = Math.cos(ph) * wind * 0.22;
      ctx.fillStyle = sh > 0 ? `rgba(255,240,210,${sh * 0.5})` : `rgba(0,0,0,${-sh})`; ctx.globalCompositeOperation = 'source-atop';
      ctx.fillRect(x - w / 2 + u * w + dx, y + dy, sw * w / cloth.width, h); ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = '#2a1d12'; ctx.fillRect(x - w / 2 - w * 0.08, y - h * 0.025, w * 1.16, h * 0.03);
    ctx.restore();
  }
  Object.assign(K, { shieldPath, HOUSES, LESSER, BLANK, device, shield, banner, bannerCloth });

  // ---------------------------------------------------------------- map glyphs, in the manner of old charts
  // mountain(ctx, x, y, s, seed): a peak with a hatched shadow side (ink, multiply)
  function mountain(ctx, x, y, s, seed = 1, o = {}) {
    const r = rng(seed), lean = (r() - 0.5) * 0.3, hgt = s * (0.8 + r() * 0.5), pk = [x + lean * s, y - hgt];
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = ctx.strokeStyle = o.color || P.ink;
    const left = wobble(resample([[x - s * 0.62, y], pk], 4), s * 0.03, 0.08, seed), right = wobble(resample([pk, [x + s * 0.62, y]], 4), s * 0.03, 0.08, seed + 1);
    if (o.fill) { ctx.save(); ctx.fillStyle = o.fill; poly(ctx, left.concat(right)); ctx.fill(); ctx.restore(); }
    ctx.lineWidth = Math.max(1, s * 0.035); ctx.lineJoin = 'round';
    line(ctx, left, 1); line(ctx, right, 1);
    ctx.lineWidth = Math.max(0.6, s * 0.018);
    const nh = 4 + Math.floor(s / 10);
    for (let k = 1; k <= nh; k++) { const u = k / (nh + 1), ax = lerp(pk[0], x + s * 0.62, u), ay = lerp(pk[1], y, u); ctx.beginPath(); ctx.moveTo(ax - s * 0.02, ay + s * 0.02); ctx.lineTo(ax - s * 0.2 * (1 - u * 0.3), ay + s * 0.18); ctx.stroke(); }
    ctx.restore();
  }
  // tree(ctx, x, y, s, kind): 'pine' or 'oak' map tree
  function tree(ctx, x, y, s, kind = 'pine', o = {}) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = ctx.strokeStyle = o.color || P.ink; ctx.lineWidth = Math.max(0.8, s * 0.06);
    if (kind === 'pine') { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.32, y - s * 0.2); ctx.lineTo(x + s * 0.08, y - s * 0.2); ctx.lineTo(x + s * 0.08, y); ctx.lineTo(x - s * 0.08, y); ctx.lineTo(x - s * 0.08, y - s * 0.2); ctx.lineTo(x - s * 0.32, y - s * 0.2); ctx.closePath(); if (o.solid) ctx.fill(); else ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(x, y - s * 0.62, s * 0.34, 0, 6.283); if (o.solid) ctx.fill(); else ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y - s * 0.3); ctx.lineTo(x, y); ctx.stroke(); }
    ctx.restore();
  }
  // compass(ctx, x, y, r, sheen): an eight-point rose with gold north
  function compass(ctx, x, y, r, sheen = 0.5) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = P.ink; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, r * 0.86, 0, 6.283); ctx.stroke();
    for (let k = 0; k < 32; k++) { const a = k / 32 * 6.283; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86); ctx.lineTo(x + Math.cos(a) * r * (k % 4 ? 0.8 : 0.74), y + Math.sin(a) * r * (k % 4 ? 0.8 : 0.74)); ctx.stroke(); }
    ctx.restore();
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * 6.283 - Math.PI / 2, L = k % 2 ? r * 0.55 : r * 1.0, wd = k % 2 ? r * 0.08 : r * 0.13;
      const tip = [x + Math.cos(a) * L, y + Math.sin(a) * L], l = [x + Math.cos(a - Math.PI / 2) * wd, y + Math.sin(a - Math.PI / 2) * wd], rr = [x + Math.cos(a + Math.PI / 2) * wd, y + Math.sin(a + Math.PI / 2) * wd];
      const path = c => { c.beginPath(); c.moveTo(tip[0], tip[1]); c.lineTo(l[0], l[1]); c.lineTo(x, y); c.lineTo(rr[0], rr[1]); c.closePath(); };
      if (k === 0) gold(ctx, path, l[0], tip[1], rr[0], y, { sheen }); else { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = k % 2 ? rgba(P.ink, 0.55) : rgba(P.ink, 0.85); path(ctx); ctx.fill(); ctx.restore(); }
    }
  }
  // coast(cx, cy, rx, ry, seed, rough): a closed, noise-bitten coastline polyline
  function coast(cx, cy, rx, ry, seed = 1, rough = 0.35, n = 220) {
    const out = []; for (let k = 0; k < n; k++) { const a = k / n * 6.283, e = 1 + rough * (fbm(Math.cos(a) * 1.4 + 5, Math.sin(a) * 1.4 + 5, 5, seed) - 0.5) * 2; out.push([cx + Math.cos(a) * rx * e, cy + Math.sin(a) * ry * e]); }
    return out;
  }
  // hachure(ctx, pts, n, gap): the engraved ripples that ring a coast, fading outward
  function hachure(ctx, pts, n = 5, gap = 7, color = P.ink) {
    let cx = 0, cy = 0; for (const p of pts) { cx += p[0]; cy += p[1]; } cx /= pts.length; cy /= pts.length;
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    for (let k = 1; k <= n; k++) { ctx.strokeStyle = rgba(color, 0.42 * (1 - k / (n + 1))); ctx.lineWidth = 0.9; const g = pts.map(p => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * gap * k, p[1] + dy / l * gap * k]; }); poly(ctx, g); ctx.stroke(); }
    ctx.restore();
  }
  Object.assign(K, { mountain, tree, compass, coast, hachure });

  // ---------------------------------------------------------------- particles
  function puff() {
    return cached('kit:puff', () => {
      const s = 128, c = canvas(s, s), x = c.getContext('2d'), img = x.createImageData(s, s);
      for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { const dx = (i - s / 2) / (s / 2), dy = (j - s / 2) / (s / 2), d = Math.hypot(dx, dy); const n = fbm(i / 18, j / 18, 4, 31); const a = clamp(1 - d) ** 1.6 * (0.45 + 0.75 * n); const k = (j * s + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = clamp(a) * 255; }
      x.putImageData(img, 0, 0); return c;
    });
  }
  // smoke(ctx, t, o): drifting soft smoke. o.n, o.x, o.y, o.w, o.h (region), o.color [r,g,b], o.alpha, o.rise (px/s), o.size, o.seed
  function smoke(ctx, t, o = {}) {
    const r = rng(o.seed || 11), n = o.n || 40, col = o.color || [40, 34, 30], al = o.alpha != null ? o.alpha : 0.3, X = o.x || 0, Y = o.y || 0, w = o.w || W, h = o.h || H, rise = o.rise != null ? o.rise : 14, size = o.size || 220;
    const img = puff(), tint = cached(`kit:puff:${col}`, () => { const c = canvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = `rgb(${col})`; x.fillRect(0, 0, c.width, c.height); return c; });
    ctx.save(); if (o.mode) ctx.globalCompositeOperation = o.mode;
    for (let i = 0; i < n; i++) {
      const life = 8 + r() * 10, off = r() * life, age = ((t + off) % life) / life, px = X + r() * w + Math.sin(t * 0.2 + i) * 30 + (o.drift || 0) * age * life, py = Y + h - age * (h + size) * (rise / 14) * 0.5 + r() * h * 0.5;
      const s = size * (0.5 + r() * 0.8) * (0.6 + age * 0.9), a = al * Math.sin(age * Math.PI) * (0.5 + r() * 0.5);
      ctx.globalAlpha = a; ctx.save(); ctx.translate(px, py); ctx.rotate(r() * 6.283 + t * 0.05 * (r() - 0.5)); ctx.drawImage(tint, -s / 2, -s / 2, s, s); ctx.restore();
    }
    ctx.restore();
  }
  // embers(ctx, t, o): glowing sparks rising. o.n, o.heat (0..1), o.x, o.y, o.w, o.h, o.seed
  function embers(ctx, t, o = {}) {
    const r = rng(o.seed || 7), n = o.n || 40, heat = o.heat != null ? o.heat : 0.6, X = o.x || 0, Y = o.y || 0, w = o.w || W, h = o.h || H;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const life = 4 + r() * 8, off = r() * life, sp = 30 + r() * 70, sw = 10 + r() * 40, f = 0.3 + r() * 0.8, ph = r() * 6.283, s = 0.8 + r() * 2.2, c = P.ember[Math.floor(r() * 3)];
      const age = ((t + off) % life) / life, px = X + ((r() * w + Math.sin(t * f + ph) * sw) % w), py = Y + h - ((age * sp * life + r() * h) % (h + 40));
      const a = Math.sin(age * Math.PI) * heat * (0.6 + 0.4 * Math.sin(t * 9 + ph));
      const g = ctx.createRadialGradient(px, py, 0, px, py, s * 5); g.addColorStop(0, `rgba(255,${200 + (c[1] % 40)},140,${a})`); g.addColorStop(0.3, `rgba(${c[0]},${c[1]},${c[2]},${a * 0.5})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, s * 5, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }
  // snow / ash / dust: falling or drifting specks with depth. o.kind 'snow' | 'ash' | 'dust', o.n, o.wind (px/s), o.alpha, o.seed
  function specks(ctx, t, o = {}) {
    const r = rng(o.seed || 3), n = o.n || 120, kind = o.kind || 'snow', wind = o.wind || 0, al = o.alpha != null ? o.alpha : 0.8;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const z = 0.3 + r() * 0.7, sp = (kind === 'dust' ? 4 : kind === 'ash' ? 18 : 40) * (0.5 + z), s = (kind === 'dust' ? 1.2 : 1.6) * (0.5 + z * 1.6), ph = r() * 6.283, x0 = r() * W, y0 = r() * H;
      const py = ((y0 + t * sp * (kind === 'dust' ? (r() - 0.5) * 2 : 1)) % (H + 20) + H + 20) % (H + 20) - 10;
      const px = ((x0 + t * wind * z + Math.sin(t * 0.6 + ph) * 18 * z) % (W + 20) + W + 20) % (W + 20) - 10;
      const tw = kind === 'dust' ? 0.5 + 0.5 * Math.sin(t * 1.3 + ph) : 1;
      ctx.globalAlpha = al * z * tw;
      ctx.fillStyle = kind === 'snow' ? '#f2f4f6' : kind === 'ash' ? '#8f8a84' : '#f3e2b8';
      ctx.beginPath(); ctx.arc(px, py, s, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }
  // rain(ctx, t, o): slanted streaks. o.n, o.angle, o.alpha, o.len, o.seed
  function rain(ctx, t, o = {}) {
    const r = rng(o.seed || 5), n = o.n || 160, ang = o.angle != null ? o.angle : 0.25, al = o.alpha != null ? o.alpha : 0.25, L = o.len || 38;
    ctx.save(); ctx.strokeStyle = o.color || 'rgba(200,210,220,1)'; ctx.lineWidth = 1;
    for (let i = 0; i < n; i++) { const z = 0.4 + r() * 0.6, sp = 900 * z, x0 = r() * (W + 400), y0 = r() * H; const py = (y0 + t * sp) % (H + L) - L, px = (x0 - py * Math.tan(ang)) % (W + 400) - 200; ctx.globalAlpha = al * z; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.sin(ang) * L * z, py + Math.cos(ang) * L * z); ctx.stroke(); }
    ctx.restore();
  }
  Object.assign(K, { puff, smoke, embers, specks, rain });

  // ---------------------------------------------------------------- camera, light and finish
  // cam(ctx, cx, cy, zoom, rot): look at (cx, cy) in page/world units with zoom (1 = one unit per pixel)
  function cam(ctx, cx, cy, zoom = 1, rot = 0) { ctx.translate(W / 2, H / 2); if (rot) ctx.rotate(rot); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy); }
  // camPath(t, keys): eased camera between keys [{t, x, y, z}]; returns {x, y, z}
  function camPath(t, keys) {
    if (t <= keys[0].t) return { ...keys[0] }; const last = keys[keys.length - 1]; if (t >= last.t) return { ...last };
    for (let i = 1; i < keys.length; i++) if (t <= keys[i].t) { const a = keys[i - 1], b = keys[i], u = (keys[i].e || ease)((t - a.t) / (b.t - a.t)); return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: a.z * Math.pow(b.z / a.z, u), r: lerp(a.r || 0, b.r || 0, u) }; }
    return { ...last };
  }
  // shake(t, amp, seed): handheld drift or impact shake, returns [dx, dy]
  const shake = (t, amp, seed = 1) => [amp * (fbm(t * 6, 0.5, 3, seed) - 0.5) * 2, amp * (fbm(0.5, t * 6, 3, seed + 3) - 0.5) * 2];
  // vignette(ctx, amount, color)
  function vignette(ctx, a = 0.55, col = '0,0,0', inner = 0.3) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); const g = ctx.createRadialGradient(W / 2, H / 2, H * inner, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  // grade(ctx, color, mode, alpha): tint the whole frame (e.g. a cold 'multiply' blue, a warm 'soft-light' amber)
  function grade(ctx, color, mode = 'soft-light', alpha = 0.3) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = mode; ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // glow(ctx, x, y, r, rgb, a): additive light
  function glow(ctx, x, y, r, rgb = [255, 200, 120], a = 0.5) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.4, `rgba(${rgb},${a * 0.35})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); ctx.restore(); }
  // bloom(ctx, strength): soft light around the brightest parts of the frame (quarter-resolution blur, screen)
  function bloom(ctx, strength = 0.35, blur = 10) {
    const s = layer('kit:bloom', W / 4, H / 4), x = s.getContext('2d');
    x.filter = `brightness(0.75) contrast(2.2) blur(${blur / 4}px)`; x.drawImage(ctx.canvas, 0, 0, W / 4, H / 4); x.filter = 'none';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = strength; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(s, 0, 0, W, H); ctx.restore();
  }
  let GRAIN = null;
  function grainTiles() { if (GRAIN) return GRAIN; GRAIN = []; for (let k = 0; k < 4; k++) { const g = canvas(256, 256), gc = g.getContext('2d'), img = gc.createImageData(256, 256), r = rng(900 + k); for (let i = 0; i < img.data.length; i += 4) { const v = Math.floor(r() * 255); img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } gc.putImageData(img, 0, 0); GRAIN.push(g); } return GRAIN; }
  // grain(ctx, t, amount): film grain, a new pattern every frame
  function grain(ctx, t, amt = 0.05) {
    const f = Math.floor(t * FPS + 1e-6), g = grainTiles()[f % 4], r = rng(f * 31 + 5);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = amt; ctx.globalCompositeOperation = 'overlay'; tile(ctx, g, 0, 0, W, H, Math.floor(r() * 256), Math.floor(r() * 256)); ctx.restore();
  }
  Object.assign(K, { cam, camPath, shake, vignette, grade, glow, bloom, grain });

  // ---------------------------------------------------------------- type
  // text(ctx, s, x, y, font, color, spacing, align, alpha): letter-spaced text with the trailing space corrected when centred
  function text(ctx, s, x, y, font, color, spacing = 0, align = 'center', alpha = 1) {
    ctx.save(); ctx.font = font; ctx.letterSpacing = spacing + 'px'; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha *= alpha; ctx.fillStyle = color;
    ctx.fillText(s, x + (align === 'center' ? spacing / 2 : align === 'right' ? spacing : 0), y); ctx.restore();
  }
  function measure(ctx, s, font, spacing = 0) { ctx.save(); ctx.font = font; ctx.letterSpacing = spacing + 'px'; const w = ctx.measureText(s).width - spacing; ctx.restore(); return w; }
  Object.assign(K, { text, measure });
})();
