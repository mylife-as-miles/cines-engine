/* LONG DISTANCE — Q05 · The voice message (30 s) · S06, A019–A022 · bus (interior, close), phone
   The packed evening bus: dusk blue and sodium in the glass, strangers as close paper silhouettes. He stands with one hand on the
   rail, earbuds in. He presses play on a voice message; the waveform crawls across the screen as a clean gloss line. We hear only
   the bus: the message is never heard. His ears go red. He glances at the stranger pressed against his arm, then at the floor.
   It ends; he plays it again. His face in the dark glass among the others. */
(function () {
  'use strict';
  const { W, H } = OTM;
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const seg = FILM.seg, key = FILM.key, twos = FILM.twos;
  const BUS = () => SETS.bus;
  const tk = (t, ks) => key(twos(t), ks);
  const MSG_DUR = 17;                                   // her voice message, 0:17: played 7.0–24.0, then again from 25.0
  const PLAY1 = 7.0, END1 = PLAY1 + MSG_DUR, PLAY2 = 25.0;
  // the evening's thread, continuous with the day: the morning's three messages; at lunch his "Send me one." (A014) and her reply,
  // the hidden placeholder (abstract, blurred, two flat tones: nothing in it can be seen); then her voice message at 18:21
  const MSGS = () => PHONE.HISTORY.morning.concat([['stamp', '12:47'], ['him', PHONE.MSG.sendMeOne], ['her', { image: 'hidden' }], ['stamp', '18:21'], ['her', { voice: MSG_DUR }]]);
  function voiceState(lt) {
    const base = { dur: MSG_DUR, clock: 'bus', msgs: MSGS() };
    if (lt < PLAY1) return Object.assign(base, { progress: 0, playing: false });
    if (lt < END1) return Object.assign(base, { progress: (lt - PLAY1) / MSG_DUR, playing: true });
    if (lt < PLAY2) return Object.assign(base, { progress: 1, playing: false });
    return Object.assign(base, { progress: clamp((lt - PLAY2) / MSG_DUR, 0, 1), playing: true });
  }
  // his ears colour in the stretch between two passing streetlights (15.7–18.0), so the red is seen against his own skin
  const SODIUM = 0.45;                                  // the passing streetlight's strength (of the set's): a warm pass, not a recolour
  const earsAt = lt => lt < 15 ? 0 : tk(lt, [[15.8, 0], [17.6, 1, 'inOutSine']]);

  const PI2 = Math.PI * 2;

  // ---------------------------------------------------------------- 1 · interior (0–6) and 5 · the window (26–30)
  // his head: down at the phone; at 27.5 (in the last shot) he lifts it to the glass, and his face in it looks back at him
  function interiorHead(lt) {
    const A = BUS().views.interior.anchors.head;
    const ph = { yaw: A.yaw + PI2, pitch: A.pitch * 0.82 }, win = { yaw: A.looks.window.yaw, pitch: A.looks.window.pitch + 0.05 };
    if (lt < 26) return ph;
    return tk(lt, [[27.4, ph], [28.0, win, 'inOutSine']]);
  }
  function drawInterior(c, st, lt, last) {
    const v = BUS().views.interior, A = v.anchors;
    const tt = twos(lt);
    // both interiors sit at zooms that give his figure one render scale (s 187 × 1.04–1.19 rounds to the same step), so the window
    // shot reuses the opening's sculptures: the opening a touch closer than the set's framing, the window closer still
    if (last) { const z = lerp(1.165, 1.19, seg(lt, 26, 30, 'inOutSine')); c.camera({ x: 740, y: 430, zoom: z }); }
    else c.camera({ x: 900, y: 520, zoom: 1.06 });
    const Lt = v.lightAt(tt);
    const L = RIG.light('bus', { keys: Lt.keys, amb: Lt.amb });
    const h = interiorHead(lt);
    const ears = last ? 1 : earsAt(lt);
    // the reflection: his face in the dark glass, facing back at him (the mirror of where he looks)
    const looking = seg(tt, 27.4, 28.0, 'inOutSine');
    const R0 = A.reflection, rWin = v.cam.headAngles([0.25, -0.05, -1]);
    const reflect = (g, R) => RIG.head(c, 'him', { target: g, x: R.x, y: R.y, s: R.s, yaw: lerp(R0.yaw, rWin.yaw, looking), pitch: lerp(R0.pitch * 0.82, rWin.pitch, looking),
      lids: lerp(0.45, 0.6, looking), ears, shadow: false, light: RIG.light('bus', { keys: [{ dir: [0, -0.6, 0.8], col: '#A8B4D8', k: 0.5, poster: [0.3], levels: [1] }], amb: '#3A4260', phone: looking < 0.5 ? [R.x - 5, R.y + R.s * 1.4] : null, phoneK: 0.9 }) });
    v.back(c, lt, { reflect });
    // the brakes at 3.0: everyone sways; he gives a little toward the front and comes back (on twos)
    const lurch = tk(lt, [[2.95, 0], [3.35, 1, 'outCubic'], [4.3, 0, 'inOutSine']]);
    const rail = [(A.hands.rail.x - A.head.x) / A.head.s, (A.hands.rail.y - A.head.y) / A.head.s];
    // him from behind: the rig's back view (the phone hidden in front of him, an earbud), mirrored so the raised arm is his right
    // (screen right from behind, as the rail is, and the same arm the close sees raised); a mirrored figure turns its head the
    // other way, so the yaw goes in negated
    RIG.draw(c, 'him', 'bus', { view: 'back', flip: true, x: A.head.x + lurch * 9, y: A.head.y, s: A.head.s, light: L, t: lt, sway: 0.04 * lurch,
      rail: [A.hands.rail.x, A.hands.rail.y], face: { yaw: -h.yaw, pitch: h.pitch, lids: 0.5, ears } });
    void rail;
    v.front(c, lt, { sweep: false });
    sweepBand(c, v, lt);
  }

  // ---------------------------------------------------------------- 2, 4 · the phone (6–15, 23–26)
  // looking down at his chest: the phone in his left hand, his thumb on the play button; behind it his shirt, the stranger's coat
  // pressed in at the left, and the passing streetlights crossing it all in one cut band of sodium every 3.4 s
  const BGM = 320;
  const PH = { x: 1000, y: 556, h: 950, roll: 0.05, pitch: 0.08, yaw: 0.05 };     // low in the frame: his hand is below it
  function phoneBg(c) {
    const cv = c.cache('Q05|phone|bg', g => {
      g.translate(BGM, BGM);                       // a margin round the frame, so the push never shows an edge
      g.fillStyle = '#1E2436'; g.fillRect(-BGM, -BGM, W + 2 * BGM, H + 2 * BGM);
      const all = OTM.S().poly([[-BGM - 20, -BGM - 20], [W + BGM + 20, -BGM - 20], [W + BGM + 20, H + BGM + 20], [-BGM - 20, H + BGM + 20]]);
      // his shirt front: dusk-blue paper, two cut bands, the placket and its buttons down a slant, a crease
      const shirt = GG.piece(g, all, { fill: '#3B4560', rough: 0.5, seed: 21, tex: 0.6, kind: 'cloth' });
      GG.bands(g, shirt, [W * 0.75, H + 60], [W * 0.35, -60], ['#323B54', '#3B4560', '#46516E'], { stops: [0, 0.45, 0.82], rough: 3.2, seed: 22 });
      g.save(); g.strokeStyle = 'rgba(20,24,38,0.8)'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(1530, -40); g.quadraticCurveTo(1490, 520, 1420, 1130); g.stroke();
      g.strokeStyle = 'rgba(96,108,140,0.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(1541, -40); g.quadraticCurveTo(1501, 520, 1431, 1130); g.stroke(); g.restore();
      [140, 520, 900].forEach((y, i) => { const x = 1530 - 0.06 * y - 18; g.fillStyle = '#8C96AE'; g.beginPath(); g.ellipse(x, y, 13, 12, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(30,34,50,0.6)'; g.beginPath(); g.arc(x - 3, y - 2, 2.2, 0, 7); g.arc(x + 3, y + 2, 2.2, 0, 7); g.fill(); });
      [[[200, 150], [520, 330], [700, 560]], [[1200, 700], [1300, 900], [1260, 1100]]].forEach(f => { g.save(); g.strokeStyle = 'rgba(22,26,40,0.55)'; g.lineWidth = 9; g.lineCap = 'round'; g.stroke(GG.spline(f, false)); g.restore(); });
      // the stranger's coat sleeve, pressed against his arm at the left edge: near-black paper with a sodium rim
      const coat = GG.blob([[-BGM - 40, -BGM - 40], [260, -BGM - 40], [360, 260], [330, 700], [250, H + BGM + 40], [-BGM - 40, H + BGM + 40]]);
      const cp = GG.piece(g, coat, { fill: '#141A2A', rough: 1.4, seed: 23, tex: 0.55, kind: 'wool', lift: [14, 6], liftAlpha: 0.6, liftBlur: 20 });
      GG.crescent(g, cp, 6, 0, '#9A6A44', 0.75);
      g.save(); g.strokeStyle = 'rgba(8,10,18,0.6)'; g.lineWidth = 6; g.beginPath(); g.moveTo(120, 380); g.quadraticCurveTo(230, 520, 200, 760); g.stroke(); g.restore();
    }, W + 2 * BGM, H + 2 * BGM);
    c.g.drawImage(cv, -BGM, -BGM);
  }
  // the passing streetlight: one cut band of sodium crossing the frame every 3.4 s (the set's period), never more than one change a second
  function sodium(c, lt) {
    const T = 3.4, ph = ((lt + 1.1) / T) % 1, x = W + 500 - ph * (W + 1000), g = c.g, sk = 300;
    const band = (half, a, seed) => { g.globalAlpha = a; g.fillStyle = '#E09048'; g.fill(OTM.S().poly([[x - half + sk * 1.3, -340], [x + half + sk * 1.3, -340], [x + half - sk * 1.3, H + 340], [x - half - sk * 1.3, H + 340]]).path(3, seed)); };
    g.save(); g.globalCompositeOperation = 'soft-light'; band(330, 0.4 * SODIUM, 150); band(150, 0.45 * SODIUM, 151); g.restore();
    return clamp(1 - Math.abs(x - PH.x) / 600, 0, 1);
  }
  let _scr = null; const SCR = () => _scr || (_scr = OTM.makeCanvas(8, 8).getContext('2d'));
  // A true-size hand on a phone seen close: the hand's grip phone is the same size and turn as the phone on screen (hand length
  // s = phone height / 0.79), and the hand is placed so its thumb tip lands on the target; of the reaches tried, the one whose hand
  // stays nearest `home` (a world point for the grip's phone centre) wins, so the hand holds still while the thumb travels.
  // Framed with the phone low, the palm and fingers fall below the frame and the thumb comes up into it.
  function thumbOnGlass(c, P, L, tgt, tap, o) {
    const s = P.h / 0.79, rot = o.flip ? -(P.roll || 0) : (P.roll || 0), k = 4; let best = null;
    for (const reach of o.reaches || [0, 0.25, 0.5, 0.75, 1]) {
      const pr = RIG.hand(c, 'him', 'thumb', { s: s / k, x: 0, y: 0, rot, flip: !!o.flip, reach, tap: 0, light: L, target: SCR() });
      const x = tgt[0] - pr.thumb[0] * k, y = tgt[1] - pr.thumb[1] * k; const ph = [x + pr.phone.x * k, y + pr.phone.y * k];
      const d = Math.hypot(ph[0] - o.home[0], ph[1] - o.home[1]);
      if (!best || d < best.d) best = { d, p: { s, rot, flip: !!o.flip, reach, tap, light: L, x, y } };
    }
    return best.p;
  }


  function shotPhone(c, st, lt) {
    // a slow push toward the waveform while it plays (0.3 % a second, eased in and out); the second insert holds
    // the thread as it stands (the morning; his "Send me one." at lunch and her reply; the voice message), and a slow push toward
    // the waveform while it plays (0.3 % a second, eased); the second insert holds
    const u = lt < 15 ? seg(lt, 6, 15, 'inOutSine') : 1;
    const z = lerp(1, 1.02, u);                           // (kept under 1.024 so the hand's sculpture keeps one render scale)
    c.camera({ x: W / 2 - 35 * u, y: H / 2 + 28 * u, zoom: z });
    phoneBg(c);
    const P = Object.assign({}, PH, { screen: 'voice', state: voiceState(lt), t: lt, env: '#8090C0' });
    const info = PHONE.where(P, c);
    PHONE.glow(c, { info, x: PH.x - 40, y: PH.y + 200, r: 1000, k: 0.6, tone: 'night' });
    const band = sodium(c, lt);
    // the thumb: hovering, then onto the play button (a press at 7.0 and again at 25.0), resting by it while it plays
    const press = t0 => tk(lt, [[t0 - 0.55, 0.0], [t0 - 0.2, 0.7], [t0, 0.0, 'inQuad'], [t0 + 0.35, 0.45]]);
    const tap = lt < 16 ? press(PLAY1) : press(PLAY2);
    const play = info.targets.play || info.pt(37, 640);
    // the thumb: from below-left, its tip on the play button for the press; resting just under the bubble while it plays
    const away = lt < PLAY1 - 0.6 || (lt > END1 + 0.3 && lt < PLAY2 - 0.6);
    const near = (lt > PLAY1 + 0.5 && lt < END1) || lt > PLAY2 + 0.5;
    const tgt = away ? [play[0] - 30, play[1] + 120] : near ? [play[0] - 8, play[1] + 55] : play;
    const L = RIG.light('bus', { keys: [{ dir: [0.3, -0.7, 0.6], col: '#7E90BE', k: 0.42, poster: [0.3], levels: [1] }],
      amb: '#2E3550', phone: [PH.x, PH.y + 150], phoneK: 1.1, phoneZ: 0.6 });
    void band;
    // his left hand holds it from below (the palm and fingers under the frame), the thumb up onto the play button
    const hp = thumbOnGlass(c, P, L, tgt, tap > 0.3 ? 0.6 : 0, { flip: true, reaches: [0, 0.25, 0.5], home: [PH.x + 0.1 * PH.h * 0.486, PH.y + 0.66 * PH.h] });
    hp.only = 'thumb';                                                  // the palm and fingers are below the frame: only the thumb is in it
    // the hand is below the phone; where it crosses the glass (the thumb, the fingertips round the far edge) it is in front of it
    const mask = m => RIG.hand(c, 'him', 'thumb', Object.assign({}, hp, { target: m, shadow: false }));
    PHONE.draw(c, Object.assign({ mask, maskShadow: { alpha: 0.4 }, over: (gl, inf) => lunchPhoto(c, gl, inf) }, P));
    RIG.hand(c, 'him', 'thumb', hp);
  }
  // Her reply at lunch, in the thread above the voice message: a small blurred thumbnail, by the same rule as Q04's grid: soft
  // skin-toned shapes past any form, nothing legible. It replaces the thread's flat placeholder (its bubble, 196 × 261 points under
  // "Send me one.", is blacked out) with a smaller thumbnail at its top, on her side.
  const PHOTO = { x: 12, y: 343, w: 196, h: 261, tw: 128, th: 170 };
  function photoArt(c) {
    return c.cache('Q05|lunch|photo', g => {
      const w = 256, h = 340, r = OTM.rng('q05-lunch-photo');
      g.fillStyle = '#4A3B36'; g.fillRect(0, 0, w, h);
      const tones = ['#C99A80', '#B07A62', '#DDB59C', '#8E6352', '#E8CBB6', '#6A4A40'];
      g.filter = 'blur(26px)';
      for (let i = 0; i < 9; i++) { g.fillStyle = tones[i % tones.length]; g.globalAlpha = 0.55 + 0.4 * r(); const x = r() * w, y = r() * h, a = 60 + r() * 110, b = 50 + r() * 120;
        g.save(); g.translate(x, y); g.rotate(r() * 3); g.fillRect(-a / 2, -b / 2, a, b); g.restore(); }
      g.globalAlpha = 1; g.filter = 'none';
      const t = OTM.makeCanvas(w, h), tg = t.getContext('2d'); tg.filter = 'blur(10px)'; tg.drawImage(g.canvas, 0, 0); g.clearRect(0, 0, w, h);
      g.save(); g.beginPath(); g.roundRect(0, 0, w, h, 34); g.clip(); g.drawImage(t, 0, 0); g.restore();
    }, 256, 340);
  }
  function lunchPhoto(c, gl, info) {
    const P0 = PHOTO, q = (x, y) => info.pt(x, y);
    gl.save(); gl.fillStyle = '#000000'; gl.beginPath(); [q(P0.x - 2, P0.y - 2), q(P0.x + P0.w + 2, P0.y - 2), q(P0.x + P0.w + 2, P0.y + P0.h + 2), q(P0.x - 2, P0.y + P0.h + 2)].forEach((p, i) => i ? gl.lineTo(p[0], p[1]) : gl.moveTo(p[0], p[1])); gl.closePath(); gl.fill();
    const y0 = P0.y, x0 = P0.x; GG.warp(gl, photoArt(c), [q(x0, y0), q(x0 + P0.tw, y0), q(x0 + P0.tw, y0 + P0.th), q(x0, y0 + P0.th)], 4, 4);
    gl.restore();
  }

  // ---------------------------------------------------------------- 3 · close (15–23): his ears; the stranger; the floor
  function closeFace(lt) {
    const ph = { yaw: 0.3, pitch: 0.5, lids: 0.45, gaze: [0.1, 0.6] };
    const str = { yaw: 0.78, pitch: 0.26, lids: 0.66, gaze: [0.6, 0.12] };    // a glance at the stranger: head and eyes, and held
    const flr = { yaw: 0.08, pitch: 0.55, lids: 0.26, gaze: [0, 0.7] };
    return tk(lt, [[15, ph], [19.15, ph], [19.4, str, 'outCubic'], [20.4, str], [20.8, flr, 'inOutSine']]);
  }
  // Him in the close: the rig's standing man (the shirt), built here so the raised arm goes up and out to the rail at the left,
  // clear of his ear, its sleeve tucked under the shirt's shoulder (drawn behind the torso), and the other arm goes down out of
  // the frame to the phone with no hand in shot. Small earbuds sit in his ears so the red of the ears shows round them.
  function closeHim(c, A, L, lt, face) {
    const buds = { type: 'live', draw(cc, toW, s, out) { const hd = out.heads.head; if (!hd) return; const g = cc.g;
      [hd.earL, hd.earR].forEach((e, i) => { const nx = hd.M ? hd.M[2][0] : 0; const vis = i === 0 ? nx < 0.25 : nx > -0.25; if (!vis || !e) return;
        g.fillStyle = '#BDB7AC'; g.beginPath(); g.ellipse(e[0] + (i ? -1 : 1) * s * 0.012, e[1] + s * 0.035, s * 0.02, s * 0.018, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(16,16,24,0.45)'; g.beginPath(); g.ellipse(e[0] + (i ? -1 : 1) * s * 0.012, e[1] + s * 0.05, s * 0.017, s * 0.007, 0, 0, 7); g.fill(); }); } };
    const f = Object.assign({}, face);
    if (lt != null && !(f.lids < 0.2)) { const b = RIG.blink(lt, 3); if (b < 1) f.lids = (f.lids == null ? 0.6 : f.lids) * b; }
    const P = RIG.person({ who: 'him', costume: 'shirt', tau: 0.2, head: f, legs: false, crop: 2.4,
      arms: { L: { to: [-1.3, -1.9], bend: 1, hand: false, handless: true, behind: true }, R: { E: [0.74, 2.3], W: [0.32, 2.8], hand: false, handless: true, front: true } },
      extra: { afterHead: [buds] } });
    return RIG.drawFigure(c, { who: 'him', x: A.head.x, y: A.head.y, s: A.head.s, light: L, breath: RIG.breath(lt, 2.5), ops: P.ops });
  }
  function shotClose(c, st, lt) {
    const v = BUS().views.close, A = v.anchors;
    // a slow push toward his face while his ears colour (15–18), then it holds for the glance and the floor
    const z = lerp(1, 1.08, seg(lt, 15, 18, 'inOutSine')), u = (z - 1) / 0.08;
    c.camera({ x: W / 2 + (840 - W / 2) * u, y: H / 2 + (480 - H / 2) * u, zoom: z });
    v.back(c, lt, {});
    // his face keeps the shot's own light (the passing sodium band still crosses him as the overlay), so the red of his ears reads
    // against his skin rather than against the orange of a streetlight
    const L = RIG.light('bus', { keys: v.light.keys, amb: v.light.amb, phone: [A.phone.x - 120, A.phone.y - 120], phoneK: 1.0 });
    closeHim(c, A, L, lt, Object.assign({ ears: earsAt(lt), mouth: 0 }, closeFace(lt)));
    // the phone's light from below the frame, on his chin and collar (smooth)
    PHONE.glow(c, { x: A.phone.x - 160, y: 1130, r: 700, k: 0.45, tone: 'night', em: 0.1 });
    v.front(c, lt, { sweep: false });
    strangerCollar(c);
    sweepBand(c, v, lt);
  }
  // the pressed stranger (the set's): a turned-up coat collar over the back of the neck, so no neck shows through it
  function strangerCollar(c) {
    const cv = c.cache('Q05|close|collar', g => {
      const sh = GG.blob([[1588, 492, 1], [1596, 418], [1624, 384], [1700, 372], [1782, 384], [1812, 418], [1822, 492, 1], [1704, 506]]);
      const p = GG.piece(g, sh, { fill: '#2D2927', rough: 1.1, seed: 171, tex: 0.5, kind: 'wool', lift: [0, 6], liftAlpha: 0.5, liftBlur: 10 });
      GG.crescent(g, p, 0, -4, '#3E3936', 0.8);
      g.save(); g.strokeStyle = 'rgba(124,134,160,0.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(1598, 420); g.quadraticCurveTo(1640, 380, 1700, 374); g.quadraticCurveTo(1770, 378, 1808, 414); g.stroke(); g.restore();
    });
    c.g.drawImage(cv, 0, 0);
  }
  // the set's passing sodium band (the same band at the same place, on the set's clock: view.sweep), drawn here instead of by the
  // set and at a gentler strength (SODIUM), so the streetlight warms him as it passes but his shirt stays the same pale blue
  function sweepBand(c, v, t) {
    const sw = v.sweep(t), g = c.g, w = 330, sk = 260 * (v.sweep(0).x > W ? 1 : -1);
    const band = (x, half, a, seed) => { g.globalAlpha = a; g.fillStyle = '#E39A52'; g.fill(OTM.S().poly([[x - half + sk, -80], [x + half + sk, -80], [x + half - sk * 0.4, H + 80], [x - half - sk * 0.4, H + 80]]).path(3, seed)); };
    g.save(); g.globalCompositeOperation = 'soft-light'; band(sw.x, w * 0.9, 0.42 * SODIUM, 150); band(sw.x, w * 0.45, 0.5 * SODIUM, 151); g.restore();
  }

  FILM.seq({
    id: 'Q05', title: 'The voice message', dur: 30,
    setup() { if (SETS.bus.prepare) SETS.bus.prepare(); },
    lines: [],
    sound(S) {
      S.bed('bus', 0, 30, { level: -36 });                            // engine, road: all we hear
      S.cue('bus_brakes', 3.0);
      S.cue('tap', PLAY1, { level: -18 });                            // his thumb on the glass (the message itself is never heard)
      S.cue('bell', 12.0);                                            // someone wants the next stop
      S.cue('tap', PLAY2, { level: -18 });
      S.cue('bus_doors', 27.0);
    },
    shots: [
      { at: 0, name: 'interior: packed; he holds the rail, earbuds in', draw(c, st, lt) { drawInterior(c, st, lt, false); } },
      { at: 6, name: 'phone: a voice message; he presses play; the waveform crawls', draw(c, st, lt) { shotPhone(c, st, lt); } },
      { at: 15, name: 'close: his ears go red; the stranger; the floor', draw(c, st, lt) { shotClose(c, st, lt); } },
      { at: 23, name: 'phone: it ends; he plays it again', draw(c, st, lt) { shotPhone(c, st, lt); } },
      { at: 26, name: 'interior, the window: his face in the glass among the others', draw(c, st, lt) { drawInterior(c, st, lt, true); } },
    ],
  });
})();
