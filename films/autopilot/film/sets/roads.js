/* AUTOPILOT · SETS.roads — the journey, seen through Daniel's windscreen (Look C, "Through Glass").
   A sequence of turns he has made hundreds of times: residential English roads in the morning (a bakery on a corner whose
   window gives the car back, two sets of lights, the zebra crossing by the park, the same impatient van at the same junction,
   its windscreen a sheet of glare); the painted nursery wall slipping past the passenger window, out of focus; evening
   traffic in copper heat, where every windscreen is copper and nothing can be seen through any glass; the dusk drive.
   The street is a small 3D world laid out in metres and seen through LC.camera; `travel` (metres) moves the camera, so the
   scenery comes at the glass with true parallax. UK: we drive on the left; the kerb is on our left, the centre line on our
   right. The rear-view mirror is in every windscreen shot and only ever shows the road behind (SETS.car's road framing).
   Deterministic (OTM.rng / vnoise / fbm). Static layers are cached under 'roads:' keys. Documented in film/api/roads.md. */
(function () {
  'use strict';
  const { W, H } = OTM, P = LC.P;
  const clamp = OTM.clamp, lerp = OTM.lerp, mix = OTM.mix, rgba = OTM.rgba, TAU = Math.PI * 2;
  const CAR = () => window.SETS && window.SETS.car;
  const polyPath = (pts) => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; };
  const area = pts => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };

  // =================================================================================================================
  // 1. LIGHT BY TIME OF DAY
  // =================================================================================================================
  const PAL = {
    morning: { sky: ['#D3D9D0', '#EDE7D6', '#FBF1DC'], haze: '#F1E9D6', road: '#73756F', roadFar: '#BDB9AB', pave: '#ADADA2', kerb: '#D3D1C4', line: '#EEEADC', yellow: '#D6AE48',
      brick: ['#8C6650', '#7A5A46', '#9A7258', '#86705C'], render: '#D6CFBC', roof: '#4A4E50', roofLit: '#66696A', win: '#3C484A', winLit: '#BFC9C4', frame: '#E6E4DC', door: ['#2E4A52', '#5A2E2E', '#2E3A2E', '#E6E2D6'],
      hedge: '#4C6454', hedgeLit: '#6E8A70', tree: '#546E5C', treeLit: '#7C987C', trunk: '#3A3A34', post: '#474B4B', wall: '#7A6A5C', shop: '#2E3A3C',
      sun: [205, 150], sunDir: [-0.55, 0.36, 0.75], glow: 1, rim: '#FFE9C4', glass: 'morning' },
    evening: { sky: ['#6A4E4A', '#C27A4C', '#F2A862'], haze: '#E49A60', road: '#4A3A34', roadFar: '#B07A54', pave: '#6A5244', kerb: '#8A6A54', line: '#E8C8A0', yellow: '#C89040',
      brick: ['#6A4232', '#5A382C', '#764836', '#64483A'], render: '#A88468', roof: '#2C2424', roofLit: '#5A3E32', win: '#281E1E', winLit: '#F2A868', frame: '#C8A888', door: ['#1E2A2E', '#3A1E1E', '#1E261E', '#B89878'],
      hedge: '#34342A', hedgeLit: '#6A5A3A', tree: '#3A382C', treeLit: '#7A6A44', trunk: '#2A2420', post: '#2E2626', wall: '#5A443A', shop: '#2A2220',
      sun: null, sunDir: [0.32, 0.12, -0.94], glow: 1.1, rim: '#F2A65E', glass: 'evening' },   // the sun is low behind us: it is in the mirror
    dusk: { sky: ['#232D38', '#47485A', '#A87458'], haze: '#6A5A5C', road: '#23232A', roadFar: '#4A4046', pave: '#2E2E36', kerb: '#44424A', line: '#86828C', yellow: '#76663A',
      brick: ['#3A3036', '#332B31', '#40343A', '#393137'], render: '#4A4652', roof: '#19191F', roofLit: '#28242E', win: '#15151B', winLit: '#E8B070', frame: '#58546A', door: ['#141A1E', '#24161A', '#161C18', '#4A4652'],
      hedge: '#1D2125', hedgeLit: '#2C2E32', tree: '#1B1F23', treeLit: '#292D31', trunk: '#141416', post: '#141418', wall: '#2C282E', shop: '#141418',
      sun: null, sunDir: [0.3, -0.02, 0.95], glow: 0.55, rim: '#F2A35E', glass: 'dusk' },   // the sun is down behind the roofs ahead; only its copper is left at the end of the road
  };
  PAL.afternoon = PAL.morning; PAL.noon = PAL.morning;

  // =================================================================================================================
  // 2. THE STREET: features in world metres (x right, y up, z ahead). The near kerb is at x -2.0, the centre line at 1.35,
  //    the far kerb at 4.7; pavements two metres; front walls at -4.0 / 6.7; house fronts set back behind small gardens.
  // =================================================================================================================
  const K_NEAR = -2.0, K_FAR = 4.7, CL = 1.35, WALL_L = -4.0, WALL_R = 6.7;
  // a block of houses along one side between z0 and z1 (semis in pairs, a terrace, a parade of shops), deterministic per seed
  function houses(F, side, z0, z1, seed, o) {
    o = o || {}; const R = OTM.rng('houses:' + seed); let z = z0;
    while (z < z1) {
      const kind = o.kind || (R() < 0.55 ? 'semi' : R() < 0.6 ? 'terrace' : 'detached');
      const n = kind === 'semi' ? 2 : kind === 'terrace' ? 3 + (R() * 3 | 0) : 1, w = (kind === 'terrace' ? 5.2 : 6.2) + R() * 0.8;
      const set = o.setback == null ? 6 + R() * 2.5 : o.setback, xf = side < 0 ? WALL_L - set : WALL_R + set;
      const ht = (o.storeys || 2) * 2.7 + 0.2, render = R() < 0.3, col = R() * 4 | 0, roof = kind === 'terrace' || R() < 0.4 ? 'gable' : 'hip';
      F.push({ t: 'house', side, z0: z, z1: z + n * w, n, w, xf, depth: 8 + R() * 1.5, ht, rh: 2.4 + R() * 0.8, roof, render, col, bay: !o.shop && R() < 0.65, door: R() * 4 | 0, chim: R() < 0.8, shop: o.shop, seed: seed + ':' + z.toFixed(1), z: z });
      // the front garden's low wall or hedge, with a gap for the path
      F.push({ t: 'wall', side, z0: z, z1: z + n * w, hedge: R() < 0.5, h: 0.7 + R() * 0.5, z: z + n * w });
      z += n * w + (kind === 'terrace' ? 0.3 : 2.2 + R() * 2.5);
    }
  }
  function furniture(F, z0, z1, seed, o) {
    o = o || {}; const R = OTM.rng('furn:' + seed);
    for (let z = z0 + R() * 10; z < z1; z += 26 + R() * 10) F.push({ t: 'lamp', x: K_NEAR - 0.4, z, side: -1 });
    for (let z = z0 + 8 + R() * 10; z < z1; z += 30 + R() * 14) F.push({ t: 'lamp', x: K_FAR + 0.4, z, side: 1 });
    if (o.trees !== false) for (let z = z0 + 5 + R() * 8; z < z1; z += 14 + R() * 12) F.push({ t: 'tree', x: (R() < 0.5 ? K_NEAR - 1.3 : K_FAR + 1.3), z, r: 2.4 + R() * 1.4, h: 5.5 + R() * 2.5, seed: z });
    if (o.parked !== false) for (let z = z0 + 6 + R() * 12; z < z1; z += 9 + R() * 22) { if (R() < 0.55) F.push({ t: 'vehicle', kind: R() < 0.8 ? 'car' : 'van', x: K_FAR - 1.0, z, heading: Math.PI, col: R() * 6 | 0, parked: true }); }
  }
  // the beats: each a stretch of street with its own business. Their `z` origin is the camera at travel 0.
  const BEATS = {
    plain: () => { const F = []; houses(F, -1, 4, 260, 'pl-l'); houses(F, 1, 2, 260, 'pl-r'); furniture(F, 0, 260, 'pl'); return { F, ground: [] }; },
    // a quiet stretch, nothing parked (for glimpses far out of focus: SETS.car's dash)
    quiet: () => { const F = []; houses(F, -1, 4, 260, 'qt-l'); houses(F, 1, 2, 260, 'qt-r'); furniture(F, 0, 260, 'qt', { parked: false }); return { F, ground: [] }; },
    // a turn at a corner: the bakery stands on the corner ahead-left, its window square to us, so it gives our car back
    // the road ends at a T-junction; the bakery stands across it, facing us, its window giving our own car back; we turn left
    bakery: () => { const F = [], G = [];
      houses(F, 1, 2, 30, 'bk-r'); houses(F, -1, 4, 30, 'bk-l');
      G.push({ t: 'cross', z0: 33, z1: 43 }, { t: 'giveway2', z: 31.6 });
      F.push({ t: 'frontage', z: 46.5, x0: -40, x1: -8.5, seed: 'bkw' }, { t: 'bakery', z: 46.5, x0: -8.2, x1: 6.2, ht: 6.4 }, { t: 'frontage', z: 46.5, x0: 6.5, x1: 40, seed: 'bke' });
      F.push({ t: 'lamp', x: -9.5, z: 44.5, side: -1 }, { t: 'lamp', x: 9.0, z: 44.5, side: 1 });
      furniture(F, 0, 30, 'bk', { parked: false }); return { F, ground: G, roadEnd: 33, yaw: s => -0.62 * FILM.ease.inOutSine(clamp(((s.travel || 0) - 18) / 16, 0, 1)), sway: s => -1.4 * FILM.ease.inOutSine(clamp(((s.travel || 0) - 22) / 14, 0, 1)) }; },
    // a junction with signals: the primary on the near kerb after the stop line, the secondary across the junction on the right
    lights1: () => { const F = [], G = [];
      houses(F, -1, 4, 26, 'l1-l'); houses(F, 1, 2, 26, 'l1-r'); houses(F, -1, 41, 200, 'l1-l2'); houses(F, 1, 41, 200, 'l1-r2');
      G.push({ t: 'side', side: -1, z0: 28, z1: 39 }, { t: 'side', side: 1, z0: 28, z1: 39 }, { t: 'stop', z: 26.6 }, { t: 'yellow', z0: 12, z1: 27 });
      F.push({ t: 'signal', x: K_NEAR - 0.35, z: 27.2, side: -1 }, { t: 'signal', x: K_FAR + 0.45, z: 40.5, side: 1 }, { t: 'signal', x: K_NEAR - 0.35, z: 40.8, side: -1, small: true });
      furniture(F, 41, 200, 'l1', { parked: false }); furniture(F, 0, 24, 'l1a', { trees: false }); return { F, ground: G }; },
    // the second set: a pelican crossing on a shopping street, the signal close on the left, a bus stop
    lights2: () => { const F = [], G = [];
      houses(F, -1, 4, 200, 'l2-l', { kind: 'terrace', setback: 0.3, shop: true }); houses(F, 1, 2, 200, 'l2-r', { kind: 'terrace', setback: 0.3, shop: true });
      G.push({ t: 'stop', z: 18.2 }, { t: 'studs', z: 20.2 }, { t: 'zigzag', z0: 2, z1: 17.6 }, { t: 'zigzag', z0: 23, z1: 36 });
      F.push({ t: 'signal', x: K_NEAR - 0.4, z: 19.0, side: -1 }, { t: 'signal', x: K_FAR + 0.45, z: 21.8, side: 1 }, { t: 'shelter', x: K_NEAR - 1.4, z: 40, side: -1 });
      furniture(F, 30, 200, 'l2', { trees: false, parked: false }); return { F, ground: G }; },
    // the zebra near the park: stripes, Belisha beacons, the zigzags, the park's railings and its big trees on the left
    crossing: () => { const F = [], G = [];
      houses(F, 1, 2, 200, 'zc-r'); F.push({ t: 'railings', side: -1, z0: 2, z1: 200 });
      for (let z = 8; z < 200; z += 11 + (z * 7 % 5)) F.push({ t: 'tree', x: WALL_L - 3 - (z * 13 % 7), z, r: 3.6 + (z % 3), h: 8 + (z % 4), seed: z, park: true });
      G.push({ t: 'zebra', z: 24 }, { t: 'zigzag', z0: 8, z1: 22.6 }, { t: 'zigzag', z0: 27.6, z1: 42 }, { t: 'grass', side: -1 });
      F.push({ t: 'beacon', x: K_NEAR - 0.4, z: 23.4 }, { t: 'beacon', x: K_FAR + 0.4, z: 23.4 }, { t: 'beacon', x: K_NEAR - 0.4, z: 26.2 }, { t: 'beacon', x: K_FAR + 0.4, z: 26.2 });
      furniture(F, 30, 200, 'zc', { trees: false, parked: false }); return { F, ground: G }; },
    // the same impatient van at the same junction: a side road on the left, the van at the give-way line, nosing out
    van: () => { const F = [], G = [];
      houses(F, -1, 4, 14, 'vn-l'); houses(F, 1, 2, 200, 'vn-r'); houses(F, -1, 27, 200, 'vn-l2');
      G.push({ t: 'side', side: -1, z0: 15, z1: 25 }, { t: 'giveway', side: -1, z0: 15.5, z1: 24.5 });
      F.push({ t: 'vehicle', kind: 'van', x: -6.2, z: 21.4, heading: Math.PI / 2, col: 0, glare: true, nudge: true });
      furniture(F, 28, 200, 'vn'); return { F, ground: G }; },
    // evening: the road home, traffic ahead and coming the other way, every windscreen copper
    evening: () => { const F = [], G = []; houses(F, -1, 4, 260, 'ev-l'); houses(F, 1, 2, 260, 'ev-r'); furniture(F, 0, 260, 'ev', { parked: false });
      [[12, 0], [24, 3], [37, 1], [52, 4], [70, 2]].forEach(([z, c], i) => F.push({ t: 'vehicle', kind: i === 2 ? 'van' : 'car', x: -0.37 + (i % 2 ? 0.15 : -0.1), z, heading: 0, col: c, moving: 1 }));
      [[30, 5], [58, 2], [90, 1], [120, 3]].forEach(([z, c], i) => F.push({ t: 'vehicle', kind: 'car', x: 3.0, z, heading: Math.PI, col: c, moving: -1 }));
      return { F, ground: G }; },
    // dusk: the drive to the nursery, the lamps on, the windows lit
    dusk: () => { const F = []; houses(F, -1, 4, 260, 'dk-l'); houses(F, 1, 2, 260, 'dk-r'); furniture(F, 0, 260, 'dk', { parked: true });
      [[40, 1], [95, 3]].forEach(([z, c]) => F.push({ t: 'vehicle', kind: 'car', x: 3.0, z, heading: Math.PI, col: c, moving: -1, lights: true }));
      return { F, ground: [] }; },
  };
  const _beat = {};
  const beatOf = name => _beat[name] || (_beat[name] = (BEATS[name] || BEATS.plain)());

  // =================================================================================================================
  // 3. DRAWING THE STREET (into a half-resolution layer: soft, as everything beyond the glass is a little out of focus)
  // =================================================================================================================
  const CARCOL = ['#C9CDCB', '#2B2F33', '#7A1E1E', '#2E4A6A', '#8A8C86', '#E6E4DC', '#3A4A3A'];
  function street(g, s, o) {
    const C = PAL[s.tod] || PAL.morning, B = beatOf(s.beat || 'plain'), t = s.t || 0;
    const travel = s.travel || 0, yaw = (s.yaw || 0) + (B.yaw ? B.yaw(s) : 0), sway = (s.sway || 0) + (B.sway ? B.sway(s) : 0);
    const k = o.scale || 1, cx = (o.cx == null ? 960 : o.cx) * k, cy = (o.cy == null ? 470 : o.cy) * k, f = (o.f || 1250) * k;
    const camX = sway, camZ = travel;
    const cam = LC.camera({ x: camX + (s.dx || 0), y: 1.2 + (s.bob || 0), z: camZ, yaw, pitch: -0.02, roll: s.roll || 0, f, cx, cy });
    const P3 = (x, y, z) => cam.p(x, y, z);
    const dist = (x, z) => { const dx = x - camX, dz = z - camZ; return Math.hypot(dx, dz); };
    const hazeK = d => clamp((d - 8) / 150, 0, 0.82);
    const hz = (col, d) => mix(col, C.haze, hazeK(d));
    const Q = (pts, col) => { const sp = pts.map(q => P3(q[0], q[1], q[2])); if (sp.some(q => q[2] < 0.4)) return null; g.fillStyle = col; const p = polyPath(sp); g.fill(p); return sp; };
    const Qv = (pts, col) => { const sp = pts.map(q => P3(q[0], q[1], q[2])); if (sp.some(q => q[2] < 0.4) || area(sp) >= 0) return null; g.fillStyle = col; g.fill(polyPath(sp)); return sp; };
    // sky and the far town at the vanishing point
    const hzY = P3(camX + Math.sin(yaw) * 1e4, 1.2, camZ + Math.cos(yaw) * 1e4)[1];
    g.fillStyle = LC.lin(g, 0, 0, 0, hzY, [[0, C.sky[0]], [0.6, C.sky[1]], [1, C.sky[2]]]); g.fillRect(0, 0, W * k, hzY + 2);
    g.fillStyle = mix(C.haze, C.roof, 0.35); g.beginPath(); g.moveTo(0, hzY + 2); for (let x = 0; x <= W * k; x += 24 * k) g.lineTo(x, hzY - (8 + 18 * OTM.vnoise(x / k * 0.01 + yaw * 40, 2, 3)) * k); g.lineTo(W * k, hzY + 2); g.closePath(); g.fill();
    // ground: the pavements all over, then the carriageway and the side roads, then the markings
    const zA = camZ + 0.6, zB = B.roadEnd ? Math.min(camZ + 260, B.roadEnd) : camZ + 260;
    g.fillStyle = C.pave; g.fillRect(0, hzY, W * k, H * k);
    { const a = P3(K_NEAR, 0, zB), b = P3(K_FAR, 0, zB), c = P3(K_FAR, 0, zA), d = P3(K_NEAR, 0, zA); g.fillStyle = LC.lin(g, 0, hzY, 0, H * k, [[0, C.roadFar], [0.22, C.road], [1, C.road]]); g.fill(polyPath([a, b, c, d])); }
    (B.ground || []).forEach(gd => {
      if (gd.t === 'side') { const x0 = gd.side < 0 ? -60 : K_FAR, x1 = gd.side < 0 ? K_NEAR : 60; g.fillStyle = C.road; const sp = [P3(x0, 0, gd.z0), P3(x1, 0, gd.z0), P3(x1, 0, gd.z1), P3(x0, 0, gd.z1)]; if (!sp.some(q => q[2] < 0.4)) g.fill(polyPath(sp)); }
      if (gd.t === 'cross') { g.fillStyle = C.road; const sp = [P3(-80, 0, gd.z0), P3(80, 0, gd.z0), P3(80, 0, gd.z1), P3(-80, 0, gd.z1)]; if (!sp.some(q => q[2] < 0.4)) g.fill(polyPath(sp)); }
      if (gd.t === 'grass') { g.fillStyle = hz(C.hedge, 30); const sp = [P3(-80, 0, camZ + 8), P3(WALL_L, 0, camZ + 8), P3(WALL_L, 0, zB), P3(-80, 0, zB)]; if (!sp.some(q => q[2] < 0.4)) g.fill(polyPath(sp)); }
    });
    // the kerbs' lit edges
    [[K_NEAR], [K_FAR]].forEach(([x]) => Q([[x, 0.0, zA + 1], [x, 0.12, zA + 1], [x, 0.12, zB], [x, 0.0, zB]], C.kerb));
    // the centre line's dashes (4 m on, 8 off), sliding toward us as we go
    for (let z = Math.floor((camZ + 1) / 12) * 12; z < camZ + 150; z += 12) { const d = dist(CL, z); Q([[CL - 0.07, 0.003, z], [CL + 0.07, 0.003, z], [CL + 0.07, 0.003, z + 4], [CL - 0.07, 0.003, z + 4]], hz(C.line, d)); }
    (B.ground || []).forEach(gd => {
      const L = (x0, x1, z0, z1, col) => Q([[x0, 0.004, z0], [x1, 0.004, z0], [x1, 0.004, z1], [x0, 0.004, z1]], col);
      if (gd.t === 'stop') L(K_NEAR + 0.1, CL, gd.z, gd.z + 0.3, hz(C.line, gd.z - camZ));
      if (gd.t === 'yellow') { L(K_NEAR + 0.12, K_NEAR + 0.22, gd.z0, gd.z1, hz(C.yellow, gd.z0 - camZ)); L(K_NEAR + 0.3, K_NEAR + 0.4, gd.z0, gd.z1, hz(C.yellow, gd.z0 - camZ)); }
      if (gd.t === 'zebra') for (let i = 0; i < 12; i++) { const x0 = K_NEAR + i * 0.56; L(x0, x0 + 0.5, gd.z, gd.z + 2.6, hz(i % 2 ? C.road : C.line, gd.z - camZ)); }
      if (gd.t === 'studs') for (let i = 0; i < 12; i++) { const x0 = K_NEAR + 0.3 + i * 0.55; L(x0, x0 + 0.12, gd.z, gd.z + 0.12, hz(C.kerb, gd.z - camZ)); L(x0, x0 + 0.12, gd.z + 2.4, gd.z + 2.52, hz(C.kerb, gd.z - camZ)); }
      if (gd.t === 'zigzag') [K_NEAR + 0.25, CL, K_FAR - 0.25].forEach(xc => { for (let z = gd.z0; z < gd.z1 - 0.1; z += 2.0) { const a = (Math.round((z - gd.z0) / 2.0) % 2) ? 0.12 : -0.12; Q([[xc - a - 0.05, 0.004, z], [xc - a + 0.05, 0.004, z], [xc + a + 0.05, 0.004, z + 2.0], [xc + a - 0.05, 0.004, z + 2.0]], hz(C.line, z - camZ)); } });
      if (gd.t === 'giveway2') for (let x = K_NEAR + 0.2; x < CL; x += 0.9) { L(x, x + 0.6, gd.z, gd.z + 0.2, hz(C.line, gd.z - camZ)); L(x, x + 0.6, gd.z + 0.4, gd.z + 0.6, hz(C.line, gd.z - camZ)); }
      if (gd.t === 'giveway') { for (let z = gd.z0; z < gd.z1; z += 0.9) { L(K_NEAR - 0.55, K_NEAR - 0.35, z, z + 0.6, hz(C.line, z - camZ)); L(K_NEAR - 0.95, K_NEAR - 0.75, z, z + 0.6, hz(C.line, z - camZ)); }
        const zc = (gd.z0 + gd.z1) / 2; Q([[-3.4, 0.004, zc - 0.7], [-3.4, 0.004, zc + 0.7], [-5.4, 0.004, zc]], hz(C.line, zc - camZ)); }
    });
    // the low sun behind us throws everything's shadow ahead: our own car's first, leading the way down the road
    if (C.sunDir[2] < -0.3) {
      const sd = C.sunDir, Lz = Math.min(26, 1.45 / Math.max(0.06, sd[1])), sx = -sd[0] / -sd[2];
      const sh = (x0, x1, z0, h, wNear) => { const len = Math.min(40, h / Math.max(0.06, sd[1])); return [[x0, 0.01, z0], [x1, 0.01, z0], [x1 + sx * len * 0.9, 0.01, z0 + len], [x0 + sx * len * 0.9, 0.01, z0 + len]]; };
      g.save(); g.globalAlpha = 0.5; Q(sh(-1.2, 0.45, camZ + 2.0, 1.45), '#1A1012'); g.globalAlpha = 0.28; Q(sh(-1.35, 0.6, camZ + 1.6, 1.5), '#1A1012'); g.restore();
      B.F.forEach(e => { if (e.t === 'vehicle') { const zz = e.moving ? movingZ(e, s, t, camZ) : e.z; if (zz - camZ < 2 || zz - camZ > 120) return; g.save(); g.globalAlpha = 0.45; Q(sh(e.x - 0.9, e.x + 0.9, zz + 2.0, e.kind === 'van' ? 2.5 : 1.45), '#1A1012'); g.restore(); }
        if (e.t === 'lamp' && e.z - camZ > 3 && e.z - camZ < 90) { g.save(); g.globalAlpha = 0.4; Q(sh(e.x - 0.07, e.x + 0.07, e.z, 5.8), '#1A1012'); g.restore(); }
        if (e.t === 'tree' && e.z - camZ > 3 && e.z - camZ < 90) { g.save(); g.globalAlpha = 0.35; Q(sh(e.x - e.r * 0.8, e.x + e.r * 0.8, e.z + 2, e.h + e.r * 0.6), '#1A1012'); g.restore(); } });
    }
    // features, far to near
    const span = e => e.z0 != null && e.z1 != null ? [Math.min(e.z0, e.z1), Math.max(e.z0, e.z1)] : e.moving ? [camZ + 1, camZ + 1] : [e.z, e.z];   // frontages span x, not z
    const vis = B.F.filter(e => { const [a, b] = span(e); return b > camZ + 0.5 && a < camZ + 220; });
    const key = e => e.t === 'house' || e.t === 'wall' || e.t === 'railings' ? dist(e.side < 0 ? (e.xf != null ? e.xf : WALL_L) : (e.xf != null ? e.xf : WALL_R), Math.max(e.z0, camZ + 1)) + (e.t === 'house' ? 3 : 0) : (e.t === 'bakery' || e.t === 'frontage') ? dist(clamp(camX, e.x0, e.x1), e.z) + 6 : dist(e.x, e.z);
    const X = { cam, C, Q, Qv, P3, hz, s, t, camZ, camX, k, yaw };
    vis.map(e => [e.moving ? movingZ(e, s, t, camZ) - camZ + Math.abs(e.x) : key(e), e]).sort((a, b) => b[0] - a[0]).forEach(([d, e]) => { X.d = d; if (DRAW[e.t]) DRAW[e.t](g, e, X); });
    return { cam, hzY, glows: X.glows, lamps: X.lamps };
  }
  const DRAW = {
    house(g, e, X) {
      const { C, Qv, Q, hz, P3, camZ } = X, s = e.side, xf = e.xf, xb = xf + s * e.depth, d0 = Math.max(1, e.z0 - camZ);
      const brick = e.render ? C.render : C.brick[e.col], lit = (-s) * C.sunDir[0] > 0.05;   // fronts that face the sun across the road
      const behind = C.sunDir[2] < -0.3, warmLit = c0 => mix(c0, C.rim, behind ? 0.32 : 0.12);
      const front = hz(lit ? warmLit(brick) : mix(brick, '#000000', 0.12), d0), gableC = hz(behind ? warmLit(mix(brick, '#000000', 0.08)) : mix(brick, '#000000', 0.28), d0);
      // the end facing us, the front facing the road, the roof's front slope and its end
      Qv([[xf, 0, e.z0], [xb, 0, e.z0], [xb, e.ht, e.z0], [xf, e.ht, e.z0]], gableC);
      if (e.roof === 'gable') Qv([[xf, e.ht, e.z0], [xb, e.ht, e.z0], [(xf + xb) / 2, e.ht + e.rh, e.z0]], gableC);
      Qv([[xf, 0, e.z0], [xf, 0, e.z1], [xf, e.ht, e.z1], [xf, e.ht, e.z0]].map(q => s < 0 ? q : q).slice(s < 0 ? 0 : 0), front) || Qv([[xf, 0, e.z1], [xf, 0, e.z0], [xf, e.ht, e.z0], [xf, e.ht, e.z1]], front);
      const ov = 0.35, xm = (xf + xb) / 2, zr0 = e.roof === 'hip' ? e.z0 + e.depth * 0.45 : e.z0 - ov, zr1 = e.roof === 'hip' ? e.z1 - e.depth * 0.45 : e.z1 + ov;
      const roofC = hz(lit ? C.roofLit : C.roof, d0);
      Q([[xf + s * ov, e.ht - 0.1, e.z0 - ov], [xf + s * ov, e.ht - 0.1, e.z1 + ov], [xm, e.ht + e.rh, zr1], [xm, e.ht + e.rh, zr0]], roofC);
      if (e.roof === 'hip') Qv([[xf + s * ov, e.ht - 0.1, e.z0 - ov], [xm, e.ht + e.rh, zr0], [xb - s * ov, e.ht - 0.1, e.z0 - ov]], hz(mix(C.roof, '#000000', 0.15), d0)) || Qv([[xb - s * ov, e.ht - 0.1, e.z0 - ov], [xm, e.ht + e.rh, zr0], [xf + s * ov, e.ht - 0.1, e.z0 - ov]], hz(mix(C.roof, '#000000', 0.15), d0));
      if (e.chim) for (let i = 0; i < e.n; i += (e.n > 2 ? 2 : 1)) { const zc = e.z0 + (i + (e.n === 2 ? 1 : 0.5)) * e.w * (e.n === 2 ? 0.5 : 1); Q([[xm + 0.5 * s, e.ht + e.rh - 0.4, zc - 0.4], [xm + 0.5 * s, e.ht + e.rh - 0.4, zc + 0.4], [xm + 0.5 * s, e.ht + e.rh + 0.9, zc + 0.4], [xm + 0.5 * s, e.ht + e.rh + 0.9, zc - 0.4]], hz(mix(brick, '#000000', 0.2), d0)); }
      // the windows and doors on the front (the near houses only)
      if (d0 > 60) return;
      const xw = xf + s * 0.03, winC = hz(lit ? C.winLit : C.win, d0), frC = hz(C.frame, d0);
      for (let i = 0; i < e.n; i++) {
        const za = e.z0 + i * e.w, mid = za + e.w / 2, mir = i % 2 ? -1 : 1;
        if (e.shop) {   // a shopfront: a big dark window under a fascia
          const sw = Q([[xw, 0.5, za + 0.4], [xw, 0.5, za + e.w - 0.4], [xw, 2.7, za + e.w - 0.4], [xw, 2.7, za + 0.4]], hz(C.shop, d0));
          if (sw) { const ys = sw.map(q => q[1]); g.fillStyle = LC.lin(g, 0, Math.min(...ys), 0, Math.max(...ys), [[0, hz(C.sky[1], d0), 0.75], [0.55, hz(C.haze, d0), 0.35], [1, hz(C.shop, d0), 0]]); g.fill(polyPath(sw)); }
          Q([[xw, 2.8, za + 0.2], [xw, 2.8, za + e.w - 0.2], [xw, 3.3, za + e.w - 0.2], [xw, 3.3, za + 0.2]], hz(C.door[(i + e.col) % 3], d0));
        } else {
          const dz = mid + mir * e.w * 0.3;
          Q([[xw, 0, dz - 0.5], [xw, 0, dz + 0.5], [xw, 2.1, dz + 0.5], [xw, 2.1, dz - 0.5]], hz(C.door[(e.door + i) % 4], d0));
          const wz = mid - mir * e.w * 0.18;
          if (e.bay) { const xo = xf + s * 0.7; Qv([[xf, 0, wz - 1.4], [xo, 0, wz - 1.0], [xo, 2.5, wz - 1.0], [xf, 2.5, wz - 1.4]], hz(mix(brick, '#000000', 0.2), d0)) ; Q([[xo, 0.8, wz - 1.0], [xo, 0.8, wz + 1.0], [xo, 2.3, wz + 1.0], [xo, 2.3, wz - 1.0]], frC); Q([[xo + s * 0.01, 0.9, wz - 0.9], [xo + s * 0.01, 0.9, wz + 0.9], [xo + s * 0.01, 2.2, wz + 0.9], [xo + s * 0.01, 2.2, wz - 0.9]], winC); Q([[xf, 2.5, wz - 1.5], [xo + s * 0.1, 2.5, wz - 1.1], [xo + s * 0.1, 2.5, wz + 1.1], [xf, 2.5, wz + 1.5]], hz(C.roof, d0)); }
          else { Q([[xw, 0.9, wz - 0.8], [xw, 0.9, wz + 0.8], [xw, 2.2, wz + 0.8], [xw, 2.2, wz - 0.8]], frC); Q([[xw + s * 0.01, 1.0, wz - 0.7], [xw + s * 0.01, 1.0, wz + 0.7], [xw + s * 0.01, 2.1, wz + 0.7], [xw + s * 0.01, 2.1, wz - 0.7]], winC); }
        }
        [mid - e.w * 0.25, mid + e.w * 0.25].forEach(wz => { Q([[xw, 3.6, wz - 0.6], [xw, 3.6, wz + 0.6], [xw, 4.9, wz + 0.6], [xw, 4.9, wz - 0.6]], frC); Q([[xw + s * 0.01, 3.7, wz - 0.52], [xw + s * 0.01, 3.7, wz + 0.52], [xw + s * 0.01, 4.8, wz + 0.52], [xw + s * 0.01, 4.8, wz - 0.52]], winC); });
        if (X.s.tod === 'dusk' && ((i * 7 + e.col) % 3 === 0)) Q([[xw + s * 0.02, 3.75, mid - e.w * 0.25 - 0.45], [xw + s * 0.02, 3.75, mid - e.w * 0.25 + 0.45], [xw + s * 0.02, 4.75, mid - e.w * 0.25 + 0.45], [xw + s * 0.02, 4.75, mid - e.w * 0.25 - 0.45]], C.winLit);
      }
    },
    wall(g, e, X) {
      const { C, Q, hz, camZ } = X, x = e.side < 0 ? WALL_L : WALL_R, d0 = Math.max(1, e.z0 - camZ), col = hz(e.hedge ? C.hedge : C.wall, d0);
      Q([[x, 0, e.z0], [x, 0, e.z1], [x, e.h, e.z1], [x, e.h, e.z0]], col);
      Q([[x, e.h, e.z0], [x, e.h, e.z1], [x - e.side * 0.35, e.h, e.z1], [x - e.side * 0.35, e.h, e.z0]], hz(e.hedge ? C.hedgeLit : mix(C.wall, '#FFFFFF', 0.15), d0));
    },
    railings(g, e, X) {
      const { C, P3, hz, camZ, k } = X, x = WALL_L;
      g.strokeStyle = hz('#1A1E1E', 10); g.lineWidth = Math.max(0.6, 1.2 * k);
      const top = [], bot = []; for (let z = Math.max(e.z0, camZ + 1.5); z < Math.min(e.z1, camZ + 140); z += 0.32) { const a = P3(x, 0, z), b = P3(x, 1.2, z); if (a[2] < 0.4) continue; g.globalAlpha = 1 - hazeOf(z - camZ); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); top.push(b); }
      g.globalAlpha = 1; g.lineWidth = Math.max(1, 2 * k); g.beginPath(); top.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
    },
    lamp(g, e, X) {
      const { C, P3, hz, cam, camZ } = X, a = P3(e.x, 0, e.z), b = P3(e.x, 5.8, e.z), c2 = P3(e.x - e.side * 0.9, 5.8, e.z); if (a[2] < 0.4) return;
      const d = e.z - camZ; g.strokeStyle = hz(C.post, d); g.lineCap = 'butt'; g.lineWidth = Math.max(1, cam.k(e.z - camZ) * 0.13);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c2[0], c2[1]); g.stroke();
      g.fillStyle = hz(C.post, d); g.beginPath(); g.ellipse(c2[0], c2[1], Math.max(1, cam.k(d) * 0.3), Math.max(1, cam.k(d) * 0.1), 0, 0, TAU); g.fill();
      if (X.s.tod === 'dusk') { g.fillStyle = '#FFD9A0'; g.beginPath(); g.ellipse(c2[0], c2[1] + cam.k(d) * 0.08, Math.max(1, cam.k(d) * 0.22), Math.max(0.6, cam.k(d) * 0.06), 0, 0, TAU); g.fill(); (X.lamps = X.lamps || []).push([c2[0], c2[1], cam.k(d)]); }
    },
    tree(g, e, X) {
      const { C, P3, hz, cam, camZ } = X, d = e.z - camZ, c = P3(e.x, e.h, e.z), b = P3(e.x, 0, e.z); if (c[2] < 0.4) return;
      const kk = cam.k(d), col = hz(e.park ? mix(C.tree, '#000000', 0.08) : C.tree, d), lit = hz(C.treeLit, d);
      g.fillStyle = hz(C.trunk, d); g.fillRect(b[0] - kk * 0.14, c[1], kk * 0.28, b[1] - c[1]);
      const R = OTM.rng('tr' + e.seed), pts = []; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, rr = e.r * (0.8 + 0.35 * OTM.vnoise(Math.cos(a) * 2 + e.seed, Math.sin(a) * 2, 3)); pts.push([c[0] + Math.cos(a) * rr * kk, c[1] - e.r * 0.2 * kk + Math.sin(a) * rr * kk * 0.85]); }
      const p = LC.pathPts(pts); g.fillStyle = col; g.fill(p);
      g.save(); g.clip(p); g.fillStyle = lit; g.beginPath(); g.ellipse(c[0] - e.r * 0.35 * kk, c[1] - e.r * 0.55 * kk, e.r * 0.8 * kk, e.r * 0.55 * kk, 0, 0, TAU); g.fill(); g.restore();
    },
    signal(g, e, X) {
      const { P3, cam, camZ, s, t } = X, d = e.z - camZ; const a = P3(e.x, 0, e.z), top = P3(e.x, e.small ? 2.6 : 3.3, e.z); if (a[2] < 0.4) return;
      const kk = cam.k(d); g.strokeStyle = '#3A3E40'; g.lineWidth = Math.max(1.2, kk * 0.12); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(top[0], top[1]); g.stroke();
      // the head: a black box on a backing board with its white border, three lenses (red at the top)
      const hc = P3(e.x, (e.small ? 2.2 : 2.75), e.z - 0.05), bw = 0.52 * kk, bh = 1.2 * kk;
      g.fillStyle = '#E8E6DE'; g.fillRect(hc[0] - bw / 2 - kk * 0.03, hc[1] - bh / 2 - kk * 0.03, bw + kk * 0.06, bh + kk * 0.06);
      g.fillStyle = '#121416'; g.fillRect(hc[0] - bw / 2, hc[1] - bh / 2, bw, bh);
      const st = s.signal || 'red', on = { red: [1, 0, 0], redamber: [1, 1, 0], green: [0, 0, 1], amber: [0, 1, 0], off: [0, 0, 0] }[st] || [1, 0, 0];
      const cols = [['#3A0C0C', '#FF4A3A'], ['#3A2A0C', '#FFB43A'], ['#0C2A1A', '#5AE89A']];
      for (let i = 0; i < 3; i++) { const y = hc[1] - bh * 0.32 + i * bh * 0.32, r = kk * 0.11; g.fillStyle = on[i] ? cols[i][1] : cols[i][0]; g.beginPath(); g.arc(hc[0], y, r, 0, TAU); g.fill(); if (on[i]) { g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(hc[0] - r * 0.25, y - r * 0.25, r * 0.4, 0, TAU); g.fill(); (X.glows = X.glows || []).push([hc[0], y, r, cols[i][1]]); } }
      // the hood over each lens
      g.fillStyle = '#0A0B0C'; for (let i = 0; i < 3; i++) { const y = hc[1] - bh * 0.32 + i * bh * 0.32 - kk * 0.13; g.fillRect(hc[0] - kk * 0.13, y - kk * 0.015, kk * 0.26, kk * 0.035); }
    },
    beacon(g, e, X) {
      const { P3, cam, camZ, t } = X, d = e.z - camZ, a = P3(e.x, 0, e.z), b = P3(e.x, 2.5, e.z); if (a[2] < 0.4) return;
      const kk = cam.k(d), n = 8; for (let i = 0; i < n; i++) { const y0 = a[1] + (b[1] - a[1]) * i / n, y1 = a[1] + (b[1] - a[1]) * (i + 1) / n; g.fillStyle = i % 2 ? '#141414' : '#E8E6DE'; g.fillRect(a[0] - kk * 0.05, y1, kk * 0.1, y0 - y1 + 0.5); }
      const on = (Math.floor(t * 1.9) % 2) === 0, r = kk * 0.17; g.fillStyle = on ? '#FFB43A' : '#9A6A2A'; g.beginPath(); g.arc(b[0], b[1] - r * 0.6, r, 0, TAU); g.fill();
      if (on) { g.fillStyle = 'rgba(255,240,200,0.7)'; g.beginPath(); g.arc(b[0] - r * 0.3, b[1] - r, r * 0.4, 0, TAU); g.fill(); (X.glows = X.glows || []).push([b[0], b[1] - r * 0.6, r * 1.2, '#FFB43A']); }
    },
    shelter(g, e, X) {
      const { P3, hz, C, camZ } = X, d = e.z - camZ, x0 = e.x, x1 = e.x - 1.3; const pts = [[x0, 0, e.z], [x0, 0, e.z + 3.5], [x0, 2.4, e.z + 3.5], [x0, 2.4, e.z]];
      const sp = pts.map(q => P3(q[0], q[1], q[2])); if (sp.some(q => q[2] < 0.4)) return; g.fillStyle = rgba(hz('#B8C4C2', d), 0.35); g.fill(polyPath(sp));
      X.Q([[x0, 2.4, e.z], [x0, 2.4, e.z + 3.5], [x1, 2.55, e.z + 3.5], [x1, 2.55, e.z]], hz('#2A2E30', d));
    },
    // a row of house fronts facing us across the cross road
    frontage(g, e, X) {
      const { C, Q, hz, camZ } = X, d0 = Math.max(1, e.z - camZ), R = OTM.rng('fr' + e.seed); let x = e.x0;
      while (x < e.x1) { const w = 6 + R() * 3, ht = 5.6 + R() * 0.8, col = hz(C.brick[R() * 4 | 0], d0), x2 = Math.min(e.x1, x + w);
        Q([[x, 0, e.z], [x2, 0, e.z], [x2, ht, e.z], [x, ht, e.z]], col);
        Q([[x - 0.3, ht - 0.1, e.z - 0.3], [x2 + 0.3, ht - 0.1, e.z - 0.3], [x2 + 0.3, ht + 2.6, e.z + 4], [x - 0.3, ht + 2.6, e.z + 4]], hz(C.roof, d0));
        for (const u of [0.25, 0.7]) { const xa = lerp(x, x2, u) - 0.6; Q([[xa, 3.6, e.z - 0.02], [xa + 1.2, 3.6, e.z - 0.02], [xa + 1.2, 4.9, e.z - 0.02], [xa, 4.9, e.z - 0.02]], hz(C.frame, d0)); Q([[xa + 0.08, 3.68, e.z - 0.03], [xa + 1.12, 3.68, e.z - 0.03], [xa + 1.12, 4.82, e.z - 0.03], [xa + 0.08, 4.82, e.z - 0.03]], hz(C.win, d0)); }
        x = x2 + 0.2; }
    },
    // the bakery: a two-storey shop facing us across the junction. Warm light inside the glass; in the glass, the street behind
    // us and our own car coming, mirrored across the window's plane (SETS.car.exterior, faded)
    bakery(g, e, X) {
      const { C, Q, hz, camZ, cam, s, P3 } = X, z = e.z, d0 = Math.max(1, z - camZ), x0 = e.x0, x1 = e.x1, ht = e.ht;
      if (!Q([[x0, 0, z], [x1, 0, z], [x1, ht, z], [x0, ht, z]], hz('#8E6652', d0))) return;
      Q([[x0 - 0.3, ht - 0.1, z - 0.3], [x1 + 0.3, ht - 0.1, z - 0.3], [x1 + 0.3, ht + 2.4, z + 4], [x0 - 0.3, ht + 2.4, z + 4]], hz(C.roof, d0));
      const F = (xa, xb, ya, yb, col, dz) => Q([[xa, ya, z - (dz || 0.02)], [xb, ya, z - (dz || 0.02)], [xb, yb, z - (dz || 0.02)], [xa, yb, z - (dz || 0.02)]], col);
      F(x0 + 0.3, x1 - 0.3, 3.05, 3.65, hz('#E8DFC8', d0));                                   // the fascia
      const fx = (x0 + x1) / 2; for (let i = -5; i <= 5; i++) F(fx + i * 0.42 - 0.12, fx + i * 0.42 + 0.12, 3.18, 3.5, hz('#6A3E26', d0), 0.03);   // its painted name, soft at this distance
      F(x0 + 0.2, x1 - 0.2, 2.55, 3.0, hz('#B9895A', d0), 0.25);                              // the awning, rolled up
      for (let i = 0; i < 9; i++) F(x0 + 0.2 + i * (x1 - x0 - 0.4) / 9, x0 + 0.2 + (i + 0.5) * (x1 - x0 - 0.4) / 9, 2.55, 3.0, hz('#E8DCC4', d0), 0.26);
      // the shopfront: the door at the left, the big window
      F(x0 + 0.9, x0 + 2.0, 0, 2.45, hz('#2A3A3C', d0));
      const wx0 = x0 + 2.4, wx1 = x1 - 0.8, wy0 = 0.55, wy1 = 2.45;
      const win = F(wx0, wx1, wy0, wy1, hz('#3A2A20', d0));
      F(wx0 - 0.1, wx1 + 0.1, 0.25, wy0, hz('#4A3628', d0));
      for (const u of [0.33, 0.66]) F(lerp(wx0, wx1, u) - 0.05, lerp(wx0, wx1, u) + 0.05, wy0, wy1, hz('#E6E0D0', d0), 0.03);
      for (const u of [0.18, 0.5, 0.82]) { const xa = lerp(x0, x1, u) - 0.65; F(xa, xa + 1.3, 4.0, 5.4, hz(C.frame, d0)); F(xa + 0.08, xa + 1.22, 4.08, 5.32, hz(C.win, d0), 0.03); }
      if (!win) return;
      const bb = win.reduce((b, q) => ({ x0: Math.min(b.x0, q[0]), x1: Math.max(b.x1, q[0]), y0: Math.min(b.y0, q[1]), y1: Math.max(b.y1, q[1]) }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
      g.save(); g.clip(polyPath(win));
      // inside: warm, dim; shelves and the counter's glass
      g.fillStyle = hz('#5A3A22', d0); g.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
      g.fillStyle = rgba('#E8B070', 0.35); for (let i = 0; i < 3; i++) g.fillRect(bb.x0, bb.y0 + (bb.y1 - bb.y0) * (0.18 + i * 0.22), bb.x1 - bb.x0, Math.max(1, (bb.y1 - bb.y0) * 0.035));
      g.fillStyle = rgba('#C88A50', 0.5); for (let i = 0; i < 14; i++) { const u = (i + 0.5) / 14; g.beginPath(); g.ellipse(lerp(bb.x0, bb.x1, u), bb.y0 + (bb.y1 - bb.y0) * (0.15 + 0.22 * (i % 3)), (bb.x1 - bb.x0) * 0.02, (bb.y1 - bb.y0) * 0.035, 0, 0, TAU); g.fill(); }
      // the glass gives back the bright street behind us (screen), and our car, mirrored across the window's plane
      g.globalCompositeOperation = 'screen'; g.fillStyle = LC.lin(g, 0, bb.y0, 0, bb.y1, [[0, C.sky[2], 0.6], [0.5, C.haze, 0.42], [0.62, C.haze, 0.18], [1, C.road, 0.12]]); g.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
      g.globalCompositeOperation = 'source-over';
      const car = CAR(); if (car) { const cxw = (X.camX || 0) - 0.37, czw = camZ + 0.25, mz = 2 * z - czw; car.exterior(g, { cam, at: [cxw, 0, mz], heading: Math.PI - (X.yaw || 0), tod: s.tod || 'morning', alpha: 0.62, shadow: false, rim: 0, interior: false, reflect: 'sky' }); }
      g.restore();
      LC.glare(g, polyPath(win), { x: (bb.x0 + bb.x1) / 2, y: bb.y0, angle: -0.9, color: '#FFFFFF', bands: [{ d: 0, w: (bb.x1 - bb.x0) * 0.16, a: 0.1 }, { d: (bb.x1 - bb.x0) * 0.18, w: (bb.x1 - bb.x0) * 0.03, a: 0.12 }] });
    },
    vehicle(g, e, X) { drawVehicle(g, e, X); },
  };
  const hazeOf = d => clamp((d - 8) / 150, 0, 0.82);
  // traffic that moves: the cars ahead keep their distance (creeping closer as s.traffic grows); the oncoming lane flows past, cycling
  function movingZ(e, s, t, camZ) {
    if (e.moving > 0) return camZ + e.z - (s.traffic || 0);
    return camZ + 6 + ((((e.z - 1.2 * (s.travel || 0) - 7 * t) % 150) + 150) % 150);
  }

  // ---- other traffic: plain boxy shapes (never Daniel's car), their glass a mirror of the light ----
  function drawVehicle(g, e, X) {
    const { P3, hz, C, camZ, cam, s, t } = X;
    let z = e.moving ? movingZ(e, s, t, camZ) : e.z, x = e.x;
    if (e.nudge) x += 0.9 * clamp(s.vanEdge || 0, 0, 1);
    const d = Math.hypot(x, z - camZ); if (z - camZ < 1.2 || d > 200) return;
    const van = e.kind === 'van', L2 = van ? 2.7 : 2.1, Wd = van ? 1.0 : 0.88, Hb = van ? 2.45 : 0.95, Hc = van ? 2.45 : 1.45;
    const ch = Math.cos(e.heading), sh = Math.sin(e.heading); const T = (px, py, pz) => P3(x + px * ch + pz * sh, py, z - px * sh + pz * ch);
    const col = van ? '#DCDAD2' : CARCOL[e.col % CARCOL.length];
    const lit = C === PAL.evening ? 0.18 : C === PAL.dusk ? 0.05 : 0.1;
    const faces = [];
    const add = (pts, kind, n) => { const sp = pts.map(q => T(q[0], q[1], q[2])); if (sp.some(q => q[2] < 0.4)) return; if (area(sp) >= 0) return; faces.push({ sp, kind, n, d: sp.reduce((a, q) => a + q[2], 0) / sp.length }); };
    // body box (y 0.25..Hb), cabin (car only), windscreen and back glass sloped; van: a tall box with a sloped cab front
    const b0 = 0.28;
    add([[-Wd, b0, -L2], [Wd, b0, -L2], [Wd, Hb, -L2], [-Wd, Hb, -L2]], 'back', [0, 0, -1]);
    add([[Wd, b0, L2], [-Wd, b0, L2], [-Wd, Hb * (van ? 0.48 : 1), L2], [Wd, Hb * (van ? 0.48 : 1), L2]], 'front', [0, 0, 1]);
    add([[Wd, b0, -L2], [Wd, b0, L2], [Wd, Hb * (van ? 0.48 : 1), L2], [Wd, Hb, van ? L2 - 0.9 : L2], [Wd, Hb, -L2]], 'side', [1, 0, 0]);
    add([[-Wd, b0, L2], [-Wd, b0, -L2], [-Wd, Hb, -L2], [-Wd, Hb, van ? L2 - 0.9 : L2], [-Wd, Hb * (van ? 0.48 : 1), L2]], 'side', [-1, 0, 0]);
    if (van) { add([[Wd, Hb * 0.48, L2], [-Wd, Hb * 0.48, L2], [-Wd * 0.95, Hb, L2 - 0.9], [Wd * 0.95, Hb, L2 - 0.9]], 'screen', [0, 0.6, 0.8]); add([[-Wd, Hb, -L2], [Wd, Hb, -L2], [Wd * 0.95, Hb, L2 - 0.9], [-Wd * 0.95, Hb, L2 - 0.9]], 'top', [0, 1, 0]); }
    else {
      add([[-Wd, Hb, -L2], [Wd, Hb, -L2], [Wd, Hb, -L2 + 0.5], [-Wd, Hb, -L2 + 0.5]], 'top', [0, 1, 0]);
      add([[-Wd, Hb, L2], [-Wd, Hb, L2 - 0.9], [Wd, Hb, L2 - 0.9], [Wd, Hb, L2]], 'top', [0, 1, 0]);
      const cw = Wd * 0.8;
      add([[-Wd, Hb, -L2 + 0.5], [Wd, Hb, -L2 + 0.5], [cw, Hc, -L2 + 1.1], [-cw, Hc, -L2 + 1.1]], 'rearglass', [0, 0.6, -0.8]);
      add([[Wd, Hb, L2 - 0.9], [-Wd, Hb, L2 - 0.9], [-cw, Hc, L2 - 1.7], [cw, Hc, L2 - 1.7]], 'screen', [0, 0.6, 0.8]);
      add([[-cw, Hc, -L2 + 1.1], [cw, Hc, -L2 + 1.1], [cw, Hc, L2 - 1.7], [-cw, Hc, L2 - 1.7]], 'top', [0, 1, 0]);
      add([[Wd, Hb, -L2 + 0.5], [Wd, Hb, L2 - 0.9], [cw, Hc, L2 - 1.7], [cw, Hc, -L2 + 1.1]], 'sideglass', [1, 0.3, 0]);
      add([[-Wd, Hb, L2 - 0.9], [-Wd, Hb, -L2 + 0.5], [-cw, Hc, -L2 + 1.1], [-cw, Hc, L2 - 1.7]], 'sideglass', [-1, 0.3, 0]);
    }
    // wheels, under the body
    [[Wd - 0.05, L2 - 0.7], [Wd - 0.05, -L2 + 0.7], [-Wd + 0.05, L2 - 0.7], [-Wd + 0.05, -L2 + 0.7]].forEach(([wx, wz]) => { const c = T(wx * 1.02, 0.31, wz), kk = cam.k(Math.max(1, c[2] / 1)); if (c[2] < 0.4) return; g.fillStyle = '#0E1112'; g.beginPath(); g.ellipse(c[0], c[1], Math.max(1, cam.f * 0.31 / c[2] * 0.55), Math.max(1, cam.f * 0.31 / c[2]), 0, 0, TAU); g.fill(); });
    const glass = C === PAL.evening ? 'copper' : C === PAL.dusk ? 'dusk' : 'sky';
    faces.sort((a, b) => b.d - a.d).forEach(f => {
      const p = polyPath(f.sp);
      if (f.kind === 'screen' || f.kind === 'rearglass' || f.kind === 'sideglass') {
        const bb = f.sp.reduce((b, q) => ({ x0: Math.min(b.x0, q[0]), x1: Math.max(b.x1, q[0]), y0: Math.min(b.y0, q[1]), y1: Math.max(b.y1, q[1]) }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
        if (e.glare && f.kind === 'screen') {   // the van's windscreen: a sheet of glare, rings of it, nothing behind
          g.fillStyle = '#FFF8EC'; g.fill(p); g.save(); g.clip(p); [[0.9, '#FFFFFF'], [0.55, '#FFFDF6']].forEach(([r, c2]) => { g.fillStyle = c2; g.beginPath(); g.ellipse((bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2, (bb.x1 - bb.x0) * r, (bb.y1 - bb.y0) * r, 0, 0, TAU); g.fill(); }); g.restore();
          (X.glows = X.glows || []).push([(bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2, Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.7, '#FFFFFF']); return;
        }
        const cols = glass === 'copper' ? ['#F6B070', '#D98A50', '#5A3A30'] : glass === 'dusk' ? ['#4A4A58', '#8A6A62', '#1E1C22'] : [C.sky[1], C.sky[0], '#3A4446'];
        g.fillStyle = LC.lin(g, 0, bb.y0, 0, bb.y1, [[0, hz(cols[0], d)], [0.6, hz(cols[1], d)], [1, hz(cols[2], d)]]); g.fill(p);
        // evening: glass that faces the low sun behind us (rear windows ahead, windscreens coming) is a copper mirror with a hot core
        if (glass === 'copper' && f.n[2] < -0.3 === (e.heading === 0) || (glass === 'copper' && f.kind !== 'sideglass')) { g.save(); g.clip(p); g.fillStyle = '#F8B878'; g.fill(p); g.fillStyle = '#FFD8A8'; g.beginPath(); g.ellipse((bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) * 0.5, (bb.x1 - bb.x0) * 0.42, (bb.y1 - bb.y0) * 0.6, 0, 0, TAU); g.fill(); g.fillStyle = '#FFF0D8'; g.beginPath(); g.ellipse((bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) * 0.5, (bb.x1 - bb.x0) * 0.18, (bb.y1 - bb.y0) * 0.3, 0, 0, TAU); g.fill(); g.restore();
          (X.glows = X.glows || []).push([(bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2, Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.35, '#F6B070']); }
        else if (glass === 'copper') { g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(255,214,160,0.35)'; g.fill(p); g.restore(); }
        return;
      }
      let c2 = col; const up = f.n[1];
      if (f.kind === 'top') c2 = mix(col, C.sky[1], 0.35); else if (f.kind === 'side') c2 = mix(col, '#000000', 0.32); else if (f.kind === 'back' || f.kind === 'front') c2 = mix(col, '#000000', 0.18);
      if (C === PAL.evening) c2 = mix(c2, '#2A1A16', 0.55); if (C === PAL.dusk) c2 = mix(c2, '#0E1014', 0.7);
      g.fillStyle = hz(c2, d); g.fill(p);
      if (f.kind === 'back') { // tail lights, the plate
        const q = f.sp, mxp = (a, b2, u) => [lerp(a[0], b2[0], u), lerp(a[1], b2[1], u)];
        const bl = q[0], br = q[1], tr = q[2], tl = q[3]; const at = (u, v) => { const bt = mxp(bl, br, u), tp = mxp(tl, tr, u); return mxp(bt, tp, v); };
        g.fillStyle = s.brakes || e.moving ? (s.brakes ? '#FF4A3A' : '#8A1A16') : '#5A1414'; [[0.04, 0.2], [0.8, 0.96]].forEach(([u0, u1]) => g.fill(polyPath([at(u0, 0.62), at(u1, 0.62), at(u1, 0.78), at(u0, 0.78)])));
        g.fillStyle = '#D8B840'; g.fill(polyPath([at(0.38, 0.3), at(0.62, 0.3), at(0.62, 0.42), at(0.38, 0.42)]));
        if (s.brakes) [[0.12], [0.88]].forEach(([u]) => { const c3 = at(u, 0.7); (X.glows = X.glows || []).push([c3[0], c3[1], Math.max(3, (br[0] - bl[0]) * 0.12), '#FF4A3A']); });
      }
      if (f.kind === 'front') { const q = f.sp, mxp = (a, b2, u) => [lerp(a[0], b2[0], u), lerp(a[1], b2[1], u)]; const at = (u, v) => mxp(mxp(q[0], q[1], u), mxp(q[3], q[2], u), v);
        g.fillStyle = e.lights ? '#FFF2D8' : '#9AA4A6'; [[0.05, 0.25], [0.75, 0.95]].forEach(([u0, u1]) => g.fill(polyPath([at(u0, 0.6), at(u1, 0.6), at(u1, 0.82), at(u0, 0.82)])));
        if (e.lights) [[0.15], [0.85]].forEach(([u]) => { const c3 = at(u, 0.7); (X.glows = X.glows || []).push([c3[0], c3[1], Math.max(4, Math.abs(q[1][0] - q[0][0]) * 0.18), '#FFF2D8']); });
      }
    });
    if (C !== PAL.morning) { // the low sun rims the tops
      const tops = faces.filter(f => f.kind === 'top'); g.strokeStyle = rgba(C.rim, 0.7); g.lineWidth = 1.2 * (X.k || 1); tops.forEach(f => { const q = f.sp.slice().sort((a, b) => a[1] - b[1]); g.beginPath(); g.moveTo(q[0][0], q[0][1]); g.lineTo(q[1][0], q[1][1]); g.stroke(); });
    }
  }

  // =================================================================================================================
  // 4. THE COCKPIT FOR DRIVING SHOTS: the driver's eye looking down the road. Headliner and frit above, the right A-pillar,
  //    the dashboard and the top of the wheel below (the bottom band stays dark for subtitles), and the rear-view mirror
  //    up and left of centre, showing only the road behind.
  // =================================================================================================================
  const CK = { frit: 112, dash: 812, mirror: { tl: [340, 128], tr: [900, 112], br: [904, 300], bl: [344, 300] }, ball: [640, 96] };
  const WIN = (() => { const p = new Path2D(); p.moveTo(30, 60); p.lineTo(1800, 60); p.bezierCurveTo(1840, 300, 1876, 560, 1898, CK.dash); p.lineTo(0, CK.dash); p.closePath(); return p; })();
  function cockpitGlass(g, C, tod) {
    // the glass: the dashboard ghosted in its lower edge, the sun's glare, dust and fine scratches lit by it, the frit
    g.save(); g.clip(WIN); g.globalCompositeOperation = 'screen';
    g.fillStyle = LC.lin(g, 0, CK.dash - 170, 0, CK.dash, [[0, '#D9D2C2', 0], [1, '#D9D2C2', 0.2 * C.glow]]); g.fillRect(0, CK.dash - 170, W, 170);
    for (let x = 300; x < 1200; x += 28) { g.fillStyle = 'rgba(20,20,20,0.16)'; g.fillRect(x, CK.dash - 40, 11, 28); }
    g.restore();
    const S = C.sun || [1280, 760]; const near = { x: clamp(S[0], 0, W), y: clamp(S[1], CK.frit, CK.dash), r: tod === 'dusk' ? 400 : tod === 'evening' ? 900 : 620 };
    if (tod === 'evening') { g.save(); g.clip(WIN); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.lin(g, 0, CK.dash - 300, 0, CK.dash, [[0, '#E4894A', 0], [0.6, '#E4894A', 0.16], [1, '#F6B070', 0.38]]); g.fillRect(0, CK.dash - 300, W, 300); g.restore(); }
    LC.glare(g, WIN, { x: S[0], y: S[1], angle: tod === 'evening' ? 0.12 : -0.9, color: C.rim, bands: [{ d: -120, w: 220, a: 0.05 * C.glow }, { d: 40, w: 26, a: 0.07 * C.glow }, { d: 360, w: 300, a: 0.035 * C.glow }] });
    LC.specks(g, WIN, { x: 0, y: CK.frit, w: W, h: CK.dash - CK.frit }, 'roadDust' + tod, { n: 1100, color: tod === 'dusk' ? '#E8C0A0' : '#FFF3DA', rMin: 0.5, rMax: 1.5, aMin: 0.06 * C.glow, aMax: 0.45 * C.glow, scratch: 0.12, near });
    // wiper arcs, only where the light finds them
    { const pv = [700, 1300]; g.save(); g.clip(WIN); g.globalCompositeOperation = 'screen'; g.lineCap = 'round';
      for (let i = 0; i < 46; i++) { const r = 820 + i * 10; for (let a = -Math.PI * 0.86; a < -Math.PI * 0.30; a += 0.012) { const x = pv[0] + Math.cos(a) * r, y = pv[1] + Math.sin(a) * r; const dd = Math.hypot(x - near.x, y - near.y); const al = Math.max(0, 1 - dd / 520) * (0.04 + 0.05 * OTM.vnoise(i * 3.1, a * 9, 4)) * C.glow; if (al < 0.004) continue; g.strokeStyle = rgba(C.rim, al); g.lineWidth = 1.1; g.beginPath(); g.arc(pv[0], pv[1], r, a, a + 0.014); g.stroke(); } }
      g.restore(); }
    // the sun in the glass (morning low ahead-left; evening low ahead, copper; at dusk it has gone below the roofs)
    if (C.sun) {
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, S[0], S[1], 0, 460, [[0, '#FFFFFF', 0.9], [0.1, P.sunWhite, 0.8], [0.3, tod === 'evening' ? '#F6B070' : P.sunCream, 0.35], [0.65, tod === 'evening' ? '#E4894A' : P.honey, 0.1], [1, P.honey, 0]]); g.fillRect(S[0] - 460, S[1] - 460, 920, 920);
      [[300, 0.05], [190, 0.07], [110, 0.1]].forEach(([r, a]) => { g.fillStyle = rgba(tod === 'evening' ? '#FFD39A' : P.sunWhite, a); g.beginPath(); g.arc(S[0], S[1], r, 0, TAU); g.fill(); });
      g.restore(); g.fillStyle = tod === 'evening' ? '#FFE6C0' : P.sunWhite; g.beginPath(); g.arc(S[0], S[1], 30, 0, TAU); g.fill();
      // a broad veil of the sun's glare over everything beyond the glass: the morning's warm white windscreen
      g.save(); g.clip(WIN); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, S[0], S[1], 0, 1500, [[0, tod === 'evening' ? '#F6B070' : '#FFF4E0', 0.3 * C.glow], [0.45, tod === 'evening' ? '#E4894A' : '#F6E8CC', 0.12 * C.glow], [1, '#F6E8CC', 0]]); g.fillRect(0, 0, W, H); g.restore();
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.lin(g, S[0] - 900, 0, S[0] + 900, 0, [[0, C.rim, 0], [0.5, C.rim, 0.35], [1, C.rim, 0]]); g.fillRect(S[0] - 900, S[1] - 2, 1800, 4); g.restore();
    }
    // the frit band across the top, its dot-matrix edge, a patch round the mirror's mount
    const FB = CK.frit; g.fillStyle = '#060808'; g.fillRect(0, 0, W, FB);
    for (let row = 0; row < 6; row++) { const y = FB + 5 + row * 10, r = 4.0 * (1 - row / 6.2); for (let x = (row % 2) * 5; x < W; x += 10) { const dd = Math.hypot(x - S[0], y - S[1]); const k = dd < 60 ? 0.4 + 0.6 * dd / 60 : 1; g.fillStyle = k < 1 ? rgba('#2E2620', 0.4 + 0.6 * k) : '#060808'; g.beginPath(); g.arc(x, y, r * k, 0, TAU); g.fill(); } }
  }
  function cockpitFrame(g, C, tod) {
    const POVC = (CAR() && CAR().lib.POV[tod]) || null, hd = POVC ? POVC.head : ['#4A4842', '#5E5B53'], pil = POVC ? POVC.pillar : ['#3E3C37', '#2C2B27', '#1E1D1A'], dsh = POVC ? POVC.dash : ['#2A2A27', '#1A1B19', '#0E0F0E'], rim = C.rim;
    // headliner and the visor's edge
    g.fillStyle = LC.lin(g, 0, 0, 0, 62, [[0, mix(hd[0], '#000000', 0.25)], [1, hd[1]]]); g.fillRect(0, 0, W, 60);
    g.fillStyle = mix(hd[1], '#000000', 0.35); g.fillRect(0, 58, W, 3);
    // right A-pillar (the driver's side), the left one a sliver
    { const ap = new Path2D(); ap.moveTo(1790, 0); ap.lineTo(W, 0); ap.lineTo(W, 900); ap.lineTo(1898, CK.dash); ap.bezierCurveTo(1876, 560, 1840, 300, 1800, 60); ap.closePath();
      g.fillStyle = LC.lin(g, 1790, 0, W, 0, [[0, pil[0]], [0.5, pil[1]], [1, pil[2]]]); g.fill(ap);
      g.strokeStyle = '#0B0C0B'; g.lineWidth = 6; g.beginPath(); g.moveTo(1800, 60); g.bezierCurveTo(1840, 300, 1876, 560, 1898, CK.dash); g.stroke();
      g.strokeStyle = rgba(rim, 0.22); g.lineWidth = 2; g.beginPath(); g.moveTo(1810, 70); g.bezierCurveTo(1850, 300, 1884, 560, 1906, CK.dash); g.stroke();
      const lp = new Path2D(); lp.moveTo(0, 60); lp.lineTo(32, 60); lp.bezierCurveTo(20, 300, 10, 600, 0, 760); lp.closePath(); g.fillStyle = pil[1]; g.fill(lp); }
    // the dashboard: its dark top, the defroster slots, the binnacle hood on the right, the top of the wheel
    g.fillStyle = LC.lin(g, 0, CK.dash, 0, H, [[0, dsh[0]], [0.22, dsh[1]], [1, dsh[2]]]); g.fillRect(0, CK.dash, W, H - CK.dash);
    g.fillStyle = rgba(rim, 0.13); g.fillRect(0, CK.dash, W, 3);
    for (let x = 300; x < 1200; x += 28) { g.fillStyle = '#0A0B0A'; g.fillRect(x, CK.dash + 14, 11, 20); g.fillStyle = rgba(rim, 0.08); g.fillRect(x, CK.dash + 12, 11, 2); }
    const bn = LC.smooth([[1240, H + 10], [1270, CK.dash + 34], [1390, CK.dash - 6], [1540, CK.dash - 20], [1690, CK.dash - 6], [1800, CK.dash + 34], [1830, H + 10]]);
    g.fillStyle = '#111211'; g.fill(bn); g.strokeStyle = rgba(rim, 0.14); g.lineWidth = 2.5; g.stroke(bn);
    // the wheel's rim across the bottom right, leather in its own shade, a rim of light along its top
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
    g.strokeStyle = '#0B0C0C'; g.lineWidth = 56; g.beginPath(); g.ellipse(1540, 1230, 430, 300, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    g.strokeStyle = rgba(rim, 0.16); g.lineWidth = 2.5; g.beginPath(); g.ellipse(1540, 1230, 456, 326, 0, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
    g.restore();
  }
  // the mirror for driving shots: smaller than C2's, its glass holding only the road behind
  function cockpitMirror(c, s, C) {
    const g = c.g, car = CAR(); if (!car) return;
    const Q = CK.mirror, L = car.lib, glassP = L.lozenge(Q, 0), housing = L.lozenge(Q, 7), housingB = L.lozenge(Q, 8);
    g.fillStyle = '#0D0F10'; g.fill(LC.rquad([[590, 56], [690, 56], [682, 104], [598, 104]], 8));
    g.fillStyle = '#121516'; g.beginPath(); g.arc(CK.ball[0], CK.ball[1] + 14, 11, 0, TAU); g.fill(); g.fillRect(CK.ball[0] - 9, CK.ball[1] + 10, 18, 24);
    g.save(); g.translate(0, 9); g.fillStyle = '#0B0D0E'; g.fill(housingB); g.restore();
    g.fillStyle = '#1B1F21'; g.fill(housing);
    g.save(); g.clip(housing); g.strokeStyle = rgba(C.rim, 0.55); g.lineWidth = 3; g.translate(-1, -2.5); g.stroke(housing); g.restore();
    g.save(); g.clip(glassP);
    const bx = 330, by = 100, bw = 590, bh = 215;
    const rb = s.travel != null && s.mirrorMoves !== false;
    const key = 'roads:mirror:' + (s.tod || 'morning');
    if (rb) { const ms = 0.6, mg = scratch('roads:mirror', Math.ceil(bw * ms), Math.ceil(bh * ms)); mg.fillStyle = '#101414'; mg.fillRect(0, 0, bw, bh); L.roadBehind(mg, 0, 0, bw * ms, bh * ms, { tod: s.tod || 'morning', travel: s.travel || 0 }); g.drawImage(mg.canvas, bx, by, bw, bh); }
    else g.drawImage(c.cache(key, gg => { gg.fillStyle = '#101414'; gg.fillRect(bx, by, bw, bh); L.roadBehind(gg, bx, by, bw, bh, { tod: s.tod || 'morning', travel: 0 }); }), 0, 0);
    // the rear window's frame inside the mirror, the cabin's dark round it
    g.strokeStyle = 'rgba(14,18,18,0.9)'; g.lineWidth = 18; g.stroke(L.lozenge(Q, -2));
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(200,214,210,1)'; g.fillRect(bx, by, bw, bh); g.globalCompositeOperation = 'source-over';
    LC.glare(g, null, { x: 500, y: 200, angle: -0.5, color: '#FFFFFF', bands: [{ d: -20, w: 40, a: 0.04 }, { d: 22, w: 8, a: 0.05 }] });
    g.strokeStyle = 'rgba(255,248,232,0.45)'; g.lineWidth = 1.6; g.stroke(glassP);
    g.restore();
    if (s.tod === 'evening') { c.em.fillStyle = '#FFD39A'; c.em.globalAlpha = 0.9; c.em.beginPath(); c.em.arc(bx + bw * 0.56, by + bh * 0.42, 34, 0, TAU); c.em.fill(); c.em.globalAlpha = 0.4; c.em.beginPath(); c.em.arc(bx + bw * 0.56, by + bh * 0.42, 90, 0, TAU); c.em.fill(); c.em.globalAlpha = 1; }
  }
  const LAYER = { scale: 0.4 };
  function windscreenView(defaultBeat, defaultTod) {
    return {
      // s: { tod, beat, travel (m), signal ('red'|'redamber'|'green'|'amber'), vanEdge 0..1, brakes, traffic, yaw, shake }
      back(c, t, s) {
        s = Object.assign({ tod: defaultTod, beat: defaultBeat, t }, s || {}); const tod = s.tod, C = PAL[tod] || PAL.morning, g = c.g;
        // the world beyond the glass, at half resolution (soft), then laid in
        const lay = scratch('roads:lay', W * LAYER.scale, H * LAYER.scale); lay.setTransform(1, 0, 0, 1, 0, 0);
        const X = street(lay, s, { scale: LAYER.scale });
        let src = lay.canvas; if (s.focus) { const soft = scratch('roads:soft', W * LAYER.scale, H * LAYER.scale); soft.filter = 'blur(' + s.focus + 'px)'; soft.drawImage(lay.canvas, 0, 0); soft.filter = 'none'; src = soft.canvas; }
        g.drawImage(src, 0, 0, W, H);
        // heat over the road: the far tarmac shimmers (evening)
        if (tod === 'evening') CAR() && CAR().shimmer(g, { x: 0, y: X.hzY / LAYER.scale - 50, w: W, h: 120 }, t, { amp: 2.2, rise: 0.8 });
        // lamps that glow beyond the glass bloom in the lens
        (X.glows || []).forEach(([x, y, r, col]) => { const k = 1 / LAYER.scale; c.em.fillStyle = col; c.em.globalAlpha = 0.9; c.em.beginPath(); c.em.arc(x * k, y * k, Math.max(4, r * k * 2.2), 0, TAU); c.em.fill(); c.em.globalAlpha = 1;
          // a red (or amber) light also lies on the windscreen itself: a soft bloom in the glass's dust
          const R = Math.min(140, r * k * 5); g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, x * k, y * k, 0, R, [[0, col, 0.3], [0.35, col, 0.12], [1, col, 0]]); g.fillRect(x * k - R, y * k - R, R * 2, R * 2); g.restore(); });
        (X.lamps || []).forEach(([x, y, kk]) => { const k = 1 / LAYER.scale; c.em.fillStyle = '#FFD9A0'; c.em.globalAlpha = 0.6; c.em.beginPath(); c.em.arc(x * k, y * k, Math.max(3, kk * k * 0.5), 0, TAU); c.em.fill(); c.em.globalAlpha = 1; });

        if (C.sun) { const S = C.sun; c.em.fillStyle = tod === 'evening' ? '#FFD39A' : P.sunWhite; c.em.beginPath(); c.em.arc(S[0], S[1], 70, 0, TAU); c.em.fill(); c.em.globalAlpha = 0.5; c.em.beginPath(); c.em.arc(S[0], S[1], 200, 0, TAU); c.em.fill(); c.em.globalAlpha = 1; }
        g.drawImage(c.cache('roads:cockpit:' + tod, gg => { cockpitGlass(gg, C, tod); cockpitFrame(gg, C, tod); }), 0, 0);
        cockpitMirror(c, s, C);
      },
      // in a windscreen shot the pane is beyond the hands: nothing physical comes in front of them
      front(c, t, s) { },
      anchors: { mirror: CK.mirror, wheel: [1540, 1000], horizon: 446, vanishing: [960, 446] },
      light: PAL[defaultTod].sun ? { x: PAL[defaultTod].sun[0], y: PAL[defaultTod].sun[1], color: PAL[defaultTod].rim } : { x: 620, y: 200, color: PAL[defaultTod].rim, note: 'the sun is behind: in the mirror' },
    };
  }
  const _scr = {};
  function scratch(name, w, h) { let c = _scr[name]; if (!c || c.width !== w || c.height !== h) { c = _scr[name] = OTM.makeCanvas(w, h); } const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h); return g; }

  // =================================================================================================================
  // 4b. THE PASS: what slides past the passenger window (car.views.passenger draws the frame; this draws the outside).
  //     scene 'street' (the default) or 'wall': the nursery's painted wall at walking distance, at 20 mph a smear of colour
  //     bands (A030). The same animals, in the same order and colours, as SETS.nursery's mural (seen in focus at dusk, Q11).
  // =================================================================================================================
  const MURAL_FALLBACK = {
    LEN: 32, EAVES: 2.9, PANEL: [0.5, 2.42], PLINTH: 0.42,
    C: { brick: '#8C4A36', brickDark: '#6E3828', panel: '#E8DFCC', edge: '#3A4F78', roof: '#4C4648', fascia: '#E6E2D8', plinth: '#4E3A34', frame: '#E6E4DE', glass: '#9FB0B6', ply: '#C9A26E' },
    // [kind, u (m along the wall), colour, secondary colour]
    ITEMS: [['lion', 1.75, '#E07A3C', '#A8452A'], ['window', 4.3], ['hippo', 7.0, '#8B6BB0', '#74579A'], ['elephant', 9.85, '#4F80C2', '#3C6AA8'], ['entrance', 12.8], ['giraffe', 15.05, '#DB8A45', '#8E4E26'],
      ['flamingo', 17.15, '#E58397', '#C9667A'], ['window', 19.7], ['whale', 23.4, '#2C78A4', '#A8CCE0'], ['zebra', 27.0, '#F0EBDF', '#2A2C34'], ['snail', 30.2, '#E06E5C', '#9FB4C6']],
  };
  function muralStrip(tod) {
    const key = 'mural:' + tod; if (_mur[key]) return _mur[key];
    const pxm = 110, M = MURAL_FALLBACK, w = Math.ceil(M.LEN * pxm), h = Math.ceil(3.6 * pxm), raw = OTM.makeCanvas(w, h), g = raw.getContext('2d'), Y = y => h - y * pxm, X = u => u * pxm, C = M.C;
    const N = window.SETS && SETS.nursery;
    if (N && N.mural && N.mural.paintRaw) { N.mural.paintRaw(g, 0, M.LEN, pxm); }          // the nursery's own painter, if it publishes one
    else {
      g.fillStyle = C.roof; g.fillRect(0, Y(3.6), w, 0.7 * pxm); g.fillStyle = C.fascia; g.fillRect(0, Y(M.EAVES + 0.22), w, 0.2 * pxm);
      g.fillStyle = C.brick; g.fillRect(0, Y(M.EAVES), w, M.EAVES * pxm);
      g.fillStyle = C.brickDark; for (let y = 0.075; y < M.EAVES; y += 0.15) g.fillRect(0, Y(y), w, 1.2);
      g.fillStyle = C.plinth; g.fillRect(0, Y(M.PLINTH), w, M.PLINTH * pxm);
      g.fillStyle = C.panel; g.fillRect(X(0.4), Y(M.PANEL[1]), X(M.LEN - 0.8), (M.PANEL[1] - M.PANEL[0]) * pxm);
      g.fillStyle = C.edge; g.fillRect(X(0.4), Y(M.PANEL[1]), X(M.LEN - 0.8), 0.035 * pxm); g.fillRect(X(0.4), Y(M.PANEL[0] + 0.035), X(M.LEN - 0.8), 0.035 * pxm);
      const el = (u, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(X(u), Y(y), rx * pxm, ry * pxm, 0, 0, TAU); g.fill(); };
      M.ITEMS.forEach(([kind, u, c1, c2]) => {
        const b = M.PANEL[0] + 0.05;
        if (kind === 'window') { g.fillStyle = C.frame; g.fillRect(X(u - 1.2), Y(2.3), 2.4 * pxm, 1.42 * pxm); g.fillStyle = C.glass; g.fillRect(X(u - 1.12), Y(2.22), 2.24 * pxm, 1.26 * pxm); return; }
        if (kind === 'entrance') { g.fillStyle = '#3C4146'; g.fillRect(X(u - 1.0), Y(2.2), 2.0 * pxm, 2.2 * pxm); g.fillStyle = C.ply; g.fillRect(X(u - 0.75), Y(2.0), 0.85 * pxm, 1.7 * pxm); return; }
        if (kind === 'lion') { el(u, b + 0.75, 0.55, 0.42, c2); el(u, b + 0.72, 0.36, 0.3, c1); el(u - 0.5, b + 0.45, 0.45, 0.3, c1); }
        if (kind === 'hippo') { el(u, b + 0.5, 0.75, 0.42, c1); el(u + 0.7, b + 0.62, 0.36, 0.3, c2); }
        if (kind === 'elephant') { el(u, b + 0.7, 0.75, 0.55, c1); el(u + 0.75, b + 0.95, 0.38, 0.34, c2); g.fillStyle = c1; g.fillRect(X(u + 0.95), Y(b + 0.9), 0.14 * pxm, 0.75 * pxm); }
        if (kind === 'giraffe') { el(u, b + 0.65, 0.5, 0.3, c1); g.fillStyle = c1; g.fillRect(X(u + 0.25), Y(b + 1.75), 0.16 * pxm, 1.1 * pxm); el(u + 0.4, b + 1.75, 0.22, 0.14, c1); [[-0.2, 0.7], [0.15, 0.6], [0.3, 1.2]].forEach(([dx, dy]) => el(u + dx, b + dy, 0.08, 0.07, c2)); }
        if (kind === 'flamingo') { el(u, b + 1.0, 0.36, 0.26, c1); g.fillStyle = c2; g.fillRect(X(u), Y(b + 0.8), 0.04 * pxm, 0.8 * pxm); g.fillStyle = c1; g.fillRect(X(u + 0.25), Y(b + 1.6), 0.07 * pxm, 0.6 * pxm); }
        if (kind === 'whale') { el(u, b + 0.7, 1.0, 0.45, c1); el(u, b + 0.55, 0.8, 0.22, c2); }
        if (kind === 'zebra') { el(u, b + 0.7, 0.62, 0.36, c1); g.fillStyle = c2; for (let k = -3; k <= 3; k++) g.fillRect(X(u + k * 0.15), Y(b + 1.0), 0.06 * pxm, 0.6 * pxm); }
        if (kind === 'snail') { el(u, b + 0.55, 0.42, 0.42, c1); el(u - 0.25, b + 0.2, 0.55, 0.12, c2); }
      });
    }
    // drained a little as the wall lies in its own shade this morning (north face), then smeared by the speed
    const sh = OTM.makeCanvas(w, h), sg = sh.getContext('2d'); sg.drawImage(raw, 0, 0); sg.globalCompositeOperation = 'multiply'; sg.fillStyle = tod === 'morning' ? '#D9DEE2' : tod === 'evening' ? '#B8A49C' : '#8A8494'; sg.fillRect(0, 0, w, h);
    // the speed smears it along the street (an average of many offset copies over a metre), and the focus is on the glass
    const sm = OTM.makeCanvas(w, h), smg = sm.getContext('2d'), n = 40, spread = 1.0 * pxm;
    for (let i = 0; i < n; i++) { smg.globalAlpha = 1 / (i + 1); const dx = -spread / 2 + spread * i / (n - 1); smg.drawImage(sh, dx, 0); smg.drawImage(sh, dx + w, 0); smg.drawImage(sh, dx - w, 0); }
    const blur = OTM.makeCanvas(w, h), bg = blur.getContext('2d'); bg.filter = 'blur(3px)'; bg.drawImage(sm, 0, 0); bg.filter = 'none';
    return (_mur[key] = { cv: blur, pxm, w, h });
  }
  const _mur = {};
  function pass(g, box, s) {
    const tod = s.tod || 'morning', C = PAL[tod] || PAL.morning, travel = s.travel || 0;
    if ((s.scene || 'street') === 'street') { const car = CAR(); if (car && car.lib.streetStrip) car.lib.streetStrip(g, box, travel, tod, { pxm: 110, farH: 0.95 }); return; }
    // the wall, at about 3.5 m: its painted panel fills the glass; the nursery's low roof and the sky above, the pavement below
    const M = muralStrip(tod), k = (s.scale || 230) / M.pxm, eye = 1.15, cy = box.y + box.h * 0.48;
    g.fillStyle = LC.lin(g, 0, box.y, 0, box.y + box.h, [[0, C.sky[0]], [1, C.sky[2]]]); g.fillRect(box.x, box.y, box.w, box.h);
    const yTop = cy - (3.6 - eye) * M.pxm * k, uoff = ((travel % MURAL_FALLBACK.LEN) + MURAL_FALLBACK.LEN) % MURAL_FALLBACK.LEN;
    const xs = box.x - uoff * M.pxm * k, wk = M.w * k; for (let x = xs; x < box.x + box.w; x += wk) g.drawImage(M.cv, x, yTop, wk, M.h * k);
    // the pavement and the kerb, a fast grey band at the foot of the glass; a lamp post flicks past now and then
    const yPave = cy + eye * M.pxm * k; g.fillStyle = mix(C.pave, C.haze, 0.2); g.fillRect(box.x, yPave, box.w, box.y + box.h - yPave);
    const lp = ((travel * 0.9) % 6) / 6; if (lp < 0.25) { const x = box.x + box.w * (1 - lp * 4) ; g.fillStyle = 'rgba(40,44,44,0.6)'; g.fillRect(x - 40, box.y, 80, box.h); }
  }
  const views = {
    windscreen: windscreenView('plain', 'morning'),
    evening: windscreenView('evening', 'evening'),
    dusk: windscreenView('dusk', 'dusk'),
    // the passenger window with the nursery's wall slipping past (car.views.passenger's frame and mirror, this outside)
    passenger: {
      back(c, t, s) { const v = CAR() && CAR().views.passenger; if (v) v.back(c, t, Object.assign({ scene: 'wall' }, s || {}, { outside: (g, box, s2) => pass(g, box, Object.assign({ scene: 'wall' }, s2)) })); },
      front(c, t, s) { const v = CAR() && CAR().views.passenger; if (v) v.front(c, t, s); },
      anchors: { window: { x: 60, y: 120, w: 1800, h: 615 } },
      light: { x: 900, y: 120, color: '#FFF6E6' },
    },
  };

  // =================================================================================================================
  // 5. DEMOS
  // =================================================================================================================
  const D = (name, v, s) => ({ name, draw(c, t) { const S = Object.assign({}, typeof s === 'function' ? s(t) : s); v.back(c, t, S); v.front(c, t, S); } });
  const demos = [
    D('windscreen: the bakery across the junction (its window gives the car back)', views.windscreen, t => ({ beat: 'bakery', travel: 6 + t * 4 })),
    D('windscreen: the bakery, turning left past it', views.windscreen, t => ({ beat: 'bakery', travel: 24 + t * 2 })),
    D('windscreen: the first lights, red on the glass', views.windscreen, t => ({ beat: 'lights1', travel: 19, signal: 'red' })),
    D('windscreen: the second lights, changing', views.windscreen, t => ({ beat: 'lights2', travel: 8, signal: 'redamber' })),
    D('windscreen: the crossing near the park', views.windscreen, t => ({ beat: 'crossing', travel: 6 + t * 3 })),
    D('windscreen: the same impatient van, its windscreen a sheet of glare', views.windscreen, t => ({ beat: 'van', travel: 6 + t * 2, vanEdge: 0.4 })),
    D('windscreen: a plain stretch, moving', views.windscreen, t => ({ beat: 'plain', travel: 30 + t * 9 })),
    D('passenger: the nursery\'s painted wall slipping past, out of focus (A030)', views.passenger, t => ({ travel: 6 + t * 9 })),
    D('passenger: the wall, a moment later', views.passenger, t => ({ travel: 14 + t * 9 })),
    D('evening: traffic through copper heat', views.evening, t => ({ travel: 20 + t * 4, brakes: true })),
    D('dusk: the drive to the nursery', views.dusk, t => ({ travel: 40 + t * 10 })),
  ];

  window.SETS = window.SETS || {};
  SETS.roads = { views, demos, street, pass, beats: BEATS, pal: PAL, mural: MURAL_FALLBACK, lib: { drawVehicle, cockpitGlass, cockpitFrame, cockpitMirror, scratch, muralStrip } };
})();
