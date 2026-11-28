/* FIRSTBORN IN AN AFRICAN HOME — this video's graphics (GFX additions), the placeholder rooms for the sets the Sets kit has not
   drawn yet (ART.PH_SETS), and the staging helpers the sequences share (STAGE additions). Every kit piece is guarded: when
   kit/sets.js or kit/pov.js has the real thing (SETS.jobCard, SETS.maternity, POV.PROPS.ricePot, ...), the helpers call it and
   these drawings stand down. Flat fills, thick even ink outlines, the refs' palette; deterministic (no Math.random, no clock).
   On-screen words are names, labels and screens only (design/SEQUENCES.md). */
(function (global) {
  'use strict';
  const FILM = global.FILM, ART = global.ART, GFX = global.GFX;
  const W = FILM.WIDTH, H = FILM.HEIGHT, TAU = Math.PI * 2, INK = '#1c1c1c';
  const { rr, inked, text, at } = GFX;
  const LW = () => (global.POV && global.POV.LW && global.POV.LW.figure) || 5;
  const clamp = FILM.clamp, seg = FILM.seg, ease = FILM.ease;
  const C = { teal: '#3A8594', tealSh: '#2F7280', cream: '#FFF6E6', paper: '#FFFDF7', red: '#D9443B', badgeRed: '#E5534B', green: '#5FAF6E', gold: '#F4BF54', goldSh: '#DCA63E',
    orange: '#F5A454', blue: '#7BAFE1', pink: '#E37F78', purple: '#B58BD1', wood: '#C98E5A', woodSh: '#A8723F', skin: '#FCEBCB', grey: '#C9CED4', dark: '#3D3F48', rice: '#FFF8E8' };
  GFX.C = C;
  const ell = (g, x, y, rx, ry, rot) => { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); };

  // ================================================================ the baby: a swaddled bundle with a round head (the hero's
  // newborn in teal until the kit draws ages). (x, y) = the bundle's bottom; s = 1 is about 250 px long; rot tilts it about (x, y)
  // (-1.57: lying with the head to the left). Returns the head centre and radius in the caller's space.
  const WRAP = { hero: ['#3A8594', '#2F7280'], sister: ['#F4BF54', '#DCA63E'], brother: ['#7BAFE1', '#6497C8'] };
  GFX.bundle = function (g, x, y, s, o) {
    o = o || {}; s = s || 1; const who = o.who || 'hero', wr = o.wrap ? [o.wrap, GFX.shade(o.wrap, -0.15)] : (WRAP[who] || ['#F6E7D2', '#E5D2B8']);
    const sp = ART.SPEC && ART.SPEC[who]; const skin = who === 'hero' ? C.skin : (sp ? sp.skin[0] : '#9F6B48');
    const lw = LW() * Math.max(0.6, Math.min(1.2, s));
    g.save(); if (o.alpha != null) g.globalAlpha *= clamp(o.alpha, 0, 1);
    g.translate(x, y); g.rotate(o.rot || 0); g.scale(s, s);
    const br = FILM.breath ? 1 + 0.02 * Math.sin((o.t || 0) * 2.1) : 1;
    // the wrap: a rounded teardrop, a fold across it, the hood behind the head
    g.save(); g.scale(1, br);
    g.beginPath(); g.moveTo(-58, -6); g.bezierCurveTo(-74, -80, -70, -150, -54, -190); g.lineTo(54, -190); g.bezierCurveTo(70, -150, 74, -80, 58, -6); g.quadraticCurveTo(0, 14, -58, -6); g.closePath(); inked(g, wr[0], lw / s);
    g.beginPath(); g.moveTo(-60, -120); g.quadraticCurveTo(0, -78, 62, -150); g.lineTo(62, -110); g.quadraticCurveTo(0, -40, -64, -84); g.closePath(); g.fillStyle = wr[1]; g.fill();
    g.beginPath(); g.moveTo(-60, -120); g.quadraticCurveTo(0, -78, 62, -150); g.lineWidth = lw / s * 0.8; g.strokeStyle = INK; g.stroke();
    g.restore();
    const hx = 0, hy = -196 * br, R = 56;
    // the head turns back toward upright (o.headUp of the body's tilt, default 0.75) so a lying baby's face still reads
    g.save(); g.translate(hx, hy); g.rotate(-(o.rot || 0) * (o.headUp == null ? 0.75 : o.headUp)); g.translate(-hx, -hy);
    ell(g, hx, hy - 4, R + 16, R + 14); inked(g, wr[0], lw / s);
    ell(g, hx, hy, R, R); inked(g, skin, lw / s);
    babyFace(g, hx, hy, R, o, lw / s);
    g.restore();
    g.restore();
    const cs = Math.cos(o.rot || 0), sn = Math.sin(o.rot || 0);
    const r = { head: [x + (hx * cs - hy * sn) * s, y + (hx * sn + hy * cs) * s], headR: R * s };
    if (o.tag) { g.save(); g.font = `800 ${Math.round(22 * Math.max(0.8, s))}px ${GFX.FONT}`; const tw = g.measureText(o.tag).width + 20; g.globalAlpha *= 0.8; g.fillStyle = '#FFF4E3'; g.beginPath(); g.roundRect(x - tw / 2, y + 10, tw, 30, 15); g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke(); g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.tag, x, y + 26); g.restore(); }
    return r;
  };
  // a tiny face for the bundle: eyes (white, pupil, or arcs), a mouth by expression, cheeks; o.expr, blink, mouth (0..1), look
  function babyFace(g, x, y, R, o, lw) {
    const e = o.expr || 'neutral', lk = o.look || [0, 0], f = o.face || 1; g.save(); g.translate(x, y); g.lineCap = 'round'; g.lineJoin = 'round';
    const ex = R * 0.34, ey = -R * 0.02, er = R * 0.2;
    for (const k of [-1, 1]) {
      const cx = k * ex + f * R * 0.04;
      if (e === 'happy' || e === 'laugh') { g.beginPath(); g.arc(cx, ey + er * 0.3, er * 0.8, Math.PI * 1.15, Math.PI * 1.85); g.lineWidth = lw * 1.1; g.strokeStyle = INK; g.stroke(); continue; }
      if (o.blink >= 0.5 || e === 'sleep' || e === 'sneeze') { g.beginPath(); g.moveTo(cx - er * 0.8, ey + er * 0.1); g.quadraticCurveTo(cx, ey + er * (e === 'sneeze' ? -0.4 : 0.6), cx + er * 0.8, ey + er * 0.1); g.lineWidth = lw * 1.05; g.strokeStyle = INK; g.stroke(); continue; }
      const big = e === 'surprised' || e === 'scared' ? 1.15 : 1;
      ell(g, cx, ey, er * big, er * big * 1.05); g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = lw * 0.8; g.strokeStyle = INK; g.stroke();
      ell(g, cx + lk[0] * er * 0.45, ey + lk[1] * er * 0.4, er * 0.48, er * 0.48); g.fillStyle = INK; g.fill();
      ell(g, cx + lk[0] * er * 0.45 - er * 0.15, ey + lk[1] * er * 0.4 - er * 0.17, er * 0.14, er * 0.14); g.fillStyle = '#FFFFFF'; g.fill();
      if (e === 'confused' && k === -1) { g.beginPath(); g.moveTo(cx - er, ey - er * 1.5); g.lineTo(cx + er, ey - er * 1.1); g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); }
    }
    // cheeks
    for (const k of [-1, 1]) { ell(g, k * R * 0.55, R * 0.3, R * 0.13, R * 0.08); g.fillStyle = 'rgba(240,120,110,0.35)'; g.fill(); }
    const m = clamp(o.mouth || 0, 0, 1), my = R * 0.4;
    g.lineWidth = lw; g.strokeStyle = INK;
    if (e === 'surprised' || e === 'sneeze' || m > 0.15) { ell(g, 0, my, R * 0.09 + R * 0.05 * m, R * 0.08 + R * 0.12 * m); g.fillStyle = '#5E2323'; g.fill(); g.stroke(); }
    else if (e === 'sad' || e === 'cry') { g.beginPath(); g.arc(0, my + R * 0.12, R * 0.16, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    else if (e === 'happy' || e === 'laugh') { g.beginPath(); g.moveTo(-R * 0.18, my - R * 0.04); g.quadraticCurveTo(0, my + R * 0.28, R * 0.18, my - R * 0.04); g.closePath(); g.fillStyle = '#5E2323'; g.fill(); g.stroke(); }
    else if (e === 'confused' || e === 'worried') { g.beginPath(); g.moveTo(-R * 0.12, my); g.quadraticCurveTo(-R * 0.04, my - R * 0.05, 0, my); g.quadraticCurveTo(R * 0.04, my + R * 0.05, R * 0.12, my); g.stroke(); }
    else { g.beginPath(); g.arc(0, my - R * 0.08, R * 0.13, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
    if (e === 'cry' || e === 'sad') { g.fillStyle = '#8ACDEB'; for (const k of [-1, 1]) { g.beginPath(); g.ellipse(k * ex, ey + er * 1.6 + ((o.t || 0) * 60 % 20), er * 0.25, er * 0.4, 0, 0, TAU); g.fill(); } }
    g.restore();
  }

  // ================================================================ small props and icons (all centred on (x, y) unless noted)
  GFX.coin = (g, x, y, s) => { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); ell(g, 0, 0, 30, 30); inked(g, C.gold, 4.5); ell(g, 0, 0, 19, 19); g.lineWidth = 3; g.strokeStyle = C.goldSh; g.stroke(); g.restore(); };
  GFX.salt = (g, x, y, s) => { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); rr(g, -46, -70, 92, 140, 14); inked(g, '#FFFFFF', 5); rr(g, -46, -70, 92, 34, 12); inked(g, '#4E8FC4', 5); rr(g, -32, -6, 64, 46, 8); inked(g, '#E9F2F8', 3.5); text(g, 'SALT', 0, 17, { size: 22, weight: 900, color: '#2F6E8E' }); g.restore(); };
  GFX.calculator = (g, x, y, s) => { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); rr(g, -70, -100, 140, 200, 18); inked(g, '#4A4E57', 5); rr(g, -52, -82, 104, 50, 8); inked(g, '#CFE6C9', 3.5); text(g, '0.00', 26, -56, { size: 26, weight: 900, align: 'right', color: '#2E4A2A' }); for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) { rr(g, -50 + k * 36, -18 + r * 36, 28, 26, 6); inked(g, r === 2 && k === 2 ? C.orange : '#E9ECEF', 3); } g.restore(); };
  // a receipt unrolling downward from (x, y) to length len (px at s = 1), with a zig-zag tear and printed lines
  GFX.receipt = (g, x, y, s, len, o) => { o = o || {}; s = s || 1; len = len || 200; g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.moveTo(-60, 0); g.lineTo(60, 0); g.lineTo(60, len); for (let i = 0; i <= 8; i++) g.lineTo(60 - i * 15, len + (i % 2 ? 10 : 0)); g.lineTo(-60, 0); g.closePath(); inked(g, '#FFFFFF', 4);
    g.fillStyle = '#B9C0C7'; for (let yy = 24; yy < len - 14; yy += 22) { const w = 70 + ((yy * 7) % 30); g.fillRect(-46, yy, w, 6); g.fillRect(30, yy, 16, 6); } g.restore(); };
  GFX.bucket = (g, x, y, s, o) => { o = o || {}; s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.arc(0, -40, 66, Math.PI * 1.05, Math.PI * 1.95); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); g.beginPath(); g.moveTo(-60, -40); g.lineTo(-46, 50); g.lineTo(46, 50); g.lineTo(60, -40); g.closePath(); inked(g, o.color || '#4E8FC4', 5); ell(g, 0, -40, 60, 14); inked(g, '#8ACDEB', 4);
    if (o.slosh) { g.save(); g.translate(0, -50); for (let i = 0; i < 3; i++) { ell(g, -30 + i * 30, -10 - 12 * Math.abs(Math.sin((o.t || 0) * 6 + i)), 7, 9); inked(g, '#8ACDEB', 3); } g.restore(); } g.restore(); };
  // the school bag: a big backpack seen from behind (h = its height at s = 1, about 300)
  GFX.schoolBag = (g, x, y, s, o) => { o = o || {}; s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); rr(g, -110, -150, 220, 300, 60); inked(g, o.color || '#E5534B', 6); rr(g, -80, 20, 160, 100, 24); inked(g, GFX.shade(o.color || '#E5534B', -0.12), 5); rr(g, -30, -176, 60, 40, 18); g.lineWidth = 8; g.strokeStyle = INK; g.stroke(); g.beginPath(); g.moveTo(-60, 44); g.lineTo(60, 44); g.lineWidth = 4; g.stroke(); g.restore(); };
  GFX.spoon = (g, x, y, s, rot) => { s = s || 1; g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(s, s); rr(g, -10, -10, 20, 190, 10); inked(g, C.wood, 4.5); ell(g, 0, -50, 36, 54); inked(g, C.wood, 5); ell(g, 0, -52, 22, 36); g.fillStyle = C.woodSh; g.fill(); g.restore(); };
  GFX.paintbrush = (g, x, y, s, rot) => { s = s || 1; g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(s, s); rr(g, -9, -30, 18, 170, 9); inked(g, '#C98E5A', 4); rr(g, -12, -60, 24, 36, 4); inked(g, '#C9CED4', 4); g.beginPath(); g.moveTo(-12, -60); g.quadraticCurveTo(-14, -100, 0, -118); g.quadraticCurveTo(14, -100, 12, -60); g.closePath(); inked(g, '#7B5EA7', 4); g.restore(); };
  GFX.palette = (g, x, y, s) => { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.ellipse(0, 0, 110, 80, -0.2, 0, TAU); inked(g, '#E8C49A', 5); ell(g, 50, 30, 18, 14); g.fillStyle = '#C9A27E'; g.fill(); [[-60, -10, C.red], [-30, -44, C.gold], [12, -50, C.green], [52, -26, C.blue], [-50, 34, C.purple]].forEach(([px, py, cc]) => { ell(g, px, py, 17, 14); inked(g, cc, 3.5); }); g.restore(); };
  GFX.book = (g, x, y, s, o) => { o = o || {}; s = s || 1; g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.scale(s, s); const k = o.open == null ? 1 : o.open;
    if (k > 0.5) { for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(0, 50); g.quadraticCurveTo(sd * 50, 34, sd * 100, 44); g.lineTo(sd * 100, -50); g.quadraticCurveTo(sd * 50, -62, 0, -48); g.closePath(); inked(g, '#FFFFFF', 4); g.fillStyle = '#C9D3DC'; for (let i = 0; i < 4; i++) g.fillRect(sd > 0 ? 16 : -84, -30 + i * 18, 66, 5); } rr(g, -104, 44, 208, 14, 6); inked(g, o.color || '#3E8A5A', 4); }
    else { rr(g, -70, -95, 140, 190, 10); inked(g, o.color || '#3E8A5A', 5); rr(g, -50, -60, 100, 30, 6); inked(g, '#FFF6E6', 3); }
    g.restore(); };
  // a big pot of rice (party jollof): o.heart puts a heart in the steam; o.steam 0..1
  GFX.ricePot = (g, x, y, s, o) => { o = o || {}; s = s || 1; g.save(); g.translate(x, y); g.scale(s, s);
    if (o.steam !== 0) { g.save(); g.globalAlpha *= 0.55; g.lineWidth = 7; g.strokeStyle = '#FFFFFF'; g.lineCap = 'round'; for (let i = -1; i <= 1; i++) { const ph = (o.t || 0) * 1.6 + i; g.beginPath(); g.moveTo(i * 60, -180); g.bezierCurveTo(i * 60 + 24 * Math.sin(ph), -230, i * 60 - 24 * Math.sin(ph), -270, i * 60, -320); g.stroke(); } g.restore(); }
    g.beginPath(); g.moveTo(-190, -150); g.lineTo(-170, 30); g.quadraticCurveTo(0, 70, 170, 30); g.lineTo(190, -150); g.closePath(); inked(g, '#B8BEC6', 6);
    g.beginPath(); g.ellipse(0, -150, 190, 40, 0, 0, TAU); inked(g, '#9AA1AA', 6); g.beginPath(); g.ellipse(0, -150, 170, 30, 0, 0, TAU); inked(g, '#E7843C', 4);
    g.fillStyle = '#F2A35A'; for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 30 + (i * 37 % 130); ell(g, Math.cos(a) * r, -150 + Math.sin(a) * r * 0.18, 9, 4, a); g.fill(); }
    for (const sd of [-1, 1]) { rr(g, sd * 190 - (sd > 0 ? 0 : 50), -130, 50, 22, 10); inked(g, INK, 4); }
    if (o.heart) { const st = o.heart; g.save(); g.translate(0, -300); g.scale(st, st); GFX.heart(g, 0, 0, 1.4, C.badgeRed); g.restore(); }
    g.restore(); };
  GFX.heart = (g, x, y, s, col) => { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.moveTo(0, 34); g.bezierCurveTo(-62, -6, -40, -62, 0, -28); g.bezierCurveTo(40, -62, 62, -6, 0, 34); g.closePath(); inked(g, col || C.badgeRed, 5); g.restore(); };
  GFX.flag = (g, x, y, s, col, t) => { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); rr(g, -5, -260, 10, 260, 5); inked(g, '#9AA0A6', 4); const w = Math.sin((t || 0) * 3) * 10; g.beginPath(); g.moveTo(5, -250); g.quadraticCurveTo(70, -270 + w, 130, -250); g.lineTo(130, -170); g.quadraticCurveTo(70, -190 + w, 5, -170); g.closePath(); inked(g, col || C.blue, 4.5); g.restore(); };
  // the family house drawn as a load on the back: (x, y) = its bottom centre, s = 1 about 420 px wide
  GFX.house = (g, x, y, s, o) => { o = o || {}; s = s || 1; g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.scale(s, s);
    rr(g, -170, -250, 340, 250, 10); inked(g, '#F1C48F', 6); g.beginPath(); g.moveTo(-210, -240); g.lineTo(0, -400); g.lineTo(210, -240); g.closePath(); inked(g, '#C9645E', 6);
    rr(g, -40, -130, 80, 130, 8); inked(g, '#935A47', 5); rr(g, -140, -200, 80, 70, 6); inked(g, '#CFE6F0', 4); rr(g, 60, -200, 80, 70, 6); inked(g, '#CFE6F0', 4); rr(g, 90, -380, 44, 80, 4); inked(g, '#B5714A', 4);
    g.restore(); };
  GFX.sticky = (g, x, y, s, o) => { o = o || {}; s = s || 1; g.save(); g.translate(x, y); g.rotate(o.rot || 0.05); g.scale(s, s); rr(g, -110, -110, 220, 220, 6); g.fillStyle = 'rgba(28,28,28,.15)'; g.save(); g.translate(8, 10); g.fill(); g.restore(); inked(g, o.color || '#F8E696', 4.5); if (o.draw) o.draw(g); if (o.text) text(g, o.text, 0, 76, { size: 34, weight: 900 }); g.restore(); };
  // a bug icon that wiggles (version 1.0)
  GFX.bug = (g, x, y, s, t, rot) => { s = s || 1; g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(s, s); g.lineWidth = 5; g.strokeStyle = INK; g.lineCap = 'round'; const w = Math.sin((t || 0) * 18) * 0.3;
    for (const sd of [-1, 1]) for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(sd * 18, i * 16); g.lineTo(sd * 44, i * 20 + sd * w * 12 * (i ? 1 : -1)); g.stroke(); }
    ell(g, 0, 4, 26, 32); inked(g, '#7FBF5E', 4.5); ell(g, 0, -30, 16, 14); inked(g, '#4D7F3A', 4); g.beginPath(); g.moveTo(0, -20); g.lineTo(0, 34); g.stroke(); g.restore(); };
  GFX.zzz = (g, x, y, s, t) => { s = s || 1; for (let i = 0; i < 3; i++) { const ph = ((t || 0) * 0.6 + i / 3) % 1; text(g, 'z', x + ph * 60 * s + i * 6, y - ph * 120 * s, { size: (28 + ph * 30) * s, weight: 900, color: `rgba(28,28,28,${1 - ph})`, font: GFX.FONT }); } };
  GFX.siren = (g, x, y, s, on) => { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); if (on) { g.save(); g.globalAlpha = 0.35 * on; ell(g, 0, -40, 130, 110); g.fillStyle = '#FF5A4E'; g.fill(); g.restore(); } g.beginPath(); g.moveTo(-50, 0); g.lineTo(-44, -70); g.quadraticCurveTo(0, -110, 44, -70); g.lineTo(50, 0); g.closePath(); inked(g, on > 0.5 ? '#FF6A5A' : '#D9443B', 5); rr(g, -70, 0, 140, 26, 8); inked(g, '#6B7480', 5);
    if (on > 0.5) { g.lineWidth = 6; g.strokeStyle = INK; g.lineCap = 'round'; [-0.9, -0.4, 0.4, 0.9].forEach(a => { g.beginPath(); g.moveTo(Math.sin(a) * 80, -50 - Math.cos(a) * 60); g.lineTo(Math.sin(a) * 110, -50 - Math.cos(a) * 90); g.stroke(); }); } g.restore(); };
  // a huge overstuffed travel bag (they are relocating), clothes poking out
  GFX.bigBag = (g, x, y, s) => { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); rr(g, -170, -190, 340, 190, 50); inked(g, '#7B5EA7', 6); rr(g, -60, -236, 120, 60, 24); g.lineWidth = 12; g.strokeStyle = INK; g.stroke();
    [[-120, -186, C.gold, -0.4], [-20, -196, C.pink, 0.1], [90, -186, C.green, 0.5]].forEach(([px, py, cc, r]) => { g.save(); g.translate(px, py); g.rotate(r); rr(g, -30, -50, 60, 60, 12); inked(g, cc, 4.5); g.restore(); });
    g.beginPath(); g.moveTo(-170, -110); g.lineTo(170, -110); g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); g.restore(); };
  GFX.manual = (g, x, y, s, o) => { o = o || {}; s = s || 1; g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.scale(s, s); rr(g, -95, -125, 190, 250, 10); inked(g, '#4E8FC4', 6); rr(g, -95, 105, 190, 20, 6); inked(g, '#FFFFFF', 4); rr(g, -70, -90, 140, 70, 8); inked(g, '#FFF6E6', 4); GFX.babyIcon(g, 0, -56, 0.2, {}); text(g, 'BABY', 0, 30, { size: 34, weight: 900, color: '#FFFFFF' }); text(g, 'MANUAL', 0, 66, { size: 26, weight: 900, color: '#FFFFFF' }); g.restore(); };
  // the TV on a low stand, glowing (o.glow 0..1); (x, y) = the stand's foot
  GFX.tv = (g, x, y, s, o) => { o = o || {}; s = s || 1; g.save(); g.translate(x, y); g.scale(s, s);
    if (o.glow) { g.save(); g.globalAlpha = 0.3 * o.glow; ell(g, 0, -260, 360, 240); g.fillStyle = '#BFE3F2'; g.fill(); g.restore(); }
    rr(g, -200, -120, 400, 120, 10); inked(g, '#8A5A3E', 5); rr(g, -220, -420, 440, 270, 18); inked(g, '#2E3038', 6); rr(g, -198, -398, 396, 226, 8); inked(g, o.glow ? '#9FD3E6' : '#3D4A55', 3);
    if (o.glow) { g.save(); rr(g, -198, -398, 396, 226, 8); g.clip(); const k = Math.floor((o.t || 0) * 3) % 3; g.fillStyle = ['#F5A454', '#77CC81', '#E37F78'][k]; ell(g, -60 + k * 50, -300, 70, 50); g.fill(); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(-198, -398, 396, 30); g.restore(); }
    rr(g, -20, -152, 40, 34, 6); inked(g, '#2E3038', 4); g.restore(); };
  // the standing fan (t spins the blades); (x, y) = its foot
  GFX.fan = (g, x, y, s, t) => { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); ell(g, 0, -8, 90, 18); inked(g, '#9AA0A6', 5); rr(g, -9, -470, 18, 464, 8); inked(g, '#C9CED4', 4);
    g.save(); g.translate(0, -540); ell(g, 0, 0, 110, 110); inked(g, 'rgba(255,255,255,0.25)', 5); const a0 = (t || 0) * 14; for (let i = 0; i < 3; i++) { g.save(); g.rotate(a0 + i * TAU / 3); ell(g, 0, -52, 30, 50); inked(g, '#9DCFC6', 3.5); g.restore(); } ell(g, 0, 0, 22, 22); inked(g, '#3A8594', 4);
    g.lineWidth = 2.5; g.strokeStyle = 'rgba(28,28,28,.55)'; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(i * TAU / 8) * 110, Math.sin(i * TAU / 8) * 110); g.stroke(); } g.restore(); g.restore(); };
  // the mortarboard and a rolled diploma
  GFX.gradCap = (g, x, y, s, rot) => { s = s || 1; g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(s, s); g.beginPath(); g.moveTo(-130, 0); g.lineTo(0, -46); g.lineTo(130, 0); g.lineTo(0, 46); g.closePath(); inked(g, '#2E3038', 5); rr(g, -70, 10, 140, 50, 12); inked(g, '#2E3038', 5); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(80, 20, 96, 80); g.lineWidth = 5; g.strokeStyle = C.gold; g.stroke(); ell(g, 96, 86, 10, 14); g.fillStyle = C.gold; g.fill(); g.restore(); };
  GFX.diploma = (g, x, y, s, rot) => { s = s || 1; g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(s, s); rr(g, -90, -22, 180, 44, 22); inked(g, '#FFFDF7', 5); rr(g, -14, -26, 28, 52, 4); inked(g, C.red, 4); g.restore(); };
  // the gown drawn over a standing figure: from the shoulders (x, yTop) to the knees, s = the figure's scale
  GFX.gown = (g, x, yTop, s, col) => { g.save(); g.translate(x, yTop); g.scale(s, s); g.beginPath(); g.moveTo(-86, 0); g.quadraticCurveTo(-120, 200, -112, 330); g.lineTo(112, 330); g.quadraticCurveTo(120, 200, 86, 0); g.quadraticCurveTo(0, -24, -86, 0); g.closePath(); inked(g, col || '#2E3038', 5 / s * s); g.beginPath(); g.moveTo(-30, 0); g.lineTo(0, 70); g.lineTo(30, 0); g.lineWidth = 8; g.strokeStyle = C.gold; g.stroke(); g.restore(); };
  // tears streaming from a head (hd = ART.head), k 0..1 how hard
  GFX.tears = (g, hd, t, k) => { k = k == null ? 1 : k; g.save(); g.fillStyle = '#8ACDEB'; g.strokeStyle = INK; g.lineWidth = 2.5; for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) { const ph = ((t || 0) * 1.8 + i * 0.5) % 1; const x = hd.x + sd * hd.r * (0.42 + ph * 0.3), y = hd.y + hd.r * (0.05 + ph * 0.9); g.globalAlpha = k * (1 - ph * 0.6); ell(g, x, y, hd.r * 0.07, hd.r * 0.11); g.fill(); g.stroke(); } g.restore(); };
  GFX.sparkles = (g, x, y, r, t, n, col) => { n = n || 6; g.save(); g.strokeStyle = col || '#F4BF54'; g.lineCap = 'round'; for (let i = 0; i < n; i++) { const a = i / n * TAU + (t || 0) * 0.5, ph = ((t || 0) * 1.3 + i * 0.37) % 1, rr2 = r * (0.7 + 0.5 * ph), sz = 16 * Math.sin(ph * Math.PI); if (sz < 1) continue; const px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2; g.lineWidth = 5; g.beginPath(); g.moveTo(px - sz, py); g.lineTo(px + sz, py); g.moveTo(px, py - sz); g.lineTo(px, py + sz); g.stroke(); } g.restore(); };
  // speed lines behind a runner moving dir (+1 right)
  GFX.speed = (g, x, y, h, dir, t) => { g.save(); g.lineCap = 'round'; g.strokeStyle = 'rgba(28,28,28,.5)'; g.lineWidth = 6; for (let i = 0; i < 5; i++) { const yy = y - h * (0.2 + i * 0.15), ph = ((t || 0) * 4 + i * 0.3) % 1, L = 80 + i * 20; g.beginPath(); g.moveTo(x - dir * (60 + ph * 40), yy); g.lineTo(x - dir * (60 + ph * 40 + L), yy); g.stroke(); } g.restore(); };
  // a gold star badge (promoted!)
  GFX.starBadge = (g, x, y, s, label) => { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 46 : 100; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); inked(g, C.gold, 6); ell(g, 0, 0, 40, 40); inked(g, '#F7D25A', 4);
    if (label) { rr(g, -130, 70, 260, 60, 14); inked(g, C.red, 5); text(g, label, 0, 102, { size: 36, weight: 900, color: '#FFFFFF', maxW: 230 }); } g.restore(); };
  // the ID badge on a lanyard (FIRSTBORN): (x, y) = the card's centre; o.cord = the cord's length above (0 hides it)
  GFX.badge = (g, x, y, s, label, o) => { o = o || {}; s = s || 1;
    // the Sets kit's badge (portrait, the hero's photo) when it has one: (x, y) here is the card's centre, the kit's is the clip
    if (typeof SETS !== 'undefined' && SETS && typeof SETS.badge === 'function') { try { const sc = s * 0.8; g.save(); SETS.badge(g, x, y - 205 * sc, { text: label || 'FIRSTBORN', scale: sc, lanyard: !!o.cord, strap: (o.cord || 0) * s, swing: o.rot || 0, color: o.color }); g.restore(); return; } catch (e) { g.restore(); } }
    g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.scale(s, s);
    const cord = o.cord == null ? 160 : o.cord; if (cord) { g.beginPath(); g.moveTo(-40, -96); g.lineTo(-70, -96 - cord); g.moveTo(40, -96); g.lineTo(70, -96 - cord); g.lineWidth = 16; g.strokeStyle = INK; g.stroke(); g.lineWidth = 9; g.strokeStyle = '#3E6FA6'; g.stroke(); }
    rr(g, -24, -116, 48, 34, 8); inked(g, '#C9CED4', 4);
    rr(g, -120, -96, 240, 192, 20); inked(g, '#FFFFFF', 6); rr(g, -120, -96, 240, 50, 20); g.save(); g.clip(); g.fillStyle = o.color || C.teal; g.fillRect(-120, -96, 240, 50); g.restore(); rr(g, -120, -96, 240, 192, 20); inked(g, null, 6);
    ell(g, -64, 6, 30, 30); inked(g, C.skin, 4); g.fillStyle = INK; ell(g, -74, 2, 4, 4); g.fill(); ell(g, -54, 2, 4, 4); g.fill(); g.beginPath(); g.arc(-64, 12, 9, 0.2, Math.PI - 0.2); g.lineWidth = 3; g.stroke();
    g.fillStyle = '#C9D3DC'; g.fillRect(-20, -6, 110, 12); g.fillRect(-20, 16, 80, 12);
    text(g, label || 'FIRSTBORN', 0, 66, { size: 34, weight: 900, color: INK, maxW: 210 }); g.restore(); };
  // a framed poster on a wall around a rect (x, y, w, h), its title on a plate under it
  GFX.posterFrame = (g, x, y, w, h, o) => { o = o || {}; g.save(); rr(g, x - 22, y - 22, w + 44, h + 44, 12); g.lineWidth = 26; g.strokeStyle = o.frame || '#C98E5A'; g.stroke(); rr(g, x - 35, y - 35, w + 70, h + 70, 16); g.lineWidth = LW(); g.strokeStyle = INK; g.stroke(); rr(g, x - 9, y - 9, w + 18, h + 18, 6); g.stroke();
    if (o.nail) { g.beginPath(); g.moveTo(x + w / 2 - 80, y - 30); g.lineTo(x + w / 2, y - 110); g.lineTo(x + w / 2 + 80, y - 30); g.lineWidth = 5; g.stroke(); ell(g, x + w / 2, y - 112, 10, 10); inked(g, '#9AA0A6', 4); }
    if (o.title) { const tw = Math.max(260, o.title.length * 30); rr(g, x + w / 2 - tw / 2, y + h + 44, tw, 66, 12); inked(g, C.gold, 5); text(g, o.title, x + w / 2, y + h + 78, { size: 40, weight: 900 }); } g.restore(); };
  // a warning triangle sign on a post
  GFX.warning = (g, x, y, s) => { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); rr(g, -8, -160, 16, 160, 6); inked(g, '#9AA0A6', 4); g.beginPath(); g.moveTo(0, -330); g.lineTo(100, -160); g.lineTo(-100, -160); g.closePath(); inked(g, C.gold, 7); rr(g, -9, -290, 18, 80, 8); g.fillStyle = INK; g.fill(); ell(g, 0, -190, 11, 11); g.fill(); g.restore(); };
  // an empty wallet, open, a moth flying out (t)
  GFX.wallet = (g, x, y, s, t) => { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); rr(g, -110, -70, 220, 140, 18); inked(g, '#8A5A3E', 6); rr(g, -110, -70, 220, 50, 18); inked(g, '#A8723F', 5);
    const ph = ((t || 0) * 0.5) % 1, mx = 40 * Math.sin((t || 0) * 3), my = -100 - ph * 140; g.save(); g.translate(mx, my); const fl = Math.abs(Math.sin((t || 0) * 16)); for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 18, 0, 20, 12 + 6 * fl, sd * 0.5, 0, TAU); inked(g, '#CBBBA0', 3); } ell(g, 0, 0, 6, 14); g.fillStyle = INK; g.fill(); g.restore(); g.restore(); };
  // a countdown pill (4:00 -> 0:00): (x, y) its centre, sec = seconds left
  GFX.timer = (g, x, y, s, sec, o) => { o = o || {}; s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); ell(g, 0, 0, 110, 110); inked(g, '#FFFFFF', 7); rr(g, -18, -136, 36, 26, 6); inked(g, '#9AA0A6', 5); const a = (sec / 240) * TAU; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 92, -Math.PI / 2, -Math.PI / 2 + a); g.closePath(); g.fillStyle = o.color || '#F5A454'; g.fill(); ell(g, 0, 0, 70, 70); inked(g, '#FFFFFF', 0); const m = Math.floor(sec / 60), sc2 = Math.floor(sec % 60); text(g, m + ':' + String(sc2).padStart(2, '0'), 0, 4, { size: 54, weight: 900 }); g.restore(); };
  // a bubble that flips (scaleX) from one message to another at k 0..1; o.fromFill/toFill, o.kind 'rough' for jagged
  GFX.flipBubble = (g, x, y, w, h, a, b, k, o) => { o = o || {}; const fl = Math.cos(clamp(k, 0, 1) * Math.PI), side = fl >= 0 ? 0 : 1; g.save(); g.translate(x, y); g.scale(Math.max(0.02, Math.abs(fl)), 1);
    const fill = side ? (o.toFill || '#FFE3E8') : (o.fromFill || '#FFFFFF'), col = side ? (o.toColor || '#C0364A') : (o.fromColor || INK);
    if (!side && o.rough) GFX.roughBubble(g, 0, 0, w, h, fill, o.tail); else GFX.bubble(g, 0, 0, w, h, { fill, tail: o.tail });
    const rows = GFX.rows(g, side ? b : a, o.size || 64, 900, w - 80); rows.forEach((r, i) => text(g, r, 0, (i - (rows.length - 1) / 2) * (o.size || 64) * 1.15, { size: o.size || 64, weight: 900, color: col }));
    if (side && o.hearts) { GFX.heart(g, -w / 2 + 40, -h / 2 + 30, 0.6, '#E5534B'); GFX.heart(g, w / 2 - 40, h / 2 - 30, 0.5, '#E5534B'); }
    g.restore(); };
  // a jagged, shouty bubble (love said loudly)
  GFX.roughBubble = (g, x, y, w, h, fill, tail) => { g.save(); g.translate(x, y); const n = 22; g.beginPath(); for (let i = 0; i < n; i++) { const a = i / n * TAU, r = i % 2 ? 0.86 : 1.06; const px = Math.cos(a) * w / 2 * r, py = Math.sin(a) * h / 2 * r; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); inked(g, fill || '#FFFFFF', LW() + 1);
    if (tail) { g.beginPath(); g.moveTo(-30, h * 0.4); g.lineTo(tail[0], tail[1]); g.lineTo(20, h * 0.42); g.closePath(); inked(g, fill || '#FFFFFF', LW() + 1); } g.restore(); };
  // the alarm meter (first name / middle name / surname): level 0..3, labels per segment
  GFX.alarmMeter = (g, x, y, s, level, labels) => { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); rr(g, -150, -520, 300, 560, 40); inked(g, '#FFF6E6', 7); const cols = ['#F4BF54', '#F5A454', '#E5534B'];
    for (let i = 0; i < 3; i++) { const k = clamp(level - i, 0, 1), y0 = -60 - i * 150; rr(g, -120, y0 - 120, 240, 130, 22); inked(g, '#E8DFD2', 4); if (k > 0) { g.save(); rr(g, -120, y0 - 120, 240, 130, 22); g.clip(); g.fillStyle = cols[i]; g.fillRect(-120, y0 + 10 - 130 * ease.outCubic(k), 240, 130 * ease.outCubic(k)); g.restore(); rr(g, -120, y0 - 120, 240, 130, 22); inked(g, null, 4); }
      if (labels && labels[i]) text(g, labels[i], 0, y0 - 55, { size: 38, weight: 900, color: k > 0.5 ? '#FFFFFF' : '#9A948A', maxW: 220, stroke: k > 0.5 ? 6 : 0, strokeColor: INK }); }
    if (level >= 2.95) { g.lineWidth = 8; g.strokeStyle = C.red; g.lineCap = 'round'; for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { const a = -0.5 + i * 0.5; g.beginPath(); g.moveTo(sd * (170 + 10), -470 + i * 40); g.lineTo(sd * (230 + 10), -490 + i * 40 + a * 30); g.stroke(); } }
    g.restore(); };
  // the plain coloured flags of the "United Nations" gag: no real country
  GFX.flags = (g, x, y, s, t) => { [[-120, '#E37F78'], [-40, '#77CC81'], [40, '#7BAFE1'], [120, '#F4BF54']].forEach(([dx, cc], i) => GFX.flag(g, x + dx * s, y, s * 0.8, cc, (t || 0) + i)); };
  // the podium (UN gag): (x, y) = its base centre
  GFX.podium = (g, x, y, s, o) => { o = o || {}; s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.moveTo(-150, 0); g.lineTo(-120, -330); g.lineTo(120, -330); g.lineTo(150, 0); g.closePath(); inked(g, '#3E6FA6', 6); rr(g, -170, -370, 340, 50, 12); inked(g, '#5689C2', 6); ell(g, 0, -190, 60, 60); inked(g, '#FFFFFF', 5); ell(g, 0, -190, 40, 40); g.lineWidth = 4; g.strokeStyle = '#3E6FA6'; g.stroke(); g.beginPath(); g.moveTo(-40, -190); g.lineTo(40, -190); g.moveTo(0, -230); g.lineTo(0, -150); g.stroke();
    g.beginPath(); g.moveTo(40, -370); g.quadraticCurveTo(60, -420, 30, -450); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); ell(g, 28, -458, 14, 18); inked(g, '#4A4E57', 4); g.restore(); };
  // a comment card with a sample line (the outro's "tell me in the comments")
  GFX.envelope = (g, x, y, s, open) => { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); rr(g, -110, -70, 220, 140, 10); inked(g, '#FFFDF7', 5); g.beginPath(); g.moveTo(-110, -70); g.lineTo(0, open ? -150 : 10); g.lineTo(110, -70); g.lineWidth = 5; g.strokeStyle = INK; g.stroke(); g.restore(); };
  GFX.signPost = (g, x, y, s) => { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); rr(g, -8, -220, 16, 220, 6); inked(g, C.wood, 4); g.beginPath(); g.moveTo(-10, -210); g.lineTo(110, -210); g.lineTo(140, -180); g.lineTo(110, -150); g.lineTo(-10, -150); g.closePath(); inked(g, C.gold, 5); g.beginPath(); g.moveTo(10, -140); g.lineTo(-110, -140); g.lineTo(-140, -110); g.lineTo(-110, -80); g.lineTo(10, -80); g.closePath(); inked(g, C.blue, 5); g.restore(); };
  GFX.phoneIcon = (g, x, y, s, ring) => { s = s || 1; g.save(); g.translate(x + (ring ? Math.sin(ring * 60) * 4 : 0), y); g.scale(s, s); rr(g, -50, -90, 100, 180, 18); inked(g, '#3D3F48', 5); rr(g, -40, -74, 80, 140, 8); inked(g, '#BFE3F2', 3); if (ring) { g.lineWidth = 5; g.strokeStyle = INK; for (const sd of [-1, 1]) { g.beginPath(); g.arc(0, -10, 80, sd > 0 ? -0.5 : Math.PI - 0.5, sd > 0 ? 0.5 : Math.PI + 0.5); g.stroke(); } } g.restore(); };
  GFX.spotlight = (g, x, y, w, k) => { if (k <= 0) return; g.save(); g.globalAlpha = 0.45 * k; g.beginPath(); g.moveTo(x - 40, 0); g.lineTo(x + 40, 0); g.lineTo(x + w / 2, y); g.lineTo(x - w / 2, y); g.closePath(); g.fillStyle = '#FFF4C2'; g.fill(); ell(g, x, y, w / 2, w * 0.1); g.fill(); g.restore(); };
})(window);

// ================================================================ cards and screens (stand-ins for SETS.jobCard, rulesBoard, billCard,
// doorTrio and the phone's bank mode; the STAGE wrappers below call the kit's when it has them)
(function (global) {
  'use strict';
  const FILM = global.FILM, GFX = global.GFX, C = GFX.C, INK = '#1c1c1c', TAU = Math.PI * 2;
  const { rr, inked, text } = GFX; const clamp = FILM.clamp, ease = FILM.ease;
  const LW = () => (global.POV && global.POV.LW && global.POV.LW.figure) || 5;
  // the naira sign when the font has it, else NGN (checked once)
  let NAIRA = null;
  GFX.naira = function () {
    if (NAIRA) return NAIRA; try { const cv = document.createElement('canvas').getContext('2d'); cv.font = `900 60px ${GFX.FONT}`; const a = cv.measureText('₦').width, b = cv.measureText('￿').width; NAIRA = a > 10 && Math.abs(a - b) > 0.5 ? '₦' : 'NGN '; } catch (e) { NAIRA = 'NGN '; }
    return NAIRA;
  };
  GFX.money = n => GFX.naira() + Number(n).toLocaleString('en-US');
  // a check box row with a label and a red cross drawn over it at k 0..1 (the job card)
  function crossRow(g, x, y, w, label, k, size) {
    rr(g, x, y - 34, 68, 68, 12); inked(g, '#FFFFFF', 5);
    text(g, label, x + 100, y + 2, { size: size || 64, weight: 900, align: 'left', color: k > 0.6 ? '#9A948A' : INK });
    if (k > 0) { GFX.cross(g, x + 34, y, 74, clamp(k * 1.4, 0, 1)); const u = clamp(k * 1.6 - 0.6, 0, 1); if (u > 0) { g.save(); g.lineCap = 'round'; g.lineWidth = 10; g.strokeStyle = C.red; g.beginPath(); g.moveTo(x + 92, y + 4); g.lineTo(x + 92 + (w - 100) * u, y - 2); g.stroke(); g.restore(); } }
  }
  // the job offer card: header band, the role, rows crossed out; (cx, cy) its centre, about 1180 x 860 at s = 1
  GFX.jobCard = function (g, cx, cy, s, o) {
    o = o || {}; s = s || 1; const w = 1180, h = o.h || 860;
    g.save(); g.translate(cx, cy); g.rotate(o.rot || 0); g.scale(s, s);
    GFX.card(g, 0, 0, w, h, { fill: C.paper, band: C.teal, bandH: 150, r: 40 });
    text(g, o.title || 'JOB OFFER', 0, -h / 2 + 78, { size: 84, weight: 900, color: '#FFFFFF', letter: 6 });
    text(g, 'POSITION', -w / 2 + 70, -h / 2 + 212, { size: 40, weight: 800, align: 'left', color: '#7A8A8C' });
    text(g, o.role || 'FIRSTBORN', -w / 2 + 70, -h / 2 + 282, { size: 96, weight: 900, align: 'left', color: C.teal });
    (o.rows || []).forEach((r, i) => crossRow(g, -w / 2 + 70, -h / 2 + 420 + i * 112, w - 180, r.label, r.k || 0, 62));
    if (o.signK) { g.save(); g.globalAlpha *= clamp(o.signK * 3, 0, 1); g.lineWidth = 6; g.strokeStyle = '#2F6E8E'; g.lineCap = 'round'; g.beginPath(); const sx = w / 2 - 360, sy = h / 2 - 70; for (let i = 0; i <= 30 * clamp(o.signK, 0, 1); i++) { const u = i / 30; g.lineTo(sx + u * 260, sy + Math.sin(u * 18) * 22 * (1 - u * 0.5)); } g.stroke(); g.restore(); }
    g.restore();
  };
  // the rules board: a cork board with a header and rules (icon + words), each appearing at its k
  GFX.rulesBoard = function (g, cx, cy, s, o) {
    o = o || {}; s = s || 1; const w = 1240, h = 760;
    g.save(); g.translate(cx, cy); g.scale(s, s);
    rr(g, -w / 2 + 12, -h / 2 + 16, w, h, 30); g.fillStyle = 'rgba(28,28,28,.2)'; g.fill();
    rr(g, -w / 2, -h / 2, w, h, 30); inked(g, '#C98E5A', LW() + 2); rr(g, -w / 2 + 34, -h / 2 + 34, w - 68, h - 68, 16); inked(g, '#2F4F46', LW());
    text(g, o.title || 'HOUSE RULES', 0, -h / 2 + 120, { size: 82, weight: 900, color: '#FFF6E6', letter: 5 });
    g.beginPath(); g.moveTo(-w / 2 + 120, -h / 2 + 180); g.lineTo(w / 2 - 120, -h / 2 + 180); g.lineWidth = 5; g.strokeStyle = 'rgba(255,246,230,.5)'; g.stroke();
    (o.rules || []).forEach((r, i) => { const k = clamp(r.k == null ? 1 : r.k, 0, 1); if (k <= 0) return; const y = -h / 2 + 290 + i * 150; g.save(); g.globalAlpha *= clamp(k * 3, 0, 1); g.translate(-w / 2 + 170, y); const sc = 0.6 + 0.4 * ease.outBack(k, 2); g.scale(sc, sc);
      ruleIcon(g, 0, 0, r.icon); text(g, r.text, 110, 4, { size: 72, weight: 900, align: 'left', color: '#FFF6E6' }); g.restore(); });
    g.restore();
  };
  function ruleIcon(g, x, y, kind) {
    g.save(); g.translate(x, y);
    if (kind === 'sweet') { g.beginPath(); g.moveTo(-60, -22); g.lineTo(-30, 0); g.lineTo(-60, 22); g.closePath(); inked(g, C.pink, 4); g.beginPath(); g.moveTo(60, -22); g.lineTo(30, 0); g.lineTo(60, 22); g.closePath(); inked(g, C.pink, 4); g.beginPath(); g.ellipse(0, 0, 36, 28, 0, 0, TAU); inked(g, '#E5534B', 4.5); }
    else if (kind === 'biscuit') { g.beginPath(); g.arc(0, 0, 42, 0, TAU); inked(g, '#D9A15E', 4.5); g.fillStyle = '#7A4A30'; [[-14, -12], [12, -16], [16, 12], [-10, 16], [0, 0]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 5, 0, TAU); g.fill(); }); }
    else if (kind === 'clock') { global.ART.clock(g, 0, 0, 44, '7:00'); }
    if (kind !== 'clock') { g.lineWidth = 9; g.strokeStyle = C.red; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, 54, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(-38, -38); g.lineTo(38, 38); g.stroke(); }
    g.restore();
  }
  // a bill: a paper card with a coloured header (its name) and an amount; (cx, cy) its centre, about 520 x 340
  GFX.bill = function (g, cx, cy, s, o) {
    o = o || {}; s = s || 1; const w = o.w || 520, h = o.h || 340;
    g.save(); g.translate(cx, cy); g.rotate(o.rot || 0); g.scale(s, s);
    GFX.card(g, 0, 0, w, h, { fill: C.paper, band: o.color || C.red, bandH: 104, r: 26 });
    text(g, o.title || 'BILL', 0, -h / 2 + 54, { size: 54, weight: 900, color: '#FFFFFF', maxW: w - 50 });
    text(g, o.amount != null ? GFX.money(o.amount) : '', 0, 40, { size: 76, weight: 900, color: INK, maxW: w - 60 });
    g.fillStyle = '#C9D3DC'; g.fillRect(-w / 2 + 50, h / 2 - 70, w * 0.5, 14); g.fillRect(-w / 2 + 50, h / 2 - 44, w * 0.3, 14);
    if (o.due) { g.save(); g.translate(w / 2 - 110, h / 2 - 58); g.rotate(-0.2); rr(g, -84, -30, 168, 60, 10); g.lineWidth = 6; g.strokeStyle = C.red; g.stroke(); text(g, 'DUE', 0, 2, { size: 40, weight: 900, color: C.red }); g.restore(); }
    g.restore();
  };
  // a long invoice that unrolls to len (px at s = 1)
  GFX.invoice = function (g, x, y, s, len, o) {
    o = o || {}; s = s || 1; const w = 640; g.save(); g.translate(x, y); g.scale(s, s);
    g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(w / 2, 0); g.lineTo(w / 2, len); for (let i = 0; i <= 16; i++) g.lineTo(w / 2 - i * w / 16, len + (i % 2 ? 16 : 0)); g.closePath(); inked(g, C.paper, LW() + 1);
    rr(g, -w / 2, 0, w, 130, 0); g.fillStyle = '#2F4F46'; g.fill(); text(g, o.title || 'INVOICE', 0, 66, { size: 78, weight: 900, color: '#FFFFFF', letter: 6 });
    g.save(); g.beginPath(); g.rect(-w / 2, 130, w, len - 130); g.clip();
    const items = o.items || []; for (let i = 0, yy = 200; yy < len - 40; i++, yy += 90) { const it = items[i % Math.max(1, items.length)]; g.fillStyle = '#C9D3DC'; if (it) text(g, it, -w / 2 + 50, yy, { size: 44, weight: 800, align: 'left', color: '#5A6670' }); else g.fillRect(-w / 2 + 50, yy - 8, 280, 16); g.fillRect(w / 2 - 190, yy - 8, 140, 16); }
    g.restore(); g.restore();
  };
  // a door with a sign plate (doorTrio): (x, y) = the threshold centre, about 300 x 620 at s = 1; lit 0..1 glows the frame
  GFX.door = function (g, x, y, s, o) {
    o = o || {}; s = s || 1; g.save(); g.translate(x, y); g.scale(s, s);
    if (o.lit) { g.save(); g.globalAlpha = 0.5 * o.lit; rr(g, -190, -680, 380, 700, 30); g.fillStyle = '#FFE38A'; g.fill(); g.restore(); }
    rr(g, -170, -640, 340, 640, 12); inked(g, '#AE7156', 6); rr(g, -140, -610, 280, 610, 6); inked(g, o.color || '#935A47', 5);
    rr(g, -110, -560, 220, 220, 6); inked(g, null, 3.5); rr(g, -110, -300, 220, 240, 6); inked(g, null, 3.5);
    g.beginPath(); g.arc(100, -320, 14, 0, TAU); inked(g, C.gold, 4);
    // the sign plate above the door
    rr(g, -170, -760, 340, 104, 18); inked(g, o.plate || '#FFF6E6', 6); if (o.label) text(g, o.label, 0, -706, { size: 52, weight: 900, color: INK, maxW: 300 });
    if (o.icon) doorIcon(g, 0, -450, o.icon);
    g.restore();
  };
  function doorIcon(g, x, y, kind) {
    g.save(); g.translate(x, y); g.lineCap = 'round';
    if (kind === 'doctor') { g.beginPath(); g.arc(0, 0, 76, 0, TAU); inked(g, '#FFFFFF', 5); g.fillStyle = C.red; g.fillRect(-16, -50, 32, 100); g.fillRect(-50, -16, 100, 32); }
    else if (kind === 'lawyer') { g.lineWidth = 7; g.strokeStyle = INK; g.beginPath(); g.moveTo(0, -60); g.lineTo(0, 60); g.moveTo(-70, -40); g.lineTo(70, -40); g.moveTo(-40, 60); g.lineTo(40, 60); g.stroke(); for (const sd of [-1, 1]) { g.beginPath(); g.arc(sd * 60, -2, 30, 0, Math.PI); inked(g, C.gold, 5); } }
    else if (kind === 'engineer') { g.beginPath(); g.arc(0, 20, 78, Math.PI, 0); g.closePath(); inked(g, C.gold, 6); rr(g, -96, 14, 192, 24, 10); inked(g, C.goldSh, 5); rr(g, -12, -60, 24, 80, 10); inked(g, C.goldSh, 4); }
    g.restore();
  }
  // the report card: a school report with grades and a position badge; (cx, cy) its centre, about 620 x 800
  GFX.reportCard = function (g, cx, cy, s, o) {
    o = o || {}; s = s || 1; const w = 620, h = 800; g.save(); g.translate(cx, cy); g.rotate(o.rot || 0); g.scale(s, s);
    GFX.card(g, 0, 0, w, h, { fill: C.paper, band: '#3E6FA6', bandH: 130, r: 30 });
    text(g, 'REPORT CARD', 0, -h / 2 + 68, { size: 60, weight: 900, color: '#FFFFFF', letter: 3 });
    const rows = o.rows || [['MATHS', 'A'], ['ENGLISH', 'A'], ['SCIENCE', 'A'], ['HISTORY', 'A']];
    rows.forEach(([sub, gr], i) => { const y = -h / 2 + 210 + i * 104; text(g, sub, -w / 2 + 50, y, { size: 48, weight: 800, align: 'left', color: '#5A6670' }); text(g, gr, w / 2 - 80, y, { size: 70, weight: 900, color: C.green }); g.fillStyle = '#E3E8EE'; g.fillRect(-w / 2 + 40, y + 46, w - 80, 4); });
    if (o.first !== false) { g.save(); g.translate(w / 2 - 120, h / 2 - 110); g.rotate(-0.15); GFX.starBadge(g, 0, 0, 0.8); text(g, '1st', 0, 6, { size: 50, weight: 900, color: INK }); g.restore(); }
    g.restore();
  };
  // the software-update window: a title bar, a progress bar, bugs crawling over it (bugs 0..n)
  GFX.updateWindow = function (g, cx, cy, s, o) {
    o = o || {}; s = s || 1; const w = 1200, h = 640; g.save(); g.translate(cx, cy); g.scale(s, s);
    rr(g, -w / 2 + 14, -h / 2 + 18, w, h, 30); g.fillStyle = 'rgba(28,28,28,.22)'; g.fill();
    rr(g, -w / 2, -h / 2, w, h, 30); inked(g, '#FFFFFF', LW() + 1); g.save(); rr(g, -w / 2, -h / 2, w, h, 30); g.clip(); g.fillStyle = '#2F4F5E'; g.fillRect(-w / 2, -h / 2, w, 96); g.restore(); rr(g, -w / 2, -h / 2, w, h, 30); inked(g, null, LW() + 1);
    [C.red, C.gold, C.green].forEach((cc, i) => { g.beginPath(); g.arc(-w / 2 + 56 + i * 50, -h / 2 + 48, 15, 0, TAU); inked(g, cc, 3.5); });
    text(g, o.title || 'FIRSTBORN v1.0', 0, -h / 2 + 50, { size: 50, weight: 900, color: '#FFFFFF' });
    if (o.draw) o.draw(g, w, h);
    const p = clamp(o.progress == null ? 0.3 : o.progress, 0, 1); rr(g, -w / 2 + 80, h / 2 - 130, w - 160, 56, 28); inked(g, '#E3E8EE', 5); if (p > 0) { rr(g, -w / 2 + 80, h / 2 - 130, Math.max(56, (w - 160) * p), 56, 28); inked(g, C.teal, 5); }
    text(g, Math.round(p * 100) + '%', w / 2 - 80, h / 2 - 168, { size: 40, weight: 900, align: 'right', color: '#5A6670' });
    g.restore();
  };
  // the stable-release box: a toy box with a window (draw(g) paints inside), a ribbon, its label
  GFX.releaseBox = function (g, cx, by, s, o) {
    o = o || {}; s = s || 1; g.save(); g.translate(cx, by); g.scale(s, s); const w = 520, h = 640;
    rr(g, -w / 2, -h, w, h, 24); inked(g, '#7FC4C9', LW() + 1); rr(g, -w / 2 + 50, -h + 150, w - 100, h - 230, 20); inked(g, '#E9F6F7', 4);
    if (o.draw) { g.save(); rr(g, -w / 2 + 50, -h + 150, w - 100, h - 230, 20); g.clip(); o.draw(g, -w / 2 + 50, -h + 150, w - 100, h - 230); g.restore(); rr(g, -w / 2 + 50, -h + 150, w - 100, h - 230, 20); inked(g, null, 4); }
    g.save(); g.globalAlpha = 0.35; g.beginPath(); g.moveTo(-w / 2 + 80, -h + 160); g.lineTo(-w / 2 + 170, -h + 160); g.lineTo(-w / 2 + 70, -80); g.lineTo(-w / 2 + 60, -110); g.closePath(); g.fillStyle = '#FFFFFF'; g.fill(); g.restore();
    rr(g, -w / 2 + 30, -h + 30, w - 60, 100, 18); inked(g, C.gold, 5); text(g, o.label || 'STABLE RELEASE', 0, -h + 82, { size: 48, weight: 900, maxW: w - 100 });
    rr(g, -w / 2 + 160, -66, w - 320, 46, 12); inked(g, '#FFFFFF', 4); text(g, o.ver || 'v2.0', 0, -42, { size: 34, weight: 900, color: C.teal });
    g.restore();
  };
  // the bank app screen inside a phone screen rect r = {x, y, w, h}: balance (counting), rows of transactions
  GFX.bankApp = function (g, r, o) {
    o = o || {}; g.save(); g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, 50); g.clip();
    g.fillStyle = '#F4F7F6'; g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = '#2F6E5E'; g.fillRect(r.x, r.y, r.w, r.h * 0.42);
    const cx = r.x + r.w / 2, k = r.w / 576;
    text(g, o.bank || 'MY BANK', cx, r.y + 120 * k, { size: 40 * k, weight: 900, color: '#CFE8DE', letter: 4 });
    text(g, 'BALANCE', cx, r.y + 210 * k, { size: 34 * k, weight: 800, color: '#CFE8DE' });
    text(g, GFX.money(Math.round(o.balance || 0)), cx, r.y + 300 * k, { size: 82 * k, weight: 900, color: '#FFFFFF', maxW: r.w - 40 });
    (o.rows || []).forEach((row, i) => { const kk = clamp(row.k == null ? 1 : row.k, 0, 1); if (kk <= 0) return; const y = r.y + r.h * 0.42 + 40 * k + i * 150 * k; g.save(); g.globalAlpha *= clamp(kk * 3, 0, 1); g.translate(0, (1 - ease.outBack(kk)) * 40);
      g.beginPath(); g.roundRect(r.x + 24 * k, y, r.w - 48 * k, 128 * k, 26 * k); g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#D6DCE2'; g.stroke();
      const inn = row.amount > 0; g.beginPath(); g.arc(r.x + 84 * k, y + 64 * k, 34 * k, 0, TAU); g.fillStyle = inn ? '#77CC81' : '#E37F78'; g.fill();
      text(g, inn ? '+' : '−', r.x + 84 * k, y + 66 * k, { size: 50 * k, weight: 900, color: '#FFFFFF' });
      text(g, row.label, r.x + 136 * k, y + 64 * k, { size: 40 * k, weight: 900, align: 'left', maxW: r.w * 0.45 });
      text(g, (inn ? '+' : '−') + GFX.money(Math.abs(row.amount)), r.x + r.w - 46 * k, y + 64 * k, { size: 40 * k, weight: 900, align: 'right', color: inn ? '#3E8A5A' : '#C0364A' }); g.restore(); });
    g.restore();
  };
})(window);

// ================================================================ placeholder rooms for the sets the kit does not have yet
(function (global) {
  'use strict';
  const FILM = global.FILM, ART = global.ART, GFX = global.GFX, C = GFX.C, INK = '#1c1c1c', TAU = Math.PI * 2, W = 1920, H = 1080;
  const { rr, inked, text } = GFX;
  const box = (q, x, y, w, h, fill, lw) => { q.beginPath(); q.rect(x, y, w, h); inked(q, fill, lw == null ? 3.5 : lw); };
  const label = (q, name) => { q.font = `800 26px ${GFX.FONT}`; q.fillStyle = 'rgba(28,28,28,.45)'; q.textAlign = 'left'; q.textBaseline = 'top'; q.fillText('SET ' + name + ' (placeholder)', 24, 18); };
  const room = (q, wall, floor, fy) => { box(q, 0, 0, W, H, wall, 0); box(q, 0, fy, W, H - fy, floor, 0); q.beginPath(); q.moveTo(0, fy); q.lineTo(W, fy); q.lineWidth = 3.5; q.strokeStyle = INK; q.stroke(); };
  function cached(key, fn) { return (c, o) => { const cv = FILM.cache('ph|' + key(o), q => fn(q, o)); c.g.drawImage(cv, 0, 0); return null; }; }
  // maternity: a calm hospital room, a window, a clear cot on a stand at the centre, a chair
  ART.PH_SETS.maternity = cached(o => 'maternity', q => {
    room(q, '#DDEFE7', '#BFD8CC', 985);
    q.save(); q.globalAlpha = 0.5; q.fillStyle = '#FFFFFF'; q.beginPath(); q.ellipse(960, 380, 700, 300, 0, 0, TAU); q.fill(); q.restore();
    rr(q, 1260, 150, 420, 340, 14); inked(q, '#F6F1EA', 4); rr(q, 1284, 174, 372, 292, 6); inked(q, '#CFE6F0', 3); q.fillStyle = '#FDE6CC'; q.beginPath(); q.ellipse(1470, 470, 220, 70, 0, Math.PI, 0); q.fill();
    q.beginPath(); q.moveTo(1470, 174); q.lineTo(1470, 466); q.lineWidth = 4; q.strokeStyle = INK; q.stroke();
    // the cot: a clear tub on a frame with wheels
    rr(q, 940, 790, 40, 160, 6); inked(q, '#C9CED4', 3.5); rr(q, 780, 944, 360, 20, 8); inked(q, '#C9CED4', 3.5); [800, 1120].forEach(x => { q.beginPath(); q.arc(x, 968, 16, 0, TAU); inked(q, '#6B7480', 3.5); });
    q.beginPath(); q.moveTo(730, 600); q.lineTo(760, 790); q.lineTo(1160, 790); q.lineTo(1190, 600); q.closePath(); q.fillStyle = 'rgba(207,230,240,0.55)'; q.fill(); q.lineWidth = 5; q.strokeStyle = INK; q.stroke();
    q.beginPath(); q.ellipse(960, 600, 230, 26, 0, 0, TAU); q.fillStyle = 'rgba(255,255,255,.6)'; q.fill(); q.stroke();
    // a chair, a little monitor, a heart picture
    rr(q, 230, 700, 220, 40, 12); inked(q, '#E9A0A0', 4); rr(q, 230, 520, 40, 200, 12); inked(q, '#E9A0A0', 4); rr(q, 250, 740, 20, 240, 6); inked(q, '#C9CED4', 3); rr(q, 410, 740, 20, 240, 6); inked(q, '#C9CED4', 3);
    rr(q, 560, 260, 160, 130, 10); inked(q, '#FFFFFF', 4); GFX.heart(q, 640, 330, 0.8, '#E37F78');
    label(q, 'maternity');
  });
  // shop: a corner kiosk, a wooden counter with sweets and tins, an awning, the street ground
  ART.PH_SETS.shop = cached(o => 'shop', q => {
    box(q, 0, 0, W, H, '#FCE9A7', 0); box(q, 0, 900, W, 180, '#E2BF69', 0);
    rr(q, 700, 200, 900, 760, 8); inked(q, '#5FAF6E', 5); rr(q, 760, 300, 780, 340, 6); inked(q, '#2E3A2E', 4);
    for (let r = 0; r < 3; r++) { rr(q, 770, 400 + r * 110, 760, 14, 4); inked(q, '#C98E5A', 3); for (let i = 0; i < 9; i++) { const cc = ['#E37F78', '#F4BF54', '#7BAFE1', '#FFFFFF', '#77CC81'][(i + r) % 5]; rr(q, 790 + i * 82, 330 + r * 110, 54, 70, 8); inked(q, cc, 3); } }
    q.beginPath(); q.moveTo(660, 200); q.lineTo(1640, 200); q.lineTo(1600, 300); q.lineTo(700, 300); q.closePath(); q.fillStyle = '#E5534B'; q.fill(); q.save(); q.clip(); for (let i = 0; i < 12; i++) { q.fillStyle = '#FFF6E6'; q.fillRect(660 + i * 160, 200, 80, 100); } q.restore(); q.lineWidth = 4; q.strokeStyle = INK; q.stroke();
    rr(q, 720, 640, 860, 60, 8); inked(q, '#C98E5A', 5); rr(q, 740, 700, 820, 260, 4); inked(q, '#A8723F', 4);
    rr(q, 840, 160, 620, 70, 14); inked(q, '#FFF6E6', 4); text(q, 'MAMA T STORES', 1150, 196, { size: 44, weight: 900 });
    label(q, 'shop');
  });
  // school: a classroom with a chalkboard and desks, or (o.view 'stage') a hall stage with curtains for the graduation
  ART.PH_SETS.school = cached(o => 'school|' + (o.view || 'class'), (q, o) => {
    if (o.view === 'stage') {
      room(q, '#6E3B4E', '#8A5A3E', 985); q.fillStyle = '#B03A48'; for (const sd of [0, 1]) { q.beginPath(); const x0 = sd ? W : 0, k = sd ? -1 : 1; q.moveTo(x0, 0); q.lineTo(x0 + k * 420, 0); q.quadraticCurveTo(x0 + k * 260, 400, x0 + k * 300, 985); q.lineTo(x0, 985); q.closePath(); q.fill(); q.lineWidth = 4; q.strokeStyle = INK; q.stroke(); }
      rr(q, 200, 760, 1520, 60, 6); inked(q, '#C98E5A', 5); rr(q, 220, 820, 1480, 165, 0); inked(q, '#A8723F', 4); rr(q, 660, 80, 600, 110, 20); inked(q, '#F4BF54', 5); text(q, 'GRADUATION', 960, 136, { size: 66, weight: 900 });
    } else {
      room(q, '#F3D9A8', '#C9A27E', 985); rr(q, 460, 140, 1000, 460, 14); inked(q, '#C98E5A', 6); rr(q, 490, 170, 940, 400, 6); inked(q, '#2F4F46', 4);
      q.font = `700 54px ${GFX.FONT}`; q.fillStyle = 'rgba(255,246,230,.75)'; q.textAlign = 'left'; q.fillText('2 + 2 = 4', 560, 280); q.fillText('a² + b² = c²', 560, 380);
      for (let i = 0; i < 3; i++) { rr(q, 180 + i * 560, 760, 440, 40, 8); inked(q, '#E39A6A', 4); rr(q, 200 + i * 560, 800, 20, 180, 4); inked(q, '#9AA0A6', 3); rr(q, 580 + i * 560, 800, 20, 180, 4); inked(q, '#9AA0A6', 3); }
    }
    label(q, 'school' + (o.view === 'stage' ? ' · stage' : ''));
  });
  // lifePath: green hills, a winding path from bottom-left to top-right; milestones are drawn live by STAGE.lifePath
  ART.PH_SETS.lifePath = cached(o => 'lifePath', q => {
    const sky = q.createLinearGradient(0, 0, 0, 600); sky.addColorStop(0, '#FCE9A7'); sky.addColorStop(1, '#FDCDB0'); q.fillStyle = sky; q.fillRect(0, 0, W, H);
    q.fillStyle = '#A9C96A'; q.beginPath(); q.moveTo(0, 520); q.bezierCurveTo(500, 380, 1200, 520, W, 360); q.lineTo(W, H); q.lineTo(0, H); q.closePath(); q.fill(); q.lineWidth = 3.5; q.strokeStyle = INK; q.stroke();
    q.fillStyle = '#8DB357'; q.beginPath(); q.moveTo(0, 760); q.bezierCurveTo(600, 640, 1300, 820, W, 640); q.lineTo(W, H); q.lineTo(0, H); q.closePath(); q.fill(); q.stroke();
    const P = GFX.LIFEPATH; q.beginPath(); P.forEach((p, i) => i ? q.lineTo(p[0], p[1]) : q.moveTo(p[0], p[1])); q.lineCap = 'round'; q.lineJoin = 'round'; q.lineWidth = 120; q.strokeStyle = INK; q.stroke(); q.lineWidth = 110; q.strokeStyle = '#F2D29B'; q.stroke(); q.lineWidth = 6; q.setLineDash([30, 30]); q.strokeStyle = '#FFF6E6'; q.stroke(); q.setLineDash([]);
    for (let i = 0; i < 8; i++) { const x = 120 + i * 250, y = 470 + ((i * 97) % 90); q.beginPath(); q.arc(x, y, 40, 0, TAU); inked(q, '#81A73A', 3.5); }
    label(q, 'lifePath');
  });
  // the path's centre line (world px), bottom-left to top-right; milestones sit at fractions along it
  GFX.LIFEPATH = [[140, 1000], [420, 900], [760, 860], [980, 760], [900, 650], [1100, 570], [1420, 540], [1560, 450], [1760, 380]];
  GFX.pathAt = function (u) {
    const P = GFX.LIFEPATH; let L = 0; const seg = []; for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(d); L += d; }
    let d = FILM.clamp(u, 0, 1) * L; for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const k = FILM.clamp(d / seg[i], 0, 1); return { x: P[i][0] + (P[i + 1][0] - P[i][0]) * k, y: P[i][1] + (P[i + 1][1] - P[i][1]) * k, s: 0.5 - 0.22 * u }; } d -= seg[i]; }
    return { x: P[P.length - 1][0], y: P[P.length - 1][1], s: 0.28 };
  };
  // lab: a clean lab wall, a table with flasks, a big lamp
  ART.PH_SETS.lab = cached(o => 'lab', q => {
    room(q, '#DCEAF2', '#B9C9D4', 985); for (let i = 0; i < 6; i++) { q.fillStyle = 'rgba(255,255,255,.4)'; q.fillRect(i * 340, 0, 170, 985); }
    rr(q, 560, 700, 800, 40, 8); inked(q, '#FFFFFF', 5); rr(q, 600, 740, 30, 245, 4); inked(q, '#9AA0A6', 3); rr(q, 1290, 740, 30, 245, 4); inked(q, '#9AA0A6', 3);
    [[1220, 700, '#77CC81'], [1290, 700, '#E37F78']].forEach(([x, y, cc]) => { q.beginPath(); q.moveTo(x - 14, y - 120); q.lineTo(x - 14, y - 70); q.lineTo(x - 44, y); q.lineTo(x + 44, y); q.lineTo(x + 14, y - 70); q.lineTo(x + 14, y - 120); q.closePath(); inked(q, '#F4F7FA', 4); q.beginPath(); q.moveTo(x - 32, y - 26); q.lineTo(x + 32, y - 26); q.lineTo(x + 44, y); q.lineTo(x - 44, y); q.closePath(); inked(q, cc, 3); });
    q.beginPath(); q.moveTo(960, 0); q.lineTo(960, 240); q.lineWidth = 6; q.strokeStyle = INK; q.stroke(); q.beginPath(); q.moveTo(860, 330); q.lineTo(900, 240); q.lineTo(1020, 240); q.lineTo(1060, 330); q.closePath(); inked(q, '#9AA0A6', 5);
    q.save(); q.globalAlpha = 0.3; q.beginPath(); q.moveTo(870, 330); q.lineTo(1050, 330); q.lineTo(1260, 700); q.lineTo(660, 700); q.closePath(); q.fillStyle = '#FFF4C2'; q.fill(); q.restore();
    label(q, 'lab');
  });
  // courtroom: wooden panels, the judge's bench at the right, the witness box at the left
  ART.PH_SETS.courtroom = cached(o => 'courtroom', q => {
    room(q, '#E8C49A', '#A8723F', 985); for (let i = 0; i < 8; i++) { rr(q, 40 + i * 240, 120, 200, 600, 8); inked(q, '#DDB386', 3); }
    rr(q, 1080, 560, 700, 425, 10); inked(q, '#8A5A3E', 6); rr(q, 1060, 540, 740, 40, 8); inked(q, '#A8723F', 5); rr(q, 1260, 660, 340, 200, 10); inked(q, '#A8723F', 4);
    q.beginPath(); q.arc(1430, 300, 110, 0, TAU); inked(q, '#F4BF54', 6); q.lineWidth = 6; q.strokeStyle = INK; q.beginPath(); q.moveTo(1430, 230); q.lineTo(1430, 370); q.moveTo(1370, 260); q.lineTo(1490, 260); q.stroke();
    rr(q, 360, 760, 420, 225, 10); inked(q, '#8A5A3E', 6); rr(q, 340, 740, 460, 36, 8); inked(q, '#A8723F', 5);
    label(q, 'courtroom');
  });
  // podium: a conference hall: a blue backdrop with a round emblem; the podium itself is drawn by GFX.podium
  ART.PH_SETS.podium = cached(o => 'podium', q => {
    room(q, '#3E6FA6', '#2F4F6E', 985); q.save(); q.globalAlpha = 0.25; q.beginPath(); q.arc(960, 400, 300, 0, TAU); q.fillStyle = '#FFFFFF'; q.fill(); q.restore();
    q.beginPath(); q.arc(960, 400, 240, 0, TAU); q.lineWidth = 10; q.strokeStyle = 'rgba(255,255,255,.6)'; q.stroke(); q.beginPath(); q.moveTo(720, 400); q.lineTo(1200, 400); q.moveTo(960, 160); q.lineTo(960, 640); q.stroke();
    rr(q, 0, 900, W, 85, 0); inked(q, '#5689C2', 0); label(q, 'podium');
  });
  // bankCounter: a bank hall: the counter with a glass window and a sign, a queue rope
  ART.PH_SETS.bankCounter = cached(o => 'bankCounter', q => {
    room(q, '#E9EEF0', '#C9D3DC', 985); rr(q, 0, 0, W, 120, 0); inked(q, '#2F6E5E', 0);
    rr(q, 560, 160, 800, 110, 16); inked(q, '#2F6E5E', 5); text(q, 'FAMILY BANK', 960, 217, { size: 72, weight: 900, color: '#FFFFFF', letter: 5 });
    rr(q, 360, 330, 1200, 330, 10); q.fillStyle = 'rgba(207,230,240,.5)'; q.fill(); q.lineWidth = 5; q.strokeStyle = INK; q.stroke(); q.beginPath(); q.moveTo(960, 330); q.lineTo(960, 660); q.stroke();
    rr(q, 300, 640, 1320, 50, 8); inked(q, '#C98E5A', 6); rr(q, 320, 690, 1280, 295, 0); inked(q, '#A8723F', 5);
    label(q, 'bankCounter');
  });
  // until the Sets kit draws them: the family room is the living room, the kitchen is Mum's kitchen
  ART.SET_STANDIN.home = { set: 'living', opts: { tod: 'evening' } };
  ART.SET_STANDIN.kitchen = { set: 'mumKitchen' };
})(window);

// ================================================================ staging shared by Firstborn's sequences (STAGE additions)
(function (global) {
  'use strict';
  const FILM = global.FILM, ART = global.ART, GFX = global.GFX, STAGE = global.STAGE, C = GFX.C, W = FILM.WIDTH, H = FILM.HEIGHT, INK = '#1c1c1c';
  const { seg, clamp, ease } = FILM;
  const SK = name => (typeof global.SETS !== 'undefined' && global.SETS && typeof global.SETS[name] === 'function') ? global.SETS[name] : null;
  STAGE.kit = SK;
  // call a kit overlay (SETS[name](g, opts)) when it exists, else the engine's fallback(g); screen space unless o.world
  STAGE.kitDraw = function (c, name, o, fallback) {
    const f = SK(name), g = c.g; g.save(); if (o.screen) c.screen();
    let done = false;
    if (f) { try { f(g, Object.assign({ t: c.t }, o)); done = true; } catch (e) { FILM.warn('SETS.' + name + ': ' + e.message); } }
    if (!done) { ART.placeholders.set[name] = 1; fallback(g); }
    g.restore();
  };
  // the chapter card: the title on the kit's day card, small, in empty space (o.x, o.y), held 1.5-2 s; no veil over the set
  STAGE.chapterCard = function (c, t0, t1, title, o) {
    o = o || {}; STAGE.dayCard(c, t0, t1, title, o.sub || null, { x: o.x == null ? 960 : o.x, y: o.y == null ? 200 : o.y, scale: o.scale || 0.62, veil: o.veil == null ? 0.06 : o.veil, color: o.color });
  };
  // a label pill in world space (names on screen); pops in at t0 when given
  STAGE.tag = function (c, x, y, label, o) {
    o = o || {}; let st = o.t0 != null ? FILM.popInOut(c.t, o.t0, o.t1, 0.3) : { s: 1, a: 1, on: true };
    // o.anim 'slide': it slides in from the side (o.from px, default 300 from the right) and fades; no squash pop
    if (o.t0 != null && o.anim === 'slide') { const k = seg(c.t, o.t0, o.t0 + 0.4, 'outCubic'), out = o.t1 == null ? 0 : seg(c.t, o.t1 - 0.3, o.t1); st = { s: 1, a: clamp(k * 2, 0, 1) * (1 - out), dx: (1 - k) * (o.from || 300), on: c.t >= o.t0 && (o.t1 == null || c.t < o.t1) }; }
    if (!st.on) return;
    GFX.at(c.g, x, y, st, () => STAGE.pill(c, 0, 0, label, { size: o.size || 54, fill: o.fill, color: o.color }));
  };
  // the life path with its milestones (cot, school bag, cap and gown, office, the wedding rice): the kit's lifePath (o.progress 0..1:
  // the road drawing itself and its milestones popping) when it has one, else the placeholder road and the engine's milestone icons
  const MILESTONES = [[0.08, 'cot'], [0.3, 'bag'], [0.52, 'cap'], [0.72, 'office'], [0.92, 'rice']];
  STAGE.lifePath = function (c, o) {
    o = Object.assign({ t: c.t }, o || {}); if (o.progress == null && o.lit != null) o.progress = clamp(o.lit / 5, 0, 1);
    const r = c.set('lifePath', o); const g = c.g, t = c.t;
    if (!ART.hasSet('lifePath')) MILESTONES.forEach(([u, k], i) => {
      const p = GFX.pathAt(u), s = p.s * 1.25, lit = clamp((o.progress == null ? 1 : o.progress) * 5 - i, 0, 1); g.save(); g.globalAlpha *= 0.45 + 0.55 * lit;
      const x = p.x + (i % 2 ? 150 : -150) * s, y = p.y - 30 * s;
      if (k === 'cot') GFX.babyIcon(g, x, y - 110 * s, s * 0.9, { t });
      else if (k === 'bag') GFX.schoolBag(g, x, y - 140 * s, s * 0.9);
      else if (k === 'cap') GFX.gradCap(g, x, y - 80 * s, s * 1.1, -0.1);
      else if (k === 'office') { GFX.rr(g, x - 110 * s, y - 360 * s, 220 * s, 360 * s, 10 * s); GFX.inked(g, '#7BAFE1', 4); for (let a = 0; a < 4; a++) for (let b = 0; b < 2; b++) { GFX.rr(g, x + (-80 + b * 90) * s, y + (-330 + a * 80) * s, 70 * s, 50 * s, 6 * s); GFX.inked(g, '#E9F6F7', 3); } }
      else if (k === 'rice') GFX.ricePot(g, x, y, s * 0.6, { t, steam: 1 });
      g.restore();
    });
    return r;
  };
  // a point on the road (world px) and the figure scale there: STAGE.pathAt(c, u), u 0 (near end) .. 1 (far end); call after STAGE.lifePath
  STAGE.pathAt = function (c, u) {
    const r = c && c.sets && c.sets.lifePath;
    if (r && typeof r.at === 'function') { const p = r.at(u), o = r.toScreen ? r.toScreen(0, 0) : { x: 0, y: 0 }, z = r.zoom || 1; return { x: (p.x - o.x) / z, y: (p.y - o.y) / z, s: p.s / z }; }
    const q = GFX.pathAt(u); return { x: q.x, y: q.y, s: q.s * 1.3 };
  };
  // the graduation stage: the kit's school stage view when it has one, else the placeholder stage
  STAGE.gradStage = function (c, o) {
    const f = SK('school'); if (f && /['"]stage['"]/.test(Function.prototype.toString.call(f))) return c.set('school', Object.assign({ view: 'stage' }, o || {}));
    ART.placeholders.set['school stage view'] = 1; return ART.PH_SETS.school(c, Object.assign({ view: 'stage' }, o || {}));
  };
  // the home's dressing the stand-in living room lacks (the TV, the standing fan, the family photos, the wall clock), drawn only
  // while home is a stand-in: when the kit's home lands it has its own
  STAGE.homeProp = function (c, name, o) {
    if (ART.hasSet('home')) return; o = o || {}; const g = c.g, t = c.t;
    if (name === 'tv') GFX.tv(g, o.x || 1440, o.y || 985, o.s || 0.9, { glow: o.glow, t });
    else if (name === 'fan') GFX.fan(g, o.x || 200, o.y || 990, o.s || 1, o.spin === false ? 0 : t);
    else if (name === 'photos') { [[760, 230, 150, 120, '#E39362'], [960, 250, 120, 150, '#7BAFE1'], [1130, 220, 160, 120, '#77CC81']].forEach(([x, y, w, h, cc]) => { GFX.rr(g, x - w / 2, y - h / 2, w, h, 8); GFX.inked(g, '#FFF6E6', 4); GFX.rr(g, x - w / 2 + 12, y - h / 2 + 12, w - 24, h - 24, 4); GFX.inked(g, cc, 3); }); }
    else if (name === 'clock') ART.clock(g, o.x || 960, o.y || 110, o.r || 60, o.time || '7:00');
  };
  // a figure holding a baby in its arms: the kit's holding 'baby' when it has one, else pose 'carry' and the bundle at the hands
  STAGE.holdBaby = function (c, who, fo, baby, bo) {
    const P = global.POV; bo = bo || {};
    if (P && P.HOLD && P.HOLD.baby) return c.fig(who, Object.assign({}, fo, { hold: 'baby', baby: ART.resolve(baby) || baby, babyExpr: bo.expr, babyLook: bo.look, babyMouth: bo.mouth, babyBlink: bo.blink }));
    const f = c.fig(who, Object.assign({ pose: 'carry' }, fo));
    const hl = f.A.handL, hr = f.A.handR, x = (hl[0] + hr[0]) / 2, y = Math.max(hl[1], hr[1]) + 10 * (fo.s || 1);
    c.fig(baby, Object.assign({ age: 'newborn', x, y, s: (fo.s || 1) * 1.1, lie: fo.face || 1 }, bo));
    return f;
  };
  // the newborn lying in the maternity cot, head to the right (away from the cot's name card): the kit's newborn, else the bundle
  STAGE.cotBaby = function (c, o) {
    o = o || {}; const a = c.anchor(o.set || 'maternity', 'cot', [860, 652, 1]); const s = (o.s || 1) * (a.s || 1);
    const f = c.fig(o.who || 'hero', Object.assign({ age: 'newborn', x: a.x - 10 * s, y: a.y - 22 * s, s: s * 1.45, lie: 1 }, o.fig || {}));
    if (o.front !== false) c.setFront(o.set || 'maternity', o.setOpts || {});
    return f;
  };
  // a baby drawn as an icon (cards, windows, the manual's cover): the kit's baby prop, else the bundle; (x, y) its middle
  GFX.babyIcon = function (g, x, y, s, o) {
    o = o || {}; const P = global.POV;
    if (P && P.PROPS && P.PROPS.baby) { try { P.PROPS.baby(g, x, y, { s: s * 1.35, who: o.who || 'hero', a: o.a || 0, expr: o.expr, look: o.look, blink: o.blink }); return; } catch (e) { } }
    GFX.bundle(g, x, y + 130 * s, s, { t: o.t, expr: o.expr, look: o.look });
  };
  // a full-frame phone in the bank app: the kit's bank mode when it has one, else the kit's phone with the engine's bank screen
  STAGE.bankPhone = function (c, o) {
    o = o || {}; const f = SK('phoneScreen');
    const hasBank = !!(f && /['"]bank['"]/.test(Function.prototype.toString.call(f)));
    if (hasBank) return STAGE.phone(c, { mode: 'bank', app: o.bank, balance: Math.round(o.balance || 0), balanceK: o.balanceK, title: o.title, amount: o.amount, creditK: o.creditK, banner: o.banner, newestFirst: true,
      rows: (o.rows || []).map(r => ({ label: r.label, amount: Math.abs(r.amount), out: r.amount < 0, k: r.k })) });
    ART.placeholders.set['phone bank mode'] = 1;
    c.screen(); let r = null;
    if (f) { c.g.save(); r = f(c.g, Object.assign({ t: c.t, mode: 'chat', messages: [], contact: null }, o, { mode: 'chat' })); c.g.restore(); }
    else { c.g.fillStyle = '#F2B587'; c.g.fillRect(0, 0, W, H); r = { screen: { x: 960 - 288, y: 540 - 503, w: 576, h: 1006 } }; }
    if (r && r.screen) GFX.bankApp(c.g, r.screen, o);
    c.reset(); return r;
  };
  // an incoming call, full frame: the kit's call mode when it has one, else the lock screen with a call note
  STAGE.callPhone = function (c, o) {
    const f = SK('phoneScreen'); if (f && /['"]call['"]/.test(Function.prototype.toString.call(f))) return STAGE.phone(c, Object.assign({ mode: 'call' }, o));
    return STAGE.phone(c, { mode: 'lock', time: o.time || '9:45', notes: [{ icon: 'call', title: o.contact, body: o.status || 'Incoming call', time: 'now' }], notesK: 1, buzz: o.buzz });
  };
  // kit overlays with engine fallbacks, drawn in the current (world) transform; (x, y) the card's centre, s the engine card's scale
  // jobCard: o.rows [{label, k (crossed out 0..1)}], o.title, o.badge (text, false hides), o.badgeK, o.rot, o.k (pop in 0..1, out 1..2)
  STAGE.jobCard = (c, x, y, s, o) => STAGE.kitDraw(c, 'jobCard', { x, y, scale: s * 1.2, rot: o.rot, k: o.k, t: c.t, title: o.title, badge: o.badge == null ? 'FIRSTBORN' : o.badge, badgeK: o.badgeK, sign: o.sign,
    lines: (o.rows || []).map(r => ({ text: r.label, strike: r.k || 0 })) }, g => { GFX.jobCard(g, x, y, s, o); if (o.badge !== false) GFX.badge(g, x + 380 * s, y + 352 * s, 0.9 * s, o.badge || 'FIRSTBORN', { cord: 0, rot: 0.08 }); });
  // rulesBoard: o.rules [{icon, text, k}], o.title
  STAGE.rulesBoard = (c, x, y, s, o) => STAGE.kitDraw(c, 'rulesBoard', { x, y, scale: s * 1.3, title: o.title, rules: (o.rules || []).map(r => ({ text: r.text, k: r.k == null ? 1 : r.k, strike: r.strike })), t: c.t, k: o.k },
    g => GFX.rulesBoard(g, x, y, s, o));
  // a bill: o.title, o.amount, o.color, o.due, o.rot
  STAGE.bill = (c, x, y, s, o) => STAGE.kitDraw(c, 'billCard', { x, y, scale: (s || 1) * 0.93, kind: 'bill', title: o.title, amount: o.amount, color: o.color, sub: o.due ? 'DUE' : o.sub, rot: o.rot || 0, k: o.k, t: c.t },
    g => GFX.bill(g, x, y, s, o));
  // the invoice: the kit's invoice card (o.items, o.total, o.stamp, o.stampK, o.k) when it has one, else the engine's unrolling one (o.len)
  STAGE.invoice = (c, x, y, s, o) => STAGE.kitDraw(c, 'billCard', { x, y, scale: s, kind: 'invoice', title: o.title || 'INVOICE', lines: (o.items || []).map(it => typeof it === 'string' ? { label: it, amount: '' } : it), total: o.total, stamp: o.stamp, stampK: o.stampK, k: o.k, t: c.t },
    g => GFX.invoice(g, x, y - 300 * s, s, o.len || 900, o));
  // the doors of the career choice: o.doors = [{label, icon, lit, k (slid in 0..1), flip}], o.y the threshold line
  STAGE.doors = function (c, o) {
    const f = SK('doorTrio'); if (f) return STAGE.kitDraw(c, 'doorTrio', o, () => { });
    ART.placeholders.set.doorTrio = 1; const g = c.g, n = o.doors.length, y = o.y || 900, sp = o.spacing || 420, s = o.s || 0.95;
    o.doors.forEach((d, i) => { const k = d.k == null ? 1 : d.k; if (k <= 0) return; const x = (o.cx || 960) + (i - (n - 1) / 2) * sp + (1 - ease.outBack(k)) * 900;
      GFX.door(g, x, y, s, { label: d.label, icon: d.icon, lit: d.lit, color: d.color }); });
  };
  // a soft drop shadow ellipse under a floating graphic
  STAGE.shadow = (c, x, y, rx) => { c.g.save(); c.g.fillStyle = 'rgba(80,40,20,.18)'; c.g.beginPath(); c.g.ellipse(x, y, rx, rx * 0.16, 0, 0, Math.PI * 2); c.g.fill(); c.g.restore(); };
  // the honest part's plain ground: the teal set (or plain) with a soft vignette
  STAGE.plain = (c, o) => { c.set('plain', o || {}); };
  // a little idle for anyone: breath bob + head drift (pass into c.fig)
  STAGE.idle = (t, seed, k) => ({ dy: -FILM.breath(t, seed) * (k || 1), turn: 0.1 * FILM.wob(t, 0.2, seed * 7 + 3) });
})(window);
