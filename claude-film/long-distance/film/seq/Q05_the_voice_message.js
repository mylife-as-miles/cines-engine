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
  function voiceState(lt) {
    if (lt < PLAY1) return { progress: 0, playing: false, dur: MSG_DUR, clock: 'bus' };
    if (lt < END1) return { progress: (lt - PLAY1) / MSG_DUR, playing: true, dur: MSG_DUR, clock: 'bus' };
    if (lt < PLAY2) return { progress: 1, playing: false, dur: MSG_DUR, clock: 'bus' };
    return { progress: clamp((lt - PLAY2) / MSG_DUR, 0, 1), playing: true, dur: MSG_DUR, clock: 'bus' };
  }
  const earsAt = lt => lt < 15 ? 0 : tk(lt, [[15.0, 0], [18.0, 1, 'inOutSine']]);

  // the shirt's yoke below the collar, seen from behind: it covers the neck where it goes into the shirt (cut paper, the shirt's
  // colour), so from above and behind his neck meets the collar, not a gap of skin
  const YOKE = { type: 'paper', key: 'q345yoke', box: [-0.7, 0.4, 0.7, 1.3], breath: 1, draw(pen) {
    const col = RIG.COSTUME.shirt.body; const sh = pen.blob([[-0.34, 0.66], [-0.12, 0.6], [0.12, 0.6], [0.34, 0.66], [0.5, 1.1], [0, 1.18], [-0.5, 1.1]]);
    const p = pen.piece(sh, pen.col(col), { seed: 431, kind: 'cloth', tex: 0.55, lift: false }); pen.bands(p, col, { seed: 401 }); } };
  // ---------------------------------------------------------------- him from behind (interior): the shirt, the rail, an earbud
  const PI2 = Math.PI * 2;
  function himBack(c, o) {
    const up = o.up == null ? 0.12 : o.up;
    const buds = { type: 'live', draw(cc, toW, s, out) { const hd = out.heads.head; if (!hd) return; const g = cc.g;
      [hd.earL, hd.earR].forEach((e, i) => { const nx = hd.M ? hd.M[2][0] : 0; const vis = i === 0 ? nx < 0.35 : nx > -0.35; if (!vis || !e) return;
        g.fillStyle = '#A9A49A'; g.beginPath(); g.ellipse(e[0], e[1] + s * 0.03, s * 0.03, s * 0.026, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(20,20,28,0.35)'; g.beginPath(); g.ellipse(e[0] + s * 0.006, e[1] + s * 0.042, s * 0.024, s * 0.01, 0, 0, 7); g.fill(); }); } };
    const P = RIG.person({ who: 'him', costume: 'shirt', back: true, tau: o.tau, lean: o.lean || 0, tilt: o.tilt || 0, head: false,
      arms: { L: o.armL || null, R: o.armR || null }, legs: o.legs === undefined ? { stance: 0.14 } : o.legs, crop: o.crop,
      extra: { afterTorso: [{ type: 'head', p: Object.assign({ neck: 0.42 }, o.head), at: [o.headDx || 0, up], breath: 1 }, YOKE], afterHead: [buds] } });
    const breath = o.t != null ? RIG.breath(o.t, 2.5 * Math.min(2, o.s / 250)) : 0;
    return RIG.drawFigure(c, { who: 'him', x: o.x + (o.dx || 0), y: o.y - up * o.s, s: o.s, light: o.light, breath, ops: P.ops });
  }

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
    if (last) { const z = lerp(1.18, 1.22, seg(lt, 26, 30, 'inOutSine')); c.camera({ x: 740, y: 430, zoom: z }); }
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
    himBack(c, { x: A.head.x, y: A.head.y, s: A.head.s, tau: 2.85, lean: -0.04 * lurch, tilt: 0.02 * lurch, dx: lurch * 9, light: L, t: lt, up: 0.1,
      head: { yaw: h.yaw, pitch: h.pitch, lids: 0.5, ears },
      armR: { to: [rail[0] - 0.05, rail[1] + 0.3], bend: 1, hand: 'rail', flipHand: true, hp: {} },
      armL: { to: [-0.15, 1.6], bend: -1, hand: false, front: true } });
    v.front(c, lt, {});
  }

  // ---------------------------------------------------------------- 2, 4 · the phone (6–15, 23–26)
  // looking down at his chest: the phone in his left hand, his thumb on the play button; behind it his shirt, the stranger's coat
  // pressed in at the left, and the passing streetlights crossing it all in one cut band of sodium every 3.4 s
  const BGM = 80;
  const PH = { x: 1000, y: 190, h: 1180, roll: 0.05, pitch: 0.08, yaw: 0.05 };
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
      const coat = GG.blob([[-120, -80], [260, -80], [360, 260], [330, 700], [250, 1180], [-120, 1180]]);
      const cp = GG.piece(g, coat, { fill: '#141A2A', rough: 1.4, seed: 23, tex: 0.55, kind: 'wool', lift: [14, 6], liftAlpha: 0.6, liftBlur: 20 });
      GG.crescent(g, cp, 6, 0, '#9A6A44', 0.75);
      g.save(); g.strokeStyle = 'rgba(8,10,18,0.6)'; g.lineWidth = 6; g.beginPath(); g.moveTo(120, 380); g.quadraticCurveTo(230, 520, 200, 760); g.stroke(); g.restore();
    }, W + 2 * BGM, H + 2 * BGM);
    c.g.drawImage(cv, -BGM, -BGM);
  }
  // the passing streetlight: one cut band of sodium crossing the frame every 3.4 s (the set's period), never more than one change a second
  function sodium(c, lt) {
    const T = 3.4, ph = ((lt + 1.1) / T) % 1, x = W + 500 - ph * (W + 1000), g = c.g, sk = 300;
    const band = (half, a, seed) => { g.globalAlpha = a; g.fillStyle = '#E09048'; g.fill(OTM.S().poly([[x - half + sk, -80], [x + half + sk, -80], [x + half - sk, H + 80], [x - half - sk, H + 80]]).path(3, seed)); };
    g.save(); g.globalCompositeOperation = 'soft-light'; band(330, 0.4, 150); band(150, 0.45, 151); g.restore();
    return clamp(1 - Math.abs(x - PH.x) / 600, 0, 1);
  }
  let _scr = null; const SCR = () => _scr || (_scr = OTM.makeCanvas(8, 8).getContext('2d'));
  function handOnPhone(c, info, L, tgt, tap, H) {
    // the reaches are compared on small probe sculptures (positions scale with s), so only the chosen one is sculpted full size
    const gp = info.at(H.u, H.v); const k = 4; let best = null;
    for (let i = 0; i <= 4; i++) {
      const reach = i / 4, base = { s: H.s, rot: H.rot, flip: !!H.flip, reach, tap: 0, light: L, foreLen: H.foreLen };
      const pr = RIG.hand(c, 'him', 'thumb', Object.assign({}, base, { s: H.s / k, x: 0, y: 0, target: SCR() }));
      const x = gp[0] - pr.grip[0] * k, y = gp[1] - pr.grip[1] * k; const d = Math.hypot(pr.thumb[0] * k + x - tgt[0], pr.thumb[1] * k + y - tgt[1]);
      if (!best || d < best.d) best = { d, p: Object.assign(base, { x, y, tap }) };
    }
    return best.p;
  }

  function shotPhone(c, st, lt) {
    // a slow push toward the waveform while it plays (0.3 % a second, eased in and out); the second insert holds
    const z = lt < 15 ? lerp(1, 1.025, seg(lt, 6, 15, 'inOutSine')) : 1.025;
    c.camera({ x: W / 2 - 60 * (z - 1) / 0.025, y: H / 2 + 40 * (z - 1) / 0.025, zoom: z });
    phoneBg(c);
    const P = Object.assign({}, PH, { screen: 'voice', state: voiceState(lt), t: lt, env: '#8090C0' });
    const info = PHONE.where(P, c);
    PHONE.glow(c, { info, x: PH.x - 40, y: PH.y + 420, r: 1100, k: 0.6, tone: 'night' });
    const band = sodium(c, lt);
    // the thumb: hovering, then onto the play button (a press at 7.0 and again at 25.0), resting by it while it plays
    const press = t0 => tk(lt, [[t0 - 0.55, 0.0], [t0 - 0.2, 0.7], [t0, 0.0, 'inQuad'], [t0 + 0.35, 0.45]]);
    const tap = lt < 16 ? press(PLAY1) : press(PLAY2);
    const play = info.targets.play || info.pt(37, 640);
    const tgt = [play[0] + (lt < PLAY1 - 0.6 ? 60 : 0), play[1] + (lt < PLAY1 - 0.6 ? 70 : 0)];
    const L = RIG.light('bus', { keys: [{ dir: [0.3, -0.7, 0.6], col: '#7E90BE', k: 0.42, poster: [0.3], levels: [1] }],
      amb: '#2E3550', phone: [PH.x, PH.y + 300], phoneK: 1.1, phoneZ: 0.6 });
    void band;
    const hp = handOnPhone(c, info, L, tgt, Math.round(tap * 4) / 4, { u: 0.6, v: 0.9, s: 980, rot: -0.1, flip: true });
    const mask = m => RIG.hand(c, 'him', 'thumb', Object.assign({}, hp, { target: m, shadow: false, only: 'thumb' }));
    PHONE.draw(c, Object.assign({ mask, maskShadow: { alpha: 0.4 } }, P));
    RIG.hand(c, 'him', 'thumb', hp);
  }

  // ---------------------------------------------------------------- 3 · close (15–23): his ears; the stranger; the floor
  function closeFace(lt) {
    const ph = { yaw: 0.3, pitch: 0.5, lids: 0.45, gaze: [0.1, 0.6] };
    const str = { yaw: 0.62, pitch: 0.3, lids: 0.62, gaze: [0.6, 0.15] };
    const flr = { yaw: 0.12, pitch: 0.52, lids: 0.28, gaze: [0, 0.7] };
    return tk(lt, [[15, ph], [19.4, ph], [19.7, str, 'outCubic'], [20.6, str], [21.0, flr, 'inOutSine']]);
  }
  function shotClose(c, st, lt) {
    const v = BUS().views.close, A = v.anchors;
    const tt = twos(lt);
    v.back(c, lt, {});
    // his face keeps the shot's own light (the passing sodium band still crosses him as the set's overlay), so the red of his
    // ears reads against his skin rather than against the orange of a streetlight
    const L = RIG.light('bus', { keys: v.light.keys, amb: v.light.amb, phone: [A.phone.x - 120, A.phone.y - 120], phoneK: 1.0 });
    void tt;
    const f = closeFace(lt);
    RIG.draw(c, 'him', 'bus', { x: A.head.x, y: A.head.y, s: A.head.s, light: L, t: lt, rail: [A.hands.rail.x, A.hands.rail.y], crop: 2.3,
      face: Object.assign({ ears: earsAt(lt), mouth: 0 }, f) });
    // the phone's light from below the frame, on his chin and collar (smooth)
    PHONE.glow(c, { x: A.phone.x - 160, y: 1130, r: 700, k: 0.45, tone: 'night', em: 0.1 });
    v.front(c, lt, {});
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
