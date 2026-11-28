/* SEVEN DAYS OF NO — staging shared by the sequences (global STAGE): the day card over a set, the split-screen call, the
   "plain" bust framing for the thinking register, and the hero's usual marks in each set. */
(function (global) {
  'use strict';
  const FILM = global.FILM, GFX = global.GFX, W = FILM.W, H = FILM.H;
  const STAGE = global.STAGE = {};
  const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  STAGE.DAYS = DAYS;
  // marks (world px, feet) and scales per set; s = 1 is 800 px tall
  STAGE.MARK = {
    office: { y: 950, s: 0.92 }, living: { y: 960, s: 0.86 }, street: { y: 975, s: 0.95 },
    // the plain teal ground: a bust, the head centre at about y 430
    bust: { s: 1.55, y: 430 + 692 * 1.55 },
  };
  // feet y that puts a figure of scale s with its head centre at hy (placeholder proportions: head centre 692 px * s above the feet)
  STAGE.feetFor = (hy, s) => hy + 692 * s;

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
  // the plain teal ground with the hero as a bust; returns the figure opts (for bubbles and the bulb above the head)
  STAGE.plainHero = function (c, o) {
    c.set('plain', {}); const s = (o && o.s) || STAGE.MARK.bust.s;
    const op = Object.assign({ x: W / 2, y: STAGE.feetFor(430, s), s, pose: 'standing', expr: 'neutral' }, o || {});
    return c.fig('hero', op);
  };
  // the bulb above a figure's head: pops at t0, lights at t1
  STAGE.bulb = function (c, who, op, t0, t1) {
    const hd = global.ART.head(who, op); const st = FILM.pop(c.t, t0, 0.34); if (!st.on) return;
    GFX.at(c.g, hd.x, hd.y - hd.r - 150 * (op.s || 1) * 0.8, st, q => GFX.bulb(q, 0, 0, (op.s || 1) * 0.75, { lit: t1 == null ? 1 : FILM.seg(c.t, t1, t1 + 0.15) }));
  };
  // a speech bubble above-beside a figure's head, popping in at t0 (and out at t1)
  STAGE.say = function (c, who, op, text, t0, t1, o) {
    o = o || {}; const hd = global.ART.head(who, op); const st = FILM.popInOut(c.t, t0, t1, 0.3); if (!st.on) return;
    const side = o.side || op.face || 1; const w = o.w || 620, h = o.h || 220; const bx = hd.x + side * (hd.r + w * 0.42) + (o.dx || 0), by = hd.y - hd.r - h * 0.35 + (o.dy || 0);
    GFX.at(c.g, bx, by, st, q => GFX.bubble(q, 0, 0, w, h, { text, size: o.size || 48, tail: [hd.x + side * hd.r * 0.8 - bx, hd.y - hd.r * 0.2 - by], kind: o.kind }));
  };
})(window);
