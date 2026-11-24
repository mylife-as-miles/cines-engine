/* LONG DISTANCE · Q11 ARE YOU THERE? (72 s) · S12 (A062–A069), L024–L027, title
   The ending answers the opening: the phone back in the empty half, beside his face, where a head would be (B1 by day, turned).
   The black glass shows his own face; touched, the waterfall blooms back. The app is a portrait, not a call: nothing dials, nothing
   rings. "Yes." comes at once, with no room behind it. The last real thing in the film is the strip's grain; then black, the title.
   Shots: 0 the black glass (his face in it) · 6 he touches it; the waterfall blooms back; he taps the banner · 11 INSERT the app ·
   19 the couch (he sits, the phone to his ear; L024–L027) · 31.5 the couch, close (he lies down; the phone on the cushion by his
   face) · 44 the room (the strip on the fridge; the daylight going blue) · 58 black · 60 the title · 67 fade out. */
(function () {
  'use strict';
  const { W, H } = OTM; const seg = FILM.seg, key = FILM.key, twos = FILM.twos, E = FILM.ease, clamp = FILM.clamp, lerp = FILM.lerp;
  const LV = () => SETS.living.views;
  const CALL = () => ({ banner: { text: PHONE.MSG.callMeTonight, in: 1 } });
  const push = (c, px, py, z) => c.camera({ x: px + (W / 2 - px) / z, y: py + (H / 2 - py) / z, zoom: z });
  const mixHex = (a, b, u) => OTM.mix(a, b, u);
  // the daylight going blue, as one number across the cuts (0 grey day .. 1 dusk); quantised for the sculptures' light
  const BLUE = t => key(t, [[19, 0], [32, 0.3], [44, 0.62], [58, 1]]);
  function blueLight(L0day, L0dusk, b, o) {
    o = o || {}; const q = Math.round(b * 4) / 4;            // four steps of light on the faces (a reshade each, not a sculpt)
    const dir = L0day.dir, k = lerp(L0day.k, L0dusk.k, q);
    return RIG.light(q >= 0.5 ? 'dusk' : 'day', Object.assign({ keys: [{ dir, col: mixHex(L0day.color, L0dusk.color, q), k, poster: L0day.poster, levels: L0day.levels }], amb: mixHex(L0day.amb, L0dusk.amb, q), paper: { from: o.from || [0.82, -0.55] } }, o.rig || {}));
  }

  // ------------------------------------------------------------------ 0–19: the phone in his hand, looking down at it
  // what he looks down past: the boards, his socks, the hem of his sweater; soft (the lens is on the glass)
  function floorPlate(c) {
    return c.cache('Q11|floor', (g, cv) => {
      const S = OTM.S; g.fillStyle = '#5E544A'; g.fillRect(0, 0, W, H);
      for (let i = -2; i < 14; i++) { const y = i * 104 + 10; GG.piece(g, S().poly([[-60, y], [2000, y + 40], [2000, y + 140], [-60, y + 100]]), { fill: i % 2 ? '#6E5F50' : '#685A4C', rough: 1, seed: 1100 + i, tex: 0.55, kind: 'card', lift: [0, 4], liftAlpha: 0.35 }); }
      // the window's grey light lies across the boards from the right
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(190,196,196,0.12)'; g.fill(S().poly([[1300, -100], [2100, -100], [2100, 1200], [900, 1200]]).path(3, 1120)); g.restore();
      // his socks, far below
      [[640, 900, -0.2], [1010, 930, 0.15]].forEach(([x, y, r], i) => { const sh = GG.blob([[x - 90, y - 130], [x + 70, y - 140], [x + 110, y + 90], [x + 20, y + 200], [x - 110, y + 120]]); const p = GG.piece(g, sh, { fill: '#57534F', rough: 1.6, seed: 1121 + i, tex: 0.7, kind: 'wool', lift: [6, 10], liftAlpha: 0.5, liftBlur: 12 }); GG.crescent(g, p, -8, -8, '#7A746C', 0.8); });
      // the hem of his sweater across the top
      const hem = GG.blob([[-80, -80], [2000, -80], [2000, 90], [1400, 130], [700, 120], [-80, 150]]);
      const hp = GG.piece(g, hem, { fill: '#45403C', rough: 1.6, seed: 1125, tex: 0.75, kind: 'wool', lift: [0, 12], liftAlpha: 0.55, liftBlur: 16 }); GG.crescent(g, hp, 0, 10, '#2C2826', 0.8);
      const tmp = OTM.makeCanvas(W, H), tg = tmp.getContext('2d'); tg.filter = 'blur(9px)'; tg.drawImage(cv, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(tmp, 0, 0);
    });
  }
  // his face in the dead glass, as the glass would show it: him looking down into it, the ceiling and the pendant behind him
  function reflection(c) {
    return c.cache('Q11|reflection', (g, cv) => {
      const S = OTM.S; g.fillStyle = '#6C6E6C'; g.fillRect(0, 0, 540, 1170);
      GG.piece(g, S().poly([[-20, -20], [560, -20], [560, 300], [-20, 360]]), { fill: '#8A8C88', rough: 1, seed: 1130, tex: 0.4, kind: 'paper' });
      // the pendant over the counter, upside down in the glass
      GG.piece(g, S().poly([[330, 120], [470, 120], [430, 210], [370, 210]]), { fill: '#3E3E3E', rough: 0.6, seed: 1131, tex: 0.4 });
      g.fillStyle = '#4A4A48'; g.fillRect(398, -20, 4, 140);
      // his shoulders and his face looking down at us
      const sw = GG.blob([[20, 1170], [40, 900], [150, 820], [270, 800], [390, 820], [500, 900], [520, 1170]]);
      GG.piece(g, sw, { fill: '#3D3936', rough: 1.4, seed: 1132, tex: 0.6, kind: 'wool' });
      const L = RIG.light('day', { keys: [{ dir: [0.5, -0.6, 0.62], col: '#D8DCE0', k: 0.7, poster: [0.15, 0.5], levels: [0.6, 1] }], amb: '#4A4A50' });
      RIG.head(c, 'him', { x: 270, y: 560, s: 380, yaw: 0.04, pitch: -0.12, lids: 0.38, gaze: [0, 0.35], light: L, target: g, shadow: false, neck: 0.55 });
    }, 540, 1170);
  }
  function phoneInHand(c, lt, o) {
    const tt = twos(lt);
    push(c, 960, 540, 1 + (o.z || 0));
    c.g.drawImage(floorPlate(c), 0, 0);
    const P = { x: 950, y: 500 + (o.dy || 0), h: o.h || 640, roll: -0.05, pitch: 0.1, screen: o.screen, state: o.state, env: '#BCC2C4', sheen: o.screen === 'black' ? 0.09 : 0.05, t: o.t };
    const info = PHONE.where(P, c);
    PHONE.glow(c, { info, k: 0.55, r: 1150 });
    if (o.noHand) { PHONE.draw(c, P); return info; }
    const L = RIG.light('day', { keys: [{ dir: [0.55, -0.45, 0.7], col: '#E6EBEE', k: 0.55, poster: [0.12, 0.5], levels: [0.62, 1] }], phone: [P.x, P.y], phoneCol: info.light.k > 0.05 ? '#C8EEF2' : '#FFC5A0', phoneK: 0.25 * Math.min(1, info.light.k) });
    const hp = { x: P.x + 150, y: P.y + 0.5 * P.h + 60, s: P.h * 1.2, light: L, rot: 0.14, reach: o.reach || 0, tap: o.tap || 0, flip: true };
    RIG.hand(c, 'him', 'thumb', hp);
    PHONE.draw(c, P);
    RIG.hand(c, 'him', 'thumb', Object.assign({}, hp, { only: 'thumb', target: 'gl' }));
    return info;
  }
  // 0–6: black glass; his own face in it
  function blackGlass(c, st, lt) {
    phoneInHand(c, lt, { screen: 'black', state: { reflection: reflection(c), amount: 0.3 }, z: 0.03 * E.inOutSine(seg(lt, 0, 6)) });
  }
  // 6–11: he touches it; the waterfall blooms back (6.0–6.8); the banner, never dismissed; he taps it (10.5)
  function bloom(c, st, lt) {
    const tt = twos(lt);
    const wake = seg(lt, 6.08, 6.8);
    const reach = key(tt, [[5.9, 0], [6.05, 0.12], [6.4, 0.05], [9.8, 0.05], [10.35, 0.82], [10.9, 0.78]]);
    const tap = (tt >= 6.0 && tt < 6.17) || (tt >= 10.5 && tt < 10.67) ? 1 : 0;
    phoneInHand(c, lt, { screen: wake < 1 ? 'wake' : 'lock', state: wake < 1 ? Object.assign({ p: wake }, CALL()) : CALL(), z: 0.03 + 0.02 * E.inOutSine(seg(lt, 6, 11)), reach, tap });
  }
  // 11–19: INSERT. Not a phone call. An app. Her face, the long hair, a thin line that breathes, waiting. Nothing dials or rings
  function app(c, st, lt) {
    phoneInHand(c, lt, { screen: 'app', state: {}, h: 940, dy: 40, z: 0.04 * E.inOutSine(seg(lt, 11, 19)), noHand: true, t: lt });
  }

  // ------------------------------------------------------------------ 19–31.5: the couch. He sits, and puts the phone to his ear
  const LEG = { home: '#2E3440', sock: '#5E5A56' };
  function sitOps(p) {
    // RIG's 'sit', rebuilt so the arm can bring the phone up from his lap to his ear (lift 0..1)
    const lift = clamp(p.lift || 0, 0, 1), e = lift < 0.5 ? 2 * lift * lift : 1 - 2 * (1 - lift) * (1 - lift);
    const seat = { type: 'paper', key: 'q11sitlegs', box: [-1.2, 2.8, 2.4, 6.0], breath: 0, draw(pen) {
      [-1, 1].forEach((sg, i) => { const H0 = [sg * 0.3 + 0.1, 3.25], K = [sg * 0.35 + 1.1, 3.55], A = [sg * 0.3 + 1.05, 5.3];
        const lp = RIG.limbPts(H0, K, A, 0.72, 0.5, 0.4); const sp = pen.piece(pen.blob(lp.pts), pen.col(i ? LEG.home : OTM.mix(LEG.home, '#000000', 0.12)), { seed: 610 + i, tex: 0.55, lift: [0.02, 0.03] }); pen.shade(sp, LEG.home, { lit: 0.05, core: 0.07 });
        const ft = pen.blob([[A[0] - 0.2, A[1] - 0.05], [A[0] + 0.2, A[1] - 0.05], [A[0] + 0.42, A[1] + 0.2, 1], [A[0] - 0.22, A[1] + 0.2, 1]]); const fp = pen.piece(ft, pen.col(LEG.sock), { seed: 612 + i, tex: 0.6, lift: [0.015, 0.02] }); pen.shade(fp, LEG.sock, { lit: 0.03, core: 0.03 }); });
    } };
    const E0 = [-0.72, 2.3], W0 = [-0.05, 2.95], E1 = [-0.66, 1.95], W1 = [-0.55, 0.62];
    const atEar = e > 0.55;
    const armL = { E: [lerp(E0[0], E1[0], e), lerp(E0[1], E1[1], e)], W: [lerp(W0[0], W1[0], e), lerp(W0[1], W1[1], e)], hand: atEar ? 'ear' : 'thumb', hp: atEar ? { over: 'all' } : { reach: 0.1, over: 'thumb' }, front: true };
    const r = RIG.person({ who: 'him', costume: 'sweater', tau: 0.35, lean: 0.15, crop: 3.3, head: p.face,
      arms: { L: armL, R: { E: [0.85, 2.35], W: [0.75, 3.1], hand: 'relax', hp: { flip: true } } }, legs: false, extra: { afterTorso: [seat] } });
    return { ops: r.ops, atEar, earAt: [-0.43, 0.2], lapAt: [W0[0] + 0.1, W0[1] - 0.25], e };
  }
  function couch(c, st, lt) {
    const V = LV().couch, sh = V.shots.main, A = sh.anchors; const tt = twos(lt); const b = BLUE(lt);
    const s0 = { tod: 'day', blue: b };
    V.back(c, lt, s0);
    const s = 0.23 * A.seatL[2];
    // he has just sat down: the cushion takes him (19.0–19.7); the phone comes up to his ear (20.6–23.2)
    const settle = (1 - E.outCubic(seg(tt, 19.0, 19.7))) * 0.09 * s;
    const lift = seg(tt, 20.6, 23.2);
    const mH = RIG.mouthFor('L024', lt - 25.5) || RIG.mouthFor('L026', lt - 28.4);
    // he listens; on "Yes." his eyes close a moment; "I love you" with his eyes down; "I love you too" lands and he lets his eyes shut
    const face = { yaw: 0.28, pitch: lerp(0.32, 0.18, E.inOutSine(seg(tt, 21, 23))), lids: key(tt, [[19, 0.42], [24.8, 0.42], [26.5, 0.24], [27.6, 0.36], [29.8, 0.36], [31.0, 0.08]]), gaze: [0.05, 0.45], mouth: mH, smile: key(tt, [[28.2, 0], [28.6, 0.12], [29.6, 0.12], [30.6, 0.2]]) };
    // 31.5: he begins to lie down (the cut to the close is on this action, at 32.2)
    const lean = E.inQuad(seg(tt, 31.5, 32.2));
    const fx = A.seatL[0] + 30 + lean * 0.9 * s, fy = A.seatL[1] - 3.2 * s + settle + lean * 1.1 * s;
    const built = sitOps({ lift, face });
    const fig = { x: fx, y: fy, s };
    const toW = u => [fx + u[0] * s, fy + u[1] * s];
    const ph = built.atEar ? toW(built.earAt) : toW([lerp(built.lapAt[0], -0.5, built.e * 1.6), lerp(built.lapAt[1], 0.8, built.e * 1.6)]);
    const L = blueLight(sh.lights.day, sh.lights.dusk, b, { rig: { phone: ph, phoneCol: '#FFC5A0', phoneK: 0.55, phoneZ: 0.3 } });
    const out = RIG.drawFigure(c, { who: 'him', x: fx, y: fy, s, rot: Math.round(lean * 0.55 / 0.04) * 0.04, light: L, breath: RIG.breath(lt, 3), ops: built.ops });
    // the phone: in his hand, the portrait lit, then at his ear (its back to us; its light on his cheek)
    const hand = out.hands.L;
    if (hand) {
      const P = built.atEar ? { x: hand.grip[0], y: hand.grip[1], h: 0.7 * s, yaw: Math.PI - 0.5, roll: -0.35, screen: 'app', t: lt, env: '#9AA4B4', spill: 0.6 }
        : { x: hand.grip[0], y: hand.grip[1] - 0.1 * s, h: 0.7 * s, roll: hand.rot * -1, pitch: 0.6, screen: 'app', t: lt, env: '#9AA4B4' };
      PHONE.glow(c, { info: PHONE.where(P, c), k: 0.45 });
      PHONE.draw(c, P); out.over(c);
    }
    V.front(c, lt, s0);
  }

  // ------------------------------------------------------------------ him lying along the couch (31.5–58)
  // RIG's 'lie' mirrored (B1 by day, turned): his head on the middle cushion just left of the seam, his body running left into his
  // half, knees drawn up so he fits the couch, his face to us. Rebuilt here so the near arm can bring the phone down from his face
  // to the cushion beyond the seam and leave his hand beside it.
  const LIE = { rot: 1.42, sx: 0.74 };
  function lieFrame(x, y, s) {
    const cr = Math.cos(LIE.rot), sr = Math.sin(LIE.rot);
    return {
      toW: u => { const fx = -u[0] * s * LIE.sx, fy = u[1] * s; return [x + fx * cr - fy * sr, y + fx * sr + fy * cr]; },
      toF: w => { const dx = w[0] - x, dy = w[1] - y; const fx = dx * cr + dy * sr, fy = -dx * sr + dy * cr; return [-fx / (s * LIE.sx), fy / s]; },
    };
  }
  // the reaching arm is the one on the camera's side (screen-left in figure space), so it comes from below his face, never across it
  function lieOps(o) {
    const legs = { joints: { far: [[0.3, 3.3], [-1.25, 3.95], [-0.95, 5.35]], near: [[-0.2, 3.3], [-1.6, 4.15], [-1.3, 5.5]] } };
    const armL = Object.assign({ front: true, order: 2 }, o.arm);
    return RIG.person({ who: 'him', costume: 'sweater', tau: 0.2, lean: 0, head: o.face,
      arms: { L: armL, R: { E: [0.45, 2.0], W: [0.35, 2.9], hand: false, behind: true } }, legs: o.legs === false ? false : legs }).ops;
  }
  function drawLying(c, x, y, s, L, lt, face, arm, legs, sx, rot) {
    return RIG.drawFigure(c, { who: 'him', x, y, s, flip: true, rot: rot || LIE.rot, sx: sx || LIE.sx, light: L, breath: RIG.breath(lt, 2.2), ops: lieOps({ face, arm, legs }) });
  }

  // ------------------------------------------------------------------ 32.2–44: B1 by day, turned. The phone where a head would be
  // He has lain down (the cut is on the action). He holds the phone a moment in front of his face, then lays it face up on the cushion
  // beside his face, across the seam, and leaves his hand by it. Its smooth light on his face. His eyes close.
  function close(c, st, lt) {
    const V = LV().couch, sh = V.shots.close, A = sh.anchors; const tt = twos(lt); const b = BLUE(lt);
    const s0 = { tod: 'day', blue: b, shot: 'close' };
    push(c, 960, 820, 1 + 0.03 * E.inOutSine(seg(lt, 32.2, 51.5)));
    V.back(c, lt, s0);
    const hd = [A.couchSeam[0] - 150, A.couchHead[1] - 20], s = 0.23 * A.couchHead[2];
    // the last of the lying down: the head settles onto the cushion (32.2–33.0)
    const settle = (1 - E.outCubic(seg(tt, 32.2, 33.0))) * 34;
    const F = lieFrame(hd[0] + settle * 0.4, hd[1] - settle, s);
    const rest = [A.couchSeam[0] + 70, A.couchSeam[1] - 20];             // where the phone comes to rest: across the seam, by his face
    const held = [hd[0] + 40, hd[1] + 175];                              // in his hand in front of his face, the screen to him
    const down = E.inOutSine(seg(tt, 34.0, 36.4)), let_ = tt >= 36.4;
    const pc = [lerp(held[0], rest[0], down), lerp(held[1], rest[1], down) - 40 * Math.sin(Math.PI * down)];
    const P = let_ ? { x: rest[0], y: rest[1], h: 0.15 * A.phoneCushion[2], pitch: 1.0, roll: -0.12, screen: 'app', t: lt, env: '#9AA4B4', shadow: { alpha: 0.4 } }
      : { x: pc[0], y: pc[1], h: 0.15 * A.phoneCushion[2], pitch: lerp(0.15, 1.0, down), roll: lerp(-1.35, -0.12, down), yaw: lerp(-0.5, 0, down), screen: 'app', t: lt, env: '#9AA4B4' };
    const info = PHONE.where(P, c);
    PHONE.glow(c, { info, k: lerp(0.45, 0.75, down), r: s * 2.4, sy: 0.6 });
    const L = blueLight(sh.lights.day, sh.lights.dusk, b, { rig: { phone: [Math.round(lerp(held[0], rest[0] - 60, down) / 40) * 40, Math.round(lerp(held[1], rest[1] - 50, down) / 40) * 40], phoneCol: '#FFC5A0', phoneK: 1.15, phoneZ: 0.6 } });
    // the arm: the wrist under the phone while he holds it; then beside it on the cushion, the fingers at its edge
    const wristW = let_ ? [rest[0] - 0.5 * s, rest[1] + 0.32 * s] : [pc[0] - 0.42 * s, pc[1] + 0.42 * s];
    const arm = { to: F.toF(wristW), bend: -1, hand: let_ ? 'flat' : 'thumb', hp: let_ ? { close: 0.6 } : { reach: 0.1, over: 'thumb' } };
    const lids = key(tt, [[32.2, 0.34], [36.6, 0.36], [38.2, 0.2], [41.5, 0.03]]);
    const face = { yaw: -0.5, pitch: lerp(-0.12, -0.2, down), roll: 0.05, lids, smile: key(tt, [[38, 0], [41, 0.12]]), gaze: [0.25, 0.1], neck: 0.55 };
    const f = drawLying(c, hd[0] + settle * 0.4, hd[1] - settle, s, L, lt, face, arm, false);
    PHONE.draw(c, P);
    if (!let_) f.over(c);
  }
  // 31.5–32.2 in the couch main shot: after "I love you too" he closes his eyes and begins to lie down (cut on the action)
  // (drawn by couch(): see `lean`)

  // ------------------------------------------------------------------ 51.5–58: the room; then the strip on the fridge
  function room(c, st, lt) {
    const V = LV().room, sh = V.shots.wide, A = sh.anchors; const tt = twos(lt); const b = BLUE(lt);
    const s0 = { tod: 'day', blue: b, phone: 'cushion' };
    // a slow push toward the strip, behind him on the fridge: it starts, travels and lands (under 1.15, where the set stays sharp)
    push(c, A.strip[0], A.strip[1], 1 + 0.13 * E.inOutSine(seg(lt, 44.4, 52.6)));
    V.back(c, lt, s0);
    const s = 0.23 * A.couchHead[2];
    const hd = [A.couchSeam[0] - 0.47 * s * 1.1, A.couchHead[1] - 0.2 * s];
    const SX = 0.4;                                          // the room's camera is at eye level: the depth across the seat is foreshortened
    LIE.sx = SX; LIE.rot = 1.6; const F = lieFrame(hd[0], hd[1], s); LIE.sx = 0.74; LIE.rot = 1.42;
    const rest = [A.couchSeam[0] + 0.42 * s, A.couchSeam[1] - 0.35 * s];
    const P = { x: rest[0], y: rest[1], h: 0.15 * A.phoneCushion[2], pitch: 1.3, roll: -0.05, screen: 'app', t: lt, env: '#9AA4B4' };
    PHONE.glow(c, { info: PHONE.where(P, c), k: 0.8, r: 2.2 * s, sy: 0.5 });
    const L = blueLight(sh.lights.day, sh.lights.dusk, b, { rig: { phone: rest, phoneCol: '#FFC5A0', phoneK: 1.15, phoneZ: 0.6 } });
    const arm = { to: F.toF([rest[0] - 0.5 * s, rest[1] + 0.12 * s]), bend: -1, hand: 'flat', hp: { close: 0.6 } };
    drawLying(c, hd[0], hd[1], s, L, lt, { yaw: -0.5, pitch: -0.2, roll: 0.05, lids: 0.03, smile: 0.12, neck: 0.55 }, arm, undefined, SX, 1.6);
    PHONE.draw(c, P);
    V.front(c, lt, s0);
  }
  // 52.6–58: the strip. Four frames, laughing; her long hair. A slow push down to the last frame, her head tipped against his.
  function strip(c, st, lt) {
    const V = LV().fridge, A = V.shots.insert.anchors; const b = BLUE(lt);
    push(c, A.stripLast[0], A.stripLast[1], 1 + 0.16 * E.inOutSine(seg(lt, 52.6, 58.6)));
    V.back(c, lt, { tod: 'day', blue: b });
  }

  // ------------------------------------------------------------------ 58–72: cut to black; the title; fade out
  function black(c) { c.g.fillStyle = '#000'; c.g.fillRect(0, 0, W, H); }
  function title(c, st, lt) {
    black(c);
    const a = E.inOutSine(seg(lt, 60.3, 61.9)) * (1 - E.inOutSine(seg(lt, 67.0, 70.6)));
    if (a <= 0.002) return;
    const g = c.g; const type = (text, wt, size, track, y, alpha) => { g.font = `${wt} ${size}px "Libre Franklin"`; g.letterSpacing = track + 'px'; g.fillStyle = `rgba(243,236,221,${alpha})`; g.fillText(text, W / 2 + track / 2, y); };
    g.save(); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    type('LONG DISTANCE', 500, 58, 22, 538, a);
    type('A film by Osita Miles', 400, 24, 3.5, 598, 0.62 * a);
    g.letterSpacing = '0px'; g.restore();
  }

  FILM.seq({
    id: 'Q11', title: 'Are you there?', dur: 72,
    setup() { PHONE.prepare(['waterfall', 'portrait']); },
    lines: [
      { id: 'L024', at: 25.5 },     // Him: Are you there?
      { id: 'L025', at: 26.45 },    // Her (V.O., the phone): Yes.            (at once; never lip-synced)
      { id: 'L026', at: 28.4 },     // Him: I love you.
      { id: 'L027', at: 29.75 },    // Her (V.O., the phone): I love you too. (never lip-synced)
    ],
    sound(S) {
      S.bed('room_day', 0, 34, { level: -48, fo: 4, what: 'the flat after she has gone: emptier than before' });
      S.bed('room_dusk', 30, 58, { level: -48, fi: 4, fo: 0.05, what: 'the daylight going blue; after L027 the world thins to room tone' });
      S.cue('tap', 6.0, { what: 'his thumb on the glass: the screen wakes' });
      S.cue('tap', 10.5, { what: 'he taps the banner' });
      S.cue('app_open', 11.0, { level: -60, what: 'almost nothing: no dial tone, no ring. The absence of a ring is the point' });
      S.cue('couch_creak', 20.0, { what: 'he sits; the cushion takes him' });
      S.cue('breath', 33.0, { what: 'his, settling, as he lies down beside the phone' });
      S.duck(31.2, 58, 0.7);
      S.silence(58, 72);   // the cut to black is silent; the title is silent (or the score's last note: the score plan decides)
    },
    shots: [
      { at: 0, name: 'phone: black glass; his face in it', draw: blackGlass, post: { vig: 0.55 } },
      { at: 6, name: 'phone: he touches it; the waterfall blooms back; he taps the banner', draw: bloom, post: { vig: 0.55 } },
      { at: 11, name: 'INSERT: the app. Her face, the long hair, the line waiting; nothing rings', draw: app, post: { vig: 0.6, halation: 0.4 } },
      { at: 19, name: 'couch: he sits and puts the phone to his ear; L024-L027', draw: couch, post: { vig: 0.5 } },
      { at: 32.2, name: 'couch, close: B1 by day; the phone where a head would be', draw: close, post: { vig: 0.55, halation: 0.55 } },
      { at: 44, name: 'room: the couch, and the strip on the fridge behind him; the daylight going blue', draw: room, post: { vig: 0.5 } },
      { at: 52.6, name: 'fridge: the strip. Long hair. Laughing', draw: strip, post: { vig: 0.5 } },
      { at: 58, name: 'CUT TO BLACK', draw: black, post: { grain: 0, fibre: 0, halation: 0, vig: 0 } },
      { at: 60, name: 'TITLE: LONG DISTANCE', draw: title, post: { grain: 0.03, fibre: 0, halation: 0, vig: 0 } },
    ],
  });
})();
