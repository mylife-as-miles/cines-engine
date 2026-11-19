/* ONE TOO MANY — Q05 SEVEN HANDS. Lines L050-L081, actions A030-A049. Set: table ('top', 'low', 'two'). Letterbox 1.78.
   Follows Q04 (Angelo pulls the deck from its box: 'I liked when it ended.'); Q06 continues at the same table (Kay goes to the loo).

   Grammar. The top view is the counting board (F05). The profile two-shot is Scott and Kay. The argument is played as over-the-
   shoulder shot / reverse shot from each speaker's real place: Angelo faces right with the dark hall doorway and the ownerless
   card at his left (frame-left) and Deena's shoulder at the right edge; whoever answers faces left with their own neighbours
   soft across the table and the person at their right as a dark shoulder at the left edge. The low view across the table from
   Christof's place (F06) holds the laughs, and the six hands.
   Deal order: Angelo deals to his right (counterclockwise): Deena, Christof, Marina, Kay, Scott, the GAP, then himself.
   First deal: seven piles in the misregistered ring. Re-deal: six cards squarely before Deena, Christof, Marina, Kay, Scott and
   the gap; Angelo, the dealer, has none. Every count that lands on the gap pings wrong (detuned, panned right, the Extra's bus).
   The glasses: Deena's is nearly empty and carries her crimson lipstick; Angelo's is full. She swaps them in two moves while he
   talks to Christof; from then on Angelo's place has her marked dregs and she drinks his wine.

   Local additions (reported): inkFig / inkTop (path-only rims, ~1 ms a figure, instead of RIG.draw's composited rims);
   the reverse-angle single backdrops revBack / revFront (wall spill, the hall doorway, each speaker's real neighbours soft across
   the table, an over-the-shoulder neighbour, their own glass and cards; the set's 'two' view only holds the Scott/Kay geography);
   the two-shot's far piles (the set's 'two' view draws four fixed cards or none); Deena's lipstick mark on a glass (top and side);
   the hall's dim far strip behind the sixth arm and the cards' lit edges in the low view; Christof's camera-side hand;
   the cues 'Q05.chair', 'Q05.clink', 'Q05.laugh', 'Q05.press', 'Q05.dealq', 'Q05.tap', 'Q05.lub' and the beds 'Q05.room',
   'Q05.walla', 'Q05.groove' (ports of the stock beds with stepped levels and no fade-in, so the join with Q04 holds its level,
   the room cuts dead on 'Angelo.' and the party music comes back after the dead laugh without restarting). */
(function () {
  'use strict';
  const O = window.OTM, C = O.C, R = window.RIG, T = window.SETS.table, SD = window.SOUND;
  const W = 1920, H = 1080, D2R = Math.PI / 180, TAU = Math.PI * 2;
  const clamp = FILM.clamp, lerp = FILM.lerp, seg = FILM.seg, tw = FILM.twos;
  const sm = u => u * u * (3 - 2 * u);
  const bump = (t, a, b, c) => t <= a || t >= c ? 0 : t < b ? sm((t - a) / (b - a)) : 1 - sm((t - b) / (c - b));
  const mixp = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  const norm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  const TA = T.anchors.top, LA = T.anchors.low, WA = T.anchors.two;
  const tP = T.top.P, SEAT6 = T.top.SEAT6, PLACE7 = T.top.PLACE7, GAP = T.top.GAP;
  const L_TOP = T.lights.top, L_LOW = T.lights.low, L_TWO = T.lights.two;
  const DECK = TA.dealer.deck, DROT = TA.dealer.dir + Math.PI / 2, DH = TA.dealer.hands;
  const FSC = TA.figScale, CEN = TA.centre;
  const camAt = T.camAt, PAL = T.pal(0);
  const ID6 = ['scott', 'kay', 'marina', 'christof', 'deena', 'angelo'];
  const MEMO = new Map(); const mem = (k, fn) => { if (!MEMO.has(k)) MEMO.set(k, fn()); return MEMO.get(k); };
  function scr(cam, p) {   // world -> screen for a camera (line positions, pointers)
    const z = cam.zoom || 1, r = cam.rot || 0, cx = cam.x == null ? 960 : cam.x, cy = cam.y == null ? 540 : cam.y; const dx = (p[0] - cx) * z, dy = (p[1] - cy) * z;
    return [960 + (cam.dx || 0) + dx * Math.cos(r) - dy * Math.sin(r), 540 + (cam.dy || 0) + dx * Math.sin(r) + dy * Math.cos(r)];
  }
  const camLerp = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), zoom: lerp(a.zoom, b.zoom, u), rot: lerp(a.rot || 0, b.rot || 0, u) });
  const LIPC = C.tDeena;   // Deena's lipstick: her own crimson (Kay's print is the set's #D9262F, a different red, and only on Kay's glass)

  // ================================================================================== timeline ==========
  const TM = {
    swap: 4.2, riffle: 7.0, angeloFan: 10.0, christof1: 12.2, deal1: 14.6,
    scottKay: 17.0, kayClose: 21.1, scottKay2: 23.9, deenaDrink: 26.8, scottKay3: 28.2,
    stop: 33.6, count: 37.5, countGap: 0.38, sevenWide: 41.0,
    piles2: 42.5, christof2: 48.4, laughs: 51.2, gather: 55.8,
    shuffle: 58.4, deal2: 59.4, deal2Gap: 0.75, emptyPlace: 64.5,
    rightOkay: 65.9, christof3: 71.0, wheresMine: 73.6, povGap: 75.8, christofStops: 76.7,
    marina2: 78.1, wentAround: 80.6, deena4: 82.6, touch: 84.9, please: 89.9, hands: 91.5, end: 97.7,
  };
  const DEAL7 = ['deena', 'christof', 'marina', 'kay', 'scott', 'gap', 'angelo'];
  const COUNT7 = ['scott', 'kay', 'marina', 'christof', 'deena', 'angelo', 'gap'];
  const DEAL6 = ['deena', 'christof', 'marina', 'kay', 'scott', 'gap'];
  const FLY = 0.3;
  // first deal: round one quick, then the game goes on under the talk until the cards stop (35 cards: five a pile)
  const LAUNCH1 = []; for (let k = 0; k < 7; k++) LAUNCH1.push(TM.deal1 + 0.15 + k * 0.3);
  for (let k = 7; k < 35; k++) LAUNCH1.push(TM.scottKay + 0.25 + (k - 7) * 0.585);
  const COUNT_AT = COUNT7.map((_, k) => TM.count + k * TM.countGap);
  const DEAL2_AT = DEAL6.map((_, k) => TM.deal2 + k * TM.deal2Gap);       // one count cut per card; it lands 0.2 s in
  const LAUNCH2 = DEAL2_AT.map(t => t + 0.2 - FLY);
  const pileN = (t, id) => { let n = 0; LAUNCH1.forEach((l, k) => { if (t >= l + FLY && DEAL7[k % 7] === id) n++; }); return Math.min(5, n); };
  function piles1(t) { return DEAL7.map(id => ({ at: id, n: pileN(t, id) })).filter(e => e.n > 0); }
  function flying1(t) { const f = []; LAUNCH1.forEach((l, k) => { if (t >= l && t < l + FLY) f.push({ from: 'dealer', to: DEAL7[k % 7], u: (t - l) / FLY, h: 0.13, spin: 1.1 }); }); return f; }
  function piles2(t) { return DEAL6.filter((id, k) => t >= LAUNCH2[k] + FLY).map(id => ({ at: id, ring: 'seats', n: 1 })); }
  function flying2(t) { const f = []; LAUNCH2.forEach((l, k) => { if (t >= l && t < l + FLY) f.push({ from: 'dealer', to: DEAL6[k], u: (t - l) / FLY, h: 0.1, spin: 0.9 }); }); return f; }
  // what lies on the table at time t, for every view: 'none' before the first card, then 'deal' (growing piles), 'seven' (five a
  // pile), 'gone' (gathered), then 'six' (one card each, the sixth in the gap, none at Angelo's place)
  const tableCards = t => t < TM.deal1 + 0.15 + FLY ? 'none' : t < TM.gather ? (t < LAUNCH1[34] + FLY ? 'deal' : 'seven') : t < LAUNCH2[0] + FLY ? 'gone' : 'six';

  // ---- the glasses. By PLACE: the glass standing at Deena's place and the one at Angelo's. Before the swap Deena's is nearly
  // empty and lipstick-marked, Angelo's full; after it they have traded; Deena then drinks hard (the cutaway) -------------------
  const DEENA_DRANK = t => lerp(0.92, 0.42, seg(t, TM.deenaDrink + 0.2, TM.deenaDrink + 1.3));
  const G_LOW = 0.1, G_FULL = 0.92;
  function placeGlass(place, t) {   // {fill, mark}
    const swapped = t >= SW1;
    if (place === 'deena') return swapped ? { fill: DEENA_DRANK(t), mark: false } : { fill: G_LOW, mark: true };
    return swapped ? { fill: G_LOW, mark: true } : { fill: G_FULL, mark: false };
  }
  const OTHER_GL = { scott: 0.4, kay: { fill: 0.45, lip: true }, marina: 0.3, christof: 0.25 };
  function topGlasses(t) { const d = placeGlass('deena', t), a = placeGlass('angelo', t);
    return Object.assign({}, OTHER_GL, { deena: { fill: d.fill, at: T.top.glass('deena') }, angelo: { fill: a.fill, at: t >= SW1 ? PARK : T.top.glass('angelo') } }); }
  // Deena's crimson print on a glass seen from above (the rim circle of T.glassTop, the side toward its drinker)
  function markTop(c, b, toward) {
    const G = T.top.G, hz = 0.2 * G.PXM, rim = T.top.Z(b[0], b[1], hz), rk = 24 * T.top.kz(hz); const a0 = Math.atan2(toward[1] - rim[1], toward[0] - rim[0]);
    const g = c.g; g.save(); g.strokeStyle = LIPC; g.lineCap = 'round'; g.lineWidth = 6.5; g.beginPath(); g.arc(rim[0], rim[1], rk - 1, a0 - 0.55, a0 + 0.55); g.stroke();
    g.globalAlpha = 0.6; g.lineWidth = 3; g.beginPath(); g.arc(rim[0], rim[1], rk - 6, a0 - 0.3, a0 + 0.38); g.stroke(); g.restore();
  }
  // ... and from the side (T.glassSide geometry: rim at y - 0.985h, half-width 0.205h): a print just under the rim, front left
  function markSide(c, x, y, h, side) {
    const g = c.g, s = side || -1, lx = x + h * 0.08 * s, ly = y - h * 0.955; g.save(); g.fillStyle = LIPC;
    g.beginPath(); g.ellipse(lx, ly, h * 0.075, h * 0.022, 0.05 * s, 0, TAU); g.fill(); g.globalAlpha = 0.6; g.beginPath(); g.ellipse(lx + h * 0.02 * s, ly + h * 0.025, h * 0.05, h * 0.014, 0, 0, TAU); g.fill(); g.restore();
  }
  function markLow(c, place) {   // the low view: the glass at that place (lowSeatGlass: clock - 16, r 0.5)
    const [e, n] = T.low.CL(SEAT6[place] - 16, 0.5); const ft = T.low.P3(e, 0, n), h = 0.17 * T.low.pxm(e, n); markSide(c, ft[0], ft[1], h, -1);
  }

  function tableState(t, o) {
    const s = { glasses: topGlasses(t) }; const k = tableCards(t);
    if (k === 'deal' || k === 'seven' || k === 'none') { s.piles = piles1(Math.min(t, TM.stop)); s.flying = t < TM.stop ? flying1(t) : []; }
    else if (k === 'gone') s.piles = [];
    else { s.piles = piles2(t); s.flying = flying2(t); s.ring = 'seats'; }
    return Object.assign(s, o || {});
  }
  const pileXY = (name, ring) => T.top.pile(name, { ring: ring || 'seven' });
  const GAP7 = pileXY('gap'), ANG7 = pileXY('angelo'), GAP6 = pileXY('gap', 'seats');
  // Angelo's dealing hand (top): his right hand flicks toward each card's pile, his left keeps the deck
  function flickHand(t, launches, order, ring) {
    let e = 0, tgt = null;
    launches.forEach((l, k) => { const b = bump(t, l - 0.12, l + 0.02, l + 0.3); if (b > e) { e = b; tgt = order[k % order.length]; } });
    if (!tgt) return DH[1]; const p = pileXY(tgt, ring); return mixp(DH[1], [p.x, p.y], 0.34 * e);
  }

  // ================================================================================== ink figures ==========
  function inkFig(c, F, light, o) {
    o = o || {}; const g = c.g; const m = g.getTransform(); const z = Math.hypot(m.a, m.b) || 1;
    const col = o.color || C.tungsten, w = (o.w || 3.4) / z;
    const at = (F.joints && (F.joints.chest || F.joints.head)) || F.at || F.head; const [ux, uy] = norm(light.x - at[0], light.y - at[1]);
    if (o.clip) { g.save(); g.clip(o.clip); }
    T.silFill(g, R.path(F), o.fill || C.ink, ux, uy, w, col, o.rimAlpha);
    const po = { light, color: col, em: c.em, details: {}, scale: F.scale || 60 };
    if (o.props !== false) (F.props || []).forEach(fn => fn(g, po));
    if (F.front) T.silFill(g, F.front.path(0.7, (F.seed || 21) + 7), o.fill || C.ink, ux, uy, w * 0.8, col, o.rimAlpha);
    if (F.details && o.details !== false) drawDetails(g, F, light, col, z);
    if (o.clip) g.restore();
    return F;
  }
  function drawDetails(g, F, light, col, z) {
    const cig = F.details.filter(d => d.kind === 'cigarette'); const rest = cig.length ? F.details.filter(d => d.kind !== 'cigarette') : F.details;
    if (rest.length) O.fig.drawDetails(g, cig.length ? Object.assign({}, F, { details: rest }) : F, { light, rimColor: col });
    cig.forEach(d => { const m = O.fig.M.comp(F.M, d.headM); const a = O.fig.M.ap(m, d.a), b = O.fig.M.ap(m, d.b); g.save(); g.strokeStyle = O.mix(C.cardPaper, C.tungstenMid, 0.3); g.lineCap = 'round'; g.lineWidth = Math.min((F.scale || 60) * 0.045, 3.4 / (z || 1)); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore(); });
  }
  const RIMB = [[0, C.tungsten], [0.75, O.mix(C.tungsten, C.ink, 0.35)], [1.55, O.mix(C.tungsten, C.ink, 0.62)], [2.7, C.ink]];
  function inkTop(c, F, flash) {
    const g = c.g; const m = g.getTransform(); const z = Math.hypot(m.a, m.b) || 1; const w = 3.2 / Math.sqrt(z) * (1 + 1.6 * (flash || 0));
    g.fillStyle = C.ink; g.fill(R.path(F));
    const crown = F._q5crown || (F._q5crown = F.crown.path(0.2, (F.seed || 21) + 3)); const [ux, uy] = norm(L_TOP.x - F.head[0], L_TOP.y - F.head[1]);
    g.save(); g.clip(crown); RIMB.forEach(([d, col]) => { g.save(); g.translate(-ux * d * w, -uy * d * w); g.fillStyle = col; g.fill(crown); g.restore(); }); g.restore();
    const po = { light: L_TOP, color: C.tungsten, em: c.em, details: {}, scale: F.scale };
    (F.props || []).forEach(fn => fn(g, po)); if (F.front) { g.fillStyle = C.ink; g.fill(F.front.path(0.6, 9)); }
    if (F.details) O.fig.drawDetails(g, F, { light: L_TOP });
    return F;
  }

  // ================================================================================== TOP view ==========
  // P: {id: false | {at:{x,y,dir}, hands, handPose, look, lookAmt, deck, lean, pre(c)}}; ids not given sit at rest
  function topCast(c, s, P, t) {
    const figs = [];
    ID6.forEach(id => {
      const q = P[id]; if (q === false) return; const o = q || {};
      const st = o.at || T.top.seatAt(id, s);
      const spec = { x: st.x, y: st.y, dir: st.dir, scale: FSC, hands: o.hands || st.hands, handPose: o.handPose || 'flat', foreshorten: true, t };
      if (o.look) { spec.look = o.look; spec.lookAmt = o.lookAmt == null ? 0.8 : o.lookAmt; }
      if (o.deck) spec.deck = true; if (o.lean) spec.lean = o.lean;
      figs.push({ F: R.top(id, spec), pre: o.pre, flash: o.flash });
    });
    figs.forEach(f => T.castTop(c, R.path(f.F), 0.4, 1.03));
    figs.forEach(f => { if (f.pre) f.pre(c); inkTop(c, f.F, f.flash); });
    return figs;
  }
  // the glasses' marks ride on top of the table layer (T.back draws the glasses)
  function topMarks(c, t, s) {
    const G = s.glasses || {}; if (!s._marks) ['deena', 'angelo'].forEach(pl => { const pg = placeGlass(pl, t); const o = G[pl]; if (!pg.mark || !o || !o.at) return; markTop(c, o.at, headOf('deena')); });
    if (s._marks) s._marks.forEach(m => markTop(c, m.at, m.toward));
  }
  function topScene(c, t, s, P) { T.back(c, t, s, 'top'); topMarks(c, t, s); topCast(c, s, P || {}, t); T.front(c, t, s, 'top'); }
  const headOf = id => { const st = T.top.seatAt(id, {}); return [st.x + Math.cos(st.dir) * 18, st.y + Math.sin(st.dir) * 18]; };
  const lookAll = (p, amt) => { const P = {}; ID6.forEach(id => { P[id] = { look: p, lookAmt: amt == null ? 0.9 : amt }; }); return P; };
  function dealLooks(base) { const P = lookAll(DECK, 0.5); P.scott = { look: headOf('kay'), lookAmt: 0.9 }; P.kay = { look: headOf('scott'), lookAmt: 0.5 }; return Object.assign(P, base || {}); }
  // a camera on one pile with its owner at the bottom of the frame (the count cuts)
  function countCam(name, ring, zoom) { const p = pileXY(name, ring); const clock = ring === 'seats' ? (name === 'gap' ? GAP : SEAT6[name]) : PLACE7[name]; return camAt([p.x, p.y], [960, 430], zoom || 2.1, (180 - clock) * D2R); }

  // ================================================================================== LOW view (F06) ==========
  const LOWBASE = {};
  function lowSpec(id, extra, t) {
    const a = LA.seats[id]; const facing = a.facing || 1;
    if (!LOWBASE[id]) { const sk = R.skeleton(id, { x: 0, y: 0, anchor: 'hip', pose: 'sit', facing, scale: a.scale }); LOWBASE[id] = [a.head[0] - sk.sk.head[0], a.head[1] - sk.sk.head[1]]; }
    const ex = Object.assign({}, extra || {}); const dx = ex.dx || 0, dy = ex.dy || 0; delete ex.dx; delete ex.dy;
    return Object.assign({ x: LOWBASE[id][0] + dx, y: LOWBASE[id][1] + dy, anchor: 'hip', pose: 'sit', facing, scale: a.scale, t }, ex);
  }
  const LCARD = (name, ring) => { const q = T.low.CL(ring === 'seats' ? (name === 'gap' ? GAP : SEAT6[name]) : PLACE7[name], 0.4); const p = T.low.P3(q[0], 0, q[1]); return [p[0], p[1]]; };
  function tableHandLow(pose, wrist, fd, side, L, o) {
    o = o || {}; const hs = O.fig.hand(pose, { spread: o.spread == null ? 0.12 : o.spread, curl: o.curl || 0 }); fd = norm(fd[0], fd[1]); const nL = [-fd[1], fd[0]]; const lift = o.lift || 0;
    const sh = O.S();
    hs.polys.forEach(poly => {
      const lo = [], hi = [];
      poly.forEach(([u, v]) => { const e = wrist[0] + fd[0] * u * L + nL[0] * (-v) * L * side, n = wrist[1] + fd[1] * u * L + nL[1] * (-v) * L * side; const yh = 0.034 * Math.max(0, 1 - Math.pow(clamp(u / 0.62, 0, 1), 2.2)) + 0.006;
        lo.push(T.low.P3(e, 0.004 + lift, n)); hi.push(T.low.P3(e, yh + lift, n)); });
      sh.poly(lo); sh.poly(hi);
    });
    return sh;
  }
  // a hand coming down flat on a card (low view): fingers reaching from `from` (table metres) toward the card; the fingertips stop
  // on the card's near half (back: how far the wrist sits behind the card centre), so the far half stays bare and lit.
  function tableHand(c, card, from, u, o) {
    o = o || {}; const fd = norm(card[0] - from[0], card[1] - from[1]); const down = FILM.ease.outCubic(clamp(u, 0, 1)); const lift = (1 - down) * 0.1;
    const back = o.back || 0.13; const wrist = [card[0] - fd[0] * back, card[1] - fd[1] * back];
    const hs = tableHandLow('open', wrist, fd, o.side || 1, o.L || 0.17, { lift, spread: 0.15 });
    const W3 = T.low.P3(wrist[0], 0.03 + lift, wrist[1]), E3 = T.low.P3(from[0], (o.fromY || 0.15) + lift * 0.5, from[1]);
    const pth = O.S().add(hs).add(O.S().capsule(W3[0], W3[1], 0.036 * T.low.pxm(wrist[0], wrist[1]), E3[0], E3[1], 0.05 * T.low.pxm(from[0], from[1]))).path(0.7, 31 + (o.seed || 0));
    const [ux, uy] = norm(L_LOW.x - W3[0], L_LOW.y - W3[1]); T.silFill(c.g, pth, C.ink, ux, uy, 3, C.tungsten);
  }
  const CLs = (id, r) => T.low.CL(id === 'gap' ? GAP : SEAT6[id], r);
  // the low view's card quads (the set's cardQuad: 0.078 x 0.11 m, pointing inward, with its per-pile jitter)
  const JIT = [0.06, -0.1, 0.03, 0.08, -0.06, 0.1, -0.04];
  function lowCardQuad(clock, i, r) {
    const [ce, cn] = T.low.CL(clock, r || 0.4); const a = Math.atan2(-cn, -ce) + JIT[i % 7]; const u = [Math.cos(a), Math.sin(a)], v = [-u[1], u[0]];
    const P = (s0, t0) => T.low.P3(ce + u[0] * s0 + v[0] * t0, 0.003, cn + u[1] * s0 + v[1] * t0); return [P(0.055, 0.039), P(0.055, -0.039), P(-0.055, -0.039), P(-0.055, 0.039)];
  }
  // a lit edge on each card: the paper border catching the lamp on the side away from the hand (drawn over the hands' fingertips)
  function cardEdges(c, list) {
    const g = c.g; g.save(); g.lineJoin = 'round';
    list.forEach(([clock, i]) => { const q = lowCardQuad(clock, i); const far = q.slice().sort((a, b) => a[2] - b[2]).slice(2);   // the two corners nearest the lamp side (deeper)
      g.strokeStyle = C.tungsten; g.lineWidth = 3; g.beginPath(); g.moveTo(far[0][0], far[0][1]); g.lineTo(far[1][0], far[1][1]); g.stroke(); });
    g.restore();
  }
  // o: {cam, s, angelo, scott, kay, deena, marina (spec extras | false), christofHand u, armPass:[ids], preTable(c), postHands(c)}
  function lowScene(c, t, o) {
    const s = o.s; c.camera(o.cam || T.cams.low);
    T.back(c, t, s, 'low', { part: 'wall' });
    if (o.preFar) o.preFar(c);
    const far = {};
    if (o.angelo !== false) far.angelo = R.figure('angelo', lowSpec('angelo', Object.assign({ lean: 0.22, neck: 0.1, head: 0.12, hold: { N: { kind: 'deck', mode: 'square' } } }, o.angelo), t));
    if (o.kay !== false) far.kay = R.figure('kay', lowSpec('kay', Object.assign({ lean: 0.25, neck: 0.1, head: 0.14 }, o.kay), t));
    let scottB = null; if (o.scott !== false) { const a = LA.seats.scott; scottB = R.bust('scott', Object.assign({ x: a.head[0], y: a.head[1], scale: a.scale, t }, o.scott)); }
    if (far.angelo) inkFig(c, far.angelo, L_LOW, { w: 3 });
    if (scottB) inkFig(c, scottB, L_LOW, { w: 3 });
    if (far.kay) inkFig(c, far.kay, L_LOW, { w: 3 });
    T.back(c, t, s, 'low', { part: 'table' });
    if (o.marks !== false) ['deena', 'angelo'].forEach(pl => { if (placeGlass(pl, t).mark) markLow(c, pl); });
    (o.armPass || []).forEach(id => {
      if (id === 'scott' && scottB && scottB.arms.L) { const A2 = scottB.arms.L; inkFig(c, scottB, L_LOW, { w: 3, details: false, clip: O.S().capsule(A2.E[0], A2.E[1], 30, A2.W[0], A2.W[1], 46).path(0, 1) }); }
      else if (far[id]) { const F = far[id]; const h = F.holds && F.holds.N; if (!h) return; const e = F.joints.elbowN, w = h.tip || F.joints.wristN; inkFig(c, F, L_LOW, { w: 3, details: false, clip: O.S().capsule(e[0], e[1], 0.22 * F.scale, w[0], w[1], 0.3 * F.scale).path(0, 1) }); }
    });
    if (o.scottHand != null) tableHand(c, CLs('scott', 0.4), T.low.CL(190, 0.74), o.scottHand, { fromY: 0.05, side: -1, seed: 1, back: o.scottBack });
    if (o.christofHand != null) tableHand(c, CLs('christof', 0.4), CLs('christof', 1.05), o.christofHand, { fromY: 0.12, back: o.christofBack || 0.115, L: 0.18, seed: 2 });
    [['deena', o.deena], ['marina', o.marina]].forEach(([id, ex]) => {
      if (ex === false) return; const F = R.figure(id, lowSpec(id, Object.assign({ lean: 0.3, neck: 0.1, head: 0.16 }, ex), t)); inkFig(c, F, L_LOW, { w: 4.5 });
    });
    if (o.postHands) o.postHands(c);
    T.front(c, t, s, 'low');
    return { far, scottB };
  }
  const NEAR_REST = { deena: [560, 930], marina: [1720, 1000] };

  // ================================================================================== TWO view (Scott and Kay) ==========
  const KA = WA.kay, SA = WA.scott;
  const twoGlasses = t => ({ kay: { fill: 0.45, lip: true }, scott: 0.4, marina: 0.3, christof: 0.25, deena: placeGlass('deena', t).fill, angelo: placeGlass('angelo', t).fill });
  const twoState = (t, o) => Object.assign({ piles: false, glasses: twoGlasses(t) }, o || {});
  // the far side's piles, growing card by card (the set's 'two' view only has four fixed cards or none)
  const FARP = { marina: [470, 640], christof: [800, 628], deena: [1120, 630], angelo: [1450, 642] };
  function flatCard(g, x, y, rot, sq, k) {
    g.save(); g.translate(x, y); g.scale(k || 1, (k || 1) * (sq || 0.32)); g.rotate(rot);
    g.fillStyle = 'rgba(13,10,9,0.5)'; g.fillRect(-14, -19, 32, 44); g.fillStyle = C.cardPaper; g.fillRect(-15, -21, 30, 42); g.fillStyle = C.cardBlue; g.fillRect(-12, -18, 24, 36); g.restore();
  }
  function farPiles(c, t) { const g = c.g; if (tableCards(t) === 'none' || tableCards(t) === 'gone') return;
    Object.keys(FARP).forEach((id, i) => { const n = tableCards(t) === 'six' ? (id === 'angelo' ? 0 : 1) : pileN(Math.min(t, TM.stop), id); for (let k = 0; k < n; k++) flatCard(g, FARP[id][0] + (k % 2) * 1.5, FARP[id][1] - k * 2.2, 0.3 * Math.sin(i * 2.1) + 0.06 * Math.sin(k * 3.1), 0.32); }); }
  const FARX = { deena: [1120, 630], christof: [800, 628], marina: [470, 640], kay: [600, 650], scott: [1300, 650], gap: [1420, 646], angelo: [1500, 642] };
  function smears(t) { const f = []; LAUNCH1.forEach((l, k) => { if (t >= l && t < l + 0.5 && t < TM.stop && k >= 7) f.push({ from: [1560, 600], to: FARX[DEAL7[k % 7]], u: (t - l) / 0.5, h: 30 }); }); return f; }
  function figTwo(id, chair, extra, t) { const A = chair === 'left' ? KA : SA; return R.figure(id, Object.assign({ x: A.x, y: A.y, anchor: 'hip', pose: 'sit', facing: A.facing, scale: A.scale, t }, extra || {})); }
  function twoScene(c, t, s, kay, scott, cam) {
    c.camera(cam || T.cams.two); T.back(c, t, s, 'two'); farPiles(c, t);
    if (kay !== false) inkFig(c, figTwo('kay', 'left', kay, t), L_TWO); if (scott !== false) inkFig(c, figTwo('scott', 'right', scott, t), L_TWO);
    T.front(c, t, s, 'two');
  }
  const KAY_HEAD = [554, 623], SCOTT_HEAD = [1372, 612];

  // ================================================================================== REVERSE singles ==========
  // Each speaker from their own place. Angelo (the left chair, facing right): the dark hall doorway behind him at frame-left with
  // the gap's card lying on the table under it, Scott and Kay soft across the table, Deena's shoulder at the right edge.
  // The others (the right chair, facing left): their own neighbours soft across the table, the person at their right as a dark
  // shoulder at the left edge, their own glass and cards. The pendant hangs over the table centre, on the side they face.
  const REV = {
    angelo: { key: 'ang', px: 1190, spill: [960, 430], door: { x0: 120, x1: 392, top: -40 }, soft: [['scott', 1035, 532, 56, 0.04], ['kay', 1330, 526, 58, -0.05]],
      ots: { id: 'deena', x: 1470, y: 1085, scale: 168, facing: -1, lean: 0.34, head: 0.1 }, own: [880, 790], gapCard: [292, 666] },
    christof: { key: 'chr', px: 760, spill: [980, 430], soft: [['marina', 900, 528, 58, 0.05], ['kay', 600, 524, 55, -0.04]], ots: { id: 'deena', x: 380, y: 1085, scale: 168, facing: 1, lean: 0.3, head: 0.12 }, glass: 0.25, own: [1060, 790] },
    deena: { key: 'dee', px: 760, spill: [980, 430], soft: [['christof', 905, 526, 60, -0.04], ['marina', 610, 528, 55, 0.05]], ots: { id: 'angelo', x: 420, y: 1085, scale: 168, facing: 1, lean: 0.3, head: 0.1, cig: false }, own: [1060, 790] },
    marina: { key: 'mar', px: 760, spill: [980, 430], soft: [['kay', 905, 528, 56, 0.05], ['scott', 610, 524, 58, -0.04]], ots: { id: 'christof', x: 400, y: 1085, scale: 168, facing: 1, lean: 0.3, head: 0.12 }, glass: 0.3, own: [1060, 790], kitchen: [360, 470] },
  };
  function bandsL(g, paths, cols) { paths.forEach((p, i) => { g.fillStyle = cols[i]; g.fill(p); if (i > 0) { g.save(); g.strokeStyle = O.ditherPattern(g, cols[i - 1]); g.lineWidth = 5; g.stroke(p); g.restore(); } }); }
  const SOFT_Y0 = 250;
  function softCanvas(c, V) {
    return c.cache('Q05:rv:soft:' + V.key, q => {
      const tmp = O.makeCanvas(W, 520), tg = tmp.getContext('2d'); tg.translate(0, -SOFT_Y0);
      V.soft.forEach(([id, x, y, sc, tilt], i) => { const b = O.fig.bust(id, { x, y, scale: sc, tilt }); const pth = b.shape.path(1.2, 40 + i); tg.fillStyle = '#0E0A08'; tg.fill(pth);
        const [ux, uy] = norm(V.px - x, 236 - y); tg.save(); tg.clip(pth); tg.fillStyle = O.rgba(C.tungstenMid, 0.75); tg.fill(pth); tg.translate(-ux * 3, -uy * 3); tg.fillStyle = '#0E0A08'; tg.fill(pth); tg.restore(); });
      q.filter = 'blur(5px)'; q.drawImage(tmp, 0, 0); q.filter = 'none';
    }, W, 520);
  }
  const REV_TOP = () => mem('rv:top', () => O.S().ellipse(960, 724, 960, 124, 0).path(1.2, 54));
  const REV_LIP = () => mem('rv:lip', () => O.S().M(0, 724).C(0, 724 + 165, 1920, 724 + 165, 1920, 724).L(1920, 768).C(1920, 768 + 165, 0, 768 + 165, 0, 768).Z().path(1, 57));
  // o: {cards: 'none'|'deal'|'seven'|'six', glassFill, mark, gapCard, ownCard, deck}
  function revBack(c, t, V, o) {
    const g = c.g, p = PAL; o = o || {};
    g.fillStyle = C.ink; g.fillRect(-300, -300, W + 600, H + 600);
    // the shade throws its light down: the wall is lit in a low band along the table's horizon, dark above (where the type sits)
    bandsL(g, mem('rv:spill:' + V.key, () => [[1180, 235], [800, 140], [440, 84]].map(([rx, ry], i) => O.S().ellipse(V.spill[0], 655, rx, ry, 0.01).path(2.6, 71 + i))), [O.mix(p.wall[0], C.ink, 0.1), p.wall[1], O.mix(p.wall[2], p.mid, 0.2)]);
    if (V.kitchen) {   // a far, closed kitchen doorway: its dim panel and casing (Marina's side of the room)
      g.fillStyle = '#100B08'; g.fill(mem('rv:kc:' + V.key, () => O.S().rect(V.kitchen[0] - 72, V.kitchen[1] - 250, 144, 400).path(0.8, 81)));
      g.fillStyle = O.mix('#1E140E', p.low, 0.35); g.fill(mem('rv:kd:' + V.key, () => O.S().rect(V.kitchen[0] - 56, V.kitchen[1] - 236, 112, 386).path(0.8, 82)));
    }
    if (V.door) {   // the hall doorway at Angelo's left: casing catching the lamp on its right jamb, the opening a deeper ink than the wall
      const D = V.door; g.fillStyle = '#17100C'; g.fill(mem('rv:dc', () => O.S().rect(D.x0 - 18, D.top, D.x1 - D.x0 + 36, 760 - D.top).path(0.6, 83)));
      g.fillStyle = '#050303'; g.fill(mem('rv:do', () => O.S().rect(D.x0, D.top + 14, D.x1 - D.x0, 760 - D.top).path(0.6, 84)));
      g.fillStyle = O.rgba(p.mid, 0.85); g.fillRect(D.x1 + 2, D.top + 14, 4, 760 - D.top); g.fillStyle = O.rgba(p.hot, 0.5); g.fillRect(D.x1 + 14, D.top + 14, 2, 760 - D.top);
    }
    if (V.soft) g.drawImage(softCanvas(c, V), 0, SOFT_Y0);
    const top = REV_TOP(); g.save(); g.clip(top); g.fillStyle = p.low; g.fill(top);
    bandsL(g, mem('rv:rings:' + V.px, () => [O.S().ellipse(V.px, 718, 760, 96, 0).path(1.6, 55), O.S().ellipse(V.px, 718, 430, 56, 0).path(1.6, 56)]), [p.mid, p.hot]);
    g.restore();
    g.fillStyle = C.ink; g.fill(REV_LIP());
    // far cards in front of the soft neighbours, and the speaker's own
    const k = o.cards || 'none';
    if (k !== 'none' && k !== 'gone' && V.soft) V.soft.forEach(([id, x], i) => { const n = k === 'six' ? 1 : k === 'seven' ? 5 : Math.max(0, pileN(Math.min(t, TM.stop), id)); for (let j = 0; j < n; j++) flatCard(g, x + 40 + (j % 2) * 1.5, 640 - j * 2.2, 0.25 * Math.sin(i * 2.3 + 1) + 0.05 * Math.sin(j * 3.1), 0.3, 1.0); });
    if (V.soft) V.soft.forEach(([id, x], i) => T.glassSide(c, x - 70, 636, 56, { fill: [0.3, 0.4][i] }, {}, [V.px, 236]));
    if (o.gapCard) flatCard(g, o.gapCard[0], o.gapCard[1], -0.12, 0.3, 1.9);
    if (o.ownCard) { const n = o.ownCard; for (let j = 0; j < n; j++) flatCard(g, V.own[0] + (j % 2) * 2, V.own[1] - j * 3, 0.2 + 0.05 * Math.sin(j * 2.7), 0.3, 2.1); }
    // the pendant (cord, shade, the hot lip of the bulb)
    g.save(); g.translate(V.px - 960, 0);
    g.fillStyle = C.ink; g.fillRect(958, -60, 4, 216); g.fill(mem('rv:shade', () => O.S().M(930, 150).L(990, 150).C(1050, 168, 1092, 214, 1104, 268).C(1060, 282, 860, 282, 816, 268).C(828, 214, 870, 168, 930, 150).Z().path(0.7, 58)));
    g.fillStyle = p.hot; g.fill(mem('rv:bulb', () => O.S().ellipse(960, 270, 140, 13, 0).path(0.6, 59)));
    g.strokeStyle = O.rgba(p.mid, 0.9); g.lineWidth = 2.5; g.beginPath(); g.moveTo(1000, 154); g.quadraticCurveTo(1076, 186, 1100, 262); g.stroke(); g.restore();
    const e = c.em; e.save(); e.fillStyle = p.hot; e.globalAlpha = 0.9; e.beginPath(); e.ellipse(V.px, 272, 150, 20, 0, 0, TAU); e.fill(); e.globalAlpha = 0.3; e.beginPath(); e.ellipse(V.px, 712, 430, 56, 0, 0, TAU); e.fill(); e.restore();
  }
  // the speaker's own glass (in front, near the hands) and the over-the-shoulder neighbour, then the lamp's cone
  function revGlass(c, x, y, h, fill, mark, side) { T.glassSide(c, x, y, h, { fill, lipSide: side || -1 }, {}, [x < 960 ? 1100 : 820, 236]); if (mark) markSide(c, x, y, h, side || -1); }
  function revFront(c, t, V, o) {
    const g = c.g; o = o || {};
    if (V.ots && o.ots !== false) { const F = R.figure(V.ots.id, Object.assign({ x: V.ots.x, y: V.ots.y, anchor: 'hip', pose: 'sit', t, idleAmt: 0.6 }, V.ots, { id: undefined }, o.otsSpec || {}));
      inkFig(c, F, { x: V.px, y: 236 }, { w: 2.4, color: O.mix(C.tungstenMid, C.tungsten, 0.4), fill: '#080605' }); }
    O.cone(g, [[V.px - 128, 272], [V.px + 128, 272], [V.px + 640, 700], [V.px - 640, 700]], PAL.hot, 0.035);
  }
  // a single: the speaker in their chair (Angelo left, the rest right) on their own backdrop
  function single(c, t, id, o) {
    o = o || {}; const V = REV[id]; const chair = id === 'angelo' ? 'left' : 'right';
    const cards = o.cards || tableCards(t);
    c.camera(o.cam); revBack(c, t, V, { cards, gapCard: o.gapCard || (id === 'angelo' && cards === 'six' ? V.gapCard : null), ownCard: o.ownCard != null ? o.ownCard : ownCards(id, t) });
    const A = chair === 'left' ? KA : SA;
    const F = figTwo(id, chair, Object.assign({ hold: { N: { kind: 'flat', at: A.hand, view: 'above' } } }, o.spec), t);
    if (o.glass) revGlass(c, o.glass[0], o.glass[1], o.glass[2], o.glass[3], o.glass[4], chair === 'left' ? 1 : -1);
    inkFig(c, F, L_TWO);
    if (o.post) o.post(c, F);
    revFront(c, t, V, o);
    return F;
  }
  const angCam = (z, sx, sy) => camAt([555, 640], [sx == null ? 780 : sx, sy == null ? 600 : sy], z, 0);   // Angelo in the left chair
  const resCam = (z, sx, sy) => camAt([1372, 640], [sx == null ? 1180 : sx, sy == null ? 600 : sy], z, 0);   // a responder in the right chair
  const ANG_DECK = (at, o) => ({ N: Object.assign({ kind: 'deck', mode: 'square' }, at ? { at } : {}, o || {}) });
  const ANG_GLASS = t => { const pg = placeGlass('angelo', t); return [905, 772, 104, pg.fill, pg.mark]; };
  const RES_GLASS = (id, t) => { const f = id === 'deena' ? placeGlass('deena', t).fill : REV[id].glass; return [1128, 772, 106, f, id === 'deena' && placeGlass('deena', t).mark]; };
  const ownCards = (id, t) => { const k = tableCards(t); return k === 'six' ? (id === 'angelo' ? 0 : 1) : k === 'seven' ? 5 : k === 'deal' ? pileN(Math.min(t, TM.stop), id) : 0; };

  // ================================================================================== shots ==========
  const shots = [];
  const shot = (at, name, draw, extra) => shots.push(Object.assign({ at, name, draw }, extra || {}));

  // ---- A. THE GATHERING (A030-A031): three conversations and twice as long as it should. Christof drags the last chair the wrong
  // way round, stops, is put right by Marina, and drags it back; Kay scoots in twice; Angelo strolls in with the deck ---------------
  const GA = { wrong: [0.05, 1.05], stop: 1.05, back: [1.55, 2.95], mSit: [2.95, 3.5], cHome: [3.0, 3.95], kay1: [0.75, 1.0], kay2: [1.9, 2.2], aIn: [0.6, 2.5], aChair: [2.55, 3.25] };
  shot(0, 'top: the gathering', (c, st, lt) => {
    const t = lt, q = tw(lt); c.camera({ x: lerp(905, 930, seg(t, 0, TM.swap)), y: lerp(492, 505, seg(t, 0, TM.swap)), zoom: lerp(1.1, 1.12, seg(t, 0, TM.swap)), rot: -3 * D2R });
    const wr = seg(q, GA.wrong[0], GA.wrong[1], 'inOutSine'), bk = seg(q, GA.back[0], GA.back[1], 'inOutSine');
    // the chair comes in from behind Christof's side and goes the wrong way, right into Kay's place; then all the way back
    const dc = bk > 0 ? lerp(-32, 0, bk) : lerp(22, -32, wr), out = bk > 0 ? lerp(140, 0, bk) : lerp(110, 140, wr);
    const kayOut = lerp(lerp(78, 40, seg(q, GA.kay1[0], GA.kay1[1], 'outCubic')), 0, seg(q, GA.kay2[0], GA.kay2[1], 'outCubic'));
    const s = tableState(t, { piles: [], chairs: { marina: { out, dc, rot: bk > 0 ? lerp(-0.5, 0, bk) : lerp(0.3, -0.5, wr), empty: q < GA.mSit[0] + 0.3 }, kay: { out: kayOut }, angelo: { out: lerp(110, 0, seg(q, GA.aChair[0], GA.aChair[1], 'inOutSine')) } } });
    T.back(c, t, s, 'top'); topMarks(c, t, s);
    const ch = T.top.chairAt('marina', s); const ca = ch.a, outv = [Math.sin(ca), -Math.cos(ca)];
    const rail = (lx, ly) => [ch.x + lx * Math.cos(ca) - ly * Math.sin(ca), ch.y + lx * Math.sin(ca) + ly * Math.cos(ca)];
    let chris;
    if (q < GA.back[1] + 0.05) { const b = [ch.x + outv[0] * 1.8 * FSC, ch.y + outv[1] * 1.8 * FSC];
      const lookM = q > GA.stop && q < GA.back[0] + 0.2;   // he stops, and looks to Marina for the verdict
      chris = { at: { x: b[0], y: b[1], dir: Math.atan2(-outv[1], -outv[0]) }, hands: [rail(0.85 * FSC, -0.95 * FSC), rail(-0.85 * FSC, -0.95 * FSC)], handPose: 'clasp', look: lookM ? tP(306, 668) : undefined, lookAmt: 1 }; }
    else { const u = seg(q, GA.cHome[0], GA.cHome[1], 'inOutSine'); const st0 = T.top.seatAt('christof', s); const ck = lerp(300, 360, u), r = lerp(625, 455, u * u); const p = tP(ck, r);
      const walk = ck * D2R; const dd = u < 0.7 ? walk : lerp(walk, st0.dir + 2 * Math.PI * Math.round((walk - st0.dir) / (2 * Math.PI)), (u - 0.7) / 0.3);
      chris = u >= 1 ? { look: headOf('marina'), lookAmt: 0.5 } : { at: { x: p[0], y: p[1], dir: dd }, hands: [false, false], handPose: 'tuck' }; }
    const mSeat = T.top.seatAt('marina', s); const mWait = tP(306, 668); const um = seg(q, GA.mSit[0], GA.mSit[1], 'inOutSine');
    const point = bump(q, GA.stop - 0.05, GA.stop + 0.15, GA.back[0] + 0.25);   // Marina's precise correction: that way
    const mDir = Math.atan2(CEN[1] - mWait[1], CEN[0] - mWait[0]);
    const mar = um < 1 ? { at: { x: lerp(mWait[0], mSeat.x, um), y: lerp(mWait[1], mSeat.y, um), dir: lerp(mDir, mSeat.dir, um) }, hands: point > 0.05 ? [false, mixp(tP(300, 600), tP(300, 470), point)] : [false, false], handPose: point > 0.05 ? ['tuck', 'point'] : 'tuck', look: [ch.x, ch.y] } : { look: headOf('kay'), lookAmt: 0.6 };
    const aSeat = T.top.seatAt('angelo', s); const aFrom = tP(104, 900); const ua = seg(q, GA.aIn[0], GA.aIn[1], 'inOutSine');
    const ang = ua < 1 ? { at: { x: lerp(aFrom[0], aSeat.x, ua), y: lerp(aFrom[1], aSeat.y, ua), dir: aSeat.dir }, deck: true, hands: [false, false], handPose: 'tuck' } : { deck: true, hands: DH, handPose: 'clasp', look: headOf('christof'), lookAmt: 0.6 };
    const dH = TA.seats.deena.hands;
    topCast(c, s, { christof: chris, marina: mar, angelo: ang, kay: { look: q < 1.6 ? headOf('marina') : headOf('scott'), lookAmt: 0.6 },
      deena: { look: q < 1.2 ? headOf('scott') : q < 2.6 ? [ch.x, ch.y] : headOf('angelo'), lookAmt: 0.7, hands: [dH[0], mixp(dH[1], TA.seats.deena.glass, 0.5 + 0.4 * Math.sin(q * 2.6))] },
      scott: { look: q < 1.0 ? headOf('deena') : q < 2.4 ? [ch.x, ch.y] : headOf('kay'), lookAmt: 0.8 } }, t);
    T.front(c, t, s, 'top');
  });

  // ---- the glass swap (A031): two moves, two clinks. Her marked dregs go over beside Angelo's full glass (clink); the same hand
  // takes his full glass back to her place (clink). Angelo is turned right away from her, talking across the table to Christof ------
  const SW = { reach: TM.swap + 0.3, m1: [TM.swap + 0.5, TM.swap + 1.1], m2: [TM.swap + 1.35, TM.swap + 1.95] }; const SW1 = SW.m2[1];
  const GD = T.top.glass('deena'), GA0 = T.top.glass('angelo');
  const PARK = (() => { const d = norm(GD[0] - GA0[0], GD[1] - GA0[1]); return [GA0[0] + d[0] * 52, GA0[1] + d[1] * 52]; })();   // where her glass ends up: at his place
  // turned a quarter: Angelo bottom-left with his back to her (showing Scott the deck, off top-left), Deena bottom-right, the two
  // glasses between them, the table's pool above
  const SWAP_CAM0 = { x: 1250, y: 495, zoom: 1.95, rot: 90 * D2R }, SWAP_CAM1 = { x: 1246, y: 495, zoom: 2.02, rot: 90 * D2R };
  function swapGlassPos(t) {   // [deena's marked glass, angelo's full glass]
    const u1 = seg(t, SW.m1[0], SW.m1[1], 'inOutSine'), u2 = seg(t, SW.m2[0], SW.m2[1], 'inOutSine');
    const arc = (a, b, u, h) => { const m = mixp(a, b, u); const d = norm(b[1] - a[1], -(b[0] - a[0])); const k = h * Math.sin(Math.PI * u); return [m[0] + d[0] * k, m[1] + d[1] * k]; };
    return [arc(GD, PARK, u1, 34), arc(GA0, GD, u2, 34)];
  }
  shot(TM.swap, 'top: Deena swaps the glasses', (c, st, lt) => {
    const t = lt, q = tw(lt); c.camera(camLerp(SWAP_CAM0, SWAP_CAM1, seg(st, 0, 2.8)));
    const [gm, gf] = swapGlassPos(t);
    const s = tableState(t, { piles: [], glasses: Object.assign({}, OTHER_GL, { deena: { fill: G_LOW, at: gm }, angelo: { fill: G_FULL, at: gf } }), _marks: [{ at: gm, toward: headOf('deena') }] });
    const reach = seg(q, SW.reach - 0.25, SW.reach, 'outCubic') * (1 - seg(q, SW1 + 0.1, SW1 + 0.5, 'inOutSine'));
    const ds = T.top.seatAt('deena', s);
    const dAt = { x: ds.x + Math.cos(ds.dir) * 40 * reach, y: ds.y + Math.sin(ds.dir) * 40 * reach, dir: ds.dir + 0.25 * reach };
    const grip = gp => { const d = norm(gp[0] - dAt.x, gp[1] - dAt.y); return [gp[0] - d[0] * 26, gp[1] - d[1] * 26]; };
    // her left hand (on Angelo's side) does both moves; between them it slides from her parked glass to his
    const between = seg(q, SW.m1[1], SW.m2[0]);
    const hL = q < SW.m1[0] ? mixp(ds.hands[0], grip(GD), seg(q, SW.reach - 0.25, SW.m1[0])) : q < SW.m1[1] ? grip(gm) : q < SW.m2[0] ? mixp(grip(PARK), grip(GA0), between) : q < SW1 + 0.05 ? grip(gf) : mixp(grip(GD), ds.hands[0], seg(q, SW1 + 0.05, SW1 + 0.45));
    const look = q < SW.m1[0] ? GA0 : q < SW.m1[1] ? gm : q < SW1 ? gf : headOf('angelo');
    // Angelo showing Scott the deck: body and head turned away from her, toward Scott; his hands and the deck clear of his glass
    const talk = Math.sin(q * 4.4); const aS = T.top.seatAt('angelo', s); const cH = headOf('scott');
    const toS = norm(cH[0] - aS.x, cH[1] - aS.y), aHands = [[aS.x + toS[0] * 118 + 8 * talk, aS.y + toS[1] * 118 - 18], [aS.x + toS[0] * 128, aS.y + toS[1] * 128 + 22 + 8 * talk]];
    T.back(c, t, s, 'top'); topMarks(c, t, s);
    topCast(c, s, { deena: { at: dAt, hands: [hL, ds.hands[1]], handPose: [q > SW.reach && q < SW1 + 0.05 ? 'clasp' : 'flat', 'flat'], look, lookAmt: 1, lean: 0.45 * reach },
      angelo: { at: { x: aS.x, y: aS.y, dir: aS.dir - 0.55 }, deck: true, hands: aHands, handPose: ['clasp', 'open'], look: cH, lookAmt: 1.0 }, scott: { look: headOf('angelo'), lookAmt: 1 } }, t);
    T.front(c, t, s, 'top');
  });

  // ---- B. THE SHUFFLE (A032): the riffle, then the flourish of a poor magician pretending to be a professional ------------------
  const RF = { split: [TM.riffle + 0.1, TM.riffle + 0.35], riffle: [TM.riffle + 0.4, TM.riffle + 1.45], open: [TM.riffle + 1.65, TM.riffle + 2.0], close: [TM.riffle + 2.75, TM.riffle + 2.95] };
  shot(TM.riffle, 'top: the riffle and the flourish', (c, st, lt) => {
    const t = lt, q = tw(lt); c.camera(T.cams.topDealer);
    const s = tableState(t, { piles: [] }); T.back(c, t, s, 'top'); topMarks(c, t, s);
    const fu = seg(q, RF.open[0], RF.open[1], 'outBack') * (1 - seg(q, RF.close[0], RF.close[1], 'inCubic'));
    let hands, pose = 'clasp';
    if (q < RF.open[0] - 0.05) { const o = { n: 16, split: seg(q, RF.split[0], RF.split[1], 'outCubic'), riffle: seg(t, RF.riffle[0], RF.riffle[1]) }; T.deck(c, DECK[0], DECK[1], DROT, o); hands = T.riffleHands(DECK, DROT, o); }
    else { const aEnd = DROT + 168 * D2R * fu / 2; T.fanDeck(c, DECK[0], DECK[1] + 4, { n: 24, w: 42, h: 60, r: 74, spread: 168, u: Math.max(0.02, fu), rot: DROT, face: fu > 0.08 });
      hands = [[DECK[0] - 6, DECK[1] + 22], [DECK[0] + Math.sin(aEnd) * 70, DECK[1] + 4 - Math.cos(aEnd) * 70]]; pose = ['clasp', 'open']; }
    topCast(c, s, { angelo: { hands, handPose: pose, look: DECK, lookAmt: 0.4 }, deena: { look: DECK, lookAmt: 0.6 }, scott: { look: headOf('kay') }, kay: { look: headOf('scott') } }, t);
    T.front(c, t, s, 'top');
  });
  // 'Can I enjoy something?' — Angelo, the fan still open in his hand, aggrieved; he snaps it shut
  shot(TM.angeloFan, 'rev: Angelo, the fan', (c, st, lt) => {
    const q = tw(st); const shut = seg(q, 1.75, 1.95); const hurt = seg(q, 0.3, 0.6, 'outCubic');
    single(c, lt, 'angelo', { cam: angCam(lerp(1.42, 1.48, seg(st, 0, 2.2))), glass: ANG_GLASS(lt), spec: { lean: 0.12 + 0.06 * hurt, head: 0.06 - 0.16 * hurt, neck: 0.05, hold: ANG_DECK([720, 690], { mode: shut < 1 ? 'fan' : 'square', open: 1 - shut, spread: 1.5 }), look: [1250, 520], lookAmt: 0.6 } });
  });
  // 'Not in this house, apparently.' — Christof, to the table
  shot(TM.christof1, 'rev: Christof', (c, st, lt) => {
    const q = tw(st); const g = seg(q, 1.1, 1.6);
    single(c, lt, 'christof', { cam: resCam(1.36), glass: RES_GLASS('christof', lt), spec: { lean: 0.18 + 0.08 * g, head: 0.04 - 0.08 * bump(q, 1.7, 1.9, 2.4), gesture: g > 0.5 ? 'expansive' : undefined } });
  });

  // ---- C. THE FIRST CARDS FLY (A033): one pile, another, another (F05 framing) --------------------------------------------------
  shot(TM.deal1, 'top: the first cards fly', (c, st, lt) => {
    const t = lt; const cam = T.cams.top; c.camera({ x: cam.x, y: cam.y, zoom: 1 + 0.004 * st, rot: cam.rot });
    topScene(c, t, tableState(t), dealLooks({ angelo: { deck: true, hands: [DH[0], flickHand(tw(t), LAUNCH1, DEAL7)], handPose: ['clasp', 'open'], look: DECK, lookAmt: 0.3 } }));
  });

  // ---- D. SCOTT AND KAY, under the noise of the table (A034-A036) ----------------------------------------------------------------
  const KAYS = o => Object.assign({ lean: 0.2, neck: 0.06, head: 0.02, hold: { N: { kind: 'flat', at: KA.hand, view: 'above' } }, look: SCOTT_HEAD, lookAmt: 0.5 }, o);
  const SCOTTS = o => Object.assign({ lean: 0.3, neck: 0.12, head: 0.08, hold: { N: { kind: 'flat', at: SA.hand, view: 'above' } }, look: KAY_HEAD, lookAmt: 0.6 }, o);
  const TWO_CAM = { x: 960, y: 590, zoom: 1.1 };
  shot(TM.scottKay, 'two: Scott tells Kay', (c, st, lt) => {
    const q = tw(st); twoScene(c, lt, twoState(lt, { flying: smears(lt) }), KAYS(), SCOTTS({ lean: 0.3 + 0.08 * seg(q, 0.2, 1.0, 'inOutSine') }), { x: 960, y: 590, zoom: lerp(1.08, 1.11, seg(st, 0, 4.1)) });
  });
  shot(TM.kayClose, 'two: Kay', (c, st, lt) => {
    const q = tw(lt); twoScene(c, lt, twoState(lt, { flying: smears(lt) }), KAYS({ head: 0.02 - 0.05 * seg(q, TM.kayClose + 0.3, TM.kayClose + 1.0, 'inOutSine') }), SCOTTS({ lean: 0.38 }), camAt(KAY_HEAD, [700, 560], 1.55, 0));
  });
  shot(TM.scottKay2, 'two: Scott and Kay, the look to Deena', (c, st, lt) => {
    const q = tw(st); const defend = seg(q, 0.3, 0.6, 'outCubic') * (1 - seg(q, 1.2, 1.6)); const looks = seg(q, 2.1, 2.4);
    twoScene(c, lt, twoState(lt, { flying: smears(lt) }), KAYS({ head: -0.04 }), SCOTTS({ lean: 0.38 - 0.18 * defend - 0.1 * looks, head: 0.08 - 0.14 * looks, look: looks > 0.5 ? [1135, 470] : KAY_HEAD, lookAmt: 0.9 }), TWO_CAM);
  });
  // A035: she concentrates very hard on her drink (his wine, the one she took)
  shot(TM.deenaDrink, 'rev: Deena drinks very hard', (c, st, lt) => {
    const d = seg(tw(st), 0.15, 0.55, 'outCubic');
    single(c, lt, 'deena', { cam: resCam(1.6, 1160, 600), spec: { lean: 0.12, head: 0.18 + 0.12 * d, look: [900, 760], lookAmt: 0.5, hold: { N: { kind: 'glass', fill: placeGlass('deena', lt).fill, drink: 0.55 + 0.42 * d } } } });
  });
  // 'Right. Good.' Kay smiles and doesn't rescue him. 'What about Saturday?' His caret starts... (a push in on him)
  const CARET_AT = TM.stop - 0.95;
  const satCam = st => { const u = seg(st, 2.5, 5.4, 'inOutSine'); return { x: lerp(960, 1080, u), y: 590, zoom: lerp(1.1, 1.24, u) }; };   // the push in on him
  shot(TM.scottKay3, 'two: what about Saturday', (c, st, lt) => {
    const t = lt, q = tw(st); const deflate = seg(q, 0.5, 1.1, 'inOutSine') * (1 - seg(q, 2.6, 3.2)); const smile = seg(q, 1.7, 2.3, 'inOutSine');
    const answer = seg(tw(t), CARET_AT - 0.2, CARET_AT + 0.3, 'outCubic');
    const cam = satCam(st);
    twoScene(c, t, twoState(t, { flying: smears(t) }), KAYS({ head: 0.02 - 0.09 * smile, neck: 0.06 - 0.04 * smile, lean: 0.2 + 0.06 * seg(q, 2.4, 3.0) }),
      SCOTTS({ lean: 0.3 - 0.12 * deflate + 0.1 * answer, head: 0.08 + 0.16 * deflate - 0.04 * answer, neck: 0.12 + 0.06 * deflate }), cam);
    // his caret, alone, just in front of his face: about to answer
    if (t >= CARET_AT && Math.floor((t - CARET_AT) / 0.36) % 2 === 0) { const hp = scr(cam, [SCOTT_HEAD[0] - 150, SCOTT_HEAD[1] - 120]); const g = c.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = C.tScott; g.fillRect(hp[0], hp[1] - 44, 2.6, 50); g.restore(); }
  });

  // ---- E. THE CARDS STOP (A037-A039). 'Angelo.' Hard cut; the room drops to room tone; the next card stays in his hand ------------
  const STOP_CAM = T.cams.top; const L61 = TM.stop + 2.0;
  shot(TM.stop, 'top: the cards stop', (c, st, lt) => {
    const t = lt, q = tw(lt); c.camera({ x: STOP_CAM.x, y: STOP_CAM.y, zoom: 1 + 0.006 * st, rot: STOP_CAM.rot });
    const s = tableState(t); const fh = mixp(DH[1], TA.seats.deena.pile7, 0.22);   // frozen mid-flick: the next card was Deena's
    const pt = seg(q, L61 + 0.15, L61 + 0.35, 'outCubic');
    // the heads turn to the seventh pile one after another, each with a small snap (a 2-frame nod past the mark and back)
    const turn = (id, d) => { const t0 = L61 + d; if (q < t0) return { look: headOf('deena'), lookAmt: 0.85 }; const nod = q < t0 + 2 / 24 ? 1 : 0; return { look: [GAP7.x, GAP7.y], lookAmt: nod ? 1.15 : 0.95, lean: 0.3 * nod, flash: nod }; };
    const dS = T.top.seatAt('deena', s);
    topScene(c, t, s, { deena: { look: q < TM.stop + 1.0 ? headOf('angelo') : [GAP7.x, GAP7.y], lookAmt: 1, hands: [mixp(dS.hands[0], [GAP7.x, GAP7.y], 0.75 * pt), dS.hands[1]], handPose: [pt > 0.3 ? 'point' : 'flat', 'flat'], lean: 0.25 * pt },
      angelo: Object.assign({ deck: true, hands: [DH[0], fh], handPose: ['clasp', 'clasp'], pre: cc => T.card(cc, fh[0] - 6, fh[1] - 4, DROT + 0.5) }, q > L61 + 0.95 ? { look: [GAP7.x, GAP7.y], lookAmt: 0.8, lean: q < L61 + 0.95 + 2 / 24 ? 0.25 : 0 } : { look: headOf('deena'), lookAmt: 0.9 }),
      marina: turn('marina', 0.4), christof: turn('christof', 0.55), scott: turn('scott', 0.7), kay: turn('kay', 0.85) });
  });

  // ---- F. THE COUNT: seven cuts, one ping each; the seventh is the gap at Scott's right, with nobody behind it --------------------
  function countShot(k) {
    const name = COUNT7[k];
    shot(COUNT_AT[k], 'count ' + (k + 1) + ': ' + name, (c, st, lt) => {
      const t = lt; const z = k === 6 ? lerp(2.2, 2.7, seg(st, 0, 0.29, 'outExpo')) + 0.05 * st : 2.25 + 0.3 * seg(st, 0, 0.12, 'outCubic');
      c.camera(countCam(name, 'seven', z));
      const P = lookAll([GAP7.x, GAP7.y]); P.angelo = { deck: true, hands: DH, handPose: 'clasp', look: [GAP7.x, GAP7.y], lookAmt: 0.8 };
      topScene(c, t, tableState(t), P);
    }, k === 6 ? { post: { vignette: 0.7 } } : null);
  }
  for (let k = 0; k < 7; k++) countShot(k);
  shot(TM.sevenWide, 'top: seven hands', (c, st, lt) => {
    const t = lt; c.camera(camAt(CEN, [930, 540], lerp(0.95, 0.98, seg(st, 0, 1.5, 'inOutSine')), -6 * D2R));
    const P = lookAll([GAP7.x, GAP7.y], 0.95); P.angelo = { deck: true, hands: DH, handPose: 'clasp', look: [GAP7.x, GAP7.y], lookAmt: 0.9 };
    topScene(c, t, tableState(t), P);
  }, { post: { vignette: 0.66 } });

  // ---- G. 'That's mine.' 'Then what's that?' '...Also mine, I guess.' — on the board itself: his pile and the seventh -----------------
  const PILES_CAM = camAt([1130, 656], [900, 480], 2.25, 30 * D2R);
  const P2 = { look: TM.piles2 + 0.1, hand: TM.piles2 + 0.9, mine: TM.piles2 + 1.5, point: TM.piles2 + 2.65, his: TM.piles2 + 3.3, shrug: TM.piles2 + 4.1 };
  shot(TM.piles2, 'top: that\'s mine / then what\'s that', (c, st, lt) => {
    const t = lt, q = tw(lt); c.camera(camLerp(PILES_CAM, camAt([1130, 656], [900, 480], 2.38, 30 * D2R), seg(st, 0, 5.9, 'inOutSine')));
    const s = tableState(t); const dS = T.top.seatAt('deena', s);
    const pt = seg(q, P2.point - 0.15, P2.point + 0.05, 'outCubic') * (1 - seg(q, P2.shrug + 0.6, P2.shrug + 1.0));
    const look = q < P2.look ? headOf('deena') : q < P2.hand ? [GAP7.x, GAP7.y] : q < P2.mine ? DECK : q < P2.his ? [GAP7.x, GAP7.y] : [ANG7.x, ANG7.y];
    const nod = bump(q, P2.mine + 0.1, P2.mine + 0.3, P2.mine + 0.7);
    const shrug = bump(q, P2.shrug, P2.shrug + 0.25, P2.shrug + 1.3);
    const aH = [mixp(mixp(DH[0], [GAP7.x, GAP7.y], 0.3 * nod), [DH[0][0] + 40, DH[0][1] + 60], shrug), mixp(DH[1], [DH[1][0] + 30, DH[1][1] - 70], shrug)];
    const P = lookAll(q < P2.point ? [GAP7.x, GAP7.y] : [ANG7.x, ANG7.y], 0.85);
    P.deena = { look: q < P2.point - 0.3 ? [GAP7.x, GAP7.y] : [ANG7.x, ANG7.y], lookAmt: 1, hands: [mixp(dS.hands[0], [ANG7.x, ANG7.y], 0.85 * pt), dS.hands[1]], handPose: [pt > 0.3 ? 'point' : 'flat', 'flat'], lean: 0.35 * pt };
    P.angelo = { deck: shrug < 0.3, hands: aH, handPose: shrug > 0.3 ? 'open' : 'clasp', look, lookAmt: 1 };
    topScene(c, t, s, P);
  });
  shot(TM.christof2, 'rev: Christof, take both', (c, st, lt) => {
    const q = tw(st); const g = seg(q, 0.9, 1.3); const laugh = bump(q, 1.4, 1.7, 2.6);
    single(c, lt, 'christof', { cam: resCam(1.42), glass: RES_GLASS('christof', lt), ownCard: ownCards('christof', lt), spec: { lean: 0.2 + 0.06 * g, head: 0.04 - 0.12 * laugh, neck: -0.05 * laugh, gesture: g > 0.5 ? 'expansive' : undefined } });
  });
  // A042: a couple of laughs; Angelo laughs too, but keeps checking the piles. 'Hold on. Did someone move one?' 'No.' 'Just pick them up.'
  const LW_CAM = { x: 975, y: 575, zoom: 0.94 };
  const GAPL = LCARD('gap', 'seven'), ANGL = LCARD('angelo', 'seven');
  shot(TM.laughs, 'low: laughs; Angelo keeps checking', (c, st, lt) => {
    const t = lt, q = tw(st); const s = tableState(t);
    const lg = (ph, a, b) => bump(q, a, a + 0.3, b) * (0.7 + 0.3 * Math.sin(q * 17 + ph));
    const check = q > 0.95; const lean = 0.22 + 0.16 * seg(q, 1.0, 1.6, 'inOutSine');
    lowScene(c, t, { cam: LW_CAM, s,
      angelo: { head: 0.12 - 0.22 * lg(0, 0, 1.0) * (check ? 0 : 1), lean, look: check ? (Math.floor(q / 0.9) % 2 ? GAPL : ANGL) : [1100, 300], lookAmt: 0.9 },
      kay: { head: 0.14 - 0.2 * lg(1, 0.1, 2.0), neck: 0.1 - 0.08 * lg(2, 0.1, 2.0) },
      scott: { tilt: 0.06 * lg(3, 0.15, 1.6) - 0.05 * seg(q, 3.6, 3.9) },
      deena: { head: 0.16 - 0.25 * lg(4, 0.0, 1.4), lean: 0.3 - 0.1 * lg(4, 0.0, 1.4), hold: { N: { kind: 'flat', at: NEAR_REST.deena, view: 'above' } } },
      marina: { head: 0.16 - 0.12 * lg(5, 0.2, 1.0) + 0.05 * seg(q, 2.7, 2.9), lean: 0.3, hold: { N: { kind: 'flat', at: NEAR_REST.marina, view: 'above' } } } });
  });
  // A043: he gathers the cards — every pile slides home to the deck
  shot(TM.gather, 'top: I am picking them up', (c, st, lt) => {
    const t = lt, q = tw(lt); c.camera(T.cams.top); const t0 = TM.gather + 0.3;
    const piles = []; DEAL7.forEach((id, i) => { const p = pileXY(id); const u = seg(t, t0 + i * 0.2, t0 + i * 0.2 + 0.55, 'inOutCubic'); if (u >= 1) return; const m = mixp([p.x, p.y], DECK, u); piles.push({ at: { x: m[0], y: m[1], rot: lerp(p.a, DROT, u) }, n: 5 }); });
    const sweep = Math.sin(clamp((q - t0) / 1.8, 0, 1) * Math.PI);
    const P = dealLooks({ angelo: { deck: q >= t0 + 0.55, hands: [mixp(DH[0], [GAP7.x, GAP7.y], 0.6 * sweep), mixp(DH[1], [ANG7.x, ANG7.y], 0.5 * sweep)], handPose: 'open', look: DECK, lookAmt: 0.6 } });
    P.scott = { look: DECK, lookAmt: 0.5 };
    topScene(c, t, tableState(t, { piles, flying: [], pileCards: 5 }), P);
  });

  // ---- H. SHUFFLES. DEALS AGAIN, SLOWER (A043-A044): one count cut and one ping per card; the sixth held, on the gap and the floor ---
  shot(TM.shuffle, 'top: shuffles again', (c, st, lt) => {
    const t = lt; c.camera(T.cams.topDealer); const s = tableState(t, { piles: [] }); T.back(c, t, s, 'top'); topMarks(c, t, s);
    const o = { n: 16, split: seg(t, TM.shuffle + 0.05, TM.shuffle + 0.22, 'outCubic'), riffle: seg(t, TM.shuffle + 0.25, TM.shuffle + 0.95) };
    T.deck(c, DECK[0], DECK[1], DROT, o);
    topCast(c, s, { angelo: { hands: T.riffleHands(DECK, DROT, o), handPose: 'clasp', look: DECK, lookAmt: 0.5 }, deena: { look: DECK } }, t); T.front(c, t, s, 'top');
  });
  function dealShot(k) {
    const name = DEAL6[k]; const pp = pileXY(name, 'seats');
    shot(DEAL2_AT[k], 'deal ' + (k + 1) + ': ' + name, (c, st, lt) => {
      const t = lt;
      // the sixth: count 7's framing — the card on the gap with the floor behind it — and a slower creep in
      const cam = k === 5 ? countCam('gap', 'seats', lerp(2.2, 2.62, seg(st, 0.2, 0.42, 'outExpo')) + 0.05 * st) : countCam(name, 'seats', 2.2 + 0.05 * st);
      c.camera(cam);
      const P = lookAll(k === 5 && st > 0.5 ? [GAP6.x, GAP6.y] : DECK, k === 5 && st > 0.5 ? 0.95 : 0.5);
      P.angelo = { deck: true, hands: [DH[0], flickHand(tw(t), LAUNCH2, DEAL6, 'seats')], handPose: ['clasp', 'open'], look: [pp.x, pp.y], lookAmt: 0.7 };
      topScene(c, t, tableState(t), P);
    }, k === 5 ? { post: { vignette: 0.72 } } : null);
  }
  for (let k = 0; k < 6; k++) dealShot(k);
  // A045-A046: each person has a card; Angelo has the deck and no card in front of him
  const EP_CAM0 = camAt(tP(SEAT6.angelo, 190), [960, 470], 1.85, (180 - SEAT6.angelo) * D2R), EP_CAM1 = camAt(tP(SEAT6.angelo, 230), [960, 470], 2.15, (180 - SEAT6.angelo) * D2R);
  shot(TM.emptyPlace, 'top: his empty place', (c, st, lt) => {
    const t = lt; c.camera(camLerp(EP_CAM0, EP_CAM1, seg(st, 0, 1.4, 'inOutSine')));
    const P = lookAll(tP(SEAT6.angelo, 200), 0.6); P.angelo = { deck: true, hands: DH, handPose: 'clasp', look: tP(SEAT6.angelo, 228), lookAmt: 1, lean: 0.2 };
    topScene(c, t, tableState(t), P);
  }, { post: { vignette: 0.66 } });

  // ---- I. 'Right. Okay.' ... 'Please.' — Angelo from his place (the doorway and the ownerless card at his left), the others answering
  // from theirs. His framing tightens each time; he looks down and left at the gap, squares the deck, slumps, holds his breath -------
  const GAPC = REV.angelo.gapCard, MYPLACE = [900, 780];
  const angSingle = (c, lt, cam, spec, o) => single(c, lt, 'angelo', Object.assign({ cam, glass: ANG_GLASS(lt), gapCard: GAPC, spec }, o || {}));
  // the deck-squaring tic: the deck knocked square on the table, twice (the sound is 'Q05.tap')
  const TIC = [TM.rightOkay + 2.45, TM.rightOkay + 2.75, TM.touch + 0.25, TM.touch + 0.5];
  const ticY = t => { let d = 0; TIC.forEach(t0 => { d = Math.max(d, bump(t, t0 - 0.12, t0, t0 + 0.12)); }); return d; };
  // he swivels in his chair to look at the gap (a cut-paper turn: he faces left, toward the doorway and the card), and back
  function angTurn(t, t0, t1) {
    if (t < t0) return null; const r = t < t1 ? R.turn('angelo', t, t0, 1, -1) : R.turn('angelo', t, t1, -1, 1);
    if (t >= t1 && r.u >= 1) return null; return { facing: r.facing, squash: r.squash, view34: r.view34 };
  }
  const LOOK_GAP = [GAPC[0] + 30, GAPC[1] + 6];
  const TURN1 = [TM.rightOkay + 3.55, TM.rightOkay + 4.75], TURN2 = [TM.wheresMine + 1.0, TM.wheresMine + 9];
  shot(TM.rightOkay, 'rev: Angelo, right, okay', (c, st, lt) => {
    const q = tw(st), t = lt; const tn = angTurn(t, TURN1[0], TURN1[1]); const left = tn && tn.facing === -1;
    const glanceD = bump(q, 1.95, 2.1, 2.5);   // 'What now?' — a flick of the eyes to Deena at his right
    const look = left ? LOOK_GAP : glanceD > 0.3 ? [1500, 560] : q < 2.6 ? MYPLACE : [1250, 470];
    const spec = Object.assign({ look, lookAmt: 1, head: left ? 0.3 : 0.2 - 0.12 * seg(q, 2.6, 2.8), neck: left ? 0.1 : 0.04, lean: left ? 0.3 : 0.24,
      gesture: left ? 'handToChin' : undefined, hold: left ? undefined : ANG_DECK([700, 704 + 26 * ticY(tw(lt))]) }, tn || {});
    angSingle(c, lt, angCam(lerp(1.55, 1.66, seg(st, 0, 5.1, 'inOutSine'))), spec);
  });
  // 'You haven't. There are six.' — Christof counts them round the table with his finger
  shot(TM.christof3, 'rev: Christof, there are six', (c, st, lt) => {
    const q = tw(st); const p = bump(q, 0.5, 0.8, 2.4); const sweep = seg(q, 0.7, 2.1);
    single(c, lt, 'christof', { cam: resCam(1.44), glass: RES_GLASS('christof', lt), ownCard: 1, spec: { lean: 0.22, head: 0.1, look: [lerp(560, 1000, sweep), 600], lookAmt: 0.6,
      hold: p > 0.3 ? { N: { kind: 'point', at: [lerp(620, 980, sweep), 640 - 30 * Math.sin(sweep * 9)] } } : { N: { kind: 'flat', at: SA.hand, view: 'above' } } } });
  });
  // 'Yeah. There's six. Where's mine?' — the shrug, then his eyes go down and left, to the card nobody owns
  shot(TM.wheresMine, 'rev: Angelo, where\'s mine', (c, st, lt) => {
    const q = tw(st), t = lt; const sh = bump(q, 0.2, 0.45, 0.95); const tn = angTurn(t, TURN2[0], TURN2[1]); const left = tn && tn.facing === -1;
    const spec = Object.assign({ look: left ? LOOK_GAP : [1250, 450], lookAmt: 1, head: left ? 0.34 : 0.08, neck: left ? 0.1 : 0, lean: left ? 0.32 : 0.2,
      gesture: sh > 0.4 ? 'shrug' : undefined, hold: sh > 0.4 ? undefined : left ? ANG_DECK([392, 712]) : ANG_DECK([700, 704]) }, tn || {});
    angSingle(c, lt, angCam(lerp(1.8, 1.9, seg(st, 0, 2.2)), 800), spec);
  }, { post: { vignette: 0.6 } });
  // his eyeline: the card at the gap, nobody behind it, the dark doorway over it
  shot(TM.povGap, 'rev: what he sees, the gap', (c, st, lt) => {
    const cam = camAt([GAPC[0] + 10, 560], [960, 470], lerp(2.9, 3.1, seg(st, 0, 0.9)), 0); c.camera(cam);
    revBack(c, lt, REV.angelo, { cards: 'six', gapCard: GAPC }); revFront(c, lt, REV.angelo, { ots: false });
  }, { post: { vignette: 0.72 } });
  // A047: Christof looks. He starts to answer: the finger comes up, a breath in... and it sinks back. He has nothing.
  shot(TM.christofStops, 'rev: Christof starts to answer, then stops', (c, st, lt) => {
    const q = tw(st); const look = seg(q, 0.0, 0.2, 'outCubic'); const start = seg(q, 0.3, 0.5, 'outCubic'); const stop = seg(q, 0.75, 1.2, 'inOutSine');
    const up = start * (1 - 0.8 * stop); const fin = mixp([SA.hand[0] - 30, SA.hand[1] - 10], [1150, 712], up);
    single(c, lt, 'christof', { cam: resCam(1.6, 1160), glass: RES_GLASS('christof', lt), ownCard: 1, spec: { lean: 0.22 + 0.08 * start - 0.1 * stop, head: 0.22 * look - 0.14 * start + 0.3 * stop, neck: 0.1 * stop, idle: false,
      look: [700, 700], lookAmt: 0.6 * look, hold: up > 0.05 ? { N: { kind: stop < 0.35 ? 'point' : 'reach', at: [fin[0] - 70, fin[1] - 16 * up] } } : { N: { kind: 'flat', at: SA.hand, view: 'above' } } } });
  }, { post: { vignette: 0.62 } });
  shot(TM.marina2, 'rev: Marina, did you deal yourself first', (c, st, lt) => {
    const q = tw(st);
    single(c, lt, 'marina', { cam: resCam(1.52), glass: RES_GLASS('marina', lt), ownCard: 1, spec: { lean: 0.2, head: 0.06 - 0.06 * seg(q, 0.2, 0.5), neck: 0.04, look: KAY_HEAD, lookAmt: 0.5 } });
  }, { post: { vignette: 0.62 } });
  // 'No. I went around.' — the sweep round the table; then the shoulders give
  shot(TM.wentAround, 'rev: Angelo, I went around', (c, st, lt) => {
    const q = tw(st); const a = seg(q, 0.55, 1.45, 'inOutSine'); const slump = seg(q, 1.5, 1.95, 'inOutSine');
    angSingle(c, lt, angCam(lerp(1.95, 2.02, seg(st, 0, 2.0)), 800), { look: [1250, 450 + 120 * slump], lookAmt: 0.6, head: 0.04 + 0.14 * slump, neck: 0.06 * slump, lean: 0.2 - 0.12 * slump,
      hold: ANG_DECK([700, 704 + 18 * slump]), armF: a > 0 && a < 1 ? { a: 0.9 + 0.7 * Math.sin(a * Math.PI), b: 0.4 + 0.3 * a } : undefined });
  }, { post: { vignette: 0.64 } });
  shot(TM.deena4, 'rev: Deena, a whole thing', (c, st, lt) => {
    single(c, lt, 'deena', { cam: resCam(1.6, 1170), ownCard: 1, glass: RES_GLASS('deena', lt), spec: { lean: 0.1, head: 0.0, gesture: 'armsFolded', look: [560, 600], lookAmt: 0.7 } });
  }, { post: { vignette: 0.64 } });
  // 'Can you just-- everybody touch the card in front of you.' — drained: slumped back, the deck knocked square again; 'Why?' (off)
  shot(TM.touch, 'rev: Angelo, everybody touch the card', (c, st, lt) => {
    const q = tw(st); const sit = seg(q, 0.9, 1.6, 'inOutSine');
    angSingle(c, lt, angCam(lerp(2.0, 2.3, seg(st, 0, 5.0, 'inOutSine')), lerp(800, 760, seg(st, 0, 5.0)), 600), { mood: 'drained', look: q < 3.4 ? MYPLACE : [1300, 470], lookAmt: 0.8,
      head: 0.16 - 0.08 * sit, neck: 0.08, lean: 0.06 + 0.12 * sit, hold: ANG_DECK([700, 714 + 26 * ticY(tw(lt))]) });
  }, { post: { vignette: 0.68 } });
  // 'Please.' — a tight close-up: he draws a breath, holds it, and asks
  const BREATH = [TM.please + 0.15, TM.please + 0.45], PLEASE_AT = TM.please + 0.75;
  shot(TM.please, 'rev: Angelo, please', (c, st, lt) => {
    const q = tw(lt); const inh = seg(q, BREATH[0], BREATH[1], 'inOutSine');
    angSingle(c, lt, angCam(lerp(2.6, 2.7, seg(st, 0, 1.6)), 760, 640), { mood: 'drained', look: [1300, 470], lookAmt: 0.7, head: 0.16 - 0.08 * inh, neck: 0.08 - 0.04 * inh, lean: 0.2 - 0.06 * inh, idle: false, breath: q > BREATH[0] && q < PLEASE_AT ? false : undefined, hold: ANG_DECK([700, 704]) });
  }, { post: { vignette: 0.74 } });

  // ---- J. SIX HANDS COME DOWN ON SIX CARDS (A048). One beat. Two (A049). 'Maybe you don't get to play.' --------------------------------
  // Angelo leans back from the table, the deck up in both hands and lit; the five come down onto their cards (the far half of each
  // card stays bare and lit), the sixth out of the hall doorway: dark against the dim strip of the hall beyond, no rim, no body.
  const HANDS_T = TM.hands + 0.4;
  const HAND_ORDER = { deena: 0, marina: 1, kay: 2, scott: 3, christof: 4, gap: 5 };
  const handAt = id => HANDS_T + HAND_ORDER[id] * 2 / 24;
  const LAUGH_AT = TM.hands + 4.55, LAUGH_CUT = LAUGH_AT + 0.55;
  const HW0 = { x: 1000, y: 610, zoom: 0.96 }, HW1 = { x: 880, y: 560, zoom: 1.34 };
  const LOW_SIX = [[SEAT6.deena, 0], [SEAT6.christof, 1], [SEAT6.marina, 2], [SEAT6.kay, 3], [SEAT6.scott, 4], [GAP, 5]];
  function hallStrip(c) {   // the far end of the hall: a dim panel inside the doorway's lower right, below where the arm comes from
    const g = c.g, D = LA.hallDoor; g.save();
    g.fillStyle = '#1E140D'; g.fill(mem('hall:s1', () => O.S().M(D.x1 - 128, 300).L(D.x1 - 2, 268).L(D.x1 - 2, 700).L(D.x1 - 176, 700).Z().path(1.2, 91)));
    g.fillStyle = '#2C1C11'; g.fill(mem('hall:s2', () => O.S().M(D.x1 - 84, 380).L(D.x1 - 2, 360).L(D.x1 - 2, 700).L(D.x1 - 118, 700).Z().path(1.2, 92)));
    g.fillStyle = O.rgba(PAL.mid, 0.55); g.fillRect(D.x0 - 1, 250, 3, 450);   // the near jamb catches a line of lamp: Angelo's back is not the doorway
    g.restore();
  }
  shot(TM.hands, 'low: six hands on six cards', (c, st, lt) => {
    const t = lt, q = tw(lt); const hd = id => seg(q, handAt(id) - 0.3, handAt(id), 'inCubic');
    const s = tableState(t, { extraHand: seg(t, handAt('gap') - 0.3, handAt('gap'), 'inCubic') });
    const card = id => LCARD(id, 'seats');
    const reach = (id, u, rest, off) => ({ kind: 'flat', at: mixp(rest, [card(id)[0] + off[0], card(id)[1] + off[1]], u), view: 'above' });
    const laugh = bump(q, LAUGH_AT, LAUGH_AT + 0.12, LAUGH_CUT);   // the laugh starts, and stops a beat too early: then nobody moves
    const push = seg(st, 1.0, 6.2, 'inOutSine');
    const back = seg(q, TM.hands + 0.1, TM.hands + 0.5, 'outCubic');   // Angelo sits back from the table as the hands come down
    lowScene(c, t, { cam: camLerp(HW0, HW1, push), s, armPass: ['kay'], preFar: hallStrip,
      angelo: { dx: -215 - 25 * back, dy: 8, lean: 0.04 - 0.16 * back, head: 0.12, neck: 0.06, look: LCARD('gap', 'seats'), lookAmt: 0.5, idle: false,
        hold: { N: { kind: 'deck', mode: 'fan', open: 0.6, spread: 1.0, at: [420, 600] }, F: { kind: 'clasp', at: [430, 650] } } },
      kay: { hold: { N: reach('kay', hd('kay'), [card('kay')[0] + 70, card('kay')[1] - 110], [34, -6]) }, lean: 0.3 + 0.1 * hd('kay'), head: 0.14 - 0.12 * laugh },
      scottHand: hd('scott'), scottBack: 0.16,
      deena: { dx: -150, hold: { N: reach('deena', hd('deena'), NEAR_REST.deena, [-54, 18]) }, lean: 0.12 + 0.06 * hd('deena'), head: 0.16 - 0.14 * laugh },
      marina: { hold: { N: reach('marina', hd('marina'), NEAR_REST.marina, [62, 22]) }, lean: 0.3 + 0.1 * hd('marina') },
      christofHand: hd('christof'), christofBack: 0.16,
      postHands: cc => cardEdges(cc, LOW_SIX) });
  }, { post: { vignette: 0.7 } });

  // ================================================================================== dialogue ==========
  // on ink, in the negative space of the shot each line lands in; lines survive cuts, so the next shot was checked too
  // Kay in the Saturday two-shot (L054, L056, L058): 48 px in warm ivory at full opacity, on the dark wall beside her head.
  // Her own face is drawn with the kit's colour swapped for the call, so the fog-on entrance and the lipstick exit stay the kit's.
  // wrap: words per row (the screenplay text is broken there, never retyped), so a long line stays on ink in two rows; the fog
  // runs on through the rows in order and the lipstick glyph is left on the last row only. track(lt) -> [x, y] moves the anchor
  // (the close-up to two-shot cut, and the Saturday push: her line stays on the wall behind her head, as his caret rides in front
  // of his face).
  const KAY_IVORY = '#F4E8CF', KAY_LEAD = 54;
  function kayLine(id, at, x, y, wrap, extra) {
    const L = Object.assign({ id, at, x, y, align: 'left', size: 48 }, extra || {});
    L.draw = (c, s, o) => {
      const words = s.T.text.split(' '), rows = []; let w0 = 0;
      (wrap || []).concat([words.length]).forEach(nw => { if (w0 < words.length) rows.push(words.slice(w0, w0 + nw).join(' ')); w0 += nw; });
      const n = rows.reduce((a, r) => a + r.length, 0); let k = 0; const at0 = L.track ? L.track(c.lt) : [L.x, L.y];
      const F = O.FACE.kay, keep = F.color; F.color = KAY_IVORY;
      try {
        rows.forEach((str, i) => {
          const oo = Object.assign({}, o, { size: L.size, align: L.align, alpha: o.alpha }); const xx = at0[0], yy = at0[1] + i * KAY_LEAD;
          if (o.lip) { if (i === rows.length - 1) O.say(c.g, 'kay', str, xx, yy, oo); }
          else { oo.p = clamp((o.p * n - k) / str.length, 0, 1); O.say(c.g, 'kay', str, xx, yy, oo); }
          k += str.length;
        });
      } finally { F.color = keep; }
    };
    return L;
  }
  const SAT_W = (() => { const k = satCam(0); return [(430 - 960) / k.zoom + k.x, (506 - 540) / k.zoom + k.y]; })();   // L058's place on the wall, from its screen place before the push
  const gapScr = scr(STOP_CAM, [GAP7.x, GAP7.y]);
  const angPile = scr(camAt([1130, 656], [900, 480], 2.3, 30 * D2R), [ANG7.x, ANG7.y]);
  const lines = [
    { id: 'L050', at: TM.riffle + 2.2, x: 1240, y: 1000, align: 'left' },
    { id: 'L051', at: TM.angeloFan + 0.15, x: 1010, y: 230, align: 'left' },
    { id: 'L052', at: TM.christof1 + 0.1, x: 130, y: 210, align: 'left', opts: { bulbs: true }, until: TM.deal1 - 0.25 },
    { id: 'L053', at: TM.scottKay + 0.2, x: 1790, y: 330, align: 'right', size: 46, opts: { caret: true } },
    kayLine('L054', TM.kayClose, 600, 494, [4], { align: 'right', track: lt => lt < TM.scottKay2 ? [600, 494] : [446, 506] }),   // behind her head in the close-up, and again in the two-shot
    { id: 'L055', at: TM.scottKay2 + 0.3, x: 1790, y: 330, align: 'right' },
    kayLine('L056', TM.scottKay2 + 1.2, 440, 506, null, { align: 'right', until: TM.deenaDrink - 0.75 }),
    { id: 'L057', at: TM.scottKay3 + 0.1, x: 1790, y: 330, align: 'right' },
    kayLine('L058', TM.scottKay3 + 2.3, 430, 506, [2], { align: 'right', track: lt => scr(satCam(lt - TM.scottKay3), SAT_W) }),
    { id: 'L059', at: TM.stop, x: 1300, y: 170, align: 'left' },
    { id: 'L060', at: TM.stop + 0.95, x: 1430, y: 760, align: 'left' },
    { id: 'L061', at: L61, until: TM.count, x: 1180, y: 975, align: 'left', opts: { pointTo: gapScr } },
    { id: 'L062', at: P2.mine, x: 480, y: 1010, align: 'left' },
    { id: 'L063', at: P2.point, x: 1290, y: 250, align: 'left', opts: { pointTo: angPile } },
    { id: 'L064', at: P2.shrug - 0.1, x: 420, y: 1010, align: 'left' },
    { id: 'L065', at: TM.christof2 + 0.1, x: 130, y: 210, align: 'left', opts: { bulbs: true }, until: TM.laughs - 0.25 },
    { id: 'L066', at: TM.laughs + 0.85, x: 600, y: 140, align: 'left' },
    { id: 'L067', at: TM.laughs + 3.0, x: 1700, y: 170, align: 'left' },
    { id: 'L068', at: TM.laughs + 3.8, x: 960, y: 140, align: 'left' },
    { id: 'L069', at: TM.gather + 0.2, x: 1240, y: 990, align: 'left' },
    { id: 'L070', at: TM.rightOkay + 0.7, x: 1060, y: 230, align: 'left' },
    { id: 'L071', at: TM.rightOkay + 2.0, x: 1430, y: 340, align: 'left' },
    { id: 'L072', at: TM.rightOkay + 3.0, x: 1000, y: 230, align: 'left', until: TM.christof3 - 0.25 },
    { id: 'L073', at: TM.christof3 + 0.1, x: 130, y: 210, align: 'left', until: TM.wheresMine - 0.25 },
    { id: 'L074', at: TM.wheresMine + 0.1, x: 990, y: 230, align: 'left', until: TM.povGap + 0.25 },
    { id: 'L075', at: TM.marina2 + 0.1, x: 120, y: 240, align: 'left', until: TM.wentAround - 0.3 },
    { id: 'L076', at: TM.wentAround + 0.1, x: 1040, y: 230, align: 'left', until: TM.deena4 - 0.25 },
    { id: 'L077', at: TM.deena4 + 0.1, x: 120, y: 260, align: 'left', until: TM.touch - 0.1 },
    { id: 'L078', at: TM.touch + 0.5, x: 330, y: 150, align: 'left', size: 46, opts: { spread: 0.85 }, until: TM.touch + 4.3 },
    { id: 'L079', at: TM.touch + 4.4, x: 1460, y: 330, align: 'left' },
    { id: 'L080', at: PLEASE_AT, until: TM.hands, x: 1180, y: 330, align: 'left', opts: { spread: 0.4, exit: 'cut' } },
    { id: 'L081', at: TM.hands + 3.2, x: 1010, y: 140, align: 'left', opts: { dead: ['play.'] } },
  ];

  // ================================================================================== sound ==========
  // Local beds with stepped levels and no stock fade-in (the stock beds fade in over a second, which would dip the join with Q04):
  // steps [[t, dB, tc]]; tc 0 = cut dead (a 4 ms release); dB <= -90 = silence. p.fi / p.fo in seconds.
  function env(g, t0, t1, p) {
    const L = SD.db(p.level == null ? -40 : p.level), fi = p.fi || 0.02, fo = p.fo || 0.05; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(L, t0 + fi);
    (p.steps || []).forEach(([t, d, tc]) => g.gain.setTargetAtTime(d <= -90 ? 0 : SD.db(d), t, tc === 0 ? 0.004 : (tc || 0.25)));
    g.gain.setTargetAtTime(0, t1 - fo, fo / 3);
  }
  SD.beds['Q05.room'] = (ac, B, t0, t1, p) => { const g = SD.gain(ac, 0); env(g, t0, t1, p); SD.chain(SD.src(ac, 'brown', 11, t0, t1), SD.filt(ac, 'lowpass', 220, 0.7)).connect(g); SD.chain(SD.osc(ac, 'sine', 50, t0, t1), SD.gain(ac, 0.5)).connect(g); SD.chain(SD.osc(ac, 'sine', 100, t0, t1), SD.gain(ac, 0.3)).connect(g); g.connect(B.room); };
  SD.beds['Q05.walla'] = (ac, B, t0, t1, p) => {   // the stock walla's voices: formant-filtered pink murmur, six talkers spread across
    const g = SD.gain(ac, 0); env(g, t0, t1, p);
    if (SD.wallaRec(ac, g, t0, t1)) { g.connect(B.room); return; }
    for (let v = 0; v < 6; v++) { const s0 = SD.src(ac, 'pink', 40 + v, t0, t1, 0.9 + v * 0.03); const fs = [[500 + v * 40, 6], [1500 + v * 90, 8], [2500, 9]]; const vg = SD.gain(ac, 0.6); fs.forEach(([f, q]) => SD.chain(s0, SD.filt(ac, 'bandpass', f, q), vg)); const am = SD.osc(ac, 'sine', 2.2 + v * 0.7, t0, t1), ag = SD.gain(ac, 0.5); SD.chain(am, ag); ag.connect(vg.gain); SD.chain(vg, SD.pan(ac, (v - 2.5) / 3), g); }
    g.connect(B.room);
  };
  SD.beds['Q05.groove'] = (ac, B, t0, t1, p) => {   // the party's e-piano in 6/8 from the living-room speaker, heard through the doorway (low-passed)
    const out = SD.gain(ac, 0); env(out, t0, t1, p); const lp = SD.filt(ac, 'lowpass', p.lp || 3200, 0.7); (p.lpSteps || []).forEach(([t, f]) => lp.frequency.setTargetAtTime(f, t, 0.3));
    SD.chain(out, SD.filt(ac, 'highpass', 140, 0.7), lp, B.music);
    const chords = [[146.8, 174.6, 220, 261.6, 329.6], [98, 123.5, 174.6, 220, 329.6], [130.8, 164.8, 196, 246.9, 293.7], [110, 138.6, 164.8, 196, 233.1]];
    const e = 60 / 70 / 3; let t = t0 - e * 2, bar = 0;
    while (t < t1) { const ch = chords[bar % 4]; for (let k = 0; k < 6; k++) { const tt = t + k * e; if (tt > t1) break; if (tt < t0) continue;
      if (k === 0 || k === 3 || k === 5) ch.forEach((f, i) => { const g = SD.gain(ac, 0); SD.perc(g, tt, (k ? 0.05 : 0.08) / (1 + i * 0.3), 0.005, k ? 0.5 : 1.4); const o = SD.osc(ac, 'sine', f * (k === 5 ? 2 : 1), tt, tt + 1.6); const m = SD.osc(ac, 'sine', f * 2, tt, tt + 1.6), mg = SD.gain(ac, f * 1.2); SD.chain(m, mg); mg.connect(o.frequency); SD.chain(o, g, out); });
      if (k === 0 || k === 3) { const g = SD.gain(ac, 0); SD.perc(g, tt, 0.2, 0.003, 0.18); const o = SD.osc(ac, 'sine', 150, tt, tt + 0.25); o.frequency.exponentialRampToValueAtTime(70, tt + 0.12); SD.chain(o, g, out); }
      { const g = SD.gain(ac, 0); SD.perc(g, tt, k % 3 === 2 ? 0.05 : 0.025, 0.002, 0.05); SD.chain(SD.src(ac, 'white', 231, tt, tt + 0.08), SD.filt(ac, 'highpass', 7000, 0.7), g, out); } }
      t += 6 * e; bar++; }
  };
  // a chair dragged on boards: stick-slip judder through a woody band
  SD.cues['Q05.chair'] = (ac, B, t, p) => {
    const d = p.dur || 0.6, lv = SD.db(p.level || -30); const g = SD.gain(ac, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lv, t + 0.04); g.gain.setValueAtTime(lv * 0.8, t + d * 0.7); g.gain.linearRampToValueAtTime(0, t + d);
    const am = SD.osc(ac, 'square', p.judder || 34, t, t + d + 0.05), ag = SD.gain(ac, lv * 0.6); SD.chain(am, ag); ag.connect(g.gain);
    const f = SD.filt(ac, 'bandpass', p.f || 520, 2.2); f.frequency.setValueAtTime(p.f || 520, t); f.frequency.linearRampToValueAtTime((p.f || 520) * 0.8, t + d);
    SD.chain(SD.src(ac, 'white', 201, t, t + d + 0.05), f, g, SD.pan(ac, p.pan || 0), B.fx);
    const lo = SD.gain(ac, 0); SD.perc(lo, t, lv * 0.5, 0.01, d); SD.chain(SD.src(ac, 'brown', 202, t, t + d + 0.05), SD.filt(ac, 'lowpass', 160, 0.7), lo, B.fx);
  };
  // glass set down on wood, glass touching glass
  SD.cues['Q05.clink'] = (ac, B, t, p) => { [[2380, 1], [3790, 0.5], [5230, 0.25]].forEach(([f, a]) => { const g = SD.gain(ac, 0); SD.perc(g, t, SD.db(p.level || -30) * a, 0.001, 0.35); SD.chain(SD.osc(ac, 'sine', f * (p.k || 1), t, t + 0.5), g, SD.pan(ac, p.pan || 0), B.fx); }); const w = SD.gain(ac, 0); SD.perc(w, t, SD.db((p.level || -30) - 4), 0.001, 0.04); SD.chain(SD.src(ac, 'white', 203, t, t + 0.06), SD.filt(ac, 'bandpass', 900, 1.5), w, B.fx); };
  // a few laughs: voiced pulses through two formants, several people, decaying. p.cut stops them dead.
  SD.cues['Q05.laugh'] = (ac, B, t, p, Rr) => {
    const n = p.n || 3, lv = SD.db(p.level || -30); const out = SD.gain(ac, 1); out.connect(B.room); out.connect(B.reverb);
    if (p.cut) { out.gain.setValueAtTime(1, p.cut - 0.01); out.gain.linearRampToValueAtTime(0, p.cut + 0.01); }
    for (let v = 0; v < n; v++) {
      const t0 = t + v * 0.13 + Rr() * 0.1, f0 = [170, 230, 125, 200, 150][v % 5], hz = 4.6 + Rr() * 1.4, beats = 3 + Math.floor(Rr() * 4);
      const g = SD.gain(ac, 0); for (let b = 0; b < beats; b++) SD.perc(g, t0 + b / hz, lv * (1 - b / (beats + 1)), 0.015, 0.13);
      const o = SD.osc(ac, 'sawtooth', f0, t0, t0 + beats / hz + 0.3); o.frequency.setValueAtTime(f0 * 1.15, t0); o.frequency.linearRampToValueAtTime(f0 * 0.85, t0 + beats / hz);
      const f1 = SD.filt(ac, 'bandpass', 760 + v * 40, 5), f2 = SD.filt(ac, 'bandpass', 1250 + v * 60, 6); const mg = SD.gain(ac, 1); o.connect(f1); o.connect(f2); f1.connect(mg); f2.connect(mg);
      SD.chain(mg, g, SD.pan(ac, (v - (n - 1) / 2) * 0.35), out);
    }
  };
  // a palm laid flat on a card; the sixth comes from Scott's right, dry, on the Extra's bus
  SD.cues['Q05.press'] = (ac, B, t, p) => { const g = SD.gain(ac, 0); SD.perc(g, t, SD.db(p.level || -28), 0.002, 0.06); SD.chain(SD.src(ac, 'brown', 204, t, t + 0.1), SD.filt(ac, 'lowpass', 900, 0.7), g, SD.pan(ac, p.pan || 0), p.extra ? B.extra : B.fx); };
  // a quieter deal under the talk: flick out of the hand, slap on the pile
  SD.cues['Q05.dealq'] = (ac, B, t, p) => { SD.cues.flick(ac, B, t, { level: p.level || -33 }); SD.cues.slap(ac, B, t + FLY, { level: (p.level || -33) + 2 }); };
  // one heartbeat on the Extra's bus, with a second harmonic and a soft skin-thump so it is heard, not only felt, at a low level
  SD.cues['Q05.lub'] = (ac, B, t, p) => { [[0, 0], [0.21, 4]].forEach(([dt, dd]) => { const lv = SD.db((p.level || -28) - dd); const pn = SD.pan(ac, p.pan || 0); pn.connect(B.extra);
    [[52, 1], [104, 0.45]].forEach(([f, a]) => { const g = SD.gain(ac, 0); SD.perc(g, t + dt, lv * a, 0.008, 0.13); SD.chain(SD.osc(ac, 'sine', f, t + dt, t + dt + 0.3), g, pn); });
    const n = SD.gain(ac, 0); SD.perc(n, t + dt, lv * 0.5, 0.004, 0.05); SD.chain(SD.src(ac, 'brown', 206, t + dt, t + dt + 0.1), SD.filt(ac, 'lowpass', 320, 0.7), n, pn); }); };
  // the deck knocked square on the wood: a short dull tock
  SD.cues['Q05.tap'] = (ac, B, t, p) => { const g = SD.gain(ac, 0); SD.perc(g, t, SD.db(p.level || -30), 0.001, 0.05); const o = SD.osc(ac, 'sine', 260, t, t + 0.1); o.frequency.exponentialRampToValueAtTime(150, t + 0.05); SD.chain(o, g, B.fx); const w = SD.gain(ac, 0); SD.perc(w, t, SD.db((p.level || -30) - 6), 0.001, 0.02); SD.chain(SD.src(ac, 'white', 205, t, t + 0.04), SD.filt(ac, 'bandpass', 1800, 1.2), w, B.fx); };

  function sound(S) {
    const E = TM.end, L81 = TM.hands + 3.2;
    // the room. The party has followed them in from the living room at Q04's last level (about -37 dB RMS with the +6 trim). On 'Angelo.' the
    // chatter and the music cut dead and the room tone itself drops (the room's hum carries most of the level, so it drops 14 dB
    // with them: about 15 dB in all): the house goes quiet around the table.
    S.bed('Q05.room', 0, E, { level: -42, steps: [[TM.stop, -56, 0], [TM.piles2, -45, 0.6], [TM.shuffle, -47, 0.4], [TM.rightOkay, -44.5, 1.0], [TM.please - 0.1, -52, 0.25], [TM.hands + 3.0, -47, 0.5], [LAUGH_CUT + 0.2, -42, 0.5]] });
    S.bed('Q05.walla', 0, E, { level: -32.5, steps: [[TM.stop, -120, 0], [TM.piles2 + 2.4, -47, 0.6],
      [TM.christof2 + 1.2, -33, 0.1], [TM.christof2 + 2.6, -39, 0.6], [TM.laughs + 0.1, -36, 0.2], [TM.laughs + 2.0, -41, 0.6], [TM.laughs + 4.4, -46, 0.6], [TM.gather + 1.5, -52, 0.6], [TM.shuffle, -120, 0.3],
      [LAUGH_AT - 0.05, -36, 0.05], [LAUGH_CUT, -120, 0]] });
    S.bed('Q05.groove', 0, E, { level: -26.5, fo: 0.05, lp: 3200, lpSteps: [[E - 1.0, 8000]], steps: [[TM.stop, -120, 0], [LAUGH_CUT + 0.15, -37, 0.35]] });
    // the gathering: chairs, the last one dragged the wrong way round and back; Kay scoots in twice
    S.cue('Q05.chair', GA.wrong[0], { dur: 1.0, level: -29, pan: -0.5, f: 480 }); S.cue('Q05.chair', GA.back[0], { dur: 1.35, level: -28, pan: -0.45, f: 520 });
    S.cue('Q05.chair', GA.kay1[0], { dur: 0.3, level: -31, pan: -0.35, f: 600, judder: 40 }); S.cue('Q05.chair', GA.kay2[0], { dur: 0.3, level: -31, pan: -0.35, f: 620, judder: 42 });
    S.cue('Q05.chair', GA.aChair[0], { dur: 0.7, level: -30, pan: 0.5, f: 560 }); S.cue('Q05.chair', GA.mSit[1] - 0.1, { dur: 0.25, level: -32, pan: -0.2, f: 430 });
    // the swap: two moves, two clinks
    S.cue('Q05.clink', SW.m1[1] - 0.03, { level: -29, pan: 0.25 }); S.cue('Q05.clink', SW.m2[1] - 0.03, { level: -30, pan: 0.2, k: 1.07 });
    // the shuffle and the flourish
    S.cue('riffle', RF.riffle[0], { level: -29 }); S.cue('whoosh', RF.open[0] - 0.1, { dur: 0.35, level: -32 }); S.cue('flick', RF.open[0] + 0.05, { level: -27 }); S.cue('slap', TM.angeloFan + 1.85, { level: -29 });
    S.cue('Q05.laugh', TM.christof1 + 1.6, { n: 3, level: -30 });
    // the deal: round one crisp, then quieter under the talk until the cards stop
    LAUNCH1.forEach((l, k) => { if (k < 7) { S.cue('flick', l, { level: -28 }); S.cue('slap', l + FLY, { level: -26 }); } else if (l + FLY < TM.stop) S.cue('Q05.dealq', l, { level: -35 }); });
    // THE COUNT: seven cuts, seven pings souring; the seventh wrong
    COUNT_AT.forEach((t, k) => S.cue('ping', t + 0.02, k < 6 ? { i: k, sour: 7 * (k + 1), level: -28 } : { i: 6, sour: 49, wrong: true, level: -26 }));
    // from the seventh: two heartbeats under the wide of the seven piles, and the Extra's drone, very low; both gone with the laugh
    S.bed('heart', COUNT_AT[6] + 0.45, TM.piles2 - 0.15, { bpm: 60, level: -31 });
    S.bed('drone7', COUNT_AT[6], TM.piles2 + 1.5, { level: -64, seventh: -56, fi: 1.5, fo: 1.2 });
    // a couple of laughs; Angelo's among them
    S.cue('Q05.laugh', TM.christof2 + 1.4, { n: 4, level: -27 }); S.cue('Q05.laugh', TM.laughs + 0.05, { n: 3, level: -29 });
    // gathering the cards, the shuffle, the slow deal: one cut, one card, one ping each; the sixth lands in the gap (wrong)
    DEAL7.forEach((id, i) => S.cue('slap', TM.gather + 0.3 + i * 0.2 + 0.5, { level: -32 }));
    S.cue('riffle', TM.shuffle + 0.25, { level: -28 });
    LAUNCH2.forEach((l, k) => { S.cue('flick', l, { level: -27 }); S.cue('slap', l + FLY, { level: -24 }); S.cue('ping', l + FLY + 0.03, k < 5 ? { i: k, sour: 49 + 7 * (k + 1), level: -27 } : { i: 5, sour: 91, wrong: true, level: -25 }); });
    // from the sixth card: a faint heart (72) and the drone, until a second before the hands
    S.bed('heart', LAUNCH2[5] + FLY + 0.5, TM.please - 0.1, { bpm: 72, level: -36 });
    S.bed('drone7', LAUNCH2[5] + FLY, TM.please - 0.1, { level: -60, seventh: -52, fi: 3, fo: 0.6 });
    TIC.forEach(t => S.cue('Q05.tap', t, { level: -31 }));
    // six hands come down; then nothing but two heartbeats on the Extra's bus
    ['deena', 'marina', 'kay', 'scott', 'christof'].forEach(id => S.cue('Q05.press', handAt(id), { level: -26, pan: { deena: -0.6, marina: 0.6, kay: 0.4, christof: 0, scott: 0.15 }[id] }));
    S.cue('Q05.press', handAt('gap'), { level: -26, pan: 0.6, extra: true });
    S.hole(handAt('gap') + 0.12, L81 - 0.15 - (handAt('gap') + 0.12));
    S.cue('Q05.lub', HANDS_T + 0.95, { level: -28, pan: 0.3 }); S.cue('Q05.lub', HANDS_T + 1.95, { level: -28, pan: 0.3 });
    // 'Maybe you don't get to play.' The laugh starts, and stops a beat too early; then the party next door creeps back
    S.cue('Q05.laugh', LAUGH_AT, { n: 3, level: -28, cut: LAUGH_CUT });
  }

  // mix trim: +6 dB on the whole sequence (it sat low against Q04 and Q06); the beds above are set on top of it
  FILM.seq({ id: 'Q05', title: 'Seven hands', dur: TM.end, letterbox: 1.7778, gain: 6, lines, sound, shots });
})();
