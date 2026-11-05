/* AUTOPILOT — set: THE BEDROOM (Q01, dawn, 6:14).
   Look C, "Through Glass". Teal-black: the phone's cold white screen is the only light, and its glass is the film's first pane.
   Then the dark window, whose bare glass gives back the bed (the far side empty, the pillow smooth: Sarah has already gone),
   and the roller blind above it beginning to glow at its edges as the dawn grows; Daniel sits up against it.
   One room in true perspective (bedroom space, metres): x across the room, y up, z toward the window (the wall at z = 4).
   The bed's head is against the wall z = 0, its foot toward the window; Daniel sleeps on the left (x < 0), Sarah on the right.
   The set draws the environment only: characters come from RIG and are drawn by the sequences between back() and front().
   See film/api/bedroom.md. Deterministic: OTM.rng / OTM.vnoise / OTM.fbm only. */
(function () {
  'use strict';
  const { W, H } = OTM, P = LC.P;
  const M = 32;
  const clamp = OTM.clamp, lerp = OTM.lerp, mix = OTM.mix, rgba = OTM.rgba;
  const seg = (t, a, b) => clamp((t - a) / (b - a || 1e-6), 0, 1);
  const sstep = (t, a, b) => { const u = seg(t, a, b); return u * u * (3 - 2 * u); };

  // ---------------------------------------------------------------------------------------------------------------
  // small kit (each of the house's set files carries its own)
  // ---------------------------------------------------------------------------------------------------------------
  const bigCache = (c, key, fn) => c.cache(key, g => { g.translate(M, M); fn(g); }, W + 2 * M, H + 2 * M);
  const drawBig = (c, cv, a) => { if (a != null && a < 1) { c.g.save(); c.g.globalAlpha = Math.max(0, a); c.g.drawImage(cv, -M, -M); c.g.restore(); } else c.g.drawImage(cv, -M, -M); };
  const emCache = (c, key, fn) => c.cache(key, e => { e.scale(0.25, 0.25); fn(e); }, W / 4, H / 4);
  const drawEm = (c, cv, a) => { const e = c.em; e.save(); if (a != null) e.globalAlpha = a; e.drawImage(cv, 0, 0, W, H); e.restore(); };
  const mkCam = o => Object.assign(LC.camera(o), { pos: o });
  const kAt = (cam, x, y, z) => cam.f / Math.max(0.05, cam.p(x, y, z)[2]);
  function clipPts(cam, pts) {
    const NEAR = 0.06, d = pts.map(q => cam.p(q)[2]), out = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], da = d[i], db = d[(i + 1) % pts.length];
      if (da >= NEAR) out.push(a);
      if ((da >= NEAR) !== (db >= NEAR)) { const u = (NEAR - da) / (db - da); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]); } }
    return out.map(q => cam.p(q));
  }
  function Qc(g, cam, pts, col) { const q = clipPts(cam, pts); if (q.length < 3) return null; const p = LC.pathPts(q); g.fillStyle = col; g.fill(p); return p; }
  const seg2 = (g, cam, a, b, w, col) => { const p = cam.p(a), q = cam.p(b); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); };
  // a mirror camera: the room as a pane at z = zp gives it back (geometry reflected through the plane)
  const mirrorZ = (cam, zp) => { const p = (x, y, z) => { if (Array.isArray(x)) { z = x[2]; y = x[1]; x = x[0]; } return cam.p(x, y, 2 * zp - z); }; return { p, pts: a => a.map(q => p(q)), f: cam.f, cx: cam.cx, cy: cam.cy, pos: cam.pos, mirror: true }; };
  // an image drawn into a projected quad (tl, tr, br, bl) in n strips (close to a true perspective map)
  function imageInQuad(g, img, q, n) {
    n = n || 24; const iw = img.width, ih = img.height;
    const L = (u, v) => [lerp(lerp(q[0][0], q[1][0], u), lerp(q[3][0], q[2][0], u), v), lerp(lerp(q[0][1], q[1][1], u), lerp(q[3][1], q[2][1], u), v)];
    for (let i = 0; i < n; i++) {
      const v0 = i / n, v1 = (i + 1) / n, a = L(0, v0), b = L(1, v0), d = L(0, v1);
      g.save(); g.beginPath(); const e = L(1, v1); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(e[0], e[1]); g.lineTo(d[0], d[1]); g.closePath(); g.clip();
      g.transform((b[0] - a[0]) / iw, (b[1] - a[1]) / iw, (d[0] - a[0]) / (ih / n), (d[1] - a[1]) / (ih / n), a[0], a[1]);
      g.drawImage(img, 0, ih * v0, iw, ih / n + 1, 0, 0, iw, ih / n + 1); g.restore();
    }
  }
  const _scr = {};
  function scratch(name, w, h) { let c = _scr[name]; if (!c || c.width !== w || c.height !== h) c = _scr[name] = OTM.makeCanvas(w, h); const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h); return g; }

  // =================================================================================================================
  // THE ROOM
  // =================================================================================================================
  const ROOM = { x0: -1.8, x1: 1.8, z0: 0, z1: 4.0, ceil: 2.4 };
  const WINB = { x0: -0.7, x1: 0.7, y0: 0.85, y1: 2.1, z: 4.0 };
  const BED = { x0: -0.78, x1: 0.78, z0: 0.08, z1: 2.1, top: 0.56 };
  const TABLE_L = { x: -1.13, z: 0.3, w: 0.44, d: 0.38, top: 0.56 };
  const BLIND_Y = 1.27;                                  // the blind's hem: drawn down most of the way, a strip of bare glass below
  // the dawn: 0 teal-black (only the screen) .. 1 the blind glowing pale; returns the light's colours
  const dawnCol = d => ({ blind: mix('#0F1819', '#D9D6C6', Math.pow(sstep(d, 0.05, 1), 1.4)), edge: mix('#24302E', '#FFF0D2', sstep(d, 0, 0.7)), sky: mix('#0C161B', '#9DB0B6', sstep(d, 0.15, 1)), room: mix('#0A1213', '#2C3C3E', sstep(d, 0.15, 1)) });

  // the room's own surfaces, lit only by what the state allows (dawn, the phone's glow at a point)
  function roomShell(g, cam, d, o) {
    o = o || {}; const Q = (pts, col) => Qc(g, cam, pts, col), D = dawnCol(d), lit = sstep(d, 0, 1);
    const wall = mix('#0B1415', '#2E3E40', lit * 0.9), wallFar = mix('#0D1718', '#3A4A4A', lit), ceil = mix('#090F10', '#1E2A2B', lit), floor = mix('#0A0F0F', '#262420', lit);
    Q([[ROOM.x0, 0, ROOM.z0], [ROOM.x1, 0, ROOM.z0], [ROOM.x1, ROOM.ceil, ROOM.z0], [ROOM.x0, ROOM.ceil, ROOM.z0]], wall);
    Q([[ROOM.x0, ROOM.ceil, ROOM.z0], [ROOM.x1, ROOM.ceil, ROOM.z0], [ROOM.x1, ROOM.ceil, ROOM.z1], [ROOM.x0, ROOM.ceil, ROOM.z1]], ceil);
    Q([[ROOM.x0, 0, ROOM.z0], [ROOM.x0, ROOM.ceil, ROOM.z0], [ROOM.x0, ROOM.ceil, ROOM.z1], [ROOM.x0, 0, ROOM.z1]], wall);
    Q([[ROOM.x1, 0, ROOM.z0], [ROOM.x1, ROOM.ceil, ROOM.z0], [ROOM.x1, ROOM.ceil, ROOM.z1], [ROOM.x1, 0, ROOM.z1]], wall);
    Q([[ROOM.x0, 0, ROOM.z0], [ROOM.x1, 0, ROOM.z0], [ROOM.x1, 0, ROOM.z1], [ROOM.x0, 0, ROOM.z1]], floor);
    if (!o.noWindowWall) Q([[ROOM.x0, 0, ROOM.z1], [ROOM.x1, 0, ROOM.z1], [ROOM.x1, ROOM.ceil, ROOM.z1], [ROOM.x0, ROOM.ceil, ROOM.z1]], wallFar);
  }
  // the bed: headboard, mattress, the duvet (Daniel's side thrown back, Sarah's smooth), two pillows (his dented, hers smooth)
  function bed(g, cam, d, o) {
    o = o || {}; const Q = (pts, col) => Qc(g, cam, pts, col), lit = sstep(d, 0, 1), L = (a, b) => mix(a, b, lit);
    const hb = L('#0C1314', '#2C3434'), base = L('#0A0F10', '#1E2526'), duv = L('#141E21', '#8C9A9C'), duvShade = L('#0F1719', '#5E6C6E'), sheet = L('#121A1C', '#7A8888'), pil = L('#182326', '#B9C3C2'), pilShade = L('#111A1C', '#7E8A8A');
    Q([[BED.x0 - 0.04, 0, BED.z0 - 0.04], [BED.x1 + 0.04, 0, BED.z0 - 0.04], [BED.x1 + 0.04, 1.12, BED.z0 - 0.04], [BED.x0 - 0.04, 1.12, BED.z0 - 0.04]], hb);
    Q([[BED.x0, 0.12, BED.z1], [BED.x1, 0.12, BED.z1], [BED.x1, BED.top - 0.04, BED.z1], [BED.x0, BED.top - 0.04, BED.z1]], base);
    Q([[BED.x0, 0.12, BED.z0], [BED.x0, 0.12, BED.z1], [BED.x0, BED.top - 0.04, BED.z1], [BED.x0, BED.top - 0.04, BED.z0]], base);
    Q([[BED.x1, 0.12, BED.z0], [BED.x1, 0.12, BED.z1], [BED.x1, BED.top - 0.04, BED.z1], [BED.x1, BED.top - 0.04, BED.z0]], base);
    // the bottom sheet, seen where his half of the duvet is thrown back
    Q([[BED.x0, BED.top - 0.01, BED.z0], [BED.x1, BED.top - 0.01, BED.z0], [BED.x1, BED.top - 0.01, BED.z1], [BED.x0, BED.top - 0.01, BED.z1]], sheet);
    // pillows: his (left) dented, hers (right) smooth and plump
    const pillow = (x0, x1, dent, col, sh) => { const z0 = BED.z0 + 0.06, z1 = BED.z0 + 0.6, y0 = BED.top, y1 = BED.top + (dent ? 0.11 : 0.16);
      Q([[x0, y0, z1], [x1, y0, z1], [x1 - 0.02, y1, z1 - 0.06], [x0 + 0.02, y1, z1 - 0.06]], sh);
      Q([[x0 + 0.02, y1, z0 + 0.04], [x1 - 0.02, y1, z0 + 0.04], [x1 - 0.02, y1, z1 - 0.06], [x0 + 0.02, y1, z1 - 0.06]], col);
      if (dent) Q([[x0 + 0.15, y1 + 0.001, z0 + 0.14], [x1 - 0.15, y1 + 0.001, z0 + 0.16], [x1 - 0.12, y1 + 0.001, z1 - 0.16], [x0 + 0.12, y1 + 0.001, z1 - 0.18]], sh); };
    pillow(BED.x0 + 0.06, -0.04, true, pil, pilShade); pillow(0.04, BED.x1 - 0.06, false, pil, pilShade);
    // the duvet: smooth over her side from the pillows to the foot; on his side thrown back in a rumpled fold
    const fold = BED.z0 + 1.0;
    Q([[0.0, BED.top + 0.06, BED.z0 + 0.62], [BED.x1 + 0.03, BED.top + 0.06, BED.z0 + 0.62], [BED.x1 + 0.03, BED.top + 0.06, BED.z1 + 0.03], [0.0, BED.top + 0.06, BED.z1 + 0.03]], duv);
    Q([[BED.x1 + 0.03, BED.top + 0.06, BED.z0 + 0.62], [BED.x1 + 0.03, BED.top + 0.06, BED.z1 + 0.03], [BED.x1 + 0.03, 0.3, BED.z1 + 0.03], [BED.x1 + 0.03, 0.3, BED.z0 + 0.62]], duvShade);
    Q([[BED.x0 - 0.03, BED.top + 0.06, fold], [0.0, BED.top + 0.06, fold], [0.0, BED.top + 0.06, BED.z1 + 0.03], [BED.x0 - 0.03, BED.top + 0.06, BED.z1 + 0.03]], duv);
    Q([[BED.x0 - 0.03, BED.top + 0.06, fold], [0.0, BED.top + 0.06, fold], [0.0, BED.top + 0.17, fold + 0.12], [BED.x0 - 0.03, BED.top + 0.15, fold + 0.14]], duvShade);   // the thrown-back roll
    Q([[BED.x0 - 0.03, BED.top + 0.15, fold + 0.14], [0.0, BED.top + 0.17, fold + 0.12], [0.0, BED.top + 0.06, fold + 0.3], [BED.x0 - 0.03, BED.top + 0.06, fold + 0.32]], duv);
    Q([[BED.x0 - 0.03, BED.top + 0.06, BED.z0 + 1.0], [BED.x0 - 0.03, BED.top + 0.06, BED.z1 + 0.03], [BED.x0 - 0.03, 0.3, BED.z1 + 0.03], [BED.x0 - 0.03, 0.3, BED.z0 + 1.0]], duvShade);
    Q([[BED.x0 - 0.03, BED.top + 0.06, BED.z1 + 0.03], [BED.x1 + 0.03, BED.top + 0.06, BED.z1 + 0.03], [BED.x1 + 0.03, 0.3, BED.z1 + 0.03], [BED.x0 - 0.03, 0.3, BED.z1 + 0.03]], duvShade);
    // the seam down the middle where the two halves meet (it is one duvet): a faint line
    seg2(g, cam, [0.0, BED.top + 0.061, BED.z0 + 0.62], [0.0, BED.top + 0.061, BED.z1], 1, rgba('#000000', 0.25));
  }
  // bedside table (left: the phone's; right: hers), a lamp on each
  function bedsideTable(g, cam, x, d, o) {
    o = o || {}; const Q = (pts, col) => Qc(g, cam, pts, col), lit = sstep(d, 0, 1), L = (a, b) => mix(a, b, lit), t = TABLE_L;
    const x0 = x - t.w / 2, x1 = x + t.w / 2, z0 = t.z - t.d / 2, z1 = t.z + t.d / 2;
    Q([[x0, 0, z1], [x1, 0, z1], [x1, t.top, z1], [x0, t.top, z1]], L('#0B1213', '#262B2A'));
    Q([[x0, t.top, z0], [x1, t.top, z0], [x1, t.top, z1], [x0, t.top, z1]], o.topCol || L('#0E1617', '#3A3A34'));
    Q([[x0 + 0.03, 0.3, z1 + 0.001], [x1 - 0.03, 0.3, z1 + 0.001], [x1 - 0.03, 0.31, z1 + 0.001], [x0 + 0.03, 0.31, z1 + 0.001]], L('#070B0C', '#141818'));
    // the lamp: a ceramic base and a drum shade (off)
    const lx = x + (x < 0 ? -0.09 : 0.09), lz = t.z - 0.05;
    Q([[lx - 0.05, t.top, lz], [lx + 0.05, t.top, lz], [lx + 0.04, t.top + 0.24, lz], [lx - 0.04, t.top + 0.24, lz]], L('#0D1416', '#2E3A3C'));
    Q([[lx - 0.13, t.top + 0.26, lz], [lx + 0.13, t.top + 0.26, lz], [lx + 0.11, t.top + 0.46, lz], [lx - 0.11, t.top + 0.46, lz]], L('#121B1C', '#5C625C'));
  }
  // the window: the reveal, the frame, the blind (its hem at y), the bare strip of glass beneath, the sill, a radiator under it
  function windowWall(g, cam, d, o) {
    o = o || {}; const Q = (pts, col) => Qc(g, cam, pts, col), D = dawnCol(d), lit = sstep(d, 0, 1), z = WINB.z, by = o.blindY || BLIND_Y;
    // the outside in the bare strip: a dark garden and the houses opposite against a sky that is only just paling
    if (!o.skipOutside) {
      Q([[WINB.x0, WINB.y0, z + 0.01], [WINB.x1, WINB.y0, z + 0.01], [WINB.x1, WINB.y1, z + 0.01], [WINB.x0, WINB.y1, z + 0.01]], D.sky);
      const R = OTM.rng('bedout'); const hz = 1.5;
      g.save(); const glassP = LC.pathPts(clipPts(cam, [[WINB.x0, WINB.y0, z], [WINB.x1, WINB.y0, z], [WINB.x1, by, z], [WINB.x0, by, z]])); g.clip(glassP);
      const far = (x, y, zz) => cam.p(x, y, zz);
      // rooftops and a chimney beyond the garden, a tree's dark crown
      g.fillStyle = mix('#05090B', '#4A585C', lit * 0.8); g.beginPath(); { const pts = [[-3, 0.6], [-1.6, 0.6], [-1.1, 2.2], [0.1, 2.2], [0.6, 0.6], [1.4, 0.6], [1.9, 1.9], [3.2, 1.9], [3.6, 0.6]]; pts.forEach(([x, y], i) => { const q = far(x * 2.4, y * 2.4 - 1.2, z + 14); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); const q1 = far(9, -3, z + 14), q2 = far(-9, -3, z + 14); g.lineTo(q1[0], q1[1]); g.lineTo(q2[0], q2[1]); g.closePath(); g.fill(); }
      g.fillStyle = mix('#04080A', '#36464A', lit * 0.8); for (let i = 0; i < 9; i++) { const q = far(-1.5 + R() * 3.2, 0.2 + R() * 1.2, z + 6 + R() * 3), k = kAt(cam, 0, 1, z + 7); g.beginPath(); g.ellipse(q[0], q[1], (0.5 + R() * 0.5) * k, (0.4 + R() * 0.4) * k, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = mix('#030607', '#283436', lit); const fq = clipPts(cam, [[-6, -0.3, z + 4], [6, -0.3, z + 4], [6, 1.0, z + 4], [-6, 1.0, z + 4]]); if (fq.length > 2) g.fill(LC.pathPts(fq));     // the garden fence and hedge, near black
      g.restore();
    }
    // the window wall around the opening (shade), the reveal's sides, the head
    const wf = mix('#0C1516', '#36464A', lit * 0.85);
    Q([[ROOM.x0, 0, z], [WINB.x0 - 0.1, 0, z], [WINB.x0 - 0.1, ROOM.ceil, z], [ROOM.x0, ROOM.ceil, z]], wf); Q([[WINB.x1 + 0.1, 0, z], [ROOM.x1, 0, z], [ROOM.x1, ROOM.ceil, z], [WINB.x1 + 0.1, ROOM.ceil, z]], wf);
    Q([[WINB.x0 - 0.1, WINB.y1 + 0.1, z], [WINB.x1 + 0.1, WINB.y1 + 0.1, z], [WINB.x1 + 0.1, ROOM.ceil, z], [WINB.x0 - 0.1, ROOM.ceil, z]], wf);
    Q([[WINB.x0 - 0.1, 0, z], [WINB.x1 + 0.1, 0, z], [WINB.x1 + 0.1, WINB.y0 - 0.04, z], [WINB.x0 - 0.1, WINB.y0 - 0.04, z]], wf);
    const rv = mix('#0E1819', '#4A5A5C', lit), rvLit = mix('#142224', D.edge, 0.55 * lit);
    Q([[WINB.x0 - 0.1, WINB.y0, z], [WINB.x0, WINB.y0, z - 0.0], [WINB.x0, WINB.y1, z], [WINB.x0 - 0.1, WINB.y1 + 0.1, z]], rv);
    Q([[WINB.x0, WINB.y0, z], [WINB.x0, WINB.y1, z], [WINB.x0, WINB.y1, z + 0.18], [WINB.x0, WINB.y0, z + 0.18]], rvLit);
    Q([[WINB.x1, WINB.y0, z], [WINB.x1, WINB.y1, z], [WINB.x1, WINB.y1, z + 0.18], [WINB.x1, WINB.y0, z + 0.18]], rvLit);
    Q([[WINB.x0, WINB.y1, z], [WINB.x1, WINB.y1, z], [WINB.x1, WINB.y1, z + 0.18], [WINB.x0, WINB.y1, z + 0.18]], mix('#0A1213', '#2A3436', lit));
    // the sill: a deep painted board, its front edge catching the window
    Q([[WINB.x0 - 0.14, WINB.y0 - 0.04, z - 0.1], [WINB.x1 + 0.14, WINB.y0 - 0.04, z - 0.1], [WINB.x1 + 0.14, WINB.y0, z - 0.1], [WINB.x0 - 0.14, WINB.y0, z - 0.1]], mix('#0C1415', '#3A4444', lit));
    Q([[WINB.x0 - 0.14, WINB.y0, z - 0.1], [WINB.x1 + 0.14, WINB.y0, z - 0.1], [WINB.x1, WINB.y0, z + 0.18], [WINB.x0, WINB.y0, z + 0.18]], mix('#16222A', '#A8B0AA', lit));
    // the window frame (white, in contre-jour) round the glass, a central mullion
    const fr = mix('#0F1718', '#5E6A68', lit), fz = z + 0.17, fw = 0.05;
    const R2 = (x0, x1, y0, y1) => Q([[x0, y0, fz], [x1, y0, fz], [x1, y1, fz], [x0, y1, fz]], fr);
    R2(WINB.x0, WINB.x1, WINB.y0, WINB.y0 + fw); R2(WINB.x0, WINB.x0 + fw, WINB.y0, WINB.y1); R2(WINB.x1 - fw, WINB.x1, WINB.y0, WINB.y1); R2(-fw / 2, fw / 2, WINB.y0, WINB.y1);
    // the blind: linen, hung inside the recess just short of the jambs; its edges leak the dawn, its hem bar is dark
    const bx0 = WINB.x0 + 0.03, bx1 = WINB.x1 - 0.03, bz = z + 0.06;
    Q([[bx0, by, bz], [bx1, by, bz], [bx1, WINB.y1 - 0.02, bz], [bx0, WINB.y1 - 0.02, bz]], D.blind);
    if (d > 0.02) {   // the glow through the cloth is brightest in the middle and at the top; its weave shows faintly
      const q = clipPts(cam, [[bx0, by, bz], [bx1, by, bz], [bx1, WINB.y1 - 0.02, bz], [bx0, WINB.y1 - 0.02, bz]]);
      if (q.length > 2) { const p = LC.pathPts(q), c0 = cam.p(0, (by + WINB.y1) / 2 + 0.15, bz), r = Math.abs(q[1][0] - q[0][0]) * 0.75;
        g.save(); g.clip(p); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, c0[0], c0[1], 0, r, [[0, D.edge, 0.35 * lit], [1, D.edge, 0]]); g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
          g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.06; for (let i = 0; i < 40; i++) { const yy = by + (WINB.y1 - by) * i / 40; seg2(g, cam, [bx0, yy, bz], [bx1, yy, bz], 1, '#000000'); } g.restore(); } }
    // the light round its edges: thin vertical slivers between the blind and the jambs, and a line over the top
    const ew = 0.022, ea = sstep(d, 0, 0.45);
    if (ea > 0) { g.save(); g.globalAlpha = ea;
      Q([[WINB.x0 + fw * 0.2, by - 0.02, bz + 0.02], [bx0, by - 0.02, bz + 0.02], [bx0, WINB.y1 - 0.02, bz + 0.02], [WINB.x0 + fw * 0.2, WINB.y1 - 0.02, bz + 0.02]], D.edge);
      Q([[bx1, by - 0.02, bz + 0.02], [WINB.x1 - fw * 0.2, by - 0.02, bz + 0.02], [WINB.x1 - fw * 0.2, WINB.y1 - 0.02, bz + 0.02], [bx1, WINB.y1 - 0.02, bz + 0.02]], D.edge);
      g.restore(); }
    Q([[bx0 - 0.01, by - 0.025, bz - 0.01], [bx1 + 0.01, by - 0.025, bz - 0.01], [bx1 + 0.01, by + 0.008, bz - 0.01], [bx0 + -0.01, by + 0.008, bz - 0.01]], mix('#070C0D', '#2A2E2C', lit));
    seg2(g, cam, [0.42, by - 0.025, bz - 0.012], [0.42, by - 0.17, bz - 0.012], 1.2, mix('#0B1213', '#5E625C', lit));       // the pull cord
    Q([[bx0, WINB.y1 - 0.02, bz - 0.04], [bx1, WINB.y1 - 0.02, bz - 0.04], [bx1, WINB.y1 + 0.05, bz - 0.04], [bx0, WINB.y1 + 0.05, bz - 0.04]], mix('#0A1112', '#3E4646', lit));   // the roller's box
    // a radiator under the window: ribbed, cold, calm (the bottom of the frame)
    if (!o.noRadiator) { const rz = z - 0.06, ry0 = 0.14, ry1 = 0.66, rx0 = -0.62, rx1 = 0.62; Q([[rx0, ry0, rz], [rx1, ry0, rz], [rx1, ry1, rz], [rx0, ry1, rz]], mix('#0B1213', '#3E4848', lit));
      for (let x = rx0 + 0.035; x < rx1; x += 0.05) seg2(g, cam, [x, ry0 + 0.02, rz - 0.002], [x, ry1 - 0.02, rz - 0.002], Math.max(1, 0.006 * kAt(cam, x, 0.4, rz)), mix('#050909', '#1E2626', lit));
      seg2(g, cam, [rx0, ry1, rz - 0.003], [rx1, ry1, rz - 0.003], 1.5, mix('#16201F', '#9AA49E', lit * 0.8)); }
  }

  // =================================================================================================================
  // THE PHONE (its screens, laid out in their own pixel space and mapped onto the glass)
  // =================================================================================================================
  const SCW = 400, SCH = 866;
  // the alarm: a cold pale screen, 6:14 large, a bell, a slider; 'lock': the dark lock screen after it is silenced
  function alarmUI(state, t) {
    const g = scratch('alarmUI', SCW, SCH);
    if (state === 'alarm') {
      g.fillStyle = LC.lin(g, 0, 0, 0, SCH, [[0, '#E6EEF0'], [0.55, '#CCDADF'], [1, '#B4C6CC']]); g.fillRect(0, 0, SCW, SCH);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(SCW * 0.3, SCH * 0.2, 260, 200, 0.4, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#000'; g.fill(LC.rrect(150, 22, 100, 30, 15));
      // the bell, ringing (a small swing on the ring's beat)
      const sw = Math.sin(t * Math.PI * 2 * 2.2) * 0.25; g.save(); g.translate(SCW / 2, 196); g.rotate(sw); g.fillStyle = '#16262C';
      g.beginPath(); g.moveTo(-18, 14); g.quadraticCurveTo(-18, -18, 0, -20); g.quadraticCurveTo(18, -18, 18, 14); g.lineTo(23, 20); g.lineTo(-23, 20); g.closePath(); g.fill(); g.beginPath(); g.arc(0, 25, 5, 0, Math.PI * 2); g.fill(); g.restore();
      g.font = '400 132px "Libre Franklin"'; g.textAlign = 'center'; g.fillStyle = '#0E1E24'; g.letterSpacing = '-4px'; g.fillText('6:14', SCW / 2 + 4, 360); g.letterSpacing = '0px';
      // the slider at the bottom (no words): a dark pill, its pale knob, a chevron
      g.fillStyle = 'rgba(16,30,36,0.85)'; g.fill(LC.rrect(56, 690, 288, 76, 38)); g.fillStyle = '#E6EEF0'; g.beginPath(); g.arc(94, 728, 30, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#16262C'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(88, 716); g.lineTo(100, 728); g.lineTo(88, 740); g.stroke();
      g.fillStyle = 'rgba(16,30,36,0.5)'; g.fill(LC.rrect(150, 820, 100, 6, 3));
    } else if (state === 'lock') {
      g.fillStyle = LC.lin(g, 0, 0, 0, SCH, [[0, '#1C2A30'], [1, '#0E171B']]); g.fillRect(0, 0, SCW, SCH);
      g.fillStyle = '#000'; g.fill(LC.rrect(150, 22, 100, 30, 15));
      g.font = '400 96px "Libre Franklin"'; g.textAlign = 'center'; g.fillStyle = 'rgba(226,234,236,0.92)'; g.letterSpacing = '-3px'; g.fillText('6:14', SCW / 2 + 3, 230); g.letterSpacing = '0px';
      g.fillStyle = 'rgba(226,234,236,0.35)'; g.fill(LC.rrect(150, 820, 100, 6, 3));
    } else { g.fillStyle = '#020405'; g.fillRect(0, 0, SCW, SCH); }
    return g.canvas;
  }
  // the screen close: BATTERY 7% with a red sliver, and beneath it a clutter of background apps, stacked cards, on black glass
  function batteryUI() {
    const c = OTM.makeCanvas(SCW, SCH), g = c.getContext('2d');
    g.fillStyle = '#05080A'; g.fillRect(0, 0, SCW, SCH);
    g.fillStyle = '#000'; g.fill(LC.rrect(150, 22, 100, 30, 15));
    // the battery panel: a dark rounded card, BATTERY tracked small, 7% large, the glyph with its red sliver
    g.fillStyle = 'rgba(30,40,44,0.92)'; g.fill(LC.rrect(28, 86, SCW - 56, 150, 26));
    g.font = '500 17px "Libre Franklin"'; g.textAlign = 'left'; g.fillStyle = 'rgba(214,224,226,0.7)'; g.letterSpacing = '3px'; g.fillText('BATTERY', 56, 128); g.letterSpacing = '0px';
    g.font = '500 64px "Libre Franklin"'; g.fillStyle = 'rgba(236,242,242,0.96)'; g.fillText('7%', 52, 206);
    const bx = 226, by = 150, bw = 112, bh = 52; g.lineWidth = 4; g.strokeStyle = 'rgba(222,232,232,0.85)'; g.stroke(LC.rrect(bx, by, bw, bh, 13)); g.fillStyle = 'rgba(222,232,232,0.85)'; g.fill(LC.rrect(bx + bw + 4, by + 16, 7, 20, 3));
    g.fillStyle = '#E2503E'; g.fill(LC.rrect(bx + 6, by + 6, 9, bh - 12, 4));
    // the stacked cards of apps still running, a deck low on the screen (their tops peeking), dim; above them, black glass
    const card = (i, draw) => { const x = 40 + i * 6, y = 470 + i * 62, w = SCW - 80 - i * 12, h = 360; g.save(); g.fillStyle = 'rgba(0,0,0,0.6)'; g.fill(LC.rrect(x + 3, y - 8, w, h, 26));
      const p = LC.rrect(x, y, w, h, 26); g.fillStyle = '#1D2A30'; g.fill(p); g.clip(p); draw(x, y, w, h); g.fillStyle = 'rgba(4,8,10,' + (0.5 - i * 0.08) + ')'; g.fillRect(x, y, w, h); g.restore();
      g.save(); g.strokeStyle = 'rgba(200,214,218,0.14)'; g.lineWidth = 1.5; g.stroke(p); g.restore(); };
    card(0, (x, y, w, h) => { g.fillStyle = '#3C4A44'; g.fillRect(x, y, w, h); g.strokeStyle = '#6E7A6A'; g.lineWidth = 9; g.beginPath(); g.moveTo(x - 10, y + 60); g.bezierCurveTo(x + 120, y + 30, x + 200, y + 140, x + w + 10, y + 90); g.stroke(); });
    card(1, (x, y, w, h) => { g.fillStyle = '#C9D0CE'; g.fillRect(x, y, w, h); for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#AEB8BA' : '#88A6AE'; g.fill(LC.rrect(k % 2 ? x + 120 : x + 20, y + 16 + k * 46, 160, 30, 15)); } });
    card(2, (x, y, w, h) => { g.fillStyle = '#D8D8D2'; g.fillRect(x, y, w, h); g.fillStyle = '#A8443A'; g.fillRect(x, y, w, 34); g.fillStyle = '#A2A8A8'; for (let r = 0; r < 5; r++) for (let q = 0; q < 7; q++) g.fillRect(x + 16 + q * 42, y + 50 + r * 38, 32, 26); });
    card(3, (x, y, w, h) => { g.fillStyle = '#CFCDC6'; g.fillRect(x, y, w, h); g.fillStyle = '#5E6A70'; g.fillRect(x + 18, y + 20, w - 36, 100); g.fillStyle = '#8A9090'; for (let k = 0; k < 6; k++) g.fillRect(x + 18, y + 140 + k * 20, w - 36 - (k % 3) * 50, 9); });
    card(4, (x, y, w, h) => { g.fillStyle = '#20262C'; g.fillRect(x, y, w, h); g.fillStyle = '#5E4A7A'; g.fill(LC.rrect(x + 20, y + 20, 96, 96, 12)); g.fillStyle = '#6E767A'; g.fillRect(x + 134, y + 40, 140, 12); g.fillRect(x + 134, y + 64, 90, 9); g.fillStyle = '#3E4448'; g.fillRect(x + 20, y + 140, w - 40, 5); g.fillStyle = '#B8BCBC'; g.fillRect(x + 20, y + 140, 64, 5); });
    return c;
  }

  // =================================================================================================================
  // VIEW: the phone on the bedside table (Q01 5-11): face up, shivering, the screen the only light in the room
  // =================================================================================================================
  const tableCam = mkCam({ x: -1.0, y: 0.99, z: 0.96, yaw: Math.PI + 0.16, pitch: -0.56, f: 2000, cx: W / 2 + 40, cy: H / 2 + 60 });
  const PHONE = { x: -1.12, z: 0.27, w: 0.072, l: 0.148, ang: 0.32 };
  const phoneCorners = (o) => { o = o || {}; const ca = Math.cos(PHONE.ang), sa = Math.sin(PHONE.ang), y = TABLE_L.top + 0.009, P3 = (u, v) => [PHONE.x + u * ca - v * sa + (o.dx || 0), y, PHONE.z + u * sa + v * ca + (o.dz || 0)];
    const hw = PHONE.w / 2 - (o.inset || 0), hl = PHONE.l / 2 - (o.inset || 0); return [P3(-hw, hl), P3(hw, hl), P3(hw, -hl), P3(-hw, -hl)]; };    // tl, tr, br, bl as the screen reads (its top away from us)
  const screenLevel = s => { const st = s.screen || 'alarm'; return (st === 'alarm' ? 1 : st === 'lock' ? 0.32 : 0) * (s.glow == null ? 1 : s.glow); };
  const table = {
    cam: tableCam,
    back(c, t, s) {
      s = s || {}; const g = c.g, cam = tableCam, lv = screenLevel(s), st = s.screen || 'alarm';
      // the room in the dark (cached), then the screen's light laid over it at its level
      drawBig(c, bigCache(c, 'bedroom:table:dark', gg => { gg.fillStyle = '#050909'; gg.fillRect(-M, -M, W + 2 * M, H + 2 * M); bedsideScene(gg, cam, 0); }));
      if (lv > 0.001) drawBig(c, bigCache(c, 'bedroom:table:lit', gg => { gg.fillStyle = '#0A1213'; gg.fillRect(-M, -M, W + 2 * M, H + 2 * M); bedsideScene(gg, cam, 1); }), lv);
      // the phone, shivering while it rings: jitter on ones, a hair of rotation
      const sh = (s.shiver == null ? (st === 'alarm' ? 1 : 0) : s.shiver) * (OTM.vnoise(t * 31, 1, 3) > 0.42 ? 1 : 0.3);
      const jx = sh * (OTM.vnoise(t * 70, 3, 9) - 0.5) * 0.004, jz = sh * (OTM.vnoise(t * 70, 7, 9) - 0.5) * 0.004;
      const body = clipPts(cam, phoneCorners({ dx: jx, dz: jz })), glass = clipPts(cam, phoneCorners({ dx: jx, dz: jz, inset: 0.0035 }));
      { const sb = clipPts(cam, phoneCorners({ dx: jx + 0.004, dz: jz + 0.006 })).map(q => [q[0], q[1] + 6]); g.fillStyle = 'rgba(2,4,4,0.75)'; g.fill(LC.rquad(sb, 34)); }
      g.fillStyle = '#121617'; g.fill(LC.rquad(body, 34)); g.strokeStyle = 'rgba(160,184,190,' + (0.25 + 0.4 * lv) + ')'; g.lineWidth = 2; g.stroke(LC.rquad(body, 34));
      const ui = alarmUI(st, t);
      g.save(); g.clip(LC.rquad(glass, 28)); imageInQuad(g, ui, glass, 28); g.restore();
      // emissive: the screen blooms
      if (lv > 0) { const E = c.em; E.save(); E.globalAlpha = 0.85 * lv; E.fillStyle = '#DCE8EC'; E.fill(LC.rquad(glass, 28)); E.restore(); }
      this._glass = glass;
    },
    front(c, t, s) {
      s = s || {}; const g = c.g, glass = this._glass; if (!glass) return; const lv = screenLevel(s);
      const p = LC.rquad(glass, 28);
      // the glass: a sheen, a thumb's smudge, dust lit by its own light
      LC.glare(g, p, { x: (glass[0][0] + glass[2][0]) / 2, y: (glass[0][1] + glass[2][1]) / 2, angle: -0.9, color: '#FFFFFF', bands: [{ d: -40, w: 70, a: 0.05 + 0.04 * lv }, { d: 50, w: 12, a: 0.06 }] });
      const xs = glass.map(q => q[0]), ys = glass.map(q => q[1]);
      LC.specks(g, p, { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }, 'bedPhoneDust', { n: 70, color: '#FFFFFF', rMin: 0.5, rMax: 1.2, aMin: 0.05, aMax: 0.2, scratch: 0.15 });
      // the air of the room: the faintest haze over the light pool
      if (lv > 0) { const c0 = tableCam.p(PHONE.x, TABLE_L.top, PHONE.z); g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, c0[0], c0[1], 0, 700, [[0, '#BFD8DE', 0.08 * lv], [1, '#BFD8DE', 0]]); g.fillRect(0, 0, W, H); g.restore(); }
    },
    anchors: (() => { const cam = tableCam, gl = clipPts(cam, phoneCorners({ inset: 0.0035 })).map(q => q.slice(0, 2).map(Math.round)), P2 = (x, y, z) => cam.p(x, y, z).slice(0, 2).map(Math.round);
      const ca = Math.cos(PHONE.ang), sa = Math.sin(PHONE.ang), slider = [PHONE.x + (-0.02) * ca - (-0.05) * sa, TABLE_L.top + 0.01, PHONE.z + (-0.02) * sa + (-0.05) * ca];
      return { screen: gl, phone: P2(PHONE.x, TABLE_L.top, PHONE.z), stop: P2(...slider), pxPerM: Math.round(kAt(cam, PHONE.x, TABLE_L.top, PHONE.z)), handFrom: [W + 80, 760], pillow: P2(-0.6, 0.7, 0.4) }; })(),
    light: { x: 0, y: 0, color: '#DCE8EC', note: 'the screen, from below: use anchors.phone as the point light' },
  };
  table.light.x = table.anchors.phone[0]; table.light.y = table.anchors.phone[1];
  // the bedside: table, lamp, a glass of water, the bed's edge, the wall; lit = 1 draws it as the screen lights it (a pool, faces turned to it)
  function bedsideScene(g, cam, lit) {
    const Q = (pts, col) => Qc(g, cam, pts, col), L = (a, b) => lit ? b : a;
    Q([[ROOM.x0, 0, 0], [0.4, 0, 0], [0.4, ROOM.ceil, 0], [ROOM.x0, ROOM.ceil, 0]], L('#060A0B', '#16262A'));
    Q([[ROOM.x0, 0, 0], [ROOM.x0, ROOM.ceil, 0], [ROOM.x0, ROOM.ceil, 1.6], [ROOM.x0, 0, 1.6]], L('#050909', '#0F1B1E'));
    Q([[ROOM.x0, 0, 0], [0.4, 0, 0], [0.4, 0, 1.6], [ROOM.x0, 0, 1.6]], L('#040707', '#0B1214'));
    // the headboard and the bed's near corner, the pillow's edge and the duvet, catching the light from the side
    Q([[BED.x0 - 0.04, 0, BED.z0 - 0.04], [0.4, 0, BED.z0 - 0.04], [0.4, 1.12, BED.z0 - 0.04], [BED.x0 - 0.04, 1.12, BED.z0 - 0.04]], L('#070C0D', '#1E2E31'));
    Q([[BED.x0, 0.12, BED.z0], [BED.x0, 0.12, 1.6], [BED.x0, BED.top + 0.06, 1.6], [BED.x0, BED.top + 0.06, BED.z0]], L('#060A0A', '#24363A'));
    Q([[BED.x0, BED.top + 0.06, BED.z0], [0.4, BED.top + 0.06, BED.z0], [0.4, BED.top + 0.06, 1.6], [BED.x0, BED.top + 0.06, 1.6]], L('#080D0E', '#30474B'));
    Q([[BED.x0 + 0.05, BED.top + 0.06, BED.z0 + 0.06], [0.0, BED.top + 0.06, BED.z0 + 0.06], [0.0, BED.top + 0.17, BED.z0 + 0.54], [BED.x0 + 0.05, BED.top + 0.15, BED.z0 + 0.56]], L('#0A1112', '#5E7A7E'));
    Q([[BED.x0 + 0.05, BED.top + 0.06, BED.z0 + 0.56], [BED.x0 + 0.05, BED.top + 0.15, BED.z0 + 0.56], [BED.x0 + 0.05, BED.top + 0.15, BED.z0 + 0.06], [BED.x0 + 0.05, BED.top + 0.06, BED.z0 + 0.06]], L('#0B1314', '#86A2A4'));
    // the table: its top in a pool of the screen's light (three flat values), its front in shadow
    const t = TABLE_L, x0 = t.x - t.w / 2, x1 = t.x + t.w / 2, z0 = t.z - t.d / 2, z1 = t.z + t.d / 2;
    Q([[x0, 0, z1], [x1, 0, z1], [x1, t.top, z1], [x0, t.top, z1]], L('#050909', '#0E181A'));
    Q([[x1, 0, z0], [x1, 0, z1], [x1, t.top, z1], [x1, t.top, z0]], L('#060A0A', '#18272A'));
    const top = Q([[x0, t.top, z0], [x1, t.top, z0], [x1, t.top, z1], [x0, t.top, z1]], L('#0A0F10', '#1C2A2C'));
    if (lit && top) { g.save(); g.clip(top); [[0.2, '#2C4044'], [0.12, '#466264'], [0.07, '#62827F']].forEach(([r, col]) => { const pts = []; for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; pts.push(cam.p(PHONE.x + Math.cos(a) * r * 1.2, t.top + 0.001, PHONE.z + Math.sin(a) * r)); } g.fillStyle = col; g.fill(LC.pathPts(pts)); }); g.restore(); }
    // the lamp's base and shade (off), their undersides lit
    const lx = t.x - 0.1, lz = t.z - 0.09;
    Q([[lx - 0.05, t.top, lz], [lx + 0.05, t.top, lz], [lx + 0.04, t.top + 0.24, lz], [lx - 0.04, t.top + 0.24, lz]], L('#070C0D', '#4A6264'));
    Q([[lx - 0.13, t.top + 0.26, lz], [lx + 0.13, t.top + 0.26, lz], [lx + 0.11, t.top + 0.46, lz], [lx - 0.11, t.top + 0.46, lz]], L('#080D0E', '#26383A'));
    Q([[lx - 0.13, t.top + 0.26, lz], [lx + 0.13, t.top + 0.26, lz], [lx + 0.13, t.top + 0.262, lz - 0.2], [lx - 0.13, t.top + 0.262, lz - 0.2]], L('#090F10', '#6E8C8E'));
    // a glass of water: its rim and the light it throws on the table (a caustic crescent)
    const gx = t.x + 0.12, gz = t.z - 0.08; const gc = cam.p(gx, t.top, gz), gk = kAt(cam, gx, t.top, gz);
    if (lit) { g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(200,232,236,0.35)'; g.beginPath(); g.ellipse(gc[0] - 0.05 * gk, gc[1] - 0.02 * gk, 0.05 * gk, 0.018 * gk, 0.3, 0, Math.PI * 2); g.fill(); g.restore(); }
    g.fillStyle = L('rgba(20,30,32,0.6)', 'rgba(110,150,156,0.35)'); g.fillRect(gc[0] - 0.03 * gk, gc[1] - 0.1 * gk, 0.06 * gk, 0.1 * gk);
    g.fillStyle = L('rgba(30,44,48,0.6)', 'rgba(160,200,206,0.45)'); g.fillRect(gc[0] - 0.03 * gk, gc[1] - 0.06 * gk, 0.06 * gk, 0.06 * gk);
    g.strokeStyle = L('rgba(60,80,84,0.6)', 'rgba(214,236,240,0.9)'); g.lineWidth = 2; g.beginPath(); g.ellipse(gc[0], gc[1] - 0.1 * gk, 0.03 * gk, 0.008 * gk, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(gc[0] + 0.03 * gk, gc[1] - 0.1 * gk); g.lineTo(gc[0] + 0.03 * gk, gc[1]); g.stroke();
  }

  // =================================================================================================================
  // VIEW: the screen, close (Q01 11-20): BATTERY 7%, the clutter of apps; in its black glass, his face (s.inGlass)
  // =================================================================================================================
  const SQ = [[612, 36], [1300, 58], [1282, 1100], [588, 1074]];      // the screen's corners in the frame: held close, tipped a little toward him
  let _batt = null;
  const screenView = {
    back(c, t, s) {
      s = s || {}; const g = c.g, sw = clamp(s.swing || 0, 0, 1), lv = s.glow == null ? 1 : s.glow;
      g.fillStyle = '#040707'; g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
      const q = swingQuad(sw);
      if (sw < 0.5) {
        // the phone's body (a dark rim) and its glass
        const body = q.map((p, i) => [p[0] + [-14, 14, 14, -14][i] * (1 - 2 * sw), p[1] + [-14, -14, 14, 14][i]]);
        g.fillStyle = '#101415'; g.fill(LC.rquad(body, 70 * (1 - sw))); g.strokeStyle = 'rgba(150,170,176,0.4)'; g.lineWidth = 2; g.stroke(LC.rquad(body, 70 * (1 - sw)));
        _batt = _batt || batteryUI();
        g.save(); g.clip(LC.rquad(q, 60 * (1 - sw))); imageInQuad(g, _batt, q, 32);
        g.globalCompositeOperation = 'multiply'; g.fillStyle = mix('#000000', '#FFFFFF', lv * (1 - sw * 1.6)); g.fillRect(-M, -M, W + 2 * M, H + 2 * M); g.restore();
        const E = c.em; E.save(); E.globalAlpha = 0.35 * lv * (1 - 2 * sw); E.fillStyle = '#DCE8EC'; E.fill(LC.rquad(q, 60)); E.globalAlpha = 0.6 * lv * (1 - 2 * sw); E.fillStyle = '#FF6A50'; const bq = (u, v) => [lerp(lerp(q[0][0], q[1][0], u), lerp(q[3][0], q[2][0], u), v), lerp(lerp(q[0][1], q[1][1], u), lerp(q[3][1], q[2][1], u), v)]; const r0 = bq(0.58, 0.18); E.fillRect(r0[0], r0[1], 18, 48); E.restore();
      } else {     // the back: dark glass, the camera bump, the room's faint teal in it
        g.fillStyle = '#0C1112'; g.fill(LC.rquad(q, 60 * sw)); g.fillStyle = '#080B0C'; const a = q[0], b = q[1]; g.fill(LC.rrect(a[0] + (b[0] - a[0]) * 0.1, a[1] + 40, (b[0] - a[0]) * 0.36, 160, 30));
        g.strokeStyle = 'rgba(80,100,104,0.35)'; g.lineWidth = 2; g.stroke(LC.rquad(q, 60 * sw));
      }
      this._q = q; this._sw = sw;
    },
    // draw the reflected face (RIG.face, etc.) inside the black glass: fn(g) in frame coordinates. It is screened over the
    // screen's own light, so it shows only where the glass is dark: between the cards, round the panel.
    inGlass(c, s, fn) { if (!this._q || this._sw >= 0.5) return; const g = c.g; g.save(); g.clip(LC.rquad(this._q, 60)); g.globalCompositeOperation = 'screen'; g.globalAlpha = (s && s.reflect != null ? s.reflect : 0.42) * (1 - 2 * this._sw); fn(g); g.restore(); },
    front(c, t, s) {
      const g = c.g, q = this._q; if (!q || this._sw >= 0.5) return; const p = LC.rquad(q, 60);
      LC.glare(g, p, { x: 960, y: 560, angle: -1.05, color: '#FFFFFF', bands: [{ d: -160, w: 140, a: 0.04 }, { d: -60, w: 18, a: 0.06 }, { d: 300, w: 90, a: 0.03 }] });
      LC.specks(g, p, { x: 620, y: 50, w: 680, h: 1040 }, 'battDust', { n: 220, color: '#FFFFFF', rMin: 0.5, rMax: 1.5, aMin: 0.04, aMax: 0.2, scratch: 0.18 });
      LC.smudge(g, 1060, 840, 90, 60, 0.5, 'battThumb', '#FFFFFF', 0.06);
      g.save(); g.clip(p); g.strokeStyle = 'rgba(214,226,230,0.3)'; g.lineWidth = 3; g.stroke(p); g.restore();
    },
    anchors: { screen: SQ, face: [930, 420], faceScale: 1.0, battery: [880, 190], cards: [960, 820], thumb: [1240, 980], pxPerM: 6600 },
    light: { x: 960, y: 560, color: '#DCE8EC', note: 'the screen lights his face from the front and below; the room is black' },
  };
  function swingQuad(sw) {      // he turns the phone over: it rotates about its long axis, the glass foreshortens to an edge, then the back
    const a = sw * Math.PI, k = Math.abs(Math.cos(a)), cx = (SQ[0][0] + SQ[1][0] + SQ[2][0] + SQ[3][0]) / 4;
    return SQ.map(([x, y]) => [cx + (x - cx) * Math.max(0.02, k) + sw * 60, y + (sw > 0 ? Math.sin(a) * 40 : 0)]);
  }

  // =================================================================================================================
  // VIEW: the dark window (Q01 20-29): the bare glass under the blind gives back the bed; her side empty, the pillow smooth
  // =================================================================================================================
  const winCam = mkCam({ x: 0.06, y: 1.24, z: 2.6, yaw: 0.0, pitch: -0.11, f: 1480, cx: W / 2, cy: H / 2 - 30 });
  const windowView = {
    cam: winCam,
    back(c, t, s) {
      s = s || {}; const g = c.g, cam = winCam, d = clamp(s.dawn == null ? 0.18 : s.dawn, 0, 1), dq = Math.round(d * 20) / 20;
      drawBig(c, bigCache(c, 'bedroom:window:' + dq, gg => { gg.fillStyle = '#060B0C'; gg.fillRect(-M, -M, W + 2 * M, H + 2 * M); roomShell(gg, cam, dq * 0.5); windowWall(gg, cam, dq, {}); }));
      // the bed in the glass: the room mirrored through the pane, shown only where it is lit (screen over the dark outside)
      const ref = bigCache(c, 'bedroom:windowRefl:' + dq, gg => { const mc = mirrorZ(cam, WINB.z); gg.fillStyle = '#000'; gg.fillRect(-M, -M, W + 2 * M, H + 2 * M);
        roomShell(gg, mc, 0.35 + dq * 0.4, { noWindowWall: true }); bed(gg, mc, 0.42 + dq * 0.45); bedsideTable(gg, mc, -1.13, 0.3 + dq * 0.4); bedsideTable(gg, mc, 1.13, 0.3 + dq * 0.4); });
      const strip = LC.pathPts(clipPts(cam, [[WINB.x0 + 0.05, WINB.y0 + 0.05, WINB.z + 0.17], [WINB.x1 - 0.05, WINB.y0 + 0.05, WINB.z + 0.17], [WINB.x1 - 0.05, BLIND_Y - 0.03, WINB.z + 0.17], [WINB.x0 + 0.05, BLIND_Y - 0.03, WINB.z + 0.17]]));
      g.save(); g.clip(strip); g.globalCompositeOperation = 'screen'; g.globalAlpha = (s.reflect == null ? 0.62 : s.reflect) * (1 - 0.55 * d); g.drawImage(ref, -M, -M); g.restore();
      // the phone's cold light on the bed, in the glass, if it is still on (it goes as he turns it over)
      const pl = s.phoneLight || 0; if (pl > 0) { const mc = mirrorZ(cam, WINB.z), pc = mc.p(-0.5, 0.9, 0.9); g.save(); g.clip(strip); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, pc[0], pc[1], 0, 260, [[0, '#CFE2E6', 0.5 * pl], [1, '#CFE2E6', 0]]); g.fillRect(0, 0, W, H); g.restore(); }
      // emissive: the blind's glow and its blazing edges
      if (d > 0.02) { const E = c.em; E.save(); E.globalAlpha = 0.5 * sstep(d, 0, 1); E.fillStyle = dawnCol(d).edge; const a = cam.p(WINB.x0, WINB.y1, WINB.z), b = cam.p(WINB.x1, BLIND_Y, WINB.z); E.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); E.restore(); }
      this._strip = strip;
    },
    // the reflected room for the sequence's figures (Daniel in the bed, in the glass): the mirrored camera and the clip
    reflectCam: mirrorZ(winCam, WINB.z),
    inGlass(c, s, fn) { const g = c.g; g.save(); g.clip(this._strip); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.5; fn(g, mirrorZ(winCam, WINB.z)); g.restore(); },
    front(c, t, s) {
      s = s || {}; const g = c.g, d = clamp(s.dawn == null ? 0.18 : s.dawn, 0, 1);
      drawBig(c, bigCache(c, 'bedroom:windowFront', gg => { const strip = LC.pathPts(clipPts(winCam, [[WINB.x0 + 0.05, WINB.y0 + 0.05, WINB.z + 0.17], [WINB.x1 - 0.05, WINB.y0 + 0.05, WINB.z + 0.17], [WINB.x1 - 0.05, BLIND_Y - 0.03, WINB.z + 0.17], [WINB.x0 + 0.05, BLIND_Y - 0.03, WINB.z + 0.17]]));
        LC.specks(gg, strip, { x: 0, y: 500, w: W, h: 300 }, 'bedWinDust', { n: 180, color: '#FFFFFF', rMin: 0.5, rMax: 1.3, aMin: 0.04, aMax: 0.18, scratch: 0.12 });
        LC.glare(gg, strip, { x: 760, y: 640, angle: -1.1, color: '#DDE6E6', bands: [{ d: -120, w: 80, a: 0.04 }, { d: -60, w: 12, a: 0.05 }] }); }), 0.4 + 0.6 * d);
    },
    anchors: (() => { const cam = winCam, mc = mirrorZ(cam, WINB.z), p = (q, x, y, z) => q.p(x, y, z).slice(0, 2).map(Math.round);
      return { blind: p(cam, 0, (BLIND_Y + WINB.y1) / 2, WINB.z), strip: [p(cam, WINB.x0, BLIND_Y, WINB.z), p(cam, WINB.x1, WINB.y0, WINB.z)],
        emptyPillowInGlass: p(mc, 0.4, 0.68, BED.z0 + 0.3), hisPillowInGlass: p(mc, -0.4, 0.66, BED.z0 + 0.3), hisPlaceInGlass: p(mc, -0.4, 0.6, BED.z0 + 0.8), pxPerMInGlass: Math.round(kAt(mc, 0, 0.6, 0.8)) }; })(),
    light: { x: 960, y: 260, color: '#9DB0B6', note: 'the window ahead (the blind); the bed in the glass is lit from the window too' },
  };

  // =================================================================================================================
  // VIEW: the bed's edge (Q01 29-40): Daniel sits up, a silhouette against the blind as the dawn grows
  // =================================================================================================================
  const edgeCam = mkCam({ x: -1.04, y: 1.04, z: 0.34, yaw: 0.27, pitch: 0.13, f: 900, cx: W / 2 + 20, cy: H / 2 + 60 });
  const edge = {
    cam: edgeCam,
    back(c, t, s) {
      s = s || {}; const g = c.g, cam = edgeCam, d = clamp(s.dawn == null ? 0.6 : s.dawn, 0, 1), dq = Math.round(d * 24) / 24;
      drawBig(c, bigCache(c, 'bedroom:edge:' + dq, gg => { gg.fillStyle = '#060B0C'; gg.fillRect(-M, -M, W + 2 * M, H + 2 * M);
        roomShell(gg, cam, dq * 0.6); windowWall(gg, cam, dq, {}); bedsideTable(gg, cam, 1.13, dq * 0.5); bed(gg, cam, dq * 0.75);
        // the light on the floor under the window, and the bed's far half catching it
        const lit = sstep(dq, 0.1, 1); if (lit > 0) { gg.save(); gg.globalCompositeOperation = 'screen'; const a = cam.p(0, 0, 3.8); gg.fillStyle = LC.rad(gg, a[0], a[1], 0, 600, [[0, dawnCol(dq).edge, 0.16 * lit], [1, dawnCol(dq).edge, 0]]); gg.fillRect(-M, -M, W + 2 * M, H + 2 * M); gg.restore(); } }));
      if (d > 0.02) { const E = c.em; E.save(); E.globalAlpha = 0.75 * sstep(d, 0, 1); E.fillStyle = dawnCol(d).edge; const pts = clipPts(cam, [[WINB.x0, WINB.y1, WINB.z], [WINB.x1, WINB.y1, WINB.z], [WINB.x1, BLIND_Y, WINB.z], [WINB.x0, BLIND_Y, WINB.z]]); E.fill(LC.pathPts(pts)); E.restore(); }
    },
    front(c, t, s) {
      s = s || {}; const g = c.g, d = clamp(s.dawn == null ? 0.6 : s.dawn, 0, 1);
      // dust in the dawn light, slow, only where the blind backlights it
      const R = OTM.rng('beddust'); const b0 = edgeCam.p(0, 1.68, WINB.z); g.save(); g.globalCompositeOperation = 'screen';
      for (let i = 0; i < 50; i++) { const x = b0[0] + (R() - 0.5) * 700 + 20 * Math.sin(t * 0.3 + i), y = b0[1] + (R() - 0.5) * 420 + 14 * Math.sin(t * 0.21 + i * 2); const a = sstep(d, 0.2, 1) * (0.15 + 0.35 * R()); g.fillStyle = rgba('#FFF2DA', a); g.beginPath(); g.arc(x, y, 0.8 + R() * 1.6, 0, Math.PI * 2); g.fill(); }
      g.restore();
    },
    anchors: (() => { const cam = edgeCam, p = (x, y, z) => cam.p(x, y, z).slice(0, 2).map(Math.round);
      return { seat: p(BED.x0 + 0.04, BED.top + 0.04, 1.32), feet: p(BED.x0 - 0.42, 0, 1.32), headSeated: p(BED.x0 + 0.02, 1.22, 1.32), pxPerM: Math.round(kAt(cam, BED.x0, 0.8, 1.32)), facing: 'left (profile, toward the room\'s left wall)',
        blind: p(0, (BLIND_Y + WINB.y1) / 2, WINB.z), emptySide: p(0.4, BED.top + 0.08, 1.2) }; })(),
    light: (() => { const b = edgeCam.p(0, 1.7, WINB.z); return { x: Math.round(b[0]), y: Math.round(b[1]), color: '#F3E6CC', note: 'the blind behind him: a rim, growing with s.dawn' }; })(),
  };

  // =================================================================================================================
  // demo stand-ins (the sequences draw RIG's people)
  function demoHand(c, A) {      // a flat hand reaching in from the right toward the stop slider
    const g = c.g, [x, y] = A.stop, k = A.pxPerM; g.save(); g.fillStyle = '#5F3F33';
    g.beginPath(); g.moveTo(W + 40, y + 0.08 * k); g.lineTo(x + 0.06 * k, y + 0.03 * k); g.quadraticCurveTo(x - 0.01 * k, y + 0.01 * k, x + 0.015 * k, y - 0.012 * k); g.lineTo(x + 0.09 * k, y - 0.03 * k); g.lineTo(W + 40, y - 0.06 * k); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(200,226,232,0.6)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x + 0.015 * k, y - 0.012 * k); g.lineTo(x + 0.09 * k, y - 0.03 * k); g.lineTo(W + 40, y - 0.06 * k); g.stroke(); g.restore();
  }
  function demoFace(c) {         // a faint reflected face in the black glass
    screenView.inGlass(c, { reflect: 0.3 }, g => { g.fillStyle = '#7A5E50'; g.beginPath(); g.ellipse(930, 470, 200, 260, -0.05, 0, Math.PI * 2); g.fill(); g.fillStyle = '#1C1410'; g.beginPath(); g.ellipse(930, 250, 215, 100, 0, Math.PI, Math.PI * 2); g.fill();
      g.fillStyle = '#2A1E18'; g.fillRect(830, 430, 70, 9); g.fillRect(965, 426, 70, 9); });
  }
  function demoSitter(c) {       // Daniel's silhouette on the bed's edge, in profile facing left, forearms on his knees, the phone in his hands
    const g = c.g, A = edge.anchors, k = A.pxPerM, [sx, sy] = A.seat, L = edge.light;
    const P2 = pts => LC.smooth(pts.map(([x, y]) => [sx + x * k, sy - y * k]));
    const body = P2([[0.16, 0.0], [0.1, 0.24], [0.06, 0.46], [0.02, 0.56], [0.02, 0.6], [0.0, 0.62], [-0.03, 0.66], [-0.07, 0.7], [-0.12, 0.72], [-0.17, 0.7], [-0.2, 0.64], [-0.19, 0.6], [-0.15, 0.57], [-0.12, 0.55],
      [-0.12, 0.5], [-0.16, 0.44], [-0.2, 0.3], [-0.32, 0.12], [-0.36, 0.08], [-0.4, 0.06], [-0.44, 0.02], [-0.47, -0.02], [-0.46, -0.06], [-0.45, -0.5, 1], [-0.32, -0.52, 1], [-0.33, -0.1], [-0.3, -0.04], [-0.02, -0.06]]);
    OTM.silhouette(g, body, { fill: '#05090A', light: { x: L.x, y: L.y }, rimColor: L.color, rimW: 2.4, rimSoft: true, spread: 1.3 });
  }

  window.SETS = window.SETS || {};
  SETS.bedroom = {
    views: { table, screen: screenView, window: windowView, edge },
    demos: [
      { name: 'table: the alarm, 6:14, shivering', draw(c, t) { const s = { screen: 'alarm' }; table.back(c, t, s); table.front(c, t, s); } },
      { name: 'table: silenced (a hand), the lock screen', draw(c, t) { const s = { screen: 'lock', shiver: 0 }; table.back(c, t, s); demoHand(c, table.anchors); table.front(c, t, s); } },
      { name: 'screen: BATTERY 7%, the apps, his face in the glass', draw(c, t) { const s = {}; screenView.back(c, t, s); demoFace(c); screenView.front(c, t, s); } },
      { name: 'screen: turned over (swing 0.35)', draw(c, t) { const s = { swing: 0.35 }; screenView.back(c, t, s); screenView.front(c, t, s); } },
      { name: 'window: the bed in the glass, her side empty', draw(c, t) { const s = { dawn: 0.16 }; windowView.back(c, t, s); windowView.front(c, t, s); } },
      { name: 'window: the blind\'s edges begin to glow', draw(c, t) { const s = { dawn: 0.38 }; windowView.back(c, t, s); windowView.front(c, t, s); } },
      { name: 'edge: Daniel against the blind (dawn 0.5)', draw(c, t) { const s = { dawn: 0.5 }; edge.back(c, t, s); demoSitter(c); edge.front(c, t, s); } },
      { name: 'edge: dawn grown (1.0)', draw(c, t) { const s = { dawn: 1 }; edge.back(c, t, s); demoSitter(c); edge.front(c, t, s); } },
    ],
  };
})();
