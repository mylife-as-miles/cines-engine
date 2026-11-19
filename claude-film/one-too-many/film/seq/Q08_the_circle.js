/* ONE TOO MANY — Q08 THE COUNT AND THE HAND CIRCLE (L129-L166, A084-A102). Set: table ('top', 'low'). Letterbox 2.00 throughout.
   The centrepiece. Four piles, then a FIFTH; Deena catches the wrist; Angelo counts five cards and four people; the shove and
   the argument in the low view (F06 angle: Christof's empty place is the camera); Deena's 'scaring me' lands and Angelo turns to
   her, drops his shoulders and sits; the hand circle from above (F07) and from the low seat; the VOICE cut through the paper at
   the gap in Angelo's face, out of a held silence; one cut per name in each roll call, each name laid on the floor plane in its
   speaker's face (five names for four people); the soft second VOICE in Scott's face; 'Who said that?' and two seconds of nothing
   but the fridge; Scott looks down at the clasp from above (no glass), and later the identical framing has a FIFTH glass on its
   coaster, arrived across a cut; Marina's ringed hand pulls out of Scott's first, the other three spring two frames later.
   Four glasses for four people all through Q08 (Kay's glass is off the table). The VOICE perforations persist (state
   'perforations'): hot after each cut, then cooled to dim embers, warmed to the level Q09 keeps at the let-go.
   Local additions (all inside this file; nothing shared was edited): cues Q08.chair (a chair shoved across the floor),
   Q08.seventh (the Extra's 7th alone, blooming late), Q08.slip (Marina's hand out of Scott's) and Q08.release (the other hands);
   camera-safe silhouettes for the large low-view bodies with the rim limited to a wedge facing the lamp (T.silFill + a wedge clip);
   flat ink clasps (rim only on the forearms' lamp side); Angelo's ear cigarette re-cut shorter, tilted and toned ivory;
   world-space type for the names lying on the floor; long lines broken into rows; the VOICE's torn knockout plate.
   Review pass: Angelo's dealt lines are re-laid here (dealSay) so no two word boxes ever touch, with the spread capped at 0.3 on
   lines over 25 characters and the long ones (L134, L138, L140) on two rows; Marina's two low close-up lines (L137, L154) are 46 px
   in a brighter mint, a hand's width in front of her face; the heart picks up from Q07's tail at -21 and rises from there. */
(function () {
  'use strict';
  const O = OTM, C = O.C, T = SETS.table, R = RIG, FM = FILM, SND = window.SOUND;
  const { W, H, S } = O;
  const clamp = FM.clamp, lerp = FM.lerp, seg = FM.seg, ease = FM.ease;
  const D2R = Math.PI / 180;
  const AT = T.anchors.top, AL = T.anchors.low, CI = AT.circle;
  const LTOP = { x: 960, y: 540 }, LLOW = { x: AL.light.x, y: AL.light.y };
  const PAL = T.pal(1);
  const ID4 = ['scott', 'marina', 'deena', 'angelo'];
  const SC6 = AT.figScale, SCC = CI.figScale;
  const tw = FM.twos;
  const L2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  const ROTC = T.cams.circle.rot;
  let CAM = null;   // the world camera matrix of the current frame (top views only): type laid on the floor plane, the VOICE cut

  // ======================================================================== dialogue timing (computed from the engine's own rules)
  const LD = {}, ORDER = [];
  const timing = id => FM.lineTiming(Object.assign({}, LD[id], { _t: undefined }));
  const at = id => LD[id].at, hEnd = id => timing(id).holdEnd, lEnd = id => timing(id).end, inEnd = id => timing(id).inEnd;
  function line(id, t, x) { LD[id] = Object.assign({ id, at: +t.toFixed(3) }, x || {}); ORDER.push(id); return LD[id].at; }
  const after = (id, gap) => hEnd(id) + (gap || 0);
  const afterEnd = (id, gap) => lEnd(id) + (gap || 0);

  // the deal and the beats before the first line
  const DEAL = [['scott', 0.16], ['marina', 0.6], ['deena', 1.04], ['angelo', 1.48], ['gap', 2.02]];
  const FLY = 0.3;
  const K = { gapCut: 2.44, wrist: 3.32, grab: 3.62 };
  line('L129', K.grab + 0.02);
  line('L130', after('L129', 0.04));
  line('L131', afterEnd('L130', 0.02));
  K.count = [0, 1, 2, 3, 4].map(i => after('L131', 0.1) + 0.28 + i * 0.29 + (i === 4 ? 0.14 : 0));
  K.people = [0, 1, 2, 3].map(i => K.count[4] + 0.5 + i * 0.42);
  line('L132', K.people[3] + 0.72);
  line('L133', after('L132', 0.05));
  K.shove = after('L133', -0.1) + 0.04; K.stand = [K.shove - 0.04, K.shove + 0.5];
  line('L134', K.shove + 0.42, { hold: 1.25 });
  line('L135', after('L134', -0.15), { hold: 2.2 });
  line('L136', after('L135', -0.45));
  K.marina = after('L136', -0.4);                      // Marina's shot: Angelo's line is cut on the cut
  line('L137', K.marina + 0.1);
  K.give = after('L137', -0.3);
  line('L138', K.give + 0.1, { hold: 1.8 });
  line('L139', after('L138', -0.45));
  line('L140', after('L139', -0.55), { hold: 1.5 });
  line('L141', after('L140', 0.05), { hold: 2.1 });
  K.turn = at('L141') + 1.4;                           // that lands: he turns to her
  K.slump = [K.turn + 0.42, K.turn + 1.3];             // his shoulders drop, his hands come off the table, the chair takes his weight
  line('L142', K.slump[1] + 0.12, { hold: 1.75 });
  K.chairsIn = [after('L142', -0.55), after('L142', 0.8)];
  K.links = [0, 1, 2, 3].map(i => K.chairsIn[1] + 0.2 + i * 0.37 + (i === 3 ? 0.1 : 0));
  K.insertA = K.links[3] + 0.48; K.insertB = K.insertA + 1.0; K.wide = K.insertB + 1.1;
  line('L143', K.wide + 0.15, { hold: 2.0 });
  K.voice1Hold = 1.5;
  line('L144', afterEnd('L143', 0.95), { hold: K.voice1Hold }); K.voice1 = at('L144');   // a held silence, then the VOICE
  K.rc1 = K.voice1 + K.voice1Hold;                     // Scott doesn't react. He looks left.
  line('L145', K.rc1 + 0.38);
  line('L146', after('L145', 0.08));
  line('L147', after('L146', 0.08));
  line('L148', after('L147', 0.08));
  K.hang = lEnd('L148') - 0.08;                        // five names for four people
  K.fifthPing = K.hang + 0.62;                         // the fifth count lands on the burnt 'Scott.'
  line('L149', K.hang + 1.5);
  line('L150', after('L149', -0.2));
  line('L151', after('L150', -0.15), { hold: 1.7 });
  line('L152', after('L151', -0.3));
  line('L153', after('L152', -0.1));
  line('L154', after('L153', 0.05));
  K.tighten = after('L154', -0.1);
  line('L155', K.tighten + 0.9);
  line('L156', after('L155', -0.35));
  line('L157', after('L156', -0.1));
  K.right = after('L157', -0.05);                      // Scott looks to his right
  line('L158', K.right + 0.36);
  line('L159', after('L158', 0.05));
  line('L160', after('L159', 0.05));
  line('L161', after('L160', 0.05));
  K.cantFit = lEnd('L161') - 0.05;                     // Scott looks from one face to the next
  K.hands = K.cantFit + 1.3;                           // then down at their hands: the clasp from above, no glass
  K.wide2 = K.hands + 1.05;                            // the circle; the room thins away
  K.voice2Hold = 1.3;
  line('L162', K.wide2 + 0.85, { hold: K.voice2Hold, size: 36 }); K.voice2 = at('L162');
  line('L163', after('L162', 0.45));
  K.fridge = lEnd('L163') + 0.05;                      // no answer: nothing but the fridge
  line('L164', K.fridge + 2.3);
  K.lookDown = after('L164', -0.15); K.glass = K.lookDown + 1.2;
  line('L165', K.glass + 0.45);
  line('L166', after('L165', -0.25));
  K.ins = hEnd('L166');                                // the frame L166 ends: Marina's ringed hand in Scott's
  K.pull = K.ins + 3 / 24;                             // she pulls out first
  K.letgo = K.pull + 2 / 24;                           // the other three spring two frames later
  const DUR = +(K.letgo + 1.2).toFixed(2);
  const H1 = K.voice1 + K.voice1Hold, H2 = K.voice2 + K.voice2Hold;

  // ======================================================================== small helpers
  const txt = id => (FM.byId[id] || {}).text || '';
  function scr2w(sx, sy, cam) { cam = cam || T.cams.circle; const z = cam.zoom, r = -cam.rot; const dx = (sx - W / 2) / z, dy = (sy - H / 2) / z; return [cam.x + dx * Math.cos(r) - dy * Math.sin(r), cam.y + dx * Math.sin(r) + dy * Math.cos(r)]; }
  const w2s = (p, k) => { const z = k.zoom, r = k.rot || 0, dx = (p[0] - k.x) * z, dy = (p[1] - k.y) * z; return [W / 2 + dx * Math.cos(r) - dy * Math.sin(r), H / 2 + dx * Math.sin(r) + dy * Math.cos(r)]; };
  const camOn = (p, zoom, sx, sy, rot) => T.camAt(p, [sx == null ? 960 : sx, sy == null ? 540 : sy], zoom, rot == null ? ROTC : rot);
  const drift = (lt, seed) => { const d = FM.shake(lt, 0.6, 0.4, seed || 8); return { dx: Math.round(d.dx), dy: Math.round(d.dy) }; };   // whole pixels: caches survive the drift
  function cam(c, k, lt, jolt) { const d = drift(lt); c.camera(Object.assign({}, k, { dx: (k.dx || 0) + d.dx, dy: (k.dy || 0) + d.dy + (jolt || 0) })); CAM = c.g.getTransform(); }
  function lowCam(c, k, lt, jolt) { const d = drift(lt, 11); c.camera(Object.assign({}, k, { dx: (k.dx || 0) + d.dx, dy: (k.dy || 0) + d.dy + (jolt || 0) })); CAM = null; }
  const mixCam = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), zoom: lerp(a.zoom, b.zoom, u), rot: lerp(a.rot || 0, b.rot || 0, u) });

  // a silhouette with its rim cut only inside a wedge that faces the lamp (an F06 crescent, never an outline). Camera-safe.
  const wedgeCache = new Map();
  function wedge(ch, light, spread) {
    const a = Math.atan2(light.y - ch[1], light.x - ch[0]); const p = new Path2D(); const Rr = 9000; p.moveTo(ch[0], ch[1]);
    for (let k = -4; k <= 4; k++) { const b = a + spread * k / 4; p.lineTo(ch[0] + Rr * Math.cos(b), ch[1] + Rr * Math.sin(b)); } p.closePath(); return p;
  }
  function rimSil(g, path, ch, light, o) {
    o = o || {}; const fill = o.fill || C.ink; g.fillStyle = fill; g.fill(path);
    if (o.alpha === 0) return;
    const m = g.getTransform(); const z = Math.hypot(m.a, m.b) || 1; const w = (o.w || 3.2) / z;
    let ux = light.x - ch[0], uy = light.y - ch[1]; const l = Math.hypot(ux, uy) || 1; ux /= l; uy /= l;
    g.save(); g.clip(path);
    g.save(); g.clip(wedge(ch, light, o.spread || 0.95)); g.globalAlpha = o.alpha == null ? 1 : o.alpha; g.fillStyle = o.color || PAL.hot; g.fill(path); g.restore();
    g.translate(-ux * w, -uy * w); g.fillStyle = fill; g.fill(path); g.restore();
  }
  // the kit's details, with Angelo's ear cigarette re-cut: shorter, tilted along the ear, toned ivory (never an eye-slit bar)
  function details(g, F, light, rimColor) {
    if (!F.details) return; const cg = F.details.find(d => d.kind === 'cigarette');
    O.fig.drawDetails(g, cg ? { details: F.details.filter(d => d !== cg), scale: F.scale, M: F.M } : F, { light, rimColor });
    if (!cg) return; const MM = O.fig.M; const m = MM.comp(F.M, cg.headM); const a = MM.ap(m, [-0.15, 0.06]), b = MM.ap(m, [-0.04, -0.05]);
    g.save(); g.globalAlpha = 0.72; g.strokeStyle = '#B9AA8C'; g.lineCap = 'round'; g.lineWidth = Math.max(1.6, Math.min((F.scale || 60) * 0.03, 2 + (F.scale || 60) * 0.008));
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore();
  }
  // camera-safe silhouette for the large low-view bodies: ink + a lamp-side crescent, plus details
  function sil(c, F, light, o) {
    o = o || {}; const g = c.g; const p = R.path(F); const bb = R.bbox(F); const ch = o.at || (F.joints && F.joints.chest) || F.chest || [bb.x + bb.w / 2, bb.y + bb.h * 0.3];
    if (o.clip) { g.save(); g.clip(o.clip); }
    rimSil(g, p, ch, light, { w: o.w || 3.2, color: o.color || PAL.hot, alpha: o.alpha, spread: o.spread || 0.95, fill: o.fill });
    if (o.details !== false) details(g, F, light, o.color || PAL.hot);
    if (o.clip) g.restore();
  }
  // a profile figure placed so that its head lands on a world point
  function byHead(id, spec, head) {
    const f0 = R.figure(id, Object.assign({}, spec, { x: 0, y: 0, anchor: 'hip', hold: undefined, look: undefined }));
    return R.figure(id, Object.assign({}, spec, { x: head[0] - f0.joints.head[0], y: head[1] - f0.joints.head[1], anchor: 'hip' }));
  }
  // the forearm and hand of a far body, re-cut over the tabletop (far bodies are drawn behind the table's far lip)
  function armClip(E, Wr, tip, r) { const s = S().capsule(E[0], E[1], r, Wr[0], Wr[1], r * 0.9); if (tip) s.capsule(Wr[0], Wr[1], r * 0.9, tip[0], tip[1], r * 0.8); return s.path(0, 1); }

  // ======================================================================== states
  const CHAIRS_GONE = { kay: { out: -30, empty: true }, christof: { out: 90, dc: -24, rot: 0.3, empty: true } };
  const G4 = { scott: 0.3, marina: 0.3, deena: 1.05, angelo: 0.2, kay: false };   // four glasses for four people (Kay's is off the table)
  const PILE = {}; ['scott', 'marina', 'deena', 'angelo', 'gap'].forEach(n => { const p = T.top.pile(n, { ring: 'seats' }); PILE[n] = [p.x, p.y]; });
  const ALLPILES = DEAL.map(([n]) => ({ at: PILE[n] }));
  const CPILES = DEAL.map(([n]) => ({ at: n === 'gap' ? T.top.P(150, 150) : PILE[n] }));   // the circle: the fifth card sits further in
  const dealtPiles = lt => DEAL.filter(([n, t0]) => lt >= t0 + FLY).map(([n]) => ({ at: PILE[n] }));
  const S6 = (lt, x) => Object.assign({ lampTired: 1, kitchenLight: 1, bottle: 1, chairs: Object.assign({}, CHAIRS_GONE), glasses: G4, piles: ALLPILES, deck: { at: AT.dealer.deck } }, x || {});
  // the circle: the four chairs drawn in from where they sat (u 0) to the circle (u 1)
  const DCH = {}; ID4.forEach(id => { const c6 = T.top.chairAt(id, {}); const cc = T.top.chairAt(id, { layout: 'circle' }); let dc = c6.clock - cc.clock; while (dc > 180) dc -= 360; while (dc < -180) dc += 360; DCH[id] = { dc, out: c6.r - cc.r }; });
  DCH.angelo = { dc: DCH.angelo.dc - 6, out: DCH.angelo.out + 150 };   // Angelo's chair was shoved back
  // the burn: hot as each VOICE is cut, a flare on the fifth count, then dim embers; warmed to Q09's level at the let-go
  const PCOOL = 0.36, PEND = 0.62;
  function perfAt(lt, k) {
    const e1 = lt - H1, e2 = lt - H2; if (e1 < 0) return 0; k = k == null ? 1 : k;
    const rel = (PEND - PCOOL) * seg(lt, K.letgo - 0.04, K.letgo + 0.8, 'outQuad');
    const s = PCOOL + 0.8 * Math.exp(-e1 / 1.7) + 0.6 * Math.exp(-Math.pow((lt - K.fifthPing - 0.06) / 0.32, 2)) + rel;
    const a = e2 >= 0 ? PCOOL + 0.85 * Math.exp(-e2 / 1.5) + rel : 0;
    return { scott: clamp(s * k / 1.5, 0, 1), angelo: clamp(a * k / 1.5, 0, 1) };
  }
  const SCirc = (lt, x, pk) => Object.assign({ layout: 'circle', lampTired: 1, kitchenLight: 1, bottle: 1, chairs: Object.assign({}, CHAIRS_GONE),
    glasses: G4, piles: CPILES, perforations: perfAt(lt, pk), perforationLevel: 1.5, fifthGlass: lt >= K.glass ? 1 : 0 }, x || {});
  function chairsIn(u) { const ch = Object.assign({}, CHAIRS_GONE); ID4.forEach(id => { ch[id] = { dc: DCH[id].dc * (1 - u), out: DCH[id].out * (1 - u) }; }); return ch; }

  // ======================================================================== top view: the six-place table (beats 1-2)
  function figTop(c, id, spec, armRim, w) { const F = R.top(id, spec); T.castTop(c, R.path(F), 0.42); R.draw(c.g, F, { light: LTOP, color: PAL.hot, w: w || 3, armRim: !!armRim }); return F; }
  function sixScene(c, lt, s, act) {
    act = act || {}; T.back(c, lt, s, 'top');
    const out = {};
    ['scott', 'marina', 'angelo', 'deena'].forEach(id => {
      const st = T.top.seatAt(id, s); const a = typeof act[id] === 'function' ? act[id](out) : (act[id] || {});
      out[id] = figTop(c, id, Object.assign({ x: st.x, y: st.y, dir: st.dir, scale: SC6, hands: st.hands, handPose: 'flat', foreshorten: true, elbowK: 0.35, t: lt, nose: true }, a), act.armRim);
      if (a.card) T.card(c, a.card[0], a.card[1], a.card[2] || 0, 1);
    });
    if (act.after) act.after(c, out);
    T.front(c, lt, s, 'top');
    return out;
  }
  // Angelo's dealing hands: the left holds the deck, the right flicks each card out toward its pile and comes back
  function dealHands(lt) {
    const tq = tw(lt); const dk = AT.dealer.deck, hL = AT.dealer.hands[0], hR = AT.dealer.hands[1]; let r = hR;
    DEAL.forEach(([n, t0]) => { const out = seg(tq, t0 - 0.12, t0 + 0.02, 'outQuad') * (1 - seg(tq, t0 + 0.06, t0 + 0.28, 'inOutQuad')); if (out > 0) r = L2(hR, L2(dk, PILE[n], 0.42), out * 0.9); });
    return [hL, r];
  }
  const dealLook = lt => { let tg = PILE.scott; DEAL.forEach(([n, t0]) => { if (lt >= t0 - 0.1) tg = PILE[n]; }); return tg; };

  // ======================================================================== top view: the circle
  const CLASPS = { scottMarina: CI.clasps.scottMarina, marinaDeena: CI.clasps.marinaDeena, deenaAngelo: CI.clasps.deenaAngelo, angeloScott: CI.clasps.angeloScott };
  const LINKS = [['scott', 0, 'marina', 1, 'scottMarina'], ['marina', 0, 'deena', 1, 'marinaDeena'], ['deena', 0, 'angelo', 1, 'deenaAngelo'], ['angelo', 0, 'scott', 1, 'angeloScott']];
  const CSEAT = id => [CI.seats[id].x, CI.seats[id].y];
  // a free hand rests on the table edge in front of its owner; it reaches out to the clasp as its link forms
  const restOf = (id, i, s) => { const st = T.top.seatAt(id, s); return L2(st.hands[i], [st.x, st.y], 0.42); };
  // the release: Marina's two links break first (K.pull), the other two on K.letgo; each freed hand springs home over three frames
  const breakAt = nm => (nm === 'scottMarina' || nm === 'marinaDeena') ? K.pull : K.letgo;
  function spring(P, rest, body, f) { if (f < 1) return L2(P, rest, 0.62); if (f < 2) return L2(rest, body, 0.13); if (f < 3) return L2(rest, body, 0.04); return rest; }
  function circleHands(lt, o, s) {
    o = o || {}; const tq = tw(lt); const H2s = {}; const sC = { layout: 'circle' };
    ID4.forEach(id => { H2s[id] = { hands: [restOf(id, 0, s || sC), restOf(id, 1, s || sC)], pose: ['flat', 'flat'] }; });
    LINKS.forEach(([a, ia, b, ib, nm], k) => {
      const P = CLASPS[nm]; const tb = breakAt(nm);
      if (lt >= tb) {   // let go: spring home, open
        const f = Math.floor((lt - tb) * 24 + 1e-6);
        [[a, ia], [b, ib]].forEach(([id, i]) => { H2s[id].hands[i] = spring(P, restOf(id, i, sC), CSEAT(id), f); H2s[id].pose[i] = 'open'; });
        return;
      }
      const t0 = o.linked ? -9 : K.links[k]; const ua = R.curve(a, seg(tq, t0, t0 + 0.55)), ub = R.curve(b, seg(tq, t0 + 0.08, t0 + 0.6));
      H2s[a].hands[ia] = L2(H2s[a].hands[ia], P, clamp(ua, 0, 1.05)); H2s[b].hands[ib] = L2(H2s[b].hands[ib], P, clamp(ub, 0, 1.05));
      if (ua > 0.8) H2s[a].pose[ia] = 'clasp'; if (ub > 0.8) H2s[b].pose[ib] = 'clasp';
    });
    return H2s;
  }
  function circleScene(c, lt, s, act) {
    act = act || {}; T.back(c, lt, s, 'top');
    const hands = act.hands || circleHands(lt, act, s);
    words(c, lt, act.wordsK);
    const out = {};
    ['deena', 'marina', 'angelo', 'scott'].forEach(id => {
      const st = T.top.seatAt(id, s); const a = act[id] || {};
      out[id] = figTop(c, id, Object.assign({ x: st.x, y: st.y, dir: st.dir, scale: SCC, hands: hands[id].hands, handPose: hands[id].pose, spread: 0.02, foreshorten: true, t: lt, nose: true }, a), act.armRim, act.crownW);
    });
    if (act.after) act.after(c, out);
    T.front(c, lt, s, 'top');
    return out;
  }

  // ======================================================================== the names laid on the floor plane
  const NAMESZ = 50, WROT = -ROTC;
  // where each roll-call name falls (screen positions under cams.circle -> world), each beside its speaker
  const NAMEPOS = { L145: [452, 905], L146: [262, 352], L147: [952, 98], L148: [1478, 380], L158: [1090, 985], L159: [1450, 196], L160: [372, 104], L161: [196, 742] };
  const NAMES = {}; Object.keys(NAMEPOS).forEach(k => { NAMES[k] = scr2w(NAMEPOS[k][0], NAMEPOS[k][1]); });
  const ROUND1 = ['L145', 'L146', 'L147', 'L148'], ROUND2 = ['L158', 'L159', 'L160', 'L161'];
  function sayWorld(c, who, text, w, o) {
    if (!CAM) return; const g = c.g; g.save(); g.setTransform(CAM); g.translate(w[0], w[1]); g.rotate(WROT);
    O.say(g, who, text, 0, 0, Object.assign({}, o, { size: NAMESZ, align: 'center' })); g.restore();
  }
  // once said, a name stays where it fell, a little dimmer; the first round dims away when the second begins; all gone at the let-go
  function words(c, lt, wk) {
    if (!CAM || lt >= K.letgo) return; wk = wk == null ? 1 : wk; if (wk <= 0) return;
    const fade1 = 1 - seg(lt, at('L158') - 0.3, at('L158') + 0.4);
    [[ROUND1, fade1], [ROUND2, 1]].forEach(([ids, k]) => ids.forEach(id => {
      const Tm = timing(id); if (lt < Tm.holdEnd || k <= 0) return;
      const g = c.g; g.save(); g.setTransform(CAM); g.translate(NAMES[id][0], NAMES[id][1]); g.rotate(WROT);
      O.say(g, Tm.who, Tm.text, 0, 0, { size: NAMESZ, align: 'center', alpha: 0.72 * k * wk, p: 1 }); g.restore();
    }));
  }
  // the VOICE: a torn plate of darker paper (F07), then the word cut through it to the ember lightbox
  const PLATE = {}; function plate(which) {
    if (PLATE[which]) return PLATE[which]; const v = T.anchors.top.gap[which === 'scott' ? 'voice' : 'voiceSoft']; const sz = v.size; const w = sz * (which === 'scott' ? 2.25 : 2.9), h = sz * 1.32;
    const cx = v.x, cy = v.y - sz * 0.36, r = v.rot || 0, cs = Math.cos(r + 0.04), sn = Math.sin(r + 0.04); const q = O.rng('q08plate' + which); const pts = [];
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], i) => { const n = 5; for (let k = 0; k < n; k++) { const u = k / n; const nx = i === 0 ? lerp(-1, 1, u) : i === 1 ? 1 : i === 2 ? lerp(1, -1, u) : -1; const ny = i === 0 ? -1 : i === 1 ? lerp(-1, 1, u) : i === 2 ? 1 : lerp(1, -1, u);
      const jx = nx * w / 2 * (0.97 + q() * 0.05) + (q() - 0.5) * sz * 0.05, jy = ny * h / 2 * (0.95 + q() * 0.08) + (q() - 0.5) * sz * 0.05; pts.push([cx + jx * cs - jy * sn, cy + jx * sn + jy * cs]); } });
    return (PLATE[which] = { body: S().poly(pts).path(2.2, 61), shadow: S().poly(pts.map(p => [p[0] + sz * 0.05, p[1] + sz * 0.07])).path(2.2, 62) });
  }
  function voiceDraw(c, which, depth) {
    if (!CAM) return; const g = c.g; g.save(); g.setTransform(CAM); const P = plate(which); const a = clamp(depth, 0, 1) * (which === 'scott' ? 1 : 0.7);
    g.globalAlpha = 0.55 * a; g.fillStyle = C.ink; g.fill(P.shadow); g.globalAlpha = 0.92 * a; g.fillStyle = '#2C1C12'; g.fill(P.body);
    g.globalAlpha = 0.5 * a; g.strokeStyle = '#3A2617'; g.lineWidth = 1.4; g.stroke(P.body); g.restore();
    c.g.save(); c.g.setTransform(CAM); T.voiceCut(c, 'top', which, depth); c.g.restore();
  }

  // long lines in rows (split at a sentence boundary), entrance progress shared across the rows
  function rows(text, maxc) {
    if (text.length <= maxc) return [text];
    const parts = text.match(/[^.?!]+[.?!]+(\s|$)|[^.?!]+$/g) || [text]; const out = []; let cur = '';
    parts.forEach(p => { if (cur && (cur + p).trim().length > maxc) { out.push(cur.trim()); cur = p; } else cur += p; });
    if (cur.trim()) out.push(cur.trim());
    const res = [];   // a row still too long splits at its most balanced space
    out.forEach(r => { if (r.length <= maxc) { res.push(r); return; } let best = -1, bm = 1e9; for (let i = 0; i < r.length; i++) if (r[i] === ' ') { const m = Math.max(i, r.length - i - 1); if (m < bm) { bm = m; best = i; } } if (best < 0) res.push(r); else res.push(r.slice(0, best), r.slice(best + 1)); });
    return res;
  }
  function sayRows(g, who, text, x, y, o, maxc, lead) {
    const R2 = rows(text, maxc || 30); const N = text.length; let a = 0; const sz = o.size || (O.FACE[who] || {}).size || 48;
    R2.forEach((r, i) => {
      const s0 = text.indexOf(r, a); const s1 = s0 + r.length; a = s1; const p = clamp(((o.p == null ? 1 : o.p) * N - s0) / Math.max(1, s1 - s0), 0, 1);
      if (p <= 0 && who !== 'deena') return;
      const o2 = Object.assign({}, o, { p }); if (who === 'scott') o2.caret = o.caret && ((p < 1 && p > 0) || (i === R2.length - 1 && p >= 1)); if (i > 0) delete o2.pointTo;
      O.say(g, who, r, x, y + i * sz * (lead || 1.18), o2);
    });
  }
  // a long line on exactly two rows: split at the sentence boundary that balances them best (or, for one sentence, the best space)
  function rows2(text) {
    const parts = (text.match(/[^.?!]+[.?!]+(\s|$)|[^.?!]+$/g) || [text]).map(p => p.trim()).filter(Boolean);
    let best = null; for (let i = 1; i < parts.length; i++) { const a = parts.slice(0, i).join(' '), b = parts.slice(i).join(' '); const m = Math.max(a.length, b.length); if (!best || m < best[0]) best = [m, [a, b]]; }
    return best ? best[1] : rows(text, Math.ceil(text.length / 2));
  }

  // Angelo's dealt type, re-laid here so that no two words touch. The kit's dealt row (same face, colour, and the same seeded tilt and
  // drop per word, seeded per row as before), but each word is placed by its ROTATED box: it keeps the kit's spacing unless its box
  // would come within DEALGAP of the previous word's, and then it is pushed along until clear; a row drops until its ink clears the
  // row above. The word in flight is nudged clear of the words already down. Lines over 25 characters deal no wider than SPREADMAX.
  const DEALGAP = 0.16, SPREADMAX = 0.3;
  function rbox(cx, cy, x0, x1, y0, y1, rot) {
    const cs = Math.cos(rot), sn = Math.sin(rot); let l = 1e9, r = -1e9, t = 1e9, b = -1e9;
    [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].forEach(([x, y]) => { const X = x * cs - y * sn, Y = x * sn + y * cs; l = Math.min(l, X); r = Math.max(r, X); t = Math.min(t, Y); b = Math.max(b, Y); });
    return { l: cx + l, r: cx + r, t: cy + t, b: cy + b };
  }
  const touch = (p, q, m) => p.l < q.r + m && q.l < p.r + m && p.t < q.b + m && q.t < p.b + m;
  const DLAY = new Map();
  function dealLayout(g, text, R2, x, y, o) {
    const key = [text, R2.join('|'), x, y, o.size, o.spread, o.align, o.seed].join('#'); if (DLAY.has(key)) return DLAY.get(key);
    const F = Object.assign({}, O.FACE.angelo, o.size ? { size: o.size } : {}); const sz = F.size, gap = sz * 0.28, mg = sz * DEALGAP;
    const spread = text.length > 25 ? Math.min(SPREADMAX, o.spread || 0) : (o.spread || 0);
    g.save(); g.font = O.font(F); g.letterSpacing = '0px';
    const out = []; let prev = null, ry = y;
    R2.forEach((row, ri) => {
      const r = O.rng('deal' + (o.seed == null ? 1 : o.seed) + row);
      const items = row.split(' ').map(wd => {
        const m = g.measureText(wd), w = m.width; const rot = ((r() - 0.5) * 2) * (2 + 7 * spread) * D2R, dy = (r() - 0.5) * (4 + 10 * spread);
        const x0 = Math.min(-w / 2, -w / 2 - m.actualBoundingBoxLeft), x1 = Math.max(w / 2, -w / 2 + m.actualBoundingBoxRight);
        return { wd, w, rot, dy, x0, x1, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent, fa: m.fontBoundingBoxAscent || sz, fd: m.fontBoundingBoxDescent || sz * 0.3 };
      });
      // along the row: the kit's spacing, or further where two tilted word boxes (the full type height) would come closer than the gap
      items.forEach((it, i) => {
        if (!i) { it.cx = 0; return; } const p = items[i - 1];
        const pb = rbox(p.cx, p.dy, p.x0, p.x1, -p.fa, p.fd, p.rot), q0 = rbox(0, it.dy, it.x0, it.x1, -it.fa, it.fd, it.rot);
        it.cx = Math.max(p.cx + p.w / 2 + gap + it.w / 2, pb.r + mg - q0.l);
      });
      const a = items[0].cx - items[0].w / 2, b = items[items.length - 1].cx + items[items.length - 1].w / 2;
      const sh = o.align === 'right' ? x - b : o.align === 'center' ? x - (a + b) / 2 : x - a;
      // down the page: the usual leading, or lower where this row's ink would come closer than the gap to the row above
      const ink = (it, by) => rbox(sh + it.cx, by + it.dy, it.x0, it.x1, -it.asc, it.desc, it.rot);
      if (prev) { const lo = Math.max(...prev.map(q => q.ink.b)); const hiRel = Math.min(...items.map(it => ink(it, 0).t)); ry = Math.max(ry + sz * 1.18, lo + mg - hiRel); }
      const placed = items.map(it => ({ wd: it.wd, w: it.w, rot: it.rot, x: sh + it.cx, y: ry + it.dy, base: ry, asc: it.asc, desc: it.desc, ink: ink(it, ry), row: ri }));
      placed.forEach(p => out.push(p)); prev = placed;
    });
    g.restore(); const res = { F, words: out, mg }; DLAY.set(key, res); return res;
  }
  function dealSay(g, text, R2, x, y, o) {
    const L = dealLayout(g, text, R2, x, y, o); const F = L.F, Wd = L.words, n = Wd.length; const dealt = Math.round(n * Math.min(1, o.p == null ? 1 : o.p));
    g.save(); g.globalAlpha = o.alpha == null ? 1 : o.alpha;
    for (let i = 0; i < dealt; i++) { const it = Wd[i]; g.save(); g.translate(it.x, it.y); g.rotate(it.rot); O.text(g, it.wd, -it.w / 2, 0, F); g.restore(); }
    if ((o.p == null ? 1 : o.p) < 1 && dealt < n) {
      // the next word mid-flight, as the kit draws it (tilted, smaller, above its slot); on a lower row it comes up from below instead
      // (the rows under it are not dealt yet, so that space is empty); either way it slides along until it clears the words already down
      const it = Wd[dealt], k = 0.86, up = it.row > 0; const fx = it.x - it.w / 2 + it.w * 0.3, fy = up ? it.base + F.size * 0.8 : it.base - F.size * 0.9, fr = up ? -0.3 : -0.42;
      const fb = dx => rbox(fx + dx, fy, 0, it.w * k, -it.asc * k, it.desc * k, fr);
      let dx = 0; for (let pass = 0; pass < 8; pass++) { const bx = fb(dx); const q = Wd.slice(0, dealt).find(w => touch(bx, w.ink, L.mg * 0.5)); if (!q) break; dx += q.ink.r + L.mg * 0.5 - bx.l + 1; }
      g.save(); g.globalAlpha *= 0.85; g.translate(fx + dx, fy); g.rotate(fr); O.text(g, it.wd, 0, 0, Object.assign({}, F, { size: F.size * k })); g.restore();
    }
    g.restore();
  }

  // ======================================================================== low view (F06 angle; Christof's empty place is the camera)
  const lowState = (lt, x) => Object.assign({ lampTired: 1, kitchenLight: 1, empty: ['kay', 'christof'], piles: ALLPILES, glasses: G4,
    chairs: { angelo: { out: angeloOut(lt) } }, perforations: perfAt(lt), perforationLevel: 1.5 }, x || {});
  function angeloOut(lt) { if (lt >= K.chairsIn[0]) return 150; return 150 * seg(tw(lt), K.shove - 0.04, K.shove + 0.28, 'outCubic'); }
  const slumpU = lt => clamp(R.curve('angelo', seg(tw(lt), K.slump[0], K.slump[1]), 'drained'), 0, 1);
  const angeloUp = lt => seg(tw(lt), K.stand[0], K.stand[1], 'outBack') * (1 - slumpU(lt));
  function lowScene(c, lt, s, o) {
    o = o || {}; const g = c.g; const only = o.only || ['angelo', 'scott', 'deena', 'marina'];
    T.back(c, lt, s, 'low', { part: 'wall' });
    let FA = null, B = null;
    if (only.includes('angelo')) {
      const an = T.low.seatAt('angelo', s); const up = o.up != null ? o.up : angeloUp(lt);
      const head = [an.head[0] + 70 * up, an.head[1] - 150 * up];
      const tbl = [[700 + 30 * up, 694], [800 + 10 * up, 676]];
      const base = up > 0.35 ? { pose: 'stand', lean: lerp(0.3, 0.7, up), neck: 0.12, head: 0.16 } : { pose: 'sit', lean: 0.26, neck: 0.1, head: 0.12 };
      const spec = Object.assign({ scale: an.scale, facing: 1, t: lt }, base,
        o.angeloHold === false ? {} : { hold: o.angeloHold || { N: { kind: 'flat', at: tbl[0], view: 'edge' }, F: { kind: 'flat', at: tbl[1], view: 'edge' } } }, o.angelo || {});
      FA = byHead('angelo', spec, head); sil(c, FA, LLOW);
    }
    if (only.includes('scott')) {
      const sc = T.low.seatAt('scott', s);
      B = R.bust('scott', Object.assign({ x: sc.head[0], y: sc.head[1], scale: sc.scale, t: lt }, o.scott || {}));
      if (o.scottNod > 0) {   // he looks down: the head dips and the crown catches the lamp
        const d = o.scottNod * 0.2 * B.scale, cutY = B.head[1] + 0.32 * B.scale; const body = new Path2D(); body.rect(-4000, cutY, 9000, 6000);
        g.save(); g.clip(body); sil(c, B, LLOW, { at: B.chest, details: false }); g.restore();
        const hp = B.parts.head.path(0.8, 33); g.save(); g.translate(0, d); g.translate(B.head[0], B.head[1]); g.scale(1, 1 - 0.1 * o.scottNod); g.translate(-B.head[0], -B.head[1]);
        rimSil(g, hp, [B.head[0], B.head[1] + 0.4 * B.scale], LLOW, { w: 3.6, spread: 0.8 }); g.restore();
      } else sil(c, B, LLOW, { at: B.chest });
    }
    T.back(c, lt, s, 'low', { part: 'table' });
    // far forearms over the tabletop (rim on the lamp side of the forearm only)
    const rc = o.recut || {}; if (FA) (rc.angelo || ['N', 'F']).forEach(sd => { const E = FA.joints['elbow' + sd], Wr = FA.joints['wrist' + sd], hd = FA.holds && FA.holds[sd]; if (!E || !Wr) return; const tip = hd && hd.tip ? hd.tip : null; sil(c, FA, LLOW, { clip: armClip(E, Wr, tip, FA.scale * 0.42), at: L2(E, Wr, 0.5), details: false, spread: 0.7 }); });
    if (B && B.arms) (rc.scott || ['L', 'R']).forEach(q => { const A = B.arms[q]; if (!A) return; const ext = L2(A.E, A.W, 1.6); sil(c, B, LLOW, { at: L2(A.E, A.W, 0.5), clip: armClip(A.E, A.W, ext, B.scale * 0.45), details: false, spread: 0.7 }); });
    if (o.over) o.over(c);
    if (only.includes('deena')) {
      const de = AL.seats.deena;
      sil(c, byHead('deena', Object.assign({ pose: 'sit', scale: de.scale, facing: 1, t: lt, lean: 0.3, neck: 0.1, head: 0.12, armN: { a: 1.25, b: 0.4, hand: 'flat' } }, o.deena || {}), de.head), LLOW, { spread: 0.85 });
    }
    if (only.includes('marina')) {
      const ma = AL.seats.marina;
      sil(c, byHead('marina', Object.assign({ pose: 'sit', scale: ma.scale, facing: -1, t: lt, lean: 0.3, neck: 0.1, head: 0.12, armN: { a: 1.2, b: 0.45, hand: 'flat' } }, o.marina || {}), ma.head), LLOW, { w: o.marinaRim || 3.2, spread: 0.85 });
    }
    T.front(c, lt, s, 'low');
  }
  const HEAD = id => AL.seats[id].head;
  const LOWCU = {
    scott: z => ({ x: HEAD('scott')[0] - 40, y: HEAD('scott')[1] + 150, zoom: z || 1.85 }),
    angelo: z => ({ x: HEAD('angelo')[0] + 170, y: HEAD('angelo')[1] + 130, zoom: z || 1.7 }),
    deena: z => ({ x: HEAD('deena')[0] + 430, y: HEAD('deena')[1] + 60, zoom: z || 1.25 }),
    marina: z => ({ x: HEAD('marina')[0] - 12, y: HEAD('marina')[1] + 40, zoom: z || 1.15 }),   // tight: Marina against the dark, nobody else
  };
  const NOKAYCHAIR = { empty: ['christof'], chairs: {} };
  // ---- the hand circle from the low seat: the long Scott-Angelo link over the gap, in front of the dark hall doorway
  const AS_LOW = [872, 588], SM_LOW = [1640, 790], DA_LOW = [372, 905], MD_LOW = [1010, 1210];
  // the Scott-Angelo knot: two hands (RIG.cu.clasp) in flat ink against the lit wall; only the forearms carry a lamp-side rim
  function lowKnot(c, AS, sc, grip) {
    const L = 0.58 * sc * (1 - 0.07 * (grip || 0)); const K2 = R.cu.clasp(AS[0], AS[1], L, -0.06, 0.9); const g = c.g;
    const arms = S().add(K2.eArm).add(K2.eBack).add(K2.sBack).capsule(K2.wrist[0], K2.wrist[1], 0.17 * L, K2.wrist[0] - 0.5 * L, K2.wrist[1] + 0.1 * L, 0.2 * L);
    rimSil(g, arms.path(0.6, 21), [AS[0], AS[1] + 0.2 * L], LLOW, { w: 2.6, spread: 0.6, alpha: 0.85 });
    g.fillStyle = C.ink; g.fill(S().add(K2.sFing).add(K2.eFing).add(K2.eThumb).add(K2.sThumb).path(0.5, 12));
    return K2;
  }
  function lowCircle(c, lt, o) {
    o = o || {}; const s = lowState(lt, Object.assign({ layout: 'circle', piles: CPILES, chairs: { angelo: { out: 30 } }, fifthGlass: lt >= K.glass ? 1 : 0 }, o.state || {})); const held = lt < K.letgo;
    const grip = o.grip || 0;
    const AS = [AS_LOW[0] - grip * 4, AS_LOW[1] + grip * 3]; const an = T.low.seatAt('angelo', s); const K2 = R.cu.clasp(AS[0], AS[1], 0.58 * an.scale, -0.06, 0.9);
    lowScene(c, lt, s, Object.assign({}, o, {
      up: 0, recut: held ? { angelo: ['N'], scott: ['R'] } : undefined,
      angeloHold: held ? { F: { kind: 'clasp', at: K2.ap(-0.3, 0), toward: AS, elbow: 'down' }, N: { kind: 'clasp', at: DA_LOW, toward: [150, 760], elbow: 'back' } } : false,
      angelo: Object.assign(held ? {} : { armN: { a: 0.3, b: 0.6 }, armF: { a: 0.4, b: 0.7 } }, o.angelo || {}),
      scott: Object.assign(held ? { armL: { to: K2.ap(0.95, -0.08), hand: 'none', elbow: 'down' }, armR: { to: SM_LOW, hand: 'clasp', elbow: 'down' } } : {}, o.scott || {}),
      deena: Object.assign(held ? { hold: { N: { kind: 'clasp', at: MD_LOW, toward: [1400, 1300] }, F: { kind: 'clasp', at: [DA_LOW[0] - 22, DA_LOW[1] + 8], toward: [700, 700] } } } : {}, o.deena || {}),
      marina: Object.assign(held ? { hold: { N: { kind: 'clasp', at: MD_LOW, toward: [600, 1300] }, F: { kind: 'clasp', at: [SM_LOW[0] + 30, SM_LOW[1] + 10], toward: [1200, 600] } } } : {}, o.marina || {}),
      over: held && (o.only || ['angelo', 'scott']).includes('angelo') && (o.only || ['scott']).includes('scott') ? (c2 => lowKnot(c2, AS, an.scale, grip)) : null,
    }));
  }

  // ======================================================================== the clasp inserts (RIG.cu.clasp, both hands in flat ink)
  function claspInsert(c, lt, nm, o) {
    o = o || {}; const P = o.at || CI.clasps[nm]; const s = SCirc(lt, o.glass == null ? null : { fifthGlass: o.glass ? 1 : 0, bottle: 0 }, o.pk);
    T.back(c, lt, s, 'top');
    const [a, b] = nm === 'scottMarina' ? ['scott', 'marina'] : ['scott', 'angelo'];
    const sa = CI.seats[a], sb = CI.seats[b];
    const rot = Math.atan2(sb.y - P[1], sb.x - P[0]);   // local +x toward the other's shoulder
    const L = o.L || 118; const K2 = R.cu.clasp(P[0], P[1], L, rot, 1);
    const g = c.g; const rim = o.rim || PAL.hot; const ra = o.rimAlpha == null ? 1 : o.rimAlpha, ro = ra * (o.otherRim == null ? 1 : o.otherRim);
    if (o.warm) {   // the warmth of her hand: a small posterised pool on the wood, three flat steps
      g.save(); g.globalAlpha = 0.2; O.lightPool(g, P[0] + 0.1 * L * Math.cos(rot), P[1] + 0.1 * L * Math.sin(rot), [{ r: 0.74 * L, color: C.tungstenLow }, { r: 0.56 * L, color: C.tungstenMid }, { r: 0.4 * L, color: C.tungsten }], { rough: 1.2, seed: 41 }); g.restore();
    }
    if (o.hairline && s.fifthGlass) coasterLine(c);
    // forearms: his back toward his own shoulder, the other's along its arm and on out of frame
    const hisW = K2.wrist, hd = [sa.x - hisW[0], sa.y - hisW[1]], hl = Math.hypot(hd[0], hd[1]);
    const hisArm = S().capsule(hisW[0], hisW[1], 0.2 * L, hisW[0] + hd[0] / hl * 5 * L, hisW[1] + hd[1] / hl * 5 * L, 0.42 * L);
    const oW = K2.ap(1.25, -0.13), od = [sb.x - oW[0], sb.y - oW[1]], ol = Math.hypot(od[0], od[1]);
    const oArm = S().add(K2.eArm).capsule(oW[0], oW[1], 0.21 * L, oW[0] + od[0] / ol * 5 * L, oW[1] + od[1] / ol * 5 * L, 0.42 * L);
    // the other's hand pulled out of his (Marina lets go): her whole hand slides back along her arm; his fingers stay curled on nothing
    const pull = o.pull || 0, px = od[0] / ol * pull * 1.05 * L, py = od[1] / ol * pull * 1.05 * L;
    const oth = S().add(oArm).add(K2.eBack).translate(px, py), othD = S().add(K2.eFing).add(K2.eThumb).translate(px, py);
    const his = S().add(hisArm).add(K2.sBack), hisD = S().add(K2.sFing).add(K2.sThumb);
    // their shadow on the table, thrown away from the lamp
    const lx = LTOP.x - P[0], ly = LTOP.y - P[1], ll = Math.hypot(lx, ly); const ux = lx / ll, uy = ly / ll;
    g.save(); g.globalAlpha = 0.5; g.fillStyle = C.ink; g.translate(-ux * 16, -uy * 16); g.fill(S().add(oth).add(othD).add(his).add(hisD).path(1, 3)); g.restore();
    // flat ink hands; the forearms and backs carry a lamp-side crescent, the fingers none (the silhouette reads against the wood)
    const ch = [P[0] - ux * 0.3 * L, P[1] - uy * 0.3 * L];
    rimSil(g, oth.path(0.7, 21), ch, LTOP, { w: 3.2, spread: 1.45, alpha: ro, color: rim });
    rimSil(g, his.path(0.7, 11), ch, LTOP, { w: 3.2, spread: 1.45, alpha: ra, color: rim });
    // the fingers: flat ink, no contour; they read as silhouette against the wood
    g.fillStyle = C.ink; if (pull > 0) { g.fill(hisD.path(0.6, 12)); g.fill(othD.path(0.6, 23)); } else { g.fill(othD.path(0.6, 23)); g.fill(hisD.path(0.6, 12)); }
    if (o.rings) {   // Marina's rings: two gold bands on her fingers, catching the lamp
      [[-0.2, -0.045], [-0.24, 0.08]].forEach(([x, y], i) => { const q0 = K2.ap(x, y); const q = [q0[0] + px, q0[1] + py]; const fl = (0.8 + 0.2 * Math.sin(lt * 6 + i * 2)) * (o.ringFlare || 1);
        g.save(); g.fillStyle = '#D4AF5E'; g.globalAlpha = clamp(fl, 0, 1); g.beginPath(); g.ellipse(q[0], q[1], 0.06 * L, 0.03 * L, rot + Math.PI / 2, 0, 7); g.fill(); g.restore();
        c.em.save(); c.em.fillStyle = '#FFE7A8'; c.em.globalAlpha = clamp(0.9 * fl, 0, 1); c.em.beginPath(); c.em.arc(q[0], q[1], 0.07 * L, 0, 7); c.em.fill(); c.em.restore(); });
    }
    T.front(c, lt, Object.assign({}, s, { dust: o.dust }), 'top');
    return K2;
  }

  // ======================================================================== the clasp from above: Scott's point of view of the hands
  // The same framing is used twice: when he looks down at the hands (no glass), and after 'whose hand' (the FIFTH glass, across a cut).
  const G5 = CI.fifthGlass, ASC = CI.clasps.angeloScott;
  // the joined hands as a bridge across the gap: his arm runs off to the left, the other off to the right into the dark; the table
  // and the lamp above them; the fifth glass will stand in the crook of the two forearms
  const CLASPCAM = T.camAt(ASC, [960, 700], 2.85, 0.515);
  // a hairline of lamp light on the fifth glass's coaster (its lamp-side edges), so it reads as a new object on the wood
  function coasterLine(c) {
    const g = c.g; const r = 0.38; const hw = 26; const q = [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]].map(([x, y]) => [G5[0] + x * Math.cos(r) - y * Math.sin(r), G5[1] + x * Math.sin(r) + y * Math.cos(r)]);
    const m = g.getTransform(); const z = Math.hypot(m.a, m.b) || 1; const lx = LTOP.x - G5[0], ly = LTOP.y - G5[1];
    g.save(); g.strokeStyle = C.tungsten; g.globalAlpha = 0.9; g.lineWidth = 2.4 / z; g.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const p = q[i], n = q[(i + 1) % 4]; const mx = (p[0] + n[0]) / 2 - G5[0], my = (p[1] + n[1]) / 2 - G5[1]; if (mx * lx + my * ly <= 0) continue; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(n[0], n[1]); g.stroke(); }
    g.restore();
  }
  function claspView(c, lt, st, withGlass) {
    const k = Object.assign({}, CLASPCAM, { zoom: CLASPCAM.zoom * lerp(1, 1.03, seg(st, 0, 2.5)) }); cam(c, k, lt);
    claspInsert(c, lt, 'angeloScott', { at: L2(ASC, G5, -0.3), L: 104, rimAlpha: 0.85, otherRim: 0.4, pk: 0.28, hairline: true, glass: withGlass });   // the knot sits a little clear of the glass
  }

  // ======================================================================== shots
  const shots = [];
  const shot = (t, name, draw, x) => shots.push(Object.assign({ at: +t.toFixed(3), name, draw }, x || {}));
  const ROT6 = -6 * D2R;

  // ---- 1. the cards land: four piles, then a FIFTH
  shot(0, 'top: the deal, four piles then a fifth', (c, st, lt) => {
    cam(c, { x: 1000, y: 560, zoom: lerp(1.1, 1.16, seg(lt, 0, 2.5)), rot: ROT6 }, lt);
    const s = S6(lt, { piles: dealtPiles(lt), flying: DEAL.filter(([n, t0]) => lt >= t0 && lt < t0 + FLY).map(([n, t0]) => ({ from: 'dealer', to: PILE[n], u: (lt - t0) / FLY, h: 0.12 })) });
    sixScene(c, lt, s, {
      angelo: { hands: dealHands(lt), handPose: ['clasp', 'flat'], look: dealLook(lt), lookAmt: 0.5 },
      scott: { look: dealLook(lt), lookAmt: 0.35 }, marina: { look: AT.dealer.deck, lookAmt: 0.4 }, deena: { look: dealLook(lt), lookAmt: 0.5 },
    });
  });
  shot(K.gapCut, 'top: the fifth lies in the empty place', (c, st, lt) => {
    cam(c, camOn(T.top.P(150, 312), lerp(2.05, 2.2, seg(st, 0, 0.9)), 960, 520, 30 * D2R), lt);
    sixScene(c, lt, S6(lt), { angelo: { hands: AT.dealer.hands, handPose: ['clasp', 'flat'], look: PILE.gap, lookAmt: 0.4 }, scott: { look: PILE.gap, lookAmt: 0.3 } });
  });
  // ---- Deena catches his wrist before he can deal again
  const WRISTCAM = T.camAt([1262, 520], [960, 560], 2.0, ROT6);
  shot(K.wrist, 'top: Deena catches the wrist', (c, st, lt) => {
    const tq = tw(lt); const reach = seg(tq, K.wrist + 0.02, K.grab + 0.04, 'outQuad'); const gr = R.curve('deena', seg(tq, K.grab - 0.1, K.grab + 0.08));
    const jolt = lt >= K.grab && lt < K.grab + 1 / 24 ? 4 : 0;
    cam(c, WRISTCAM, lt, jolt);
    const dk = AT.dealer.deck; const tgt = L2(AT.dealer.hands[1], L2(dk, PILE.deena, 0.45), reach * 0.75); const tug = seg(tq, K.grab + 0.08, K.grab + 0.4) * 10;
    sixScene(c, lt, S6(lt), {
      armRim: true, angelo: { hands: [AT.dealer.hands[0], [tgt[0] + tug * 0.3, tgt[1] - tug]], handPose: ['clasp', 'clasp'], look: PILE.deena, lookAmt: 0.5, card: [tgt[0] - 24, tgt[1] - 30, 0.4] },
      deena: out => { const w = out.angelo.hands[1].wrist; const st6 = T.top.seatAt('deena', S6(lt)); return { hands: [L2(st6.hands[0], [w[0] + 6, w[1] - 4], gr), st6.hands[1]], handPose: [gr > 0.85 ? 'clasp' : 'open', 'flat'], look: lt > K.grab ? [1384, 703] : w, lookAmt: 0.6 }; },
      scott: { look: [1200, 600], lookAmt: 0.3 },
    });
  });
  shot(hEnd('L129'), 'low cu: Angelo, What?', (c, st, lt) => { lowCam(c, LOWCU.angelo(), lt); lowScene(c, lt, lowState(lt), { only: ['angelo', 'scott'], angelo: { look: [150, 640], lookAmt: 0.7, head: 0.02 } }); });
  const COUNTCAM = T.camAt([985, 590], [960, 540], 1.32, ROT6);
  shot(at('L131') - 0.1, 'top: Count those (Deena points)', (c, st, lt) => {
    cam(c, COUNTCAM, lt);
    const d6 = T.top.seatAt('deena', S6(lt));
    sixScene(c, lt, S6(lt), {
      deena: { hands: [L2(d6.hands[0], PILE.angelo, 0.55), d6.hands[1]], handPose: ['point', 'flat'], look: PILE.angelo, lookAmt: 0.5 },
      angelo: { hands: AT.dealer.hands, handPose: ['clasp', 'flat'], look: [1337, 286], lookAmt: 0.6 },
    });
  });
  // ---- 2. He does. Five.
  const COUNT_ORDER = ['scott', 'marina', 'deena', 'angelo', 'gap'];
  shot(K.count[0] - 0.3, 'top: he counts five', (c, st, lt) => {
    cam(c, Object.assign({}, COUNTCAM, { zoom: COUNTCAM.zoom * lerp(1, 1.04, seg(st, 0, 2.2)) }), lt);
    let look = PILE.scott; K.count.forEach((t, i) => { if (lt >= t - 0.18) look = PILE[COUNT_ORDER[i]]; });
    sixScene(c, lt, S6(lt), {
      angelo: { hands: AT.dealer.hands, handPose: ['clasp', 'flat'], look, lookAmt: 0.85 }, deena: { look: PILE.gap, lookAmt: 0.3 },
      after: (c2) => {   // each pile catches a hairline of light as it is counted; the fifth stays lit
        const g = c2.g; K.count.forEach((t, i) => { if (lt < t) return; const a = i === 4 ? 1 : clamp(1 - (lt - t) / 0.45, 0, 1) * 0.9 + 0.1; const p = PILE[COUNT_ORDER[i]]; const tp = T.top.pile(p);
          g.save(); g.translate(p[0], p[1]); g.rotate(tp.a); g.globalAlpha = a; g.strokeStyle = C.cardPaper; g.lineWidth = i === 4 ? 3.2 : 2.4; g.strokeRect(-27, -36, 54, 72); g.restore();
          c2.em.save(); c2.em.globalAlpha = a * 0.5; c2.em.fillStyle = C.cardPaper; c2.em.fillRect(p[0] - 26, p[1] - 32, 52, 64); c2.em.restore(); });
      },
    });
  });
  // the people: Scott. Deena. Marina. Himself. (a count cut on each, each face the only subject of its frame)
  shot(K.people[0], 'low cu: count 1, Scott', (c, st, lt) => { lowCam(c, LOWCU.scott(), lt); lowScene(c, lt, lowState(lt), { only: ['scott', 'angelo'] }); });
  shot(K.people[1], 'low cu: count 2, Deena', (c, st, lt) => { lowCam(c, LOWCU.deena(1.3), lt); lowScene(c, lt, lowState(lt), { only: ['deena'] }); });
  shot(K.people[2], 'low cu: count 3, Marina', (c, st, lt) => { lowCam(c, LOWCU.marina(), lt); lowScene(c, lt, lowState(lt, NOKAYCHAIR), { only: ['marina'], marinaRim: 4.6 }); });
  shot(K.people[3], 'low cu: count 4, himself', (c, st, lt) => { lowCam(c, LOWCU.angelo(1.8), lt); lowScene(c, lt, lowState(lt), { only: ['angelo', 'scott'], angelo: { head: 0.62, neck: 0.3, lean: 0.34 } }); });
  // ---- 3. No. / What? / the shove
  shot(hEnd('L132'), 'low cu: Scott, What?', (c, st, lt) => { lowCam(c, LOWCU.scott(), lt); lowScene(c, lt, lowState(lt), { only: ['scott', 'angelo'] }); });
  shot(K.shove - 0.14, 'low: Angelo shoves his chair back', (c, st, lt) => {
    const kick = lt >= K.shove && lt < K.shove + 0.09 ? (lt < K.shove + 0.045 ? 7 : -3) : 0;
    lowCam(c, { x: 920, y: 520, zoom: 1.04 }, lt, kick); lowScene(c, lt, lowState(lt));
  });
  // ---- 4. the argument
  shot(at('L135') - 0.1, 'low cu: Deena, nobody\'s touching the cards', (c, st, lt) => { lowCam(c, LOWCU.deena(), lt); lowScene(c, lt, lowState(lt), { only: ['deena', 'angelo'], deena: { head: 0.05, neck: 0.05 } }); });
  shot(at('L136') - 0.1, 'low: Angelo looming', (c, st, lt) => { lowCam(c, { x: 760, y: 360, zoom: 1.32 }, lt); lowScene(c, lt, lowState(lt), { only: ['angelo', 'scott'] }); });
  shot(K.marina, 'low: Marina, sit down', (c, st, lt) => { lowCam(c, LOWCU.marina(1.08), lt); lowScene(c, lt, lowState(lt, NOKAYCHAIR), { only: ['marina'], marina: { head: 0.0, neck: 0.04 }, marinaRim: 4 }); });
  const GIVE = { F: { kind: 'reach', at: [1000, 520] }, N: { kind: 'reach', at: [380, 600] } };
  shot(K.give, 'low: hands, give me your hands', (c, st, lt) => {
    lowCam(c, { x: 920, y: 470, zoom: 1.04 }, lt); const u = seg(tw(lt), at('L138') + 1.2, at('L138') + 1.7);
    lowScene(c, lt, lowState(lt), { angeloHold: u > 0 ? GIVE : undefined });
  });
  shot(at('L139') - 0.1, 'low cu: Scott, what are you doing?', (c, st, lt) => { lowCam(c, LOWCU.scott(), lt); lowScene(c, lt, lowState(lt), { only: ['scott', 'angelo'], angeloHold: GIVE, scott: { tilt: -0.05 } }); });
  // he deals the line and reaches further with every sentence: 'Just give me your hand, Scott.'
  shot(at('L140') - 0.1, 'low: Angelo, count the people', (c, st, lt) => {
    const T0 = at('L140'), tq = tw(lt); const u = ease.inOutSine(seg(lt, T0, inEnd('L140') + 0.6));
    lowCam(c, { x: lerp(850, 905, u), y: lerp(380, 395, u), zoom: lerp(1.26, 1.4, u) }, lt);
    const r1 = R.curve('angelo', seg(tq, T0 + 0.5, T0 + 1.0)), r2 = R.curve('angelo', seg(tq, T0 + 1.45, T0 + 2.1));
    const F = L2(L2([1000, 575], [1080, 560], r1), [1175, 540], r2);
    const N = r2 > 0.05 ? { kind: 'reach', at: L2([720, 690], [900, 640], r2) } : { kind: 'flat', at: [720, 690], view: 'edge' };
    lowScene(c, lt, lowState(lt), { only: ['angelo', 'scott'], angelo: { leanAdd: 0.08 * r1 + 0.1 * r2 }, angeloHold: { F: { kind: 'reach', at: F }, N }, scott: { tilt: 0.04 * r2 } });
  });
  // L141 lands. Angelo turns to her, his shoulders drop, his hands come off the table, the chair takes his weight. Then L142.
  shot(at('L141') - 0.1, 'low: Deena, scaring me; Angelo turns to her and softens', (c, st, lt) => {
    const u = ease.inOutSine(seg(lt, K.turn - 0.2, K.slump[1] + 0.5));
    lowCam(c, { x: lerp(560, 600, u), y: lerp(470, 500, u), zoom: lerp(1.28, 1.34, u) }, lt);
    const tq = tw(lt); const tr = R.turn('angelo', tq, K.turn, 1, -1); const sl = slumpU(lt); const turned = tr.facing < 0;
    const hold = turned ? false : { N: { kind: 'flat', at: [730, 694], view: 'edge' }, F: { kind: 'flat', at: [810, 676], view: 'edge' } };
    const angelo = { facing: tr.facing, squash: tr.squash, look: turned ? HEAD('deena') : null, lookAmt: 0.5,
      leanAdd: -0.22 * sl, headAdd: turned ? 0.12 + 0.18 * sl : 0, armN: turned ? { a: lerp(0.9, 0.25, sl), b: lerp(0.6, 0.35, sl) } : undefined, armF: turned ? { a: lerp(0.8, 0.2, sl), b: lerp(0.5, 0.3, sl) } : undefined };
    if (!turned) delete angelo.look;
    lowScene(c, lt, lowState(lt), { only: ['angelo', 'scott', 'deena'], angeloHold: hold, recut: { angelo: turned ? [] : ['N', 'F'] }, angelo,
      deena: { head: lerp(0.3, 0.18, sl), neck: 0.15, lean: 0.2, look: lt > K.turn + 0.3 ? [700, 260] : undefined, lookAmt: 0.4 } });
  });
  // ---- 5. reluctantly they link hands
  shot(K.chairsIn[0], 'top: the chairs come in', (c, st, lt) => {
    cam(c, mixCam({ x: 960, y: 560, zoom: 0.98, rot: ROT6 }, T.cams.circle, ease.inOutSine(seg(lt, K.chairsIn[0], K.links[3] + 0.6))), lt);
    const u = ease.inOutQuad(seg(tw(lt), K.chairsIn[0] + 0.2, K.chairsIn[1]));
    circleScene(c, lt, SCirc(lt, { chairs: chairsIn(u) }), { scott: { look: CI.clasps.angeloScott, lookAmt: 0.3 }, crownW: 4.2 });
  });
  shot(K.insertA, 'insert: Scott\'s left hand, Marina\'s warm ringed hand', (c, st, lt) => {
    cam(c, camOn(CI.clasps.scottMarina, lerp(3.2, 3.35, seg(st, 0, 1.1)), 960, 560), lt);
    claspInsert(c, lt, 'scottMarina', { rings: true, warm: true });
  });
  shot(K.insertB, 'insert: Scott\'s right hand, at the rim of the light', (c, st, lt) => claspView(c, lt, st * 0.6, false));   // the framing that will return twice
  // ---- 6-7. Somebody start. A held silence. The VOICE.
  shot(K.wide, 'top: the circle (F07), the VOICE', (c, st, lt) => {
    const u = ease.inOutSine(seg(lt, K.wide, H1));
    cam(c, mixCam(Object.assign({}, T.cams.circle, { zoom: 0.9 }), Object.assign({}, T.cams.circle, { zoom: 0.985 }), u), lt);
    circleScene(c, lt, SCirc(lt), { linked: true, crownW: 4.6 });
  });
  // ---- 8. roll call, one cut per name: each speaker, and where their name falls
  const LEFTOF = { scott: 'marina', marina: 'deena', deena: 'angelo', angelo: 'scott' }, RIGHTOF = { scott: 'angelo', angelo: 'deena', deena: 'marina', marina: 'scott' };
  const headAt = id => [CI.seats[id].x, CI.seats[id].y];
  const lookL = id => ({ look: headAt(LEFTOF[id]), lookAmt: 0.8 }), lookR = id => ({ look: headAt(RIGHTOF[id]), lookAmt: 0.8 });
  const cuOn = (id, nameId, z) => { const p = L2(L2(headAt(id), [960, 540], 0.12), NAMES[nameId] || headAt(id), nameId ? 0.38 : 0); return camOn(p, z || 1.8); };
  const cuName = (t, id, nameId, extra) => shot(t, 'top cu: ' + id + ', ' + txt(nameId), (c, st, lt) => {
    cam(c, cuOn(id, nameId, 1.78), lt);
    const act = { linked: true }; act[id] = (nameId < 'L150' ? lookL : lookR)(id); Object.assign(act, extra || {}); circleScene(c, lt, SCirc(lt), act);
  });
  shot(K.rc1, 'top cu: Scott does not react; he looks left', (c, st, lt) => { cam(c, cuOn('scott', 'L145', 1.75), lt); circleScene(c, lt, SCirc(lt), { linked: true, scott: st > 0.2 ? lookL('scott') : {} }); });
  cuName(at('L146') - 0.12, 'marina', 'L146', { scott: lookL('scott') });
  cuName(at('L147') - 0.12, 'deena', 'L147', { marina: lookL('marina') });
  cuName(at('L148') - 0.12, 'angelo', 'L148', { deena: lookL('deena') });
  shot(K.hang, 'top: five names for four people', (c, st, lt) => { cam(c, Object.assign({}, T.cams.circle, { zoom: lerp(0.93, 0.965, seg(st, 0, 2.4)) }), lt); circleScene(c, lt, SCirc(lt), { linked: true, angelo: lookL('angelo'), crownW: 4.6 }); });
  // ---- 9. Wait. (the faces, from the low seat; the hands still joined)
  shot(at('L149') - 0.12, 'low circle cu: Scott, Wait.', (c, st, lt) => { const z = lerp(1.45, 1.9, ease.snap(seg(st, 0, 0.3))); lowCam(c, LOWCU.scott(z), lt); lowCircle(c, lt, { only: ['scott', 'angelo'] }); });
  shot(at('L150') - 0.1, 'low circle cu: Deena, What?', (c, st, lt) => { lowCam(c, LOWCU.deena(1.3), lt); lowCircle(c, lt, { only: ['deena', 'angelo'], deena: { head: 0.0, neck: 0.0 } }); });
  shot(at('L151') - 0.1, 'low circle cu: Scott, say me', (c, st, lt) => { lowCam(c, LOWCU.scott(lerp(1.8, 2.0, seg(st, 0, 3))), lt); lowCircle(c, lt, { only: ['scott', 'angelo'], scott: { tilt: 0.05 } }); });
  shot(at('L152') - 0.1, 'low circle cu: Angelo, I just did', (c, st, lt) => { lowCam(c, LOWCU.angelo(1.7), lt); lowCircle(c, lt, { only: ['angelo', 'scott'] }); });
  shot(at('L153') - 0.1, 'low circle cu: Scott, before that', (c, st, lt) => { lowCam(c, LOWCU.scott(2.0), lt); lowCircle(c, lt, { only: ['scott', 'angelo'], scott: { tilt: -0.06 } }); });
  shot(at('L154') - 0.1, 'low circle: Marina, I heard it', (c, st, lt) => { lowCam(c, LOWCU.marina(1.08), lt); lowCircle(c, lt, { only: ['marina'], state: NOKAYCHAIR, marina: { head: -0.05, neck: 0.0 }, marinaRim: 4 }); });
  shot(K.tighten, 'low circle: Angelo looks at each; his grip tightens', (c, st, lt) => {
    lowCam(c, { x: 930, y: 500, zoom: 1.1 }, lt); const looks = [[150, 520], [1700, 520], [1220, 420]]; const i = Math.min(2, Math.floor(seg(st, 0, 0.95) * 3));
    lowCircle(c, lt, { grip: seg(st, 0.7, 1.0), angelo: { look: looks[i], lookAmt: 0.8 } });
  });
  shot(at('L155') + 1.0, 'low circle cu: Angelo, other way', (c, st, lt) => { lowCam(c, LOWCU.angelo(1.75), lt); lowCircle(c, lt, { only: ['angelo', 'scott'], grip: 1 }); });
  shot(at('L156') - 0.1, 'low circle cu: Deena, Angelo--', (c, st, lt) => { lowCam(c, LOWCU.deena(1.3), lt); lowCircle(c, lt, { only: ['deena', 'angelo'], deena: { head: 0.1 } }); });
  shot(at('L157') - 0.1, 'low circle cu: Angelo, just do it', (c, st, lt) => { lowCam(c, LOWCU.angelo(1.85), lt); lowCircle(c, lt, { only: ['angelo', 'scott'], grip: 1, angelo: { head: 0.25 } }); });
  // ---- 10. the other way: one cut per name
  shot(K.right, 'top cu: Scott looks to his right', (c, st, lt) => { cam(c, cuOn('scott', 'L158', 1.75), lt); circleScene(c, lt, SCirc(lt), { linked: true, scott: st > 0.22 ? lookR('scott') : {} }); });
  cuName(at('L159') - 0.12, 'angelo', 'L159', { scott: lookR('scott') });
  cuName(at('L160') - 0.12, 'deena', 'L160', { angelo: lookR('angelo') });
  cuName(at('L161') - 0.12, 'marina', 'L161', { deena: lookR('deena') });
  shot(K.cantFit, 'top: Scott looks from one face to the next', (c, st, lt) => {
    cam(c, mixCam(cuOn('scott', null, 1.32), cuOn('scott', null, 1.22), ease.inOutSine(seg(st, 0, 1.3))), lt);
    const look = [headAt('marina'), headAt('deena'), headAt('angelo')][Math.min(2, Math.floor(seg(st, 0.05, 1.2) * 3))];
    circleScene(c, lt, SCirc(lt), { linked: true, scott: { look, lookAmt: 0.85 } });
  });
  shot(K.hands, 'top: then down at their hands (the clasp, no glass)', (c, st, lt) => claspView(c, lt, st, false));
  // ---- 11. very softly: Angelo. No one moves.
  shot(K.wide2, 'top: the circle, the soft VOICE', (c, st, lt) => { cam(c, Object.assign({}, T.cams.circle, { zoom: lerp(0.95, 0.99, seg(st, 0, 3)) }), lt); circleScene(c, lt, SCirc(lt), { linked: true, crownW: 4.6 }); });
  shot(at('L163') - 0.12, 'low circle cu: Scott, who said that?', (c, st, lt) => { lowCam(c, LOWCU.scott(1.9), lt); lowCircle(c, lt, { only: ['scott', 'angelo'] }); });
  shot(K.fridge, 'low circle: no answer; the fridge', (c, st, lt) => { lowCam(c, { x: 960, y: 500, zoom: 1.0 }, lt); lowCircle(c, lt, {}); });
  shot(at('L164') - 0.1, 'low circle cu: Deena, whose hand have you got?', (c, st, lt) => { lowCam(c, LOWCU.deena(1.3), lt); lowCircle(c, lt, { only: ['deena', 'angelo'], deena: { head: 0.05 } }); });
  // ---- 12. he looks down: Angelo's hand. Of course it is. Then the same view from above, and a FIFTH glass, arrived across a cut.
  shot(K.lookDown, 'low circle: Scott and Angelo, hands joined over the gap; Scott looks down', (c, st, lt) => {
    lowCam(c, { x: lerp(930, 915, seg(st, 0, 1.2)), y: 500, zoom: lerp(1.3, 1.38, seg(st, 0, 1.2)) }, lt);
    lowCircle(c, lt, { only: ['angelo', 'scott'], angelo: { look: AS_LOW, lookAmt: 0.5 }, scottNod: R.curve('scott', seg(tw(lt), K.lookDown + 0.2, K.lookDown + 0.7)) });
  });
  shot(K.glass, 'top: the same hands; a fifth glass on a coaster, between them', (c, st, lt) => claspView(c, lt, st, true));
  shot(at('L166') - 0.1, 'low circle cu: Angelo, don\'t let go yet', (c, st, lt) => { lowCam(c, LOWCU.angelo(1.85), lt); lowCircle(c, lt, { only: ['angelo', 'scott'], grip: 1, angelo: { head: 0.2 } }); });
  // ---- 13. Marina lets go anyway: her ringed hand pulls out of Scott's; two frames later they all break contact
  shot(K.ins, 'insert: Marina\'s hand pulls out of Scott\'s', (c, st, lt) => {
    cam(c, camOn(CI.clasps.scottMarina, 3.3, 960, 560), lt);
    const f = Math.floor((lt - K.pull) * 24 + 1e-6); const pull = lt < K.pull ? 0 : f < 1 ? 0.38 : 1;
    claspInsert(c, lt, 'scottMarina', { rings: true, warm: true, pull, ringFlare: lt < K.pull ? 1.15 : 0.9 });
  });
  shot(K.letgo, 'top: they all let go', (c, st, lt) => {
    const j = lt >= K.letgo && lt < K.letgo + 2 / 24 ? (lt < K.letgo + 1 / 24 ? -6 : 3) : 0;
    cam(c, camOn([960, 560], 1.22, 960, 545), lt, j); circleScene(c, lt, SCirc(lt), { linked: true, marina: { look: CI.fifthGlass, lookAmt: 0.5 }, crownW: 4 });
  });

  // ======================================================================== dialogue: positions (screen, on ink, by the speaker) and treatments
  const P = (id, x, y, more) => Object.assign(LD[id], { x, y }, more || {});
  const rowsDraw = (id, x, y, maxc, align) => (c, s, o) => sayRows(c.g, s.T.who, s.T.text, x, y, Object.assign({}, o, { align: align || o.align }), maxc);
  // Angelo's dealt lines (no two words touching; see dealSay): rowsOf(text) gives the rows
  const ONE = t => [t], ROWS = maxc => t => rows(t, maxc);
  const dealDraw = (x, y, rowsOf, align) => (c, s, o) => dealSay(c.g, s.T.text, rowsOf(s.T.text), x, y, Object.assign({}, o, { align: align || o.align }));
  // Marina in the low close-ups: 46 px, a brighter mint at full opacity, in the dark just in front of her face (her grid, her rings)
  const MINT = '#A6F0C6';
  const mintDraw = (x, y, align) => (c, s, o) => { const F = O.FACE.marina, c0 = F.color; F.color = MINT; try { O.say(c.g, 'marina', s.T.text, x, y, Object.assign({}, o, { size: 46, align })); } finally { F.color = c0; } };
  P('L129', 1360, 300);
  P('L130', 470, 300, { align: 'right' });                                     // in the dark beside Angelo's own head
  P('L131', 1390, 250, { opts: { pointTo: w2s(PILE.angelo, COUNTCAM).map((v, i) => v + (i ? -22 : 18)) } });
  P('L132', 880, 175);
  P('L133', 330, 230);
  P('L134', 760, 150, { opts: { spread: 0.3 } }); LD.L134.draw = dealDraw(760, 150, rows2);
  P('L135', 640, 520, { size: 46 }); LD.L135.draw = rowsDraw('L135', 640, 520, 18);   // at her mouth, over his dark chest
  P('L136', 860, 165, { opts: { spread: 0.45 } }); LD.L136.draw = dealDraw(860, 165, ONE);
  P('L137', 690, 430, { size: 46, align: 'right' }); LD.L137.draw = mintDraw(690, 430, 'right');   // at her eye line, a hand's width in front of her face
  P('L138', 720, 150, { opts: { spread: 0.3 } }); LD.L138.draw = dealDraw(720, 150, rows2);
  P('L139', 180, 200);
  P('L140', 720, 140, { opts: { spread: 0.3 } }); LD.L140.draw = dealDraw(720, 140, rows2);
  P('L141', 600, 560, { opts: { soft: true } }); LD.L141.draw = rowsDraw('L141', 600, 560, 18);
  P('L142', 965, 175, { size: 44, opts: { spread: 0.15 } }); LD.L142.draw = dealDraw(965, 175, ROWS(18));   // behind his bowed head, on the dark doorway
  P('L143', 1330, 170, { opts: { spread: 0.2 } }); LD.L143.draw = dealDraw(1330, 170, ROWS(22));
  P('L144', 1306, 682, { size: 140, align: 'center', opts: { face: 'angelo' }, draw: (c, s, o) => voiceDraw(c, 'scott', o.depth) });
  ['L145', 'L146', 'L147', 'L148', 'L158', 'L159', 'L160', 'L161'].forEach(id => P(id, NAMEPOS[id][0], NAMEPOS[id][1], { opts: { exit: 'cut' }, draw: (c, s, o) => sayWorld(c, s.T.who, s.T.text, NAMES[id], o) }));
  P('L149', 240, 160);
  P('L150', 650, 530);
  P('L151', 70, 200); LD.L151.draw = rowsDraw('L151', 70, 200, 18);
  P('L152', 880, 175);
  P('L153', 300, 230);
  P('L154', 690, 430, { size: 46, align: 'right' }); LD.L154.draw = mintDraw(690, 430, 'right');
  P('L155', 445, 335, { align: 'right', opts: { spread: 0.3 } }); LD.L155.draw = dealDraw(445, 335, ROWS(18), 'right');
  P('L156', 650, 530);
  P('L157', 880, 175);
  P('L162', 1298, 742, { size: 36, align: 'center', opts: { face: 'scott', depth: 0.6 }, draw: (c, s, o) => voiceDraw(c, 'angelo', o.depth) });
  P('L163', 300, 230);
  P('L164', 640, 510); LD.L164.draw = rowsDraw('L164', 640, 510, 18);
  P('L165', 300, 905);                                                         // on the dark floor under his own arm
  P('L166', 880, 175, { opts: { spread: 0.1 } });
  // lines that would otherwise linger over the next shot's faces or lights are cut on the cut (each has been fully up >= 0.6 s)
  const clipTo = (id, t) => { LD[id].until = +t.toFixed(3); LD[id].opts = Object.assign({}, LD[id].opts, { exit: 'cut' }); };
  clipTo('L136', K.marina); clipTo('L137', K.give); clipTo('L134', at('L135') - 0.1); clipTo('L138', at('L139') - 0.1); clipTo('L140', at('L141') - 0.1);
  clipTo('L142', K.chairsIn[0]); clipTo('L150', at('L151') - 0.1); clipTo('L149', at('L150') - 0.1); clipTo('L151', at('L152') - 0.1); clipTo('L153', at('L154') - 0.1);
  clipTo('L154', K.tighten); clipTo('L155', at('L156') - 0.1); clipTo('L164', K.lookDown); clipTo('L165', at('L166') - 0.1); clipTo('L166', K.ins);
  ['L132', 'L152'].forEach(id => { LD[id].opts = Object.assign({}, LD[id].opts, { exit: 'cut' }); });
  // Scott's lines that cut instead of deleting: land them ourselves (the stock landing stacks its deletion ticks into one click)
  const QUIETCUT = ORDER.filter(id => (FM.byId[id] || {}).speaker === 'SCOTT' && LD[id].opts && LD[id].opts.exit === 'cut');
  QUIETCUT.forEach(id => { LD[id].silent = true; });
  const lines = ORDER.map(id => LD[id]);

  // ======================================================================== sound
  // local cues: a chair shoved across the floor (filtered noise with judder), the Extra's 7th sounding alone (blooming late, quieter
  // than the room was), Marina's hand slipping out of Scott's (skin and a ring tick), and the other hands letting go
  if (SND && !SND.cues['Q08.chair']) {
    const { gain, src, filt, chain, pan, db, osc, perc } = SND;
    SND.cues['Q08.chair'] = (ac, B, t, p) => {
      const d = p.dur || 0.42, lv = db(p.level == null ? -16 : p.level); const g = gain(ac, 0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lv, t + 0.02); g.gain.setValueAtTime(lv, t + d * 0.7); g.gain.exponentialRampToValueAtTime(lv * 0.01, t + d);
      const bp = filt(ac, 'bandpass', p.f || 900, 3.5); bp.frequency.setValueAtTime((p.f || 900) * 1.25, t); bp.frequency.exponentialRampToValueAtTime((p.f || 900) * 0.7, t + d);
      const am = gain(ac, 0.6); const lfo = osc(ac, 'square', p.judder || 38, t, t + d + 0.05); const lg = gain(ac, 0.4); chain(lfo, lg); lg.connect(am.gain);
      chain(src(ac, 'white', 191, t, t + d + 0.05), bp, am, g, pan(ac, p.pan || 0), B.fx);
      const g2 = gain(ac, 0); perc(g2, t + d * 0.92, lv * 0.8, 0.003, 0.12); chain(osc(ac, 'sine', 95, t + d * 0.9, t + d + 0.3), g2, B.fx);   // the legs knock as it stops
    };
    SND.cues['Q08.seventh'] = (ac, B, t, p) => {
      const d = p.dur || 2.4, lv = db(p.level == null ? -40 : p.level); const g = gain(ac, 0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lv * 0.35, t + 0.25); g.gain.linearRampToValueAtTime(lv, t + 0.7); g.gain.setTargetAtTime(lv * 0.5, t + 1.1, 0.7); g.gain.linearRampToValueAtTime(0, t + d);
      [384.7, 385.4, 769.6].forEach((f, i) => chain(osc(ac, 'sine', f, t, t + d + 0.1), gain(ac, i === 2 ? 0.16 : 0.5), g)); g.connect(B.extra);
    };
    SND.cues['Q08.slip'] = (ac, B, t, p) => {
      const lv = db(p.level == null ? -20 : p.level); const g = gain(ac, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lv, t + 0.015); g.gain.exponentialRampToValueAtTime(lv * 0.02, t + 0.13);
      const bp = filt(ac, 'bandpass', 2600, 1.4); bp.frequency.setValueAtTime(3400, t); bp.frequency.exponentialRampToValueAtTime(1500, t + 0.12);
      chain(src(ac, 'white', 211, t, t + 0.16), bp, g, pan(ac, -0.45), B.fx);
      const r = gain(ac, 0); perc(r, t + 0.035, lv * 0.35, 0.001, 0.22); chain(osc(ac, 'sine', 3150, t + 0.03, t + 0.3), r, pan(ac, -0.45), B.fx);   // the ring
    };
    SND.cues['Q08.release'] = (ac, B, t, p) => {
      const lv = db(p.level == null ? -20 : p.level);
      [-0.15, 0.2, 0.55].forEach((pn, i) => { const g = gain(ac, 0); perc(g, t + i * 0.006, lv, 0.001, 0.06); chain(src(ac, 'white', 201 + i, t, t + 0.12), filt(ac, 'bandpass', 1500 + i * 300, 1.2), g, pan(ac, pn), B.fx); });
    };
  }
  function sound(Sn) {
    QUIETCUT.forEach(id => { const Tm = timing(id); Sn.cue('land.scott', Tm.at, { chars: Tm.text.length, dur: Tm.ent }); });
    const V1 = K.voice1, V2 = K.voice2, F0 = K.fridge, F1 = at('L164') - 0.2;
    // the room in stretches: before each VOICE it thins to nothing (gone by V - 0.45), the hole holds black, then it returns;
    // in the fridge beat the room, the gas and the pad are gone and the fridge hum is alone and loud
    [[0, V1 - 0.42], [H1 + 0.06, V2 - 0.42], [H2 + 0.06, F0 + 0.35], [F1, DUR]].forEach(([a, b]) => Sn.bed('room', a, b, { level: -40 }));
    [[0, V1 - 0.45], [H1 + 0.06, V2 - 0.45], [H2 + 0.06, F0 + 0.2], [F1, DUR]].forEach(([a, b]) => Sn.bed('gas', a, b, { from: lerp(-46, -44, a / DUR), to: lerp(-46, -44, b / DUR) }));
    Sn.bed('fridge', 0, DUR, { level: -40, steps: [[V1 - 1.05, -47], [V1 - 0.8, -58], [V1 - 0.55, -95], [H1 + 0.06, -40], [V2 - 1.05, -47], [V2 - 0.8, -58], [V2 - 0.55, -95], [H2 + 0.06, -40], [F0 - 0.05, -28], [F1 + 1.0, -33]] });
    [[0, V1 - 0.4, 2, 0.8], [H1 + 0.25, V2 - 0.4, 2.5, 0.8], [H2 + 0.25, DUR, 2.5, 1]].forEach(([a, b, fi, fo]) => Sn.bed('drone7', a, b, { level: -47, seventh: -55, fi, fo }));
    // the heartbeat, rising; it stops well before each VOICE and through the fridge beat
    // it picks up from Q07's tail (which hands over at -20) one dB under it, and still rises from there
    Sn.bed('heart', 0, K.shove, { bpm: 64, bpmTo: 72, level: -21 });
    Sn.bed('heart', K.shove, V1 - 1.25, { bpm: 76, bpmTo: 92, level: -20 });
    Sn.bed('heart', H1 + 0.6, V2 - 1.25, { bpm: 94, bpmTo: 106, level: -19 });
    Sn.bed('heart', H2 + 0.15, F0 - 0.3, { bpm: 108, bpmTo: 112, level: -18.5 });
    Sn.bed('heart', at('L164') - 0.05, K.letgo - 0.03, { bpm: 112, bpmTo: 122, level: -18 });   // it stops dead when they let go
    // the dread pad grows from the shove; it leaves before each silence
    Sn.bed('dread', K.shove, V1 - 0.45, { level: -40, root: 55, fi: 4, fo: 0.9 });
    Sn.bed('dread', H1 + 0.4, V2 - 0.45, { level: -36, root: 55, fi: 3, fo: 0.9 });
    Sn.bed('dread', H2 + 0.3, F0 + 0.25, { level: -34, root: 55, fi: 1.5, fo: 0.5 });
    Sn.bed('dread', F1, K.letgo + 0.5, { level: -32, root: 55, fi: 1.5, fo: 0.5 });
    Sn.duck(K.turn - 0.05, at('L142') + 0.5, 0.5);   // that lands: the room holds its breath while Angelo softens
    // the deal: flick at each throw, the slap and a count ping as each lands; the fifth is wrong
    DEAL.forEach(([n, t0], i) => { Sn.cue('flick', t0, {}); Sn.cue('slap', t0 + FLY, { level: -22 }); Sn.cue('ping', t0 + FLY, i < 4 ? { i, sour: 35, level: -30 } : { i: 4, sour: 35, wrong: true, level: -27 }); });
    Sn.cue('flick', K.wrist + 0.1, { level: -30 }); Sn.cue('slap', K.grab, { level: -18 }); Sn.cue('lub', K.grab + 0.04, { level: -16 });
    K.count.forEach((t, i) => Sn.cue('ping', t, i < 4 ? { i, sour: 35, level: -29 } : { i: 4, sour: 35, wrong: true, level: -25 }));
    K.people.forEach((t, i) => Sn.cue('ping', t + 0.03, { i, sour: 35, level: -31 }));   // four people: four counts, no fifth
    Sn.cue('Q08.chair', K.shove, { level: -12, dur: 0.46, f: 820, pan: -0.45 });
    Sn.cue('lub', K.shove + 0.5, { level: -15 });
    // the chairs drawn in, reluctantly; the hands meeting
    [[0.25, -0.3, -26], [0.55, 0.35, -28], [0.9, 0.0, -27], [1.2, 0.6, -25]].forEach(([d, pn, lv]) => Sn.cue('Q08.chair', K.chairsIn[0] + d, { level: lv, dur: 0.55, f: 560, judder: 24, pan: pn }));
    K.links.forEach((t, i) => Sn.cue('slap', t + 0.5, { level: -30 + i }));
    // the VOICE makes the hole itself (automatic); the 7th blooms only after a third of a second of nothing, below the room
    Sn.cue('Q08.seventh', V1 + 0.36, { level: -41, dur: 3.0 });
    Sn.cue('lub', H1 + 0.08, { level: -14 });
    // the roll calls count too: four names, then the fifth (the burnt name) rings wrong
    ['L145', 'L146', 'L147', 'L148'].forEach((id, i) => Sn.cue('ping', inEnd(id) + 0.02, { i, sour: 35, level: -34 }));
    Sn.cue('ping', K.fifthPing, { i: 4, sour: 35, wrong: true, level: -27 });
    ['L158', 'L159', 'L160', 'L161'].forEach((id, i) => Sn.cue('ping', inEnd(id) + 0.02, { i, sour: 42, level: -34 }));
    Sn.cue('swell', at('L149') - 0.42, { dur: 0.4, level: -30, f: 82 });
    Sn.cue('lub', K.tighten + 0.8, { level: -15 });
    Sn.cue('Q08.seventh', V2 + 0.36, { level: -44, dur: 2.6 });
    Sn.cue('ping', K.glass, { i: 4, sour: 35, wrong: true, level: -22 });
    Sn.cue('lub', K.glass + 0.04, { level: -13 });
    Sn.cue('Q08.slip', K.pull, { level: -19 });
    Sn.cue('Q08.release', K.letgo, { level: -15 });
    Sn.cue('hit', K.letgo, { level: -13, f: 44, decay: 1.4 });
  }

  FM.seq({ id: 'Q08', title: 'The count and the hand circle', dur: DUR, letterbox: 2.0, lines, sound, shots });
})();
