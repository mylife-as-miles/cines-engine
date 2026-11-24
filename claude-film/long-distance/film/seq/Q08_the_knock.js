/* LONG DISTANCE · Q08 THE KNOCK (66 s) · S09, S10, A033–A043, L009–L011 · living (couch, door, room by day), doorway
   Grey daylight: the first time the flat is lit by something that is not a screen or a bulb. He lies along the couch texting,
   smiling at the screen. Three knocks. He looks at the door as if it has never made that sound. He sits up, lays the phone on the
   cushion face up, lit, and rises. He opens the door: the woman from the strip, real, older, her hair cut short above the jaw,
   coat on. He doesn't smile; the colour leaves his face; his hand tightens on the door's edge. Behind him on the couch the phone
   is still lit, in the empty half. He lets go and steps aside. She comes in like a guest and stops just inside, the door swinging
   shut behind her; she keeps her coat on. Her eyes travel the room: the dusty mug, the pale rectangle, the strip. She looks away.
   Cut on looks, not on lines; long, still takes. Her copper and bottle green are the only saturated real colours.
   Shots: couch (0) · couch, close on him (9.5) · couch: he sits up (14) · the cushion: the phone laid down (15.6) · couch: he
   rises (16.6) · door from inside, he opens it (18) · her in the doorway (20.2) · him, close, from the landing (27) · past him to
   the couch; he steps aside (32) · reverse from inside: she comes in and stops like a guest; L009, L010 (37) · her, close: her
   eyes travel (49.2) · mug, rectangle, strip (50.4, 52.2, 54.2) · her, close: she looks away; L011 (57) · the two of them; he
   goes (60.4).
   Fix round 1 (REVIEW_cut1 item 15): he gets up on screen (the rig's couch and getup); one continuous geography at the door (he
   steps aside to the latch side; she stops in front of the door, seen from inside the room); her look has its own close shots;
   walks are locked to their stride. */
(function () {
  'use strict';
  const O = window.OTM, W = O.W, H = O.H;
  const { seg, key, twos, clamp, lerp, mixv } = FILM;
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
  // a camera that keeps inside the set's layers (they are one frame wide: past them is black)
  function cam(c, k) { const z = k.zoom || 1, hx = 960 / z, hy = 540 / z; c.camera({ x: clamp(k.x == null ? 960 : k.x, hx, W - hx), y: clamp(k.y == null ? 540 : k.y, hy, H - hy), zoom: z }); }
  // a walk locked to its stride (rig.md: about 290 px a second at s = 120 for 0.9 cycles a second), so the feet never slide
  const STRIDE = s => 290 * s / 120;

  // ---------------------------------------------------------------- the phone: in his hand, then face up on the cushion beside him
  // the thread as it stands: Thursday night's picture, the morning's good morning, and whatever he has been reading since
  const THREAD = { clock: 'visit', history: 'routine', steps: [{ stamp: 'Thu 23:14', at: 0 }, { at: 0, her: { image: 'waterfall' } }, { stamp: 'Fri 07:12', at: 0 },
    { at: 0, him: PHONE.MSG.goodMorning2 }, { at: 0, her: PHONE.MSG.iLoveYou2 }] };
  const threadState = () => PHONE.exchange(1, THREAD);
  // where it lies: on the right-hand cushion just past the seam, clear of where he sat (world metres)
  const PH_W = { x: 4.3, y: 0.472, z: 3.5, a: 0.3 };
  function cushionQuad(view, shot) {
    const hw = 0.0338, hh = 0.0718, ca = Math.cos(PH_W.a), sa = Math.sin(PH_W.a);
    const at = (u, v) => [PH_W.x + ca * u - sa * v, PH_W.y, PH_W.z + sa * u + ca * v];
    return [at(-hw, hh), at(hw, hh), at(hw, -hh), at(-hw, -hh)].map(w => LV(view).project(w, shot).slice(0, 2));
  }
  function phoneOnCushion(c, view, shot, o) {
    o = o || {}; const q = cushionQuad(view, shot); const th = Math.max(1, Math.hypot(q[0][0] - q[3][0], q[0][1] - q[3][1]) * 0.05);
    const P = { quad: q, edge: [0, th], screen: 'thread', state: threadState(), env: '#C8CCC8', shadow: { dx: 0, dy: th * 1.2, blur: th * 2.5, alpha: 0.45 }, emissive: o.em == null ? 0.9 : o.em };
    const info = PHONE.where(P, c);
    PHONE.glow(c, { info, x: info.center[0], y: info.center[1], r: info.h * (o.r || 2.2), sy: 0.5, k: o.k == null ? 0.55 : o.k });
    PHONE.draw(c, P);
    return info;
  }

  // ---------------------------------------------------------------- him on the couch
  // The rig's couch pose gives the frame: the legs, the hip on the seat, the body's angle lying, sitting and rising. His upper body
  // is built here on that frame (RIG.person) so his arms can act: lying on his side, his top arm holds the phone up in front of his
  // face, screen to him, its light on his face; sitting up he keeps it; leaning, he lays it face up on the cushion beside him and
  // his hand lets go of it; then he rises.
  const CM = () => LV('couch').shots.main.anchors;
  const SH = () => HEAD_M * CM().seatL[2];
  const HIP = () => [960, CM().seatL[1]];
  const FIT = () => CM().armR[0] - 45;
  const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  // arm keys, figure units (head units from between the eyes, in the upper body's own frame). R: his top arm lying, the one that
  // holds the phone; L: the arm under him lying, his near arm sitting.
  const R_LIE = { E: [0.95, 2.15], W: [-0.12, 1.45] }, R_SIT = { E: [0.9, 2.3], W: [0.35, 2.75] }, R_REST = { E: [0.82, 2.3], W: [0.7, 3.05] };
  const L_LIE = { E: [-0.52, 1.85], W: [-0.62, 1.25] }, L_SIT = { E: [-0.82, 2.22], W: [-0.5, 3.0] };
  // o: {g (the getup u: 0 lying, 0.5 sitting, 1 standing), lie (the body's angle lying), lean (rad, toward screen right),
  //     R: {W, hand, hp, bend} or a function of toFig, face, phoneAt}
  // The rig's own couch figure (its legs, its torso bending at the hips, its head lagging, its bottom hand on the seat), without its
  // right arm: that arm is RIG.arm's, from the same shoulder to where his hand has to be (the phone up in front of his face, on the
  // cushion).
  function couchMe(c, lt, o) {
    const s = SH(), hip = HIP(), face = Object.assign({}, o.face);
    if (o.blink !== false) { const bl = RIG.blink(lt, 3); if (bl < 1) face.lids = (face.lids == null ? 0.7 : face.lids) * bl; }
    const L = dayLight('couch', 'main', o.phoneAt ? { phone: o.phoneAt, phoneCol: '#FFC5A0', phoneK: o.phoneK == null ? 0.9 : o.phoneK } : {});
    const p = { x: hip[0], y: hip[1] - 3.5 * s, s, u: o.g, arm: 'rest', hip, dir: 1, fit: FIT(), light: L, t: lt, face, blink: false };
    if (o.lie != null) p.lie = o.lie;
    const built = RIG.POSES.him.getup(p);
    const legs = built.parts[0], body = built.parts[1], H = built.worldInfo.hip;
    const rot = body.rot + (o.lean || 0), origin = [H[0] + 3.3 * Math.sin(rot) * s, H[1] - 3.3 * Math.cos(rot) * s];
    const cr = Math.cos(rot), sr = Math.sin(rot), breath = RIG.breath(lt, 2.5 * Math.min(2, s / 250));
    const toW = f => { const fx = f[0] * s, fy = f[1] * s - breath; return [origin[0] + fx * cr - fy * sr, origin[1] + fx * sr + fy * cr]; };
    const toFig = w => { const dx = w[0] - origin[0], dy = w[1] - origin[1]; return [(dx * cr + dy * sr) / s, (-dx * sr + dy * cr + breath) / s]; };
    const ops = body.ops.filter(op => op && !(op.type === 'hand' && op.name === 'R') && !(op.type === 'paper' && /^armR/.test(op.key || '')));
    RIG.drawFigure(c, { who: 'him', x: legs.x, y: legs.y, s, flip: legs.flip, light: L, breath: 0, ops: legs.ops });
    const fig = RIG.drawFigure(c, { who: 'him', x: origin[0], y: origin[1], s, rot, light: L, breath, ops });
    // his right shoulder, as the rig's couch figure places it (tau goes 0.35 sitting to 0.2 lying)
    const e = o.g < 0.5 ? 1 - 2 * o.g : 0, tau = lerp(0.35, 0.2, e), SR = [0.74 * Math.cos(tau) - 0.12 * Math.sin(tau), 1.07];
    const R = typeof o.R === 'function' ? o.R(toFig) : o.R;
    fig.armOut = RIG.arm(c, 'him', { shoulder: toW(SR), target: toW(R.W), s, hand: R.hand, hp: R.hp, bend: R.bend || 'down', body: H, light: L });
    fig.toFig = toFig;
    return fig;
  }
  // the phone in his hand: its screen turned to his face, so we see it edge-on with its glow; the screen's smooth light on his face
  function heldPhone(c, fig, lt, o) {
    o = o || {}; const hd = fig.armOut ? fig.armOut.hand : fig.hands.R; if (!hd) return null;
    const ph = hd.phone || { x: hd.grip[0], y: hd.grip[1], h: SH() * 0.7, angle: hd.rot };
    const tap = o.typing ? (Math.floor(twos(lt) * 6) % 3 === 0 ? 1 : 0) : 0;
    const P = Object.assign({ x: ph.x, y: ph.y + tap * 1.2, h: SH() * 0.7, roll: o.roll == null ? -0.35 : o.roll, yaw: o.yaw == null ? -1.0 : o.yaw, pitch: o.pitch == null ? 0.25 : o.pitch,
      screen: 'thread', state: threadState(), env: '#C8CCC8', spill: 0.9 }, o.p || {});
    const info = PHONE.where(P, c);
    if (o.glow !== false && fig.heads.head) RIG.faceGlow(c, fig.heads.head, { x: P.x - SH() * 0.4, y: P.y - SH() * 0.2, r: SH() * 1.3, color: '#FFC5A0', alpha: o.glowA == null ? 0.32 : o.glowA });
    PHONE.draw(c, P);
    fig.over(c); if (fig.armOut) fig.armOut.over(c);
    return info;
  }

  const V2a = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const phoneSpot = () => { const A = CM(), s = SH(); return [A.couchHeadL[0] + 1.4 * s, A.couchHeadL[1] + 0.5 * s]; };
  function cushionCenter(view, shot) { const q = cushionQuad(view, shot); return [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2]; }
  // his face lying: on the screen, smiling, typing; the knocks (8.0, 8.5, 9.0): the thumb stops, the smile goes, then on the third
  // his head snaps to the door (toward us and a little to screen left: the front door is behind the camera) and holds
  const TEXTING = { yaw: 0.25, pitch: 0.32, gaze: [0.1, 0.5], lids: 0.58 };
  const DOOR_LOOK = { yaw: -0.02, pitch: -0.22, gaze: [-0.2, -0.38], lids: 0.9, brows: 0.25, smile: 0 };
  function knockFace(tt) {
    if (tt < 8.0) return Object.assign({}, TEXTING, { smile: key(tt, [[0, 0.375], [3.0, 0.5], [4.2, 0.625], [5.6, 0.5], [7.0, 0.5]]) });
    if (tt < 9.0) return Object.assign({}, TEXTING, { smile: key(tt, [[8.0, 0.5], [8.4, 0.25], [8.8, 0]]), lids: key(tt, [[8.0, 0.58], [8.6, 0.68]]), gaze: tt > 8.5 ? [0.1, 0.3] : TEXTING.gaze });
    // the snap: two drawings, then held (eyes wide, no blink), the mouth a little open at 11.6
    const k = seg(tt, 9.0, 9.17);
    return Object.assign(FILM.mixv(Object.assign({}, TEXTING, { smile: 0, lids: 0.7 }), DOOR_LOOK, k), tt > 11.6 && tt < 12.6 ? { mouth: 1 } : {});
  }

  // ---------------------------------------------------------------- him at the door, facing out, his hand round the door's edge
  // built here with RIG.person so the fingers can go round the edge (a clip at the edge's line). let 0..1 takes the hand off the
  // edge down to his side; tau turns him (toward screen right as he steps aside)
  function atDoor(c, x, y, s, L, t, o) {
    const f = Object.assign({}, o.face); const bl = RIG.blink(t, 3); if (bl < 1) f.lids = (f.lids == null ? 0.7 : f.lids) * bl;
    const flip = !!o.flip, let_ = o.let || 0;
    const toFig = w => [(w[0] - x) / s * (flip ? -1 : 1), (w[1] - y) / s];
    // the wrist a little in from the edge, so the knuckles sit on it and the fingers go behind
    const onEdge = [o.edge[0] + (flip ? 1 : -1) * 0.2 * s, o.edge[1] + 0.06 * s];
    const hang = [x + (flip ? -1 : 1) * 0.82 * s, y + 3.4 * s];
    const wrist = [lerp(onEdge[0], hang[0], let_), lerp(onEdge[1], hang[1], let_)];
    const clip = flip ? { a: o.edgeTop, b: o.edge.slice(0, 2) } : { a: o.edge.slice(0, 2), b: o.edgeTop };
    const fig = RIG.person({ who: 'him', costume: 'sweater', tau: o.tau == null ? -0.15 : o.tau, head: f, arms: { L: { a1: -0.06, a2: 0.12, hand: 'relax' } }, legs: {} });
    const out = RIG.drawFigure(c, { who: 'him', x, y, s, flip, light: L, breath: RIG.breath(t, 2.5 * Math.min(2, s / 250)), ops: fig.ops });
    // the arm on the edge's side, from his shoulder, its elbow out from his body; the fingers go round the edge (clipped)
    out.armOut = RIG.arm(c, 'him', { shoulder: out.toWorld(fig.SR), target: wrist, s, side: o.side || 'R', bend: 'down', light: L,
      hand: let_ < 0.25 ? 'door' : 'relax', hp: let_ < 0.25 ? { tight: o.tight || 0, clip } : { close: 0.5 } });
    return out;
  }

  // ---------------------------------------------------------------- him at the door, from behind, opening it (the rig's back view)
  function opening(c, lt, open) {
    const V = LV('door'), tt = twos(lt);
    const back = seg(tt, 18.4, 19.6, 'inOutSine');
    const at = V.project([3.86 + 0.12 * back, 1.66, 0.5 + 0.12 * back], 'inside'), s = HEAD_M * at[2];
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

  // ---------------------------------------------------------------- inside, facing the front door: him beside the latch, her in front of the door
  // (door/inside looks at the front wall: the room is behind the camera; world x runs right to left on screen)
  const HIM_IN = [4.1, 1.66, 0.55];             // he stepped aside to the latch side
  const HER_IN = [3.55, 1.56, 0.95];            // she stops just inside, the door behind her, clear of its swing
  const HER_FROM = [3.45, 1.56, -0.2];          // on the landing, in the doorway
  const DOOR_SHUT = [38.9, 40.0];               // the door's closer swings it shut behind her
  function doorAt(tt) { return tt < DOOR_SHUT[0] ? 0.9 : 0.9 * (1 - seg(tt, DOOR_SHUT[0], DOOR_SHUT[1], 'inOutSine')); }
  // her face: at him; her eyes travel the room (the room is toward the camera here, the fridge off to screen right); away
  // (she is drawn flipped, so + yaw and + gaze x turn her toward screen left, toward him)
  const F_HIM = { yaw: 0.3, pitch: 0.0, gaze: [0.4, -0.04], lids: 0.76 };
  const F_ROOM = { yaw: 0.06, pitch: -0.02, gaze: [0.0, -0.08], lids: 0.8 };
  const F_RECT = { yaw: 0.02, pitch: -0.08, gaze: [-0.1, -0.25], lids: 0.82 };
  const F_STRIP = { yaw: -0.14, pitch: 0.0, gaze: [-0.45, 0.0], lids: 0.76 };
  const F_AWAY = { yaw: 0.34, pitch: 0.1, gaze: [0.45, 0.22], lids: 0.68 };
  function herFace(tt, lt) {
    let f = F_HIM;
    if (tt >= 49.5 && tt < 57.0) f = tt < 50.4 ? mixv(F_HIM, F_ROOM, seg(tt, 49.5, 50.2, 'inOutSine')) : F_ROOM;
    else if (tt >= 57.0) {
      f = mixv(F_STRIP, F_AWAY, seg(tt, 57.5, 58.1, 'inOutSine'));
      if (tt >= 59.6) f = mixv(f, F_HIM, seg(tt, 59.6, 60.2, 'inOutSine'));            // "The old one." and her eyes come back to him
      if (tt >= 61.6) f = mixv(f, { yaw: 0.45, pitch: 0.04, gaze: [0.5, 0.05], lids: 0.7 }, seg(tt, 61.6, 62.4, 'inOutSine'));   // she watches him go
    }
    return Object.assign({}, f, { mouth: RIG.mouthFor('L010', lt - 47.8) || RIG.mouthFor('L011', lt - 58.0) });
  }
  // her, just inside: walking in from the doorway toward us (the frame is above her knees, so the walk is the body's rise and fall),
  // then standing like a guest
  function herInside(c, lt, L, face) {
    const V = LV('door'), tt = twos(lt);
    const w = seg(tt, 37.3, 38.9, 'inOutSine'), walking = tt >= 37.3 && tt < 38.9;
    const wp = [lerp(HER_FROM[0], HER_IN[0], w), HER_FROM[1], lerp(HER_FROM[2], HER_IN[2], w)];
    const at = V.project(wp, 'inside'), s = HEAD_M * at[2];
    const ph = (tt - 37.3) * 1.9, bob = walking ? -Math.abs(Math.sin(ph * Math.PI)) * 0.028 * s : 0;
    return RIG.draw(c, 'her', 'guest', { x: at[0], y: at[1] + bob, s, light: L, t: lt, flip: true, face: Object.assign({}, face, walking ? { roll: 0.025 * Math.sin(ph * Math.PI) } : {}), crop: 4.2 });
  }
  // him beside the latch: facing her; at 61.6 he turns away to his right (screen left) and walks out
  function himInside(c, lt, L, o) {
    const V = LV('door'), tt = twos(lt);
    const at = V.project(HIM_IN, 'inside'), s = HEAD_M * at[2];
    const face = Object.assign({ yaw: 0.42, pitch: 0.06, gaze: [0.3, 0.06], lids: 0.66, pale: 1 }, o.face || {});
    if (o.go != null && tt >= o.go + 0.35) {
      const t0 = o.go + 0.35; return RIG.draw(c, 'him', 'walk', { x: at[0] - (tt - t0) * STRIDE(s), y: at[1], s, light: L, t: lt, phase: (tt - t0) * 0.9, flip: true, face: { pale: 1, lids: 0.6 } });
    }
    const turn = o.go != null ? seg(tt, o.go, o.go + 0.35, 'inOutSine') : 0;
    return RIG.draw(c, 'him', 'stand', { x: at[0], y: at[1], s, light: L, t: lt, tau: lerp(0.45, -0.75, turn), face: Object.assign(face, { yaw: lerp(face.yaw, -0.6, turn), gaze: turn > 0.3 ? [-0.3, 0.2] : face.gaze }),
      armL: { a1: -0.06, a2: 0.1, hand: 'relax' }, armR: { a1: -0.04, a2: 0.14, hand: 'relax', hp: { close: 0.5 } }, crop: 4.5 });
  }
  function inside(c, lt, camK, o) {
    o = o || {}; const V = LV('door'), tt = twos(lt);
    cam(c, camK);
    const S0 = Object.assign({ door: doorAt(tt) }, DAY);
    V.back(c, lt, S0); V.front(c, lt, S0);                       // the leaf is the set's front layer: both of them stand in front of it
    const L = dayLight('door', 'inside');
    if (o.him !== false) himInside(c, lt, L, o.him || {});
    if (tt >= 37.3) herInside(c, lt, L, herFace(tt, lt));
  }
  const TWO = (st, d) => { const u = seg(st, 0.2, d, 'inOutSine'); return { x: lerp(752, 715, u), y: 520, zoom: lerp(1.28, 1.36, u) }; };
  const HERCLOSE = { x: 836, y: 446, zoom: 2.1 };

  FILM.seq({
    id: 'Q08', title: 'The knock', dur: 66,
    lines: [{ id: 'L009', at: 44.5 }, { id: 'L010', at: 47.8 }, { id: 'L011', at: 58.0 }],
    sound(S) {
      S.bed('room_day', 0, 66, { level: -46 });
      S.bed('street_day', 0, 66, { level: -50 });
      S.bed('type', 1.0, 8.0, { level: -44 });                       // his thumb on the glass, soft
      S.cue('knock', 8.0); S.cue('knock', 8.5); S.cue('knock', 9.0);   // three, real, close
      S.cue('couch_creak', 13.9);                                     // he sits up
      S.cue('phone_down', 15.75, { level: -42 });                     // the phone laid face up on the cushion
      S.cue('couch_creak', 16.9, { level: -46 });                     // he rises
      S.cue('footsteps', 17.4, { level: -40 });                       // to the door
      S.cue('door_open', 18.2);
      S.bed('landing_air', 18.4, 40.0, { level: -44 });               // the stairwell beyond the open door
      S.cue('footsteps', 35.9, { level: -44 });                       // he steps aside
      S.cue('footsteps', 37.3, { level: -42 });                       // hers, in
      S.cue('door_close', 40.0, { level: -40 });                      // soft, on its closer: she is in
      S.cue('coat_rustle', 49.5, { level: -48 });
      S.cue('footsteps', 61.9);                                       // he is already moving
    },
    shots: [
      // ---------------------------------------------------------------- he lies along the couch, texting, smiling at the screen
      // ---------------------------------------------------------------- he lies along the couch, texting, smiling at the screen
      { at: 0, name: 'couch: he lies along the couch, texting, smiling at the screen; three knocks; his head snaps to the door', draw(c, st, lt) {
        const u = seg(st, 0, 9.5, 'inOutSine'); cam(c, { x: lerp(960, 820, u), y: lerp(540, 640, u), zoom: lerp(1.0, 1.14, u) });
        const V = LV('couch'); V.back(c, lt, DAY);
        const tt = twos(lt);
        const fig = couchMe(c, lt, { g: 0, R: Object.assign({ hand: 'thumb', hp: { reach: tt < 8.0 ? 0.3 + 0.25 * (Math.floor(tt * 6) % 3 === 0 ? 1 : 0) : 0.35, over: 'thumb' } }, R_LIE),
          face: knockFace(tt), blink: tt < 9.0, phoneAt: phoneSpot() });
        heldPhone(c, fig, lt, { typing: tt > 1.0 && tt < 8.0 });
        V.front(c, lt, DAY);
      } },
      // ---------------------------------------------------------------- close: he holds the look at the door
      { at: 9.5, name: 'couch, close: he looks at the door as if it has never made that sound before; held', draw(c, st, lt) {
        const u = seg(st, 0, 4.1, 'inOutSine'); cam(c, { x: lerp(600, 590, u), y: lerp(800, 795, u), zoom: lerp(1.95, 2.02, u) });
        const V = LV('couch'); V.back(c, lt, DAY);
        const tt = twos(lt);
        // the phone forgotten in his hand, lowered a little, still lit
        const fig = couchMe(c, lt, { g: 0, R: Object.assign({ hand: 'thumb', hp: { reach: 0.35, over: 'thumb' } }, { E: R_LIE.E, W: lerp2(R_LIE.W, [-0.3, 1.6], seg(tt, 10.4, 11.6, 'inOutSine')) }),
          face: knockFace(tt), blink: tt > 12.4, phoneAt: phoneSpot() });
        heldPhone(c, fig, lt, { glowA: 0.22 });
        V.front(c, lt, DAY);
      }, post: { vig: 0.55 } },
      // ---------------------------------------------------------------- he sits up, sets the phone face up on the cushion, lets go, rises
      { at: 13.6, name: 'couch: he sits up, eyes on the door; lays the phone face up on the cushion beside him; his hand lets go; he rises', draw(c, st, lt) {
        const u = seg(st, 0, 4.4, 'inOutSine'); cam(c, { x: lerp(900, 960, u), y: lerp(580, 560, u), zoom: lerp(1.1, 1.06, u) });
        const V = LV('couch'); V.back(c, lt, DAY);
        const tt = twos(lt);
        const SIT = [13.7, 14.9], REACH = [14.95, 15.75], LET = [15.95, 16.35], BACK = [16.2, 16.7], RISE = [16.75, 17.9];
        const g = tt < SIT[1] ? 0.5 * seg(tt, SIT[0], SIT[1], 'inOutSine') : tt < RISE[0] ? 0.5 : 0.5 + 0.5 * seg(tt, RISE[0], RISE[1], 'inOutSine');
        const lean = 0.3 * seg(tt, REACH[0], REACH[0] + 0.6, 'inOutSine') * (1 - seg(tt, BACK[0], BACK[1], 'inOutSine'));
        const reach = seg(tt, REACH[0], REACH[1], 'inOutSine'), down = tt >= REACH[1], letgo = seg(tt, LET[0], LET[1], 'inOutSine');
        const qc = cushionCenter('couch', 'main');
        const R = toFig => {
          const sit = { E: lerp2(R_LIE.E, R_SIT.E, seg(tt, SIT[0], SIT[1], 'inOutSine')), W: lerp2(R_LIE.W, R_SIT.W, seg(tt, SIT[0], SIT[1], 'inOutSine')) };
          const tgt = V2a(toFig(qc), [-0.3, 0.12]), tE = V2a(toFig(qc), [-0.35, -1.0]);
          if (tt < REACH[0]) return Object.assign({ hand: 'thumb', hp: { reach: 0.35, over: 'thumb' } }, sit);
          if (letgo <= 0) return { hand: 'thumb', hp: { reach: 0.35, over: 'thumb' }, E: lerp2(sit.E, tE, reach), W: lerp2(sit.W, tgt, reach) };
          return { hand: 'relax', hp: { close: 0.25 }, E: lerp2(tE, R_REST.E, letgo), W: lerp2(V2a(tgt, [0, -0.25 * Math.sin(Math.PI * letgo)]), R_REST.W, letgo) };
        };
        // eyes on the door until the phone goes down; a glance down at it as he lets go; back to the door as he rises
        const face = tt < REACH[0] + 0.3 ? DOOR_LOOK : tt < BACK[1] ? { yaw: 0.35, pitch: 0.35, gaze: [0.25, 0.5], lids: 0.6, pale: 0 } : Object.assign({}, DOOR_LOOK, { lids: 0.78, brows: 0 });
        if (down) phoneOnCushion(c, 'couch', 'main', { k: 0.8, r: 2.6 });
        const fig = couchMe(c, lt, { g, lean, R, face: Object.assign({}, face), phoneAt: down ? null : phoneSpot() });
        if (!down) heldPhone(c, fig, lt, { roll: lerp(-0.35, 0.15, reach), yaw: lerp(-1.0, 0, reach), pitch: lerp(0.25, 1.3, reach), glowA: 0.2 * (1 - reach) });
        V.front(c, lt, DAY);
      } },
      { at: 18.0, name: 'door: from inside; he opens it', draw(c, st, lt) {
        const V = LV('door'), tt = twos(lt);
        const open = 0.9 * seg(lt, 18.2, 19.9, 'inOutSine');
        const S0 = Object.assign({ door: open }, DAY);
        V.back(c, lt, S0);
        // her, in the doorway beyond, revealed as the door swings in
        const A = V.shots.inside.anchors; const hs = HEAD_M * A.herDoorway[2];
        RIG.draw(c, 'her', 'doorway', { x: A.herDoorway[0], y: A.herDoorway[1], s: hs, light: RIG.light('day'), t: lt });
        V.front(c, lt, S0);
        opening(c, lt, open);
      } },
      // ---------------------------------------------------------------- her in the doorway: real; his eyes
      { at: 20.2, name: 'door, reverse: her in the doorway, the landing behind her (his eyes)', draw(c, st, lt) {
        const V = LV('door'), A = V.shots.inside.anchors;
        const u = seg(st, 0, 6.8, 'inOutSine');
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
        const L = dayLight('door', 'close');
        atDoor(c, A.himDoorway[0], A.himDoorway[1], s, L, lt, { edge: V.doorEdge(0.9, 1.1, 'close'), edgeTop: V.doorEdge(0.9, 1.6, 'close'), tight: seg(tt, 30.4, 30.9, 'outCubic'), flip: true,
          face: { yaw: -0.06, pitch: 0.04, gaze: [0.05, 0.12], lids: 0.86, brows: 0.25, smile: 0, pale: seg(tt, 27.2, 30.0) } });
        V.front(c, lt, S0);
      }, post: { vig: 0.55 } },
      // ---------------------------------------------------------------- past him to the couch: the phone still lit; he lets go and steps aside
      { at: 32.0, name: 'door, deep: past him to the couch, the phone still lit in the empty half; he lets go and steps aside', draw(c, st, lt) {
        const V = LV('door'), tt = twos(lt);
        // the push drifts past him toward the couch, where the phone lies lit
        const u = seg(st, 0.2, 5, 'inOutSine'); cam(c, { x: lerp(960, 1040, u), y: lerp(540, 590, u), zoom: lerp(1.0, 1.1, u) });
        const S0 = Object.assign({ shot: 'deep', door: 0.9 }, DAY); V.back(c, lt, S0);
        phoneOnCushion(c, 'door', 'deep', { k: 1.6, r: 3.4, em: 1.6 });
        const L = dayLight('door', 'deep');
        const P0 = [3.42, 1.66, 0.24];
        const letGo = seg(tt, 34.9, 35.4, 'inOutSine'), turn = seg(tt, 35.3, 35.7, 'inOutSine');
        const face = { yaw: lerp(-0.04, -0.5, turn), pitch: 0.04, gaze: [lerp(0.04, -0.3, turn), lerp(0.1, 0.25, turn)], lids: lerp(0.86, 0.6, letGo), brows: letGo < 0.5 ? 0.25 : 0, pale: 1 };
        if (tt < 35.7) {
          const at = V.project(P0, 'deep'), s = HEAD_M * at[2];
          atDoor(c, at[0], at[1], s, L, lt, { edge: V.doorEdge(0.9, 1.1, 'deep'), edgeTop: V.doorEdge(0.9, 1.6, 'deep'), tight: 1 - letGo, let: letGo, tau: lerp(-0.15, -1.0, turn), flip: true, face });
        } else {
          // two steps to the latch side, out of her way, the jamb taking him
          const s0 = HEAD_M * V.project(P0, 'deep')[2], d = (tt - 35.7) * STRIDE(s0) / V.project(P0, 'deep')[2];   // metres walked
          const len = Math.hypot(4.1 - P0[0], 0.55 - P0[2]), k = clamp(d / len, 0, 1);
          const at = V.project([lerp(P0[0], 4.1, k), 1.66, lerp(P0[2], 0.55, k)], 'deep'), s = HEAD_M * at[2];
          RIG.draw(c, 'him', 'walk', { x: at[0], y: at[1], s, light: L, t: lt, phase: k < 1 ? (tt - 35.7) * 0.9 : 0.5, face: { pale: 1, lids: 0.6 } });
        }
        V.front(c, lt, S0);
      } },
      // ---------------------------------------------------------------- inside: she comes in and stops like a guest; the door shuts; L009, L010
      { at: 37.0, name: 'inside, facing the door: she comes in and stops just inside, like a guest, coat on; the door shuts behind her; L009, L010', draw(c, st, lt) {
        inside(c, lt, TWO(st, 6.0), { him: { face: { mouth: RIG.mouthFor('L009', lt - 44.5) } } });
      } },
      // ---------------------------------------------------------------- her, close: her eyes leave him and travel the room
      { at: 49.2, name: 'her, close: her eyes leave him and travel the room', draw(c, st, lt) {
        inside(c, lt, HERCLOSE, { him: false });
      }, post: { vig: 0.55 } },
      { at: 50.4, name: 'mug: insert, his rinsed, hers in its ring of dust', draw: insertShot('mug', [10, 6, 0.03]) },
      { at: 52.2, name: 'rect: insert, the pale rectangle and its nail', draw: insertShot('rect', [-12, 0, 0.03]) },
      // her look lands where Q06's push landed: the last frame, her head tipped against his
      { at: 54.2, name: 'fridge: insert by day, the strip; her look settles on the last frame', draw(c, st, lt) {
        const u = seg(st, 0.1, 2.6, 'inOutSine'); c.camera({ x: lerp(960, 935, u), y: lerp(540, 610, u), zoom: lerp(1.0, 1.12, u) });
        LV('fridge').back(c, lt, DAY); LV('fridge').front(c, lt, DAY);
      }, post: { vig: 0.5 } },
      // ---------------------------------------------------------------- her, close: she looks away; L011
      { at: 57.0, name: 'her, close: she looks away from the strip; "I came for my makeup bag. The old one."', draw(c, st, lt) {
        inside(c, lt, HERCLOSE, { him: false });
      }, post: { vig: 0.55 } },
      // ---------------------------------------------------------------- the two of them; he is already moving; she stays, a guest at the door
      { at: 60.4, name: 'inside: he is already moving, out to the bedroom; she stays at the door, alone', draw(c, st, lt) {
        inside(c, lt, { x: 715, y: 520, zoom: 1.36 }, { him: { go: 61.5 } });
      } },
    ],
  });
})();
