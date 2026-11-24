/* LONG DISTANCE · Q06 THE WATERFALL (64 s) · S06, A023–A029, L007 · living (room, fridge, counter), phone
   The living room at night under the pendant. He eats from the pan standing at the counter, the phone propped against the salt
   in the empty half, where a person would sit across from him. A chime: she sends a picture of the two of them in front of a
   waterfall. It is the strip on the fridge, the last frame, made perfect: the same two faces in the same tilt, too even. Nobody
   says so. He stops chewing and looks for a long time, says "I love this one." to the empty room, sets it as his wallpaper, and
   locks and wakes the phone three times to see them there. The last shot holds the strip and the phone in one frame: the rhyme,
   in plain sight, unremarked.
   Shots: room (0) · fridge insert, push down to the last frame (7) · counter (13) · the image, gloss insert (22) · counter close
   (30) · wallpaper, lock and wake, insert (42) · counter, the strip and the phone in one frame, slow push (53). */
(function () {
  'use strict';
  const O = window.OTM, W = O.W, H = O.H;
  const { seg, key, twos, clamp, lerp } = FILM;
  const LV = n => SETS.living.views[n];
  const NIGHT = { tod: 'night' };
  const HEAD_M = 0.23;                                  // a head, crown to chin, in metres (living.md)
  const PHONE_M = 0.15;                                 // the phone's body, in metres

  // ---------------------------------------------------------------- the phone's day: what its screen shows at local time lt
  const THREAD = { clock: 'night', history: 'morning', steps: [{ stamp: '23:14', at: 0 }, { at: 20.5, her: { image: 'waterfall' } }] };
  const OPEN = [22.4, 23.3];                            // the bubble grows to the viewer
  const SET_IN = 42.2, SET_PRESS = 43.4, SET_OUT = 43.9;
  const LOCKS = [44.9, 47.0, 50.0], WAKES = [45.5, 48.5, 51.5];
  function screenAt(lt) {
    if (lt < OPEN[0]) return { screen: 'thread', state: PHONE.exchange(lt, THREAD) };
    if (lt < SET_IN) return { screen: 'image', state: { open: seg(lt, OPEN[0], OPEN[1], 'inOutCubic'), thread: PHONE.exchange(30, THREAD) } };
    if (lt < LOCKS[0]) {
      const inn = lt < SET_OUT ? seg(lt, SET_IN, SET_IN + 0.4, 'outCubic') : 1 - seg(lt, SET_OUT, SET_OUT + 0.3, 'inCubic');
      return { screen: 'wallpaper_set', state: { in: inn, press: lt > SET_PRESS && lt < SET_PRESS + 0.4 ? 1 : 0 } };
    }
    // locked and woken: black glass, then the lock screen blooms back with the two of them on it
    let last = null; [...LOCKS.map(t => [t, 'lock']), ...WAKES.map(t => [t, 'wake'])].sort((a, b) => a[0] - b[0]).forEach(e => { if (lt >= e[0]) last = e; });
    if (last[1] === 'lock') return { screen: 'black', state: {} };
    const p = seg(lt, last[0], last[0] + 0.7);
    return p < 1 ? { screen: 'wake', state: { p } } : { screen: 'lock', state: {} };
  }
  // the screen's light, as RIG reads it: peach while the thread is up, the white water's cool once the picture is open
  const toneAt = lt => lt < OPEN[0] + 0.4 ? { col: '#FFC5A0', k: 0.55 } : { col: '#CDEFF3', k: 0.8 };
  const litAt = lt => { const s = screenAt(lt); return s.screen === 'black' ? 0 : s.screen === 'wake' ? s.state.p : 1; };

  // ---------------------------------------------------------------- his eating: a forkful, chewed while he watches the phone
  // fork 0 = over the pan, 1 = at his mouth. Bites land at these times; between bites he chews and looks at the phone.
  const BITES = [1.2, 5.4, 13.6, 17.4];
  function eating(t) {
    let fork = 0, chew = false, look = 1;               // look 1 = at the phone, 0 = at the pan
    for (const b of BITES) {
      if (t >= b - 1.6 && t < b - 0.55) { look = 0; fork = 0.08 * Math.sin((t - b) * 9) + 0.08; }            // twirling
      if (t >= b - 0.55 && t < b + 0.5) { look = t < b - 0.2 ? 0 : 1; fork = t < b ? seg(t, b - 0.55, b, 'inOutSine') : 1 - seg(t, b + 0.15, b + 0.5, 'inOutSine'); }
      if (t >= b && t < b + 3.2) chew = true;
    }
    return { fork, chew, look };
  }
  // the face for a look (1: at the phone, B2; 0: down at the pan), eased through intermediate angles on twos
  function faceFor(look) { return { yaw: lerp(0.3, 0.72, look), pitch: lerp(0.56, 0.48, look), gaze: [lerp(0.05, 0.22, look), lerp(0.42, 0.32, look)] }; }

  // ---------------------------------------------------------------- the phone propped against the salt (true size)
  // it stands on its bottom edge just right of the salt and leans over onto it: in the empty half, its screen turned up to him
  function propped(view, shot) {
    const A = LV(view).shots[shot].anchors, ppm = A.phoneSalt[2], h = PHONE_M * ppm, roll = -0.1;
    const bx = A.phoneSalt[0] - 0.046 * ppm, by = A.phoneSalt[1];
    return { x: bx + Math.sin(-roll) * -h * 0.47, y: by - Math.cos(roll) * h * 0.47, h, yaw: -0.2, pitch: 0.12, roll, env: '#F0D8B8', lightDir: [-0.2, -1] };
  }
  function drawPropped(c, view, shot, lt, o) {
    o = o || {}; const P = Object.assign(propped(view, shot), screenAt(lt), { shadow: { dx: 6, dy: 3, blur: 8, alpha: 0.55 } });
    const info = PHONE.where(P, c);
    PHONE.glow(c, { info, x: info.center[0] - P.h * 0.15, y: LV(view).shots[shot].anchors.phoneSalt[1] - P.h * 0.08, r: P.h * 2.4, sy: 0.32, k: o.k == null ? 1.1 : o.k });
    PHONE.draw(c, P);
    return info;
  }

  // his trousers and belt, below the untucked shirt, down behind the counter's edge (the counter pose stops at the hem)
  function trousers(c, x, y, s) {
    const k = Math.max(1, Math.round(s)), w = Math.ceil(1.6 * k), h = Math.ceil(1.3 * k);
    const cv = c.cache('Q06|trousers2|' + k, g => {
      const S = O.S; const sh = GG.blob([[0.14 * k, 0.05 * k], [w - 0.14 * k, 0.02 * k], [w - 0.12 * k, h, 1], [0.12 * k, h, 1]]);
      const p = GG.piece(g, sh, { fill: '#2B2E37', rough: 0.9, seed: 641, tex: 0.55, kind: 'cloth' });
      GG.crescent(g, p, 0, 0.04 * k, '#4A4C56', 0.7);
      // the untucked shirt's hem throws a soft shadow onto them (no belt shows under an untucked shirt)
      const gr = g.createLinearGradient(0, 0, 0, 0.16 * k); gr.addColorStop(0, 'rgba(10,8,10,0.55)'); gr.addColorStop(1, 'rgba(10,8,10,0)');
      g.save(); g.clip(p); g.fillStyle = gr; g.fillRect(0, 0, w, 0.16 * k); g.restore();
    }, w, h);
    c.g.drawImage(cv, x - w / 2 + 0.02 * s, y + 3.2 * s, w * s / k, h * s / k);
  }
  // ---------------------------------------------------------------- him at the counter in any counter or room framing
  function him(c, view, shot, t, o) {
    const A = LV(view).shots[shot].anchors, s = HEAD_M * A.himCounter[2];
    const ph = propped(view, shot), lt = c.lt;
    const tone = toneAt(lt), lit = litAt(lt);
    const L = RIG.light('pendant', { phone: [ph.x, ph.y], phoneCol: tone.col, phoneK: tone.k * lit * (o.phoneK == null ? 1 : o.phoneK) });
    trousers(c, A.himCounter[0], A.himCounter[1], s);
    return RIG.draw(c, 'him', 'counter', Object.assign({ x: A.himCounter[0], y: A.himCounter[1], s, light: L, t, crop: o.crop == null ? 3.7 : o.crop }, o.fig || {}, { face: o.face, fork: o.fork }));
  }

  // ---------------------------------------------------------------- the insert: the phone filling the frame, propped on the salt
  // the counter top close and warm, the salt cellar beside it in focus, the wall and the cone far behind and soft
  const INS = { x: 1040, y: 545, h: 930, yaw: -0.1, pitch: 0.06, roll: -0.07 };
  function insertBg(c) {
    const cv = c.cache('Q06|insertBg', g => {
      const S = O.S;
      // the wall under the pendant, far and soft: the cone's cut bands, blurred by the lens
      const L = GG.layer(); L.fillStyle = '#231D24'; L.fillRect(0, 0, W, H);
      [['#2A2329', 1.0], ['#382D31', 0.75], ['#4A3C3A', 0.52], ['#5C4A42', 0.3]].forEach(([col, k]) => { L.fillStyle = col; L.beginPath(); L.moveTo(820 - 900 * k, -60); L.lineTo(820 + 900 * k, -60); L.lineTo(820 + 1500 * k, 820); L.lineTo(820 - 1500 * k, 820); L.closePath(); L.fill(); });
      // his shirt and the pan's dark rim, behind the phone and out of focus
      L.fillStyle = '#5C6880'; L.beginPath(); L.ellipse(330, 300, 420, 520, 0.1, 0, 7); L.fill();
      L.fillStyle = '#7A8496'; L.beginPath(); L.ellipse(380, 160, 300, 260, 0.1, 0, 7); L.fill();
      L.fillStyle = '#1E1A1C'; L.beginPath(); L.ellipse(260, 640, 380, 80, -0.04, 0, 7); L.fill();
      L.fillStyle = '#9A4A30'; L.beginPath(); L.ellipse(270, 622, 280, 46, -0.04, 0, 7); L.fill();
      g.filter = 'blur(26px)'; g.drawImage(L.canvas, 0, 0); g.filter = 'none';
      GG.texture(g, (() => { const p = new Path2D(); p.rect(0, 0, W, H); return p; })(), 0.35, 61, 'paper');
      // the counter top, near and in focus at the phone: warm cut bands of the pendant's pool
      const top = S().poly([[-40, 770], [W + 40, 756], [W + 40, H + 40], [-40, H + 40]]);
      const tp = GG.piece(g, top, { fill: '#4A3B36', rough: 1.4, seed: 601, tex: 0.6, kind: 'card', lift: [0, -10], liftAlpha: 0.7, liftBlur: 16 });
      g.save(); g.clip(tp); O.lightPool(g, 900, 860, [{ r: 1300, color: '#56453D' }, { r: 900, color: '#6E5747' }, { r: 520, color: '#876A53' }], { sy: 0.22, rough: 3, seed: 61 }); g.restore();
      GG.texture(g, tp, 0.45, 602, 'card');
      g.fillStyle = 'rgba(214,180,140,0.4)'; g.fill(S().poly([[-40, 770], [W + 40, 756], [W + 40, 762], [-40, 776]]).path(0.8, 603));
      O.dust(g, [[200, 860], [1700, 850], [1700, 1070], [200, 1080]], 160, '#E0C8A0', 'Q06crumbs');
      // the salt cellar the phone leans on: glass, salt, a dented lid
      const sx = 640, sb = 905, sw = 150, sh = 500;
      const salt = S().M(sx - sw, sb - sh).L(sx + sw, sb - sh).L(sx + sw + 8, sb - 10).Q(sx, sb + 16, sx - sw - 8, sb - 10).Z();
      const sp = GG.piece(g, salt, { fill: '#4C484E', rough: 0.9, seed: 611, tex: 0.35, lift: [-18, 10], liftAlpha: 0.55, liftBlur: 14 });
      g.save(); g.clip(sp); g.fillStyle = '#C9C2B4'; g.fill(S().M(sx - sw - 20, sb - sh * 0.56).Q(sx, sb - sh * 0.6, sx + sw + 20, sb - sh * 0.54).L(sx + sw + 20, sb + 20).L(sx - sw - 20, sb + 20).Z().path(1.6, 612));
      O.dust(g, [[sx - sw, sb - sh * 0.56], [sx + sw, sb - sh * 0.56], [sx + sw, sb], [sx - sw, sb]], 900, '#ECE3D0', 'Q06salt');
      g.fillStyle = 'rgba(236,227,208,0.22)'; g.fillRect(sx + sw * 0.55, sb - sh, 22, sh); g.fillStyle = 'rgba(236,227,208,0.12)'; g.fillRect(sx - sw * 0.7, sb - sh, 12, sh); g.restore();
      GG.crescent(g, sp, 10, 0, 'rgba(232,210,180,0.5)', 0.8);
      const cap = S().M(sx - sw - 6, sb - sh - 120).L(sx + sw + 6, sb - sh - 120).L(sx + sw + 12, sb - sh + 8).L(sx - sw - 12, sb - sh + 8).Z();
      const cp = GG.piece(g, cap, { fill: '#7E7A76', rough: 0.7, seed: 613, tex: 0.3, lift: [-8, 8], liftAlpha: 0.5 }); GG.crescent(g, cp, 0, -10, '#E4D8C4', 0.8); GG.crescent(g, cp, -14, 0, '#3A3634', 0.6);
      g.save(); g.clip(cp); g.fillStyle = 'rgba(30,26,24,0.5)'; for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(sx + i * 50, sb - sh - 70, 7, 0, 7); g.fill(); } g.restore();
    });
    c.g.drawImage(cv, 0, 0);
  }
  // his index finger, out from the fist (the fork laid in the pan off frame): cut paper at the insert's scale, pointing to -x,
  // its tip at (60, 210) of the canvas, the back of the hand trailing off to the right
  const FT = [60, 210];
  function fingerCanvas(c) {
    return c.cache('Q06|finger', g => {
      const S = O.S, SK = '#A4704F', LIT = '#D49B74', SH = '#6A4636';
      const back = GG.blob([[620, 118], [900, 64], [1300, 52], [1540, 70], [1540, 430], [1200, 440], [900, 404], [700, 336], [636, 282]]);
      const bp = GG.piece(g, back, { fill: '#96664A', rough: 1.1, seed: 651, tex: 0.5, lift: [10, 18], liftAlpha: 0.5, liftBlur: 14 });
      GG.crescent(g, bp, 0, -14, LIT, 0.75); GG.crescent(g, bp, 0, 16, SH, 0.7);
      [[800, 132], [930, 110], [1060, 100]].forEach(([x, y], i) => { const kn = S().ellipse(x, y + 18, 58, 34, -0.1); const kp = GG.piece(g, kn, { fill: '#9E6C4E', rough: 0.8, seed: 652 + i, tex: 0.45 }); GG.crescent(g, kp, 0, -8, LIT, 0.6); });
      const mid = GG.blob([[548, 252], [660, 236], [776, 266], [800, 334], [716, 378], [604, 360], [540, 306]]);
      const mp = GG.piece(g, mid, { fill: '#9A6849', rough: 0.9, seed: 656, tex: 0.5, lift: [6, 10], liftAlpha: 0.45, liftBlur: 8 }); GG.crescent(g, mp, 0, -8, LIT, 0.6); GG.crescent(g, mp, 0, 10, SH, 0.6);
      const idx = GG.blob([[60, 200], [84, 164], [190, 148], [420, 142], [700, 136], [780, 148], [786, 290], [700, 286], [420, 274], [190, 270], [84, 258], [58, 226]]);
      const ip = GG.piece(g, idx, { fill: SK, rough: 0.9, seed: 657, tex: 0.5, lift: [8, 14], liftAlpha: 0.5, liftBlur: 10 });
      GG.crescent(g, ip, 0, -12, LIT, 0.85); GG.crescent(g, ip, 0, 14, SH, 0.75); GG.crescent(g, ip, -6, 6, 'rgba(160,190,196,0.6)', 0.35);
      const nail = S().ellipse(132, 206, 56, 40, 0.02); const np = GG.piece(g, nail, { fill: '#C79A82', rough: 0.6, seed: 658, tex: 0.35 }); GG.crescent(g, np, 0, -8, '#E6C2AA', 0.8);
      g.save(); g.lineCap = 'round'; g.strokeStyle = 'rgba(92,58,44,0.55)'; g.lineWidth = 3;
      [[250, 0.9], [262, 0.7], [460, 1], [474, 0.8]].forEach(([x, k]) => { g.beginPath(); g.moveTo(x - 6, 178 + 14 * (1 - k)); g.quadraticCurveTo(x + 8, 208, x - 6, 240 - 14 * (1 - k)); g.stroke(); });
      g.restore();
    }, 1560, 460);
  }
  // where his fingertip is at lt: a tip point and the direction it points, or null when it is out of frame
  const TAPS = [{ t0: 21.75, t1: 22.3, t2: 22.55, t3: 23.05, uv: [0.36, 0.72] }, { t0: 42.75, t1: 43.33, t2: 43.75, t3: 44.15, uv: [0.5, 0.905] }];
  const SIDE = { t0: 44.2, t1: 44.75, t2: 51.9, t3: 52.5, v: 0.3 };
  function fingerAt(lt, info) {
    const D = 1150;
    for (const T of TAPS) if (lt >= T.t0 && lt < T.t3) {
      const d = lt < T.t1 ? D * (1 - seg(lt, T.t0, T.t1, 'outCubic')) : lt < T.t2 ? 0 : D * seg(lt, T.t2, T.t3, 'inCubic');
      const a = Math.PI - 0.26; const tip = info.at(T.uv[0], T.uv[1]);
      return { tip: [tip[0] - Math.cos(a) * d, tip[1] - Math.sin(a) * d], a };
    }
    if (lt >= SIDE.t0 && lt < SIDE.t3) {
      // parked at the side button, pressing on each beat: lock, wake; lock, wake; lock, wake
      let push = 0; LOCKS.concat(WAKES).forEach(b => { push = Math.max(push, 1 - Math.abs(lt - b) / 0.16); });
      const d = lt < SIDE.t1 ? D * (1 - seg(lt, SIDE.t0, SIDE.t1, 'outCubic')) : lt < SIDE.t2 ? 16 * (1 - clamp(push, 0, 1)) : D * seg(lt, SIDE.t2, SIDE.t3, 'inCubic');
      const a = Math.PI - 0.12, e = info.at(1, SIDE.v); const tip = [e[0] + 26, e[1]];
      return { tip: [tip[0] - Math.cos(a) * d, tip[1] - Math.sin(a) * d], a };
    }
    return null;
  }
  const placeFinger = (g, f, cv) => { g.save(); g.translate(f.tip[0], f.tip[1]); g.rotate(f.a - Math.PI); g.drawImage(cv, -FT[0], -FT[1]); g.restore(); };
  function insert(c, st, lt) {
    insertBg(c);
    const P = Object.assign({}, INS, screenAt(lt), { env: '#F0D8B8', lightDir: [-0.3, -1], shadow: { dx: 14, dy: 6, blur: 18, alpha: 0.6 } });
    const info = PHONE.where(P, c);
    PHONE.glow(c, { info, x: INS.x - 60, y: 900, r: 1500, sy: 0.3, k: 0.9 });
    PHONE.glow(c, { info, x: INS.x, y: 520, r: 1200, k: 0.25 });
    // the finger is real paper: it is cut out of the gloss (mask) and drawn on the paper world, so it takes the grain
    const f = fingerAt(twos(lt), info), cv = f ? fingerCanvas(c) : null;
    if (f) P.mask = m => placeFinger(m, f, cv);
    PHONE.draw(c, P);
    if (f) placeFinger(c.g, f, cv);
  }

  // the counter's near edge, out of the pendant's pool: darker toward the bottom of the frame, so the subtitle sits on calm paper
  function nearEdge(c) {
    const g = c.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const gr = g.createLinearGradient(0, 900, 0, H); gr.addColorStop(0, 'rgba(14,10,12,0)'); gr.addColorStop(0.55, 'rgba(14,10,12,0.32)'); gr.addColorStop(1, 'rgba(14,10,12,0.55)');
    g.fillStyle = gr; g.fillRect(0, 900, W, H - 900); g.restore();
  }

  FILM.seq({
    id: 'Q06', title: 'The waterfall', dur: 64,
    setup() { PHONE.prepare(['waterfall']); },
    lines: [{ id: 'L007', at: 38.5 }],
    sound(S) {
      S.bed('room_night', 0, 64, { level: -46 });
      S.bed('pendant_hum', 0, 64, { level: -52 });
      // the fork in the pan, sparse: each twirl and lift (the bites at 13.6 and 17.4 in the counter shot; the room is too far to hear)
      [12.2, 13.1, 16.0, 16.9, 26.0].forEach(t => S.cue('fork_pan', t, { level: -36 }));
      S.bed('chewing', 14.0, 30.0, { level: -38 });
      S.cue('receive', 20.5);
      S.cue('tap', OPEN[0] - 0.05, { level: -40 });               // his knuckle on the glass: the picture opens
      S.cue('tap', SET_PRESS, { level: -40 });                    // "Set as wallpaper"
      S.cue('swallow', 37.4, { level: -40 });
      S.cue('lock', LOCKS[0]); S.cue('lock', LOCKS[1]); S.cue('lock', LOCKS[2]);
      WAKES.forEach(t => S.cue('wake', t));
      S.bed('fridge_hum', 53, 64, { level: -48 });
    },
    shots: [
      // ---------------------------------------------------------------- the room: small, tidy for one, furnished for two
      { at: 0, name: 'room: the elevation, night; he eats at the counter in the kitchen half', draw(c, st, lt) {
        const V = LV('room'); V.back(c, lt, NIGHT);
        const e = eating(twos(lt));
        him(c, 'room', 'wide', lt, { fork: e.fork, face: Object.assign(faceFor(e.look), e.chew ? RIG.chew(lt) : {}), crop: 4.2 });
        drawPropped(c, 'room', 'wide', lt, { k: 0.9 });
        V.front(c, lt, NIGHT);
      } },
      // ---------------------------------------------------------------- the strip on the fridge: push down to the last frame
      { at: 7, name: 'fridge: insert, the photo-booth strip; push down to the last frame', draw(c, st, lt) {
        const u = seg(st, 0.3, 5.9, 'inOutSine');
        c.camera({ x: lerp(960, 945, u), y: lerp(540, 600, u), zoom: lerp(1.0, 1.15, u) });
        const V = LV('fridge'); V.back(c, lt, NIGHT); V.front(c, lt, NIGHT);
      }, post: { vig: 0.55 } },
      // ---------------------------------------------------------------- B2: he eats; the phone keeps him company across the salt
      { at: 13, name: 'counter: he eats from the pan; the phone propped against the salt in the empty half; the chime', draw(c, st, lt) {
        const V = LV('counter'); V.back(c, lt, NIGHT);
        const tt = twos(lt); const e = eating(tt);
        // 20.5: the chime. He is chewing, eyes on the pan; they go to the phone and stay
        let look = e.look; if (tt > 20.6) look = 1;
        const chewing = tt < 21.6 ? e.chew : true;
        const face = Object.assign(faceFor(look), chewing ? RIG.chew(lt) : {}, tt > 20.7 ? { lids: 0.86, brows: 0.25 } : {});
        him(c, 'counter', 'main', lt, { fork: tt > 20.6 ? Math.min(e.fork, 0.15) : e.fork, face });
        drawPropped(c, 'counter', 'main', lt);
        V.front(c, lt, NIGHT);
      } },
      // ---------------------------------------------------------------- the image: the bubble, his knuckle, the picture opens
      { at: 22, name: 'phone: the image, full frame, gloss; it arrives as a bubble and opens', draw(c, st, lt) {
        // once the picture is open, the camera leans in on it, slowly, as he does
        const u = seg(st, 1.6, 8, 'inOutSine'); c.camera({ x: lerp(960, 1005, u), y: lerp(540, 565, u), zoom: lerp(1.0, 1.06, u) });
        insert(c, st, lt);
      }, post: { vig: 0.42, halation: 0.55 } },
      // ---------------------------------------------------------------- he stops chewing; he looks for a long time; L007
      { at: 30, name: 'counter close: he stops chewing and looks for a long time; "I love this one." to the empty room', draw(c, st, lt) {
        const u = seg(st, 0, 12, 'inOutSine'); c.camera({ x: lerp(960, 1000, u), y: lerp(540, 560, u), zoom: lerp(1.0, 1.045, u) });
        const V = LV('counter'); V.back(c, lt, Object.assign({ shot: 'close' }, NIGHT));
        const tt = twos(lt);
        const stop = 30.35, swallow = 37.4, up = 37.9, back = 41.4;
        const chew = tt < stop ? RIG.chew(lt) : tt < swallow ? { mouth: 0, cheek: 0.6, cheekSide: -1 } : {};
        // the look: B2's eyes on the phone; at 37.9 they lift to the empty room for the line; at 41.4 back down
        const look = key(tt, [[up, 1], [up + 0.5, 0, 'inOutSine'], [back, 0], [back + 0.5, 1, 'inOutSine']]);
        const face = Object.assign({ yaw: lerp(0.4, 0.72, look), pitch: lerp(0.1, 0.48, look), gaze: [lerp(0.35, 0.22, look), lerp(-0.05, 0.32, look)],
          lids: key(tt, [[30.3, 0.86], [33.6, 0.86], [35.5, 0.74], [up, 0.74], [up + 0.4, 0.68]]), brows: tt < 33 ? 0.25 : 0,
          smile: key(tt, [[34.4, 0], [36.6, 0.25], [up, 0.25], [up + 0.4, 0.125], [41, 0.125], [42, 0.25]]) },
          chew, tt >= swallow && tt < swallow + 0.25 ? { pitch: lerp(0.1, 0.48, look) + 0.06 } : {},
          { mouth: RIG.mouthFor('L007', lt - 38.5) });
        if (tt > 33.4 && tt < 33.6) face.lids = 0.1;              // one slow blink, mid-look
        him(c, 'counter', 'close', lt, { fork: 0.22, face, fig: { blink: false } });
        drawPropped(c, 'counter', 'close', lt);
        V.front(c, lt, Object.assign({ shot: 'close' }, NIGHT));
        nearEdge(c);
      } },
      // ---------------------------------------------------------------- wallpaper; locks, wakes: there they are, three times
      { at: 42, name: 'phone: set as wallpaper; locks, wakes, there they are (x3)', draw(c, st, lt) { insert(c, st, lt); }, post: { vig: 0.42, halation: 0.55 } },
      // ---------------------------------------------------------------- the rhyme: the strip on the fridge and the phone in one frame
      { at: 53, name: 'counter, wider: the strip on the fridge and the phone in one frame; slow push', draw(c, st, lt) {
        // a slow push that drifts toward the fridge and lands with the strip at the left edge and the phone at the right
        // (the set's layers end at the frame: x >= 960 / zoom keeps the fridge side covered)
        const u = seg(st, 0.3, 10.9, 'inOutSine'); c.camera({ x: lerp(960, 826, u), y: lerp(540, 585, u), zoom: lerp(1.0, 1.17, u) });
        const V = LV('counter'); V.back(c, lt, NIGHT);
        const tt = twos(lt);
        // he looks at them on the lock screen; then, at 60, back down to the pan, and the fork goes on
        const look = key(tt, [[60.2, 1], [60.8, 0, 'inOutSine']]);
        const fork = tt < 60.6 ? 0.22 : 0.08 + 0.08 * Math.sin((tt - 60.6) * 9);
        const face = Object.assign(faceFor(look), { smile: tt < 60 ? key(tt, [[53, 0.25], [55, 0.375]]) : 0.125, lids: tt < 60.2 ? 0.7 : 0.6 });
        him(c, 'counter', 'main', lt, { fork, face });
        drawPropped(c, 'counter', 'main', lt);
        V.front(c, lt, NIGHT);
        nearEdge(c);
      } },
    ],
  });
})();
