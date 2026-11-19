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
  // (readBack: a canvas read back with getImageData every frame is made to stay on the CPU)
  function scratch(name, w, h, readBack) { let c = _scr[name]; if (!c || c.width !== w || c.height !== h) { c = _scr[name] = OTM.makeCanvas(w, h); if (readBack) c.getContext('2d', { willReadFrequently: true }); } const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, w, h); return g; }

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
  function mirrored(cam) { const p = (x, y, z) => { if (Array.isArray(x)) { z = x[2]; y = x[1]; x = x[0]; } return cam.p(-1.7 - x, y, z); }; return { p, pts: a => a.map(q => p(q)), f: cam.f, cx: cam.cx, cy: cam.cy, k: z => cam.f / z, mirror: true, pos: cam.pos }; }
  const mkCam = o => Object.assign(LC.camera(o), { pos: o });
  const kAt = (cam, x, y, z) => cam.f / Math.max(0.05, cam.p(x, y, z)[2]);
  // a polygon clipped to the camera's near plane before projecting (geometry may run behind the lens)
  function clipPts(cam, pts) {
    const NEAR = 0.06, d = pts.map(q => cam.p(q)[2]), out = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], da = d[i], db = d[(i + 1) % pts.length];
      if (da >= NEAR) out.push(a);
      if ((da >= NEAR) !== (db >= NEAR)) { const u = (NEAR - da) / (db - da); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]); } }
    return out.map(q => cam.p(q));
  }
  function Qc(g, cam, pts, col) { const q = clipPts(cam, pts); if (q.length < 3) return null; const p = LC.pathPts(q); g.fillStyle = col; g.fill(p); return p; }
  const seg2 = (g, cam, a, b, w, col) => { const p = cam.p(a), q = cam.p(b); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); };

  // the room: floor, walls, ceiling, the end wall, the landing window (o.mirror: skip the passage wall itself)
  function hallRoom(g, cam, o) {
    const { XL, XS, XR, ZD, CEIL, LW } = HALL, Q = (pts, col) => Qc(g, cam, pts, col);
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
    const flp = Q(fl, '#1B120C');
    if (flp) { g.save(); g.clip(flp); const zn = Math.max(Z0, (cam.pos ? cam.pos.z : 0) + 0.15);
      for (let x = XL + 0.13; x < XR; x += 0.14) seg2(g, cam, [x, 0, zn], [x, 0, ZD], 1.2, 'rgba(8,5,3,0.55)'); g.restore(); }
    // the passage wall: plaster in shade, warming toward the door in three flat steps; a skirting board with a lit top edge
    if (!o.mirror) {
      // flat bands at constant depth (vertical in the frame), warming toward the door
      const zs = [Z0, 5.0, 6.6, 7.9, ZD], cols = ['#162527', '#1D2F31', '#283433', '#3A3A33'];
      for (let i = 0; i < 4; i++) Q([[XL, 0, zs[i]], [XL, CEIL, zs[i]], [XL, CEIL, zs[i + 1] + 0.002], [XL, 0, zs[i + 1] + 0.002]], cols[i]);
      Q([[XL + 0.001, 0, Z0], [XL + 0.001, 0.13, Z0], [XL + 0.001, 0.13, ZD], [XL + 0.001, 0, ZD]], '#111A1B');
      seg2(g, cam, [XL + 0.002, 0.13, 4.0], [XL + 0.002, 0.13, ZD], 1.6, 'rgba(214,164,104,0.35)');
    }
    // the door's light on the boards: two long patches, as in C1
    const pl = LC.layer(); const PQ = (pts, col) => Qc(pl, cam, pts, col);
    PQ([[-0.74, 0, 5.9], [-0.40, 0, 5.9], [-0.31, 0, 8.3], [-0.64, 0, 8.3]], '#A87240'); PQ([[-0.30, 0, 5.9], [0.04, 0, 5.9], [0.04, 0, 8.3], [-0.22, 0, 8.3]], '#A87240');
    PQ([[-0.69, 0, 6.2], [-0.45, 0, 6.2], [-0.36, 0, 8.0], [-0.60, 0, 8.0]], '#D7A465'); PQ([[-0.25, 0, 6.2], [0.0, 0, 6.2], [0.0, 0, 8.0], [-0.24, 0, 8.0]], '#D7A465');
    g.drawImage(LC.blurred(pl.canvas, 4, false), 0, 0);
    // the doormat
    Q([[-0.68, 0.005, 8.55], [-0.02, 0.005, 8.55], [-0.02, 0.005, 9.12], [-0.68, 0.005, 9.12]], '#120D0A');
  }
  // the stairs: string, risers, treads (nosings catch the door's light), balusters, the handrail
  function hallStairs(g, cam) {
    const { XS, XR } = HALL, Q = (pts, col) => Qc(g, cam, pts, col);
    for (let k = 13; k >= 0; k--) {
      const z = 4.4 + 0.25 * k, y0 = 0.2 * k, y1 = 0.2 * (k + 1);
      Q([[XS, y1, z], [XR, y1, z], [XR, y1, z + 0.25], [XS, y1, z + 0.25]], y1 < 1.0 ? '#2A1C12' : '#1E150E');
      Q([[XS, y0, z], [XR, y0, z], [XR, y1, z], [XS, y1, z]], '#120C08');
      const kk = kAt(cam, XS + 0.4, y1, z); seg2(g, cam, [XS + 0.1, y1, z - 0.01], [XR, y1, z - 0.01], Math.max(1.5, 0.022 * kk), rgba('#D9A466', 0.35 + 0.035 * k));
    }
    Q([[XS, 0, 4.4], [XS, 0.3, 4.4], [XS, 3.1, 7.9], [XS, 2.8, 7.9]], '#0E0A07');
    Q([[XS, 0, 4.4], [XS, 0.3, 4.4], [XS, 0.3, 3.2], [XS, 0, 3.2]], '#0E0A07');
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
    const { ZD, DX0, DX1, DT } = HALL, Q = (pts, col) => Qc(g, cam, pts, col); const door = clamp(o.door || 0, 0, 1);
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
  // the bag in true perspective (the same satchel as C1's): a 0.50 x 0.37 x 0.16 m box, its details mapped onto the front face;
  // its outside pocket open and empty, lit from the door behind it
  function hallBag(g, cam) {
    const mir = !!cam.mirror, z0 = BAG.z - 0.08, z1 = BAG.z + 0.08, x0 = BAG.x - 0.25, x1 = BAG.x + 0.25, top = 0.37;
    const F = (u, v) => { const y = top * (1 - v) + 0.004, x = x0 + (x1 - x0) * u, zz = z0 + 0.012 * Math.sin(Math.PI * u) * (v > 0.45 ? 1 : 0.3); return cam.p(x - 0.01 * (u - 0.5) * (1 - v), y, zz); };   // a little belly
    const k = kAt(cam, BAG.x, 0.2, z0), lw = w => Math.max(1, w * k);
    const quadUV = (u0, v0, u1, v1, r) => LC.rquad([F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)], r * k);
    g.save();
    // contact shadow
    { const c0 = cam.p(BAG.x, 0, BAG.z); g.fillStyle = 'rgba(6,4,3,0.75)'; g.beginPath(); g.ellipse(c0[0], c0[1] + 0.004 * k, 0.33 * k, 0.05 * k, 0, 0, Math.PI * 2); g.fill(); }
    // the flank the lens can see, in shade, its top edge catching the door's light
    { const camX = cam.pos ? cam.pos.x : BAG.x, cx = mir ? -1.7 - camX : camX, xs = cx > BAG.x ? x1 - 0.004 : x0 + 0.004;
      const fp = clipPts(cam, [[xs, 0, z0], [xs, top, z0], [xs, top - 0.01, z1], [xs, 0, z1]]);
      if (fp.length > 2) { g.fillStyle = '#1A110A'; g.fill(LC.pathPts(fp)); g.strokeStyle = 'rgba(232,176,108,0.6)'; g.lineWidth = lw(0.004); g.beginPath(); g.moveTo(fp[1][0], fp[1][1]); g.lineTo(fp[2][0], fp[2][1]); g.stroke(); } }
    // the top: barely seen unless the lens is above it
    { const tp = clipPts(cam, [[x0, top, z0], [x1, top, z0], [x1, top - 0.01, z1], [x0, top - 0.01, z1]]); if (tp.length > 2) { g.fillStyle = '#3A2414'; g.fill(LC.pathPts(tp)); } }
    const front = quadUV(0, 0, 1, 1, 0.03);
    const L = mir ? [[0, '#2A190E'], [0.55, '#40281A'], [1, '#7A4C27']] : [[0, '#7A4C27'], [0.45, '#40281A'], [1, '#2A190E']];
    const fa = F(0, 0.5), fb = F(1, 0.5); g.fillStyle = LC.lin(g, fa[0], 0, fb[0], 0, L); g.fill(front);
    // the flap over the top third, its edge catching the light; a strap and buckle
    g.fillStyle = '#2A190E'; g.fill(quadUV(0.015, -0.01, 0.985, 0.4, 0.03));
    { const p0 = F(0.04, -0.005), p1 = F(0.96, -0.005); g.strokeStyle = 'rgba(242,190,120,0.9)'; g.lineWidth = lw(0.008); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
      const q0 = F(0.04, 0.4), q1 = F(0.96, 0.4); g.strokeStyle = 'rgba(242,190,120,0.45)'; g.lineWidth = lw(0.004); g.beginPath(); g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); g.stroke(); }
    g.fillStyle = '#1E120A'; g.fill(quadUV(0.465, 0.08, 0.535, 0.44, 0.004)); g.fillStyle = 'rgba(214,170,110,0.75)'; g.fill(quadUV(0.455, 0.405, 0.545, 0.44, 0.003));
    // the outside slip pocket: a flat panel, its mouth gaping (a dark slot under a lit lip), nothing in it
    const pk = quadUV(0.12, 0.5, 0.88, 0.94, 0.025); const pa = F(0.12, 0.7), pb = F(0.88, 0.7);
    g.fillStyle = LC.lin(g, pa[0], 0, pb[0], 0, mir ? [[0, '#43291A'], [0.45, '#62401F'], [1, '#A06A38']] : [[0, '#A06A38'], [0.55, '#62401F'], [1, '#43291A']]); g.fill(pk);
    { const m0 = F(0.13, 0.5), m1 = F(0.87, 0.5), mc = F(0.5, 0.64); const mouth = new Path2D(); mouth.moveTo(m0[0], m0[1]); mouth.quadraticCurveTo(mc[0], mc[1], m1[0], m1[1]); mouth.closePath();
      g.fillStyle = '#040202'; g.fill(mouth); g.strokeStyle = '#F6C886'; g.lineWidth = lw(0.008); g.beginPath(); g.moveTo(m0[0], m0[1]); g.quadraticCurveTo(mc[0], mc[1], m1[0], m1[1]); g.stroke(); }
    // stitching round the pocket
    { g.setLineDash([lw(0.006), lw(0.006)]); g.strokeStyle = 'rgba(232,184,124,0.35)'; g.lineWidth = lw(0.002); const s0 = F(0.14, 0.92), s1 = F(0.86, 0.92); g.beginPath(); g.moveTo(s0[0], s0[1]); g.lineTo(s1[0], s1[1]); g.stroke(); g.setLineDash([]); }
    // the carry handle on top
    { const h0 = cam.p(BAG.x - 0.07, top, BAG.z - 0.01), h1 = cam.p(BAG.x + 0.07, top, BAG.z - 0.01), hc = cam.p(BAG.x, top + 0.13, BAG.z - 0.01);
      g.strokeStyle = '#1E120A'; g.lineWidth = lw(0.03); g.lineCap = 'round'; g.beginPath(); g.moveTo(h0[0], h0[1]); g.quadraticCurveTo(hc[0], hc[1], h1[0], h1[1]); g.stroke();
      g.strokeStyle = 'rgba(242,190,120,0.75)'; g.lineWidth = lw(0.006); g.beginPath(); const d = 0.014 * k; g.moveTo(h0[0] + (hc[0] - h0[0]) * 0.3, h0[1] - d); g.quadraticCurveTo(hc[0], hc[1] - d, h1[0] - (h1[0] - hc[0]) * 0.3, h1[1] - d); g.stroke(); }
    g.restore();
    const pc = F(0.5, 0.55); return { pocket: pc, k };
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
  const hallViewCam = mkCam({ x: -0.44, y: 1.42, z: 2.6, yaw: -0.012, pitch: -0.07, f: 1500, cx: W / 2, cy: H / 2 });
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
    },
    front(c, t, s) { hallDust(c.g, hallViewCam, t, 70, 'hallDust'); },
    anchors: (() => { const cam = hallViewCam, p = (x, y, z) => cam.p(x, y, z).slice(0, 2).map(Math.round);
      return { door: p(-0.35, 1.0, 9.2), doorGlass: p(-0.35, 1.52, 9.2), handle: p(-0.04, 1.0, 9.18), bagSpot: p(BAG.x, 0, BAG.z), bagTop: p(BAG.x, 0.4, BAG.z),
        floorAt: z => p(-0.3, 0, z), pxPerMAt: z => Math.round(kAt(cam, -0.3, 0, z)), standAt: p(-0.3, 0, 6.6), pxPerM: Math.round(kAt(cam, -0.3, 0, 6.6)), mirror: p(-0.85, 1.12, 5.75) }; })(),
    light: { x: 945, y: 330, color: '#F6D7A0', note: 'the front door glass, dead ahead: rim everything against it' },
  };
  hall.handleAt = door => { const d = clamp(door, 0, 1), ang = d * 1.5, wd = HALL.DX1 - HALL.DX0, u = 0.86; return hallViewCam.p(HALL.DX0 + Math.cos(ang) * wd * u, 1.0, HALL.ZD - 0.02 - Math.sin(ang) * wd * u).slice(0, 2).map(Math.round); };

  // ---- view: close on the bag, its outside pocket open and empty; the door blazing behind, out of focus ----
  const pocketCam = mkCam({ x: -0.15, y: 0.36, z: 4.95, yaw: -0.2, pitch: 0.07, f: 1450, cx: W / 2 - 60, cy: H / 2 + 30 });
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
        // the passage wall beside the bag: its skirting, dark, a lit top edge; then the bag in front of it
        Qc(g, cam, [[XL + 0.001, 0, 5.2], [XL + 0.001, 0.13, 5.2], [XL + 0.001, 0.13, 7.4], [XL + 0.001, 0, 7.4]], '#0F1718');
        seg2(g, cam, [XL + 0.002, 0.13, 5.4], [XL + 0.002, 0.13, 7.4], 1.5, 'rgba(214,164,104,0.3)');
        hallBag(g, cam);
      }));
      // the door's glass, blooming
      const E = c.em; E.save(); E.fillStyle = 'rgba(255,236,200,0.85)'; const { ZD, DX0, DX1 } = HALL;
      const R = (x0, x1, y0, y1) => { const a = cam.p(x0, y1, ZD), b = cam.p(x1, y0, ZD); E.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); }; R(DX0 + 0.1, DX0 + 0.37, 1.14, 1.9); R(DX1 - 0.37, DX1 - 0.1, 1.14, 1.9); R(DX0, DX1, 2.11, 2.45); E.restore();
    },
    front(c, t, s) { hallDust(c.g, pocketCam, t, 90, 'pocketDust'); },
    anchors: (() => { const cam = pocketCam, k = kAt(cam, BAG.x, 0.2, BAG.z - 0.08), pm = cam.p(BAG.x, 0.2, BAG.z - 0.09), hv = cam.p(BAG.x, 0.36, BAG.z - 0.12), b0 = cam.p(BAG.x, 0, BAG.z - 0.08);
      return { pocket: pm.slice(0, 2).map(Math.round), hover: hv.slice(0, 2).map(Math.round), bag: b0.slice(0, 2).map(Math.round), pxPerM: Math.round(k), handFrom: [Math.round(pm[0] + 0.1 * k), -60] }; })(),
    light: { x: 1500, y: 160, color: '#F6D7A0', note: 'the door glass, upper right, behind the bag' },
  };

  // =================================================================================================================
  // THE TABLE, through the kitchen-diner's garden window, from the garden (Q04: the warmest image in the film)
  // Kitchen space: x to the right as seen from the garden, y up (the kitchen floor is 0; the garden lies 0.15 lower),
  // z into the house (the glass is z = 0). The garden is in the house's morning shadow; the sun, higher now, comes in by a
  // side window on the left and lies warm across the table and Emily. The glass gives back the garden: C1's own trees, fence
  // and the swing, mirrored, over everything inside.
  // =================================================================================================================
  const WIN = { x0: -1.25, x1: 1.25, y0: 0.72, y1: 2.1, mull: [-0.42, 0.42], tran: 1.86 };
  const TBL = { x0: -0.95, x1: 0.75, z0: 0.85, z1: 1.75, y: 0.74 };
  const TABLE_CAMS = { wide: mkCam({ x: 0.0, y: 1.36, z: -2.65, yaw: 0, pitch: 0.012, f: 1580, cx: W / 2, cy: H / 2 }),
    close: mkCam({ x: 0.0, y: 1.22, z: -1.05, yaw: 0.0, pitch: 0.05, f: 1650, cx: W / 2, cy: H / 2 }) };
  const tableCam = TABLE_CAMS.wide;
  function brick(g, cam, x0, x1, y0, y1, z, seed) {
    const R = OTM.rng(seed); const ch = 0.075, cw = 0.225;
    Qc(g, cam, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], '#53413A');
    for (let y = y0, row = 0; y < y1; y += ch, row++) for (let x = x0 - (row % 2) * cw / 2; x < x1; x += cw) {
      const v = R(); if (v < 0.55) continue; const col = v < 0.8 ? '#4A3933' : v < 0.93 ? '#5E4A41' : '#3F302B';
      Qc(g, cam, [[Math.max(x0, x + 0.006), y + 0.006, z], [Math.min(x1, x + cw - 0.006), y + 0.006, z], [Math.min(x1, x + cw - 0.006), Math.min(y1, y + ch - 0.004), z], [Math.max(x0, x + 0.006), Math.min(y1, y + ch - 0.004), z]], col); }
    g.save(); g.strokeStyle = 'rgba(122,110,100,0.28)'; g.lineWidth = 1; for (let y = y0; y < y1; y += ch) seg2(g, cam, [x0, y, z - 0.001], [x1, y, z - 0.001], 1, 'rgba(120,108,98,0.3)'); g.restore();
  }
  // the interior, lit: back wall, dresser, the hall doorway, the clock at 7:58, the table and chairs, the breakfast things
  function tableInterior(g, cam, s) {
    const Q = (pts, col) => Qc(g, cam, pts, col), ZB = 3.7, XL = -2.2, XR = 2.3, CE = 2.5;
    Q([[XL, 0, ZB], [XR, 0, ZB], [XR, CE, ZB], [XL, CE, ZB]], '#2C3A3C');
    Q([[XL, CE, 0], [XR, CE, 0], [XR, CE, ZB], [XL, CE, ZB]], '#182224');
    Q([[XL, 0, 0], [XL, CE, 0], [XL, CE, ZB], [XL, 0, ZB]], '#24302F');
    Q([[XR, 0, 0], [XR, CE, 0], [XR, CE, ZB], [XR, 0, ZB]], '#1E2829');
    Q([[XL, 0, 0], [XR, 0, 0], [XR, 0, ZB], [XL, 0, ZB]], '#201D1A');
    // the sun from the side window (left): the window's own shape laid warm on the back wall, its cross-bar's shadow in it
    { const sh = (x, y) => [x + 0.34 * (y - 0.9), y];       // the slant: sunlight comes down from the left
      const pl = LC.layer(W + 2 * M, H + 2 * M); pl.translate(M, M);
      const patch = (x0, x1, y0, y1, col) => { const a = sh(x0, y0), b = sh(x1, y0), c2 = sh(x1, y1), d = sh(x0, y1); Qc(pl, cam, [[a[0], a[1], ZB - 0.003], [b[0], b[1], ZB - 0.003], [c2[0], c2[1], ZB - 0.003], [d[0], d[1], ZB - 0.003]], col); };
      patch(-1.32, -0.3, 0.9, 2.0, '#7E6650'); patch(-1.26, -0.84, 0.95, 1.41, '#D8AA70'); patch(-0.78, -0.36, 0.95, 1.41, '#D8AA70'); patch(-1.26, -0.84, 1.47, 1.94, '#D8AA70'); patch(-0.78, -0.36, 1.47, 1.94, '#D8AA70');
      g.drawImage(LC.blurred(pl.canvas, 3.5, false), -M, -M);
      // the shaft itself, faint in the air, from the side window (out of frame, left) to its patch
      const w0 = cam.p(-2.2, 2.15, 2.0), w1 = cam.p(-2.2, 1.0, 2.6), p0 = cam.p(sh(-0.3, 2.0)[0], 2.0, ZB), p1 = cam.p(sh(-1.32, 0.9)[0], 0.9, ZB);
      LC.beam(g, [w0, p0, p1, w1], '#F2C88E', 0.0, 0.1, [w0[0], 0], [p0[0], 0]); }
    // and across the floor, and the left half of the table (below), warm
    Q([[-1.9, 0.002, 1.0], [-0.4, 0.002, 1.0], [0.5, 0.002, 3.4], [-1.0, 0.002, 3.4]], '#4E3E30');
    // the doorway to the hall (right): the front door's morning down the passage, warm
    Q([[1.15, 0, ZB - 0.002], [1.95, 0, ZB - 0.002], [1.95, 2.05, ZB - 0.002], [1.15, 2.05, ZB - 0.002]], '#2E2620');
    Q([[1.3, 0, ZB + 1.6], [1.8, 0, ZB + 1.6], [1.8, 2.0, ZB + 1.6], [1.3, 2.0, ZB + 1.6]], '#D9A868');
    Q([[1.15, 0, ZB - 0.002], [1.95, 0, ZB - 0.002], [1.95, 0.004, ZB - 0.5], [1.15, 0.004, ZB - 0.5]], '#6B5440');
    Q([[1.08, 0, ZB - 0.005], [1.15, 0, ZB - 0.005], [1.15, 2.12, ZB - 0.005], [1.08, 2.12, ZB - 0.005]], '#6C7874'); Q([[1.95, 0, ZB - 0.005], [2.02, 0, ZB - 0.005], [2.02, 2.12, ZB - 0.005], [1.95, 2.12, ZB - 0.005]], '#6C7874');
    Q([[1.08, 2.05, ZB - 0.005], [2.02, 2.05, ZB - 0.005], [2.02, 2.12, ZB - 0.005], [1.08, 2.12, ZB - 0.005]], '#6C7874');
    // a dresser on the left: open shelves, plates on edge, a jar or two
    Q([[-2.05, 0, ZB - 0.45], [-1.15, 0, ZB - 0.45], [-1.15, 0.9, ZB - 0.45], [-2.05, 0.9, ZB - 0.45]], '#3E3A33');
    Q([[-2.05, 0.9, ZB - 0.45], [-1.15, 0.9, ZB - 0.45], [-1.15, 0.92, ZB - 0.02], [-2.05, 0.92, ZB - 0.02]], '#8C7A62');
    Q([[-2.05, 0.92, ZB - 0.25], [-1.15, 0.92, ZB - 0.25], [-1.15, 2.0, ZB - 0.25], [-2.05, 2.0, ZB - 0.25]], '#2F3B3B');
    [1.3, 1.68].forEach(y => { Q([[-2.05, y, ZB - 0.25], [-1.15, y, ZB - 0.25], [-1.15, y + 0.025, ZB - 0.25], [-2.05, y + 0.025, ZB - 0.25]], '#7E6C55');
      for (let i = 0; i < 4; i++) { const x = -1.96 + i * 0.2; const c0 = cam.p(x + 0.06, y + 0.13, ZB - 0.27), k = kAt(cam, x, y, ZB - 0.27); g.fillStyle = i % 2 ? '#46524F' : '#505C58'; g.beginPath(); g.ellipse(c0[0], c0[1], 0.065 * k, 0.11 * k, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(30,38,36,0.4)'; g.beginPath(); g.ellipse(c0[0] + 0.01 * k, c0[1], 0.04 * k, 0.075 * k, 0, 0, Math.PI * 2); g.fill(); } });
    // the clock above the table (7:58), small; its own view is SETS.kitchen.views.clock
    clockFace(g, cam.p(0.05, 1.98, ZB - 0.02), 0.15 * kAt(cam, 0.05, 1.98, ZB), 7 + 58 / 60, 0, { tiny: true });
    // a pendant over the table (off)
    { const c0 = cam.p(-0.1, 1.95, 1.3), k = kAt(cam, -0.1, 1.95, 1.3); seg2(g, cam, [-0.1, CE, 1.3], [-0.1, 1.95, 1.3], 1.4, '#22282A');
      g.fillStyle = '#2A3233'; g.beginPath(); g.moveTo(c0[0] - 0.17 * k, c0[1] + 0.13 * k); g.quadraticCurveTo(c0[0], c0[1] - 0.12 * k, c0[0] + 0.17 * k, c0[1] + 0.13 * k); g.closePath(); g.fill();
      g.fillStyle = 'rgba(232,206,160,0.5)'; g.fillRect(c0[0] - 0.12 * k, c0[1] + 0.02 * k, 0.07 * k, 0.012 * k); }
    // chairs behind the table: Emily's (a booster cushion on it) and the empty one at the right end, pulled out
    chair(g, cam, -0.3, 2.12, 0, '#5A402A', true); chair(g, cam, 0.62, 2.05, -0.35, '#4E3826', false);
  }
  // the table and the breakfast things: in front of Emily and Daniel (front layer, under the glass)
  function tableTop(g, cam, s) {
    const Q = (pts, col) => Qc(g, cam, pts, col);
    // the table: oak, the sun lying warm across its left half; the near edge in its own shade
    Q([[TBL.x0, TBL.y, TBL.z0], [TBL.x1, TBL.y, TBL.z0], [TBL.x1, TBL.y, TBL.z1], [TBL.x0, TBL.y, TBL.z1]], '#5A422C');
    Q([[TBL.x0, TBL.y + 0.001, 1.22], [0.12, TBL.y + 0.001, 1.22], [0.4, TBL.y + 0.001, TBL.z1], [TBL.x0, TBL.y + 0.001, TBL.z1]], '#B98A56');
    Q([[TBL.x0 + 0.1, TBL.y + 0.002, 1.27], [-0.05, TBL.y + 0.002, 1.27], [0.18, TBL.y + 0.002, TBL.z1 - 0.06], [TBL.x0 + 0.1, TBL.y + 0.002, TBL.z1 - 0.06]], '#E2B47A');
    Q([[TBL.x0, TBL.y - 0.035, TBL.z0], [TBL.x1, TBL.y - 0.035, TBL.z0], [TBL.x1, TBL.y, TBL.z0], [TBL.x0, TBL.y, TBL.z0]], '#3A2A1C');
    [[TBL.x0 + 0.06, TBL.z0 + 0.06], [TBL.x1 - 0.06, TBL.z0 + 0.06]].forEach(([x, z]) => Q([[x - 0.03, 0, z], [x + 0.03, 0, z], [x + 0.03, TBL.y - 0.035, z], [x - 0.03, TBL.y - 0.035, z]], '#3A2A1C'));
    // the breakfast things: Emily's plate (the toast), a bowl, her glass of milk, the travel mug, the cereal box
    tableThings(g, cam, s);
  }
  function chair(g, cam, x, z, yaw, col, booster) {
    const Q = (pts, c) => Qc(g, cam, pts, c), cs = Math.cos(yaw), sn = Math.sin(yaw);
    const P3 = (dx, y, dz) => [x + dx * cs + dz * sn, y, z - dx * sn + dz * cs];
    // the back (facing us), its two uprights and the top rail, spindles
    [-0.2, 0.2].forEach(dx => Q([P3(dx - 0.02, 0, 0.18), P3(dx + 0.02, 0, 0.18), P3(dx + 0.02, 1.0, 0.2), P3(dx - 0.02, 1.0, 0.2)], col));
    Q([P3(-0.21, 0.86, 0.19), P3(0.21, 0.86, 0.19), P3(0.21, 1.0, 0.2), P3(-0.21, 1.0, 0.2)], col);
    for (let i = -2; i <= 2; i++) Q([P3(i * 0.065 - 0.008, 0.47, 0.185), P3(i * 0.065 + 0.008, 0.47, 0.185), P3(i * 0.065 + 0.008, 0.86, 0.19), P3(i * 0.065 - 0.008, 0.86, 0.19)], col);
    Q([P3(-0.21, 0.45, -0.2), P3(0.21, 0.45, -0.2), P3(0.21, 0.47, 0.2), P3(-0.21, 0.47, 0.2)], '#6E5038');
    if (booster) Q([P3(-0.17, 0.47, -0.15), P3(0.17, 0.47, -0.15), P3(0.17, 0.6, 0.12), P3(-0.17, 0.6, 0.12)], '#47585A');
  }
  function tableThings(g, cam, s) {
    const disc = (x, z, rx, col, ry) => { const c0 = cam.p(x, TBL.y + 0.003, z), k = kAt(cam, x, TBL.y, z); g.fillStyle = col; g.beginPath(); g.ellipse(c0[0], c0[1], rx * k, (ry || rx) * k * 0.2, 0, 0, Math.PI * 2); g.fill(); return [c0, k]; };
    // Emily's plate and the toast
    { const [c0, k] = disc(-0.3, 1.32, 0.13, '#DCDCD2'); disc(-0.3, 1.32, 0.095, '#C8C9BF');
      g.fillStyle = '#B07A42'; g.beginPath(); g.ellipse(c0[0] - 0.01 * k, c0[1] - 0.004 * k, 0.07 * k, 0.016 * k, -0.05, 0, Math.PI * 2); g.fill();
      if (!s.crustCut) { g.strokeStyle = '#6E4424'; g.lineWidth = Math.max(1.5, 0.012 * k); g.beginPath(); g.ellipse(c0[0] - 0.01 * k, c0[1] - 0.004 * k, 0.07 * k, 0.016 * k, -0.05, Math.PI, Math.PI * 2); g.stroke(); } }
    // the bowl (cereal), right of the plate
    { const c0 = cam.p(0.1, TBL.y, 1.4), k = kAt(cam, 0.1, TBL.y, 1.4); g.fillStyle = '#A9B6B6'; g.beginPath(); g.moveTo(c0[0] - 0.08 * k, c0[1] - 0.06 * k); g.quadraticCurveTo(c0[0], c0[1] + 0.02 * k, c0[0] + 0.08 * k, c0[1] - 0.06 * k); g.closePath(); g.fill();
      g.fillStyle = '#D8C49A'; g.beginPath(); g.ellipse(c0[0], c0[1] - 0.06 * k, 0.08 * k, 0.016 * k, 0, 0, Math.PI * 2); g.fill(); }
    // her glass of milk
    { const c0 = cam.p(-0.52, TBL.y, 1.2), k = kAt(cam, -0.52, TBL.y, 1.2); g.fillStyle = '#E8E6DC'; g.fillRect(c0[0] - 0.03 * k, c0[1] - 0.09 * k, 0.06 * k, 0.09 * k); g.fillStyle = 'rgba(220,232,230,0.35)'; g.fillRect(c0[0] - 0.032 * k, c0[1] - 0.12 * k, 0.064 * k, 0.03 * k); }
    // the travel mug (steel) and the cereal box (if still out)
    if (s.mug !== false) { const c0 = cam.p(0.42, TBL.y, 1.3), k = kAt(cam, 0.42, TBL.y, 1.3); g.fillStyle = LC.lin(g, c0[0] - 0.04 * k, 0, c0[0] + 0.04 * k, 0, [[0, '#4C5656'], [0.35, '#D8DEDA'], [0.6, '#7A8684'], [1, '#2E3434']]); g.fillRect(c0[0] - 0.04 * k, c0[1] - 0.19 * k, 0.08 * k, 0.19 * k); g.fillStyle = '#121515'; g.fillRect(c0[0] - 0.042 * k, c0[1] - 0.21 * k, 0.084 * k, 0.035 * k); }
    if (s.cereal !== false) { const Q = (pts, c) => Qc(g, cam, pts, c); Q([[0.22, TBL.y, 1.62], [0.42, TBL.y, 1.62], [0.42, TBL.y + 0.3, 1.62], [0.22, TBL.y + 0.3, 1.62]], '#8E5A3A'); Q([[0.25, TBL.y + 0.12, 1.619], [0.39, TBL.y + 0.12, 1.619], [0.39, TBL.y + 0.24, 1.619], [0.25, TBL.y + 0.24, 1.619]], '#C9A65E'); }
  }
  // the garden in the glass: C1's garden, flipped (we face the other way now), set to the reflection's geometry
  function gardenReflection(tod) {
    const L = LC.layer(W + 2 * M, H + 2 * M); L.translate(M, M);
    L.fillStyle = LC.lin(L, 0, -M, 0, 520, [[0, '#C4D6DA'], [1, '#E4ECE8']]); L.fillRect(-M, -M, W + 2 * M, H + 2 * M);
    const gd = gardenLayer('morning'), k = 0.82;
    L.save(); L.translate(W / 2, 0); L.scale(-k, k); L.translate(-W / 2 - 260, 210); L.drawImage(gd, EXT.x0, EXT.y0); L.restore();
    // the garden in the glass sits in the house's shadow: press its darks down, keep the sky; below the fence, the lawn goes to near black
    L.save(); L.globalCompositeOperation = 'multiply'; L.fillStyle = LC.lin(L, 0, 250, 0, 560, [[0, '#FFFFFF'], [1, '#6A7470']]); L.fillRect(-M, 250, W + 2 * M, 900); L.restore();
    L.fillStyle = LC.lin(L, 0, 640, 0, 860, [[0, '#121A17', 0], [0.5, '#121A17', 0.7], [1, '#0C1210', 0.95]]); L.fillRect(-M, 640, W + 2 * M, 500);
    return L.canvas;
  }
  const table = {
    cams: TABLE_CAMS,
    back(c, t, s) {
      s = s || {}; const fr = TABLE_CAMS[s.frame] ? s.frame : 'wide', cam = TABLE_CAMS[fr];
      drawBig(c, bigCache(c, `kitchen:table:${fr}`, g => { g.fillStyle = '#2A3434'; g.fillRect(-M, -M, W + 2 * M, H + 2 * M); tableInterior(g, cam, s); }));
      const E = c.em; E.save(); E.fillStyle = 'rgba(232,180,110,0.6)'; const a = cam.p(1.3, 2.0, 5.3), b = cam.p(1.8, 0, 5.3); E.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); E.restore();
    },
    front(c, t, s) {
      s = s || {}; const fr = TABLE_CAMS[s.frame] ? s.frame : 'wide', cam = TABLE_CAMS[fr], g = c.g;
      const glassPts = [[WIN.x0, WIN.y1, 0], [WIN.x1, WIN.y1, 0], [WIN.x1, WIN.y0, 0], [WIN.x0, WIN.y0, 0]];
      const glass = LC.pathPts(glassPts.map(p => cam.p(p)));
      // the table and the breakfast things, between the lens and the people at it
      drawBig(c, bigCache(c, `kitchen:tableTop:${fr}:${s.crustCut ? 1 : 0}${s.mug === false ? 0 : 1}${s.cereal === false ? 0 : 1}`, gg => tableTop(gg, cam, s)));
      // the glass gives back the garden (screen: it shows most where the room behind is dark), a breath of sky at the top
      const refl = bigCache(c, 'kitchen:tableRefl', gg => gg.drawImage(gardenReflection('morning'), -M, -M));
      g.save(); g.clip(glass); g.globalCompositeOperation = 'screen'; g.globalAlpha = s.reflect == null ? (fr === 'close' ? 0.28 : 0.36) : s.reflect; g.drawImage(refl, -M, -M); g.restore();
      // the static front: glare, dust, the window's frame and the brick around it
      drawBig(c, bigCache(c, 'kitchen:tableFront:' + fr, gg => {
        LC.glare(gg, glass, { x: 700, y: 400, angle: -1.02, color: '#F4F6F0', bands: [{ d: -330, w: 150, a: 0.05 }, { d: -240, w: 22, a: 0.08 }, { d: 260, w: 240, a: 0.035 }, { d: 380, w: 30, a: 0.05 }] });
        LC.specks(gg, glass, { x: 0, y: 0, w: W, h: H }, 'tableDust', { n: 260, color: '#FFFFFF', rMin: 0.5, rMax: 1.3, aMin: 0.05, aMax: 0.22, scratch: 0.12 });
        { const sm = cam.p(0.25, 1.05, 0); LC.smudge(gg, sm[0], sm[1], 0.12 * kAt(cam, 0, 1, 0), 0.075 * kAt(cam, 0, 1, 0), 0.3, 'tableSmudge', '#FFFFFF', 0.05); }   // small fingers, at her height, from the inside
        const Q = (pts, col) => Qc(gg, cam, pts, col);
        // brick round the opening (in the house's shadow), the reveal's returns, a stone sill catching the sky
        const B = (x0, x1, y0, y1) => brick(gg, cam, x0, x1, y0, y1, -0.002, 'brick' + x0 + y0);
        B(-3.6, WIN.x0 - 0.0, -0.15, 3.2); B(WIN.x1, 3.6, -0.15, 3.2); B(WIN.x0, WIN.x1, WIN.y1, 3.2); B(WIN.x0, WIN.x1, -0.15, WIN.y0 - 0.06);
        Q([[WIN.x0, WIN.y0, 0], [WIN.x0, WIN.y1, 0], [WIN.x0, WIN.y1, -0.11], [WIN.x0, WIN.y0, -0.11]], '#46362F'); Q([[WIN.x1, WIN.y0, 0], [WIN.x1, WIN.y1, 0], [WIN.x1, WIN.y1, -0.11], [WIN.x1, WIN.y0, -0.11]], '#3A2D27');
        Q([[WIN.x0, WIN.y1, 0], [WIN.x1, WIN.y1, 0], [WIN.x1, WIN.y1, -0.11], [WIN.x0, WIN.y1, -0.11]], '#2E2420');
        Q([[WIN.x0 - 0.05, WIN.y0 - 0.05, -0.1], [WIN.x1 + 0.05, WIN.y0 - 0.05, -0.1], [WIN.x1 + 0.05, WIN.y0, -0.1], [WIN.x0 - 0.05, WIN.y0, -0.1]], '#3E3E3A');
        Q([[WIN.x0 - 0.05, WIN.y0, -0.1], [WIN.x1 + 0.05, WIN.y0, -0.1], [WIN.x1 + 0.03, WIN.y0 + 0.008, 0], [WIN.x0 - 0.03, WIN.y0 + 0.008, 0]], '#7E827C');
        // the painted frame: outer frame, mullions, the transom; their faces in shade, the sky on their tops
        const fz = -0.03, fw = 0.05, face = '#AAB2AC', side = '#7A8580';
        const R = (x0, x1, y0, y1, col) => Q([[x0, y0, fz], [x1, y0, fz], [x1, y1, fz], [x0, y1, fz]], col || face);
        R(WIN.x0, WIN.x1, WIN.y1 - fw, WIN.y1); R(WIN.x0, WIN.x1, WIN.y0, WIN.y0 + fw); R(WIN.x0, WIN.x0 + fw, WIN.y0, WIN.y1); R(WIN.x1 - fw, WIN.x1, WIN.y0, WIN.y1);
        WIN.mull.forEach(x => { R(x - fw / 2, x + fw / 2, WIN.y0, WIN.y1); Q([[x + fw / 2, WIN.y0 + fw, fz], [x + fw / 2, WIN.y1 - fw, fz], [x + fw / 2, WIN.y1 - fw, 0], [x + fw / 2, WIN.y0 + fw, 0]], side); });
        R(WIN.x0, WIN.x1, WIN.tran - fw / 2, WIN.tran + fw / 2);
        Q([[WIN.x0, WIN.tran + fw / 2, fz], [WIN.x1, WIN.tran + fw / 2, fz], [WIN.x1, WIN.tran + fw / 2, 0], [WIN.x0, WIN.tran + fw / 2, 0]], '#E2E8E4');
        Q([[WIN.x0, WIN.y0 + fw, fz], [WIN.x1, WIN.y0 + fw, fz], [WIN.x1, WIN.y0 + fw, 0], [WIN.x0, WIN.y0 + fw, 0]], '#DCE3DF');
        // the casement sashes (inner frames) of the three lights
        const sw = 0.028; [[WIN.x0 + fw, WIN.mull[0] - fw / 2], [WIN.mull[0] + fw / 2, WIN.mull[1] - fw / 2], [WIN.mull[1] + fw / 2, WIN.x1 - fw]].forEach(([a, b]) => {
          [[a, b, WIN.y0 + fw, WIN.tran - fw / 2], [a, b, WIN.tran + fw / 2, WIN.y1 - fw]].forEach(([x0, x1, y0, y1]) => { const z2 = fz - 0.012;
            Q([[x0, y0, z2], [x1, y0, z2], [x1, y0 + sw, z2], [x0, y0 + sw, z2]], '#94A09C'); Q([[x0, y1 - sw, z2], [x1, y1 - sw, z2], [x1, y1, z2], [x0, y1, z2]], '#94A09C');
            Q([[x0, y0, z2], [x0 + sw, y0, z2], [x0 + sw, y1, z2], [x0, y1, z2]], '#94A09C'); Q([[x1 - sw, y0, z2], [x1, y0, z2], [x1, y1, z2], [x1 - sw, y1, z2]], '#94A09C'); }); });
        // the darker ground at the foot of the wall: a gravel strip in shade (the bottom of the frame stays calm for type)
        gg.fillStyle = LC.lin(gg, 0, 880, 0, H + M, [[0, '#0A0E0E', 0], [1, '#0A0E0E', fr === 'close' ? 0.6 : 0.45]]); gg.fillRect(-M, 880, W + 2 * M, H - 880 + M);
        if (fr === 'wide') {    // a climbing rose's stems and leaves on the wall, close to the lens, out of focus: we are looking in from the garden
          const fl = LC.layer(W + 2 * M, H + 2 * M); fl.translate(M, M); const R = OTM.rng('rose');
          const leaf = (x, y, r, a, col) => { fl.fillStyle = col; fl.beginPath(); fl.ellipse(x, y, r, r * 0.55, a, 0, Math.PI * 2); fl.fill(); };
          for (let i = 0; i < 46; i++) { const u = R(), x = -40 + Math.pow(u, 1.6) * 330 + R() * 60, y = -40 + u * 420 + R() * 80; leaf(x, y, 26 + R() * 30, R() * 3, R() < 0.5 ? '#16201A' : '#1D2A21'); }
          fl.strokeStyle = '#121912'; fl.lineWidth = 9; fl.beginPath(); fl.moveTo(-40, 470); fl.bezierCurveTo(90, 330, 120, 160, 260, -40); fl.stroke();
          for (let i = 0; i < 9; i++) leaf(140 + R() * 120, 60 + R() * 200, 30, R() * 3, 'rgba(226,190,130,0.16)');      // a little sky caught on the leaves
          gg.drawImage(LC.blurred(fl.canvas, 12, false), -M, -M);
        }
      }));
    },
    anchorsFor(frame) { const cam = TABLE_CAMS[frame] || TABLE_CAMS.wide, p = (x, y, z) => cam.p(x, y, z).slice(0, 2).map(Math.round), kk = (x, y, z) => Math.round(kAt(cam, x, y, z));
      return { emilySeat: p(-0.3, 0.6, 2.05), emilyHead: p(-0.3, 1.12, 2.05), emilyPxPerM: kk(-0.3, 0.6, 2.05), danielFeet: p(0.32, 0, 2.3), danielCollar: p(0.32, 1.5, 2.3), danielPxPerM: kk(0.32, 1, 2.3),
        tableTopY: p(0, TBL.y, 1.75)[1], plate: p(-0.3, TBL.y, 1.32), bowl: p(0.1, TBL.y, 1.4), milk: p(-0.52, TBL.y, 1.2), mug: p(0.42, TBL.y, 1.3),
        glass: [p(WIN.x0, WIN.y1, 0), p(WIN.x1, WIN.y1, 0), p(WIN.x1, WIN.y0, 0), p(WIN.x0, WIN.y0, 0)], centreLight: [p(WIN.mull[0], WIN.tran, 0), p(WIN.mull[1], WIN.y0, 0)],
        at: (x, y, z) => p(x, y, z), pxPerMAt: (x, y, z) => kk(x, y, z) }; },
    light: { x: -420, y: 260, color: '#EBC68D', note: 'the sun through a side window on the left: rim Emily and Daniel on their left (frame left), warm' },
  };
  table.anchors = table.anchorsFor('wide');
  // a wall clock's face (shared by the table view's background and the clock view): centre, radius px, hour (decimal), seconds
  function clockFace(g, c0, r, hrs, sec, o) {
    o = o || {}; const x = c0[0], y = c0[1]; g.save();
    g.fillStyle = '#20282A'; g.beginPath(); g.arc(x, y, r * 1.08, 0, Math.PI * 2); g.fill();
    g.fillStyle = o.tiny ? '#C9CEC6' : '#DADDD4'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    if (!o.tiny) { for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, big = i % 5 === 0, r0 = r * (big ? 0.8 : 0.88), r1 = r * 0.93; g.strokeStyle = '#22292B'; g.lineWidth = big ? r * 0.035 : r * 0.012; g.beginPath(); g.moveTo(x + Math.sin(a) * r0, y - Math.cos(a) * r0); g.lineTo(x + Math.sin(a) * r1, y - Math.cos(a) * r1); g.stroke(); } }
    const hand = (a, len, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - Math.sin(a) * len * 0.15, y + Math.cos(a) * len * 0.15); g.lineTo(x + Math.sin(a) * len, y - Math.cos(a) * len); g.stroke(); };
    const mins = (hrs % 1) * 60;
    hand((hrs % 12) / 12 * Math.PI * 2, r * 0.52, Math.max(1.2, r * 0.07), '#1A2022'); hand(mins / 60 * Math.PI * 2, r * 0.78, Math.max(1, r * 0.045), '#1A2022');
    if (!o.tiny) { hand(sec / 60 * Math.PI * 2, r * 0.84, Math.max(1, r * 0.014), '#9A3B2C'); g.fillStyle = '#1A2022'; g.beginPath(); g.arc(x, y, r * 0.04, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }

  // =================================================================================================================
  // CLOSE VIEWS (Q04): the plate and the crust; the cereal pour through the milk bottle; the travel mug; the wall clock at
  // 7:58; the kettle's chrome holding the room. The breakfast light: the sun from the side window, warm, from frame left.
  // =================================================================================================================
  // a small camera over the table (table space: x right, y up from the table top, z away from the lens)
  const plateCam = mkCam({ x: 0.1, y: 0.33, z: -0.1, yaw: -0.08, pitch: -0.92, f: 1450, cx: W / 2 + 60, cy: H / 2 - 20 });
  const oak = (g, cam, x0, x1, z0, z1, warm) => {
    const q = clipPts(cam, [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]]); const p = LC.pathPts(q);
    g.fillStyle = warm ? '#B88B58' : '#6E5034'; g.fill(p);
    g.save(); g.clip(p); const R = OTM.rng('oakgrain' + x0); g.globalAlpha = 0.2;
    for (let i = 0; i < 70; i++) { const z = z0 + R() * (z1 - z0); g.strokeStyle = R() > 0.5 ? '#5A3E24' : '#D6AC74'; g.lineWidth = 0.8 + R() * 1.6; g.beginPath();
      for (let k = 0; k <= 8; k++) { const x = x0 + (x1 - x0) * k / 8, q = cam.p(x, 0, z + 0.004 * Math.sin(k * 1.3 + i)); k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke(); }
    // the boards' joints
    for (let z = z0 + 0.14; z < z1; z += 0.15) { g.globalAlpha = 0.5; g.strokeStyle = '#2E1E12'; g.lineWidth = 2; const a = cam.p(x0, 0, z), b = cam.p(x1, 0, z); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    g.restore(); return p;
  };
  const ellipseOn = (g, cam, x, z, r, n) => { const pts = []; for (let i = 0; i < (n || 48); i++) { const a = i / (n || 48) * Math.PI * 2; pts.push(cam.p(x + Math.cos(a) * r, 0.002, z + Math.sin(a) * r)); } return LC.pathPts(pts); };
  function plateScene(g, cam, crust, part) {
    const px = 0.04, pz = 0.2;
    if (part !== 'toast') {
    g.fillStyle = '#2A1F17'; g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
    oak(g, cam, -0.8, 0.8, -0.2, 1.2, false);
    // the sun from the left lies across the table in a long warm slant
    { const pl = LC.layer(W + 2 * M, H + 2 * M); pl.translate(M, M); const q = clipPts(cam, [[-0.8, 0.001, -0.2], [0.05, 0.001, -0.2], [0.42, 0.001, 1.2], [-0.8, 0.001, 1.2]]);
      pl.fillStyle = 'rgba(255,214,150,0.42)'; pl.fill(LC.pathPts(q)); g.save(); g.globalCompositeOperation = 'screen'; g.drawImage(LC.blurred(pl.canvas, 6, false), -M, -M); g.restore(); }
    // the plate: rim, well, a soft shadow cast to the right
    { const sh = ellipseOn(g, cam, px + 0.03, pz + 0.012, 0.135); g.fillStyle = 'rgba(30,18,10,0.45)'; g.fill(sh); }
    g.fillStyle = '#E6E4DA'; g.fill(ellipseOn(g, cam, px, pz, 0.13)); g.fillStyle = '#D2D1C6'; g.fill(ellipseOn(g, cam, px, pz, 0.098));
    g.strokeStyle = 'rgba(255,250,236,0.8)'; g.lineWidth = 2; g.stroke(ellipseOn(g, cam, px, pz, 0.128));
    if (part === 'static') return null; }
    // the toast: a slice with its domed top crust (the far edge), a crust all round; 'crust' 0..1 cuts the domed crust off
    const T = (u, v) => cam.p(px - 0.066 + u * 0.132, 0.009, pz - 0.06 + v * 0.112);           // u across, v away from the lens
    const outline = (inset) => { const pts = [T(inset, inset), T(1 - inset, inset), T(1 - inset, 0.86)]; for (let i = 0; i <= 14; i++) { const u = 1 - inset - (1 - 2 * inset) * i / 14, ang = Math.PI * (u - inset) / (1 - 2 * inset); pts.push(T(u + 0.03 * Math.sin(ang * 2) * (u < 0.5 ? -1 : 1), 0.86 + (0.3 - inset * 1.4) * Math.pow(Math.sin(ang), 0.7))); } pts.push(T(inset, 0.86)); return pts; };
    const cutV = 0.86, cut = clamp(crust || 0, 0, 1), cutDone = sstep(cut, 0.78, 1);
    { const slide = cutDone * 0.028 * kAt(cam, px, 0, pz); g.fillStyle = 'rgba(40,26,14,0.35)';
      g.fill(LC.pathPts([T(0, 0), T(1, 0), T(1, cutV), T(0, cutV)].map(q => [q[0] + 10, q[1] + 8])));
      const o = outline(0); g.fill(LC.pathPts([T(0, cutV), T(1, cutV)].concat(o.slice(3, 18)).map(q => [q[0] + 10 + slide * 0.25, q[1] + 8 - slide]))); }
    const strip = () => { const o = outline(0); const pts = [T(0, cutV), T(1, cutV)].concat(o.slice(3, 18)); return LC.pathPts(pts); };
    // the slice below the cut line: crust down both sides and along the near edge, the toasted crumb, butter's sheen
    g.fillStyle = '#7E4B22'; g.fill(LC.pathPts([T(0, 0), T(1, 0), T(1, cutV), T(0, cutV)]));
    g.fillStyle = '#D9A15C'; g.fill(LC.pathPts([T(0.07, 0.07), T(0.93, 0.07), T(0.93, cutV), T(0.07, cutV)]));
    g.fillStyle = 'rgba(255,226,160,0.45)'; g.fill(LC.pathPts([T(0.2, 0.2), T(0.62, 0.16), T(0.7, 0.55), T(0.3, 0.62)]));
    { const R = OTM.rng('crumb'); g.fillStyle = 'rgba(150,92,40,0.35)'; for (let i = 0; i < 40; i++) { const q = T(0.1 + R() * 0.8, 0.1 + R() * 0.72); g.beginPath(); g.arc(q[0], q[1], 1 + R() * 2.5, 0, Math.PI * 2); g.fill(); } }
    // the domed crust beyond the cut: still on (crust 0), cut along the line, then slid away from the slice
    { const slide = cutDone * 0.028 * kAt(cam, px, 0, pz);
      g.save(); g.translate(slide * 0.25, -slide); g.fillStyle = '#7E4B22'; g.fill(strip()); g.fillStyle = '#B9783C'; const o = outline(0.07); g.fill(LC.pathPts([T(0.07, cutV), T(0.93, cutV)].concat(o.slice(3, 18)))); g.restore();
      if (cut > 0) { const cu = clamp(cut / 0.78, 0, 1), a = T(0, cutV), b = T(cu, cutV); g.strokeStyle = '#2E1A0C'; g.lineWidth = 3; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } }
    return { cutFrom: T(0, cutV), cutTo: T(1, cutV), plate: cam.p(px, 0, pz), k: kAt(cam, px, 0, pz) };
  }
  const plateView = {
    cam: plateCam,
    back(c, t, s) {
      s = s || {};
      drawBig(c, bigCache(c, 'kitchen:plate', g => plateScene(g, plateCam, 0, 'static')));
      plateScene(c.g, plateCam, clamp(s.crust || 0, 0, 1), 'toast');      // the toast is live (the knife cuts it on ones)
    },
    front(c, t, s) {      // Emily's glass of milk in the near left, out of focus: its clear rim and the milk's bright body
      drawBig(c, bigCache(c, 'kitchen:plateFront', g => { const L = LC.layer(W + 2 * M, H + 2 * M); L.translate(M, M);
        L.fillStyle = '#EDEBE2'; L.fill(LC.rrect(-120, 330, 420, 900, 60)); L.fillStyle = 'rgba(214,226,224,0.5)'; L.fill(LC.rrect(-130, 170, 440, 200, 40));
        L.fillStyle = LC.lin(L, -120, 0, 300, 0, [[0, '#C9C4B6', 0.6], [0.6, '#FFFFFF', 0], [1, '#B7B2A4', 0.5]]); L.fillRect(-130, 330, 440, 900);
        L.strokeStyle = 'rgba(255,248,232,0.9)'; L.lineWidth = 6; L.beginPath(); L.ellipse(90, 175, 214, 34, 0, Math.PI * 1.05, Math.PI * 1.95); L.stroke();
        g.drawImage(LC.blurred(L.canvas, 18, false), -M, -M); }));
    },
    anchors: (() => { const d = plateScene(LC.layer(8, 8), plateCam, 0); return { cutFrom: d.cutFrom.slice(0, 2).map(Math.round), cutTo: d.cutTo.slice(0, 2).map(Math.round), plate: d.plate.slice(0, 2).map(Math.round), pxPerM: Math.round(d.k) }; })(),
    light: { x: -300, y: 300, color: '#EBC68D' },
  };

  // ---- the cereal pour, through the glass milk bottle ----
  const pourView = {
    back(c, t, s) {
      s = s || {}; const g = c.g;
      drawBig(c, bigCache(c, 'kitchen:pour', gg => {
        gg.fillStyle = LC.lin(gg, 0, 0, 0, H, [[0, '#24302F'], [0.6, '#2E3634'], [1, '#3A2C20']]); gg.fillRect(-M, -M, W + 2 * M, H + 2 * M);
        // the back wall, the sun's slant on it, the oak edge of the table
        gg.fillStyle = 'rgba(214,168,108,0.28)'; gg.beginPath(); gg.moveTo(200, -40); gg.lineTo(820, -40); gg.lineTo(1150, 640); gg.lineTo(530, 640); gg.closePath(); gg.fill();
        gg.fillStyle = '#6E5034'; gg.fillRect(-M, 700, W + 2 * M, 400); gg.fillStyle = '#B88B58'; gg.beginPath(); gg.moveTo(-M, 700); gg.lineTo(1100, 700); gg.lineTo(1300, H + M); gg.lineTo(-M, H + M); gg.closePath(); gg.fill();
        gg.fillStyle = '#E8C48E'; gg.fillRect(-M, 700, W + 2 * M, 4);
        // the bowl: pale stoneware, its far rim lit
        gg.fillStyle = 'rgba(40,24,12,0.55)'; gg.beginPath(); gg.ellipse(905, 832, 230, 30, 0, 0, Math.PI * 2); gg.fill();
        gg.fillStyle = '#A9B4B2'; gg.beginPath(); gg.moveTo(640, 690); gg.bezierCurveTo(650, 860, 1110, 860, 1120, 690); gg.closePath(); gg.fill();
        gg.fillStyle = LC.lin(gg, 640, 0, 1120, 0, [[0, '#E8ECE6', 0.75], [0.35, '#E8ECE6', 0], [1, '#5E6866', 0.4]]); gg.beginPath(); gg.moveTo(640, 690); gg.bezierCurveTo(650, 860, 1110, 860, 1120, 690); gg.closePath(); gg.fill();
        gg.fillStyle = '#5E6866'; gg.beginPath(); gg.ellipse(880, 690, 240, 46, 0, 0, Math.PI * 2); gg.fill();
        gg.strokeStyle = '#F2F2EA'; gg.lineWidth = 5; gg.beginPath(); gg.ellipse(880, 690, 240, 46, 0, Math.PI, Math.PI * 2); gg.stroke();
      }));
      // the flakes in the bowl (fill) and falling (pour), deterministic in t
      const fill = clamp(s.fill == null ? 0.5 : s.fill, 0, 1), pour = clamp(s.pour == null ? 1 : s.pour, 0, 1), R = OTM.rng('flakes');
      g.save(); g.beginPath(); g.ellipse(880, 690, 234, 42, 0, 0, Math.PI * 2); g.clip();
      const n = Math.round(240 * fill);
      const flake = (x, y, sz, rot, seed) => { const r2 = OTM.rng(seed); g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, 0.55); g.beginPath();
        for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, rr = sz * (0.7 + r2() * 0.5); k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath();
        g.fillStyle = r2() < 0.5 ? '#D9A85A' : '#C48C42'; g.fill(); g.strokeStyle = 'rgba(122,72,28,0.7)'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = 'rgba(255,236,190,0.5)'; g.beginPath(); g.ellipse(-sz * 0.2, -sz * 0.2, sz * 0.35, sz * 0.2, 0.4, 0, Math.PI * 2); g.fill(); g.restore(); };
      for (let i = 0; i < 260; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()), x = 880 + Math.cos(a) * r * 225, y = 690 + Math.sin(a) * r * 38 - fill * 18 * (1 - r * r); const sz = 10 + R() * 9, rot = R() * 3;
        if (i >= n) continue; flake(x, y, sz, rot, 'fl' + i); }
      g.restore();
      if (pour > 0) { for (let i = 0; i < 70; i++) { const ph = R(), sp = 0.9 + R() * 0.4, x0 = 860 + (R() - 0.5) * 70; const u = ((t * sp + ph) % 1);
        const y = -60 + u * 760, x = x0 + (R() - 0.5) * 30 * u, sz = 8 + R() * 8, rot = R() * 3 + t * (R() - 0.5) * 6; if (R() > pour) continue;
        flake(x, y, sz, rot, 'fs' + i); } }
    },
    front(c, t, s) {      // the milk bottle, near right, out of focus: milk to its shoulder, the clear neck bending the room
      drawBig(c, bigCache(c, 'kitchen:pourFront', g => { const L = LC.layer(W + 2 * M, H + 2 * M); L.translate(M, M);
        const bottle = LC.smooth([[1380, H + 60], [1370, 520], [1420, 380], [1480, 300], [1490, 120], [1490, -60], [1700, -60], [1700, 120], [1710, 300], [1770, 380], [1820, 520], [1810, H + 60]]);
        L.save(); L.clip(bottle); L.fillStyle = 'rgba(200,214,212,0.35)'; L.fillRect(1300, -100, 600, 1300);
        L.fillStyle = '#ECEAE0'; L.beginPath(); L.moveTo(1300, 470); L.bezierCurveTo(1500, 440, 1700, 440, 1900, 470); L.lineTo(1900, H + 100); L.lineTo(1300, H + 100); L.closePath(); L.fill();
        L.fillStyle = LC.lin(L, 1380, 0, 1810, 0, [[0, '#9C978A', 0.5], [0.3, '#FFFFFF', 0], [0.75, '#FFFFFF', 0.35], [1, '#8E897C', 0.6]]); L.fillRect(1300, -100, 600, 1300); L.restore();
        L.strokeStyle = 'rgba(255,250,238,0.7)'; L.lineWidth = 8; L.stroke(bottle);
        g.drawImage(LC.blurred(L.canvas, 16, false), -M, -M); }));
    },
    anchors: { bowl: [880, 690], streamTop: [860, -60], bottle: [1600, 600], pxPerM: 1700 },
    light: { x: 200, y: -100, color: '#EBC68D' },
  };

  // ---- the travel mug on the counter by the garden window (C1's light): steel, the lid going on ----
  const MUG = { cx: 900, top: 300, bot: 860, r: 200 };
  function mugEnv() { return LC.env(512, 256, (e, X, Y) => {      // brushed steel: the room it holds is soft and low in contrast
    e.fillStyle = '#4A5452'; e.fillRect(0, 0, 512, 256); e.fillStyle = LC.lin(e, 0, 0, 0, Y(30), [[0, '#9AA6A1'], [1, '#64706C']]); e.fillRect(0, 0, 512, Y(30));
    const R = (a0, a1, t1, t0, c) => { e.fillStyle = c; e.fillRect(X(a0), Y(t1), X(a1) - X(a0), Y(t0) - Y(t1)); };
    R(-180, -110, 70, 0, '#C9D2CE'); R(110, 180, 70, 0, '#C9D2CE'); R(-180, 180, 0, -6, '#6E7B76');                    // the garden window behind it
    R(-30, 30, 25, -40, '#38423F'); R(-12, 12, 20, -38, '#6E6658');                                                   // the room behind the lens: the table, the doorway
    R(10, 22, 18, -10, '#B98A5A'); e.fillStyle = LC.lin(e, 0, Y(-6), 0, 256, [[0, '#7D6E5E'], [1, '#3A3029']]); e.fillRect(0, Y(-6), 512, 256); }); }
  const mugBody = () => { const t = MUG.r, b = MUG.r * 0.86, y0 = MUG.top, y1 = MUG.bot + 50; return LC.rquad([[MUG.cx - t, y0], [MUG.cx + t, y0], [MUG.cx + b, y1], [MUG.cx - b, y1]], 26); };
  const mugR = y => MUG.r * (1 - 0.14 * clamp((y - MUG.top) / (MUG.bot + 50 - MUG.top), 0, 1));
  const mugView = {
    back(c, t, s) {
      s = s || {}; const g = c.g, cap = clamp(s.cap == null ? 1 : s.cap, 0, 1);
      drawBig(c, bigCache(c, 'kitchen:mug', gg => {
        // the garden through the glass beyond (C1's garden, close and soft), the rail, the oak
        gg.drawImage(gardenLayer('morning'), EXT.x0 - 200, EXT.y0 - 60, EW * 1.15, EH * 1.15);
        gg.fillStyle = 'rgba(8,16,17,0.18)'; gg.fillRect(-M, -M, W + 2 * M, H + 2 * M);
        gg.fillStyle = '#BCC7C1'; gg.fillRect(-M, 840, W + 2 * M, 14); gg.fillStyle = '#6E7B76'; gg.fillRect(-M, 854, W + 2 * M, 50);
        gg.fillStyle = LC.lin(gg, 0, 904, 0, H, [[0, '#76675A'], [1, '#2B2622']]); gg.fillRect(-M, 904, W + 2 * M, H - 904 + M);
        gg.fillStyle = 'rgba(6,9,9,0.6)'; gg.beginPath(); gg.ellipse(MUG.cx, 912, MUG.r * 1.15, 18, 0, 0, Math.PI * 2); gg.fill();
        // the steel body
        const body = mugBody();
        const steel = LC.chrome(LC.layer(W + 2 * M, H + 2 * M), { x: MUG.cx - MUG.r, y: MUG.top, w: MUG.r * 2, h: MUG.bot - MUG.top + 50 }, (x, y) => { const r = mugR(y), u = (x - MUG.cx) / r; if (Math.abs(u) >= 1) return null; const nz = Math.sqrt(1 - u * u); return [u, 0.14 * nz, nz]; },
          LC.sampler(mugEnv()), { ss: 2, gain: 0.95, fresnel: 0.25 });
        // brushed: the reflections smear down the steel (a vertical blur of the chrome, once)
        const br = OTM.makeCanvas(steel.width, steel.height), bx = br.getContext('2d'); bx.drawImage(steel, 0, 0); for (let i = 1; i <= 6; i++) { bx.globalAlpha = 0.22; bx.drawImage(steel, 0, i * 3); bx.drawImage(steel, 0, -i * 3); }
        gg.save(); gg.clip(body); gg.drawImage(br, MUG.cx - MUG.r, MUG.top); gg.restore();
        gg.save(); gg.clip(body); gg.fillStyle = '#151A1A'; gg.fillRect(MUG.cx - MUG.r, MUG.bot - 60, MUG.r * 2, 46); gg.fillStyle = 'rgba(200,214,210,0.18)'; gg.fillRect(MUG.cx - MUG.r, MUG.bot - 60, MUG.r * 2, 3); gg.restore();      // the rubber grip band
        gg.strokeStyle = 'rgba(236,242,238,0.45)'; gg.lineWidth = 3; gg.stroke(body);
      }));
      // the lid: up and off (cap 0, steam rising), lowering and turning on (cap 1)
      const lift = (1 - sstep(cap, 0, 0.8)) * 190, turn = sstep(cap, 0.6, 1);
      if (cap < 0.85) { const R = OTM.rng('steam'); g.save(); g.globalCompositeOperation = 'screen'; for (let i = 0; i < 6; i++) { const ph = R() * 6, x0 = MUG.cx - 80 + R() * 160;
        g.strokeStyle = rgba('#E8EEEA', 0.05 * (1 - cap)); g.lineWidth = 26 + R() * 20; g.beginPath(); for (let y = MUG.top; y > MUG.top - 300; y -= 20) { const u = (MUG.top - y) / 300, x = x0 + 30 * Math.sin(u * 5 + t * 1.2 + ph) * u; y === MUG.top ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); } g.restore(); }
      const ly = MUG.top - 60 - lift, tilt = (1 - sstep(cap, 0.3, 0.75)) * -0.16;
      g.save(); g.translate(MUG.cx, ly + 30); g.rotate(tilt); g.translate(-MUG.cx, -(ly + 30));
      if (cap < 0.98) { g.fillStyle = '#0A0C0C'; g.beginPath(); g.ellipse(MUG.cx, ly + 62, MUG.r - 6, 16, 0, 0, Math.PI * 2); g.fill(); }        // its underside, seen as it hangs above
      g.fillStyle = '#0F1212'; g.fill(LC.rrect(MUG.cx - MUG.r - 4, ly, MUG.r * 2 + 8, 64, 16));
      g.fillStyle = '#1C2121'; g.beginPath(); g.ellipse(MUG.cx, ly + 2, MUG.r - 14, 14, 0, Math.PI, Math.PI * 2); g.fill();                       // the lid's domed top
      g.fillStyle = '#2A3232'; g.fill(LC.rrect(MUG.cx - 70, ly - 12, 140, 16, 7)); g.fillStyle = '#0A0C0C'; g.fill(LC.rrect(MUG.cx + 10, ly - 9, 46, 9, 4));   // the sip slot and its slider
      g.fillStyle = 'rgba(214,226,222,0.5)'; g.fillRect(MUG.cx - 66, ly - 11, 60, 2);
      g.strokeStyle = 'rgba(220,230,225,0.6)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(MUG.cx - MUG.r + 12, ly + 2); g.lineTo(MUG.cx + MUG.r - 12, ly + 2); g.stroke();
      for (let i = 0; i < 11; i++) { const x = MUG.cx - MUG.r + 20 + ((i * 36 + turn * 70) % (MUG.r * 2 - 40)); g.fillStyle = 'rgba(200,214,210,0.16)'; g.fillRect(x, ly + 16, 3, 40); }   // the grip ridges turn with it
      g.restore();
    },
    front(c, t, s) {},
    anchors: { mug: [MUG.cx, 600], lid: [MUG.cx, MUG.top - 28], lidOff: [MUG.cx, MUG.top - 218], pxPerM: 2600 },
    light: { x: 960, y: 120, color: '#D9E3DF' },
  };

  // ---- the wall clock (7:58), kept small: on the back wall, its glass holding the garden window ----
  const clockView = {
    back(c, t, s) {
      s = s || {}; const g = c.g, hrs = s.time == null ? 7 + 58 / 60 : s.time, sec = ((s.sec == null ? 31 : s.sec) + Math.floor(t)) % 60;
      drawBig(c, bigCache(c, 'kitchen:clockWall', gg => {
        gg.fillStyle = '#2C3A3C'; gg.fillRect(-M, -M, W + 2 * M, H + 2 * M);
        // the sun's window shape on the wall beside it, the dresser's top shelf below
        gg.fillStyle = '#7E6650'; gg.beginPath(); gg.moveTo(1180, 260); gg.lineTo(1600, 300); gg.lineTo(1760, 900); gg.lineTo(1340, 860); gg.closePath(); gg.fill();
        gg.fillStyle = '#D2A56C'; [[1205, 290, 1380, 306, 1430, 560, 1255, 545], [1405, 310, 1580, 326, 1630, 580, 1455, 565], [1262, 575, 1437, 590, 1490, 840, 1314, 825], [1462, 595, 1637, 610, 1690, 860, 1515, 845]].forEach(q => { gg.beginPath(); gg.moveTo(q[0], q[1]); gg.lineTo(q[2], q[3]); gg.lineTo(q[4], q[5]); gg.lineTo(q[6], q[7]); gg.closePath(); gg.fill(); });
        const bl = LC.blurred(gg.canvas, 3); gg.drawImage(bl, -M, -M);
        gg.fillStyle = '#3B342B'; gg.fillRect(-M, 940, W + 2 * M, 30); gg.fillStyle = '#8C7A62'; gg.fillRect(-M, 940, W + 2 * M, 4); gg.fillStyle = '#1E2224'; gg.fillRect(-M, 970, W + 2 * M, 200);
        gg.fillStyle = 'rgba(8,10,10,0.5)'; gg.beginPath(); gg.ellipse(842, 470, 196, 196, 0, 0, Math.PI * 2); gg.fill();      // its shadow on the wall
      }));
      clockFace(g, [826, 456], 180, hrs, sec, {});
      // the glass over the face: the garden window as a bright curved band, a soft sheen, the bevel
      g.save(); g.beginPath(); g.arc(826, 456, 180, 0, Math.PI * 2); g.clip(); g.globalCompositeOperation = 'screen';
      g.fillStyle = 'rgba(214,226,222,0.28)'; g.beginPath(); g.ellipse(760, 380, 120, 60, -0.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(236,240,236,0.22)'; g.fillRect(700, 330, 40, 80); g.fillRect(750, 316, 40, 80);
      g.restore();
      g.strokeStyle = 'rgba(255,244,224,0.45)'; g.lineWidth = 3; g.beginPath(); g.arc(826, 456, 182, Math.PI * 0.9, Math.PI * 1.6); g.stroke();
    },
    front(c, t, s) {},
    anchors: { clock: [826, 456], radius: 180 },
    light: { x: 1500, y: 280, color: '#EBC68D' },
  };

  // ---- the kettle, close: its chrome holds the room (the table, the window behind the lens, whoever stands there) ----
  const KC = { cx: 1060, top: 170, bot: 960, r: 470 }, KC_EYE = 640, KPY = 0.7;    // KC_EYE: the body row where the straight-back direction (the face's centre) lands
  const kcR = y => { const t = (KC.bot - y) / (KC.bot - KC.top); if (t < 0 || t > 0.99) return 0; if (t >= 0.38) return KC.r * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.38) / 0.62, 2))); return KC.r * (1 - 0.1 * Math.pow((0.38 - t) / 0.38, 5)); };
  const kcPath = (() => { const L = [], Rr = []; for (let y = KC.top + 2; y <= KC.bot; y += 3) { const r = kcR(y); L.push([KC.cx - r, y]); Rr.push([KC.cx + r, y]); } return LC.pathPts(L.concat(Rr.reverse())); })();
  const kcNormal = (x, y) => { const r = kcR(y); if (r <= 0) return null; const u = (x - KC.cx) / r; if (Math.abs(u) >= 0.999) return null; const dr = (kcR(y + 1) - kcR(y - 1)) / 2, nz = Math.sqrt(1 - u * u), n = [u, dr * nz, nz], l = Math.hypot(n[0], n[1], n[2]); return [n[0] / l, n[1] / l, n[2] / l]; };
  function roomEnv(tod) {       // the breakfast room behind the lens (phi 0): the table and its warm slant, the doorway, the window
    return LC.env(1024, 512, (e, X, Y) => {
      const R = (a0, a1, t1, t0, c) => { e.fillStyle = c; e.fillRect(X(a0), Y(t1), X(a1) - X(a0), Y(t0) - Y(t1)); };
      e.fillStyle = '#2C3A3C'; e.fillRect(0, 0, 1024, 512); e.fillStyle = LC.lin(e, 0, 0, 0, Y(30), [[0, '#6E7C78'], [1, '#3E4A48']]); e.fillRect(0, 0, 1024, Y(30));
      R(-70, -20, 40, 0, '#D2A56C'); R(-66, -46, 36, 20, '#E8BC82'); R(-42, -24, 36, 20, '#E8BC82');                       // the sun's window on the back wall
      R(30, 52, 30, -40, '#2A221C'); R(34, 48, 26, -38, '#D9A868');                                                       // the hall doorway
      R(-55, 40, -12, -22, '#B98A56'); R(-55, 40, -22, -40, '#4A3524');                                                    // the table, its warm top
      R(-180, -110, 60, -5, '#E2EAE5'); R(110, 180, 60, -5, '#E2EAE5'); R(-180, 180, -5, -12, '#6E7B76');                 // the garden window behind the kettle
      e.fillStyle = LC.lin(e, 0, Y(-12), 0, 512, [[0, '#7D6E5E'], [1, '#2E2620']]); e.fillRect(0, Y(-40), 1024, 512);
    });
  }
  // per-pixel map from the kettle's face to the reflected direction, at quarter resolution, for warping figures into it
  let _kcMap = null;
  function kcMap() {
    if (_kcMap) return _kcMap; const s = 2, x0 = KC.cx - KC.r, y0 = KC.top, w = Math.ceil(KC.r * 2 / s), h = Math.ceil((KC.bot - KC.top) / s), m = new Float32Array(w * h * 2).fill(NaN);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const N = kcNormal(x0 + i * s + s / 2, y0 + j * s + s / 2); if (!N) continue; const vn = -N[2], rx = -2 * vn * N[0], ry = -2 * vn * N[1], rz = -1 - 2 * vn * N[2]; m[(j * w + i) * 2] = Math.atan2(rx, rz); m[(j * w + i) * 2 + 1] = Math.asin(clamp(ry, -1, 1)); }
    return (_kcMap = { s, x0, y0, w, h, m });
  }
  const kettleView = {
    back(c, t, s) {
      drawBig(c, bigCache(c, 'kitchen:kettleClose', gg => {
        gg.drawImage(gardenLayer('morning'), EXT.x0 * 1.4 - 300, EXT.y0 * 1.4 - 200, EW * 1.4, EH * 1.4);
        gg.fillStyle = 'rgba(8,16,17,0.22)'; gg.fillRect(-M, -M, W + 2 * M, H + 2 * M);
        gg.fillStyle = LC.lin(gg, 0, 1000, 0, H + M, [[0, '#5E5146'], [1, '#2B2622']]); gg.fillRect(-M, 1000, W + 2 * M, 200);
        const H_ = KC.bot - KC.top, hx = v => KC.cx + v * KC.r, hy = v => KC.top + v * H_;
        gg.fillStyle = 'rgba(6,9,9,0.7)'; gg.beginPath(); gg.ellipse(KC.cx, KC.bot + 40, KC.r * 1.04, 34, 0, 0, Math.PI * 2); gg.fill();
        gg.fillStyle = '#0F1212'; gg.beginPath(); gg.ellipse(KC.cx, KC.bot + 30, KC.r * 0.96, 44, 0, 0, Math.PI * 2); gg.fill(); gg.fillRect(KC.cx - KC.r * 0.96, KC.bot - 4, KC.r * 1.92, 34);
        { const hp = new Path2D(); hp.moveTo(hx(0.62), hy(0.16)); hp.bezierCurveTo(hx(1.12), hy(0.08), hx(1.42), hy(0.34), hx(1.3), hy(0.6)); hp.bezierCurveTo(hx(1.24), hy(0.72), hx(1.08), hy(0.77), hx(0.93), hy(0.75));
          hp.lineTo(hx(0.94), hy(0.665)); hp.bezierCurveTo(hx(1.07), hy(0.67), hx(1.16), hy(0.58), hx(1.18), hy(0.48)); hp.bezierCurveTo(hx(1.22), hy(0.29), hx(1.0), hy(0.2), hx(0.67), hy(0.24)); hp.closePath();
          gg.fillStyle = '#101313'; gg.fill(hp); gg.save(); gg.clip(hp); gg.strokeStyle = 'rgba(220,230,225,0.7)'; gg.lineWidth = 6; gg.beginPath(); gg.moveTo(hx(0.64), hy(0.165)); gg.bezierCurveTo(hx(1.13), hy(0.085), hx(1.43), hy(0.34), hx(1.31), hy(0.6)); gg.stroke(); gg.restore(); }
        { const A = [hx(-0.8), hy(0.56)], B = [hx(-1.32), hy(0.395)], tube = OTM.S().capsule(A[0], A[1], 70, B[0], B[1], 21).path(0, 1), ang = Math.atan2(B[1] - A[1], B[0] - A[0]), nx = -Math.sin(ang), ny = Math.cos(ang), mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
          gg.fillStyle = LC.lin(gg, mx - nx * 60, my - ny * 60, mx + nx * 60, my + ny * 60, [[0, '#2A302F'], [0.18, '#E9EEEB'], [0.3, '#9AA6A1'], [0.55, '#2A302F'], [0.78, '#8B755C'], [1, '#1E2222']]); gg.fill(tube); }
        LC.chrome(gg, { x: KC.cx - KC.r - 2, y: KC.top, w: KC.r * 2 + 4, h: KC.bot - KC.top + 2 }, kcNormal, LC.sampler(roomEnv('morning')), { ss: 1, gain: 0.92, fresnel: 0.24, clip: kcPath });
        gg.save(); gg.clip(kcPath); gg.strokeStyle = 'rgba(10,14,14,0.6)'; gg.lineWidth = 5; gg.beginPath(); gg.ellipse(KC.cx, KC.top + 108, 230, 28, 0, 0.05, Math.PI - 0.05); gg.stroke();
        gg.strokeStyle = 'rgba(236,242,238,0.5)'; gg.lineWidth = 10; gg.stroke(kcPath); gg.strokeStyle = 'rgba(14,20,20,0.6)'; gg.lineWidth = 4; gg.stroke(kcPath); gg.restore();
        gg.fillStyle = '#101313'; gg.beginPath(); gg.moveTo(KC.cx - 70, KC.top + 60); gg.quadraticCurveTo(KC.cx - 84, KC.top - 24, KC.cx, KC.top - 36); gg.quadraticCurveTo(KC.cx + 84, KC.top - 24, KC.cx + 70, KC.top + 60); gg.closePath(); gg.fill();
        gg.strokeStyle = 'rgba(214,226,220,0.6)'; gg.lineWidth = 5; gg.beginPath(); gg.moveTo(KC.cx - 62, KC.top - 4); gg.quadraticCurveTo(KC.cx - 4, KC.top - 38, KC.cx + 56, KC.top - 12); gg.stroke();
      }));
    },
    // draw a figure into the chrome: fn(g, cam) draws it as a camera at the kettle sees the room behind the lens
    // (cam: 960x540 canvas, 90-degree view, centre = straight back at the viewer); it is warped onto the body
    reflect(c, s, fn) {
      const RW2 = 960, RH2 = 540, f = RW2 / 2, rg = scratch('kettleRoom', RW2, RH2, true); fn(rg, { w: RW2, h: RH2, cx: RW2 / 2, cy: RH2 / 2, f });
      const src = rg.getImageData(0, 0, RW2, RH2).data, M2 = kcMap(), out = scratch('kettleWarp', M2.w, M2.h), img = out.createImageData(M2.w, M2.h), d = img.data;
      // (the face is near, not at infinity: down the body's upright lower part every row would reflect the same direction and
      // smear one line of the face over it, so each row also looks a little higher or lower by its own height: KPY)
      for (let j = 0; j < M2.h; j++) for (let i = 0; i < M2.w; i++) { const k = (j * M2.w + i) * 2, ph = M2.m[k], th = M2.m[k + 1]; if (ph !== ph) continue;
        if (Math.abs(ph) > 1.3) continue; const x = RW2 / 2 + f * Math.tan(ph), y = RH2 / 2 - f * Math.tan(th) / Math.cos(ph) + (M2.y0 + (j + 0.5) * M2.s - KC_EYE) * KPY; if (x < 0 || y < 0 || x >= RW2 || y >= RH2) continue;
        const q = ((y | 0) * RW2 + (x | 0)) * 4, o = (j * M2.w + i) * 4; d[o] = src[q]; d[o + 1] = src[q + 1]; d[o + 2] = src[q + 2]; d[o + 3] = src[q + 3] * 0.9; }
      out.putImageData(img, 0, 0); const g = c.g; g.save(); g.clip(kcPath); g.imageSmoothingEnabled = true; g.drawImage(out.canvas, M2.x0, M2.y0, M2.w * M2.s, M2.h * M2.s); g.restore();
    },
    front(c, t, s) {
      const g = c.g; g.save(); g.clip(kcPath); g.globalCompositeOperation = 'screen';
      const sp = (x, y, rx, ry, a) => { g.fillStyle = LC.rad(g, x, y, 0, rx, [[0, '#FFFFFF', a], [0.45, '#FFFFFF', a * 0.6], [1, '#FFFFFF', 0]]); g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.beginPath(); g.arc(x, y, rx, 0, Math.PI * 2); g.fill(); g.restore(); };
      sp(KC.cx - KC.r * 0.78, KC.top + 300, 36, 80, 0.9); sp(KC.cx + KC.r * 0.8, KC.top + 280, 30, 70, 0.8); g.restore();
    },
    anchors: { face: [KC.cx, KC_EYE], bodyBox: [KC.cx - KC.r, KC.top, KC.cx + KC.r, KC.bot] },
    light: { x: 960, y: 60, color: '#D9E3DF' },
  };

  // demo stand-ins only (the sequences draw RIG's people): flat figures at a view's anchors, rimmed from its light
  function demoFigures(c, v, A) {
    const g = c.g, L = v.light; A = A || v.anchors;
    if (A.emilyHead && window.RIG && RIG.draw) {
      const lt = { x: L.x, y: L.y, color: L.color, back: 0.3 };
      const d = RIG.draw(g, 'daniel', { at: A.danielFeet, scale: A.danielPxPerM, view: 'three', facing: -1, outfit: 'office', collar: 'crooked', face: 'smile', lean: 0.35, head: { nod: 0.2, turn: 0.1, tilt: 0 } }, { light: lt });
      RIG.draw(g, 'emily', { at: A.emilySeat, scale: A.emilyPxPerM, view: 'front', body: 'sit', seat: 0.6, armR: 'desk', armL: 'desk', face: 'solemn', head: { nod: 0.15, turn: 0.1, tilt: 0 } }, { light: lt });
      return;
    }
    const fig = (cx, cy, k, parts) => { parts.forEach(([pts, col]) => { const p = LC.smooth(pts.map(([x, y]) => [cx + x * k, cy - y * k])); g.fillStyle = col; g.fill(p); OTM.silhouette(g, p, { fill: false, light: { x: L.x, y: L.y }, rimColor: L.color, rimW: 2.2, spread: 1.1 }); }); };
    if (A.emilyHead) {   // Emily on her booster, elbows on the table; Daniel standing beside her
      const k = A.emilyPxPerM, [ex, ey] = A.emilySeat;
      fig(ex, ey, k, [[[[-0.16, 0], [0.16, 0], [0.17, 0.2], [0.12, 0.36], [0, 0.4], [-0.12, 0.36], [-0.17, 0.2]], '#B48A3C'], [[[-0.11, 0.38], [0.11, 0.38], [0.12, 0.52], [0, 0.62], [-0.12, 0.52]], '#9E7058'],
        [[[-0.15, 0.5], [-0.12, 0.66], [0, 0.72], [0.12, 0.66], [0.15, 0.5], [0.1, 0.56], [-0.1, 0.56]], '#17110D']]);
      const kd = A.danielPxPerM, [dx, dy] = A.danielFeet;
      fig(dx, dy, kd, [[[[-0.2, 0.75], [0.2, 0.75], [0.24, 1.2], [0.22, 1.45], [0, 1.5], [-0.22, 1.45], [-0.24, 1.2]], '#8FA4B0'], [[[-0.09, 1.48], [0.09, 1.48], [0.11, 1.66], [0, 1.78], [-0.11, 1.66]], '#8C624C'],
        [[[-0.11, 1.64], [-0.1, 1.76], [0, 1.8], [0.1, 1.76], [0.11, 1.64], [0, 1.7]], '#15100D']]);
    }
  }

  // =================================================================================================================
  window.SETS = window.SETS || {};
  SETS.kitchen = {
    views: { counter, hall, pocket, table, plate: plateView, pour: pourView, mug: mugView, clock: clockView, kettle: kettleView },
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
      { name: 'table: through the garden window (Emily, Daniel go between)', draw(c, t) { const s = {}; table.back(c, t, s); demoFigures(c, table, table.anchors); table.front(c, t, s); } },
      { name: 'plate: the crust being cut off', draw(c, t) { const s = { crust: clamp(t / 1.8, 0, 1) }; plateView.back(c, t, s); plateView.front(c, t, s); } },
      { name: 'pour: cereal, through the milk bottle', draw(c, t) { const s = { pour: 1, fill: clamp(t / 3, 0, 1) }; pourView.back(c, t, s); pourView.front(c, t, s); } },
      { name: 'mug: the travel mug, capped', draw(c, t) { const s = { cap: clamp((t - 0.3) / 1.2, 0, 1) }; mugView.back(c, t, s); mugView.front(c, t, s); } },
      { name: 'clock: 7:58', draw(c, t) { clockView.back(c, t, {}); clockView.front(c, t, {}); } },
      { name: 'kettle: the room in the chrome (a face in it)', draw(c, t) { kettleView.back(c, t, {}); kettleView.reflect(c, {}, (g, cam) => {
        if (window.RIG && RIG.face) { RIG.face(g, 'daniel', { at: [cam.cx + 20, cam.cy + 40], size: 380, view: 'front', face: 'tired', outfit: 'night', head: { turn: 0.05, nod: 0.12, tilt: 0 } }, { light: { x: cam.cx - 400, y: cam.cy - 300, color: '#DCE8E4', back: 0.2 } }); return; } g.fillStyle = '#8C624C'; g.beginPath(); g.ellipse(cam.cx + 30, cam.cy - 40, 120, 150, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#15100D'; g.beginPath(); g.ellipse(cam.cx + 30, cam.cy - 150, 125, 60, 0, Math.PI, Math.PI * 2); g.fill(); g.fillStyle = '#8FA4B0'; g.fillRect(cam.cx - 140, cam.cy + 100, 340, 300); }); kettleView.front(c, t, {}); } },
      { name: 'table close: the central light (the collar)', draw(c, t) { const s = { frame: 'close', crustCut: true }; table.back(c, t, s); demoFigures(c, table, table.anchorsFor('close')); table.front(c, t, s); } },
    ],
  };
})();
