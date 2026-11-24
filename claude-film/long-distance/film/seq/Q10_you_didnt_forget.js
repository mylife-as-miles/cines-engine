/* LONG DISTANCE · Q10 YOU DIDN'T FORGET (86 s) · S12 (A052–A061), L017–L023
   The longest scene, played mostly in the two-shot from Q09 (B3) with close-ups that cut on looks, not on lines. Three of her in
   one frame when she turns the phone back: the strip on the fridge (grain), the picture on the phone (gloss), herself (grain,
   older). The room goes quiet when she lets the screen go dark. The trade happens on the centre line, her fingers never touching
   his. She leaves; her half of the room is empty again.
   Shots: 0 between · 11 him · 15 her · 18 over her shoulder (the three of her) · 21 her (the hand to her nape; L020) · 26.5 him
   (L021, L022) · 40 her, very still · 44 her thumb on the glass · 48 him, not breathing · 51 the screen goes dark · 54 the trade
   · 59 between (L023; the breath, swallowed) · 70 the door · 75 the room, his alone. */
(function () {
  'use strict';
  const { W, H } = OTM; const seg = FILM.seg, key = FILM.key, twos = FILM.twos, E = FILM.ease, clamp = FILM.clamp, lerp = FILM.lerp;
  const LV = () => SETS.living.views;
  const CALL = () => ({ banner: { text: PHONE.MSG.callMeTonight, in: 1 } });
  const push = (c, px, py, z) => c.camera({ x: px + (W / 2 - px) / z, y: py + (H / 2 - py) / z, zoom: z });
  function setLight(L, o) {
    o = o || {};
    const from = o.from || [L.dir[0] > 0 ? 0.82 : -0.82, -0.55];
    return RIG.light('day', Object.assign({ keys: [{ dir: L.dir, col: L.color, k: L.k * (o.keyK || 1), poster: L.poster, levels: L.levels }], amb: L.amb, paper: { from } }, o.rig || {}));
  }
  const DAY = { tod: 'day' };

  // ------------------------------------------------------------------ sleeves for the hand inserts (cut once, laid along the forearm)
  const SLEEVE = { sweater: ['#4A4541', '#7A746C', '#2C2826', '#524D48', '#8E877E', 'wool'], coat: ['#2C4A44', '#4A7066', '#1A2E2A', '#2F4E47', '#4A7066', 'wool'] };
  function sleeve(c, kind) {
    const S = SLEEVE[kind];
    return c.cache('Q10|sleeve|' + kind, (g) => {
      const sh = GG.blob([[40, 18], [120, 0], [214, 14], [236, 140], [250, 700], [20, 700], [14, 140]]);
      const p = GG.piece(g, sh, { fill: S[0], rough: 1.4, seed: kind === 'coat' ? 1031 : 1021, tex: 0.75, kind: S[5], lift: [6, 10], liftAlpha: 0.5, liftBlur: 10 });
      GG.crescent(g, p, -12, -6, S[1], 0.9); GG.crescent(g, p, 14, 4, S[2], 0.8);
      const cf = GG.blob([[34, 14], [124, -2], [218, 12], [226, kind === 'coat' ? 96 : 70], [126, kind === 'coat' ? 90 : 62], [26, kind === 'coat' ? 100 : 74]]);
      const cp = GG.piece(g, cf, { fill: S[3], rough: 1.1, seed: 1032, tex: 0.75, kind: 'wool', lift: [3, 5], liftAlpha: 0.5 }); GG.crescent(g, cp, -6, -6, S[4], 0.9);
      if (kind === 'sweater') { g.save(); g.clip(cp); g.strokeStyle = 'rgba(30,26,24,0.35)'; g.lineWidth = 3; for (let k = 0; k < 14; k++) { g.beginPath(); g.moveTo(40 + k * 13, 0); g.lineTo(38 + k * 13, 80); g.stroke(); } g.restore(); }
    }, 260, 720);
  }
  function drawSleeve(c, kind, wrist, to, scale, flip) {
    const cv = sleeve(c, kind), g = c.g; const a = Math.atan2(to[1] - wrist[1], to[0] - wrist[0]) - Math.PI / 2;
    g.save(); g.translate(wrist[0], wrist[1]); g.rotate(a); if (flip) g.scale(-1, 1); g.scale(scale, scale); g.drawImage(cv, -125, -30); g.restore();
  }

  // ------------------------------------------------------------------ the two-shot, B3 (0–18, 59–70)
  // his back view without the bag (after the trade he holds the phone in front of him, where we cannot see it)
  function himBackEmpty(p) {
    return RIG.person({ who: 'him', costume: 'sweater', tau: 2.6, back: true, lean: 0.06, shrug: 0.25, head: Object.assign({ yaw: 1.45, pitch: 0.25, roll: 0.78, lids: 0.3, gaze: [0, 0.7] }, p.face || {}),
      arms: { L: { to: [0.3, 2.5], bend: 1, hand: false, front: true }, R: { to: [0.75, 1.75], bend: -1, hand: false, front: true } }, legs: p.legs || { stance: 0.1 }, crop: p.crop });
  }
  function two(c, lt, o) {
    const V = LV().between, A = V.anchors, tt = twos(lt);
    V.back(c, lt, DAY);
    const Ls = V.shots.two.lights.day;
    const her0 = A.herBetween, s = 0.23 * her0[2];
    const h0 = A.himBetween;
    let her;
    if (o.bag) {
      // after the trade: the bag in her hand at her side; the phone is his
      const L = setLight(Ls);
      her = RIG.draw(c, 'her', 'guest', { x: her0[0] + 20, y: her0[1], s, light: L, t: lt, flip: true, tau: 0.42, face: o.face });
      RIG.bag(c, her0[0] + 20 - 0.3 * s, her0[1] + 2.36 * s, s * 0.95, { light: L, rot: -0.04 });
      RIG.drawFigure(c, { who: 'him', x: h0[0] + 10, y: h0[1] + 10, s: 0.23 * h0[2], light: setLight(Ls), breath: o.himBreath == null ? RIG.breath(lt, 3) : o.himBreath, ops: himBackEmpty({ crop: 4.6, face: o.himFace }).ops });
      return;
    }
    const hold = o.hold || 0;
    const L = setLight(Ls, { rig: { phone: [A.phoneHeld[0] + 120, A.phoneHeld[1] - 20], phoneCol: '#C8EEF2', phoneK: 0.45 * (1 - hold) } });
    her = RIG.draw(c, 'her', 'phone', { x: her0[0] + 20, y: her0[1], s, light: L, t: lt, flip: true, hold, tau: 0.42, nape: o.nape || 0, face: o.face });
    RIG.draw(c, 'him', 'bag', { x: h0[0] + 10, y: h0[1] + 10, s: 0.23 * h0[2], light: setLight(Ls), t: lt, view: 'back', zip: o.zip == null ? tt * 0.6 : o.zip, crop: 4.6, face: o.himFace });
    if (her.phone) {
      const ph = her.phone; const P = { x: ph.x, y: ph.y, h: ph.h * 1.02, roll: ph.angle, yaw: lerp(-0.42, -2.6, hold * hold), screen: 'lock', state: CALL(), env: '#B8BEC0', sheen: 0.07 };
      PHONE.glow(c, { info: PHONE.where(P, c), k: 0.42, r: ph.h * 2.6 });
      PHONE.draw(c, P); her.over(c);
    }
  }
  function twoOpen(c, st, lt) {
    const tt = twos(lt);
    // L017: she holds the phone up to him the whole line; near its end ("and we aren't together anymore") she lowers it a little
    const m = RIG.mouthFor('L017', lt - 0.5);
    two(c, lt, { hold: key(tt, [[7.6, 0], [9.6, 0.22]]), face: { yaw: 0.52, pitch: 0.08, lids: key(tt, [[3, 0.7], [5, 0.62], [8, 0.66]]), gaze: [0.42, 0.08], mouth: m, brows: key(tt, [[6.5, 0], [7.5, 0.25], [9.5, 0]]) } });
  }
  function twoAfter(c, st, lt) {
    const tt = twos(lt);
    const m = RIG.mouthFor('L023', lt - 59.5);
    // the breath drawn to say something more (66.6), then swallowed (68.5)
    const drawn = tt >= 66.5 && tt < 68.5, sw = tt >= 68.5;
    two(c, lt, { bag: true,
      face: { yaw: 0.5, pitch: drawn ? -0.04 : sw ? 0.1 : 0.06, lids: key(tt, [[59, 0.66], [62.5, 0.58], [64.5, 0.66], [68.6, 0.5]]), gaze: [key(tt, [[59, 0.4], [62.6, 0.15], [64.4, 0.4], [68.6, 0.25]]), key(tt, [[59, 0.08], [62.6, 0.35], [64.4, 0.08], [68.6, 0.4]])], mouth: drawn ? 1 : m, brows: drawn ? 0.25 : 0 },
      himBreath: RIG.breath(lt, 2), himFace: { pitch: 0.3 } });
  }

  // ------------------------------------------------------------------ the close-ups (between/her, between/him)
  function herClose(c, lt, o) {
    const V = LV().between, sh = V.shots.her, A = sh.anchors;
    V.back(c, lt, { tod: 'day', shot: 'her' });
    const Ls = sh.lights.day, s = 0.23 * A.herBetween[2];
    const hold = o.hold == null ? 1 : o.hold;
    const fig0 = { x: A.herBetween[0] + 30, y: A.herBetween[1] - (o.still ? 150 : lerp(70, 150, E.inOutSine(clamp(hold, 0, 1)))), s };
    const L = setLight(Ls, { rig: hold > 0.5 ? { phone: [fig0.x - 0.2 * s, fig0.y + 1.9 * s], phoneCol: '#C8EEF2', phoneK: 0.5 * (o.screen == null ? 1 : o.screen) } : {} });
    const her = RIG.draw(c, 'her', o.still ? 'still' : 'phone', Object.assign({}, fig0, { light: L, t: o.still ? null : lt, flip: true, hold, nape: o.nape || 0, crop: 3.2, face: o.face, blink: o.blink }));
    if (her && her.phone && o.phone !== false) {
      const ph = her.phone; const P = { x: ph.x, y: ph.y, h: ph.h, roll: ph.angle, yaw: hold > 0.5 ? -2.7 : -0.42, pitch: hold > 0.5 ? 0.5 : 0, screen: o.screenName || 'lock', state: o.state || CALL(), env: '#B8BEC0' };
      PHONE.glow(c, { info: PHONE.where(P, c), k: 0.45 });
      PHONE.draw(c, P); her.over(c);
    }
    return her;
  }
  function himClose(c, lt, o) {
    const V = LV().between, sh = V.shots.him, A = sh.anchors;
    V.back(c, lt, { tod: 'day', shot: 'him' });
    // across the line, his eyeline is cheated to screen right so the two close-ups face each other
    const L = setLight(sh.lights.day, { from: [-0.82, -0.55] });
    const s = 0.23 * A.himBetween[2];
    return RIG.draw(c, 'him', o.pose || 'bag', { x: A.himBetween[0] - 40, y: A.himBetween[1] - 20, s, light: L, t: lt, tau: 0.3, zip: o.zip || 0, crop: 3.3, breath: o.breath, blink: o.blink, face: Object.assign({ neck: 0.5 }, o.face) });
  }

  // 11–15: on him. He lifts his eyes to her for "I know", and they go back down on "I forgot to change it"
  function onHim(c, st, lt) {
    const tt = twos(lt), m = Math.min(2, RIG.mouthFor('L018', lt - 11.5));
    const up = key(tt, [[11.1, 0], [11.5, 1, 'outCubic'], [12.6, 1], [13.1, 0]]);
    himClose(c, lt, { zip: tt * 0.6, face: { yaw: lerp(0.1, 0.28, up), pitch: lerp(0.42, 0.12, up), lids: lerp(0.3, 0.62, up), gaze: [lerp(0, 0.3, up), lerp(0.6, 0.05, up)], mouth: m, smile: 0, brows: lerp(0.1, 0.25, up) } });
  }
  // 15–18: on her. "You didn't forget." Then she turns the phone back to look at it (17.3)
  function onHer(c, st, lt) {
    const tt = twos(lt), m = RIG.mouthFor('L019', lt - 15.4);
    const turn = E.inOutSine(seg(tt, 17.3, 18.0));
    herClose(c, lt, { hold: turn, face: { yaw: lerp(-0.42, -0.2, turn) * -1, pitch: lerp(0.06, 0.34, turn), lids: lerp(0.7, 0.52, turn), gaze: [lerp(0.4, 0.1, turn), lerp(0.06, 0.5, turn)], mouth: m } });
  }
  // 21–26.5: her, the phone low, studying it; her free hand goes to the back of her neck (21–24). "Is it Photoshop?" (24.0)
  function nape(c, st, lt) {
    const tt = twos(lt), m = RIG.mouthFor('L020', lt - 24.0);
    const np = E.inOutSine(seg(tt, 21.1, 23.8)), up = E.inOutSine(seg(tt, 23.6, 24.2));
    herClose(c, lt, { hold: 1, nape: np, face: { yaw: lerp(0.2, 0.5, up), pitch: lerp(0.34, 0.08, up), lids: lerp(0.5, 0.66, up), gaze: [lerp(0.1, 0.4, up), lerp(0.5, 0.06, up)], mouth: m } });
  }
  // 26.5–40: him. He looks at the floor. Her question (29.5) lands on him; "I just missed you, is all." (36.8)
  function floor(c, st, lt) {
    const tt = twos(lt), m = Math.min(2, RIG.mouthFor('L022', lt - 36.8));
    const lift = key(tt, [[36.5, 0], [36.9, 0.45], [38.4, 0.45], [38.9, 0]]);
    himClose(c, lt, { zip: 0.4, face: { yaw: lerp(0.06, 0.18, lift), pitch: lerp(0.48, 0.3, lift), lids: lerp(0.24, 0.42, lift), gaze: [lerp(-0.05, 0.2, lift), lerp(0.6, 0.3, lift)], mouth: m, brows: lerp(0.25, 0.25, lift) } });
  }
  // 40–44: she goes very still
  function still(c, st, lt) {
    herClose(c, lt, { still: true, hold: 1, face: { yaw: 0.22, lids: 0.5, gaze: [0.05, 0.55], pitch: 0.3 }, blink: false });
  }
  // 48–51: him, watching her thumb, not breathing
  function watching(c, st, lt) {
    himClose(c, lt, { zip: 0.4, breath: 0, blink: false, face: { yaw: 0.26, pitch: 0.3, lids: 0.6, gaze: [0.35, 0.42], brows: 0.25 } });
  }

  // ------------------------------------------------------------------ 18–21: over her shoulder. The three of her in one frame
  // A reverse past her right shoulder toward the kitchen: him, soft, with the bag; the fridge behind him and the strip on it (grain);
  // in her hand, sharp, the phone and the picture (gloss); and herself, the back of her copper bob and the line of her cheek (grain).
  function ossPlate(c) {
    return c.cache('Q10|oss', (g, cv) => {
      const S = OTM.S;
      g.fillStyle = '#74736C'; g.fillRect(0, 0, W, H); GG.texture(g, (() => { const p = new Path2D(); p.rect(0, 0, W, H); return p; })(), 0.55, 1041, 'paper');
      // the window's grey light across the far wall (it is behind us, to the right)
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(200,204,196,0.12)'; g.fill(S().poly([[-100, 80], [700, 30], [900, 1100], [-100, 1100]]).path(3, 1042)); g.restore();
      // the fridge, cream card, and the strip under its red magnet
      const fr = S().rect(230, 140, 470, 1000); const fp = GG.piece(g, fr, { fill: '#C9C4B8', rough: 1.1, seed: 1043, tex: 0.6, kind: 'card', lift: [10, 8], liftAlpha: 0.45, liftBlur: 14 });
      g.save(); g.clip(fp); g.fillStyle = '#B3AEA2'; g.fillRect(620, 140, 80, 1000); g.fillStyle = 'rgba(60,58,54,0.4)'; g.fillRect(230, 640, 470, 6); g.restore();
      g.fillStyle = '#9C988E'; g.fillRect(640, 330, 12, 250);
      // the counter's end, between us and him
      const ct = S().rect(-40, 760, 980, 360); const cp = GG.piece(g, ct, { fill: '#6E675D', rough: 1.2, seed: 1044, tex: 0.6, kind: 'card', lift: [0, -10], liftAlpha: 0.5 });
      const top = S().rect(-40, 744, 1000, 34); const tp = GG.piece(g, top, { fill: '#A08A6E', rough: 1, seed: 1045, tex: 0.5, kind: 'card', lift: [0, 6], liftAlpha: 0.5 }); GG.crescent(g, tp, 0, -4, '#C0A888', 0.8);
      // him, beyond, with her bag: soft
      const L = RIG.light('day', { keys: [{ dir: [0.6, -0.3, 0.6], col: '#E6EBEE', k: 0.62, poster: [0.12, 0.5], levels: [0.55, 1] }], paper: { from: [0.8, -0.55] } });
      RIG.draw(c, 'him', 'bag', { x: 760, y: 270, s: 205, light: L, tau: 0.62, zip: 0.3, crop: 4.4, target: g, face: { yaw: 0.4, pitch: 0.46, lids: 0.26, gaze: [0, 0.6] } });
      // the lens is on the phone: everything here is soft
      const tmp = OTM.makeCanvas(W, H), tg = tmp.getContext('2d'); tg.filter = 'blur(7px)'; tg.drawImage(cv, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(tmp, 0, 0);
      // the strip, a little less soft (a photograph on the fridge door; it is the first of the three)
      const st = GG.photoStrip({ w: 124, h: 430, seed: 3, scale: 1.1 });
      const s2 = OTM.makeCanvas(150, 400), sg = s2.getContext('2d'); sg.filter = 'blur(1.6px)'; sg.drawImage(st, 18, 16, 110, 370);
      g.save(); g.translate(430, 470); g.rotate(-0.045); g.fillStyle = 'rgba(40,36,34,0.3)'; g.filter = 'blur(5px)'; g.fillRect(-50, -170, 112, 360); g.filter = 'none'; g.drawImage(s2, -75, -200); g.restore();
      g.fillStyle = '#A8392F'; g.save(); g.filter = 'blur(1.5px)'; g.beginPath(); g.ellipse(436, 282, 17, 15, 0, 0, 7); g.fill(); g.restore();
    });
  }
  // her, in the near foreground: the back of her head (sculpted once, then softened) and her coat's shoulder
  function ossHer(c) {
    return c.cache('Q10|ossHer', (g, cv) => {
      const L = RIG.light('day', { keys: [{ dir: [0.75, -0.35, 0.5], col: '#E6EBEE', k: 0.62, poster: [0.12, 0.5], levels: [0.55, 1] }], paper: { from: [0.8, -0.55] } });
      // the coat's shoulder and collar, close and dark
      const S = OTM.S;
      const sh = GG.blob([[1380, 1100], [1420, 820], [1520, 700], [1700, 640], [1960, 660], [1980, 1100]]);
      const sp = GG.piece(g, sh, { fill: '#24403A', rough: 2, seed: 1051, tex: 0.75, kind: 'wool', lift: [-14, 10], liftAlpha: 0.55, liftBlur: 20 }); GG.crescent(g, sp, 14, -10, '#3E6058', 0.9);
      const col = GG.blob([[1500, 760], [1560, 560], [1660, 500], [1720, 560], [1700, 700], [1600, 800]]);
      const cp = GG.piece(g, col, { fill: '#2A4842', rough: 1.6, seed: 1052, tex: 0.75, kind: 'wool', lift: [-8, 8], liftAlpha: 0.55 }); GG.crescent(g, cp, 10, -8, '#4A7066', 0.9);
      RIG.head(c, 'her', { x: 1760, y: 330, s: 560, yaw: -2.35, pitch: 0.38, roll: -0.08, lids: 0.5, light: L, target: g });
      const tmp = OTM.makeCanvas(W, H), tg = tmp.getContext('2d'); tg.filter = 'blur(5px)'; tg.drawImage(cv, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(tmp, 0, 0);
    });
  }
  function overShoulder(c, st, lt) {
    const tt = twos(lt);
    push(c, 1000, 560, 1 + 0.025 * E.inOutSine(seg(lt, 18, 21)));
    c.g.drawImage(ossPlate(c), 0, 0);
    // the phone completes its turn toward her (18.0–18.5) and she holds it there, studying the picture; it smiles up at her
    const turn = E.outCubic(seg(lt, 18.0, 18.55));
    const Lh = RIG.light('day', { keys: [{ dir: [0.75, -0.35, 0.5], col: '#E6EBEE', k: 0.62, poster: [0.12, 0.5], levels: [0.55, 1] }], paper: { from: [0.8, -0.55] }, keyK: 0.8, phone: [1060, 500], phoneCol: '#C8EEF2', phoneK: 0.2 });
    const P = { x: 1060, y: 520 + 4 * Math.sin(tt * 1.3), h: 560, roll: 0.1, yaw: lerp(-0.85, 0.12, turn), pitch: 0.08, screen: 'lock', state: CALL(), env: '#BCC2C4', sheen: 0.06 };
    const info = PHONE.where(P, c);
    PHONE.glow(c, { info, k: 0.55, r: 900 });
    const hp = { x: 1235, y: 840, s: 540, light: Lh, rot: 0.32, reach: 0.0, flip: true };
    RIG.hand(c, 'her', 'thumb', hp);
    drawSleeve(c, 'coat', [1260, 880], [1700, 1500], 1.6, true);
    PHONE.draw(c, P);
    RIG.hand(c, 'her', 'thumb', Object.assign({}, hp, { only: 'thumb', target: 'gl' }));
    c.g.drawImage(ossHer(c), 0, 0);
  }

  // ------------------------------------------------------------------ 44–54: her thumb on the glass; the screen dims and goes dark
  function coatPlate(c) {
    return c.cache('Q10|coatPlate', (g, cv) => {
      const S = OTM.S; g.fillStyle = '#5F5C55'; g.fillRect(0, 0, W, H);
      // looking down past the phone: the floorboards, and the front of her coat falling to the left
      for (let i = -2; i < 14; i++) { const y = i * 110 + 20; GG.piece(g, S().poly([[-60, y], [2000, y - 60], [2000, y + 48], [-60, y + 106]]), { fill: i % 2 ? '#6B5E50' : '#66594C', rough: 1, seed: 1060 + i, tex: 0.55, kind: 'card', lift: [0, 4], liftAlpha: 0.35 }); }
      const coat = GG.blob([[-80, -80], [560, -80], [700, 300], [640, 760], [520, 1180], [-80, 1180]]);
      const cp = GG.piece(g, coat, { fill: '#26443E', rough: 2, seed: 1071, tex: 0.75, kind: 'wool', lift: [14, 6], liftAlpha: 0.55, liftBlur: 22 }); GG.crescent(g, cp, -14, -8, '#3E6058', 0.9);
      [[420, 240], [470, 620], [430, 990]].forEach(([x, y]) => { g.fillStyle = '#16221F'; g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill(); });
      const st = S().M(820, -80).L(880, -80).L(560, 1180).L(500, 1180).Z(); const sp = GG.piece(g, st, { fill: '#8A5C3A', rough: 1, seed: 1072, tex: 0.6, kind: 'card', lift: [6, 8], liftAlpha: 0.5 }); GG.crescent(g, sp, -5, 0, '#C08E62', 0.9);
      const tmp = OTM.makeCanvas(W, H), tg = tmp.getContext('2d'); tg.filter = 'blur(8px)'; tg.drawImage(cv, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(tmp, 0, 0);
    });
  }
  function thumbInsert(c, st, lt, o) {
    const tt = twos(lt);
    push(c, 1000, 520, 1 + (o.dim ? 0.02 * seg(lt, 51, 54) : 0.03 * E.inOutSine(seg(lt, 44, 48))));
    c.g.drawImage(coatPlate(c), 0, 0);
    const Lh = RIG.light('day', { keys: [{ dir: [0.7, -0.4, 0.55], col: '#E6EBEE', k: 0.62, poster: [0.12, 0.5], levels: [0.55, 1] }], paper: { from: [0.8, -0.55] }, keyK: 0.78, phone: [1000, 520], phoneCol: '#C8EEF2', phoneK: o.dim ? 0.22 * (1 - seg(lt, 51.6, 54)) : 0.22 });
    // the thumb rests on the glass, low, where one swipe would open everything (44–48); a hair's movement at 46.2; at 51 it lifts away
    const reach = o.dim ? lerp(0.32, 0.08, E.inOutSine(seg(tt, 51.0, 51.5))) : key(tt, [[44, 0.3], [46.2, 0.3], [46.6, 0.36], [47.4, 0.32]]);
    const P = { x: 1000, y: 470, h: 700, roll: 0.06, pitch: 0.12, screen: o.dim ? (lt < 54 ? 'dim' : 'black') : 'lock', state: o.dim ? Object.assign({ p: seg(lt, 51, 54) }, CALL()) : CALL(), env: '#BCC2C4', sheen: 0.06 };
    const info = PHONE.where(P, c);
    PHONE.glow(c, { info, k: 0.5, r: 1100 });
    const hp = { x: 1175, y: 1010, s: 640, light: Lh, rot: 0.18, reach, flip: true };
    drawSleeve(c, 'coat', [1240, 1120], [1500, 1700], 1.8, true);
    RIG.hand(c, 'her', 'thumb', hp);
    PHONE.draw(c, P);
    RIG.hand(c, 'her', 'thumb', Object.assign({}, hp, { only: 'thumb', target: 'gl' }));
  }

  // ------------------------------------------------------------------ 54–59: the trade, on the centre line
  // Her right hand holds the phone out flat (dark now); his left holds the bag from underneath. His other hand takes the phone; hers
  // takes the bag by its far end. Her fingers stop short of his. Each hand comes out of its own sleeve.
  function trade(c, st, lt) {
    const V = LV().hands; const tt = twos(lt);
    push(c, 960, 640, 1.02);
    V.back(c, lt, DAY);
    const L = setLight(V.shots.insert.lights.day);
    const s = 300, cx = 960;
    const u = (a, b) => E.inOutSine(seg(tt, a, b));
    // upper lane: her right hand holds the phone out flat (dark now); his right hand comes from the left and takes it by its end.
    // lower lane: his left hand holds the bag out from underneath; her left hand comes from the right and takes it by its far end.
    const offer = u(54.0, 55.0), reachT = u(54.8, 55.8), back = u(56.2, 57.4), gone = u(57.2, 58.6);
    const yU = 520, yL = 790;
    const herO = [lerp(2150, cx + 150, offer) + lerp(0, 1200, back), yU + 40];
    const hisO = [lerp(-230, cx - 170, offer) - lerp(0, 1200, back), yL + 40];
    const hisT = [lerp(-260, cx - 330, reachT) - lerp(0, 1300, gone), yU - 10];
    const herT = [lerp(2180, cx + 350, reachT) + lerp(0, 1300, gone), yL - 20];
    const held = tt >= 56.1;
    const phone = held ? [hisT[0] + 205, hisT[1] + 35] : [herO[0] - 150, herO[1] - 70];
    const bag = held ? [herT[0] - 230, herT[1] + 50] : [hisO[0] + 170, hisO[1] - 70];
    // the hands that hold out, under their things
    drawSleeve(c, 'coat', [herO[0] + 70, herO[1] + 18], [herO[0] + 1000, herO[1] + 140], 0.78, true);
    RIG.hand(c, 'her', 'offer', { x: herO[0], y: herO[1], s: s * 0.92, light: L, fore: [1, 0.12], flip: true, close: held ? 0.55 : 0.3 });
    drawSleeve(c, 'sweater', [hisO[0] - 70, hisO[1] + 18], [hisO[0] - 1000, hisO[1] + 140], 0.82, false);
    RIG.hand(c, 'him', 'offer', { x: hisO[0], y: hisO[1], s, light: L, fore: [-1, 0.12], close: held ? 0.6 : 0.4 });
    RIG.bag(c, bag[0], bag[1], s * 0.85, { light: L, rot: -0.04 });
    PHONE.draw(c, { x: phone[0], y: phone[1], h: s * 0.78, pitch: 1.12, spin: Math.PI / 2 - 0.08, screen: 'black', env: '#BCC2C4' });
    // the hands that take
    const close = clamp((tt - 55.6) / 0.5, 0, 1) > 0.5 ? 0.85 : 0.25;
    drawSleeve(c, 'sweater', [hisT[0] - 70, hisT[1] + 14], [hisT[0] - 1000, hisT[1] + 60], 0.82, false);
    RIG.hand(c, 'him', 'take', { x: hisT[0], y: hisT[1], s, light: L, fore: [-1, 0.06], close, target: 'gl' });
    drawSleeve(c, 'coat', [herT[0] + 70, herT[1] + 14], [herT[0] + 1000, herT[1] + 60], 0.78, true);
    RIG.hand(c, 'her', 'take', { x: herT[0], y: herT[1], s: s * 0.92, light: L, fore: [1, 0.06], flip: true, close });
  }

  // ------------------------------------------------------------------ 70–75: the door. She leaves; it closes softly behind her
  function door(c, st, lt) {
    const V = LV().door; const tt = twos(lt); const A = V.anchors;
    const open = lt < 72.3 ? 0.85 : lerp(0.85, 0, E.inOutSine(seg(lt, 72.3, 73.5)));
    const s0 = { tod: 'day', door: open };
    V.back(c, lt, s0);
    // she crosses the landing beyond the doorway, in profile, the bag in her near hand, and is gone behind the jamb
    const x = lerp(1140, 610, seg(tt, 70.3, 72.4));
    if (tt < 72.4) {
      const g = c.g; g.save(); g.beginPath(); g.rect(A.doorJamb[0] + 2, 150, A.doorHinge[0] - A.doorJamb[0], 960); g.clip();
      RIG.draw(c, 'her', 'walk', { x, y: A.herDoorway[1], s: 0.23 * A.herDoorway[2], light: setLight(V.shots.inside.lights.day), t: lt, phase: (tt - 70.3) * 0.95, flip: true, carry: 'bag', face: { yaw: 1.05, pitch: 0.18, lids: 0.6 } });
      g.restore();
    }
    V.front(c, lt, s0);
  }

  // ------------------------------------------------------------------ 75–86: the room by day. He stays where he is
  function roomAlone(c, st, lt) {
    const V = LV().room; const tt = twos(lt);
    V.back(c, lt, DAY); V.front(c, lt, DAY);
    const L = setLight(V.shots.wide.lights.day);
    const a = V.anchors.himBetween, s = 0.23 * a[2];
    // he listens to her go down the stairs (his head turns a little toward the door), then the street door, then nothing
    const turn = key(tt, [[75.6, 0], [76.6, 1], [81.4, 1], [82.4, 0.2]]);
    const f = RIG.draw(c, 'him', 'stand', { x: a[0], y: a[1], s, light: L, t: lt, tau: 0.3,
      armL: { a1: -0.06, a2: 0.1, hand: 'relax' }, armR: { E: [0.7, 2.32], W: [0.3, 2.95], hand: 'thumb', hp: { reach: 0.1, flip: true, over: 'thumb' }, front: true },
      face: { yaw: lerp(0.15, 0.62, turn), pitch: lerp(0.46, 0.2, turn), lids: lerp(0.28, 0.5, turn), gaze: [lerp(0, 0.3, turn), lerp(0.6, 0.2, turn)] } });
    const hr = f.hands.R; if (hr) { PHONE.draw(c, { x: hr.grip[0], y: hr.grip[1] - 0.12 * s, h: 0.7 * s, roll: hr.rot * -1, pitch: 0.7, screen: 'black', env: '#BCC2C4' }); f.over(c); }
  }

  FILM.seq({
    id: 'Q10', title: "You didn't forget", dur: 86,
    setup() { PHONE.prepare(['waterfall']); },
    lines: [
      { id: 'L017', at: 0.5 },      // Her: Maybe it's not my place. But I'm the background of your phone, and we aren't together anymore.
      { id: 'L018', at: 11.5 },     // Him: I know. I forgot to change it.
      { id: 'L019', at: 15.4 },     // Her: You didn't forget.
      { id: 'L020', at: 24.0 },     // Her: Is it Photoshop?
      { id: 'L021', at: 29.5 },     // Her (quieter): Have you been using AI to make pictures of me?
      { id: 'L022', at: 36.8 },     // Him: I just missed you, is all.
      { id: 'L023', at: 59.5 },     // Her: We've been apart longer than we were ever together. (beat) This is not okay.
    ],
    sound(S) {
      S.bed('room_day', 0, 51.5, { level: -46 });
      S.bed('street_day', 0, 51.5, { level: -52, what: 'through the window, far' });
      S.cue('coat_rustle', 21.0, { what: 'her free hand rising to the back of her neck, the wool of her sleeve' });
      S.cue('breath_held', 48.0, { dur: 3, what: 'his: the room going quiet around it' });
      // A057: the screen dims and she lets it go dark. The room goes quiet: the bed dips 6 dB and the window's street drops out
      S.cue('phone_dim', 51.5, { what: 'nothing: the screen going dark makes no sound. The silence is the cue' });
      S.duck(51.5, 59.5, 0.5);
      S.bed('room_day', 51.5, 86, { level: -52, what: 'the room after: 6 dB under' });
      S.cue('trade', 55.0, { dur: 3, what: 'cloth, the bag changing hands, the broken zip ticking once' });
      S.cue('breath_in', 66.6, { what: 'hers: a breath drawn to say something more, then held, then let go unspoken (68.5)' });
      S.cue('door_close_soft', 73.5, { what: 'the front door pulled shut softly from the landing' });
      S.bed('footsteps_stairs', 75, 81, { level: -40, fo: 1, what: 'her steps going down the stairwell, receding' });
      S.cue('street_door', 81.5, { level: -50, what: 'far below: the street door' });
      S.bed('street_day', 82, 86, { level: -58, what: 'then nothing but the room' });
    },
    shots: [
      { at: 0, name: 'between: L017; the phone held up to him', draw: twoOpen, post: { vig: 0.45, halation: 0.4 } },
      { at: 11, name: 'him: "I know. I forgot to change it."', draw: onHim, post: { vig: 0.5 } },
      { at: 15, name: 'her: "You didn\'t forget."', draw: onHer, post: { vig: 0.5 } },
      { at: 18, name: 'over her shoulder: the strip, the picture, and her', draw: overShoulder, post: { vig: 0.5, halation: 0.45 } },
      { at: 21, name: 'her: the hand at her nape; "Is it Photoshop?"', draw: nape, post: { vig: 0.5 } },
      { at: 26.5, name: 'him: eyes on the floor; L021, L022', draw: floor, post: { vig: 0.5 } },
      { at: 40, name: 'her: very still', draw: still, post: { vig: 0.52 } },
      { at: 44, name: 'phone: her thumb on the glass', draw: (c, st, lt) => thumbInsert(c, st, lt, {}), post: { vig: 0.55 } },
      { at: 48, name: 'him: watching the thumb, not breathing', draw: watching, post: { vig: 0.52 } },
      { at: 51, name: 'phone: the screen dims; she lets it go dark', draw: (c, st, lt) => thumbInsert(c, st, lt, { dim: true }), post: { vig: 0.58 } },
      { at: 54, name: 'hands: the trade on the centre line', draw: trade, post: { vig: 0.5 } },
      { at: 59, name: 'between: L023; the breath drawn and swallowed', draw: twoAfter, post: { vig: 0.45 } },
      { at: 70, name: 'door: she leaves; it closes softly', draw: door, post: { vig: 0.45 } },
      { at: 75, name: 'room by day: he stays where he is; her half empty again', draw: roomAlone, post: { vig: 0.45 } },
    ],
  });
})();
