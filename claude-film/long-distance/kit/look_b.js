/* LONG DISTANCE — LOOK B "GRAIN AND GLOSS" helpers (sits on top of kit/otm.js; never edits it).
   Two textures for two kinds of truth:
   - GRAIN, the real world: cut paper. Hand-cut edges (OTM.S().path(rough)), a paper texture laid into every piece with its own phase,
     pieces lifted off the layer below by a soft drop shadow, light in posterised bands with cut edges, film grain and fibre on top.
   - GLOSS, what the phone makes: perfect vector edges, clean gradients, perfect symmetry, no texture, no dust. It is composited AFTER
     the kit's finish (grain, fibre, vignette), so the phone and its pictures are the only grain-free things in the film.
   Faces: one small SDF sculpture per character, rendered three ways from the same model:
     'grain' (posterised light, cut-edge wobble, freckles, stubble, asymmetry), 'gloss' (smooth light, sheen, mirror symmetry, no freckles,
     and the light can be fixed to the FACE instead of the world, so two tilted heads are lit exactly alike), 'flash' (photo-booth strobe).
   Deterministic: no Math.random / Date anywhere. */
(function (G) {
  'use strict';
  const O = G.OTM, W = O.W, H = O.H;
  const { clamp, lerp, mix, rgba, hexToRgb, vnoise, fbm, rng, makeCanvas } = O;

  // ---------------------------------------------------------------- palette
  const P = {
    // night paper (the bedroom, the living room at night)
    ink: '#11141E', night: '#171C2A', nightMid: '#212839', nightBlue: '#2C3650', slate: '#3E4C6A', slateLit: '#5A6C90', streetPale: '#8696B4',
    // day paper (grey daylight)
    dayInk: '#2A2C30', dayDeep: '#45474B', dayMid: '#6F7072', dayGrey: '#94938F', dayPale: '#B9B6AE', dayLight: '#D3CFC5',
    // paper and warm practicals
    paper: '#ECE3D0', paperShade: '#CFC3AA', oat: '#B9A888', cork: '#8C6A48',
    lamp: '#F0B460', lampMid: '#B47A3E', lampLow: '#5E4029', lampDeep: '#33261E',
    rust: '#A8533A', rustDeep: '#6B3426', sage: '#7F8B6C', sageDeep: '#4B5443', teal: '#2F5352', bottle: '#24443F', bottleDeep: '#162B28', bottleLit: '#3F6A60',
    mustard: '#C8973E', rose: '#C9877A', denim: '#4D5F7E',
    // the phone's light (smooth) and its colours (gloss)
    glow: '#FFD2B4', glowHot: '#FFF1E6', glowRose: '#FF9C8C',
    gWhite: '#FFFFFF', gBlack: '#000000', gAqua: '#7FE8E6', gTeal: '#14A7A9', gDeep: '#0E5E6B', gLeaf: '#2FAE7D', gLeafDeep: '#0D6B58',
    gSky: '#BFF3FF', gBubbleA: '#FF8FB1', gBubbleB: '#B48CFF', gPeach: '#FFC9B0',
    // photo-booth strip (real photograph)
    photoBg: '#7E8C8A', photoFlash: '#FBF3E4', photoPaper: '#F2EEE4',
  };

  // ---------------------------------------------------------------- small utils
  const toHex = a => '#' + a.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const rgb01 = hex => hexToRgb(hex).map(v => v / 255);
  function layer(w, h) { return makeCanvas(w || W, h || H).getContext('2d'); }
  function hash2(i, j, s) { let n = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(s | 0, 2246822519)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
  // periodic value noise (tileable textures)
  function pnoise(x, y, px, py, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const m = (a, p) => ((a % p) + p) % p; const x0 = m(xi, px), x1 = m(xi + 1, px), y0 = m(yi, py), y1 = m(yi + 1, py);
    const a = hash2(x0, y0, s), b = hash2(x1, y0, s), c = hash2(x0, y1, s), d = hash2(x1, y1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function pfbm(x, y, px, py, s, oct) { let t = 0, a = 0.5, n = 0, f = 1; for (let i = 0; i < (oct || 4); i++) { t += a * pnoise(x * f, y * f, px * f, py * f, s + i * 13); n += a; a *= 0.5; f *= 2; } return t / n; }

  // ---------------------------------------------------------------- paper texture (overlay tiles, 128 = neutral)
  const _tiles = {};
  function paperTile(kind) {
    kind = kind || 'paper'; if (_tiles[kind]) return _tiles[kind];
    const N = 512, c = makeCanvas(N, N), g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data;
    const K = { paper: [26, 14, 16, 5], cloth: [16, 10, 10, 4], wool: [20, 24, 22, 7], card: [18, 10, 8, 3] }[kind] || [26, 14, 16, 5];
    const sd = hash2(kind.length, kind.charCodeAt(0), 7) * 1000 | 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const m = pfbm(x / N * 5, y / N * 5, 5, 5, sd, 4), f = pnoise(x / N * 48, y / N * 48, 48, 48, sd + 7), gr = hash2(x, y, sd + 3);
      let v = 128 + (m - 0.5) * K[0] * 2 + (f - 0.5) * K[1] * 2 + (gr - 0.5) * K[2] * 2;
      if (kind === 'cloth') v += Math.sin((x + 0.35 * y) * 0.9) * 3 + Math.sin((y - 0.2 * x) * 1.1) * 3;
      if (kind === 'wool') v += (pnoise(x / N * 160, y / N * 160, 160, 160, sd + 9) - 0.5) * 26;
      const o = (y * N + x) * 4; d[o] = d[o + 1] = d[o + 2] = clamp(v, 0, 255); d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // fibres and inclusions, wrapped so the tile repeats without seams
    const r = rng('fib' + kind); g.lineCap = 'round';
    const nf = kind === 'wool' ? 900 : 380;
    for (let i = 0; i < nf; i++) {
      const x = r() * N, y = r() * N, a = r() * Math.PI, l = (kind === 'wool' ? 4 : 6) + r() * 20, light = r() < 0.5;
      g.strokeStyle = light ? `rgba(255,255,255,${0.12 + r() * 0.2})` : `rgba(0,0,0,${0.08 + r() * 0.16})`; g.lineWidth = 0.6 + r() * 0.9;
      for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + Math.cos(a) * l * 0.5 + (r() - 0.5) * 5, y + oy + Math.sin(a) * l * 0.5, x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke(); }
    }
    for (let i = 0; i < 140; i++) { const x = r() * N, y = r() * N, s = 0.6 + r() * 1.6; g.fillStyle = r() < 0.7 ? `rgba(0,0,0,${0.2 + r() * 0.3})` : `rgba(255,255,255,${0.25 + r() * 0.3})`; g.beginPath(); g.ellipse(x, y, s, s * (0.6 + r() * 0.6), r() * 3, 0, 7); g.fill(); }
    return (_tiles[kind] = c);
  }
  function texPattern(g, kind, seed, scale) {
    const p = g.createPattern(paperTile(kind), 'repeat'); const r = rng('tex' + seed);
    p.setTransform(new DOMMatrix().translate(r() * 512, r() * 512).rotate((r() - 0.5) * 30).scale(scale || 1)); return p;
  }
  // lay a texture into a path (overlay). amt 0..1
  function texture(g, path, amt, seed, kind, scale) {
    if (!amt) return; g.save(); g.clip(path); g.globalCompositeOperation = 'overlay'; g.globalAlpha = amt;
    g.fillStyle = texPattern(g, kind || 'paper', seed || 1, scale); const m = g.getTransform(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillRect(0, 0, g.canvas.width, g.canvas.height); g.setTransform(m); g.restore();
  }

  // ---------------------------------------------------------------- cut-paper pieces
  // piece(g, shapeOrPath, {fill, rough, seed, tex, kind, texScale, lift:[dx,dy], liftBlur, liftAlpha, liftColor})
  function piece(g, shp, o) {
    o = o || {}; const p = shp instanceof Path2D ? shp : shp.path(o.rough == null ? 1.0 : o.rough, o.seed || 3);
    if (o.lift) { g.save(); g.filter = `blur(${o.liftBlur == null ? 4 : o.liftBlur}px)`; g.globalAlpha = o.liftAlpha == null ? 0.45 : o.liftAlpha; g.fillStyle = o.liftColor || '#05060A'; g.translate(o.lift[0], o.lift[1]); g.fill(p); g.restore(); }
    if (o.fill) { g.fillStyle = o.fill; g.fill(p); }
    if (o.tex !== 0) texture(g, p, o.tex == null ? 0.55 : o.tex, o.seed || 3, o.kind, o.texScale);
    return p;
  }
  // a crescent of `color` inside path on the side facing (dx,dy): the lit paper edge or the core shadow (negative d)
  const _cres = { c: null };
  function crescent(g, path, dx, dy, color, alpha, blur) {
    if (!_cres.c) _cres.c = makeCanvas(W, H); const t = _cres.c.getContext('2d'); t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'source-over'; t.filter = 'none'; t.clearRect(0, 0, W, H);
    const m = g.getTransform(); t.setTransform(m); t.fillStyle = color; t.fill(path); t.globalCompositeOperation = 'destination-out'; if (blur) t.filter = `blur(${blur}px)`; t.translate(-dx, -dy); t.fill(path);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha == null ? 1 : alpha; g.drawImage(_cres.c, 0, 0); g.restore();
  }
  // stepped (posterised) linear bands across a path from p0 to p1 with hand-cut band edges. colors: dark -> light along p0 -> p1
  function bands(g, path, p0, p1, colors, o) {
    o = o || {}; g.save(); g.clip(path);
    const n = colors.length, dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, vx = -uy, vy = ux, big = 3000;
    const stops = o.stops || colors.map((c, i) => i / n);
    colors.forEach((c, i) => {
      const a = stops[i] * L, sh = O.S(); const pts = [];
      for (let k = -12; k <= 12; k++) pts.push([p0[0] + ux * a + vx * k * big / 12, p0[1] + uy * a + vy * k * big / 12]);
      for (let k = 12; k >= -12; k--) pts.push([p0[0] + ux * (big) + vx * k * big / 12, p0[1] + uy * (big) + vy * k * big / 12]);
      if (i === 0) { pts.length = 0; for (let k = -12; k <= 12; k++) pts.push([p0[0] - ux * big + vx * k * big / 12, p0[1] - uy * big + vy * k * big / 12]); for (let k = 12; k >= -12; k--) pts.push([p0[0] + ux * big + vx * k * big / 12, p0[1] + uy * big + vy * k * big / 12]); }
      sh.poly(pts); g.fillStyle = c; g.fill(sh.path(o.rough == null ? 2.2 : o.rough, (o.seed || 5) + i));
    });
    g.restore();
  }
  // smooth light (the phone's): radial gradient, screen by default
  function glow(g, x, y, r, color, alpha, mode, sy) {
    g.save(); g.globalCompositeOperation = mode || 'screen'; g.translate(x, y); if (sy) g.scale(1, sy);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); const c = hexToRgb(color);
    [[0, 1], [0.18, 0.72], [0.4, 0.38], [0.65, 0.14], [1, 0]].forEach(([t, a]) => gr.addColorStop(t, `rgba(${c[0]},${c[1]},${c[2]},${a * (alpha == null ? 1 : alpha)})`));
    g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r); g.restore();
  }
  function dropShadow(g, img, x, y, o) {
    o = o || {}; const t = layer(img.width, img.height); t.drawImage(img, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = o.color || '#05060A'; t.fillRect(0, 0, img.width, img.height);
    g.save(); g.globalAlpha = o.alpha == null ? 0.45 : o.alpha; g.filter = `blur(${o.blur == null ? 4 : o.blur}px)`; g.drawImage(t.canvas, x + (o.dx == null ? 3 : o.dx), y + (o.dy == null ? 4 : o.dy), o.w || img.width, o.h || img.height); g.restore();
  }
  // dust specks in a path (real surfaces only)
  function specks(g, path, box, n, color, seed, rmax, amax) {
    const r = rng(seed || 'sp'); g.save(); g.clip(path); g.fillStyle = color;
    for (let i = 0; i < n; i++) { const x = box[0] + r() * box[2], y = box[1] + r() * box[3], s = 0.5 + r() * (rmax || 1.6); g.globalAlpha = (0.2 + r() * 0.8) * (amax || 0.6); g.beginPath(); g.ellipse(x, y, s, s * (0.5 + r() * 0.5), r() * 3, 0, 7); g.fill(); }
    g.restore();
  }

  // ---------------------------------------------------------------- paths
  function rrect(x, y, w, h, r, path) {
    const p = path || new Path2D(); r = Math.min(r, w / 2, h / 2);
    p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.arcTo(x + w, y, x + w, y + r, r); p.lineTo(x + w, y + h - r); p.arcTo(x + w, y + h, x + w - r, y + h, r);
    p.lineTo(x + r, y + h); p.arcTo(x, y + h, x, y + h - r, r); p.lineTo(x, y + r); p.arcTo(x, y, x + r, y, r); p.closePath(); return p;
  }
  function spline(pts, closed, path) {
    const p = path || new Path2D(), n = pts.length; const Q = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
    p.moveTo(pts[0][0], pts[0][1]); const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = Q(i - 1), p1 = Q(i), p2 = Q(i + 1), p3 = Q(i + 2), k = 1 / 6;
      const c1 = p1[2] ? [p1[0], p1[1]] : [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
      const c2 = p2[2] ? [p2[0], p2[1]] : [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
      p.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
    }
    if (closed) p.closePath(); return p;
  }
  // smooth cut-paper shape through points (OTM Shape, so it can be roughened): [x,y,1] = hard corner
  function blob(pts) {
    const sh = O.S(), n = pts.length, Q = i => pts[(i + n) % n]; sh.M(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++) {
      const p0 = Q(i - 1), p1 = Q(i), p2 = Q(i + 1), p3 = Q(i + 2), k = 1 / 6;
      const c1 = p1[2] ? [p1[0], p1[1]] : [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
      const c2 = p2[2] ? [p2[0], p2[1]] : [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
      sh.C(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
    }
    return sh.Z();
  }
  // map a canvas (w x h) onto a quad [tl, tr, br, bl] by bilinear subdivision (mild perspective)
  function warp(g, img, q, nx, ny) {
    nx = nx || 14; ny = ny || 20; const w = img.width, h = img.height;
    const at = (u, v) => { const a = [lerp(q[0][0], q[1][0], u), lerp(q[0][1], q[1][1], u)], b = [lerp(q[3][0], q[2][0], u), lerp(q[3][1], q[2][1], u)]; return [lerp(a[0], b[0], v), lerp(a[1], b[1], v)]; };
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const u0 = i / nx, u1 = (i + 1) / nx, v0 = j / ny, v1 = (j + 1) / ny;
      const A = at(u0, v0), B = at(u1, v0), D = at(u0, v1);
      // affine from the cell's top-left, top-right and bottom-left corners; clip to the cell (a hair larger to hide seams)
      const C2 = at(u1, v1); g.save(); g.beginPath(); const e = 0.6, cx = (A[0] + C2[0]) / 2, cy = (A[1] + C2[1]) / 2;
      const ex = p => [p[0] + Math.sign(p[0] - cx) * e, p[1] + Math.sign(p[1] - cy) * e];
      [A, B, C2, D].map(ex).forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.clip();
      const sx = (u1 - u0) * w, sy = (v1 - v0) * h;
      g.transform((B[0] - A[0]) / sx, (B[1] - A[1]) / sx, (D[0] - A[0]) / sy, (D[1] - A[1]) / sy, A[0] - (B[0] - A[0]) / sx * u0 * w - (D[0] - A[0]) / sy * v0 * h, A[1] - (B[1] - A[1]) / sx * u0 * w - (D[1] - A[1]) / sy * v0 * h);
      g.drawImage(img, 0, 0); g.restore();
    }
  }

  // ---------------------------------------------------------------- the faces: SDF sculpture
  const CAST = {
    him: { jawW: 0.302, chin: 1.1, nose: 0.96, neckR: 0.175, browK: 1.15, lipsW: 1.0, lipsT: 0.8, eyeK: 0.95,
      skin: '#B47C58', lips: '#94584A', hair: '#1D1613', hairHi: '#4B3A31', iris: '#2A1B13', sclera: '#E2D6C3', brows: '#1E1613',
      stubble: 1, freckles: 0, blush: '#B5604F', blushK: 0.07, lash: '#1A1210', lashK: 0.8 },
    her: { jawW: 0.27, chin: 0.94, nose: 0.86, neckR: 0.152, browK: 0.82, lipsW: 0.96, lipsT: 1.18, eyeK: 1.04,
      skin: '#EBC4A8', lips: '#BF6D66', hair: '#9E4527', hairHi: '#D7814E', iris: '#56663A', sclera: '#EFE7DA', brows: '#7A3B24',
      stubble: 0, freckles: 1, blush: '#E28A7C', blushK: 0.16, lash: '#2A1A14', lashK: 1.25 },
  };

  function rotM(yaw, pitch, roll) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    const A = [[cy, 0, sy], [-sp * sy, cp, sp * cy], [-cp * sy, -sp, cp * cy]];
    return [[cr * A[0][0] - sr * A[1][0], cr * A[0][1] - sr * A[1][1], cr * A[0][2] - sr * A[1][2]],
      [sr * A[0][0] + cr * A[1][0], sr * A[0][1] + cr * A[1][1], sr * A[0][2] + cr * A[1][2]], A[2]];
  }
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  const smax = (a, b, k) => -smin(-a, -b, k);
  function sdE(x, y, z, rx, ry, rz) { const ax = x / rx, ay = y / ry, az = z / rz; const k0 = Math.sqrt(ax * ax + ay * ay + az * az); const bx = ax / rx, by = ay / ry, bz = az / rz; const k1 = Math.sqrt(bx * bx + by * by + bz * bz) || 1e-6; return k0 * (k0 - 1) / k1; }
  function sdCap(x, y, z, ax, ay, az, bx, by, bz, r) { const px = x - ax, py = y - ay, pz = z - az, dx = bx - ax, dy = by - ay, dz = bz - az; const h = clamp((px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz), 0, 1); const qx = px - dx * h, qy = py - dy * h, qz = pz - dz * h; return Math.sqrt(qx * qx + qy * qy + qz * qz) - r; }
  function sdCone(x, y, z, ax, ay, az, bx, by, bz, r1, r2) { const px = x - ax, py = y - ay, pz = z - az, dx = bx - ax, dy = by - ay, dz = bz - az; const L2 = dx * dx + dy * dy + dz * dz; const h = clamp((px * dx + py * dy + pz * dz) / L2, 0, 1); const qx = px - dx * h, qy = py - dy * h, qz = pz - dz * h; return Math.sqrt(qx * qx + qy * qy + qz * qz) - lerp(r1, r2, h); }
  const ss01 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function lerpTab(tab, x) { if (x <= tab[0][0]) return tab[0][1]; for (let i = 1; i < tab.length; i++) if (x <= tab[i][0]) { const t = (x - tab[i - 1][0]) / (tab[i][0] - tab[i - 1][0]); const s = t * t * (3 - 2 * t); return lerp(tab[i - 1][1], tab[i][1], s); } return tab[tab.length - 1][1]; }

  // hairline heights by angle around the head (0 = front, PI = back)
  const HAIRLINE = {
    short: [[0, -0.345], [0.45, -0.325], [0.85, -0.25], [1.15, -0.06], [1.32, 0.05], [1.5, -0.02], [1.75, 0.0], [2.2, 0.16], [Math.PI, 0.24]],
    long: [[0, -0.36], [0.5, -0.33], [0.95, -0.2], [1.25, 0.02], [1.6, 0.1], [2.2, 0.3], [Math.PI, 0.35]],
  };

  // build the signed distance function for a character, hair and expression
  function makeSDF(spec, M) {
    const C = CAST[spec.who], hairStyle = spec.hair || (spec.who === 'him' ? 'short' : 'bob');
    const jw = C.jawW, ch = C.chin, nk = C.nose, nR = C.neckR, sh = spec.mode === 'gloss' ? 0 : 1;
    const asym = sh * (spec.asym == null ? 1 : spec.asym);
    const comp = { s: 0, e: 0, h: 0 };
    const hl = HAIRLINE[hairStyle === 'short' ? 'short' : 'long'];
    const part = spec.part == null ? 0.12 : spec.part;          // side part (bob, long)
    const sd = spec.seed || 1;
    const neckLen = spec.neckLen == null ? 1.1 : spec.neckLen;
    const gx = (x, y, z) => M[0][0] * x + M[0][1] * y + M[0][2] * z, gy = (x, y, z) => M[1][0] * x + M[1][1] * y + M[1][2] * z, gz = (x, y, z) => M[2][0] * x + M[2][1] * y + M[2][2] * z;
    function f(x, y, z) {
      const ax = Math.abs(x);
      // ----- skin
      let d = sdE(x, y + 0.14, z + 0.05, 0.352, 0.41, 0.42);                       // cranium
      d = smin(d, sdE(x, y - 0.075, z - 0.085, 0.316, 0.27, 0.255), 0.08);           // midface
      d = smin(d, sdE(x, y - 0.27, z - 0.035, jw, 0.165, 0.24), 0.09);               // jaw
      d = smin(d, sdE(x, y - 0.385, z - 0.19, 0.1 * ch, 0.062, 0.085), 0.07);        // chin
      d = smin(d, sdE(x, y + 0.075, z - 0.245, 0.272, 0.062, 0.09), 0.06);           // brow ridge
      d = smin(d, sdE(ax - 0.188, y - 0.07, z - 0.2, 0.112, 0.072, 0.09), 0.07);     // cheekbones
      d = smin(d, sdCone(x, y, z, 0, -0.02, 0.322, 0, 0.18, 0.395 + 0.03 * nk, 0.03, 0.046 * nk), 0.05);   // nose
      d = smin(d, sdE(x, y - 0.208, z - 0.352, 0.072 * nk, 0.036, 0.046), 0.03);     // nose wings
      d = smin(d, sdE(x, y - 0.3, z - 0.262, 0.132, 0.074, 0.1), 0.06);              // muzzle
      d = smin(d, sdE(x, y - 0.287, z - 0.334, 0.07 * C.lipsW, 0.019 * C.lipsT, 0.033), 0.02);   // upper lip
      d = smin(d, sdE(x, y - 0.33, z - 0.325, 0.064 * C.lipsW, 0.024 * C.lipsT, 0.034), 0.02);   // lower lip
      d = smax(d, -sdE(ax - 0.152, y + 0.006, z - 0.345, 0.084, 0.054, 0.062), 0.05);  // eye sockets
      d = smin(d, sdCap(x, y, z, 0, 0.2, -0.08, 0, 0.2 + neckLen, -0.12, nR), 0.12); // neck
      d = smin(d, sdE(ax - 0.338, y - 0.075, z + 0.045, 0.042, 0.112, 0.068), 0.025); // ears
      comp.s = d;
      // ----- eyes
      const e = Math.sqrt((ax - 0.152) * (ax - 0.152) + y * y + (z - 0.244) * (z - 0.244)) - 0.078;
      comp.e = e;
      // ----- hair
      let hd = 1e3;
      if (hairStyle === 'short') {
        const th = Math.abs(Math.atan2(x, z));
        const yh = lerpTab(hl, th) + (vnoise(x * 22 + 3, z * 22, sd) - 0.5) * 0.03;
        const bump = (fbm(x * 9 + 11, y * 9 + z * 6, sd + 4, 3) - 0.5) * 0.05 + (vnoise(x * 30, z * 30 + y * 10, sd + 2) - 0.5) * 0.012;
        hd = sdE(x + 0.004, y + 0.175, z + 0.07, 0.38, 0.432, 0.462) - 0.01 - bump - 0.02 * ss01(-0.25, -0.5, y) ;
        hd = smax(hd, (y - yh) * 0.7, 0.025);
      } else if (hairStyle === 'bob' || hairStyle === 'long') {
        // her side part sits at x = part; the fringe sweeps from it across the forehead toward -x and down to the brow
        const yF = x < part ? -0.37 + 0.2 * ss01(part, -0.3, x) : -0.37 + 0.13 * ss01(part, 0.34, x);
        const th = Math.abs(Math.atan2(x, z));
        const yh = lerp(lerpTab(hl, th), yF, 1 - ss01(0.75, 1.25, th)) + (vnoise(x * 16, z * 16, sd) - 0.5) * 0.015;
        const cap = sdE(x, y + 0.165, z + 0.06, 0.374, 0.43, 0.452) - 0.014 - 0.012 * ss01(part + 0.15, part - 0.2, x) * ss01(-0.2, -0.45, y);
        let capd = smax(cap, (y - yh) * 0.7, 0.03);
        // the open face: no hair in front of the face below the hairline
        const win = Math.max(sdE(x, y - 0.2, z - 0.27, 0.292, 0.54, 0.34), (yh - y) * 0.8);
        if (hairStyle === 'bob') {
          // the bob: hangs straight from the widest part of the skull to a blunt hem above the jaw
          const cutY = (spec.hem == null ? 0.285 : spec.hem) + 0.02 * x + (vnoise(x * 40, z * 40, sd + 3) - 0.5) * 0.012;
          const rx = 0.388 + 0.03 * ss01(-0.1, 0.28, y), rz = 0.44 + 0.02 * ss01(-0.1, 0.28, y);
          const kq = Math.sqrt((x / rx) * (x / rx) + ((z + 0.055) / rz) * ((z + 0.055) / rz));
          let bob = (kq - 1) * 0.39 - (fbm(x * 7, y * 16, sd + 8, 2) - 0.5) * 0.018;
          bob = smax(bob, (y - cutY) * 0.9, 0.025);
          bob = smax(bob, (-0.2 - y), 0.05);
          bob = smax(bob, -win, 0.03);
          capd = smin(capd, bob, 0.05);
        } else {
          // long hair: two curtains and the back fall, hanging in VIEW space (gravity), soft waves
          const vx = gx(x, y, z), vy = gy(x, y, z), vz = gz(x, y, z);
          const top = spec.hairTop == null ? -0.05 : spec.hairTop, bot = spec.hairLen == null ? 1.25 : spec.hairLen;
          const curt = (s) => { const t = clamp((vy - top) / (bot - top), 0, 1); const wave = Math.sin(vy * 11 + s * 1.7 + sd) * 0.022 * t;
            const cx = s * (0.36 + 0.2 * t) + wave + (spec.hairSwing || 0) * t * t;
            const kx = (vx - cx) / (0.065 + 0.05 * t), kz = (vz + 0.06 + 0.12 * t) / 0.15; let dd = (Math.sqrt(kx * kx + kz * kz) - 1) * 0.08;
            return smax(smax(dd, vy - bot + 0.04 * Math.abs(vx - cx) * 6, 0.05), top - vy, 0.08); };
          const back = sdE(vx, vy - 0.3, vz + 0.2, 0.42, 0.62, 0.2);
          let fall = smin(curt(-1), curt(1), 0.1); fall = smin(fall, back, 0.12);
          fall = smax(fall, -win, 0.035);
          capd = smin(capd, fall, 0.07);
        }
        hd = capd;
      }
      comp.h = hd;
      return Math.min(d, e, hd);
    }
    f.comp = comp; f.hairStyle = hairStyle; f.asym = asym;
    return f;
  }


  // ---------------------------------------------------------------- generic SDF renderer (orthographic, view looks down -z)
  // o: {sdf(x,y,z), matOf() (called right after sdf at the hit point), albedo(x,y,z,nx,ny,nz,mat) -> writes o.out, M (local->view),
  //     s (px per unit), ss, bounds [x0,y0,x1,y1] (view units around o.x,o.y), lights, amb, mode, seed, warp (px), aoPoster, eps, aoK}
  function render3D(o) {
    const mode = o.mode || 'grain', grain = mode === 'grain', gloss = mode === 'gloss', flash = mode === 'flash';
    const M = o.M, sdf = o.sdf, s = o.s, ss = o.ss || 2, b = o.bounds, out = o.out, sd = o.seed || 1, warpAmp = o.warp || 0;
    const w = Math.ceil((b[2] - b[0]) * s), h = Math.ceil((b[3] - b[1]) * s), w2 = Math.ceil(w * ss), h2 = Math.ceil(h * ss);
    const cv = makeCanvas(w2, h2), cg = cv.getContext('2d'), img = cg.createImageData(w2, h2), D = img.data;
    const T = [[M[0][0], M[1][0], M[2][0]], [M[0][1], M[1][1], M[2][1]], [M[0][2], M[1][2], M[2][2]]];
    const dlx = -T[0][2], dly = -T[1][2], dlz = -T[2][2];
    const lights = (o.lights || [{ dir: [-0.5, -0.4, 0.75], col: [1, 0.95, 0.9], k: 1, poster: [0.12, 0.5] }]).map(L => {
      const q = Object.assign({ k: 1, wrap: 0 }, L);
      if (q.dir) { let [x, y, z] = q.dir; if (q.local) { const vx = M[0][0] * x + M[0][1] * y + M[0][2] * z, vy = M[1][0] * x + M[1][1] * y + M[1][2] * z, vz = M[2][0] * x + M[2][1] * y + M[2][2] * z; x = vx; y = vy; z = vz; } const l = Math.hypot(x, y, z) || 1; q.d = [x / l, y / l, z / l]; }
      q.c = Array.isArray(q.col) ? q.col : rgb01(q.col || '#FFFFFF'); return q;
    });
    const amb = o.amb ? (Array.isArray(o.amb) ? o.amb : rgb01(o.amb)) : [0.25, 0.25, 0.3];
    const ex = (o.extent || 3), e = o.eps || 0.0016, aoK = o.aoK == null ? 1 : o.aoK;
    const inv = 1 / (s * ss);
    const coarse = new Uint8Array(Math.ceil(w2 / 8) * Math.ceil(h2 / 8) + 64); const cw = Math.ceil(w2 / 8);
    for (let j = 0; j < h2; j += 8) for (let i = 0; i < w2; i += 8) {
      const X = b[0] + (i + 4) * inv, Y = b[1] + (j + 4) * inv; const ox = T[0][0] * X + T[0][1] * Y + T[0][2] * ex, oy = T[1][0] * X + T[1][1] * Y + T[1][2] * ex, oz = T[2][0] * X + T[2][1] * Y + T[2][2] * ex;
      let t = 0, hit = 0; for (let k = 0; k < 80 && t < ex * 2; k++) { const d = sdf(ox + dlx * t, oy + dly * t, oz + dlz * t); if (d < 8 * inv * 1.5) { hit = 1; break; } t += d * 0.9; }
      coarse[(j >> 3) * cw + (i >> 3)] = hit;
    }
    const near = (i, j) => { const ci = i >> 3, cj = j >> 3; for (let b2 = -1; b2 <= 1; b2++) for (let a2 = -1; a2 <= 1; a2++) { const x2 = ci + a2, y2 = cj + b2; if (x2 >= 0 && y2 >= 0 && x2 < cw && coarse[y2 * cw + x2]) return true; } return false; };
    for (let j = 0; j < h2; j++) for (let i = 0; i < w2; i++) {
      if (!near(i, j)) continue;
      let px = i, py = j; const wx = (i / ss) + b[0] * s, wy = (j / ss) + b[1] * s;
      if (warpAmp) { px += ((vnoise(wx * 0.07, wy * 0.07, sd + 61) - 0.5) * 2 + (vnoise(wx * 0.45, wy * 0.45, sd + 62) - 0.5) * 0.7) * warpAmp * ss; py += ((vnoise(wx * 0.07 + 40, wy * 0.07, sd + 63) - 0.5) * 2 + (vnoise(wx * 0.45, wy * 0.45 + 9, sd + 64) - 0.5) * 0.7) * warpAmp * ss; }
      const X = b[0] + (px + 0.5) * inv, Y = b[1] + (py + 0.5) * inv;
      const ox = T[0][0] * X + T[0][1] * Y + T[0][2] * ex, oy = T[1][0] * X + T[1][1] * Y + T[1][2] * ex, oz = T[2][0] * X + T[2][1] * Y + T[2][2] * ex;
      let t = 0, hit = false, x = 0, y = 0, z = 0;
      for (let k = 0; k < 110 && t < ex * 2; k++) { x = ox + dlx * t; y = oy + dly * t; z = oz + dlz * t; const d = sdf(x, y, z); if (d < 0.0008) { hit = true; break; } t += d * 0.92; }
      if (!hit) continue;
      sdf(x, y, z); const mat = o.matOf ? o.matOf(x, y, z) : 0;
      const a1 = sdf(x + e, y - e, z - e), a2 = sdf(x - e, y - e, z + e), a3 = sdf(x - e, y + e, z - e), a4 = sdf(x + e, y + e, z + e);
      let nx = a1 - a2 - a3 + a4, ny = -a1 - a2 + a3 + a4, nz = -a1 + a2 - a3 + a4; const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      const o1 = sdf(x + nx * 0.025 * aoK, y + ny * 0.025 * aoK, z + nz * 0.025 * aoK), o2 = sdf(x + nx * 0.07 * aoK, y + ny * 0.07 * aoK, z + nz * 0.07 * aoK);
      let ao = clamp(1 - 5 / aoK * (Math.max(0, 0.025 * aoK - o1) + 0.5 * Math.max(0, 0.07 * aoK - o2)), 0.35, 1);
      const vx = M[0][0] * nx + M[0][1] * ny + M[0][2] * nz, vy = M[1][0] * nx + M[1][1] * ny + M[1][2] * nz, vz = M[2][0] * nx + M[2][1] * ny + M[2][2] * nz;
      const hx = M[0][0] * x + M[0][1] * y + M[0][2] * z, hy = M[1][0] * x + M[1][1] * y + M[1][2] * z, hz = M[2][0] * x + M[2][1] * y + M[2][2] * z;
      o.albedo(x, y, z, nx, ny, nz, mat, vx, vy, vz);
      const jit = grain ? (vnoise(wx * 0.045, wy * 0.045, sd + 77) - 0.5) * 0.12 : 0;
      let lr = amb[0], lg = amb[1], lb = amb[2];
      if (grain && o.aoPoster !== false) ao = ao > 0.62 + jit ? 1 : 0.7;
      lr *= lerp(1, ao, 0.9); lg *= lerp(1, ao, 0.9); lb *= lerp(1, ao, 0.9);
      let spec2 = 0;
      for (let li = 0; li < lights.length; li++) {
        const L = lights[li]; let dx, dy, dz, att = 1;
        if (L.pos) { dx = L.pos[0] - hx; dy = L.pos[1] - hy; dz = L.pos[2] - hz; const dl = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1; dx /= dl; dy /= dl; dz /= dl; att = L.falloff ? 1 / (1 + (dl / L.falloff) * (dl / L.falloff)) : 1; }
        else { dx = L.d[0]; dy = L.d[1]; dz = L.d[2]; }
        let k = vx * dx + vy * dy + vz * dz; k = (k + L.wrap) / (1 + L.wrap); k = Math.max(0, k) * att;
        if (L.poster && (grain || flash) && !L.smooth) { const pts = L.poster; let lv = 0; for (let q = 0; q < pts.length; q++) if (k > pts[q] + jit * (L.jit == null ? 1 : L.jit)) lv = (L.levels ? L.levels[q] : (q + 1) / pts.length); k = lv; }
        if (L.rim) { const fr = Math.pow(1 - Math.max(0, vz), L.rim); k *= fr; if (grain) k = k > 0.25 + jit ? 1 : 0; }
        k *= L.k * (mat === 1 ? 0.95 : 1) * (L.ao === false ? 1 : lerp(1, ao, 0.5));
        lr += L.c[0] * k; lg += L.c[1] * k; lb += L.c[2] * k;
        if (gloss && !L.rim) { const hx2 = dx, hy2 = dy, hz2 = dz + 1, hl = Math.sqrt(hx2 * hx2 + hy2 * hy2 + hz2 * hz2) || 1; const ndh = Math.max(0, (vx * hx2 + vy * hy2 + vz * hz2) / hl); spec2 += Math.pow(ndh, mat === 2 ? 18 : 22) * (mat === 2 ? 0.3 : 0.07) * L.k * att; }
      }
      let r = out[0] * lr, g2 = out[1] * lg, bb = out[2] * lb;
      if (gloss) { r += spec2; g2 += spec2 * 0.95; bb += spec2 * 0.92; }
      if (flash) { r = r * 1.08 + 0.03; g2 = g2 * 1.04 + 0.03; bb = bb * 0.98 + 0.02; }
      const q = (j * w2 + i) * 4; D[q] = clamp(r * 255, 0, 255); D[q + 1] = clamp(g2 * 255, 0, 255); D[q + 2] = clamp(bb * 255, 0, 255); D[q + 3] = 255;
    }
    cg.putImageData(img, 0, 0);
    const outC = makeCanvas(w, h), og = outC.getContext('2d'); og.imageSmoothingQuality = 'high'; og.drawImage(cv, 0, 0, w, h);
    return { canvas: outC, x: o.x + b[0] * s, y: o.y + b[1] * s, w, h };
  }

  // render a head. spec: {who, hair, x, y (world px of the head origin: between the eyes), s (px per head height), yaw, pitch, roll,
  //   eyes 0..1, gaze [x,y], smile 0..1, open 0..1, brow -1..1, mode 'grain'|'gloss'|'flash', lights:[{dir:[x,y,z] (view; or local:true),
  //   pos:[x,y,z] (view head units; point light), col, k, poster:[t1,t2,...] levels, wrap}], amb:[r,g,b] 0..1, bounds:[x0,y0,x1,y1], ss, seed, ao}
  function head(spec) {
    const C = CAST[spec.who]; const mode = spec.mode || 'grain', grain = mode === 'grain', gloss = mode === 'gloss', flash = mode === 'flash';
    const M = rotM(spec.yaw || 0, spec.pitch || 0, spec.roll || 0);
    const sdf = makeSDF(spec, M), comp = sdf.comp;
    const s = spec.s, b = spec.bounds || [-0.75, -0.85, 0.75, 1.1];
    const skin = rgb01(spec.skin || C.skin), lipsC = rgb01(spec.lips || C.lips), hairC = rgb01(spec.hairCol || C.hair), hairHi = rgb01(spec.hairHi || C.hairHi);
    const iris = rgb01(C.iris), scl = rgb01(C.sclera), browC = rgb01(C.brows), lashC = rgb01(C.lash), blushC = rgb01(C.blush);
    const eyesOpen = spec.eyes == null ? 0.85 : spec.eyes, smile = spec.smile || 0, mOpen = spec.open || 0, browR = spec.brow || 0;
    const gz0 = spec.gaze || [0, 0]; let gvx = gz0[0], gvy = gz0[1], gvz = 1; { const l = Math.hypot(gvx, gvy, gvz); gvx /= l; gvy /= l; gvz /= l; }
    const sd = spec.seed || 1, asym = sdf.asym;
    const warpAmp = grain ? (spec.warp == null ? 1.1 : spec.warp) : (flash ? 0.5 : 0);
    const out = [0, 0, 0];
    // albedo at a local hit point (+ which material)
    function albedo(x, y, z, nlx, nly, nlz, mat) {
      const ax = Math.abs(x), side = x < 0 ? -1 : 1;
      if (mat === 2) {   // hair
        const st = fbm(x * 40 + y * 4, y * 9 + z * 30, sd + 21, 3), st2 = vnoise(x * 90 + z * 40, y * 20, sd + 5);
        let k = grain ? (st > 0.63 ? 0.32 : st < 0.36 ? -0.15 : 0) + (st2 > 0.78 ? 0.18 : 0) : flash ? 0 : (st - 0.5) * 0.3;
        out[0] = hairC[0] + (hairHi[0] - hairC[0]) * Math.max(0, k) + hairC[0] * Math.min(0, k); out[1] = hairC[1] + (hairHi[1] - hairC[1]) * Math.max(0, k) + hairC[1] * Math.min(0, k); out[2] = hairC[2] + (hairHi[2] - hairC[2]) * Math.max(0, k) + hairC[2] * Math.min(0, k);
        return;
      }
      if (mat === 1) {   // eyeball: lids, opening, iris
        const ex = (ax - 0.152) * 1, ey = y + (grain ? asym * side * 0.0035 : 0), hw = 0.074 * C.eyeK; const u = clamp(ex / hw, -1.2, 1.2);
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
          // the upper lid's shadow on the eye
          if (ey < upper + 0.012) { out[0] *= 0.72; out[1] *= 0.72; out[2] *= 0.74; }
          return;
        }
        // crease
        if (eyesOpen > 0.3 && Math.abs(u) < 0.95 && Math.abs(ey - (upper - 0.024 - 0.008 * uu)) < 0.0035) { out[0] *= 0.82; out[1] *= 0.78; out[2] *= 0.78; }
        return;
      }
      // skin
      out[0] = skin[0]; out[1] = skin[1]; out[2] = skin[2];
      // blush
      const bd = ((ax - 0.165) * (ax - 0.165) + (y - 0.13) * (y - 0.13)) / 0.006; const bk = C.blushK * Math.exp(-bd) * (flash ? 0.3 : gloss ? 1.6 : 1);
      out[0] += (blushC[0] - out[0]) * bk; out[1] += (blushC[1] - out[1]) * bk; out[2] += (blushC[2] - out[2]) * bk;
      // ears: the inner ear
      if (ax > 0.3 && z < 0.06 && y > -0.04 && y < 0.18) { const ix = (y - 0.075) / 0.07, iz = (z + 0.04) / 0.045; if (ix * ix + iz * iz < 1 && Math.abs(nlx) > 0.5) { out[0] *= 0.72; out[1] *= 0.62; out[2] *= 0.6; } }
      // stubble (him): real stubble is a texture; the phone's version is a smooth tint
      if (C.stubble && z > -0.05 && y > 0.12) {
        const zone = ss01(0.17, 0.23, y + 0.22 * (0.3 - ax)) * (y > 0.27 && y < 0.36 && ax < 0.072 ? 0 : 1) * (1 - ss01(0.5, 0.58, y + (0.33 - ax) * 0.25)) * (ax > 0.31 && y < 0.24 ? 0 : 1);
        const n = grain ? (hash2(Math.floor(x * 260), Math.floor(y * 260 + z * 120), sd) > 0.5 ? 1 : 0.35) : 0.7;
        const k = zone * (spec.stubble == null ? 0.2 : spec.stubble) * n * (flash ? 0.5 : 1);
        out[0] *= 1 - k * 0.95; out[1] *= 1 - k * 0.92; out[2] *= 1 - k * 0.78;
      }
      // freckles (her): only the real face has them
      if (C.freckles && grain && z > 0.12 && y > -0.05 && y < 0.2 && ax < 0.27) {
        const dens = Math.exp(-((ax - 0.1) * (ax - 0.1) / 0.02 + (y - 0.085) * (y - 0.085) / 0.006)) + 0.6 * Math.exp(-(x * x / 0.002 + (y - 0.14) * (y - 0.14) / 0.004));
        const fx = x * 75, fy = y * 75 + z * 30, ix = Math.floor(fx), iy = Math.floor(fy);
        const hh = hash2(ix, iy, sd + 41);
        if (hh < dens * 0.42) { const cx = ix + 0.25 + 0.5 * hash2(ix, iy, sd + 42), cy = iy + 0.25 + 0.5 * hash2(ix, iy, sd + 43); const r = 0.18 + 0.2 * hash2(ix, iy, sd + 44);
          if ((fx - cx) * (fx - cx) + (fy - cy) * (fy - cy) < r * r) { out[0] *= 0.8; out[1] *= 0.68; out[2] *= 0.6; } }
      }
      // brows
      if (z > 0.2 && ax > 0.05 && ax < 0.26 && y < -0.05 && y > -0.2) {
        const u = (ax - 0.158) / 0.088; if (Math.abs(u) < 1) {
          const yb = -0.112 - 0.02 * (1 - u * u) - browR * 0.018 * (1 - u) * 0.5 - smile * 0.008 + 0.012 * u + (grain ? asym * side * 0.004 : 0);
          const th = 0.016 * C.browK * (1 - 0.45 * (u + 1) / 2) * (u < -0.8 ? (1 + (u + 0.8) * 2.5) : 1);
          if (Math.abs(y - yb) < th) { const hk = grain ? (vnoise(ax * 300, y * 120, sd + 9) > 0.32 ? 1 : 0.45) : 0.92; out[0] = lerp(out[0], browC[0], hk); out[1] = lerp(out[1], browC[1], hk); out[2] = lerp(out[2], browC[2], hk); }
        }
      }
      // nostrils (seen from below)
      if (y > 0.2 && y < 0.25 && ax < 0.06 && nly > 0.35 && z > 0.3) { const nx2 = (ax - 0.032) / 0.017, ny2 = (y - 0.232) / 0.009; if (nx2 * nx2 + ny2 * ny2 < 1) { out[0] *= 0.35; out[1] *= 0.28; out[2] *= 0.28; } }
      // smile lines (nasolabial) when smiling
      if (smile > 0.35 && z > 0.2 && y > 0.2 && y < 0.36 && ax > 0.05 && ax < 0.14) {
        const t = clamp((y - 0.22) / 0.11, 0, 1), cx = 0.072 + 0.035 * t + 0.012 * smile, d = Math.abs(ax - cx);
        if (d < 0.0055 * (1 - 0.6 * t) + 0.001) { const k = (smile - 0.35) * (gloss ? 0.18 : 0.42); out[0] *= 1 - k; out[1] *= 1 - k * 1.1; out[2] *= 1 - k * 1.1; }
      }
      // lips and mouth
      if (z > 0.2 && y > 0.24 && y < 0.43 && ax < 0.12) {
        const wl = 0.068 * C.lipsW * (1 + 0.3 * smile), u = ax / wl;
        if (u < 1.08) {
          const uu = Math.max(0, 1 - u * u);
          const ym = 0.311 - smile * 0.032 * u * u + (grain ? asym * x * 0.03 : 0) + mOpen * 0.002;
          const upT = 0.021 * C.lipsT * Math.pow(uu, 0.5) * (1 - 0.35 * smile * u) - 0.004 * Math.exp(-(ax / 0.012) * (ax / 0.012)), loT = 0.027 * C.lipsT * Math.pow(uu, 0.6) * (1 - 0.25 * mOpen);
          const gap = mOpen * 0.1 * Math.pow(uu, 0.55);
          if (u < 1 && y > ym - 0.003 && y < ym + gap) {
            const tt = (y - ym) / Math.max(gap, 1e-4);
            if (tt < 0.5 && Math.abs(u) < 0.9) { out[0] = 0.92; out[1] = 0.89; out[2] = 0.84; if (!gloss && Math.abs((ax / wl) * 6 % 1 - 0.5) > 0.46) { out[0] *= 0.8; out[1] *= 0.8; out[2] *= 0.8; } }
            else { out[0] = 0.32; out[1] = 0.1; out[2] = 0.1; }
          } else if (u < 1 && ((y < ym && y > ym - upT) || (y > ym + gap && y < ym + gap + loT))) {
            const lo = y > ym; const k = lo ? 1 : 0.84; out[0] = lipsC[0] * k; out[1] = lipsC[1] * k; out[2] = lipsC[2] * k;
          } else if (Math.abs(y - ym) < 0.0045 && u < 1.08 && mOpen < 0.05) { out[0] *= 0.55; out[1] *= 0.45; out[2] *= 0.45; }
        }
      }
    }
    const R = render3D({ sdf, matOf: () => { const cs = comp.s, ce = comp.e, chh = comp.h; return (chh <= cs + 0.002 && chh <= ce + 0.002) ? 2 : (ce < cs ? 1 : 0); },
      albedo, out, M, s, ss: spec.ss, bounds: b, lights: spec.lights, amb: spec.amb, mode, seed: sd, warp: warpAmp, aoPoster: spec.aoPoster, x: spec.x, y: spec.y });
    const proj = (lx, ly, lz) => [spec.x + (M[0][0] * lx + M[0][1] * ly + M[0][2] * lz) * s, spec.y + (M[1][0] * lx + M[1][1] * ly + M[1][2] * lz) * s, (M[2][0] * lx + M[2][1] * ly + M[2][2] * lz)];
    return Object.assign(R, { M, proj,
      anchors: { chin: proj(0, 0.44, 0.2), neck: proj(0, 0.75, -0.1), neckBase: proj(0, 0.2 + (spec.neckLen == null ? 1.1 : spec.neckLen), -0.12), crown: proj(0, -0.58, -0.05), earL: proj(-0.34, 0.07, -0.04), earR: proj(0.34, 0.07, -0.04), nose: proj(0, 0.19, 0.43), mouth: proj(0, 0.31, 0.36), eyeL: proj(-0.152, 0, 0.32), eyeR: proj(0.152, 0, 0.32), jawL: proj(-0.27, 0.3, 0.05), jawR: proj(0.27, 0.3, 0.05) } });
  }
  // ---------------------------------------------------------------- hands: a posable SDF hand (+ forearm), same three renderings
  // local units: wrist (0,0,0) to the middle fingertip ~ 1. x along the hand, y across it (index -y, pinky +y), z out of the back of the hand.
  // pose: {fingers: [[spread, f1, f2, f3] x4 index..pinky], thumb: [theta (out from the palm), phi (down toward the palm), f1, f2], wristBend, fore (forearm length), foreR}
  // orientation: basis {x:[vx,vy,vz], z:[vx,vy,vz]} (where the hand points / where its back faces, in view space) or yaw/pitch/roll. mirror:true = the other hand.
  const FINGERS = [ // MCP, lengths, radii
    { p: [0.45, -0.108, 0.0], l: [0.2, 0.12, 0.1], r: [0.053, 0.048, 0.042] },
    { p: [0.47, -0.036, 0.006], l: [0.225, 0.135, 0.105], r: [0.055, 0.05, 0.043] },
    { p: [0.455, 0.036, 0.0], l: [0.21, 0.125, 0.1], r: [0.052, 0.047, 0.041] },
    { p: [0.42, 0.104, -0.012], l: [0.165, 0.1, 0.085], r: [0.045, 0.041, 0.036] },
  ];
  function basisM(bx, bz) {
    const n = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    const X = n(bx); const d = bz[0] * X[0] + bz[1] * X[1] + bz[2] * X[2]; const Z = n([bz[0] - d * X[0], bz[1] - d * X[1], bz[2] - d * X[2]]);
    const Y = [Z[1] * X[2] - Z[2] * X[1], Z[2] * X[0] - Z[0] * X[2], Z[0] * X[1] - Z[1] * X[0]];
    return [[X[0], Y[0], Z[0]], [X[1], Y[1], Z[1]], [X[2], Y[2], Z[2]]];
  }
  function hand(spec) {
    const mode = spec.mode || 'grain', grain = mode === 'grain', gloss = mode === 'gloss';
    const M = spec.basis ? basisM(spec.basis.x, spec.basis.z) : rotM(spec.yaw || 0, spec.pitch || 0, spec.roll || 0);
    const mir = spec.mirror ? -1 : 1, pose = spec.pose || {};
    const fp = pose.fingers || [[-0.12, 0.3, 0.35, 0.2], [-0.03, 0.3, 0.35, 0.2], [0.06, 0.32, 0.38, 0.2], [0.16, 0.35, 0.4, 0.22]];
    const tp = pose.thumb || [0.75, 0.55, 0.25, 0.2];
    // bones
    const segs = [];   // [ax,ay,az,bx,by,bz,r1,r2,kind]
    FINGERS.forEach((F, i) => {
      const [sp, f1, f2, f3] = fp[i]; let P0 = F.p.slice(); let phi = 0; const ca = Math.cos(sp), sa = Math.sin(sp);
      [f1, f2, f3].forEach((fl, k) => { phi += fl; const dir = [ca * Math.cos(phi), sa * Math.cos(phi), -Math.sin(phi)]; const P1 = [P0[0] + dir[0] * F.l[k], P0[1] + dir[1] * F.l[k], P0[2] + dir[2] * F.l[k]];
        segs.push([P0[0], P0[1], P0[2], P1[0], P1[1], P1[2], F.r[k], k === 2 ? F.r[k] * 0.86 : F.r[k + 1] || F.r[k], k === 2 ? 1 : 0]); P0 = P1; });
    });
    if (pose.thumb !== null) { // thumb: from the base of the palm, out and down toward the palm side
      let P0 = [0.12, -0.115, -0.035]; const [th, ph, f1, f2] = tp; const L = [0.17, 0.13, 0.11], R = [0.066, 0.056, 0.047];
      let d = [Math.cos(th) * Math.cos(ph), -Math.sin(th) * Math.cos(ph), -Math.sin(ph)];
      // flex axis: perpendicular to d and to the palm's normal
      const ax = (() => { const z = [0, 0, 1]; const c = [d[1] * z[2] - d[2] * z[1], d[2] * z[0] - d[0] * z[2], d[0] * z[1] - d[1] * z[0]]; const l = Math.hypot(...c) || 1; return c.map(v => v / l); })();
      const rot = (v, a) => { const c = Math.cos(a), s = Math.sin(a), k = ax, dt = k[0] * v[0] + k[1] * v[1] + k[2] * v[2]; const cr = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]]; return [v[0] * c + cr[0] * s + k[0] * dt * (1 - c), v[1] * c + cr[1] * s + k[1] * dt * (1 - c), v[2] * c + cr[2] * s + k[2] * dt * (1 - c)]; };
      [0, f1, f2].forEach((fl, k) => { d = rot(d, fl); const P1 = [P0[0] + d[0] * L[k], P0[1] + d[1] * L[k], P0[2] + d[2] * L[k]]; segs.push([P0[0], P0[1], P0[2], P1[0], P1[1], P1[2], R[k], k === 2 ? R[k] * 0.85 : R[k + 1], k === 2 ? 1 : 0]); P0 = P1; });
    }
    const wb = pose.wristBend || 0, foreL = pose.fore == null ? 1.2 : pose.fore, foreR = pose.foreR || 0.125;
    // forearm leaves the wrist backward (bent toward the palm by wb), or along pose.fdir given in VIEW space
    let fDir = [-Math.cos(wb), 0, -Math.sin(wb)];
    if (pose.fdir) { const v = pose.fdir, l = Math.hypot(v[0], v[1], v[2]) || 1; fDir = [(M[0][0] * v[0] + M[1][0] * v[1] + M[2][0] * v[2]) / l, (M[0][1] * v[0] + M[1][1] * v[1] + M[2][1] * v[2]) / l * mir, (M[0][2] * v[0] + M[1][2] * v[1] + M[2][2] * v[2]) / l]; }
    let EL = null, UA = null;
    if (pose.upper) { EL = [fDir[0] * foreL, fDir[1] * foreL, fDir[2] * foreL]; const v = pose.upper.dir, l = Math.hypot(v[0], v[1], v[2]) || 1, L2 = pose.upper.len || 1.2;
      const u = [(M[0][0] * v[0] + M[1][0] * v[1] + M[2][0] * v[2]) / l, (M[0][1] * v[0] + M[1][1] * v[1] + M[2][1] * v[2]) / l * mir, (M[0][2] * v[0] + M[1][2] * v[1] + M[2][2] * v[2]) / l];
      UA = [EL[0] + u[0] * L2, EL[1] + u[1] * L2, EL[2] + u[2] * L2]; }
    const comp = { m: 0 };
    const sleeveAt = pose.sleeve == null ? 9 : pose.sleeve;   // distance from the wrist where a sleeve starts
    const onlyThumb = pose.only === 'thumb';
    function sdf(x, y, z) {
      y *= mir;
      if (onlyThumb) { let d = 1e3; for (let i = segs.length - 3; i < segs.length; i++) { const q = segs[i]; d = smin(d, sdCone(x, y, z, q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7]), 0.03); } comp.nail = 1e3; comp.d = d; comp.sl = 1e3; return d; }
      // palm: a flattened body from the wrist to the knuckles, with the thumb's mound underneath
      let d = sdE(x - 0.23, y, z + 0.004, 0.245, 0.165, 0.055);
      d = smin(d, sdE(x - 0.43, y + 0.0, z - 0.0, 0.07, 0.15, 0.046), 0.05);
      d = smin(d, sdE(x - 0.13, y + 0.095, z + 0.04, 0.13, 0.075, 0.052), 0.05);
      // forearm (flattened at the wrist)
      const fz = 1.3;
      d = smin(d, sdCone(x, y, z * fz, 0.02, 0, 0, fDir[0] * foreL, fDir[1] * foreL, fDir[2] * foreL * fz, 0.098, foreR * 1.15), 0.08);
      if (EL) d = smin(d, sdCone(x, y, z, EL[0], EL[1], EL[2], UA[0], UA[1], UA[2], foreR * 1.12, (pose.upper.r || foreR * 1.35)), 0.06);
      let nail = 1e3;
      for (let i = 0; i < segs.length; i++) { const q = segs[i]; const dd = sdCone(x, y, z, q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7]); d = smin(d, dd, 0.03); if (q[8]) nail = Math.min(nail, dd); }
      comp.nail = nail; comp.d = d;
      // sleeve: a looser tube over the forearm beyond sleeveAt
      let sl = 1e3;
      if (sleeveAt < 9) { const a0 = sleeveAt; sl = sdCone(x, y, z * 1.15, fDir[0] * a0, fDir[1] * a0, fDir[2] * a0 * 1.15, fDir[0] * (foreL + 0.4), fDir[1] * (foreL + 0.4), fDir[2] * (foreL + 0.4) * 1.15, foreR + 0.05, foreR + 0.1); }
      if (EL && pose.upper.sleeve) { const k0 = pose.upper.sleeve; const sx = EL[0] + (UA[0] - EL[0]) * k0, sy = EL[1] + (UA[1] - EL[1]) * k0, sz = EL[2] + (UA[2] - EL[2]) * k0;
        sl = Math.min(sl, sdCone(x, y, z, sx, sy, sz, UA[0], UA[1], UA[2], (pose.upper.r || foreR * 1.35) + 0.035, (pose.upper.r || foreR * 1.35) + 0.07) - (vnoise(x * 18, y * 18 + z * 9, sd + 3) - 0.5) * 0.02); }
      comp.sl = sl;
      return Math.min(d, sl);
    }
    const skin = rgb01(spec.skin || '#B47C58'), nailC = rgb01(spec.nail || '#D9A894'), sleeveC = rgb01(spec.sleeveCol || '#46534F');
    const out = [0, 0, 0], sd = spec.seed || 5;
    function albedo(x, y, z, nx, ny, nz, mat) {
      if (mat === 2) { out[0] = sleeveC[0]; out[1] = sleeveC[1]; out[2] = sleeveC[2]; return; }
      out[0] = skin[0]; out[1] = skin[1]; out[2] = skin[2];
      if (mat === 1 && nz > 0.35) { out[0] = nailC[0]; out[1] = nailC[1]; out[2] = nailC[2]; }
      // knuckles warmer, creases at the finger joints
    }
    const R = render3D({ sdf, matOf: () => (comp.sl < comp.d ? 2 : (comp.nail <= comp.d + 0.004 ? 1 : 0)), albedo, out, M, s: spec.s, ss: spec.ss || 2,
      bounds: spec.bounds || [-1.4, -1.0, 1.0, 1.0], lights: spec.lights, amb: spec.amb, mode, seed: sd, warp: grain ? (spec.warp == null ? 1.0 : spec.warp) : 0, aoPoster: spec.aoPoster, x: spec.x, y: spec.y, eps: 0.0012, extent: 2.5 });
    const proj = (lx, ly, lz) => { ly *= mir; return [spec.x + (M[0][0] * lx + M[0][1] * ly + M[0][2] * lz) * spec.s, spec.y + (M[1][0] * lx + M[1][1] * ly + M[1][2] * lz) * spec.s]; };
    return Object.assign(R, { M, proj, tips: segs.filter(q => q[8]).map(q => proj(q[3], q[4], q[5])), elbow: EL ? proj(EL[0], EL[1] * mir, EL[2]) : null, shoulder: UA ? proj(UA[0], UA[1] * mir, UA[2]) : null });
  }
  function drawHead(g, hd, o) {
    o = o || {}; if (o.shadow !== false) dropShadow(g, hd.canvas, hd.x, hd.y, Object.assign({ dx: 3, dy: 4, blur: 4, alpha: 0.4 }, o.shadow || {}));
    g.drawImage(hd.canvas, hd.x, hd.y);
    // the same paper as everything else, laid into the sculpted piece
    if (o.tex !== 0) { const t = layer(hd.canvas.width, hd.canvas.height); t.fillStyle = texPattern(t, o.kind || 'paper', o.texSeed || 5, o.texScale); t.fillRect(0, 0, hd.canvas.width, hd.canvas.height);
      t.globalCompositeOperation = 'destination-in'; t.drawImage(hd.canvas, 0, 0); g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = o.tex == null ? 0.5 : o.tex; g.drawImage(t.canvas, hd.x, hd.y); g.restore(); }
  }

  // ---------------------------------------------------------------- the two kinds of image
  // The couple in the pose of the strip's last frame: her head tipped against his. The generated waterfall copies it exactly.
  // Head units U = px per head height; group origin = his head. All offsets in U.
  const COUPLE_LAST = {
    him: { dx: 0, dy: 0, yaw: 0.2, pitch: 0.03, roll: 0.07, smile: 0.85, open: 0.3, eyes: 0.5, gaze: [0.05, 0] },
    her: { dx: 0.8, dy: 0.13, yaw: -0.26, pitch: 0.06, roll: -0.34, smile: 0.95, open: 0.2, eyes: 0.3, gaze: [-0.1, 0] },
  };
  // draw the two of them (bodies, then heads) into g. mode: 'flash' (the booth) or 'gloss' (the phone). pose = {him, her} (COUPLE_LAST by default)
  function couple(g, ox, oy, U, mode, o) {
    o = o || {}; const pose = o.pose || COUPLE_LAST, gloss = mode === 'gloss';
    const himC = o.himCloth || (gloss ? '#23324A' : '#2A2C34'), herC = o.herCloth || (gloss ? '#F4EDE4' : '#D9D2C4');
    const lights = o.lights || (gloss ? [{ dir: [-0.32, -0.3, 0.9], local: true, col: '#FFF1E6', k: 0.8, wrap: 0.35 }] : [{ dir: [0.03, -0.06, 1], col: '#FFF6EC', k: 1.22, poster: [0.22, 0.62], levels: [0.55, 1], jit: 0.3 }]);
    const amb = o.amb || (gloss ? '#6B605E' : '#2C2A2C');
    const P2 = (who) => { const q = pose[who]; return [ox + q.dx * U, oy + q.dy * U]; };
    // a body hung from a head's neck point: shoulders, a scooped neckline (drawn AFTER the head, so it cuts the neck and the hair falls behind)
    const body = (nk, wS, lean, col, scoop) => {
      const p = new Path2D(); const c = Math.cos(lean), s2 = Math.sin(lean), R = (x, y) => [nk[0] + (x * c - y * s2) * U, nk[1] + (x * s2 + y * c) * U];
      const pts = [[-0.26, 0.0], [-0.55 * wS, 0.1], [-0.98 * wS, 0.26], [-1.2 * wS, 0.7], [-1.26 * wS, 2.2], [1.26 * wS, 2.2], [1.2 * wS, 0.7], [0.98 * wS, 0.26], [0.55 * wS, 0.1], [0.26, 0.0]].map(q => R(q[0], q[1]));
      p.moveTo(pts[0][0], pts[0][1]); spline(pts, false, p); const m1 = R(0.18, scoop * 0.7), m2 = R(0, scoop), m3 = R(-0.18, scoop * 0.7);
      p.bezierCurveTo(m1[0], m1[1], m1[0], m2[1], m2[0], m2[1]); p.bezierCurveTo(m3[0], m2[1], m3[0], m3[1], pts[0][0], pts[0][1]); p.closePath();
      if (gloss) { const a = R(-1, 0.1), b = R(1, 1.6); const gr = g.createLinearGradient(a[0], a[1], b[0], b[1]); gr.addColorStop(0, mix(col, '#FFFFFF', 0.22)); gr.addColorStop(1, mix(col, '#000000', 0.22)); g.fillStyle = gr; }
      else g.fillStyle = col;
      g.fill(p); return { p, R };
    };
    const ph = P2('him'), pr = P2('her');
    // the booth flash throws their shadow onto the curtain behind them (hard, down-right)
    if (!gloss && o.shadowDst) { const sg = o.shadowDst; sg.save(); sg.translate(U * 0.16, U * 0.12); sg.fillStyle = 'rgba(0,0,0,0.38)'; sg.filter = `blur(${Math.max(1, U * 0.03)}px)`;
      [ph, pr].forEach(q => { sg.beginPath(); sg.ellipse(q[0], q[1] - U * 0.06, U * 0.44, U * 0.6, 0, 0, 7); sg.fill(); sg.fillRect(q[0] - U * 1.1, q[1] + U * 0.6, U * 2.2, U * 3); }); sg.restore(); }
    const heads = {};
    const mk = who => { const q = pose[who], at = P2(who);
      const spec = Object.assign({ who, hair: who === 'her' ? 'long' : 'short', x: at[0], y: at[1], s: U, mode, lights, amb, ss: o.ss || 2, seed: who === 'her' ? 31 : 32, brow: 0.4,
        neckLen: 0.62, bounds: who === 'her' ? [-0.8, -0.72, 0.8, 1.5] : [-0.62, -0.72, 0.62, 1.0], hairLen: 1.3, stubble: gloss ? 0.06 : 0.1, warp: mode === 'flash' ? 0.4 : 0 }, q, o[who] || {});
      return (heads[who] = head(spec)); };
    // her head, her body; his head, his body (he is the nearer of the two)
    const hh = mk('her'); g.drawImage(hh.canvas, hh.x, hh.y);
    const herB = body(hh.proj(0, 0.6, -0.06), 0.84, -0.1, herC, 0.13);
    // a long lock over her far shoulder: the hair is past her shoulders (drawn over the sweater)
    { const t0 = hh.proj(0.3, 0.12, 0.02), dx2 = 0.05 * U; const lk = new Path2D(); lk.moveTo(t0[0] - 0.04 * U, t0[1]);
      lk.bezierCurveTo(t0[0] + 0.14 * U, t0[1] + 0.35 * U, t0[0] + 0.05 * U, t0[1] + 0.7 * U, t0[0] + 0.2 * U + dx2, t0[1] + 1.22 * U);
      lk.bezierCurveTo(t0[0] + 0.3 * U, t0[1] + 1.12 * U, t0[0] + 0.33 * U, t0[1] + 0.8 * U, t0[0] + 0.3 * U, t0[1] + 0.55 * U);
      lk.bezierCurveTo(t0[0] + 0.28 * U, t0[1] + 0.3 * U, t0[0] + 0.2 * U, t0[1] + 0.1 * U, t0[0] + 0.12 * U, t0[1] - 0.04 * U); lk.closePath();
      const hc = CAST.her.hair, hi = CAST.her.hairHi;
      if (gloss) { const gr = g.createLinearGradient(t0[0], t0[1], t0[0] + 0.3 * U, t0[1] + 1.2 * U); gr.addColorStop(0, mix(hc, hi, 0.5)); gr.addColorStop(0.5, hc); gr.addColorStop(1, mix(hc, '#000000', 0.2)); g.fillStyle = gr; }
      else g.fillStyle = mix(hc, '#FFF6EC', 0.12);
      g.fill(lk); }
    if (!gloss && o.details !== false) { g.save(); g.clip(herB.p); g.strokeStyle = 'rgba(40,60,90,0.55)'; g.lineWidth = U * 0.06; for (let k = 0; k < 9; k++) { const a = herB.R(-1.6, 0.3 + k * 0.2), b2 = herB.R(1.6, 0.3 + k * 0.2); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b2[0], b2[1]); g.stroke(); } g.restore(); }
    const mh = mk('him'); g.drawImage(mh.canvas, mh.x, mh.y);
    const himB = body(mh.proj(0, 0.58, -0.06), 1.0, 0.04, himC, 0.2);
    { g.save(); g.clip(himB.p); const a = himB.R(-0.17, -0.1), b2 = himB.R(0.19, -0.1), c2 = himB.R(0.3, 2.3), d2 = himB.R(-0.28, 2.3);
      g.fillStyle = gloss ? '#F6F1EA' : '#CFC8BA'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b2[0], b2[1]); g.lineTo(c2[0], c2[1]); g.lineTo(d2[0], d2[1]); g.closePath(); g.fill();
      const tn = himB.R(0, 0.14); g.fillStyle = mix(gloss ? '#F6F1EA' : '#CFC8BA', '#000000', 0.12); g.beginPath(); g.ellipse(tn[0], tn[1], 0.15 * U, 0.05 * U, 0.04, 0, Math.PI); g.fill(); g.restore(); }
    return [heads.her, heads.him];
  }

  // the photo-booth strip: four frames, cheap flash, grain, a crooked crop. Returns a canvas (w x h), portrait.
  function photoStrip(o) {
    o = o || {}; const w = o.w || 300, h = o.h || 1040, c = makeCanvas(w, h), g = c.getContext('2d'), r = rng('strip' + (o.seed || 1));
    g.fillStyle = P.photoPaper; g.fillRect(0, 0, w, h);
    const m = w * 0.075, fw = w - 2 * m, fh = fw * 1.06, gap = (h - 2 * m - 4 * fh) / 3;
    const poses = [
      { him: { dx: 0, dy: 0, yaw: 0.08, roll: 0.03, smile: 0.55, eyes: 0.8 }, her: { dx: 0.86, dy: 0.08, yaw: -0.1, roll: 0.06, smile: 0.6, eyes: 0.75 } },
      { him: { dx: 0, dy: 0.02, yaw: -0.1, roll: -0.12, smile: 0.9, open: 0.55, eyes: 0.25 }, her: { dx: 0.9, dy: 0.02, yaw: -0.55, roll: 0.02, smile: 0.7, eyes: 0.6, gaze: [-0.5, 0] } },
      { him: { dx: -0.05, dy: 0.05, yaw: 0.35, roll: 0.1, smile: 0.7, open: 0.2, eyes: 0.55, gaze: [0.4, 0] }, her: { dx: 0.88, dy: 0.0, yaw: -0.3, roll: 0.12, smile: 1.0, open: 0.55, eyes: 0.05 } },
      COUPLE_LAST,
    ];
    for (let k = 0; k < 4; k++) {
      const fx = m + (r() - 0.5) * w * 0.012, fy = m + k * (fh + gap) + (r() - 0.5) * 3, rot = (r() - 0.5) * 0.02;
      const SC = o.scale || 1.25, F = makeCanvas(Math.ceil(fw * SC), Math.ceil(fh * SC)), fg = F.getContext('2d'); const FW = F.width, FH = F.height;
      // the booth curtain behind them, lit by the flash (falls off to the corners)
      fg.fillStyle = '#6E7C78'; fg.fillRect(0, 0, FW, FH);
      for (let i = 0; i < 9; i++) { fg.fillStyle = i % 2 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.06)'; fg.fillRect(i * FW / 9 + FW / 18 * (r() - 0.5), 0, FW / 14, FH); }
      const sh = layer(FW, FH);
      const U = FW * 0.28, ox = FW * 0.32 + (k === 1 ? -FW * 0.03 : 0), oy = FH * 0.42 + (k === 2 ? FH * 0.03 : 0);
      couple(fg, ox, oy, U, 'flash', { pose: poses[k], shadowDst: sh, ss: o.ss || 1.5 });
      // shadow behind them goes UNDER the people: redraw people over shadow by compositing the shadow destination-over
      fg.save(); fg.globalCompositeOperation = 'destination-over'; fg.drawImage(sh.canvas, 0, 0); fg.restore();
      // flash falloff and a cheap lens
      const vg = fg.createRadialGradient(FW * 0.45, FH * 0.42, FW * 0.15, FW * 0.5, FH * 0.5, FW * 0.85); vg.addColorStop(0, 'rgba(255,248,236,0.16)'); vg.addColorStop(1, 'rgba(10,8,12,0.55)');
      fg.fillStyle = vg; fg.fillRect(0, 0, FW, FH);
      // colour cast (a magenta-cyan drift, different per frame) and crushed blacks
      fg.save(); fg.globalCompositeOperation = 'soft-light'; fg.fillStyle = k % 2 ? 'rgba(200,120,170,0.35)' : 'rgba(110,170,180,0.3)'; fg.fillRect(0, 0, FW, FH); fg.restore();
      // noise
      const id = fg.getImageData(0, 0, FW, FH), dd = id.data; const rn = rng('noise' + k + (o.seed || 1));
      for (let i = 0; i < dd.length; i += 4) { const n = (rn() + rn() - 1) * 40, nc = (rn() - 0.5) * 14; dd[i] = clamp(dd[i] + n + nc, 0, 255); dd[i + 1] = clamp(dd[i + 1] + n, 0, 255); dd[i + 2] = clamp(dd[i + 2] + n - nc, 0, 255); }
      fg.putImageData(id, 0, 0);
      g.save(); g.translate(fx + fw / 2, fy + fh / 2); g.rotate(rot); g.filter = 'blur(0.5px)'; g.drawImage(F, -fw / 2, -fh / 2, fw, fh); g.restore();
    }
    // the paper: a soft yellowing, a crease, specks, one bent corner
    g.save(); g.globalCompositeOperation = 'multiply'; const yg = g.createLinearGradient(0, 0, w, h); yg.addColorStop(0, 'rgba(255,240,210,0.5)'); yg.addColorStop(1, 'rgba(230,215,190,0.6)'); g.fillStyle = yg; g.fillRect(0, 0, w, h); g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, h * 0.61); g.lineTo(w, h * 0.6); g.stroke();
    for (let i = 0; i < 60; i++) { g.fillStyle = r() < 0.6 ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    return c;
  }

  // the generated waterfall: perfectly symmetric, clean gradients, water whiter than anything in the film, the couple from the strip's
  // last frame, lit from the front by a light fixed to their faces (the scene's own sun is behind them, top right). No grain, no dust.
  function waterfall(o) {
    o = o || {}; const w = o.w || 720, h = o.h || 960, c = makeCanvas(w, h), g = c.getContext('2d');
    const bg = layer(w, h);
    // sky
    const sk = bg.createLinearGradient(0, 0, 0, h * 0.45); sk.addColorStop(0, '#9FE6F2'); sk.addColorStop(1, '#F2FDFF'); bg.fillStyle = sk; bg.fillRect(0, 0, w, h);
    // one half of the gorge, then mirrored: perfect symmetry
    const half = layer(w, h), hg = half;
    const cliff = new Path2D(); cliff.moveTo(-10, 0); cliff.lineTo(w * 0.36, 0); cliff.bezierCurveTo(w * 0.38, h * 0.15, w * 0.33, h * 0.3, w * 0.4, h * 0.46); cliff.lineTo(w * 0.42, h * 0.62); cliff.lineTo(-10, h * 0.7); cliff.closePath();
    const cg2 = hg.createLinearGradient(0, 0, w * 0.42, h * 0.3); cg2.addColorStop(0, '#0B4B55'); cg2.addColorStop(0.6, '#13808A'); cg2.addColorStop(1, '#3BC2C0'); hg.fillStyle = cg2; hg.fill(cliff);
    // foliage: tall soft masses hanging down the cliff, lit from above (the sun behind the fall)
    [[0.04, 0.05, 0.13, 0.2], [0.18, 0.12, 0.09, 0.16], [0.08, 0.3, 0.15, 0.22], [0.27, 0.34, 0.07, 0.14], [0.0, 0.5, 0.17, 0.2], [0.22, 0.52, 0.1, 0.16], [0.33, 0.18, 0.05, 0.12]].forEach(([x, y, rx, ry]) => {
      const gr = hg.createLinearGradient(0, h * (y - ry), 0, h * (y + ry)); gr.addColorStop(0, '#9BEFB0'); gr.addColorStop(0.35, '#3CC08A'); gr.addColorStop(1, '#0B5E55');
      hg.fillStyle = gr; hg.beginPath(); hg.ellipse(w * x, h * y, w * rx, h * ry, 0, 0, 7); hg.fill(); });
    bg.drawImage(half.canvas, 0, 0); bg.save(); bg.translate(w, 0); bg.scale(-1, 1); bg.drawImage(half.canvas, 0, 0); bg.restore();
    // the fall: a column of pure white, widening, with clean streaks
    const fall = new Path2D(); fall.moveTo(w * 0.4, 0); fall.lineTo(w * 0.6, 0); fall.bezierCurveTo(w * 0.62, h * 0.25, w * 0.64, h * 0.4, w * 0.7, h * 0.62); fall.lineTo(w * 0.3, h * 0.62); fall.bezierCurveTo(w * 0.36, h * 0.4, w * 0.38, h * 0.25, w * 0.4, 0); fall.closePath();
    const fg2 = bg.createLinearGradient(w * 0.34, 0, w * 0.66, 0); fg2.addColorStop(0, '#E6FBFF'); fg2.addColorStop(0.5, '#FFFFFF'); fg2.addColorStop(1, '#E6FBFF'); bg.fillStyle = fg2; bg.fill(fall);
    bg.save(); bg.clip(fall); for (let i = 0; i < 9; i++) { const x = w * (0.36 + i * 0.035); const sg = bg.createLinearGradient(x, 0, x + w * 0.012, 0); sg.addColorStop(0, 'rgba(160,226,238,0)'); sg.addColorStop(0.5, 'rgba(160,226,238,0.45)'); sg.addColorStop(1, 'rgba(160,226,238,0)'); bg.fillStyle = sg; bg.fillRect(x, 0, w * 0.012, h); } bg.restore();
    // pool and mist
    const pool = bg.createLinearGradient(0, h * 0.6, 0, h); pool.addColorStop(0, '#9AF0EC'); pool.addColorStop(1, '#13A2A6'); bg.fillStyle = pool; bg.fillRect(0, h * 0.62, w, h * 0.4);
    [[0.5, 0.62, 0.42, 0.95], [0.3, 0.66, 0.25, 0.6], [0.7, 0.66, 0.25, 0.6], [0.5, 0.5, 0.3, 0.5]].forEach(([x, y, r, a]) => { const mg = bg.createRadialGradient(w * x, h * y, 0, w * x, h * y, w * r); mg.addColorStop(0, `rgba(255,255,255,${a})`); mg.addColorStop(1, 'rgba(255,255,255,0)'); bg.fillStyle = mg; bg.fillRect(0, 0, w, h); });
    // portrait-mode softness on the background
    g.filter = `blur(${Math.max(2, w / 110)}px)`; g.drawImage(bg.canvas, 0, 0); g.filter = 'none';
    // the two of them, centred, crisp
    const U = o.U || w * 0.235; couple(g, w * 0.36, h * 0.66, U, 'gloss', { ss: o.ss || 2 });
    // a clean, even bloom from the water over everything (no vignette: nothing is ever dark at the edges)
    const bl = g.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.35, w * 0.8); bl.addColorStop(0, 'rgba(255,255,255,0.12)'); bl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = bl; g.fillRect(0, 0, w, h);
    return c;
  }

  // ---------------------------------------------------------------- subtitles (in the picture)
  function subtitle(g, speaker, lines, o) {
    o = Object.assign({ x: W / 2, y: H - 70, size: 44, lead: 1.3, color: '#F3ECDD', label: '#F3ECDD', halo: 'rgba(8,8,10,0.62)', haloBlur: 16, family: 'Libre Franklin', weight: 500 }, o || {});
    if (typeof lines === 'string') lines = [lines];
    g.save(); g.textBaseline = 'alphabetic'; g.letterSpacing = '0px';
    const font = (wt) => `${wt} ${o.size}px "${o.family}"`;
    const n = lines.length;
    lines.forEach((t, i) => {
      const y = o.y - (n - 1 - i) * o.size * o.lead; const lab = (i === 0 && speaker) ? speaker + ': ' : '';
      g.font = font(o.weight + 200); const lw = lab ? g.measureText(lab).width : 0; g.font = font(o.weight); const tw = g.measureText(t).width;
      const x0 = o.x - (lw + tw) / 2;
      // halo
      g.save(); g.filter = `blur(${o.haloBlur}px)`; g.fillStyle = o.halo; g.font = font(o.weight + 200); if (lab) g.fillText(lab, x0, y); g.font = font(o.weight); g.fillText(t, x0 + lw, y); g.fillText(t, x0 + lw, y); g.restore();
      if (lab) { g.font = font(o.weight + 200); g.fillStyle = o.label; g.fillText(lab, x0, y); }
      g.font = font(o.weight); g.fillStyle = o.color; g.fillText(t, x0 + lw, y);
    });
    g.restore();
  }

  G.GG = { P, CAST, toHex, rgb01, layer, hash2, pnoise, pfbm, paperTile, texPattern, texture, piece, crescent, bands, glow, dropShadow, specks, rrect, spline, blob, warp, rotM, basisM, render3D, head, hand, drawHead, COUPLE_LAST, couple, photoStrip, waterfall, subtitle };
})(window);
