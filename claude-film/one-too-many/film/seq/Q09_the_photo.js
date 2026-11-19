/* ONE TOO MANY — Q09 THE PHOTO (and the hallway). L167-L182, A102-A114. Letterbox 2.00 throughout.
   Marina wants proof: a photo of all of them. At the wall she holds the phone back into the empty place at Scott's right without
   looking; across a cut her hand is empty. Four against the wall, a person-sized gap where the burnt 'Scott.' is; the charge
   whine, the shutter, three frames of flash from whoever stood where the camera is; across the flash the phone is back in her
   hand. Four in the picture, none of them holding the phone. Angelo zooms: it was taken from several feet away. 'Christof.'
   'Kay.' at once. The empty hall. Four marks. The procession past the bathroom door, still facing the way they left the room;
   Scott's hand stops short of the handle and Kay's afterimage dies on that frame. 'Scott?' 'Yeah. Coming.'
   Opens on Q08's last frame exactly (same props, chairs, cards, hands at rest, cams.circle at 0.97).
   Everything local: no set, rig or kit edits. Local helpers: figDraw/cres (ink + ONE lit crescent kept to the head and
   shoulders, fading in two posterised steps, as F08), ringBand (Marina's ring as one gold band at close scale), the wall
   inserts (busts + profile Marina), Angelo's pinch hand, Scott's hand in the handle insert, a second pass of Kay's L086
   afterimage (the set caps it at 8%), footsteps/cloth/afterimage-death cues. */
(function () {
  'use strict';
  const O = OTM, C = O.C, R = RIG, T = SETS.table, HL = SETS.hall, TI = SETS.title, S = O.S;
  const seg = FILM.seg, clamp = FILM.clamp, lerp = FILM.lerp, TAU = Math.PI * 2;
  const GOLD = '#D4AF5E';
  const DUR = 54;
  const PAL = T.pal(1);
  const L2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

  // ------------------------------------------------------------------ helpers
  // place a figure so its head lands at (hx, hy) (computed without t, so breath still shows)
  function place(id, spec, hx, hy) {
    const s0 = Object.assign({ anchor: 'hip' }, spec, { x: 0, y: 0 }); delete s0.t; delete s0.hold; const sk = R.skeleton(id, s0).sk;
    return Object.assign({ anchor: 'hip' }, spec, { x: hx - sk.head[0], y: hy - sk.head[1] });
  }
  const fig = (id, spec, hx, hy) => R.figure(id, hx == null ? spec : place(id, spec, hx, hy));
  // the gentle post-crash drift (0.6 px, 0.4 Hz), stepped on twos so a still figure's sprite is reused within the pair
  const drift = (cam, t, amp, seed) => { const s = FILM.shake(FILM.twos(t), amp == null ? 0.6 : amp, 0.4, seed || 19); return Object.assign({}, cam, { dx: (cam.dx || 0) + s.dx, dy: (cam.dy || 0) + s.dy }); };
  // keep the bloom of anything behind (a lit doorway, the perforations' scorch) off the ink of a body in front of it
  const occlude = (c, p) => { const e = c.em; e.save(); e.globalAlpha = 1; e.fillStyle = '#000'; e.fill(p); e.restore(); };
  const norm2 = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  // cheap ink + full one-sided rim for the far low-view bodies (as Q08 draws them, for continuity)
  function sil(c, F, L, rim, w) { const p = R.path(F); const bb = R.bbox(F); const [ux, uy] = norm2(L.x - (bb.x + bb.w / 2), L.y - (bb.y + bb.h * 0.3)); T.silFill(c.g, p, C.ink, ux, uy, w || 3.5, rim || C.tungsten, 1); return p; }
  // a dimmer on everything drawn so far (the tired lamp one step down): the wall close-ups sit in the darker band
  function veil(c, a) { const g = c.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; g.fillStyle = C.ink; g.fillRect(0, 0, O.W, O.H); g.restore(); }
  // the opposite: a gain of (1 + k) on everything drawn so far (the paper world adds a k-strength copy of itself; type comes later)
  function lift(c, k) { if (!(k > 0)) return; const g = c.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'lighter'; g.globalAlpha = k; g.drawImage(g.canvas, 0, 0); g.restore(); }
  const WLIFT = 0.15;   // the wall shots of the four (13.65-17.92) sit ~15% brighter, so the four can be counted

  // THE RIM. Ink, then ONE crescent on the edges facing the light (a single direction for the whole body, so never an outline),
  // kept to circular regions (by default round the head and shoulders) in two posterised steps that fade off the body.
  function cres(g, p, hd, sc, L, col, o) {
    o = o || {}; const m = g.getTransform(); const z = Math.hypot(m.a, m.b) || 1; const w = (o.w || 3) / z;
    const u = o.dir || norm2(L.x - hd[0], L.y - hd[1]); const fill = o.fill || C.ink;
    g.fillStyle = fill; g.fill(p);
    if (!col) return;
    const ctr = o.at || [hd[0] + (o.cdx || 0) * sc, hd[1] + (o.cdy == null ? 0.5 : o.cdy) * sc];
    const regions = o.regions || [[ctr, (o.r1 || 2.0) * sc, o.a1 == null ? 0.36 : o.a1], [ctr, (o.r0 || 1.15) * sc, 1]];
    // the lit colour is laid inside each region (outer, fainter first), then ONE offset ink pass clipped only to the body cuts it
    // back to a crescent: no ink pass is clipped to a region, so the regions' edges leave no seam inside the body
    regions.forEach(([q, r, a]) => { g.save(); g.clip(p); g.beginPath(); g.arc(q[0], q[1], r, 0, TAU); g.clip(); g.globalAlpha = a * (o.alpha == null ? 1 : o.alpha); g.fillStyle = col; g.fillRect(q[0] - r, q[1] - r, 2 * r, 2 * r); g.restore(); });
    g.save(); g.clip(p); g.translate(-u[0] * w, -u[1] * w); g.fillStyle = fill; g.fill(p); g.restore();
  }
  // a RIG figure through cres, then its props (o.mid draws between the body and the front ink), front ink, details, the ring
  function figDraw(c, F, L, col, o) {
    o = o || {}; const g = o.g || c.g; const p = R.path(F); const sc = F.scale || 60; const hd = (F.joints && F.joints.head) || F.head;
    cres(g, p, hd, sc, L, col, o);
    if (o.props !== false && F.props && F.props.length) { const po = { light: L, color: col || C.tungsten, em: o.em === false ? null : c.em, details: {}, scale: sc }; F.props.forEach(fn => fn(g, po)); }
    if (o.mid) o.mid(g);
    if (F.front) { g.fillStyle = o.fill || C.ink; g.fill(F._q9f || (F._q9f = F.front.path(0.6, (F.seed || 21) + 7))); }
    if (F.details && o.details !== false) O.fig.drawDetails(g, F, Object.assign({ light: L, rimColor: col || C.tungsten, ringColor: 'rgba(0,0,0,0)', hoopColor: col || C.tungsten }, o.details || {}));
    if (o.ring) ringBand(c, F, Object.assign({ g, em: o.em }, o.ring));
    if (o.occ !== false && o.em !== false) occlude(c, p);
    return p;
  }
  // Marina's ring at close scale: ONE gold band across her ring finger with a glint (the kit draws three dots for small scales)
  const compM = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  function ringBand(c, F, o) {
    o = o || {}; const g = o.g || c.g; const d = (F.details || []).find(q => q.kind === 'rings'); if (!d || !d.hm || !(F.M || d.M)) return;
    const M = d.top ? compM(d.M, d.hm) : compM(F.M, d.hm); const ap = q => [M[0] * q[0] + M[2] * q[1] + M[4], M[1] * q[0] + M[3] * q[1] + M[5]];
    const Lh = Math.hypot(M[0], M[1]); const fk = o.flicker == null ? 1 : o.flicker;
    const a = ap([0.5, -0.005]), b = ap([0.47, 0.1]), mid = L2(a, b, 0.5), gl = L2(a, b, 0.22);
    g.save(); g.lineCap = 'round'; g.strokeStyle = GOLD; g.globalAlpha = 0.92; g.lineWidth = Math.max(2.2, Lh * 0.052);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.fillStyle = C.lighterCream; g.globalAlpha = 0.55 + 0.45 * fk; g.beginPath(); g.arc(gl[0], gl[1], Math.max(1.3, Lh * 0.022), 0, TAU); g.fill(); g.restore();
    if (o.em !== false) { const e = c.em; e.save(); e.globalAlpha = 0.45 * fk; e.fillStyle = GOLD; e.beginPath(); e.arc(mid[0], mid[1], Math.max(7, Lh * 0.09), 0, TAU); e.fill(); e.restore(); }
  }
  // the light of a phone screen on a face: a crescent on the side facing the screen, kept to the face (no wedge, no outline)
  function screenGlow(c, F, from, k, o) {
    o = o || {}; if (!(k > 0)) return; const g = o.g || c.g; const p = R.path(F); const hd = F.joints.head; const sc = F.scale;
    const u = norm2(from[0] - hd[0], from[1] - hd[1]); const ctr = [hd[0] + u[0] * 0.36 * sc, hd[1] + u[1] * 0.36 * sc];
    // narrow bright band first, then the wider faint one: each paints inside its circle, then one offset ink pass clipped only to the
    // body (so no seam at the circle), which leaves the narrower crescent alone because it lies inside the wider one
    [[0.007, 0.44, 0.95], [0.012, 0.56, 0.32]].forEach(([w, r, a]) => {
      g.save(); g.clip(p); g.beginPath(); g.arc(ctr[0], ctr[1], r * sc, 0, TAU); g.clip(); g.globalAlpha = a * k; g.fillStyle = C.phoneWhite; g.fillRect(ctr[0] - r * sc, ctr[1] - r * sc, 2 * r * sc, 2 * r * sc); g.restore();
      g.save(); g.clip(p); g.translate(-u[0] * w * sc, -u[1] * w * sc); g.fillStyle = C.ink; g.fill(p); g.restore();
    });
    if (o.em !== false) { const e = c.em; e.save(); e.globalAlpha = 0.16 * k; e.fillStyle = C.phoneWhite; e.beginPath(); e.arc(ctr[0] + u[0] * 0.2 * sc, ctr[1] + u[1] * 0.2 * sc, 0.16 * sc, 0, TAU); e.fill(); e.restore(); }
  }
  // a hand-held phone, upright, its lit face toward us, with bloom
  function handPhone(c, at, rot, glow, k) {
    const g = c.g; k = k || 1; const w = 70 * k, h = 136 * k;
    g.save(); g.translate(at[0], at[1]); g.rotate(rot);
    g.fillStyle = '#0B0D10'; g.beginPath(); g.roundRect(-w / 2 - 5 * k, -h / 2 - 5 * k, w + 10 * k, h + 10 * k, 14 * k); g.fill();
    g.fillStyle = O.mix(C.phoneWhite, C.ink, 0.1 + 0.62 * (1 - glow)); g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 10 * k); g.fill();
    g.globalAlpha = 0.16 * glow; g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(-w / 2, -h / 2 + 20 * k); g.lineTo(w / 2, -h / 2 - 6 * k); g.lineTo(w / 2, -h / 2 + 30 * k); g.lineTo(-w / 2, -h / 2 + 56 * k); g.closePath(); g.fill();
    g.restore();
    if (glow > 0) { const e = c.em; e.save(); e.translate(at[0], at[1]); e.rotate(rot); e.globalAlpha = 0.8 * glow; e.fillStyle = C.phoneWhite; e.fillRect(-w / 2 - 18, -h / 2 - 18, w + 36, h + 36); e.restore(); }
  }
  // Marina's type here: 46 px in a brighter mint, at full opacity (the kit's #86C4A2 sinks into these dark frames). The kit takes no
  // colour option for her face, so the face colour is swapped for the one call and restored.
  const MINT = '#A9F2CB';
  function sayM(g, who, txt, x, y, o) {
    if (who !== 'marina') return O.say(g, who, txt, x, y, o);
    const F = O.FACE.marina, c0 = F.color; F.color = MINT;
    try { return O.say(g, who, txt, x, y, o); } finally { F.color = c0; }
  }
  // sentence rows: the line's own text, split at sentence ends (Marina's grid takes one row per sentence)
  const sentences = txt => (txt.match(/[^.?!]+[.?!]+(\s|$)|[^.?!]+$/g) || [txt]).map(s => s.trim());
  function rowLine(def, gap, sizes) {
    const L = Object.assign({}, def);
    L.draw = (c, s, o) => {
      const parts = sentences(s.T.text); const n = s.T.text.length; let used = 0; const ent = s.T.ent;
      parts.forEach((p, i) => {
        const a = used / n, b = (used + p.length) / n; used += p.length + 1;
        const pp = ent ? clamp((o.p - a) / Math.max(1e-6, b - a), 0, 1) : 1; if (pp <= 0) return;
        const sz = sizes ? sizes[Math.min(i, sizes.length - 1)] : o.size;
        sayM(c.g, s.T.who, p, L.x + (L.dx || 0) * i, L.y + i * gap, Object.assign({}, o, { p: pp, size: sz, seed: 3 + i }));
      });
    };
    return L;
  }
  // a single-row line of Marina's in the brighter mint (drawn at its own x, y: keep y inside the 2.00 live area, 60..1020)
  const mintLine = def => Object.assign({}, def, { draw: (c, s, o) => sayM(c.g, s.T.who, s.T.text, def.x, def.y, o) });

  // ------------------------------------------------------------------ the table: Q08's final state, exactly
  const AT = T.anchors.top, CI = AT.circle; const LTOP = { x: 960, y: 540 };
  const ID4 = ['scott', 'marina', 'deena', 'angelo'];
  const CHAIRS_GONE = { kay: { out: -30, empty: true }, christof: { out: 90, dc: -24, rot: 0.3, empty: true } };
  const G6 = { scott: 0.3, kay: { fill: 0.45, lip: true }, marina: 0.3, deena: 1.05, angelo: 0.2 };
  const G4 = { scott: 0.3, marina: 0.3, deena: 1.05, angelo: 0.2, kay: false };   // the top view keeps Q08's four glasses (Kay's is off the table)
  const ALLPILES = ['scott', 'marina', 'deena', 'angelo', 'gap'].map(n => { const p = T.top.pile(n, { ring: 'seats' }); return { at: [p.x, p.y] }; });
  const CPILES = ALLPILES.map((p, i) => i === 4 ? { at: T.top.P(150, 150) } : p);   // as Q08's circle: the fifth card sits further in
  const PERF = { scott: 1, angelo: 1 }, PLEV = 0.63;   // 0.63: the strength Q08 warms the burn to at the let-go (0.62)
  const TOPS = { layout: 'circle', lampTired: 1, kitchenLight: 1, bottle: 1, chairs: CHAIRS_GONE, glasses: G4, piles: CPILES, perforations: PERF, perforationLevel: PLEV, fifthGlass: 1 };
  const REST = {}; ID4.forEach(id => { REST[id] = T.top.seatAt(id, { layout: 'circle' }).hands; });
  // THE CUT FROM Q08. Its last shot ('top: they all let go', 90.5-91.71) is matched exactly: camOn([960,560], 1.22, 960, 545) at
  // cams.circle's rotation, whole-pixel drift (0.6 px, 0.4 Hz, seed 8) on Q08's own clock, every freed hand sprung home open 42% of
  // the way in from its table spot, Marina's half-glance at the fifth glass, crown rim 4. Over the first 2 s the camera eases out to
  // Q09's own framing (cams.circle at 0.97) and the hands ease down onto the table.
  const CAM8 = T.camAt([960, 560], [960, 545], 1.22, T.cams.circle.rot);
  const CAM9 = Object.assign({}, T.cams.circle, { zoom: 0.97 });
  const T_SETTLE = 2.0;
  const q8End = () => { const s = (FILM.seqs || []).find(q => q.id === 'Q08'); return s ? s.dur : 91.71; };   // Q08's clock at the cut
  const SPRUNG = {}; ID4.forEach(id => { const s = T.top.seatAt(id, { layout: 'circle' }); SPRUNG[id] = s.hands.map(h => L2(h, [s.x, s.y], 0.42)); });
  const SETTLE = { marina: [0.2, 1.3], deena: [0.45, 1.15], scott: [0.4, 1.95], angelo: [0.6, 2.0] };   // Marina first, as she let go first
  const SEAT = {}; ID4.forEach(id => { SEAT[id] = T.top.seatAt(id, TOPS); });
  // a head turn toward a world point (the same sum RIG.top makes from look/lookAmt)
  function turnTo(id, tgt, amt) { const st = SEAT[id]; let w = Math.atan2(tgt[1] - st.y, tgt[0] - st.x) - st.dir; while (w > Math.PI) w -= TAU; while (w < -Math.PI) w += TAU; return clamp(w * amt, -1.1, 1.1); }
  const SP = id => [SEAT[id].x, SEAT[id].y];
  // the looks after the let-go (Marina starts where Q08 left her: half a glance at the fifth glass)
  const TOPLOOK = {
    marina: [[0, turnTo('marina', CI.fifthGlass, 0.5)], [1.2, turnTo('marina', CI.fifthGlass, 0.5)], [1.5, turnTo('marina', SP('deena'), 0.85)], [2.75, turnTo('marina', SP('deena'), 0.85)], [3.05, turnTo('marina', SP('angelo'), 0.85)], [3.85, turnTo('marina', SP('angelo'), 0.85)], [4.15, turnTo('marina', SP('scott'), 0.85)]],
    scott: [[0, 0], [1.45, 0], [1.9, turnTo('scott', CI.fifthGlass, 0.8)], [3.5, turnTo('scott', CI.fifthGlass, 0.8)], [4.1, turnTo('scott', SP('marina'), 0.8)]],
    deena: [[0, 0], [1.25, 0], [1.4, turnTo('deena', SP('marina'), 0.85)]],
    angelo: [[0, 0], [2.3, 0], [2.8, turnTo('angelo', CI.fifthGlass, 0.7)]],
  };
  // tb: the breath clock (Q08's, continued, so nobody jumps on the cut)
  function topCast(c, lt, tb) {
    ['deena', 'marina', 'angelo', 'scott'].forEach(id => {
      const st = SEAT[id]; const ht = R.key(id, lt, TOPLOOK[id]);
      const u = R.key(id, lt, [[SETTLE[id][0], 0], [SETTLE[id][1], 1]]);
      const hands = [0, 1].map(i => L2(SPRUNG[id][i], REST[id][i], u));
      const F = R.top(id, { x: st.x, y: st.y, dir: st.dir, scale: CI.figScale, hands, handPose: ['open', 'open'], spread: 0.02, foreshorten: true, t: tb == null ? lt : tb, nose: true, headTurn: ht });
      T.castTop(c, R.path(F), 0.42); R.draw(c.g, F, { light: LTOP, color: PAL.hot, w: 4, armRim: false });
    });
  }

  // ------------------------------------------------------------------ the low angle (F06 set), for the close shots at the table
  const LOWS = { lampTired: 1, kitchenLight: 1, empty: ['kay', 'christof'], piles: ALLPILES, glasses: G6, chairs: { angelo: { out: 30 } }, perforations: PERF, perforationLevel: PLEV, fifthGlass: 1 };
  const LL = T.lights.low; const LA = T.anchors.low.seats;
  function lowFar(c, lt, o) {
    o = o || {};
    if (o.angelo !== false) { const an = fig('angelo', { scale: LA.angelo.scale, facing: 1, pose: 'sit', t: lt, look: [960, 720], armN: { a: 0.75, b: 1.15 }, armF: { a: 0.6, b: 1.2 } }, LA.angelo.head[0], LA.angelo.head[1]); occlude(c, sil(c, an, LL, PAL.hot, 3)); }
    const sc = R.bust('scott', { x: LA.scott.head[0], y: LA.scott.head[1], scale: LA.scott.scale, t: lt }); occlude(c, sil(c, sc, LL, PAL.hot, 3));
  }

  // ------------------------------------------------------------------ the wall (the photographer's framing)
  const WA = T.anchors.wall; const WL = WA.light; const WSC = WA.scale; const SL = WA.slots;
  const WALLS = { lampTired: 1, perforations: PERF, perforationLevel: PLEV };
  const WALLV = { lampTired: 1, perforations: PERF, perforationLevel: 0.95 };   // under the veil: the burn reads at the same strength
  const bustAt = (id, x, o) => O.fig.bust(id, Object.assign({ waist: [x, WA.waistY], scale: WSC, tilt: (SL[id] || [0, 0])[1] }, o || {}));
  // the shuffle: everyone edges into place, nobody into the gap. Marina comes out from in front of Scott (where the inserts had her)
  const SHUF = { deena: { from: 70, t0: 0.0, d: 0.9 }, angelo: { from: -50, t0: 0.15, d: 1.1 }, scott: { from: 22, t0: 0.1, d: 1.3 }, marina: { from: -150, t0: 0.05, d: 1.1 } };
  const T_WALL = 13.65, T_HANDCU = 15.9, T_WALL2 = 16.95, T_FLASH = 17.5, T_HAND = T_WALL + 1.0, T_HANDON = T_WALL + 1.55;
  function wallGroup(lt) {
    const handU = R.key('marina', lt, [[T_HAND, 0], [T_HANDON, 1]]); const tremble = lt > T_HANDON;
    const busts = T.wallBusts(null, { hand: false, opts: { marina: { armL: 'none' } } });
    const out = busts.map(f => {
      const sh = SHUF[f.id]; const u = R.key(f.id, lt - T_WALL, [[sh.t0, 0], [sh.t0 + sh.d, 1]]); const dx = sh.from * (1 - u);
      return { id: f.id, b: f.b, dx, shape: dx ? S().add(f.b.shape).translate(dx, 0) : f.b.shape };
    });
    // Marina's near arm: from hanging at her side up across to the top of Scott's shoulder (as the set's wallBusts lays it)
    const m = out.find(f => f.id === 'marina'), s = out.find(f => f.id === 'scott');
    const shM = [m.b.shoulderL[0] + m.dx, m.b.shoulderL[1]], shS = [s.b.shoulderR[0] + s.dx, s.b.shoulderR[1]];
    // 7 Hz, sampled on ones (a nervous hand is not on twos)
    const tr = tremble ? Math.sin(lt * TAU * 7) * 0.02 * WSC + Math.sin(lt * TAU * 11.3) * 0.006 * WSC : 0;
    const A = [shM[0] + 0.06 * WSC, shM[1] + 0.32 * WSC];
    const down = [shM[0] - 0.05 * WSC, shM[1] + 1.55 * WSC];
    const on = [shS[0] + 0.12 * WSC, shS[1] - 0.04 * WSC + tr];
    const Wr = [lerp(down[0], on[0], handU), lerp(down[1], on[1], handU) - Math.sin(Math.PI * handU) * 0.25 * WSC];
    const arm = S().capsule(A[0], A[1], 0.22 * WSC, Wr[0], Wr[1], 0.14 * WSC);
    const ang = lerp(Math.PI / 2 + 0.15, Math.PI - 0.1, handU), HLn = 0.6 * WSC;   // fingers down at her side -> draped toward his neck
    const hand = O.fig.hand('relaxed').transform([Math.cos(ang) * HLn, Math.sin(ang) * HLn, Math.sin(ang) * HLn, -Math.cos(ang) * HLn, Wr[0], Wr[1]]);
    m.shape = S().add(m.shape).add(arm).add(hand);
    m.ring = [Wr[0] + Math.cos(ang) * 0.36 * WSC - Math.sin(ang) * 0.06 * WSC, Wr[1] + Math.sin(ang) * 0.36 * WSC + Math.cos(ang) * 0.06 * WSC];
    m.ringAng = ang;
    m.wrist = Wr; m.tr = tr; m.handPath = S().add(hand).capsule(lerp(A[0], Wr[0], 0.55), lerp(A[1], Wr[1], 0.55), 0.17 * WSC, Wr[0], Wr[1], 0.14 * WSC).path(0.5, 41);
    return out;
  }
  // the group: ink busts with a crescent on head and shoulder toward the wall lamp; Marina's ring flickers with the tremble
  function drawWallGroup(c, lt, grp, w, ring, o) {
    o = o || {}; const col = o.col || PAL.mid;
    if (w !== 0) grp.forEach((f, i) => {
      const p = f.shape.path(0.7, 3 + i); const hd = [f.b.head[0] + f.dx, f.b.head[1]];
      cres(c.g, p, hd, WSC, WL, col, { w: w || 3.2, cdy: 0.85, r0: 1.35, r1: 2.3, fill: o.fill });
      c.g.save(); c.g.translate(f.dx, 0); O.fig.drawDetails(c.g, f.b, { light: { x: WL.x - f.dx, y: WL.y }, rimColor: col, hoopColor: col, ringColor: 'rgba(0,0,0,0)', cigColor: O.mix(col, C.cardPaper, 0.3) }); c.g.restore();
    });
    const m = grp.find(f => f.id === 'marina'); if (m && m.ring && ring !== false) {
      const fk = lt > T_HANDON ? 0.45 + 0.55 * Math.abs(Math.sin(lt * TAU * 7 + 0.6)) : 0.45; const r = ring || 1;
      const g = c.g; const ax = [Math.cos(m.ringAng + Math.PI / 2), Math.sin(m.ringAng + Math.PI / 2)];
      g.save(); g.lineCap = 'round'; g.strokeStyle = GOLD; g.globalAlpha = 0.6 + 0.4 * fk; g.lineWidth = 3.4 * r;
      g.beginPath(); g.moveTo(m.ring[0] - ax[0] * 5 * r, m.ring[1] - ax[1] * 5 * r); g.lineTo(m.ring[0] + ax[0] * 5 * r, m.ring[1] + ax[1] * 5 * r); g.stroke();
      g.fillStyle = C.lighterCream; g.globalAlpha = fk * fk; g.beginPath(); g.arc(m.ring[0] - ax[0] * 2.5 * r, m.ring[1] - ax[1] * 2.5 * r, 1.4 * r, 0, TAU); g.fill(); g.restore();
      c.em.save(); c.em.globalAlpha = 0.55 * fk; c.em.fillStyle = GOLD; c.em.beginPath(); c.em.arc(m.ring[0], m.ring[1], 14 * r, 0, TAU); c.em.fill(); c.em.restore();
    }
  }
  // the wall seen closer: the background for the close shots after the photo (they are still standing against it), one band darker
  function wallBack(c, lt, cam, dim) { c.camera(cam); T.back(c, lt, WALLV, 'wall'); veil(c, dim == null ? 0.34 : dim); }
  const drawW = (c, F, o) => figDraw(c, F, WL, PAL.mid, Object.assign({ w: 3, cdy: 0.6, r0: 1.25, r1: 2.1 }, o || {}));

  // ------------------------------------------------------------------ the inserts at the wall: the gap, Scott's shoulder, her hand
  // The photographer's wall, closer: Angelo's shoulder at the left edge, the empty place with the burnt 'Scott.' in it, Scott's
  // bust, and Marina in front of his left shoulder, turned away (facing right), her ringed hand held back into the empty place.
  const CAMI = { x: 1180, y: 470, zoom: 1.6 };
  const MI = { head: [1572, 318], sc: 178 };
  const CAMI2 = { x: 1270, y: 470, zoom: 1.6 };   // after the flash: a little further right, her hand low in front of her
  function insertBack(c, lt, ang, cam) {
    c.camera(drift(cam || CAMI, lt, 0.5));
    T.back(c, lt, WALLV, 'wall'); veil(c, 0.3);
    const an = bustAt('angelo', 566 + (ang || 0)), sc = bustAt('scott', SL.scott[0]);
    cres(c.g, an.shape.path(0.7, 4), an.head, WSC, WL, PAL.mid, { w: 3, cdy: 0.85, r0: 1.35, r1: 2.3 });
    // Scott a shade lighter than the ink in front of him: midground, so her arm reads across his chest
    cres(c.g, sc.shape.path(0.7, 6), sc.head, WSC, WL, PAL.mid, { w: 3, cdy: 0.85, r0: 1.35, r1: 2.3, fill: '#1A1410' });
    O.fig.drawDetails(c.g, sc, { light: WL, rimColor: PAL.mid });
  }
  function insMarina(lt, armN, o) {
    return fig('marina', Object.assign({ scale: MI.sc, facing: 1, pose: 'stand', t: lt, idle: false, lean: 0.03, armN, armF: { a: 0.1, b: 0.25 } }, o || {}), MI.head[0], MI.head[1]);
  }
  // where a holding hand's phone sits: past the wrist along the forearm, standing up out of the fingers
  const phoneIn = (F, lift) => { const w = F.joints.wristN, e = F.joints.elbowN; const d = norm2(w[0] - e[0], w[1] - e[1]); return [w[0] + d[0] * 0.3 * MI.sc, w[1] + d[1] * 0.3 * MI.sc - (lift == null ? 0.3 : lift) * MI.sc]; };
  // her crescent: the head, and (in the inserts) the arm and hand too, which are what the shot is about
  const insDraw = (c, F, extra) => figDraw(c, F, WL, PAL.mid, Object.assign({ w: 3, regions: [[[F.joints.head[0], F.joints.head[1] + 0.45 * MI.sc], 1.2 * MI.sc, 1], [F.joints.wristN, 1.25 * MI.sc, 1], [L2(F.joints.elbowN, F.joints.wristN, 0.3), 0.95 * MI.sc, 0.55]], ring: { flicker: 1 } }, extra || {}));
  const OFFER_W = [1178, 575];   // the wrist, held back into the empty place (the phone stands just inside it)

  // ------------------------------------------------------------------ the phone (F08): three heads bent over Marina's screen
  const PA = T.anchors.phone; const PHL = { x: PA.phone.x, y: PA.phone.y };
  const PHEAD = {
    scott: { facing: 1, scale: 168, lean: 0.55, neck: 0.32, head: 0.66, armN: { a: 0.3, b: 0.4 }, armF: { a: 0.1, b: 0.3 } },
    deena: { facing: 1, scale: 206, lean: 0.5, neck: 0.26, head: 0.56, armN: { a: 0.15, b: 0.3 }, armF: { a: 0.05, b: 0.2 } },
    angelo: { facing: -1, scale: 210, lean: 0.3, neck: 0.5, head: 0.72, armN: { a: 0.12, b: 0.2 }, armF: { a: 0.05, b: 0.15 } },
  };
  // drawn into a cached layer: the screen light as a crescent on each head and the top of the shoulder only (as F08), never down the body
  function phoneHeads(c, lt, o, g) {
    o = o || {}; g = g || c.g;
    ['scott', 'deena', 'angelo'].forEach(id => {
      const p = Object.assign({ pose: 'stand', idle: false }, PHEAD[id], (o.pose || {})[id] || {});
      const hd = PA.heads[id]; const off = (o.off || {})[id] || [0, 0];
      const F = fig(id, p, hd[0] + off[0], hd[1] + off[1]);
      figDraw(c, F, PHL, C.phoneWhite, { g, em: false, occ: false, w: 3.2, cdy: 0.25, r0: 0.95, r1: 1.45, a1: 0.42, details: { hoopColor: O.mix(C.phoneWhite, C.ink, 0.3), cigColor: O.mix(C.phoneWhite, C.ink, 0.25) } });
      R.faceLight(g, F, [PHL.x, PHL.y - 40], { color: C.phoneWhite, lit: 0.8 });
    });
  }
  // Angelo's hand from the lower right: thumb and index spread over the glass (u 0 closed -> 1 open), then lifted clear (v 0 -> 1)
  function pinch(cx, u, v) {
    const B = [1075, 650], sp = 24 + 112 * u; const lift = [560 * v, 470 * v];
    const P = q => [q[0] + lift[0], q[1] + lift[1]];
    const Ti = P([B[0] + 0.5 * sp, B[1] - 0.55 * sp]), Tt = P([B[0] - 0.55 * sp, B[1] + 0.42 * sp]);   // index tip up-right, thumb tip down-left
    const Pm = P([B[0] + 165, B[1] + 160]);                                                             // the palm, low right
    const Ki = [Pm[0] - 40, Pm[1] - 78], Kt = [Pm[0] - 88, Pm[1] - 4];
    const bend = (a, b, f, k) => { const d = norm2(b[0] - a[0], b[1] - a[1]); return [lerp(a[0], b[0], f) - d[1] * k, lerp(a[1], b[1], f) + d[0] * k]; };
    const I1 = bend(Ki, Ti, 0.42, -9), I2 = bend(Ki, Ti, 0.74, -4), T1 = bend(Kt, Tt, 0.5, 10);
    const h = S()
      .capsule(Ki[0], Ki[1], 28, I1[0], I1[1], 24).capsule(I1[0], I1[1], 23.5, I2[0], I2[1], 21).capsule(I2[0], I2[1], 20.5, Ti[0], Ti[1], 18)   // index: three joints
      .capsule(Kt[0], Kt[1], 34, T1[0], T1[1], 26).capsule(T1[0], T1[1], 25, Tt[0], Tt[1], 20)                                                 // thumb: two
      .ellipse(Pm[0] + 4, Pm[1] - 4, 94, 78, -0.75)                                                                                               // the palm
      .capsule(Pm[0] + 4, Pm[1] - 80, 26, Pm[0] + 36, Pm[1] - 92, 23).capsule(Pm[0] + 40, Pm[1] - 56, 25, Pm[0] + 74, Pm[1] - 64, 22)          // the curled fingers' knuckles
      .capsule(Pm[0] + 66, Pm[1] - 26, 23, Pm[0] + 96, Pm[1] - 28, 20)
      .capsule(Pm[0] + 40, Pm[1] + 40, 72, Pm[0] + 900, Pm[1] + 640, 130);                                                                       // the wrist and forearm, out of frame
    // lit only on the hand, from the screen (up-left): the forearm falls away dark
    const hc = L2(Pm, B, 0.45);
    cres(cx, h.path(0.5, 7), hc, 100, null, C.phoneWhite, { dir: [-0.55, -0.85], w: 3, regions: [[hc, 330, 0.45], [hc, 230, 0.95]] });
  }

  // ------------------------------------------------------------------ the corridor
  const HC = HL.anchors.corridor; const HLC = HL.lights.corridor;
  const CORR = (o) => Object.assign({ bathDoor: 0, spill: 0.35, endLight: 1, underDoor: 1, kayAfterimage: 1, lampTired: 1 }, o || {});
  const FIGK = 279.4;    // corridor figure scale per unit of floor projection (HL.scaleAt)
  const STOP_T = 49.70;  // the frame Scott's hand stops short of the handle; Kay's afterimage dies on it
  const T_TALLY = 44.8, T_PROC = 45.3;   // the tally is exactly 12 frames (44.8 -> 45.3)
  const T_HANDLE = 50.6;                // the dead wall holds 0.9 s before the handle insert
  // the four keep facing LEFT, the way they left the room: three drift left down the hall toward the kitchen doorway (their screen
  // x falls as they go deeper), Scott, last out, cuts diagonally across to the bathroom door and stops there (facing it: left).
  const PROC = {   // X(dt) = X0 + vX dt + aX dt^2: each curves in toward the kitchen doorway (X -1.45..-0.55 at the far wall)
    deena: { Z0: 4.0, X0: -0.62, vZ: 0.72, vX: -0.17, aX: 0 },
    angelo: { Z0: 3.35, X0: -0.12, vZ: 0.7, vX: -0.14, aX: -0.012 },
    marina: { Z0: 2.3, X0: 0.2, vZ: 0.7, vX: -0.02, aX: -0.04 },
  };
  const SC_A = [0.3, 1.82], SC_B = [-1.42, 2.98], T_SARR = 48.75;
  function walkPos(id, lt) {
    if (id === 'scott') { const u = clamp((lt - T_PROC) / (T_SARR - T_PROC), 0, 1); const e = u < 0.85 ? u / 0.85 * 0.92 : 0.92 + 0.08 * Math.sin((u - 0.85) / 0.15 * Math.PI / 2); return [lerp(SC_A[0], SC_B[0], e), lerp(SC_A[1], SC_B[1], e)]; }
    const p = PROC[id]; const dt = Math.max(0, lt - T_PROC); return [p.X0 + p.vX * dt + p.aX * dt * dt, p.Z0 + p.vZ * dt];
  }
  // the kitchen's light is at the far end, low: each body throws a long shadow back down the runner toward the lens
  function longShadow(c, F, foot, alpha) {
    const vp = HC.vp; const d = norm2(foot[0] - vp[0], foot[1] - vp[1]); const L = 1.25; const dX = d[0] * L, dY = d[1] * L * 0.55;
    const g = c.g; g.save(); g.beginPath(); g.rect(-200, foot[1] - 40, 2400, 1400); g.clip();
    g.transform(1, 0, -dX, -dY, dX * foot[1], foot[1] * (1 + dY)); g.globalAlpha = alpha; g.fillStyle = '#040303'; g.fill(R.path(F)); g.restore();
  }
  const PER = { scott: 1.04, deena: 0.9, angelo: 1.12, marina: 0.96 };
  function walker(c, id, lt) {
    const [X, z] = walkPos(id, lt); if (z > 6.38) return null;   // through the kitchen doorway
    const fp = HL.floor('corridor', X, z); const k = FIGK * fp[2];
    let wk;
    if (id === 'scott') wk = R.walk(id, lt, { x0: 0, scale: k, facing: -1, t0: T_PROC, dist: 11.5 * k, speed: PER.scott * 6 / 2 / (T_SARR - T_PROC) });
    else wk = R.walk(id, lt, { x0: 0, scale: k, facing: -1, t0: T_PROC - 0.37 * (id.length % 3) - 2 });
    const dx = fp[0] - wk.x;
    const spec = Object.assign({}, wk, { x: fp[0], y: fp[1], scale: k, t: lt }, wk.feet && wk.feet.N ? { feet: { N: [wk.feet.N[0] + dx, wk.feet.N[1], wk.feet.N[2]], F: [wk.feet.F[0] + dx, wk.feet.F[1], wk.feet.F[2]] } } : {});
    return { id, F: R.figure(id, spec), z, fp, k };
  }
  function drawWalkers(c, ws) {
    ws = ws.filter(Boolean).sort((a, b) => b.z - a.z);
    ws.forEach(w => longShadow(c, w.F, w.fp, 0.78));
    ws.forEach(w => {
      const p = figDraw(c, w.F, HLC, HLC.color, { fill: '#070505', w: 2.4, cdy: 0.55, r0: 1.25, r1: 2.0, a1: 0.4, occ: false, details: { hoopColor: HLC.color, ringColor: 'rgba(0,0,0,0)' } });
      HL.occlude(c, p);
    });
  }
  // Kay's L086 afterimage once more over the set's own pass (the set caps it at 8%; two passes read about 16%): the same slices
  const CRP = (() => { const a = HL.floor('corridor', 0, 1), b = HL.floor('corridor', 1, 1); const vp = HC.vp; const f = b[0] - a[0]; return { vx: vp[0], vy: vp[1], f, eye: (a[1] - vp[1]) / f, xl: -1.9 }; })();
  const CPq = (X, Y, Z) => { const z = Math.max(0.05, Z); return [CRP.vx + CRP.f * X / z, CRP.vy - CRP.f * (Y - CRP.eye) / z]; };
  let KTX = null;
  function kayTex() {
    if (KTX) return KTX; const e = FILM.byId && FILM.byId.L086; if (!e) return null;
    const F = (O.FACE && O.FACE.kay) || { family: 'Cormorant Garamond', weight: 600, style: 'italic' };
    const fs = O.font({ family: F.family, weight: F.weight, style: F.style, size: 90 });
    const ready = !(document.fonts && document.fonts.check) || document.fonts.check(fs, e.text);
    const m = O.makeCanvas(8, 8).getContext('2d'); m.font = fs; const w = Math.ceil(m.measureText(e.text).width) + 40;
    const cv = O.makeCanvas(w, 130), g = cv.getContext('2d'); g.font = fs; g.fillStyle = C.tKay; g.fillText(e.text, 20, 96);
    const out = { cv, w, h: 130 }; if (ready) KTX = out; return out;
  }
  function kayAgain(c, a) {
    if (!(a > 0)) return; const Tx = kayTex(); if (!Tx) return; const g = c.g, xl = CRP.xl + 0.004, n = 48;
    const zA = 2.08, zB = zA + Tx.w * 0.3 / Tx.h, yT = 1.3, yB = 1.0;
    g.save(); g.globalAlpha = a;
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n, z0 = lerp(zA, zB, u0), z1 = lerp(zA, zB, u1), zm = (z0 + z1) / 2;
      const p0 = CPq(xl, yT, z0), p1 = CPq(xl, yT, z1), pb = CPq(xl, yB, zm), pt = CPq(xl, yT, zm);
      g.drawImage(Tx.cv, u0 * Tx.w, 0, (u1 - u0) * Tx.w, Tx.h, p0[0], pt[1], p1[0] - p0[0] + 0.6, pb[1] - pt[1]);
    }
    g.restore();
  }

  // a hand about to take something, seen side-on: fingers together and curved, the thumb apart below them, the C of the grip open
  // toward the target (local: wrist 0,0, fingers along +x, palm side +y; length 1). curl 0 = straight .. 1 = closed hook
  function graspHand(curl) {
    const h = S().capsule(0.02, 0.0, 0.17, 0.4, -0.01, 0.15).ellipse(0.22, 0.02, 0.22, 0.155, 0);
    [[-0.085, 0.38, 0.056], [-0.035, 0.42, 0.058], [0.015, 0.39, 0.055], [0.06, 0.31, 0.05]].forEach(([y0, len, r], i) => {
      let x = 0.4 + 0.012 * i, y = y0, a = -0.04 + 0.03 * i; const segs = [0.46, 0.31, 0.23];
      segs.forEach((f, j) => { const nx = x + Math.cos(a) * len * f, ny = y + Math.sin(a) * len * f; h.capsule(x, y, r * (1 - 0.1 * j), nx, ny, r * (0.92 - 0.1 * j)); x = nx; y = ny; a += curl * (0.5 + 0.12 * j); });
    });
    const t0 = [0.12, 0.09], t1 = [0.3, 0.2 + 0.03 * curl], t2 = [0.44 - 0.04 * curl, 0.24 + 0.05 * curl];
    h.capsule(t0[0], t0[1], 0.085, t1[0], t1[1], 0.066).capsule(t1[0], t1[1], 0.064, t2[0], t2[1], 0.054);
    return h;
  }
  // a forearm and that hand reaching in from off frame (the handle insert): wrist w, fingers along dir, length Lh, from
  function reachHand(c, w, dir, Lh, from, rimCol, lightDir, curl, flip) {
    const cs = Math.cos(dir), sn = Math.sin(dir), fl = flip || 1; const hs = graspHand(curl).transform([cs * Lh, sn * Lh, -sn * Lh * fl, cs * Lh * fl, w[0], w[1]]);
    const arm = S().capsule(from[0], from[1], Lh * 0.36, w[0], w[1], Lh * 0.17).add(hs);
    T.silFill(c.g, arm.path(0.6, 23), '#070505', lightDir.dx, lightDir.dy, 3, rimCol, 0.8);
    return arm;
  }

  // ================================================================== SHOTS
  const shots = [];
  const shot = (at, name, draw, extra) => shots.push(Object.assign({ at, name, draw }, extra || {}));

  // 1 TOP: Q08's last frame, exactly. Everyone has let go. Over 2 s the camera eases out to Q09's framing and the hands come down
  // onto the table; then a breath, the looks; then Marina.
  shot(0, 'top: the circle broken', (c, st, lt) => {
    const t8 = q8End() + lt;   // Q08's clock, continued: the drift, the breath and the ember flicker carry across the cut
    const u = seg(lt, 0, T_SETTLE, 'inOutSine'); const d = FILM.shake(t8, 0.6, 0.4, 8);
    c.camera({ x: lerp(CAM8.x, CAM9.x, u), y: lerp(CAM8.y, CAM9.y, u), zoom: lerp(CAM8.zoom, CAM9.zoom, u), rot: CAM9.rot, dx: Math.round(d.dx), dy: Math.round(d.dy) });
    T.back(c, t8, TOPS, 'top'); topCast(c, lt, t8); T.front(c, t8, TOPS, 'top');
  });
  // 2 LOW: Deena, close, in front of the dark hall doorway. 'Of what?'
  shot(5.3, 'low: Deena', (c, st, lt) => {
    c.camera({ x: 860, y: 440, zoom: 1.35 });
    T.back(c, lt, LOWS, 'low', { part: 'wall' }); lowFar(c, lt, { angelo: false }); T.back(c, lt, LOWS, 'low', { part: 'table' });
    const snapU = R.key('deena', st, [[0.05, 0], [0.4, 1]]);
    const de = fig('deena', { scale: 300, facing: 1, pose: 'sit', t: lt, look: [lerp(1100, 1900, snapU), lerp(700, 380, snapU)], lookAmt: 1, lean: 0.12, armN: { a: 0.55, b: 1.0 }, armF: { a: 0.6, b: 1.1 } }, 690, 430);
    figDraw(c, de, LL, PAL.hot, { w: 3.4, cdy: 0.55, r0: 1.1, r1: 1.8, details: { hoopColor: C.tungstenMid } });
    T.front(c, lt, LOWS, 'low');
  });
  // 3 LOW: Marina, close, against the kitchen door's glow. 'Us. All of us. Right now.' The phone comes up; its light on her face only.
  shot(6.6, 'low: Marina, the phone out', (c, st, lt) => {
    c.camera({ x: 1250, y: 450, zoom: 1.3 });
    T.back(c, lt, LOWS, 'low', { part: 'wall' }); lowFar(c, lt); T.back(c, lt, LOWS, 'low', { part: 'table' });
    const H0 = [1560, 440], sc = 300;
    const base = place('marina', { scale: sc, facing: -1, pose: 'sit', lean: 0.04 }, H0[0], H0[1]); const sk = R.skeleton('marina', base).sk; const S0 = sk.S0;
    const lo = sk.toPx([S0[0] + 0.45, S0[1] + 2.6]), hi = sk.toPx([S0[0] + 1.05, S0[1] + 0.05]);
    const u = R.key('marina', lt, [[7.75, 0], [8.55, 1]]);
    const hold = u > 0.02 ? { N: { kind: 'phoneLook', at: [lerp(lo[0], hi[0], u), lerp(lo[1], hi[1], u)], glow: u > 0.55 } } : {};
    const ma = R.figure('marina', Object.assign({}, base, { t: lt, look: u > 0.55 ? null : [700, 420], lookAmt: 0.9, hold, armF: { a: 0.5, b: 1.1 } }));
    const hn = ma.holds && ma.holds.N; const lit = hn && u > 0.55 ? seg(lt, 8.25, 8.5) : 0;
    figDraw(c, ma, LL, PAL.hot, { w: 3.4, cdy: 0.55, r0: 1.1, r1: 1.8, props: false, ring: { flicker: 0.8 },
      mid: g => {   // the phone itself: a dark slab between her fingers and thumb, its lit edge toward her face
        if (!hn) return; const hd = ma.joints.head, P = hn.tip; const n = norm2(hd[0] - P[0], hd[1] - P[1]), ax = [-n[1], n[0]]; const Lp = 0.62 * sc, Tk = 0.065 * sc;
        const q = (s, v) => [P[0] + ax[0] * s + n[0] * v, P[1] + ax[1] * s + n[1] * v];
        g.fillStyle = '#15171B'; g.beginPath(); [q(-Lp / 2, -Tk / 2), q(Lp / 2, -Tk / 2), q(Lp / 2, Tk / 2), q(-Lp / 2, Tk / 2)].forEach((pt, i) => i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1])); g.closePath(); g.fill();
        if (lit > 0) { const a = q(-Lp / 2 + 0.03 * sc, Tk / 2), b = q(Lp / 2 - 0.03 * sc, Tk / 2); g.save(); g.globalAlpha = lit; g.strokeStyle = C.phoneWhite; g.lineCap = 'round'; g.lineWidth = Math.max(2, sc * 0.016); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore();
          const e = c.em; e.save(); e.globalAlpha = 0.75 * lit; e.strokeStyle = C.phoneWhite; e.lineWidth = sc * 0.07; e.beginPath(); e.moveTo(a[0], a[1]); e.lineTo(b[0], b[1]); e.stroke(); e.restore(); }
      } });
    if (hn && lit > 0) screenGlow(c, ma, hn.screen || hn.tip, lit);
    T.front(c, lt, LOWS, 'low');
  });
  // 4 INSERT, at the wall: she holds the phone back into the empty place at Scott's right, to whoever is there. She does not look.
  shot(9.6, 'insert: the offer, into the gap', (c, st, lt) => {
    insertBack(c, lt, -50);
    const ext = R.key('marina', st, [[0, 0.62], [0.55, 1]]);
    const F = insMarina(lt, { to: L2([1330, 640], OFFER_W, ext), hand: 'hold', elbow: 'down' }, { look: [2300, 300], lookAmt: 0.5 });
    handPhone(c, phoneIn(F), -0.06 - 0.05 * (1 - ext), 1, 0.85);
    insDraw(c, F);
  });
  // 5 INSERT, cut: the same framing; the hand is empty, still curled round nothing. Then the fingers give up the shape and it withdraws.
  shot(11.1, 'insert: the hand is empty', (c, st, lt) => {
    insertBack(c, lt, -50);
    const back = R.key('marina', st, [[1.5, 0], [2.4, 1]]);
    const open = R.key('marina', st, [[1.15, 0], [1.4, 1]]);
    const F = insMarina(lt, { to: L2(OFFER_W, [1610, 790], back), hand: open > 0.5 ? 'relaxed' : 'hold', elbow: 'down' }, { look: [2300, 300], lookAmt: 0.5 });
    insDraw(c, F);
  });
  // 6a WALL: the four against the wall, from exactly where the photographer stands. The shuffle. Her hand on his shoulder.
  shot(T_WALL, 'wall: the four, the shuffle', (c, st, lt) => {
    c.camera(drift(T.cams.wall, lt, 0.5));
    T.back(c, lt, WALLS, 'wall'); drawWallGroup(c, lt, wallGroup(lt)); T.front(c, lt, WALLS, 'wall');
    lift(c, WLIFT);
  });
  // 6b WALL, close: her hand trembles on his shoulder; the ring flickers. The flash charges.
  shot(T_HANDCU, 'wall: her hand on his shoulder', (c, st, lt) => {
    const grp = wallGroup(lt); const m = grp.find(f => f.id === 'marina');
    c.camera({ x: m.wrist[0] - 40, y: m.wrist[1] - 60, zoom: 2.2 + 0.03 * st });
    T.back(c, lt, WALLS, 'wall'); drawWallGroup(c, lt, grp, 1.6, false);
    // her hand and forearm against his dark shoulder: lit along their upper edge so the fingers read where they lie on him
    const hp = m.handPath; if (hp) { c.g.save(); c.g.clip(hp); c.g.fillStyle = PAL.hot; c.g.fill(hp); c.g.translate(1.6, 2.2); c.g.fillStyle = C.ink; c.g.fill(hp); c.g.restore(); }
    drawWallGroup(c, lt, [m], 0, 1.4);
    lift(c, WLIFT);
  });
  // 6c WALL, in the photo's own framing: hold. The whine. SHUTTER: three frames of flash from whoever stands where the lens is.
  // The flash washes out the burn on the wall, so the picture on the phone shows a clean empty place.
  const CAMF = { x: 970, y: 440, zoom: 1.045 };
  shot(T_WALL2, 'wall: the shutter (17.5)', (c, st, lt) => {
    const fl = lt < T_FLASH ? 0 : lt < T_FLASH + 3 / 24 ? 1 : clamp(1 - (lt - T_FLASH - 3 / 24) / (6 / 24), 0, 1);
    c.camera(fl > 0 ? CAMF : drift(CAMF, lt, 0.5));
    const grp = wallGroup(lt);
    const s = Object.assign({}, WALLS, { flash: fl, perforations: fl > 0 ? 0 : PERF, figs: fl > 0 ? grp.map(f => f.shape) : null });
    T.back(c, lt, s, 'wall'); if (fl < 1) drawWallGroup(c, lt, grp, 3.2, fl > 0 ? false : 1); T.front(c, lt, s, 'wall');
    lift(c, WLIFT * (1 - fl));   // not on top of the flash itself
    // the shutter: ONE soft white lift to ~60% over the flash's first 2 frames (before grain and vignette, so the edges stay soft and
    // the mattes black). With the flash-lit frames under it this is a single rise and fall: one flash, inside the 3-per-second budget.
    const ff = Math.floor((lt - T_FLASH) * 24 + 1e-4);
    if (ff >= 0 && ff < 2) c.before.push(cx => { cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 0.6; cx.fillStyle = '#FFFFFF'; cx.fillRect(0, 0, O.W, O.H); cx.restore(); });
  });
  // 7 INSERT: across the flash, the phone is back in her hand, low in front of her. A jolt. She looks down at it.
  shot(17.92, 'insert: the phone is back', (c, st, lt) => {
    insertBack(c, lt, 0, CAMI2);
    const jolt = st < 0.45 ? Math.sin(st * TAU * 9) * 7 * (1 - st / 0.45) : 0;
    const look = R.key('marina', st, [[0.3, 0], [0.75, 1]]);
    const W0 = [1690 + jolt, 680];
    const F = insMarina(lt, { to: W0, hand: 'hold', elbow: 'down' }, { look: [lerp(2300, 1760, look), lerp(300, 700, look)], lookAmt: lerp(0.5, 1, look), lean: 0.03 + 0.06 * look });
    const ph = phoneIn(F, 0.22);
    handPhone(c, ph, 0.12, 1, 0.85);
    insDraw(c, F);
    screenGlow(c, F, ph, 0.25 + 0.6 * look);
  });
  // 8 PHONE (F08): they crowd round the screen. Four in the picture. None of them holding the phone.
  shot(19.5, 'phone: four in the picture', (c, st, lt) => {
    c.camera({ x: 960, y: 540, zoom: 1 });
    T.back(c, lt, {}, 'phone');
    const lean = R.key('scott', st, [[0, 0], [0.7, 1]]);
    const jerk = R.key('deena', lt, [[20.1, 0], [20.25, 1], [21.4, 1], [21.9, 0]]);   // 'Four.': her head comes up off the screen, then back down to it
    T.cacheLayer(c, 'Q09:heads8', q => phoneHeads(c, lt, { pose: { deena: { head: 0.56 - 0.32 * jerk, neck: 0.26 - 0.12 * jerk } }, off: { scott: [0, -50 * (1 - lean)], deena: [-40 * (1 - lean), -30 * (1 - lean) - 14 * jerk], angelo: [50 * (1 - lean), -40 * (1 - lean)] } }, q), lean.toFixed(3) + ':' + jerk.toFixed(2));
    const tq = lt > 22.2 ? 1 : 0.5;   // 'I can see that.': her hand is not as steady as her voice
    T.front(c, lt, { tremble: tq, zoom: 1, phone: { x: PA.phone.x + Math.sin(lt * TAU * 7) * 1.4 * tq, y: PA.phone.y + Math.sin(lt * TAU * 7 + 1.3) * 1.1 * tq, rot: PA.phone.rot + Math.sin(lt * TAU * 3.1) * 0.003 * tq } }, 'phone');
  });
  // 9 PHONE: Angelo zooms in on the empty place. Sharp. Taken from several feet away. His hand lifts clear before the question.
  const T_PINCH = 24.95, T_LIFT = T_PINCH + 18 / 24;
  shot(24.6, 'phone: Angelo zooms', (c, st, lt) => {
    const pu = seg(lt, T_PINCH, T_PINCH + 18 / 24, 'inOutCubic'), lv = seg(lt, T_LIFT - 2 / 24, T_LIFT + 4 / 24, 'inCubic');
    c.camera({ x: 1000, y: 650, zoom: 1.15 });
    T.back(c, lt, {}, 'phone');
    T.cacheLayer(c, 'Q09:heads9', q => phoneHeads(c, lt, { pose: { angelo: { head: 0.8 } } }, q), 'z');
    const show = lt > 24.72 && lv < 1;
    T.front(c, lt, { tremble: true, zoom: 1 + 1.2 * pu, overScreen: show ? cx => pinch(cx, pu, lv) : null }, 'phone');
  });
  // 10 REVERSE: the empty patch of floor where the photographer stood.
  shot(27.2, 'top: where the photographer stood', (c, st, lt) => {
    const gf = T.cams.gapFloor; c.camera(Object.assign({}, gf, { zoom: gf.zoom * (0.8 + 0.01 * st) }));
    T.back(c, lt, TOPS, 'top'); T.front(c, lt, TOPS, 'top');
  });
  // 11 TWO-SHOT at the wall: 'Christof.' 'Kay.' — at once. Then both look to the hall on the same frame.
  const T_NAMES = 29.45, T_LOOK = 30.4;
  const CAM11 = { x: 1240, y: 470, zoom: 1.3 };
  shot(29.2, 'wall: the names collide', (c, st, lt) => {
    wallBack(c, lt, CAM11);
    const lk = R.key('scott', lt, [[T_LOOK, 0], [T_LOOK + 0.3, 1]]); const mk = R.key('marina', lt, [[T_LOOK, 0], [T_LOOK + 0.3, 1]]);
    const tr = R.turn('scott', lt, T_LOOK, 1, -1);
    const sc = fig('scott', { facing: tr.facing, squash: tr.squash, view34: tr.view34, scale: 190, pose: 'stand', t: lt, lean: lerp(0.32, 0.06, lk), neck: lerp(0.3, 0, lk), head: lerp(0.5, -0.06, lk), armN: { a: 0.25, b: 0.4 }, armF: { a: 0.1, b: 0.3 } }, 1075, 430 - 30 * lk);
    const ma = fig('marina', { facing: -1, scale: 190, pose: 'stand', t: lt, lean: lerp(0.3, 0.02, mk), neck: lerp(0.32, -0.04, mk), head: lerp(0.55, -0.1, mk), look: mk > 0.5 ? [-600, 380] : null,
      hold: { N: { kind: 'phoneOffer', at: [1265, 700 + 20 * mk], glow: true } } }, 1420, 440 - 30 * mk);
    drawW(c, sc); drawW(c, ma, { ring: { flicker: 0.7 } });
  });
  // 12 THE EMPTY HALL
  shot(31.4, 'corridor: the empty hall', (c, st, lt) => {
    c.camera(drift({ x: 960, y: 540, zoom: 1 + 0.01 * st }, lt));
    HL.draw(c, lt, CORR(), 'corridor');
  });
  // 13 MARINA: 'No. I gave it to--' She stops. She looks at her own hand.
  shot(33.2, 'wall: Marina, her own hand', (c, st, lt) => {
    wallBack(c, lt, { x: 1520, y: 430, zoom: 1.75 });
    const lk = R.key('marina', lt, [[34.3, 0], [34.85, 1]]);
    const hand = R.key('marina', lt, [[34.15, 0], [34.75, 1]]);
    const ma = fig('marina', { facing: -1, scale: 215, pose: 'stand', t: lt, lean: lerp(0.0, 0.1, lk), neck: lerp(-0.02, 0.3, lk), head: lerp(-0.05, 0.6, lk), look: lk > 0.4 ? [1375, 610] : [-400, 420],
      hold: { N: { kind: 'reach', at: [lerp(1460, 1370, hand), lerp(860, 610, hand)], elbow: 'down' } } }, 1600, 420);
    drawW(c, ma, { w: 2.8, regions: [[[ma.joints.head[0], ma.joints.head[1] + 0.5 * 215], 1.2 * 215, 1], [ma.joints.wristN, 0.9 * 215, 1]], ring: { flicker: 0.6 + 0.4 * Math.abs(Math.sin(lt * 5)) } });
  });
  // 14 SCOTT: 'Kay's in the bathroom.' (to the hall)
  shot(36.2, 'wall: Scott', (c, st, lt) => {
    wallBack(c, lt, { x: 1460, y: 440, zoom: 1.75 + 0.01 * st });
    const sc = fig('scott', { facing: -1, scale: 215, pose: 'stand', t: lt, lean: 0.04, neck: 0.0, head: 0.02, look: [-500, 400], armN: { a: 0.15, b: 0.3 }, armF: { a: 0.05, b: 0.2 } }, 1500, 430);
    drawW(c, sc, { w: 2.8 });
  });
  // 15 ANGELO: 'And Christof's in the kitchen.' He doesn't raise his voice. That is somehow worse.
  shot(38.9, 'wall: Angelo', (c, st, lt) => {
    wallBack(c, lt, { x: 560, y: 450, zoom: 1.75 }, 0.4);
    const an = fig('angelo', { facing: 1, scale: 215, pose: 'stand', t: lt, idle: false, lean: 0.14, neck: 0.32, head: 0.55, armN: { a: 0.08, b: 0.15 }, armF: { a: 0.04, b: 0.1 } }, 510, 455);
    drawW(c, an, { w: 2.8 });
  });
  // 16 WALL: 'Then let's go get them.' 'Together.' Everyone turns to the hall door (frame left). No one argues.
  const T_DEENA = 41.5, T_ANG = 43.0;
  shot(41.4, 'wall: together', (c, st, lt) => {
    c.camera(drift({ x: 960, y: 540, zoom: 1.04 }, lt));
    T.back(c, lt, WALLV, 'wall'); veil(c, 0.3);
    const PH = [1080, 690];
    const dU = R.key('deena', lt, [[T_DEENA, 0], [T_DEENA + 0.25, 1]]), aU = R.key('angelo', lt, [[T_ANG, 0], [T_ANG + 0.5, 1]]), sU = R.key('scott', lt, [[42.3, 0], [43.0, 1]]), mU = R.key('marina', lt, [[42.2, 0], [42.9, 1]]);
    const dT = R.turn('deena', lt, T_DEENA + 0.08, 1, -1), aT = R.turn('angelo', lt, T_ANG + 0.2, 1, -1);
    const F = [];
    F.push(fig('deena', { facing: dT.facing, squash: dT.squash, scale: 150, pose: 'stand', t: lt, lean: lerp(0.4, 0.02, dU), neck: lerp(0.25, -0.05, dU), head: lerp(0.5, -0.12, dU), look: dU > 0.5 ? [-300, 420] : PH }, 430 + 10 * dU, 455 - 40 * dU));
    F.push(fig('angelo', { facing: aT.facing, squash: aT.squash, view34: aT.view34, scale: 150, pose: 'stand', t: lt, lean: lerp(0.35, 0.04, aU), neck: lerp(0.4, 0.05, aU), head: lerp(0.6, 0.05, aU), look: aU > 0.6 ? [-300, 420] : PH }, 700, 470 - 40 * aU));
    F.push(fig('scott', { facing: -1, scale: 150, pose: 'stand', t: lt, lean: lerp(0.4, 0.06, sU), neck: lerp(0.3, 0.05, sU), head: lerp(0.55, 0.05, sU), look: sU > 0.5 ? [-300, 430] : PH }, 1250, 462 - 35 * sU));
    F.push(fig('marina', { facing: -1, scale: 150, pose: 'stand', t: lt, lean: lerp(0.3, 0.05, mU), neck: lerp(0.3, 0.05, mU), head: lerp(0.5, 0.0, mU), look: mU > 0.5 ? [-300, 430] : PH,
      hold: mU < 0.5 ? { N: { kind: 'phoneOffer', at: PH, glow: true } } : { N: { kind: 'phoneLow', glow: true } } }, 1530, 460 - 35 * mU));
    F.forEach(f => drawW(c, f, { w: 2.8 }));
    T.front(c, lt, WALLS, 'wall');
  });
  // 17 TALLY: four marks, all scratched by the 6th frame and held (12 frames in all).
  const TALLY_O = { marks: 4, seed: 9, gapT: 1.5 / 24 };
  shot(T_TALLY, 'tally: four', (c, st) => { TI.tally(c, st + 1 / 24, TALLY_O); }, { post: { vignette: 0.4, halation: 0.7 } });
  // 18 CORRIDOR: the procession past the closed bathroom door, still facing the way they left the room; four long shadows to the lens
  shot(T_PROC, 'corridor: the procession', (c, st, lt) => {
    c.camera(drift({ x: 960, y: 540, zoom: 1 + 0.004 * st }, lt));
    const cs = CORR(); HL.back(c, lt, cs, 'corridor');
    drawWalkers(c, ['deena', 'angelo', 'marina', 'scott'].map(id => walker(c, id, lt)));
    HL.front(c, lt, cs, 'corridor');
  });
  // 19 CORRIDOR, closer: Scott stops at the door, facing it. His hand goes toward the handle. Stops. The afterimage dies on that frame.
  shot(48.6, 'corridor: Scott at the door', (c, st, lt) => {
    c.camera(Object.assign({}, HL.cams.corridor_door, { zoom: 1.3 + 0.004 * st }));
    const alive = lt < STOP_T; const cs = CORR({ kayAfterimage: alive ? 1 : 0 });
    HL.back(c, lt, cs, 'corridor'); if (alive) kayAgain(c, 0.09);
    const ws = ['deena', 'angelo', 'marina'].map(id => walker(c, id, lt));
    const sw = walker(c, 'scott', lt);
    const reach = R.key('scott', lt, [[48.95, 0], [STOP_T, 1]]);
    if (reach > 0.02 && lt > T_SARR) {
      const hp = HC.handle; const stopAt = [hp[0] + 96, hp[1] + 4];   // the wrist: the fingertips end a few centimetres short of the lever
      const fp = sw.fp, k = sw.k;
      sw.F = R.figure('scott', { x: fp[0], y: fp[1], scale: k, pose: 'stand', facing: -1, t: lt, look: hp, lookAmt: 0.6,
        armN: { to: [lerp(fp[0] - 40, stopAt[0], reach), lerp(fp[1] - 3.6 * k, stopAt[1], reach)], hand: 'open' } });
    }
    ws.push(sw); drawWalkers(c, ws);
    HL.front(c, lt, cs, 'corridor');
  });
  // 20 HANDLE: the hand a few centimetres short, fingers half-closed for a lever they never take. The light under the door,
  // unbroken: no feet. 'Scott?' 'Yeah. Coming.'
  const T_BACK = 52.35;
  shot(T_HANDLE, 'handle: the hand stops short', (c, st, lt) => {
    c.camera(HL.cams.handle);
    HL.back(c, lt, { underDoor: 1 }, 'handle');
    const HA = HL.anchors.handle; const stop = [HA.reachStop[0] + 34, HA.reachStop[1] - 6];   // fingertips ~40 px short of the lever
    const tw = lt > 50.95 && lt < 51.25 ? Math.sin((lt - 50.95) * TAU * 6) * 4 : 0;   // a twitch at 'Scott?'
    const out = R.key('scott', lt, [[T_BACK, 0], [T_BACK + 0.7, 1]]);
    const tremor = Math.sin(lt * TAU * 5.3) * 1.6 + Math.sin(lt * TAU * 8.1) * 0.8;
    const curl = lerp(0.55, 0.2, out) + (tw ? 0.08 * Math.sin((lt - 50.95) * TAU * 6) : 0);
    const w = [lerp(stop[0] + 150, HA.handIn[0] + 200, out) + tw, lerp(stop[1] + 165, HA.handIn[1] + 260, out) + tremor];
    reachHand(c, w, -(Math.PI - 0.86), 228, [HA.handIn[0] + 160, HA.handIn[1] + 120], C.underDoor, { dx: -0.1, dy: 1 }, curl, -1);
  });

  // ================================================================== SOUND (custom cues, prefixed)
  if (window.SOUND) {
    const SO = window.SOUND;
    // a soft footfall on boards: a low knock and a dry scuff
    SO.cues['Q09.step'] = (ac, B, t, p) => {
      const lv = SO.db(p.level == null ? -34 : p.level); const g = SO.gain(ac, 0); SO.perc(g, t, lv, 0.004, 0.11);
      const o = SO.osc(ac, 'sine', p.f || 92, t, t + 0.16); o.frequency.exponentialRampToValueAtTime((p.f || 92) * 0.62, t + 0.1); SO.chain(o, g, SO.pan(ac, p.pan || 0), B.fx);
      const n = SO.gain(ac, 0); SO.perc(n, t + 0.01, lv * 0.35, 0.002, 0.07); SO.chain(SO.src(ac, 'pink', 191, t, t + 0.12), SO.filt(ac, 'bandpass', 1300, 1.2), n, SO.pan(ac, p.pan || 0), B.fx);
    };
    // cloth: a short brushed swish (the phone out of a pocket, the shuffle against the wall)
    SO.cues['Q09.cloth'] = (ac, B, t, p) => {
      const d = p.dur || 0.35; const g = SO.gain(ac, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(SO.db(p.level || -36), t + d * 0.4); g.gain.linearRampToValueAtTime(0, t + d);
      const f = SO.filt(ac, 'bandpass', 2400, 0.9); f.frequency.setValueAtTime(1600, t); f.frequency.linearRampToValueAtTime(3400, t + d);
      SO.chain(SO.src(ac, 'white', 193, t, t + d + 0.05), f, g, SO.pan(ac, p.pan || 0), B.fx);
    };
    // a tally scratch: the shared 'tally' cue, but with its 30 Hz grain scaled to the level (the shared cue adds a fixed +-0.5 to
    // the gain, so four quick marks peak near -7 dBFS whatever level is asked)
    SO.cues['Q09.tally'] = (ac, B, t, p) => {
      const lv = SO.db(p.level == null ? -26 : p.level); const g = SO.gain(ac, 0); SO.perc(g, t, lv, 0.002, 0.06);
      const s = SO.chain(SO.src(ac, 'white', 91, t, t + 0.1), SO.filt(ac, 'bandpass', 3500, 2)); const am = SO.osc(ac, 'square', 30, t, t + 0.1), ag = SO.gain(ac, lv * 0.5); SO.chain(am, ag); ag.connect(g.gain);
      SO.chain(s, g, SO.pan(ac, p.pan || 0), B.fx);
    };
    // Kay's afterimage goes out: the ghost of her landing sound (a falling sine), very quiet
    SO.cues['Q09.die'] = (ac, B, t, p) => { const g = SO.gain(ac, 0); SO.perc(g, t, SO.db(p.level || -40), 0.002, 0.22); const o = SO.osc(ac, 'sine', 1400, t, t + 0.3); o.frequency.exponentialRampToValueAtTime(620, t + 0.2); SO.chain(o, g, B.fx); };
  }

  FILM.seq({
    id: 'Q09', title: 'The photo', dur: DUR, letterbox: 2.0,
    lines: [
      // Marina's three (46 px, bright mint, each within ~400 px of her): on the dark floor below her place at the table; on the dark
      // wall above and behind her head (her face looks left, into the frame); over Scott's chest and her own body, under her arm
      rowLine({ id: 'L167', at: 1.1, x: 70, y: 832, size: 46, opts: { stress: 0.22 } }, 62),
      { id: 'L168', at: 5.45, x: 1040, y: 330 },
      rowLine({ id: 'L169', at: 6.75, x: 1570, y: 140, size: 46, opts: { stress: 0.32 } }, 62),
      mintLine({ id: 'L170', at: 11.4, x: 985, y: 978, size: 46, until: 13.45, opts: { stress: 0.2 } }),
      rowLine({ id: 'L171', at: 20.15, x: 80, y: 760 }, 70, [66, 48]),
      { id: 'L172', at: 22.3, x: 860, y: 975, opts: { stress: 0.35 } },
      { id: 'L173', at: 26.0, x: 640, y: 975 },
      { id: 'L174', at: T_NAMES, x: 985, y: 238, align: 'center', size: 64, opts: { stress: 0.4 } },
      { id: 'L175', at: T_NAMES, x: 1062, y: 302, align: 'center', size: 70, opts: { stress: 0.4 } },
      { id: 'L176', at: 33.35, x: 120, y: 820, opts: { stress: 0.5 } },
      { id: 'L177', at: 36.4, x: 140, y: 830 },
      { id: 'L178', at: 39.1, x: 1010, y: 800, entrance: 0, silent: true, opts: { spread: 0 } },
      { id: 'L179', at: 41.55, x: 210, y: 220, opts: { pointTo: [70, 470] } },
      { id: 'L180', at: 43.2, x: 560, y: 250 },
      { id: 'L181', at: 50.8, x: 1240, y: 300, opts: { stress: 0.2 } },
      { id: 'L182', at: 52.0, x: 1240, y: 380 },
    ],
    sound(S) {
      // the room: hum, the fridge that got loud in Q08, the Extra's drone underneath everything (it thins to a thread in the hole)
      S.bed('room', 0, T_TALLY, { level: -40 });
      S.bed('fridge', 0, T_TALLY, { level: -42, steps: [[27.2, -40], [28.85, -30], [29.5, -41], [31.4, -37], [33.2, -42]] });
      S.bed('drone7', 0, 27.15, { level: -54, seventh: -48, fi: 1, fo: 0.4 });
      S.bed('drone7', 26.9, 29.2, { level: -68, seventh: -55, fi: 0.3, fo: 0.4 });
      S.bed('drone7', 28.85, DUR, { level: -54, seventh: -48, fi: 0.6, fo: 2 });
      // the phone goes to no one
      S.cue('Q09.cloth', 7.8, { dur: 0.45, level: -38, pan: 0.4 });
      S.cue('Q09.cloth', 9.62, { dur: 0.35, level: -40, pan: -0.3 });
      S.bed('drone7', 10.4, 13.8, { level: -41, seventh: -31, fi: 0.9, fo: 1.6 });
      // the shuffle, the hand, the whine, the shutter
      S.cue('Q09.cloth', T_WALL + 0.1, { dur: 0.5, level: -38, pan: -0.3 }); S.cue('Q09.step', T_WALL + 0.25, { level: -36, pan: -0.2 }); S.cue('Q09.step', T_WALL + 0.6, { level: -37, pan: 0.3 });
      S.cue('Q09.cloth', T_WALL + 0.8, { dur: 0.4, level: -39, pan: 0.4 }); S.cue('Q09.step', T_WALL + 1.0, { level: -37, pan: 0.5 });
      S.cue('Q09.cloth', T_HAND + 0.1, { dur: 0.3, level: -40, pan: 0.5 });
      S.bed('heart', 14.6, T_FLASH, { bpm: 66, bpmTo: 100, level: -24 });
      S.duck(15.9, T_FLASH, 0.3);
      S.cue('whine', T_FLASH - 1.2, { dur: 1.2, level: -36 });
      S.cue('shutter', T_FLASH, { level: -3 }); S.cue('hit', T_FLASH, { f: 150, decay: 0.07, level: -22 });   // the click, with a body
      S.cue('hit', T_FLASH + 0.42, { f: 44, decay: 1.0, level: -28 });
      S.bed('drone7', T_FLASH, 19.7, { level: -46, seventh: -39, fi: 0.3, fo: 0.6 });
      S.cue('lub', 17.95, { level: -18 });
      // the picture: the room drops out for half a second so 'Four.' lands into nothing; then the dread and the heart come back
      S.duck(19.62, 20.2, 0.04);
      S.bed('heart', 20.45, T_TALLY, { bpm: 74, bpmTo: 88, level: -30 });
      S.bed('dread', 20.3, T_TALLY, { level: -36, root: 55, fi: 2.2, fo: 1 });
      S.cue('flick', T_PINCH, { level: -34 });
      // where the photographer stood: nothing but a thread of the 7th; then the fridge, loud
      S.hole(27.25, 1.6);
      S.cue('lub', 28.95, { level: -18, extra: true });
      // the empty hall: the gas, very far
      S.bed('gas', 31.4, 33.2, { from: -60, to: -50 });
      S.duck(38.85, 41.3, 0.3);
      S.cue('Q09.step', T_DEENA + 0.1, { level: -34, pan: -0.5 });
      // four marks
      TI.tallyTimes(TALLY_O).forEach(m => S.cue('Q09.tally', T_TALLY + Math.max(0, m.t - 1 / 24), { level: -24, pan: (m.i - 1.5) * 0.12 }));
      S.duck(44.2, T_TALLY, 0.25);
      // the hallway: a different room tone, the gas louder toward the kitchen, soft footsteps, the heart
      S.bed('room', T_TALLY, DUR, { level: -46 });
      S.bed('gas', T_PROC, DUR, { from: -44, to: -36 });
      S.bed('heart', T_PROC, DUR, { bpm: 70, bpmTo: 98, level: -26 });
      const stepsOf = (id, t0, t1, per, pan, lv) => { for (let t = t0; t < t1; t += per) S.cue('Q09.step', t, { level: lv - 6 * seg(t, T_PROC, DUR), pan, f: 86 + id * 6 }); };
      stepsOf(0, T_PROC + 0.1, 49.6, 0.45, 0.05, -34); stepsOf(1, T_PROC + 0.32, 50.0, 0.56, 0.1, -34); stepsOf(2, T_PROC + 0.2, 50.4, 0.48, 0.2, -33);
      stepsOf(3, T_PROC + 0.15, T_SARR, 0.575, -0.15, -30);
      S.cue('Q09.die', STOP_T, { level: -38 });
      S.duck(STOP_T, T_HANDLE + 0.2, 0.3);
      S.cue('lub', STOP_T + 0.05, { level: -18 });
      S.bed('drone7', STOP_T - 0.3, DUR, { level: -47, seventh: -37, fi: 0.6, fo: 1.2 });
    },
    shots,
  });
})();
