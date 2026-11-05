/* AUTOPILOT — set: THE KITCHEN (Q02, Q04, Q09; the flash cuts of Q08, Q11 and Q12 are drawShot()s of Q02).
   Look C, "Through Glass". Ports style frame C1 (src/C1_counter.html): the phone charging beside the chrome kettle against the
   garden window, its black glass holding the hall, the front door blazing amber, the bag by the door, the stairs.
   The house: the kitchen is at the back (the garden window faces west / north-west, cool in the morning, the sun coming round
   to it in the afternoon); the hall runs to the east-facing front door, which blazes in the morning. Warmth lives inside glass.
   The set draws the environment only: characters come from RIG and are drawn by the sequences between back() and front().
   See film/api/kitchen.md. Deterministic: OTM.rng / OTM.vnoise / OTM.fbm only. */
(function () {
  'use strict';
  const { W, H } = OTM, P = LC.P;
  const M = 32;                                    // every cached full-frame layer carries this margin (pushes, drift, handheld)
  const clamp = OTM.clamp, lerp = OTM.lerp, mix = OTM.mix, rgba = OTM.rgba;
  const seg = (t, a, b) => clamp((t - a) / (b - a || 1e-6), 0, 1);
  const sstep = (t, a, b) => { const u = seg(t, a, b); return u * u * (3 - 2 * u); };

  // ---------------------------------------------------------------------------------------------------------------
  // small kit
  // ---------------------------------------------------------------------------------------------------------------
  // a full-frame cache with margin: fn(g) draws in frame coordinates (0..W, 0..H), the canvas covers -M..W+M
  function bigCache(c, key, fn) {
    return c.cache(key, (g) => { g.translate(M, M); fn(g); }, W + 2 * M, H + 2 * M);
  }
  function drawBig(c, cv) { c.g.drawImage(cv, -M, -M); }
  // quarter-res emissive cache: fn(e) draws in frame coordinates
  function emCache(c, key, fn) { return c.cache(key, (e) => { e.scale(0.25, 0.25); fn(e); }, W / 4, H / 4); }
  function drawEm(c, cv, a) { const e = c.em; e.save(); if (a != null) e.globalAlpha = a; e.drawImage(cv, 0, 0, W, H); e.restore(); }
  // gamma-crush a hex colour (a black mirror shows only what is lit)
  function crush(hex, gam) { const [r, g, b] = OTM.hexToRgb(hex); const f = v => Math.round(255 * Math.pow(v / 255, gam || 1.35)); return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join(''); }
  // apply an affine [a,b,c,d,e,f] to a point
  const ap = (T, x, y) => [T[0] * x + T[2] * y + T[4], T[1] * x + T[3] * y + T[5]];
  const inv = T => { const det = T[0] * T[3] - T[1] * T[2]; return [T[3] / det, -T[1] / det, -T[2] / det, T[0] / det, (T[2] * T[5] - T[3] * T[4]) / det, (T[1] * T[4] - T[0] * T[5]) / det]; };
  // scratch canvases reused across frames
  const _scr = {};
  function scratch(name, w, h) { let c = _scr[name]; if (!c || c.width !== w || c.height !== h) { c = _scr[name] = OTM.makeCanvas(w, h); } const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, w, h); return g; }

  // =================================================================================================================
  // THE COUNTER (C1)
  // =================================================================================================================
  // C1 is authored in its own 1920x1080 coordinates ("C1 space"). The framings scale it about a point (a pinhole camera's
  // zoom): 'c1' is the style frame exactly, 'wide' is a slightly wider lens (room for the hand and the cable), 'tight' is
  // close on the phone. Everything is drawn out to EXT so the wide framing (and handheld drift) never runs off the set.
  const FRAMES = {
    c1: [1, 0, 0, 1, 0, 0],
    wide: (() => { const k = 0.86; return [k, 0, 0, k, 770 - 785 * k, 610 - 728 * k]; })(),
    tight: (() => { const k = 1.5; return [k, 0, 0, k, 830 - 785 * k, 560 - 452 * k]; })(),
  };
  const EXT = { x0: -300, y0: -200, x1: 2240, y1: 1300 };
  const EW = EXT.x1 - EXT.x0, EH = EXT.y1 - EXT.y0;
  const xlayer = () => { const g = LC.layer(EW, EH); g.translate(-EXT.x0, -EXT.y0); return g; };   // an extended C1-space layer
  const putX = (g, cv) => g.drawImage(cv, EXT.x0, EXT.y0);
  const TOP = 138;
  const RAIL = { y0: 672, y1: 728 };
  const REVEAL = 86, REVEAL_R = 2070;          // the window reveals: left (in C1) and right (only the wide framing reaches it)
  const PH = { tl: [652, 168], tr: [914, 175], br: [928, 731], bl: [638, 735] };
  const SCR = (() => { const i = 11; return { tl: [PH.tl[0] + i, PH.tl[1] + i], tr: [PH.tr[0] - i, PH.tr[1] + i], br: [PH.br[0] - i, PH.br[1] - i], bl: [PH.bl[0] + i, PH.bl[1] - i] }; })();
  const SW = 390, SH = 844;                     // the screen's own pixel space (the lock screen is laid out in it)
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], addv = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k];
  const SUX = sub(SCR.tr, SCR.tl), SVY = sub(SCR.bl, SCR.tl);
  const toScreen = g => g.transform(SUX[0] / SW, SUX[1] / SW, SVY[0] / SH, SVY[1] / SH, SCR.tl[0], SCR.tl[1]);
  const PORT = addv(PH.bl, sub(PH.br, PH.bl), 0.5);
  const CABLE_END = [PORT[0] - 860, PORT[1] + 230], CABLE_FAR = [-560, 1110];   // CABLE_FAR: past the edge of even the wide framing
  const KX = 1404, KT = 292, KB = 708, KR = 238, KH = KB - KT;
  const phonePath = () => LC.rquad([PH.tl, PH.tr, PH.br, PH.bl], 44);
  const screenPath = () => LC.rquad([SCR.tl, SCR.tr, SCR.br, SCR.bl], 36);

  // ---------- the garden, through the glass ----------
  const _garden = {};
  function gardenLayer(tod) { return _garden[tod] || (_garden[tod] = gardenRender(tod)); }
  function gardenRender(tod) {
    const gd = xlayer(), aft = tod === 'afternoon';
    if (!aft) {
      gd.fillStyle = LC.lin(gd, 0, TOP, 0, 400, [[0, '#CCD8D4'], [1, '#E0E3D8']]); gd.fillRect(EXT.x0, EXT.y0, EW, EH);
    } else {   // the sun has come round behind the garden: a warm, bleached sky, hottest top left where the sun stands
      gd.fillStyle = LC.lin(gd, 0, EXT.y0, 0, 420, [[0, '#F7E7C4'], [0.55, '#F1DDB4'], [1, '#E8D6AE']]); gd.fillRect(EXT.x0, EXT.y0, EW, EH);
      gd.save(); gd.globalCompositeOperation = 'screen'; gd.fillStyle = LC.rad(gd, -120, -260, 0, 1500, [[0, '#FFF6E6', 0.95], [0.3, '#FBE7C2', 0.5], [1, '#FBE7C2', 0]]); gd.fillRect(EXT.x0, EXT.y0, EW, EH); gd.restore();
    }
    const R1 = OTM.rng('trees'); const crowns = [];
    for (let i = 0; i < 34; i++) { const x = -80 + i * 62 + R1() * 30, y = 236 + R1() * 70 + Math.sin(i * 0.7) * 26, r = 60 + R1() * 60; const pts = [];
      for (let a = 0; a < 24; a++) { const t = a / 24 * Math.PI * 2, rr = r * (0.82 + 0.3 * OTM.vnoise(Math.cos(t) * 2 + i, Math.sin(t) * 2, 5)); pts.push([x + Math.cos(t) * rr, y + 40 + Math.sin(t) * rr * 0.85]); }
      crowns.push({ p: LC.pathPts(pts), c: mix('#5B766A', '#48625A', R1()) }); }
    // the extension (only the wide framing sees it): more crowns either side, their own seed
    const R1x = OTM.rng('treesX');
    [[-340, -90], [2050, 2300]].forEach(([a, b]) => { for (let x = a; x < b; x += 62) { const y = 236 + R1x() * 70, r = 60 + R1x() * 60, pts = [];
      for (let k = 0; k < 24; k++) { const t = k / 24 * Math.PI * 2, rr = r * (0.82 + 0.3 * OTM.vnoise(Math.cos(t) * 2 + x, Math.sin(t) * 2, 6)); pts.push([x + Math.cos(t) * rr, y + 40 + Math.sin(t) * rr * 0.85]); }
      crowns.push({ p: LC.pathPts(pts), c: mix('#5B766A', '#48625A', R1x()) }); } });
    if (!aft) {
      crowns.forEach(c => { gd.fillStyle = '#C2A773'; gd.fill(c.p); });
      crowns.forEach(c => { gd.save(); gd.translate(4, 9); gd.fillStyle = c.c; gd.fill(c.p); gd.restore(); });
      gd.fillStyle = '#4F695E'; gd.fillRect(EXT.x0, 360, EW, 120);
    } else {   // contre-jour: the crowns go dark and warm-olive, their tops and sun-side edges burn
      crowns.forEach(c => { gd.fillStyle = '#FFE7B8'; gd.fill(c.p); });
      crowns.forEach(c => { gd.save(); gd.translate(7, 6); gd.fillStyle = mix(c.c, '#6E6A44', 0.55); gd.fill(c.p); gd.restore(); });
      gd.fillStyle = '#5E6646'; gd.fillRect(EXT.x0, 360, EW, 120);
    }
    const FT = 338, FB = 604;
    for (let x = -20 - 48 * 7; x < EXT.x1 + 40; x += 48) { const odd = (((x / 48) | 0) % 2 + 2) % 2;
      gd.fillStyle = aft ? mix('#7A6B52', '#6C5E47', odd ? 0.15 : 0.8) : mix('#A2AEA5', '#94A199', odd ? 0.15 : 0.8);
      gd.fillRect(x, FT + (((x * 7) % 9) + 9) % 9, 46, FB - FT);
      if (aft) { gd.fillStyle = 'rgba(255,232,186,0.75)'; gd.fillRect(x + 45, FT + 6, 2.5, FB - FT - 6); }      // the sun through the gaps between the boards
      else { gd.fillStyle = 'rgba(38,48,44,0.35)'; gd.fillRect(x + 45, FT, 3, FB - FT); } }
    gd.fillStyle = aft ? 'rgba(84,64,40,0.45)' : 'rgba(48,60,56,0.5)'; gd.fillRect(EXT.x0, FT + 64, EW, 8); gd.fillRect(EXT.x0, FB - 64, EW, 8);
    gd.fillStyle = aft ? 'rgba(255,240,206,0.95)' : 'rgba(226,186,124,0.75)'; gd.fillRect(EXT.x0, FT - 4, EW, aft ? 8 : 7);
    if (!aft) { gd.fillStyle = LC.lin(gd, 0, FB, 0, RAIL.y0 + 40, [[0, '#5A7162'], [1, '#475E50']]); gd.fillRect(EXT.x0, FB, EW, RAIL.y0 + 60 - FB); }
    else {      // the lawn in sun, the fence's long shadow laid toward the house, slanting with the sun from the left
      gd.fillStyle = LC.lin(gd, 0, FB, 0, RAIL.y0 + 40, [[0, '#B4A35E'], [1, '#9C8E52']]); gd.fillRect(EXT.x0, FB, EW, RAIL.y0 + 60 - FB);
      gd.fillStyle = 'rgba(70,74,46,0.55)'; gd.beginPath(); gd.moveTo(EXT.x0, FB); gd.lineTo(EXT.x1, FB); gd.lineTo(EXT.x1, FB + 30); gd.lineTo(EXT.x0, FB + 22); gd.closePath(); gd.fill();
    }
    // a young tree, and a child's swing hanging still from its branch
    const trunk = aft ? '#4E4A34' : '#3D5047';
    gd.fillStyle = trunk; gd.beginPath(); gd.moveTo(316, FB + 34); gd.bezierCurveTo(308, 500, 326, 420, 298, 280); gd.lineTo(328, 280); gd.bezierCurveTo(350, 420, 338, 500, 344, FB + 34); gd.closePath(); gd.fill();
    gd.beginPath(); gd.moveTo(318, 372); gd.bezierCurveTo(280, 344, 232, 338, 168, 342); gd.lineTo(166, 354); gd.bezierCurveTo(226, 350, 270, 358, 316, 388); gd.closePath(); gd.fill();
    const R2 = OTM.rng('canopy'), blobs = [];
    for (let i = 0; i < 26; i++) { const a = R2() * Math.PI * 2, d = R2(); const col = aft ? mix('#4E5536', '#5A603E', R2()) : mix('#3C5046', '#4C6256', R2()); blobs.push([300 + Math.cos(a) * 200 * d, 210 + Math.sin(a) * 100 * d, 90 + R2() * 50, 70 + R2() * 30, col]); }
    if (aft) blobs.forEach(([x, y, rx, ry]) => { gd.fillStyle = '#FFE6B4'; gd.beginPath(); gd.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); gd.fill(); });   // backlit: the crown's edge burns
    blobs.forEach(([x, y, rx, ry, col]) => { gd.fillStyle = col; gd.beginPath(); gd.ellipse(x + (aft ? 7 : 0), y + (aft ? 6 : 0), rx, ry, 0, 0, Math.PI * 2); gd.fill(); });
    gd.strokeStyle = aft ? '#5A5440' : '#4A5650'; gd.lineWidth = 3; gd.beginPath(); gd.moveTo(206, 348); gd.lineTo(209, 540); gd.moveTo(262, 346); gd.lineTo(259, 540); gd.stroke();
    gd.fillStyle = aft ? '#7A6448' : '#6E6152'; gd.fillRect(198, 536, 72, 10);
    if (aft) { gd.fillStyle = 'rgba(60,58,36,0.5)'; gd.beginPath(); gd.ellipse(420, FB + 40, 160, 12, 0.05, 0, Math.PI * 2); gd.fill(); }
    return LC.blurred(gd.canvas, 7);
  }

  // ---------- the hall, as the phone's glass sees it (C1's render, split into a cached static part and live parts) ----------
  const RW = 536, RH = 1160, HS = 0.7;           // the render's own size, and the live composite's scale
  const HW = Math.round(RW * HS), HHh = Math.round(RH * HS);
  const hallCam = LC.camera({ x: 0, y: 1.0, z: 0, pitch: 0.10, f: 1900, cx: RW / 2, cy: RH / 2 });
  const HALL = { XL: -0.85, XS: 0.10, XR: 1.0, ZD: 9.2, CEIL: 2.62, DX0: -0.75, DX1: 0.05, DT: 2.05, LW: { x0: 0.40, x1: 0.98, y0: 3.0, y1: 4.25 } };
  function hallStatic(tod) {
    const h = LC.layer(RW, RH), cam = hallCam, aft = tod === 'afternoon';
    const Q = (pts, c, a) => LC.quad(h, cam, pts, c, a);
    const { XL, XS, XR, ZD, CEIL, LW } = HALL;
    h.fillStyle = '#100B08'; h.fillRect(0, 0, RW, RH);
    Q([[XL, 0, ZD], [XR, 0, ZD], [XR, 5.4, ZD], [XL, 5.4, ZD]], aft ? '#16130F' : '#1E150F');
    Q([[XL, CEIL, 3], [XS, CEIL, 3], [XS, CEIL, ZD], [XL, CEIL, ZD]], '#150F0B');
    Q([[XL, 0, 3], [XL, CEIL, 3], [XL, CEIL, ZD], [XL, 0, ZD]], aft ? '#1C1610' : '#1A120D');
    Q([[XR, 0, 3], [XR, 5.4, 3], [XR, 5.4, ZD], [XR, 0, ZD]], '#171009');
    // the landing window: full of the morning; in the afternoon a pale, cool square (the sun is round the back now)
    { const a = cam.p(LW.x0, LW.y1, ZD), b = cam.p(LW.x1, LW.y0, ZD);
      h.fillStyle = aft ? LC.lin(h, 0, a[1], 0, b[1], [[0, '#4C5552'], [1, '#353D3B']]) : LC.lin(h, 0, a[1], 0, b[1], [[0, P.sunWhite], [0.6, P.sunCream], [1, P.honey]]); h.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
      h.fillStyle = '#2A1C12'; const m = cam.p((LW.x0 + LW.x1) / 2, 0, ZD)[0]; h.fillRect(m - 4, a[1], 8, b[1] - a[1]); const mh = cam.p(0, (LW.y0 + LW.y1) / 2, ZD)[1]; h.fillRect(a[0], mh - 5, b[0] - a[0], 10);
      h.fillStyle = '#1C130D'; h.fillRect(a[0] - 8, a[1] - 8, b[0] - a[0] + 16, 8); h.fillRect(a[0] - 8, b[1], b[0] - a[0] + 16, 10); }
    if (!aft) { const a = cam.p(LW.x0, LW.y1, ZD), b = cam.p(LW.x1, LW.y0, ZD), c = cam.p(0.3, 0.9, 4.6), d = cam.p(1.0, 0.9, 4.6);
      LC.beam(h, [[a[0], a[1] + 40], [b[0], a[1] + 40], [d[0] + 40, d[1]], [c[0] - 30, c[1]]], P.honey, 0.16, 0.0, [0, a[1]], [0, c[1]]); }
    // the passage floor; the long patches the door's glass lays on the boards (morning)
    const { DX0, DX1 } = HALL;
    if (!aft) { const s0 = cam.p(DX0 + 0.1, 1.9, ZD), s1 = cam.p(DX1 - 0.1, 1.9, ZD), fl = cam.p(-0.85, 0, 6.3), fr = cam.p(0.1, 0, 6.3);
      LC.beam(h, [s0, s1, fr, fl], P.honey, 0.13, 0.0, [0, s0[1]], [0, fl[1]]); }
    Q([[XL, 0, 5.2], [XS, 0, 5.2], [XS, 0, ZD], [XL, 0, ZD]], aft ? '#17120D' : '#1E140D');
    if (!aft) { const pl = LC.layer(RW, RH); const PQ = (pts, c) => LC.quad(pl, cam, pts, c);
      PQ([[-0.74, 0, 5.9], [-0.40, 0, 5.9], [-0.31, 0, 8.3], [-0.64, 0, 8.3]], '#A87240'); PQ([[-0.30, 0, 5.9], [0.04, 0, 5.9], [0.04, 0, 8.3], [-0.22, 0, 8.3]], '#A87240');
      PQ([[-0.69, 0, 6.2], [-0.45, 0, 6.2], [-0.36, 0, 8.0], [-0.60, 0, 8.0]], '#D7A465'); PQ([[-0.25, 0, 6.2], [0.0, 0, 6.2], [0.0, 0, 8.0], [-0.24, 0, 8.0]], '#D7A465');
      h.drawImage(LC.blurred(pl.canvas, 5, false), 0, 0); }
    // the stairs: dark risers, the nosings catching the light as warm lines
    for (let k = 13; k >= 0; k--) {
      const z = 4.4 + 0.25 * k, y0 = 0.2 * k, y1 = 0.2 * (k + 1);
      Q([[XS, y1, z], [XR, y1, z], [XR, y1, z + 0.25], [XS, y1, z + 0.25]], y1 < 1.0 ? (aft ? '#1E1712' : '#2A1C12') : '#140E0A');
      Q([[XS, y0, z], [XR, y0, z], [XR, y1, z], [XS, y1, z]], '#120C08');
      const a = cam.p(XS + 0.12, y1, z - 0.01), b = cam.p(XR, y1, z - 0.01); h.strokeStyle = aft ? rgba('#8E8270', 0.18 + 0.02 * k) : rgba('#D9A466', 0.35 + 0.04 * k); h.lineWidth = Math.max(2, 0.025 * cam.k(z)); h.beginPath(); h.moveTo(a[0], a[1]); h.lineTo(b[0], b[1]); h.stroke();
    }
    Q([[XS, 0, 4.4], [XS, 0.3, 4.4], [XS, 3.1, 7.9], [XS, 2.8, 7.9]], '#0E0A07');
    const rail = z => 0.8 * Math.max(0, (z - 4.4)) + 0.92;
    for (let z = 4.55; z < 7.9; z += 0.14) { const a = cam.p(XS + 0.02, rail(z) - 0.86, z), b = cam.p(XS + 0.02, rail(z), z); h.strokeStyle = '#080605'; h.lineWidth = Math.max(2, 0.035 * cam.k(z)); h.beginPath(); h.moveTo(a[0], a[1]); h.lineTo(b[0], b[1]); h.stroke(); }
    { const pts = []; for (let z = 4.4; z <= 7.95; z += 0.1) pts.push(cam.p(XS + 0.02, rail(z), z)); h.lineCap = 'round'; h.strokeStyle = '#0C0806'; h.lineWidth = 12; h.beginPath(); pts.forEach((q, i) => i ? h.lineTo(q[0], q[1]) : h.moveTo(q[0], q[1])); h.stroke(); }
    // a black mirror shows only what is lit: crush the darks, keep the glow
    const c = OTM.makeCanvas(RW, RH), x = c.getContext('2d'); x.drawImage(h.canvas, 0, 0); const id = x.getImageData(0, 0, RW, RH), d = id.data;
    for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = 255 * Math.pow(d[i + k] / 255, 1.35);
    x.putImageData(id, 0, 0); return LC.blurred(c, 1.1, false);
  }
  // the work bag by the front door, in the door's light: a leather satchel, its outside pocket hanging open and empty
  function drawBag(h, cam, aft) {
    const C = crush; h.save();
    const z = 6.35, x = -0.50, k = cam.k(z), b = cam.p(x, 0, z), bw = 0.50 * k, bh = 0.37 * k, X0 = b[0] - bw / 2, Y1 = b[1];
    const lit = aft ? 'rgba(150,130,104,0.55)' : 'rgba(242,190,120,0.9)';
    h.fillStyle = 'rgba(8,5,4,0.8)'; h.beginPath(); h.ellipse(b[0], Y1 + 2, bw * 0.62, bh * 0.09, 0, 0, Math.PI * 2); h.fill();
    const body = LC.rquad([[X0 + bw * 0.04, Y1 - bh], [X0 + bw * 0.96, Y1 - bh], [X0 + bw, Y1], [X0, Y1]], 0.05 * k);
    h.fillStyle = aft ? LC.lin(h, X0, 0, X0 + bw, 0, [[0, C('#4A3424')], [0.45, C('#2E2018')], [1, C('#22170F')]]) : LC.lin(h, X0, 0, X0 + bw, 0, [[0, C('#7A4C27')], [0.45, C('#40281A')], [1, C('#2A190E')]]); h.fill(body);
    const flap = LC.rquad([[X0 + bw * 0.02, Y1 - bh - 2], [X0 + bw * 0.98, Y1 - bh - 2], [X0 + bw * 0.98, Y1 - bh * 0.6], [X0 + bw * 0.02, Y1 - bh * 0.6]], 0.05 * k);
    h.fillStyle = C('#2A190E'); h.fill(flap); h.fillStyle = lit; h.fillRect(X0 + bw * 0.05, Y1 - bh - 3, bw * 0.9, 3.5);
    h.fillStyle = aft ? 'rgba(150,130,104,0.3)' : 'rgba(242,190,120,0.55)'; h.fillRect(X0 + bw * 0.05, Y1 - bh * 0.6, bw * 0.9, 2);
    const px = X0 + bw * 0.12, py = Y1 - bh * 0.5, pw = bw * 0.76, ph = bh * 0.44;
    h.fillStyle = aft ? LC.lin(h, px, 0, px + pw, 0, [[0, C('#5E4630')], [0.55, C('#3E2C1C')], [1, C('#2E2016')]]) : LC.lin(h, px, 0, px + pw, 0, [[0, C('#A06A38')], [0.55, C('#62401F')], [1, C('#43291A')]]); h.fill(LC.rrect(px, py, pw, ph, 0.025 * k));
    h.fillStyle = '#040202'; h.beginPath(); h.moveTo(px + 3, py + 1); h.quadraticCurveTo(px + pw / 2, py + 0.085 * k, px + pw - 3, py + 1); h.closePath(); h.fill();
    h.strokeStyle = aft ? '#9A8466' : '#F6C886'; h.lineWidth = 3.5; h.beginPath(); h.moveTo(px + 3, py + 1); h.quadraticCurveTo(px + pw / 2, py + 0.085 * k, px + pw - 3, py + 1); h.stroke();
    h.strokeStyle = '#1E120A'; h.lineWidth = 0.032 * k; h.lineCap = 'round'; h.beginPath(); h.moveTo(b[0] - bw * 0.14, Y1 - bh - 2); h.bezierCurveTo(b[0] - bw * 0.12, Y1 - bh - 0.13 * k, b[0] + bw * 0.12, Y1 - bh - 0.13 * k, b[0] + bw * 0.14, Y1 - bh - 2); h.stroke();
    h.strokeStyle = aft ? 'rgba(150,130,104,0.45)' : 'rgba(242,190,120,0.7)'; h.lineWidth = 2.5; h.beginPath(); h.moveTo(b[0] - bw * 0.1, Y1 - bh - 0.105 * k); h.bezierCurveTo(b[0] - bw * 0.04, Y1 - bh - 0.125 * k, b[0] + bw * 0.04, Y1 - bh - 0.125 * k, b[0] + bw * 0.1, Y1 - bh - 0.105 * k); h.stroke();
    h.restore();
  }
  // live parts of the hall in the phone: the front door (its swing), the lamp shade in front of the fanlight, the climber,
  // and the sequence's own figures (s.inGlass(g, cam)). Drawn into the HS-scale scratch on top of the static render.
  function hallLive(h, s, aft) {
    const cam = hallCam, { ZD, DX0, DX1, DT } = HALL; const door = clamp(s.door || 0, 0, 1);
    const C = hex => crush(hex);
    const Q = (pts, c) => LC.quad(h, cam, pts, c);
    // architrave
    Q([[DX0 - 0.09, 0, ZD - 0.01], [DX1 + 0.09, 0, ZD - 0.01], [DX1 + 0.09, 2.54, ZD - 0.01], [DX0 - 0.09, 2.54, ZD - 0.01]], C('#0C0907'));
    const glowRect = (a, b, hot) => { h.fillStyle = hot ? LC.rad(h, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 2, Math.max(b[0] - a[0], b[1] - a[1]) * 0.75, [[0, P.sunWhite], [0.6, C(P.sunCream)], [1, C(P.honey)]])
      : LC.lin(h, 0, a[1], 0, b[1], [[0, C('#58625F')], [1, C('#424B48')]]); h.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); };
    // the doorway behind the leaf: when it opens, the street in the morning sun (a white blaze), or the afternoon's shade
    if (door > 0.001) { const a = cam.p(DX0, DT, ZD - 0.005), b = cam.p(DX1, 0, ZD - 0.005);
      h.fillStyle = aft ? LC.lin(h, 0, a[1], 0, b[1], [[0, C('#B9C2BC')], [1, C('#7E8A84')]]) : LC.lin(h, 0, a[1], 0, b[1], [[0, P.sunWhite], [0.55, '#FFF0D4'], [1, C(P.honey)]]); h.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
      if (!aft) { const fl = cam.p(DX0, 0, ZD), fr = cam.p(DX1, 0, ZD), nl = cam.p(-0.9, 0, 6.4), nr = cam.p(0.2, 0, 6.4);   // the light thrown down the passage
        LC.beam(h, [fl, fr, nr, nl], P.sunCream, 0.55 * door, 0.0, [0, fl[1]], [0, nl[1]]); } }
    // the leaf: hinged on the left, swinging in toward us
    const ang = door * 1.45, hx = DX0, wd = DX1 - DX0;
    const L = (u, y) => [hx + Math.cos(ang) * wd * u, y, ZD - 0.02 - Math.sin(ang) * wd * u];
    Q([L(0, 0), L(1, 0), L(1, DT), L(0, DT)], C(aft ? '#14120F' : '#1A1612'));
    const pane = (u0, u1, y0, y1) => { const pts = [L(u0, y1), L(u1, y1), L(u1, y0), L(u0, y0)].map(p => cam.p(p));
      if (door < 0.02) { glowRect(pts[0], pts[2], !aft); return; }
      h.save(); const cx = (pts[0][0] + pts[2][0]) / 2, cy = (pts[0][1] + pts[2][1]) / 2, rr = Math.max(8, Math.abs(pts[2][1] - pts[0][1]) * 0.7);
      h.fillStyle = aft ? C('#58625F') : LC.rad(h, cx, cy, 1, rr, [[0, '#FFF6E6'], [0.6, '#F6DFB4'], [1, C(P.honey)]]); h.globalAlpha = 1 - 0.25 * door; h.fill(LC.pathPts(pts)); h.restore(); };
    pane(0.125, 0.4625, 1.14, 1.9); pane(0.5375, 0.875, 1.14, 1.9);
    // fanlight: fixed, it never moves
    { const a = cam.p(DX0, 2.45, ZD - 0.03), b = cam.p(DX1, 2.11, ZD - 0.03); glowRect(a, b, !aft); }
    [-0.55, -0.35, -0.15].forEach(x => { const a = cam.p(x, 2.11, ZD - 0.04), b = cam.p(x, 2.45, ZD - 0.04); h.strokeStyle = '#2A1D13'; h.lineWidth = 4; h.beginPath(); h.moveTo(a[0], a[1]); h.lineTo(b[0], b[1]); h.stroke(); });
    { const a = L(0.35, 0.93), b = L(0.65, 0.99); Q([[a[0], a[1], a[2]], [b[0], a[1], b[2]], [b[0], b[1], b[2]], [a[0], b[1], a[2]]], C('#7A5A30')); }   // letterbox
    // the lamp shade, dark against the fanlight
    { const c = cam.p(-0.36, 2.2, 7.6), k = cam.k(7.6); h.fillStyle = '#0B0807'; h.beginPath(); h.moveTo(c[0] - 0.17 * k, c[1]); h.lineTo(c[0] + 0.17 * k, c[1]); h.lineTo(c[0] + 0.12 * k, c[1] - 0.2 * k); h.lineTo(c[0] - 0.12 * k, c[1] - 0.2 * k); h.closePath(); h.fill(); h.fillRect(c[0] - 1.5, c[1] - 0.6 * k, 3, 0.42 * k); }
    if (s.bag !== false) drawBag(h, cam, aft);
    if (s.climber != null) drawClimber(h, cam, s.climber, s.climbT || 0, aft);
    if (typeof s.inGlass === 'function') { h.save(); s.inGlass(h, cam); h.restore(); }
  }
  // C1's Daniel on the stairs (a stand-in a sequence may use: s.climber 0..1 runs him from the foot of the stairs to the landing)
  function drawClimber(h, cam, p, t, aft) {
    p = clamp(p, 0, 1); const z = 4.4 + p * 3.5, y = 0.8 * (z - 4.4) + 0.52;   // C1 has him at p = 0.17 (z 5.0, y 1.0)
    const ph = (Math.floor(t * 12 / 4) % 2);                 // a two-phase step on fours (he is small in the glass)
    const k = cam.k(z), base = cam.p(0.64, y, z);
    h.save(); h.translate(base[0], base[1] + (ph ? 0 : 0.03 * k)); h.scale(k, -k);
    const S = (pts) => h.fill(LC.smooth(pts)); h.fillStyle = '#060404';
    const mirror = ph ? -1 : 1;
    h.save(); h.scale(mirror, 1);
    S([[-0.215, 0.93], [-0.01, 0.93], [-0.02, 0.62], [-0.045, 0.42], [-0.06, 0.14], [-0.05, 0.03, 1], [-0.2, 0.02, 1], [-0.2, 0.2], [-0.205, 0.46], [-0.225, 0.7]]);
    S([[0.01, 0.93], [0.215, 0.93], [0.215, 0.62], [0.2, 0.3], [0.19, -0.02], [0.175, -0.13], [0.09, -0.14], [0.075, 0.1], [0.05, 0.45], [0.03, 0.7]]);
    S([[0.085, -0.13], [0.18, -0.12], [0.19, -0.19], [0.175, -0.24], [0.1, -0.23], [0.08, -0.18]]);
    h.restore();
    S([[-0.235, 0.9], [0.235, 0.9], [0.26, 1.15], [0.28, 1.4], [0.245, 1.52], [0.11, 1.57], [0.0, 1.575], [-0.11, 1.57], [-0.245, 1.52], [-0.28, 1.38], [-0.255, 1.12]]);
    S([[0.22, 1.51], [0.305, 1.45], [0.325, 1.2], [0.315, 0.98], [0.305, 0.83], [0.255, 0.81], [0.24, 0.99], [0.225, 1.24]]);
    S([[-0.22, 1.51], [-0.305, 1.46], [-0.375, 1.33], [-0.445, 1.23], [-0.5, 1.17], [-0.47, 1.105], [-0.39, 1.15], [-0.3, 1.25], [-0.225, 1.33]]);
    S([[-0.06, 1.54], [0.06, 1.54], [0.065, 1.65], [-0.065, 1.65]]);
    S([[-0.104, 1.62], [0.104, 1.62], [0.118, 1.745], [0.104, 1.855], [0.0, 1.9], [-0.104, 1.855], [-0.118, 1.745]]);
    S([[0.11, 1.715], [0.137, 1.73], [0.136, 1.68], [0.112, 1.668]]); S([[-0.11, 1.715], [-0.137, 1.73], [-0.136, 1.68], [-0.112, 1.668]]);
    h.save(); h.scale(mirror, 1); h.fillStyle = '#4E382C'; S([[0.095, -0.15], [0.175, -0.14], [0.183, -0.19], [0.17, -0.225], [0.105, -0.215]]); h.restore();
    h.lineCap = 'round'; h.strokeStyle = aft ? '#8C8476' : '#F6CD92'; h.lineWidth = 0.018;
    h.beginPath(); h.moveTo(-0.096, 1.858); h.quadraticCurveTo(0, 1.925, 0.096, 1.858); h.stroke();
    h.lineWidth = 0.013; h.beginPath(); h.moveTo(-0.068, 1.578); h.quadraticCurveTo(-0.17, 1.572, -0.246, 1.525); h.moveTo(0.068, 1.578); h.quadraticCurveTo(0.17, 1.572, 0.244, 1.525); h.stroke();
    h.lineWidth = 0.011; h.beginPath(); h.moveTo(-0.305, 1.462); h.quadraticCurveTo(-0.4, 1.33, -0.495, 1.18); h.stroke();
    h.restore();
  }
  // the hall reflection for this frame: static (cached, HS scale) + live parts, unflipped; flipped when laid into the glass
  function hallComposite(c, s, tod) {
    const aft = tod === 'afternoon';
    const st = c.cache(`kitchen:hall:${tod}`, (g) => { g.scale(HS, HS); g.drawImage(hallStatic(tod), 0, 0); }, HW, HHh);
    const h = scratch('hallLive', HW, HHh); h.drawImage(st, 0, 0);
    h.save(); h.scale(HS, HS); hallLive(h, s, aft); h.restore();
    return h.canvas;
  }

  // ---------- the kettle's world (environment map) ----------
  function kettleEnv(tod) {
    const aft = tod === 'afternoon';
    return LC.env(1024, 512, (e, X, Y) => {
      const R = (a0, a1, t1, t0, c) => { e.fillStyle = c; e.fillRect(X(a0), Y(t1), X(a1) - X(a0), Y(t0) - Y(t1)); };
      e.fillStyle = aft ? '#3A3833' : '#2F3836'; e.fillRect(0, 0, 1024, 512);
      e.fillStyle = aft ? LC.lin(e, 0, 0, 0, Y(32), [[0, '#A39A88'], [1, '#6A645A']]) : LC.lin(e, 0, 0, 0, Y(32), [[0, '#8C9893'], [1, '#56625E']]); e.fillRect(0, 0, 1024, Y(32));
      e.fillStyle = '#C3CCC7'; e.beginPath(); e.ellipse(X(-8), Y(57), 26, 11, 0, 0, Math.PI * 2); e.fill();
      R(-84, -26, 32, 12, '#1D2423'); R(30, 88, 32, 12, '#1D2423'); R(-100, 100, -6, -44, '#191F1E');
      e.fillStyle = '#323B3A'; [-55, 60].forEach(a => e.fillRect(X(a), Y(32), 2, Y(12) - Y(32)));
      R(-100, 100, -2, -6, aft ? '#B09A78' : '#8C8476');
      R(-24, -9, 34, -44, '#AAB4B0'); R(-11.5, -10.5, 18, 4, '#5A6462'); R(-24, -9, 9.5, 8.5, '#7E8885');
      R(5, 23, 30, -44, '#2B1F16'); R(4, 5.5, 30, -44, '#8C9692'); R(22.5, 24, 30, -44, '#8C9692');
      if (!aft) { R(10.5, 16.5, 12, -6, P.amberLight); R(11.5, 15.5, 10.5, 3, P.sunWhite); R(12.5, 14.5, 2, -5, P.honey); }
      else { R(10.5, 16.5, 12, -6, '#5E6662'); R(11.5, 15.5, 10.5, 3, '#7E8884'); }
      e.fillStyle = aft ? LC.lin(e, 0, Y(-6), 0, Y(-90), [[0, '#9A7E5E'], [0.3, '#8C7458'], [1, '#5B4F44']]) : LC.lin(e, 0, Y(-6), 0, Y(-90), [[0, '#6E6052'], [0.3, '#7D6E5E'], [1, '#5B4F44']]);
      e.fillRect(X(-180), Y(-3), X(-100) - X(-180), 512); e.fillRect(X(100), Y(-3), X(180) - X(100), 512); e.fillRect(0, Y(-44), 1024, 512);
      const win = (a0, a1) => { e.fillStyle = aft ? LC.lin(e, 0, Y(72), 0, Y(0), [[0, '#FFF8EA'], [0.45, '#FBECCB'], [0.75, '#E6CF9C'], [1, '#B8A170']]) : LC.lin(e, 0, Y(72), 0, Y(0), [[0, '#F4F7F5'], [0.45, '#E2EAE5'], [0.75, '#B3C3BA'], [1, '#869A8F']]); e.fillRect(X(a0), Y(72), X(a1) - X(a0), Y(0) - Y(72)); };
      win(102, 180); win(-180, -104);
      R(-180, -104, 0, -3, '#6E7B76'); R(102, 180, 0, -3, '#6E7B76');
      R(-116, -100, 80, -3, '#1E2625'); R(98, 114, 80, -3, '#1E2625'); R(-104, -101, 72, -3, '#8E9B95');
      if (aft) { R(-180, -120, -3, -12, '#A88C64'); R(120, 180, -3, -12, '#A88C64'); }    // the sun's patch on the oak by the window, low in its belly
      R(-100, -84, 34, -3, '#090C0C'); R(-95, -89, 22, 8, aft ? '#2A2622' : '#5A4129');
    });
  }
  const rOf = y => { const t = (KB - y) / KH; if (t < 0 || t > 0.985) return 0; if (t >= 0.38) return KR * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.38) / 0.62, 2))); const u = (0.38 - t) / 0.38; return KR * (1 - 0.1 * Math.pow(u, 5)); };
  const kettlePath = (() => { const pL = [], pR = []; for (let y = KT + 2; y <= KB; y += 2) { const r = rOf(y); pL.push([KX - r, y]); pR.push([KX + r, y]); } return LC.pathPts(pL.concat(pR.reverse())); })();

  // ---------- the static counter (everything that does not change within a state) ----------
  function counterStatic(g, tod) {
    const aft = tod === 'afternoon';
    const garden = gardenLayer(tod);
    putX(g, garden);
    const glassClip = new Path2D(); glassClip.rect(REVEAL, EXT.y0, REVEAL_R - REVEAL, RAIL.y0 - EXT.y0);
    { const gh = xlayer(); gh.fillStyle = aft ? 'rgba(255,226,170,1)' : 'rgba(255,214,150,1)'; gh.fillRect(968, 300, 120, 380); gh.fillStyle = 'rgba(255,244,220,1)'; gh.fillRect(998, 360, 54, 150);
      const ghB = LC.blurred(gh.canvas, 14, false); g.save(); g.clip(glassClip); g.globalCompositeOperation = 'screen'; g.globalAlpha = aft ? 0.05 : 0.13; putX(g, ghB); g.restore();
      g.save(); g.clip(glassClip); g.fillStyle = LC.lin(g, 0, 470, 0, RAIL.y0, [[0, P.ink, 0], [1, P.ink, aft ? 0.06 : 0.16]]); g.fillRect(EXT.x0, 470, EW, RAIL.y0 - 470); g.restore(); }
    LC.glare(g, glassClip, { x: 520, y: 420, angle: -0.98, color: aft ? '#FFF2DC' : '#F6F3EA', bands: [{ d: -250, w: 130, a: 0.06 }, { d: -176, w: 22, a: 0.09 }, { d: 300, w: 220, a: 0.04 }, { d: 405, w: 26, a: 0.06 }] });
    LC.specks(g, glassClip, { x: REVEAL, y: TOP, w: W - REVEAL, h: RAIL.y0 - TOP }, 'winDust', { n: 300, color: '#FFFFFF', rMin: 0.5, rMax: 1.4, aMin: 0.05, aMax: 0.24, scratch: 0.14 });
    LC.specks(g, glassClip, { x: W, y: EXT.y0, w: EXT.x1 - W, h: RAIL.y0 - EXT.y0 }, 'winDustR', { n: 60, color: '#FFFFFF', rMin: 0.5, rMax: 1.4, aMin: 0.05, aMax: 0.24, scratch: 0.14 });
    LC.specks(g, glassClip, { x: REVEAL, y: EXT.y0, w: W - REVEAL, h: TOP - EXT.y0 }, 'winDustT', { n: 70, color: '#FFFFFF', rMin: 0.5, rMax: 1.4, aMin: 0.05, aMax: 0.24, scratch: 0.14 });
    // the window frame (painted timber, contre-jour): the rail, the left reveal, and the right one the wide lens reaches
    const fFace = aft ? '#5E5A50' : '#6F7E78', fEdge = aft ? '#E8D2A8' : '#B5C2BC', fDark = aft ? '#3A3630' : '#46524F';
    g.fillStyle = aft ? '#E6D2AC' : '#BCC7C1'; g.fillRect(REVEAL, RAIL.y0, REVEAL_R - REVEAL, 13);
    g.fillStyle = aft ? LC.lin(g, 0, RAIL.y0 + 13, 0, RAIL.y1, [[0, '#6C665A'], [1, '#4C483F']]) : LC.lin(g, 0, RAIL.y0 + 13, 0, RAIL.y1, [[0, '#869590'], [1, '#64716C']]); g.fillRect(REVEAL, RAIL.y0 + 13, REVEAL_R - REVEAL, RAIL.y1 - RAIL.y0 - 13);
    g.fillStyle = fDark; g.fillRect(REVEAL, RAIL.y0 - 3, REVEAL_R - REVEAL, 3); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(REVEAL, RAIL.y0 - 6, REVEAL_R - REVEAL, 2);
    // left reveal: the recess's side wall, running on toward the lens past the frame edge
    const revL = [[EXT.x0, EXT.y0], [REVEAL, EXT.y0], [REVEAL, RAIL.y1], [EXT.x0, RAIL.y1 + 30 + (0 - EXT.x0) * 0.349]];
    g.fillStyle = aft ? LC.lin(g, REVEAL, 0, -200, 0, [[0, '#8E8574'], [0.43, '#504A40'], [1, '#2E2A25']]) : LC.lin(g, REVEAL, 0, -200, 0, [[0, '#A0ADA7'], [0.43, '#56625E'], [1, '#323A37']]); g.fill(LC.pathPts(revL));
    g.fillStyle = fFace; g.fillRect(REVEAL - 12, EXT.y0, 12, RAIL.y1 - EXT.y0); g.fillStyle = fEdge; g.fillRect(REVEAL - 2, EXT.y0, 2, RAIL.y1 - EXT.y0);
    const revR = [[REVEAL_R, EXT.y0], [EXT.x1, EXT.y0], [EXT.x1, RAIL.y1 + 30 + (EXT.x1 - REVEAL_R) * 0.2], [REVEAL_R, RAIL.y1]];
    g.fillStyle = aft ? LC.lin(g, REVEAL_R, 0, EXT.x1, 0, [[0, '#7E7666'], [1, '#3C3730']]) : LC.lin(g, REVEAL_R, 0, EXT.x1, 0, [[0, '#93A09A'], [1, '#46504D']]); g.fill(LC.pathPts(revR));
    g.fillStyle = fFace; g.fillRect(REVEAL_R, EXT.y0, 12, RAIL.y1 - EXT.y0); g.fillStyle = fEdge; g.fillRect(REVEAL_R, EXT.y0, 2, RAIL.y1 - EXT.y0);
    // the worktop (oiled oak in shade; its satin finish mirrors the window as a bright band)
    const WT = RAIL.y1;
    const wtPath = LC.pathPts([[EXT.x0, RAIL.y1 + 30 + (0 - EXT.x0) * 0.349], [0, RAIL.y1 + 30], [REVEAL, WT], [REVEAL_R, WT], [EXT.x1, RAIL.y1 + 30 + (EXT.x1 - REVEAL_R) * 0.2], [EXT.x1, EXT.y1], [EXT.x0, EXT.y1]]);
    g.fillStyle = aft ? LC.lin(g, 0, WT, 0, H, [[0, '#8A6E52'], [0.2, '#5E4A3A'], [0.6, '#2E2620'], [1, '#171412']]) : LC.lin(g, 0, WT, 0, H, [[0, '#76675A'], [0.2, '#56493F'], [0.6, '#2B2622'], [1, '#161413']]);
    g.fill(wtPath);
    { const R = OTM.rng('grain'); g.save(); g.clip(wtPath); g.globalAlpha = 0.16; for (let i = 0; i < 64; i++) { const y = WT + 5 + Math.pow(R(), 1.5) * (H - WT); g.strokeStyle = R() > 0.5 ? '#251F1A' : '#8C7B68'; g.lineWidth = 0.6 + (y - WT) / 240; g.beginPath(); g.moveTo(EXT.x0, y + R() * 4); g.bezierCurveTo(600, y + (R() - 0.5) * 6, 1300, y + (R() - 0.5) * 6, EXT.x1, y + (R() - 0.5) * 4); g.stroke(); } g.restore(); }
    if (!aft) { const rf = xlayer(); rf.fillStyle = LC.lin(rf, 0, WT, 0, WT + 110, [[0, '#CCD5CF', 0.5], [1, '#CCD5CF', 0]]); rf.fillRect(REVEAL, WT, REVEAL_R - REVEAL, 110);
      rf.globalCompositeOperation = 'destination-out'; rf.fillStyle = '#000'; rf.fillRect(640, WT, 284, 140); rf.fillRect(1150, WT, 510, 140);
      g.save(); g.globalCompositeOperation = 'screen'; putX(g, LC.blurred(rf.canvas, 6, false)); g.restore(); }
    else {   // afternoon: the sun comes in low from the left through the glass and lays the window's light on the oak, raked to the right
      const rf = xlayer(); rf.fillStyle = LC.lin(rf, 0, WT, 0, WT + 120, [[0, '#FFE6B4', 0.6], [1, '#FFE6B4', 0]]); rf.fillRect(REVEAL, WT, REVEAL_R - REVEAL, 120);
      // the sun patch: the glass's light thrown down onto the oak, raked right, fading toward us (the near oak stays dark);
      // the phone's and kettle's shadows are cut out of it and fall toward the lens
      rf.fillStyle = LC.lin(rf, 0, WT, 0, 1000, [[0, '#FFD696', 0.46], [0.45, '#FFD696', 0.22], [1, '#FFD696', 0]]); rf.beginPath(); rf.moveTo(REVEAL, WT + 2); rf.lineTo(REVEAL_R, WT + 2); rf.lineTo(REVEAL_R + 420, H + 60); rf.lineTo(REVEAL + 520, H + 60); rf.closePath(); rf.fill();
      rf.globalCompositeOperation = 'destination-out'; rf.fillStyle = '#000';
      rf.beginPath(); rf.moveTo(640, WT); rf.lineTo(926, WT); rf.lineTo(1186, H + 80); rf.lineTo(880, H + 80); rf.closePath(); rf.fill();                 // the phone's shadow
      rf.beginPath(); rf.moveTo(KX - KR, WT); rf.lineTo(KX + KR, WT); rf.lineTo(KX + KR + 330, H + 80); rf.lineTo(KX - KR + 300, H + 80); rf.closePath(); rf.fill();   // the kettle's
      rf.fillRect(REVEAL_R, WT, 400, 600);
      g.save(); g.globalCompositeOperation = 'screen'; putX(g, LC.blurred(rf.canvas, 9, false)); g.restore();
    }
    { const sh = xlayer(); sh.fillStyle = 'rgba(6,9,9,0.7)'; sh.beginPath(); sh.ellipse(784, 742, 165, 18, 0, 0, Math.PI * 2); sh.fill();
      if (!aft) { sh.fillStyle = 'rgba(6,9,9,0.32)'; sh.beginPath(); sh.moveTo(640, 738); sh.lineTo(926, 734); sh.lineTo(990, 840); sh.lineTo(590, 846); sh.closePath(); sh.fill(); }
      putX(g, LC.blurred(sh.canvas, 12, false)); }
    g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = LC.lin(g, 0, 800, 0, H, [[0, P.honey, 0], [1, P.honey, 0.3]]); g.fillRect(EXT.x0, 800, EW, EXT.y1 - 800); g.restore();

    // ---- the phone (its body; the screen is drawn live) ----
    { const off = [-10, 3]; const back = LC.rquad([[PH.tl[0] + off[0], PH.tl[1] + off[1]], [PH.tr[0] + off[0], PH.tr[1] + off[1]], [PH.br[0] + off[0], PH.br[1] - 2], [PH.bl[0] + off[0], PH.bl[1] - 2]], 44);
      g.fillStyle = aft ? LC.lin(g, PH.tl[0] - 12, 0, PH.tl[0] + 20, 0, [[0, '#B08A5E'], [0.35, '#3A3029'], [1, '#131617']]) : LC.lin(g, PH.tl[0] - 12, 0, PH.tl[0] + 20, 0, [[0, '#4A5354'], [0.35, '#262B2C'], [1, '#131617']]); g.fill(back);
      g.save(); g.clip(back); g.strokeStyle = aft ? 'rgba(255,214,150,0.85)' : 'rgba(206,220,214,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(PH.tl[0] - 7, PH.tl[1] + 60); g.lineTo(PH.bl[0] - 7, PH.bl[1] - 60); g.stroke(); g.restore();
      g.fillStyle = '#525B5C'; g.fill(LC.rrect(PH.tl[0] - 11, 300, 4, 46, 2)); g.fill(LC.rrect(PH.tl[0] - 11, 360, 4, 46, 2)); }
    const body = phonePath(); g.fillStyle = '#171A1B'; g.fill(body);
    g.save(); g.clip(body); g.lineCap = 'round'; g.strokeStyle = aft ? 'rgba(255,224,170,0.95)' : 'rgba(218,230,225,0.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(PH.tl[0] + 42, PH.tl[1] + 1.5); g.lineTo(PH.tr[0] - 40, PH.tr[1] + 1.5); g.quadraticCurveTo(PH.tr[0] - 1, PH.tr[1] + 1, PH.tr[0] - 0.5, PH.tr[1] + 42); g.lineTo(PH.br[0] - 0.5, PH.br[1] - 80); g.stroke(); g.restore();
    g.fillStyle = '#030606'; g.fill(screenPath());

    // ---- the kettle: chrome, environment-mapped ----
    { const sh = xlayer(); sh.fillStyle = 'rgba(6,9,9,0.75)'; sh.beginPath(); sh.ellipse(KX, KB + 26, KR * 1.05, 14, 0, 0, Math.PI * 2); sh.fill();
      if (!aft) { sh.fillStyle = 'rgba(6,9,9,0.3)'; sh.beginPath(); sh.moveTo(KX - KR, KB + 26); sh.lineTo(KX + KR, KB + 26); sh.lineTo(KX + KR + 70, 850); sh.lineTo(KX - KR - 60, 850); sh.closePath(); sh.fill(); }
      putX(g, LC.blurred(sh.canvas, 12, false)); }
    g.fillStyle = '#0F1212'; g.beginPath(); g.ellipse(KX, KB + 14, KR * 0.96, 20, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0F1212'; g.fillRect(KX - KR * 0.96, KB - 2, KR * 1.92, 16);
    g.strokeStyle = aft ? 'rgba(255,214,160,0.6)' : 'rgba(196,210,204,0.5)'; g.lineWidth = 2; g.beginPath(); g.ellipse(KX, KB + 14, KR * 0.96, 20, 0, 0.12, Math.PI - 0.12); g.stroke();
    const hx = v => KX + v * KR, hy = v => KT + v * KH;
    { const hp = new Path2D(); hp.moveTo(hx(0.62), hy(0.16)); hp.bezierCurveTo(hx(1.12), hy(0.08), hx(1.42), hy(0.34), hx(1.3), hy(0.6)); hp.bezierCurveTo(hx(1.24), hy(0.72), hx(1.08), hy(0.77), hx(0.93), hy(0.75));
      hp.lineTo(hx(0.94), hy(0.665)); hp.bezierCurveTo(hx(1.07), hy(0.67), hx(1.16), hy(0.58), hx(1.18), hy(0.48)); hp.bezierCurveTo(hx(1.22), hy(0.29), hx(1.0), hy(0.2), hx(0.67), hy(0.24)); hp.closePath();
      g.fillStyle = '#101313'; g.fill(hp);
      g.save(); g.clip(hp); g.strokeStyle = aft ? 'rgba(255,226,180,0.85)' : 'rgba(220,230,225,0.75)'; g.lineWidth = 3; g.beginPath(); g.moveTo(hx(0.64), hy(0.165)); g.bezierCurveTo(hx(1.13), hy(0.085), hx(1.43), hy(0.34), hx(1.31), hy(0.6)); g.stroke(); g.restore(); }
    { const A = [hx(-0.8), hy(0.56)], B = [hx(-1.32), hy(0.395)];
      const tube = OTM.S().capsule(A[0], A[1], 30, B[0], B[1], 9).path(0, 1);
      const ang = Math.atan2(B[1] - A[1], B[0] - A[0]), nx = -Math.sin(ang), ny = Math.cos(ang), mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
      g.fillStyle = LC.lin(g, mx - nx * 26, my - ny * 26, mx + nx * 26, my + ny * 26, aft ? [[0, '#3A3630'], [0.18, '#FFF0D6'], [0.3, '#B4A488'], [0.55, '#2E2C28'], [0.78, '#9A7A54'], [1, '#22201E']] : [[0, '#2A302F'], [0.18, '#E9EEEB'], [0.3, '#9AA6A1'], [0.55, '#2A302F'], [0.78, '#8B755C'], [1, '#1E2222']]);
      g.fill(tube); g.strokeStyle = 'rgba(8,10,10,0.5)'; g.lineWidth = 1.2; g.stroke(tube);
      g.fillStyle = '#0B0D0D'; g.beginPath(); g.ellipse(B[0] + 2, B[1] - 1, 5, 9, ang + 0.3, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(236,242,238,0.8)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(B[0] + 2, B[1] - 1, 5, 9, ang + 0.3, Math.PI * 0.9, Math.PI * 1.7); g.stroke(); }
    const samp = LC.sampler(kettleEnv(tod));
    LC.chrome(g, { x: KX - KR - 2, y: KT, w: KR * 2 + 4, h: KH + 2 }, (x, y) => {
      const r = rOf(y); if (r <= 0) return null; const u = clamp((x - KX) / r, -0.999, 0.999);
      const dr = (rOf(y + 1) - rOf(y - 1)) / 2, nz = Math.sqrt(1 - u * u), n = [u, dr * nz, nz], l = Math.hypot(n[0], n[1], n[2]); return [n[0] / l, n[1] / l, n[2] / l];
    }, samp, { ss: 2, gain: 0.9, fresnel: 0.22, clip: kettlePath });
    g.save(); g.clip(kettlePath); g.strokeStyle = 'rgba(10,14,14,0.6)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(KX, KT + 46, 98, 12, 0, 0.05, Math.PI - 0.05); g.stroke();
    g.strokeStyle = 'rgba(232,240,236,0.45)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(KX, KT + 49, 98, 12, 0, 0.3, Math.PI - 0.3); g.stroke();
    g.strokeStyle = aft ? 'rgba(255,232,196,0.6)' : 'rgba(236,242,238,0.55)'; g.lineWidth = 5; g.stroke(kettlePath); g.strokeStyle = 'rgba(14,20,20,0.6)'; g.lineWidth = 2.4; g.stroke(kettlePath); g.restore();
    { const sp = (x, y, rx, ry, a) => { g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, x, y, 0, rx, [[0, '#FFFFFF', a], [0.45, '#FFFFFF', a * 0.6], [1, '#FFFFFF', 0]]); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.beginPath(); g.arc(x, y, rx, 0, Math.PI * 2); g.fill(); g.restore(); };
      g.save(); g.clip(kettlePath); sp(KX - KR * 0.78, KT + KH * 0.36, 16, 34, 1); sp(KX - KR * 0.78, KT + KH * 0.36, 6, 16, 1); sp(KX + KR * 0.8, KT + KH * 0.33, 14, 30, 0.95); sp(KX + KR * 0.8, KT + KH * 0.33, 5, 13, 1); sp(KX - KR * 0.4, KT + KH * 0.1, 14, 8, 0.8); g.restore(); }
    g.fillStyle = '#101313'; g.beginPath(); g.moveTo(KX - 30, KT + 26); g.quadraticCurveTo(KX - 36, KT - 10, KX, KT - 15); g.quadraticCurveTo(KX + 36, KT - 10, KX + 30, KT + 26); g.closePath(); g.fill();
    g.strokeStyle = aft ? 'rgba(255,228,184,0.8)' : 'rgba(214,226,220,0.6)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(KX - 27, KT - 2); g.quadraticCurveTo(KX - 2, KT - 16, KX + 24, KT - 5); g.stroke();
  }
  function counterStaticEm(e, tod) {
    const aft = tod === 'afternoon';
    const bl = xlayer(); bl.drawImage(gardenLayer(tod), EXT.x0, EXT.y0); bl.globalCompositeOperation = 'destination-in'; bl.fillStyle = LC.lin(bl, 0, TOP, 0, 520, [[0, '#000000', 1], [1, '#000000', 0]]); bl.fillRect(EXT.x0, EXT.y0, EW, EH);
    e.save(); e.globalAlpha = aft ? 0.5 : 0.28; e.drawImage(bl.canvas, EXT.x0, EXT.y0); e.restore();
    const sp = (x, y, rx, ry, a) => { e.fillStyle = rgba('#FFFFFF', a * 0.8); e.beginPath(); e.ellipse(x, y, rx * 0.5, ry * 0.5, 0, 0, Math.PI * 2); e.fill(); };
    sp(KX - KR * 0.78, KT + KH * 0.36, 16, 34, 1); sp(KX - KR * 0.78, KT + KH * 0.36, 6, 16, 1); sp(KX + KR * 0.8, KT + KH * 0.33, 14, 30, 0.95); sp(KX + KR * 0.8, KT + KH * 0.33, 5, 13, 1); sp(KX - KR * 0.4, KT + KH * 0.1, 14, 8, 0.8);
    e.fillStyle = 'rgba(255,236,206,0.4)'; e.beginPath(); e.ellipse(KX + 46, KT + 220, 8, 18, 0, 0, Math.PI * 2); e.fill();
    if (aft) { e.fillStyle = 'rgba(255,214,150,0.35)'; e.beginPath(); e.moveTo(REVEAL, RAIL.y1); e.lineTo(REVEAL_R, RAIL.y1); e.lineTo(REVEAL_R + 120, RAIL.y1 + 90); e.lineTo(REVEAL + 140, RAIL.y1 + 90); e.closePath(); e.fill(); }
  }

  // ---------- the live screen: black glass, the hall in it, and the lock screen per state ----------
  // screen: 'off' (black glass) | 'wake' (with s.wake 0..1: it lights, the 7% and the green charging glyph arrive) |
  //         'charging' (C1) | 'asleep' (black glass; s.pulse 0..1 lets the green charging glyph breathe in it)
  function screenState(s, t) {
    const st = s.screen || 'charging';
    if (st === 'charging') return { lift: 0, ui: 1, glyph: 1, green: 1 };
    if (st === 'wake') { const w = clamp(s.wake == null ? 1 : s.wake, 0, 1); const pop = seg(w, 0.32, 0.5);
      return { lift: sstep(w, 0, 0.12) * (1 - 0.6 * seg(w, 0.5, 1)), ui: sstep(w, 0.08, 0.3), glyph: sstep(w, 0.08, 0.3), green: pop < 1 ? pop * (1 + 0.25 * Math.sin(pop * Math.PI)) : 1 }; }
    if (st === 'asleep' || st === 'pulse' || st === 'flash') { const p = clamp(s.pulse == null ? (st === 'asleep' ? 0 : 1) : s.pulse, 0, 1);
      const breath = 0.32 + 0.68 * Math.pow(Math.sin(Math.PI * (t * 0.42 + 0.3)), 2); return { lift: 0, ui: 0, glyph: p ? 1 : 0, green: p * breath, outline: p * 0.35 }; }
    return { lift: 0, ui: 0, glyph: 0, green: 0 };
  }
  function drawScreen(c, g, s, t, tod, T) {
    const aft = tod === 'afternoon', ss = screenState(s, t);
    const hall = hallComposite(c, s, tod);
    const screen = screenPath();
    g.save(); g.clip(screen); toScreen(g); g.globalCompositeOperation = 'screen';
    g.translate(SW, 0); g.scale(-1, 1); g.drawImage(hall, 0, 0, SW, SH);
    g.restore();
    g.save(); g.clip(screen); toScreen(g);
    g.fillStyle = LC.lin(g, 0, 0, 0, SH * 0.3, [[0, '#9FB4B0', 0.07], [1, '#9FB4B0', 0]]); g.fillRect(0, 0, SW, SH * 0.3);
    if (ss.lift > 0) { g.fillStyle = rgba('#1C2628', 0.5 * ss.lift); g.fillRect(0, 0, SW, SH); }
    // lock screen: the island, the 7% and the charging glyph
    if (ss.ui > 0 || ss.glyph > 0) {
      const bx = 141, by = 172, bw = 100, bh = 46;
      g.globalAlpha = Math.max(ss.ui, ss.outline || 0);
      if (ss.ui > 0) { g.fillStyle = '#000'; g.globalAlpha = ss.ui; g.fill(LC.rrect(146, 24, 98, 30, 15)); }
      const oa = ss.ui > 0 ? ss.ui : (ss.outline || 0);
      if (oa > 0) { g.globalAlpha = oa; g.lineWidth = 3.2; g.strokeStyle = 'rgba(222,232,228,0.92)'; g.stroke(LC.rrect(bx, by, bw, bh, 12.5)); g.fillStyle = 'rgba(222,232,228,0.92)'; g.fill(LC.rrect(bx + bw + 4, by + 14, 6, 18, 3)); }
      if (ss.green > 0) { g.globalAlpha = clamp(ss.green, 0, 1); g.fillStyle = P.charge; g.fill(LC.rrect(bx + 5, by + 5, 10, bh - 10, 5));
        const sc = ss.green > 1 ? ss.green : 1; g.save(); g.translate(bx + 51, by + 23); g.scale(sc, sc); g.translate(-(bx + 51), -(by + 23));
        g.beginPath(); g.moveTo(bx + 55, by + 6); g.lineTo(bx + 39, by + 26); g.lineTo(bx + 51, by + 26); g.lineTo(bx + 45, by + 41); g.lineTo(bx + 63, by + 18); g.lineTo(bx + 51, by + 18); g.closePath(); g.fill(); g.restore(); }
      if (ss.ui > 0) { g.globalAlpha = ss.ui; g.font = '500 38px "Libre Franklin"'; g.textAlign = 'center'; g.fillStyle = 'rgba(234,240,236,0.96)'; g.fillText('7%', SW / 2 + 3, by - 24); }
      g.globalAlpha = 1;
    }
    g.restore();
    // emissive: the hall's glow in the glass, the green
    const E = c.em; E.save(); E.transform(...T); toScreen(E); E.globalAlpha = 0.55; E.translate(SW, 0); E.scale(-1, 1); E.drawImage(hall, 0, 0, SW, SH); E.restore();
    if (ss.green > 0) { E.save(); E.transform(...T); toScreen(E); E.fillStyle = P.charge; E.globalAlpha = 0.9 * clamp(ss.green, 0, 1); E.fillRect(141 + 4, 172 + 4, 64, 46 - 8);
      if (ss.outline) { E.globalAlpha = 0.5 * clamp(ss.green, 0, 1); E.beginPath(); E.ellipse(141 + 36, 172 + 23, 70, 44, 0, 0, Math.PI * 2); E.fill(); } E.restore(); }
    // glass on glass: a long sheen, the refracted lip of the curved edge
    LC.glare(g, screen, { x: 790, y: 450, angle: -1.12, color: aft ? '#FFF0DA' : '#FFFFFF', bands: [{ d: -60, w: 80, a: 0.045 }, { d: 64, w: 16, a: 0.055 }] });
    g.save(); g.clip(screen); g.strokeStyle = 'rgba(212,226,221,0.32)'; g.lineWidth = 2.2; g.stroke(screen); g.restore();
    return ss;
  }
  // the cable: plugged (C1), lying loose on the oak, or held (s.plug = [x, y] in frame coordinates, the sequence's hand)
  function drawCable(g, s, T) {
    const st = s.cable || 'plugged';
    let tip = null, ang = -Math.PI / 2;
    if (Array.isArray(s.plug)) { tip = ap(inv(T), s.plug[0], s.plug[1]); ang = s.plugAngle != null ? s.plugAngle : -Math.PI / 2; }
    else if (st === 'loose') { tip = [668, 846]; ang = -0.3; }
    if (!tip) {   // plugged in, as C1
      g.fillStyle = '#D3D7D2'; g.fill(LC.rrect(PORT[0] - 12, PORT[1] - 4, 24, 26, 4)); g.fillStyle = 'rgba(40,46,46,0.45)'; g.fillRect(PORT[0] - 12, PORT[1] + 12, 24, 10);
      const cp = new Path2D(); cp.moveTo(PORT[0], PORT[1] + 20); cp.bezierCurveTo(PORT[0] + 8, PORT[1] + 64, PORT[0] - 30, PORT[1] + 84, PORT[0] - 150, PORT[1] + 104); cp.bezierCurveTo(PORT[0] - 300, PORT[1] + 128, PORT[0] - 470, PORT[1] + 136, CABLE_END[0], CABLE_END[1]);
      cp.bezierCurveTo(CABLE_END[0] - 180, CABLE_END[1] + 48, CABLE_FAR[0] + 200, CABLE_FAR[1] - 50, CABLE_FAR[0], CABLE_FAR[1]);
      cableStroke(g, cp); return;
    }
    // the plug end: a short white boot pointing along ang, the cable leaving its tail and sagging off to the far end
    const ux = Math.cos(ang), uy = Math.sin(ang), tail = [tip[0] - ux * 26, tip[1] - uy * 26];
    const cp = new Path2D(); cp.moveTo(tail[0], tail[1]);
    const lying = !Array.isArray(s.plug);
    if (lying) { cp.bezierCurveTo(tail[0] - 90, tail[1] + 40, tail[0] - 120, tail[1] + 120, tail[0] - 260, tail[1] + 112); cp.bezierCurveTo(tail[0] - 420, tail[1] + 104, CABLE_END[0] + 240, CABLE_END[1] - 40, CABLE_END[0], CABLE_END[1]); }
    else cp.bezierCurveTo(tail[0] - ux * 90, tail[1] - uy * 90 + 40, CABLE_END[0] + 300, CABLE_END[1] - 10, CABLE_END[0], CABLE_END[1]);
    cp.bezierCurveTo(CABLE_END[0] - 180, CABLE_END[1] + 48, CABLE_FAR[0] + 200, CABLE_FAR[1] - 50, CABLE_FAR[0], CABLE_FAR[1]);
    cableStroke(g, cp);
    g.save(); g.translate(tip[0], tip[1]); g.rotate(ang + Math.PI / 2); g.fillStyle = '#D3D7D2'; g.fill(LC.rrect(-12, 0, 24, 30, 4)); g.fillStyle = '#9DA4A0'; g.fillRect(-7, -9, 14, 10); g.fillStyle = 'rgba(40,46,46,0.4)'; g.fillRect(-12, 18, 24, 10); g.restore();
  }
  function cableStroke(g, cp) {
    // a soft shadow without a filter: three widening strokes, offset onto the oak
    g.save(); g.translate(0, 9); g.lineCap = 'round'; [[24, 0.10], [17, 0.14], [11, 0.2]].forEach(([w, a]) => { g.strokeStyle = rgba('#060808', a); g.lineWidth = w; g.stroke(cp); }); g.restore();
    g.lineCap = 'round'; g.strokeStyle = '#949B97'; g.lineWidth = 9; g.stroke(cp); g.strokeStyle = '#D6DAD5'; g.lineWidth = 4.5; g.save(); g.translate(0, -1.6); g.stroke(cp); g.restore();
  }

  // ---------- the afternoon's dust, turning in the sun (front) ----------
  function dust(g, t, T, amt) {
    const R = OTM.rng('kdust'); g.save(); g.globalCompositeOperation = 'screen';
    for (let i = 0; i < 150; i++) {
      const near = i % 9 === 0, x0 = R() * 2100 - 100, y0 = R() * 900 + 60, sp = 0.15 + R() * 0.5, ph = R() * 100, sz = near ? 4 + R() * 5 : 0.8 + R() * 2.2;
      const x = x0 + 26 * Math.sin(t * sp * 0.6 + ph) + t * 4 * (R() - 0.3), y = y0 + 18 * Math.sin(t * sp * 0.43 + ph * 1.7) - t * 2.5 * R();
      // inside the slanted beam from the window (upper left to lower right)
      const inBeam = clamp(1 - Math.abs((x - 380) - (y - 300) * 0.62 - 420) / 520, 0, 1);
      const a = amt * inBeam * (0.25 + 0.6 * Math.pow(Math.sin(t * 0.9 * sp + ph * 3), 2)) * (near ? 0.22 : 1);
      if (a < 0.02) continue;
      const p = ap(T, x, y); g.fillStyle = rgba('#FFE8C0', a); g.beginPath(); g.arc(p[0], p[1], sz * T[0], 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  const counter = {
    frames: Object.keys(FRAMES),
    back(c, t, s) {
      s = s || {}; const tod = s.tod === 'afternoon' ? 'afternoon' : 'morning', fr = FRAMES[s.frame] ? s.frame : 'c1', T = FRAMES[fr];
      const bg = bigCache(c, `kitchen:counter:${fr}:${tod}`, g => { g.save(); g.transform(...T); counterStatic(g, tod); g.restore(); });
      drawBig(c, bg);
      drawEm(c, emCache(c, `kitchen:counterEm:${fr}:${tod}`, e => { e.save(); e.transform(...T); counterStaticEm(e, tod); e.restore(); }));
      const g = c.g; g.save(); g.transform(...T);
      const ss = drawScreen(c, g, s, t, tod, T);
      // the green on the oak under the phone, and its fleck in the kettle's flank
      if (ss.green > 0) { const a = clamp(ss.green, 0, 1);
        g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, 780, 748, 0, 130, [[0, P.charge, 0.09 * a], [1, P.charge, 0]]); g.fillRect(620, 690, 330, 120); g.restore();
        g.save(); g.clip(kettlePath); g.fillStyle = rgba(P.charge, 0.85 * a); g.fillRect(1256, 428, 5, 9); g.restore();
        const E = c.em; E.save(); E.transform(...T); E.fillStyle = rgba(P.charge, 0.5 * a); E.fillRect(1254, 426, 9, 13); E.restore(); }
      drawCable(g, s, T);
      g.restore();
    },
    front(c, t, s) {
      s = s || {}; const tod = s.tod === 'afternoon' ? 'afternoon' : 'morning', T = FRAMES[s.frame] || FRAMES.c1;
      if (tod === 'afternoon') { const g = c.g, a = s.dust == null ? 1 : s.dust;
        g.save(); g.transform(...T); g.globalCompositeOperation = 'screen';
        g.fillStyle = LC.lin(g, 200, 120, 760, 980, [[0, '#FFE2B0', 0], [0.35, '#FFE2B0', 0.07 * a], [0.75, '#FFE2B0', 0.035 * a], [1, '#FFE2B0', 0]]);
        g.beginPath(); g.moveTo(-200, -100); g.lineTo(760, -100); g.lineTo(1500, 1000); g.lineTo(520, 1000); g.closePath(); g.fill(); g.restore();
        dust(g, t, T, a); }
    },
    // where things are, per framing (frame px). pxPerM: at the phone (it stands close to the lens) and at the kettle (by the glass)
    anchorsFor(frame) {
      const T = FRAMES[frame] || FRAMES.c1, P2 = (x, y) => ap(T, x, y).map(v => Math.round(v));
      return { phone: P2(785, 452), screen: [P2(...SCR.tl), P2(...SCR.tr), P2(...SCR.br), P2(...SCR.bl)], port: P2(PORT[0], PORT[1] + 6), plugLoose: P2(700, 872),
        cableEnd: P2(...CABLE_END), kettle: P2(KX, 500), kettleBody: [P2(KX - KR, KT), P2(KX + KR, KB)], worktopY: Math.round(ap(T, 0, RAIL.y1)[1]),
        handIn: P2(420, 1120), pxPerM: { phone: Math.round(3770 * T[0]), kettle: Math.round(1890 * T[0]) } };
    },
    hallCam,           // the hall render's camera (metres; hall space) for s.inGlass(g, cam)
  };
  counter.anchors = counter.anchorsFor('c1');
  counter.light = { x: 960, y: 140, color: '#D9E3DF', note: 'morning: the garden window behind the phone (cool, soft); afternoon: s.tod afternoon -> lightFor' };
  counter.lightFor = s => (s && s.tod === 'afternoon') ? { x: -260, y: -220, color: '#FFD9A0' } : counter.light;

  // =================================================================================================================
  // THE HALL (hall space: C1's reflection metres. x runs toward the stairs, y up, z toward the front door at 9.2.
  // The passage is x -0.85..0.10 beside the stairs (x 0.10..1.0, rising from z 4.4 to the landing at 7.9, y 2.8).)
  // =================================================================================================================
  const HMIR = { z0: 5.45, z1: 6.05, y0: 0.32, y1: 1.92 };    // the long mirror on the passage wall, just short of the bag
  const BAG = { x: -0.50, z: 6.35 };
  // the hall rendered mirrored across the passage wall (x = -0.85): what the long mirror holds
  function mirrored(cam) { const p = (x, y, z) => { if (Array.isArray(x)) { z = x[2]; y = x[1]; x = x[0]; } return cam.p(-1.7 - x, y, z); }; return { p, pts: a => a.map(q => p(q)), f: cam.f, cx: cam.cx, cy: cam.cy, k: z => cam.f / z, mirror: true }; }
  const kAt = (cam, x, y, z) => cam.f / Math.max(0.05, cam.p(x, y, z)[2]);
  const seg2 = (g, cam, a, b, w, col) => { const p = cam.p(a), q = cam.p(b); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); };

  // the room: floor, walls, ceiling, the end wall, the landing window (o.mirror: skip the passage wall itself)
  function hallRoom(g, cam, o) {
    const { XL, XS, XR, ZD, CEIL, LW } = HALL, Q = (pts, col) => LC.quad(g, cam, pts, col);
    const Z0 = 2.4;
    // ceiling, right (stairwell) wall, end wall
    Q([[XL, CEIL, Z0], [XR, CEIL, Z0], [XR, CEIL, 4.4], [XL, CEIL, 4.4]], '#0E191B');
    Q([[XL, CEIL, 4.4], [XS, CEIL, 4.4], [XS, CEIL, ZD], [XL, CEIL, ZD]], '#111D20');
    { const zs = [Z0, 5.4, 7.4, ZD], cols = ['#101C1E', '#16201F', '#22261F']; for (let i = 0; i < 3; i++) Q([[XR, 0, zs[i]], [XR, 5.4, zs[i]], [XR, 5.4, zs[i + 1] + 0.002], [XR, 0, zs[i + 1] + 0.002]], cols[i]); }
    Q([[XL, 0, ZD], [XR, 0, ZD], [XR, 5.4, ZD], [XL, 5.4, ZD]], '#1A1814');
    // the stairwell's upper void and the landing window full of the morning
    { const a = cam.p(LW.x0, LW.y1, ZD - 0.01), b = cam.p(LW.x1, LW.y0, ZD - 0.01); const pts = [cam.p(LW.x0, LW.y1, ZD - 0.01), cam.p(LW.x1, LW.y1, ZD - 0.01), cam.p(LW.x1, LW.y0, ZD - 0.01), cam.p(LW.x0, LW.y0, ZD - 0.01)];
      g.fillStyle = LC.lin(g, 0, a[1], 0, b[1], [[0, P.sunWhite], [0.6, P.sunCream], [1, P.honey]]); g.fill(LC.pathPts(pts));
      const m = (LW.x0 + LW.x1) / 2, mh = (LW.y0 + LW.y1) / 2; const k = kAt(cam, m, mh, ZD);
      seg2(g, cam, [m, LW.y0, ZD - 0.02], [m, LW.y1, ZD - 0.02], Math.max(2, 0.04 * k), '#2A1C12'); seg2(g, cam, [LW.x0, mh, ZD - 0.02], [LW.x1, mh, ZD - 0.02], Math.max(2, 0.05 * k), '#2A1C12');
      LC.beam(g, [pts[0], pts[1], cam.p(1.0, 1.2, 5.2), cam.p(0.3, 1.2, 5.2)], P.honey, 0.12, 0, [0, a[1]], [0, cam.p(0, 1.2, 5.2)[1]]); }
    // floor: dark boards running toward the door
    const fl = [[XL, 0, Z0], [XR, 0, Z0], [XR, 0, ZD], [XL, 0, ZD]];
    Q(fl, '#1B120C');
    g.save(); g.clip(LC.pathPts(cam.pts(fl))); g.strokeStyle = 'rgba(8,5,3,0.55)';
    for (let x = XL + 0.13; x < XR; x += 0.14) seg2(g, cam, [x, 0, Z0], [x, 0, ZD], 1.2, 'rgba(8,5,3,0.55)');
    g.restore();
    // the passage wall: plaster in shade, warming toward the door in three flat steps; a skirting board with a lit top edge
    if (!o.mirror) {
      // flat bands at constant depth (vertical in the frame), warming toward the door
      const zs = [Z0, 5.0, 6.6, 7.9, ZD], cols = ['#162527', '#1D2F31', '#283433', '#3A3A33'];
      for (let i = 0; i < 4; i++) Q([[XL, 0, zs[i]], [XL, CEIL, zs[i]], [XL, CEIL, zs[i + 1] + 0.002], [XL, 0, zs[i + 1] + 0.002]], cols[i]);
      Q([[XL + 0.001, 0, Z0], [XL + 0.001, 0.13, Z0], [XL + 0.001, 0.13, ZD], [XL + 0.001, 0, ZD]], '#111A1B');
      seg2(g, cam, [XL + 0.002, 0.13, 4.0], [XL + 0.002, 0.13, ZD], 1.6, 'rgba(214,164,104,0.35)');
    }
    // the door's light on the boards: two long patches, as in C1
    const pl = LC.layer(); const PQ = (pts, col) => LC.quad(pl, cam, pts, col);
    PQ([[-0.74, 0, 5.9], [-0.40, 0, 5.9], [-0.31, 0, 8.3], [-0.64, 0, 8.3]], '#A87240'); PQ([[-0.30, 0, 5.9], [0.04, 0, 5.9], [0.04, 0, 8.3], [-0.22, 0, 8.3]], '#A87240');
    PQ([[-0.69, 0, 6.2], [-0.45, 0, 6.2], [-0.36, 0, 8.0], [-0.60, 0, 8.0]], '#D7A465'); PQ([[-0.25, 0, 6.2], [0.0, 0, 6.2], [0.0, 0, 8.0], [-0.24, 0, 8.0]], '#D7A465');
    g.drawImage(LC.blurred(pl.canvas, 4, false), 0, 0);
    // the doormat
    Q([[-0.68, 0.005, 8.55], [-0.02, 0.005, 8.55], [-0.02, 0.005, 9.12], [-0.68, 0.005, 9.12]], '#120D0A');
  }
  // the stairs: string, risers, treads (nosings catch the door's light), balusters, the handrail
  function hallStairs(g, cam) {
    const { XS, XR } = HALL, Q = (pts, col) => LC.quad(g, cam, pts, col);
    for (let k = 13; k >= 0; k--) {
      const z = 4.4 + 0.25 * k, y0 = 0.2 * k, y1 = 0.2 * (k + 1);
      Q([[XS, y1, z], [XR, y1, z], [XR, y1, z + 0.25], [XS, y1, z + 0.25]], y1 < 1.0 ? '#2A1C12' : '#1E150E');
      Q([[XS, y0, z], [XR, y0, z], [XR, y1, z], [XS, y1, z]], '#120C08');
      const kk = kAt(cam, XS + 0.4, y1, z); seg2(g, cam, [XS + 0.1, y1, z - 0.01], [XR, y1, z - 0.01], Math.max(1.5, 0.022 * kk), rgba('#D9A466', 0.35 + 0.035 * k));
    }
    Q([[XS, 0, 4.4], [XS, 0.3, 4.4], [XS, 3.1, 7.9], [XS, 2.8, 7.9]], '#0E0A07');
    Q([[XS, 0, 4.4], [XS, 0.3, 4.4], [XS, 0.3, 2.4], [XS, 0, 2.4]], '#0E0A07');
    const rail = z => 0.8 * Math.max(0, (z - 4.4)) + 0.92;
    g.lineCap = 'butt';
    for (let z = 4.55; z < 7.9; z += 0.14) { const kk = kAt(cam, XS + 0.02, rail(z), z); seg2(g, cam, [XS + 0.02, rail(z) - 0.86, z], [XS + 0.02, rail(z), z], Math.max(2, 0.03 * kk), '#080605'); }
    // the newel post at the foot, and the rail
    { const kk = kAt(cam, XS + 0.02, 1.0, 4.42); seg2(g, cam, [XS + 0.02, 0, 4.42], [XS + 0.02, 1.08, 4.42], Math.max(3, 0.08 * kk), '#0A0705'); }
    const pts = []; for (let z = 4.42; z <= 7.95; z += 0.1) pts.push(cam.p(XS + 0.02, rail(z), z));
    g.lineCap = 'round'; g.strokeStyle = '#0C0806'; g.lineWidth = Math.max(4, 0.05 * kAt(cam, XS, 1.5, 5.6)); g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
    g.strokeStyle = 'rgba(232,180,116,0.45)'; g.lineWidth = Math.max(1.2, 0.01 * kAt(cam, XS, 1.5, 5.6)); g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1] - 2) : g.moveTo(q[0], q[1] - 2)); g.stroke();
  }
  // the front door: o.door 0 (shut, C1) .. 1 (open, swung in on its left hinges); the street beyond blazes white
  function hallDoor(g, cam, o) {
    const { ZD, DX0, DX1, DT } = HALL, Q = (pts, col) => LC.quad(g, cam, pts, col); const door = clamp(o.door || 0, 0, 1);
    Q([[DX0 - 0.09, 0, ZD - 0.01], [DX1 + 0.09, 0, ZD - 0.01], [DX1 + 0.09, 2.54, ZD - 0.01], [DX0 - 0.09, 2.54, ZD - 0.01]], '#0D0A08');
    const glow = (pts, a) => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, r = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 0.75;
      g.save(); if (a != null) g.globalAlpha = a; g.fillStyle = LC.rad(g, cx, cy, 2, r, [[0, P.sunWhite], [0.6, P.sunCream], [1, P.honey]]); g.fill(LC.pathPts(pts)); g.restore(); };
    if (door > 0.001) {     // the open doorway: the porch and the drive, burnt out by the sun
      const op = [[DX0, DT, ZD], [DX1, DT, ZD], [DX1, 0, ZD], [DX0, 0, ZD]].map(p => cam.p(p));
      g.fillStyle = LC.lin(g, 0, op[0][1], 0, op[2][1], [[0, '#FFFBF2'], [0.55, '#FFF3DC'], [1, '#F2D3A0']]); g.fill(LC.pathPts(op));
      g.save(); g.clip(LC.pathPts(op)); g.globalAlpha = 0.18; seg2(g, cam, [DX0 + 0.1, 0, ZD + 1.4], [DX0 + 0.1, 2.1, ZD + 1.4], 3, '#9A6535'); seg2(g, cam, [DX0, 1.0, ZD + 1.4], [DX1, 1.0, ZD + 1.4], 3, '#9A6535'); g.restore();
    }
    const ang = door * 1.5, wd = DX1 - DX0;
    const L = (u, y) => [DX0 + Math.cos(ang) * wd * u, y, ZD - 0.02 - Math.sin(ang) * wd * u];
    Q([L(0, 0), L(1, 0), L(1, DT), L(0, DT)], '#1A1612');
    if (door > 0.02) { const e = [L(1, 0), L(1, DT), [L(1, DT)[0] + 0.045 * Math.sin(ang), DT, L(1, DT)[2] + 0.045 * Math.cos(ang)], [L(1, 0)[0] + 0.045 * Math.sin(ang), 0, L(1, 0)[2] + 0.045 * Math.cos(ang)]]; Q(e, '#E9B878'); }  // its edge, turned to the sun
    const pane = (u0, u1, y0, y1) => glow([L(u0, y1), L(u1, y1), L(u1, y0), L(u0, y0)].map(p => cam.p(p)), 1 - 0.2 * door);
    pane(0.125, 0.4625, 1.14, 1.9); pane(0.5375, 0.875, 1.14, 1.9);
    glow([[DX0, 2.45, ZD - 0.03], [DX1, 2.45, ZD - 0.03], [DX1, 2.11, ZD - 0.03], [DX0, 2.11, ZD - 0.03]].map(p => cam.p(p)));
    [-0.55, -0.35, -0.15].forEach(x => seg2(g, cam, [x, 2.11, ZD - 0.04], [x, 2.45, ZD - 0.04], Math.max(2, 0.03 * kAt(cam, x, 2.3, ZD)), '#2A1D13'));
    { const a = L(0.35, 0.93), b = L(0.65, 0.99); Q([[a[0], a[1], a[2]], [b[0], a[1], b[2]], [b[0], b[1], b[2]], [a[0], b[1], a[2]]], '#7A5A30'); }
    // light leaking round the shut leaf (hinge side and the latch side), and under it
    if (door < 0.02) { const k = kAt(cam, DX1, 1, ZD); seg2(g, cam, [DX1 - 0.005, 0.02, ZD - 0.03], [DX1 - 0.005, DT - 0.02, ZD - 0.03], Math.max(1.2, 0.008 * k), 'rgba(255,214,150,0.8)');
      seg2(g, cam, [DX0 + 0.02, 0.006, ZD - 0.03], [DX1 - 0.02, 0.006, ZD - 0.03], Math.max(1.2, 0.01 * k), 'rgba(255,220,160,0.9)'); }
    // the lever handle (latch side), rimmed by the glass above it
    { const h0 = L(0.9, 1.0), h1 = L(0.78, 1.0), k = kAt(cam, h0[0], 1.0, h0[2]); seg2(g, cam, h0, h1, Math.max(2, 0.022 * k), '#0A0806'); seg2(g, cam, [h0[0], 1.012, h0[2]], [h1[0], 1.012, h1[2]], Math.max(1, 0.006 * k), 'rgba(246,200,134,0.8)'); }
    return { handle: cam.p(L(0.86, 1.0)), leafEdge: cam.p(L(1, 1.0)) };
  }
  // the long mirror on the passage wall: its frame (o.reflection: draw what it holds, rendered mirrored)
  function mirrorQuad(cam) { return [[-0.849, HMIR.y1, HMIR.z0], [-0.849, HMIR.y1, HMIR.z1], [-0.849, HMIR.y0, HMIR.z1], [-0.849, HMIR.y0, HMIR.z0]].map(p => cam.p(p)); }
  function hallMirrorFrame(g, cam) {
    const fr = 0.035, Q = (pts, col) => LC.quad(g, cam, pts, col);
    Q([[-0.848, HMIR.y1 + fr, HMIR.z0 - fr], [-0.848, HMIR.y1 + fr, HMIR.z1 + fr], [-0.848, HMIR.y0 - fr, HMIR.z1 + fr], [-0.848, HMIR.y0 - fr, HMIR.z0 - fr]], '#0B0907');
    seg2(g, cam, [-0.846, HMIR.y1 + fr, HMIR.z1 + fr], [-0.846, HMIR.y0 - fr, HMIR.z1 + fr], 2, 'rgba(226,170,104,0.6)');      // its door-side edge catches the light
  }
  function hallMirrorGlass(g, cam, o) {
    const q = LC.pathPts(mirrorQuad(cam)), mc = mirrored(cam);
    g.save(); g.clip(q); g.fillStyle = '#0A0F10'; g.fill(q);
    hallRoom(g, mc, { mirror: true }); hallDoor(g, mc, { door: 0 }); hallStairs(g, mc); if (o.bag !== false) hallBag(g, mc);
    g.restore();
  }
  function mirrorTint(g, cam) {     // a mirror gives back a little less, and cooler; its dust and one long sheen
    const q = LC.pathPts(mirrorQuad(cam)); g.save(); g.clip(q); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(196,210,206)'; g.fillRect(-100, -100, W + 200, H + 200); g.restore();
    const b = mirrorQuad(cam), xs = b.map(p => p[0]), ys = b.map(p => p[1]), bx = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    LC.specks(g, q, bx, 'hallMirror', { n: 160, color: '#FFFFFF', rMin: 0.5, rMax: 1.3, aMin: 0.04, aMax: 0.2, scratch: 0.08 });
    LC.glare(g, q, { x: bx.x + bx.w * 0.4, y: bx.y + bx.h * 0.4, angle: -1.2, color: '#FFF3E0', bands: [{ d: -30, w: 70, a: 0.035 }, { d: 40, w: 12, a: 0.05 }] });
    g.save(); g.clip(q); g.strokeStyle = 'rgba(255,240,214,0.35)'; g.lineWidth = 1.5; g.stroke(q); g.restore();
  }
  // the bag in true perspective (the same satchel as C1's), its outside pocket open and empty, lit from the door behind it
  function hallBag(g, cam) {
    const b0 = cam.p(BAG.x, 0, BAG.z), k = kAt(cam, BAG.x, 0.2, BAG.z), bw = 0.50 * k, bh = 0.37 * k, X0 = b0[0] - bw / 2, Y1 = b0[1], mir = !!cam.mirror;
    g.save();
    g.fillStyle = 'rgba(6,4,3,0.75)'; g.beginPath(); g.ellipse(b0[0], Y1 + 0.006 * k, bw * 0.62, bh * 0.1, 0, 0, Math.PI * 2); g.fill();
    const body = LC.rquad([[X0 + bw * 0.04, Y1 - bh], [X0 + bw * 0.96, Y1 - bh], [X0 + bw, Y1], [X0, Y1]], 0.05 * k);
    g.fillStyle = LC.lin(g, X0, 0, X0 + bw, 0, mir ? [[0, '#2A190E'], [0.55, '#40281A'], [1, '#7A4C27']] : [[0, '#7A4C27'], [0.45, '#40281A'], [1, '#2A190E']]); g.fill(body);
    const flap = LC.rquad([[X0 + bw * 0.02, Y1 - bh - 2], [X0 + bw * 0.98, Y1 - bh - 2], [X0 + bw * 0.98, Y1 - bh * 0.6], [X0 + bw * 0.02, Y1 - bh * 0.6]], 0.05 * k);
    g.fillStyle = '#2A190E'; g.fill(flap); g.fillStyle = 'rgba(242,190,120,0.9)'; g.fillRect(X0 + bw * 0.05, Y1 - bh - 3, bw * 0.9, Math.max(2, 0.008 * k));
    g.fillStyle = 'rgba(242,190,120,0.5)'; g.fillRect(X0 + bw * 0.05, Y1 - bh * 0.6, bw * 0.9, Math.max(1.5, 0.004 * k));
    // a buckle strap on the flap, and the stitching along its edge
    g.fillStyle = '#1E120A'; g.fillRect(b0[0] - 0.018 * k, Y1 - bh * 0.92, 0.036 * k, bh * 0.36); g.fillStyle = 'rgba(214,170,110,0.75)'; g.fillRect(b0[0] - 0.02 * k, Y1 - bh * 0.62, 0.04 * k, 0.012 * k);
    const px = X0 + bw * 0.12, py = Y1 - bh * 0.5, pw = bw * 0.76, ph = bh * 0.44;
    g.fillStyle = LC.lin(g, px, 0, px + pw, 0, mir ? [[0, '#43291A'], [0.45, '#62401F'], [1, '#A06A38']] : [[0, '#A06A38'], [0.55, '#62401F'], [1, '#43291A']]); g.fill(LC.rrect(px, py, pw, ph, 0.025 * k));
    // the pocket's mouth, gaping: a dark slot under a lit lip, nothing in it
    g.fillStyle = '#040202'; g.beginPath(); g.moveTo(px + 3, py + 1); g.quadraticCurveTo(px + pw / 2, py + 0.085 * k, px + pw - 3, py + 1); g.closePath(); g.fill();
    g.strokeStyle = '#F6C886'; g.lineWidth = Math.max(2, 0.009 * k); g.beginPath(); g.moveTo(px + 3, py + 1); g.quadraticCurveTo(px + pw / 2, py + 0.085 * k, px + pw - 3, py + 1); g.stroke();
    g.strokeStyle = '#1E120A'; g.lineWidth = 0.032 * k; g.lineCap = 'round'; g.beginPath(); g.moveTo(b0[0] - bw * 0.14, Y1 - bh - 2); g.bezierCurveTo(b0[0] - bw * 0.12, Y1 - bh - 0.13 * k, b0[0] + bw * 0.12, Y1 - bh - 0.13 * k, b0[0] + bw * 0.14, Y1 - bh - 2); g.stroke();
    g.strokeStyle = 'rgba(242,190,120,0.7)'; g.lineWidth = Math.max(1.5, 0.006 * k); g.beginPath(); g.moveTo(b0[0] - bw * 0.1, Y1 - bh - 0.105 * k); g.bezierCurveTo(b0[0] - bw * 0.04, Y1 - bh - 0.125 * k, b0[0] + bw * 0.04, Y1 - bh - 0.125 * k, b0[0] + bw * 0.1, Y1 - bh - 0.105 * k); g.stroke();
    g.restore();
    return { pocket: [px + pw / 2, py + 0.02 * k], k };
  }
  // beams in the air from the door's glass (screen); dust turning in them (front)
  function hallBeams(g, cam, a) {
    const { ZD, DX0, DX1 } = HALL;
    const s0 = cam.p(DX0 + 0.1, 1.9, ZD), s1 = cam.p(DX1 - 0.1, 1.9, ZD), fl = cam.p(-0.85, 0, 6.0), fr = cam.p(0.1, 0, 6.0);
    LC.beam(g, [s0, s1, fr, fl], P.honey, 0.11 * a, 0.0, [0, s0[1]], [0, fl[1]]);
  }
  function hallDust(g, cam, t, n, seed) {
    const R = OTM.rng(seed); g.save(); g.globalCompositeOperation = 'screen';
    for (let i = 0; i < n; i++) {
      const z = 6.0 + R() * 3.0, x = -0.75 + R() * 0.8, y = 0.2 + R() * 1.8, sp = 0.1 + R() * 0.3, ph = R() * 50;
      const X = x + 0.06 * Math.sin(t * sp + ph), Y = y + 0.05 * Math.sin(t * sp * 0.7 + ph * 2) - 0.01 * t * R(), Z = z;
      const inB = clamp(1 - Math.abs(Y - (0.35 + (Z - 6.0) * 0.5)) / 0.7, 0, 1); if (inB < 0.05) continue;
      const p = cam.p(X, Y, Z), k = cam.f / p[2], a = inB * (0.3 + 0.5 * Math.pow(Math.sin(t * 0.8 * sp + ph), 2));
      g.fillStyle = rgba('#FFE4B4', a); g.beginPath(); g.arc(p[0], p[1], Math.max(0.7, 0.0035 * k), 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }
  const hallE = (c, cam, door) => {      // the door's glass in the emissive buffer
    const { ZD, DX0, DX1, DT } = HALL, E = c.em; E.save(); E.fillStyle = '#FFF0D0';
    const R = (x0, x1, y0, y1) => { const a = cam.p(x0, y1, ZD), b = cam.p(x1, y0, ZD); E.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); };
    R(DX0 + 0.1, DX0 + 0.37, 1.14, 1.9); R(DX1 - 0.37, DX1 - 0.1, 1.14, 1.9); R(DX0, DX1, 2.11, 2.45);
    if (door > 0.001) { E.globalAlpha = clamp(door * 3, 0, 1); R(DX0, DX1, 0, DT); }
    const LW = HALL.LW; E.globalAlpha = 0.6; R(LW.x0, LW.x1, LW.y0, LW.y1); E.restore();
  };

  // ---- view: the front door from the hall (Q02 0-6: the bag set down; Q04 48-56: the door opened with an elbow) ----
  const hallViewCam = LC.camera({ x: -0.44, y: 1.42, z: 2.6, yaw: -0.012, pitch: -0.07, f: 1500, cx: W / 2, cy: H / 2 });
  const hall = {
    cam: hallViewCam,
    back(c, t, s) {
      s = s || {}; const cam = hallViewCam, door = clamp(s.door || 0, 0, 1);
      drawBig(c, bigCache(c, 'kitchen:hallDoor', g => { g.fillStyle = '#0E1517'; g.fillRect(-M, -M, W + 2 * M, H + 2 * M); hallRoom(g, cam, {}); hallMirrorFrame(g, cam); hallMirrorGlass(g, cam, { bag: true }); mirrorTint(g, cam); hallStairs(g, cam); }));
      const g = c.g;
      const d = hallDoor(g, cam, { door });
      // the light the open door throws down the passage
      if (door > 0.001) { const { ZD, DX0, DX1 } = HALL; const a = cam.p(DX0, 0, ZD), b = cam.p(DX1, 0, ZD), cc = cam.p(0.25, 0, 4.6), dd = cam.p(-0.85, 0, 4.6);
        g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = clamp(door * 2.5, 0, 1); g.fillStyle = LC.lin(g, 0, a[1], 0, dd[1], [[0, '#F6D7A0', 0.75], [1, '#F6D7A0', 0.05]]); g.fill(LC.pathPts([a, b, cc, dd])); g.restore(); }
      if (s.bag !== false) hallBag(g, cam);
      hallBeams(g, cam, 1 + 1.5 * door);
      hallE(c, cam, door);
      this._live = d;
    },
    front(c, t, s) { hallDust(c.g, hallViewCam, t, 70, 'hallDust'); },
    anchors: (() => { const cam = hallViewCam, p = (x, y, z) => cam.p(x, y, z).slice(0, 2).map(Math.round);
      return { door: p(-0.35, 1.0, 9.2), doorGlass: p(-0.35, 1.52, 9.2), handle: p(-0.04, 1.0, 9.18), bagSpot: p(BAG.x, 0, BAG.z), bagTop: p(BAG.x, 0.4, BAG.z),
        floorAt: z => p(-0.3, 0, z), pxPerMAt: z => Math.round(kAt(cam, -0.3, 0, z)), standAt: p(-0.3, 0, 6.6), pxPerM: Math.round(kAt(cam, -0.3, 0, 6.6)), mirror: p(-0.85, 1.12, 5.75) }; })(),
    light: { x: 945, y: 330, color: '#F6D7A0', note: 'the front door glass, dead ahead: rim everything against it' },
  };
  hall.handleAt = door => { const d = clamp(door, 0, 1), ang = d * 1.5, wd = HALL.DX1 - HALL.DX0, u = 0.86; return hallViewCam.p(HALL.DX0 + Math.cos(ang) * wd * u, 1.0, HALL.ZD - 0.02 - Math.sin(ang) * wd * u).slice(0, 2).map(Math.round); };

  // ---- view: close on the bag, its outside pocket open and empty; the door blazing behind, out of focus ----
  const pocketCam = LC.camera({ x: -0.16, y: 0.34, z: 4.92, yaw: -0.2, pitch: 0.06, f: 1500, cx: W / 2 - 60, cy: H / 2 + 20 });
  const pocket = {
    cam: pocketCam,
    back(c, t, s) {
      const cam = pocketCam;
      drawBig(c, bigCache(c, 'kitchen:pocket', g => {
        const bgL = LC.layer(W + 2 * M, H + 2 * M); bgL.translate(M, M); bgL.fillStyle = '#0E1517'; bgL.fillRect(-M, -M, W + 2 * M, H + 2 * M);
        hallRoom(bgL, cam, {}); hallStairs(bgL, cam); hallDoor(bgL, cam, { door: 0 }); hallBeams(bgL, cam, 1.4);
        g.drawImage(LC.blurred(bgL.canvas, 9), -M, -M);
        // the near floor, sharp: the boards and the door's long patch running under the bag
        const { XL, ZD } = HALL; const fl = [[XL, 0, 5.6], [0.1, 0, 5.6], [0.1, 0, 7.0], [XL, 0, 7.0]];
        const near = LC.layer(W + 2 * M, H + 2 * M); near.translate(M, M); LC.quad(near, cam, fl, '#1B120C');
        near.save(); near.clip(LC.pathPts(cam.pts(fl))); for (let x = XL + 0.13; x < 0.1; x += 0.14) seg2(near, cam, [x, 0, 5.6], [x, 0, 7.0], 1.6, 'rgba(8,5,3,0.6)');
        const pl = (pts, col) => LC.quad(near, cam, pts, col); pl([[-0.74, 0, 5.9], [-0.40, 0, 5.9], [-0.31, 0, 8.3], [-0.64, 0, 8.3]], '#9A6838'); pl([[-0.69, 0, 6.2], [-0.45, 0, 6.2], [-0.36, 0, 8.0], [-0.60, 0, 8.0]], '#C99858'); near.restore();
        const nb = LC.blurred(near.canvas, 2.5, false);
        g.save(); g.globalAlpha = 1; g.drawImage(nb, -M, -M); g.restore();
        const b = hallBag(g, cam);
        // the passage wall beside the bag: its skirting, sharp, dark
        LC.quad(g, cam, [[XL + 0.001, 0, 5.6], [XL + 0.001, 0.13, 5.6], [XL + 0.001, 0.13, 7.2], [XL + 0.001, 0, 7.2]], '#0D1415');
      }));
      // the door's glass, blooming
      const E = c.em; E.save(); E.fillStyle = 'rgba(255,236,200,0.85)'; const { ZD, DX0, DX1 } = HALL;
      const R = (x0, x1, y0, y1) => { const a = cam.p(x0, y1, ZD), b = cam.p(x1, y0, ZD); E.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); }; R(DX0 + 0.1, DX0 + 0.37, 1.14, 1.9); R(DX1 - 0.37, DX1 - 0.1, 1.14, 1.9); R(DX0, DX1, 2.11, 2.45); E.restore();
    },
    front(c, t, s) { hallDust(c.g, pocketCam, t, 90, 'pocketDust'); },
    anchors: (() => { const cam = pocketCam, k = kAt(cam, BAG.x, 0.2, BAG.z), b0 = cam.p(BAG.x, 0, BAG.z), bw = 0.5 * k, bh = 0.37 * k, X0 = b0[0] - bw / 2;
      return { pocket: [Math.round(X0 + bw * 0.5), Math.round(b0[1] - bh * 0.5 + 0.02 * k)], bag: b0.slice(0, 2).map(Math.round), pxPerM: Math.round(k), handFrom: [Math.round(X0 + bw * 0.5), -40] }; })(),
    light: { x: 1500, y: 160, color: '#F6D7A0', note: 'the door glass, upper right, behind the bag' },
  };

  // ---- view: the long hall mirror; in it the bag by the door and the stairs (the phone's hesitation, Q02 6-9) ----
  const mirrorCam = LC.camera({ x: 0.55, y: 1.36, z: 3.7, yaw: -0.43, pitch: -0.2, f: 1750, cx: W / 2, cy: H / 2 });
  const mirror = {
    cam: mirrorCam,
    back(c, t, s) {
      s = s || {}; const cam = mirrorCam;
      drawBig(c, bigCache(c, `kitchen:hallMirror:${s.bag === false ? 0 : 1}`, g => {
        g.fillStyle = '#0E1517'; g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
        hallRoom(g, cam, {}); hallDoor(g, cam, { door: 0 }); hallStairs(g, cam); hallBeams(g, cam, 1); hallMirrorFrame(g, cam); hallMirrorGlass(g, cam, { bag: s.bag !== false });
        if (s.bag !== false) hallBag(g, cam);
      }));
      hallE(c, cam, 0);
    },
    // hall metres -> frame px, directly and as the mirror shows it (place a hand in 3D, draw it twice)
    at: (x, y, z) => mirrorCam.p(x, y, z).slice(0, 2), inMirrorAt: (x, y, z) => mirrored(mirrorCam).p(x, y, z).slice(0, 2),
    pxPerMAt: (x, y, z) => kAt(mirrorCam, x, y, z), pxPerMInMirrorAt: (x, y, z) => kAt(mirrored(mirrorCam), x, y, z),
    // draw the sequence's reflected figures (a hand, the phone) inside the glass: fn(g) in frame coordinates, clipped
    inGlass(c, s, fn) { const g = c.g; g.save(); g.clip(LC.pathPts(mirrorQuad(mirrorCam))); fn(g); g.restore(); },
    front(c, t, s) { mirrorTint(c.g, mirrorCam); },
    anchors: (() => { const cam = mirrorCam, mc = mirrored(cam), k = kAt(mc, BAG.x, 0.2, BAG.z), b0 = mc.p(BAG.x, 0, BAG.z), bh = 0.37 * k;
      const q = mirrorQuad(cam).map(p => p.slice(0, 2).map(Math.round));
      return { glass: q, pocketInMirror: [Math.round(b0[0]), Math.round(b0[1] - bh * 0.5)], bagInMirror: b0.slice(0, 2).map(Math.round), pxPerMInMirror: Math.round(k),
        handPathInMirror: [[Math.round(b0[0] + 40), Math.round(b0[1] - 0.95 * k)], [Math.round(b0[0]), Math.round(b0[1] - bh * 0.55)]] }; })(),
    light: { x: 1500, y: 300, color: '#F2CC92', note: 'the door is off to the right, down the passage; the reflection is lit from the far end' },
  };

  // =================================================================================================================
  window.SETS = window.SETS || {};
  SETS.kitchen = {
    views: { counter, hall, pocket, mirror },
    demos: [
      { name: 'counter: C1 (charging, Daniel climbing in the glass)', draw(c, t) { const s = { tod: 'morning', screen: 'charging', climber: 0.17 }; counter.back(c, t, s); counter.front(c, t, s); } },
      { name: 'counter wide: the cable plugged, the screen waking', draw(c, t) { const s = { frame: 'wide', screen: 'wake', wake: clamp(t / 2.4, 0, 1) }; counter.back(c, t, s); counter.front(c, t, s); } },
      { name: 'counter tight: asleep, the empty stairs and the bag', draw(c, t) { const s = { frame: 'tight', screen: 'asleep' }; counter.back(c, t, s); counter.front(c, t, s); } },
      { name: 'counter: Q04 end, the front door closing (no bag)', draw(c, t) { const s = { screen: 'charging', bag: false, door: clamp(0.7 - t * 0.2, 0, 1) }; counter.back(c, t, s); counter.front(c, t, s); } },
      { name: 'counter: afternoon, screen black, dust', draw(c, t) { const s = { tod: 'afternoon', screen: 'off', bag: false }; counter.back(c, t, s); counter.front(c, t, s); } },
      { name: 'counter: the flash (green pulse in the black glass)', draw(c, t) { const s = { screen: 'pulse', bag: true }; counter.back(c, t, s); counter.front(c, t, s); } },
      { name: 'counter wide: before, the cable loose', draw(c, t) { const s = { frame: 'wide', screen: 'off', cable: 'loose' }; counter.back(c, t, s); counter.front(c, t, s); } },
      { name: 'hall: the front door blazing, the bag by it', draw(c, t) { const s = {}; hall.back(c, t, s); hall.front(c, t, s); } },
      { name: 'hall: the door opening (elbow)', draw(c, t) { const s = { door: clamp((t - 0.4) / 1.6, 0, 1), bag: false }; hall.back(c, t, s); hall.front(c, t, s); } },
      { name: 'pocket: the bag, its outside pocket empty', draw(c, t) { pocket.back(c, t, {}); pocket.front(c, t, {}); } },
      { name: 'mirror: the hall mirror, the bag in it', draw(c, t) { mirror.back(c, t, {}); mirror.front(c, t, {}); } },
    ],
  };
})();
