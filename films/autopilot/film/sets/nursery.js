/* AUTOPILOT · SET: THE NURSERY (EXT. NURSERY - DUSK; EXT. NURSERY CAR PARK - CONTINUOUS) · film/api/nursery.md
   The film's ending. A low brick nursery with bright animals painted along its outer wall, its silent playground, the main
   entrance boarded with plywood and the notice taped to it, and the open car park where Daniel's car has stood all day.
   Look C, "Through Glass", at dusk: a copper sun, a violet-teal sky, long teal shadows on copper tarmac; then silence, teal-black.
   RESTRAINT (FILM.md): the inside of the car is never visible, not even a sliver, not even in a reflection. Its rear glass
   only ever reflects; the doorway, where it could show, is flat shadow behind the door's hinge frame; the camera stays outside.
   Deterministic: OTM.rng / OTM.vnoise / OTM.fbm only. Static layers are cached (keys 'nursery|...'). */
(function () {
  'use strict';
  const { W, H } = OTM, P = LC.P;
  const clamp = OTM.clamp, lerp = OTM.lerp, mix = OTM.mix, rgba = OTM.rgba;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const cache = (c, key, fn, w, h) => c.cache('nursery|' + key, fn, w, h);
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------------------------------------------------------
  // scratch layers (reused every frame) and compositing helpers
  // ---------------------------------------------------------------------------------------------------------------
  const _scr = {};
  function scratch(name, w, h) {
    w = w || W; h = h || H; let g = _scr[name];
    if (!g || g.canvas.width !== w || g.canvas.height !== h) g = _scr[name] = OTM.makeCanvas(w, h).getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, w, h);
    return g;
  }
  // draw an image in screen space whatever the camera transform is (scratch layers are already in screen space)
  function blitScreen(g, img, alpha, mode) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); if (alpha != null) g.globalAlpha = alpha; if (mode) g.globalCompositeOperation = mode; g.drawImage(img, 0, 0); g.restore(); }
  function blit(g, img, x, y, alpha, mode) { if (alpha != null && alpha <= 0.002) return; g.save(); if (alpha != null) g.globalAlpha = Math.min(1, alpha); if (mode) g.globalCompositeOperation = mode; g.drawImage(img, x || 0, y || 0); g.restore(); }
  // a character seen THROUGH a tinted pane: fn(g, anchors) draws it (in world coordinates); inside `clip` it is multiplied by `tint`
  function throughPane(c, fn, a, clip, tint, box) {
    const m = c.g.getTransform(), s = scratch('fig'); s.setTransform(m); fn(s, a); s.setTransform(1, 0, 0, 1, 0, 0);
    if (tint && clip) {
      let x0 = 0, y0 = 0, x1 = W, y1 = H;
      if (box) { const q = [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
        x0 = Math.max(0, Math.floor(Math.min(...q.map(v => v[0])) - 2)); y0 = Math.max(0, Math.floor(Math.min(...q.map(v => v[1])) - 2)); x1 = Math.min(W, Math.ceil(Math.max(...q.map(v => v[0])) + 2)); y1 = Math.min(H, Math.ceil(Math.max(...q.map(v => v[1])) + 2)); }
      const bw = x1 - x0, bh = y1 - y0; if (bw > 0 && bh > 0) {
        const mk = scratch('figMask', W, H); mk.drawImage(s.canvas, x0, y0, bw, bh, 0, 0, bw, bh);
        s.save(); s.setTransform(m); s.clip(clip); s.setTransform(1, 0, 0, 1, 0, 0); s.globalCompositeOperation = 'multiply'; s.fillStyle = tint; s.fillRect(x0, y0, bw, bh); s.restore();
        s.save(); s.beginPath(); s.rect(x0, y0, bw, bh); s.clip(); s.globalCompositeOperation = 'destination-in'; s.drawImage(mk.canvas, 0, 0, bw, bh, x0, y0, bw, bh); s.restore();
      }
    }
    blitScreen(c.g, s.canvas);
  }
  // a reflection in dark glass: fn(g, anchors) draws the reflected subject (world coordinates, as it appears in the glass);
  // it is laid into `clip` with a screen blend (black glass shows only what is lit), dimmed by `k`, optionally tinted
  function reflectInto(c, fn, a, clip, k, tint) {
    const m = c.g.getTransform(), s = scratch('refl'); s.setTransform(m); fn(s, a); s.setTransform(1, 0, 0, 1, 0, 0);
    if (tint) { s.save(); s.globalCompositeOperation = 'source-atop'; s.fillStyle = tint; s.globalAlpha = 0.35; s.fillRect(0, 0, W, H); s.restore(); }
    c.g.save(); c.g.setTransform(m); c.g.clip(clip); c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.globalCompositeOperation = 'screen'; c.g.globalAlpha = k == null ? 0.5 : k; c.g.drawImage(s.canvas, 0, 0); c.g.restore();
  }

  // ---------------------------------------------------------------------------------------------------------------
  // the dusk light, shared by every view
  // ---------------------------------------------------------------------------------------------------------------
  const DUSK = {
    sky: [[0, '#232D38'], [0.35, '#3A4250'], [0.62, '#6A5A5C'], [0.84, '#B26E4A'], [1, '#E39A5C']],          // toward the sun
    skyEast: [[0, '#1C2530'], [0.4, '#2C3442'], [0.75, '#46465A'], [0.92, '#5E5266'], [1, '#6A586A']],        // away from it: violet-teal
    skyNight: [[0, '#121820'], [0.35, '#1C2230'], [0.62, '#2C2A3A'], [0.84, '#4A3644'], [1, '#5E4044']],      // after the sun: afterglow
    sun: '#FFDCA6', sunCore: '#FFF2DA', rim: '#F4AE72', copper: '#E89A5E', shadow: '#1B2226', far: '#3A3038', farBand: '#4A3840',
    tar: [[0, '#CC8650'], [0.08, '#A0663F'], [0.34, '#6C4935'], [0.8, '#3A2D2A'], [1, '#2C2224']],
    tarNight: [[0, '#4E3A3C'], [0.08, '#3A2E32'], [0.34, '#282228'], [0.8, '#18181C'], [1, '#121316']],
    tint1: '#5E7D83', tint2: '#9CB0B2',                                                                       // the privacy glass (two multiplies)
    figTint: '#C4D0D1',                                                                                        // what that glass does to a figure behind it
  };
  // posterised glare rings and the soft glow of a low sun (screen); k scales it
  function sunGlow(g, x, y, k, r, clipRect) {
    if (k <= 0.003) return; r = r || 950;
    g.save(); if (clipRect) { g.beginPath(); g.rect(clipRect[0], clipRect[1], clipRect[2], clipRect[3]); g.clip(); }
    g.globalCompositeOperation = 'screen';
    g.fillStyle = LC.rad(g, x, y, 0, r, [[0, '#FFD9A0', 0.95 * k], [0.08, '#F7B877', 0.7 * k], [0.3, '#C77A47', 0.32 * k], [1, '#C77A47', 0]]); g.fillRect(x - r, y - r, 2 * r, 2 * r);
    g.restore();
    [[r * 0.57, 0.05], [r * 0.36, 0.06], [r * 0.206, 0.08]].forEach(([rr, a]) => { g.save(); if (clipRect) { g.beginPath(); g.rect(clipRect[0], clipRect[1], clipRect[2], clipRect[3]); g.clip(); } g.fillStyle = rgba('#FFD49A', a * k); g.beginPath(); g.ellipse(x, y, rr, rr * 0.6, 0, Math.PI, 0); g.fill(); g.restore(); });
  }
  // thin cloud streaks lit from below by a sun that has already gone low
  function cloudStreaks(g, list, lit, dark) {
    list.forEach(([x, y, w, h]) => { g.fillStyle = lit; g.beginPath(); g.ellipse(x + w / 2, y, w / 2, h, 0, 0, TAU); g.fill(); g.fillStyle = dark; g.beginPath(); g.ellipse(x + w / 2 + 22, y - h * 0.6, w * 0.45, h * 0.6, 0, 0, TAU); g.fill(); });
  }
  // a long shadow on the ground: from the base point (bx,by) away from a sun standing on the horizon at sx, out to y = yEnd
  function ray(g, sx, hor, bx, by, w0, w1, yEnd) {
    const dx = bx - sx, dy = Math.max(2, by - hor), t = (yEnd - by) / dy, ex = bx + dx * t, ey = yEnd;
    const ax = Math.atan2(ey - by, ex - bx), nx = -Math.sin(ax), ny = Math.cos(ax);
    g.beginPath(); g.moveTo(bx + nx * w0, by + ny * w0); g.lineTo(ex + nx * w1, ey + ny * w1); g.lineTo(ex - nx * w1, ey - ny * w1); g.lineTo(bx - nx * w0, by - ny * w0); g.closePath(); g.fill();
  }
  // a hard rim on the light side of a filled path (cut, not stroked: the path shifted away from the light and knocked out)
  function rimCut(g, path, color, dx, dy, alpha) {
    if (alpha != null && alpha <= 0.01) return;
    const r = scratch('rim'); r.setTransform(g.getTransform()); r.fillStyle = color; r.fill(path); r.globalCompositeOperation = 'destination-out'; r.translate(dx, dy); r.fill(path);
    blitScreen(g, r.canvas, alpha);
  }

  // ===============================================================================================================
  // C3 · THE DOOR, HELD. Ported from src/C3_door.html (the approved frame, the film's last image).
  // We look through the glass of the open rear door, the same privacy glass that hid her all day. The camera crouches
  // against the car's flank, so the doorway is seen exactly edge-on: there is physically nothing to see into. The eye is at
  // the beltline: the horizon lies on the window's lower edge, and the sun sinks out of the glass.
  // state: { set: 0..1 } the sunset. 0 the disc whole above the sill; ~0.3 the style frame (half the disc); 0.62 the last
  //        sliver gone; then the afterglow fades and the frame drops toward teal-black by 1.
  // ===============================================================================================================
  const C3 = (() => {
    const HOR = 560, BL = 562, VP = [1300, 560], SX = 912, SR = 36, HX = 1362, RX = 560, SUN0 = [912, 568];
    const WIN = (() => { const p = new Path2D(); p.moveTo(HX, 178); p.bezierCurveTo(1100, 180, 860, 188, 742, 198); p.bezierCurveTo(664, 206, 626, 236, 612, 282); p.lineTo(RX, BL); p.lineTo(HX, BL); p.closePath(); return p; })();
    const WB = { x: 532, y: 160, w: 850, h: 412 };              // bounds of the window's own layers
    const SW = { x0: 110, x1: 418, top: 344, base: HOR + 124 };
    // the sun and the light, as functions of the sunset
    const sunY = set => BL - 42 + (SR + 44) * clamp(set / 0.62, 0, 1);
    const frac = set => clamp((BL - (sunY(set) - SR)) / (2 * SR), 0, 1);           // how much of the disc is above the sill
    const lightK = set => Math.pow(clamp(frac(set) / 0.5, 0, 1), 0.6);                 // direct sun: rims, shadows, the copper on the tarmac
    const glowK = set => 1 - sstep(0.45, 0.95, set);                                   // the sky's glow
    const nightK = set => sstep(0.5, 1.0, set);                                        // the drop toward teal-black

    const sky = (c, night) => {
      c.fillStyle = LC.lin(c, 0, 98, 0, HOR, night ? DUSK.skyNight : DUSK.sky); c.fillRect(-200, -200, W + 400, HOR + 202);
      if (!night) sunGlow(c, SUN0[0], SUN0[1], 1, 950, [-200, -200, W + 400, HOR + 202]);
      else { c.save(); c.globalCompositeOperation = 'screen'; c.translate(SX, HOR); c.scale(1, 0.32); c.fillStyle = LC.rad(c, 0, 0, 0, 900, [[0, '#B4645A', 0.42], [0.35, '#7A4A56', 0.2], [1, '#7A4A56', 0]]); c.fillRect(-1000, -1400, 2000, 1400); c.restore(); }
      cloudStreaks(c, [[180, 300, 760, 7], [980, 252, 620, 6], [1340, 330, 480, 5], [40, 390, 380, 4], [700, 404, 300, 3]], night ? 'rgba(120,76,86,0.22)' : 'rgba(214,140,96,0.4)', night ? 'rgba(14,16,24,0.45)' : 'rgba(48,52,66,0.35)');
    };
    const far = (c, night) => {
      c.fillStyle = night ? '#16151C' : DUSK.far; c.beginPath(); c.moveTo(-210, HOR + 2);
      for (let x = -210; x <= W + 210; x += 12) { const n = OTM.fbm(x * 0.006, 2, 9, 3), y = HOR - 10 - n * 40 - (x > 1000 && x < 1180 ? 16 * Math.sin((x - 1000) / 180 * Math.PI) : 0); c.lineTo(x, y); }
      c.lineTo(W + 210, HOR + 2); c.closePath(); c.fill();
      c.fillStyle = night ? '#1C1820' : DUSK.farBand; c.fillRect(-210, HOR - 6, W + 420, 8);
    };
    const tarmac = (c, night) => {
      c.fillStyle = LC.lin(c, 0, HOR, 0, H + 20, night ? DUSK.tarNight : DUSK.tar); c.fillRect(-200, HOR, W + 400, H - HOR + 300);
      if (!night) { c.save(); c.globalCompositeOperation = 'screen'; c.translate(SX, HOR); c.scale(1, 0.2); c.fillStyle = LC.rad(c, 0, 0, 0, 760, [[0, '#FFC27E', 0.62], [0.4, '#E89A5E', 0.18], [1, '#E89A5E', 0]]); c.fillRect(-900, -100, 1800, 3000); c.restore(); }
      else { c.save(); c.globalCompositeOperation = 'screen'; c.translate(SX, HOR); c.scale(1, 0.2); c.fillStyle = LC.rad(c, 0, 0, 0, 700, [[0, '#7A4A50', 0.3], [1, '#7A4A50', 0]]); c.fillRect(-900, -100, 1800, 3000); c.restore(); }
    };
    // the swing frame (legs, top bar, chains, seats) as one path
    const swing = (() => { const p = new Path2D();
      const L = (x0, y0, x1, y1, w) => { const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a) * w / 2, ny = Math.cos(a) * w / 2; p.moveTo(x0 + nx, y0 + ny); p.lineTo(x1 + nx, y1 + ny); p.lineTo(x1 - nx, y1 - ny); p.lineTo(x0 - nx, y0 - ny); p.closePath(); };
      L(SW.x0 - 62, SW.base, SW.x0, SW.top, 12); L(SW.x0 + 54, SW.base - 26, SW.x0, SW.top, 10); L(SW.x1 - 54, SW.base - 26, SW.x1, SW.top, 10); L(SW.x1 + 62, SW.base, SW.x1, SW.top, 12);
      L(SW.x0 - 10, SW.top, SW.x1 + 10, SW.top, 13);
      [[176, 226], [296, 346]].forEach(([a, b]) => { L(a, SW.top, a, 584, 3); L(b, SW.top, b, 584, 3); p.rect(a - 9, 582, b - a + 18, 9); });
      return p; })();
    const railP = (() => { const p = new Path2D(); for (let x = -206; x < RX + 40; x += 14) p.rect(x, HOR - 16, 2, 16); p.rect(-210, HOR - 17, RX + 250, 2.5); p.rect(-210, HOR - 6, RX + 250, 2); return p; })();
    const slideP = (() => { const p = new Path2D(); p.moveTo(26, HOR); p.lineTo(30, 500); p.lineTo(40, 500); p.lineTo(38, HOR); p.closePath(); p.moveTo(40, 504); p.lineTo(120, HOR - 4); p.lineTo(128, HOR - 4); p.lineTo(44, 496); p.closePath(); return p; })();

    // OUTSIDE THE GLASS: the playground, the far nursery, the copper tarmac and the swings' long shadows (lit / after the sun)
    function outside(o, night) {
      sky(o, night); far(o, night); tarmac(o, night);
      o.strokeStyle = night ? 'rgba(150,140,150,0.1)' : 'rgba(232,200,160,0.3)'; o.lineWidth = 3;
      [-260, 210].forEach(x0 => { const xs = VP[0] - 300 + (x0 + 300) * 0.02, ys = HOR + 2; o.beginPath(); o.moveTo(xs, ys); o.lineTo(xs + (x0 - xs) * ((H + 40 - ys) / (942 + 40 - ys)), H + 40); o.stroke(); });
      // the nursery, far off: low brick, its painted animals gone dim in its own shade, plywood on the door and the notice
      { const d = night ? 0.3 : 1, M = col => mix(night ? '#1A161C' : '#0E1014', col, d);
        o.fillStyle = M('#2C2427'); o.fillRect(-20, 488, 250, HOR - 488 + 2); o.fillStyle = M('#231C1F'); o.beginPath(); o.moveTo(-30, 492); o.lineTo(244, 492); o.lineTo(230, 474); o.lineTo(-20, 472); o.closePath(); o.fill();
        if (!night) { o.strokeStyle = 'rgba(240,160,100,0.7)'; o.lineWidth = 2; o.beginPath(); o.moveTo(-20, 473); o.lineTo(230, 475); o.lineTo(244, 492); o.stroke(); }
        o.fillStyle = M(MURAL_FAR.elephant); o.beginPath(); o.ellipse(34, 532, 26, 16, 0, 0, TAU); o.fill(); o.fillRect(14, 534, 7, 18); o.fillRect(46, 534, 7, 18); o.beginPath(); o.ellipse(64, 526, 11, 10, 0, 0, TAU); o.fill();
        o.fillStyle = M(MURAL_FAR.giraffe); o.fillRect(96, 504, 7, 50); o.beginPath(); o.ellipse(106, 534, 16, 11, 0, 0, TAU); o.fill(); o.beginPath(); o.ellipse(104, 502, 7, 5, 0, 0, TAU); o.fill();
        o.fillStyle = M(MURAL_FAR.lion); o.beginPath(); o.arc(206, 534, 14, 0, TAU); o.fill();
        o.fillStyle = M('#6E5F50'); o.fillRect(146, 510, 30, 50); o.fillStyle = M('#C6BCAA'); o.fillRect(155, 526, 12, 9); }
      o.fillStyle = '#16131A'; o.fill(swing);
      if (!night) rimCut(o, swing, '#F2A35E', -2.6, 1);
      o.fillStyle = '#191519'; o.fill(railP); o.fill(slideP);
      if (!night) {   // everything between us and the sun lays a dark ray across the copper, toward us
        const sh = scratch('c3sh'); sh.setTransform(o.getTransform()); sh.save(); sh.beginPath(); sh.rect(-400, HOR + 1, W + 800, 1200); sh.clip(); sh.fillStyle = DUSK.shadow; const R = (x, y, a, b) => ray(sh, SUN0[0], HOR, x, y, a, b, H + 80);
        [[SW.x0 - 62, SW.base], [SW.x0 + 54, SW.base - 26], [SW.x1 - 54, SW.base - 26], [SW.x1 + 62, SW.base]].forEach(([x, y]) => R(x, y, 5, 46));
        [[201, 50], [321, 50]].forEach(([x, w]) => R(x + (x - SUN0[0]) * 0.3, SW.base + 34, w * 0.42, w * 1.5));
        for (let x = -202; x < RX + 40; x += 32) R(x, HOR, 0.6, 3.5);
        sh.restore(); sh.setTransform(1, 0, 0, 1, 0, 0); const shB = LC.blurred(sh.canvas, 1.3, false); o.save(); o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 0.84; o.beginPath(); o.rect(0, 0, W, H); o.clip(); o.drawImage(shB, 0, 0); o.restore();
      }
    }
    // THROUGH THE GLASS: the same dusk, darker and colder in the privacy tint (window-sized layer, offset to WB)
    function through(t, night) {
      t.translate(-WB.x, -WB.y); sky(t, night); far(t, night); tarmac(t, night);
      t.save(); t.globalCompositeOperation = 'multiply'; t.fillStyle = DUSK.tint1; t.fillRect(0, 0, W, H); t.fillStyle = DUSK.tint2; t.fillRect(0, 0, W, H); t.restore();
      t.globalCompositeOperation = 'destination-in'; t.fill(WIN); t.globalCompositeOperation = 'source-over';
    }
    // what the glass gives back from our side, laid over whatever is behind it: the dim eastern sky (screen), then dust and glare lit from behind
    function glassSky(t) { t.translate(-WB.x, -WB.y); t.fillStyle = LC.lin(t, 0, 178, 0, BL, [[0, '#56607A', 0.3], [1, '#56607A', 0.06]]); t.fill(WIN); }
    function glassDust(t) {
      t.translate(-WB.x, -WB.y);
      LC.glare(t, WIN, { x: 860, y: 380, angle: -1.05, color: '#FFE2BC', bands: [{ d: -120, w: 90, a: 0.05 }, { d: -62, w: 15, a: 0.07 }, { d: 290, w: 150, a: 0.035 }] });
      LC.specks(t, WIN, { x: 560, y: 178, w: 810, h: 390 }, 'doorDust', { n: 360, color: '#FFD9A8', rMin: 0.5, rMax: 1.3, aMin: 0.05, aMax: 0.42, scratch: 0, near: { x: SUN0[0], y: SUN0[1], r: 300 } });
    }
    // THE DOOR AND THE FLANK (k = 1 in the sun; 0 after it: the copper leaves every edge)
    function door(g, k) {
      const A = (a) => a * k;
      const sash = new Path2D(); sash.moveTo(HX + 2, 164); sash.bezierCurveTo(1100, 166, 856, 174, 736, 184); sash.bezierCurveTo(652, 192, 610, 226, 594, 276); sash.lineTo(542, BL + 2); sash.lineTo(RX, BL + 2); sash.lineTo(612, 282); sash.bezierCurveTo(626, 236, 664, 206, 742, 198); sash.bezierCurveTo(860, 188, 1100, 180, HX, 178); sash.closePath();
      g.fillStyle = '#0C1013'; g.fill(sash);
      g.strokeStyle = rgba('#F2A468', A(0.6)); g.lineWidth = 2; g.beginPath(); g.moveTo(HX + 2, 164); g.bezierCurveTo(1100, 166, 856, 174, 736, 184); g.bezierCurveTo(652, 192, 610, 226, 594, 276); g.lineTo(542, BL); g.stroke();
      const panel = LC.pathPts([[542, BL], [HX + 6, BL], [HX + 6, H + 10], [565, H + 10]]);
      g.fillStyle = '#0E1417'; g.fill(panel);
      g.save(); g.clip(panel);
      g.fillStyle = LC.lin(g, 0, BL, 0, BL + 150, [[0, '#4A5266', 0.75], [1, '#4A5266', 0]]); g.fillRect(500, BL, 900, 150);
      g.fillStyle = rgba('#C8825A', A(0.22)); g.fillRect(500, BL + 2, 900, 4);
      g.strokeStyle = 'rgba(118,128,150,0.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(552, 706); g.quadraticCurveTo(960, 700, HX + 6, 704); g.stroke();
      g.fillStyle = 'rgba(0,0,0,0.38)'; g.beginPath(); g.moveTo(552, 710); g.quadraticCurveTo(960, 704, HX + 6, 708); g.lineTo(HX + 6, 724); g.quadraticCurveTo(960, 720, 552, 726); g.closePath(); g.fill();
      g.fillStyle = '#192024'; g.fill(LC.rrect(650, 618, 124, 22, 10)); g.fillStyle = rgba('#F0AA6E', 0.12 + A(0.48)); g.fillRect(658, 620, 108, 2);
      g.strokeStyle = 'rgba(110,120,142,0.22)'; g.lineWidth = 2; g.beginPath(); g.moveTo(560, 930); g.quadraticCurveTo(960, 926, HX + 6, 929); g.stroke();
      g.fillStyle = LC.lin(g, 0, 940, 0, H, [[0, '#C07A4C', 0], [1, '#C07A4C', A(0.16)]]); g.fillRect(540, 940, 880, H - 940);
      g.restore();
      // the free edge: the door's thickness, turned to the sun
      g.fillStyle = mix('#161A1E', '#A9683F', k); g.fill(LC.pathPts([[538, BL], [548, BL], [571, H + 10], [561, H + 10]]));
      g.fillStyle = mix('#1E2328', '#EC9858', k); g.fill(LC.pathPts([[540, BL], [543, BL], [564, H + 10], [561, H + 10]]));
      g.fillStyle = mix('#1A1E22', '#E28E52', k); g.fill(LC.pathPts([[590, 276], [594, 276], [542, BL], [538, BL]]));
      // hinge-side frame and the B-pillar: the dark band his arm passes behind (the doorway is edge-on behind it: nothing to see)
      g.fillStyle = '#090C0E'; g.fill(LC.pathPts([[HX - 6, 164], [HX + 40, 150], [HX + 44, H + 10], [HX - 6, H + 10]]));
      g.fillStyle = 'rgba(80,90,104,0.45)'; g.fillRect(HX - 4, 178, 3, BL - 178);
      // the flank rushing to the vanishing point: the front door's glass, foreshortened to a sliver (at this grazing angle a mirror)
      const nb = scratch('c3nb');
      const sl = LC.pathPts([[HX + 44, 150], [1500, 124], [1500, HOR], [HX + 44, HOR]]);
      nb.fillStyle = LC.lin(nb, 0, 112, 0, HOR, [[0, '#0C0F13'], [0.85, '#191619'], [1, mix('#141418', '#4A3028', k)]]); nb.fill(sl);
      nb.fillStyle = rgba('#E8965C', A(0.7)); nb.fillRect(HX + 44, HOR - 8, 1500 - HX - 44, 4);
      const ap = LC.pathPts([[1500, 124], [1784, -40], [W + 40, -40], [W + 40, HOR], [1500, HOR]]);
      nb.fillStyle = LC.lin(nb, 1500, 0, W, 0, [[0, '#0D1013'], [1, '#07090B']]); nb.fill(ap);
      const body = LC.pathPts([[HX + 44, HOR], [W + 40, HOR], [W + 40, H + 40], [HX + 44, H + 40]]);
      nb.fillStyle = '#0B1013'; nb.fill(body);
      nb.save(); nb.clip(body);
      nb.fillStyle = LC.lin(nb, 0, HOR, 0, HOR + 70, [[0, '#E89A5E', A(0.95)], [0.25, '#B8683E', A(0.45)], [1, '#B8683E', 0]]); nb.fillRect(HX, HOR, W, 70);
      nb.strokeStyle = 'rgba(130,140,160,0.32)'; nb.lineWidth = 3; nb.beginPath(); nb.moveTo(HX + 44, HOR + 120); nb.lineTo(W + 40, 942 - 20); nb.stroke();
      nb.fillStyle = 'rgba(0,0,0,0.45)'; nb.beginPath(); nb.moveTo(HX + 44, HOR + 126); nb.lineTo(W + 40, 942 - 10); nb.lineTo(W + 40, H + 40); nb.lineTo(HX + 44, H + 40); nb.closePath(); nb.fill();
      nb.fillStyle = 'rgba(66,74,94,0.28)'; nb.fill(LC.pathPts([[HX + 44, HOR + 40], [W + 40, HOR + 110], [W + 40, HOR + 230], [HX + 44, HOR + 110]]));
      nb.restore();
      nb.strokeStyle = rgba('#E8965C', A(0.3)); nb.lineWidth = 2; nb.beginPath(); nb.moveTo(1500, 124); nb.lineTo(1784, -40); nb.stroke();
      g.drawImage(nb.canvas, 0, 0);
      const soft = scratch('c3soft'); soft.drawImage(nb.canvas, 0, 0); soft.globalCompositeOperation = 'destination-in'; soft.fillStyle = LC.lin(soft, 1560, 0, 1800, 0, [[0, '#000000', 0], [1, '#000000', 1]]); soft.fillRect(0, 0, W, H);
      g.drawImage(LC.blurred(soft.canvas, 9, false), 0, 0);
      g.strokeStyle = '#05070A'; g.lineWidth = 4; g.beginPath(); g.moveTo(HX + 44, HOR); g.lineTo(1500, HOR); g.stroke();
    }

    const view = {
      // the world behind Daniel: outside the glass (untinted, copper) and through it (the tint), and the sinking sun
      back(c, t, s) {
        s = s || {}; const g = c.g, set = s.set || 0, L = lightK(set), gk = glowK(set), sy = sunY(set);
        const tl = Math.max(L, gk * 0.6);
        if (L < 0.999) blit(g, cache(c, 'c3|outN', o => outside(o, true)), 0, 0);
        blit(g, cache(c, 'c3|outL', o => outside(o, false)), 0, 0, L);
        if (tl < 0.999) blit(g, cache(c, 'c3|thrN', o => through(o, true), WB.w, WB.h), WB.x, WB.y);
        blit(g, cache(c, 'c3|thrL', o => through(o, false), WB.w, WB.h), WB.x, WB.y, tl);
        // the sun survives the tint: a copper disc sinking under the glass's lower edge, its glow following it down
        const k = Math.max(0, gk) * (0.35 + 0.65 * L);
        g.save(); g.clip(WIN); g.globalCompositeOperation = 'screen';
        g.fillStyle = LC.rad(g, SX, sy - 20, 0, 520, [[0, '#E89A5E', 0.55 * k], [0.5, '#B06A44', 0.2 * k], [1, '#B06A44', 0]]); g.fillRect(SX - 520, sy - 540, 1040, 1040);
        g.fillStyle = LC.rad(g, SX, sy, 0, 300, [[0, '#FFD39A', 0.92 * L], [0.2, '#E8955A', 0.45 * L], [1, '#B4683E', 0]]); g.fillRect(SX - 300, sy - 300, 600, 600);
        g.globalCompositeOperation = 'source-over';
        if (frac(set) > 0) { g.fillStyle = DUSK.sun; g.beginPath(); g.arc(SX, sy, SR, 0, TAU); g.fill(); g.fillStyle = DUSK.sunCore; g.beginPath(); g.arc(SX, sy, SR * 0.68, 0, TAU); g.fill(); }
        g.restore();
        if (frac(set) > 0) { const E = c.em; E.save(); E.beginPath(); E.rect(0, 0, W, BL); E.clip(); E.globalAlpha = 0.25 + 0.75 * L; E.fillStyle = '#FFD7A0'; E.beginPath(); E.arc(SX, sy, 54, 0, TAU); E.fill(); E.fillStyle = 'rgba(230,140,80,0.3)'; E.beginPath(); E.arc(SX, sy, 120, 0, TAU); E.fill(); E.restore(); }
      },
      // the pane and what is in front of Daniel: the glass's reflection and dust, the door, the flank; then the light goes
      front(c, t, s) {
        s = s || {}; const g = c.g, set = s.set || 0, L = lightK(set), N = nightK(set);
        if (s.figure) throughPane(c, s.figure, view.at(s), WIN, s.figureTint === undefined ? DUSK.figTint : s.figureTint, WB);
        blit(g, cache(c, 'c3|gsky', glassSky, WB.w, WB.h), WB.x, WB.y, 1 - 0.55 * N, 'screen');
        blit(g, cache(c, 'c3|gdust', glassDust, WB.w, WB.h), WB.x, WB.y, 0.15 + 0.85 * L, 'screen');
        if (L < 0.999) blit(g, cache(c, 'c3|doorN', o => door(o, 0)), 0, 0);
        blit(g, cache(c, 'c3|doorL', o => door(o, 1)), 0, 0, L);
        if (N > 0.002) { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = mix('#FFFFFF', '#3E5559', N); g.fillRect(-W, -H, 3 * W, 3 * H); g.globalCompositeOperation = 'source-over'; g.fillStyle = rgba('#0C1719', 0.3 * N); g.fillRect(-W, -H, 3 * W, 3 * H); g.restore(); }
      },
      // anchors: px per metre (k) at Daniel's depth; the ground point under him as he kneels; where his face sits behind the glass
      anchors: { kneel: [1106, 1006], k: 470, face: [1196, 470], head: [1160, 420], shoulder: [1090, 462], hand: [1392, 528], hinge: HX, sill: BL, horizon: HOR, sun: [SX, 568], window: { x: RX, y: 178, w: HX - RX, h: BL - 178 } },
      light: { x: 872, y: 458, color: DUSK.rim },
      // the one light for a state: the sun, sinking (k: its strength for rims, 0..1)
      lightAt(s) { const set = (s && s.set) || 0; return { x: 872, y: sunY(set) - 110, color: DUSK.rim, k: lightK(set) }; },
      at(s) { return Object.assign({}, view.anchors, { light: view.lightAt(s), set: (s && s.set) || 0 }); },
      path: WIN, sunY, lightK, nightK,
      _paint: { outside, sky, far, tarmac, HOR, SX, SR, SUN0, BL, frac, glowK },
    };
    return view;
  })();

  // the painted animals as they read from far away (C3's far left; the full mural is defined below)
  const MURAL_FAR = { elephant: '#3C4C56', giraffe: '#5C4E34', lion: '#583834' };

  // ===============================================================================================================
  // THE MURAL: bright animals painted along the nursery's street wall (the north face). The same wall blurred past Daniel's
  // passenger window this morning (Q06); at dusk it is in focus and drained. Defined once, as vector art on the wall's
  // elevation (metres: u along the wall from its east end, which is screen-left seen from the car park; y up from the
  // pavement), so every view and the roads set paint exactly the same animals. Colours avoid Emily's yellow and the
  // phone's green, which belong to them alone.
  // ===============================================================================================================
  const MURAL = (() => {
    const LEN = 32, EAVES = 2.9, RIDGE0 = 3.95, TOP = 4.4, PLINTH = 0.42, PANEL = [0.5, 2.42];
    const COLORS = {
      brick: '#8C4A36', brickDark: '#6E3828', brickLight: '#A35C42', mortar: '#B9A890', plinth: '#4E3A34',
      panel: '#E8DFCC', panelEdge: '#3A4F78', roof: '#4C4648', roofDark: '#363134', fascia: '#E6E2D8', gutter: '#1E2124',
      frame: '#E6E4DE', sill: '#BDB4A2', alu: '#3C4146', ply: '#C9A26E', plyDark: '#9C7A4E', plyLight: '#E2C08C',
      elephant: { body: '#4F80C2', dark: '#3C6AA8', light: '#86A9DA', tusk: '#F2EAD8' },
      lion: { body: '#E07A3C', dark: '#C2622C', mane: '#A8452A', face: '#F09A5C', muzzle: '#F6DCC0' },
      hippo: { body: '#8B6BB0', dark: '#74579A', light: '#B49ACF' },
      giraffe: { body: '#DB8A45', dark: '#B86E32', patch: '#8E4E26', mane: '#7A3E20' },
      flamingo: { body: '#E58397', dark: '#C9667A', leg: '#D0707F', beak: '#2A2A30' },
      whale: { body: '#2C78A4', dark: '#22608A', light: '#A8CCE0', spout: '#C4DCEA' },
      zebra: { body: '#F0EBDF', stripe: '#2A2C34' },
      snail: { shell: '#E06E5C', spiral: '#F4D8C0', body: '#9FB4C6', dark: '#2A2C34' },
      bird: '#5A86C8', beak: '#E08A3C', cloud: '#CAD8DF', eye: '#1C1C22',
    };
    // the wall, east to west: animals, windows, the main entrance (its door boarded since last night) and a downpipe
    const ITEMS = [
      { kind: 'lion', u: 1.75 }, { kind: 'window', u0: 3.1, u1: 5.5 }, { kind: 'hippo', u: 7.0 }, { kind: 'elephant', u: 9.85 },
      { kind: 'entrance', u0: 11.55, u1: 14.05, door: [12.0, 13.0], side: [13.07, 13.55] },
      { kind: 'giraffe', u: 15.05 }, { kind: 'flamingo', u: 17.15 }, { kind: 'window', u0: 18.5, u1: 20.9 }, { kind: 'whale', u: 23.4 },
      { kind: 'zebra', u: 27.0 }, { kind: 'snail', u: 30.2 }, { kind: 'pipe', u: 21.6 },
      { kind: 'bird', u: 2.9, y: 2.12 }, { kind: 'bird', u: 6.2, y: 2.18, flip: true }, { kind: 'bird', u: 16.5, y: 2.2 }, { kind: 'bird', u: 25.3, y: 2.14 },
      { kind: 'cloud', u: 5.9, y: 2.12 }, { kind: 'cloud', u: 22.0, y: 2.16 }, { kind: 'cloud', u: 29.4, y: 2.1 },
    ];
    const ENTRANCE = ITEMS.find(i => i.kind === 'entrance');
    const SCALE = { elephant: 0.92, lion: 0.95, hippo: 0.95, giraffe: 0.82, flamingo: 0.9, whale: 0.9, zebra: 0.9, snail: 1.0 };
    // the notice on the plywood, at eye level: A4 portrait in a punched plastic sleeve (m, on the elevation)
    const NOTICE = { u: 12.46, y0: 1.40, w: 0.21, h: 0.297, sleeve: [0.236, 0.318] };
    const LOCK = { u: 12.93, y: 1.02 };

    // ---- drawing helpers in elevation space ----
    function ctx(g, u0, pxm) { const X = u => (u - u0) * pxm, Y = y => (TOP - y) * pxm; return { g, X, Y, s: v => v * pxm, pxm }; }
    function taper(E, pts, w0, w1) { // a tapered stroke along local points (metres) -> canvas polygon
      const L = [], R = [], n = pts.length;
      for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = lerp(w0, w1, i / (n - 1)) / 2;
        L.push([pts[i][0] - dy / l * w, pts[i][1] + dx / l * w]); R.push([pts[i][0] + dy / l * w, pts[i][1] - dx / l * w]); }
      return L.concat(R.reverse());
    }
    // each animal: (E, ox, col) where (ox, 0) is its base centre on the elevation; local metres, y up
    const A = {
      elephant(E, o, c) {
        const P = (x, y) => [E.X(o + x), E.Y(y)], el = (x, y, rx, ry, col, rot) => { E.g.fillStyle = col; E.g.beginPath(); const p = P(x, y); E.g.ellipse(p[0], p[1], E.s(rx), E.s(ry), rot || 0, 0, TAU); E.g.fill(); }, rc = (x, y, w, h, col, r) => { E.g.fillStyle = col; const p = P(x, y + h); E.g.fill(LC.rrect(p[0], p[1], E.s(w), E.s(h), E.s(r || 0.05))); };
        const T = (pts, w0, w1, col) => { E.g.fillStyle = col; E.g.fill(LC.smooth(taper(E, pts, w0, w1).map(q => P(q[0], q[1])))); };
        rc(-0.52, 0, 0.22, 0.62, c.dark, 0.08); rc(0.22, 0, 0.22, 0.62, c.dark, 0.08);
        T([[-0.86, 1.0], [-0.95, 0.88], [-0.98, 0.72]], 0.05, 0.03, c.dark); el(-0.985, 0.68, 0.04, 0.06, c.dark);
        el(-0.1, 0.9, 0.8, 0.52, c.body);
        rc(-0.7, 0, 0.24, 0.68, c.body, 0.09); rc(0.02, 0, 0.24, 0.68, c.body, 0.09); rc(0.4, 0, 0.24, 0.72, c.body, 0.09);
        el(0.62, 1.1, 0.37, 0.36, c.body);
        T([[0.82, 1.04], [0.95, 0.9], [1.01, 0.74], [1.1, 0.64], [1.2, 0.68], [1.25, 0.82], [1.26, 0.92]], 0.2, 0.085, c.body);
        el(0.42, 1.12, 0.25, 0.34, c.light, 0.12);
        T([[0.83, 0.93], [0.92, 0.86], [1.0, 0.86]], 0.05, 0.022, c.tusk);
        el(0.74, 1.18, 0.038, 0.042, COLORS.eye);
        [[-0.66, 0.035], [-0.56, 0.035], [0.06, 0.035], [0.16, 0.035], [0.44, 0.035], [0.54, 0.035]].forEach(([x, y]) => el(x, y, 0.035, 0.026, c.tusk));
      },
      lion(E, o, c) {
        const P = (x, y) => [E.X(o + x), E.Y(y)], el = (x, y, rx, ry, col, rot) => { E.g.fillStyle = col; E.g.beginPath(); const p = P(x, y); E.g.ellipse(p[0], p[1], E.s(rx), E.s(ry), rot || 0, 0, TAU); E.g.fill(); }, rc = (x, y, w, h, col) => { E.g.fillStyle = col; const p = P(x, y + h); E.g.fill(LC.rrect(p[0], p[1], E.s(w), E.s(h), E.s(0.06))); };
        E.g.fillStyle = c.body; E.g.fill(LC.pathPts(taper(E, [[-0.7, 0.62], [-0.9, 0.7], [-0.98, 0.92], [-0.92, 1.08]], 0.07, 0.045).map(q => P(q[0], q[1]))));
        el(-0.9, 1.12, 0.09, 0.1, c.mane);
        rc(-0.62, 0, 0.17, 0.48, c.dark); rc(0.0, 0, 0.17, 0.48, c.dark);
        el(-0.18, 0.6, 0.64, 0.33, c.body);
        rc(-0.44, 0, 0.18, 0.5, c.body); rc(0.2, 0, 0.18, 0.5, c.body);
        { const n = 13, pts = []; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, r = i % 2 ? 0.4 : 0.47; pts.push([0.46 + Math.cos(a) * r, 0.84 + Math.sin(a) * r]); } E.g.fillStyle = c.mane; E.g.fill(LC.smooth(pts.map(q => P(q[0], q[1])))); }
        el(0.3, 1.06, 0.085, 0.085, c.dark); el(0.62, 1.06, 0.085, 0.085, c.dark);
        el(0.46, 0.82, 0.28, 0.27, c.face);
        el(0.46, 0.72, 0.13, 0.09, c.muzzle);
        E.g.fillStyle = COLORS.eye; E.g.fill(LC.pathPts([P(0.41, 0.79), P(0.51, 0.79), P(0.46, 0.74)]));
        el(0.38, 0.88, 0.032, 0.036, COLORS.eye); el(0.54, 0.88, 0.032, 0.036, COLORS.eye);
      },
      hippo(E, o, c) {
        const P = (x, y) => [E.X(o + x), E.Y(y)], F = (pts, col) => { E.g.fillStyle = col; E.g.fill(LC.smooth(pts.map(q => P(q[0], q[1])))); }, el = (x, y, rx, ry, col, rot) => { E.g.fillStyle = col; E.g.beginPath(); const p = P(x, y); E.g.ellipse(p[0], p[1], E.s(rx), E.s(ry), rot || 0, 0, TAU); E.g.fill(); }, rc = (x, y, w, h, col) => { E.g.fillStyle = col; const p = P(x, y + h); E.g.fill(LC.rrect(p[0], p[1], E.s(w), E.s(h), E.s(0.07))); };
        rc(-0.62, 0, 0.24, 0.36, c.dark); rc(0.28, 0, 0.24, 0.36, c.dark);
        F([[-0.98, 0.62], [-0.86, 1.0], [-0.3, 1.16], [0.4, 1.08], [0.72, 0.92], [0.78, 0.42], [0.3, 0.24], [-0.6, 0.24], [-0.94, 0.36]], c.body);
        rc(-0.78, 0, 0.26, 0.4, c.body); rc(0.06, 0, 0.26, 0.4, c.body);
        F([[0.52, 0.98], [0.8, 1.04], [1.06, 0.86], [1.14, 0.5], [1.0, 0.3], [0.62, 0.3], [0.5, 0.6]], c.body);
        el(0.94, 0.5, 0.21, 0.18, c.light);
        el(0.62, 1.04, 0.06, 0.08, c.dark, -0.3); el(0.76, 1.07, 0.06, 0.08, c.dark, 0.3);
        el(1.0, 0.58, 0.03, 0.025, COLORS.eye); el(0.88, 0.6, 0.03, 0.025, COLORS.eye);
        el(0.8, 0.86, 0.035, 0.04, COLORS.eye);
      },
      giraffe(E, o, c) {   // stands just west of the door, facing it, its neck rising toward the eaves beside the frame
        const P = (x, y) => [E.X(o + x), E.Y(y)], el = (x, y, rx, ry, col, rot) => { E.g.fillStyle = col; E.g.beginPath(); const p = P(x, y); E.g.ellipse(p[0], p[1], E.s(rx), E.s(ry), rot || 0, 0, TAU); E.g.fill(); };
        const T = (pts, w0, w1, col) => { E.g.fillStyle = col; E.g.fill(LC.smooth(taper(E, pts, w0, w1).map(q => P(q[0], q[1])))); };
        T([[0.12, 1.02], [0.1, 0.5], [0.11, 0.02]], 0.1, 0.07, c.dark); T([[0.52, 1.0], [0.53, 0.5], [0.52, 0.02]], 0.1, 0.07, c.dark);
        T([[0.62, 1.14], [0.7, 1.0], [0.72, 0.84]], 0.035, 0.025, c.dark); el(0.725, 0.8, 0.035, 0.065, c.mane);
        const body = LC.smooth([[-0.2, 1.06], [-0.12, 1.32], [0.2, 1.36], [0.6, 1.2], [0.66, 1.04], [0.5, 0.9], [0.1, 0.9]].map(q => P(q[0], q[1])));
        const neck = LC.smooth(taper(E, [[-0.04, 1.2], [-0.16, 1.62], [-0.28, 1.98], [-0.36, 2.2]], 0.34, 0.13).map(q => P(q[0], q[1])));
        E.g.fillStyle = c.body; E.g.fill(body); E.g.fill(neck);
        T([[-0.04, 1.0], [-0.05, 0.5], [-0.04, 0.02]], 0.1, 0.07, c.body); T([[0.38, 1.0], [0.39, 0.5], [0.38, 0.02]], 0.1, 0.07, c.body);
        // the reticulated coat: rounded patches on a regular net, clipped to body and neck
        E.g.save(); const both = new Path2D(); both.addPath(body); both.addPath(neck); E.g.clip(both);
        const R = OTM.rng('giraffe'); E.g.fillStyle = c.patch;
        for (let y = 0.92; y < 2.25; y += 0.13) for (let x = -0.5; x < 0.75; x += 0.13) { const jx = x + ((Math.round(y / 0.13)) % 2) * 0.065 + (R() - 0.5) * 0.03, jy = y + (R() - 0.5) * 0.03; const p = P(jx, jy); E.g.fill(LC.rrect(p[0] - E.s(0.048), p[1] - E.s(0.044), E.s(0.096), E.s(0.088), E.s(0.03))); }
        E.g.restore();
        T([[-0.02, 1.3], [-0.12, 1.66], [-0.22, 1.98], [-0.28, 2.14]], 0.05, 0.035, c.mane);
        el(-0.44, 2.22, 0.2, 0.11, c.body, -0.32); el(-0.6, 2.16, 0.075, 0.065, c.dark, -0.32);
        E.g.strokeStyle = c.patch; E.g.lineWidth = E.s(0.03); E.g.lineCap = 'round'; [[-0.37, 2.31, -0.39, 2.43], [-0.28, 2.32, -0.28, 2.44]].forEach(([a, b, x, y]) => { const p = P(a, b), q = P(x, y); E.g.beginPath(); E.g.moveTo(p[0], p[1]); E.g.lineTo(q[0], q[1]); E.g.stroke(); });
        el(-0.39, 2.44, 0.032, 0.032, c.patch); el(-0.28, 2.45, 0.032, 0.032, c.patch);
        el(-0.22, 2.27, 0.075, 0.035, c.dark, -0.5);
        el(-0.45, 2.25, 0.03, 0.032, COLORS.eye);
      },
      flamingo(E, o, c) {
        const P = (x, y) => [E.X(o + x), E.Y(y)], el = (x, y, rx, ry, col, rot) => { E.g.fillStyle = col; E.g.beginPath(); const p = P(x, y); E.g.ellipse(p[0], p[1], E.s(rx), E.s(ry), rot || 0, 0, TAU); E.g.fill(); };
        const T = (pts, w0, w1, col) => { E.g.fillStyle = col; E.g.fill(LC.pathPts(taper(E, pts, w0, w1).map(q => P(q[0], q[1])))); };
        T([[0, 1.06], [0, 0.0]], 0.04, 0.035, c.leg); T([[0.02, 0.98], [0.2, 0.76], [0.05, 0.62]], 0.035, 0.03, c.leg);
        E.g.fillStyle = c.dark; E.g.fill(LC.pathPts([P(-0.3, 1.28), P(-0.46, 1.36), P(-0.42, 1.2)]));
        el(0.0, 1.22, 0.34, 0.2, c.body, 0.12);
        el(-0.06, 1.25, 0.2, 0.11, c.dark, 0.12);
        T([[0.25, 1.3], [0.33, 1.52], [0.22, 1.7], [0.27, 1.88]], 0.075, 0.055, c.body);
        el(0.3, 1.92, 0.075, 0.068, c.body);
        T([[0.36, 1.93], [0.45, 1.88], [0.44, 1.8]], 0.05, 0.03, c.beak);
        el(0.31, 1.94, 0.016, 0.018, COLORS.eye);
      },
      whale(E, o, c) {
        const P = (x, y) => [E.X(o + x), E.Y(y)], F = (pts, col) => { E.g.fillStyle = col; E.g.fill(LC.smooth(pts.map(q => P(q[0], q[1])))); }, el = (x, y, rx, ry, col, rot) => { E.g.fillStyle = col; E.g.beginPath(); const p = P(x, y); E.g.ellipse(p[0], p[1], E.s(rx), E.s(ry), rot || 0, 0, TAU); E.g.fill(); };
        const T = (pts, w0, w1, col) => { E.g.fillStyle = col; E.g.fill(LC.pathPts(taper(E, pts, w0, w1).map(q => P(q[0], q[1])))); };
        T([[0.62, 1.16], [0.5, 1.38], [0.36, 1.48]], 0.06, 0.03, c.spout); T([[0.66, 1.18], [0.66, 1.42], [0.68, 1.56]], 0.06, 0.03, c.spout); T([[0.7, 1.16], [0.84, 1.36], [0.98, 1.46]], 0.06, 0.03, c.spout);
        [[0.3, 1.56], [0.72, 1.66], [1.06, 1.54]].forEach(([x, y]) => el(x, y, 0.035, 0.04, c.spout));
        F([[1.28, 0.66], [1.1, 1.02], [0.6, 1.16], [-0.1, 1.06], [-0.8, 0.72], [-1.12, 0.92], [-1.32, 1.02, 1], [-1.2, 0.64], [-1.32, 0.3, 1], [-1.08, 0.42], [-0.7, 0.4], [0.0, 0.18], [0.8, 0.24], [1.16, 0.4]], c.body);
        F([[1.14, 0.42], [0.8, 0.28], [0.0, 0.22], [-0.56, 0.42], [0.0, 0.36], [0.8, 0.4]], c.light);
        F([[0.32, 0.4], [0.18, 0.18], [0.02, 0.12], [0.12, 0.34]], c.dark);
        el(0.86, 0.74, 0.04, 0.045, COLORS.eye);
        E.g.strokeStyle = c.dark; E.g.lineWidth = E.s(0.025); E.g.lineCap = 'round'; E.g.beginPath(); const s0 = P(1.2, 0.56), s1 = P(0.98, 0.48), s2 = P(0.76, 0.5); E.g.moveTo(s0[0], s0[1]); E.g.quadraticCurveTo(s1[0], s1[1], s2[0], s2[1]); E.g.stroke();
      },
      zebra(E, o, c) {
        const P = (x, y) => [E.X(o + x), E.Y(y)], el = (x, y, rx, ry, col, rot) => { E.g.fillStyle = col; E.g.beginPath(); const p = P(x, y); E.g.ellipse(p[0], p[1], E.s(rx), E.s(ry), rot || 0, 0, TAU); E.g.fill(); };
        const T = (pts, w0, w1, col) => { E.g.fillStyle = col; E.g.fill(LC.smooth(taper(E, pts, w0, w1).map(q => P(q[0], q[1])))); };
        T([[-0.58, 1.04], [-0.68, 0.86], [-0.72, 0.7]], 0.04, 0.025, c.stripe); el(-0.725, 0.66, 0.035, 0.065, c.stripe);
        const shape = new Path2D(); const add = p => shape.addPath(p);
        add(LC.smooth([[-0.62, 0.98], [-0.5, 1.24], [0.0, 1.26], [0.5, 1.2], [0.64, 0.98], [0.5, 0.72], [-0.5, 0.72]].map(q => P(q[0], q[1]))));
        add(LC.smooth(taper(E, [[0.42, 1.08], [0.6, 1.34], [0.74, 1.6]], 0.3, 0.16).map(q => P(q[0], q[1]))));
        { const h = new Path2D(), p = P(0.86, 1.6); h.ellipse(p[0], p[1], E.s(0.22), E.s(0.105), -0.5, 0, TAU); add(h); }
        [-0.44, -0.24, 0.24, 0.42].forEach(x => add(LC.smooth(taper(E, [[x, 0.86], [x + 0.005, 0.4], [x, 0.04]], 0.11, 0.075).map(q => P(q[0], q[1])))));
        E.g.fillStyle = c.body; E.g.fill(shape);
        E.g.save(); E.g.clip(shape); E.g.fillStyle = c.stripe;
        [-0.46, -0.28, -0.1, 0.08, 0.26].forEach((x, i) => E.g.fill(LC.smooth(taper(E, [[x - 0.03, 1.32], [x + 0.03, 1.0], [x - 0.01, 0.74]], 0.075, 0.03).map(q => P(q[0], q[1])))));
        [0.0, 1, 2, 3].forEach(i => { const t = i / 3.4, cx = lerp(0.5, 0.74, t), cy = lerp(1.12, 1.56, t); E.g.fill(LC.smooth(taper(E, [[cx - 0.14, cy + 0.07], [cx + 0.14, cy - 0.07]], 0.05, 0.05).map(q => P(q[0], q[1])))); });
        [-0.44, -0.24, 0.24, 0.42].forEach(x => { [0.2, 0.42, 0.64].forEach(y => { const p0 = P(x - 0.08, y + 0.02), p1 = P(x + 0.08, y - 0.02); E.g.fillRect(Math.min(p0[0], p1[0]), p0[1], Math.abs(p1[0] - p0[0]), E.s(0.045)); }); });
        E.g.restore();
        [-0.44, -0.24, 0.24, 0.42].forEach(x => el(x, 0.04, 0.05, 0.035, c.stripe));
        el(1.02, 1.5, 0.065, 0.055, c.stripe, -0.5);
        T([[0.4, 1.18], [0.56, 1.44], [0.68, 1.68]], 0.07, 0.05, c.stripe);
        E.g.fill(LC.pathPts([P(0.74, 1.72), P(0.79, 1.88), P(0.84, 1.72)]));
        el(0.82, 1.64, 0.026, 0.028, COLORS.eye);
      },
      snail(E, o, c) {
        const P = (x, y) => [E.X(o + x), E.Y(y)], F = (pts, col) => { E.g.fillStyle = col; E.g.fill(LC.smooth(pts.map(q => P(q[0], q[1])))); }, el = (x, y, rx, ry, col, rot) => { E.g.fillStyle = col; E.g.beginPath(); const p = P(x, y); E.g.ellipse(p[0], p[1], E.s(rx), E.s(ry), rot || 0, 0, TAU); E.g.fill(); };
        E.g.strokeStyle = c.dark; E.g.lineWidth = E.s(0.022); [[0.54, 0.32, 0.58, 0.54], [0.64, 0.3, 0.74, 0.5]].forEach(([a, b, x, y]) => { const p = P(a, b), q = P(x, y); E.g.beginPath(); E.g.moveTo(p[0], p[1]); E.g.lineTo(q[0], q[1]); E.g.stroke(); });
        el(0.58, 0.55, 0.035, 0.035, c.dark); el(0.745, 0.51, 0.035, 0.035, c.dark);
        F([[-0.6, 0.02, 1], [0.56, 0.02, 1], [0.74, 0.12], [0.68, 0.32], [0.54, 0.38], [0.44, 0.2], [-0.5, 0.14]], c.body);
        el(-0.04, 0.44, 0.38, 0.37, c.shell);
        E.g.strokeStyle = c.spiral; E.g.lineWidth = E.s(0.05); E.g.lineCap = 'round'; E.g.beginPath();
        for (let i = 0; i <= 60; i++) { const a = i / 60 * TAU * 2.3, r = 0.3 * (1 - i / 66); const p = P(-0.04 + Math.cos(a) * r, 0.44 + Math.sin(a) * r); i ? E.g.lineTo(p[0], p[1]) : E.g.moveTo(p[0], p[1]); } E.g.stroke();
        el(0.6, 0.27, 0.025, 0.028, COLORS.eye);
      },
      bird(E, o, c, it) {
        const f = it.flip ? -1 : 1, P = (x, y) => [E.X(o + x * f), E.Y(it.y + y)], el = (x, y, rx, ry, col) => { E.g.fillStyle = col; E.g.beginPath(); const p = P(x, y); E.g.ellipse(p[0], p[1], E.s(rx), E.s(ry), 0, 0, TAU); E.g.fill(); };
        E.g.fillStyle = COLORS.bird; E.g.fill(LC.pathPts([P(-0.08, 0.02), P(-0.2, 0.08), P(-0.18, -0.03)]));
        el(0, 0, 0.1, 0.085, COLORS.bird); el(0.08, 0.06, 0.06, 0.055, COLORS.bird);
        E.g.fillStyle = COLORS.beak; E.g.fill(LC.pathPts([P(0.13, 0.07), P(0.2, 0.05), P(0.13, 0.03)]));
        el(0.09, 0.075, 0.014, 0.014, COLORS.eye);
      },
      cloud(E, o, c, it) {
        const P = (x, y) => [E.X(o + x), E.Y(it.y + y)]; E.g.fillStyle = COLORS.cloud;
        [[-0.22, 0, 0.16], [0, 0.06, 0.2], [0.22, 0.01, 0.15], [0.08, -0.04, 0.16], [-0.1, -0.04, 0.14]].forEach(([x, y, r]) => { const p = P(x, y); E.g.beginPath(); E.g.arc(p[0], p[1], E.s(r), 0, TAU); E.g.fill(); });
      },
    };
    // the bricks: a varied module (12 courses x 8 bricks), cached per scale
    const _brick = {};
    function brickPattern(g, pxm) {
      const key = Math.round(pxm * 10); if (_brick[key]) return g.createPattern(_brick[key], 'repeat');
      const bw = 0.225, ch = 0.075, cols = 8, rows = 12, w = Math.round(bw * cols * pxm), h = Math.round(ch * rows * pxm);
      const c = OTM.makeCanvas(w, h), b = c.getContext('2d'), R = OTM.rng('bricks' + key); b.fillStyle = COLORS.mortar; b.fillRect(0, 0, w, h);
      const jw = Math.max(0.6, 0.01 * pxm);
      for (let r = 0; r < rows; r++) for (let i = -1; i < cols + 1; i++) {
        const x = (i + (r % 2 ? 0.5 : 0)) * bw * w / (bw * cols), y = r * h / rows, t = R();
        b.fillStyle = t < 0.18 ? COLORS.brickDark : t > 0.84 ? COLORS.brickLight : mix(COLORS.brick, t > 0.5 ? COLORS.brickLight : COLORS.brickDark, R() * 0.35);
        b.fillRect(x + jw / 2, y + jw / 2, w / cols - jw, h / rows - jw);
      }
      _brick[key] = c; return g.createPattern(c, 'repeat');
    }
    // paint the wall elevation from u0 to u1 at pxm px per metre into g (origin at u0 and y = TOP). The sky stays transparent.
    function paintRaw(g, u0, u1, pxm, ridge) {
      const E = ctx(g, u0, pxm), X = E.X, Y = E.Y, C = COLORS, Wd = (u1 - u0) * pxm, RIDGE = ridge || RIDGE0;
      // the roof: low, pitched, concrete tiles; the fascia and the gutter
      g.fillStyle = C.roof; g.beginPath(); g.moveTo(X(u0 - 1), Y(EAVES)); g.lineTo(X(u0 - 1), Y(RIDGE)); g.lineTo(X(u1 + 1), Y(RIDGE)); g.lineTo(X(u1 + 1), Y(EAVES)); g.fill();
      g.fillStyle = C.roofDark; for (let y = EAVES + 0.12; y < RIDGE; y += 0.16) g.fillRect(0, Y(y), Wd, Math.max(1, 0.018 * pxm));
      g.fillStyle = C.fascia; g.fillRect(0, Y(EAVES + 0.02), Wd, 0.2 * pxm); g.fillStyle = C.gutter; g.fillRect(0, Y(EAVES + 0.1), Wd, 0.1 * pxm);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, Y(EAVES - 0.18), Wd, 0.06 * pxm);
      // the brick wall, the dark plinth
      g.save(); g.fillStyle = brickPattern(g, pxm); g.translate(-((u0 * pxm) % (0.225 * 8 * pxm)), 0); g.fillRect(-10, Y(EAVES - 0.18), Wd + 20 + 0.225 * 8 * pxm, (EAVES - 0.18) * pxm); g.restore();
      g.fillStyle = C.plinth; g.fillRect(0, Y(PLINTH), Wd, PLINTH * pxm); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, Y(PLINTH), Wd, 0.02 * pxm);
      // the painted panel the animals live on, its two painted edge lines
      const pX0 = X(Math.max(u0, 0.4)), pX1 = X(Math.min(u1, LEN - 0.4));
      g.fillStyle = C.panel; g.fillRect(pX0, Y(PANEL[1]), pX1 - pX0, (PANEL[1] - PANEL[0]) * pxm);
      g.fillStyle = C.panelEdge; g.fillRect(pX0, Y(PANEL[1]), pX1 - pX0, 0.035 * pxm); g.fillRect(pX0, Y(PANEL[0] + 0.035), pX1 - pX0, 0.035 * pxm);
      // the animals
      ITEMS.forEach(it => { if (!A[it.kind] || it.u < u0 - 2 || it.u > u1 + 2) return;
        const k = SCALE[it.kind], base = k ? PANEL[0] + 0.045 : 0, Es = k ? { g, X: u => X(it.u + (u - it.u) * k), Y: y => Y(base + y * k), s: v => v * k * pxm, pxm } : E;
        A[it.kind](Es, it.u, C[it.kind], it); });
      // windows: white frames, a mullion, a stone sill (their glass is laid in later: it reflects, it is not lit)
      ITEMS.filter(i => i.kind === 'window').forEach(w => {
        g.fillStyle = 'rgba(30,22,20,0.6)'; g.fillRect(X(w.u0) - 0.05 * pxm, Y(2.36), (w.u1 - w.u0 + 0.1) * pxm, 1.52 * pxm);
        g.fillStyle = C.frame; g.fillRect(X(w.u0), Y(2.3), (w.u1 - w.u0) * pxm, 1.42 * pxm);
        g.fillStyle = C.sill; g.fillRect(X(w.u0) - 0.08 * pxm, Y(0.9), (w.u1 - w.u0 + 0.16) * pxm, 0.07 * pxm);
      });
      // the main entrance: canopy, aluminium frame, the door's glass boarded with plywood, the intact sidelight, the step
      { const e = ENTRANCE, d = e.door, sd = e.side;
        g.fillStyle = '#8A8478'; g.fillRect(X(e.u0 + 0.1), Y(0.12), (e.u1 - e.u0 - 0.2) * pxm, 0.12 * pxm);
        g.fillStyle = C.alu; g.fillRect(X(d[0] - 0.07), Y(2.2), (sd[1] - d[0] + 0.14) * pxm, 2.08 * pxm);
        g.fillStyle = '#2C3034'; g.fillRect(X(d[0]), Y(2.13), (d[1] - d[0]) * pxm, 2.01 * pxm);
        g.fillStyle = '#4A5056'; g.fillRect(X(d[0] + 0.01), Y(2.12), (d[1] - d[0] - 0.02) * pxm, 1.99 * pxm);
        // the kick plate, the stiles; the lock stile on the right carries the pull and the cylinder
        g.fillStyle = '#5A6066'; g.fillRect(X(d[0] + 0.01), Y(0.32), (d[1] - d[0] - 0.02) * pxm, 0.2 * pxm);
        // the plywood sheet over the door's glass, screwed through to the frame
        paintPlywood(g, X(d[0] + 0.07), Y(2.03), (d[1] - d[0] - 0.19) * pxm, (2.03 - 0.36) * pxm, pxm, 'door');
        // the pull handle and the lock: scored with fresh scratches
        g.fillStyle = '#9AA0A4'; g.fillRect(X(LOCK.u - 0.012), Y(1.42), 0.026 * pxm, 0.42 * pxm);
        g.fillStyle = '#B8BCBE'; g.beginPath(); g.arc(X(LOCK.u), Y(LOCK.y), 0.022 * pxm, 0, TAU); g.fill(); g.fillStyle = '#1A1C1E'; g.fillRect(X(LOCK.u) - 0.003 * pxm, Y(LOCK.y + 0.012), 0.006 * pxm, 0.024 * pxm);
        g.fillStyle = C.alu; g.fillRect(X(sd[0] - 0.03), Y(2.13), (sd[1] - sd[0] + 0.06) * pxm, 2.01 * pxm);
        // the canopy above
        g.fillStyle = 'rgba(20,14,14,0.55)'; g.fillRect(X(e.u0 + 0.04), Y(2.5), (e.u1 - e.u0 - 0.08) * pxm, 0.06 * pxm);   // its soffit, seen from below
        g.fillStyle = '#CFCAC0'; g.fillRect(X(e.u0), Y(2.7), (e.u1 - e.u0) * pxm, 0.16 * pxm);                                  // the fascia
        g.fillStyle = '#1E2124'; g.fillRect(X(e.u0), Y(2.74), (e.u1 - e.u0) * pxm, 0.04 * pxm);
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(X(e.u0), Y(2.56), (e.u1 - e.u0) * pxm, 0.02 * pxm);
      }
      // a downpipe
      ITEMS.filter(i => i.kind === 'pipe').forEach(p => { g.fillStyle = '#26292C'; g.fillRect(X(p.u) - 0.05 * pxm, Y(EAVES), 0.1 * pxm, EAVES * pxm); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(X(p.u) - 0.03 * pxm, Y(EAVES), 0.015 * pxm, EAVES * pxm); });
    }
    return { LEN, EAVES, RIDGE: RIDGE0, TOP, PLINTH, PANEL, COLORS, ITEMS, ENTRANCE, NOTICE, LOCK, A, paintRaw, ctx, taper };
  })();

  // a sheet of exterior plywood: pale, its grain running long, its edges darker, screwed on at 15 cm; fresh, so it glows
  function paintPlywood(g, x, y, w, h, pxm, seed) {
    const C = MURAL.COLORS, R = OTM.rng('ply' + seed);
    g.fillStyle = C.ply; g.fillRect(x, y, w, h);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    for (let i = 0; i < Math.max(10, h / 6); i++) { const yy = y + R() * h, a = 0.05 + R() * 0.12; g.strokeStyle = R() > 0.5 ? rgba(C.plyDark, a) : rgba(C.plyLight, a); g.lineWidth = Math.max(0.6, (0.002 + R() * 0.006) * pxm);
      g.beginPath(); g.moveTo(x - 4, yy); g.bezierCurveTo(x + w * 0.3, yy + (R() - 0.5) * 0.04 * pxm, x + w * 0.7, yy + (R() - 0.5) * 0.04 * pxm, x + w + 4, yy + (R() - 0.5) * 0.02 * pxm); g.stroke(); }
    for (let i = 0; i < 3; i++) { const cx = x + R() * w, cy = y + R() * h, rx = (0.03 + R() * 0.04) * pxm; g.strokeStyle = rgba(C.plyDark, 0.25); g.lineWidth = Math.max(0.6, 0.003 * pxm); for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(cx, cy, rx * (1 + k * 0.6), rx * 0.32 * (1 + k * 0.6), 0, 0, TAU); g.stroke(); } }
    g.fillStyle = rgba(C.plyDark, 0.55); g.fillRect(x, y, w, Math.max(1, 0.006 * pxm)); g.fillRect(x, y + h - Math.max(1, 0.006 * pxm), w, Math.max(1, 0.006 * pxm)); g.fillRect(x, y, Math.max(1, 0.006 * pxm), h); g.fillRect(x + w - Math.max(1, 0.006 * pxm), y, Math.max(1, 0.006 * pxm), h);
    g.restore();
    const sr = Math.max(0.8, 0.007 * pxm); g.fillStyle = '#6E6A62';
    for (let yy = y + 0.04 * pxm; yy < y + h - 0.02 * pxm; yy += 0.15 * pxm) [x + 0.025 * pxm, x + w - 0.025 * pxm].forEach(xx => { g.beginPath(); g.arc(xx, yy, sr, 0, TAU); g.fill(); });
    for (let xx = x + 0.12 * pxm; xx < x + w - 0.08 * pxm; xx += 0.15 * pxm) [y + 0.025 * pxm, y + h - 0.025 * pxm].forEach(yy => { g.beginPath(); g.arc(xx, yy, sr, 0, TAU); g.fill(); });
  }

  // the elevation under a light. 'morning': the north face in soft shade, true colours (Q06); 'evening': the low sun rakes the wall
  // from the west (screen-right) above a soft shade line, and everything is drained; 'dusk': the wall in its own shade, drained
  // further, the copper only on the roof's edge. Glass is laid in after the light (it reflects the sky; it is not lit).
  const LIGHTS = {
    morning: { sat: 0.1, shade: '#D9DEE2', lit: null, glass: [[0, '#C9D6DA'], [0.55, '#A9BAC0'], [1, '#6E7E84']] },
    evening: { sat: 0.45, shade: '#8C8494', lit: '#EEC3A2', line: [0.35, 1.05], glass: [[0, '#5A5868'], [0.5, '#8A6A62'], [0.62, '#C8845A'], [1, '#3A3034']] },
    dusk: { sat: 0.55, shade: '#625E72', lit: '#C88E72', line: [2.7, 3.2], glass: [[0, '#2E3646'], [0.55, '#5A4E5C'], [0.65, '#8A5E50'], [1, '#262428']] },
  };
  function elevation(g, u0, u1, pxm, tod, opts) {
    opts = opts || {}; const Lt = LIGHTS[tod] || LIGHTS.evening, y1 = opts.y1 == null ? MURAL.TOP : opts.y1, y0 = opts.y0 || 0, w = Math.ceil((u1 - u0) * pxm), h = Math.ceil((y1 - y0) * pxm), oy = -(MURAL.TOP - y1) * pxm, E = MURAL.ctx(g, u0, pxm);
    g.save(); g.translate(0, oy);
    const raw = scratch('elevRaw', w, h); raw.translate(0, oy); MURAL.paintRaw(raw, u0, u1, pxm, opts.ridge); raw.setTransform(1, 0, 0, 1, 0, 0);
    // drain the colour, then the shade every surface sits in
    const sh = scratch('elevShade', w, h); sh.drawImage(raw.canvas, 0, 0);
    sh.globalCompositeOperation = 'saturation'; sh.globalAlpha = Lt.sat; sh.fillStyle = '#808080'; sh.fillRect(0, 0, w, h); sh.globalAlpha = 1;
    sh.globalCompositeOperation = 'multiply'; sh.fillStyle = Lt.shade; sh.fillRect(0, 0, w, h);
    sh.globalCompositeOperation = 'destination-in'; sh.drawImage(raw.canvas, 0, 0); sh.globalCompositeOperation = 'source-over';
    g.drawImage(sh.canvas, 0, -oy);
    // the low sun, raking from the west, above a soft line the far trees throw across the wall (lower to the west)
    if (Lt.lit) {
      const li = scratch('elevLit', w, h); li.drawImage(raw.canvas, 0, 0);
      li.globalCompositeOperation = 'saturation'; li.globalAlpha = Lt.sat * 0.7; li.fillStyle = '#808080'; li.fillRect(0, 0, w, h); li.globalAlpha = 1;
      li.globalCompositeOperation = 'multiply'; li.fillStyle = Lt.lit; li.fillRect(0, 0, w, h);
      li.globalCompositeOperation = 'destination-in'; li.drawImage(raw.canvas, 0, 0);
      const line = opts.line || Lt.line, yAt = u => lerp(line[1], line[0], clamp(u / MURAL.LEN, 0, 1)) + 0.22 * (OTM.fbm(u * 0.45, 3, 21, 3) - 0.5);
      const m = new Path2D(); m.moveTo(-10, -10 - h * 4); for (let u = u0 - 0.5; u <= u1 + 0.5; u += 0.12) m.lineTo(E.X(u), E.Y(yAt(u))); m.lineTo(w + 10, -10 - h * 4); m.closePath();
      const mk = scratch('elevMask', w, h); mk.translate(0, oy); mk.fillStyle = '#000'; mk.fill(m); mk.setTransform(1, 0, 0, 1, 0, 0); const mb = LC.blurred(mk.canvas, Math.max(1, 0.05 * pxm), false);
      li.globalCompositeOperation = 'destination-in'; li.drawImage(mb, 0, 0); li.globalCompositeOperation = 'source-over';
      g.drawImage(li.canvas, 0, -oy);
      // the long shadows of what stands out from the wall, thrown east along it: the canopy, the downpipe, the sills
      g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(70,62,84,0.55)';
      const e = MURAL.ENTRANCE; g.fill(LC.pathPts([[E.X(e.u0 - 1.7), E.Y(2.72)], [E.X(e.u0), E.Y(2.72)], [E.X(e.u0), E.Y(2.5)], [E.X(e.u0 - 1.7), E.Y(2.4)]]));
      MURAL.ITEMS.filter(i => i.kind === 'pipe').forEach(p => g.fillRect(E.X(p.u - 0.24), E.Y(MURAL.EAVES), 0.12 * pxm, MURAL.EAVES * pxm));
      MURAL.ITEMS.filter(i => i.kind === 'window').forEach(wn => { g.fillRect(E.X(wn.u1 - 0.17), E.Y(2.3), 0.17 * pxm, 1.42 * pxm); g.fillRect(E.X(wn.u0 - 0.4), E.Y(0.9), 0.32 * pxm, 0.05 * pxm); });
      g.restore();
      // and the copper the sun lays on edges that face it: the fascia, the canopy's lip, the window's west reveals, the plywood
      g.save(); g.globalCompositeOperation = 'screen';
      g.fillStyle = rgba('#E8965C', 0.5); g.fillRect(0, E.Y(MURAL.EAVES + 0.22), w, 0.03 * pxm); g.fillRect(E.X(e.u0), E.Y(2.7), (e.u1 - e.u0) * pxm, 0.025 * pxm);
      MURAL.ITEMS.filter(i => i.kind === 'window').forEach(wn => { g.fillStyle = rgba('#F0A868', 0.45); g.fillRect(E.X(wn.u0), E.Y(2.3), 0.035 * pxm, 1.42 * pxm); });
      g.restore();
    } else { g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = rgba('#B87050', tod === 'dusk' ? 0.4 : 0); g.fillRect(0, E.Y(MURAL.EAVES + 0.22), w, 0.025 * pxm); g.restore(); }
    // the glass: it gives back the sky over the car park, never what is inside
    MURAL.ITEMS.filter(i => i.kind === 'window').forEach(wn => {
      const gx = E.X(wn.u0 + 0.07), gy = E.Y(2.23), gw = (wn.u1 - wn.u0 - 0.14) * pxm, gh = 1.28 * pxm;
      g.fillStyle = LC.lin(g, 0, gy, 0, gy + gh, Lt.glass); g.fillRect(gx, gy, gw, gh);
      g.fillStyle = MURAL.COLORS.frame; g.fillRect(gx + gw / 2 - 0.035 * pxm, gy, 0.07 * pxm, gh);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(gx, gy, gw, 0.04 * pxm);
    });
    { const sd = MURAL.ENTRANCE.side, gx = E.X(sd[0]), gy = E.Y(2.1), gw = (sd[1] - sd[0]) * pxm, gh = 1.96 * pxm;
      g.fillStyle = LC.lin(g, 0, gy, 0, gy + gh, Lt.glass); g.fillRect(gx, gy, gw, gh);
      g.save(); g.beginPath(); g.rect(gx, gy, gw, gh); g.clip(); g.strokeStyle = 'rgba(200,200,200,0.12)'; g.lineWidth = Math.max(0.5, 0.002 * pxm); for (let k = 0; k * 0.025 * pxm < gw + gh; k++) { const d = k * 0.025 * pxm; g.beginPath(); g.moveTo(gx + d, gy); g.lineTo(gx + d - gh, gy + gh); g.stroke(); g.beginPath(); g.moveTo(gx + d - gh, gy); g.lineTo(gx + d, gy + gh); g.stroke(); } g.restore();
      g.fillStyle = MURAL.COLORS.alu; g.fillRect(gx - 1, gy - 1, gw + 2, Math.max(1, 0.012 * pxm)); }
    g.restore();
  }

  // ===============================================================================================================
  // DANIEL'S CAR, the right flank. Right-hand drive (England): the child seat is behind the driver, so the story's door is
  // the RIGHT rear door. A small, ordinary five-door hatchback, muted dark teal-grey, privacy glass at the rear.
  // Car coordinates in metres: x toward the car's right (outward from this flank), y up, z forward; the origin on the
  // ground under the middle of the car. The flank is kept upright (no tumblehome lean), as C3 draws it.
  // ===============================================================================================================
  const CAR = (() => {
    const BODY_X = 0.875, GLASS_X = 0.86, ROOF_X = 0.84;
    const XS = y => y <= 0.985 ? BODY_X : GLASS_X;
    const HINGE = { x: BODY_X, z: -0.11 };
    // the rear door in door-local coordinates: u metres rearward of the hinge line, y up
    const DOOR = {
      sash: [[0, 1.425], [0.3, 1.415], [0.52, 1.39], [0.64, 1.36], [0.72, 1.31], [0.77, 1.22], [0.80, 1.10], [0.815, 0.985]],
      glass: [[0.022, 1.408], [0.3, 1.399], [0.51, 1.376], [0.625, 1.347], [0.703, 1.3], [0.75, 1.217], [0.778, 1.10], [0.794, 0.997], [0.022, 0.997]],
      panel: [[0, 0.985], [0.84, 0.985], [0.848, 0.80], [0.85, 0.66], [0.83, 0.55], [0.80, 0.45], [0.79, 0.36], [0.80, 0.27], [0, 0.27]],
      sill: 0.985, crease: 0.885, swage: 0.48, bottom: 0.27,
      handle: { u0: 0.60, u1: 0.77, y0: 0.888, y1: 0.922 },
    };
    // a door-local point (u, y, w = offset out from the skin) in car coordinates, the door open by th radians about its hinge
    function doorPt(u, y, th, w) { const s = Math.sin(th), c = Math.cos(th), off = XS(y) - HINGE.x + (w || 0); return [HINGE.x + u * s + off * c, y, HINGE.z - u * c + off * s]; }
    const MAXOPEN = 75 * Math.PI / 180;
    // the paint, in three values for each light: the upper surfaces give back the sky, the lower ones the dark tarmac
    const PAINT = { base: '#2F3B3F', dusk: { top: '#4A5266', mid: '#161E21', low: '#0E1417', edge: '#E89A5E' } };
    return { BODY_X, GLASS_X, ROOF_X, XS, HINGE, DOOR, doorPt, MAXOPEN, PAINT };
  })();

  // the door's skin below the window, drawn straight from the 3D door: dp(u, y) projects a door-local point (u metres
  // rearward of the hinge, y up). Horizontal features are exact projected lines; the sky's band and the copper wash are
  // stepped, posterised bands (three values a surface, as the look asks). k: 1 in the sun, 0 after it.
  function doorSkin3D(g, dp, k, o) {
    o = o || {}; const D = CAR.DOOR, A = a => a * k, U0 = 0, U1 = 0.85;
    const quad = (y0, y1, u0, u1) => LC.pathPts([dp(u0 == null ? U0 : u0, y0), dp(u1 == null ? U1 : u1, y0), dp(u1 == null ? U1 : u1, y1), dp(u0 == null ? U0 : u0, y1)]);
    const line = (y, u0, u1) => { const a = dp(u0 == null ? U0 : u0, y), b = dp(u1 == null ? U1 : u1, y); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); };
    g.fillStyle = o.base || '#0E1417'; g.fillRect(-W, -H, 3 * W, 3 * H);
    // the east, dim, laid along the top of the paint in four steps
    const sky = o.sky || '#4A5266', top = D.sill, depth = 0.13;
    [0.62, 0.42, 0.25, 0.11].forEach((a, i) => { g.fillStyle = rgba(sky, a); g.fill(quad(top - depth * i / 4, top - depth * (i + 1) / 4)); });
    g.strokeStyle = rgba('#C8825A', A(0.3)); g.lineWidth = 3; line(top - 0.004); g.stroke();
    // the shoulder crease: a fine light line and the shadow under it
    g.strokeStyle = 'rgba(118,128,150,0.42)'; g.lineWidth = 2; line(D.crease); g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.36)'; g.fill(quad(D.crease - 0.004, D.crease - 0.022));
    // the handle: a body-coloured pull in its recess, the sun on its top lip
    const h = D.handle, hp = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, cx = (h.u0 + h.u1) / 2, cy = (h.y0 + h.y1) / 2, rx = (h.u1 - h.u0) / 2, ry = (h.y1 - h.y0) / 2, e = 0.18;
      const sx = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), e), sy = Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), 0.5); hp.push(dp(cx + rx * sx, cy + ry * sy)); }
    g.fillStyle = o.handle || '#192024'; g.fill(LC.pathPts(hp));
    g.strokeStyle = rgba('#F0AA6E', 0.12 + A(0.5)); g.lineWidth = 2; line(h.y1 - 0.004, h.u0 + 0.012, h.u1 - 0.012); g.stroke();
    // the lower swage and the copper of the tarmac laid faintly along the bottom of the door
    g.strokeStyle = 'rgba(110,120,142,0.22)'; g.lineWidth = 2; line(D.swage); g.stroke();
    [0.05, 0.1, 0.15].forEach((a, i) => { g.fillStyle = rgba('#C07A4C', A(a)); g.fill(quad(0.40 - i * 0.05, 0.35 - i * 0.05)); });
    g.fillStyle = rgba('#C07A4C', A(0.17)); g.fill(quad(0.25, 0.2));
  }

  // ===============================================================================================================
  // DOOR · the open rear door seen from behind it (A104-A106). C3's grammar with the eye raised to Daniel's stooped face:
  // the camera stands against the front door, so the doorway stays edge-on behind the hinge band at every angle.
  // state: { open: 0..1 (closed .. 75 degrees), set: the sunset as in C3 (default 0), figure(g, a): Daniel seen through
  //          the glass (tinted inside it, untinted where he is outside it) }
  // ===============================================================================================================
  const DOORV = (() => {
    const F = 1300, CX = 960, CY = 540, CAM = { x: 0.90, y: 1.18, z: 0.70 };
    const cam = LC.camera({ x: CAM.x, y: CAM.y, z: CAM.z, yaw: Math.PI - 0.30, pitch: 0, f: F, cx: CX, cy: CY });
    const Cp = C3._paint, DX = 62, DY = -20;                       // C3's world, re-aimed: its vanishing point and horizon for this eye
    const SX = Cp.SX + DX, SR = Cp.SR, sunY = set => C3.sunY(set) + DY;
    const pr = q => cam.p(q[0], q[1], q[2]);
    const th = s => clamp(s.open == null ? 1 : s.open, 0, 1) * CAR.MAXOPEN;
    const geo = (t) => {
      const D = CAR.DOOR, dp = (u, y, w) => pr(CAR.doorPt(u, y, t, w));
      const glass = D.glass.map(([u, y]) => dp(u, y)), sashO = D.sash.map(([u, y]) => dp(u, y)).concat([dp(0, D.sill), dp(0, 1.425)]);
      const ring = new Path2D(); [sashO, glass].forEach(pts => { ring.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(q => ring.lineTo(q[0], q[1])); ring.closePath(); });
      return { glass, glassP: LC.pathPts(glass), ring, sashO, panelP: LC.pathPts(D.panel.map(([u, y]) => dp(u, y))), dp,
        front: [dp(0, 1.425), dp(0, D.bottom)], free: D.sash.slice(-4).map(([u, y]) => dp(u, y)).concat(D.panel.slice(1, 8).map(([u, y]) => dp(u, y))) };
    };
    // the B-pillar's outer front edge, and the flank ahead of it (the front door, foreshortened past the lens)
    const B = y => pr([CAR.XS(y), y, -0.02]);
    function world(o, night, tinted) {
      o.save(); o.translate(DX, DY);
      if (tinted) { Cp.sky(o, night); Cp.far(o, night); Cp.tarmac(o, night); } else Cp.outside(o, night);
      o.restore();
      if (tinted) { o.save(); o.globalCompositeOperation = 'multiply'; o.fillStyle = DUSK.tint1; o.fillRect(0, 0, W, H); o.fillStyle = DUSK.tint2; o.fillRect(0, 0, W, H); o.restore(); }
    }
    // the near bodywork right of the hinge band (static): the B-pillar, the front door's glass at a grazing angle (a dark
    // mirror holding one copper seam), its panel with the shoulder catching the sun, the roof's edge; the nearest of it soft
    function near(g, k) {
      const A = a => a * k, nb = scratch('dvnb');
      const glassQ = [B(1.425), pr([CAR.GLASS_X, 1.425, 0.62]), pr([CAR.GLASS_X, 0.985, 0.62]), B(0.985)];
      const panelQ = [B(0.985), pr([CAR.BODY_X, 0.985, 0.64]), pr([CAR.BODY_X, 0.0, 0.64]), B(0.0)];
      const roofQ = [B(1.425), pr([CAR.ROOF_X, 1.47, -0.02]), pr([CAR.ROOF_X, 1.47, 0.62]), pr([CAR.GLASS_X, 1.425, 0.62])];
      // at this grazing angle the front door's glass is a mirror: the sky darkening above, the horizon's copper seam at our eye height, the tarmac below
      nb.save(); nb.clip(LC.pathPts(glassQ));
      nb.fillStyle = LC.lin(nb, 0, 0, 0, H, [[0, '#0A0D11'], [0.3, '#12141A'], [0.47, mix('#1A1A22', '#3A2A2C', k)], [0.5, mix('#22202A', '#7A4A34', k)], [0.505, mix('#141418', '#3A2620', k)], [0.62, '#16120F'], [0.8, '#100E0E'], [1, '#0C0C0E']]); nb.fillRect(0, 0, W, H);
      nb.fillStyle = rgba('#E8965C', A(0.75)); nb.fillRect(0, CY - 3, W, 4); nb.fillStyle = rgba('#FFC890', A(0.35)); nb.fillRect(0, CY - 2, W, 1.5);
      nb.fillStyle = 'rgba(86,96,122,0.16)'; nb.fillRect(0, 0, W, CY - 60);
      const s0 = B(1.0), s1 = pr([CAR.GLASS_X, 1.0, 0.62]); nb.strokeStyle = rgba('#E8965C', A(0.5)); nb.lineWidth = 3; nb.beginPath(); nb.moveTo(s0[0], s0[1] - 4); nb.lineTo(s1[0], s1[1] - 4); nb.stroke();
      nb.restore();
      nb.fillStyle = '#0B1013'; nb.fill(LC.pathPts(panelQ));
      nb.save(); nb.clip(LC.pathPts(panelQ));
      const c0 = B(0.985), c1 = B(0.86); nb.fillStyle = LC.lin(nb, 0, c0[1], 0, c1[1] + 30, [[0, '#E89A5E', A(0.95)], [0.3, '#B8683E', A(0.45)], [1, '#B8683E', 0]]); nb.fillRect(c0[0] - 10, c0[1], W, H);
      const k0 = B(0.885), k1 = pr([CAR.BODY_X, 0.885, 0.64]); nb.strokeStyle = 'rgba(130,140,160,0.32)'; nb.lineWidth = 3; nb.beginPath(); nb.moveTo(k0[0], k0[1]); nb.lineTo(k1[0], k1[1]); nb.stroke();
      nb.fillStyle = 'rgba(0,0,0,0.45)'; nb.fill(LC.pathPts([[k0[0], k0[1] + 6], [k1[0], k1[1] + 6], [W + 400, H + 400], [k0[0], H + 400]]));
      nb.restore();
      nb.fillStyle = LC.lin(nb, 1500, 0, W, 0, [[0, '#0D1013'], [1, '#07090B']]); nb.fill(LC.pathPts(roofQ));
      nb.strokeStyle = rgba('#E8965C', A(0.3)); nb.lineWidth = 2; nb.beginPath(); const r0 = B(1.425), r1 = pr([CAR.GLASS_X, 1.425, 0.62]); nb.moveTo(r0[0], r0[1]); nb.lineTo(r1[0], r1[1]); nb.stroke();
      // the B-pillar itself: black, glossy, edge-on
      const bp = LC.pathPts([pr([CAR.GLASS_X, 1.43, -0.11]), B(1.43), B(0.985), pr([CAR.GLASS_X, 0.985, -0.11])]);
      nb.fillStyle = '#06080A'; nb.fill(bp);
      g.drawImage(nb.canvas, 0, 0);
      const soft = scratch('dvsoft'); soft.drawImage(nb.canvas, 0, 0); soft.globalCompositeOperation = 'destination-in'; soft.fillStyle = LC.lin(soft, 1600, 0, 1840, 0, [[0, '#000000', 0], [1, '#000000', 1]]); soft.fillRect(0, 0, W, H);
      g.drawImage(LC.blurred(soft.canvas, 9, false), 0, 0);
    }
    const sunAt = (g, set, x, y, inGlass) => {
      const L = C3.lightK(set), gk = Cp.glowK(set), k = gk * (0.35 + 0.65 * L), fr = Cp.frac(set);
      g.save(); g.globalCompositeOperation = 'screen';
      g.fillStyle = LC.rad(g, x, y - 20, 0, 520, [[0, '#E89A5E', (inGlass ? 0.55 : 0.3) * k], [0.5, '#B06A44', 0.2 * k], [1, '#B06A44', 0]]); g.fillRect(x - 520, y - 540, 1040, 1040);
      g.fillStyle = LC.rad(g, x, y, 0, 300, [[0, '#FFD39A', 0.92 * L], [0.2, '#E8955A', 0.45 * L], [1, '#B4683E', 0]]); g.fillRect(x - 300, y - 300, 600, 600);
      g.restore();
      if (fr > 0) { g.save(); g.beginPath(); g.rect(-W, -H, 3 * W, H + CY + 2); g.clip(); g.fillStyle = DUSK.sun; g.beginPath(); g.arc(x, y, SR, 0, TAU); g.fill(); g.fillStyle = DUSK.sunCore; g.beginPath(); g.arc(x, y, SR * 0.68, 0, TAU); g.fill(); g.restore(); }
    };
    const view = {
      back(c, t, s) {
        s = s || {}; const g = c.g, set = s.set || 0, L = C3.lightK(set), gk = Cp.glowK(set), sy = sunY(set), G = geo(th(s)), tl = Math.max(L, gk * 0.6);
        if (L < 0.999) blit(g, cache(c, 'door|outN', o => world(o, true, false)), 0, 0);
        blit(g, cache(c, 'door|outL', o => world(o, false, false)), 0, 0, L);
        sunAt(g, set, SX, sy, false);
        g.save(); g.clip(G.glassP);
        if (tl < 0.999) blit(g, cache(c, 'door|thrN', o => world(o, true, true)), 0, 0);
        blit(g, cache(c, 'door|thrL', o => world(o, false, true)), 0, 0, tl);
        sunAt(g, set, SX, sy, true);
        g.restore();
        if (Cp.frac(set) > 0) { const E = c.em; E.save(); E.beginPath(); E.rect(0, 0, W, CY + 2); E.clip(); E.globalAlpha = 0.25 + 0.75 * L; E.fillStyle = '#FFD7A0'; E.beginPath(); E.arc(SX, sy, 54, 0, TAU); E.fill(); E.fillStyle = 'rgba(230,140,80,0.3)'; E.beginPath(); E.arc(SX, sy, 120, 0, TAU); E.fill(); E.restore(); }
      },
      front(c, t, s) {
        s = s || {}; const g = c.g, set = s.set || 0, L = C3.lightK(set), N = C3.nightK(set), a = th(s), G = geo(a), sa = Math.sin(a);
        const bb = G.glass.reduce((b, q) => [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[0]), Math.max(b[3], q[1])], [1e9, 1e9, -1e9, -1e9]);
        if (s.figure) throughPane(c, s.figure, view.at(s), G.glassP, s.figureTint === undefined ? DUSK.figTint : s.figureTint, { x: bb[0], y: bb[1], w: bb[2] - bb[0], h: bb[3] - bb[1] });
        // the glass: nearly edge-on it mirrors the sunset along the flank; opened toward us it gives back the dim east
        g.save(); g.clip(G.glassP); g.globalCompositeOperation = 'screen';
        g.fillStyle = LC.lin(g, 0, bb[1], 0, bb[3], [[0, mix('#B8704A', '#56607A', sa), lerp(0.75, 0.3, sa) * (1 - 0.55 * N)], [1, mix('#C47A4A', '#56607A', sa), lerp(0.5, 0.06, sa) * (1 - 0.55 * N)]]); g.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]);
        g.restore();
        LC.glare(g, G.glassP, { x: (bb[0] + bb[2]) / 2 - 60, y: (bb[1] + bb[3]) / 2 - 80, angle: -1.05, color: '#FFE2BC', bands: [{ d: -120, w: 90, a: 0.05 * (0.3 + 0.7 * L) }, { d: -62, w: 15, a: 0.07 * (0.3 + 0.7 * L) }, { d: 290, w: 150, a: 0.035 }] });
        LC.specks(g, G.glassP, { x: bb[0], y: bb[1], w: bb[2] - bb[0], h: bb[3] - bb[1] }, 'doorvDust', { n: 300, color: '#FFD9A8', rMin: 0.5, rMax: 1.3, aMin: 0.05, aMax: 0.4 * (0.2 + 0.8 * L), scratch: 0, near: { x: SX, y: sunY(set), r: 320 } });
        // the door: its sash, its skin (mapped in strips), the hem catching the sun
        g.fillStyle = '#0C1013'; g.fill(G.ring, 'evenodd');
        if (L > 0.01) { g.strokeStyle = rgba('#F2A468', 0.6 * L); g.lineWidth = 2; g.beginPath(); G.sashO.slice(0, 8).forEach((q, i) => i ? g.lineTo(q[0], q[1] - 1) : g.moveTo(q[0], q[1] - 1)); g.stroke(); }
        g.save(); g.clip(G.panelP); doorSkin3D(g, G.dp, L); g.restore();
        if (L > 0.01) { g.strokeStyle = rgba('#EC9858', 0.9 * L); g.lineWidth = 3; g.beginPath(); G.free.forEach((q, i) => i ? g.lineTo(q[0] + 1.5, q[1]) : g.moveTo(q[0] + 1.5, q[1])); g.stroke(); }
        // the hinge band: from the door's front edge to the B-pillar, flat shadow. The doorway lies edge-on behind it.
        const fr = G.front, b0 = B(1.43), b1 = B(CAR.DOOR.bottom);
        g.fillStyle = '#090C0E'; g.fill(LC.pathPts([[fr[0][0] - 2, fr[0][1] - 6], [b0[0] + 4, b0[1] - 6], [b1[0] + 4, H + 20], [fr[1][0] - 2, H + 20]]));
        g.fillStyle = 'rgba(80,90,104,0.45)'; g.fillRect(fr[0][0], fr[0][1] + 20, 3, CAR.DOOR.sill > 0 ? (G.dp(0, CAR.DOOR.sill)[1] - fr[0][1] - 20) : 0);
        blit(g, cache(c, 'door|nearN', o => near(o, 0)), 0, 0, L < 0.999 ? 1 : 0);
        blit(g, cache(c, 'door|nearL', o => near(o, 1)), 0, 0, L);
        if (N > 0.002) { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = mix('#FFFFFF', '#3E5559', N); g.fillRect(-W, -H, 3 * W, 3 * H); g.restore(); }
      },
      anchors: (() => { const f = pr([1.12, 1.24, -0.40]), fe = pr([1.12, 0, -0.40]); return { face: [f[0], f[1]], k: F / f[2], ground: [fe[0], fe[1]], hinge: 1413, horizon: CY, sun: [SX, sunY(0)] }; })(),
      light: { x: SX - 40, y: sunY(0) - 110, color: DUSK.rim },
      lightAt(s) { const set = (s && s.set) || 0; return { x: SX - 40, y: sunY(set) - 110, color: DUSK.rim, k: C3.lightK(set) }; },
      at(s) { return Object.assign({}, view.anchors, { light: view.lightAt(s), open: th(s || {}) / CAR.MAXOPEN }); },
      // where the door's handle is at a given opening (for Daniel's hand)
      handleAt(s) { const h = CAR.DOOR.handle, q = geo(th(s || {})).dp((h.u0 + h.u1) / 2, (h.y0 + h.y1) / 2); return [q[0], q[1]]; },
      camera: cam,
    };
    return view;
  })();

  // demo stand-in for A106: Daniel stooped at the doorway, head and shoulders, seen from the door's front side
  function standInStoop(g, a) {
    const f = a.face, k = a.k / 1130, L = a.light;
    const p = new Path2D();
    const P = (x, y) => [f[0] + x * k, f[1] + y * k];
    const pts = [[-250, 700], [-260, 300], [-220, 120], [-150, 40], [-90, -10], [-70, -60], [-60, -120], [-20, -160], [40, -170], [90, -140], [115, -90], [120, -40], [112, -10], [118, 20], [108, 40], [96, 66], [70, 90], [110, 120], [260, 150], [420, 200], [430, 700]];
    pts.forEach((q, i) => { const r = P(q[0], q[1]); i ? p.lineTo(r[0], r[1]) : p.moveTo(r[0], r[1]); }); p.closePath();
    g.fillStyle = '#0A0E10'; g.fill(p);
    if (L.k > 0.01) { const b0 = P(-260, -170), b1 = P(430, 700); OTM.silhouette(g, p, { fill: false, light: { x: L.x, y: L.y }, rimColor: L.color, rimW: 3.6, rimSoft: true, spread: 1.2, rimAlpha: L.k, at: P(0, -60), bbox: { x: b0[0], y: b0[1], w: b1[0] - b0[0], h: b1[1] - b0[1] } }); }
  }

  // ===============================================================================================================
  // demo stand-ins (demos only: the sequences draw Daniel with RIG). The kneeling silhouette is the style frame's.
  // ===============================================================================================================
  const DAN_KNEEL = (() => { const p = new Path2D();
    p.moveTo(1006, 592); p.bezierCurveTo(1004, 540, 1014, 506, 1034, 486); p.bezierCurveTo(1050, 472, 1070, 464, 1090, 462); p.bezierCurveTo(1098, 462, 1104, 466, 1108, 468);
    p.bezierCurveTo(1108, 452, 1112, 432, 1124, 418); p.bezierCurveTo(1138, 402, 1162, 398, 1180, 408); p.bezierCurveTo(1196, 418, 1206, 436, 1208, 454); p.bezierCurveTo(1209, 464, 1208, 472, 1206, 478);
    p.bezierCurveTo(1209, 484, 1208, 490, 1202, 494); p.bezierCurveTo(1198, 500, 1192, 504, 1186, 506); p.lineTo(1180, 508); p.lineTo(1190, 510);
    p.bezierCurveTo(1220, 500, 1252, 498, 1284, 500); p.bezierCurveTo(1314, 502, 1342, 506, 1392, 510); p.lineTo(1392, 546); p.bezierCurveTo(1332, 542, 1298, 538, 1264, 538);
    p.bezierCurveTo(1240, 538, 1222, 542, 1212, 552); p.lineTo(1206, 592); p.closePath();
    p.moveTo(1092, 466); p.bezierCurveTo(1126, 454, 1172, 462, 1192, 488); p.bezierCurveTo(1204, 508, 1198, 532, 1178, 546); p.bezierCurveTo(1142, 554, 1106, 540, 1092, 514); p.closePath();
    return p; })();
  function standInKneel(g, a) {
    const L = a.light; g.fillStyle = '#0A0E10'; g.fill(DAN_KNEEL);
    if (L.k > 0.01) OTM.silhouette(g, DAN_KNEEL, { fill: false, light: { x: L.x, y: L.y }, rimColor: L.color, rimW: 3.6, rimSoft: true, spread: 1.25, rimAlpha: L.k, bbox: { x: 1000, y: 396, w: 400, h: 200 } });
  }

  // ===============================================================================================================
  SETS.nursery = {
    views: { c3: C3, door: DOORV },
    demos: [
      { name: 'mural: elevation (morning / evening / dusk)', draw(c, t) { const g = c.g; g.fillStyle = '#2A3440'; g.fillRect(0, 0, W, H);
        ['morning', 'evening', 'dusk'].forEach((tod, i) => { const cv = cache(c, 'test|elev|' + tod, o => elevation(o, 0, 32, 60, tod), 1920, 264); g.drawImage(cv, 0, 40 + i * 340); }); } },
      { name: 'mural: entrance detail (evening)', draw(c, t) { const g = c.g; g.fillStyle = '#2A3440'; g.fillRect(0, 0, W, H);
        const cv = cache(c, 'test|elevE', o => elevation(o, 8.4, 17.0, 220, 'evening', { ridge: 3.15 }), 1892, 968); g.drawImage(cv, 14, 50); } },
      { name: 'door: open 0 (he pulls)', post: { vig: 0.45 }, draw(c, t) { const v = DOORV, s = { open: 0 }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'door: open 0.5', post: { vig: 0.45 }, draw(c, t) { const v = DOORV, s = { open: 0.5 }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'door: open (A106, stand-in)', post: { vig: 0.45 }, draw(c, t) { const v = DOORV, s = { open: 1, figure: standInStoop }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'door: open, empty', post: { vig: 0.45 }, draw(c, t) { const v = DOORV, s = { open: 1 }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'c3: set 0 (the disc whole)', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, t) { const v = C3, s = { set: 0, figure: standInKneel }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'c3: set 0.3 (the style frame)', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, t) { const v = C3, s = { set: 0.3, figure: standInKneel }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'c3: set 0.55 (the last sliver)', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, t) { const v = C3, s = { set: 0.55, figure: standInKneel }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'c3: set 0.75 (afterglow)', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, t) { const v = C3, s = { set: 0.75, figure: standInKneel }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'c3: set 1 (teal-black)', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, t) { const v = C3, s = { set: 1, figure: standInKneel }; v.back(c, t, s); v.front(c, t, s); } },
    ],
  };
})();
