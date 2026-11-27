window.SETS = window.SETS || {};
/* LONG DISTANCE · SET: the bathroom (SETS.bathroom) · film/api/bathroom.md
   The morning routine. One small tiled room laid out in metres and seen through pinhole cameras, so the two views agree: the basin
   wall in cold white tile paper; a mirror cabinet over the basin whose two mirrored doors meet on the centre line; under it a shelf,
   and on the shelf, on the centre line, a glass with two toothbrushes: his blue one on the left, the other on the right, stiff and
   grey, furred with dust. The phone stands propped against the right-hand mirror, in the empty half. A small frosted window right
   of the cabinet gives the grey light. The mirror shows the room behind us (the open door, the hall dark beyond it) by reflecting
   the room's own geometry, so his reflection and the phone sit in front of the same reflected room in every view.
   Views: glass (the insert: the glass on the centre line, a state lifts his brush out), mirror (him at the basin, seen in the
   mirror; his figure is the rig's, between back() and front(); the phone is the phone's).
   Foam and every white thing are cut paper, never pure white. Deterministic: no Math.random, no Date. */
(function () {
  'use strict';
  const O = window.OTM, GG = window.GG, W = O.W, H = O.H, clamp = O.clamp, lerp = O.lerp;
  const SET = 'bathroom', MG = 48;

  // ================================================================ paper kit (the same block opens bathroom.js)
  // pinhole camera with a shifted lens: camera({target, dist, yaw, pitch, f, flop, place:[[x,y,z], sx, sy]}).p(x,y,z) -> [sx, sy, depth]
  // world: x right, y up, z away; yaw -PI/2 looks down -x. flop mirrors the picture. place shifts the lens so a world point lands on a screen point.
  function camera(o) {
    const yaw = o.yaw || 0, pitch = o.pitch || 0, cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const fwd = [cp * syw, sp, cp * cyw];
    const pos = o.pos || [o.target[0] - fwd[0] * o.dist, o.target[1] - fwd[1] * o.dist, o.target[2] - fwd[2] * o.dist];
    const f = o.f, fl = o.flop ? -1 : 1;
    const cam = { f, pos, fwd, flop: !!o.flop, cx: W / 2, cy: H / 2 };
    cam.p = function (x, y, z) {
      if (Array.isArray(x)) { z = x[2]; y = x[1]; x = x[0]; }
      const dx = x - pos[0], dy = y - pos[1], dz = z - pos[2];
      const x1 = dx * cyw - dz * syw, z1 = dx * syw + dz * cyw, y2 = dy * cp - z1 * sp, z2 = Math.max(0.02, dy * sp + z1 * cp);
      return [cam.cx + fl * f * x1 / z2, cam.cy - f * y2 / z2, z2];
    };
    cam.k = (x, y, z) => f / cam.p(x, y, z)[2];                       // px per metre at that point
    cam.pts = a => a.map(q => cam.p(q));
    cam.xy = a => a.map(q => { const r = cam.p(q); return [r[0], r[1]]; });
    cam.sees = (n, q) => n[0] * (pos[0] - q[0]) + n[1] * (pos[1] - q[1]) + n[2] * (pos[2] - q[2]) > 0;   // back-face test
    cam.ray = (sx, sy) => { const x1 = fl * (sx - cam.cx) / f, y2 = -(sy - cam.cy) / f, dy = y2 * cp + sp, z1 = -y2 * sp + cp; return [x1 * cyw + z1 * syw, dy, -x1 * syw + z1 * cyw]; };   // the world ray through a screen point
    if (o.place) { const q = cam.p(o.place[0]); cam.cx += o.place[1] - q[0]; cam.cy += o.place[2] - q[1]; }
    return cam;
  }
  // a cached full-frame layer (with margin) per key; res > 1 renders it larger for pushes
  function layer(c, key, fn, res) {
    res = res || 1;
    return c.cache(SET + ':' + key + '@' + res, g => { g.setTransform(res, 0, 0, res, MG * res, MG * res); fn(g); }, Math.ceil((W + 2 * MG) * res), Math.ceil((H + 2 * MG) * res));
  }
  function blit(c, cv, alpha, mode) {
    if (alpha != null && alpha <= 0.001) return; const g = c.g; g.save();
    if (alpha != null) g.globalAlpha = Math.min(1, alpha); if (mode) g.globalCompositeOperation = mode;
    g.drawImage(cv, -MG, -MG, W + 2 * MG, H + 2 * MG); g.restore();
  }
  // a cached layer cropped to a screen box [x, y, w, h]
  function boxLayer(c, key, bx, fn, res) {
    res = res || 1;
    return c.cache(SET + ':' + key + '@' + res, g => { g.setTransform(res, 0, 0, res, -bx[0] * res, -bx[1] * res); fn(g); }, Math.ceil(bx[2] * res), Math.ceil(bx[3] * res));
  }
  function blitBox(c, cv, bx, alpha, mode) {
    if (alpha != null && alpha <= 0.001) return; const g = c.g; g.save();
    if (alpha != null) g.globalAlpha = Math.min(1, alpha); if (mode) g.globalCompositeOperation = mode;
    g.drawImage(cv, bx[0], bx[1], bx[2], bx[3]); g.restore();
  }
  const _tmp = {};
  function tmp(w, h, slot) {
    const k = w + 'x' + h + ':' + (slot || 0); let t = _tmp[k];
    if (!t) t = _tmp[k] = O.makeCanvas(w, h).getContext('2d');
    t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'source-over'; t.globalAlpha = 1; t.filter = 'none'; t.clearRect(0, 0, w, h); return t;
  }
  // the lit (or shaded) paper edge on the side facing (dx, dy); works on any canvas size
  function cres(g, path, dx, dy, color, alpha, blur) {
    const t = tmp(g.canvas.width, g.canvas.height, 7); t.setTransform(g.getTransform()); t.fillStyle = color; t.fill(path);
    t.globalCompositeOperation = 'destination-out'; if (blur) t.filter = `blur(${blur}px)`; t.translate(-dx, -dy); t.fill(path);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha == null ? 1 : alpha; g.drawImage(t.canvas, 0, 0); g.restore();
  }
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  const poly = pts => O.S().poly(pts.map(q => [q[0], q[1]]));
  function quad(g, cam, pts3, o) { return GG.piece(g, poly(cam.xy(pts3)), o); }
  function line3(g, cam, pts3, col, w, dash) { const q = cam.xy(pts3); g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; if (dash) g.setLineDash(dash); g.beginPath(); q.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.restore(); }
  // B1's crease: a dark cut with a lit lip
  function crease(g, pts, o) {
    o = o || {}; const p = GG.spline(pts, false), w = o.w || 5; g.save(); g.lineCap = 'round';
    g.strokeStyle = o.dark || 'rgba(10,13,22,0.6)'; g.lineWidth = w; g.stroke(p);
    g.translate(o.dx || 0, o.dy == null ? -3 : o.dy); g.strokeStyle = o.light || 'rgba(86,102,138,0.4)'; g.lineWidth = w * 0.45; g.stroke(p); g.restore();
  }
  const TX = {};
  const tile = kind => TX[kind] || (TX[kind] = GG.paperTile(kind).getContext('2d').getImageData(0, 0, 512, 512).data);
  // SOFT GOODS: a height field y = h(x, z) over a patch of the world, flat-shaded per cell, blurred, then cut into posterised bands
  // (band edges wobble like scissors), its outline cut by hand, its own paper laid in, lifted off the layer below.
  // o: {x0,x1,z0,z1, step, h, shade(n,x,y,z)->0..1, bands:[..], cols:[..], blur, wob, edge, tex, kind, seed, lift:[dx,dy], liftBlur, liftAlpha}
  // returns the cut piece {cv, x, y} in device pixels (for masks), or null.
  function field(g, cam, o) {
    const T = g.getTransform(), res = Math.hypot(T.a, T.b), seed = o.seed || 1;
    const st = o.step || 0.012, nx = Math.max(1, Math.ceil((o.x1 - o.x0) / st)), nz = Math.max(1, Math.ceil((o.z1 - o.z0) / st));
    const dx = (o.x1 - o.x0) / nx, dz = (o.z1 - o.z0) / nz, NX = nx + 1, N = NX * (nz + 1);
    const Y = new Float32Array(N), SX = new Float32Array(N), SY = new Float32Array(N), DP = new Float32Array(N), OK = new Uint8Array(N);
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = o.x0 + i * dx, z = o.z0 + j * dz, y = o.h(x, z); if (y == null) continue;
      const k = j * NX + i, q = cam.p(x, y, z); OK[k] = 1; Y[k] = y; DP[k] = q[2];
      const X = T.a * q[0] + T.c * q[1] + T.e, Yd = T.b * q[0] + T.d * q[1] + T.f; SX[k] = X; SY[k] = Yd;
      if (X < bx0) bx0 = X; if (X > bx1) bx1 = X; if (Yd < by0) by0 = Yd; if (Yd > by1) by1 = Yd;
    }
    if (bx0 > bx1) return null;
    const blur = (o.blur == null ? 2.5 : o.blur) * res, pad = Math.ceil(blur * 3 + 8);
    bx0 = Math.max(0, Math.floor(bx0) - pad); by0 = Math.max(0, Math.floor(by0) - pad); bx1 = Math.min(g.canvas.width, Math.ceil(bx1) + pad); by1 = Math.min(g.canvas.height, Math.ceil(by1) + pad);
    const bw = bx1 - bx0, bh = by1 - by0; if (bw <= 2 || bh <= 2) return null;
    const V = O.makeCanvas(bw, bh), vg = V.getContext('2d'); vg.lineWidth = 1.4; vg.lineJoin = 'round';
    const cells = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = j * NX + i, b = a + 1, cc = a + NX + 1, d = a + NX; if (!(OK[a] && OK[b] && OK[cc] && OK[d])) continue;
      const mx = Math.min(SX[a], SX[b], SX[cc], SX[d]), Mx = Math.max(SX[a], SX[b], SX[cc], SX[d]), my = Math.min(SY[a], SY[b], SY[cc], SY[d]), My = Math.max(SY[a], SY[b], SY[cc], SY[d]);
      if (Mx < bx0 || mx > bx1 || My < by0 || my > by1) continue;
      cells.push([a, DP[a] + DP[b] + DP[cc] + DP[d], i, j]);
    }
    cells.sort((u, v) => v[1] - u[1]);
    for (let ci = 0; ci < cells.length; ci++) {
      const a = cells[ci][0], i = cells[ci][2], j = cells[ci][3], b = a + 1, cc = a + NX + 1, d = a + NX;
      const gx = ((Y[b] - Y[a]) + (Y[cc] - Y[d])) / (2 * dx), gz = ((Y[d] - Y[a]) + (Y[cc] - Y[b])) / (2 * dz), l = Math.hypot(gx, 1, gz);
      const v = clamp(o.shade([-gx / l, 1 / l, -gz / l], o.x0 + (i + 0.5) * dx, (Y[a] + Y[b] + Y[cc] + Y[d]) * 0.25, o.z0 + (j + 0.5) * dz), 0, 1) * 255 | 0;
      const col = 'rgb(' + v + ',' + v + ',' + v + ')'; vg.fillStyle = col; vg.strokeStyle = col;
      vg.beginPath(); vg.moveTo(SX[a] - bx0, SY[a] - by0); vg.lineTo(SX[b] - bx0, SY[b] - by0); vg.lineTo(SX[cc] - bx0, SY[cc] - by0); vg.lineTo(SX[d] - bx0, SY[d] - by0); vg.closePath(); vg.fill(); vg.stroke();
    }
    const B = O.makeCanvas(bw, bh), bg = B.getContext('2d'); bg.filter = `blur(${blur}px)`; bg.drawImage(V, 0, 0); bg.filter = 'none';
    const src = bg.getImageData(0, 0, bw, bh).data, out = bg.createImageData(bw, bh), od = out.data;
    const cols = o.cols.map(hx => O.hexToRgb(hx)), bands = o.bands || [0.45, 0.78], tx = o.tex === 0 ? null : tile(o.kind || 'cloth'), ta = o.tex == null ? 0.5 : o.tex;
    const r = O.rng('field' + seed), tox = r() * 512 | 0, toy = r() * 512 | 0, wob = o.wob == null ? 0.07 : o.wob, edge = o.edge == null ? 0.24 : o.edge, ir = 1 / res;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const q = (y * bw + x) * 4, a = src[q + 3] / 255; if (a < 0.1) continue;
      const wx = (x + bx0) * ir, wy = (y + by0) * ir;
      let al = 1;
      if (a < 0.98) { const cov = a + ((O.vnoise(wx * 0.08, wy * 0.08, seed + 11) - 0.5) + (O.vnoise(wx * 0.55, wy * 0.55, seed + 12) - 0.5) * 0.35) * edge; if (cov < 0.42) continue; al = clamp((cov - 0.42) / 0.14, 0, 1); }
      const v = src[q] / 255 + ((O.vnoise(wx * 0.016, wy * 0.016, seed + 13) - 0.5) + (O.vnoise(wx * 0.11, wy * 0.11, seed + 14) - 0.5) * 0.3) * wob;
      let bi = 0; for (let k = 0; k < bands.length; k++) if (v > bands[k]) bi = k + 1;
      const C = cols[Math.min(bi, cols.length - 1)]; let R = C[0], G = C[1], Bc = C[2];
      if (tx) {
        const t = tx[((((wy + toy) | 0) & 511) * 512 + (((wx + tox) | 0) & 511)) * 4] / 255;
        const ov = c0 => { const b = c0 / 255, ovl = b < 0.5 ? 2 * b * t : 1 - 2 * (1 - b) * (1 - t); return (b + (ovl - b) * ta) * 255; };
        R = ov(R); G = ov(G); Bc = ov(Bc);
      }
      od[q] = R; od[q + 1] = G; od[q + 2] = Bc; od[q + 3] = al * 255;
    }
    const OC = O.makeCanvas(bw, bh), oc = OC.getContext('2d'); oc.putImageData(out, 0, 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    if (o.lift) {
      const sh = O.makeCanvas(bw, bh), sg = sh.getContext('2d'); sg.drawImage(OC, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = o.liftColor || '#05060A'; sg.fillRect(0, 0, bw, bh);
      g.filter = `blur(${(o.liftBlur == null ? 10 : o.liftBlur) * res}px)`; g.globalAlpha = o.liftAlpha == null ? 0.6 : o.liftAlpha; g.drawImage(sh, bx0 + o.lift[0] * res, by0 + o.lift[1] * res); g.filter = 'none'; g.globalAlpha = 1;
    }
    g.drawImage(OC, bx0, by0); g.restore();
    return { cv: OC, x: bx0, y: by0, w: bw, h: bh };
  }
  // the lit paper edge on a soft (raster) piece, on the side facing (dx, dy)
  function rcres(g, pc, dx, dy, color, alpha) {
    if (!pc) return; const T = g.getTransform(), res = Math.hypot(T.a, T.b);
    const t = O.makeCanvas(pc.w, pc.h).getContext('2d'); t.drawImage(pc.cv, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = color; t.fillRect(0, 0, pc.w, pc.h);
    t.globalCompositeOperation = 'destination-out'; t.drawImage(pc.cv, -dx * res, -dy * res);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha == null ? 1 : alpha; g.drawImage(t.canvas, pc.x, pc.y); g.restore();
  }
  // draw fn (in g's user space) only where the given pieces are (field pieces or Path2Ds), composited with mode and alpha
  function onPieces(g, list, fn, mode, alpha) {
    const w = g.canvas.width, h = g.canvas.height, T = g.getTransform();
    const L = tmp(w, h, 1); L.setTransform(T); fn(L);
    const M = tmp(w, h, 2);
    for (const p of list) { if (!p) continue; if (p instanceof Path2D) { M.setTransform(T); M.fillStyle = '#fff'; M.fill(p); M.setTransform(1, 0, 0, 1, 0, 0); } else M.drawImage(p.cv, p.x, p.y); }
    L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = 'destination-in'; L.drawImage(M.canvas, 0, 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = mode || 'source-over'; g.globalAlpha = alpha == null ? 1 : alpha; g.drawImage(L.canvas, 0, 0); g.restore();
  }
  // a soft shadow under a path
  function shadow(g, path, dx, dy, blur, alpha, col) { g.save(); g.filter = `blur(${blur}px)`; g.globalAlpha = alpha; g.fillStyle = col || '#05060A'; g.translate(dx, dy); g.fill(path); g.restore(); }
  const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  // ================================================================ end of the paper kit

  // ================================================================ the room, in metres
  // x across the basin wall (his half < 0 < the empty half), y up, z away from the camera; the basin wall is z = 0.
  const B = {
    leftX: -1.05, rightX: 1.05, backZ: -2.6, ceil: 2.4, tile: 0.15,
    cab: { x0: -0.45, x1: 0.45, y0: 1.16, y1: 1.90, z: -0.13 },          // the mirror cabinet: its front is the mirror plane
    shelf: { x0: -0.42, x1: 0.42, y: 1.06, t: 0.016, z0: -0.27 },
    basin: { x0: -0.30, x1: 0.30, z0: -0.46, y: 0.85 },
    window: { x0: 0.64, x1: 1.0, y0: 1.16, y1: 1.90 },                  // frosted, in the basin wall, right of the cabinet
    door: { x0: 0.12, x1: 0.92, y1: 2.04 },                              // the open door behind us, seen only in the mirror
    towel: [-0.76, 1.12],
    glass: [0, 1.06, -0.182], glassR: 0.034, glassH: 0.105,
    hisBrush: { base: [-0.007, 1.069, -0.182], tip: [-0.06, 1.253, -0.192], face: -1 },
    herBrush: { base: [0.008, 1.069, -0.18], tip: [0.064, 1.249, -0.186], face: 1 },
    phone: [0.255, 1.132, -0.172],                // the phone's centre: portrait, on the shelf, its top leaning back against the mirror
    phoneLean: 0.47,                              // radians back from upright
    face: [-0.40, 1.66, -0.55],                   // his face at the basin (the real one); the reflection is mirrored in z
    basinAt: [0, 0.86, -0.24],
  };
  const MZ = B.cab.z, mirrorPt = p => [p[0], p[1], 2 * MZ - p[2]];
  const RCOLS = ['#727D84', '#838E95', '#939EA4', '#A2ACB1'];          // the room as the mirror gives it back: a step darker and colder
  const P = {
    tileHi: '#D2D7D8', tile: '#C0C7CA', tileSh: '#A7B0B5', tileDeep: '#8E989F',
    win: '#D0D5D6', winHi: '#DADEDE', winFrame: '#9EA7AC', winBar: '#9AA3A8',
    mirror: '#7C878E', mirrorHi: '#919CA2', mirrorDeep: '#5E686F', frame: '#B7BEC1', frameSh: '#8D969C',
    shelf: '#BDC4C7', shelfEdge: '#CED4D6', basin: '#C5CBCD', basinSh: '#9AA3A8', basinIn: '#A6AFB4', basinDeep: '#7F8990',
    chrome: '#879197', chromeHi: '#C5CCCF', chromeSh: '#5F696F',
    blue: '#3F6EA8', blueHi: '#6A95C8', blueSh: '#2C507E', bristle: '#C9CFD0', bristleSh: '#A3ABAE',
    grey: '#8A8D8B', greyHi: '#A2A49F', greySh: '#6B6F6E', felt: '#9B9C96', dust: '#BAB9B1',
    towel: '#6D7D8C', towelSh: '#53626F', towelHi: '#8695A2', hall: '#555E65', hallDeep: '#3A4248', doorLeaf: '#A3AAAD',
    foam: '#D2D7D7', foamSh: '#AFB7BA', soap: '#BFB9AF', glow: '#FFC5A0', glowHot: '#FFD9BE',
  };

  // ---------------------------------------------------------------- light cut into bands on a flat surface
  // Every pixel is traced back through the camera onto the plane, so band edges are exact curves on the wall; their scissor wobble
  // is a small warp of the wall's own coordinates (constant in metres). o: {orig, eu, ev, u0,u1,v0,v1, band(u,v) -> 0..n-1, cols, warp, seed}
  function planeBands(g, cam, o) {
    const T = g.getTransform(), res = Math.hypot(T.a, T.b), I = T.inverse(), seed = o.seed || 1, warp = o.warp == null ? 0.018 : o.warp;
    const pt = (u, v) => [o.orig[0] + o.eu[0] * u + o.ev[0] * v, o.orig[1] + o.eu[1] * u + o.ev[1] * v, o.orig[2] + o.eu[2] * u + o.ev[2] * v];
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    [[o.u0, o.v0], [o.u1, o.v0], [o.u1, o.v1], [o.u0, o.v1]].forEach(([u, v]) => { const q = cam.p(pt(u, v)), X = T.a * q[0] + T.c * q[1] + T.e, Y = T.b * q[0] + T.d * q[1] + T.f; bx0 = Math.min(bx0, X); by0 = Math.min(by0, Y); bx1 = Math.max(bx1, X); by1 = Math.max(by1, Y); });
    bx0 = Math.max(0, Math.floor(bx0)); by0 = Math.max(0, Math.floor(by0)); bx1 = Math.min(g.canvas.width, Math.ceil(bx1)); by1 = Math.min(g.canvas.height, Math.ceil(by1));
    const bw = bx1 - bx0, bh = by1 - by0; if (bw < 2 || bh < 2) return;
    const n = [o.eu[1] * o.ev[2] - o.eu[2] * o.ev[1], o.eu[2] * o.ev[0] - o.eu[0] * o.ev[2], o.eu[0] * o.ev[1] - o.eu[1] * o.ev[0]], E = cam.pos;
    const nd0 = n[0] * (o.orig[0] - E[0]) + n[1] * (o.orig[1] - E[1]) + n[2] * (o.orig[2] - E[2]);
    const out = new ImageData(bw, bh), od = out.data, cols = o.cols.map(h => O.hexToRgb(h)), nc = cols.length;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const dx = x + bx0 + 0.5, dy = y + by0 + 0.5, sx = I.a * dx + I.c * dy + I.e, sy = I.b * dx + I.d * dy + I.f, r = cam.ray(sx, sy);
      const den = n[0] * r[0] + n[1] * r[1] + n[2] * r[2]; if (Math.abs(den) < 1e-6) continue; const t = nd0 / den; if (t <= 0) continue;
      const Px = E[0] + r[0] * t - o.orig[0], Py = E[1] + r[1] * t - o.orig[1], Pz = E[2] + r[2] * t - o.orig[2];
      let u = Px * o.eu[0] + Py * o.eu[1] + Pz * o.eu[2], v = Px * o.ev[0] + Py * o.ev[1] + Pz * o.ev[2];
      if (u < o.u0 || u > o.u1 || v < o.v0 || v > o.v1) continue;
      u += (O.vnoise(u * 7, v * 7, seed) - 0.5) * warp + (O.vnoise(u * 41, v * 41, seed + 1) - 0.5) * warp * 0.3; v += (O.vnoise(u * 7 + 31, v * 7, seed + 2) - 0.5) * warp;
      const C = cols[clamp(Math.round(o.band(u, v)), 0, nc - 1)], q = (y * bw + x) * 4; od[q] = C[0]; od[q + 1] = C[1]; od[q + 2] = C[2]; od[q + 3] = 255;
    }
    const OC = O.makeCanvas(bw, bh); OC.getContext('2d').putImageData(out, 0, 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(OC, bx0, by0); g.restore();
  }
  // ---------------------------------------------------------------- tile paper: a wall of square tiles, its light cut into bands
  // wall: { pt(u, v) -> world point, u0, u1, v0, v1 }; band(u, v) -> 0 (shade) .. 3 (lit); cols: 4 tones dark..light
  function tileWall(g, cam, wall, band, cols, seed, o) {
    o = o || {}; const ts = o.tile || B.tile, k = cam.k(...wall.pt((wall.u0 + wall.u1) / 2, (wall.v0 + wall.v1) / 2));
    const outline = cam.xy([wall.pt(wall.u0, wall.v0), wall.pt(wall.u1, wall.v0), wall.pt(wall.u1, wall.v1), wall.pt(wall.u0, wall.v1)]), path = poly(outline).path(0, 1);
    g.save(); g.clip(path);
    // the light, cut into bands (band(u, v) runs 0 .. cols.length - 1)
    planeBands(g, cam, { orig: wall.orig, eu: wall.eu, ev: wall.ev, u0: wall.u0, u1: wall.u1, v0: wall.v0, v1: wall.v1, band, cols, seed });
    // each tile its own sheet: a faint shift of tone
    const r = O.rng('tiles' + seed);
    for (let u = Math.floor(wall.u0 / ts) * ts; u < wall.u1; u += ts) for (let v = Math.floor(wall.v0 / ts) * ts; v < wall.v1; v += ts) {
      const q = cam.xy([wall.pt(u, v), wall.pt(u + ts, v), wall.pt(u + ts, v + ts), wall.pt(u, v + ts)]), a = r();
      const tn = o.tint == null ? 1 : o.tint; g.fillStyle = a < 0.5 ? `rgba(255,255,255,${(0.03 + r() * 0.04) * tn})` : `rgba(40,50,58,${(0.03 + r() * 0.05) * tn})`; g.beginPath(); q.forEach((p, m) => m ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill();
    }
    GG.texture(g, path, o.tex == null ? 0.5 : o.tex, seed, 'card');
    // the grout: a dark cut, each tile's lit lip above and left of it
    const gw = Math.max(1.2, 0.0032 * k), lw = Math.max(0.8, 0.0016 * k);
    const lineAt = (a, b, col, w, off) => { const q = cam.xy([a, b]); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(q[0][0] + off[0], q[0][1] + off[1]); g.lineTo(q[1][0] + off[0], q[1][1] + off[1]); g.stroke(); };
    for (let u = Math.ceil(wall.u0 / ts) * ts; u < wall.u1; u += ts) { lineAt(wall.pt(u, wall.v0), wall.pt(u, wall.v1), 'rgba(60,70,78,0.42)', gw, [0, 0]); lineAt(wall.pt(u, wall.v0), wall.pt(u, wall.v1), 'rgba(236,238,236,0.3)', lw, [gw * 0.9, 0]); }
    for (let v = Math.ceil(wall.v0 / ts) * ts; v < wall.v1; v += ts) { lineAt(wall.pt(wall.u0, v), wall.pt(wall.u1, v), 'rgba(60,70,78,0.42)', gw, [0, 0]); lineAt(wall.pt(wall.u0, v), wall.pt(wall.u1, v), 'rgba(236,238,236,0.3)', lw, [0, gw * 0.9]); }
    g.restore();
    return path;
  }
  const wallOf = (orig, eu, ev, u0, u1, v0, v1) => ({ orig, eu, ev, u0, u1, v0, v1, pt: (u, v) => [orig[0] + eu[0] * u + ev[0] * v, orig[1] + eu[1] * u + ev[1] * v, orig[2] + eu[2] * u + ev[2] * v] });
  const backWall = wallOf([0, 0, 0], [1, 0, 0], [0, 1, 0], B.leftX, B.rightX, 0, B.ceil);
  // the light: the window is right of the cabinet; the wall is brightest about it, falling away left and low (his half in shade)
  // the basin wall: mid tone, a step lighter toward the window side, a step darker on his side and under the basin
  const wallBand = (u, v) => 2.0 + 0.72 * clamp((u - 0.02) / 0.5, -1, 1) - Math.max(0, 0.95 - v) * 1.6 - Math.max(0, v - 2.05) * 1.5;
  // his side wall takes the window's light straight on: a cut patch of it, brightest, the rest mid
  const leftBand = (u, v) => (u > -1.75 && u < -0.55 && v > 0.95 + (u + 1.75) * 0.25 && v < 2.0 + (u + 1.75) * 0.15) ? 3 : 1.6 - Math.max(0, 0.9 - v) * 1.2;
  const cols4 = [P.tileDeep, P.tileSh, P.tile, P.tileHi];

  // ---------------------------------------------------------------- the toothbrushes (3D: a handle, a neck, a head and its tuft)
  // b: {base, tip, face (-1 left, 1 right: the side the bristles face)}; o: {dusty, alpha}
  function brush(g, cam, b, o) {
    o = o || {}; const A = b.base, T = b.tip, L = Math.hypot(T[0] - A[0], T[1] - A[1], T[2] - A[2]), d = [(T[0] - A[0]) / L, (T[1] - A[1]) / L, (T[2] - A[2]) / L];
    const at = s => [A[0] + d[0] * s, A[1] + d[1] * s, A[2] + d[2] * s], k = cam.k(...at(L * 0.6));
    const side = [d[1] * b.face, -d[0] * b.face, 0], sl = Math.hypot(side[0], side[1]) || 1; side[0] /= sl; side[1] /= sl;       // in the picture plane, perpendicular to the handle
    const off = (p, s) => [p[0] + side[0] * s, p[1] + side[1] * s, p[2]];
    const dusty = !!o.dusty, cH = dusty ? P.grey : P.blue, cHi = dusty ? P.greyHi : P.blueHi, cSh = dusty ? P.greySh : P.blueSh;
    const q = s => { const r = cam.p(at(s)); return [r[0], r[1]]; };
    // the handle: wide grip, a slim neck, the head
    const segs = [[0, 0.0062], [L * 0.5, 0.0068], [L * 0.62, 0.005], [L * 0.76, 0.0032], [L * 0.8, 0.0036], [L, 0.0042]];
    const left = [], right = [];
    segs.forEach(([s, r]) => { const p = q(s), dir2 = [q(Math.min(L, s + 0.002))[0] - q(Math.max(0, s - 0.002))[0], q(Math.min(L, s + 0.002))[1] - q(Math.max(0, s - 0.002))[1]], dl = Math.hypot(dir2[0], dir2[1]) || 1, nx = -dir2[1] / dl, ny = dir2[0] / dl, rr = r * k; left.push([p[0] + nx * rr, p[1] + ny * rr]); right.unshift([p[0] - nx * rr, p[1] - ny * rr]); });
    const hp = GG.blob(left.concat(right).map((p, i, a) => [p[0], p[1], i === 0 || i === a.length - 1 || i === left.length - 1 || i === left.length ? 1 : 0])).path(dusty ? 0.9 : 0.5, dusty ? 811 : 801);
    if (o.shadow !== false) shadow(g, hp, -0.01 * k, 0.006 * k, Math.max(2, 0.004 * k), dusty ? 0.3 : 0.35, '#3A444C');
    GG.piece(g, hp, { fill: cH, tex: dusty ? 0.55 : 0.35, kind: 'card', seed: dusty ? 812 : 802 });
    cres(g, hp, side[0] < 0 ? 0.0025 * k : -0.0025 * k, -0.0015 * k, cHi, 0.85);
    // a grip stripe on his; a film of dust along the top of hers
    if (!dusty) { const s1 = cam.xy([off(at(L * 0.12), 0), off(at(L * 0.42), 0)]); g.strokeStyle = 'rgba(214,226,236,0.55)'; g.lineWidth = Math.max(1.5, 0.0022 * k); g.lineCap = 'round'; g.beginPath(); g.moveTo(s1[0][0], s1[0][1]); g.lineTo(s1[1][0], s1[1][1]); g.stroke(); }
    else onPieces(g, [hp], t => { const s1 = cam.xy([off(at(0), -0.004), off(at(L), -0.003)]); t.strokeStyle = 'rgba(190,188,180,0.55)'; t.lineWidth = Math.max(1.5, 0.0022 * k); t.beginPath(); t.moveTo(s1[0][0], s1[0][1]); t.lineTo(s1[1][0], s1[1][1]); t.stroke(); });
    // the tuft: a block of bristles standing off the head toward its face
    const h0 = L * 0.8, h1 = L * 0.995, tuft = cam.xy([off(at(h0), 0.003), off(at(h1), 0.003), off(at(h1), 0.016 + (dusty ? 0.002 : 0.003)), off(at(h0 + 0.002), dusty ? 0.017 : 0.019)]);
    const tp = poly(tuft).path(dusty ? 2.4 : 0.8, dusty ? 813 : 803);
    GG.piece(g, tp, { fill: dusty ? P.felt : P.bristle, tex: dusty ? 0.8 : 0.4, kind: dusty ? 'wool' : 'card', seed: dusty ? 814 : 804 });
    if (!dusty) {
      onPieces(g, [tp], t => { for (let i = 0; i < 5; i++) { const s0 = lerp(h0, h1, (i + 0.5) / 5), a2 = cam.xy([off(at(s0), 0.004), off(at(s0), 0.018)]); t.strokeStyle = i % 2 ? 'rgba(98,144,196,0.75)' : 'rgba(150,160,166,0.5)'; t.lineWidth = Math.max(1.5, 0.0022 * k); t.beginPath(); t.moveTo(a2[0][0], a2[0][1]); t.lineTo(a2[1][0], a2[1][1]); t.stroke(); } });
      cres(g, tp, 0, -0.002 * k, '#D6DBDC', 0.8);
    } else {
      // the dust: a pale fur on the bristles, flecks, a few loose fibres standing off it
      cres(g, tp, side[0] * 0.003 * k, -0.002 * k, P.dust, 0.9);
      const r = O.rng('dusty'); g.save(); g.lineCap = 'round';
      for (let i = 0; i < 40; i++) { const s0 = lerp(h0 - 0.004, h1 + 0.002, r()), w0 = lerp(0.002, 0.022, r()), p = cam.p(off(at(s0), w0)); g.fillStyle = r() < 0.7 ? 'rgba(200,198,190,0.75)' : 'rgba(110,112,108,0.5)'; g.beginPath(); g.arc(p[0], p[1], Math.max(0.6, (0.0004 + r() * 0.0008) * k), 0, 7); g.fill(); }
      for (let i = 0; i < 14; i++) { const s0 = lerp(h0, h1, r()), p = cam.p(off(at(s0), 0.017 + r() * 0.003)), an = Math.atan2(side[1], side[0]) * 0 + (r() - 0.5) * 2.4 - Math.PI / 2, l = (0.003 + r() * 0.005) * k; g.strokeStyle = 'rgba(206,204,196,0.6)'; g.lineWidth = Math.max(0.6, 0.0005 * k); g.beginPath(); g.moveTo(p[0], p[1]); g.quadraticCurveTo(p[0] + Math.cos(an) * l * 0.5 + 1, p[1] + Math.sin(an) * l * 0.5, p[0] + Math.cos(an) * l, p[1] + Math.sin(an) * l); g.stroke(); }
      g.restore();
    }
    return { handle: hp, tuft: tp };
  }
  // the glass: back wall first (behind the handles), its front after; translucent cut paper, a thick base, a dried ring
  function glassBack(g, cam, C) {
    const r = B.glassR, h = B.glassH, k = cam.k(C[0], C[1] + h / 2, C[2]);
    const ring = (y, rr, n) => { const p = []; for (let i = 0; i < (n || 32); i++) { const a = i / (n || 32) * Math.PI * 2; p.push([C[0] + Math.cos(a) * rr, C[1] + y, C[2] + Math.sin(a) * rr]); } return cam.xy(p); };
    const body = poly(hull(ring(0, r * 0.94).concat(ring(h, r)))).path(0.5, 821);
    shadow(g, body, -0.012 * k, 0.004 * k, 0.006 * k, 0.28, '#3A444C');
    g.save(); g.fillStyle = 'rgba(150,166,174,0.32)'; g.fill(body); g.restore();
    // the inside of the far wall, seen through the near one
    const backHalf = poly(ring(h, r * 0.9).slice(16).concat(ring(0.012, r * 0.86).slice(16).reverse())).path(0.4, 822);
    g.save(); g.fillStyle = 'rgba(120,136,146,0.25)'; g.fill(backHalf); g.restore();
    return body;
  }
  function glassFront(g, cam, C) {
    const r = B.glassR, h = B.glassH, k = cam.k(C[0], C[1] + h / 2, C[2]);
    const ring = (y, rr, a0, a1, n) => { const p = []; n = n || 24; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); p.push([C[0] + Math.cos(a) * rr, C[1] + y, C[2] + Math.sin(a) * rr]); } return cam.xy(p); };
    // the thick base, a dried water ring in it
    const base = poly(ring(0, r * 0.94, Math.PI, Math.PI * 2).concat(ring(0.012, r * 0.93, Math.PI * 2, Math.PI).reverse().reverse())).path(0.3, 823);
    g.save(); g.fillStyle = 'rgba(160,176,184,0.4)'; g.fill(poly(hull(ring(0, r * 0.94, 0, Math.PI * 2).concat(ring(0.012, r * 0.93, 0, Math.PI * 2)))).path(0.3, 824)); g.restore();
    g.save(); g.strokeStyle = 'rgba(206,210,206,0.55)'; g.lineWidth = Math.max(1, 0.0015 * k); g.stroke(poly(ring(0.013, r * 0.8, 0, Math.PI * 2)).path(0.6, 825)); g.restore();
    // the near wall: a faint pane, two cut highlights (the window is to the right), the rim
    const near = poly(ring(h, r, 0, -Math.PI).concat(ring(0, r * 0.94, -Math.PI, 0))).path(0.4, 826);
    g.save(); g.fillStyle = 'rgba(178,192,198,0.18)'; g.fill(near); g.restore();
    const hiA = cam.xy([[C[0] + r * 0.62, C[1] + 0.012, C[2] - r * 0.78], [C[0] + r * 0.62, C[1] + h - 0.006, C[2] - r * 0.78]]), hiB = cam.xy([[C[0] + r * 0.88, C[1] + 0.02, C[2] - r * 0.47], [C[0] + r * 0.88, C[1] + h - 0.012, C[2] - r * 0.47]]);
    g.save(); g.lineCap = 'round'; g.strokeStyle = 'rgba(222,228,228,0.7)'; g.lineWidth = Math.max(2, 0.005 * k); g.beginPath(); g.moveTo(hiA[0][0], hiA[0][1]); g.lineTo(hiA[1][0], hiA[1][1]); g.stroke();
    g.strokeStyle = 'rgba(222,228,228,0.45)'; g.lineWidth = Math.max(1, 0.002 * k); g.beginPath(); g.moveTo(hiB[0][0], hiB[0][1]); g.lineTo(hiB[1][0], hiB[1][1]); g.stroke();
    const sideL = cam.xy([[C[0] - r, C[1] + 0.006, C[2]], [C[0] - r, C[1] + h, C[2]]]), sideR = cam.xy([[C[0] + r, C[1] + 0.006, C[2]], [C[0] + r, C[1] + h, C[2]]]);
    g.strokeStyle = 'rgba(110,124,134,0.5)'; g.lineWidth = Math.max(1, 0.0018 * k); g.beginPath(); g.moveTo(sideL[0][0], sideL[0][1]); g.lineTo(sideL[1][0], sideL[1][1]); g.stroke();
    g.strokeStyle = 'rgba(214,222,224,0.6)'; g.beginPath(); g.moveTo(sideR[0][0], sideR[0][1]); g.lineTo(sideR[1][0], sideR[1][1]); g.stroke();
    g.strokeStyle = 'rgba(214,222,224,0.8)'; g.lineWidth = Math.max(1.2, 0.0022 * k); g.stroke(poly(ring(h, r, 0, Math.PI * 2, 40)).path(0.3, 827));
    g.restore();
  }
  // the shelf under the cabinet: its top, its lit front lip, its shadow on the tiles
  function shelf(g, cam) {
    const s = B.shelf, k = cam.k(0, s.y, s.z0);
    const top = quad(g, cam, [[s.x0, s.y, s.z0], [s.x1, s.y, s.z0], [s.x1, s.y, 0], [s.x0, s.y, 0]], { fill: P.shelf, rough: 0.4, seed: 831, tex: 0.4, kind: 'card' });
    const sh = cam.xy([[s.x0, s.y - s.t, 0], [s.x1, s.y - s.t, 0], [s.x1 - 0.02, s.y - s.t - 0.05, 0], [s.x0 - 0.06, s.y - s.t - 0.06, 0]]); g.save(); g.filter = `blur(${Math.max(3, 0.01 * k)}px)`; g.globalAlpha = 0.35; g.fillStyle = '#3E4850'; g.fill(poly(sh).path(0, 1)); g.restore();
    const lip = quad(g, cam, [[s.x0, s.y - s.t, s.z0], [s.x1, s.y - s.t, s.z0], [s.x1, s.y, s.z0], [s.x0, s.y, s.z0]], { fill: P.shelfEdge, rough: 0.3, seed: 832, tex: 0.3, kind: 'card' });
    cres(g, lip, 0, -0.002 * k, '#DADFE0', 0.6);
    return top;
  }
  // his things on his half of the shelf: a razor, a squeezed tube of toothpaste
  function shelfThings(g, cam) {
    const y = B.shelf.y, k = cam.k(-0.2, y, -0.12);
    const tube = cam.xy([[-0.30, y + 0.002, -0.1], [-0.16, y + 0.002, -0.13], [-0.155, y + 0.018, -0.13], [-0.30, y + 0.012, -0.1]]);
    const tp = GG.piece(g, poly(tube).path(0.8, 841), { fill: '#C8CDCF', tex: 0.4, kind: 'card', seed: 842, lift: [-0.006 * k, 0.003 * k], liftAlpha: 0.35, liftBlur: 4 });
    cres(g, tp, 0, -0.002 * k, '#D8DCDD', 0.7);
    const cap = cam.xy([[-0.16, y + 0.002, -0.13], [-0.14, y + 0.002, -0.135], [-0.14, y + 0.02, -0.135], [-0.16, y + 0.02, -0.13]]); GG.piece(g, poly(cap).path(0.4, 843), { fill: '#3F6EA8', tex: 0.3, seed: 844 });
    const band = cam.xy([[-0.27, y + 0.004, -0.106], [-0.22, y + 0.004, -0.116], [-0.22, y + 0.015, -0.116], [-0.27, y + 0.013, -0.106]]); g.fillStyle = 'rgba(63,110,168,0.6)'; g.fill(poly(band).path(0.3, 845));
    const razor = cam.xy([[-0.36, y + 0.004, -0.2], [-0.24, y + 0.004, -0.22], [-0.24, y + 0.014, -0.22], [-0.36, y + 0.012, -0.2]]);
    GG.piece(g, poly(razor).path(0.5, 846), { fill: '#3B4248', tex: 0.3, seed: 847, lift: [-0.006 * k, 0.003 * k], liftAlpha: 0.35, liftBlur: 4 });
    const rh = cam.xy([[-0.245, y + 0.004, -0.235], [-0.215, y + 0.004, -0.235], [-0.215, y + 0.022, -0.21], [-0.245, y + 0.022, -0.21]]); GG.piece(g, poly(rh).path(0.4, 848), { fill: P.chrome, tex: 0.3, seed: 849 });
  }
  // the reflected room in the mirror: the wall behind us (tiles, the towel rail), the open door and the dark hall, his-side wall
  function reflectedRoom(g, cam, clip) {
    g.save(); g.clip(clip);
    g.fillStyle = P.mirrorDeep; g.fillRect(-MG, -MG, W + 2 * MG, H + 2 * MG);
    const back = wallOf([0, 0, 2 * MZ - B.backZ], [1, 0, 0], [0, 1, 0], B.leftX, B.rightX, 0, B.ceil);
    const band = (u, v) => 2.0 + 0.8 * clamp((u + 0.1) / 0.6, -1, 1) - Math.max(0, 0.9 - v) * 1.2;
    tileWall(g, cam, back, band, RCOLS, 851, { cells: 32, tex: 0.4, tint: 0.35 });
    // the side walls, seen in the glass
    [[B.leftX, 1], [B.rightX, 2]].forEach(([x, bb], i) => { const w = wallOf([x, 0, 2 * MZ], [0, 0, -1], [0, 1, 0], B.backZ, MZ, 0, B.ceil); tileWall(g, cam, w, () => bb, RCOLS, 852 + i, { cells: 16, tex: 0.4, tint: 0.35 }); });
    // the open door, the hall beyond it: dark, one cut band of grey from a window somewhere along it
    const d = B.door, dq = cam.xy([mirrorPt([d.x0, 0, B.backZ]), mirrorPt([d.x1, 0, B.backZ]), mirrorPt([d.x1, d.y1, B.backZ]), mirrorPt([d.x0, d.y1, B.backZ])]);
    const dp = GG.piece(g, poly(dq).path(0.6, 853), { fill: P.hallDeep, tex: 0.5, seed: 854, kind: 'card' });
    onPieces(g, [dp], t => { const q = cam.xy([mirrorPt([d.x0 + 0.3, 0, B.backZ - 1.2]), mirrorPt([d.x1 + 0.4, 0, B.backZ - 1.2]), mirrorPt([d.x1 + 0.4, 2.2, B.backZ - 1.2]), mirrorPt([d.x0 + 0.5, 2.2, B.backZ - 1.2])]); t.fillStyle = P.hall; t.fill(poly(q).path(2, 855)); });
    const leaf = cam.xy([mirrorPt([d.x1, 0, B.backZ]), mirrorPt([d.x1 + 0.08, 0, B.backZ + 0.55]), mirrorPt([d.x1 + 0.08, d.y1, B.backZ + 0.55]), mirrorPt([d.x1, d.y1, B.backZ])]);
    GG.piece(g, poly(leaf).path(0.6, 856), { fill: '#7E888E', tex: 0.5, seed: 857, kind: 'card' });
    [[d.x0 - 0.05, d.x0], [d.x1, d.x1 + 0.05]].forEach(([a, b2], i) => { const q = cam.xy([mirrorPt([a, 0, B.backZ + 0.002]), mirrorPt([b2, 0, B.backZ + 0.002]), mirrorPt([b2, d.y1 + 0.05, B.backZ + 0.002]), mirrorPt([a, d.y1 + 0.05, B.backZ + 0.002])]); GG.piece(g, poly(q).path(0.4, 858 + i), { fill: '#8C969C', tex: 0.4, seed: 860 + i }); });
    g.restore();
  }
  // a cold veil and a streak of sheen over everything in the mirror (cut paper: the glass is real)
  function mirrorVeil(g, cam, clip, strength) {
    g.save(); g.clip(clip);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(196,208,214,' + (0.55 * strength) + ')'; g.fill(clip);
    g.globalCompositeOperation = 'screen';
    const c0 = cam.p(B.cab.x1, B.cab.y1, MZ), c1 = cam.p(B.cab.x0, B.cab.y0, MZ), w = c0[0] - c1[0];
    const streak = O.S().poly([[c1[0] + w * 0.58, c0[1] - 20], [c1[0] + w * 0.70, c0[1] - 20], [c1[0] + w * 0.44, c1[1] + 20], [c1[0] + w * 0.32, c1[1] + 20]]).path(2.5, 871);
    g.fillStyle = 'rgba(170,184,192,' + (0.16 * strength) + ')'; g.fill(streak);
    const st2 = O.S().poly([[c1[0] + w * 0.74, c0[1] - 20], [c1[0] + w * 0.77, c0[1] - 20], [c1[0] + w * 0.51, c1[1] + 20], [c1[0] + w * 0.48, c1[1] + 20]]).path(1.5, 872);
    g.fillStyle = 'rgba(170,184,192,' + (0.12 * strength) + ')'; g.fill(st2);
    g.restore();
  }
  // the cabinet's two mirrored doors: the glass regions (the clip for reflections) and their frames
  function doorGlass(cam) {
    const c = B.cab, p = new Path2D();
    [[c.x0 + 0.014, -0.006], [0.006, c.x1 - 0.014]].forEach(([a, b2]) => p.addPath(poly(cam.xy([[a, c.y0 + 0.014, MZ], [b2, c.y0 + 0.014, MZ], [b2, c.y1 - 0.014, MZ], [a, c.y1 - 0.014, MZ]])).path(0, 1)));
    return p;
  }
  function cabinetFrames(g, cam) {
    const c = B.cab, k = cam.k(0, 1.5, MZ);
    [[c.x0, -0.002], [0.002, c.x1]].forEach(([a, b2], i) => {
      const f = 0.014, strips = [[a, b2, c.y1 - f, c.y1], [a, b2, c.y0, c.y0 + f], [a, a + f, c.y0, c.y1], [b2 - f, b2, c.y0, c.y1]];
      strips.forEach(([x0, x1, y0, y1], j) => { const fr = quad(g, cam, [[x0, y0, MZ - 0.003], [x1, y0, MZ - 0.003], [x1, y1, MZ - 0.003], [x0, y1, MZ - 0.003]], { fill: j === 1 ? P.frameSh : j === 3 && i === 1 ? '#C9CFD1' : P.frame, rough: 0.2, tex: 0.35, kind: 'card', seed: 885 + i * 4 + j, lift: [-2, 2], liftAlpha: 0.35, liftBlur: 3 }); if (j === 0) cres(g, fr, 0, -0.002 * k, '#D0D6D8', 0.7); });
    });
    // the seam between the doors (the centre line), the cabinet's shadow on the tiles below it
    line3(g, cam, [[0, c.y0, MZ - 0.001], [0, c.y1, MZ - 0.001]], 'rgba(40,48,54,0.7)', Math.max(1.5, 0.004 * k));
  }
  // the frosted window right of the cabinet: its reveal, the frosted panes, the bar, the sill
  function frostedWindow(g, cam) {
    const w = B.window, k = cam.k((w.x0 + w.x1) / 2, 1.5, 0), dz = 0.11;
    vqs(g, cam, [-1, 0, 0], [[w.x1, w.y0, 0], [w.x1, w.y0, dz], [w.x1, w.y1, dz], [w.x1, w.y1, 0]], { fill: P.tile, rough: 0.4, seed: 891, tex: 0.4, kind: 'card' });
    vqs(g, cam, [0, -1, 0], [[w.x0, w.y1, 0], [w.x1, w.y1, 0], [w.x1, w.y1, dz], [w.x0, w.y1, dz]], { fill: P.tileSh, rough: 0.4, seed: 892, tex: 0.4, kind: 'card' });
    const glass = quad(g, cam, [[w.x0, w.y0, dz], [w.x1, w.y0, dz], [w.x1, w.y1, dz], [w.x0, w.y1, dz]], { fill: P.win, rough: 0.3, seed: 893, tex: 0.35, kind: 'paper' });
    // the frosted glass: brighter at the top, a soft cut band of the sky; nothing to see through it
    onPieces(g, [glass], t => { const q = cam.xy([[w.x0, w.y0 + 0.42, dz], [w.x1, w.y0 + 0.36, dz], [w.x1, w.y1, dz], [w.x0, w.y1, dz]]); t.fillStyle = P.winHi; t.fill(poly(q).path(3, 894)); const q2 = cam.xy([[w.x0, w.y0, dz], [w.x1, w.y0, dz], [w.x1, w.y0 + 0.14, dz], [w.x0, w.y0 + 0.18, dz]]); t.fillStyle = '#B9C0C3'; t.fill(poly(q2).path(2, 895)); });
    const fr = (pts, s) => quad(g, cam, pts, { fill: P.winFrame, rough: 0.3, seed: s, tex: 0.3, kind: 'card' });
    fr([[w.x0, w.y0, dz - 0.002], [w.x1, w.y0, dz - 0.002], [w.x1, w.y0 + 0.035, dz - 0.002], [w.x0, w.y0 + 0.035, dz - 0.002]], 896);
    fr([[w.x0, w.y1 - 0.035, dz - 0.002], [w.x1, w.y1 - 0.035, dz - 0.002], [w.x1, w.y1, dz - 0.002], [w.x0, w.y1, dz - 0.002]], 897);
    fr([[w.x0, w.y0, dz - 0.002], [w.x0 + 0.035, w.y0, dz - 0.002], [w.x0 + 0.035, w.y1, dz - 0.002], [w.x0, w.y1, dz - 0.002]], 898);
    fr([[w.x1 - 0.035, w.y0, dz - 0.002], [w.x1, w.y0, dz - 0.002], [w.x1, w.y1, dz - 0.002], [w.x1 - 0.035, w.y1, dz - 0.002]], 899);
    fr([[w.x0, (w.y0 + w.y1) / 2 + 0.06, dz - 0.004], [w.x1, (w.y0 + w.y1) / 2 + 0.06, dz - 0.004], [w.x1, (w.y0 + w.y1) / 2 + 0.09, dz - 0.004], [w.x0, (w.y0 + w.y1) / 2 + 0.09, dz - 0.004]], 900);
    const handle = cam.xy([[w.x1 - 0.06, (w.y0 + w.y1) / 2 + 0.02, dz - 0.02], [w.x1 - 0.045, (w.y0 + w.y1) / 2 + 0.02, dz - 0.02], [w.x1 - 0.045, (w.y0 + w.y1) / 2 + 0.1, dz - 0.02], [w.x1 - 0.06, (w.y0 + w.y1) / 2 + 0.1, dz - 0.02]]); GG.piece(g, poly(handle).path(0.3, 901), { fill: P.chrome, tex: 0.3, seed: 902 });
    const sill = quad(g, cam, [[w.x0 - 0.03, w.y0, -0.05], [w.x1 + 0.03, w.y0, -0.05], [w.x1 + 0.03, w.y0, dz], [w.x0 - 0.03, w.y0, dz]], { fill: P.tileHi, rough: 0.3, seed: 903, tex: 0.3, kind: 'card', lift: [0, 0.008 * k], liftAlpha: 0.4, liftBlur: 6 });
    quad(g, cam, [[w.x0 - 0.03, w.y0 - 0.018, -0.05], [w.x1 + 0.03, w.y0 - 0.018, -0.05], [w.x1 + 0.03, w.y0, -0.05], [w.x0 - 0.03, w.y0, -0.05]], { fill: P.tile, rough: 0.3, seed: 904, tex: 0.3, kind: 'card' });
  }
  const vqs = (g, cam, n, pts, o) => cam.sees(n, pts[0]) ? quad(g, cam, pts, o) : null;
  // the basin: its rim and bowl (seen from above), the front apron, the pedestal, the tap; foam when he has been brushing
  function sup(cx, cz, hx, hz, y, n, p2) { const pts = []; n = n || 48; p2 = p2 || 2.8; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); pts.push([cx + Math.sign(c) * Math.pow(Math.abs(c), 2 / p2) * hx, y, cz + Math.sign(s) * Math.pow(Math.abs(s), 2 / p2) * hz]); } return pts; }
  function basin(g, cam, foam) {
    const b = B.basin, cx = 0, cz = (b.z0 + 0) / 2, hx = (b.x1 - b.x0) / 2, hz = -b.z0 / 2, k = cam.k(0, b.y, cz);
    // the pedestal
    const ped = cam.xy([[-0.085, 0, -0.2], [0.085, 0, -0.2], [0.07, b.y - 0.12, -0.24], [-0.07, b.y - 0.12, -0.24]]);
    const pp = GG.piece(g, poly(ped).path(0.6, 911), { fill: P.basinSh, tex: 0.4, kind: 'card', seed: 912, lift: [-0.01 * k, 0], liftAlpha: 0.3, liftBlur: 8 }); cres(g, pp, -0.006 * k, 0, P.basin, 0.8);
    // the apron (the basin's outside, from the rim down)
    const rim = sup(cx, cz, hx, hz, b.y), low = sup(cx, cz + 0.02, hx * 0.86, hz * 0.8, b.y - 0.13);
    const ap = poly(hull(cam.xy(rim).concat(cam.xy(low)))).path(0.6, 913);
    shadow(g, ap, -0.02 * k, 0.03 * k, 0.03 * k, 0.3, '#3E4850');
    GG.piece(g, ap, { fill: P.basinSh, tex: 0.45, kind: 'card', seed: 914 });
    cres(g, ap, 0.012 * k, 0, P.basin, 0.85);
    // the rim, the bowl in it, the drain
    const rp = GG.piece(g, poly(cam.xy(rim)).path(0.4, 915), { fill: P.basin, tex: 0.4, kind: 'card', seed: 916 });
    cres(g, rp, 0, -0.004 * k, '#D3D8D9', 0.7);
    const bowl = poly(cam.xy(sup(cx, cz - 0.01, hx * 0.82, hz * 0.76, b.y))).path(0.4, 917);
    GG.piece(g, bowl, { fill: P.basinIn, tex: 0.4, kind: 'card', seed: 918 });
    onPieces(g, [bowl], t => { const q = cam.xy(sup(cx, cz + 0.04, hx * 0.9, hz * 0.7, b.y - 0.1)); t.fillStyle = P.basinSh; t.fill(poly(q).path(1.2, 919)); const q2 = cam.xy(sup(cx + 0.04, cz + 0.06, hx * 0.6, hz * 0.45, b.y - 0.13)); t.fillStyle = '#8E989E'; t.fill(poly(q2).path(1.5, 920)); });
    const dr = cam.p(0, b.y - 0.13, cz + 0.02); g.fillStyle = '#4E585F'; g.beginPath(); g.ellipse(dr[0], dr[1], 0.02 * k, 0.012 * k, 0, 0, 7); g.fill(); g.strokeStyle = P.chromeHi; g.lineWidth = Math.max(1, 0.003 * k); g.stroke();
    if (foam) {
      const r = O.rng('foam');
      [[0.02, 0.03, 0.03], [-0.05, 0.05, 0.018], [0.07, 0.0, 0.014], [0.0, -0.04, 0.012], [-0.02, 0.01, 0.022]].forEach(([dx2, dz2, rr], i) => {
        const fp = cam.xy(sup(dx2, cz + 0.02 + dz2, rr * 1.3, rr, b.y - 0.12 + 0.004, 18, 2)); const p2 = GG.piece(g, poly(fp).path(1.2, 921 + i), { fill: P.foam, tex: 0.35, kind: 'paper', seed: 930 + i });
        cres(g, p2, 0.003 * k, 0.003 * k, P.foamSh, 0.8);
      });
    }
    // the soap on the rim's right corner
    const so = cam.xy(sup(0.21, -0.06, 0.035, 0.022, b.y + 0.012, 20, 3)), sb = cam.xy(sup(0.21, -0.06, 0.035, 0.022, b.y + 0.001, 20, 3));
    const sp = GG.piece(g, poly(hull(so.concat(sb))).path(0.5, 940), { fill: P.soap, tex: 0.4, seed: 941, lift: [-0.006 * k, 0.004 * k], liftAlpha: 0.3, liftBlur: 4 }); cres(g, sp, 0, -0.002 * k, '#CFC9BF', 0.8);
    // the tap: a column at the back, its spout, its lever
    const TH = 0.075, col = cam.xy([[-0.016, b.y, -0.05], [0.016, b.y, -0.05], [0.016, b.y + TH, -0.05], [-0.016, b.y + TH, -0.05]]);
    const cp = GG.piece(g, poly(col).path(0.3, 942), { fill: P.chrome, tex: 0.25, seed: 943, lift: [-0.008 * k, 0.004 * k], liftAlpha: 0.35, liftBlur: 5 });
    cres(g, cp, -0.004 * k, 0, P.chromeHi, 0.9);
    const spout = cam.xy([[-0.012, b.y + TH, -0.05], [0.012, b.y + TH, -0.05], [0.01, b.y + TH - 0.012, -0.16], [-0.01, b.y + TH - 0.012, -0.16], [-0.01, b.y + TH - 0.026, -0.16], [-0.012, b.y + TH - 0.024, -0.05]]);
    const spp = GG.piece(g, poly(spout).path(0.3, 944), { fill: P.chrome, tex: 0.25, seed: 945 }); cres(g, spp, 0, -0.002 * k, P.chromeHi, 0.9);
    const lever = cam.xy([[-0.01, b.y + TH, -0.04], [0.01, b.y + TH, -0.04], [0.008, b.y + TH + 0.045, -0.005], [-0.008, b.y + TH + 0.045, -0.005]]); GG.piece(g, poly(lever).path(0.3, 946), { fill: P.chromeSh, tex: 0.25, seed: 947 });
  }
  // his towel on a ring, his half of the wall
  function towel(g, cam) {
    const [x, y] = B.towel, k = cam.k(x, y, 0);
    const ring = cam.xy(sup(x, -0.03, 0.06, 0.004, y + 0.06, 32, 2).map(p => [p[0], y + 0.06 + (p[2] + 0.03) * 0 + Math.sin(Math.atan2(p[2] + 0.03, p[0] - x)) * 0, -0.03]));
    const rr = cam.p(x, y + 0.06, -0.03); g.strokeStyle = P.chrome; g.lineWidth = Math.max(2, 0.008 * k); g.beginPath(); g.ellipse(rr[0], rr[1], 0.06 * k, 0.06 * k, 0, 0, 7); g.stroke();
    const tw = cam.xy([[x - 0.05, y + 0.11, -0.04], [x + 0.05, y + 0.11, -0.04], [x + 0.12, y + 0.02, -0.045], [x + 0.125, y - 0.4, -0.05], [x - 0.125, y - 0.41, -0.05], [x - 0.12, y + 0.02, -0.045]]);
    const tp = GG.piece(g, poly(tw).path(1.2, 951), { fill: P.towel, tex: 0.45, kind: 'cloth', seed: 952, lift: [-0.012 * k, 0.012 * k], liftAlpha: 0.4, liftBlur: 10 });
    cres(g, tp, 0.01 * k, -0.004 * k, P.towelHi, 0.8);
    const hem = cam.xy([[x - 0.12, y - 0.36, -0.05], [x + 0.12, y - 0.355, -0.05]]); g.strokeStyle = 'rgba(70,84,96,0.6)'; g.lineWidth = Math.max(2, 0.006 * k); g.beginPath(); g.moveTo(hem[0][0], hem[0][1]); g.lineTo(hem[1][0], hem[1][1]); g.stroke();
    const fold = cam.xy([[x - 0.03, y + 0.02, -0.045], [x - 0.02, y - 0.4, -0.05]]); g.strokeStyle = P.towelSh; g.lineWidth = Math.max(2, 0.008 * k); g.beginPath(); g.moveTo(fold[0][0], fold[0][1]); g.lineTo(fold[1][0], fold[1][1]); g.stroke();
  }

  // ================================================================ the cameras
  const CAM = {
    // the insert: level with the brushes, close; the glass on the centre line, the mirror's lower edge behind the heads
    glass: camera({ pos: [0, 1.23, -0.85], pitch: -0.06, f: 1900, place: [B.glass, 960, 860] }),
    // from the doorway, at his height: an elevation of the basin wall, the cabinet's seam on the centre line
    mirror: camera({ pos: [0, 1.82, -2.25], pitch: 0, f: 1780, place: [[0, B.cab.y1, MZ], 960, 64] }),
  };

  // ---------------------------------------------------------------- state
  const st = (s, view) => { s = s || {}; return { lift: clamp(s.lift || 0, 0, 1), brush: s.brush || (view === 'mirror' ? 'out' : 'in'), glow: s.glow == null ? 0 : clamp(s.glow, 0, 1), foam: s.foam ? 1 : 0, res: s.res || 1 }; };
  // where his brush is at a lift (0 in the glass .. 0.55 clear of the rim .. 1 taken up and out to the left)
  function brushPose(lift) {
    const b = B.hisBrush, u = clamp(lift / 0.55, 0, 1), w = clamp((lift - 0.55) / 0.45, 0, 1), e = FILM_EASE(u), e2 = FILM_EASE(w);
    const d = [b.tip[0] - b.base[0], b.tip[1] - b.base[1], b.tip[2] - b.base[2]], L = Math.hypot(...d), n = d.map(v => v / L);
    const up = 0.125 * e;                                                                 // slides up along its own axis
    let base = [b.base[0] + n[0] * up, b.base[1] + n[1] * up, b.base[2] + n[2] * up];
    // then lifts away up and left, turning upright
    base = [base[0] - 0.16 * e2, base[1] + 0.15 * e2, base[2] - 0.05 * e2];
    const ang = Math.atan2(n[0], n[1]) * (1 - e2), tip = [base[0] + Math.sin(ang) * L, base[1] + Math.cos(ang) * L, base[2] + n[2] * L * (1 - e2)];
    return { base, tip, face: b.face };
  }
  const FILM_EASE = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // ================================================================ views
  // GLASS: the wall, the mirror's lower edge (the room and the brush heads reflected), the shelf, the glass, the two brushes
  function glassView() {
    const cam = CAM.glass;
    const behind = (c, res) => layer(c, 'glass:behind', g => {
      g.fillStyle = P.tileSh; g.fillRect(-MG, -MG, W + 2 * MG, H + 2 * MG);
      tileWall(g, cam, wallOf([0, 0, 0], [1, 0, 0], [0, 1, 0], -0.6, 0.6, 0.8, 1.6), wallBand, cols4, 801, { cells: 40, tex: 0.55 });
      // the mirror cabinet's bottom edge and the mirror above it
      const clip = doorGlass(cam);
      reflectedRoom(g, cam, clip);
      mirrorVeil(g, cam, clip, 1);
      cabinetFrames(g, cam);
      shelf(g, cam); shelfThings(g, cam);
      glassBack(g, cam, B.glass);
      brush(g, cam, B.herBrush, { dusty: true });
    }, res);
    const rest = brushPose(0), r0 = cam.p(rest.base), r1 = cam.p(rest.tip), kr = cam.k(...rest.base);
    const SB = [Math.floor(Math.min(r0[0], r1[0]) - 0.06 * kr), Math.floor(Math.min(r0[1], r1[1]) - 0.04 * kr), Math.ceil(Math.abs(r1[0] - r0[0]) + 0.12 * kr), Math.ceil(Math.abs(r1[1] - r0[1]) + 0.08 * kr)];
    const sprite = (c, res) => boxLayer(c, 'glass:hissprite', SB, g => brush(g, cam, rest), res);
    const drawHis = (c, lift, res) => {
      const cv = sprite(c, res); if (lift <= 0) { blitBox(c, cv, SB); return; }
      const p = brushPose(lift), a = cam.p(p.base), b = cam.p(p.tip), v0 = [r1[0] - r0[0], r1[1] - r0[1]], v1 = [b[0] - a[0], b[1] - a[1]];
      const sc = Math.hypot(v1[0], v1[1]) / Math.hypot(v0[0], v0[1]), an = Math.atan2(v1[1], v1[0]) - Math.atan2(v0[1], v0[0]), g = c.g;
      g.save(); g.translate(a[0], a[1]); g.rotate(an); g.scale(sc, sc); g.translate(-r0[0], -r0[1]); g.drawImage(cv, SB[0], SB[1], SB[2], SB[3]); g.restore();
    };
    const front = (c, res) => layer(c, 'glass:front', g => glassFront(g, cam, B.glass), res);
    return {
      back(c, t, s) {
        s = st(s, 'glass'); blit(c, behind(c, s.res));
        if (s.brush !== 'out') drawHis(c, s.lift, s.res);
        blit(c, front(c, s.res));
        if (s.glow > 0) blitBox(c, glowLayer(c, cam, 'glass', s.res), GLOWBOX.glass, s.glow, 'screen');
      },
      front(c, t, s) { },
      cam,
      brushAt(s) { s = st(s, 'glass'); const p = brushPose(s.lift), a = cam.p(p.base), b = cam.p(p.tip), gr = cam.p(lerp(p.base[0], p.tip[0], 0.32), lerp(p.base[1], p.tip[1], 0.32), lerp(p.base[2], p.tip[2], 0.32)); return { grip: [Math.round(gr[0]), Math.round(gr[1]), Math.round(cam.k(...p.base))], base: [a[0], a[1]], tip: [b[0], b[1]], angle: Math.atan2(b[0] - a[0], -(b[1] - a[1])) }; },
    };
  }
  // the phone's smooth light on the shelf around it (it faces the room); a cropped layer drawn with the glow's alpha
  const GLOWBOX = {};
  function glowLayer(c, cam, name, res) {
    const ph = B.phone, k = cam.k(...ph), q = cam.p(ph[0], B.shelf.y, ph[2] - 0.06), r = 0.24 * k;
    const bx = GLOWBOX[name] = [Math.floor(q[0] - r), Math.floor(q[1] - r * 0.7), Math.ceil(2 * r), Math.ceil(1.4 * r)];
    return boxLayer(c, name + ':glow', bx, g => {
      const top = poly(cam.xy([[B.shelf.x0, B.shelf.y, B.shelf.z0], [B.shelf.x1, B.shelf.y, B.shelf.z0], [B.shelf.x1, B.shelf.y, 0], [B.shelf.x0, B.shelf.y, 0]])).path(0, 1);
      g.save(); g.clip(top); GG.glow(g, q[0], q[1], r, P.glow, 0.42, 'screen', 0.55); g.restore();
      const lip = poly(cam.xy([[B.shelf.x0, B.shelf.y - B.shelf.t, B.shelf.z0], [B.shelf.x1, B.shelf.y - B.shelf.t, B.shelf.z0], [B.shelf.x1, B.shelf.y, B.shelf.z0], [B.shelf.x0, B.shelf.y, B.shelf.z0]])).path(0, 1);
      g.save(); g.clip(lip); GG.glow(g, q[0], q[1], r * 0.8, P.glowHot, 0.35, 'screen', 0.6); g.restore();
    }, res);
  }
  // MIRROR: back() is the wall, the window and the mirror with the room in it; his reflection goes between (v.inMirror);
  // front() is the cabinet's frames, the shelf and everything on it, the basin, the towel. His real self, if drawn, goes after front().
  function mirrorView() {
    const cam = CAM.mirror, clip = doorGlass(cam);
    const behind = (c, res) => layer(c, 'mirror:behind', g => {
      g.fillStyle = P.tileSh; g.fillRect(-MG, -MG, W + 2 * MG, H + 2 * MG);
      tileWall(g, cam, backWall, wallBand, cols4, 701, { cells: 56 });
      [[B.leftX, [1, 0, 0], leftBand], [B.rightX, [-1, 0, 0], (u, v) => 1 - Math.max(0, 0.9 - v)]].forEach(([x, n, bf], i) => { if (!cam.sees(n, [x, 1, -0.5])) return; tileWall(g, cam, wallOf([x, 0, 0], [0, 0, 1], [0, 1, 0], -2.2, 0, 0, B.ceil), bf, cols4, 702 + i, { cells: 20 }); });
      frostedWindow(g, cam);
      // the cabinet lifts off the tiles: its shadow thrown left and down by the window
      const csh = cam.xy([[B.cab.x0 - 0.06, B.cab.y0 - 0.05, 0], [B.cab.x1 - 0.05, B.cab.y0 - 0.05, 0], [B.cab.x1 - 0.05, B.cab.y1 - 0.03, 0], [B.cab.x0 - 0.06, B.cab.y1 - 0.03, 0]]); g.save(); g.filter = 'blur(14px)'; g.globalAlpha = 0.34; g.fillStyle = '#4A555D'; g.fill(poly(csh).path(0, 1)); g.restore();
      const wsh = cam.xy([[B.window.x0 - 0.05, B.window.y0 - 0.04, 0], [B.window.x0, B.window.y0 - 0.04, 0], [B.window.x0, B.window.y1, 0], [B.window.x0 - 0.05, B.window.y1, 0]]); g.save(); g.filter = 'blur(8px)'; g.globalAlpha = 0.25; g.fillStyle = '#4A555D'; g.fill(poly(wsh).path(0, 1)); g.restore();
      reflectedRoom(g, cam, clip);
      mirrorVeil(g, cam, clip, 1);
    }, res);
    const front = (c, foam, res) => layer(c, 'mirror:front:' + foam, g => {
      { const bsh = cam.xy([[B.basin.x0 - 0.06, B.basin.y - 0.2, 0], [B.basin.x1 - 0.06, B.basin.y - 0.2, 0], [B.basin.x1 - 0.05, B.basin.y + 0.01, 0], [B.basin.x0 - 0.07, B.basin.y + 0.01, 0]]); g.save(); g.filter = 'blur(16px)'; g.globalAlpha = 0.3; g.fillStyle = '#4A555D'; g.fill(poly(bsh).path(0, 1)); g.restore(); }
      cabinetFrames(g, cam); towel(g, cam);
      shelf(g, cam); shelfThings(g, cam);
      basin(g, cam, foam);
      glassBack(g, cam, B.glass); brush(g, cam, B.herBrush, { dusty: true });
    }, res);
    const hisIn = (c, res) => layer(c, 'mirror:hisbrush', g => brush(g, cam, B.hisBrush), res);
    const glassF = (c, res) => layer(c, 'mirror:glassfront', g => glassFront(g, cam, B.glass), res);
    return {
      back(c, t, s) { s = st(s, 'mirror'); blit(c, behind(c, s.res)); },
      front(c, t, s) {
        s = st(s, 'mirror'); blit(c, front(c, s.foam, s.res));
        if (s.brush === 'in') blit(c, hisIn(c, s.res));
        blit(c, glassF(c, s.res));
        if (s.glow > 0) blitBox(c, glowLayer(c, cam, 'mirror', s.res), GLOWBOX.mirror, s.glow, 'screen');
      },
      // draw fn(g) clipped to the mirror's glass, then lay the glass's cold veil and sheen over it (for his reflection)
      inMirror(c, fn, strength) {
        const g = c.g, t = tmp(g.canvas.width, g.canvas.height, 6); t.setTransform(g.getTransform()); fn(t);
        t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'source-atop'; t.fillStyle = 'rgba(124,137,145,' + (0.32 * (strength == null ? 1 : strength)) + ')'; t.fillRect(0, 0, t.canvas.width, t.canvas.height);
        g.save(); g.clip(clip); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(t.canvas, 0, 0); g.restore();
      },
      mirrorPath: clip,
      cam,
    };
  }

  // ================================================================ anchors, light, split
  const A = (cam, p) => { const q = cam.p(p); return [Math.round(q[0]), Math.round(q[1]), Math.round(cam.k(p[0], p[1], p[2]))]; };
  const views = { glass: glassView(), mirror: mirrorView() };
  {
    const g = CAM.glass, m = CAM.mirror;
    views.glass.anchors = { glass: A(g, [0, B.glass[1] + B.glassH, B.glass[2]]), brush: views.glass.brushAt({ lift: 0 }).grip, dusty: A(g, B.herBrush.tip), phone: A(g, B.phone), handFrom: [-60, 980] };
    views.glass.light = { x: 2300, y: 300, color: '#D3D8D9', kind: 'window', dir: [-1, 0.2] };
    views.glass.split = +(A(g, B.glass)[0] / W).toFixed(3);
    views.mirror.anchors = { reflection: A(m, mirrorPt(B.face)), back: A(m, [B.face[0], B.face[1] + 0.02, B.face[2] - 0.1]), basin: A(m, B.basinAt), tap: A(m, [0, B.basin.y + 0.055, -0.16]), phone: A(m, B.phone), glass: A(m, [0, B.glass[1] + B.glassH, B.glass[2]]), dusty: A(m, B.herBrush.tip), window: A(m, [(B.window.x0 + B.window.x1) / 2, 1.5, 0.11]) };
    views.mirror.light = { x: views.mirror.anchors.window[0], y: views.mirror.anchors.window[1], color: '#D3D8D9', kind: 'window' };
    views.mirror.split = +(A(m, [0, 1.5, MZ])[0] / W).toFixed(3);
    views.mirror.phoneLean = B.phoneLean; views.glass.phoneLean = B.phoneLean;
  }

  // ================================================================ demos (4 s each)
  // stand-ins only for judging the sheets: the phone (gloss, portrait, leaning back) and a flat paper figure for him
  function standInPhone(c, v, lit) {
    const a = v.anchors.phone, k = a[2], gl = c.gl, w = 0.071 * k, h = 0.147 * k * Math.cos(B.phoneLean);
    gl.save(); gl.translate(a[0], a[1]);
    gl.fillStyle = '#000000'; gl.beginPath(); gl.roundRect(-w / 2, -h / 2, w, h, w * 0.16); gl.fill();
    if (lit) { const gr = gl.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, '#2A1E3A'); gr.addColorStop(1, '#3A2440'); gl.fillStyle = gr; gl.beginPath(); gl.roundRect(-w / 2 + w * 0.06, -h / 2 + w * 0.06, w * 0.88, h - w * 0.12, w * 0.12); gl.fill();
      const bg = gl.createLinearGradient(-w * 0.4, 0, w * 0.4, 0); bg.addColorStop(0, '#FF8FB1'); bg.addColorStop(1, '#B48CFF'); gl.fillStyle = bg; gl.beginPath(); gl.roundRect(-w * 0.38, -h * 0.34, w * 0.76, h * 0.12, w * 0.06); gl.fill(); }
    gl.restore();
  }
  function standInHim(c, v) {
    const r = v.anchors.reflection, b = v.anchors.back;
    v.inMirror(c, g => { g.fillStyle = '#6B5348'; const k = r[2]; g.beginPath(); g.ellipse(r[0], r[1] - 0.02 * k, 0.085 * k, 0.12 * k, 0, 0, 7); g.fill(); g.fillStyle = '#3E4A47'; g.beginPath(); g.ellipse(r[0], r[1] + 0.33 * k, 0.24 * k, 0.17 * k, 0, 0, 7); g.fill(); });
    return b;
  }
  function standInBack(c, v) { const b = v.anchors.back, k = b[2], g = c.g; g.save(); g.fillStyle = '#2B2826'; g.globalAlpha = 0.92; g.beginPath(); g.ellipse(b[0], b[1], 0.09 * k, 0.115 * k, 0, 0, 7); g.fill(); g.fillStyle = '#2F3836'; g.beginPath(); g.ellipse(b[0] + 0.02 * k, b[1] + 0.32 * k, 0.25 * k, 0.2 * k, 0, 0, 7); g.fill(); g.restore(); }
  const demo = (name, view, s, mid, after) => ({ name, draw(c, t) { const v = views[view], ss2 = typeof s === 'function' ? s(t) : s; v.back(c, t, ss2); if (mid) mid(c, v, t); v.front(c, t, ss2); if (after) after(c, v, t); } });
  SETS.bathroom = {
    views, room: B,
    demos: [
      demo('glass: morning, both brushes in', 'glass', { lift: 0 }, null, (c, v) => standInPhone(c, v, false)),
      demo('glass: his brush lifted out (animated)', 'glass', t => ({ lift: clamp((t - 0.4) / 2.6, 0, 1) })),
      demo('glass: lift 0.5, clear of the rim', 'glass', { lift: 0.5 }),
      demo('mirror: morning (his brush out)', 'mirror', { brush: 'out' }, null, (c, v) => standInPhone(c, v, false)),
      demo('mirror: the phone lit, foam', 'mirror', { brush: 'out', glow: 1, foam: 1 }, (c, v) => standInHim(c, v), (c, v) => { standInBack(c, v); standInPhone(c, v, true); }),
      demo('mirror: both brushes in the glass', 'mirror', { brush: 'in' }),
    ],
  };
})();
