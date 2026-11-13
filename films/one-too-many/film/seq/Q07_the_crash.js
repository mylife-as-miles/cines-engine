/* ONE TOO MANY — Q07 THE CRASH  (L104-L128, A063-A083)
   Scott taps Kay's untouched glass; from the kitchen a choking gasp and a metallic crash; the letterbox steps to 1.85, the lamp
   drains and the kitchen doorway takes the wrong hood-yellow. A bottle arrives behind him with nobody to bring it, and five fresh
   glasses with it; the film counts five for four people. "Where's Kay?" steps the frame to 2.00. Nobody looks at the kitchen door.
   Sets: table (two, low, bottle, top), hall (corridor), title (the tally of five).
   Each speaker has their own plate in the shot/reverse: Scott with Kay's empty chair and lip-marked glass across from him (and, at the
   end, the hood-yellow door), Deena with the kitchen's yellow sliver behind her, Marina against the dark hall door (the bathroom's
   line of light far down it), Angelo low across the table with the empty place at Scott's right beside him.
   Local additions (nothing in the sets or rig covers them): the foot insert (his sock on her block-heeled pump), Kay's big glass
   (the S03 goblet with a seated rim, drawn over the bottle view's bare insert base), the pour at Deena's place, the hard-edged
   crowd in the 'two' view, the hall door behind Marina, the hood slab in Scott's last close-up, the corridor's afterimage on a
   clean wall panel, the travelling type for 'Christof?' and 'Oh. Thanks.', the glass-count glints, the raised bottle as a hard
   silhouette, and sounds (Q07.ring, Q07.tally, Q07.tail, Q07.cork, Q07.pour, Q07.heart: one heartbeat bed with a level ramp). */
(function () {
  'use strict';
  const O = window.OTM, { C, W, H, S } = O; const FL = window.FILM, R = window.RIG;
  const T = SETS.table, HL = SETS.hall, TI = SETS.title;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, u) => a + (b - a) * u;
  const seg = FL.seg, E = FL.ease;
  const memo = (() => { const m = new Map(); return (k, f) => { if (!m.has(k)) m.set(k, f()); return m.get(k); }; })();

  // ------------------------------------------------------------------ the clock (sequence-local seconds)
  const K = {
    tap: 3.75, hole: 5.25, gasp: 5.75, crash: 6.05, tally: 7.65, rise: 8.15, call: 8.9, marina: 10.7,
    step: 12.5, thump: 13.6, foot: 13.75, sorry: 15.75, lift: 16.0, reveal: 17.05, count: 17.5,
    sit: 19.3, thanks: 19.9, pour: 21.95, pop: 22.2, pour0: 22.85, plenty: 24.0, pour1: 25.0,
    tell: 26.0, twice: 27.75, kayg: 29.0, kay: 29.45, bath: 30.95, still: 31.95, ask: 33.2,
    corridor: 35.0, dont: 37.3, thought: 40.3, maybe: 43.4, looks: 45.35, drop: 45.9, start: 46.9,
    did: 50.6, went: 52.35, wine: 54.85, look: 56.65, smoke: 58.35, nosmoke: 59.85, dunno: 61.65,
    door: 63.55, deck: 64.9, hand: 66.1, both: 69.3, kc: 70.6, nod: 71.55, end: 73.85,
  };
  const DUR = K.end;
  const tiredAt = lt => lt < K.crash ? 0 : 0.15 + 0.85 * seg(lt, K.crash, K.crash + 1.25, 'outCubic');
  const kitAt = lt => lt < K.crash ? 0.22 : 0.22 + 0.78 * seg(lt, K.crash + 1 / 24, K.crash + 0.45, 'outExpo');
  const rimAt = lt => O.mix(C.tungsten, C.tungstenTired, tiredAt(lt));
  const crashFrame = lt => lt >= K.crash && lt < K.crash + 1 / 24;
  // after the crash the camera never quite settles: a 0.6 px drift at 0.4 Hz (and one 6 px jolt on the crash frame). Drifts step on
  // twos, in phase with the characters, so the rig's sprites and the plates' screen-aligned caches are reused.
  function shake(lt) {
    if (lt < K.crash) return { dx: 0, dy: 0 };
    const d = FL.shake(FL.twos(lt), 0.6, 0.4, 707); if (crashFrame(lt)) { d.dx += 5; d.dy -= 3.4; }
    return d;
  }
  function cam(c, base, lt) { const d = shake(lt); c.camera(Object.assign({}, base, { dx: (base.dx || 0) + d.dx, dy: (base.dy || 0) + d.dy })); }

  // ------------------------------------------------------------------ the room's state through the scene
  // the pour is at Deena's place, into her own glass: it fills, slows near the top, and goes past it. The five fresh glasses stay
  // in the middle of the table, empty, for the rest of the night.
  const POURED = lt => lt < K.pour0 + 0.1 ? 0.1 : 0.1 + 1.08 * seg(lt, K.pour0 + 0.1, K.pour1 - 0.05, u => u < 0.62 ? u / 0.62 * 0.84 : 0.84 + (u - 0.62) / 0.38 * 0.16);
  const GL = { scott: 0.14, kay: { fill: 0.45, lip: true }, marina: 0.2, christof: 0.04, deena: 0.1, angelo: 0.12 };
  const glassesAt = lt => Object.assign({}, GL, { deena: lt < K.pour0 ? 0.1 : POURED(lt) });
  function tstate(lt, extra) {
    const s = { lampTired: tiredAt(lt), kitchenLight: kitAt(lt), empty: ['kay', 'christof'], glasses: glassesAt(lt) };
    if (lt >= K.thump) { s.bottle = 1; s.fresh = 5; s.freshFill = 0; }
    return Object.assign(s, extra || {});
  }
  // the figures are drawn lean: one ink fill and one rim crescent cut by offsetting the same outline away from the light (the
  // doctrine's L4 rim: a crisp crescent on the lit side only, never an outline), then RIG's props, front ink and details. RIG.draw's
  // per-part rim canvases cost 20-40 ms a figure cold at these sizes; this costs a few path fills.
  const zoomOf = g => { const m = g.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; };
  function lean(c, F, o) {
    o = o || {}; const g = c.g, pth = R.path(F), L = o.light || LIGHT2, col = o.color || C.tungsten, fill = o.fill || C.ink, z = zoomOf(g);
    const bb = R.bbox(F), at = o.at || F.at || [bb.x + bb.w / 2, bb.y + bb.h * 0.35];
    let ux, uy; if (L.dx != null) { ux = L.dx; uy = L.dy; } else { ux = L.x - at[0]; uy = L.y - at[1]; } const n = Math.hypot(ux, uy) || 1; ux /= n; uy /= n;
    const w = (o.w || 3.4) / z;
    T.silFill(g, pth, fill, ux, uy, w, col, o.alpha);
    if (F.kind === 'top' && F.crown) { const cp = F._crownP || (F._crownP = F.crown.path(0.2, (F.seed || 21) + 3)); T.silFill(g, cp, fill, ux, uy, w * 1.2, col, o.alpha); }
    const po = { light: L, color: col, em: c.em, details: o.details || {}, scale: F.scale || 60 };
    if (F.props) F.props.forEach(fn => fn(g, po));
    if (F.front) T.silFill(g, F._frontP || (F._frontP = F.front.path(0.8, (F.seed || 21) + 7)), fill, ux, uy, w * 0.8, col, o.alpha);
    if (F.details && o.details !== false) O.fig.drawDetails(g, F, Object.assign({ light: L, rimColor: col }, o.details || {}));
    return F;
  }
  const put = (c, id, spec, o) => { const F = R.figure(id, spec); lean(c, F, o); return F; };
  // place a figure so its head lands on a point (the low view's anchors are heads)
  function atHead(id, spec, head) { const f0 = R.figure(id, Object.assign({}, spec, { x: 0, y: 0, anchor: 'hip' })); return Object.assign({}, spec, { anchor: 'hip', x: head[0] - f0.joints.head[0], y: head[1] - f0.joints.head[1] }); }
  // anyone in front of a light that blooms is cut out of the emissive buffer, so the halation never washes over the ink
  const occl = (c, pth) => { c.em.save(); c.em.fillStyle = '#000'; c.em.fill(pth); c.em.restore(); };
  // a plate drawn ONCE into the table set's screen-aligned layer cache (drift reuses it); the set's emissive goes to a sink there
  const SINK = O.makeCanvas(4, 4).getContext('2d');
  const layer = (c, key, fn) => T.cacheLayer(c, 'Q07:' + key, q => fn(Object.assign({}, c, { g: q, em: SINK })));
  // screen point -> world point under a base cam (for things composed on the frame: foreground masses, the slab)
  const wpt = (cb, sx, sy) => [cb.x + (sx - W / 2) / cb.zoom, cb.y + (sy - H / 2) / cb.zoom];
  const cigOff = { cig: false };   // Angelo's ear-cigarette reads as a bar this close; he is without it all scene

  // ------------------------------------------------------------------ 'two': the profile set-up, and the singles cut from it
  // Screen-left people face right (toward Scott); Scott sits screen-right facing left, toward the kitchen's far hood sliver.
  const SEATY = 1074, FLOOR2 = 1338, L2 = T.lights.two, LIGHT2 = { x: L2.x, y: L2.y }, LAMP2 = T.anchors.two.lamp;
  const SLIVER = [238, 520];   // the far kitchen doorway in the two view (world)
  const SIDE = { L: { x: 520, facing: 1 }, R: { x: 1405, facing: -1 } };
  const TOP2 = () => memo('top2', () => S().ellipse(960, 724, 960, 124, 0).path(1.2, 54));   // the set's table top (same cut)
  const OFFTABLE = () => memo('offtable', () => { const p = new Path2D(); p.rect(-600, -600, W + 1200, H + 1200); p.addPath(TOP2()); return p; });
  const FARGL = { marina: [560, 636, 58], christof: [880, 626, 56], deena: [1050, 628, 56], angelo: [1380, 638, 58] };
  function twoState(lt, o) {
    return Object.assign({ lampTired: tiredAt(lt), kitchenLight: kitAt(lt), piles: true, behind: [], glasses: { kay: GL.kay, scott: GL.scott } }, o || {});
  }
  // the far people, hard-edged: darker posterised busts at reduced contrast, each one identifiable by the hair (Marina's bob,
  // Deena's ponytail, Angelo's quiff); cut behind the table top. Their glasses go back on over them.
  const FAR = T.anchors.two.behind;
  const crowdPath = id => memo('crowd:' + id, () => { const f = FAR[id]; return O.fig.bust(id, { x: f[0], y: f[1], scale: 62, tilt: f[2] }).shape.path(0.9, 40 + id.length); });
  function crowd(c, lt, who, gl) {
    const g = c.g, p = T.pal(tiredAt(lt));
    g.save(); g.clip(OFFTABLE(), 'evenodd');
    who.forEach(id => { const f = FAR[id]; const dx = LAMP2[0] - f[0], dy = LAMP2[1] - f[1], n = Math.hypot(dx, dy);
      T.silFill(g, crowdPath(id), '#15100D', dx / n, dy / n, 2.6, O.mix(p.mid, C.ink, 0.25), 0.8); });
    g.restore();
    who.forEach(id => { const sp = FARGL[id]; const f = gl && gl[id] != null ? gl[id] : GL[id]; if (sp && f != null) T.glassSide(c, sp[0], sp[1], sp[2], { fill: typeof f === 'object' ? f.fill : f, lipSide: -1 }, { lampTired: tiredAt(lt) }, LAMP2); });
  }
  // Kay's empty chair in the wide two-shots, at her place
  function emptyChair(c, lt, x, facing) {
    const ch = memo('chair2:' + x, () => R.chair(x, FLOOR2, 158, { facing }).shape.path(0.7, 7));
    T.silFill(c.g, ch, C.ink, 0.45, -0.9, 3, rimAt(lt), 0.9);
  }
  const sitSpec = (id, side, lt, o) => Object.assign({ seat: [SIDE[side].x, SEATY], scale: 152, facing: SIDE[side].facing, pose: 'sit', t: lt }, id === 'angelo' ? cigOff : {}, o || {});
  // wide: the rim breaks into crescents on the lit side only (a narrow wedge); close: near-uniform rim, no falloff
  const drawTwoFig = (c, id, spec, lt, close, o) => { const F = put(c, id, spec, Object.assign({ light: LIGHT2, color: rimAt(lt), w: close ? 5.5 : 4, details: { ringColor: '#D4AF5E' } }, o || {})); occl(c, R.path(F)); return F; };
  const poolEm = c => { c.em.save(); c.em.globalAlpha = 0.3; c.em.fillStyle = T.pal(1).hot; c.em.beginPath(); c.em.ellipse(960, 718, 365, 48, 0, 0, 7); c.em.fill(); c.em.restore(); };

  // over the shoulder: the listener as a big ink mass at the frame's edge (screen space), rimmed only on the lamp side
  function ots(c, lt, who, head, scale, facing, o) {
    o = o || {}; c.camera({ x: W / 2, y: H / 2, zoom: 1 });
    const sp = Object.assign({ anchor: 'hip', x: 0, y: 0, scale, facing, pose: 'sit', t: lt, lean: 0.1, head: 0.05 }, who === 'angelo' ? cigOff : {}, o.spec || {});
    const F = R.figure(who, sp); const f2 = R.figure(who, Object.assign({}, sp, { x: head[0] - F.joints.head[0], y: head[1] - F.joints.head[1] }));
    lean(c, f2, { light: LIGHT2.x < head[0] ? { dx: -1, dy: -0.6 } : { dx: 1, dy: -0.6 }, color: O.mix(rimAt(lt), C.ink, 0.35), w: 3, fill: '#090706' });
    occl(c, R.path(f2));
  }

  // ---- the plates: what lies behind each speaker in the shot/reverse
  // SCOTT: across from him, Kay's place: her lip-marked glass on the table, her empty chair as a dark foreground mass at the left
  // edge. (The final close-up adds the hood-yellow slab on the far wall: see slabLayer.)
  function kayPlace(c2, cb) {
    const g = c2.g;
    // her glass, a touch nearer than its wide-shot spot so it sits in the frame
    T.glassSide(c2, 905, 752, 106, { fill: 0.45, lip: true, lipSide: 1 }, { lampTired: 1 }, LAMP2);
    // her chair, seen from behind as a dark foreground mass at the left edge: two raked posts, a bowed top rail, two slats
    const k = 1 / cb.zoom, P = (sx, sy) => wpt(cb, sx, sy);
    const back = S();
    const post = (x0, x1) => back.poly([P(x0, 1120), P(x0 + 34, 1120), P(x1 + 30, 510), P(x1, 506)]);
    post(10, 36); post(270, 252);
    back.add(S().M(...P(20, 492)).Q(...P(156, 458), ...P(296, 490)).L(...P(292, 556)).Q(...P(154, 530), ...P(24, 560)).Z());
    [[670, 32], [810, 28]].forEach(([y, hh]) => back.poly([P(30, y), P(276, y - 4), P(274, y + hh), P(32, y + hh + 4)]));
    T.silFill(g, back.path(0.6, 17), '#0A0807', 0.45, -0.9, 4 * k, O.mix(C.tungstenTired, C.ink, 0.1), 0.9);
  }
  // MARINA: the hall door in the far wall behind her: casing, the dark hall, and right down it the bathroom's line of light
  function hallDoor(c2) {
    const g = c2.g, p = T.pal(1);
    g.save(); g.clip(OFFTABLE(), 'evenodd');
    const x0 = 250, x1 = 400, y0 = 236, y1 = 700;
    g.fillStyle = '#251A13'; g.fill(memo('hd:casing', () => S().rect(x0 - 18, y0 - 18, x1 - x0 + 36, y1 - y0 + 18).path(0.6, 301)));   // the trim
    g.fillStyle = O.mix(p.mid, C.ink, 0.3); g.fill(memo('hd:rimR', () => S().rect(x1 + 14, y0 - 18, 4, y1 - y0 + 18).path(0.3, 302)));   // its edge toward the lamp
    g.fillStyle = '#050403'; g.fill(memo('hd:open', () => S().rect(x0, y0, x1 - x0, y1 - y0).path(0.4, 304)));
    // the hall beyond, running away: the boards a shade up from black, converging; right down it the shut bathroom door's line of
    // light on the left wall, and its fan on the boards
    g.fillStyle = '#120D0A'; g.fill(memo('hd:floor', () => S().poly([[x0, y1], [x1, y1], [352, 556], [306, 556]]).path(0.3, 305)));
    g.fillStyle = O.mix(C.ink, C.underDoor, 0.3); g.fill(memo('hd:fan', () => S().poly([[x0 + 2, 590], [x0 + 40, 578], [x0 + 70, 604], [x0 + 2, 640]]).path(0.8, 306)));
    g.fillStyle = C.underDoor; g.fill(memo('hd:line', () => S().poly([[x0 + 2, 584], [x0 + 42, 572], [x0 + 42, 577], [x0 + 2, 590]]).path(0.1, 307)));
    g.restore();
  }
  const PLATE = {
    scott: { side: 'R', cam: { x: 1190, y: 556, zoom: 2.0 }, st: { kitchenLight: 0, glasses: { scott: GL.scott } }, extra: kayPlace },
    deena: { side: 'L', cam: { x: 600, y: 600, zoom: 2.0 }, st: { kitchenLight: 1, glasses: { kay: 1.18 } } },
    marina: { side: 'L', cam: { x: 640, y: 590, zoom: 2.0 }, st: { kitchenLight: 0, glasses: { kay: GL.marina } }, extra: hallDoor,
      em: c => { c.em.save(); c.em.fillStyle = C.underDoor; c.em.globalAlpha = 0.8; c.em.fillRect(252, 568, 44, 14); c.em.restore(); } },
    marinaHood: { side: 'L', cam: { x: 600, y: 590, zoom: 2.0 }, st: { kitchenLight: 1, glasses: { kay: GL.marina } } },
  };
  // a single: one person close, their own plate behind them. camBase may override the plate's framing (sizes vary); o.ots adds
  // the listener's shoulder; o.over(c) draws after the figure (world coords).
  function single(c, lt, who, plate, spec, o) {
    o = o || {}; const P = PLATE[plate]; const cb = o.cam || P.cam; const pan = o.pan || [0, 0]; cam(c, Object.assign({}, cb, { x: cb.x + pan[0], y: cb.y + pan[1] }), lt);
    const st = Object.assign(twoState(lt), P.st, o.state || {});
    const key = plate + ':' + [cb.x, cb.y, cb.zoom].join(',') + (o.key || '');
    layer(c, key, c2 => { T.back(c2, lt, st, 'two'); if (P.extra) P.extra(c2, cb); if (o.extra) o.extra(c2, cb); });
    poolEm(c); if (P.em) P.em(c);
    if (o.under) o.under(c);
    const F = drawTwoFig(c, who, sitSpec(who, P.side, lt, spec), lt, true, o.draw);
    if (o.over) o.over(c, F);
    if (o.ots) ots(c, lt, o.ots, o.otsHead || [1930, 470], o.otsScale || 330, P.side === 'L' ? -1 : 1, o.otsO);
    return F;
  }
  const EYE_R = [1500, 560], EYE_L = [300, 548];   // where screen-left people look (Scott) and where Scott looks (them)

  // ------------------------------------------------------------------ the low view bodies (F06 set-up)
  const LOW = T.anchors.low, LS = LOW.seats, LIGHTL = { x: T.lights.low.x, y: T.lights.low.y };
  const KDOOR = [(LOW.kitchenDoor.x0 + LOW.kitchenDoor.x1) / 2, 360];
  const MARINA_LOW = [1795, 486];   // near right (10:00), cheated in so her profile edge is in the frame, as in F06
  function lowBodies(c, lt, o) {
    o = o || {}; const s = o.s; const rim = rimAt(lt); const st = o.startle || 0; const lk = o.look || {}; const fl = o.flat ? { falloff: false } : {};
    T.back(c, lt, s, 'low', { part: 'wall' });
    // Angelo, far left, in profile facing right
    if (o.angelo !== false) {
      const an = LS.angelo, ao = o.angeloSpec || {};
      put(c, 'angelo', atHead('angelo', Object.assign({ scale: an.scale, facing: 1, pose: 'sit', seat: [0, 0], t: lt, lean: 0.34 - 0.22 * st, neck: 0.1, head: 0.12 - 0.3 * st, look: lk.angelo,
        armN: { a: 0.5 + 0.35 * st, b: 1.0 }, armF: { a: 0.4, b: 1.0 } }, cigOff, ao), [an.head[0] + (o.angeloDx || 0), an.head[1] - 16 * st + (o.angeloDy || 0)]), Object.assign({ light: LIGHTL, color: rim, w: 4.2 }, fl, o.angeloDraw || {}));
    }
    // Scott, far centre: front-on, or a profile when he turns his head
    const sc = LS.scott; const sy = (o.scottY || 0) - 12 * st;
    if (o.scottProfile) {
      put(c, 'scott', atHead('scott', { scale: sc.scale * 1.02, facing: o.scottProfile, pose: 'sit', seat: [0, 0], t: lt, lean: 0.1, neck: 0.06, head: o.scottHead == null ? 0.05 : o.scottHead, look: lk.scott,
        armN: { a: 0.45, b: 1.0 } }, [sc.head[0], sc.head[1] + sy]), Object.assign({ light: LIGHTL, color: rim, w: 4.2 }, fl));
    } else {
      const b = R.bust('scott', Object.assign({ x: sc.head[0], y: sc.head[1] + sy, scale: sc.scale, tilt: o.scottTilt || 0, t: lt }, o.bust || {}));
      lean(c, b, { light: LIGHTL, color: rim, w: 4.2 });
      if (o.afterScott) o.afterScott(c, b);
    }
    T.back(c, lt, s, 'low', { part: 'table' });
    if (o.mid) o.mid(c);
    // near left: Deena, big, in profile facing right, her forearm on the table's edge
    if (o.deena !== false) {
      const de = LS.deena;
      put(c, 'deena', atHead('deena', { scale: de.scale, facing: 1, pose: 'sit', seat: [0, 0], t: lt, lean: 0.28 - 0.18 * st, neck: 0.08, head: (o.deenaHead == null ? 0.08 : o.deenaHead) - 0.22 * st, look: lk.deena,
        armN: { a: 0.3 + 0.25 * st, b: 0.7 + 0.3 * st, hand: 'relaxed' }, armF: { a: 0.22, b: 0.6, hand: 'relaxed' } }, [de.head[0] + 50 + (o.nearIn || 0), de.head[1] + 40 - 20 * st]), Object.assign({ light: LIGHTL, color: rim, w: 5 }, fl));
    }
    // near right: Marina, facing left into the table, the edge of her bob and profile in the frame
    if (o.marina !== false) {
      put(c, 'marina', atHead('marina', { scale: 380, facing: -1, pose: 'sit', seat: [0, 0], t: lt, lean: 0.22 - 0.16 * st, neck: 0.06, head: (o.marinaHead == null ? 0.1 : o.marinaHead) - 0.2 * st, look: lk.marina,
        armN: { a: 0.35 + 0.2 * st, b: 0.9, hand: 'relaxed' }, armF: { a: 0.3, b: 0.8, hand: 'relaxed' } }, [MARINA_LOW[0] - (o.nearIn || 0), MARINA_LOW[1] - 18 * st]), Object.assign({ light: LIGHTL, color: rim, w: 5, details: { ringColor: '#D4AF5E' } }, fl));
    }
    T.front(c, lt, Object.assign({}, s, { dust: false }), 'low');
  }

  // ------------------------------------------------------------------ the top view bodies
  const TOPA = T.anchors.top; const TL = { x: T.lights.top.x, y: T.lights.top.y };
  function topFig(c, lt, id, s, o) {
    const st = T.top.seatAt(id, s); if (!st) return null;
    const F = R.top(id, Object.assign({ x: st.x, y: st.y, dir: st.dir, scale: TOPA.figScale, hands: st.hands, handPose: ['flat', 'flat'], t: lt, foreshorten: true }, id === 'angelo' ? cigOff : {}, o || {}));
    T.castTop(c, F._p || (F._p = R.path(F)), 0.45); lean(c, F, { light: TL, color: rimAt(lt), w: 3 });
    return F;
  }

  // ------------------------------------------------------------------ hands in the inserts
  // Scott's pointing finger on a forearm from the right (kayglass), rimmed from the lamp above
  function fingerIn(c, lt, tip) {
    const hs = O.fig.hand('point').transform([-250, -36, -36, 250, tip[0] + 250, tip[1] + 36]);
    const pth = hs.add(S().capsule(tip[0] + 250, tip[1] + 36, 58, 2300, tip[1] + 330, 120)).path(0.7, 3);
    T.silFill(c.g, pth, C.ink, -0.25, -1, 3, rimAt(lt));
  }
  // a hand round the bottle's body, the forearm running off frame toward `from`
  function bottleHand(c, B, from, rimCol) {
    const a = Math.atan2(B.up[1], B.up[0]) + Math.PI / 2; const hk = 150, hx = B.grip[0] - Math.cos(a) * 60, hy = B.grip[1] - Math.sin(a) * 60;
    const hs = O.fig.hand('hold', { curl: 0.6 }).transform([Math.cos(a) * hk, Math.sin(a) * hk, -Math.sin(a) * hk, Math.cos(a) * hk, hx, hy]);
    T.silFill(c.g, S().add(hs).capsule(hx, hy, 36, from[0], from[1], 74).path(0.7, 4), C.ink, -0.3, -1, 3, rimCol || T.pal(1).hot);
  }

  // ------------------------------------------------------------------ Kay's glass, big (the S03 goblet of the wide shots, seated rim)
  // Drawn over the bottle view's bare insert base (no fresh glasses, no bottle, no Kay glass), so it is the same design as everywhere
  // else in the scene. The silhouette's top IS the rim's far arc; the near arc is a line across the glass; the print follows it.
  const KG = { x: 820, y: 905, h: 610 };
  const goblet = (x, y, s) => memo('goblet:' + [x, y, s], () => {
    const rx = 0.205 * s, ry = 0.034 * s, ty = y - 0.985 * s;
    const bowl = S().M(x - rx, ty); for (let i = 1; i <= 24; i++) { const a = Math.PI + Math.PI * i / 24; bowl.L(x + rx * Math.cos(a), ty + ry * Math.sin(a)); }
    bowl.C(x + rx, y - s * 0.57, x + s * 0.11, y - s * 0.47, x, y - s * 0.465).C(x - s * 0.11, y - s * 0.47, x - rx, y - s * 0.57, x - rx, ty).Z();
    const stem = S().M(x - s * 0.03, y - s * 0.47).L(x + s * 0.03, y - s * 0.47).L(x + s * 0.022, y - s * 0.06).Q(x + s * 0.17, y - s * 0.03, x + s * 0.19, y).L(x - s * 0.19, y).Q(x - s * 0.17, y - s * 0.03, x - s * 0.022, y - s * 0.06).Z();
    return { bowl: bowl.path(0, 1), stem: stem.add(S().ellipse(x, y - 0.006 * s, 0.19 * s, 0.022 * s, 0)).path(0.4, 82), rim: [x, ty, rx, ry] };
  });
  function bigKayGlass(c, lt, o) {
    const g = c.g, { x, y, h } = KG, p = T.pal(o.tired || 0), sh = goblet(x, y, h); const ux = 0.15, uy = -1; const tapT = o.tapT;
    g.fillStyle = O.rgba(C.ink, 0.55); g.beginPath(); g.ellipse(x - 0.08 * h, y + 0.02 * h, 0.32 * h, 0.05 * h, -0.04, 0, 7); g.fill();
    g.fillStyle = O.rgba(O.mix(C.wine, p.hot, 0.4), 0.5); g.beginPath(); g.ellipse(x - 0.1 * h, y + 0.03 * h, 0.12 * h, 0.02 * h, -0.04, 0, 7); g.fill();
    T.silFill(g, sh.stem, C.ink, ux, uy, Math.max(2, h * 0.005), p.hot);
    g.save(); g.clip(sh.bowl);
    g.fillStyle = O.rgba(C.cardPaper, 0.05); g.fill(sh.bowl);
    if (o.kitchen > 0) { g.globalAlpha = 0.4 * o.kitchen; g.fillStyle = C.hoodMid; g.fillRect(x + 0.1 * h, y - 0.95 * h, 0.06 * h, 0.42 * h); g.globalAlpha = 1; }   // the doorway, seen through it
    const f = 0.45, top = y - h * (0.47 + 0.5 * f), rw = 0.2 * h;
    g.fillStyle = C.blood; g.fillRect(x - h, top, 2 * h, h);
    g.fillStyle = C.wine; g.fillRect(x - h, top, 2 * h, 0.1 * h);
    g.fillStyle = O.mix(C.wine, p.hot, 0.18); g.beginPath(); g.ellipse(x, top, rw, rw * 0.16, 0, 0, 7); g.fill();
    g.strokeStyle = O.rgba(p.hot, 0.85); g.lineWidth = 2.2; g.beginPath(); g.ellipse(x, top, rw - 2, rw * 0.16 - 1, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    if (tapT != null && tapT >= 0 && tapT < 1.6) {   // the tap ripples the surface
      for (let i = 0; i < 3; i++) { const u = tapT / 1.6 - i * 0.12; if (u <= 0 || u >= 1) continue; const rr = rw * (0.15 + 0.85 * u); g.strokeStyle = O.rgba(O.mix(C.wine, p.hot, 0.6), 0.7 * (1 - u)); g.lineWidth = 1.8; g.beginPath(); g.ellipse(x + rw * 0.55 * (1 - u), top, rr * 0.6, rr * 0.1, 0, 0, 7); g.stroke(); }
    }
    g.save(); g.translate(-ux * 3, -uy * 3); g.lineWidth = 5; g.strokeStyle = O.rgba(C.ink, 0.6); g.stroke(sh.bowl); g.restore();
    g.restore();
    const [rx0, ry0, rrx, rry] = sh.rim; const wob = tapT != null && tapT >= 0 && tapT < 0.5 ? Math.sin(tapT * 90) * (0.5 - tapT) * 2.2 : 0;
    g.lineWidth = 2; g.strokeStyle = O.rgba(C.cardPaper, 0.32); g.stroke(sh.bowl);
    g.strokeStyle = O.rgba(C.cardPaper, 0.55); g.lineWidth = 2.2; g.beginPath(); g.ellipse(rx0, ry0, rrx + wob, rry, 0, 0, Math.PI); g.stroke();   // the near arc
    g.strokeStyle = O.rgba(C.cardPaper, 0.9); g.lineWidth = 3; g.beginPath(); g.ellipse(rx0, ry0, rrx + wob, rry, 0, Math.PI * 1.05, Math.PI * 1.45); g.stroke();
    const sx = x - 0.16 * h; g.fillStyle = O.rgba(C.cardPaper, 0.5); g.fill(memo('gob:spec', () => S().M(sx, y - 0.93 * h).Q(sx - 0.03 * h, y - 0.8 * h, sx - 0.01 * h, y - 0.62 * h).L(sx + 0.004 * h, y - 0.63 * h).Q(sx - 0.015 * h, y - 0.8 * h, sx + 0.012 * h, y - 0.93 * h).Z().path(0.2, 5)));
    // the lip print, pressed on the outside under the rim, on its near arc: upper and lower lip, a cupid's-bow dip, smudged, creased
    const pc = Math.PI / 2 - 0.33, span = 0.4, k = h / 610; const Rr = (ph, d) => [rx0 + rrx * Math.cos(ph), ry0 + rry * Math.sin(ph) + d * k];
    const print = memo('gob:print', () => { const N = 22, up = [], lo = [];
      for (let i = 0; i <= N; i++) { const u = i / N, ph = pc - span + 2 * span * u; const bell = Math.pow(Math.sin(Math.PI * u), 0.55), bow = 1 - 0.32 * Math.exp(-Math.pow((u - 0.5) / 0.07, 2));
        up.push([ph, 3.4 + 9.5 * bell * bow]); lo.push([ph, 3.4 + 9.5 * bell * bow + 2.2, 3.4 + 9.5 * bell * bow + 2.2 + 12 * Math.pow(bell, 0.8)]); }
      const band = (list, i0, i1, top, bot) => { const pts = []; for (let i = i0; i <= i1; i++) pts.push(Rr(list[i][0], top(list[i]))); for (let i = i1; i >= i0; i--) pts.push(Rr(list[i][0], bot(list[i]))); return pts; };
      return S().poly(band(up, 3, N, () => 3, q => q[1])).poly(band(lo, 0, N - 2, q => q[1], q => q[2])).path(0.9, 6); });
    g.save(); g.translate(0.012 * h, 0.009 * h); g.globalAlpha = 0.2; g.fillStyle = '#D9262F'; g.fill(print); g.restore();
    g.save(); g.globalAlpha = 0.92; g.fillStyle = '#D9262F'; g.fill(print); g.restore();
    const lc = Rr(pc, 12); c.em.save(); c.em.fillStyle = '#D9262F'; c.em.globalAlpha = 0.4; c.em.beginPath(); c.em.ellipse(lc[0], lc[1], 48 * k, 16 * k, 0, 0, 7); c.em.fill(); c.em.restore();
  }
  // the bottle view's bare insert base (table in the pool, the far doorway), cached; its doorway's bloom re-emitted live
  function insertBase(c, lt, tired, kit, cb) {
    const k = Math.round(kit * 20) / 20;
    layer(c, 'ins:' + tired + ':' + k + ':' + cb.zoom, c2 => T.back(c2, lt, { lampTired: tired, kitchenLight: k, fresh: 0, bottle: 0, kayGlass: false }, 'bottle'));
    if (k > 0) { c.em.save(); c.em.globalAlpha = 0.45 * k; c.em.fillStyle = C.hood; c.em.fillRect(1608, 183, 118, 403); c.em.restore(); }
  }
  function kayGlassShot(c, lt, cb, o) {
    cam(c, cb, lt); insertBase(c, lt, o.tired, o.kitchen, cb);
    bigKayGlass(c, lt, o);
  }

  // ------------------------------------------------------------------ the bottle insert: five fresh glasses, drawn here so the
  // count runs toward the gap side (screen left, by the bottle: in the top view the bottle stands behind Scott on the gap side)
  const BOT = T.anchors.bottle, GH = BOT.glassH;
  function freshRow(c, lt, o) {
    const g = c.g, st = { lampTired: 1, kitchenLight: kitAt(lt) }, light = [900, -300];
    // Kay's glass, apart and untouched
    g.fillStyle = O.rgba(C.ink, 0.5); g.beginPath(); g.ellipse(BOT.kay[0] - 26, BOT.kay[1] + 9, BOT.kay[2] * 0.3, BOT.kay[2] * 0.05, 0, 0, 7); g.fill();
    T.glassSide(c, BOT.kay[0], BOT.kay[1], BOT.kay[2], { fill: 0.45, lip: true, lipSide: -1 }, st, light);
    BOT.fresh.forEach(([x, y]) => { g.fillStyle = O.rgba(C.ink, 0.5); g.beginPath(); g.ellipse(x - 30, y + 10, GH * 0.3, GH * 0.05, 0, 0, 7); g.fill(); T.glassSide(c, x, y, GH, { fill: 0 }, st, light); });
  }
  function bottleShot(c, lt, o) {
    const cb = o.cam || { x: 960, y: 540, zoom: 1 }; cam(c, cb, lt); insertBase(c, lt, 1, 1, cb);
    freshRow(c, lt, o);
    const b = Object.assign({ x: 250, y: 905, h: 560, rot: 0 }, o.bottle || {}), light = [900, -300];
    if (!b.rot) { c.g.fillStyle = O.rgba(C.ink, 0.55); c.g.beginPath(); c.g.ellipse(b.x - 40, b.y + 12, b.h * 0.24, b.h * 0.035, 0, 0, 7); c.g.fill(); }
    const B = T.bottleSide(c, b.x, b.y, b.h, b.rot, { lampTired: 1, kitchenLight: 1 }, light);
    if (o.hand) bottleHand(c, B, o.hand);
    if (o.over) o.over(c);
  }
  // the count: a glint runs along the five, 125 ms apart, from Kay's side to the gap side; the fifth lingers by the bottle
  function countGlints(c, lt) {
    const g = c.g;
    for (let i = 0; i < 5; i++) {
      const t0 = K.count + i * 0.125, u = (lt - t0) / (i === 4 ? 1.3 : 0.5); if (u < 0 || u > 1) continue;
      const P = BOT.fresh[4 - i]; const a = Math.pow(1 - u, i === 4 ? 0.8 : 1.4), x = P[0] - GH * 0.13, y = P[1] - GH * 0.94, r = 30 * (0.55 + 0.45 * (1 - u)) * (i === 4 ? 1.25 : 1);
      g.save(); g.globalAlpha = a; g.fillStyle = C.cardPaper;
      g.fill(S().M(x, y - r).Q(x + 3, y - 3, x + r, y).Q(x + 3, y + 3, x, y + r).Q(x - 3, y + 3, x - r, y).Q(x - 3, y - 3, x, y - r).Z().path(0, 1)); g.restore();
      c.em.save(); c.em.globalAlpha = 0.9 * a; c.em.fillStyle = C.cardPaper; c.em.beginPath(); c.em.arc(x, y, 34, 0, 7); c.em.fill(); c.em.restore();
    }
  }

  // ------------------------------------------------------------------ the pour, at Deena's place: her glass, her hand, her card
  const DG = { x: 900, y: 880, h: 340 };
  function pourShot(c, lt) {
    const g = c.g, cb = { x: 900, y: 560, zoom: 1.06 }; cam(c, cb, lt); insertBase(c, lt, 1, 1, cb);
    const p = T.pal(1), lv = POURED(lt), light = [900, -300];
    // her card, face down by her hand
    g.save(); g.translate(560, 948); g.scale(1, 0.26); g.rotate(-0.18); g.fillStyle = C.cardPaper; g.fillRect(-60, -84, 120, 168); g.fillStyle = O.mix(C.cardBlue, C.ink, 0.25); g.fillRect(-52, -76, 104, 152); g.restore();
    // the wine on the table: past the rim it runs down the bowl and spreads toward her fingers
    const over = clamp((lv - 1) / 0.18, 0, 1), spread = seg(lt, K.plenty + 0.3, K.pour1 + 0.6, E.outCubic);
    if (over > 0 || spread > 0) { g.fillStyle = C.wine; g.beginPath(); g.ellipse(DG.x - 40 - 120 * spread, DG.y + 6, 60 + 240 * spread, 10 + 22 * spread, 0, 0, 7); g.fill();
      g.fillStyle = O.rgba(p.hot, 0.5); g.beginPath(); g.ellipse(DG.x - 60 - 120 * spread, DG.y + 1, 30 + 140 * spread, 3, 0, Math.PI, Math.PI * 2); g.fill(); }
    T.glassSide(c, DG.x, DG.y, DG.h, { fill: Math.min(lv, 1) }, { lampTired: 1 }, light);
    if (over > 0) { const x = DG.x, y = DG.y, s = DG.h; g.fillStyle = C.wine; g.fill(S().M(x - s * 0.2, y - s * 0.97).Q(x - s * 0.25, y - s * 0.6, x - s * 0.07, y - s * 0.42).L(x - s * 0.05, y - s * 0.4).Q(x - s * 0.19, y - s * 0.62, x - s * 0.17, y - s * 0.97).Z().path(0.4, 7));
      g.fillRect(x - s * 0.03, y - s * 0.42, s * 0.03 * over, s * 0.36); }
    // her hand on the table at left: flat, rimmed; the fingers lift on 'That's plenty.' and the hand snaps back from the spreading wine
    const lift = R.key('deena', lt, [[K.plenty - 0.05, 0], [K.plenty + 0.15, 1], [K.pour1 - 0.4, 1], [K.pour1 - 0.2, 0.4]]), back = R.key('deena', lt, [[K.pour1 - 0.35, 0], [K.pour1 - 0.15, 1]]);
    const wx = 300 - 150 * back, wy = 905, hk = 230; const ang = -0.06 - 0.22 * lift;
    const hs = O.fig.hand('relaxed', { curl: 0.15 + 0.1 * lift }).transform([Math.cos(ang) * hk, Math.sin(ang) * hk * 0.55, -Math.sin(ang) * hk, Math.cos(ang) * hk * 0.55, wx, wy]);
    T.silFill(g, S().add(hs).capsule(wx, wy, 34, wx - 600, wy + 70, 60).path(0.6, 21), C.ink, 0.2, -1, 3, p.hot);
    // Scott's hand on the bottle: held upright at right, the cork pops, it tips over her glass, pours past the top, lifts away
    const tip = seg(lt, K.pop + 0.1, K.pour0, E.inOutCubic), up = seg(lt, K.pour1, K.pour1 + 0.4, E.inOutCubic);
    const H0 = 560, rot = tip < 1 ? lerp(0, -2.05, tip) : lerp(-2.05, -0.55, up);
    const mouth = tip < 1 ? [lerp(1380, 912, tip), lerp(330, 455, tip) - 140 * Math.sin(Math.PI * tip)] : [lerp(912, 1120, up), lerp(455, 300, up)];
    const foot = [mouth[0] - Math.sin(rot) * H0, mouth[1] + Math.cos(rot) * H0];
    const B = T.bottleSide(c, foot[0], foot[1], H0, rot, { lampTired: 1, kitchenLight: 1 }, light);
    bottleHand(c, B, [B.grip[0] + 520, B.grip[1] - 520]);
    if (lt > K.pour0 && lt < K.pour1 + 0.05) {   // the stream, from the mouth into the glass
      const sy = DG.y - DG.h * (0.47 + 0.5 * Math.min(lv, 1)), m = B.mouth, wv = 7, gx = DG.x + 4;
      g.fillStyle = C.wine; g.fill(S().M(m[0] - wv, m[1]).Q(lerp(m[0], gx, 0.6) - wv, lerp(m[1], sy, 0.15), gx - wv * 0.5, sy).L(gx + wv * 0.5, sy).Q(lerp(m[0], gx, 0.6) + wv, lerp(m[1], sy, 0.15), m[0] + wv, m[1]).Z().path(0.3, 8));
      g.strokeStyle = O.rgba(p.hot, 0.7); g.lineWidth = 1.6; g.beginPath(); g.moveTo(m[0] - wv, m[1]); g.quadraticCurveTo(lerp(m[0], gx, 0.6) - wv, lerp(m[1], sy, 0.15), gx - wv * 0.5, sy); g.stroke();
    }
    if (lt >= K.pop && lt < K.pop + 0.55) { const u = (lt - K.pop) / 0.55; const x = 1380 + 140 * u, y = 300 - 380 * u + 480 * u * u; g.save(); g.translate(x, y); g.rotate(u * 9); g.fillStyle = '#7A5A3A'; g.fillRect(-10, -18, 20, 36); g.restore(); }
    // two drips off the bottle's lip as it lifts away
    [K.pour1 + 0.05, K.pour1 + 0.4].forEach((t0, i) => { const u = (lt - t0) / 0.28; if (u < 0 || u > 1) return; const m0 = [lerp(912, 1120, seg(t0, K.pour1, K.pour1 + 0.4, E.inOutCubic)), lerp(455, 300, seg(t0, K.pour1, K.pour1 + 0.4, E.inOutCubic))];
      g.fillStyle = C.wine; g.beginPath(); g.ellipse(m0[0], m0[1] + 520 * u * u, 5, 9, 0, 0, 7); g.fill(); });
  }

  // ------------------------------------------------------------------ the foot insert (local: no set has a floor-level view)
  // His socked heel has come down on the toe of her pump. Low on the boards under the table, in the tired lamp's pool. Deena: a
  // cropped wide-leg trouser, a slim bare ankle, a block-heeled pump with an ankle strap. Scott: straight trousers breaking over a
  // sock (a lighter value, a ribbed cuff, the ankle's bend, a rounded heel-less foot).
  const FOOT = (() => {
    // her pump, toe to the left; sole on y = 0 (local px); the block heel at the back; the arch lifted between ball and heel
    const shoe = S().M(4, -10).C(8, -40, 40, -66, 112, -78).C(160, -84, 210, -88, 262, -98).C(300, -104, 330, -116, 348, -130)
      .C(380, -150, 420, -162, 452, -164).C(470, -150, 476, -100, 474, -62).L(474, 0).L(408, 0).L(404, -48)
      .C(360, -46, 300, -36, 240, -14).C(200, -2, 170, 0, 130, 0).C(60, 2, 10, 2, 4, -10).Z();
    const ankle = S().M(350, -132).C(360, -220, 372, -280, 380, -340).L(452, -340).C(452, -280, 456, -220, 456, -160).Z();   // slim, bare
    const strap = S().M(352, -176).L(458, -182).L(458, -164).L(350, -158).Z();
    const hem = S().M(236, -330).C(270, -520, 318, -820, 330, -1200).L(540, -1200).C(566, -820, 616, -520, 660, -326).C(570, -306, 350, -308, 236, -330).Z();   // wide leg, cropped
    // his sock foot, toes to the left; the heel (round, no shoe) at the origin rests on her toe box; the sole slopes to the boards
    const foot = S().M(46, -30).C(52, -84, 22, -134, -46, -146).C(-124, -140, -230, -108, -330, -80).C(-410, -64, -470, -62, -500, -40)
      .C(-528, -18, -512, 10, -478, 10).C(-400, 16, -262, 8, -172, -2).C(-100, -8, -34, 4, 10, 6).C(40, 6, 54, -8, 46, -30).Z();
    const shin = S().M(-82, -132).C(-80, -200, -70, -260, -64, -330).L(112, -330).C(108, -260, 90, -170, 40, -60).Z();   // the ankle's bend
    const cuff = S().M(-66, -262).L(108, -268).L(112, -318).L(-64, -312).Z();
    const trouser = S().M(-104, -296).C(-40, -312, 80, -318, 150, -306).L(190, -1200).L(-120, -1200).Z();
    return { shoe, ankle, strap, hem, foot, shin, cuff, trouser };
  })();
  function footInsert(c, lt, st) {
    const g = c.g; cam(c, { x: 930 + 5 * st, y: 640, zoom: 1.32 }, lt);
    layer(c, 'floor', c2 => { const q = c2.g;
      q.fillStyle = C.ink; q.fillRect(-200, -200, W + 400, H + 400);
      // the boards in the tired pool: three posterised bands, their seams running away from us
      q.save(); q.beginPath(); q.rect(-50, 330, W + 100, H); q.clip();
      q.fillStyle = '#120D0A'; q.fillRect(-50, 330, W + 100, H);
      O.lightPool(q, 900, 830, [{ r: 1500, color: O.mix(C.ink, C.tungstenTired, 0.22) }, { r: 980, color: O.mix(C.ink, C.tungstenTired, 0.4) }, { r: 560, color: O.mix(C.ink, C.tungstenTired, 0.6) }], { sy: 0.32, seed: 71, rough: 3 });
      q.strokeStyle = O.rgba(C.ink, 0.45); q.lineWidth = 2.5; const VP = [900, -900];
      for (let i = -10; i <= 12; i++) { const x = 900 + i * 190; q.beginPath(); q.moveTo(VP[0] + (x - VP[0]) * 0.62, 330); q.lineTo(x + (x - VP[0]) * 0.3, H + 40); q.stroke(); }
      q.restore();
      // the table's shadow over the top of frame, one chair leg (left) and its rim
      q.fillStyle = C.ink; q.fill(S().M(-40, -40).L(W + 40, -40).L(W + 40, 330).C(1500, 420, 700, 360, -40, 460).Z().path(2, 72));
      q.fill(S().poly([[300, -40], [350, -40], [366, 860], [322, 866]]).path(0.6, 73));
      q.fillStyle = O.rgba(C.tungstenTired, 0.6); q.fill(S().poly([[351, 420], [355, 420], [367, 858], [362, 860]]).path(0.3, 74));
    });
    const sil = (shape, seed, fill, rimCol, w) => T.silFill(g, shape.path(0.8, seed), fill, -0.42, -0.9, w / 1.32, rimCol);
    const rim = O.mix(C.tungstenTired, C.tungsten, 0.35);
    // her shoe flinches as the line lands, and pulls back free when he lifts (Deena snaps)
    const free = R.key('deena', lt, [[K.lift + 0.3, 0], [K.lift + 0.55, 1]]); const flinch = lt > K.foot + 0.1 && lt < K.foot + 0.26 ? 8 : 0;
    const sx = 860 + 170 * free + flinch, sy = 930;
    const M1 = [1, 0, 0, 1, sx, sy];
    const shoe = FOOT.shoe.transform(M1);
    O.castShadow(g, shoe, [1, 0, -0.6, 0.08, 0.6 * sy, sy * 0.92 + 8], 0.6);
    sil(FOOT.hem.transform(M1), 14, C.ink, O.mix(rim, C.ink, 0.25), 3.4);
    sil(S().add(shoe).add(FOOT.ankle.transform(M1)), 11, C.ink, rim, 4);
    // the ankle strap (a thin band, one buckle glint) and the patent sheen down the vamp
    g.save(); g.fillStyle = O.mix(C.ink, C.soot2, 0.9); g.fill(FOOT.strap.transform(M1).path(0.2, 16)); g.fillStyle = C.cardPaper; g.globalAlpha = 0.75; g.fillRect(sx + 446, sy - 178, 6, 9); g.restore();
    g.save(); g.globalAlpha = 0.55; g.strokeStyle = C.cardPaper; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx + 230, sy - 82); g.quadraticCurveTo(sx + 300, sy - 104, sx + 346, sy - 140); g.stroke(); g.restore();
    // his foot: on her toe box; on 'Sorry.' it lifts (Scott: a half-start, too far, corrected) and comes down to the left
    const up = clamp(R.key('scott', lt, [[K.lift, 0], [K.lift + 0.34, 1], [K.lift + 0.62, 1]]), 0, 1.1), v = clamp(up, 0, 1);
    const press = up < 0.02 ? 4 : 0;
    const hx = sx - flinch + 92 - 420 * up, hy = sy - 74 + press - 70 * Math.sin(Math.PI * v) + 74 * v, rot = -0.16 * (1 - v) + 0.06 * Math.sin(Math.PI * v);
    const M2 = [Math.cos(rot), Math.sin(rot), -Math.sin(rot), Math.cos(rot), hx, hy];
    const foot = FOOT.foot.transform(M2);
    O.castShadow(g, foot, [1, 0, -0.6, 0.08, 0.6 * sy, sy * 0.92 + 8], 0.4 * v);
    g.save(); g.globalAlpha = 0.6 * (1 - v); g.fillStyle = '#000'; g.translate(10, 12); g.fill(foot.path(0.8, 13)); g.restore();   // his layer lies on hers
    sil(FOOT.trouser.transform(M2), 15, C.ink, O.mix(rim, C.ink, 0.2), 3.2);
    const SOCK = '#2B231E';
    sil(S().add(foot).add(FOOT.shin.transform(M2)), 12, SOCK, rim, 4);
    g.save(); g.transform(...M2); g.fillStyle = '#3A3029'; g.fill(memo('cuff', () => FOOT.cuff.path(0.3, 18)));
    g.strokeStyle = O.rgba(C.ink, 0.5); g.lineWidth = 2; for (let i = 0; i < 8; i++) { const xx = -54 + i * 21; g.beginPath(); g.moveTo(xx, -266 - i * 0.6); g.lineTo(xx + 2, -312 - i * 0.6); g.stroke(); }
    g.restore();
    // the contact: the light catches the top of her toe box where his heel bears down on it
    if (v < 0.9) { g.save(); g.globalAlpha = 1 - v; g.strokeStyle = C.tungsten; g.lineWidth = 3.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(sx + 52, sy - 70); g.quadraticCurveTo(sx + 100, sy - 84, sx + 150, sy - 86); g.stroke(); g.restore();
      c.em.save(); c.em.globalAlpha = 0.7 * (1 - v); c.em.fillStyle = C.tungsten; c.em.beginPath(); c.em.ellipse(sx + 100, sy - 82, 60, 14, 0, 0, 7); c.em.fill(); c.em.restore(); }
  }

  // ------------------------------------------------------------------ the travelling lines
  // 'Christof?' leaves him and travels into the kitchen's glare, shrinking in perspective; 'Oh. Thanks.' drifts toward the gap.
  function travel(from, to, k1, fade0, e) {
    return (c, s, o) => {
      const T0 = s.T; const u = seg(c.lt, T0.inEnd + 0.3, T0.end + 0.35, e || E.inOutSine);
      const x = lerp(from[0], to[0], u), y = lerp(from[1], to[1], u), k = lerp(1, k1, u), fade = 1 - seg(u, fade0, 1);
      const g = c.g; g.save(); g.translate(x, y); g.scale(k, k);
      O.say(g, T0.who, T0.text, 0, 0, Object.assign({}, o, { alpha: (o.alpha == null ? 1 : o.alpha) * fade, align: 'center' }));
      g.restore();
    };
  }

  // Marina's lines here: 46 px in a brighter mint at full opacity, kept within reach of her silhouette. Her own renderer draws them
  // (the strict grid, the ring full stops); only the face's colour is swapped for the call. A long line breaks at a word onto a
  // second row of the same grid (same cell, same left edge), and the grid fills row by row at her usual rate.
  const MINT = '#A4EEC6', MINT_SIZE = 46;
  function mintSay(g, text, x, y, o) { const F = O.FACE.marina, c0 = F.color; F.color = MINT; try { return O.say(g, 'marina', text, x, y, o); } finally { F.color = c0; } }
  function mint(x, ys, brk) {
    return (c, s, o) => {
      const text = s.T.text; let rows = [text];
      if (brk && ys.length > 1) { let i = text.lastIndexOf(' ', brk); if (i < 0) i = text.indexOf(' '); if (i > 0) rows = [text.slice(0, i), text.slice(i + 1)]; }
      let left = Math.round(text.length * clamp(o.p == null ? 1 : o.p, 0, 1));   // characters filled so far (the break's space counts)
      rows.forEach((r, k) => {
        if (k > 0) { left -= 1; if (left <= 0) return; }
        mintSay(c.g, r, x, ys[k], Object.assign({}, o, { p: clamp(left / r.length, 0, 1), size: MINT_SIZE, align: 'left', seed: k + 1 }));
        left -= r.length;
      });
    };
  }

  // ------------------------------------------------------------------ the corridor: the shut bathroom door is the light
  // (the set's projection, mirrored here only to place the afterimage on the clean near-wall panel and to lift the door's light)
  const CR = { vx: 1150, vy: 500, f: 1100, eye: 1.2, xl: -1.9 };
  const CP = (X, Y, Z) => [CR.vx + CR.f * X / Z, CR.vy - CR.f * (Y - CR.eye) / Z];
  let kayTex = null;
  function kayText() {
    if (kayTex) return kayTex; const e = FL.byId && FL.byId.L086; if (!e) return null;
    const F = (O.FACE && O.FACE.kay) || { family: 'Cormorant Garamond', weight: 600, style: 'italic' };
    const fs = O.font({ family: F.family, weight: F.weight, style: F.style, size: 90 });
    const ready = !(document.fonts && document.fonts.check) || document.fonts.check(fs, e.text);
    const m = O.makeCanvas(8, 8).getContext('2d'); m.font = fs; const w = Math.ceil(m.measureText(e.text).width) + 40;
    const cv = O.makeCanvas(w, 130), g = cv.getContext('2d'); g.font = fs; g.fillStyle = C.tKay; g.fillText(e.text, 20, 96);
    const out = { cv, w, h: 130 }; if (ready) kayTex = out; return out;
  }
  function afterimage(c) {   // one line, on the near-left wall panel before the door's near jamb (Z 1.9 .. 2.66), at 8%
    const Tx = kayText(); if (!Tx) return; const g = c.g, xl = CR.xl + 0.004, n = 40, zA = 1.9, zB = 2.66, yB = 1.26, yT = yB + (zB - zA) * Tx.h / Tx.w * 1.15;
    g.save(); g.globalAlpha = 0.08;
    for (let i = 0; i < n; i++) { const u0 = i / n, u1 = (i + 1) / n, z0 = lerp(zA, zB, u0), z1 = lerp(zA, zB, u1), zm = (z0 + z1) / 2;
      const p0 = CP(xl, yT, z0), p1 = CP(xl, yT, z1), pb = CP(xl, yB, zm), pt = CP(xl, yT, zm);
      g.drawImage(Tx.cv, u0 * Tx.w, 0, (u1 - u0) * Tx.w, Tx.h, p0[0], pt[1], p1[0] - p0[0] + 0.6, pb[1] - pt[1]); }
    g.restore();
  }
  function doorLight(c, lt) {   // the line under the shut door, lifted to be the brightest thing down the hall, and the keyhole
    const g = c.g, a = CP(CR.xl, 0.012, 2.77), b = CP(CR.xl, 0.012, 3.63), fl = 0.85 + 0.15 * O.vnoise(lt * 3, 7);
    g.save(); g.globalAlpha = fl; g.strokeStyle = O.mix(C.underDoor, C.cardPaper, 0.35); g.lineWidth = 3; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    const hk = CP(CR.xl, 0.86, 2.86); g.fillStyle = C.underDoor; g.fillRect(hk[0] - 2, hk[1], 4, 9); g.restore();
    c.em.save(); c.em.globalAlpha = fl; c.em.strokeStyle = C.underDoor; c.em.lineWidth = 22; c.em.beginPath(); c.em.moveTo(a[0], a[1]); c.em.lineTo(b[0], b[1]); c.em.stroke(); c.em.restore();
  }

  // ------------------------------------------------------------------ Scott's last close-up: the kitchen door is in the frame
  // the kitchen doorway on the far wall, out of focus (as the hood sliver in Marina's close-ups): dark casing, the hood-lit opening in
  // two bands, the leaf half open at the left jamb, a spill on the wall beside it. World px of the two view; canvas at 2x.
  const SLAB = { x: 690, y: 330, w: 120, h: 330 };
  const slabCanvas = c => c.cache('Q07:slab', q => {
    const w = SLAB.w * 2, h = SLAB.h * 2, X = 60, Y = 40; q.filter = 'blur(9px)';
    q.globalAlpha = 0.45; q.fillStyle = C.hoodLow; q.beginPath(); q.moveTo(X + w + 10, Y + 40); q.lineTo(X + w + 120, Y + 120); q.lineTo(X + w + 150, Y + h); q.lineTo(X + w + 10, Y + h); q.fill(); q.globalAlpha = 1;
    q.fillStyle = '#0A0706'; q.fillRect(X - 18, Y - 18, w + 36, h + 18);
    q.fillStyle = C.hoodMid; q.fillRect(X, Y, w, h); q.fillStyle = C.hood; q.fillRect(X + w * 0.3, Y + w * 0.3, w * 0.56, h - w * 0.3);
    q.fillStyle = '#16100B'; q.beginPath(); q.moveTo(X, Y); q.lineTo(X + w * 0.26, Y + w * 0.1); q.lineTo(X + w * 0.26, Y + h); q.lineTo(X, Y + h); q.fill(); q.filter = 'none';
  }, SLAB.w * 2 + 280, SLAB.h * 2 + 80);
  function slab(c, k) {
    const g = c.g; g.save(); g.clip(OFFTABLE(), 'evenodd'); g.globalAlpha = k; g.drawImage(slabCanvas(c), SLAB.x - 30, SLAB.y - 20, SLAB.w + 140, SLAB.h + 40); g.restore();
    c.em.save(); c.em.globalAlpha = 0.45 * k; c.em.fillStyle = C.hood; c.em.fillRect(SLAB.x + SLAB.w * 0.3, SLAB.y + 40, SLAB.w * 0.56, SLAB.h - 60); c.em.restore();
  }

  // ------------------------------------------------------------------ shots
  const shots = [];
  // every shot receives its shot time on twos (st is only used for camera moves); lt stays on ones
  const shot = (at, name, draw, extra) => shots.push(Object.assign({ at, name, draw: (c, st, lt) => draw(c, Math.max(0, FL.twos(lt) - at), lt) }, extra || {}));
  const wide2 = (c, lt, who, gl) => { const s = twoState(lt, { glasses: { kay: GL.kay, scott: GL.scott } }); T.back(c, lt, s, 'two'); crowd(c, lt, who, gl); return s; };

  // 1. Scott and Kay's glass: her chair is empty, her first pour untouched. He leans in to it.
  shot(0, 'two: Scott regards Kay\'s glass', (c, st, lt) => {
    cam(c, { x: lerp(1010, 1028, st / 2.5), y: 610, zoom: lerp(1.16, 1.171, st / 2.5) }, lt);
    const s = wide2(c, lt, ['marina', 'deena', 'angelo']);
    const reach = R.key('scott', lt, [[0.4, 0], [2.1, 1]]);
    drawTwoFig(c, 'scott', sitSpec('scott', 'R', lt, { look: [760, 690], lean: 0.12 + 0.22 * reach, neck: 0.12, head: 0.24,
      hold: reach > 0.05 ? { N: { kind: 'point', at: [lerp(1130, 930, reach), lerp(860, 735, reach)] } } : undefined }), lt, false, { w: 3 });
    T.front(c, lt, s, 'two');
  });
  // 2. the insert: the lip print, the tap. The ring sustains into the drone, then the vacuum.
  shot(2.5, 'kayglass: the tap', (c, st, lt) => {
    kayGlassShot(c, lt, { x: 960 + 7 * st, y: 540 - 5 * st, zoom: 1 }, { tired: 0, kitchen: kitAt(lt), tapT: lt - K.tap });
    const tp = [KG.x + 0.21 * KG.h, KG.y - 0.7 * KG.h];
    // his finger comes in, hovers, taps once, considers it, and goes
    const inn = R.key('scott', lt, [[2.85, 0], [3.4, 1], [K.tap - 0.1, 1], [K.tap, 1.1], [K.tap + 0.1, 1], [4.45, 1], [5.0, 0]]);
    if (inn > 0.001) fingerIn(c, lt, [tp[0] + 22 + 560 * (1 - inn), tp[1] + 30 * (1 - inn)]);
  });
  // 3. the gasp and the crash: everyone jolts, the matte steps to 1.85, the lamp drains, the kitchen door goes hood-yellow
  shot(K.gasp, 'low: the gasp, the CRASH', (c, st, lt) => {
    cam(c, { x: 960, y: 540, zoom: 1 }, lt);   // static (the set's layers stay cached); the jolt and drift do the moving
    const after = lt >= K.crash, startle = (lt >= K.crash && lt < K.crash + 2 / 24) ? 1 : 0;
    const lk = after ? { angelo: KDOOR, scott: KDOOR, deena: KDOOR, marina: KDOOR } : { angelo: [900, 700], deena: [900, 640], marina: [1300, 700] };
    lowBodies(c, lt, { s: tstate(lt), startle, look: lk, scottProfile: after ? 1 : 0, scottTilt: -0.05, scottHead: -0.04, marinaHead: after ? -0.05 : 0.12 });
    if (crashFrame(lt)) c.after.push(cx => { cx.save(); cx.globalAlpha = 0.35; cx.fillStyle = C.wine; cx.fillRect(0, 0, W, H); cx.restore(); });
  });
  // 4. the tally: five, 12 frames on black
  shot(K.tally, 'tally: five', (c, st) => { TI.tally(c, st, { marks: 5, seed: 1, gapT: 2 / 24 }); }, { post: { vignette: 0.3, halation: 0.4 } });
  // 5. Scott starts up and calls into the kitchen
  shot(K.rise, 'two: Scott starts up - Christof?', (c, st, lt) => {
    cam(c, { x: 900, y: 600, zoom: 1.06 }, lt);
    const s = wide2(c, lt, ['marina', 'deena', 'angelo']);
    const u = clamp(R.key('scott', lt, [[K.rise + 0.05, 0], [K.rise + 0.7, 1]]), 0, 1.06), v = clamp(u, 0, 1);
    drawTwoFig(c, 'scott', { x: lerp(1405, 1384, v), y: lerp(1004, 770, u), anchor: 'hip', scale: 152, facing: -1, t: lt, look: SLIVER,
      lean: 0.06 + 0.45 * Math.sin(Math.PI * v) + 0.03 * v, neck: 0.05, head: lerp(0.1, -0.04, v),
      legN: { a: lerp(1.52, 0.05, v), b: lerp(1.52, 0.08, v) }, legF: { a: lerp(1.4, -0.04, v), b: lerp(1.42, 0.1, v) },
      armN: { a: lerp(0.42, 0.18, v), b: lerp(0.95, 0.4, v), hand: 'relaxed' }, armF: { a: lerp(0.32, 0.02, v), b: lerp(0.9, 0.3, v), hand: 'relaxed' } }, lt);
    T.front(c, lt, s, 'two');
  });
  // 6. Marina: 'What was that?' — she has turned to the yellow doorway behind her
  shot(K.marina, 'cu: Marina - What was that?', (c, st, lt) => {
    single(c, lt, 'marina', 'marinaHood', { facing: -1, look: [238, 600], lean: 0.03, neck: 0.04 }, { cam: { x: 600, y: 590, zoom: 2.0 } });
  });
  // 7. Scott takes a step toward the kitchen; Deena is up and at his shoulder. THUMP, behind them.
  shot(K.step, 'two: Scott steps toward the kitchen - THUMP', (c, st, lt) => {
    cam(c, { x: 1330, y: 610, zoom: 1.16 }, lt);
    const s = wide2(c, lt, ['marina', 'angelo']);
    const turned = lt > K.thump + 0.03;
    const ws = R.walk('scott', Math.min(lt, K.thump), { x0: 1400, scale: 152, facing: -1, t0: K.step + 0.15, dist: 150 });
    const wd = R.walk('deena', Math.min(lt, K.thump), { x0: 1720, scale: 146, facing: -1, t0: K.step + 0.4, dist: 170 });
    const back = R.key('scott', lt, [[K.thump + 0.04, 0], [K.thump + 0.14, 1]]);
    drawTwoFig(c, 'deena', Object.assign({ y: FLOOR2, scale: 146, facing: -1, t: lt, look: turned ? [1900, 640] : SLIVER }, wd), lt);
    drawTwoFig(c, 'scott', Object.assign({ y: FLOOR2, scale: 152, facing: -1, t: lt, look: turned ? [1900, 700] : SLIVER }, ws, { x: ws.x + 30 * back, lean: (ws.lean || 0) - 0.12 * back }), lt);
    T.front(c, lt, s, 'two');
  });
  // 8. the foot: 'Scott, you're standing on my foot.' 'Sorry.'
  shot(K.foot, 'insert: his sock on her shoe', (c, st, lt) => footInsert(c, lt, st));
  // 9. he looks up: the bottle is there, and five fresh glasses. The film counts them: five, for four people.
  shot(K.reveal, 'bottle: five fresh glasses (the count)', (c, st, lt) => {
    bottleShot(c, lt, { cam: { x: 900 - 6 * st, y: 600 - 3 * st, zoom: 1.04 }, over: c2 => countGlints(c2, lt) });
  });
  // 10. back in his chair, the host again: 'Oh. Thanks.' to the gap at his right. Nobody answers.
  shot(K.sit, 'low: Scott sits - Oh. Thanks.', (c, st, lt) => {
    cam(c, { x: 1000, y: 520, zoom: 1.12 }, lt);
    const down = R.key('scott', lt, [[K.sit, -240], [K.sit + 0.55, 0]]);
    lowBodies(c, lt, { s: tstate(lt), scottY: down, scottProfile: lt > K.thanks - 0.35 ? -1 : 0, scottHead: 0.02,
      look: { angelo: [1300, 600], deena: [1200, 560], scott: [600, 400], marina: [1200, 600] } });
  });
  // 11. he uncorks it and pours, at her place; her glass fills past the top and the wine runs toward her hand
  shot(K.pour, 'insert: the pour at Deena\'s place', (c, st, lt) => pourShot(c, lt));
  // 12. Scott: 'Sorry. Just tell me when.'
  shot(K.tell, 'cu: Scott - Sorry. Just tell me when.', (c, st, lt) => single(c, lt, 'scott', 'scott', { look: EYE_L, lean: 0.08, head: 0.06 }));
  // 13. Deena, over his shoulder, her overfilled glass in front of her: 'I did. Twice.'
  shot(K.twice, 'ots: Deena - I did. Twice.', (c, st, lt) => single(c, lt, 'deena', 'deena', { look: EYE_R, gesture: lt > K.twice + 0.35 ? 'armsFolded' : undefined }, { cam: { x: 640, y: 600, zoom: 1.8 }, ots: 'scott', otsHead: [1880, 520] }));
  // 14. Kay's untouched glass again. 'Where's Kay?' — the frame steps to 2.00.
  shot(K.kayg, 'kayglass: still untouched - Where\'s Kay?', (c, st, lt) => {
    kayGlassShot(c, lt, { x: 930 - 12 * st, y: 520 - 3 * st, zoom: 1.08 }, { tired: 1, kitchen: 1 });
  });
  // 15-17. 'Bathroom.' 'Still?' 'I don't know. Go ask her.'
  shot(K.bath, 'cu: Deena - Bathroom.', (c, st, lt) => single(c, lt, 'deena', 'deena', { look: EYE_R, gesture: 'armsFolded' }, { cam: { x: 610, y: 590, zoom: 2.3 } }));
  shot(K.still, 'ots: Scott - Still?', (c, st, lt) => single(c, lt, 'scott', 'scott', { look: EYE_L, lean: 0.06, head: R.key('scott', lt, [[K.still, 0.08], [K.still + 0.3, -0.04]]) },
    { cam: { x: 1150, y: 570, zoom: 1.75 }, ots: 'deena', otsHead: [130, 520], otsScale: 320 }));
  shot(K.ask, 'cu: Deena - Go ask her.', (c, st, lt) => single(c, lt, 'deena', 'deena', { look: R.key('deena', lt, [[K.ask + 1.05, EYE_R], [K.ask + 1.25, [-200, 520]]]), gesture: 'armsFolded' }));
  // 18. the corridor: the bathroom door shut, the light under it, her words still on the wall
  shot(K.corridor, 'corridor: the bathroom door, shut', (c, st, lt) => {
    cam(c, { x: 790 + 6 * st, y: 640, zoom: 1.24 }, lt);
    HL.draw(c, lt, { bathDoor: 0, spill: 1, endLight: 0.1, underDoor: 1, kayAfterimage: 0 }, 'corridor');
    afterimage(c); doorLight(c, lt);
  });
  // 19. Marina, against the hall door: 'Don't. She'll come out when she's ready.'
  shot(K.dont, 'cu: Marina - She\'ll come out', (c, st, lt) => single(c, lt, 'marina', 'marina', { look: EYE_R }));
  // 20. Scott, eyes down, very close: 'I just thought she was here a second ago.'
  shot(K.thought, 'ecu: Scott - she was here a second ago', (c, st, lt) => single(c, lt, 'scott', 'scott', { look: [900, 760], lean: 0.1, head: 0.22 }, { cam: { x: 1250, y: 520, zoom: 3.3 }, pan: [-4 * st, 2 * st] }));
  // 21. Angelo, low across the table, the empty place at Scott's right beside him: 'Maybe she was.' (a shrug)
  // (Angelo is cheated left so the dark hall doorway, the empty place at Scott's right, opens beside his face)
  const ANG_CAM = { x: 760, y: 385, zoom: 1.55 };
  function angeloLow(c, lt, o) {
    cam(c, o.cam || ANG_CAM, lt);
    lowBodies(c, lt, Object.assign({ s: tstate(lt), deena: false, marina: false, look: { angelo: [1150, 420] }, angeloDraw: { w: 5.5, color: O.mix(C.tungstenTired, C.tungsten, 0.45) } }, o, { angeloDx: -180 + (o.angeloDx || 0) }));
  }
  shot(K.maybe, 'low: Angelo, the gap beside him - Maybe she was.', (c, st, lt) => {
    // the shrug: shoulders up and the head settling into them, palms turned up, then down again (his loose, showy timing)
    const sh = R.key('angelo', lt, [[K.maybe + 0.4, 0], [K.maybe + 0.7, 1], [K.maybe + 1.3, 1], [K.maybe + 1.6, 0]]);
    angeloLow(c, lt, { cam: { x: 780, y: 420, zoom: 1.4 }, angeloSpec: { lean: 0.2 - 0.06 * sh, neck: 0.1 - 0.14 * sh, head: 0.12 - 0.1 * sh,
      armN: { a: lerp(0.5, 0.28, sh), b: lerp(1.0, 1.75, sh), hand: sh > 0.3 ? 'open' : undefined, w: -1.3 * sh }, armF: { a: lerp(0.4, 0.2, sh), b: lerp(1.0, 1.7, sh), hand: sh > 0.3 ? 'open' : undefined, w: -1.25 * sh } },
      angeloDy: -18 * sh, look: { angelo: [1150, 420] } }); });
  // 22. Scott looks at him
  shot(K.looks, 'cu: Scott looks at Angelo', (c, st, lt) => single(c, lt, 'scott', 'scott', { look: EYE_L, lean: 0.04, head: -0.02 }));
  // 23. Angelo can't make the sentence mean anything: the whole head drops at the neck, the shoulders sink
  shot(K.drop, 'low: Angelo - it means nothing', (c, st, lt) => {
    const d = R.key('angelo', lt, [[K.drop + 0.3, 0], [K.drop + 0.85, 1]], { mood: 'drained' });
    angeloLow(c, lt, { angeloSpec: { lean: 0.2 + 0.1 * d, neck: 0.1 + 0.3 * d, head: 0.12 + 0.06 * d }, angeloDy: 14 * d, angeloDx: 6 * d, look: { angelo: d > 0.3 ? null : [1150, 420] } });
  });
  // 24. Marina, over Scott's shoulder, the hall door behind her: 'We'll start when Christof gets back.'
  shot(K.start, 'ots: Marina - when Christof gets back', (c, st, lt) => single(c, lt, 'marina', 'marina', { look: EYE_R }, { cam: { x: 680, y: 600, zoom: 1.8 }, ots: 'scott', otsHead: [1880, 520] }));
  // 25. Scott: 'He did come back.' — said straight into the lens, which is Christof's empty place
  shot(K.did, 'low: Scott - He did come back.', (c, st, lt) => {
    cam(c, { x: 1190, y: 440, zoom: 1.95 }, lt);
    lowBodies(c, lt, { s: tstate(lt), deena: false, marina: false, scottTilt: R.key('scott', lt, [[K.did, 0.04], [K.did + 0.3, -0.02]]) });
  });
  // 26. Marina glances toward the doorway behind her, and back: 'He went to get the wine.'
  shot(K.went, 'cu: Marina glances at the doorway', (c, st, lt) => {
    const a = R.turn('marina', lt, K.went + 0.15, 1, -1), b = R.turn('marina', lt, K.went + 0.6, -1, 1); const q = lt < K.went + 0.6 ? a : b;
    single(c, lt, 'marina', 'marinaHood', { facing: q.facing, squash: q.squash, look: q.facing < 0 ? SLIVER : EYE_R });
  });
  // 27. Scott is holding the wine: 'Yeah. This wine.'
  shot(K.wine, 'insert: the bottle in his hand', (c, st, lt) => {
    const lift = R.key('scott', lt, [[K.wine + 0.05, 0], [K.wine + 0.5, 1]]);
    bottleShot(c, lt, { cam: { x: 840 - 8 * st, y: 540, zoom: 1.04 }, bottle: { x: 300, y: lerp(880, 800, lift), h: 540, rot: -0.06 * lift }, hand: [420, 1500] });
  });
  // 28. he raises it into the yellow doorway: a hard silhouette. They all turn to look at it, and so at the door they won't look at.
  const BSHAPE = memo('bsil', () => S().M(-0.12, 0).L(0.12, 0).L(0.125, -0.6).C(0.125, -0.7, 0.05, -0.72, 0.042, -0.78).L(0.04, -0.98).L(0.05, -1.0).L(-0.05, -1.0).L(-0.04, -0.98).L(-0.042, -0.78).C(-0.05, -0.72, -0.125, -0.7, -0.125, -0.6).Z());
  shot(K.look, 'low: they all look at the bottle', (c, st, lt) => {
    cam(c, { x: 960, y: 520, zoom: 1.0 }, lt);
    const lift = R.key('scott', lt, [[K.look + 0.05, 0], [K.look + 0.55, 1]]);
    const bp = [lerp(1360, 1480, lift), lerp(640, 470, lift)], bh = 250, rot = 0.05 * lift;   // the bottle's foot: raised into the doorway
    const tgt = [bp[0], bp[1] - 140];
    const lk = { angelo: lt > K.look + 0.3 ? tgt : [1100, 660], marina: lt > K.look + 0.5 ? tgt : [1250, 680], deena: lt > K.look + 0.7 ? tgt : [1000, 640] };
    lowBodies(c, lt, { s: tstate(lt, { bottle: 0 }), look: lk, bust: { armR: { to: [bp[0] - 6, bp[1] - 90], hand: 'hold' } }, scottTilt: -0.04,
      deenaHead: R.key('deena', lt, [[K.look + 0.62, 0.1], [K.look + 0.72, -0.22]]), marinaHead: R.key('marina', lt, [[K.look + 0.42, 0.1], [K.look + 0.74, -0.24]]), nearIn: 120,
      afterScott: (c2) => { const M = [Math.cos(rot) * bh, Math.sin(rot) * bh, -Math.sin(rot) * bh, Math.cos(rot) * bh, bp[0], bp[1]]; const pth = BSHAPE.transform(M).path(0.3, 9);
        c2.g.fillStyle = C.ink; c2.g.fill(pth); occl(c2, pth); } });
  });
  // 29-31. 'Probably went for a smoke.' 'He doesn't smoke.' 'Then I don't know, Scott.'
  shot(K.smoke, 'cu: Deena - a smoke', (c, st, lt) => single(c, lt, 'deena', 'deena', { look: EYE_R, gesture: 'armsFolded' }));
  shot(K.nosmoke, 'cu: Scott - He doesn\'t smoke.', (c, st, lt) => single(c, lt, 'scott', 'scott', { look: EYE_L, lean: 0.06 }, { cam: { x: 1210, y: 555, zoom: 2.25 } }));
  shot(K.dunno, 'ots: Deena - Then I don\'t know', (c, st, lt) => single(c, lt, 'deena', 'deena', { look: R.key('deena', lt, [[K.dunno + 0.8, EYE_R], [K.dunno + 1.0, [1200, 900]]]), head: R.key('deena', lt, [[K.dunno + 0.8, 0], [K.dunno + 1.0, 0.2]]), gesture: 'armsFolded' }, { cam: { x: 640, y: 600, zoom: 1.8 }, ots: 'scott', otsHead: [1880, 520] }));
  // 32. the doorway nobody looks at
  shot(K.door, 'low: the hood-yellow doorway', (c, st, lt) => {
    cam(c, { x: 1385 + 22 * st, y: 430, zoom: 1.9 }, lt);
    lowBodies(c, lt, { s: tstate(lt), deena: false, marina: false, scottTilt: 0.06, flat: true });
  });
  // 33. Angelo reaches across for the deck and draws it back to his place
  shot(K.deck, 'top: Angelo reaches for the deck', (c, st, lt) => {
    cam(c, T.cams.top, lt);
    const home = TOPA.dealer.deck, far = [1150, 470];
    const r = R.key('angelo', lt, [[K.deck + 0.12, 0], [K.deck + 0.6, 1], [K.deck + 0.72, 1], [K.deck + 1.15, 2]]);
    const dk = r <= 1 ? far : [lerp(far[0], home[0], r - 1), lerp(far[1], home[1], r - 1)];
    const s = tstate(lt); T.back(c, lt, s, 'top');
    T.deck(c, dk[0], dk[1], lerp(0.5, TOPA.dealer.dir + Math.PI / 2, clamp(r - 1, 0, 1)), {});
    const an = T.top.seatAt('angelo', s); const k = clamp(r, 0, 1);
    const grip = [[dk[0] - 14, dk[1] + 18], [dk[0] + 10, dk[1] - 20]];
    const hands = [0, 1].map(i => [lerp(an.hands[i][0], grip[i][0], k), lerp(an.hands[i][1], grip[i][1], k)]);
    topFig(c, lt, 'angelo', s, { hands, handPose: k > 0.85 ? ['clasp', 'clasp'] : ['flat', 'open'], look: dk });
    topFig(c, lt, 'scott', s, { look: dk });
    topFig(c, lt, 'deena', s, { look: dk });
    topFig(c, lt, 'marina', s, { look: dk });
    T.front(c, lt, s, 'top');
  });
  // 34. Angelo with the deck, squaring it, easy again (the gap still beside him): 'We can do one quick hand. Until they come back.'
  shot(K.hand, 'low: Angelo - one quick hand', (c, st, lt) => {
    const sq = R.key('angelo', lt, [[K.hand + 0.8, 0], [K.hand + 1.1, 1], [K.hand + 1.4, 0]]);
    angeloLow(c, lt, { cam: { x: 700, y: 470, zoom: 1.8 }, angeloSpec: { lean: 0.26, head: 0.16 - 0.14 * seg(lt, K.hand + 0.4, K.hand + 0.8), hold: { N: { kind: 'deck', mode: 'square', at: [640 + 10 * sq, 590 - 8 * sq] } } },
      look: { angelo: lt < K.hand + 0.6 ? [640, 640] : [1150, 420] } });
  });
  // 35. Scott: 'Both of them?'
  shot(K.both, 'cu: Scott - Both of them?', (c, st, lt) => single(c, lt, 'scott', 'scott', { look: EYE_L, head: 0.0 }));
  // 36. Angelo: 'Yeah. Kay and Christof.'
  shot(K.kc, 'low: Angelo - Kay and Christof.', (c, st, lt) => angeloLow(c, lt, { angeloSpec: { lean: 0.22, hold: { N: { kind: 'deck', mode: 'square', at: [640, 590] } } } }));
  // 37. Scott nods. It sounds right. Then it doesn't: he stops, his eyes go to the kitchen door, and its yellow finds his face.
  shot(K.nod, 'cu: Scott nods - then it doesn\'t', (c, st, lt) => {
    const nod = R.key('scott', lt, [[K.nod + 0.2, 0], [K.nod + 0.4, 0.16], [K.nod + 0.6, 0.02], [K.nod + 0.8, 0.12], [K.nod + 1.0, 0.02]]);
    const turn = R.key('scott', lt, [[K.nod + 1.15, 0], [K.nod + 1.6, 1]]), yel = seg(lt, K.nod + 1.3, K.nod + 1.75, E.inOutSine);
    const cb = { x: 1150, y: 556, zoom: 2.0 };
    // he nods down at the table (it sounds right); then his eyes come up and across to the yellow door, the head after them
    const door = [SLAB.x + 50, SLAB.y + 40], down = [940, 760];
    const look = [lerp(down[0], door[0], turn), lerp(down[1], door[1], turn)];
    single(c, lt, 'scott', 'scott', { look, head: nod + 0.06 * (1 - turn) - 0.12 * turn, lean: 0.06 - 0.03 * turn, breath: lt > K.nod + 1.3 ? false : undefined },
      { cam: cb, pan: [-6 * st, -2 * st], key: ':slab', extra: c2 => slab(c2, 1), draw: { light: yel > 0 ? { x: lerp(LIGHT2.x, door[0], yel), y: lerp(LIGHT2.y, door[1], yel) } : LIGHT2,
        color: O.mix(rimAt(lt), C.hood, yel), w: 5.5 + 2 * yel } });
  });

  // ------------------------------------------------------------------ dialogue (every hold at least the engine's readability minimum)
  const lines = [
    { id: 'L104', at: K.call, x: 1150, y: 300, draw: travel([1140, 300], [300, 420], 0.24, 0.5) },
    { id: 'L105', at: K.marina + 0.1, x: 980, y: 300 },
    { id: 'L106', at: K.foot + 0.05, x: 560, y: 210 },
    { id: 'L107', at: K.sorry, x: 380, y: 300 },
    { id: 'L108', at: K.thanks, x: 1040, y: 300, draw: travel([1040, 300], [700, 330], 0.72, 0.55) },
    { id: 'L109', at: K.plenty, x: 150, y: 250 },
    { id: 'L110', at: K.tell + 0.05, x: 330, y: 200 },
    { id: 'L111', at: K.twice + 0.1, x: 1000, y: 290 },
    { id: 'L112', at: K.kay, x: 200, y: 200 },
    { id: 'L113', at: K.bath + 0.05, x: 1080, y: 290 },
    { id: 'L114', at: K.still + 0.05, x: 880, y: 190 },
    { id: 'L115', at: K.ask + 0.05, x: 980, y: 290 },
    { id: 'L116', at: K.dont + 0.05, x: 900, y: 152, size: MINT_SIZE, draw: mint(900, [152, 212], 22) },
    { id: 'L117', at: K.thought + 0.1, x: 110, y: 175 },
    { id: 'L118', at: K.maybe + 0.15, x: 1150, y: 380 },
    { id: 'L119', at: K.start + 0.1, x: 920, y: 330, size: MINT_SIZE, draw: mint(920, [330, 392], 16) },
    { id: 'L120', at: K.did + 0.1, x: 330, y: 300 },
    { id: 'L121', at: K.went + 0.7, x: 1040, y: 335, size: MINT_SIZE, draw: mint(1040, [335]) },
    { id: 'L122', at: K.wine + 0.1, x: 560, y: 210 },
    { id: 'L123', at: K.smoke + 0.05, x: 960, y: 200 },
    { id: 'L124', at: K.nosmoke + 0.1, x: 360, y: 200 },
    { id: 'L125', at: K.dunno + 0.15, x: 880, y: 230 },
    { id: 'L126', at: K.deck + 0.75, x: 930, y: 180, size: 46 },
    { id: 'L127', at: K.both + 0.1, x: 420, y: 200 },
    { id: 'L128', at: K.kc + 0.1, x: 760, y: 170 },
  ];

  // ------------------------------------------------------------------ sound
  const SND = window.SOUND;
  if (SND && SND.cues) {
    const { osc, src, filt, gain, pan, chain, perc, db } = SND;
    // the tap on Kay's glass: a wine-glass ring that sustains far too long, beating, until the drone takes it over
    SND.cues['Q07.ring'] = (ac, B, t, p) => {
      const lv = db(p.level || -22); [[1318, 1], [1321.6, 0.7], [3070, 0.35], [5600, 0.14]].forEach(([f, a], i) => {
        const g = gain(ac, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lv * a, t + 0.004); g.gain.exponentialRampToValueAtTime(Math.max(1e-5, lv * a * 0.05), t + (i < 2 ? 3.2 : 0.9));
        chain(osc(ac, 'sine', f, t, t + 3.4), g, pan(ac, -0.15), B.fx); });
      const k = gain(ac, 0); perc(k, t, lv * 0.7, 0.0005, 0.012); chain(src(ac, 'white', 701, t, t + 0.03), filt(ac, 'bandpass', 4200, 3), k, B.fx);
    };
    // a tally scratch whose loudness follows its level (the matte steps: soft; the interstitial: a hard scratch)
    SND.cues['Q07.tally'] = (ac, B, t, p) => {
      const lv = db(p.level || -24); const g = gain(ac, 0); perc(g, t, lv, 0.002, 0.07);
      const am = osc(ac, 'square', 30, t, t + 0.1), ag = gain(ac, lv * 0.6); chain(am, ag); ag.connect(g.gain);
      chain(src(ac, 'white', 91, t, t + 0.1), filt(ac, 'bandpass', 3500, 2), g, pan(ac, p.pan || 0), B.fx);
    };
    // the table's chatter carried over from Q06, already dying as Scott looks at the glass (walla that starts at level, then fades)
    SND.beds['Q07.tail'] = (ac, B, t0, t1, p) => {
      const g = gain(ac, 0); g.gain.setValueAtTime(db(p.level || -26), t0); g.gain.linearRampToValueAtTime(0, t1);
      if (SND.wallaRec(ac, g, t0, t1)) { g.connect(B.room); return; }
      for (let v = 0; v < 4; v++) { const sN = src(ac, 'pink', 40 + v, t0, t1, 0.9 + v * 0.03); const vg = gain(ac, 0.6); [[500 + v * 40, 6], [1500 + v * 90, 8]].forEach(([f, q]) => chain(sN, filt(ac, 'bandpass', f, q), vg));
        const am = osc(ac, 'sine', 2.2 + v * 0.7, t0, t1), ag = gain(ac, 0.5); chain(am, ag); ag.connect(vg.gain); chain(vg, pan(ac, (v - 1.5) / 2.5), g); }
      g.connect(B.room);
    };
    SND.cues['Q07.cork'] = (ac, B, t, p) => {
      const g = gain(ac, 0); perc(g, t, db(p.level || -18), 0.001, 0.07); const o = osc(ac, 'sine', 420, t, t + 0.12); o.frequency.exponentialRampToValueAtTime(160, t + 0.08); chain(o, g, pan(ac, 0.3), B.fx);
      const n = gain(ac, 0); perc(n, t, db((p.level || -18) - 4), 0.0005, 0.03); chain(src(ac, 'white', 702, t, t + 0.05), filt(ac, 'bandpass', 1400, 1.5), n, pan(ac, 0.3), B.fx);
    };
    // the pour: a glugging stream whose pitch climbs as the glass fills
    SND.cues['Q07.pour'] = (ac, B, t, p) => {
      const d = p.dur || 2; const g = gain(ac, 0); SND.bedEnv(g, t, t + d, db(p.level || -28), 0.06, 0.12);
      const bp = filt(ac, 'bandpass', 380, 4); bp.frequency.setValueAtTime(380, t); bp.frequency.exponentialRampToValueAtTime(1100, t + d);
      const am = osc(ac, 'sine', 7.5, t, t + d), ag = gain(ac, db(p.level || -28) * 0.8); chain(am, ag); ag.connect(g.gain);
      chain(src(ac, 'brown', 703, t, t + d + 0.05), bp, g, pan(ac, 0.05), B.fx);
    };
    SND.cues['Q07.lub'] = (ac, B, t, p) => { [[50, 0], [42, 0.24]].forEach(([f, dt], i) => { const g = gain(ac, 0); perc(g, t + dt, db((p.level || -12) - i * 4), 0.01, 0.2); chain(osc(ac, 'sine', f, t + dt, t + dt + 0.4), filt(ac, 'lowpass', 160), g, B.fx); }); };
    // ONE heartbeat from the corridor to the end: a slow tempo ramp and a level ramp ([[t, dB], ...]); no seam, no doubled beat
    SND.beds['Q07.heart'] = (ac, B, t0, t1, p) => {
      const out = gain(ac, 0), lv = p.levels || [[t0, -28], [t1, -16]]; out.gain.setValueAtTime(db(lv[0][1]), t0); lv.slice(1).forEach(([t, d]) => out.gain.linearRampToValueAtTime(db(d), t));
      const lp = filt(ac, 'lowpass', 240, 0.7); chain(lp, out, pan(ac, p.pan || 0), B.room);
      let t = t0; const b0 = p.bpm || 56, b1 = p.bpmTo || b0;
      while (t < t1 - 0.3) { const u = (t - t0) / Math.max(1e-3, t1 - t0); const bpm = b0 + (b1 - b0) * u;
        if (!SOUND.beat(ac, lp, t)) [[52, 0], [44, 0.21]].forEach(([f, dt], i) => { [[1, 1], [2, 0.3]].forEach(([m, a]) => { const g = gain(ac, 0); perc(g, t + dt, (i ? 0.6 : 1) * a, 0.008, 0.12); chain(osc(ac, 'sine', f * m, t + dt, t + dt + 0.25), g, lp); }); }); t += 60 / bpm; }
    };
  }
  function sound(S) {
    // the room is quiet enough now to hear the fridge; the gas, subliminal since Christof went in, keeps rising
    S.bed('Q07.tail', 0, 2.0, { level: -17 });
    S.bed('room', 0, DUR, { level: -40 });
    S.bed('fridge', 0, DUR, { level: -40, steps: [[K.crash + 0.5, -37]] });
    S.bed('gas', 0, DUR, { from: -50, to: -44 });
    // the tap: the ring sustains into the drone; then the vacuum, the gasp, the crash
    S.cue('Q07.ring', K.tap, { level: -20 });
    S.bed('drone7', K.tap + 0.15, K.hole + 0.04, { level: -33, seventh: -28, fi: 1.0, fo: 0.05 });   // and cuts dead with the vacuum
    S.hole(K.hole, 0.5);
    S.cue('gasp', K.gasp, { level: -15 });
    S.cue('crash', K.crash, { level: -7 });
    S.cue('Q07.tally', K.crash, { level: -26 });
    // (-18 renders the marks at about -22 dB peak: Q07.tally scales its chop with the level, so it lands near its nominal)
    for (let i = 0; i < 5; i++) S.cue('Q07.tally', K.tally + i * 2 / 24, { level: -18, pan: (i - 2) * 0.15 });
    S.duck(K.call + 1.0, K.marina, 0.5);   // no answer
    // the bottle: a soft thump behind him, dry, panned to his right
    S.cue('thump', K.thump, { pan: 0.6, level: -16 });
    // the count: five pings running toward the gap side, the fifth a count past the truth, with the Extra's swell
    for (let i = 0; i < 5; i++) S.cue('ping', K.count + i * 0.125, { i, sour: 28, wrong: i === 4, pan: 0.5 - i * 0.25, level: -28 });
    S.bed('drone7', K.reveal + 0.2, K.sit + 1.6, { level: -30, seventh: -25, fi: 0.5, fo: 1.4 });
    S.cue('Q07.cork', K.pop, { level: -18 });
    S.cue('Q07.pour', K.pour0 + 0.05, { dur: K.pour1 - K.pour0, level: -21 });
    S.cue('drip', K.pour1 + 0.3, { level: -26 }); S.cue('drip', K.pour1 + 0.65, { level: -30 });
    S.cue('Q07.tally', K.kay, { level: -24 });   // 'Where's Kay?': the frame steps to 2.00
    // a heartbeat starts under the corridor and does not stop; felt more and more from the doorway on
    S.bed('Q07.heart', K.corridor, DUR, { bpm: 54, bpmTo: 70, levels: [[K.corridor, -27], [K.look, -23], [K.door, -17], [K.nod, -19], [DUR, -20]] });
    S.duck(K.nod + 1.3, DUR, 0.35);
    S.cue('Q07.lub', K.nod + 1.45, { level: -14 });   // the one heavy beat: on the fx bus, so the room's duck leaves it standing
    S.cue('riffle', K.hand + 0.75, { level: -30 }); S.cue('slap', K.hand + 1.1, { level: -30 });
  }

  FL.seq({
    id: 'Q07', title: 'The crash', dur: DUR,
    letterbox: lt => lt < K.crash ? 1.7778 : lt < K.kay ? 1.85 : 2.0,
    lines, sound, shots,
  });
})();
