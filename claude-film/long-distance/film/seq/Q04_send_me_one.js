/* LONG DISTANCE — Q04 · Send me one (42 s) · S05, A013–A018 · stairwell (wide, close, tight, shoulder), phone
   Raw grey card at its heaviest grain. He sits alone on the fire stair, his lunch unopened beside him in the empty half of the
   step. He types "Send me one." The chime comes at once. We never see a picture: we see what it does to him. The breath goes
   out; a cut band of red paper rises up his neck; over his shoulder the thread is a blur of skin-toned squares with no shape,
   and it keeps coming. Restraint is built in: the reply is never on screen; the grid is abstract and blurred by rule. */
(function () {
  'use strict';
  const { W, H } = OTM;
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const seg = FILM.seg, key = FILM.key, twos = FILM.twos;
  const SW = () => SETS.stairwell;
  const tk = (t, ks) => key(twos(t), ks);              // a character's key, on twos

  // the exchange (A014 verbatim; the reply is a hidden placeholder and is cut away from before it can arrive)
  const THREAD = () => ({ clock: 'lunch', history: 'morning', steps: [{ stamp: '12:47', at: 0 }, { him: PHONE.MSG.sendMeOne, type: [6.5, 9.5], at: 10.0 }, { at: 10.2, her: { image: 'hidden' } }] });
  const CUT_PHONE = 10.2;                               // the chime: we cut to him on it, before anything of the reply can rise
  const FLICKS = [26.4, 28.1, 29.9, 31.6, 33.5, 35.2, 37.0, 38.8, 40.5];   // he scrolls; it keeps coming (and on, in the last wide)

  // ---------------------------------------------------------------- him on the step (wide, close, tight)
  // the phone: held in both hands over his knees, screen to his face (its back to us). tilt 1 = held to his chest, screen in.
  function stepLight(v, ph, k, tone) { return RIG.light('stairwell', { keys: v.light.keys, amb: v.light.amb, phone: ph, phoneK: k, phoneCol: tone || '#FFCBB0' }); }
  // a mask of his hands (the fingers on the phone's back sit over its gloss): the same sculptures, drawn into the phone's mask
  function handsMask(c, fig, L) {
    return m => ['L', 'R'].forEach(sd => { const h = fig.hands[sd]; if (!h) return; const pose = sd === 'L' ? 'thumb' : 'relax';
      RIG.hand(c, 'him', pose, { x: h.x, y: h.y, s: h.s, rot: h.rot, flip: h.flip, reach: fig._reach, tap: 0, close: 0.8, light: L, target: m, shadow: false }); });
  }
  function drawHim(c, v, o) {
    const A = v.anchors; const s = A.head.s;
    const tilt = o.tilt || 0;
    // where the phone will be (from the pose), to light his face before he is drawn
    const ph = o.phoneAt || [A.phone.x, A.phone.y];
    const L = stepLight(v, ph, o.phoneK == null ? 1.1 : o.phoneK, o.tone);
    const fig = RIG.draw(c, 'him', 'step', { x: A.head.x + (o.dx || 0), y: A.head.y + (o.dy || 0), s, light: L, t: o.t, tilt, thumb: o.thumb == null ? 0.4 : o.thumb,
      breath: o.breath, blink: o.blink, crop: o.crop, face: o.face });
    fig._reach = o.thumb == null ? 0.4 : o.thumb; fig._L = L;
    return fig;
  }
  function drawPhoneBack(c, fig, o) {
    const p = fig.phone; if (!p) return null;
    const h = o.h || p.h;
    const P = { x: p.x + (o.dx || 0), y: p.y + (o.dy || 0), h, yaw: Math.PI + (o.yaw || 0.15), pitch: o.pitch == null ? -0.55 : o.pitch, roll: (o.roll || 0) + p.angle * 0.3,
      screen: 'thread', state: o.state || {}, lit: o.lit !== false, bright: o.bright == null ? 1 : o.bright, spill: o.spill == null ? 1 : o.spill, env: '#B8BAB8',
      mask: o.mask ? handsMask(c, fig, fig._L) : null };
    return PHONE.draw(c, P);
  }

  // ---------------------------------------------------------------- 1 · wide (0–6, 36–42)
  function shotWide(c, st, lt) {
    const v = SW().views.wide, A = v.anchors;
    v.back(c, lt, { lunch: 'unopened' });
    const late = lt > 30;
    const look = A.head.looks.phone;
    const face = late
      ? { yaw: look.yaw, pitch: 0.95, lids: 0.45, gaze: [0, 0.5], flush: 1 }
      : { yaw: look.yaw, pitch: tk(lt, [[0, 0.95], [2.4, 0.95], [2.9, 0.7], [3.9, 0.7], [4.4, 0.95]]), lids: 0.5, gaze: [0, 0.5] };
    const thumb = late ? 0.4 + 0.25 * flickPulse(lt) : (lt > 4.6 ? 0.3 + 0.3 * (Math.floor(twos(lt) * 6) % 2) : 0.4);
    const fig = drawHim(c, v, { t: lt, face, thumb, phoneK: late ? 0.9 : 0.9, tone: late ? '#FFC2A0' : null });
    v.front(c, lt, {});
    drawPhoneBack(c, fig, { state: { clock: 'lunch' }, pitch: -0.7 });
    if (late) PHONE.glow(c, { x: fig.phone.x, y: fig.phone.y - 10, r: 120, k: 0.35, tone: 'skin', em: 0.1 });
  }
  const flickPulse = lt => { let m = 0; for (const a of FLICKS) if (lt > a && lt < a + 0.35) m = 1; return m; };

  // ---------------------------------------------------------------- 2 · the phone: "Send me one." (6.0–10.2)
  // looking down over his hands: the phone big, his right thumb on the glass; beyond it the concrete tread below his feet, his knees
  const IN = { x: 1010, y: 548, h: 940, roll: -0.05, pitch: 0.12, yaw: -0.05 };
  function insertBg(c) {
    const cv = c.cache('Q04|insert|bg', g => {
      g.fillStyle = '#4A4A4C'; g.fillRect(0, 0, W, H);
      const all = OTM.S().poly([[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]]);
      const ap = GG.piece(g, all, { fill: '#5A5A5C', rough: 0.5, seed: 61, tex: 0.7, kind: 'card' });
      // the treads below him, out of the window's light: two cut bands, each step's dark anti-slip nosing
      GG.bands(g, ap, [W * 0.5, H + 100], [W * 0.42, -100], ['#4C4C4F', '#56575A', '#616265'], { stops: [0, 0.45, 0.82], rough: 3.5, seed: 62 });
      [[-80, 250, W + 80, 190], [-80, 640, W + 80, 560]].forEach(([x0, y0, x1, y1], i) => {
        const nose = GG.blob([[x0, y0, 1], [x1, y1, 1], [x1, y1 + 26, 1], [x0, y0 + 30, 1]]);
        const np = GG.piece(g, nose, { fill: '#2C2C2F', rough: 1.4, seed: 63 + i, tex: 0.5, kind: 'card', lift: [0, 8], liftAlpha: 0.5, liftBlur: 10 });
        const face = GG.blob([[x0, y0 + 30, 1], [x1, y1 + 26, 1], [x1, y1 + 120, 1], [x0, y0 + 130, 1]]);
        GG.piece(g, face, { fill: '#46474A', rough: 1.4, seed: 66 + i, tex: 0.7, kind: 'card' });
        GG.crescent(g, np, 0, -4, '#4A4A4E', 0.7); });
      GG.specks(g, ap, [0, 0, W, H], 700, '#2E2E30', 67, 2.2, 0.45);
      // his knees at the edges of the frame, dark trouser paper
      [[[-120, 700], [190, 640], [420, 760], [470, 1180], [-120, 1180]], [[W + 120, 640], [W - 230, 600], [W - 470, 740], [W - 520, 1180], [W + 120, 1180]]].forEach((pts, i) => {
        const kp = GG.piece(g, GG.blob(pts), { fill: i ? '#2E333C' : '#2A2F38', rough: 1.3, seed: 70 + i, tex: 0.6, kind: 'cloth', lift: [i ? -10 : 10, -14], liftAlpha: 0.55, liftBlur: 18 });
        GG.crescent(g, kp, 0, -8, '#3E4450', 0.8);
        g.save(); g.strokeStyle = 'rgba(16,18,24,0.5)'; g.lineWidth = 6; g.beginPath(); const a = pts[1], b = pts[3]; g.moveTo(lerp(a[0], b[0], 0.3), lerp(a[1], b[1], 0.2)); g.quadraticCurveTo(lerp(a[0], b[0], 0.6), lerp(a[1], b[1], 0.5), lerp(a[0], b[0], 0.55), lerp(a[1], b[1], 0.9)); g.stroke(); g.restore(); });
    });
    c.reset(); c.g.drawImage(cv, 0, 0);
  }
  // his thumb: aims at the key of the letter just typed (PHONE.KEYS, the keyboard up), lifting between letters
  function thumbFor(lt) {
    const text = PHONE.MSG.sendMeOne, tt = PHONE.typeTimes(6.5, 9.5, text), tw = twos(lt);
    let n = 0; while (n < tt.length && tt[n] <= tw + 2e-4) n++;
    if (lt < 6.4) return { ch: null, tap: 0.6, x: 200, y: 700 };
    if (lt >= 9.85) return { ch: 'send', tap: lt < 10.05 ? 0 : 0.6 };
    if (n >= text.length) return { ch: 'send', tap: 0.6 };
    const ch = n > 0 ? text[n - 1].toLowerCase() : text[0].toLowerCase();
    const since = n > 0 ? tw - tt[n - 1] : 1;
    const next = text[n] ? text[n].toLowerCase() : null;
    // on the struck key for one drawing, then lifting toward the next
    return since < 1 / 12 + 1e-4 ? { ch, tap: 0 } : { ch: next || ch, tap: 0.5 };
  }
  function keyPt(ch) {
    const K = PHONE.KEYS, kbTop = PHONE.SH - 290;
    const q = K[ch === ' ' ? ' ' : ch] || K.n; return [q.x + q.w / 2, kbTop + q.y + q.h / 2];
  }
  function shotPhone(c, st, lt) {
    insertBg(c);
    const state = PHONE.exchange(lt, THREAD());
    const P = { x: IN.x, y: IN.y, h: IN.h, roll: IN.roll, pitch: IN.pitch, yaw: IN.yaw, screen: 'thread', state, t: lt, env: '#B8BAB8' };
    const info = PHONE.where(P, c);
    PHONE.glow(c, { info, x: IN.x + 60, y: IN.y + 80, r: 1100, k: 0.55, tone: 'night' });
    // his right hand holds it low, the fingers round its back (hidden by it), the thumb over the glass; the thumb's reach is the
    // one of five that brings its tip nearest the key of the letter being struck (on twos)
    const th = thumbFor(lt);
    let tgt;
    if (th.ch === 'send') tgt = info.targets.send || info.pt(330, 500);
    else if (th.ch) tgt = info.pt(...keyPt(th.ch)); else tgt = info.pt(250, 690);
    const L = RIG.light('stairwell', { amb: '#5A5C60', keys: [{ dir: [-0.3, -0.8, 0.5], col: '#CFCFCB', k: 0.38, poster: [0.3], levels: [1] }], phone: [IN.x, IN.y], phoneK: 1.2, phoneCol: '#FFC9AC', phoneZ: 0.6 });
    const hp = handOnPhone(c, info, L, tgt, th.tap, HAND_IN);
    const mask = m => RIG.hand(c, 'him', 'thumb', Object.assign({}, hp, { target: m, shadow: false, only: 'thumb' }));
    PHONE.draw(c, Object.assign({ mask, maskShadow: { alpha: 0.4 } }, P));
    RIG.hand(c, 'him', 'thumb', hp);
  }
  // where the hand sits on the phone (screen u, v of the grip), its size and turn
  const HAND_IN = { u: 0.66, v: 0.8, s: 760, rot: -0.1, flip: true };
  // the hand on the phone: the grip fixed to the phone, the reach (of five) whose thumb tip lands nearest the target
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

  let _scr = null; const SCR = () => _scr || (_scr = OTM.makeCanvas(8, 8).getContext('2d'));
  // ---------------------------------------------------------------- 3 · close (10.2–18): above; below; to his chest; then he looks
  function closeFace(lt) {
    const A = SW().views.close.anchors.head;
    const ph = { yaw: -0.05, pitch: 0.78, lids: 0.5, gaze: [0, 0.55] };
    const above = { yaw: 1.1, pitch: -0.34, lids: 0.74, gaze: [0.5, -0.5] };
    const below = { yaw: -0.32, pitch: 0.55, lids: 0.62, gaze: [-0.3, 0.45] };
    const chest = { yaw: 0.0, pitch: 0.35, lids: 0.42, gaze: [0.1, 0.3] };
    const look = { yaw: -0.02, pitch: 0.72, lids: 0.46, gaze: [0, 0.5] };
    void A;
    return tk(lt, [[10.2, ph], [11.0, ph], [11.45, above, 'outCubic'], [12.9, above], [13.35, below, 'inOutSine'], [14.9, below], [15.35, chest, 'inOutSine'], [16.9, chest], [17.3, look, 'inOutSine']]);
  }
  function shotClose(c, st, lt) {
    const v = SW().views.close, A = v.anchors;
    v.back(c, lt, { lunch: 'unopened' });
    const tilt = tk(lt, [[15.3, 0], [15.75, 1, 'inOutSine'], [16.95, 1], [17.35, 0.55, 'inOutSine']]);
    const pressed = tilt > 0.8 ? 1 : tilt;
    const lightK = lerp(1.2, 0.15, pressed);
    const fig0 = { tilt };
    const face = closeFace(lt);
    const ph = [A.phone.x, lerp(A.phone.y, A.phone.y - 0.5 * A.head.s, tilt)];
    const fig = drawHim(c, v, { t: lt, tilt: fig0.tilt, face, thumb: 0.4, phoneAt: ph, phoneK: Math.round(lightK * 10) / 10 });
    v.front(c, lt, {});
    const state = lt < 10.9 ? PHONE.exchange(10.19, THREAD()) : PHONE.exchange(11, THREAD());
    drawPhoneBack(c, fig, { state, pitch: lerp(-0.6, -0.15, tilt), yaw: lerp(0.15, 0.05, tilt), bright: 1, spill: lerp(1, 0.25, pressed), mask: true });
  }

  // ---------------------------------------------------------------- 4 · tight (18–26): the breath goes out; the colour comes up his neck
  function shotTight(c, st, lt) {
    const v = SW().views.tight, A = v.anchors;
    const z = lerp(1, 1.035, seg(lt, 18, 26, 'inOutSine'));
    c.camera({ x: W / 2 + (A.head.x - W / 2) * 0.12, y: H / 2 + 40 * seg(lt, 18, 26, 'inOutSine'), zoom: z });
    v.back(c, lt, { lunch: 'unopened' });
    // the breath out at 18.4: the shoulders drop and stay down; the mouth parts on it, then closes
    const drop = tk(lt, [[18.35, 0], [19.1, 1, 'outCubic']]);
    const flush = tk(lt, [[18.0, 0], [19.2, 0.12], [22.5, 0.62], [25.4, 1.0]]);
    const lids = tk(lt, [[18.3, 0.42], [18.8, 0.3], [21, 0.34], [22.1, 0.34], [22.4, 0.0, 'inQuad'], [23.2, 0.0], [23.6, 0.3, 'outQuad']]);
    const face = { yaw: -0.24, pitch: 0.3 + 0.06 * seg(lt, 22.1, 22.6) - 0.06 * seg(lt, 23.2, 23.7), roll: 0.05, lids, gaze: [0.1, 0.7], flush,
      mouth: lt > 18.45 && lt < 19.35 ? 1 : 0, brows: lt > 19.5 ? 0.25 : 0 };
    // the screen held low at his chest, below the frame: its smooth light comes up under his chin and nose
    const ph = [A.head.x - 20, A.head.y + 1.7 * A.head.s];
    const L = RIG.light('stairwell', { keys: v.light.keys, amb: v.light.amb, phone: ph, phoneK: 2.1, phoneZ: 1.1, phoneCol: '#FFC4A4' });
    RIG.draw(c, 'him', 'step', { x: A.head.x, y: A.head.y + drop * 9, s: A.head.s, light: L, t: lt, tilt: 0.55, crop: 1.9, blink: !(lt > 21.8 && lt < 24),
      breathAmp: 2.5 * (1 - 0.4 * drop), face });
    v.front(c, lt, {});
    // the screen's own light coming up from below the frame (smooth, never banded): on his chin and collar
    PHONE.glow(c, { x: A.head.x - 30, y: 1110, r: 760, k: 0.5, tone: 'skin', sy: 0.8, em: 0.12 });
  }

  // ---------------------------------------------------------------- 5 · shoulder (26–36): the thread, out of focus, by rule
  // His head and shoulder dark at the left, the back of his head turned down to the phone, his ear red; the phone held up in the
  // right half against bare concrete; his forearm rising to it from below; the screen a blurred grid that never comes into focus.
  function shoulderQuad(A) { const q = A.phone.quad; return [q[1], q[0], q[3], q[2]]; }   // the set's quad is listed mirrored; as seen
  function shotShoulder(c, st, lt) {
    const v = SW().views.shoulder, A = v.anchors;
    v.back(c, lt, {});
    const scroll = PHONE.flicks(lt, { at: FLICKS, dist: 420, tau: 0.32 });
    const P = { quad: shoulderQuad(A), edge: [-7, 5], screen: 'grid', state: { scroll, live: true, clock: 'lunch' }, t: lt, blur: 2, env: '#9C9EA0' };
    const info = PHONE.where(P, c);
    PHONE.glow(c, { info, x: info.center[0] - 60, y: info.center[1] + 20, r: 560, k: 0.5, tone: 'skin' });
    const L = RIG.light('stairwell', { keys: [{ dir: [0.25, -0.8, 0.5], col: '#B8B8B4', k: 0.32, poster: [0.35], levels: [1] }], amb: '#34363A',
      phone: [info.center[0], info.center[1]], phoneK: 0.7, phoneCol: '#FFB894', paper: { mul: '#8C8C8A' } });
    const by = RIG.breath(lt, 3);
    // the back of his head, turned down and a little to the phone: hair, the right ear (red), the edge of the jaw
    RIG.head(c, 'him', { x: 560, y: 120 - by, s: 540, yaw: 2.72, pitch: -0.42, lids: 0.35, flush: 0.7, ears: 1, neck: 0.3, light: L });
    shoulderBody(c, lt);
    // his right forearm, up from below the frame to the phone; the hand: the phone in the palm, the thumb flicking the thread up
    const pulse = FLICKS.reduce((m, a) => (lt > a - 0.25 && lt < a + 0.25) ? Math.max(m, 1 - Math.abs(lt - a) / 0.25) : m, 0);
    const up = info.at(0.5, 0.0), dn = info.at(0.5, 1.0), ang = Math.atan2(up[1] - dn[1], up[0] - dn[0]) + Math.PI / 2;
    const tgt = info.at(0.45, lerp(0.72, 0.45, pulse));
    const hp = handOnPhone(c, info, L, tgt, 0, { u: 0.4, v: 0.78, s: 255, rot: ang - 0.05, flip: false, foreLen: 0.35 });
    sleeveUp(c, hp, RIG.hand(c, 'him', 'thumb', Object.assign({}, hp, { target: SCR() })));
    const mask = m => RIG.hand(c, 'him', 'thumb', Object.assign({}, hp, { target: m, shadow: false, only: 'thumb' }));
    PHONE.draw(c, Object.assign({ mask, maskShadow: { alpha: 0.35 } }, P));
    RIG.hand(c, 'him', 'thumb', hp);
  }
  // the shirt sleeve over his forearm, from the wrist down out of the frame (dark: he is in his own shade)
  function sleeveUp(c, hp, hand) {
    const g = c.g; const fa = hand.angle + Math.PI;                       // the forearm runs opposite the fingers
    const u = [Math.cos(fa), Math.sin(fa)], n = [-u[1], u[0]], r = 64;
    const a = [hp.x + u[0] * 40, hp.y + u[1] * 40], b = [hp.x + u[0] * 900, hp.y + u[1] * 900];
    const sh = GG.blob([[a[0] + n[0] * r, a[1] + n[1] * r, 1], [b[0] + n[0] * r * 1.6, b[1] + n[1] * r * 1.6, 1], [b[0] - n[0] * r * 1.6, b[1] - n[1] * r * 1.6, 1], [a[0] - n[0] * r, a[1] - n[1] * r, 1]]);
    const p = GG.piece(g, sh, { fill: '#3A424E', rough: 1.3, seed: 95, tex: 0.6, kind: 'cloth', lift: [10, 8], liftAlpha: 0.5, liftBlur: 16 });
    GG.crescent(g, p, 5, -6, '#4C5664', 0.8);
  }
  function shoulderBody(c, lt) {
    const cv = c.cache('Q04|shoulder|body2', g => {
      // the back of his shirt and his right shoulder, very close: one big dark piece, its top edge the shoulder's line
      const col = '#39414C';
      const back = GG.blob([[-140, 300], [180, 250], [470, 300], [700, 430], [880, 700], [960, 960], [980, 1220], [-140, 1220]]);
      const bp = GG.piece(g, back, { fill: col, rough: 1.4, seed: 91, tex: 0.6, kind: 'cloth', lift: [16, 12], liftAlpha: 0.55, liftBlur: 26 });
      GG.bands(g, bp, [150, 1100], [650, 300], ['#262C35', '#303741', '#3C444F'], { stops: [0, 0.5, 0.86], rough: 3, seed: 92 });
      GG.crescent(g, bp, 6, -10, '#525C69', 0.7);
      // the collar standing round the base of his neck, from behind
      const col2 = GG.blob([[300, 300], [440, 262], [610, 300], [690, 380], [640, 410], [470, 352], [330, 360]]);
      const cp = GG.piece(g, col2, { fill: '#465060', rough: 1.2, seed: 93, tex: 0.5, kind: 'cloth', lift: [6, 8], liftAlpha: 0.5, liftBlur: 10 });
      GG.crescent(g, cp, 3, -6, '#5A6474', 0.8);
      g.save(); g.strokeStyle = 'rgba(16,20,26,0.55)'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(120, 560); g.quadraticCurveTo(400, 640, 540, 880); g.stroke(); g.restore();
    });
    const by = RIG.breath(lt, 3);
    c.g.drawImage(cv, 0, -by);
  }

  FILM.seq({
    id: 'Q04', title: 'Send me one', dur: 42,
    setup() { if (SETS.stairwell.prepare) SETS.stairwell.prepare(); PHONE.prepare(['hidden']); },
    lines: [],
    sound(S) {
      S.bed('stairwell', 0, 42, { level: -42 });                       // concrete air, a far door, the building
      PHONE.typeTimes(6.5, 9.5, PHONE.MSG.sendMeOne).forEach(t => S.cue('type', t, { level: -8 }));
      S.cue('send', 10.0);
      S.cue('receive', 10.2);                                          // instantly
      S.cue('door_far', 12.0);                                         // somewhere above; nobody comes
      S.cue('breath_out', 18.4);
      S.bed('heartbeat_soft', 19, 26, { level: -50 });                 // barely
      FLICKS.filter(t => t < 36).forEach(t => S.cue('scroll', t, { level: -14 }));   // very soft
      S.bed('scroll', 26, 36, { level: -56 });
    },
    shots: [
      { at: 0, name: 'wide: he sits alone on the step; the lunch unopened', draw(c, st, lt) { shotWide(c, st, lt); } },
      { at: 6, name: 'phone: he types "Send me one."', draw(c, st, lt) { shotPhone(c, st, lt); } },
      { at: CUT_PHONE, name: 'close: above; below; the screen to his chest; he looks', draw(c, st, lt) { shotClose(c, st, lt); } },
      { at: 18, name: 'tight: the breath goes out; the colour comes up his neck', draw(c, st, lt) { shotTight(c, st, lt); } },
      { at: 26, name: 'shoulder: the thread out of focus; it keeps coming', draw(c, st, lt) { shotShoulder(c, st, lt); } },
      { at: 36, name: 'wide: small on the stair, scrolling; the lunch unopened', draw(c, st, lt) { shotWide(c, st, lt); } },
    ],
  });
})();
