/* ONE TOO MANY — Q10 THE KITCHEN (L183–L216, A115–A145). Set: kitchen. Letterbox 2.00 -> 2.20 on Deena's last breath (A133)
   -> 2.39 when Marina is gone (A137).
   Structure: each view has a STAGE (set + its cast, all driven by sequence time); the shot list only picks a view and a camera, so
   continuity survives the 1.3 s cutting.
     entry    the empty kitchen; the four come in; POV inserts of the open cupboard and the pushed chair
     doorway  Marina by the hall door (the reverse angle); then the same framing, empty, her full stop hanging; Scott's one step
     knobs    the count on the two knobs left; the plastic; his hand on the oven bar
     stove    F09: the pull, the thud, the door, Christof's paper-doll shadow, Scott's legs giving way, Deena pulling him back
     oven     the reveal
     deena    F10: the throat, the yank; then (a wider angle on the same wall) the catch and the pietà: Angelo holding her
              against the hood's cone until she goes quiet, and lowering her
     floor    inserts only: the handprint in the blood, and the jacket laid over her throat (his hands)
     counter  Scott, the knife
     standoff F11's room for the last exchange, so Q11 opens on the same picture
   Local additions (no shared file edited): a keyed gas bed 'Q10.gas'; cues 'Q10.flutter' (her wet breath), 'Q10.knife' (the knife
   leaving the block), 'Q10.fridge' (the compressor dying); a cheap rim (drawFig) instead of RIG's per-part rims (20-40 ms a figure
   here); the L192 slice is a custom line draw that follows the oven door's edge on screen.
   Fix pass 2 (local, no shared file edited): the entry wide draws its own stove state (pulled off the wall, the oven door down
   with its glare and floor cone, Christof's folded shadow thrown on the wall: the set's entry view has no oven state); a floor and
   one near-black blood pool (F11's look) shared by the pietà and the floor inserts (the floor inserts pass blood:0 to the set and
   draw this pool instead of its red one); the counter's open cupboard door and the cabinet fronts lit by the lamp as a backdrop for
   Scott's head; Marina's last full stop drawn locally where her ringed hand was; rowsDraw (a line broken into two rows) and
   onMatte (a line set on the 2.39 bottom matte band, drawn after post).
   Fix pass 3 (whole-film review, local): the reveal opens with an 8-frame snap into the oven mouth (stageOvenMouth: Christof folded
   in the cavity as the set's folded shape, bulb-rimmed, the pool beneath), then the wall-shadow shot plays as its echo; the doorway
   and standoff perforations are burned here (burnPerf) with 'Scott.' moved off Scott's head and half depth from 96 s; Scott sets
   the knife down on the counter at 107.9-110.8 and ends empty-handed in Q11's opening arm, the knife lying as Q11 draws it
   (counterKnife); Marina's L184 at 46 px in a brighter mint beside her; stove/ovendoor, tear/yank, step tallies and the gas end
   keys re-levelled (the gas hands Q11 -32 dB). */
(function () {
  'use strict';
  const O = window.OTM, { C, W, H, S } = O;
  const K = () => SETS.kitchen;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b, e) => FILM.seg(t, a, b, e), key = (t, ks) => FILM.key(t, ks), E = FILM.ease;
  const L2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], lerp2 = L2;
  const tw = t => FILM.twos(t), PI = Math.PI;
  const pulse = (t, t0, d) => (t >= t0 && t < t0 + d) ? 1 - (t - t0) / d : 0;

  // ============================================================== the time table (local seconds)
  const T = {
    walk: 1.0, cup: 4.3, chair: 5.6, call: 6.8, callLine: 7.3, fridgeOff: 8.6, hiss: 9.3,
    mar1: 10.3, nose: 10.5, smellLine: 11.0,
    look: 12.5, knobs: 13.8, ping0: 14.25, ping1: 14.7, tilt: 15.5, shitLine: 15.85,
    grp: 17.5, turnOffLine: 17.65, scottGo: 18.2, goneLine: 18.5,
    mar2: 19.4, behindLine: 19.6,
    grip: 21.0, tryingLine: 21.85, pull0: 22.2, rattle: 23.3, pull2: 24.1, thud: 24.75,
    ang: 25.5, leaveLine: 25.62,
    sc2: 28.4, secondLine: 28.7, reach: 28.9, hand: 29.4,
    f09: 30.6, step: 30.72, dontLine: 30.95, crack: 31.45, fall: 32.05, fallEnd: 32.47,
    reveal: 32.6, recoil: 34.0, buckle0: 34.25, buckle1: 35.2, head: 35.3, scream: 35.55, screamS: 36.25,
    mar3: 37.4, godLine: 37.5, ang2: 38.7, noLine: 38.8,
    grab: 39.8, grabbed: 40.1, pull: 40.25, turn: 40.65, fine: 41.25, throat: 42.2, clamp: 42.42, sag: 43.25, yank: 43.72,
    deeShot: 44.25, deeLine: 44.45, release: 45.12,
    catch: 45.4, slip: 45.76, caught: 45.95, settled: 46.45, lookShot: 46.55, heyLine: 46.65, hold1: 47.8, flutter: 48.0, scottSees: 49.15,
    fingers: 50.2, noStayLine: 50.45, angCU: 51.5, quiet: 53.35,
    counter: 55.3, backed: 56.3, knife: 56.7, drawn: 57.05, whereShot: 57.2, whereLine: 57.3,
    whatShot: 58.4, whatLine: 58.6, wasShot: 59.6, wasLine: 59.7, hairShot: 61.9, sawShot: 63.1, sawLine: 63.3, knowShot: 65.0, knowLine: 65.3,
    scan: 65.6, marinaLine: 66.0, door1: 67.0, waitShot: 68.3, gone: 69.7, hallShot: 71.3, marina2Line: 71.5, ringShot: 72.6,
    stepShot: 73.6, stepStop: 74.3, glance: 74.32, hereLine: 74.7,
    stare: 76.2, print: 77.55, holdingShot: 79.1, holdingLine: 79.3, know2Shot: 80.6, know2Line: 80.85, rightShot: 81.8, rightLine: 82.0,
    goShot: 83.2, goLine: 83.5, howShot: 85.1, howLine: 85.3, print2: 86.4, backShot: 87.2, backLine: 87.3,
    lay: 90.6, laid: 91.5, jacketOff: 91.5, jacketShot: 92.2, cover0: 92.4, cover1: 93.7, fiveShot: 94.2, fiveLine: 94.4,
    whatShot2: 96.8, what2Line: 97.05, cardsShot: 98.4, cardsLine: 98.6, triesShot: 100.8,
    dontShot: 102.45, dontLine2: 102.6, angRise: 104.6, endShot: 106.0, comesLine: 106.3, overShoulder: 108.4, hallEnd: 109.0, last: 110.1,
    knifeDown: 107.9, knifeFlat: 108.5, knifeLift: 110.15, knifeBack: 110.3, knifeDone: 110.8,   // he sets the knife down on the counter
    dur: 112.0,
  };
  T.mouthEnd = T.reveal + 8 / 24;   // the snap into the oven mouth: the reveal's first 8 frames
  const LB = lt => lt < T.quiet ? 2.0 : lt < T.gone ? 2.2 : 2.39;

  // ============================================================== kitchen state over time
  function pullAt(lt) {
    if (lt < T.pull0) return 0;
    const jerks = [[22.3, 0.14], [22.95, 0.2], [23.6, 0.24], [24.15, 0.62]];
    let p = 0; jerks.forEach(([t0, a], i) => { if (lt < t0) return; const big = i === 3; const u = (tw(lt) - t0) / (big ? 0.55 : 0.32);
      const v = u < 0.25 ? E.outCubic(clamp(u / 0.25, 0, 1)) : big ? 1 : clamp(1 - (u - 0.25) / 0.75 * 0.75, 0.25, 1); if (u >= 0) p = Math.max(p * 0.6, a * v); });
    if (lt > T.thud) p *= 1 - 0.7 * seg(lt, T.thud + 0.6, T.thud + 1.6);
    return p;
  }
  function ovenAt(lt) {
    if (lt < T.crack) return 0;
    if (lt < T.fall) return 0.055 * E.inOutSine(seg(lt, T.crack, T.fall));
    const u = seg(lt, T.fall, T.fallEnd); return lerp(0.055, 1, E.outCubic(u)) - (u >= 1 ? 0.025 * Math.max(0, 1 - (lt - T.fallEnd) / 0.25) * Math.sin((lt - T.fallEnd) * 40) : 0);
  }
  function kst(lt, view) {
    const s = {
      knobs: 2,
      gas: key(lt, [[0, 0.2], [T.hiss, 0.25], [12, 0.5], [T.throat, 0.62], [T.dur, 0.95]]),
      ovenOpen: ovenAt(lt), pull: pullAt(lt), thud: lt >= T.thud ? Math.max(0, 1 - (lt - T.thud) / 0.3) : 0,
      hoodFlicker: key(lt, [[0, 0], [T.reveal, 0.12], [T.throat, 0.3], [T.dur, 0.5]]),
      sway: key(lt, [[0, 0], [T.thud, 0.04], [T.throat, 0.14], [T.dur, 0.34]]),
      perforations: 0, knives: lt < T.knife ? 5 : 4, ring: lt >= T.gone ? 1 : 0, cig: 0, blood: 0, handprint: 0, jacket: 0,
    };
    // the Extra's words burn into the walls only where they will stay: the empty doorway, and the room Q11 opens in. The sequence
    // burns them itself (burnPerf, below: 'Scott.' moved off Scott's head, every hole at half depth); the set's own burn stays at 0.
    if (view === 'doorway' || view === 'standoff') s.perfLocal = key(lt, [[T.gone - 0.01, 0], [T.gone, 0.24], [T.fiveShot, 0.42], [T.endShot, 0.5]]);   // Q11 holds 0.5
    if (view === 'floor' || view === 'standoff') {
      s.blood = 1; s.handprint = lt < T.print ? 0 : 1;
      s.jacket = view === 'standoff' ? 1 : lt < T.cover0 ? 0 : lerp(0.02, 1, E.inOutSine(seg(lt, T.cover0, T.cover1)));
    }
    if (view === 'stove' || view === 'oven' || view === 'knobs') s.gas = Math.min(1, s.gas * 1.1);
    return s;
  }

  // ============================================================== drawing helpers
  // a figure with a cheap rim: the silhouette in the light's colour, then the ink body nudged away from the light, so a crescent
  // shows only on the lit side (the kitchen set's own rim2 technique)
  function drawFig(c, F, o) {
    o = o || {}; const g = c.g, p = RIG.path(F), L = o.light; const m = g.getTransform(), z = Math.hypot(m.a, m.b) || 1;
    if (L && L.x != null) {
      const at = F.joints && (F.joints.chest || F.joints.hip) || [0, 0]; let dx = L.x - at[0], dy = L.y - at[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const w = (o.w || 3) / z;
      g.save(); g.globalAlpha = o.rimAlpha == null ? 1 : o.rimAlpha; g.fillStyle = o.color || C.hoodMid; g.fill(p); g.restore();
      g.save(); g.translate(-dx * w, -dy * w); RIG.draw(g, F, { fill: o.fill, em: c.em, details: o.details, cache: false, props: o.props }); g.restore();
    } else RIG.draw(g, F, { fill: o.fill, em: c.em, details: o.details, cache: false, props: o.props });
    return F;
  }
  const put = (c, id, spec, o) => drawFig(c, RIG.figure(id, spec), o);
  function shakeAmp(lt) {
    let a = lt < T.crack ? 0 : 1.6;
    a += 3.2 * pulse(lt, T.thud, 0.45) + 3 * pulse(lt, T.fall, 0.5) + 2.6 * pulse(lt, T.throat, 0.5) + 4.2 * pulse(lt, T.yank, 0.45) + 3 * pulse(lt, T.caught, 0.5);
    if (lt > T.counter && lt < T.gone) a += 0.6;
    return a;
  }
  // a camera plus the kitchen shake (a slow drift and a little 9 Hz tremble)
  function cam(c, base, lt, o) {
    o = o || {}; const a = o.shake == null ? shakeAmp(lt) : o.shake; const sh = a > 0 ? FILM.shake(lt, a, o.hz || 1.3, o.seed || 17) : { dx: 0, dy: 0 };
    const jit = a > 0 ? FILM.shake(lt, a * 0.35, 9, 23) : { dx: 0, dy: 0 };
    c.camera({ x: base.x, y: base.y, zoom: base.zoom, rot: base.rot || 0, dx: sh.dx + jit.dx, dy: sh.dy + jit.dy });
  }
  const snap = (st, z0, z1, frames) => lerp(z0, z1, E.outExpo(clamp(st / ((frames || 7) / 24), 0, 1)));
  const lerpCam = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), zoom: lerp(a.zoom, b.zoom, u) });

  // ============================================================== the Extra's perforations, burned by the sequence (fix pass 3)
  // The set burns 'Scott.' into the standoff's upper cabinets directly behind Scott's head, and both names at a depth that reads as
  // a caption. These views pass perforations:0 to the set and burn the set's own pattern here (its algorithm, seeds, fonts, 24 burn
  // steps and pinholes), with 'Scott.' slid right along the same cabinets (clear of his head in every framing, and of Angelo's) and
  // every hole and the scorch at half depth from 96 s (the whole standoff; the doorway's last shot at 109). The doorway's burn beat
  // when Marina goes (69.7-75) keeps the set's depth: the doorway is not seen again until 109. 'Angelo.' keeps its places (the
  // doorway wall; low on the standoff's left wall): no head is ever drawn in front of either. Q11 opens on the standoff: 'Scott.'
  // at x 790 (as Q11), baseline 392, Oswald 500 168 px, holes and scorch at 0.5 of the set's depth.
  const PERF_DIM = 0.5, perfDim = (view, lt) => view === 'doorway' && lt < 96 ? 1 : PERF_DIM;
  const PERF = {
    standoff: { words: [
      { str: 'Scott.', x: 790, y: 392, fo: { family: 'Oswald', weight: 500, size: 168, tracking: 4 }, o: { seed: 'v1', step: 4, keep: 0.62, rmin: 0.7, rmax: 1.7, dmin: 0.22, dmax: 0.75, scorch: 0.55 } },
      { str: 'Angelo.', x: 62, y: 664, fo: { family: 'Libre Franklin', weight: 500, size: 70 }, o: { seed: 'v2', step: 4, keep: 0.5, rmin: 0.6, rmax: 1.4, dmin: 0.18, dmax: 0.55, scorch: 0.4 } }],
      loose: { n: 90, seed: 'f11loose', y0: 150, y1: 746, skip: (x, y) => Math.hypot((x - 1607) / 1.1, y - 378) < 420 || (x > 300 && x < 552 && y > 252) } },
    doorway: { words: [{ str: 'Angelo.', x: 372, y: 652, fo: { family: 'Libre Franklin', weight: 500, size: 84 }, o: { seed: 'd2', step: 3, keep: 0.56, rmin: 0.7, rmax: 1.6, dmin: 0.26, dmax: 0.66, scorch: 0.5 } }],
      loose: { n: 70, seed: 'dwloose', y0: 120, y1: 940, skip: (x, y) => x > 730 && x < 1150 && y > 150 } },
  };
  const _pDots = {}, _pMask = {}, _pLoose = {};
  function perfDots(view) {
    if (_pDots[view]) return _pDots[view];
    const spec = PERF[view], dots = [];
    spec.words.forEach(wd => {
      const fo = wd.fo, o = wd.o; const mc = O.makeCanvas(8, 8).getContext('2d'); mc.font = O.font(fo); mc.letterSpacing = (fo.tracking || 0) + 'px';
      const mw = mc.measureText(wd.str).width, ox = 30, oy = Math.ceil(fo.size * 1.05), cw = Math.ceil(mw + 80), ch = Math.ceil(fo.size * 1.4);
      const pg = O.makeCanvas(cw, ch).getContext('2d'); pg.font = O.font(fo); pg.letterSpacing = (fo.tracking || 0) + 'px'; pg.fillStyle = '#fff'; pg.fillText(wd.str, ox, oy);
      const d = pg.getImageData(0, 0, cw, ch).data, A = (px, py) => (px < 0 || py < 0 || px >= cw || py >= ch) ? 0 : d[(py * cw + px) * 4 + 3];
      const r = O.rng(o.seed), st = o.step || 5;
      for (let py = 0; py < ch; py += st) for (let px = 0; px < cw; px += st) {
        const jx = px + Math.round((r() - 0.5) * st * 0.8), jy = py + Math.round((r() - 0.5) * st * 0.8);
        if (A(jx, jy) < 128) continue;
        const e = A(jx + 3, jy) < 128 || A(jx - 3, jy) < 128 || A(jx, jy + 3) < 128 || A(jx, jy - 3) < 128;
        if (!e && r() > (o.inner || 0)) continue;
        if (r() > (o.keep || 0.7)) continue;
        const rad = (o.rmin || 0.8) + r() * ((o.rmax || 2) - (o.rmin || 0.8));
        dots.push({ x: wd.x - ox + jx, y: wd.y - oy + jy, rx: rad, ry: rad * (0.75 + r() * 0.5), rot: r() * 3, d: (o.dmin || 0.35) + r() * ((o.dmax || 0.9) - (o.dmin || 0.35)), b: 0.02 + 0.25 * (jx / cw) + 0.7 * r() });
      }
    });
    const L = spec.loose, r = O.rng(L.seed); let k = 0, tries = 0;
    while (k < L.n && tries < L.n * 30) { tries++; const x = r() * W, y = L.y0 + r() * (L.y1 - L.y0); if (L.skip(x, y)) continue; const rad = 0.6 + r() * 1.2; dots.push({ x, y, rx: rad, ry: rad, rot: 0, d: 0.15 + r() * 0.55, b: 0.15 + 0.85 * r(), loose: true }); k++; }
    // the words' bounds (the scorch layer and the hole mask)
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const m = O.makeCanvas(8, 8).getContext('2d');
    spec.words.forEach(wd => { m.font = O.font(wd.fo); m.letterSpacing = (wd.fo.tracking || 0) + 'px'; const w = m.measureText(wd.str).width; x0 = Math.min(x0, wd.x - 20); x1 = Math.max(x1, wd.x + w + 20); y0 = Math.min(y0, wd.y - wd.fo.size * 1.05); y1 = Math.max(y1, wd.y + wd.fo.size * 0.3); });
    const rect = { x: Math.floor(x0), y: Math.floor(y0), w: Math.ceil(x1 - x0), h: Math.ceil(y1 - y0) };
    return (_pDots[view] = { dots, rect });
  }
  // the burn: the scorch on the paper (now), the holes into the frame's holes buffer (composited at frame end; figures occlude them)
  function burnPerf(c, view, p) {
    if (!(p > 0.001)) return; const P = perfDots(view), sr = P.rect, g = c.g, spec = PERF[view], dim = perfDim(view, c.lt);
    const sc = c.cache('Q10.scorch.' + view, g2 => { g2.translate(-sr.x, -sr.y); spec.words.forEach(wd => { g2.save(); g2.filter = 'blur(3px)'; g2.globalAlpha = wd.o.scorch || 0.5; g2.font = O.font(wd.fo); g2.letterSpacing = (wd.fo.tracking || 0) + 'px'; g2.fillStyle = '#2A120A'; g2.fillText(wd.str, wd.x, wd.y); g2.restore(); }); }, sr.w, sr.h);
    g.save(); g.globalAlpha = clamp(p * 1.4, 0, 1) * dim; g.drawImage(sc, sr.x, sr.y); g.restore();
    const q = Math.max(1, Math.round(p * 24)), pq = q / 24, R = { x: sr.x - 8, y: sr.y - 8, w: sr.w + 16, h: sr.h + 16 };
    let M = _pMask[view];
    if (!M) { const res = 2, cv = O.makeCanvas(Math.ceil(R.w * res), Math.ceil(R.h * res)); M = _pMask[view] = { cv, g: cv.getContext('2d'), res, q: -1 }; }
    if (M.q !== q || M.dim !== dim) {
      const mg = M.g; mg.setTransform(1, 0, 0, 1, 0, 0); mg.clearRect(0, 0, M.cv.width, M.cv.height); mg.setTransform(M.res, 0, 0, M.res, -R.x * M.res, -R.y * M.res);
      const B = [0, 1, 2, 3, 4, 5].map(() => new Path2D());
      for (const d of P.dots) { if (d.loose || d.b > pq) continue; const bi = Math.min(5, Math.floor(d.d * 6)); B[bi].moveTo(d.x + d.rx * Math.cos(d.rot), d.y + d.rx * Math.sin(d.rot)); B[bi].ellipse(d.x, d.y, d.rx, d.ry, d.rot, 0, 6.2832); }
      mg.fillStyle = '#fff'; B.forEach((pa, i) => { mg.globalAlpha = ((i + 0.5) / 6) * (0.45 + 0.55 * pq) * dim; mg.fill(pa); }); mg.globalAlpha = 1; M.q = q; M.dim = dim;
    }
    const lk = view + ':' + q; let LB = _pLoose[lk];
    if (!LB) { LB = _pLoose[lk] = [0, 1, 2, 3, 4, 5].map(() => new Path2D()); for (const d of P.dots) { if (!d.loose || d.b > pq) continue; const bi = Math.min(5, Math.floor(d.d * 6)); LB[bi].moveTo(d.x + d.rx, d.y); LB[bi].ellipse(d.x, d.y, d.rx, d.ry, 0, 0, 6.2832); } }
    const h = c.f.markHoles(); h.save(); h.setTransform(g.getTransform()); h.imageSmoothingEnabled = true; h.drawImage(M.cv, R.x, R.y, R.w, R.h);
    h.fillStyle = '#fff'; LB.forEach((pa, i) => { h.globalAlpha = ((i + 0.5) / 6) * (0.45 + 0.55 * pq) * dim; h.fill(pa); });
    h.restore();
  }

  // ============================================================== ENTRY: the empty kitchen, the four come in
  // The room holds empty for a second; then they come in through the hall door, out from behind its left jamb (front()).
  const scaleEntry = y => 0.235 * (y - 430) / 1.6;
  const WALK_IN = {
    deena: { from: [-150, 1075], to: [690, 950], t0: 0.9, f: 1 },
    angelo: { from: [-170, 1010], to: [1000, 893], t0: 1.35, f: 1 },
    scott: { from: [-210, 1175], to: [1250, 985], t0: 1.7, f: 1 },
    marina: { from: [-170, 1150], to: [205, 1110], t0: 2.75, f: 1 },
  };
  // a walk (or run) along a diagonal of the entry floor, its scale following the room's perspective
  function pathWalk(id, lt, from, to, t0, f, run) {
    const dx = to[0] - from[0], sm = scaleEntry(to[1]);
    const fr = (run ? RIG.run : RIG.walk)(id, lt, { x0: 0, scale: sm, facing: f, t0, dist: Math.abs(dx) });
    const prog = clamp(Math.abs(fr.x) / Math.abs(dx), 0, 1);
    const x = lerp(from[0], to[0], prog), y = lerp(from[1], to[1], prog), sc = scaleEntry(y), k = sc / sm;
    const spec = Object.assign({}, fr, { x, y, scale: sc, facing: f, t: lt });
    if (fr.feet) spec.feet = { N: [x + (fr.feet.N[0] - fr.x) * k, fr.feet.N[1], fr.feet.N[2]], F: [x + (fr.feet.F[0] - fr.x) * k, fr.feet.F[1], fr.feet.F[2]] };
    delete spec.walking; spec.prog = prog;
    return spec;
  }
  const walkIn = (id, lt) => { const w = WALK_IN[id]; return pathWalk(id, lt, w.from, w.to, w.t0, w.f); };
  // the entry's stove, in its own coordinates (the set draws it flat on the back wall)
  const EG = { sL: 1385, sR: 1606, cTop: 555, WF: 716, door: [1400, 595, 1591, 698], handle: [1496, 600], mouth: [1496, 612] };
  const STOVE_E = [1500, 560];
  const SE = { x: 1650, y: 742, s: scaleEntry(742) };          // Scott at the stove's right side, facing it (as in the stove view)
  // stove-view points near the appliance -> the entry's stove (a fit of the stove box onto the small one on the back wall)
  const mapStove = p => [EG.sL + (p[0] - 1130) * 0.65, EG.cTop + (p[1] - 450) * 0.293];
  function scottEntry(lt) {
    if (lt < T.scottGo) {
      const sp = walkIn('scott', lt); if (lt > 3.8) { sp.look = lt < T.look ? [1180, 260] : STOVE_E; sp.lookAmt = 0.8; } return sp;
    }
    const arrive = T.scottGo + 2.0;
    if (lt < arrive + 0.6) {   // 'The knobs are gone.' — he goes to the stove; turns to it
      const sp = pathWalk('scott', lt, WALK_IN.scott.to, [SE.x, SE.y], T.scottGo, 1); sp.look = STOVE_E; sp.lookAmt = 0.8;
      if (sp.prog >= 1) { const tr = RIG.turn('scott', lt, arrive, 1, -1); Object.assign(sp, { facing: tr.facing, squash: tr.squash, view34: tr.view34 }); }
      return sp;
    }
    if (lt < T.grip + 0.75) return { x: SE.x, y: SE.y, scale: SE.s, facing: -1, t: lt, look: STOVE_E, lookAmt: 0.8, lean: 0.12 };
    // from the grip on, the same performance as the stove view, mapped onto the small stove on the back wall
    const sp = scottStove(lt, kst(lt, 'stove')), k = SE.s / SC.s;
    const o = Object.assign({}, sp, { x: SE.x + (sp.x - SC.x) * k, y: SE.y, scale: SE.s });
    ['armN', 'armF'].forEach(a => { if (o[a] && o[a].to) o[a] = Object.assign({}, o[a], { to: mapStove(o[a].to) }); });
    if (o.look) o.look = mapStove(o.look);
    return o;
  }
  function entryCast(lt) {
    const cast = [];
    if (lt < T.grab) {   // Angelo: at the back; 'Leave it.' a raised palm; 'No, no--' backing off, both palms up
      const sp = walkIn('angelo', lt);
      if (lt > 4.2) { sp.look = lt < 7 ? [1150, 330] : STOVE_E; sp.lookAmt = 0.6; }
      if (lt > 25.6 && lt < 30.5) { sp.armN = Object.assign({ hand: 'open', w: -1.1, handOpts: { spread: 0.12 } }, RIG.key('angelo', lt, [[25.6, { a: 0.08, b: 0.25 }], [26.1, { a: 1.15, b: 0.35 }], [29.0, { a: 1.1, b: 0.4 }], [29.8, { a: 0.1, b: 0.3 }]])); sp.look = STOVE_E; }
      if (lt > T.noLine - 0.2) {
        const u = RIG.key('angelo', lt, [[T.noLine - 0.18, 0], [T.noLine + 0.12, 1]]), back = seg(lt, T.noLine - 0.1, T.noLine + 0.9, 'outCubic');
        sp.x -= 44 * back; sp.y -= 6 * back; sp.scale = scaleEntry(sp.y); sp.leanAdd = -0.14 * u; sp.headAdd = -0.12 * u; sp.look = mapStove([1300, 900]); sp.lookAmt = 0.9;
        sp.armN = { a: lerp(0.06, 1.42, u), b: lerp(0.2, 0.62, u), hand: 'open', w: lerp(0, -1.35, u), handOpts: { spread: 0.24 } };
        sp.armF = { a: lerp(-0.04, 1.12, u), b: lerp(0.16, 0.95, u), hand: 'open', w: lerp(0, -1.25, u), handOpts: { spread: 0.24 } };
        sp.legN = { a: -0.18 * back, b: 0.12 }; sp.legF = { a: 0.12 * back, b: 0.06 };
      }
      cast.push(['angelo', sp]);
    }
    if (lt < T.grab) {   // Deena: in first; a snap step forward to call; 'Turn it off.' a point; a step toward him; she runs to him
      let sp = walkIn('deena', lt);
      if (lt > 3.6) { sp.look = lt < T.call ? [1150, 320] : lt < 12.6 ? [1600, 380] : STOVE_E; sp.lookAmt = 0.7; }
      if (lt > T.call) { const u = RIG.key('deena', lt, [[T.call + 0.2, 0], [T.call + 0.5, 1]]); sp.x += 34 * u; sp.headAdd = -0.18 * u * (1 - seg(lt, 9.5, 10.2)); }
      if (lt > T.turnOffLine - 0.1 && lt < 20.5) sp.hold = { N: { kind: 'point', at: STOVE_E } };
      if (lt > T.step) { const u = RIG.key('deena', lt, [[T.step, 0], [T.step + 0.4, 1]]); sp.x += 60 * u; sp.y -= 8 * u; sp.scale = scaleEntry(sp.y); sp.leanAdd = 0.12 * u * (1 - seg(lt, T.reveal - 0.3, T.reveal)); }
      if (lt > T.reveal - 0.3 && lt < T.mar3 + 0.45) { const r = RIG.key('deena', lt, [[T.reveal - 0.3, 0], [T.reveal - 0.18, 1]]); sp.leanAdd = -0.1 * r; sp.headAdd = -0.12 * r; sp.hold = { N: { kind: 'cover', at: 'mouth' } }; }
      if (lt >= T.mar3 + 0.45) {   // she runs to him (the grab follows in the stove view)
        const from = [sp.x, sp.y], R = pathWalk('deena', lt, from, [1500, 806], T.mar3 + 0.45, 1, true);
        sp = Object.assign(R, { look: [SE.x - 20, SE.y - 3.4 * SE.s], lookAmt: 1 });
        if (R.prog > 0.75) { sp.hold = { N: { kind: 'reach', at: [SE.x - 10, SE.y - 3.6 * SE.s] } }; sp.leanAdd = 0.25 * seg(lt, T.noLine + 0.2, T.grab, 'outCubic'); }
      }
      cast.push(['deena', sp]);
    }
    if (lt < T.grab) cast.push(['scott', scottEntry(lt)]);
    {                    // Marina stays by the door (foreground left, at the jamb): her hand to her nose at the smell
      const sp = walkIn('marina', lt);
      if (lt > 4) { sp.look = lt < 12 ? [700, 420] : STOVE_E; sp.lookAmt = 0.5; }
      if (lt > T.nose && lt < 19.1) sp.hold = { N: { kind: 'cover', at: 'mouth' } };
      if (lt > T.mar3) sp.hold = { N: { kind: 'cover', at: 'mouth' }, F: { kind: 'cover', at: 'mouth' } };
      cast.push(['marina', sp]);
    }
    return cast.sort((a, b) => a[1].y - b[1].y);
  }
  // the stove in the wide: pulled off the wall, the oven door down, the bulb's glare and its throw on the wall (the set's entry view
  // has no oven state, so it is drawn here over the set's back layer)
  const THROW_Q = [[1150, 348], [1356, 362], [1362, 492], [1160, 500]];
  function entryStoveFx(c, lt, st) {
    const g = c.g, E = c.em, u = st.ovenOpen;
    if (st.pull > 0.01) { const gp = 2 + 4 * st.pull; g.fillStyle = '#040303'; g.fillRect(EG.sL - gp, EG.cTop - 2, gp + 1, EG.WF - EG.cTop + 2); g.fillRect(EG.sL - gp, EG.WF - 1, EG.sR - EG.sL + gp, 3); }
    if (u <= 0.002) return;
    const a = clamp(u * 6, 0, 1), [dl, dt, dr, db] = EG.door, th = u * PI / 2, Hd = (db - dt) / 178.6, h0 = (EG.WF - db) / 178.6;
    const prj = (X, h, z) => [960 + 1000 * X / z, 430 + 1000 * (1.6 - h) / z], XL = (dl - 960) * 5.6 / 1000, XR = (dr - 960) * 5.6 / 1000;
    const hT = h0 + Hd * Math.cos(th), zT = 5.6 - Hd * Math.sin(th), tl = prj(XL, hT, zT), tr = prj(XR, hT, zT);
    // the throw: bulb light up the wall to the left of the hood, Christof's folded shadow thrown into it (cached), from the reveal
    if (lt >= T.fall + 0.1) {
      const k = clamp((lt - T.fall - 0.1) / 0.45, 0, 1);
      O.cone(g, [[dl + 10, dt + 4], [dl + 80, dt + 2], THROW_Q[2], THROW_Q[3], THROW_Q[0]], C.hood, 0.05 * k);
      const cv = c.cache('Q10.enThrow3', g2 => {
        g2.save(); g2.beginPath(); g2.rect(0, 0, 1366, 552); g2.clip();
        O.lightPool(g2, 1258, 420, [{ r: 150, color: C.hoodMid }, { r: 100, color: C.hood }], { sy: 0.74, rough: 3.2, seed: 913 });
        const fn = RIG.homography([[0, 0], [6, 0], [6, 4], [0, 4]], THROW_Q), shP = RIG.warp(K().foldedShape(), fn).path(0.9, 31);
        g2.strokeStyle = 'rgba(13,10,9,0.45)'; g2.lineWidth = 7; g2.lineJoin = 'round'; g2.stroke(shP); g2.fillStyle = '#100C0A'; g2.fill(shP);
        g2.restore();
      }, W, H);
      g.save(); g.globalAlpha = 0.9 * k; g.drawImage(cv, 0, 0); g.restore();
    }
    // the mouth: lit, the bulb's core at the top, the rack
    g.fillStyle = C.hood; g.fillRect(dl, dt, dr - dl, db - dt);
    g.fillStyle = '#FFF4CC'; g.fillRect(dl + 20, dt + 3, dr - dl - 40, 12 + 6 * a);
    g.strokeStyle = C.ink; g.lineWidth = 2.5; g.beginPath(); g.moveTo(dl, dt + 42); g.lineTo(dr, dt + 42); g.stroke();
    g.lineWidth = 1.5; for (let i = 1; i < 12; i++) { const x = dl + (dr - dl) * i / 12; g.beginPath(); g.moveTo(x, dt + 42); g.lineTo(x - 4, dt + 62); g.stroke(); }
    E.save(); E.globalAlpha = a; E.fillStyle = C.hood; E.fillRect(dl - 10, dt - 10, dr - dl + 20, db - dt + 20); E.restore();
    // its light out over the floor toward us
    O.cone(g, [[dl, db], [dr, db], [dr + 260, 1010], [dl - 160, 1010]], C.hood, 0.1 * a);
    // the door, dropped toward us on its hinge: ink, its lit top edge
    const dq = [[dl, db], [dr, db], tr, tl]; g.fillStyle = C.ink; g.fill(P2q(dq));
    g.strokeStyle = C.hood; g.lineWidth = 2.5; g.beginPath(); g.moveTo(tl[0], tl[1]); g.lineTo(tr[0], tr[1]); g.stroke();
    g.strokeStyle = C.hoodMid; g.lineWidth = 1.5; g.beginPath(); g.moveTo(dl, db + 1); g.lineTo(dr, db + 1); g.stroke();
  }
  const P2q = pts => { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath(); return p; };
  function stageEntry(c, lt, camBase, o) {
    o = o || {}; const st = kst(lt, 'entry'); cam(c, camBase, lt, o);
    K().back(c, lt, st, 'entry'); const L = K().light.entry;
    entryStoveFx(c, lt, st);
    const bulb = { x: EG.mouth[0], y: EG.mouth[1] };
    if (!o.pov) entryCast(lt).forEach(([id, sp]) => {
      const nearOven = st.ovenOpen > 0.02 && (id === 'scott' || (id === 'deena' && sp.x > 1250));
      const F = put(c, id, sp, { light: nearOven ? bulb : L, color: nearOven ? C.hood : C.hoodMid, w: nearOven ? 3 : 2.6, fill: id === 'marina' ? '#080605' : undefined, details: { ringColor: C.tMarina, hoopColor: C.hoodMid } });
      if (st.ovenOpen > 0.02) { c.em.save(); c.em.fillStyle = '#000'; c.em.fill(RIG.path(F)); c.em.restore(); }   // a body in front of the glare blocks its bloom
    });
    K().front(c, lt, st, 'entry');
  }

  // ============================================================== DOORWAY: Marina by the door; then nobody; Scott's step
  function stageDoorway(c, lt, camBase, o) {
    o = o || {}; const st = kst(lt, 'doorway'); cam(c, camBase, lt, o);
    K().back(c, lt, st, 'doorway'); burnPerf(c, 'doorway', st.perfLocal); const L = K().light.doorway, A = K().anchors.doorway, occ = [];
    if (lt < T.gone) {
      const sp = { x: A.marina.x - 6, y: A.marina.y, scale: 100, facing: 1, t: lt, idleAmt: 0.6, look: [1700, 640], lookAmt: 0.6 };
      if (lt >= T.nose - 0.05 && lt < T.behindLine) sp.hold = { N: { kind: 'cover', at: 'mouth' } };
      if (lt >= T.behindLine && lt < 23) { sp.hold = { N: { kind: 'point', at: [2100, 560] } }; sp.look = [2100, 560]; }
      if (lt >= T.mar3 - 0.1 && lt < 50) { sp.hold = { N: { kind: 'cover', at: 'mouth' }, F: { kind: 'cover', at: 'mouth' } }; sp.leanAdd = -0.06; sp.look = [1600, 900]; }
      if (lt >= 50) { sp.hold = { N: { kind: 'cover', at: 'mouth' } }; sp.look = [1500, 1060]; sp.lookAmt = 0.9; sp.idleAmt = 0.1; }
      const F = put(c, 'marina', sp, { light: L, color: C.hoodMid, w: 2.6, details: { ringColor: C.tMarina } }); occ.push(RIG.path(F));
    }
    if (o.scott) {   // one step toward the hall; he stops; he turns his head and shoulders back to Angelo (behind him, camera-right)
      const u = RIG.key('scott', lt, [[T.stepShot + 0.1, 0], [T.stepStop, 1]]), s1 = Math.sin(u * PI);
      const tr = RIG.turn('scott', lt, T.glance, -1, 1, { dur: 0.45 }), back = tr.u > 0.5;
      const trem = [10 * Math.sin(lt * 2 * PI * 9), 14 * Math.sin(lt * 2 * PI * 9 + 1.3)];
      const sp = { x: lerp(1660, 1500, u), y: 1300, scale: 128, facing: tr.facing, squash: tr.squash, view34: Math.max(tr.view34 || 0, back ? 0.3 : 0), t: lt, breath: 9, leanAdd: 0.05 * s1,
        legN: { a: 0.25 * s1, b: 0.3 * s1 }, legF: { a: -0.2 * s1, b: 0.15 },
        look: back ? [2600, 640] : [700, 520], lookAmt: 1,
        hold: { N: { kind: 'knife', point: back ? [1100 + trem[0], 760 + trem[1]] : [900 + trem[0], 700 + trem[1]] } } };
      const F = put(c, 'scott', sp, { light: L, color: C.hoodMid, w: 3, fill: '#070505' }); occ.push(RIG.path(F));
    }
    st.ring = 0; st.occluders = occ; K().front(c, lt, st, 'doorway');
    if (lt >= T.gone) marinaRing(c, lt);
  }
  // her last full stop, hanging where her ringed hand was in the identical framing a moment before (her hand at her mouth)
  let _ringAt = null;
  function ringAt() {
    if (_ringAt) return _ringAt; const A = K().anchors.doorway;
    const F = RIG.figure('marina', { x: A.marina.x - 6, y: A.marina.y, scale: 100, facing: 1, t: T.door1, idleAmt: 0.1, look: [1500, 1060], lookAmt: 0.9, hold: { N: { kind: 'cover', at: 'mouth' } } });
    return (_ringAt = [F.joints.wristN[0] + 31, F.joints.wristN[1] - 18]);
  }
  function marinaRing(c, lt) {
    const g = c.g, at = ringAt(), tt = lt, bob = Math.sin(tt * PI * 2 * 0.31) * 2.5, turn = Math.cos(tt * 0.9), r = 21, a = clamp((lt - T.gone) / 0.08, 0, 1);
    g.save(); g.globalAlpha = a; g.strokeStyle = C.tMarina; g.lineWidth = 4.6; g.beginPath(); g.ellipse(at[0], at[1] + bob, r * (0.3 + 0.7 * Math.abs(turn)), r, 0, 0, 7); g.stroke(); g.restore();
    c.em.save(); c.em.globalAlpha = 0.35 * a; c.em.strokeStyle = C.tMarina; c.em.lineWidth = 6; c.em.beginPath(); c.em.ellipse(at[0], at[1] + bob, r * (0.3 + 0.7 * Math.abs(turn)), r, 0, 0, 7); c.em.stroke(); c.em.restore();
  }

  // ============================================================== KNOBS: the stove front insert; Scott's hand on the handle
  function armShape(from, to, w0, w1, hand) { return S().capsule(from[0], from[1], w0, to[0], to[1], w1).add(hand); }
  function rimFill(g, path, light, at, w, col, fill) {
    let dx = light.x - at[0], dy = light.y - at[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    g.save(); g.fillStyle = col; g.fill(path); g.translate(-dx * w, -dy * w); g.fillStyle = fill || C.ink; g.fill(path); g.restore();
  }
  function stageKnobs(c, lt, camBase, o) {
    o = o || {}; const st = kst(lt, 'knobs'); cam(c, camBase, lt, o); const g = c.g;
    K().back(c, lt, st, 'knobs'); const A = K().anchors.knobs;
    // the count: a ring of hood light lands on each knob that remains
    [[T.ping0, 0], [T.ping1, 3]].forEach(([t0, i]) => {
      if (lt < t0 || lt > t0 + 1.4) return; const u = (lt - t0) / 1.4, p = A.knobs[i];
      g.save(); g.globalAlpha = (1 - u) * 0.9; g.strokeStyle = C.hood; g.lineWidth = 4; g.beginPath(); g.arc(p[0], p[1], A.knobR + 14 + 26 * E.outCubic(u), 0, 7); g.stroke(); g.restore();
      c.em.save(); c.em.globalAlpha = (1 - u) * 0.5; c.em.fillStyle = C.hood; c.em.beginPath(); c.em.arc(p[0], p[1], A.knobR, 0, 7); c.em.fill(); c.em.restore();
    });
    if (o.hand) {   // Scott's hand finds the bar: the arm slides in from below right, the fingers close round it
      const h = K().at('knobs', 'ovenHandle', st), u = RIG.key('scott', lt, [[T.hand + 0.05, 0], [T.hand + 0.6, 1]]), off = [(1 - u) * 520, (1 - u) * 420];
      const curl = lerp(0.15, 0.72, seg(lt, T.hand + 0.45, T.hand + 0.8, 'outCubic'));
      const hand = O.fig.hand('hold', { curl }).transform([150, 0, 0, 150, h[0] + 30 + off[0], h[1] - 60 + off[1]]).rotate(0.9, h[0] + off[0], h[1] + off[1]);
      const hp = armShape([h[0] + 560 + off[0], h[1] + 500 + off[1]], [h[0] + 60 + off[0], h[1] + 10 + off[1]], 74, 46, hand).path(0.8, 3);
      rimFill(g, hp, K().light.knobs, h, 4, C.hoodMid);
    }
  }

  // ============================================================== STOVE (F09's world): the pull, the thud, the door, the collapse, the grab
  const SC = { x: 1720, y: 1068, s: 112 };
  function scottStove(lt, st) {
    const h = K().at('stove', 'ovenHandle', st);
    if (lt < T.grip + 0.75) {   // walks in from the right to his mark
      const fr = RIG.walk('scott', lt, { x0: 2060, scale: SC.s, facing: -1, t0: T.grip, dist: 2060 - SC.x }); delete fr.walking;
      return Object.assign({ y: SC.y, scale: SC.s, t: lt, look: h }, fr);
    }
    if (lt < T.sc2) {           // grips the appliance by its side and top corner; pulls in jerks; the thud; lets go
      const p = st.pull, rel = seg(lt, T.thud + 0.5, T.thud + 1.4, 'inOutSine');
      const side = [h[0] + 104, h[1] - 60], top = [h[0] + 96, h[1] - 176];
      return { x: SC.x + 10 * p, y: SC.y, scale: SC.s, facing: -1, t: lt, idleAmt: 0.2, lean: lerp(0.2 - 0.3 * p, 0.12, rel), neck: -0.05, head: lerp(0.15 + 0.15 * p, 0.1, rel),
        armN: rel < 0.6 ? { to: side, hand: 'grip' } : { a: 0.2, b: 0.4, hand: 'relaxed' },
        armF: rel < 0.6 ? { to: top, hand: 'grip' } : { a: 0.1, b: 0.3, hand: 'relaxed' },
        legN: { a: 0.32 + 0.12 * p, b: 0.45 }, legF: { a: -0.38 - 0.1 * p, b: 0.3 }, look: lt > T.thud ? [h[0] - 60, h[1] + 30] : [h[0] + 60, h[1] - 120] };
    }
    if (lt < T.f09) {           // 'Just one second.' — he reaches for the handle (hovering, correcting)
      const u = RIG.key('scott', lt, [[T.reach, 0], [T.hand + 0.7, 1]]);
      return { x: SC.x, y: SC.y, scale: SC.s, facing: -1, t: lt, idleAmt: 0.3, lean: lerp(0.1, 0.14, u), neck: lerp(-0.05, -0.18, u), head: lerp(0.1, -0.32, u), look: h,
        armN: u < 0.05 ? { a: 0.2, b: 0.4, hand: 'relaxed' } : { to: L2([SC.x - 60, SC.y - 420], h, u), hand: 'hold' }, armF: { a: 0.1, b: 0.3, hand: 'relaxed' },
        legN: { a: 0.38 * u, b: 0.62 * u }, legF: { a: -0.12, b: 0.55 * u } };
    }
    if (lt < T.recoil) {        // F09: the handle; the door drops; the far arm comes up as the bulb lights him from below
      const letGo = seg(lt, T.fall + 0.05, T.fall + 0.4, 'outCubic'), shield = seg(lt, T.fall, T.fall + 0.35, 'outCubic');
      const hb = K().at('stove', 'ovenHandle', st);
      return { x: SC.x + 30 * letGo, y: SC.y, scale: SC.s, facing: -1, t: lt, idle: false, lean: lerp(0.14, -0.02, letGo), neck: lerp(-0.18, -0.25, letGo), head: lerp(-0.32, -0.05, letGo),
        armN: letGo < 0.5 ? { to: hb, hand: 'hold' } : { a: lerp(0.9, 0.55, letGo), b: 0.5, hand: 'open', w: -0.4 },
        armF: { a: lerp(0.1, 1.05, shield), b: lerp(0.3, 2.15, shield), hand: 'open', w: -0.4 }, legN: { a: 0.38, b: 0.62 }, legF: { a: -0.12, b: 0.55 }, look: [1240, 640], lookAmt: 1 };
    }
    // the collapse: a small sound, the legs give way; the scream; then Deena's hands
    const bu = RIG.key('scott', lt, [[T.buckle0, 0], [T.buckle1, 1]], { curve: 'ioq' });
    const pose = RIG.buckle('scott', bu);
    const sp = { x: SC.x + 30 + 12 * bu, y: SC.y, scale: SC.s, facing: -1, t: lt, idle: false, look: [1240, 650], lookAmt: 1, pose };
    if (lt > T.scream + 0.3 && lt < T.grab + 0.3) {   // head thrown back, a hand to his eyes
      const u = seg(lt, T.scream + 0.3, T.scream + 0.8, 'outCubic') * (1 - seg(lt, T.grab, T.grab + 0.3));
      sp.pose = Object.assign({}, pose, { neck: pose.neck - 0.5 * u, head: pose.head - 0.75 * u }); sp.look = undefined;
      if (u > 0.3) sp.hold = { F: { kind: 'cover', at: 'eyes' } };
    }
    if (lt > T.quiet - 4.5) { sp.look = [600, 600]; sp.lookAmt = 0.8; }   // later: staring across at the two of them
    return sp;
  }
  let F09M = null;
  function stageStove(c, lt, camBase, o) {
    o = o || {}; const st = kst(lt, 'stove'); cam(c, camBase, lt, o);
    if (o.deena === 'f09') F09M = { frame: c.frame, m: c.g.getTransform() };
    K().back(c, lt, st, 'stove'); const Lh = K().light.stove, bulb = Lh.bulb;
    const lit = st.ovenOpen > 0.02 ? { light: { x: bulb.x, y: bulb.y }, color: C.hood, w: 3.4 } : { light: { x: Lh.x, y: Lh.y }, color: C.hoodMid, w: 2.6 };
    let SP = scottStove(lt, st);
    if (o.deena === 'f09' && lt < T.recoil) {
      const u = RIG.key('deena', lt, [[T.step, 0], [T.step + 0.4, 1]]);
      const D = { x: 360 + 70 * u, y: 1000, scale: 76, facing: 1, t: lt, lean: 0.05 + 0.15 * u, neck: 0.1, head: 0.04, swing: -0.55 * u,
        armN: { a: lerp(0.3, 1.3, u), b: lerp(0.3, 0.08, u), hand: 'open', w: -0.12 }, armF: { a: lerp(0, -0.6, u), b: 0.35 },
        legN: { a: 0.5 * u, b: 0.15 }, legF: { a: -0.38 * u, b: 0.25 * u + 0.05 }, look: [1500, 600] };
      // the throw climbs the wall beside her: she stops dead and recoils (Deena snaps: one drawing, held)
      const rc = RIG.key('deena', lt, [[T.fall + 0.24, 0], [T.fall + 0.34, 1]]);
      if (rc > 0) Object.assign(D, { x: D.x - 18 * rc, lean: lerp(D.lean, -0.1, rc), neck: lerp(0.1, -0.22, rc), head: lerp(0.04, -0.18, rc), swing: lerp(D.swing, 0, rc),
        armN: { a: lerp(1.3, 0.55, rc), b: lerp(0.08, 1.75, rc), hand: 'open', w: -0.5 }, armF: { a: lerp(-0.6, 0.35, rc), b: lerp(0.35, 1.9, rc), hand: 'open', w: -0.4 },
        legN: { a: lerp(0.5, 0.12, rc), b: 0.12 }, legF: { a: lerp(-0.38, -0.28, rc), b: 0.2 }, look: [600, 380] });
      put(c, 'deena', D, Object.assign({}, lit, { details: { hoopColor: C.hoodMid } }));
    }
    if (o.deena === 'grab' && lt >= T.grab) {
      // she comes in behind him, bends and takes his shoulders; pulls him back; he turns to her
      const inU = RIG.key('deena', lt, [[T.grab, 0.72], [T.grabbed, 1]]);   // she has just reached him (the wide saw her go)
      const A = { id: 'deena', x: lerp(2160, SC.x + 42 + 1.85 * SC.s, inU), y: SC.y, scale: SC.s, facing: -1, t: lt, idle: false, lean: 0.35, neck: 0.15, head: 0.3 };
      const tu = RIG.key('scott', lt, [[T.turn, 0], [T.turn + 0.5, 1]]);
      const B = Object.assign({ id: 'scott' }, SP, { hold: undefined, view34: 0.5 * Math.sin(tu * PI) });
      if (tu > 0.05) { B.look = [A.x + 60, SC.y - 6.6 * SC.s]; B.lookAmt = 1; B.pose = Object.assign({}, B.pose, { lean: B.pose.lean - 0.2 * tu, neck: B.pose.neck - 0.3 * tu, head: B.pose.head - 0.4 * tu }); }
      const pull = RIG.key('deena', lt, [[T.pull, 0], [T.turn + 0.2, 1]]);
      if (inU > 0.85) { const gr = RIG.grab(A, B, { pull }); Object.assign(A, gr.A); Object.assign(B, gr.B); A.autoLean = true; }
      else { A.armN = { a: 1.25, b: 0.35, hand: 'open' }; A.armF = { a: 1.05, b: 0.45, hand: 'open' }; }
      if (inU < 1) { const fr = RIG.walk('deena', lt, { x0: 2160, scale: SC.s, facing: -1, t0: T.grab, dist: 2160 - A.x }); A.legN = { a: 0.5 * Math.sin(inU * 6), b: 0.3 }; A.legF = { a: -0.5 * Math.sin(inU * 6), b: 0.3 }; void fr; }
      put(c, 'scott', B, lit);
      put(c, 'deena', A, Object.assign({}, lit, { details: { hoopColor: C.hoodMid } }));
    } else put(c, 'scott', SP, lit);
    K().front(c, lt, st, 'stove');
  }
  // OVEN (the reveal, magnified): only his hand on the bar for a moment
  function stageOven(c, lt, camBase, o) {
    o = o || {}; const st = kst(lt, 'oven'); cam(c, camBase, lt, o);
    K().back(c, lt, st, 'oven');
    if (lt < T.reveal + 0.75) {
      const h = K().at('oven', 'ovenHandle', st), away = seg(lt, T.reveal + 0.25, T.reveal + 0.7, 'inCubic'), off = [away * 420, away * 260];
      const hand = O.fig.hand('hold', { curl: lerp(0.7, 0.2, away) }).transform([130, 0, 0, 130, h[0] + 26 + off[0], h[1] - 50 + off[1]]).rotate(0.95, h[0] + off[0], h[1] + off[1]);
      const hp = armShape([h[0] + 520 + off[0], h[1] + 300 + off[1]], [h[0] + 50 + off[0], h[1] + 6 + off[1]], 66, 40, hand).path(0.8, 5);
      rimFill(c.g, hp, K().light.oven.bulb, h, 5, C.hood);
    }
  }

  // ============================================================== OVEN MOUTH (fix pass 3): the snap into the open oven, 8 frames
  // Looking down into the cavity over the dropped door. The bulb burns in the back wall's top right corner; Christof is folded in
  // front of it as one ink cut-out (the set's folded shape: back against the ceiling, legs bent along the floor, his curls hanging
  // against the lit back wall), rimmed by the bulb, a near-black pool beneath him running over the lip onto the door. The bulb is
  // behind him, so this is the very shape it throws out of the mouth and up the kitchen wall: the next shot plays as its echo.
  const OM = { M: [[330, 168], [1590, 168], [1590, 880], [330, 880]], VP: [960, 330], back: 0.55, body: 0.69, bulb: [1290, 262], pad: 80 };
  const omAt = (k, p) => [OM.VP[0] + (p[0] - OM.VP[0]) * k, OM.VP[1] + (p[1] - OM.VP[1]) * k];
  const omQuad = k => OM.M.map(p => omAt(k, p));
  let _omBody = null;
  function omBody() {   // the folded shape on the cross-section of the cavity at the body's depth
    return _omBody || (_omBody = RIG.warp(K().foldedShape(), RIG.homography([[0, 0], [6, 0], [6, 4], [0, 4]], omQuad(OM.body))).path(0.9, 31));
  }
  function ovenMouthLayer(c) {
    const pad = OM.pad;
    return c.cache('Q10.ovMouth2', g => {
      g.translate(pad, pad);
      const M = OM.M, B = omQuad(OM.back), mouthP = P2q(M), bulb = OM.bulb;
      // the oven's front: enamel in the dark, a bevel round the mouth catching the cavity's light
      g.fillStyle = '#0B0807'; g.fillRect(-pad, -pad, W + 2 * pad, H + 2 * pad);
      const bev = P2q([[M[0][0] - 34, M[0][1] - 30], [M[1][0] + 34, M[1][1] - 30], [M[2][0] + 34, M[2][1] + 10], [M[3][0] - 34, M[3][1] + 10]]);
      g.fillStyle = '#16110D'; g.fill(bev);
      g.save(); g.clip(bev); O.lightPool(g, 960, 520, [{ r: 900, color: '#16110D' }, { r: 760, color: O.mix(C.hoodLow, C.ink, 0.72) }], { sy: 0.62, rough: 2, seed: 951 }); g.restore();
      // the cavity
      g.save(); g.clip(mouthP);
      const wallL = P2q([M[0], B[0], B[3], M[3]]), wallR = P2q([B[1], M[1], M[2], B[2]]), ceil = P2q([M[0], M[1], B[1], B[0]]), floor = P2q([B[3], B[2], M[2], M[3]]);
      const plane = (p, base, pools, seed) => { g.save(); g.clip(p); g.fillStyle = base; g.fillRect(0, 0, W, H); O.lightPool(g, bulb[0], bulb[1], pools, { sy: 0.8, rough: 2.4, seed }); g.restore(); };
      plane(P2q(B), C.hoodMid, [{ r: 620, color: C.hoodMid }, { r: 430, color: C.hood }, { r: 120, color: '#FFE9A8' }], 952);
      plane(wallL, O.mix(C.hoodMid, C.ink, 0.25), [{ r: 900, color: O.mix(C.hoodMid, C.ink, 0.15) }, { r: 640, color: C.hoodMid }], 953);
      plane(wallR, C.hoodLow, [{ r: 420, color: C.hoodMid }, { r: 190, color: C.hood }], 954);
      plane(ceil, O.mix(C.hoodLow, C.ink, 0.3), [{ r: 520, color: C.hoodLow }, { r: 260, color: C.hoodMid }], 955);
      plane(floor, O.mix(C.hoodLow, C.ink, 0.35), [{ r: 760, color: C.hoodLow }, { r: 520, color: O.mix(C.hoodMid, C.hoodLow, 0.4) }], 956);
      // the seams between the planes, and the rack runners pressed into the side walls
      g.strokeStyle = 'rgba(8,6,5,0.7)'; g.lineWidth = 3; [0, 1, 2, 3].forEach(i => { g.beginPath(); g.moveTo(M[i][0], M[i][1]); g.lineTo(B[i][0], B[i][1]); g.stroke(); });
      g.beginPath(); B.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke();
      [0.3, 0.5, 0.7].forEach(f => [[0, 3], [1, 2]].forEach(([a, b]) => {
        const m0 = L2(M[a], M[b], f), b0 = L2(B[a], B[b], f);
        g.strokeStyle = '#0D0907'; g.lineWidth = 5; g.beginPath(); g.moveTo(m0[0], m0[1]); g.lineTo(b0[0], b0[1]); g.stroke();
        g.strokeStyle = C.hood; g.lineWidth = 1.6; g.globalAlpha = 0.7; g.beginPath(); g.moveTo(m0[0], m0[1] - 4); g.lineTo(b0[0], b0[1] - 3); g.stroke(); g.globalAlpha = 1;
      }));
      // the bulb: a glass cap in the corner, its core
      g.fillStyle = '#FFF4CC'; g.beginPath(); g.ellipse(bulb[0], bulb[1], 30, 20, 0, 0, 7); g.fill();
      g.strokeStyle = C.hood; g.lineWidth = 3; g.beginPath(); g.ellipse(bulb[0], bulb[1], 38, 27, 0, 0, 7); g.stroke();
      // the pool beneath him on the cavity floor (F11's blood: near-black, red only at its edge, a wet lip toward the bulb): it comes
      // out from under him at his depth and runs forward toward the lip
      g.save(); g.clip(floor); drawPools(g, [[[930, 742], 450, 50, 61], [[912, 818], 150, 60, 64]], { x: bulb[0], y: bulb[1] });
      g.restore();
      // Christof: one ink cut-out, rimmed where the bulb (top right, behind him) catches his edges
      const bp = omBody(); g.fillStyle = C.hood; g.fill(bp);
      g.save(); g.translate(-4.5, 3); g.fillStyle = '#0A0706'; g.fill(bp); g.restore();
      g.restore();
      // the mouth's enamel lip; the bottom lip (the hinge) catches the most
      g.strokeStyle = C.hoodMid; g.lineWidth = 3; g.beginPath(); g.moveTo(M[3][0], M[3][1]); g.lineTo(M[0][0], M[0][1]); g.lineTo(M[1][0], M[1][1]); g.lineTo(M[2][0], M[2][1]); g.stroke();
      // the dropped door below the hinge: its inner face toward us, the inner glass, the bulb's streak in it
      const door = P2q([[M[3][0] - 30, M[3][1] + 14], [M[2][0] + 30, M[2][1] + 14], [M[2][0] + 190, H + pad], [M[3][0] - 190, H + pad]]);
      g.fillStyle = '#0E0A08'; g.fill(door);
      const glass = P2q([[520, 930], [1400, 930], [1500, H + pad], [420, H + pad]]); g.fillStyle = '#070505'; g.fill(glass);
      g.save(); g.clip(glass); g.globalAlpha = 0.22; g.fillStyle = C.hoodMid; g.fill(P2q([[1180, 930], [1260, 930], [1330, H + pad], [1240, H + pad]])); g.restore();
      g.fillStyle = C.hood; g.fillRect(M[3][0] - 30, M[3][1] + 4, M[2][0] - M[3][0] + 60, 4);
      // the pool over the lip: one tongue of it down the door's face
      const spill = S().poly([[830, 884], [990, 884], [990, 912], [960, 968], [930, 1004], [905, 966], [860, 930], [800, 905]]).path(0.8, 63);
      g.fillStyle = O.mix(C.blood, C.ink, 0.45); g.fill(spill); g.save(); g.translate(2, 3); g.fillStyle = '#080405'; g.fill(spill); g.restore();
    }, W + 2 * OM.pad, H + 2 * OM.pad);
  }
  function stageOvenMouth(c, lt, camBase, o) {
    o = o || {}; cam(c, camBase, lt, o); const g = c.g;
    g.drawImage(ovenMouthLayer(c), -OM.pad, -OM.pad);
    const E2 = c.em, b = OM.bulb, B = omQuad(OM.back), fl = 0.92 + 0.08 * Math.sin(lt * 2 * PI * 13);   // the bulb's filament flicker on ones
    E2.save(); E2.globalAlpha = 0.28 * fl; E2.fillStyle = C.hood; E2.fill(P2q(B)); E2.globalAlpha = 0.95 * fl; E2.beginPath(); E2.ellipse(b[0], b[1], 70, 50, 0, 0, 7); E2.fill();
    E2.globalAlpha = 1; E2.fillStyle = '#000'; E2.fill(omBody()); E2.restore();   // he blocks the glow
  }

  // the throat line sits on the neck, below the jaw and the earring (as F10), not under the lips
  const lowThroat = (th, d) => ({ A: th.A, B: th.B, down: th.down, pt: u => { const p = th.pt(u); return [p[0], p[1] + d]; }, crescent: (a, b, w) => th.crescent(a, b, w).translate(0, d) });
  // ============================================================== DEENA (F10): she's fine; the throat; the yank; 'Dee?'
  function stageDeena(c, lt, camBase, o) {
    o = o || {}; const st = kst(lt, 'deena'); cam(c, camBase, lt, o); const g = c.g;
    K().back(c, lt, st, 'deena');
    const cut = lt >= T.throat, clampU = RIG.key('deena', lt, [[T.clamp, 0], [T.clamp + 0.22, 1]]);
    const sag = RIG.key('deena', lt, [[T.sag, 0], [T.yank - 0.05, 1]]) * (1 - seg(lt, T.yank, T.yank + 2 / 24));
    const fall = seg(lt, T.release, T.release + 0.35, 'inQuad');
    const sp = { x: 1270 - 18 * sag + 40 * fall, y: 1150 + 95 * sag + 280 * fall, anchor: 'hip', scale: 222, facing: -1, t: lt, idle: false, legN: { a: 0.75, b: 1.05 }, legF: { a: 0.45, b: 0.95 },
      lean: 0.05, neck: 0.12, head: 0.3, armN: { a: 0.22, b: 0.75, hand: 'open', w: -0.3 }, armF: { a: 0.15, b: 0.6, hand: 'relaxed' }, breath: cut ? 0 : 4 };
    if (cut) {
      const k = seg(lt, T.throat, T.throat + 0.14, 'outCubic');
      sp.neck = lerp(0.12, -0.15, k); sp.head = lerp(0.3, -0.12, k); sp.lean = 0.02;
      if (clampU > 0.05) sp.hold = { N: { kind: 'cover', at: 'throat' }, F: { kind: 'cover', at: 'throat' } };
      if (lt > T.clamp + 0.25) { sp.look = [300, 560]; sp.lookAmt = 1; }
      if (sag > 0) { sp.lean = 0.02 + 0.22 * sag; sp.neck = -0.15 + 0.35 * sag; sp.head = -0.12 + 0.35 * sag; }
      if (lt >= T.yank && lt < T.release) {
        // the grip: a fist that is not there, high behind her head; it shakes as it holds her up
        const tq = tw(lt), up = E.outExpo(clamp((lt - T.yank) / (2 / 24), 0, 1));
        sp.pony = { grip: [lerp(1400, 1440, up) + 7 * Math.sin(tq * 2 * PI * 4.7), lerp(420, 170, up) + 5 * Math.sin(tq * 2 * PI * 6.1 + 1)] };
        sp.lean = 0.12; sp.neck = -0.4; sp.head = -0.3; sp.look = undefined;
      }
      if (lt >= T.release) { sp.neck = 0.2; sp.head = 0.4; sp.lean = 0.3 + 0.5 * fall; sp.rot = -0.5 * fall; sp.hold = { N: { kind: 'cover', at: 'throat' } }; }
    }
    const D = RIG.figure('deena', sp);
    drawFig(c, D, { light: { x: 1250, y: 0 }, color: C.hood, w: 4, details: { hoopColor: C.hoodMid } });
    if (cut) {
      // the Extra's cut: an ember arc for 4 frames, then blood (always darker than wine); a faint ember core stays in the wound
      const th = lowThroat(RIG.throat(D), 24), f4 = (lt - T.throat) * 24, grow = clamp((f4 + 1) / 4, 0, 1);
      const hands = []; ['N', 'F'].forEach(s => { const hh = D.holds && D.holds[s]; if (hh && hh.hand) hands.push(hh.hand.path(0.6, 9)); });
      if (f4 >= 4) {
        const b = seg(f4, 4, 14);
        g.save(); g.clip(RIG.path(D)); g.globalAlpha = 0.9 * b; g.fillStyle = C.blood; g.fill(th.crescent(0, 1, 14 * b + 5).path(0.25, 6));
        g.globalAlpha = 1; g.strokeStyle = O.mix(C.blood, C.ink, 0.25); g.lineCap = 'round';
        [[0.12, 1.0], [0.82, 0.7]].forEach(([u0, k2], i) => { const p0 = th.pt(u0), len = 70 * k2 * seg(lt, T.throat + 0.25 + 0.1 * i, T.throat + 1.6); g.lineWidth = 7 - 2 * i; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p0[0] + th.down[0] * len, p0[1] + th.down[1] * len); g.stroke(); });
        g.restore();
        hands.forEach(p => { g.fillStyle = C.ink; g.fill(p); });
      }
      const crescent = th.crescent(0.08, 0.08 + 0.78 * grow, 9).path(0.3, 5);
      const holes = c.f.markHoles(); holes.save(); holes.setTransform(g.getTransform()); holes.clip(RIG.path(D));
      holes.globalAlpha = f4 < 4 ? 1 : lerp(1, 0.5, seg(f4, 4, 16)); holes.fillStyle = '#fff'; holes.fill(crescent); holes.restore();
      hands.forEach(p => K().occlude(c, p));
    }
    // Angelo, foreground left: frozen, then reaching for her on 'Dee?'
    const r = RIG.key('angelo', lt, [[T.deeLine - 0.1, 0], [T.deeLine + 0.5, 1]]);
    const asp = { x: 120 + 70 * r, y: 1520, anchor: 'hip', scale: 290, facing: 1, t: lt, idleAmt: 0.2, lean: 0.12 + 0.1 * r, neck: 0.16, head: 0.06 - 0.1 * r, look: D.joints.head, lookAmt: 0.6 };
    // his open hand strains toward her middle, low and short of her body: never near her throat or her hair
    if (r > 0.02) asp.hold = { N: { kind: 'reach', at: lerp2(lerp2([760, 980], [905, 860], r), [840, 1090], seg(lt, T.release, T.release + 0.25, 'inOutSine')) } };
    put(c, 'angelo', asp, { light: { x: 1250, y: 0 }, color: C.hoodLow, fill: '#070504', w: 3 });
  }

  // ============================================================== PIETÀ (the 'deena' wall, a wider angle): the catch; he holds her
  const PS = 125, PFY = 992, PAX = 760;
  const PIETA = { x: PAX + 3.35 * PS, y: PFY - 0.45 * PS, rot: -0.85, neck: -0.45, head: -0.55 };
  const legsTo = sp => { sp.legN = { to: [PAX + 6.75 * PS, PFY - 0.22 * PS], knee: 'up' }; sp.legF = { to: [PAX + 7.05 * PS, PFY - 0.26 * PS], knee: 'up' }; };   // nearly straight: her body reads as one shape
  function deenaPieta(lt) {
    if (lt < T.caught) {   // she falls forward, toward him (face down, the hand still at her throat)
      const u = E.inQuad(seg(lt, T.catch, T.caught));
      return { x: lerp(1270, 1080, u), y: lerp(PFY - 3.5 * PS, PFY - 2.25 * PS, u), anchor: 'hip', scale: PS, facing: -1, t: lt, idle: false, breath: 0,
        rot: lerp(0, -0.85, u), lean: lerp(0.1, 0.25, u), neck: lerp(0.3, 0.45, u), head: lerp(0.5, 0.6, u),
        legN: { a: lerp(0.25, 0.95, u), b: lerp(0.5, 1.7, u) }, legF: { a: lerp(-0.05, 0.5, u), b: lerp(0.4, 1.4, u) }, armF: { a: lerp(0.5, 1.2, u), b: 0.35, hand: 'relaxed' },
        hold: { N: { kind: 'cover', at: 'throat' } } };
    }
    // caught, turned face up in his arms (the turn is hidden by the cut); settling
    const s = E.outCubic(seg(lt, T.caught, T.settled));
    const dead = seg(lt, T.quiet - 0.5, T.quiet + 0.7, 'inOutSine'), lay = seg(lt, T.lay, T.laid, 'inQuad');
    const sp = { x: lerp(PIETA.x - 70, PIETA.x, s) + 40 * lay, y: lerp(PIETA.y - 80, PIETA.y, s) + 0.32 * PS * lay, anchor: 'hip', scale: PS, facing: 1, t: lt, idle: false,
      rot: lerp(-1.05, PIETA.rot, s) - 0.62 * lay, lean: 0, neck: lerp(PIETA.neck, -0.62, dead), head: lerp(PIETA.head, -0.78, dead), roll: 0.4,
      armF: { a: lerp(-0.2, -0.45, dead), b: lerp(0.3, 0.15, dead), hand: 'relaxed', handOpts: { curl: 0.3 } }, breath: 0 };
    legsTo(sp);
    if (lt < T.quiet) {
      sp.breath = 3 + 3 * (1 - seg(lt, T.hold1, T.quiet));
      const fl = seg(lt, T.flutter, T.flutter + 0.25) * (1 - seg(lt, T.flutter + 1.2, T.flutter + 1.6)) + 0.6 * pulse(lt, T.fingers + 0.5, 0.8), q = tw(lt);
      sp.lean += 0.035 * fl * Math.sin(q * 2 * PI * 5.5); sp.head += 0.06 * fl * Math.sin(q * 2 * PI * 4.2 + 1); sp.neck += 0.03 * fl * Math.sin(q * 2 * PI * 3.1);
    }
    // her near hand: at her throat; then its strength goes: it slides down her chest and drops to the floor
    const slide = seg(lt, T.fingers + 0.25, T.fingers + 1.25, 'inOutSine');
    if (slide < 1) {
      const sk = RIG.skeleton('deena', sp).sk; const thr = sk.toPx(sk.T(0.3, 2.55)), low = sk.toPx(sk.T(0.45, 1.3));
      sp.hold = { N: { kind: 'cover', at: slide <= 0 ? 'throat' : L2(thr, low, slide), curl: 0.05 + 0.4 * slide } };
    } else sp.armN = { a: lerp(-0.25, -0.5, dead), b: 0.2, hand: 'relaxed', handOpts: { curl: 0.45 } };
    return sp;
  }
  function angeloPieta(lt, Dsp) {
    if (lt < T.caught) {   // he runs at her, the foot shoots out in the blood, he goes down on his knees under her
      // his hands stay low, toward her middle: never at her head or her hair
      const ks = [[T.catch, { x: 330, lean: 0.35, neck: 0.1, head: 0.2, legN: { a: 0.75, b: 0.35 }, legF: { a: -0.55, b: 0.95 }, armN: { a: 0.92, b: 0.3 }, armF: { a: 0.7, b: 0.35 } }],
        [45.62, { x: 520, lean: 0.3, neck: 0.1, head: 0.2, legN: { a: -0.45, b: 0.85 }, legF: { a: 0.65, b: 0.25 }, armN: { a: 1.02, b: 0.22 }, armF: { a: 0.45, b: 0.4 } }],
        [T.slip, { x: 600, lean: -0.28, neck: -0.1, head: 0.0, legN: { a: 1.25, b: 0.05 }, legF: { a: -0.35, b: 1.25 }, armN: { a: 0.85, b: 0.18 }, armF: { a: -1.0, b: 0.45 } }],
        [T.caught, { x: 690, lean: 0.45, neck: 0.25, head: 0.4, legN: { a: 1.0, b: 1.2 }, legF: { a: 0.2, b: 1.5 }, armN: { a: 1.0, b: 0.7 }, armF: { a: 0.9, b: 0.8 } }]];
      const P = key(tw(lt), ks.map(k => [k[0], k[1]]));
      P.armN = Object.assign({ hand: 'open', handOpts: { spread: 0.15 } }, P.armN); P.armF = Object.assign({ hand: 'open', handOpts: { spread: 0.15 } }, P.armF);
      return Object.assign({ y: PFY, scale: PS, facing: 1, t: lt, idle: false, ground: 1 }, P);
    }
    const s = E.outCubic(seg(lt, T.caught, T.settled)), lay = seg(lt, T.lay, T.laid, 'inOutSine'), dead = lt > T.quiet;
    const sp = Object.assign({}, RIG.POSES.kneel(), { x: PAX, y: PFY, scale: PS, facing: 1, t: lt, idleAmt: 0.15, lean: lerp(0.78, 0.62, s) + 0.2 * lay, neck: 0.32, head: 0.42 });
    if (dead) sp.lean += 0.025 * Math.sin(lt * 2 * PI * 0.33);   // he holds her anyway: a small rocking
    const sk = RIG.skeleton('deena', Dsp).sk;
    const under = sk.toPx(sk.T(-0.45, 2.1)), chest = sk.toPx(sk.T(0.35, 1.5)), face = sk.toPx(sk.T(0.3, 2.9));
    sp.hold = { N: { kind: 'flat', at: under, view: 'edge', fingers: 1, angle: 0.4, elbow: 'down' }, F: { kind: 'flat', at: chest, view: 'edge', curl: 0.35, elbow: 'down' } };
    sp.look = face; sp.lookAmt = 0.9;
    const up = (a, b) => lt > a && lt < b;
    if (up(T.whatShot - 0.15, T.sawShot) || up(T.sawLine - 0.1, T.knowShot + 0.4) || up(T.know2Line - 0.2, T.rightShot) || up(T.goLine - 0.1, T.howShot)) { sp.look = [-500, 120]; sp.lookAmt = 0.75; sp.head = 0.12; sp.neck = 0.18; }
    if (up(T.stare, T.holdingShot) || up(T.howLine + 0.5, T.backShot)) { sp.look = [1350, 1250]; sp.lookAmt = 1; sp.head = 0.75; }
    if (lt >= T.laid) {   // the jacket comes off: kneeling up, shoulders back, arms behind
      const k = Math.sin(seg(lt, T.laid, T.jacketShot + 0.3) * PI);
      sp.hold = undefined; sp.lean = 0.12; sp.neck = 0.15; sp.head = 0.35; sp.look = [1200, 1200];
      sp.armN = { a: -0.65 * k, b: 0.55 + 0.6 * k, hand: 'fist' }; sp.armF = { a: -0.5 * k, b: 0.65 + 0.5 * k, hand: 'fist' };
      if (lt > T.laid + 0.45) { sp.clothes = 'none'; const f = seg(lt, T.laid + 0.45, T.laid + 0.75, 'outCubic'); sp.armN = { a: lerp(-0.3, 1.25, f), b: lerp(0.9, 0.35, f), hand: 'fist' }; sp.lean = 0.12 + 0.18 * f; sp.look = [1200, 700]; }
    }
    return sp;
  }
  // the tiles under them: a floor in the cone's spill, and her blood (near-black, red only at its lit lip, as F11), cached
  function pietaFloor(c, lt) {
    const g = c.g, b = seg(lt, T.caught, T.quiet + 3, 'outCubic');
    const cv = c.cache('Q10.pietaFloor', g2 => {
      g2.translate(200, 0); g2.fillStyle = '#0A0706'; g2.fillRect(-200, PFY - 4, W + 400, 300);
      g2.save(); g2.beginPath(); g2.rect(-200, PFY - 4, W + 400, 300); g2.clip();
      O.lightPool(g2, 1180, PFY + 14, [{ r: 760, color: '#120E0A' }, { r: 520, color: '#1C160C' }, { r: 300, color: C.hoodLow }], { sy: 0.07, rough: 1.6, seed: 917 });
      g2.restore();
      g2.fillStyle = '#050404'; g2.fillRect(-200, PFY - 6, W + 400, 3);
    }, W + 400, H + 400);
    g.drawImage(cv, -200, 0);
    if (b > 0.01) drawPool(g, [PAX + 1.3 * PS, PFY + 8], 300 * Math.sqrt(b), 15 * Math.sqrt(b), { x: 1250, y: 0 }, 41);
  }
  function stagePieta(c, lt, camBase, o) {
    o = o || {}; const st = kst(lt, 'deena'); cam(c, camBase, lt, o); const g = c.g;
    K().back(c, lt, st, 'deena');
    pietaFloor(c, lt);
    const Dsp = deenaPieta(lt), Asp = angeloPieta(lt, Dsp);
    const L = { x: 1250, y: 0 };
    const AF = put(c, 'angelo', Asp, { light: L, color: C.hoodLow, w: 3, fill: '#070504' });
    if (lt > T.laid + 0.45) {   // the jacket, off, hanging from his fist
      // bunched cloth from the fist: narrow at the grip, falling open, a sleeve hanging off one side, a ragged hem; it swings
      const w = AF.joints.wristN, sw = 0.14 * Math.sin((lt - T.laid) * 3.1) * Math.max(0, 1 - (lt - T.laid - 0.45) / 1.2), q = PS;
      const pts = [[-0.12, -0.05], [0.14, -0.06], [0.3, 0.4], [0.44, 1.1], [0.36, 1.55], [0.18, 1.42], [0.05, 1.62], [-0.12, 1.45], [-0.3, 1.58], [-0.4, 1.2], [-0.28, 0.5]];
      const cloth = S().poly(pts.map(([x, y]) => [x * q, y * q])).capsule(0.3 * q, 0.35 * q, 0.1 * q, 0.62 * q, 1.35 * q, 0.08 * q).rotate(sw, 0, 0).translate(w[0], w[1] + 0.06 * q);
      rimFill(g, cloth.path(0.8, 41), L, [w[0], w[1] + 0.8 * q], 3, C.hoodMid, '#16110E');
    }
    {   // she stays where he lays her, on the tiles in front of his knees
      const D = put(c, 'deena', Dsp, { light: L, color: C.hood, w: 4, details: { hoopColor: C.hoodMid } });
      // the wound under her hand: blood only now (the Extra's line has gone dark)
      if (lt >= T.caught) { const th = lowThroat(RIG.throat(D), 13); g.save(); g.clip(RIG.path(D)); g.globalAlpha = 0.85; g.fillStyle = C.blood; g.fill(th.crescent(0, 1, 9).path(0.25, 6)); g.restore();
        const hh = D.holds && D.holds.N; if (hh && hh.hand) { g.fillStyle = C.ink; g.fill(hh.hand.path(0.6, 9)); } }
    }
    if (o.scott) scottOTS(c, lt);
  }
  // Scott on the floor, seen from behind his shoulder: he has turned from the oven to them; a held breath, a hand to his mouth
  function scottOTS(c, lt) {
    const base = { x: 1745, y: 1540, anchor: 'hip', scale: 265, facing: -1, t: lt, idle: false, breath: 0, view34: 0.3, lean: 0.3, neck: 0.22, head: 0.42, look: [900, 980], lookAmt: 1,
      armF: { a: 0.25, b: 0.5, hand: 'relaxed' }, legN: { a: 1.2, b: 1.9 }, legF: { a: 1.0, b: 2.0 } };
    const hd = RIG.figure('scott', base).joints.head, up = E.outCubic(seg(lt, T.scottSees + 0.12, T.scottSees + 0.5));
    const mouth = [hd[0] - 0.42 * base.scale, hd[1] + 0.3 * base.scale], low = [mouth[0] + 0.25 * base.scale, mouth[1] + 1.6 * base.scale];
    const sp = Object.assign({}, base, { hold: { N: { kind: 'cover', at: L2(low, mouth, up), curl: 0.2 } }, leanAdd: -0.03 * up });
    put(c, 'scott', sp, { light: { x: 1250, y: 0 }, color: C.hood, w: 3.5, fill: '#070505' });
  }

  // Deena's blood, one look everywhere (F11): a near-black pool, blood-red only at its edge, a thin wet lip of hood light toward the lamp
  const _poolP = {};
  function poolPath(cx, cy, rx, ry, seed) {
    const key = [cx, cy, rx, ry, seed].map(v => Math.round(v)).join(':'); if (_poolP[key]) return _poolP[key];
    const pts = [], N = 48; for (let i = 0; i < N; i++) { const a = i / N * PI * 2, k = 0.62 + 0.7 * O.fbm(Math.cos(a) * 1.7 + 3, Math.sin(a) * 1.7 + 7, seed, 3) + 0.1 * Math.sin(a * 3 + seed); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    const keys = Object.keys(_poolP); if (keys.length > 120) delete _poolP[keys[0]];
    return (_poolP[key] = S().poly(pts).path(0.8, seed));
  }
  function drawPool(g, at, rx, ry, light, seed) {
    const p = poolPath(at[0], at[1], rx, ry, seed), core = poolPath(at[0] + rx * 0.015, at[1] - ry * 0.03, rx * 0.93, ry * 0.84, seed);
    let dx = light.x - at[0], dy = light.y - at[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    g.save(); g.globalAlpha = 0.85; g.fillStyle = C.hoodMid; g.fill(p); g.restore();
    g.save(); g.translate(-dx * 2.4, -dy * 2.4); g.fillStyle = O.mix(C.blood, C.ink, 0.45); g.fill(p); g.restore();
    g.fillStyle = '#080405'; g.fill(core);
    return p;
  }
  // several pool shapes poured as one: each layer of drawPool laid for all of them before the next, so they merge without seams
  function drawPools(g, list, light) {
    const P = list.map(([at, rx, ry, seed]) => ({ at, p: poolPath(at[0], at[1], rx, ry, seed), core: poolPath(at[0] + rx * 0.015, at[1] - ry * 0.03, rx * 0.93, ry * 0.84, seed) }));
    const c0 = P[0].at; let dx = light.x - c0[0], dy = light.y - c0[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    g.save(); g.globalAlpha = 0.85; g.fillStyle = C.hoodMid; P.forEach(q => g.fill(q.p)); g.restore();
    g.save(); g.translate(-dx * 2.4, -dy * 2.4); g.fillStyle = O.mix(C.blood, C.ink, 0.45); P.forEach(q => g.fill(q.p)); g.restore();
    g.fillStyle = '#080405'; P.forEach(q => g.fill(q.core));
  }
  // ============================================================== FLOOR (inserts): the handprint; the jacket laid over her
  const DU = 122.8, DLX = 640, DLY = 363.8;
  const LIE = { x: DLX, y: DLY, rot: PI / 2, lean: 0, neck: -0.2, head: -0.5, swing: -3.0, armN: { a: -0.05, b: 0.1, hand: 'relaxed' }, armF: { a: -0.05, b: 0.1, hand: 'relaxed' }, legN: { a: 0.75, b: 1.35 }, legF: { a: -0.02, b: 0.12 } };
  function jacketPt(cov, p) {   // a point of the jacket (in her lying units) as the set draws it while it is lowered
    const q = 1 - (cov * cov * (3 - 2 * cov)), a = q * 0.22, cx = 1.45 * DU, cy = -0.2 * DU, x = p[0] * DU - cx, y = p[1] * DU - cy;
    return [cx + x * Math.cos(a) - y * Math.sin(a) + DLX - q * 0.35 * DU, cy + x * Math.sin(a) + y * Math.cos(a) + DLY - q * 1.25 * DU];
  }
  // her hand, hanging from Angelo's lap above the frame: limp fingers resting on the tiles at the pool's edge
  function hangingHand(c, lt) {
    const g = c.g, L = K().light.floor, sw = 3 * Math.sin(FILM.twos(lt) * 2 * PI * 0.33);   // his rocking reaches it
    const el = [1470 + sw, 40], wr = [1318 + sw * 0.5, 404], tip = [1236, 462], a = Math.atan2(tip[1] - wr[1], tip[0] - wr[0]);
    const hand = O.fig.hand('relaxed', { curl: 0.35 }).transform([92, 0, 0, -92, 0, 0]).rotate(a, 0, 0).translate(wr[0], wr[1]);
    const hp = S().capsule(el[0], el[1], 30, wr[0], wr[1], 21).add(hand).path(0.7, 61);
    rimFill(g, hp, L, wr, 3, C.hoodMid, '#080605');
  }
  // Angelo's two arms laying the jacket: shoulders above the frame, elbows bent out toward the lamp, short forearms, flat hands
  function jacketArms(c, lt) {
    const g = c.g, L = K().light.floor, cov = seg(lt, T.cover0, T.cover1, 'inOutSine'), away = seg(lt, T.cover1 + 0.15, T.cover1 + 0.7, 'inCubic');
    if (lt < T.cover0 - 0.3 || away >= 1) return;
    const lift = 1 - seg(lt, T.cover0 - 0.3, T.cover0, 'outCubic');
    [[[2.6, -0.52], -1.0, 0], [[2.0, -0.62], -1.25, 1]].forEach(([jp, elA, i]) => {
      const p0 = jacketPt(Math.max(cov, 0.001), jp), d = [away * 120, -away * 330 - lift * 150], p = [p0[0] + d[0], p0[1] + d[1]];
      const wr = [p[0] + 30, p[1] - 22], el = [wr[0] + 118 * Math.cos(elA), wr[1] + 118 * Math.sin(elA)], sh = [el[0] - 30, el[1] - 128];
      const ha = Math.atan2(p[1] - wr[1] + 6, p[0] - wr[0] - 30) + 0.25;
      const hand = O.fig.hand('flat', { curl: 0.18 }).transform([82, 0, 0, 82 * 0.78, 0, 0]).rotate(ha, 0, 0).translate(wr[0], wr[1]);
      const hp = S().capsule(sh[0], sh[1], 36, el[0], el[1], 30).capsule(el[0], el[1], 29, wr[0], wr[1], 21).add(hand).path(0.8, 7 + i);
      rimFill(g, hp, L, el, 3, C.hoodMid, '#080605');
    });
  }
  const FPOOL = { at: [935, 468], rx: 360, ry: 68 };
  function stageFloor(c, lt, camBase, o) {
    o = o || {}; const st = kst(lt, 'floor'); st.blood = 0; cam(c, camBase, lt, o); const g = c.g;
    K().back(c, lt, st, 'floor'); const L = K().light.floor;
    drawPool(g, FPOOL.at, FPOOL.rx, FPOOL.ry, L, 57);   // the same near-black pool as the standoff's (F11), not the set's red one
    // the handprint arrives with a two-frame ember flicker, deeper than the set's own cut
    if (lt >= T.print && lt < T.print + 2 / 24) {
      const PR = K().anchors.floor.handprint, s = 128, sq = 0.36, a = -0.35, ca = Math.cos(a), sa = Math.sin(a);
      K().knock(c, O.fig.hand('splay', { spread: 0.2 }).transform([s * ca, s * sa * sq, -s * sa, s * ca * sq, PR[0], PR[1]]).path(0.5, 4), (lt - T.print) * 24 < 1 ? 1 : 0.15);
    }
    if (!o.lying) hangingHand(c, lt);
    if (o.lying) {
      const D = put(c, 'deena', Object.assign({ anchor: 'hip', scale: DU, facing: -1, idle: false, breath: 0 }, LIE), { light: L, color: C.hood, w: 3, details: { hoopColor: C.hoodMid } });
      K().mid(c, lt, st, 'floor');
      jacketArms(c, lt);
      K().occlude(c, RIG.path(D));
    }
  }

  // ============================================================== COUNTER: Scott backs in, the knife; scanning; talking to Angelo
  // He backs along the counter until his hip meets it by the block; his far hand braces on the edge behind him, the near one finds
  // a knife. His head is framed against the open cupboard door, whose face is turned to the lamp and lit (so the face can act).
  const CTA = { start: 1060, mark: 1312, s: 128 }; CTA.y = 608 + 3.96 * CTA.s;
  function scottCounter(lt) {
    const A = K().anchors.counter;
    const back = RIG.key('scott', lt, [[T.counter, 0], [T.backed, 1]]);
    const hard = 0.03 * Math.sin(lt * 2 * PI * 1.7);   // breathing hard
    const sp = { x: lerp(CTA.start, CTA.mark, back), y: CTA.y, scale: CTA.s, facing: -1, t: lt, breath: 8, idleAmt: 0.4, lean: -0.08 * back + hard, neck: 0.08, head: 0.08 };
    if (back < 1) { const s2 = Math.sin(back * PI * 3); sp.legN = { a: 0.25 * s2, b: 0.2 }; sp.legF = { a: -0.25 * s2, b: 0.2 }; sp.look = [300, 300 + 120 * Math.sin(lt * 3)]; sp.lookAmt = 1; }
    if (back > 0.85) sp.hold = { F: { kind: 'flat', at: [CTA.mark + 0.95 * CTA.s, 600], view: 'edge', angle: 0, curl: 0.35 } };   // braced on the edge behind him
    // the 9 Hz tremor of the hand that holds the knife
    const trem = [7 * Math.sin(lt * 2 * PI * 9) + 3 * Math.sin(lt * 2 * PI * 13.7), 10 * Math.sin(lt * 2 * PI * 9 + 1.1) + 3 * Math.sin(lt * 2 * PI * 11.3)];
    if (lt >= T.backed - 0.1 && lt < T.knife) {   // the hand finds the block behind him
      sp.hold = Object.assign({}, sp.hold, { N: { kind: 'grip', at: A.knife, elbow: 'back' } }); sp.armN = { to: A.knife, hand: 'grip', elbow: 'back' }; delete sp.hold.N;
    } else if (lt >= T.knife) {
      const out = seg(lt, T.knife, T.drawn + 0.15, 'outCubic');
      let aim = lt < T.scan ? [420, 330] : [lerp(260, 900, 0.5 + 0.5 * Math.sin((lt - T.scan) * 1.6)), 300];
      if (lt > T.hallShot) aim = [240, 300];
      if (lt > T.backShot) aim = [160, 320];
      const p = L2([A.knife[0] - 60, A.knife[1] + 60], aim, out);
      sp.hold = Object.assign({}, sp.hold, { N: { kind: 'knife', point: [p[0] + trem[0] * 3, p[1] + trem[1] * 3], elbow: 'down' } });
      sp.look = [420, 300]; sp.lookAmt = 1;
      if (lt > T.wasShot && lt < T.scan) { sp.look = [300, 900]; sp.head = 0.2; }                       // to Angelo, on the floor
      if (lt > T.scan && lt < T.gone) sp.look = [lerp(150, 700, 0.5 + 0.5 * Math.sin((lt - T.scan) * 2.3)), 200];
      if (lt > T.hallShot) sp.look = [120, 220];
      if (lt > T.holdingShot) { sp.look = [300, 950]; sp.head = 0.2; }
      if (lt > T.backShot) sp.look = [80, 280];
    }
    return sp;
  }
  // the open cupboard door's face, turned to the lamp at right: lit in posterised bands (a backdrop for his head)
  function counterDoorLight(c) {
    const cv = c.cache('Q10.ctDoor2', g2 => {
      g2.translate(0, 200);
      // the lamp's spill reaching the cabinet fronts beside the open door (the cupboard's inside stays black)
      const fronts = new Path2D(); fronts.rect(980, -260, 350, 582); fronts.rect(1656, -260, 300, 582);
      g2.save(); g2.clip(fronts);
      O.lightPool(g2, 1318, 205, [{ r: 250, color: O.mix(C.hoodLow, C.ink, 0.62) }, { r: 175, color: O.mix(C.hoodLow, C.ink, 0.38) }, { r: 105, color: O.mix(C.hoodLow, C.ink, 0.12) }], { sy: 1.05, rough: 2.2, seed: 932 });
      g2.restore();
      g2.fillStyle = '#050404'; [1012, 1124].forEach(x => g2.fillRect(x, -260, 3, 582));
      // the open door's face, turned to the lamp
      const door = P2q([[1330, -20], [1236, -40], [1236, 350], [1330, 318]]);
      g2.save(); g2.clip(door);
      g2.fillStyle = O.mix(C.hoodLow, C.ink, 0.2); g2.fillRect(1200, -260, 200, 700);
      O.lightPool(g2, 1420, 170, [{ r: 175, color: C.hoodLow }, { r: 120, color: C.hoodMid }], { sy: 1.6, rough: 2, seed: 931 });
      g2.restore();
      g2.fillStyle = '#060504'; g2.fill(P2q([[1232, -40], [1238, -40], [1238, 350], [1232, 351]]));
      g2.fillStyle = C.hoodMid; g2.fill(P2q([[1326, -20], [1331, -20], [1331, 318], [1326, 319]]));
    }, W, H + 400);
    c.g.drawImage(cv, 0, -200);
  }
  function stageCounter(c, lt, camBase, o) {
    o = o || {}; const st = kst(lt, 'counter'); cam(c, camBase, lt, o);
    K().back(c, lt, st, 'counter'); const L = K().light.counter;
    counterDoorLight(c);
    put(c, 'scott', scottCounter(lt), { light: { x: L.x, y: L.y }, color: C.hoodMid, w: 3.2 });
  }

  // ============================================================== STANDOFF (the last exchange; Q11 starts here)
  function stageStandoff(c, lt, camBase, o) {
    o = o || {}; const st = kst(lt, 'standoff'); cam(c, camBase, lt, o);
    K().back(c, lt, st, 'standoff'); burnPerf(c, 'standoff', st.perfLocal); const A = K().anchors.standoff, L = K().light.standoff;
    const rise =RIG.key('angelo', lt, [[T.angRise, 0], [T.angRise + 2.6, 1]], { mood: 'drained' });
    const STAND = { lean: 0.14, neck: 0.24, head: 0.42, legN: { a: 0.04, b: 0.06 }, legF: { a: -0.05, b: 0.04 }, armN: { a: 0.02, b: 0.08, hand: 'relaxed' }, armF: { a: -0.02, b: 0.06, hand: 'relaxed' } };   // drained: shoulders down, head low, arms hanging
    const ap = RIG.blend(RIG.POSES.kneelSit(), STAND, rise);
    const asp = Object.assign({}, ap, { ground: 1, x: lerp(1585, A.angelo.x, rise), y: A.angelo.y, scale: 76, facing: -1, t: lt, mood: 'drained', clothes: 'none',
      lean: lerp(0.3, 0.14, rise), neck: lerp(0.3, 0.24, rise), head: lerp(0.45, 0.42, rise), look: A.head, lookAmt: 0.5 });
    if ((lt > T.fiveLine - 0.2 && lt < T.triesShot + 0.3) || (lt > T.comesLine - 0.3 && lt < T.overShoulder + 0.4)) { asp.look = [560, 330]; asp.lookAmt = 0.8; asp.head = lt > T.angRise ? 0.26 : 0.15; }
    if (lt >= T.overShoulder + 0.4) { const k = seg(lt, T.overShoulder + 0.4, T.overShoulder + 1.4, 'inOutSine'); asp.head = lerp(0.26, 0.48, k); asp.neck = lerp(0.24, 0.3, k); asp.look = A.head; asp.lookAmt = 0.5 * k; }   // no answer: his head goes down
    if (lt >= T.triesShot + 0.3 && lt < T.angRise) { const k = Math.sin(seg(lt, T.triesShot + 0.3, T.dontShot + 0.6) * PI); asp.head = 0.45 + 0.3 * k; asp.lean = 0.3 + 0.08 * k; }
    const dl = A.deena;
    const Dp = put(c, 'deena', Object.assign({ anchor: 'hip', scale: dl.scale, facing: -1, idle: false, breath: 0 }, LIE, { x: dl.x, y: dl.y }), { light: L, color: C.hoodMid, w: 2 });
    K().mid(c, lt, st, 'standoff');
    const AF = put(c, 'angelo', asp, { light: L, color: C.hood, w: 2.6 });
    const glance = RIG.key('scott', lt, [[T.overShoulder, 0], [T.overShoulder + 0.6, 1]]);
    const trem = [5 * Math.sin(lt * 2 * PI * 9), 7 * Math.sin(lt * 2 * PI * 9 + 1.1)];
    const ssp = { x: A.scott.x, y: A.scott.y, scale: A.scott.scale, facing: 1, t: lt, breath: 7, idleAmt: 0.3, lean: 0.06, neck: 0.1, head: 0.12,
      look: glance > 0.5 ? [-900, 420] : [1420, 640], lookAmt: 1, hold: { N: { kind: 'knife', point: [900 + trem[0], 1010 + trem[1]] } } };
    const occ = [RIG.path(AF), RIG.path(Dp)];
    if (!o.noScott) {
      const kd = knifeDown(c, lt, ssp, trem, st);   // edits his spec; lays the knife on the counter (before him) once it is down
      if (kd.path) occ.push(kd.path);
      const SF = put(c, 'scott', ssp, { fill: '#070505', light: { x: 700, y: 380 }, w: 2.4, color: C.hoodMid, props: kd.carry ? false : undefined });
      if (kd.carry) occ.push(kd.carry(SF));
      occ.push(RIG.path(SF));
    }
    occ.forEach(p => K().occlude(c, p));
  }
  // He sets the knife down (107.9-110.8; the hall cut covers 109.0-110.1). The fist comes down to the counter top just right of his
  // body and turns the blade level; the knife goes back with it to the counter at the wall, so it shrinks to the wall's scale on the
  // way (54 px a head there, against his 132) and lands exactly as Q11 has it lying; he keeps his palm on it; then he lifts the hand
  // off and it stays open in front of him, empty (Q11's opening 'talk' arm).
  // Q11's knife (its counterKnife, same numbers): standoff world px, 74 px long, flat on the counter top, handle toward the door.
  const KNIFE = { x: 772, y: 531, len: 74, ang: -0.035 };
  const KNIFE_FC = [800, 529], KNIFE_S = 50;   // the carried knife's fist centre and scale at the landing: its blade = Q11's blade
  const TALK_ARM = { a: 0.42, b: 0.62, hand: 'open', w: -0.7 };   // = Q11's SP.talk armN
  const FLAT_AT = [770, 533];
  function knifeDown(c, lt, sp, trem, st) {
    const out = {};
    if (lt < T.knifeDown) return out;
    if (lt < T.knifeFlat) {   // carried down and back to the counter; the blade levels; his tremor dies as it lands
      const u = E.inOutSine(seg(tw(lt), T.knifeDown, T.knifeFlat)), sk = RIG.skeleton('scott', sp).sk, fc0 = sk.toPx([sk.S0[0] + 1.3, sk.S0[1] + 0.35]);
      const at = L2(fc0, KNIFE_FC, u), pt = L2([900 + trem[0], 1010 + trem[1]], [KNIFE_FC[0] + 600 * Math.cos(KNIFE.ang), KNIFE_FC[1] + 600 * Math.sin(KNIFE.ang)], u);
      const atT = [at[0] + trem[0] * (1 - u), at[1] + trem[1] * (1 - u)];
      sp.hold = { N: { kind: 'knife', at: atT, point: pt } }; sp.lean += 0.03 * u;
      const s = 132 * Math.pow(KNIFE_S / 132, u);   // the scale falls off as 1/distance on the way back to the wall
      out.carry = F => carriedBlade(c, F, atT, pt, s);
      return out;
    }
    out.path = counterKnife(c, lt, st);
    if (lt < T.knifeLift) { sp.hold = { N: { kind: 'flat', at: FLAT_AT, view: 'edge', angle: 0, curl: 0.2 } }; sp.lean += 0.03; }
    else if (lt < T.knifeBack) { const u = seg(tw(lt), T.knifeLift, T.knifeBack); sp.hold = { N: { kind: 'flat', at: [FLAT_AT[0] - 6 * u, FLAT_AT[1] - 18 * u], view: 'edge', angle: 0, curl: 0.2 + 0.2 * u } }; sp.lean += 0.03 * (1 - u); }
    else if (lt < T.knifeDone) {
      const from = RIG.figure('scott', Object.assign({}, sp, { hold: { N: { kind: 'flat', at: [FLAT_AT[0] - 6, FLAT_AT[1] - 18], view: 'edge', angle: 0, curl: 0.4 } } })).joints.wristN;
      const to = RIG.figure('scott', Object.assign({}, sp, { hold: undefined, armN: TALK_ARM })).joints.wristN;
      const u = RIG.key('scott', lt, [[T.knifeBack, 0], [T.knifeDone, 1]]);
      sp.hold = undefined; sp.armN = { to: L2(from, to, u), hand: 'open', w: lerp(0, TALK_ARM.w, clamp(u, 0, 1)) };
    } else { sp.hold = undefined; sp.armN = TALK_ARM; }
    return out;
  }
  // the blade in his fist, drawn as the rig draws it (same shape, fill, rim, spine line and glint) but at scale s: at 132 it is
  // the rig's own blade, so the hand-over at 107.9 is seamless; the handle stays in the fist (it is part of the hand's ink)
  function carriedBlade(c, F, at, pt, s) {
    const g = c.g, h = F.holds && F.holds.N; let bd = [pt[0] - at[0], pt[1] - at[1]]; const l = Math.hypot(bd[0], bd[1]) || 1; bd = [bd[0] / l, bd[1] / l];
    const fc = h && h.tip ? [h.tip[0] - 0.92 * 132 * bd[0], h.tip[1] - 0.92 * 132 * bd[1]] : at;
    const Kw = [s * bd[0], s * bd[1], -s * bd[1], s * bd[0], fc[0], fc[1]], ap = q => [Kw[0] * q[0] + Kw[2] * q[1] + Kw[4], Kw[1] * q[0] + Kw[3] * q[1] + Kw[5]];
    const bs = S().poly([[0.07, -0.035], [0.8, -0.035], [0.92, -0.005], [0.66, 0.06], [0.36, 0.095], [0.1, 0.1], [0.07, 0.1]]).transform(Kw), bp = bs.path(0.25, 7);
    g.fillStyle = O.mix(C.ink, C.ash, 0.5); g.fill(bp);
    O.silhouette(g, bp, { noFill: true, light: { dx: 0.4, dy: -1 }, rimColor: C.lighterCream, rimW: Math.max(1.2, s * 0.018), at: ap([0.45, 0.03]), bbox: bs.bbox() });
    const a = ap([0.12, -0.03]), b = ap([0.82, -0.03]); g.save(); g.strokeStyle = O.rgba(C.lighterCream, 0.5); g.lineWidth = Math.max(1, s * 0.01); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore();
    const tip = ap([0.92, 0]); c.em.save(); c.em.fillStyle = C.lighterCream; c.em.globalAlpha = 0.5; c.em.beginPath(); c.em.arc(tip[0], tip[1], s * 0.08, 0, 7); c.em.fill(); c.em.restore();
    return bp;
  }
  // the knife lying on the counter: Q11's counterKnife, line for line (with the set's back-layer sway, so it stays on the counter)
  function backJit(lt, st) {
    const s = st.sway || 0; if (s < 0.002) return [0, 0]; const tt = tw(lt), step = Math.floor(tt * 6), k = 0.35, sd = 81;
    return [Math.round(k * s * (3.4 * FILM.wob(tt, 0.33, sd) + 1.3 * (O.vnoise(step, 0.5, sd + 5) * 2 - 1))),
      Math.round(k * s * (2.6 * FILM.wob(tt, 0.29, sd + 9) + 1.3 * (O.vnoise(step, 1.5, sd + 5) * 2 - 1)))];
  }
  function counterKnife(c, lt, st) {
    const g = c.g, j = backJit(lt, st), L = KNIFE.len, hl = L * 0.4, TAU = PI * 2;
    g.save(); g.translate(KNIFE.x + j[0], KNIFE.y + j[1]); g.rotate(KNIFE.ang);
    g.fillStyle = 'rgba(5,4,4,0.75)'; g.beginPath(); g.ellipse(L * 0.48, 3.2, L * 0.55, 2.6, 0, 0, TAU); g.fill();            // its shadow on the counter top
    g.fillStyle = '#100C0A'; g.beginPath(); g.moveTo(0, -3.2); g.lineTo(hl, -3.4); g.lineTo(hl, 2.8); g.lineTo(1.5, 2.6); g.quadraticCurveTo(-1.5, 0, 0, -3.2); g.fill();   // the handle
    g.fillStyle = O.mix(C.ink, C.ash, 0.55); g.fillRect(hl - 1, -3.8, 3, 7);                                                   // the bolster
    g.fillStyle = O.mix(C.ink, C.ash, 0.36); g.beginPath(); g.moveTo(hl + 2, -3.3); g.lineTo(L * 0.86, -2.4); g.lineTo(L, 0.2); g.lineTo(hl + 2, 2.9); g.closePath(); g.fill();   // the blade
    g.strokeStyle = O.mix(C.hoodMid, C.lighterCream, 0.35); g.lineWidth = 1.3; g.beginPath(); g.moveTo(hl + 3, -3.3); g.lineTo(L * 0.86, -2.4); g.lineTo(L - 0.5, 0); g.stroke();   // the spine catching the hood
    g.fillStyle = C.hoodMid; g.fillRect(hl * 0.3, -0.9, 1.6, 1.6); g.fillRect(hl * 0.65, -0.9, 1.6, 1.6);                      // two rivets
    g.restore();
    const p = new Path2D(); p.rect(KNIFE.x + j[0] - 2, KNIFE.y + j[1] - 6, L + 4, 12); return p;
  }

  // ============================================================== the shot list
  const V = () => K().cams;
  const sh = (at, name, fn) => ({ at, name, draw: fn });
  const ENTRY_ANG = { x: 1150, y: 522, zoom: 1.25 }, ENTRY_NO = { x: 1180, y: 532, zoom: 1.27 };
  const STOVE_SCOTT = { x: 1590, y: 650, zoom: 1.32 };
  const STOVE_PAIR = { x: 1500, y: 610, zoom: 1.06 };
  const DOOR1 = { x: 820, y: 560, zoom: 1.18 };
  const PW = { x: 960, y: 556, zoom: 1 }, PM = { x: 800, y: 590, zoom: 1.2 }, P_FACE = { x: 1000, y: 700, zoom: 2.0 }, P_ANG = { x: 760, y: 420, zoom: 1.75 }, P_HAND = { x: 1060, y: 780, zoom: 1.9 };
  const CT_FACE = { x: 1250, y: 290, zoom: 1.5 }, CT_KNIFE = { x: 1160, y: 330, zoom: 1.28 };
  const SO_ANG = { x: 1300, y: 680, zoom: 1.6 }, SO_SCOTT = { x: 650, y: 468, zoom: 1.25 };
  const shots = [
    // ---------------- the empty kitchen; they come in
    sh(0, 'entry: empty, they come in', (c, st, lt) => stageEntry(c, lt, lerpCam(V().entry.wide, { x: 990, y: 552, zoom: 1.04 }, seg(lt, 0, T.cup)))),
    sh(T.cup, 'entry: the open cupboard (their eyes)', (c, st, lt) => stageEntry(c, lt, lerpCam({ x: 1070, y: 400, zoom: 1.9 }, { x: 1074, y: 396, zoom: 2.12 }, E.outCubic(seg(st, 0, 1.3))), { pov: true })),
    sh(T.chair, 'entry: the pushed chair (their eyes)', (c, st, lt) => stageEntry(c, lt, lerpCam({ x: 600, y: 850, zoom: 1.65 }, { x: 590, y: 856, zoom: 1.82 }, E.outCubic(seg(st, 0, 1.2))), { pov: true })),
    sh(T.call, 'entry: Christof? nothing', (c, st, lt) => stageEntry(c, lt, lerpCam(V().entry.push, { x: 1000, y: 560, zoom: 1.12 }, seg(st, 0, 3.5)))),
    sh(T.mar1, 'doorway: Marina, the smell', (c, st, lt) => stageDoorway(c, lt, lerpCam(DOOR1, { x: 955, y: 540, zoom: 1.24 }, seg(st, 0, 2.2)))),
    sh(T.look, 'entry: Scott looks at the stove', (c, st, lt) => stageEntry(c, lt, Object.assign({}, V().entry.stove, { zoom: snap(st - 0.35, 1.3, 1.42, 8) }))),
    sh(T.knobs, 'knobs: two gone', (c, st, lt) => stageKnobs(c, lt, lerpCam(V().knobs.twoGone, { x: 960, y: 425, zoom: 1.22 }, seg(st, 0, 1.7)))),
    sh(T.tilt, 'knobs: tilt to the plastic', (c, st, lt) => stageKnobs(c, lt, V().knobs.tilt(lerp(0.35, 1, E.inOutSine(seg(st, 0, 1.3)))))),
    sh(T.grp, 'entry: turn it off', (c, st, lt) => stageEntry(c, lt, lerpCam(V().entry.push, { x: 1080, y: 560, zoom: 1.1 }, seg(st, 0, 2)))),
    sh(T.mar2, 'doorway: behind the stove', (c, st, lt) => stageDoorway(c, lt, DOOR1)),
    sh(T.grip, 'stove: he grips it', (c, st, lt) => stageStove(c, lt, lerpCam(V().stove.hob, { x: 1330, y: 520, zoom: 1.3 }, seg(st, 0, 2.4)))),
    sh(T.rattle, 'knobs: the door rattles', (c, st, lt) => stageKnobs(c, lt, V().knobs.door, { shake: 2.2 * Math.max(0, pullAt(lt) - 0.05) / 0.2, hz: 7 })),
    sh(T.pull2, 'stove: harder; the thud', (c, st, lt) => stageStove(c, lt, { x: 1460, y: 600, zoom: 1.18 })),
    sh(T.ang, 'entry: Angelo, leave it', (c, st, lt) => stageEntry(c, lt, lerpCam(ENTRY_ANG, { x: 1150, y: 526, zoom: 1.29 }, seg(st, 0, 2.9)))),
    sh(T.sc2, 'stove: just one second', (c, st, lt) => stageStove(c, lt, lerpCam({ x: 1010, y: 545, zoom: 1.03 }, { x: 1030, y: 550, zoom: 1.06 }, seg(st, 0, 1)))),
    sh(T.hand, 'knobs: his hand on the handle', (c, st, lt) => stageKnobs(c, lt, lerpCam(V().knobs.handle, { x: 1080, y: 690, zoom: 1.16 }, seg(st, 0, 1)), { hand: true })),
    sh(T.f09, 'stove: F09, Scott don\'t', (c, st, lt) => stageStove(c, lt, lerpCam(V().stove.wide, { x: 960, y: 548, zoom: 1.02 }, seg(st, 0, 2)), { deena: 'f09' })),
    // ---------------- the oven
    sh(T.reveal, 'oven mouth: the snap in (8 frames)', (c, st, lt) => stageOvenMouth(c, lt, { x: 960, y: 524, zoom: snap(st, 1.0, 1.3, 7) })),
    sh(T.mouthEnd, 'oven: the reveal, its echo on the wall', (c, st, lt) => stageOven(c, lt, lerpCam(V().oven.reveal, V().oven.head, E.inOutSine(seg(lt - T.reveal, 0.2, 1.5)) * 0.45))),
    sh(T.recoil, 'stove: his legs give way', (c, st, lt) => stageStove(c, lt, lerpCam(STOVE_SCOTT, { x: 1600, y: 700, zoom: 1.3 }, seg(st, 0, 1.3)))),
    sh(T.head, 'oven: the curls', (c, st, lt) => stageOven(c, lt, Object.assign({}, V().oven.head, { zoom: snap(st, 1.18, 1.3, 7) }))),
    sh(T.screamS, 'stove: the scream', (c, st, lt) => stageStove(c, lt, { x: 1640, y: 700, zoom: snap(st, 1.25, 1.42, 6) })),
    sh(T.mar3, 'doorway: oh God', (c, st, lt) => stageDoorway(c, lt, { x: 950, y: 500, zoom: 1.4 })),
    sh(T.ang2, 'entry: Angelo, no no', (c, st, lt) => stageEntry(c, lt, lerpCam(ENTRY_NO, { x: 1186, y: 536, zoom: 1.31 }, seg(st, 0, 1.1)))),
    sh(T.grab, 'stove: Deena pulls him back', (c, st, lt) => stageStove(c, lt, lerpCam(STOVE_PAIR, { x: 1510, y: 600, zoom: 1.1 }, seg(st, 0, 1.4)), { deena: 'grab' })),
    // ---------------- Deena
    sh(T.fine, 'deena: for an instant, she is fine', (c, st, lt) => stageDeena(c, lt, lt < T.throat ? V().deena.tight : Object.assign({}, V().deena.throat, { zoom: snap(lt - T.throat, 1.0, 1.25, 6), x: lerp(960, 1180, E.outExpo(seg(lt - T.throat, 0, 0.25))), y: lerp(540, 600, E.outExpo(seg(lt - T.throat, 0, 0.25))) }))),
    sh(T.sag, 'deena: yanked upright', (c, st, lt) => stageDeena(c, lt, V().deena.tight)),
    sh(T.deeShot, 'deena: Dee?', (c, st, lt) => stageDeena(c, lt, V().deena.wide)),
    sh(T.catch, 'pieta: she falls; he runs', (c, st, lt) => stagePieta(c, lt, PW)),
    sh(T.caught, 'pieta: caught', (c, st, lt) => stagePieta(c, lt, lerpCam({ x: 830, y: 600, zoom: 1.3 }, PM, seg(st, 0, 0.6, 'outCubic')))),
    sh(T.lookShot, 'pieta: look at me', (c, st, lt) => stagePieta(c, lt, lerpCam(PM, { x: 820, y: 560, zoom: 1.26 }, seg(st, 0, 1.25)))),
    sh(T.hold1, 'pieta: the flutter', (c, st, lt) => stagePieta(c, lt, lerpCam(P_FACE, { x: 995, y: 700, zoom: 2.1 }, seg(st, 0, 1.35)))),
    sh(T.scottSees, 'pieta: over Scott\'s shoulder', (c, st, lt) => stagePieta(c, lt, lerpCam({ x: 1060, y: 600, zoom: 1.06 }, { x: 1040, y: 600, zoom: 1.09 }, seg(st, 0, 1.05)), { scott: true })),
    sh(T.fingers, 'pieta: her fingers', (c, st, lt) => stagePieta(c, lt, P_HAND)),
    sh(T.angCU, 'pieta: Angelo, stay', (c, st, lt) => stagePieta(c, lt, lerpCam(P_ANG, { x: 770, y: 425, zoom: 1.85 }, seg(st, 0, 1.1)))),
    sh(T.quiet, 'pieta: her body goes quiet', (c, st, lt) => stagePieta(c, lt, lerpCam(PW, { x: 960, y: 560, zoom: 1.06 }, seg(st, 0, 2.7)), { shake: 0.8 })),
    // ---------------- the knife
    sh(T.counter, 'counter: he backs in, the knife', (c, st, lt) => stageCounter(c, lt, lerpCam({ x: 1150, y: 440, zoom: 0.98 }, { x: 1180, y: 436, zoom: 1.0 }, seg(st, 0, 1.9)))),
    sh(T.whereShot, 'counter: where is it', (c, st, lt) => stageCounter(c, lt, CT_KNIFE)),
    sh(T.whatShot, 'pieta: Angelo looks up', (c, st, lt) => stagePieta(c, lt, P_ANG)),
    sh(T.wasShot, 'counter: something had her', (c, st, lt) => stageCounter(c, lt, lerpCam(CT_FACE, { x: 1262, y: 292, zoom: 1.62 }, seg(st, 0, 3.5)))),
    sh(T.hairShot - 0.5, 'counter: the knife will not keep still', (c, st, lt) => stageCounter(c, lt, lerpCam(CT_KNIFE, { x: 1120, y: 330, zoom: 1.4 }, seg(st, 0, 1.7)))),
    sh(T.sawShot, 'pieta: I didn\'t see anybody', (c, st, lt) => stagePieta(c, lt, P_ANG)),
    sh(T.knowShot, 'counter: I know', (c, st, lt) => stageCounter(c, lt, CT_FACE)),
    // ---------------- Marina
    sh(T.scan, 'counter: he scans', (c, st, lt) => stageCounter(c, lt, lerpCam({ x: 1000, y: 430, zoom: 1.0 }, { x: 1130, y: 430, zoom: 1.02 }, E.inOutSine(seg(st, 0, 1.4))))),
    sh(T.door1, 'doorway: Marina by the door', (c, st, lt) => stageDoorway(c, lt, DOOR1, { shake: 1.2 })),
    sh(T.waitShot, 'counter: no answer', (c, st, lt) => stageCounter(c, lt, CT_FACE)),
    sh(T.gone, 'doorway: gone', (c, st, lt) => stageDoorway(c, lt, DOOR1, { shake: 1.2 })),
    sh(T.hallShot, 'counter: Marina?', (c, st, lt) => stageCounter(c, lt, lerpCam({ x: 1060, y: 428, zoom: 1.0 }, { x: 1090, y: 428, zoom: 1.0 }, seg(st, 0, 1.3)))),
    sh(T.ringShot, 'doorway: her full stop', (c, st, lt) => stageDoorway(c, lt, lerpCam({ x: ringAt()[0], y: ringAt()[1] + 40, zoom: 1.45 }, { x: ringAt()[0], y: ringAt()[1] + 36, zoom: 1.56 }, seg(st, 0, 1)))),
    sh(T.stepShot, 'doorway: a step; he stops', (c, st, lt) => stageDoorway(c, lt, lerpCam({ x: 1000, y: 600, zoom: 1.0 }, { x: 1010, y: 604, zoom: 1.03 }, seg(st, 0, 2.6)), { scott: true })),
    // ---------------- the handprint
    sh(T.glance + 0.9, 'pieta: behind him, Angelo', (c, st, lt) => stagePieta(c, lt, P_ANG)),
    sh(T.stare, 'pieta: Angelo staring at the floor', (c, st, lt) => stagePieta(c, lt, lerpCam(PM, { x: 820, y: 600, zoom: 1.3 }, seg(st, 0, 1.35)))),
    sh(T.print, 'floor: the handprint', (c, st, lt) => stageFloor(c, lt, Object.assign({}, V().floor.hand, { zoom: snap(st, 1.25, 1.42, 8) }))),
    sh(T.holdingShot, 'pieta: I was holding her', (c, st, lt) => stagePieta(c, lt, P_ANG)),
    sh(T.know2Shot, 'counter: I know', (c, st, lt) => stageCounter(c, lt, CT_FACE)),
    sh(T.rightShot, 'pieta: I was right there', (c, st, lt) => stagePieta(c, lt, PM)),
    sh(T.goShot, 'counter: we need to go', (c, st, lt) => stageCounter(c, lt, lerpCam({ x: 1060, y: 428, zoom: 1.0 }, { x: 1080, y: 426, zoom: 1.02 }, seg(st, 0, 1.6)))),
    sh(T.howShot, 'pieta: then how did it', (c, st, lt) => stagePieta(c, lt, P_ANG)),
    sh(T.print2, 'floor: the print again', (c, st, lt) => stageFloor(c, lt, V().floor.hand)),
    sh(T.backShot, 'counter: out the back', (c, st, lt) => stageCounter(c, lt, CT_KNIFE)),
    // ---------------- the jacket; five
    sh(T.lay - 1.6, 'pieta: Angelo does not move', (c, st, lt) => stagePieta(c, lt, lerpCam(PM, { x: 810, y: 570, zoom: 1.24 }, seg(st, 0, 1.6)))),
    sh(T.lay, 'pieta: he lays her down', (c, st, lt) => stagePieta(c, lt, lerpCam(PW, { x: 960, y: 570, zoom: 1.04 }, seg(st, 0, 1)))),
    sh(T.jacketOff, 'pieta: his jacket off', (c, st, lt) => stagePieta(c, lt, lerpCam({ x: 860, y: 632, zoom: 1.0 }, { x: 852, y: 636, zoom: 1.04 }, seg(st, 0, 0.7)))),
    sh(T.jacketShot, 'floor: the jacket over her throat', (c, st, lt) => stageFloor(c, lt, lerpCam({ x: 950, y: 372, zoom: 1.5 }, { x: 944, y: 372, zoom: 1.58 }, seg(st, 0, 2.1)), { lying: true })),
    sh(T.fiveShot, 'standoff: you kept saying five', (c, st, lt) => stageStandoff(c, lt, lerpCam(SO_ANG, { x: 1310, y: 685, zoom: 1.66 }, seg(st, 0, 2.6)), { noScott: true })),
    sh(T.whatShot2, 'standoff: what?', (c, st, lt) => stageStandoff(c, lt, SO_SCOTT)),
    sh(T.cardsShot, 'standoff: the cards, the picture', (c, st, lt) => stageStandoff(c, lt, lerpCam(SO_ANG, { x: 1320, y: 690, zoom: 1.72 }, seg(st, 0, 2.4)), { noScott: true })),
    sh(T.triesShot, 'standoff: he tries again; can\'t', (c, st, lt) => stageStandoff(c, lt, lerpCam({ x: 1330, y: 700, zoom: 1.7 }, { x: 1335, y: 706, zoom: 1.78 }, seg(st, 0, 1.65)), { noScott: true })),
    sh(T.dontShot, 'standoff: don\'t think about that', (c, st, lt) => stageStandoff(c, lt, lerpCam(SO_SCOTT, { x: 690, y: 474, zoom: 1.3 }, seg(st, 0, 3.6)))),
    sh(T.endShot, 'standoff: comes with us', (c, st, lt) => stageStandoff(c, lt, lerpCam(V().standoff.start, { x: 965, y: 544, zoom: 0.985 }, seg(st, 0, 3)))),
    sh(T.hallEnd, 'doorway: the empty hall', (c, st, lt) => stageDoorway(c, lt, DOOR1)),
    sh(T.last, 'standoff: the hiss', (c, st, lt) => stageStandoff(c, lt, V().standoff.start)),
  ];

  // ============================================================== dialogue
  // L192: 'Scott, don't--' sliced by the edge of the falling oven door: the far half rides down with the door (as style frame 09)
  const DTL = [1093.2, 638.2], BLc = [1154.2, 865.7];
  function sliceDraw(c, s, o) {
    const g = c.g, M = F09M && F09M.frame === c.frame ? F09M.m : null, FD = Object.assign({}, O.FACE.deena);
    if (!M) { O.say(g, 'deena', s.T.text, 560, 820, o); return; }
    const ap = p => [M.a * p[0] + M.c * p[1] + M.e, M.b * p[0] + M.d * p[1] + M.f];
    const c0 = ap(DTL), c1 = ap(BLc), TY = ap([0, 806])[1];
    const cutX = y => c0[0] + (c1[0] - c0[0]) * (y - c0[1]) / (c1[1] - c0[1]);
    const LINE = s.T.text, Lw = O.layout(g, LINE, FD), iN = LINE.indexOf('n');
    const TX = cutX(TY - 18) - (Lw[iN].x + Lw[iN].w * 0.5);
    const lt = c.lt, k = clamp(ovenAt(lt), 0, 1);
    if (lt < T.crack) { O.say(g, 'deena', LINE, TX, TY, o); return; }
    const half = keepLeft => { const p = new Path2D(); const far = 4000, d = [c1[0] - c0[0], c1[1] - c0[1]]; const l = Math.hypot(d[0], d[1]); const u = [d[0] / l, d[1] / l], n = [-u[1], u[0]];
      const sgn = keepLeft ? 1 : -1; const a = [c0[0] - u[0] * far, c0[1] - u[1] * far], b = [c0[0] + u[0] * far, c0[1] + u[1] * far];
      p.moveTo(a[0], a[1]); p.lineTo(b[0], b[1]); p.lineTo(b[0] + n[0] * far * sgn, b[1] + n[1] * far * sgn); p.lineTo(a[0] + n[0] * far * sgn, a[1] + n[1] * far * sgn); p.closePath(); return p; };
    const piv = [cutX(TY - 18), TY - 18], drop = Math.max(k, 0.06), more = Math.max(0, k - 0.6);
    g.save(); g.clip(half(true)); O.say(g, 'deena', LINE, TX, TY, o); g.restore();
    g.save(); g.translate(piv[0] + 5 * drop, piv[1] + 22 * drop + 30 * more); g.rotate(0.12 * drop + 0.1 * more); g.translate(-piv[0], -piv[1]); g.clip(half(false)); O.say(g, 'deena', LINE, TX, TY, o); g.restore();
    // the blade: the door's edge catches the light where it passes through the line
    g.save(); g.globalAlpha = 1 - 0.5 * seg(lt, T.crack, T.crack + 0.5); g.strokeStyle = C.hood; g.lineWidth = 2; g.beginPath(); g.moveTo(cutX(TY - 70), TY - 70); g.lineTo(cutX(TY + 30), TY + 30); g.stroke(); g.restore();
  }
  // a line broken into two rows after its k-th word (the screenplay's text, only broken); each row enters in turn
  function rowsDraw(k, x, y, lh) {
    return (c, s, o) => {
      const words = s.T.text.split(' '), rows = [words.slice(0, k).join(' '), words.slice(k).join(' ')], n = rows[0].length + 1 + rows[1].length;
      let acc = 0; const ps = rows.map(r => { const p = clamp((s.p * n - acc) / r.length, 0, 1); acc += r.length + 1; return p; });
      const active = ps[1] > 0 ? 1 : 0;
      rows.forEach((row, i) => { if (ps[i] <= 0) return; O.say(c.g, s.T.who, row, x, y + i * lh, Object.assign({}, o, { p: ps[i], caret: o.caret && i === active, seed: 1 + i })); });
    };
  }
  // a line set on the bottom matte band (drawn after the mattes)
  const onMatte = (x, y) => (c, s, o) => { c.after.push(cx => { cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); O.say(cx, s.T.who, s.T.text, x, y, Object.assign({}, o, { align: 'center' })); cx.restore(); }); };
  // Marina's 'What's that smell?' (fix pass 3): 46 px in a brighter mint, at full opacity, set right-aligned on the ink left of the
  // doorway with its end beside her head (clear of the lit jamb as the camera drifts, and clear of Angelo's head after the cut)
  const MINT = '#A8F5CB';
  const mintDraw = (x, y) => (c, s, o) => { const F = O.FACE.marina, was = F.color; F.color = MINT; try { O.say(c.g, 'marina', s.T.text, x, y, Object.assign({}, o, { align: 'right', size: 46 })); } finally { F.color = was; } };
  // zones on ink: A top-left (most lines), B the row below it (a second voice while A is still up), C bottom-left
  const ZA = 232, ZB = 350, ZC = 878;
  const lines = [
    { id: 'L183', at: T.callLine, x: 400, y: 260 },
    { id: 'L184', at: T.smellLine, x: 712, y: 188, align: 'right', size: 46, alpha: 1, draw: mintDraw(712, 188) },
    { id: 'L185', at: T.shitLine, x: 1180, y: 330, until: T.grp - 0.52 },
    { id: 'L186', at: T.turnOffLine, x: 400, y: 250, opts: { pointTo: [1480, 470] } },
    { id: 'L187', at: T.goneLine, x: 110, y: 200 },
    { id: 'L188', at: T.behindLine, x: 120, y: 300, draw: rowsDraw(4, 120, 300, 58) },
    { id: 'L189', at: T.tryingLine, x: 120, y: 440 },
    { id: 'L190', at: T.leaveLine, x: 140, y: 160, size: 46, until: T.hand - 0.22 },
    { id: 'L191', at: T.secondLine, x: 300, y: 860, hold: 1.0 },
    { id: 'L192', at: T.dontLine, x: 560, y: 820, until: T.reveal - 0.02, draw: sliceDraw },
    { id: 'L193', at: T.godLine, x: 140, y: 250, opts: { stress: 0.85 } },
    { id: 'L194', at: T.noLine, x: 140, y: 160, opts: { spread: 0.6 }, until: T.grab - 0.22 },
    { id: 'L195', at: T.deeLine, x: 600, y: 440, size: 74, opts: { spread: 1 }, until: T.catch - 0.22 },
    { id: 'L196', at: T.heyLine, x: 110, y: ZA },
    { id: 'L197', at: T.noStayLine, x: 110, y: ZA, size: 46, hold: 1.6, opts: { spread: 0.35 } },
    { id: 'L198', at: T.whereLine, x: 110, y: ZC, size: 72, opts: { stress: 0.9 } },
    { id: 'L199', at: T.whatLine, x: 110, y: ZA },
    { id: 'L200', at: T.wasLine, x: 110, y: ZA, size: 46, opts: { stress: 0.55 }, draw: rowsDraw(5, 110, ZA, 56) },
    { id: 'L201', at: T.sawLine, x: 110, y: ZB + 24 },
    { id: 'L202', at: T.knowLine, x: 110, y: ZA },
    { id: 'L203', at: T.marinaLine, x: 110, y: ZA, size: 46, opts: { stress: 0.6 }, draw: rowsDraw(2, 110, ZA + 70, 58) },
    { id: 'L204', at: T.marina2Line, x: 110, y: ZA, opts: { stress: 0.5 } },
    { id: 'L205', at: T.hereLine, x: 110, y: ZA, opts: { stress: 0.45 } },
    { id: 'L206', at: T.holdingLine, x: 110, y: ZA },
    { id: 'L207', at: T.know2Line, x: 110, y: ZB },
    { id: 'L208', at: T.rightLine, x: 110, y: ZA },
    { id: 'L209', at: T.goLine, x: 110, y: ZB },
    { id: 'L210', at: T.howLine, x: 110, y: ZA },
    { id: 'L211', at: T.backLine, x: 110, y: ZB, hold: 1.8 },
    { id: 'L212', at: T.fiveLine, x: 110, y: 250, opts: { big: ['five'] }, draw: rowsDraw(4, 90, 246, 74) },
    { id: 'L213', at: T.what2Line, x: 110, y: 860 },
    { id: 'L214', at: T.cardsLine, x: 110, y: 250, until: T.dontShot - 0.32 },
    { id: 'L215', at: T.dontLine2, x: 975, y: 690, size: 44, hold: 1.25 },
    { id: 'L216', at: T.comesLine, x: 960, y: 1030, size: 44, draw: onMatte(960, 1028) },   // on the bottom matte band (2.39), clear of every head and the burned names
  ];

  // ============================================================== sound
  // a gas hiss with keyed levels (the shared 'gas' bed only ramps once): p.keys [[t, dB], ...]; p.steps: indices of keys that jump
  SOUND.beds['Q10.gas'] = (ac, B, t0, t1, p) => {
    const { db, gain, filt, src, pan, chain, osc } = SOUND; const g = gain(ac, 0); const ks = p.keys || [[t0, -54], [t1, -24]];
    g.gain.setValueAtTime(0, t0); let prev = 0;
    ks.forEach(([t, d], i) => { const v = d <= -90 ? 0 : db(d); if (p.steps && p.steps.includes(i)) { g.gain.setValueAtTime(prev, t - 0.002); g.gain.linearRampToValueAtTime(v, t); } else g.gain.linearRampToValueAtTime(v, Math.max(t0 + 0.05, t)); prev = v; });
    g.gain.linearRampToValueAtTime(0, t1);
    if (!SOUND.gasRec(ac, g, t0, t1)) [-1, 1].forEach((side, i) => chain(src(ac, 'white', 31 + i, t0, t1), filt(ac, 'highpass', 2800, 0.7), filt(ac, 'peaking', 6500, 1, 6), pan(ac, side * 0.85), g));
    const l = osc(ac, 'sine', 7, t0, t1), lg = gain(ac, db(-30) * 0.08); chain(l, lg); lg.connect(g.gain); g.connect(B.room);
  };
  // a wet, desperate flutter: a fast, gated breath through a narrow, wet band
  SOUND.cues['Q10.flutter'] = (ac, B, t, p) => {
    const { db, gain, filt, src, chain, osc } = SOUND; const d = p.dur || 1.3, g = gain(ac, 0), lv = db(p.level || -22);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lv, t + 0.08); g.gain.setValueAtTime(lv, t + d * 0.6); g.gain.linearRampToValueAtTime(0, t + d);
    const am = osc(ac, 'square', 11, t, t + d), ag = gain(ac, 0.5); chain(am, ag); const v = gain(ac, 0.5); ag.connect(v.gain);
    chain(src(ac, 'pink', 191, t, t + d + 0.05), filt(ac, 'bandpass', 700, 3), v); chain(src(ac, 'white', 192, t, t + d + 0.05), filt(ac, 'bandpass', 1900, 6), gain(ac, 0.35), v);
    chain(v, g, B.fx); g.connect(B.reverb);
  };
  // the knife leaving the block: a dry scrape of steel, then a thin ring
  SOUND.cues['Q10.knife'] = (ac, B, t, p) => {
    const { db, gain, filt, src, chain, osc, perc } = SOUND; const lv = p.level || -22;
    const g = gain(ac, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(db(lv), t + 0.04); g.gain.linearRampToValueAtTime(0, t + 0.32);
    const f = filt(ac, 'bandpass', 2600, 5); f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(6200, t + 0.3); chain(src(ac, 'white', 193, t, t + 0.4), f, g, B.fx);
    [[3170, 1], [4980, 0.5], [7340, 0.25]].forEach(([fr, a]) => { const r = gain(ac, 0); perc(r, t + 0.28, db(lv - 6) * a, 0.002, 0.9); chain(osc(ac, 'sine', fr, t + 0.28, t + 1.3), r, B.fx); });
  };
  // the fridge compressor dying: a falling hum and a relay click
  SOUND.cues['Q10.fridge'] = (ac, B, t, p) => {
    const { db, gain, filt, chain, osc, perc, src } = SOUND; const g = gain(ac, 0); g.gain.setValueAtTime(db(p.level || -40), t); g.gain.linearRampToValueAtTime(0, t + 0.5);
    const o = osc(ac, 'sawtooth', 50, t, t + 0.6); o.frequency.setValueAtTime(50, t); o.frequency.exponentialRampToValueAtTime(28, t + 0.5); chain(o, filt(ac, 'lowpass', 160, 2), g, B.room);
    const c = gain(ac, 0); perc(c, t + 0.02, db(-30), 0.0005, 0.02); chain(src(ac, 'white', 194, t, t + 0.06), filt(ac, 'bandpass', 2400, 4), c, B.room);
  };

  function sound(S) {
    const D = T.dur;
    S.bed('room', 0, D, { level: -44 });
    S.bed('fridge', 0, T.fridgeOff + 0.2, { level: -40, steps: [[T.fridgeOff, -70]] });
    S.cue('Q10.fridge', T.fridgeOff, { level: -40 });
    // the hiss: threads in through the silence; under everything; gone for a second when her throat opens; held low and steady
    // through the aftermath (-34), up a little under the last exchange, and handed to Q11 at -32 (its gas starts there)
    S.bed('Q10.gas', T.hiss, D, { keys: [[T.hiss + 0.2, -62], [12.2, -33], [T.reveal, -31], [T.throat - 0.05, -30], [T.throat, -120], [T.throat + 1.0, -120], [T.throat + 1.4, -34],
      [T.quiet, -35], [T.quiet + 0.3, -40], [T.counter, -36], [T.knife, -34], [T.gone - 1.5, -34], [T.gone + 1.1, -37], [T.print, -35], [T.angRise, -34],
      [T.endShot, -30], [T.overShoulder, -32], [T.last + 0.8, -32], [D - 0.2, -32]], steps: [4] });   // the join lands on Q11's gas start (-32)
    // the Extra's leitmotif under the kitchen (a drone7 bed sounds ~9 dB above its level). It withdraws before each of its holes
    // (the door, the throat, Marina, the handprint), so those land as true silence, and comes back stronger after them.
    S.bed('drone7', 0, T.crack, { level: -51, seventh: -47, fi: 6, fo: 1.6 });
    S.bed('drone7', T.fall, T.throat, { level: -44, seventh: -40, fi: 0.6, fo: 1.6 });
    S.bed('drone7', T.throat + 1.0, T.gone, { level: -45, seventh: -40, fi: 1.2, fo: 1.8 });
    S.bed('drone7', T.gone + 1.1, T.print, { level: -51, seventh: -46, fi: 2.5, fo: 1.2 });
    S.bed('drone7', T.print + 0.5, D, { level: -48, seventh: -43, fi: 3, fo: 1 });
    // dread under the stove; a heartbeat after the thud
    S.bed('dread', T.knobs, T.crack, { level: -36, root: 55, fi: 4, fo: 0.2 });
    S.bed('heart', T.thud + 0.4, T.crack, { bpm: 86, bpmTo: 112, level: -26 });
    S.bed('dread', T.fallEnd, T.quiet + 0.2, { level: -31, root: 51.9, fi: 1, fo: 0.3 });
    S.bed('dread', T.knife + 0.3, T.gone, { level: -34, root: 49, fi: 3, fo: 0.15 });
    S.bed('dread', T.print + 0.6, D, { level: -38, root: 49, fi: 4, fo: 1 });
    // the count on the knobs: two pings, soured
    S.cue('ping', T.ping0, { i: 0, sour: 63, level: -28 }); S.cue('ping', T.ping1, { i: 1, sour: 70, level: -28 });
    // the pull, the thud
    [22.3, 22.95, 23.6].forEach((t, i) => S.cue('thump', t + 0.05, { level: -30 + i * 2, pan: 0.2 }));
    S.cue('stove', T.thud - 0.3, { level: -18 });
    S.duck(T.thud + 0.2, T.ang - 0.1, 0.55);
    // the door: silence, the drop, the bulb
    S.hole(T.crack, T.fall - T.crack);
    S.cue('ovendoor', T.fall, { level: -9 });
    S.cue('buzz', T.fallEnd, { dur: 6, level: -30 });
    S.cue('buzz', T.fallEnd + 5.8, { dur: T.quiet - T.fallEnd - 5.4, level: -38 });
    S.cue('hit', T.fallEnd, { f: 41, decay: 2.6, level: -16 });
    // the small sound; the scream (kept off the limiter)
    S.cue('gasp', T.buckle0 - 0.05, { level: -26 });
    S.cue('scream', T.scream, { dur: 3.6, level: -24 });   // nine saws: ~ -6 dBFS peak, clear of the limiter
    // the grab; for an instant she's fine (near silence)
    S.cue('thump', T.grabbed, { level: -24, pan: 0.3 });
    // for an instant she's fine: nothing at all; the tear lands in that silence, and the silence holds a second more (one hole: two
    // holes back to back would undo each other on the bus automation)
    S.hole(T.fine + 0.05, T.throat + 1.0 - T.fine - 0.05);
    // the throat: the paper tears (on the Extra's bus); everything else drops out for a second
    S.cue('tear', T.throat, { level: -5 });
    S.cue('whoosh', T.yank - 0.12, { dur: 0.16, level: -20 });
    S.cue('hit', T.yank, { f: 62, decay: 0.6, level: -23 });
    // her heart racing, then stopping
    S.bed('heart', T.throat + 1.0, T.quiet, { bpm: 132, bpmTo: 150, level: -19 });
    // the catch: the slip in the blood, the knees on the tiles
    S.cue('slap', T.slip, { level: -22 }); S.cue('thump', T.caught + 0.02, { level: -15, pan: -0.15 });
    S.cue('Q10.flutter', T.flutter, { dur: 1.35, level: -22 });
    S.cue('Q10.flutter', T.fingers + 0.5, { dur: 0.8, level: -28 });
    // the quiet: the matte steps to 2.20; the room falls away to the hiss
    S.cue('tally', T.quiet, { faint: true, level: -34 });
    S.duck(T.quiet, T.counter - 0.3, 0.32);
    // the knife; Scott's heart under the search, cut dead by Marina's silence
    S.cue('Q10.knife', T.knife, { level: -20 });
    S.bed('heart', T.knife + 0.4, T.gone, { bpm: 108, bpmTo: 128, level: -26 });
    // Marina is gone: the matte steps to 2.39 in a hole; after it, only the hiss and the room
    S.cue('tally', T.gone, { faint: true, level: -34 });
    S.hole(T.gone, 1.1);
    S.duck(T.gone + 1.36, T.print - 0.8, 0.6);   // starts after the hole has restored (ducks and holes share the bus automation)
    // the handprint
    S.hole(T.print, 0.5);
    S.cue('tear', T.print + 0.04, { level: -36 });
    S.cue('swell', T.print + 0.5, { dur: 1.6, f: 55, level: -30 });
    // the jacket laid down
    S.cue('swell', T.cover0, { dur: 1.2, f: 82, level: -34 });
  }

  FILM.seq({ id: 'Q10', title: 'The kitchen', dur: T.dur, letterbox: LB, lines, sound, shots });
})();
