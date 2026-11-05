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
  function throughPane(c, fn, a, clip, tint) {
    const m = c.g.getTransform(), s = scratch('fig'); s.setTransform(m); fn(s, a); s.setTransform(1, 0, 0, 1, 0, 0);
    if (tint && clip) {
      const mk = scratch('figMask'); mk.drawImage(s.canvas, 0, 0);
      s.save(); s.setTransform(m); s.clip(clip); s.globalCompositeOperation = 'multiply'; s.fillStyle = tint; s.fillRect(-W, -H, 3 * W, 3 * H); s.restore();
      s.save(); s.globalCompositeOperation = 'destination-in'; s.drawImage(mk.canvas, 0, 0); s.restore();
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
        if (s.figure) throughPane(c, s.figure, view.at(s), WIN, s.figureTint === undefined ? DUSK.figTint : s.figureTint);
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
    views: { c3: C3 },
    demos: [
      { name: 'c3: set 0 (the disc whole)', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, t) { const v = C3, s = { set: 0, figure: standInKneel }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'c3: set 0.3 (the style frame)', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, t) { const v = C3, s = { set: 0.3, figure: standInKneel }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'c3: set 0.55 (the last sliver)', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, t) { const v = C3, s = { set: 0.55, figure: standInKneel }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'c3: set 0.75 (afterglow)', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, t) { const v = C3, s = { set: 0.75, figure: standInKneel }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'c3: set 1 (teal-black)', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, t) { const v = C3, s = { set: 1, figure: standInKneel }; v.back(c, t, s); v.front(c, t, s); } },
    ],
  };
})();
