/* SEVEN DAYS OF NO — the art adapter (global ART). Sequences never call the kits directly: they call c.set / c.setFront /
   c.fig / c.prop, which use the real art when it is loaded (SETS from kit/sets.js, POV.figure from kit/pov.js) and draw clean,
   labelled placeholders when it is not (a box per set, a capsule per character), so the timeline always scrubs.

   c.set(name, opts)   -> SETS[name](g, opts): office | living | street | plain | party | kitchen | boxes (placeholder until built).
                          office: { view: 'desk'|'door', night, clock: '5:30' }; living: { tod: 'evening'|'morning'|'dusk', todTo,
                          todK, bird, table }. The shot's camera (c.camera) is handed to the set as opts.cam, so a zoomed set is
                          drawn at full resolution. Returns the set's result; its anchors are read with c.anchor(set, name).
   c.setFront(name, o) -> SETS[name + 'Front'](g, o): what stands in front of the characters (the desk, the coffee table).
   c.fig(who, opts)    -> POV.figure(g, who, ...). (x, y) is the ground point between the feet; s = 1 is 800 px tall.
                          opts: x, y, s, face (1 right, -1 left), pose, expr, walk (strides; or phase in cycles), mouth, talk:
                          [t0, t1] (mouth from the narration), blink, blinks: [times], nod, look, turn, hold (POV holding),
                          mode (hold_phone: ear|show|out|front), seat, view (sit: side|front), tint, shadow, alpha, dx, dy,
                          tremble (px), rot, marks, override. Returns the opts with A = the figure's anchors in world space
                          (head, headR, headTop, mouth, handL, handR).
                          poses: POV.POSES (stand walk think point wave shrug hands_clasped thumbs_up hand_mouth hold_phone
                          hold_laptop hold_clipboard hold_box sit) plus the engine's: run, handup, stomach, peace, type.
                          exprs: POV.EXPR (neutral happy surprised confused tired angry sad scared guilty tired_closed worried)
                          plus beaming (= happy) and calm (= neutral). */
(function (global) {
  'use strict';
  const FILM = global.FILM, W = FILM.WIDTH, H = FILM.HEIGHT;
  const setsKit = () => (typeof global.SETS !== 'undefined' && global.SETS) || null;
  const pov = () => (typeof global.POV !== 'undefined' && global.POV && typeof global.POV.figure === 'function') ? global.POV : null;
  const FONT = (global.SETS && global.SETS.FONT) || "'Nunito', 'Inter', 'Liberation Sans', system-ui, sans-serif";
  const INK = '#1c1c1c';
  const PAL = () => (global.POV && global.POV.C) || {};
  const ART = global.ART = { FONT, INK, placeholders: { set: {}, fig: {} } };

  // ---------------------------------------------------------------- anchors (world px): the kits' names, these values until a set reports its own
  const A = (x, y, s) => ({ x, y, s: s || 1 });
  ART.ANCHORS = {
    office: { left: A(318, 962), right: A(1618, 962), center: A(900, 962), desk: A(1186, 617), deskPhone: A(1265, 612), chair: A(1560, 760), floor: A(960, 962), door: A(318, 962), doorway: A(318, 962, 0.95), window: A(1552, 307), clock: A(960, 212), plant: A(704, 837) },
    living: { sofa: A(670, 742), sofa_seat_l: A(500, 742), sofa_seat_r: A(840, 742), table: A(1075, 848), tablePhone: A(1180, 846), door: A(1619, 975), window: A(527, 307), lamp: A(120, 326), plant: A(1275, 866), left: A(330, 990), right: A(1560, 990), center: A(960, 990), floor: A(960, 990) },
    street: { left: A(640, 975), right: A(1280, 975), center: A(960, 975), floor: A(960, 975), tree: A(380, 640), post: A(150, 700) },
    plain: { center: A(960, 540), floor: A(960, 1080) },
    party: { left: A(480, 985), center: A(800, 985), right: A(1560, 985), table: A(1310, 636), behindTable: A(1310, 930, 0.95), floor: A(960, 985) },
    mumKitchen: { center: A(960, 985), left: A(600, 985), right: A(1320, 985), counter: A(960, 620), window: A(1000, 285), island: A(960, 836), floor: A(960, 985) },
    friendFlat: { center: A(960, 985), left: A(640, 985), right: A(1300, 985), window: A(1510, 335), boxes: A(280, 600), floor: A(960, 985) },
  };
  // c.anchor(set, name) -> {x, y, s} in world px: the set's own anchors (as it last reported them) or the defaults above
  ART.anchor = function (set, name, fb, c) {
    const r = c && c.sets && c.sets[set]; const a = r && r.anchorsSet && r.anchorsSet[name];
    if (a) return { x: a.x, y: a.y, s: a.s || 1 };
    const d = ART.ANCHORS[set] && ART.ANCHORS[set][name]; if (d) return Object.assign({}, d);
    if (fb) return Array.isArray(fb) ? A(fb[0], fb[1], fb[2]) : fb;
    FILM.warn('anchor ' + set + '.' + name + ' unknown'); return A(W / 2, H / 2);
  };

  // ---------------------------------------------------------------- sets
  function callSet(c, fn, o) {
    // hand the shot's camera to the set (it draws its cached layer at the zoom's resolution and clamps as c.camera does);
    // a split-screen half (dx/dy) or a rotated camera keeps the set under the current transform instead
    const cam = c._cam;
    if (cam && !cam.dx && !cam.dy && !cam.rot && cam.zoom >= 1) {
      c.reset(); const r = fn(c.g, Object.assign({}, o, { cam: { x: cam.x, y: cam.y, zoom: cam.zoom } })); c.camera(cam); return r;
    }
    return fn(c.g, o);
  }
  ART.set = function (c, name, o) {
    o = Object.assign({ t: c.t }, o); const S = setsKit(), fn = S && typeof S[name] === 'function' ? S[name] : null;
    if (fn) { try { const r = callSet(c, fn, o); if (r) c.sets[name] = r; return r; } catch (e) { FILM.warn('SETS.' + name + ': ' + e.message); } }
    ART.placeholders.set[name] = 1; placeholderSet(c, name, o); return null;
  };
  ART.setFront = function (c, name, o) {
    o = Object.assign({ t: c.t }, o); const S = setsKit(), fn = S && typeof S[name + 'Front'] === 'function' ? S[name + 'Front'] : null;
    if (fn) { try { return callSet(c, fn, o); } catch (e) { FILM.warn('SETS.' + name + 'Front: ' + e.message); } }
    return null;
  };
  // the figure tint a set suggests for its light (the living room's evening multiply), or null
  ART.tintFor = function (c, name) { const r = c.sets[name]; return r && r.tint ? r.tint : null; };

  const TOD = { day: 0, morning: 0.05, evening: 0.18, dusk: 0.3, night: 0.5 };
  function placeholderSet(c, name, o) {
    const g = c.g, P = PAL();
    if (name === 'mumKitchen' && global.GFX) return global.GFX.kitchen(g);
    if (name === 'friendFlat' && global.GFX) return global.GFX.movingFlat(g);
    if (name === 'party') name = 'party';
    const key = 'ph|set|' + name + '|' + (o.tod || '') + '|' + (o.night ? 'n' : '') + '|' + (o.view || '');
    const cv = FILM.cache(key, (q) => {
      const box = (x, y, w, h, fill, lw) => { q.fillStyle = fill; q.fillRect(x, y, w, h); if (lw !== 0) { q.lineWidth = lw || 3.5; q.strokeStyle = INK; q.strokeRect(x, y, w, h); } };
      if (name === 'office') {
        box(0, 0, W, H, P.officeWallBack || '#FBEABF', 0); box(0, 0, 470, 962, P.officeWallSide || '#FCC374'); box(0, 962, W, 118, P.officeFloor || '#FDB569');
        box(1284, 84, 537, 446, o.night ? '#3B4A78' : (P.glassLow || '#FFE3B5')); box(1000, 610, 380, 24, P.officeDesk || '#EE8E5C'); box(1050, 400, 120, 200, P.officeMonitor || '#B6CEE6');
      } else if (name === 'living') {
        box(0, 0, W, H, P.livWall || '#C19280', 0); box(0, 900, W, 180, P.livFloor || '#B9714B'); box(382, 127, 289, 360, o.tod === 'morning' ? '#CFE6F0' : (P.glassTop || '#FDCDB0'));
        box(1500, 360, 240, 615, P.door || '#935A47'); box(330, 640, 680, 230, P.sofa || '#A9684C'); box(960, 830, 300, 26, P.table || '#CD8B5F');
      } else if (name === 'street') {
        box(0, 0, W, H, P.stSky || '#FCE9A7', 0); box(0, 90, 760, 780, P.stBrickBldg || '#B5714A'); box(1500, 0, 420, 870, P.stRight || '#E77944'); box(760, 260, 740, 610, P.stTan || '#BD8249');
        box(0, 870, W, 210, P.stPave || '#FBE689'); q.fillStyle = P.stTree || '#81A73A'; q.beginPath(); q.ellipse(380, 470, 170, 220, 0, 0, Math.PI * 2); q.fill(); q.lineWidth = 3.5; q.strokeStyle = INK; q.stroke(); box(360, 650, 40, 230, P.stTrunk || '#9D6B3B'); box(130, 300, 34, 580, P.stPost || '#A9A8A3');
      } else if (name === 'plain') { q.fillStyle = '#9DCFC6'; q.fillRect(0, 0, W, H); }
      else if (name === 'party') {
        box(0, 0, W, H, '#F6C9A0', 0); box(0, 900, W, 180, '#E39A6A'); const cols = ['#E37F78', '#77CC81', '#7BAFE1', '#F4BF54'];
        for (let k = 0; k < 2; k++) for (let i = 0; i < 20; i++) { q.fillStyle = cols[(i + k) % 4]; q.beginPath(); const x0 = i * 100 - k * 50, y0 = 70 + k * 90 + Math.sin(i * 0.9) * 10; q.moveTo(x0, y0); q.lineTo(x0 + 80, y0); q.lineTo(x0 + 40, y0 + 64); q.closePath(); q.fill(); q.lineWidth = 3; q.strokeStyle = INK; q.stroke(); }
      } else if (name === 'kitchen') { box(0, 0, W, H, '#F7DDB0', 0); box(0, 900, W, 180, '#D9A06E'); box(80, 600, 900, 300, '#E9B07A'); box(80, 130, 900, 260, '#F1C48F'); box(1180, 150, 380, 300, '#CFE6F0'); }
      else if (name === 'boxes') {
        box(0, 0, W, H, '#EBD7BE', 0); box(0, 900, W, 180, '#C9A27E');
        [[260, 650, 300, 250], [300, 430, 240, 220], [1300, 670, 320, 230], [1350, 470, 260, 200], [1420, 310, 180, 160]].forEach(b => { box(b[0], b[1], b[2], b[3], P.box || '#C9995F'); q.fillStyle = P.tape || '#E3C38E'; q.fillRect(b[0] + b[2] / 2 - 18, b[1] + 2, 36, b[3] - 4); });
      } else box(0, 0, W, H, '#DDD', 0);
      const k = o.night ? 0.5 : (TOD[o.tod] || 0); if (k && name !== 'plain') { q.fillStyle = `rgba(40,30,70,${k})`; q.fillRect(0, 0, W, H); }
      if (name !== 'plain') { q.font = `800 28px ${FONT}`; q.fillStyle = 'rgba(28,28,28,.5)'; q.textAlign = 'left'; q.textBaseline = 'top'; q.fillText('SET ' + name + (o.tod ? ' · ' + o.tod : '') + (o.night ? ' · night' : '') + ' (placeholder)', 24, 18); }
    });
    g.drawImage(cv, 0, 0);
    if (name === 'office' && o.clock) clockFace(g, 960, 212, 95, o.clock);
  }
  function clockFace(q, x, y, r, hm) {
    const P = global.SETS && global.SETS.clock; if (P) return P(q, x, y, r, hm);
    const [h, m] = String(hm).split(':').map(Number);
    q.save(); q.fillStyle = '#FDFEFA'; q.beginPath(); q.arc(x, y, r, 0, Math.PI * 2); q.fill(); q.lineWidth = 9; q.strokeStyle = '#A3ADB8'; q.stroke();
    const ah = ((h % 12) + (m || 0) / 60) / 12 * Math.PI * 2, am = (m || 0) / 60 * Math.PI * 2; q.lineCap = 'round'; q.strokeStyle = INK;
    q.lineWidth = 7; q.beginPath(); q.moveTo(x, y); q.lineTo(x + Math.sin(ah) * r * 0.5, y - Math.cos(ah) * r * 0.5); q.stroke();
    q.lineWidth = 5; q.beginPath(); q.moveTo(x, y); q.lineTo(x + Math.sin(am) * r * 0.78, y - Math.cos(am) * r * 0.78); q.stroke(); q.restore();
  }
  ART.clock = clockFace;

  // ---------------------------------------------------------------- characters
  const SEED = { hero: 1, boss: 2, friend: 3, mum: 4, coworker: 5, stranger: 6 };
  const EXPR_ALIAS = { beaming: 'happy', calm: 'neutral', honest: 'happy' };
  // the engine's poses beyond POV.POSES, built from the kit's own (pose functions take the figure opts)
  const EXTRA = {
    run: (P, o) => Object.assign(P.POSES.walk(Object.assign({}, o, { stride: o.stride || 0.72 })), { lean: 0.14 }),
    handup: (P, o) => Object.assign(P.POSES.stand(o), { armR: { a: 1.0, e: 1.75, hand: 'open', flip: 1 } }),
    stomach: (P, o) => Object.assign(P.POSES.stand(o), { head: { tilt: 0.06, sink: 4 }, armR: { ik: [-6, -104], bend: -1, ul: 0.9, hand: 'flat', flip: -1, hrot: 0.4 } }),
    peace: (P, o) => Object.assign(P.POSES.stand(o), { armR: { a: 2.55, e: 0.35, hand: 'point', flip: 1 } }),
    type: (P, o) => P.POSES.sit(Object.assign({}, o, { view: 'side' })),
    // "No": a flat palm out at chest height (the kit's pose 'no' replaces this when it lands)
    no: (P, o) => Object.assign(P.POSES.stand(o), { armR: { ik: [170, -112], bend: 1, ul: 0.95, hand: 'open', flip: 1, hrot: -1.45 } }),
    finger_up: (P, o) => Object.assign(P.POSES.stand(o), { armR: { a: 2.25, e: 0.95, hand: 'point', flip: 1 } }),
    push_away: (P, o) => Object.assign(P.POSES.stand(o), { armR: { a: 1.45, e: 0.15, hand: 'open', flip: 1 }, armL: { a: 1.3, e: 0.25, hand: 'open', flip: 1, z: 'back' } }),
    hold_card: (P, o) => Object.assign(P.POSES.hold_box(o), { prop: null }),
    // seated on the sofa: POV's three-quarter sofa sit (refs 03, 07), with the props' arms from POV.HOLD
    sit_front: (P, o) => sofa(P, o),
    sit_phone: (P, o) => { const b = sofa(P, o); return Object.assign(b, P.HOLD.phone_ear ? P.HOLD.phone_ear(b, o) : {}); },
    sit_laptop: (P, o) => { const b = sofa(P, o); return Object.assign(b, P.HOLD.laptop ? P.HOLD.laptop(b, o) : {}); },
    sit_stomach: (P, o) => Object.assign(sofa(P, o), { head: { tilt: 0.08, sink: 6, turn: 0.2 }, armR: { ik: [40, -100], bend: -1, ul: 0.9, hand: 'flat', flip: -1, hrot: 0.6 } }),
    sit_handup: (P, o) => Object.assign(sofa(P, o), { armR: { a: 1.0, e: 1.75, hand: 'open', flip: 1 } }),
  };
  const sofa = (P, o) => P.POSES.sit_sofa ? P.POSES.sit_sofa(o) : P.POSES.sit(Object.assign({}, o, { view: 'front' }));
  ART.fig = function (c, who, o) {
    const t = c.t, g = c.g; const op = Object.assign({}, o); op.t = t; op.s = op.s || 1; op.face = op.face === -1 ? -1 : 1;
    if (op.x == null) op.x = W / 2; if (op.y == null) op.y = 962;
    if (op.mouth == null) op.mouth = op.talk ? FILM.talk(t, op.talk) : 0;
    if (op.blink == null) op.blink = op.blinks ? FILM.blinkAt(t, op.blinks) : (op.noBlink ? 0 : FILM.blink(t, SEED[who] || 9));
    g.save();
    const toWorld = g.getTransform().inverse();
    if (op.alpha != null) g.globalAlpha *= FILM.clamp(op.alpha, 0, 1);
    let dx = op.dx || 0, dy = op.dy || 0;
    if (op.tremble) { const tr = FILM.tremble(t, op.tremble, SEED[who] || 3); dx += tr.dx; dy += tr.dy; }
    if (dx || dy) g.translate(dx, dy);
    if (op.rot) { g.translate(op.x, op.y); g.rotate(op.rot); g.translate(-op.x, -op.y); }
    const P = pov(); let out = null;
    if (P) {
      let pose = op.pose || 'stand';
      if (typeof pose === 'string' && !P.POSES[pose]) { const ex = EXTRA[pose] || EXTRA[{ running: 'run', typing: 'type' }[pose]]; pose = ex ? (oo => ex(P, oo)) : (P.POSES[POSE_ALIAS[pose]] ? POSE_ALIAS[pose] : 'stand'); }
      const phase = op.phase != null ? op.phase : op.walk != null ? op.walk / 2 : (op.pose === 'wave' ? t * 1.4 : 0);
      const po = { x: op.x, y: op.y, scale: op.s, facing: op.face, pose, phase, expr: EXPR_ALIAS[op.expr] || op.expr || 'neutral', look: op.look, blink: op.blink, mouth: op.mouth,
        turn: op.turn, nod: op.nod, holding: op.hold, tint: op.tint || null, shadow: op.shadow === false ? null : (op.shadow || (op.y < H + 40 ? 'rgba(140,70,20,0.18)' : null)),
        marks: op.marks, override: op.override, prop: op.prop, drawProp: op.drawProp, face: op.faceOver, mode: op.mode, seat: op.seat, view: op.view, stride: op.stride, lw: op.lw,
        seatAt: op.seatAt, thigh: op.thigh, q: op.q };
      try { out = P.figure(g, who, po); } catch (e) { FILM.warn('POV.figure(' + who + '): ' + e.message); out = null; }
    }
    if (!out) { ART.placeholders.fig[who] = 1; placeholderFig(g, who, op); out = placeholderAnchors(op); }
    else {
      // the kit reports device pixels: bring them back to the caller's world space
      const wp = p => { const q = toWorld.transformPoint(new DOMPoint(p[0], p[1])); return [q.x, q.y]; };
      const o2 = { head: wp(out.head), headTop: wp(out.headTop), mouth: wp(out.mouth), handL: wp(out.handL), handR: wp(out.handR), pelvis: wp(out.pelvis), headR: out.headR };
      ['seat', 'lap', 'knee', 'feet'].forEach(k => { if (out[k]) o2[k] = wp(out[k]); }); out = o2;
    }
    g.restore();
    op.A = out; return op;
  };
  const POSE_ALIAS = { standing: 'stand', walking: 'walk', thinking: 'think', pointing: 'point', waving: 'wave', clasped: 'hands_clasped', thumbsup: 'thumbs_up', handmouth: 'hand_mouth', phone: 'hold_phone', clipboard: 'hold_clipboard', laptop: 'hold_laptop', box: 'hold_box', sitting: 'sit', holding: 'stand' };
  // the head and hands of a drawn figure (world px): from its anchors when c.fig has drawn it, else from proportions
  ART.head = function (who, op) {
    if (op && op.A) return { x: op.A.head[0], y: op.A.head[1], r: op.A.headR, top: op.A.headTop };
    const pa = placeholderAnchors(Object.assign({ s: 1, face: 1, x: 0, y: 0 }, op)); return { x: pa.head[0], y: pa.head[1], r: pa.headR };
  };
  ART.hand = function (who, op, which) {
    const A2 = (op && op.A) || placeholderAnchors(Object.assign({ s: 1, face: 1, x: 0, y: 0 }, op));
    const p = which === 'back' ? A2.handL : A2.handR; return { x: p[0], y: p[1] };
  };
  function placeholderAnchors(o) {
    const s = o.s || 1, Hh = 800 * s, r = 100 * s, f = o.face || 1, sit = /sit|type|sip/.test(o.pose || '');
    const hy = (o.y || 0) - Hh + r + (sit ? 0.2 * Hh : 0);
    return { head: [(o.x || 0), hy], headTop: [(o.x || 0), hy - r], headR: r, mouth: [(o.x || 0) + f * 0.2 * r, hy + 0.5 * r], handR: [(o.x || 0) + f * 0.2 * Hh, (o.y || 0) - 0.5 * Hh], handL: [(o.x || 0) - f * 0.16 * Hh, (o.y || 0) - 0.5 * Hh], pelvis: [(o.x || 0), (o.y || 0) - 0.41 * Hh] };
  }
  const CAST = {
    hero: { body: '#3A8594', legs: '#FFFFFF', head: '#FCEBCB', top: null, label: 'HERO' }, boss: { body: '#FFFFFF', legs: '#7B7C7C', head: '#FCEBCB', top: '#A6A6A6', label: 'BOSS' },
    friend: { body: '#D14A44', legs: '#5D8FAE', head: '#FCEBCB', top: '#3A3A3A', label: 'FRIEND' }, mum: { body: '#EC9547', legs: '#7E5C43', head: '#FCEBCB', top: '#755438', label: 'MOM' },
    coworker: { body: '#6EA179', legs: '#DBC39E', head: '#CBA17C', top: '#2E2420', label: 'COWORKER' }, stranger: { body: '#6E5893', legs: '#6191AF', head: '#FCEBCB', top: '#DAC7A2', label: 'STRANGER' },
  };
  // the placeholder: a capsule body, a round head with dot eyes (lines when blinking) and a mouth that opens, the name on the chest
  function placeholderFig(g, who, o) {
    const K = CAST[who] || { body: '#bbb', legs: '#888', head: '#eee', label: String(who).toUpperCase() };
    const s = o.s, Hh = 800 * s, f = o.face, x = o.x, y = o.y, pose = String(o.pose || 'stand'), sit = /sit|type|sip/.test(pose);
    const pa = placeholderAnchors(o), r = pa.headR, lw = Math.max(2, 5 * s); const hipY = sit ? y - 0.3 * Hh : y - 0.42 * Hh;
    g.lineJoin = 'round'; g.lineCap = 'round';
    const ph = (o.walk || 0) * Math.PI, moving = /walk|run/.test(pose);
    for (const sd of [-1, 1]) { const sw = moving ? Math.sin(ph) * sd * 0.12 * Hh : 0; g.beginPath(); g.moveTo(x + sd * 0.05 * Hh, hipY); if (sit) { g.lineTo(x + f * 0.2 * Hh, hipY); g.lineTo(x + f * 0.2 * Hh, y); } else g.lineTo(x + sd * 0.06 * Hh + sw, y); g.lineWidth = 0.075 * Hh; g.strokeStyle = INK; g.stroke(); g.lineWidth = 0.075 * Hh - 2 * lw; g.strokeStyle = K.legs; g.stroke(); }
    const bt = pa.head[1] + r * 0.9, bw = 0.3 * Hh; g.beginPath(); g.roundRect(x - bw / 2, bt, bw, hipY + 0.03 * Hh - bt, bw * 0.38); g.fillStyle = K.body; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.arc(pa.head[0], pa.head[1], r, 0, Math.PI * 2); g.fillStyle = K.head; g.fill(); g.stroke();
    if (K.top) { g.beginPath(); g.arc(pa.head[0], pa.head[1], r, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fillStyle = K.top; g.fill(); g.stroke(); }
    g.fillStyle = INK; for (const k of [-1, 1]) { const ex = pa.head[0] + f * 0.2 * r + k * 0.32 * r; if (o.blink > 0.5) { g.beginPath(); g.moveTo(ex - 0.1 * r, pa.head[1]); g.lineTo(ex + 0.1 * r, pa.head[1]); g.stroke(); } else { g.beginPath(); g.arc(ex, pa.head[1], 0.08 * r, 0, Math.PI * 2); g.fill(); } }
    const m = o.mouth || 0; g.beginPath(); g.ellipse(pa.mouth[0], pa.mouth[1], 0.16 * r, 0.03 * r + 0.16 * r * m, 0, 0, Math.PI * 2); g.fillStyle = '#5E2323'; g.fill(); g.stroke();
    g.font = `800 ${Math.max(12, Math.round(30 * s))}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = INK; g.fillText(K.label, x, (bt + hipY) / 2);
    g.font = `600 ${Math.max(10, Math.round(20 * s))}px ${FONT}`; g.fillText(pose + (o.expr && o.expr !== 'neutral' ? ' · ' + o.expr : ''), x, y + 22 * s);
  }

  // ---------------------------------------------------------------- props
  // c.prop(name, {x, y, s, a, ...}): POV.PROPS[name] (phone phoneFlat laptop laptopSide clipboard box mug notif chatBubble bell buzz
  // thought plateIcon bulb clock flash shadow) when the kit has it, else the engine's GFX drawing of that name
  ART.prop = function (c, name, o) {
    const P = global.POV; o = Object.assign({ t: c.t }, o);
    const fn = P && P.PROPS && typeof P.PROPS[name] === 'function' ? P.PROPS[name] : null;
    if (fn) { try { c.g.save(); fn(c.g, o.x || 0, o.y || 0, o); c.g.restore(); return; } catch (e) { c.g.restore(); FILM.warn('POV.PROPS.' + name + ': ' + e.message); } }
    if (global.GFX && global.GFX.prop) global.GFX.prop(c.g, name, o);
  };
  ART.report = () => ({ sets: Object.keys(ART.placeholders.set), figures: Object.keys(ART.placeholders.fig) });
})(window);
