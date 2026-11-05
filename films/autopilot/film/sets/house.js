/* AUTOPILOT — set: THE HOUSE, the front and the drive (Q05 morning; Q11 evening into dusk).
   Look C, "Through Glass". An ordinary Winchester semi in red-brown brick: a canted bay, an enclosed porch with a glazed door
   (behind it the front door whose frosted panels blaze in the hall views), white casements, a hipped tiled roof, a gravel drive.
   The front faces east: in the morning it takes the sun full on and the car on the drive bakes; in the evening the sun is
   behind the roof, the front falls into a cool shade, every pane gives back the dusky east, and the porch glows from the hall.
   House space (metres): x across the front as seen from the street, y up (the drive is 0), z away from the street (the
   front wall is at z = 9). Daniel's car is SETS.car.exterior (the car set), placed in these cameras by the views' `car`
   anchors (a ground point and a heading); the demos call it, or draw a stand-in of the same size if it is missing.
   The set draws the environment only: characters come from RIG and are drawn by the sequences between back() and front().
   See film/api/house.md. Deterministic: OTM.rng / OTM.vnoise / OTM.fbm only. */
(function () {
  'use strict';
  const { W, H } = OTM, P = LC.P;
  const M = 32;
  const clamp = OTM.clamp, lerp = OTM.lerp, mix = OTM.mix, rgba = OTM.rgba;
  const seg = (t, a, b) => clamp((t - a) / (b - a || 1e-6), 0, 1);
  const sstep = (t, a, b) => { const u = seg(t, a, b); return u * u * (3 - 2 * u); };

  // ---------------------------------------------------------------------------------------------------------------
  // small kit
  // ---------------------------------------------------------------------------------------------------------------
  const bigCache = (c, key, fn) => c.cache(key, g => { g.translate(M, M); fn(g); }, W + 2 * M, H + 2 * M);
  const drawBig = (c, cv, a) => { if (a != null && a < 1) { c.g.save(); c.g.globalAlpha = Math.max(0, a); c.g.drawImage(cv, -M, -M); c.g.restore(); } else c.g.drawImage(cv, -M, -M); };
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
  const seg2 = (g, cam, a, b, w, col) => { const q = clipPts(cam, [a, b, b]); if (q.length < 2) return; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(q[0][0], q[0][1]); g.lineTo(q[1][0], q[1][1]); g.stroke(); };
  const _scr = {};
  function scratch(name, w, h) { let c = _scr[name]; if (!c || c.width !== w || c.height !== h) c = _scr[name] = OTM.makeCanvas(w, h); const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, w, h); return g; }

  // =================================================================================================================
  // LIGHT BY TIME OF DAY (the front faces east: morning sun on it; evening and dusk behind the roof)
  // =================================================================================================================
  const TODS = {
    morning: { sky: [[0, '#B4CDD3'], [0.45, '#DCE6E0'], [0.8, '#F2ECDA'], [1, '#F8F0DE']], brick: ['#C47A52', '#96583E', '#5E3A2E'], frame: ['#F6F2E6', '#CDD0C6', '#8E948E'], roof: ['#7E5C50', '#5A443E', '#3A2E2C'],
      gravel: ['#E6DCC6', '#CBBFA6', '#968A74'], lawn: ['#BDB46E', '#A09858', '#6A6640'], hedge: ['#687C46', '#52643A', '#33412B'], glass: '#7E9298', sun: [-0.38, 0.62, -0.69], rim: '#FFE9C4', porchIn: '#3A3530', lit: 1 },
    evening: { sky: [[0, '#3A4250'], [0.5, '#8A6A5E'], [0.82, '#D2874E'], [1, '#EFA35E']], brick: ['#7A5446', '#5E4038', '#3E2C28'], frame: ['#B9B8B4', '#8E908C', '#5E625E'], roof: ['#4A3A36', '#3A2E2C', '#261E1E'],
      gravel: ['#A49C92', '#857E76', '#5E5854'], lawn: ['#6E6E48', '#565638', '#3A3A28'], hedge: ['#3A4636', '#2A342A', '#1A2220'], glass: '#4E5262', sun: [0.55, 0.18, 0.82], rim: '#F2A65E', porchIn: '#E2A868', lit: 0 },
    dusk: { sky: [[0, '#1E2632'], [0.45, '#3A3E4C'], [0.78, '#6A5A5C'], [1, '#C27A4C']], brick: ['#4A3836', '#3A2C2C', '#261E20'], frame: ['#7E8288', '#5E6268', '#3E4248'], roof: ['#2E2628', '#241E20', '#181416'],
      gravel: ['#6A686C', '#525056', '#3A383E'], lawn: ['#3E4232', '#30342A', '#22261E'], hedge: ['#262E2A', '#1C2420', '#121816'], glass: '#2E3240', sun: [0.25, 0.05, 1], rim: '#E89A5E', porchIn: '#E8A45E', lit: 0 },
  };
  const todOf = s => TODS[(s && s.tod) || 'morning'] || (s && (s.tod === 'noon' || s.tod === 'afternoon') ? TODS.morning : TODS.evening);
  const HOUSE = { x0: -3.2, x1: 3.6, z: 9, eave: 5.4, ridge: 8.2 };
  const PORCH = { x0: 0.45, x1: 2.05, z0: 7.75, floor: 0.3, top: 2.45, door: [0.84, 1.66] };
  const BAY = { x0: -2.85, x1: -0.35, z0: 8.35, sill: 0.72, head: 2.3 };
  const DRIVE = { x0: 2.05, x1: 5.7, z0: 0.3, z1: 8.7 };
  const CAR_AT = [3.75, 0, 5.05];

  // ---- the gravel's grain, made once (a stipple tile) ----
  let _grav = null;
  function gravelTile() { if (_grav) return _grav; const c = OTM.makeCanvas(256, 256), g = c.getContext('2d'), R = OTM.rng('gravel'); g.clearRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) { const x = R() * 256, y = R() * 256, r = 0.6 + R() * 1.8, v = R(); g.fillStyle = v < 0.5 ? 'rgba(0,0,0,' + (0.12 + R() * 0.18) + ')' : 'rgba(255,255,255,' + (0.1 + R() * 0.2) + ')'; g.beginPath(); g.ellipse(x, y, r, r * 0.7, R() * 3, 0, Math.PI * 2); g.fill(); }
    return (_grav = c); }
  // a brick wall plane: the field, mortar courses (subtle), a few darker headers
  function brickWall(g, cam, corners, col, mortar, seed, rows) {
    const p = Qc(g, cam, corners, col); if (!p) return; g.save(); g.clip(p);
    const L = (u, v) => [0, 1, 2].map(k => lerp(lerp(corners[0][k], corners[1][k], u), lerp(corners[3][k], corners[2][k], u), v));
    const nr = rows || 30; for (let j = 1; j < nr; j++) seg2(g, cam, L(0, j / nr), L(1, j / nr), 1, mortar);
    const R = OTM.rng(seed); for (let i = 0; i < 70; i++) { const u = R(), v = R(); const a = cam.p(L(u, v)), b = cam.p(L(u + 0.02, v)); g.strokeStyle = rgba('#000000', 0.12); g.lineWidth = Math.max(1, Math.abs(cam.p(L(u, v + 1 / nr))[1] - a[1]) * 0.8); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    g.restore();
  }
  // a window in the front wall: frame, glass (what it gives back), casement bars; o.glow: a warm interior light behind it
  function windowOn(g, cam, T, x0, x1, y0, y1, z, o) {
    o = o || {}; const Q = (pts, col) => Qc(g, cam, pts, col), fw = 0.06, F = T.frame;
    Q([[x0 - 0.05, y0 - 0.06, z - 0.01], [x1 + 0.05, y0 - 0.06, z - 0.01], [x1 + 0.05, y0, z - 0.01], [x0 - 0.05, y0, z - 0.01]], F[1]);    // the sill
    Q([[x0, y1, z - 0.005], [x1, y1, z - 0.005], [x1, y0, z - 0.005], [x0, y0, z - 0.005]], F[0]);
    const gp = Qc(g, cam, [[x0 + fw, y1 - fw, z - 0.006], [x1 - fw, y1 - fw, z - 0.006], [x1 - fw, y0 + fw, z - 0.006], [x0 + fw, y0 + fw, z - 0.006]], T.glass);
    if (gp) { g.save(); g.clip(gp);
      // what it gives back: the sky over the street behind the lens (paler at the top), the far roofs low; or the room's warm light
      const a = cam.p(x0, y1, z), b = cam.p(x0, y0, z); g.fillStyle = LC.lin(g, 0, a[1], 0, b[1], T.lit ? [[0, '#E8EEEA', 0.75], [0.6, '#C4D2D4', 0.45], [1, '#5E6E70', 0.3]] : [[0, '#7A6E7C', 0.5], [0.55, '#4A4A5A', 0.35], [1, '#2A2C36', 0.2]]); g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
      if (!T.lit) { g.fillStyle = rgba('#E8935A', 0.35); const h = cam.p(x0, lerp(y0, y1, 0.32), z); g.fillRect(-M, h[1], W + 2 * M, Math.max(2, (b[1] - a[1]) * 0.04)); }   // the copper tops of the houses opposite, a thin line
      if (o.glow) { g.fillStyle = rgba(T.porchIn, o.glow); g.fillRect(-M, -M, W + 2 * M, H + 2 * M); }
      LC.glare(g, null, { x: (a[0] + cam.p(x1, y0, z)[0]) / 2, y: (a[1] + b[1]) / 2, angle: -1.1, color: '#FFFFFF', bands: [{ d: -20, w: Math.max(6, (b[1] - a[1]) * 0.18), a: T.lit ? 0.18 : 0.08 }] });
      g.restore(); }
    // casement bars: a mullion and a transom
    const xm = (x0 + x1) / 2, yt = lerp(y0, y1, 0.72), k = kAt(cam, xm, yt, z);
    seg2(g, cam, [xm, y0 + fw, z - 0.008], [xm, y1 - fw, z - 0.008], Math.max(1.5, 0.05 * k), F[0]); seg2(g, cam, [x0 + fw, yt, z - 0.008], [x1 - fw, yt, z - 0.008], Math.max(1.5, 0.05 * k), F[0]);
    if (T.lit) { seg2(g, cam, [x0, y1, z - 0.012], [x1, y1, z - 0.012], Math.max(1.5, 0.03 * k), rgba('#3A2A24', 0.5)); }    // the lintel's shadow line (sun from above)
  }

  // morning: the shadows the low sun throws on the ground, drawn before the house so everything stands on them. A street tree's
  // crown behind the lens lies across the lawn's foot (it keeps the bottom of the frame calm), a few sun-flecks through it;
  // the lawn tree's own shadow falls toward the bay. Ground shapes on a scratch, softened, multiplied in a cool shade.
  const LAWN_TREE = [-2.2, 0, 4.6];
  function groundShadows(g, cam, T) {
    const S = T.sun, n = Math.hypot(S[0], S[2]), dx = -S[0] / n, dz = -S[2] / n, px = -dz, pz = dx, sinE = S[1] / Math.hypot(S[0], S[1], S[2]);
    const onGround = (x, y, z) => { const t = y / S[1]; return [x - S[0] * t, z - S[2] * t]; };
    const sg = scratch('houseShadow', W + 2 * M, H + 2 * M); sg.translate(M, M);
    const blob = (x, y, z, r) => { const [cx, cz] = onGround(x, y, z), ra = r / sinE, pts = [];
      for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, u = Math.cos(a) * ra, v = Math.sin(a) * r; pts.push([cx + dx * u + px * v, 0.005, cz + dz * u + pz * v]); }
      const q = clipPts(cam, pts); if (q.length > 2) sg.fill(LC.pathPts(q)); };
    sg.fillStyle = '#9CA4AE';
    const R = OTM.rng('streetTree'), crown = [];     // its crown 4.4-6.2 m up, on the verge behind us: the shadow lies across the near lawn only
    for (let i = 0; i < 26; i++) { const b = [-5.2 + R() * 3.2, 4.4 + R() * 1.8, -3.6 + R() * 1.2, 0.7 + R() * 0.6]; crown.push(b); blob(...b); }
    // the lawn tree: the same blobs as it is drawn with (its own rng, in the same order)
    { const tr = LAWN_TREE, Rt = OTM.rng('tree');
      for (let i = 0; i < 16; i++) { const x = tr[0] + (Rt() - 0.5) * 1.6, y = 2.6 + (Rt() - 0.5) * 1.2, z = tr[2] + (Rt() - 0.5) * 0.6; Rt(); const r = 0.45 + Rt() * 0.3; Rt(); blob(x, y, z, r * 0.9); }
      const a = onGround(tr[0], 1.9, tr[2]), w = 0.07, q = clipPts(cam, [[tr[0] - px * w, 0.005, tr[2] - pz * w], [tr[0] + px * w, 0.005, tr[2] + pz * w], [a[0] + px * w, 0.005, a[1] + pz * w], [a[0] - px * w, 0.005, a[1] - pz * w]]);
      if (q.length > 2) sg.fill(LC.pathPts(q)); }
    // sun-flecks through the street tree's crown
    sg.globalCompositeOperation = 'destination-out'; sg.fillStyle = '#000000';
    const Rf = OTM.rng('flecks'); for (let i = 0; i < 14; i++) { const b = crown[Math.floor(Rf() * crown.length)]; blob(b[0] + (Rf() - 0.5) * b[3], b[1], b[2] + (Rf() - 0.5) * b[3], 0.04 + Rf() * 0.06); }
    g.save(); g.globalCompositeOperation = 'multiply'; g.filter = 'blur(5px)'; g.drawImage(sg.canvas, -M, -M); g.restore();
  }

  // =================================================================================================================
  // THE HOUSE AND ITS DRIVE in a camera (painter's order: sky, the far roofs, the ground, the house, the porch and bay, walls)
  // =================================================================================================================
  const PF = (g, n) => { if (window.__hp) { g.getImageData(0, 0, 1, 1); window.__hp.push([n, performance.now()]); } };
  function houseScene(g, cam, T, o) {
    PF(g,'start');
    o = o || {}; const Q = (pts, col) => Qc(g, cam, pts, col), B = T.brick, F = T.frame, R0 = T.roof;
    // the sky (the east behind the lens in the morning is not seen; above the roof we look west)
    { const top = [0, Math.min(-M, cam.p(0, 30, 60)[1])], hz = cam.p(0, 0, 400); if (T.lit) top[1] = -M;      // morning: the sky's gradient runs top of frame to horizon (a pale, hot haze)
      g.fillStyle = LC.lin(g, 0, top[1], 0, hz[1], T.sky); g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
      if (!T.lit) { g.save(); g.globalCompositeOperation = 'screen'; const s = cam.p(1.5, 3, 400); g.fillStyle = LC.rad(g, s[0], s[1], 0, 1300, [[0, '#FFD39A', 0.55], [0.35, '#E8955A', 0.25], [1, '#E8955A', 0]]); g.fillRect(-M, -M, W + 2 * M, H + 2 * M); g.restore(); }
      else { g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.lin(g, 0, top[1], 0, hz[1], [[0, '#FFF2DA', 0.0], [0.7, '#FFF2DA', 0.18], [1, '#FFF6E6', 0.35]]); g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
        g.fillStyle = LC.rad(g, -300, -200, 0, 1400, [[0, '#FFF6E6', 0.5], [0.4, '#FBE7C2', 0.18], [1, '#FBE7C2', 0]]); g.fillRect(-M, -M, W + 2 * M, H + 2 * M); g.restore(); } }
    PF(g,'sky');
    // beyond: the roofs and chimneys of the next street, garden trees behind them whose crowns rise over the ridges (hazy in the
    // morning, a dark line at evening). The trees go first, so nothing floats in the sky between them and the roofs.
    { const R = OTM.rng('farline'), RT = OTM.rng('fartrees'), far = T.lit ? '#B6B4AC' : mix(T.roof[2], '#000000', 0.25), farT = T.lit ? '#A4AC96' : mix(T.hedge[2], '#000000', 0.3), Z = 30;     // morning: hazed by the heat
      for (let i = 0; i < 34; i++) { const x = -38 + RT() * 82, zz = Z + 4 + RT() * 6, tall = RT() < 0.15, y = tall ? 10.5 + RT() * 1.5 : 7.4 + RT() * 2.2, c0 = cam.p(x, y, zz), k = kAt(cam, x, y, zz), rx = (tall ? 1.6 : 2.2 + RT() * 2) * k, ry = (tall ? 3.6 : 2 + RT() * 1.8) * k; if (c0[2] < 1) continue;
        g.fillStyle = farT; g.beginPath(); g.ellipse(c0[0], c0[1], rx, ry, 0, 0, Math.PI * 2); g.fill(); }
      const farW = T.lit ? '#C6B6A6' : mix(T.brick[2], '#000000', 0.3), farWin = T.lit ? '#A2A6A2' : mix(T.glass, '#000000', 0.45);   // their walls (hazed brick), roofs, windows
      for (let x = -40, w = 6; x < 44; x += w) { w = 5.5 + R() * 2.5; const eave = 5.2 + R() * 0.6, ridge = eave + 2.2 + R() * 0.8, a = x - 0.04, b = x + w + 0.04;     // a hair of overlap: no seams
        Qc(g, cam, [[a, -0.5, Z], [b, -0.5, Z], [b, eave + 0.02, Z], [a, eave + 0.02, Z]], farW);
        [[0.2, 0.42], [0.58, 0.8]].forEach(([u0, u1]) => [[0.8, 1.9], [3.1, 4.2]].forEach(([y0, y1]) => Qc(g, cam, [[x + w * u0, y0, Z], [x + w * u1, y0, Z], [x + w * u1, y1, Z], [x + w * u0, y1, Z]], farWin)));
        Qc(g, cam, [[a, eave, Z], [b, eave, Z], [b - 0.35, ridge, Z], [a + 0.35, ridge, Z]], far);
        if (R() < 0.6) Qc(g, cam, [[x + w * 0.3, ridge - 0.4, Z], [x + w * 0.3 + 0.5, ridge - 0.4, Z], [x + w * 0.3 + 0.5, ridge + 0.9, Z], [x + w * 0.3, ridge + 0.9, Z]], far); } }
    PF(g,'far');
    // the ground: pavement, the lawn, the drive's gravel
    Q([[-40, 0, -6], [44, 0, -6], [44, 0, 32], [-40, 0, 32]], T.lawn[2]);
    Q([[-30, 0.001, -2.0], [30, 0.001, -2.0], [30, 0.001, 0.3], [-30, 0.001, 0.3]], T.lit ? '#B6B0A4' : mix(T.gravel[1], '#2A2A30', 0.3));
    Q([[-6.5, 0.002, 0.3], [DRIVE.x0, 0.002, 0.3], [DRIVE.x0, 0.002, 8.9], [-6.5, 0.002, 8.9]], T.lawn[0]);
    const gp = Q([[DRIVE.x0, 0.003, DRIVE.z0], [DRIVE.x1, 0.003, DRIVE.z0], [DRIVE.x1, 0.003, DRIVE.z1], [DRIVE.x0, 0.003, DRIVE.z1]], T.gravel[1]);
    if (gp) { g.save(); g.clip(gp); const a = cam.p(DRIVE.x0, 0, DRIVE.z0), b = cam.p(DRIVE.x0, 0, DRIVE.z1); g.fillStyle = LC.lin(g, 0, a[1], 0, b[1], [[0, T.gravel[0]], [1, T.gravel[1]]]); g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
      g.globalAlpha = 0.8; g.fillStyle = g.createPattern(gravelTile(), 'repeat'); g.fillRect(-M, -M, W + 2 * M, H + 2 * M); g.restore(); }
    // the path of paving slabs from the drive to the porch steps
    Q([[DRIVE.x0 - 0.9, 0.004, 7.1], [DRIVE.x0, 0.004, 7.1], [DRIVE.x0, 0.004, 7.75], [DRIVE.x0 - 0.9, 0.004, 7.75]], T.lit ? '#C9C2B2' : T.gravel[2]);
    if (T.lit && !o.noShadows) groundShadows(g, cam, T);
    PF(g,'ground');
    // the neighbour on the right, beyond the drive and the hedge: a gable end, its front, a window
    { const nx0 = 7.2, nx1 = 13.5, nz = 9.8; brickWall(g, cam, [[nx0, 5.2, nz], [nx1, 5.2, nz], [nx1, 0, nz], [nx0, 0, nz]], B[T.lit ? 0 : 1], rgba('#000000', 0.12), 'nextR', 70);
      brickWall(g, cam, [[nx0, 5.2, nz], [nx0, 5.2, nz + 7], [nx0, 0, nz + 7], [nx0, 0, nz]], B[T.lit ? 1 : 2], rgba('#000000', 0.12), 'nextRside', 70);
      Q([[nx0 - 0.25, 5.2, nz - 0.25], [nx1, 5.2, nz - 0.25], [nx1, 7.9, nz + 3.2], [nx0 - 0.25, 7.9, nz + 3.2]], R0[T.lit ? 1 : 2]);
      Q([[nx0, 5.2, nz], [nx0, 7.9, nz + 3.2], [nx0, 5.2, nz + 7]], B[T.lit ? 1 : 2]); seg2(g, cam, [nx0 - 0.25, 5.2, nz - 0.25], [nx0 - 0.25, 7.95, nz + 3.2], 4, R0[2]); seg2(g, cam, [nx0 - 0.25, 7.95, nz + 3.2], [nx0 - 0.25, 5.2, nz + 7.2], 4, R0[2]);
      windowOn(g, cam, T, 8.2, 9.8, 3.2, 4.5, nz); windowOn(g, cam, T, 8.0, 10.0, 0.8, 2.2, nz); }
    PF(g,'neighbour');
    // the house: roof (hipped), the front wall in three values (lit, the bay's and the porch's shade), windows
    const hz = HOUSE.z;
    Q([[HOUSE.x0 - 0.3, HOUSE.eave, hz - 0.3], [HOUSE.x1 + 0.3, HOUSE.eave, hz - 0.3], [HOUSE.x1 - 1.4, HOUSE.ridge, hz + 3], [HOUSE.x0 - 0.3, HOUSE.ridge, hz + 3]], R0[T.lit ? 0 : 1]);
    Q([[HOUSE.x1 + 0.3, HOUSE.eave, hz - 0.3], [HOUSE.x1 + 0.3, HOUSE.eave, hz + 6], [HOUSE.x1 - 1.4, HOUSE.ridge, hz + 3]], R0[2]);
    // the roof's tiles: a few courses; at dusk/evening a copper rim along the ridge from the sun behind
    { const rp = clipPts(cam, [[HOUSE.x0 - 0.3, HOUSE.eave, hz - 0.3], [HOUSE.x1 + 0.3, HOUSE.eave, hz - 0.3], [HOUSE.x1 - 1.4, HOUSE.ridge, hz + 3], [HOUSE.x0 - 0.3, HOUSE.ridge, hz + 3]]);
      if (rp.length > 2) { g.save(); g.clip(LC.pathPts(rp)); for (let i = 1; i < 12; i++) { const u = i / 12; seg2(g, cam, [HOUSE.x0 - 0.3, lerp(HOUSE.eave, HOUSE.ridge, u), lerp(hz - 0.3, hz + 3, u)], [HOUSE.x1 + 0.3 - 1.7 * u, lerp(HOUSE.eave, HOUSE.ridge, u), lerp(hz - 0.3, hz + 3, u)], 1.2, rgba('#000000', 0.18)); } g.restore(); } }
    if (!T.lit) seg2(g, cam, [HOUSE.x0 - 0.3, HOUSE.ridge, hz + 3], [HOUSE.x1 - 1.4, HOUSE.ridge, hz + 3], 3, rgba(T.rim, 0.8));
    // the chimney stack on the party wall
    Q([[HOUSE.x0 - 0.2, HOUSE.ridge - 0.6, hz + 2.6], [HOUSE.x0 + 0.5, HOUSE.ridge - 0.6, hz + 2.6], [HOUSE.x0 + 0.5, HOUSE.ridge + 1.0, hz + 2.6], [HOUSE.x0 - 0.2, HOUSE.ridge + 1.0, hz + 2.6]], B[T.lit ? 0 : 1]);
    [-0.05, 0.25].forEach(x => Q([[HOUSE.x0 + x, HOUSE.ridge + 1.0, hz + 2.6], [HOUSE.x0 + x + 0.16, HOUSE.ridge + 1.0, hz + 2.6], [HOUSE.x0 + x + 0.14, HOUSE.ridge + 1.35, hz + 2.6], [HOUSE.x0 + x + 0.02, HOUSE.ridge + 1.35, hz + 2.6]], '#8E6A58'));
    if (!T.lit) seg2(g, cam, [HOUSE.x0 + 0.5, HOUSE.ridge - 0.6, hz + 2.6], [HOUSE.x0 + 0.5, HOUSE.ridge + 1.0, hz + 2.6], 2.5, rgba(T.rim, 0.7));
    PF(g,'roof');
    // the eaves' soffit (a dark strip), then the front wall
    Q([[HOUSE.x0 - 0.3, HOUSE.eave, hz - 0.3], [HOUSE.x1 + 0.3, HOUSE.eave, hz - 0.3], [HOUSE.x1 + 0.3, HOUSE.eave - 0.12, hz - 0.3], [HOUSE.x0 - 0.3, HOUSE.eave - 0.12, hz - 0.3]], F[T.lit ? 1 : 2]);
    brickWall(g, cam, [[HOUSE.x0, HOUSE.eave, hz], [HOUSE.x1, HOUSE.eave, hz], [HOUSE.x1, 0, hz], [HOUSE.x0, 0, hz]], B[T.lit ? 0 : 1], rgba('#000000', 0.12), 'front', 72);
    if (T.lit) Q([[HOUSE.x0, HOUSE.eave - 0.12, hz - 0.002], [HOUSE.x1, HOUSE.eave - 0.12, hz - 0.002], [HOUSE.x1, HOUSE.eave - 0.45, hz - 0.002], [HOUSE.x0, HOUSE.eave - 0.45, hz - 0.002]], rgba(B[2], 0.55));   // the eaves' shadow
    PF(g,'frontwall');
    // the neighbour's half (left), the same brick, partly seen
    brickWall(g, cam, [[HOUSE.x0 - 6.8, HOUSE.eave, hz], [HOUSE.x0, HOUSE.eave, hz], [HOUSE.x0, 0, hz], [HOUSE.x0 - 6.8, 0, hz]], B[T.lit ? 1 : 2], rgba('#000000', 0.12), 'neigh', 72);
    Q([[HOUSE.x0 - 7.1, HOUSE.eave, hz - 0.3], [HOUSE.x0 - 0.3, HOUSE.eave, hz - 0.3], [HOUSE.x0 - 0.3, HOUSE.ridge, hz + 3], [HOUSE.x0 - 5.6, HOUSE.ridge, hz + 3]], R0[T.lit ? 1 : 2]);
    windowOn(g, cam, T, -5.9, -3.9, 3.2, 4.55, hz); windowOn(g, cam, T, -5.6, -4.2, 0.85, 2.2, hz);
    PF(g,'neighhalf');
    // first floor: above the bay, the landing window (above the porch), the small one; ground: the little hall window
    windowOn(g, cam, T, -2.65, -0.55, 3.2, 4.6, hz); windowOn(g, cam, T, 0.62, 1.62, 3.3, 4.6, hz, { glow: T.lit ? 0 : 0.25 }); windowOn(g, cam, T, 2.45, 3.3, 3.5, 4.6, hz); windowOn(g, cam, T, 2.55, 3.25, 1.15, 2.1, hz);
    PF(g,'windows');
    // the bay: three canted lights under a lead roof, its brick base
    { const bz = BAY.z0, xs = [BAY.x0, BAY.x0 + 0.45, BAY.x1 - 0.45, BAY.x1], zs = [hz, bz, bz, hz];
      for (let i = 0; i < 3; i++) { const a = [xs[i], 0, zs[i]], b = [xs[i + 1], 0, zs[i + 1]], turned = T.lit ? i === 2 : i !== 1, face = turned ? B[T.lit ? 1 : 2] : B[T.lit ? 0 : 1];   // morning: the left flank and the front take the sun, the right flank is turned away
        Q([[a[0], 0, a[2]], [b[0], 0, b[2]], [b[0], BAY.sill, b[2]], [a[0], BAY.sill, a[2]]], face);
        Q([[a[0], BAY.sill, a[2]], [b[0], BAY.sill, b[2]], [b[0], BAY.head, b[2]], [a[0], BAY.head, a[2]]], F[turned ? 1 : 0]);
        const inset = 0.07, gpts = [[lerp(a[0], b[0], 0.06), BAY.sill + inset, lerp(a[2], b[2], 0.06)], [lerp(a[0], b[0], 0.94), BAY.sill + inset, lerp(a[2], b[2], 0.94)], [lerp(a[0], b[0], 0.94), BAY.head - inset, lerp(a[2], b[2], 0.94)], [lerp(a[0], b[0], 0.06), BAY.head - inset, lerp(a[2], b[2], 0.06)]];
        const gq = Qc(g, cam, gpts, T.glass); if (gq) { g.save(); g.clip(gq); const t0 = cam.p(gpts[3]), b0 = cam.p(gpts[0]); g.fillStyle = LC.lin(g, 0, t0[1], 0, b0[1], T.lit ? [[0, '#EEF2EE', 0.7], [1, '#7E9294', 0.25]] : [[0, '#8A7684', 0.45], [1, '#2A2C36', 0.2]]); g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
          LC.glare(g, null, { x: (t0[0] + b0[0]) / 2 + 20, y: (t0[1] + b0[1]) / 2, angle: -1.15, color: '#FFFFFF', bands: [{ d: 0, w: Math.abs(b0[1] - t0[1]) * 0.2, a: T.lit ? 0.22 : 0.08 }] }); g.restore(); }
        seg2(g, cam, [lerp(a[0], b[0], 0.5), BAY.sill, lerp(a[2], b[2], 0.5)], [lerp(a[0], b[0], 0.5), BAY.head, lerp(a[2], b[2], 0.5)], 3, F[0]); }
      Q([[xs[0] - 0.05, BAY.head, hz], [xs[1], BAY.head, bz - 0.06], [xs[2], BAY.head, bz - 0.06], [xs[3] + 0.05, BAY.head, hz], [xs[3] + 0.05, BAY.head + 0.25, hz], [xs[0] - 0.05, BAY.head + 0.25, hz]], T.lit ? '#6E7472' : '#3A3E40');
      Q([[xs[1], BAY.head, bz - 0.06], [xs[2], BAY.head, bz - 0.06], [xs[2], BAY.head + 0.08, bz - 0.06], [xs[1], BAY.head + 0.08, bz - 0.06]], T.lit ? '#9AA09C' : '#4A4E50'); }
    PF(g,'bay');
    porch(g, cam, T, o);
    PF(g,'porch');
    // the low front wall along the pavement (with a pier at the drive), the hedge on the far side of the drive, a small tree
    brickWall(g, cam, [[-6.5, 0.58, 0.3], [DRIVE.x0, 0.58, 0.3], [DRIVE.x0, 0, 0.3], [-6.5, 0, 0.3]], B[T.lit ? 0 : 1], rgba('#000000', 0.15), 'lowwall', 8);
    Q([[-6.5, 0.58, 0.3], [DRIVE.x0, 0.58, 0.3], [DRIVE.x0, 0.62, 0.15], [-6.5, 0.62, 0.15]], T.lit ? '#C9BCA8' : B[2]);
    Q([[DRIVE.x0 - 0.3, 0, 0.3], [DRIVE.x0, 0, 0.3], [DRIVE.x0, 0.85, 0.3], [DRIVE.x0 - 0.3, 0.85, 0.3]], B[T.lit ? 1 : 2]);
    // (morning: the sun from behind the lens, left: each clump of leaves takes a lit crown toward the upper left)
    { const R = OTM.rng('hedge'); for (let i = 0; i < 26; i++) { const z = 0.4 + i * 0.33, x = DRIVE.x1 + 0.55 + R() * 0.2, c0 = cam.p(x, 0.75 + R() * 0.3, z), k = kAt(cam, x, 1, z), lc = R(); if (c0[2] < 0.6) continue; g.fillStyle = T.hedge[R() < 0.5 ? 1 : 0]; g.beginPath(); g.ellipse(c0[0], c0[1], 0.42 * k, 0.6 * k, 0, 0, Math.PI * 2); g.fill();
      if (T.lit && lc < 0.7) { g.fillStyle = rgba('#93A45C', 0.45); g.beginPath(); g.ellipse(c0[0] - 0.1 * k, c0[1] - 0.2 * k, 0.27 * k, 0.34 * k, -0.3, 0, Math.PI * 2); g.fill(); } } }
    { const tr = LAWN_TREE, c0 = cam.p(tr), k = kAt(cam, ...tr); if (c0[2] > 0.3) { seg2(g, cam, tr, [tr[0], 1.9, tr[2]], Math.max(2, 0.12 * k), T.lit ? '#4A3E32' : '#1E1A18'); const R = OTM.rng('tree');
      for (let i = 0; i < 16; i++) { const p = cam.p(tr[0] + (R() - 0.5) * 1.6, 2.6 + (R() - 0.5) * 1.2, tr[2] + (R() - 0.5) * 0.6); g.fillStyle = T.lit ? mix('#5A6E4A', '#7E8E58', R()) : mix(T.hedge[1], T.hedge[2], R()); const rx = (0.45 + R() * 0.3) * k, ry = (0.35 + R() * 0.25) * k; g.beginPath(); g.ellipse(p[0], p[1], rx, ry, 0, 0, Math.PI * 2); g.fill();
        if (T.lit && i % 3 !== 2) { g.fillStyle = rgba('#A2AE66', 0.55); g.beginPath(); g.ellipse(p[0] - 0.25 * rx, p[1] - 0.3 * ry, 0.55 * rx, 0.5 * ry, 0, 0, Math.PI * 2); g.fill(); } }      // (no rng in here: the ground shadow replays these blobs)
      if (T.lit) { g.save(); g.globalCompositeOperation = 'screen'; const sp = cam.p(tr[0] - 0.4, 3.0, tr[2]); g.fillStyle = LC.rad(g, sp[0], sp[1], 0, 0.9 * k, [[0, '#FFE6B4', 0.35], [1, '#FFE6B4', 0]]); g.beginPath(); g.arc(sp[0], sp[1], 0.9 * k, 0, Math.PI * 2); g.fill(); g.restore(); } } }
    PF(g,'veg');
    // morning: the porch's shadow thrown on the front wall to its right (its front corner's shadow lands where the sun puts it;
    // the bay throws none outside its own footprint: its right flank is turned from the sun and is the darker face instead)
    if (T.lit) { const S = T.sun, d = hz - PORCH.z0, sx = PORCH.x1 + S[0] / S[2] * d, sy = PORCH.top - S[1] / -S[2] * d;
      Q([[PORCH.x1, 0.0, hz - 0.003], [sx, 0.0, hz - 0.003], [sx, sy, hz - 0.003], [PORCH.x1, PORCH.top + 0.05, hz - 0.003]], rgba(B[2], 0.6)); }
  }
  // the porch: brick base, glazed walls, a pitched roof; its glazed door; behind, the front door open on the hall (lit at evening)
  function porch(g, cam, T, o) {
    const Q = (pts, col) => Qc(g, cam, pts, col), B = T.brick, F = T.frame, z0 = PORCH.z0, z1 = HOUSE.z, x0 = PORCH.x0, x1 = PORCH.x1, base = 0.95, top = PORCH.top;
    // the steps up to it
    Q([[x0 + 0.1, 0, z0 - 0.5], [x1 - 0.1, 0, z0 - 0.5], [x1 - 0.1, 0.15, z0 - 0.5], [x0 + 0.1, 0.15, z0 - 0.5]], T.lit ? '#B8B0A0' : T.gravel[2]);
    Q([[x0 + 0.1, 0.15, z0 - 0.5], [x1 - 0.1, 0.15, z0 - 0.5], [x1 - 0.1, 0.15, z0 - 0.25], [x0 + 0.1, 0.15, z0 - 0.25]], T.lit ? '#D8D0C0' : T.gravel[1]);
    Q([[x0 + 0.1, 0.15, z0 - 0.25], [x1 - 0.1, 0.15, z0 - 0.25], [x1 - 0.1, 0.3, z0 - 0.25], [x0 + 0.1, 0.3, z0 - 0.25]], T.lit ? '#B8B0A0' : T.gravel[2]);
    Q([[x0 + 0.1, 0.3, z0 - 0.25], [x1 - 0.1, 0.3, z0 - 0.25], [x1 - 0.1, 0.3, z0], [x0 + 0.1, 0.3, z0]], T.lit ? '#D8D0C0' : T.gravel[1]);
    // the porch's inside: its floor, the open front door's light (evening), the hall beyond
    const inside = Qc(g, cam, [[x0, top, z0], [x1, top, z0], [x1, 0.3, z0], [x0, 0.3, z0]], T.lit ? '#2A2622' : '#3A2C22');
    if (inside) { g.save(); g.clip(inside);
      Q([[x0, 0.3, z0], [x1, 0.3, z0], [x1, 0.3, z1], [x0, 0.3, z1]], T.lit ? '#3A322A' : '#6A4E38');
      Q([[x0, 0.3, z1 - 0.01], [x1, 0.3, z1 - 0.01], [x1, top, z1 - 0.01], [x0, top, z1 - 0.01]], T.lit ? '#2E2824' : '#4A382C');
      // the front door (frosted panels, fanlight); in the evening it stands open and the hall's lamp is warm behind
      const dx0 = 0.85, dx1 = 1.65, open = o.frontDoorOpen == null ? !T.lit : o.frontDoorOpen;
      if (open) { Q([[dx0, 0.3, z1], [dx1, 0.3, z1], [dx1, 2.35, z1], [dx0, 2.35, z1]], T.porchIn); Q([[dx0 + 0.1, 0.3, z1 + 1.5], [dx1 - 0.05, 0.3, z1 + 1.5], [dx1 - 0.05, 2.2, z1 + 1.5], [dx0 + 0.1, 2.2, z1 + 1.5]], mix(T.porchIn, '#FFF0D2', 0.4));
        Q([[dx0, 0.3, z1], [dx0, 2.35, z1], [dx0 + 0.03, 2.35, z1 + 0.75], [dx0 + 0.03, 0.3, z1 + 0.75]], '#2A2420'); }
      else { Q([[dx0, 0.3, z1], [dx1, 0.3, z1], [dx1, 2.35, z1], [dx0, 2.35, z1]], '#2A2E30'); [[dx0 + 0.1, dx0 + 0.36], [dx1 - 0.36, dx1 - 0.1]].forEach(([a, b]) => Q([[a, 1.44, z1 - 0.01], [b, 1.44, z1 - 0.01], [b, 2.2, z1 - 0.01], [a, 2.2, z1 - 0.01]], T.lit ? '#6E7A7C' : '#E2A060')); }
      if (!T.lit) { g.save(); g.globalCompositeOperation = 'screen'; const c0 = cam.p(1.25, 1.4, z1); g.fillStyle = LC.rad(g, c0[0], c0[1], 0, 2.2 * kAt(cam, 1.25, 1.4, z1), [[0, T.porchIn, 0.45], [1, T.porchIn, 0]]); g.fillRect(-M, -M, W + 2 * M, H + 2 * M); g.restore(); }
      g.restore(); }
    // its side walls' brick bases (the front's base is porchFront: Sarah stands behind it)
    Q([[x1, 0, z0], [x1, 0, z1], [x1, base, z1], [x1, base, z0]], B[T.lit ? 1 : 2]);
    Q([[x0, 0, z0], [x0, 0, z1], [x0, base, z1], [x0, base, z0]], B[2]);
    // the roof (a little pitched slate roof, its gable to the street) and the fascia
    Q([[x0 - 0.12, top, z0 - 0.12], [x1 + 0.12, top, z0 - 0.12], [(x0 + x1) / 2, top + 0.5, z0 - 0.12]], F[T.lit ? 0 : 1]);
    Q([[x1 + 0.12, top, z0 - 0.12], [x1 + 0.12, top, z1], [(x0 + x1) / 2, top + 0.5, z1], [(x0 + x1) / 2, top + 0.5, z0 - 0.12]], T.roof[T.lit ? 1 : 2]);
    if (!T.lit) seg2(g, cam, [(x0 + x1) / 2, top + 0.5, z0 - 0.12], [(x0 + x1) / 2, top + 0.5, z1], 2, rgba(T.rim, 0.6));
  }
  // the porch's front face and glass (front layer: anyone in the porch stands behind it): the brick base either side of the door,
  // the side panes and the door's glass (they give back the drive, the car, the sky); o.door 0..1 opens the door
  function porchGlass(g, cam, T, o) {
    o = o || {}; const z0 = PORCH.z0, x0 = PORCH.x0, x1 = PORCH.x1, base = 0.95, top = PORCH.top, d0 = PORCH.door[0], d1 = PORCH.door[1], F = T.frame, B = T.brick;
    brickWall(g, cam, [[x0, base, z0], [d0, base, z0], [d0, 0, z0], [x0, 0, z0]], B[T.lit ? 0 : 1], rgba('#000000', 0.15), 'porchL', 12);
    brickWall(g, cam, [[d1, base, z0], [x1, base, z0], [x1, 0, z0], [d1, 0, z0]], B[T.lit ? 0 : 1], rgba('#000000', 0.15), 'porchR', 12);
    const door = clamp(o.door || 0, 0, 1), ang = door * 1.35;
    const L = (u, y) => [d1 - Math.cos(ang) * (d1 - d0) * u, y, z0 - Math.sin(ang) * (d1 - d0) * u];         // hinged on the right, it opens out
    const panes = [ [[x0 + 0.05, top - 0.06, z0], [d0 - 0.03, top - 0.06, z0], [d0 - 0.03, base + 0.05, z0], [x0 + 0.05, base + 0.05, z0]],
      [[d1 + 0.03, top - 0.06, z0], [x1 - 0.05, top - 0.06, z0], [x1 - 0.05, base + 0.05, z0], [d1 + 0.03, base + 0.05, z0]],
      [[x1, top - 0.06, z0 + 0.05], [x1, top - 0.06, HOUSE.z - 0.05], [x1, base + 0.05, HOUSE.z - 0.05], [x1, base + 0.05, z0 + 0.05]],
      [L(0.08, 2.05), L(0.92, 2.05), L(0.92, 0.95), L(0.08, 0.95)] ];
    panes.forEach((pp, i) => { const q = clipPts(cam, pp); if (q.length < 3) return; const p = LC.pathPts(q), a = cam.p(pp[0]), b = cam.p(pp[3]);
      g.save(); g.clip(p); g.globalCompositeOperation = 'screen';
      // the east, behind the lens: the street, the opposite houses; morning: bright sky; evening: dim violet with their copper tops
      g.fillStyle = LC.lin(g, 0, a[1], 0, b[1], T.lit ? [[0, '#DDE8E6', 0.55], [0.55, '#9AAAA8', 0.3], [1, '#5E5A50', 0.25]] : [[0, '#5E5A70', 0.42], [0.5, '#3A3A4C', 0.3], [0.62, '#C27A4C', 0.22], [1, '#2A2A30', 0.2]]); g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
      LC.glare(g, null, { x: (a[0] + cam.p(pp[1])[0]) / 2, y: (a[1] + b[1]) / 2, angle: -1.12, color: '#FFFFFF', bands: [{ d: -30, w: Math.max(8, Math.abs(b[1] - a[1]) * 0.12), a: T.lit ? 0.16 : 0.07 }, { d: 20, w: 6, a: 0.1 }] });
      g.restore(); g.strokeStyle = F[T.lit ? 0 : 1]; g.lineWidth = Math.max(2, 0.04 * kAt(cam, pp[0][0], pp[0][1], pp[0][2])); g.stroke(p); });
    // the door's frame (dark painted timber), its lower solid panel and handle
    const k = kAt(cam, (d0 + d1) / 2, 1, z0), fr = clipPts(cam, [L(0, 2.12), L(1, 2.12), L(1, 0.32), L(0, 0.32)]);
    if (fr.length > 2) { g.strokeStyle = T.lit ? '#3E5058' : '#26323A'; g.lineWidth = 0.06 * k; g.stroke(LC.pathPts(fr)); const lp = clipPts(cam, [L(0.04, 0.9), L(0.96, 0.9), L(0.96, 0.36), L(0.04, 0.36)]); if (lp.length > 2) { g.fillStyle = T.lit ? '#3A4A52' : '#1E2830'; g.fill(LC.pathPts(lp)); }
      const h = cam.p(L(0.88, 1.05)); g.fillStyle = T.lit ? '#E2D2A8' : '#8E7A5A'; g.beginPath(); g.arc(h[0], h[1], 0.025 * k, 0, Math.PI * 2); g.fill(); }
    LC.specks(g, LC.pathPts(clipPts(cam, [[x0, top, z0], [x1, top, z0], [x1, base, z0], [x0, base, z0]])), { x: 0, y: 0, w: W, h: H }, 'porchDust', { n: 120, color: '#FFFFFF', rMin: 0.5, rMax: 1.2, aMin: 0.04, aMax: 0.16, scratch: 0.1 });
  }

  // =================================================================================================================
  // VIEWS
  // =================================================================================================================
  const carStandIn = (g, cam, at, heading, T) => {      // the same size as the car set's hatchback, only if it is missing
    const ch = Math.cos(heading), sh = Math.sin(heading), toW = (x, y, z) => [at[0] + x * ch + z * sh, at[1] + y, at[2] - x * sh + z * ch];
    const box = (x0, x1, y0, y1, z0, z1, col) => { const c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].map(p => toW(...p));
      [[0, 1, 2, 3], [4, 5, 6, 7], [0, 4, 7, 3], [1, 5, 6, 2], [3, 2, 6, 7]].forEach(f => Qc(g, cam, f.map(i => c[i]), col)); };
    box(-0.89, 0.89, 0.18, 0.95, -2.1, 2.1, '#2A3B3E'); box(-0.75, 0.75, 0.95, 1.45, -1.3, 0.9, '#1C2628');
  };
  function drawCar(c, g, cam, at, heading, s, T, extra) {
    if (window.SETS && SETS.car && SETS.car.exterior) return SETS.car.exterior(g, Object.assign({ cam, at, heading, tod: s.tod || 'morning', sun: T.sun, em: c.em, t: c.t, reflect: T.lit ? 'sky' : 'dusk' }, extra || {}));
    carStandIn(g, cam, at, heading, T); return null;
  }

  // ---- the drive, wide: the front of the house, the car baking (morning) or just home (evening, dusk) ----
  const driveCam = mkCam({ x: 2.35, y: 1.42, z: -0.6, yaw: 0.06, pitch: 0.1, f: 1050, cx: W / 2, cy: H / 2 + 60 });
  const drive = {
    cam: driveCam,
    back(c, t, s) {
      s = s || {}; const T = todOf(s), tod = TODS[s.tod] ? s.tod : 'morning';
      drawBig(c, bigCache(c, 'house:drive:' + tod, g => houseScene(g, driveCam, T, {})));
      if (!T.lit) { const E = c.em; E.save(); E.globalAlpha = 0.5; E.fillStyle = T.porchIn; const a = driveCam.p(PORCH.x0, PORCH.top, PORCH.z0), b = driveCam.p(PORCH.x1, 0.95, PORCH.z0); E.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); E.restore(); }
    },
    front(c, t, s) {
      s = s || {}; const T = todOf(s), g = c.g;
      drawBig(c, bigCache(c, 'house:driveGlass:' + (TODS[s.tod] ? s.tod : 'morning'), gg => porchGlass(gg, driveCam, T, {})));
      // the air over the hot gravel trembles (morning): a faint shimmer near the ground, the car's own is SETS.car's heat
      if (T.lit && (s.shimmer == null ? 1 : s.shimmer) > 0 && window.SETS && SETS.car && SETS.car.shimmer) { const a = driveCam.p(DRIVE.x0, 0.3, 7.5), b = driveCam.p(DRIVE.x1, 0, 7.5); SETS.car.shimmer(g, { x: 0, y: a[1] - 30, w: W, h: 60 }, t, { amp: 1.6 }); }
      g.fillStyle = LC.lin(g, 0, 860, 0, H, [[0, '#0A0E0E', 0], [1, '#0A0E0E', T.lit ? 0.32 : 0.5]]); g.fillRect(0, 860, W, H - 860);
    },
    car: { at: CAR_AT, heading: 0, note: 'nose to the house (we see its tail and passenger flank); SETS.car.exterior(c.g, {cam: v.cam, at, heading, tod, sun: v.sun(s), heat, t})' },
    sun: s => todOf(s).sun,
    anchors: (() => { const cam = driveCam, p = (x, y, z) => cam.p(x, y, z).slice(0, 2).map(Math.round);
      return { car: p(...CAR_AT), carRoof: p(CAR_AT[0], 1.46, CAR_AT[2]), carPxPerM: Math.round(kAt(cam, ...CAR_AT)), porchDoor: p(1.25, 1.2, PORCH.z0), sarahInPorch: p(1.2, 0.3, PORCH.z0 + 0.5), sarahPxPerM: Math.round(kAt(cam, 1.2, 1, PORCH.z0 + 0.5)),
        steps: [p(1.25, 0.3, PORCH.z0 - 0.1), p(1.25, 0, PORCH.z0 - 0.6)], driverDoor: p(CAR_AT[0] + 0.95, 0, CAR_AT[2] + 0.3) }; })(),
    light: { morning: { x: -400, y: -300, color: '#FFE9C4', note: 'the sun behind the lens, left: the front lit' }, evening: { x: 1000, y: 120, color: '#F2A65E', note: 'behind the roof: rims only' } },
  };

  // ---- through the windscreen, arriving on the drive (Q11 0-5) and reversing out (Q11 26-32): the driver's eye ----
  // approach 0..1 (from the road onto the drive, turning in) / back 0..1 (reversing out and swinging into the road)
  const povCam = (u, rev) => {
    // the car's path: from the road (z -3.5, angled) up the drive to its spot; the driver sits on the right
    const zc = lerp(-3.8, CAR_AT[2], u), xc = CAR_AT[0] + (1 - u) * (1 - u) * 1.8, hd = -0.55 * (1 - u) * (1 - u) * (rev ? -1 : 1);
    const ex = xc + 0.37 * Math.cos(hd) + 0.1 * Math.sin(hd), ez = zc - 0.37 * Math.sin(hd) + 0.1 * Math.cos(hd);
    const look = -0.3 * sstep(u, 0.55, 1);        // as the car comes to rest he looks to the porch (and when he backs out, he starts there)
    return mkCam({ x: ex, y: 1.2, z: ez, yaw: hd + look, pitch: 0.02, f: 980, cx: W / 2 - 40, cy: H / 2 + 40 });
  };
  function cabinFrame(g, T, o) {     // the car's own frame round the windscreen, after C2: headliner, visors, the A-pillars, the dash; the mirror shows the road behind
    o = o || {}; const lit = T.lit, DASH = 820;
    g.fillStyle = lit ? '#4E4C46' : '#1E1D1C'; g.fillRect(-M, -M, W + 2 * M, 150 + M); g.fillStyle = lit ? '#2C2B27' : '#121212'; g.fillRect(-M, 148, W + 2 * M, 5);
    const ap = new Path2D(); ap.moveTo(1690, -M); ap.lineTo(W + M, -M); ap.lineTo(W + M, H + M); ap.lineTo(1880, DASH); ap.bezierCurveTo(1830, 560, 1780, 330, 1690, 150); ap.closePath(); g.fillStyle = lit ? '#2C2B27' : '#121212'; g.fill(ap);
    const lp = new Path2D(); lp.moveTo(-M, 150); lp.lineTo(70, 150); lp.bezierCurveTo(46, 400, 22, 600, -M, 780); lp.closePath(); g.fill(lp);
    g.strokeStyle = rgba(T.rim, lit ? 0.25 : 0.35); g.lineWidth = 2; g.beginPath(); g.moveTo(1702, 160); g.bezierCurveTo(1792, 336, 1840, 560, 1876, DASH); g.stroke();
    g.fillStyle = LC.lin(g, 0, DASH, 0, H, [[0, lit ? '#2A2A27' : '#141414'], [1, '#0A0B0A']]); g.fillRect(-M, DASH, W + 2 * M, H - DASH + M);
    g.fillStyle = rgba(lit ? '#E8D6B4' : '#C9875A', 0.18); g.fillRect(-M, DASH, W + 2 * M, 3);
    const bn = LC.smooth([[1150, H + 10], [1180, DASH + 30], [1300, DASH - 12], [1460, DASH - 26], [1620, DASH - 12], [1740, DASH + 30], [1770, H + 10]]); g.fillStyle = '#0E0F0E'; g.fill(bn);
    // the rear-view mirror at the top: only the road behind (the empty street), as in every car shot after the mirror moment
    const mq = LC.rrect(700, 166, 460, 128, 60); g.fillStyle = '#0B0D0E'; g.fill(LC.rrect(690, 158, 480, 144, 66)); g.save(); g.clip(mq);
    g.fillStyle = LC.lin(g, 0, 166, 0, 294, lit ? [[0, '#C9D2CC'], [0.55, '#8E968E'], [1, '#4A4A44']] : [[0, '#5A5464'], [0.5, '#3A3640'], [1, '#1E1E22']]); g.fillRect(700, 166, 460, 128);
    g.fillStyle = lit ? '#5E625A' : '#202024'; g.beginPath(); g.moveTo(700, 250); g.lineTo(900, 232); g.lineTo(960, 232); g.lineTo(1160, 250); g.lineTo(1160, 294); g.lineTo(700, 294); g.closePath(); g.fill();
    g.fillStyle = lit ? '#3E423E' : '#16161A'; g.fillRect(700, 205, 130, 40); g.fillRect(1030, 210, 130, 36); g.restore();
    g.strokeStyle = 'rgba(240,230,210,0.35)'; g.lineWidth = 2; g.stroke(mq); g.fillStyle = '#0D0F10'; g.fill(LC.rrect(912, 120, 36, 46, 8));
  }
  function windscreenFront(g, T, t) {     // the windscreen: the dash's ghost low in the glass, dust, a long sheen
    const glass = new Path2D(); glass.moveTo(70, 150); glass.lineTo(1690, 150); glass.lineTo(1880, 820); glass.lineTo(-M, 820); glass.closePath();
    g.save(); g.clip(glass); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.lin(g, 0, 640, 0, 820, [[0, '#D9D2C2', 0], [1, '#D9D2C2', T.lit ? 0.2 : 0.12]]); g.fillRect(0, 640, W, 180); g.restore();
    LC.specks(g, glass, { x: 0, y: 150, w: W, h: 670 }, 'houseScreen', { n: 420, color: T.lit ? '#FFF3DA' : '#F2C49A', rMin: 0.5, rMax: 1.4, aMin: 0.05, aMax: T.lit ? 0.3 : 0.22, scratch: 0.08 });
    LC.glare(g, glass, { x: 700, y: 420, angle: -1.05, color: T.lit ? '#FFF2DC' : '#F6C08A', bands: [{ d: -200, w: 120, a: 0.04 }, { d: -130, w: 16, a: 0.06 }, { d: 280, w: 180, a: 0.03 }] });
  }
  const pov = (rev) => { const st = {}; return {
    camAt: u => povCam(clamp(u, 0, 1), rev),
    back(c, t, s) {
      s = s || {}; const T = todOf(s), u = rev ? 1 - clamp(s.back || 0, 0, 1) : clamp(s.approach == null ? 1 : s.approach, 0, 1), cam = povCam(u, rev);
      const g = c.g; g.save(); g.translate(0, 0);
      // the world through the glass: drawn live (the car moves); the house scene is simple flat geometry
      const q = Math.round(u * 48) / 48, key = 'house:pov:' + (TODS[s.tod] ? s.tod : 'evening') + ':' + (rev ? 'r' : 'a') + q;
      drawBig(c, bigCache(c, key, gg => houseScene(gg, povCam(q, rev), T, {})));
      g.restore(); st.q = q;
    },
    front(c, t, s) { s = s || {}; const T = todOf(s), g = c.g, q = st.q == null ? (rev ? 1 - clamp(s.back || 0, 0, 1) : clamp(s.approach == null ? 1 : s.approach, 0, 1)) : st.q;
      drawBig(c, bigCache(c, 'house:povFront:' + (TODS[s.tod] ? s.tod : 'evening') + ':' + (rev ? 'r' : 'a') + q, gg => porchGlass(gg, povCam(q, rev), T, {})));
      windscreenFront(g, T, t); cabinFrame(g, T); },
    anchorsAt(u) { const cam = povCam(clamp(u, 0, 1), rev), p = (x, y, z) => cam.p(x, y, z).slice(0, 2).map(Math.round);
      return { porchDoor: p(1.25, 1.2, PORCH.z0), sarahInPorch: p(1.2, 0.3, PORCH.z0 + 0.5), sarahPxPerM: Math.round(kAt(cam, 1.2, 1, PORCH.z0 + 0.5)), stepTop: p(1.25, 0.3, PORCH.z0 - 0.1), stepFoot: p(1.25, 0, PORCH.z0 - 0.6), drive: p(3.2, 0, 7.4) }; },
    light: { x: 1000, y: 100, color: '#F2A65E', note: 'evening: the sun behind the house ahead; morning: behind us' },
  }; };
  const arrive = pov(false), reverse = pov(true);
  arrive.anchors = arrive.anchorsAt(1); reverse.anchors = reverse.anchorsAt(1);

  // ---- Sarah in the porch, behind its glass (Q11 5-26): from beside the car ----
  const porchCam = mkCam({ x: 3.0, y: 1.58, z: 4.85, yaw: -0.56, pitch: -0.03, f: 1500, cx: W / 2 + 60, cy: H / 2 });
  const porchView = {
    cam: porchCam,
    back(c, t, s) { s = s || {}; const T = todOf(s), tod = TODS[s.tod] ? s.tod : 'evening'; drawBig(c, bigCache(c, 'house:porch:' + tod, g => houseScene(g, porchCam, T, {})));
      if (!T.lit) { const E = c.em; E.save(); E.globalAlpha = 0.55; E.fillStyle = T.porchIn; const a = porchCam.p(0.85, 2.35, HOUSE.z), b = porchCam.p(1.65, 0.3, HOUSE.z); E.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); E.restore(); } },
    front(c, t, s) { s = s || {}; const T = todOf(s), g = c.g, door = clamp(s.door || 0, 0, 1), tod = TODS[s.tod] ? s.tod : 'evening';
      if (door < 0.001) drawBig(c, bigCache(c, 'house:porchGlass:' + tod, gg => porchGlass(gg, porchCam, T, {}))); else porchGlass(g, porchCam, T, { door });
      g.fillStyle = LC.lin(g, 0, 860, 0, H, [[0, '#0A0E0E', 0], [1, '#0A0E0E', 0.5]]); g.fillRect(0, 860, W, H - 860); },
    anchors: (() => { const cam = porchCam, p = (x, y, z) => cam.p(x, y, z).slice(0, 2).map(Math.round);
      return { sarahFeet: p(1.22, 0.3, PORCH.z0 + 0.55), sarahHead: p(1.22, 1.95, PORCH.z0 + 0.55), sarahPxPerM: Math.round(kAt(cam, 1.22, 1, PORCH.z0 + 0.55)), doorHandle: p(PORCH.door[0] + 0.1, 1.05, PORCH.z0), stepFoot: p(1.25, 0, PORCH.z0 - 0.6) }; })(),
    light: { x: 760, y: 420, color: '#E8A45E', note: 'the hall lamp behind her: a warm rim; the glass in front gives back the dusky east' },
  };

  // ---- the wing mirror (Q11 26-32): out on the road and pulling away, the passenger mirror holds the house, the drive and
  //      Sarah at its end, small, receding (away 0..1). The car drives along the road (+x), the house on its left. ----
  const ROADZ = -3.3;
  const wingMirrorCam = a => { const xc = lerp(5.2, 22, a), mx = xc + 0.9, mz = ROADZ + 0.98;
    return mkCam({ x: mx, y: 1.02, z: mz, yaw: -Math.PI / 2 + 0.34, pitch: 0.0, f: 760, cx: 700, cy: 560 }); };
  const wingSt = {};
  const wing = {
    back(c, t, s) {
      s = s || {}; const T = todOf(s), g = c.g, a = clamp(s.away == null ? 0.15 : s.away, 0, 1), tod = TODS[s.tod] ? s.tod : 'dusk';
      // through the passenger window: our side of the road sliding past at dusk (a hedge, a low wall, the next front gardens)
      drawBig(c, bigCache(c, 'house:wingOut:' + tod, gg => { const cam = mkCam({ x: 14, y: 1.15, z: ROADZ, yaw: -0.25, pitch: -0.02, f: 900, cx: W / 2 + 200, cy: H / 2 }); houseScene(gg, cam, T, {}); gg.fillStyle = rgba('#081014', 0.42); gg.fillRect(-M, -M, W + 2 * M, H + 2 * M); }));
      // the mirror: housing and glass, its picture the view behind, mirrored
      const q = Math.round(a * 40) / 40, refl = bigCache(c, 'house:wingRefl:' + tod + ':' + q, gg => { houseScene(gg, wingMirrorCam(q), T, {}); porchGlass(gg, wingMirrorCam(q), T, {}); });
      const mp = LC.smooth([[500, 420], [900, 396], [980, 470], [972, 700], [900, 740], [510, 728], [450, 652], [458, 470]]);
      g.fillStyle = '#080A0C'; g.save(); g.translate(16, 20); g.fill(mp); g.restore(); g.fillStyle = '#121618'; g.save(); g.translate(715, 568); g.scale(1.07, 1.1); g.translate(-715, -568); g.fill(mp); g.restore();
      g.save(); g.clip(mp); g.translate(1430, 0); g.scale(-1, 1); g.drawImage(refl, -M, -M); g.restore();
      g.save(); g.clip(mp); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(192,202,208)'; g.fillRect(0, 0, W, H); g.restore();
      wingSt.mp = mp; wingSt.a = a;
    },
    // Sarah (or anything) in the mirror: fn(g, cam, mirrorX) with the mirror's own camera (house metres) and its flip
    inGlass(c, s, fn) { const g = c.g; if (!wingSt.mp) return; g.save(); g.clip(wingSt.mp); g.translate(1430, 0); g.scale(-1, 1); fn(g, wingMirrorCam(wingSt.a)); g.restore(); },
    front(c, t, s) {
      s = s || {}; const T = todOf(s), g = c.g, mp = wingSt.mp; if (!mp) return;
      LC.specks(g, mp, { x: 440, y: 390, w: 560, h: 360 }, 'wingDust', { n: 90, color: '#FFFFFF', rMin: 0.5, rMax: 1.2, aMin: 0.05, aMax: 0.2, scratch: 0.1 });
      LC.glare(g, mp, { x: 720, y: 540, angle: -0.9, color: '#FFFFFF', bands: [{ d: -40, w: 40, a: 0.05 }] }); g.strokeStyle = 'rgba(230,220,200,0.35)'; g.lineWidth = 2; g.stroke(mp);
      // the passenger window's frame, the door's top and the A-pillar, the car's inside dark round it
      g.fillStyle = '#0B0D0E'; g.beginPath(); g.moveTo(-M, H + M); g.lineTo(-M, 850); g.lineTo(1450, 880); g.lineTo(W + M, 910); g.lineTo(W + M, H + M); g.closePath(); g.fill();
      g.fillStyle = '#0D0F11'; g.beginPath(); g.moveTo(-M, -M); g.lineTo(W + M, -M); g.lineTo(W + M, 110); g.bezierCurveTo(1300, 140, 600, 120, -M, 190); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-M, -M); g.lineTo(210, -M); g.bezierCurveTo(160, 300, 120, 600, 80, H + M); g.lineTo(-M, H + M); g.closePath(); g.fill();
      g.strokeStyle = rgba(T.rim, 0.3); g.lineWidth = 2; g.beginPath(); g.moveTo(-M, 848); g.lineTo(1450, 878); g.stroke();
      const pane = new Path2D(); pane.moveTo(200, 170); pane.lineTo(W, 110); pane.lineTo(W, 905); pane.lineTo(90, 852); pane.closePath();
      LC.specks(g, pane, { x: 0, y: 100, w: W, h: 800 }, 'wingWin', { n: 200, color: '#F2C49A', rMin: 0.5, rMax: 1.3, aMin: 0.04, aMax: 0.18, scratch: 0.1 });
    },
    mirrorCamAt: wingMirrorCam,
    anchorsAt(a) { const cam = wingMirrorCam(clamp(a, 0, 1)), p = (x, y, z) => { const q = cam.p(x, y, z); return [Math.round(1430 - q[0]), Math.round(q[1])]; };
      return { glass: [450, 396, 980, 740], sarahAtDriveEnd: p(DRIVE.x0 + 0.6, 0, 0.4), sarahPxPerM: Math.round(kAt(cam, DRIVE.x0 + 0.6, 1, 0.4)), porch: p(1.25, 1.2, PORCH.z0) }; },
    light: { x: 1200, y: 200, color: '#E89A5E' },
  };
  wing.anchors = wing.anchorsAt(0.15);

  // =================================================================================================================
  // demo stand-ins
  function demoSarah(c, A, k, L) { const g = c.g, [x, y] = A;
    if (window.RIG && RIG.draw && L) { RIG.draw(g, 'sarah', { at: A, scale: k, view: 'front', face: 'warm', armR: 'relaxed', armL: { hand: [0.02, -0.18, 0.12] }, head: { turn: 0.08, nod: 0.05, tilt: 0.03 } }, { light: { x: L.x, y: L.y, color: L.color, back: 0.6 }, ambient: '#2A3340', ambientK: 0.1 }); return; } g.save(); g.fillStyle = '#1E1A1C'; g.beginPath(); g.ellipse(x, y - 1.6 * k, 0.1 * k, 0.12 * k, 0, 0, Math.PI * 2); g.fill(); g.fill(LC.rrect(x - 0.2 * k, y - 1.46 * k, 0.4 * k, 0.75 * k, 0.1 * k)); g.fill(LC.rrect(x - 0.17 * k, y - 0.76 * k, 0.34 * k, 0.76 * k, 0.06 * k)); g.restore(); }
  window.SETS = window.SETS || {};
  SETS.house = {
    views: { drive, arrive, porch: porchView, reverse, wing },
    // a picture of the house front for other sets' reflections (the car's side glass in Q05): draws into g's box, mirrored if asked
    facade(g, box, o) { o = o || {}; const T = todOf(o), cam = mkCam({ x: 1.0, y: 1.4, z: -1.5, yaw: 0, pitch: 0.08, f: box.w * 0.6, cx: box.x + box.w / 2, cy: box.y + box.h * 0.55 }); g.save(); g.beginPath(); g.rect(box.x, box.y, box.w, box.h); g.clip(); houseScene(g, cam, T, { noShadows: true }); g.restore(); },
    demos: [
      { name: 'drive: morning, the car baking, heat rising', draw(c, t) { const s = { tod: 'morning' }; drive.back(c, t, s); drawCar(c, c.g, driveCam, CAR_AT, 0, s, TODS.morning, { heat: 1 }); drive.front(c, t, s); } },
      { name: 'drive: evening, home, the porch lit', draw(c, t) { const s = { tod: 'evening' }; drive.back(c, t, s); drawCar(c, c.g, driveCam, CAR_AT, 0, s, TODS.evening); demoSarah(c, drive.anchors.sarahInPorch, drive.anchors.sarahPxPerM, { x: drive.anchors.porchDoor[0], y: drive.anchors.porchDoor[1] - 200, color: '#E2A868' }); drive.front(c, t, s); } },
      { name: 'arrive: through the windscreen, onto the gravel (evening)', draw(c, t) { const s = { tod: 'evening', approach: clamp(0.55 + t * 0.12, 0, 1) }; arrive.back(c, t, s); arrive.front(c, t, s); } },
      { name: 'porch: Sarah behind the porch glass (evening)', draw(c, t) { const s = { tod: 'evening' }; porchView.back(c, t, s); demoSarah(c, porchView.anchors.sarahFeet, porchView.anchors.sarahPxPerM, porchView.light); porchView.front(c, t, s); } },
      { name: 'reverse: backing out, the house receding (dusk)', draw(c, t) { const s = { tod: 'dusk', back: clamp(0.2 + t * 0.15, 0, 1) }; reverse.back(c, t, s); reverse.front(c, t, s); } },
      { name: 'wing: pulling away, the house and Sarah in the mirror (dusk)', draw(c, t) { const s = { tod: 'dusk', away: clamp(0.08 + t * 0.06, 0, 1) }; wing.back(c, t, s);
        wing.inGlass(c, s, (g, cam) => { const f = cam.p(DRIVE.x0 + 0.6, 0, 0.4), k = kAt(cam, DRIVE.x0 + 0.6, 1, 0.4); demoSarah({ g }, [f[0], f[1]], k); }); wing.front(c, t, s); } },
      { name: 'drive: dusk', draw(c, t) { const s = { tod: 'dusk' }; drive.back(c, t, s); drawCar(c, c.g, driveCam, CAR_AT, 0, s, TODS.dusk); drive.front(c, t, s); } },
    ],
  };
})();
