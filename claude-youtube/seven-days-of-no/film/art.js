/* SEVEN DAYS OF NO — the art adapter (global ART). Sequences never call the kits directly: they call c.set / c.fig / c.prop,
   which use the real art when it is loaded (SETS from kit/sets.js, POV.figure from kit/pov.js) and draw clean, labelled
   placeholders until then, so the whole timeline can be scrubbed before the art exists and the art drops in without edits.

   Conventions the kits are called with (world space 1920x1080, under the shot's camera):
   - c.set(name, opts): name in office | living | street | plain | party | kitchen | boxes. opts: { tod: 'day'|'evening'|'night'|
     'morning'|'dusk', clock: '5:30', t, view, ...anything the set understands }. c.setFront(name, opts) draws what stands in
     front of the characters (a desk edge, the sofa arm), if the set has such a layer.
   - c.fig(who, opts): who in hero | boss | friend | mum | coworker | stranger. (x, y) is the ground point between the feet,
     s = 1 is 800 px tall (POV.figure's scale). opts: { x, y, s, face: 1 right / -1 left, pose, expr, mouth 0..1, blink 0..1,
     walk (phase in strides), look, hold, nod, tint, t }. The adapter fills mouth (from talk: [t0, t1]) and blink (seeded per
     character, or blinks: [times]) when they are not given, and applies alpha, dx/dy and tremble itself.
     poses: standing walking running thinking pointing sitting holding phone (to ear) typing waving shrug handup handmouth
            stomach clasped sip thumbsup peace nodding clipboard
     exprs: neutral happy beaming surprised confused tired angry sad scared calm guilty
   - c.prop(name, opts): a prop drawn on its own (phone, laptop, mug, box, plate, banknote, pot_helmet, pan, party_hat, cup).
   - c.anchor(set, name): a point the set exposes (SETS[set].anchors[name]); the defaults below until the set provides it. */
(function (global) {
  'use strict';
  const FILM = global.FILM, W = FILM.W, H = FILM.H;
  const has = () => typeof global.SETS !== 'undefined' && global.SETS;
  const pov = () => typeof global.POV !== 'undefined' && global.POV && typeof global.POV.figure === 'function' ? global.POV : null;
  const FONT = '"Inter", "Inter Display", "Liberation Sans", system-ui, sans-serif';
  const INK = '#1c1c1c';
  const PAL = () => (global.POV && global.POV.C) || {};
  const ART = global.ART = { FONT, INK, placeholders: { set: {}, fig: {} } };

  // ---------------------------------------------------------------- anchors: where things are in each set (world px)
  // Sets should expose SETS[name].anchors with the same names; these defaults place the placeholders and the choreography.
  ART.ANCHORS = {
    office: { floor: [960, 950], desk: [1130, 640], chair: [1360, 940], monitor: [1050, 470], clock: [930, 200], window: [1370, 300], door: [190, 950], doorway: [200, 950], plant: [640, 800] },
    living: { floor: [960, 960], sofa: [860, 920], seat: [860, 760], table: [1300, 880], phone: [1300, 820], window: [830, 270], lamp: [250, 520], door: [1620, 960] },
    street: { floor: [960, 960], tree: [380, 640], post: [150, 700], left: [640, 960], right: [1280, 960] },
    plain: { floor: [960, 1080], centre: [960, 540] },
    party: { floor: [960, 960] }, kitchen: { floor: [960, 960] }, boxes: { floor: [960, 960] },
  };
  ART.anchor = function (set, name, fb) {
    const S = has() && global.SETS[set]; const a = S && S.anchors && S.anchors[name];
    return a || (ART.ANCHORS[set] && ART.ANCHORS[set][name]) || fb || [W / 2, H / 2];
  };

  // ---------------------------------------------------------------- sets
  function callSet(S, layer, c, o) {
    if (!S) return false;
    const fn = layer === 'front' ? (S.front || null) : (typeof S === 'function' ? S : (S.draw || S.back || null));
    if (typeof fn !== 'function') return false;
    try { fn.call(S, c.g, o, c); return true; } catch (e) { FILM.warn('SETS.' + o._name + (layer === 'front' ? '.front' : '') + ': ' + e.message); return false; }
  }
  ART.set = function (c, name, o) {
    o = Object.assign({ t: c.t, _name: name }, o);
    if (has() && callSet(global.SETS[name], 'back', c, o)) return;
    ART.placeholders.set[name] = 1; placeholderSet(c, name, o);
  };
  ART.setFront = function (c, name, o) {
    o = Object.assign({ t: c.t, _name: name }, o);
    if (has() && global.SETS[name]) { callSet(global.SETS[name], 'front', c, o); return; }
    placeholderFront(c, name, o);
  };

  const TOD = { day: 0, morning: 0.05, evening: 0.18, dusk: 0.3, night: 0.5 };
  function placeholderSet(c, name, o) {
    const g = c.g, P = PAL();
    const key = 'ph|set|' + name + '|' + (o.tod || '') + '|' + (o.clock || '') + '|' + (o.view || '');
    const cv = FILM.cache(key, (q) => {
      const box = (x, y, w, h, fill, lw) => { q.fillStyle = fill; q.fillRect(x, y, w, h); q.lineWidth = lw || 3.5; q.strokeStyle = INK; q.strokeRect(x, y, w, h); };
      if (name === 'office') {
        box(0, 0, W, H, P.officeWallBack || '#FBEABF', 0); box(0, 0, 470, 820, P.officeWallSide || '#FCC374');
        box(0, 820, W, 260, P.officeFloor || '#FDB569');
        box(1180, 110, 400, 400, o.tod === 'night' ? '#3B4A78' : (P.glassLow || '#FFE3B5')); q.beginPath(); q.moveTo(1380, 110); q.lineTo(1380, 510); q.stroke();
        clock(q, 930, 200, 82, o.clock || '5:00');
        box(990, 600, 320, 26, P.officeDesk || '#EE8E5C'); box(1030, 626, 240, 230, P.officeDesk || '#EE8E5C'); box(1010, 400, 120, 190, P.officeMonitor || '#B6CEE6');
        box(600, 740, 90, 110, P.officePot || '#B6D0EA'); q.fillStyle = P.leaf || '#87A26A'; q.beginPath(); q.ellipse(645, 650, 60, 100, 0, 0, Math.PI * 2); q.fill(); q.stroke();
        box(60, 380, 300, 34, P.officeDesk || '#EE8E5C');
      } else if (name === 'living') {
        box(0, 0, W, H, P.livWall || '#C19280', 0); box(0, 840, W, 240, P.livFloor || '#B9714B');
        box(640, 110, 380, 330, o.tod === 'night' ? '#3B4A78' : o.tod === 'morning' ? '#CFE6F0' : (P.glassTop || '#FDCDB0'));
        box(1500, 330, 240, 510, P.door || '#935A47'); box(520, 610, 680, 250, P.sofa || '#A9684C'); box(470, 650, 90, 210, P.sofaMid || '#915647'); box(1160, 650, 90, 210, P.sofaMid || '#915647');
        box(1150, 800, 300, 26, P.table || '#CD8B5F'); box(1180, 826, 22, 80, P.tableSh || '#9C6752'); box(1400, 826, 22, 80, P.tableSh || '#9C6752');
        box(240, 300, 24, 560, P.lampPole || '#9B8981'); q.fillStyle = P.lampShade || '#FCB953'; q.beginPath(); q.moveTo(180, 300); q.lineTo(320, 300); q.lineTo(290, 200); q.lineTo(210, 200); q.closePath(); q.fill(); q.stroke();
      } else if (name === 'street') {
        box(0, 0, W, H, P.stSky || '#FCE9A7', 0); box(0, 90, 760, 760, P.stBrickBldg || '#B5714A'); box(1500, 0, 420, 860, P.stRight || '#E77944'); box(760, 260, 740, 590, P.stTan || '#BD8249');
        box(0, 850, W, 230, P.stPave || '#FBE689'); q.fillStyle = P.stTree || '#81A73A'; q.beginPath(); q.ellipse(380, 470, 170, 220, 0, 0, Math.PI * 2); q.fill(); q.stroke(); box(360, 650, 40, 220, P.stTrunk || '#9D6B3B');
        box(130, 300, 34, 580, P.stPost || '#A9A8A3');
      } else if (name === 'plain') {
        q.fillStyle = '#9ED3CF'; q.fillRect(0, 0, W, H);
      } else if (name === 'party') {
        box(0, 0, W, H, '#F6C9A0', 0); box(0, 840, W, 240, '#E39A6A');
        const cols = ['#E37F78', '#77CC81', '#7BAFE1', '#F4BF54'];
        for (let k = 0; k < 3; k++) for (let i = 0; i < 18; i++) { q.fillStyle = cols[(i + k) % 4]; q.beginPath(); q.moveTo(i * 110 - k * 30, 60 + k * 70); q.lineTo(i * 110 + 90 - k * 30, 60 + k * 70); q.lineTo(i * 110 + 45 - k * 30, 130 + k * 70); q.closePath(); q.fill(); q.lineWidth = 2.4; q.stroke(); }
      } else if (name === 'kitchen') {
        box(0, 0, W, H, '#F7DDB0', 0); box(0, 840, W, 240, '#D9A06E'); box(80, 520, 900, 320, '#E9B07A'); box(80, 120, 900, 260, '#F1C48F'); box(1200, 160, 360, 300, '#CFE6F0');
      } else if (name === 'boxes') {
        box(0, 0, W, H, '#EBD7BE', 0); box(0, 840, W, 240, '#C9A27E');
        [[260, 600, 300, 250], [300, 380, 240, 220], [1300, 620, 320, 230], [1350, 420, 260, 200], [1420, 260, 180, 160]].forEach(b => { box(b[0], b[1], b[2], b[3], P.box || '#C9995F'); q.fillStyle = P.tape || '#E3C38E'; q.fillRect(b[0] + b[2] / 2 - 18, b[1], 36, b[3]); });
      } else { box(0, 0, W, H, '#DDD', 0); }
      // dim for the time of day
      const k = TOD[o.tod] || 0; if (k && name !== 'plain') { q.fillStyle = `rgba(40,30,70,${k})`; q.fillRect(0, 0, W, H); }
      // the placeholder label
      q.font = `700 30px ${FONT}`; q.fillStyle = 'rgba(28,28,28,.55)'; q.textAlign = 'left'; q.textBaseline = 'top';
      q.fillText('SET ' + name + (o.tod ? ' · ' + o.tod : '') + (o.view ? ' · ' + o.view : '') + ' (placeholder)', 24, 18);
    });
    g.drawImage(cv, 0, 0);
  }
  function placeholderFront(c, name, o) { /* placeholders have no front layer */ }
  function clock(q, x, y, r, hm) {
    const [h, m] = String(hm).split(':').map(Number);
    q.fillStyle = '#FDFEFA'; q.beginPath(); q.arc(x, y, r, 0, Math.PI * 2); q.fill(); q.lineWidth = 9; q.strokeStyle = '#A3ADB8'; q.stroke(); q.lineWidth = 3; q.strokeStyle = INK; q.beginPath(); q.arc(x, y, r + 5, 0, Math.PI * 2); q.stroke();
    const ah = ((h % 12) + (m || 0) / 60) / 12 * Math.PI * 2, am = (m || 0) / 60 * Math.PI * 2; q.lineCap = 'round';
    q.lineWidth = 7; q.beginPath(); q.moveTo(x, y); q.lineTo(x + Math.sin(ah) * r * 0.5, y - Math.cos(ah) * r * 0.5); q.stroke();
    q.lineWidth = 5; q.beginPath(); q.moveTo(x, y); q.lineTo(x + Math.sin(am) * r * 0.78, y - Math.cos(am) * r * 0.78); q.stroke();
  }
  ART.clock = clock;

  // ---------------------------------------------------------------- characters
  const CAST = {
    hero: { body: '#3A8594', legs: '#FFFFFF', head: '#FCEBCB', top: null, label: 'HERO' },
    boss: { body: '#FFFFFF', legs: '#7B7C7C', head: '#FCEBCB', top: '#A6A6A6', label: 'BOSS' },
    friend: { body: '#D14A44', legs: '#5D8FAE', head: '#FCEBCB', top: '#3A3A3A', label: 'FRIEND' },
    mum: { body: '#EC9547', legs: '#7E5C43', head: '#FCEBCB', top: '#755438', label: 'MUM' },
    coworker: { body: '#6EA179', legs: '#DBC39E', head: '#CBA17C', top: '#2E2420', label: 'COWORKER' },
    stranger: { body: '#6E5893', legs: '#6191AF', head: '#FCEBCB', top: '#DAC7A2', label: 'STRANGER' },
  };
  const SEED = { hero: 1, boss: 2, friend: 3, mum: 4, coworker: 5, stranger: 6 };
  ART.fig = function (c, who, o) {
    const t = c.t; const op = Object.assign({}, o); op.t = t; op.s = op.s || 1; op.face = op.face || 1;
    if (op.x == null) op.x = W / 2; if (op.y == null) op.y = 950;
    if (op.mouth == null) op.mouth = op.talk ? FILM.talk(t, op.talk) : 0;
    if (op.blink == null) op.blink = op.blinks ? FILM.blinkAt(t, op.blinks) : (op.noBlink ? 0 : FILM.blink(t, SEED[who] || 9));
    if (op.breath == null) op.breath = FILM.breath(t, SEED[who] || 0);
    const g = c.g; g.save();
    if (op.alpha != null) g.globalAlpha *= FILM.clamp(op.alpha, 0, 1);
    let dx = op.dx || 0, dy = op.dy || 0;
    if (op.tremble) { const tr = FILM.tremble(t, op.tremble * op.s, SEED[who] || 3); dx += tr.dx; dy += tr.dy; }
    if (dx || dy) g.translate(dx, dy);
    if (op.rot) { g.translate(op.x, op.y); g.rotate(op.rot); g.translate(-op.x, -op.y); }
    let done = false; const P = pov();
    if (P) { try { P.figure(g, who, op); done = true; } catch (e) { FILM.warn('POV.figure(' + who + '): ' + e.message); } }
    if (!done) { ART.placeholders.fig[who] = 1; placeholderFig(g, who, op); }
    g.restore();
    return op;
  };
  // where a figure's head is (for bubbles, sweat drops, hats): POV.headAt if the rig provides it, else the proportions of s=1 = 800 px
  ART.head = function (who, o) {
    const P = pov(); if (P && typeof P.headAt === 'function') { try { const h = P.headAt(who, o); if (h) return h; } catch (e) { } }
    const s = o.s || 1, Hh = 800 * s, r = 0.135 * Hh; const sit = /sitting|sip|typing/.test(o.pose || '');
    return { x: (o.x || 0) + (o.face || 1) * 0.01 * Hh, y: (o.y || 0) - Hh + r + (sit ? 0.2 * Hh : 0) + (o.breath || 0) * s, r };
  };
  // where a hand is ('left'/'right' or 'front'/'back' relative to facing): POV.handAt if provided
  ART.hand = function (who, o, which) {
    const P = pov(); if (P && typeof P.handAt === 'function') { try { const h = P.handAt(who, o, which); if (h) return h; } catch (e) { } }
    const s = o.s || 1, Hh = 800 * s, f = o.face || 1; const sit = /sitting|sip|typing/.test(o.pose || '');
    const front = which !== 'back';
    return { x: (o.x || 0) + f * (front ? 0.2 : -0.16) * Hh, y: (o.y || 0) - (sit ? 0.36 : 0.5) * Hh };
  };

  function placeholderFig(g, who, o) {
    const K = CAST[who] || { body: '#bbb', legs: '#888', head: '#eee', label: who.toUpperCase() };
    const s = o.s, Hh = 800 * s, f = o.face, x = o.x, y = o.y; const pose = o.pose || 'standing';
    const sit = /sitting|sip|typing/.test(pose);
    const r = 0.135 * Hh, lw = Math.max(2, 5 * s); const by = (o.breath || 0) * s;
    const hipY = sit ? y - 0.3 * Hh : y - 0.42 * Hh, neckY = y - Hh + 2 * r + (sit ? 0.2 * Hh : 0) + by;
    g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = lw;
    // legs
    const ph = (o.walk || 0) * Math.PI; const run = pose === 'running' ? 1.6 : 1;
    const lg = (side) => {
      g.beginPath();
      if (sit) { g.moveTo(x + side * 0.05 * Hh, hipY); g.lineTo(x + f * 0.2 * Hh + side * 0.04 * Hh, hipY); g.lineTo(x + f * 0.2 * Hh + side * 0.04 * Hh, y); }
      else { const sw = (pose === 'walking' || pose === 'running') ? Math.sin(ph) * side * 0.12 * Hh * run : 0; g.moveTo(x + side * 0.05 * Hh, hipY); g.lineTo(x + side * 0.06 * Hh + sw, y - 0.02 * Hh); }
      g.lineWidth = 0.075 * Hh; g.strokeStyle = INK; g.stroke(); g.lineWidth = 0.075 * Hh - 2 * lw; g.strokeStyle = K.legs; g.stroke();
    };
    lg(-1); lg(1);
    // body capsule
    const bw = 0.3 * Hh, bt = neckY - 0.02 * Hh, bb = hipY + 0.03 * Hh;
    g.beginPath(); g.roundRect(x - bw / 2, bt, bw, bb - bt, bw * 0.38); g.fillStyle = K.body; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
    // arms by pose
    const sh = { x: x + f * 0.12 * Hh, y: bt + 0.06 * Hh }, shb = { x: x - f * 0.12 * Hh, y: bt + 0.06 * Hh };
    const hy = neckY - r;
    const arm = (a, hx, hy2) => { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(hx, hy2); g.lineWidth = 0.05 * Hh; g.strokeStyle = INK; g.stroke(); g.lineWidth = 0.05 * Hh - 2 * lw; g.strokeStyle = K.body; g.stroke(); g.beginPath(); g.arc(hx, hy2, 0.03 * Hh, 0, Math.PI * 2); g.fillStyle = K.head; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); };
    const A = {
      pointing: [[sh.x + f * 0.32 * Hh, sh.y - 0.02 * Hh], [shb.x - f * 0.02 * Hh, hipY]],
      handup: [[sh.x + f * 0.14 * Hh, sh.y - 0.16 * Hh], [shb.x, hipY]],
      waving: [[sh.x + f * 0.12 * Hh, sh.y - 0.26 * Hh + Math.sin((o.t || 0) * 14) * 0.03 * Hh], [shb.x, hipY]],
      thinking: [[x + f * 0.05 * Hh, neckY - 0.02 * Hh], [shb.x + f * 0.1 * Hh, hipY - 0.06 * Hh]],
      handmouth: [[x + f * 0.07 * Hh, neckY - 0.07 * Hh], [shb.x, hipY]],
      phone: [[x + f * 0.1 * Hh, neckY - 0.1 * Hh], [shb.x, hipY]],
      shrug: [[sh.x + f * 0.14 * Hh, sh.y - 0.06 * Hh], [shb.x - f * 0.14 * Hh, shb.y - 0.06 * Hh]],
      holding: [[sh.x + f * 0.18 * Hh, sh.y + 0.14 * Hh], [shb.x + f * 0.2 * Hh, shb.y + 0.16 * Hh]],
      clipboard: [[sh.x + f * 0.14 * Hh, sh.y + 0.14 * Hh], [shb.x + f * 0.2 * Hh, shb.y + 0.12 * Hh]],
      typing: [[sh.x + f * 0.2 * Hh, sh.y + 0.18 * Hh], [shb.x + f * 0.24 * Hh, shb.y + 0.2 * Hh]],
      sip: [[x + f * 0.1 * Hh, neckY - 0.03 * Hh], [shb.x + f * 0.1 * Hh, hipY]],
      stomach: [[x + f * 0.02 * Hh, hipY - 0.1 * Hh], [shb.x, hipY]],
      clasped: [[x + f * 0.03 * Hh, hipY - 0.06 * Hh], [x - f * 0.01 * Hh, hipY - 0.05 * Hh]],
      thumbsup: [[sh.x + f * 0.2 * Hh, sh.y - 0.04 * Hh], [shb.x, hipY]],
      peace: [[sh.x + f * 0.12 * Hh, sh.y - 0.22 * Hh], [shb.x, hipY]],
      running: [[sh.x + f * Math.sin(ph) * 0.14 * Hh, sh.y + 0.14 * Hh], [shb.x - f * Math.sin(ph) * 0.14 * Hh, shb.y + 0.14 * Hh]],
      walking: [[sh.x + f * Math.sin(ph) * 0.08 * Hh, hipY], [shb.x - f * Math.sin(ph) * 0.08 * Hh, hipY]],
    }[pose] || [[sh.x + f * 0.03 * Hh, hipY], [shb.x - f * 0.03 * Hh, hipY]];
    arm(shb, A[1][0], A[1][1]);
    // head
    const nod = (o.nod || 0) * 0.04 * Hh; const hx = x + f * 0.01 * Hh, hcy = neckY - r + nod;
    g.beginPath(); g.arc(hx, hcy, r, 0, Math.PI * 2); g.fillStyle = K.head; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
    if (K.top) { g.beginPath(); g.arc(hx, hcy, r, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fillStyle = K.top; g.fill(); g.stroke(); }
    // face: eyes (lines when blinking), brows and mouth by expression; the mouth opens with o.mouth
    const ex = hx + f * 0.22 * r, ey = hcy + 0.02 * r, es = 0.34 * r, expr = o.expr || 'neutral';
    g.fillStyle = INK;
    for (const k of [-1, 1]) {
      const px = ex + k * es;
      if (o.blink > 0.5 || expr === 'tired') { g.beginPath(); g.moveTo(px - 0.1 * r, ey); g.lineTo(px + 0.1 * r, ey); g.lineWidth = lw; g.stroke(); }
      else { g.beginPath(); g.arc(px, ey, (expr === 'surprised' || expr === 'scared' ? 0.11 : 0.08) * r, 0, Math.PI * 2); g.fill(); }
      const bt2 = { angry: k * f * 0.08, sad: -k * f * 0.08, scared: -k * f * 0.1, confused: k > 0 ? 0.12 : 0, guilty: -k * f * 0.06 }[expr] || 0;
      g.beginPath(); g.moveTo(px - 0.12 * r, ey - 0.25 * r - bt2 * r); g.lineTo(px + 0.12 * r, ey - 0.25 * r + bt2 * r); g.lineWidth = lw * 0.8; g.stroke();
    }
    const mx = hx + f * 0.2 * r, my = hcy + 0.45 * r, m = Math.max(0, Math.min(1, o.mouth || 0));
    if (m > 0.08) { g.beginPath(); g.ellipse(mx, my, 0.16 * r, 0.04 * r + 0.16 * r * m, 0, 0, Math.PI * 2); g.fillStyle = '#5E2323'; g.fill(); g.lineWidth = lw * 0.8; g.stroke(); }
    else {
      const cv = { happy: 0.12, beaming: 0.18, calm: 0.05, sad: -0.1, guilty: -0.06, scared: -0.08, angry: -0.06, tired: -0.04 }[expr] || 0;
      g.beginPath(); g.moveTo(mx - 0.15 * r, my); g.quadraticCurveTo(mx, my + cv * r * 2, mx + 0.15 * r, my); g.lineWidth = lw * 0.8; g.stroke();
    }
    // front arm over the body
    arm(sh, A[0][0], A[0][1]);
    // the label: who · pose · expr
    g.font = `800 ${Math.max(12, Math.round(30 * s))}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lab = K.label, sub = pose + (expr !== 'neutral' ? ' · ' + expr : '') + (o.hold ? ' · ' + o.hold : '');
    g.fillStyle = 'rgba(255,255,255,.85)'; const tw = Math.max(g.measureText(lab).width, 10);
    g.fillRect(x - tw / 2 - 8 * s, (bt + bb) / 2 - 18 * s, tw + 16 * s, 36 * s);
    g.fillStyle = INK; g.fillText(lab, x, (bt + bb) / 2);
    g.font = `600 ${Math.max(10, Math.round(20 * s))}px ${FONT}`; g.fillStyle = 'rgba(28,28,28,.8)'; g.fillText(sub, x, y + 22 * s);
  }

  // ---------------------------------------------------------------- props
  ART.prop = function (c, name, o) {
    const P = global.POV; o = Object.assign({ t: c.t }, o);
    if (P && typeof P.prop === 'function') { try { if (P.prop(c.g, name, o) !== false) return; } catch (e) { FILM.warn('POV.prop(' + name + '): ' + e.message); } }
    if (global.GFX && global.GFX.prop) global.GFX.prop(c.g, name, o);
  };
  ART.report = () => ({ sets: Object.keys(ART.placeholders.set), figures: Object.keys(ART.placeholders.fig) });
})(window);
