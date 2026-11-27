window.SETS = window.SETS || {};
/* LONG DISTANCE · set: OFFICE (Q03 Face down)
   Open plan in flat grey card: carpet tiles laid in quarter turns, fabric dividers with a darker top rail, a suspended ceiling,
   and fluorescent panels whose pale green-grey light falls in cut bands down every divider and in pools on the carpet. Nothing
   in the room has a colour: when the phone buzzes, the edge of a pink bubble is the only colour on the floor.
   Laid out in metres and seen through a pinhole camera (one room, two matching cameras):
     wide  from behind the divider row: his desk in the left half, the phone's spot beside his keyboard on the right, the
           coworker's divider beyond his monitor so a head can look over it (s.coworker), the open plan receding to the windows.
     desk  closer, over his right shoulder and the keyboard: the monitor's spreadsheet (an abstract grid, no words), the phone's
           spot alone on the bare right half of the desk.
   The seam between his half and the empty half is the divider post behind the desk (x = 0.25 m).
   Deterministic. Static layers cached under 'office|...'. API: film/api/office.md */
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
  // THE ROOM (metres: x across, y up, z away from the windows' end of the floor toward them; floor y = 0)
  // =====================================================================================
  const R = {
    deskY: 0.73, desk: [-0.95, 1.25, 0, 0.75],         // his desk: x0, x1, z0, z1
    div: { z: 0.78, h: 1.27, t: 0.06 },                // the back divider (the coworker is beyond it)
    postX: k => 0.25 + 0.6 * k,                        // divider posts; the one at x = 0.25 is the seam
    rows: [4.08, 7.38, 10.68, 13.98],                  // the divider rows beyond
    farZ: 16.8, ceilY: 2.72,
    head: [-0.14, 1.21, -0.42], seat: [-0.14, 0.48, -0.52],
    phone: [0.66, 0.735, 0.30],
    monitor: { x: -0.14, z: 0.56, w: 0.54, h: 0.32, y0: 0.94 },
    kb: [-0.36, 0.08, 0.13, 0.28], mouse: [0.21, 0.21],
    coworker: { down: [0.42, 1.12, 1.95], over: [0.42, 1.43, 1.2] },
  };
  const C = {   // grey card under green-grey tubes
    wall: '#858981', wallLit: '#979B92', wallDk: '#6E726B', ceil: '#8E938A', ceilDk: '#7C8178', tube: '#C2CAB7', tubeRim: '#A1A898',
    carpet: '#494D4A', carpetB: '#434744', carpetLit: '#575C57', carpetLit2: '#646A62',
    fab: '#6A6F68', fabLit: '#838A7F', fabLit2: '#A0A896', fabDk: '#555A54', fabDk2: '#464A45', rail: '#454944', railLit: '#A9AFA2', post: '#4E524D',
    desk: '#999A92', deskLit: '#AAACA2', deskEdge: '#5A5B56', deskDk: '#86877F', under: '#2C2F2D',
    mon: '#2C2F31', monLit: '#5A5F61', kb: '#3A3D3F', key: '#55595B', keyLit: '#7A7F80',
    sheet: '#C3CBBF', sheetGrid: '#A1AB9D', sheetInk: '#6C766A', sheetHead: '#A5AFA1', sheetBar: '#7D877A', sel: '#3E5E49',
    chair: '#2E3132', chairLit: '#53585A', haze: '#A0A59C', ink: '#1E2120', window: '#B7BCB3', blind: '#A9AEA5', blindDk: '#8F948B',
    figure: '#3A3E3D', figureLit: '#7E837D', hair: '#262422',
  };
  const hz = (col, d) => mix(col, C.haze, clamp((d - 2.5) / 20, 0, 0.5));

  // ---------------------------------------------------------------- the pieces of the room, drawn for any camera
  // fluorescent panels in the suspended ceiling (0.6 x 1.2 m)
  const TUBES = []; [-4.2, -1.8, 0.6, 3.0, 5.4].forEach(x => [-1.4, 1.6, 4.6, 7.6, 10.6, 13.6].forEach(z => TUBES.push([x, z])));
  function ceiling(g, cam) {
    pc(g, cam, [[-9, R.ceilY, -4], [9, R.ceilY, -4], [9, R.ceilY, R.farZ], [-9, R.ceilY, R.farZ]], { fill: C.ceil, rough: 0, tex: 0.5, seed: 2, kind: 'card' });
    // the ceiling darkens away from the tubes in two cut steps toward the far wall
    g.save(); const cp = cam.path([[-9, R.ceilY, -4], [9, R.ceilY, -4], [9, R.ceilY, R.farZ], [-9, R.ceilY, R.farZ]]); g.clip(cp);
    fl(g, cam, [[-9, R.ceilY, 9], [9, R.ceilY, 9], [9, R.ceilY, R.farZ], [-9, R.ceilY, R.farZ]], C.ceilDk, 1.2, 4); g.restore();
    g.save(); g.globalAlpha = 0.18; for (let x = -9; x <= 9; x += 0.6) ln(g, cam, [x, R.ceilY, -4], [x, R.ceilY, R.farZ], '#6F746C', 1); for (let z = -4; z <= R.farZ; z += 0.6) ln(g, cam, [-9, R.ceilY, z], [9, R.ceilY, z], '#6F746C', 1); g.restore();
    TUBES.forEach(([x, z], i) => { const y = R.ceilY - 0.005; const P = [[x - 0.3, y, z - 0.6], [x + 0.3, y, z - 0.6], [x + 0.3, y, z + 0.6], [x - 0.3, y, z + 0.6]];
      if (i === 17) { fl(g, cam, P, '#AEB5A6', 0.4, 50 + i); return; }                     // one tired tube, not quite lit
      fl(g, cam, P, C.tubeRim, 0.4, 50 + i); fl(g, cam, [[x - 0.24, y, z - 0.52], [x + 0.24, y, z - 0.52], [x + 0.24, y, z + 0.52], [x - 0.24, y, z + 0.52]], C.tube, 0.3, 80 + i); });
  }
  function tubesEm(g, cam) { g.fillStyle = 'rgba(214,228,206,0.55)'; TUBES.forEach(([x, z], i) => { if (i === 17) return; const p = cam.path([[x - 0.26, R.ceilY, z - 0.55], [x + 0.26, R.ceilY, z - 0.55], [x + 0.26, R.ceilY, z + 0.55], [x - 0.26, R.ceilY, z + 0.55]]); g.fill(p); }); }
  function farWall(g, cam) {
    const z = R.farZ;
    const fw = pc(g, cam, [[-9, 0, z], [9, 0, z], [9, R.ceilY, z], [-9, R.ceilY, z]], { fill: C.wall, rough: 0, tex: 0.5, seed: 5, kind: 'card' });
    if (fw) vbands(g, cam, fw, [-9, 0, z], [9, 0, z], R.ceilY, [0, 0.45, 0.78], [C.wallDk, C.wall, C.wallLit], 2.0, 7);
    // the window band: blinds most of the way down, grey day in the slots
    const wp = pc(g, cam, [[-7.5, 0.95, z - 0.01], [8.5, 0.95, z - 0.01], [8.5, 2.35, z - 0.01], [-7.5, 2.35, z - 0.01]], { fill: C.window, rough: 0.5, tex: 0.35, seed: 6 });
    if (wp) { g.save(); g.clip(wp); for (let y = 1.0; y < 2.35; y += 0.07) { const lo = y < 2.0; fl(g, cam, [[-7.5, y, z - 0.02], [8.5, y, z - 0.02], [8.5, y + (lo ? 0.055 : 0.03), z - 0.02], [-7.5, y + (lo ? 0.055 : 0.03), z - 0.02]], lo ? C.blind : C.blindDk, 0.3, 9 + Math.round(y * 50)); } g.restore(); }
    for (let x = -7.5; x <= 8.6; x += 4) pc(g, cam, [[x - 0.2, 0, z - 0.03], [x + 0.2, 0, z - 0.03], [x + 0.2, R.ceilY, z - 0.03], [x - 0.2, R.ceilY, z - 0.03]], { fill: C.wallDk, rough: 0.4, tex: 0.4, seed: 20 + x });
  }
  function floor(g, cam) {
    pc(g, cam, [[-9, 0, -4], [9, 0, -4], [9, 0, R.farZ], [-9, 0, R.farZ]], { fill: C.carpet, rough: 0, tex: 0.55, seed: 11, kind: 'card' });
    // carpet tiles laid in quarter turns: every other half-metre square a shade apart
    g.save(); g.globalAlpha = 0.55; for (let x = -9; x < 9; x += 0.5) for (let z = -4; z < R.farZ; z += 0.5) { if (((Math.round(x * 2) + Math.round(z * 2)) & 1) === 0) continue; const d = z - cam.pos[2]; if (d > 9) continue; fl(g, cam, [[x, 0, z], [x + 0.5, 0, z], [x + 0.5, 0, z + 0.5], [x, 0, z + 0.5]], C.carpetB, 0, 1); } g.restore();
    const fp = cam.path([[-9, 0, -4], [9, 0, -4], [9, 0, R.farZ], [-9, 0, R.farZ]]); GG.specks(g, fp, { x: -M, y: H * 0.45, w: W + 2 * M, h: H * 0.6 }, 900, '#73786F', 'carpet', 1.2, 0.5); GG.specks(g, fp, { x: -M, y: H * 0.45, w: W + 2 * M, h: H * 0.6 }, 500, '#2E312F', 'carpet2', 1.2, 0.5);
    // pools under the tubes, two cut steps
    TUBES.forEach(([x, z], i) => { if (i === 17) return; [[1.7, 2.1, C.carpetLit], [1.0, 1.3, C.carpetLit2]].forEach(([rx, rz, col], k) => { const P = []; for (let a = 0; a < 28; a++) { const t = a / 28 * Math.PI * 2; P.push([x + Math.cos(t) * rx, 0.001, z + Math.sin(t) * rz]); } g.save(); g.globalAlpha = 0.8; fl(g, cam, P, col, 2.0, 200 + i * 3 + k); g.restore(); }); });
  }
  // a run of divider: front face (toward -z) with cut light bands, the top rail, posts; from x0 to x1 at z
  function dividerRow(g, cam, x0, x1, z, h, seed, o) {
    o = o || {}; const t = R.div.t, d = Math.max(1, cam.view([(x0 + x1) / 2, h, z])[2]);
    const face = [[x0, 0, z - t / 2], [x1, 0, z - t / 2], [x1, h, z - t / 2], [x0, h, z - t / 2]];
    const sh = cam.shape(face); if (!sh) return;
    const p = GG.piece(g, sh, { fill: hz(C.fab, d), rough: d < 6 ? 1.3 : 0.6, tex: 0.6, seed, kind: 'cloth', texScale: d < 4 ? 1 : 0.6, lift: [Math.max(2, 14 / d), Math.max(2, 18 / d)], liftAlpha: 0.5, liftBlur: Math.max(3, 20 / d) });
    // the tubes light the top of every divider: cut bands, lightest under the rail, the foot in the desks' shadow
    vbands(g, cam, p, [x0, 0, z - t / 2], [x1, 0, z - t / 2], h, [0, 0.3, 0.6, 0.8, 0.94], [hz(C.fabDk2, d), hz(C.fabDk, d), hz(C.fab, d), hz(C.fabLit, d), hz(C.fabLit2, d)], d < 6 ? 2.2 : 0.9, seed + 1);
    GG.texture(g, p, 0.45, seed + 2, 'cloth', d < 4 ? 1 : 0.6);
    if (d < 6) GG.specks(g, p, { x: -M, y: -M, w: W + 2 * M, h: H + 2 * M }, Math.round(500 / d), '#B4BAAC', 'fab' + seed, 1.1, 0.35);
    // posts (near rows only: far away they would read as a fence)
    if (o.posts !== false && d < 5) for (let k = -20; k < 30; k++) { const x = R.postX(k); if (x <= x0 + 0.01 || x >= x1 - 0.01) continue;
      pc(g, cam, [[x - 0.018, 0, z - t / 2 - 0.004], [x + 0.018, 0, z - t / 2 - 0.004], [x + 0.018, h, z - t / 2 - 0.004], [x - 0.018, h, z - t / 2 - 0.004]], { fill: hz(C.post, d), rough: 0.3, tex: 0.3, seed: seed + 10 + k }); }
    // the top rail: its upper face catches the tubes
    const rt = pc(g, cam, [[x0, h, z - t / 2 - 0.01], [x1, h, z - t / 2 - 0.01], [x1, h, z + t / 2 + 0.01], [x0, h, z + t / 2 + 0.01]], { fill: hz(C.railLit, d), rough: 0.4, tex: 0.3, seed: seed + 3, lift: d < 5 ? [0, 4] : null, liftAlpha: 0.4, liftBlur: 4 });
    pc(g, cam, [[x0, h - 0.035, z - t / 2 - 0.01], [x1, h - 0.035, z - t / 2 - 0.01], [x1, h, z - t / 2 - 0.01], [x0, h, z - t / 2 - 0.01]], { fill: hz(C.rail, d), rough: 0.4, tex: 0.3, seed: seed + 4 });
  }
  // a side screen along z at x (its face toward +x or -x, whichever the camera sees)
  function sideScreen(g, cam, x, z0, z1, h, seed) {
    const t = R.div.t, s = cam.pos[0] > x ? 1 : -1, xf = x + s * t / 2, d = Math.max(1, cam.view([x, h, (z0 + z1) / 2])[2]);
    const sh = cam.shape([[xf, 0, z0], [xf, 0, z1], [xf, h, z1], [xf, h, z0]]); if (!sh) return null;
    const p = GG.piece(g, sh, { fill: hz(C.fab, d), rough: 1.2, tex: 0.6, seed, kind: 'cloth', texScale: d < 4 ? 1 : 0.6, lift: [Math.max(2, 14 / d), Math.max(2, 16 / d)], liftAlpha: 0.5, liftBlur: Math.max(3, 18 / d) });
    vbands(g, cam, p, [xf, 0, z0], [xf, 0, z1], h, [0, 0.3, 0.6, 0.8, 0.94], [hz(C.fabDk2, d), hz(C.fabDk, d), hz(mix(C.fab, C.fabDk, 0.4), d), hz(C.fab, d), hz(C.fabLit, d)], 2.2, seed + 1);
    GG.texture(g, p, 0.45, seed + 2, 'cloth', d < 4 ? 1 : 0.6);
    pc(g, cam, [[x - t / 2 - 0.01, h, z0], [x + t / 2 + 0.01, h, z0], [x + t / 2 + 0.01, h, z1], [x - t / 2 - 0.01, h, z1]], { fill: hz(C.railLit, d), rough: 0.4, tex: 0.3, seed: seed + 3 });
    pc(g, cam, [[xf + s * 0.01, h - 0.035, z0], [xf + s * 0.01, h - 0.035, z1], [xf + s * 0.01, h, z1], [xf + s * 0.01, h, z0]], { fill: hz(C.rail, d), rough: 0.4, tex: 0.3, seed: seed + 4 });
    // its end post toward the camera
    const ze = cam.pos[2] < z0 ? z0 : z1; pc(g, cam, [[x - t / 2 - 0.01, 0, ze], [x + t / 2 + 0.01, 0, ze], [x + t / 2 + 0.01, h, ze], [x - t / 2 - 0.01, h, ze]], { fill: hz(C.post, d), rough: 0.3, tex: 0.3, seed: seed + 5 });
    return p;
  }
  // a box seen by the camera: only its visible faces. cols: {top, front (-z), back (+z), left (-x), right (+x)}
  function box(g, cam, x0, x1, y0, y1, z0, z1, cols, o) {
    o = o || {}; const P = cam.pos, f = [];
    if (P[1] > y1 && cols.top) f.push([[[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], cols.top]);
    if (P[2] < z0 && cols.front) f.push([[[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], cols.front]);
    if (P[2] > z1 && cols.back) f.push([[[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], cols.back]);
    if (P[0] < x0 && cols.left) f.push([[[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], cols.left]);
    if (P[0] > x1 && cols.right) f.push([[[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], cols.right]);
    if (P[1] < y0 && cols.bottom) f.push([[[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], cols.bottom]);
    return f.map(([q, col], i) => pc(g, cam, q, { fill: col, rough: o.rough, tex: o.tex == null ? 0.45 : o.tex, seed: (o.seed || 1) + i, kind: o.kind || 'card' }));
  }
  // a far figure over a divider: head and shoulders in flat paper, the tube light on the crown (no face: background)
  function farFigure(g, cam, x, y, z, seed, turn) {
    const p = cam.p([x, y, z]), k = p[2], d = cam.view([x, y, z])[2];
    const body = S().poly([[p[0] - 0.24 * k, p[1] + 0.45 * k], [p[0] - 0.21 * k, p[1] + 0.2 * k], [p[0] - 0.08 * k, p[1] + 0.12 * k], [p[0] + 0.08 * k, p[1] + 0.12 * k], [p[0] + 0.21 * k, p[1] + 0.2 * k], [p[0] + 0.24 * k, p[1] + 0.45 * k]]);
    const bp = GG.piece(g, body, { fill: hz(['#4A4F55', '#5A544E', '#3E4446', '#62666A'][seed % 4], d), rough: 0.5, tex: 0.4, seed: 300 + seed });
    const hd = GG.piece(g, S().ellipse(p[0] + (turn || 0) * 0.01 * k, p[1], 0.085 * k, 0.11 * k, 0), { fill: hz(['#8A6A55', '#6E5442', '#A07E66', '#5C4636'][seed % 4], d), rough: 0.4, tex: 0.3, seed: 310 + seed });
    GG.piece(g, S().ellipse(p[0] - (turn || 0) * 0.02 * k, p[1] - 0.04 * k, 0.09 * k, 0.085 * k, 0), { fill: hz(['#2A2522', '#3A2E26', '#4A4440', '#1E1C1A'][seed % 4], d), rough: 0.4, tex: 0.3, seed: 320 + seed });
    if (bp) cres(g, bp, 0, k * 0.03, hz(C.figureLit, d), 0.7);
  }

  // the tubes' light as B2's pendant lays it: nested cones of cut bands from a panel down to the floor, over every surface they reach
  function tubeCone(g, cam, x, z, spreads, alpha, seed, floorY) {
    const y0 = R.ceilY, y1 = floorY == null ? 0 : floorY;
    g.save(); g.globalCompositeOperation = 'screen';
    spreads.forEach((e, i) => {
      const top = [[x - 0.3, y0, z - 0.6], [x + 0.3, y0, z - 0.6], [x + 0.3, y0, z + 0.6], [x - 0.3, y0, z + 0.6]], bot = [[x - 0.3 - e, y1, z - 0.6 - e * 1.1], [x + 0.3 + e, y1, z - 0.6 - e * 1.1], [x + 0.3 + e, y1, z + 0.6 + e * 1.1], [x - 0.3 - e, y1, z + 0.6 + e * 1.1]];
      const pts = cam.pts(top).concat(cam.pts(bot)); if (pts.length < 3) return;
      g.globalAlpha = alpha; g.fillStyle = '#B9C4AE'; g.fill(S().poly(hull(pts)).path(3, seed + i)); });
    g.restore();
  }
  // ---------------------------------------------------------------- the far room: everything beyond his cubicle's back divider
  function drawFar(g, cam) {
    g.fillStyle = C.wall; g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
    ceiling(g, cam); farWall(g, cam); floor(g, cam);
    const rows = R.rows.slice().reverse();
    rows.forEach((z, ri) => {
      const r = R.rows.length - ri;     // 4..1
      // the far cluster's desks: monitor backs over the divider, a few people
      [-5.2, -3.3, -1.4, 0.5, 2.0, 5.6, 7.4].forEach((x, i) => { if ((i + r) % 3 === 0) return; const d = z - cam.pos[2];
        box(g, cam, x - 0.26, x + 0.26, 1.18, 1.46, z + 0.45, z + 0.49, { top: hz('#55595A', d), front: hz('#34373A', d), back: hz('#34373A', d), left: hz('#45484A', d), right: hz('#45484A', d) }, { seed: 400 + r * 10 + i, rough: 0.3, tex: 0.3 }); });
      if (r === 1) { farFigure(g, cam, -2.6, 1.36, z + 1.15, 1, 1); farFigure(g, cam, 5.9, 1.3, z + 1.2, 2, -1); }
      if (r === 2) { farFigure(g, cam, 1.7, 1.33, z + 1.1, 3, -1); }
      if (r === 3) { farFigure(g, cam, -1.1, 1.35, z + 1.2, 0, 1); farFigure(g, cam, 6.8, 1.62, z - 1.5, 2, 0); }
      dividerRow(g, cam, -6.2, 2.95, z, R.div.h, 500 + r * 20, { posts: false });
      dividerRow(g, cam, 4.45, 9.5, z, R.div.h, 600 + r * 20, { posts: false });
      // side screens at the cluster ends (the aisle runs between them)
      sideScreen(g, cam, 2.95, z - 1.6, z + 1.6, R.div.h, 700 + r * 10);
      sideScreen(g, cam, 4.45, z - 1.6, z + 1.6, R.div.h, 750 + r * 10);
      if (r === 2) { // a structural column in the aisle, between the rows
        box(g, cam, 3.4, 3.95, 0, R.ceilY, z - 1.95, z - 1.4, { front: '#8A8E87', left: '#7D8179', right: '#959991' }, { seed: 77, rough: 0.6, tex: 0.5 }); }
    });
    // the coworker's half of the cluster, beyond his divider: his chair back low, a jacket over it (only the top shows)
    // the right neighbour's divider continues past the aisle edge; the far side screen of his cluster
    sideScreen(g, cam, 2.95, 0.84, 3.3, R.div.h, 760);
    [[0.6, 4.6], [3.0, 7.6], [-1.8, 7.6], [0.6, 10.6], [5.4, 4.6]].forEach(([x, z], i) => tubeCone(g, cam, x, z, [2.2, 1.4, 0.7], 0.035, 1200 + i * 5));
  }
  // ---------------------------------------------------------------- his cubicle: the back divider, the left screen, his desk and things
  function sheetCanvas() {
    // the spreadsheet: a toolbar, a header row, row numbers, a grid of cells holding dashes of figures; no words anywhere
    const w = 540, h = 320, cv = OTM.makeCanvas(w, h), g = cv.getContext('2d'), r = OTM.rng('office-sheet');
    g.fillStyle = C.sheet; g.fillRect(0, 0, w, h);
    g.fillStyle = C.sheetBar; g.fillRect(0, 0, w, 30); g.fillStyle = mix(C.sheetBar, C.sheet, 0.35); for (let i = 0; i < 9; i++) g.fillRect(10 + i * 22, 9, 14, 12);
    g.fillStyle = mix(C.sheet, C.sheetBar, 0.2); g.fillRect(0, 30, w, 18); g.fillStyle = C.sheetInk; g.fillRect(64, 37, 210, 5);    // the formula bar: a bar, not words
    const x0 = 34, y0 = 60, cw = 63, rh = 16.5;
    g.fillStyle = C.sheetHead; g.fillRect(0, 48, w, 12); g.fillRect(0, 48, x0, h);
    g.strokeStyle = C.sheetGrid; g.lineWidth = 1;
    for (let x = x0; x <= w; x += cw) { g.beginPath(); g.moveTo(x + 0.5, 48); g.lineTo(x + 0.5, h); g.stroke(); }
    for (let y = y0; y <= h; y += rh) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); g.stroke(); }
    g.fillStyle = mix(C.sheet, '#8FA08C', 0.35); g.fillRect(x0 + cw * 3 + 1, y0 + 1, cw - 1, h - y0);   // one column filled a shade darker
    for (let j = 0; j < 16; j++) { g.fillStyle = mix(C.sheetHead, C.sheetInk, 0.5); g.fillRect(12, y0 + j * rh + 6, 10, 4);
      for (let i = 0; i < 8; i++) { if ((i === 6 && j % 3) || (i === 7 && j % 2) || r() < 0.08) continue; const L = 18 + r() * 34; g.fillStyle = i === 0 ? mix(C.sheetInk, C.sheet, 0.15) : C.sheetInk;
        if (i === 0) g.fillRect(x0 + 6, y0 + j * rh + 6, L, 4); else g.fillRect(x0 + i * cw + cw - 6 - L, y0 + j * rh + 6, L, 4); } }
    return cv;
  }
  let SHEET = null;
  const MON = R.monitor;
  const monCorners = () => { const { x, z, w, h, y0 } = MON, tilt = 0.035; return [[x - w / 2, y0 + h, z + tilt], [x + w / 2, y0 + h, z + tilt], [x + w / 2, y0, z], [x - w / 2, y0, z]]; };   // tl tr br bl
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function screenPt(u, v) { const q = monCorners(); return lerp3(lerp3(q[0], q[1], u), lerp3(q[3], q[2], u), v); }
  function drawNear(g, cam, view) {
    const [dx0, dx1, dz0, dz1] = R.desk, Y = R.deskY;
    // the back divider: his half carries a pinned printout; on the empty half, four pins round a square of cleaner fabric
    dividerRow(g, cam, -4.8, 2.95, R.div.z, R.div.h, 900, { posts: true, lift: true });
    { const pz = R.div.z - R.div.t / 2 - 0.006;
      const sheet = pc(g, cam, [[-0.78, 0.98, pz], [-0.56, 0.99, pz], [-0.565, 1.2, pz], [-0.785, 1.19, pz]], { fill: '#BDBEB6', rough: 0.6, tex: 0.5, seed: 910, lift: [2, 3], liftAlpha: 0.35, liftBlur: 3 });
      if (sheet) { g.save(); g.clip(sheet); g.globalAlpha = 0.5; for (let i = 0; i < 7; i++) ln(g, cam, [-0.76, 1.165 - i * 0.025, pz - 0.001], [-0.6 - (i % 3) * 0.03, 1.165 - i * 0.025, pz - 0.001], '#6F716B', Math.max(1, cam.p([-0.7, 1.1, pz])[2] * 0.006)); g.restore(); }
      const pin = (x, y) => { const p = cam.p([x, y, pz]); g.fillStyle = '#3E4240'; g.beginPath(); g.arc(p[0], p[1], Math.max(1.2, p[2] * 0.0045), 0, 7); g.fill(); };
      pin(-0.67, 1.19);
      g.save(); g.globalAlpha = 0.14; fl(g, cam, [[0.5, 0.97, pz], [0.67, 0.97, pz], [0.67, 1.17, pz], [0.5, 1.17, pz]], '#C8CDC2', 0.5, 920); g.restore();
      [[0.505, 1.165], [0.665, 1.165], [0.505, 0.975], [0.665, 0.975]].forEach(([x, y]) => pin(x, y)); }
    // the right neighbour's desk (empty: chair pushed in, monitor off) beyond the seam, and the low screen between the desks
    box(g, cam, 1.3, 2.9, Y - 0.03, Y, 0, 0.75, { top: C.desk, front: C.deskEdge, left: C.deskEdge, right: C.deskEdge }, { seed: 940 });
    box(g, cam, 1.95, 2.4, 0.94, 1.2, 0.6, 0.63, { front: '#33373A', top: '#4A4E50', left: '#3C4043', right: '#3C4043' }, { seed: 945, rough: 0.4 });
    box(g, cam, 2.12, 2.22, Y, 0.94, 0.62, 0.66, { front: '#3A3D3F', right: '#45484A', left: '#45484A' }, { seed: 947, rough: 0.3 });
    // the left screen between him and his left neighbour
    sideScreen(g, cam, -0.95, -1.35, R.div.z, R.div.h, 950);
    // his desk: under it the modesty panel and shadow, then the top and its front edge
    fl(g, cam, [[dx0, 0.02, dz1 - 0.06], [dx1, 0.02, dz1 - 0.06], [dx1, Y - 0.03, dz1 - 0.06], [dx0, Y - 0.03, dz1 - 0.06]], C.under, 0.5, 960);
    shadow3(g, cam, [[dx0 - 0.05, 0.001, -0.2], [dx1 + 0.05, 0.001, -0.2], [dx1 + 0.05, 0.001, dz1], [dx0 - 0.05, 0.001, dz1]], 14, 0.55);
    [[dx0 + 0.04, 0.04], [dx1 - 0.04, 0.04]].forEach(([x], i) => box(g, cam, x - 0.03, x + 0.03, 0, Y - 0.03, dz0 + 0.03, dz0 + 0.09, { front: '#3E413E', right: '#4A4D4A', left: '#4A4D4A' }, { seed: 962 + i, rough: 0.3 }));
    const top = pc(g, cam, [[dx0, Y, dz0], [dx1, Y, dz0], [dx1, Y, dz1], [dx0, Y, dz1]], { fill: C.desk, rough: 0.7, tex: 0.55, seed: 965, kind: 'card', lift: [0, 10], liftAlpha: 0.55, liftBlur: 12 });
    if (top) {
      // the tubes overhead: a lighter cut band across the back of the desk, darker toward his edge; the monitor's light, faint, in front of it
      g.save(); g.clip(top);
      [[0.0, C.deskDk], [0.2, C.desk], [0.5, C.deskLit]].forEach(([z0, col], i) => fl(g, cam, [[dx0 - 0.3, Y, z0], [dx1 + 0.3, Y, z0 + 0.04], [dx1 + 0.3, Y, dz1 + 0.2], [dx0 - 0.3, Y, dz1 + 0.2]], col, i ? 2.4 : 0, 966 + i));
      g.restore();
      GG.texture(g, top, 0.35, 968, 'card');
    }
    // the front lip of the desk: a lit edge on top, its face in shadow
    pc(g, cam, [[dx0, Y - 0.03, dz0], [dx1, Y - 0.03, dz0], [dx1, Y, dz0], [dx0, Y, dz0]], { fill: C.deskEdge, rough: 0.4, tex: 0.3, seed: 969 });
    g.save(); g.lineCap = 'round'; ln(g, cam, [dx0, Y + 0.001, dz0], [dx1, Y + 0.001, dz0], 'rgba(214,222,206,0.55)', Math.max(1.5, cam.p([0, Y, dz0])[2] * 0.004)); g.restore();
    if (cam.pos[0] > dx1) pc(g, cam, [[dx1, Y - 0.03, dz0], [dx1, Y - 0.03, dz1], [dx1, Y, dz1], [dx1, Y, dz0]], { fill: C.deskEdge, rough: 0.4, tex: 0.3, seed: 970 });
    // his things, all in his half: a stack of paper, a mug, a pen; the empty half of the desk is bare
    shadow3(g, cam, [[-0.88, Y, 0.4], [-0.56, Y, 0.4], [-0.56, Y, 0.6], [-0.88, Y, 0.6]], 5, 0.45);
    box(g, cam, -0.86, -0.6, Y, Y + 0.035, 0.42, 0.62, { top: '#B4B5AD', front: '#8E8F88', right: '#9A9B93', left: '#9A9B93' }, { seed: 971, rough: 0.5 });
    box(g, cam, -0.84, -0.58, Y + 0.035, Y + 0.05, 0.43, 0.63, { top: '#BCBDB5', front: '#A3A49C', right: '#AAABA3' }, { seed: 972, rough: 0.6 });
    { // the mug: a grey cylinder, its handle to his right
      const mx = -0.52, mz = 0.2, r = 0.04, hgt = 0.095;
      const h0 = cam.p([mx + r * 0.9, Y + hgt * 0.78, mz - 0.01]), h1 = cam.p([mx + r * 0.9, Y + hgt * 0.22, mz - 0.01]), ho = cam.p([mx + r + 0.035, Y + hgt * 0.5, mz - 0.012]);
      g.save(); g.strokeStyle = '#8F908A'; g.lineWidth = Math.max(2, h0[2] * 0.011); g.lineCap = 'round'; g.beginPath(); g.moveTo(h0[0], h0[1]); g.bezierCurveTo(ho[0], h0[1], ho[0], h1[1], h1[0], h1[1]); g.stroke(); g.restore();
      cylinder(g, cam, mx, Y, mz, r, hgt, { fill: '#A7A8A1', top: '#BDBEB6', inside: '#3B2E28', shade: '#7A7B75', lit: '#C6C8BF', seed: 973 }); }
    seam(g, cam, [-0.8, Y + 0.004, 0.33], [-0.68, Y + 0.004, 0.37], '#25272C', '#7A7C82', Math.max(1.5, cam.p([-0.67, Y, 0.33])[2] * 0.006));
    // the keyboard and the mouse
    shadow3(g, cam, [[R.kb[0] - 0.01, Y, R.kb[2] - 0.015], [R.kb[1] + 0.02, Y, R.kb[2] - 0.015], [R.kb[1] + 0.02, Y, R.kb[3] + 0.01], [R.kb[0] - 0.01, Y, R.kb[3] + 0.01]], 5, 0.55);
    { const [kx0, kx1, kz0, kz1] = R.kb, kp = pc(g, cam, [[kx0, Y + 0.012, kz0], [kx1, Y + 0.012, kz0], [kx1, Y + 0.022, kz1], [kx0, Y + 0.022, kz1]], { fill: C.kb, rough: 0.4, tex: 0.35, seed: 980 });
      pc(g, cam, [[kx0, Y, kz0], [kx1, Y, kz0], [kx1, Y + 0.012, kz0], [kx0, Y + 0.012, kz0]], { fill: '#2A2C2E', rough: 0.3, tex: 0.2, seed: 981 });
      const ks = cam.p([(kx0 + kx1) / 2, Y, (kz0 + kz1) / 2])[2];
      if (ks > 250) { const nx = 15, nz = 5; for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { if (j === 4 && i > 3 && i < 11 && i !== 4) continue; const w2 = j === 4 && i === 4 ? 7 : 1;
        const u0 = i / nx + 0.006, u1 = (i + w2) / nx - 0.006, v0 = j / nz + 0.03, v1 = (j + 1) / nz - 0.03; const X = u => lerp(kx0 + 0.008, kx1 - 0.008, u), Z = v => lerp(kz0 + 0.008, kz1 - 0.008, v), Yk = v => Y + 0.024 + 0.01 * v;
        fl(g, cam, [[X(u0), Yk(v0), Z(v0)], [X(u1), Yk(v0), Z(v0)], [X(u1), Yk(v1), Z(v1)], [X(u0), Yk(v1), Z(v1)]], (i + j) % 5 === 0 ? C.keyLit : C.key, 0.15, 990 + j * 20 + i); } }
      const [mx, mz] = R.mouse, mo = []; for (let i = 0; i < 18; i++) { const t = i / 18 * Math.PI * 2; mo.push([mx + Math.cos(t) * 0.032, Y + 0.02, mz + Math.sin(t) * 0.055]); }
      shadow3(g, cam, mo.map(q => [q[0] + 0.006, Y, q[2] - 0.004]), 3, 0.55);
      const mp = pc(g, cam, mo, { fill: '#3C3F41', rough: 0.3, tex: 0.3, seed: 985 }); if (mp) cres(g, mp, 0, 2, '#74787A', 0.8);
      if (kp) cres(g, kp, 0, 2, '#62676A', 0.7); }
    // the monitor: base, neck, the body seen from the side, the screen with its spreadsheet
    { const { x, z, w, h, y0 } = MON;
      shadow3(g, cam, [[x - 0.16, Y, z - 0.05], [x + 0.16, Y, z - 0.05], [x + 0.2, Y, z + 0.2], [x - 0.12, Y, z + 0.2]], 8, 0.5);
      box(g, cam, x - 0.12, x + 0.12, Y, Y + 0.012, z - 0.02, z + 0.16, { top: '#3E4143', front: '#2E3133', right: '#34373A', left: '#34373A' }, { seed: 1001, rough: 0.3 });
      box(g, cam, x - 0.03, x + 0.03, Y, y0 + 0.08, z + 0.06, z + 0.1, { front: '#35383A', right: '#404345', left: '#404345' }, { seed: 1002, rough: 0.3 });
      const q = monCorners(), back = q.map(p => [p[0], p[1], p[2] + 0.025]);
      if (cam.pos[0] > x + w / 2) pc(g, cam, [q[1], back[1], back[2], q[2]], { fill: C.monLit, rough: 0.3, tex: 0.3, seed: 1003 });
      pc(g, cam, [[q[0][0], q[0][1], q[0][2]], [q[1][0], q[1][1], q[1][2]], back[1], back[0]], { fill: '#45494B', rough: 0.3, tex: 0.3, seed: 1004 });
      const bz = q.map(p => [p[0], p[1], p[2] - 0.002]); const bez = [[bz[0][0] - 0.012, bz[0][1] + 0.012, bz[0][2]], [bz[1][0] + 0.012, bz[1][1] + 0.012, bz[1][2]], [bz[2][0] + 0.012, bz[2][1] - 0.03, bz[2][2]], [bz[3][0] - 0.012, bz[3][1] - 0.03, bz[3][2]]];
      const bzp = pc(g, cam, bez, { fill: C.mon, rough: 0.4, tex: 0.35, seed: 1005, lift: [4, 7], liftAlpha: 0.5, liftBlur: 8 }); if (bzp) cres(g, bzp, 0, 3, '#70767A', 0.7);
      const sq = q.map(p => cam.p([p[0], p[1], p[2] - 0.004]));
      if (!SHEET) SHEET = sheetCanvas();
      const sp = new Path2D(); sq.forEach((p, i) => i ? sp.lineTo(p[0], p[1]) : sp.moveTo(p[0], p[1])); sp.closePath();
      g.save(); g.clip(sp); GG.warp(g, SHEET, sq.map(p => [p[0], p[1]]), 10, 8); g.restore();
      GG.texture(g, sp, 0.3, 1006, 'paper');
      // the screen is lit paper: one lighter cut band down its upper part
      g.save(); g.clip(sp); g.globalAlpha = 0.12; g.fillStyle = '#E4EADC'; const t0 = screenPt(0, 0), t1 = screenPt(1, 0), t2 = screenPt(1, 0.42), t3 = screenPt(0, 0.38); g.fill(cam.shape([t0, t1, t2, t3]).path(1.5, 1007)); g.restore(); }
    // his chair: the star base and the column (the seat and back are his and the rig's to cover; the back is in front())
    if (view === 'wide') { const [sx, , sz] = R.seat;
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.3; ln(g, cam, [sx, 0.07, sz], [sx + Math.cos(a) * 0.32, 0.04, sz + Math.sin(a) * 0.32], '#262829', Math.max(3, cam.p([sx, 0, sz])[2] * 0.03)); }
      box(g, cam, sx - 0.025, sx + 0.025, 0.07, 0.42, sz - 0.025, sz + 0.025, { front: '#3A3D3E', right: '#46494A', left: '#46494A' }, { seed: 1010, rough: 0.3 });
        shadow3(g, cam, [[sx - 0.42, 0.002, sz - 0.4], [sx + 0.42, 0.002, sz - 0.4], [sx + 0.42, 0.002, sz + 0.4], [sx - 0.42, 0.002, sz + 0.4]], 14, 0.45);
      const seat = box(g, cam, sx - 0.25, sx + 0.25, 0.42, 0.5, sz - 0.24, sz + 0.24, { top: C.chairLit, front: C.chair, right: '#3B3E3F', left: '#3B3E3F', back: C.chair }, { seed: 1011, rough: 0.9, tex: 0.4 }); if (seat[0]) cres(g, seat[0], 0, -3, '#7A8080', 0.6); }
  }
  // the chair's back, in front of him (wide only)
  function drawChairBack(g, cam) {
    const [sx, , sz] = R.seat; const bz = sz - 0.27;
    box(g, cam, sx - 0.035, sx + 0.035, 0.45, 0.62, bz - 0.01, bz + 0.02, { front: '#2A2C2D', right: '#3A3C3D', back: '#2A2C2D' }, { seed: 1020, rough: 0.3 });
    const P = [[sx - 0.24, 0.6, bz], [sx + 0.24, 0.6, bz], [sx + 0.25, 1.0, bz - 0.04], [sx + 0.2, 1.08, bz - 0.05], [sx - 0.2, 1.08, bz - 0.05], [sx - 0.25, 1.0, bz - 0.04]];
    const p = pc(g, cam, P, { fill: C.chair, rough: 1.1, tex: 0.5, seed: 1021, kind: 'cloth', lift: [-4, 10], liftAlpha: 0.55, liftBlur: 10 });
    if (p) { cres(g, p, 0, 6, C.chairLit, 0.8); cres(g, p, 4, 0, '#6A7072', 0.5); g.save(); g.clip(p); g.globalAlpha = 0.25; for (let k = 0; k < 9; k++) { const y = 0.64 + k * 0.045; ln(g, cam, [sx - 0.25, y, bz - 0.01], [sx + 0.25, y, bz - 0.01], '#141616', 1); } g.restore(); }
  }
  // the near divider row the wide camera stands behind (its top across the foot of the frame: calm under the subtitles)
  function drawForeground(g, cam) {
    const z = -1.95, h = R.div.h, x0 = -4.5, x1 = 0.75;
    const face = [[x0, 0, z], [x1, 0, z], [x1, h, z], [x0, h, z]];
    const p = pc(g, cam, face, { fill: '#474B46', rough: 1.2, tex: 0.7, seed: 1100, kind: 'cloth', lift: [0, -10], liftAlpha: 0.5, liftBlur: 16 });
    if (p) { const a = cam.p([-1, 0.6, z]), b = cam.p([-1, h, z]); GG.bands(g, p, [a[0], a[1]], [b[0], b[1]], ['#363A36', '#424641', '#525650'], { stops: [0, 0.55, 0.88], rough: 2.6, seed: 1101 }); GG.texture(g, p, 0.5, 1102, 'cloth'); }
    pc(g, cam, [[x0, h, z - 0.04], [x1, h, z - 0.04], [x1, h, z + 0.04], [x0, h, z + 0.04]], { fill: '#8E9289', rough: 0.8, tex: 0.4, seed: 1103 });
    pc(g, cam, [[x1, 0, z - 0.04], [x1, 0, z + 0.04], [x1, h, z + 0.04], [x1, h, z - 0.04]], { fill: '#4C504B', rough: 0.6, tex: 0.4, seed: 1104 });
  }

  // =====================================================================================
  // VIEWS
  // =====================================================================================
  const CAMS = {
    wide: mkCam({ pos: [1.95, 1.62, -2.95], at: [0.12, 0.9, 0.6], f: 1450 }),
    desk: mkCam({ pos: [0.35, 1.55, -1.25], at: [0.22, 0.88, 0.45], f: 1650 }),
  };
  // the selected cell steps down the sheet as he works (on twos), unless s.row says where it is
  function selRow(t, s) { return s && s.row != null ? s.row : 2 + Math.floor(FILM.twos(t) / 1.6) % 13; }
  function drawSelection(c, cam, t, s) {
    if (s && s.screen === 'off') return;
    const row = selRow(t, s), col = s && s.col != null ? s.col : 3;
    const x0 = 34 / 540, cw = 63 / 540, y0 = 60 / 320, rh = 16.5 / 320;
    const u0 = x0 + col * cw, u1 = u0 + cw, v0 = y0 + row * rh, v1 = v0 + rh;
    const P = [screenPt(u0, v0), screenPt(u1, v0), screenPt(u1, v1), screenPt(u0, v1)].map(q => [q[0], q[1], q[2] - 0.005]);
    const pts = cam.pts(P); const g = c.g; const k = cam.p(P[0])[2];
    g.save(); g.strokeStyle = C.sel; g.lineWidth = Math.max(1.5, k * 0.004); g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.stroke();
    // the row he is on, a shade lighter across the sheet
    const L = [screenPt(x0, v0), screenPt(1, v0), screenPt(1, v1), screenPt(x0, v1)].map(q => [q[0], q[1], q[2] - 0.004]); g.globalAlpha = 0.16; g.fillStyle = '#EEF2E6'; g.fill(cam.path(L)); g.restore();
  }
  function offScreen(c, cam) { const q = monCorners().map(p => [p[0], p[1], p[2] - 0.005]); c.g.save(); c.g.fillStyle = '#26292A'; c.g.fill(cam.path(q)); c.g.restore(); }

  function makeAnchors(view) {
    const cam = CAMS[view], A = {};
    const face = cam.headAngles([0, -0.25, 1]);          // looking at his monitor
    const toPhone = cam.headAngles([R.phone[0] - R.head[0], R.phone[1] - R.head[1], R.phone[2] - R.head[2]]);
    A.head = anchor(cam, R.head, { yaw: +face.yaw.toFixed(3), pitch: +face.pitch.toFixed(3), phoneYaw: +toPhone.yaw.toFixed(3), phonePitch: +toPhone.pitch.toFixed(3) });
    A.seat = anchor(cam, R.seat);
    A.hands = { left: anchor(cam, [-0.26, R.deskY + 0.03, 0.2]), right: anchor(cam, [R.mouse[0], R.deskY + 0.03, R.mouse[1]]) };
    A.phone = anchor(cam, R.phone, { quad: footprint(cam, R.phone, 0.071, 0.147, -0.12), plane: 'desk', note: 'lying flat on the desk, long side front to back, top away from him' });
    A.monitor = { quad: monCorners().map(q => { const p = cam.p(q); return [Math.round(p[0]), Math.round(p[1])]; }), x: Math.round(cam.p(screenPt(0.5, 0.5))[0]), y: Math.round(cam.p(screenPt(0.5, 0.5))[1]), scale: +cam.p(screenPt(0.5, 0.5))[2].toFixed(1) };
    if (view === 'wide') {
      const cw = R.coworker, look = cam.headAngles([R.head[0] - cw.over[0], R.head[1] - cw.over[1] - 0.3, R.head[2] - cw.over[2]]);
      A.coworker = { down: anchor(cam, cw.down), over: anchor(cam, cw.over, { yaw: +look.yaw.toFixed(3), pitch: +look.pitch.toFixed(3) }),
        clipY: Math.round(cam.p([cw.over[0], R.div.h, R.div.z])[1]) };
    }
    return A;
  }
  const LIGHT = {
    wide: { name: 'office', x: 1250, y: -40, color: C.tube, dir: [0.1, -0.85, -0.5], amb: '#6E7570',
      keys: [{ dir: [0.12, -0.85, -0.45], col: '#E6F0E6', k: 0.5, poster: [0.2, 0.55], levels: [0.6, 1] }] },
    desk: { name: 'office', x: 900, y: -60, color: C.tube, dir: [0.0, -0.9, -0.4], amb: '#6E7570',
      keys: [{ dir: [0.05, -0.85, -0.4], col: '#E6F0E6', k: 0.48, poster: [0.2, 0.55], levels: [0.6, 1] }, { dir: [-0.6, -0.1, -0.3], col: '#C8D2C4', k: 0.22, poster: [0.35], levels: [1] }] },
  };

  function makeView(view) {
    const cam = CAMS[view];
    const v = {
      cam, anchors: makeAnchors(view), light: LIGHT[view],
      split: +(cam.p([R.postX(0), R.div.h * 0.6, R.div.z])[0] / W).toFixed(3),
      back(c, t, s) {
        s = s || {};
        layer(c, 'office|' + view + '|far', g => drawFar(g, cam));
        if (s.coworker) s.coworker(c, v.anchors.coworker || {});
        layer(c, 'office|' + view + '|near', g => drawNear(g, cam, view));
        if (s.screen === 'off') offScreen(c, cam); else drawSelection(c, cam, t, s);
        emLayer(c, 'office|' + view + '|em', g => tubesEm(g, cam));
      },
      front(c, t, s) {
        s = s || {};
        if (view === 'wide') layer(c, 'office|wide|front' + (s.chairBack === false ? '0' : '1'), g => { if (s.chairBack !== false) drawChairBack(g, cam); drawForeground(g, cam); });
      },
    };
    return v;
  }
  const views = { wide: makeView('wide'), desk: makeView('desk') };

  // =====================================================================================
  // DEMOS (4 s each): every view, the selected cell working down the sheet, the coworker's hook, the screen off, the anchors
  // =====================================================================================
  const stand = (c, v, t, s) => { v.back(c, t, s); v.front(c, t, s); };
  const ghostHead = (c, a, col) => { const g = c.g; g.save(); g.fillStyle = col || 'rgba(40,36,34,0.85)'; g.beginPath(); g.ellipse(a.x, a.y - a.scale * 0.02, a.scale * 0.09, a.scale * 0.12, 0, 0, 7); g.fill(); g.restore(); };
  SETS.office = {
    views,
    prepare: (names, states) => prepare(views, names, states),
    demos: [
      { name: 'wide', draw: (c, t) => stand(c, views.wide, t, {}) },
      { name: 'wide: the coworker hook (a stand-in head over the divider)', draw: (c, t) => stand(c, views.wide, t, { coworker: (cc, a) => ghostHead(cc, { x: lerp(a.down.x, a.over.x, FILM.seg(t, 0.5, 2, 'inOutSine')), y: lerp(a.down.y, a.over.y, FILM.seg(t, 0.5, 2, 'inOutSine')), scale: a.over.scale }) }) },
      { name: 'wide: anchors', draw: (c, t) => { stand(c, views.wide, t, {}); c.after.push(cx => markers(cx, views.wide)); } },
      { name: 'desk', draw: (c, t) => stand(c, views.desk, t, {}) },
      { name: 'desk: screen off', draw: (c, t) => stand(c, views.desk, t, { screen: 'off' }) },
      { name: 'desk: anchors', draw: (c, t) => { stand(c, views.desk, t, {}); c.after.push(cx => markers(cx, views.desk)); } },
    ],
  };
})();
