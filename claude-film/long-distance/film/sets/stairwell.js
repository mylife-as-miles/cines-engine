window.SETS = window.SETS || {};
/* LONG DISTANCE · set: STAIRWELL (Q04 Send me one)
   The office's concrete fire stair: raw grey card at its heaviest grain and fibre (board-marked walls, tie holes, worn treads with
   dark nosing strips), a steel balustrade over the open well, and one high window band in the end wall whose grey daylight falls
   in cut bands from the top of the stair down; he sits below it, in the shade, where only the phone lights him.
   A switchback stair laid out in metres: he sits on the seventh step of the flight, by the wall; the lunch bag sits in the empty
   half of the step by the balustrade; beyond the balustrade the well drops to the flight below and the flight above climbs back
   over it (its stepped edge and soffit cut across the window band).
     wide      from the half landing below: the whole flight, the window band at the top; small on the step
     close     him on the step from a few steps down: the stairs above behind him (the landing, the fire door), the treads below
     tight     the same axis, his face and neck (the colour rising)
     shoulder  over his right shoulder: the phone held up before him, the flight dropping away below (the phone draws its screen)
   The seam between his half and the empty half: the window band's centre mullion and the conduit under it (wide, close, tight).
   Deterministic. Static layers cached under 'stairwell|...'. API: film/api/stairwell.md */
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
  function anchor(cam, q, extra) { const p = cam.p(q); if (!(p[2] > 0)) return Object.assign({ x: null, y: null, scale: 0, s: 0, world: q.slice(), behind: true }, extra || {}); return Object.assign({ x: Math.round(p[0]), y: Math.round(p[1]), scale: +p[2].toFixed(1), s: +(p[2] * 0.23).toFixed(1), world: q.slice() }, extra || {}); }
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
  function rectPath(x, y, w, h) { const p = new Path2D(); p.rect(x, y, w, h); return p; }
  // a cached full-frame layer with a margin; drawn under whatever camera the sequence set
  function layer(c, key, draw) { const cv = c.cache(key, g => { g.translate(M, M); draw(g); }, W + 2 * M, H + 2 * M); c.g.drawImage(cv, -M, -M); return cv; }
  function emLayer(c, key, draw) { const cv = c.cache(key, g => { g.scale(0.25, 0.25); draw(g); }, W / 4, H / 4); c.em.drawImage(cv, 0, 0, W, H); return cv; }
  // demo overlay: where the anchors are (a ring the size of a head at that depth, the phone's footprint, the split)
  function markers(g, v) {
    const A = v.anchors; g.save(); g.lineWidth = 2; g.font = '500 18px "Libre Franklin"';
    const dot = (a, name, col) => { if (!a || a.x == null || !(a.scale >= 0)) return; g.strokeStyle = col || 'rgba(255,214,120,0.9)'; g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(a.x, a.y, a.scale ? a.scale * 0.115 : 6, 0, 7); g.stroke(); g.fillRect(a.x - 2, a.y - 2, 4, 4); g.fillText(name, a.x + 8, a.y - 8); };
    Object.keys(A).forEach(k => { const a = A[k]; if (a && a.quad) { g.strokeStyle = 'rgba(120,230,255,0.9)'; g.beginPath(); a.quad.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.stroke(); g.fillStyle = g.strokeStyle; g.fillText(k, a.x + 10, a.y + 24); } else if (a && a.x != null) dot(a, k); else if (a && typeof a === 'object') Object.keys(a).forEach(j => { if (a[j] && a[j].x != null) dot(a[j], k + '.' + j, 'rgba(255,150,120,0.9)'); }); });
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.setLineDash([10, 10]); g.beginPath(); g.moveTo(v.split * W, 0); g.lineTo(v.split * W, H); g.stroke(); g.restore();
  }

  // =====================================================================================
  // THE STAIR (metres: x across the flight (+x toward the well), y up, z up the flight; the half landing at y = 0)
  // =====================================================================================
  const R = {
    rise: 0.17, go: 0.28, n: 10, x0: -0.6, x1: 0.6,                 // flight A: ten risers from the half landing to the floor above
    land0: { y: 0, z0: -1.45, z1: 0 }, land1: { y: 1.7, z0: 2.52, z1: 4.0 },
    wellX: [0.62, 1.02], xC: [1.02, 2.22], wallL: -0.6, wallR: 2.26, endZ: 4.0, backZ: -1.45, slab: 0.2,
    win: { x0: -0.42, x1: 2.04, y0: 3.72, y1: 4.17, z: 4.0, mullion: 0.06 },
    door: { z0: 2.85, z1: 3.78, y0: 1.7, y1: 3.75 },
    hips: [-0.18, 1.22, 1.86], head: [-0.18, 1.94, 1.6], feet: [-0.18, 0.86, 1.22],
    phoneLap: [-0.12, 1.5, 1.38], phoneHeld: [-0.36, 1.58, 1.33],
    bag: [0.3, 1.19, 1.82],
  };
  const tread = k => ({ y: R.rise * k, z0: R.go * (k - 1), z1: R.go * k });
  const pitchY = z => R.rise + z * R.rise / R.go;                        // the line through the nosings
  const railY = z => pitchY(z) + 0.9;
  const C = {
    ink: '#1C1C1B', base: '#575652',
    wall: ['#504F4B', '#605F5A', '#706F69', '#807E77'],     // by height: the light comes from the top
    tread: '#7A7873', treadLit: '#8C8A83', riser: '#5D5C58', riserDk: '#4E4D49', nose: '#30302D', noseLit: '#A6A39A',
    soffit: '#55544F', soffitLit: '#62615C', edge: '#64635E',
    steel: '#363938', steelLit: '#7C807D', rail: '#424645', railLit: '#8D918E',
    door: '#5C6560', doorDk: '#4A524E', frame: '#3F4542', bar: '#8A8F8C',
    sky: '#C2C6C0', skyLo: '#B3B8B1', mesh: '#959B96', winFrame: '#3A3E3B', sill: '#8D8B84',
    bag: '#9A8361', bagLit: '#B29A74', bagDk: '#6F5C43', bagFold: '#85704F',
    patch: '#A9A69D', patch2: '#9A978F',
  };
  // the wall's colour at a height: cut bands, lighter toward the window band
  const WALLH = [-9, 1.05, 2.25, 3.3];
  // a wall plane in cut height bands (fixed coordinate `fix` on axis `ax`, spanning u0..u1 along the other horizontal axis)
  function wall(g, cam, ax, fix, u0, u1, y0, y1, seed, o) {
    o = o || {}; const P = (u, y) => ax === 'x' ? [fix, y, u] : [u, y, fix];
    const p = pc(g, cam, [P(u0, y0), P(u1, y0), P(u1, y1), P(u0, y1)], { fill: C.wall[2], rough: 0, tex: 0, seed });
    if (!p) return null;
    g.save(); g.clip(p);
    C.wall.forEach((col, i) => { const a = Math.max(y0, WALLH[i]), b = Math.min(y1, i + 1 < WALLH.length ? WALLH[i + 1] : 99); if (b <= a) return;
      const e = (u1 - u0) * 0.2; fl(g, cam, [P(u0 - e, a), P(u1 + e, a), P(u1 + e, b + 0.02), P(u0 - e, b + 0.02)], o.shade ? mix(col, C.ink, o.shade) : col, i ? 2.6 : 0, seed + i); });
    // board-marked concrete: the formwork's horizontal joints and its tie holes
    const k = cam.p(P((u0 + u1) / 2, (y0 + y1) / 2))[2];
    g.globalAlpha = 0.5; for (let y = Math.ceil(y0 / 0.3) * 0.3; y < y1; y += 0.3) seam(g, cam, P(u0, y), P(u1, y), 'rgba(40,40,38,0.55)', 'rgba(170,168,160,0.35)', clamp(k * 0.004, 1, 3), [0, -1.2]);
    g.globalAlpha = 0.6; for (let y = Math.ceil(y0 / 0.6) * 0.6 + 0.15; y < y1; y += 0.6) for (let u = Math.ceil(u0 / 0.6) * 0.6 + 0.3; u < u1; u += 0.6) { const q = cam.p(P(u, y)); if (q[2] <= 0 || q[2] > 1300) continue; g.fillStyle = '#2F2F2C'; g.beginPath(); g.arc(q[0], q[1], Math.max(1.2, q[2] * 0.009), 0, 7); g.fill(); g.fillStyle = 'rgba(170,168,160,0.45)'; g.beginPath(); g.arc(q[0] - 1, q[1] - 1, Math.max(0.6, q[2] * 0.004), 0, 7); g.fill(); }
    g.restore();
    rawConcrete(g, p, seed, k);
    return p;
  }
  // the heaviest grain and fibre: the card texture twice (fine and coarse), stains, specks
  function rawConcrete(g, p, seed, k) {
    GG.texture(g, p, 0.85, seed + 40, 'card', 1);
    GG.texture(g, p, 0.4, seed + 41, 'paper', 2.6);
    g.save(); g.clip(p); const r = OTM.rng('crete' + seed), bb = { x: -M, y: -M, w: W + 2 * M, h: H + 2 * M };
    g.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 7; i++) { const x = bb.x + r() * bb.w, y = bb.y + r() * bb.h, rx = 40 + r() * 160, ry = 20 + r() * 80; g.globalAlpha = 0.06 + r() * 0.06; g.fillStyle = '#5A5650'; g.fill(S().ellipse(x, y, rx, ry, r() * 3).path(6, seed + 60 + i)); }
    g.restore();
    GG.specks(g, p, bb, 520, '#2A2A27', 'cs' + seed, 1.6, 0.5);
    GG.specks(g, p, bb, 260, '#B6B3AA', 'cl' + seed, 1.3, 0.35);
  }

  // ---------------------------------------------------------------- the structure
  function endWall(g, cam) {
    const z = R.endZ, w = R.win;
    const p = wall(g, cam, 'z', z, R.wallL - 0.2, R.wallR + 0.2, -2, 6.5, 300);
    // the window band: wired glass, grey day; a sill; a dark frame; the centre mullion (the seam)
    pc(g, cam, [[w.x0 - 0.06, w.y0 - 0.07, z - 0.005], [w.x1 + 0.06, w.y0 - 0.07, z - 0.005], [w.x1 + 0.06, w.y1 + 0.06, z - 0.005], [w.x0 - 0.06, w.y1 + 0.06, z - 0.005]], { fill: C.winFrame, rough: 0.6, tex: 0.4, seed: 310 });
    const gp = pc(g, cam, [[w.x0, w.y0, z - 0.01], [w.x1, w.y0, z - 0.01], [w.x1, w.y1, z - 0.01], [w.x0, w.y1, z - 0.01]], { fill: C.sky, rough: 0.4, tex: 0.25, seed: 311 });
    if (gp) { g.save(); g.clip(gp); fl(g, cam, [[w.x0, w.y0, z - 0.011], [w.x1, w.y0, z - 0.011], [w.x1, w.y0 + 0.14, z - 0.011], [w.x0, w.y0 + 0.14, z - 0.011]], C.skyLo, 1.2, 312);
      g.globalAlpha = 0.55; for (let x = w.x0; x < w.x1; x += 0.03) ln(g, cam, [x, w.y0, z - 0.012], [x, w.y1, z - 0.012], C.mesh, 0.8); for (let y = w.y0; y < w.y1; y += 0.03) ln(g, cam, [w.x0, y, z - 0.012], [w.x1, y, z - 0.012], C.mesh, 0.8); g.restore(); }
    [w.x0 + (w.x1 - w.x0) / 3, w.x0 + 2 * (w.x1 - w.x0) / 3].forEach((x, i) => pc(g, cam, [[x - 0.025, w.y0, z - 0.015], [x + 0.025, w.y0, z - 0.015], [x + 0.025, w.y1, z - 0.015], [x - 0.025, w.y1, z - 0.015]], { fill: C.winFrame, rough: 0.3, tex: 0.3, seed: 313 + i }));
    pc(g, cam, [[w.mullion - 0.03, w.y0, z - 0.016], [w.mullion + 0.03, w.y0, z - 0.016], [w.mullion + 0.03, w.y1, z - 0.016], [w.mullion - 0.03, w.y1, z - 0.016]], { fill: C.winFrame, rough: 0.3, tex: 0.3, seed: 316 });
    pc(g, cam, [[w.x0 - 0.08, w.y0 - 0.1, z - 0.06], [w.x1 + 0.08, w.y0 - 0.1, z - 0.06], [w.x1 + 0.08, w.y0 - 0.07, z - 0.06], [w.x0 - 0.08, w.y0 - 0.07, z - 0.06]], { fill: C.sill, rough: 0.4, tex: 0.5, seed: 317 });
    // the conduit down from the window's mullion to the landing: the seam continues to the floor
    const cx = w.mullion; pc(g, cam, [[cx - 0.018, R.land1.y, z - 0.03], [cx + 0.018, R.land1.y, z - 0.03], [cx + 0.018, w.y0 - 0.1, z - 0.03], [cx - 0.018, w.y0 - 0.1, z - 0.03]], { fill: '#4C4D4A', rough: 0.3, tex: 0.4, seed: 318, lift: [3, 2], liftAlpha: 0.4, liftBlur: 3 });
    pc(g, cam, [[cx - 0.05, 2.3, z - 0.035], [cx + 0.05, 2.3, z - 0.035], [cx + 0.05, 2.42, z - 0.035], [cx - 0.05, 2.42, z - 0.035]], { fill: '#545552', rough: 0.4, tex: 0.4, seed: 319, lift: [3, 3], liftAlpha: 0.45, liftBlur: 3 });
    return p;
  }
  function winEm(g, cam) { const w = R.win, z = R.endZ; g.fillStyle = 'rgba(205,210,202,0.5)'; g.fill(cam.path([[w.x0, w.y0, z], [w.x1, w.y0, z], [w.x1, w.y1, z], [w.x0, w.y1, z]])); }
  // the window's daylight: where it falls on the far wall past the well, and on the top of the stair (cut, two steps)
  const LDIR = [-0.2, -0.45, -0.8];
  function onPlaneX(q, X) { const t = (X - q[0]) / LDIR[0]; return [X, q[1] + LDIR[1] * t, q[2] + LDIR[2] * t]; }
  function onPlaneY(q, Y) { const t = (Y - q[1]) / LDIR[1]; return [q[0] + LDIR[0] * t, Y, q[2] + LDIR[2] * t]; }
  function winCorners(grow) { const w = R.win, e = grow || 0; return [[w.x0 - e, w.y0 - e, R.endZ], [w.x1 + e, w.y0 - e, R.endZ], [w.x1 + e, w.y1 + e, R.endZ], [w.x0 - e, w.y1 + e, R.endZ]]; }
  function farWall(g, cam) {
    wall(g, cam, 'x', R.wallR, R.backZ, R.endZ, -3.5, 6.5, 400, { shade: 0.22 });
  }
  function leftWall(g, cam) {
    const X = R.wallL, p = wall(g, cam, 'x', X, R.backZ, R.endZ, -2.5, 6.5, 500);
    if (p) { g.save(); g.clip(p); g.globalCompositeOperation = 'screen';
      [[0.16, 0.2], [0.0, 0.3]].forEach(([e, a], i) => { const q = winCorners(e).map(c => onPlaneX(c, X + 0.002)); g.globalAlpha = a; fl(g, cam, q, '#8E8B83', 2.8, 530 + i); });
      g.restore(); }
    // the fire door at the upper landing: steel, a narrow wired-glass vision panel, a push bar; a caged bulkhead light above, off
    const d = R.door, xf = X + 0.004;
    pc(g, cam, [[xf, d.y0, d.z0 - 0.07], [xf, d.y0, d.z1 + 0.07], [xf, d.y1 + 0.07, d.z1 + 0.07], [xf, d.y1 + 0.07, d.z0 - 0.07]], { fill: C.frame, rough: 0.6, tex: 0.5, seed: 520 });
    const dp = pc(g, cam, [[xf + 0.005, d.y0, d.z0], [xf + 0.005, d.y0, d.z1], [xf + 0.005, d.y1, d.z1], [xf + 0.005, d.y1, d.z0]], { fill: C.door, rough: 0.6, tex: 0.6, seed: 521, kind: 'card' });
    if (dp) { const a = cam.p([xf, d.y0, (d.z0 + d.z1) / 2]), b = cam.p([xf, d.y1, (d.z0 + d.z1) / 2]); vbands(g, cam, dp, [xf + 0.006, d.y0, d.z0], [xf + 0.006, d.y0, d.z1], d.y1 - d.y0, [0, 0.45, 0.8], [C.doorDk, C.door, mix(C.door, '#A8B0AA', 0.25)], 2.2, 522); }
    const vp = pc(g, cam, [[xf + 0.008, 2.75, d.z1 - 0.22], [xf + 0.008, 2.75, d.z1 - 0.12], [xf + 0.008, 3.4, d.z1 - 0.12], [xf + 0.008, 3.4, d.z1 - 0.22]], { fill: '#7B8480', rough: 0.3, tex: 0.3, seed: 523 });
    if (vp) { g.save(); g.clip(vp); g.globalAlpha = 0.5; for (let y = 2.75; y < 3.4; y += 0.03) ln(g, cam, [xf + 0.009, y, d.z1 - 0.22], [xf + 0.009, y, d.z1 - 0.12], C.mesh, 0.7); g.restore(); }
    pc(g, cam, [[xf + 0.04, 2.6, d.z0 + 0.08], [xf + 0.04, 2.6, d.z1 - 0.06], [xf + 0.04, 2.66, d.z1 - 0.06], [xf + 0.04, 2.66, d.z0 + 0.08]], { fill: C.bar, rough: 0.3, tex: 0.3, seed: 524, lift: [2, 3], liftAlpha: 0.4, liftBlur: 3 });
    const bl = cam.p([xf + 0.05, 4.0, (d.z0 + d.z1) / 2]); if (bl[2] > 0) { const k = bl[2]; const sh = S().ellipse(bl[0], bl[1], 0.1 * k, 0.07 * k, 0); const bp = GG.piece(g, sh, { fill: '#6E6F6A', rough: 0.6, tex: 0.4, seed: 525, lift: [3, 4], liftAlpha: 0.45, liftBlur: 4 }); cres(g, bp, -2, -2, '#9C9B94', 0.7); g.save(); g.clip(bp); g.strokeStyle = '#3A3A37'; g.lineWidth = Math.max(1, k * 0.006); for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(bl[0] + i * 0.035 * k, bl[1] - 0.08 * k); g.lineTo(bl[0] + i * 0.035 * k, bl[1] + 0.08 * k); g.stroke(); } g.restore(); }
    return p;
  }
  // the flight above (C): climbs back over the well from the floor landing toward us; seen from below, its soffit and stepped edge
  function flightC(g, cam) {
    const [xa, xb] = R.xC, top = z => R.land1.y + (R.land1.z0 - z) * R.rise / R.go;       // its pitch line, rising toward -z
    // soffit (underside), a sloped slab from the landing up to the next half landing
    const s0 = R.land1.z0, s1 = 0, sy = z => top(z) - R.slab - 0.06;
    const sp = pc(g, cam, [[xa, sy(s0), s0], [xb, sy(s0), s0], [xb, sy(s1), s1], [xa, sy(s1), s1]], { fill: C.soffit, rough: 1.2, tex: 0, seed: 600 });
    if (sp) { rawConcrete(g, sp, 600, 300); }
    // the next half landing's slab, overhead
    pc(g, cam, [[xa - 0.08, 3.4 - R.slab, 0], [R.wallR, 3.4 - R.slab, 0], [R.wallR, 3.4 - R.slab, R.backZ], [xa - 0.08, 3.4 - R.slab, R.backZ]], { fill: '#454441', rough: 1.0, tex: 0.7, seed: 601, kind: 'card' });
    // its stepped edge toward the well (x = xa), visible from our side: the sawtooth over the soffit line
    if (cam.pos[0] < xa) {
      const P = [[xa, sy(s0), s0]];
      for (let k = 0; k <= 10; k++) { const z = R.land1.z0 - k * R.go, y = R.land1.y + k * R.rise; P.push([xa, y, z]); if (k < 10) P.push([xa, y, z - R.go]); }
      P.push([xa, sy(s1), s1]);
      const ep = pc(g, cam, P, { fill: C.edge, rough: 0.9, tex: 0, seed: 602, lift: [8, 10], liftAlpha: 0.55, liftBlur: 12 });
      if (ep) { rawConcrete(g, ep, 602, 300); cres(g, ep, 0, -4, '#99978E', 0.9); cres(g, ep, 0, 5, '#3A3936', 0.6); }
      // its balustrade bars, against the far wall
      for (let z = s0 - 0.1; z > s1; z -= 0.12) { const yb = top(z) + 0.02; rod(g, cam, [xa + 0.03, yb, z], [xa + 0.03, yb + 0.9, z], 0.008, C.steel, { seed: 610 }); }
      rod(g, cam, [xa + 0.03, top(s0) + 0.92, s0], [xa + 0.03, top(s1) + 0.92, s1], 0.022, C.rail, { lit: C.railLit, seed: 611 });
    }
  }
  // the flight below (B): from the half landing down over the well side, away from us
  function flightB(g, cam) {
    const [xa, xb] = R.xC;
    for (let k = 9; k >= 1; k--) { const y = -R.rise * k, z0 = R.go * (k - 1), z1 = R.go * k;
      pc(g, cam, [[xa, y, z0], [xb, y, z0], [xb, y, z1], [xa, y, z1]], { fill: mix(C.tread, C.ink, 0.3 + k * 0.03), rough: 0.8, tex: 0.6, seed: 650 + k, kind: 'card' });
      pc(g, cam, [[xa, y, z0], [xb, y, z0], [xb, y + R.rise, z0], [xa, y + R.rise, z0]], { fill: mix(C.riser, C.ink, 0.4 + k * 0.03), rough: 0.8, tex: 0.6, seed: 670 + k, kind: 'card' }); }
  }
  // flight A, the half landing and the floor landing's front
  function flightA(g, cam) {
    const { x0, x1 } = R;
    // the floor landing's top (seen only from above it) and its front riser
    if (cam.pos[1] > R.land1.y) pc(g, cam, [[R.wallL, R.land1.y, R.land1.z0], [R.wallR, R.land1.y, R.land1.z0], [R.wallR, R.land1.y, R.land1.z1], [R.wallL, R.land1.y, R.land1.z1]], { fill: C.treadLit, rough: 0.8, tex: 0.7, seed: 700, kind: 'card' });
    for (let k = R.n; k >= 1; k--) {
      const t = tread(k), zr = R.go * (k - 1), yb = R.rise * (k - 1);
      // the riser
      const rp = pc(g, cam, [[x0, yb, zr], [x1, yb, zr], [x1, yb + R.rise, zr], [x0, yb + R.rise, zr]], { fill: k > 7 ? C.riser : mix(C.riser, C.riserDk, (7 - k) / 7), rough: 0.9, tex: 0, seed: 710 + k });
      if (rp) rawConcrete(g, rp, 710 + k, 300);
      if (k === R.n) continue;
      // the tread, its worn middle a shade lighter, a dark anti-slip strip on the nosing with a lit edge
      if (cam.pos[1] > t.y) {
        const tp = pc(g, cam, [[x0, t.y, t.z0], [x1, t.y, t.z0], [x1, t.y, t.z1], [x0, t.y, t.z1]], { fill: mix(C.tread, C.riserDk, Math.max(0, (6 - k) * 0.06)), rough: 0.9, tex: 0, seed: 730 + k, lift: [0, 4], liftAlpha: 0.35, liftBlur: 5 });
        if (tp) { g.save(); g.clip(tp); fl(g, cam, [[-0.25, t.y, t.z0 + 0.05], [0.25, t.y, t.z0 + 0.04], [0.28, t.y, t.z1 - 0.06], [-0.28, t.y, t.z1 - 0.05]], mix(C.tread, C.treadLit, 0.5), 1.6, 740 + k);
          // the back of each tread sits in the shadow of the riser above
          fl(g, cam, [[x0 - 0.1, t.y, t.z1 - 0.07], [x1 + 0.1, t.y, t.z1 - 0.06], [x1 + 0.1, t.y, t.z1 + 0.01], [x0 - 0.1, t.y, t.z1 + 0.01]], mix(C.tread, C.ink, 0.25), 1.4, 745 + k); g.restore(); rawConcrete(g, tp, 730 + k, 300); }
        pc(g, cam, [[x0, t.y + 0.002, t.z0], [x1, t.y + 0.002, t.z0], [x1, t.y + 0.002, t.z0 + 0.045], [x0, t.y + 0.002, t.z0 + 0.045]], { fill: C.nose, rough: 0.4, tex: 0.4, seed: 750 + k });
        g.save(); g.lineCap = 'round'; ln(g, cam, [x0, t.y + 0.003, t.z0 + 0.003], [x1, t.y + 0.003, t.z0 + 0.003], 'rgba(170,166,156,0.6)', Math.max(1, cam.p([0, t.y, t.z0])[2] * 0.004)); g.restore();
      }
    }
  }
  // the half landing (y = 0) where the wide camera stands; under everything on the flight
  function halfLanding(g, cam) {
    const lp = pc(g, cam, [[R.wallL, 0, R.backZ], [R.wellX[1], 0, R.backZ], [R.wellX[1], 0, 0], [R.wallL, 0, 0]], { fill: mix(C.tread, C.ink, 0.35), rough: 0.8, tex: 0, seed: 760 }); if (lp) rawConcrete(g, lp, 760, 300);
  }
  // the steel balustrade along flight A's well edge, and the wall handrail on brackets
  function balustrade(g, cam) {
    const X = R.wellX[0] - 0.01, Lsh = [-3, 4];
    for (let z = 0.06; z < R.land1.z0 + 1.4; z += 0.12) { const yb = z < R.land1.z0 ? R.rise * Math.ceil((z + 1e-6) / R.go) : R.land1.y, yt = z < R.land1.z0 ? railY(z) : R.land1.y + 0.95;
      rod(g, cam, [X, yb, z], [X, yt, z], 0.008, C.steel, { seed: 820 }); }
    const z1 = R.land1.z0, rail = [[X, railY(-0.05), -0.05], [X, railY(z1), z1], [X, R.land1.y + 0.95, z1 + 0.06], [X, R.land1.y + 0.95, z1 + 1.4]];
    for (let i = 0; i < rail.length - 1; i++) rod(g, cam, rail[i], rail[i + 1], 0.024, C.rail, { lit: C.railLit, seed: 821 + i, shadow: Lsh, shadowAlpha: 0.35, shadowBlur: 4 });
    // the post at the foot of the flight
    rod(g, cam, [X, 0, -0.03], [X, railY(-0.05) + 0.02, -0.03], 0.02, C.steel, { lit: C.steelLit, seed: 825 });
    // the wall rail on its brackets, its soft shadow on the concrete
    const XL = R.wallL + 0.07, za = -0.25, zb = R.land1.z0 + 0.25;
    for (let z = 0.35; z < R.land1.z0; z += 1.0) rod(g, cam, [R.wallL, railY(z) - 0.06, z], [XL, railY(z) - 0.02, z], 0.01, '#3A3C3B', { seed: 830 });
    rod(g, cam, [R.wallL + 0.003, railY(za) - 0.045, za], [R.wallL + 0.003, railY(zb) - 0.045, zb], 0.024, 'rgba(24,24,22,0.32)', { seed: 831 });
    rod(g, cam, [XL, railY(za), za], [XL, railY(zb), zb], 0.021, '#454948', { lit: '#8E9290', seed: 832 });
  }
  // the lunch bag: brown paper, the top folded over twice, unopened
  function lunchBag(g, cam, state) {
    if (state === 'none') return;
    const [bx, by, bz] = R.bag, w = 0.15, d = 0.09, h = 0.2, k = cam.p(R.bag)[2];
    shadow3(g, cam, [[bx - w / 2 - 0.02, by, bz - d / 2 - 0.03], [bx + w / 2 + 0.04, by, bz - d / 2 - 0.03], [bx + w / 2 + 0.04, by, bz + d / 2 + 0.02], [bx - w / 2 - 0.02, by, bz + d / 2 + 0.02]], Math.max(3, k * 0.02), 0.6);
    const ry = by + h, P = (x, y, z) => [bx + x, by + y, bz + z];
    // the front (toward the bottom of the stair) and the side toward the well; crumpled a little
    const front = pc(g, cam, [P(-w / 2, 0, -d / 2), P(w / 2, 0, -d / 2), P(w / 2 - 0.004, h, -d / 2 - 0.004), P(-w / 2 + 0.006, h + 0.004, -d / 2)], { fill: C.bag, rough: 1.0, tex: 0.75, seed: 800, kind: 'paper' });
    const side = cam.pos[0] > bx + w / 2 ? pc(g, cam, [P(w / 2, 0, -d / 2), P(w / 2, 0, d / 2), P(w / 2, h, d / 2), P(w / 2 - 0.004, h, -d / 2 - 0.004)], { fill: C.bagDk, rough: 1.0, tex: 0.75, seed: 801, kind: 'paper' })
      : pc(g, cam, [P(-w / 2, 0, -d / 2), P(-w / 2, 0, d / 2), P(-w / 2, h, d / 2), P(-w / 2 + 0.006, h + 0.004, -d / 2)], { fill: C.bagDk, rough: 1.0, tex: 0.75, seed: 801, kind: 'paper' });
    if (front) { cres(g, front, 0, Math.max(2, k * 0.012), C.bagLit, 0.8); g.save(); g.clip(front); seam(g, cam, P(-0.02, 0.02, -d / 2 - 0.001), P(0.01, h - 0.03, -d / 2 - 0.001), 'rgba(80,62,40,0.5)', 'rgba(210,190,150,0.35)', Math.max(1, k * 0.004)); seam(g, cam, P(0.05, 0.04, -d / 2 - 0.001), P(0.03, 0.12, -d / 2 - 0.001), 'rgba(80,62,40,0.4)', 'rgba(210,190,150,0.3)', Math.max(1, k * 0.003)); g.restore(); }
    // the folded top: two turns of the bag, a lighter band
    const ft = pc(g, cam, [P(-w / 2 - 0.004, h - 0.045, -d / 2 - 0.012), P(w / 2 + 0.004, h - 0.045, -d / 2 - 0.012), P(w / 2 + 0.004, h + 0.012, -d / 2 - 0.006), P(-w / 2 - 0.004, h + 0.012, -d / 2 - 0.006)], { fill: C.bagFold, rough: 0.8, tex: 0.7, seed: 802, kind: 'paper', lift: [0, Math.max(2, k * 0.01)], liftAlpha: 0.45, liftBlur: 3 });
    if (ft) cres(g, ft, 0, Math.max(2, k * 0.008), C.bagLit, 0.9);
    if (cam.pos[1] > by + h) pc(g, cam, [P(-w / 2 - 0.004, h + 0.012, -d / 2 - 0.006), P(w / 2 + 0.004, h + 0.012, -d / 2 - 0.006), P(w / 2, h + 0.01, d / 2), P(-w / 2, h + 0.01, d / 2)], { fill: C.bagLit, rough: 0.6, tex: 0.6, seed: 803, kind: 'paper' });
  }
  // the light from the window band coming down the stair: two cut steps laid over the upper flight and the landing
  function daylight(g, cam) {
    const z = R.endZ;
    g.save(); g.globalCompositeOperation = 'screen';
    // on the top treads and risers: a falling patch, strongest near the landing
    [[0.32, 0.18], [0.12, 0.26]].forEach(([e, a], i) => {
      const P = winCorners(e).map(c => onPlaneY(c, R.land1.y - 0.4)).map(q => [q[0], q[1], q[2]]);
      g.globalAlpha = a; const pts = [[R.x0, 1.25, 1.9 - i * 0.2], [R.x1, 1.25, 1.9 - i * 0.2], [R.x1, 1.75, 2.6], [R.x0, 1.75, 2.6]];
      fl(g, cam, pts.map(q => [q[0], pitchY(q[2]) - 0.02, q[2]]), '#B4B2AA', 2.6, 900 + i); });
    g.restore();
  }

  // =====================================================================================
  // VIEWS
  // =====================================================================================
  const CAMS = {
    wide: mkCam({ pos: [0.36, 1.58, -1.32], at: [0.02, 2.12, 2.3], f: 860 }),
    close: mkCam({ pos: [0.42, 1.98, 0.22], at: [-0.12, 1.5, 1.7], f: 1000 }),
    tight: mkCam({ pos: [0.14, 1.9, 0.92], at: [-0.17, 1.8, 1.62], f: 1350 }),
    shoulder: mkCam({ pos: [-0.58, 2.05, 2.25], yaw: 2.770, pitch: -0.452, f: 1800 }),
  };
  function drawBack(g, cam, view) {
    g.fillStyle = C.base; g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
    endWall(g, cam); farWall(g, cam);
    flightB(g, cam);
    flightC(g, cam);
    leftWall(g, cam);
    halfLanding(g, cam);
    flightA(g, cam);
    balustrade(g, cam);
  }
  function makeAnchors(view) {
    const cam = CAMS[view], A = {};
    const down = cam.headAngles([0, -0.55, -1]), up = cam.headAngles([0.1, 0.5, 1]), below = cam.headAngles([0.05, -0.7, -0.75]), phone = cam.headAngles([R.phoneLap[0] - R.head[0], R.phoneLap[1] - R.head[1], R.phoneLap[2] - R.head[2]]);
    const r3 = v => +v.toFixed(3);
    A.head = anchor(cam, R.head, { yaw: r3(phone.yaw), pitch: r3(phone.pitch), looks: { phone: { yaw: r3(phone.yaw), pitch: r3(phone.pitch) }, above: { yaw: r3(up.yaw), pitch: r3(up.pitch) }, below: { yaw: r3(below.yaw), pitch: r3(below.pitch) }, ahead: { yaw: r3(down.yaw), pitch: r3(down.pitch) } } });
    A.seat = anchor(cam, R.hips); A.feet = anchor(cam, R.feet);
    A.hands = { left: anchor(cam, [R.phoneLap[0] + 0.06, R.phoneLap[1] - 0.04, R.phoneLap[2] + 0.02]), right: anchor(cam, [R.phoneLap[0] - 0.06, R.phoneLap[1] - 0.05, R.phoneLap[2] + 0.02]) };
    A.phone = anchor(cam, view === 'shoulder' ? R.phoneHeld : R.phoneLap, { held: view === 'shoulder' ? 'up before his right shoulder, screen to his eyes' : 'in both hands over his knees, screen to his face' });
    if (view === 'shoulder') { const ph = R.phoneHeld, n = [R.head[0] - ph[0], R.head[1] - ph[1] + 0.02, R.head[2] - ph[2]], l = Math.hypot(...n), u = n.map(v => v / l);
      // the screen's quad, true size, facing his eyes (portrait): for the phone module to warp its blurred grid onto
      const up3 = [0, 1, 0], ax = [up3[1] * u[2] - up3[2] * u[1], up3[2] * u[0] - up3[0] * u[2], up3[0] * u[1] - up3[1] * u[0]], al = Math.hypot(...ax), X = ax.map(v => v / al), Y = [u[1] * X[2] - u[2] * X[1], u[2] * X[0] - u[0] * X[2], u[0] * X[1] - u[1] * X[0]];
      const hw = 0.066 / 2, hh = 0.142 / 2, c3 = (a, b) => [ph[0] + X[0] * a + Y[0] * b, ph[1] + X[1] * a + Y[1] * b, ph[2] + X[2] * a + Y[2] * b];
      A.phone.quad = [c3(-hw, hh), c3(hw, hh), c3(hw, -hh), c3(-hw, -hh)].map(q => { const p = cam.p(q); return [Math.round(p[0]), Math.round(p[1])]; });
      A.phone.screen = 'tl tr br bl, as he sees it';
      A.shoulder = anchor(cam, [R.head[0] - 0.2, 1.62, R.head[2] + 0.12]); A.ear = anchor(cam, [R.head[0] - 0.075, R.head[1] - 0.02, R.head[2] + 0.02]); }
    A.bag = anchor(cam, R.bag);
    A.above = anchor(cam, [0.05, R.land1.y + 1.0, R.door.z0]); A.below = anchor(cam, [0.0, 0.3, 0.4]);
    return A;
  }
  const LIGHT_KEYS = { amb: '#5A5C60', keys: [{ dir: [0.0, -0.75, -0.6], col: '#DCDCD8', k: 0.45, poster: [0.3], levels: [1] }] };
  const LIGHT = {
    wide: Object.assign({ name: 'stairwell', x: 1070, y: 300, color: C.sky }, LIGHT_KEYS),
    close: Object.assign({ name: 'stairwell', x: 900, y: -200, color: C.sky }, LIGHT_KEYS),
    tight: Object.assign({ name: 'stairwell', x: 860, y: -300, color: C.sky }, LIGHT_KEYS),
    shoulder: Object.assign({ name: 'stairwell', x: 600, y: -400, color: C.sky }, { amb: '#5A5C60', keys: [{ dir: [0.2, -0.7, 0.6], col: '#DCDCD8', k: 0.45, poster: [0.3], levels: [1] }] }),
  };
  function makeView(view) {
    const cam = CAMS[view], mul = cam.p([R.win.mullion, 3.0, R.endZ]);
    const v = {
      cam, anchors: makeAnchors(view), light: LIGHT[view],
      split: view === 'shoulder' ? 0.5 : +(clamp(mul[0] / W, 0.3, 0.7)).toFixed(3),
      back(c, t, s) {
        s = s || {};
        // the heaviest grain and fibre in the film, unless the shot has its own finish
        const sp = (c.shot && c.shot.post) || {}; if (c.post) { if (c.post.grain == null && sp.grain == null && s.finish !== false) c.post.grain = 0.135; if (c.post.fibre == null && sp.fibre == null && s.finish !== false) c.post.fibre = 0.14; }
        layer(c, 'stairwell|' + view, g => drawBack(g, cam, view));
        if (view !== 'shoulder') layer(c, 'stairwell|' + view + '|bag|' + (s.lunch || 'unopened'), g => lunchBag(g, cam, s.lunch || 'unopened'));
        emLayer(c, 'stairwell|' + view + '|em', g => winEm(g, cam));
      },
      front(c, t, s) { },
    };
    return v;
  }
  const views = { wide: makeView('wide'), close: makeView('close'), tight: makeView('tight'), shoulder: makeView('shoulder') };

  // =====================================================================================
  // DEMOS
  // =====================================================================================
  const stand = (c, v, t, s) => { v.back(c, t, s); v.front(c, t, s); };
  SETS.stairwell = {
    views,
    demos: [
      { name: 'wide: lunch unopened', draw: (c, t) => stand(c, views.wide, t, {}) },
      { name: 'wide: lunch none', draw: (c, t) => stand(c, views.wide, t, { lunch: 'none' }) },
      { name: 'wide: anchors', draw: (c, t) => { stand(c, views.wide, t, {}); c.after.push(cx => markers(cx, views.wide)); } },
      { name: 'close', draw: (c, t) => stand(c, views.close, t, {}) },
      { name: 'close: anchors', draw: (c, t) => { stand(c, views.close, t, {}); c.after.push(cx => markers(cx, views.close)); } },
      { name: 'tight', draw: (c, t) => stand(c, views.tight, t, {}) },
      { name: 'shoulder', draw: (c, t) => stand(c, views.shoulder, t, {}) },
      { name: 'shoulder: anchors', draw: (c, t) => { stand(c, views.shoulder, t, {}); c.after.push(cx => markers(cx, views.shoulder)); } },
    ],
  };
})();
