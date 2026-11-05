/* ONE TOO MANY — Q02 EARLIER, THEN THE TITLE.  No dialogue. Actions A005-A006 + the title.
   Sets: living ('crisps', 'wide' + cam wideDining, 'glasses') and title.  Letterbox 1.78 throughout.
   Opens HARD on a warm frame (Q01 ends on a smash to black and 1 s of silence); ends on 12 frames of black (Q03 opens on the doorbell).

   Beats (sequence-local seconds)
     0.00  crisps (scoop): cut in mid-reach. A hand scoops crisps from the bag into the bowl, three handfuls; half miss and scatter.
     3.00  crisps (picks, 1.8x: a real cut-in): Scott picks them up one by one, left to right. The first he lifts up toward us and
           turns face-on to look at (it has been on the table...), holds it still (one small re-tilt), then down, a decisive flick,
           in it goes. Then quicker and quicker, committed. The hand withdraws as we cut.                         (A005)
     8.21  dining: six chairs, six places beyond the couch (cam wideDining, slow push). Room tone and the clock only.
    10.42  wide: the modest room, tidy in a hurry (four crisps he missed still on the floor by the couch). Scott, on one knee behind
           the end of the trunk, sets down the last glass, nudges it 8 px into line, gets up on his own curve, far hand to his hip,
           then walks the row bent over it, his finger tapping each rim: one, two, three, four, five, six. He stays on six.   (A006)
    15.04  glasses: six glasses low against the lamp (the title's field, inside the title bars). The count pings 1..6, 3 frames apart.
    17.00  MATCH CUT: the glasses become the six stubs (same height), which rise into the title bars. ONE TOO MANY stamps in. ONE
           burns through to the ember for about a second (the clock stops, drone7 swells), goes out leaving char and pin-holes; the credit.
    23.13  12 frames of black (Q03 opens on the doorbell).

   Local additions (nothing essential was missing from the sets/rig; these are this sequence's own):
     - Close-up side-view hands for the inserts (CUH: reach, pinchOpen, pinch, cup, fist, open, relaxed, blendable): the kit's
       hands are built for figure scale and read as mittens at 250 px. armShape is a two-bone arm (wrist, sleeve and cuff, a bent
       elbow, the upper arm to an off-frame shoulder that leans with the hand), ink with a lamp-side rim (the hand's rim is held to a
       wedge facing the lamp), a clip so the hand vanishes inside the bag, and a contact shadow on the table. The set's pour() plan
       gives the scoop hand path and the crisp physics; the pick travel, the hover-and-correct and the first pick's doubt (a held
       beat in plan time) are choreographed here. Held crisps are drawn here too (poking out of the fist, in front of the pinch).
     - The wide's count: Scott walks (RIG.walk) behind the trunk, bent (lowered hip, lean, autoLean), the point hold's fingertip
       corrected onto each rim; the glasses stand evenly along the trunk (glassX) with the bowl at its far end (props.bowl). The four
       floor crisps are drawn here as small crisps (the set's default is a 12 px fleck), at the set's F04 positions.
     - The title's credit is drawn here, larger (42 px) than the set's 30 px, with the same letter-by-letter timing.
     - The title's one-time asset build is warmed once after load (see below), so the match cut never freezes in playback.
     - Sounds (prefixed Q02.): an instant-on room tone, a mantel clock, bag crinkle, crisp clatter (table/bowl/rim/pick/drop),
       glass clink and slide, soft steps, rim taps, word stamps, the burn crackle, the ember going out, the credit ticks, a warm chord. */
(function () {
  'use strict';
  const O = window.OTM, { C, W, H, S } = O;
  const SL = () => window.SETS.living, ST = () => window.SETS.title;
  const R = () => window.RIG;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const seg = (t, a, b) => clamp((t - a) / ((b - a) || 1e-6), 0, 1);
  const sm = u => u * u * (3 - 2 * u);
  const twos = t => Math.floor(t * 12 + 1e-6) / 12;
  const norm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };

  // ------------------------------------------------------------------ the timeline (sequence-local seconds, on the frame grid)
  const T = {
    scoop: 0.00,            // hard cut in: the hand already moving
    pick: 3.00,             // cut on the last crisp settling: much closer (1.8x), the picking
    dining: 197 / 24,       // 8.208: the room: six places at the table beyond the couch, the lamp, the clock
    wide: 250 / 24,         // 10.417 (on the twos grid): the room, and Scott in it: the sixth glass, the count with his finger
    glasses: 361 / 24,      // 15.042: the count: six pings
    title: 17.00,           // MATCH CUT
  };
  const TITLE = { end: 147 / 24, stub: 300 };  // title-local: black from 6.125 (the credit holds ~1.6 s); stub = the glasses' height
  T.black = T.title + TITLE.end;               // 12 frames of black
  const DUR = +(T.black + 12 / 24).toFixed(4);
  const GL = { t0: 0.62, gap: 3 / 24, H: TITLE.stub, X: [169, 738, 985, 1147, 1338, 1610] };   // glasses: first ping, spacing; loosened row

  // ------------------------------------------------------------------ the crisps plan (set helper) + the picks
  // plan time == sequence time, except one held beat (HOLD) while Scott lifts the first crisp to look at it (it has been on the table)
  const HOLD = { at: 3.20 + 0.8 * 0.90, dur: 16 / 12 };             // 1.33 s: lift, hold still (one re-tilt), down with a flick
  const PICK_REAL = [[5.45, 0.55], [6.02, 0.45], [6.49, 0.38], [6.89, 0.33], [7.24, 0.30], [7.56, 0.28]];   // then quicker and quicker
  const PICKS = [{ i: 0, t: 3.20, dur: 0.90 }].concat(PICK_REAL.map(([t, d], j) => ({ i: j + 1, t: t - HOLD.dur, dur: d })));
  const planT = t => t < HOLD.at ? t : t < HOLD.at + HOLD.dur ? HOLD.at : t - HOLD.dur;
  const realT = p => p < HOLD.at ? p : p + HOLD.dur;
  let PLAN = null;
  const plan = () => PLAN || (PLAN = SL().pour({ mode: 'scoop', seed: 'q02', n: 14, t0: SC.t0, t1: SC.t1, scoops: SC.n, miss: 0.5,
    rest: [430, -260], picks: PICKS.map(p => ({ i: p.i, t: p.t, dur: p.dur })) }));
  // a crisp in the air never goes edge-on to a white thread: keep a little face showing as it tumbles
  const faceUp = k => k.phase === 'air' ? Object.assign({}, k, { flip: (k.flip < 0 ? -1 : 1) * Math.max(0.42, Math.abs(k.flip)) }) : k;

  // ------------------------------------------------------------------ Scott's forearm and hand (insert scale)
  // close-up side-view hands (the kit's hands are built for figure scale; at 250 px they read as mittens)
const CUH = (function () {
  const KN = [[0.43, -0.095], [0.465, -0.03], [0.455, 0.035], [0.415, 0.095]];      // index, middle, ring, pinky knuckles
  const LEN = [[0.25, 0.22], [0.27, 0.24], [0.255, 0.215], [0.2, 0.18]];
  const RAD = [0.06, 0.062, 0.057, 0.05];
  // poses: f = [[a, c] x4] (proximal angle, distal bend; + toward the palm), th = [a1, a2] thumb, palm bulge
  const POSES = {
    relaxed: { f: [[0.18, 0.55], [0.3, 0.6], [0.42, 0.62], [0.52, 0.6]], th: [-0.55, 0.55] },
    reach: { f: [[-0.1, 0.18], [0.04, 0.22], [0.16, 0.26], [0.28, 0.3]], th: [-0.75, 0.35] },
    pinchOpen: { f: [[-0.12, 0.42], [0.3, 1.05], [0.42, 1.15], [0.55, 1.2]], th: [-0.62, 0.55] },
    pinch: { f: [[0.12, 0.95], [0.4, 1.2], [0.52, 1.25], [0.64, 1.25]], th: [-0.32, 0.62] },
    cup: { f: [[0.5, 1.05], [0.62, 1.1], [0.74, 1.1], [0.86, 1.05]], th: [-0.25, 0.7] },
    fist: { f: [[1.2, 1.7], [1.3, 1.75], [1.38, 1.75], [1.42, 1.7]], th: [-0.05, 0.75] },
    open: { f: [[-0.34, 0.08], [-0.1, 0.06], [0.14, 0.08], [0.38, 0.12]], th: [-1.05, 0.25] },
  };
  const dir = a => [Math.cos(a), Math.sin(a)];
  function build(pose, mix2) {
    let P = typeof pose === 'string' ? POSES[pose] : pose;
    if (mix2) { const A = POSES[mix2[0]], B = POSES[mix2[1]], u = mix2[2]; P = { f: A.f.map((q, i) => [q[0] + (B.f[i][0] - q[0]) * u, q[1] + (B.f[i][1] - q[1]) * u]), th: [A.th[0] + (B.th[0] - A.th[0]) * u, A.th[1] + (B.th[1] - A.th[1]) * u] }; }
    const sh = S();
    sh.add(O.fig.smooth([[0, -0.13], [0.14, -0.165], [0.36, -0.155], [0.455, -0.11], [0.49, -0.02], [0.47, 0.08], [0.42, 0.135], [0.28, 0.165], [0.12, 0.155], [0, 0.125]], true));
    const tips = [];
    // far fingers first (pinky), so the index sits on top visually (all ink anyway)
    for (let i = 3; i >= 0; i--) {
      const k = KN[i], [a, c] = P.f[i], [l1, l2] = LEN[i], r = RAD[i];
      const j = [k[0] + dir(a)[0] * l1, k[1] + dir(a)[1] * l1]; const tp = [j[0] + dir(a + c)[0] * l2, j[1] + dir(a + c)[1] * l2];
      sh.capsule(k[0] - 0.02, k[1], r * 1.05, j[0], j[1], r * 0.92); sh.capsule(j[0], j[1], r * 0.92, tp[0], tp[1], r * 0.74);
      tips[i] = tp;
    }
    const tb = [0.1, -0.1], [ta1, ta2] = P.th; const tj = [tb[0] + dir(ta1)[0] * 0.24, tb[1] + dir(ta1)[1] * 0.24]; const tt = [tj[0] + dir(ta1 + ta2)[0] * 0.2, tj[1] + dir(ta1 + ta2)[1] * 0.2];
    sh.capsule(tb[0], tb[1], 0.085, tj[0], tj[1], 0.066); sh.capsule(tj[0], tj[1], 0.066, tt[0], tt[1], 0.052);
    // thenar pad
    sh.add(O.fig.smooth([[0.04, -0.12], [0.16, -0.19], [0.27, -0.17], [0.3, -0.1], [0.12, -0.06]], true));
    return { shape: sh, tips, thumb: tt, pinch: [(tips[0][0] + tt[0]) / 2, (tips[0][1] + tt[1]) / 2] };
  }
  return { build, POSES };
})();

  const HCACHE = new Map();
  function handOf(pose, mixTo, u) {
    u = mixTo ? Math.round(clamp(u, 0, 1) * 6) / 6 : 0; const key = pose + '|' + (mixTo || '') + '|' + u;
    let h = HCACHE.get(key); if (!h) { h = mixTo && u > 0 ? CUH.build(null, [pose, mixTo, u]) : CUH.build(pose); HCACHE.set(key, h); } return h;
  }
  const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  // the hand's own point lands on `target` (the pinch between thumb and index, the fist's centre, the palm), fingers along `a`.
  // The arm is a real two-bone chain: wrist -> elbow -> shoulder (the shoulder is off frame, given as a guide point and pulled into
  // reach), with the elbow bent to `side` (+1 / -1). The wrist may bend at most 0.75 rad off the forearm.
  const HPT = { fist: [0.3, 0.03], cup: [0.5, 0.1], reach: [0.55, 0], open: [0.55, 0], relaxed: [0.52, 0.05] };
  function armShape(target, a, hp, sc, shoulder, side) {
    const h = handOf(hp.pose, hp.to, hp.u); const pt = (hp.anchor === 'pinch' || hp.pose === 'pinch' || hp.pose === 'pinchOpen') ? h.pinch : (HPT[hp.pose] || [0.5, 0]);
    const Lf = sc * 1.32, Lu = sc * 1.5;
    let M, wrist, elbow, S0;
    for (let pass = 0; pass < 2; pass++) {
      const ca = Math.cos(a), sa = Math.sin(a);
      M = [ca * sc, sa * sc, -sa * sc, ca * sc, 0, 0];
      M[4] = target[0] - (M[0] * pt[0] + M[2] * pt[1]); M[5] = target[1] - (M[1] * pt[0] + M[3] * pt[1]);
      wrist = [M[4] - ca * sc * 0.02, M[5] - sa * sc * 0.02];
      let dx = shoulder[0] - wrist[0], dy = shoulder[1] - wrist[1], D = Math.hypot(dx, dy) || 1; const maxD = (Lf + Lu) * 0.985;
      S0 = D > maxD ? [wrist[0] + dx / D * maxD, wrist[1] + dy / D * maxD] : shoulder.slice(); D = Math.min(D, maxD);
      const th = Math.acos(clamp((Lf * Lf + D * D - Lu * Lu) / (2 * Lf * D), -1, 1)), base = Math.atan2(dy, dx), ang = base + side * th;
      elbow = [wrist[0] + Math.cos(ang) * Lf, wrist[1] + Math.sin(ang) * Lf];
      const fwd = ang + Math.PI, bend = wrapA(a - fwd);            // the forearm's own direction (elbow -> wrist)
      if (Math.abs(bend) <= 0.75) break;
      a = fwd + clamp(bend, -0.75, 0.75);
    }
    const hand = h.shape.transform(M);
    const fa = norm(elbow[0] - wrist[0], elbow[1] - wrist[1]), nx = -fa[1], ny = fa[0];
    const P = (d, r) => [wrist[0] + fa[0] * d + nx * sc * r, wrist[1] + fa[1] * d + ny * sc * r];
    const arm = S()
      .capsule(wrist[0], wrist[1], sc * 0.118, wrist[0] + fa[0] * sc * 0.3, wrist[1] + fa[1] * sc * 0.3, sc * 0.13)        // the wrist
      .poly([P(sc * 0.26, 0.15), P(sc * 0.34, 0.178), P(Lf, 0.2), P(Lf, -0.2), P(sc * 0.34, -0.176), P(sc * 0.26, -0.15)])   // cuff and sleeve
      .circle(elbow[0], elbow[1], sc * 0.205)                                                                             // the elbow
      .capsule(elbow[0], elbow[1], sc * 0.2, S0[0], S0[1], sc * 0.25);                                                      // the upper arm
    return { shape: S().add(arm).add(hand), hand, wrist, elbow, M, a, palm: [M[0] * 0.3 + M[4], M[1] * 0.3 + M[5]] };
  }
  function drawArm(c, A, light, o) {
    o = o || {}; const g = c.g;
    if (o.shadow) {   // a contact shadow on the table top: an ink blob under the fingers that gathers as they come down
      const k = o.shadow; g.save(); g.globalAlpha = 0.42 * k.a; g.fillStyle = C.ink;
      g.beginPath(); g.ellipse(k.x, k.y, k.rx, k.ry, -0.05, 0, 7); g.fill(); g.restore();
    }
    if (o.clip) { g.save(); g.clip(o.clip, 'evenodd'); }
    // the rim stays a crescent on the side facing the lamp: a wedge from the back of the hand, so a finger pointing away from the
    // light never gets a rim down both of its edges
    O.silhouette(g, A.shape, { light: { x: light[0], y: light[1] }, rimColor: C.tungsten, rimW: 3.2, at: A.wrist, parts: [{ shape: A.hand, at: A.palm, spread: 1.1 }] });
    if (o.clip) g.restore();
  }
  // contact shadow from the hand's height over the surface point below it: it lies away from the lamp (left, toward us)
  function handShadow(tip, surf) {
    const h = clamp(surf[1] - tip[1], 0, 400); const a = clamp(1 - h / 230, 0, 1); if (a <= 0.02) return null;
    return { a, x: surf[0] - 18 - h * 0.55, y: surf[1] + 8 + h * 0.06, rx: 46 + h * 0.25, ry: 12 + h * 0.03 };
  }

  // ------------------------------------------------------------------ the crisps shots
  const CR_LIGHT = () => SL().lights.crisps;
  const HAND_SC = 250;
  // the shoulder guide: Scott stands behind the trunk, off frame above; his body leans with the hand, so the guide rides with it
  const scoopShoulder = w => [w[0] - 150 - 0.12 * (w[0] - 700), w[1] - 610];          // elbow out toward the lamp (side +1)
  // picks: Scott is behind the table, right of the bowl. Reaching far left his arm runs nearly straight from up there (over the
  // bowl, never across it); near the bowl the elbow bends and drops to the right; lifting the crisp to look at it, it bends more
  const pickShoulder = (w, k) => { const u = sm(clamp((w[0] - 760) / 460, 0, 1)), f = [1300, -560], b = [w[0] + 220, w[1] - 560];
    const s = [lerp(f[0], b[0], u), lerp(f[1], b[1], u)]; return [lerp(s[0], w[0] + 170, k || 0), lerp(s[1], w[1] - 470, k || 0)]; };
  // inside the bag's front face the hand is hidden (the bag stands open, mouth up): a clip that removes the bag body below the mouth
  function bagClip(bag) {
    const p = new Path2D(); p.rect(-400, -400, W + 800, H + 800);
    const c = Math.cos(bag.rot), s = Math.sin(bag.rot), s0 = bag.s || 1; const L = 400 * s0, w = 150 * s0;
    const q = (lx, ly) => [bag.x + c * lx - s * ly, bag.y + s * lx + c * ly];
    const pts = [q(-6, -w * 1.15), q(-6, w * 1.15), q(-L - 10, w * 1.15), q(-L - 10, -w * 1.15)];
    p.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(v => p.lineTo(v[0], v[1])); p.closePath();
    return p;
  }
  const SC = { t0: 0.12, t1: 2.50, n: 3 };                 // the scoops: the first frame is already mid-reach
  // where a carried handful pokes out of the fist (hand-local: past the curled fingers, and between thumb and index)
  const FIST_POKE = [[0.6, 0.22], [0.44, 0.3], [0.66, 0.04], [0.52, -0.21], [0.3, 0.27], [0.64, -0.1]];
  function scoopShot(c, st, lt) {
    const L = SL(), P = plan(), st0 = P.at(lt);
    c.camera(L.cam('crisps', lt, 0.004));
    const held = st0.crisps.filter(k => k.phase === 'held'), rest = st0.crisps.filter(k => k.phase !== 'held').map(faceUp);
    L.draw(c, lt, { crisps: rest, bowl: st0.bowl, bag: st0.bag }, 'crisps');
    if (st0.hand) {
      const tw = twos(lt), D = (SC.t1 - SC.t0) / SC.n, j = clamp(Math.floor((tw - SC.t0) / D), 0, SC.n - 1), uu = (tw - SC.t0 - j * D) / D;
      const grip = st0.grip;
      const hp = grip === 'scoop' ? { pose: 'cup' } : grip === 'carry' ? { pose: 'cup', to: 'fist', u: seg(uu, 0.42, 0.5) } : grip === 'release' ? { pose: 'fist', to: 'open', u: seg(uu, 0.78, 0.86) }
        : grip === 'return' ? { pose: 'open', to: 'relaxed', u: seg(tw, SC.t1, SC.t1 + 0.3) } : { pose: 'reach' };
      const A = armShape(st0.hand, st0.handA || 1.3, hp, HAND_SC, scoopShoulder(st0.hand), 1);
      const lo = grip === 'scoop' || (grip === 'reach' && st0.hand[1] > 380) || (grip === 'carry' && st0.hand[1] > 330);
      const clip = lo ? bagClip(st0.bag) : null;
      // the handful: behind the fist, poking out of it (hidden while the hand is still in the bag)
      if (held.length && grip !== 'scoop') {
        const g = c.g; if (clip) { g.save(); g.clip(clip, 'evenodd'); }
        held.forEach((k, i) => { const q = FIST_POKE[i % FIST_POKE.length], M = A.M; const x = M[0] * q[0] + M[2] * q[1] + M[4], y = M[1] * q[0] + M[3] * q[1] + M[5];
          L.props.crisp(g, Object.assign({}, k, { x, y, s: (k.s || 50) * 0.9, flip: Math.max(0.45, Math.abs(k.flip)) }), L.rimDir('crisps', x, y)); });
        if (clip) g.restore();
      }
      drawArm(c, A, [CR_LIGHT().x, CR_LIGHT().y], { clip });
    }
  }
  // the picking hand: travel (Scott's hover-and-correct) -> pinch -> carry (from the plan) -> drop -> travel ...
  function pickHand(lt) {
    const P = plan(), b = L_BOWL(); const pt = planT(lt), tw = twos(pt);
    const ps = P.picks; let k = -1; for (let i = 0; i < ps.length; i++) if (tw >= (i ? ps[i - 1].t + ps[i - 1].dur : -1e9)) k = i;
    const rest = [1460, -160];
    const dropPt = j => { const q = ps[j]; return [b.x + (q.k.mi % 3 - 1) * 50, b.y - 140]; };
    const restOf = q => [q.k.lx + q.k.slide[0], q.k.ly + q.k.slide[1]];
    if (k < 0) return null;
    const p = ps[k];
    const st = P.at(pt);
    if (tw < p.t + 0.35 * p.dur) {
      // travel to the crisp: from the last drop (or from off frame), on Scott's curve (a tentative start, 7% past, corrected), a lift between
      const from = k ? dropPt(k - 1) : rest, t0 = k ? ps[k - 1].t + ps[k - 1].dur : p.t - 0.55, t1 = p.t + 0.26 * p.dur;
      const to = restOf(p); const v = R().curve('scott', seg(tw, t0, t1));
      const x = lerp(from[0], to[0], v), y = lerp(from[1], to[1] - 4, v) - Math.sin(Math.PI * clamp(v, 0, 1)) * (k ? 60 : 0);
      const close = seg(tw, t1, p.t + 0.35 * p.dur);
      const hp = close > 0 ? { pose: 'pinchOpen', to: 'pinch', u: close, anchor: 'pinch' } : { pose: 'relaxed', to: 'pinchOpen', u: seg(tw, t0, t0 + (t1 - t0) * 0.6), anchor: 'pinch' };
      return { hand: [x, y], hp, st, surf: to };
    }
    if (tw < p.t + 0.8 * p.dur) { const h = st.hand || restOf(p); return { hand: h, hp: { pose: 'pinch', anchor: 'pinch' }, st, surf: [h[0], restOf(p)[1]] }; }
    if (tw < p.t + p.dur) return { hand: st.hand || dropPt(k), hp: { pose: 'pinch', to: 'open', u: seg(tw, p.t + 0.8 * p.dur, p.t + 0.92 * p.dur), anchor: 'pinch' }, st, surf: null, release: seg(tw, p.t + 0.8 * p.dur, p.t + p.dur) };
    // after the last drop: withdraw, up and out
    const v = sm(seg(tw, p.t + p.dur, p.t + p.dur + 0.6)); const d = dropPt(k);
    if (v >= 1) return { hand: null, st };
    return { hand: [lerp(d[0], 1500, v), lerp(d[1], -420, v)], hp: { pose: 'open', to: 'relaxed', u: v * 2, anchor: 'pinch' }, st, surf: null };
  }
  const L_BOWL = () => SL().anchors.crisps.bowl;
  // the first crisp's doubt (real time from HOLD.at, on twos): up and toward us, turned face-on, held still (one small re-tilt),
  // then down to the bowl, decisive, and a little flick of the wrist as he lets it go
  function doubt(lt) {
    const tw = twos(lt) - HOLD.at, D = HOLD.dur;
    if (tw < 0 || tw > D + 0.25) return null;
    let k;
    if (tw < 0.34) k = R().curve('scott', tw / 0.34, null);
    else if (tw < D - 0.2) k = 1;
    else k = 1 - FILM.ease.inQuad(seg(tw, D - 0.2, D));
    const tilt = tw < 0.55 ? 0 : tw < 0.72 ? 0.3 * seg(tw, 0.55, 0.72) : lerp(0.3, 0.12, seg(tw, 0.72, 0.9));
    const flick = tw >= D ? Math.sin(Math.PI * seg(tw, D, D + 0.2)) : 0;
    return { k, tilt, flick, off: [-74 * k, -90 * k] };
  }
  function pickShot(c, st, lt) {
    const L = SL();
    c.camera({ x: 1066, y: 630, zoom: 1.8 * (1 + 0.003 * st) });
    const ph = pickHand(lt); const s0 = ph ? ph.st : plan().at(planT(lt));
    const dz = doubt(lt) || { k: 0, tilt: 0, flick: 0, off: [0, 0] };
    // a crisp dropping into the bowl tumbles but keeps its face to us (never a white thread)
    const held = s0.crisps.filter(k => k.phase === 'held'), rest = s0.crisps.filter(k => k.phase !== 'held').map(k => k.phase === 'air' ? Object.assign({}, k, { rot: 0.55 * Math.sin(k.rot), flip: (k.flip < 0 ? -1 : 1) * Math.max(0.6, Math.abs(k.flip)) }) : k);
    L.draw(c, lt, { crisps: rest, bowl: s0.bowl, bag: null }, 'crisps');
    if (ph && ph.hand) {
      const hand = [ph.hand[0] + dz.off[0], ph.hand[1] + dz.off[1]];
      const sh = pickShoulder(hand, dz.k);
      // fingers point down from the forearm; in the doubt they turn toward the horizontal to show him the crisp
      const a0 = Math.atan2(hand[1] - sh[1], hand[0] - sh[0]) + 0.22 + 0.5 * dz.k + 0.1 * dz.tilt - 0.32 * dz.flick;
      const A = armShape(hand, a0, ph.hp, HAND_SC * 0.96 * (1 + 0.07 * dz.k), sh, 1);
      drawArm(c, A, [CR_LIGHT().x, CR_LIGHT().y], { shadow: ph.surf ? handShadow(hand, ph.surf) : null });
      // the crisp in his fingers is drawn over the pinch (so the doubt has something to look at): face-on, larger, nearer us
      held.forEach(k => {
        const a = A.a, d = (k.s || 50) * (0.3 + 0.12 * dz.k), x = hand[0] + Math.cos(a) * d, y = hand[1] + Math.sin(a) * d;
        L.props.crisp(c.g, Object.assign({}, k, { x, y, rot: lerp(k.rot, -0.12 + dz.tilt, dz.k), flip: lerp(Math.max(0.4, Math.abs(k.flip)), 1, dz.k), s: (k.s || 50) * (1 + 0.5 * dz.k) }), L.rimDir('crisps', x, y));
      });
    } else held.forEach(k => L.props.crisp(c.g, k, L.rimDir('crisps', k.x, k.y)));
  }

  // ------------------------------------------------------------------ dining: six places
  function diningShot(c, st, lt) {
    const L = SL();
    c.camera(L.cam('wideDining', st, 0.004));
    const s = Object.assign(wideState(0), { dimLast: false });
    L.back(c, lt, s, 'wide'); L.table(c, lt, s, 'wide'); L.props.bowl(c.g, BOWL_W[0], BOWL_W[1], 0.9, 0.9); L.front(c, lt, s, 'wide');
  }

  // ------------------------------------------------------------------ the wide: the sixth glass, the count
  // the six glasses stand evenly along the trunk (one countable row), the bowl at its far end; the bag has gone back to the kitchen.
  // (Q04's party moves them about: F04's layout is the set's default)
  const GX = [676, 776, 876, 976, 1076, 1176], BOWL_W = [1262, 786];
  const WX = GX[1], WTOP = 792, RIM = 724;                   // the glass he sets down (index 1 on the trunk); table top; the rims
  const SC_W = { x: 548, y: 914, scale: 84, facing: 1 };
  const NUDGE = [[0.96, 0], [1.17, 8]];                      // the 6-8 px correction into line
  // the floor crisps he missed (F04's four by the couch, still there at the party): drawn here a touch larger, catching the lamp
  const FLOOR_CRISPS = [[318, 936, 0.2, 2], [356, 950, 1.5, 5], [300, 962, 2.7, 1], [392, 932, 3.9, 4]];
  function wideState(st) {
    const placed = st >= 0.55, nudge = R().key('scott', st, NUDGE);
    const gx = GX.slice(); gx[1] = WX - 8 + nudge;
    return { fill: 0, bowlOn: false, bagOnTable: false, glasses: placed ? 6 : [0, null, 0, 0, 0, 0], glassX: gx, dimLast: true, crisps: [] };
  }
  // the count: he walks along behind the trunk, bent over it, and his index finger taps each rim (contact, up, over, down: four
  // drawings a glass, 1/3 s), the bowl's gap a higher hop; on six it stays. His eyes are a drawing behind.
  const COUNT = { t0: 2.50, gap: 1 / 3, lift: 46 };
  const WALK = { x0: 470, t0: 2.30, dist: 480, stride: 0.9, speed: 1.0 };    // he rises a step back from the trunk's end (548 -> 470)
  const tapT = i => COUNT.t0 + i * COUNT.gap;
  const HOP = [[0, 0, 0], [0.25, 0.3, 1], [0.5, 0.78, 1], [0.75, 1, 0.5], [1, 1, 0]];     // u, x fraction, lift fraction
  function countAt(st) {
    const tw = twos(st + T.wide) - T.wide;
    if (tw < COUNT.t0) { const u = sm(seg(tw, COUNT.t0 - 0.34, COUNT.t0 - 0.08)); return [lerp(610, GX[0], u), lerp(700, RIM - 2 - COUNT.lift, u)]; }   // over glass one...
    const i = Math.min(5, Math.floor((tw - COUNT.t0) / COUNT.gap + 1e-6));
    if (i >= 5) return [GX[5], RIM - 2 - 16 * seg(tw, tapT(5) + 0.1, tapT(5) + 0.3)];          // on six, and stays there
    const u = (tw - tapT(i)) / COUNT.gap, kf = FILM.key(u, HOP.map(h => [h[0], [h[1], h[2]]]));
    return [lerp(GX[i], GX[i + 1], kf[0]), RIM - 2 - COUNT.lift * kf[1]];
  }
  // kneeling at the end of the low trunk -> standing (pose-to-pose blend, grounded)
  const KNEEL = { lean: 0.22, neck: 0.12, head: 0.36, legN: { a: 1.45, b: 1.5 }, legF: { a: 0.1, b: 1.68 } };
  const STAND = { lean: 0.1, neck: 0.12, head: 0.1, legN: { a: 0.02, b: 0.04 }, legF: { a: -0.03, b: 0.03 } };
  const HIP_F = { a: -0.55, b: 1.78, hand: 'relaxed', w: 0.4 };
  function scottWide(st, lt) {
    const Rg = R(), gx = WX - 8;
    if (st >= WALK.t0 - 0.12) {
      // the count: a short shuffle along the trunk, bent at the waist, knees giving a little; far hand on the hip
      const wk = Object.assign({}, Rg.walk('scott', lt, { x0: WALK.x0, scale: SC_W.scale, facing: 1, t0: T.wide + WALK.t0, dist: WALK.dist, stride: WALK.stride, speed: WALK.speed }));
      delete wk.armN; delete wk.armF;
      const bend = sm(seg(st, WALK.t0 - 0.25, WALK.t0 + 0.15));
      // legs nearly straight and the back near level, so the hand hangs down to the rims clear of his own legs
      const spec = Object.assign({ y: SC_W.y, scale: SC_W.scale, t: lt, idleAmt: 0.25 }, wk, { lean: lerp(0.1, 0.98, bend), head: lerp(0.1, 0.3, bend), neck: 0.12, armF: HIP_F });
      if (wk.hipH != null) spec.hipH = wk.hipH - 0.12 * bend;
      const tgt = countAt(st); spec.look = countAt(st - 1 / 12);
      spec.hold = { N: { kind: 'point', at: tgt, autoLean: true } };
      // land the fingertip itself on the target (the point hold puts the wrist short of it): one correction step
      const F0 = Rg.figure('scott', spec), tip = F0.holds && F0.holds.N && F0.holds.N.tip;
      if (!tip) return F0;
      const e = [tip[0] - tgt[0], tip[1] - tgt[1]]; if (Math.hypot(e[0], e[1]) < 3) return F0;
      return Rg.figure('scott', Object.assign({}, spec, { hold: { N: { kind: 'point', at: [Math.round(tgt[0] - e[0]), Math.round(tgt[1] - e[1])], autoLean: true } } }));
    }
    // on one knee at the trunk, the glass comes down, lets go, the finger nudges it into line; he gets up on his own curve
    // (a half start, a touch too far, corrected), the far hand goes to his hip, and his eyes run along the row
    // his rise: a tentative half-start, a pause, then up over seven drawings, a touch too far, corrected
    const sq = twos(st + T.wide) - T.wide;
    const kn = FILM.key(sq, [[1.34, 1], [1.5, 0.86, 'outQuad'], [1.6, 0.88], [2.2, -0.05, 'inOutSine'], [2.34, 0, 'outQuad']]), u = clamp(kn, -0.15, 1.1);
    const down = Rg.key('scott', st, [[0, -40], [0.55, 0]]);
    const L = (a, b) => lerp(b, a, u);
    const pose = { ground: 1, lean: L(KNEEL.lean, STAND.lean) + 0.12 * Math.sin(Math.PI * clamp(1 - u, 0, 1)), neck: 0.12, head: L(KNEEL.head, STAND.head),
      legN: { a: L(KNEEL.legN.a, STAND.legN.a), b: L(KNEEL.legN.b, STAND.legN.b) }, legF: { a: L(KNEEL.legF.a, STAND.legF.a), b: L(KNEEL.legF.b, STAND.legF.b) },
      armN: { a: 0.08, b: 0.25, hand: 'relaxed' }, armF: st > 2.0 ? HIP_F : { a: L(0.35, -0.05), b: L(0.5, 0.18), hand: 'relaxed' } };
    const spec = Object.assign({}, SC_W, { x: lerp(SC_W.x, WALK.x0, sm(seg(sq, 1.62, 2.28))), pose, t: lt, idleAmt: 0.4 });
    spec.look = st < 2.0 ? [gx + 24, 770] : countAt(st);
    if (st < 0.55) spec.hold = { N: { kind: 'glass', fill: 0, empty: true, at: [gx, WTOP - 8 - 17 + down], autoLean: true } };
    else if (st < 0.88) spec.hold = { N: { kind: 'reach', at: [gx - 6, WTOP - 46 - 24 * sm(seg(st, 0.55, 0.84))], autoLean: true } };
    else if (st < 1.3) spec.hold = { N: { kind: 'point', at: [gx - 15 + Rg.key('scott', st, NUDGE), WTOP - 42], autoLean: true } };
    else if (st < 1.42) spec.hold = { N: { kind: 'reach', at: [gx - 40, WTOP - 80], autoLean: true } };
    else if (st >= COUNT.t0 - 0.36) spec.hold = { N: { kind: 'point', at: countAt(st) } };
    return Rg.figure('scott', spec);
  }
  function wideShot(c, st, lt) {
    const L = SL(), s = wideState(st), g = c.g;
    c.camera({ x: 870, y: 640, zoom: 1.17 * (1 + 0.0035 * st) });
    L.back(c, lt, s, 'wide');
    FLOOR_CRISPS.forEach(([x, y, rot, shp]) => {
      g.save(); g.globalAlpha = 0.5; g.fillStyle = C.ink; g.beginPath(); g.ellipse(x - 4, y + 4, 10, 3, 0, 0, 7); g.fill(); g.restore();
      L.props.crisp(g, { x, y, rot: rot * 0.25 - 0.1, s: 19, flip: 0.52, shape: shp }, L.rimDir('wide', x, y));
    });
    // Scott is behind the trunk (it is drawn over his legs); his fingertip comes down onto the rims from above
    const F = scottWide(st, lt);
    R().draw(g, F, { light: { x: L.light.x, y: L.light.y }, falloff: true, em: c.em });
    // he passes in front of the lamp: his silhouette blocks its bloom (the glow stays at his edges, not over his head)
    c.em.save(); c.em.fillStyle = '#000'; c.em.fill(R().path(F)); c.em.restore();
    L.table(c, lt, s, 'wide');
    L.props.bowl(g, BOWL_W[0], BOWL_W[1], 0.9, 0.9);
    L.front(c, lt, s, 'wide');
    L.dim(c, 1, 'wide');
  }

  // ------------------------------------------------------------------ glasses: the count
  function glassesShot(c, st, lt) {
    const L = SL();
    L.draw(c, lt, { glints: L.countGlints(st, GL.t0, GL.gap), fill: 0, glassX: GL.X, glassH: GL.H }, 'glasses');
  }

  // ------------------------------------------------------------------ the title
  // the set's credit is 30 px Barlow (caps ~21 px): drawn here instead, larger for small screens, lit letter by letter
  const CREDIT = { str: 'A FILM BY OSITA MILES', size: 42, track: 11, gap: 0.9 / 24 };
  function titleShot(c, st) {
    const Ts = ST(); Ts.draw(c, st, { end: TITLE.end, stub: TITLE.stub, credit: 1e9 });
    const t0 = Ts.T.credit; if (st < t0 || st >= TITLE.end) return;
    const g = c.g, yl = Ts.layout().yLast, n = Math.min(CREDIT.str.length, Math.floor((st - t0) / CREDIT.gap) + 1);
    const xr = yl.x + yl.adv * 0.5 + yl.iw * 0.5 + 6, y = Ts.layout().FLOOR + 100, font = { family: 'Barlow Condensed', weight: 600, size: CREDIT.size };
    g.save(); g.font = O.font(font); g.letterSpacing = CREDIT.track + 'px'; const full = g.measureText(CREDIT.str).width, part = g.measureText(CREDIT.str.slice(0, n - 1)).width; g.restore();
    const fresh = (st - t0 - (n - 1) * CREDIT.gap) / CREDIT.gap;         // the newest letter warms up over its own step
    O.text(g, CREDIT.str.slice(0, n - 1), xr - full, y, Object.assign({ color: C.tungsten, tracking: CREDIT.track, align: 'left' }, font));
    O.text(g, CREDIT.str[n - 1], xr - full + part, y, Object.assign({ color: n < CREDIT.str.length && fresh < 1 ? C.tungstenMid : C.tungsten, tracking: CREDIT.track, align: 'left' }, font));
  }

  FILM.seq({
    id: 'Q02', title: 'Earlier, then the title', dur: DUR,
    letterbox: 1.7778,
    lines: [],
    setup() { plan(); },
    sound(S) {
      const P = plan();
      // the room: on from the first frame (a hard cut from Q01's silence), a clock somewhere
      S.bed('Q02.room', 0, T.title + 2.05, { level: -38, fo: 0.25 });
      for (let k = 0, t = 0.18; t < T.title + 2.0; k++, t += 1.0) S.cue('Q02.tick', t, { tock: k % 2 });
      // crisps: bag crinkle while the hand is in the bag, a rustle as each handful comes out, clatter on landing
      const D = (SC.t1 - SC.t0) / SC.n;
      for (let j = 0; j < SC.n; j++) { const t0 = SC.t0 + j * D; S.cue('Q02.rustle', t0 + 0.2 * D, { dur: 0.28, level: -21 }); S.cue('Q02.rustle', t0 + 0.42 * D, { dur: 0.16, level: -26 }); }
      P.list.forEach(k => {
        if (k.te == null) return;
        const land = k.te + k.T; if (!k.miss) { S.cue('Q02.crisp', land, { kind: 'bowl', seed: k.i }); return; }
        if (k.rim) { S.cue('Q02.crisp', k.te + k.T, { kind: 'rim', seed: k.i }); S.cue('Q02.crisp', k.te + k.T + k.T1, { kind: 'table', seed: k.i }); }
        else S.cue('Q02.crisp', land, { kind: 'table', seed: k.i });
        // the picks: a tiny tick when the fingers close on it, a dull drop into the heap
        if (k.pick) { S.cue('Q02.crisp', realT(k.pick.t + 0.35 * k.pick.dur), { kind: 'pick', seed: k.i }); S.cue('Q02.crisp', realT(k.pick.t + k.pick.dur), { kind: 'drop', seed: k.i + 40 }); }
      });
      // the wide: the glass set down, nudged; he gets up; the shuffle along the trunk; a fingertip tap on each rim (quiet: the pings are the count)
      const w = T.wide;
      S.cue('Q02.clink', w + 0.55, { level: -26 });
      S.cue('Q02.slide', w + 0.98, { level: -34 });
      S.cue('Q02.step', w + 1.92, { level: -36, pan: -0.35 }); S.cue('Q02.step', w + 2.2, { level: -35, pan: -0.33 });
      const hw = (1.04 / WALK.speed) / 2; for (let j = 1; j <= 4; j++) S.cue('Q02.step', w + WALK.t0 + j * hw, { level: -37 + (j % 2), pan: clamp(-0.32 + j * 0.06, -0.7, 0.7) });
      GX.forEach((x, i) => S.cue('Q02.tink', w + tapT(i), { level: -40, f: 3300 + i * 70, pan: clamp((x - 900) / 1300, -0.7, 0.7) }));
      // the count: six specular pings across six glasses, three frames apart (sour 0: the truth)
      for (let i = 0; i < 6; i++) S.cue('ping', T.glasses + GL.t0 + i * GL.gap, { i, sour: 0, pan: clamp((GL.X[i] - 960) / 1300, -0.7, 0.7) });
      // THE TITLE: the bars rise on the count (paper slaps), a warm low chord, the words stamp in
      const tt = T.title, TT = ST().T;
      S.bed('Q02.warm', tt - 0.02, tt + TT.burn + 0.25, { level: -30, fi: 0.5, fo: 0.35 });
      for (let i = 0; i < 6; i++) S.cue('slap', tt + i * TT.count, { level: -30 + (i % 2) * 2 });
      TT.words.forEach((wd, i) => S.cue('Q02.stamp', tt + wd, { level: [-17, -21, -19][i], f: [58, 66, 62][i] }));
      // ONE burns through to the ember: crackle, then the clock stops and only the Extra's drone is left; it goes out
      S.cue('Q02.burn', tt + TT.burn, { dur: TT.burnDur + 0.1, level: -22 });
      S.bed('drone7', tt + TT.burn - 0.1, tt + TT.burn + TT.burnDur + TT.ember + 0.7, { level: -28, seventh: -29, fi: 0.35, fo: 0.7 });
      S.cue('Q02.out', tt + TT.burn + TT.burnDur + TT.ember, { dur: TT.outDur + 0.25, level: -34 });
      // the credit lights letter by letter
      S.cue('Q02.type', tt + TT.credit, { n: CREDIT.str.length, gap: CREDIT.gap, level: -46 });
      // under the credit: the warm chord again, lower, so the card is not dead air; then 12 frames of true silence (Q03's doorbell)
      S.bed('Q02.warm', tt + TT.credit - 0.3, T.black, { level: -38, fi: 0.8, fo: 0.5 });
    },
    shots: [
      { at: T.scoop, name: 'crisps: the scoop, half miss', draw: scoopShot, post: { halation: 0.6 } },
      { at: T.pick, name: 'crisps: he picks them up anyway', draw: pickShot, post: { halation: 0.6 } },
      { at: T.dining, name: 'dining: six places', draw: diningShot },
      { at: T.wide, name: 'wide: the sixth glass, the count', draw: wideShot },
      { at: T.glasses, name: 'glasses: the count of six', draw: glassesShot, post: { halation: 0.7 } },
      { at: T.title, name: 'TITLE (match cut)', draw: titleShot, post: { halation: 0.85, vignette: 0.45 } },
      { at: T.black, name: 'black', draw: () => { }, post: { grain: 0, vignette: 0, halation: 0, fibre: 0 } },
    ],
  });

  // ================================================================== warm the title once, at load
  // SETS.title builds its burn stages, char rim and pin-holes on first use (~1.3 s headless). Left to the first title frame that
  // is a 1.3 s freeze exactly on the match cut during playback, so pay it once after load instead (fonts are loaded by then:
  // FILM_LOAD awaits them before the sequences). Pure caching: the output is identical either way.
  setTimeout(() => {
    try {
      if (document.fonts && !document.fonts.check('400 540px "Six Caps"')) return;
      const g = O.makeCanvas(W, H).getContext('2d'), e = O.makeCanvas(W / 4, H / 4).getContext('2d'); e.scale(0.25, 0.25);
      ST().draw({ g, em: e, f: null }, 0, { end: TITLE.end, stub: TITLE.stub });
    } catch (err) { /* the title will build on first use */ }
  }, 0);

  // ================================================================== sounds (this sequence's own)
  const SO = window.SOUND; if (!SO) return;
  const { db, src, osc, filt, gain, pan, chain, perc, bedEnv } = SO;
  const click = (ac, bus, t, f, q, lvl, d, p) => { const g = gain(ac, 0); perc(g, t, db(lvl), 0.0005, d || 0.02); chain(src(ac, 'white', 251 + ((f | 0) % 7), t, t + (d || 0.02) + 0.05), filt(ac, 'bandpass', f, q || 2), g, pan(ac, p || 0), bus); };
  // room tone that is simply THERE on the first frame (the stock bed fades in over a second)
  SO.beds['Q02.room'] = (ac, B, t0, t1, p) => {
    const g = gain(ac, 0); bedEnv(g, t0, t1, db(p.level || -38), 0.012, p.fo == null ? 0.4 : p.fo);
    chain(src(ac, 'brown', 11, t0, t1), filt(ac, 'lowpass', 240, 0.7)).connect(g);
    chain(osc(ac, 'sine', 50, t0, t1), gain(ac, 0.45)).connect(g); chain(osc(ac, 'sine', 100, t0, t1), gain(ac, 0.25)).connect(g);
    g.connect(B.room);
  };
  // a mantel clock in the next room: tick / tock
  SO.cues['Q02.tick'] = (ac, B, t, p) => {
    const f = p.tock ? 1650 : 2150; click(ac, B.room, t, f, 5, (p.level || -33), 0.012, -0.35);
    const g = gain(ac, 0); perc(g, t, db((p.level || -33) - 6), 0.0008, 0.03); chain(osc(ac, 'sine', p.tock ? 820 : 990, t, t + 0.06), g, pan(ac, -0.35), B.room);
  };
  // the bag: crinkle grains through a 3-5 kHz band
  SO.cues['Q02.rustle'] = (ac, B, t, p, Rn) => {
    const n = Math.round((p.dur || 0.2) * 70); for (let i = 0; i < n; i++) { const tt = t + Rn() * (p.dur || 0.2); click(ac, B.fx, tt, 2800 + Rn() * 2600, 1.5 + Rn() * 2, (p.level || -28) - Rn() * 10, 0.004 + Rn() * 0.018, -0.25); }
  };
  // a crisp lands: table (bright 3 ms clicks), bowl (duller, into the heap), rim (one hard tick), pick (the fingers close)
  SO.cues['Q02.crisp'] = (ac, B, t, p) => {
    const r = O.rng('q02crisp' + (p.seed || 0) + p.kind), k = p.kind;
    if (k === 'table') { for (let i = 0; i < 3; i++) click(ac, B.fx, t + i * (0.012 + r() * 0.02), 2400 + r() * 900, 2.5, -18 - i * 5 - r() * 3, 0.003, -0.2 + r() * 0.4); }
    else if (k === 'bowl') { for (let i = 0; i < 4; i++) click(ac, B.fx, t + i * 0.009 + r() * 0.01, 1300 + r() * 900, 1.6, -23 - i * 3 - r() * 4, 0.006, r() * 0.3); }
    else if (k === 'rim') click(ac, B.fx, t, 3600, 3, -19, 0.004, 0.1);
    else if (k === 'drop') { for (let i = 0; i < 5; i++) click(ac, B.fx, t + i * 0.008 + r() * 0.012, 1500 + r() * 1400, 1.4, -15 - i * 2.5 - r() * 3, 0.005, 0.15 + r() * 0.2); }
    else click(ac, B.fx, t, 3000 + r() * 600, 2, -18, 0.004, 0.2);
  };
  // a wine glass set down on the wooden trunk: a little knock and a short glass ring
  SO.cues['Q02.clink'] = (ac, B, t, p) => {
    const lv = p.level || -26; const g = gain(ac, 0); perc(g, t, db(lv), 0.001, 0.05); const o = osc(ac, 'sine', 190, t, t + 0.1); o.frequency.exponentialRampToValueAtTime(120, t + 0.06); chain(o, g, pan(ac, -0.3), B.fx);
    [[2350, 1, 0.16], [3930, 0.55, 0.11], [5620, 0.3, 0.07]].forEach(([f, a, d]) => { const e = gain(ac, 0); perc(e, t + 0.002, db(lv - 8) * a, 0.001, d); chain(osc(ac, 'sine', f, t, t + d + 0.05), e, pan(ac, -0.3), B.fx); });
  };
  // a fingertip on a glass rim: a tiny nail tick and the faintest ring
  SO.cues['Q02.tink'] = (ac, B, t, p) => {
    const lv = p.level || -40, f = p.f || 3300; click(ac, B.fx, t, 5200, 3, lv + 4, 0.003, p.pan || 0);
    const e = gain(ac, 0); perc(e, t + 0.001, db(lv), 0.001, 0.09); chain(osc(ac, 'sine', f, t, t + 0.14), e, pan(ac, p.pan || 0), B.fx);
  };
  SO.cues['Q02.slide'] = (ac, B, t, p) => { const g = gain(ac, 0); bedEnv(g, t, t + 0.09, db(p.level || -34), 0.01, 0.03); chain(src(ac, 'white', 263, t, t + 0.1), filt(ac, 'bandpass', 1900, 2.5), g, pan(ac, -0.3), B.fx); };
  SO.cues['Q02.step'] = (ac, B, t, p) => { const g = gain(ac, 0); perc(g, t, db(p.level || -34), 0.006, 0.12); chain(src(ac, 'brown', 267, t, t + 0.2), filt(ac, 'lowpass', 420, 0.7), g, pan(ac, p.pan || 0), B.room); const g2 = gain(ac, 0); perc(g2, t, db((p.level || -34) - 4), 0.004, 0.08); chain(osc(ac, 'sine', 72, t, t + 0.12), g2, B.room); };
  // a word stamps in: a low paper thud and a slap
  SO.cues['Q02.stamp'] = (ac, B, t, p) => {
    const lv = p.level || -19; const g = gain(ac, 0); perc(g, t, db(lv), 0.002, 0.32); const o = osc(ac, 'sine', p.f || 60, t, t + 0.4); o.frequency.exponentialRampToValueAtTime((p.f || 60) * 0.62, t + 0.25); chain(o, g, B.fx);
    const s = gain(ac, 0); perc(s, t, db(lv - 5), 0.001, 0.06); chain(src(ac, 'white', 271, t, t + 0.09), filt(ac, 'lowpass', 1700, 0.7), s, B.fx);
  };
  // the paper burns through: crackle and a rising hiss
  SO.cues['Q02.burn'] = (ac, B, t, p, Rn) => {
    const d = p.dur || 0.45, lv = p.level || -22;
    const h = gain(ac, 0); h.gain.setValueAtTime(0, t); h.gain.linearRampToValueAtTime(db(lv - 4), t + d * 0.7); h.gain.linearRampToValueAtTime(0, t + d + 0.25);
    const bp = filt(ac, 'bandpass', 1200, 0.8); bp.frequency.exponentialRampToValueAtTime(4200, t + d); chain(src(ac, 'pink', 277, t, t + d + 0.3), bp, h, pan(ac, -0.35), B.fx);
    for (let i = 0; i < 46; i++) { const tt = t + Rn() * d * 1.15; click(ac, B.fx, tt, 1800 + Rn() * 4500, 1.2, lv - 2 - Rn() * 12, 0.002 + Rn() * 0.01, -0.5 + Rn() * 0.3); }
  };
  // the ember goes out: a breath of hiss falling away
  SO.cues['Q02.out'] = (ac, B, t, p) => { const d = p.dur || 0.6; const g = gain(ac, 0); g.gain.setValueAtTime(db(p.level || -34), t); g.gain.exponentialRampToValueAtTime(1e-4, t + d); const f = filt(ac, 'bandpass', 3000, 1); f.frequency.exponentialRampToValueAtTime(600, t + d); chain(src(ac, 'pink', 281, t, t + d + 0.05), f, g, pan(ac, -0.35), B.fx); };
  // the credit: a fine run of filament ticks
  SO.cues['Q02.type'] = (ac, B, t, p) => { for (let i = 0; i < (p.n || 25); i++) click(ac, B.fx, t + i * (p.gap || 0.0375), 4200 + (i % 5) * 160, 4, (p.level || -46) - (i % 3), 0.003, 0.4); };
  // a warm low chord under the title (D: D2 A2 D3 F#3), soft and wide
  SO.beds['Q02.warm'] = (ac, B, t0, t1, p) => {
    const g = gain(ac, 0); bedEnv(g, t0, t1, db(p.level || -30), p.fi || 0.6, p.fo || 0.4); const lp = filt(ac, 'lowpass', 700, 0.6);
    [[73.42, 1], [110, 0.7], [146.83, 0.5], [184.99, 0.32], [220.5, 0.18]].forEach(([f, a], i) => chain(osc(ac, i % 2 ? 'triangle' : 'sine', f, t0, t1), gain(ac, a * 0.5), pan(ac, (i - 2) * 0.2), lp));
    chain(lp, g, B.music);
  };
})();
