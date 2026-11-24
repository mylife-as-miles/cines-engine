/* LONG DISTANCE · Q10 YOU DIDN'T FORGET (82.5 s) · S12 (A052–A061), L017–L023
   The longest scene, played in the two-shot from Q09 (B3) and in close-ups that cut on looks, not on lines. One geography for the
   whole argument: she stands in the empty half with the pale rectangle and the window's light behind her, looking screen left; he
   stands in his half with the kitchen behind him (the fridge and the strip, the counter), looking screen right. Her over-the-shoulder
   at 18 s looks the same way, so the three of her share one frame: the strip on the fridge (grain), the picture on the phone (gloss)
   and herself (grain, older). The room goes quiet when she lets the screen go dark. The trade happens on the centre line, two
   bodies each holding out one arm, her fingers never touching his. She leaves; her half of the room is empty again.
   Shots: 0 between (L017) · 4.6 her, the phone held up to him · 8.4 him (L018) · 15 her (L019) · 18 over her shoulder (the three
   of her) · 21 her (the hand to her nape; L020) · 26.5 him (he looks at the floor) · 29.3 her (L021, quieter) · 35.6 him (L022)
   · 40 her, very still · 44 her thumb on the glass · 48 him, not breathing · 51 the screen goes dark · 54 the trade · 59 between
   (L023; the breath, swallowed) · 70 the door · 75 the room, his alone, until he looks down at the phone. */
(function () {
  'use strict';
  const { W, H } = OTM; const seg = FILM.seg, key = FILM.key, twos = FILM.twos, E = FILM.ease, clamp = FILM.clamp, lerp = FILM.lerp;
  const K = window.LD_END;
  const LV = () => SETS.living.views;
  const CALL = () => ({ banner: { text: PHONE.MSG.callMeTonight, in: 1 } });
  const setLight = K.setLight, push = K.push;
  const DAY = { tod: 'day' };
  const m = (id, at, lt, cap) => Math.min(cap == null ? 3 : cap, RIG.mouthFor(id, lt - at));

  // ------------------------------------------------------------------ the two-shot, B3 (0–4.6, 59–70)
  function two(c, lt, o) {
    const V = LV().between, A = V.anchors, tt = twos(lt);
    V.back(c, lt, DAY);
    const Ls = V.shots.two.lights.day;
    const her0 = A.herBetween, s = 0.23 * her0[2], h0 = A.himBetween, hs = 0.23 * h0[2];
    const himFace = Object.assign({ yaw: 2.0, pitch: 0.4, roll: 0.35, lids: 0.3, gaze: [0, 0.7] }, o.himFace || {});
    if (o.after) {
      // after the trade: the bag held at her side (the rig's trade pose, done); he has the phone in front of him, where we cannot see it
      RIG.draw(c, 'her', 'trade', { x: her0[0] + 20, y: her0[1], s, light: setLight(Ls), t: lt, flip: true, u: 1, line: A.handsMeet, tau: 0.42, face: o.face });
      RIG.draw(c, 'him', 'stand', { view: 'back', x: h0[0] + 10, y: h0[1] + 10, s: hs, light: setLight(Ls), t: lt, crop: 4.6, tau: 0.55, breathAmp: 3,
        armL: { a1: -0.1, a2: 0.1, hand: false }, armR: { to: [0.3, 2.4], bend: -1, hand: false, front: true }, face: himFace });
      return;
    }
    const L = setLight(Ls, { rig: { phone: [A.phoneHeld[0] + 120, A.phoneHeld[1] - 20], phoneCol: '#C8EEF2', phoneK: 0.45 } });
    const her = RIG.draw(c, 'her', 'phone', { x: her0[0] + 20, y: her0[1], s, light: L, t: lt, flip: true, hold: o.hold || 0, tau: 0.42, face: o.face });
    RIG.draw(c, 'him', 'bag', { x: h0[0] + 10, y: h0[1] + 10, s: hs, light: setLight(Ls), t: lt, view: 'back', zip: tt * 0.6, crop: 4.6, face: himFace });
    if (her.phone) {
      const ph = her.phone; const P = { x: ph.x, y: ph.y, h: ph.h, roll: ph.angle, yaw: -0.3, screen: 'lock', state: CALL(), env: '#B8BEC0', sheen: 0.07 };
      PHONE.glow(c, { info: PHONE.where(P, c), k: 0.42, r: ph.h * 2.6 });
      PHONE.draw(c, P); her.over(c);
    }
  }
  // 0–4.6: "Maybe it's not my place." She says it holding the phone up to him; he does not look up
  function twoOpen(c, st, lt) {
    two(c, lt, { face: { yaw: 0.52, pitch: 0.08, lids: key(twos(lt), [[0.5, 0.7], [3.2, 0.62]]), gaze: [0.42, 0.08], mouth: m('L017', 0.5, lt) } });
  }

  // ------------------------------------------------------------------ her close-ups with the phone (between/her)
  // hold 0: the phone up between them, the screen to him; 1: turned back to her, studying it (we see its back)
  function herPhone(c, lt, o) {
    const hold = o.hold == null ? 1 : o.hold;
    const lift = o.still ? 220 : lerp(70, 220, E.inOutSine(clamp(hold, 0, 1)));
    const V = LV().between, A = V.shots.her.anchors, s = 0.23 * A.herBetween[2];
    const her = K.herClose(c, lt, { pose: o.still ? 'still' : 'phone', lift, still: o.still, blink: o.blink, face: o.face,
      phoneAt: hold > 0.5 ? [A.herBetween[0] - 0.2 * s, A.herBetween[1] + 1.8 * s] : null, phoneK: o.screen == null ? 0.5 : 0.5 * o.screen,
      p: { hold, nape: o.nape || 0, tau: 0.42 } });
    if (her && her.phone) {
      const ph = her.phone;
      const P = hold > 0.5 ? { x: ph.x, y: ph.y, h: ph.h, roll: -0.35, yaw: Math.PI - 0.25, pitch: 0.55, screen: 'lock', state: CALL(), env: '#B8BEC0', bright: o.screen == null ? 1 : o.screen }
        : { x: ph.x, y: ph.y, h: ph.h, roll: ph.angle, yaw: -0.25, screen: 'lock', state: CALL(), env: '#B8BEC0' };
      PHONE.glow(c, { info: PHONE.where(P, c), k: 0.45, r: ph.h * 2.2 });
      PHONE.draw(c, P); her.over(c);
    }
    return her;
  }
  // 4.6–8.4: "But I'm the background of your phone": the screen held up between them
  function herBackground(c, st, lt) {
    herPhone(c, lt, { hold: 0, face: { yaw: 0.5, pitch: 0.06, lids: 0.66, gaze: [0.42, 0.08], mouth: m('L017', 0.5, lt), brows: key(twos(lt), [[6.6, 0], [7.4, 0.25]]) } });
  }
  // 15–18: "You didn't forget." Then she turns the phone back to look at it (17.3)
  function herForget(c, st, lt) {
    const tt = twos(lt), turn = E.inOutSine(seg(tt, 17.3, 18.0));
    herPhone(c, lt, { hold: turn, face: { yaw: lerp(0.45, 0.2, turn), pitch: lerp(0.06, 0.34, turn), lids: lerp(0.7, 0.52, turn), gaze: [lerp(0.4, 0.1, turn), lerp(0.06, 0.5, turn)], mouth: m('L019', 15.4, lt) } });
  }
  // 21–26.5: studying the picture, her free hand goes to the back of her neck (21–24) where her hair used to be. "Is it Photoshop?"
  function nape(c, st, lt) {
    const tt = twos(lt);
    const np = E.inOutSine(seg(tt, 21.1, 23.6)), up = E.inOutSine(seg(tt, 23.6, 24.2));
    herPhone(c, lt, { hold: 1, nape: np, face: { yaw: lerp(0.2, 0.45, up), pitch: lerp(0.34, 0.1, up), lids: lerp(0.5, 0.66, up), gaze: [lerp(0.1, 0.4, up), lerp(0.5, 0.06, up)], mouth: m('L020', 24.0, lt) } });
  }
  // 29.3–35.6: "Have you been using AI to make pictures of me?" Quieter. She asks it of him, her hand still at her neck
  function herAI(c, st, lt) {
    const tt = twos(lt);
    // her hand stays at the back of her neck while she asks it (it comes down off screen, on his reply)
    herPhone(c, lt, { hold: 1, nape: 1, face: { yaw: 0.42, pitch: 0.12, lids: key(tt, [[29.3, 0.62], [33, 0.56], [35.4, 0.6]]), gaze: [0.38, key(tt, [[29.3, 0.08], [34.5, 0.08], [35.3, 0.2]])], mouth: m('L021', 29.5, lt), brows: key(tt, [[30.5, 0], [31.5, 0.25], [34, 0.25], [35, 0]]) } });
  }
  // 40–44: she goes very still
  function still(c, st, lt) {
    herPhone(c, lt, { still: true, hold: 1, blink: false, face: { yaw: 0.22, lids: 0.5, gaze: [0.05, 0.55], pitch: 0.3 } });
  }

  // ------------------------------------------------------------------ his close-ups, against the kitchen (the same side as her over-the-shoulder)
  // 8.4–15: "and we aren't together anymore" lands on him; "I know." his eyes come up to her; "I forgot to change it." they go down
  function onHim(c, st, lt) {
    const tt = twos(lt);
    const up = key(tt, [[11.1, 0], [11.5, 1, 'outCubic'], [12.6, 1], [13.1, 0]]);
    K.himClose(c, lt, { zip: Math.max(0, tt - 13.2) * 0.6, face: { yaw: lerp(0.12, 0.3, up), pitch: lerp(0.42, 0.12, up), lids: lerp(lerp(0.34, 0.26, seg(tt, 9.2, 9.8)), 0.62, up), gaze: [lerp(0, 0.3, up), lerp(0.6, 0.05, up)], mouth: m('L018', 11.5, lt, 2), brows: lerp(0.1, 0.25, up) } });
  }
  // 26.5–29.3: he looks at the floor
  function floor(c, st, lt) {
    const tt = twos(lt), down = E.inOutSine(seg(tt, 26.7, 27.6));
    K.himClose(c, lt, { zip: 0.4, face: { yaw: lerp(0.22, 0.04, down), pitch: lerp(0.3, 0.5, down), lids: lerp(0.4, 0.22, down), gaze: [lerp(0.15, -0.05, down), lerp(0.4, 0.6, down)], brows: 0.25 } });
  }
  // 35.6–40: a breath; his eyes come up to her once, then back to the floor: "I just missed you, is all."
  function missed(c, st, lt) {
    const tt = twos(lt);
    const up = key(tt, [[35.9, 0], [36.3, 0.55], [37.7, 0.55], [38.3, 0.1]]);
    K.himClose(c, lt, { zip: 0.4, breath: RIG.breath(lt, tt < 36.6 ? 5 : 2.5), face: { yaw: lerp(0.06, 0.2, up), pitch: lerp(0.48, 0.28, up), lids: lerp(0.24, 0.44, up), gaze: [lerp(-0.05, 0.25, up), lerp(0.6, 0.25, up)], mouth: m('L022', 36.8, lt, 2), brows: 0.25 } });
  }
  // 48–51: watching her thumb, not breathing
  function watching(c, st, lt) {
    K.himClose(c, lt, { zip: 0.4, breath: 0, blink: false, face: { yaw: 0.26, pitch: 0.32, lids: 0.6, gaze: [0.35, 0.45], brows: 0.25 } });
  }

  // ------------------------------------------------------------------ 18–21: over her shoulder. The three of her in one frame
  // Past her right shoulder toward the kitchen: him, soft, with the bag; the fridge behind him and the strip on it (grain); in her hand,
  // sharp, the phone and the picture (gloss); and herself, the back of her copper bob and the line of her cheek (grain)
  function ossPlate(c) {
    return c.cache('Q10|oss', (g, cv) => {
      const S = OTM.S;
      g.fillStyle = '#74736C'; g.fillRect(0, 0, W, H); GG.texture(g, (() => { const p = new Path2D(); p.rect(0, 0, W, H); return p; })(), 0.55, 1041, 'paper');
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(200,204,196,0.12)'; g.fill(S().poly([[-100, 80], [700, 30], [900, 1100], [-100, 1100]]).path(3, 1042)); g.restore();
      const fr = S().rect(230, 140, 470, 1000); const fp = GG.piece(g, fr, { fill: '#C9C4B8', rough: 1.1, seed: 1043, tex: 0.6, kind: 'card', lift: [10, 8], liftAlpha: 0.45, liftBlur: 14 });
      g.save(); g.clip(fp); g.fillStyle = '#B3AEA2'; g.fillRect(620, 140, 80, 1000); g.fillStyle = 'rgba(60,58,54,0.4)'; g.fillRect(230, 640, 470, 6); g.restore();
      g.fillStyle = '#9C988E'; g.fillRect(640, 330, 12, 250);
      const ct = S().rect(-40, 760, 980, 360); GG.piece(g, ct, { fill: '#6E675D', rough: 1.2, seed: 1044, tex: 0.6, kind: 'card', lift: [0, -10], liftAlpha: 0.5 });
      const top = S().rect(-40, 744, 1000, 34); const tp = GG.piece(g, top, { fill: '#A08A6E', rough: 1, seed: 1045, tex: 0.5, kind: 'card', lift: [0, 6], liftAlpha: 0.5 }); GG.crescent(g, tp, 0, -4, '#C0A888', 0.8);
      const L = RIG.light('day', { keys: [{ dir: [0.6, -0.3, 0.6], col: '#E6EBEE', k: 0.62, poster: [0.12, 0.5], levels: [0.55, 1] }], paper: { from: [0.8, -0.55] } });
      RIG.draw(c, 'him', 'bag', { x: 760, y: 270, s: 205, light: L, tau: 0.62, zip: 0.3, crop: 4.4, target: g, face: { yaw: 0.4, pitch: 0.46, lids: 0.26, gaze: [0, 0.6] } });
      const tmp = OTM.makeCanvas(W, H), tg = tmp.getContext('2d'); tg.filter = 'blur(7px)'; tg.drawImage(cv, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(tmp, 0, 0);
      const st = GG.photoStrip({ w: 124, h: 430, seed: 3, scale: 1.1 });
      const s2 = OTM.makeCanvas(150, 400), sg = s2.getContext('2d'); sg.filter = 'blur(1.6px)'; sg.drawImage(st, 18, 16, 110, 370);
      g.save(); g.translate(430, 470); g.rotate(-0.045); g.fillStyle = 'rgba(40,36,34,0.3)'; g.filter = 'blur(5px)'; g.fillRect(-50, -170, 112, 360); g.filter = 'none'; g.drawImage(s2, -75, -200); g.restore();
      g.fillStyle = '#A8392F'; g.save(); g.filter = 'blur(1.5px)'; g.beginPath(); g.ellipse(436, 282, 17, 15, 0, 0, 7); g.fill(); g.restore();
    });
  }
  function ossHer(c) {
    return c.cache('Q10|ossHer', (g, cv) => {
      const L = RIG.light('day', { keys: [{ dir: [0.75, -0.35, 0.5], col: '#E6EBEE', k: 0.62, poster: [0.12, 0.5], levels: [0.55, 1] }], paper: { from: [0.8, -0.55] } });
      const sh = GG.blob([[1380, 1100], [1420, 820], [1520, 700], [1700, 640], [1960, 660], [1980, 1100]]);
      const sp = GG.piece(g, sh, { fill: '#24403A', rough: 2, seed: 1051, tex: 0.75, kind: 'wool', lift: [-14, 10], liftAlpha: 0.55, liftBlur: 20 }); GG.crescent(g, sp, 14, -10, '#3E6058', 0.9);
      const col = GG.blob([[1500, 760], [1560, 560], [1660, 500], [1720, 560], [1700, 700], [1600, 800]]);
      const cp = GG.piece(g, col, { fill: '#2A4842', rough: 1.6, seed: 1052, tex: 0.75, kind: 'wool', lift: [-8, 8], liftAlpha: 0.55 }); GG.crescent(g, cp, 10, -8, '#4A7066', 0.9);
      RIG.head(c, 'her', { x: 1760, y: 330, s: 560, yaw: -2.35, pitch: 0.38, roll: -0.08, lids: 0.5, light: L, target: g });
      const tmp = OTM.makeCanvas(W, H), tg = tmp.getContext('2d'); tg.filter = 'blur(5px)'; tg.drawImage(cv, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(tmp, 0, 0);
    });
  }
  function overShoulder(c, st, lt) {
    push(c, 1000, 560, 1 + 0.025 * E.inOutSine(seg(lt, 18, 21)));
    c.g.drawImage(ossPlate(c), 0, 0);
    const L = RIG.light('day', { keys: [{ dir: [0.75, -0.35, 0.5], col: '#E6EBEE', k: 0.62, poster: [0.12, 0.5], levels: [0.55, 1] }], paper: { from: [0.8, -0.55] }, phone: [1060, 500], phoneCol: '#C8EEF2', phoneK: 0.2 });
    // her right hand, up from her shoulder below the frame: the phone in it, its screen to her (and to us), the picture smiling up at her
    K.arm(c, { who: 'her', side: 'R', s: 800, flip: true, light: L, shoulder: [1900, 2500], phoneAt: [1070, 560 + 3 * Math.sin(twos(lt) * 1.3)], rot: -0.12, hp: { reach: 0.08, over: ['thumb', 'dist'] },
      phone: { screen: 'lock', state: CALL(), env: '#BCC2C4', sheen: 0.06, pitch: 0.06 }, glow: { k: 0.55, r: 900 } });
    c.g.drawImage(ossHer(c), 0, 0);
  }

  // ------------------------------------------------------------------ 44–54: her thumb on the glass; the screen dims and goes dark
  function coatPlate(c) {
    return c.cache('Q10|coatPlate', (g, cv) => {
      const S = OTM.S; g.fillStyle = '#5F5C55'; g.fillRect(0, 0, W, H);
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
    const L = RIG.light('day', { keys: [{ dir: [0.7, -0.4, 0.55], col: '#E6EBEE', k: 0.5, poster: [0.12, 0.5], levels: [0.55, 1] }], paper: { from: [0.8, -0.55] }, phone: [1000, 480], phoneCol: '#C8EEF2', phoneK: o.dim ? 0.1 * Math.round(2 * (1 - seg(lt, 51.6, 54))) : 0.2 });   // the screen's light on her hand in three steps (a reshade each)
    // the thumb rests low on the glass, where one swipe would open everything (44–48); a hair's movement at 46.2; at 51 it lifts away
    const reach = o.dim ? lerp(0.32, 0.04, E.inOutSine(seg(tt, 51.0, 51.5))) : key(tt, [[44, 0.3], [46.2, 0.3], [46.6, 0.38], [47.4, 0.33]]);
    K.arm(c, { who: 'her', side: 'R', s: 1100, flip: true, light: L, shoulder: [1900, 3150], phoneAt: [1000, 500], rot: -0.08, hp: { reach: Math.round(reach * 20) / 20, over: ['thumb', 'dist'] },
      phone: { screen: o.dim ? (lt < 54 ? 'dim' : 'black') : 'lock', state: o.dim ? Object.assign({ p: seg(lt, 51, 54) }, CALL()) : CALL(), env: '#BCC2C4', sheen: 0.06, pitch: 0.1 }, glow: { k: 0.5, r: 1100 } });
  }

  // ------------------------------------------------------------------ 54–59: the trade, on the centre line
  // The rig's trade, seen close: his sweater from the left, her coat from the right, one arm each out from the shoulder. She holds the
  // phone out flat on her palm, he the bag from underneath; his free hand takes the phone by its near end, hers the bag by its far end.
  function trade(c, st, lt) {
    const V = LV().hands; const tt = twos(lt);
    push(c, 960, 600, 1.02);
    V.back(c, lt, DAY);
    const L = setLight(V.shots.insert.lights.day);
    const u = E.inOutSine(seg(tt, 53.6, 58.8));
    const tr = RIG.trade(c, u, { x: 960, y: 600, s: 330, light: L, t: lt });
    if (tr.phone) {
      const T = RIG.tradeTime(u);
      // until the swap it lies on her palm (its far end over her fingers); after, it is in his grip
      const hp = !T.swap && tr.her && tr.her.hands && tr.her.hands.L, len = tr.phone.w;
      const at = hp ? [hp.grip[0] - 0.22 * len, hp.grip[1] - 0.06 * len] : [tr.phone.x, tr.phone.y];
      PHONE.draw(c, { x: at[0], y: at[1], h: len, spin: Math.PI / 2, pitch: 1.25, screen: 'black', env: '#BCC2C4', shadow: hp ? { alpha: 0.35 } : false });
    }
    tr.over(c);
  }

  // ------------------------------------------------------------------ 59–70: L023; the breath drawn to say more (66.6), swallowed (68.5)
  function twoAfter(c, st, lt) {
    const tt = twos(lt);
    const drawn = tt >= 66.5 && tt < 68.5, sw = tt >= 68.5;
    two(c, lt, { after: true,
      face: { yaw: 0.5, pitch: drawn ? -0.04 : sw ? 0.1 : 0.06, lids: key(tt, [[59, 0.66], [62.5, 0.58], [64.5, 0.66], [68.6, 0.5]]), gaze: [key(tt, [[59, 0.4], [62.6, 0.15], [64.4, 0.4], [68.6, 0.25]]), key(tt, [[59, 0.08], [62.6, 0.35], [64.4, 0.08], [68.6, 0.4]])], mouth: drawn ? 1 : m('L023', 59.5, lt), brows: drawn ? 0.25 : 0 },
      himFace: { pitch: key(tt, [[59, 0.4], [63.4, 0.4], [64.0, 0.3], [66.4, 0.3], [67.0, 0.42]]) } });
  }

  // ------------------------------------------------------------------ 70–75: the door. She leaves; it closes softly behind her
  function door(c, st, lt) {
    const V = LV().door; const tt = twos(lt); const A = V.anchors;
    const open = lt < 72.3 ? 0.85 : lerp(0.85, 0, E.inOutSine(seg(lt, 72.3, 73.5)));
    const s0 = { tod: 'day', door: open };
    V.back(c, lt, s0);
    const x = lerp(1140, 610, seg(tt, 70.3, 72.4));
    if (tt < 72.4) {
      const g = c.g; g.save(); g.beginPath(); g.rect(A.doorJamb[0] + 2, 150, A.doorHinge[0] - A.doorJamb[0], 960); g.clip();
      RIG.draw(c, 'her', 'walk', { x, y: A.herDoorway[1], s: 0.23 * A.herDoorway[2], light: setLight(V.shots.inside.lights.day), t: lt, phase: (tt - 70.3) * 0.95, flip: true, carry: 'bag', face: { yaw: 1.05, pitch: 0.18, lids: 0.6 } });
      g.restore();
    }
    V.front(c, lt, s0);
  }

  // ------------------------------------------------------------------ 75–82.5: the room by day. He stays where he is
  // He listens to her go down the stairs (his head turns toward the door), the street door (81.5), then he looks down at the phone
  function roomAlone(c, st, lt) {
    const V = LV().room; const tt = twos(lt);
    V.back(c, lt, DAY); V.front(c, lt, DAY);
    const L = setLight(V.shots.wide.lights.day);
    const a = V.anchors.himBetween, s = 0.23 * a[2];
    const turn = key(tt, [[75.6, 0], [76.6, 1], [81.2, 1], [81.9, 0]]), down = E.inOutSine(seg(tt, 81.7, 82.3));
    const f = RIG.draw(c, 'him', 'stand', { x: a[0], y: a[1], s, light: L, t: lt, tau: 0.3,
      armL: { a1: -0.06, a2: 0.1, hand: 'relax' }, armR: { E: [0.7, 2.32], W: [0.3, 2.95], hand: 'thumb', hp: { reach: 0.1, flip: true, over: 'thumb' }, front: true },
      face: { yaw: lerp(0.15, 0.62, turn), pitch: lerp(lerp(0.36, 0.2, turn), 0.55, down), lids: lerp(lerp(0.34, 0.5, turn), 0.3, down), gaze: [lerp(0, 0.3, turn), lerp(lerp(0.4, 0.2, turn), 0.6, down)] } });
    const hr = f.hands.R; if (hr) { const ph = hr.phone || { x: hr.grip[0], y: hr.grip[1], h: 0.7 * s, angle: 0 }; PHONE.draw(c, { x: ph.x, y: ph.y, h: ph.h, roll: ph.angle, pitch: 0.7, screen: 'black', env: '#BCC2C4' }); f.over(c); }
  }

  FILM.seq({
    id: 'Q10', title: "You didn't forget", dur: 82.5,
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
      S.bed('room_day', 51.5, 82.5, { level: -52, what: 'the room after: 6 dB under' });
      S.cue('trade', 55.0, { dur: 3, what: 'cloth, the bag changing hands, the broken zip ticking once' });
      S.cue('breath_in', 66.6, { what: 'hers: a breath drawn to say something more, then held, then let go unspoken (68.5)' });
      S.cue('door_close_soft', 73.5, { what: 'the front door pulled shut softly from the landing' });
      S.bed('footsteps_stairs', 75, 81, { level: -40, fo: 1, what: 'her steps going down the stairwell, receding' });
      S.cue('street_door', 81.5, { level: -50, what: 'far below: the street door. Then nothing (it carries on into Q11\'s silence)' });
    },
    shots: [
      { at: 0, name: 'between: L017; the phone held up to him', draw: twoOpen, post: { vig: 0.45, halation: 0.4 } },
      { at: 4.6, name: 'her: "I\'m the background of your phone"', draw: herBackground, post: { vig: 0.5 } },
      { at: 8.4, name: 'him: "and we aren\'t together"; "I know. I forgot to change it."', draw: onHim, post: { vig: 0.5 } },
      { at: 15, name: 'her: "You didn\'t forget."', draw: herForget, post: { vig: 0.5 } },
      { at: 18, name: 'over her shoulder: the strip, the picture, and her', draw: overShoulder, post: { vig: 0.5, halation: 0.45 } },
      { at: 21, name: 'her: the hand at her nape; "Is it Photoshop?"', draw: nape, post: { vig: 0.5 } },
      { at: 26.5, name: 'him: he looks at the floor', draw: floor, post: { vig: 0.5 } },
      { at: 29.3, name: 'her: "Have you been using AI to make pictures of me?"', draw: herAI, post: { vig: 0.5 } },
      { at: 35.6, name: 'him: "I just missed you, is all."', draw: missed, post: { vig: 0.5 } },
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
