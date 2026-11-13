/* ONE TOO MANY — Q04 THE PARTY (L033-L049, A023-A029). Set: living. Letterbox 1.78. 46.0 s, 12 shots (average 3.8 s, Act 1 pace).
   The warmest, funniest stretch: music, clinks, wet prints by the door, Christof's twelve-quid story, the coaster, "Sit down, Scott",
   Deena's unsaid word, Angelo's deck. Everything in the room is ONE continuous world driven by sequence time, so every cut between
   framings of the room stays in continuity; the inserts (the prints, the coaster, Kay in the doorway, Angelo's hands) are their own views.
   Local additions (not in the sets/rig): a top-down floor insert for the wet prints; insert arms with an elbow, a sleeve break and a taper;
   a card tuck box; a couch arm and a lamp pool on the wall for the doorway two-shot; Deena's over-the-shoulder composite; a cheap
   single-rim figure draw for background figures (performance); sounds Q04.clink/laugh/tock/wipe/tick/walla and Q04.groove, which is
   SOUND.beds.groove note for note (same chords, voicing, FM e-piano, 70 bpm 6/8) but phase-locked so that its chord-0 downbeat lands
   exactly on the cut into Q05 (whose Q05.groovecut wraps SOUND.beds.groove from its own t=0), and at level from frame 0. */
(function () {
  'use strict';
  const O = window.OTM, C = O.C, S = O.S, R = window.RIG, LV = SETS.living;
  const { seg, clamp, lerp } = FILM;
  const W = 1920, H = 1080, TAU = Math.PI * 2;
  const LAMP = { x: LV.light.x, y: LV.light.y };            // the floor lamp (930, 404)
  const DOOR_L = LV.lights.doorway, CO_L = LV.lights.coaster;

  // ======================================================================== the timeline (sequence seconds)
  const T = {
    prints: 1.85, story: 3.15, deenaIn: 6.85, wide: 10.0, coaster: 18.75, borrowed: 22.45, kay1: 26.0, scott: 27.9, perch: 31.2,
    deenaSees: 33.75, angelo: 36.85, angeloMed: 38.2, end: 46.0,
  };
  const LN = { L033: 3.3, L034: 6.85, L035: 8.45, L036: 10.2, L037: 12.05, L038: 13.95, L039: 15.35, L040: T.coaster + 1.85, L041: 22.8, L042: 24.35,
    L043: 26.3, L044: 28.2, L045: 29.35, L046: 32.5, L047: 37.75, L048: 41.9, L049: 43.4 };
  const BIG = 16.25;                 // the house comes down on 'twelve-quid drink.'
  const RIFFLE = 44.55;
  // the coaster beat (insert), local to T.coaster
  const CB = { wipe0: 0.05, wipe1: 1.15, in0: 0.55, in1: 1.45, lift0: 1.25, lift1: 1.6, slide0: 1.55, slide1: 1.95, down0: 1.95, down1: 2.25, out0: 2.3, out1: 2.95 };
  const tCo = u => T.coaster + u;
  // Deena's beat, local to T.deenaSees: she finds them, her chin lifts, the cursor (6 frames), it dies, a held silence, she looks away,
  // sips, turns, goes
  const DS = { snap: 0.15, open: 0.55, cur: 0.85, close: 1.15, away: 1.7, sip0: 1.85, sip1: 2.5, turn: 2.55, walk: 2.72 };
  // the room's laughs: [t, dur, amount]
  const LAUGHS = [[0, 1.5, 0.8], [7.95, 0.8, 0.35], [14.85, 0.9, 0.45], [BIG, 1.9, 1], [26.0, 0.9, 0.35], [33.2, 0.8, 0.3], [RIFFLE, 1.1, 0.45]];

  // ======================================================================== helpers
  const CACHE = { figs: null, cam: null };
  const scr = (cam, p) => [(p[0] - cam.x) * cam.zoom + W / 2 + (cam.dx || 0), (p[1] - cam.y) * cam.zoom + H / 2 + (cam.dy || 0)];
  const push = (base, st, k) => Object.assign({}, base, { zoom: base.zoom * (1 + (k == null ? 0.0035 : k) * st) });
  const bump = u => 0.5 - 0.5 * Math.cos(TAU * clamp(u, 0, 1));
  const tw = t => Math.floor(t * 12 + 1e-6) / 12;
  const tw1 = t => Math.floor(t * 24 + 1e-6) / 24;
  function laughAmt(lt, only) {
    let a = 0; LAUGHS.forEach(([t0, d, k], i) => { if (only && only.indexOf(i) < 0) return; const u = lt - t0; if (u < 0 || u > d) return; a = Math.max(a, k * seg(u, 0, 0.12) * (1 - seg(u, d * 0.55, d))); });
    return a;
  }
  const bounce = (lt, hz, ph) => Math.abs(Math.sin(TAU * (hz || 2.4) * tw(lt) + (ph || 0)));
  // full rig draw for the actors in focus (per-part rim, falloff, wedge); a cheaper single-rim cut for everyone else in the room
  function full(c, F, o) { o = o || {}; R.draw(c.g, F, Object.assign({ light: LAMP, color: C.tungsten, falloff: true, em: c.em }, o)); return F; }
  function fast(c, F, o) {
    o = o || {}; const g = c.g, light = o.light || LAMP, col = o.color || C.tungsten, z = (CACHE.cam && CACHE.cam.zoom) || 1, w = (o.w || 2.6) * 0.85 / z;
    const band = (p, at, ww) => { const dx = light.x - at[0], dy = light.y - at[1], l = Math.hypot(dx, dy) || 1; g.save(); g.fillStyle = col; g.translate(dx / l * ww, dy / l * ww); g.fill(p); g.restore(); g.fillStyle = C.ink; g.fill(p); };
    const p = R.path(F); band(p, F.at, w);
    const po = { light, color: col, em: o.props === false ? null : c.em, details: o.details || {}, scale: F.scale };
    if (o.props !== false) F.props.forEach(fn => fn(g, po));
    if (F.front) band(F._fp || (F._fp = F.front.path(0.8, 27)), F.at, w * 0.8);
    if (F.details) O.fig.drawDetails(g, F, Object.assign({ light, rimColor: col }, o.details || {}));
    return F;
  }
  const NOBEADS = { beadColor: 'rgba(0,0,0,0)' };               // Kay's rain beads are dry by now: none in this sequence
  // ---------------------------------------------------------------- insert arms: shoulder -> elbow -> sleeve break -> tapered forearm -> hand
  // pose: kit hand pose; tip = the point the hand acts on (pinch / palm); a = finger direction; sc = hand length (px); el = elbow;
  // sh = shoulder (off frame); w = upper-arm half-width; mirror flips the thumb side.
  function arm(pose, tip, a, sc, el, sh, w, mirror, hopts) {
    const pt = pose === 'pinch' ? [0.64, -0.05] : pose === 'flat' ? [0.5, 0] : pose === 'open' ? [0.45, 0] : [0.4, 0];
    const ca = Math.cos(a), sa = Math.sin(a), my = mirror ? -1 : 1;
    const M = [ca * sc, sa * sc, -sa * sc * my, ca * sc * my, 0, 0];
    M[4] = tip[0] - (M[0] * pt[0] + M[2] * pt[1]); M[5] = tip[1] - (M[1] * pt[0] + M[3] * pt[1]);
    const wr = [M[4], M[5]];
    const cuffU = 0.42, cf = [lerp(el[0], wr[0], cuffU), lerp(el[1], wr[1], cuffU)];
    const shp = S().capsule(sh[0], sh[1], w, el[0], el[1], w * 0.86)                     // upper arm, in the sleeve
      .capsule(el[0], el[1], w * 0.84, cf[0], cf[1], w * 0.8)                            // the sleeve to its cuff
      .capsule(cf[0], cf[1], w * 0.6, wr[0], wr[1], w * 0.46);                           // bare forearm, tapering to the wrist
    // the cuff: a small step proud of the forearm
    const d = [wr[0] - el[0], wr[1] - el[1]], l = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / l, d[0] / l], u = [d[0] / l, d[1] / l];
    shp.poly([[cf[0] + n[0] * w * 0.86, cf[1] + n[1] * w * 0.86], [cf[0] + u[0] * 10 + n[0] * w * 0.82, cf[1] + u[1] * 10 + n[1] * w * 0.82],
      [cf[0] + u[0] * 10 - n[0] * w * 0.82, cf[1] + u[1] * 10 - n[1] * w * 0.82], [cf[0] - n[0] * w * 0.86, cf[1] - n[1] * w * 0.86]]);
    shp.add(O.fig.hand(pose === 'pinch' ? 'pinch' : pose, hopts || {}).transform(M));
    return { shape: shp, M, wr, el, cf };
  }
  const handPt = (M, x, y) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];

  // ======================================================================== THE ROOM (F04), one continuous world
  const KAY = { x: 128, y: 880, scale: 76 }, SCOTT = { x: 486, y: 914, scale: 84 }, MARINA = { x: 800, y: 724, scale: 82 };
  const CHRIS = { x: 1150, y: 900, scale: 88 }, DEENA = { x: 1452, y: 902, scale: 84 }, ANGELO = { x: 1690, y: 892, scale: 114 };
  const GL = LV.anchors.wide.glasses;                        // the six glass spots on the trunk
  const KAY_HEAD = [150, 345], SCOTT_HEAD = [520, 300], CHRIS_HEAD = [1130, 270], ANGELO_HEAD = [1790, 500], MATS = [660, 784];
  const ARM_SEAT = { x: 236, y: 852, scale: 100 };           // Scott on the arm of the FG couch, beside Kay

  function wideState(lt) {
    const ringAmt = lt < tCo(CB.wipe0) ? 1 - 0.15 * seg(lt, BIG + 1.45, T.coaster) : 1 - seg(lt, tCo(CB.wipe0), tCo(CB.wipe1)) * 0.92;
    const matOn = lt >= tCo(CB.down0);
    // SIX glasses for six people: four stand on the trunk (Scott's, Marina's, Christof's, Angelo's); Kay and Deena hold theirs.
    // Marina's (index 2) is right of the ring, and stands on a mat once Scott hands her one.
    const fills = [0.55, null, 0.62, 0.45, null, 0.35];
    const hush = lt > T.deenaSees + DS.open && lt < T.deenaSees + DS.away;
    return {
      glasses: fills.map((f, i) => f == null ? null : (i === 2 && matOn ? { fill: f, mat: true } : f)),
      ring: ringAmt, matStack: lt >= tCo(CB.in0) ? 3 : 4, walla: hush ? 0.3 : 1, prints: 1, music: 1, dimLast: true,
    };
  }

  // ---------------------------------------------------------------- the six, as functions of sequence time lt
  function kaySpec(lt) {
    // leaning back on the kitchen doorway's jamb, glass in the far hand; she watches whoever has the room (on ones)
    let look = CHRIS_HEAD;
    if (lt > LN.L038 && lt < LN.L039) look = ANGELO_HEAD;
    if (lt > T.coaster - 0.6 && lt < T.borrowed + 3) look = [720, 640];
    if (lt > T.borrowed + 3) look = SCOTT_HEAD;
    if (lt > T.perch) look = [ARM_SEAT.x + 20, 560];
    const sip = lt > LN.L036 + 2.0 && lt < LN.L036 + 3.4 ? bump(seg(lt, LN.L036 + 2.0, LN.L036 + 3.4)) * 0.7 : 0;
    const L = laughAmt(lt, [3, 4]);                            // her head tips back on the big laugh
    return { x: KAY.x, y: KAY.y, scale: KAY.scale, facing: 1, pose: 'stand', t: lt, lean: -0.14 - 0.05 * L, neck: 0.06 - 0.1 * L, head: 0.12 - 0.42 * L,
      legN: { a: -0.1, b: 0.0 }, legF: { a: 0.24, b: 0.04 }, armN: { a: 0.06, b: 0.45, hand: 'relaxed' },
      hold: { F: { kind: 'glass', fill: 0.42, lip: true, drink: sip } }, look, lookAmt: 0.8 * (1 - L) };
  }
  // Scott: hovering between the cups and the snacks, the crisp bowl on one hand (no glass: his own stands on the trunk)
  function scottSpec(lt) {
    const hov = R.key('scott', lt, [[0, 0], [1.4, 1], [3.0, 1], [4.4, 0], [16.9, 0], [17.9, 0.5], [24.2, 1], [25.6, 0], [28.0, 0], [28.9, 1], [29.6, 1], [30.2, 0.4]]);
    const x = lerp(SCOTT.x - 28, SCOTT.x + 44, hov);
    const L = laughAmt(lt), b = bounce(lt, 2.6, 0.4);
    let look = [x + 300, 760], head = 0.26 + 0.25 * L, lean = 0.36 + 0.26 * L * (0.75 + 0.25 * b), neck = 0.16, lookAmt = 0.7;
    if (lt > LN.L044 - 0.15 && lt < T.perch) look = [KAY_HEAD[0], KAY_HEAD[1] + 40];          // answering Kay over his shoulder
    const freeze = lt > LN.L045 + 0.35 && lt < T.perch;
    // ... and then he looks down and back at his own bent legs: two beats, dead still
    const legs = seg(lt, LN.L045 + 0.55, LN.L045 + 0.8, 'outCubic');
    let bowlAt = [x + 150, 640 + 10 * Math.sin(TAU * 4.2 * tw(lt)) * L];
    if (legs > 0) { look = null; head = lerp(0.26, 1.35, legs); lean = lerp(0.36, 0.42, legs); neck = lerp(0.16, 0.7, legs); bowlAt = [x + lerp(150, 290, legs), lerp(640, 470, legs)]; }
    const reachMat = seg(lt, 17.85, 18.35) * (1 - seg(lt, T.coaster + 3.2, T.coaster + 3.6));
    const F = reachMat > 0 ? { kind: 'reach', at: [lerp(x + 120, MATS[0] - 10, reachMat), lerp(760, MATS[1] - 6, reachMat)] } : undefined;
    const o = { x, y: SCOTT.y, scale: SCOTT.scale, facing: 1, t: lt, pose: 'stand', idleAmt: freeze ? 0 : 1, lean, neck, head, look: look || undefined, lookAmt,
      legN: { a: 0.62, b: 0.95 }, legF: { a: 0.3, b: 0.8 }, armF: { a: 0.32, b: 0.55, hand: 'open' },
      hold: { N: { kind: 'bowl', crisps: 9, at: bowlAt } } };
    if (F) o.hold.F = F;
    if (legs > 0) o.hold.F = { kind: 'flat', at: [x + 40, 790], view: 'edge', curl: 0.3 };
    return o;
  }
  function marinaSpec(lt) {
    // kneeling at the trunk; listening; doubled up on the big laugh; then she spots the ring and wipes it
    const wipe = seg(lt, BIG + 1.45, BIG + 1.75) * (1 - seg(lt, tCo(CB.lift0), tCo(CB.lift0) + 0.3));
    const wx = 948 + 14 * Math.sin(TAU * 1.6 * tw(lt));
    const L = laughAmt(lt), b = bounce(lt, 2.8, 1.1);
    const after = lt > tCo(CB.lift0);
    const hand = wipe > 0 ? { kind: 'flat', at: [lerp(880, wx, wipe), 776], view: 'edge', autoLean: true } : after ? { kind: 'flat', at: [GL[2][0] - 24, 776], view: 'edge', autoLean: true } : { kind: 'flat', at: [870, 784], view: 'edge' };
    const look = lt < BIG + 1.15 ? CHRIS_HEAD : lt < T.borrowed ? [948, 784] : lt < T.borrowed + 3.2 ? SCOTT_HEAD : CHRIS_HEAD;
    const o = { x: MARINA.x, y: MARINA.y - 5 * L * b, scale: MARINA.scale, facing: 1, anchor: 'hip', t: lt, lean: 0.42 - 0.34 * L - 0.06 * L * b, neck: 0.16 - 0.12 * L, head: 0.24 - 0.5 * L,
      legN: { a: 0.08, b: 1.62 }, legF: { a: 0.0, b: 1.6 }, hold: { N: hand }, armF: { a: 0.1 + 0.3 * L, b: 0.4 + 0.5 * L, hand: 'relaxed' }, look, lookAmt: 0.6 * (1 - L) };
    if (L > 0.3) { o.hold = {}; o.armN = { a: -0.15, b: 2.55, hand: 'relaxed' }; }
    return o;
  }
  // Christof: the biscuit is a baton. Facing the room (-1); he swings to Deena (+1) when she cuts in, back for Kay, and to Angelo at the end.
  function christofTurn(lt) {
    if (lt < LN.L034 + 0.25) return { facing: -1, squash: 1, view34: 0 };
    if (lt < 9.6) return R.turn('christof', lt, LN.L034 + 0.25, -1, 1);
    if (lt < LN.L048 - 0.6) return R.turn('christof', lt, 9.6, 1, -1);
    return R.turn('christof', lt, LN.L048 - 0.6, -1, 1);
  }
  function christofSpec(lt) {
    const tr = christofTurn(lt), f = tr.facing;
    const sh = [CHRIS.x - f * 14, 360];
    const P = (dx, dy) => [sh[0] + f * dx, sh[1] + dy];
    const s3 = LN.L033;
    // the biscuit's path: loops while he talks; up on 'date', a jab down on 'point'; a stop sign at Deena; a toast for the drink
    const ks = [
      [0, P(120, 60)], [1.6, P(110, -140)], [3.0, P(130, 70)],
      [s3 + 0.25, P(175, 20)], [s3 + 0.58, P(150, -120)], [s3 + 0.85, P(150, -125)], [s3 + 1.05, P(215, 70)], [s3 + 1.7, P(195, 60)], [s3 + 3.0, P(170, 30)],
      [LN.L034, P(165, 50)], [LN.L034 + 0.35, P(150, 60)], [LN.L034 + 0.85, P(120, -95)], [9.0, P(125, -90)], [9.5, P(150, 40)],
      [T.wide, P(140, 95)], [LN.L037, P(140, 70)], [LN.L037 + 0.7, P(105, -125)], [LN.L038, P(100, 40)],
      [LN.L039, P(165, 30)], [LN.L039 + 0.4, P(110, -140)], [18.1, P(105, -128)], [18.9, P(130, 100)],
      [LN.L048 - 0.05, P(130, 100)], [LN.L048 + 0.5, P(185, -30)], [LN.L048 + 1.6, P(175, -20)], [T.end, P(150, 80)],
    ];
    const tgt = R.arc('christof', lt, ks);
    const talk = (lt > s3 && lt < LN.L034) || (lt > LN.L035 && lt < 9.6) || (lt > LN.L037 && lt < LN.L037 + 2.0) || (lt > LN.L039 && lt < LN.L039 + 2.6) || (lt > LN.L048 && lt < LN.L048 + 1.6);
    const tq = tw(lt), loop = [Math.cos(TAU * 0.7 * tq) * 20, Math.sin(TAU * 1.4 * tq) * 13];
    const stop = lt > LN.L034 + 0.8 && lt < 9.2;              // the stop sign: dead still, then a small wag on 'getting to that'
    const wag = stop && lt > LN.L035 ? Math.sin(TAU * 2.2 * tq) * 10 : 0;
    const at = [tgt[0] + (talk && !stop ? loop[0] : wag), tgt[1] + (talk && !stop ? loop[1] : 0)];
    const big = lt > s3 + 0.5 && lt < LN.L034;
    const farUp = lt > LN.L039 + 0.25 && lt < 18.2;
    const L = laughAmt(lt, [3]);
    const look = lt > LN.L038 + 0.2 && lt < LN.L039 - 0.1 ? ANGELO_HEAD : undefined;
    return { x: CHRIS.x, y: CHRIS.y, scale: CHRIS.scale, facing: f, squash: tr.squash, view34: tr.view34, t: lt, pose: 'stand',
      lean: big ? -0.12 : -0.05 - 0.06 * L, neck: -0.08, head: big ? -0.22 : stop ? -0.05 : -0.1 - 0.2 * L, look, lookAmt: 0.6,
      armF: farUp ? { a: -0.5, b: -0.42, hand: 'open', handOpts: { spread: 0.2 } } : { a: -0.28 + 0.18 * Math.sin(TAU * 0.5 * tq), b: 0.5, hand: 'open' },
      legN: { a: 0.2, b: 0.06 }, legF: { a: -0.18, b: 0.05 }, hold: { N: { kind: 'biscuit', at } } };
  }
  // Deena: hand on hip, glass in the far hand, held LOW. She snaps in at Christof; on the big laugh she turns her face away, shaking her head.
  function deenaSpec(lt) {
    const snap = R.key('deena', lt, [[0, 0], [LN.L034 - 0.08, 0], [LN.L034 + 0.1, 1], [9.0, 1], [9.4, 0]]);
    const L = laughAmt(lt, [3]);
    const shake = L * 0.09 * Math.sin(TAU * 3.0 * tw(lt));
    let look = lt > T.coaster && lt < T.kay1 ? [880, 700] : CHRIS_HEAD, lookAmt = 0.85;
    if (L > 0.05) { look = [DEENA.x + 400, 1000]; lookAmt = 0.7 * L; }
    let tr = { facing: -1, squash: 1 };
    if (lt > BIG + 0.12 && lt < BIG + 1.45) tr = R.turn('deena', lt, BIG + 0.12, -1, 1); else if (lt >= BIG + 1.45 && lt < BIG + 1.8) tr = R.turn('deena', lt, BIG + 1.45, 1, -1);
    if (tr.facing > 0) { look = undefined; }
    return { x: DEENA.x, y: DEENA.y, scale: DEENA.scale, facing: tr.facing, squash: tr.squash, pose: 'stand', t: lt, gesture: 'handOnHip', lean: -0.04 + 0.11 * snap + 0.05 * L, neck: -0.08 + 0.06 * L,
      head: -0.18 - 0.16 * snap + 0.32 * L + shake, legN: { a: 0.08, b: 0.02 }, legF: { a: -0.08, b: 0.02 }, look, lookAmt,
      hold: { F: { kind: 'glass', fill: 0.5 } } };
  }
  // Angelo: sunk in the armchair. Laughs with his head back and his shoulders going; heckles with a raised finger; then the deck
  function angeloSpec(lt) {
    const L = laughAmt(lt), b = bounce(lt, 2.4, 0.7);
    const heckle = seg(lt, LN.L038 - 0.15, LN.L038 + 0.15) * (1 - seg(lt, LN.L038 + 1.6, LN.L038 + 1.9));
    const deck = lt > T.angelo - 0.3;
    const o = { x: ANGELO.x, y: ANGELO.y - 6 * L * b, scale: ANGELO.scale, facing: -1, anchor: 'hip', t: lt, lean: -0.5 - 0.16 * L - 0.04 * L * b, neck: 0.22 - 0.2 * L, head: 0.16 - 0.55 * L,
      legN: { a: 1.3, b: 0.7 }, legF: { a: 1.12, b: 1.0 }, armF: { a: -2.25, b: 2.2, hand: 'relaxed' }, armN: { a: 0.5 + 0.35 * L, b: 1.05 + 0.4 * L * b, hand: 'relaxed' },
      look: heckle > 0 ? CHRIS_HEAD : undefined, lookAmt: 0.7 };
    if (heckle > 0) { o.hold = { N: { kind: 'point', at: [lerp(1700, 1622, heckle), lerp(620, 405, heckle)] } }; o.lean = -0.36; o.head = 0.0; }
    if (deck) {
      // sat up, the squared deck in his near hand; it springs in the riffle at the end
      const rf = seg(lt, RIFFLE, RIFFLE + 0.55);
      const toC = lt > LN.L048 - 0.3 && lt < LN.L049;
      o.lean = -0.22 - 0.1 * L; o.head = (toC ? 0.05 : 0.22) - 0.3 * L; o.neck = 0.12;
      o.look = toC ? CHRIS_HEAD : undefined;
      o.hold = { N: { kind: 'deck', mode: rf > 0 && rf < 1 ? 'fan' : 'square', open: bump(rf) * 0.9, spread: 1.6, n: 11, at: [1560, 640] } };
      o.armF = { a: 0.75, b: 1.3, hand: 'open', w: -0.4 };
    }
    return o;
  }

  // ---------------------------------------------------------------- Angelo's deck, drawn large enough to read in his medium
  function angeloDeck(c, F, lt) {
    const h = F.holds && F.holds.N; if (!h || !h.tip) return;
    const g = c.g, sc = F.scale, w = 0.3 * sc, hh = 0.42 * sc;
    const rf = seg(lt, RIFFLE, RIFFLE + 0.6), open = bump(rf), n = 9;
    const base = -0.42 + 0.06 * Math.sin(tw(lt) * 2.1);
    g.save(); g.translate(h.tip[0], h.tip[1] + hh * 0.35);
    for (let i = 0; i < n; i++) {
      const a = base + (i / (n - 1) - 0.5) * 1.5 * open;
      g.save(); g.rotate(a); g.translate(0, -i * 0.6 * (1 - open));
      g.fillStyle = i === n - 1 ? C.cardPaper : O.mix(C.cardPaper, C.tungstenMid, 0.3); g.fillRect(-w / 2, -hh, w, hh);
      if (i === n - 1 || open > 0.15) { g.fillStyle = C.cardBlue; g.fillRect(-w / 2 + 3, -hh + 3, w - 6, hh - 6); g.strokeStyle = O.rgba(C.cardPaper, 0.6); g.lineWidth = 1.2; g.strokeRect(-w / 2 + 6, -hh + 6, w - 12, hh - 12); }
      g.fillStyle = C.tungsten; g.fillRect(-w / 2, -hh, 2, hh);
      g.restore();
    }
    g.restore();
    if (F.front) { g.fillStyle = C.ink; g.fill(F._fp || (F._fp = F.front.path(0.8, 27))); }
  }
  // ---------------------------------------------------------------- the room, all six, at sequence time lt
  // o.full: ids drawn with the full rig (mediums); o.hide: ids not drawn (Deena in her own over-the-shoulder)
  function wide(c, lt, cam, o) {
    o = o || {}; const fullIds = o.full || [], hide = o.hide || [];
    const d = (id, F, oo) => { if (hide.indexOf(id) >= 0) return F; return fullIds.indexOf(id) >= 0 ? full(c, F, { details: oo.details, props: oo.props }) : fast(c, F, oo); };
    c.camera(cam); CACHE.cam = cam;
    const st = wideState(lt);
    LV.back(c, lt, st, 'wide');
    if (o.under) o.under(c);
    const F = {};
    F.kay = d('kay', R.figure('kay', kaySpec(lt)), { w: 2.4, details: NOBEADS });
    if (hide.indexOf('marina') < 0) F.marina = d('marina', R.figure('marina', marinaSpec(lt)), { w: 2.6 });
    F.christof = d('christof', R.figure('christof', christofSpec(lt)), { w: 3 });
    if (lt < T.deenaSees) F.deena = d('deena', R.figure('deena', deenaSpec(lt)), { w: 2.8, details: { hoopColor: C.tungsten } });
    if (lt < T.perch) F.scott = d('scott', R.figure('scott', scottSpec(lt)), { w: 2.8 });
    LV.table(c, lt, st, 'wide');
    LV.front(c, lt, st, 'wide');
    if (lt >= T.perch) {
      const u = lt - T.deenaSees, sip = u > 0.2 && u < 1.4 ? bump(seg(u, 0.2, 1.4)) * 0.3 : 0;
      F.scott = d('scott', R.figure('scott', { x: ARM_SEAT.x, y: ARM_SEAT.y, scale: ARM_SEAT.scale, facing: -1, anchor: 'hip', t: lt, lean: 0.05 + sip * 0.1, head: -0.2,
        legN: { a: 1.32, b: 1.2 }, legF: { a: 1.12, b: 1.3 }, hold: { N: { kind: 'bowl', crisps: 9, at: [ARM_SEAT.x - 110, 760] } }, look: KAY_HEAD, lookAmt: 0.8 }), { w: 3 });
    }
    const hasDeck = lt > T.angelo - 0.3;
    F.angelo = d('angelo', R.figure('angelo', angeloSpec(lt)), { w: 3.6, props: hasDeck ? false : undefined });
    if (hasDeck) angeloDeck(c, F.angelo, lt);
    CACHE.figs = F; CACHE.cam = cam;
    return F;
  }

  // ======================================================================== INSERT: the wet prints by the hall door (top-down floor)
  // Three trails from the mat into the room: heels (Marina), shoes (Christof), boots (Kay, earlier, drier). Water on dark boards: the
  // print is darker wet wood in a damp halo, and the lamp (off right) lies on it as one glossy highlight on the toe side only.
  const PR = { ext: [-120, -80, 2040, 1160] };
  const SM = pts => O.fig.smooth(pts, true);
  function sole(kind) {
    if (kind === 'heel') return SM([[0.53, 0.0], [0.42, -0.1], [0.2, -0.155], [0.0, -0.11], [-0.13, -0.02], [-0.06, 0.1], [0.2, 0.15], [0.42, 0.1]]).add(S().ellipse(-0.47, 0.03, 0.036, 0.034, 0));
    const fore = SM([[0.5, 0.02], [0.42, -0.14], [0.22, -0.2], [0.02, -0.15], [-0.15, -0.11], [-0.18, 0.0], [-0.14, 0.13], [0.06, 0.17], [0.27, 0.19], [0.44, 0.12]]);
    const heel = SM([[-0.26, -0.12], [-0.42, -0.125], [-0.52, -0.03], [-0.48, 0.1], [-0.34, 0.135], [-0.25, 0.08], [-0.24, -0.02]]);
    if (kind === 'boot') return fore.add(heel).add(S().poly([[-0.2, -0.07], [-0.26, -0.08], [-0.26, 0.1], [-0.18, 0.12]]));
    return fore.add(heel);
  }
  const TRAILS = [
    { kind: 'heel', from: [640, 170], to: [2150, 760], step: 265, k: 232, wet: 1.0, gaitW: 30 },
    { kind: 'shoe', from: [430, 400], to: [2100, 1240], step: 320, k: 272, wet: 0.95, gaitW: 52 },
    { kind: 'boot', from: [120, 640], to: [1350, 1400], step: 300, k: 262, wet: 0.4, gaitW: 48 },
  ];
  let PRINTS = null;
  function printList() {
    if (PRINTS) return PRINTS; PRINTS = [];
    TRAILS.forEach((T0, ti) => {
      const dx = T0.to[0] - T0.from[0], dy = T0.to[1] - T0.from[1], L = Math.hypot(dx, dy), a = Math.atan2(dy, dx), nx = -dy / L, ny = dx / L;
      const n = Math.floor(L / T0.step);
      for (let i = 0; i <= n; i++) { const s = i % 2 ? 1 : -1; const u = i * T0.step / L; const r = O.rng('pr' + ti + ':' + i);
        PRINTS.push({ ti, kind: T0.kind, x: T0.from[0] + dx * u + nx * s * T0.gaitW, y: T0.from[1] + dy * u + ny * s * T0.gaitW, a: a + (r() - 0.5) * 0.14 + s * 0.08, k: T0.k, my: s, wet: T0.wet * Math.max(0.12, 1 - i * 0.085), i }); }
    });
    return PRINTS;
  }
  const LPR = [2300, 760];        // the lamp's direction, off the right of the floor
  const printM = (p, k) => { k = k || 1; return [Math.cos(p.a) * p.k * k, Math.sin(p.a) * p.k * k, -Math.sin(p.a) * p.k * p.my * k, Math.cos(p.a) * p.k * p.my * k, p.x, p.y]; };
  function paintPrintsFloor(g) {
    const E = PR.ext; g.fillStyle = C.ink; g.fillRect(E[0], E[1], E[2] - E[0], E[3] - E[1]);
    O.lightPool(g, LPR[0], LPR[1], [{ r: 2100, color: O.mix(C.tungstenLow, C.ink, 0.45) }, { r: 1450, color: C.tungstenLow }, { r: 820, color: O.mix(C.tungstenMid, C.tungstenLow, 0.25) }], { sy: 0.62, seed: 41, rough: 3 });
    const r = O.rng('boards');
    for (let i = -6; i < 22; i++) {
      const y0 = -300 + i * 92, y1 = y0 + 520;
      g.save(); g.globalAlpha = 0.55; g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(E[0], y0); g.lineTo(E[2], y1); g.stroke();
      g.globalAlpha = 0.18; g.lineWidth = 1.2; g.strokeStyle = C.tungsten; g.beginPath(); g.moveTo(E[0], y0 + 4); g.lineTo(E[2], y1 + 4); g.stroke();
      g.globalAlpha = 0.5; g.strokeStyle = C.ink; g.lineWidth = 3; const bx = 200 + r() * 1500, by = y0 + (y1 - y0) * (bx - E[0]) / (E[2] - E[0]);
      g.beginPath(); g.moveTo(bx, by + 4); g.lineTo(bx - 30, by + 88); g.stroke(); g.restore();
    }
    g.fillStyle = C.ink; g.fill(S().poly([[E[0], E[1]], [620, E[1]], [460, 120], [E[0], 330]]).path(1.4, 5));
    g.fillStyle = O.mix(C.tungstenLow, C.ink, 0.55); g.fill(S().poly([[E[0], 330], [460, 120], [500, 150], [E[0], 380]]).path(0.6, 6));
    const mat = S().poly([[30, 380], [480, 175], [690, 470], [250, 700]]);
    g.fillStyle = O.mix(C.ink, C.soot, 0.7); g.fill(mat.path(2.2, 7));
    g.save(); g.clip(mat.path(2.2, 7)); g.globalAlpha = 0.3; g.strokeStyle = C.tungstenLow; g.lineWidth = 2;
    for (let i = 0; i < 40; i++) { g.beginPath(); g.moveTo(0 + i * 18, 900); g.lineTo(400 + i * 18, 0); g.stroke(); } g.restore();
    printList().forEach((p, j) => {
      const sh = sole(p.kind).transform(printM(p)), path = sh.path(0.7, 30 + j);
      // the damp halo: the boards around the print drink the water and go a tone darker
      g.save(); g.globalAlpha = 0.2 * p.wet; g.fillStyle = C.ink; g.fill(sole(p.kind).transform(printM(p, 1.12)).path(2.4, 60 + j)); g.restore();
      // the print itself: wet wood, darker still
      g.save(); g.globalAlpha = 0.3 + 0.4 * p.wet; g.fillStyle = C.ink; g.fill(path); g.restore();
      // the lamp on the water: a glossy band across the toe side only, and a hard specular streak on the lamp edge of the toe
      if (p.wet > 0.25) {
        // the gloss: the print's own shape lit, then knocked back by itself shifted away from the lamp, leaving a crescent on the lamp
        // side; held to the toe half only
        const M = printM(p), d = [LPR[0] - p.x, LPR[1] - p.y], l = Math.hypot(d[0], d[1]), sh2 = 0.07 * p.k;
        g.save(); g.clip(path);
        g.save(); g.setTransform(g.getTransform().multiply(new DOMMatrix(M))); g.beginPath(); g.rect(0.12, -0.4, 0.6, 0.8); g.restore(); g.clip();
        const away = new Path2D(); away.rect(-400, -400, 2800, 2000); away.addPath(path, new DOMMatrix([1, 0, 0, 1, -d[0] / l * sh2, -d[1] / l * sh2])); g.clip(away, 'evenodd');
        g.globalAlpha = 0.85 * p.wet; g.fillStyle = O.mix(C.tungstenMid, C.tungsten, 0.4); g.fill(path);
        g.restore();
        g.save(); g.setTransform(g.getTransform().multiply(new DOMMatrix(M))); g.globalAlpha = 0.9 * p.wet; g.fillStyle = C.cardPaper;
        g.beginPath(); g.ellipse(0.4, -0.02, 0.07, 0.012, 0.3, 0, TAU); g.fill(); g.restore();
      }
    });
  }
  function printsInsert(c, lt, st) {
    const cam = { x: 960 + 20 * st, y: 540 + 6 * st, zoom: 1 + 0.014 * st };
    c.camera(cam);
    const E = PR.ext; const cv = c.cache('Q04.printsFloor4', (g) => { g.translate(-E[0], -E[1]); paintPrintsFloor(g); }, E[2] - E[0], E[3] - E[1]);
    c.g.drawImage(cv, E[0], E[1]);
    // glints on the wettest toes shiver with the room (on ones)
    const g = c.g, ps = printList(), fr = Math.floor(lt * 24);
    g.save(); g.fillStyle = C.cardPaper;
    ps.forEach((p, j) => { if (p.wet < 0.5) return; const on = ((fr + j * 7) % 11) < 2; if (!on) return; const q = handPt(printM(p), 0.42, -0.05);
      g.globalAlpha = 0.85; g.beginPath(); g.ellipse(q[0], q[1], 6, 2.2, p.a, 0, TAU); g.fill();
      c.em.fillStyle = C.tungsten; c.em.beginPath(); c.em.arc(q[0], q[1], 12, 0, TAU); c.em.fill(); });
    g.restore();
    // a drip off a coat by the door falls into the wettest heel print: the drop, then a ring that runs out across the water
    const P0 = ps.find(p => p.ti === 0 && p.i === 1), period = 0.95, ph = ((lt - T.prints + 0.804) % period) / period;   // lands at T.prints + 0.45
    if (P0) {
      g.save();
      if (ph < 0.32) { const y = lerp(P0.y - 420, P0.y, (ph / 0.32) ** 2); g.fillStyle = C.cardPaper; g.globalAlpha = 0.9; g.beginPath(); g.ellipse(P0.x + 8, y, 5, 12, 0, 0, TAU); g.fill(); c.em.fillStyle = C.cardPaper; c.em.beginPath(); c.em.arc(P0.x + 8, y, 10, 0, TAU); c.em.fill(); }
      else { const v = (ph - 0.32) / 0.68; g.strokeStyle = C.tungsten; g.globalAlpha = 0.95 * (1 - v); g.lineWidth = 3.5; g.beginPath(); g.ellipse(P0.x + 8, P0.y, 16 + 165 * v, 8 + 80 * v, 0.35, 0, TAU); g.stroke();
        g.globalAlpha *= 0.65; g.lineWidth = 2.5; g.beginPath(); g.ellipse(P0.x + 8, P0.y, 6 + 92 * v, 3 + 44 * v, 0.35, 0, TAU); g.stroke();
        if (v < 0.25) { g.globalAlpha = 0.9 * (1 - v * 4); g.fillStyle = C.cardPaper; g.beginPath(); g.ellipse(P0.x + 8, P0.y - 18 * Math.sin(v * 4 * Math.PI), 4, 6, 0, 0, TAU); g.fill(); } }
      g.restore();
    }
  }

  // ======================================================================== INSERT: the coaster (high angle on the trunk)
  // Marina wipes the ring (her left hand, from the left); Scott's hand brings a mat from the right; her right hand (rings) comes over
  // the trunk from the top and lifts her glass; he slides the mat under; she sets it down. Neither looks.
  function coasterInsert(c, lt, st) {
    c.camera(push(LV.cams.coaster, st, 0.004)); CACHE.cam = LV.cams.coaster;
    const u = lt - T.coaster, g = c.g;
    const wipe = seg(u, CB.wipe0, CB.wipe1);
    const lift = seg(u, CB.lift0, CB.lift1, 'outCubic') - seg(u, CB.down0, CB.down1, 'inOutSine');
    const G0 = LV.anchors.coaster.glass, under = LV.anchors.coaster.coasterUnderGlass;
    const glassAt = [G0[0] - 10 * lift, G0[1] - 46 * lift];
    const inU = seg(u, CB.in0, CB.in1, 'outCubic'), sl = seg(u, CB.slide0, CB.slide1, 'inOutSine');
    const cx = lerp(lerp(2250, 1500, inU), under[0], sl), cy = lerp(lerp(560, 640, inU), under[1], sl);
    const coLift = u < CB.slide0 ? 40 : lerp(40, 0, sl);
    const placed = u >= CB.slide1;
    const clothX = lerp(560, 760, bump(wipe * 1.5) * 0.6 + wipe * 0.4), clothY = 646 + 10 * Math.sin(TAU * 1.5 * wipe);
    const s = { ring: 1 - wipe * 0.9, wipe, glassAt, fill: 0.5, matStack: u > CB.in0 ? 4 : 5,
      coaster: u > CB.in0 - 0.2 ? { x: cx, y: cy, rot: lerp(0.5, 0.2, inU), lift: coLift, z: (placed || sl > 0.4) ? 'under' : 'over' } : null,
      cloth: { x: u < CB.lift0 ? clothX : 760, y: u < CB.lift0 ? clothY : 650, rot: -0.2 } };
    LV.back(c, lt, s, 'coaster');
    const light = { x: CO_L[0], y: CO_L[1] };
    const rim = sh => O.silhouette(g, sh, { light, rimColor: C.tungsten, rimW: 3.2, spread: 1.5 });
    // her left hand on the cloth, from the left edge, elbow down on the trunk; it withdraws as the other hand reaches for the glass
    const back = seg(u, CB.lift0 - 0.3, CB.lift0 + 0.15, 'inCubic');
    if (back < 1) {
      const ox = -back * 640, cl = [clothX + 20 + ox, clothY - 4];
      const A = arm('flat', cl, -0.18, 200, [cl[0] - 330, cl[1] + 70], [cl[0] - 760, cl[1] + 10], 54, false, { curl: 0.15 });
      rim(A.shape);
    }
    // her right hand: over the trunk from the top, wrist bent down onto the stem; her two rings catch the lamp
    const reach = seg(u, CB.lift0 - 0.5, CB.lift0, 'outCubic') * (1 - seg(u, CB.down1 + 0.25, CB.out1 + 0.4, 'inCubic'));
    if (reach > 0) {
      const pin = [glassAt[0] - 2, glassAt[1] - 78];
      const off = [(1 - reach) * -300, (1 - reach) * -420];
      const tip = [pin[0] + off[0], pin[1] + off[1]];
      const A = arm('pinch', tip, 0.32, 185, [tip[0] - 330, tip[1] - 230], [tip[0] - 470, tip[1] - 700], 50, true, {});
      rim(A.shape);
      [[0.36, 0.1], [0.4, 0.17]].forEach(([hx, hy], k) => { const q = handPt(A.M, hx, hy); g.save(); g.strokeStyle = k ? C.cardPaper : C.tungsten; g.lineWidth = 4; g.lineCap = 'round';
        g.beginPath(); g.arc(q[0], q[1], 9, -2.2, -0.3); g.stroke(); g.restore(); c.em.fillStyle = C.tungsten; c.em.beginPath(); c.em.arc(q[0], q[1] - 5, 12, 0, TAU); c.em.fill(); });
    }
    // Scott's hand with the mat, from the right, elbow up
    if (u > CB.in0 - 0.25 && u < CB.out1) {
      const out = seg(u, CB.out0, CB.out1, 'inCubic');
      const hp = placed ? [lerp(under[0] + 120, 2300, out), lerp(under[1] - 40, 560, out)] : [cx + 120, cy - coLift - 4];
      const A = arm('pinch', hp, Math.PI - 0.3, 215, [hp[0] + 320, hp[1] - 110], [hp[0] + 760, hp[1] - 300], 56, true, {});
      rim(A.shape);
    }
  }

  // ======================================================================== Kay in the kitchen doorway (medium, on ones); Scott sits beside her
  const COUCH_ARM = () => S().M(1196, 1140).L(1196, 1000).C(1196, 958, 1222, 936, 1268, 934).C(1318, 932, 1350, 946, 1366, 972).L(1392, 972)
    .C(1398, 900, 1420, 866, 1476, 860).C(1600, 852, 1760, 850, 1990, 846).L(1990, 1140).Z();
  function doorway(c, lt, st, o) {
    o = o || {};
    const dcam = push(LV.cams.doorway, st, 0.0045); c.camera(dcam); CACHE.cam = dcam;
    LV.draw(c, lt, { walla: 1 }, 'doorway');
    const light2 = { x: 2500, y: 120 };
    if (o.scott) {
      // the living-room lamp, off right, lays its pool on the wall beside the door: Scott sits against it
      const cv = c.cache('Q04.doorWall2', (q) => {
        q.save(); q.beginPath(); q.rect(1168, -200, 1100, 1500); q.clip();
        O.lightPool(q, 1720, 600, [{ r: 900, color: O.mix(C.tungstenLow, C.ink, 0.25) }, { r: 640, color: C.tungstenLow }, { r: 400, color: O.mix(C.tungstenMid, C.tungstenLow, 0.2) }], { sy: 1.0, seed: 77, rough: 3 });
        q.restore();
        q.fillStyle = C.ink; q.fill(S().rect(1110, -200, 58, 1500).path(0.8, 3));
      }, 2400, 1400);
      c.g.drawImage(cv, 0, 0);
    }
    const k = LV.anchors.doorway.kay;
    const sip = o.sip != null ? bump(seg(lt, o.sip, o.sip + 1.4)) * 0.6 : 0;
    const F = R.figure('kay', { x: k.x, y: k.y, scale: k.scale, facing: 1, t: lt, pose: 'stand', lean: -0.14, neck: 0.06, head: o.head == null ? 0.12 : o.head,
      legN: { a: -0.1, b: 0 }, legF: { a: 0.22, b: 0.04 }, armN: { a: 0.2, b: 1.75, hand: 'relaxed' },
      hold: { F: { kind: 'glass', fill: 0.42, lip: true, drink: sip } }, look: o.look || [1700, 640], lookAmt: 0.85 });
    full(c, F, { light: { x: DOOR_L.jamb[0] - 40, y: DOOR_L.jamb[1] - 120 }, color: C.tungsten, w: 4.5, falloff: false, details: NOBEADS });
    if (o.scott) {
      // Scott drops onto the arm of the couch beside her: a tentative half-start, too far, corrected (his curve). He looks up at her.
      const u = R.curve('scott', clamp((tw(lt) - (T.perch + 0.2)) / 0.85, 0, 1));
      const hipY = lerp(690, 940, u), up = seg(lt, T.perch + 0.95, T.perch + 1.35, 'inOutSine');
      const sp = { x: lerp(1450, 1290, u), y: hipY, scale: 165, facing: -1, anchor: 'hip', t: lt, idleAmt: 0.5, lean: lerp(0.3, 0.06, u), neck: 0.08, head: lerp(0.55, -0.2, up),
        legN: { a: lerp(0.12, 1.4, u), b: lerp(0.15, 1.5, u) }, legF: { a: lerp(0.0, 1.25, u), b: lerp(0.1, 1.4, u) },
        armN: { a: lerp(0.6, 0.95, u), b: lerp(1.0, 1.15, u), hand: 'relaxed', w: 1.25 }, hold: { N: { kind: 'bowl', crisps: 9, at: [lerp(1290, 1180, u), lerp(690, 830, u)] } },
        look: up > 0 ? [760, 250] : undefined, lookAmt: 0.85 * up };
      const SF = R.figure('scott', sp);
      // the couch arm under him: one rimmed ink shape, lit along its top from the lamp
      O.silhouette(c.g, COUCH_ARM(), { light: light2, rimColor: C.tungstenMid, rimW: 4, spread: 1.3 });
      full(c, SF, { light: light2, color: C.tungsten, w: 4.5, falloff: false });
    }
  }

  // ======================================================================== DEENA SEES THEM: over her shoulder
  // The room beyond, framed on the kitchen doorway: Kay leaning, Scott on the couch arm beside her. Deena large in the right foreground,
  // in profile, so her look runs clear across the room to them. Her chin lifts; a crimson cursor at her lips for six frames, one blink;
  // it dies. Silence. She looks away, sips, turns, and goes through to the dining table.
  const camOTS = { x: 250, y: 560, zoom: 1.3 };
  function deenaOTS(c, lt, st) {
    const cam = push(camOTS, st, 0.004);
    wide(c, lt, cam, { hide: ['deena', 'marina'], full: ['kay'] });
    const u = lt - T.deenaSees, g = c.g;
    c.reset(); CACHE.cam = { x: 960, y: 540, zoom: 1 };
    const lampS = scr(cam, [LAMP.x, LAMP.y - 30]);
    const them = scr(cam, [ARM_SEAT.x - 10, 470]);
    const lift = seg(u, DS.open - 0.12, DS.open + 0.06) * (1 - seg(u, DS.close, DS.close + 0.14));
    const away = seg(u, DS.away, DS.away + 0.2, 'outCubic');
    const sip = u > DS.sip0 && u < DS.sip1 ? bump(seg(u, DS.sip0, DS.sip1)) * 0.85 : 0;
    const sc = 250, X0 = 1640, Y0 = 2060;
    let spec = { x: X0, y: Y0, scale: sc, facing: -1, pose: 'stand', t: lt, gesture: 'handOnHip', lean: 0.02, neck: -0.06,
      head: -0.12 - 0.2 * lift + 0.35 * away, look: away > 0.5 ? [them[0] + 300, them[1] + 700] : them, lookAmt: 0.9,
      legN: { a: 0.06, b: 0.02 }, legF: { a: -0.06, b: 0.02 }, hold: { F: { kind: 'glass', fill: 0.45 } } };
    if (sip > 0) {
      const F0 = R.figure('deena', spec), hd = F0.joints.head, rest = (F0.holds && F0.holds.F && F0.holds.F.tip) || [X0 - 1.2 * sc, Y0 - 5.2 * sc];
      const lips = [hd[0] - 0.5 * sc, hd[1] + 0.42 * sc];
      spec = Object.assign({}, spec, { hold: { F: { kind: 'glass', fill: 0.45, drink: sip, at: [lerp(rest[0], lips[0], sip), lerp(rest[1], lips[1], sip)] } } });
    }
    if (u >= DS.turn) {
      const tr = R.turn('deena', lt, T.deenaSees + DS.turn, -1, 1);
      spec = Object.assign({}, spec, { facing: tr.facing, squash: tr.squash, look: undefined });
      if (u >= DS.walk) { const wk = R.walk('deena', lt, { x0: X0, scale: sc, facing: 1, t0: T.deenaSees + DS.walk, speed: 1.4 });
        spec = Object.assign({}, spec, wk, { y: Y0, facing: 1, gesture: undefined, look: undefined, hold: { F: { kind: 'glass', fill: 0.3 } } }); }
    }
    const F = R.figure('deena', spec);
    fast(c, F, { light: { x: lampS[0], y: lampS[1] }, color: C.tungsten, w: 5, details: { hoopColor: C.tungsten } });
    // the crimson cursor: six frames at her lips (one blink), then nothing
    const f = Math.floor((lt - (T.deenaSees + DS.cur)) * 24 + 1e-6);
    if (f >= 0 && f < 6 && f !== 3) { const hd = F.joints.head; g.fillStyle = C.tDeena; g.fillRect(hd[0] - 0.78 * sc, hd[1] + 0.02 * sc, 0.055 * sc, 0.3 * sc); }
    CACHE.cam = cam;
  }

  // ======================================================================== INSERT: Angelo's hands, the box, the deck
  // a playing-card tuck box: a squat face with a pip panel, its thickness on the lit side, and a tuck flap that flicks open
  function tuckBox(g, x, y, rot, s, flap, slide) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    const w = 16, h = 21, dpt = 6;
    // the deck sliding out of the top
    if (slide > 0) { const dy = -34 * slide; g.fillStyle = O.mix(C.cardPaper, C.tungstenMid, 0.3); g.fillRect(-w + 2, -h + dy - 1, 2 * w - 4, 40); g.fillStyle = C.cardPaper; g.fillRect(-w + 2, -h + dy - 2, 2 * w - 4, 3);
      g.fillStyle = C.cardBlue; g.fillRect(-w + 4, -h + dy + 2, 2 * w - 8, 30); g.strokeStyle = C.cardPaper; g.lineWidth = 0.8; g.strokeRect(-w + 6, -h + dy + 4, 2 * w - 12, 26); }
    // the box's thickness (side panel), then its face
    g.fillStyle = O.mix(C.cardBlue, C.ink, 0.45); g.beginPath(); g.moveTo(w, -h); g.lineTo(w + dpt, -h - 3); g.lineTo(w + dpt, h - 3); g.lineTo(w, h); g.fill();
    g.fillStyle = C.cardBlue; g.fillRect(-w, -h, 2 * w, 2 * h);
    g.strokeStyle = C.cardPaper; g.lineWidth = 0.9; g.strokeRect(-w + 2.5, -h + 2.5, 2 * w - 5, 2 * h - 5);
    g.fillStyle = C.cardPaper; [[0, -2.5, 4.2, 6.5]].forEach(([px, py, rx, ry]) => { g.beginPath(); g.moveTo(px, py - ry); g.lineTo(px + rx, py); g.lineTo(px, py + ry); g.lineTo(px - rx, py); g.fill(); });
    g.fillRect(-7, 9, 14, 1.6); g.fillRect(-5, 12.4, 10, 1.2);
    [[-10, -14], [10, -14], [-10, 15], [10, 15]].forEach(([px, py]) => { g.beginPath(); g.arc(px, py, 1.2, 0, TAU); g.fill(); });
    // the tuck flap: hinged at the top back edge; closed it is a dark strip, open it stands up with its tongue, the inside showing
    const a = flap;                                              // 0 closed .. 1 open (may overshoot)
    const fh = 6.5 * Math.sin(clamp(a, 0, 1.2) * Math.PI / 2), tg = 3.5 * clamp(a, 0, 1.2);
    g.fillStyle = a > 0.35 ? O.mix(C.cardPaper, C.tungstenMid, 0.25) : O.mix(C.cardBlue, C.ink, 0.3);
    g.beginPath(); g.moveTo(-w, -h); g.lineTo(w, -h); g.lineTo(w - 0.5, -h - fh); g.lineTo(w - 4, -h - fh); g.quadraticCurveTo(0, -h - fh - tg * 2, -w + 4, -h - fh); g.lineTo(-w + 0.5, -h - fh); g.closePath(); g.fill();
    if (a > 0.35) { g.fillStyle = C.cardBlue; g.fillRect(-w + 0.5, -h - fh, 2 * w - 1, 1.6); g.fillStyle = C.tungsten; g.fillRect(-w, -h - 0.6, 2 * w, 1.2); }
    g.restore();
  }
  function angeloHands(c, lt, st) {
    const u = lt - T.angelo, g = c.g;
    c.camera({ x: 960, y: 540, zoom: 1 + 0.01 * st }); CACHE.cam = { zoom: 1 };
    const cv = c.cache('Q04.lapBack', (q) => {
      q.fillStyle = C.ink; q.fillRect(-100, -100, 2120, 1280);
      O.lightPool(q, -260, 360, [{ r: 1500, color: O.mix(C.tungstenLow, C.ink, 0.4) }, { r: 980, color: C.tungstenLow }, { r: 560, color: C.tungstenMid }], { sy: 0.8, seed: 51, rough: 3 });
      q.fillStyle = C.ink; q.fill(S().M(-100, 1180).L(-100, 860).C(300, 790, 900, 800, 1300, 900).C(1500, 950, 1600, 1060, 1640, 1180).Z().path(2, 8));
      q.fill(S().M(1500, 1180).L(1560, 520).C(1580, 420, 1760, 400, 1800, 470).L(2020, 470).L(2020, 1180).Z().path(2, 9));
      O.silhouette(q, S().M(-100, 1180).L(-100, 860).C(300, 790, 900, 800, 1300, 900).C(1500, 950, 1600, 1060, 1640, 1180).Z(), { noFill: true, light: { x: -260, y: 360 }, rimColor: C.tungstenMid, rimW: 4 });
      O.silhouette(q, S().M(1500, 1180).L(1560, 520).C(1580, 420, 1760, 400, 1800, 470).L(2020, 470).L(2020, 1180).Z(), { noFill: true, light: { x: -260, y: 360 }, rimColor: C.tungstenMid, rimW: 4 });
    }, 2120, 1280);
    g.drawImage(cv, -100, -100);
    const light = { x: -260, y: 360 };
    const rimIt = (sh, w) => O.silhouette(g, sh, { light, rimColor: C.tungsten, rimW: w || 3.4, spread: 1.6 });
    // the box rises into his grip, the flap flicks open (overshoot, settle), the deck is thumbed out, the box drops away into his lap
    const rise = seg(u, 0, 0.25, 'outCubic'), drop = seg(u, 1.05, 1.4, 'inCubic');
    const bx = 880, by = lerp(800, 600, rise) + drop * 600, rot = -0.16 - drop * 0.5, s = 5.6;
    const fl = seg(u, 0.1, 0.2), flap = fl < 1 ? fl * 1.25 : 1.25 - 0.25 * seg(u, 0.2, 0.3);
    const slide = seg(u, 0.35, 0.95, 'outCubic');
    const BX = (x, y) => [bx + (x * Math.cos(rot) - y * Math.sin(rot)) * s, by + (x * Math.sin(rot) + y * Math.cos(rot)) * s];
    // the far hand: palm behind the box, the arm from the lower left (jacket sleeve, cuff, wrist)
    const pb = BX(-4, 8);
    const A1 = arm('open', [pb[0] + 30, pb[1] - 20], rot - 1.35, 240, [pb[0] - 330, pb[1] + 210], [pb[0] - 820, pb[1] + 420], 62, false, {});
    rimIt(A1.shape);
    if (drop < 1) tuckBox(g, bx, by, rot, s, flap, u < 0.95 ? slide : 0);
    if (drop < 0.4) {
      const fs = S(); [-7, -1.5, 4, 9.5].forEach((y, i) => { const a0 = BX(16 + 7, y - 1), a1 = BX(16 - 4.5 + (i === 3 ? 1 : 0), y + 0.5); fs.capsule(a0[0], a0[1], 15, a1[0], a1[1], 10.5); });
      const t0 = BX(-16 - 7, 13), t1 = BX(-16 + 5, 6); fs.capsule(t0[0], t0[1], 17, t1[0], t1[1], 11);
      rimIt(fs, 2.6);
    }
    // the deck, once it is out, travels with the near hand
    const k = seg(u, 0.95, 1.4, 'outCubic');
    const top = BX(0, -21 - 34 * slide);
    const dk = [top[0] + 20 + k * 150, top[1] + 60 + k * 40], sd = 4.4;
    if (u >= 0.95) {
      g.save(); g.translate(dk[0], dk[1]); g.rotate(rot + k * 0.5);
      for (let i = 3; i >= 0; i--) { g.fillStyle = i ? O.mix(C.cardPaper, C.tungstenMid, 0.35) : C.cardPaper; g.fillRect(-14 * sd + i * 2, -20 * sd + i * 3, 28 * sd, 40 * sd); }
      g.fillStyle = C.cardBlue; g.fillRect(-11 * sd, -17 * sd, 22 * sd, 34 * sd); g.strokeStyle = C.cardPaper; g.lineWidth = 3; g.strokeRect(-8 * sd, -14 * sd, 16 * sd, 28 * sd);
      g.fillStyle = C.tungsten; g.fillRect(-14 * sd, -20 * sd, 28 * sd, 3); g.restore();
    }
    // the near hand: thumb and finger pinching the deck's top edge, pulling it up and out, from the upper right
    const tip = u < 0.95 ? [top[0] + 14, top[1] + 10] : [dk[0] + Math.sin(rot + k * 0.5) * 20 * sd, dk[1] - Math.cos(rot + k * 0.5) * 20 * sd + 10];
    const A2 = arm('pinch', tip, 2.35, 250, [tip[0] + 300, tip[1] - 150], [tip[0] + 760, tip[1] - 260], 60, true, {});
    rimIt(A2.shape);
  }

  // ======================================================================== SOUND: a few of our own
  if (window.SOUND) {
    const SD = window.SOUND;
    SD.cues['Q04.clink'] = (ac, B, t, p) => {     // glasses touching: thin inharmonic sines
      const f = p.f || 3100;[[1, 1], [2.32, 0.5], [3.1, 0.25]].forEach(([m, a]) => { if (f * m > 10500) return; const g = SD.gain(ac, 0); SD.perc(g, t, SD.db(p.level || -34) * a, 0.001, 0.35 + 0.2 * a); SD.chain(SD.osc(ac, 'sine', f * m, t, t + 0.7), g, SD.pan(ac, p.pan || 0), B.fx); });
      if (p.two) { const t2 = t + 0.06; [[1.07, 0.8], [2.5, 0.35]].forEach(([m, a]) => { const g = SD.gain(ac, 0); SD.perc(g, t2, SD.db(p.level || -34) * a, 0.001, 0.3); SD.chain(SD.osc(ac, 'sine', f * m, t2, t2 + 0.6), g, SD.pan(ac, p.pan || 0), B.fx); }); }
    };
    SD.cues['Q04.laugh'] = (ac, B, t, p, Rn) => {   // a room laughing: 'ha' pulses through vowel formants, falling in pitch and level
      const n = p.n || 4, dur = p.dur || 1.4, lv = SD.db(p.level || -26);
      for (let v = 0; v < n; v++) {
        const t0 = t + v * 0.07 + Rn() * 0.12, f0 = (v % 2 ? 210 : 140) * (0.9 + Rn() * 0.25), rate = 4.6 + Rn() * 1.6, pulses = Math.max(2, Math.floor(dur * rate * (0.7 + Rn() * 0.4)));
        const out = SD.gain(ac, 1); SD.chain(out, SD.pan(ac, (v / Math.max(1, n - 1) - 0.5) * 1.2), B.room); out.connect(B.reverb);
        const f1 = SD.filt(ac, 'bandpass', 760 + Rn() * 80, 5), f2 = SD.filt(ac, 'bandpass', 1250 + Rn() * 120, 7), mixg = SD.gain(ac, 1); f1.connect(mixg); f2.connect(mixg); mixg.connect(out);
        const vo = SD.osc(ac, 'sawtooth', f0, t0, t0 + dur + 0.3), vg = SD.gain(ac, 0); vo.frequency.setValueAtTime(f0 * 1.15, t0); vo.frequency.exponentialRampToValueAtTime(f0 * 0.82, t0 + dur);
        const nz = SD.src(ac, 'pink', 200 + v, t0, t0 + dur + 0.3), ng = SD.gain(ac, 0);
        SD.chain(vo, vg); vg.connect(f1); vg.connect(f2); SD.chain(nz, ng); ng.connect(f1); ng.connect(f2);
        for (let i = 0; i < pulses; i++) { const tt = t0 + i / rate, dec = Math.pow(1 - i / pulses, 1.3); const a = lv * dec * (0.6 + Rn() * 0.4);
          vg.gain.setValueAtTime(0, tt); vg.gain.linearRampToValueAtTime(a * 0.5, tt + 0.02); vg.gain.linearRampToValueAtTime(0, tt + 0.6 / rate);
          ng.gain.setValueAtTime(0, tt); ng.gain.linearRampToValueAtTime(a * 1.4, tt + 0.012); ng.gain.linearRampToValueAtTime(0, tt + 0.5 / rate); }
      }
    };
    SD.cues['Q04.tock'] = (ac, B, t, p) => { const g = SD.gain(ac, 0); SD.perc(g, t, SD.db(p.level || -24), 0.001, 0.07); SD.chain(SD.osc(ac, 'sine', 420, t, t + 0.12), SD.filt(ac, 'lowpass', 900, 1), g, B.fx); const g2 = SD.gain(ac, 0); SD.perc(g2, t, SD.db((p.level || -24) - 8), 0.0005, 0.02); SD.chain(SD.src(ac, 'white', 211, t, t + 0.04), SD.filt(ac, 'bandpass', 2600, 2), g2, B.fx); };
    SD.cues['Q04.wipe'] = (ac, B, t, p) => { for (let i = 0; i < (p.n || 2); i++) { const tt = t + i * (p.gap || 0.42), d = 0.3; const g = SD.gain(ac, 0); g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(SD.db(p.level || -34), tt + d * 0.4); g.gain.linearRampToValueAtTime(0, tt + d); SD.chain(SD.src(ac, 'pink', 221 + i, tt, tt + d + 0.05), SD.filt(ac, 'bandpass', 1800, 0.8), g, B.fx); } };
    // Deena's cursor: one tiny dry tick, a key that is pressed and not typed (not a card sound)
    SD.cues['Q04.tick'] = (ac, B, t, p) => { const g = SD.gain(ac, 0); SD.perc(g, t, SD.db(p.level || -32), 0.0004, 0.009); SD.chain(SD.src(ac, 'white', 241, t, t + 0.03), SD.filt(ac, 'highpass', 5200, 0.7), g, SD.pan(ac, 0.35), B.fx);
      const g2 = SD.gain(ac, 0); SD.perc(g2, t, SD.db((p.level || -32) - 6), 0.0005, 0.018); SD.chain(SD.osc(ac, 'sine', 1900, t, t + 0.05), g2, SD.pan(ac, 0.35), B.fx); };
    // the party groove: SOUND.beds.groove note for note, phase-locked. p.downbeat = a time at which a bar of chord 0 starts (the cut into Q05);
    // notes already sounding at t0 come in at their decayed level, so the music is playing from frame 0 with no fade-in
    SD.beds['Q04.groove'] = (ac, B, t0, t1, p) => {
      const out = SD.gain(ac, 0), L = SD.db(p.level == null ? -26 : p.level); out.connect(B.music);
      out.gain.setValueAtTime(L, t0); out.gain.setValueAtTime(L, Math.max(t0, t1 - 0.012)); out.gain.linearRampToValueAtTime(0, t1);
      const chords = [[146.8, 174.6, 220, 261.6, 329.6], [98, 123.5, 174.6, 220, 329.6], [130.8, 164.8, 196, 246.9, 293.7], [110, 138.6, 164.8, 196, 233.1]];
      const e = 60 / 70 / 3, barL = e * 6, db = p.downbeat == null ? t0 : p.downbeat;
      let bi = Math.floor((t0 - 1.7 - db) / barL);
      for (let tb = db + bi * barL; tb < t1; tb += barL, bi++) {
        const ch = chords[((bi % 4) + 4) % 4];
        for (const k of [0, 3, 5]) {
          const tt = tb + k * e; if (tt >= t1 || tt + 1.6 <= t0) continue;
          ch.forEach((f, i) => {
            const peak = (k ? 0.05 : 0.08) / (1 + i * 0.3), a = 0.005, d = k ? 0.5 : 1.4; const g = SD.gain(ac, 0);
            if (tt >= t0) SD.perc(g, tt, peak, a, d);
            else { const el = t0 - tt - a; if (el >= d) return; g.gain.setValueAtTime(peak * Math.pow(1e-3, Math.max(0, el) / d), t0); g.gain.exponentialRampToValueAtTime(Math.max(1e-5, peak * 1e-3), tt + a + d); }
            const ts = Math.max(t0, tt), o = SD.osc(ac, 'sine', f * (k === 5 ? 2 : 1), ts, tt + 1.6), m = SD.osc(ac, 'sine', f * 2, ts, tt + 1.6), mg = SD.gain(ac, f * 1.2);
            SD.chain(m, mg); mg.connect(o.frequency); SD.chain(o, g, out);
          });
        }
      }
    };
    SD.beds['Q04.walla'] = (ac, B, t0, t1, p) => {   // the room's chatter (SOUND.beds.walla's voices), at level from frame 0, with level steps
      const g = SD.gain(ac, 0); g.gain.setValueAtTime(SD.db(p.level || -30), t0);
      (p.steps || []).forEach(([t, d, tc]) => g.gain.setTargetAtTime(SD.db(d), t, tc || 0.25));
      g.gain.setValueAtTime(SD.db(p.endLevel || p.level || -30), t1 - 0.4); g.gain.setValueAtTime(SD.db(p.endLevel || p.level || -30), t1 - 0.012); g.gain.linearRampToValueAtTime(0, t1);
      if (SD.wallaRec(ac, g, t0, t1)) { g.connect(B.room); return; }
      for (let v = 0; v < 6; v++) { const s = SD.src(ac, 'pink', 40 + v, t0, t1, 0.9 + v * 0.03); const fs = [[500 + v * 40, 6], [1500 + v * 90, 8], [2500, 9]]; const vg = SD.gain(ac, 0.6); fs.forEach(([f, q]) => SD.chain(s, SD.filt(ac, 'bandpass', f, q), vg)); const am = SD.osc(ac, 'sine', 2.2 + v * 0.7, t0, t1), ag = SD.gain(ac, 0.5); SD.chain(am, ag); ag.connect(vg.gain); SD.chain(vg, SD.pan(ac, (v - 2.5) / 3), g); }
      g.connect(B.room);
    };
  }

  // ======================================================================== framings of the room
  const camWide = LV.cams.wide;
  const camStory = { x: 1110, y: 440, zoom: 1.5 };           // Christof holds the room; Deena cuts in from his right
  const camTable = { x: 1070, y: 630, zoom: 1.15 };           // the trunk: Scott and Marina, heads in frame
  const camScott = { x: 520, y: 620, zoom: 1.55 };
  const camAngelo = { x: 1760, y: 480, zoom: 1.8 };

  // Deena's line points at Christof's head wherever he is in frame
  function deenaPoint(c, s, o) {
    const F = CACHE.figs && CACHE.figs.christof, cam = CACHE.cam; const oo = Object.assign({}, o, { align: 'right' });
    if (F && cam && cam.x != null) { const p = scr(cam, F.joints.head); oo.pointTo = [p[0] + 30, p[1] - 30]; }
    O.say(c.g, 'deena', s.T.text, 1860, 112, oo);
  }
  // Marina's line: the wine ring circles 'live' only once 'live' has been typed, and draws itself round in a quarter second
  function marinaRing(c, s, o) {
    const g = c.g, oo = Object.assign({}, o); delete oo.ringWord;
    const str = s.T.text, x = 90, y = 960; O.say(g, 'marina', str, x, y, oo);
    const word = 'live', i = str.indexOf(word); if (i < 0) return;
    const typed = Math.round(str.length * Math.min(1, s.p)); if (typed < i + word.length) return;
    const F = O.FACE.marina, cell = (() => { g.save(); g.font = O.font(F); const w = g.measureText('M').width; g.restore(); return w; })();
    const k = clamp((c.lt - (s.T.inEnd - (str.length - i - word.length) * 0.028)) / 0.25, 0, 1);
    const cx = x + (i + word.length / 2) * cell, rw = cell * word.length * 0.62, a0 = 0.2, a1 = a0 + (TAU - 0.35) * k;
    g.save(); g.globalAlpha = o.alpha == null ? 1 : o.alpha; g.strokeStyle = O.rgba(C.wine, 0.95); g.lineWidth = 3; g.beginPath(); g.ellipse(cx, y - F.size * 0.3, rw, F.size * 0.62, -0.06, a0, a1); g.stroke(); g.restore();
  }
  // Angelo's long line, dealt like cards on three rows ("exposure" dealt big), on the darkened top of the wall.
  function angeloRows(c, s, o) {
    const txt = s.T.text; const q = txt.indexOf('? ') + 1; const a = txt.slice(0, q), rest = txt.slice(q + 1);
    const mid = rest.indexOf(' hear ') + 5; const rows = [a, rest.slice(0, mid), rest.slice(mid + 1)];
    const F = O.FACE.angelo, size = F.size, gap = size * 0.28, g = c.g;
    const words = []; rows.forEach((r, ri) => r.split(' ').forEach(w => words.push({ w, ri })));
    const dealt = s.p * words.length, landed = Math.floor(dealt + 1e-6), frac = dealt - landed;
    let ri = -1, x = 0;
    words.forEach((it, i) => {
      if (it.ri !== ri) { ri = it.ri; x = 64; }
      const big = /exposure/i.test(it.w), sz = big ? size * 1.6 : size; const y = 104 + ri * 78 + (ri === 2 ? 8 : 0);
      g.save(); g.font = O.font(Object.assign({}, F, { size: sz })); const w = g.measureText(it.w).width; g.restore();
      if (i < landed) O.say(g, 'angelo', it.w, x, y, { p: 1, alpha: o.alpha, size: sz, seed: 7 + i, spread: 0.3 });
      else if (i === landed && s.p < 1) { g.save(); g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * 0.85; g.translate(x + w * 0.2, y - size * 0.32 * (1 - frac)); g.rotate(-0.42 * (1 - frac)); O.text(g, it.w, 0, 0, Object.assign({}, F, { size: sz * 0.86 })); g.restore(); }
      x += w + gap;
    });
  }
  // the top of the wall above the dining doorway, in Angelo's medium: the lamp pool's falloff, a darker band for his rows of type
  function angeloWall(c) {
    const g = c.g;
    const p = (CACHE.wallP = CACHE.wallP || S().M(900, -200).L(2500, -200).L(2500, 296).C(2200, 318, 1900, 300, 1660, 312).C(1450, 322, 1250, 300, 900, 318).Z().path(2.2, 31));
    g.save(); g.fillStyle = O.mix(C.ink, C.soot, 0.3); g.fill(p); g.restore();
  }

  // Kay's type, as in Q03 (story-wide): 48 px, warm ivory at full opacity, set in the ink beside her head. The kit's Kay renderer
  // takes its colour from the face, so the face is lent the ivory for the one call; the fog-on entrance and the lipstick exit are
  // the kit's own and unchanged.
  const KAY_IVORY = '#F4E8CF';
  function kayIvory(x, y) {
    return (c, s, o) => {
      const F = O.FACE.kay, col = F.color; F.color = KAY_IVORY;
      try { O.say(c.g, 'kay', s.T.text, x, y, o); } finally { F.color = col; }
    };
  }

  FILM.seq({
    id: 'Q04', title: 'The party', dur: T.end, letterbox: 1.7778,
    lines: [
      { id: 'L033', at: LN.L033, x: 64, y: 104, until: LN.L034 - 0.22, opts: { bulbs: true } },
      { id: 'L034', at: LN.L034, x: 1860, y: 112, draw: deenaPoint },
      { id: 'L035', at: LN.L035, x: 64, y: 104, opts: { bulbs: true } },
      { id: 'L036', at: LN.L036, x: 40, y: 164, size: 48, draw: kayIvory(40, 164) },            // on the ink above her head, over the lit doorway
      { id: 'L037', at: LN.L037, x: 960, y: 100, align: 'center', opts: { bulbs: true } },
      { id: 'L038', at: LN.L038, x: 1880, y: 1012, align: 'right', until: 17.0 },
      { id: 'L039', at: LN.L039, x: 960, y: 104, align: 'center', size: 62, opts: { big: ['twelve-quid', 'drink.'], bulbs: true }, until: 18.2 },
      { id: 'L040', at: LN.L040, x: 90, y: 960, draw: marinaRing },
      { id: 'L041', at: LN.L041, x: 90, y: 1030 },
      { id: 'L042', at: LN.L042, x: 760, y: 1030 },
      { id: 'L043', at: LN.L043, x: 170, y: 340, size: 48, until: T.scott, draw: kayIvory(170, 340) },   // on the ink behind her head, level with it;
                                                                                                        // held to the cut, so only her lipstick glyph crosses it
      { id: 'L044', at: LN.L044, x: 60, y: 1018 },
      { id: 'L045', at: LN.L045, x: 600, y: 990, size: 48, draw: kayIvory(600, 990) },          // same Kay type; still by the legs he looks down at
      { id: 'L046', at: LN.L046, x: 938, y: 215, size: 64, draw: kayIvory(938, 215) },         // same Kay type, kept large (the beat's payoff), wholly on the dark cabinet
      { id: 'L047', at: LN.L047, x: 64, y: 104, until: LN.L048 - 0.25, draw: angeloRows },
      { id: 'L048', at: LN.L048, x: 64, y: 104, opts: { bulbs: true } },
      { id: 'L049', at: LN.L049, x: 660, y: 196 },
    ],
    sound(S) {
      const E = T.end;
      // the music and the room are already going when we cut in ('LATER'), and run at level straight into Q05's opening
      S.bed('Q04.groove', 0, E, { level: -21, downbeat: E });
      S.bed('Q04.walla', 0, E, { level: -15, endLevel: -15, steps: [[LN.L033 - 0.2, -17], [7.9, -15.5], [9.0, -17], [BIG - 0.05, -13, 0.08], [BIG + 1.6, -16.5, 0.5],
        [T.deenaSees + DS.open - 0.1, -30, 0.1], [T.deenaSees + DS.away + 0.1, -17, 0.4], [T.angeloMed, -16], [RIFFLE, -15]] });
      S.bed('room', 0, E, { level: -40 });
      // cut in on a laugh and a clink
      S.cue('Q04.laugh', 0.0, { n: 5, dur: 1.6, level: -19 });
      S.cue('Q04.clink', 0.25, { f: 3300, two: true, level: -26, pan: 0.3 });
      S.cue('Q04.clink', 1.4, { f: 2850, level: -30, pan: -0.4 });
      S.cue('Q04.clink', 5.6, { f: 3500, two: true, level: -33, pan: 0.5 });
      // the prints: a drip off a coat into the wettest print
      S.cue('drip', T.prints + 0.45, { level: -22 });
      // the story beats: small laughs; Angelo's heckle gets one; the twelve-quid drink brings the house down
      S.cue('Q04.laugh', 7.95, { n: 2, dur: 0.6, level: -28 });
      S.cue('Q04.laugh', 14.85, { n: 3, dur: 0.8, level: -25 });
      S.cue('Q04.laugh', BIG, { n: 7, dur: 2.1, level: -11 });
      S.cue('Q04.laugh', BIG + 0.35, { n: 4, dur: 1.5, level: -15 });
      S.cue('Q04.clink', BIG + 0.45, { f: 3150, two: true, level: -26, pan: -0.2 });
      // the coaster: two strokes of the cloth, the glass set down on the mat
      S.cue('Q04.wipe', tCo(CB.wipe0), { n: 2, gap: 0.5, level: -28 });
      S.cue('Q04.tock', tCo(CB.down1) - 0.03, { level: -19 });
      S.cue('Q04.laugh', 26.0, { n: 3, dur: 0.7, level: -27 });
      // Scott drops onto the arm of the couch
      S.cue('thump', T.perch + 0.62, { level: -24, pan: 0.4 });
      S.cue('Q04.laugh', 33.2, { n: 2, dur: 0.6, level: -29 });
      // Deena's unsaid word: the room drops away; one dry tick as the cursor shows, nothing when it dies; the silence holds
      S.duck(T.deenaSees + DS.open - 0.1, T.deenaSees + DS.away, 0.28);
      S.cue('Q04.tick', T.deenaSees + DS.cur, { level: -30 });
      // Angelo's deck: the flap, the slide, the deck slapped into his palm; the riffle and its snap
      S.cue('flick', T.angelo + 0.12, { level: -23 });
      S.cue('whoosh', T.angelo + 0.4, { dur: 0.5, level: -28 });
      S.cue('slap', T.angelo + 1.0, { level: -21 });
      S.cue('riffle', RIFFLE, { level: -19 });
      S.cue('slap', RIFFLE + 0.58, { level: -20 });
      S.cue('Q04.laugh', RIFFLE + 0.1, { n: 3, dur: 0.8, level: -25 });
    },
    shots: [
      { at: 0, name: 'wide: the party is going', draw(c, st, lt) { wide(c, lt, push(camWide, st, 0.004)); } },
      { at: T.prints, name: 'insert: wet prints by the door', draw(c, st, lt) { printsInsert(c, lt, st); } },
      { at: T.story, name: 'Christof: the story; Deena cuts in', draw(c, st, lt) { wide(c, lt, push(camStory, st, 0.0035), { full: ['christof', 'deena'] }); } },
      { at: T.wide, name: 'wide: F04 (Kay asks, Angelo heckles, twelve-quid)', draw(c, st, lt) { wide(c, lt, push(camWide, st, 0.004)); } },
      { at: T.coaster, name: 'insert: the coaster', draw(c, st, lt) { coasterInsert(c, lt, st); } },
      { at: T.borrowed, name: 'table: borrowed table', draw(c, st, lt) { wide(c, lt, push(camTable, st, 0.0035)); } },
      { at: T.kay1, name: 'doorway: sit down, Scott', draw(c, st, lt) { doorway(c, lt, st, { look: [1800, 760] }); } },
      { at: T.scott, name: 'Scott: I\'m sitting', draw(c, st, lt) { wide(c, lt, push(camScott, st), { full: ['scott'] }); } },
      { at: T.perch, name: 'doorway: Scott sits. Better.', draw(c, st, lt) { doorway(c, lt, st, { scott: true, look: lt < T.perch + 0.9 ? [1500, 380] : [1420, 520], head: lt < T.perch + 0.9 ? 0.12 : 0.3, sip: T.perch + 1.9 }); } },
      { at: T.deenaSees, name: 'Deena sees them (over her shoulder)', draw(c, st, lt) { deenaOTS(c, lt, st); } },
      { at: T.angelo, name: 'insert: the box, the deck', draw(c, st, lt) { angeloHands(c, lt, st); } },
      { at: T.angeloMed, name: 'Angelo: are we doing this? / you liked that story / I liked when it ended', draw(c, st, lt) { wide(c, lt, push(camAngelo, st, 0.003), { full: ['angelo'], under: angeloWall }); } },
    ],
  });
})();
