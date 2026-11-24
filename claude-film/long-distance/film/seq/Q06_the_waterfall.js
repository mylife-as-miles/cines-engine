/* LONG DISTANCE · Q06 THE WATERFALL (64 s) · S06, A023–A029, L007 · living (room, fridge, counter), phone
   The living room at night under the pendant. He eats from the pan standing at the counter, the phone propped against the salt
   in the empty half, where a person would sit across from him. A chime: she sends a picture of the two of them in front of a
   waterfall. It is the strip on the fridge, the last frame, made perfect: the same two faces in the same tilt, too even. Nobody
   says so. The forkful he was lifting stops halfway; he stops chewing and looks for a long time, says "I love this one." to the
   empty room, sets it as his wallpaper, and locks and wakes the phone three times to see them there. The last shot holds the
   strip and the phone in one frame: the rhyme, in plain sight, unremarked.
   Shots: room (0) · fridge insert, push down to the last frame (7) · counter (13) · the image, gloss insert (22) · counter close
   (30) · wallpaper, lock and wake, insert (42) · counter, the strip at left and the phone at right, slow push (53).
   Fix round 1 (REVIEW_cut1 item 14): real bites (the fork to his mouth, then chewing); the third forkful stops halfway at the
   chime; his eyeline goes down to the phone on the salt; the pan has a handle into his fist; his hand at true scale taps the
   glass and presses the side button; the last shot frames the strip and the phone together. */
(function () {
  'use strict';
  const O = window.OTM, W = O.W, H = O.H;
  const { seg, key, twos, clamp, lerp, mixv } = FILM;
  const V2 = RIG.V;
  const LV = n => SETS.living.views[n];
  const NIGHT = { tod: 'night' };
  const HEAD_M = 0.23;                                  // a head, crown to chin, in metres (living.md)
  const PHONE_M = 0.15;                                 // the phone's body, in metres

  // ---------------------------------------------------------------- the phone's day: what its screen shows at local time lt
  // the thread holds the day, in order: the morning (Q02), "Send me one." and the blurred image (Q04), the voice note (Q05), then
  // tonight's picture. Every word is a screenplay message; the image and the voice note are PHONE's own unreadable bubbles.
  const DAY_SO_FAR = [['stamp', '07:12'], ['her', PHONE.MSG.goodMorning], ['him', PHONE.MSG.goodMorningLove], ['her', PHONE.MSG.iLoveYou],
    ['stamp', '12:47'], ['him', PHONE.MSG.sendMeOne], ['her', { image: 'hidden' }], ['stamp', '18:21'], ['her', { voice: 9 }]];
  const THREAD = { clock: 'night', history: DAY_SO_FAR, steps: [{ stamp: '23:14', at: 20.5 }, { at: 20.5, her: { image: 'waterfall' } }] };
  const OPEN = [22.4, 23.3];                            // the bubble grows to the viewer
  const SET_IN = 42.2, SET_PRESS = 43.4, SET_OUT = 43.9;
  const LOCKS = [44.9, 47.0, 50.0], WAKES = [45.5, 48.5, 51.5];
  function screenAt(lt) {
    if (lt < OPEN[0]) return { screen: 'thread', state: PHONE.exchange(lt, THREAD) };
    if (lt < SET_IN) return { screen: 'image', state: { open: seg(lt, OPEN[0], OPEN[1], 'inOutCubic'), thread: PHONE.exchange(30, THREAD) } };
    if (lt < LOCKS[0]) {
      const inn = lt < SET_OUT ? seg(lt, SET_IN, SET_IN + 0.4, 'outCubic') : 1 - seg(lt, SET_OUT, SET_OUT + 0.3, 'inCubic');
      return { screen: 'wallpaper_set', state: { in: inn, press: lt > SET_PRESS && lt < SET_PRESS + 0.4 ? 1 : 0 } };
    }
    // locked and woken: black glass, then the lock screen blooms back with the two of them on it
    let last = null; [...LOCKS.map(t => [t, 'lock']), ...WAKES.map(t => [t, 'wake'])].sort((a, b) => a[0] - b[0]).forEach(e => { if (lt >= e[0]) last = e; });
    if (last[1] === 'lock') return { screen: 'black', state: {} };
    const p = seg(lt, last[0], last[0] + 0.7);
    return p < 1 ? { screen: 'wake', state: { p } } : { screen: 'lock', state: {} };
  }
  // the screen's light, as RIG reads it: peach while the thread is up, the white water's cool once the picture is open
  const toneAt = lt => lt < OPEN[0] + 0.4 ? { col: '#FFC5A0', k: 0.55 } : { col: '#CDEFF3', k: 0.8 };
  const litAt = lt => { const s = screenAt(lt); return s.screen === 'black' ? 0 : s.screen === 'wake' ? s.state.p : 1; };

  // ---------------------------------------------------------------- his eating
  // A bite: he twirls in the pan (eyes on the pan), lifts (the head comes up to meet the fork, the mouth opens), closes on it,
  // brings the fork back down empty (eyes back to the phone), and chews watching the phone. BITES are when the fork reaches his
  // mouth. The third forkful rises at HALT.lift; the chime stops it about halfway, and it stays there, loaded, until 58.6.
  const TW = 1.1, LIFT = 0.6, HOLD = 0.3, BACK = 0.5, CHEW = 3.0;
  const BITES = [1.9, 5.7, 14.6, 18.4];
  const HALT = { lift: 20.2, at: 20.5 }, STOP_CHEW = 30.35, PUT_DOWN = [58.6, 59.4];
  const twirl = (t, t0) => { const u = (t - t0) / TW; return { fork: 0.03 + 0.05 * (0.5 + 0.5 * Math.sin(u * 14)), loaded: u > 0.45, pan: seg(t, t0, t0 + 0.35, 'inOutSine') }; };
  // the halt: the forkful rises out of the pan; the chime catches it in front of his chest and it stops there
  const haltAt = t => { const k = seg(t, 20.05, 20.85, 'inOutSine'), kStop = seg(20.62, 20.05, 20.85, 'inOutSine'); return Math.min(k, kStop); };
  function eating(t) {
    const st = { fork: 0.12, loaded: false, pan: 0, bite: 0, mouth: null, chew: false, halt: 0 };
    for (const b of BITES) {
      const t0 = b - LIFT - TW;
      if (t >= t0 && t < b - LIFT) Object.assign(st, twirl(t, t0));
      else if (t >= b - LIFT && t < b) { const u = seg(t, b - LIFT, b, 'inOutSine'); Object.assign(st, { fork: lerp(0.08, 1, u), loaded: true, pan: 1 - seg(t, b - LIFT, b - LIFT + 0.3), bite: u, mouth: u > 0.55 ? 2 : 0 }); }
      else if (t >= b && t < b + HOLD) Object.assign(st, { fork: 1, loaded: t < b + 0.12, bite: 1, mouth: t < b + 0.1 ? 2 : 0 });
      else if (t >= b + HOLD && t < b + HOLD + BACK) { const u = seg(t, b + HOLD, b + HOLD + BACK, 'inOutSine'); Object.assign(st, { fork: lerp(1, 0.12, u), bite: 1 - u }); }
      if (t >= b + 0.15 && t < b + 0.15 + CHEW) st.chew = true;
    }
    // the third forkful: twirled, lifted out of the pan, stopped by the chime in front of his chest, tines up; it stays there
    const tw0 = 20.05 - TW;
    if (t >= tw0 && t < 20.05) Object.assign(st, twirl(t, tw0));
    else if (t >= 20.05) {
      const h = haltAt(t) / haltAt(30), down = seg(t, PUT_DOWN[0], PUT_DOWN[1], 'inOutSine');
      Object.assign(st, { fork: lerp(0.05, 0.08, h) * (1 - down) + 0.04 * down, loaded: true, pan: (1 - seg(t, 20.05, 20.4)) * (t < 20.5 ? 1 : 0), halt: h * (1 - down) });
    }
    if (t >= 18.55 && t < STOP_CHEW) st.chew = true;     // he chews on through the picture, slower, until he stops
    return st;
  }
  // the looks: down at the phone on the salt (it stands low and to his right, nearer the camera), down at the pan, up to the fork
  const F_PHONE = { yaw: 0.8, pitch: 0.56, gaze: [0.45, 0.34], lids: 0.64 };
  const F_PAN = { yaw: 0.32, pitch: 0.82, gaze: [0, 0.45], lids: 0.45 };
  const F_BITE = { yaw: 0.18, pitch: 0.12, gaze: [0.3, 0.35], lids: 0.6 };
  function eatFace(st, t, extra) {
    let f = mixv(F_PHONE, F_PAN, st.pan); f = mixv(f, F_BITE, st.bite);
    if (st.chew && st.mouth == null) Object.assign(f, RIG.chew(t)); else f.mouth = st.mouth || 0;
    return Object.assign(f, extra || {});
  }

  // ---------------------------------------------------------------- the phone propped against the salt (true size)
  // it stands on its bottom edge just right of the salt and leans over onto it: in the empty half, its screen turned up to him
  function propped(view, shot) {
    const A = LV(view).shots[shot].anchors, ppm = A.phoneSalt[2], h = PHONE_M * ppm, roll = -0.1;
    const bx = A.phoneSalt[0] - 0.046 * ppm, by = A.phoneSalt[1];
    return { x: bx + Math.sin(-roll) * -h * 0.47, y: by - Math.cos(roll) * h * 0.47, h, yaw: -0.2, pitch: 0.12, roll, env: '#F0D8B8', lightDir: [-0.2, -1] };
  }
  function drawPropped(c, view, shot, lt, o) {
    o = o || {}; const P = Object.assign(propped(view, shot), screenAt(lt), { shadow: { dx: 6, dy: 3, blur: 8, alpha: 0.55 } });
    const info = PHONE.where(P, c);
    PHONE.glow(c, { info, x: info.center[0] - P.h * 0.15, y: LV(view).shots[shot].anchors.phoneSalt[1] - P.h * 0.08, r: P.h * 2.4, sy: 0.32, k: o.k == null ? 1.1 : o.k });
    PHONE.draw(c, P);
    return info;
  }

  // ---------------------------------------------------------------- him at the counter: the rig's counter pose, with our pan and fork
  // The pose's own pan is held at its rim (its handle runs from the rim into the fist and is hidden by it). Here the pan sits a
  // little further right so its handle shows between the rim and his fist; and the fork's twirl of pasta is gone once he has eaten it.
  function panPiece(pen) {
    const c = [0.36, 1.9], rx = 0.56, ry = 0.19, to = [-0.9, 1.93];
    const hd = pen.poly([[c[0] - rx + 0.05, c[1] - 0.03], [to[0], to[1] - 0.034], [to[0], to[1] + 0.034], [c[0] - rx + 0.05, c[1] + 0.035]]);
    const hp = pen.piece(hd, pen.col('#1E1A1C'), { seed: 520, kind: 'card', tex: 0.4, lift: [0.015, 0.03] }); pen.shade(hp, '#5A5054', { lit: 0.014, core: 0 });
    pen.line([[c[0] - rx + 0.04, c[1] - 0.022], [to[0] + 0.05, to[1] - 0.026]], pen.lit('#8A7A70', 0.8), 0.008, 0.7);     // the lit top edge of the handle
    const rim = pen.piece(pen.ell(c[0], c[1], rx, ry, -0.03), pen.col('#2A2628'), { seed: 521, kind: 'card', tex: 0.5, lift: [0.03, 0.05] }); pen.shade(rim, '#6A5E58', { lit: 0.018, core: 0 });
    pen.piece(pen.ell(c[0], c[1] + 0.01, rx - 0.05, ry - 0.03, -0.03), pen.col('#171416'), { seed: 522, kind: 'card', tex: 0.4, lift: false });
    pen.piece(pen.ell(c[0] + 0.01, c[1] + 0.035, rx - 0.09, ry - 0.06, -0.03), pen.col('#2E2A2C'), { seed: 523, kind: 'card', tex: 0.5, lift: false });
    const food = pen.blob([[c[0] - rx * 0.72, c[1] + 0.05], [c[0] - rx * 0.45, c[1] - 0.05], [c[0] + 0.03, c[1] - 0.075], [c[0] + rx * 0.56, c[1] - 0.02], [c[0] + rx * 0.74, c[1] + 0.05], [c[0] + rx * 0.34, c[1] + 0.12], [c[0] - rx * 0.4, c[1] + 0.12]]);
    const fp = pen.piece(food, pen.col('#A2452C'), { seed: 524, kind: 'paper', tex: 0.6, lift: [0.006, 0.012] });
    pen.clip(fp); const r = O.rng('Q06pasta'); for (let i = 0; i < 26; i++) { const x = c[0] - rx * 0.75 + r() * rx * 1.5, y = c[1] - 0.08 + r() * 0.2; pen.line([[x, y], [x + 0.06, y - 0.02 + r() * 0.04], [x + 0.11, y + r() * 0.03 - 0.015]], r() < 0.55 ? pen.col('#EEC47C') : pen.col('#6E2416'), 0.012, 0.8); } pen.unclip();
  }
  function forkPiece(pen, a, b, loaded) {
    const u = V2.norm(V2.sub(b, a)), n = V2.perp(u); pen.line([a, V2.add(b, V2.mul(u, -0.1))], pen.col('#9EA2A6'), 0.028, 1);
    const nb = V2.add(b, V2.mul(u, -0.11)); const head = pen.poly([V2.add(nb, V2.mul(n, 0.02)), V2.add(V2.add(nb, V2.mul(n, 0.045)), V2.mul(u, 0.035)), V2.add(V2.add(nb, V2.mul(n, -0.045)), V2.mul(u, 0.035)), V2.add(nb, V2.mul(n, -0.02))]);
    pen.g.fillStyle = pen.col('#9EA2A6'); pen.g.fill(pen.path(head, 0.3, 510));
    [-0.033, -0.011, 0.011, 0.033].forEach(o2 => pen.line([V2.add(V2.add(nb, V2.mul(n, o2)), V2.mul(u, 0.034)), V2.add(b, V2.mul(n, o2 * 0.9))], pen.col('#9EA2A6'), 0.01, 1));
    pen.line([V2.add(a, V2.mul(n, 0.008)), V2.add(nb, V2.mul(n, 0.008))], pen.lit('#C8CCD0', 1), 0.008, 0.8);
    if (loaded) { const tw = pen.blob([V2.add(b, [-0.08, -0.1]), V2.add(b, [0.06, -0.12]), V2.add(b, [0.08, -0.02]), V2.add(b, [0.015, 0.035]), V2.add(b, [-0.07, 0])]); pen.piece(tw, pen.col('#B0502F'), { seed: 511, kind: 'paper', tex: 0.6, lift: [0.008, 0.015] });
      [[-0.06, -0.08, 0.06, -0.04], [-0.055, -0.035, 0.065, 0.005]].forEach(([x0, y0, x1, y1]) => pen.line([V2.add(b, [x0, y0]), V2.add(b, [0, y0 - 0.03]), V2.add(b, [x1, y1])], pen.col('#EEC47C'), 0.011, 0.85)); }
  }
  const lerpPt = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  function counterFig(c, view, shot, t, st, face, o) {
    o = o || {}; const A = LV(view).shots[shot].anchors, s = HEAD_M * A.himCounter[2];
    const ph = propped(view, shot), lt = c.lt, tone = toneAt(lt), lit = litAt(lt);
    const L = RIG.light('pendant', { phone: [ph.x, ph.y], phoneCol: tone.col, phoneK: tone.k * lit });
    const p = { x: A.himCounter[0], y: A.himCounter[1], s, light: L, t, fork: st.fork, face, crop: 3.7, blink: o.blink };
    const built = RIG.POSES.him.counter(p);
    // the fork's two ends, as the pose computes them
    const fk = clamp(st.fork, 0, 1), fHand = lerpPt([0.93, 1.66], [0.32, 0.8], fk);
    let top = lerpPt(V2.add(fHand, [-0.02, -0.3]), V2.add(fHand, [0.14, 0.06]), fk), tip = lerpPt(V2.add(fHand, [-0.4, 0.22]), [0.04, 0.38], fk);
    // halted: the fork through the fist, its tines up and to the left at about 35 degrees, the pasta on them, in front of his chest
    if (st.halt > 0) { const hTop = V2.add(fHand, [0.18, 0.09]), hTip = V2.add(fHand, [-0.42, -0.2]); top = lerpPt(top, hTop, st.halt); tip = lerpPt(tip, hTip, st.halt); }
    const fbox = (a, b) => [Math.min(a[0], b[0]) - 0.28, Math.min(a[1], b[1]) - 0.28, Math.max(a[0], b[0]) + 0.28, Math.max(a[1], b[1]) + 0.28];
    built.ops.forEach(op => {
      if (!op || op.type !== 'paper') return;
      if (/^fork[AB]/.test(op.key)) op.box = fbox(top, tip);
      if (op.key === 'pan') { op.key = 'Q06pan'; op.draw = panPiece; op.box = [-1.0, 1.55, 1.0, 2.25]; }
      else if (/^forkA/.test(op.key)) { op.key = 'Q06' + op.key + (st.loaded ? 'L' : 'E') + (st.halt > 0 ? 'h' + st.halt.toFixed(2) : ''); op.draw = pen => forkPiece(pen, top, tip, st.loaded); }
      else if (/^forkB/.test(op.key)) { op.key = 'Q06' + op.key + (st.loaded ? 'L' : 'E') + (st.halt > 0 ? 'h' + st.halt.toFixed(2) : ''); op.draw = pen => forkPiece(pen, V2.lerp(top, tip, 0.5), tip, st.loaded); }
    });
    return RIG.drawFigure(c, { who: 'him', x: p.x, y: p.y, s, light: L, breath: RIG.breath(t, 2.5 * Math.min(2, s / 250)), ops: built.ops });
  }

  // ---------------------------------------------------------------- the insert: the phone filling the frame, propped on the salt
  // the counter top close and warm, the salt cellar beside it in focus, the wall and the beam far behind and soft
  const INS = { x: 1000, y: 540, h: 760, yaw: -0.1, pitch: 0.06, roll: -0.07 };
  function insertBg(c) {
    const cv = c.cache('Q06|insertBg3', g => {
      const S = O.S;
      // the wall under the pendant, far and soft: the lamp's narrow beam, blurred by the lens
      const L = GG.layer(); L.fillStyle = '#1E1920'; L.fillRect(0, 0, W, H);
      [['#2A2329', 1.0], ['#3A2F33', 0.66], ['#4C3E3B', 0.4]].forEach(([col, k]) => { L.fillStyle = col; L.beginPath(); L.moveTo(760 - 260 * k, -60); L.lineTo(760 + 260 * k, -60); L.lineTo(760 + 620 * k, 820); L.lineTo(760 - 620 * k, 820); L.closePath(); L.fill(); });
      // his shirt and the pan's dark rim, behind the phone and out of focus
      L.fillStyle = '#3E4658'; L.beginPath(); L.ellipse(300, 300, 420, 520, 0.1, 0, 7); L.fill();
      L.fillStyle = '#4A5264'; L.beginPath(); L.ellipse(350, 160, 300, 260, 0.1, 0, 7); L.fill();
      L.fillStyle = '#1E1A1C'; L.beginPath(); L.ellipse(240, 640, 380, 80, -0.04, 0, 7); L.fill();
      L.fillStyle = '#4A2A22'; L.beginPath(); L.ellipse(250, 622, 280, 46, -0.04, 0, 7); L.fill();
      g.filter = 'blur(30px)'; g.drawImage(L.canvas, 0, 0); g.filter = 'none';
      GG.texture(g, (() => { const p = new Path2D(); p.rect(0, 0, W, H); return p; })(), 0.35, 61, 'paper');
      // the counter top, near and in focus at the phone: warm cut bands of the pendant's pool
      const top = S().poly([[-40, 770], [W + 40, 756], [W + 40, H + 40], [-40, H + 40]]);
      const tp = GG.piece(g, top, { fill: '#4A3B36', rough: 1.4, seed: 601, tex: 0.6, kind: 'card', lift: [0, -10], liftAlpha: 0.7, liftBlur: 16 });
      g.save(); g.clip(tp); O.lightPool(g, 860, 860, [{ r: 1300, color: '#56453D' }, { r: 900, color: '#6E5747' }, { r: 520, color: '#876A53' }], { sy: 0.22, rough: 3, seed: 61 }); g.restore();
      GG.texture(g, tp, 0.45, 602, 'card');
      g.fillStyle = 'rgba(214,180,140,0.4)'; g.fill(S().poly([[-40, 770], [W + 40, 756], [W + 40, 762], [-40, 776]]).path(0.8, 603));
      O.dust(g, [[200, 860], [1700, 850], [1700, 1070], [200, 1080]], 160, '#E0C8A0', 'Q06crumbs');
      // the salt cellar the phone leans on: glass, salt, a dented lid
      const sx = 660, sb = 905, sw = 150, sh = 500;
      const salt = S().M(sx - sw, sb - sh).L(sx + sw, sb - sh).L(sx + sw + 8, sb - 10).Q(sx, sb + 16, sx - sw - 8, sb - 10).Z();
      const sp = GG.piece(g, salt, { fill: '#4C484E', rough: 0.9, seed: 611, tex: 0.35, lift: [-18, 10], liftAlpha: 0.55, liftBlur: 14 });
      g.save(); g.clip(sp); g.fillStyle = '#C9C2B4'; g.fill(S().M(sx - sw - 20, sb - sh * 0.56).Q(sx, sb - sh * 0.6, sx + sw + 20, sb - sh * 0.54).L(sx + sw + 20, sb + 20).L(sx - sw - 20, sb + 20).Z().path(1.6, 612));
      O.dust(g, [[sx - sw, sb - sh * 0.56], [sx + sw, sb - sh * 0.56], [sx + sw, sb], [sx - sw, sb]], 900, '#ECE3D0', 'Q06salt');
      g.fillStyle = 'rgba(236,227,208,0.22)'; g.fillRect(sx + sw * 0.55, sb - sh, 22, sh); g.fillStyle = 'rgba(236,227,208,0.12)'; g.fillRect(sx - sw * 0.7, sb - sh, 12, sh); g.restore();
      GG.crescent(g, sp, 10, 0, 'rgba(232,210,180,0.5)', 0.8);
      const cap = S().M(sx - sw - 6, sb - sh - 120).L(sx + sw + 6, sb - sh - 120).L(sx + sw + 12, sb - sh + 8).L(sx - sw - 12, sb - sh + 8).Z();
      const cp = GG.piece(g, cap, { fill: '#7E7A76', rough: 0.7, seed: 613, tex: 0.3, lift: [-8, 8], liftAlpha: 0.5 }); GG.crescent(g, cp, 0, -10, '#E4D8C4', 0.8); GG.crescent(g, cp, -14, 0, '#3A3634', 0.6);
      g.save(); g.clip(cp); g.fillStyle = 'rgba(30,26,24,0.5)'; for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(sx + i * 50, sb - sh - 70, 7, 0, 7); g.fill(); } g.restore();
    });
    c.g.drawImage(cv, 0, 0);
  }
  // his right hand at true scale (a hand is about 1.06 phone heights), the index out and the other fingers curled: the forearm
  // runs off the frame's edge, its sleeve rolled. It taps the glass twice (the picture; "Set as wallpaper"), then rests its
  // fingertip on the side button and presses it for each lock and each wake.
  const POINT = { basis: { x: [-0.75, -0.5, -0.4], z: [-0.15, -0.45, 0.88] }, fingers: [[-0.03, 0.12, 0.1, 0.06], [0.02, 1.35, 1.25, 0.6], [0.06, 1.4, 1.2, 0.55], [0.1, 1.35, 1.1, 0.5]],
    thumb: [0.85, 0.9, 0.55, 0.4], fdir: [0.75, 0.5, 0.4], fore: 1.6, foreR: 0.13 };
  const TAPS = [{ t0: 21.7, t1: 22.25, t2: 22.45, t3: 23.05, at: inf => inf.targets.last || inf.at(0.4, 0.75) },
    { t0: 42.8, t1: 43.33, t2: 43.7, t3: 44.15, at: inf => inf.targets.row || inf.at(0.5, 0.9) }];
  const SIDE = { t0: 44.0, t1: 44.6, t2: 52.0, t3: 52.7 };
  function handAt(lt, info) {
    const D = 1300;
    for (const T of TAPS) if (lt >= T.t0 && lt < T.t3) {
      const k = lt < T.t1 ? seg(lt, T.t0, T.t1, 'outCubic') : lt < T.t2 ? 1 : 1 - seg(lt, T.t2, T.t3, 'inCubic');
      const f = [0.55, 0.83]; const tgt = T.at(info); return { tip: [tgt[0] + f[0] * D * (1 - k), tgt[1] + f[1] * D * (1 - k)], fore: f, rel: [info.center[0] - tgt[0], info.center[1] - tgt[1]] };
    }
    if (lt >= SIDE.t0 && lt < SIDE.t3) {
      let push = 0; LOCKS.concat(WAKES).forEach(b => { push = Math.max(push, 1 - Math.abs(lt - b) / 0.16); });
      const k = lt < SIDE.t1 ? seg(lt, SIDE.t0, SIDE.t1, 'outCubic') : lt < SIDE.t2 ? 1 : 1 - seg(lt, SIDE.t2, SIDE.t3, 'inCubic');
      const f = [0.86, 0.51]; const e = info.at(1.0, 0.3), e2 = info.at(0.9, 0.3), out = [e[0] - e2[0], e[1] - e2[1]], ol = Math.hypot(out[0], out[1]) || 1;
      const tgt = [e[0] + out[0] / ol * 16, e[1] + out[1] / ol * 16];             // on the frame's edge, where the button is
      const d = D * (1 - k) + 12 * (1 - clamp(push, 0, 1));
      return { tip: [tgt[0] + f[0] * d, tgt[1] + f[1] * d], fore: f, rel: [info.center[0] - tgt[0], info.center[1] - tgt[1]] };
    }
    return null;
  }
  function insert(c, st, lt) {
    insertBg(c);
    const P = Object.assign({}, INS, screenAt(lt), { env: '#F0D8B8', lightDir: [-0.3, -1], shadow: { dx: 14, dy: 6, blur: 18, alpha: 0.6 } });
    const info = PHONE.where(P, c);
    PHONE.glow(c, { info, x: INS.x - 60, y: 900, r: 1300, sy: 0.3, k: 0.9 });
    PHONE.glow(c, { info, x: INS.x, y: 520, r: 1000, k: 0.25 });
    PHONE.draw(c, P);
    const h = handAt(twos(lt), info);
    if (h) {
      // the hand is real: drawn in the gloss layer over the phone, with the frame's grain laid into it; the screen's light on it
      // is placed relative to the hand, so the sculpture is reshaded only when the screen goes dark or wakes
      const s = 1.06 * INS.h, lit = litAt(lt) > 0.5 ? 1 : 0;
      const L = (x, y) => RIG.light('pendant', { phone: [x + h.rel[0], y + h.rel[1]], phoneCol: '#CDEFF3', phoneK: 0.45 * lit, phoneZ: 0.5 });
      const probe = RIG.hand(c, 'him', POINT, { x: 0, y: 0, s, fore: h.fore, light: L(0, 0), target: 'gl', alpha: 0 });
      const off = [h.tip[0] - probe.tips[0][0], h.tip[1] - probe.tips[0][1]];
      // the tip's own offset from the wrist is in the probe; the light rides with it
      RIG.hand(c, 'him', POINT, { x: off[0], y: off[1], s, fore: h.fore, light: L(off[0] + probe.tips[0][0], off[1] + probe.tips[0][1]), target: 'gl', shadow: { dx: 0.03, dy: 0.05, alpha: 0.45 } });
    }
  }

  // the counter's near edge, out of the pendant's pool: darker toward the bottom of the frame, so the subtitle sits on calm paper
  function nearEdge(c) {
    const g = c.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const gr = g.createLinearGradient(0, 900, 0, H); gr.addColorStop(0, 'rgba(14,10,12,0)'); gr.addColorStop(0.55, 'rgba(14,10,12,0.32)'); gr.addColorStop(1, 'rgba(14,10,12,0.55)');
    g.fillStyle = gr; g.fillRect(0, 900, W, H - 900); g.restore();
  }
  // the strip on the fridge, redrawn crisp over the set's (the same print: GG.photoStrip seed 3, the set's size, place and tilt) for
  // the pushed-in last shot, where the set's layer softens: so the four frames read beside the phone. The lamp's spill on it.
  let STRIP = null;
  function stripOver(c, view, shot) {
    const R = SETS.living.world, s = R.strip, z = R.fridge.z0 - 0.003, cr = Math.cos(s.rot), sr = Math.sin(s.rot);
    const at = (u, v) => LV(view).project([s.x + u * cr - v * sr, s.y + u * sr + v * cr, z], shot);
    const tl = at(-s.w / 2, s.h / 2), tr = at(s.w / 2, s.h / 2), bl = at(-s.w / 2, -s.h / 2);
    if (!tl || !tr || !bl) return;
    STRIP = STRIP || GG.photoStrip({ w: 240, h: 876, seed: 3, scale: 1.3 });
    const g = c.g; g.save(); g.transform((tr[0] - tl[0]) / STRIP.width, (tr[1] - tl[1]) / STRIP.width, (bl[0] - tl[0]) / STRIP.height, (bl[1] - tl[1]) / STRIP.height, tl[0], tl[1]);
    g.imageSmoothingQuality = 'high'; g.drawImage(STRIP, 0, 0);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#C9B094'; g.fillRect(0, 0, STRIP.width, STRIP.height); g.restore();
    // the red magnet over its top
    const m = at(0, s.h / 2 - 0.004), r = 0.011 * m[2];
    g.save(); g.fillStyle = '#8A2A24'; g.beginPath(); g.ellipse(m[0], m[1], r, r * 0.9, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(230,170,140,0.5)'; g.beginPath(); g.ellipse(m[0] - r * 0.3, m[1] - r * 0.35, r * 0.35, r * 0.25, -0.4, 0, 7); g.fill(); g.restore();
  }

  FILM.seq({
    id: 'Q06', title: 'The waterfall', dur: 64,
    setup() { PHONE.prepare(['waterfall']); },
    lines: [{ id: 'L007', at: 38.5 }],
    sound(S) {
      S.bed('room_night', 0, 64, { level: -46 });
      S.bed('pendant_hum', 0, 64, { level: -52 });
      // the fork in the pan, sparse: each twirl (the room is too far to hear), and the forkful laid back in the pan at the end
      [13.0, 16.8, 19.2].forEach(t => S.cue('fork_pan', t, { level: -36 })); S.cue('fork_pan', 59.3, { level: -42 });
      S.bed('chewing', 14.7, STOP_CHEW, { level: -38 });          // he stops chewing on the close shot
      S.cue('receive', 20.5);
      S.cue('tap', 22.25, { level: -40 });                        // his fingertip on the glass: the picture opens
      S.cue('tap', SET_PRESS, { level: -40 });                    // "Set as wallpaper"
      S.cue('swallow', 37.4, { level: -40 });
      LOCKS.forEach(t => S.cue('lock', t)); WAKES.forEach(t => S.cue('wake', t));
      S.bed('fridge_hum', 53, 64, { level: -48 });
    },
    shots: [
      // ---------------------------------------------------------------- the room: small, tidy for one, furnished for two; he eats
      { at: 0, name: 'room: the elevation, night; he eats at the counter in the kitchen half', draw(c, st, lt) {
        const V = LV('room'); V.back(c, lt, NIGHT);
        const e = eating(twos(lt));
        counterFig(c, 'room', 'wide', lt, e, eatFace(e, lt));
        drawPropped(c, 'room', 'wide', lt, { k: 0.9 });
        V.front(c, lt, NIGHT);
      } },
      // ---------------------------------------------------------------- the strip on the fridge: push down to the last frame
      { at: 7, name: 'fridge: insert, the photo-booth strip; push down to the last frame', draw(c, st, lt) {
        const u = seg(st, 0.3, 5.9, 'inOutSine');
        c.camera({ x: lerp(960, 945, u), y: lerp(540, 600, u), zoom: lerp(1.0, 1.15, u) });
        const V = LV('fridge'); V.back(c, lt, NIGHT); V.front(c, lt, NIGHT);
      }, post: { vig: 0.55 } },
      // ---------------------------------------------------------------- B2: he eats; the phone keeps him company across the salt
      { at: 13, name: 'counter: he eats from the pan, the phone propped against the salt; the chime; the forkful stops halfway', draw(c, st, lt) {
        const V = LV('counter'); V.back(c, lt, NIGHT);
        const tt = twos(lt), e = eating(tt);
        counterFig(c, 'counter', 'main', lt, e, eatFace(e, lt, tt > 20.7 ? { lids: 0.7, brows: 0.25 } : null));
        drawPropped(c, 'counter', 'main', lt);
        V.front(c, lt, NIGHT);
      } },
      // ---------------------------------------------------------------- the image: the bubble, his fingertip, the picture opens
      { at: 22, name: 'phone: the image, full frame, gloss; it arrives as a bubble and opens under his fingertip', draw(c, st, lt) {
        // once the picture is open, the camera leans in on it, slowly, as he does
        const u = seg(st, 1.6, 8, 'inOutSine'); c.camera({ x: lerp(960, 1005, u), y: lerp(540, 565, u), zoom: lerp(1.0, 1.06, u) });
        insert(c, st, lt);
      }, post: { vig: 0.42, halation: 0.55 } },
      // ---------------------------------------------------------------- he stops chewing; he looks for a long time; L007
      { at: 30, name: 'counter close: he stops chewing, the fork halfway; he looks for a long time; "I love this one." to the empty room', draw(c, st, lt) {
        const u = seg(st, 0, 12, 'inOutSine'); c.camera({ x: lerp(960, 1000, u), y: lerp(540, 560, u), zoom: lerp(1.0, 1.045, u) });
        const V = LV('counter'); V.back(c, lt, Object.assign({ shot: 'close' }, NIGHT));
        const tt = twos(lt), e = eating(tt);
        const swallow = 37.4, up = 38.1;
        // the look: his eyes stay on the phone, the whole time, the line included ("I love this one." is said to the picture)
        const f = Object.assign({}, F_PHONE, { lids: key(tt, [[30.3, 0.7], [33.6, 0.7], [35.5, 0.62]]) });
        const mouthful = tt >= STOP_CHEW && tt < swallow ? { mouth: 0, cheek: 0.6, cheekSide: -1 } : {};
        const face = Object.assign(f, e.chew ? RIG.chew(lt) : mouthful, {
          brows: tt < 33 ? 0.25 : 0, smile: key(tt, [[34.4, 0], [36.6, 0.25], [up, 0.25], [up + 0.4, 0.125], [41, 0.125], [42, 0.25]]) },
          tt >= swallow && tt < swallow + 0.25 ? { pitch: f.pitch + 0.06 } : {});
        if (tt >= 38.5) face.mouth = RIG.mouthFor('L007', lt - 38.5);
        if (tt > 33.4 && tt < 33.6) face.lids = 0.1;              // one slow blink, mid-look
        counterFig(c, 'counter', 'close', lt, e, face, { blink: false });
        drawPropped(c, 'counter', 'close', lt);
        V.front(c, lt, Object.assign({ shot: 'close' }, NIGHT));
        nearEdge(c);
      } },
      // ---------------------------------------------------------------- wallpaper; locks, wakes: there they are, three times
      { at: 42, name: 'phone: set as wallpaper; his fingertip on the side button: locks, wakes, there they are (x3)', draw(c, st, lt) { insert(c, st, lt); }, post: { vig: 0.42, halation: 0.55 } },
      // ---------------------------------------------------------------- the rhyme: the strip on the fridge and the phone in one frame
      { at: 53, name: 'counter: the strip at left, the phone at right, him between; slow push; he lays the forkful back in the pan', draw(c, st, lt) {
        // framed on the two pictures: the strip near the left edge, the lit wallpaper near the right, and a slow push that lands
        // (the set's layers end at the frame, so the centre stays at least 960 / zoom from the left and 540 / zoom from the bottom)
        const u = seg(st, 0.2, 10.8, 'inOutSine'); c.camera({ x: lerp(780, 712, u), y: lerp(640, 680, u), zoom: lerp(1.24, 1.36, u) });
        const V = LV('counter'); V.back(c, lt, NIGHT);
        stripOver(c, 'counter', 'main');
        const tt = twos(lt), e = eating(tt);
        const face = Object.assign({}, F_PHONE, { smile: key(tt, [[53, 0.25], [55, 0.375]]), lids: 0.64 });
        counterFig(c, 'counter', 'main', lt, e, face);
        drawPropped(c, 'counter', 'main', lt);
        V.front(c, lt, NIGHT);
        nearEdge(c);
      } },
    ],
  });
})();
