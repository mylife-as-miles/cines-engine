/* AUTOPILOT · Q10 · 5:37 (62 s) · S16–S18, A062–A074, L036–L039
   5:37 in the corner of his laptop; the final email sent with its chime; the lid shut, the reflected office folding away.
   Priya in her coat across a half-empty office. The sweep: bag, keys, wallet and mug arranging themselves in his hands as
   they did that morning (an insert built here, at his desk, in the evening light). The car park in the low sun, every
   windscreen copper, seen through the lobby door's glass as he walks up the aisle. The driver's door opened on a dense
   wave of trapped heat; he recoils; a pause (the smell is only a pause, nothing drawn); he looks down at the empty mug,
   checks the passenger footwell, "Jesus." The windows down, the ignition, the vents' cough; the drive home through copper
   traffic with the radio low; he turns it down another notch as the presenter is cut off; the mirror holds the road behind.
   Restraint: the back seat is never seen; his car's rear glass is a copper mirror (the car park set); the rear-view mirror
   shows only the road behind (the car set's default). Characters animate on twos; the camera on ones. Caches 'Q10|'. */
(function () {
  'use strict';
  const W = 1920, H = 1080, TAU = Math.PI * 2;
  const { clamp, lerp, seg, key, twos } = FILM, E = FILM.ease, rgba = OTM.rgba;
  const deg = d => d * Math.PI / 180;
  const breath = t => (twos(t) * 0.25) % 1;
  const pose = (t, ks) => RIG.key(twos(t), ks);
  const DAN = { outfit: 'office', collar: 'straight' };
  const cam = o => { const z = Math.max(1, o.zoom || 1), x = o.x == null ? W / 2 : o.x, y = o.y == null ? H / 2 : o.y;
    return Object.assign({}, o, { zoom: z, x: clamp(x, W / 2 / z, W - W / 2 / z), y: clamp(y, H / 2 / z, H - H / 2 / z) }); };
  function stillFig(c, name, who, p, opts, box, into, face) {
    const [x0, y0, w, h] = box, k = 1.5;
    const cv = c.cache('Q10|fig|' + name, g => { g.scale(k, k); g.translate(-x0, -y0); (face ? RIG.face : RIG.draw)(g, who, p, opts); }, Math.ceil(w * k), Math.ceil(h * k));
    (into || c.g).drawImage(cv, x0, y0, w, h);
  }
  const HG = {}, scratchG = () => FILM.cache('Q10|scratch-hand', () => {}, 8, 8).getContext('2d');
  function handGeom(p) { const k = JSON.stringify(p); if (!HG[k]) { const r = RIG.hand(scratchG(), 'daniel', Object.assign({}, p, { at: [0, 0] }), {}); HG[k] = { tips: r.tips, thumb: r.thumb }; } return HG[k]; }
  const office = () => SETS.office.views;

  // ---------- S16 · the office, early evening ----------
  function laptopShot(c, st, lt) {
    const v = office().laptop, A = v.anchors;
    // close on the corner's 5:37 to begin with, easing back to the whole screen; sent; the lid shuts
    const u = seg(lt, 1.7, 4.5, E.inOutSine), z = lerp(2.1, 1.0, u) + (1 - u) * lt * 0.02;
    c.camera(cam({ x: lerp(A.clock[0] - 60, 960, u), y: lerp(A.clock[1] + 60, 540, u), zoom: z }));
    const s = { wake: 1, content: lt < 4.6 ? 'email' : 'sent', clock: '5:37', tod: 'evening', lid: seg(lt, 5.8, 7.2, 'inOutCubic'),
      reflect: (g, R) => { const at = [R.x, R.y - 40], sz = 560; stillFig(c, 'laptop-face', 'daniel', Object.assign({ at, size: sz, view: 'front', face: 'tired' }, DAN), { light: R.light, exposure: 0.45 + 0.5 * R.lit }, [at[0] - 1.4 * sz, at[1] - 1.0 * sz, 2.8 * sz, 2.6 * sz], g, true); } };
    v.back(c, lt, s); v.front(c, lt, s);
  }
  function deskEvening(c, st, lt) {
    const v = office().desk, a = v.anchors, g = c.g, s = { tod: 'evening', laptop: 'closed', empty: true, props: false };
    c.camera(cam({ zoom: 1.0 }));
    v.back(c, lt, s);
    // Daniel at his shut laptop looks across the half-empty office; Priya, in her coat, stops on her way out
    const t = twos(lt);
    const D = pose(t, [
      [8.0, { head: { turn: -0.35, nod: 0.12 }, face: 'tired', lid: 0.5 }],
      [9.2, { head: { turn: 0.3, nod: 0.02 }, face: 'tired', lid: 0.42 }],
      [10.6, { head: { turn: 0.38, nod: 0.06 }, face: 'tired', smile: 0.12 }],
      [11.6, { head: { turn: 0.36, nod: 0.1 }, face: 'smile', smile: 0.25, lid: 0.5 }],
      [12.8, { head: { turn: -0.1, nod: 0.2 }, face: 'tired', smile: 0.05 }]]);
    RIG.draw(g, 'daniel', Object.assign({ at: a.daniel.seat, scale: a.daniel.scale, view: 'three', facing: 1, body: 'sit', seat: 0.47, breath: breath(lt), armR: 'desk', armL: 'lap' }, DAN, D), { light: v.light, ambient: '#7A6E66', ambientK: 0.1 });
    v.props(c, lt, s);
    // her path in front of the desk: in from the right, a stop beside him, then on and out to the left
    const pf = a.priyaFront, stopX = 1330;
    const x = lt < 10.0 ? lerp(pf.from[0], stopX, seg(lt, 8.0, 9.4, E.outQuad)) : lerp(stopX, pf.to[0], seg(lt, 11.4, 13.4, E.inQuad));
    const yAt = xx => lerp(pf.from[1], pf.to[1], (xx - pf.from[0]) / (pf.to[0] - pf.from[0]));
    const walking = (lt > 8.0 && lt < 9.4) || lt > 11.4, ph = (twos(lt) * 1.1) % 1;
    const Pp = { at: [x, yAt(x)], scale: pf.scale, body: walking ? 'walk' : 'stand', phase: walking ? ph : 0, outfit: 'coat', view: lt < 11.4 ? 'three' : 'profile', facing: -1, hold: { l: 'bag' }, armL: 'bag', face: 'warm',
      head: { turn: lt > 8.6 && lt < 11.6 ? -0.5 : 0, nod: 0.02 }, smile: lt > 10.8 ? 0.7 : 0.3 };
    if (x > -300 && x < 2300) RIG.draw(g, 'priya', Pp, { light: v.light, ambient: '#7A6E66', ambientK: 0.08 });
    v.front(c, lt, s);
  }

  // ---------- the sweep: bag, keys, wallet, mug, arranging themselves in his hands (his desk, the evening light) ----------
  // Staged as Q04's sweep was (C1's camera at the counter, the window glass behind, the hands lifting things up and out):
  // frontal at desk height, the meeting room's glass partition behind the desk (the dark room through it, the peach window
  // behind him reflected in it, its frosted band). The shut laptop stands where the phone stood that morning; the travel
  // mug; the keys and the wallet in front; the bag at the right. The right hand takes the mug up and out of the top of frame,
  // the left scoops the keys and then the wallet, the right comes back for the bag. Then the empty desk and the mug's ring.
  // Objects are drawn here and carried rigidly under the fingers of RIG hands that hold nothing of their own.
  const K = 2000, PEACH = '#F3C9A0';
  const SW = {
    mug: { side: 'R', rot: 166, grip: 'grip', curl: 0.95, at: [1010, 760], grab: [40, -205], from: [1760, -260], to: [1340, -560], T: [0.4, 0.95, 1.55] },
    keys: { side: 'L', rot: -38, grip: 'hook', curl: 1, at: [880, 905], grab: [4, -10], from: [-280, 1260], T: [0.8, 1.2] },
    wallet: { side: 'L', at: [1150, 915], grab: [-40, -22], T: [1.2, 1.5, 2.15], to: [460, -480] },
    bag: { side: 'R', rot: 178, grip: 'grip', curl: 1, at: [1700, 520], grab: [6, -2], from: [2320, 600], to: [2480, -120], T: [1.9, 2.4, 3.1] },
  };
  function sweepBack(c) {
    return c.cache('Q10|sweep|back', g => {
      // the partition glass behind the desk, out of focus: the dark meeting room through it, the window reflected in it
      const l = LC.layer();
      l.fillStyle = LC.lin(l, 0, 0, 0, 720, [[0, '#2E3638'], [1, '#1C2224']]); l.fillRect(0, 0, W, 720);
      l.fillStyle = '#26302F'; l.fillRect(0, 560, W, 160); l.fillStyle = 'rgba(160,170,168,0.25)'; l.fillRect(0, 556, W, 6);   // the meeting table's edge
      [[120, 380], [520, 360], [1260, 370], [1660, 390]].forEach(([x, y]) => { l.fillStyle = '#1A2022'; l.fillRect(x, y, 170, 200); });        // chair backs
      l.save(); l.globalCompositeOperation = 'screen';
      l.fillStyle = LC.lin(l, 0, 110, 0, 430, [[0, '#F6D2AE', 0.0], [0.15, '#F6D2AE', 0.62], [0.85, '#F3C9A0', 0.55], [1, '#F3C9A0', 0]]); l.fillRect(0, 110, W, 320);
      l.fillStyle = 'rgba(40,30,28,1)'; l.globalCompositeOperation = 'source-over'; l.globalAlpha = 0.45; for (let x = 40; x < W; x += 330) l.fillRect(x, 110, 22, 320);
      l.globalAlpha = 1; l.restore();
      l.fillStyle = 'rgba(238,236,230,0.55)'; for (let x = -10; x < W + 40; x += 46) { l.beginPath(); l.arc(x, 486, 9, 0, TAU); l.fill(); }
      g.drawImage(LC.blurred(l.canvas, 12), 0, 0);
      // the desk top, in shade, its satin finish taking the window's light at its back edge
      g.fillStyle = LC.lin(g, 0, 700, 0, H, [[0, '#A8A39A'], [0.18, '#8E8A82'], [0.6, '#5E5A55'], [1, '#2E2B29']]); g.fillRect(0, 700, W, H - 700);
      g.fillStyle = LC.lin(g, 0, 700, 0, 790, [[0, PEACH, 0.45], [1, PEACH, 0]]); g.fillRect(0, 700, W, 90);
      g.fillStyle = 'rgba(30,26,24,0.5)'; g.fillRect(0, 697, W, 4);
      // the shut laptop where the phone stood, its lid's edge catching the light; the mug's ring, left all day
      g.fillStyle = 'rgba(20,18,18,0.35)'; g.beginPath(); g.ellipse(470, 790, 330, 22, 0, 0, TAU); g.fill();
      g.fillStyle = '#B9B8B4'; g.fill(LC.pathPts([[200, 742], [740, 742], [770, 772], [170, 772]]));
      g.fillStyle = '#8C8B86'; g.fillRect(170, 772, 600, 14); g.fillStyle = '#6E6D69'; g.fillRect(170, 786, 600, 5); g.fillStyle = rgba(PEACH, 0.7); g.fillRect(200, 741, 540, 3);
      g.strokeStyle = 'rgba(92,64,44,0.35)'; g.lineWidth = 3; g.beginPath(); g.ellipse(SW.mug.at[0], SW.mug.at[1] + 2, 76, 15, 0, 0, TAU); g.stroke();
      g.fillStyle = LC.lin(g, 0, 880, 0, H, [[0, '#141012', 0], [1, '#141012', 0.5]]); g.fillRect(0, 880, W, 200);
    });
  }
  function mug(g, at, lifted, tilt) {     // standing on base point `at`: brushed steel, a rubber band, a black lid
    const r = 0.037 * K, h = 0.165 * K, e = 0.2;
    g.save(); g.translate(at[0], at[1]); g.rotate(tilt || 0);
    if (!lifted) { g.fillStyle = 'rgba(20,18,18,0.35)'; g.beginPath(); g.ellipse(0, 4, r * 1.35, r * 0.3, 0, 0, TAU); g.fill(); }
    g.fillStyle = LC.lin(g, -r, 0, r, 0, [[0, '#4E5250'], [0.25, '#B9B7B0'], [0.4, '#F4EEE4'], [0.55, '#8E908C'], [0.8, '#C9B49C'], [1, '#3E4240']]);
    g.beginPath(); g.moveTo(-r, -h); g.lineTo(-r * 0.9, 0); g.ellipse(0, 0, r * 0.9, r * 0.9 * e, 0, Math.PI, 0, true); g.lineTo(r, -h); g.closePath(); g.fill();
    g.fillStyle = '#26262A'; g.fillRect(-r * 0.97, -h * 0.34, r * 1.94, h * 0.13);
    g.fillStyle = '#141416'; g.fillRect(-r * 1.03, -h - r * 0.42, r * 2.06, r * 0.46); g.beginPath(); g.ellipse(0, -h - r * 0.42, r * 1.03, r * 1.03 * e, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(232,220,206,0.5)'; g.fillRect(-r * 0.6, -h - r * 0.4, r * 0.7, 2);
    g.fillStyle = rgba(PEACH, 0.6); g.fillRect(-r * 0.3, -h + 6, r * 0.16, h * 0.55);
    g.restore();
  }
  function keys(g, at, swing, lifted) {   // `at`: the ring's centre; lying flat (foreshortened) or hanging from a finger
    g.save(); g.translate(at[0], at[1]); g.rotate(swing || 0); if (!lifted) g.scale(1, 0.36);
    if (!lifted) { g.fillStyle = 'rgba(20,18,18,0.3)'; g.beginPath(); g.ellipse(30, 20, 110, 70, 0, 0, TAU); g.fill(); }
    g.strokeStyle = '#B9BDB8'; g.lineWidth = lifted ? 7 : 9; g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.stroke();
    const ks = lifted ? [[1.35, '#C9CDC6', 74], [1.7, '#A6AAA4', 86], [2.05, '#D4CCB2', 70]] : [[0.5, '#C9CDC6', 74], [1.3, '#A6AAA4', 86], [2.2, '#D4CCB2', 70]];
    ks.forEach(([a, col, len]) => { g.save(); g.rotate(a); g.fillStyle = col; g.fill(LC.rrect(26, -11, len, 22, 5)); g.fillRect(len + 20, -11, 12, 30); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(28, -11, len - 4, 5); g.restore(); });
    g.save(); g.rotate(lifted ? 1.1 : -0.8); g.fillStyle = '#1E2226'; g.fill(LC.rrect(28, -28, 68, 56, 14)); g.fillStyle = rgba(PEACH, 0.45); g.fillRect(34, -24, 54, 8); g.restore();
    g.restore();
  }
  function wallet(g, at, rot, lifted) {
    const w = 0.11 * K, h = 0.085 * K;
    g.save(); g.translate(at[0], at[1]); g.rotate(rot || 0); if (!lifted) g.scale(1, 0.34);
    if (!lifted) { g.fillStyle = 'rgba(20,18,18,0.3)'; g.fill(LC.rrect(-w / 2 + 12, -h / 2 + 30, w, h, 10)); }
    g.fillStyle = '#4A3022'; g.fill(LC.rrect(-w / 2, -h / 2, w, h, 10)); g.fillStyle = '#5E3E2C'; g.fill(LC.rrect(-w / 2, -h / 2, w, h * 0.42, 10));
    g.fillStyle = rgba(PEACH, 0.5); g.fillRect(-w / 2 + 10, -h / 2 + 2, w - 20, 4);
    g.strokeStyle = 'rgba(214,180,140,0.35)'; g.setLineDash([6, 6]); g.lineWidth = 2; g.strokeRect(-w / 2 + 9, -h / 2 + 9, w - 18, h - 18); g.setLineDash([]); g.restore();
  }
  function bag(g, handle, lifted) {        // the satchel standing at the right, carried by its handle (it runs off frame right)
    const w = 0.42 * K * 0.86, h = 0.3 * K * 0.86, x = handle[0] - w * 0.3, y = handle[1] + 0.06 * K;
    if (!lifted) { g.fillStyle = 'rgba(20,18,18,0.35)'; g.beginPath(); g.ellipse(x + w * 0.5, y + h + 4, w * 0.56, 22, 0, 0, TAU); g.fill(); }
    g.fillStyle = LC.lin(g, x, 0, x + w, 0, [[0, '#5A3C26'], [0.4, '#45301F'], [1, '#2E1F14']]); g.fill(LC.rquad([[x + w * 0.02, y], [x + w * 0.98, y], [x + w, y + h], [x, y + h]], 40));
    g.fillStyle = '#2C1C12'; g.fill(LC.rquad([[x, y - 4], [x + w, y - 4], [x + w, y + h * 0.36], [x, y + h * 0.36]], 40));
    g.fillStyle = rgba(PEACH, 0.6); g.fillRect(x + 16, y - 5, w - 32, 4);
    g.fillStyle = '#6A4A30'; g.fillRect(x + w * 0.1, y + h * 0.5, w * 0.8, h * 0.42); g.fillStyle = '#060404'; g.fillRect(x + w * 0.11, y + h * 0.5, w * 0.78, 4);
    g.strokeStyle = rgba(PEACH, 0.6); g.lineWidth = 3; g.beginPath(); g.moveTo(x + w * 0.12, y + h * 0.5 + 2); g.lineTo(x + w * 0.88, y + h * 0.5 + 2); g.stroke();
    g.strokeStyle = '#1E140D'; g.lineWidth = 0.016 * K; g.lineCap = 'round'; g.beginPath(); g.moveTo(handle[0] - 0.07 * K, y); g.bezierCurveTo(handle[0] - 0.06 * K, y - 0.1 * K, handle[0] + 0.06 * K, y - 0.1 * K, handle[0] + 0.07 * K, y); g.stroke();
    g.strokeStyle = rgba(PEACH, 0.55); g.lineWidth = 3; g.beginPath(); g.moveTo(handle[0] - 0.05 * K, y - 0.068 * K); g.bezierCurveTo(handle[0] - 0.025 * K, y - 0.086 * K, handle[0] + 0.025 * K, y - 0.086 * K, handle[0] + 0.05 * K, y - 0.068 * K); g.stroke();
  }
  function sweepInsert(c, st) {
    const g = c.g; c.camera(cam({ x: 960, y: 540, zoom: 1.0 + st * 0.004 }));
    g.drawImage(sweepBack(c), 0, 0);
    const t = twos(st), L = { light: { x: 760, y: 1500, color: PEACH, back: 0.25 }, ambient: '#2A2420', ambientK: 0.1 }, hs = 0.19 * K;
    const HPof = (o, closed) => ({ size: hs, pose: 'grip', grip: closed ? o.grip : 'relaxed', curl: closed ? o.curl : 0.8, view: 'back', side: o.side, rot: o.rot, sleeve: 'office' });
    const pinch = gm => [(gm.tips[1][0] + gm.thumb[0]) / 2, (gm.tips[1][1] + gm.thumb[1]) / 2];
    const wristFor = (o, target) => { const p = pinch(handGeom(HPof(o, true))); return [target[0] - p[0], target[1] - p[1]]; };
    // the mug (right hand): in from the top right, closes, up and out of the top
    const M = SW.mug, mGrip = wristFor(M, [M.at[0] + M.grab[0], M.at[1] + M.grab[1]]);
    let mWrist = null, mAt = M.at, mHeld = false;
    if (t > M.T[0] && t < M.T[1]) { const u = seg(t, M.T[0], M.T[1], E.outCubic); mWrist = [lerp(M.from[0], mGrip[0], u), lerp(M.from[1], mGrip[1], u)]; }
    else if (t >= M.T[1] && t < M.T[2]) { const u = seg(t, M.T[1] + 0.08, M.T[2], E.inCubic); mWrist = [lerp(mGrip[0], M.to[0], u), lerp(mGrip[1], M.to[1], u)]; mAt = [M.at[0] + mWrist[0] - mGrip[0], M.at[1] + mWrist[1] - mGrip[1]]; mHeld = true; }
    else if (t >= M.T[2]) mAt = null;
    // the keys, then the wallet (left hand, one scoop): in from below, the keys hooked, across to the wallet, out of the top
    const Kk = SW.keys, Wl = SW.wallet, kHP = HPof(Kk, true), kGrip = wristFor(Kk, [Kk.at[0] + Kk.grab[0], Kk.at[1] + Kk.grab[1]]);
    const wGrip = wristFor(Kk, [Wl.at[0] + Wl.grab[0], Wl.at[1] + Wl.grab[1]]);
    let lWrist = null, kAt = Kk.at, kHeld = false, wAt = Wl.at, wHeld = false;
    if (t > Kk.T[0] && t < Kk.T[1]) { const u = seg(t, Kk.T[0], Kk.T[1], E.outCubic); lWrist = [lerp(Kk.from[0], kGrip[0], u), lerp(Kk.from[1], kGrip[1], u)]; }
    else if (t >= Kk.T[1] && t < Wl.T[1]) { const u = seg(t, Kk.T[1] + 0.06, Wl.T[1], E.inOutSine); lWrist = [lerp(kGrip[0], wGrip[0], u), lerp(kGrip[1], wGrip[1], u)]; kHeld = true; }
    else if (t >= Wl.T[1] && t < Wl.T[2]) { const u = seg(t, Wl.T[1] + 0.08, Wl.T[2], E.inCubic); lWrist = [lerp(wGrip[0], Wl.to[0], u), lerp(wGrip[1], Wl.to[1], u)]; kHeld = true; wHeld = true; wAt = [Wl.at[0] + lWrist[0] - wGrip[0], Wl.at[1] + lWrist[1] - wGrip[1]]; }
    else if (t >= Wl.T[2]) { kAt = null; wAt = null; }
    if (kHeld && lWrist) { const p = pinch(handGeom(kHP)); kAt = [lWrist[0] + p[0] + 4, lWrist[1] + p[1] + 34]; }
    // the bag (right hand again): in from the right, by its handle, up and out
    const B = SW.bag, bGrip = wristFor(B, [B.at[0] + B.grab[0], B.at[1] + B.grab[1]]);
    let bWrist = null, bAt = B.at, bHeld = false;
    if (t > B.T[0] && t < B.T[1]) { const u = seg(t, B.T[0], B.T[1], E.outCubic); bWrist = [lerp(B.from[0], bGrip[0], u), lerp(B.from[1], bGrip[1], u)]; }
    else if (t >= B.T[1] && t < B.T[2]) { const u = seg(t, B.T[1] + 0.1, B.T[2], E.inCubic); bWrist = [lerp(bGrip[0], B.to[0], u), lerp(bGrip[1], B.to[1], u)]; bAt = [B.at[0] + bWrist[0] - bGrip[0], B.at[1] + bWrist[1] - bGrip[1]]; bHeld = true; }
    else if (t >= B.T[2]) bAt = null;
    // draw: the objects (at rest, or carried), the hands over them
    if (bAt) bag(g, bAt, bHeld);
    if (mAt) mug(g, mAt, mHeld, mHeld ? -0.08 * seg(t, M.T[1], M.T[2]) : 0);
    if (wAt) wallet(g, wAt, wHeld ? -0.35 : 0.06, wHeld);
    if (kAt) keys(g, kAt, kHeld ? 0.35 * Math.sin((st - Kk.T[1]) * 8) * Math.exp(-(st - Kk.T[1]) * 2) : 0, kHeld);
    if (bWrist) RIG.hand(g, 'daniel', Object.assign({ at: bWrist }, HPof(B, t >= B.T[1] - 0.05)), L);
    if (mWrist) RIG.hand(g, 'daniel', Object.assign({ at: mWrist }, HPof(M, t >= M.T[1] - 0.05)), L);
    if (lWrist) RIG.hand(g, 'daniel', Object.assign({ at: lWrist }, HPof(Kk, t >= Kk.T[1] - 0.05)), L);
  }

  // ---------- S17 · the car park in the low sun ----------
  // seen from the lobby, through the entrance door's glass: frosted dots at eye level out of focus, the lobby's lights faint
  // in it, a steel pull soft at the edge; every windscreen beyond it copper
  function lobbyPane(c) {
    return c.cache('Q10|rows|pane', pg => {
      const l = LC.layer(); l.fillStyle = '#F4EEE6'; for (let x = -30; x < W + 60; x += 74) { l.beginPath(); l.arc(x, 612, 15, 0, TAU); l.fill(); }
      pg.globalAlpha = 0.26; pg.drawImage(LC.blurred(l.canvas, 8, false), 0, 0); pg.globalAlpha = 1;
      const r = LC.layer(); r.fillStyle = '#E8F0EE'; for (let i = 0; i < 5; i++) { const x = 140 + i * 380, y = 40 + (i % 2) * 26; r.beginPath(); r.moveTo(x, y); r.lineTo(x + 240, y - 8); r.lineTo(x + 250, y + 22); r.lineTo(x + 10, y + 30); r.closePath(); r.fill(); }
      pg.save(); pg.globalCompositeOperation = 'screen'; pg.globalAlpha = 0.1; pg.drawImage(LC.blurred(r.canvas, 10, false), 0, 0); pg.restore();
      LC.glare(pg, null, { x: 900, y: 460, angle: -1.12, color: '#FFE8D0', bands: [{ d: -340, w: 220, a: 0.05 }, { d: -240, w: 26, a: 0.07 }, { d: 400, w: 300, a: 0.035 }] });
      LC.specks(pg, null, { x: 0, y: 0, w: W, h: H }, 'q10-lobby-dust', { n: 300, color: '#FFF4E6', rMin: 0.6, rMax: 1.8, aMin: 0.04, aMax: 0.16, scratch: 0.1, near: { x: 200, y: 500, r: 1100 } });
      // the door's steel frame and its pull, close and soft at the right edge
      const f = LC.layer(); f.fillStyle = '#2A2626'; f.fillRect(W - 70, -20, 110, H + 40); f.strokeStyle = '#8E8A86'; f.lineWidth = 30; f.lineCap = 'round'; f.beginPath(); f.moveTo(W - 190, 300); f.lineTo(W - 190, 900); f.stroke();
      f.strokeStyle = 'rgba(255,226,196,0.85)'; f.lineWidth = 6; f.beginPath(); f.moveTo(W - 200, 300); f.lineTo(W - 200, 900); f.stroke();
      pg.drawImage(LC.blurred(f.canvas, 12, false), 0, 0);
      pg.fillStyle = LC.lin(pg, 0, 860, 0, H, [[0, '#120D0E', 0], [1, '#120D0E', 0.35]]); pg.fillRect(0, 860, W, 220);
    });
  }
  function rowsShot(c, st, lt) {
    const v = SETS.carpark.views.rows, a = v.anchors.path, g = c.g;
    c.camera(cam({ zoom: 1.0 }));
    v.back(c, lt, {});
    // up the aisle to his car: a tired walk, the feet planted (the path advances by the stride)
    const u = lerp(0.5, 0.965, seg(lt, 18.7, 24.2, E.linear)), x = lerp(a.from[0], a.to[0], u), y = lerp(a.from[1], a.to[1], u), k = lerp(a.scaleFrom, a.scaleTo, u);
    const ph = (twos(lt) * 1.02) % 1;
    RIG.draw(g, 'daniel', Object.assign({ at: [x, y], scale: k, view: 'back', body: lt < 23.9 ? 'walk' : 'stand', phase: ph, hold: { l: 'bag', r: 'mug' } }, DAN), { light: v.light });
    v.front(c, lt, {});
    g.drawImage(lobbyPane(c), 0, 0);
  }
  // the open driver's door, the heat pouring out; then closer, the mug, the footwell
  function heatShot(c, st, lt, o) {
    const v = SETS.carpark.views.heat, a = v.anchors.daniel, s = { door: o.door, heat: o.heat };
    c.camera(cam(o.cam || {}));
    v.back(c, lt, s);
    const P = Object.assign({ view: 'threeBack', facing: 1, body: 'stand', breath: breath(lt), hold: { l: 'bag', r: 'mug' } }, DAN, o.pose(twos(lt)));
    P.at = [a.x + (P.dx || 0) * a.scale, a.y]; P.scale = a.scale;
    RIG.draw(c.g, 'daniel', P, { light: v.light });
    v.front(c, lt, s);
  }

  // ---------- S18 · the car ----------
  function consoleShot(c, st, lt, s, handFn) {
    const v = SETS.car.views.console; c.camera(cam(s.cam || {}));
    v.back(c, lt, s);
    if (handFn) handFn(c.g, v);
    v.front(c, lt, s);
    // the copper from the lowered windows rakes across the console a little brighter
    if (s.wash) { const g = c.g; g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.lin(g, 1900, 0, 300, 900, [[0, '#E4894A', 0.22 * s.wash], [0.6, '#E4894A', 0.06 * s.wash], [1, '#E4894A', 0]]); g.fillRect(0, 0, W, H); g.restore(); }
  }
  let DRIVE_OFF = null;                     // where the drive body puts his head, relative to the seat point (measured once)
  function drivingShot(c, st, lt) {
    const v = SETS.car.views.driving, s = { tod: 'evening', travel: 30 + lt * 7.5, window: 0 };
    c.camera(cam({ zoom: 1.0 }));
    v.back(c, lt, s);
    const A = v.anchors, sc = A.ppm * 1.02;
    const P = Object.assign({ scale: sc, view: 'profile', facing: 1, body: 'drive', wheel: false, breath: breath(lt), face: 'tired', steer: 0.03 * Math.sin(lt * 0.4) }, DAN, pose(lt, [
      [44.6, { armR: 'wheel', armL: 'wheel', head: { nod: -0.22, turn: 0 }, lid: 0.5, collar: 'straight', stoop: 0.2 }],
      [45.6, { armR: 'collar', armL: 'wheel', head: { nod: -0.18, turn: 0.05 }, lid: 0.55, collar: 'straight', stoop: 0.2 }],
      [46.4, { armR: 'collar', armL: 'wheel', head: { nod: -0.3, turn: 0.05, tilt: -0.06 }, lid: 0.6, collar: 'loose', stoop: 0.2 }],
      [47.4, { armR: 'wheel', armL: 'wheel', head: { nod: -0.2, turn: 0 }, lid: 0.52, collar: 'loose', stoop: 0.2 }],
      [50.2, { armR: 'wheel', armL: 'wheel', head: { nod: -0.18, turn: 0 }, lid: 0.56, collar: 'loose', stoop: 0.2 }]]));
    if (!DRIVE_OFF) { const r = RIG.draw(FILM.cache('Q10|scratch-drive', () => {}, 8, 8).getContext('2d'), 'daniel', Object.assign({}, P, { at: [0, 0] }), {}); DRIVE_OFF = r && r.head ? [r.head[0] / sc, r.head[1] / sc] : [0.05, -0.75]; }
    P.at = [A.head[0] - DRIVE_OFF[0] * sc, A.head[1] - DRIVE_OFF[1] * sc];
    RIG.draw(c.g, 'daniel', P, { light: { x: 300, y: 100, color: '#F2A65E', back: 0.35 }, ambient: '#3A2E2A', ambientK: 0.12 });
    v.front(c, lt, s);
    // the lower door in its own shade: a calm, darker band for the radio's words
    c.reset(); c.g.drawImage(c.cache('Q10|drive|band', bg => { bg.fillStyle = LC.lin(bg, 0, 800, 0, H, [[0, '#120D0E', 0], [0.55, '#120D0E', 0.38], [1, '#120D0E', 0.62]]); bg.fillRect(0, 800, W, 280); }), 0, 0);
  }

  FILM.seq({
    id: 'Q10', title: '5:37', dur: 62,
    lines: [
      { id: 'L036', at: 8.8 },                // Priya, in her coat
      { id: 'L037', at: 10.6 },
      { id: 'L038', at: 32.6 },
      { id: 'L039', at: 43.6 },               // the radio, 7.64 s take (cut off: "--" at 51.24, as he turns it down)
    ],
    sound(S) {
      // the office, emptying: the air conditioning lower, a vacuum cleaner far off
      S.bed('ac', 0, 18.6, { level: -50 });
      S.bed('office_evening', 0, 18.6, { level: -56 });             // half the floor gone; a cleaner's vacuum two rooms away
      S.cue('email', 4.6);                                           // the outgoing message chimes
      S.cue('laptop_close', 7.1, { level: -32 });
      S.cue('footsteps', 8.0, { n: 4, level: -40 }); S.cue('coat_rustle', 8.6, { level: -44 }); S.cue('footsteps', 11.4, { n: 5, level: -42 });
      // the sweep: mug, keys, wallet, bag
      S.cue('mug_up', 14.35, { level: -34 }); S.cue('keys', 14.6, { level: -30 }); S.cue('wallet', 14.9, { level: -40 }); S.cue('bag_lift', 15.85, { level: -34 });
      S.cue('chair_roll', 17.4, { level: -44 }); S.cue('footsteps', 17.6, { n: 3, level: -42 });
      // the car park: warm still air, the far ring road, a few swifts; his steps on the tarmac
      S.bed('evening_carpark', 18.6, 34.4, { level: -44, fi: 0.3 });
      S.cue('footsteps', 18.8, { n: 9, level: -42 });
      S.cue('handle', 24.25, { level: -30 });
      S.cue('car_door_open', 24.4, { level: -28 });
      S.cue('hot_air', 24.55, { level: -30 });                       // the dense wave of trapped heat
      S.bed('heat', 24.55, 34.4, { level: -46, fi: 0.4 });
      S.duck(25.8, 28.4, 0.55);                                      // the pause: the car park holds its breath
      S.cue('mug_lid', 29.6, { level: -40 });                        // the empty mug
      S.cue('seat_creak', 31.3, { level: -42 });                     // he leans in to the passenger footwell
      // the car: in, windows down, the ignition, the vents' weak cough before the air conditioning catches
      S.cue('car_door_close', 34.1, { level: -30 });
      S.cue('window_motor', 34.35, { level: -34 });                  // both front windows
      S.cue('ignition', 35.4);
      S.bed('engine', 35.6, 62, { f: 34, level: -38 });
      S.cue('vent_cough', 35.85, { level: -32 });
      S.cue('ac_catch', 37.6, { level: -38 });
      // the drive home: thinned traffic in the heat, the radio low
      S.bed('traffic', 38.6, 62, { level: -46, fi: 0.6 });
      S.bed('radio_music', 38.6, 43.4, { level: -46 });              // the radio low, a song ending, small speaker
      S.cue('volume_knob', 50.9, { level: -44 });                    // he turns it down another notch...
      S.bed('radio_music', 51.3, 62, { level: -56 });                 // ...and it murmurs on, barely there
      S.duck(54.4, 62, 0.8);                                         // the exhausted quiet
    },
    shots: [
      // ===== S16 · the office, early evening =====
      { at: 0, name: 'laptop: 5:37 in its corner; sent; the lid shuts on the reflected office', draw(c, st, lt) { laptopShot(c, st, lt); } },
      { at: 8.0, name: 'desk, evening: a half-empty office; Priya in her coat', draw(c, st, lt) { deskEvening(c, st, lt); } },
      { at: 13.4, name: 'insert: bag, keys, wallet, mug arrange themselves in his hands', draw(c, st) { sweepInsert(c, st); } },
      // ===== S17 · the car park =====
      { at: 18.6, name: 'car park through the lobby glass: every windscreen copper; he walks to his car', draw(c, st, lt) { rowsShot(c, st, lt); } },
      { at: 24.2, name: 'the driver\'s door opens on trapped heat; he recoils; a pause', draw(c, st, lt) {
          heatShot(c, st, lt, { door: seg(lt, 24.4, 25.1, E.outCubic), heat: seg(lt, 24.6, 25.6), cam: { zoom: 1.0 },
            pose: t => pose(t, [
              [24.2, { armR: { pose: 'reach', dx: 0.12, dy: -0.25, dz: 0.1 }, lean: 0.05, head: { turn: 0, nod: 0.1 }, dx: 0 }],
              [24.6, { armR: { pose: 'reach', dx: 0.3, dy: -0.25, dz: -0.05 }, lean: 0.0, head: { turn: 0, nod: 0.05 }, dx: 0 }],
              [25.0, { armR: { pose: 'relaxed', dx: 0.14, dy: 0.12, dz: -0.08 }, lean: -0.6, head: { turn: -0.65, nod: -0.2 }, dx: -0.24 }],   // the heat hits him: he recoils, a half-step back (no hand to the face: never a phone's gesture)
              [25.6, { armR: { pose: 'relaxed', dx: 0.08, dy: 0.04 }, lean: -0.42, head: { turn: -0.5, nod: -0.1 }, dx: -0.27 }],
              [26.4, { armR: 'relaxed', lean: -0.15, head: { turn: -0.05, nod: -0.16, tilt: 0.06 }, dx: -0.26 }],   // a strange smell: he pauses
              [28.4, { armR: 'relaxed', lean: -0.12, head: { turn: 0.12, nod: -0.12, tilt: 0.06 }, dx: -0.26 }]]) });
        } },
      { at: 28.6, name: 'closer: the empty mug; the passenger footwell; "Jesus."', draw(c, st, lt) {
          const a = SETS.carpark.views.heat.anchors.daniel;
          heatShot(c, st, lt, { door: 1, heat: 1, cam: { x: a.x + 80, y: a.y - 300, zoom: 1.4 + st * 0.008 },
            pose: t => pose(t, [
              [28.6, { armR: 'relaxed', lean: -0.1, head: { turn: 0.12, nod: -0.1 } }],
              [29.2, { armR: 'mug', lean: 0.0, head: { turn: 0.2, nod: 0.5 } }],                          // he looks down at the empty mug
              [30.4, { armR: 'mug', lean: 0.05, head: { turn: 0.25, nod: 0.55 } }],
              [30.9, { armR: 'reachLow', lean: 1.55, crouch: 0.3, head: { turn: 0.3, nod: 0.5 } }],         // bends into the doorway: the passenger footwell
              [32.0, { armR: 'reachLow', lean: 1.6, crouch: 0.32, head: { turn: 0.35, nod: 0.55 } }],
              [32.6, { armR: 'relaxed', lean: 0.1, crouch: 0, head: { turn: -0.1, nod: 0.0 } }],          // nothing. "Jesus."
              [33.4, { armR: 'collar', lean: 0.0, head: { turn: -0.2, nod: -0.05 } }],
              [34.0, { armR: 'collar', lean: 0.0, head: { turn: -0.2, nod: -0.05 } }]]) });
        } },
      // ===== S18 · the car =====
      { at: 34.0, name: 'console: windows down, the ignition, the vents cough hot air', draw(c, st, lt) {
          const on = seg(lt, 35.4, 35.7), cough = lt < 35.85 ? 0 : lt < 37.6 ? 0.25 + 0.65 * Math.max(0, Math.sin((lt - 35.85) * 7.5)) * (1 - seg(lt, 35.85, 37.6)) : 0.5;
          consoleShot(c, st, lt, { tod: 'evening', radio: on, volume: 0.5 * on, vents: cough, wash: seg(lt, 34.3, 35.6), cam: { x: 960, y: 520, zoom: 1.03 + st * 0.006 } });
        } },
      { at: 38.6, name: 'the drive: traffic drifts through the heat, copper glare on the windscreen', draw(c, st, lt) {
          const v = SETS.roads.views.evening; c.camera(cam({ zoom: 1.0 }));
          v.back(c, lt, { travel: 4 + st * 6.5, traffic: st * 0.4 }); v.front(c, lt, {});
        } },
      { at: 44.6, name: 'through his window: he loosens his collar, the radio low', draw(c, st, lt) { drivingShot(c, st, lt); } },
      { at: 50.2, name: 'console: he turns it down another notch; the display dims', draw(c, st, lt) {
          const dim = seg(lt, 50.9, 51.4, E.inOutSine);
          consoleShot(c, st, lt, { tod: 'evening', radio: lerp(1, 0.45, dim), volume: lerp(0.5, 0.25, dim), vents: 0.5, cam: { x: 1060, y: 640, zoom: 1.12 + st * 0.006 } }, (g, v) => {
            const kb = v.anchors.volumeKnob, t = twos(lt), inn = seg(t, 50.3, 50.85, E.outCubic) * (1 - seg(t, 51.8, 52.5, E.inCubic)), turn = seg(t, 50.85, 51.35, E.inOutSine);
            if (inn <= 0) return;
            const HP = { size: 520, pose: 'grip', grip: 'pinch', view: 'back', roll: 10, rot: -150 + turn * 22, sleeve: 'office' }, gm = handGeom(HP), pc = [(gm.tips[0][0] + gm.thumb[0]) / 2, (gm.tips[0][1] + gm.thumb[1]) / 2];
            const off = (1 - inn) * 520;
            RIG.hand(g, 'daniel', Object.assign({ at: [kb[0] - pc[0] + off, kb[1] - pc[1] + off * 0.5] }, HP), { light: { x: 1700, y: 120, color: '#E4894A', back: 0.5 } });
          });
        } },
      { at: 54.4, name: 'the mirror holds the road behind, as it has all day', draw(c, st, lt) {
          const v = SETS.car.views.pov; c.camera(cam({ x: 900, y: 470, zoom: 1.0 + st * 0.005 }));
          v.back(c, lt, { tod: 'evening', travel: 120 + st * 7 }); v.front(c, lt, { tod: 'evening' });
        }, post: { vig: 0.46 } },
    ],
  });
})();
