/* LONG DISTANCE · Q02 GOOD MORNING (26 s) · S03, A007–A010 · bathroom (glass, mirror), phone
   Cold white tile paper and a grey window. Two toothbrushes in a glass: he takes the blue one; the other is stiff and grey with dust,
   and nobody remarks on it. The phone, propped against the mirror in the empty half, is the warmest thing in the room. It lights up:
   "♥ Good morning." He types with a mouth full of foam, "Good morning. I love you.", and the answer is there before his thumb leaves
   the glass: "I love you." He smiles through the foam.
   The phone is built in metres against the set's mirror and projected through the set's cameras. His reflection is the rig's basin pose
   drawn through the set's mirror (v.inMirror). The thumb lands on the keys PHONE draws. Q07 repeats the mirror and the thread from here
   (FILM.lib.Q02.mirror, FILM.lib.Q02.insert), so the two mornings are the same mornings. */
(function () {
  'use strict';
  const O = window.OTM, W = O.W, H = O.H, clamp = O.clamp, lerp = O.lerp;
  const seg = FILM.seg, key = FILM.key, twos = FILM.twos, E = FILM.ease;
  const BA = () => window.SETS.bathroom;
  const MSG = PHONE.MSG;

  // ---------------------------------------------------------------- the phone, propped against the right-hand mirror (metres)
  // Portrait, standing on the shelf, its top leaning back on the mirror, the screen to the room. Sized as the film sizes phones.
  const PB = { x: 0.255, lean: 0.47, S: 1.15, shelf: 1.06, mirror: -0.13 };
  const GEO = {};
  function phoneGeo(view) {
    if (GEO[view]) return GEO[view];
    const cam = BA().views[view].cam, L = 0.1442 * PB.S, Wd = 0.0687 * PB.S, T = 0.0078 * PB.S, sl = Math.sin(PB.lean), cl = Math.cos(PB.lean);
    const up = [0, cl, sl], n = [0, sl, -cl], rt = [1, 0, 0];
    // the back rests on the mirror at the top; the bottom edge stands on the shelf
    const C = [PB.x, PB.shelf + (L / 2) * cl + (T / 2) * sl, PB.mirror - (T / 2) * cl - (L / 2) * sl - 0.004];
    const P = (u, v, w) => cam.p(C[0] + rt[0] * u + up[0] * v + n[0] * w, C[1] + rt[1] * u + up[1] * v + n[1] * w, C[2] + rt[2] * u + up[2] * v + n[2] * w);
    const quad = [P(-Wd / 2, L / 2, T / 2), P(Wd / 2, L / 2, T / 2), P(Wd / 2, -L / 2, T / 2), P(-Wd / 2, -L / 2, T / 2)].map(p => [p[0], p[1]]);
    const f = P(0, 0, T / 2), b = P(0, 0, -T / 2);
    return (GEO[view] = { quad, edge: [b[0] - f[0], b[1] - f[1]], center: [f[0], f[1]], k: cam.k(C[0], C[1], C[2]) });
  }

  // ---------------------------------------------------------------- the thread (A008–A010, verbatim through PHONE.MSG)
  const THREAD = { clock: 'morning', history: 'routine', steps: [
    { stamp: '07:12', at: 0 },
    { at: 7.0, her: MSG.goodMorning },                                   // A008
    { him: MSG.goodMorningLove, type: [10.2, 15.4], at: 15.8 },         // A009: typed with a mouth full of foam
    { at: 15.95, her: MSG.iLoveYou },                                    // A010: before his thumb leaves the glass
  ] };
  // what the phone shows on the shelf at time lt of a morning: dark, then the banner on the lock screen, then the thread
  function screenAt(lt, spec) {
    if (lt < spec.wake) return { screen: 'black', lit: false };
    if (lt < spec.thread) return { screen: 'banner', state: { text: spec.banner, in: seg(lt, spec.wake, spec.wake + 0.3), clock: spec.clock, wallpaper: 'abstract' } };
    return { screen: 'thread', state: PHONE.exchange(lt, spec.ex) };
  }

  // ---------------------------------------------------------------- the mirror: him at the basin, brushing, in the glass
  // The rig's basin pose, drawn through RIG.drawFigure with one change: its tee's crew band is cut at the jaw (it floats over the neck
  // as a loop), so a band is cut here instead where the tee's neckline is.
  const CREW = { type: 'paper', key: 'q02crew', box: [-0.6, 0.4, 0.6, 1.2], draw(pen) {
    const rc = RIG.COSTUME.tee.rib, hw = 0.3, y0 = 0.6, dip = 0.33, th = 0.055;
    const sh = pen.blob([[-hw - 0.02, y0, 1], [-hw * 0.7, y0 + dip * 0.6], [0, y0 + dip], [hw * 0.7, y0 + dip * 0.6], [hw + 0.02, y0, 1], [hw + 0.05, y0 + th * 0.7], [hw * 0.72, y0 + dip * 0.6 + th], [0, y0 + dip + th], [-hw * 0.72, y0 + dip * 0.6 + th], [-hw - 0.05, y0 + th * 0.7]]);
    const pth = pen.piece(sh, pen.col(rc), { seed: 445, kind: 'cloth', tex: 0.65, lift: [0.01, 0.02] }); pen.shade(pth, rc, { lit: 0.025, core: 0.03 }); } };
  function basin(c, p) {
    const ops = RIG.POSES.him.basin(p).ops.map(op => (op && op.key && /^col,/.test(op.key)) ? CREW : op);
    return RIG.drawFigure(c, { who: 'him', x: p.x, y: p.y, s: p.s, light: p.light, breath: RIG.breath(p.t, 2.2), ops, target: p.target });
  }
  // o: {screen: {...}, buzz, glow, gaze, smile, lids, foamBasin}
  const MIRROR_P = [960, 420];
  function mirror(c, lt, o) {
    const v = BA().views.mirror, s = { brush: 'out', glow: o.glow || 0, foam: !!o.foamBasin };
    c.camera({ x: W / 2, y: H / 2, zoom: 1 });
    v.back(c, lt, s);
    const g0 = phoneGeo('mirror'), lit = o.screen.lit !== false;
    // his reflection: the basin pose, facing us out of the mirror, greyed a step toward the glass by the set
    const r = v.anchors.reflection, hs = 0.245 * r[2], t = c.t;
    const L = RIG.light('bathroom', lit ? { phone: [g0.center[0], g0.center[1]], phoneZ: 1.6, phoneK: 0.45 } : {});
    v.inMirror(c, g => basin(c, { x: r[0] + 6, y: r[1] - 0.02 * r[2], s: hs, light: L, t, target: g, brush: o.brushing === false ? 0.25 : twos(t) * 2.2, foam: 1,
      face: { gaze: o.gaze || [0.1, 0.45], smile: o.smile || 0, lids: (o.lids == null ? 0.55 : o.lids) * RIG.blink(t, 9), yaw: o.yaw == null ? -0.05 : o.yaw, pitch: 0.12, mouth: 1 } }));
    v.front(c, lt, s);
    PHONE.draw(c, Object.assign({ quad: g0.quad, edge: g0.edge, env: '#C9D0D4', lightDir: [0.7, -0.6], shadow: { alpha: 0.35 }, buzz: o.buzz || 0, t: lt }, o.screen));
  }

  // ---------------------------------------------------------------- the thread, full frame, his thumb on the glass
  // The phone stands where it was, seen from his eyes: face on, filling the frame's height. Behind it, the bathroom out of focus (the
  // glass view, blurred once and kept). His hand steadies its lower corner; the thumb is drawn again over the gloss.
  const INS = { x: 958, y: 506, h: 930, roll: -0.025 };
  function background(c) {
    // centred inside the glass view's own frame (the phone stands at its right edge): the dusty brush falls out of focus at the left
    const v = BA().views.glass, z = 2.1, cx = 1330, cy = 590;
    return c.cache('Q02:insert:bg', g => {
      const c2 = Object.assign({}, c, { g, gl: g, em: null });
      g.setTransform(z, 0, 0, z, W / 2 - cx * z, H / 2 - cy * z);
      v.back(c2, 0, { brush: 'out' });
      g.setTransform(1, 0, 0, 1, 0, 0);
      const t = O.makeCanvas(W, H), tg = t.getContext('2d'); tg.filter = 'blur(9px)'; tg.drawImage(g.canvas, 0, 0); tg.filter = 'none';
      g.clearRect(0, 0, W, H); g.drawImage(t, 0, 0);
      // a shade of the shelf's front edge under the phone, and the cold light falling off toward the bottom
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(20,24,30,0.1)'); gr.addColorStop(0.75, 'rgba(20,24,30,0.05)'); gr.addColorStop(1, 'rgba(20,24,30,0.42)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }, W, H);
  }
  // the key a letter lands on, in screen points (the keyboard fully up); a period is the space bar's double tap
  function keyPt(ch) {
    const K = PHONE.KEYS, q = K[(ch || ' ').toLowerCase()] || K[' '], top = PHONE.SH - 290;
    const x = ch === ' ' || ch === '.' || !K[(ch || ' ').toLowerCase()] ? q.x + q.w * 0.62 : q.x + q.w / 2;
    return [x, top + q.y + q.h * 0.55];
  }
  // where the thumb's tip is at time t of a typing span, and whether it is down on the glass. spec: {text, type: [a, b], send, lift}
  function thumbPath(t, spec, sendPt) {
    const T = PHONE.typeTimes(spec.type[0], spec.type[1], spec.text), tw = twos(t), n = T.length;
    const pts = [...spec.text].map(keyPt);
    if (tw < T[0]) { const u = seg(tw, spec.type[0] - 0.7, T[0], 'inOutSine'); return { p: [lerp(pts[0][0] + 90, pts[0][0], u), lerp(PHONE.SH + 60, pts[0][1], u)], down: false, enter: u }; }
    let i = 0; while (i < n - 1 && T[i + 1] <= tw) i++;
    if (i === n - 1 && tw >= T[n - 1]) {
      // the last letter, then to the send button; it stays on the glass until after her answer arrives
      const u = seg(tw, T[n - 1] + 0.12, spec.send, 'inOutSine'), p = [lerp(pts[n - 1][0], sendPt[0], u), lerp(pts[n - 1][1], sendPt[1], u)];
      if (tw < spec.send) return { p, down: tw - T[n - 1] < 1 / 12 };
      const off = seg(tw, spec.lift, spec.lift + 0.7, 'inOutSine');
      return { p: [sendPt[0] + 60 * off, sendPt[1] + 520 * off * off], down: tw < spec.lift, exit: off };
    }
    const u = seg(tw, T[i] + 1 / 12, T[i + 1], 'inOutSine');
    return { p: [lerp(pts[i][0], pts[i + 1][0], u), lerp(pts[i][1], pts[i + 1][1], u)], down: tw - T[i] < 1 / 12 - 1e-6 };
  }
  // a thumb placed so its tip lands on a world point: the hand's own geometry is read once per pose from a scratch draw.
  // His right hand steadies the propped phone from behind (the glass hides the palm; the fingertips show round its left edge).
  const THUMB = p => RIG.HANDS.thumb(p);
  const TIP = {};
  const SCRATCH = (() => { let g = null; return () => g || (g = O.makeCanvas(4, 4).getContext('2d')); })();
  function thumbAt(c, tip, hp) {
    const k = JSON.stringify(hp);
    if (!TIP[k]) { const r = RIG.hand(c, 'him', THUMB, Object.assign({}, hp, { x: 0, y: 0, target: SCRATCH() })); TIP[k] = [r.thumb[0], r.thumb[1]]; }
    return { x: tip[0] - TIP[k][0], y: tip[1] - TIP[k][1] };
  }
  // o: {ex (the exchange spec), clock, text, type, send, lift, foam}
  function insert(c, lt, o) {
    c.reset();
    c.g.drawImage(background(c), 0, 0);
    const st = PHONE.exchange(lt, o.ex);
    const P = { x: INS.x, y: INS.y, h: INS.h, roll: INS.roll, screen: 'thread', state: st, t: lt, env: '#C9D0D4', lightDir: [0.7, -0.6], shadow: { alpha: 0.3, dx: 14, dy: 22, blur: 40 } };
    const info = PHONE.where(P, c);
    // the send button sits at (330, 465) points while the keyboard is up
    const tp = thumbPath(lt, o, [330, 465]), tip = info.pt(tp.p[0], tp.p[1]);
    // reach: three steps across the keyboard; tap lifts the thumb between letters (quantised: few sculptures)
    // the thumb carries the travel across the keys, so the hand shifts less: short reach on the left keys, long on the right
    const reach = tp.p[0] < 130 ? 0.15 : tp.p[0] < 245 ? 0.5 : 0.85, tap = tp.down ? 0 : 0.45;
    const L = RIG.light('bathroom', { phone: [info.center[0], info.center[1]], phoneZ: 0.3, phoneK: 0.35 });
    // a right hand holding it from behind: the fingers round the left edge (hidden by the glass but at their tips), the thumb over it
    const hp = { s: 0.88 * INS.h, rot: -0.75, reach, tap, light: L, res: 0.62, shadow: { dx: 0.02, dy: 0.04, alpha: 0.35 } };
    const at = thumbAt(c, tip, hp);
    PHONE.glow(c, { info, x: info.center[0], y: INS.y + INS.h * 0.5, r: INS.h * 0.75, sy: 0.35, k: 0.35 });
    RIG.hand(c, 'him', THUMB, Object.assign({}, hp, at));
    PHONE.draw(c, P);
    RIG.hand(c, 'him', THUMB, Object.assign({}, hp, at, { only: 'thumb', target: 'gl', shadow: { dx: 0.01, dy: 0.025, alpha: 0.3 } }));
    if (o.foam) foamFlecks(c, at, hp);
    return info;
  }
  // toothpaste foam on his thumb's knuckle and on the shelf at the frame's edge (cut paper, never pure white)
  function foamFlecks(c, at, hp) {
    const cv = c.cache('Q02:foam', g => {
      const r = O.rng('q02foam');
      for (let i = 0; i < 9; i++) { const x = 40 + r() * 160, y = 30 + r() * 60, rr = 6 + r() * 16; const p = GG.blob([[x - rr, y], [x - rr * 0.3, y - rr * 0.8], [x + rr * 0.6, y - rr * 0.7], [x + rr, y + rr * 0.1], [x + rr * 0.2, y + rr * 0.7], [x - rr * 0.7, y + rr * 0.5]]);
        const pp = GG.piece(g, p, { fill: '#D2D7D7', rough: 0.8, seed: 900 + i, tex: 0.35, kind: 'paper', lift: [2, 3], liftAlpha: 0.35, liftBlur: 3 }); GG.crescent(g, pp, -2, -2, '#E4E6E3', 0.8); }
    }, 240, 120);
    c.g.drawImage(cv, W - 300, H - 110);
  }

  // ---------------------------------------------------------------- the glass: two toothbrushes, his hand takes the blue one
  function glass(c, lt) {
    const v = BA().views.glass;
    c.camera({ x: W / 2, y: H / 2, zoom: 1 + 0.004 * lt });
    const t = twos(lt);
    // his hand: in from the lower left (1.2–1.9), closes on the handle (1.9–2.1), lifts it clear and away (2.1–3.0)
    const lift = key(t, [[0, 0], [2.08, 0], [2.55, 0.55, 'inOutSine'], [3.05, 1, 'inQuad']]);
    v.back(c, lt, { lift, glow: 0 });
    const gq = phoneGeo('glass');
    PHONE.draw(c, { quad: gq.quad, edge: gq.edge, screen: 'black', lit: false, env: '#C9D0D4', lightDir: [0.8, -0.5], shadow: { alpha: 0.3 } });
    if (t < 1.1 || t > 3.2) return;
    const b = v.brushAt({ lift }), k = 2809, s = 0.19 * k * 1.02;
    const close = t < 1.92 ? 0 : t < 2.0 ? 0.5 : 1;
    const hp = { s, close, light: RIG.light('bathroom'), fore: [-0.55, 0.85], foreLen: 2.6, shadow: { dx: 0.03, dy: 0.05, alpha: 0.4 } };
    // the grip's offset from the wrist for this pose (scratch draw)
    const kk = 'g' + JSON.stringify(hp);
    if (!TIP[kk]) { const r = RIG.hand(c, 'him', 'take', Object.assign({}, hp, { x: 0, y: 0, target: SCRATCH() })); TIP[kk] = r.grip; }
    // he takes it by the handle above the rim, about two thirds up
    const grip = [lerp(b.base[0], b.tip[0], 0.6), lerp(b.base[1], b.tip[1], 0.6)], g0 = [grip[0] - TIP[kk][0], grip[1] - TIP[kk][1]];
    const from = [-260, 1240], u = seg(t, 1.1, 1.92, 'outCubic');
    const at = t < 1.92 ? [lerp(from[0], g0[0], u), lerp(from[1], g0[1], u)] : g0;
    RIG.hand(c, 'him', 'take', Object.assign({}, hp, { x: at[0], y: at[1] }));
  }

  const MORNING = { wake: 7.0, thread: 9.5, banner: MSG.goodMorning, clock: 'morning', ex: THREAD };
  const def = FILM.seq({
    id: 'Q02', title: 'Good morning', dur: 26,
    setup() { PHONE.prepare(['abstract']); },
    sound(S) {
      S.bed('bathroom', 0, 26, { level: -44 });
      S.bed('tap', 0.5, 4.0, { level: -34 });                                  // the tap running
      S.bed('brushing', 5.0, 9.9, { level: -32 }); S.bed('brushing', 16.6, 26, { level: -32 });   // he stops to type
      S.cue('buzz_glass', 7.0);                                                // the phone vibrating against the mirror
      PHONE.typeTimes(10.2, 15.4, MSG.goodMorningLove).forEach(t => S.cue('type', t, { level: -40 }));   // soft taps, one a letter
      S.cue('send', 15.8);
      S.cue('receive', 15.95);
    },
    shots: [
      { at: 0, name: 'glass: two toothbrushes; his hand takes the blue one, the other stiff and grey with dust', draw(c, st, lt) { glass(c, lt); } },
      { at: 4.5, name: 'mirror: brushing; at 7.0 the phone lights up, "♥ Good morning."',
        draw(c, st, lt) { const lit = lt >= 7.0, t = twos(lt);
          mirror(c, lt, { screen: screenAt(lt, MORNING), buzz: lt >= 7.0 && lt < 7.45 ? 1 : 0, glow: lit ? E.outCubic(seg(lt, 7.0, 7.3)) : 0,
            gaze: key(t, [[4.5, [0.05, 0.5]], [7.25, [0.05, 0.5]], [7.5, [0.1, 0.4]]]), smile: key(t, [[7.6, 0], [8.4, 0.3]]), lids: key(t, [[4.5, 0.42], [7.2, 0.42], [7.4, 0.52]]), yaw: key(t, [[7.3, -0.05], [7.8, 0.2]]) }); } },
      { at: 9.5, name: 'phone: the thread; he types with a mouth full of foam, "Good morning. I love you."; "I love you." before his thumb lifts',
        draw(c, st, lt) { insert(c, lt, { ex: THREAD, text: MSG.goodMorningLove, type: [10.2, 15.4], send: 15.8, lift: 16.35, foam: true }); } },
      { at: 17.5, name: 'mirror: he smiles through the foam; the dusty brush in its glass in the empty half',
        draw(c, st, lt) { const t = twos(lt);
          mirror(c, lt, { screen: screenAt(lt, MORNING), glow: 1, foamBasin: true, gaze: key(t, [[17.5, [0.1, 0.4]], [20.5, [0.1, 0.4]], [21.2, [0.02, 0.5]]]), smile: key(t, [[17.5, 0.42], [20, 0.55], [23, 0.36]]), lids: 0.5, yaw: key(t, [[17.5, 0.2], [21, 0.2], [21.7, -0.04]]) }); } },
    ],
  });
  // shared with Q07: the same mirror and the same thread, a day later
  def.mirror = mirror; def.insert = insert; def.screenAt = screenAt; def.phoneGeo = phoneGeo;
})();
