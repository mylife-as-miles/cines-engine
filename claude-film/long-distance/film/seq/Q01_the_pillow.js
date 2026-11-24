/* LONG DISTANCE · Q01 THE PILLOW (60 s) · S01, S02, A001–A006, L001–L006 · bedroom (foot, across, hand)
   The film's first image is its whole idea: his half of the bed lived in, her half untouched, and the phone lying on its long edge on
   the smooth pillow where her head would be, its back to us, its screen to him, its smooth peach light the only warm light in the room.
   He talks; we hear only the murmur. LATER is told by light: the windows across the street go out and the slats creep. "Goodnight."
   He does not hang up: his hand comes to rest over the phone the way you would touch a sleeping shoulder, and his eyes close.
   Tender, not pathetic; the clues sit in plain sight and nobody remarks on them.
   The phone is built in metres in the bedroom's own room and projected through each view's camera, so the foot, across and hand views
   agree. Him: RIG.head and RIG.hand (the set draws his body under the duvet). Characters on twos; the camera and the light on ones. */
(function () {
  'use strict';
  const O = window.OTM, W = O.W, H = O.H, clamp = O.clamp, lerp = O.lerp;
  const seg = FILM.seg, key = FILM.key, twos = FILM.twos, E = FILM.ease;
  const BR = () => window.SETS.bedroom;

  // ---------------------------------------------------------------- the phone in the room (metres)
  // On its long edge on the smooth pillow: the screen to his face, the back to her side of the room. It is turned a little toward the
  // foot of the bed and leans a little toward him, so every camera here sees its back and never its screen.
  // Sized as the film sizes every phone, about 0.7 of a head (these heads are B1's, 0.31 m on this room's pillows): 1.3 x the metal.
  const PH = { c: [0.30, 0.785, 1.875], yaw: 0.42, lean: 0.2, L: 0.1442 * 1.3, Wd: 0.0687 * 1.3, T: 0.0078 * 1.3 };
  const GEO = {};
  function phoneGeo(view) {
    if (GEO[view]) return GEO[view];
    const cam = BR().views[view].cam, th = PH.yaw, ph = PH.lean;
    const nh = [Math.cos(th), 0, -Math.sin(th)], a = [Math.sin(th), 0, Math.cos(th)];
    const n = [Math.cos(ph) * nh[0], Math.sin(ph), Math.cos(ph) * nh[2]], b = [-Math.sin(ph) * nh[0], Math.cos(ph), -Math.sin(ph) * nh[2]];
    const C = PH.c, P = (u, v, w) => cam.p(C[0] + a[0] * u + b[0] * v + n[0] * w, C[1] + a[1] * u + b[1] * v + n[1] * w, C[2] + a[2] * u + b[2] * v + n[2] * w);
    const hl = PH.L / 2, hw = PH.Wd / 2, ht = PH.T / 2;
    // the back's own corners as seen head-on with the camera island top left: the foot end's upper corner first
    const quad = [P(-hl, hw, ht), P(-hl, -hw, ht), P(hl, -hw, ht), P(hl, hw, ht)].map(p => [p[0], p[1]]);
    const f = P(0, 0, ht), bk = P(0, 0, -ht), k = cam.k(C[0], C[1], C[2]), s0 = P(0, 0, 0), s1 = P(0, 0, -0.05);
    return (GEO[view] = { quad, edge: [bk[0] - f[0], bk[1] - f[1]], facing: [(s1[0] - s0[0]) / (0.05 * k), (s1[1] - s0[1]) / (0.05 * k)], center: [s0[0], s0[1]], k });
  }
  const phoneParams = (view, extra) => { const g = phoneGeo(view); return Object.assign({ quad: g.quad, face: 'back', edge: g.edge, facing: g.facing, screen: 'app', env: '#8EA2CC', state: { clock: 'night1' }, shadow: { alpha: 0.55 } }, extra || {}); };

  // ---------------------------------------------------------------- the camera
  // a push about a fixed world point P (P stays where it is on the frame), zoom z
  function push(c, P, z) { c.camera({ x: P[0] - (P[0] - W / 2) / z, y: P[1] - (P[1] - H / 2) / z, zoom: z }); }
  // the world point A placed at the screen point B, zoom z
  function frame(c, A, B, z) { c.camera({ x: A[0] + (W / 2 - B[0]) / z, y: A[1] + (H / 2 - B[1]) / z, zoom: z }); }

  // ---------------------------------------------------------------- him
  // his head as each view sees it: lying on his side on his pillow, facing the phone. The across and hand views share B1's angles.
  const POSE = { across: { yaw: -0.42, pitch: 0.05, roll: -1.36 }, hand: { yaw: -0.42, pitch: 0.05, roll: -1.36 }, foot: { yaw: 1.18, pitch: 0.12, roll: -0.08 } };
  const headAt = view => { const a = BR().views[view].anchors, f = a.face, k = f[2]; return view === 'foot' ? { x: a.head[0] + 0.03 * k, y: a.head[1] - 0.005 * k, s: 0.31 * k } : { x: f[0] - 0.02 * k, y: f[1] - 0.01 * k, s: 0.31 * k }; };
  function light(view, tod, info, o) {
    o = o || {}; const L = info.light;
    return RIG.light(tod === 'later' ? 'later' : 'night', { phone: [L.x, L.y], phoneZ: o.z != null ? o.z : (view === 'foot' ? 0.25 : 0.9), phoneK: o.k != null ? o.k : (view === 'foot' ? 2.6 : 2.0) });
  }
  function head(c, view, tod, info, face, o) {
    o = o || {}; const at = headAt(view), t = c.t;
    // a blink is one drawing with the lids down; heavy lids don't blink (they are already most of the way there)
    const lids0 = face.lids == null ? 0.5 : face.lids, blink = face.blink !== false && lids0 >= 0.3 && RIG.blink(t, 5) < 0.5;
    const p = Object.assign({ neck: view === 'foot' ? 0.42 : 0.62, neckShade: 0.35, shadow: { dx: 0.035, dy: 0.035, alpha: 0.55 } }, POSE[view], face, {
      x: at.x, y: at.y + (o.breath || 0), s: at.s, light: light(view, tod, info), lids: blink ? 0.08 : lids0, alpha: o.alpha, res: o.res });
    delete p.blink;
    return RIG.head(c, 'him', p);
  }
  const breath = (t, amp, hz) => RIG.breath(t, amp, hz);

  // his arm, from under the duvet's edge to the phone: bare (the tee's sleeve stays under the duvet), the hand resting over the phone's
  // top edge with its fingers draped down the back. On the foot view the whole arm shows (two bones solved on the picture); across
  // the bed only the forearm comes out from under the turned edge, as in B1.
  function armSpec(S, Wr, l1, l2, bend) {
    const d = Math.hypot(S[0] - Wr[0], S[1] - Wr[1]), u = [(S[0] - Wr[0]) / d, (S[1] - Wr[1]) / d];
    let E2;
    if (d >= l1 + l2 - 1e-3) E2 = [Wr[0] + u[0] * l2 * d / (l1 + l2), Wr[1] + u[1] * l2 * d / (l1 + l2)];
    else { const a = (l2 * l2 - l1 * l1 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l2 * l2 - a * a)), m = [Wr[0] + u[0] * a, Wr[1] + u[1] * a]; E2 = [m[0] - u[1] * h * bend, m[1] + u[0] * h * bend]; }
    return { E: E2, fore: [E2[0] - Wr[0], E2[1] - Wr[1]], up: [S[0] - E2[0], S[1] - E2[1]], foreLen: Math.hypot(E2[0] - Wr[0], E2[1] - Wr[1]), upLen: Math.hypot(S[0] - E2[0], S[1] - E2[1]) };
  }
  const ARM = {
    // world px on each view. foot: the shoulder S where the arm leaves the duvet, the wrist, the bones' lengths (hand units), the elbow's
    // side. hand: the elbow E under the turned edge and the wrist (the forearm only). The swing turns about S or E.
    foot: { S: [838, 556], Wr: [1080, 450], l1: 1.35, l2: 1.18, bend: 1 },
    hand: { E: [1585, 290], Wr: [1105, 474] },
  };
  function arm(c, view, tod, info, o) {
    o = o || {}; const A = ARM[view], k = BR().views[view].anchors.phone[2], s = 0.211 * k, Wr = A.Wr;
    const L = light(view, tod, info, { z: 0.05, k: 1.7 }); L.phone = Object.assign({}, L.phone, { falloff: 2.0 });
    const p = { x: Wr[0], y: Wr[1], s, foreR: 0.17, light: L, shadow: { dx: 0.05, dy: 0.08, alpha: 0.55 } };
    if (A.E) Object.assign(p, { fore: [A.E[0] - Wr[0], A.E[1] - Wr[1]], foreLen: Math.hypot(A.E[0] - Wr[0], A.E[1] - Wr[1]) / s });
    else { const sp = armSpec(A.S, Wr, A.l1 * s, A.l2 * s, A.bend); Object.assign(p, { fore: sp.fore, foreLen: sp.foreLen / s, upperW: { dir: sp.up, len: sp.upLen / s, r: 0.24 } }); }
    return { pose: o.pose || 'rest', p, pivot: A.E || A.S };
  }
  // the duvet pulled up to his jaw, its edge turned over his shoulder (B1's piece, ported): it hides where the neck goes under, and the
  // phone's light warms its near edge. Cut once per view and size, kept.
  function duvetEdge(c, view, hd, info) {
    const k = hd.s / 354, nk = hd.proj(0, 0.66, -0.05), T = c.g.getTransform(), res = Math.ceil(Math.hypot(T.a, T.b) * 4) / 4;
    // his shoulder under it, tucked to the jaw (B1's proportions), running on into the set's own turned edge
    const pts = [[-34, -62], [36, -86], [128, -72], [214, -26], [208, 62], [70, 112], [-40, 96], [-74, 22]].map(([x, y]) => [x * k, y * k]);
    const bx = [Math.floor(nk[0] - 120 * k), Math.floor(nk[1] - 120 * k), Math.ceil(360 * k), Math.ceil(260 * k)], L = info.light;
    const cv = c.cache('Q01:edge:' + view + ':' + res + ':' + bx.join(','), g => {
      g.setTransform(res, 0, 0, res, -bx[0] * res, -bx[1] * res);
      const sh = GG.blob(pts.map(([x, y]) => [nk[0] + x, nk[1] + y]));
      const ep = GG.piece(g, sh, { fill: '#28314A', rough: 2.6 * k, seed: 72, tex: 0.6, kind: 'cloth', lift: [-4 * k, 8 * k], liftAlpha: 0.6, liftBlur: 9 * k });
      GG.crescent(g, ep, 2 * k, -9 * k, '#38445F', 0.9);
      const fold = (pp, a) => { g.save(); g.lineCap = 'round'; g.strokeStyle = 'rgba(10,13,22,' + a + ')'; g.lineWidth = 5 * k; const sp = GG.spline(pp.map(([x, y]) => [nk[0] + x * k, nk[1] + y * k]), false); g.stroke(sp); g.translate(-2 * k, -3 * k); g.strokeStyle = 'rgba(86,102,138,0.35)'; g.lineWidth = 2.2 * k; g.stroke(sp); g.restore(); };
      fold([[96, -66], [140, -12], [132, 52]], 0.55); fold([[10, 70], [60, 92], [120, 84]], 0.4);
      g.save(); g.clip(ep); GG.glow(g, L.x, L.y, 300 * k, '#FFB08A', 0.26); g.restore();
    }, Math.ceil(bx[2] * res), Math.ceil(bx[3] * res));
    c.g.drawImage(cv, bx[0], bx[1], bx[2], bx[3]);
  }

  // ---------------------------------------------------------------- the views
  // the foot of the bed: high, the pillow seam on the centre line. o: {later, zoom, face, faceB (the later face for the dissolve), hand}
  function foot(c, lt, o) {
    const v = BR().views.foot, z = o.zoom || 1, P = [960, 440];
    push(c, P, z);
    const later = o.later || 0, tod = later >= 1 ? 'later' : 'night';
    const s = { tod: later >= 1 ? 'later' : 'night', later, glow: 1 };
    v.back(c, lt, s);
    const info = PHONE.where(phoneParams('foot'), c);
    const br = breath(c.t, 0.8);
    if (o.faceB && later > 0) { head(c, 'foot', 'later', info, o.faceB, { breath: br }); if (later < 1) head(c, 'foot', 'night', info, o.face, { breath: br, alpha: 1 - later }); }
    else head(c, 'foot', tod, info, o.face, { breath: br });
    const A = o.hand ? armUnder(c, 'foot', tod, info, o.hand) : null;
    c.g.save(); c.g.translate(0, breath(c.t, 1.2)); v.front(c, lt, s); c.g.restore();
    drawPhone(c, 'foot', tod, info, A);
  }
  // across the bed from her side (B1). o: {zoom, P (the push's fixed point), res, face}
  function across(c, lt, o) {
    const v = BR().views.across, z = o.zoom || 1;
    if (o.at) frame(c, [520, 340], o.at, z); else push(c, o.P || [560, 470], z);
    const s = { tod: 'night', glow: 1, res: o.res || 1 };
    v.back(c, lt, s);
    const info = PHONE.where(phoneParams('across'), c);
    const hd = head(c, 'across', 'night', info, o.face, { breath: breath(c.t, 0.6) });
    c.g.save(); c.g.translate(0, breath(c.t, 1.4)); v.front(c, lt, s); duvetEdge(c, 'across', hd, info); c.g.restore();
    drawPhone(c, 'across', 'night', info, null);
    if (o.sheen) RIG.faceGlow(c, hd, { x: info.light.x, y: info.light.y, r: hd.s * 1.3, color: '#FFC5A0', alpha: o.sheen });
    return hd;
  }
  // the insert: the phone on the smooth pillow, much closer. o: {hand: {u (0 raised .. 1 at rest), pose}}
  function hand(c, lt, o) {
    const v = BR().views.hand;
    frame(c, [1010, 600], [975, 610], o.zoom || 1.22);
    const s = { tod: 'night', glow: 1 };
    v.back(c, lt, s);
    const info = PHONE.where(phoneParams('hand'), c);
    const hd = head(c, 'hand', 'night', info, o.face, { breath: breath(c.t, 0.8), res: 0.72 });
    const A = o.hand ? armUnder(c, 'hand', 'night', info, o.hand) : null;
    c.g.save(); c.g.translate(0, breath(c.t, 2)); v.front(c, lt, s); duvetEdge(c, 'hand', hd, info); c.g.restore();
    drawPhone(c, 'hand', 'night', info, A);
  }
  // his arm and hand, on the paper, before the duvet's turned edge (so the arm comes out from under it). h: {u: the swing (0 lifted ..
  // 1 at rest), swing (rad), pose}. The swing turns the whole cached sculpture about the shoulder, so the move costs no new sculpts.
  function armUnder(c, view, tod, info, h) {
    const A = arm(c, view, tod, info, h), sw = (1 - (h.u == null ? 1 : h.u)) * (h.swing || -0.42), S = A.pivot;
    const place = g => { g.translate(S[0], S[1]); g.rotate(sw); g.translate(-S[0], -S[1]); };
    c.g.save(); place(c.g); RIG.hand(c, 'him', A.pose, A.p); c.g.restore();
    return { A, place };
  }
  // the phone (gloss); where his hand is over it, the hand's own silhouette is cut out of the gloss so the paper hand shows through
  function drawPhone(c, view, tod, info, H2) {
    const pp = phoneParams(view);
    if (!H2) { PHONE.draw(c, pp); return; }
    const { A, place } = H2;
    PHONE.draw(c, Object.assign(pp, { under: false, maskShadow: { alpha: 0.45 },
      mask: m => { m.save(); place(m); RIG.hand(c, 'him', A.pose, Object.assign({}, A.p, { target: m, shadow: false })); m.restore(); } }));
  }

  // ---------------------------------------------------------------- the acting
  // the face across the scene (lids 0 shut .. 1 wide; smile; gaze to the phone); mouths from the takes, the murmur from the rig
  const LINES = [{ id: 'L001', at: 6.0 }, { id: 'L002', at: 9.0 }, { id: 'L003', at: 10.6 }, { id: 'L004', at: 27.0 }, { id: 'L005', at: 30.4 }, { id: 'L006', at: 33.6 }];
  const mouthAt = lt => RIG.mouthAt(LINES, lt);
  const GAZE = { across: [0.1, 0.35], foot: [0.2, 0.1], hand: [0.1, 0.35] };
  // Faces hold a few states per shot (a sculpted head costs memory for every distinct drawing): the lids and the smile change in steps
  // on the beats, the mouth follows the takes and the murmur.
  const step = (t, ks) => { let v = ks[0][1]; for (const k of ks) if (t >= k[0]) v = k[1]; return v; };
  function face(view, lt) {
    const t = twos(lt);
    const lids = step(t, [[0, 0.5], [14.4, 0.42], [22, 0.36], [26, 0.28], [30.9, 0.2], [36.4, 0.12], [38.8, 0.06], [43.6, 0.03], [45.0, 0]]);
    const smile = step(t, [[0, 0.25], [7.2, 0.375], [12.6, 0.5], [14.4, 0.5], [18.3, 0.625], [20.2, 0.5], [22, 0.375], [26, 0.25], [31.6, 0.375], [34.8, 0.375], [42, 0.25]]);
    let mouth = mouthAt(t);
    if (t >= 14.5 && t < 21.5) { mouth = RIG.murmur(t, 7); if (t >= 18.2 && t < 18.9) mouth = 0; }
    if (t >= 18.3 && t < 20.2) mouth = Math.min(mouth, 1);
    return { lids, smile, mouth, gaze: GAZE[view], blink: t < 22 };
  }

  FILM.seq({
    id: 'Q01', title: 'The pillow', dur: 60,
    lines: LINES.map(L => Object.assign({}, L)),
    sound(S) {
      S.bed('room_night', 0, 60, { level: -46 });
      S.bed('fridge_far', 0, 60, { level: -54 });
      S.bed('murmur', 14.5, 21.5, { level: -30 });            // his voice, wordless, under
      S.cue('laugh_phone', 18.2);                              // her soft laugh, dry and close, exactly where a laugh should be
      S.cue('streetcar_far', 24, { level: -50 });
      S.cue('duvet', 37);                                      // his arm coming out from under it
      S.cue('breath', 44);                                     // him, settling
    },
    shots: [
      { at: 0, name: 'black → fade in on the foot of the bed (room tone first)', fade: st => 1 - E.inOutSine(seg(st, 0.4, 3.0)),
        draw(c, st, lt) { foot(c, lt, { zoom: 1 + 0.021 * E.inOutSine(seg(lt, 0, 8.4)), face: face('foot', lt) }); } },
      { at: 3.0, name: 'foot: his half lived in, hers untouched, the phone on the smooth pillow (push)',
        draw(c, st, lt) { foot(c, lt, { zoom: 1 + 0.021 * E.inOutSine(seg(lt, 0, 8.4)), face: face('foot', lt) }); } },
      { at: 8.4, name: 'across (B1): he lies facing the phone, smiling',
        draw(c, st, lt) { across(c, lt, { zoom: 1.14 + 0.012 * E.inOutSine(seg(lt, 8.4, 14.4)), P: [520, 440], face: face('across', lt) }); } },
      { at: 14.4, name: 'across, closer: he talks; we hear only the murmur',
        draw(c, st, lt) { across(c, lt, { zoom: 1.55 + 0.025 * E.inOutSine(seg(lt, 14.4, 22)), at: [720, 360], res: 2, face: face('across', lt), sheen: 0.12 }); } },
      { at: 22.0, name: 'foot, later: the windows opposite go dark, the slats creep; the phone still glowing',
        draw(c, st, lt) { foot(c, lt, { later: E.inOutSine(seg(lt, 22.3, 23.3)), face: Object.assign(face('foot', 21.9), { mouth: 0, blink: false }), faceB: face('foot', lt) }); } },
      { at: 26.0, name: 'across, close on his face: his eyes are heavy',
        draw(c, st, lt) { across(c, lt, { zoom: 1.95 + 0.035 * E.inOutSine(seg(lt, 26, 36)), at: [790, 360], res: 2, face: face('across', lt), sheen: 0.16 }); } },
      { at: 36.0, name: 'hand: his hand comes to rest over the phone, the way you would touch a sleeping shoulder',
        draw(c, st, lt) { hand(c, lt, { face: face('hand', lt), hand: { u: E.weary(seg(twos(lt), 36.5, 40.2)), swing: 0.19 } }); } },
      { at: 42.0, name: 'foot, the same framing as 3.0: he closes his eyes; the glow does not dim',
        draw(c, st, lt) { foot(c, lt, { later: 1, zoom: 1 + 0.024 * E.inOutSine(seg(lt, 48, 60)), face: face('foot', lt), hand: { u: 1 } }); } },
    ],
  });
})();
