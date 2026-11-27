window.SETS = window.SETS || {};
/* LONG DISTANCE · set: BUS (Q05 The voice message)
   The packed evening bus. Dusk blue in the windows and sodium orange in the streetlights sliding past; the passengers are close
   paper silhouettes against the glass. Inside, a cool strip light, mustard poles, grey rails and hanging straps, moquette seats.
   Each streetlight that passes throws one cut band of sodium light across the people inside (about one every 3.4 s, so never
   more than one luminance change a second). This is the one set where the empty half is not empty: strangers fill both halves
   (C's grammar breaks here: he is not alone, only lonely). The seam is still there: the centre window pillar and the pole on it.
   Laid out in metres (x along the bus, +x toward the front; z across it, the far windows at z = +1.2; floor y = 0).
     interior  across the aisle to the far windows: he stands left of the pole, one hand on the overhead rail, turned three-quarters
               toward the glass (so his face is in it: s.reflect draws his reflection among the others'); strangers close on all sides
     close     from the window side, back at him: his face, the near windows sliding behind him, a stranger's shoulder against his arm
   Deterministic. Static layers cached under 'bus|...'; the outside scrolls with t. API: film/api/bus.md */
(function () {
  'use strict';
  const W = OTM.W, H = OTM.H, S = OTM.S, mix = OTM.mix, clamp = OTM.clamp, lerp = OTM.lerp;
  const M = 48;   // cached layers carry a margin, so a small drift of c.camera never shows an edge

  // =====================================================================================
  // KIT (the same in office.js, stairwell.js and bus.js): a pinhole camera in metres, cut-paper pieces in 3D, cached layers
  // =====================================================================================
  function mkCam(o) {
    const pos = o.pos; let yaw = o.yaw, pitch = o.pitch;
    if (o.at) { const dx = o.at[0] - pos[0], dy = o.at[1] - pos[1], dz = o.at[2] - pos[2]; yaw = Math.atan2(dx, dz); pitch = Math.atan2(dy, Math.hypot(dx, dz)); }
    const f = o.f, cx = o.cx == null ? W / 2 : o.cx, cy = o.cy == null ? H / 2 : o.cy;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const rot = d => { const x1 = d[0] * cyw - d[2] * syw, z1 = d[0] * syw + d[2] * cyw; return [x1, d[1] * cp - z1 * sp, d[1] * sp + z1 * cp]; };
    const view = q => rot([q[0] - pos[0], q[1] - pos[1], q[2] - pos[2]]);
    const sp2 = v => [cx + f * v[0] / v[2], cy - f * v[1] / v[2]];
    const c = { pos, yaw, pitch, f, cx, cy, view, rot, sp: sp2 };
    c.p = q => { const v = view(q); return [cx + f * v[0] / v[2], cy - f * v[1] / v[2], f / v[2]]; };      // screen x, y, px per metre there
    c.pts = pts => clipNear(pts.map(view), 0.04).map(sp2);
    c.shape = pts => { const s = c.pts(pts); return s.length > 2 ? S().poly(s) : null; };
    c.path = pts => { const s = c.pts(pts), p = new Path2D(); s.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); if (s.length) p.closePath(); return p; };
    // a head's yaw and pitch (GG.head / RIG.head convention: yaw 0 faces the camera, + turns to screen right; pitch + looks down)
    // for a world direction the head should face
    c.headAngles = d => { const v = rot(d), gx = v[0], gy = -v[1], gz = -v[2], l = Math.hypot(gx, gy, gz) || 1; const x = gx / l, y = gy / l, z = gz / l;
      const cyv = (z < 0 ? -1 : 1) * Math.hypot(y, z); return { yaw: Math.atan2(x, cyv), pitch: Math.atan2(y / (cyv || 1e-6), z / (cyv || 1e-6)) }; };
    return c;
  }
  function clipNear(vs, zn) {
    const out = [];
    for (let i = 0; i < vs.length; i++) { const a = vs[i], b = vs[(i + 1) % vs.length], ia = a[2] > zn, ib = b[2] > zn; if (ia) out.push(a); if (ia !== ib) { const t = (zn - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, zn]); } }
    return out;
  }
  // an anchor: screen point, px per metre, and the RIG.head scale (a head is about 0.23 m crown to chin)
  function anchor(cam, q, extra) { const p = cam.p(q); if (!(p[2] > 0) || Math.abs(p[0] - W / 2) > 3 * W || Math.abs(p[1] - H / 2) > 3 * H) return Object.assign({ x: null, y: null, scale: 0, s: 0, world: q.slice(), behind: true }, extra || {}); return Object.assign({ x: Math.round(p[0]), y: Math.round(p[1]), scale: +p[2].toFixed(1), s: +(p[2] * 0.23).toFixed(1), world: q.slice() }, extra || {}); }
  // a flat rectangle lying on a horizontal plane (a phone's footprint): centre, size (w across x, d along z), turned by rot
  function footprint(cam, c, w, d, rot) { const cr = Math.cos(rot || 0), sr = Math.sin(rot || 0); return [[-w / 2, d / 2], [w / 2, d / 2], [w / 2, -d / 2], [-w / 2, -d / 2]].map(([a, b]) => { const p = cam.p([c[0] + a * cr + b * sr, c[1], c[2] - a * sr + b * cr]); return [Math.round(p[0]), Math.round(p[1])]; }); }
  const _scr = {};
  function scratchFor(g) { const w = g.canvas.width, h = g.canvas.height, k = w + 'x' + h; let s = _scr[k]; if (!s) s = _scr[k] = OTM.makeCanvas(w, h).getContext('2d'); s.setTransform(1, 0, 0, 1, 0, 0); s.globalCompositeOperation = 'source-over'; s.globalAlpha = 1; s.filter = 'none'; s.clearRect(0, 0, w, h); return s; }
  // the lit paper edge or the core shadow inside a piece (GG.crescent, for canvases of any size)
  function cres(g, path, dx, dy, color, alpha, blur) {
    const t = scratchFor(g); t.setTransform(g.getTransform()); t.fillStyle = color; t.fill(path); t.globalCompositeOperation = 'destination-out'; if (blur) t.filter = `blur(${blur}px)`; t.translate(-dx, -dy); t.fill(path);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha == null ? 1 : alpha; g.drawImage(t.canvas, 0, 0); g.restore();
  }
  // a cut-paper piece from 3D points (GG.piece: rough edge, its own texture, an optional lifted shadow)
  function pc(g, cam, pts, o) { const sh = cam.shape(pts); if (!sh) return null; if (o && o.rough == null) o.rough = 1.0; return GG.piece(g, sh, o); }
  function fl(g, cam, pts, col, rough, seed) { const sh = cam.shape(pts); if (!sh) return null; const p = sh.path(rough == null ? 0.6 : rough, seed || 3); g.fillStyle = col; g.fill(p); return p; }
  function ln(g, cam, a, b, col, w) { const v = clipNear([cam.view(a), cam.view(b)], 0.04); if (v.length < 2) return; const p = v.map(q => [cam.cx + cam.f * q[0] / q[2], cam.cy - cam.f * q[1] / q[2]]); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(p[0][0], p[0][1]); g.lineTo(p[1][0], p[1][1]); g.stroke(); }
  // a fold or seam: a dark cut line with a light one beside it (the style frames' creases)
  function seam(g, cam, a, b, dark, light, w, off) { g.save(); g.lineCap = 'round'; ln(g, cam, a, b, dark, w); g.translate(off ? off[0] : -1.5, off ? off[1] : -1.5); ln(g, cam, a, b, light, Math.max(1, w * 0.5)); g.restore(); }
  // posterised light down a vertical face: bands between heights, cut in 3D so their edges follow the perspective
  // a, b: the face's bottom edge (3D, y = 0 or any base), h: its height; hs: band heights (0..1 of h), cols: one per band
  function vbands(g, cam, clip, a, b, h, hs, cols, rough, seed) {
    g.save(); g.clip(clip);
    cols.forEach((col, i) => { const y0 = hs[i] * h, y1 = (i + 1 < hs.length ? hs[i + 1] : 1.05) * h, e = 0.3;
      const ax = a[0] - (b[0] - a[0]) * e, az = a[2] - (b[2] - a[2]) * e, bx = b[0] + (b[0] - a[0]) * e, bz = b[2] + (b[2] - a[2]) * e;
      fl(g, cam, [[ax, a[1] + y0, az], [bx, b[1] + y0, bz], [bx, b[1] + y1, bz], [ax, a[1] + y1, az]], col, i ? rough : 0, seed + i); });
    g.restore();
  }
  // a soft shadow on a horizontal plane under an object (its footprint, blurred)
  function shadow3(g, cam, pts, blur, alpha, col) { const p = cam.path(pts); g.save(); g.filter = `blur(${blur}px)`; g.globalAlpha = alpha; g.fillStyle = col || '#141716'; g.fill(p); g.restore(); }
  function hull(P) { const a = P.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]); const cr = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]); const lo = [], up = [];
    for (const p of a) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = a.length - 1; i >= 0; i--) { const p = a[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1)); }
  // a cylinder standing on a plane (a mug, a cup, a bin): its silhouette, its open or closed top, lit and shaded edges
  function cylinder(g, cam, cx, y0, cz, r, h, o) {
    const ring = (y, k) => { const P = []; for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2; P.push([cx + Math.cos(t) * r * k, y, cz + Math.sin(t) * r * k]); } return P; };
    if (o.shadow !== false) shadow3(g, cam, ring(y0, 1.3), o.shadowBlur || 4, o.shadowAlpha || 0.5);
    const body = GG.piece(g, S().poly(hull(cam.pts(ring(y0, 1)).concat(cam.pts(ring(y0 + h, 1))))), { fill: o.fill, rough: o.rough || 0.5, tex: 0.4, seed: o.seed || 3 });
    if (body && o.shade) cres(g, body, o.shadeDx || 3, 0, o.shade, 0.75);
    if (body && o.lit) cres(g, body, -(o.shadeDx || 3), 0, o.lit, 0.6);
    if (cam.pos[1] > y0 + h) { GG.piece(g, S().poly(cam.pts(ring(y0 + h, 1))), { fill: o.top || o.fill, rough: 0.3, tex: 0.3, seed: (o.seed || 3) + 1 }); if (o.inside) fl(g, cam, ring(y0 + h, o.wall || 0.84), o.inside, 0.3, (o.seed || 3) + 2); }
    return body;
  }
  // a rod (rail, bar, pole) from a to b with radius r in metres: a ribbon whose width follows the depth, its lit side a thin line
  function rod(g, cam, a, b, r, col, o) {
    o = o || {}; const v = clipNear([cam.view(a), cam.view(b)], 0.05); if (v.length < 2) return null;
    const p0 = cam.sp(v[0]), p1 = cam.sp(v[1]), w0 = r * cam.f / v[0][2], w1 = r * cam.f / v[1][2];
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const P = S().poly([[p0[0] + nx * w0, p0[1] + ny * w0], [p1[0] + nx * w1, p1[1] + ny * w1], [p1[0] - nx * w1, p1[1] - ny * w1], [p0[0] - nx * w0, p0[1] - ny * w0]]);
    if (o.shadow) { const sh = P.translate(o.shadow[0], o.shadow[1]).path(0.4, 5); g.save(); g.filter = `blur(${o.shadowBlur || 3}px)`; g.globalAlpha = o.shadowAlpha || 0.4; g.fillStyle = '#121211'; g.fill(sh); g.restore(); }
    const path = P.path(o.rough == null ? 0.4 : o.rough, o.seed || 5); g.fillStyle = col; g.fill(path);
    if (o.lit) { const s0 = o.litSide || -1, k = 0.35; g.fillStyle = o.lit; g.fill(S().poly([[p0[0] + nx * w0 * s0, p0[1] + ny * w0 * s0], [p1[0] + nx * w1 * s0, p1[1] + ny * w1 * s0], [p1[0] + nx * w1 * s0 * (1 - k * 2), p1[1] + ny * w1 * s0 * (1 - k * 2)], [p0[0] + nx * w0 * s0 * (1 - k * 2), p0[1] + ny * w0 * s0 * (1 - k * 2)]]).path(0.2, (o.seed || 5) + 1)); }
    return path;
  }
  // build a set's cached layers ahead of time (a sequence's setup()): each view drawn once into a scratch frame with its default state
  function prepare(views, names, states) {
    const g = OTM.makeCanvas(W, H).getContext('2d'), em = OTM.makeCanvas(W / 4, H / 4).getContext('2d'); em.scale(0.25, 0.25);
    const c = { g, gl: g, em, cache: FILM.cache, post: {}, shot: {}, after: [], before: [], t: 0, lt: 0, st: 0, reset() { }, camera() { } };
    (names || Object.keys(views)).forEach(n => { const v = views[n]; if (!v) return; const s = Object.assign({}, (states && states[n]) || {}); v.back(c, 0, s); v.front(c, 0, s); });
  }
  function rectPath(x, y, w, h) { const p = new Path2D(); p.rect(x, y, w, h); return p; }
  // a cached full-frame layer with a margin; drawn under whatever camera the sequence set
  function layer(c, key, draw) { const cv = c.cache(key, g => { g.translate(M, M); draw(g); }, W + 2 * M, H + 2 * M); c.g.drawImage(cv, -M, -M); return cv; }
  function emLayer(c, key, draw) { const cv = c.cache(key, g => { g.scale(0.25, 0.25); draw(g); }, W / 4, H / 4); c.em.drawImage(cv, 0, 0, W, H); return cv; }
  // demo overlay: where the anchors are (a ring the size of a head at that depth, the phone's footprint, the split)
  function markers(g, v) {
    const A = v.anchors; g.save(); g.lineWidth = 2; g.font = '500 18px "Libre Franklin"';
    const dot = (a, name, col) => { if (!a || a.x == null || !(a.scale >= 0)) return; g.strokeStyle = col || 'rgba(255,214,120,0.9)'; g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(a.x, a.y, a.scale ? a.scale * 0.115 : 6, 0, 7); g.stroke(); g.fillRect(a.x - 2, a.y - 2, 4, 4); g.fillText(name, a.x + 8, a.y - 8); };
    Object.keys(A).forEach(k => { const a = A[k]; if (a && a.quad) { g.strokeStyle = 'rgba(120,230,255,0.9)'; g.beginPath(); a.quad.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.stroke(); g.fillStyle = g.strokeStyle; g.fillText(k, a.x + 10, a.y + 24); } else if (a && a.x != null) dot(a, k); else if (a && typeof a === 'object') Object.keys(a).forEach(j => { if (a[j] && a[j].x != null) dot(a[j], k + '.' + j, 'rgba(255,150,120,0.9)'); }); });
    g.strokeStyle = 'rgba(236,227,208,0.4)'; g.setLineDash([10, 10]); g.beginPath(); g.moveTo(v.split * W, 0); g.lineTo(v.split * W, H); g.stroke(); g.restore();
  }

  // the office's pieces: the nearer a piece, the more its hand-cut edge shows (as in the style frames, about 1.5-2 px up close)
  const pcK = pc; pc = function (g, cam, pts, o) { if (o && o.rough == null) { const d = cam.view(pts[0])[2]; o.rough = d > 0 ? clamp(5 / d, 0.6, 2.2) : 1; } return pcK(g, cam, pts, o); };

  // =====================================================================================
  // THE BUS
  // =====================================================================================
  const R = {
    zFar: 1.2, zNear: -1.2, sill: 1.02, top: 1.92, transom: 1.72, ceil: 2.28, pillars: [-4.05, -2.7, -1.35, 0, 1.35, 2.7, 4.05], pw: 0.05,
    railY: 1.9, railZ: 0.44, poles: [-1.62, 0, 1.62],
    speed: 6.5, lampGap: 22, lampZ: 3.6, midZ: 8.5, farZ: 34,              // the street outside, metres from the bus's centre line
    him: { head: [-0.3, 1.68, 0.12], handRail: [-0.2, 1.9, 0.44], phone: [-0.4, 1.33, 0.3], hips: [-0.3, 1.0, 0.1] },
  };
  const C = {
    sky: ['#2A3A62', '#34477A', '#40558C', '#53689C', '#6A78A6'], haze: '#8C7C92',
    farB: '#1A2137', farLit: ['#D99A52', '#C9874A', '#93A6CC', '#E3B06A'], midB: '#20273F', midB2: '#262E48', shop: ['#B87A42', '#A06A40', '#C48E52', '#7E8CB0'],
    post: '#12151F', lamp: '#F3AA5C', lampHalo: '#C9844A',
    glass: '#1D2944', ceil: '#1A1F31', ceilLit: '#252B42', cove: '#1E2337', ad: ['#2A2840', '#253243', '#302A38', '#242C3E'],
    strip: '#9EA9BB', wall: '#191D2C', wallLit: '#252A3C', pillar: '#222739', pillarLit: '#3C4562', seal: '#101219',
    seat: '#1F2438', seatLit: '#283049', seatFleck: ['#6E5638', '#3E5872', '#574B6C'], seatFrame: '#14171F',
    pole: '#8C7034', poleLit: '#C29A4C', poleDk: '#5E4B25', rail: '#6A6F7A', railLit: '#A9AEB8', strap: '#1A1C24', handle: '#6A5A30',
    coat: ['#1E2029', '#2A2423', '#1F2829', '#302728', '#26231F', '#1F2232', '#2C2A26'], hair: ['#121015', '#1E1714', '#30261F', '#3E3229', '#18141A'],
    skinDim: ['#5E4B48', '#7A6052', '#866C5C'], rimCool: '#7C90C2', rimTop: '#7E8AA6', sodium: '#E39A52',
  };
  const T = { lampPeriod: R.lampGap / R.speed };   // seconds between streetlights (about 3.4)

  // ---------------------------------------------------------------- the street outside: strips that scroll past the glass
  // A wide road at dusk: a low skyline under a banded sky, far sodium lamps along its foot, a run of lit shopfronts low in the
  // glass, and the near posts sweeping by. Each strip is cut once at its layer's scale (px per metre at its depth) and blitted
  // with an offset each frame; how fast it slides follows its depth. Heights are placed for the picture (the pane's top and sill).
  function skylineStrip(k, h) {
    const w = Math.ceil(160 * k), cv = OTM.makeCanvas(w, Math.ceil(h)), g = cv.getContext('2d'), r = OTM.rng('bus-sky');
    let x = 0; while (x < w) { const bw = (5 + r() * 12) * k, bh = Math.min(h - 4, (0.25 + r() * 0.75) * h), y0 = h - bh;
      g.fillStyle = r() < 0.5 ? C.farB : mix(C.farB, '#2B3452', 0.4); g.fill(S().rect(x, y0, bw + 1, bh + 2).path(0.8, 1 + (x | 0)));
      if (r() < 0.35) { g.fill(S().rect(x + bw * 0.4, y0 - 0.12 * h, bw * 0.12, 0.12 * h).path(0.4, 2 + (x | 0))); }       // a mast, a stack
      for (let yy = y0 + 0.6 * k; yy < h - 0.8 * k; yy += 1.0 * k) for (let xx = x + 0.4 * k; xx < x + bw - 0.5 * k; xx += 0.8 * k) if (r() < 0.12) { g.fillStyle = C.farLit[(r() * 4) | 0]; g.globalAlpha = 0.5 + r() * 0.4; g.fillRect(xx, yy, 0.34 * k, 0.42 * k); g.globalAlpha = 1; }
      x += bw + (r() < 0.25 ? r() * 4 * k : 0); }
    // sodium lamps along the far road at the skyline's foot: a head and two cut rings of haze
    for (let lx = 3 * k; lx < w; lx += (9 + r() * 5) * k) { const ly = h - 0.9 * k;
      [[1.5, 0.16], [0.85, 0.3]].forEach(([rr, a], i) => { g.globalAlpha = a; g.fillStyle = C.lampHalo; g.fill(S().ellipse(lx, ly, rr * k, rr * 0.75 * k, 0).path(1.4, 40 + i + (lx | 0))); });
      g.globalAlpha = 1; g.fillStyle = C.lamp; g.fill(S().ellipse(lx, ly, 0.36 * k, 0.17 * k, 0).path(0.4, 43 + (lx | 0))); }
    return cv;
  }
  function shopStrip(k, h) {
    const w = Math.ceil(90 * k), cv = OTM.makeCanvas(w, Math.ceil(h)), g = cv.getContext('2d'), r = OTM.rng('bus-shop');
    let x = 0; while (x < w) { const bw = (5 + r() * 9) * k;
      g.fillStyle = r() < 0.5 ? C.midB : C.midB2; g.fill(S().rect(x, 0, bw, h).path(0.8, 7 + (x | 0)));
      const lit = r() < 0.72, gx = x + 0.35 * k, gw = bw - 0.7 * k, gy = h * 0.3, gh = h * 0.62;
      if (lit) { g.fillStyle = C.shop[(r() * 4) | 0]; g.globalAlpha = 0.8 + r() * 0.2; g.fill(S().rect(gx, gy, gw, gh).path(0.8, 9 + (x | 0))); g.globalAlpha = 1;
        g.fillStyle = 'rgba(18,20,32,0.6)'; for (let m = gx + (1.2 + r()) * k; m < gx + gw - 0.6 * k; m += (1.4 + r() * 0.8) * k) g.fillRect(m, gy, 0.1 * k, gh);
        g.fillRect(gx, gy + gh * 0.32, gw, 0.08 * k); }
      else { g.fillStyle = '#2C3350'; g.fill(S().rect(gx, gy, gw, gh).path(0.8, 9 + (x | 0))); }
      // the awning or the fascia over it
      g.fillStyle = mix(C.midB, ['#5A3C38', '#3A4A58', '#4C4636', '#2E3240'][(r() * 4) | 0], 0.55); g.fill(S().poly([[x, gy - 0.05 * k], [x + bw, gy - 0.05 * k], [x + bw, gy - 0.55 * k], [x, gy - 0.55 * k]]).path(0.6, 11 + (x | 0)));
      x += bw + (r() < 0.3 ? r() * 3 * k : 0.1 * k); }
    return cv;
  }
  function layerOf(cam, side, D) { const k = cam.f / D; return { k, speed: R.speed * k * (side > 0 ? -1 : 1) }; }   // the far side slides toward screen left

  // ---------------------------------------------------------------- the people: close paper silhouettes
  // Strangers are dark cut paper against the glass: no faces, only a profile's edge, the hair, a collar, a hood; the window
  // behind them cuts a cool rim round each, the strip light a paler one on the crown and shoulders.
  // P: {x, z, eye (height of the eyes, m), face: 'away' | 'toward' | 'left' | 'right' (which way the face points on screen),
  // w (shoulder half-width, m), coat, hair, hat: 'beanie' | 'hood' | 'cap' | 'bun' | null, bag, collar, headphones,
  // arm: [x, y, z] (a hand up on the rail), low (how far the body runs below the eyes, m), rim (the window rim: default on)}
  function person(g, cam, P, o) {
    o = o || {}; const hc = cam.p([P.x, P.eye, P.z]), k = hc[2]; if (!(k > 0)) return null;
    const hx = hc[0], hy = hc[1], side = P.face === 'left' ? -1 : P.face === 'right' ? 1 : 0, prof = side !== 0, away = P.face === 'away';
    const sw = (P.w || 0.23) * k * (prof ? 0.6 : 1), low = (P.low || 1.2) * k, ny = hy + 0.15 * k, sy = hy + 0.25 * k;
    const coat = P.coat || C.coat[0], hair = P.hair || C.hair[0], seed = P.seed || 1, face = mix(P.skin || C.skinDim[seed % 3], '#0E1018', 0.62);
    const ghost = !!o.ghost, rimA = ghost ? 0 : 1, fillOf = col => ghost ? o.ghost : col;
    const lift = ghost || o.lift === false ? null : [0, Math.max(4, k * 0.02)];
    const out = { k, x: hx, y: hy };
    if (P.arm) { const a = cam.p(P.arm), s0 = a[0] > hx ? 1 : -1, sx0 = hx + s0 * sw * 0.78, ex = lerp(sx0, a[0], 0.55) + s0 * 0.05 * k, ey = lerp(sy, a[1], 0.5);
      const arm = GG.blob([[sx0 - s0 * 0.09 * k, sy + 0.03 * k], [ex - 0.055 * k, ey], [a[0] - 0.04 * k, a[1] + 0.07 * k], [a[0] + 0.04 * k, a[1] + 0.07 * k], [ex + 0.06 * k, ey + 0.03 * k], [sx0 + s0 * 0.06 * k, sy + 0.16 * k]]);
      const ap = GG.piece(g, arm, { fill: fillOf(mix(coat, '#000000', 0.1)), rough: 1.0, tex: ghost ? 0 : 0.6, seed: seed + 5, kind: 'cloth' });
      const hand = GG.piece(g, S().ellipse(a[0], a[1] + 0.025 * k, 0.038 * k, 0.05 * k, 0), { fill: fillOf(face), rough: 0.5, tex: ghost ? 0 : 0.4, seed: seed + 6 });
      if (ap && rimA) cres(g, ap, -s0 * Math.max(1.5, k * 0.008), 0, C.rimCool, 0.45); }
    // the body: shoulders sloping from the neck, the upper arms hanging at the sides
    const body = GG.blob([[hx - sw * 1.0, sy + low], [hx - sw * 1.1, sy + 0.32 * k], [hx - sw * 1.02, sy + 0.08 * k], [hx - sw * 0.7, sy - 0.02 * k], [hx - sw * 0.32, ny], [hx + sw * 0.32, ny], [hx + sw * 0.7, sy - 0.02 * k], [hx + sw * 1.02, sy + 0.08 * k], [hx + sw * 1.1, sy + 0.32 * k], [hx + sw * 1.0, sy + low]]);
    const bp = GG.piece(g, body, { fill: fillOf(coat), rough: 1.3, tex: ghost ? 0 : 0.65, seed: seed + 1, kind: P.wool ? 'wool' : 'cloth', lift, liftAlpha: 0.45, liftBlur: 10 });
    out.body = bp;
    if (bp && rimA) { cres(g, bp, 0, -Math.max(2, k * 0.01), C.rimTop, 0.5); if (P.rim !== false) cres(g, bp, (side || (hx < W / 2 ? 1 : -1)) * -Math.max(2, k * 0.009), 0, C.rimCool, 0.55);
      // a seam down each sleeve, a fold across the back
      g.save(); g.clip(bp); g.lineCap = 'round'; [-1, 1].forEach(sg => { const x0 = hx + sg * sw * 0.62; g.strokeStyle = 'rgba(8,9,14,0.45)'; g.lineWidth = Math.max(1, k * 0.006); g.beginPath(); g.moveTo(x0, sy + 0.1 * k); g.lineTo(x0 + sg * 0.02 * k, sy + low); g.stroke(); g.strokeStyle = 'rgba(120,130,160,0.16)'; g.lineWidth = Math.max(1, k * 0.003); g.beginPath(); g.moveTo(x0 - 1.5, sy + 0.1 * k); g.lineTo(x0 - 1.5 + sg * 0.02 * k, sy + low); g.stroke(); }); g.restore(); }
    if (P.bag) GG.piece(g, S().poly([[hx - sw * 0.75, sy + 0.02 * k], [hx - sw * 0.52, sy - 0.02 * k], [hx + sw * 0.95, sy + low], [hx + sw * 0.7, sy + low]]), { fill: fillOf('#15161C'), rough: 0.6, tex: ghost ? 0 : 0.4, seed: seed + 8 });
    // the neck, then the head: a profile cut with forehead, nose, lips, chin; or the round of a head from behind or before
    GG.piece(g, S().rect(hx - 0.048 * k + side * 0.015 * k, hy + 0.05 * k, 0.096 * k, 0.13 * k), { fill: fillOf(face), rough: 0.5, tex: ghost ? 0 : 0.4, seed: seed + 2 });
    const f = side, head = prof ? GG.blob([[hx - f * 0.1 * k, hy - 0.06 * k], [hx - f * 0.02 * k, hy - 0.125 * k], [hx + f * 0.075 * k, hy - 0.08 * k], [hx + f * 0.1 * k, hy - 0.02 * k], [hx + f * 0.098 * k, hy + 0.0 * k, 1], [hx + f * 0.128 * k, hy + 0.045 * k, 1], [hx + f * 0.104 * k, hy + 0.062 * k, 1], [hx + f * 0.11 * k, hy + 0.075 * k], [hx + f * 0.104 * k, hy + 0.092 * k, 1], [hx + f * 0.1 * k, hy + 0.105 * k], [hx + f * 0.06 * k, hy + 0.135 * k], [hx - f * 0.02 * k, hy + 0.12 * k], [hx - f * 0.1 * k, hy + 0.05 * k]])
      : GG.blob([[hx, hy - 0.125 * k], [hx + 0.088 * k, hy - 0.07 * k], [hx + 0.092 * k, hy + 0.02 * k], [hx + 0.06 * k, hy + 0.1 * k], [hx, hy + 0.13 * k], [hx - 0.06 * k, hy + 0.1 * k], [hx - 0.092 * k, hy + 0.02 * k], [hx - 0.088 * k, hy - 0.07 * k]]);
    const hp = GG.piece(g, head, { fill: fillOf(away ? hair : face), rough: 0.5, tex: ghost ? 0 : 0.45, seed: seed + 3, lift: lift ? [0, lift[1] * 0.5] : null, liftAlpha: 0.35, liftBlur: 4 });
    out.head = hp;
    if (hp && rimA && !away) cres(g, hp, -(f || 1) * Math.max(1.5, k * 0.007), 0, C.rimCool, 0.6);
    // ears for heads seen square on
    const ears = () => [-1, 1].forEach(e => { const ep = GG.piece(g, S().ellipse(hx + e * 0.096 * k, hy + 0.025 * k, 0.02 * k, 0.036 * k, 0), { fill: fillOf(mix(face, '#000000', 0.05)), rough: 0.3, tex: ghost ? 0 : 0.3, seed: seed + 20 + e }); if (ep && rimA) cres(g, ep, e * Math.max(1, k * 0.004), 0, C.rimCool, 0.22); });
    if (!prof && !away) ears();
    // hair or hat over the head
    let hs = null;
    if (P.hat === 'beanie') hs = GG.blob([[hx - 0.098 * k, hy - 0.02 * k], [hx - 0.09 * k, hy - 0.1 * k], [hx, hy - 0.155 * k], [hx + 0.09 * k, hy - 0.1 * k], [hx + 0.098 * k, hy - 0.02 * k], [hx, hy - 0.04 * k]]);
    else if (P.hat === 'hood') hs = GG.blob([[hx - 0.13 * k, hy + 0.14 * k], [hx - 0.142 * k, hy - 0.04 * k], [hx - 0.03 * k, hy - 0.17 * k], [hx + 0.08 * k, hy - 0.15 * k], [hx + 0.142 * k, hy - 0.04 * k], [hx + 0.13 * k, hy + 0.14 * k]].concat(away ? [] : prof ? [[hx + f * 0.06 * k, hy + 0.1 * k], [hx + f * 0.075 * k, hy - 0.08 * k], [hx - f * 0.02 * k, hy - 0.06 * k]] : [[hx + 0.07 * k, hy + 0.1 * k], [hx + 0.08 * k, hy - 0.06 * k], [hx - 0.08 * k, hy - 0.06 * k], [hx - 0.07 * k, hy + 0.1 * k]]));
    else if (P.hat === 'cap') hs = S().poly([[hx - 0.098 * k, hy - 0.035 * k], [hx - 0.085 * k, hy - 0.115 * k], [hx + 0.07 * k, hy - 0.118 * k], [hx + 0.098 * k + f * 0.07 * k, hy - 0.04 * k]]);
    else if (away) hs = GG.blob([[hx - 0.094 * k, hy + 0.06 * k], [hx - 0.102 * k, hy - 0.05 * k], [hx - 0.03 * k, hy - 0.138 * k], [hx + 0.05 * k, hy - 0.135 * k], [hx + 0.102 * k, hy - 0.05 * k], [hx + 0.094 * k, hy + 0.06 * k], [hx + 0.04 * k, hy + 0.085 * k], [hx - 0.04 * k, hy + 0.085 * k]]);
    else if (prof) hs = GG.blob([[hx - f * 0.112 * k, hy + 0.07 * k], [hx - f * 0.11 * k, hy - 0.06 * k], [hx - f * 0.03 * k, hy - 0.14 * k], [hx + f * 0.06 * k, hy - 0.13 * k], [hx + f * 0.088 * k, hy - 0.07 * k], [hx + f * 0.02 * k, hy - 0.06 * k], [hx - f * 0.03 * k, hy + 0.0 * k], [hx - f * 0.05 * k, hy + 0.08 * k]]);
    else hs = GG.blob([[hx - 0.1 * k, hy + 0.02 * k], [hx - 0.095 * k, hy - 0.08 * k], [hx, hy - 0.14 * k], [hx + 0.095 * k, hy - 0.08 * k], [hx + 0.1 * k, hy + 0.02 * k], [hx + 0.07 * k, hy - 0.06 * k], [hx - 0.07 * k, hy - 0.06 * k]]);
    const hr = GG.piece(g, hs, { fill: fillOf(P.hat === 'hood' ? mix(coat, '#000000', 0.08) : P.hat && P.hat !== 'bun' ? (P.hatCol || '#2E3242') : hair), rough: 0.7, tex: ghost ? 0 : 0.6, seed: seed + 4, kind: P.hat === 'beanie' ? 'wool' : 'paper' });
    if (away && !P.hat) ears();
    if (P.hat === 'bun') GG.piece(g, S().ellipse(hx - (f || 0) * 0.1 * k, hy - 0.08 * k, 0.045 * k, 0.045 * k, 0), { fill: fillOf(hair), rough: 0.5, tex: ghost ? 0 : 0.5, seed: seed + 9 });
    if (P.headphones) { g.save(); g.strokeStyle = fillOf('#0E0F14'); g.lineWidth = Math.max(2, 0.02 * k); g.beginPath(); g.ellipse(hx, hy - 0.01 * k, 0.108 * k, 0.13 * k, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); g.restore(); [-1, 1].forEach(e => { if (prof && e !== -f) return; GG.piece(g, S().ellipse(hx + e * 0.098 * k, hy + 0.02 * k, 0.03 * k, 0.046 * k, 0), { fill: fillOf('#121318'), rough: 0.4, tex: 0, seed: seed + 10 + e }); }); }
    if (hr && rimA) { cres(g, hr, 0, -Math.max(2, k * 0.009), C.rimTop, 0.55); if (P.rim !== false) cres(g, hr, (f || (hx < W / 2 ? 1 : -1)) * -Math.max(1.5, k * 0.008), 0, C.rimCool, 0.5); }
    if (P.collar) { const cl = GG.blob([[hx - sw * 0.5, ny - 0.01 * k], [hx - sw * 0.2, ny + 0.06 * k], [hx + sw * 0.2, ny + 0.06 * k], [hx + sw * 0.5, ny - 0.01 * k], [hx + sw * 0.56, ny + 0.08 * k], [hx, ny + 0.14 * k], [hx - sw * 0.56, ny + 0.08 * k]]); const cp = GG.piece(g, cl, { fill: fillOf(mix(coat, '#000000', 0.18)), rough: 0.8, tex: ghost ? 0 : 0.5, seed: seed + 7, kind: 'cloth' }); if (cp && rimA) cres(g, cp, 0, -2, C.rimTop, 0.45); }
    return out;
  }

  // ---------------------------------------------------------------- the bus's fabric: walls, panes, seats, poles, rails, straps
  function panes(cam, z) {   // the window panes on the wall at z, as 3D quads (lower big pane, upper vent)
    const out = []; for (let i = 0; i < R.pillars.length - 1; i++) { const a = R.pillars[i] + R.pw, b = R.pillars[i + 1] - R.pw;
      out.push([[a, R.sill, z], [b, R.sill, z], [b, R.transom - 0.015, z], [a, R.transom - 0.015, z]]); out.push([[a, R.transom + 0.015, z], [b, R.transom + 0.015, z], [b, R.top, z], [a, R.top, z]]); }
    return out;
  }
  function panePath(cam, z) { const p = new Path2D(); panes(cam, z).forEach(q => p.addPath(cam.path(q))); return p; }
  // the far (or near) wall with its holes, the cove and the ceiling with the strip light
  function shell(g, cam, z) {
    const s = z > 0 ? 1 : -1, x0 = -6, x1 = 6;
    g.fillStyle = C.ceil; g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
    // ceiling and the strip light, the cove with blank ad frames
    pc(g, cam, [[x0, R.ceil, -1.3], [x1, R.ceil, -1.3], [x1, R.ceil, 1.3], [x0, R.ceil, 1.3]], { fill: C.ceil, rough: 0, tex: 0.5, seed: 10, kind: 'card' });
    [-0.28, 0.28].forEach((zz, i) => { pc(g, cam, [[x0, R.ceil - 0.01, zz - 0.09], [x1, R.ceil - 0.01, zz - 0.09], [x1, R.ceil - 0.01, zz + 0.09], [x0, R.ceil - 0.01, zz + 0.09]], { fill: C.ceilLit, rough: 0.6, tex: 0.4, seed: 11 + i });
      fl(g, cam, [[x0, R.ceil - 0.012, zz - 0.05], [x1, R.ceil - 0.012, zz - 0.05], [x1, R.ceil - 0.012, zz + 0.05], [x0, R.ceil - 0.012, zz + 0.05]], C.strip, 0.5, 13 + i); });
    const cv = [[x0, R.top + 0.03, z], [x1, R.top + 0.03, z], [x1, R.ceil, z - s * 0.25], [x0, R.ceil, z - s * 0.25]];
    const cp = pc(g, cam, cv, { fill: C.cove, rough: 0.8, tex: 0.6, seed: 15, kind: 'card', lift: [0, 6], liftAlpha: 0.5, liftBlur: 8 });
    for (let x = -5.4; x < 5.4; x += 1.35) { const yA = R.top + 0.06, yB = R.ceil - 0.04, zA = z - s * 0.03, zB = z - s * 0.22, xa = x + 0.12, xb = x + 1.23;
      const ap = pc(g, cam, [[xa, yA, zA], [xb, yA, zA], [xb, yB, zB], [xa, yB, zB]], { fill: '#1E2234', rough: 0.4, tex: 0.3, seed: 16 + x * 3 });
      fl(g, cam, [[xa + 0.03, yA + 0.02, zA - s * 0.003], [xb - 0.03, yA + 0.02, zA - s * 0.003], [xb - 0.03, yB - 0.02, zB - s * 0.003], [xa + 0.03, yB - 0.02, zB - s * 0.003]], C.ad[Math.abs(Math.round(x * 3)) % 4], 0.4, 17 + x * 3); }
    // the wall: below the sill, pillars between the panes, the rubber seals; then cut the glass out
    pc(g, cam, [[x0, -0.5, z], [x1, -0.5, z], [x1, R.top + 0.035, z], [x0, R.top + 0.035, z]], { fill: C.wall, rough: 0, tex: 0.5, seed: 20, kind: 'card' });
    pc(g, cam, [[x0, R.sill - 0.06, z - s * 0.02], [x1, R.sill - 0.06, z - s * 0.02], [x1, R.sill + 0.005, z - s * 0.02], [x0, R.sill + 0.005, z - s * 0.02]], { fill: C.wallLit, rough: 0.5, tex: 0.4, seed: 21 });
    panes(cam, z).forEach((q, i) => { const e = 0.022; fl(g, cam, [[q[0][0] - e, q[0][1] - e, z - s * 0.005], [q[1][0] + e, q[1][1] - e, z - s * 0.005], [q[2][0] + e, q[2][1] + e, z - s * 0.005], [q[3][0] - e, q[3][1] + e, z - s * 0.005]], C.seal, 0.4, 30 + i); });
    g.save(); g.globalCompositeOperation = 'destination-out'; panes(cam, z).forEach(q => g.fill(cam.path(q.map(p => [p[0], p[1], z - s * 0.006])))); g.restore();
    R.pillars.forEach((x, i) => { const pp = pc(g, cam, [[x - R.pw, R.sill - 0.04, z - s * 0.03], [x + R.pw, R.sill - 0.04, z - s * 0.03], [x + R.pw, R.top + 0.04, z - s * 0.03], [x - R.pw, R.top + 0.04, z - s * 0.03]], { fill: C.pillar, rough: 0.5, tex: 0.5, seed: 40 + i, lift: [4, 0], liftAlpha: 0.5, liftBlur: 6 }); if (pp) cres(g, pp, 0, -3, C.pillarLit, 0.6); });
  }
  // forward-facing double seats along a wall, seen side-on, with what sits in them added by the caller
  function seats(g, cam, z) {
    const s = z > 0 ? 1 : -1, za = z - s * 0.1, zb = z - s * 0.82;
    for (let x = -4.6; x < 4.8; x += 0.82) {
      // the cushion, then the back (a slab facing +x, its top rolled), the steel grab handle along its top
      pc(g, cam, [[x + 0.04, 0.44, za], [x + 0.04, 0.44, zb], [x + 0.5, 0.46, zb], [x + 0.5, 0.46, za]], { fill: mix(C.seat, '#000000', 0.15), rough: 0.7, tex: 0.5, seed: 59 + x * 5, kind: 'wool' });
      const bk = pc(g, cam, [[x, 0.42, za], [x, 0.42, zb], [x - 0.04, 0.98, zb], [x - 0.01, 1.03, zb + s * 0.03], [x - 0.01, 1.03, za - s * 0.03], [x - 0.04, 0.98, za]], { fill: C.seat, rough: 0.8, tex: 0.6, seed: 60 + x * 5, kind: 'wool', lift: [5, 6], liftAlpha: 0.5, liftBlur: 6 });
      if (bk) { g.save(); g.clip(bk); const r = OTM.rng('mq' + x); const bb = cam.p([x, 0.72, (za + zb) / 2]); for (let i = 0; i < 46; i++) { g.fillStyle = C.seatFleck[i % 3]; g.globalAlpha = 0.5; const px = bb[0] + (r() - 0.5) * bb[2] * 0.9, py = bb[1] + (r() - 0.5) * bb[2] * 0.6; g.fillRect(px, py, Math.max(1.5, bb[2] * 0.007), Math.max(1.5, bb[2] * 0.007)); } g.restore(); cres(g, bk, 0, -2, '#465074', 0.55); }
      rod(g, cam, [x - 0.02, 1.07, za - s * 0.05], [x - 0.02, 1.07, zb + s * 0.05], 0.012, mix(C.rail, C.wall, 0.45), { lit: mix(C.railLit, C.wall, 0.45), seed: 63 });
    }
  }
  function poles(g, cam, z, xs) { xs.forEach((x, i) => rod(g, cam, [x, -0.2, z], [x, R.ceil, z], 0.019, C.pole, { lit: C.poleLit, litSide: -1, seed: 80 + i, shadow: [6, 2], shadowAlpha: 0.35, shadowBlur: 5 })); }
  function rails(g, cam, z) {
    rod(g, cam, [-6, R.railY, z], [6, R.railY, z], 0.016, C.rail, { lit: C.railLit, seed: 90, shadow: [0, 8], shadowAlpha: 0.3, shadowBlur: 6 });
    for (let x = -5.6; x < 5.6; x += 0.46) { const top = cam.p([x, R.railY, z]); if (!(top[2] > 0)) continue; const k = top[2], L = 0.2 * k, sw = Math.sin(x * 3.1) * 0.012 * k;
      g.save(); g.strokeStyle = C.strap; g.lineWidth = Math.max(1.5, 0.022 * k); g.lineCap = 'round'; g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(top[0] + sw, top[1] + L); g.stroke();
      g.strokeStyle = C.handle; g.lineWidth = Math.max(1.5, 0.016 * k); g.beginPath(); g.ellipse(top[0] + sw, top[1] + L + 0.045 * k, 0.04 * k, 0.045 * k, 0, 0, 7); g.stroke(); g.restore(); }
  }

  // ---------------------------------------------------------------- the cast of strangers (interior: across to the far windows)
  const CROWD_FAR = [   // behind him: seated by the far windows (heads against the glass), standing in the aisle
    { x: -1.42, z: 0.86, eye: 1.2, face: 'left', hat: 'beanie', hatCol: '#3E2A30', coat: C.coat[5], hair: C.hair[1], seed: 11, low: 0.5, w: 0.2 },
    { x: 0.3, z: 0.86, eye: 1.17, face: 'away', hat: 'hood', coat: C.coat[2], seed: 12, low: 0.5, w: 0.2 },
    { x: 2.05, z: 0.86, eye: 1.2, face: 'left', hat: 'cap', hatCol: '#262A36', coat: C.coat[4], seed: 13, low: 0.5, w: 0.21 },
    { x: -2.6, z: 0.86, eye: 1.18, face: 'away', coat: C.coat[6], hair: C.hair[3], seed: 14, low: 0.5, w: 0.2 },
    { x: 1.42, z: 0.2, eye: 1.78, face: 'away', headphones: true, coat: C.coat[0], hair: C.hair[1], seed: 15, arm: [1.5, 1.9, 0.44], w: 0.24 },
    { x: 0.62, z: 0.04, eye: 1.6, face: 'left', hat: 'bun', coat: C.coat[3], hair: C.hair[2], seed: 16, arm: [0.5, 1.9, 0.44], w: 0.2, bag: true, collar: true },
    { x: -0.76, z: 0.3, eye: 1.8, face: 'left', coat: C.coat[1], hair: C.hair[0], seed: 17, w: 0.26, collar: true },   // the stranger pressed against his left arm, turned away from him
    { x: -1.95, z: 0.14, eye: 1.66, face: 'right', coat: C.coat[6], hair: C.hair[4], seed: 18, arm: [-1.78, 1.88, 0.44], w: 0.22 },
    { x: 2.5, z: 0.1, eye: 1.7, face: 'left', coat: C.coat[2], hair: C.hair[0], seed: 19, w: 0.23, hat: 'beanie', hatCol: '#262C3A' },
  ];
  const CROWD_NEAR = [  // between us and him: shoulders and the backs of heads, cropped by the frame
    { x: -0.56, z: -0.46, eye: 1.42, face: 'away', coat: C.coat[4], hair: C.hair[1], seed: 21, w: 0.25, rim: false },
    { x: 0.98, z: -0.5, eye: 1.62, face: 'away', hat: 'hood', coat: C.coat[0], seed: 22, w: 0.26, bag: true, rim: false },
  ];
  // the close: strangers behind him (toward the near windows), and the one pressed against his arm, in front
  const CROWD_CLOSE_BACK = [
    { x: -1.2, z: -0.42, eye: 1.64, face: 'left', coat: C.coat[2], hair: C.hair[2], seed: 31, w: 0.22, arm: [-1.05, 1.9, -0.44] },
    { x: 0.7, z: -0.5, eye: 1.72, face: 'away', coat: C.coat[6], hair: C.hair[0], seed: 32, w: 0.24, headphones: true },
    { x: 1.5, z: -0.86, eye: 1.18, face: 'right', hat: 'beanie', hatCol: '#3E3448', coat: C.coat[1], seed: 33, low: 0.5, w: 0.2 },
    { x: -0.15, z: -0.86, eye: 1.2, face: 'away', coat: C.coat[5], hair: C.hair[3], seed: 34, low: 0.5, w: 0.2 },
  ];
  // the same stranger, seen from the window side: turned away, the back of his head and his shoulder against his arm
  const STRANGER = { x: -0.76, z: 0.3, eye: 1.82, face: 'away', coat: C.coat[1], hair: C.hair[0], seed: 17, w: 0.27, collar: true };

  // =====================================================================================
  // VIEWS
  // =====================================================================================
  const CAMS = {
    interior: mkCam({ pos: [0.15, 1.47, -1.12], at: [0.1, 1.4, 1.2], f: 1010 }),
    close: mkCam({ pos: [-0.1, 1.64, 0.9], at: [-0.38, 1.6, 0.0], f: 1250 }),
  };
  const SIDE = { interior: R.zFar, close: R.zNear };
  const STRIPS = {};
  function strips(view) {
    if (STRIPS[view]) return STRIPS[view];
    const cam = CAMS[view], z = SIDE[view], side = z > 0 ? 1 : -1, dist = zz => Math.abs(zz - cam.pos[2]);
    const top = cam.p([0, R.top, z])[1], sill = cam.p([0, R.sill, z])[1], ph = sill - top;
    const sky = layerOf(cam, side, dist(side * 60)), shop = layerOf(cam, side, dist(side * 11)), post = layerOf(cam, side, dist(side * R.lampZ));
    const foot = top + ph * 0.66, shopTop = top + ph * 0.7;
    return (STRIPS[view] = { side, top, sill, foot, shopTop,
      sky: Object.assign(sky, { cv: skylineStrip(sky.k, ph * 0.5) }), shop: Object.assign(shop, { cv: shopStrip(shop.k, sill - shopTop + 30) }), post });
  }
  // the street sliding past, clipped to the glass
  function outside(c, cam, view, t) {
    const g = c.g, st = strips(view), clip = panePath(cam, SIDE[view]);
    g.save(); g.clip(clip);
    g.drawImage(c.cache('bus|' + view + '|sky', gg => { gg.translate(M, M);
      const top = st.top, f = st.foot, d = f - top, bands = [[-M, C.sky[0]], [top + d * 0.1, C.sky[1]], [top + d * 0.32, C.sky[2]], [top + d * 0.55, C.sky[3]], [top + d * 0.76, C.sky[4]], [top + d * 0.9, C.haze]];
      bands.forEach(([y, col], i) => { gg.fillStyle = col; gg.fill(S().rect(-M - 40, y, W + 2 * M + 80, H + 2 * M).path(i ? 2.6 : 0, 120 + i)); });
      GG.texture(gg, rectPath(-M, -M, W + 2 * M, H + 2 * M), 0.45, 125, 'paper'); }, W + 2 * M, H + 2 * M), -M, -M);
    const blit = (L, y) => { const w = L.cv.width, off = ((t * L.speed) % w + w) % w; for (let x = -off; x < W + w; x += w) g.drawImage(L.cv, Math.round(x - w), Math.round(y)); };
    blit(st.sky, st.foot - st.sky.cv.height); blit(st.shop, st.shopTop);
    // the near posts (streetlights, their heads above the glass) sweeping past
    const lk = st.post.k, gap = R.lampGap * lk, off = ((t * st.post.speed) % gap + gap) % gap;
    for (let x = off - gap; x < W + gap; x += gap) { g.fillStyle = C.post; g.fill(S().rect(x - 0.08 * lk, st.top - 40, 0.16 * lk, st.sill - st.top + 80).path(0.6, 133)); g.fillStyle = 'rgba(227,154,82,0.35)'; g.fillRect(x - 0.08 * lk + (st.side > 0 ? 0.11 : 0) * lk, st.top - 40, 0.05 * lk, st.sill - st.top + 80); }
    g.restore();
    // the far lamps bloom a little
    c.em.save(); c.em.globalAlpha = 0.6; c.em.beginPath(); c.em.rect(0, st.foot - 30, W, 40); c.em.clip(); c.em.globalAlpha = 0.35; const sw = st.sky.cv.width, so = ((t * st.sky.speed) % sw + sw) % sw; for (let x = -so; x < W + sw; x += sw) c.em.drawImage(st.sky.cv, Math.round(x - sw), Math.round(st.foot - st.sky.cv.height)); c.em.restore();
  }
  // the dark glass: a tint, and what it gives back of the lit bus (the strip light, the others' faces)
  function glass(g, cam, view) {
    const z = SIDE[view], s = z > 0 ? 1 : -1, clip = panePath(cam, z);
    g.save(); g.clip(clip); g.fillStyle = C.glass; g.globalAlpha = 0.18; g.fillRect(-M, -M, W + 2 * M, H + 2 * M); g.globalAlpha = 1;
    g.globalCompositeOperation = 'screen';
    // the strip light's reflection, a pale line across the upper panes
    const mirror = q => [q[0], q[1], 2 * z - q[2]];
    [-0.28, 0.28].forEach((zz, i) => { g.globalAlpha = 0.16; fl(g, cam, [[-6, R.ceil, zz - 0.05], [6, R.ceil, zz - 0.05], [6, R.ceil, zz + 0.05], [-6, R.ceil, zz + 0.05]].map(mirror), '#5C6782', 0.5, 140 + i); });
    // the passengers' reflections: pale ghosts at their mirror positions
    const crowd = view === 'interior' ? CROWD_NEAR.concat(CROWD_FAR.filter(p => p.eye > 1.4)) : CROWD_CLOSE_BACK.filter(p => p.eye > 1.4);
    const gl = OTM.makeCanvas(g.canvas.width, g.canvas.height).getContext('2d'); gl.setTransform(g.getTransform());
    crowd.forEach((P, i) => { const Q = Object.assign({}, P, { z: 2 * z - P.z, face: P.face === 'away' ? 'toward' : P.face === 'toward' ? 'away' : P.face, arm: P.arm ? mirror(P.arm) : null, seed: 200 + i }); person(gl, cam, Q, { ghost: '#4A5580' }); });
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.2; g.drawImage(gl.canvas, 0, 0);
    g.restore();
  }
  function drawShell(g, cam, view) { shell(g, cam, SIDE[view]); }
  function drawCrowdBack(g, cam, view) {
    const z = SIDE[view];
    seats(g, cam, z);
    const seated = (view === 'interior' ? CROWD_FAR : CROWD_CLOSE_BACK).filter(p => p.eye < 1.4); seated.forEach(P => person(g, cam, P));
    poles(g, cam, z - (z > 0 ? 1 : -1) * 0.78, view === 'interior' ? R.poles : [-0.8, 0.8]);
    rails(g, cam, (z > 0 ? 1 : -1) * R.railZ);
    const standing = (view === 'interior' ? CROWD_FAR : CROWD_CLOSE_BACK).filter(p => p.eye >= 1.4).sort((a, b) => Math.abs(b.z - cam.pos[2]) - Math.abs(a.z - cam.pos[2]));
    standing.forEach(P => person(g, cam, P));
  }
  function drawCrowdFront(g, cam, view) {
    if (view === 'interior') CROWD_NEAR.forEach(P => person(g, cam, P));
    else person(g, cam, STRANGER);
  }
  // one band of sodium light crossing the bus as a streetlight passes; returns {k 0..1 at his head, x (screen), color}
  function sweepAt(view, t) {
    const st = strips(view);
    const ph = ((t / T.lampPeriod) % 1 + 1) % 1;          // 0..1 between streetlights
    const span = W + 900, x = st.side > 0 ? W + 450 - ph * span : -450 + ph * span;
    const head = CAMS[view].p(R.him.head)[0], d = Math.abs(x - head);
    return { x, k: clamp(1 - d / 420, 0, 1) > 0.5 ? 1 : clamp(1 - d / 420, 0, 1) > 0 ? 0.5 : 0, color: C.sodium, period: T.lampPeriod };
  }
  function drawSweep(c, view, t) {
    const sw = sweepAt(view, t), g = c.g, w = 330, sk = 260 * (sweepAt(view, 0).x > W ? 1 : -1);
    const band = (x, half, a, seed) => { g.globalAlpha = a; g.fillStyle = C.sodium; g.fill(S().poly([[x - half + sk, -80], [x + half + sk, -80], [x + half - sk * 0.4, H + 80], [x - half - sk * 0.4, H + 80]]).path(3, seed)); };
    g.save(); g.globalCompositeOperation = 'soft-light'; band(sw.x, w * 0.9, 0.42, 150); band(sw.x, w * 0.45, 0.5, 151); g.restore();
  }

  function makeAnchors(view) {
    const cam = CAMS[view], A = {}, h = R.him, r3 = v => +v.toFixed(3);
    const win = cam.headAngles([0.25, -0.1, 1]), phone = cam.headAngles([h.phone[0] - h.head[0], h.phone[1] - h.head[1], h.phone[2] - h.head[2]]);
    const stranger = cam.headAngles([STRANGER.x - h.head[0], -0.05, STRANGER.z - h.head[2]]), floor = cam.headAngles([0.1, -1, 0.35]);
    A.head = anchor(cam, h.head, { yaw: r3(phone.yaw), pitch: r3(phone.pitch), looks: { window: { yaw: r3(win.yaw), pitch: r3(win.pitch) }, phone: { yaw: r3(phone.yaw), pitch: r3(phone.pitch) }, stranger: { yaw: r3(stranger.yaw), pitch: r3(stranger.pitch) }, floor: { yaw: r3(floor.yaw), pitch: r3(floor.pitch) } } });
    A.hands = { rail: anchor(cam, h.handRail), phone: anchor(cam, [h.phone[0] - 0.02, h.phone[1] - 0.05, h.phone[2] - 0.01]) };
    A.phone = anchor(cam, h.phone, { held: 'in his left hand at his chest, screen to his face' });
    A.hips = anchor(cam, h.hips);
    A.stranger = anchor(cam, [STRANGER.x + STRANGER.w * 0.85, STRANGER.eye - 0.3, STRANGER.z], { note: 'the stranger\'s shoulder against his left arm (drawn by the set: CROWD in back(), the pressed one in front() for close)' });
    if (view === 'interior') { const mz = 2 * R.zFar, mph = cam.headAngles([h.phone[0] - h.head[0], h.phone[1] - h.head[1], -(h.phone[2] - h.head[2])]);
      A.reflection = anchor(cam, [h.head[0], h.head[1], mz - h.head[2]], { yaw: r3(mph.yaw), pitch: r3(mph.pitch), flip: true, note: 'his head in the glass, the mirror image across z = 1.2 (draw it mirrored left to right, with s.reflect)' }); }
    return A;
  }
  const LIGHT = {
    interior: { name: 'bus', x: 960, y: 560, color: C.sky[3], amb: '#2E3550', keys: [{ dir: [0.1, -0.35, -0.9], col: '#7E90BE', k: 0.45, poster: [0.3], levels: [1] }, { dir: [0, -0.95, 0.2], col: '#9AA6C0', k: 0.3, poster: [0.4], levels: [1] }] },
    close: { name: 'bus', x: 960, y: -100, color: C.sky[3], amb: '#2E3550', keys: [{ dir: [0.25, -0.25, 0.9], col: '#8EA0CC', k: 0.5, poster: [0.15, 0.5], levels: [0.5, 1] }, { dir: [0, -0.95, 0.2], col: '#9AA6C0', k: 0.25, poster: [0.4], levels: [1] }] },
  };
  // the light at a moment: the shot's light with the passing sodium band added to its keys when it crosses his head
  function lightAt(view, t) { const sw = sweepAt(view, t), L = LIGHT[view]; if (!sw.k) return L; return Object.assign({}, L, { keys: L.keys.concat([{ dir: [VIEW_SIDE(view) * 0.85, -0.2, view === 'close' ? 0.5 : -0.5], col: C.sodium, k: 0.6 * sw.k, poster: [0.3], levels: [1] }]) }); }
  const VIEW_SIDE = view => (view === 'interior' ? -1 : 1);
  function makeView(view) {
    const cam = CAMS[view];
    const v = {
      cam, anchors: makeAnchors(view), light: LIGHT[view], lightAt: t => lightAt(view, t), sweep: t => sweepAt(view, t),
      split: +((view === 'interior' ? cam.p([0, 1.5, SIDE[view]]) : cam.p([-0.8, 1.5, -0.42]))[0] / W).toFixed(3),     // the centre pillar and its pole; in the close, the pole between him and the stranger
      back(c, t, s) {
        s = s || {};
        outside(c, cam, view, t);
        layer(c, 'bus|' + view + '|glass', g => glass(g, cam, view));
        if (s.reflect && view === 'interior') reflectHook(c, cam, v.anchors.reflection, s.reflect);
        layer(c, 'bus|' + view + '|shell', g => drawShell(g, cam, view));
        layer(c, 'bus|' + view + '|crowd', g => drawCrowdBack(g, cam, view));
        emLayer(c, 'bus|' + view + '|em', g => { g.fillStyle = 'rgba(174,185,202,0.18)'; [-0.28, 0.28].forEach(zz => g.fill(cam.path([[-6, R.ceil, zz - 0.05], [6, R.ceil, zz - 0.05], [6, R.ceil, zz + 0.05], [-6, R.ceil, zz + 0.05]]))); });
      },
      front(c, t, s) {
        s = s || {};
        if (s.crowd !== false) layer(c, 'bus|' + view + '|front', g => drawCrowdFront(g, cam, view));
        if (s.sweep !== false) drawSweep(c, view, t);
      },
    };
    return v;
  }
  // his reflection: the caller draws him into a scratch layer at R (the mirror position), the set lays it into the glass
  const _rf = {};
  function reflectHook(c, cam, A, fn) {
    if (!_rf.g) _rf.g = OTM.makeCanvas(W, H).getContext('2d');
    const g = _rf.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.setTransform(c.g.getTransform());
    fn(g, Object.assign({}, A, { alpha: 0.42 }));
    c.g.save(); c.g.clip(panePath(cam, R.zFar)); c.g.globalCompositeOperation = 'screen'; c.g.globalAlpha = 0.42; c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.drawImage(_rf.g.canvas, 0, 0); c.g.restore();
  }
  const views = { interior: makeView('interior'), close: makeView('close') };

  // =====================================================================================
  // DEMOS (4 s each, from a time offset so a streetlight is passing in some)
  // =====================================================================================
  const stand = (c, v, t, s) => { v.back(c, t, s); v.front(c, t, s); };
  const ghost = (g, a) => { g.save(); g.fillStyle = '#9A8C86'; g.beginPath(); g.ellipse(a.x, a.y, a.scale * 0.09, a.scale * 0.12, 0, 0, 7); g.fill(); g.restore(); };
  SETS.bus = {
    views,
    prepare: (names, states) => prepare(views, names, states),
    demos: [
      { name: 'interior', draw: (c, t) => stand(c, views.interior, t, {}) },
      { name: 'interior: a streetlight passing', t0: 0.9, draw: (c, t) => stand(c, views.interior, t, {}) },
      { name: 'interior: the reflection hook (a stand-in head in the glass)', draw: (c, t) => stand(c, views.interior, t, { reflect: (g, R) => ghost(g, R) }) },
      { name: 'interior: anchors', draw: (c, t) => { stand(c, views.interior, t, {}); c.after.push(cx => markers(cx, views.interior)); } },
      { name: 'close', draw: (c, t) => stand(c, views.close, t, {}) },
      { name: 'close: a streetlight passing', t0: 0.9, draw: (c, t) => stand(c, views.close, t, {}) },
      { name: 'close: anchors', draw: (c, t) => { stand(c, views.close, t, {}); c.after.push(cx => markers(cx, views.close)); } },
    ],
  };
})();
