/* LONG DISTANCE · Q02 GOOD MORNING (21.5 s) · S03, A007–A010 · bathroom (glass, mirror), phone
   Cold white tile paper and a grey window. Two toothbrushes in a glass: he takes the blue one; the other is stiff and grey with dust,
   and nobody remarks on it. The phone, propped against the mirror in the empty half, is the warmest thing in the room. It lights up:
   "♥ Good morning." He types with a mouth full of foam, "Good morning. I love you.", and the answer is there before his thumb leaves
   the glass: "I love you." He smiles through the foam.
   The phone is built in metres against the set's mirror and projected through the set's cameras. In the mirror shots he stands at the
   basin between us and the glass: his back in the foreground (the rig's back view), his reflection beyond (the rig's basin pose drawn
   through the set's mirror, v.inMirror). In the thread insert he holds the phone in the rig's phone grip, and his thumb is aimed at the
   very keys PHONE draws. Q07 repeats the mirror and the thread from here (FILM.lib.Q02.mirror, FILM.lib.Q02.insert), so the two
   mornings are the same mornings. */
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
  // only this morning: nothing above her "Good morning." but the time, so the exchange plays once, as it happens
  const THREAD = { clock: 'morning', history: [], steps: [
    { stamp: '07:12', at: 0 },
    { at: 7.0, her: MSG.goodMorning },                                   // A008
    { him: MSG.goodMorningLove, type: [10.2, 15.4], at: 15.8, keyboard: [9.75, 99] },   // A009: typed with a mouth full of foam (the keyboard stays up)
    { at: 15.95, her: MSG.iLoveYou },                                    // A010: before his thumb leaves the glass
  ] };
  // what the phone shows on the shelf at time lt of a morning: dark, then the banner on the lock screen, then the thread
  function screenAt(lt, spec) {
    if (lt < spec.wake) return { screen: 'black', lit: false };
    if (lt < spec.thread) return { screen: 'banner', state: { text: spec.banner, in: seg(lt, spec.wake, spec.wake + 0.3), clock: spec.clock, wallpaper: 'abstract' } };
    return { screen: 'thread', state: Object.assign(PHONE.exchange(lt, spec.ex), { keyboard: 0 }) };   // put down: the keyboard gone
  }

  // ---------------------------------------------------------------- the mirror: him at the basin, brushing; his back and his reflection
  // o: {screen: {...}, buzz, glow, gaze, smile, lids, yaw, foamBasin}. yaw is his reflection's (+ toward the phone); his real head
  // turns the same way, seen from behind (pi - yaw).
  function mirror(c, lt, o) {
    const v = BA().views.mirror, s = { brush: 'out', glow: o.glow || 0, foam: !!o.foamBasin };
    c.camera({ x: W / 2, y: H / 2, zoom: 1 });
    v.back(c, lt, s);
    const g0 = phoneGeo('mirror'), lit = o.screen.lit !== false, t = c.t, ph = twos(t) * 2.2;
    const yaw = o.yaw == null ? -0.05 : o.yaw, lids = (o.lids == null ? 0.55 : o.lids) * RIG.blink(t, 9);
    // his reflection: the basin pose, facing us out of the mirror, greyed a step toward the glass by the set
    const r = v.anchors.reflection;
    const L = RIG.light('bathroom', lit ? { phone: [g0.center[0], g0.center[1]], phoneZ: 1.6, phoneK: 0.45 } : {});
    v.inMirror(c, g => RIG.draw(c, 'him', 'basin', { x: r[0] + 6, y: r[1] - 0.02 * r[2], s: 0.245 * r[2], light: L, t, target: g, brush: ph, foam: 1,
      face: { gaze: o.gaze || [0.1, 0.45], smile: o.smile || 0, lids, yaw, pitch: 0.12, mouth: 1 } }));
    v.front(c, lt, s);
    // his real back at the basin, nearer us and out of the window's light: the brushing arm in front of him, so only its forearm shows
    // rising past his shoulder to his mouth, working with the stroke
    const b = v.anchors.back, dx = Math.sin(ph * Math.PI * 2) * 0.04;
    // (a little left of the honest spot, as if the camera stood a step right, so his reflection's face clears the back of his head)
    RIG.draw(c, 'him', 'stand', { view: 'back', costume: 'tee', x: b[0] - 20, y: b[1] + 4, s: 0.245 * b[2], t, crop: 3.4,
      light: RIG.light('bathroom', { keyK: 0.55, amb: '#5E646C' }),
      armL: { E: [-1.05 + dx, 1.7], W: [-0.35 + dx, 0.5], hand: 'brush', behind: true }, armR: { a1: 0.06, a2: 0.12, hand: 'relax' },
      face: { yaw: Math.PI - yaw, pitch: 0.12 } });
    PHONE.draw(c, Object.assign({ quad: g0.quad, edge: g0.edge, env: '#C9D0D4', lightDir: [0.7, -0.6], shadow: { alpha: 0.35 }, buzz: o.buzz || 0, t: lt }, o.screen));
  }

  // ---------------------------------------------------------------- the thread, full frame, in his hand
  // He has taken the phone off the shelf: it sits in the rig's phone grip (his right hand, the fingertips round its left edge, the palm
  // behind it), seen from his eyes, the bathroom out of focus behind (the glass view, blurred once and kept). Only the thumb moves.
  // The grip's own thumb sweeps the middle of the screen; the keys are lower, level with the palm, so the thumb's angles are solved
  // here for each key with the rig's own thumb bones (handBones) and its basis, and drawn as the rig's thumb pose with that aim.
  const GRIP = { x: 1299, y: 770, s: 903, rot: -0.05 };            // the wrist (world px), the hand's length (px), its turn: the phone lands centred
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
      // the cold light falling off toward the bottom, where his hand is
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(20,24,30,0.1)'); gr.addColorStop(0.75, 'rgba(20,24,30,0.05)'); gr.addColorStop(1, 'rgba(20,24,30,0.42)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }, W, H);
  }
  // the hand's frame: hand units to world px, as RIG.hand places the pose (its basis turned by rot)
  function handFrame(basis, rot, s, x, y) {
    const cr = Math.cos(rot), sr = Math.sin(rot), R3 = v => [v[0] * cr - v[1] * sr, v[0] * sr + v[1] * cr, v[2]], M = GG.basisM(R3(basis.x), R3(basis.z));
    return l => [x + (M[0][0] * l[0] + M[0][1] * l[1] + M[0][2] * l[2]) * s, y + (M[1][0] * l[0] + M[1][1] * l[1] + M[1][2] * l[2]) * s];
  }
  // the thumb's tip for thumb angles [th, ph, f1, f2], in hand units: the rig's thumb bones (film/rig.js handBones), step for step
  function thumbTip(tp) {
    let P = [0.12, -0.115, -0.035]; const [th, ph, f1, f2] = tp, Ls = [0.17, 0.13, 0.11];
    let d = [Math.cos(th) * Math.cos(ph), -Math.sin(th) * Math.cos(ph), -Math.sin(ph)]; const l = Math.hypot(d[1], d[0]) || 1, k = [d[1] / l, -d[0] / l, 0];
    const rot = (v, a) => { const c = Math.cos(a), s = Math.sin(a), dt = k[0] * v[0] + k[1] * v[1], cr = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]]; return v.map((vi, i) => vi * c + cr[i] * s + k[i] * dt * (1 - c)); };
    [0, f1, f2].forEach((a, i) => { d = rot(d, a); P = P.map((v, j) => v + d[j] * Ls[i]); });
    return P;
  }
  // the thumb's angles that put its tip on a world point (a coarse grid, so neighbouring targets share one sculpture), kept per target
  // A lifted thumb (off the glass, risen toward us) is solved to the same point from higher up, so it hovers over its key.
  const AIM = {};
  function aim(T, F, up) {
    const key = Math.round(T[0] / 4) + ',' + Math.round(T[1] / 4) + (up ? 'u' : ''); if (AIM[key]) return AIM[key];
    const ph0 = up ? aim(T, F, false)[1] + 0.2 : 0.3;
    let best = null;
    for (let th = -1.6; th <= 1.6001; th += 0.05) for (let ph = ph0; ph <= Math.max(ph0, 1.3) + 0.01; ph += 0.2) for (let f1 = 0; f1 <= 1.501; f1 += 0.1) {
      const tp = [+th.toFixed(2), +ph.toFixed(1), +f1.toFixed(1), +(f1 * 0.8).toFixed(2)], w = F(thumbTip(tp));
      const d = Math.hypot(w[0] - T[0], w[1] - T[1]) + f1 * 6 + ph * 4;                  // the least bent thumb that lands
      if (!best || d < best[0]) best = [d, tp];
    }
    return (AIM[key] = best[1]);
  }
  const THUMB = tp => p => Object.assign(RIG.HANDS.thumb(p), tp ? { thumb: tp } : {});
  // the key a letter lands on, in screen points (the keyboard fully up); the space bar for a space and the period
  function keyPt(ch) {
    const K = PHONE.KEYS, q = K[(ch || ' ').toLowerCase()];
    if (!q || ch === ' ') { const sp = K[' ']; return [sp.x + sp.w * 0.62, PHONE.SH - 290 + sp.y + sp.h * 0.55]; }
    return [q.x + q.w / 2, PHONE.SH - 290 + q.y + q.h * 0.55];
  }
  // where the thumb is at time t (screen points) and whether it is down on the glass, on twos: down on each letter for one drawing,
  // then lifted over the next; after the last letter, to the send button; it stays there until after her answer, then rests at the
  // phone's right edge. spec: {text, type: [a, b], send, lift}
  const REST = [348, 520], SEND = [330, 465];
  function thumbAt(t, spec) {
    // (the same clock as PHONE.exchange's, so the thumb is down on the drawing where the key's balloon shows)
    const T = PHONE.typeTimes(spec.type[0], spec.type[1], spec.text), tw = twos(t) + 2e-4, n = T.length, pts = [...spec.text].map(keyPt);
    if (tw < T[0] - 0.25) return { p: REST, down: false };
    if (tw < T[0]) return { p: pts[0], down: false };
    let i = 0; while (i < n - 1 && T[i + 1] <= tw) i++;
    if (tw - T[i] < 1 / 12 - 1e-6) return { p: pts[i], down: true };
    if (i < n - 1) { const u = seg(tw, T[i] + 1 / 12, T[i + 1]); return { p: u < 0.5 ? pts[i] : pts[i + 1], down: false }; }
    if (tw < spec.send - 0.17) return { p: SEND, down: false };
    if (tw < spec.lift) return { p: SEND, down: true };
    return { p: REST, down: false };
  }
  // o: {ex (the exchange spec), text, type, send, lift, foam}
  function insert(c, lt, o) {
    c.reset();
    c.g.drawImage(background(c), 0, 0);
    // the keyboard stays up, so the newest message sits above the field and clear of his fingertips; it is there at once (A010
    // "Instantly"), never rising from under the field
    const st = Object.assign(PHONE.exchange(lt, o.ex), { arrive: 1 }), base = RIG.HANDS.thumb({}), F = handFrame(base.basis, GRIP.rot, GRIP.s, GRIP.x, GRIP.y);
    const pc = F(base.grip), ang = GRIP.rot, h = base.phoneSize[1] * GRIP.s;
    const P = { x: pc[0], y: pc[1], h, roll: ang, screen: 'thread', state: st, t: lt, env: '#C9D0D4', lightDir: [0.7, -0.6] };
    const info = PHONE.where(P, c);
    const L = RIG.light('bathroom', { phone: [info.center[0], info.center[1]], phoneZ: 0.3, phoneK: 0.35 });
    const hp = { x: GRIP.x, y: GRIP.y, s: GRIP.s, rot: GRIP.rot, light: L, res: 0.62 };
    const ta = thumbAt(lt, o), thumb = aim(info.pt(ta.p[0], ta.p[1]), F, !ta.down);
    PHONE.glow(c, { info, x: info.center[0], y: pc[1] + h * 0.5, r: h * 0.75, sy: 0.35, k: 0.35 });
    RIG.hand(c, 'him', 'thumb', Object.assign({ noThumb: true, shadow: { dx: 0.02, dy: 0.04, alpha: 0.35 } }, hp));                       // the palm and fingers, behind the phone
    PHONE.draw(c, P);
    RIG.hand(c, 'him', 'thumb', Object.assign({ noThumb: true, only: 'dist', target: 'gl', shadow: { alpha: 0.28 } }, hp));               // the fingertips round its far edge
    const sh = ta.down ? { dx: 0.01, dy: 0.02, alpha: 0.32 } : { dx: 0.025, dy: 0.05, alpha: 0.2 };                                     // its shadow on the glass: further off when lifted
    RIG.hand(c, 'him', THUMB(thumb), Object.assign({ only: 'thumb', target: 'gl', shadow: sh }, hp));
    if (o.foam) foamFlecks(c);
    return info;
  }
  // toothpaste foam on his thumb's knuckle and on the shelf at the frame's edge (cut paper, never pure white)
  function foamFlecks(c) {
    const cv = c.cache('Q02:foam', g => {
      const r = O.rng('q02foam');
      for (let i = 0; i < 9; i++) { const x = 40 + r() * 160, y = 30 + r() * 60, rr = 6 + r() * 16; const p = GG.blob([[x - rr, y], [x - rr * 0.3, y - rr * 0.8], [x + rr * 0.6, y - rr * 0.7], [x + rr, y + rr * 0.1], [x + rr * 0.2, y + rr * 0.7], [x - rr * 0.7, y + rr * 0.5]]);
        const pp = GG.piece(g, p, { fill: '#D2D7D7', rough: 0.8, seed: 900 + i, tex: 0.35, kind: 'paper', lift: [2, 3], liftAlpha: 0.35, liftBlur: 3 }); GG.crescent(g, pp, -2, -2, '#E4E6E3', 0.8); }
    }, 240, 120);
    c.g.drawImage(cv, 40, H - 112);
  }

  // ---------------------------------------------------------------- the glass: two toothbrushes, his hand takes the blue one
  // the grip's offset from the wrist for a hand pose, read once from a scratch draw
  const TIP = {};
  const SCRATCH = (() => { let g = null; return () => g || (g = O.makeCanvas(4, 4).getContext('2d')); })();
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
    id: 'Q02', title: 'Good morning', dur: 21.5,
    setup() { PHONE.prepare(['abstract']); },
    sound(S) {
      S.bed('bathroom', 0, 21.5, { level: -44 });
      S.bed('tap', 0.5, 4.0, { level: -34 });                                  // the tap running
      S.bed('brushing', 5.0, 9.9, { level: -32 }); S.bed('brushing', 16.8, 21.5, { level: -32 });   // he stops to type
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
      { at: 17.5, name: 'mirror: he smiles through the foam; the dusty brush in its glass in the empty half (hard cut at 21.5)',
        draw(c, st, lt) { const t = twos(lt);
          mirror(c, lt, { screen: screenAt(lt, MORNING), glow: 1, foamBasin: true, gaze: key(t, [[17.5, [0.1, 0.4]], [19.4, [0.1, 0.4]], [19.9, [0.02, 0.5]]]), smile: key(t, [[17.5, 0.42], [18.8, 0.55], [21.5, 0.45]]), lids: 0.5, yaw: key(t, [[17.5, 0.2], [19.3, 0.2], [20.0, -0.04]]) }); } },
    ],
  });
  // shared with Q07: the same mirror and the same thread, a day later
  def.mirror = mirror; def.insert = insert; def.screenAt = screenAt; def.phoneGeo = phoneGeo;
})();
