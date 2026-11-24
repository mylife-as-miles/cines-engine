/* LONG DISTANCE · Q08 THE KNOCK (66 s) · S09, S10, A033–A043, L009–L011 · living (couch, door, room by day), doorway
   Grey daylight: the first time the flat is lit by something that is not a screen or a bulb. He lies along the couch texting,
   smiling at the screen. Three knocks. He looks at the door as if it has never made that sound. He sets the phone on the cushion,
   face up, lit, and goes. He opens the door: the woman from the strip, real, older, her hair cut short above the jaw, coat on.
   He doesn't smile; the colour leaves his face; his hand tightens on the door's edge. Behind him on the couch the phone is still
   lit, in the empty half. He steps aside. She comes in like a guest and keeps her coat on; she stands in the empty half of the
   room, the first time anyone has. Her eyes travel the room: the dusty mug, the pale rectangle, the strip. She looks away.
   Cut on looks, not on lines; long, still takes. Her copper and bottle green are the only saturated real colours.
   Shots: couch (0) · couch, close on him (9.5) · the cushion, the phone set down (14) · the empty couch, the phone lit (15.4) ·
   door from inside, he opens it (17.5) · her in the doorway, his eyes (20) · him, close, from the landing (27) · past him to the
   couch (32) · the room by day (37) · mug, rectangle, strip (50, 52, 54) · the room (57.5). */
(function () {
  'use strict';
  const O = window.OTM, W = O.W, H = O.H;
  const { seg, key, twos, clamp, lerp } = FILM;
  const LV = n => SETS.living.views[n];
  const DAY = { tod: 'day' };
  const HEAD_M = 0.23;

  // ---------------------------------------------------------------- light: the set's window, read by the sculptures and the paper
  // the window is on the right wall: in the forward views it comes from screen right; the rig's own 'day' comes from the left
  function dayLight(view, shot, o) {
    const sl = LV(view).shots[shot].lights.day; o = o || {};
    const from = [sl.dir[0] >= 0 ? 0.8 : -0.8, -0.55];
    return RIG.light('day', Object.assign({ keys: [{ dir: sl.dir, col: sl.color, k: sl.k, poster: sl.poster, levels: sl.levels }], amb: sl.amb, paper: { from } }, o));
  }

  // ---------------------------------------------------------------- the phone: in his hand, then face up on the middle cushion
  // the thread as it stands: Thursday night's picture, Friday's good morning, and whatever he has been reading since
  const THREAD = { clock: 'visit', history: 'routine', steps: [{ stamp: 'Thu 23:14', at: 0 }, { at: 0, her: { image: 'waterfall' } }, { stamp: 'Fri 07:12', at: 0 },
    { at: 0, him: PHONE.MSG.goodMorning2 }, { at: 0, her: PHONE.MSG.iLoveYou2 }] };
  const threadState = () => PHONE.exchange(1, THREAD);
  // lying flat on the cushion, right of the seam: its four glass corners in metres, projected by whichever camera looks at it
  function cushionQuad(view, shot) {
    const R = SETS.living.world, cx = R.phoneCushion.x, cy = R.phoneCushion.y + 0.012, cz = R.phoneCushion.z - 0.03, a = 0.3;
    const hw = 0.0338, hh = 0.0718, ca = Math.cos(a), sa = Math.sin(a);
    const at = (u, v) => [cx + ca * u - sa * v, cy, cz + sa * u + ca * v];
    return [at(-hw, hh), at(hw, hh), at(hw, -hh), at(-hw, -hh)].map(w => LV(view).project(w, shot).slice(0, 2));
  }
  function phoneOnCushion(c, view, shot, o) {
    o = o || {}; const q = cushionQuad(view, shot); const th = Math.max(1, Math.hypot(q[0][0] - q[3][0], q[0][1] - q[3][1]) * 0.05);
    const P = { quad: q, edge: [0, th], screen: 'thread', state: threadState(), env: '#C8CCC8', shadow: { dx: 0, dy: th * 1.2, blur: th * 2.5, alpha: 0.45 } };
    const info = PHONE.where(P, c);
    PHONE.glow(c, { info, x: info.center[0], y: info.center[1], r: info.h * (o.r || 2.2), sy: 0.5, k: o.k == null ? 0.55 : o.k });
    PHONE.draw(c, Object.assign(P, { emissive: o.em == null ? 0.9 : o.em }, o.p || {}));
    return info;
  }

  // ---------------------------------------------------------------- him, lying along the couch, his head on the left arm, texting
  // The rig's lie pose with the arm tucked, the phone held at his chest, screen to his face, back to us. Built through RIG.POSES
  // so two things can be set on the hand: a short sculpted forearm (the pose's own forearm shows past the sweater's cuff) and
  // over: 'all', so the hand is drawn again over the phone in the gloss layer (fingers round its back).
  function lieFig(c, x, y, s, L, t, face, o) {
    const p = { x, y, s, light: L, t, cover: false, arm: 'tuck', face, blink: o && o.blink };
    const built = RIG.POSES.him.lie(p);
    built.ops.forEach(op => { if (op.type === 'hand') op.p = Object.assign({}, op.p, { foreLen: 0.12 }, op.name === 'R' ? { over: 'fingers' } : {}); });
    const fig = RIG.drawFigure(c, { who: 'him', x, y, s, rot: built.rot, sx: built.sx, light: L, breath: RIG.breath(t, 2.5 * Math.min(2, s / 250)), ops: built.ops });
    const E = fig.toWorld(built.info.elbows[1]), Wr = fig.toWorld(built.info.wrists[1]), d = [E[0] - Wr[0], E[1] - Wr[1]], dl = Math.hypot(d[0], d[1]) || 1;
    sleeve(c.g, [Wr[0] + d[0] / dl * 0.08 * s, Wr[1] + d[1] / dl * 0.08 * s], [d[0] / dl, d[1] / dl], dl * 0.95, 0.3 * s, 711);
    return fig;
  }
  function lying(c, lt, face, o) {
    o = o || {}; const A = LV('couch').shots.main.anchors, s = HEAD_M * A.couchHeadL[2];
    const guess = [A.couchHeadL[0] + 1.25 * s, A.couchHeadL[1] + 0.55 * s];
    const L = dayLight('couch', 'main', { phone: guess, phoneCol: '#FFC5A0', phoneK: o.phoneK == null ? 0.8 : o.phoneK });
    const fig = lieFig(c, A.couchHeadL[0], A.couchHeadL[1], s, L, lt, face, o);
    const hd = fig.hands.R; const at = hd ? hd.grip : guess;
    // his thumb on the glass (we see the phone's back): the phone nods a little with each tap while he types
    const tap = o.typing ? (Math.floor(twos(lt) * 6) % 3 === 0 ? 1 : 0) : 0;
    PHONE.draw(c, { x: at[0] - 0.05 * s, y: at[1] - 0.1 * s + tap * 1.5, h: 0.7 * s, yaw: Math.PI - 0.45, pitch: 0.2, roll: -0.55, screen: 'thread', state: threadState(), env: '#C8CCC8', spill: 0.9 });
    fig.over(c);
    return fig;
  }

  // ---------------------------------------------------------------- a hand in its sweater sleeve, as one paper occluder over the phone
  // drawn into a scratch canvas in screen space (so it can be both the phone's mask and the piece laid on the paper world)
  const SCR = { c: null, g: null };
  function scratch(c) { if (!SCR.c) { SCR.c = O.makeCanvas(W, H); SCR.g = SCR.c.getContext('2d'); } const g = SCR.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, W, H); g.setTransform(c.g.getTransform()); return g; }
  function sleeve(g, wrist, dir, len, wid, seed) {
    const n = [-dir[1], dir[0]], P = (a, b) => [wrist[0] + dir[0] * a + n[0] * b, wrist[1] + dir[1] * a + n[1] * b];
    const sh = GG.blob([P(-0.02 * len, -wid * 0.5), P(0.5 * len, -wid * 0.58), P(len, -wid * 0.62), P(len, wid * 0.62), P(0.5 * len, wid * 0.6), P(-0.02 * len, wid * 0.52)]);
    const sp = GG.piece(g, sh, { fill: '#4A4541', rough: 1.2, seed, tex: 0.7, kind: 'wool', lift: [6, 10], liftAlpha: 0.45, liftBlur: 10 });
    GG.crescent(g, sp, -n[0] * 8, -n[1] * 8, '#7A746C', 0.8);
    const cuff = GG.blob([P(-0.03 * len, -wid * 0.55), P(0.09 * len, -wid * 0.57), P(0.09 * len, wid * 0.57), P(-0.03 * len, wid * 0.55)]);
    const cp = GG.piece(g, cuff, { fill: '#524D48', rough: 0.8, seed: seed + 1, tex: 0.7, kind: 'wool' });
    g.save(); g.clip(cp); g.strokeStyle = 'rgba(30,26,24,0.4)'; g.lineWidth = 2; for (let k = -6; k <= 6; k++) { const a = P(-0.03 * len, k * wid / 12), b = P(0.09 * len, k * wid / 12); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } g.restore();
  }
  const screenMask = (c, cv) => m => { const T = c.g.getTransform().inverse(); m.save(); m.transform(T.a, T.b, T.c, T.d, T.e, T.f); m.drawImage(cv, 0, 0); m.restore(); };
  const layScreen = (c, cv) => { c.g.save(); c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.drawImage(cv, 0, 0); c.g.restore(); };

  // ---------------------------------------------------------------- him at the door, facing out, his hand round the door's edge
  // the rig's 'door' pose, built here with RIG.person so the fingers can go round the edge (a clip at the edge's line)
  function atDoor(c, x, y, s, L, t, edge, edgeTop, tight, face, flip) {
    const f = Object.assign({}, face); const bl = RIG.blink(t, 3); if (bl < 1) f.lids = (f.lids == null ? 0.7 : f.lids) * bl;
    const toFig = w => [(w[0] - x) / s * (flip ? -1 : 1), (w[1] - y) / s];
    // the wrist a little in from the edge, so the knuckles sit on it and the fingers go behind
    const wrist = [edge[0] + (flip ? 1 : -1) * 0.2 * s, edge[1] + 0.06 * s];
    const clip = flip ? { a: edgeTop, b: edge.slice(0, 2) } : { a: edge.slice(0, 2), b: edgeTop };
    const fig = RIG.person({ who: 'him', costume: 'sweater', tau: 0.3, head: f,
      arms: { L: { a1: -0.06, a2: 0.12, hand: 'relax' }, R: { to: toFig(wrist), bend: -1, hand: 'door', hp: { tight, clip }, front: true } }, legs: {} });
    return RIG.drawFigure(c, { who: 'him', x, y, s, flip, light: L, breath: RIG.breath(t, 2.5 * Math.min(2, s / 250)), ops: fig.ops });
  }

  // ---------------------------------------------------------------- him at the door, from behind, opening it (a pose of our own)
  // RIG.person with back: true (as the rig's own 'bag' back view): his right hand on the door's free edge as it swings to him
  function opening(c, lt, open) {
    const V = LV('door'), tt = twos(lt);
    const back = seg(tt, 18.1, 19.4, 'inOutSine');
    const at = V.project([3.86 + 0.16 * back, 1.66, 0.5 + 0.42 * back], 'inside'), s = HEAD_M * at[2];
    const L = dayLight('door', 'inside');
    const hold = open < 0.5;
    const edge = V.doorEdge(Math.min(open, 0.5), 1.02, 'inside');
    const toFig = w => [(w[0] - at[0]) / s, (w[1] - at[1]) / s];
    const fig = RIG.person({ who: 'him', costume: 'sweater', back: true, tau: Math.PI - 0.35, lean: 0, head: { yaw: 3.0, pitch: 0.04, lids: 0.7 },
      arms: { L: { a1: -0.04, a2: 0.08, hand: 'relax' }, R: hold ? { to: toFig(edge), bend: 1, hand: 'relax', hp: { close: 0.7 }, behind: true } : { a1: 0.04, a2: 0.14, hand: 'relax', hp: { close: 0.4 } } },
      legs: { stance: 0.12 } });
    RIG.drawFigure(c, { who: 'him', x: at[0], y: at[1], s, light: L, breath: RIG.breath(lt, 2.5 * s / 250), ops: fig.ops });
  }

  // ---------------------------------------------------------------- the inserts of her look: still frames with a breath of a push
  function insertShot(view, push) {
    return function (c, st, lt) { const u = seg(st, 0, c.shotDur, 'inOutSine'); c.camera({ x: 960 + push[0] * u, y: 540 + push[1] * u, zoom: 1 + push[2] * u }); LV(view).back(c, lt, DAY); LV(view).front(c, lt, DAY); };
  }

  // ---------------------------------------------------------------- the room by day: him in his half, her just inside the door, in the empty half
  const HIM_AT = [2.08, 1.66, 2.0];
  const HER_AT = [3.55, 1.56, 0.75];
  function room(c, lt, o) {
    const V = LV('room'), tt = twos(lt);
    V.back(c, lt, Object.assign({ phone: 'cushion' }, DAY));
    phoneOnCushion(c, 'room', 'wide', { k: 1.3, r: 3.0, em: 1.4 });
    const L = dayLight('room', 'wide');
    // her: she comes in from the right (walking) and stops just inside, like a guest
    if (o.her) {
      const hp = V.project(HER_AT, 'wide'), s = HEAD_M * hp[2];
      if (o.her.walk != null) RIG.draw(c, 'her', 'walk', { x: hp[0] + o.her.dx, y: hp[1], s, light: L, t: lt, phase: o.her.walk, flip: true, face: { lids: 0.72 } });
      else RIG.draw(c, 'her', 'guest', { x: hp[0], y: hp[1], s, light: L, t: lt, flip: true, face: o.her.face });
    }
    V.front(c, lt, DAY);
    // him (after the set's front layer: he stands in front of the counter and its stools, nearer than they are): in the kitchen half, turned to her; pale; at 61.5 he goes (out of frame left)
    if (o.him) {
      const hp = V.project(HIM_AT, 'wide'), s = HEAD_M * hp[2];
      if (o.him.walk != null) {
        const ph = o.him.walk; RIG.draw(c, 'him', 'walk', { x: hp[0] - ph * 300 * s / 120 / 0.9, y: hp[1], s, light: L, t: lt, phase: ph, flip: true, face: { pale: 1, lids: 0.6 } });
      } else RIG.draw(c, 'him', 'stand', { x: hp[0], y: hp[1], s, light: L, t: lt, tau: 0.45, face: o.him.face, armL: { a1: -0.06, a2: 0.1, hand: 'relax' }, armR: { a1: -0.04, a2: 0.14, hand: 'relax', hp: { close: 0.5 } } });
    }
  }
  // her face in the room: she looks at him; her eyes travel (49.4–50); she looks away (57.5); she speaks L010 and L011
  function herFace(tt, lt) {
    const atHim = { yaw: 0.3, pitch: -0.02, gaze: [0.35, -0.06], lids: 0.8 };
    const travel = { yaw: 0.08, pitch: -0.04, gaze: [0.2, -0.15], lids: 0.76 };
    const away = { yaw: -0.25, pitch: 0.16, gaze: [-0.2, 0.4], lids: 0.6 };
    let f = atHim;
    if (tt >= 49.3 && tt < 57.5) f = FILM.mixv(atHim, travel, seg(tt, 49.3, 49.9, 'inOutSine'));
    if (tt >= 57.5) f = FILM.mixv(FILM.mixv(atHim, travel, 0.6), away, seg(tt, 57.5, 58.3, 'inOutSine'));
    return Object.assign({}, f, { mouth: RIG.mouthFor('L010', lt - 47.8) || RIG.mouthFor('L011', lt - 58.0) });
  }

  FILM.seq({
    id: 'Q08', title: 'The knock', dur: 66,
    lines: [{ id: 'L009', at: 44.5 }, { id: 'L010', at: 47.8 }, { id: 'L011', at: 58.0 }],
    sound(S) {
      S.bed('room_day', 0, 66, { level: -46 });
      S.bed('street_day', 0, 66, { level: -50 });
      S.bed('type', 1.0, 7.0, { level: -44 });                       // his thumb on the glass, soft
      S.cue('knock', 8.0); S.cue('knock', 8.5); S.cue('knock', 9.0);   // three, real, close
      S.cue('phone_down', 14.4, { level: -42 });                      // the phone laid on the cushion
      S.cue('couch_creak', 14.5);
      S.cue('footsteps', 15.4, { level: -40 });                       // to the door
      S.cue('door_open', 18.0);
      S.bed('landing_air', 18.2, 40.0, { level: -44 });               // the stairwell beyond the open door
      S.cue('footsteps', 37.6, { level: -42 });                       // hers, in
      S.cue('door_close', 40.0, { level: -40 });                      // soft: she is in
      S.cue('coat_rustle', 49.4, { level: -48 });
      S.cue('footsteps', 61.5);                                       // he is already moving
    },
    shots: [
      // ---------------------------------------------------------------- he lies along the couch, texting, smiling at the screen
      { at: 0, name: 'couch: he lies along the couch, texting, smiling; three knocks', draw(c, st, lt) {
        const V = LV('couch'); V.back(c, lt, DAY);
        const tt = twos(lt);
        const knocked = tt >= 8.0;
        const onPhone = { gaze: [-0.45, 0.42] };
        const face = Object.assign({}, onPhone, knocked ? { smile: key(tt, [[8.0, 0.5], [8.7, 0.25], [9.3, 0]]), lids: key(tt, [[8.0, 0.58], [8.6, 0.72]]) } : { smile: key(tt, [[0, 0.375], [3.0, 0.5], [4.2, 0.625], [5.6, 0.5]]), lids: 0.58 });
        lying(c, lt, face, { typing: tt > 1.0 && tt < 8.0 });
        V.front(c, lt, DAY);
      } },
      // ---------------------------------------------------------------- close: he looks at the door as if it has never made that sound
      { at: 9.5, name: 'couch, close: he looks at the door as if it has never made that sound before', draw(c, st, lt) {
        const A = LV('couch').shots.main.anchors;
        const u = seg(st, 0, 4.5, 'inOutSine');
        c.camera({ x: A.couchHeadL[0] + 150, y: A.couchHeadL[1] + 50, zoom: lerp(2.05, 2.12, u) });
        const V = LV('couch'); V.back(c, lt, DAY);
        const tt = twos(lt);
        // his eyes leave the phone and go to the door (toward us); the head lifts a little off the arm; brows up, lids wide; held
        const look = seg(tt, 10.1, 10.8, 'inOutSine');
        const face = { yaw: lerp(-0.42, -0.14, look), pitch: lerp(0.05, -0.06, look), roll: 0.06, gaze: [lerp(-0.45, 0.05, look), lerp(0.42, -0.15, look)], lids: lerp(0.72, 0.88, look), brows: look > 0.5 ? 0.25 : 0, smile: 0, mouth: tt > 11.6 && tt < 12.6 ? 1 : 0 };
        lying(c, lt, face, { blink: tt < 12.6 ? false : undefined });
        V.front(c, lt, DAY);
      }, post: { vig: 0.55 } },
      // ---------------------------------------------------------------- the cushion: he sets the phone down, face up, lit
      { at: 14.0, name: 'cushion: he sets the phone down, face up, lit; his hand leaves it', draw(c, st, lt) {
        const V = LV('couch'); const S0 = Object.assign({ shot: 'close', phone: 'cushion' }, DAY);
        c.camera({ x: 1120, y: 790, zoom: 1.85 });
        V.back(c, lt, S0);
        const tt = twos(lt);
        const down = seg(tt, 14.0, 14.4, 'outCubic'), off = seg(tt, 14.85, 15.35, 'inOutSine');
        const q = cushionQuad('couch', 'close'); const lift = (1 - down) * 26;
        const P = { quad: q.map(p => [p[0] - (1 - down) * 14, p[1] - lift]), edge: [0, 4], screen: 'thread', state: threadState(), env: '#C8CCC8', shadow: { dx: 0, dy: 3 + lift * 0.4, blur: 6 + lift * 0.4, alpha: 0.4 } };
        const info = PHONE.where(P, c);
        PHONE.glow(c, { info, x: info.center[0], y: info.center[1] + 6, r: 230, sy: 0.6, k: 0.6 });
        // his hand, palm down over the lower half of the phone, then lifting away to the left, toward where he sits
        const L = dayLight('couch', 'close', { phone: info.center, phoneCol: '#FFC5A0', phoneK: 0.6 });
        const grip = info.at(0.45, 0.8);
        const wrist = [grip[0] - 92 - 170 * off, grip[1] + 34 + 60 * off - lift * 0.6];
        const g = scratch(c);
        RIG.hand(c, 'him', 'flat', { x: wrist[0], y: wrist[1], s: 190, fore: [-0.64, 0.77], foreLen: 0.2, close: 0.25 + 0.3 * off, light: L, target: g, shadow: { alpha: 0.35 } });
        sleeve(g, [wrist[0] - 3, wrist[1] + 4], [-0.64, 0.77], 520, 84, 701);
        P.mask = screenMask(c, SCR.c);
        PHONE.draw(c, P);
        layScreen(c, SCR.c);
      }, post: { vig: 0.5 } },
      // ---------------------------------------------------------------- the empty couch; the phone lit in the empty half; he has gone to the door
      { at: 15.4, name: 'couch: the empty couch, the phone lit on the cushion in the empty half', draw(c, st, lt) {
        const V = LV('couch'); const S0 = Object.assign({ phone: 'cushion' }, DAY); V.back(c, lt, S0);
        phoneOnCushion(c, 'couch', 'main', { k: 0.8, r: 2.6 });
        V.front(c, lt, S0);
      } },
      // ---------------------------------------------------------------- the front door from inside: he opens it
      { at: 17.5, name: 'door: from inside; he opens it', draw(c, st, lt) {
        const V = LV('door'), tt = twos(lt);
        const open = 0.9 * seg(lt, 18.0, 19.7, 'inOutSine');
        const S0 = Object.assign({ door: open }, DAY);
        V.back(c, lt, S0);
        // her, in the doorway beyond, revealed as the door swings in
        const A = V.shots.inside.anchors; const hs = HEAD_M * A.herDoorway[2];
        RIG.draw(c, 'her', 'doorway', { x: A.herDoorway[0], y: A.herDoorway[1], s: hs, light: RIG.light('day'), t: lt });
        V.front(c, lt, S0);
        opening(c, lt, open);
      } },
      // ---------------------------------------------------------------- her in the doorway: real; his eyes
      { at: 20.0, name: 'door, reverse: her in the doorway, the landing behind her (his eyes)', draw(c, st, lt) {
        const V = LV('door'), A = V.shots.inside.anchors;
        const u = seg(st, 0, 7, 'inOutSine');
        c.camera({ x: A.herDoorway[0] + 6, y: A.herDoorway[1] + 112, zoom: lerp(2.62, 2.72, u) });
        const S0 = Object.assign({ door: 0.9 }, DAY); V.back(c, lt, S0);
        const tt = twos(lt); const hs = HEAD_M * A.herDoorway[2];
        // the window light through the open door, from the left and in front: her face, her freckles, the years
        const L = RIG.light('day', { keyK: 1.05 });
        RIG.draw(c, 'her', 'doorway', { x: A.herDoorway[0], y: A.herDoorway[1], s: hs, light: L, t: lt, face: { yaw: 0.02, pitch: -0.04, gaze: [0, -0.1], lids: key(tt, [[20, 0.76], [23.5, 0.76], [24.5, 0.7]]) } });
        V.front(c, lt, S0);
      }, post: { vig: 0.5 } },
      // ---------------------------------------------------------------- him, close, from the landing: the colour leaves his face
      { at: 27.0, name: 'door, close: him; he does not smile; the colour leaves his face; his hand tightens on the edge', draw(c, st, lt) {
        const V = LV('door'), A = V.shots.close.anchors, tt = twos(lt);
        const S0 = Object.assign({ shot: 'close', door: 0.9 }, DAY); V.back(c, lt, S0);
        const s = HEAD_M * A.himDoorway[2];
        const edge = V.doorEdge(0.9, 1.1, 'close'), edgeTop = V.doorEdge(0.9, 1.6, 'close');
        const L = dayLight('door', 'close');
        atDoor(c, A.himDoorway[0], A.himDoorway[1], s, L, lt, edge, edgeTop, seg(tt, 30.4, 30.9, 'outCubic'),
          { yaw: -0.06, pitch: 0.04, gaze: [0.05, 0.12], lids: 0.86, brows: 0.25, smile: 0, pale: seg(tt, 27.2, 30.0) }, true);
        V.front(c, lt, S0);
      }, post: { vig: 0.55 } },
      // ---------------------------------------------------------------- past him to the couch: the phone still lit in the empty half
      { at: 32.0, name: 'door, deep: past him to the couch; the phone still lit in the empty half; he steps aside', draw(c, st, lt) {
        const V = LV('door'), tt = twos(lt);
        // the push drifts past him toward the couch, where the phone lies lit
        const u = seg(st, 0.2, 5, 'inOutSine'); c.camera({ x: lerp(960, 1040, u), y: lerp(540, 590, u), zoom: lerp(1.0, 1.1, u) });
        const S0 = Object.assign({ shot: 'deep', door: 0.9, phone: 'cushion' }, DAY); V.back(c, lt, S0);
        phoneOnCushion(c, 'door', 'deep', { k: 1.6, r: 3.4, em: 1.6 });
        const step = seg(tt, 35.3, 36.5, 'inOutSine');
        const at = V.project([lerp(3.42, 3.12, step), 1.66, lerp(0.24, 0.85, step)], 'deep'), s = HEAD_M * at[2];
        const L = dayLight('door', 'deep');
        const face = { yaw: lerp(-0.04, -0.4, step), pitch: 0.04, gaze: [lerp(0.04, -0.2, step), lerp(0.1, 0.3, step)], lids: lerp(0.86, 0.6, step), brows: step < 0.5 ? 0.25 : 0, pale: 1 };
        if (step < 0.3) { const edge = V.doorEdge(0.9, 1.1, 'deep'), edgeTop = V.doorEdge(0.9, 1.6, 'deep'); atDoor(c, at[0], at[1], s, L, lt, edge, edgeTop, 1, face, true); }
        else RIG.draw(c, 'him', 'stand', { x: at[0], y: at[1], s, light: L, t: lt, tau: -0.5, face });
        V.front(c, lt, S0);
      } },
      // ---------------------------------------------------------------- the room by day: she comes in and stops, like a guest; L009, L010
      { at: 37.0, name: 'room by day: she comes in and stops just inside the door, like a guest; coat on', draw(c, st, lt) {
        const tt = twos(lt);
        const walking = tt < 39.2; const wu = seg(tt, 37.6, 39.2);
        room(c, lt, { him: { face: { yaw: 0.35, pitch: 0.04, gaze: [0.35, 0.04], lids: 0.66, pale: 1, mouth: RIG.mouthFor('L009', lt - 44.5) } },
          her: tt < 37.6 ? null : walking ? { walk: (tt - 37.6) * 0.95, dx: lerp(420, 0, wu) } : { face: herFace(tt, lt) } });
      } },
      // ---------------------------------------------------------------- her eyes travel: the dusty mug, the pale rectangle, the strip
      { at: 50.0, name: 'mug: insert, his rinsed, hers in its ring of dust', draw: insertShot('mug', [10, 6, 0.03]) },
      { at: 52.0, name: 'rect: insert, the pale rectangle and its nail', draw: insertShot('rect', [-12, 0, 0.03]) },
      // her look lands where Q06's push landed: the last frame, her head tipped against his
      { at: 54.0, name: 'fridge: insert by day, the strip; her look settles on the last frame', draw(c, st, lt) {
        const u = seg(st, 0.1, 3.4, 'inOutSine'); c.camera({ x: lerp(960, 935, u), y: lerp(540, 640, u), zoom: lerp(1.0, 1.13, u) });
        LV('fridge').back(c, lt, DAY); LV('fridge').front(c, lt, DAY);
      }, post: { vig: 0.5 } },
      // ---------------------------------------------------------------- she looks away; L011; he is already moving
      { at: 57.5, name: 'room: she looks away; L011; he is already moving, out of frame', draw(c, st, lt) {
        const tt = twos(lt);
        const going = tt >= 61.5;
        room(c, lt, { him: going ? { walk: (tt - 61.5) * 0.9 } : { face: { yaw: lerp(0.35, 0.1, seg(tt, 59.0, 60.0)), pitch: 0.06, gaze: [0.2, 0.25], lids: 0.6, pale: 1 } },
          her: { face: herFace(tt, lt) } });
      } },
    ],
  });
})();
