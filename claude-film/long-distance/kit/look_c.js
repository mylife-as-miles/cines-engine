/* LONG DISTANCE — LOOK C: "HALF EMPTY"
   Helpers for Look C only (never edit kit/otm.js or kit/figures.js: three looks share them).
   The grammar: a 2.00:1 frame, two squares side by side. One half holds him; the other is empty, and the phone sits in it,
   where a person would be. Flat colour fields in muted warm greys; the ONLY cold colour in the film is the screen's light.
   - P: the palette
   - camera(): a pinhole camera with a shifted lens (verticals stay vertical: architectural, centred, still)
   - flat light: posterised elliptical bands clipped to a surface (bands), the crescent of light on a form (crescent)
   - the two kinds of image: boothStrip() (a real photograph: cheap flash, grain, crooked crop) and
     waterfall() (generated: the same faces and pose, lit too evenly, the water too white)
   - phone(): a phone in 3D (any yaw/pitch), its screen mapped with a true perspective slice
   - caption(): subtitles in the picture with the speaker's name, as film subtitles do
   Deterministic: no Math.random, no Date. */
(function (G) {
  'use strict';
  const { W, H } = OTM;
  const P = {
    // warm greys, dark to light
    ink: '#141210', soot: '#1C1916', char: '#25211E', umber: '#302B27', smoke: '#3D3833', taupeD: '#4E4842', taupe: '#686057',
    stone: '#857B70', putty: '#A39789', oat: '#BDB1A2', plaster: '#D3C9BB', bone: '#E7E0D4', paper: '#F3EEE5',
    // the one cold accent: the screen and its light (nothing else in the film is cold)
    ice: '#E9F8FC', frost: '#BFE7F3', cyan: '#86CBE2', cold: '#4E97B4', coldD: '#2C5F76', coldInk: '#16313D',
    // skin
    hSkin: '#BC9174', hSkinL: '#D2AA8C', hSkinS: '#8E6650', hSkinD: '#5E4336', hHair: '#2B211C', hStub: '#8A6B58',
    sSkin: '#CDA387', sSkinL: '#E1BEA2', sSkinS: '#A07560', sSkinD: '#6E4C3E', sHair: '#271C17', sLip: '#A8645A', hLip: '#9A6455',
    // wardrobe and props
    shirt: '#C9BFAE', shirtS: '#A1978A', shirtD: '#7C7368',
    coat: '#8A5C47', coatL: '#A8735A', coatS: '#653F31', coatD: '#47291F',
    bagLeather: '#3A2C25', floralBase: '#D9CDB8', floralRose: '#B5837A', floralSage: '#8D957C', floralOchre: '#C2A36E',
    matte: '#090807',
  };
  const clamp = OTM.clamp, lerp = OTM.lerp, mix = OTM.mix, rgba = OTM.rgba, hexToRgb = OTM.hexToRgb;

  // ---------- canvases ----------
  function layer(w, h) { return OTM.makeCanvas(w || W, h || H).getContext('2d'); }
  function blurred(src, px, base) {
    const c = OTM.makeCanvas(src.width, src.height), g = c.getContext('2d');
    if (base !== false) g.drawImage(src, 0, 0);
    g.filter = `blur(${px}px)`; g.drawImage(src, 0, 0); g.filter = 'none'; return c;
  }

  // ---------- gradients & paths ----------
  function stops(gr, st) { st.forEach(s => gr.addColorStop(clamp(s[0], 0, 1), s.length > 2 ? rgba(s[1], s[2]) : s[1])); return gr; }
  const lin = (g, x0, y0, x1, y1, st) => stops(g.createLinearGradient(x0, y0, x1, y1), st);
  const rad = (g, x, y, r0, r1, st, fx, fy) => stops(g.createRadialGradient(fx == null ? x : fx, fy == null ? y : fy, r0, x, y, r1), st);
  function pathPts(pts, open) { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); if (!open) p.closePath(); return p; }
  function rrect(x, y, w, h, r) {
    const p = new Path2D(); r = Math.min(r, w / 2, h / 2);
    p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r); p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r); p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); p.closePath(); return p;
  }
  function rquad(q, k) {
    const p = new Path2D(); const n = q.length; const pt = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    for (let i = 0; i < n; i++) {
      const a = q[(i - 1 + n) % n], b = q[i], c = q[(i + 1) % n];
      const la = Math.hypot(b[0] - a[0], b[1] - a[1]), lc = Math.hypot(c[0] - b[0], c[1] - b[1]); const r = Math.min(k, la * 0.49, lc * 0.49);
      const p0 = pt(b, a, r / la), p1 = pt(b, c, r / lc);
      if (i === 0) p.moveTo(p0[0], p0[1]); else p.lineTo(p0[0], p0[1]); p.quadraticCurveTo(b[0], b[1], p1[0], p1[1]);
    }
    p.closePath(); return p;
  }
  // smooth closed (or open) curve through points (Catmull-Rom -> bezier); [x,y,1] is a hard corner
  function smooth(pts, open) {
    const p = new Path2D(), n = pts.length; const Q = i => open ? pts[clamp(i, 0, n - 1)] : pts[(i + n) % n];
    p.moveTo(pts[0][0], pts[0][1]); const last = open ? n - 1 : n;
    for (let i = 0; i < last; i++) {
      const p0 = Q(i - 1), p1 = Q(i), p2 = Q(i + 1), p3 = Q(i + 2), k = 1 / 6;
      const c1 = p1[2] ? [p1[0], p1[1]] : [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
      const c2 = p2[2] ? [p2[0], p2[1]] : [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
      p.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
    }
    if (!open) p.closePath(); return p;
  }
  // map points through an affine [a,b,c,d,e,f]
  const ap = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
  const mapPts = (m, pts) => pts.map(p => { const q = ap(m, p); return p[2] ? [q[0], q[1], 1] : q; });
  // local frame: origin o, x axis rotated by a, uniform scale s (and optional flip)
  const frameM = (ox, oy, s, a, flip) => { const c = Math.cos(a || 0), si = Math.sin(a || 0), f = flip ? -1 : 1; return [c * s * f, si * s * f, -si * s, c * s, ox, oy]; };
  function fill(g, path, style, alpha) { g.save(); if (alpha != null) g.globalAlpha = alpha; g.fillStyle = style; g.fill(path); g.restore(); }
  function stroke(g, path, style, w, alpha, cap) { g.save(); if (alpha != null) g.globalAlpha = alpha; g.strokeStyle = style; g.lineWidth = w; g.lineCap = cap || 'round'; g.lineJoin = 'round'; g.stroke(path); g.restore(); }
  const line = (pts) => pathPts(pts, true);

  // ---------- camera: pinhole with a shifted lens (pitch 0: verticals stay vertical) ----------
  // camera({x,y,z,f,cx,cy, yaw, pitch (- looks down)}).p(x,y,z) -> [sx, sy, depth]. World: x right, y up, z away from the camera.
  // aim({target:[x,y,z], dist, pitch, f, cx, cy}) places the camera `dist` back from the target along the view (a long lens = near-orthographic plan views)
  function camera(o) {
    if (o.target) { const cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0); o = Object.assign({}, o, { x: o.target[0], y: o.target[1] - o.dist * sp, z: o.target[2] - o.dist * cp }); }
    const cy0 = Math.cos(o.yaw || 0), sy0 = Math.sin(o.yaw || 0), cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0);
    function p(x, y, z) {
      if (Array.isArray(x)) { z = x[2]; y = x[1]; x = x[0]; }
      let dx = x - o.x, dy = y - o.y, dz = z - o.z;
      const x1 = dx * cy0 - dz * sy0, z1 = dx * sy0 + dz * cy0;
      const y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp; const zz = Math.max(z2, 0.02);
      return [o.cx + o.f * x1 / zz, o.cy - o.f * y2 / zz, z2];
    }
    // view direction (unit, world) for back-face tests
    const dir = [sy0 * cp, sp, cy0 * cp];
    return { p, pts: a => a.map(q => p(q)), path: a => pathPts(a.map(q => p(q))), f: o.f, cx: o.cx, cy: o.cy, k: z => o.f / z, o, dir,
      eye: [o.x, o.y, o.z], scaleAt: (x, y, z) => { const a = p(x, y, z), b = p(x + 0.01, y, z); return (b[0] - a[0]) / 0.01; } };
  }

  // ---------- soft surfaces as height fields (duvet, pillows), flat-shaded in posterised steps ----------
  // heightField(g, cam, {x0,x1,z0,z1, step, h(x,z) -> y | null, shade(x,y,z,n) -> css colour, clip})
  // Cells are drawn far to near so nearer folds overlap farther ones.
  function heightField(g, cam, o) {
    const st = o.step || 0.015, nx = Math.ceil((o.x1 - o.x0) / st), nz = Math.ceil((o.z1 - o.z0) / st);
    const dx = (o.x1 - o.x0) / nx, dz = (o.z1 - o.z0) / nz;
    const Y = []; for (let j = 0; j <= nz; j++) { Y.push([]); for (let i = 0; i <= nx; i++) Y[j].push(o.h(o.x0 + i * dx, o.z0 + j * dz)); }
    const S = []; for (let j = 0; j <= nz; j++) { S.push([]); for (let i = 0; i <= nx; i++) S[j].push(Y[j][i] == null ? null : cam.p(o.x0 + i * dx, Y[j][i], o.z0 + j * dz)); }
    g.save(); if (o.clip) g.clip(o.clip); g.lineWidth = 1.1; g.lineJoin = 'round';
    for (let j = nz - 1; j >= 0; j--) for (let i = 0; i < nx; i++) {
      const a = Y[j][i], b = Y[j][i + 1], c = Y[j + 1][i + 1], d = Y[j + 1][i]; if (a == null || b == null || c == null || d == null) continue;
      // normal: (dz-gradient x dx-gradient)
      const gx = ((b - a) + (c - d)) / (2 * dx), gz = ((d - a) + (c - b)) / (2 * dz); const l = Math.hypot(gx, 1, gz); const n = [-gx / l, 1 / l, -gz / l];
      const x = o.x0 + (i + 0.5) * dx, z = o.z0 + (j + 0.5) * dz, y = (a + b + c + d) / 4;
      const col = o.shade(x, y, z, n, i, j); if (!col) continue;
      const A = S[j][i], B = S[j][i + 1], Cc = S[j + 1][i + 1], D = S[j + 1][i];
      g.fillStyle = col; g.strokeStyle = col; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.lineTo(Cc[0], Cc[1]); g.lineTo(D[0], D[1]); g.closePath(); g.fill(); g.stroke();
    }
    g.restore();
    return { Y, S, dx, dz, nx, nz };
  }
  // the same, but posterised per pixel AFTER a blur, so the band edges are clean curves instead of stair-stepped cells.
  // o.value(x,y,z,n) -> [a, c] two channels in 0..1; o.palette(a, c) -> [r,g,b]; o.clip (Path2D, crisp outline); o.blur (px)
  function heightFieldPost(g, cam, o) {
    const L = layer();
    const res = heightField(L, cam, Object.assign({}, o, { clip: null, shade: (x, y, z, n) => { const v = o.value(x, y, z, n); return `rgb(${clamp(v[0], 0, 1) * 255 | 0},${clamp(v[1], 0, 1) * 255 | 0},0)`; } }));
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9; res.S.forEach(r => r.forEach(q => { if (!q) return; bx0 = Math.min(bx0, q[0]); by0 = Math.min(by0, q[1]); bx1 = Math.max(bx1, q[0]); by1 = Math.max(by1, q[1]); }));
    bx0 = Math.max(0, Math.floor(bx0) - 4); by0 = Math.max(0, Math.floor(by0) - 4); bx1 = Math.min(W, Math.ceil(bx1) + 4); by1 = Math.min(H, Math.ceil(by1) + 4);
    const bw = bx1 - bx0, bh = by1 - by0; if (bw <= 0 || bh <= 0) return res;
    const src = o.blur ? blurred(L.canvas, o.blur, false) : L.canvas;
    const id = src.getContext('2d').getImageData(bx0, by0, bw, bh), d = id.data;
    const cache = new Map();
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) { d[i + 3] = 0; continue; }
      const a = d[i] / 255, c = d[i + 1] / 255, key = (d[i] << 8) | d[i + 1];
      let col = cache.get(key); if (!col) { col = o.palette(a, c); cache.set(key, col); }
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
    const out = OTM.makeCanvas(bw, bh); out.getContext('2d').putImageData(id, 0, 0);
    g.save(); if (o.clip) g.clip(o.clip); g.drawImage(out, bx0, by0); g.restore();
    return res;
  }
  // a cold point light (the screen): returns intensity 0..1+ at a surface point with normal n
  function screenLight(L, nL, k, X, n, wrap) {
    const vx = L[0] - X[0], vy = L[1] - X[1], vz = L[2] - X[2], d2 = vx * vx + vy * vy + vz * vz, d = Math.sqrt(d2);
    const ux = vx / d, uy = vy / d, uz = vz / d;
    const lam = Math.max(0, (n[0] * ux + n[1] * uy + n[2] * uz + (wrap || 0)) / (1 + (wrap || 0)));
    const emit = Math.max(0, -(nL[0] * ux + nL[1] * uy + nL[2] * uz));             // the screen only throws light forward
    return k * lam * Math.pow(emit, 0.6) / (d2 + 0.02);
  }
  // posterise a value into steps (returns the step's representative value)
  function poster(v, steps) { let out = 0; for (let i = 0; i < steps.length; i++) if (v >= steps[i]) out = i + 1; return out; }

  // ---------- flat light ----------
  // posterised elliptical bands of light inside a clip path: colors outer -> inner, radii outer -> inner.
  // o = {sy (vertical squash), rot, soft (px blur of the band edges), mode, alpha}
  function bands(g, clip, x, y, radii, colors, o) {
    o = o || {}; const sy = o.sy || 1, rot = o.rot || 0;
    const L = layer(); L.save(); if (o.dx || o.dy) L.translate(0, 0);
    radii.forEach((r, i) => { L.fillStyle = colors[i]; L.beginPath(); L.ellipse(x + (o.drift ? o.drift[0] * i : 0), y + (o.drift ? o.drift[1] * i : 0), r, r * sy, rot, 0, Math.PI * 2); L.fill(); });
    L.restore();
    let src = L.canvas; if (o.soft) src = blurred(src, o.soft, false);
    g.save(); if (clip) g.clip(clip); if (o.alpha != null) g.globalAlpha = o.alpha; if (o.mode) g.globalCompositeOperation = o.mode; g.drawImage(src, 0, 0); g.restore();
  }
  // the lit crescent of a form: the part of `path` that a light from direction (ux,uy) reaches, `w` px deep.
  // Returns a canvas layer with the crescent filled in `color` (drawn onto g unless o.noDraw).
  function crescent(g, path, ux, uy, w, color, o) {
    o = o || {}; const L = layer(); L.fillStyle = color; L.fill(path);
    L.globalCompositeOperation = 'destination-out'; L.translate(-ux * w, -uy * w); L.fill(path); L.setTransform(1, 0, 0, 1, 0, 0);
    if (o.clip) { L.globalCompositeOperation = 'destination-in'; L.fillStyle = '#000'; L.fill(o.clip); }
    let c = L.canvas; if (o.soft) c = blurred(c, o.soft, false);
    if (o.within) { const M = layer(); M.drawImage(c, 0, 0); M.globalCompositeOperation = 'destination-in'; M.fill(path); c = M.canvas; }
    if (!o.noDraw) { g.save(); if (o.alpha != null) g.globalAlpha = o.alpha; if (o.mode) g.globalCompositeOperation = o.mode; g.drawImage(c, 0, 0); g.restore(); }
    return c;
  }
  // a soft contact shadow / occlusion under a shape
  function softShadow(g, path, color, blur, alpha, dx, dy) {
    const L = layer(); L.fillStyle = color; L.translate(dx || 0, dy || 0); L.fill(path);
    g.save(); g.globalAlpha = alpha == null ? 1 : alpha; g.drawImage(blurred(L.canvas, blur, false), 0, 0); g.restore();
  }
  // fine paper/plaster mottling so flat fields are not digital (very low contrast), clipped to a path
  function mottle(g, clip, box, seed, color, a, scale) {
    const s = scale || 0.006; const c = OTM.makeCanvas(Math.ceil(box.w / 4), Math.ceil(box.h / 4)), cg = c.getContext('2d'); const img = cg.createImageData(c.width, c.height);
    const [r0, g0, b0] = hexToRgb(color);
    for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) {
      const n = OTM.fbm((box.x + i * 4) * s, (box.y + j * 4) * s, seed, 4); const q = (j * c.width + i) * 4;
      img.data[q] = r0; img.data[q + 1] = g0; img.data[q + 2] = b0; img.data[q + 3] = clamp((n - 0.35) * 2.2, 0, 1) * 255 * a;
    }
    cg.putImageData(img, 0, 0);
    g.save(); if (clip) g.clip(clip); g.imageSmoothingQuality = 'high'; g.drawImage(c, box.x, box.y, box.w, box.h); g.restore();
  }

  // ---------- images on quads ----------
  // draw an image onto a convex quad [tl,tr,br,bl] with projective-correct slicing along u (columns) — good for a phone turned in yaw
  function quadImage(g, img, q, n, depths) {
    n = n || 48; const iw = img.width, ih = img.height;
    // depths [zl, zr] give perspective-correct column spacing (screen x is not linear in u when the quad recedes)
    const zl = depths ? depths[0] : 1, zr = depths ? depths[1] : 1;
    const U = t => (t / zr) / ((1 - t) / zl + t / zr);
    const Lp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    g.save(); const clip = new Path2D(); clip.moveTo(q[0][0], q[0][1]); q.slice(1).forEach(v => clip.lineTo(v[0], v[1])); clip.closePath(); g.clip(clip);
    for (let i = 0; i < n; i++) {
      const s0 = i / n, s1 = (i + 1) / n, u0 = U(s0), u1 = U(s1);
      const t0 = Lp(q[0], q[1], s0), t1 = Lp(q[0], q[1], s1), b0 = Lp(q[3], q[2], s0);
      const sw = (u1 - u0) * iw; if (sw <= 0) continue;
      // each column is drawn a little wider than it is and overwritten by the next: no seams
      g.save(); const a = (t1[0] - t0[0]) / sw, b = (t1[1] - t0[1]) / sw, c = (b0[0] - t0[0]) / ih, d = (b0[1] - t0[1]) / ih;
      g.transform(a, b, c, d, t0[0], t0[1]);
      const ext = Math.min(iw - u0 * iw, sw + 2.5);
      g.drawImage(img, u0 * iw, 0, ext, ih, 0, 0, ext, ih);
      g.restore();
    }
    g.restore();
  }

  // ---------- the phone ----------
  // phone3d(cam, {c:[x,y,z] centre, w, h, t (thickness), yaw (radians, 0 = screen faces the camera, + turns the screen to the right),
  //   pitch (+ leans the top away)}) -> corners of the front (screen) face and back face, normals, helpers
  function phone3d(cam, o) {
    const w = o.w || 0.075, h = o.h || 0.16, t = o.t || 0.009, cyw = Math.cos(o.yaw || 0), syw = Math.sin(o.yaw || 0), cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0);
    // local: x right, y up, z out of the screen (toward the viewer when yaw = 0 → world -z)
    const toW = (lx, ly, lz) => {
      // pitch about local x: y,z
      const y1 = ly * cp - lz * sp * -1, z1 = lz * cp + ly * sp * -1;
      // screen faces -z in world when yaw=0: world = (x, y, -z) then yaw about y
      const wx = lx, wy = y1, wz = -z1;
      const rx = wx * cyw + wz * syw, rz = -wx * syw + wz * cyw;
      return [o.c[0] + rx, o.c[1] + wy, o.c[2] + rz];
    };
    const F = [[-w / 2, h / 2, t / 2], [w / 2, h / 2, t / 2], [w / 2, -h / 2, t / 2], [-w / 2, -h / 2, t / 2]].map(q => toW(...q));
    const B = [[-w / 2, h / 2, -t / 2], [w / 2, h / 2, -t / 2], [w / 2, -h / 2, -t / 2], [-w / 2, -h / 2, -t / 2]].map(q => toW(...q));
    return { F, B, Fs: F.map(q => cam.p(q)), Bs: B.map(q => cam.p(q)), toW, at: (lx, ly, lz) => cam.p(toW(lx, ly, lz || 0)) };
  }

  // ---------- people in the pictures (the photo-booth strip and the waterfall) ----------
  // a front-facing couple in a unit box (draw with g scaled so 1 unit = box width). pose 1..4, mode 'flash' | 'gen'.
  // Him on the left, her on the right; in pose 4 (and in the generated image) her head is tipped against his.
  function couple(g, o) {
    const mode = o.mode || 'flash', pose = o.pose || 4, flash = mode === 'flash';
    const R = OTM.rng('couple' + pose + mode);
    // skin & hair per mode: the flash blows his and her faces pale and flat with a hard falloff; the generated light is even and kind
    const skinH = flash ? '#EBCDB6' : '#D9AE90', skinS = flash ? '#E0BBA0' : '#D1A486', skinHS = flash ? '#B98A70' : '#C3967A';
    const skinH2 = flash ? '#F2D8C4' : '#D9AE90', hair = flash ? '#1A1210' : '#2A1D17', hairHi = flash ? '#5A463C' : '#7A5A48';
    const clothesH = flash ? '#2B2826' : '#5E6046', clothesS = flash ? '#C98F3E' : '#E6DCCB';
    // pose table: head centres, tilts (radians), mouth (0 closed smile .. 1 open laugh), eyes (0 open .. 1 shut)
    const T = {
      1: { h: [0.355, 0.47, 0.06, 0.25, 0.1], s: [0.655, 0.5, -0.04, 0.3, 0.0] },
      2: { h: [0.36, 0.46, 0.12, 0.85, 0.7], s: [0.66, 0.52, 0.16, 0.7, 0.9] },
      3: { h: [0.37, 0.47, -0.05, 0.65, 0.6], s: [0.6, 0.47, -0.32, 0.4, 0.3] },
      4: { h: [0.385, 0.47, 0.07, 0.38, 0.42], s: [0.585, 0.5, -0.36, 0.3, 0.46] },
    }[pose];
    const hs = 0.3;                       // head height in units
    // shoulders
    const sh = (cx, cy, w, col) => { g.fillStyle = col; g.fill(smooth([[cx - w, 1.08], [cx - w * 0.98, cy + 0.36], [cx - w * 0.72, cy + 0.22], [cx - w * 0.2, cy + 0.17], [cx + w * 0.2, cy + 0.17], [cx + w * 0.72, cy + 0.22], [cx + w * 0.98, cy + 0.36], [cx + w, 1.08]])); };
    // her long hair falls behind her shoulders: draw it first
    const herHairBack = (cx, cy, a) => {
      g.save(); g.translate(cx, cy); g.rotate(a);
      g.fillStyle = hair; g.fill(smooth([[-0.14, -0.13], [-0.16, 0.06], [-0.2, 0.3], [-0.24, 0.52], [-0.12, 0.6], [0.0, 0.52], [0.12, 0.6], [0.24, 0.52], [0.2, 0.3], [0.16, 0.06], [0.14, -0.13]]));
      g.restore();
    };
    const sP = T.s, hP = T.h;
    herHairBack(sP[0], sP[1], sP[2] * 0.6);
    sh(hP[0], hP[1], 0.21, clothesH);
    sh(sP[0] + 0.01, sP[1] + 0.02, 0.18, clothesS);
    if (!flash) { // the generated jacket: a clean collar line
      g.strokeStyle = 'rgba(40,38,26,0.35)'; g.lineWidth = 0.006; g.beginPath(); g.moveTo(hP[0] - 0.06, hP[1] + 0.2); g.lineTo(hP[0], hP[1] + 0.3); g.lineTo(hP[0] + 0.06, hP[1] + 0.2); g.stroke();
    }
    // a head: face, hair, features (adult proportions, quiet features; at the sizes they are seen, the hair and the tilt carry them)
    const head = (cx, cy, a, mouth, eyes, who) => {
      g.save(); g.translate(cx, cy); g.rotate(a);
      const H_ = who === 'h', fw = H_ ? 0.1 : 0.088, fh = H_ ? 0.142 : 0.132;
      const sk = H_ ? skinH : skinH2, skS = H_ ? skinHS : mix(skinS, '#9A6A55', 0.35);
      g.fillStyle = skS; g.fillRect(-fw * 0.42, fh * 0.55, fw * 0.84, fh * 1.0);                       // neck
      if (H_) { g.fillStyle = skS; g.beginPath(); g.ellipse(-fw - 0.006, 0.0, 0.016, 0.03, 0.1, 0, 7); g.ellipse(fw + 0.006, 0.0, 0.016, 0.03, -0.1, 0, 7); g.fill(); }
      const face = H_ ? smooth([[0, -fh], [fw * 0.78, -fh * 0.88], [fw, -fh * 0.3], [fw * 0.96, fh * 0.2], [fw * 0.74, fh * 0.68], [fw * 0.3, fh * 0.98], [0, fh], [-fw * 0.3, fh * 0.98], [-fw * 0.74, fh * 0.68], [-fw * 0.96, fh * 0.2], [-fw, -fh * 0.3], [-fw * 0.78, -fh * 0.88]])
        : smooth([[0, -fh], [fw * 0.8, -fh * 0.86], [fw, -fh * 0.28], [fw * 0.92, fh * 0.24], [fw * 0.58, fh * 0.76], [0, fh], [-fw * 0.58, fh * 0.76], [-fw * 0.92, fh * 0.24], [-fw, -fh * 0.28], [-fw * 0.8, -fh * 0.86]]);
      g.fillStyle = sk; g.fill(face);
      g.save(); g.clip(face);
      if (flash) {      // the booth's flash: hot forehead and nose bridge, the cheeks falling off fast at the edges, a hard little shadow under the jaw
        g.fillStyle = rad(g, 0, -fh * 0.2, fw * 0.3, fw * 1.25, [[0, '#FFF6EE', 0.55], [0.6, '#FFF6EE', 0.1], [1, '#8A5440', 0.35]]); g.fillRect(-0.3, -0.3, 0.6, 0.6);
      } else {          // generated: one soft, kind key; the same on both faces; skin as smooth as a gradient
        g.fillStyle = rad(g, -fw * 0.2, -fh * 0.3, 0, fw * 1.5, [[0, '#F2D0B4', 0.85], [1, '#F2D0B4', 0]]); g.fillRect(-0.3, -0.3, 0.6, 0.6);
      }
      g.restore();
      // hair
      g.fillStyle = hair;
      if (H_) g.fill(smooth([[-fw * 1.06, -fh * 0.02], [-fw * 1.1, -fh * 0.72], [-fw * 0.55, -fh * 1.2], [fw * 0.35, -fh * 1.22], [fw * 1.04, -fh * 0.85], [fw * 1.07, -fh * 0.12], [fw * 0.92, -fh * 0.5], [fw * 0.55, -fh * 0.68], [-fw * 0.05, -fh * 0.78, 1], [-fw * 0.5, -fh * 0.62], [-fw * 0.92, -fh * 0.42]]));
      else {
        g.fill(smooth([[0, -fh * 1.12], [fw * 0.9, -fh * 0.98], [fw * 1.32, -fh * 0.3], [fw * 1.42, fh * 0.8], [fw * 1.58, fh * 2.3], [fw * 0.96, fh * 2.2], [fw * 0.96, fh * 0.7], [fw * 0.86, -fh * 0.3], [fw * 0.4, -fh * 0.78], [0.004, -fh * 0.9, 1],
          [-fw * 0.4, -fh * 0.78], [-fw * 0.86, -fh * 0.3], [-fw * 0.96, fh * 0.7], [-fw * 0.96, fh * 2.2], [-fw * 1.58, fh * 2.3], [-fw * 1.42, fh * 0.8], [-fw * 1.32, -fh * 0.3], [-fw * 0.9, -fh * 0.98]]));
        if (!flash) { g.strokeStyle = rgba(hairHi, 0.5); g.lineWidth = 0.008; g.beginPath(); g.moveTo(-fw * 0.45, -fh * 0.92); g.quadraticCurveTo(-fw * 1.15, -fh * 0.4, -fw * 1.2, fh * 0.9); g.moveTo(fw * 0.45, -fh * 0.92); g.quadraticCurveTo(fw * 1.15, -fh * 0.4, fw * 1.2, fh * 0.9); g.stroke(); }
      }
      // brows, eyes (open: dark almonds; laughing: closed lids curving up), nose, mouth
      const ex = fw * 0.42, ey = -fh * 0.06; g.lineCap = 'round';
      [-1, 1].forEach(sd => {
        g.strokeStyle = rgba(H_ ? '#2E2019' : '#3A2820', flash ? 0.9 : 0.7); g.lineWidth = H_ ? 0.012 : 0.009;
        g.beginPath(); g.moveTo(sd * (ex - 0.026), ey - 0.044); g.quadraticCurveTo(sd * ex, ey - 0.052 - eyes * 0.004, sd * (ex + 0.03), ey - 0.042); g.stroke();
        if (eyes > 0.5) { g.strokeStyle = '#2A1A14'; g.lineWidth = 0.009; g.beginPath(); g.moveTo(sd * ex - 0.022, ey + 0.004); g.quadraticCurveTo(sd * ex, ey - 0.012, sd * ex + 0.022, ey + 0.004); g.stroke(); }
        else { g.fillStyle = '#21150F'; g.beginPath(); g.ellipse(sd * ex, ey, 0.019, 0.0105 * (1 - eyes * 0.7), 0, 0, 7); g.fill();
          if (flash) { g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(sd * ex + 0.005, ey - 0.002, 0.0035, 0, 7); g.fill(); } }
      });
      g.fillStyle = flash ? 'rgba(140,86,66,0.45)' : 'rgba(168,116,90,0.3)'; g.beginPath(); g.ellipse(fw * 0.08, fh * 0.3, 0.014, 0.008, 0, 0, 7); g.ellipse(-fw * 0.12, fh * 0.31, 0.008, 0.005, 0, 0, 7); g.fill();
      const my = fh * 0.58, mw = (H_ ? 0.04 : 0.036) + mouth * 0.01;
      if (mouth > 0.45) { g.fillStyle = '#3A1914'; g.beginPath(); g.moveTo(-mw, my - 0.008); g.quadraticCurveTo(0, my + 0.002, mw, my - 0.008); g.quadraticCurveTo(0, my + 0.045 * mouth + 0.008, -mw, my - 0.008); g.fill();
        g.fillStyle = '#F1EAE0'; g.beginPath(); g.moveTo(-mw * 0.78, my - 0.005); g.quadraticCurveTo(0, my + 0.004, mw * 0.78, my - 0.005); g.quadraticCurveTo(0, my + 0.014, -mw * 0.78, my - 0.005); g.fill(); }
      else { g.strokeStyle = H_ ? '#7A4436' : '#8E4A40'; g.lineWidth = 0.011; g.beginPath(); g.moveTo(-mw * 0.9, my - 0.007); g.quadraticCurveTo(0, my + 0.016 + mouth * 0.016, mw * 0.9, my - 0.007); g.stroke(); }
      if (!H_) { g.fillStyle = flash ? 'rgba(190,70,70,0.18)' : 'rgba(214,120,110,0.18)'; g.beginPath(); g.ellipse(-fw * 0.56, fh * 0.3, 0.026, 0.015, 0, 0, 7); g.ellipse(fw * 0.56, fh * 0.3, 0.026, 0.015, 0, 0, 7); g.fill(); }
      g.restore();
    };
    head(hP[0], hP[1], hP[2], hP[3], hP[4], 'h');
    head(sP[0], sP[1], sP[2], sP[3], sP[4], 's');
    // her hair in front of her shoulder on the far side
    g.save(); g.translate(sP[0], sP[1]); g.rotate(sP[2]); g.fillStyle = hair; g.fill(smooth([[0.12, 0.08], [0.17, 0.3], [0.2, 0.5], [0.13, 0.56], [0.1, 0.32]])); g.restore();
  }

  // the photo-booth strip: four frames, white paper border, cheap flash, grain, a crooked crop. Returns a canvas (w x h px).
  function boothStrip(o) {
    o = o || {}; const w = o.w || 200, fr = w * 0.86, gap = w * 0.06, top = w * 0.07, h = top * 2 + fr * 4 + gap * 3 + w * 0.22;
    const c = OTM.makeCanvas(Math.ceil(w), Math.ceil(h)), g = c.getContext('2d');
    g.fillStyle = '#EFEAE0'; g.fillRect(0, 0, w, h);
    const x0 = (w - fr) / 2;
    for (let i = 0; i < 4; i++) {
      const y0 = top + i * (fr + gap);
      g.save(); g.beginPath(); g.rect(x0, y0, fr, fr); g.clip();
      // the booth curtain behind them: flat grey-brown, darker at the corners where the flash gives out
      g.fillStyle = '#6E655D'; g.fillRect(x0, y0, fr, fr);
      g.fillStyle = rad(g, x0 + fr * 0.5, y0 + fr * 0.45, fr * 0.2, fr * 0.85, [[0, '#9A8F84', 0.8], [1, '#2A2522', 0.9]]); g.fillRect(x0, y0, fr, fr);
      // the curtain's folds
      for (let k = 0; k < 7; k++) { g.fillStyle = rgba('#2A2420', 0.12); g.fillRect(x0 + fr * (k / 7 + 0.03), y0, fr * 0.05, fr); }
      // crooked crop: each frame catches them a little differently (the first cuts his crown off)
      const off = [[-0.06, -0.2], [-0.12, -0.08], [-0.04, -0.1], [-0.1, -0.1]][i], sc = [1.26, 1.2, 1.22, 1.24][i];
      g.translate(x0 + fr * off[0], y0 + fr * off[1]); g.scale(fr * sc, fr * sc);
      // the flash's hard shadow on the curtain, up and to the right of them
      g.save(); g.translate(0.035, -0.02); g.globalAlpha = 0.45; const s0 = OTM.makeCanvas(2, 2); g.filter = 'none';
      const sh = OTM.makeCanvas(Math.ceil(fr), Math.ceil(fr)), sg = sh.getContext('2d'); sg.scale(fr * sc, fr * sc); couple(sg, { mode: 'flash', pose: i + 1 });
      sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#1C1714'; sg.fillRect(0, 0, sh.width, sh.height);
      g.scale(1 / (fr * sc), 1 / (fr * sc)); g.drawImage(sh, 0, 0); g.restore();
      couple(g, { mode: 'flash', pose: i + 1 });
      g.restore();
      // a little motion blur on frame 3 (she moved)
      if (i === 2) { const tmp = OTM.makeCanvas(Math.ceil(fr), Math.ceil(fr)), tg = tmp.getContext('2d'); tg.drawImage(c, x0, y0, fr, fr, 0, 0, fr, fr); g.save(); g.globalAlpha = 0.35; g.drawImage(tmp, x0 + fr * 0.025, y0); g.restore(); }
      // over-exposure, a warm-magenta cast, a soft lens
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(70,30,40,0.18)'; g.fillRect(x0, y0, fr, fr); g.restore();
    }
    // grain over the photographs
    const R = OTM.rng('booth-grain'); const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const n = (R() + R() - 1) * (o.grain || 26); d[i] = clamp(d[i] + n, 0, 255); d[i + 1] = clamp(d[i + 1] + n, 0, 255); d[i + 2] = clamp(d[i + 2] + n, 0, 255); }
    g.putImageData(id, 0, 0);
    // a slight softness: cheap optics
    const soft = blurred(c, Math.max(0.4, w / 260), true); g.clearRect(0, 0, c.width, c.height); g.drawImage(soft, 0, 0);
    // the white border stays clean paper (printed after)
    g.strokeStyle = '#EFEAE0'; g.lineWidth = gap * 0.9;
    for (let i = 0; i < 4; i++) { const y0 = top + i * (fr + gap); g.strokeRect(x0 - gap * 0.45, y0 - gap * 0.45, fr + gap * 0.9, fr + gap * 0.9); }
    g.fillStyle = '#EFEAE0'; g.fillRect(0, top + 4 * (fr + gap) - gap * 0.55, w, h);
    return c;
  }

  // the generated waterfall picture (portrait, phone-shaped). Same faces, same pose as the strip's last frame, but the light falls on
  // both faces the same way, the skin is a shade too smooth, the water a shade too white, everything perfectly centred.
  function waterfall(o) {
    o = o || {}; const w = o.w || 360, h = o.h || 780; const c = OTM.makeCanvas(w, h), g = c.getContext('2d');
    // sky: a clean gradient (no grain anywhere in this picture)
    g.fillStyle = lin(g, 0, 0, 0, h * 0.3, [[0, '#BFDCE2'], [1, '#E9F2F0']]); g.fillRect(0, 0, w, h);
    // cliffs: mossy walls, mirror-symmetrical, every edge soft, a shade too green
    const cliff = (sd) => { const cx = w / 2, X = f => cx + sd * w * f;
      g.fillStyle = lin(g, 0, 0, 0, h, [[0, '#4F6E5A'], [0.6, '#2F4A3C'], [1, '#22362C']]);
      g.fill(smooth([[X(0.7), -10], [X(0.7), h + 10], [X(0.24), h + 10], [X(0.2), h * 0.62], [X(0.185), h * 0.36], [X(0.2), h * 0.14], [X(0.26), -10]]));
      // a canopy along the rim (one soft scalloped mass) and long even streaks of moss down the wall
      { const pts = [[X(0.75), -10], [X(0.75), h * 0.2]]; for (let i = 0; i <= 10; i++) { const t = i / 10, fx = 0.75 - t * 0.5; pts.push([X(fx), h * (0.2 - 0.12 * t) + Math.sin(i * 1.9) * h * 0.012 + (i % 2 ? -h * 0.018 : h * 0.01)]); } pts.push([X(0.24), -10]);
        g.fillStyle = lin(g, 0, 0, 0, h * 0.22, [[0, '#7FAA80'], [1, '#4C7655']]); g.fill(smooth(pts)); }
      for (let k = 0; k < 6; k++) { const fx = 0.26 + k * 0.07; g.strokeStyle = rgba('#6E9A73', 0.35); g.lineWidth = w * 0.02; g.lineCap = 'round'; g.beginPath(); g.moveTo(X(fx), h * (0.16 + 0.03 * (k % 2))); g.lineTo(X(fx + 0.01), h * (0.5 + 0.06 * (k % 3))); g.stroke(); }
      g.fillStyle = rgba('#DDEDE4', 0.18); g.fill(smooth([[X(0.2), h * 0.14], [X(0.24), h * 0.3], [X(0.22), h * 0.6], [X(0.2), h * 0.62], [X(0.185), h * 0.36]])); };
    cliff(-1); cliff(1);
    // the falls: too white, perfectly smooth, perfectly centred
    const fx0 = w * 0.33, fx1 = w * 0.67;
    g.fillStyle = lin(g, 0, 0, 0, h, [[0, '#F4FAFB'], [0.5, '#FFFFFF'], [1, '#FFFFFF']]); g.fill(smooth([[fx0, -10], [fx1, -10], [fx1 + w * 0.015, h * 0.5], [fx1 + w * 0.06, h * 0.72], [fx0 - w * 0.06, h * 0.72], [fx0 - w * 0.015, h * 0.5]]));
    for (let k = 0; k < 11; k++) { const x = fx0 + (fx1 - fx0) * (k + 0.5) / 11; g.strokeStyle = rgba('#D3E6EA', 0.4); g.lineWidth = w * 0.005; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (k - 5) * w * 0.004, h * 0.62); g.stroke(); }
    // the plunge pool and its mist: a flawless soft white bloom
    g.fillStyle = lin(g, 0, h * 0.62, 0, h, [[0, '#B9DAD6', 0], [0.25, '#9CC6C4'], [1, '#5E8E8A']]); g.fillRect(0, h * 0.62, w, h * 0.38);
    g.fillStyle = rad(g, w / 2, h * 0.66, 0, w * 0.75, [[0, '#FFFFFF', 1], [0.45, '#FFFFFF', 0.85], [1, '#FFFFFF', 0]]); g.fillRect(0, 0, w, h);
    // the couple, dead centre, heads against the white water
    g.save(); const s = w * (o.tight ? 1.55 : 1.12); g.translate((w - s) / 2, h * (o.tight ? 0.31 : 0.585)); g.scale(s, s); couple(g, { mode: 'gen', pose: 4 });
    // his hand round her far shoulder: holding each other
    g.fillStyle = '#D6AA8C'; g.beginPath(); g.ellipse(0.73, 0.79, 0.045, 0.026, -0.5, 0, 7); g.fill();
    g.restore();
    // the 'beautiful' grade: an even, soft vignette and a lift in the shadows
    g.fillStyle = rad(g, w / 2, h * 0.6, w * 0.35, h * 0.75, [[0, '#0E1D18', 0], [1, '#0E1D18', 0.22]]); g.fillRect(0, 0, w, h);
    g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(40,60,58,0.12)'; g.fillRect(0, 0, w, h); g.restore();
    return c;
  }

  // the lock screen over a picture: big thin clock, date, a notification banner (o.banner = {from, text}). Draw on a copy of `pic`.
  function lockScreen(pic, o) {
    o = o || {}; const w = pic.width, h = pic.height; const c = OTM.makeCanvas(w, h), g = c.getContext('2d'); g.drawImage(pic, 0, 0);
    const f = (wt, sz, fam) => `${wt} ${sz}px "${fam || 'Libre Franklin'}"`;
    g.fillStyle = 'rgba(255,255,255,0.96)'; g.textAlign = 'center'; g.font = f(300, w * 0.24, 'Archivo'); g.fillText(o.time || '4:40', w / 2, h * 0.2);
    g.font = f(500, w * 0.048); g.fillText(o.date || 'Sunday 14 April', w / 2, h * 0.085);
    if (o.banner) {
      const bx = w * 0.05, by = h * 0.25, bw = w * 0.9, bh = h * 0.085; g.fillStyle = 'rgba(236,241,240,0.82)'; g.fill(rrect(bx, by, bw, bh, w * 0.04));
      g.textAlign = 'left'; g.fillStyle = '#1E2422'; g.font = f(700, w * 0.046); g.fillText(o.banner.from, bx + w * 0.05, by + bh * 0.42);
      g.font = f(500, w * 0.046); g.fillText(o.banner.text, bx + w * 0.05, by + bh * 0.8);
      g.fillStyle = 'rgba(30,36,34,0.5)'; g.font = f(500, w * 0.036); g.textAlign = 'right'; g.fillText('now', bx + bw - w * 0.05, by + bh * 0.42);
    }
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill(rrect(w * 0.34, h * 0.975, w * 0.32, h * 0.008, h * 0.004));
    return c;
  }
  // the message thread's full-screen photo view: a thin header with the sender (a single heart) over the picture
  function photoView(pic, o) {
    o = o || {}; const w = pic.width, h = pic.height; const c = OTM.makeCanvas(w, h), g = c.getContext('2d');
    g.drawImage(pic, 0, 0);
    const py = h * 0.075;
    g.fillStyle = 'rgba(14,17,18,0.55)'; g.fillRect(0, 0, w, py);
    g.fillStyle = '#E9EEEE'; g.textAlign = 'center'; g.font = `500 ${w * 0.07}px "Libre Franklin"`; g.fillText('♥', w / 2, py * 0.74);
    g.strokeStyle = '#E9EEEE'; g.lineWidth = w * 0.012; g.lineCap = 'round'; g.beginPath(); g.moveTo(w * 0.09, py * 0.36); g.lineTo(w * 0.06, py * 0.55); g.lineTo(w * 0.09, py * 0.74); g.stroke();
    return c;
  }

  // ---------- subtitles in the picture ----------
  // caption(g, 'Her', ['line one', 'line two'], {x, y (last baseline), size, color, label colour})
  function caption(g, who, lines, o) {
    o = Object.assign({ x: W / 2, y: H - 120, size: 40, lead: 1.32, family: 'Libre Franklin', weight: 500, color: '#F3EEE5', label: '#BDB1A2',
      halo: 'rgba(12,10,9,0.62)', haloBlur: 12, tracking: 0.2 }, o || {});
    g.save(); g.textBaseline = 'alphabetic'; g.letterSpacing = o.tracking + 'px';
    const F = (wt) => `${wt} ${o.size}px "${o.family}"`;
    const n = lines.length;
    lines.forEach((t, i) => {
      const y = o.y - (n - 1 - i) * o.size * o.lead;
      const lab = i === 0 && who ? who + ': ' : '';
      g.font = F(o.weight); const tw = g.measureText(t).width; g.font = F(o.weight); const lw = lab ? g.measureText(lab).width : 0;
      const x0 = o.x - (tw + lw) / 2;
      if (o.halo) { g.save(); g.filter = `blur(${o.haloBlur}px)`; g.fillStyle = o.halo; g.font = F(o.weight); g.textAlign = 'left'; g.fillText(lab + t, x0, y); g.fillText(lab + t, x0, y); g.restore(); }
      g.textAlign = 'left';
      if (lab) { g.font = F(o.weight); g.fillStyle = o.label; g.fillText(lab, x0, y); }
      g.font = F(o.weight); g.fillStyle = o.color; g.fillText(t, x0 + lw, y);
    });
    g.restore();
  }

  // ---------- finish ----------
  function vignette(ctx, strength, color, cx, cy, r0, r1) {
    cx = cx == null ? W / 2 : cx; cy = cy == null ? H / 2 : cy;
    ctx.save(); ctx.fillStyle = rad(ctx, cx, cy, r0 == null ? H * 0.32 : r0, r1 == null ? W * 0.66 : r1, [[0, color || P.ink, 0], [1, color || P.ink, strength]]);
    ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  // the live area of the 2.00:1 frame (two squares side by side)
  const ASPECT = 2.0, LIVE = OTM.liveArea(2.0);
  function slate(ctx, n, moment) { OTM.slate(ctx, `LONG DISTANCE  ·  LOOK C  ·  HALF EMPTY  ·  0${n}`, moment, ASPECT); }

  G.LC = { P, clamp, lerp, mix, rgba, hexToRgb, layer, blurred, lin, rad, pathPts, rrect, rquad, smooth, ap, mapPts, frameM, fill, stroke, line,
    camera, heightField, heightFieldPost, screenLight, poster, bands, crescent, softShadow, mottle, quadImage, phone3d, couple, boothStrip, waterfall, lockScreen, photoView, caption, vignette, ASPECT, LIVE, slate };
})(window);
