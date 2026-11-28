/* SEVEN DAYS OF NO — staging shared by the sequences (global STAGE): the day card over a set, the split-screen call, the
   "plain" bust framing for the thinking register, and the hero's usual marks in each set. */
(function (global) {
  'use strict';
  const FILM = global.FILM, GFX = global.GFX, W = FILM.WIDTH, H = FILM.HEIGHT;
  const STAGE = global.STAGE = {};
  const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  STAGE.DAYS = DAYS;
  // marks (world px, feet) and scales per set; s = 1 is 800 px tall
  STAGE.MARK = {
    office: { y: 962, s: 1 }, living: { y: 990, s: 1 }, street: { y: 975, s: 1 },
    // the plain teal ground: a bust, the head centre at about y 430
    bust: { s: 1.55, y: 430 + 700 * 1.55 },
  };
  // feet y that puts a standing figure of scale s with its head centre at hy (POV: head centre 700 px * s above the soles)
  STAGE.feetFor = (hy, s) => hy + 700 * s;
  // a seated figure on a set's seat anchor (hips at the anchor, feet on the floor): {x, y, s, seat} for c.fig(..., pose 'sit')
  // (POV: the pelvis sits seat + 24 above the soles for 'sit', seat + 28 for 'sit_sofa'; o.sofa picks the second)
  STAGE.sitAt = function (c, set, name, o) {
    o = o || {}; const a = c.anchor(set, name); const floor = o.floor || (STAGE.MARK[set] ? STAGE.MARK[set].y : 962); const s = o.s || a.s || 1;
    return { x: a.x + (o.dx || 0), y: floor, s, seat: (floor - a.y) / s - (o.sofa ? 28 : 24) };
  };

  // the day card: pops in at t0 over the shot, holds, pops out at t1; a veil dims the set behind it; seven dots mark the week
  STAGE.dayCard = function (c, t0, t1, day, sub, o) {
    o = o || {}; const g = c.g, t = c.t; const st = FILM.popInOut(t, t0, t1, 0.36); if (!st.on) return;
    c.screen(); const veil = 0.28 * Math.min(FILM.seg(t, t0, t0 + 0.25), 1 - FILM.seg(t, t1 - 0.25, t1));
    if (veil > 0) { g.fillStyle = `rgba(28,20,12,${veil})`; g.fillRect(0, 0, W, H); }
    const cx = o.x || W / 2, cy = o.y || 470;
    GFX.at(g, cx, cy, st, q => {
      GFX.dayCard(q, 0, 0, day, sub, { band: o.band });
      const di = DAYS.indexOf(day); if (di >= 0) for (let i = 0; i < 7; i++) { q.beginPath(); q.arc((i - 3) * 46, (sub ? 150 : 115) + 60, 14, 0, Math.PI * 2); q.fillStyle = i < di ? '#F5A454' : i === di ? '#D9443B' : '#FFF6E6'; q.fill(); q.lineWidth = 4; q.strokeStyle = '#1c1c1c'; q.stroke(); }
    });
    c.reset();
  };
  // the split-screen call: left(c) and right(c) each draw a full scene; each half shows the world around its focus point.
  // o: { lx, ly, lz, rx, ry, rz (focus and zoom per side), ldy, rdy (a half dropping), gap }
  STAGE.split = function (c, left, right, o) {
    o = o || {}; const g = c.g;
    const half = (side, fn, fx, fy, z, dy) => {
      g.save(); c.screen(); g.beginPath(); g.rect(side < 0 ? 0 : W / 2, 0, W / 2, H); g.clip();
      c.camera({ x: fx, y: fy, zoom: z || 1, dx: side * W / 4, dy: dy || 0 }); fn(c); g.restore();
    };
    half(-1, left, o.lx == null ? 860 : o.lx, o.ly == null ? 600 : o.ly, o.lz, o.ldy);
    half(1, right, o.rx == null ? 960 : o.rx, o.ry == null ? 600 : o.ry, o.rz, o.rdy);
    c.screen(); g.fillStyle = '#FFF6E6'; g.fillRect(W / 2 - 9, 0, 18, H); g.lineWidth = 5; g.strokeStyle = '#1c1c1c';
    g.beginPath(); g.moveTo(W / 2 - 9, 0); g.lineTo(W / 2 - 9, H); g.moveTo(W / 2 + 9, 0); g.lineTo(W / 2 + 9, H); g.stroke(); c.reset();
  };
  // a speech bubble above-beside a figure's head, popping in at t0 (and out at t1)
  STAGE.say = function (c, who, op, text, t0, t1, o) {
    o = o || {}; const hd = global.ART.head(who, op); const st = FILM.popInOut(c.t, t0, t1, 0.3); if (!st.on) return;
    const side = o.side || op.face || 1; const w = o.w || 620, h = o.h || 220;
    // o.at = [x, y]: the bubble's centre; otherwise beside the head, above it, on the facing side
    const bx = o.at ? o.at[0] : hd.x + side * (hd.r + w * 0.42) + (o.dx || 0), by = o.at ? o.at[1] : hd.y - hd.r - h * 0.35 + (o.dy || 0);
    GFX.at(c.g, bx, by, st, q => GFX.bubble(q, 0, 0, w, h, { text, size: o.size || 48, tail: [hd.x + side * hd.r * 0.8 - bx, hd.y - hd.r * 0.2 - by], kind: o.kind }));
  };
})(window);

/* Overlays: the Sets kit's graphics (SETS.dayCard, SETS.pill, SETS.stamp, SETS.phoneScreen, SETS.call) when it has them, so the
   cards and screens match the sets; the engine's GFX otherwise. Each takes narration times and draws in screen space. */
(function (global) {
  'use strict';
  const FILM = global.FILM, GFX = global.GFX, ART = global.ART, STAGE = global.STAGE, W = FILM.WIDTH, H = FILM.HEIGHT;
  const S = name => (typeof global.SETS !== 'undefined' && global.SETS && typeof global.SETS[name] === 'function') ? global.SETS[name] : null;
  const PR = name => (global.POV && global.POV.PROPS && typeof global.POV.PROPS[name] === 'function') ? global.POV.PROPS[name] : null;
  const { seg, clamp } = FILM;
  // the day card: in from t0, out by t1 (SETS.dayCard's k: 0..1 in, 1..2 out); seven dots under it mark the week
  const _gfxDay = STAGE.dayCard;
  STAGE.dayCard = function (c, t0, t1, day, sub, o) {
    o = o || {}; const f = S('dayCard'); if (!f) return _gfxDay(c, t0, t1, day, sub, o);
    const t = c.t; if (t < t0 || t > t1) return;
    const k = t < t1 - 0.32 ? seg(t, t0, t0 + 0.7) : 1 + seg(t, t1 - 0.32, t1);
    const g = c.g; c.screen(); const veil = 0.22 * Math.min(seg(t, t0, t0 + 0.25), 1 - seg(t, t1 - 0.25, t1));
    if (veil > 0) { g.fillStyle = `rgba(40,20,10,${veil})`; g.fillRect(0, 0, W, H); }
    g.save(); f(g, day, sub, k, { x: o.x, y: o.y == null ? 430 : o.y, color: o.color }); g.restore();
    const di = STAGE.DAYS.indexOf(day), a = Math.min(seg(t, t0 + 0.25, t0 + 0.5), 1 - seg(t, t1 - 0.3, t1));
    if (di >= 0 && a > 0) { g.save(); g.globalAlpha = a; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(W / 2 + (i - 3) * 48, (o.y == null ? 430 : o.y) + (sub ? 250 : 170), 15, 0, Math.PI * 2); g.fillStyle = i < di ? '#F5A454' : i === di ? '#E5534B' : '#FFF4E3'; g.fill(); g.lineWidth = 4.5; g.strokeStyle = '#1c1c1c'; g.stroke(); } g.restore(); }
    c.reset();
  };
  // the NO stamp landing at t0 (it falls for 0.15 s before)
  STAGE.stamp = function (c, x, y, t0, text, o) {
    o = o || {}; const t = c.t; if (t < t0 - 0.15) return; const f = S('stamp');
    if (f) { c.g.save(); f(c.g, x, y, text || 'NO', 0.3 + (t - t0) / 0.5, { size: o.size || 120, rot: o.rot, color: o.color }); c.g.restore(); return; }
    const st = FILM.stamp(t, t0, { rot: o.rot == null ? -0.15 : o.rot }); GFX.at(c.g, x, y, st, q => GFX.stamp(q, 0, 0, { text: text || 'NO', size: o.size || 120, rot: 0 }));
  };
  // a pill label or button: o = { size, fill, color, dim, lit, press, scale, minW }
  STAGE.pill = function (c, x, y, text, o) {
    o = o || {}; const f = S('pill');
    if (f) { c.g.save(); const r = f(c.g, x, y, text, o); c.g.restore(); return r; }
    if (o.fill && o.fill !== '#FFF4E3') { GFX.button(c.g, x, y, Math.max(o.minW || 0, 300), (o.size || 56) * 1.8, text, { color: o.fill, dim: o.dim, lit: o.lit, press: o.press, size: o.size, textColor: o.color }); return null; }
    GFX.pill(c.g, x, y, text, { size: o.size, alpha: 1 - 0.6 * (o.dim || 0) }); return null;
  };
  // a full-frame phone screen: o = SETS.phoneScreen's options (mode 'lock'|'chat', notes, notesK, messages, draft, typing, contact, time, date, battery, buzz, scale)
  STAGE.phone = function (c, o) {
    o = Object.assign({ t: c.t }, o); const f = S('phoneScreen'); c.screen();
    if (f) { c.g.save(); const r = f(c.g, o); c.g.restore(); c.reset(); return r; }
    c.g.fillStyle = '#F2B587'; c.g.fillRect(0, 0, W, H);
    GFX.phone(c.g, W / 2, H / 2, 1.05, (q, sw, sh) => {
      GFX.status(q, sw, { time: o.time, battery: o.battery });
      let y = 120; if (o.contact) { GFX.header(q, sw, o.contact); y = 200; }
      (o.notes || []).forEach((n, i) => { const k = o.notesK == null ? 1 : clamp(o.notesK - i, 0, 1); if (k > 0) { q.save(); q.globalAlpha = k; GFX.missed(q, 20, y, sw - 40, n.title, n.count || 1); q.restore(); y += 116; } });
      (o.messages || []).forEach(m => { const k = m.k == null ? 1 : clamp(m.k, 0, 1); if (k > 0) { q.save(); q.globalAlpha = k; y += GFX.msg(q, 20, y, sw - 40, m.text, { side: m.from === 'me' ? 'out' : 'in' }) + 16; q.restore(); } });
      if (o.draft) GFX.msg(q, 20, sh - 150, sw - 40, o.draft, { side: 'out', fill: '#9CC9CF' });
    });
    c.reset(); return null;
  };
  // the split-screen call: left(c, rect) and right(c, rect) draw a scene each; STAGE.fit(c, rect, {x, y, zoom}) frames a set in a panel.
  // o = { k (panels sliding in 0..1), dropL, dropR, badge, lx.. (fallback focus) }
  STAGE.call = function (c, left, right, o) {
    o = o || {}; const f = S('call'); c.screen();
    if (f) { c.g.save(); f(c.g, { t: c.t, k: o.k == null ? 1 : o.k, dropL: o.dropL, dropR: o.dropR, badge: o.badge, badgeK: o.badgeK, left: (g, r) => left(c, r), right: (g, r) => right(c, r) }); c.g.restore(); c.reset(); return; }
    STAGE.split(c, cc => left(cc, null), cc => right(cc, null), { ldy: o.dropL, rdy: o.dropR, lx: o.lx, rx: o.rx });
  };
  STAGE.fit = function (c, r, o) {
    o = o || {}; if (!r) return; const f = S('fit');
    if (f) return f(c.g, r, o);
    const s = Math.max(r.w / W, r.h / H) * (o.zoom || 1); c.g.translate(r.x + r.w / 2, r.y + r.h / 2); c.g.scale(s, s); c.g.translate(-(o.x == null ? W / 2 : o.x), -(o.y == null ? H / 2 : o.y));
  };
  // the idea bulb over a figure: pops at t0, lights at t1 (POV.PROPS.bulb with glow and sparkles, else GFX.bulb)
  STAGE.bulb = function (c, who, op, t0, t1) {
    const hd = ART.head(who, op); const st = FILM.pop(c.t, t0, 0.34); if (!st.on) return;
    const lit = t1 == null ? 1 : seg(c.t, t1, t1 + 0.2), f = PR('bulb'), k = hd.r / 100;
    GFX.at(c.g, hd.x, hd.y - hd.r - 120 * k, st, q => { if (f) f(q, 0, 0, { s: 1.5 * k, glow: lit, rays: lit > 0.5, sparkle: lit > 0.9 }); else GFX.bulb(q, 0, 0, 0.8 * k, { lit }); });
  };
  // a thought bubble (with the plate, by default) at (x,y) from a figure's head, popping at t0, scale sc
  STAGE.thought = function (c, x, y, t0, o) {
    o = o || {}; const st = FILM.pop(c.t, t0, 0.36); if (!st.on) return; const f = PR('thought');
    GFX.at(c.g, x, y, { sx: st.sx * (o.scale || 1), sy: st.sy * (o.scale || 1), a: st.a }, q => {
      if (f) f(q, 0, 0, { s: o.s || 1.6, icon: o.icon || 'plate', tail: (o.tail || []).map(p => [p[0] - x, p[1] - y, p[2]]) });
      else { GFX.bubble(q, 0, 0, 380, 260, { kind: 'thought', tail: o.tail && o.tail[0] ? [o.tail[0][0] - x, o.tail[0][1] - y] : null }); GFX.plate(q, 0, 0, 0.8); }
    });
  };
  // the speech bubble of a figure saying words on screen (only where SEQUENCES.md shows them)
  STAGE.speech = function (c, who, op, text, t0, t1, o) { STAGE.say(c, who, op, text, t0, t1, o); };
  // a notification popping near a point: kind 'chat' (POV chatBubble) | 'call' | 'mail' | 'bell'
  STAGE.notify = function (c, x, y, t0, kind, o) {
    o = o || {}; const st = FILM.pop(c.t, t0, 0.3); if (!st.on) return;
    GFX.at(c.g, x, y, st, q => {
      if (kind === 'chat' && PR('chatBubble')) PR('chatBubble')(q, 0, 0, { s: o.s || 1.6, tail: o.tail });
      else if (kind === 'bell' && PR('bell')) PR('bell')(q, 0, 0, { s: o.s || 1.6, a: Math.sin(c.t * 18) * 0.2 });
      else if (PR('notif')) PR('notif')(q, 0, 0, { s: o.s || 1.6, kind: kind || 'call', bg: o.bg, badge: true, tail: o.tail });
      else GFX.notify(q, 0, 0, (o.s || 1.6) * 0.6);
    });
  };
  // the plain teal ground with the hero on the set's centre mark (a bust, ref 08); returns the figure opts
  STAGE.plainHero = function (c, o) {
    o = o || {}; c.set('plain', o.plain || {}); const a = c.anchor('plain', o.mark || 'center', { x: 960, y: 1180, s: 1.15 }); const t = c.t;
    const idle = { dx: 10 * FILM.wob(t, 0.22, 17), dy: -FILM.breath(t, 1) * a.s, nod: 0.1 * FILM.wob(t, 0.35, 23), turn: 0.12 * FILM.wob(t, 0.18, 29) };
    if (o.nod != null) idle.nod = o.nod; if (o.still) { idle.dx = 0; idle.turn = 0; }
    return c.fig('hero', Object.assign({ x: a.x, y: a.y, s: a.s, pose: 'stand', expr: 'neutral' }, idle, o));
  };
})(window);

// the hero on the living-room sofa (set, hero, then the coffee table in front): STAGE.heroSofa(c, {tod...}, {pose, expr, hold...})
(function (global) {
  const STAGE = global.STAGE, ART = global.ART;
  STAGE.heroSofa = function (c, so, fo) {
    so = Object.assign({ tod: 'evening' }, so || {}); c.set('living', so);
    // POV's seatAt: the seat contact lands exactly on the sofa's seat anchor, the feet on the floor
    const a = c.anchor('living', (fo && fo.seat_at) || 'sofa_seat_r');
    const h = c.fig('hero', Object.assign({ x: a.x, y: 990, s: a.s, seatAt: { x: a.x, y: a.y }, face: 1, pose: 'sit_sofa', expr: 'neutral', tint: ART.tintFor(c, 'living') }, fo || {}));
    if (!(fo && fo.noFront)) c.setFront('living', so);
    return h;
  };
})(window);
