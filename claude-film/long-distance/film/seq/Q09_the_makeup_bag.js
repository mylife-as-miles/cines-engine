/* LONG DISTANCE · Q09 THE MAKEUP BAG (58 s) · S11, S12 (A044–A051), L012–L016
   The wardrobe is C's grammar exactly: his clothes on the left, bare hangers on the right. He lifts down her old bag and leaves a
   clean rectangle in the dust. Then the phone does the one thing he cannot stop: it buzzes. The lock screen is the first time the
   audience sees the waterfall with something else on top of it: "Call me tonight?". She turns the screen to him.
   Shots: 0 wardrobe (his hands open it) · 6 shelf (the bag lifted, the rectangle) · 12.5 wardrobe close (the buzz; rigid, eyes shut)
   · 17 room by day (he comes out fast; she stands over the couch) · 22 INSERT the lock screen · 27 room (L012–L015; she reaches for
   it) · 38.5 between, B3 (she turns the screen to him; L016) · 50.5 hands (his thumb worries the broken zip). */
(function () {
  'use strict';
  const { W, H } = OTM; const seg = FILM.seg, key = FILM.key, twos = FILM.twos, E = FILM.ease, clamp = FILM.clamp, lerp = FILM.lerp;
  const LV = () => SETS.living.views, BV = () => SETS.bedroom.views;
  const MSG = () => PHONE.MSG;
  const CALL = () => ({ banner: { text: PHONE.MSG.callMeTonight, in: 1 } });
  // the visit's light, from the window on the right wall, read by the sculptures and the paper (one light per shot)
  function setLight(L, o) {
    o = o || {};
    const from = o.from || [L.dir[0] > 0 ? 0.82 : -0.82, -0.55];
    return RIG.light('day', Object.assign({ keys: [{ dir: L.dir, col: L.color, k: L.k * (o.keyK || 1), poster: L.poster, levels: L.levels }], amb: L.amb, paper: { from } }, o.rig || {}));
  }
  const ROOM = { tod: 'day' };
  // a push that keeps the screen point (px, py) still while the frame closes in on it
  const push = (c, px, py, z) => c.camera({ x: px + (W / 2 - px) / z, y: py + (H / 2 - py) / z, zoom: z });
  // where people stand (world metres) and where that lands in each camera
  const W_HER = [3.5, 1.56, 3.0];          // standing over the couch, by its left cushion (room view)

  // ------------------------------------------------------------------ the POV hands at the wardrobe doors (shot 1)
  // a sweater sleeve, cut once: drawn along the forearm from the wrist off the bottom of the frame
  function sleeve(c) {
    return c.cache('Q09|sleeve', (g) => {
      const S = OTM.S; const sh = GG.blob([[40, 18], [120, 0], [214, 14], [236, 140], [250, 700], [20, 700], [14, 140]]);
      const p = GG.piece(g, sh, { fill: '#4A4541', rough: 1.4, seed: 931, tex: 0.75, kind: 'wool', lift: [6, 10], liftAlpha: 0.5, liftBlur: 10 });
      GG.crescent(g, p, -12, -6, '#7A746C', 0.9); GG.crescent(g, p, 14, 4, '#2C2826', 0.8);
      const cf = GG.blob([[34, 14], [124, -2], [218, 12], [226, 70], [126, 62], [26, 74]]);
      const cp = GG.piece(g, cf, { fill: '#524D48', rough: 1.1, seed: 932, tex: 0.75, kind: 'wool', lift: [3, 5], liftAlpha: 0.5 }); GG.crescent(g, cp, -6, -6, '#8E877E', 0.9);
      g.save(); g.clip(cp); g.strokeStyle = 'rgba(30,26,24,0.35)'; g.lineWidth = 3; for (let k = 0; k < 14; k++) { g.beginPath(); g.moveTo(40 + k * 13, 0); g.lineTo(38 + k * 13, 80); g.stroke(); } g.restore();
    }, 260, 720);
  }
  // draw the sleeve so its cuff sits at the wrist, running toward `to` (a point off the frame)
  function drawSleeve(c, wrist, to, scale, flip) {
    const cv = sleeve(c), g = c.g; const a = Math.atan2(to[1] - wrist[1], to[0] - wrist[0]) - Math.PI / 2;
    g.save(); g.translate(wrist[0], wrist[1]); g.rotate(a); if (flip) g.scale(-1, 1); g.scale(scale, scale); g.drawImage(cv, -125, -30); g.restore();
  }
  // a door knob's screen point as the doors open (the wardrobe's own geometry, bedroom.js)
  function knob(which, a) {
    const cam = BV().wardrobe.cam, ang = a * 1.83, hz = which === 'left' ? 1.2 : 0, dirz = which === 'left' ? -1 : 1;
    const x = -1.80 + 0.9 * 0.6 * Math.sin(ang), z = hz + dirz * 0.9 * 0.6 * Math.cos(ang); const q = cam.p(x, 1.02, z); return [q[0], q[1], q[2], cam.k(x, 1.02, z)];
  }
  function wardrobeOpen(c, st, lt) {
    const V = BV().wardrobe; const tt = twos(lt);
    // his hands are on the two knobs from the first frame; he pulls (0.45), the doors come with his hands to about half open (1.25),
    // he lets go and they swing on and settle; the bare hangers knock together
    const doors = E.inOutSine(seg(lt, 0.45, 2.05));
    const swing = lt < 1.4 ? 0 : 0.9 * Math.exp(-(lt - 1.4) * 0.9);
    V.back(c, lt, { doors, swing, bag: true });
    const L = RIG.light('day'), cam = V.cam;
    const rel = 1.25, drop = E.inQuad(seg(tt, rel, rel + 0.45));
    if (drop >= 1) return;
    const held = E.inOutSine(seg(Math.min(tt, rel), 0.45, 2.05));
    [['left', -1], ['right', 1]].forEach(([wh, sg]) => {
      const kn = knob(wh, held), k = kn[3];
      const sc = Math.round(k / 732 * 4) / 4;                 // the hand grows as the knob comes toward us (in quarter steps: few sculpts)
      const wr = [kn[0] - sg * 38 * sc + sg * 160 * drop, kn[1] + 62 * sc + 560 * drop];
      drawSleeve(c, [wr[0] + sg * 18 * sc, wr[1] + 34 * sc], [wr[0] + sg * 700, wr[1] + 1250], 0.66 * sc, sg < 0);
      RIG.hand(c, 'him', 'door', { x: wr[0], y: wr[1], s: 150 * sc, light: L, fore: [sg * 0.55, 1], foreLen: 0.35, flip: sg > 0, tight: 0.4 });
    });
  }

  // ------------------------------------------------------------------ the shelf: his hand lifts the bag; the clean rectangle (shot 2)
  function shelfShot(c, st, lt) {
    const V = BV().shelf, A = V.anchors; const tt = twos(lt);
    const lifted = tt >= 8.08;
    // a very slow push toward where it sat
    const z = 1 + 0.035 * E.inOutSine(seg(lt, 6, 12.5));
    push(c, 1423, 760, z);
    V.back(c, lt, { bag: !lifted, doors: 1 });
    const L = RIG.light('day');
    // the hand: in from the lower right (7.0–8.0), closes on the bag's top (8.0), lifts it up and out (8.1–9.3)
    const inK = E.inOutSine(seg(tt, 7.0, 8.0)), up = E.inOutSine(seg(tt, 8.1, 9.4));
    if (tt < 7.0 || up >= 1) return;
    const bag = A.bag; const grip = [bag[0] + 30, bag[1] - 70];
    const start = [1700, 1250];
    let wr = [lerp(start[0], grip[0] + 70, inK), lerp(start[1], grip[1] + 120, inK)];
    const lift = [lerp(0, 380, up), lerp(0, -260, up) + lerp(0, 900, up * up)];
    wr = [wr[0] + lift[0], wr[1] + lift[1]];
    const fore = [1, 1.25];
    if (lifted) SETS.bedroom.bag(c, bag[0] + lift[0], bag[1] + lift[1] - 6 * Math.sin(up * 3), 1614, -0.12 * up);
    drawSleeve(c, [wr[0] + 40, wr[1] + 60], [wr[0] + 900, wr[1] + 1200], 1.25, false);
    RIG.hand(c, 'him', 'take', { x: wr[0], y: wr[1], s: 300, light: L, fore, foreLen: 0.45, close: tt < 8.0 ? 0.3 : 0.85 });
  }

  // ------------------------------------------------------------------ the wardrobe, close: the buzz through the wall (shot 3)
  function wardrobeClose(c, st, lt) {
    const V = BV().wardrobe, A = V.anchors; const tt = twos(lt);
    push(c, 700, 500, 1.42 + 0.03 * E.inOutSine(seg(lt, 12, 17)));
    V.back(c, lt, { doors: 1, bag: false, res: 2, swing: 0 });
    const L = RIG.light('day');
    // before the buzz: eyes on the bag in his hands, thumb on the zip. The buzz (12.5): the head comes up, then he shuts his eyes
    const up = E.outCubic(seg(tt, 12.62, 12.95)), shut = E.inOutSine(seg(tt, 14.0, 14.7));
    const face = { yaw: lerp(0.3, 0.16, up), pitch: lerp(0.4, 0.06, up), lids: lerp(lerp(0.34, 0.86, up), 0, shut), gaze: [lerp(0, 0.2, up), lerp(0.6, 0.05, up)], brows: lerp(0, 0.25, up) };
    const jolt = tt >= 12.58 && tt < 12.75 ? -3 : 0;
    RIG.draw(c, 'him', 'bag', { x: 640, y: A.head[1] + 6 + jolt, s: 0.23 * A.head[2], light: L, t: lt, crop: 4.2, tau: 0.32, zip: tt < 12.6 ? tt * 0.75 : 12.6 * 0.75, breath: tt < 12.6 ? undefined : 0, blink: false, face });
  }

  // ------------------------------------------------------------------ the room by day (shots 4 and 6)
  function phoneOnCushion(c, V) {
    const a = V.anchors.phoneCushion;
    const P = { x: a[0] + 2, y: a[1] - 3, h: 0.15 * a[2] * 0.98, pitch: 1.32, spin: 0.35, screen: 'lock', state: CALL(), env: '#B8BEC0', sheen: 0.08 };
    const info = PHONE.where(P, c);
    PHONE.glow(c, { info, k: 0.5, sy: 0.32, r: a[2] * 0.42 });
    PHONE.draw(c, P);
    return info;
  }
  // her, standing over the couch (her body turned toward it, her head down to the phone); `look` 0..1 turns her head to him
  function herOverCouch(c, V, lt, o) {
    o = o || {}; const tt = twos(lt); const p = V.project(W_HER); const L = o.light;
    const look = o.look || 0, reach = o.reach || 0;
    const face = { yaw: lerp(0.62, -0.42, look), pitch: lerp(0.5, 0.1, look), lids: lerp(0.5, 0.72, look), gaze: [lerp(0.2, -0.35, look), lerp(0.55, 0.05, look)], mouth: o.mouth || 0 };
    const armR = reach > 0 ? { to: [lerp(0.95, 1.55, reach), lerp(2.9, 3.3, reach)], bend: -1, hand: 'take', hp: { close: 0.2, flip: true }, front: true } : { a1: -0.05, a2: 0.1, hand: 'relax' };
    return RIG.draw(c, 'her', 'stand', { x: p[0], y: p[1] + reach * 4, s: 0.23 * p[2], light: L, t: lt, tau: 0.5 + 0.1 * reach, armR, armL: { to: [-0.15, 2.5], bend: 1, hand: 'strap', front: true }, face });
  }
  // him, in his half in front of the counter, the bag held low; or walking in fast from the bedroom (frame left)
  function himRoom(c, V, lt, o) {
    o = o || {}; const tt = twos(lt); const a = V.anchors.himBetween, L = o.light, s = 0.23 * a[2];
    if (o.walk != null) {
      return RIG.draw(c, 'him', 'walk', { x: o.walk, y: a[1], s, light: L, t: lt, phase: o.phase, carry: 'bag', face: { yaw: 1.05, pitch: 0.12, lids: 0.75 } });
    }
    return RIG.draw(c, 'him', 'bag', { x: a[0], y: a[1], s, light: L, t: lt, tau: o.tau == null ? 0.42 : o.tau, zip: o.zip || 0, face: o.face });
  }
  function roomBack(c, lt) { const V = LV().room; V.back(c, lt, ROOM); V.front(c, lt, ROOM); return V; }
  function roomArrive(c, st, lt) {
    const V = roomBack(c, lt); const L = setLight(V.shots.wide.lights.day); const tt = twos(lt);
    phoneOnCushion(c, V);
    herOverCouch(c, V, lt, { light: L });
    // he comes out of the bedroom fast (17.2) and stops short (18.9): too late
    const a = V.anchors.himBetween;
    if (tt < 18.92) {
      const u = seg(tt, 17.25, 18.92); const x = lerp(-150, a[0] - 20, u);
      if (tt >= 17.25) himRoom(c, V, lt, { light: L, walk: x, phase: 0.5 + (tt - 17.25) * 1.5 });
    } else {
      const tau = tt < 19.05 ? 0.95 : tt < 19.2 ? 0.66 : 0.42;
      himRoom(c, V, lt, { light: L, tau, face: { yaw: 0.55, pitch: 0.16, lids: 0.8, gaze: [0.35, 0.1] } });
    }
  }
  function roomTalk(c, st, lt) {
    const V = roomBack(c, lt); const L = setLight(V.shots.wide.lights.day); const tt = twos(lt);
    const mH = RIG.mouthFor('L012', lt - 27.2) || RIG.mouthFor('L014', lt - 31.5);
    const mS = RIG.mouthFor('L013', lt - 29.4) || RIG.mouthFor('L015', lt - 36.0);
    phoneOnCushion(c, V);
    // she looks up at him on his line (28.3), and back down to the phone as she says she is not talking about the text (36.9)
    const look = key(tt, [[28.3, 0], [28.9, 1, 'outCubic'], [36.7, 1], [37.3, 0.25]]);
    const reach = E.inOutSine(seg(tt, 37.6, 38.4));
    herOverCouch(c, V, lt, { light: L, look, mouth: mS, reach });
    // him: on "Don't look at my phone" he looks at her; on "It's just a friend from work" his eyes go to the bag
    const away = key(tt, [[31.3, 0], [31.9, 1], [35.6, 1], [36.2, 0.4]]);
    himRoom(c, V, lt, { light: L, tau: 0.42, zip: tt > 32 ? (tt - 32) * 0.75 : 0, face: { yaw: lerp(0.55, 0.3, away), pitch: lerp(0.16, 0.42, away), lids: lerp(0.8, 0.42, away), gaze: [lerp(0.35, 0.1, away), lerp(0.1, 0.55, away)], mouth: mH, brows: lerp(0.15, 0, away) } });
  }

  // ------------------------------------------------------------------ INSERT: the lock screen on the cushion (shot 5)
  function cushionPlate(c) {
    return c.cache('Q09|cushion', (g) => {
      const S = OTM.S; g.fillStyle = '#5E5A53'; g.fillRect(0, 0, W, H);
      // two seat cushions meeting on a soft seam, seen from above, a little out of focus; the window's light on the right one
      const a = GG.blob([[-80, -80], [1180, -80], [1060, 400], [1000, 760], [1040, 1180], [-80, 1180]]);
      const pa = GG.piece(g, a, { fill: '#6B665E', rough: 2.2, seed: 941, tex: 0.7, kind: 'cloth', lift: [10, 12], liftAlpha: 0.55, liftBlur: 22 });
      GG.crescent(g, pa, 18, 10, '#4E4A44', 0.7);
      const b = GG.blob([[1230, -80], [2000, -80], [2000, 1180], [1110, 1180], [1080, 780], [1130, 380]]);
      const pb = GG.piece(g, b, { fill: '#716C64', rough: 2.2, seed: 942, tex: 0.7, kind: 'cloth', lift: [-8, 10], liftAlpha: 0.55, liftBlur: 22 });
      GG.crescent(g, pb, -18, -6, '#8E897F', 0.85);
      // the window's slant, cut in two bands
      g.save(); g.clip(pb); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(200,204,196,0.16)'; g.fill(S().poly([[1500, -100], [2100, -100], [2100, 1200], [1220, 1200]]).path(3, 943)); g.fillStyle = 'rgba(200,204,196,0.12)'; g.fill(S().poly([[1700, -100], [2100, -100], [2100, 1200], [1500, 1200]]).path(3, 944)); g.restore();
      // the dent the phone has pressed, and the weave's slack
      g.save(); g.filter = 'blur(28px)'; g.fillStyle = 'rgba(24,22,20,0.32)'; g.beginPath(); g.ellipse(960, 560, 380, 470, -0.1, 0, 7); g.fill(); g.restore();
      [[[200, 300], [420, 360], [600, 330]], [[260, 900], [480, 860], [700, 920]], [[1400, 200], [1600, 260], [1820, 230]], [[1380, 860], [1600, 820], [1840, 880]]].forEach(cv => { g.save(); g.lineCap = 'round'; g.filter = 'blur(3px)'; g.strokeStyle = 'rgba(40,36,32,0.45)'; g.lineWidth = 8; g.stroke(GG.spline(cv, false)); g.restore(); });
      // soften the whole plate: the lens is on the glass
      const tmp = OTM.makeCanvas(W, H), tg = tmp.getContext('2d'); tg.filter = 'blur(6px)'; tg.drawImage(g.canvas, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(tmp, 0, 0);
    });
  }
  function lockInsert(c, st, lt) {
    const z = 1 + 0.07 * E.inOutSine(seg(lt, 22, 27));
    c.camera({ x: 960, y: 520, zoom: z });
    c.g.drawImage(cushionPlate(c), -20, -20, W + 40, H + 40);
    const P = { x: 960, y: 540, h: 880, roll: -0.07, pitch: 0.12, persp: 2600, screen: 'lock', state: CALL(), env: '#C0C4C2', sheen: 0.06, shadow: { dx: 26, dy: 34, blur: 46, alpha: 0.55 } };
    const info = PHONE.where(P, c);
    PHONE.glow(c, { info, k: 0.55, r: 1300 });
    PHONE.draw(c, P);
  }

  // ------------------------------------------------------------------ between (B3): she turns the screen to him (shot 7)
  function between(c, st, lt) {
    const V = LV().between; const A = V.anchors; const tt = twos(lt);
    V.back(c, lt, { tod: 'day' });
    const Ls = V.shots.two.lights.day;
    // her: the phone comes up from her side and turns to him (38.5–39.9), then holds there between them
    const hold = key(tt, [[38.5, 0.85], [39.9, 0, 'inOutSine']]);
    const her0 = A.herBetween, s = 0.23 * her0[2];
    const mS = RIG.mouthFor('L016', lt - 43.5);
    // where the phone will be (for her face's light): measured from her figure once it is drawn; first pass uses the anchor
    const L = setLight(Ls, { rig: { phone: [A.phoneHeld[0] + 120, A.phoneHeld[1] - 20], phoneCol: '#C8EEF2', phoneK: 0.45 } });
    const her = RIG.draw(c, 'her', 'phone', { x: her0[0] + 20, y: her0[1], s, light: L, t: lt, flip: true, hold, tau: 0.42,
      face: { yaw: lerp(0.5, 0.6, hold), pitch: lerp(0.08, 0.36, hold), lids: lerp(0.68, 0.5, hold), gaze: [lerp(0.42, 0.1, hold), lerp(0.08, 0.5, hold)], mouth: mS } });
    // him: over his shoulder, bowed to the bag, his thumb on the broken zip; he looks at neither of them
    const h0 = A.himBetween;
    RIG.draw(c, 'him', 'bag', { x: h0[0] + 10, y: h0[1] + 10, s: 0.23 * h0[2], light: setLight(Ls), t: lt, view: 'back', zip: tt * 0.6, crop: 4.6 });
    // the phone in her hand (gloss), its screen to him; its cool light on her chin and coat
    if (her.phone) {
      const ph = her.phone; const P = { x: ph.x, y: ph.y, h: ph.h * 1.02, roll: ph.angle, yaw: lerp(-0.42, -2.6, hold * hold), screen: 'lock', state: CALL(), env: '#B8BEC0', sheen: 0.07 };
      const info = PHONE.where(P, c);
      PHONE.glow(c, { info, k: 0.42, r: ph.h * 2.6 });
      PHONE.draw(c, P); her.over(c);
    }
  }

  // ------------------------------------------------------------------ hands: his thumb worries the broken zip (shot 8)
  // his front at hand height, without the head (the insert sees only his hands): the 'bag' pose, rebuilt from rig.js, head off
  function bagHands(p) {
    const z = p.zip || 0, bagC = [0.3, 2.86];
    const hold = { type: 'paper', key: 'bagprop', box: [bagC[0] - 0.6, bagC[1] - 0.45, bagC[0] + 0.6, bagC[1] + 0.45], breath: 0.6, draw(pen) { RIG.bagShape(pen, bagC, 0.74); } };
    const thumbAt = [bagC[0] + 0.38, bagC[1] - 0.02];
    const thumb = { type: 'hand', name: 'thumb', pose: 'bag', p: { zip: z, only: 'thumb', flip: true, shadow: { alpha: 0.3 } }, at: thumbAt, fore: [1, 0.35], breath: 0.6 };
    return RIG.person({ who: 'him', costume: 'sweater', tau: 0.45, lean: 0.06, shrug: 0.25, head: false,
      arms: { L: { E: [-0.7, 2.42], W: [bagC[0] - 0.36, bagC[1] + 0.14], hand: 'offer', hp: { close: 0.45 }, front: true, order: 1 }, R: { E: [0.84, 2.38], W: thumbAt, hand: 'bag', hp: { zip: z, flip: true }, front: true, order: 2, prop: { after: hold } } },
      legs: false, crop: 3.7, extra: { end: [thumb] } });
  }
  function hands(c, st, lt) {
    const V = LV().hands; const tt = twos(lt);
    push(c, 700, 720, 1 + 0.05 * E.inOutSine(seg(lt, 50.5, 58)));
    V.back(c, lt, { tod: 'day' });
    const L = setLight(V.shots.insert.lights.day);
    // her phone is just above the frame, held up between them: only its cool light reaches down into the empty half
    PHONE.glow(c, { x: 1180, y: -60, r: 900, tone: 'water', k: 0.5 });
    const s = 430, bag = [700, 720];
    const zip = 0.2 + Math.max(0, tt - 50.9) * 0.62;
    RIG.drawFigure(c, { who: 'him', x: bag[0] - 0.3 * s, y: bag[1] - 2.86 * s, s, light: L, breath: RIG.breath(lt, 3), ops: bagHands({ zip }).ops });
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
      { at: 27, name: 'room: L012-L015; she reaches for the phone', draw: roomTalk, post: { vig: 0.45 } },
      { at: 38.5, name: 'between (B3): she turns the screen to him; L016', draw: between, post: { vig: 0.45, halation: 0.4 } },
      { at: 50.5, name: 'hands: his thumb worries the broken zip', draw: hands, post: { vig: 0.5 } },
    ],
  });
})();
