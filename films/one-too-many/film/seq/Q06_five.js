/* ONE TOO MANY — Q06 FIVE. Kay goes to the loo; Angelo deals five and, for once, it comes out perfect; LATER, six piles again,
   and Christof goes for the other bottle. Lines L082-L103 (actions A050-A062). Sets: table (top, two, low) and hall (corridor).
   Letterbox 1.78 throughout (the 1.85 step belongs to Q07's crash: Kay must not be spoiled here).

   Local additions (nothing in kit/, sets, rig, engine or sound is edited):
   - drawing: inkRim / topInk / rimFill draw RIG's shapes (RIG.figure, RIG.bust, RIG.top) as ink + ONE crisp rim crescent toward
     the light (the ink is laid over the rim colour shifted away from the light, so the dark side never gets a fringe; front parts
     are plain ink). RIG.draw's per-part falloff rims cost 15-30 ms per large figure; these cost ~1.5 ms.
   - the two-shot's far four: hard-edged flat paper silhouettes (a lower-value ink with a lamp-side crescent) instead of the set's
     blurred crowd. The set reads them from c.cache('table:two:crowd:<ids>'); Q06 passes its own id list (with a 'Q06hard' tag
     the set ignores) and fills that cache entry first, so no other sequence is touched.
   - picture: Kay walking in the low view's perspective (RIG.walk mapped onto table metres) and in the corridor (shrinking away
     down the hall, face rolled away, over Scott's shoulder); the squeeze insert (a tapered coat sleeve from above and behind,
     the 'side' hand hooking over his shoulder, three frames held); Angelo's open grin (a notch cut out of his profile plus a
     teeth sliver) closing; Christof's POV hand with his last card (wind-up, smeared down-stroke, palm flat on it); Scott's
     pointing arm built from his shoulder; the kitchen glare eroding Christof's ink from the edges in; a warm grade over the
     corridor; the rain-bead glints of 'Kay' (single frames, never a body).
   - type: Kay's lines in warm ivory at 48 px (kaySay swaps the kit face's colour for the call only), L082 on two rows.
   - sound: SOUND.beds 'Q06.groove' / 'Q06.walla' (the stock beds through a stepped level / low-pass bus, so they can drop, burst
     and muffle without restarting; a step may carry its own time constant: [t, dB, tau]), SOUND.cues 'Q06.farLatch' (the bathroom click: far, panned, low-passed, in the room's
     reverb), 'Q06.step', 'Q06.chair', 'Q06.laugh' (a formant laugh). */
(function () {
  'use strict';
  const O = window.OTM, { C, S } = O, R = window.RIG;
  const T = () => window.SETS.table, HL = () => window.SETS.hall;
  const { clamp, lerp, seg, ease } = FILM;
  const D2R = Math.PI / 180, TAU = Math.PI * 2;
  const on1 = t => Math.floor(t * 24 + 1e-6) / 24, on2 = FILM.twos;
  const norm2 = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  const tP = (deg, r) => [960 + r * Math.sin(deg * D2R), 540 - r * Math.cos(deg * D2R)];
  const XY = o => Array.isArray(o) ? o : [o.x, o.y];
  const camOf = k => ({ x: k.x, y: k.y, zoom: k.zoom || 1, rot: k.rot || 0 });
  const wave = (t, hz, ph) => Math.sin(TAU * hz * t + (ph || 0));
  const ap = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
  const bump = (t, a, b, c, d) => seg(t, a, b) * (1 - seg(t, c, d));

  // ------------------------------------------------------------------------------------------------ timeline (local seconds)
  const TL = { A: 0, B: 3.0, C: 8.6, C2: 9.75, C3: 10.6, D: 13.0, E: 16.6, F: 19.0, G: 23.4, G2: 30.05, Hh: 33.8, I: 38.0, K1: 44.6, K2: 49.4, K3: 53.7, K4: 57.9, M: 62.6, END: 66.0 };
  const DEAL = [['scott', 24.62], ['marina', 25.17], ['christof', 25.72], ['deena', 26.27], ['angelo', 26.98]], FLY = 0.36;
  const PERFECT = 26.98 + FLY;                    // the fifth card lands at Angelo's place: the overhead turn stops dead
  const SEE = 28.15;                              // 'See?': the room may breathe again
  const CLICK = 17.62;                            // the bathroom door, out of sight
  const SLAM = 40.62;                             // Christof's last card
  const STAND = 58.0, WALKOFF = 61.0;             // Christof gets up; goes
  const SQ = { land: 9.92, close: 10.0, rel: 10.125, off: 10.3 };   // the squeeze, on ones: three frames held from 10.0

  // ------------------------------------------------------------------------------------------------ table states
  const SIX7 = ['gap', 'scott', 'kay', 'marina', 'christof', 'deena'];                  // Q05's six cards, on the seven-ring
  const GL = { scott: 0.4, kay: { fill: 0.45, lip: true }, marina: 0.3, christof: 0.25, deena: 0.38, angelo: 0.32 };
  const GL_LATER = { scott: 0.22, kay: { fill: 0.45, lip: true }, marina: 0.12, christof: 0.08, deena: 0.2, angelo: 0.1 };   // Kay's never moves
  const KAYCHAIR = { out: 58, rot: 0.34, empty: true };

  // ------------------------------------------------------------------------------------------------ drawing helpers
  const LOWL = () => T().lights.low;
  const LA = () => T().anchors.low.seats;
  // seat a profile body so its head (without breath) lands on `head` (low-view anchors give heads, not hips)
  function headSpec(id, spec, head) {
    const q = Object.assign({}, spec, { x: 0, y: 0, anchor: 'hip' }); delete q.t;
    const k = R.skeleton(id, q).sk.head;
    return Object.assign({}, spec, { anchor: 'hip', x: Math.round(head[0] - k[0]), y: Math.round(head[1] - k[1]) });
  }
  // ink silhouette with ONE crisp rim crescent toward (ux,uy): the rim colour, then the ink shifted away from the light laid over
  // it. Nothing is clipped, so the dark side has no antialias fringe (the ink just reaches w px further there). Camera-safe.
  function rimFill(g, path, ux, uy, w, col, alpha, fill) {
    const a = alpha == null ? 1 : alpha, ink = fill || C.ink;
    if (a > 0.01) { g.fillStyle = a >= 1 ? col : O.mix(ink, col, a); g.fill(path); }
    g.save(); if (a > 0.01) g.translate(-ux * w, -uy * w); g.fillStyle = ink; g.fill(path); g.restore();
  }
  // RIG shapes as ink + one rim crescent on the side facing the light (measured from the head); props; front parts as plain ink
  function inkRim(c, F, L, o) {
    o = o || {}; const g = c.g;
    const hp = (F.joints && F.joints.head) || F.head || [0, 0];
    const [ux, uy] = L.dx != null ? norm2(L.dx, L.dy) : norm2(L.x - hp[0], L.y - hp[1]);
    const w = o.w || clamp(2 + 0.012 * (F.scale || 60), 2.4, 5), col = o.color || C.tungsten;
    if (o.clip) { g.save(); g.clip(o.clip, o.clipRule || 'nonzero'); }
    rimFill(g, R.path(F), ux, uy, w, col, o.rimAlpha, o.fill);
    const po = { light: L.dx != null ? { x: hp[0] + L.dx * 1000, y: hp[1] + L.dy * 1000 } : L, color: col, em: c.em, details: o.details || {}, scale: F.scale || 60 };
    if (F.props && o.props !== false) F.props.forEach(fn => fn(g, po));
    if (F.front) { g.fillStyle = o.fill || C.ink; g.fill(F.front.path(0.8, (F.seed || 21) + 7)); }
    if (F.details && o.detailAlpha !== 0) { g.save(); g.globalAlpha = o.detailAlpha == null ? 1 : o.detailAlpha; O.fig.drawDetails(g, F, Object.assign({ rimColor: col, light: po.light }, o.details || {})); g.restore(); }
    if (o.clip) g.restore();
    return F;
  }
  // top-down: ink in one fill, the crown rimmed in three stepped bands facing the pendant (as RIG.draw / style frame 07)
  function topInk(c, F, o) {
    o = o || {}; const g = c.g, col = o.color || C.tungsten, w = o.w || 3;
    g.fillStyle = C.ink; g.fill(R.path(F));
    const hp = F.head || F.toW(0, 0); const [ux, uy] = norm2(960 - hp[0], 540 - hp[1]);
    const crown = F.crown.path(0.2, (F.seed || 40) + 3);
    g.save(); g.clip(crown); g.fillStyle = col; g.fill(crown);
    [[0.75, O.mix(col, C.ink, 0.35)], [1.55, O.mix(col, C.ink, 0.62)], [2.7, C.ink]].forEach(([k, cc]) => { g.save(); g.translate(-ux * w * k, -uy * w * k); g.fillStyle = cc; g.fill(crown); g.restore(); });
    g.restore();
    const po = { light: { x: 960, y: 540 }, color: col, em: c.em, details: o.details || {}, scale: F.scale || 60 };
    if (F.props) F.props.forEach(fn => fn(g, po));
    if (F.front) { g.fillStyle = C.ink; g.fill(F.front.path(0.6, 9)); }
    if (F.details) O.fig.drawDetails(g, F, Object.assign({ rimColor: col, light: { x: 960, y: 540 } }, o.details || {}));
    return F;
  }
  function farBody(c, id, spec, head, o) {
    const F = R.figure(id, headSpec(id, Object.assign({ pose: 'sit', t: c.lt }, spec), head));
    return inkRim(c, F, LOWL(), Object.assign({ color: C.tungsten }, o));
  }
  // the huge near bodies of the low view: ink + one rim crescent, plus their signature details
  function nearBody(c, id, spec, head, o) {
    o = o || {}; const F = R.figure(id, headSpec(id, Object.assign({ pose: 'sit', t: c.lt }, spec), head));
    const L = LOWL(), hp = F.joints.head, [ux, uy] = norm2(L.x - hp[0], L.y - hp[1] + 200);
    rimFill(c.g, R.path(F), ux, uy, o.w || 5, o.rim || C.tungstenMid, o.rimAlpha == null ? 0.85 : o.rimAlpha);
    if (F.front) { c.g.fillStyle = C.ink; c.g.fill(F.front.path(0.8, (F.seed || 21) + 7)); }
    O.fig.drawDetails(c.g, F, { rimColor: C.tungstenMid, light: L, ringColor: '#D4AF5E' });
    return F;
  }
  function scottBust(c, o) {
    const a = LA().scott; const B = R.bust('scott', Object.assign({ x: a.head[0], y: a.head[1], scale: a.scale, t: c.lt }, o));
    return inkRim(c, B, LOWL(), { color: C.tungsten });
  }
  const SCOTT_ARMS = { armL: { to: [1290, 700], hand: 'flat' }, armR: { to: [1150, 718], hand: 'flat' } };
  function lowScene(c, s, far, near, extra) {
    const t = c.lt, Tb = T(); extra = extra || {};
    Tb.back(c, t, s, 'low', { part: 'wall' }); if (extra.wall) extra.wall(c);
    far(c); Tb.back(c, t, s, 'low', { part: 'table' }); if (extra.table) extra.table(c);
    near(c); Tb.front(c, t, s, 'low'); if (extra.front) extra.front(c);
  }
  // top-down seated figure at its chair
  function topSeat(c, id, s, o) {
    const st = T().top.seatAt(id, s); if (!st) return null;
    const F = R.top(id, Object.assign({ x: st.x, y: st.y, dir: st.dir, scale: 94, hands: st.hands, handPose: 'flat', t: c.lt, foreshorten: true }, o));
    T().castTop(c, R.path(F), 0.45); topInk(c, F, { w: 3 }); return F;
  }
  // keep the bloom of the lamp-lit table off a figure standing in front of it (the ink must stay ink)
  function occludeEm(c, path) { const e = c.em; e.save(); e.fillStyle = '#000'; e.fill(path); e.restore(); }
  // a torn paper edge across the bottom of the two-shot bodies (they run into the table-front ink, not into a ruler line)
  const _torn = {};
  function tornClip(y0, seed) {
    const key = y0 + ':' + seed; if (_torn[key]) return _torn[key];
    const r = O.rng('Q06torn' + seed), p = new Path2D(); p.moveTo(-700, -700); p.lineTo(2700, -700); p.lineTo(2700, y0); let x = 2700;
    while (x > -700) { x -= 9 + r() * 24; p.lineTo(x, y0 + (r() - 0.5) * 13 + (r() < 0.14 ? (r() - 0.35) * 24 : 0)); }
    p.lineTo(-700, y0); p.closePath(); return (_torn[key] = p);
  }

  // ------------------------------------------------------------------------------------------------ the two-shot's far four
  // hard-edged flat paper silhouettes at a lower value than the leads (no blur): one crescent toward the pendant
  const CROWD = ['marina', 'christof', 'deena', 'angelo', 'Q06hard'];
  const GL2 = { scott: 0.4, kay: { fill: 0.45, lip: true }, christof: 0.25, deena: 0.38, angelo: 0.32, marina: 0.3 };
  function hardCrowd(c) {
    c.cache('table:two:crowd:' + CROWD.join(','), q => {
      const far = T().anchors.two.behind, L = T().anchors.two.lamp, fill = O.mix(C.ink, C.tungstenLow, 0.34);
      ['marina', 'christof', 'deena', 'angelo'].forEach((id, i) => {
        const f = far[id]; if (!f) return; const b = O.fig.bust(id, { x: f[0], y: f[1], scale: 62, tilt: f[2] });
        const p = b.shape.path(1.0, 40 + i); const [ux, uy] = norm2(L[0] - f[0], L[1] - f[1]);
        rimFill(q, p, ux, uy, 2.4, O.mix(fill, C.tungstenMid, 0.6), 1, fill);
      });
    });
  }

  // ------------------------------------------------------------------------------------------------ the kitchen glare (low view)
  // the kitchen's ordinary warm light in the far doorway (Q07's crash later turns it the wrong hood-yellow)
  const GLARE_PAL = () => [O.mix(C.tungstenLow, C.tungstenMid, 0.5), C.tungstenMid, O.mix(C.tungsten, C.cardPaper, 0.35)];
  function glareCanvas(c) {
    const D = T().anchors.low.kitchenDoor;
    return c.cache('Q06:kglare', q => {
      q.translate(-D.x0 + 40, -D.top + 40); const pal = GLARE_PAL();
      [[8, 22, 6, 26], [26, 70, 22, 80], [46, 130, 40, 142]].forEach(([a, b, d, e], i) => {
        q.fillStyle = pal[i]; q.fill(S().poly([[D.x0 + a, D.top + b], [D.x1 - d, D.top + e], [D.x1 - d, D.bot], [D.x0 + a, D.bot]]).path(1.2, 61 + i)); });
    }, D.x1 - D.x0 + 80, D.bot - D.top + 80);
  }
  function kitchenGlare(c, k) {
    if (k <= 0) return; const D = T().anchors.low.kitchenDoor, g = c.g;
    g.save(); g.globalAlpha = clamp(k, 0, 1); g.drawImage(glareCanvas(c), D.x0 - 40, D.top - 40); g.restore();
    g.save(); g.globalAlpha = 0.3 * k; g.fillStyle = C.tungstenLow; g.beginPath(); g.moveTo(D.x1 + 2, D.top + 30); g.lineTo(D.x1 + 110, D.top + 120); g.lineTo(D.x1 + 140, D.bot); g.lineTo(D.x1 + 2, D.bot); g.closePath(); g.fill(); g.restore();
    const e = c.em; e.save(); e.globalAlpha = 0.45 * k; e.fillStyle = C.tungsten; e.fillRect(D.x0 + 30, D.top + 90, D.x1 - D.x0 - 60, D.bot - D.top - 90); e.restore();
  }

  // ------------------------------------------------------------------------------------------------ 'Kay' in LATER: never a body
  // rain-bead glints where her hair would be, at the edge of Marina's silhouette, in single-frame jumps (nothing in between),
  // drawn after the occluder and clipped to everywhere it is NOT: so they can only ever show at the edge of that silhouette
  function beadGlints(c, lt, cx, cy, seed, rate, occluder) {
    const f = Math.floor(lt * 24 + 1e-6); const r = O.rng('Q06beads' + seed + ':' + f);
    if (r() > (rate == null ? 0.3 : rate)) return;
    const g = c.g; g.save(); g.fillStyle = C.rainSilver;
    if (occluder) { const cl = new Path2D(); cl.rect(-2000, -2000, 6000, 6000); cl.addPath(occluder); g.clip(cl, 'evenodd'); }
    const n = 3 + Math.floor(r() * 3); for (let i = 0; i < n; i++) { const x = cx + (r() - 0.5) * 90, y = cy + (r() - 0.5) * 200; g.globalAlpha = 0.55 + r() * 0.45; g.beginPath(); g.arc(x, y, 2.8 + r() * 1.8, 0, TAU); g.fill(); }
    g.restore();
  }

  // ------------------------------------------------------------------------------------------------ the LATER game: piles and throws
  // a discard heap in the middle; everyone's throws fly, Kay's cards just ARE there a frame later
  const THROWS = [  // [time, from, flight]; 'kay' = a single-frame jump
    [38.2, 'deena', 0.3], [38.55, 'angelo', 0.3], [38.83, 'kay', 0], [39.1, 'marina', 0.28], [39.55, 'scott', 0.3], [39.95, 'deena', 0.26],
    [42.4, 'deena', 0.24], [43.05, 'angelo', 0.3], [46.33, 'kay', 0], [48.9, 'marina', 0.3], [50.7, 'kay', 0], [52.2, 'scott', 0.3],
    [55.45, 'angelo', 0.3], [56.66, 'kay', 0], [59.8, 'deena', 0.3],
  ];
  const KAY_IN = [38.38, 41.71, 44.96, 48.37, 52.79, 58.54];   // a card is simply AT her place, a frame later (no hand, no flight)
  const DISCARD = [972, 548];
  // low views: only throws from hands we can see fly (a card leaving from behind Marina's head would be a shadow without a card)
  const LOW_FLY = { deena: 1, angelo: 1, scott: 1 };
  function laterTable(lt, extra, view) {
    const piles = ['scott', 'kay', 'marina', 'christof', 'deena', 'angelo'].map((id, i) => {
      let n = [4, 4, 3, 2, 4, 5][i]; THROWS.forEach(([t, w]) => { if (w === id && lt >= t) n = Math.max(1, n - 1); });
      if (id === 'kay') KAY_IN.forEach(t => { if (lt >= t) n++; });
      if (id === 'christof' && lt >= SLAM) n = 1;
      return { at: id, ring: 'seats', n, mess: 0.55 };
    });
    let d = 6; const flying = [];
    THROWS.forEach(([t, w, fl]) => {
      const seen = view !== 'low' || LOW_FLY[w];
      if (lt >= t + fl) d++; else if (lt >= t && fl > 0 && seen) flying.push({ from: { at: w, ring: 'seats' }, to: DISCARD, u: (lt - t) / fl, h: 0.18 });
    });
    if (lt >= SLAM) d++;
    piles.push({ at: DISCARD, n: Math.min(d, 12), mess: 0.9, ring: 'seats' });
    return Object.assign({ piles, ring: 'seats', mess: 0.5, glasses: GL_LATER, chairs: { kay: { out: -40 } }, flying }, extra || {});
  }

  // ================================================================================================ SHOTS
  // ------------------------------------------------------------------------------------------------ A: overhead; the hands come off
  // A new axis after Q05's low six-hands shot (a 90-degree change): the sixth hand slides back into the dark at the gap, the
  // others lift off their cards, one weak chuckle dies; Kay pushes her chair back and rises toward the lens (on ones).
  const CAM_A = () => T().camAt([960, 540], [1160, 575], 0.95, -10 * D2R);
  function shotA(c, st, lt) {
    c.camera(CAM_A());
    const tk = on1(lt), tw = on2(lt);
    const ex = 1 - seg(tk, 0.1, 0.62, 'inQuad');
    const rise = ease.inOutCubic(seg(tk, 2.1, 2.95));
    const s = { piles: SIX7, glasses: GL, extraHand: ex, chairs: { kay: { out: Math.round(84 * rise), rot: -0.22 * rise } } };
    T().back(c, lt, s, 'top');
    const LIFT = { deena: [0.2, 0.36], marina: [0.42, 0.95], christof: [0.62, 1.1], scott: [1.3, 1.9] };
    const gapP = T().top.pile({ at: 'gap', ring: 'seven' }, s), kayP = T().top.pile({ at: 'kay', ring: 'seven' }, s);
    ['christof', 'deena', 'marina', 'scott'].forEach(id => {
      const st6 = T().top.seatAt(id, s), p7 = T().top.pile({ at: id, ring: 'seven' }, s), u = ease.inOutSine(seg(tw, LIFT[id][0], LIFT[id][1]));
      const h1 = [Math.round(lerp(p7.x, st6.hands[1][0], u)), Math.round(lerp(p7.y, st6.hands[1][1], u))];
      const look = id === 'scott' ? (tw < 1.6 ? [gapP.x, gapP.y] : XY(T().top.seatAt('kay', s))) : (tw < 1.0 ? [gapP.x, gapP.y] : [kayP.x, kayP.y]);
      topSeat(c, id, s, { hands: [st6.hands[0], h1], handPose: ['flat', 'flat'], look, lookAmt: id === 'scott' ? 0.8 : 0.45 });
    });
    // Kay: her hand off the card, then the chair goes back and she rises toward the lens
    const ks = T().top.seatAt('kay', s), kl = ease.inOutSine(seg(tk, 1.05, 1.55));
    const out = [-Math.cos(ks.dir), -Math.sin(ks.dir)];
    const kx = ks.x + out[0] * 26 * rise, ky = ks.y + out[1] * 26 * rise;
    const kh1 = [Math.round(lerp(kayP.x, ks.hands[1][0], kl)), Math.round(lerp(kayP.y, ks.hands[1][1], kl))];
    const K = R.top('kay', { x: Math.round(kx), y: Math.round(ky), dir: ks.dir + 0.35 * rise, scale: Math.round(94 + 22 * rise), t: lt, foreshorten: true,
      hands: rise > 0.08 ? [false, false] : [ks.hands[0], kh1], handPose: rise > 0.08 ? 'tuck' : ['flat', 'flat'], look: tw < 1.9 ? XY(T().top.seatAt('scott', s)) : [gapP.x, gapP.y], lookAmt: 0.7 });
    T().castTop(c, R.path(K), 0.45 + 0.1 * rise, 1 + 0.05 * rise); topInk(c, K, { w: 3, details: { beadColor: C.rainSilver } });
    const dl = T().anchors.top.dealer;
    topSeat(c, 'angelo', s, { deck: true, hands: dl.hands, handPose: 'clasp', look: tw < 1.4 ? [gapP.x, gapP.y] : XY(ks), lookAmt: 0.6 });
    T().front(c, lt, s, 'top');
  }

  // ------------------------------------------------------------------------------------------------ B: two-shot, Kay up, Scott hovering
  const TWO_FLOOR = 1398;
  function shotB(c, st, lt) {
    c.camera({ x: 960, y: 500, zoom: 1.0 });
    const A = T().anchors.two, L = T().lights.two, tw = on2(lt), tk = on1(lt);
    const s = { piles: true, glasses: GL2, behind: CROWD }; hardCrowd(c);
    T().back(c, lt, s, 'two');
    // Kay: finishing the rise (the match from A), then standing beside her place; a pat on the table on 'Save my seat'
    const u = ease.outCubic(seg(tk, 3.0, 3.55));
    const hipY = lerp(A.kay.y - 150, TWO_FLOOR - 3.84 * A.kay.scale, u);
    const pat = seg(tk, 5.6, 6.0, 'outCubic') * (1 - seg(tk, 7.2, 7.6, 'inOutSine'));
    const turnK = R.turn('kay', lt, 8.0, 1, -1);
    const kay = R.figure('kay', { x: A.kay.x - 40, y: Math.round(hipY), anchor: 'hip', scale: A.kay.scale, facing: turnK.facing, squash: turnK.squash, view34: turnK.view34, t: lt,
      pose: 'stand', lean: lerp(0.3, 0.04, u), neck: 0.08, head: lerp(0.0, 0.16, u) + 0.06 * Math.sin(Math.PI * seg(tk, 4.9, 5.5)), look: [A.scott.x - 40, A.scott.y - 460],
      hold: pat > 0.02 ? { N: { kind: 'flat', at: [lerp(560, 640, pat), lerp(820, 742, pat)], view: 'edge' } } : undefined,
      armF: { a: 0.05, b: 0.35, hand: 'relaxed' } });
    inkRim(c, kay, L, { details: { beadColor: C.rainSilver }, clip: tornClip(898, 1), w: 3.4 }); occludeEm(c, R.path(kay));
    // Scott: the half-start ('You want me to--'), guillotined by her 'No.'; back down; then a small nod. His hand is flat on the
    // table by his glass (it pushes him up into the half-start)
    const hov = R.key('scott', lt, [[3.55, 0], [4.15, 1], [5.2, 1], [5.6, 0]]);
    const nod = Math.sin(Math.PI * seg(tw, 7.15, 7.6)) * 0.08;
    const scott = R.figure('scott', { x: A.scott.x, y: Math.round(A.scott.y - 56 * hov), anchor: 'hip', scale: A.scott.scale, facing: -1, pose: 'sit', t: lt,
      lean: 0.16 + 0.26 * hov, neck: 0.1, head: 0.04 + nod - 0.1 * hov, look: [A.kay.x - 40, Math.round(hipY - 3.0 * A.kay.scale)], lookAmt: 0.8,
      hold: { N: { kind: 'flat', at: [1222, 778], view: 'edge' } } });
    inkRim(c, scott, L, { clip: tornClip(898, 2), w: 3.4 }); occludeEm(c, R.path(scott));
    T().front(c, lt, s, 'two');
  }

  // ------------------------------------------------------------------------------------------------ C: low, round Scott's chair
  // From Christof's place the hall doorway is the dark behind the gap: Kay walks round behind Scott (right to left, on ones),
  // stops three frames for the squeeze (seen in the insert), and goes out through the gap into the dark.
  const KLOW = { t0: 8.72, sq: SQ.close, hold: 3 / 24, pts: [[232, 1.3], [210, 1.2], [188, 1.15], [165, 1.35], [150, 1.75], [146, 2.3]] };
  let _kg = null;
  function klowGeom() {
    if (_kg) return _kg; const L = T().low; const P = KLOW.pts.map(([d, r]) => L.CL(d, r)); const sg = []; let tot = 0;
    for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); sg.push(l); tot += l; }
    const door = sg.slice(0, 4).reduce((a, b) => a + b, 0); return (_kg = { P, sg, tot, door });
  }
  function klowAt(m) {
    const G = klowGeom(); let d = clamp(m, 0, G.tot);
    for (let i = 0; i < G.sg.length; i++) { if (d <= G.sg[i] || i === G.sg.length - 1) { const u = clamp(d / G.sg[i], 0, 1); return [lerp(G.P[i][0], G.P[i + 1][0], u), lerp(G.P[i][1], G.P[i + 1][1], u)]; } d -= G.sg[i]; }
    return G.P[G.P.length - 1];
  }
  function kayWalkLow(c, lt) {
    const L = T().low, G = klowGeom(), tk = on1(lt);
    const tau = tk < KLOW.sq ? tk : tk < KLOW.sq + KLOW.hold ? KLOW.sq : tk - KLOW.hold;   // the squeeze: she stops for three frames
    const wk = R.walk('kay', tau, { x0: 0, scale: 100, facing: -1, t0: KLOW.t0, raw: true });
    const m = Math.abs(wk.x) / 100 * 0.235 * 0.9; if (m >= G.tot) return null;
    const en = klowAt(m), P = L.P3(en[0], -0.75, en[1]), k = 0.235 * L.pxm(en[0], en[1]) / 100;
    return { wk, m, P, k, hx: wk.x, inDoor: seg(m, G.door - 0.05, G.door + 0.35), gone: seg(m, G.door + 0.3, G.tot - 0.05) };
  }
  function kayDrawLow(c, K, o) {
    const g = c.g, e = c.em; o = o || {};
    const toL = p => [(p[0] - K.P[0]) / K.k + K.hx, (p[1] - K.P[1]) / K.k];
    const spec = Object.assign({ y: 0, scale: 100, t: c.lt }, K.wk, o.spec || {});
    const F = R.figure('kay', spec);
    g.save(); e.save();
    if (o.clip) g.clip(o.clip);
    [g, e].forEach(q => { q.translate(K.P[0], K.P[1]); q.scale(K.k, K.k); q.translate(-K.hx, 0); });
    // the pendant is above and in front of her: one crescent on her top / lamp side only, fading as she enters the dark doorway
    const LL0 = LOWL(); const lp = toL([LL0.x, LL0.y]); const hd = F.joints.head; const [ux, uy] = norm2(lp[0] - hd[0], (lp[1] - hd[1]) * 0.6);
    inkRim(c, F, { dx: ux, dy: uy }, { w: 3.0 / K.k, rimAlpha: 1 - K.inDoor, detailAlpha: 1 - K.gone, details: { beadColor: C.rainSilver } });
    g.restore(); e.restore();
    return F;
  }
  function shotC(c, st, lt) {
    c.camera({ x: 1080, y: 470, zoom: 1.12 });
    const A = LA(), tw = on2(lt);
    const s = { piles: SIX7, glasses: GL, empty: ['kay'], chairs: { kay: { out: 50 } } };
    const K = kayWalkLow(c, lt);
    const D = T().anchors.low.hallDoor; const doorClip = new Path2D(); doorClip.rect(D.x0 + 4, D.top, D.x1 - D.x0 - 8, D.bot - D.top);
    const kayHead = K ? [K.P[0], K.P[1] - 6.4 * 100 * K.k] : [700, 150];
    const felt = seg(tw, SQ.close, SQ.off);                   // after the squeeze his head is up and turned toward where she went
    lowScene(c, s, cc => {
      if (K) kayDrawLow(cc, K, { clip: K.inDoor > 0 ? doorClip : null });
      farBody(cc, 'angelo', { facing: 1, scale: A.angelo.scale, lean: 0.1, neck: 0.08, head: 0.12, look: kayHead, lookAmt: 0.55, hold: { N: { kind: 'deck', mode: 'square', at: T().anchors.low.dealer.deck } } }, A.angelo.head);
      scottBust(cc, Object.assign({ tilt: -0.1 * felt + 0.04 * seg(tw, 11.4, 12.4, 'inOutSine') }, SCOTT_ARMS));
    }, cc => {
      nearBody(cc, 'deena', { facing: 1, scale: A.deena.scale, lean: 0.26, neck: 0.08, head: 0.16, look: kayHead, lookAmt: 0.3, hold: { N: { kind: 'flat', at: [560, 980], view: 'edge' } } }, A.deena.head);
      nearBody(cc, 'marina', { facing: -1, scale: A.marina.scale, lean: 0.36, neck: 0.1, head: 0.22, hold: { N: { kind: 'flat', at: [1700, 1010], view: 'edge' } } }, [A.marina.head[0] - 120, A.marina.head[1] + 40]);
    });
  }

  // ------------------------------------------------------------------------------------------------ C2: insert, the squeeze
  // From behind Scott, his back-view silhouette against the lit table and the lamp beyond. Her coat sleeve comes down from the top
  // of frame (she is behind him, near the lens), tapering to the cuff and wrist; the palm lands on top of his right shoulder and
  // the fingers hook over its outer curve, against the lit table; they close; three frames held; his head lifts and tips toward
  // her hand; she lets go and the sleeve slides back up out of frame as she walks on.
  const CAM_C2 = { x: 1140, y: 580, zoom: 1.5 };
  const SC2 = { x: 1023, y: 505, s: 230 };
  function sleevePath(E, W, wE, wW) {   // a tapered sleeve from E (wide) to W (narrow), with a cuff flare near W
    const d = norm2(W[0] - E[0], W[1] - E[1]), n = [-d[1], d[0]], L = Math.hypot(W[0] - E[0], W[1] - E[1]);
    const at = (u, w) => [E[0] + d[0] * L * u + n[0] * w, E[1] + d[1] * L * u + n[1] * w];
    const cuff = 0.84, wc = wW * 1.45;
    const pts = [at(0, -wE), at(cuff - 0.03, -wc), at(cuff, -wc * 1.05), at(cuff + 0.012, -wW * 0.9), at(1.05, -wW * 0.82), at(1.05, wW * 0.82), at(cuff + 0.012, wW * 0.9), at(cuff, wc * 1.05), at(cuff - 0.03, wc), at(0, wE)];
    return S().poly(pts);
  }
  function shotC2(c, st, lt) {
    const L = T().lights.two, tk = on1(lt), tw = on2(lt);
    c.camera(CAM_C2);
    const s = { piles: true, glasses: GL2, behind: CROWD }; hardCrowd(c);
    T().back(c, lt, s, 'two'); T().front(c, lt, s, 'two');
    const lift = ease.outCubic(seg(tw, SQ.close + 0.04, SQ.off + 0.04));     // he feels it: the head comes up, toward her hand
    const sc = SC2.s, hx = SC2.x, hy = SC2.y;
    const B = R.bust('scott', { x: hx + Math.round(0.03 * sc * lift), y: hy - Math.round(0.05 * sc * lift), scale: sc, tilt: 0.015 + 0.09 * lift, t: lt, armL: false, armR: false });
    inkRim(c, B, L, { w: 3.0, details: { cowlick: false } }); occludeEm(c, R.path(B));
    // her hand: she is passing to his right (toward the gap and the hall); she reaches back and lays her hand on top of his right
    // shoulder, fingers toward his neck, and they curl down over it (the knuckles hump up against the lit table)
    const U = (u, v) => [hx + u * sc, hy + v * sc];
    const land = ease.outCubic(seg(tk, TL.C2, SQ.land)), off = ease.inCubic(seg(tk, SQ.rel + 0.02, SQ.off + 0.12));
    const held = tk >= SQ.close && tk < SQ.rel;
    const curl = held ? 0.95 : tk < SQ.close ? lerp(0.1, 0.6, seg(tk, SQ.land - 0.04, SQ.close)) : lerp(0.8, 0.1, seg(tk, SQ.rel, SQ.rel + 0.12));
    const press = held ? 0.02 : 0;
    const W = U(1.1 + 0.9 * (1 - land) + 1.1 * off, 0.69 - 0.16 * (1 - land) - 0.12 * off + press);
    // seen from above and behind: the palm on the top of the shoulder, four fingers lying over it toward his neck; on the
    // squeeze they draw together and curl in (the knuckles rise); the thumb along the top
    const hk = 0.62 * sc, ang = 0.32 + 0.06 * curl;
    const f = [-Math.cos(ang), Math.sin(ang)], nrm = [-Math.sin(ang), -Math.cos(ang)];
    const hand = O.fig.hand(curl > 0.7 ? 'clasp' : 'open', { curl: 0.15 + 0.6 * curl, spread: lerp(0.16, 0.0, curl) }).transform([f[0] * hk, f[1] * hk, nrm[0] * hk * 0.9, nrm[1] * hk * 0.9, W[0], W[1]]);
    const E = [W[0] + 2.7 * sc, W[1] - 1.15 * sc];                          // her arm, nearly straight, from off frame right
    const arm = sleevePath(E, [W[0] - 0.02 * sc, W[1] + 0.005 * sc], 0.19 * sc, 0.07 * sc).add(hand);
    const p = arm.path(0.6, 9), [ux, uy] = norm2(L.x - W[0], L.y - W[1]);
    rimFill(c.g, p, ux, uy, 3.0, C.tungsten, 1); occludeEm(c, p);
    // a couple of rain beads still on her cuff
    const g = c.g, d = norm2(W[0] - E[0], W[1] - E[1]), nn = [-d[1], d[0]], L0 = Math.hypot(W[0] - E[0], W[1] - E[1]);
    g.save(); g.fillStyle = C.rainSilver; [[0.8, -0.95], [0.76, -0.5], [0.83, -0.2]].forEach(([u, v], i) => {
      const x = E[0] + d[0] * L0 * u + nn[0] * v * 0.09 * sc, y = E[1] + d[1] * L0 * u + nn[1] * v * 0.09 * sc;
      g.globalAlpha = 0.85 - 0.18 * i; g.beginPath(); g.arc(x, y, 2.4 - 0.4 * i, 0, TAU); g.fill(); }); g.restore();
  }

  // ------------------------------------------------------------------------------------------------ D: the corridor, over Scott's shoulder
  // Scott, turned in his chair, watches her go: the back of his head in the warm foreground at right; she walks away down the
  // hall (face rolled away), shrinking by more than half, turns left into the lit bathroom door and is cut off by the near jamb.
  const KD = { t0: 12.45, pts: [[-0.08, 1.32], [-1.32, 3.12], [-2.25, 3.2]] };
  let _kd = null;
  function kdGeom() {
    if (_kd) return _kd; const P = KD.pts; const sg = []; let tot = 0;
    for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); sg.push(l); tot += l; }
    return (_kd = { P, sg, tot });
  }
  function kdAt(m) {
    const G = kdGeom(); let d = clamp(m, 0, G.tot);
    for (let i = 0; i < G.sg.length; i++) { if (d <= G.sg[i] || i === G.sg.length - 1) { const u = clamp(d / G.sg[i], 0, 1); return { X: lerp(G.P[i][0], G.P[i + 1][0], u), Z: lerp(G.P[i][1], G.P[i + 1][1], u), leg: i, u }; } d -= G.sg[i]; }
    return { X: G.P[G.P.length - 1][0], Z: G.P[G.P.length - 1][1], leg: G.sg.length - 1, u: 1 };
  }
  // warm the hall's grey-olive into the tungsten family and deepen its ink (a flat multiply, under the figures)
  function corridorGrade(c, col) {
    const g = c.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = col; g.fillRect(0, 0, 1920, 1080); g.restore();
  }
  function shotD(c, st, lt) {
    const H0 = HL(); const cam = camOf(H0.cams.corridor), u0 = seg(lt, TL.D, TL.E);
    c.camera({ x: lerp(cam.x, cam.x - 8, u0), y: cam.y, zoom: lerp(1, 1.01, u0) });
    const s = { bathDoor: 0.6, spill: 1, endLight: 0.1, underDoor: 1 };
    H0.back(c, lt, s, 'corridor');
    corridorGrade(c, '#E9B27A');
    // Kay
    const G = kdGeom(), distU = G.tot / 0.235 * 100 * 0.92;
    const wk = R.walk('kay', lt, { x0: 0, scale: 100, facing: -1, t0: KD.t0, dist: distU });
    const m = Math.abs(wk.x) / distU * G.tot, q = kdAt(m);
    if (q.leg < 1 || q.u < 0.995) {
      const P = H0.floor('corridor', q.X, q.Z), k = H0.scaleAt('corridor', q.Z) / 100;
      const roll = q.leg === 0 ? 0.6 : lerp(0.6, 0.0, seg(q.u, 0, 0.35));     // walking away: the face rolled from us; then profile as she turns in
      const F = R.figure('kay', Object.assign({ y: 0, scale: 100, t: lt }, wk, { roll, head: 0.08 }));
      const g = c.g, e = c.em, hx = wk.x;
      g.save(); e.save();
      if (q.leg === 1) { const cl = new Path2D(); cl.rect(393, -400, 3000, 2400); g.clip(cl); }
      [g, e].forEach(qq => { qq.translate(P[0], P[1]); qq.scale(k, k); qq.translate(-hx, 0); });
      // the light is the bathroom slab ahead of her at left: one crescent on her left edge
      inkRim(c, F, { dx: -1, dy: -0.25 }, { color: O.mix(C.underDoor, C.tungsten, 0.4), w: 2.6 / k, rimAlpha: 0.9, details: { beadColor: C.rainSilver } });
      H0.occlude(c, R.path(F));
      g.restore(); e.restore();
    }
    H0.front(c, lt, s, 'corridor');
    // Scott in the foreground: the back of his head and shoulders, the room's warm light catching his right edge
    const look = seg(on2(lt), 13.2, 16.4, 'inOutSine');
    const B = R.bust('scott', { x: 1668, y: 768, scale: 292, tilt: lerp(-0.03, -0.11, look) + 0.02 * Math.sin(Math.PI * seg(on2(lt), 15.9, 16.5)), t: lt, armL: false, armR: false });
    inkRim(c, B, { dx: 0.85, dy: -0.55 }, { color: O.mix(C.tungstenLow, C.tungstenMid, 0.6), w: 6, details: { cowlick: false } });
    H0.occlude(c, R.path(B));
  }

  // ------------------------------------------------------------------------------------------------ E: the slab snaps off: CLICK
  function shotE(c, st, lt) {
    const H0 = HL(); const cam = camOf(H0.cams.corridor_q06), u0 = seg(lt, TL.E, TL.F);
    c.camera({ x: cam.x, y: cam.y, zoom: lerp(cam.zoom, cam.zoom * 1.008, u0) });
    const bd = lt < CLICK - 0.5 ? 0.6 : lt < CLICK ? 0.6 * (1 - ease.inQuad((lt - (CLICK - 0.5)) / 0.5)) : 0;
    const s = { bathDoor: bd, spill: 1, endLight: 0.1, underDoor: 1 };
    H0.back(c, lt, s, 'corridor'); corridorGrade(c, '#E9B27A'); H0.front(c, lt, s, 'corridor');
  }

  // ------------------------------------------------------------------------------------------------ F: low, Angelo scoops; 'five'
  function shotF(c, st, lt) {
    c.camera({ x: 960, y: 540, zoom: 1.0 });
    const A = LA(), tw = on2(lt); const order = ['deena', 'christof', 'marina', 'scott', 'gap', 'kay'];
    const piles = [], flying = [];
    order.forEach((nm, i) => { const t0 = 19.3 + i * 0.2; if (lt < t0) piles.push(nm); else if (lt < t0 + 0.3) flying.push({ from: nm, to: 'dealer', u: (lt - t0) / 0.3, h: 0.08 }); });
    const s = { piles, flying, glasses: GL, empty: ['kay'], chairs: { kay: { out: 50 } } };
    const gathered = seg(tw, 19.4, 20.6);
    const fan = Math.sin(Math.PI * seg(tw, 21.15, 21.95));    // the flourish: a fan snaps open and shut
    const stop = seg(lt, 22.3, 22.36);                         // Deena's palm: 'Please don't start.'
    lowScene(c, s, cc => {
      farBody(cc, 'angelo', { facing: 1, scale: A.angelo.scale, lean: 0.14 + 0.08 * gathered * (1 - fan), neck: 0.08, head: 0.18 - 0.22 * fan, look: tw > 22.3 ? A.deena.head : [900, 700], lookAmt: 0.5,
        hold: { N: { kind: 'deck', mode: fan > 0.05 ? 'fan' : 'square', open: fan, spread: 1.2, at: [Math.round(lerp(695, 760, gathered)), Math.round(669 - 90 * fan)] } },
        armF: { a: 0.3 + 0.3 * gathered, b: 0.8, hand: 'relaxed' } }, A.angelo.head);
      scottBust(cc, Object.assign({ tilt: -0.07 }, SCOTT_ARMS));
    }, cc => {
      nearBody(cc, 'deena', { facing: 1, scale: A.deena.scale, lean: 0.24 - 0.06 * stop, neck: 0.08, head: 0.12 - 0.1 * stop,
        hold: stop > 0.5 ? { N: { kind: 'reach', at: [640, 560] } } : { N: { kind: 'flat', at: [560, 980], view: 'edge' } } }, A.deena.head);
      nearBody(cc, 'marina', { facing: -1, scale: A.marina.scale, lean: 0.34, neck: 0.1, head: 0.2, look: A.angelo.head, lookAmt: 0.5, hold: { N: { kind: 'flat', at: [1700, 1010], view: 'edge' } } }, [A.marina.head[0] - 120, A.marina.head[1] + 40]);
    });
  }

  // ------------------------------------------------------------------------------------------------ G: overhead, turning; five; PERFECT
  // The overhead turns at 2 deg/s while he deals, and stops DEAD as the fifth card lands: the turn, the lamp's dust and every
  // body's breath lock on the same frame and hold until 'See?'.
  const frozen = lt => lt < PERFECT ? lt : lt < SEE ? PERFECT : lt - (SEE - PERFECT);
  function camG(lt) { const q = Math.min(lt, PERFECT); const rot = (-7 + 2.0 * (q - TL.G)) * D2R; return T().camAt([960, 540], [900, 540], 1.0, rot); }
  function shotG(c, st, lt) {
    c.camera(camG(lt));
    const tw = on2(lt), tf = frozen(lt); const dealt = [], flying = [];
    DEAL.forEach(([id, t0]) => { if (lt >= t0 + FLY) dealt.push({ at: id, ring: 'seats' }); else if (lt >= t0) flying.push({ from: 'dealer', to: { at: id, ring: 'seats' }, u: (lt - t0) / FLY, h: 0.16, spin: 1.0 }); });
    const rif = { split: seg(tw, 23.85, 24.1), riffle: seg(tw, 24.12, 24.48) };
    const riffling = tw >= 23.85 && tw < 24.5;
    const s = { piles: dealt, flying, glasses: GL, chairs: { kay: KAYCHAIR }, deck: riffling ? Object.assign({ n: 16 }, rif) : null };
    const cc = Object.assign({}, c, { lt: tf });      // bodies breathe on the frozen clock
    T().back(c, tf, s, 'top');
    const See = seg(tw, 28.2, 28.45, 'outCubic') * (1 - seg(tw, 30.0, 30.6, 'inOutSine'));
    const ang = T().top.seatAt('angelo', s), dh = T().anchors.top.dealer.hands;
    // the throwing hand (his right) snaps toward each place, then back to the deck
    let rh = dh[1]; DEAL.forEach(([id, t0]) => { const q = Math.sin(Math.PI * clamp((tw - t0 + 0.08) / 0.3, 0, 1)); if (q > 0) { const tp = T().top.pile({ at: id, ring: 'seats' }, s); rh = [lerp(rh[0], tp.x, 0.38 * q), lerp(rh[1], tp.y, 0.38 * q)]; } });
    const myPile = T().top.pile({ at: 'angelo', ring: 'seats' }, s);
    let aHands = riffling ? T().riffleHands(null, null, Object.assign({ n: 16 }, rif)) : [dh[0], rh.map(Math.round)], aPose = riffling ? 'clasp' : ['clasp', 'clasp'];
    if (See > 0) { const lat = [-Math.sin(ang.dir), Math.cos(ang.dir)], fw = [Math.cos(ang.dir), Math.sin(ang.dir)];
      aHands = [-1, 1].map(sd => [Math.round(ang.x + fw[0] * 110 + lat[0] * sd * (60 + 70 * See)), Math.round(ang.y + fw[1] * 110 + lat[1] * sd * (60 + 70 * See))]); aPose = 'open'; }
    const lookCard = tw > 31.9;
    ['scott', 'marina', 'christof', 'deena'].forEach(id => {
      const o = {}; if (id === 'christof') { o.lean = -0.08 * seg(tw, 29.0, 29.6); o.look = XY(ang); o.lookAmt = 0.6 * seg(tw, 28.9, 29.4); }
      if (id === 'deena') { o.look = tw > 32.6 ? [960, 540] : XY(ang); o.lookAmt = 0.5; }
      if (id === 'scott') { o.look = tw < 26.0 ? tP(150, 560) : XY(ang); o.lookAmt = 0.7; }
      if (id === 'marina') { o.look = XY(ang); o.lookAmt = 0.4; }
      o.t = tf; topSeat(cc, id, s, o);
    });
    const deckOn = !riffling && See < 0.05 && tw < PERFECT + 0.2;
    topSeat(cc, 'angelo', s, { t: tf, deck: deckOn, hands: deckOn || riffling ? aHands : (See > 0 ? aHands : [[Math.round(myPile.x - 30), Math.round(myPile.y + 40)], [Math.round(myPile.x + 20), Math.round(myPile.y + 30)]]),
      handPose: See > 0 ? 'open' : (deckOn || riffling ? aPose : ['flat', 'flat']), look: lookCard ? [myPile.x, myPile.y] : (tw < 31 ? [960, 540] : tP(0, 400)), lookAmt: 0.8 });
    T().front(c, tf, s, 'top');
  }

  // ------------------------------------------------------------------------------------------------ G2: low, the table laughs; Angelo plays along
  // Everyone goes: Deena's head back and her hand slapping the table, Marina leaning in with her hand to her mouth, Scott's
  // shoulders shaking; Angelo opens his hands ('go on') clear of everyone, then a mock bow. The laugh dies; he looks at his card.
  function shotG2(c, st, lt) {
    c.camera({ x: 990, y: 540, zoom: 1.0 });
    const A = LA(), tw = on2(lt);
    const s = { piles: DEAL.map(([id]) => ({ at: id, ring: 'seats' })), ring: 'seats', glasses: GL, empty: ['kay'], chairs: { kay: { out: 50 } } };
    const laugh = seg(tw, 30.05, 30.25) * (1 - seg(tw, 32.5, 33.0, 'inOutSine'));     // the laugh, then it dies
    const shake = laugh * Math.abs(wave(tw, 2.6));                                   // the shoulders: ha-ha-ha, on twos
    const goOn = bump(tw, 30.85, 31.15, 31.6, 31.8);                                  // 'Go on. Laugh.': open hands, out to the sides
    const bow = Math.sin(Math.PI * seg(tw, 31.8, 32.75));                             // 'I'm delighted for you.': a mock bow
    const down = seg(tw, 32.95, 33.5, 'inOutSine');                                   // and down at his card
    const slap = bump(tw, 30.4, 30.55, 30.75, 30.95);                                 // Deena's palm comes down on the table
    lowScene(c, s, cc => {
      // 'go on': both palms up and out, in the clear dark between his face and Scott; the bow: one hand behind his back, the
      // other sweeping forward and down over the table like a waiter's flourish
      const rest = [760, 700], hN = goOn > 0.01 ? [lerp(rest[0], 880, goOn), lerp(rest[1], 430, goOn)] : [lerp(rest[0], 890, bow), lerp(rest[1], 612, bow)];
      const hF = [lerp(rest[0] - 40, 820, goOn), lerp(rest[1] + 10, 472, goOn)];
      farBody(cc, 'angelo', { facing: 1, scale: A.angelo.scale, lean: 0.02 + 0.44 * bow + 0.12 * down, neck: 0.04 + 0.12 * bow, head: -0.18 * goOn + 0.32 * bow + 0.32 * down, look: down > 0.3 ? A.angelo.card : null, lookAmt: 0.6,
        hold: { N: (goOn > 0.05 || bow > 0.05) ? { kind: 'reach', at: hN.map(Math.round) } : { kind: 'flat', at: [Math.round(rest[0]), rest[1]], view: 'edge' }, F: goOn > 0.05 ? { kind: 'reach', at: hF.map(Math.round) } : undefined },
        armF: bow > 0.05 ? { a: -0.35 * bow, b: 1.5 * bow, hand: 'relaxed' } : undefined }, [A.angelo.head[0] - Math.round(10 * bow), A.angelo.head[1] + Math.round(40 * bow)]);
      scottBust(cc, Object.assign({ tilt: 0.09 * laugh * wave(tw, 1.3) + 0.03 * shake, y: A.scott.head[1] - Math.round(9 * shake) }, SCOTT_ARMS));
    }, cc => {
      nearBody(cc, 'deena', { facing: 1, scale: A.deena.scale, lean: 0.14 - 0.3 * laugh, neck: -0.25 * laugh, head: 0.1 - 0.62 * laugh - 0.1 * shake,
        hold: { N: { kind: 'flat', at: [Math.round(lerp(560, 640, slap)), Math.round(lerp(980, 880, slap) - 140 * Math.sin(Math.PI * seg(tw, 30.25, 30.55)))], view: 'edge' } } },
        [A.deena.head[0] - Math.round(40 * laugh), A.deena.head[1] - Math.round(30 * laugh + 12 * shake)]);
      const ml = laugh;   // Marina leans in from the right, the back of her hand to her mouth
      nearBody(cc, 'marina', { facing: -1, scale: A.marina.scale, lean: 0.34 + 0.1 * ml, neck: 0.1 - 0.06 * ml, head: 0.2 - 0.12 * ml + 0.05 * shake,
        hold: ml > 0.35 ? { N: { kind: 'cover', at: 'mouth' } } : { N: { kind: 'flat', at: [1700, 1010], view: 'edge' } } },
        [Math.round(lerp(A.marina.head[0] - 120, 1915, ml)), Math.round(lerp(A.marina.head[1] + 40, 470, ml) - 8 * shake)]);
    });
  }

  // ------------------------------------------------------------------------------------------------ H: low close, Angelo and the fifth card
  // His smile drains in silhouette stages: the open grin (a notch and a sliver of teeth) closes; the head drops in two steps; the
  // breath stops. A slow push; then nothing moves for two seconds before the LATER cut.
  const DRAIN = { grin: 34.55, drop1: 35.15, drop2: 35.85, still: 36.2 };
  function grinPath(F, open) {     // head-local mouth wedge, opening forward (+x is his face side)
    const m = F.headM; const o = 0.045 * open;
    const p = new Path2D(); const pts = [[0.3, 0.31], [0.53, 0.30 - o], [0.53, 0.315 + o * 1.4]].map(q => ap(m, q));
    p.moveTo(pts[0][0], pts[0][1]); p.lineTo(pts[1][0], pts[1][1]); p.lineTo(pts[2][0], pts[2][1]); p.closePath(); return p;
  }
  function shotH(c, st, lt) {
    const u = ease.inOutSine(seg(lt, TL.Hh, TL.I));             // a slow push (~1%/s) that keeps creeping through the stillness
    c.camera({ x: lerp(742, 720, u), y: lerp(556, 526, u), zoom: lerp(1.48, 1.545, u) });
    const A = LA(), tw = on2(lt); const s = { piles: ['scott', 'marina', 'christof', 'deena', 'angelo'], ring: 'seats', glasses: GL, empty: ['kay'], chairs: { kay: { out: 50 } } };
    const open = 1 - seg(tw, DRAIN.grin, DRAIN.grin + 0.09);                          // the grin shuts in two frames
    const d1 = ease.inOutSine(seg(tw, DRAIN.drop1, DRAIN.drop1 + 0.25)), d2 = ease.inOutSine(seg(tw, DRAIN.drop2, DRAIN.drop2 + 0.3));
    const still = tw >= DRAIN.still;
    const tb = still ? DRAIN.still : lt;                                              // the breath stops: the body holds where it was
    lowScene(c, s, cc => {
      // stage 0: leaning back, chin up, the grin open; 1: the grin shuts; 2: the head drops; 3: drops again, the far hand
      // slides off the table into his lap; then the breath stops and nothing moves
      const spec = { facing: 1, scale: A.angelo.scale, t: tb, idleAmt: still ? 0 : 1 - 0.6 * d1, lean: -0.1 * open + 0.1 * d1 + 0.12 * d2, neck: -0.12 * open + 0.1 * d1 + 0.1 * d2, head: -0.2 * open + 0.2 * d1 + 0.24 * d2,
        look: [A.angelo.card[0], A.angelo.card[1]], lookAmt: 0.1 + 0.25 * d2,
        hold: { N: { kind: 'flat', at: [A.angelo.card[0] - 10, A.angelo.card[1] + 6], view: 'edge', fingers: 1 } }, armF: { a: lerp(0.6, 0.15, d2), b: lerp(1.2, 0.45, d2), hand: 'relaxed' } };
      const F = R.figure('angelo', headSpec('angelo', Object.assign({ pose: 'sit' }, spec), [A.angelo.head[0] - Math.round(12 * open), A.angelo.head[1] - Math.round(10 * open) + Math.round(14 * d1 + 18 * d2)]));
      inkRim(cc, F, LOWL(), { color: C.tungsten });
      if (open > 0.02) {   // the open grin: a notch in the profile, its lower lip catching the lamp
        const gp = grinPath(F, open), m = F.headM, g = cc.g;
        g.save(); g.fillStyle = '#1D1511'; g.fill(gp);
        const p0 = ap(m, [0.3, 0.31]), p1 = ap(m, [0.53, 0.315 + 0.034 * open * 1.4]);
        g.strokeStyle = C.tungsten; g.lineWidth = Math.max(2.5, 0.016 * A.angelo.scale); g.lineCap = 'round'; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); g.restore();
      }
      scottBust(cc, Object.assign({ tilt: -0.05, t: still ? DRAIN.still : lt }, SCOTT_ARMS));
    }, cc => {
      const tilt = seg(tw, 33.85, 34.0);
      nearBody(cc, 'deena', { facing: 1, scale: A.deena.scale, t: still ? DRAIN.still : lt, lean: 0.24, neck: 0.08, head: 0.18 - 0.08 * tilt, look: A.angelo.head, lookAmt: 0.4, hold: { N: { kind: 'flat', at: [560, 980], view: 'edge' } } }, A.deena.head);
    });
  }

  // ------------------------------------------------------------------------------------------------ I: LATER (low): the noisy game
  const MAR_LEAN = [1765, 448];   // Marina leaning in: her head and shoulder cover Kay's place
  function marinaLater(cc, lt, o) {
    const A = LA(); o = o || {};
    return nearBody(cc, 'marina', Object.assign({ facing: -1, scale: A.marina.scale, lean: 0.62, neck: 0.12, head: 0.32, look: [1088, 1000], lookAmt: 0.3,
      hold: { N: { kind: 'flat', at: [1600, 960], view: 'edge' } }, armF: { a: 0.5, b: 1.1, hand: 'relaxed' } }, o.spec || {}), o.head || MAR_LEAN, { w: 6 });
  }
  // Christof's arm from the lens: the card held up, a fast down-stroke (smeared for two frames), the palm flat on it, then away
  const CARD_W = 66, CARD_H = 94;
  function cardShape(cx, cy, a, sx, sy) {   // a card centred at (cx,cy), rotated a, squashed (perspective) sx, sy
    const ca = Math.cos(a), sa = Math.sin(a), pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => { const x = u * CARD_W / 2 * sx, y = v * CARD_H / 2 * sy; return [cx + x * ca - y * sa, cy + x * sa + y * ca]; });
    return pts;
  }
  function drawCard(g, pts, lit) {
    const P = new Path2D(); pts.forEach((p, i) => i ? P.lineTo(p[0], p[1]) : P.moveTo(p[0], p[1])); P.closePath();
    g.fillStyle = C.cardPaper; g.fill(P);
    const c0 = [(pts[0][0] + pts[2][0]) / 2, (pts[0][1] + pts[2][1]) / 2]; const inner = pts.map(p => [lerp(p[0], c0[0], 0.14), lerp(p[1], c0[1], 0.14)]);
    const Q = new Path2D(); inner.forEach((p, i) => i ? Q.lineTo(p[0], p[1]) : Q.moveTo(p[0], p[1])); Q.closePath(); g.fillStyle = lit ? C.cardBlue : O.mix(C.cardBlue, C.ink, 0.25); g.fill(Q);
  }
  const SLAM_AT = [1062, 838];   // the heap in the low view
  function povHand(c, lt) {
    const t = on1(lt); const g = c.g;
    const up = ease.outCubic(seg(t, SLAM - 0.62, SLAM - 0.22));      // rises into frame with the card held up
    const down = ease.inQuad(seg(t, SLAM - 0.13, SLAM));              // the down-stroke: three frames
    const away = ease.inOutSine(seg(t, SLAM + 0.55, SLAM + 0.95));
    if (up <= 0 || away >= 1) return;
    const raised = [1150, 610], hit = SLAM_AT;
    const W = [lerp(lerp(1260, raised[0], up), hit[0] + 14, down) + 160 * away, lerp(lerp(1220, raised[1], up), hit[1] + 36, down) + 420 * away];
    const elbow = [W[0] + 210 + 30 * down, W[1] + 330 - 120 * down + 40 * away];
    // the smear: on the two frames of the down-stroke, ghosted copies of the card back up its path
    if (down > 0 && down < 1) { g.save(); for (let k = 3; k >= 1; k--) { const v = clamp(down - 0.22 * k, 0, 1); const p = [lerp(raised[0], hit[0], v) - 30, lerp(raised[1], hit[1], v) - 50]; g.globalAlpha = 0.16 * (4 - k) / 3; drawCard(g, cardShape(p[0], p[1], -0.5 + 0.4 * v, 1, lerp(1, 0.4, v)), true); } g.restore(); }
    const flat = t >= SLAM;
    // the card: held between thumb and fingers (upright, a little turned) until it is pressed flat on the heap
    if (!flat) drawCard(g, cardShape(W[0] - 52, W[1] - 70 + 20 * down, -0.5 + 0.35 * down, 1, lerp(1, 0.55, down)), true);
    else if (away < 0.05) drawCard(g, cardShape(hit[0] - 6, hit[1] - 4, -0.2, 1.15, 0.36), true);
    // the arm and hand
    const k = 150, sq = flat ? 0.42 : lerp(1, 0.6, down);
    const hand = flat ? O.fig.hand('flat', { spread: 0.18 }).transform([-0.18 * k, -0.98 * k * sq, 0.98 * k * 0.55, -0.18 * k * 0.55, W[0], W[1]])
      : O.fig.hand('pinch', { curl: 0.3 }).transform([-0.75 * k, -0.62 * k, -0.62 * k * 0.8, 0.75 * k * 0.8, W[0], W[1]]);
    const arm = S().capsule(W[0] + 6, W[1] + 10, 40, elbow[0], elbow[1], 64).capsule(elbow[0], elbow[1], 64, elbow[0] + 140, elbow[1] + 420, 92).add(hand);
    rimFill(g, arm.path(0.8, 7), -0.25, -1, 5, C.tungstenMid, 0.9);
  }
  function shotI(c, st, lt) {
    c.camera({ x: 990, y: 540, zoom: 1.0 });
    const A = LA(), tw = on2(lt); const s = laterTable(lt, null, 'low');
    const story = 0.5 + 0.5 * wave(tw, 0.9), laugh = Math.max(0, wave(tw - TL.I, 0.45)) * (tw < SLAM ? 1 : 0);
    const slam = seg(tw, SLAM, SLAM + 0.2);
    const roll = bump(tw, 39.0, 39.25, 39.9, 40.2);     // Angelo, to Deena's story: the eyes-to-heaven head roll
    lowScene(c, s, cc => {
      farBody(cc, 'angelo', { facing: 1, scale: A.angelo.scale, clothes: 'none', lean: -0.08 - 0.08 * roll + 0.26 * slam, neck: -0.02 - 0.12 * roll, head: -0.22 * laugh * (1 - roll) - 0.42 * roll + 0.34 * slam, idleAmt: 0.6,
        look: roll > 0.2 ? A.deena.head : null, lookAmt: 0.5,
        armN: { a: 0.6 + 0.3 * laugh, b: 1.2, hand: 'relaxed' } }, A.angelo.head);
      scottBust(cc, Object.assign({ tilt: 0.05 * wave(tw, 2.4) * (1 - slam), y: A.scott.head[1] - Math.round(5 * laugh) }, SCOTT_ARMS));
    }, cc => {
      nearBody(cc, 'deena', { facing: 1, scale: A.deena.scale, lean: 0.18 + 0.06 * story, neck: 0.06, head: 0.04 + 0.08 * story - 0.12 * slam,
        armN: tw < SLAM ? { a: 0.5 + 0.2 * story, b: 1.75 - 0.35 * story, hand: 'side', w: -0.3 + 0.5 * story, handOpts: { curl: 0.4 } } : undefined,
        hold: tw >= SLAM ? { N: { kind: 'flat', at: [600, 960], view: 'edge' } } : undefined }, A.deena.head);
      const tilt = bump(tw, 39.35, 39.55, 40.1, 40.35);  // Marina: a dry tilt of the head
      const M = marinaLater(cc, lt, { spec: { head: 0.32 - 0.16 * tilt, neck: 0.12 - 0.06 * tilt } }); beadGlints(cc, lt, 1556, 400, 1, 0.26, R.path(M));
    }, { front: cc => povHand(cc, lt), wall: cc => kitchenGlare(cc, 0.45) });
  }

  // ------------------------------------------------------------------------------------------------ K1 / K4: overhead, Kay's place at the frame's edge
  // K1 shows, once, the back of Kay's chair at the bottom edge: tucked in, nobody in it, her pile in front of it, half under
  // Marina's arm. Six piles; her chair pushed in.
  const CAM_K1 = () => T().camAt([960, 425], [960, 540], 1.16, -6 * D2R);
  const CAM_K4 = () => T().camAt([960, 170], [960, 560], 1.22, -4 * D2R);
  function shotK1(c, st, lt) {
    c.camera(CAM_K1());
    const tw = on2(lt); const s = laterTable(lt);
    T().back(c, lt, s, 'top');
    const ex = R.key('christof', lt, [[44.7, 0], [45.4, 1], [47.6, 1], [48.3, 0.3]]);
    const cs = T().top.seatAt('christof', s), lat = [-Math.sin(cs.dir), Math.cos(cs.dir)], fw = [Math.cos(cs.dir), Math.sin(cs.dir)];
    const wide = [-1, 1].map(sd => [Math.round(cs.x + fw[0] * (130 - 40 * ex) + lat[0] * sd * (80 + 120 * ex)), Math.round(cs.y + fw[1] * (130 - 40 * ex) + lat[1] * sd * (80 + 120 * ex))]);
    const an = T().top.seatAt('angelo', s), ms = T().top.seatAt('marina', s), kp = T().top.pile({ at: 'kay', ring: 'seats' }, s);
    // Marina leans toward Kay's place, her right forearm lying across it
    topSeat(c, 'marina', s, { lean: 0.12, hands: [ms.hands[0], [Math.round(lerp(ms.hands[1][0], kp.x, 0.86)), Math.round(lerp(ms.hands[1][1], kp.y, 0.86))]], look: [cs.x, cs.y], lookAmt: 0.5 });
    topSeat(c, 'deena', s, { look: tw < 47 ? [cs.x, cs.y] : XY(an), lookAmt: 0.6 });
    topSeat(c, 'christof', s, { lean: -0.15 * ex, hands: ex > 0.05 ? wide : cs.hands, handPose: ex > 0.05 ? 'open' : 'flat', look: tw > 47.3 ? XY(an) : null, lookAmt: 0.5 });
    const ag = R.key('angelo', lt, [[47.1, 0], [47.6, 1], [49.0, 1]]);
    topSeat(c, 'angelo', s, { hands: [an.hands[0], [Math.round(lerp(an.hands[1][0], 1120, ag)), Math.round(lerp(an.hands[1][1], 560, ag))]], handPose: ['flat', ag > 0.5 ? 'point' : 'flat'], look: [cs.x, cs.y], lookAmt: 0.5 });
    topSeat(c, 'scott', s, { look: [cs.x, cs.y], lookAmt: 0.6 });
    T().front(c, lt, s, 'top');
  }
  function shotK2(c, st, lt) {
    c.camera({ x: 990, y: 540, zoom: 1.0 });
    const A = LA(), tw = on2(lt); const s = laterTable(lt, null, 'low');
    const turn = R.key('marina', lt, [[50.9, 0], [51.3, 1]]);
    lowScene(c, s, cc => {
      farBody(cc, 'angelo', { facing: 1, scale: A.angelo.scale, clothes: 'none', lean: 0.1, neck: 0.05, head: 0.05 - 0.1 * Math.sin(Math.PI * seg(tw, 49.4, 50.2)), look: [1000, 560], lookAmt: 0.5, hold: { N: { kind: 'deck', mode: 'fan', open: 0.6, at: [700, 660] } } }, A.angelo.head);
      scottBust(cc, Object.assign({ tilt: 0.06 * wave(tw, 0.2) }, SCOTT_ARMS));
    }, cc => {
      nearBody(cc, 'deena', { facing: 1, scale: A.deena.scale, lean: 0.22, neck: 0.06, head: 0.1, gesture: 'armsFolded' }, A.deena.head);
      const M = marinaLater(cc, lt, { spec: { lean: lerp(0.62, 0.5, turn), head: lerp(0.32, 0.05, turn), look: [1000, 900], lookAmt: 0.6 * turn }, head: [Math.round(lerp(MAR_LEAN[0], MAR_LEAN[0] + 30, turn)), Math.round(lerp(MAR_LEAN[1], MAR_LEAN[1] - 20, turn))] });
      beadGlints(cc, lt, 1570, 400, 2, tw > 52.3 && tw < 52.7 ? 0.6 : 0.05, R.path(M));
    }, { wall: cc => kitchenGlare(cc, 0.45) });
  }
  // K3: Scott, tight: 'There's another in the kitchen. Left cupboard.' His left arm comes up from the shoulder and points at the
  // kitchen doorway behind Kay's place (built here from the shoulder joint, so it can never grow out of his jaw)
  function scottPointArm(c, B, u) {
    const sh = [B.shoulderR[0] - 0.12 * B.scale, B.shoulderR[1] + 0.12 * B.scale], k = B.scale;
    const rest = { el: [sh[0] + 0.25 * k, sh[1] + 0.85 * k], wr: [1290, 700] }, pt = { el: [1427, 613], wr: [1478, 529] };   // the finger ends in front of the lit doorway, clear of Marina
    const el = [lerp(rest.el[0], pt.el[0], u), lerp(rest.el[1], pt.el[1], u)], wr = [lerp(rest.wr[0], pt.wr[0], u), lerp(rest.wr[1], pt.wr[1], u)];
    const dir = norm2(wr[0] - el[0], wr[1] - el[1]), hk = 0.62 * k;
    const hand = u > 0.45 ? O.fig.hand('point', { spread: 0.05 }).transform([dir[0] * hk, dir[1] * hk, -dir[1] * hk, dir[0] * hk, wr[0], wr[1]])
      : O.fig.hand('flat', { spread: 0.1 }).transform([dir[0] * hk, dir[1] * hk * 0.5, -dir[1] * hk, dir[0] * hk * 0.5, wr[0], wr[1]]);
    const arm = S().capsule(sh[0], sh[1], 0.2 * k, el[0], el[1], 0.15 * k).capsule(el[0], el[1], 0.15 * k, wr[0], wr[1], 0.105 * k).add(hand);
    const L = LOWL(); const [ux, uy] = norm2(L.x - el[0], L.y - el[1]);
    rimFill(c.g, arm.path(0.7, 13), ux, uy, 3.2, C.tungsten, 1);
  }
  function shotK3(c, st, lt) {
    c.camera({ x: 1265, y: 470, zoom: 1.36 });
    const s = laterTable(lt, null, 'low'), a = LA().scott;
    const thumb = R.key('scott', lt, [[54.45, 0], [55.05, 1], [57.1, 1], [57.6, 0.4]]);
    lowScene(c, s, cc => {
      const B = scottBust(cc, { tilt: 0.05 - 0.08 * thumb, armL: false, armR: SCOTT_ARMS.armR });
      scottPointArm(cc, B, clamp(thumb, 0, 1));
    }, cc => { marinaLater(cc, lt, { spec: { head: 0.25, look: [1000, 900], lookAmt: 0.3 } }); }, { wall: cc => kitchenGlare(cc, 0.45) });
  }
  function shotK4(c, st, lt) {
    c.camera(CAM_K4());
    const tw = on2(lt);
    const up = R.key('christof', lt, [[STAND, 0], [STAND + 0.75, 1]]);
    const gone = tw > WALKOFF + 0.2;
    const s = laterTable(lt, { chairs: { kay: { out: -40 }, christof: { out: Math.round(70 * up), rot: 0.2 * up, empty: gone } } });
    T().back(c, lt, s, 'top');
    const an = T().top.seatAt('angelo', s), cs = T().top.seatAt('christof', s);
    const creep = R.key('angelo', lt, [[58.2, 0], [58.9, 1], [59.7, 1], [60.3, 0]]);
    const aHand = [Math.round(lerp(an.hands[1][0], 1080, creep)), Math.round(lerp(an.hands[1][1], 440, creep))];
    topSeat(c, 'marina', s, { look: XY(cs), lookAmt: 0.4 });
    topSeat(c, 'deena', s, { look: tw < 59 ? XY(cs) : XY(an), lookAmt: 0.4 });
    topSeat(c, 'angelo', s, { hands: [an.hands[0], aHand], handPose: ['flat', creep > 0.4 ? 'open' : 'flat'], look: XY(cs), lookAmt: 0.6 });
    topSeat(c, 'scott', s, { look: XY(cs), lookAmt: 0.4 });
    // Christof: up out of his chair (bigger in the lens), eyes Angelo's creeping hand, then away round Marina's side
    const wk = seg(on2(lt), WALKOFF, WALKOFF + 1.25);
    if (wk < 1) {
      let cp, dir;
      if (wk > 0) { const a = lerp(4, -70, wk), r = lerp(560, 760, wk * wk); cp = tP(a, r); const q = tP(lerp(4, -70, wk + 0.05), lerp(560, 760, (wk + 0.05) ** 2)); dir = Math.atan2(q[1] - cp[1], q[0] - cp[0]); }
      else { cp = [cs.x, cs.y - 34 * up]; dir = cs.dir; }
      const warn = up > 0.6 && wk <= 0 && tw > 58.5 && tw < 60.6;   // 'And don't touch my cards.': a finger at Angelo's hand
      const F = R.top('christof', { x: Math.round(cp[0]), y: Math.round(cp[1]), dir, scale: Math.round(lerp(94, 114, up)), t: lt, hands: warn ? [false, [Math.round(lerp(cp[0], aHand[0], 0.42)), Math.round(lerp(cp[1], aHand[1], 0.42))]] : (wk > 0 || up > 0.6 ? [false, false] : cs.hands), handPose: warn ? ['off', 'point'] : (wk > 0 || up > 0.6 ? 'off' : 'flat'), foreshorten: true, look: wk > 0 ? null : aHand, lookAmt: 0.9 });
      T().castTop(c, R.path(F), 0.5, 1.04 + 0.03 * up); topInk(c, F, { w: 3.2 });
    }
    T().front(c, lt, s, 'top');
  }

  // ------------------------------------------------------------------------------------------------ M: the kitchen doorway takes him
  // He stays solid ink; the glare eats him from the edges inward (thin parts first), then he is gone.
  // the ink that survives erosion by a disc of radius r: the silhouette mask intersected with itself shifted round two rings
  let _erA = null, _erB = null;
  function erodedInk(P, bb, r) {
    if (!_erA) { _erA = O.makeCanvas(320, 720); _erB = O.makeCanvas(320, 720); }
    const pad = 12, x = Math.floor(bb.x - pad), y = Math.floor(bb.y - pad), w = Math.min(320, Math.ceil(bb.w + 2 * pad)), h = Math.min(720, Math.ceil(bb.h + 2 * pad));
    const a = _erA.getContext('2d'), b = _erB.getContext('2d');
    a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, 320, 720); a.translate(-x, -y); a.fillStyle = '#fff'; a.fill(P);
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, 320, 720); b.drawImage(_erA, 0, 0);
    b.globalCompositeOperation = 'destination-in';
    [r, r * 0.55].forEach((rr, k) => { for (let i = 0; i < 12; i++) { const an = (i + 0.5 * k) / 12 * TAU; b.drawImage(_erA, Math.round(Math.cos(an) * rr), Math.round(Math.sin(an) * rr)); } });
    b.globalCompositeOperation = 'source-in'; b.fillStyle = C.ink; b.fillRect(0, 0, 320, 720); b.globalCompositeOperation = 'source-over';
    return { cv: _erB, x, y, w, h };
  }
  function shotM(c, st, lt) {
    c.camera({ x: 1080, y: 520, zoom: 1.1 });
    const A = LA(), tw = on2(lt); const s = laterTable(lt, null, 'low');
    const D = T().anchors.low.kitchenDoor, dc = (D.x0 + D.x1) / 2;
    const er = ease.inQuad(seg(tw, 64.0, 65.0));      // erosion 0..1
    lowScene(c, s, cc => {
      farBody(cc, 'angelo', { facing: 1, scale: A.angelo.scale, clothes: 'none', lean: 0.12, neck: 0.05, head: 0.1, look: [dc, 380], lookAmt: 0.5 * seg(tw, 63.0, 63.6), hold: { N: { kind: 'deck', mode: 'square', at: [700, 660] } } }, A.angelo.head);
      scottBust(cc, Object.assign({ tilt: -0.03 }, SCOTT_ARMS));
    }, cc => { marinaLater(cc, lt, { spec: { head: 0.2, look: [1000, 900], lookAmt: 0.3 } }); }, {
      wall: cc => {
        const gl = 0.45 + 0.45 * seg(tw, 63.6, 64.4);
        kitchenGlare(cc, gl);
        if (er >= 1) return;
        const sc = Math.round(60 * (1 - 0.14 * seg(tw, 63.6, 65.0)));
        const wk = R.walk('christof', lt, { x0: 1720, scale: 60, facing: -1, t0: 62.65, dist: 1720 - dc });
        const F = R.figure('christof', Object.assign({ y: 690 - Math.round(30 * seg(tw, 63.6, 65.0)), t: lt }, wk, { scale: sc }));
        const g = cc.g, e = cc.em, P = R.path(F);
        inkRim(cc, F, { x: dc - 260, y: 320 }, { color: C.tungstenMid, w: 2.2 });
        e.save(); e.fillStyle = '#000'; e.fill(P); e.restore();           // keep the bloom off his ink
        if (er > 0) {
          // erosion: his outline eaten inward by the glare (a mask eroded by a disc), thin parts first; the eaten band takes
          // the doorway's colours and blooms; what is left is still solid ink
          const bb = R.bbox(F), r = 1 + 34 * er;
          const EK = erodedInk(P, bb, r);
          g.save(); g.beginPath(); g.rect(D.x0 + 4, D.top + 10, D.x1 - D.x0 - 8, D.bot - D.top + 6); g.clip();
          g.clip(P); g.globalAlpha = clamp(gl, 0, 1); g.drawImage(glareCanvas(cc), D.x0 - 40, D.top - 40); g.restore();
          g.drawImage(EK.cv, 0, 0, EK.w, EK.h, EK.x, EK.y, EK.w, EK.h);
          e.save(); e.globalAlpha = 0.65 * er; e.fillStyle = C.tungsten; e.fill(P); e.globalAlpha = 1; e.drawImage(EK.cv, 0, 0, EK.w, EK.h, EK.x, EK.y, EK.w, EK.h); e.restore();
        }
      },
    });
  }

  // ================================================================================================ LINES
  // Kay's type: 48 px, in warm ivory at full opacity (the kit's pale slate read as grey on this paper). The fog-on entrance and
  // the lipstick exit are the kit's own; only the face colour is swapped, for the length of the call, then put back.
  const KAY_IVORY = '#F4E8CF', KAY_PX = 48;
  function kaySay(g, text, x, y, o) {
    const F = O.FACE.kay, was = F.color; F.color = KAY_IVORY;
    try { return O.say(g, 'kay', text, x, y, Object.assign({}, o, { size: KAY_PX })); } finally { F.color = was; }
  }
  // a Kay line on rows (split by word index; the words come from the script), the fog running on across the rows in reading
  // order; on the exit only the last row's lipstick glyph remains
  function kayRows(breaks, lhK) {
    return (c, s, o) => {
      const L = s.L, words = s.T.text.split(' '), segs = []; let a = 0;
      breaks.concat([words.length]).forEach(b => { if (b > a) segs.push(words.slice(a, b).join(' ')); a = b; });
      const lh = KAY_PX * (lhK || 1.22), tot = segs.reduce((m, q) => m + q.length, 0), done = (o.p == null ? 1 : o.p) * tot; let acc = 0;
      segs.forEach((q, i) => {
        const pi = clamp((done - acc) / q.length, 0, 1); acc += q.length; const last = i === segs.length - 1;
        if (o.lip ? !last : pi <= 0) return;
        kaySay(c.g, q, L.x, L.y + i * lh, Object.assign({}, o, { p: o.lip ? 1 : pi }));
      });
    };
  }
  const kayLine = (def, breaks, lhK) => { const fn = kayRows(breaks || [], lhK); def.size = KAY_PX; def.draw = (c, s, o) => fn(c, Object.assign({ L: def }, s), o); return def; };
  // 'Big night for you.' arrives on the cut to the insert, at her shoulder: in the dark above her sleeve, where it comes in from
  // the top right of frame. It stays put across the cuts (she walks away from it, right to left, behind Scott); at 11.7 only
  // the lipstick glyph is left, and it lingers into the corridor.
  const L086 = { x: 1740, y: 250 };
  function drawL086(c, s, o) {
    const lt = c.lt, lipT = 11.7, oo = Object.assign({}, o, { align: 'right' });
    if (lt < lipT) { kaySay(c.g, s.T.text, L086.x, L086.y, oo); return; }
    kaySay(c.g, s.T.text, L086.x, L086.y, Object.assign(oo, { lip: true, alpha: 1 - seg(lt, 13.6, 14.6) }));
  }

  FILM.seq({
    id: 'Q06', title: 'Five', dur: TL.END,
    letterbox: 1.7778,
    lines: [
      // Kay at 8 o'clock in the overhead (lower left), then standing at the left of the two-shot: two rows on the dark floor
      // beside her chair, which is also the ink under her in the two-shot
      kayLine({ id: 'L082', at: 0.35, x: 80, y: 950 }, [5]),
      { id: 'L083', at: 3.5, x: 1750, y: 120, align: 'right' },
      kayLine({ id: 'L084', at: 4.9, x: 80, y: 150 }),
      { id: 'L085', at: 6.95, x: 1750, y: 120, align: 'right' },
      { id: 'L086', at: TL.C2, x: L086.x, y: L086.y, size: KAY_PX, align: 'right', until: 13.9, draw: drawL086 },
      { id: 'L087', at: 19.6, x: 90, y: 165, opts: { big: ['five'] } },
      { id: 'L088', at: 22.3, x: 90, y: 300 },
      { id: 'L089', at: 23.55, x: 1860, y: 840, align: 'right' },
      { id: 'L090', at: 28.3, x: 1860, y: 840, align: 'right' },
      { id: 'L091', at: 29.1, x: 1870, y: 112, align: 'right' },
      { id: 'L092', at: 30.95, x: 90, y: 165, until: 33.55 },
      { id: 'L093', at: 33.85, x: 80, y: 160 },
      { id: 'L094', at: SLAM + 0.15, x: 960, y: 150, align: 'center', until: 44.4, opts: { bulbs: true } },
      { id: 'L095', at: 43.6, x: 80, y: 300 },
      { id: 'L096', at: 45.15, x: 1870, y: 112, align: 'right' },
      { id: 'L097', at: 47.1, x: 1890, y: 650, size: 42, align: 'right', until: 49.3 },
      { id: 'L098', at: 49.65, x: 960, y: 150, align: 'center' },
      { id: 'L099', at: 51.2, x: 1280, y: 92 },
      { id: 'L100', at: 52.6, x: 960, y: 150, align: 'center' },
      { id: 'L101', at: 54.5, x: 380, y: 170, until: 57.0 },
      // ends on its own hold, in place (no dimmed carry-over into the doorway shot)
      { id: 'L102', at: 58.7, x: 1060, y: 150, until: 61.5, opts: { bulbs: true } },
      { id: 'L103', at: 60.0, x: 1890, y: 470, size: 44, align: 'right', until: 62.5 },
    ],
    sound(S) {
      const E = TL.END, CLEAN = 63.5;
      S.bed('room', 0, E + 1.6, { level: -40 });
      // the party speaker: in the room; through the wall in the corridor; nothing on PERFECT; back up for LATER
      S.bed('Q06.groove', 0, E, { steps: [[0, -36], [12.9, -46], [19.0, -37], [PERFECT, -60], [PERFECT + 1.1, -41], [TL.Hh, -46], [TL.I, -24], [CLEAN - 0.5, -100, 0.11]], lp: [[0, 9000], [12.9, 700], [19.0, 9000]] });
      // the walla: what's left after the dead laugh; up with the table's laugh; nothing on Angelo's drain; then the room bursts back;
      // both fall away as the doorway takes Christof (gone by CLEAN)
      S.bed('Q06.walla', 0, E, { steps: [[0, -64], [1.6, -46], [3.0, -50], [12.9, -66], [19.0, -50], [23.4, -56], [PERFECT, -90], [TL.G2, -16], [31.6, -20], [32.6, -60], [TL.Hh, -72], [TL.I, -9], [SLAM, -22], [SLAM + 0.5, -10], [62.4, -19], [CLEAN - 0.5, -100, 0.11]] });
      // Q05's laugh stopped too early; here one weak chuckle at 0.75 dies and nobody joins
      S.cue('Q06.laugh', 0.75, { dur: 0.45, level: -11, i: 1 });
      // 'Well done. How old are you?': the whole table laughs, properly, then it dies at 32.6
      [[30.05, 1.3, -9], [30.15, 1.6, -10], [30.3, 1.2, -11], [30.5, 1.5, -10], [30.85, 1.1, -12], [31.3, 0.9, -13], [31.7, 0.8, -14]].forEach(([t, d, l], i) => S.cue('Q06.laugh', t, { dur: d, level: l, i }));
      [[38.6, 0.8], [39.6, 0.7], [41.05, 1.3], [44.8, 0.6], [47.9, 0.7], [52.9, 1.0], [60.95, 0.9]].forEach(([t, d], i) => S.cue('Q06.laugh', t, { dur: d, level: -29, i }));
      S.cue('Q06.chair', 2.25, { level: -28, pan: -0.35 });
      // Kay's heels: overhead, then down the corridor, going away
      for (let t = 8.8; t < 12.8; t += 0.62) S.cue('Q06.step', t, { level: -37, f: 1700, heel: 160, pan: clamp((t - 10.8) * 0.35, -0.6, 0.6) });
      for (let t = 13.1; t < 16.3; t += 0.62) S.cue('Q06.step', t, { level: -35 - (t - 13) * 2.6, f: 1500, heel: 150, pan: -0.1 - (t - 13) * 0.12 });
      S.cue('Q06.farLatch', CLICK, { pan: -0.55, level: -3 });
      S.duck(CLICK + 0.05, CLICK + 1.3, 0.3);
      // the scoop, the flourish, the deal
      for (let i = 0; i < 6; i++) S.cue('flick', 19.3 + i * 0.2 + 0.25, { level: -30 });
      S.cue('riffle', 21.2, { level: -30 }); S.cue('slap', 21.98, { level: -26 });
      S.cue('riffle', 24.12, { level: -28 }); S.cue('slap', 24.5, { level: -26 });
      DEAL.forEach(([id, t0], i) => { S.cue('flick', t0, { level: -26 }); S.cue('slap', t0 + FLY, { level: i === 4 ? -20 : -24 }); S.cue('ping', t0 + FLY, { i, sour: 14, pan: [0.1, -0.5, 0, 0.45, 0.55][i] }); });
      S.duck(PERFECT + 0.02, PERFECT + 1.0, 0.12);
      S.cue('lub', PERFECT + 0.55, { level: -12 });
      // Angelo's drain: a low dread pad under it, and one distant heartbeat in the stillness
      S.bed('dread', TL.Hh - 0.2, TL.I, { level: -38, root: 55, fi: 2.2, fo: 0.04 });
      S.cue('lub', 36.6, { level: -22, pan: -0.15 });
      // LATER: the game is noisy again; the Extra's drone is back under it, below hearing
      S.bed('drone7', TL.I, CLEAN, { level: -48, seventh: -46, fi: 5, fo: 0.5 });
      KAY_IN.forEach(t => S.cue('slap', t, { level: -31 }));
      THROWS.forEach(([t, w, fl]) => { if (w === 'kay') S.cue('slap', t, { level: -30 }); else { S.cue('flick', t, { level: -30 }); S.cue('slap', t + fl, { level: -25 }); } });
      S.cue('whoosh', SLAM - 0.16, { dur: 0.16, level: -26 }); S.cue('slap', SLAM, { level: -12 }); S.cue('thump', SLAM, { level: -18, pan: 0.1 });
      S.cue('Q06.chair', STAND + 0.1, { level: -27, pan: 0.0, dur: 0.45 });
      for (let t = WALKOFF + 0.1; t < CLEAN - 0.1; t += 0.53) S.cue('Q06.step', t, { level: -35 - Math.max(0, t - TL.M) * 2.5, f: 420, heel: 95, pan: t < TL.M ? -0.3 : 0.45 });
      // the doorway shot plays clean from CLEAN: only the room tone and the fridge, which comes up as the party falls away
      // (no gas here: Q07 starts it on its first frame)
      S.bed('fridge', CLEAN - 1.5, E + 1.6, { level: -40 });
    },
    shots: [
      { at: TL.A, name: 'top: the hands come off; Kay gets up', draw: shotA },
      { at: TL.B, name: 'two: Kay up, Scott half up', draw: shotB },
      { at: TL.C, name: 'low: round behind Scott', draw: shotC },
      { at: TL.C2, name: 'two: the squeeze (insert)', draw: shotC2 },
      { at: TL.C3, name: 'low: on, out through the gap', draw: shotC },
      { at: TL.D, name: 'corridor: over Scott, Kay goes', draw: shotD },
      { at: TL.E, name: 'corridor_q06: the slab snaps off, CLICK', draw: shotE },
      { at: TL.F, name: 'low: Angelo scoops, "five"', draw: shotF },
      { at: TL.G, name: 'top: turning, five dealt, PERFECT', draw: shotG },
      { at: TL.G2, name: 'low: they laugh; Angelo plays along', draw: shotG2 },
      { at: TL.Hh, name: 'low: Angelo and the fifth card', draw: shotH },
      { at: TL.I, name: 'LATER low: the noisy game, the slam', draw: shotI },
      { at: TL.K1, name: 'top: the champion', draw: shotK1 },
      { at: TL.K2, name: 'low: the banter', draw: shotK2 },
      { at: TL.K3, name: 'low: Scott, the kitchen', draw: shotK3 },
      { at: TL.K4, name: 'top: Christof gets up', draw: shotK4 },
      { at: TL.M, name: 'low: the doorway takes him', draw: shotM },
    ],
  });

  // ================================================================================================ SOUND (local)
  const SD = window.SOUND;
  if (SD) {
    const { gain, filt, pan, chain, src, osc, perc, db } = SD;
    // a stock bed through a stepped level (and optional low-pass) bus: no restarts, so no phase jumps
    function bus(ac, out, p) {
      const g = gain(ac, 0); const steps = p.steps || [[0, -30]]; g.gain.setValueAtTime(db(steps[0][1]), 0);
      steps.slice(1).forEach(([t, d, tau]) => g.gain.setTargetAtTime(db(d), t, tau || 0.025));
      const ny = ac.sampleRate / 2 - 200, lp = filt(ac, 'lowpass', Math.min(ny, (p.lp && p.lp[0][1]) || ny), 0.7); (p.lp || []).forEach(([t, f]) => lp.frequency.setTargetAtTime(Math.min(ny, f), t, 0.08));
      chain(lp, g); g.connect(out); return lp;
    }
    SD.beds['Q06.groove'] = (ac, B, t0, t1, p, Rr) => { const inp = bus(ac, B.music, p); SD.beds.groove(ac, Object.assign({}, B, { music: inp }), t0, t1, { level: -0.01 }, Rr); };
    SD.beds['Q06.walla'] = (ac, B, t0, t1, p, Rr) => { const inp = bus(ac, B.room, p); SD.beds.walla(ac, Object.assign({}, B, { room: inp }), t0, t1 + (p.hold || 0), { level: -0.01 }, Rr); };   // hold: run past the cut (Q07's walla tail picks it up)
    // the bathroom door, somewhere out of sight: latch tongue, strike plate, the leaf meeting the frame; far, panned, in the room
    SD.cues['Q06.farLatch'] = (ac, B, t, p) => {
      const out = gain(ac, 1), lp = filt(ac, 'lowpass', 2400, 0.7); chain(lp, pan(ac, p.pan == null ? -0.55 : p.pan), out); out.connect(B.fx);
      const send = gain(ac, 1.4); out.connect(send); send.connect(B.reverb);
      const off = p.level || 0; [[0, 3000, -19], [0.045, 1900, -22]].forEach(([dt, f, lv], i) => { const g = gain(ac, 0); perc(g, t + dt, db(lv + off), 0.0005, 0.03); chain(src(ac, 'white', 301 + i, t + dt, t + dt + 0.1), filt(ac, 'bandpass', f, 3), g, lp); });
      const g2 = gain(ac, 0); perc(g2, t - 0.025, db(-20 + off), 0.002, 0.16); const o = osc(ac, 'sine', 115, t - 0.025, t + 0.25); o.frequency.exponentialRampToValueAtTime(62, t + 0.12); chain(o, g2, lp);
    };
    SD.cues['Q06.step'] = (ac, B, t, p) => {
      const lv = p.level || -36; const g = gain(ac, 0); perc(g, t, db(lv), 0.001, 0.05); chain(src(ac, 'white', 311 + ((p.i || 0) % 4), t, t + 0.08), filt(ac, 'bandpass', p.f || 1200, 2.2), g, pan(ac, p.pan || 0), B.fx);
      const k = gain(ac, 0); perc(k, t, db(lv + 3), 0.002, 0.07); chain(osc(ac, 'sine', p.heel || 140, t, t + 0.1), k, pan(ac, p.pan || 0), B.fx);
    };
    SD.cues['Q06.chair'] = (ac, B, t, p) => {
      const d = p.dur || 0.38, lv = db(p.level || -30); const g = gain(ac, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lv, t + 0.03); g.gain.linearRampToValueAtTime(lv * 0.5, t + d * 0.75); g.gain.linearRampToValueAtTime(0, t + d);
      const f = filt(ac, 'bandpass', 300, 4); f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(520, t + d); chain(src(ac, 'brown', 321, t, t + d + 0.05), f, g, pan(ac, p.pan || 0), B.fx);
      const am = osc(ac, 'square', 31, t, t + d), ag = gain(ac, lv * 0.6); chain(am, ag); ag.connect(g.gain);
    };
    // a laugh inside the walla: breathy formant pulses, 'ha' at ~5 Hz, falling away
    SD.cues['Q06.laugh'] = (ac, B, t, p) => {
      const d = p.dur || 0.8, n = Math.max(2, Math.round(d * 5.2)), lv = db(p.level || -32); const out = gain(ac, 1); chain(out, filt(ac, 'lowpass', 2600, 0.6), pan(ac, ((p.i || 0) % 3 - 1) * 0.35), B.room);
      for (let k = 0; k < n; k++) { const tt = t + k * d / n, g = gain(ac, 0); perc(g, tt, lv * (1 - 0.6 * k / n), 0.012, 0.11); const s0 = src(ac, 'pink', 331 + (k % 3), tt, tt + 0.16);
        [[620 - k * 12 + (p.i || 0) * 37, 7], [1150 - k * 20 + (p.i || 0) * 53, 9]].forEach(([f, q]) => chain(s0, filt(ac, 'bandpass', f, q), g)); g.connect(out); }
    };
  }
})();
