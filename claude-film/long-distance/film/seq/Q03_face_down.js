/* LONG DISTANCE — Q03 · Face down (26 s) · S03, A011–A012 · office (wide, desk, the divider), insert
   Grey card under pale green-grey tubes. The phone is a black gloss slab on grey paper in the empty half of his desk. It buzzes:
   the only colour on the floor is the edge of a pink bubble. He reads, bites back a smile. A coworker stands up behind the divider
   and looks over: an ordinary glance, but it lands on him, and he feels it. He turns the phone face down and goes back to his
   spreadsheet. */
(function () {
  'use strict';
  const { W, H } = OTM;
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const seg = FILM.seg, key = FILM.key, twos = FILM.twos;
  const tk = (t, ks) => key(twos(t), ks);              // a character's key, on twos
  const OFFICE = () => SETS.office;

  // ---------------------------------------------------------------- the timeline
  const BUZZ = 8.0;                                     // it buzzes on the desk
  const RISE = 13.45;                                   // the coworker stands up behind the far divider (wide)
  const OTS = 14.4;                                     // over his shoulder: the coworker's look lands on him
  const INS = 16.4;                                     // the insert: his hand turns the phone over
  const FLIP = 16.95;                                   // the turn (its sound)
  const BACK = 19.0;                                    // back to the spreadsheet
  const DUR = 26;

  // the redacted message (not in the screenplay, so nothing on the glass can be read): a pink bubble of soft bars
  const MSGS = () => PHONE.HISTORY.morning.concat([['stamp', '10:38'], ['her', { redact: 1 }]]);
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

  // ---------------------------------------------------------------- him at his desk, from behind (the rig's back view)
  // his hands are at the keyboard, in front of him (hidden by his back): the back view's own arms, elbows out
  function himAtDesk(c, v, o) {
    const A = v.anchors;
    return RIG.draw(c, 'him', 'desk', { view: 'back', x: A.head.x + (o.nudge || 0), y: A.head.y, s: A.head.s, light: o.light, t: o.t, crop: o.crop, face: o.face });
  }

  // ---------------------------------------------------------------- 1 · the wide (0–6) and 3 · the coworker stands (13–14.4)
  function wideFace(lt) {
    const A = OFFICE().views.wide.anchors.head;
    const mon = { yaw: A.yaw, pitch: A.pitch, lids: 0.6 }, ph = { yaw: A.phoneYaw + 0.12, pitch: A.phonePitch * 0.75, lids: 0.55 };
    return lt < 12 ? mon : ph;
  }
  function drawWide(c, st, lt, opt) {
    const v = OFFICE().views.wide, A = v.anchors, Lw = RIG.light('office', { keys: v.light.keys, amb: v.light.amb });
    const tt = twos(lt);
    v.back(c, lt, {
      row: lt >= 8 ? 6 : undefined,
      coworker: opt.coworker ? (cc, a) => {
        // he stands up behind the far divider, deliberately (0.7 s), and starts to look round toward the desk
        const rise = tk(lt, [[RISE, 0], [RISE + 0.7, 1, 'inOutSine']]);
        const look = tk(lt, [[RISE + 0.55, 0], [OTS, 0.45, 'inOutSine']]);
        if (rise > 0.01) { const f = RIG.coworker(cc, { x: a.over.x, y: a.over.y, s: a.over.s, rise, look, flip: true, light: Lw, t: lt, face: { stubble: 0.55 } }); glasses(cc, f, a.over.s); }
      } : undefined,
    });
    const scr = screenAt(lt);
    const P = { quad: rattle(A.phone.quad, lt, 1.2), edge: [0, 2], screen: scr.screen, state: scr.state, env: '#C8D0C4', t: lt };
    const info = PHONE.where(P, c);
    if (lt >= BUZZ) PHONE.glow(c, { info, x: A.phone.x + 4, y: A.phone.y + 2, r: 95, sy: 0.45, k: 0.55, tone: 'night' });
    const nudge = lt < 6 ? Math.sin(Math.floor(tt * 1.5) * 1.7) * 0.8 : 0;  // he works: a little shift now and then (on twos)
    himAtDesk(c, v, { light: Lw, t: lt, nudge, face: wideFace(lt) });
    v.front(c, lt, {});
    PHONE.draw(c, Object.assign({ buzz: buzzAt(lt), shadow: { alpha: 0.35 } }, P));
  }
  // the coworker's glasses: two thin frames of dark card over his eyes, so nobody takes him for anyone else
  function glasses(c, fig, s) {
    const hd = fig && fig.heads && fig.heads.head; if (!hd || !hd.eyeL || !hd.eyeR) return;
    const g = c.g, a = hd.eyeL, b = hd.eyeR, d = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const w = Math.max(d * 0.62, s * 0.07), h = w * 0.72, lw = Math.max(1.2, s * 0.012);
    g.save(); g.strokeStyle = '#2B2622'; g.lineWidth = lw; g.lineJoin = 'round';
    [a, b].forEach(e => { g.save(); g.translate(e[0], e[1] + h * 0.08); g.rotate(ang); g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, h * 0.35); g.stroke(); g.restore(); });
    g.beginPath(); g.moveTo(a[0] + Math.cos(ang) * w / 2, a[1] + Math.sin(ang) * w / 2); g.lineTo(b[0] - Math.cos(ang) * w / 2, b[1] - Math.sin(ang) * w / 2); g.stroke();
    // the lit edge of the frames (cut paper catches the tubes from above)
    g.strokeStyle = 'rgba(214,220,206,0.5)'; g.lineWidth = lw * 0.45;
    [a, b].forEach(e => { g.save(); g.translate(e[0], e[1] + h * 0.08 - lw * 0.6); g.rotate(ang); g.beginPath(); g.moveTo(-w / 2 + h * 0.3, -h / 2); g.lineTo(w / 2 - h * 0.3, -h / 2); g.stroke(); g.restore(); });
    g.restore();
  }

  // ---------------------------------------------------------------- 2 · the desk: over his right shoulder (6–13, 19–26)
  function deskFace(lt) {
    const A = OFFICE().views.desk.anchors.head;
    const mon = { yaw: A.yaw, pitch: A.pitch, smile: 0, lids: 0.62 };
    const ph = { yaw: 1.86, pitch: 0.3, smile: 0, lids: 0.55, gaze: [0.2, 0.4] };
    // back at work; once, he glances at the face-down phone and back: nothing on his face
    if (lt >= BACK) { const g = tk(lt, [[22.6, 0], [22.85, 1, 'outCubic'], [23.4, 1], [23.7, 0, 'inOutSine']]); return Object.assign({}, mon, { yaw: lerp(mon.yaw, 2.55, g), pitch: lerp(mon.pitch, 0.32, g) }); }
    // 8.0 the buzz; 8.35 he turns to it (on twos, quick); reads; 10–13 bites back a smile
    const k = tk(lt, [[8.3, mon], [8.75, ph, 'inOutSine']]);
    const sm = tk(lt, [[10.0, 0], [10.6, 0.25], [11.4, 0.375], [12.1, 0.25], [12.8, 0.375]]);
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
    v.back(c, lt, { row: lt < BACK ? (lt < 8 ? undefined : 6) : 6 + Math.floor((twos(lt) - BACK) / 1.6) % 8 });
    if (P) { const info = PHONE.where(P, c); if (lit) PHONE.glow(c, { info, x: A.phone.x + 6, y: A.phone.y + 6, r: 230, sy: 0.42, k: 0.55, tone: 'night' }); }
    himAtDesk(c, v, { light: L, t: lt, crop: 1.9, face: deskFace(lt) });
    v.front(c, lt, {});
    if (P) PHONE.draw(c, Object.assign({ buzz: buzzAt(lt), shadow: { alpha: 0.4 } }, P));
    else drawFaceDown(c, A.phone);
  }
  // the phone face down where it lies: a black gloss slab on grey paper, a soft contact shadow
  function drawFaceDown(c, ph) {
    const q = ph.quad.map(p => [p[0] - 58, p[1] + 1]);     // turned over onto its left edge: it lies one width to the left
    PHONE.draw(c, { quad: [q[1], q[0], q[3], q[2]], face: 'back', edge: [0, 3], screen: 'black', lit: false, env: '#C8D0C4', shadow: { alpha: 0.45 } });
  }

  // ---------------------------------------------------------------- 4 · over his shoulder to the divider (14.4–16.4)
  // From behind his left shoulder, low, looking up the length of his desk to the divider at its back: the back of his head and
  // shoulder big in the lower left (his half), the divider's grey fabric across the frame with the pinned square of cleaner cloth,
  // and over its top, in the empty half, the coworker: a different man (lighter, greying, glasses, a cardigan), on his feet with a
  // mug, whose eyes come down onto him and stay a moment. He feels it: his head comes up. Then the coworker looks away and sits.
  const DV = { top: 600, post: 860 };                    // the divider's top edge (y) and its post (x): the seam between the halves
  const CW = { x: 1330, y: 206, s: 230 };                // the coworker's head, leaning on the divider (his forearms on its rail)
  const ME = { x: 470, y: 500, s: 460 };                 // his head, close, from behind; his shoulder at the foot of the frame
  function otsFar(c) {
    const cv = c.cache('Q03|ots|far', g => {
      // the far office, soft with distance: the ceiling and its tubes, the window band with the blinds down, the far divider tops
      g.fillStyle = '#9EA49B'; g.fillRect(0, 0, W, H);
      const ceil = OTM.S().poly([[-60, -60], [W + 60, -60], [W + 60, 300], [-60, 330]]);
      const cp = GG.piece(g, ceil, { fill: '#A9AFA6', rough: 0.6, seed: 301, tex: 0.5, kind: 'card' });
      GG.bands(g, cp, [W * 0.5, 330], [W * 0.5, -60], ['#9AA097', '#A9AFA6', '#B6BBB1'], { stops: [0, 0.45, 0.8], rough: 2.6, seed: 302 });
      [[120, 40, 360, 90], [620, 70, 860, 112], [1120, 64, 1380, 108], [1590, 34, 1860, 86], [380, 196, 560, 222], [860, 206, 1040, 230], [1330, 200, 1510, 226]].forEach(([x0, y0, x1, y1], i) => {
        const tp = GG.piece(g, OTM.S().poly([[x0, y0], [x1, y0 - 4], [x1 + 8, y1], [x0 - 8, y1 + 4]]), { fill: '#E2E8DC', rough: 0.8, seed: 310 + i, tex: 0.25, kind: 'card' }); void tp; });
      const win = OTM.S().poly([[-60, 330], [W + 60, 300], [W + 60, 450], [-60, 470]]);
      const wp = GG.piece(g, win, { fill: '#C6CBC0', rough: 0.6, seed: 320, tex: 0.4, kind: 'card' });
      g.save(); g.clip(wp); g.strokeStyle = 'rgba(120,128,118,0.55)'; g.lineWidth = 3; for (let y = 312; y < 470; y += 11) { g.beginPath(); g.moveTo(-60, y + 18); g.lineTo(W + 60, y); g.stroke(); }
      [250, 700, 1150, 1600].forEach(x => { g.fillStyle = '#8C9289'; g.fillRect(x, 290, 34, 190); }); g.restore();
      const far = OTM.S().poly([[-60, 452], [W + 60, 430], [W + 60, 640], [-60, 660]]);
      const fp = GG.piece(g, far, { fill: '#7E847B', rough: 1.0, seed: 330, tex: 0.6, kind: 'cloth' });
      GG.bands(g, fp, [W * 0.5, 640], [W * 0.5, 430], ['#727870', '#7E847B', '#8C9289'], { stops: [0, 0.5, 0.85], rough: 2.4, seed: 331 });
      g.fillStyle = '#5E635C'; g.fillRect(-60, 440, W + 120, 12);
      [[260, 386, 120, 64], [980, 376, 130, 70], [1560, 380, 110, 62]].forEach(([x, y, w, h], i) => { GG.piece(g, OTM.S().poly([[x, y], [x + w, y - 2], [x + w, y + h], [x, y + h + 2]]), { fill: '#3E4240', rough: 0.5, seed: 340 + i, tex: 0.3, kind: 'card' }); });
      // soft with distance: blurred once, into the cache
      const t = OTM.makeCanvas(W, H), tg = t.getContext('2d'); tg.drawImage(g.canvas, 0, 0); g.clearRect(0, 0, W, H); g.filter = 'blur(3px)'; g.drawImage(t, 0, 0); g.filter = 'none';
    });
    c.g.drawImage(cv, 0, 0);
  }
  function otsDivider(c) {
    const cv = c.cache('Q03|ots|divider', g => {
      // the divider at the back of his desk: grey fabric in two cut bands of the tubes' light, its darker top rail, a post
      const panel = GG.blob([[-80, DV.top + 6, 1], [W + 80, DV.top + 26, 1], [W + 80, H + 80, 1], [-80, H + 80, 1]]);
      const pp = GG.piece(g, panel, { fill: '#848A81', rough: 0.9, seed: 350, tex: 0.7, kind: 'cloth', lift: [0, -12], liftAlpha: 0.45, liftBlur: 18 });
      GG.bands(g, pp, [W * 0.5, H], [W * 0.5, DV.top], ['#6E746C', '#7C8279', '#8B9188'], { stops: [0, 0.5, 0.86], rough: 2.8, seed: 351 });
      GG.texture(g, pp, 0.35, 352, 'cloth');
      const rail = GG.blob([[-80, DV.top - 12, 1], [W + 80, DV.top + 8, 1], [W + 80, DV.top + 34, 1], [-80, DV.top + 16, 1]]);
      const rp = GG.piece(g, rail, { fill: '#5C615A', rough: 0.6, seed: 353, tex: 0.4, kind: 'card', lift: [0, 6], liftAlpha: 0.5, liftBlur: 8 });
      GG.crescent(g, rp, 0, -5, '#8E9389', 0.8);
      const post = GG.blob([[DV.post - 16, DV.top + 6, 1], [DV.post + 16, DV.top + 8, 1], [DV.post + 22, H + 80, 1], [DV.post - 22, H + 80, 1]]);
      const po = GG.piece(g, post, { fill: '#666B63', rough: 0.5, seed: 354, tex: 0.4, kind: 'card', lift: [4, 0], liftAlpha: 0.4, liftBlur: 8 });
      GG.crescent(g, po, -3, 0, '#858A80', 0.8);
      // the empty half: four pins round a square of cleaner fabric where something used to hang
      const sq = OTM.S().poly([[1390, 700], [1600, 704], [1598, 905], [1388, 900]]);
      g.save(); g.globalAlpha = 0.55; GG.piece(g, sq, { fill: '#929890', rough: 0.7, seed: 355, tex: 0.3, kind: 'cloth' }); g.restore();
      [[1392, 702], [1598, 706], [1596, 903], [1390, 898]].forEach(([x, y]) => { g.fillStyle = '#3A3E3A'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.fillStyle = 'rgba(220,226,214,0.6)'; g.beginPath(); g.arc(x - 1.5, y - 1.5, 1.8, 0, 7); g.fill(); });
      // his half: his monitor's back corner at the left edge, dark, the spreadsheet's light round its rim
      const mon = GG.blob([[-80, 430, 1], [250, 452, 1], [262, 840, 1], [-80, 860, 1]]);
      const mp = GG.piece(g, mon, { fill: '#33373A', rough: 0.5, seed: 356, tex: 0.3, kind: 'card', lift: [12, 14], liftAlpha: 0.55, liftBlur: 16 });
      GG.crescent(g, mp, 5, -5, '#565B5E', 0.8);
    });
    c.g.drawImage(cv, 0, 0);
  }
  // his head and shoulder: up from the phone at 15.0 (he feels the look), and down again at 15.9
  function otsMe(lt) {
    const down = { yaw: Math.PI - 0.62, pitch: -0.42, lids: 0.5 }, up = { yaw: Math.PI - 0.34, pitch: 0.1, lids: 0.68 };
    return tk(lt, [[OTS, down], [15.0, down], [15.3, up, 'outCubic'], [15.95, up], [16.25, down, 'inOutSine']]);
  }
  function drawOTS(c, st, lt) {
    const L = RIG.light('office', { amb: '#6E7570', keys: [{ dir: [0.1, -0.85, 0.35], col: '#E6F0E6', k: 0.5, poster: [0.2, 0.55], levels: [0.6, 1] }] });
    otsFar(c);
    // the coworker, leaning his forearms on the divider's rail: his eyes come down onto him (14.55–14.85) and stay there a moment,
    // a little curious, nothing more; at 15.85 he looks away, and at 15.95 he pushes off the rail and sits back down out of sight
    otsDivider(c);
    const look = tk(lt, [[OTS, 0.45], [14.85, 1, 'outCubic'], [15.8, 1], [16.05, 0.15, 'inOutSine']]);
    const rise = tk(lt, [[15.95, 1], [16.45, 0.2, 'inOutSine']]);
    c.g.save(); c.g.beginPath(); c.g.moveTo(-10, -10); c.g.lineTo(W + 10, -10); c.g.lineTo(W + 10, DV.top + 12); c.g.lineTo(-10, DV.top - 6); c.g.closePath(); c.g.clip();
    const fig = RIG.coworker(c, { x: CW.x, y: CW.y, s: CW.s, rise, look, flip: true, light: L, t: lt,
      face: { stubble: 0.55, brows: lt > 14.9 && lt < 15.8 ? 0.25 : 0.1, lids: 0.64, yaw: lerp(0.1, 0.78, look), pitch: lerp(0.08, 0.42, look), gaze: [lerp(0, 0.4, look), lerp(0.1, 0.5, look)] } });
    glasses(c, fig, CW.s);
    c.g.restore();
    // him, close, from behind: the back of his head and his left shoulder (the phone's light from below on his cheek and collar)
    const f = otsMe(lt);
    const Lme = RIG.light('office', { amb: '#5E655F', keys: [{ dir: [0.25, -0.8, -0.4], col: '#DCE4DA', k: 0.42, poster: [0.2, 0.55], levels: [0.6, 1] }],
      phone: [ME.x + 0.8 * ME.s, ME.y + 1.5 * ME.s], phoneK: 0.6 });
    RIG.draw(c, 'him', 'desk', { view: 'back', x: ME.x, y: ME.y, s: ME.s, light: Lme, t: lt, crop: 1.5, tau: 0.22, face: f });
    PHONE.glow(c, { x: ME.x + 520, y: H + 120, r: 600, k: 0.3, tone: 'night', em: 0.05 });
  }
  // ---------------------------------------------------------------- 5 · the insert: his hand, the black slab (16.4–19)
  // a closer look at the same desk from the same side: grey card in two cut bands of the tubes' light, the keyboard's end at the
  // left, the phone face up in the empty half. His hand comes in from the left, turns it over and rests on its back.
  const IP = { cx: 1080, cy: 560, h: 560, pitch: 1.02, spin: -0.06, roll: -0.04 };
  function insertBg(c) {
    const cv = c.cache('Q03|insert|desk', g => {
      const P = { top: '#8E938B', mid: '#9DA299', lit: '#AEB3A9' };
      g.fillStyle = '#6E736C'; g.fillRect(0, 0, W, H);
      const top = OTM.S().poly([[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]]);
      const tp = GG.piece(g, top, { fill: P.mid, rough: 0.6, seed: 31, tex: 0.6, kind: 'card' });
      GG.bands(g, tp, [W * 0.5, H * 1.05], [W * 0.62, -40], [P.top, P.mid, P.lit], { stops: [0, 0.42, 0.8], rough: 3.2, seed: 32 });
      GG.texture(g, tp, 0.35, 33, 'card');
      const back = GG.blob([[-80, -80], [W + 80, -80], [W + 80, 70, 1], [W * 0.6, 92], [-80, 110, 1]]);
      const bp = GG.piece(g, back, { fill: '#5D625B', rough: 1.1, seed: 34, tex: 0.6, kind: 'cloth', lift: [0, 10], liftAlpha: 0.5, liftBlur: 14 });
      GG.crescent(g, bp, 0, 6, '#767B73', 0.8);
      const kb = GG.blob([[-120, 380, 1], [250, 352, 1], [300, 836, 1], [-120, 880, 1]]);
      const kp = GG.piece(g, kb, { fill: '#3A3D3F', rough: 0.6, seed: 35, tex: 0.4, kind: 'card', lift: [10, 16], liftAlpha: 0.55, liftBlur: 16 });
      GG.crescent(g, kp, -4, -6, '#5C6164', 0.8);
      g.save(); g.clip(kp);
      for (let j = 0; j < 6; j++) for (let i = 0; i < 4; i++) { const x0 = -90 + i * 78 + j * 2.5, y0 = 400 + j * 74; const k = GG.blob([[x0, y0, 1], [x0 + 62, y0 - 3, 1], [x0 + 66, y0 + 58, 1], [x0 + 3, y0 + 62, 1]]);
        const p2 = GG.piece(g, k, { fill: (i + j) % 5 === 0 ? '#53575A' : '#45494B', rough: 0.4, seed: 40 + i + j * 4, tex: 0.3, kind: 'card', lift: [2, 4], liftAlpha: 0.5, liftBlur: 3 }); GG.crescent(g, p2, -1, -3, '#62676A', 0.7); }
      g.restore();
      g.save(); g.strokeStyle = 'rgba(70,58,46,0.18)'; g.lineWidth = 5; g.beginPath(); g.ellipse(1640, 250, 70, 34, -0.05, 0, 7); g.stroke(); g.restore();
    });
    c.reset(); c.g.drawImage(cv, 0, 0);
  }
  // the flip: yaw 0 (face up) .. PI (face down), pivoting on its left long edge, so it lands one width to the left
  function flipAt(lt) { return tk(lt, [[FLIP, 0], [FLIP + 0.27, Math.PI, 'inOutSine']]); }
  function insertPhone(lt) {
    const th = flipAt(lt), w = IP.h * 0.486;
    const cx = IP.cx - (w / 2) * (1 - Math.cos(th)), lift = (w / 2) * Math.sin(th) * Math.sin(IP.pitch);
    return { x: cx, y: IP.cy - lift, h: IP.h, pitch: IP.pitch, spin: IP.spin, roll: IP.roll, yaw: th, persp: 2200, env: '#C8D0C4', theta: th };
  }
  let _scr = null; const SCR = () => _scr || (_scr = OTM.makeCanvas(8, 8).getContext('2d'));
  function drawInsert(c, st, lt) {
    insertBg(c);
    const scr = screenAt(lt); const ph = insertPhone(lt); const th = ph.theta;
    const P = Object.assign({}, ph, { screen: scr.screen, state: scr.state, t: lt, shadow: { alpha: 0.45, dy: 18, dx: 8, blur: 22 } });
    const up = Math.max(0, Math.cos(th));
    const info = PHONE.where(P, c);
    if (up > 0.02) PHONE.glow(c, { info, x: ph.x + 10, y: ph.y + 40, r: 520, sy: 0.5, k: 0.6 * up, tone: 'night' });
    // his hand: in from the lower left, takes the near edge, turns it, lies flat on its back, then goes (all on twos)
    const tt = twos(lt), L = RIG.light('office', { amb: '#6E7570' });
    const s = 400, w = IP.h * 0.486, t0 = INS;
    const enter = seg(tt, t0 - 0.05, FLIP - 0.03, 'outCubic'), leave = seg(tt, FLIP + 1.4, FLIP + 1.9, 'inOutSine');
    let hx, hy, pose, hp = { flip: true };
    if (tt < FLIP) { hx = lerp(260, IP.cx - w * 0.62, enter); hy = lerp(1180, IP.cy + 150, enter); pose = 'take'; hp.close = lerp(0.1, 0.45, enter); }
    else if (tt < FLIP + 0.3) { const u = seg(tt, FLIP, FLIP + 0.27); hx = lerp(IP.cx - w * 0.62, IP.cx - w * 1.3, u); hy = IP.cy + 150 - 120 * Math.sin(u * Math.PI); pose = 'take'; hp.close = 0.6; }
    else { hx = lerp(IP.cx - w * 1.25, -260, leave); hy = lerp(IP.cy + 120, 1200, leave); pose = 'flat'; hp.close = 0.1; }
    const handP = Object.assign({ x: hx, y: hy, s, fore: [-0.7, 0.75], light: L, foreLen: 1.4 }, hp);
    const face = th > Math.PI / 2;
    const mask = m => { RIG.hand(c, 'him', pose, Object.assign({}, handP, { target: m, shadow: false })); m.save(); m.fillStyle = '#000'; m.fill(sleeveShape(RIG.hand(c, 'him', pose, Object.assign({}, handP, { target: SCR(), shadow: false }))).path(1.2, 51)); m.restore(); };
    PHONE.draw(c, Object.assign({}, P, face ? { screen: 'black', lit: false } : {}, { buzz: 0, mask, maskShadow: { alpha: 0.45 } }));
    const hand = RIG.hand(c, 'him', pose, handP);
    sleeve(c, hand);
    void info;
  }
  function sleeveShape(hand) {
    const el = hand.elbow || [hand.x - 600, hand.y + 600];
    const x = hand.x, y = hand.y, dx = el[0] - x, dy = el[1] - y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, nx = -uy, ny = ux, r = 92;
    const a = [x + ux * 40, y + uy * 40], b = [x + ux * 1400, y + uy * 1400];
    const sh = GG.blob([[a[0] + nx * r, a[1] + ny * r, 1], [b[0] + nx * r * 1.15, b[1] + ny * r * 1.15, 1], [b[0] - nx * r * 1.15, b[1] - ny * r * 1.15, 1], [a[0] - nx * r, a[1] - ny * r, 1]]);
    sh._a = a; sh._u = [ux, uy]; sh._n = [nx, ny]; sh._r = r; return sh;
  }
  // the shirt cuff over his wrist, cut paper (pale blue under the tubes)
  function sleeve(c, hand) {
    const sh = sleeveShape(hand), a = sh._a, [ux, uy] = sh._u, [nx, ny] = sh._n, r = sh._r;
    const g = c.g; g.save();
    const p = GG.piece(g, sh, { fill: '#7E8C9E', rough: 1.2, seed: 51, tex: 0.55, kind: 'cloth', lift: [-6, 10], liftAlpha: 0.45, liftBlur: 12 });
    GG.crescent(g, p, -ux * 10 + nx * 6, -uy * 10 + ny * 6, '#9AA6B6', 0.8);
    g.strokeStyle = '#5E6A7A'; g.lineWidth = 5; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(a[0] + nx * r * 0.95 + ux * 30, a[1] + ny * r * 0.95 + uy * 30); g.lineTo(a[0] - nx * r * 0.95 + ux * 30, a[1] - ny * r * 0.95 + uy * 30); g.stroke();
    g.restore();
  }

  FILM.seq({
    id: 'Q03', title: 'Face down', dur: DUR,
    setup() { if (SETS.office.prepare) SETS.office.prepare(); },
    lines: [],
    sound(S) {
      S.bed('office', 0, DUR, { level: -40 });                 // air, the tubes, distant keyboards
      S.bed('keyboard_near', 0, 6, { level: -44 });            // his own keys and mouse, sparse
      S.cue('vibrate_desk', BUZZ);                             // the phone rattles on the desk
      S.cue('vibrate_desk', BUZZ + 0.62, { level: -3 });
      S.cue('chair_creak', RISE);                              // the coworker stands
      S.cue('chair_creak', 16.2, { level: -6 });               // he sits back down behind the divider
      S.cue('phone_flip', FLIP);                               // glass turned onto the desk
      S.bed('keyboard_near', BACK + 0.5, DUR, { level: -44 });
    },
    shots: [
      { at: 0, name: 'wide: open plan, he works; the phone beside his keyboard', draw(c, st, lt) { drawWide(c, st, lt, {}); } },
      { at: 6, name: 'desk: it buzzes; he reads; bites back a smile', draw(c, st, lt) { drawDesk(c, st, lt, {}); } },
      { at: 13, name: 'wide: a coworker stands up behind the divider', draw(c, st, lt) { drawWide(c, st, lt, { coworker: true }); } },
      { at: OTS, name: 'over his shoulder: the coworker looks over; he feels it', draw(c, st, lt) { drawOTS(c, st, lt); } },
      { at: INS, name: 'insert: the hand, the black slab', draw(c, st, lt) { drawInsert(c, st, lt); } },
      { at: BACK, name: 'desk: back to the spreadsheet; the phone face down', draw(c, st, lt) { drawDesk(c, st, lt, { faceDown: true }); } },
    ],
  });
})();
