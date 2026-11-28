/* SEVEN DAYS OF NO — the explainer's graphics (global GFX): day cards, the NO stamp, crosses, speech and thought bubbles,
   notification bubbles, the phone and its screens, buttons, the bulb, the cloud, portraits and small icons. Flat fills, one
   shadow tone, thick even ink outlines (POV.LW), the refs' palette (POV.C when loaded). Every function draws in the current
   transform and leaves the context as it found it. On-screen words are only labels, names and screens (SEQUENCES.md). */
(function (global) {
  'use strict';
  const FILM = global.FILM, ART = global.ART;
  const FONT = ART.FONT, INK = '#1c1c1c', TAU = Math.PI * 2;
  const P = () => (global.POV && global.POV.C) || {};
  const col = (k, d) => P()[k] || d;
  const GFX = global.GFX = { FONT, INK };
  const LW = () => (global.POV && global.POV.LW && global.POV.LW.figure) || 5;
  GFX.RED = '#D9443B'; GFX.TEAL = '#3A8594'; GFX.ORANGE = '#F5A454'; GFX.CREAM = '#FFF6E6'; GFX.GREEN = '#5FAF6E';

  // ---------------------------------------------------------------- primitives
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); }
  function inked(g, fill, lw) { if (fill) { g.fillStyle = fill; g.fill(); } g.lineWidth = lw || LW(); g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
  // apply a pop/stamp state around a centre: GFX.at(g, x, y, st, fn) scales by st.sx/sy (or st.s), rotates st.rot, fades st.a
  function at(g, x, y, st, fn) {
    if (st && st.on === false) return; g.save(); g.translate(x + ((st && st.dx) || 0), y + ((st && st.dy) || 0));
    if (st) { if (st.rot) g.rotate(st.rot); const sx = st.sx != null ? st.sx : (st.s != null ? st.s : 1), sy = st.sy != null ? st.sy : (st.s != null ? st.s : 1); g.scale(Math.max(1e-3, sx), Math.max(1e-3, sy)); if (st.a != null) g.globalAlpha *= FILM.clamp(st.a, 0, 1); }
    fn(g); g.restore();
  }
  function text(g, s, x, y, o) {
    o = o || {}; g.save(); g.font = `${o.weight || 800} ${o.size || 48}px ${o.font || FONT}`; g.textAlign = o.align || 'center'; g.textBaseline = o.baseline || 'middle';
    if (o.maxW) { const w = g.measureText(s).width; if (w > o.maxW) { const k = o.maxW / w; g.font = `${o.weight || 800} ${Math.floor((o.size || 48) * k)}px ${o.font || FONT}`; } }
    if (o.letter) g.letterSpacing = o.letter + 'px';
    if (o.stroke) { g.lineWidth = o.stroke; g.strokeStyle = o.strokeColor || INK; g.lineJoin = 'round'; g.strokeText(s, x, y); }
    g.fillStyle = o.color || INK; g.fillText(s, x, y); g.restore();
  }
  // wrap text into rows of at most maxW px
  function rows(g, s, size, weight, maxW) { g.save(); g.font = `${weight || 700} ${size}px ${FONT}`; const words = s.split(' '), out = []; let row = ''; for (const w of words) { const tr = row ? row + ' ' + w : w; if (g.measureText(tr).width > maxW && row) { out.push(row); row = w; } else row = tr; } if (row) out.push(row); g.restore(); return out; }
  Object.assign(GFX, { rr, inked, at, text, rows });

  // a card: rounded, ink outline, flat fill, one darker offset tone under it
  GFX.card = function (g, cx, cy, w, h, o) {
    o = o || {}; const r = o.r == null ? 28 : o.r, lw = o.lw || LW() + 1;
    g.save(); g.translate(cx, cy); if (o.rot) g.rotate(o.rot);
    if (o.shadow !== false) { rr(g, -w / 2 + 10, -h / 2 + 12, w, h, r); g.fillStyle = o.shadowColor || 'rgba(28,28,28,0.18)'; g.fill(); }
    rr(g, -w / 2, -h / 2, w, h, r); inked(g, o.fill || GFX.CREAM, lw);
    if (o.band) { g.save(); rr(g, -w / 2, -h / 2, w, h, r); g.clip(); g.fillStyle = o.band; g.fillRect(-w / 2, -h / 2, w, o.bandH || h * 0.26); g.beginPath(); g.moveTo(-w / 2, -h / 2 + (o.bandH || h * 0.26)); g.lineTo(w / 2, -h / 2 + (o.bandH || h * 0.26)); g.lineWidth = lw * 0.8; g.strokeStyle = INK; g.stroke(); g.restore(); rr(g, -w / 2, -h / 2, w, h, r); inked(g, null, lw); }
    if (o.draw) o.draw(g, w, h);
    g.restore();
  };
  // the day card: DAY in big type, an optional second line (a time), in a cream card with a coloured band
  GFX.dayCard = function (g, cx, cy, day, sub, o) {
    o = o || {}; const w = o.w || 760, h = sub ? (o.h || 300) : (o.h || 230);
    GFX.card(g, cx, cy, w, h, { fill: GFX.CREAM, band: o.band || GFX.TEAL, bandH: 40, r: 34, rot: o.rot, draw: (q) => {
      text(q, day, 0, sub ? -10 : 20, { size: o.size || 128, weight: 900, color: INK, letter: 4, maxW: w - 80 });
      if (sub) text(q, sub, 0, 96, { size: 56, weight: 800, color: GFX.TEAL, letter: 2 });
    } });
  };
  // the rubber stamp: a red rounded frame and heavy type, slightly rotated, with a worn edge
  GFX.stamp = function (g, cx, cy, o) {
    o = o || {}; const label = o.text || 'NO', size = o.size || 150, red = o.color || GFX.RED;
    g.save(); g.translate(cx, cy); g.rotate(o.rot == null ? -0.12 : o.rot);
    g.font = `900 ${size}px ${FONT}`; const tw = g.measureText(label).width; const w = tw + size * 0.7, h = size * 1.15;
    g.lineJoin = 'round'; g.strokeStyle = red; g.fillStyle = red;
    rr(g, -w / 2, -h / 2, w, h, size * 0.16); g.lineWidth = size * 0.09; g.stroke();
    rr(g, -w / 2 + size * 0.11, -h / 2 + size * 0.11, w - size * 0.22, h - size * 0.22, size * 0.1); g.lineWidth = size * 0.03; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 0, size * 0.05);
    // worn: knock out a few seeded specks
    g.globalCompositeOperation = 'destination-out'; const R = FILM.rng('stamp' + label + (o.seed || 0));
    for (let i = 0; i < 40; i++) { g.beginPath(); g.arc((R() - 0.5) * w, (R() - 0.5) * h, size * (0.006 + R() * 0.018), 0, TAU); g.fill(); }
    g.restore();
  };
  // a red cross drawn on over u 0..1 (two strokes)
  GFX.cross = function (g, cx, cy, size, u) {
    u = u == null ? 1 : u; const a = FILM.clamp(u * 2, 0, 1), b = FILM.clamp(u * 2 - 1, 0, 1), s = size / 2;
    g.save(); g.lineCap = 'round'; g.lineWidth = size * 0.12; g.strokeStyle = GFX.RED;
    if (a > 0) { g.beginPath(); g.moveTo(cx - s, cy - s); g.lineTo(cx - s + 2 * s * a, cy - s + 2 * s * a); g.stroke(); }
    if (b > 0) { g.beginPath(); g.moveTo(cx + s, cy - s); g.lineTo(cx + s - 2 * s * b, cy - s + 2 * s * b); g.stroke(); }
    g.restore();
  };
  // speech or thought bubble around (x,y) w x h (centre), tail toward (tx,ty); optional text (wrapped) or draw(g, w, h)
  GFX.bubble = function (g, cx, cy, w, h, o) {
    o = o || {}; const fill = o.fill || '#FFFFFF', lw = o.lw || LW();
    g.save(); g.translate(cx, cy);
    if (o.kind === 'thought') {
      const n = 9; g.beginPath();
      for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, am = (a0 + a1) / 2; const p0 = [Math.cos(a0) * w / 2, Math.sin(a0) * h / 2], p1 = [Math.cos(a1) * w / 2, Math.sin(a1) * h / 2], pm = [Math.cos(am) * w * 0.64, Math.sin(am) * h * 0.66]; if (!i) g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(pm[0], pm[1], p1[0], p1[1]); }
      g.closePath(); inked(g, fill, lw);
      if (o.tail) { const tx = o.tail[0] - cx, ty = o.tail[1] - cy; [0.45, 0.72, 0.92].forEach((k, i) => { g.beginPath(); g.arc(tx * k, ty * k, [h * 0.09, h * 0.065, h * 0.045][i], 0, TAU); inked(g, fill, lw * 0.8); }); }
    } else {
      const r = o.r || Math.min(h * 0.45, 60);
      if (o.tail) {
        const tx = o.tail[0] - cx, ty = o.tail[1] - cy; const bx = FILM.clamp(tx * 0.35, -w / 2 + r + 30, w / 2 - r - 30), by = ty > 0 ? h / 2 : -h / 2;
        g.beginPath(); g.moveTo(bx - 34, by); g.lineTo(tx, ty); g.lineTo(bx + 34, by); g.closePath(); inked(g, fill, lw);
        rr(g, -w / 2, -h / 2, w, h, r); inked(g, fill, lw);
        g.beginPath(); g.moveTo(bx - 34 + lw, by); g.lineTo(bx + 34 - lw, by); g.lineWidth = lw * 1.6; g.strokeStyle = fill; g.stroke();
      } else { rr(g, -w / 2, -h / 2, w, h, r); inked(g, fill, lw); }
    }
    if (o.text) { const size = o.size || 46; const rs = rows(g, o.text, size, o.weight || 700, w - 70); rs.forEach((row, i) => text(g, row, 0, (i - (rs.length - 1) / 2) * size * 1.22, { size, weight: o.weight || 700, color: o.color || INK })); }
    if (o.draw) o.draw(g, w, h);
    g.restore();
  };
  // a notification: a little chat bubble with three dots and a red badge (ref 06)
  GFX.notify = function (g, cx, cy, s, o) {
    o = o || {}; s = s || 1; g.save(); g.translate(cx, cy); g.scale(s, s);
    rr(g, -52, -36, 104, 72, 18); inked(g, '#FFFFFF', 4.5); g.beginPath(); g.moveTo(-26, 34); g.lineTo(-34, 56); g.lineTo(-6, 34); inked(g, '#FFFFFF', 4.5); g.fillStyle = '#FFFFFF'; g.fillRect(-28, 28, 24, 8);
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(i * 22, 0, 7, 0, TAU); g.fillStyle = o.dots || '#7BAFE1'; g.fill(); }
    if (o.badge !== false) { g.beginPath(); g.arc(48, -34, 16, 0, TAU); inked(g, col('badgeRed', '#E5534B'), 4); }
    g.restore();
  };
  GFX.bell = function (g, cx, cy, s, rot) {
    s = s || 1; g.save(); g.translate(cx, cy); g.rotate(rot || 0); g.scale(s, s);
    g.beginPath(); g.moveTo(-34, 24); g.quadraticCurveTo(-30, -40, 0, -42); g.quadraticCurveTo(30, -40, 34, 24); g.lineTo(42, 34); g.lineTo(-42, 34); g.closePath(); inked(g, col('bubYellow', '#F4BF54'), 4.5);
    g.beginPath(); g.arc(0, 40, 9, 0, TAU); inked(g, col('bubYellow', '#F4BF54'), 4); g.restore();
  };
  // the "..." of a pause in a bubble; dots appear in turn
  GFX.dots = function (g, cx, cy, s, t) {
    s = s || 1; g.save(); g.translate(cx, cy); g.scale(s, s); GFX.bubble(g, 0, 0, 190, 110, { tail: [-60, 90] });
    for (let i = -1; i <= 1; i++) { const on = t == null ? 1 : FILM.clamp((t * 3 - (i + 1)) % 3.6, 0, 1); g.beginPath(); g.arc(i * 44, 0, 12 + 3 * on, 0, TAU); g.fillStyle = INK; g.fill(); }
    g.restore();
  };
  // a sweat drop
  GFX.sweat = function (g, x, y, s) { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.moveTo(0, -22); g.bezierCurveTo(10, -6, 16, 4, 16, 10); g.arc(0, 10, 16, 0, Math.PI); g.bezierCurveTo(-16, 4, -10, -6, 0, -22); inked(g, col('sweat', '#8FD3F0'), 3.5); g.restore(); };
  // tremble lines (the body saying no): little arcs beside a figure
  GFX.shakeLines = function (g, x, y, s, t) { s = s || 1; g.save(); g.lineWidth = 4 * s; g.strokeStyle = INK; g.lineCap = 'round'; const k = Math.floor((t || 0) * 12) % 2; for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) { g.beginPath(); const xx = x + sd * (60 + i * 22 + k * 4) * s; g.arc(xx - sd * 40 * s, y, 40 * s + i * 22 * s, sd > 0 ? -0.5 : Math.PI - 0.5, sd > 0 ? 0.5 : Math.PI + 0.5); g.stroke(); } g.restore(); };

  // ---------------------------------------------------------------- the phone
  // a phone body at (cx,cy), screen w x h at scale s; screen(g, w, h) draws the screen content in screen-local px (0,0 top-left)
  GFX.phone = function (g, cx, cy, s, screen, o) {
    o = o || {}; s = s || 1; const w = 420, h = 860;
    g.save(); g.translate(cx, cy); g.scale(s, s); if (o.rot) g.rotate(o.rot);
    rr(g, -w / 2 + 14, -h / 2 + 16, w, h, 64); g.fillStyle = 'rgba(28,28,28,.2)'; g.fill();
    rr(g, -w / 2, -h / 2, w, h, 64); inked(g, col('phone', '#3D3F48'), 7);
    const sw = w - 40, sh = h - 60; g.save(); rr(g, -sw / 2, -sh / 2, sw, sh, 44); g.clip(); g.fillStyle = o.screen || '#F4F7FA'; g.fillRect(-sw / 2, -sh / 2, sw, sh);
    g.translate(-sw / 2, -sh / 2); if (screen) screen(g, sw, sh); g.restore();
    rr(g, -60, -h / 2 + 34, 120, 22, 11); g.fillStyle = col('phone', '#3D3F48'); g.fill();
    if (o.face) GFX.phoneFace(g, 0, 40, 1, o.face, o.t);
    g.restore();
  };
  // the exhausted phone's face (Q04): eyes and mouth on the dark screen
  GFX.phoneFace = function (g, x, y, s, kind, t) {
    g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = '#FFFFFF'; g.lineWidth = 9; g.lineCap = 'round';
    if (kind === 'tired') { for (const k of [-1, 1]) { g.beginPath(); g.arc(k * 70, -40, 34, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); } g.beginPath(); g.moveTo(-50, 70); g.quadraticCurveTo(0, 40, 50, 70); g.stroke(); }
    g.restore();
  };
  // screen pieces: a status bar, a contact header, a message bubble (returns its height), a missed-call row
  GFX.status = function (g, w, o) { o = o || {}; text(g, o.time || '9:41', 44, 34, { size: 26, weight: 700, align: 'left' }); const b = o.battery == null ? 0.8 : o.battery; rr(g, w - 92, 22, 54, 26, 7); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); g.fillStyle = b < 0.2 ? GFX.RED : INK; g.fillRect(w - 88, 26, 46 * b, 18); g.fillRect(w - 36, 30, 5, 10); };
  GFX.header = function (g, w, name, o) { o = o || {}; g.fillStyle = o.fill || '#E9EEF3'; g.fillRect(0, 60, w, 110); g.beginPath(); g.moveTo(0, 170); g.lineTo(w, 170); g.lineWidth = 2; g.strokeStyle = '#C9D2DB'; g.stroke(); g.beginPath(); g.arc(70, 115, 34, 0, TAU); g.fillStyle = o.avatar || GFX.TEAL; g.fill(); text(g, name.slice(0, 1), 70, 117, { size: 34, weight: 800, color: '#fff' }); text(g, name, 124, 115, { size: 36, weight: 800, align: 'left' }); };
  GFX.msg = function (g, x, y, w, s, o) {
    o = o || {}; const size = o.size || 32, out = o.side === 'out'; const rs = rows(g, s, size, 600, w - 48); const h = rs.length * size * 1.25 + 34;
    let bw = 0; g.save(); g.font = `600 ${size}px ${FONT}`; rs.forEach(r => bw = Math.max(bw, g.measureText(r).width)); g.restore(); bw += 48;
    const bx = out ? x + w - bw : x; rr(g, bx, y, bw, h, 26); g.fillStyle = out ? (o.fill || '#3A8594') : (o.fill || '#E3E8EE'); g.fill();
    rs.forEach((r, i) => text(g, r, bx + 24, y + 17 + size * 0.62 + i * size * 1.25, { size, weight: 600, align: 'left', color: out ? '#FFFFFF' : INK }));
    return h;
  };
  GFX.missed = function (g, x, y, w, name, n, o) { o = o || {}; rr(g, x, y, w, 96, 22); g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#D6DCE2'; g.stroke(); GFX.callIcon(g, x + 52, y + 48, 0.9, GFX.RED); text(g, name, x + 100, y + 36, { size: 32, weight: 800, align: 'left', color: GFX.RED }); text(g, (n > 1 ? n + ' missed calls' : 'Missed call'), x + 100, y + 70, { size: 24, weight: 600, align: 'left', color: '#6B7480' }); };
  GFX.callIcon = function (g, x, y, s, c2) { g.save(); g.translate(x, y); g.scale(s, s); g.rotate(-0.6); rr(g, -12, -28, 24, 56, 12); g.fillStyle = c2 || INK; g.fill(); g.restore(); };
  // the notification banner on a lock screen
  GFX.banner = function (g, x, y, w, title, body) { rr(g, x, y, w, 120, 26); g.fillStyle = 'rgba(255,255,255,.95)'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#D6DCE2'; g.stroke(); text(g, title, x + 28, y + 40, { size: 26, weight: 800, align: 'left' }); text(g, body, x + 28, y + 82, { size: 28, weight: 600, align: 'left', maxW: w - 56 }); };

  // ---------------------------------------------------------------- buttons, labels, signs
  GFX.button = function (g, cx, cy, w, h, label, o) {
    o = o || {}; const press = o.press || 0, dim = o.dim || 0, lit = o.lit || 0; const fill = o.color || GFX.TEAL, depth = 14 * (1 - press);
    g.save(); g.translate(cx, cy); g.globalAlpha *= 1 - dim * 0.65;
    rr(g, -w / 2, -h / 2 + 14, w, h, h * 0.32); inked(g, o.shade || 'rgba(0,0,0,0.0)', LW()); g.fillStyle = shade(fill, -0.25); g.fill(); g.stroke();
    rr(g, -w / 2, -h / 2 + 14 - depth, w, h, h * 0.32); inked(g, fill, LW());
    if (lit) { g.save(); g.globalAlpha *= lit; rr(g, -w / 2 - 14, -h / 2 + 14 - depth - 14, w + 28, h + 28, h * 0.4); g.lineWidth = 10; g.strokeStyle = '#FFE38A'; g.stroke(); g.restore(); }
    text(g, label, 0, 14 - depth, { size: o.size || Math.min(64, h * 0.42), weight: 900, color: o.textColor || '#FFFFFF', maxW: w - 40 });
    g.restore();
  };
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = (n >> 8) & 255, b = n & 255; const f = v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k); return `rgb(${f(r)},${f(gg)},${f(b)})`; }
  GFX.shade = shade;
  // a label pill (names on screen: "flat no", "panic yes")
  GFX.pill = function (g, cx, cy, label, o) { o = o || {}; g.save(); g.font = `800 ${o.size || 52}px ${FONT}`; const w = g.measureText(label).width + (o.size || 52) * 1.1, h = (o.size || 52) * 1.6; g.restore(); g.save(); g.translate(cx, cy); g.globalAlpha *= o.alpha == null ? 1 : o.alpha; rr(g, -w / 2, -h / 2, w, h, h / 2); inked(g, o.fill || '#FFFFFF', LW()); text(g, label, 0, 2, { size: o.size || 52, weight: 800, color: o.color || INK }); g.restore(); return w; };
  GFX.pauseSign = function (g, cx, cy, s) { s = s || 1; g.save(); g.translate(cx, cy); g.scale(s, s); g.beginPath(); g.arc(0, 0, 120, 0, TAU); inked(g, '#FFFFFF', 8); for (const k of [-1, 1]) { rr(g, k * 36 - 18, -56, 36, 112, 10); g.fillStyle = INK; g.fill(); } g.restore(); };
  GFX.clock = function (g, cx, cy, r, hm) { ART.clock(g, cx, cy, r, hm); };
  GFX.battery = function (g, cx, cy, s, level) { s = s || 1; g.save(); g.translate(cx, cy); g.scale(s, s); rr(g, -70, -34, 140, 68, 12); inked(g, '#FFFFFF', 6); rr(g, 72, -14, 14, 28, 4); g.fillStyle = INK; g.fill(); g.fillStyle = level < 0.2 ? GFX.RED : GFX.GREEN; rr(g, -60, -24, 120 * level, 48, 6); g.fill(); g.restore(); };

  // ---------------------------------------------------------------- icons and props
  GFX.bulb = function (g, cx, cy, s, o) {
    o = o || {}; s = s || 1; const lit = o.lit == null ? 1 : o.lit;
    g.save(); g.translate(cx, cy); g.scale(s, s);
    if (lit > 0) { g.save(); g.globalAlpha *= lit; g.lineCap = 'round'; g.lineWidth = 7; g.strokeStyle = INK; for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.42; g.beginPath(); g.moveTo(Math.cos(a) * 92, Math.sin(a) * 92 - 10); g.lineTo(Math.cos(a) * 124, Math.sin(a) * 124 - 10); g.stroke(); } g.beginPath(); g.arc(0, -10, 84, 0, TAU); g.fillStyle = 'rgba(255,226,120,0.35)'; g.fill(); g.restore(); }
    g.beginPath(); g.arc(0, -14, 58, Math.PI * 0.78, Math.PI * 2.22); g.lineTo(24, 58); g.lineTo(-24, 58); g.closePath(); inked(g, lit > 0.5 ? col('bulb', '#F7D25A') : '#F3EBD3', 6);
    rr(g, -28, 56, 56, 34, 8); inked(g, col('bulbBase', '#9AA0A6'), 5); g.beginPath(); g.moveTo(-28, 72); g.lineTo(28, 72); g.lineWidth = 4; g.stroke();
    g.beginPath(); g.moveTo(-14, 30); g.lineTo(-8, -6); g.lineTo(0, 10); g.lineTo(8, -6); g.lineTo(14, 30); g.lineWidth = 4; g.strokeStyle = shade('#B88A1E', 0); g.stroke();
    g.restore();
  };
  GFX.cloud = function (g, cx, cy, s, o) {
    o = o || {}; s = s || 1; g.save(); g.translate(cx, cy); g.scale(s, s);
    if (o.rain) { g.lineCap = 'round'; g.lineWidth = 7; g.strokeStyle = '#7BAFE1'; const R = FILM.rng('rain'); for (let i = 0; i < 9; i++) { const x0 = -110 + i * 28 + R() * 10, ph = ((o.t || 0) * 2.2 + R()) % 1; const y0 = 70 + ph * 150; g.globalAlpha = o.rain * (1 - ph * 0.6); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 - 6, y0 + 26); g.stroke(); } g.globalAlpha = 1; }
    g.beginPath(); g.arc(-80, 20, 56, Math.PI * 0.5, Math.PI * 1.5); g.arc(-20, -30, 70, Math.PI * 1.0, Math.PI * 1.9); g.arc(60, -10, 62, Math.PI * 1.3, Math.PI * 2.2); g.arc(100, 30, 44, Math.PI * 1.6, Math.PI * 0.5); g.closePath();
    inked(g, o.color || '#A9B1BC', 6); g.restore();
  };
  GFX.sprout = function (g, cx, cy, s, u) {
    u = FILM.clamp(u == null ? 1 : u, 0, 1); if (u <= 0) return; s = (s || 1); g.save(); g.translate(cx, cy); g.scale(s, s);
    g.beginPath(); g.ellipse(0, 0, 90, 22, 0, 0, TAU); inked(g, '#9A6B45', 5);
    const h = 130 * FILM.ease.outBack(u); g.beginPath(); g.moveTo(0, -4); g.quadraticCurveTo(-8, -h * 0.5, 0, -h); g.lineWidth = 9; g.strokeStyle = INK; g.stroke(); g.lineWidth = 4; g.strokeStyle = GFX.GREEN; g.stroke();
    const l = FILM.clamp(u * 1.4 - 0.3, 0, 1); for (const k of [-1, 1]) { g.save(); g.translate(0, -h * 0.85); g.rotate(k * 0.5); g.scale(l, l); g.beginPath(); g.ellipse(k * 40, -8, 42, 20, 0, 0, TAU); inked(g, GFX.GREEN, 5); g.restore(); }
    g.restore();
  };
  GFX.plate = function (g, cx, cy, s) {
    s = s || 1; g.save(); g.translate(cx, cy); g.scale(s, s);
    g.beginPath(); g.ellipse(0, 0, 110, 110, 0, 0, TAU); inked(g, '#FFFFFF', 6); g.beginPath(); g.ellipse(0, 0, 76, 76, 0, 0, TAU); g.lineWidth = 3; g.strokeStyle = '#D6DCE2'; g.stroke();
    g.beginPath(); g.ellipse(-12, 6, 46, 30, -0.4, 0, TAU); inked(g, '#B5653D', 5); g.beginPath(); g.arc(30, -26, 18, 0, TAU); inked(g, GFX.GREEN, 4); g.beginPath(); g.arc(36, 22, 14, 0, TAU); inked(g, '#E37F78', 4);
    rr(g, -160, -70, 16, 140, 8); inked(g, '#C9CED4', 4); rr(g, 144, -70, 16, 140, 8); inked(g, '#C9CED4', 4);
    g.restore();
  };
  GFX.banknote = function (g, cx, cy, s, rot) { s = s || 1; g.save(); g.translate(cx, cy); g.rotate(rot || 0); g.scale(s, s); rr(g, -80, -42, 160, 84, 8); inked(g, '#9CCB8A', 5); g.beginPath(); g.arc(0, 0, 24, 0, TAU); inked(g, '#C8E3B8', 4); text(g, '$', 0, 2, { size: 34, weight: 900, color: '#3E6B33' }); g.restore(); };
  GFX.partyHat = function (g, x, y, s, rot) { s = s || 1; g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(s, s); g.beginPath(); g.moveTo(-50, 0); g.lineTo(0, -130); g.lineTo(50, 0); g.closePath(); inked(g, '#E37F78', 5); g.save(); g.clip(); g.strokeStyle = '#F4BF54'; g.lineWidth = 14; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-60, -20 - i * 34); g.lineTo(60, -50 - i * 34); g.stroke(); } g.restore(); g.beginPath(); g.moveTo(-50, 0); g.lineTo(0, -130); g.lineTo(50, 0); g.closePath(); inked(g, null, 5); g.beginPath(); g.arc(0, -134, 14, 0, TAU); inked(g, '#7BAFE1', 4); g.restore(); };
  GFX.cup = function (g, x, y, s, o) { o = o || {}; s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.moveTo(-34, -50); g.lineTo(34, -50); g.lineTo(24, 40); g.lineTo(-24, 40); g.closePath(); inked(g, o.color || '#E37F78', 5); if (o.handle) { g.beginPath(); g.arc(38, -8, 18, -1.4, 1.4); g.lineWidth = 7; g.strokeStyle = INK; g.stroke(); } g.restore(); };
  GFX.mug = function (g, x, y, s, t) { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); rr(g, -36, -40, 72, 80, 12); inked(g, '#FFFFFF', 5); g.beginPath(); g.arc(40, 0, 18, -1.3, 1.3); g.lineWidth = 7; g.strokeStyle = INK; g.stroke(); g.lineWidth = 4; g.strokeStyle = 'rgba(28,28,28,.5)'; for (const k of [-1, 1]) { g.beginPath(); const ph = (t || 0) * 2 + k; g.moveTo(k * 12, -54); g.bezierCurveTo(k * 12 + 12 * Math.sin(ph), -74, k * 12 - 12 * Math.sin(ph), -92, k * 12, -110); g.stroke(); } g.restore(); };
  GFX.pot = function (g, x, y, s, rot) { s = s || 1; g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(s, s); g.beginPath(); g.moveTo(-120, 10); g.lineTo(-104, -70); g.quadraticCurveTo(0, -96, 104, -70); g.lineTo(120, 10); g.closePath(); inked(g, '#B8BEC6', 6); rr(g, -132, 0, 264, 26, 12); inked(g, '#9AA1AA', 6); rr(g, 118, -2, 70, 22, 10); inked(g, INK, 4); g.restore(); };
  GFX.pan = function (g, x, y, s, rot) { s = s || 1; g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(s, s); rr(g, -14, 100, 28, 150, 12); inked(g, '#6B4A33', 5); g.beginPath(); g.arc(0, 0, 112, 0, TAU); inked(g, '#3D3F48', 7); g.beginPath(); g.arc(0, 0, 88, 0, TAU); g.lineWidth = 4; g.strokeStyle = '#6A6D78'; g.stroke(); g.restore(); };
  GFX.box = function (g, x, y, w, h) { rr(g, x - w / 2, y - h, w, h, 6); inked(g, col('box', '#C9995F'), 5); g.fillStyle = col('tape', '#E3C38E'); g.fillRect(x - 18, y - h + 3, 36, h - 6); };
  GFX.laptop = function (g, x, y, s, o) { o = o || {}; s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); rr(g, -150, -190, 300, 190, 14); inked(g, col('laptop', '#C1C1C5'), 5); rr(g, -180, -6, 360, 24, 8); inked(g, col('laptopSh', '#A9A9AE'), 5); g.restore(); };

  // a simple round face (day cards, the YES card's scared face) when the rig has no head-only drawing
  GFX.face = function (g, cx, cy, r, expr, o) {
    o = o || {}; g.save(); g.translate(cx, cy); g.beginPath(); g.arc(0, 0, r, 0, TAU); inked(g, o.skin || col('skin', '#FCEBCB'), Math.max(3, r * 0.06));
    const lw = Math.max(3, r * 0.07); g.lineWidth = lw; g.strokeStyle = INK; g.fillStyle = INK; g.lineCap = 'round';
    const e = expr || 'neutral', ey = -r * 0.08, es = r * 0.32;
    for (const k of [-1, 1]) {
      if (e === 'tired') { g.beginPath(); g.moveTo(k * es - r * 0.13, ey); g.lineTo(k * es + r * 0.13, ey); g.stroke(); }
      else if (e === 'happy' || e === 'beaming') { g.beginPath(); g.arc(k * es, ey + r * 0.05, r * 0.12, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      else { g.beginPath(); g.arc(k * es, ey, r * (e === 'scared' || e === 'surprised' ? 0.12 : 0.085), 0, TAU); g.fill(); }
      const b = { angry: k * 0.1, sad: -k * 0.1, scared: -k * 0.12, guilty: -k * 0.08, honest: 0 }[e] || 0;
      if (b) { g.beginPath(); g.moveTo(k * es - r * 0.14, ey - r * 0.28 - b * r); g.lineTo(k * es + r * 0.14, ey - r * 0.28 + b * r); g.stroke(); }
    }
    const my = r * 0.4;
    if (e === 'scared') { g.beginPath(); g.moveTo(-r * 0.25, my); for (let i = 1; i <= 4; i++) g.lineTo(-r * 0.25 + i * r * 0.125, my + (i % 2 ? -r * 0.07 : 0)); g.stroke(); }
    else if (e === 'surprised') { g.beginPath(); g.ellipse(0, my, r * 0.1, r * 0.14, 0, 0, TAU); g.fillStyle = col('mouthIn', '#5E2323'); g.fill(); g.stroke(); }
    else { const cv = { happy: 0.18, beaming: 0.26, sad: -0.14, guilty: -0.08, angry: -0.1, tired: -0.05, honest: 0.1, calm: 0.08 }[e] || 0.02; g.beginPath(); g.moveTo(-r * 0.24, my); g.quadraticCurveTo(0, my + cv * r * 2, r * 0.24, my); g.stroke(); }
    if (e === 'tired' || e === 'guilty') { g.globalAlpha = 0.6; GFX.sweat(g, r * 0.7, -r * 0.4, r / 110); }
    g.restore();
  };
  // a round portrait of a cast member (the tally, the insight): the figure drawn into a circle, head filling it
  GFX.portrait = function (c, who, cx, cy, R, o) {
    o = o || {}; const g = c.g; g.save();
    if (o.alpha != null) g.globalAlpha *= FILM.clamp(o.alpha, 0, 1);
    g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fillStyle = o.bg || '#FFF1DC'; g.fill(); g.save(); g.clip();
    const s = (R * 0.62) / 108; c.fig(who, Object.assign({ x: cx, y: cy + 688 * s + R * 0.12, s, pose: 'standing', expr: o.expr || 'neutral' }, o.fig || {}));
    if (o.grey) { g.globalCompositeOperation = 'saturation'; g.fillStyle = '#888'; g.fillRect(cx - R, cy - R, 2 * R, 2 * R); g.globalCompositeOperation = 'source-over'; g.fillStyle = `rgba(240,240,240,${0.35 * o.grey})`; g.fillRect(cx - R, cy - R, 2 * R, 2 * R); }
    g.restore(); g.beginPath(); g.arc(cx, cy, R, 0, TAU); inked(g, null, LW() + 1); g.restore();
  };
  // a memory frame: a rounded, thick cream frame with a soft sepia veil over what fn draws inside (world px)
  GFX.memory = function (g, x, y, w, h, fn, o) {
    o = o || {}; g.save(); rr(g, x, y, w, h, 48); g.save(); g.clip(); fn(g); g.fillStyle = 'rgba(255,214,150,0.22)'; g.fillRect(x, y, w, h); g.restore();
    rr(g, x, y, w, h, 48); g.lineWidth = 26; g.strokeStyle = GFX.CREAM; g.stroke(); rr(g, x - 13, y - 13, w + 26, h + 26, 60); g.lineWidth = LW(); g.strokeStyle = INK; g.stroke(); rr(g, x + 13, y + 13, w - 26, h - 26, 36); g.stroke();
    // little thought puffs at a corner (a memory)
    if (o.puffs !== false) { [[x + w + 40, y + h + 30, 26], [x + w + 82, y + h + 70, 17]].forEach(p => { g.beginPath(); g.arc(p[0], p[1], p[2], 0, TAU); inked(g, GFX.CREAM, LW()); }); }
    g.restore();
  };
  // a YouTube-neutral comment bubble: an avatar, a name line and text lines (no platform logo)
  GFX.comment = function (g, cx, cy, w, h, o) {
    o = o || {}; GFX.bubble(g, cx, cy, w, h, { tail: [cx - w * 0.3, cy + h * 0.5 + 90], draw: (q) => {
      q.beginPath(); q.arc(-w / 2 + 90, -h / 2 + 90, 46, 0, TAU); inked(q, GFX.TEAL, 5);
      rr(q, -w / 2 + 160, -h / 2 + 64, 260, 30, 15); q.fillStyle = '#C9D2DB'; q.fill();
      const lines = o.lines || [0.86, 0.7, 0.52]; lines.forEach((k, i) => { rr(q, -w / 2 + 160, -h / 2 + 128 + i * 50, (w - 220) * k, 26, 13); q.fillStyle = '#E3E8EE'; q.fill(); });
      if (o.text) text(q, o.text, -w / 2 + 160, -h / 2 + 140, { size: 40, weight: 700, align: 'left' });
    } });
  };
  // a named prop drawn by the engine (fallback when POV has no prop of that name)
  GFX.prop = function (g, name, o) {
    const x = o.x || 0, y = o.y || 0, s = o.s || 1, r = o.rot || 0;
    switch (name) {
      case 'phone': GFX.phone(g, x, y, (o.s || 1) * 0.16, null, { rot: r }); break;
      case 'laptop': GFX.laptop(g, x, y, s); break;
      case 'mug': GFX.mug(g, x, y, s, o.t); break;
      case 'box': GFX.box(g, x, y, 220 * s, 170 * s); break;
      case 'plate': GFX.plate(g, x, y, s); break;
      case 'banknote': GFX.banknote(g, x, y, s, r); break;
      case 'pot_helmet': GFX.pot(g, x, y, s, r); break;
      case 'pan': GFX.pan(g, x, y, s, r); break;
      case 'party_hat': GFX.partyHat(g, x, y, s, r); break;
      case 'cup': GFX.cup(g, x, y, s); break;
      case 'clipboard': g.save(); g.translate(x, y); g.rotate(r); g.scale(s, s); rr(g, -60, -80, 120, 160, 8); inked(g, col('clipboard', '#876245'), 5); rr(g, -46, -62, 92, 128, 4); inked(g, '#FFFFFF', 3); g.restore(); break;
      default: g.save(); g.translate(x, y); rr(g, -40 * s, -40 * s, 80 * s, 80 * s, 10); inked(g, '#eee', 3); text(g, name, 0, 0, { size: 16 * s, weight: 700 }); g.restore();
    }
  };
})(window);
