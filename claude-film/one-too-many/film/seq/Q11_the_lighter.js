/* ONE TOO MANY — Q11 THE LIGHTER AND THE BLAST.  Lines L217-L236, actions A146-A164.
   Sets: kitchen ('standoff' for the one unbroken take; 'deena' / 'knobs' / 'floor' as inserts before it) and yard ('backdoor' for the
   run, the blast and the roll; then 'house', the Q12/Q01 layout, for the crawl to the tall side fence and the hold).
   Letterbox: 2.39, squeezing continuously to 2.76 through the take and the run; in the yard the 2.76 mattes are drawn as paper by
   SETS.yard.burnMattes and burn away in the blast; 1.78 after. The sequence ends on a hard cut into Q12.
   Local additions (nothing in the shared kit was edited): Scott's typed lines in rows, Angelo's decaying 'dropped' deal (laid out so no
   two word boxes ever touch) and his last lines in his changed voice (custom line draws); the take's push to the two-shot, the fill
   lift on the standoff room and the lighter's warm key on Angelo's face and hand; the Extra's wall perforations re-cut locally (the
   set's own recipe, 'Scott.' moved off Scott's head, every hole at half depth); the kitchen knife lying on the counter where Q10 leaves
   it; Angelo's cigarette tucked behind his ear (the kit's ear sliver reads as an eye slit at MCU scale); the failed spark burst; a
   frame-exact boom (exactly 3 flat paper-white + 4 negative frames whatever the sequence's start time, with the boom cue snapped to the
   same frame); a small 3D cut-paper body for the burning roll (capsules turned about the spine, projected on the lawn's perspective)
   and a ragged sheet of shirt fire that streams against the motion and is smothered in steps; a gait helper that keeps RIG.run's
   planted feet under a re-positioned hip; and eight small synthesised sounds (Q11.*). */
(function () {
  'use strict';
  const O = window.OTM, C = O.C, R = window.RIG, W = O.W, H = O.H;
  const K = () => window.SETS.kitchen, Y = () => window.SETS.yard;
  const { seg, key, lerp, clamp, ones, twos, mixv } = FILM;
  const sstep = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const TAU = Math.PI * 2;

  // ======================================================================== timeline (sequence seconds)
  const T = {
    stove: 3.0, knobs: 4.8, deena: 5.6, floor: 6.3, cig: 7.2, drop: 9.4, cigLand: 10.05, lighter: 10.5, sees: 12.5,
    take: 13.5, step: 25.6, glance: 33.6, raise: 57.4, strike: 65.25, spark: 65.48, takeEnd: 66.1,
    L232: 52.4,   // 'Scott. Please.': the take's push has arrived on the two-shot
    yard: 67.3, slam: 68.95, scrape: 70.08, boom: 70.6, wide: 72.25, roll: 73.0, fence: 78.2, second: 81.7, hold: 84.0, dur: 88.0,   // wide: the mattes have burned away
  };
  const TB = T.boom;
  // the boom snapped to the global 24 fps grid, so the set's blast clock gives exactly 3 white and 4 negative frames
  const tbFor = s => Math.ceil((s + TB) * 24 - 1e-6) / 24 - 0.001 - s;
  const tbf = c => tbFor(c.seq && c.seq.start != null ? c.seq.start : 0);
  const BL = { white: 3 * 2.5 / 72, inv: 3 * 6.5 / 72 };   // seconds after the boom frame (SETS.yard BLAST.white / .inv x dur 3 s)

  function letterbox(lt) {
    if (lt < T.take) return 2.39;
    if (lt < T.yard) return 2.39 + 0.37 * Math.pow(seg(lt, T.take + 0.4, T.takeEnd - 0.4), 1.15);
    return 1.7778;   // the yard draws its own 2.76 paper mattes (SETS.yard.burnMattes) until they burn away
  }

  // ======================================================================== kitchen state and camera
  function kst(lt, o) {
    const u = seg(lt, T.take, T.takeEnd);
    // the set's own standoff perforations are off (perforations: 0): Q11 cuts the Extra's wall marks itself (soPerf, below)
    return Object.assign({ knobs: 2, gas: lerp(0.72, 1, seg(lt, 0, T.takeEnd)), blood: 1, handprint: 1, jacket: 1, cig: lt >= T.cigLand ? 1 : 0, ovenOpen: 1,
      perforations: 0, sway: lt < T.take ? 0.3 : lerp(0.3, 0.85, u), hoodFlicker: lt < T.take ? 0.15 : lerp(0.15, 0.5, u) }, o || {});
  }
  function kcam(c, cam, lt, amp, seed) { const s = FILM.shake(ones(lt), amp, 1.1, seed || 23); c.camera(Object.assign({}, cam, { dx: (cam.dx || 0) + s.dx, dy: (cam.dy || 0) + s.dy })); }
  const LAMP = () => K().light.standoff;   // {x:1607, y:378}
  // a gait fragment (RIG.run / RIG.walk) moved to hip x: the planted feet travel with it
  function gaitAt(g, x) { const dx = x - g.x, o = Object.assign({}, g, { x }); if (g.feet) o.feet = { N: [g.feet.N[0] + dx, g.feet.N[1], g.feet.N[2]], F: [g.feet.F[0] + dx, g.feet.F[1], g.feet.F[2]] }; return o; }

  // ======================================================================== the Extra's marks on the standoff wall (re-cut locally)
  // The kitchen set's own recipe (dots sampled off the glyphs, the same seeds, burned in 24 steps, a blurred scorch under the words,
  // loose pinholes), with two changes: the big 'Scott.' slides right along the upper cabinets so it is never directly behind Scott's
  // head, and every hole (and the scorch) at half depth so the wall does not compete with the lighter; Q10 burns the same pattern at the
  // same place from 96 s, so the cut between them holds. The set is passed perforations: 0.
  const PERF = { level: 0.5, depth: 0.5 };
  const PSO = {
    words: [
      { str: 'Scott.', x: 790, y: 392, fo: { family: 'Oswald', weight: 500, size: 168, tracking: 4 }, o: { seed: 'v1', step: 4, keep: 0.62, rmin: 0.7, rmax: 1.7, dmin: 0.22, dmax: 0.75, scorch: 0.55 } },
      { str: 'Angelo.', x: 62, y: 664, fo: { family: 'Libre Franklin', weight: 500, size: 70 }, o: { seed: 'v2', step: 4, keep: 0.5, rmin: 0.6, rmax: 1.4, dmin: 0.18, dmax: 0.55, scorch: 0.4 } }],
    loose: { n: 90, seed: 'f11loose', y0: 150, y1: 746, skip: (x, y) => Math.hypot((x - 1607) / 1.1, y - 378) < 420 || (x > 300 && x < 552 && y > 252) },
  };
  let _soDots = null, _soRect = null;
  function soDots() {
    if (_soDots) return _soDots; const dots = [];
    PSO.words.forEach(wd => {
      const fo = wd.fo, o = wd.o, mc = O.makeCanvas(8, 8).getContext('2d'); mc.font = O.font(fo); mc.letterSpacing = (fo.tracking || 0) + 'px';
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
    const L = PSO.loose, r = O.rng(L.seed); let k = 0, tries = 0;
    while (k < L.n && tries < L.n * 30) { tries++; const x = r() * W, y = L.y0 + r() * (L.y1 - L.y0); if (L.skip(x, y)) continue; const rad = 0.6 + r() * 1.2; dots.push({ x, y, rx: rad, ry: rad, rot: 0, d: 0.15 + r() * 0.55, b: 0.15 + 0.85 * r(), loose: true }); k++; }
    return (_soDots = dots);
  }
  function soRect() {
    if (_soRect) return _soRect; const m = O.makeCanvas(8, 8).getContext('2d'); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    PSO.words.forEach(wd => { m.font = O.font(wd.fo); m.letterSpacing = (wd.fo.tracking || 0) + 'px'; const w = m.measureText(wd.str).width; x0 = Math.min(x0, wd.x - 20); x1 = Math.max(x1, wd.x + w + 20); y0 = Math.min(y0, wd.y - wd.fo.size * 1.05); y1 = Math.max(y1, wd.y + wd.fo.size * 0.3); });
    return (_soRect = { x: Math.floor(x0) - 8, y: Math.floor(y0) - 8, w: Math.ceil(x1 - x0) + 16, h: Math.ceil(y1 - y0) + 16 });
  }
  const _soMask = { cv: null, g: null, q: -1, res: 2 }, _soLoose = {};
  function soPerf(c, p) {
    if (p <= 0.001) return; const R = soRect(), g = c.g;
    // the scorch: the paper browned round the words (painted, not cut)
    const sc = c.cache('Q11.so.scorch', sg => { sg.translate(-R.x, -R.y); PSO.words.forEach(wd => { sg.save(); sg.filter = 'blur(3px)'; sg.globalAlpha = wd.o.scorch || 0.5; sg.font = O.font(wd.fo); sg.letterSpacing = (wd.fo.tracking || 0) + 'px'; sg.fillStyle = '#2A120A'; sg.fillText(wd.str, wd.x, wd.y); sg.restore(); }); }, R.w, R.h);
    g.save(); g.globalAlpha = clamp(p * 1.4, 0, 1) * PERF.depth; g.drawImage(sc, R.x, R.y, R.w, R.h); g.restore();   // at half depth too (as Q10)
    // the holes, in 24 burn steps, at PERF.depth
    const q = Math.max(1, Math.round(p * 24)), pq = q / 24, D = soDots(), M = _soMask;
    if (!M.cv) { M.cv = O.makeCanvas(Math.ceil(R.w * M.res), Math.ceil(R.h * M.res)); M.g = M.cv.getContext('2d'); }
    if (M.q !== q) {
      const mg = M.g; mg.setTransform(1, 0, 0, 1, 0, 0); mg.clearRect(0, 0, M.cv.width, M.cv.height); mg.setTransform(M.res, 0, 0, M.res, -R.x * M.res, -R.y * M.res);
      const B = [0, 1, 2, 3, 4, 5].map(() => new Path2D());
      for (const d of D) { if (d.loose || d.b > pq) continue; const bi = Math.min(5, Math.floor(d.d * 6)); B[bi].moveTo(d.x + d.rx * Math.cos(d.rot), d.y + d.rx * Math.sin(d.rot)); B[bi].ellipse(d.x, d.y, d.rx, d.ry, d.rot, 0, TAU); }
      mg.fillStyle = '#fff'; B.forEach((pa, i) => { mg.globalAlpha = ((i + 0.5) / 6) * (0.45 + 0.55 * pq) * PERF.depth; mg.fill(pa); }); mg.globalAlpha = 1; M.q = q;
    }
    let LB = _soLoose[q];
    if (!LB) { LB = _soLoose[q] = [0, 1, 2, 3, 4, 5].map(() => new Path2D()); for (const d of D) { if (!d.loose || d.b > pq) continue; const bi = Math.min(5, Math.floor(d.d * 6)); LB[bi].moveTo(d.x + d.rx, d.y); LB[bi].ellipse(d.x, d.y, d.rx, d.ry, 0, 0, TAU); } }
    const h = c.f.markHoles(); h.save(); h.setTransform(g.getTransform()); h.imageSmoothingEnabled = true; h.drawImage(M.cv, R.x, R.y, R.w, R.h);
    h.fillStyle = '#fff'; LB.forEach((pa, i) => { h.globalAlpha = ((i + 0.5) / 6) * (0.45 + 0.55 * pq) * PERF.depth; h.fill(pa); });
    h.restore();
  }

  // ======================================================================== the standoff room: fill, the knife on the counter
  // the fill on the floor and the walls lifted about 15% (a flat screen of a warm near-black: the dark wall and floor come up from
  // ~12 to ~20 of 255, the lit cone barely moves), so both dark bodies read against the room; the figures are drawn after it
  const FILL = 'rgb(9,8,6)';
  function fillLift(c) {
    const g = c.g, L = O.liveArea(c.letterbox);   // only the live slit (the mattes cover the rest)
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'screen';
    g.fillStyle = FILL; g.fillRect(0, L.top - 2, W, L.h + 4); g.restore();
  }
  // the back layer's sway (the set's own jit for the back layer: depth 0.35, seed 81), so the knife stays glued to the counter
  function backJit(lt, st) {
    const s = st.sway || 0; if (s < 0.002) return [0, 0]; const tt = twos(lt), step = Math.floor(tt * 6), k = 0.35, sd = 81;
    return [Math.round(k * s * (3.4 * FILM.wob(tt, 0.33, sd) + 1.3 * (O.vnoise(step, 0.5, sd + 5) * 2 - 1))),
      Math.round(k * s * (2.6 * FILM.wob(tt, 0.29, sd + 9) + 1.3 * (O.vnoise(step, 1.5, sd + 5) * 2 - 1)))];
  }
  // Q10 ends with Scott setting the kitchen knife down on the counter: it lies there, flat, handle toward the door, through Q11.
  // (world 'standoff' px: the counter top is y 529..540 between x 587 and 1489; 54 px per head at the wall)
  const KNIFE = { x: 772, y: 531, len: 74, ang: -0.035 };
  function counterKnife(c, lt, st) {
    const g = c.g, j = backJit(lt, st), L = KNIFE.len, hl = L * 0.4;
    g.save(); g.translate(KNIFE.x + j[0], KNIFE.y + j[1]); g.rotate(KNIFE.ang);
    g.fillStyle = 'rgba(5,4,4,0.75)'; g.beginPath(); g.ellipse(L * 0.48, 3.2, L * 0.55, 2.6, 0, 0, TAU); g.fill();            // its shadow on the counter top
    g.fillStyle = '#100C0A'; g.beginPath(); g.moveTo(0, -3.2); g.lineTo(hl, -3.4); g.lineTo(hl, 2.8); g.lineTo(1.5, 2.6); g.quadraticCurveTo(-1.5, 0, 0, -3.2); g.fill();   // the handle
    g.fillStyle = O.mix(C.ink, C.ash, 0.55); g.fillRect(hl - 1, -3.8, 3, 7);                                                   // the bolster
    g.fillStyle = O.mix(C.ink, C.ash, 0.36); g.beginPath(); g.moveTo(hl + 2, -3.3); g.lineTo(L * 0.86, -2.4); g.lineTo(L, 0.2); g.lineTo(hl + 2, 2.9); g.closePath(); g.fill();   // the blade
    g.strokeStyle = O.mix(C.hoodMid, C.lighterCream, 0.35); g.lineWidth = 1.3; g.beginPath(); g.moveTo(hl + 3, -3.3); g.lineTo(L * 0.86, -2.4); g.lineTo(L - 0.5, 0); g.stroke();   // the spine catching the hood
    g.fillStyle = C.hoodMid; g.fillRect(hl * 0.3, -0.9, 1.6, 1.6); g.fillRect(hl * 0.65, -0.9, 1.6, 1.6);                      // two rivets
    g.restore();
  }
  // the lighter's warm key on Angelo (the take): two flat warm tones on the fist round it, a crescent along the hand and forearm
  // toward it (falling off within a couple of heads), and his brow, nose and cheek catching it (RIG.faceLight). Stronger once raised.
  const KEY = { col: O.mix(C.hood, C.underDoor, 0.55), fist: O.mix(C.ink, C.hood, 0.3) };
  function lighterKey(c, A, lt) {
    const hold = A.holds && A.holds.N; if (!hold || !hold.tip) return;
    const k = seg(lt, T.take, T.take + 1.2) * lerp(0.75, 1, seg(lt, T.raise, T.raise + 1.0)); if (k <= 0) return;
    const g = c.g, sc = A.scale, L = hold.tip, p = R.path(A), fist = [L[0] - 0.02 * sc, L[1] + 0.8 * sc];
    // the fist under the lighter warms one flat tone (the lighter's own body stays ink, its glint the brightest point)
    g.save(); g.clip(p); g.beginPath(); g.rect(L[0] - 2 * sc, L[1] + 0.62 * sc, 4 * sc, 3 * sc); g.clip();
    g.globalAlpha = 0.55 * k; g.fillStyle = KEY.fist; g.fill(O.S().ellipse(fist[0], fist[1] - 0.04 * sc, 0.42 * sc, 0.3 * sc, 0).path(1, 71));
    g.restore();
    // the knuckles and thumb toward it: a warm crescent on the hand
    if (hold.hand) O.silhouette(g, hold.hand, { noFill: true, light: { x: L[0], y: L[1] }, rimColor: KEY.col, rimW: 2.4, rimAlpha: 0.9 * k, at: fist });
    // the face: brow, nose, lips and cheek catch it
    R.faceLight(g, A, L, { color: KEY.col, lit: k });
  }

  // ======================================================================== the standoff: who stands where, doing what
  const SO = { scott: { x: 560, y: 1170, scale: 132 }, angelo: { x: 1472, y: 851.2, scale: 76 } };
  const ANG_HEAD = [1455, 262], SC_HEAD = [615, 250], DEENA_HEAD = [1341, 835], DOOR = [426, 509], LIGHTER = [1352, 430];
  const HANG = { a: 0.0, b: 0.16, hand: 'relaxed' };
  // Scott (foreground left, facing Angelo). Poses keyed in his manner (hover, overshoot, correct).
  const SP = {
    talk: { lean: 0.1, neck: 0.08, head: 0.12, armN: { a: 0.42, b: 0.62, hand: 'open', w: -0.7 }, armF: HANG },
    gas: { lean: 0.13, neck: 0.06, head: 0.08, armN: { a: 0.3, b: 0.5, hand: 'open', w: -0.5 }, armF: HANG },
    sees: { lean: -0.06, neck: -0.1, head: 0.26, armN: { a: 0.42, b: 1.3, hand: 'open', w: -1.05 }, armF: HANG },
    palm: { lean: 0.12, neck: 0.1, head: 0.14, armN: { a: 0.98, b: 0.5, hand: 'open', w: -1.2 }, armF: HANG },
    put: { lean: 0.16, neck: 0.12, head: 0.16, armN: { a: 1.22, b: 0.28, hand: 'open', w: -1.35 }, armF: HANG },
    think: { lean: 0.1, neck: 0.1, head: 0.12, armN: { a: 1.0, b: 0.62, hand: 'open', w: -1.1 }, armF: { a: 0.8, b: 0.82, hand: 'open', w: -1.0 } },
    come: { lean: 0.2, neck: 0.12, head: 0.12, armN: { a: 1.32, b: 0.2, hand: 'open', w: -0.2 }, armF: HANG },
    glance: { lean: 0.2, neck: 0.36, head: 0.62, armN: { a: 0.62, b: 0.45, hand: 'open', w: -0.5 }, armF: HANG },
    away: { lean: 0.05, neck: -0.04, head: -0.06, armN: { a: 0.55, b: 0.5, hand: 'relaxed', w: -0.3 }, armF: HANG },
    dunno: { lean: 0.05, neck: 0.12, head: 0.28, armN: { a: 0.3, b: 0.42, hand: 'relaxed' }, armF: HANG },
    yeah: { lean: 0.06, neck: 0.14, head: 0.36, armN: { a: 0.28, b: 0.42, hand: 'relaxed' }, armF: HANG },
    reach: { lean: 0.22, neck: 0.12, head: 0.1, armN: { a: 1.36, b: 0.16, hand: 'open', w: -1.25 }, armF: HANG },
    // 'Scott. Please.': he cannot move. The reaching hand comes back and curls against his chest; the weight is caught on the front foot.
    frozen: { lean: 0.26, neck: 0.16, head: 0.2, armN: { a: -0.1, b: 2.72, hand: 'fist', w: -0.5 }, armF: { a: 0.08, b: 0.34, hand: 'relaxed' } },
    flinch: { lean: -0.02, neck: -0.12, head: -0.04, armN: { a: 0.62, b: 1.6, hand: 'open', w: -1.0 }, armF: HANG },
  };
  const SKEYS = [
    [0, SP.talk], [0.35, SP.gas], [2.3, SP.gas], [2.9, SP.talk],
    [T.sees, SP.talk], [T.sees + 0.3, SP.sees],
    [T.take + 0.9, SP.sees], [T.take + 1.3, SP.palm],                  // No.
    [17.6, SP.palm], [18.1, SP.put],                                    // Put it down.
    [20.9, SP.put], [21.5, SP.think],                                   // Just-- think
    [T.step + 0.2, SP.think], [T.step + 1.4, SP.come],                  // he edges in; Come with me
    [T.glance, SP.come], [T.glance + 0.5, SP.glance], [T.glance + 1.0, SP.glance], [T.glance + 1.4, SP.away],
    [35.0, SP.away], [35.6, SP.dunno],                                  // I don't know.
    [45.6, SP.dunno], [45.85, SP.yeah], [46.1, SP.dunno],               // Yeah. (a nod)
    [51.2, SP.dunno], [51.7, SP.reach],                                 // Angelo--
    [52.55, SP.reach], [52.8, SP.frozen, 'outCubic'],                   // Scott. Please. -- the hand comes back to his chest
    [58.25, SP.frozen], [58.6, SP.reach],                               // You don't have to--
    [60.12, SP.reach], [60.22, SP.flinch, 'outExpo'], [60.7, SP.flinch], [61.5, SP.frozen],   // Go. (he flinches)
  ];
  // the flinch at 'Go.': head and shoulders recoil about 8 px, on twos
  const recoil = lt => R.key('scott', lt, [[60.12, 0], [60.2, 1, 'outExpo'], [60.75, 1], [61.5, 0.25]]);
  const SLOOK = [[0, ANG_HEAD], [T.sees, ANG_HEAD], [T.sees + 0.25, LIGHTER], [T.take + 1, LIGHTER], [T.take + 2, ANG_HEAD],
    [T.glance + 0.2, ANG_HEAD], [T.glance + 0.6, DEENA_HEAD], [T.glance + 1.0, DEENA_HEAD], [T.glance + 1.4, [140, 900]], [35.4, [140, 900]], [35.9, ANG_HEAD],
    [58.0, ANG_HEAD], [58.4, LIGHTER], [65.3, LIGHTER]];
  const sStep = lt => R.key('scott', lt, [[T.step, 0], [T.step + 1.4, 1], [51.4, 1], [51.9, 1.35]]);
  function scottSpec(lt, o) {
    const pose = R.key('scott', lt, SKEYS), step = sStep(lt), rc = recoil(lt);
    const y = SO.scott.y - 22 * step, x = SO.scott.x + 70 * step - 9 * rc, sc = SO.scott.scale * (1 - 0.06 * step);
    const k = step > 0 && step < 1 ? Math.sin(Math.PI * step) : step > 1 && step < 1.35 ? Math.sin(Math.PI * (step - 1) / 0.35) * 0.6 : 0;
    // after the half step his weight stays caught on the front foot (front leg forward, back leg long)
    const caught = seg(step, 1.2, 1.35);
    const legs = { legN: { a: 0.16 + 0.32 * k + 0.2 * caught, b: 0.06 + 0.4 * k + 0.16 * caught }, legF: { a: -0.14 - 0.12 * caught, b: 0.04 } };
    const spark = seg(lt, T.spark, T.spark + 0.08) * (1 - seg(lt, T.spark + 0.3, T.takeEnd));   // he flinches at the spark
    return Object.assign({ x, y, scale: sc, facing: 1, t: lt, look: R.arc('scott', lt, SLOOK), lookAmt: 1 }, pose, legs,
      { lean: pose.lean - 0.08 * spark - 0.05 * rc, head: pose.head + 0.1 * spark - 0.1 * rc, neck: pose.neck - 0.06 * rc }, o || {});
  }
  // Angelo (at the cone's edge, facing Scott), drained, jacket over Deena, the lighter in his near hand. Short transitions, long holds.
  const AP = {
    rest: { lean: 0.1, neck: 0.12, head: 0.22, armF: { a: -0.02, b: 0.12, hand: 'relaxed' } },
    door: { lean: 0.08, neck: 0.1, head: 0.18, armF: { a: 0.3, b: 0.3, hand: 'relaxed' } },
    down: { lean: 0.1, neck: 0.18, head: 0.36, armF: { a: -0.02, b: 0.12, hand: 'relaxed' } },
    what: { lean: 0.07, neck: 0.08, head: 0.14, armF: { a: 0.32, b: 0.62, hand: 'open', w: -0.6 } },
    deena: { lean: 0.14, neck: 0.24, head: 0.44, armF: { a: -0.02, b: 0.1, hand: 'relaxed' } },
    calm: { lean: 0.09, neck: 0.1, head: 0.16, armF: { a: -0.02, b: 0.12, hand: 'relaxed' } },
    please: { lean: 0.12, neck: 0.18, head: 0.32, armF: { a: -0.02, b: 0.1, hand: 'relaxed' } },
    last: { lean: 0.15, neck: 0.27, head: 0.52, armF: { a: -0.02, b: 0.1, hand: 'relaxed' } },
  };
  const AKEYS = [
    [T.take, AP.rest], [15.7, AP.rest], [16.2, AP.door], [17.6, AP.door], [18.0, AP.rest],   // Back door's there.
    [24.2, AP.rest], [24.6, AP.down], [26.0, AP.down], [26.5, AP.rest],                       // I have.
    [31.6, AP.rest], [32.1, AP.what], [33.4, AP.what], [33.9, AP.rest],                       // And say what?
    [36.7, AP.rest], [37.2, AP.deena], [41.4, AP.deena], [42.0, AP.calm],                     // Neither do I. / the silence / the gate
    [52.0, AP.calm], [52.5, AP.please],                                                        // Scott. Please.
    [61.8, AP.please], [62.6, AP.last],                                                        // looks once more at Deena
  ];
  const ALOOK = [[0, SC_HEAD], [T.take, SC_HEAD], [15.8, SC_HEAD], [16.2, DOOR], [17.5, DOOR], [17.9, SC_HEAD], [24.3, SC_HEAD], [24.7, LIGHTER], [26.0, LIGHTER], [26.4, SC_HEAD],
    [36.8, SC_HEAD], [37.3, DEENA_HEAD], [39.6, DEENA_HEAD], [40.2, LIGHTER], [41.6, LIGHTER], [42.0, SC_HEAD], [47.1, SC_HEAD], [47.5, DOOR], [48.8, DOOR], [49.2, SC_HEAD],
    [51.5, SC_HEAD], [51.9, LIGHTER], [52.3, SC_HEAD], [61.8, SC_HEAD], [62.6, DEENA_HEAD], [66.2, DEENA_HEAD]];
  function lighterAt(lt) {
    const base = R.key('angelo', lt, [[T.take, LIGHTER], [T.raise, LIGHTER], [T.raise + 1.0, [1362, 342]]], { mood: 'drained' });
    // the thumb trembles against the wheel: an 11 Hz tremor (on ones), from the moment he raises it
    const tr = seg(lt, T.raise + 0.6, T.raise + 1.6) * (lt < T.strike ? 1 : 0.4), tt = ones(lt);
    const j = tr * (1.6 * Math.sin(TAU * 11 * tt) + 0.9 * (O.vnoise(tt * 13, 0.3, 77) * 2 - 1));
    return { at: [base[0] + j * 0.6, base[1] + j], trem: tr };
  }
  function angeloSpec(lt, o) {
    const pose = R.key('angelo', lt, AKEYS, { mood: 'drained' });
    const back = R.key('angelo', lt, [[T.step + 0.5, 0], [T.step + 1.8, 1]], { mood: 'drained' });
    const la = lighterAt(lt), tq = ones(lt);
    const strike = lt < T.strike ? 0.1 + 0.07 * la.trem * Math.sin(TAU * 11 * tq + 1.3) : seg(lt, T.strike, T.strike + 0.42);
    const k = back > 0 && back < 1 ? Math.sin(Math.PI * back) : 0;
    return Object.assign({ x: SO.angelo.x + 52 * back, y: SO.angelo.y, scale: SO.angelo.scale, facing: -1, clothes: 'none', cig: false, mood: 'drained', t: lt,
      look: R.arc('angelo', lt, ALOOK, { mood: 'drained' }), lookAmt: 1,
      legN: { a: 0.04 - 0.28 * k, b: 0.03 + 0.3 * k }, legF: { a: -0.14, b: 0.05 },
      hold: { N: { kind: 'lighter', at: la.at, strike, spark: lt >= T.spark - 0.02 && lt < T.spark + 0.1 ? true : (lt >= T.strike ? false : undefined) } } }, pose, o || {});
  }

  // a cheap directional rim for the big foreground Scott (one clip, two fills): the figure in the rim colour, then its ink copy nudged
  // away from the light inside its own outline, leaving a crisp crescent on the lit side only
  function rimFig(g, F, light, color, w, fill, alpha, clip) {
    const p = R.path(F), c = F.joints.chest; let dx = light.x - c[0], dy = light.y - c[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    g.save(); if (clip) g.clip(clip);
    g.fillStyle = fill; g.fill(p); g.clip(p); g.globalAlpha = alpha == null ? 1 : alpha; g.fillStyle = color; g.fill(p); g.globalAlpha = 1;
    g.translate(-dx * w, -dy * w); g.fillStyle = fill; g.fill(p); g.restore();
    return p;
  }
  // Deena on the standoff tiles, ink + her hood-side rim: static, so it is cut once into a world-space layer
  function standoffDeena(c) {
    const k = K(), L = LAMP();
    const lay = c.cache('Q11.so.deena', g => { const dp = k.deenaLying('standoff').path(0.8, 23); g.fillStyle = C.ink; g.fill(dp); O.silhouette(g, dp, { noFill: true, light: { x: L.x, y: L.y }, rimColor: C.hoodLow, rimW: 2 }); }, W, H);
    c.g.drawImage(lay, 0, 0);
    return standoffDeena.p || (standoffDeena.p = k.deenaLying('standoff').path(0.8, 23));
  }
  // Angelo in the standoff, cut once per pose (he moves on twos) into a world-space sprite and stamped under the shaking camera;
  // his glint and spark go to the bloom buffer by replaying the recorded emissive calls
  const ASPR = { F: null, key: '', cv: null, ops: [], x0: 0, y0: 0, w: 0, h: 0 };
  function drawAngelo(c, A, o) {
    const key = o.color + '|' + o.w;
    if (ASPR.F !== A || ASPR.key !== key) {
      const bb = R.bbox(A), pad = 70, x0 = Math.floor(bb.x - pad), y0 = Math.floor(bb.y - pad), w = Math.ceil(bb.w + 2 * pad), h = Math.ceil(bb.h + 2 * pad);
      if (!ASPR.cv || ASPR.cv.width < w || ASPR.cv.height < h) ASPR.cv = O.makeCanvas(Math.max(w, ASPR.cv ? ASPR.cv.width : 0), Math.max(h, ASPR.cv ? ASPR.cv.height : 0));
      const sg = ASPR.cv.getContext('2d'); sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalAlpha = 1; sg.globalCompositeOperation = 'source-over'; sg.clearRect(0, 0, ASPR.cv.width, ASPR.cv.height); sg.setTransform(1, 0, 0, 1, -x0, -y0);
      const ops = [], rec = new Proxy({}, { get(_, k) { return (...a) => { ops.push([k, a]); }; }, set(_, k, v) { ops.push(['=', k, v]); return true; } });
      R.draw(sg, A, Object.assign({}, o, { em: rec, cache: false }));
      Object.assign(ASPR, { F: A, key, ops, x0, y0, w, h });
    }
    c.g.drawImage(ASPR.cv, 0, 0, ASPR.w, ASPR.h, ASPR.x0, ASPR.y0, ASPR.w, ASPR.h);
    for (const op of ASPR.ops) { if (op[0] === '=') c.em[op[1]] = op[2]; else c.em[op[0]](...op[1]); }
  }
  // draw the standoff world + the three of them. o: {scott:false, angelo:false, st, shake, scottSpec, scottClip, scottWhen}
  function standoff(c, lt, cam, o) {
    o = o || {}; const k = K(), st = kst(lt, o.st), L = LAMP(), out = {};
    kcam(c, cam, lt, o.shake == null ? 1.6 : o.shake, 31);
    k.back(c, lt, st, 'standoff');
    soPerf(c, PERF.level);
    counterKnife(c, lt, st);
    fillLift(c);
    const dp = standoffDeena(c);
    k.mid(c, lt, st, 'standoff');
    const occ = [dp];
    if (o.angelo !== false) {
      const A = out.angelo = R.figure('angelo', angeloSpec(lt, o.an)); const lv = k.hoodLevel(lt, st);
      drawAngelo(c, A, { light: { x: L.x, y: L.y }, color: lv > 0.7 ? C.hood : C.hoodMid, w: 3 });
      lighterKey(c, A, lt);
      occ.push(R.path(A));
    }
    if (o.scott !== false && (!o.scottWhen || o.scottWhen(lt))) {
      const S = out.scott = R.figure('scott', o.scottSpec ? o.scottSpec(lt) : scottSpec(lt, o.sc));
      occ.push(rimFig(c.g, S, L, C.hoodMid, 2.4, '#070505', 0.9, o.scottClip));
    }
    occ.forEach(p => k.occlude(c, p));
    k.front(c, lt, st, 'standoff');
    return out;
  }
  // the spark that fails to catch: a burst off the wheel, a breath of light on the wall and his face, gone in a third of a second
  function sparkBurst(c, A, lt) {
    const u = lt - T.spark; if (u < -0.02 || u > 0.36 || !A || !A.holds || !A.holds.N || !A.holds.N.spark) return;
    const p = A.holds.N.spark, g = c.g, r = O.rng('q11spark'), uu = Math.max(0, u);
    const flash = Math.max(0, 1 - uu / 0.12);
    if (flash > 0) { g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.08 * flash; g.fillStyle = C.lighterCream; g.beginPath(); g.ellipse(p[0], p[1] - 6, 70, 58, 0, 0, TAU); g.fill(); g.restore(); }
    g.save(); g.lineCap = 'round';
    for (let i = 0; i < 18; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.8, v = 160 + r() * 300, life = 0.14 + r() * 0.22; if (uu > life) continue;
      const d0 = 4 + v * uu, d1 = v * Math.max(0, uu - 0.06), gy = 300 * uu * uu, x0 = p[0] + Math.cos(a) * d0, y0 = p[1] + Math.sin(a) * d0 + gy, x1 = p[0] + Math.cos(a) * d1, y1 = p[1] + Math.sin(a) * d1 + gy * 0.7;
      g.globalAlpha = Math.min(1, 1.6 * (1 - uu / life)); g.strokeStyle = i % 3 ? C.fireCore : C.lighterCream; g.lineWidth = 2 + r() * 1.6; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x0 + 0.5, y0 + 0.5); g.stroke();
    }
    g.restore();
    if (flash > 0) { c.em.save(); c.em.globalAlpha = flash; c.em.fillStyle = C.fireCore; c.em.beginPath(); c.em.arc(p[0], p[1], 34, 0, TAU); c.em.fill(); c.em.restore(); }
  }

  // ======================================================================== Angelo close ('deena' view: the hood cone behind him)
  const AMCU = { x: 1060, y: 1215, scale: 205 };
  // the forgotten cigarette, tucked behind his ear: angled about 20 degrees, its back end lost under the hair, an ivory tip
  function earCig(g, F) {
    const m = F.headM, s = F.scale, f = F.facing || 1; if (!m) return;
    const ap = p => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
    const E = ap([-0.25, 0.06]);                                   // on the ear, behind the cheek
    const ax = [m[0], m[1]], al = Math.hypot(ax[0], ax[1]) || 1, fw = [ax[0] / al, ax[1] / al];   // the head's forward axis on screen
    const tilt = Math.atan2(fw[1], Math.abs(fw[0])), ang = 0.35 + 0.35 * tilt;   // ~20 deg front-down, following the head a little
    const d = [f * Math.cos(ang), Math.sin(ang)], n = [-d[1], d[0]];
    const back = [E[0] - d[0] * 0.06 * s, E[1] - d[1] * 0.06 * s], tip = [E[0] + d[0] * 0.2 * s, E[1] + d[1] * 0.2 * s];
    const w = Math.max(3, 0.028 * s), lit = n[1] < 0 ? 1 : -1;     // the lit edge faces up, toward the hood lamp
    g.save(); g.lineCap = 'butt';
    g.strokeStyle = O.mix(C.ink, C.cardPaper, 0.5); g.lineWidth = w; g.beginPath(); g.moveTo(back[0], back[1]); g.lineTo(tip[0], tip[1]); g.stroke();
    g.strokeStyle = C.cardPaper; g.lineWidth = Math.max(1.2, w * 0.3); g.beginPath();
    g.moveTo(back[0] + n[0] * lit * w * 0.36 + d[0] * 0.04 * s, back[1] + n[1] * lit * w * 0.36 + d[1] * 0.04 * s); g.lineTo(tip[0] + n[0] * lit * w * 0.36, tip[1] + n[1] * lit * w * 0.36); g.stroke();
    // the ivory tip: the paper end catching the lamp
    g.fillStyle = C.lighterCream; g.beginPath(); g.ellipse(tip[0], tip[1], w * 0.32, w * 0.55, Math.atan2(d[1], d[0]), 0, TAU); g.fill();
    // a lock of hair over its back end: it is tucked in, not floating
    const hb = [back[0] - d[0] * 0.05 * s, back[1] - d[1] * 0.05 * s];
    g.fillStyle = C.ink; g.beginPath();
    g.moveTo(hb[0] - n[0] * 0.09 * s, hb[1] - n[1] * 0.09 * s); g.quadraticCurveTo(back[0] + d[0] * 0.07 * s - n[0] * 0.02 * s, back[1] + d[1] * 0.07 * s - n[1] * 0.02 * s, back[0] + d[0] * 0.05 * s + n[0] * 0.07 * s, back[1] + d[1] * 0.05 * s + n[1] * 0.07 * s);
    g.lineTo(hb[0] + n[0] * 0.06 * s, hb[1] + n[1] * 0.06 * s); g.closePath(); g.fill();
    g.restore();
  }
  function angeloClose(c, lt, spec, o) {
    o = o || {}; const k = K(), st = kst(lt, { hoodFlicker: 0.25 });
    kcam(c, o.cam || { x: 960, y: 540, zoom: 1 }, lt, 2.2, 41);
    k.back(c, lt, st, 'deena');
    const F = R.figure('angelo', Object.assign({ x: AMCU.x, y: AMCU.y, anchor: 'hip', scale: AMCU.scale, facing: -1, clothes: 'none', mood: 'drained', t: lt }, spec, { cig: false }));
    const Ld = k.light.deena;
    R.draw(c.g, F, { light: { x: Ld.x, y: Ld.y }, color: C.hood, w: 4.5, em: c.em, fill: '#0B0807', cache: false });
    if (o.earCig) earCig(c.g, F);
    return F;
  }

  // ======================================================================== the floor (Deena under the jacket)
  function floorShot(c, lt, cam, o) {
    o = o || {}; const k = K(), st = kst(lt, o.st);
    kcam(c, cam, lt, 1.8, 51);
    k.back(c, lt, st, 'floor');
    const dp = k.deenaLying('floor').path(0.8, 23); c.g.fillStyle = C.ink; c.g.fill(dp);
    O.silhouette(c.g, dp, { noFill: true, light: { x: 1700, y: 250 }, rimColor: C.hoodLow, rimW: 1.6 });
    k.mid(c, lt, st, 'floor');
    k.occlude(c, dp);
    if (o.after) o.after(c);
  }

  // ======================================================================== fire: one ragged sheet, three flat tones
  // base: points along the burning patch (world px, in order); o: {s px/head, lvl 0..1, trail [x,y] (unit-ish, against the motion), lt, seed}
  function sheetFire(c, base, o) {
    if (!(o.lvl > 0.02) || base.length < 2) return;
    const g = c.g, n = base.length, tq = ones(o.lt), tr = o.trail || [0, 0];
    [[1, C.fireOuter, 0], [0.6, C.fireMid, 0.16], [0.3, C.fireCore, 0.32]].forEach(([hk, col, inset], ti) => {
      const i0 = inset * (n - 1), i1 = (n - 1) * (1 - inset), m = Math.max(4, Math.round((n - 1) * 2.4 * (1 - 2 * inset)) + 2);
      const pts = [], tips = [];
      for (let j = 0; j <= m; j++) {
        const fi = i0 + (i1 - i0) * j / m, kk = Math.min(n - 2, Math.floor(fi)), u = fi - kk;
        const b = [lerp(base[kk][0], base[kk + 1][0], u), lerp(base[kk][1], base[kk + 1][1], u)]; pts.push(b);
        const env = Math.pow(Math.sin(Math.PI * j / m), 0.6), nz = O.vnoise(j * 0.83 + ti * 3.1, tq * 5.5, (o.seed | 0) + ti);
        const tongue = (j + ti) % 2 ? 1 : 0.5, h = o.lvl * o.s * 2.5 * hk * env * (0.5 + 0.7 * nz) * tongue;
        const sway = (O.vnoise(j * 0.41, tq * 2.6, (o.seed | 0) + 50) - 0.5) * 0.8;
        const dx = tr[0] + sway, dy = -1 + tr[1], l = Math.hypot(dx, dy) || 1;
        tips.push([b[0] + dx / l * h, b[1] + dy / l * h]);
      }
      const poly = pts.concat(tips.reverse()), p = O.S().poly(poly).path(1.4, (o.seed | 0) + ti * 7 + (Math.floor(tq * 12) % 3));
      g.fillStyle = col; g.fill(p);
      c.em.save(); c.em.globalAlpha = ti ? 0.9 : 0.55; c.em.fillStyle = ti === 2 ? C.fireCore : C.fireMid; c.em.fill(p); c.em.restore();
    });
  }
  // smoke curling off him after the fire dies (ash, thinning)
  function smokeWisps(c, p, sc, k, lt, seed, drift) {
    if (k <= 0.02) return; const g = c.g; const r = O.rng('wisp' + seed);
    g.save();
    for (let i = 0; i < 7; i++) {
      const ph = ((lt * 0.5 + r()) % 1), x = p[0] + (r() - 0.5) * sc * 1.2 + Math.sin(lt * 1.7 + i) * sc * 0.3 * ph + (drift || 0) * ph * sc, y = p[1] - ph * sc * 2.8, rr = sc * (0.14 + 0.32 * ph);
      g.globalAlpha = k * 0.26 * (1 - ph); g.fillStyle = C.ash; g.beginPath(); g.ellipse(x, y, rr, rr * 0.7, 0.3, 0, TAU); g.fill();
    }
    g.restore();
  }

  // ======================================================================== the roll: a small 3D cut-paper body
  // Scott's body as capsules in its own frame (u along the spine to the head, v his left, w his front; units = heads), turned about
  // the spine (th), pitched (head up) and yawed on the lawn, then projected with the yard's perspective (camera 6.9 heads up, horizon
  // y 614, 1000 px focal: the same lawn scale as SETS.yard figAt). Overlapping capsules merge into one hand-cut ink silhouette, so the
  // shoulder and the knee come over, the arms sweep and the torso foreshortens as he turns.
  const RB = { hipW: 0.36, shW: 0.64, spine: 2.45, thigh: 1.9, shin: 1.8, foot: 0.78, upper: 1.36, fore: 1.18, hand: 0.5 };
  const RP = { f: 1000, ch: 6.9, hz: 614, vx: 960 };
  const v3 = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  function rbJoints(P) {
    const J = { pel: [0, 0, 0], hipL: [0, RB.hipW, 0], hipR: [0, -RB.hipW, 0], shL: [RB.spine, RB.shW, 0], shR: [RB.spine, -RB.shW, 0], neck: [RB.spine + 0.12, 0, 0.03] };
    const nod = P.nod || 0; J.head = [RB.spine + 0.82 * Math.cos(nod), 0, 0.1 + 0.82 * Math.sin(nod)];
    ['L', 'R'].forEach((sd, i) => {
      const sg = i ? -1 : 1, lg = P.legs[i], am = P.arms[i], lab = (lg.ab || 0) + sg * (P.sideDrop || 0);   // on his side the legs settle onto the grass
      const dir = (ang, ab) => [-Math.cos(ang) * Math.cos(ab), sg * Math.sin(ab), Math.sin(ang) * Math.cos(ab)];
      const hp = J['hip' + sd], sa = lg.a - lg.k, kn = v3(hp, dir(lg.a, lab), RB.thigh), an = v3(kn, dir(sa, lab * 0.5), RB.shin);
      J['knee' + sd] = kn; J['ank' + sd] = an; J['toe' + sd] = v3(an, [Math.sin(sa), 0, Math.cos(sa)], RB.foot);
      const sh = J['sh' + sd], el = v3(sh, dir(am.f, am.ab || 0), RB.upper), wr = v3(el, dir(am.f + am.e, (am.ab || 0) * 0.6), RB.fore);
      J['el' + sd] = el; J['wr' + sd] = wr; J['hand' + sd] = v3(wr, dir(am.f + am.e + (am.h || 0), (am.ab || 0) * 0.6), RB.hand);
    });
    return J;
  }
  // body frame -> world (X right, Y up, D away from the camera), heads
  function rbWorld(p, B) {
    const cp = Math.cos(B.pitch || 0), sp = Math.sin(B.pitch || 0), u = p[0] * cp + p[2] * sp, w = -p[0] * sp + p[2] * cp, v = p[1];
    const ct = Math.cos(B.th), st = Math.sin(B.th), cy = Math.cos(B.yaw || 0), sy = Math.sin(B.yaw || 0);
    const U = [-cy, 0, -sy], Lh = [-sy, 0, cy], V = [ct * Lh[0], -st, ct * Lh[2]], Wv = [st * Lh[0], ct, st * Lh[2]];
    return [B.X + u * U[0] + v * V[0] + w * Wv[0], (B.Y || 0) + v * V[1] + w * Wv[1], B.D + u * U[2] + v * V[2] + w * Wv[2]];
  }
  const rbProj = q => [RP.vx + RP.f * q[0] / q[2], RP.hz + RP.f * (RP.ch - q[1]) / q[2], RP.f / q[2]];
  const RB_SEGS = [   // [a, b, ra, rb] (radii in heads)
    ['shL', 'shR', 0.3, 0.3], ['shL', 'hipL', 0.33, 0.32], ['shR', 'hipR', 0.33, 0.32], ['hipL', 'hipR', 0.36, 0.36],
    ['hipL', 'kneeL', 0.33, 0.21], ['kneeL', 'ankL', 0.21, 0.12], ['ankL', 'toeL', 0.14, 0.1], ['hipR', 'kneeR', 0.33, 0.21], ['kneeR', 'ankR', 0.21, 0.12], ['ankR', 'toeR', 0.14, 0.1],
    ['shL', 'elL', 0.25, 0.18], ['elL', 'wrL', 0.19, 0.13], ['wrL', 'handL', 0.15, 0.13], ['shR', 'elR', 0.25, 0.18], ['elR', 'wrR', 0.19, 0.13], ['wrR', 'handR', 0.15, 0.13],
    ['neck', 'head', 0.19, 0.19]];
  // -> {shape, pts (projected joints), B (with the support height), world fn}
  function rbBody(P, B) {
    const J = rbJoints(P), chest = 0.46 + (P.breath || 0);
    J.chestA = [1.55, 0, 0.12]; J.chestB = [2.25, 0, 0.1]; J.bellyA = [0.35, 0, 0.04]; J.bellyB = [1.35, 0, 0.07];
    const segs = RB_SEGS.concat([['chestA', 'chestB', chest, chest * 0.95], ['bellyA', 'bellyB', 0.38, 0.4]]);
    // support: the lowest surface point rests on the lawn
    const B0 = Object.assign({}, B, { Y: 0 }); let ymin = Infinity;
    segs.forEach(([a, b, ra, rb]) => { ymin = Math.min(ymin, rbWorld(J[a], B0)[1] - ra, rbWorld(J[b], B0)[1] - rb); });
    const Bs = Object.assign({}, B, { Y: -ymin + (B.lift || 0) });
    const PJ = {}; for (const k in J) PJ[k] = rbProj(rbWorld(J[k], Bs));
    const S = O.S();
    segs.forEach(([a, b, ra, rb]) => { const A = PJ[a], Bq = PJ[b]; S.capsule(A[0], A[1], ra * A[2], Bq[0], Bq[1], rb * Bq[2]); });
    // the head: an egg along the spine, its depth or its width showing as it turns; a nose and a brow when the face is in profile
    const hd = J.head, cU = rbProj(rbWorld([hd[0] + 0.5, 0, hd[2]], Bs)), cD = rbProj(rbWorld([hd[0] - 0.46, 0, hd[2]], Bs)), Hc = PJ.head;
    const ct = Math.cos(B.th), stt = Math.sin(B.th), ry = Math.hypot(0.47 * ct, 0.4 * stt) * Hc[2];
    S.ellipse((cU[0] + cD[0]) / 2, (cU[1] + cD[1]) / 2, Math.hypot(cU[0] - cD[0], cU[1] - cD[1]) / 2, ry, Math.atan2(cU[1] - cD[1], cU[0] - cD[0]));
    const fp = (du, dw) => { const q = rbProj(rbWorld([hd[0] + du, 0, hd[2] + dw], Bs)); return [q[0], q[1]]; };
    S.poly([fp(0.1, 0.36), fp(-0.12, 0.56), fp(-0.24, 0.36)]);          // the nose
    S.poly([fp(0.38, -0.22), fp(0.66, -0.1), fp(0.5, 0.04), fp(0.6, 0.12), fp(0.36, 0.14)]);   // the cowlick at the crown
    return { shape: S, P: PJ, B: Bs, J, at: (p) => rbProj(rbWorld(p, Bs)) };
  }
  // the burning patch: the middle of his back
  const BACK_U = [0.2, 0.55, 0.9, 1.25, 1.6, 1.95, 2.3];
  function rbBack(body) { return BACK_U.map(u => { const q = body.at([u, 0, -0.5]); return [q[0], q[1]]; }); }

  // ---------------------------------------------------------------- the roll's choreography (sequence seconds, on twos)
  const RL = {
    t0: T.roll, thrash: T.roll + 0.26, r1: T.roll + 1.42, up: T.roll + 1.7, scr: T.roll + 2.85, drop: T.roll + 3.1, r2: T.roll + 4.0, end: T.fence,
    th0: 2.55, th1: -Math.PI, th2: -TAU - 0.1, X0: 1.93, D0: 24.13, R: 0.52, yaw: 0.26, crawl: 2.1,
  };
  const P_LIE = { legs: [{ a: 0.1, k: 0.18, ab: 0.07 }, { a: 0.5, k: 1.0, ab: 0.02 }], arms: [{ f: -0.16, ab: 0.55, e: 0.12 }, { f: -0.1, ab: 0.32, e: 0.5 }], nod: 0.05, pitch: 0, breath: 0 };
  const P_TUCK = { legs: [{ a: 0.08, k: 0.12, ab: 0.02 }, { a: 0.08, k: 0.12, ab: 0.02 }], arms: [{ f: 1.25, ab: -0.25, e: 2.1 }, { f: 1.35, ab: -0.3, e: 2.0 }], nod: 0.3, pitch: 0 };
  const P_FLAT = { legs: [{ a: 0.05, k: 0.1, ab: 0.05 }, { a: 0.3, k: 0.6, ab: 0.05 }], arms: [{ f: 2.8, ab: 0.3, e: 0.2 }, { f: 0.35, ab: 0.3, e: 0.25 }], nod: -0.15, pitch: 0 };
  function pCrawl(c) {   // c: gait phase (cycles)
    // pitched (shoulders above the hips): thighs and arms are set back by the pitch so they stand plumb, shins lie along the grass
    const s1 = Math.sin(TAU * c), s2 = Math.sin(TAU * c + Math.PI), ph = 0.3, V = Math.PI / 2 - ph;
    return { legs: [{ a: V - 0.28 * s2, k: Math.PI / 2 - 0.28 * s2 + 0.3 * Math.max(0, s2), ab: 0.06 }, { a: V - 0.28 * s1, k: Math.PI / 2 - 0.28 * s1 + 0.3 * Math.max(0, s1), ab: 0.06 }],
      arms: [{ f: V + 0.36 * s1, ab: 0.1, e: 0.1 + 0.4 * Math.max(0, -s1) }, { f: V + 0.36 * s2, ab: 0.1, e: 0.1 + 0.4 * Math.max(0, -s2) }], nod: 0.4, pitch: ph };
  }
  // the half-turn pose: the top knee comes over, the top arm sweeps from overhead across and back; the under side stays tucked
  function pRoll(th) {
    const w = ((-th / Math.PI) % 1 + 1) % 1, b = Math.sin(Math.PI * w), top = Math.sin(th) < 0 ? 0 : 1, P = mixv(P_TUCK, P_TUCK, 0);
    P.legs = P.legs.map((l, i) => i === top ? { a: 0.12 + 0.95 * b, k: 0.12 + 1.15 * b, ab: -0.3 * b } : l);
    P.arms = P.arms.map((a, i) => i === top ? { f: 2.7 - 3.3 * w, ab: 0.55, e: 0.25 + 0.4 * b } : a);
    return P;
  }
  function rollState(lt) {
    const t = twos(lt), Lr = RL;
    let th, P, X = Lr.X0, D = Lr.D0, lift = 0;
    const along = d => { X += -Math.cos(Lr.yaw) * d; D += -Math.sin(Lr.yaw) * d; };
    const rollTo = (a, b) => { X += -Math.sin(Lr.yaw) * Lr.R * (b - a); D += Math.cos(Lr.yaw) * Lr.R * (b - a); };
    if (t < Lr.thrash) {   // on his side, his back on fire, beating at it
      const f = TAU * 3.1 * (t - Lr.t0);
      th = Lr.th0 + 0.16 * Math.sin(f * 0.7);
      P = { legs: [{ a: 0.6 + 0.35 * Math.sin(f * 0.8), k: 1.1 + 0.3 * Math.sin(f), ab: 0.05 }, { a: 0.35 + 0.25 * Math.sin(f * 0.8 + 2), k: 0.7, ab: 0.05 }],
        arms: [{ f: 1.2, ab: -0.2, e: 1.9 }, { f: -1.15 + 0.45 * Math.sin(f), ab: 0.5, e: 0.6 + 0.5 * Math.sin(f + 1) }], nod: 0.25, pitch: 0 };   // the top arm beats back at the fire
    } else if (t < Lr.r1) {   // ROLL 1: over the burning back, onto his front
      const u = FILM.ease.inOutSine(seg(t, Lr.thrash, Lr.r1)); th = lerp(Lr.th0, Lr.th1, u); rollTo(Lr.th0, th);
      P = mixv(pRoll(th), P_TUCK, seg(t, Lr.r1 - 0.12, Lr.r1) * 0.5);
    } else {
      rollTo(Lr.th0, Lr.th1);
      if (t < Lr.up) {   // face down, he pushes up onto hands and knees
        th = Lr.th1; P = mixv(P_FLAT, pCrawl(0), sstep(seg(t, Lr.r1, Lr.up)));
      } else if (t < Lr.scr) {   // the scramble: away from the house on all fours, head down
        th = Lr.th1; const u = seg(t, Lr.up, Lr.scr); along(Lr.crawl * u); P = pCrawl(u * 2.6);
      } else {
        along(Lr.crawl);
        if (t < Lr.drop) { th = Lr.th1; P = mixv(pCrawl(2.6), P_FLAT, sstep(seg(t, Lr.scr, Lr.drop))); }   // he throws himself down
        else if (t < Lr.r2) {   // ROLL 2: onto the back again, and the fire is out
          const u = FILM.ease.inOutSine(seg(t, Lr.drop, Lr.r2)); th = lerp(Lr.th1, Lr.th2, u); rollTo(Lr.th1, th);
          P = mixv(P_FLAT, pRoll(th), seg(t, Lr.drop, Lr.drop + 0.2));
          P = mixv(P, P_LIE, seg(t, Lr.r2 - 0.25, Lr.r2));
        } else {   // on his back, heaving
          rollTo(Lr.th1, Lr.th2); th = Lr.th2;
          const hv = 0.5 + 0.5 * Math.sin(TAU * 0.85 * (t - Lr.r2)), ck = COUGH_R.reduce((m, tc) => Math.max(m, Math.exp(-Math.pow((t - tc) / 0.12, 2))), 0);
          P = mixv(P_LIE, P_LIE, 0); P.breath = 0.07 * hv; P.nod = 0.05 + 0.35 * ck; P.legs = P.legs.map((l, i) => i ? { a: l.a + 0.2 * ck, k: l.k + 0.3 * ck, ab: l.ab } : l);
          lift = 0;
        }
      }
    }
    P.sideDrop = 0.16 * Math.sin(th) * (P.pitch ? 0 : 1);
    return { th, P, B: { th, pitch: P.pitch || 0, yaw: Lr.yaw, X, D, lift } };
  }
  const COUGH_R = [T.roll + 4.35, T.roll + 4.62];
  // the shirt fire's level: FLARE (on his side), pressed into the grass -> GUTTER, pressed again -> OUT
  function rollFire(lt) {
    const t = ones(lt), Lr = RL, press1 = lerp(Lr.thrash, Lr.r1, 0.58), press2 = lerp(Lr.drop, Lr.r2, 0.7);
    let lvl = t < press1 - 0.1 ? 1 + 0.35 * (1 - seg(t, Lr.t0 + 0.2, Lr.thrash + 0.4)) : t < press2 - 0.08 ? 0.42 : 0;   // the flare, then the sheet
    if (t >= press1 - 0.1 && t < press1 + 0.2) lvl = 0.42 * seg(t, press1 + 0.05, press1 + 0.2);                          // smothered, then it creeps back
    if (lvl > 0 && lvl < 0.5) lvl *= 0.72 + 0.28 * Math.sin(TAU * 7.3 * t) * (O.vnoise(t * 9, 0.2, 61) > 0.25 ? 1 : -1);   // guttering
    return { lvl: Math.max(0, lvl), press1, press2 };
  }

  // ======================================================================== the yard
  const BDA = () => Y().anchors.backdoor;
  function ydraw(c, F, view, lt, st, pt, o) {
    o = o || {}; const fs = Y().figStyle(view, lt, st, pt);
    if (fs.echoes) { const p = R.path(F); fs.echoes.forEach((col, i) => { c.g.save(); c.g.translate(30 - 13 * i, 11 - 4 * i); c.g.fillStyle = col; c.g.fill(p); c.g.restore(); }); }
    const light = o.light || (fs.lightPt ? { x: fs.lightPt[0], y: fs.lightPt[1] } : fs.light);
    R.draw(c.g, F, Object.assign({ fill: o.fill || fs.fill, light, color: o.color || fs.rimColor || C.ink, w: o.w || fs.rimW || 2, em: c.em, props: !fs.echoes, cache: false }, o.draw || {}));
    return fs;
  }
  // after the blast the yard is the Q12 / Q01 yard: the set's 'house' view (low far fence at left, the neighbours' roofs, the tree,
  // the one tall side fence running toward us at right). Same night as Q12's opening: the roof still on, the upstairs curtain still
  // hanging inside (it burns once, in Q01), no strobes yet (nobody has called), no window fallen in, the fire no further along.
  const YH = { curtain: 0, roof: 0, strobe: 0 };
  // the lawn's perspective in 'house' (from the side fence's boards: the horizon is y 756; Q12's seat is 64 px a head at y 975)
  const houseScale = yFeet => 64 * (yFeet - 756) / (975 - 756);
  // the side fence's foot line in 'house' (the set's perspective fence from [1446, 794] toward [2000, 1000])
  const fenceFootX = yFeet => 1446 + (yFeet - 794) * 554 / 206;

  // 'Scott runs' and the take share the kitchen; the yard follows
  // ======================================================================== custom line draws
  // Scott's long lines, typed across rows (the caret rides the row being typed; he deletes back up the same way)
  function scottRows(x, y, rows, o2) {
    o2 = Object.assign({ lh: 58 }, o2);
    return (c, s, o) => {
      const n = rows.reduce((a, r) => a + r.length, 0) + rows.length - 1; let shown = s.p * n, acc = 0, active = 0;
      rows.forEach((row, i) => { if (shown - acc > 0) active = i; acc += row.length + 1; }); acc = 0;
      rows.forEach((row, i) => {
        const p = clamp((shown - acc) / row.length, 0, 1); acc += row.length + 1; if (p <= 0) return;
        O.say(c.g, 'scott', row, x, y + i * o2.lh, Object.assign({}, o, { p, caret: i === active ? o.caret : false, size: o2.size || o.size, seed: 1 + i }));
      });
    };
  }
  const FACE_A = { family: 'Oswald', weight: 500, size: 52, color: C.tAngelo };
  // Angelo's dealing decays: the words no longer fly; each one DROPS onto its row, crooked, and settles lower than the last.
  // Laid out so no two word boxes ever touch: every word's settled box (its ink extent, turned by its tilt, moved by its jitter and
  // sag) is measured, the next word starts at least `gap` px clear of it, and each row is set at least `gap` px below the lowest box
  // of the row above. The spread (tilt and jitter) is capped at 0.3. A falling word drops only through the clear space over its own
  // slot, fading in, so it never crosses the row above either.
  const DROP = { maxSpread: 0.3, gap: 14 };
  function dropDeal(x, y, rows, o2) {
    o2 = Object.assign({ spread: 0.3, sag: 2, size: 50, align: 'right', gap: DROP.gap }, o2); o2.spread = Math.min(DROP.maxSpread, o2.spread);
    let LAY = null;
    function layout(g, F, text) {
      if (rows.join(' ') !== text) FILM.warn('Q11 dropDeal rows do not match ' + text);
      const r = O.rng('drop' + text), gap = o2.gap, sp = o2.spread; let idx = 0; const out = [];
      g.save(); g.font = O.font(F);
      const R0 = rows.map(rw => {
        let cur = 0; const ws = rw.split(' ').map(wd => {
          const m = g.measureText(wd), w = m.width, asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
          const rot = (r() - 0.5) * 2 * (3 + 9 * sp) * Math.PI / 180, dy0 = (r() - 0.5) * (6 + 12 * sp) + o2.sag * idx++;
          const cs = Math.cos(rot), sn = Math.sin(rot); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
          [[-w / 2, -asc], [w / 2, -asc], [w / 2, desc], [-w / 2, desc]].forEach(([px, py]) => { const X = px * cs - py * sn, Y = px * sn + py * cs; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y + dy0); y1 = Math.max(y1, Y + dy0); });
          const cx = cur - x0; cur = cx + x1 + gap;            // word centre: its turned box starts where the last one ended, plus the gap
          return { wd, w, rot, dy0, cx, x0, x1, y0, y1 };
        });
        return { ws, width: cur - gap };
      });
      g.restore();
      let ry = y, prev = null;
      R0.forEach((row, ri) => {
        const left = o2.align === 'right' ? x - row.width : o2.align === 'center' ? x - row.width / 2 : x;
        if (prev) { const need = Math.max(...prev.map(a => a.Y1)) + gap - Math.min(...row.ws.map(b => b.y0)); ry = Math.max(ry + F.size * 1.1, need); }
        row.ws.forEach(b => { b.X = left + b.cx; b.ry = ry; b.Y0 = ry + b.y0; b.Y1 = ry + b.y1; b.X0 = b.X + b.x0; b.X1 = b.X + b.x1;
          // the clear drop above its slot: up to the lowest box of the row above that it sits under
          const over = prev ? prev.filter(a => a.X1 + gap > b.X0 && a.X0 - gap < b.X1).map(a => a.Y1) : []; b.room = over.length ? Math.max(0, b.Y0 - Math.max(...over) - 3) : F.size * 1.1;
          out.push(b); });
        prev = row.ws;
      });
      return out;
    }
    return (c, s) => {
      const g = c.g, F = Object.assign({}, FACE_A, { size: o2.size });
      const L = LAY || (LAY = layout(g, F, s.T.text)), n = L.length, pp = s.p * n;
      L.forEach((b, i) => {
        const q = clamp(pp - i, 0, 1); if (q <= 0) return;
        const fall = (1 - q * q) * Math.min(F.size * 1.1, b.room), a = Math.min(1, q * q / 0.3);
        g.save(); g.globalAlpha = s.alpha * a; g.translate(b.X, b.ry + b.dy0 - fall); g.rotate(b.rot * (0.4 + 0.6 * q)); O.text(g, b.wd, -b.w / 2, 0, F); g.restore();
      });
    };
  }
  // Angelo, from 'Scott. Please.' on: his voice has changed. Oswald 300, lighter-cream, undealt and level, no card and no box;
  // 56-64 px in the live area beside him. It simply arrives. rows (optional) break a long line; they must join to the line's text.
  function finalLine(x, y, o2) {
    o2 = Object.assign({ size: 60, align: 'right', lh: 1.14 }, o2);
    let ok = null;
    return (c, s) => {
      const rows = o2.rows || [s.T.text]; if (ok === null) { ok = rows.join(' ') === s.T.text; if (!ok) FILM.warn('Q11 final rows do not match ' + s.T.text); }
      const a = s.alpha * Math.min(1, 0.25 + 0.75 * s.p), lh = o2.size * o2.lh, y0 = y - (rows.length - 1) * lh;   // y is the last row's baseline
      rows.forEach((rw, i) => O.say(c.g, 'angelo', rw, x, y0 + i * lh, { final: true, size: o2.size, align: o2.align, alpha: a }));
    };
  }

  // ======================================================================== the shots
  const SC_CU = { x: 700, y: 400, zoom: 1.3 };
  const shots = [];

  // 1 — Scott: 'The gas. Angelo, we have to shut the gas off.'
  shots.push({ at: 0, name: 'cu Scott: the gas', draw(c, st, lt) { standoff(c, lt, SC_CU, { angelo: false }); } });

  // 2 — Angelo looks at the stove (a slow, drained turn toward it). Framed right, so Scott's words hang in the dark at left until he deletes them.
  shots.push({ at: T.stove, name: 'mcu Angelo: looks at the stove', draw(c, st, lt) {
    const tr = R.turn('angelo', lt, T.stove + 0.12, -1, 1, { mood: 'drained', dur: 0.6 });
    const sink = seg(lt, T.stove + 1.3, T.stove + 1.7);   // it cannot be shut off: his head drops a little
    angeloClose(c, lt, { facing: tr.facing, squash: tr.squash, view34: tr.view34, look: tr.u < 0.5 ? [-400, 380] : [2300, 820], neck: 0.1 + 0.08 * sink, head: 0.2 + 0.14 * sink },
      { cam: { x: 390, y: 540, zoom: 1 }, earCig: true });
  } });
  // 3 — the knobs: two bare spindles. It cannot be shut off.
  shots.push({ at: T.knobs, name: 'insert: two knobs gone', draw(c, st, lt) {
    const k = K(), s = kst(lt, { gas: 1, ovenOpen: 0.6, perforations: 0 }); const z = lerp(1.2, 1.28, seg(lt, T.knobs, T.deena));
    kcam(c, Object.assign({}, k.cams.knobs.twoGone, { zoom: z }), lt, 1.5, 61); k.back(c, lt, s, 'knobs');
  } });
  // 4 — then at Deena
  shots.push({ at: T.deena, name: 'mcu Angelo: then at Deena', draw(c, st, lt) {
    const tr = R.turn('angelo', lt, T.deena + 0.04, 1, -1, { mood: 'drained', dur: 0.5 });
    const look = R.key('angelo', lt, [[T.deena, [1700, 780]], [T.deena + 0.5, [500, 1500]]], { mood: 'drained' });
    angeloClose(c, lt, { facing: tr.facing, squash: tr.squash, view34: tr.view34, look, neck: lerp(0.1, 0.3, seg(lt, T.deena + 0.25, T.floor)), head: lerp(0.2, 0.5, seg(lt, T.deena + 0.25, T.floor)) }, { earCig: true });
  } });
  // 5 — Deena on the tiles under his jacket
  shots.push({ at: T.floor, name: 'floor: Deena under the jacket', draw(c, st, lt) { const k = K(); floorShot(c, lt, Object.assign({}, k.cams.floor.jacket, { zoom: lerp(1.3, 1.36, seg(lt, T.floor, T.cig)) })); } });
  // 6 — the forgotten cigarette from behind his ear; he stares at it; his fingers open
  shots.push({ at: T.cig, name: 'mcu Angelo: the cigarette', draw(c, st, lt) {
    const t0 = T.cig, s = AMCU.scale;
    const head = R.figure('angelo', { x: AMCU.x, y: AMCU.y, anchor: 'hip', scale: s, facing: -1, clothes: 'none', mood: 'drained', neck: 0.3, head: 0.5, cig: false }).joints.head;
    const earP = [head[0] + 0.14 * s, head[1] + 0.02 * s], stare = [head[0] - 0.95 * s, head[1] + 0.42 * s], rest = [AMCU.x - 0.2 * s, AMCU.y + 0.6 * s];
    const ph = lt - t0, taken = ph >= 0.56, open = ph >= 1.85;
    const handTo = R.key('angelo', lt, [[t0, rest], [t0 + 0.5, earP], [t0 + 0.64, earP], [t0 + 1.2, stare], [t0 + 1.85, stare], [t0 + 2.15, [stare[0] - 6, stare[1] + 26]]], { mood: 'drained' });
    const spec = { neck: lerp(0.3, 0.1, seg(lt, t0 + 0.7, t0 + 1.25)), head: lerp(0.5, 0.4, seg(lt, t0 + 0.7, t0 + 1.25)), look: taken ? stare : [400, 1400] };
    if (taken && !open) spec.hold = { N: { kind: 'cig', at: handTo } };
    else spec.armN = { to: handTo, hand: open ? 'open' : ph > 0.38 ? 'pinch' : 'relaxed', handOpts: open ? { spread: 0.18 } : undefined, elbow: 'down' };
    const F = angeloClose(c, lt, spec, { earCig: !taken });
    if (open) {   // the sliver drops out of his fingers
      const u = ph - 1.85, w = F.joints.wristN, x = w[0] - 0.55 * s, y = w[1] - 0.1 * s + 900 * u * u + 60 * u, g = c.g;
      g.save(); g.translate(x, y); g.rotate(-0.5 + 5 * u); g.strokeStyle = C.cardPaper; g.lineCap = 'round'; g.lineWidth = 6; g.beginPath(); g.moveTo(-26, 0); g.lineTo(26, 0); g.stroke(); g.restore();
    }
  } });
  // 7 — it falls: the last ivory sliver lands on the tiles beside her
  shots.push({ at: T.drop, name: 'floor: the sliver falls', draw(c, st, lt) {
    const k = K(), land = k.anchors.floor.cig, t0 = T.drop + 0.15;
    floorShot(c, lt, { x: 690, y: 440, zoom: 1.25 }, { st: { cig: lt >= T.cigLand ? 1 : 0 }, after(c) {
      if (lt >= T.cigLand) return; const u = clamp((lt - t0) / (T.cigLand - t0), 0, 1); if (u <= 0) return;
      const y = lerp(100, land[1], u * u), x = land[0] + 40 * (1 - u), g = c.g;
      g.save(); g.translate(x, y); g.rotate(1.3 + 6.2 * u); g.fillStyle = C.cardPaper; g.fillRect(-11, -1.6, 22, 3.2); g.restore();
    } });
  } });
  // 8 — the lighter out of his pocket: the 2 px glint is the brightest thing in the frame
  shots.push({ at: T.lighter, name: 'mcu Angelo: the lighter', draw(c, st, lt) {
    const t0 = T.lighter;
    const at = R.key('angelo', lt, [[t0, [AMCU.x + 40, AMCU.y + 260]], [t0 + 0.45, [AMCU.x + 40, AMCU.y + 260]], [t0 + 1.2, [AMCU.x - 395, AMCU.y - 470]]], { mood: 'drained' });
    const look = R.key('angelo', lt, [[t0, [500, 1500]], [t0 + 1.0, [500, 1500]], [t0 + 1.5, at]], { mood: 'drained' });
    angeloClose(c, lt, { look, neck: 0.25, head: 0.4, hold: lt < t0 + 0.5 ? undefined : { N: { kind: 'lighter', at, strike: 0.05 } }, armN: lt < t0 + 0.5 ? { to: at, hand: 'fist', elbow: 'back' } : undefined });
  } });
  // 9 — Scott sees it
  shots.push({ at: T.sees, name: 'cu Scott: sees it', draw(c, st, lt) {   // a 7-frame snap zoom onto his face as he sees it
    const cam = key(lt, [[T.sees, SC_CU], [T.sees + 0.12, SC_CU], [T.sees + 0.12 + 7 / 24, { x: 690, y: 360, zoom: 1.52 }, 'outCubic'], [T.take, { x: 688, y: 356, zoom: 1.55 }, 'linear']]);
    standoff(c, lt, cam, { angelo: false, shake: 2.4 });
  } });

  // 10 — THE TAKE: one unbroken shot. A slow continuous push on ones (~0.45% scale a second, exponential so the rate stays even)
  // from the wide to a tight two-shot of Angelo and the lighter (Scott's shoulder the left edge of frame), arriving at 'Scott.
  // Please.' with a soft landing; then it holds through the strike. The letterbox squeezes on.
  const PUSH = { from: { x: 960, y: 540, zoom: 0.97 }, to: { x: 1122, y: 418, zoom: 0.97 * Math.pow(1.0045, T.L232 - T.take) }, land: 1.6 };
  function takeCam(lt) {
    const D = T.L232 - T.take, a = PUSH.land / D, kk = 1 / (1 - a / 2), u = clamp((ones(lt) - T.take) / D, 0, 1);
    const e = u < 1 - a ? kk * u : 1 - (1 - u) * (1 - u) * kk / (2 * a);   // linear, then a quadratic landing with matched slope
    const A = PUSH.from, B = PUSH.to;
    return { x: lerp(A.x, B.x, e), y: lerp(A.y, B.y, e), zoom: A.zoom * Math.pow(B.zoom / A.zoom, e) };
  }
  shots.push({ at: T.take, name: 'standoff: the take', draw(c, st, lt) {
    const F = standoff(c, lt, takeCam(lt), { shake: 1.4 });
    sparkBurst(c, F.angelo, lt);
  } });

  // 11 — Scott runs (the first cut after the take): he whirls and goes for the back door; Angelo stays where he is, the lighter up
  function runSpec(lt) {
    const t0 = T.takeEnd, k = K(), P = k.persp.standoff;
    const tr = R.turn('scott', lt, t0 + 0.02, 1, -1, { dur: 0.18 });
    const u = sstep(seg(lt, t0 + 0.16, t0 + 0.86));
    const fy = lerp(1140, 752, u), sc = P.scaleAt(fy) * 0.885, x = lerp(655, 452, Math.pow(u, 0.8));
    const run = gaitAt(R.run('scott', lt, { x0: 0, scale: sc, facing: -1, t0: t0 + 0.14 }), x);
    const shove = u > 0.42 && u < 0.8;   // he shoves the door open ahead of him
    return Object.assign({}, run, { y: fy, scale: sc, facing: tr.facing, squash: tr.squash, view34: tr.view34, t: lt, look: DOOR, armN: shove ? { a: 1.45, b: 0.15, hand: 'open', w: -1.2 } : run.armN });
  }
  shots.push({ at: T.takeEnd, name: 'Scott runs', draw(c, st, lt) {
    const t0 = T.takeEnd, door = K().anchors.standoff.backDoor;
    const bd = sstep(seg(lt, t0 + 0.5, t0 + 0.72)); const gone = lt > t0 + 1.0;
    const clip = lt > t0 + 0.8 ? (() => { const p = new Path2D(); p.rect(door[0], door[1], door[2] - door[0], door[3] - door[1]); return p; })() : undefined;
    standoff(c, lt, { x: 760, y: 540, zoom: 1.04 }, { st: { backDoor: bd }, shake: 2.6, scottSpec: runSpec, scottClip: clip, scottWhen: () => !gone });
  } });

  // 12 — EXT. BACK YARD: out of the door, down the steps, back up to pull it shut; the scrape; 0.4 s of nothing; the kitchen erupts
  function yardSt(lt, tb) {
    const doorOpen = key(lt, [[T.yard, 0.92], [T.slam - 0.05, 0.92], [T.slam + 0.22, 0, 'inQuad']]);
    return { fire: 0, doorOpen, kitchenFlare: seg(lt, tb - 0.13, tb - 0.02), blast: Y().blastAt(lt, tb), curtain: 0 };   // the upstairs curtain hangs inside until Q01
  }
  const PULL = { x: 1318, y: 700 };   // on the top step, in front of the door, facing the handle
  const LAND = [1040, 900];           // where the blast throws him (the roll starts here)
  function yardScott(lt, st, tb) {
    const t0 = T.yard;
    if (lt < tb) {
      if (lt < t0 + 0.3) {      // out of the doorway, running
        const u = seg(lt, t0, t0 + 0.3), x = lerp(1338, 1290, u), y = 700, sc = 27;
        return { spec: Object.assign(gaitAt(R.run('scott', lt, { x0: 0, scale: sc, facing: -1, t0: t0 - 0.3 }), x), { y, scale: sc, t: lt }), pt: [x, y - 4 * sc] };
      }
      if (lt < t0 + 1.0) {      // the toe catches on the top step: he pitches down the steps into the light, a hand to the ground
        const u = seg(lt, t0 + 0.3, t0 + 1.0), y = lerp(700, 800, sstep(u * 1.25)), sc = lerp(27, 30, u);
        const s = R.stumble('scott', u, { x0: 1290, scale: sc, facing: -1, dist: 120 });
        return { spec: Object.assign(s, { y, scale: sc, t: lt }), pt: [s.x, y - 3 * sc] };
      }
      if (lt < T.slam - 0.15) { // up, round, and back up the steps to the door
        const u = seg(lt, t0 + 1.0, T.slam - 0.15), tr = R.turn('scott', lt, t0 + 1.0, -1, 1, { dur: 0.22 });
        const x = lerp(1170, PULL.x, sstep(u)), y = lerp(800, PULL.y, sstep(u)), sc = lerp(30, 27, u);
        const run = gaitAt(R.run('scott', lt, { x0: 0, scale: sc, facing: 1, t0: t0 + 1.12 }), x);
        const h = Y().doorHandle(st.doorOpen);
        return { spec: Object.assign({}, run, { y, scale: sc, facing: tr.facing, squash: tr.squash, view34: tr.view34, t: lt, armN: u > 0.5 ? { to: h, hand: 'open' } : run.armN }), pt: [x, y - 4 * sc] };
      }
      // grabs the handle, yanks it shut, then HANGS on it: all his weight back on the handle arm, heaving; at the scrape his head comes up
      const h = Y().doorHandle(st.doorOpen), hear = seg(lt, T.scrape + 0.04, T.scrape + 0.3), yank = seg(lt, T.slam - 0.05, T.slam + 0.2);
      const hang = sstep(seg(lt, T.slam + 0.15, T.slam + 0.55)), tq = twos(lt), heave = Math.sin(TAU * 0.95 * tq) * hang * (1 - 0.7 * hear);
      return { spec: { x: PULL.x - 6 * yank + 4 * hang, y: PULL.y, scale: 27, facing: 1, t: lt, breath: false,
        lean: 0.1 - 0.16 * yank - 0.3 * hang + 0.07 * heave + 0.16 * hear, neck: 0.2 + 0.2 * hang + 0.08 * heave - 0.5 * hear, head: 0.4 + 0.12 * hang - 0.6 * hear,
        armN: { to: h, hand: 'grip' }, armF: { a: -0.25 + 0.15 * hear + 0.08 * heave, b: 0.5, hand: 'relaxed' },
        legN: { a: -0.16 + 0.55 * hang, b: 0.18 + 0.45 * hang }, legF: { a: 0.22 - 0.06 * hang, b: 0.25 + 0.55 * hang } }, pt: [PULL.x, PULL.y - 4 * 27], hanging: true };
    }
    // the blast: thrown off the step onto the lawn, backward
    const tu = seg(lt, tb + 0.02, tb + 0.95), from = [PULL.x, PULL.y - 3.9 * 27], to = [LAND[0], LAND[1] - 7];
    if (tu < 1) {
      const sc = lerp(27, 41, tu);
      return { spec: Object.assign({ scale: sc, t: lt }, R.thrown('scott', tu, { from, to, peak: 150, facing: 1 })), pt: [lerp(from[0], to[0], tu), lerp(from[1], to[1], tu)], thrown: true, tu };
    }
    // down on the lawn, stunned; the shirt has caught; his far arm jerks up
    const jerk = seg(lt, tb + 1.3, tb + 1.55) * (1 - seg(lt, tb + 1.7, tb + 2.2));
    return { spec: { x: LAND[0], y: LAND[1] + 5, scale: 41, pose: 'lie', headTo: 'left', t: lt, armF: { rest: [-1.6 + 0.8 * jerk, 0.1 + 0.9 * jerk] } }, pt: [LAND[0], LAND[1] - 20], down: true };
  }
  shots.push({ at: T.yard, name: 'yard: out, the door, the blast', draw(c, st, lt) {
    const yd = Y(), tb = tbf(c), s = yardSt(lt, tb), db = lt - tb;
    const C0 = { x: 1250, y: 640, zoom: 1.5 }, cam = lt < tb + 0.3 ? C0 : key(lt, [[tb + 0.3, C0], [tb + 1.9, { x: 1080, y: 600, zoom: 1.0 }, 'inOutCubic']]);
    yd.camera(c, 'backdoor', lt, s, cam); const M0 = c.g.getTransform();
    yd.back(c, lt, s, 'backdoor');
    const sc = yardScott(lt, s, tb); const F = R.figure('scott', sc.spec);
    if (sc.hanging) {   // hanging on the handle against the lit door glass: a crescent on the window side only
      const fs = yd.figStyle('backdoor', lt, s, sc.pt);
      ydraw(c, F, 'backdoor', lt, s, sc.pt, { light: fs.light, draw: { spread: 1.0, headSpread: 0.95 } });
    } else if (db >= BL.inv && db < 0.62) {   // just after the negative: his afterimage burns cream against the ink plume, then sinks to ink
      const k = 1 - seg(db, BL.inv + 0.04, 0.6);
      ydraw(c, F, 'backdoor', lt, s, sc.pt, { fill: O.mix(C.ink, C.lighterCream, 0.82 * k), light: { x: 1330, y: 590 }, color: C.fireCore, w: 5, draw: { spread: 2.2 } });
    } else ydraw(c, F, 'backdoor', lt, s, sc.pt);
    if (sc.down || (sc.thrown && sc.tu > 0.55)) {   // the shirt catches: a ragged sheet along his back, growing
      const a = F.joints.shoulder, b = F.joints.hip, n = 6, base = []; for (let i = 0; i < n; i++) { const u = 0.1 + 0.85 * i / (n - 1); base.push([lerp(b[0], a[0], u), lerp(b[1], a[1], u) - 0.18 * F.scale]); }
      sheetFire(c, base, { s: F.scale, lvl: seg(lt, tb + 0.55, tb + 1.4) * 0.85, trail: [0.25, 0], lt, seed: 5 });
    }
    yd.front(c, lt, s, 'backdoor');
    c.reset();
    yd.burnMattes(c, lt < tb ? 0 : seg(lt, tb + 4 / 24, tb + 1.6), 2.76, { t: lt });
    if (db >= 0 && db < BL.white) {   // the three blast-white frames: one flat field of paper white, Scott a pale grey cut-out, nothing else
      const M = M0, p = R.path(F);
      c.after.push(cx => { cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; cx.fillStyle = C.blastWhite; cx.fillRect(0, 0, W, H);
        cx.setTransform(M); cx.fillStyle = '#CDC4B4'; cx.fill(p); cx.restore(); });
    }
  } });

  // 12b — the mattes gone, the yard as Q12 and Q01 know it ('house': the low far fence at left, the neighbours' roofs, the tree, the
  // one tall side fence at right): the house burning, Scott down on the lawn below the steps by the burning door, the shirt catching,
  // his far arm jerking up. The blast's shake is still dying (the set's own, from the blast clock).
  const DOWN = { x: 1226, y: 850 };
  shots.push({ at: T.wide, name: 'house: down on the lawn', draw(c, st, lt) {
    const yd = Y(), tb = tbf(c), s = Object.assign({ fire: yardFire(lt), blast: yd.blastAt(lt, tb) }, YH);
    yd.camera(c, 'house', lt, s, { x: 1050, y: 600, zoom: lerp(1.12, 1.14, seg(lt, T.wide, T.roll)) });
    yd.back(c, lt, s, 'house');
    const jerk = seg(lt, tb + 1.3, tb + 1.55) * (1 - seg(lt, tb + 1.7, tb + 2.2));
    const F = R.figure('scott', { x: DOWN.x, y: DOWN.y, scale: houseScale(DOWN.y), pose: 'lie', headTo: 'left', t: lt, armF: { rest: [-1.6 + 0.8 * jerk, 0.1 + 0.9 * jerk] } });
    ydraw(c, F, 'house', lt, s, [DOWN.x, DOWN.y - 20]);
    const a = F.joints.shoulder, b = F.joints.hip, base = []; for (let i = 0; i < 6; i++) { const u = 0.1 + 0.85 * i / 5; base.push([lerp(b[0], a[0], u), lerp(b[1], a[1], u) - 0.18 * F.scale]); }
    sheetFire(c, base, { s: F.scale, lvl: 0.85, trail: [0.25, 0], lt, seed: 5 });
    yd.front(c, lt, s, 'house');
  } });

  // 13 — the shirt burns: he rolls, scrambles away from the house, rolls again until the fire is out (the local 3D body)
  shots.push({ at: T.roll, name: 'yard: he burns and rolls', draw(c, st, lt) {
    const yd = Y(), tb = tbf(c), s = { blast: yd.blastAt(lt, tb), fire: 0.9, curtain: 0 };
    const cam = key(lt, [[T.roll, { x: 935, y: 855, zoom: 2.4 }], [RL.up, { x: 935, y: 855, zoom: 2.4 }], [RL.scr + 0.3, { x: 878, y: 855, zoom: 2.42 }], [RL.end, { x: 905, y: 855, zoom: 2.46 }]]);
    yd.camera(c, 'backdoor', lt, s, cam);
    yd.back(c, lt, s, 'backdoor');
    const RS = rollState(lt), body = rbBody(RS.P, RS.B), pel = body.P.pel;
    const fs = yd.figStyle('backdoor', lt, s, [pel[0], pel[1] - 30]);
    // the fire: one sheet off his back, streaming against the motion; under him it is smothered
    const fr = rollFire(lt), nUp = -Math.cos(RS.th), expo = sstep((nUp + 0.15) / 0.75), backToCam = Math.sin(RS.th) > 0.1;
    let base = rbBack(body);
    const RP0 = rollState(lt - 1 / 12), pb = rbBack(rbBody(RP0.P, RP0.B));
    const vx = (base[3][0] - pb[3][0]) * 12, vy = (base[3][1] - pb[3][1]) * 12, sp = Math.hypot(vx, vy), sc = pel[2];
    const trail = sp > 1 ? [-vx / sp * Math.min(1.1, sp / (3.5 * sc)), -vy / sp * Math.min(0.6, sp / (5 * sc))] : [0.12, 0];
    const fire = () => sheetFire(c, base, { s: sc, lvl: fr.lvl * expo, trail, lt, seed: 9 });
    if (!backToCam) fire();
    O.silhouette(c.g, body.shape, { fill: C.ink, light: fs.light, rimColor: fs.rimColor, rimW: fs.rimW + 0.5, rough: 0.8, seed: 31 + (Math.floor(twos(lt) * 12) % 2) });
    if (backToCam) fire();
    // smoke: a puff at each smothering, then wisps off his back
    const puff = Math.max(Math.exp(-Math.pow((lt - fr.press1 - 0.15) / 0.3, 2)) * 0.7, seg(lt, fr.press2 - 0.05, fr.press2 + 0.25) * (1 - 0.6 * seg(lt, RL.end - 0.8, RL.end)));
    smokeWisps(c, [pel[0] - 0.8 * sc, pel[1] - 0.3 * sc], sc, puff, lt, 3, 0.4);
    yd.front(c, lt, s, 'backdoor');
  } });

  // 14 — he crawls to the far fence, coughing, sobbing; the second explosion throws sparks into the night. The 'house' view (the
  // Q12/Q01 yard): from where the roll left him, near the burning door on the lawn, across in front of the steps to the tall side
  // fence at right, away from the fire behind him.
  const COUGH = [78.9, 80.2, 83.0];
  const CRAWL = { from: [1150, 874], to: [1734, 912] };   // ground points (feet) in 'house'; the end has his back to the boards
  const crawlU = lt => key(lt, [[T.fence, 0], [78.85, 0.09], [79.4, 0.115], [80.1, 0.28], [80.6, 0.3], [T.second, 0.465], [T.second + 1.2, 0.49], [83.2, 0.93], [83.6, 1]]);
  function crawlAt(u) {
    const e = u * u * (3 - 2 * u) * 0.35 + u * 0.65, y = lerp(CRAWL.from[1], CRAWL.to[1], e) + 14 * Math.sin(Math.PI * e);
    return [lerp(CRAWL.from[0], CRAWL.to[0], e), y, houseScale(y)];
  }
  const yardFire = lt => lerp(0.86, 1, seg(lt, T.second, T.second + 2.5));
  shots.push({ at: T.fence, name: 'house: the crawl, the second blast', draw(c, st, lt) {
    const yd = Y(), s = Object.assign({ fire: yardFire(lt), secondBlast: T.second }, YH), A = yd.anchors.house;
    yd.camera(c, 'house', lt, s, { x: 1080, y: 600, zoom: lerp(1.14, 1.17, seg(lt, T.fence, T.hold)) });
    yd.back(c, lt, s, 'house');
    const u = crawlU(lt), p = crawlAt(u), p0 = crawlAt(0);
    const d = Math.hypot(p[0] - p0[0], p[1] - p0[1]);        // the limbs cycle with the ground covered: no sliding
    const ck = R.crawl('scott', T.fence + d / (0.55 * p[2]), { x0: 0, scale: p[2], facing: 1, t0: T.fence });
    const flat = seg(lt, T.second, T.second + 0.12) * (1 - seg(lt, T.second + 0.8, T.second + 1.3));
    const cough = COUGH.reduce((m, tc) => Math.max(m, Math.exp(-Math.pow((lt - tc) / 0.14, 2))), 0);
    const spec = Object.assign({}, ck, { x: p[0], y: p[1], scale: p[2], t: lt, lean: ck.lean + 0.3 * flat + 0.14 * cough, head: ck.head - 0.6 * flat + 0.3 * cough, neck: ck.neck + 0.18 * cough - 0.2 * flat,
      look: flat > 0.2 ? A.kitchen : undefined });
    const F = R.figure('scott', spec);
    ydraw(c, F, 'house', lt, s, F.joints.chest);
    yd.front(c, lt, s, 'house');
  } });

  // 15 — for a while there is nothing he can do but watch: lower and nearer, sat with his back to the side fence he reached, the
  // kitchen he ran from burning across the lawn. About 4 s, then a hard cut into Q12 (LATER: the same yard, wide).
  const SEAT = { x: 1730, ground: 914 };
  shots.push({ at: T.hold, name: 'house: nothing he can do but watch', draw(c, st, lt) {
    const yd = Y(), s = Object.assign({ fire: yardFire(lt) }, YH), u = seg(lt, T.hold, T.dur, 'inOutSine'), A = yd.anchors.house;
    yd.camera(c, 'house', lt, s, { x: lerp(1236, 1230, u), y: lerp(676, 682, u), zoom: lerp(1.42, 1.45, u) });
    yd.back(c, lt, s, 'house');
    const sob = Math.max(0, Math.sin(TAU * 0.45 * (lt - T.hold) - 0.6)) * (1 - seg(lt, T.dur - 0.9, T.dur));
    const F = R.figure('scott', { x: SEAT.x, y: SEAT.ground, scale: houseScale(SEAT.ground), facing: -1, pose: 'grass', t: lt, look: A.kitchen, lookAmt: 0.75 - 0.3 * sob,
      lean: -0.06 + 0.1 * sob, head: 0.04 + 0.24 * sob, neck: 0.22 + 0.12 * sob });
    ydraw(c, F, 'house', lt, s, F.joints.chest);
    yd.front(c, lt, s, 'house');
  } });   // no fade: a hard cut into Q12

  // ======================================================================== dialogue (ids only; text from the screenplay)
  // screen positions (the take pushes in, so the late lines sit where the two-shot puts their speakers)
  const SX = 760, SY = 595, AX = 1290, AY = 690;   // Scott / Angelo while the frame is still wide
  const DX = 1130, DY = 700;                       // Angelo's dropped deal (right edge): on the dark lower cabinets, under his hand
  const SX2 = 620, SY2 = 800;                      // Scott in the two-shot: low in front of him, under his reaching arm
  const FX = 1290, FY = 700;                       // Angelo's last lines (right edge, last baseline): the dark at his side
  const lines = [
    // typed in three short rows in his lead room; they hold in the dark through Angelo's turn to the stove, and he deletes them
    { id: 'L217', at: 0.2, x: 955, y: 595, until: 3.95, opts: { stress: 0.25 }, draw: scottRows(955, 595, ['The gas. Angelo,', 'we have to shut', 'the gas off.'], { size: 44, lh: 56 }) },
    { id: 'L218', at: 14.6, x: SX, y: SY, opts: { stress: 0.35 } },
    { id: 'L219', at: 15.8, x: AX, y: AY, align: 'right', opts: { spread: 0.12 } },
    { id: 'L220', at: 17.9, x: SX, y: SY, opts: { stress: 0.45 } },
    { id: 'L221', at: 19.7, x: AX, y: AY, align: 'right', opts: { spread: 0.15 } },
    { id: 'L222', at: 21.2, x: SX, y: SY, opts: { stress: 0.5 } },
    { id: 'L223', at: 24.5, x: AX, y: AY, align: 'right', opts: { spread: 0.2 } },
    { id: 'L224', at: 27.0, x: SX, y: 572, hold: 2.6, opts: { stress: 0.3 }, draw: scottRows(SX, 572, ['Come with me.', 'We can call the police', 'from outside.'], { size: 46, lh: 56 }) },
    { id: 'L225', at: 32.0, x: AX, y: AY, align: 'right', opts: { spread: 0.4 } },
    { id: 'L226', at: 35.0, x: SX, y: SY, opts: { stress: 0.2 } },
    { id: 'L227', at: 36.9, x: AX, y: AY, align: 'right', opts: { spread: 0.65 } },
    { id: 'L228', at: 42.0, x: DX, y: DY, draw: dropDeal(DX, DY, ['You always keep', 'the back gate unlocked?'], { spread: 0.3, sag: 2 }) },
    { id: 'L229', at: 45.8, x: SX, y: SY, opts: { stress: 0.1 } },
    { id: 'L230', at: 47.0, x: DX, y: DY, draw: dropDeal(DX, DY, ['Good. Go through it.', "Don't stop in the yard."], { spread: 0.3, sag: 2.5 }) },
    { id: 'L231', at: 51.4, x: SX2, y: SY2, opts: { stress: 0.6 } },
    // his voice has changed: no deal, no card, no box; level lines in the dark between them, at his hand's side
    { id: 'L232', at: T.L232, x: FX, y: FY, silent: true, opts: { final: true }, draw: finalLine(FX, FY, { size: 64 }) },
    { id: 'L233', at: 55.3, x: FX, y: FY, silent: true, opts: { final: true }, draw: finalLine(FX, FY, { size: 58, rows: ["I don't want you here", 'when I do it.'] }) },
    { id: 'L234', at: 58.4, x: SX2, y: SY2, opts: { stress: 0.8 } },
    { id: 'L235', at: 60.1, x: FX, y: FY, silent: true, opts: { final: true }, draw: finalLine(FX, FY, { size: 64 }) },
    { id: 'L236', at: 63.1, x: FX, y: FY, silent: true, opts: { final: true }, until: T.takeEnd - 0.02, noExit: true, draw: finalLine(FX, FY, { size: 56 }) },
  ];

  // ======================================================================== sound
  const SND = window.SOUND;
  if (SND && !SND.beds['Q11.fire']) {
    const { db, src, osc, filt, gain, pan, chain, perc, bedEnv } = SND;
    // night air outside the house: a low wind, slowly breathing
    SND.beds['Q11.night'] = (ac, B, t0, t1, p) => { const g = gain(ac, 0); bedEnv(g, t0, t1, db(p.level || -44), p.fi == null ? 0.4 : p.fi, p.fo == null ? 0.05 : p.fo); const lp = filt(ac, 'lowpass', 380, 0.6); chain(src(ac, 'brown', 211, t0, t1), lp, g); const l = osc(ac, 'sine', 0.11, t0, t1), lg = gain(ac, 160); chain(l, lg); lg.connect(lp.frequency); g.connect(B.room); };
    // a cough: rough bursts through a throat formant
    SND.cues['Q11.cough'] = (ac, B, t, p, Rn) => { const n = p.n || 2; for (let i = 0; i < n; i++) { const tt = t + i * (0.2 + 0.05 * i); const g = gain(ac, 0); perc(g, tt, db((p.level || -22) - i * 3), 0.006, 0.16); const s = src(ac, 'white', 221 + i, tt, tt + 0.3); const v = gain(ac, 1); [[520, 3], [1300, 4], [2600, 5]].forEach(([f, q]) => chain(s, filt(ac, 'bandpass', f * (0.95 + 0.1 * Rn()), q), v)); chain(v, g, pan(ac, p.pan || 0), B.fx); } };
    // a sob: a shaking intake of breath
    SND.cues['Q11.sob'] = (ac, B, t, p) => { const d = p.dur || 0.7; const g = gain(ac, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(db(p.level || -26), t + d * 0.7); g.gain.linearRampToValueAtTime(0, t + d); const am = osc(ac, 'sine', 7.5, t, t + d), ag = gain(ac, db(p.level || -26) * 0.5); chain(am, ag); ag.connect(g.gain); const s = src(ac, 'pink', 231, t, t + d + 0.05); [[700, 6], [1150, 7]].forEach(([f, q]) => chain(s, filt(ac, 'bandpass', f, q), g)); chain(g, pan(ac, p.pan || 0), B.fx); };
    // a footfall on lino / a wooden step / a knee on turf
    SND.cues['Q11.step'] = (ac, B, t, p) => { const g = gain(ac, 0); perc(g, t, db(p.level || -24), 0.002, 0.07); chain(src(ac, 'brown', 241, t, t + 0.12), filt(ac, 'lowpass', 420, 0.8), g, pan(ac, p.pan || 0), B.fx); };
    // the thumb on the wheel: a tiny dry tick
    SND.cues['Q11.wheel'] = (ac, B, t, p) => { const g = gain(ac, 0); perc(g, t, db(p.level || -40), 0.0005, 0.006); chain(src(ac, 'white', 251, t, t + 0.02), filt(ac, 'bandpass', 6400, 5), g, pan(ac, 0.35), B.fx); };
    // the breath of a flame catching cloth
    SND.cues['Q11.flare'] = (ac, B, t, p) => { const d = p.dur || 0.5; const g = gain(ac, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(db(p.level || -20), t + 0.05); g.gain.exponentialRampToValueAtTime(1e-4, t + d); chain(src(ac, 'brown', 261, t, t + d + 0.05), filt(ac, 'lowpass', 900, 0.7), g, B.fx); };
    // the burning shirt pressed into the grass: a body thud, then the fire choked off in a short hiss
    SND.cues['Q11.smother'] = (ac, B, t, p) => {
      const g = gain(ac, 0); perc(g, t, db(p.level || -18), 0.004, 0.18); chain(src(ac, 'brown', 271, t, t + 0.25), filt(ac, 'lowpass', 260, 0.8), g, B.fx);
      const h = gain(ac, 0); h.gain.setValueAtTime(0, t + 0.02); h.gain.linearRampToValueAtTime(db((p.level || -18) - 8), t + 0.06); h.gain.exponentialRampToValueAtTime(1e-4, t + 0.06 + (p.dur || 0.5));
      chain(src(ac, 'white', 272, t, t + 0.7), filt(ac, 'bandpass', 2400, 0.9), h, B.fx);
    };
    // the burning house, with a level that works: the shared 'fire' bed adds its 0.13 Hz swell to the gain as an absolute +-0.35, so
    // its level barely moves it (-16 and -22 measure within 1 dB). Here the same roar, rumble and crackle are built exactly as at the
    // shared default (-14) and then trimmed by p.level, with the fades applied after the swell.
    SND.beds['Q11.fire'] = (ac, B, t0, t1, p, Rn) => {
      const lv0 = db(-14), out = gain(ac, lv0), trim = gain(ac, db(p.level == null ? -14 : p.level) / lv0), fade = gain(ac, 0);
      bedEnv(fade, t0, t1, 1, p.fi == null ? 2 : p.fi, p.fo == null ? 2 : p.fo); chain(out, trim, fade, B.room);
      if (SOUND.fireRec(ac, out, t0, t1, p)) return;
      chain(src(ac, 'brown', 3, t0, t1), filt(ac, 'lowpass', 700, 0.5), gain(ac, 1.2), out);
      const lfo = osc(ac, 'sine', 0.13, t0, t1), lg = gain(ac, 0.35); chain(lfo, lg); lg.connect(out.gain);
      [41, 62].forEach((f, i) => chain(osc(ac, 'sine', f, t0, t1), gain(ac, 0.12 / (i + 1)), out));
      const n = Math.floor((t1 - t0) * (6 + 18 * (p.near == null ? 0.6 : p.near)));
      for (let i = 0; i < n; i++) { const t = t0 + Rn() * (t1 - t0); const g = gain(ac, 0); perc(g, t, 0.05 + Rn() * 0.25, 0.001, 0.02 + Rn() * 0.06); chain(src(ac, 'white', 7 + i % 5, t, t + 0.12), filt(ac, 'bandpass', 1800 + Rn() * 3500, 1.5), g, pan(ac, Rn() * 1.4 - 0.7), out); }
    };
    // grass and soil under scrambling hands
    SND.cues['Q11.scuff'] = (ac, B, t, p) => { const g = gain(ac, 0); perc(g, t, db(p.level || -28), 0.01, 0.12); chain(src(ac, 'pink', 281, t, t + 0.18), filt(ac, 'bandpass', 1500, 0.8), g, pan(ac, p.pan || 0), B.fx); };
  }
  const RUN_DUCK = [65.9, 66.9];   // the run: 0.6 s after the spark dies to the last of his feet on the lino
  function sound(S) {
    const tk = T.take, te = T.takeEnd, st0 = this && this.start != null ? this.start : 0;
    const tbS = tbFor(st0) + 0.001;   // the boom on the same frame as the first white frame
    // the kitchen: room tone, the gas carrying straight on from Q10 (-32) and rising across the take (about -24 by 'Sorry about your
    // house', -24 at the cut to the yard), the Extra's drone, a heart under the take
    S.bed('room', 0, te + 1.0, { level: -42 });
    S.bed('gas', 0, T.yard, { from: -32, to: -24 });
    S.bed('gas', T.yard, T.slam + 0.22, { from: -35, to: -34 });            // through the open door
    S.bed('gas', T.slam + 0.22, T.scrape - 0.03, { from: -45, to: -44 });  // the door shut on it
    // the run: every bed drops to near silence as he whirls (S.duck takes the room and music buses; the Extra's drone, on its own
    // bus, is ended under the same 0.2 s ramp), so the whoosh, his feet and the latch land clear; the yard's beds take over at the cut
    S.duck(RUN_DUCK[0], RUN_DUCK[1], 0.02);
    S.bed('drone7', 0, RUN_DUCK[0], { level: -40, seventh: -35, fi: 0.05, fo: 0.2 });                // carries straight across the cut from Q10
    S.bed('drone7', tk - 2, RUN_DUCK[0], { level: -35, seventh: -30, fi: 9, fo: 0.2 });              // and swells through the take
    S.bed('drone7', T.yard, T.scrape - 0.03, { level: -42, seventh: -38, fi: 0.4, fo: 0.05 });
    S.bed('heart', tk + 0.6, 38.4, { bpm: 74, bpmTo: 96, level: -24 });
    S.bed('heart', 42.0, te - 0.1, { bpm: 98, bpmTo: 132, level: -21 });
    S.bed('dread', 52.2, te, { level: -34, root: 55, fi: 3, fo: 0.05 });
    // before the take
    S.cue('swell', T.knobs - 0.6, { dur: 0.6, level: -30, f: 220 });
    S.cue('drip', T.cigLand, { level: -24 }); S.cue('drip', T.cigLand + 0.14, { level: -34 });
    S.cue('latch', T.lighter + 1.1, { level: -30 });
    S.cue('lub', T.sees + 0.12, { level: -14 });
    // in the take
    S.cue('Q11.step', T.step + 0.5, { level: -30, pan: -0.3 }); S.cue('Q11.step', T.step + 1.1, { level: -32, pan: -0.25 });
    S.cue('Q11.step', T.step + 1.0, { level: -34, pan: 0.4 });
    for (let i = 0; i < 9; i++) S.cue('Q11.wheel', T.raise + 0.9 + i * 0.47 + (i % 3) * 0.09, { level: -44 - (i % 2) * 3 });
    S.cue('Q11.wheel', T.strike + 0.12, { level: -30 });
    S.cue('spark', T.spark, { level: -15 });
    // the run
    S.cue('whoosh', te, { dur: 0.35, level: -26 });
    [0.3, 0.52, 0.74].forEach((d, i) => S.cue('Q11.step', te + d, { level: -22 - i * 2, pan: -0.3 }));
    S.cue('latch', te + 0.55, { level: -18 });
    // outside: night air, his feet on the steps, the slam, his breath
    S.bed('Q11.night', T.yard, T.scrape - 0.03, { level: -44, fi: 0.2, fo: 0.05 });
    [0.1, 0.28].forEach((d, i) => S.cue('Q11.step', T.yard + d, { level: -20 - i * 2, pan: 0.2 }));
    S.cue('thump', T.yard + 0.62, { level: -20, pan: 0.15 }); S.cue('Q11.step', T.yard + 0.85, { level: -22, pan: 0.1 });
    [1.25, 1.42, 1.58].forEach(d => S.cue('Q11.step', T.yard + d, { level: -22, pan: 0.2 }));
    S.cue('thump', T.slam + 0.22, { level: -10, pan: 0.15 }); S.cue('latch', T.slam + 0.25, { level: -22 });
    S.cue('Q11.sob', T.slam + 0.45, { dur: 0.5, level: -28 });
    S.cue('scrape', T.scrape, { n: 6, level: -22 });
    // the scrape sounds alone; then 0.4 s of digital silence: every bed is out before it and nothing sounds until the boom
    // THE BLAST (frame-snapped with the picture's first white frame)
    S.cue('boom', tbS, { level: -1 });
    S.cue('glass', tbS + 0.07, { level: -16, pan: -0.5 }); S.cue('glass', tbS + 0.16, { level: -18, pan: 0.45 }); S.cue('glass', tbS + 0.3, { level: -22, pan: -0.2 });
    S.cue('thump', tbS + 0.95, { level: -12, pan: -0.1 });
    S.cue('Q11.flare', tbS + 0.6, { dur: 0.9, level: -18 });
    // after the boom the yard settles toward Q12's trimmed level (Q12 opens on fire -23 and tinnitus -32 under its -8 dB trim); the
    // beds run to the last frame and stop on the hard cut (the engine's 4 ms edge fade), so Q12's take over without a dip
    S.bed('tinnitus', tbS + 0.12, tbS + 13, { level: -34, fi: 0.25, fo: 8 });
    S.bed('tinnitus', tbS + 6, T.dur, { level: -38, fi: 6, fo: 0.05 });
    S.bed('Q11.fire', tbS + 0.3, T.dur, { level: -22, near: 0.7, fi: 4.5, fo: 0.05 });   // was the shared 'fire' at -16
    S.bed('drone7', 71.5, T.hold + 0.5, { level: -44, seventh: -40, fi: 3, fo: 1.5 });   // the Extra never leaves: very low under the ringing
    // the roll: flare, over, pressed (gutter), the scramble, down, over, pressed (out)
    const fr = rollFire(T.roll + 0.5);
    S.cue('Q11.flare', T.roll + 0.03, { dur: 0.7, level: -18 });
    S.cue('whoosh', RL.thrash, { dur: 0.5, level: -26 }); S.cue('thump', RL.thrash + 0.3, { level: -22 });
    S.cue('Q11.smother', fr.press1, { level: -17, dur: 0.6 });
    S.cue('thump', RL.r1 - 0.05, { level: -24 });
    S.cue('Q11.cough', RL.r1 + 0.12, { n: 2, level: -24 });
    [0.15, 0.42, 0.66, 0.9, 1.08].forEach((d, i) => S.cue('Q11.scuff', RL.up + d, { level: -27 - (i % 2) * 2, pan: -0.15 }));
    S.cue('thump', RL.drop - 0.02, { level: -21 }); S.cue('whoosh', RL.drop + 0.05, { dur: 0.45, level: -28 });
    S.cue('Q11.smother', fr.press2, { level: -18, dur: 0.9 });
    S.cue('Q11.cough', COUGH_R[0] - 0.04, { n: 2, level: -23 }); S.cue('Q11.sob', RL.r2 + 1.1, { dur: 0.8, level: -27 });
    // the fence
    S.cue('Q11.cough', COUGH[0] - 0.05, { n: 3, level: -22 }); S.cue('Q11.cough', COUGH[1] - 0.05, { n: 2, level: -24 }); S.cue('Q11.sob', 80.9, { dur: 0.7, level: -26 });
    S.cue('boom', T.second, { level: -9 }); S.cue('glass', T.second + 0.1, { level: -24, pan: 0.6 });
    S.cue('Q11.cough', COUGH[2] - 0.05, { n: 2, level: -24 }); S.cue('Q11.sob', 83.5, { dur: 0.9, level: -27 });
    // watching (about 4 s)
    S.cue('Q11.sob', T.hold + 0.9, { dur: 0.9, level: -30 }); S.cue('Q11.sob', T.hold + 3.1, { dur: 0.8, level: -32 });
    S.bed('drone7', T.hold - 1, T.dur, { level: -38, seventh: -33, fi: 5, fo: 1.5 });
  }

  FILM.seq({ id: 'Q11', title: 'The lighter', dur: T.dur, letterbox, lines, sound, shots });
})();
