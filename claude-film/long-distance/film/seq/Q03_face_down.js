/* LONG DISTANCE — Q03 · Face down (24 s) · S03, A011–A012 · office (wide, desk)
   Grey card under pale green-grey tubes. The phone is a black gloss slab on grey paper in the empty half of his desk. It buzzes:
   the only colour on the floor is the edge of a pink bubble. He reads, bites back a smile. A coworker looks over the divider,
   briefly, ordinarily; he turns the phone face down and goes back to his spreadsheet. */
(function () {
  'use strict';
  const { W, H } = OTM;
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const seg = FILM.seg, key = FILM.key, twos = FILM.twos;
  const OFFICE = () => SETS.office;

  // the redacted message (not in the screenplay, so nothing on the glass can be read): a pink bubble of soft bars
  const MSGS = () => PHONE.HISTORY.morning.concat([['stamp', '10:38'], ['her', { redact: 1 }]]);
  const BUZZ = 8.0;                                     // it buzzes on the desk
  const buzzAt = lt => (lt >= BUZZ && lt < BUZZ + 0.42) || (lt >= BUZZ + 0.62 && lt < BUZZ + 0.95) ? 1 : 0;
  // the rattle, visible at the distance of these cameras: a jitter of the phone's footprint, new every frame (on ones), deterministic
  function rattle(q, lt, px) { if (!buzzAt(lt)) return q; const f = Math.round(lt * 24); const jx = (GG.hash2(f, 3, 91) - 0.5) * 2 * px, jy = (GG.hash2(f, 7, 92) - 0.5) * 1.2 * px; return q.map(p => [p[0] + jx, p[1] + jy]); }
  // the screen: black until the buzz, then the thread with her new (redacted) bubble rising in, lit until he turns it over
  function screenAt(lt) {
    if (lt < BUZZ) return { screen: 'black', state: {} };
    const st = { clock: 'office', msgs: MSGS(), arrive: clamp((lt - BUZZ - 0.05) / 0.2, 0, 1) };
    const p = seg(lt, BUZZ, BUZZ + 0.5);
    return p < 1 ? { screen: 'wake', state: Object.assign({ p, under: 'thread' }, st) } : { screen: 'thread', state: st };
  }

  // ---------------------------------------------------------------- him, from behind (the office cameras stand behind him)
  // RIG has no seated back view for the desk, so the shot builds one from RIG.person (the shirt seen from behind, his head turned
  // to the monitor or the phone) and draws it with RIG.drawFigure, as the rig's own poses do.
  // The cameras look down on him from behind, so his neck is foreshortened: the body is drawn a little higher than a front view
  // the shirt's yoke below the collar, seen from behind: it covers the neck where it goes into the shirt (cut paper, the shirt's
  // colour), so from above and behind his neck meets the collar, not a gap of skin
  const YOKE = { type: 'paper', key: 'q345yoke', box: [-0.7, 0.4, 0.7, 1.3], breath: 1, draw(pen) {
    const col = RIG.COSTUME.shirt.body; const sh = pen.blob([[-0.34, 0.66], [-0.12, 0.6], [0.12, 0.6], [0.34, 0.66], [0.5, 1.1], [0, 1.18], [-0.5, 1.1]]);
    const p = pen.piece(sh, pen.col(col), { seed: 431, kind: 'cloth', tex: 0.55, lift: false }); pen.bands(p, col, { seed: 401 }); } };
  // would put it (o.up, head units) and the head keeps its anchor; the head goes in as the torso's own op, so the collar covers it.
  function himBack(c, o) {
    const up = o.up == null ? 0.22 : o.up;
    const P = RIG.person({ who: 'him', costume: 'shirt', back: true, tau: o.tau, lean: o.lean || 0, shrug: o.shrug || 0, head: false,
      arms: { L: o.armL || null, R: o.armR || null }, legs: false, crop: o.crop == null ? 2.2 : o.crop,
      extra: { afterTorso: [{ type: 'head', p: Object.assign({ neck: 0.32 }, o.head), at: [o.headDx || 0, up], breath: 1 }, YOKE] } });
    const breath = o.t != null ? RIG.breath(o.t, o.breathAmp == null ? 2.5 * Math.min(2, o.s / 250) : o.breathAmp) : 0;
    return RIG.drawFigure(c, { who: 'him', x: o.x, y: o.y - up * o.s, s: o.s, light: o.light, breath, ops: P.ops });
  }
  // his right hand on the mouse, seen from behind and above: palm down, the fingers running away from us (foreshortened)
  const MOUSE = p => ({ basis: { x: [0.12, -0.62, -0.78], z: [0.04, -0.78, 0.62] }, fingers: RIG.FING.keys, thumb: [0.45, 0.6, 0.35, 0.25],
    fdir: [-0.12, 0.62, 0.78], fore: 0.5, foreR: 0.15 });

  // ---------------------------------------------------------------- the wide: from behind the divider row
  // head angles: the monitor (A.head.yaw/pitch), the phone (phoneYaw/phonePitch), and up at the coworker over the far divider
  function wideHead(lt) {
    const A = OFFICE().views.wide.anchors.head;
    const mon = { yaw: A.yaw, pitch: A.pitch }, ph = { yaw: A.phoneYaw + 0.12, pitch: A.phonePitch * 0.75 }, cw = { yaw: 2.5, pitch: -0.3 };
    if (lt < 13) return mon;
    // 13.0: still on the phone; 14.6 the coworker's look lands, he looks up; 15.15 back down; reaching for it
    return twosKey(lt, [[13, ph], [14.55, ph], [14.8, cw, 'outCubic'], [15.1, cw], [15.3, ph, 'inOutSine']]);
  }
  function twosKey(t, ks) { return key(twos(t), ks); }
  function drawWide(c, st, lt, opt) {
    const v = OFFICE().views.wide, A = v.anchors, Lw = RIG.light('office', { keys: v.light.keys, amb: v.light.amb });
    const tt = twos(lt);
    const cw = opt && opt.coworker;
    v.back(c, lt, {
      row: lt >= 8 ? 6 : undefined,
      coworker: cw ? (cc, a) => {
        // the look: he stands to stretch, his eyes pass over the desk and land on him a moment, then he sits back down. Ordinary.
        const rise = key(tt, [[14.0, 0], [14.4, 1, 'outCubic'], [15.2, 1], [15.75, 0, 'inOutSine']]);
        const look = key(tt, [[14.25, 0], [14.55, 1, 'outCubic'], [15.15, 1], [15.4, 0.2]]);
        if (rise > 0.01) RIG.coworker(cc, { x: a.over.x, y: a.over.y, s: a.over.s, rise, look, flip: true, light: Lw, t: lt });
      } : undefined,
    });
    // the phone on the desk, in the empty half: dark until the buzz, lit after
    const scr = screenAt(lt);
    const P = { quad: rattle(A.phone.quad, lt, 1.2), edge: [0, 2], screen: scr.screen, state: scr.state, env: '#C8D0C4', bright: 1, t: lt };
    const info = PHONE.where(P, c);
    if (lt >= BUZZ) PHONE.glow(c, { info, x: A.phone.x + 4, y: A.phone.y + 2, r: 95, sy: 0.45, k: 0.55, tone: 'night' });
    // him
    const h = wideHead(lt);
    const reach = opt && opt.reach ? seg(tt, 15.1, 15.5, 'inOutSine') : 0;
    const mouse = [(A.hands.right.x - A.head.x) / A.head.s, (A.hands.right.y - A.head.y) / A.head.s];
    const toPh = [lerp(mouse[0], mouse[0] + 0.9, reach), lerp(mouse[1], mouse[1] + 0.12, reach)];
    const nudge = lt < 6 ? Math.sin(Math.floor(tt * 2) * 1.7) * 0.03 : 0;    // the mouse hand works a little
    himBack(c, { x: A.head.x, y: A.head.y, s: A.head.s, tau: 2.75, lean: 0.06, light: Lw, t: lt,
      head: { yaw: h.yaw, pitch: h.pitch, lids: 0.6 },
      armR: { to: [toPh[0] + nudge, toPh[1]], bend: -1, hand: MOUSE, flipHand: true, hp: {} },
      armL: { to: [(A.hands.left.x - A.head.x) / A.head.s, (A.hands.left.y - A.head.y) / A.head.s], bend: 1, hand: false, front: true } });
    v.front(c, lt, {});
    PHONE.draw(c, Object.assign({ buzz: buzzAt(lt), shadow: { alpha: 0.35 } }, P));
  }

  // ---------------------------------------------------------------- the desk: over his right shoulder
  function deskHead(lt) {
    const A = OFFICE().views.desk.anchors.head;
    const mon = { yaw: A.yaw, pitch: A.pitch, smile: 0, lids: 0.62 };
    const ph = { yaw: 1.86, pitch: 0.3, smile: 0, lids: 0.55, gaze: [0.2, 0.4] };
    // back at work; once, he glances at the face-down phone and back (21.6–22.7): nothing on his face
    if (lt >= 18) { const g = twosKey(lt, [[21.6, 0], [21.85, 1, 'outCubic'], [22.4, 1], [22.7, 0, 'inOutSine']]); return Object.assign({}, mon, { yaw: lerp(mon.yaw, 2.55, g), pitch: lerp(mon.pitch, 0.32, g) }); }
    // 8.0 the buzz; 8.35 he turns to it (on twos, quick, five drawings); reads; 10–13 bites back a smile
    const k = twosKey(lt, [[8.3, mon], [8.75, ph, 'inOutSine']]);
    const sm = twosKey(lt, [[10.0, 0], [10.6, 0.25], [11.4, 0.375], [12.1, 0.25], [12.8, 0.375]]);
    return Object.assign({}, k, { smile: lt > 8.75 ? sm : 0, brows: lt > 10.2 ? 0.15 : 0, mouth: 0 });
  }
  function drawDesk(c, st, lt, opt) {
    const v = OFFICE().views.desk, A = v.anchors;
    const faceDown = opt && opt.faceDown;
    const scr = faceDown ? { screen: 'black', state: {} } : screenAt(lt);
    const P = faceDown ? null : { quad: rattle(A.phone.quad, lt, 2.6), edge: [0, 3], screen: scr.screen, state: scr.state, env: '#C8D0C4', t: lt };
    const lit = !faceDown && lt >= BUZZ;
    const L = RIG.light('office', { keys: v.light.keys, amb: v.light.amb, phone: lit ? [A.phone.x - 380, A.phone.y - 120] : null, phoneK: 0.5 });
    // while he reads, the camera leans in a little (9–13: 0.6 % a second, eased); back at work it holds
    if (!faceDown) { const z = lerp(1, 1.024, seg(lt, 9.0, 13.0, 'inOutSine')); c.camera({ x: W / 2 - 55 * (z - 1) / 0.024, y: H / 2 + 10 * (z - 1) / 0.024, zoom: z }); }
    v.back(c, lt, { row: lt < 18 ? (lt < 8 ? undefined : 6) : 6 + Math.floor((twos(lt) - 18) / 1.6) % 8 });
    let info = null;
    if (P) { info = PHONE.where(P, c); if (lit) PHONE.glow(c, { info, x: A.phone.x + 6, y: A.phone.y + 6, r: 230, sy: 0.42, k: 0.55, tone: 'night' }); }
    const h = deskHead(lt);
    const mouse = [(A.hands.right.x - A.head.x) / A.head.s, (A.hands.right.y - A.head.y) / A.head.s];
    himBack(c, { x: A.head.x, y: A.head.y, s: A.head.s, tau: 2.9, lean: 0.05, light: L, t: lt, crop: 1.9,
      head: Object.assign({ lids: 0.6 }, h),
      armR: { E: [mouse[0] - 0.75, mouse[1] + 0.75], W: [mouse[0] - 0.1, mouse[1] + 0.12], hand: MOUSE, flipHand: true, hp: {} } });
    v.front(c, lt, {});
    if (P) PHONE.draw(c, Object.assign({ buzz: buzzAt(lt), shadow: { alpha: 0.4 } }, P));
    else drawFaceDown(c, A.phone);
  }
  // the phone face down where it lies: a black gloss slab on grey paper, a soft contact shadow
  function drawFaceDown(c, ph) {
    const q = ph.quad.map(p => [p[0] - 58, p[1] + 1]);     // turned over onto its left edge: it lies one width to the left
    PHONE.draw(c, { quad: [q[1], q[0], q[3], q[2]], face: 'back', edge: [0, 3], screen: 'black', lit: false, env: '#C8D0C4', shadow: { alpha: 0.45 } });
  }

  // ---------------------------------------------------------------- the insert: his hand, the black slab (15.5–18)
  // a closer look at the same desk from the same side: grey card in two cut bands of the tubes' light, the keyboard's end at the
  // left, the phone face up in the empty half. His hand comes in from the left, turns it over and rests on its back.
  const INS = { cx: 1080, cy: 560, h: 560, pitch: 1.02, spin: -0.06, roll: -0.04 };
  function insertBg(c) {
    const cv = c.cache('Q03|insert|desk', g => {
      const P = { top: '#8E938B', mid: '#9DA299', lit: '#AEB3A9', shade: '#5E635D' };
      g.fillStyle = '#6E736C'; g.fillRect(0, 0, W, H);
      // the desk top: one big sheet, two cut bands of the tubes' light toward the back
      const top = OTM.S().poly([[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]]);
      const tp = GG.piece(g, top, { fill: P.mid, rough: 0.6, seed: 31, tex: 0.6, kind: 'card' });
      GG.bands(g, tp, [W * 0.5, H * 1.05], [W * 0.62, -40], [P.top, P.mid, P.lit], { stops: [0, 0.42, 0.8], rough: 3.2, seed: 32 });
      GG.texture(g, tp, 0.35, 33, 'card');
      // the back edge of the desk and the divider's foot at the top
      const back = GG.blob([[-80, -80], [W + 80, -80], [W + 80, 70, 1], [W * 0.6, 92], [-80, 110, 1]]);
      const bp = GG.piece(g, back, { fill: '#5D625B', rough: 1.1, seed: 34, tex: 0.6, kind: 'cloth', lift: [0, 10], liftAlpha: 0.5, liftBlur: 14 });
      GG.crescent(g, bp, 0, 6, '#767B73', 0.8);
      // the keyboard's right end, at the left edge (dark card, its keys in rows)
      const kb = GG.blob([[-120, 380, 1], [250, 352, 1], [300, 836, 1], [-120, 880, 1]]);
      const kp = GG.piece(g, kb, { fill: '#3A3D3F', rough: 0.6, seed: 35, tex: 0.4, kind: 'card', lift: [10, 16], liftAlpha: 0.55, liftBlur: 16 });
      GG.crescent(g, kp, -4, -6, '#5C6164', 0.8);
      g.save(); g.clip(kp);
      for (let j = 0; j < 6; j++) for (let i = 0; i < 4; i++) { const x0 = -90 + i * 78 + j * 2.5, y0 = 400 + j * 74; const k = GG.blob([[x0, y0, 1], [x0 + 62, y0 - 3, 1], [x0 + 66, y0 + 58, 1], [x0 + 3, y0 + 62, 1]]);
        const p2 = GG.piece(g, k, { fill: (i + j) % 5 === 0 ? '#53575A' : '#45494B', rough: 0.4, seed: 40 + i + j * 4, tex: 0.3, kind: 'card', lift: [2, 4], liftAlpha: 0.5, liftBlur: 3 }); GG.crescent(g, p2, -1, -3, '#62676A', 0.7); }
      g.restore();
      // a ring where a mug stood (a real, ordinary desk)
      g.save(); g.strokeStyle = 'rgba(70,58,46,0.18)'; g.lineWidth = 5; g.beginPath(); g.ellipse(1640, 250, 70, 34, -0.05, 0, 7); g.stroke(); g.restore();
    });
    c.reset(); c.g.drawImage(cv, 0, 0);
  }
  // the flip: yaw 0 (face up) .. PI (face down), pivoting on its left long edge, so it lands one width to the left
  function flipAt(lt) { return twosKey(lt, [[15.95, 0], [16.22, Math.PI, 'inOutSine']]); }
  function insertPhone(lt) {
    const th = flipAt(lt), w = INS.h * 0.486;
    const cx = INS.cx - (w / 2) * (1 - Math.cos(th)), lift = (w / 2) * Math.sin(th) * Math.sin(INS.pitch);
    return { x: cx, y: INS.cy - lift, h: INS.h, pitch: INS.pitch, spin: INS.spin, roll: INS.roll, yaw: th, persp: 2200, env: '#C8D0C4', theta: th };
  }
  function drawInsert(c, st, lt) {
    insertBg(c);
    const scr = screenAt(lt); const ph = insertPhone(lt); const th = ph.theta;
    const P = Object.assign({}, ph, { screen: scr.screen, state: scr.state, t: lt, shadow: { alpha: 0.45, dy: 18, dx: 8, blur: 22 }, bright: 1 });
    const up = Math.max(0, Math.cos(th));
    const info = PHONE.where(P, c);
    if (up > 0.02) PHONE.glow(c, { info, x: ph.x + 10, y: ph.y + 40, r: 520, sy: 0.5, k: 0.6 * up, tone: 'night' });
    // his hand: in from the lower left (15.5–15.95), takes the near edge, turns it (16.0–16.22), lies flat on its back (to 17.4), goes
    const tt = twos(lt), L = RIG.light('office', { amb: '#6E7570' });
    const s = 400;
    const w = INS.h * 0.486;
    const enter = seg(tt, 15.45, 15.92, 'outCubic'), leave = seg(tt, 17.35, 17.85, 'inOutSine');
    let hx, hy, pose, hp = { flip: true };
    if (tt < 16.0) { hx = lerp(260, INS.cx - w * 0.62, enter); hy = lerp(1180, INS.cy + 150, enter); pose = 'take'; hp.close = lerp(0.1, 0.45, enter); }
    else if (tt < 16.25) { const u = seg(tt, 16.0, 16.22); hx = lerp(INS.cx - w * 0.62, INS.cx - w * 1.3, u); hy = INS.cy + 150 - 120 * Math.sin(u * Math.PI); pose = 'take'; hp.close = 0.6; }
    else { hx = lerp(INS.cx - w * 1.25, -260, leave); hy = lerp(INS.cy + 120, 1200, leave); pose = 'flat'; hp.close = 0.1; }
    // the phone first (gloss) with the hand's shape cut out of it (mask), then the hand and its cuff on the paper, over it
    const handP = Object.assign({ x: hx, y: hy, s, fore: [-0.7, 0.75], light: L, foreLen: 1.4 }, hp);
    const face = th > Math.PI / 2;
    const mask = m => { RIG.hand(c, 'him', pose, Object.assign({}, handP, { target: m, shadow: false })); m.save(); m.fillStyle = '#000'; m.fill(sleevePath(handP, pose, c)); m.restore(); };
    PHONE.draw(c, Object.assign({}, P, face ? { screen: 'black', lit: false } : {}, { buzz: 0, mask, maskShadow: { alpha: 0.45 } }));
    const hand = RIG.hand(c, 'him', pose, handP);
    sleeve(c, hand, L);
    void info;
  }
  function sleevePath(handP, pose, c) { const h = RIG.hand(c, 'him', pose, Object.assign({}, handP, { target: SCRATCH(), shadow: false })); return sleeveShape(h).path(1.2, 51); }
  let _scr = null; function SCRATCH() { if (!_scr) _scr = OTM.makeCanvas(8, 8).getContext('2d'); return _scr; }
  function sleeveShape(hand) {
    const el = hand.elbow || [hand.x - 600, hand.y + 600];
    const x = hand.x, y = hand.y, dx = el[0] - x, dy = el[1] - y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, nx = -uy, ny = ux, r = 92;
    const a = [x + ux * 40, y + uy * 40], b = [x + ux * 1400, y + uy * 1400];
    const sh = GG.blob([[a[0] + nx * r, a[1] + ny * r, 1], [b[0] + nx * r * 1.15, b[1] + ny * r * 1.15, 1], [b[0] - nx * r * 1.15, b[1] - ny * r * 1.15, 1], [a[0] - nx * r, a[1] - ny * r, 1]]);
    sh._a = a; sh._u = [ux, uy]; sh._n = [nx, ny]; sh._r = r; return sh;
  }
  // the shirt cuff over his wrist, cut paper (pale blue under the tubes)
  function sleeve(c, hand, L) {
    const sh = sleeveShape(hand), a = sh._a, [ux, uy] = sh._u, [nx, ny] = sh._n, r = sh._r;
    const g = c.g; g.save();
    const p = GG.piece(g, sh, { fill: '#7E8C9E', rough: 1.2, seed: 51, tex: 0.55, kind: 'cloth', lift: [-6, 10], liftAlpha: 0.45, liftBlur: 12 });
    GG.crescent(g, p, -ux * 10 + nx * 6, -uy * 10 + ny * 6, '#9AA6B6', 0.8);
    g.strokeStyle = '#5E6A7A'; g.lineWidth = 5; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(a[0] + nx * r * 0.95 + ux * 30, a[1] + ny * r * 0.95 + uy * 30); g.lineTo(a[0] - nx * r * 0.95 + ux * 30, a[1] - ny * r * 0.95 + uy * 30); g.stroke();
    g.restore();
  }

  FILM.seq({
    id: 'Q03', title: 'Face down', dur: 24,
    setup() { if (SETS.office.prepare) SETS.office.prepare(); },
    lines: [],
    sound(S) {
      S.bed('office', 0, 24, { level: -40 });                  // air, the tubes, distant keyboards
      S.bed('keyboard_near', 0, 6, { level: -44 });            // his own keys and mouse, sparse
      S.cue('vibrate_desk', 8.0);                              // the phone rattles on the desk
      S.cue('vibrate_desk', 8.62, { level: -3 });
      S.cue('chair_creak', 14.0);                              // the coworker stands
      S.cue('phone_flip', 16.0);                               // glass turned onto the desk
      S.bed('keyboard_near', 18.5, 24, { level: -44 });
    },
    shots: [
      { at: 0, name: 'wide: open plan, he works; the phone beside his keyboard', draw(c, st, lt) { drawWide(c, st, lt, {}); } },
      { at: 6, name: 'desk: it buzzes; he reads; bites back a smile', draw(c, st, lt) { drawDesk(c, st, lt, {}); } },
      { at: 13, name: 'wide: a coworker looks over the divider', draw(c, st, lt) { drawWide(c, st, lt, { coworker: true, reach: true }); } },
      { at: 15.5, name: 'insert: the hand, the black slab', draw(c, st, lt) { drawInsert(c, st, lt); } },
      { at: 18, name: 'desk: back to the spreadsheet; the phone face down', draw(c, st, lt) { drawDesk(c, st, lt, { faceDown: true }); } },
    ],
  });
})();
