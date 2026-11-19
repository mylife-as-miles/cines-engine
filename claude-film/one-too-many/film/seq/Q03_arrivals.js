/* ONE TOO MANY — Q03 ARRIVALS. Lines L005-L032, actions A007-A022. Set: hall (views hall, doorway, porch, lock) + title (the tally).
   Follows Q02's title and 12 frames of black; opens on the doorbell. Ends on the tally interstitial (six marks and a faint seventh).
   Warm and funny: the comedy lives in the cuts, the holds and the type. Five guests arrive; wet trails and coats count up to five.
   Then the latch, a second click from nowhere, and one pair of wet prints that nobody walked in.

   LOCAL ADDITIONS (not in the shared kit; defined here):
     - sixPack(): Angelo's six-pack carrier (ink paper, rimmed, can tops catching the lamp), hung from a RIG 'grab' fist.
     - crumbs(): crisp crumbs brushed off Scott's trousers, falling through the lamp light (deterministic particles).
     - earCig(): Angelo's unlit cigarette tucked behind his ear, drawn here instead of the kit's sliver (which sits across the
       head and reads as an eye glint): on the back of the head, ~30 degrees, its end standing out past the head contour, keylined.
     - kayBeads(): Kay's rain beads, drawn here instead of the kit's even ring: varied sizes, some inside the hair, twinkling on ones.
     - prints(): the wet footprints in the hall and doorway views, drawn here instead of the set's trails (the set's 28 prints
       read as a field of blobs): heel-and-toe pairs in five clear lanes, laid in arrival order (Deena, Angelo, Kay, Marina,
       Christof), drying along each trail and with age; the Extra's standing pair is isolated on clean floor right of the door.
     - rows(): multi-row drawing for long lines (the text is split by word index from the script; never typed here).
     - KAY: Kay's type in this sequence (review pass): warm ivory at full opacity instead of the kit's cool silver, and sized
       60 px nominal. Cormorant's x-height is 0.40 em (Libre Franklin's is 0.53), so 60 px Cormorant reads at the optical size
       of the others' 48 px body type (x-height 24 px against Scott's 25). Each line sits on ink beside her head. The kit's
       face takes no colour option, so sayAs() lends FACE.kay the ivory for the one call and restores it at once.
       The fog-on entrance and the lipstick exit are the kit's own, unchanged.
     - SOUND beds/cues 'Q03.grow' (a bed whose level follows steps: the groove and the walla growing, with a swell, as each guest
       goes through to the living room), 'Q03.laugh' (formant noise in pulses) and 'Q03.tally' (the stock tally with its AM
       scaled by the level, so the marks can sit at -24 dB and the faint seventh at -36 on the Extra's bus; the stock cue's AM
       is a fixed 0.5 and swamps its own level param: suggested shared fix in sound.js, `ag = gain(ac, 0.5 * db(p.level || -22))`). */
(function () {
  'use strict';
  const FL = window.FILM, O = window.OTM, C = O.C, R = window.RIG, SND = window.SOUND, MX = O.fig.M;
  const HH = O.H;
  const SET = () => window.SETS.hall, TITLE = () => window.SETS.title;
  const clamp = FL.clamp, lerp = FL.lerp, seg = FL.seg, key = FL.key, E = FL.ease;
  const LAMP = { x: 770, y: 214 };
  const CLEAR = 'rgba(0,0,0,0)';
  const sm = u => u * u * (3 - 2 * u);
  const lerp2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

  // ------------------------------------------------------------------ beats (sequence seconds)
  const K = 32.6;      // Kay's knock section
  const T = {
    bell: 0.04, s2: 3.75, s3: 4.9, step: 9.15, s4: 11.8, s5: 17.6,
    sTurn: 20.0, sWalk: 20.22, grab: 20.95, pull: 21.06, flick: 21.3, shut1: 21.55,   // Scott shuts the door on the rain
    s6: 23.3, s7: 27.4, knock: 30.3, s8: 30.6,
    s9: K, s10: K + 3.9, s11: K + 9.1, s12: K + 15.2, s13: K + 20.0, s14: K + 25.0,
  };
  T.shut2 = T.s14 + 3.6;                       // he swings the door shut behind him as Kay goes through
  const P = T.s14 + 4.4;                       // the ring + knocking, the porch
  Object.assign(T, { ring: P + 0.05, knocking: P + 0.42, s16: P + 1.1, s17: P + 5.5, s18: P + 9.5 });
  const Z = P + 16.8;                          // they come in; the door shuts
  Object.assign(T, { s19: Z, s19b: Z + 1.55, latch: Z + 2.3, s20: Z + 2.6, click2: Z + 3.25, s21: Z + 7.0, tally: Z + 9.5 });
  const TALLY = { marks: 6, faint: true, gapT: 2 / 24 }, TALLY0 = 0.04;
  const DUR = +(T.tally + TALLY0 + 6.5 * TALLY.gapT + 0.5 + 2 / 24).toFixed(3);   // last mark + the faint seventh's 12 frames + 2

  // ------------------------------------------------------------------ helpers
  const hp = (X, Zm) => { const p = SET().floor('hall', X, Zm); return [p[0], p[1], 86 * p[2]]; };
  const dpt = (X, Zm) => { const p = SET().floor('doorway', X, Zm); return [p[0], p[1], SET().scaleAt('doorway', Zm)]; };
  const holdsCig = spec => !!(spec.hold && ['N', 'F'].some(s => spec.hold[s] && spec.hold[s].kind === 'cig'));
  // draw a RIG figure; o.occ occludes it in the emissive buffer (pendant / street lamp behind it)
  function put(c, id, spec, o) {
    const F = R.figure(id, spec);
    const oo = Object.assign({ em: c.em, falloff: true }, o || {});
    const cig = id === 'angelo' && spec.cig !== false && !holdsCig(spec);
    if (cig) oo.details = Object.assign({}, oo.details, { cigColor: CLEAR });
    if (id === 'kay') oo.details = Object.assign({}, oo.details, { beadColor: CLEAR });
    R.draw(c.g, F, oo);
    if (cig) earCig(c.g, F);
    if (id === 'kay') kayBeads(c.g, F, c.frame || 0);
    if (o && o.occ) SET().occlude(c, R.path(F));
    return F;
  }
  // the head's own frame (x forward, y down, about one unit = the head) from the kit's detail matrices
  const headMat = (F, kind) => { const d = (F.details || []).find(k => k.kind === kind); return MX.comp(F.M, d ? d.headM : F.headM); };
  // Angelo's cigarette behind the ear: back of the head, ~30 degrees up toward the back, its end clear of the contour
  const CIG = { a: [-0.2, 0.12], b: [-0.75, -0.13] };
  function earCig(g, F) {
    const m = headMat(F, 'cigarette'), a = MX.ap(m, CIG.a), b = MX.ap(m, CIG.b);
    const sc = F.scale || 60, w = Math.max(2.2, Math.min(sc * 0.05, 3 + sc * 0.015));
    g.save(); g.lineCap = 'round';
    g.strokeStyle = C.ink; g.lineWidth = w + 3.2; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();   // keyline
    g.strokeStyle = C.cardPaper; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.fillStyle = C.ash || '#8C7B6B'; g.beginPath(); g.arc(b[0], b[1], w * 0.42, 0, 7); g.fill();                         // the unlit end
    g.restore();
  }
  const cigMid = F => MX.ap(headMat(F, 'cigarette'), [(CIG.a[0] + CIG.b[0]) / 2, (CIG.a[1] + CIG.b[1]) / 2]);
  // Kay's rain beads: some on the contour, some caught inside the hair, varied, twinkling on ones
  const BEADS = [[-0.67, 0.32, 1.0], [-0.65, 0.6, 0.6], [-0.61, 0.03, 0.45], [-0.54, -0.4, 0.85], [-0.33, -0.57, 0.4], [-0.06, -0.63, 0.9],
    [0.17, -0.56, 0.35], [-0.46, 0.17, 0.6], [-0.37, -0.2, 0.42], [-0.5, 0.45, 0.75], [-0.2, -0.42, 0.5], [-0.27, 0.3, 0.3], [-0.58, -0.16, 0.28]];
  function kayBeads(g, F, frame) {
    const m = headMat(F, 'beads'), sc = F.scale || 60;
    g.save(); g.fillStyle = C.rainSilver;
    BEADS.forEach(([x, y, k], i) => {
      const q = MX.ap(m, [x, y]), r = Math.max(1.1, sc * (0.011 + 0.027 * k));
      g.globalAlpha = (0.5 + 0.45 * k) * (0.8 + 0.2 * Math.sin(frame * 0.9 + i * 2.3));
      g.beginPath(); g.arc(q[0], q[1], r, 0, 7); g.fill();
      if (k > 0.55) { g.globalAlpha = 0.95; g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(q[0] - r * 0.3, q[1] - r * 0.35, r * 0.32, 0, 7); g.fill(); g.fillStyle = C.rainSilver; }
    });
    g.restore();
  }
  const LH = { light: LAMP, color: C.tungsten };                                      // the hall pendant
  const LSTEP = { light: { dx: -1, dy: -0.25 }, color: C.tungstenMid, w: 2.2 };       // guests on the step, lit from the hall
  const LDW = { light: { dx: -1, dy: -0.6 }, color: C.tungsten, w: 3.4 };            // doorway: Scott against the hot disc
  const LPORCH = { light: { dx: -0.7, dy: -1 }, color: C.rainSilver, spread: 0.9, w: 2.4 };

  // ------------------------------------------------------------------ wet prints (local)
  // trails in metres from the door centre (X right, Z into the hall), in arrival order; every lane veers LEFT so the floor right
  // of the door stays clean for the Extra's pair. A print = toe pad + heel, along the walking direction, alternating feet.
  const TRAILS = [
    { who: 'deena', kind: 'heel', g: 0.055, born: 5.6, pts: [[0.24, 0.1], [-0.3, 0.3], [-1.1, 0.5], [-1.9, 0.62], [-3.2, 0.72]] },
    { who: 'angelo', kind: 'shoe', g: 0.07, born: 10.2, pts: [[-0.12, 0.1], [-0.5, 0.22], [-1.2, 0.36], [-1.8, 0.44], [-3.2, 0.52]] },
    { who: 'kay', kind: 'boot', g: 0.06, born: T.s11 + 2.6, pts: [[0.0, 0.12], [-0.4, 0.36], [-1.2, 0.72], [-3.2, 1.08]] },
    { who: 'marina', kind: 'heel', g: 0.055, born: Z + 0.4, pts: [[-0.32, 0.08], [-0.8, 0.13], [-1.6, 0.19], [-3.2, 0.25]] },
    { who: 'christof', kind: 'big', g: 0.08, born: Z + 1.1, pts: [[0.1, 0.12], [-0.3, 0.46], [-1.0, 0.88], [-2.0, 1.26], [-3.2, 1.46]] },
  ];
  const STRIDE = 0.37, NPR = 8;
  const SOLES = {   // [ [cu, cv, rx, ry], ... ] in metres, u forward (toe +), v across
    shoe: [[0.04, 0, 0.074, 0.041], [-0.087, 0, 0.036, 0.034]],
    heel: [[0.046, 0, 0.062, 0.033], [-0.092, 0, 0.016, 0.016]],
    boot: [[0.04, 0, 0.072, 0.044], [-0.085, 0, 0.038, 0.037]],
    big: [[0.046, 0, 0.085, 0.047], [-0.1, 0, 0.041, 0.039]],
  };
  function trailPts(T0) {   // [{X, Z, ang, s}] every STRIDE along the polyline, alternating sides
    const P2 = T0.pts, segL = []; let L = 0;
    for (let i = 0; i < P2.length - 1; i++) { const l = Math.hypot(P2[i + 1][0] - P2[i][0], P2[i + 1][1] - P2[i][1]); segL.push(l); L += l; }
    const out = [];
    for (let j = 0; j < NPR; j++) {
      let s = 0.16 + j * STRIDE; if (s > L) break; const s0 = s; let i = 0; while (i < segL.length - 1 && s > segL[i]) { s -= segL[i]; i++; }
      const a = P2[i], b = P2[i + 1], f = s / segL[i], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), side = j % 2 ? 1 : -1;
      out.push({ X: lerp(a[0], b[0], f) - Math.sin(ang) * T0.g * side, Z: lerp(a[1], b[1], f) + Math.cos(ang) * T0.g * side, ang, s: s0 });
    }
    return out;
  }
  const PR_CACHE = new Map();
  function printPath(view, kind, p, k) {
    const ck = view + ':' + k; let v = PR_CACHE.get(ck); if (v) return v;
    const proj = (X, Zm) => SET().floor(view, X, Zm), ca = Math.cos(p.ang), sa = Math.sin(p.ang), sh = O.S();
    const w = (u, vv) => { const q = proj(p.X + ca * u - sa * vv, p.Z + sa * u + ca * vv); return [q[0], q[1]]; };
    SOLES[kind].forEach(([cu, cv, rx, ry]) => { const pl = []; for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; pl.push(w(cu + Math.cos(a) * rx, cv + Math.sin(a) * ry)); } sh.poly(pl); });
    // the glint: a sliver along the far edge of the toe pad, where the wet catches the lamp
    const far = Math.cos(p.ang) >= 0 ? -1 : 1, s0 = SOLES[kind][0];
    v = { path: sh.path(0.12, 7 + k.length), g0: w(s0[0] - s0[2] * 0.55, far * s0[3] * 0.62), g1: w(s0[0] + s0[2] * 0.5, far * s0[3] * 0.5), k: proj(p.X, p.Z)[2] };
    PR_CACHE.set(ck, v); return v;
  }
  function drawPrint(g, v, a, glint) {
    if (a <= 0.01) return;
    g.globalAlpha = 0.6 * a; g.fillStyle = C.ink; g.fill(v.path);
    g.globalAlpha = Math.min(1, glint * a); g.strokeStyle = C.rainSilver; g.lineWidth = Math.max(1.3, 1.7 * v.k); g.lineCap = 'round';
    g.beginPath(); g.moveTo(v.g0[0], v.g0[1]); g.lineTo(v.g1[0], v.g1[1]); g.stroke();
  }
  const TP = TRAILS.map(trailPts);
  const EXTRA = [{ X: 0.31, Z: 0.72, ang: Math.PI / 2 }, { X: 0.53, Z: 0.74, ang: Math.PI * 0.49 }];
  // clip out the door leaf (hinged on the right jamb) at `door`: what stands outside it or under it stays hidden
  function leafClip(g, view, door) {
    const h = SET(), e = h.doorEdge(view, door), A = h.anchors[view];
    const hx = view === 'hall' ? A.door.x1 : A.opening.x1, ht = view === 'hall' ? A.door.top : A.opening.top, hb = view === 'hall' ? A.door.bot : A.opening.sill;
    const cp = new Path2D(); cp.rect(-4000, -4000, 12000, 12000); cp.moveTo(hx, ht - 40); cp.lineTo(e.top[0], e.top[1] - 40); cp.lineTo(e.bot[0], e.bot[1] + 60); cp.lineTo(hx, hb + 60); cp.closePath();
    g.clip(cp, 'evenodd');
  }
  // view: 'hall' | 'doorway'; fp 0..5 trails (a fraction lays the current one down); ex 0..1 the Extra's standing pair
  function prints(c, view, lt, fp, ex, door) {
    const g = c.g; g.save();
    if (door > 0.02 && door < 0.98) leafClip(g, view, door);   // keep the floor under a swinging leaf clean
    for (let i = 0; i < TRAILS.length && i < fp; i++) {
      const part = clamp(fp - i, 0, 1), P2 = TP[i], age = clamp((lt - TRAILS[i].born) / 70, 0, 1);
      P2.forEach((p, j) => {
        const appear = clamp(part * (P2.length + 0.5) - j, 0, 1); if (appear <= 0) return;
        const wet = 1 - 0.68 * clamp(p.s / 2.6, 0, 1);
        drawPrint(g, printPath(view, TRAILS[i].kind, p, i + ':' + j), appear * wet * (1 - 0.66 * age), 0.85 * wet * (1 - 0.5 * age));
      });
    }
    if (ex > 0) EXTRA.forEach((p, j) => {
      const v = printPath(view, 'shoe', p, 'x' + j), a = sm(clamp(ex, 0, 1));
      drawPrint(g, v, a * 1.25, 1.25);
      g.globalAlpha = 0.32 * a; g.strokeStyle = C.rainSilver; g.lineWidth = 1.1; g.stroke(v.path);   // the wet edge
    });
    g.restore();
  }
  // the hall / doorway back layers with the local prints laid over the set's floor (the set's own trails switched off)
  function hallBack(c, lt, s) { SET().back(c, lt, Object.assign({}, s, { footprints: 0, extraPrints: 0 }), 'hall'); prints(c, 'hall', lt, s.footprints || 0, s.extraPrints || 0, s.door || 0); }
  function doorBack(c, lt, s) { SET().back(c, lt, Object.assign({}, s, { footprints: 0, extraPrints: 0 }), 'doorway'); prints(c, 'doorway', lt, s.footprints || 0, 0, s.door || 0); }

  // a step-wise value over time (counts that click up)
  const steps = (t, ks) => { let v = ks[0][1]; for (const k of ks) if (t >= k[0]) v = k[1]; return v; };
  // the hall's running state: trails (laid as each guest crosses) and coats on the hooks
  function hallState(lt, extra) {
    const fp = key(lt, [[0, 0], [T.s3 + 0.1, 0], [T.s3 + 1.0, 1, 'linear'], [9.0, 1], [10.6, 2, 'linear'], [T.s11 + 1.95, 2], [T.s11 + 2.85, 2.45, 'linear'],
      [T.s14 + 2.4, 2.45], [T.s14 + 3.8, 3, 'linear'], [Z - 0.1, 3], [Z + 0.8, 4, 'linear'], [Z + 1.5, 5, 'linear']]);
    const coats = steps(lt, [[0, 0], [T.s4, 1], [T.s8, 2], [P, 3], [T.s19 + 1.3, 5]]);
    return Object.assign({ door: 0, rain: 1, footprints: fp, coats }, extra || {});
  }

  // ---------- Angelo's six-pack (local): three cans side by side in a cardboard sleeve, a handle loop up to the fist at `at`.
  function sixPack(c, at, s, facing, light, tilt) {
    const g = c.g, k = s / 88;
    const cw = 27 * k, gap = 3.5 * k, w = 3 * cw + 2 * gap, top = at[1] + 22 * k, ch = 50 * k, x0 = at[0] - w / 2;
    const sh = O.S();
    for (let i = 0; i < 3; i++) { const cx = x0 + i * (cw + gap); sh.M(cx, top + 6 * k).Q(cx, top, cx + 6 * k, top).L(cx + cw - 6 * k, top).Q(cx + cw, top, cx + cw, top + 6 * k).L(cx + cw, top + ch).L(cx, top + ch).Z(); }
    const sl = top + 17 * k;   // the sleeve
    sh.M(x0 - 2 * k, sl).L(x0 + w + 2 * k, sl).L(x0 + w + 3 * k, top + ch + 2 * k).Q(x0 + w + 2 * k, top + ch + 5 * k, x0 + w - 3 * k, top + ch + 5 * k).L(x0 + 3 * k, top + ch + 5 * k).Q(x0 - 2 * k, top + ch + 5 * k, x0 - 3 * k, top + ch + 2 * k).Z();
    sh.poly([[at[0] - 13 * k, sl + 2 * k], [at[0] - 9 * k, sl + 2 * k], [at[0] - 4 * k, at[1] + 2 * k], [at[0] - 8 * k, at[1] + 2 * k]]);
    sh.poly([[at[0] + 9 * k, sl + 2 * k], [at[0] + 13 * k, sl + 2 * k], [at[0] + 8 * k, at[1] + 2 * k], [at[0] + 4 * k, at[1] + 2 * k]]);
    sh.rect(at[0] - 9 * k, at[1] - 3 * k, 18 * k, 7 * k);
    const shp = tilt ? sh.rotate(tilt, at[0], at[1]) : sh;
    const p = shp.path(0.35, 41);
    g.fillStyle = C.ink; g.fill(p);
    O.silhouette(g, p, { noFill: true, light, rimColor: C.tungsten, rimW: Math.max(1.6, 2.4 * k), at: [at[0], top + ch * 0.5], bbox: shp.bbox(), spread: 1.4 });
    g.save(); if (tilt) { g.translate(at[0], at[1]); g.rotate(tilt); g.translate(-at[0], -at[1]); }
    g.fillStyle = C.tungstenMid; g.globalAlpha = 0.55; g.fillRect(x0 + 2 * k, sl + 12 * k, w - 4 * k, 5 * k);
    g.globalAlpha = 0.9; g.strokeStyle = C.tungsten; g.lineWidth = Math.max(1.2, 1.8 * k); g.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const cx = x0 + i * (cw + gap); g.beginPath(); g.moveTo(cx + 4 * k, top + 1.5 * k); g.lineTo(cx + cw * 0.55, top + 1.5 * k); g.stroke(); }
    g.restore();
    return shp;
  }
  // ---------- crumbs brushed off Scott's trousers: emitted at t0 from origin, falling through the lamp light to the floor
  function crumbs(g, lt, t0, origin, floorY, seed, n, sc) {
    const dt = lt - t0; if (dt < 0 || dt > 2.4) return;
    const r = O.rng('crumb' + seed), k = (sc || 100) / 100; g.save();
    for (let i = 0; i < (n || 12); i++) {
      const vx = (r() - 0.3) * 260 * k, vy = -60 - r() * 140, ox = (r() - 0.5) * 34 * k, oy = r() * 60 * k, sz = (3.5 + r() * 4) * k, rot = r() * 3, d = r() * 0.14, rest = r() * 10;
      const tt = Math.max(0, dt - d); if (tt <= 0) continue;
      let x = origin[0] + ox + vx * tt, y = origin[1] + oy + vy * tt + 0.5 * 2600 * tt * tt;
      const land = y >= floorY + rest - 4; if (land) { y = floorY + rest - 4; x = origin[0] + ox + vx * Math.sqrt(Math.max(0, 2 * (floorY - origin[1]) / 2600)); }
      g.globalAlpha = land ? Math.max(0, 0.8 - Math.max(0, dt - 1.4)) : 1;
      g.fillStyle = i % 3 === 0 ? C.tungsten : C.cardPaper;
      g.save(); g.translate(x, y); g.rotate(land ? rot : rot + tt * 9); g.beginPath(); g.moveTo(-sz / 2, 0); g.lineTo(0, -sz * 0.4); g.lineTo(sz / 2, sz * 0.1); g.lineTo(0, sz * 0.35); g.closePath(); g.fill(); g.restore();
    }
    g.restore();
  }
  // ---------- Kay's type (see the header): warm ivory, full opacity, optical body size
  const KAY = { ivory: '#F4E8CF', size: 60, lh: 1.2 };
  // O.say with a speaker colour lent to the kit's face for this call only (the face has no colour option)
  function sayAs(g, who, q, x, y, o, color) {
    const F = color && O.FACE[who]; if (!F) return O.say(g, who, q, x, y, o);
    const c0 = F.color; F.color = color;
    try { return O.say(g, who, q, x, y, o); } finally { F.color = c0; }
  }
  // ---------- long lines on several rows (split by word index; the words come from the script)
  function rows(breaks, lhK, slide, color) {
    return (c, s, o, line) => {
      const g = c.g, who = s.T.who, words = s.T.text.split(' ');
      const segs = []; let a = 0; breaks.concat([words.length]).forEach(b => { if (b > a) segs.push(words.slice(a, b).join(' ')); a = b; });
      const size = line.size || (O.FACE[who] || {}).size || 48, lh = size * (lhK || 1.25);
      let x = line.x;
      if (slide) { const u = seg(c.lt, line.at, line.at + (slide.dur || 0.28)); x = lerp(slide.from, line.x, E.outExpo(u)); }
      const unit = q => who === 'angelo' ? q.split(' ').length : q.length;
      const tot = segs.reduce((m, q) => m + unit(q), 0); const done = (o.p == null ? 1 : o.p) * tot; let acc = 0;
      segs.forEach((q, i) => {
        const n = unit(q), pi = clamp((done - acc) / n, 0, 1), start = acc; acc += n;
        const last = i === segs.length - 1;
        if (pi <= 0 && who !== 'deena') return;
        if (o.lip && !last) return;
        const oi = Object.assign({}, o, { p: pi });
        if (who === 'angelo' && i > 0 && pi < 1) {
          const ws = q.split(' '), d = Math.round(ws.length * pi); if (d <= 0) return;
          const F = Object.assign({}, O.FACE.angelo, { size }); g.save(); g.font = O.font(F); g.letterSpacing = '0px';
          const wsum = ws.slice(0, d).reduce((m, wd) => m + g.measureText(wd).width, 0) + size * 0.28 * (d - 0.5); g.restore();
          g.save(); g.beginPath(); g.rect(x - 60, line.y + i * lh - size * 2, wsum + 60, size * 3); g.clip(); O.say(g, who, q, x, line.y + i * lh, Object.assign({}, o, { p: 1 })); g.restore(); return;
        }
        if (who === 'scott') { const active = (done > start && done <= start + n) || (last && done >= tot); oi.caret = !!o.caret && active; }
        sayAs(g, who, q, x, line.y + i * lh, oi, color);
      });
    };
  }
  // a line: L(id, at, x, y, {rows:[...], lh, slide:{from,dur}, color, size, opts, hold, until, ...})
  function L(id, at, x, y, o) {
    o = o || {}; const line = Object.assign({ id, at, x, y }, o);
    if (o.rows || o.slide || o.color) { const fn = rows(o.rows || [], o.lh, o.slide, o.color); line.draw = (c, s, oo) => fn(c, s, oo, line); }
    delete line.rows; delete line.lh; delete line.slide; delete line.color; return line;
  }
  // Kay: ivory, optical body size, on ink beside her head (o.align 'right' when the line sits behind her head)
  const LK = (id, at, x, y, o) => L(id, at, x, y, Object.assign({ size: KAY.size, lh: KAY.lh, color: KAY.ivory }, o));
  // world -> screen through the current camera
  const toScreen = (g, p) => { const m = g.getTransform(); return [m.a * p[0] + m.c * p[1] + m.e, m.b * p[0] + m.d * p[1] + m.f]; };
  // Scott's caret alone, blinking (the question nobody asks)
  function lonelyCaret(g, x, y, lt, t0, alpha, size) {
    if (Math.floor((lt - t0) / 0.53) % 2) return; size = size || 48;
    g.save(); g.globalAlpha = alpha == null ? 1 : alpha; g.fillStyle = C.tScott; g.fillRect(x, y - size * 0.78, Math.max(2, size * 0.06), size * 0.92); g.restore();
  }

  // ================================================================== SHOTS
  const shots = [];

  // places (lazy: the set must be loaded). Heads stand level with the pendant, so nobody stops under it.
  let POS = null;
  function pos() {
    if (POS) return POS;
    return (POS = {
      scottDoor: hp(-0.8, 0.36),     // Scott answering the door, stood aside
      SD2: hp(-0.45, 0.42),          // Scott meeting Angelo: in front of the opening, his face on the rain
      AD2: hp(0.22, 0.14),           // Angelo just over the sill
      SDOOR: hp(0.3, 0.6),           // Scott at the open leaf, to swing it shut
      angHooks: hp(-1.8, 0.45),      // where Angelo freezes: left of the lamp, by the rail
      scottHall: hp(-0.75, 0.45),    // Scott in the two-shot: right of the lamp, the lamp between them
      deenaStop: hp(-1.9, 0.6),      // Deena stops dead in the light, facing the living room
      angCU: [dpt(-1.2, 0.05)[0], dpt(-1.2, 0.05)[1], 108],   // Angelo's close-up, doorway view: on the hot disc, facing the door
                                     // (scale cheated down a touch so his head clears the top of the doorway world)
    });
  }
  const packAt = at => [at[0], at[1] + 4];

  // ---- 1. The doorbell. Scott hurries through the hall brushing crumbs off his trousers, reaches the door, hovers, opens up.
  shots.push({ at: 0, name: 'hall: the doorbell', draw(c, st, lt) {
    const h = SET(); c.camera({ x: 960, y: 540, zoom: 1 + 0.003 * st });
    const door = key(lt, [[3.45, 0], [3.75, 0.1, 'inQuad']]);
    const s = hallState(lt, { door }); hallBack(c, lt, s);
    const A = h.anchors.hall; const x0 = -170, xs = A.latchSide[0] - 14, dist = xs - x0;
    const wk = R.walk('scott', lt, { x0, scale: 98, facing: 1, t0: 0.3, dist, speed: 1.3 });
    const u = clamp((wk.x - x0) / dist, 0, 1); const y = lerp(958, A.latchSide[1], u), sc = lerp(104, A.latchSide[2], u);
    const spec = Object.assign({ y, scale: sc, t: lt }, wk);
    const SW = [1.42, 1.88];
    const sAct = SW.map(t0 => seg(lt, t0, t0 + 0.34)).find(v => v > 0 && v < 1);
    if (sAct != null) { spec.armN = { a: lerp(0.42, 0.08, E.inOutQuad(sAct)), b: lerp(0.3, 0.02, sAct), hand: 'flat' }; }
    if (lt > 1.3 && lt < 2.3) { spec.head = 0.42; spec.neck = 0.2; }
    if (wk.walking.done) {
      const kb = h.knob('hall', door);
      const reach = key(lt, [[2.6, 0], [2.78, 0.45], [2.95, 0.05], [3.12, 0], [3.32, 1, 'outCubic']]);
      const hair = seg(lt, 2.95, 3.05) * (1 - seg(lt, 3.2, 3.3));
      if (hair > 0.05) spec.armF = { a: 2.5, b: 2.2, hand: 'flat' };
      if (reach > 0.02) spec.armN = { to: lerp2([wk.x + 50, y - sc * 3.6], kb, reach), hand: 'grip' };
      spec.look = kb; spec.lookAmt = 0.4;
    }
    const F = put(c, 'scott', spec, Object.assign({ occ: true }, LH));
    SW.forEach((t0, i) => crumbs(c.g, lt, t0 + 0.1, [F.joints.kneeN[0] + 6, F.joints.kneeN[1] - sc * 0.9], y + 6, 'a' + i, 14, sc));
    h.front(c, lt, s, 'hall');
  } });

  // ---- 2. The door opens: rain, cold light. He pulls it off the latch and lets it swing; Deena is already coming in.
  shots.push({ at: T.s2, name: 'doorway: the door opens', draw(c, st, lt) {
    const h = SET(), A = h.anchors.doorway; c.camera({ x: 960, y: 540, zoom: 1 + 0.004 * st });
    const door = key(lt, [[T.s2, 0.1], [T.s2 + 0.2, 0.2, 'inOutQuad'], [T.s2 + 0.8, 1, 'outCubic']]);
    const s = { door, rain: 1, footprints: 0 }; doorBack(c, lt, s);
    const a = A.inside, sp = A.stepR, sl = A.stepL;
    const fist = [sp[0] - sp[2] * 0.3, sp[1] - sp[2] * 3.05];
    const behind = door < 0.6;   // the guests are outside: the swinging leaf hides them until it has gone past
    if (behind) { c.g.save(); leafClip(c.g, 'doorway', door); }
    put(c, 'angelo', { x: sp[0] + 30, y: sp[1], scale: sp[2], facing: -1, pose: 'idle', t: lt, look: [a[0], 300], lookAmt: 0.5, hold: { N: { kind: 'grab', at: fist, dir: 1.6 } } }, LSTEP);
    sixPack(c, packAt(fist), sp[2], -1, { dx: -1, dy: -0.4 });
    // Deena snaps over the sill: on the step, then one stride in
    const snap = dSnap(lt, T.s2 + 0.8, 0.12);
    if (behind) c.g.restore();
    const dx = lerp(sl[0], 880, snap), dy = lerp(sl[1], 1012, snap), ds = lerp(sl[2], dpt(-0.3, 0.2)[2], snap);
    if (behind) { c.g.save(); leafClip(c.g, 'doorway', door); }
    put(c, 'deena', { x: dx, y: dy, scale: ds, facing: -1, pose: 'idle', t: lt, legN: snap > 0.5 ? { a: 0.42, b: 0.12 } : undefined, legF: snap > 0.5 ? { a: -0.32, b: 0.25 } : undefined, look: [200, 520], lookAmt: 0.6 }, snap > 0.5 ? LDW : LSTEP);
    if (behind) c.g.restore();
    // Scott: hand on the knob for the pull, then it comes back to his side (clear of her) and he leans out of her way
    const rest = [a[0] + a[2] * 0.5, a[1] - a[2] * 3.1], k3 = h.knob('doorway', 0.2);
    const back = seg(FL.twos(lt), T.s2 + 0.2, T.s2 + 0.44, 'inOutSine');
    const armN = lt < T.s2 + 0.2 ? { to: h.knob('doorway', door), hand: 'grip' } : back < 1 ? { to: lerp2(k3, rest, back), hand: 'relaxed' } : undefined;
    put(c, 'scott', { x: a[0], y: a[1], scale: a[2], facing: 1, pose: 'idle', t: lt, lean: -0.05 * snap, armN, look: [dx, dy - ds * 6.5], lookAmt: 0.5 }, LDW);
    h.front(c, lt, s, 'doorway');
  } });
  // Deena's snap: 0 until t0, then there in about `d` seconds (3% past, dead still)
  function dSnap(lt, t0, d) { return R.curve('deena', seg(FL.twos(lt), t0, t0 + (d || 0.15) / 0.26)); }

  // ---- 3. Hall wide: Deena strides in and stops dead in the light: "You moved the sofa." Angelo steps over the sill; Scott meets him.
  shots.push({ at: T.s3, name: 'hall: you moved the sofa', draw(c, st, lt) {
    const h = SET(), A = h.anchors.hall, Q = pos(); c.camera({ x: 960, y: 540, zoom: 1 + 0.003 * st });
    const s = hallState(lt, { door: 0.7 }); hallBack(c, lt, s);
    // Deena: threshold -> stopped dead in the light, facing the living room; snaps round to Scott for L007
    const d0 = [A.threshold[0] - 30, A.threshold[1] + 6, 90], d1 = Q.deenaStop;
    const dk = R.walk('deena', lt, { x0: d0[0], scale: 94, facing: -1, t0: T.s3, dist: d0[0] - d1[0], speed: 1.4 });
    const du = clamp((d0[0] - dk.x) / (d0[0] - d1[0]), 0, 1);
    const tr = R.turn('deena', lt, 7.95, -1, 1);
    const dspec = Object.assign({ y: lerp(d0[1], d1[1], du), scale: lerp(d0[2], d1[2], du), t: lt }, dk);
    if (dk.walking.done) {
      Object.assign(dspec, { facing: tr.facing, squash: tr.squash, gesture: 'handOnHip' });
      if (lt < 7.95) { dspec.look = [-300, 380]; dspec.lookAmt = 0.7; } else { dspec.look = [Q.scottDoor[0], 260]; dspec.lookAmt = 0.8; }
    }
    // Angelo: on the step, then one step over the sill with the six-pack
    const a0 = [A.step[0] + 70, A.step[1], A.step[2]], a1 = Q.AD2;
    const ak = R.walk('angelo', lt, { x0: a0[0], scale: 87, facing: -1, t0: 8.7, dist: a0[0] - a1[0], speed: 0.85 });
    const au = clamp((a0[0] - ak.x) / Math.max(1, a0[0] - a1[0]), 0, 1);
    const asc = lerp(a0[2], a1[2], au), ay = lerp(a0[1], a1[1], au);
    const fist = [ak.x - asc * 0.3, ay - asc * 3.05];
    put(c, 'angelo', Object.assign({ y: ay, scale: asc, t: lt, hold: { N: { kind: 'grab', at: fist, dir: 1.6 } }, look: [Q.SD2[0], 250], lookAmt: 0.5 }, ak), LSTEP);
    sixPack(c, packAt(fist), asc, -1, { dx: -1, dy: -0.4 });
    // Scott: stood aside at the door; "Hi, Deena." over his shoulder, then he turns to Angelo and steps in to meet him
    const sd = Q.scottDoor, s2 = Q.SD2;
    const st1 = R.turn('scott', lt, 6.35, 1, -1), st2 = R.turn('scott', lt, 8.55, -1, 1), stt = lt < 8.55 ? st1 : st2;
    const lookD = lt < 8.55 ? [d1[0], 300] : [ak.x - 30, 230];
    let sspec = { x: sd[0], y: sd[1], scale: sd[2], facing: stt.facing, squash: stt.squash, view34: stt.view34, pose: 'idle', t: lt, look: lookD, lookAmt: 0.6, head: lt > 6.9 && lt < 8.2 ? 0.08 : 0 };
    if (lt >= T.step) {
      const sw = R.walk('scott', lt, { x0: sd[0], scale: sd[2], facing: 1, t0: T.step, dist: s2[0] - sd[0], speed: 1.1 });
      const su = clamp((sw.x - sd[0]) / (s2[0] - sd[0]), 0, 1);
      sspec = Object.assign({ y: lerp(sd[1], s2[1], su), scale: lerp(sd[2], s2[2], su), t: lt }, sw, { look: [ak.x - 30, 230], lookAmt: 0.6 });
    }
    put(c, 'scott', sspec, LH);
    put(c, 'deena', dspec, Object.assign({ occ: true }, LH));
    h.front(c, lt, s, 'hall');
  } });

  // ---- 4. At the door, close: both faces on the rain. Angelo leans in (L008). Scott takes the six-pack: the look. L009.
  shots.push({ at: T.s4, name: 'hall_door: you know who is coming', draw(c, st, lt) {
    const h = SET(), Q = pos(); c.camera({ x: 1165, y: 432, zoom: 1.45 + 0.004 * st });
    const s = hallState(lt, { door: 0.7 }); hallBack(c, lt, s);
    const sd = Q.SD2, an = Q.AD2;
    const lean = R.key('angelo', lt, [[11.9, 0], [12.35, 0.16], [13.5, 0.16], [13.9, 0.08], [14.6, 0.02]]);
    const offer = R.key('angelo', lt, [[13.3, 0], [13.85, 1]]);
    const reachS = R.key('scott', lt, [[13.8, 0], [14.2, 1]]);
    const draw = seg(FL.twos(lt), 14.32, 14.8, 'inOutSine');
    const aRest = [an[0] - an[2] * 0.3, an[1] - an[2] * 3.05], mid = [(an[0] + sd[0]) / 2 + 12, an[1] - an[2] * 3.7], sRest = [sd[0] + sd[2] * 0.42, sd[1] - sd[2] * 3.2];
    let pk = lerp2(aRest, mid, offer); if (draw > 0) pk = lerp2(mid, sRest, draw);
    const take = lt >= 14.2 ? 1 : 0.4 * clamp(reachS, 0, 1);
    const scottHas = lt >= 14.2, scottReach = reachS > 0 && lt < 14.2;
    // the look: chin down, a slight tilt, held; he leans back from it a hair
    const look = R.key('scott', lt, [[14.5, 0], [14.9, 1]]);
    put(c, 'angelo', { x: an[0], y: an[1], scale: an[2], facing: -1, pose: 'idle', t: lt, idleAmt: 0.25, lean, neck: lean * 0.9, head: 0.06 - 0.12 * clamp(look, 0, 1), look: [sd[0] + 30, 250], lookAmt: 0.7,
      hold: !scottHas ? { N: { kind: 'grab', at: pk, dir: 1.6 } } : undefined, armF: lt > 16.6 ? { a: -0.15, b: 2.3, hand: 'open' } : undefined }, LSTEP);
    const sh = scottHas ? { N: { kind: 'grab', at: pk, dir: 1.6 } } : undefined;
    put(c, 'scott', { x: sd[0], y: sd[1], scale: sd[2], facing: 1, pose: 'idle', t: lt, idleAmt: 0.3 * (1 - clamp(look, 0, 1)), look: [an[0] - 30, 230 + 30 * look], lookAmt: 1,
      neck: 0.14 * look, head: 0.24 * look, lean: -0.05 * look, rot: -0.025 * look,
      armN: scottReach ? { to: lerp2([sd[0] + sd[2] * 0.5, sd[1] - sd[2] * 3.4], [pk[0] - 14, pk[1] + 4], clamp(reachS, 0, 1)), hand: 'open' } : undefined, hold: sh }, LH);
    sixPack(c, packAt(pk), lerp(an[2], sd[2], take), scottHas ? 1 : -1, LAMP);
    h.front(c, lt, s, 'hall');
  } });

  // ---- 5. Deena snaps back for the kiss (L010). Scott goes to shut the door; behind his back Angelo tiptoes in. L011, the latch, L012.
  shots.push({ at: T.s5, name: 'hall: aw, he missed us', draw(c, st, lt) {
    const h = SET(), Q = pos(); c.camera({ x: 1010, y: 560, zoom: 1.12 + 0.003 * st });
    const door = lt < T.pull ? 0.7 : lt < T.flick ? lerp(0.7, 0.58, E.inOutSine(seg(lt, T.pull, T.flick))) : lerp(0.58, 0, E.inQuad(seg(lt, T.flick, T.shut1)));
    const s = hallState(lt, { door }); hallBack(c, lt, s);
    const sd = Q.SD2, an = Q.AD2, ah = Q.angHooks, sdr = Q.SDOOR;
    // Angelo: lets Scott pass, then tiptoes from the sill behind his back toward the rail; frozen by the latch; turns back for L012
    const tip = clamp((Math.min(lt, T.shut1) - 20.6) / 0.97, 0, 1);   // a fast tiptoe scurry; the latch freezes him at the rail
    const apt = hp(lerp(0.22, -1.8, tip), lerp(0.14, 0.45, tip));
    const atr = R.turn('angelo', lt, 21.85, -1, 1);
    const sneak = tip > 0 && lt < T.shut1, frozen = lt >= T.shut1 && lt < 21.85;
    const ph = FL.twos(lt) * 6.2;
    const aspec = { x: apt[0], y: apt[1] - (sneak ? Math.abs(Math.sin(ph * Math.PI)) * 7 : 0), scale: apt[2], facing: atr.facing, squash: atr.squash, pose: 'idle', t: lt };
    if (sneak || frozen) Object.assign(aspec, { lean: 0.16, neck: 0.12, head: 0.1, legN: { a: 0.45 + (sneak ? 0.25 * Math.sin(ph * Math.PI) : 0.25), b: 0.75 }, legF: { a: -0.35, b: 0.35 },
      armN: { a: 1.0, b: 1.55, hand: 'relaxed' }, armF: { a: 0.7, b: 1.7, hand: 'relaxed' }, look: [sd[0], 240], lookAmt: 0.25 });
    if (frozen) { aspec.head = -0.06; aspec.neck = 0.02; aspec.lean = 0.1; }   // caught: head up
    if (lt >= 22.0) Object.assign(aspec, { armN: { a: 0.42, b: 1.85, hand: 'open' }, armF: { a: 0.3, b: 1.95, hand: 'open' }, head: -0.06, look: [sdr[0], 230], lookAmt: 0.8 });   // palms up: who, me?
    if (tip <= 0) { aspec.look = [sd[0] - 60, 280]; aspec.lookAmt = 0.5; }
    // Deena: snaps in from the left, L010, the kiss (four frames on his cheek), snaps away
    const din = R.key('deena', lt, [[18.15, 0], [18.45, 1], [19.62, 1], [19.95, 0]]);
    const kiss = lt >= 19.33 && lt < 19.58 ? 1 : 0;
    const dBase = sd[0] - 150, dKiss = sd[0] - 96;
    const dxp = lerp(-220, kiss ? dKiss : dBase, din);
    // Scott: turns to her, frozen by the kiss, turns back to the door, walks to it, swings it shut (L011 without looking)
    const t1 = R.turn('scott', lt, 18.3, 1, -1), t2 = R.turn('scott', lt, T.sTurn, -1, 1, { dur: 0.3 });
    const sf = lt < T.sTurn ? t1 : t2;
    let sx = sd[0], sy = sd[1], ssc = sd[2], sspec;
    if (lt >= T.sWalk) {
      const sw = R.walk('scott', lt, { x0: sd[0], scale: sd[2], facing: 1, t0: T.sWalk, dist: sdr[0] - sd[0], speed: 1.45 });
      const su = clamp((sw.x - sd[0]) / (sdr[0] - sd[0]), 0, 1);
      sx = sw.x; sy = lerp(sd[1], sdr[1], su); ssc = lerp(sd[2], sdr[2], su);
      sspec = Object.assign({ y: sy, scale: ssc, t: lt }, sw);
    } else sspec = { x: sd[0], y: sd[1], scale: sd[2], facing: sf.facing, squash: sf.squash, view34: sf.view34, pose: 'idle', t: lt };
    const fac = lt >= T.sWalk ? 1 : sf.facing;
    const fist = [sx + fac * ssc * 0.42, sy - ssc * 3.2];
    sspec.hold = { N: { kind: 'grab', at: fist, dir: 1.6 } };
    if (kiss) Object.assign(sspec, { head: -0.12, neck: -0.05, lean: -0.04 });
    else if (lt > 19.58 && lt < T.sTurn) Object.assign(sspec, { lean: -0.06, head: -0.18 });   // stunned, a beat
    // the door: reach for the knob, pull it toward him, let it go with a flick; it swings to and latches
    const kb = h.knob('hall', door), restF = [sx + ssc * 0.25, sy - ssc * 3.4];
    const reach = seg(FL.twos(lt), T.grab - 0.14, T.grab, 'outQuad');
    if (lt >= T.grab - 0.14 && lt < T.flick + 0.04) sspec.armF = { to: lerp2(restF, h.knob('hall', Math.max(door, 0.58)), reach), hand: 'grip' };
    else if (lt >= T.flick + 0.04) { const u = seg(FL.twos(lt), T.flick + 0.04, T.flick + 0.4, 'inOutSine'); if (u < 1) sspec.armF = { to: lerp2([kb[0] + 30, kb[1] - 20], restF, u), hand: 'open' }; }
    if (lt >= T.pull && lt < T.flick + 0.1) { sspec.lean = -0.07; sspec.head = 0.05; }
    if (lt >= T.shut1 + 0.3) { sspec.look = [apt[0], 240]; sspec.lookAmt = lt > 22.15 ? 0.45 : 0; sspec.head = 0.12; }   // deadpan: he does not turn round
    put(c, 'angelo', aspec, Object.assign({ occ: true }, LH));
    if (din > 0.01) put(c, 'deena', { x: dxp, y: sd[1] + 2 - (kiss ? 12 : 0), scale: 92, facing: 1, pose: 'idle', t: lt, lean: kiss ? 0.16 : 0.02, neck: kiss ? -0.32 : 0, head: kiss ? -0.38 : 0.02,
      look: [sd[0] - 30, 250], lookAmt: 0.8, gesture: kiss ? undefined : 'handOnHip' }, Object.assign({ occ: true }, LH));
    put(c, 'scott', sspec, Object.assign({ occ: true }, LH));
    sixPack(c, packAt(fist), ssc, fac, LAMP);
    h.front(c, lt, s, 'hall');
  } });

  // ---- 6. Angelo, close, against the hot disc (doorway view, facing the door where Scott is). "You've got one in your hair."
  //         He takes it down; nowhere to put it; puts it back.
  shots.push({ at: T.s6, name: 'cu Angelo: one in your hair', draw(c, st, lt) {
    const h = SET(), Q = pos(); const ap = Q.angCU; c.camera({ x: 880, y: 492, zoom: 1.1 + 0.004 * st });
    const s = { door: 0, rain: 1, footprints: 2 }; doorBack(c, lt, s);
    const base = { x: ap[0], y: ap[1], scale: ap[2], facing: 1, pose: 'idle', t: lt };
    const sk = R.figure('angelo', Object.assign({}, base, { idle: false }));
    const hd = sk.joints.head, ear = cigMid(sk);
    const front = [hd[0] + ap[2] * 1.0, hd[1] + ap[2] * 0.85], low = [hd[0] + ap[2] * 0.3, hd[1] + ap[2] * 2.8];
    // business: hand up 23.9, takes it 24.4, looks at it, looks round for somewhere to put it, pats his chest, back to the ear 26.9
    const up = R.key('angelo', lt, [[23.9, 0], [24.3, 1]]), down = R.key('angelo', lt, [[24.45, 0], [24.85, 1]]);
    const back = R.key('angelo', lt, [[26.75, 0], [27.15, 1]]), away = R.key('angelo', lt, [[27.2, 0], [27.5, 1]]);
    const inHand = lt >= 24.4 && lt < 27.15;
    let at = lerp2(low, ear, up); if (lt >= 24.4) at = lerp2(ear, front, down); if (lt >= 26.75) at = lerp2(front, ear, back); if (lt >= 27.2) at = lerp2(ear, low, away);
    let look = [hd[0] + ap[2] * 4, hd[1] + ap[2] * 0.4];
    if (lt > 24.85 && lt < 25.45) look = at;
    else if (lt >= 25.45 && lt < 25.9) look = [hd[0] - ap[2] * 4, hd[1] + ap[2] * 1.2];
    else if (lt >= 25.9 && lt < 26.5) look = [hd[0] + ap[2] * 1.2, hd[1] + ap[2] * 3.6];
    else if (lt >= 26.5) look = [hd[0] + ap[2] * 5, hd[1] + ap[2] * 0.3];
    const spec = Object.assign({}, base, { look, lookAmt: 1, cig: inHand ? false : undefined });
    if (lt >= 23.9 && lt < 27.5) spec.hold = { N: inHand ? { kind: 'cig', at } : { kind: 'grab', at, dir: -0.6 } };
    const pat = lt > 25.95 && lt < 26.5 ? Math.abs(Math.sin((FL.twos(lt) - 25.95) * 11)) : 0;
    const ch = sk.joints.chest;
    if (pat > 0) spec.armF = { to: [ch[0] + ap[2] * (0.32 + 0.12 * pat), ch[1] + ap[2] * 0.15], hand: 'flat' };
    put(c, 'angelo', spec, { light: { x: 520, y: -330 }, color: C.tungsten, w: 3.6, spread: 0.95, headSpread: 0.95 });
    h.front(c, lt, s, 'doorway');
  } });

  // ---- 7. Two-shot under the lamp: "It's decorative." Scott holds the six-pack and the stare. The KNOCK.
  shots.push({ at: T.s7, name: 'hall: it is decorative', draw(c, st, lt) {
    const h = SET(), Q = pos(); const ap = Q.angHooks, sp = Q.scottHall;
    c.camera({ x: 800, y: 540, zoom: 1.2 + 0.003 * st });
    const s = hallState(lt, { door: 0 }); hallBack(c, lt, s);
    put(c, 'angelo', { x: ap[0], y: ap[1], scale: ap[2], facing: 1, pose: 'idle', t: lt, head: -0.14, neck: -0.06, look: [sp[0], 200], lookAmt: 0.4, gesture: lt > 27.55 ? 'handOnHip' : undefined }, Object.assign({ occ: true }, LH));
    const knock = lt >= T.knock + 0.08;
    const fist = [sp[0] - sp[2] * 0.42, sp[1] - sp[2] * 3.2];
    put(c, 'scott', { x: sp[0], y: sp[1], scale: sp[2], facing: -1, pose: 'idle', t: lt, idle: false, look: knock ? [1700, 300] : [ap[0] + 30, 210], lookAmt: knock ? 0.6 : 0.9, head: knock ? -0.1 : 0.04, hold: { N: { kind: 'grab', at: fist, dir: 1.6 } } }, Object.assign({ occ: true }, LH));
    sixPack(c, packAt(fist), sp[2], -1, LAMP);
    h.front(c, lt, s, 'hall');
  } });

  // ---- 8. Hall wide: he lobs the six-pack to Angelo and reaches the door a little too quickly. Hair. Breath. Opens up.
  shots.push({ at: T.s8, name: 'hall: a little too quickly', draw(c, st, lt) {
    const h = SET(), A = h.anchors.hall, Q = pos(); c.camera({ x: 960, y: 540, zoom: 1 });
    const door = key(lt, [[T.s9 - 0.45, 0], [T.s9, 0.45, 'outCubic']]);
    const s = hallState(lt, { door }); hallBack(c, lt, s);
    const ap = Q.angHooks, sp = Q.scottHall, ls = A.latchSide;
    const fl = seg(lt, T.s8 + 0.05, T.s8 + 0.5);
    const p0 = [sp[0] - sp[2] * 0.42, sp[1] - sp[2] * 3.2], p1 = [ap[0] + ap[2] * 0.75, ap[1] - ap[2] * 3.9];
    const pk = fl <= 0 ? p0 : [lerp(p0[0], p1[0], fl), lerp(p0[1], p1[1], fl) - 150 * Math.sin(Math.PI * fl)];
    const caught = fl >= 1;
    const reachUp = seg(lt, T.s8 + 0.2, T.s8 + 0.45);
    const aspec = { x: ap[0], y: ap[1], scale: ap[2], facing: 1, pose: 'idle', t: lt, look: caught ? [ls[0], 240] : pk, lookAmt: 0.8 };
    if (caught) { aspec.hold = { N: { kind: 'grab', at: [p1[0] - 10, p1[1] + 30], dir: 1.6 } }; aspec.lean = -0.05; }
    else if (reachUp > 0) { aspec.armN = { to: lerp2([ap[0] + 40, ap[1] - ap[2] * 3], p1, reachUp), hand: 'open' }; aspec.armF = { to: lerp2([ap[0] + 20, ap[1] - ap[2] * 3], [p1[0] - 20, p1[1] + 10], reachUp), hand: 'open' }; }
    put(c, 'angelo', aspec, Object.assign({ occ: true }, LH));
    sixPack(c, caught ? packAt([p1[0] - 10, p1[1] + 30]) : packAt(pk), ap[2], 1, LAMP, fl > 0 && fl < 1 ? -fl * 2.2 : 0);
    const tr = R.turn('scott', lt, T.s8 + 0.12, -1, 1, { dur: 0.18 });
    const dash = R.curve('deena', seg(FL.twos(lt), T.s8 + 0.25, T.s8 + 0.8));
    const x = lerp(sp[0], ls[0] + 4, dash), y = lerp(sp[1], ls[1], dash), scl = lerp(sp[2], ls[2], dash);
    const moving = dash > 0.02 && dash < 0.97;
    const sspec = { x, y, scale: scl, facing: lt < T.s8 + 0.12 ? -1 : tr.facing, squash: tr.squash, pose: 'idle', t: lt, lean: moving ? 0.24 : 0.03 };
    if (fl > 0 && fl < 0.35) sspec.armN = { a: 1.6, b: 0.2, hand: 'open' };
    if (moving) Object.assign(sspec, { legN: { a: 0.6, b: 0.35 }, legF: { a: -0.5, b: 0.55 }, armN: { a: 0.5, b: 0.6 }, armF: { a: -0.5, b: 0.5 } });
    const hair = seg(lt, T.s8 + 0.95, T.s8 + 1.05) * (1 - seg(lt, T.s8 + 1.3, T.s8 + 1.4));
    if (hair > 0.05) sspec.armF = { a: 2.5, b: 2.2, hand: 'flat' };
    const breath = seg(lt, T.s8 + 1.35, T.s8 + 1.5) * (1 - seg(lt, T.s8 + 1.6, T.s8 + 1.75));
    if (breath > 0) { sspec.neck = -0.08 * breath; sspec.lean = -0.04 * breath; }
    if (lt > T.s8 + 1.5) sspec.armN = { to: h.knob('hall', door), hand: 'grip' };
    put(c, 'scott', sspec, Object.assign({ occ: true }, LH));
    h.front(c, lt, s, 'hall');
  } });
  // ---- 9. Doorway: Kay on the step with a dripping bag of ice, rain in her hair. L015.
  shots.push({ at: T.s9, name: 'doorway: Kay', draw(c, st, lt) {
    const h = SET(), A = h.anchors.doorway; c.camera({ x: 990, y: 530, zoom: 1.04 + 0.004 * st });
    const s = { door: 1, rain: 1, footprints: 2 }; doorBack(c, lt, s);
    const k = A.step, a = A.inside;
    put(c, 'kay', { x: k[0] + 30, y: k[1], scale: k[2], facing: -1, pose: 'idle', t: lt, lean: -0.08, head: -0.12, look: [a[0] + 40, a[1] - a[2] * 6.6], hold: { F: { kind: 'bag' } } }, LSTEP);
    put(c, 'scott', { x: a[0], y: a[1], scale: a[2], facing: 1, pose: 'idle', t: lt, lean: 0.1, neck: 0.12, head: 0.16, armF: { to: [A.opening.x0 - 6, 330], hand: 'flat' }, look: [k[0], k[1] - k[2] * 6.4] }, LDW);
    h.front(c, lt, s, 'doorway');
  } });

  // ---- 10. F03: "I wasn't going to." / "You were. You did the face." He leans on the jamb, elbow up and out, hand above his head.
  shots.push({ at: T.s10, name: 'hall: you did the face (F03)', draw(c, st, lt) {
    const h = SET(), A = h.anchors.hall; c.camera({ x: 960, y: 540, zoom: 1 + 0.003 * st });
    const s = hallState(lt, { door: 0.7 }); hallBack(c, lt, s);
    const k = A.step;
    const face = lt > T.s10 + 1.9 && lt < T.s10 + 3.7;
    put(c, 'kay', { x: k[0] + 40, y: k[1], scale: 87, facing: -1, pose: 'idle', t: lt, lean: -0.14, head: face ? -0.28 : -0.2, armN: { a: 0.16, b: 0.5 }, hold: { F: { kind: 'bag' } } }, LSTEP);
    const a = A.inside;
    put(c, 'scott', { x: a[0], y: a[1], scale: 92, facing: 1, pose: 'idle', t: lt, lean: 0.19, neck: 0.22, head: 0.24, armN: { a: -0.3, b: 0.62 }, armF: { to: [1024, 258], elbow: 'back', hand: 'flat' } }, { light: { dx: -1, dy: -0.75 }, color: C.tungsten, w: 3.4 });
    h.front(c, lt, s, 'hall');
  } });

  // ---- 11. He steps back to let her in, still square in the way; she nudges past him. L018, L019, L020.
  const KS = () => hp(-0.6, 0.45);    // where Kay ends up, inside, at Scott's left
  const SP2 = () => hp(-0.05, 0.6);   // Scott, one step back from the door: square in the doorway, in her path
  shots.push({ at: T.s11, name: 'hall_door: she nudges past', draw(c, st, lt) {
    const h = SET(), A = h.anchors.hall; c.camera({ x: 1080, y: 500, zoom: 1.42 + 0.003 * st });
    const s = hallState(lt, { door: 0.7 }); hallBack(c, lt, s);
    const t0 = T.s11;
    const sb = R.key('scott', lt, [[t0 + 0.1, 0], [t0 + 0.6, 1]]);
    const s0 = A.inside, s1 = hp(-0.25, 0.6), s2 = SP2();
    let sx = lerp(s0[0], s1[0], sb), sy = lerp(s0[1], s1[1], sb), ss = lerp(92, s1[2], sb);
    const k0 = [A.step[0] + 40, A.step[1], 87], k1 = hp(0.42, 0.04), k2 = KS();
    const kin = R.key('kay', lt, [[t0 + 0.35, 0], [t0 + 1.05, 1]]), knudge = R.key('kay', lt, [[t0 + 1.95, 0], [t0 + 2.85, 1]]);
    let kp = lerp2(k0, k1, kin), ks = lerp(k0[2], k1[2], kin); if (knudge > 0) { kp = lerp2(k1, k2, knudge); ks = lerp(k1[2], k2[2], knudge); }
    const bump = Math.sin(Math.PI * clamp((knudge - 0.2) / 0.45, 0, 1));
    sx = lerp(sx, s2[0], sm(clamp((knudge - 0.3) / 0.5, 0, 1))) + bump * 10;
    const ktr = R.turn('kay', lt, t0 + 2.95, -1, 1);
    const kspec = { x: kp[0], y: kp[1], scale: ks, facing: knudge >= 1 ? ktr.facing : -1, squash: knudge >= 1 ? ktr.squash : 1, view34: knudge >= 1 ? ktr.view34 : 0, pose: 'idle', t: lt, hold: { F: { kind: 'bag' } } };
    const ask = kin >= 1 && knudge <= 0 && lt > t0 + 1.15;
    if (ask) { kspec.head = -0.26; kspec.neck = -0.06; kspec.look = [sx + 30, sy - ss * 6.8]; kspec.lookAmt = 1; kspec.armN = { a: 0.55, b: 0.55, hand: 'open' }; }
    if (knudge > 0 && knudge < 1) { kspec.lean = 0.18 * bump; kspec.legN = { a: 0.3, b: 0.15 }; kspec.legF = { a: -0.2, b: 0.2 }; }
    const home = seg(lt, t0 + 4.4, t0 + 4.8) * (1 - seg(lt, t0 + 5.9, t0 + 6.3));
    if (home > 0) { kspec.look = [1500, 420]; kspec.lookAmt = 0.9 * home; }
    put(c, 'kay', kspec, Object.assign({}, LH, { occ: true }));
    const str = R.turn('scott', lt, t0 + 2.55, 1, -1);
    const turned = knudge > 0.55;
    const sspec = { x: sx, y: sy, scale: ss, facing: turned ? str.facing : 1, squash: turned ? str.squash : 1, view34: turned ? str.view34 : 0, pose: 'idle', t: lt, lean: -0.12 * bump, look: [kp[0], kp[1] - ks * 6.6], lookAmt: 0.6 };
    if (ask) { sspec.head = -0.06; sspec.lean = -0.03; }
    const reach = seg(lt, t0 + 5.85, t0 + 6.25);
    if (reach > 0) sspec.armN = { to: lerp2([sx - 40, sy - ss * 3.4], [lerp(sx, kp[0], 0.45), sy - ss * 4.3], reach), hand: 'open' };
    put(c, 'scott', sspec, Object.assign({ occ: true }, LH));
    h.front(c, lt, s, 'hall');
  } });

  // ---- 12. The quiet two-shot: she laughs and hands him the bag. Almost a question. Only his caret blinks, between them.
  shots.push({ at: T.s12, name: 'two-shot: the caret', draw(c, st, lt) {
    const h = SET(); const kp = KS(), sp = SP2();
    c.camera({ x: (kp[0] + sp[0]) / 2 + 6, y: 330, zoom: 1.95 + 0.003 * st });
    const s = hallState(lt, { door: 0.7 }); hallBack(c, lt, s);
    const t0 = T.s12;
    const laugh = lt > t0 + 0.1 && lt < t0 + 0.8 ? Math.abs(Math.sin((FL.ones(lt) - t0) * 14)) : 0;
    const HP = [(kp[0] + sp[0]) / 2, sp[1] - sp[2] * 4.5];
    const kRest = [kp[0] - kp[2] * 0.15, kp[1] - kp[2] * 3.05], sRest = [sp[0] - sp[2] * 0.4, sp[1] - sp[2] * 3.2];
    const kOut = R.key('kay', lt, [[t0 + 0.75, 0], [t0 + 1.2, 1]]), sIn = R.key('scott', lt, [[t0 + 0.9, 0], [t0 + 1.25, 1]]), sDown = seg(FL.twos(lt), t0 + 1.4, t0 + 1.9, 'inOutSine');
    const scottHas = lt >= t0 + 1.3;
    const kHold = !scottHas ? { F: { kind: 'bag', at: lerp2(kRest, HP, kOut) } } : undefined;
    const kspec = { x: kp[0], y: kp[1] - laugh * 4, scale: kp[2], facing: 1, pose: 'idle', t: lt, head: -0.1 - 0.22 * laugh, neck: -0.1 * laugh, look: [sp[0], sp[1] - sp[2] * 6.9], lookAmt: 0.9, hold: kHold };
    if (scottHas) kspec.armF = { a: lerp(0.9, 0.05, sDown), b: 0.3, hand: 'relaxed' };
    const KF = put(c, 'kay', kspec, Object.assign({}, LH, { occ: true }));
    const sspec = { x: sp[0], y: sp[1], scale: sp[2], facing: -1, pose: 'idle', t: lt, idleAmt: 0.35, look: [kp[0], kp[1] - kp[2] * 6.5], lookAmt: 0.8, head: 0.04 };
    if (scottHas) sspec.hold = { N: { kind: 'bag', at: lerp2(HP, sRest, sDown) } };
    else if (sIn > 0) sspec.armN = { to: lerp2(sRest, [HP[0] - 6, HP[1] + 4], clamp(sIn, 0, 1)), hand: 'open' };
    const SF = put(c, 'scott', sspec, Object.assign({ occ: true }, LH));
    if (lt > t0 + 2.0 && lt < T.s13 - 0.12) {
      const fa = KF.joints.head, fb = SF.joints.head;
      const mid = [(fa[0] + fb[0]) / 2, (fa[1] + fb[1]) / 2 + kp[2] * 0.3];
      const sc = toScreen(c.g, mid); c.reset(); lonelyCaret(c.g, sc[0] - 2, sc[1] + 30, lt, t0 + 2.0, 1, 64);
    }
  } });

  // ---- 13. L021 (Deena, off) slides in from the frame edge. L022 Kay, L023 Scott.
  shots.push({ at: T.s13, name: 'hall: furniture polish', draw(c, st, lt) {
    const h = SET(); const kp = KS(), sp = SP2();
    c.camera({ x: 960, y: 470, zoom: 1.5 + 0.003 * st });
    const s = hallState(lt, { door: 0.7 }); hallBack(c, lt, s);
    const t0 = T.s13;
    const toDeena = seg(lt, t0 + 0.25, t0 + 0.5) * (1 - seg(lt, t0 + 1.9, t0 + 2.3));
    put(c, 'kay', { x: kp[0], y: kp[1], scale: kp[2], facing: 1, pose: 'idle', t: lt, look: toDeena > 0.3 ? [-300, 300] : [sp[0], sp[1] - sp[2] * 6.7], lookAmt: 0.9, head: lt > t0 + 2.3 ? -0.05 : 0 }, Object.assign({}, LH, { occ: true }));
    const prot = lt > T.s13 + 4.3;
    put(c, 'scott', { x: sp[0], y: sp[1], scale: sp[2], facing: -1, pose: 'idle', t: lt, look: [kp[0], kp[1] - kp[2] * 6.4], lookAmt: 0.8, hold: { N: { kind: 'bag' } }, lean: prot ? -0.05 : 0, head: prot ? -0.12 : 0 }, Object.assign({ occ: true }, LH));
    h.front(c, lt, s, 'hall');
  } });

  // ---- 14. Kay sniffs the air: "It really does." She passes him. He swings the door shut behind him without looking, and smiles
  //          despite himself (head dips, a breath, the shoulders drop).
  shots.push({ at: T.s14, name: 'hall: it really does', draw(c, st, lt) {
    const h = SET(); const kp = KS(), sp = SP2(), sb = hp(0.2, 0.62);
    c.camera({ x: 960, y: 520, zoom: 1.22 + 0.003 * st });
    const t0 = T.s14;
    const door = lt < T.shut2 - 0.36 ? 0.7 : lerp(0.7, 0, E.inQuad(seg(lt, T.shut2 - 0.36, T.shut2)));
    const s = hallState(lt, { door }); hallBack(c, lt, s);
    const sniff = lt > t0 + 0.4 && lt < t0 + 1.2 ? 1 : 0; const bob = sniff ? (Math.floor((lt - t0 - 0.4) / 0.2) % 2) : 0;
    const go = lt >= t0 + 2.1; const ktr = R.turn('kay', lt, t0 + 2.1, 1, -1);
    const kw = R.walk('kay', lt, { x0: kp[0], scale: kp[2], facing: -1, t0: t0 + 2.4, speed: 0.95 });
    const kspec = go ? Object.assign({ y: kp[1], scale: kp[2], t: lt }, kw, { facing: ktr.facing, squash: ktr.squash, view34: ktr.view34 }) : { x: kp[0], y: kp[1], scale: kp[2], facing: 1, pose: 'idle', t: lt };
    if (sniff) { kspec.neck = -0.18; kspec.head = -0.3 - 0.08 * bob; }
    else if (!go) { kspec.look = [sp[0], sp[1] - sp[2] * 6.7]; kspec.lookAmt = 0.8; kspec.head = -0.08; }
    if (kspec.x > -200) put(c, 'kay', kspec, Object.assign({}, LH, { occ: true }));
    // Scott: a step back toward the door, the far hand finds the knob behind him, swings it to; then the smile
    const bk = R.key('scott', lt, [[t0 + 2.75, 0], [t0 + 3.05, 1]]);
    const x = lerp(sp[0], sb[0], bk), y = lerp(sp[1], sb[1], bk), scl = lerp(sp[2], sb[2], bk);
    const smile = R.key('scott', lt, [[t0 + 2.6, 0], [t0 + 3.0, 1]]);
    const inB = seg(lt, t0 + 2.6, t0 + 3.0) * (1 - seg(lt, T.shut2 + 0.05, T.shut2 + 0.35));   // the breath in ...
    const out = seg(lt, T.shut2 + 0.1, T.shut2 + 0.55);                                        // ... and out: the shoulders drop
    const sspec = { x, y, scale: scl, facing: -1, pose: 'idle', t: lt, idleAmt: 0.4, look: go ? [kspec.x, sp[1] - sp[2] * 6] : [kp[0], kp[1] - kp[2] * 6.4], lookAmt: 0.7, hold: { N: { kind: 'bag' } },
      head: 0.16 * smile + 0.1 * out - 0.04, neck: 0.06 * smile + 0.06 * out, lean: -0.035 * inB + 0.03 * out, breath: 4 + 3 * inB };
    if (bk > 0 && bk < 1) Object.assign(sspec, { legN: { a: -0.22, b: 0.12 }, legF: { a: 0.18, b: 0.08 } });
    const kb = h.knob('hall', door), restF = [x + scl * 0.3, y - scl * 3.3];
    const reach = seg(FL.twos(lt), t0 + 2.95, T.shut2 - 0.36, 'outQuad');
    if (lt >= t0 + 2.95 && door > 0.42) sspec.armF = { to: lerp2(restF, kb, reach), hand: 'grip' };
    else if (lt >= t0 + 2.95) { const u = seg(FL.twos(lt), T.shut2 - 0.2, T.shut2 + 0.25, 'inOutSine'); if (u < 1) sspec.armF = { to: lerp2(h.knob('hall', 0.42), restF, u), hand: 'open' }; }
    put(c, 'scott', sspec, Object.assign({ occ: true }, LH));
    h.front(c, lt, s, 'hall');
  } });

  // ---- 15. Hall wide: he was on his way back to the party with the ice. Another RING, at once impatient KNOCKING: he spins round.
  shots.push({ at: P, name: 'hall: the ring and the knocking', draw(c, st, lt) {
    const h = SET(); c.camera({ x: 960, y: 540, zoom: 1 });
    const s = hallState(lt, { door: 0 }); hallBack(c, lt, s);
    const y = 935, sc = 98;
    const wa = R.walk('scott', Math.min(lt, P + 0.05), { x0: 820, scale: sc, facing: -1, t0: P - 0.9, speed: 1.0 });
    const tr = R.turn('scott', lt, P + 0.28, -1, 1, { dur: 0.28 });
    let spec;
    if (lt < P + 0.6) spec = Object.assign({ y, scale: sc, t: lt }, wa, lt > P + 0.05 ? { facing: tr.facing, squash: tr.squash, view34: tr.view34, lean: 0.02, head: -0.1 } : {});
    else spec = Object.assign({ y, scale: sc, t: lt }, R.walk('scott', lt, { x0: wa.x, scale: sc, facing: 1, t0: P + 0.6, speed: 1.4 }), { lean: 0.2 });
    spec.hold = { N: { kind: 'bag' } };
    put(c, 'scott', spec, Object.assign({ occ: true }, LH));
    h.front(c, lt, s, 'hall');
  } });

  // ---- 16-18. The porch: Christof and Marina, mid-argument, with room between them.
  const PL = { c25: T.s16 + 0.4, m26: T.s16 + 1.9, c27: T.s17 + 0.2, m28: T.s17 + 2.3, c29: T.s17 + 3.5, a30: T.s18 + 0.2, m31: T.s18 + 1.8, c32: T.s18 + 4.5 };
  function porchDraw(c, st, lt, cam) {
    const h = SET(), A = h.anchors.porch; c.camera(cam);
    const door = key(lt, [[T.s16, 0.25], [T.s16 + 0.4, 1, 'outCubic']]);
    const s = { door, rain: 1 }; h.back(c, lt, s, 'porch');
    const l = [740, 950, 104], r = [1182, 950, 104];
    const chestY = l[1] - l[2] * 4.6;
    // "Finally!": both heads snap round toward the hall (the camera) and hold until Marina's comeback
    const glance = lt >= PL.a30 + 0.2 && lt < PL.m31 + 0.25;
    // Marina (precise): finger up for "the second light", arms folded for "the same light", the point that stops short of him
    const mspec = { x: l[0], y: l[1], scale: l[2], facing: 1, pose: 'idle', t: lt, look: [r[0], r[1] - r[2] * 6.6] };
    if (lt > PL.m26 + 0.3 && lt < PL.m26 + 3.2) mspec.armN = { a: 1.05, b: 1.75, hand: 'point' };
    if (lt > PL.m28 - 0.2 && lt < PL.m28 + 2.2) mspec.gesture = 'armsFolded';
    if (lt > PL.m31 + 0.5 && lt < PL.m31 + 4.4) mspec.hold = { N: { kind: 'point', at: [r[0] - r[2] * 0.5 - 52, chestY] } };
    // Christof (expansive): presents her with a sweep beside her, palms up at his own chest, a hand flung high, leans in to Scott
    const cspec = { x: r[0], y: r[1], scale: r[2], facing: -1, pose: 'idle', t: lt, look: [l[0], l[1] - l[2] * 6.4] };
    if (lt > PL.c25 - 0.1 && lt < PL.c25 + 1.9) cspec.armN = { to: [(l[0] + r[0]) / 2 + 34, l[1] - l[2] * 3.9], hand: 'open' };
    if (lt > PL.c27 - 0.2 && lt < PL.c27 + 2.0) { cspec.armN = { a: 0.42, b: 2.05, hand: 'open' }; cspec.armF = { a: 0.3, b: 2.15, hand: 'open' }; cspec.lean = -0.05; }
    if (lt > PL.c29 - 0.1 && lt < PL.a30 + 0.15) { cspec.armN = { a: 2.65, b: 0.25, hand: 'open' }; cspec.lean = -0.06; cspec.head = -0.12; }   // two churches
    if (lt > PL.c32 - 0.3) { cspec.lean = 0.1; cspec.look = [400, 520]; cspec.gesture = 'handToChin'; }
    if (glance) {
      Object.assign(mspec, { view34: 1, squash: 0.78, look: [960, 1400], lookAmt: 0.6, head: 0.06 });
      Object.assign(cspec, { view34: 1, squash: 0.78, look: [960, 1400], lookAmt: 0.6, head: 0.04 });
    }
    // they come in, laughing over each other
    const inU = seg(lt, Z - 1.3, Z + 0.05);
    if (inU > 0) {
      const mx = lerp(l[0], -120, E.inQuad(inU)), cx = lerp(r[0], 260, E.inQuad(inU));
      Object.assign(mspec, R.walk('marina', lt, { x0: l[0], scale: l[2], facing: -1, t0: Z - 1.3, speed: 1.0 }), { y: l[1] + 60 * inU, scale: l[2] * (1 + 0.35 * inU), hold: undefined });
      Object.assign(cspec, R.walk('christof', lt, { x0: r[0], scale: r[2], facing: -1, t0: Z - 1.15, speed: 1.0 }), { y: r[1] + 60 * inU, scale: r[2] * (1 + 0.35 * inU), head: -0.25, neck: -0.1 });
      mspec.x = Math.min(mspec.x, mx + 400); cspec.x = Math.min(cspec.x, cx + 400);
    }
    const slot = new Path2D(); slot.rect(A.slot.x0, 0, A.slot.x1 - A.slot.x0, HH);
    c.g.save(); if (inU < 0.5) c.g.clip(slot);
    const MF = R.figure('marina', mspec), CF = R.figure('christof', cspec);
    h.shadow(c, 'porch', MF.shape, 0.45); h.shadow(c, 'porch', CF.shape, 0.45);
    [MF, CF].forEach(F => { R.draw(c.g, F, Object.assign({ em: c.em, falloff: false }, LPORCH)); h.occlude(c, R.path(F)); });
    c.g.restore();
    h.front(c, lt, s, 'porch');
  }
  shots.push({ at: T.s16, name: 'porch: tell him what you told me', draw(c, st, lt) { porchDraw(c, st, lt, { x: 960, y: 528, zoom: 1 + 0.003 * st }); } });
  shots.push({ at: T.s17, name: 'porch_push: two churches', draw(c, st, lt) { porchDraw(c, st, lt, { x: 960, y: 512, zoom: 1.05 + 0.003 * st }); } });
  shots.push({ at: T.s18, name: 'porch: finally!', draw(c, st, lt) { porchDraw(c, st, lt, { x: 960, y: 528, zoom: 1 + 0.003 * st }); } });

  // ---- 19. Hall wide: they cross, laughing over each other (Scott holds the door, off). Coats and trails make five.
  shots.push({ at: T.s19, name: 'hall: they come in', draw(c, st, lt) {
    const h = SET(), A = h.anchors.hall; c.camera({ x: 960, y: 540, zoom: 1 + 0.003 * st });
    const m0 = A.threshold, c0 = A.step;
    const mw = R.walk('marina', lt, { x0: m0[0] - 40, scale: 92, facing: -1, t0: Z - 0.1, speed: 1.05 });
    const cw = R.walk('christof', lt, { x0: c0[0] + 30, scale: 92, facing: -1, t0: Z + 0.35, speed: 1.05 });
    const coats = 3 + (mw.x < 640 ? 1 : 0) + (cw.x < 640 ? 1 : 0);
    const s = hallState(lt, { door: 0.7, coats }); hallBack(c, lt, s);
    const yAt = x => lerp(A.threshold[1], A.mid[1], clamp((A.threshold[0] - x) / (A.threshold[0] - A.mid[0]), 0, 1));
    const sAt = x => lerp(88, A.mid[2], clamp((A.threshold[0] - x) / (A.threshold[0] - A.mid[0]), 0, 1));
    const lgh = Math.abs(Math.sin(FL.twos(lt) * 9));
    if (mw.x > -160) put(c, 'marina', Object.assign({ y: yAt(mw.x), scale: sAt(mw.x), t: lt }, mw, { head: -0.14 - 0.08 * lgh, look: [cw.x, 250], lookAmt: 0.4 }), Object.assign({ occ: true }, LH));
    if (cw.x > -160) put(c, 'christof', Object.assign({ y: yAt(cw.x), scale: sAt(cw.x), t: lt }, cw, { head: -0.32 - 0.1 * lgh, neck: -0.14 }), Object.assign({ occ: true }, LH));
    h.front(c, lt, s, 'hall');
  } });
  // ---- 19b. Doorway: Scott shuts the door, his head on the hot disc, his hand on the knob. The latch CLICKS.
  shots.push({ at: T.s19b, name: 'doorway: the latch', draw(c, st, lt) {
    const h = SET(), A = h.anchors.doorway; c.camera({ x: 960, y: 540, zoom: 1 + 0.004 * st });
    const door = key(lt, [[T.s19b + 0.1, 0.32], [T.latch, 0, 'inCubic']]);
    const s = { door, rain: 1, footprints: 5 }; doorBack(c, lt, s);
    const a = dpt(-0.95, 0.2), kb = h.knob('doorway', door);
    const push = seg(lt, T.latch - 0.35, T.latch);
    put(c, 'scott', { x: a[0], y: a[1], scale: a[2], facing: 1, pose: 'idle', t: lt, look: kb, lookAmt: 0.5, lean: 0.04 + 0.05 * push, head: 0.1,
      armN: { to: [kb[0] - 8, kb[1] + 6], hand: 'grip' }, hold: { F: { kind: 'bag', drips: false } } }, LDW);
    h.front(c, lt, s, 'doorway');
  } });

  // ---- 20. The lock. His hand leaves it: a second CLICK, and nothing in the frame changes. He checks. Secure. He lets go.
  shots.push({ at: T.s20, name: 'lock: the second click', draw(c, st, lt) {
    const h = SET(), A = h.anchors.lock; c.camera({ x: 930, y: 530, zoom: 1.18 + 0.0035 * st });
    const jig = lt > Z + 5.25 && lt < Z + 5.75 ? 3.2 * Math.sin((lt - Z - 5.25) / 0.5 * Math.PI) * (lt < Z + 5.5 ? 1 : 0.6) : 0;
    const s = { latch: 1, snib: 0, jiggle: Math.max(0, jig), rain: 1 }; h.back(c, lt, s, 'lock');
    const gx = A.gapAt(s), kg = [A.knobGrip[0] + gx, A.knobGrip[1]];
    // the hand: on the knob, leaves (click2 as it goes) right out of frame, comes back, grips, pulls, lets go
    const away = [2420, 1330], rest = [kg[0] + 70, kg[1] + 30];
    const p1 = R.key('scott', lt, [[Z + 3.05, 0], [Z + 3.5, 1]]), p2 = R.key('scott', lt, [[Z + 4.6, 0], [Z + 5.1, 1]]), p3 = R.key('scott', lt, [[Z + 6.0, 0], [Z + 6.5, 1]]);
    let w = rest; if (lt >= Z + 3.05) w = lerp2(rest, away, p1); if (lt >= Z + 4.6) w = lerp2(away, rest, p2); if (lt >= Z + 6.0) w = lerp2(rest, away, p3);
    if (lt > Z + 5.25 && lt < Z + 5.75) w = [w[0] + jig * 1.4, w[1]];
    const onKnob = lt < Z + 3.15 || (lt > Z + 5.05 && lt < Z + 6.05);
    lockHand(c, onKnob ? 'clasp' : 'open', w, Math.PI + 0.25, 190, [w[0] + 760, w[1] + 330]);
  } });
  function lockHand(c, pose, w, dir, Lh, from) {
    const cs = Math.cos(dir), sn = Math.sin(dir);
    const hs = O.fig.hand(pose, { curl: 0.5 }).transform([cs * Lh, sn * Lh, -sn * Lh, cs * Lh, w[0], w[1]]);
    const arm = O.S().capsule(from[0], from[1], Lh * 0.36, w[0], w[1], Lh * 0.21).add(hs);
    const p = arm.path(0.6, 9); c.g.fillStyle = C.ink; c.g.fill(p);
    SET().fx.rim(c.g, p, [-1, -1], 3, C.tungsten);
  }

  // ---- 21. The hall, last look: he goes back to the party. Five coats, five trails, and one pair just inside the threshold
  //          on clean floor at his right, with nothing leading to it. The camera drifts toward it.
  shots.push({ at: T.s21, name: 'hall: one pair too many', draw(c, st, lt) {
    const h = SET(), A = h.anchors.hall; const u = sm(clamp(st / 2.5, 0, 1));
    c.camera({ x: lerp(985, 1085, u), y: lerp(552, 596, u), zoom: lerp(1.03, 1.045, u) });
    const ex = key(lt, [[T.s21 + 0.3, 0.0], [T.s21 + 1.6, 1, 'inOutSine']]);
    const s = hallState(lt, { door: 0, extraPrints: ex, coatList: ['deena', 'angelo', 'kay', 'christof', 'marina'] }); hallBack(c, lt, s);
    const ls = A.latchSide; const tr = R.turn('scott', lt, T.s21 + 0.2, 1, -1);
    const wk = R.walk('scott', lt, { x0: ls[0], scale: ls[2], facing: -1, t0: T.s21 + 0.6, speed: 1.0 });
    const spec = lt < T.s21 + 0.6 ? { x: ls[0], y: ls[1], scale: ls[2], facing: tr.facing, squash: tr.squash, view34: tr.view34, pose: 'idle', t: lt } : Object.assign({ y: ls[1] + (ls[0] - wk.x) * 0.05, scale: ls[2], t: lt }, wk);
    if (spec.x > -200) put(c, 'scott', Object.assign(spec, { hold: { F: { kind: 'bag', drips: false } } }), Object.assign({ occ: true }, LH));
    h.front(c, lt, s, 'hall');
  }, fade: () => 0 });

  // ---- 22. Tally: six marks, and a seventh that won't stay. Marks every two frames.
  shots.push({ at: T.tally, name: 'tally: six, and a faint seventh', post: { vignette: 0.4, halation: 0.7 }, draw(c, st) {
    TITLE().tally(c, st - TALLY0, TALLY);
  } });

  // ================================================================== LINES
  const lines = [
    // Deena & Angelo
    L('L005', 5.75, 70, 170, { size: 58 }),
    L('L006', 6.95, 1600, 250),
    L('L007', 8.05, 60, 78, { rows: [3, 7, 11], size: 50, lh: 1.22 }),
    L('L008', 11.95, 1450, 190, { rows: [3, 5], lh: 1.25 }),
    L('L009', 15.45, 60, 96, { rows: [3], size: 52, lh: 1.18 }),
    L('L010', 18.75, 70, 160),
    L('L011', 20.9, 1490, 190, { rows: [2] }),
    L('L012', 21.98, 40, 190, { until: T.s6 - 0.03 }),
    L('L013', 23.56, 1130, 470, { rows: [3] }),
    L('L014', 27.55, 50, 330, { hold: 2.2, size: 60 }),
    // Kay (LK: ivory, optical body size, beside her head on ink)
    LK('L015', K + 0.5, 1268, 238, { rows: [4, 8], until: K + 3.85 }),                  // on the dark jamb and leaf at her right (she faces Scott)
    L('L016', T.s10 + 0.05, 120, 180),
    LK('L017', T.s10 + 1.9, 1489, 318, { rows: [2], lh: 1.3 }),                           // at her right, the jamb's lit edge falling between words
    L('L018', T.s11 + 2.95, 1440, 150, { rows: [2], lh: 1.3 }),
    LK('L019', T.s11 + 4.45, 720, 190, { rows: [2], align: 'right' }),                    // behind her head, under the lamp; above her in the two-shot
    L('L020', T.s11 + 5.85, 1560, 330, { rows: [2], lh: 1.25 }),
    L('L021', T.s13 + 0.1, 26, 74, { rows: [3, 5], size: 46, slide: { from: -1100, dur: 0.3 }, lh: 1.24, until: T.s13 + 2.45 }),
    LK('L022', T.s13 + 2.5, 876, 240, { rows: [5], align: 'right' }),                     // behind her head, in the dim under the lamp
    L('L023', T.s13 + 4.6, 1600, 420),
    LK('L024', T.s14 + 1.35, 924, 80, { rows: [], align: 'right' }),                      // above the lamp, at her upper left as she sniffs
    // Christof & Marina (Marina's lines run along the dark header band above the doorway, one row each)
    L('L025', PL.c25, 1440, 250, { rows: [3], lh: 1.35 }),
    L('L026', PL.m26, 40, 56, { size: 44 }),
    L('L027', PL.c27, 1440, 230, { rows: [2, 4], lh: 1.3 }),
    L('L028', PL.m28, 40, 50, { size: 44 }),
    L('L029', PL.c29, 1440, 520, { rows: [2], lh: 1.35 }),
    L('L030', PL.a30, 1450, 210, { rows: [1, 4], lh: 1.2, slide: { from: 2100, dur: 0.3 } }),
    L('L031', PL.m31, 40, 56, { size: 44 }),
    L('L032', PL.c32, 1440, 230, { rows: [2, 4], lh: 1.3 }),
  ];

  // ================================================================== SOUND
  // a bed whose level follows steps: wraps any bed (groove on the music bus, walla on the room bus) in a gain we automate
  SND.beds['Q03.grow'] = (ac, B, t0, t1, p, Rr) => {
    const g = SND.gain(ac, 0); g.connect(B[p.bus || 'room']);
    const st = p.steps || [[t0, -40]];
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(SND.db(st[0][1]), t0 + (p.fi || 1.2));
    st.slice(1).forEach(([t, d]) => g.gain.setTargetAtTime(SND.db(d), t, p.tc || 0.5));
    const last = st[st.length - 1][1]; g.gain.setValueAtTime(SND.db(last), t1 - 0.03); g.gain.linearRampToValueAtTime(0, t1);
    const proxy = Object.assign({}, B, { room: g, music: g });
    SND.beds[p.bed](ac, proxy, t0, t1 + 2, Object.assign({ level: -0.01 }, p.inner || {}), Rr);   // runs past t1: the gain does the cut
  };
  // a short laugh: two formant bands of pink noise chopped into "ha" pulses, slowing down
  SND.cues['Q03.laugh'] = (ac, B, t, p) => {
    const n = p.n || 5, f = p.f || 700, lv = SND.db(p.level || -30);
    const out = SND.gain(ac, 1); SND.chain(out, SND.pan(ac, p.pan || 0), B.room);
    const s = SND.src(ac, 'pink', 200 + (p.seed || 0), t, t + n * 0.24 + 0.4);
    const g = SND.gain(ac, 0); [[f, 5], [f * 1.9, 7], [f * 3.1, 8]].forEach(([fq, q]) => SND.chain(s, SND.filt(ac, 'bandpass', fq, q), g));
    let tt = t; for (let i = 0; i < n; i++) { SND.perc(g, tt, lv * (1 - i * 0.12), 0.015, 0.11); tt += 0.17 + i * 0.025; }
    g.connect(out);
  };
  // the tally mark: the stock scratch (white noise, 3.5 kHz band, 30 Hz square chop) with the chop scaled by the level,
  // so a mark sits where it is put; p.faint routes it to the Extra's bus
  SND.cues['Q03.tally'] = (ac, B, t, p) => {
    const lv = SND.db(p.level == null ? -24 : p.level), g = SND.gain(ac, 0); SND.perc(g, t, lv, 0.002, 0.06);
    const s = SND.chain(SND.src(ac, 'white', 91, t, t + 0.1), SND.filt(ac, 'bandpass', 3500, 2));
    const am = SND.osc(ac, 'square', 30, t, t + 0.1), ag = SND.gain(ac, 0.5 * lv); SND.chain(am, ag); ag.connect(g.gain);
    SND.chain(s, g, SND.pan(ac, p.pan || 0), p.faint ? B.extra : B.fx);
  };

  FL.seq({
    id: 'Q03', title: 'Arrivals', dur: DUR, letterbox: 1.7778,
    lines, shots,
    sound(S) {
      const end = T.tally;
      // room tone and rain, each in a gain that cuts dead on the tally (the stock beds would fade over their last second)
      S.bed('Q03.grow', 0, end, { bed: 'room', bus: 'room', fi: 0.6, steps: [[0, 0]], inner: { level: -43 } });
      // rain: muffled with the door shut, open (bright) while it stands open; every close is a latch on screen
      S.bed('Q03.grow', 0, end, { bed: 'rain', bus: 'room', fi: 0.6, steps: [[0, 0]], inner: { level: -38, open: [[0, 0], [T.s2 + 0.05, 1], [T.shut1, 0], [T.s9 - 0.3, 1], [T.shut2, 0], [T.s16, 1], [T.latch - 0.05, 0]] } });
      // the party through the wall: the groove, and the walla growing with a swell as each guest goes through to the living room
      const IN = { deena: 19.9, angelo: K + 1.0, kay: T.s14 + 3.3, cm: Z + 1.6 };
      // (the stock beds run well under their level: walla RMS ~ level - 26 dB, groove peaks ~ level - 15 dB; levels set by ear and meter)
      S.bed('Q03.grow', 0, end, { bed: 'groove', bus: 'music', tc: 0.4, steps: [[0, -32], [IN.deena, -31], [IN.angelo, -30], [IN.kay, -28.5], [IN.cm, -26.5]] });
      S.bed('Q03.grow', 0, end, { bed: 'walla', bus: 'room', tc: 0.3, fi: 0.5, steps: [[0, -70], [IN.deena, -17.5], [IN.deena + 1.0, -21],
        [IN.angelo, -15.5], [IN.angelo + 1.1, -19], [IN.kay, -13.5], [IN.kay + 1.1, -16.5], [IN.cm, -10.5], [IN.cm + 1.3, -14]] });
      // the doorbell; a knock; a ring and impatient knocking
      S.cue('doorbell', T.bell);
      S.cue('scrape', 0.82, { n: 4, level: -38 }); S.cue('scrape', 1.37, { n: 4, level: -38 });
      S.cue('latch', 3.5, { level: -30 });
      S.cue('whoosh', T.s3 + 0.05, { dur: 0.35, level: -34 });
      S.cue('flick', 14.1, { level: -30 });                                 // the six-pack changes hands
      S.cue('Q03.laugh', 18.85, { n: 2, f: 900, level: -38, pan: -0.3 });  // the kiss
      S.cue('whoosh', T.flick - 0.05, { dur: 0.28, level: -38 });
      S.cue('latch', T.shut1, { level: -21 });                              // he shuts the door on the rain: Angelo freezes
      S.cue('knock', T.knock, { n: 3, gap: 0.17, level: -14 });
      S.cue('whoosh', T.s8 + 0.25, { dur: 0.3, level: -30 });
      S.cue('latch', T.s9 - 0.35, { level: -28 });
      [0.6, 1.5, 2.6, 3.5].forEach(d => S.cue('drip', K + d, { level: -36 }));
      S.cue('Q03.laugh', T.s12 + 0.12, { n: 4, f: 820, level: -34, pan: -0.2 });   // she laughs
      S.cue('flick', T.s12 + 1.1, { level: -34 });
      S.duck(T.s12 + 1.5, T.s13 - 0.2, 0.45);                                      // the moment: the room falls away a little
      S.cue('whoosh', T.shut2 - 0.32, { dur: 0.3, level: -38 });
      S.cue('latch', T.shut2, { level: -23 });                                     // swung shut behind him
      S.cue('swell', T.shut2 + 0.05, { dur: 1.1, f: 220, level: -38 });          // he smiles despite himself
      S.cue('doorbell', T.ring, { level: -21 });
      S.cue('knock', T.knocking, { n: 8, gap: 0.11, level: -17 });
      S.cue('latch', T.s16 - 0.15, { level: -28 });
      S.cue('Q03.laugh', Z - 0.6, { n: 6, f: 560, level: -28, pan: 0.2, seed: 1 });   // Christof
      S.cue('Q03.laugh', Z - 0.4, { n: 5, f: 980, level: -31, pan: -0.2, seed: 2 });  // Marina, over him
      // the latch; then the second click from nowhere, over a room that has gone quiet
      S.cue('latch', T.latch, { level: -9 });
      S.duck(T.click2 - 0.35, T.s20 + 3.4, 0.22);
      S.cue('click2', T.click2, { level: -15 });
      S.cue('lub', T.click2 + 0.55, { level: -24 });
      S.cue('latch', Z + 5.3, { level: -34 });                                      // he tries it: secure
      S.cue('lub', T.s21 + 1.55, { level: -27, pan: 0.45, extra: true });
      S.bed('drone7', T.click2 - 0.2, DUR, { level: -56, seventh: -49, fi: 1.5, fo: 0.3 });
      // the tally: six marks at -24, and the seventh, faint, on the Extra's bus at -36
      TITLE().tallyTimes(TALLY).forEach(m => S.cue('Q03.tally', T.tally + TALLY0 + m.t, { faint: m.faint, level: m.faint ? -36 : -24, pan: m.faint ? 0.6 : (m.i - 2.5) * 0.08 }));
    },
  });
})();
