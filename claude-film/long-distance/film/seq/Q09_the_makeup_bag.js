/* LONG DISTANCE · Q09 THE MAKEUP BAG (58 s) · S11, S12 (A044–A051), L012–L016
   The wardrobe is C's grammar exactly: his clothes on the left, bare hangers on the right. He lifts down her old bag and leaves a
   clean rectangle in the dust. Then the phone does the one thing he cannot stop: it buzzes. The lock screen is the first time the
   audience sees the waterfall with something else on top of it: "Call me tonight?". She turns the screen to him.
   One geography for the whole argument (Q09–Q10): she stands in the empty half, the pale rectangle and the window's light behind
   her, looking screen left; he stands in his half, the kitchen (the fridge, the counter) behind him, looking screen right.
   Shots: 0 wardrobe (from behind him, he opens it) · 6 shelf (his arm lifts the bag; the rectangle) · 12 wardrobe close (the buzz;
   rigid, eyes shut) · 17 room by day (he comes out fast; she stands over the couch) · 22 INSERT the lock screen · 27 / 29.2 / 31.3 /
   35.8 him and her, close (L012–L015) · 38.5 between, B3 (she turns the screen to him) · 43.3 over his shoulder: the screen between
   them (L016) · 50.5 his hands, his thumb on the broken zip. */
(function () {
  'use strict';
  const { W, H } = OTM; const seg = FILM.seg, key = FILM.key, twos = FILM.twos, E = FILM.ease, clamp = FILM.clamp, lerp = FILM.lerp;
  const LV = () => SETS.living.views, BV = () => SETS.bedroom.views;
  const CALL = () => ({ banner: { text: PHONE.MSG.callMeTonight, in: 1 } });

  // =================================================================================================================================
  // The kit shared by Q09, Q10 and Q11 (the last three sequences): light, pushes, the two close-up backgrounds, softened layers,
  // a phone held in a hand. Q10 and Q11 read it from window.LD_END (this file loads first).
  // =================================================================================================================================
  const K = window.LD_END = {};
  // the visit's light, from the window on the right wall, read by the sculptures and the paper (one light per shot)
  K.setLight = function (L, o) {
    o = o || {};
    const from = o.from || [L.dir[0] > 0 ? 0.82 : -0.82, -0.55];
    return RIG.light('day', Object.assign({ keys: [{ dir: L.dir, col: L.color, k: L.k * (o.keyK || 1), poster: L.poster, levels: L.levels }], amb: L.amb, paper: { from } }, o.rig || {}));
  };
  // a push that keeps the screen point (px, py) still while the frame closes in on it
  K.push = (c, px, py, z) => c.camera({ x: px + (W / 2 - px) / z, y: py + (H / 2 - py) / z, zoom: z });
  // a context that draws into an offscreen canvas (to soften a figure or a set layer once and keep it)
  const dummyEm = () => K._em || (K._em = OTM.makeCanvas(8, 8).getContext('2d'));
  K.soft = function (c, keyName, blur, fn) {
    return c.cache(keyName, (g, cv) => {
      const tmp = OTM.makeCanvas(W, H), tg = tmp.getContext('2d');
      const fake = Object.assign({}, c, { g: tg, gl: tg, em: dummyEm(), before: [], after: [] });
      fn(fake, tg);
      g.filter = `blur(${blur}px)`; g.drawImage(tmp, 0, 0); g.filter = 'none';
    });
  };
  // his light in the close-ups against the kitchen side: the window is behind the camera, to the right
  K.kitchenLight = (o) => RIG.light('day', Object.assign({ keys: [{ dir: [0.72, -0.32, 0.6], col: '#E6EBEE', k: 0.6, poster: [0.12, 0.5], levels: [0.55, 1] }], amb: '#62645F', paper: { from: [0.82, -0.55] } }, o || {}));
  // the reverse on him: from her side of the room, looking back at the kitchen. Behind him, out of focus: the fridge (the strip on
  // it), the end of the counter, the pendant, the kitchen wall in shade; the window's light on the wall at the right
  K.kitchenPlate = function (c) {
    return c.cache('END|kitchen', (g, cv) => {
      const S = OTM.S, P = p => { const q = new Path2D(); q.rect(0, 0, W, H); return q; };
      g.fillStyle = '#6A6C66'; g.fillRect(0, 0, W, H); GG.texture(g, P(), 0.55, 1201, 'paper');
      g.save(); g.globalCompositeOperation = 'multiply'; const sh = g.createLinearGradient(0, 0, W, 0); sh.addColorStop(0, 'rgba(70,72,74,0.7)'); sh.addColorStop(0.6, 'rgba(120,122,124,0.15)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, W, H); g.restore();
      // the window's light lies on the far wall at the right, in two cut bands
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(196,202,196,0.16)'; g.fill(S().poly([[1180, -60], [2000, -60], [2000, 1140], [1440, 1140]]).path(3, 1202)); g.fillStyle = 'rgba(196,202,196,0.12)'; g.fill(S().poly([[1460, -60], [2000, -60], [2000, 1140], [1700, 1140]]).path(3, 1203)); g.restore();
      // the fridge, cream card, its door seam, its handle; the strip under its red magnet
      const fr = GG.piece(g, S().rect(-60, -60, 640, 1260), { fill: '#BDB8AC', rough: 1.1, seed: 1204, tex: 0.6, kind: 'card', lift: [12, 6], liftAlpha: 0.5, liftBlur: 16 });
      g.save(); g.clip(fr); g.fillStyle = 'rgba(70,66,60,0.35)'; g.fillRect(500, -60, 80, 1260); g.fillStyle = 'rgba(60,58,54,0.45)'; g.fillRect(-60, 690, 640, 7); g.restore();
      g.fillStyle = '#8E8A80'; g.fillRect(470, 300, 16, 330);
      const st = GG.photoStrip({ w: 124, h: 430, seed: 3, scale: 1.1 });
      g.save(); g.translate(250, 400); g.rotate(-0.045); g.fillStyle = 'rgba(40,36,34,0.3)'; g.fillRect(-34, -118, 80, 260); g.drawImage(st, -40, -124, 78, 254); g.restore();
      g.fillStyle = '#A8392F'; g.beginPath(); g.ellipse(254, 282, 14, 12, 0, 0, 7); g.fill();
      // the pendant over the counter, unlit by day
      g.fillStyle = '#3A3A38'; g.fillRect(1236, -60, 5, 150); GG.piece(g, S().poly([[1170, 150], [1306, 150], [1352, 236], [1124, 236]]), { fill: '#3E3E3C', rough: 0.6, seed: 1205, tex: 0.4, lift: [4, 8], liftAlpha: 0.45 });
      // the counter's end at hip height across the right of the frame
      GG.piece(g, S().rect(560, 880, 1460, 300), { fill: '#5A544C', rough: 1.2, seed: 1206, tex: 0.6, kind: 'card', lift: [0, -10], liftAlpha: 0.45 });
      const top = GG.piece(g, S().rect(540, 852, 1480, 40), { fill: '#9A8A74', rough: 1, seed: 1207, tex: 0.5, kind: 'card', lift: [0, 8], liftAlpha: 0.5 }); GG.crescent(g, top, 0, -5, '#B8A68C', 0.8);
      // the lens is on him: everything behind him is soft
      const tmp = OTM.makeCanvas(W, H), tg = tmp.getContext('2d'); tg.filter = 'blur(7px)'; tg.drawImage(cv, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(tmp, 0, 0);
    });
  };
  // him, close, against the kitchen: he faces screen right (toward her), the bag held low in both hands
  K.himClose = function (c, lt, o) {
    o = o || {};
    if (o.z) K.push(c, 820, 520, o.z);
    c.g.drawImage(K.kitchenPlate(c), 0, 0);
    return RIG.draw(c, 'him', 'bag', { x: 830, y: 500, s: 414, light: K.kitchenLight(), t: lt, tau: 0.3, zip: o.zip || 0, crop: 3.2, breath: o.breath, blink: o.blink, face: o.face });
  };
  // her singles' background: the set's between/her, with the pendant painted out. One floor plan for the argument: the kitchen,
  // the fridge and the pendant are on his side, behind him; the pale rectangle, the shelf, the window's light and the couch on hers
  K.herPlate = function (c) {
    return c.cache('END|herPlate', (g, cv) => {
      const fake = Object.assign({}, c, { g, gl: g, em: dummyEm(), before: [], after: [] });
      g.setTransform(1, 0, 0, 1, 0, 0); LV().between.back(fake, 0, { tod: 'day', shot: 'her' });
      // the plain wall to its right, moved over it, with a feathered edge (the plate is out of focus, so the patch is invisible)
      const pw = 400, ph = 330, x0 = 90, src = 440;
      const tmp = OTM.makeCanvas(pw, ph), tg = tmp.getContext('2d');
      tg.drawImage(cv, src, 0, pw, ph, 0, 0, pw, ph);
      const m = OTM.makeCanvas(pw, ph), mg = m.getContext('2d'); mg.filter = 'blur(22px)'; mg.fillStyle = '#000'; mg.fillRect(34, -60, pw - 68, ph + 60 - 44);
      tg.globalCompositeOperation = 'destination-in'; tg.drawImage(m, 0, 0);
      g.drawImage(tmp, x0, 0);
    });
  };
  // her, close: the pale rectangle and the window's light behind her (between/her); she faces screen left (toward him)
  K.herClose = function (c, lt, o) {
    o = o || {};
    const V = LV().between, sh = V.shots.her, A = sh.anchors;
    if (o.z) K.push(c, 1180, 520, o.z);
    c.g.drawImage(K.herPlate(c), 0, 0);
    const s = 0.23 * A.herBetween[2], x = A.herBetween[0] + 30, y = A.herBetween[1] - (o.lift == null ? 70 : o.lift);
    const L = K.setLight(sh.lights.day, { rig: o.phoneAt ? { phone: o.phoneAt, phoneCol: '#C8EEF2', phoneK: o.phoneK == null ? 0.5 : o.phoneK } : {} });
    return RIG.draw(c, 'her', o.pose || 'stand', Object.assign({ x, y, s, light: L, t: o.still ? null : lt, flip: true, crop: 3.2, face: o.face, blink: o.blink }, o.p || {}));
  };
  // a phone held in one hand, the hand placed so the phone lands at P (world): the rig's true-size grip. Draws the hand, the phone
  // (gloss), then the thumb and fingertips over the glass. o: {who, pose ('thumb' | 'phone'), fore, flip, reach, tap, light, phone:
  // PHONE params (screen, state, env...)}. Returns {hand, info}
  const GRIP = {};
  K.heldPhone = function (c, P, h, o) {
    const who = o.who || 'him', pose = o.pose || 'thumb', s = h / 1.03, fore = o.fore || [0.3, 1], flip = !!o.flip;
    const gk = [who, pose, Math.round(s), fore.join(','), flip, o.rot || 0].join('|');
    if (!GRIP[gk]) {   // the offset from the wrist to the phone's centre, measured once on a scratch canvas
      const tg = OTM.makeCanvas(16, 16).getContext('2d');
      const pr = RIG.hand(c, who, pose, { x: 0, y: 0, s, fore, flip, rot: o.rot, light: o.light, target: tg, reach: o.reach, tap: o.tap });
      GRIP[gk] = pr.phone ? { dx: pr.phone.x, dy: pr.phone.y, angle: pr.phone.angle, h: pr.phone.h } : { dx: 0, dy: -0.5 * h, angle: 0, h };
    }
    const G = GRIP[gk], hp = { x: P[0] - G.dx, y: P[1] - G.dy, s, fore, flip, rot: o.rot, light: o.light, reach: o.reach, tap: o.tap };
    const hand = RIG.hand(c, who, pose, hp);
    const ph = Object.assign({ x: P[0], y: P[1], h: G.h, roll: G.angle }, o.phone || {});
    const info = PHONE.where(ph, c);
    if (o.glow !== false) PHONE.glow(c, Object.assign({ info, k: 0.55, r: G.h * 1.8 }, o.glow || {}));
    PHONE.draw(c, ph);
    RIG.hand(c, who, pose, Object.assign({}, hp, { only: ['thumb', 'dist'], target: 'gl', shadow: { alpha: 0.28 } }));
    return { hand, info };
  };

  // one arm whose body is off the frame (an insert): the rig's RIG.arm, from a shoulder (world px) to the wrist, in its sleeve, with
  // its hand. o: {who, shoulder, s (px per head), light, hand, hp, side, bend, rot (the hand's turn), wrist | phoneAt (where the
  // phone in the grip must land: the wrist is found from it), phone: PHONE params (drawn at the grip's true-size phone), glow}
  const ARMOFF = {};
  const armP = o => ({ shoulder: o.shoulder, target: o.wrist, s: o.s, hand: o.hand || 'thumb', hp: o.hp || {}, side: o.side || 'R', bend: o.bend, light: o.light, handRot: o.rot });
  K.arm = function (c, o) {
    if (o.phoneAt) {
      const k = [o.who, o.s, o.rot, o.side, o.hand, JSON.stringify(o.hp || {}), Math.round(o.shoulder[0] - o.phoneAt[0]), Math.round(o.shoulder[1] - o.phoneAt[1])].join('|');
      if (!ARMOFF[k]) {   // measure the wrist -> phone offset once, drawing into a scratch canvas
        const tg = K._probe || (K._probe = OTM.makeCanvas(W, H).getContext('2d')); tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
        const fake = Object.assign({}, c, { g: tg, gl: tg, em: dummyEm(), before: [], after: [] });
        const w0 = [W / 2, H / 2], sh0 = [w0[0] + o.shoulder[0] - o.phoneAt[0], w0[1] + o.shoulder[1] - o.phoneAt[1]];
        const r = RIG.arm(fake, o.who, Object.assign(armP(o), { shoulder: sh0, target: w0 }));
        ARMOFF[k] = r.hand && r.hand.phone ? [r.hand.phone.x - (r.wrist ? r.wrist[0] : w0[0]), r.hand.phone.y - (r.wrist ? r.wrist[1] : w0[1])] : [0, -0.3 * o.s];
      }
      o = Object.assign({}, o, { wrist: [o.phoneAt[0] - ARMOFF[k][0], o.phoneAt[1] - ARMOFF[k][1]] });
    }
    const r = RIG.arm(c, o.who, armP(o));
    const hand = r.hand; let info = null;
    if (o.phone && hand && hand.phone) {
      const hp2 = hand.phone, P = Object.assign({ x: hp2.x, y: hp2.y, h: hp2.h, roll: hp2.angle }, o.phone);
      info = PHONE.where(P, c);
      if (o.glow !== false) PHONE.glow(c, Object.assign({ info, k: 0.55, r: hp2.h * 1.8 }, o.glow || {}));
      PHONE.draw(c, P); r.over(c);
    }
    return { fig: r, hand, info };
  };

  // the two-shot, side-on to the line between them (between/two's camera): him in his half, three-quarter to screen right, the fridge,
  // the counter and the pendant behind him; her in front of the pale rectangle, three-quarter to screen left, the window's light and
  // the couch behind her. o.him / o.her: {pose, p (pose fields), face}. o.herPhone: PHONE params for the phone in her hand.
  // o.himPhone: PHONE params for the phone in his (after the trade). Returns {him, her}
  K.W_HIM = [2.2, 1.62, 2.6];
  K.two = function (c, lt, o) {
    o = o || {};
    const V = LV().between, A = V.anchors;
    if (o.z) K.push(c, o.zAt ? o.zAt[0] : 870, o.zAt ? o.zAt[1] : 520, o.z);
    V.back(c, lt, { tod: 'day' });
    const Ls = V.shots.two.lights.day, hp = V.project(K.W_HIM, 'two'), her0 = A.herBetween;
    const ho = o.her || {}, mo = o.him || {};
    const Lh = K.setLight(Ls, o.herPhone ? { rig: { phone: [A.phoneHeld[0] + 100, A.phoneHeld[1] - 20], phoneCol: '#C8EEF2', phoneK: 0.4 } } : {});
    const her = RIG.draw(c, 'her', ho.pose || 'phone', Object.assign({ x: her0[0] + 20, y: her0[1], s: 0.23 * her0[2], light: Lh, t: lt, flip: true, tau: 0.42, crop: 5.2, face: ho.face }, ho.p || {}));
    if (o.herPhone && her.phone) {
      const ph = her.phone, P = Object.assign({ x: ph.x, y: ph.y, h: ph.h, roll: ph.angle, yaw: -0.3, screen: 'lock', state: CALL(), env: '#B8BEC0', sheen: 0.07 }, o.herPhone);
      PHONE.glow(c, { info: PHONE.where(P, c), k: 0.42, r: ph.h * 2.6 });
      PHONE.draw(c, P); her.over(c);
    }
    if (ho.bag && her.hands[ho.bag.hand || 'R']) { const g2 = her.hands[ho.bag.hand || 'R'].grip; RIG.bag(c, g2[0] + (ho.bag.dx || 0), g2[1] + 0.3 * 0.23 * her0[2], 0.23 * her0[2] * 0.95, { light: Lh, rot: 0.04 }); }
    const Lm = K.setLight(Ls, o.himPhone ? { rig: { phone: [hp[0] + 0.5 * 0.23 * hp[2], hp[1] + 2.3 * 0.23 * hp[2]], phoneCol: '#BCC2C4', phoneK: 0 } } : {});
    const him = RIG.draw(c, 'him', mo.pose || 'bag', Object.assign({ x: hp[0], y: hp[1], s: 0.23 * hp[2], light: Lm, t: lt, tau: 0.45, crop: 5.6, face: mo.face }, mo.p || {}));
    const hph = o.himPhone && (him.phone || (him.hands.R && him.hands.R.phone) || (him.hands.L && him.hands.L.phone));
    if (hph) { PHONE.draw(c, Object.assign({ x: hph.x, y: hph.y, h: hph.h, roll: hph.angle, pitch: 0.75, screen: 'black', env: '#B8BEC0' }, o.himPhone)); him.over(c); }
    return { him, her };
  };

  // =================================================================================================================================
  // Q09
  // =================================================================================================================================
  const setLight = K.setLight, push = K.push;
  const ROOM = { tod: 'day' };
  const W_HER = [4.4, 1.5, 3.1];          // standing over the couch at its far end, turned to the phone on the middle cushion, looking down at it

  // ------------------------------------------------------------------ 0–6 the wardrobe: from behind him, he opens it, steps aside
  // a door knob's screen point as the doors open (the wardrobe's own geometry, bedroom.js)
  function knob(which, a) {
    const cam = BV().wardrobe.cam, ang = a * 1.83, hz = which === 'left' ? 1.2 : 0, dirz = which === 'left' ? -1 : 1;
    const x = -1.80 + 0.9 * 0.6 * Math.sin(ang), z = hz + dirz * 0.9 * 0.6 * Math.cos(ang); return cam.p(x, 1.02, z);
  }
  function wardrobeOpen(c, st, lt) {
    const V = BV().wardrobe, A = V.anchors; const tt = twos(lt);
    // his hands on the two knobs; he pulls (0.45), the doors come with his hands (to 1.3) and swing on; he steps back to his side
    const doors = E.inOutSine(seg(lt, 0.45, 2.05));
    const swing = lt < 1.4 ? 0 : 0.9 * Math.exp(-(lt - 1.4) * 0.9);
    V.back(c, lt, { doors, swing, bag: true });
    const L = RIG.light('day', { keys: [{ dir: [-0.8, -0.3, -0.45], col: '#E6EBEE', k: 0.62, poster: [0.12, 0.5], levels: [0.55, 1] }], paper: { from: [-0.82, -0.5] } });
    const s = 0.23 * A.head[2] * 1.12;
    const step = E.inOutSine(seg(tt, 2.5, 3.6)), x = lerp(960, 640, step), y = A.head[1] + 30 + 10 * Math.sin(Math.PI * step);
    const held = E.inOutSine(seg(Math.min(tt, 1.3), 0.45, 2.05)), let_ = E.inOutSine(seg(tt, 1.25, 1.8));
    const arm = (wh, sg) => { const k = knob(wh === 'left' ? 'right' : 'left', held); const kf = [-(k[0] - x) / s, (k[1] - y) / s]; const rest = [sg * 0.62, 2.95];
      return let_ < 0.5 ? { to: [lerp(kf[0], rest[0], let_), lerp(kf[1], rest[1], let_)], bend: sg, hand: 'door', hp: { tight: 0.3 }, behind: true }
        : { to: [lerp(kf[0], rest[0], let_), lerp(kf[1], rest[1], let_)], bend: sg, hand: 'relax', hp: { close: 0.4 } }; };
    RIG.draw(c, 'him', 'stand', { view: 'back', x, y, s, light: L, t: lt, crop: 4.0, armL: arm('left', -1), armR: arm('right', 1), face: { yaw: Math.PI - lerp(0.1, 0.55, step), pitch: 0.08 } });
  }

  // ------------------------------------------------------------------ 6–12 the shelf: his arm reaches up, lifts the bag down
  function shelfShot(c, st, lt) {
    const V = BV().shelf, A = V.anchors; const tt = twos(lt);
    const lifted = tt >= 8.08;
    push(c, 1423, 760, 1 + 0.035 * E.inOutSine(seg(lt, 6, 12.5)));
    V.back(c, lt, { bag: !lifted, doors: 1 });
    const L = RIG.light('day', { keys: [{ dir: [-0.8, -0.4, -0.3], col: '#E6EBEE', k: 0.62, poster: [0.12, 0.5], levels: [0.55, 1] }], paper: { from: [-0.82, -0.5] } });
    // the arm: up from his shoulder below the frame (7.0–8.0), the hand closes on the bag's top (8.0), lifts it up and toward him (8.1–9.4)
    const inK = E.inOutSine(seg(tt, 7.0, 8.0)), up = E.inOutSine(seg(tt, 8.1, 9.4));
    if (tt < 7.0 || up >= 1) return;
    const bag = A.bag, s = 540, fx = 1200, fy = 1440;
    const grip = [bag[0] + 10, bag[1] - 40], start = [1520, 1240];
    let wr = [lerp(start[0], grip[0], inK), lerp(start[1], grip[1], inK)];
    const lift = [lerp(0, 140, up), lerp(0, -200, up) + lerp(0, 820, up * up)];
    wr = [wr[0] + lift[0], wr[1] + lift[1]];
    if (lifted) SETS.bedroom.bag(c, bag[0] + lift[0], bag[1] + lift[1] - 6 * Math.sin(up * 3), 1614, -0.12 * up);
    RIG.draw(c, 'him', 'stand', { view: 'back', x: fx, y: fy, s, light: L, t: lt, armL: { a1: -0.1, a2: 0.1, hand: false },
      armR: { to: [(wr[0] - fx) / s, (wr[1] + 0.25 * s - fy) / s], bend: -1, hand: 'take', hp: { close: tt < 8.0 ? 0.3 : 0.85 }, over: true } });
  }

  // ------------------------------------------------------------------ 12–17 close: the buzz through the wall; rigid, eyes shut
  function wardrobeClose(c, st, lt) {
    const V = BV().wardrobe; const tt = twos(lt);
    // the open wardrobe behind him, out of focus (he stands well in front of it)
    const bg = K.soft(c, 'Q09|wardrobeSoft', 6, (fc, tg) => { tg.setTransform(1.3, 0, 0, 1.3, 960 - 1.3 * 860, 540 - 1.3 * 470); V.back(fc, 0, { doors: 1, bag: false, swing: 0 }); });
    c.g.drawImage(bg, 0, 0);
    push(c, 760, 520, 1 + 0.03 * E.inOutSine(seg(lt, 12, 17)));
    const L = RIG.light('day', { keys: [{ dir: [-0.75, -0.3, 0.55], col: '#E6EBEE', k: 0.62, poster: [0.12, 0.5], levels: [0.55, 1] }], paper: { from: [-0.82, -0.55] } });
    // eyes on the bag in his hands, thumb on the zip. The buzz (12.5): his head comes up, toward the wall; then he shuts his eyes
    const up = E.outCubic(seg(tt, 12.62, 12.95)), shut = E.inOutSine(seg(tt, 14.0, 14.7));
    const face = { yaw: lerp(0.32, 0.12, up), pitch: lerp(0.42, 0.06, up), lids: lerp(lerp(0.34, 0.86, up), 0, shut), gaze: [lerp(0, 0.25, up), lerp(0.6, 0.05, up)], brows: lerp(0, 0.25, up) };
    const jolt = tt >= 12.58 && tt < 12.75 ? -4 : 0;
    RIG.draw(c, 'him', 'bag', { x: 760, y: 430 + jolt, s: 380, light: L, t: lt, crop: 3.3, tau: 0.3, zip: tt < 12.6 ? tt * 0.75 : 12.6 * 0.75, breath: tt < 12.6 ? undefined : 0, blink: false, face });
  }

  // ------------------------------------------------------------------ 17–22 the room by day: he comes out fast; too late
  function phoneOnCushion(c, V) {
    const a = V.anchors.phoneCushion;
    const P = { x: a[0] + 2, y: a[1] - 3, h: 0.15 * a[2] * 0.98, pitch: 1.32, spin: 0.35, screen: 'lock', state: CALL(), env: '#B8BEC0', sheen: 0.08 };
    PHONE.glow(c, { info: PHONE.where(P, c), k: 0.5, sy: 0.32, r: a[2] * 0.42 });
    PHONE.draw(c, P);
  }
  function roomArrive(c, st, lt) {
    const V = LV().room;
    // he comes out (17.2) and stops (18.9); then the frame closes in on her (19.0–21.6), so we read her before the insert
    push(c, 1420, 700, 1 + 0.15 * E.inOutSine(seg(lt, 18.8, 21.8)));
    V.back(c, lt, ROOM); V.front(c, lt, ROOM);
    const tt = twos(lt);
    phoneOnCushion(c, V);
    const p = V.project(W_HER), ph = V.anchors.phoneCushion;
    // at the couch's far end, turned to the lit phone on the cushion and bent to it, her head down, her face in its cool light;
    // she does not look up when he comes in
    const L = setLight(V.shots.wide.lights.day, { rig: { phone: [ph[0], ph[1] - 20], phoneCol: '#C8EEF2', phoneK: 0.55, phoneZ: 0.4 } });
    RIG.draw(c, 'her', 'stand', { x: p[0], y: p[1], s: 0.23 * p[2], light: L, t: lt, flip: true, tau: 0.55, armL: { to: [-0.15, 2.5], bend: 1, hand: 'strap', front: true },
      face: { yaw: 0.55, pitch: 0.85, roll: 0.12, lids: 0.38, gaze: [0.35, 0.6] } });
    const L2 = setLight(V.shots.wide.lights.day), a = V.anchors.himBetween, s = 0.23 * a[2];
    if (tt < 18.92) {
      const u = seg(tt, 17.25, 18.92); const x = lerp(-150, a[0] - 20, u);
      if (tt >= 17.25) RIG.draw(c, 'him', 'walk', { x, y: a[1], s, light: L2, t: lt, phase: 0.5 + (tt - 17.25) * 1.5, carry: 'bag', face: { yaw: 1.05, pitch: 0.12, lids: 0.75 } });
    } else {
      const tau = tt < 19.05 ? 0.95 : tt < 19.2 ? 0.66 : 0.42;
      RIG.draw(c, 'him', 'bag', { x: a[0], y: a[1], s, light: L2, t: lt, tau, face: { yaw: 0.55, pitch: 0.16, lids: 0.8, gaze: [0.35, 0.1] } });
    }
  }

  // ------------------------------------------------------------------ 22–27 INSERT: the lock screen on the cushion
  function cushionPlate(c) {
    return c.cache('Q09|cushion', (g) => {
      const S = OTM.S; g.fillStyle = '#5E5A53'; g.fillRect(0, 0, W, H);
      const a = GG.blob([[-80, -80], [1180, -80], [1060, 400], [1000, 760], [1040, 1180], [-80, 1180]]);
      const pa = GG.piece(g, a, { fill: '#6B665E', rough: 2.2, seed: 941, tex: 0.7, kind: 'cloth', lift: [10, 12], liftAlpha: 0.55, liftBlur: 22 });
      GG.crescent(g, pa, 18, 10, '#4E4A44', 0.7);
      const b = GG.blob([[1230, -80], [2000, -80], [2000, 1180], [1110, 1180], [1080, 780], [1130, 380]]);
      const pb = GG.piece(g, b, { fill: '#716C64', rough: 2.2, seed: 942, tex: 0.7, kind: 'cloth', lift: [-8, 10], liftAlpha: 0.55, liftBlur: 22 });
      GG.crescent(g, pb, -18, -6, '#8E897F', 0.85);
      g.save(); g.clip(pb); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(200,204,196,0.16)'; g.fill(S().poly([[1500, -100], [2100, -100], [2100, 1200], [1220, 1200]]).path(3, 943)); g.fillStyle = 'rgba(200,204,196,0.12)'; g.fill(S().poly([[1700, -100], [2100, -100], [2100, 1200], [1500, 1200]]).path(3, 944)); g.restore();
      g.save(); g.filter = 'blur(28px)'; g.fillStyle = 'rgba(24,22,20,0.32)'; g.beginPath(); g.ellipse(960, 560, 380, 470, -0.1, 0, 7); g.fill(); g.restore();
      [[[200, 300], [420, 360], [600, 330]], [[260, 900], [480, 860], [700, 920]], [[1400, 200], [1600, 260], [1820, 230]], [[1380, 860], [1600, 820], [1840, 880]]].forEach(cv => { g.save(); g.lineCap = 'round'; g.filter = 'blur(3px)'; g.strokeStyle = 'rgba(40,36,32,0.45)'; g.lineWidth = 8; g.stroke(GG.spline(cv, false)); g.restore(); });
      const tmp = OTM.makeCanvas(W, H), tg = tmp.getContext('2d'); tg.filter = 'blur(6px)'; tg.drawImage(g.canvas, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(tmp, 0, 0);
    });
  }
  function lockInsert(c, st, lt) {
    c.camera({ x: 960, y: 520, zoom: 1 + 0.07 * E.inOutSine(seg(lt, 22, 27)) });
    c.g.drawImage(cushionPlate(c), -20, -20, W + 40, H + 40);
    const P = { x: 960, y: 540, h: 880, roll: -0.07, pitch: 0.12, persp: 2600, screen: 'lock', state: CALL(), env: '#C0C4C2', sheen: 0.06, shadow: { dx: 26, dy: 34, blur: 46, alpha: 0.55 } };
    PHONE.glow(c, { info: PHONE.where(P, c), k: 0.55, r: 1300 });
    PHONE.draw(c, P);
  }

  // ------------------------------------------------------------------ 27–38.5 the exchange, close: him (kitchen side), her (the empty half)
  const mHim = lt => Math.min(2, RIG.mouthFor('L012', lt - 27.2) || RIG.mouthFor('L014', lt - 31.5));
  const mHer = lt => RIG.mouthFor('L013', lt - 29.4) || RIG.mouthFor('L015', lt - 36.0);
  // 27.0: "Don't look at my phone." He looks at her: too sharp, then ashamed of it
  function himDont(c, st, lt) {
    const tt = twos(lt);
    K.himClose(c, lt, { zip: 0, face: { yaw: 0.32, pitch: 0.12, lids: key(tt, [[27, 0.8], [28.4, 0.8], [28.9, 0.62]]), gaze: [0.35, 0.05], brows: 0.25, mouth: mHim(lt) } });
  }
  // 29.2: "What is this?" She looks at him, the phone below her, out of frame
  function herWhat(c, st, lt) {
    const tt = twos(lt);
    K.herClose(c, lt, { face: { yaw: 0.45, pitch: 0.1, lids: key(tt, [[29.2, 0.6], [29.8, 0.72]]), gaze: [0.4, 0.06], mouth: mHer(lt) }, p: { tau: 0.5, armL: { to: [-0.15, 2.5], bend: 1, hand: 'strap', front: true } } });
  }
  // 31.3: "It's just a friend from work. It's nothing. It's none of your business." His eyes go to the bag; his thumb finds the zip
  function himFriend(c, st, lt) {
    const tt = twos(lt);
    const away = key(tt, [[31.6, 0], [32.4, 1], [34.0, 1], [34.5, 0.55], [35.2, 0.85]]);
    K.himClose(c, lt, { zip: Math.max(0, tt - 32.4) * 0.75, face: { yaw: lerp(0.32, 0.18, away), pitch: lerp(0.12, 0.42, away), lids: lerp(0.72, 0.36, away), gaze: [lerp(0.35, 0.05, away), lerp(0.05, 0.55, away)], brows: lerp(0.25, 0, away), mouth: mHim(lt) } });
  }
  // 35.8: "I'm not talking about the text." She holds his eyes, then looks down at the phone and bends to it (cut on the look)
  function herText(c, st, lt) {
    const tt = twos(lt);
    const down = E.inOutSine(seg(tt, 37.6, 38.3));
    K.herClose(c, lt, { face: { yaw: lerp(0.45, 0.2, down), pitch: lerp(0.1, 0.5, down), lids: lerp(0.7, 0.45, down), gaze: [lerp(0.4, 0.1, down), lerp(0.06, 0.55, down)], mouth: mHer(lt) },
      p: { tau: lerp(0.5, 0.62, down), armL: { to: [-0.15, 2.5], bend: 1, hand: 'strap', front: true }, armR: { to: [lerp(0.4, 0.9, down), lerp(2.9, 3.2, down)], bend: -1, hand: 'relax', hp: { close: 0.3, flip: true } } } });
  }

  // ------------------------------------------------------------------ 38.5–43.3 between (B3): she turns the screen to him
  function between(c, st, lt) {
    const tt = twos(lt);
    const hold = key(tt, [[38.5, 0.85], [39.9, 0, 'inOutSine']]);
    // he lifts his eyes to the screen as it turns to him (39.6), sees it, and looks away, down at the bag (41.4)
    const see = key(tt, [[39.3, 0], [39.7, 1, 'outCubic'], [40.9, 1], [41.5, 0]]);
    K.two(c, lt, { z: 1 + 0.025 * E.inOutSine(seg(lt, 38.5, 43.3)),
      her: { pose: 'phone', p: { hold }, face: { yaw: lerp(0.5, 0.6, hold), pitch: lerp(0.08, 0.36, hold), lids: lerp(0.68, 0.5, hold), gaze: [lerp(0.42, 0.1, hold), lerp(0.08, 0.5, hold)] } },
      herPhone: { yaw: lerp(-0.3, -2.6, hold * hold) },
      him: { pose: 'bag', p: { zip: tt * 0.6 }, face: { yaw: lerp(0.3, 0.42, see), pitch: lerp(0.45, 0.16, see), lids: lerp(0.3, 0.7, see), gaze: [lerp(0.05, 0.35, see), lerp(0.6, 0.15, see)], brows: lerp(0, 0.25, see) } } });
  }

  // ------------------------------------------------------------------ 43.3–50.5 over his shoulder: the screen between them (L016)
  // his shoulder and the back of his head, close and out of focus at the left; her, the phone held up to him: the picture readable
  K.hisShoulder = function (c) {
    return K.soft(c, 'END|hisShoulder', 9, (fc, tg) => {
      const L = RIG.light('day', { keys: [{ dir: [0.6, -0.4, -0.6], col: '#E6EBEE', k: 0.62, poster: [0.12, 0.5], levels: [0.55, 1] }], paper: { from: [0.82, -0.55] } });
      RIG.draw(fc, 'him', 'stand', { view: 'back', x: 230, y: 330, s: 640, light: L, tau: 0.45, crop: 2.6, target: tg, breath: 0, blink: false, face: { yaw: Math.PI - 1.0, pitch: 0.3, roll: 0.15, lids: 0.3 } });
    });
  };
  K.oss = function (c, lt, o) {
    o = o || {};
    const V = LV().between, sh = V.shots.her, A = sh.anchors;
    K.push(c, 1100, 560, 1 + (o.zp || 0));
    c.g.drawImage(K.herPlate(c), 0, 0);
    const s = 0.23 * A.herBetween[2] * 0.92;
    const L = K.setLight(sh.lights.day, { rig: { phone: [800, 720], phoneCol: '#C8EEF2', phoneK: 0.5 } });
    const her = RIG.draw(c, 'her', 'phone_up', { x: A.herBetween[0] + 120, y: A.herBetween[1] - 150, s, light: L, t: lt, flip: true, crop: 3.4, face: o.face });
    if (her.phone) {
      const ph = her.phone; const P = { x: ph.x, y: ph.y, h: ph.h * 1.1, roll: ph.angle, yaw: -0.18, screen: 'lock', state: CALL(), env: '#B8BEC0', sheen: 0.06 };
      PHONE.glow(c, { info: PHONE.where(P, c), k: 0.5, r: ph.h * 2.4 });
      PHONE.draw(c, P); her.over(c);
    }
    c.reset();
    c.g.drawImage(K.hisShoulder(c), (o.dx || 0) + RIG.breath(lt, 0) * 0, RIG.breath(lt, 2.5));
    return her;
  };
  function overHim(c, st, lt) {
    const tt = twos(lt);
    // she says it to him, steadily; at the end ("a waterfall") her eyes go to the phone a moment, and back
    const look = key(tt, [[47.3, 0], [47.8, 1], [48.9, 1], [49.4, 0]]);
    K.oss(c, lt, { zp: 0.03 * E.inOutSine(seg(lt, 43.3, 50.5)), face: { yaw: 0.5, pitch: lerp(0.06, 0.18, look), lids: lerp(0.68, 0.56, look), gaze: [lerp(0.42, 0.28, look), lerp(0.08, 0.35, look)], mouth: RIG.mouthFor('L016', lt - 43.5) } });
  }

  // ------------------------------------------------------------------ 50.5–58 his hands: his thumb worries the broken zip
  function hands(c, st, lt) {
    const V = LV().hands; const tt = twos(lt);
    push(c, 760, 700, 1 + 0.05 * E.inOutSine(seg(lt, 50.5, 58)));
    V.back(c, lt, { tod: 'day' });
    const L = setLight(V.shots.insert.lights.day);
    // her phone is just above the frame, held up between them: only its cool light reaches down into the empty half
    PHONE.glow(c, { x: 1180, y: -60, r: 900, tone: 'water', k: 0.5 });
    // him, close at hand height: his head is far above the frame; the bag held low in both hands, his thumb on the zip
    RIG.draw(c, 'him', 'bag', { x: 600, y: -760, s: 520, light: L, t: lt, tau: 0.4, hands: 1, zip: 0.2 + Math.max(0, tt - 50.9) * 0.62, breathAmp: 3 });
  }

  FILM.seq({
    id: 'Q09', title: 'The makeup bag', dur: 58,
    setup() { PHONE.prepare(['waterfall']); },
    lines: [
      { id: 'L012', at: 27.2 },     // Him: Don't look at my phone.
      { id: 'L013', at: 29.4 },     // Her: What is this?
      { id: 'L014', at: 31.5 },     // Him: It's just a friend from work. It's nothing. It's none of your business.
      { id: 'L015', at: 36.0 },     // Her: I'm not talking about the text.
      { id: 'L016', at: 43.5 },     // Her: We've never taken this photo. We've never been to a waterfall.
    ],
    sound(S) {
      S.bed('room_day', 0, 58, { level: -46, what: 'the flat by day; in the bedroom a little closer and drier' });
      S.bed('street_day', 17, 58, { level: -52, what: 'through the living-room window' });
      S.cue('wardrobe_door', 0.5, { what: 'the two doors pulled open' });
      S.cue('hangers', 1.5, { what: 'bare wooden hangers: a hollow clink as they swing' });
      S.cue('bag_lift', 8.0, { what: 'the bag lifted off the dusty shelf' });
      S.cue('buzz_muffled', 12.5, { what: 'through the wall: his phone buzzing against the couch cushion' });
      S.cue('footsteps', 17.0, { pace: 'fast', what: 'he comes out of the bedroom fast, and stops' });
      S.cue('phone_pickup', 38.6, { what: 'she picks it up off the cushion' });
      S.bed('zip', 51, 57, { level: -40, what: 'tiny: the broken zip worried by his thumb' });
    },
    shots: [
      { at: 0, name: 'wardrobe: he opens it; his clothes left, bare hangers right', draw: wardrobeOpen, post: { vig: 0.45 } },
      { at: 6, name: 'shelf: he lifts the bag down; the clean rectangle in the dust', draw: shelfShot, post: { vig: 0.45 } },
      { at: 12.0, name: 'wardrobe, close: the buzz through the wall; rigid, eyes shut', draw: wardrobeClose, post: { vig: 0.5 } },
      { at: 17, name: 'room by day: he comes out fast; she stands over the couch', draw: roomArrive, post: { vig: 0.45 } },
      { at: 22, name: 'INSERT: the lock screen, "Call me tonight?" over the waterfall', draw: lockInsert, post: { vig: 0.55, halation: 0.35 } },
      { at: 27, name: 'him, close: "Don\'t look at my phone."', draw: himDont, post: { vig: 0.5 } },
      { at: 29.2, name: 'her, close: "What is this?"', draw: herWhat, post: { vig: 0.5 } },
      { at: 31.3, name: 'him, close: "It\'s just a friend from work."', draw: himFriend, post: { vig: 0.5 } },
      { at: 35.8, name: 'her, close: "I\'m not talking about the text."; she looks down at the phone', draw: herText, post: { vig: 0.5 } },
      { at: 38.5, name: 'between (B3): she turns the screen to him', draw: between, post: { vig: 0.45, halation: 0.4 } },
      { at: 43.3, name: 'over his shoulder: the screen between them; L016', draw: overHim, post: { vig: 0.48, halation: 0.4 } },
      { at: 50.5, name: 'hands: his thumb worries the broken zip', draw: hands, post: { vig: 0.5 } },
    ],
  });
})();
