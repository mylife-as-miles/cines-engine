/* ONE TOO MANY — "Negative Space" style kit (core).
   Cut-paper noir: hard ink silhouettes, one motivated light per shot, posterised light bands,
   a hidden ember lightbox behind the paper world that only the Extra ever cuts through.
   Deterministic: never use Math.random / Date. All variation comes from seeded RNG. */
(function (global) {
  'use strict';
  const W = 1920, H = 1080;

  // ---------- palette ----------
  const C = {
    ink: '#0D0A09', soot: '#1E1714', soot2: '#2A201B', matte: '#060404',
    tungsten: '#F2A93B', tungstenMid: '#A4611F', tungstenLow: '#4B2B13', tungstenTired: '#C98A4B',
    cardPaper: '#EFE5D0', cardBlue: '#2B4C9B', lighterCream: '#FFF1D6',
    wine: '#6E1222', blood: '#4E0812',
    rainSlate: '#34424F', rainSilver: '#BCCBD6',
    underDoor: '#F6D8A0', hood: '#E2C35B', hoodMid: '#8C7630', hoodLow: '#3B3216',
    gasBlue: '#5D8DF2', backdoorNight: '#1B2A3F',
    ember: '#FF9440', emberHot: '#FFE2B0', emberDeep: '#E2501A',
    fireCore: '#FFE6B0', fireMid: '#FF6A1F', fireOuter: '#A9280B',
    blastWhite: '#FFF6E0', flashWhite: '#F8F4EA', phoneWhite: '#D7E7F3',
    strobeRed: '#E3202B', strobeBlue: '#2251E6', yardNight: '#111926', grass: '#0F1512', ash: '#8C8277',
    // speaker type colours (each distinct in hue and value on ink)
    tScott: '#F2A93B', tDeena: '#E2504A', tAngelo: '#6A8FE3', tKay: '#BCCBD6', tKayLip: '#D0245E',
    tChristof: '#EFE5D0', tMarina: '#86C4A2', tDispatcher: '#D7E7F3',
  };

  // ---------- determinism ----------
  function hashStr(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function rng(seed) { return mulberry32(typeof seed === 'number' ? seed : hashStr(seed)); }
  function vnoise(x, y, seed) {
    seed = seed | 0;
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const h = (i, j) => { let n = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 2246822519)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const s = t => t * t * (3 - 2 * t), u = s(xf), v = s(yf);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, seed, oct) { oct = oct || 4; let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, (seed | 0) + i * 17); n += a; a *= 0.5; f *= 2; } return s / n; }
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hexToRgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
  function mix(h1, h2, t) { const a = hexToRgb(h1), b = hexToRgb(h2); return '#' + a.map((v, i) => Math.round(lerp(v, b[i], t)).toString(16).padStart(2, '0')).join(''); }

  // ---------- canvases ----------
  function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w || W; c.height = h || H; return c; }
  function stage() {
    document.documentElement.style.cssText = 'margin:0;background:#060404';
    document.body.style.cssText = 'margin:0;background:#060404;overflow:hidden';
    const c = makeCanvas(W, H);
    c.style.cssText = 'display:block;width:100vw;height:56.25vw';
    document.body.appendChild(c);
    return c.getContext('2d');
  }

  // ---------- fonts ----------
  const FONT_FACES = ['400 48px "Six Caps"', '400 48px "Libre Franklin"', '500 48px "Libre Franklin"', '700 48px "Libre Franklin"', '800 48px "Libre Franklin"',
    '400 48px "Archivo Black"', '500 48px "Archivo"', '700 48px "Archivo"', '300 48px "Oswald"', '500 48px "Oswald"',
    'italic 500 48px "Cormorant Garamond"', 'italic 600 48px "Cormorant Garamond"', '400 48px "Abril Fatface"', '500 48px "IBM Plex Mono"',
    '400 48px "Barlow Condensed"', '500 48px "Barlow Condensed"', '600 48px "Barlow Condensed"'];
  function loadFonts(cssHref) {
    return new Promise(res => {
      if (!cssHref) return res();   // fonts already inlined (the bundled player)
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = cssHref; l.onload = res; l.onerror = res; document.head.appendChild(l);
    }).then(() => Promise.all(FONT_FACES.map(f => document.fonts.load(f, 'AaBb0123?!-—.')))).then(() => document.fonts.ready);
  }

  // ---------- shapes: authored as commands, flattened to polygons so edges can be cut-paper roughened ----------
  class Shape {
    constructor() { this.polys = []; this.cur = null; this.px = 0; this.py = 0; }
    M(x, y) { this.cur = [[x, y]]; this.polys.push(this.cur); this.px = x; this.py = y; return this; }
    L(x, y) { this.cur.push([x, y]); this.px = x; this.py = y; return this; }
    C(x1, y1, x2, y2, x, y) {
      const x0 = this.px, y0 = this.py;
      const len = Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x - x2, y - y2);
      const n = Math.max(4, Math.ceil(len / 5));
      for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; this.cur.push([u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y]); }
      this.px = x; this.py = y; return this;
    }
    Q(x1, y1, x, y) { return this.C(this.px + 2 / 3 * (x1 - this.px), this.py + 2 / 3 * (y1 - this.py), x + 2 / 3 * (x1 - x), y + 2 / 3 * (y1 - y), x, y); }
    Z() { this.cur = null; return this; }
    poly(pts) { this.polys.push(pts.map(p => [p[0], p[1]])); this.cur = null; return this; }
    ellipse(cx, cy, rx, ry, rot) {
      rot = rot || 0; const n = Math.max(16, Math.ceil((rx + ry) * 0.6)); const pts = []; const cr = Math.cos(rot), sr = Math.sin(rot);
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]); }
      return this.poly(pts);
    }
    circle(cx, cy, r) { return this.ellipse(cx, cy, r, r, 0); }
    rect(x, y, w, h) { return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]); }
    // tapered capsule between two circles (limbs, fingers)
    capsule(x1, y1, r1, x2, y2, r2) {
      const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 0.001;
      if (d <= Math.abs(r1 - r2)) return this.circle(r1 > r2 ? x1 : x2, r1 > r2 ? y1 : y2, Math.max(r1, r2));
      const a = Math.atan2(dy, dx), off = Math.acos(clamp((r1 - r2) / d, -1, 1));
      const pts = []; const n = 14;
      for (let i = 0; i <= n; i++) { const t = a + off + (Math.PI * 2 - 2 * off) * i / n; pts.push([x1 + Math.cos(t) * r1, y1 + Math.sin(t) * r1]); }
      for (let i = 0; i <= n; i++) { const t = a - off + (2 * off) * i / n; pts.push([x2 + Math.cos(t) * r2, y2 + Math.sin(t) * r2]); }
      return this.poly(pts);
    }
    add(other) { other.polys.forEach(p => this.polys.push(p.map(q => [q[0], q[1]]))); return this; }
    // affine: m = [a,b,c,d,e,f] like canvas setTransform
    transform(m) { const s = new Shape(); s.polys = this.polys.map(p => p.map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]])); return s; }
    translate(tx, ty) { return this.transform([1, 0, 0, 1, tx, ty]); }
    scale(sx, sy, ox, oy) { ox = ox || 0; oy = oy || 0; sy = sy == null ? sx : sy; return this.transform([sx, 0, 0, sy, ox - ox * sx, oy - oy * sy]); }
    rotate(a, ox, oy) { ox = ox || 0; oy = oy || 0; const c = Math.cos(a), s = Math.sin(a); return this.transform([c, s, -s, c, ox - c * ox + s * oy, oy - s * ox - c * oy]); }
    flipX(ox) { return this.transform([-1, 0, 0, 1, 2 * (ox || 0), 0]); }
    bbox() { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; this.polys.forEach(p => p.forEach(([x, y]) => { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); })); return { x: a, y: b, w: c - a, h: d - b }; }
    // Path2D. rough > 0 gives the hand-cut paper edge (vertex displacement along normals, frozen seeded noise)
    path(rough, seed) {
      const P = new Path2D(); rough = rough == null ? 0.8 : rough; seed = seed == null ? 7 : seed;
      this.polys.forEach((poly, pi) => {
        if (poly.length < 2) return;
        let pts = resample(poly, 5);
        // consistent winding so nonzero fill = union
        let area = 0; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; area += x1 * y2 - x2 * y1; }
        if (area < 0) pts.reverse();
        if (rough > 0) {
          const n = pts.length; const out = [];
          for (let i = 0; i < n; i++) {
            const [xa, ya] = pts[(i - 1 + n) % n], [xb, yb] = pts[(i + 1) % n];
            let nx = yb - ya, ny = -(xb - xa); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
            const k = (vnoise(pts[i][0] * 0.09, pts[i][1] * 0.09, seed + pi) * 2 - 1) * rough + (vnoise(pts[i][0] * 0.6, pts[i][1] * 0.6, seed * 3 + pi) * 2 - 1) * rough * 0.35;
            out.push([pts[i][0] + nx * k, pts[i][1] + ny * k]);
          }
          pts = out;
        }
        P.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) P.lineTo(pts[i][0], pts[i][1]); P.closePath();
      });
      return P;
    }
  }
  function resample(poly, step) {
    const out = []; const n = poly.length;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % n]; const d = Math.hypot(x2 - x1, y2 - y1); const k = Math.max(1, Math.ceil(d / step));
      for (let j = 0; j < k; j++) out.push([x1 + (x2 - x1) * j / k, y1 + (y2 - y1) * j / k]);
    }
    return out;
  }
  const S = () => new Shape();

  // ---------- light ----------
  let _bayer = null;
  const _dither = {};
  function ditherPattern(ctx, color) {
    if (_dither[color]) return _dither[color];
    const c = makeCanvas(4, 4), g = c.getContext('2d'); g.fillStyle = color;
    [[0, 0], [2, 2], [2, 0], [0, 2], [1, 1], [3, 3]].forEach(([x, y], i) => { if (i < 4 || i % 2) g.fillRect(x, y, 1, 1); });
    return (_dither[color] = ctx.createPattern(c, 'repeat'));
  }
  // Posterised pool of light: concentric flat bands with a printed dither seam. bands: [{r, color}] from outer to inner. sy squashes vertically (floor perspective).
  function lightPool(ctx, x, y, bands, opts) {
    opts = opts || {}; const sy = opts.sy || 1, rot = opts.rot || 0, seed = opts.seed || 3;
    bands.forEach((b, i) => {
      const sh = S().ellipse(x, y, b.r, b.r * sy, rot);
      const p = sh.path(opts.rough == null ? 1.6 : opts.rough, seed + i);
      ctx.fillStyle = b.color; ctx.fill(p);
      if (i > 0 && opts.dither !== false) { ctx.save(); ctx.strokeStyle = ditherPattern(ctx, bands[i - 1].color); ctx.lineWidth = 5; ctx.stroke(p); ctx.restore(); }
    });
  }
  // Hard light cone (trapezoid) composited with screen. pts = 4 points.
  function cone(ctx, pts, color, alpha) {
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = alpha == null ? 0.1 : alpha; ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function dust(ctx, poly, n, color, seed) {
    const r = rng(seed || 'dust'); const bb = S().poly(poly).bbox(); ctx.save(); ctx.fillStyle = color;
    const path = new Path2D(); path.moveTo(poly[0][0], poly[0][1]); poly.slice(1).forEach(p => path.lineTo(p[0], p[1])); path.closePath();
    let k = 0, tries = 0;
    while (k < n && tries < n * 20) { tries++; const x = bb.x + r() * bb.w, y = bb.y + r() * bb.h; if (!ctx.isPointInPath(path, x, y)) continue; ctx.globalAlpha = 0.25 + r() * 0.5; const s = 0.8 + r() * 1.8; ctx.fillRect(x, y, s, s); k++; }
    ctx.restore();
  }

  // ---------- silhouettes ----------
  // OTM.silhouette(ctx, shapeOrPath2D, opts): fill in ink, then cut a crisp rim crescent on the side facing the light.
  //   fill, rough, seed            the ink fill (fill:false or noFill:true draws the rim only)
  //   light: {x,y} point | {dx,dy} direction;  rimColor, rimW (px, world units: it scales with the camera), rimSoft, rimAlpha
  //   at: [x,y]                    where a point light's direction is measured from (default: the shape's bbox centre; a bare Path2D is
  //                                measured from its own centroid, found once at 1/8 resolution and cached; pass `at` or `bbox` to skip that)
  //   bbox: {x,y,w,h}              world bounds of a bare Path2D (speed only)
  //   parts: [{shape|path, at, w, color, alpha, spread}]   per-part rims (the head apart from the body): each part's crescent is measured
  //                                from its own centre and kept to the OUTER silhouette (no rim where the part joins the body); the rest of
  //                                the figure is rimmed from `at`. w multiplies rimW.
  //   spread: radians              keep each crescent inside a wedge of +-spread around the light direction from its centre (no outlines)
  //   falloff: {r0, r1, steps, min} point lights: full rim within r0 of the light, fading to `min` (default 0) by r1, in `steps` flat
  //                                bands (0 = smooth; default 3). With min > 0 the outermost band keeps that alpha out to r1, then ends.
  //   clip: Path2D | fn(ctx)       restrict the rim to a world-space region (fn builds a path on ctx; it is filled)
  // Works under any ctx transform (the film camera): rims are cut in device pixels inside the shape's bounds only.
  const _tmp = { c: null };
  function tmpCanvas() { if (!_tmp.c) _tmp.c = makeCanvas(W, H); const g = _tmp.c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none'; g.clearRect(0, 0, W, H); return g; }
  const _rim = { c: null, g: null, w: 0, h: 0 };
  function rimCanvas(w, h) {
    if (!_rim.c || _rim.w < w || _rim.h < h) { _rim.w = Math.max(w, _rim.w, 256); _rim.h = Math.max(h, _rim.h, 256); _rim.c = makeCanvas(_rim.w, _rim.h); _rim.g = _rim.c.getContext('2d'); }
    const g = _rim.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none'; g.clearRect(0, 0, w, h); return g;
  }
  const _probe = { c: null, cache: new WeakMap() };
  // centroid + world bbox of a Path2D as the ctx would draw it (1/8 resolution, cached per path and transform)
  function pathInfo(ctx, p) {
    const m = ctx.getTransform(), key = [m.a, m.b, m.c, m.d, m.e, m.f].join(','); const hit = _probe.cache.get(p); if (hit && hit.key === key) return hit;
    const cw = ctx.canvas.width, ch = ctx.canvas.height, s = 0.125, pw = Math.ceil(cw * s), ph = Math.ceil(ch * s);
    if (!_probe.c || _probe.c.width < pw || _probe.c.height < ph) _probe.c = makeCanvas(Math.max(pw, 240), Math.max(ph, 135));
    const g = _probe.c.getContext('2d', { willReadFrequently: true }); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, _probe.c.width, _probe.c.height);
    g.setTransform(m.a * s, m.b * s, m.c * s, m.d * s, m.e * s, m.f * s); g.fillStyle = '#fff'; g.fill(p);
    const d = g.getImageData(0, 0, pw, ph).data; let n = 0, sx = 0, sy = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) { const a = d[(y * pw + x) * 4 + 3]; if (a > 0) { n++; sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    const inv = m.inverse(); const toW = (x, y) => [inv.a * x + inv.c * y + inv.e, inv.b * x + inv.d * y + inv.f];
    let res;
    if (!n) res = { key, c: toW(cw / 2, ch / 2), dev: null };
    else { const c = toW((sx / n + 0.5) / s, (sy / n + 0.5) / s); res = { key, c, dev: { x: x0 / s - 8, y: y0 / s - 8, w: (x1 - x0 + 1) / s + 16, h: (y1 - y0 + 1) / s + 16 } }; }
    _probe.cache.set(p, res); return res;
  }
  // world bbox -> integer device rect clamped to the canvas
  function devRect(ctx, bb, pad) {
    const m = ctx.getTransform(); const xs = [], ys = [];
    [[bb.x, bb.y], [bb.x + bb.w, bb.y], [bb.x, bb.y + bb.h], [bb.x + bb.w, bb.y + bb.h]].forEach(([x, y]) => { xs.push(m.a * x + m.c * y + m.e); ys.push(m.b * x + m.d * y + m.f); });
    const x0 = Math.max(0, Math.floor(Math.min(...xs) - pad)), y0 = Math.max(0, Math.floor(Math.min(...ys) - pad));
    const x1 = Math.min(ctx.canvas.width, Math.ceil(Math.max(...xs) + pad)), y1 = Math.min(ctx.canvas.height, Math.ceil(Math.max(...ys) + pad));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function devToWorldBox(ctx, r) { const inv = ctx.getTransform().inverse(); const xs = [], ys = []; [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].forEach(([x, y]) => { xs.push(inv.a * x + inv.c * y + inv.e); ys.push(inv.b * x + inv.d * y + inv.f); }); const x0 = Math.min(...xs), y0 = Math.min(...ys); return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 }; }
  function silhouette(ctx, shape, opts) {
    opts = opts || {}; const isP = shape instanceof Path2D; const p = isP ? shape : shape.path(opts.rough == null ? 0.8 : opts.rough, opts.seed || 11);
    if (opts.fill !== false && !opts.noFill) { ctx.fillStyle = opts.fill || C.ink; ctx.fill(p); }
    if (!(opts.rimColor && opts.rimW && opts.light)) return p;
    const L = opts.light, pointL = L.dx == null;
    // bounds + centre of the whole shape
    let bb = opts.bbox || (isP ? null : shape.bbox()), centre = opts.at;
    if (isP && (!bb || !centre)) { const inf = pathInfo(ctx, p); if (!centre) centre = inf.c; if (!bb) bb = inf.dev ? devToWorldBox(ctx, inf.dev) : null; }
    if (!bb) return p;
    if (!centre) centre = [bb.x + bb.w / 2, bb.y + bb.h / 2];
    const dirFrom = c => { let ux, uy; if (!pointL) { ux = L.dx; uy = L.dy; } else { ux = L.x - c[0]; uy = L.y - c[1]; } const l = Math.hypot(ux, uy) || 1; return [ux / l, uy / l]; };
    const m = ctx.getTransform(), zoom = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
    const layers = opts.rimSoft ? [[opts.rimW * 2.4, 0.28], [opts.rimW, 1]] : [[opts.rimW, 1]];
    const parts = (opts.parts || []).map(q => { const qb = q.bbox || (q.shape ? q.shape.bbox() : null);
      return { p: q.path || (q.shape ? q.shape.path(q.rough == null ? (opts.rough == null ? 0.8 : opts.rough) : q.rough, q.seed || opts.seed || 11) : null), bb: qb,
        c: q.at || (qb ? [qb.x + qb.w / 2, qb.y + qb.h / 2] : centre), w: q.w == null ? 1 : q.w, color: q.color, alpha: q.alpha == null ? 1 : q.alpha, spread: q.spread == null ? opts.spread : q.spread }; }).filter(q => q.p);
    const R = Math.hypot(bb.w, bb.h) + 40;
    const jobs = parts.map(q => Object.assign({ main: false }, q)).concat([{ p, c: centre, w: 1, color: opts.rimColor, alpha: 1, spread: opts.spread, main: true }]);
    const pad = Math.max(...layers.map(l => l[0])) * zoom * 1.5 + 4;
    jobs.forEach(job => {
      const dr = devRect(ctx, (!job.main && job.bb) ? job.bb : bb, pad); if (dr.w <= 0 || dr.h <= 0) return;   // a part's crescent lies inside the part
      const [ux, uy] = dirFrom(job.c);
      layers.forEach(([w0, a]) => {
        const w = w0 * job.w; const g = rimCanvas(dr.w, dr.h);
        g.setTransform(m.a, m.b, m.c, m.d, m.e - dr.x, m.f - dr.y);
        g.fillStyle = job.color || opts.rimColor; g.fill(job.p);
        g.globalCompositeOperation = 'destination-out'; g.translate(-ux * w, -uy * w); g.fill(p); g.translate(ux * w, uy * w);
        if (job.main) parts.forEach(q => g.fill(q.p));        // the parts carry their own crescents
        g.globalCompositeOperation = 'destination-in';
        const dev = q => [m.a * q[0] + m.c * q[1] + m.e - dr.x, m.b * q[0] + m.d * q[1] + m.f - dr.y];
        if (job.spread != null || (opts.falloff && pointL)) g.setTransform(1, 0, 0, 1, 0, 0);   // wedge and falloff are cut in device pixels, inside this canvas only
        if (job.spread != null) { const cd = dev(job.c), vx = m.a * ux + m.c * uy, vy = m.b * ux + m.d * uy, a0 = Math.atan2(vy, vx), RR = dr.w + dr.h + 10;
          g.beginPath(); g.moveTo(cd[0], cd[1]); g.arc(cd[0], cd[1], RR, a0 - job.spread, a0 + job.spread); g.closePath(); g.fillStyle = '#000'; g.fill(); }
        if (opts.falloff && pointL) {
          const fo = opts.falloff, r0 = fo.r0 || 0, r1 = Math.max(r0 + 1, fo.r1 || 600), n = fo.steps == null ? 3 : fo.steps, ld = dev([L.x, L.y]), mn = fo.min || 0;
          const gr = g.createRadialGradient(ld[0], ld[1], 0, ld[0], ld[1], r1 * zoom); const k0 = Math.min(0.999, r0 / r1);
          gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(k0, 'rgba(0,0,0,1)');
          if (n > 0) { for (let i = 0; i < n; i++) { const u0 = k0 + (1 - k0) * i / n, u1 = k0 + (1 - k0) * (i + 1) / n, al = mn > 0 ? 1 - (1 - mn) * (i + 1) / n : 1 - (i + 1) / (n + 1); gr.addColorStop(Math.min(1, u0 + 1e-4), `rgba(0,0,0,${al})`); gr.addColorStop(Math.min(1, u1), `rgba(0,0,0,${al})`); } if (!mn) gr.addColorStop(1, 'rgba(0,0,0,0)'); }
          else gr.addColorStop(1, `rgba(0,0,0,${mn})`);
          g.fillStyle = gr; g.fillRect(0, 0, dr.w, dr.h);
        }
        g.setTransform(m.a, m.b, m.c, m.d, m.e - dr.x, m.f - dr.y);
        if (opts.clip) { g.fillStyle = '#000'; if (opts.clip instanceof Path2D) g.fill(opts.clip); else { g.beginPath(); opts.clip(g); g.fill(); } }
        ctx.save(); ctx.globalAlpha = a * job.alpha * (opts.rimAlpha == null ? 1 : opts.rimAlpha); ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(_rim.c, 0, 0, dr.w, dr.h, dr.x, dr.y, dr.w, dr.h); ctx.restore();
      });
    });
    return p;
  }
  // Cast shadow: shape pushed through an affine (shear/scale onto a floor or wall plane).
  function castShadow(ctx, shape, m, alpha, color) {
    ctx.save(); ctx.globalAlpha = alpha == null ? 0.85 : alpha; ctx.fillStyle = color || C.ink; ctx.fill(shape.transform(m).path(1.2, 5)); ctx.restore();
  }

  // ---------- the lightbox behind the paper (only the Extra cuts through to it) ----------
  // Animated lightbox for film playback: 480x270, t quantised to 6 Hz and looped every 4 s, cached per seed.
  const _lbCache = {};
  function lightboxSmall(seed, t) {
    const q = Math.floor(((t || 0) % 4) * 6), key = seed + ':' + q;
    if (_lbCache[key]) return _lbCache[key];
    const big = lightboxRaw(seed, q / 6, true); return (_lbCache[key] = big);
  }
  function lightbox(seed, t) { return lightboxRaw(seed, t, false); }
  function lightboxRaw(seed, t, small) {
    const lw = 480, lh = 270, c = makeCanvas(lw, lh), g = c.getContext('2d'); const img = g.createImageData(lw, lh);
    const hot = hexToRgb(C.emberHot), mid = hexToRgb(C.ember), deep = hexToRgb(C.emberDeep); t = t || 0;
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      const n = fbm(x * 0.018 + t * 0.4, y * 0.022 - t * 0.9, seed || 41, 4);
      const k = clamp((n - 0.28) * 1.9, 0, 1); let col;
      if (k < 0.5) { const u = k / 0.5; col = deep.map((v, i) => lerp(v, mid[i], u)); } else { const u = (k - 0.5) / 0.5; col = mid.map((v, i) => lerp(v, hot[i], u)); }
      const o = (y * lw + x) * 4; img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0); if (small) return c; const big = makeCanvas(W, H), bg = big.getContext('2d'); bg.imageSmoothingQuality = 'high'; bg.drawImage(c, 0, 0, W, H); return big;
  }

  // ---------- frame compositor ----------
  // const f = OTM.frame(ctx); draw the paper world into f.world; cut holes with f.knockout(path); draw glow into f.emissive (quarter-res, already scaled); f.finish({grain, vignette, letterbox}).
  // opts.pool: reuse module-level buffers every frame (film playback); style frames get fresh canvases.
  const _pool = {};
  function pooled(name, w, h) {
    let g = _pool[name];
    if (!g) { g = _pool[name] = makeCanvas(w, h).getContext('2d'); }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, w, h);
    return g;
  }
  function frame(ctx, opts) {
    opts = opts || {};
    const P = !!opts.pool;
    const world = P ? pooled('world', W, H) : makeCanvas(W, H).getContext('2d');
    const emissive = P ? pooled('emissive', W / 4, H / 4) : makeCanvas(W / 4, H / 4).getContext('2d'); const emissiveC = emissive.canvas; emissive.scale(0.25, 0.25);
    const holes = P ? pooled('holes', W, H) : makeCanvas(W, H).getContext('2d'); holes.fillStyle = '#fff'; let used = false;
    return {
      world, emissive, holes,
      // cut a Path2D through the paper to the ember lightbox (depth 0..1)
      knockout(path, depth) { used = true; holes.save(); holes.globalAlpha = depth == null ? 1 : depth; holes.fillStyle = '#fff'; holes.fill(path); holes.restore(); },
      // cut text through the paper: o = font opts for OTM.font plus tracking/align/rotate
      knockoutText(str, x, y, o, depth) {
        used = true; holes.save(); holes.globalAlpha = depth == null ? 1 : depth; holes.fillStyle = '#fff'; holes.font = font(o); holes.letterSpacing = (o.tracking || 0) + 'px';
        holes.textAlign = o.align || 'left'; holes.textBaseline = o.baseline || 'alphabetic'; if (o.rotate) { holes.translate(x, y); holes.rotate(o.rotate); x = 0; y = 0; }
        holes.fillText(str, x, y); const w = holes.measureText(str).width; holes.restore(); return w;
      },
      markHoles() { used = true; return holes; },
      finish(o) {
        o = Object.assign({ grain: 0.07, fibre: 0.05, vignette: 0.55, halation: 0.55, letterbox: 1.7778, weave: 0, seed: 1 }, opts, o || {});
        if (used) {
          if (P) {
            // fast path: scorch and glow are computed at quarter resolution
            const q = pooled('holesQ', W / 4, H / 4); q.filter = 'blur(1.4px)'; q.drawImage(holes.canvas, 0, 0, W / 4, H / 4); q.filter = 'none';
            q.globalCompositeOperation = 'source-in'; q.fillStyle = C.fireOuter; q.fillRect(0, 0, W / 4, H / 4);
            world.save(); world.globalAlpha = 0.95; world.drawImage(q.canvas, 0, 0, W, H); world.drawImage(q.canvas, 0, 0, W, H); world.restore();
            world.save(); world.globalCompositeOperation = 'destination-out'; world.drawImage(holes.canvas, 0, 0); world.restore();
            ctx.save(); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(lightboxSmall(o.seed * 7 + 3, o.t || 0), 0, 0, W, H); ctx.restore();
            const tq = pooled('tintQ', W / 4, H / 4); tq.drawImage(holes.canvas, 0, 0, W / 4, H / 4); tq.globalCompositeOperation = 'source-in'; tq.fillStyle = C.ember; tq.fillRect(0, 0, W / 4, H / 4);
            emissive.save(); emissive.setTransform(1, 0, 0, 1, 0, 0); emissive.drawImage(tq.canvas, 0, 0); emissive.drawImage(tq.canvas, 0, 0); emissive.restore();
          } else {
          const lb = lightbox(o.seed * 7 + 3, o.t || 0);
          // scorch: the paper browns and chars around every cut before the hole opens
          const sc2 = makeCanvas(W, H).getContext('2d'); sc2.filter = 'blur(5px)'; sc2.drawImage(holes.canvas, 0, 0); sc2.filter = 'none'; sc2.globalCompositeOperation = 'source-in'; sc2.fillStyle = C.fireOuter; sc2.fillRect(0, 0, W, H);
          world.save(); world.globalAlpha = 0.95; world.drawImage(sc2.canvas, 0, 0); world.drawImage(sc2.canvas, 0, 0); world.restore();
          world.save(); world.globalCompositeOperation = 'destination-out'; world.drawImage(holes.canvas, 0, 0); world.restore();
          ctx.drawImage(lb, 0, 0);
          // glow from the holes (ember halation that does not belong to any lamp)
          emissive.save(); emissive.globalAlpha = 1; const tint = makeCanvas(W, H).getContext('2d'); tint.drawImage(holes.canvas, 0, 0); tint.globalCompositeOperation = 'source-in'; tint.fillStyle = C.ember; tint.fillRect(0, 0, W, H);
          emissive.drawImage(tint.canvas, 0, 0); emissive.drawImage(tint.canvas, 0, 0); emissive.restore();
          }
        } else { ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H); }
        ctx.drawImage(world.canvas, 0, 0);
        if (o.halation > 0) {
          const hc = P ? pooled('halQ', W / 4, H / 4) : makeCanvas(W / 4, H / 4).getContext('2d'); hc.filter = 'blur(6px)'; hc.drawImage(emissiveC, 0, 0); hc.filter = 'blur(14px)'; hc.globalAlpha = 0.8; hc.drawImage(emissiveC, 0, 0);
          ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = o.halation; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(hc.canvas, 0, 0, W, H); ctx.restore();
        }
        if (o.beforePost) o.beforePost(ctx);
        post(ctx, o);
        if (o.afterPost) o.afterPost(ctx);
      }
    };
  }

  function post(ctx, o) {
    if (o.vignette > 0) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 1.05);
      g.addColorStop(0, rgba(C.ink, 0)); g.addColorStop(1, rgba(C.ink, o.vignette)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (o.fibre > 0) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = o.fibre; ctx.drawImage(fibreTex(), 0, 0); ctx.restore(); }
    if (o.grain > 0) { ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = o.grain; ctx.fillStyle = grainPattern(ctx, o.seed || 1); ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (o.letterbox && o.letterbox > 1.78) letterbox(ctx, o.letterbox, o.matteColor);
  }
  function letterbox(ctx, aspect, color) {
    const h = W / aspect, bar = Math.round((H - h) / 2); ctx.fillStyle = color || C.matte; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar); return { top: bar, bottom: H - bar, h: H - 2 * bar };
  }
  function liveArea(aspect) { if (!aspect || aspect <= 1.78) return { top: 0, bottom: H, h: H }; const h = W / aspect, bar = Math.round((H - h) / 2); return { top: bar, bottom: H - bar, h: H - 2 * bar }; }
  const _grain = {};
  function grainTile(seed) {
    if (_grain[seed]) return _grain[seed];
    const c = makeCanvas(512, 512), g = c.getContext('2d'), img = g.createImageData(512, 512), r = rng('grain' + seed);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.floor(128 + (r() + r() + r() - 1.5) * 150); img.data[i] = img.data[i + 1] = img.data[i + 2] = clamp(v, 0, 255); img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0); return (_grain[seed] = c);
  }
  const _grainPat = {};
  function grainPattern(ctx, seed) { return _grainPat[seed] || (_grainPat[seed] = ctx.createPattern(grainTile(seed), 'repeat')); }
  let _fibre = null;
  function fibreTex() {
    if (_fibre) return _fibre; const c = makeCanvas(W, H), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); const r = rng('fibre');
    g.lineCap = 'round';
    for (let i = 0; i < 2600; i++) { const x = r() * W, y = r() * H, a = r() * Math.PI, l = 6 + r() * 26; g.strokeStyle = `rgba(60,40,30,${0.08 + r() * 0.2})`; g.lineWidth = 0.6 + r() * 0.8; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 6, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * 6, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let y = 0; y < H; y += 3) { g.fillStyle = `rgba(80,60,40,${0.015 + 0.02 * vnoise(0, y * 0.05, 9)})`; g.fillRect(0, y, W, 1); }
    return (_fibre = c);
  }

  // ---------- fire (flat three-tone tongues) ----------
  function flame(ctx, x, y, w, h, seed, t) {
    t = t || 0; const tones = [C.fireOuter, C.fireMid, C.fireCore];
    tones.forEach((col, k) => {
      const sc = 1 - k * 0.3, sh = S(); const n = 9; const pts = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, bx = x + (u - 0.5) * w * sc;
        const tongue = Math.pow(Math.sin(u * Math.PI), 0.7) * h * sc * (0.55 + 0.75 * fbm(u * 3 + seed, t * 1.3 + k * 0.7, seed + k, 3));
        pts.push([bx + (vnoise(u * 5, t * 2 + k, seed) - 0.5) * w * 0.12, y - tongue]);
      }
      sh.M(x - w * sc / 2, y);
      for (let i = 0; i < pts.length; i++) { const p = pts[i]; if (i === 0) sh.L(p[0], p[1]); else { const q = pts[i - 1]; sh.Q(q[0] + (p[0] - q[0]) * 0.5, Math.min(q[1], p[1]) - h * 0.08 * sc, p[0], p[1]); } }
      sh.L(x + w * sc / 2, y).Z();
      ctx.fillStyle = col; ctx.fill(sh.path(1.2, seed + k));
    });
  }
  function embers(ctx, x, y, w, h, n, seed, color) {
    const r = rng(seed || 'emb'); ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < n; i++) { const px = x + r() * w, py = y + r() * h, s = 1 + r() * 2.6; ctx.fillStyle = rgba(color || C.fireMid, 0.4 + r() * 0.6); ctx.beginPath(); ctx.ellipse(px, py, s, s * (1 + r()), r() * 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  // ---------- rain ----------
  function rain(ctx, x, y, w, h, n, seed, color, alpha) {
    const r = rng(seed || 'rain'); ctx.save(); ctx.strokeStyle = color || C.rainSilver; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    for (let i = 0; i < n; i++) { const px = x + r() * (w + 60), py = y + r() * h, l = 14 + r() * 30; ctx.globalAlpha = (alpha || 0.5) * (0.3 + r() * 0.7); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - l * 0.28, py + l); ctx.stroke(); }
    ctx.restore();
  }

  // ---------- type helpers ----------
  function font(o) { return `${o.style || 'normal'} ${o.weight || 400} ${o.size || 48}px "${o.family}"`; }
  // Lays out a string glyph by glyph (prefix measurement keeps kerning). Returns [{ch, x, w}] relative to start.
  function layout(ctx, str, o) {
    ctx.save(); ctx.font = font(o); if (o.tracking) ctx.letterSpacing = o.tracking + 'px'; else ctx.letterSpacing = '0px';
    const out = []; let prev = 0;
    for (let i = 0; i < str.length; i++) { const w = ctx.measureText(str.slice(0, i + 1)).width; out.push({ ch: str[i], x: prev, w: w - prev, i }); prev = w; }
    ctx.restore(); out.width = prev; return out;
  }
  function text(ctx, str, x, y, o) {
    ctx.save(); ctx.font = font(o); ctx.letterSpacing = (o.tracking || 0) + 'px'; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.baseline || 'alphabetic';
    ctx.fillStyle = o.color || C.cardPaper; if (o.alpha != null) ctx.globalAlpha = o.alpha; ctx.fillText(str, x, y); const w = ctx.measureText(str).width; ctx.restore(); return w;
  }
  // a knock-behind so type always sits on ink (contrast rule)
  function knockBehind(ctx, x, y, w, h, alpha) { ctx.save(); const g = ctx.createLinearGradient(x, 0, x + w, 0); ctx.fillStyle = rgba(C.ink, alpha == null ? 0.6 : alpha); ctx.filter = 'blur(18px)'; ctx.fillRect(x - 20, y - 10, w + 40, h + 20); ctx.restore(); }

  // ---------- presentation chrome for style frames ----------
  // slate: small label strip in the matte so frames read as a style deck
  function slate(ctx, left, right, aspect) {
    const a = liveArea(aspect || 1.7778); const y = a.top > 40 ? a.top / 2 + 9 : 34;
    ctx.save(); ctx.globalAlpha = a.top > 40 ? 0.55 : 0.42;
    text(ctx, left, 48, y, { family: 'Barlow Condensed', weight: 500, size: 24, color: C.cardPaper, tracking: 3 });
    text(ctx, right, W - 48, y, { family: 'Barlow Condensed', weight: 500, size: 24, color: C.cardPaper, tracking: 3, align: 'right' });
    ctx.restore();
  }

  global.OTM = { W, H, C, hashStr, rng, vnoise, fbm, lerp, clamp, rgba, mix, hexToRgb, makeCanvas, stage, loadFonts, Shape, S, resample,
    lightPool, cone, dust, silhouette, castShadow, lightbox, lightboxSmall, frame, pooled, ditherPattern, post, letterbox, liveArea, grainTile, flame, embers, rain,
    font, layout, text, knockBehind, slate };
})(window);
