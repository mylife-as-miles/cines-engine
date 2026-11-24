/* LONG DISTANCE · Q11 ARE YOU THERE? (72 s) · S12 (A062–A069), L024–L027, title
   The ending answers the opening: the phone back in the empty half, beside his face, where a head would be (B1 by day, turned).
   The black glass shows his own face; touched, the waterfall blooms back. The app is a portrait, not a call: nothing dials, nothing
   rings. "Yes." comes at once, with no room behind it. The last real thing in the film is the strip's grain; then black, the title.
   Shots: 0 the black glass in his hand (his face in it) · 6 he touches it; the waterfall blooms back; he taps the banner · 11 INSERT
   the app, in his hand · 19 the couch (he sits, the phone to his ear; L024–L027; he begins to lie down) · 32.6 the couch, close (he
   lays the phone on the cushion beside his face; his hand stays by it) · 44 the room (the couch, the strip on the fridge; the
   daylight going blue) · 52.6 the strip · 58 black · 60 the title · 67 fade out. */
(function () {
  'use strict';
  const { W, H } = OTM; const seg = FILM.seg, key = FILM.key, twos = FILM.twos, E = FILM.ease, clamp = FILM.clamp, lerp = FILM.lerp;
  const K = window.LD_END;
  const LV = () => SETS.living.views;
  const CALL = () => ({ banner: { text: PHONE.MSG.callMeTonight, in: 1 } });
  const push = K.push, mix = OTM.mix;
  // the daylight going blue, as one number across the cuts (0 grey day .. 1 dusk)
  const BLUE = t => key(t, [[19, 0], [32, 0.3], [44, 0.62], [58, 1]]);
  function blueLight(L0day, L0dusk, b, o) {
    o = o || {}; const q = Math.round(b * 4) / 4;            // four steps of light on the faces (a reshade each, not a sculpt)
    return RIG.light(q >= 0.5 ? 'dusk' : 'day', Object.assign({ keys: [{ dir: L0day.dir, col: mix(L0day.color, L0dusk.color, q), k: lerp(L0day.k, L0dusk.k, q), poster: L0day.poster, levels: L0day.levels }], amb: mix(L0day.amb, L0dusk.amb, q), paper: { from: o.from || [0.82, -0.55] } }, o.rig || {}));
  }

  // ------------------------------------------------------------------ 0–19: the phone in his hand, looking down at it
  function floorPlate(c) {
    return c.cache('Q11|floor', (g, cv) => {
      const S = OTM.S; g.fillStyle = '#5E544A'; g.fillRect(0, 0, W, H);
      for (let i = -2; i < 14; i++) { const y = i * 104 + 10; GG.piece(g, S().poly([[-60, y], [2000, y + 40], [2000, y + 140], [-60, y + 100]]), { fill: i % 2 ? '#6E5F50' : '#685A4C', rough: 1, seed: 1100 + i, tex: 0.55, kind: 'card', lift: [0, 4], liftAlpha: 0.35 }); }
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(190,196,196,0.12)'; g.fill(S().poly([[1300, -100], [2100, -100], [2100, 1200], [900, 1200]]).path(3, 1120)); g.restore();
      [[640, 900, -0.2], [1010, 930, 0.15]].forEach(([x, y], i) => { const sh = GG.blob([[x - 90, y - 130], [x + 70, y - 140], [x + 110, y + 90], [x + 20, y + 200], [x - 110, y + 120]]); const p = GG.piece(g, sh, { fill: '#57534F', rough: 1.6, seed: 1121 + i, tex: 0.7, kind: 'wool', lift: [6, 10], liftAlpha: 0.5, liftBlur: 12 }); GG.crescent(g, p, -8, -8, '#7A746C', 0.8); });
      const hem = GG.blob([[-80, -80], [2000, -80], [2000, 90], [1400, 130], [700, 120], [-80, 150]]);
      const hp = GG.piece(g, hem, { fill: '#45403C', rough: 1.6, seed: 1125, tex: 0.75, kind: 'wool', lift: [0, 12], liftAlpha: 0.55, liftBlur: 16 }); GG.crescent(g, hp, 0, 10, '#2C2826', 0.8);
      const tmp = OTM.makeCanvas(W, H), tg = tmp.getContext('2d'); tg.filter = 'blur(9px)'; tg.drawImage(cv, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(tmp, 0, 0);
    });
  }
  // his face in the dead glass, as the glass would show it: him looking down into it, the ceiling and the pendant behind him
  function reflection(c) {
    return c.cache('Q11|reflection', (g) => {
      const S = OTM.S; g.fillStyle = '#6C6E6C'; g.fillRect(0, 0, 540, 1170);
      GG.piece(g, S().poly([[-20, -20], [560, -20], [560, 300], [-20, 360]]), { fill: '#8A8C88', rough: 1, seed: 1130, tex: 0.4, kind: 'paper' });
      GG.piece(g, S().poly([[330, 120], [470, 120], [430, 210], [370, 210]]), { fill: '#3E3E3E', rough: 0.6, seed: 1131, tex: 0.4 });
      g.fillStyle = '#4A4A48'; g.fillRect(398, -20, 4, 140);
      GG.piece(g, GG.blob([[20, 1170], [40, 900], [150, 820], [270, 800], [390, 820], [500, 900], [520, 1170]]), { fill: '#3D3936', rough: 1.4, seed: 1132, tex: 0.6, kind: 'wool' });
      const L = RIG.light('day', { keys: [{ dir: [0.5, -0.6, 0.62], col: '#D8DCE0', k: 0.7, poster: [0.15, 0.5], levels: [0.6, 1] }], amb: '#4A4A50' });
      RIG.head(c, 'him', { x: 270, y: 560, s: 380, yaw: 0.04, pitch: -0.12, lids: 0.38, gaze: [0, 0.35], light: L, target: g, shadow: false, neck: 0.55 });
    }, 540, 1170);
  }
  // the phone in his right hand: the rig's grip, the arm up from his shoulder below the frame, the sweater's cuff at the wrist
  function phoneInHand(c, lt, o) {
    push(c, 960, 540, 1 + (o.z || 0));
    c.g.drawImage(floorPlate(c), 0, 0);
    const big = !!o.big, s = big ? 1300 : 914, at = big ? [960, 560] : [950, 500];
    const L = RIG.light('day', { keys: [{ dir: [0.55, -0.45, 0.7], col: '#E6EBEE', k: 0.55, poster: [0.12, 0.5], levels: [0.62, 1] }], paper: { from: [0.6, -0.8] }, phone: at, phoneCol: o.cool ? '#C8EEF2' : '#FFC5A0', phoneK: o.lightK == null ? 0.25 : o.lightK });
    return K.arm(c, { who: 'him', side: 'R', s, light: L, shoulder: [at[0] + 0.55 * s, at[1] + 2.35 * s], phoneAt: at, rot: 0.1, hp: { reach: o.reach || 0, tap: o.tap || 0, over: ['thumb', 'dist'] },
      phone: Object.assign({ screen: o.screen, state: o.state, env: '#BCC2C4', sheen: o.screen === 'black' ? 0.09 : 0.05, pitch: 0.08, t: lt }, o.phone || {}), glow: { k: 0.55, r: 1150 } });
  }
  // 0–6: black glass; his own face in it
  function blackGlass(c, st, lt) {
    const tt = twos(lt);
    const reach = key(tt, [[1.9, 0], [2.4, 0.3], [3.3, 0.3], [3.8, 0.05], [5.4, 0.05], [5.9, 0.15]]);
    phoneInHand(c, lt, { screen: 'black', state: { reflection: reflection(c), amount: 0.3 }, z: 0.04 * E.inOutSine(seg(lt, 0, 6)), lightK: 0, reach: Math.round(reach * 20) / 20 });
  }
  // 6–11: he touches it; the waterfall blooms back (6.0–6.8); the banner, never dismissed; his thumb goes to it, taps (10.5)
  function bloom(c, st, lt) {
    const tt = twos(lt), wake = seg(lt, 6.08, 6.8);
    const reach = key(tt, [[5.9, 0], [6.05, 0.15], [6.4, 0.05], [9.8, 0.05], [10.35, 0.75], [10.9, 0.7]]);
    const tap = (tt >= 6.0 && tt < 6.17) || (tt >= 10.5 && tt < 10.67) ? 1 : 0;
    phoneInHand(c, lt, { screen: wake < 1 ? 'wake' : 'lock', state: wake < 1 ? Object.assign({ p: wake }, CALL()) : CALL(), z: 0.03 + 0.02 * E.inOutSine(seg(lt, 6, 11)), reach: Math.round(reach * 20) / 20, tap, cool: true, lightK: 0.25 * wake });
  }
  // 11–19: INSERT. Not a phone call. An app. Her face, the long hair, a thin line that breathes, waiting. Nothing dials or rings
  function app(c, st, lt) {
    phoneInHand(c, lt, { screen: 'app', state: {}, big: true, z: 0.04 * E.inOutSine(seg(lt, 11, 19)), reach: 0.05 });
  }

  // ------------------------------------------------------------------ 19–32.6: the couch. He sits, the phone to his ear; then lies down
  const SITR = { E: [0.82, 2.3], W: [0.7, 3.05], hand: 'relax', hp: { close: 0.4 } };
  const LAP = { E: [-0.75, 2.25], W: [-0.1, 2.85] }, EAR = { E: [-0.66, 1.95], W: [-0.55, 0.62] };
  function couchMain(c, st, lt) {
    const V = LV().couch, sh = V.shots.main; const tt = twos(lt); const b = BLUE(lt);
    const s0 = { tod: 'day', blue: b };
    V.back(c, lt, s0);
    const s = 0.23 * sh.anchors.seatL[2];
    const hip = V.project([3.5, 0.44, 3.45], 'main'), fit = V.project([3.2, 0.6, 3.5], 'main')[0];
    const mH = Math.min(2, RIG.mouthFor('L024', lt - 25.5) || RIG.mouthFor('L026', lt - 28.4));
    const lids = key(tt, [[19, 0.42], [24.8, 0.42], [26.5, 0.24], [27.6, 0.36], [29.8, 0.36], [31.0, 0.1]]);
    const L = blueLight(sh.lights.day, sh.lights.dusk, b, { rig: { phone: [hip[0] + 0.6 * s, hip[1] - 3.1 * s], phoneCol: '#FFC5A0', phoneK: 0.55, phoneZ: 0.3 } });
    const u = E.inOutSine(seg(tt, 31.0, 33.2));
    let fig;
    if (tt < 31.0) {
      // sitting: the cushion takes him (19.0–19.7); the phone comes up from his lap to his ear (20.6–23.2). The rig's couch frame for
      // the legs and the turn; the arm keyed between the rig's lap and ear arms
      const settle = (1 - E.outCubic(seg(tt, 19.0, 19.7))) * 0.09 * s;
      const e = E.inOutSine(seg(tt, 20.6, 23.2));
      const base = RIG.POSES.him.couch({ hip: [hip[0], hip[1] + settle], dir: -1, s, u: 0, arm: 'ear', fit });
      const armL = Object.assign({ E: [lerp(LAP.E[0], EAR.E[0], e), lerp(LAP.E[1], EAR.E[1], e), ], W: [lerp(LAP.W[0], EAR.W[0], e), lerp(LAP.W[1], EAR.W[1], e)], front: true, order: 1 },
        e > 0.55 ? { hand: 'ear', hp: { over: 'all' } } : { hand: 'thumb', hp: { reach: 0.3, over: 'thumb' } });
      const blink = RIG.blink(lt, 3);
      const face = { yaw: 0.28, pitch: lerp(0.32, 0.18, e), lids: lids * blink, gaze: [0.05, 0.45], mouth: mH, smile: key(tt, [[28.2, 0], [28.6, 0.12], [29.6, 0.12], [30.6, 0.2]]) };
      const up = RIG.person({ who: 'him', costume: 'sweater', tau: 0.35, lean: 0, head: face, arms: { L: armL, R: Object.assign({ order: 2 }, SITR) }, legs: false, crop: 3.5, untucked: true });
      const p0 = base.parts[0], p1 = base.parts[1];
      RIG.drawFigure(c, { who: 'him', x: p0.x, y: p0.y, s, flip: p0.flip, light: L, breath: 0, ops: p0.ops });
      fig = RIG.drawFigure(c, { who: 'him', x: p1.x, y: p1.y, s, flip: p1.flip, rot: p1.rot || 0, light: L, breath: RIG.breath(lt, 3), ops: up.ops });
      const hand = fig.hands.L;
      if (hand) {
        const atEar = e > 0.55, ph = hand.phone || { x: hand.grip[0], y: hand.grip[1], h: 0.7 * s, angle: 0 };
        const P = atEar ? { x: hand.grip[0], y: hand.grip[1], h: 0.7 * s, yaw: Math.PI - 0.5, roll: 0.35, screen: 'app', t: lt, env: '#9AA4B4', spill: 0.6 }
          : { x: ph.x, y: ph.y, h: ph.h, roll: ph.angle, pitch: 0.6, screen: 'app', t: lt, env: '#9AA4B4' };
        PHONE.glow(c, { info: PHONE.where(P, c), k: 0.45 });
        PHONE.draw(c, P); fig.over(c);
      }
    } else {
      // he closes his eyes and lies down along the couch (the rig's liedown, the phone still in his hand); the cut lands mid-way
      fig = RIG.draw(c, 'him', 'liedown', { hip, dir: -1, s, light: L, t: lt, u, arm: 'ear', fit, face: { lids: 0.08 } });
      if (fig.phone) { const ph = fig.phone; PHONE.draw(c, { x: ph.x, y: ph.y, h: 0.7 * s, roll: ph.angle, yaw: Math.PI - 0.4, screen: 'app', t: lt, env: '#9AA4B4', spill: 0.6 }); fig.over(c); }
    }
    V.front(c, lt, s0);
  }

  // ------------------------------------------------------------------ him lying along the couch, seen from above (32.6–44)
  // The rig's couch frame (the legs bent inside the couch, the body turned about the hip); his top arm from his shoulder, down in
  // front of his chest to the phone, so it never crosses his face. lie: the body's angle; F(dx, dy): a screen offset in head units
  // from between his eyes, into the upper body's figure units
  const LIE = -1.4;
  function lieFrame(hx, hy, s) {
    const thW = -LIE, cr = Math.cos(thW), sr = Math.sin(thW);
    return { hip: [hx - 3.3 * Math.sin(thW) * s, hy + 3.3 * Math.cos(thW) * s], F: (dx, dy) => { const fxw = dx * cr + dy * sr, fy = -dx * sr + dy * cr; return [-fxw, fy]; } };
  }
  function drawLying(c, hx, hy, s, L, lt, face, armR, fit) {
    const fr = lieFrame(hx, hy, s);
    const base = RIG.POSES.him.couch({ hip: fr.hip, dir: -1, s, u: 1, arm: 'tuck', lie: LIE, fit: fit == null ? -4000 : fit });
    const up = RIG.person({ who: 'him', costume: 'sweater', tau: 0.2, lean: 0, head: face,
      arms: { L: { E: [-0.52, 1.85], W: [-0.62, 1.25], hand: false, behind: true }, R: Object.assign({ front: true, order: 2 }, armR) }, legs: false, crop: 3.5, untucked: true });
    const p0 = base.parts[0], p1 = base.parts[1];
    RIG.drawFigure(c, { who: 'him', x: p0.x, y: p0.y, s, flip: p0.flip, light: L, breath: 0, ops: p0.ops });
    return RIG.drawFigure(c, { who: 'him', x: p1.x, y: p1.y, s, flip: p1.flip, rot: p1.rot || 0, light: L, breath: RIG.breath(lt, 2.2), ops: up.ops });
  }
  // 35–44: B1 by day, turned. He has laid the phone face up on the cushion beside his face, across the seam into the empty half,
  // and his hand rests over it from his shoulder (the rig's couch, arm 'rest'). Its smooth light on his face. His eyes close.
  function close(c, st, lt) {
    const V = LV().couch, sh = V.shots.close, A = sh.anchors; const tt = twos(lt); const b = BLUE(lt);
    const s0 = { tod: 'day', blue: b, shot: 'close' };
    push(c, 960, 800, 1 + 0.03 * E.inOutSine(seg(lt, 35, 44)));
    V.back(c, lt, s0);
    const s = 0.23 * A.couchSeam[2];
    const hx = 880, hy = 745, fr = lieFrame(hx, hy, s);
    const rest = [hx + 0.62 * s, hy + 0.78 * s];
    const P = { x: rest[0], y: rest[1], h: 0.15 * A.couchSeam[2], pitch: 1.0, roll: -0.1, screen: 'app', t: lt, env: '#9AA4B4', shadow: { alpha: 0.4 } };
    PHONE.glow(c, { info: PHONE.where(P, c), k: 0.75, r: s * 2.4, sy: 0.6 });
    const L = blueLight(sh.lights.day, sh.lights.dusk, b, { rig: { phone: [rest[0] - 0.3 * s, rest[1] - 0.4 * s], phoneCol: '#FFC5A0', phoneK: 1.1, phoneZ: 0.5 } });
    const lids = key(tt, [[35, 0.3], [36.6, 0.3], [38.2, 0.18], [41.5, 0.03]]);
    const f = RIG.draw(c, 'him', 'couch', { hip: fr.hip, dir: -1, s, light: L, t: lt, u: 1, lie: LIE, fit: -4000, arm: 'rest', phone: rest, breathAmp: 2.2,
      face: { yaw: -0.42, pitch: 0.05, roll: 0.06, lids, smile: key(tt, [[38, 0.04], [41, 0.12]]), gaze: [0.2, 0.25] } });
    PHONE.draw(c, P);
    f.over(c);
  }

  // ------------------------------------------------------------------ 44–52.6: the room. The couch, the strip on the fridge behind him
  function room(c, st, lt) {
    const V = LV().room, sh = V.shots.wide, A = sh.anchors; const tt = twos(lt); const b = BLUE(lt);
    const s0 = { tod: 'day', blue: b, phone: 'cushion' };
    // a slow push toward the strip, behind him on the fridge: it starts, travels and lands (under 1.15, where the set stays sharp)
    push(c, A.strip[0], A.strip[1], 1 + 0.13 * E.inOutSine(seg(lt, 44.4, 52.6)));
    V.back(c, lt, s0);
    const s = 0.23 * A.couchSeam[2];
    const hip = V.project([3.62, 0.44, 3.5]), fit = V.project([3.4, 0.6, 3.5])[0];
    const L = blueLight(sh.lights.day, sh.lights.dusk, b, { rig: { phone: [hip[0] + 3 * s, hip[1] - 0.6 * s], phoneCol: '#FFC5A0', phoneK: 1.1, phoneZ: 0.5 } });
    const f = RIG.draw(c, 'him', 'couch', { hip, dir: -1, s, light: L, t: lt, u: 1, arm: 'rest', fit, blink: false, face: { lids: 0.02, smile: 0.12 } });
    if (f.phone) {
      const P = { x: f.phone.x, y: f.phone.y, h: 0.15 * A.couchSeam[2], pitch: 1.3, screen: 'app', t: lt, env: '#9AA4B4' };
      PHONE.glow(c, { info: PHONE.where(P, c), k: 0.8, r: 2.2 * s, sy: 0.5 });
      PHONE.draw(c, P); f.over(c);
    }
    V.front(c, lt, s0);
  }
  // 52.6–58: the strip. Four frames, laughing; her long hair. The last daylight catches it; a slow push down to her head on his
  function strip(c, st, lt) {
    const V = LV().fridge, A = V.shots.insert.anchors; const b = BLUE(lt);
    push(c, A.stripLast[0], A.stripLast[1], 1 + 0.16 * E.inOutSine(seg(lt, 52.6, 58.6)));
    V.back(c, lt, { tod: 'day', blue: b });
    // the window's last light on the fridge door, cut in two cool bands (real light, so it is posterised); it falls round the strip,
    // and on the strip itself only lifts the print a little (soft light), so the four laughing frames keep their contrast in the blue
    const g = c.g, S = OTM.S, cx = A.strip[0], cy = A.strip[1], sw = 0.052 * A.strip[2], sh = 0.19 * A.strip[2];
    const stripPath = new Path2D(); { const m = new DOMMatrix().translateSelf(cx, cy).rotateSelf(0.045 * 180 / Math.PI); const q = [[-sw / 2 - 5, -sh / 2 - 5], [sw / 2 + 5, -sh / 2 - 5], [sw / 2 + 5, sh / 2 + 5], [-sw / 2 - 5, sh / 2 + 5]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]); stripPath.moveTo(q[0][0], q[0][1]); q.slice(1).forEach(p2 => stripPath.lineTo(p2[0], p2[1])); stripPath.closePath(); }
    const outside = new Path2D(); outside.rect(-2000, -2000, 6000, 6000); outside.addPath(stripPath);
    g.save(); g.clip(outside, 'evenodd'); g.globalCompositeOperation = 'screen';
    g.fillStyle = 'rgba(126,147,194,0.22)'; g.fill(S().poly([[cx - 520, -200], [cx + 700, -200], [cx + 380, 1300], [cx - 840, 1300]]).path(3, 1140));
    g.fillStyle = 'rgba(126,147,194,0.16)'; g.fill(S().poly([[cx - 300, -200], [cx + 420, -200], [cx + 140, 1300], [cx - 600, 1300]]).path(3, 1141));
    g.restore();
    g.save(); g.clip(stripPath); g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(214,222,240,0.55)'; g.fillRect(cx - 400, cy - 600, 800, 1200); g.restore();
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
      S.cue('couch_creak', 31.4, { level: -40, what: 'he lies down along the couch' });
      S.cue('breath', 33.0, { what: 'his, settling, as he lies down beside the phone' });
      S.duck(31.2, 58, 0.7);
      S.silence(58, 72);   // the cut to black is silent; the title is silent (or the score's last note: the score plan decides)
    },
    shots: [
      { at: 0, name: 'phone: black glass in his hand; his face in it', draw: blackGlass, post: { vig: 0.55 } },
      { at: 6, name: 'phone: he touches it; the waterfall blooms back; he taps the banner', draw: bloom, post: { vig: 0.55 } },
      { at: 11, name: 'INSERT: the app in his hand. Her face, the long hair, the line waiting; nothing rings', draw: app, post: { vig: 0.6, halation: 0.4 } },
      { at: 19, name: 'couch: he sits, the phone to his ear; L024-L027; he lies down', draw: couchMain, post: { vig: 0.5 } },
      { at: 35, name: 'couch, close: B1 by day; the phone where a head would be, his hand over it', draw: close, post: { vig: 0.55, halation: 0.55 } },
      { at: 44, name: 'room: the couch, and the strip on the fridge behind him; the daylight going blue', draw: room, post: { vig: 0.5 } },
      { at: 52.6, name: 'fridge: the strip. Long hair. Laughing', draw: strip, post: { vig: 0.35 } },
      { at: 58, name: 'CUT TO BLACK', draw: black, post: { grain: 0, fibre: 0, halation: 0, vig: 0 } },
      { at: 60, name: 'TITLE: LONG DISTANCE', draw: title, post: { grain: 0.03, fibre: 0, halation: 0, vig: 0 } },
    ],
  });
})();
