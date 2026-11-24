window.SETS = window.SETS || {};
/* LONG DISTANCE · SET: the bedroom (SETS.bedroom) · film/api/bedroom.md
   One room laid out in metres and seen through pinhole cameras, so every view agrees: the double bed against the headboard wall,
   his half on the left (x < 0), the empty half on the right; two single duvets, his thrown back over the shape of his body, hers
   tight and square with the sheet turned down; two pillows, his dented, hers smooth; the bedside tables and their unlit lamps;
   the window with vertical blinds above her table, whose streetlight falls in straight slats across her made half only; the
   wardrobe on his side wall, his clothes on the left of it and bare hangers on the right.
   Views: foot (high, from the foot; C1's plan, the pillow seam on the centre line), across (B1: across the bed from her side),
   hand (the insert on the smooth pillow), wardrobe (the open wardrobe by day), shelf (the insert on the shelf and its dust).
   Views that look from her side toward his (across, hand, wardrobe, shelf) are drawn flopped, so his half stays on the left and
   B1's composition (the headboard at the left) is kept.
   Everything is cut paper in Look B's palette. The phone and the characters are drawn by the sequences between back() and front().
   Deterministic: no Math.random, no Date. */
(function () {
  'use strict';
  const O = window.OTM, GG = window.GG, W = O.W, H = O.H, clamp = O.clamp, lerp = O.lerp;
  const SET = 'bedroom', MG = 48;                  // cached layers carry a 48 px margin, so pushes and drift never show an edge

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
  // x across the room (his side < 0 < her side), y up, z from the foot of the bed toward the headboard wall (z 2.30).
  const MT = 0.58;                                                         // the mattress top
  const R = {
    wallZ: 2.30, hisWallX: -2.40, herWallX: 1.90, footWallZ: -1.70, ceil: 2.55, mt: MT,
    bed: { x0: -0.80, x1: 0.80, z0: 0.12, z1: 2.22 },
    headboard: { x0: -0.86, x1: 0.86, y0: 0.30, y1: 1.12, z0: 2.22, z1: 2.29 },
    hisPillow: { cx: -0.405, cz: 1.885, hw: 0.335, hd: 0.315, ht: 0.12, rot: -0.07, dent: [-0.33, 1.88, 0.06, 0.16], wr: 1 },
    herPillow: { cx: 0.41, cz: 1.89, hw: 0.33, hd: 0.315, ht: 0.155, rot: 0 },
    hisStand: { x0: -1.38, x1: -0.92, z0: 1.82, z1: 2.28, y1: 0.56 },
    herStand: { x0: 0.92, x1: 1.38, z0: 1.82, z1: 2.28, y1: 0.56 },
    window: { x0: 1.42, x1: 1.85, y0: 0.66, y1: 2.20, z: 2.30, vanes: 5 },
    wardrobe: { x0: -2.40, x1: -1.80, z0: 0.0, z1: 1.20, y1: 2.06, shelf: 1.78, rail: 1.66 },
    // the choreography's points (metres)
    head: [-0.34, 0.78, 1.885],               // his head on his pillow, lying on his side facing her pillow
    face: [-0.25, 0.79, 1.885],               // his face (the screen's light lands here)
    phone: [0.30, 0.77, 1.875],               // the phone on its long edge on the smooth pillow, where her head would be
    hand: [0.30, 0.835, 1.865],               // his hand at rest over the phone
    shoulder: [-0.27, 0.84, 1.62],            // his upper shoulder, where the arm leaves the duvet
    stand: [-1.25, 0, 0.88],                  // where he stands at the wardrobe (his feet), in front of his clothes
    bag: [-2.00, 1.83, 0.31],                 // the makeup bag on the shelf (its centre)
  };
  // the streetlight through the blinds: horizontal heading (toward -x, -z) and elevation; 'later' turns it a little
  const SL = { night: { yaw: 0.70, elev: 0.65 }, later: { yaw: 0.735, elev: 0.635, shift: 0.02 } };

  // ---------------------------------------------------------------- palettes
  const N = {
    floor: '#0C1019', board: 'rgba(0,0,0,0.32)', wall: '#121827', wallSide: '#0F1421', skirt: '#171C2A',
    stand: '#1A2030', standTop: '#232B40', standSide: '#141A28',
    head: '#1E2638', headTop: '#2A3349', headEnd: '#171D2C', base: '#10141F',
    sheet: ['#1A2234', '#242D43', '#303A55'],
    hisDuvet: ['#1E2638', '#29324B', '#38445F'],
    hisFold: ['#28314A', '#323D58', '#435173'],
    herDuvet: ['#253047', '#2E3852', '#38445F'],
    herFold: ['#2C3651', '#333E5A', '#3E4A69'],
    hisPillow: ['#20283B', '#2A3349', '#3B4765'],
    herPillow: ['#2C3650', '#3A4763', '#4C5B82'],
    slat: '#7E93C2', street: '#7E93C2', streetHi: '#9AACD6', outside: '#0A0E17', building: '#151B29',
    shade: '#283049', shadeLit: '#323C58', shadeIn: '#0D111B', lampBase: '#29324A',
    glow: '#FFC5A0', glowHot: '#FFD9BE',
  };
  const D = {                                                          // the bedroom by day (the wardrobe)
    wall: '#7C7B76', wallLit: '#93918A', wallHi: '#A3A098', wallShade: '#6A6964', floor: '#5B5A55', skirt: '#86847D',
    carcass: '#A9A69D', carcassShade: '#8C8A83', carcassDeep: '#6E6D68', edge: '#BDB9AE',
    back: '#5E5D58', backLit: '#7A7973', backDeep: '#474850', inSide: '#55554F', inSideLit: '#6F6E68',
    shelf: '#8E8B83', shelfLit: '#A19E95', shelfEdge: '#B4B0A6', dust: '#B8B4A9', rail: '#9C9D9A', railHi: '#C4C4BE',
    hanger: '#A2957E', hangerHi: '#BDB19A', hangerShade: '#776C5B',
    door: '#B0ADA3', doorShade: '#8B8981', doorIn: '#9E9B92', knob: '#5E5B55',
    shirtA: '#A2A9AE', shirtB: '#727D8C', tee: '#3E4A47', sweater: '#3D3936', jacket: '#33383F', flannel: '#5C5550',
    bag: '#D9C1B4', bagShade: '#B49C92', bagHi: '#E8D6CA', flowers: ['#B9666A', '#C98A5E', '#7A8E6A', '#9C6E8E'], zip: '#C8A858', zipTape: '#7A6A50',
  };
  const nightL = nrm([0.07, 1, 0.1]);                                  // the night's ambient: from above (tops lit, shoulders dark, as in B1)
  const dayL = nrm([0.55, 0.6, 0.58]);                                 // the grey day: from the window, high, behind her side
  const shadeNight = n => 0.5 + 1.7 * (dot(n, nightL) - nightL[1]);
  const shadeDay = n => 0.5 + 1.7 * (dot(n, dayL) - dayL[1]);

  // ---------------------------------------------------------------- the soft goods (height fields)
  const hisTop = x => (x > -0.5 ? 1.625 : 1.625 - (-0.5 - x) * 1.4) + 0.016 * Math.sin(x * 17 + 1.3);   // up to his shoulder; the outer corner thrown back
  const foldW = x => 0.09 + Math.max(0, -x - 0.3) * 0.3;                                     // the turned-back flap, wider at the outer corner
  const SPINE = [[-0.30, 1.60, 0.25], [-0.40, 1.18, 0.23], [-0.20, 0.80, 0.165], [-0.36, 0.42, 0.11], [-0.42, 0.20, 0.07]];
  function bodyH(x, z) {
    let acc = 0;
    for (let i = 0; i < SPINE.length - 1; i++) {
      const a = SPINE[i], b = SPINE[i + 1], vx = b[0] - a[0], vz = b[1] - a[1], L2 = vx * vx + vz * vz;
      const t = clamp(((x - a[0]) * vx + (z - a[1]) * vz) / L2, 0, 1), px = a[0] + vx * t, pz = a[1] + vz * t, d = Math.hypot(x - px, z - pz);
      const r = lerp(a[2], b[2], t), w = 0.12 + r * 0.42, hgt = r * Math.exp(-(d / w) * (d / w));
      acc = acc + hgt - acc * hgt / Math.max(r, 1e-3) * 0.85;                               // a soft union of the limbs
    }
    return acc;
  }
  // the creases radiating from his hip and knees (plan lines with heights)
  const FOLDS = [[[-0.62, 1.32], [-0.42, 1.12]], [[-0.70, 0.96], [-0.44, 1.03]], [[-0.10, 1.20], [-0.30, 1.09]], [[-0.06, 0.90], [-0.18, 0.84]], [[-0.66, 0.62], [-0.40, 0.66]], [[-0.12, 0.55], [-0.27, 0.63]], [[-0.55, 0.34], [-0.40, 0.46]]];
  function folds(x, z) {
    let s = 0;
    for (const [a, b] of FOLDS) { const vx = b[0] - a[0], vz = b[1] - a[1], L2 = vx * vx + vz * vz, t = clamp(((x - a[0]) * vx + (z - a[1]) * vz) / L2, 0, 1), d = Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t); s += 0.014 * Math.exp(-((d / 0.024) ** 2)) * Math.sin(t * Math.PI); }
    return s;
  }
  const rumple = (x, z) => 0.0045 * Math.sin(x * 19 + z * 7) * Math.sin(z * 11 - x * 5) + 0.002 * Math.sin(x * 37 - z * 23);
  function hisDuvetH(x, z) {
    if (x < -0.87 || x > -0.012 || z < 0.10 || z > hisTop(x) - foldW(x) + 0.02) return null;
    const base = 0.05 + bodyH(x, z) + rumple(x, z) + folds(x, z);
    const e = Math.min(ss(-0.012, -0.05, x), ss(0.10, 0.14, z));
    let y = MT + base * (0.35 + 0.65 * e);
    if (x < -0.80) y -= (-0.80 - x) * 2.2;                               // over the outer edge it falls away
    return y;
  }
  function hisFoldH(x, z) {
    const top = hisTop(x), w = foldW(x); if (x < -0.86 || x > -0.014 || z > top || z < top - w) return null;
    const u = (z - (top - w)) / w;                                       // 0 at the flap's free edge, 1 at the fold
    let y = MT + 0.06 + bodyH(x, z) * 0.8 + rumple(x, z) * 0.3 + 0.018 * Math.sin(u * Math.PI * 0.5) + 0.008 * Math.sin(x * 13 + 0.6);
    if (u > 0.7) y -= ss(0.7, 1, u) * (0.05 + bodyH(x, z) * 0.45);       // the fold rolls down toward the sheet, round
    if (x < -0.80) y -= (-0.80 - x) * 2.2;
    return y;
  }
  function herDuvetH(x, z) {
    if (x < 0.006 || x > 0.84 || z < 0.10 || z > 1.555) return null;
    if (x > 0.80) return MT + 0.05 - (x - 0.80) * 1.6;
    const e = Math.min(ss(0.006, 0.035, x), ss(0.80, 0.77, x), ss(0.10, 0.13, z));
    return MT + 0.012 + 0.04 * e;
  }
  function herFoldH(x, z) {                                              // the sheet turned down over the top of her duvet, ruler straight
    if (x < 0.008 || x > 0.835 || z < 1.43 || z > 1.585) return null;
    if (x > 0.80) return MT + 0.06 - (x - 0.80) * 1.6;
    const u = (z - 1.43) / 0.155;
    return MT + 0.056 + 0.008 * Math.sin(u * Math.PI * 0.5) - (u > 0.86 ? (u - 0.86) / 0.14 * 0.03 : 0) + 0.006 * ss(0.012, 0.03, x) - 0.006;
  }
  function sheetH(x, z) {
    if (x < -0.80 || x > 0.80 || z < 0.12 || z > 2.22) return null;
    let y = MT + 0.004;
    if (x < -0.01) y += 0.004 * Math.sin(x * 31 + z * 7) * Math.sin(z * 13 - x * 5) + 0.01 * Math.exp(-(((x + 0.14 + 0.05 * Math.sin(z * 9)) / 0.03) ** 2)) * Math.max(0, Math.sin(z * 11)) + 0.006 * Math.exp(-(((z - 1.51 + x * 0.3) / 0.025) ** 2));
    return y;
  }
  function pillowH(P) {
    const c = Math.cos(P.rot), s = Math.sin(P.rot);
    return (x, z) => {
      const lx = (x - P.cx) * c + (z - P.cz) * s, lz = -(x - P.cx) * s + (z - P.cz) * c, u = lx / P.hw, v = lz / P.hd;
      const m = Math.abs(u) ** 4 + Math.abs(v) ** 4; if (m > 1) return null;
      const e = (1 - Math.pow(m, 0.25)) * Math.min(P.hw, P.hd), sh = 1 - Math.max(0, 1 - e / 0.075) ** 2;     // distance in from the edge; the shoulder
      let y = MT + 0.002 + P.ht * sh * (1 - 0.06 * m);
      if (P.dent) { const d = Math.hypot(x - P.dent[0], (z - P.dent[1]) * 1.15); y -= P.dent[2] * Math.exp(-((d / P.dent[3]) ** 2)) * sh; }
      if (P.wr) { const dd = (a, b2, r2, h2) => h2 * Math.exp(-((Math.hypot(x - a, z - b2) / r2) ** 2)); y += (dd(-0.62, 2.05, 0.08, 0.02) - dd(-0.18, 1.66, 0.07, 0.018) + dd(-0.66, 1.66, 0.06, 0.012) - dd(-0.15, 2.08, 0.06, 0.014)) * sh; }
      return y;
    };
  }
  const pbox = P => { const r = Math.hypot(P.hw, P.hd) + 0.01; return { x0: P.cx - r, x1: P.cx + r, z0: P.cz - r, z1: P.cz + r }; };

  // ---------------------------------------------------------------- the streetlight's slats: each gap between the blind's vanes
  // throws a parallelogram along the light; intersected with a plane (n, d: n.p = d) and projected
  const VANES = (() => { const v = [], w = R.window, n = w.vanes, pitch = (w.x1 - w.x0) / n; for (let i = 0; i < n; i++) v.push([w.x0 + i * pitch, pitch]); return v; })();
  function slatQuads(cam, tod, n, d) {
    const L = SL[tod] || SL.night, hy = Math.cos(L.elev), dir = [-Math.sin(L.yaw) * hy, -Math.sin(L.elev), -Math.cos(L.yaw) * hy], w = R.window, out = [];
    const hit = p => { const t = (d - dot(n, p)) / dot(n, dir); return [p[0] + dir[0] * t, p[1] + dir[1] * t, p[2] + dir[2] * t]; };
    VANES.forEach(([x0, pitch]) => {
      const a = x0 + pitch * 0.46 + (L.shift || 0), b = x0 + pitch * 0.97 + (L.shift || 0), y0 = w.y0 + 0.12, y1 = w.y1 - 0.08;
      out.push(cam.xy([hit([a, y0, w.z]), hit([b, y0, w.z]), hit([b, y1, w.z]), hit([a, y1, w.z])]));
    });
    return out;
  }
  function slats(g, cam, tod, plane, pieces, alpha) {
    const qs = slatQuads(cam, tod, plane[0], plane[1]);
    onPieces(g, pieces, t => { qs.forEach((q, i) => { t.fillStyle = N.slat; t.fill(poly(q).path(1.6, 300 + i)); }); }, 'screen', alpha);
  }

  // ---------------------------------------------------------------- furniture
  function boxFaces(g, cam, b, col, o) {                     // an axis-aligned box: each visible face a cut piece
    o = o || {}; const { x0, x1, y0, y1, z0, z1 } = b, out = [];
    const F = [
      { n: [0, 1, 0], p: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], c: col.top },
      { n: [0, 0, -1], p: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], c: col.front },
      { n: [0, 0, 1], p: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], c: col.back || col.front },
      { n: [-1, 0, 0], p: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], c: col.left || col.side },
      { n: [1, 0, 0], p: [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], c: col.right || col.side },
      { n: [0, -1, 0], p: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], c: col.bottom || col.side },
    ];
    F.forEach((f, i) => { if (!f.c || !cam.sees(f.n, f.p[0])) return; out.push(quad(g, cam, f.p, { fill: f.c, rough: o.rough == null ? 0.8 : o.rough, seed: (o.seed || 40) + i, tex: o.tex == null ? 0.5 : o.tex, kind: o.kind || 'card' })); });
    return out;
  }
  function circle3(c, r, y, n) { const p = []; n = n || 28; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push([c[0] + Math.cos(a) * r, y, c[2] + Math.sin(a) * r]); } return p; }
  function lamp(g, cam, cx, cz, lit) {                       // a drum-shade table lamp, unlit
    const base = cam.xy(circle3([cx, 0, cz], 0.075, R.hisStand.y1 + 0.005));
    shadow(g, poly(hull(base)).path(0.6, 9), 4, 6, 6, 0.5);
    const bp = GG.piece(g, poly(hull(base)).path(0.6, 9), { fill: N.lampBase, tex: 0.4, seed: 81 }); cres(g, bp, 0, -3, '#38445F', 0.8);
    const stem = cam.xy([[cx - 0.012, 0.58, cz], [cx + 0.012, 0.58, cz], [cx + 0.012, 0.80, cz], [cx - 0.012, 0.80, cz]]); g.fillStyle = '#20273A'; g.fill(poly(stem).path(0, 1));
    const bot = cam.xy(circle3([cx, 0, cz], 0.17, 0.78)), top = cam.xy(circle3([cx, 0, cz], 0.14, 1.0));
    const side = poly(hull(bot.concat(top))).path(0.9, 82);
    shadow(g, side, 8, 10, 10, 0.5);
    GG.piece(g, side, { fill: N.shade, tex: 0.55, kind: 'paper', seed: 83 });
    cres(g, side, -6, -4, N.shadeLit, lit == null ? 0.6 : lit);
    if (cam.p(cx, 1.0, cz)[1] > cam.p(cx, 0.78, cz)[1] - 2) return;                           // seen from below the shade's top: no opening
    const opening = poly(hull(top)).path(0.5, 84); g.fillStyle = N.shadeIn; g.fill(opening); g.strokeStyle = 'rgba(80,96,134,0.35)'; g.lineWidth = 1.5; g.stroke(opening);
    const bl = cam.p(cx, 0.9, cz); g.fillStyle = '#1E2536'; g.beginPath(); g.arc(bl[0], bl[1], 0.03 * cam.k(cx, 0.9, cz), 0, 7); g.fill();
  }
  function glassOfWater(g, cam, cx, cz) {
    const y0 = R.hisStand.y1, k = cam.k(cx, y0, cz), r = 0.034;
    const bot = cam.xy(circle3([cx, 0, cz], r, y0 + 0.002, 18)), top = cam.xy(circle3([cx, 0, cz], r * 1.08, y0 + 0.12, 18));
    const body = poly(hull(bot.concat(top))).path(0.4, 91); shadow(g, body, 3, 5, 4, 0.5);
    g.fillStyle = 'rgba(42,53,80,0.85)'; g.fill(body);
    const wat = cam.xy(circle3([cx, 0, cz], r * 1.04, y0 + 0.075, 18)); g.fillStyle = 'rgba(58,72,104,0.9)'; g.fill(poly(hull(bot.concat(wat))).path(0.3, 92));
    g.strokeStyle = 'rgba(120,140,180,0.45)'; g.lineWidth = Math.max(1, k * 0.004); g.stroke(poly(top).path(0.2, 93));
    const hi = cam.xy([[cx - r * 0.6, y0 + 0.02, cz - r * 0.8], [cx - r * 0.6, y0 + 0.11, cz - r * 0.8]]); g.strokeStyle = 'rgba(120,140,180,0.35)'; g.lineWidth = Math.max(2, k * 0.006); g.beginPath(); g.moveTo(hi[0][0], hi[0][1]); g.lineTo(hi[1][0], hi[1][1]); g.stroke();
  }
  function paperback(g, cam, cx, cz, rot) {
    const c = Math.cos(rot), s = Math.sin(rot), y = R.hisStand.y1, P = (u, v, h) => [cx + u * c - v * s, y + h, cz + u * s + v * c];
    const cover = [P(-0.065, -0.10, 0.022), P(0.065, -0.10, 0.022), P(0.065, 0.10, 0.022), P(-0.065, 0.10, 0.022)];
    const pts = cam.xy(cover), all = cam.xy([P(-0.065, -0.10, 0), P(0.065, -0.10, 0), P(0.065, 0.10, 0), P(-0.065, 0.10, 0)]).concat(pts);
    const body = poly(hull(all)).path(0.6, 95); shadow(g, body, 3, 5, 5, 0.55);
    GG.piece(g, body, { fill: '#E3D7BE', tex: 0.4, seed: 96, kind: 'paper' });                // the page block (dimmed below by the night)
    g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#323A52'; g.fill(body); g.restore();
    GG.piece(g, poly(pts).path(0.7, 97), { fill: '#3B2F38', tex: 0.5, seed: 98 });
  }

  // ================================================================ BEDROOM AT NIGHT: foot, across, hand
  // which parts each camera needs; the walls between a long lens and the bed are cut away, as on a stage
  function nightRoom(g, cam, view, tod, out) {
    const res = Math.hypot(g.getTransform().a, g.getTransform().b), kT = cam.k(0, MT, 1.6);
    const step = clamp(7 / kT, 0.0025, 0.014), blur = clamp(step * kT * 0.42, 1.8, 6);
    g.fillStyle = N.floor; g.fillRect(-MG, -MG, W + 2 * MG, H + 2 * MG);
    // ---- the floor's boards, the walls
    { g.save(); g.strokeStyle = N.board; g.lineWidth = 1.6; for (let x = R.hisWallX; x <= R.herWallX; x += 0.145) line3(g, cam, [[x, 0, R.footWallZ], [x, 0, R.wallZ]], N.board, 1.6); g.restore(); }
    const walls = [];
    if (view === 'foot') {
      walls.push([[R.hisWallX, 0, R.wallZ], [R.herWallX, 0, R.wallZ], [R.herWallX, R.ceil, R.wallZ], [R.hisWallX, R.ceil, R.wallZ], N.wall, [0, 0, -1]]);
      walls.push([[R.herWallX, 0, R.wallZ], [R.herWallX, 0, R.footWallZ], [R.herWallX, R.ceil, R.footWallZ], [R.herWallX, R.ceil, R.wallZ], N.wallSide, [-1, 0, 0]]);
      walls.push([[R.hisWallX, 0, R.wallZ], [R.hisWallX, 0, R.footWallZ], [R.hisWallX, R.ceil, R.footWallZ], [R.hisWallX, R.ceil, R.wallZ], N.wallSide, [1, 0, 0]]);
    } else {
      walls.push([[R.hisWallX, 0, R.footWallZ], [R.hisWallX, 0, R.wallZ], [R.hisWallX, R.ceil, R.wallZ], [R.hisWallX, R.ceil, R.footWallZ], N.wall, [1, 0, 0]]);
      walls.push([[R.hisWallX, 0, R.wallZ], [R.herWallX, 0, R.wallZ], [R.herWallX, R.ceil, R.wallZ], [R.hisWallX, R.ceil, R.wallZ], N.wallSide, [0, 0, -1]]);
    }
    walls.forEach((w, i) => { if (!cam.sees(w[5], w[0])) return; const p = quad(g, cam, w.slice(0, 4), { fill: w[4], rough: 0, tex: 0.55, seed: 3 + i, kind: 'paper' });
      const sk = w[5][2] ? [[w[0][0], 0, w[0][2] - 0.012], [w[1][0], 0, w[1][2] - 0.012], [w[1][0], 0.09, w[1][2] - 0.012], [w[0][0], 0.09, w[0][2] - 0.012]] : [[w[0][0] + w[5][0] * 0.012, 0, w[0][2]], [w[1][0] + w[5][0] * 0.012, 0, w[1][2]], [w[1][0] + w[5][0] * 0.012, 0.09, w[1][2]], [w[0][0] + w[5][0] * 0.012, 0.09, w[0][2]]];
      quad(g, cam, sk, { fill: N.skirt, rough: 0.5, tex: 0.4, seed: 7 + i }); });
    // ---- the window above her table (only the foot camera sees it)
    if (view === 'foot') nightWindow(g, cam, tod);
    // ---- the wardrobe on his wall, dark (the across camera sees its doors behind the bed)
    if (view === 'across') {
      const w = R.wardrobe;
      const fr = quad(g, cam, [[w.x1, 0, w.z0], [w.x1, 0, w.z1], [w.x1, w.y1, w.z1], [w.x1, w.y1, w.z0]], { fill: '#161C2B', rough: 0.8, seed: 61, tex: 0.5, kind: 'card', lift: [0, 10], liftAlpha: 0.5, liftBlur: 14 });
      line3(g, cam, [[w.x1 + 0.002, 0.08, 0.6], [w.x1 + 0.002, w.y1 - 0.03, 0.6]], 'rgba(5,7,12,0.7)', 3);
      [[0.56, 1.0], [0.64, 1.0]].forEach(([z, y]) => { const q = cam.p(w.x1 + 0.02, y, z); g.fillStyle = '#2E3852'; g.beginPath(); g.arc(q[0], q[1], 0.012 * cam.k(w.x1, y, z), 0, 7); g.fill(); });
      cres(g, fr, 0, -8, '#202840', 0.8);
    }
    // ---- the bedside tables, their lamps; his glass of water and his paperback, face down
    const stands = [[R.hisStand, 'his'], [R.herStand, 'her']];
    stands.forEach(([s, who]) => {
      if (view !== 'foot' && who === 'her') return;
      const b = Object.assign({ y0: 0 }, s); const f = boxFaces(g, cam, b, { top: N.standTop, front: N.stand, side: N.standSide }, { seed: who === 'his' ? 41 : 51 });
      const d1 = cam.xy([[s.x0 + 0.03, s.y1 - 0.15, s.z0 - 0.001], [s.x1 - 0.03, s.y1 - 0.15, s.z0 - 0.001]]); g.strokeStyle = 'rgba(4,6,12,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(d1[0][0], d1[0][1]); g.lineTo(d1[1][0], d1[1][1]); g.stroke();
      if (view === 'across') { const d2 = cam.xy([[s.x1 + 0.001, s.y1 - 0.15, s.z0 + 0.03], [s.x1 + 0.001, s.y1 - 0.15, s.z1 - 0.03]]); g.beginPath(); g.moveTo(d2[0][0], d2[0][1]); g.lineTo(d2[1][0], d2[1][1]); g.stroke(); }
      f.forEach((p, i) => cres(g, p, 0, -5, '#2E3852', i ? 0.25 : 0.55));
      if (who === 'his') { paperback(g, cam, -1.26, 1.96, 0.35); glassOfWater(g, cam, -1.02, 1.93); }
      lamp(g, cam, who === 'his' ? -1.16 : 1.16, 2.13);
    });
    // ---- the headboard: two upholstered panels, their seam on the centre line
    const hb = R.headboard, hbPaths = [];
    if (view === 'foot' || view === 'across' || view === 'hand') {
      [[hb.x0, -0.006], [0.006, hb.x1]].forEach(([a, b], i) => {
        const fr = quad(g, cam, [[a, hb.y0, hb.z0], [b, hb.y0, hb.z0], [b, hb.y1, hb.z0], [a, hb.y1, hb.z0]], { fill: N.head, rough: 1.0, seed: 21 + i, tex: 0.6, kind: 'cloth', lift: view === 'foot' ? [0, 8] : [-8, 6], liftAlpha: 0.6, liftBlur: 10 });
        cres(g, fr, 0, view === 'foot' ? -8 : -5, '#28314A', 0.9); hbPaths.push(fr);
        quad(g, cam, [[a, hb.y1, hb.z0], [b, hb.y1, hb.z0], [b, hb.y1, hb.z1], [a, hb.y1, hb.z1]], { fill: N.headTop, rough: 0.8, seed: 23 + i, tex: 0.5, kind: 'cloth' });
        if (cam.sees([1, 0, 0], [b, 0.7, 2.25]) && i === 1) quad(g, cam, [[b, hb.y0, hb.z0], [b, hb.y0, hb.z1], [b, hb.y1, hb.z1], [b, hb.y1, hb.z0]], { fill: N.headEnd, rough: 0.8, seed: 25, tex: 0.5, kind: 'cloth' });
      });
    }
    // ---- the bed's base and the mattress's sides
    quad(g, cam, [[-0.84, 0.10, 0.08], [0.84, 0.10, 0.08], [0.84, 0.34, 0.08], [-0.84, 0.34, 0.08]], { fill: N.base, rough: 0.6, seed: 31, tex: 0.4 });
    if (cam.sees([1, 0, 0], [0.84, 0.2, 1])) quad(g, cam, [[0.84, 0.10, 0.08], [0.84, 0.10, 2.22], [0.84, 0.34, 2.22], [0.84, 0.34, 0.08]], { fill: N.base, rough: 0.6, seed: 32, tex: 0.4 });
    // ---- the sheet, the pillows
    const F = (h, x0, x1, z0, z1, cols, seed, o) => field(g, cam, Object.assign({ x0, x1, z0, z1, h, step, blur, shade: shadeNight, cols, bands: [0.34, 0.68], seed, kind: 'cloth', tex: 0.5 }, o || {}));
    const sheet = F(sheetH, -0.80, 0.80, 0.12, 2.22, N.sheet, 101, { lift: [0, 4], liftAlpha: 0.4, liftBlur: 6, wob: 0.05 });
    const hp = R.hisPillow, xp = R.herPillow, hb1 = pbox(hp), hb2 = pbox(xp);
    const lift = view === 'foot' ? [0, 10] : [-8, 14];
    const hisP = F(pillowH(hp), hb1.x0, hb1.x1, hb1.z0, hb1.z1, N.hisPillow, 121, { lift, liftAlpha: 0.75, liftBlur: 14, bands: [0.3, 0.52], edge: 0.1, wob: 0.05, step: step * 0.5 });
    rcres(g, hisP, 0, -0.012 * kT, '#465374', 0.8);
    // the hollow his head has pressed into it, a few hard creases
    {
      const P3 = (x, z) => { const y = pillowH(hp)(x, z); return y == null ? null : [x, y + 0.002, z]; };
      [[[-0.66, 1.98], [-0.6, 1.93], [-0.55, 1.91]], [[-0.19, 1.66], [-0.13, 1.72], [-0.11, 1.8]], [[-0.68, 1.68], [-0.6, 1.71]], [[-0.25, 2.1], [-0.17, 2.08], [-0.12, 2.03]], [[-0.5, 1.62], [-0.42, 1.66], [-0.36, 1.65]]].forEach(cv => {
        const pts = cv.map(([x, z]) => P3(x, z)).filter(Boolean); if (pts.length < 2) return;
        onPieces(g, [hisP], t => crease(t, cam.xy(pts), { w: Math.max(2.5, 0.008 * kT), dy: -2 }));
      });
    }
    const herP = F(pillowH(xp), hb2.x0, hb2.x1, hb2.z0, hb2.z1, N.herPillow, 131, { lift, liftAlpha: 0.85, liftBlur: 18, bands: [0.22, 0.46], wob: 0.03, edge: 0.08, step: step * 0.5 });
    rcres(g, herP, 0, -0.014 * kT, '#5A6A92', 0.85);
    // the ironed crease across its near end, ruler straight
    { const yy = MT + xp.ht, c1 = cam.xy([[xp.cx + xp.hw * 0.62, yy, xp.cz - xp.hd * 0.8], [xp.cx + xp.hw * 0.62, yy, xp.cz + xp.hd * 0.8]]); onPieces(g, [herP], t => { t.lineCap = 'round'; t.strokeStyle = 'rgba(22,28,44,0.45)'; t.lineWidth = Math.max(1.5, 0.004 * kT); t.beginPath(); t.moveTo(c1[0][0], c1[0][1]); t.lineTo(c1[1][0], c1[1][1]); t.stroke(); t.strokeStyle = 'rgba(120,138,178,0.35)'; t.lineWidth = Math.max(1, 0.002 * kT); t.translate(0, -Math.max(1.5, 0.004 * kT)); t.beginPath(); t.moveTo(c1[0][0], c1[0][1]); t.lineTo(c1[1][0], c1[1][1]); t.stroke(); }); }
    // ---- his duvet over the shape of him: shoulder, hip, knees drawn up; the flap turned back is front() (it crosses his chest)
    const hisD = F(hisDuvetH, -0.87, -0.012, 0.10, 1.64, N.hisDuvet, 141, { lift: view === 'foot' ? [0, 12] : [-6, 16], liftAlpha: 0.8, liftBlur: 16, bands: [0.3, 0.6], wob: 0.05 });
    rcres(g, hisD, 0, -0.012 * kT, '#3D4A6C', 0.9);
    {
      const P3 = (x, z) => { const y = hisDuvetH(x, z); return y == null ? null : [x, y + 0.003, z]; };
      FOLDS.forEach(([a, b], fi) => { if (fi % 2) return; const pts = []; for (let i = 0; i <= 6; i++) { const q = P3(lerp(a[0], b[0], i / 6), lerp(a[1], b[1], i / 6)); if (q) pts.push(q); } if (pts.length > 2) onPieces(g, [hisD], t => crease(t, cam.xy(pts), { w: Math.max(3, 0.008 * kT), dy: -2.5, dark: 'rgba(10,13,22,0.45)', light: 'rgba(86,102,138,0.32)' })); });
    }
    // ---- her duvet, tight; the sheet turned down over it in one straight band
    const herD = F(herDuvetH, 0.006, 0.84, 0.10, 1.555, N.herDuvet, 151, { lift: view === 'foot' ? [0, 10] : [-4, 12], liftAlpha: 0.65, liftBlur: 12, wob: 0.03, edge: 0.14 });
    rcres(g, herD, 0, -0.01 * kT, '#3A4766', 0.8);
    const herF = F(herFoldH, 0.008, 0.835, 1.43, 1.585, N.herFold, 161, { lift: [0, 6], liftAlpha: 0.6, liftBlur: 6, wob: 0.03, edge: 0.12, bands: [0.25, 0.75] });
    rcres(g, herF, 0, -0.01 * kT, '#4C5B82', 0.9);
    if (view === 'foot') { const e = cam.xy([[0.02, herFoldH(0.4, 1.55) + 0.002, 1.552], [0.80, herFoldH(0.4, 1.55) + 0.002, 1.552]]); g.save(); g.strokeStyle = 'rgba(150,168,206,0.35)'; g.lineWidth = Math.max(1.5, 0.004 * kT); g.beginPath(); g.moveTo(e[0][0], e[0][1]); g.lineTo(e[1][0], e[1][1]); g.stroke(); g.restore(); }
    // her duvet's near side, hanging straight (the across camera looks at it)
    let herSide = null;
    if (cam.sees([1, 0, 0], [0.84, 0.5, 1])) {
      quad(g, cam, [[0.81, 0.30, 1.555], [0.81, 0.30, 2.22], [0.81, MT + 0.005, 2.22], [0.81, MT + 0.005, 1.555]], { fill: '#1F273A', rough: 0.8, seed: 170, tex: 0.5, kind: 'cloth', lift: [0, 8], liftAlpha: 0.5, liftBlur: 10 });
      herSide = quad(g, cam, [[0.842, 0.34, 0.10], [0.842, 0.34, 1.555], [0.842, MT + 0.05, 1.555], [0.842, MT + 0.05, 0.10]], { fill: '#283149', rough: 1.0, seed: 171, tex: 0.5, kind: 'cloth', lift: [0, 10], liftAlpha: 0.6, liftBlur: 12 });
      quad(g, cam, [[0.842, 0.36, 1.43], [0.842, 0.36, 1.585], [0.842, MT + 0.06, 1.585], [0.842, MT + 0.06, 1.43]], { fill: '#2C3651', rough: 0.8, seed: 172, tex: 0.4, kind: 'cloth' });
      const e = cam.xy([[0.845, MT + 0.05, 0.10], [0.845, MT + 0.05, 1.585]]); g.strokeStyle = 'rgba(130,148,190,0.45)'; g.lineWidth = Math.max(2, 0.003 * kT); g.beginPath(); g.moveTo(e[0][0], e[0][1]); g.lineTo(e[1][0], e[1][1]); g.stroke();
    }
    // the duvets' feet, hanging over the end of the bed (the foot camera looks at them)
    if (cam.sees([0, 0, -1], [0, 0.5, 0.1])) {
      quad(g, cam, [[0.006, 0.34, 0.098], [0.842, 0.34, 0.098], [0.842, MT + 0.05, 0.098], [0.006, MT + 0.05, 0.098]], { fill: '#273048', rough: 1.0, seed: 173, tex: 0.5, kind: 'cloth' });
      const hem = []; for (let i = 0; i <= 12; i++) { const x = lerp(-0.87, -0.014, i / 12); hem.push([x, 0.36 + 0.03 * Math.sin(i * 1.7), 0.096 - 0.01 * Math.sin(i * 2.3)]); }
      const tp = []; for (let i = 12; i >= 0; i--) { const x = lerp(-0.87, -0.014, i / 12); tp.push([x, (hisDuvetH(Math.max(-0.86, x), 0.105) || MT) , 0.098]); }
      GG.piece(g, poly(cam.xy(hem.concat(tp))).path(1.4, 174), { fill: '#222A3E', tex: 0.5, kind: 'cloth', seed: 175 });
    }
    // ---- the streetlight: straight slats across her made half only
    slats(g, cam, tod, [[0, 1, 0], MT + 0.052], [herD, herF], 0.26);
    if (herSide) slats(g, cam, tod, [[1, 0, 0], 0.842], [herSide], 0.13);
    out.pieces = { sheet, hisP, herP, hisD, herD, herF, herSide, hb: hbPaths };
  }
  // the tall window beside her table: its reveal, the vertical blind's dark vanes, and between them the night lit by the streetlight
  // (cut into bands) and the building opposite with a few cold windows lit; 'later' they are all dark
  function nightWindow(g, cam, tod) {
    const w = R.window, z = w.z, ins = 0.13;
    // the architrave, the right reveal (the camera sees into the window's depth on that side), the opening
    quad(g, cam, [[w.x0 - 0.05, w.y0 - 0.03, z - 0.004], [w.x1 + 0.05, w.y0 - 0.03, z - 0.004], [w.x1 + 0.05, w.y1 + 0.05, z - 0.004], [w.x0 - 0.05, w.y1 + 0.05, z - 0.004]], { fill: '#1A2131', rough: 0.6, seed: 200, tex: 0.5, kind: 'card', lift: [0, 6], liftAlpha: 0.5, liftBlur: 8 });
    const op = cam.xy([[w.x0, w.y0, z], [w.x1, w.y0, z], [w.x1, w.y1, z], [w.x0, w.y1, z]]), opening = poly(op).path(0.4, 201);
    g.save(); g.clip(opening);
    // the night outside, lit from below by the streetlight: cut bands, coldest and brightest low on the right
    g.fillStyle = '#121827'; g.fill(opening);
    const sl = cam.p(w.x1 + 0.1, w.y0 + 0.18, z + 1.5), k = cam.k(w.x1, w.y0, z);
    [[1.0, '#182032'], [0.66, '#232C44'], [0.42, '#34405E'], [0.24, '#4C5B82'], [0.11, '#6E82B0']].forEach(([rr, col], i) => { g.fillStyle = col; g.fill(O.S().ellipse(sl[0], sl[1], rr * k, rr * k * 0.85).path(2.6, 220 + i)); });
    // the building opposite, high in the glass: a dark block, its windows in a grid
    const bld = cam.xy([[w.x0 - 0.3, w.y0 + 0.44, z + ins], [w.x1 + 0.3, w.y0 + 0.4, z + ins], [w.x1 + 0.3, w.y1 + 0.3, z + ins], [w.x0 - 0.3, w.y1 + 0.3, z + ins]]);
    GG.piece(g, poly(bld).path(0.8, 202), { fill: '#10141F', tex: 0.5, seed: 203, kind: 'card' });
    const lit = tod === 'later' ? [] : [[0, 0], [2, 1], [3, 0], [1, 2], [4, 3], [2, 4], [3, 2], [0, 3]], r = O.rng('opposite');
    for (let row = 0; row < 6; row++) for (let col = 0; col < 5; col++) {
      const x = w.x0 - 0.04 + col * 0.11, y = w.y0 + 0.5 + row * 0.15, on = lit.some(([a, b2]) => a === col && b2 === row);
      const q = cam.xy([[x, y, z + ins], [x + 0.07, y, z + ins], [x + 0.07, y + 0.1, z + ins], [x, y + 0.1, z + ins]]);
      g.fillStyle = on ? (r() < 0.5 ? '#5F7098' : '#7E93C2') : '#171D2C'; g.fill(poly(q).path(0.4, 210 + row * 6 + col));
    }
    g.restore();
    // the vanes: dark strips of card, each turned a little, a thin cold rim where the light slips past
    VANES.forEach(([x0, pitch], i) => {
      const a = x0 + 0.003, b = x0 + pitch * 0.4, q = [[a, w.y0 + 0.07, z - 0.025], [b, w.y0 + 0.07, z - 0.045], [b, w.y1 - 0.05, z - 0.045], [a, w.y1 - 0.05, z - 0.025]];
      const p = quad(g, cam, q, { fill: '#151B29', rough: 0.4, seed: 230 + i, tex: 0.45, kind: 'card', lift: [-3, 4], liftAlpha: 0.55, liftBlur: 3 });
      cres(g, p, 2, 0, '#4C5B82', 0.7);
      const wt = cam.xy([[a, w.y0 + 0.07, z - 0.035], [b, w.y0 + 0.07, z - 0.04], [b, w.y0 + 0.095, z - 0.04], [a, w.y0 + 0.095, z - 0.035]]); g.fillStyle = '#0E121C'; g.fill(poly(wt).path(0, 1));
    });
    // the head rail; the sill, with the slats of light already lying across it
    quad(g, cam, [[w.x0 - 0.02, w.y1 - 0.06, z - 0.06], [w.x1 + 0.02, w.y1 - 0.06, z - 0.06], [w.x1 + 0.02, w.y1, z - 0.06], [w.x0 - 0.02, w.y1, z - 0.06]], { fill: '#232B40', rough: 0.4, seed: 240, tex: 0.4 });
    const sill = quad(g, cam, [[w.x0 - 0.06, w.y0, z - 0.08], [w.x1 + 0.06, w.y0, z - 0.08], [w.x1 + 0.06, w.y0, z + ins], [w.x0 - 0.06, w.y0, z + ins]], { fill: '#283149', rough: 0.5, seed: 241, tex: 0.4, kind: 'card', lift: [0, 6], liftAlpha: 0.6, liftBlur: 6 });
    quad(g, cam, [[w.x0 - 0.06, w.y0 - 0.025, z - 0.08], [w.x1 + 0.06, w.y0 - 0.025, z - 0.08], [w.x1 + 0.06, w.y0, z - 0.08], [w.x0 - 0.06, w.y0, z - 0.08]], { fill: '#1A2030', rough: 0.4, seed: 242, tex: 0.4 });
    slats(g, cam, tod, [[0, 1, 0], w.y0 + 0.001], [sill], 0.3);
  }
  // his duvet's turned-back flap (front(): it lies across his chest, over the rig's body)
  function hisFlap(g, cam) {
    const kT = cam.k(0, MT, 1.6), step = clamp(7 / kT, 0.0025, 0.014), blur = clamp(step * kT * 0.42, 1.8, 6);
    const fl = field(g, cam, { x0: -0.87, x1: -0.014, z0: 0.95, z1: 1.66, h: hisFoldH, step, blur, shade: shadeNight, cols: N.hisFold, bands: [0.3, 0.6], seed: 181, kind: 'cloth', tex: 0.5, lift: cam.flop ? [-6, 12] : [0, 10], liftAlpha: 0.75, liftBlur: 12 });
    const P3 = (x, z) => { const y = hisFoldH(x, z); return y == null ? null : [x, y + 0.003, z]; };
    rcres(g, fl, cam.flop ? 0.004 * kT : 0, -0.012 * kT, '#4E5E84', 0.9);
    [[-0.7, 0.5], [-0.2, 0.4]].forEach(([x, u], i) => { const pts = []; for (let j = 0; j <= 5; j++) { const xx = x + j * 0.03 - 0.07, top = hisTop(xx), w = foldW(xx), q = P3(xx, top - w * (u + 0.25 * Math.sin(j + i))); if (q) pts.push(q); } if (pts.length > 2) onPieces(g, [fl], t => crease(t, cam.xy(pts), { w: Math.max(3, 0.007 * kT), dy: -2, dark: 'rgba(10,13,22,0.45)', light: 'rgba(86,102,138,0.3)' })); });
    return fl;
  }
  // the phone's light, smooth (never banded): from the screen toward his face, over her pillow, the seam, his pillow, the flap
  function phoneLight(g, cam, pieces, which) {
    const P = R.phone, Fc = R.face, mid = [lerp(P[0], Fc[0], 0.42), P[1] - 0.02, lerp(P[2], Fc[2], 0.42)];
    const m = cam.p(mid), k = cam.k(mid[0], mid[1], mid[2]), ph = cam.p(P[0] - 0.05, P[1] - 0.03, P[2]);
    onPieces(g, pieces, t => {
      GG.glow(t, m[0], m[1], 0.5 * k, N.glow, which === 'front' ? 0.3 : 0.34, 'screen', 0.78);
      GG.glow(t, ph[0], ph[1], 0.2 * k, N.glowHot, 0.34, 'screen', 0.7);
    }, 'screen', 1);
  }

  // ---------------------------------------------------------------- the night cameras
  const CAM = {
    // high over the foot of the bed, dead centre, a long lens: C1's plan, the pillow seam on the centre line
    foot: camera({ target: [0, 0.62, 1.22], dist: 7.0, pitch: -1.0, f: 7.0 * 520, place: [[0, 1.12, 2.255], 960, 168] }),
    // across the bed from her side, high and long (B1), flopped: the headboard at the left, he faces us over her pillow
    across: camera({ target: [0.1, 0.62, 1.5], dist: 9.0, yaw: -Math.PI / 2, pitch: -0.46, f: 9.0 * 1000, flop: true, place: [R.phone, 530, 600] }),
    // the insert: the smooth pillow and the phone on it, on the same axis, much closer
    hand: camera({ target: R.phone, dist: 9.0, yaw: -Math.PI / 2, pitch: -0.42, f: 9.0 * 1750, flop: true, place: [R.phone, 1010, 600] }),
  };

  function nightState(s) {
    s = s || {}; const tod = s.tod === 'later' ? 'later' : 'night';
    return { tod, later: s.later != null ? clamp(s.later, 0, 1) : (tod === 'later' ? 1 : 0), glow: s.glow == null ? 1 : clamp(s.glow, 0, 1), res: s.res || 1 };
  }
  // the screen-space box of a height field (sampled), padded
  function fieldBox(cam, h, x0, x1, z0, z1, pad) {
    let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
    for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) { const x = lerp(x0, x1, i / 40), z = lerp(z0, z1, j / 40), y = h(x, z); if (y == null) continue; const q = cam.p(x, y, z); a = Math.min(a, q[0]); b = Math.min(b, q[1]); c = Math.max(c, q[0]); d = Math.max(d, q[1]); }
    a = Math.max(-MG, Math.floor(a - pad)); b = Math.max(-MG, Math.floor(b - pad)); c = Math.min(W + MG, Math.ceil(c + pad)); d = Math.min(H + MG, Math.ceil(d + pad));
    return [a, b, Math.max(8, c - a), Math.max(8, d - b)];
  }
  // the parts of a night view: the room (per tod), the phone's light on it, the flap (front), the light on the flap
  function nightView(name) {
    const cam = CAM[name];
    const FRAG = {};
    const room = (c, tod, res) => layer(c, name + ':room:' + tod, g => { const o = {}; nightRoom(g, cam, name, tod, o); FRAG[res] = o.pieces; }, res);
    // the light's box: around the glow between the phone and his face
    const P = R.phone, Fc = R.face, mid = [lerp(P[0], Fc[0], 0.42), P[1] - 0.02, lerp(P[2], Fc[2], 0.42)], m = cam.p(mid), km = cam.k(mid[0], mid[1], mid[2]);
    const LB = [Math.floor(m[0] - 0.52 * km), Math.floor(m[1] - 0.42 * km), Math.ceil(1.04 * km), Math.ceil(0.84 * km)];
    const light = (c, res) => boxLayer(c, name + ':light', LB, g => {
      let pcs = FRAG[res]; if (!pcs) { const t2 = O.makeCanvas(Math.ceil((W + 2 * MG) * res), Math.ceil((H + 2 * MG) * res)).getContext('2d'); t2.setTransform(res, 0, 0, res, MG * res, MG * res); const o = {}; nightRoom(t2, cam, name, 'night', o); pcs = FRAG[res] = o.pieces; }
      const dx = (MG + LB[0]) * res, dy = (MG + LB[1]) * res, sh = p => p && { cv: p.cv, x: p.x - dx, y: p.y - dy };
      phoneLight(g, cam, [pcs.sheet, pcs.hisP, pcs.herP, pcs.hisD, pcs.herD, pcs.herF].map(sh).concat(pcs.hb || []), 'back');
    }, res);
    const FB = fieldBox(cam, hisFoldH, -0.87, -0.014, 0.9, 1.66, 40);
    const flapPiece = {};
    const flap = (c, res) => boxLayer(c, name + ':flap', FB, g => { flapPiece[res] = hisFlap(g, cam); }, res);
    const flapLight = (c, res) => boxLayer(c, name + ':flaplight', FB, g => { if (!flapPiece[res]) { const tg = O.makeCanvas(g.canvas.width, g.canvas.height).getContext('2d'); tg.setTransform(g.getTransform()); flapPiece[res] = hisFlap(tg, cam); } phoneLight(g, cam, [flapPiece[res]], 'front'); }, res);
    return {
      back(c, t, s) {
        s = nightState(s);
        if (s.later < 1) blit(c, room(c, 'night', s.res));
        if (s.later > 0) blit(c, room(c, 'later', s.res), s.later < 1 ? s.later : null);
        if (s.glow > 0) blitBox(c, light(c, s.res), LB, s.glow, 'screen');
      },
      front(c, t, s) {
        s = nightState(s);
        blitBox(c, flap(c, s.res), FB);
        if (s.glow > 0) blitBox(c, flapLight(c, s.res), FB, s.glow, 'screen');
      },
      cam,
    };
  }

  // ================================================================ THE WARDROBE BY DAY: wardrobe, shelf
  const WCAM = {
    // from her side of the room, standing, looking straight at his wall: an elevation, verticals vertical; flopped
    wardrobe: camera({ pos: [1.25, 1.92, 0.6], yaw: -Math.PI / 2, pitch: 0, f: 2050, flop: true, place: [[R.wardrobe.x1, 2.06, 0.6], 960, 56] }),
    // the shelf: high and close, looking down on its dust; his things on the left, the bag on the right
    shelf: camera({ pos: [-1.22, 2.0, 0.58], yaw: -Math.PI / 2, pitch: -0.46, f: 1250, flop: true, place: [[-1.82, 1.78, 0.6], 960, 860] }),
  };
  const BAGFOOT = { x0: -2.07, x1: -1.93, z0: 0.18, z1: 0.44 };
  // door angle (0 shut .. 1 open, about 105 degrees) -> the door's quad in the world
  function doorQuad(which, a) {
    const w = R.wardrobe, ang = a * 1.83, hz = which === 'left' ? w.z1 : w.z0, dirz = which === 'left' ? -1 : 1, Wd = 0.6;
    const fx = w.x1 + Wd * Math.sin(ang), fz = hz + dirz * Wd * Math.cos(ang);
    return { hinge: [w.x1, hz], free: [fx, fz], y0: 0.08, y1: w.y1 - 0.02, ang };
  }
  // a face, only if the camera can see it
  const vq = (g, cam, n, pts, o) => cam.sees(n, pts[0]) ? quad(g, cam, pts, o) : null;
  // BEHIND the bare hangers: his wall, the floor, the window's light, the wardrobe's inside, the rail, his clothes
  function wardrobeBehind(g, cam) {
    const w = R.wardrobe;
    g.fillStyle = D.wallShade; g.fillRect(-MG, -MG, W + 2 * MG, H + 2 * MG);
    const wall = quad(g, cam, [[R.hisWallX, 0, -1.7], [R.hisWallX, 0, 2.3], [R.hisWallX, R.ceil, 2.3], [R.hisWallX, R.ceil, -1.7]], { fill: D.wall, rough: 0, tex: 0.6, seed: 401, kind: 'paper' });
    quad(g, cam, [[R.hisWallX, 0, -1.7], [R.hisWallX, 0, 2.3], [1.2, 0, 2.3], [1.2, 0, -1.7]], { fill: D.floor, rough: 0, tex: 0.55, seed: 402, kind: 'card' });
    for (let x = R.hisWallX; x < 1.2; x += 0.145) line3(g, cam, [[x, 0, -1.7], [x, 0, 2.3]], 'rgba(40,40,44,0.25)', 1.5);
    quad(g, cam, [[R.hisWallX + 0.012, 0, -1.7], [R.hisWallX + 0.012, 0, 2.3], [R.hisWallX + 0.012, 0.09, 2.3], [R.hisWallX + 0.012, 0.09, -1.7]], { fill: D.skirt, rough: 0.5, tex: 0.4, seed: 403 });
    // the window's daylight on his wall: one soft slanted patch in two cut bands (the window is behind us, to the left)
    {
      const P = (z, y) => [R.hisWallX + 0.001, y, z];
      const L = tmp(g.canvas.width, g.canvas.height, 3); L.setTransform(g.getTransform());
      const pane = (z0, z1, y0, y1, sk) => { const q = cam.xy([P(z0, y0), P(z1, y0 - sk), P(z1, y1 - sk), P(z0, y1)]); L.beginPath(); q.forEach((p, i) => i ? L.lineTo(p[0], p[1]) : L.moveTo(p[0], p[1])); L.closePath(); L.fill(); };
      L.fillStyle = D.wallLit; pane(1.05, -0.95, 0.35, 2.35, 0.32);
      L.fillStyle = D.wallHi; pane(0.62, -0.62, 0.62, 2.12, 0.3);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.85; g.filter = 'blur(5px)'; g.drawImage(L.canvas, 0, 0); g.restore();
      GG.texture(g, wall, 0.35, 404, 'paper');
    }
    // the carcass's inside: back panel, inner sides, its floor, the underside of its top
    const yi0 = 0.08, yi1 = w.y1 - 0.03, xb = w.x0 + 0.02, xf = w.x1, zl = w.z1 - 0.02, zr = w.z0 + 0.02;
    const back = quad(g, cam, [[xb, yi0, zr], [xb, yi0, zl], [xb, yi1, zl], [xb, yi1, zr]], { fill: D.back, rough: 0.4, seed: 411, tex: 0.55, kind: 'card' });
    // the daylight falling into it from the left front: the right part bright, the left side's shadow over his clothes
    {
      const L = tmp(g.canvas.width, g.canvas.height, 3); L.setTransform(g.getTransform());
      const q = cam.xy([[xb + 0.001, yi0, 0.84], [xb + 0.001, yi0, zr], [xb + 0.001, yi1, zr], [xb + 0.001, yi1, 0.92]]);
      L.fillStyle = D.backLit; L.fill(poly(q).path(2.2, 412));
      const q2 = cam.xy([[xb + 0.001, yi0, 0.52], [xb + 0.001, yi0, zr], [xb + 0.001, yi1, zr], [xb + 0.001, yi1, 0.6]]);
      L.fillStyle = '#86847D'; L.fill(poly(q2).path(2.2, 413));
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.9; g.drawImage(L.canvas, 0, 0); g.restore();
      GG.texture(g, back, 0.3, 414, 'card');
    }
    vq(g, cam, [0, 0, -1], [[xb, yi0, zl], [xf, yi0, zl], [xf, yi1, zl], [xb, yi1, zl]], { fill: D.inSide, rough: 0.4, seed: 415, tex: 0.5, kind: 'card' });
    vq(g, cam, [0, 0, 1], [[xb, yi0, zr], [xf, yi0, zr], [xf, yi1, zr], [xb, yi1, zr]], { fill: D.inSideLit, rough: 0.4, seed: 416, tex: 0.5, kind: 'card' });
    vq(g, cam, [0, -1, 0], [[xb, yi1, zr], [xf, yi1, zr], [xf, yi1, zl], [xb, yi1, zl]], { fill: D.backDeep, rough: 0.4, seed: 417, tex: 0.5, kind: 'card' });
    vq(g, cam, [0, 1, 0], [[xb, yi0, zr], [xf, yi0, zr], [xf, yi0, zl], [xb, yi0, zl]], { fill: '#6B6A64', rough: 0.4, seed: 418, tex: 0.5, kind: 'card' });
    // his shoes on the wardrobe's floor
    [[0.98, 0], [1.08, 0.01]].forEach(([z], i) => { const q = cam.xy([[-2.2, yi0, z], [-1.96, yi0, z + 0.01], [-1.96, yi0 + 0.07, z + 0.01], [-2.08, yi0 + 0.1, z], [-2.2, yi0 + 0.08, z]]); GG.piece(g, poly(q).path(1, 420 + i), { fill: '#2B2725', tex: 0.4, seed: 421 + i, lift: [-3, 3], liftAlpha: 0.4, liftBlur: 4 }); });
    // the rail
    const ry = w.rail, rx = -2.1;
    line3(g, cam, [[rx, ry - 0.006, zr], [rx, ry - 0.006, zl]], 'rgba(30,30,32,0.35)', 0.03 * cam.k(rx, ry, 0.6));
    line3(g, cam, [[rx, ry, zr], [rx, ry, zl]], D.rail, 0.02 * cam.k(rx, ry, 0.6));
    line3(g, cam, [[rx, ry + 0.005, zr], [rx, ry + 0.005, zl]], D.railHi, 0.006 * cam.k(rx, ry, 0.6));
    // his clothes, crowded on the left of the rail, seen from the side as they hang; a pair of trousers; a shirt turned to us
    const garments = [[1.14, D.jacket, 0.98, 0.16], [1.09, D.sweater, 0.66, 0.15], [1.045, D.shirtB, 0.82, 0.13], [1.0, '#4A4F55', 0.5, 0.1, 'trousers'], [0.96, D.tee, 0.62, 0.12], [0.915, D.shirtA, 0.84, 0.13], [0.87, D.flannel, 0.8, 0.14], [0.83, D.shirtB, 0.83, 0.13], [0.785, D.shirtA, 0.84, 0.12, 'turned'], [0.73, D.jacket, 0.95, 0.15]];
    garments.forEach(([z, col, len, wd, kind], i) => garment(g, cam, rx, ry, z, col, len, wd, 460 + i * 5, kind));
    // the left side panel's shadow across the clothes nearest it
    { const q = cam.xy([[xf, yi0, zl - 0.02], [xf, yi0, 1.0], [xf, yi1, 1.06], [xf, yi1, zl - 0.02]]); g.save(); g.globalAlpha = 0.22; g.fillStyle = '#2A2C30'; g.filter = 'blur(6px)'; g.fill(poly(q).path(3, 470)); g.restore(); }
  }
  // OVER the bare hangers: the shelf (his things, her half's dust and the clean rectangle), the carcass's front frame and sides
  function wardrobeOver(g, cam) {
    const w = R.wardrobe, xb = w.x0 + 0.02, xf = w.x1, zl = w.z1 - 0.02, zr = w.z0 + 0.02, sy = w.shelf, sx0 = xb, sx1 = xf - 0.02;
    const shelfTop = vq(g, cam, [0, 1, 0], [[sx0, sy, zr], [sx1, sy, zr], [sx1, sy, zl], [sx0, sy, zl]], { fill: '#827C72', rough: 0.4, seed: 431, tex: 0.55, kind: 'card', lift: [0, 4], liftAlpha: 0.4, liftBlur: 6 });
    if (shelfTop) {
      // the wood's grain, then on her half the dust: a pale film, flecks, a felt of fibres; where the bag sat, the shelf as it was
      for (let i = 0; i < 9; i++) line3(g, cam, [[lerp(sx0, sx1, (i + 0.5) / 9), sy + 0.0005, zr], [lerp(sx0, sx1, (i + 0.5) / 9) + 0.01, sy + 0.0005, zl]], 'rgba(70,64,56,0.18)', Math.max(1, 0.0015 * cam.k(sx0, sy, 0.6)));
      const fp = BAGFOOT;
      const L = tmp(g.canvas.width, g.canvas.height, 3); L.setTransform(g.getTransform());
      // the film: small cells of dust whose density follows a slow noise and falls away across the middle of the shelf
      const nz = 64, nxx = 24;
      for (let i = 0; i < nxx; i++) for (let j = 0; j < nz; j++) {
        const x0 = lerp(sx0, sx1, i / nxx), x1 = lerp(sx0, sx1, (i + 1) / nxx), z0 = lerp(zr, zl, j / nz), z1 = lerp(zr, zl, (j + 1) / nz), zc = (z0 + z1) / 2;
        const dens = clamp(0.82 * (1 - ss(0.5 + 0.06 * Math.sin(x0 * 40), 0.7, zc)) + 0.1 + (O.fbm(x0 * 9, zc * 9, 77, 3) - 0.5) * 0.5, 0.06, 0.9);
        L.globalAlpha = dens; L.fillStyle = D.dust; L.beginPath(); cam.xy([[x0, sy, z0], [x1, sy, z0], [x1, sy, z1], [x0, sy, z1]]).forEach((q, k) => k ? L.lineTo(q[0], q[1]) : L.moveTo(q[0], q[1])); L.closePath(); L.fill();
      }
      L.globalAlpha = 1;
      { const T2 = L.getTransform(); L.setTransform(1, 0, 0, 1, 0, 0); L.filter = 'blur(2px)'; L.globalCompositeOperation = 'copy'; L.drawImage(L.canvas, 0, 0); L.filter = 'none'; L.globalCompositeOperation = 'source-over'; L.setTransform(T2); }
      const r = O.rng('dust');
      for (let i = 0; i < 1600; i++) { const x = lerp(sx0, sx1, r()), z = lerp(zr, 0.66, r() ** 0.85), q = cam.p(x, sy, z), s2 = (0.0007 + r() * 0.0016) * cam.k(x, sy, z); L.fillStyle = r() < 0.6 ? 'rgba(206,202,190,0.45)' : 'rgba(96,92,84,0.45)'; L.beginPath(); L.ellipse(q[0], q[1], s2, s2 * 0.55, r() * 3, 0, 7); L.fill(); }
      L.lineCap = 'round';
      for (let i = 0; i < 120; i++) { const x = lerp(sx0, sx1, r()), z = lerp(zr, 0.58, r()), q = cam.p(x, sy, z), k = cam.k(x, sy, z), an = r() * 6.28, l = (0.004 + r() * 0.012) * k; L.strokeStyle = 'rgba(220,216,204,0.6)'; L.lineWidth = Math.max(0.6, 0.0007 * k); L.beginPath(); L.moveTo(q[0], q[1]); L.quadraticCurveTo(q[0] + Math.cos(an) * l * 0.6 + 2, q[1] + Math.sin(an) * l * 0.3, q[0] + Math.cos(an) * l, q[1] + Math.sin(an) * l * 0.5); L.stroke(); }
      // the clean rectangle: cut out of the dust, crisp, a little dust banked along its edges
      const cr = cam.xy([[fp.x0, sy, fp.z0], [fp.x1, sy, fp.z0], [fp.x1, sy, fp.z1], [fp.x0, sy, fp.z1]]), crp = poly(cr).path(0.5, 433);
      L.globalCompositeOperation = 'destination-out'; L.fill(crp); L.globalCompositeOperation = 'source-over';
      L.strokeStyle = 'rgba(224,220,208,0.7)'; L.lineWidth = Math.max(1.2, 0.003 * cam.k(fp.x0, sy, 0.3)); L.stroke(crp);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(L.canvas, 0, 0); g.restore();
    }
    // his half of the shelf: folded sweaters, a shoebox
    const stack = (z0, z1, y0, cols, seed) => cols.forEach((col, i) => { const ya = y0 + i * 0.05, yb = ya + 0.05; const f = boxFaces(g, cam, { x0: -2.3, x1: -1.92 + 0.01 * Math.sin(i), y0: ya, y1: yb, z0: z0 + 0.012 * Math.sin(i * 2), z1: z1 + 0.01 * Math.cos(i * 3) }, { top: O.mix(col, '#FFFFFF', 0.12), front: col, side: O.mix(col, '#000000', 0.25) }, { rough: 1.2, seed: seed + i * 7, kind: 'wool', tex: 0.6 }); f.forEach(p => cres(g, p, 0, -3, O.mix(col, '#FFFFFF', 0.2), 0.6)); });
    stack(0.9, 1.14, sy + 0.002, [D.sweater, '#4A4F55', D.flannel], 440);
    boxFaces(g, cam, { x0: -2.32, x1: -1.98, y0: sy + 0.002, y1: sy + 0.12, z0: 0.64, z1: 0.86 }, { top: '#8A6F55', front: '#6E5642', side: '#5A4636' }, { rough: 0.8, seed: 450, kind: 'card', tex: 0.5 });
    // the shelf's front edge, lit; a line of dust along her half of it
    quad(g, cam, [[sx1, sy - 0.022, zr], [sx1, sy - 0.022, zl], [sx1, sy, zl], [sx1, sy, zr]], { fill: D.shelfEdge, rough: 0.5, seed: 435, tex: 0.4, kind: 'card', lift: [0, 6], liftAlpha: 0.45, liftBlur: 6 });
    line3(g, cam, [[sx1 + 0.001, sy - 0.001, zr], [sx1 + 0.001, sy - 0.001, 0.6]], 'rgba(222,218,208,0.8)', Math.max(1.2, 0.0022 * cam.k(sx1, sy, 0.3)));
    // the front frame of the carcass, its outer sides and its top
    const fc = { fill: D.carcass, rough: 0.6, tex: 0.5, kind: 'card' };
    quad(g, cam, [[xf, 0, w.z1 - 0.025], [xf, 0, w.z1], [xf, w.y1, w.z1], [xf, w.y1, w.z1 - 0.025]], Object.assign({ seed: 481, lift: [-4, 0], liftAlpha: 0.4, liftBlur: 6 }, fc, { fill: D.carcassShade }));
    quad(g, cam, [[xf, 0, w.z0], [xf, 0, w.z0 + 0.025], [xf, w.y1, w.z0 + 0.025], [xf, w.y1, w.z0]], Object.assign({ seed: 482, lift: [4, 0], liftAlpha: 0.4, liftBlur: 6 }, fc));
    quad(g, cam, [[xf, w.y1 - 0.03, w.z0], [xf, w.y1 - 0.03, w.z1], [xf, w.y1, w.z1], [xf, w.y1, w.z0]], Object.assign({ seed: 483 }, fc));
    quad(g, cam, [[xf, 0, w.z0], [xf, 0, w.z1], [xf, 0.08, w.z1], [xf, 0.08, w.z0]], Object.assign({ seed: 484 }, fc, { fill: D.carcassShade }));
    vq(g, cam, [0, 0, 1], [[w.x0, 0, w.z1], [xf, 0, w.z1], [xf, w.y1, w.z1], [w.x0, w.y1, w.z1]], { fill: D.carcassShade, rough: 0.6, seed: 485, tex: 0.5, kind: 'card' });
    vq(g, cam, [0, 0, -1], [[w.x0, 0, w.z0], [xf, 0, w.z0], [xf, w.y1, w.z0], [w.x0, w.y1, w.z0]], { fill: D.carcass, rough: 0.6, seed: 486, tex: 0.5, kind: 'card' });
    vq(g, cam, [0, 1, 0], [[w.x0, w.y1, w.z0], [xf, w.y1, w.z0], [xf, w.y1, w.z1], [w.x0, w.y1, w.z1]], { fill: D.carcassDeep, rough: 0.6, seed: 487, tex: 0.5, kind: 'card' });
  }
  // a garment on its hanger, seen edge-on from the front of the wardrobe: hook, shoulder, the sleeve falling, the hem
  function garment(g, cam, rx, ry, z, col, len, wd, seed, kind) {
    const top = ry + 0.035, xs = [rx - 0.2, rx + 0.2], k = cam.k(rx, ry, z);
    const hook = cam.xy([[rx, ry + 0.005, z], [rx, ry + 0.06, z]]); g.strokeStyle = '#8E8F8C'; g.lineWidth = Math.max(1.5, 0.004 * k); g.beginPath(); g.moveTo(hook[1][0], hook[1][1]); g.arc((hook[0][0] + hook[1][0]) / 2, hook[0][1] - 0.012 * k, 0.012 * k, Math.PI * 0.5, Math.PI * 1.8, true); g.stroke();
    const r = O.rng('g' + seed), pts = [];
    if (kind === 'turned') {                                           // the front shirt, turned on its hanger: we see its front, collar and placket
      const hw = 0.21, P = (u, y) => [rx + 0.06, y, z + u];
      const body = cam.xy([P(-hw * 0.55, top + 0.01), P(hw * 0.55, top + 0.01), P(hw, top - 0.05), P(hw * 0.94, top - len), P(-hw * 0.94, top - len), P(-hw, top - 0.05)]);
      const sh = GG.blob(body.map((q, i) => [q[0], q[1], i === 3 || i === 4 ? 1 : 0]));
      const p = GG.piece(g, sh.path ? sh.path(1.2, seed) : sh, { fill: col, tex: 0.6, kind: 'cloth', seed, lift: [-6, 8], liftAlpha: 0.45, liftBlur: 8 });
      cres(g, p, -6, -4, O.mix(col, '#FFFFFF', 0.18), 0.8); cres(g, p, 8, 0, O.mix(col, '#000000', 0.22), 0.6);
      const pl = cam.xy([P(0, top - 0.02), P(0, top - len + 0.02)]); g.strokeStyle = O.mix(col, '#000000', 0.18); g.lineWidth = Math.max(1.5, 0.003 * k); g.beginPath(); g.moveTo(pl[0][0], pl[0][1]); g.lineTo(pl[1][0], pl[1][1]); g.stroke();
      for (let b = 0; b < 5; b++) { const q = cam.p(...P(0.012, top - 0.08 - b * len * 0.17)); g.fillStyle = O.mix(col, '#FFFFFF', 0.3); g.beginPath(); g.arc(q[0], q[1], 0.005 * k, 0, 7); g.fill(); }
      const coll = cam.xy([P(-0.07, top + 0.012), P(0, top - 0.04), P(0.07, top + 0.012), P(0.04, top + 0.02), P(0, top - 0.012), P(-0.04, top + 0.02)]);
      GG.piece(g, poly(coll).path(0.6, seed + 1), { fill: O.mix(col, '#FFFFFF', 0.15), tex: 0.4, kind: 'cloth', seed: seed + 2 });
      return;
    }
    // edge-on: the near shoulder and sleeve hang in a strip that widens to the hem
    const P = (x, y, dz) => [x, y, z + dz];
    const outline = kind === 'trousers'
      ? [P(rx, top - 0.02, -wd * 0.5), P(rx, top - 0.02, wd * 0.5), P(rx, top - len * 0.5, wd * 0.55), P(rx, top - len, wd * 0.5), P(rx, top - len - 0.005, -wd * 0.5), P(rx, top - len * 0.5, -wd * 0.55)]
      : [P(rx, top + 0.01, -wd * 0.25), P(rx, top + 0.01, wd * 0.25), P(rx, top - 0.06, wd * 0.55), P(rx, top - len * 0.55, wd * 0.62 + r() * 0.02), P(rx, top - len, wd * 0.6), P(rx, top - len - 0.01, -wd * 0.55), P(rx, top - len * 0.5, -wd * 0.62), P(rx, top - 0.06, -wd * 0.5)];
    const q = cam.xy(outline);
    const corner = kind === 'trousers' ? [3, 4] : [4, 5];
    const p = GG.piece(g, GG.blob(q.map((v, i) => [v[0], v[1], corner.includes(i) ? 1 : 0])).path(1.3, seed), { fill: col, tex: 0.6, kind: col === D.sweater ? 'wool' : 'cloth', seed, lift: [-5, 6], liftAlpha: 0.5, liftBlur: 7 });
    cres(g, p, 5, -3, O.mix(col, '#FFFFFF', 0.14), 0.75);
    // the sleeve's fold and the hanger's shoulder line
    const sl = cam.xy([P(rx, top - 0.05, wd * 0.15), P(rx, top - len * 0.6, wd * 0.3)]); g.strokeStyle = O.mix(col, '#000000', 0.25); g.lineWidth = Math.max(1.5, 0.003 * k); g.beginPath(); g.moveTo(sl[0][0], sl[0][1]); g.lineTo(sl[1][0], sl[1][1]); g.stroke();
  }
  // a bare hanger (wooden, pale), turned on the rail by angle th about its hook; it swings by sw radians
  function hanger(g, cam, rx, ry, z, th, sw, seed) {
    const k = cam.k(rx, ry, z), c = Math.cos(th), s = Math.sin(th);
    const P = (u, v) => { v += 0.045; const yy = ry - 0.01 - v * Math.cos(sw) + u * Math.sin(sw) * 0.3, uu = u * Math.cos(sw * 0.3); return [rx + uu * c, yy, z + uu * s]; };
    const hook = cam.xy([[rx, ry + 0.004, z], [rx, ry - 0.075, z]]); g.strokeStyle = '#8E8F8C'; g.lineWidth = Math.max(1.5, 0.004 * k); g.lineCap = 'round';
    g.beginPath(); g.moveTo(hook[1][0], hook[1][1]); g.lineTo(hook[1][0], hook[0][1] + 0.004 * k); g.arc(hook[1][0] + 0.011 * k, hook[0][1] + 0.004 * k, 0.011 * k, Math.PI, Math.PI * 1.9); g.stroke();
    const sh = new Path2D();
    [[P(0, 0.0), P(0.215, 0.086), P(0.21, 0.104), P(0, 0.026)], [P(0, 0.0), P(0, 0.026), P(-0.21, 0.104), P(-0.215, 0.086)], [P(-0.205, 0.092), P(0.205, 0.092), P(0.205, 0.106), P(-0.205, 0.106)]].forEach((q, i) => sh.addPath(O.S().poly(cam.xy(q)).path(0.3, seed + i)));
    shadow(g, sh, 0.035 * k, 0.02 * k, 4, 0.28, '#2A2A2E');
    GG.piece(g, sh, { fill: D.hanger, tex: 0.4, kind: 'card', seed });
    cres(g, sh, 0, -2, D.hangerHi, 0.8);
    const cb = cam.xy([P(-0.2, 0.104), P(0.2, 0.104)]); g.strokeStyle = D.hangerShade; g.lineWidth = Math.max(1, 0.003 * k); g.beginPath(); g.moveTo(cb[0][0], cb[0][1]); g.lineTo(cb[1][0], cb[1][1]); g.stroke();
    const dust = cam.xy([P(-0.2, 0.084), P(0, -0.002), P(0.2, 0.084)]); g.strokeStyle = 'rgba(206,202,190,0.5)'; g.lineWidth = Math.max(1, 0.0025 * k); g.beginPath(); g.moveTo(dust[0][0], dust[0][1]); g.quadraticCurveTo(dust[1][0], dust[1][1] - 2, dust[2][0], dust[2][1]); g.stroke();
  }
  // five bare hangers, each turned its own way on the rail; cut once into sprites, they swing about their hooks
  const HANGERS = [[0.52, 0.42], [0.42, -0.55], [0.32, 0.3], [0.215, 0.68], [0.11, -0.36]];
  function hangerSprites(c, cam, name, res) {
    return HANGERS.map(([z, th], i) => {
      const hk = cam.p(-2.1, R.wardrobe.rail, z), k = cam.k(-2.1, R.wardrobe.rail, z), bx = [Math.floor(hk[0] - 0.3 * k), Math.floor(hk[1] - 0.04 * k), Math.ceil(0.62 * k), Math.ceil(0.24 * k)];
      return { bx, hk, cv: boxLayer(c, name + ':hanger' + i, bx, g => hanger(g, cam, -2.1, R.wardrobe.rail, z, th, 0, 500 + i), res) };
    });
  }
  function drawHangers(c, cam, name, t, swing, res) {
    const g = c.g;
    hangerSprites(c, cam, name, res).forEach((h, i) => { const sw = swing * 0.09 * Math.sin(t * 5.2 + i * 1.9); g.save(); g.translate(h.hk[0], h.hk[1]); g.rotate(sw); g.translate(-h.hk[0], -h.hk[1]); g.drawImage(h.cv, h.bx[0], h.bx[1], h.bx[2], h.bx[3]); g.restore(); });
  }
  // the old floral makeup bag, broken zip: a soft pouch in 3D (so every camera sees the same bag), its faded print, the zip
  function drawBagAt(g, cam, C, o) {
    o = o || {}; const hz = 0.125, hy = 0.052, hx = 0.06, pts = [], top = [];
    for (let i = 0; i <= 16; i++) for (let j = 0; j <= 8; j++) {
      const u = -1 + 2 * i / 16, v = -1 + 2 * j / 8, sq = (a, p) => Math.sign(a) * Math.pow(Math.abs(a), p);
      const ex = 1 - Math.pow(Math.abs(u), 2.6); if (ex < 0) continue;
      const x = C[0] + hx * sq(v, 0.8) * Math.pow(ex, 0.38) * (1 - 0.35 * Math.max(0, (j / 8))), y = C[1] - hy + hy * 2 * Math.pow(ex, 0.3) * (1 - Math.abs(v) * 0.5), z = C[2] + hz * u;
      pts.push([x, C[1] - hy, z]); pts.push([x, y, z]);
      if (j === 4) top.push([C[0], y + 0.002, z]);
    }
    const sp = cam.xy(pts), hl = hull(sp), k = cam.k(C[0], C[1], C[2]);
    const shp = GG.blob(hl.filter((q, i) => i % 2 === 0));
    const path = shp.path(Math.max(0.6, 0.002 * k), 701);
    if (o.shadow !== false) { const fp = cam.xy([[C[0] - hx, C[1] - hy, C[2] - hz], [C[0] + hx, C[1] - hy, C[2] - hz], [C[0] + hx, C[1] - hy, C[2] + hz], [C[0] - hx, C[1] - hy, C[2] + hz]]); shadow(g, poly(fp).path(0.5, 702), 0.01 * k, 0.004 * k, 0.012 * k, 0.55, '#2A2622'); }
    const p = GG.piece(g, path, { fill: D.bag, tex: 0.7, kind: 'cloth', seed: 703, lift: [0.01 * k, 0.012 * k], liftAlpha: 0.35, liftBlur: 0.012 * k });
    // the faded floral print
    onPieces(g, [path], t => {
      const r = O.rng('flor-bag'); const bb = hl.reduce((a, q) => [Math.min(a[0], q[0]), Math.min(a[1], q[1]), Math.max(a[2], q[0]), Math.max(a[3], q[1])], [1e9, 1e9, -1e9, -1e9]);
      const sc = 0.01 * k;
      for (let i = 0; i < 34; i++) {
        const x = lerp(bb[0], bb[2], r()), y = lerp(bb[1], bb[3], r()), s = sc * (0.9 + r() * 0.9), col = D.flowers[i % 4];
        for (let q = 0; q < 5; q++) { const a = q / 5 * Math.PI * 2 + r(); t.fillStyle = col; t.beginPath(); t.ellipse(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.42, s * 0.26, a, 0, 7); t.fill(); }
        t.fillStyle = '#E2C26A'; t.beginPath(); t.arc(x, y, s * 0.2, 0, 7); t.fill();
        t.strokeStyle = '#6E7E5A'; t.lineWidth = Math.max(1, s * 0.16); t.beginPath(); t.moveTo(x + s * 0.5, y + s * 0.4); t.quadraticCurveTo(x + s, y + s * 1.2, x + s * 1.6, y + s); t.stroke();
      }
      t.globalCompositeOperation = 'multiply'; t.fillStyle = 'rgba(196,186,176,0.42)'; t.fillRect(bb[0] - 10, bb[1] - 10, bb[2] - bb[0] + 20, bb[3] - bb[1] + 20);
    });
    cres(g, path, 0.012 * k, -0.01 * k, D.bagHi, 0.55); cres(g, path, -0.014 * k, 0.012 * k, '#7E6A62', 0.5);
    // the zip along the ridge: tape, teeth; the slider gone, the last of it gaping open
    const ridge = cam.xy(top), n = ridge.length, cut = Math.floor(n * 0.7);
    g.save(); g.lineCap = 'round';
    const run = (a, b, off) => { g.beginPath(); for (let i = a; i < b; i++) { const q = ridge[i]; i === a ? g.moveTo(q[0], q[1] + off) : g.lineTo(q[0], q[1] + off); } g.stroke(); };
    g.strokeStyle = D.zipTape; g.lineWidth = Math.max(2, 0.009 * k); run(1, cut + 1, 0);
    g.strokeStyle = D.zip; g.lineWidth = Math.max(1, 0.0035 * k); g.setLineDash([Math.max(1.5, 0.003 * k), Math.max(1.5, 0.003 * k)]); run(1, cut + 1, -0.0005 * k);
    const gap = (side) => { g.beginPath(); for (let i = cut; i < n - 1; i++) { const u = (i - cut) / (n - 1 - cut), q = ridge[i], off = side * u * u * 0.014 * k; i === cut ? g.moveTo(q[0], q[1] + off) : g.lineTo(q[0] + off * 0.2, q[1] + off); } g.stroke(); };
    g.setLineDash([]); g.fillStyle = '#2E2624';
    { g.beginPath(); for (let i = cut; i < n - 1; i++) { const u = (i - cut) / (n - 1 - cut), q = ridge[i]; i === cut ? g.moveTo(q[0], q[1]) : g.lineTo(q[0], q[1] - u * u * 0.012 * k); } for (let i = n - 2; i >= cut; i--) { const u = (i - cut) / (n - 1 - cut), q = ridge[i]; g.lineTo(q[0], q[1] + u * u * 0.012 * k); } g.closePath(); g.fill(); }
    g.strokeStyle = D.zip; g.setLineDash([Math.max(1.5, 0.003 * k), Math.max(1.5, 0.003 * k)]); gap(-1); gap(1);
    g.restore();
    return p;
  }
  const wState = s => { s = s || {}; return { doors: s.doors == null ? 1 : clamp(s.doors, 0, 1), bag: s.bag === false || s.bag === 0 || s.bag === 'gone' ? 0 : 1, swing: s.swing || 0, res: s.res || 1 }; };
  // the doors, drawn live: each a pre-cut panel warped into its swung quad in vertical strips (pitch 0 keeps the hinges vertical)
  const DOORTEX = {};
  function doorTex(side) {
    if (DOORTEX[side]) return DOORTEX[side];
    const pw = 300, ph = 1000, c = O.makeCanvas(pw, ph), g = c.getContext('2d');
    const out = side === 'out', col = out ? D.door : D.doorIn;
    g.fillStyle = col; g.fillRect(0, 0, pw, ph); GG.texture(g, (() => { const p = new Path2D(); p.rect(0, 0, pw, ph); return p; })(), 0.6, out ? 601 : 602, 'card');
    if (out) {                                                        // a recessed panel, a knob near the meeting edge
      [[30, 40, 240, 440], [30, 520, 240, 440]].forEach(([x, y, w2, h2], i) => { const p = O.S().rect(x, y, w2, h2).path(0.8, 603 + i); g.strokeStyle = 'rgba(60,58,54,0.45)'; g.lineWidth = 5; g.stroke(p); g.save(); g.translate(-2, -2); g.strokeStyle = 'rgba(232,228,218,0.5)'; g.lineWidth = 2.5; g.stroke(p); g.restore(); });
    } else {
      g.strokeStyle = 'rgba(70,68,64,0.25)'; g.lineWidth = 3; g.strokeRect(18, 18, pw - 36, ph - 36);
    }
    return (DOORTEX[side] = c);
  }
  function drawDoor(g, cam, which, a) {
    const d = doorQuad(which, a), w = R.wardrobe;
    const n = [Math.cos(d.ang), 0, which === 'left' ? Math.sin(d.ang) : -Math.sin(d.ang)];       // the outer face's normal
    const D3 = (u, y) => [lerp(w.x1, d.free[0], u), y, lerp(d.hinge[1], d.free[1], u)];          // a point on the door: u 0 at the hinge .. 1 at the free edge
    const outSide = cam.sees(n, D3(0.5, 1)), k = cam.k(...D3(0.5, 1));
    const shp = poly(cam.xy([D3(0, d.y0), D3(1, d.y0), D3(1, d.y1), D3(0, d.y1)])).path(0.6, which === 'left' ? 611 : 612);
    g.save(); g.fillStyle = outSide ? D.door : D.doorIn; g.fill(shp);
    g.clip(shp); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.55; g.fillStyle = GG.texPattern(g, 'card', which === 'left' ? 601 : 602); g.fill(shp); g.restore();
    // the outer face's two recessed panels; the inner face plain
    if (outSide) [[0.1, 0.9, 0.08, 0.5], [0.1, 0.9, 0.56, 0.96]].forEach(([u0, u1, f0, f1], i) => {
      const y0 = lerp(d.y0, d.y1, f0), y1 = lerp(d.y0, d.y1, f1), q = cam.xy([D3(u0, y0), D3(u1, y0), D3(u1, y1), D3(u0, y1)]), p = poly(q).path(0.5, 603 + i);
      g.strokeStyle = 'rgba(60,58,54,0.45)'; g.lineWidth = Math.max(2, 0.006 * k); g.stroke(p); g.save(); g.translate(-1.5, -1.5); g.strokeStyle = 'rgba(232,228,218,0.5)'; g.lineWidth = Math.max(1, 0.003 * k); g.stroke(p); g.restore();
    });
    // its light: posterised by how the face turns to the window
    const Lw = nrm([0.9, 0.2, 0.5]), lit = Math.max(0, dot(outSide ? n : [-n[0], 0, -n[2]], Lw)), band = lit > 0.75 ? 0 : lit > 0.35 ? 0.16 : 0.32;
    if (band) { g.save(); g.globalAlpha = band; g.fillStyle = '#2A2B30'; g.fill(shp); g.restore(); }
    g.save(); g.strokeStyle = 'rgba(60,58,54,0.5)'; g.lineWidth = 1.5; g.stroke(shp); g.restore();
    // the free edge's thickness and the knob
    const e = cam.xy([D3(1, d.y0), D3(1, d.y1)]);
    g.strokeStyle = D.edge; g.lineWidth = Math.max(2, 0.018 * cam.k(d.free[0], 1, d.free[1]) * Math.abs(Math.sin(d.ang + 0.2))); g.beginPath(); g.moveTo(e[0][0], e[0][1]); g.lineTo(e[1][0], e[1][1]); g.stroke();
    if (outSide) { const kn = cam.p(...D3(0.9, 1.02)), kk = cam.k(d.free[0], 1, d.free[1]); g.fillStyle = 'rgba(30,28,26,0.4)'; g.beginPath(); g.arc(kn[0] + 2, kn[1] + 3, 0.014 * kk, 0, 7); g.fill(); g.fillStyle = D.knob; g.beginPath(); g.arc(kn[0], kn[1], 0.013 * kk, 0, 7); g.fill(); }
    return shp;
  }
  function wardrobeView(name) {
    const cam = WCAM[name];
    const behind = (c, res) => layer(c, name + ':behind', g => wardrobeBehind(g, cam), res);
    const over = (c, res) => layer(c, name + ':over', g => wardrobeOver(g, cam), res);
    const C = R.bag, kb = cam.k(C[0], C[1], C[2]), qb = cam.p(C), BB = [Math.floor(qb[0] - 0.24 * kb), Math.floor(qb[1] - 0.16 * kb), Math.ceil(0.48 * kb), Math.ceil(0.3 * kb)];
    const bagL = (c, res) => boxLayer(c, name + ':bag', BB, g => drawBagAt(g, cam, C), res);
    const doorBox = a => {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      ['left', 'right'].forEach(wh => { const d = doorQuad(wh, a); [[R.wardrobe.x1, d.hinge[1]], d.free].forEach(([x, z]) => [d.y0, d.y1].forEach(y => { const q = cam.p(x, y, z); x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); })); });
      x0 = Math.max(-MG, Math.floor(x0 - 30)); y0 = Math.max(-MG, Math.floor(y0 - 30)); x1 = Math.min(W + MG, Math.ceil(x1 + 30)); y1 = Math.min(H + MG, Math.ceil(y1 + 30));
      return [x0, y0, Math.max(8, x1 - x0), Math.max(8, y1 - y0)];
    };
    const doorsL = (c, a, res) => { const bx = doorBox(a); return [bx, boxLayer(c, name + ':doors' + a, bx, g => { drawDoor(g, cam, 'left', a); drawDoor(g, cam, 'right', a); }, res)]; };
    return {
      back(c, t, s) {
        s = wState(s);
        blit(c, behind(c, s.res));
        drawHangers(c, cam, name, t || 0, s.swing, s.res);
        blit(c, over(c, s.res));
        if (s.bag) blitBox(c, bagL(c, s.res), BB);
        if (s.doors === 0 || s.doors === 1) { const [bx, L] = doorsL(c, s.doors, s.res); blitBox(c, L, bx); }
        else { drawDoor(c.g, cam, 'left', s.doors); drawDoor(c.g, cam, 'right', s.doors); }
      },
      front(c, t, s) { },
      cam,
    };
  }

  // ================================================================ anchors
  const A = (cam, p) => { const q = cam.p(p); return [Math.round(q[0]), Math.round(q[1]), Math.round(cam.k(p[0], p[1], p[2]))]; };
  const seam = (cam, a, b) => [cam.xy([a])[0].map(Math.round), cam.xy([b])[0].map(Math.round)];
  function nightAnchors(cam) {
    return { head: A(cam, R.head), face: A(cam, R.face), phone: A(cam, R.phone), hand: A(cam, R.hand), shoulder: A(cam, R.shoulder), seam: seam(cam, [0, MT + 0.12, 2.2], [0, MT + 0.05, 0.4]) };
  }
  const views = {};
  ['foot', 'across', 'hand'].forEach(n => { const v = nightView(n); v.anchors = nightAnchors(v.cam); views[n] = v; });
  views.foot.light = { x: views.foot.anchors.phone[0], y: views.foot.anchors.phone[1], color: N.glow, kind: 'phone', street: { x: 1640, y: -40, color: N.street } };
  views.foot.split = 0.5;
  views.across.light = { x: views.across.anchors.phone[0], y: views.across.anchors.phone[1], color: N.glow, kind: 'phone', street: { x: 0, y: 1300, color: N.street } };
  views.hand.light = { x: views.hand.anchors.phone[0], y: views.hand.anchors.phone[1], color: N.glow, kind: 'phone' };
  ['across', 'hand'].forEach(n => { const v = views[n], s = v.anchors.seam; v.split = +((s[0][1] + s[1][1]) / 2 / H).toFixed(3); v.splitAxis = 'y'; });
  ['wardrobe', 'shelf'].forEach(n => { views[n] = wardrobeView(n); });
  {
    const wc = WCAM.wardrobe, sc = WCAM.shelf, w = R.wardrobe;
    views.wardrobe.anchors = { stand: A(wc, R.stand), head: A(wc, [R.stand[0], 1.68, R.stand[2]]), hands: A(wc, [-1.55, 1.05, 0.86]), bag: A(wc, R.bag), shelf: A(wc, [w.x1, w.shelf, 0.6]), rail: A(wc, [-2.1, w.rail, 0.3]), split: A(wc, [w.x1, 1.0, 0.6]) };
    views.wardrobe.light = { x: -200, y: 120, color: '#E6EBEE', kind: 'window', dir: [1, 0.3] };
    views.wardrobe.split = +(views.wardrobe.anchors.split[0] / W).toFixed(3);
    views.shelf.anchors = { bag: A(sc, R.bag), rect: A(sc, [-2.0, w.shelf, 0.31]), hands: A(sc, [-1.86, 1.72, 0.36]), split: A(sc, [w.x1, w.shelf, 0.6]) };
    views.shelf.light = { x: -300, y: -100, color: '#E6EBEE', kind: 'window', dir: [1, 0.3] };
    views.shelf.split = +(views.shelf.anchors.split[0] / W).toFixed(3);
  }
  // the bag, anywhere: a cached sprite at a given size, seen from the front and a little above (for when it leaves the shelf)
  const bagCam = camera({ target: [0, 0, 0], dist: 3, yaw: -Math.PI / 2, pitch: -0.32, f: 3 * 1000, flop: true, place: [[0, 0, 0], 160, 110] });
  function bag(c, x, y, pxPerM, rot) {
    const sc = (pxPerM || 900) / 1000, key = 'bagsprite';
    const cv = c.cache(SET + ':' + key, g => drawBagAt(g, bagCam, [0, 0, 0], { shadow: false }), 320, 220);
    const g = c.g; g.save(); g.translate(x, y); if (rot) g.rotate(rot); g.scale(sc, sc); g.drawImage(cv, -160, -110); g.restore();
  }

  // ================================================================ demos (4 s each): every view and state
  // a stand-in for the phone (gloss), only so the demo sheets can be judged; the film's phone comes from PHONE
  function standInPhone(c, v, upright) {
    const a = v.anchors.phone, k = a[2], gl = c.gl, w = 0.147 * k, h = 0.071 * k;
    gl.save(); gl.translate(a[0], a[1]);
    gl.fillStyle = '#000000'; gl.beginPath(); gl.roundRect(-w / 2, -h / 2, w, h, h * 0.18); gl.fill();
    gl.strokeStyle = 'rgba(255,214,186,0.9)'; gl.lineWidth = Math.max(2, h * 0.08); gl.beginPath(); gl.moveTo(-w / 2 + h * 0.2, -h / 2); gl.lineTo(w / 2 - h * 0.2, -h / 2); gl.stroke();
    gl.restore();
  }
  // a stand-in for him (B1's head, sculpted once and kept), only to check the anchors against a real head; the film's comes from RIG
  let standHead = null;
  function standInHead(c, v) {
    const f = v.anchors.face, k = f[2];
    if (!standHead) standHead = GG.head({ who: 'him', x: f[0] - 0.02 * k, y: f[1] - 0.01 * k, s: 0.31 * k, yaw: -0.42, pitch: 0.05, roll: -1.36, eyes: 0.06, smile: 0.4, gaze: [0, 0.3],
      mode: 'grain', seed: 7, ss: 1.2, neckLen: 0.7, bounds: [-0.75, -0.72, 0.75, 1.0], stubble: 0.1, neckShade: 0.35, aoK: 0.6, amb: '#323C58',
      lights: [{ pos: [(v.anchors.phone[0] - f[0]) / (0.31 * k), (v.anchors.phone[1] - f[1]) / (0.31 * k), 0.9], col: '#FFC09A', k: 2.0, falloff: 1.4, wrap: 0.25 }, { dir: [0.3, -0.7, 0.4], col: '#7E92C0', k: 0.22, poster: [0.4], levels: [1] }] });
    GG.drawHead(c.g, standHead, { shadow: { dx: 10, dy: 10, blur: 14, alpha: 0.6 }, tex: 0.45, texSeed: 17 });
  }
  const demo = (name, view, s, extra) => ({ name, draw(c, t) { const v = views[view]; const st = typeof s === 'function' ? s(t) : s; v.back(c, t, st); if (extra) extra(c, v, t); v.front(c, t, st); } });
  SETS.bedroom = {
    views, room: R, bag,
    demos: [
      demo('foot: night', 'foot', { tod: 'night' }, (c, v) => standInPhone(c, v)),
      demo('foot: later', 'foot', { tod: 'later' }, (c, v) => standInPhone(c, v)),
      demo('foot: night to later (dissolve)', 'foot', t => ({ tod: 'night', later: clamp((t - 0.5) / 1, 0, 1) })),
      demo('across: night (B1)', 'across', { tod: 'night' }, (c, v) => standInPhone(c, v)),
      demo('across: later, no glow', 'across', { tod: 'later', glow: 0 }),
      demo('across: with a stand-in head (B1, for the anchors)', 'across', { tod: 'night' }, (c, v) => { standInHead(c, v); standInPhone(c, v); }),
      demo('hand: the smooth pillow', 'hand', { tod: 'night' }, (c, v) => standInPhone(c, v)),
      demo('wardrobe: doors opening', 'wardrobe', t => ({ doors: clamp(t / 1.6, 0, 1), swing: clamp((t - 0.8) / 0.4, 0, 1) * Math.exp(-Math.max(0, t - 1.2) * 0.8) })),
      demo('wardrobe: open, the bag on the shelf', 'wardrobe', { doors: 1, bag: true }),
      demo('wardrobe: the bag gone', 'wardrobe', { doors: 1, bag: false }),
      demo('wardrobe: shut', 'wardrobe', { doors: 0 }),
      demo('shelf: the bag', 'shelf', { bag: true }),
      demo('shelf: the clean rectangle', 'shelf', { bag: false }),
    ],
  };
})();
