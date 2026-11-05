/* AUTOPILOT · set: OFFICE (Q07, Q08, Q09, Q10)
   The refrigerated world: an open-plan floor behind sealed, blue-tinted glazing, teal-grey and cool, the outside a white
   rectangle. Every view looks through a pane: a meeting room's glass partition with its frosted band, the laptop's black
   screen, a photograph's glass, a projector's lens and a glass table, a framed print, a glass door, a microwave's door,
   a phone's glass, the kitchenette window holding the hot day back.
   Views: desk · laptop · photo · projector · table · print · kitchen · microwave · phone · window (film/api/office.md).
   Emily's yellow appears in this set once: in the photograph (view photo). The desk view only ever shows the frame's back.
   Diegetic time: 5:37 in the laptop's corner (s.clock), 10:18 to 11:43 on the clock in the print's glass (s.time).
   Deterministic. Static layers cached under 'office|...'. */
(function () {
  'use strict';
  const W = OTM.W, H = OTM.H, P = LC.P, TAU = Math.PI * 2;
  const { rgba, mix, clamp, lerp, rng, vnoise } = OTM;
  const deg = d => d * Math.PI / 180;
  const warn = m => { if (window.FILM && FILM.warn) FILM.warn('office: ' + m); };

  // =====================================================================================
  // KIT (as in the car park set): scratch canvases, a camera with rays and near clipping, mirrors, polygons
  // =====================================================================================
  const pool = {};
  function scratch(name, w, h, box) {
    w = w || W; h = h || H; let g = pool[name];
    if (!g || g.canvas.width !== w || g.canvas.height !== h) g = pool[name] = OTM.makeCanvas(w, h).getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    if (box) g.clearRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4); else g.clearRect(0, 0, w, h); return g;
  }
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  function mkCam(o) {
    o = Object.assign({ cx: W / 2, cy: H / 2, yaw: 0, pitch: 0, roll: 0 }, o);
    const c = LC.camera(o), cyw = Math.cos(o.yaw), syw = Math.sin(o.yaw), cp = Math.cos(o.pitch), sp = Math.sin(o.pitch), cr = Math.cos(o.roll), sr = Math.sin(o.roll);
    c.pos = [o.x, o.y, o.z]; c.o = o;
    c.view = q => { const dx = q[0] - o.x, dy = q[1] - o.y, dz = q[2] - o.z; const x1 = dx * cyw - dz * syw, z1 = dx * syw + dz * cyw; const y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp; return [x1 * cr + y2 * sr, -x1 * sr + y2 * cr, z2]; };
    c.sp = v => [o.cx + o.f * v[0] / v[2], o.cy - o.f * v[1] / v[2], v[2]];
    c.ray = (sx, sy) => { const x3 = (sx - o.cx) / o.f, y3 = (o.cy - sy) / o.f; const x1 = cr * x3 - sr * y3, y2 = sr * x3 + cr * y3; const dy = cp * y2 + sp, z1 = -sp * y2 + cp; return nrm([cyw * x1 + syw * z1, dy, -syw * x1 + cyw * z1]); };
    return c;
  }
  function mirrorCam(cam, o, n) {
    const refl = q => { const d = (q[0] - o[0]) * n[0] + (q[1] - o[1]) * n[1] + (q[2] - o[2]) * n[2]; return [q[0] - 2 * d * n[0], q[1] - 2 * d * n[1], q[2] - 2 * d * n[2]]; };
    const m = { f: cam.f, cx: cam.cx, cy: cam.cy, k: cam.k, o: cam.o, mirror: true, plane: { o, n }, pos: refl(cam.pos) };
    m.p = (x, y, z) => cam.p(refl(Array.isArray(x) ? x : [x, y, z])); m.view = q => cam.view(refl(q)); m.sp = cam.sp;
    m.ray = (sx, sy) => { const d = cam.ray(sx, sy), k = 2 * dot(d, n); return [d[0] - k * n[0], d[1] - k * n[1], d[2] - k * n[2]]; };
    return m;
  }
  function clipNear(vs, zn) {
    const out = [];
    for (let i = 0; i < vs.length; i++) { const a = vs[i], b = vs[(i + 1) % vs.length], ia = a[2] > zn, ib = b[2] > zn; if (ia) out.push(a); if (ia !== ib) { const t = (zn - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, zn]); } }
    return out;
  }
  function path3(cam, pts) { const vs = clipNear(pts.map(cam.view), 0.02), p = new Path2D(); vs.forEach((v, i) => { const s = cam.sp(v); if (i) p.lineTo(s[0], s[1]); else p.moveTo(s[0], s[1]); }); if (vs.length) p.closePath(); return p; }
  function scr3(cam, pts) { return clipNear(pts.map(cam.view), 0.02).map(v => cam.sp(v)); }
  function fill3(g, cam, pts, style, alpha) { g.save(); if (alpha != null) g.globalAlpha = alpha; g.fillStyle = style; g.fill(path3(cam, pts)); g.restore(); }
  function line3(g, cam, a, b, style, w) { const s = clipNear([cam.view(a), cam.view(b)], 0.02); if (s.length < 2) return; const p0 = cam.sp(s[0]), p1 = cam.sp(s[1]); g.strokeStyle = style; g.lineWidth = w; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
  function bboxOf(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
  // an axis-aligned box: visible faces only, three values by facing (col: {top, bottom, xn, xp, zn, zp} or fn(face))
  function box3(g, cam, a, b, col) {
    const [x0, y0, z0] = a, [x1, y1, z1] = b, Pp = cam.pos, F = [];
    if (Pp[2] < z0) F.push(['zn', [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]]]);
    if (Pp[2] > z1) F.push(['zp', [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]]);
    if (Pp[0] < x0) F.push(['xn', [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]]]);
    if (Pp[0] > x1) F.push(['xp', [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]]);
    if (Pp[1] > y1) F.push(['top', [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]]);
    if (Pp[1] < y0) F.push(['bottom', [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]]);
    F.forEach(([k, pts]) => { const c = typeof col === 'function' ? col(k) : (col[k] || col.side); if (c) fill3(g, cam, pts, c); });
  }
  const cached = (c, key, fn, w, h) => c.cache('office|' + key, fn, w, h);
  // a frosted manifestation band on a pane at z: a translucent strip, brighter edges, a fine grain of dots
  function frosted(g, cam, x0, x1, y0, y1, z, a) {
    const q = [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], pp = path3(cam, q);
    g.save(); g.fillStyle = rgba('#EEF3F0', a); g.fill(pp); g.clip(pp);
    line3(g, cam, [x0, y0 + 0.002, z], [x1, y0 + 0.002, z], rgba('#FFFFFF', a + 0.2), 1.5); line3(g, cam, [x0, y1 - 0.002, z], [x1, y1 - 0.002, z], rgba('#FFFFFF', a + 0.2), 1.5);
    const R = rng('frost' + z + y0); for (let i = 0; i < 900; i++) { const p = cam.p(lerp(x0, x1, R()), lerp(y0, y1, R()), z); if (p[2] <= 0) continue; g.fillStyle = rgba('#FFFFFF', 0.1 + R() * 0.2); g.fillRect(p[0], p[1], 1.5, 1.5); }
    g.restore();
  }
  const quarter = (c, key, fn) => c.cache('office|' + key, (g, cv) => { g.scale(0.25, 0.25); fn(g, cv); }, W / 4, H / 4);
  const blurInto = (g, fn, px, w, h) => { const l = LC.layer(w || g.canvas.width, h || g.canvas.height); fn(l); g.drawImage(LC.blurred(l.canvas, px, false), 0, 0); };

  // =====================================================================================
  // PALETTE: refrigerated teal-grey; the outside a white rectangle behind blue glass
  // =====================================================================================
  const OP = {
    wall: ['#B3C3BE', '#97A9A4', '#728682'], ceil: '#B9C6C1', grid: '#9DABA6', lamp: '#F1F6F2', carpet: ['#435655', '#384A49', '#2B3A3A'],
    deskTop: '#D6DED9', deskEdge: '#EEF2EF', deskFront: '#7D8E8A', deskSide: '#A6B3AE', leg: '#C8D1CC', screen: ['#56706D', '#435A58', '#33474545'],
    chair: '#1A2122', mon: '#151B1C', glow: '#C9DCE1', plant: ['#5E7B6A', '#435C4F', '#2D4037'], column: ['#C3CFCA', '#A4B2AD', '#83938E'],
    frame: '#7A8A86', tint: '#D3E5EB', out: { morning: '#F6F8F4', afternoon: '#FBFBF5', evening: '#F3DDC6' }, outGhost: { morning: '#DCE4E2', afternoon: '#E4E8E2', evening: '#E2C7B0' },
    jacket: ['#3B4A60', '#26324A', '#141C2A'],
  };

  // =====================================================================================
  // THE OPEN-PLAN FLOOR (x across, y up, z toward the windows at z = 16)
  // =====================================================================================
  const WIN_Z = 16, CEIL = 2.7, SILL = 0.8, HEAD = 2.62;
  const DESK = { x0: 0.0, x1: 1.6, z0: 11.6, z1: 12.4, top: 0.73 };      // Daniel's desk (row B, far side: he faces us)
  const DCHAIR = { x: 0.82, z: 12.95 };
  const ROWB = { z0: 10.8, z1: 12.4 }, ROWA = { z0: 7.2, z1: 8.8 };
  function outside(g, cam, tod, o) {
    // the world beyond the sealed glass: blown white, the faint ghosts of rooftops, through the blue tint
    o = o || {}; const ev = tod === 'evening';
    const p0 = cam.p(-30, SILL, WIN_Z + 0.05), p1 = cam.p(30, HEAD, WIN_Z + 0.05), y0 = p1[1] - 40, y1 = p0[1] + 40;
    g.save(); g.fillStyle = LC.lin(g, 0, y0, 0, y1, [[0, OP.out[tod] || OP.out.morning], [0.75, OP.out[tod] || OP.out.morning], [1, ev ? '#E9CBB0' : '#E6ECE8']]); g.fillRect(0, y0, g.canvas.width, y1 - y0);
    const R = rng('office-ghost'); g.fillStyle = OP.outGhost[tod] || OP.outGhost.morning;
    for (let x = -30; x < 30; x += 1.6 + R() * 2.4) { const h = 3 + R() * 9, d = 40 + R() * 30, a = cam.p(x, 0, WIN_Z + d), b = cam.p(x + 2 + R() * 4, h, WIN_Z + d); if (a[2] > 0) g.fillRect(a[0], b[1], b[0] - a[0], a[1] - b[1]); }
    g.restore();
  }
  function windowWall(g, cam, tod, o) {
    o = o || {}; const ev = tod === 'evening', aft = tod === 'afternoon';
    // the glass band (outside drawn first by the caller), the blue of the glass over it
    const band = [[-20, SILL, WIN_Z], [20, SILL, WIN_Z], [20, HEAD, WIN_Z], [-20, HEAD, WIN_Z]];
    g.save(); g.clip(path3(cam, band)); g.globalCompositeOperation = 'multiply'; g.fillStyle = OP.tint; g.fillRect(0, 0, g.canvas.width, g.canvas.height); g.restore();
    // the wall above and below the glazing, the sill cabinet
    fill3(g, cam, [[-20, HEAD, WIN_Z], [20, HEAD, WIN_Z], [20, CEIL, WIN_Z], [-20, CEIL, WIN_Z]], OP.wall[2]);
    fill3(g, cam, [[-20, 0, WIN_Z], [20, 0, WIN_Z], [20, SILL, WIN_Z], [-20, SILL, WIN_Z]], OP.wall[2]);
    box3(g, cam, [-20, 0, WIN_Z - 0.32], [20, SILL - 0.06, WIN_Z], { top: OP.deskTop, zn: '#8C9C97', side: '#9FAEA9' });
    for (let x = -19.5; x < 20; x += 0.24) line3(g, cam, [x, 0.2, WIN_Z - 0.325], [x, SILL - 0.12, WIN_Z - 0.325], 'rgba(40,56,56,0.25)', 1);
    // blinds: venetian, lowered to different heights; the afternoon has them lower
    const R = rng('blinds' + tod);
    for (let x = -18; x < 18; x += 1.5) { const r = R(), lo = r < 0.3 ? 0.08 : (aft ? 0.42 : ev ? 0.2 : 0.26) + R() * 0.3, yb = HEAD - (HEAD - SILL) * lo;
      fill3(g, cam, [[x + 0.03, yb, WIN_Z - 0.06], [x + 1.47, yb, WIN_Z - 0.06], [x + 1.47, HEAD, WIN_Z - 0.06], [x + 0.03, HEAD, WIN_Z - 0.06]], ev ? 'rgba(214,196,180,0.9)' : 'rgba(198,212,208,0.88)');
      for (let y = yb + 0.035; y < HEAD; y += 0.07) line3(g, cam, [x + 0.03, y, WIN_Z - 0.065], [x + 1.47, y, WIN_Z - 0.065], ev ? 'rgba(120,96,84,0.28)' : 'rgba(100,122,122,0.26)', 1);
      box3(g, cam, [x + 0.03, yb - 0.025, WIN_Z - 0.08], [x + 1.47, yb, WIN_Z - 0.05], { zn: '#8E9C98', bottom: '#6E7C78', top: '#C9D2CE' }); }
    // mullions
    for (let x = -18; x <= 18; x += 1.5) { box3(g, cam, [x - 0.03, SILL - 0.06, WIN_Z - 0.08], [x + 0.03, HEAD, WIN_Z], { zn: OP.frame, side: '#5E6E6A' }); }
    fill3(g, cam, [[-20, HEAD - 0.04, WIN_Z - 0.08], [20, HEAD - 0.04, WIN_Z - 0.08], [20, HEAD + 0.02, WIN_Z - 0.08], [-20, HEAD + 0.02, WIN_Z - 0.08]], OP.frame);
  }
  function ceiling(g, cam, tod, o) {
    o = o || {}; const ev = tod === 'evening';
    fill3(g, cam, [[-20, CEIL, -4], [20, CEIL, -4], [20, CEIL, WIN_Z], [-20, CEIL, WIN_Z]], OP.ceil);
    for (let z = -4; z <= WIN_Z; z += 0.6) line3(g, cam, [-20, CEIL - 0.002, z], [20, CEIL - 0.002, z], OP.grid, 1);
    for (let x = -19.8; x <= 20; x += 0.6) line3(g, cam, [x, CEIL - 0.002, -4], [x, CEIL - 0.002, WIN_Z], OP.grid, 1);
    const R = rng('lamps');
    for (let z = -1.2; z < WIN_Z - 0.5; z += 2.4) for (let x = -18.6; x < 19; x += 2.4) {
      const off = ev && (x < -6 || x > 7 || z > 13.5) && R() < 0.7; R();
      fill3(g, cam, [[x, CEIL - 0.004, z], [x + 0.6, CEIL - 0.004, z], [x + 0.6, CEIL - 0.004, z + 1.2], [x, CEIL - 0.004, z + 1.2]], off ? '#A9B6B1' : OP.lamp);
      if ((x + z) % 4.8 === 0) fill3(g, cam, [[x + 1.2, CEIL - 0.003, z + 0.3], [x + 1.8, CEIL - 0.003, z + 0.3], [x + 1.8, CEIL - 0.003, z + 0.9], [x + 1.2, CEIL - 0.003, z + 0.9]], '#A7B4AF');
    }
  }
  function ceilingEm(g, cam, tod) {
    const ev = tod === 'evening', R = rng('lamps');
    for (let z = -1.2; z < WIN_Z - 0.5; z += 2.4) for (let x = -18.6; x < 19; x += 2.4) { const off = ev && (x < -6 || x > 7 || z > 13.5) && R() < 0.7; R(); if (!off) fill3(g, cam, [[x, CEIL, z], [x + 0.6, CEIL, z], [x + 0.6, CEIL, z + 1.2], [x, CEIL, z + 1.2]], 'rgba(230,240,236,0.55)'); }
  }
  function floorPlane(g, cam) {
    fill3(g, cam, [[-20, 0, -4], [20, 0, -4], [20, 0, WIN_Z], [-20, 0, WIN_Z]], OP.carpet[1]);
    const R = rng('carpet'); for (let z = -4; z < WIN_Z; z += 0.5) for (let x = -20; x < 20; x += 0.5) if (((x * 2 + z * 2) | 0) % 2 === 0 || R() < 0.08) fill3(g, cam, [[x, 0.001, z], [x + 0.5, 0.001, z], [x + 0.5, 0.001, z + 0.5], [x, 0.001, z + 0.5]], OP.carpet[0], 0.35);
  }
  // a bench of desks along x, from x0 to x1, depth z0..z1, with a low screen down its spine
  function bench(g, cam, x0, x1, z0, z1, o) {
    o = o || {}; const top = 0.73, zm = (z0 + z1) / 2;
    for (let x = x0; x < x1 - 0.01; x += 1.6) [[0.04, x + 0.04], [1.56, x + 1.56]].forEach(([, lx]) => { box3(g, cam, [lx - 0.03, 0, z0 + 0.05], [lx + 0.03, top - 0.03, z0 + 0.1], { side: OP.leg }); box3(g, cam, [lx - 0.03, 0, z1 - 0.1], [lx + 0.03, top - 0.03, z1 - 0.05], { side: OP.leg }); });
    box3(g, cam, [x0, top - 0.03, z0], [x1, top, z1], { top: OP.deskTop, zn: OP.deskEdge, zp: OP.deskEdge, side: OP.deskSide });
    if (o.screen !== false) box3(g, cam, [x0, top, zm - 0.015], [x1, top + 0.36, zm + 0.015], { top: '#7C9592', zn: OP.screen[1], zp: OP.screen[0], side: OP.screen[2] });
  }
  function monitor(g, cam, x, z, facing, o) {
    // a flat screen on a stand; facing +1 = its screen toward +z (away from us), -1 = toward us
    const w = 0.56, h = 0.33, y0 = 0.86;
    box3(g, cam, [x - 0.03, 0.73, z - 0.03], [x + 0.03, y0, z + 0.03], { side: '#2A3132' });
    box3(g, cam, [x - w / 2, y0, z - 0.012], [x + w / 2, y0 + h, z + 0.012], { side: OP.mon, zn: facing < 0 ? (o && o.on ? OP.glow : '#20292A') : '#2B3334', zp: '#2B3334' });
  }
  function chairAt(g, cam, x, z, faceZ, o) {
    // a black mesh office chair: base star, column, seat, back (faceZ: -1 faces us)
    o = o || {}; const sy = 0.48, bz = z - faceZ * 0.24;
    box3(g, cam, [x - 0.3, 0.05, z - 0.3], [x + 0.3, 0.09, z + 0.3], { side: '#151A1B', top: '#262E2F' });
    box3(g, cam, [x - 0.03, 0.09, z - 0.03], [x + 0.03, sy - 0.05, z + 0.03], { side: '#3A4243' });
    box3(g, cam, [x - 0.25, sy - 0.06, z - 0.24], [x + 0.25, sy, z + 0.24], { top: '#2A3233', side: OP.chair });
    box3(g, cam, [x - 0.23, sy + 0.1, bz - 0.03], [x + 0.23, sy + 0.62, bz + 0.03], { side: OP.chair, zn: '#1E2526', zp: '#262E2F', top: '#3A4243' });
    if (o.jacket) { // his navy jacket over the back: shoulders hooked on the top, hanging behind
      const jz = bz + faceZ * -0.05, J = OP.jacket;
      box3(g, cam, [x - 0.26, sy + 0.18, jz - 0.04], [x + 0.26, sy + 0.66, jz + 0.04], { zn: J[2], zp: J[1], top: J[0], side: J[1] });
      fill3(g, cam, [[x - 0.26, sy + 0.66, jz - 0.04], [x + 0.26, sy + 0.66, jz - 0.04], [x + 0.2, sy + 0.18, jz - 0.045], [x - 0.2, sy + 0.18, jz - 0.045]], J[faceZ < 0 ? 1 : 2]);
      line3(g, cam, [x - 0.24, sy + 0.665, jz], [x + 0.24, sy + 0.665, jz], rgba('#E3E9E3', 0.5), 1.5);
      line3(g, cam, [x, sy + 0.66, jz - 0.046], [x, sy + 0.25, jz - 0.046], rgba('#000000', 0.35), 1.2);
    }
  }
  function confChair(g, cam, x, z, faceZ) {
    const sy = 0.47, bz = z + faceZ * -0.22;
    box3(g, cam, [x - 0.025, 0.05, z - 0.025], [x + 0.025, sy - 0.05, z + 0.025], { side: '#7E8A88' });
    box3(g, cam, [x - 0.24, sy - 0.07, z - 0.22], [x + 0.24, sy, z + 0.22], { top: '#56666A', side: '#3A4648' });
    box3(g, cam, [x - 0.22, sy + 0.08, bz - 0.035], [x + 0.22, sy + 0.5, bz + 0.035], { side: '#3E4C50', zn: '#34404A', zp: '#465458', top: '#7A8C90' });
  }
  function column(g, cam, x, z) { box3(g, cam, [x - 0.25, 0, z - 0.25], [x + 0.25, CEIL, z + 0.25], { zn: OP.column[2], zp: OP.column[0], side: OP.column[1] }); }
  function plantAt(g, cam, x, z, hgt) {
    const b = cam.p(x, 0, z), k = cam.f / Math.max(0.3, b[2]); if (b[2] <= 0.3) return;
    g.fillStyle = '#C9D2CD'; g.fillRect(b[0] - 0.22 * k, b[1] - 0.45 * k, 0.44 * k, 0.45 * k); g.fillStyle = '#9FAEA9'; g.fillRect(b[0] - 0.22 * k, b[1] - 0.45 * k, 0.44 * k, 0.04 * k);
    const R = rng('plant' + x + z);
    for (let i = 0; i < 22; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 1.6, l = (0.18 + R() * 0.5) * (hgt || 1.2) * k; g.save(); g.translate(b[0] + (R() - 0.5) * 0.1 * k, b[1] - 0.45 * k); g.rotate(a + Math.PI / 2); g.fillStyle = R() < 0.4 ? OP.plant[0] : R() < 0.6 ? OP.plant[2] : OP.plant[1]; g.beginPath(); g.ellipse(0, -l * 0.55, 0.06 * k * (hgt || 1.2), l * 0.5, 0, 0, TAU); g.fill(); g.restore(); }
  }
  // a colleague at a desk, as the window sees them: a quiet seated silhouette with a rim (background extras)
  function sitter(g, cam, x, z, o) {
    o = o || {}; const b = cam.p(x, 0.48, z), k = cam.f / Math.max(0.3, b[2]); if (b[2] <= 0.3) return;
    g.save(); g.translate(b[0], b[1]); g.scale(k, k); g.fillStyle = o.color || '#2A3436';
    g.fill(LC.smooth([[-0.2, 0.02], [0.2, 0.02], [0.22, -0.3], [0.17, -0.52], [0.07, -0.58], [-0.07, -0.58], [-0.17, -0.52], [-0.22, -0.3]]));
    g.beginPath(); g.ellipse(0, -0.7, 0.09, 0.11, 0, 0, TAU); g.fill();
    g.strokeStyle = rgba('#F1F6F2', 0.55); g.lineWidth = 0.012; g.beginPath(); g.ellipse(0, -0.7, 0.09, 0.11, 0, -2.6, -0.4); g.stroke(); g.beginPath(); g.moveTo(-0.17, -0.52); g.quadraticCurveTo(0, -0.6, 0.17, -0.52); g.stroke();
    g.restore();
  }

  // =====================================================================================
  // PLACEHOLDER FIGURES (demos only) and the RIG bridge
  // =====================================================================================
  function figure(g, x, y, k, o) {
    o = o || {}; const f = o.facing || 1; g.save(); g.translate(x, y); g.scale(k * f, k); g.fillStyle = o.color || '#1B2426'; const S = pts => g.fill(LC.smooth(pts));
    if (o.body === 'sit') { S([[-0.18, -0.48], [0.2, -0.48], [0.22, -0.8], [0.17, -1.0], [-0.17, -1.0], [-0.21, -0.8]]); g.beginPath(); g.ellipse(0, -1.16, 0.09, 0.11, 0, 0, TAU); g.fill(); }
    else { S([[-0.17, -0.92], [0.17, -0.92], [0.2, -1.2], [0.18, -1.42], [-0.19, -1.42], [-0.2, -1.2]]); S([[-0.15, -0.92], [0.15, -0.92], [0.1, 0], [-0.1, 0]]); g.beginPath(); g.ellipse(0.01, -1.62, 0.085, 0.11, 0, 0, TAU); g.fill(); }
    g.restore();
  }
  function person(g, who, pose, opts) {
    if (window.RIG && RIG.CHAR && RIG.CHAR[who] && typeof RIG.draw === 'function') { try { return RIG.draw(g, who, pose, opts || {}); } catch (e) { warn('RIG.draw ' + who + ': ' + e.message); } }
    figure(g, pose.at[0], pose.at[1], pose.scale, { facing: pose.facing, body: pose.body, color: (opts && opts.color) || '#1B2426' }); return null;
  }

  // =====================================================================================
  // DESK (Q07 24–54, Q09 32–44, Q10 4–18): across the floor to Daniel's desk, through the glass partition of a meeting room.
  // The window wall behind him is a white band: he and Priya are seen against it, rimmed. The desk in front of him is the
  // `props` layer (front() draws it unless s.props === false; call view.props() yourself to put someone in front of it).
  // s.tod ('morning' | 'afternoon' | 'evening'), s.empty (default: true in the evening: half the floor gone home),
  // s.laptop ('open' | 'closed'), s.jacket (default true: on his chair), s.glow (0..1, the laptop's light on him)
  // -------------------------------------------------------------------------------------
  const DK = { cam: () => mkCam({ x: -1.35, y: 1.36, z: 4.2, yaw: deg(14.2), pitch: deg(-1.6), f: 2750 }) };
  const PART_Z = 5.8;
  const todOf = s => (s && (s.tod === 'evening' || s.tod === 'afternoon')) ? s.tod : 'morning';
  const desk = {
    back(c, t, s) {
      s = s || {}; const g = c.g, tod = todOf(s), empty = s.empty == null ? tod === 'evening' : s.empty, jacket = s.jacket !== false;
      g.drawImage(cached(c, 'desk|room|' + tod + '|' + (empty ? 1 : 0) + '|' + (jacket ? 1 : 0), lg => {
        const cam = DK.cam();
        lg.fillStyle = OP.wall[1]; lg.fillRect(0, 0, W, H);
        outside(lg, cam, tod); windowWall(lg, cam, tod);
        ceiling(lg, cam, tod); floorPlane(lg, cam);
        // the far side: a printer station, a tall plant by the glass, columns
        box3(lg, cam, [-5.6, 0, 14.4], [-4.6, 1.05, 15.1], { top: '#DCE2DE', zn: '#9DABA6', side: '#B9C4BF' });
        plantAt(lg, cam, 3.9, 15.0, 1.5); plantAt(lg, cam, -3.2, 15.2, 1.2);
        column(lg, cam, -6.0, 10.4); column(lg, cam, 6.4, 10.4);
        // row B: Daniel's bench (no screen down its spine), his neighbours, and the colleagues at it
        bench(lg, cam, -6.4, 8.0, ROWB.z0, ROWB.z1, { screen: false });
        const seats = [[-4.0, 12.95], [-2.2, 12.95], [2.6, 12.95], [4.4, 12.95], [-3.2, 10.25], [3.6, 10.25]];
        seats.forEach(([x, z], i) => { const here = !empty || i === 2; chairAt(lg, cam, x, z, z > 11 ? -1 : 1);
          if (here) { sitter(lg, cam, x, z, { color: '#2B3537' }); monitor(lg, cam, x, z > 11 ? 11.85 : 11.35, z > 11 ? -1 : 1, { on: true }); } else monitor(lg, cam, x, z > 11 ? 11.85 : 11.35, z > 11 ? -1 : 1); });
        // his own chair, his jacket over its back
        chairAt(lg, cam, DCHAIR.x, DCHAIR.z, -1, { jacket });
        // the near-side desk across from him (empty), then row A's ends either side of the cross-aisle
        bench(lg, cam, -9, -2.6, ROWA.z0, ROWA.z1); bench(lg, cam, 3.4, 10, ROWA.z0, ROWA.z1);
        [[-4.4, 8.4], [4.6, 8.4]].forEach(([x, z]) => { monitor(lg, cam, x, z - 0.4, 1); if (!empty) sitter(lg, cam, x, z + 0.55, { color: '#263133' }); });
      }), 0, 0);
      const em = quarter(c, 'desk|em|' + tod, eg => { const cam = DK.cam(); ceilingEm(eg, cam, tod);
        eg.fillStyle = tod === 'evening' ? 'rgba(243,221,198,0.75)' : 'rgba(246,248,244,0.8)'; eg.fill(path3(cam, [[-20, SILL, WIN_Z], [20, SILL, WIN_Z], [20, HEAD, WIN_Z], [-20, HEAD, WIN_Z]])); });
      c.em.save(); c.em.globalAlpha = 0.8; c.em.drawImage(em, 0, 0, W, H); c.em.restore();
    },
    // Daniel's desk and what stands on it, and the near half of his bench: in front of him
    props(c, t, s) {
      s = s || {}; const g = c.g, lap = s.laptop === 'closed' ? 'closed' : 'open';
      g.drawImage(cached(c, 'desk|props|' + lap, pg => {
        const cam = DK.cam();
        box3(pg, cam, [-6.4, 0.7, ROWB.z0], [8.0, 0.73, ROWB.z1], { top: OP.deskTop, zn: OP.deskEdge, side: OP.deskSide });
        fill3(pg, cam, [[-6.4, 0.7, ROWB.z0], [8.0, 0.7, ROWB.z0], [8.0, 0.0, ROWB.z0 + 0.05], [-6.4, 0.0, ROWB.z0 + 0.05]], 'rgba(40,56,56,0.12)');
        [-6.35, -4.8, -3.2, -1.6, 0.0, 1.6, 3.2, 4.8, 6.4, 7.95].forEach(x => box3(pg, cam, [x - 0.03, 0, ROWB.z0 + 0.05], [x + 0.03, 0.7, ROWB.z0 + 0.1], { side: OP.leg }));
        // the laptop, its lid's back to us (aluminium), the photo frame from behind (a dark easel back), a mug, papers
        const lx = 0.62, lz = 11.95;
        box3(pg, cam, [lx - 0.16, 0.73, lz - 0.02], [lx + 0.16, 0.745, lz + 0.22], { top: '#B7C0BC', side: '#8E9894' });
        if (lap === 'open') { const lt = [[lx - 0.155, 0.745, lz - 0.01], [lx + 0.155, 0.745, lz - 0.01], [lx + 0.155, 0.95, lz - 0.07], [lx - 0.155, 0.95, lz - 0.07]];
          fill3(pg, cam, lt, '#AEB8B4'); fill3(pg, cam, [lt[2], lt[3], [lx - 0.155, 0.955, lz - 0.065], [lx + 0.155, 0.955, lz - 0.065]], '#E4EAE6');
          const lg = cam.p(lx, 0.86, lz - 0.05); pg.fillStyle = 'rgba(232,240,236,0.6)'; pg.beginPath(); pg.arc(lg[0], lg[1], 4, 0, TAU); pg.fill(); }
        box3(pg, cam, [1.12, 0.73, 11.86], [1.24, 0.86, 11.875], { zn: '#1C2122', side: '#2A3031', top: '#3A4243' });
        line3(pg, cam, [1.18, 0.84, 11.875], [1.18, 0.73, 11.95], '#1C2122', 3);
        box3(pg, cam, [0.16, 0.73, 11.8], [0.24, 0.835, 11.88], { zn: '#E2E8E4', side: '#C4CEC9', top: '#5A4636' });
        box3(pg, cam, [-0.5, 0.73, 11.7], [-0.2, 0.77, 12.1], { top: '#F1F4F1', zn: '#D5DCD8', side: '#C9D1CD' });
        box3(pg, cam, [1.3, 0.73, 11.95], [1.42, 0.82, 12.07], { side: '#C9D2CD', top: '#DCE2DE' }); plantAt(pg, cam, 1.36, 12.01, 0.08);
        // the empty near desk: a closed laptop, a lamp of papers, a cable
        box3(pg, cam, [0.4, 0.73, 11.1], [0.72, 0.745, 11.32], { top: '#9AA5A1', side: '#7B8682' });
      }), 0, 0);
      if ((s.glow || 0) > 0 && (s.laptop || 'open') === 'open') { const cam = DK.cam(), p = cam.p(0.62, 0.95, 12.15); g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, p[0], p[1], 0, 160, [[0, '#CFE2E8', 0.28 * s.glow], [1, '#CFE2E8', 0]]); g.fillRect(p[0] - 160, p[1] - 160, 320, 320); g.restore(); }
    },
    front(c, t, s) {
      s = s || {}; const g = c.g, tod = todOf(s);
      if (s.props !== false) desk.props(c, t, s);
      // the partition glass: its frosted band, the meeting room behind us faint in it, a glare streak, dust
      g.drawImage(cached(c, 'desk|pane|' + tod, pg => {
        const cam = DK.cam();
        // reflections of the meeting room's lights (behind us) laid in the glass
        const mc = mirrorCam(cam, [0, 0, PART_Z], [0, 0, -1]); const rl = LC.layer();
        for (let x = -5; x < 2; x += 1.2) for (let z = 1.0; z < 5.4; z += 1.4) fill3(rl, mc, [[x, CEIL, z], [x + 0.6, CEIL, z], [x + 0.6, CEIL, z + 0.6], [x, CEIL, z + 0.6]], 'rgba(240,246,242,0.9)');
        fill3(rl, mc, [[-5, 0.72, 2.0], [1.5, 0.72, 2.0], [1.5, 0.75, 4.4], [-5, 0.75, 4.4]], 'rgba(160,176,172,0.5)');
        pg.save(); pg.globalAlpha = 0.16; pg.drawImage(LC.blurred(rl.canvas, 6, false), 0, 0); pg.restore();
        // the frosted manifestation: a band of dashes at 1.45 m, and the band's edge lines
        frosted(pg, cam, -8, 6, 1.43, 1.52, PART_Z, 0.38); frosted(pg, cam, -8, 6, 1.545, 1.555, PART_Z, 0.3);
        LC.glare(pg, null, { x: 700, y: 400, angle: -1.08, color: '#FFFFFF', bands: [{ d: -330, w: 160, a: 0.045 }, { d: -240, w: 22, a: 0.065 }, { d: 420, w: 260, a: 0.03 }] });
        LC.specks(pg, null, { x: 0, y: 0, w: W, h: H }, 'office-part-dust', { n: 420, color: '#FFFFFF', rMin: 0.5, rMax: 1.4, aMin: 0.04, aMax: 0.2, scratch: 0.12, near: { x: 960, y: 420, r: 900 } });
        LC.smudge(pg, 1500, 690, 60, 34, 0.4, 'office-smudge', '#F2F5F2', 0.06);
        // the partition's slim frame at the left, a door pull beyond it, and the meeting table's edge close and soft
        const fx = cam.p(-1.95, 0, PART_Z)[0]; pg.fillStyle = '#3E4A49'; pg.fillRect(fx - 14, 0, 28, H); pg.fillStyle = 'rgba(220,230,226,0.35)'; pg.fillRect(fx + 9, 0, 3, H);
        blurInto(pg, l => { l.fillStyle = '#1C2526'; l.beginPath(); l.moveTo(-40, 960); l.bezierCurveTo(400, 938, 900, 950, 1120, 1010); l.lineTo(1160, H + 40); l.lineTo(-40, H + 40); l.closePath(); l.fill();
          l.fillStyle = 'rgba(200,214,210,0.5)'; l.fillRect(-40, 958, 1100, 4); }, 12);
        pg.fillStyle = LC.lin(pg, 0, 860, 0, H, [[0, '#0D1414', 0], [1, '#0D1414', 0.42]]); pg.fillRect(0, 860, W, 220);
      }), 0, 0);
    },
    anchors: {}, light: { x: 900, y: 420, color: '#EEF3EF' },
  };

  // =====================================================================================
  // LAPTOP (Q07 47–54, Q09 montage, Q10 0–8): the screen as a pane. Black, it holds the office behind him and his face;
  // waking, it lights his face; on, an email client with the time in its corner; closing, the reflected office folds away.
  // s.screen: 'off' | 'on' (default 'on'); s.wake 0..1 (overrides: 0 = black, 1 = fully on); s.content: 'report' | 'email' | 'sent'
  // s.clock: a string for the menu bar's corner, e.g. '5:37' (none by default); s.lid 0..1 (0 open, 1 shut); s.tod
  // s.reflect(g, R): draw his face/shoulders into the reflection: R.x, R.y the centre of his reflected face, R.scale px/m, R.lit 0..1
  // -------------------------------------------------------------------------------------
  const LP = { cam: () => mkCam({ x: 0.035, y: 0.31, z: -0.47, yaw: deg(-2), pitch: deg(-21.5), f: 2350 }), w: 0.31, d: 0.215, lidH: 0.205, open: deg(108), tex: [1800, 1125] };
  function lidPts(phi) {
    // the lid's four corners (hinge along x at y=0.017, z=0) at an opening angle phi from the deck; inset for the screen
    const r = (u, v) => [u, 0.017 + v * Math.sin(phi), -v * Math.cos(phi)];
    const hw = LP.w / 2 - 0.004, outer = [r(-hw, 0), r(hw, 0), r(hw, LP.lidH), r(-hw, LP.lidH)];
    const si = 0.011, sb = 0.016, st = 0.012, scr = [r(-hw + si, sb), r(hw - si, sb), r(hw - si, LP.lidH - st), r(-hw + si, LP.lidH - st)];
    const back = [r(-hw, 0), r(hw, 0), r(hw, LP.lidH), r(-hw, LP.lidH)].map(p => [p[0], p[1] + 0.006 * Math.cos(phi), p[2] + 0.006 * Math.sin(phi)]);
    return { outer, scr, back, r };
  }
  function screenUI(g, w, h, content, clock) {
    // a quiet email client (or a report), drawn flat; no legible words except the time in the corner
    const R = rng('ui' + content), k = w / 1440;
    g.fillStyle = '#EEF2F1'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#F8FAF9'; g.fillRect(0, 0, w, 44 * k); g.fillStyle = 'rgba(30,40,40,0.12)'; g.fillRect(0, 44 * k, w, 1.5 * k);
    g.fillStyle = 'rgba(40,52,52,0.55)'; [[18, 12], [50, 40], [104, 46], [164, 36], [214, 52]].forEach(([x, ww]) => g.fillRect(x * k, 17 * k, ww * k, 10 * k));
    // the corner: status glyphs, and the clock when it's given
    g.fillStyle = 'rgba(40,52,52,0.6)'; g.fillRect(w - 250 * k, 16 * k, 26 * k, 12 * k); g.fillRect(w - 212 * k, 15 * k, 30 * k, 14 * k);
    if (clock) { g.font = `500 ${Math.round(34 * k)}px "Libre Franklin"`; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(28,38,38,0.94)'; g.fillText(clock, w - 26 * k, 23 * k); }
    if (content === 'report') {
      g.fillStyle = '#2F3D3F'; g.fillRect(0, 31 * k, 220 * k, h);
      for (let i = 0; i < 12; i++) { g.fillStyle = i === 3 ? 'rgba(200,224,230,0.4)' : 'rgba(200,214,214,0.16)'; g.fillRect(20 * k, (70 + i * 34) * k, (90 + R() * 80) * k, 10 * k); }
      g.fillStyle = '#FFFFFF'; g.fillRect(300 * k, 70 * k, 820 * k, h - 70 * k);
      for (let i = 0; i < 16; i++) { g.fillStyle = 'rgba(40,52,52,0.32)'; g.fillRect(350 * k, (130 + i * 26) * k, (420 + R() * 300) * k, 9 * k); }
      g.fillStyle = 'rgba(40,52,52,0.6)'; g.fillRect(350 * k, 92 * k, 320 * k, 16 * k);
      const cb = 600; for (let i = 0; i < 9; i++) { const bh = 40 + R() * 150; g.fillStyle = i === 6 ? '#5D7F8C' : '#9FB6BE'; g.fillRect((370 + i * 76) * k, (cb + 260 - bh) * k, 46 * k, bh * k); }
      g.fillStyle = 'rgba(40,52,52,0.3)'; g.fillRect(350 * k, (cb + 262) * k, 700 * k, 2 * k);
      g.fillStyle = '#F4F7F6'; g.fillRect(1180 * k, 70 * k, 240 * k, h);
      for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(40,52,52,0.18)'; g.fillRect(1200 * k, (100 + i * 40) * k, (120 + R() * 80) * k, 10 * k); }
      return;
    }
    // email: folders (dark), the message list, a message or a draft
    g.fillStyle = '#2F3D3F'; g.fillRect(0, 31 * k, 230 * k, h);
    for (let i = 0; i < 9; i++) { g.fillStyle = i === 0 ? 'rgba(200,224,230,0.42)' : 'rgba(200,214,214,0.15)'; g.fillRect(22 * k, (66 + i * 36) * k, (80 + R() * 90) * k, 10 * k); }
    g.fillStyle = '#FFFFFF'; g.fillRect(232 * k, 31 * k, 460 * k, h);
    for (let i = 0; i < 13; i++) { const y = (44 + i * 74) * k; if (i === (content === 'sent' ? 0 : 1)) { g.fillStyle = '#D5E3E8'; g.fillRect(232 * k, y - 8 * k, 460 * k, 70 * k); }
      g.fillStyle = 'rgba(30,42,42,0.62)'; g.fillRect(256 * k, y + 6 * k, (120 + R() * 110) * k, 10 * k); g.fillStyle = 'rgba(30,42,42,0.3)'; g.fillRect(256 * k, y + 26 * k, (260 + R() * 140) * k, 8 * k); g.fillRect(256 * k, y + 42 * k, (180 + R() * 160) * k, 8 * k);
      g.fillStyle = 'rgba(30,42,42,0.12)'; g.fillRect(232 * k, y + 58 * k, 460 * k, 1.5 * k); }
    g.fillStyle = '#F6F8F7'; g.fillRect(694 * k, 31 * k, w - 694 * k, h);
    if (content !== 'sent') {
      // the final email, written: a draft window with its lines and the send button
      g.fillStyle = '#FFFFFF'; g.fillRect(760 * k, 90 * k, 620 * k, 700 * k); g.fillStyle = 'rgba(30,42,42,0.14)'; g.fillRect(760 * k, 90 * k, 620 * k, 2 * k);
      g.fillStyle = 'rgba(30,42,42,0.12)'; [150, 200].forEach(y => g.fillRect(790 * k, y * k, 560 * k, 1.5 * k));
      g.fillStyle = 'rgba(30,42,42,0.45)'; g.fillRect(790 * k, 124 * k, 180 * k, 10 * k); g.fillRect(790 * k, 172 * k, 260 * k, 10 * k);
      for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(30,42,42,0.3)'; g.fillRect(790 * k, (240 + i * 28) * k, (i === 8 ? 180 : 420 + R() * 120) * k, 9 * k); }
      g.fillStyle = '#4E6E7A'; g.beginPath(); g.roundRect ? g.roundRect(790 * k, 700 * k, 110 * k, 40 * k, 8 * k) : g.rect(790 * k, 700 * k, 110 * k, 40 * k); g.fill();
      g.fillStyle = '#F2F6F5'; g.beginPath(); g.moveTo(828 * k, 711 * k); g.lineTo(864 * k, 720 * k); g.lineTo(828 * k, 729 * k); g.lineTo(834 * k, 720 * k); g.closePath(); g.fill();
    } else {
      for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(30,42,42,0.28)'; g.fillRect(760 * k, (110 + i * 28) * k, (380 + R() * 200) * k, 9 * k); }
    }
  }
  // map a texture onto a projected quad (affine on three corners); good for a near-frontal pane
  function texQuad(g, img, q, alpha) {
    const [a, b, , d] = q, w = img.width, h = img.height;
    g.save(); g.beginPath(); q.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.clip();
    g.transform((b[0] - a[0]) / w, (b[1] - a[1]) / w, (d[0] - a[0]) / h, (d[1] - a[1]) / h, a[0], a[1]); if (alpha != null) g.globalAlpha = alpha; g.drawImage(img, 0, 0); g.restore();
  }
  // for a quad in strong perspective: horizontal slices, each affine
  function texQuadSlices(g, img, q, n, alpha) {
    // overlapping slices must be laid opaque: at partial alpha the overlaps would double up into stripes
    if (alpha != null && alpha < 0.999) { const tg = scratch('of-tqs', g.canvas.width, g.canvas.height); tg.setTransform(g.getTransform()); texQuadSlices(tg, img, q, n);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha; g.drawImage(tg.canvas, 0, 0); g.restore(); return; }
    const [a, b, c2, d] = q, w = img.width, h = img.height, L = (p, r, t) => [p[0] + (r[0] - p[0]) * t, p[1] + (r[1] - p[1]) * t];
    for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, A0 = L(d, a, 1 - t0), B0 = L(c2, b, 1 - t0), A1 = L(d, a, 1 - t1), B1 = L(c2, b, 1 - t1), te = Math.min(1, t1 + 0.6 / n), A2 = L(d, a, 1 - te), B2 = L(c2, b, 1 - te);
      g.save(); g.beginPath(); g.moveTo(A0[0], A0[1]); g.lineTo(B0[0], B0[1]); g.lineTo(B2[0], B2[1]); g.lineTo(A2[0], A2[1]); g.closePath(); g.clip();
      // the slice's top edge and left edge exactly; overshoot the far side so the clip trims it (no gaps where the quad widens)
      const sy0 = t0 * h, w0 = Math.hypot(B0[0] - A0[0], B0[1] - A0[1]) || 1, w1 = Math.hypot(B2[0] - A2[0], B2[1] - A2[1]), os = Math.max(1, w1 / w0) + 0.012;
      const ux = (B0[0] - A0[0]) * os, uy = (B0[1] - A0[1]) * os, vx = (A1[0] - A0[0]) / (h / n), vy = (A1[1] - A0[1]) / (h / n);
      g.transform(ux / w, uy / w, vx, vy, A0[0], A0[1]); if (alpha != null) g.globalAlpha = alpha;
      const ov = Math.min(h - sy0 - h / n, Math.ceil(h / n * 0.7) + 2);                // real texture into the overlap: the next slice's soft edge sits on it
      g.drawImage(img, 0, sy0, w, h / n + Math.max(0, ov), 0, 0, w, h / n + Math.max(0, ov)); g.restore(); }
  }
  const laptop = {
    back(c, t, s) {
      s = s || {}; const g = c.g, tod = todOf(s);
      // beyond the laptop: the office toward the partition, soft (the window is behind him)
      g.drawImage(cached(c, 'laptop|beyond|' + tod, bg => {
        const l = LC.layer(); l.fillStyle = LC.lin(l, 0, 0, 0, H, [[0, '#94A7A2'], [0.3, '#7F938E'], [0.55, '#5E7270'], [1, '#43555A']]); l.fillRect(0, 0, W, H);
        l.fillStyle = '#C6D2CD'; l.fillRect(0, 230, W, 50); l.fillStyle = 'rgba(214,226,222,0.35)'; for (let x = 0; x < W; x += 80) l.fillRect(x, 230, 40, 50);
        const R = rng('lp-beyond'); for (let i = 0; i < 9; i++) { const x = i * 240 + R() * 80, y = 60 + R() * 60; l.fillStyle = tod === 'evening' && i % 2 ? '#B9C6C1' : '#F1F6F2'; l.fillRect(x, y, 150, 26); }
        l.fillStyle = '#3E504F'; for (let i = 0; i < 6; i++) { const x = i * 330 + R() * 100, y = 300 + R() * 40; l.fillRect(x, y, 200 + R() * 90, 120); l.fillStyle = 'rgba(201,220,225,0.5)'; l.fillRect(x + 12, y + 12, 160, 80); l.fillStyle = '#3E504F'; }
        l.fillStyle = '#C3CFCA'; l.fillRect(1500, 0, 90, H);
        l.fillStyle = '#D6DED9'; l.fillRect(0, 520, W, H - 520);
        bg.drawImage(LC.blurred(l.canvas, 22), 0, 0);
      }), 0, 0);
      // the desk surface and the keyboard deck
      g.drawImage(cached(c, 'laptop|deck', dg => {
        const cam = LP.cam();
        fill3(dg, cam, [[-1.5, 0, -0.6], [1.5, 0, -0.6], [1.5, 0, 1.2], [-1.5, 0, 1.2]], '#C7D0CB');
        dg.save(); dg.fillStyle = LC.lin(dg, 0, 500, 0, H, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(20,30,30,0.35)']]); dg.fillRect(0, 500, W, H - 500); dg.restore();
        const hw = LP.w / 2;
        fill3(dg, cam, [[-hw - 0.02, 0.001, -LP.d - 0.03], [hw + 0.02, 0.001, -LP.d - 0.03], [hw + 0.03, 0.001, 0.03], [-hw - 0.03, 0.001, 0.03]], 'rgba(20,30,30,0.35)');
        box3(dg, cam, [-hw, 0, -LP.d], [hw, 0.015, 0], { top: '#5B6365', zn: '#33393B', side: '#454C4E' });
        // keys: dark islands in rows; the trackpad
        for (let r = 0; r < 5; r++) for (let i = 0; i < 13; i++) { const x0 = -hw + 0.022 + i * 0.0205, z0 = -0.038 - r * 0.0195 - 0.02; fill3(dg, cam, [[x0, 0.0152, z0], [x0 + 0.0165, 0.0152, z0], [x0 + 0.0165, 0.0152, z0 - 0.0155], [x0, 0.0152, z0 - 0.0155]], '#16191A'); }
        fill3(dg, cam, [[-0.055, 0.0152, -0.15], [0.055, 0.0152, -0.15], [0.055, 0.0152, -0.205], [-0.055, 0.0152, -0.205]], '#4E5658');
        line3(dg, cam, [-hw, 0.0151, -LP.d], [hw, 0.0151, -LP.d], 'rgba(240,246,242,0.7)', 2);
      }), 0, 0);
    },
    front(c, t, s) {
      s = s || {}; const g = c.g, cam = LP.cam(), tod = todOf(s);
      const lid = clamp(s.lid || 0, 0, 1), phi = LP.open * (1 - lid) + deg(0.6) * lid, L = lidPts(phi);
      const wake = s.wake != null ? clamp(s.wake, 0, 1) : (s.screen === 'off' ? 0 : 1);
      const sq = L.scr.map(p => cam.p(p)), oq = L.outer.map(p => cam.p(p));
      const facing = dot(nrm(sub(cam.pos, L.r(0, LP.lidH / 2))), [0, -Math.cos(phi), -Math.sin(phi)]) > 0;
      if (!facing) { // shut: the lid's back, aluminium, the room's light along its edge
        fill3(g, cam, L.back, '#565E60'); line3(g, cam, L.back[0], L.back[1], 'rgba(240,246,242,0.6)', 2); return; }
      // the lid: bezel black
      g.fillStyle = '#0B0E0F'; g.fill(LC.pathPts(oq));
      // the screen: black glass; what it holds (the office behind him, the window band, his face) slides as the lid turns
      const scrP = LC.pathPts(sq), box = bboxOf(sq);
      g.save(); g.clip(scrP);
      g.fillStyle = '#050707'; g.fillRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
      const fold = (LP.open - phi) * 2 * 1.05;                                       // the reflection turns twice as fast as the lid
      const reflOffset = fold * cam.f * 0.45;
      const refl = cached(c, 'laptop|refl|' + tod, rg => {
        // behind him: the window band (white), the ceiling's lamps above, the far desks; as a black glass shows them
        const w = W, h = H + 900; rg.fillStyle = '#0A0F10'; rg.fillRect(0, 0, w, h);
        const ev = tod === 'evening'; rg.fillStyle = ev ? '#E8D2BE' : '#DDE9EC'; rg.fillRect(0, 360, w, 210);
        rg.fillStyle = 'rgba(60,80,82,0.85)'; for (let x = 40; x < w; x += 170) rg.fillRect(x, 360, 12, 210);
        const R = rng('lp-refl'); for (let r = 0; r < 4; r++) { const y = 300 - r * 70, sc = 1 - r * 0.2; for (let x = -100 + r * 40; x < w; x += 260 * sc) { rg.fillStyle = 'rgba(232,240,236,0.9)'; rg.fillRect(x, y, 120 * sc, 22 * sc); } }
        rg.fillStyle = '#20292A'; rg.fillRect(0, 570, w, 40); rg.fillStyle = '#121819'; rg.fillRect(0, 610, w, h - 610);
        for (let i = 0; i < 8; i++) { rg.fillStyle = '#273031'; rg.fillRect(i * 250 + R() * 60, 520 - R() * 30, 140, 80); }
      }, W, H + 900);
      const ra = lerp(0.92, 0.34, wake);
      g.globalAlpha = ra; g.drawImage(refl, 0, -300 + reflOffset); g.globalAlpha = 1;
      // his face in the glass (the sequence draws it); the screen's light finds it as it wakes
      if (s.reflect) {
        const fc = cam.p(L.r(-0.03, LP.lidH * 0.56)), R = { x: fc[0] - 120, y: fc[1] - 40 + reflOffset * 0.8, scale: cam.f / 1.05, lit: wake, light: { x: fc[0], y: fc[1] + 200, color: '#D8E8EC' } };
        const fg = scratch('of-lp-face', W, H, box); fg.save(); fg.beginPath(); fg.rect(box.x, box.y, box.w, box.h); fg.clip(); s.reflect(fg, R); fg.restore();
        g.globalCompositeOperation = 'screen'; g.globalAlpha = clamp(0.55 + 0.9 * Math.min(wake, 0.35), 0, 1) * (1 - 0.45 * clamp((wake - 0.35) / 0.65, 0, 1)); g.drawImage(fg.canvas, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      // the screen's own light: the backlight first (a grey glow), then the interface
      if (wake > 0) {
        const tex = cached(c, 'laptop|ui|' + (s.content || 'email') + '|' + (s.clock || ''), ug => screenUI(ug, LP.tex[0], LP.tex[1], s.content || 'email', s.clock), LP.tex[0], LP.tex[1]);
        g.globalCompositeOperation = 'screen'; g.fillStyle = rgba('#3A4A4C', clamp(wake * 3, 0, 1) * 0.6); g.fill(scrP); g.globalCompositeOperation = 'source-over';
        const ui = clamp((wake - 0.2) / 0.8, 0, 1);
        const tq = [sq[3], sq[2], sq[1], sq[0]]; if (ui > 0) { if (lid < 0.05) texQuad(g, tex, tq, ui * 0.96); else texQuadSlices(g, tex, tq, 44, ui * 0.96); }
      }
      // glass on glass: the ceiling tubes as soft bars (always there, a little), a long sheen, dust lit from the screen
      g.globalCompositeOperation = 'screen';
      LC.glare(g, null, { x: box.x + box.w * 0.62, y: box.y + box.h * 0.3, angle: -1.05, color: '#FFFFFF', bands: [{ d: -box.w * 0.08, w: box.w * 0.12, a: 0.035 + 0.02 * (1 - wake) }, { d: box.w * 0.06, w: box.w * 0.012, a: 0.05 }] });
      g.globalCompositeOperation = 'source-over';
      g.restore();
      g.strokeStyle = 'rgba(200,214,210,0.18)'; g.lineWidth = 1.5; g.stroke(scrP);
      line3(g, cam, L.outer[3], L.outer[2], 'rgba(220,230,226,0.5)', 1.5);
      // the screen's light falls on the keys and the desk
      if (wake > 0.05) { const cc = cam.p(0, 0.02, -0.06); g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, cc[0], cc[1], 0, 700, [[0, '#BFD3D8', 0.16 * wake], [1, '#BFD3D8', 0]]); g.fillRect(cc[0] - 700, cc[1] - 400, 1400, 800); g.restore();
        const e = c.em; e.save(); e.globalAlpha = 0.5 * wake; e.fillStyle = '#E4EEF0'; e.fill(scrP); e.restore(); }
      // keep the subtitle band calm: the deck's near edge falls into shade
      g.drawImage(cached(c, 'laptop|front', fg => { fg.fillStyle = LC.lin(fg, 0, 880, 0, H, [[0, '#0B1112', 0], [1, '#0B1112', 0.5]]); fg.fillRect(0, 880, W, 200); }), 0, 0);
    },
    anchors: {}, light: { x: 960, y: 400, color: '#D8E8EC' },
  };

  // =====================================================================================
  // PHOTO (Q09 44–58): the small photograph on his desk, Sarah and Emily laughing at something just outside the frame,
  // seen in the frame's glass with the office lights across it. s.angle: radians the frame is turned away (0.5 at first;
  // 0 when he has straightened it to face him). The lights slide across the glass as it turns. anchors.grip: his fingers.
  // -------------------------------------------------------------------------------------
  const PH = { cam: () => mkCam({ x: 0.03, y: 0.33, z: -0.46, yaw: deg(-3), pitch: deg(-29), f: 3100 }), w: 0.178, h: 0.128, pw: 0.152, ph: 0.102, lean: deg(13), tex: [1200, 806] };
  function photoTex(g, w, h) {
    // a summer afternoon in a garden: Sarah and Emily, both laughing at something just outside the frame (to the right)
    const k = w / 1200;
    g.fillStyle = LC.lin(g, 0, 0, 0, h, [[0, '#E9D8B0'], [0.45, '#C9B98A'], [1, '#8E8A5E']]); g.fillRect(0, 0, w, h);
    const R = rng('photo-bokeh'); for (let i = 0; i < 46; i++) { g.fillStyle = rgba(R() < 0.5 ? '#F4E7C4' : '#7E8A5A', 0.22 + R() * 0.25); g.beginPath(); g.arc(R() * w, R() * h * 0.7, (20 + R() * 70) * k, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(90,96,60,0.5)'; g.fillRect(0, h * 0.78, w, h * 0.22);
    g.save(); g.filter = 'blur(' + Math.round(10 * k) + 'px)'; g.drawImage(g.canvas, 0, 0); g.restore();
    // the two of them (the rig, laughing), warm light from the left; Sarah behind, Emily on her lap in front
    const L = { light: { x: -400 * k, y: 100 * k, color: '#FFE2B0' }, detail: 1 };
    if (window.RIG && RIG.CHAR && RIG.CHAR.sarah) {
      person(g, 'sarah', { at: [430 * k, 2960 * k], scale: 1700 * k, view: 'three', facing: 1, body: 'stand', face: 'laugh', head: { turn: 0.35, tilt: -0.14, nod: -0.2 } }, L);
      person(g, 'emily', { at: [790 * k, 1960 * k], scale: 1700 * k, view: 'three', facing: 1, body: 'stand', face: 'laugh', head: { turn: 0.32, tilt: 0.14, nod: -0.12 } }, L);
    } else {
      g.fillStyle = '#7A5541'; g.beginPath(); g.ellipse(560 * k, 330 * k, 120 * k, 150 * k, -0.2, 0, TAU); g.fill();
      g.fillStyle = '#E0B34F'; g.beginPath(); g.ellipse(760 * k, 760 * k, 220 * k, 180 * k, 0, 0, TAU); g.fill();
      g.fillStyle = '#B27E62'; g.beginPath(); g.ellipse(770 * k, 470 * k, 130 * k, 140 * k, 0, 0, TAU); g.fill();
    }
    // the print's own finish: warm grade, a soft vignette, a little fade
    g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(255,214,150,0.35)'; g.fillRect(0, 0, w, h); g.restore();
    g.fillStyle = LC.rad(g, w / 2, h / 2, h * 0.3, w * 0.7, [[0, '#2A2018', 0], [1, '#2A2018', 0.4]]); g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(244,236,220,0.08)'; g.fillRect(0, 0, w, h);
  }
  function framePts(angle) {
    // the frame stands on the desk at the origin, leaning back, turned by `angle` about the vertical
    const ca = Math.cos(angle), sa = Math.sin(angle), cl = Math.cos(PH.lean), sl = Math.sin(PH.lean);
    const T = (u, v, d) => { const y = v * cl, z = v * sl + (d || 0); return [u * ca + z * sa, y, -u * sa + z * ca]; };
    const o = [[-PH.w / 2, 0], [PH.w / 2, 0], [PH.w / 2, PH.h], [-PH.w / 2, PH.h]].map(([u, v]) => T(u, v));
    const bo = (PH.w - PH.pw) / 2, pi = [[-PH.pw / 2, bo], [PH.pw / 2, bo], [PH.pw / 2, bo + PH.ph], [-PH.pw / 2, bo + PH.ph]].map(([u, v]) => T(u, v, -0.002));
    const n = nrm([-sa * cl * 0 + Math.sin(angle) * -sl * 0 + (-sl) * sa, cl * 0 + sl * 0 + cl * 0 + 0, 0]);
    const normal = nrm([ -sl * sa * -1 * 0 - sa * sl, cl, -ca * sl ]);
    return { o, pi, T, normal: nrm([-sa * sl * 0 - sl * sa, cl * 0.0 + Math.sin(PH.lean) * 0 + cl, -sl * ca]).map((v, i) => i === 1 ? Math.sin(PH.lean) : v), ca, sa };
  }
  const photo = {
    back(c, t, s) {
      s = s || {}; const g = c.g, tod = todOf(s);
      g.drawImage(cached(c, 'photo|back|' + tod, bg => {
        const cam = PH.cam();
        // the desk surface receding, and soft beyond it the laptop's edge, a mug, the office's band of window
        const l = LC.layer(); l.fillStyle = LC.lin(l, 0, 0, 0, H, [[0, '#A5B6B1'], [0.25, '#C5D1CC'], [1, '#B4C0BB']]); l.fillRect(0, 0, W, H);
        l.fillStyle = tod === 'evening' ? '#EAD8C6' : '#EEF4F2'; l.fillRect(0, 40, W, 120); l.fillStyle = 'rgba(80,100,100,0.6)'; for (let x = 0; x < W; x += 220) l.fillRect(x, 40, 16, 120);
        l.fillStyle = '#2A3536'; l.fillRect(-60, 160, 820, 300); l.fillStyle = '#9DA8A4'; l.fillRect(-60, 440, 860, 40);
        l.fillStyle = '#E6ECE9'; l.fillRect(1460, 230, 170, 230); l.fillStyle = '#B7C2BD'; l.fillRect(1600, 290, 50, 120);
        bg.drawImage(LC.blurred(l.canvas, 26), 0, 0);
        fill3(bg, cam, [[-0.9, 0, -0.3], [0.9, 0, -0.3], [0.9, 0, 0.6], [-0.9, 0, 0.6]], '#CFD8D3');
        bg.fillStyle = LC.lin(bg, 0, 300, 0, H, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(20,30,30,0.28)']]); bg.fillRect(0, 300, W, H - 300);
        // the far edge of the desk, soft
        const e = cam.p(0, 0, 0.6); bg.fillStyle = 'rgba(240,246,242,0.4)'; bg.fillRect(0, e[1] - 2, W, 3);
      }), 0, 0);
    },
    front(c, t, s) {
      s = s || {}; const g = c.g, cam = PH.cam(), ang = s.angle == null ? 0.5 : s.angle, tod = todOf(s);
      const ca = Math.cos(ang), sa = Math.sin(ang), cl = Math.cos(PH.lean), sl = Math.sin(PH.lean);
      const T = (u, v, d) => { const y = v * cl - (d || 0) * sl * 0, z = v * sl + (d || 0); return [u * ca + z * sa, y, -u * sa + z * ca]; };
      const nrmW = nrm([-sl * sa * 0 + -1 * sa * -1 * 0 - sa * sl * 1 * -1 * -1, cl, 0]);
      const N = nrm([-sa * sl * -1 * -1 * 0 - sl * sa, cl * 0 + 0, 0]);
      const normal = nrm([-sl * sa, cl * 0 + 0, -sl * ca]);
      const n = nrm([-(sa * -sl) * 0 - sa * sl * 0, 0, 0]);
      // the frame's face normal: tilted back by lean, turned by angle (toward the camera, -z)
      const fn = nrm([-sa * cl * 0 - Math.sin(ang) * 0, Math.sin(PH.lean), -Math.cos(PH.lean)]); const fN = [fn[0] * ca - 0 + (-fn[2]) * -sa * 0, fn[1], fn[2]];
      const nFace = nrm([Math.sin(-ang) * Math.cos(PH.lean) * -1 * -1, Math.sin(PH.lean), -Math.cos(ang) * Math.cos(PH.lean)]);
      const outer = [[-PH.w / 2, 0], [PH.w / 2, 0], [PH.w / 2, PH.h], [-PH.w / 2, PH.h]].map(([u, v]) => T(u, v, -0.004));
      const bo = (PH.w - PH.pw) / 2, inner = [[-PH.pw / 2, bo], [PH.pw / 2, bo], [PH.pw / 2, bo + PH.ph], [-PH.pw / 2, bo + PH.ph]].map(([u, v]) => T(u, v, -0.0045));
      // its shadow on the desk, and the strut behind it
      fill3(g, cam, [T(-PH.w / 2 - 0.01, 0, 0.0), T(PH.w / 2 + 0.01, 0, 0.0), T(PH.w / 2 + 0.03, 0, 0.09), T(-PH.w / 2 + 0.02, 0, 0.09)].map(p => [p[0], 0.0005, p[2]]), 'rgba(20,30,30,0.32)');
      fill3(g, cam, [T(-PH.w / 2, -0.001, 0), T(PH.w / 2, -0.001, 0), T(PH.w / 2, PH.h, 0.003), T(-PH.w / 2, PH.h, 0.003)], '#141818');
      // the photograph (texture) with the frame's glass over it
      const tex = cached(c, 'photo|tex', pg => photoTex(pg, PH.tex[0], PH.tex[1]), PH.tex[0], PH.tex[1]);
      const ip = inner.map(p => cam.p(p)), q = [ip[3], ip[2], ip[1], ip[0]];
      texQuadSlices(g, tex, q, 12);
      // the glass: what it reflects — the ceiling's lamps above and behind us — sliding as the frame turns
      const ipath = LC.pathPts(ip), ib = bboxOf(ip);
      g.save(); g.clip(ipath); g.globalCompositeOperation = 'screen';
      const slide = ang * 2 * cam.f * 0.16, lampS = cached(c, 'photo|lamp', lg => { const l = LC.layer(420, 180); l.fillStyle = '#F6FAF7'; l.beginPath(); l.moveTo(40, 60); l.lineTo(360, 40); l.lineTo(380, 120); l.lineTo(60, 140); l.closePath(); l.fill(); lg.drawImage(LC.blurred(l.canvas, 9, false), 0, 0); }, 420, 180);
      [[-0.1, 0.08, 1], [0.55, 0.0, 0.8], [1.2, -0.08, 0.6]].forEach(([u, v, sc]) => { const x = ib.x + ib.w * u + slide, y = ib.y + ib.h * (0.06 + v) - slide * 0.1; g.globalAlpha = (0.42 + 0.35 * clamp(ang * 1.6, 0, 1)) * sc; g.drawImage(lampS, x - 210 * sc, y - 90 * sc, 420 * sc, 180 * sc); }); g.globalAlpha = 1;
      // turned away, the frame holds the white window in its glass and the photograph goes under the glare
      g.fillStyle = rgba(tod === 'evening' ? '#F2DCC6' : '#EEF4F2', clamp((ang - 0.12) * 1.1, 0, 0.7)); g.fillRect(ib.x - 10, ib.y - 10, ib.w + 20, ib.h + 20);
      LC.glare(g, null, { x: ib.x + ib.w * 0.5, y: ib.y + ib.h * 0.5, angle: -1.1 + ang * 0.4, color: '#FFFFFF', bands: [{ d: -ib.w * 0.18 + slide * 0.5, w: ib.w * 0.16, a: 0.08 }, { d: ib.w * 0.05 + slide * 0.5, w: ib.w * 0.02, a: 0.12 }] });
      g.globalCompositeOperation = 'source-over';
      LC.specks(g, null, ib, 'ph-dust', { n: 70, color: '#FFFFFF', rMin: 0.5, rMax: 1.2, aMin: 0.08, aMax: 0.3, scratch: 0.15 });
      LC.smudge(g, ib.x + ib.w * 0.78, ib.y + ib.h * 0.7, 34, 22, 0.5, 'ph-smudge', '#FFFFFF', 0.08);
      g.restore();
      // the frame itself: thin black metal, its top and one edge catching the lamps
      const op = outer.map(p => cam.p(p)), fpth = new Path2D(); fpth.moveTo(op[0][0], op[0][1]); op.forEach(p => fpth.lineTo(p[0], p[1])); fpth.closePath(); ip.slice().reverse().forEach((p, i) => i ? fpth.lineTo(p[0], p[1]) : fpth.moveTo(p[0], p[1])); fpth.closePath();
      g.fillStyle = '#121616'; g.fill(fpth, 'evenodd');
      g.strokeStyle = 'rgba(232,240,236,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(op[3][0], op[3][1]); g.lineTo(op[2][0], op[2][1]); g.stroke();
      g.strokeStyle = 'rgba(232,240,236,0.25)'; g.beginPath(); g.moveTo(op[2][0], op[2][1]); g.lineTo(op[1][0], op[1][1]); g.stroke();
      g.drawImage(cached(c, 'photo|front', fg => { fg.fillStyle = LC.lin(fg, 0, 860, 0, H, [[0, '#0D1414', 0], [1, '#0D1414', 0.45]]); fg.fillRect(0, 860, W, 220); }), 0, 0);
      photo.anchors.grip = (() => { const p = cam.p(T(PH.w / 2, PH.h * 0.55, 0)); return [p[0], p[1]]; })();
    },
    anchors: {}, light: { x: 900, y: -200, color: '#EEF3EF' },
  };

  // =====================================================================================
  // CONFERENCE ROOM (Q08 0–26): a long glass table, blinds drawn against the heat, a projector throwing numbers on the
  // wall. Room coordinates: the table along x from -1.9 to 1.9 at z 0 (width 1.2), top at 0.75; the projection wall at
  // x = 3.3; the window wall at z = 2.4 (blinds, one openable casement); the clock on the wall at z = -2.4.
  // -------------------------------------------------------------------------------------
  const CR = { tableY: 0.75, wallX: 3.3, winZ: 2.4, backZ: -2.4, ceil: 2.6, slide: { y0: 1.05, y1: 2.15, z0: -1.0, z1: 0.95 } };
  function slideTex(g, w, h) {
    // the slide: figures in columns and a chart; numbers are the world's own words here
    g.fillStyle = '#F2F6F7'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3C5A66'; g.fillRect(0, 0, w, h * 0.12);
    g.fillStyle = 'rgba(242,246,247,0.85)'; g.fillRect(w * 0.05, h * 0.04, w * 0.3, h * 0.04);
    g.font = `500 ${Math.round(h * 0.055)}px "Libre Franklin"`; g.textBaseline = 'middle';
    const rows = [['Q1', '4.2', '4.6', '5.1'], ['Q2', '4.8', '5.0', '5.6'], ['Q3', '5.3', '5.9', '6.4'], ['Q4', '6.1', '6.6', '7.2']];
    rows.forEach((r, i) => r.forEach((v, j) => { g.fillStyle = j === 0 ? 'rgba(40,60,66,0.75)' : 'rgba(40,60,66,0.92)'; g.textAlign = j === 0 ? 'left' : 'right'; g.fillText(v, w * (0.06 + j * 0.13) + (j ? w * 0.08 : 0), h * (0.24 + i * 0.12)); }));
    g.fillStyle = 'rgba(40,60,66,0.25)'; for (let i = 0; i < 5; i++) g.fillRect(w * 0.05, h * (0.18 + i * 0.12), w * 0.48, 2);
    const R = rng('slidebars'); for (let i = 0; i < 8; i++) { const bh = h * (0.12 + i * 0.05 + R() * 0.04); g.fillStyle = i > 5 ? '#4F7A88' : '#9BB8C2'; g.fillRect(w * (0.6 + i * 0.045), h * 0.8 - bh, w * 0.03, bh); }
    g.fillStyle = 'rgba(40,60,66,0.4)'; g.fillRect(w * 0.58, h * 0.8, w * 0.38, 2);
    g.textAlign = 'right'; g.fillStyle = 'rgba(40,60,66,0.6)'; g.font = `500 ${Math.round(h * 0.045)}px "Libre Franklin"`; g.fillText('4', w * 0.96, h * 0.93);
  }
  function confRoom(g, cam, o) {
    o = o || {};
    // walls, ceiling, carpet; blinds on the window wall; the projection wall
    fill3(g, cam, [[-4, 0, -2.4], [3.3, 0, -2.4], [3.3, 0, 2.4], [-4, 0, 2.4]], '#2E3E3E');
    fill3(g, cam, [[-4, CR.ceil, -2.4], [3.3, CR.ceil, -2.4], [3.3, CR.ceil, 2.4], [-4, CR.ceil, 2.4]], '#4A5B59');
    fill3(g, cam, [[3.3, 0, -2.4], [3.3, CR.ceil, -2.4], [3.3, CR.ceil, 2.4], [3.3, 0, 2.4]], '#56696A');
    fill3(g, cam, [[-4, 0, 2.4], [3.3, 0, 2.4], [3.3, CR.ceil, 2.4], [-4, CR.ceil, 2.4]], '#3E5050');
    fill3(g, cam, [[-4, 0, -2.4], [3.3, 0, -2.4], [3.3, CR.ceil, -2.4], [-4, CR.ceil, -2.4]], '#465857');
    fill3(g, cam, [[-4, 0, -2.4], [-4, CR.ceil, -2.4], [-4, CR.ceil, 2.4], [-4, 0, 2.4]], '#3A4B4B');
    // the window wall: blinds down against the heat, the day burning through their edges
    for (let x = -3.6; x < 3.0; x += 1.3) { fill3(g, cam, [[x, 0.85, 2.39], [x + 1.15, 0.85, 2.39], [x + 1.15, 2.3, 2.39], [x, 2.3, 2.39]], '#7F8F8A');
      for (let y = 0.88; y < 2.3; y += 0.045) line3(g, cam, [x, y, 2.385], [x + 1.15, y, 2.385], 'rgba(30,44,44,0.4)', 1);
      fill3(g, cam, [[x - 0.02, 0.85, 2.392], [x, 0.85, 2.392], [x, 2.3, 2.392], [x - 0.02, 2.3, 2.392]], '#F6F2E6'); fill3(g, cam, [[x + 1.15, 0.85, 2.392], [x + 1.17, 0.85, 2.392], [x + 1.17, 2.3, 2.392], [x + 1.15, 2.3, 2.392]], '#F6F2E6'); }
    // ceiling lights (off: the projector is on), a ceiling tile grid
    for (let x = -3.5; x < 3; x += 1.2) line3(g, cam, [x, CR.ceil - 0.003, -2.4], [x, CR.ceil - 0.003, 2.4], 'rgba(30,44,44,0.35)', 1);
    for (let z = -2.4; z < 2.4; z += 1.2) line3(g, cam, [-4, CR.ceil - 0.003, z], [3.3, CR.ceil - 0.003, z], 'rgba(30,44,44,0.35)', 1);
  }
  function confTable(g, cam, o) {
    // the glass table: a dark mirror on chrome legs, its edge a green-grey line of light
    const y = CR.tableY, top = [[-1.9, y, -0.6], [1.9, y, -0.6], [1.9, y, 0.6], [-1.9, y, 0.6]];
    [[-1.7, -0.45], [1.7, -0.45], [-1.7, 0.45], [1.7, 0.45]].forEach(([x, z]) => box3(g, cam, [x - 0.025, 0, z - 0.025], [x + 0.025, y - 0.012, z + 0.025], { side: '#9AA6A2', zn: '#C8D2CE' }));
    fill3(g, cam, top, 'rgba(14,22,24,0.86)');
    fill3(g, cam, [[-1.9, y - 0.012, -0.6], [1.9, y - 0.012, -0.6], [1.9, y, -0.6], [-1.9, y, -0.6]], '#6E8C86');
    return path3(cam, top);
  }
  function slideQuad(cam) { const S = CR.slide; return [[CR.wallX - 0.01, S.y1, S.z1], [CR.wallX - 0.01, S.y1, S.z0], [CR.wallX - 0.01, S.y0, S.z0], [CR.wallX - 0.01, S.y0, S.z1]].map(p => cam.p(p)); }
  const LENS = [-0.15, 0.86, -0.15];
  const projector = {
    back(c, t, s) {
      s = s || {}; const g = c.g;
      g.drawImage(cached(c, 'projector|back', bg => {
        const cam = PJ.cam(); bg.fillStyle = '#1E2A2B'; bg.fillRect(0, 0, W, H);
        confRoom(bg, cam); bg.fillStyle = 'rgba(8,14,16,0.42)'; bg.fillRect(0, 0, W, H);
        const tex = OTM.makeCanvas(1280, 720); slideTex(tex.getContext('2d'), 1280, 720);
        const q = slideQuad(cam); texQuadSlices(bg, tex, [q[0], q[1], q[2], q[3]], 20);
        bg.save(); bg.globalCompositeOperation = 'screen'; const qc = [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2]; bg.fillStyle = LC.rad(bg, qc[0], qc[1], 0, 520, [[0, '#CFE0E4', 0.22], [1, '#CFE0E4', 0]]); bg.fillRect(qc[0] - 520, qc[1] - 520, 1040, 1040); bg.restore();
        const tp = confTable(bg, cam);
        // the table's glass gives back the slide and the beam
        const mc = mirrorCam(cam, [0, CR.tableY, 0], [0, 1, 0]); bg.save(); bg.clip(tp); const mq = slideQuad(mc); texQuadSlices(bg, tex, [mq[0], mq[1], mq[2], mq[3]], 20, 0.55); bg.restore();
        // papers and a pen on the glass, a water glass
        box3(bg, cam, [-1.2, 0.751, -0.4], [-0.9, 0.754, -0.18], { top: '#E8ECE8' }); box3(bg, cam, [0.6, 0.751, 0.2], [0.9, 0.754, 0.42], { top: '#DCE2DE' });
      }), 0, 0);
      // the projector on the table: a dark grey box, vents, the lens a hot posterised disc
      g.drawImage(cached(c, 'projector|body', pg => { const cam = PJ.cam();
        box3(pg, cam, [-0.45, 0.75, -0.3], [-0.12, 0.86, -0.02], { top: '#3A4647', zn: '#1E2627', xn: '#283233', xp: '#2E393A', side: '#283233' });
        for (let i = 0; i < 7; i++) { const z = -0.27 + i * 0.03; line3(pg, cam, [-0.43, 0.861, z], [-0.2, 0.861, z], '#141B1C', 2); }
        const lc = cam.p(LENS), k = cam.f / lc[2]; pg.fillStyle = '#121819'; pg.beginPath(); pg.ellipse(lc[0], lc[1], 0.045 * k * 0.5, 0.045 * k, 0, 0, TAU); pg.fill(); }), 0, 0);
      const lc = PJ.cam().p(LENS), k = PJ.cam().f / lc[2];
      g.save(); g.globalCompositeOperation = 'screen';
      [[0.034, 0.25], [0.025, 0.4], [0.016, 0.7], [0.009, 1]].forEach(([r, a]) => { g.fillStyle = rgba('#EAF4F6', a); g.beginPath(); g.ellipse(lc[0], lc[1], r * k * 0.5, r * k, 0, 0, TAU); g.fill(); });
      g.restore();
      const e = c.em; e.fillStyle = '#F4FAFB'; e.beginPath(); e.arc(lc[0], lc[1], 0.03 * k, 0, TAU); e.fill();
      const q = slideQuad(PJ.cam()); e.save(); e.globalAlpha = 0.35; e.fillStyle = '#E8F0F2'; e.fill(LC.pathPts(q)); e.restore();
    },
    front(c, t, s) {
      s = s || {}; const g = c.g, cam = PJ.cam(), lc = cam.p(LENS), q = slideQuad(cam);
      // the beam: a soft frustum from the lens to the slide, with the dust turning in it
      g.save(); g.globalCompositeOperation = 'screen';
      const hull = [lc, q[0], q[1], q[2], q[3]].map(p => [p[0], p[1]]); const bp = LC.pathPts(hullOf(hull));
      g.fillStyle = LC.lin(g, lc[0], lc[1], (q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2, [[0, '#E2EEF0', 0.42], [0.25, '#D8E8EC', 0.16], [0.7, '#D8E8EC', 0.08], [1, '#D8E8EC', 0.05]]); g.fill(bp);
      g.fillStyle = LC.lin(g, lc[0], lc[1], (q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2, [[0, '#FFFFFF', 0.3], [0.12, '#FFFFFF', 0.0]]); g.fill(bp);
      g.clip(bp); const R = rng('beamdust'), n = 150;
      for (let i = 0; i < n; i++) { const u = R(), v = R(), w = R(), sp = 0.3 + R() * 0.6; const a = [lerp(lc[0], lerp(q[1][0], q[0][0], v), u), lerp(lc[1], lerp(lerp(q[0][1], q[3][1], w), lerp(q[1][1], q[2][1], w), v), u)];
        const x = a[0] + Math.sin(t * sp + i) * 14, y = a[1] + Math.cos(t * sp * 0.7 + i * 1.7) * 10 - (t * 3 * sp) % 30;
        g.fillStyle = rgba('#FFFFFF', 0.25 + 0.6 * R() * (1 - u * 0.6)); g.beginPath(); g.arc(x, y, 0.6 + R() * 1.6, 0, TAU); g.fill(); }
      g.restore();
      g.drawImage(cached(c, 'projector|front', fg => { fg.fillStyle = LC.lin(fg, 0, 840, 0, H, [[0, '#0B1112', 0], [1, '#0B1112', 0.5]]); fg.fillRect(0, 840, W, 240);
        LC.glare(fg, null, { x: 900, y: 500, angle: -1.2, color: '#FFFFFF', bands: [{ d: -300, w: 140, a: 0.025 }] }); }), 0, 0);
    },
    anchors: {}, light: { x: 0, y: 0, color: '#D8E8EC' },
  };
  function hullOf(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p; const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
    p.forEach(q => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }); for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  const PJ = { cam: () => mkCam({ x: -1.15, y: 1.02, z: -1.75, yaw: deg(52), pitch: deg(1), f: 1150 }) };

  // TABLE (Q08 6–20): low at the end of the glass table, looking down its length. The colleagues along it (drawn by the
  // sequence) are given back by the dark glass; Daniel at the far end, the slide behind him. s.window 0..1: the casement on
  // the right swings open on the hot day (the glare floods in, the papers lift), then shut. s.reflect(g, R): draw the
  // colleagues again for their reflection; R.mirror(g, y, fn) flips about a screen line y (use R.seats[i].mirrorY).
  const TB = { cam: () => mkCam({ x: -2.55, y: 1.02, z: 0.0, yaw: deg(90), pitch: deg(-3), f: 1350 }) };
  const SEATS = [[-1.2, -0.95], [-0.2, -0.95], [0.8, -0.95], [-1.2, 0.95], [-0.2, 0.95], [0.8, 0.95]];
  const table = {
    back(c, t, s) {
      s = s || {}; const g = c.g;
      g.drawImage(cached(c, 'table|back', bg => {
        const cam = TB.cam(); bg.fillStyle = '#1E2A2B'; bg.fillRect(0, 0, W, H); confRoom(bg, cam);
        const tex = OTM.makeCanvas(1280, 720); slideTex(tex.getContext('2d'), 1280, 720); const q = slideQuad(cam); texQuadSlices(bg, tex, [q[0], q[1], q[2], q[3]], 16);
        // the chairs along the table
        SEATS.forEach(([x, z]) => confChair(bg, cam, x, z, z < 0 ? 1 : -1));
      }), 0, 0);
      // the casement: opening on the right-hand wall lets the hot white day in
      const op = clamp(s.window || 0, 0, 1);
      if (op > 0.001) { const cam = TB.cam(), x0 = 1.2, x1 = 2.3, y0 = 1.0, y1 = 2.1, z = CR.winZ - 0.01, a = op * deg(38);
        const gap = [[x0, y0, z], [x0 + (x1 - x0) * (1 - Math.cos(a)) + 0.0, y0, z], [x0 + (x1 - x0) * (1 - Math.cos(a)), y1, z], [x0, y1, z]];
        fill3(g, cam, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], '#FBF7EA');
        const leaf = [[x1, y0, z], [x1, y1, z], [x1 - (x1 - x0) * Math.cos(a), y1, z + (x1 - x0) * Math.sin(a)], [x1 - (x1 - x0) * Math.cos(a), y0, z + (x1 - x0) * Math.sin(a)]];
        fill3(g, cam, leaf, 'rgba(200,214,212,0.55)'); line3(g, cam, leaf[2], leaf[3], '#5E6E6A', 3);
        const e = c.em; e.save(); e.globalAlpha = op; e.fillStyle = '#FFF6E6'; e.fill(path3(cam, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]])); e.restore(); }
    },
    front(c, t, s) {
      s = s || {}; const g = c.g, cam = TB.cam(), op = clamp(s.window || 0, 0, 1);
      // the glass table in front of everyone: dark mirror, the slide and the beam in it, the colleagues given back
      const tp = confTable(g, cam);
      g.save(); g.clip(tp);
      const mc = mirrorCam(cam, [0, CR.tableY, 0], [0, 1, 0]);
      g.drawImage(cached(c, 'table|refl', rg => { const tex = OTM.makeCanvas(1280, 720); slideTex(tex.getContext('2d'), 1280, 720); const mq = slideQuad(mc);
        texQuadSlices(rg, tex, [mq[0], mq[1], mq[2], mq[3]], 16, 0.5);
        for (let x = -3.6; x < 3.0; x += 1.3) { fill3(rg, mc, [[x - 0.02, 0.85, 2.392], [x, 0.85, 2.392], [x, 2.3, 2.392], [x - 0.02, 2.3, 2.392]], 'rgba(246,242,230,0.6)'); } }), 0, 0);
      if (s.reflect) {
        const tb = bboxOf(scr3(cam, [[-1.9, CR.tableY, -0.6], [1.9, CR.tableY, -0.6], [1.9, CR.tableY, 0.6], [-1.9, CR.tableY, 0.6]]));
        const rg = scratch('of-table-refl', W, H, tb);
        const R = { seats: SEATS.map(([x, z]) => { const p = cam.p(x, 0, z), m = cam.p(x, CR.tableY, z * 0.62); return { x: p[0], y: p[1], scale: cam.f / p[2], mirrorY: m[1] }; }),
          mirror: (gg, y, fn) => { gg.save(); gg.translate(0, 2 * y); gg.scale(1, -1); fn(gg); gg.restore(); }, light: table.light };
        s.reflect(rg, R);
        g.globalAlpha = 0.42; g.drawImage(rg.canvas, tb.x, tb.y, tb.w, tb.h, tb.x, tb.y, tb.w, tb.h); g.globalAlpha = 1;
      }
      if (op > 0) { g.globalCompositeOperation = 'screen'; g.fillStyle = rgba('#FFF4DC', 0.35 * op); g.fill(tp); g.globalCompositeOperation = 'source-over'; }
      g.restore();
      // papers on the glass; when the window opens they lift
      const lift = op * (1 + 0.3 * Math.sin(t * 9));
      [[-1.3, -0.35, 0.1], [-0.4, -0.38, -0.2], [0.5, 0.3, 0.3], [1.1, -0.3, 0.05]].forEach(([x, z, r], i) => { const h = 0.004 + lift * (0.02 + 0.03 * i % 2); const lp = [[x - 0.15, CR.tableY + h, z - 0.11], [x + 0.15, CR.tableY + h + lift * 0.04, z - 0.11], [x + 0.15, CR.tableY + h * 0.2, z + 0.11], [x - 0.15, CR.tableY + h * 0.2, z + 0.11]];
        fill3(g, cam, lp, i % 2 ? '#DCE2DE' : '#EEF1EE'); line3(g, cam, lp[0], lp[1], 'rgba(255,255,255,0.8)', 1.2); });
      // the hot day's glare across everything when the window is open
      if (op > 0) { g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.lin(g, W, 0, W * 0.3, H * 0.6, [[0, '#FFF2D8', 0.6 * op], [0.5, '#FFF2D8', 0.18 * op], [1, '#FFF2D8', 0]]); g.fillRect(0, 0, W, H); g.restore(); }
      g.drawImage(cached(c, 'table|front', fg => { fg.fillStyle = LC.lin(fg, 0, 880, 0, H, [[0, '#0B1112', 0], [1, '#0B1112', 0.45]]); fg.fillRect(0, 880, W, 200); }), 0, 0);
    },
    anchors: {}, light: { x: 1700, y: 600, color: '#E8EEF0' },
  };

  // PRINT (Q08 20–26): a framed print on the conference room wall; in its glass, the wall clock opposite, whose hands sweep
  // from 10:18 to 11:43. The clock face has no numerals (a mirror would reverse them); the hands read as seen.
  // s.time: minutes after midnight (618 = 10:18, 703 = 11:43) or [h, m]
  const PR = { w: 1180, h: 820 };
  function printTex(g, w, h) {
    // corporate calm: a pale coastal photograph, sand and a grey sea, a strip of dune grass
    g.fillStyle = LC.lin(g, 0, 0, 0, h, [[0, '#D9DED8'], [0.42, '#C9D1CC'], [0.44, '#8E9C9A'], [0.6, '#9CA8A3'], [0.62, '#D8CDB4'], [1, '#C7B99C']]); g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(240,244,240,0.5)'; for (let i = 0; i < 6; i++) g.fillRect(0, h * (0.45 + i * 0.025), w, 2);
    const R = rng('dune'); g.strokeStyle = 'rgba(110,116,88,0.7)'; g.lineWidth = 2; for (let i = 0; i < 160; i++) { const x = R() * w, y = h * (0.8 + R() * 0.2); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (R() - 0.5) * 20, y - 30, x + (R() - 0.5) * 30, y - 40 - R() * 40); g.stroke(); }
  }
  const print = {
    back(c, t, s) {
      s = s || {}; const g = c.g;
      g.drawImage(cached(c, 'print|back', bg => {
        bg.fillStyle = LC.lin(bg, 0, 0, 0, H, [[0, '#5C6E6C'], [1, '#43544F']]); bg.fillRect(0, 0, W, H);
        // the frame: wide pale mount, thin dark frame; the photograph in it
        const fx = 300, fy = 90, fw = 1320, fh = 900; bg.fillStyle = 'rgba(10,16,16,0.4)'; bg.fillRect(fx + 18, fy + 22, fw, fh);
        bg.fillStyle = '#1B2223'; bg.fillRect(fx, fy, fw, fh); bg.fillStyle = '#EDEFEA'; bg.fillRect(fx + 22, fy + 22, fw - 44, fh - 44);
        const tex = OTM.makeCanvas(PR.w, PR.h); printTex(tex.getContext('2d'), PR.w, PR.h); bg.drawImage(tex, fx + 110, fy + 100, fw - 220, fh - 200);
        bg.fillStyle = 'rgba(0,0,0,0.12)'; bg.fillRect(fx + 110, fy + 100, fw - 220, 4);
      }), 0, 0);
    },
    front(c, t, s) {
      s = s || {}; const g = c.g;
      let m = s.time == null ? 618 : Array.isArray(s.time) ? s.time[0] * 60 + s.time[1] : s.time;
      const glass = new Path2D(); glass.rect(322, 112, 1276, 856);
      g.save(); g.clip(glass); g.globalCompositeOperation = 'screen';
      // the room behind us in the glass: the blinds' bright edges, the dark table, and the clock on the wall
      g.drawImage(cached(c, 'print|refl', rg => { const l = LC.layer();
        l.fillStyle = 'rgba(150,170,168,0.16)'; l.fillRect(0, 0, W, H); l.fillStyle = 'rgba(30,44,44,0.0)';
        for (let x = 140; x < W; x += 300) { l.fillStyle = 'rgba(246,242,230,0.5)'; l.fillRect(x, 160, 7, 520); l.fillStyle = 'rgba(150,164,160,0.14)'; l.fillRect(x + 10, 160, 270, 520); }
        rg.drawImage(LC.blurred(l.canvas, 3, false), 0, 0); }), 0, 0);
      const cx = 1210, cy = 330, r = 150;
      g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(36,50,50,0.16)'; g.fillRect(322, 112, 1276, 856);
      // the clock as the glass gives it back: drawn small, laid in twice a pixel apart (soft, as a reflection is), faint
      const ck = scratch('of-clock', 360, 360), o = 180;
      // a reflection only adds light: the white face whitens the picture; the hands, ticks and rim are where it doesn't
      ck.fillStyle = '#F4F6F2'; ck.beginPath(); ck.arc(o, o, r + 4, 0, TAU); ck.fill();
      ck.globalCompositeOperation = 'destination-out'; ck.lineCap = 'round';
      ck.lineWidth = 7; ck.beginPath(); ck.arc(o, o, r - 1, 0, TAU); ck.stroke();
      for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, l = i % 5 === 0 ? 20 : 8; ck.lineWidth = i % 5 === 0 ? 4.5 : 2; ck.beginPath(); ck.moveTo(o + Math.sin(a) * (r - 14), o - Math.cos(a) * (r - 14)); ck.lineTo(o + Math.sin(a) * (r - 14 - l), o - Math.cos(a) * (r - 14 - l)); ck.stroke(); }
      const hA = ((m / 60) % 12) / 12 * TAU, mA = (m % 60) / 60 * TAU;
      ck.lineWidth = 10; ck.beginPath(); ck.moveTo(o - Math.sin(hA) * 14, o + Math.cos(hA) * 14); ck.lineTo(o + Math.sin(hA) * r * 0.52, o - Math.cos(hA) * r * 0.52); ck.stroke();
      ck.lineWidth = 6.5; ck.beginPath(); ck.moveTo(o - Math.sin(mA) * 18, o + Math.cos(mA) * 18); ck.lineTo(o + Math.sin(mA) * r * 0.8, o - Math.cos(mA) * r * 0.8); ck.stroke();
      ck.beginPath(); ck.arc(o, o, 10, 0, TAU); ck.fill(); ck.globalCompositeOperation = 'source-over';
      g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.36; g.drawImage(ck.canvas, cx - o - 1, cy - o); g.drawImage(ck.canvas, cx - o + 1, cy - o + 1); g.globalAlpha = 1;
      g.globalCompositeOperation = 'screen';
      // the clock's own glass dome catches a highlight; the print's glass a long sheen over it all, and dust
      g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(cx - 50, cy - 70, 70, 30, -0.5, 0, TAU); g.fill();
      LC.glare(g, null, { x: 900, y: 520, angle: -1.0, color: '#FFFFFF', bands: [{ d: -220, w: 200, a: 0.05 }, { d: -120, w: 20, a: 0.08 }, { d: 280, w: 140, a: 0.03 }] });
      g.globalCompositeOperation = 'source-over';
      g.restore();
      g.drawImage(cached(c, 'print|dust', dg => { LC.specks(dg, null, { x: 322, y: 112, w: 1276, h: 856 }, 'print-dust', { n: 260, color: '#FFFFFF', rMin: 0.5, rMax: 1.3, aMin: 0.05, aMax: 0.24, scratch: 0.1 });
        dg.fillStyle = LC.lin(dg, 0, 880, 0, H, [[0, '#0B1112', 0], [1, '#0B1112', 0.5]]); dg.fillRect(0, 880, W, 200); }), 0, 0);
    },
    anchors: { clock: [1210, 330] }, light: { x: 300, y: 300, color: '#E8EEF0' },
  };

  // =====================================================================================
  // KITCHENETTE (Q08 26–72): a galley along the left wall, a small table by the window at the far end.
  // Room: x -1.3 (counter wall) to 1.3, z 0 (the glass door) to 5 (the window wall); counter top 0.9, wall cupboards above.
  // -------------------------------------------------------------------------------------
  const KT = { cam: () => mkCam({ x: 0.55, y: 1.52, z: -0.9, yaw: deg(-4), pitch: deg(-6), f: 1180 }), win: { x0: -0.7, x1: 1.1, y0: 0.95, y1: 2.25, z: 5 } };
  function kitchenRoom(g, cam, tod, o) {
    o = o || {}; const ev = tod === 'evening';
    fill3(g, cam, [[-1.3, 0, 0], [1.3, 0, 0], [1.3, 0, 5], [-1.3, 0, 5]], '#5E6E6B');
    for (let z = 0; z < 5; z += 0.3) line3(g, cam, [-1.3, 0.001, z], [1.3, 0.001, z], 'rgba(30,44,44,0.2)', 1);
    fill3(g, cam, [[-1.3, 2.6, 0], [1.3, 2.6, 0], [1.3, 2.6, 5], [-1.3, 2.6, 5]], '#B4C1BC');
    fill3(g, cam, [[1.3, 0, 0], [1.3, 2.6, 0], [1.3, 2.6, 5], [1.3, 0, 5]], OP.wall[1]);
    fill3(g, cam, [[-1.3, 0, 0], [-1.3, 2.6, 0], [-1.3, 2.6, 5], [-1.3, 0, 5]], OP.wall[0]);
    fill3(g, cam, [[-1.3, 0, 5], [1.3, 0, 5], [1.3, 2.6, 5], [-1.3, 2.6, 5]], OP.wall[2]);
    // the window at the end: the hot white day (drawn by the caller through it), its frame
    const w = KT.win; fill3(g, cam, [[w.x0, w.y0, w.z - 0.01], [w.x1, w.y0, w.z - 0.01], [w.x1, w.y1, w.z - 0.01], [w.x0, w.y1, w.z - 0.01]], ev ? '#F1DCC6' : '#F8F9F4');
    line3(g, cam, [(w.x0 + w.x1) / 2, w.y0, w.z - 0.02], [(w.x0 + w.x1) / 2, w.y1, w.z - 0.02], OP.frame, 4);
    box3(g, cam, [w.x0 - 0.05, w.y0 - 0.06, w.z - 0.18], [w.x1 + 0.05, w.y0, w.z], { top: '#E1E7E3', zn: '#9EADA8', side: '#B9C4BF' });
    // strip light on the ceiling
    box3(g, cam, [-0.1, 2.56, 0.6], [0.1, 2.6, 4.4], { bottom: '#F2F6F3', side: '#C9D2CD' });
    // the counter along the left: base cupboards, worktop, splashback, wall cupboards
    box3(g, cam, [-1.3, 0, 0.3], [-0.7, 0.86, 4.0], { xp: '#D9E0DC', top: '#C9D2CD', zn: '#B6C0BB' });
    for (let z = 0.3; z < 4.0; z += 0.6) line3(g, cam, [-0.699, 0.05, z], [-0.699, 0.84, z], 'rgba(40,56,56,0.4)', 1.4);
    for (let z = 0.6; z < 4.0; z += 0.6) line3(g, cam, [-0.698, 0.74, z - 0.05], [-0.698, 0.74, z - 0.2], '#7E8C88', 2.5);
    box3(g, cam, [-1.3, 0.86, 0.3], [-0.66, 0.9, 4.0], { top: '#8A9894', xp: '#6E7C78', zn: '#7E8C88' });
    fill3(g, cam, [[-1.29, 0.9, 0.3], [-1.29, 1.45, 0.3], [-1.29, 1.45, 4.0], [-1.29, 0.9, 4.0]], '#C5D0CB');
    box3(g, cam, [-1.3, 1.5, 0.3], [-0.95, 2.2, 4.0], { xp: '#DCE2DE', bottom: '#AEBAB5', zn: '#C6D0CB' });
    for (let z = 0.3; z < 4.0; z += 0.6) line3(g, cam, [-0.949, 1.52, z], [-0.949, 2.18, z], 'rgba(40,56,56,0.35)', 1.2);
    // sink and tap
    fill3(g, cam, [[-1.15, 0.901, 2.5], [-0.8, 0.901, 2.5], [-0.8, 0.901, 3.0], [-1.15, 0.901, 3.0]], '#9AA6A2');
    line3(g, cam, [-1.18, 0.9, 2.75], [-1.18, 1.18, 2.75], '#C9D2CF', 6); line3(g, cam, [-1.18, 1.18, 2.75], [-1.0, 1.16, 2.75], '#C9D2CF', 6);
    // the fridge at the end of the run, brushed steel
    box3(g, cam, [-1.3, 0, 4.05], [-0.65, 1.95, 4.75], { xp: '#AEB8B4', zn: '#8E9894', top: '#C3CCC8' }); line3(g, cam, [-0.649, 0.3, 4.15], [-0.649, 1.5, 4.15], '#E8EEEA', 3);
    // the table by the window and its two chairs
    box3(g, cam, [0.2, 0.0, 3.85], [0.26, 0.72, 3.91], { side: '#9AA6A2' });
    const tt = []; for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; tt.push([0.23 + Math.cos(a) * 0.42, 0.74, 3.88 + Math.sin(a) * 0.42]); } fill3(g, cam, tt, '#E6EBE7');
    fill3(g, cam, tt.map(p => [p[0], 0.72, p[2]]), '#AAB5B0');
    chairAt(g, cam, 0.85, 4.05, -1); chairAt(g, cam, -0.25, 4.3, 1);
  }
  const KM = { coffee: [-0.98, 0.9, 1.0], micro: [-1.0, 0.9, 1.75], phone: [0.18, 0.745, 3.78] };
  const kitchen = {
    back(c, t, s) {
      s = s || {}; const g = c.g, tod = todOf(s);
      g.drawImage(cached(c, 'kitchen|back|' + tod, bg => { const cam = KT.cam(); bg.fillStyle = OP.wall[1]; bg.fillRect(0, 0, W, H); kitchenRoom(bg, cam, tod);
        // the coffee machine: black and chrome, its drip tray, a cup under the spout; the microwave
        const [cx, cy, cz] = KM.coffee; box3(bg, cam, [cx - 0.2, cy, cz - 0.18], [cx + 0.18, cy + 0.42, cz + 0.18], { xp: '#1C2223', top: '#2E3536', zn: '#262D2E' });
        box3(bg, cam, [cx + 0.18, cy, cz - 0.14], [cx + 0.24, cy + 0.03, cz + 0.14], { side: '#8E9894', top: '#B7C0BC' });
        box3(bg, cam, [cx + 0.18, cy + 0.03, cz - 0.04], [cx + 0.22, cy + 0.12, cz + 0.04], { side: '#E8ECE9', top: '#5A4636' });
        box3(bg, cam, [cx + 0.17, cy + 0.32, cz - 0.1], [cx + 0.185, cy + 0.38, cz + 0.1], { xp: '#3A4E52' });
        const [mx, my, mz] = KM.micro; box3(bg, cam, [mx - 0.2, my, mz - 0.25], [mx + 0.16, my + 0.3, mz + 0.25], { xp: '#202728', top: '#3A4243', zn: '#2A3132' });
        fill3(bg, cam, [[mx + 0.161, my + 0.05, mz - 0.22], [mx + 0.161, my + 0.26, mz - 0.22], [mx + 0.161, my + 0.26, mz + 0.1], [mx + 0.161, my + 0.05, mz + 0.1]], '#0E1314');
        // someone's phone on the table, face down until it rings (face up: the screen)
        const [px, py, pz] = KM.phone; box3(bg, cam, [px - 0.04, py, pz - 0.08], [px + 0.04, py + 0.009, pz + 0.08], { top: '#1A1F20', side: '#8A5A4C' });
        box3(bg, cam, [0.45, 0.745, 3.95], [0.53, 0.84, 4.03], { side: '#E2E8E4', top: '#4A3A30' });
      }), 0, 0);
      // the coffee machine's lamp stutters; the phone rings
      const cam = KT.cam(), [cx, cy, cz] = KM.coffee, lampP = cam.p(cx + 0.181, cy + 0.36, cz);
      const st = s.stutter ? (Math.sin(t * 23) > 0.2 || Math.sin(t * 7.3) > 0.7 ? 1 : 0.15) : 0.35;
      g.fillStyle = rgba('#E8B070', st); g.beginPath(); g.arc(lampP[0], lampP[1], 3.5, 0, TAU); g.fill();
      if (s.stutter) { const sp = cam.p(cx + 0.2, cy + 0.2, cz), drip = (t * 3) % 1; g.fillStyle = 'rgba(70,50,36,0.8)'; g.beginPath(); g.ellipse(sp[0], sp[1] + drip * 30, 1.6, 3, 0, 0, TAU); g.fill(); }
      if (s.ring) { const [px, py, pz] = KM.phone, buzz = Math.sin(t * 60) * 1.2, pp = cam.p(px, py + 0.01, pz); g.save(); g.translate(buzz, 0);
        fill3(g, cam, [[px - 0.035, py + 0.0095, pz - 0.075], [px + 0.035, py + 0.0095, pz - 0.075], [px + 0.035, py + 0.0095, pz + 0.075], [px - 0.035, py + 0.0095, pz + 0.075]], '#DDEBEE'); g.restore();
        g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, pp[0], pp[1], 0, 70, [[0, '#CFE4EA', 0.4], [1, '#CFE4EA', 0]]); g.fillRect(pp[0] - 70, pp[1] - 70, 140, 140); g.restore();
        const e = c.em; e.fillStyle = 'rgba(220,236,240,0.9)'; e.beginPath(); e.arc(pp[0], pp[1], 14, 0, TAU); e.fill(); }
      const em = quarter(c, 'kitchen|em|' + tod, eg => { const w = KT.win; eg.fillStyle = 'rgba(250,248,240,0.9)'; eg.fill(path3(cam, [[w.x0, w.y0, w.z - 0.01], [w.x1, w.y0, w.z - 0.01], [w.x1, w.y1, w.z - 0.01], [w.x0, w.y1, w.z - 0.01]])); eg.fillStyle = 'rgba(240,246,242,0.6)'; eg.fill(path3(cam, [[-0.1, 2.56, 0.6], [0.1, 2.56, 0.6], [0.1, 2.56, 4.4], [-0.1, 2.56, 4.4]])); });
      c.em.save(); c.em.globalAlpha = 0.8; c.em.drawImage(em, 0, 0, W, H); c.em.restore();
    },
    front(c, t, s) {
      s = s || {}; const g = c.g;
      // the kitchenette's glass door, from the corridor: its frosted band, the corridor's light in it, a steel pull
      g.drawImage(cached(c, 'kitchen|door', dg => { const cam = KT.cam();
        frosted(dg, cam, -1.3, 1.3, 1.5, 1.58, 0, 0.36); frosted(dg, cam, -1.3, 1.3, 1.0, 1.04, 0, 0.3);
        LC.glare(dg, null, { x: 900, y: 420, angle: -1.1, color: '#FFFFFF', bands: [{ d: -260, w: 150, a: 0.05 }, { d: -180, w: 20, a: 0.07 }, { d: 360, w: 200, a: 0.03 }] });
        LC.specks(dg, null, { x: 0, y: 0, w: W, h: H }, 'kit-door', { n: 380, color: '#FFFFFF', rMin: 0.5, rMax: 1.3, aMin: 0.04, aMax: 0.2, scratch: 0.12, near: { x: 1100, y: 450, r: 900 } });
        // the door's edge and its steel pull, close and soft at the left
        blurInto(dg, l => { l.fillStyle = '#34403F'; l.fillRect(0, 0, 70, H); l.strokeStyle = '#9AA6A2'; l.lineWidth = 26; l.lineCap = 'round'; l.beginPath(); l.moveTo(150, 330); l.lineTo(150, 760); l.stroke(); l.strokeStyle = '#F2F5F2'; l.lineWidth = 6; l.beginPath(); l.moveTo(142, 330); l.lineTo(142, 760); l.stroke(); }, 7);
        dg.fillStyle = LC.lin(dg, 0, 880, 0, H, [[0, '#0D1414', 0], [1, '#0D1414', 0.45]]); dg.fillRect(0, 880, W, 200); }), 0, 0);
    },
    anchors: {}, light: { x: 1150, y: 520, color: '#F8F9F4' },
  };

  // MICROWAVE (Q08 30–36): its black door is the pane: Daniel's reflection (s.reflect) over the mesh of tiny holes, the
  // kitchenette's window and strip light behind him. R.x, R.y: his reflected face's centre; R.scale px/m.
  const microwave = {
    back(c, t, s) {
      const g = c.g; g.drawImage(cached(c, 'micro|back', bg => {
        bg.fillStyle = '#2A3132'; bg.fillRect(0, 0, W, H);
        // the door: black glass in a dark grey frame, the control panel at the right, the handle
        bg.fillStyle = '#1A1F20'; bg.fillRect(110, 70, 1700, 940);
        bg.fillStyle = '#070A0B'; bg.fillRect(170, 130, 1240, 820);
        bg.fillStyle = '#101516'; bg.fillRect(1470, 130, 280, 820);
        bg.fillStyle = 'rgba(160,176,172,0.2)'; for (let i = 0; i < 6; i++) bg.fillRect(1530, 420 + i * 70, 160, 3);
        bg.fillStyle = '#0B0F10'; bg.fillRect(1520, 200, 180, 70);
        bg.fillStyle = '#2E3637'; bg.fillRect(1418, 110, 34, 860); bg.fillStyle = 'rgba(232,240,236,0.4)'; bg.fillRect(1420, 110, 4, 860);
      }), 0, 0);
    },
    front(c, t, s) {
      s = s || {}; const g = c.g, glass = new Path2D(); glass.rect(170, 130, 1240, 820);
      g.save(); g.clip(glass);
      // behind him in the glass: the bright window, the strip light, the pale cupboards
      g.drawImage(cached(c, 'micro|refl', rg => { const l = LC.layer(); l.fillStyle = '#0C1112'; l.fillRect(0, 0, W, H);
        l.fillStyle = '#E6ECE8'; l.fillRect(860, 230, 430, 360); l.fillStyle = 'rgba(80,100,100,0.9)'; l.fillRect(1068, 230, 12, 360);
        l.fillStyle = '#C9D2CD'; l.fillRect(150, 60, 1300, 26); l.fillStyle = '#5E6E6A'; l.fillRect(150, 280, 420, 420); l.fillStyle = '#3E4C4A'; l.fillRect(150, 700, 1300, 400);
        rg.globalAlpha = 0.5; rg.drawImage(LC.blurred(l.canvas, 4, false), 0, 0); }), 0, 0);
      if (s.reflect) { const R = { x: 700, y: 520, scale: 2100, light: { x: 1100, y: 300, color: '#E6ECE8' } }; const fg = scratch('of-mw', W, H, { x: 170, y: 130, w: 1240, h: 820 }); fg.save(); fg.beginPath(); fg.rect(170, 130, 1240, 820); fg.clip(); s.reflect(fg, R); fg.restore();
        g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.62; g.drawImage(fg.canvas, 170, 130, 1240, 820, 170, 130, 1240, 820); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      // the mesh: tiny holes, a dot-matrix over everything behind the glass
      g.drawImage(cached(c, 'micro|mesh', mg => { mg.fillStyle = 'rgba(4,6,6,0.5)'; for (let y = 130; y < 950; y += 7) for (let x = 170 + ((y / 7) % 2) * 3.5; x < 1410; x += 7) { mg.beginPath(); mg.arc(x, y, 2.2, 0, TAU); mg.fill(); } }), 0, 0);
      g.globalCompositeOperation = 'screen'; LC.glare(g, null, { x: 700, y: 500, angle: -1.15, color: '#FFFFFF', bands: [{ d: -260, w: 170, a: 0.05 }, { d: -170, w: 18, a: 0.08 }] }); g.globalCompositeOperation = 'source-over';
      g.restore();
      g.drawImage(cached(c, 'micro|front', fg => { LC.specks(fg, null, { x: 170, y: 130, w: 1240, h: 820 }, 'mw-dust', { n: 240, color: '#FFFFFF', rMin: 0.5, rMax: 1.3, aMin: 0.05, aMax: 0.22, scratch: 0.1 });
        LC.smudge(fg, 1200, 700, 70, 40, 0.3, 'mw-smudge', '#FFFFFF', 0.07); fg.fillStyle = LC.lin(fg, 0, 900, 0, H, [[0, '#0B1112', 0], [1, '#0B1112', 0.5]]); fg.fillRect(0, 900, W, 180); }), 0, 0);
    },
    anchors: { face: [700, 520], scale: 2100 }, light: { x: 1100, y: 300, color: '#E6ECE8' },
  };

  // PHONE (Q08 26–30): someone's phone, face up on the little table, ringing: its screen lit, buzzing against the wood;
  // a mug beside it; the window's light across the glass. Not Daniel's phone: a muted terracotta case, a call screen.
  const phone = {
    back(c, t, s) {
      const g = c.g; g.drawImage(cached(c, 'phone|back', bg => {
        bg.fillStyle = LC.lin(bg, 0, 0, 0, H, [[0, '#C9D2CD'], [1, '#AEB9B4']]); bg.fillRect(0, 0, W, H);
        const R = rng('tablegrain'); bg.globalAlpha = 0.12; for (let i = 0; i < 60; i++) { const y = R() * H; bg.strokeStyle = R() > 0.5 ? '#7E8C88' : '#F2F5F2'; bg.lineWidth = 1 + R() * 2; bg.beginPath(); bg.moveTo(-20, y); bg.bezierCurveTo(600, y + 20, 1300, y - 20, W + 20, y + 10); bg.stroke(); } bg.globalAlpha = 1;
        // the window's light lies across the table from the right; the mug's shadow
        bg.fillStyle = 'rgba(255,255,250,0.35)'; bg.beginPath(); bg.moveTo(1100, 0); bg.lineTo(W, 0); bg.lineTo(W, H); bg.lineTo(700, H); bg.closePath(); bg.fill();
        bg.fillStyle = 'rgba(30,40,40,0.25)'; bg.beginPath(); bg.ellipse(1460, 470, 190, 120, 0.3, 0, TAU); bg.fill();
        bg.fillStyle = '#E8EDEA'; bg.beginPath(); bg.arc(1380, 360, 150, 0, TAU); bg.fill(); bg.fillStyle = '#4A3A30'; bg.beginPath(); bg.arc(1380, 360, 118, 0, TAU); bg.fill(); bg.fillStyle = 'rgba(255,255,255,0.5)'; bg.beginPath(); bg.arc(1380, 360, 150, -2.4, -1.2); bg.lineTo(1380, 360); bg.fill();
      }), 0, 0);
    },
    front(c, t, s) {
      s = s || {}; const g = c.g, ring = s.ring !== false, buzz = ring ? Math.sin(t * 58) * 2.2 + Math.sin(t * 31) * 1.2 : 0, rot = -0.22 + (ring ? Math.sin(t * 47) * 0.004 : 0);
      g.save(); g.translate(820 + buzz, 560); g.rotate(rot);
      g.fillStyle = 'rgba(20,30,30,0.35)'; g.fillRect(-180 + 14, -340 + 20, 360, 680);
      g.fillStyle = '#9A5E4E'; g.fill(LC.rrect(-182, -342, 364, 684, 52)); g.fillStyle = '#7A4A3E'; g.fill(LC.rrect(-182, -342, 364, 12, 6));
      g.fillStyle = '#0A0D0E'; g.fill(LC.rrect(-168, -328, 336, 656, 44));
      const scr = LC.rrect(-160, -320, 320, 640, 40);
      g.save(); g.clip(scr);
      g.fillStyle = ring ? LC.lin(g, 0, -320, 0, 320, [[0, '#3E5258'], [1, '#22302F']]) : '#050707'; g.fillRect(-160, -320, 320, 640);
      if (ring) { g.fillStyle = '#C8D6DA'; g.beginPath(); g.arc(0, -150, 56, 0, TAU); g.fill(); g.fillStyle = '#7E9298'; g.beginPath(); g.arc(0, -168, 22, 0, TAU); g.fill(); g.beginPath(); g.ellipse(0, -112, 38, 22, 0, Math.PI, 0); g.fill();
        g.fillStyle = 'rgba(232,240,240,0.85)'; g.fillRect(-80, -70, 160, 16); g.fillStyle = 'rgba(232,240,240,0.4)'; g.fillRect(-55, -40, 110, 10);
        g.fillStyle = 'rgba(232,240,240,0.18)'; g.fill(LC.rrect(-130, 200, 260, 64, 32)); g.fillStyle = '#E8F0F0'; g.beginPath(); g.arc(-98 + ((t * 0.8) % 1) * 20, 232, 26, 0, TAU); g.fill(); }
      g.globalCompositeOperation = 'screen'; LC.glare(g, null, { x: 0, y: 0, angle: -1.1, color: '#FFFFFF', bands: [{ d: -90, w: 110, a: 0.07 }, { d: 40, w: 14, a: 0.1 }] });
      g.globalCompositeOperation = 'source-over'; g.restore();
      g.restore();
      if (ring) { const e = c.em; e.save(); e.globalAlpha = 0.6; e.fillStyle = '#D8E6EA'; e.fillRect(680, 240, 300, 640); e.restore(); }
      g.drawImage(cached(c, 'phone|front', fg => { LC.specks(fg, null, { x: 640, y: 200, w: 400, h: 720 }, 'ph-dust2', { n: 60, color: '#FFFFFF', rMin: 0.5, rMax: 1.2, aMin: 0.06, aMax: 0.25, scratch: 0.2 });
        fg.fillStyle = LC.lin(fg, 0, 880, 0, H, [[0, '#0B1112', 0], [1, '#0B1112', 0.5]]); fg.fillRect(0, 880, W, 200); }), 0, 0);
    },
    anchors: { phone: [820, 560] }, light: { x: 1700, y: 200, color: '#F8F9F4' },
  };

  // WINDOW (Q08 58–72): the kitchenette window: the bright, hot day held behind glass. The rooftops bleached white, heat
  // rising off them as refraction; on the sill a wilting plant and two mugs; the room faint in the glass. s.reflect optional.
  const WN = { cam: () => mkCam({ x: 0.15, y: 1.5, z: 3.05, yaw: deg(2), pitch: deg(1.5), f: 1250 }) };
  const windowView = {
    back(c, t, s) {
      s = s || {}; const g = c.g;
      const out = cached(c, 'window|out', og => {
        og.fillStyle = LC.lin(og, 0, 0, 0, H, [[0, '#F6F2E6'], [0.5, '#FBF8EE'], [1, '#EFE8D8']]); og.fillRect(0, 0, W, H);
        // the city below, bleached: roofs and chimneys, a glass tower glaring, a street's gap
        const R = rng('kw-roofs');
        og.fillStyle = '#DCD6C6'; og.fillRect(1160, 250, 190, 520); og.fillStyle = '#F6F4EC'; og.fillRect(1160, 250, 64, 520); og.fillStyle = 'rgba(160,170,168,0.55)'; for (let y = 270; y < 760; y += 34) og.fillRect(1226, y, 120, 3);
        for (let i = 0; i < 24; i++) { const x = -100 + i * 96 + R() * 40, w = 130 + R() * 150, y = 570 + R() * 110, ridge = y - 20 - R() * 40;
          og.fillStyle = mix('#C9B99C', '#B8A68A', R()); og.beginPath(); og.moveTo(x, H); og.lineTo(x, y + 30); og.lineTo(x + w * 0.5, ridge); og.lineTo(x + w, y + 30); og.lineTo(x + w, H); og.closePath(); og.fill();
          og.fillStyle = 'rgba(244,236,214,0.9)'; og.beginPath(); og.moveTo(x, y + 30); og.lineTo(x + w * 0.5, ridge); og.lineTo(x + w * 0.5 + 6, ridge + 4); og.lineTo(x + 8, y + 32); og.closePath(); og.fill();
          og.fillStyle = 'rgba(110,98,84,0.55)'; og.fillRect(x, y + 30, w, 5);
          for (let j = 0; j < 3; j++) { og.fillStyle = 'rgba(90,96,98,0.45)'; og.fillRect(x + 14 + j * w * 0.3, y + 60, w * 0.16, 26); }
          if (R() < 0.6) { og.fillStyle = '#A99883'; og.fillRect(x + w * 0.68, ridge - 26, 20, 40); og.fillStyle = 'rgba(80,70,60,0.5)'; og.fillRect(x + w * 0.68 + 14, ridge - 26, 6, 40); } }
        og.fillStyle = 'rgba(120,110,96,0.35)'; og.fillRect(0, 800, W, 280);
      });
      // heat off the roofs: the outside wavers in rising bands
      const k = 1; const src = out, step = 4; const cam = WN.cam(), w = KT.win, q = [[w.x0, w.y0, w.z - 0.01], [w.x1, w.y0, w.z - 0.01], [w.x1, w.y1, w.z - 0.01], [w.x0, w.y1, w.z - 0.01]], qp = scr3(cam, q), qb = bboxOf(qp);
      g.save(); g.beginPath(); qp.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.clip();
      for (let y = Math.max(0, Math.floor(qb.y)); y < Math.min(H, qb.y + qb.h); y += step) { const u = (y - qb.y) / qb.h, amp = 3.5 * Math.pow(u, 1.5) * k; const off = amp * Math.sin(y * 0.09 - t * 6.5) + amp * 0.5 * Math.sin(y * 0.031 + t * 3.1); g.drawImage(src, 0, y, W, step, off, y, W, step); }
      g.globalCompositeOperation = 'multiply'; g.fillStyle = '#DDEBEF'; g.fillRect(0, 0, W, H); g.restore();
      g.drawImage(cached(c, 'window|room', rg => { const cam2 = WN.cam();
        // the wall around the window, the sill and its things
        const wp = new Path2D(); wp.rect(0, 0, W, H); const hole = scr3(cam2, q); wp.moveTo(hole[0][0], hole[0][1]); hole.forEach(p => wp.lineTo(p[0], p[1])); wp.closePath();
        rg.fillStyle = OP.wall[1]; rg.fill(wp, 'evenodd');
        box3(rg, cam2, [w.x0 - 0.08, w.y0 - 0.06, w.z - 0.2], [w.x1 + 0.08, w.y0, w.z], { top: '#E1E7E3', zn: '#93A39E', side: '#B9C4BF' });
        line3(rg, cam2, [(w.x0 + w.x1) / 2, w.y0, w.z - 0.03], [(w.x0 + w.x1) / 2, w.y1, w.z - 0.03], OP.frame, 7);
        [[w.x0, w.y0, w.x1, w.y0 + 0.05], [w.x0, w.y1 - 0.05, w.x1, w.y1]].forEach(([a, b, c2, d]) => fill3(rg, cam2, [[a, b, w.z - 0.03], [c2, b, w.z - 0.03], [c2, d, w.z - 0.03], [a, d, w.z - 0.03]], OP.frame));
        plantAt(rg, cam2, -0.35, w.z - 0.1, 0.25);
        box3(rg, cam2, [0.25, w.y0, w.z - 0.15], [0.34, w.y0 + 0.1, w.z - 0.06], { side: '#E6ECE8', top: '#5A4636' }); box3(rg, cam2, [0.42, w.y0, w.z - 0.14], [0.5, w.y0 + 0.09, w.z - 0.06], { side: '#B7C6CB', top: '#3E3028' });
        // the glass: the kitchenette faint in it, a sheen, dust
        rg.save(); rg.beginPath(); hole.forEach((p, i) => i ? rg.lineTo(p[0], p[1]) : rg.moveTo(p[0], p[1])); rg.closePath(); rg.clip();
        rg.globalCompositeOperation = 'screen'; rg.fillStyle = 'rgba(160,176,172,0.1)'; rg.fillRect(0, 0, W, H); rg.fillStyle = 'rgba(232,240,236,0.18)'; rg.fillRect(600, 120, 600, 22);
        LC.glare(rg, null, { x: 900, y: 450, angle: -1.05, color: '#FFFFFF', bands: [{ d: -260, w: 170, a: 0.05 }, { d: -170, w: 18, a: 0.08 }] }); rg.globalCompositeOperation = 'source-over';
        LC.specks(rg, null, { x: 0, y: 0, w: W, h: H }, 'kw-dust', { n: 380, color: '#FFFFFF', rMin: 0.5, rMax: 1.4, aMin: 0.04, aMax: 0.2, scratch: 0.12 }); rg.restore();
        rg.fillStyle = LC.lin(rg, 0, 860, 0, H, [[0, '#0B1112', 0], [1, '#0B1112', 0.5]]); rg.fillRect(0, 860, W, 220); }), 0, 0);
      const em = quarter(c, 'window|em', eg => { eg.fillStyle = 'rgba(255,250,236,0.5)'; eg.beginPath(); qp.forEach((p, i) => i ? eg.lineTo(p[0], p[1]) : eg.moveTo(p[0], p[1])); eg.closePath(); eg.fill(); });
      c.em.save(); c.em.globalAlpha = 0.85; c.em.drawImage(em, 0, 0, W, H); c.em.restore();
    },
    front(c, t, s) {
      s = s || {}; if (!s.reflect) return; const g = c.g, cam = WN.cam(), w = KT.win, qp = scr3(cam, [[w.x0, w.y0, w.z - 0.01], [w.x1, w.y0, w.z - 0.01], [w.x1, w.y1, w.z - 0.01], [w.x0, w.y1, w.z - 0.01]]), qb = bboxOf(qp);
      const fg = scratch('of-kw', W, H, qb); fg.save(); fg.beginPath(); qp.forEach((p, i) => i ? fg.lineTo(p[0], p[1]) : fg.moveTo(p[0], p[1])); fg.closePath(); fg.clip();
      s.reflect(fg, { x: qb.x + qb.w * 0.3, y: qb.y + qb.h, scale: cam.f / 4.2, light: windowView.light }); fg.restore();
      g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.25; g.drawImage(fg.canvas, qb.x, qb.y, qb.w, qb.h, qb.x, qb.y, qb.w, qb.h); g.restore();
    },
    anchors: {}, light: { x: 960, y: 400, color: '#FBF8EE' },
  };

  // ---------- anchors ----------
  (() => {
    const cam = DK.cam(), dc = cam.p(DCHAIR.x, 0.47, DCHAIR.z), p0 = cam.p(4.6, 0, 14.2), p1 = cam.p(-3.4, 0, 14.2), f0 = cam.p(3.8, 0, 10.0), f1 = cam.p(-2.6, 0, 10.0), st = cam.p(1.9, 0, 12.6);
    desk.anchors = { daniel: { seat: [dc[0], dc[1]], scale: cam.f / dc[2], note: 'seated (RIG body sit: at = the seat), facing us (view front/three)' },
      standing: { x: st[0], y: st[1], scale: cam.f / st[2], note: 'beside his desk, arriving (loosening his tie)' },
      priya: { from: [p0[0], p0[1]], to: [p1[0], p1[1]], scale: cam.f / p0[2], note: 'the aisle behind him, against the window band, right to left' },
      priyaFront: { from: [f0[0], f0[1]], to: [f1[0], f1[1]], scale: cam.f / f0[2], note: 'in front of his desk: call props() after her' },
      laptop: (() => { const p = cam.p(0.62, 0.85, 11.95); return [p[0], p[1]]; })(), photo: (() => { const p = cam.p(1.18, 0.8, 11.87); return [p[0], p[1]]; })() };
    const lc = LP.cam(), L0 = lidPts(LP.open), scr = L0.scr.map(p => lc.p(p)), cr = lc.p(L0.r(LP.w / 2 - 0.03, LP.lidH - 0.02));
    laptop.anchors = { screen: scr.map(p => [p[0], p[1]]), clock: [cr[0], cr[1]], face: (() => { const fc = lc.p(L0.r(-0.03, LP.lidH * 0.56)); return { x: fc[0] - 120, y: fc[1] - 40, scale: lc.f / 1.05 }; })() };
    const kc = KT.cam(), dk = kc.p(-0.3, 0, 1.4), pr0 = kc.p(1.0, 0, 0.6), pr1 = kc.p(0.2, 0, 1.9), pk = kc.p(...KM.phone);
    kitchen.anchors = { daniel: { x: dk[0], y: dk[1], scale: kc.f / dk[2], note: 'at the counter by the coffee machine and microwave (view profile, facing left)' },
      priya: { from: [pr0[0], pr0[1]], to: [pr1[0], pr1[1]], scale: kc.f / pr1[2], note: 'through the door behind us, to beside him' }, phone: [pk[0], pk[1]] };
    const tc = TB.cam(), dn = tc.p(2.25, 0, 0.0); table.anchors = { daniel: { x: dn[0], y: dn[1], scale: tc.f / dn[2], note: 'the far end of the table, before the slide' }, seats: SEATS.map(([x, z]) => { const p = tc.p(x, 0, z); return { x: p[0], y: p[1], scale: tc.f / p[2] }; }) };
    const pc = PJ.cam(), hd = [[0.75, 0.95], [1.75, 0.95]].map(([x, z]) => { const p = pc.p(x, 0.47, z); return { seat: [p[0], p[1]], scale: pc.f / p[2] }; }); projector.anchors = { seats: hd, note: 'colleagues seated across the table (RIG body sit: at = the seat); their heads cut the beam', lens: (() => { const p = pc.p(LENS); return [p[0], p[1]]; })() };
    photo.anchors = { grip: (() => { const pcm = PH.cam(), p = pcm.p(PH.w / 2, PH.h * 0.55 * Math.cos(PH.lean), PH.h * 0.55 * Math.sin(PH.lean)); return [p[0], p[1]]; })(), note: 'the frame\'s right edge, where his fingers turn it (updated each frame for s.angle)' };
  })();

  // =====================================================================================
  // THE SET
  // =====================================================================================
  const dl = v => ({ light: { x: v.light.x, y: v.light.y, color: v.light.color }, ambient: '#6E8682', ambientK: 0.12 });
  SETS.office = {
    views: { desk, laptop, photo, projector, table, print, kitchen, microwave, phone, window: windowView },
    demos: [
      { name: 'desk: morning, Priya passes', draw(c, t) { const v = SETS.office.views.desk, s = { tod: 'morning' }; v.back(c, t, s); const a = v.anchors;
        person(c.g, 'daniel', { at: a.daniel.seat, scale: a.daniel.scale, view: 'three', facing: -1, body: 'sit', face: 'smile', outfit: 'office' }, dl(v));
        person(c.g, 'priya', { at: [lerp(a.priya.from[0], a.priya.to[0], 0.35), lerp(a.priya.from[1], a.priya.to[1], 0.35)], scale: a.priya.scale, view: 'three', facing: -1, body: 'walk', phase: 0.2, face: 'warm' }, dl(v)); v.front(c, t, s); } },
      { name: 'desk: evening, half-empty, laptop shut', draw(c, t) { const v = SETS.office.views.desk, s = { tod: 'evening', laptop: 'closed', jacket: true }; v.back(c, t, s); const a = v.anchors;
        person(c.g, 'daniel', { at: a.daniel.seat, scale: a.daniel.scale, view: 'three', facing: 1, body: 'sit', face: 'tired', outfit: 'office' }, dl(v)); v.front(c, t, s); } },
      { name: 'laptop: black glass, his face', draw(c, t) { const v = SETS.office.views.laptop, s = { screen: 'off', wake: 0.0, reflect: (g, R) => person(g, 'daniel', { at: [R.x, R.y + R.scale * 1.62], scale: R.scale, view: 'front', body: 'stand', face: 'tired', outfit: 'office' }, { light: R.light, exposure: 0.55 }) }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'laptop: waking, the light on his face', draw(c, t) { const v = SETS.office.views.laptop, s = { wake: 0.45, content: 'report', reflect: (g, R) => person(g, 'daniel', { at: [R.x, R.y + R.scale * 1.62], scale: R.scale, view: 'front', body: 'stand', face: 'concentration', outfit: 'office' }, { light: R.light, exposure: 0.6 + 0.6 * R.lit }) }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'laptop: 5:37 in the corner', draw(c, t) { const v = SETS.office.views.laptop, s = { wake: 1, content: 'email', clock: '5:37', tod: 'evening' }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'laptop: shutting (lid 0.55)', draw(c, t) { const v = SETS.office.views.laptop, s = { wake: 1, content: 'sent', clock: '5:37', lid: 0.55, tod: 'evening' }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'photo: turned away', draw(c, t) { const v = SETS.office.views.photo, s = { angle: 0.5, tod: 'afternoon' }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'photo: straightened, facing him', draw(c, t) { const v = SETS.office.views.photo, s = { angle: 0.02, tod: 'afternoon' }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'projector: lens, beam, numbers', draw(c, t) { const v = SETS.office.views.projector; v.back(c, t, {}); v.front(c, t, {}); } },
      { name: 'table: the glass table, window shut', draw(c, t) { const v = SETS.office.views.table; v.back(c, t, {}); const a = v.anchors;
        person(c.g, 'daniel', { at: [a.daniel.x, a.daniel.y], scale: a.daniel.scale, view: 'front', body: 'stand', outfit: 'office' }, dl(v)); v.front(c, t, { reflect: (g, R) => R.mirror(g, R.seats[0].mirrorY, gg => person(gg, 'priya', { at: [R.seats[0].x, R.seats[0].y], scale: R.seats[0].scale, view: 'three', body: 'sit' }, { light: R.light })) }); } },
      { name: 'table: the window opened on the heat', draw(c, t) { const v = SETS.office.views.table, s = { window: 0.8 }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'print: the clock in the glass, 10:18', draw(c, t) { const v = SETS.office.views.print; v.back(c, t, {}); v.front(c, t, { time: 618 }); } },
      { name: 'print: 11:43', draw(c, t) { const v = SETS.office.views.print; v.back(c, t, {}); v.front(c, t, { time: 703 }); } },
      { name: 'kitchen: the machine stutters, a phone rings', draw(c, t) { const v = SETS.office.views.kitchen, s = { stutter: true, ring: true }; v.back(c, t, s); const a = v.anchors.daniel;
        person(c.g, 'daniel', { at: [a.x, a.y], scale: a.scale, view: 'profile', facing: -1, body: 'stand', outfit: 'office' }, dl(v)); v.front(c, t, s); } },
      { name: 'microwave: his blank second', draw(c, t) { const v = SETS.office.views.microwave, s = { reflect: (g, R) => person(g, 'daniel', { at: [R.x, R.y + R.scale * 1.62], scale: R.scale, view: 'front', body: 'stand', face: 'blank', outfit: 'office' }, { light: R.light }) }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'phone: someone\'s, ringing', draw(c, t) { const v = SETS.office.views.phone; v.back(c, t, {}); v.front(c, t, { ring: true }); } },
      { name: 'window: the hot day held behind glass', draw(c, t) { const v = SETS.office.views.window; v.back(c, t, {}); v.front(c, t, {}); } },
    ],
  };
})();
