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
  // a reflection in dark glass: fn(g, anchors) draws the reflected subject (world coordinates, as it appears in the glass).
  // mode 'over' (default): the glass already gives back the sky; the subject stands in front of that sky in the mirror-world, so it
  // REPLACES it: darkened by the glass's reflectance (tint, multiply) and laid over at k. mode 'screen': onto black glass.
  function reflectInto(c, fn, a, clip, k, tint, mode) {
    const m = c.g.getTransform(), s = scratch('refl'); s.setTransform(m); fn(s, a); s.setTransform(1, 0, 0, 1, 0, 0);
    if (tint) { const mk = scratch('reflMask'); mk.drawImage(s.canvas, 0, 0); s.save(); s.globalCompositeOperation = 'multiply'; s.fillStyle = tint; s.fillRect(0, 0, W, H); s.globalCompositeOperation = 'destination-in'; s.drawImage(mk.canvas, 0, 0); s.restore(); }
    c.g.save(); c.g.setTransform(m); c.g.clip(clip); c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.globalCompositeOperation = mode === 'screen' ? 'screen' : 'source-over'; c.g.globalAlpha = k == null ? 0.9 : k; c.g.drawImage(s.canvas, 0, 0); c.g.restore();
  }

  // a pinhole camera (LC.camera) that can also clip polygons against its near plane, so geometry beside or behind the lens
  // never projects wild (LC.camera alone clamps depth)
  function mkCam(o) {
    const c = LC.camera(o), cy = Math.cos(o.yaw || 0), sy = Math.sin(o.yaw || 0), cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0);
    c.cs = (x, y, z) => { const dx = x - o.x, dy = y - o.y, dz = z - o.z, x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy; return [x1, dy * cp - z1 * sp, dy * sp + z1 * cp]; };
    c.proj = q => [o.cx + o.f * q[0] / q[2], o.cy - o.f * q[1] / q[2]];
    c.clip = (pts3, near) => { near = near || 0.06; const P = pts3.map(q => c.cs(q[0], q[1], q[2])), out = [];
      for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], ai = a[2] >= near, bi = b[2] >= near; if (ai) out.push(a); if (ai !== bi) { const t = (near - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, near]); } }
      return out.map(c.proj); };
    c.path = pts3 => { const q = c.clip(pts3); return q.length > 2 ? LC.pathPts(q) : new Path2D(); };
    return c;
  }

  // a smooth horizontal smear of px pixels (motion blur), for caches: squash the image, blur it, stretch it back
  function smearH(src, px) {
    const k = Math.max(1, px / 2.2), w = Math.max(2, Math.round(src.width / k)), a = OTM.makeCanvas(w + 8, src.height), ag = a.getContext('2d');
    ag.drawImage(src, 4, 0, w, src.height); ag.drawImage(src, 0, 0, 1, src.height, 0, 0, 4, src.height); ag.drawImage(src, src.width - 1, 0, 1, src.height, w + 4, 0, 4, src.height);
    const b = OTM.makeCanvas(w + 8, src.height), bg = b.getContext('2d'); bg.filter = 'blur(1.2px)'; bg.drawImage(a, 0, 0); bg.drawImage(a, 0, 0); bg.filter = 'none';
    const c = OTM.makeCanvas(src.width, src.height), cg = c.getContext('2d'); cg.imageSmoothingQuality = 'high'; cg.drawImage(b, 4, 0, w, src.height, 0, 0, src.width, src.height); return c;
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
        // the notice taped at eye level: white paper in its sleeve (the words themselves are drawn where they can be read)
        { const N = NOTICE, nx = X(N.u - N.w / 2), ny = Y(N.y0 + N.h), nw = N.w * pxm, nh = N.h * pxm;
          g.fillStyle = 'rgba(40,28,20,0.3)'; g.fillRect(nx - 0.012 * pxm, ny + 0.006 * pxm, nw + 0.02 * pxm, nh + 0.01 * pxm);
          g.fillStyle = '#EEE8DC'; g.fillRect(nx, ny, nw, nh);
          if (pxm > 90) { g.fillStyle = 'rgba(30,28,26,0.55)'; [0.28, 0.36, 0.44, 0.52, 0.6].forEach((t, i) => { const lw = [0.4, 0.62, 0.66, 0.84, 0.86][i]; g.fillRect(nx + nw * (0.5 - lw / 2), ny + nh * t, nw * lw, Math.max(1, nh * 0.045)); }); g.fillRect(nx + nw * 0.24, ny + nh * 0.72, nw * 0.52, Math.max(1, nh * 0.05)); }
          g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(nx - 0.01 * pxm, ny - 0.008 * pxm, nw + 0.02 * pxm, nh + 0.016 * pxm); }
        // the pull handle and the lock: scored with fresh scratches
        g.fillStyle = '#9AA0A4'; g.fillRect(X(LOCK.u - 0.012), Y(1.42), 0.026 * pxm, 0.42 * pxm);
        g.fillStyle = '#B8BCBE'; g.beginPath(); g.arc(X(LOCK.u), Y(LOCK.y), 0.022 * pxm, 0, TAU); g.fill(); g.fillStyle = '#1A1C1E'; g.fillRect(X(LOCK.u) - 0.003 * pxm, Y(LOCK.y + 0.012), 0.006 * pxm, 0.024 * pxm);
        if (pxm > 150 && pxm < 420) lockScratches(g, X(LOCK.u), Y(LOCK.y), pxm, 0.9, 'elev');
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
    function brickWall(g, x, y, w, h, pxm, u0) { g.save(); g.fillStyle = brickPattern(g, pxm); g.translate(x - (((u0 || 0) * pxm) % (0.225 * 8 * pxm)), y); g.fillRect(0, 0, w + 0.225 * 8 * pxm, h); g.restore(); }
    return { brickWall, LEN, EAVES, RIDGE: RIDGE0, TOP, PLINTH, PANEL, COLORS, ITEMS, ENTRANCE, NOTICE, LOCK, A, paintRaw, ctx, taper };
  })();

  // a sheet of exterior plywood: pale, its grain running long, its edges darker, screwed on at 15 cm; fresh, so it glows
  function paintPlywood(g, x, y, w, h, pxm, seed) {
    const C = MURAL.COLORS, R = OTM.rng('ply' + seed);
    g.fillStyle = C.ply; g.fillRect(x, y, w, h);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    for (let i = 0; i < Math.max(10, h / 6); i++) { const yy = y + R() * h, a = 0.05 + R() * 0.12; g.strokeStyle = R() > 0.5 ? rgba(C.plyDark, a) : rgba(C.plyLight, a); g.lineWidth = Math.max(0.6, (0.002 + R() * 0.006) * pxm);
      g.beginPath(); g.moveTo(x - 4, yy); g.bezierCurveTo(x + w * 0.3, yy + (R() - 0.5) * 0.04 * pxm, x + w * 0.7, yy + (R() - 0.5) * 0.04 * pxm, x + w + 4, yy + (R() - 0.5) * 0.02 * pxm); g.stroke(); }
    if (pxm > 150) for (let i = 0; i < 4; i++) { const cx = x + (0.15 + R() * 0.7) * w, cy = y + R() * h, len = (0.25 + R() * 0.35) * pxm, dir = R() > 0.5 ? 1 : -1;
      for (let k = 0; k < 6; k++) { const ww = (0.012 + k * 0.012) * pxm; g.strokeStyle = rgba(k % 2 ? C.plyDark : '#B08454', 0.16); g.lineWidth = Math.max(0.6, 0.0035 * pxm);
        g.beginPath(); g.moveTo(cx - len * dir, cy - ww); g.quadraticCurveTo(cx + len * 0.4 * dir, cy - ww, cx + len * 0.55 * dir, cy); g.quadraticCurveTo(cx + len * 0.4 * dir, cy + ww, cx - len * dir, cy + ww); g.stroke(); } }
    for (let i = 0; i < 3; i++) { const cx = x + R() * w, cy = y + R() * h, rx = (0.03 + R() * 0.04) * pxm; g.strokeStyle = rgba(C.plyDark, 0.25); g.lineWidth = Math.max(0.6, 0.003 * pxm); for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(cx, cy, rx * (1 + k * 0.6), rx * 0.32 * (1 + k * 0.6), 0, 0, TAU); g.stroke(); } }
    g.fillStyle = rgba(C.plyDark, 0.55); g.fillRect(x, y, w, Math.max(1, 0.006 * pxm)); g.fillRect(x, y + h - Math.max(1, 0.006 * pxm), w, Math.max(1, 0.006 * pxm)); g.fillRect(x, y, Math.max(1, 0.006 * pxm), h); g.fillRect(x + w - Math.max(1, 0.006 * pxm), y, Math.max(1, 0.006 * pxm), h);
    g.restore();
    const sr = Math.max(0.8, 0.007 * pxm); g.fillStyle = '#6E6A62';
    for (let yy = y + 0.04 * pxm; yy < y + h - 0.02 * pxm; yy += 0.15 * pxm) [x + 0.025 * pxm, x + w - 0.025 * pxm].forEach(xx => { g.beginPath(); g.arc(xx, yy, sr, 0, TAU); g.fill(); });
    for (let xx = x + 0.12 * pxm; xx < x + w - 0.08 * pxm; xx += 0.15 * pxm) [y + 0.025 * pxm, y + h - 0.025 * pxm].forEach(yy => { g.beginPath(); g.arc(xx, yy, sr, 0, TAU); g.fill(); });
  }

  // the whole wall, small (for reflections and distant views): u 0..32 m, y 0..3.3 m at 30 px/m
  const STRIP = { pxm: 30, y1: 3.3 };
  function muralStrip(c, tod) { return cache(c, 'mural|strip|' + tod, o => elevation(o, 0, MURAL.LEN, STRIP.pxm, tod, { ridge: 3.3, y1: STRIP.y1 }), MURAL.LEN * STRIP.pxm, Math.ceil(STRIP.y1 * STRIP.pxm)); }

  // the elevation under a light. 'morning': the north face in soft shade, true colours (Q06); 'evening': the low sun rakes the wall
  // from the west (screen-right) above a soft shade line, and everything is drained; 'dusk': the wall in its own shade, drained
  // further, the copper only on the roof's edge. Glass is laid in after the light (it reflects the sky; it is not lit).
  const LIGHTS = {
    morning: { sat: 0.1, shade: '#D9DEE2', lit: null, glass: [[0, '#C9D6DA'], [0.55, '#A9BAC0'], [1, '#6E7E84']] },
    evening: { sat: 0.5, shade: '#7E788C', lit: '#D6A688', line: [0.35, 1.05], glass: [[0, '#5A5868'], [0.5, '#8A6A62'], [0.62, '#C8845A'], [1, '#3A3034']] },
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
      anchors: (() => { const f = pr([1.0, 1.22, -0.5]), fe = pr([1.38, 0, -0.45]); return { face: [f[0], f[1]], k: F / f[2], feet: [fe[0], fe[1]], hinge: 1413, horizon: CY, sun: [SX, sunY(0)] }; })(),
      light: { x: SX - 40, y: sunY(0) - 110, color: DUSK.rim },
      lightAt(s) { const set = (s && s.set) || 0; return { x: SX - 40, y: sunY(set) - 110, color: DUSK.rim, k: C3.lightK(set) }; },
      at(s) { return Object.assign({}, view.anchors, { light: view.lightAt(s), open: th(s || {}) / CAR.MAXOPEN }); },
      // where the door's handle is at a given opening (for Daniel's hand)
      handleAt(s) { const h = CAR.DOOR.handle, q = geo(th(s || {})).dp((h.u0 + h.u1) / 2, (h.y0 + h.y1) / 2); return [q[0], q[1]]; },
      camera: cam,
    };
    return view;
  })();

  // ===============================================================================================================
  // THE NOTICE: the words are the screenplay's (A085), verbatim, printed on A4 and slipped into a punched plastic sleeve
  // ===============================================================================================================
  const NOTICE_TEXT = 'DUE TO VANDALISM OVERNIGHT, PLEASE USE THE SIDE ENTRANCE. TODAY ONLY.';
  const NOTICE_LINES = [['DUE TO', 'VANDALISM', 'OVERNIGHT,', 'PLEASE USE THE', 'SIDE ENTRANCE.'], ['TODAY ONLY.']];   // line breaks only; words untouched
  // the printed sheet in sheet space: (0,0) its top-left, w x h px. k: the paper's light (1 lit by the low sun, 0 in shade)
  function paintNoticeSheet(g, w, h, k) {
    g.fillStyle = mix('#BDB6B0', '#F2E8DA', k); g.fillRect(0, 0, w, h);
    g.fillStyle = LC.lin(g, 0, 0, w, 0, [[0, '#7A7684', 0.16], [0.6, '#7A7684', 0.04], [1, '#FFE0B8', 0.1 * k]]); g.fillRect(0, 0, w, h);
    const mw = w * 0.86, fam = '"Archivo"';
    g.save(); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = mix('#2A2828', '#1C1A18', k);
    let fs = 100; g.font = `700 ${fs}px ${fam}`; const widest = Math.max(...NOTICE_LINES[0].map(t => g.measureText(t).width)); fs = Math.floor(fs * mw / widest); g.font = `700 ${fs}px ${fam}`;
    const lead = fs * 1.12, block = NOTICE_LINES[0].length * lead + fs * 1.9; let y = (h - block) / 2 + fs * 0.92;
    NOTICE_LINES[0].forEach(t => { g.fillText(t, w / 2, y); y += lead; });
    y += fs * 0.55; const fs2 = Math.round(fs * 1.06); g.font = `700 ${fs2}px ${fam}`; g.fillText(NOTICE_LINES[1][0], w / 2, y);
    const tw = g.measureText(NOTICE_LINES[1][0]).width; g.fillRect(w / 2 - tw / 2, y + fs2 * 0.14, tw, Math.max(1, fs2 * 0.07));
    g.restore();
  }
  // the sleeve over it, in sleeve space (sw x sh px; the punched strip on the left). Drawn after the sheet.
  function paintSleeve(g, x, y, sw, sh, k, seed) {
    const R = OTM.rng('sleeve' + (seed || '')), strip = sw * 0.075;
    g.save(); g.globalCompositeOperation = 'screen';
    g.fillStyle = 'rgba(160,170,190,0.08)'; g.fillRect(x, y, sw, sh);
    g.fillStyle = LC.lin(g, x, y, x + sw, y + sh, [[0, '#B8C0D0', 0.0], [0.18, '#C8CCD8', 0.14], [0.3, '#B8C0D0', 0.03], [0.62, '#E8A878', 0.0], [0.78, '#F2B080', 0.1 * k], [0.86, '#F2B080', 0.02], [1, '#F2B080', 0]]); g.fillRect(x, y, sw, sh);
    g.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const yy = y + R() * sh, xx = x + strip + R() * (sw - strip) * 0.8, L = sw * (0.15 + R() * 0.35); g.strokeStyle = rgba(R() > 0.4 ? '#FFFFFF' : '#FFD8B0', 0.06 + R() * 0.1); g.lineWidth = 1 + R() * 2;
      g.beginPath(); g.moveTo(xx, yy); g.bezierCurveTo(xx + L * 0.3, yy + (R() - 0.5) * sh * 0.08, xx + L * 0.7, yy + (R() - 0.5) * sh * 0.08, xx + L, yy + (R() - 0.5) * sh * 0.04); g.stroke(); }
    g.restore();
    // the punched strip: a doubled edge and eleven holes through which the plywood shows
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x, y, strip, sh);
    g.strokeStyle = 'rgba(255,250,240,0.22)'; g.lineWidth = Math.max(1, sw * 0.003); g.beginPath(); g.moveTo(x + strip, y); g.lineTo(x + strip, y + sh); g.stroke();
    for (let i = 0; i < 11; i++) { const hy = y + sh * (0.06 + i * 0.088), hr = sw * 0.014; g.fillStyle = 'rgba(70,46,26,0.5)'; g.beginPath(); g.arc(x + strip * 0.45, hy, hr, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,240,220,0.3)'; g.lineWidth = Math.max(0.8, hr * 0.25); g.beginPath(); g.arc(x + strip * 0.45, hy, hr, Math.PI * 0.9, Math.PI * 1.7); g.stroke(); }
    g.strokeStyle = 'rgba(255,250,240,0.35)'; g.lineWidth = Math.max(1, sw * 0.004); g.strokeRect(x + 0.5, y + 0.5, sw - 1, sh - 1);
  }
  // clear packing tape across a corner: a pale glossy strip with a dirty edge
  function tape(g, cx, cy, len, wid, ang, k) {
    g.save(); g.translate(cx, cy); g.rotate(ang);
    g.fillStyle = rgba('#E8DCC4', 0.22 + 0.1 * k); g.fillRect(-len / 2, -wid / 2, len, wid);
    g.fillStyle = rgba('#FFFFFF', 0.18 * k + 0.05); g.fillRect(-len / 2, -wid / 2 + wid * 0.12, len, wid * 0.12);
    g.strokeStyle = 'rgba(80,60,40,0.25)'; g.lineWidth = 1.2; g.strokeRect(-len / 2, -wid / 2, len, wid);
    g.restore();
  }

  // fresh scratches round a lock cylinder at (x, y), s px per metre: a screwdriver slipping off the keyway again and again.
  // Short, mostly parallel gouges clustered at the cylinder, a scraped patch of bare metal, a few long slips; they catch the sun (k).
  function lockScratches(g, x, y, s, k, seed) {
    const R = OTM.rng('lockScr' + (seed || '')); g.save(); g.lineCap = 'round';
    // the scraped patch: the anodising worn through to bright metal round the keyway
    const pts = []; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = s * (0.02 + 0.014 * R()); pts.push([x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 1.6]); }
    g.fillStyle = rgba('#B4B8B8', 0.55 + 0.25 * k); g.fill(LC.smooth(pts));
    const stroke = (x0, y0, ang, len, w, bright) => { const bend = (R() - 0.5) * 0.25, x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len, mx = (x0 + x1) / 2 + Math.cos(ang + Math.PI / 2) * len * bend, my = (y0 + y1) / 2 + Math.sin(ang + Math.PI / 2) * len * bend;
      g.strokeStyle = 'rgba(12,14,16,0.55)'; g.lineWidth = w * 1.6; g.beginPath(); g.moveTo(x0 + 0.7, y0 + 0.9); g.quadraticCurveTo(mx + 0.7, my + 0.9, x1 + 0.7, y1 + 0.9); g.stroke();
      g.strokeStyle = rgba(bright, (0.5 + 0.45 * R()) * (0.35 + 0.65 * k)); g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx, my, x1, y1); g.stroke(); };
    for (let i = 0; i < 48; i++) { const r = s * 0.04 * Math.sqrt(R()), a = R() * TAU, x0 = x + Math.cos(a) * r * 0.8, y0 = y + Math.sin(a) * r * 1.6;
      const ang = (R() < 0.7 ? -1.05 : -1.5) + (R() - 0.5) * 0.5, len = s * (0.006 + R() * 0.022); stroke(x0, y0, ang, len, Math.max(0.7, s * (0.0008 + R() * 0.0012)), R() > 0.25 ? '#ECE8E0' : '#FFE4C0'); }
    for (let i = 0; i < 5; i++) { const x0 = x + (R() - 0.5) * s * 0.02, y0 = y + (R() - 0.3) * s * 0.03, ang = -1.2 + (R() - 0.5) * 0.7 + (R() > 0.5 ? Math.PI : 0), len = s * (0.04 + R() * 0.05); stroke(x0, y0, ang, len, Math.max(0.8, s * 0.0013), '#F2EEE6'); }
    g.restore();
  }

  // ===============================================================================================================
  // ENTRANCE · the main entrance square on from the car park (A082-A084). The elephant trumpets at the boarded door from the
  // east, the giraffe cranes over it from the west; the low sun rakes the wall from screen-right above the shade the far
  // trees throw, so the pavement and the foot of the wall are cool and dark while the plywood, the lock and the notice catch it.
  // state: { tod: 'evening' | 'dusk', reflect(g, a): Daniel in the sidelight's glass (a.side = its screen rect) }
  // anchors: stop (his feet when he stops, 1.1 m from the door), k (px/m there), ground(u, z) for anywhere in front of the wall
  // ===============================================================================================================
  const ENTR = (() => {
    const F = 1150, CX = 960, CY = 540, CAM = { x: 11.9, y: 1.5, z: -5.6 };
    const cam = mkCam({ x: CAM.x, y: CAM.y, z: CAM.z, yaw: 0.13, pitch: 0, f: F, cx: CX, cy: CY });
    const P = (u, y, z) => cam.proj(cam.cs(u, y, z)), Q = pts => cam.path(pts);
    const ground = (u, d) => { const q = cam.cs(u, 0, -d), p = cam.proj(q); return { x: p[0], y: p[1], k: F / q[2] }; };   // d: metres out from the wall
    const U0 = 7.2, U1 = 18.8, PXM = 260, e = MURAL.ENTRANCE, sd = e.side;
    const sideP = Q([[sd[0], 0.14, -0.002], [sd[1], 0.14, -0.002], [sd[1], 2.1, -0.002], [sd[0], 2.1, -0.002]]);
    const SIDE = (() => { const a = P(sd[0], 2.1, 0), b = P(sd[1], 0.14, 0); return { x: a[0], y: a[1], w: b[0] - a[0], h: b[1] - a[1] }; })();
    function back(g, tod, c) {
      const dusk = tod === 'dusk';
      // the southern sky over the roof: violet-teal, warmed from the west (screen-right)
      g.fillStyle = LC.lin(g, 0, 0, 0, 380, dusk ? [[0, '#1C2430'], [0.6, '#2E3242'], [1, '#4A4254']] : [[0, '#28303E'], [0.55, '#3A3D4E'], [1, '#5E5262']]); g.fillRect(0, 0, W, 420);
      g.fillStyle = LC.lin(g, 0, 0, W, 0, [[0, '#000000', 0], [0.55, '#E08A54', 0], [1, '#E8925A', dusk ? 0.12 : 0.3]]); g.fillRect(0, 0, W, 420);
      cloudStreaks(g, [[160, 66, 520, 4], [1040, 34, 640, 5], [640, 120, 300, 3], [1460, 98, 380, 3]], dusk ? 'rgba(170,110,100,0.22)' : 'rgba(214,140,100,0.34)', 'rgba(40,44,60,0.28)');
      // the roof slope, glimpsed above the eaves
      g.fillStyle = dusk ? '#24222A' : '#2E2A30'; g.fill(Q([[U0 - 6, 3.08, -0.4], [U1 + 8, 3.08, -0.4], [U1 + 8, 4.1, 3.6], [U0 - 6, 4.1, 3.6]]));
      // the wall, mapped in true perspective
      const ev = scratch('entElev2', Math.ceil((U1 - U0) * PXM), Math.ceil(2.9 * PXM)); elevation(ev, U0, U1, PXM, tod, { ridge: 3.25, y1: 2.9 });
      mapWall(g, cam, ev.canvas, U0, U1, 0, 2.9, PXM, 6);
      // the eaves: the soffit seen from below, the fascia board catching the last copper, the gutter
      g.fillStyle = '#1A1618'; g.fill(Q([[U0 - 6, 2.9, 0], [U1 + 8, 2.9, 0], [U1 + 8, 2.9, -0.38], [U0 - 6, 2.9, -0.38]]));
      g.fillStyle = dusk ? '#57525C' : '#6E6460'; g.fill(Q([[U0 - 6, 2.9, -0.38], [U1 + 8, 2.9, -0.38], [U1 + 8, 3.06, -0.38], [U0 - 6, 3.06, -0.38]]));
      if (!dusk) { g.fillStyle = 'rgba(232,150,92,0.32)'; g.fill(Q([[U0 - 6, 3.0, -0.385], [U1 + 8, 3.0, -0.385], [U1 + 8, 3.06, -0.385], [U0 - 6, 3.06, -0.385]])); }
      g.fillStyle = '#14161A'; g.fill(Q([[U0 - 6, 3.06, -0.4], [U1 + 8, 3.06, -0.4], [U1 + 8, 3.13, -0.45], [U0 - 6, 3.13, -0.45]]));
      // the canopy over the door: its underside, its fascia, its west end and lip catching the sun
      const cz = -0.9;
      g.fillStyle = '#1E1A1C'; g.fill(Q([[e.u0, 2.52, 0], [e.u1, 2.52, 0], [e.u1, 2.52, cz], [e.u0, 2.52, cz]]));
      g.fillStyle = dusk ? '#76707A' : '#A69888'; g.fill(Q([[e.u0, 2.52, cz], [e.u1, 2.52, cz], [e.u1, 2.7, cz], [e.u0, 2.7, cz]]));
      g.fillStyle = dusk ? '#4A4650' : '#C08A62'; g.fill(Q([[e.u1, 2.52, 0], [e.u1, 2.52, cz], [e.u1, 2.7, cz], [e.u1, 2.7, 0]]));
      g.fillStyle = '#1E2124'; g.fill(Q([[e.u0, 2.7, cz], [e.u1, 2.7, cz], [e.u1, 2.74, cz + 0.02], [e.u0, 2.74, cz + 0.02]]));
      // the sidelight gives back the car park behind us: the copper west, the far trees, his car alone, small and dark
      g.save(); g.clip(sideP);
      g.fillStyle = LC.lin(g, 0, SIDE.y, 0, SIDE.y + SIDE.h, dusk ? [[0, '#283040'], [0.42, '#5A4A58'], [0.47, '#8A5A4A'], [0.5, '#2A2428'], [1, '#18161A']] : [[0, '#363E4E'], [0.4, '#6E5658'], [0.46, '#C08050'], [0.49, '#3A2C2C'], [1, '#1E1A1C']]); g.fillRect(SIDE.x - 20, SIDE.y - 20, SIDE.w + 40, SIDE.h + 40);
      g.fillStyle = LC.lin(g, SIDE.x, 0, SIDE.x + SIDE.w, 0, [[0, '#000000', 0.15], [1, '#F0A060', dusk ? 0.05 : 0.2]]); g.fillRect(SIDE.x - 20, SIDE.y - 20, SIDE.w + 40, SIDE.h + 40);
      const hz = SIDE.y + SIDE.h * 0.48; g.fillStyle = '#1A1618'; g.fill(LC.smooth([[SIDE.x + SIDE.w * 0.28, hz + 6], [SIDE.x + SIDE.w * 0.3, hz - 3], [SIDE.x + SIDE.w * 0.52, hz - 5], [SIDE.x + SIDE.w * 0.62, hz + 6]]));
      g.fillStyle = rgba('#F0A060', dusk ? 0.2 : 0.6); g.fillRect(SIDE.x + SIDE.w * 0.3, hz - 4, SIDE.w * 0.24, 1.2);
      g.restore();
      // the ground in front: paving slabs, a kerb, the car park; all in the cool shade the far trees throw
      g.fillStyle = dusk ? '#38343F' : '#433E4B'; g.fill(Q([[U0 - 8, 0, 0], [U1 + 10, 0, 0], [U1 + 10, 0, -1.6], [U0 - 8, 0, -1.6]]));
      g.fillStyle = 'rgba(20,18,26,0.5)';
      for (let u = Math.floor(U0 - 8); u <= U1 + 10; u += 0.6) g.fill(Q([[u - 0.008, 0, 0], [u + 0.008, 0, 0], [u + 0.008, 0, -1.6], [u - 0.008, 0, -1.6]]));
      [0.6, 1.2].forEach(d => g.fill(Q([[U0 - 8, 0, -d + 0.008], [U1 + 10, 0, -d + 0.008], [U1 + 10, 0, -d - 0.008], [U0 - 8, 0, -d - 0.008]])));
      g.fillStyle = dusk ? '#55505E' : '#625A6A'; g.fill(Q([[U0 - 8, 0, -1.6], [U1 + 10, 0, -1.6], [U1 + 10, 0.1, -1.6], [U0 - 8, 0.1, -1.6]]));
      g.fillStyle = dusk ? '#22202A' : '#2A2630'; g.fill(Q([[U0 - 8, 0, -1.6], [U1 + 10, 0, -1.6], [U1 + 10, 0, -5.0], [U0 - 8, 0, -5.0]]));
      // the step to the door
      g.fillStyle = dusk ? '#5A5662' : '#6A6270'; g.fill(Q([[e.u0 + 0.1, 0.12, 0], [e.u1 - 0.1, 0.12, 0], [e.u1 - 0.1, 0.12, -0.4], [e.u0 + 0.1, 0.12, -0.4]]));
      g.fillStyle = dusk ? '#302C36' : '#38323E'; g.fill(Q([[e.u0 + 0.1, 0.12, -0.4], [e.u1 - 0.1, 0.12, -0.4], [e.u1 - 0.1, 0, -0.4], [e.u0 + 0.1, 0, -0.4]]));
      g.fillStyle = dusk ? '#3E3A46' : '#4A4452'; g.fill(Q([[e.u1 - 0.1, 0.12, 0], [e.u1 - 0.1, 0.12, -0.4], [e.u1 - 0.1, 0, -0.4], [e.u1 - 0.1, 0, 0]]));
      // where the shade gives out to the west, the low sun reaches the paving in long copper strips
      if (!dusk) { g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(214,132,84,0.15)';
        for (let i = 0; i < 7; i++) { const u = U1 - 1.6 + i * 0.62; g.fill(Q([[u, 0, -0.1], [u + 0.3, 0, -0.1], [u - 2.2, 0, -1.6], [u - 2.6, 0, -1.6]])); } g.restore(); }
      // the bottom band falls into deeper shade toward us
      g.fillStyle = LC.lin(g, 0, 880, 0, H, [[0, '#0C0E12', 0], [1, '#0C0E12', 0.55]]); g.fillRect(0, 880, W, H - 880);
    }
    const view = {
      back(c, t, s) {
        s = s || {}; const tod = s.tod === 'dusk' ? 'dusk' : 'evening';
        c.g.drawImage(cache(c, 'entr2|' + tod, o => back(o, tod, c)), 0, 0);
        if (s.reflect) reflectInto(c, s.reflect, view.at(s), sideP, 0.9, '#7E8A8E');
      },
      front(c, t, s) {
        s = s || {}; const g = c.g;
        LC.glare(g, sideP, { x: SIDE.x + SIDE.w / 2, y: SIDE.y + SIDE.h * 0.4, angle: -1.1, color: '#FFE2BC', bands: [{ d: -20, w: 30, a: 0.06 }, { d: 30, w: 8, a: 0.08 }] });
      },
      anchors: (() => { const st = ground(12.35, 1.1), d = P(12.5, 1.05, 0), n = P(MURAL.NOTICE.u, MURAL.NOTICE.y0 + MURAL.NOTICE.h / 2, 0), l = P(MURAL.LOCK.u, MURAL.LOCK.y, 0);
        return { stop: [st.x, st.y], k: st.k, door: d, notice: n, lock: l, side: SIDE, wallK: F / cam.cs(12.5, 0, 0)[2], horizon: CY }; })(),
      light: { x: 2500, y: 300, color: '#F2A468' },
      ground,
      at(s) { const a = Object.assign({}, view.anchors, { light: view.light }); a.reflection = { x: SIDE.x + SIDE.w * 0.5, y: SIDE.y + SIDE.h * 0.62, k: view.anchors.wallK * 0.42 }; return a; },
      camera: cam,
    };
    return view;
  })();

  // ===============================================================================================================
  // BOARDED · the door, close (A084): the plywood sheet screwed over the broken glass, fresh scratches scoring the lock, the
  // notice taped at eye level, the elephant's trunk raised at the left edge, the sidelight at the right
  // state: { tod, reflect(g, a): Daniel in the sidelight (a.side) }
  // ===============================================================================================================
  const BOARD = (() => {
    const F = 1150, D = 2.0, EYE = 1.55, UC = 12.12, CX = 960, CY = 540, K = F / D;
    const sx = u => CX + (u - UC) * K, sy = y => CY - (y - EYE) * K;
    const U0 = 10.3, U1 = 13.9, Y0 = 0.5, Y1 = 2.62;
    const sd = MURAL.ENTRANCE.side, SIDE = { x: sx(sd[0]), y: sy(2.1), w: (sd[1] - sd[0]) * K, h: 1.96 * K };
    const sideP = (() => { const p = new Path2D(); p.rect(SIDE.x, SIDE.y, SIDE.w, SIDE.h); return p; })();
    const N = MURAL.NOTICE, NR = { x: sx(N.u - N.w / 2), y: sy(N.y0 + N.h), w: N.w * K, h: N.h * K };
    const SL = { x: sx(N.u - N.w / 2) - (N.sleeve[0] - N.w) * K * 0.8, y: sy(N.y0 + N.h) - (N.sleeve[1] - N.h) * K * 0.35, w: N.sleeve[0] * K, h: N.sleeve[1] * K };
    function back(g, tod) {
      const dusk = tod === 'dusk', k = dusk ? 0.25 : 1;
      const ev = scratch('brdElev', Math.ceil((U1 - U0) * K), Math.ceil((Y1 - Y0) * K)); elevation(ev, U0, U1, K, tod, { ridge: 3.2, y0: Y0, y1: Y1 });
      g.drawImage(ev.canvas, sx(U0), sy(Y1));
      // the scratches: someone worked at the cylinder with a screwdriver; bare metal, catching the sun
      lockScratches(g, sx(MURAL.LOCK.u), sy(MURAL.LOCK.y), K, k, 'board');
      { const L = MURAL.LOCK, ex = sx(MURAL.ENTRANCE.door[1] - 0.12), ly = sy(L.y), R = OTM.rng('splinter'); g.strokeStyle = rgba('#F2DCB4', 0.7 * k + 0.2); g.lineCap = 'round';
        for (let i = 0; i < 7; i++) { const yy = ly - 22 + i * 7 + R() * 4; g.lineWidth = 1 + R() * 1.6; g.beginPath(); g.moveTo(ex - 1, yy); g.lineTo(ex - 6 - R() * 12, yy + (R() - 0.5) * 3); g.stroke(); } }
      // the sidelight: the car park behind us, his car small in it
      g.save(); g.clip(sideP);
      g.fillStyle = LC.lin(g, 0, SIDE.y, 0, SIDE.y + SIDE.h, dusk ? [[0, '#283040'], [0.3, '#5A4A58'], [0.36, '#8A5A4A'], [0.39, '#2A2428'], [1, '#18161A']] : [[0, '#3A4252'], [0.28, '#7A5E5E'], [0.35, '#D08A58'], [0.38, '#3A2C2C'], [1, '#1E1A1C']]); g.fillRect(SIDE.x, SIDE.y, SIDE.w, SIDE.h);
      g.fillStyle = LC.lin(g, SIDE.x, 0, SIDE.x + SIDE.w, 0, [[0, '#000000', 0.18], [1, '#F0A060', dusk ? 0.05 : 0.2]]); g.fillRect(SIDE.x, SIDE.y, SIDE.w, SIDE.h);
      const hz = SIDE.y + SIDE.h * 0.37; g.fillStyle = '#1E1A1E'; g.fill(LC.smooth([[SIDE.x + SIDE.w * 0.2, hz + 14], [SIDE.x + SIDE.w * 0.24, hz - 4], [SIDE.x + SIDE.w * 0.46, hz - 10], [SIDE.x + SIDE.w * 0.62, hz - 6], [SIDE.x + SIDE.w * 0.66, hz + 14]]));
      g.fillStyle = rgba('#F0A060', dusk ? 0.2 : 0.65); g.fillRect(SIDE.x + SIDE.w * 0.25, hz - 8, SIDE.w * 0.35, 2);
      g.restore();
      // the notice, taped at eye level in its sleeve
      g.save(); g.fillStyle = 'rgba(30,20,16,0.35)'; g.fill(LC.rrect(SL.x - 6, SL.y + 4, SL.w, SL.h, 3)); g.restore();
      g.save(); g.translate(NR.x, NR.y); paintNoticeSheet(g, NR.w, NR.h, k); g.restore();
      paintSleeve(g, SL.x, SL.y, SL.w, SL.h, k, 'board');
      tape(g, SL.x + 6, SL.y + 8, 64, 22, -0.75, k); tape(g, SL.x + SL.w - 6, SL.y + 8, 64, 22, 0.75, k); tape(g, SL.x + SL.w / 2, SL.y + SL.h - 4, 90, 22, 0.02, k);
      g.fillStyle = LC.lin(g, 0, 860, 0, H, [[0, '#0A0C10', 0], [1, '#0A0C10', 0.5]]); g.fillRect(0, 860, W, H - 860);
    }
    const view = {
      back(c, t, s) { s = s || {}; const tod = s.tod === 'dusk' ? 'dusk' : 'evening'; c.g.drawImage(cache(c, 'board|' + tod, o => back(o, tod)), 0, 0); if (s.reflect) reflectInto(c, s.reflect, view.at(s), sideP, 0.9, '#7E8A8E'); },
      front(c, t, s) { LC.glare(c.g, sideP, { x: SIDE.x + SIDE.w / 2, y: SIDE.y + SIDE.h * 0.4, angle: -1.1, color: '#FFE2BC', bands: [{ d: -30, w: 60, a: 0.05 }, { d: 50, w: 14, a: 0.07 }] }); },
      anchors: { lock: [sx(MURAL.LOCK.u), sy(MURAL.LOCK.y)], notice: [NR.x + NR.w / 2, NR.y + NR.h / 2], side: SIDE, k: K },
      light: { x: 2600, y: 260, color: '#F2A468' },
      at(s) { return Object.assign({}, view.anchors, { light: view.light, reflection: { x: SIDE.x + SIDE.w * 0.45, y: SIDE.y + SIDE.h * 0.55, k: K * 0.5 } }); },
    };
    return view;
  })();

  // ===============================================================================================================
  // NOTICE · the INSERT (A085-A087): the notice close, square on, verbatim, printed on paper in its sleeve on the plywood.
  // The low sun rakes it from the right. The sleeve's sheen can hold Daniel's face: he stands where the camera is, so his
  // reflection is centred, over the words, a faint dark head in a sheen of copper sky.
  // state: { tod, reflect(g, a): his face as the sleeve gives it back (a.face: centre, a.k: px/m; draw it front-on, lit
  //          from screen-right), sheen: 0..1 (how much sky the sleeve gives back, default 1), shadow: 0..1 (his shadow
  //          beside the notice on the plywood, from the left edge) }
  // ===============================================================================================================
  const NOTE = (() => {
    const K = 2500, CX = 960, CY = 540, N = MURAL.NOTICE;
    const SLW = N.sleeve[0] * K, SLH = N.sleeve[1] * K, PW = N.w * K, PH = N.h * K;
    const SL = { x: CX - SLW / 2 + 12, y: CY - SLH / 2 + 6, w: SLW, h: SLH };
    const PR = { x: SL.x + SLW * 0.1, y: SL.y + SLH * 0.035, w: PW, h: PH };
    const TILT = -0.022;
    const sleeveP = (() => { const p = new Path2D(), c = Math.cos(TILT), s2 = Math.sin(TILT), T = (x, y) => { const dx = x - CX, dy = y - CY; return [CX + dx * c - dy * s2, CY + dx * s2 + dy * c]; }; [[SL.x, SL.y], [SL.x + SL.w, SL.y], [SL.x + SL.w, SL.y + SL.h], [SL.x, SL.y + SL.h]].map(q => T(q[0], q[1])).forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath(); return p; })();                                 // taped up in a hurry: a degree and a bit off true
    function back(g, tod) {
      const dusk = tod === 'dusk', k = dusk ? 0.3 : 1, R = OTM.rng('ply-insert');
      // the plywood, huge at this distance: long grain, a cathedral figure, an irregular knot, the sun raking from the right
      g.fillStyle = mix('#6A5644', '#BE9464', k); g.fillRect(0, 0, W, H);
      for (let i = 0; i < 150; i++) { const y = R() * H, a = 0.04 + R() * 0.12; g.strokeStyle = R() > 0.5 ? rgba('#76522E', a) : rgba('#E2C08C', a * 0.8); g.lineWidth = 1 + R() * 4;
        g.beginPath(); g.moveTo(-20, y); g.bezierCurveTo(500, y + (R() - 0.5) * 40, 1300, y + (R() - 0.5) * 40, W + 20, y + (R() - 0.5) * 24); g.stroke(); }
      [[1540, 300, 1], [380, 760, -1], [1500, 880, 1]].forEach(([cx, cy, dir]) => { for (let j = 0; j < 9; j++) { const ww = 14 + j * 16, len = 520 + j * 30; g.strokeStyle = rgba(j % 2 ? '#6E4A28' : '#A47A4C', 0.14 + (j % 3) * 0.03); g.lineWidth = 3 + (j % 2) * 3;
        g.beginPath(); g.moveTo(cx - len * dir, cy - ww); g.quadraticCurveTo(cx + len * 0.35 * dir, cy - ww * 1.05, cx + len * 0.5 * dir, cy); g.quadraticCurveTo(cx + len * 0.35 * dir, cy + ww * 1.05, cx - len * dir, cy + ww); g.stroke(); } });
      { const cx = 250, cy = 470, n = OTM.rng('knot'); for (let r = 7; r >= 0; r--) { const pts = []; for (let a = 0; a < 24; a++) { const t = a / 24 * TAU, rr = (12 + r * 15) * (0.85 + 0.3 * n()); pts.push([cx + Math.cos(t) * rr * 2.4, cy + Math.sin(t) * rr * 0.8]); }
          g.strokeStyle = rgba('#6A4426', 0.08 + 0.02 * (7 - r)); g.lineWidth = 3.5; g.stroke(LC.smooth(pts)); }
        g.fillStyle = 'rgba(80,48,24,0.55)'; g.fill(LC.smooth([[cx - 26, cy], [cx - 8, cy - 9], [cx + 24, cy - 6], [cx + 30, cy + 3], [cx + 4, cy + 9], [cx - 20, cy + 6]])); }
      g.fillStyle = LC.lin(g, 0, 0, W, 0, [[0, '#28202E', 0.46], [0.5, '#28202E', 0.12], [1, '#FFC890', 0.14 * k]]); g.fillRect(0, 0, W, H);
      // the notice, a little off true
      g.save(); g.translate(CX, CY); g.rotate(TILT); g.translate(-CX, -CY);
      { const sh = scratch('noteSh'); sh.translate(CX, CY); sh.rotate(TILT); sh.translate(-CX, -CY); sh.fillStyle = 'rgba(28,18,14,0.6)'; sh.fillRect(SL.x - 26, SL.y + 12, SL.w, SL.h); sh.setTransform(1, 0, 0, 1, 0, 0); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(LC.blurred(sh.canvas, 12, false), 0, 0); g.restore(); }
      g.save(); g.translate(PR.x, PR.y); paintNoticeSheet(g, PR.w, PR.h, k * 0.86);
      // the sheet is not quite flat in its sleeve: a soft fall-off along its left edge, a gentle bulge low down, the sun on its right edge
      g.fillStyle = LC.lin(g, 0, 0, PR.w * 0.12, 0, [[0, '#2A2232', 0.2], [1, '#2A2232', 0]]); g.fillRect(0, 0, PR.w * 0.12, PR.h);
      g.fillStyle = LC.lin(g, PR.w * 0.9, 0, PR.w, 0, [[0, '#FFE6C4', 0], [1, '#FFE6C4', 0.16 * k]]); g.fillRect(PR.w * 0.9, 0, PR.w * 0.1, PR.h);
      g.fillStyle = LC.rad(g, PR.w * 0.55, PR.h * 0.86, 0, PR.w * 0.5, [[0, '#FFF4E4', 0.07 * k], [1, '#FFF4E4', 0]]); g.fillRect(0, PR.h * 0.6, PR.w, PR.h * 0.4);
      g.fillStyle = LC.lin(g, 0, PR.h * 0.93, 0, PR.h, [[0, '#2A2232', 0], [1, '#2A2232', 0.12]]); g.fillRect(0, PR.h * 0.93, PR.w, PR.h * 0.07);
      g.restore();
      paintSleeve(g, SL.x, SL.y, SL.w, SL.h, k, 'insert');
      g.restore();
      // the tape, pressed on over the sleeve's corners
      const T = (x, y) => { const c = Math.cos(TILT), s2 = Math.sin(TILT), dx = x - CX, dy = y - CY; return [CX + dx * c - dy * s2, CY + dx * s2 + dy * c]; };
      let q = T(SL.x + 20, SL.y + 28); tape(g, q[0], q[1], 230, 70, -0.72 + TILT, k); q = T(SL.x + SL.w - 20, SL.y + 28); tape(g, q[0], q[1], 230, 70, 0.72 + TILT, k); q = T(SL.x + SL.w / 2 + 10, SL.y + SL.h - 6); tape(g, q[0], q[1], 320, 72, 0.015 + TILT, k);
      g.fillStyle = LC.lin(g, 0, 860, 0, H, [[0, '#0E0C10', 0], [1, '#0E0C10', 0.45]]); g.fillRect(0, 860, W, H - 860);
    }
    // the sky the sleeve gives back, from where Daniel stands: violet-teal above, the copper west on the right
    function sheenSky(g, amount) {
      g.fillStyle = LC.lin(g, 0, SL.y, 0, SL.y + SL.h, [[0, '#3A4258'], [0.55, '#4E4654'], [1, '#1E1A20']]); g.fillRect(SL.x - 60, SL.y - 60, SL.w + 120, SL.h + 120);
      g.fillStyle = LC.lin(g, SL.x, 0, SL.x + SL.w, 0, [[0, '#000000', 0.4], [0.62, '#E8905A', 0.08], [1, '#F2A468', 0.4]]); g.fillRect(SL.x - 60, SL.y - 60, SL.w + 120, SL.h + 120);
      // the glare: the bright western sky, laid diagonally across the sleeve where it bends toward the light
      LC.glare(g, null, { x: CX + 40, y: CY - 70, angle: -0.62, color: '#FFE2C2', mode: 'source-over', bands: [{ d: -40, w: 380, a: 0.85 * amount, edge: 0.7 }, { d: 210, w: 40, a: 0.6 * amount }, { d: -290, w: 26, a: 0.35 * amount }] });
    }
    const view = {
      back(c, t, s) {
        s = s || {}; const g = c.g, tod = s.tod === 'dusk' ? 'dusk' : 'evening';
        g.drawImage(cache(c, 'note|' + tod, o => back(o, tod)), 0, 0);
        if (s.shadow) { const a = clamp(s.shadow, 0, 1); g.save(); g.globalAlpha = 0.55 * a; g.fillStyle = '#1A1220'; g.filter = 'none';
          const sh = cache(c, 'note|shadowShape', o => { o.fillStyle = '#000'; o.fill(LC.smooth([[-200, 1200], [-200, 260], [60, 200], [210, 160], [300, 60], [420, 40], [520, 120], [540, 300], [470, 420], [600, 520], [760, 760], [800, 1200]])); }, 900, 1300);
          g.drawImage(LC.blurred(sh, 0.1) && sh, -900 + 900 * a * 0.62, -60); g.restore(); }
        // the sleeve's sheen: the sky behind Daniel, and Daniel in it (front-on), laid over the words with a screen
        const sheen = clamp(s.sheen == null ? (s.reflect ? 1 : 0.2) : s.sheen, 0, 1);
        if (sheen > 0.001) {
          const m = g.getTransform(), r = scratch('noteRefl'); r.setTransform(m); sheenSky(r, sheen);
          if (s.reflect) s.reflect(r, view.at(s));
          r.setTransform(1, 0, 0, 1, 0, 0);
          g.save(); g.clip(sleeveP); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.28 + 0.6 * sheen; g.drawImage(r.canvas, 0, 0); g.restore();
        }
      },
      front(c, t, s) {
        s = s || {}; const g = c.g;
        LC.glare(g, sleeveP, { x: SL.x + SL.w * 0.2, y: SL.y + SL.h * 0.3, angle: -1.2, color: '#FFFFFF', bands: [{ d: -40, w: 120, a: 0.06 }, { d: 60, w: 18, a: 0.08 }, { d: 420, w: 160, a: 0.04 }] });
        LC.specks(g, sleeveP, SL, 'sleeveDust', { n: 160, color: '#FFF0DC', rMin: 0.6, rMax: 1.6, aMin: 0.05, aMax: 0.3, scratch: 0.35 });
      },
      anchors: { face: [CX + 6, CY - 30], k: 1050 / 0.84, sleeve: SL, paper: PR },
      light: { x: 2400, y: 400, color: '#F2A468' },
      at(s) { return Object.assign({}, view.anchors, { light: view.light }); },
      text: NOTICE_TEXT,
    };
    return view;
  })();

  // ===============================================================================================================
  // THE CAR'S RIGHT FLANK, closed, seen from outside (window, handle, remote/blink, car park). Car coordinates as CAR.
  // Profile points are (z, y) on the flank; the body side sits at x = 0.875, the glass leans in a little above the belt.
  // ===============================================================================================================
  const FLANK = (() => {
    const XB = 0.875, XG = y => 0.86 - Math.max(0, y - 0.99) * 0.25;   // the glass leans in toward the roof
    const side = [[1.98, 0.30], [2.01, 0.55], [1.96, 0.76], [1.6, 0.87], [0.95, 0.985], [-1.0, 1.0], [-1.84, 1.02], [-1.97, 0.92], [-2.0, 0.30], [-1.68, 0.26]]
      .concat(Array.from({ length: 13 }, (_, i) => { const a = Math.PI - i / 12 * Math.PI; return [-1.28 + Math.cos(a) * 0.38, 0.31 + Math.sin(a) * 0.38]; }))
      .concat([[-0.9, 0.24], [0.89, 0.24]])
      .concat(Array.from({ length: 13 }, (_, i) => { const a = Math.PI - i / 12 * Math.PI; return [1.27 + Math.cos(a) * 0.38, 0.31 + Math.sin(a) * 0.38]; }))
      .concat([[1.65, 0.26]]);
    const house = [[0.95, 0.985], [0.2, 1.44], [-1.45, 1.445], [-1.8, 1.32], [-1.86, 1.02], [-1.0, 1.0]];
    const glassF = [[0.9, 1.0], [0.24, 1.395], [-0.02, 1.405], [-0.02, 1.0]];
    // the rear door's glass: the same outline the open-door view uses (CAR.DOOR.glass), here closed
    const glassR = CAR.DOOR.glass.map(([u, y]) => [CAR.HINGE.z - u, y]);
    const sashR = CAR.DOOR.sash.map(([u, y]) => [CAR.HINGE.z - u, y]).concat([[CAR.HINGE.z, CAR.DOOR.sill], [CAR.HINGE.z, 1.425]]);
    const quarter = [[-0.99, 1.03], [-0.9, 1.25], [-1.36, 1.35], [-1.64, 1.04]];
    const rearDoorCut = [[CAR.HINGE.z - 0.005, 0.255], [CAR.HINGE.z - 0.005, 1.0]].concat(CAR.DOOR.panel.slice(1, 8).map(([u, y]) => [CAR.HINGE.z - u - 0.004, y]));
    const P3 = (z, y, glass) => [glass ? XG(y) : XB, y, z];
    const H_REAR = { z0: CAR.HINGE.z - CAR.DOOR.handle.u1, z1: CAR.HINGE.z - CAR.DOOR.handle.u0, y0: CAR.DOOR.handle.y0, y1: CAR.DOOR.handle.y1 };
    return { XB, XG, side, house, glassF, glassR, sashR, quarter, rearDoorCut, P3, H_REAR,
      tail: [[-1.97, 0.86], [-1.84, 1.0], [-1.72, 0.99], [-1.9, 0.82]], head: [[1.96, 0.74], [1.62, 0.84], [1.58, 0.78], [1.9, 0.68]],
      mirror: { z0: 0.8, z1: 0.98, y0: 0.99, y1: 1.13, x1: 1.06 } };
  })();
  // project a flank polygon given as (z, y) points
  const flankPath = (cam, pts, glass, dx) => { const P = pts.map(([z, y]) => { const q = FLANK.P3(z, y, glass); return [q[0] + (dx || 0), q[1], q[2]]; }); return cam.path ? cam.path(P) : LC.pathPts(P.map(q => cam.p(q[0], q[1], q[2]))); };
  const flankPt = (cam, z, y, glass) => { const q = FLANK.P3(z, y, glass); return cam.p(q[0], q[1], q[2]); };
  // the dusk sky a dark side window gives back: violet-teal, lighter low down, with the nursery's low roofline across its foot
  function reflectedDusk(g, box, o) {
    o = o || {}; const { x, y, w, h } = box, hz = y + h * (o.horizon == null ? 0.7 : o.horizon), bend = o.bend == null ? 14 : o.bend, curve = t => bend * Math.sin(t * Math.PI);
    g.fillStyle = LC.lin(g, 0, y - h * 0.2, 0, hz, [[0, '#283040'], [0.5, '#46485C'], [0.85, '#76606E'], [1, '#8A6A70']]); g.fillRect(x - 40, y - 40, w + 80, hz - y + 60);
    g.fillStyle = LC.lin(g, x, 0, x + w, 0, [[0, '#F0A060', o.west == null ? 0.3 : o.west], [0.45, '#F0A060', 0], [1, '#000000', 0]]); g.fillRect(x - 40, y - 40, w + 80, hz - y + 60);
    cloudStreaks(g, [[x + w * 0.1, y + h * 0.2, w * 0.5, 3], [x + w * 0.5, y + h * 0.34, w * 0.4, 2.5]], 'rgba(200,130,110,0.3)', 'rgba(30,34,48,0.25)');
    // the nursery, reversed in the glass and bowed by its curve: the roof, the fascia's copper line, the painted band, the pale plywood
    const top = [], ws = h * (o.wall == null ? 0.17 : o.wall); for (let i = 0; i <= 30; i++) { const t = i / 30; top.push([x - 20 + t * (w + 40), hz - ws - h * 0.05 - curve(t)]); }
    g.fillStyle = '#1E1C24'; g.fill(LC.pathPts(top.concat([[x + w + 40, y + h + 40], [x - 40, y + h + 40]])));
    const eave = top.map(([px, py]) => [px, py + h * 0.05]);
    g.strokeStyle = 'rgba(232,150,92,0.55)'; g.lineWidth = 1.5; g.beginPath(); eave.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke();
    g.fillStyle = '#4A3A3C'; g.fill(LC.pathPts(eave.concat(eave.slice().reverse().map(([px, py]) => [px, py + ws]))));
    const band = eave.map(([px, py]) => [px, py + ws * 0.18]), bandB = eave.map(([px, py]) => [px, py + ws * 0.86]);
    g.fillStyle = '#8A7470'; g.fill(LC.pathPts(band.concat(bandB.slice().reverse())));
    if (o.strip) { // the real wall, reversed (a mirror), squeezed into the band and bowed with the glass, slice by slice
      const img = o.strip, n = 40, span = o.span || [6, 22], sw = img.width, shh = img.height, uPx = STRIP.pxm;
      for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, u0 = lerp(span[1], span[0], t0), u1 = lerp(span[1], span[0], t1), X0 = x - 20 + t0 * (w + 40), X1 = x - 20 + t1 * (w + 40), py = eave[Math.round((t0 + t1) / 2 * 30)][1];
        g.save(); g.translate(X1, py); g.scale(-1, 1); g.globalAlpha = 0.72; g.drawImage(img, u1 * uPx, 0, (u0 - u1) * uPx, shh, 0, -ws * 0.02, X1 - X0 + 0.8, ws * 1.08); g.restore(); }
      g.fillStyle = 'rgba(30,26,34,0.35)'; g.fill(LC.pathPts(eave.concat(eave.slice().reverse().map(([px, py]) => [px, py + ws]))));
    } else if (o.mural !== false) { const cols = ['#6E5AA0', '#4F80C2', '#DB8A45', '#E58397', '#2C78A4', '#F0EBDF', '#E07A3C'], R = OTM.rng('reflMural');
      for (let i = 0; i < 9; i++) { const t = 0.05 + i * 0.11 + R() * 0.03, px = x - 20 + t * (w + 40), py = eave[Math.round(t * 30)][1] + ws * 0.52; g.fillStyle = rgba(mix(cols[i % cols.length], '#7A6A70', 0.6), 0.5); g.beginPath(); g.ellipse(px, py, w * 0.03, ws * 0.26, 0, 0, TAU); g.fill(); } }
    if (o.door != null && !o.strip) { const t = o.door, px = x - 20 + t * (w + 40), py = eave[Math.round(t * 30)][1]; g.fillStyle = '#2A2830'; g.fillRect(px - w * 0.024, py + ws * 0.12, w * 0.048, ws * 0.88); g.fillStyle = 'rgba(214,170,120,0.85)'; g.fillRect(px - w * 0.016, py + ws * 0.2, w * 0.03, ws * 0.72); }
    g.fillStyle = LC.lin(g, 0, hz - h * 0.04, 0, y + h, [[0, '#2A2228'], [1, '#141016']]); g.fill(LC.pathPts(bandB.map(([px, py]) => [px, py + ws * 0.16]).concat([[x + w + 40, y + h + 40], [x - 40, y + h + 40]])));
  }

  // ===============================================================================================================
  // WINDOW · the dark rear passenger window (A099): from where he stands he can see only his own reflection, the dusk sky
  // behind him. The glass is a pure black mirror; what is behind it is never drawn, anywhere.
  // state: { tod: 'dusk', reflect(g, a): Daniel as the glass gives him back (front-on; a.reflection: his feet, a.rk: px/m),
  //          dist: how far he stands from the car in metres (default 7; his reflection grows as he comes closer) }
  // ===============================================================================================================
  const WINV = (() => {
    const F = 1500, CX = 960, CY = 540;
    const cam = mkCam({ x: 1.88, y: 1.27, z: -0.74, yaw: -1.35, pitch: -0.06, f: F, cx: CX, cy: CY + 40 });
    const glassP = flankPath(cam, FLANK.glassR, true);
    const gpts = FLANK.glassR.map(([z, y]) => flankPt(cam, z, y, true));
    const GB = gpts.reduce((b, q) => ({ x0: Math.min(b.x0, q[0]), y0: Math.min(b.y0, q[1]), x1: Math.max(b.x1, q[0]), y1: Math.max(b.y1, q[1]) }), { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 });
    const GBOX = { x: GB.x0, y: GB.y0, w: GB.x1 - GB.x0, h: GB.y1 - GB.y0 };
    function world(g, c) {
      // beyond the car: the northern sky, and to the left behind the car's rear the low sun's copper
      g.fillStyle = LC.lin(g, 0, 0, 0, H, [[0, '#222A38'], [0.45, '#3E3C4E'], [0.75, '#6A5258'], [1, '#2A2226']]); g.fillRect(0, 0, W, H);
      sunGlow(g, -160, 430, 1, 1500);
      // the body: the rear door, the front door's tail, the rear quarter, the roof's edge
      const body = flankPath(cam, FLANK.side, false), house = flankPath(cam, FLANK.house, true);
      g.fillStyle = '#121A1D'; g.fill(body);
      g.fillStyle = '#0E1416'; g.fill(house);
      // the shoulder gives back the eastern sky; the crease; the lower door the dark tarmac
      g.save(); g.clip(body);
      const c0 = flankPt(cam, 0, 0.985), c1 = flankPt(cam, 0, 0.82);
      [0.62, 0.42, 0.24, 0.1].forEach((a, i) => { g.fillStyle = rgba('#4A5266', a); g.fill(LC.pathPts([flankPt(cam, 2.2, 0.985 - 0.04 * i), flankPt(cam, -2.2, 0.985 - 0.04 * i), flankPt(cam, -2.2, 0.985 - 0.04 * (i + 1)), flankPt(cam, 2.2, 0.985 - 0.04 * (i + 1))])); });
      g.strokeStyle = 'rgba(118,128,150,0.45)'; g.lineWidth = 2; const k0 = flankPt(cam, 2.2, 0.885), k1 = flankPt(cam, -2.2, 0.885); g.beginPath(); g.moveTo(k0[0], k0[1]); g.lineTo(k1[0], k1[1]); g.stroke();
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill(LC.pathPts([flankPt(cam, 2.2, 0.88), flankPt(cam, -2.2, 0.88), flankPt(cam, -2.2, 0.86), flankPt(cam, 2.2, 0.86)]));
      g.fillStyle = LC.lin(g, 0, flankPt(cam, 0, 0.6)[1], 0, H, [[0, '#000000', 0], [1, '#000000', 0.45]]); g.fillRect(0, flankPt(cam, 0, 0.6)[1], W, H);
      // the copper the sun lays along the top edges that face it (the car's rear is to our left, toward the sun)
      g.strokeStyle = 'rgba(232,150,92,0.7)'; g.lineWidth = 3; const t0 = flankPt(cam, -2.0, 0.99), t1 = flankPt(cam, -1.0, 1.0); g.beginPath(); g.moveTo(t0[0], t0[1] - 2); g.lineTo(t1[0], t1[1] - 2); g.stroke();
      g.restore();
      // door cuts, the B-pillar, the rear door's sash, the quarter glass, the handle
      g.strokeStyle = 'rgba(4,6,8,0.85)'; g.lineWidth = 2.5; g.stroke(flankPath(cam, FLANK.rearDoorCut, false));
      g.strokeStyle = 'rgba(4,6,8,0.85)'; const fc = [flankPt(cam, -0.06, 0.25), flankPt(cam, -0.06, 0.99)]; g.beginPath(); g.moveTo(fc[0][0], fc[0][1]); g.lineTo(fc[1][0], fc[1][1]); g.stroke();
      g.fillStyle = '#06080A'; g.fill(flankPath(cam, FLANK.sashR, true));
      g.fillStyle = '#080B0D'; g.fill(flankPath(cam, [[-0.02, 1.0], [-0.02, 1.41], [-0.13, 1.41], [-0.13, 1.0]], true));
      g.fillStyle = '#0A0D10'; g.fill(flankPath(cam, FLANK.quarter, true));
      { const h = FLANK.H_REAR; g.fillStyle = '#1A2226'; g.fill(flankPath(cam, [[h.z0, h.y0], [h.z1, h.y0], [h.z1, h.y1], [h.z0, h.y1]], false)); g.strokeStyle = 'rgba(240,170,110,0.5)'; g.lineWidth = 2; const a = flankPt(cam, h.z0 + 0.01, h.y1 - 0.003), b = flankPt(cam, h.z1 - 0.01, h.y1 - 0.003); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
      // the roof's edge, catching the copper toward the rear
      g.strokeStyle = 'rgba(232,150,92,0.55)'; g.lineWidth = 2.5; const r0 = flankPt(cam, -1.8, 1.32, true), r1 = flankPt(cam, -1.45, 1.445, true), r2 = flankPt(cam, 0.2, 1.44, true); g.beginPath(); g.moveTo(r0[0], r0[1]); g.lineTo(r1[0], r1[1]); g.lineTo(r2[0], r2[1]); g.stroke();
      // the black glass: a mirror. The sky behind Daniel, the nursery low and reversed across its foot
      g.fillStyle = '#05080A'; g.fill(glassP);
      // one continuous mirror-world across all three panes (the wall runs on from glass to glass)
      const r = scratch('winRefl'); reflectedDusk(r, { x: 0, y: GBOX.y, w: W, h: GBOX.h }, { horizon: 0.84, west: 0.3, strip: muralStrip(c, 'evening'), span: [1, 25], wall: 0.2, bend: 10 });
      r.globalCompositeOperation = 'multiply'; r.fillStyle = '#B8C8CC'; r.fillRect(0, 0, W, H); r.globalCompositeOperation = 'source-over';
      g.save(); g.clip(glassP); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.55; g.drawImage(r.canvas, 0, 0); g.restore();
      [[FLANK.quarter, 0.42], [FLANK.glassF, 0.48]].forEach(([poly, a]) => { const pp = flankPath(cam, poly, true); g.fillStyle = '#05080A'; g.fill(pp); g.save(); g.clip(pp); g.globalCompositeOperation = 'screen'; g.globalAlpha = a; g.drawImage(r.canvas, 0, 0); g.restore(); });
      g.fillStyle = '#080B0D'; g.fill(flankPath(cam, [[-0.02, 1.0], [-0.02, 1.41], [-0.13, 1.41], [-0.13, 1.0]], true));
      // the bottom band: the lower door falls into the dark
      g.fillStyle = LC.lin(g, 0, 860, 0, H, [[0, '#06080A', 0], [1, '#06080A', 0.6]]); g.fillRect(0, 860, W, H - 860);
    }
    // the pane's own artefacts over whatever it reflects: a glare streak, dust, the privacy tint's cold sheen
    function pane(g) {
      LC.glare(g, glassP, { x: GBOX.x + GBOX.w * 0.35, y: GBOX.y + GBOX.h * 0.4, angle: -1.15, color: '#E8ECF2', bands: [{ d: -90, w: 70, a: 0.04 }, { d: -30, w: 12, a: 0.06 }, { d: 260, w: 120, a: 0.03 }] });
      LC.specks(g, glassP, GBOX, 'winDust', { n: 90, color: '#E8DCD0', rMin: 0.5, rMax: 1.0, aMin: 0.02, aMax: 0.08, scratch: 0, near: { x: GBOX.x, y: GBOX.y + GBOX.h, r: 700 } });
    }
    const view = {
      back(c, t, s) {
        s = s || {}; const g = c.g; g.drawImage(cache(c, 'win|dusk', o => world(o, c)), 0, 0);
        if (s.reflect) reflectInto(c, s.reflect, view.at(s), glassP, 0.92, '#6E7C82');
        g.drawImage(cache(c, 'win|pane', pane), 0, 0);
      },
      front(c, t, s) { },
      anchors: { glass: GBOX, horizon: CY },
      light: { x: -400, y: 520, color: '#E89A5E' },
      // where his reflection stands for a distance d (m) from the car: feet point and px per metre (he is centred in the glass)
      at(s) {
        const d = (s && s.dist) || 7, rk = F / (1.4 + d), fx = GBOX.x + GBOX.w * 0.52, fy = GBOX.y + GBOX.h * 0.86 + 1.3 * rk * 0.55;
        return Object.assign({}, view.anchors, { reflection: { x: fx, y: fy, k: rk }, rk, dist: d, light: { x: fx - 600, y: fy - 1.2 * rk, color: '#E89A5E' } });
      },
      path: glassP,
    };
    return view;
  })();

  // ===============================================================================================================
  // HANDLE · the rear door's handle, close (A102): LOCKED, he yanks it. The dark glass above holds his reflection, near.
  // Layers: back() = the door, the handle's recess, the glass and his reflection; the sequence draws his hand (its fingers
  // go into the recess); front() = the pull bar over the fingers. state: { pull: 0..1 (the bar drawn out; it gives,
  // the door does not), jolt: 0..1 (the car's small shudder as the lock holds), reflect(g, a): him in the glass (a.reflection:
  // his chin at the glass's foot, a.k px/m; front-on, chest and face) }
  // ===============================================================================================================
  const HANDLEV = (() => {
    const F = 1500, CX = 960, CY = 540;
    const cam = mkCam({ x: 1.42, y: 1.03, z: -0.6, yaw: -1.78, pitch: 0.0, f: F, cx: CX, cy: CY + 60 });
    const hr = FLANK.H_REAR, hp = (z, y, dx) => cam.p(FLANK.XB + (dx || 0), y, z);
    const glassP = flankPath(cam, FLANK.glassR, true);
    const recessQ = (() => { const pts = []; for (let i = 0; i <= 28; i++) { const a = i / 28 * TAU, cz = (hr.z0 + hr.z1) / 2, cy = (hr.y0 + hr.y1) / 2 - 0.004, rz = (hr.z1 - hr.z0) / 2 + 0.012, ry = 0.034; pts.push(hp(cz + rz * Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 0.3), cy + ry * Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), 0.6), -0.004)); } return LC.pathPts(pts); })();
    function door(g, c) {
      g.fillStyle = LC.lin(g, 0, 0, 0, H, [[0, '#2A3038'], [1, '#14181C']]); g.fillRect(0, 0, W, H);
      const body = flankPath(cam, FLANK.side, false);
      g.fillStyle = '#121A1D'; g.fill(body);
      g.save(); g.clip(body);
      [0.62, 0.44, 0.27, 0.12].forEach((a, i) => { g.fillStyle = rgba('#4A5266', a); g.fill(LC.pathPts([hp(0.5, 0.985 - 0.035 * i), hp(-2.2, 0.985 - 0.035 * i), hp(-2.2, 0.985 - 0.035 * (i + 1)), hp(0.5, 0.985 - 0.035 * (i + 1))])); });
      const k0 = hp(0.5, 0.885), k1 = hp(-2.2, 0.885); g.strokeStyle = 'rgba(118,128,150,0.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(k0[0], k0[1]); g.lineTo(k1[0], k1[1]); g.stroke();
      g.fillStyle = 'rgba(0,0,0,0.36)'; g.fill(LC.pathPts([hp(0.5, 0.88), hp(-2.2, 0.88), hp(-2.2, 0.855), hp(0.5, 0.855)]));
      g.strokeStyle = 'rgba(232,150,92,0.5)'; g.lineWidth = 2.5; const t0 = hp(-2.2, 0.98), t1 = hp(0.5, 0.98); g.beginPath(); g.moveTo(t0[0], t0[1]); g.lineTo(t1[0], t1[1]); g.stroke();
      g.fillStyle = LC.lin(g, 0, hp(0, 0.7)[1], 0, H, [[0, '#000000', 0], [1, '#000000', 0.5]]); g.fillRect(0, hp(0, 0.7)[1], W, H);
      g.restore();
      g.strokeStyle = 'rgba(4,6,8,0.9)'; g.lineWidth = 3; g.stroke(flankPath(cam, FLANK.rearDoorCut, false));
      // the rubber at the glass's foot, the sash
      g.fillStyle = '#06080A'; g.fill(flankPath(cam, FLANK.sashR, true));
      g.fillStyle = '#05080A'; g.fill(glassP);
      const r = scratch('hdlRefl'); const gb = flankPt(cam, -0.5, 1.0, true); reflectedDusk(r, { x: 0, y: gb[1] - 640, w: W, h: 700 }, { horizon: 0.86, west: 0.28, strip: muralStrip(c, 'evening'), span: [2, 26], wall: 0.16, bend: 8 });
      r.globalCompositeOperation = 'multiply'; r.fillStyle = '#B8C8CC'; r.fillRect(0, 0, W, H); r.globalCompositeOperation = 'source-over';
      g.save(); g.clip(glassP); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.5; g.drawImage(r.canvas, 0, 0); g.restore();
      // the recess the fingers go into: dark, a lip of light along its top
      g.fillStyle = '#05070A'; g.fill(recessQ);
      g.fillStyle = LC.lin(g, 0, hp(0, hr.y1 + 0.02)[1], 0, hp(0, hr.y0 - 0.02)[1], [[0, '#000000', 0.6], [1, '#000000', 0]]); g.fill(recessQ);
      g.fillStyle = LC.lin(g, 0, H - 200, 0, H, [[0, '#06080A', 0], [1, '#06080A', 0.55]]); g.fillRect(0, H - 200, W, 200);
    }
    function pane(g) { LC.glare(g, glassP, { x: 900, y: 300, angle: -1.15, color: '#E8ECF2', bands: [{ d: -60, w: 60, a: 0.04 }, { d: -10, w: 10, a: 0.06 }] }); }
    const shake = s => { const j = clamp((s && s.jolt) || 0, 0, 1); return [Math.sin(j * 31) * 3.2 * j, Math.cos(j * 23) * 1.6 * j]; };
    const view = {
      back(c, t, s) {
        s = s || {}; const g = c.g, d = shake(s);
        g.save(); g.translate(d[0], d[1]);
        g.drawImage(cache(c, 'hdl|door', o => door(o, c)), 0, 0);
        if (s.reflect) reflectInto(c, s.reflect, view.at(s), glassP, 0.92, '#6E7C82');
        g.drawImage(cache(c, 'hdl|pane', pane), 0, 0);
        g.restore();
      },
      // the pull bar: body-coloured, its top lip catching the copper; drawn out from the door by `pull`
      front(c, t, s) {
        s = s || {}; const g = c.g, d = shake(s), pl = clamp(s.pull || 0, 0, 1), out = 0.028 * pl;
        g.save(); g.translate(d[0], d[1]);
        const bar = LC.rquad([hp(hr.z1, hr.y1, out * 0.4), hp(hr.z0, hr.y1, out), hp(hr.z0, hr.y0, out), hp(hr.z1, hr.y0, out * 0.4)], 10);
        if (pl > 0) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fill(LC.rquad([hp(hr.z1, hr.y0 + 0.004, 0), hp(hr.z0, hr.y0 + 0.004, 0), hp(hr.z0, hr.y0 - 0.006, 0), hp(hr.z1, hr.y0 - 0.006, 0)], 4)); }
        g.save(); g.translate(-6, 7); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fill(bar); g.restore();
        g.fillStyle = '#10171A'; g.fill(bar);
        g.save(); g.clip(bar); g.fillStyle = LC.lin(g, 0, hp(0, hr.y1, out)[1], 0, hp(0, hr.y0, out)[1], [[0, '#4A5266', 0.4], [0.16, '#4A5266', 0.1], [0.4, '#1A2226', 0], [1, '#05080A', 0.55]]); g.fillRect(0, 0, W, H); g.restore();
        g.strokeStyle = 'rgba(240,170,110,0.75)'; g.lineWidth = 2.5; const a = hp(hr.z1 - 0.012, hr.y1 - 0.002, out * 0.4), b = hp(hr.z0 + 0.012, hr.y1 - 0.002, out); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        g.restore();
      },
      anchors: (() => { const h = hp((hr.z0 + hr.z1) / 2, (hr.y0 + hr.y1) / 2), gb = flankPt(cam, -0.62, 1.0, true); return { handle: [h[0], h[1]], k: F / 0.58, glassFoot: [gb[0], gb[1]] }; })(),
      light: { x: -500, y: 300, color: '#E89A5E' },
      at(s) { const a = Object.assign({}, view.anchors, { light: view.light }); a.reflection = { x: a.glassFoot[0] - 40, y: a.glassFoot[1] - 60, k: F / 1.5 }; return a; },
      path: glassP,
    };
    return view;
  })();

  // ===============================================================================================================
  // the whole hatchback, closed, from the right (car park and blink views): body side, glasshouse, glass that only
  // reflects (refl: a canvas of what the panes give back, laid in by screen), pillars, cuts, handles, mirror, lamps, wheels.
  // pal: { body, top, low, rim (copper edge colour), rimA, roofTop } — the light of the view.
  // ===============================================================================================================
  function drawHatch(g, cam, pal, refl, reflA) {
    const P3 = (x, y, z) => cam.p(x, y, z), poly = (pts, col) => { g.fillStyle = col; g.fill(cam.path ? cam.path(pts) : LC.pathPts(pts.map(q => P3(q[0], q[1], q[2])))); };
    // the roof's top and the bonnet's top, glimpsed from standing height; the far side's wheels in shadow beneath
    poly([[0.7, 1.455, 0.2], [0.7, 1.455, -1.45], [-0.7, 1.455, -1.45], [-0.7, 1.455, 0.2]], pal.roofTop || '#4A5264');
    poly([[0.84, 0.97, 0.95], [0.84, 0.78, 1.95], [-0.84, 0.78, 1.95], [-0.84, 0.97, 0.95]], pal.roofTop || '#3E4656');
    const body = flankPath(cam, FLANK.side, false), house = flankPath(cam, FLANK.house, true);
    g.fillStyle = pal.body || '#121A1D'; g.fill(body); g.fillStyle = '#0B0F11'; g.fill(house);
    g.save(); g.clip(body);
    const band = (y0, y1) => flankPath(cam, [[2.2, y0], [-2.2, y0], [-2.2, y1], [2.2, y1]], false);
    [0.6, 0.4, 0.22, 0.1].forEach((a, i) => { g.fillStyle = rgba(pal.top || '#4A5266', a); g.fill(band(0.985 - 0.04 * i, 0.985 - 0.04 * (i + 1))); });
    g.fillStyle = 'rgba(118,128,150,0.4)'; g.fill(band(0.888, 0.882));
    g.fillStyle = rgba(pal.low || '#000000', 0.35); g.fill(band(0.5, 0.1));
    if (pal.rimA) { g.fillStyle = rgba(pal.rim || '#E8965C', pal.rimA); g.fill(flankPath(cam, [[-2.0, 0.995], [1.6, 0.985], [1.6, 0.975], [-2.0, 0.985]], false)); }
    g.restore();
    // cuts and pillars, the sash, the handles
    g.strokeStyle = 'rgba(4,6,8,0.85)'; g.lineWidth = 1.6; g.stroke(flankPath(cam, FLANK.rearDoorCut, false));
    [[0.95, 0.25, 0.985], [-0.06, 0.25, 0.99]].forEach(([z, y0, y1]) => { if (cam.cs && cam.cs(FLANK.XB, y0, z)[2] < 0.1) return; const a = flankPt(cam, z, y0), b = flankPt(cam, z, y1); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); });
    // glass: the panes are dark mirrors; they give back `refl`, never what is behind them
    [[FLANK.glassF, 1], [FLANK.glassR, 1], [FLANK.quarter, 0.8]].forEach(([pts, a]) => { const pp = flankPath(cam, pts, true); g.fillStyle = '#05080A'; g.fill(pp); if (refl) { g.save(); g.clip(pp); g.globalCompositeOperation = 'screen'; g.globalAlpha = (reflA || 0.55) * a; g.drawImage(refl, 0, 0); g.restore(); } });
    g.fillStyle = '#06080A'; g.fill(flankPath(cam, [[-0.02, 1.0], [-0.02, 1.41], [-0.13, 1.41], [-0.13, 1.0]], true));
    [[0.27, 0.1], [FLANK.H_REAR.z1, FLANK.H_REAR.z0]].forEach(([z1, z0]) => { g.fillStyle = '#0E1416'; g.fill(flankPath(cam, [[z0, 0.888], [z1, 0.888], [z1, 0.922], [z0, 0.922]], false)); });
    if (pal.rimA) { g.fillStyle = rgba(pal.rim || '#E8965C', pal.rimA * 0.8); g.fill(flankPath(cam, [[-1.8, 1.32], [-1.45, 1.445], [0.2, 1.44], [0.2, 1.43], [-1.45, 1.435], [-1.8, 1.31]], true)); }
    // the tail lamp and the headlamp (their amber segments are lit separately: blinkLamps)
    g.fillStyle = '#3A1418'; g.fill(flankPath(cam, FLANK.tail, false)); g.fillStyle = '#1A1C20'; g.fill(flankPath(cam, FLANK.head, false));
    // the wing mirror: its back to the front, body-coloured
    { const m = FLANK.mirror; poly([[0.88, m.y0, m.z1], [m.x1, m.y0 + 0.02, m.z1 - 0.02], [m.x1, m.y1, m.z1 - 0.03], [0.88, m.y1, m.z1]], '#141C1F'); poly([[m.x1, m.y0 + 0.02, m.z1 - 0.02], [m.x1, m.y0 + 0.02, m.z0], [m.x1, m.y1, m.z0], [m.x1, m.y1, m.z1 - 0.03]], '#0E1416'); }
    // wheels: tyres, rims, a glint on each
    [1.27, -1.28].forEach(z => { if (cam.cs && cam.cs(0.9, 0.31, z)[2] < 0.4) return; const c0 = P3(0.9, 0.31, z), rx = Math.abs(P3(0.9, 0.31, z + 0.31)[0] - c0[0]), ry = Math.abs(P3(0.9, 0.62, z)[1] - c0[1]);
      g.fillStyle = '#08090B'; g.beginPath(); g.ellipse(c0[0], c0[1], Math.max(rx, ry * 0.15), ry, 0, 0, TAU); g.fill();
      g.fillStyle = '#20262A'; g.beginPath(); g.ellipse(c0[0], c0[1], Math.max(rx, ry * 0.15) * 0.64, ry * 0.64, 0, 0, TAU); g.fill();
      g.strokeStyle = '#0E1114'; g.lineWidth = Math.max(1.5, ry * 0.08); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.3; g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(c0[0] + Math.cos(a) * Math.max(rx, ry * 0.15) * 0.6, c0[1] + Math.sin(a) * ry * 0.6); g.stroke(); }
      if (pal.rimA) { g.strokeStyle = rgba(pal.rim || '#E8965C', 0.45 * pal.rimA); g.lineWidth = 1.5; g.beginPath(); g.ellipse(c0[0], c0[1], Math.max(rx, ry * 0.15) * 0.64, ry * 0.64, 0, Math.PI * 0.9, Math.PI * 1.4); g.stroke(); } });
  }
  // the indicators, lit (amber, 0..1): the segment in the tail lamp, the one in the headlamp, the repeater on the mirror; the
  // light they throw on the paint and the tarmac; and their bloom (emissive)
  function blinkLamps(c, cam, b, which) {
    if (b <= 0.01) return; const g = c.g, E = c.em, AMB = '#FFB040';
    const L = { tail: [[-1.985, 0.88], [-1.9, 0.98], [-1.86, 0.97], [-1.95, 0.86]], head: [[1.94, 0.73], [1.86, 0.76], [1.84, 0.72], [1.9, 0.7]], mirror: null };
    (which || ['tail', 'head', 'mirror']).forEach(k => {
      let pts, cen;
      if (k === 'mirror') { const m = FLANK.mirror; pts = [[m.x1 + 0.002, m.y0 + 0.03, m.z1 - 0.05], [m.x1 + 0.002, m.y0 + 0.03, m.z0 + 0.03], [m.x1 + 0.002, m.y0 + 0.05, m.z0 + 0.03], [m.x1 + 0.002, m.y0 + 0.05, m.z1 - 0.05]].map(q => cam.p(q[0], q[1], q[2])); }
      else pts = L[k].map(([z, y]) => flankPt(cam, z, y));
      cen = pts.reduce((a, q) => [a[0] + q[0] / pts.length, a[1] + q[1] / pts.length], [0, 0]); const d = cam.p(0.9, 0.9, k === 'tail' ? -1.95 : k === 'head' ? 1.9 : 0.9)[2], sc = 1300 / Math.max(0.5, d);
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, cen[0], cen[1], 0, 0.75 * sc, [[0, '#FFC050', 0.7 * b], [0.25, AMB, 0.32 * b], [1, '#E8902E', 0]]); g.fillRect(cen[0] - 0.75 * sc, cen[1] - 0.75 * sc, 1.5 * sc, 1.5 * sc);
      if (k === 'tail') { const gq = flankPt(cam, -1.9, 0.0); g.save(); g.translate(gq[0], gq[1]); g.scale(1, 0.25); g.fillStyle = LC.rad(g, 0, 0, 0, 0.9 * sc, [[0, AMB, 0.3 * b], [1, AMB, 0]]); g.fillRect(-0.9 * sc, -0.9 * sc, 1.8 * sc, 1.8 * sc); g.restore(); }
      g.restore();
      g.fillStyle = mix('#5A3010', '#FFE2A0', b); g.fill(LC.pathPts(pts));
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = rgba('#FFFFFF', 0.5 * b); g.beginPath(); g.arc(cen[0], cen[1], Math.max(2, 0.015 * sc), 0, TAU); g.fill(); g.restore();
      E.save(); E.globalAlpha = b; E.fillStyle = AMB; E.beginPath(); E.arc(cen[0], cen[1], Math.max(6, 0.06 * sc), 0, TAU); E.fill(); E.globalAlpha = 0.4 * b; E.beginPath(); E.arc(cen[0], cen[1], Math.max(12, 0.16 * sc), 0, TAU); E.fill(); E.restore();
    });
  }

  // ===============================================================================================================
  // BLINK · the remote, and the indicators blinking amber into the dusk (A103). We stand where Daniel stands, by the rear
  // door, and look back along the flank toward the low sun: the dark rear quarter, the tail lamp, the copper beyond.
  // state: { blink: 0..1 (the indicators' light: drive two pulses on the BEEP), focus: 0..1 (0 the car sharp; 1 the car soft
  //          behind his hand and the fob, in the foreground: anchors.remote) }
  // ===============================================================================================================
  const BLINKV = (() => {
    const F = 1300, CX = 960, CY = 540;
    const cam = mkCam({ x: 2.3, y: 1.4, z: 0.15, yaw: -2.66, pitch: -0.1, f: F, cx: CX, cy: CY });
    const sunDir = cam.p(0.5, 1.38 + 0.0, -400), SUN = [sunDir[0], sunDir[1] - 42];
    function world(g, c) {
      // the sky toward the sun, the far tree line, the copper tarmac and the car's long shadow coming at us
      const hz = sunDir[1];
      g.fillStyle = LC.lin(g, 0, 0, 0, hz, DUSK.sky); g.fillRect(0, 0, W, hz + 2);
      sunGlow(g, SUN[0], SUN[1], 1, 1000, [0, 0, W, hz + 2]);
      cloudStreaks(g, [[80, hz - 260, 620, 6], [900, hz - 330, 700, 5], [420, hz - 170, 360, 3]], 'rgba(214,140,96,0.4)', 'rgba(48,52,66,0.35)');
      g.fillStyle = DUSK.far; g.beginPath(); g.moveTo(-10, hz + 2); for (let x = -10; x <= W + 10; x += 12) g.lineTo(x, hz - 8 - OTM.fbm(x * 0.007, 4, 13, 3) * 34); g.lineTo(W + 10, hz + 2); g.closePath(); g.fill();
      g.fillStyle = LC.lin(g, 0, hz, 0, H, DUSK.tar); g.fillRect(0, hz, W, H - hz);
      g.save(); g.globalCompositeOperation = 'screen'; g.translate(SUN[0], hz); g.scale(1, 0.2); g.fillStyle = LC.rad(g, 0, 0, 0, 800, [[0, '#FFC27E', 0.6], [0.4, '#E89A5E', 0.18], [1, '#E89A5E', 0]]); g.fillRect(-900, -100, 1800, 3000); g.restore();
      // the car's shadow, long, from the sun behind it toward us
      { const sh = scratch('blkSh'); sh.fillStyle = DUSK.shadow; const pts = [[-2.0, 0, 0.9], [-2.0, 0, -0.9], [2.0, 0, -0.9], [2.0, 0, 0.9]].map(q => cam.p(q[0] === undefined ? 0 : q[2], 0, q[0]));
        const sp = [-2.0, 2.0].flatMap(z => [-0.9, 0.9].map(x => cam.p(x, 0, z))); const far = sp.map(q => [q[0] + (q[0] - SUN[0]) * 6, q[1] + (q[1] - hz) * 6]);
        sh.beginPath(); [sp[0], sp[1], far[1], far[3], sp[3], sp[2]].forEach((q, i) => i ? sh.lineTo(q[0], q[1]) : sh.moveTo(q[0], q[1])); sh.closePath(); sh.fill();
        sh.fill(LC.pathPts([cam.p(-0.9, 0, -2.0), cam.p(0.9, 0, -2.0), cam.p(0.9, 0, 2.0), cam.p(-0.9, 0, 2.0)]));
        g.save(); g.globalAlpha = 0.85; g.drawImage(LC.blurred(sh.canvas, 2, false), 0, 0); g.restore(); }
      // the car: contre-jour, the copper on every edge that faces the sun
      const r = scratch('blkRefl'); r.fillStyle = LC.lin(r, 0, 0, 0, H, [[0, '#3A3E52'], [0.6, '#C07A50'], [1, '#2A2226']]); r.fillRect(0, 0, W, H);
      drawHatch(g, cam, { body: '#0E1416', top: '#5A5260', low: '#000000', rim: '#F0A060', rimA: 0.9, roofTop: '#6A5A5C' }, r.canvas, 0.45);
      g.fillStyle = LC.lin(g, 0, 880, 0, H, [[0, '#0A0C10', 0], [1, '#0A0C10', 0.5]]); g.fillRect(0, 880, W, H - 880);
    }
    const view = {
      back(c, t, s) {
        s = s || {}; const g = c.g, fk = clamp(s.focus || 0, 0, 1);
        const sharp = cache(c, 'blink|world', o => world(o, c));
        if (fk < 0.999) g.drawImage(sharp, 0, 0);
        if (fk > 0.001) blit(g, cache(c, 'blink|soft', o => { o.drawImage(LC.blurred(sharp, 14), 0, 0); }), 0, 0, fk);
        const sq = Math.pow(1 - fk, 0.5) * 0.4 + 0.6;
        blinkLamps(c, cam, (s.blink || 0) * sq, ['tail', 'mirror']);
        const E = c.em; E.save(); E.beginPath(); E.rect(0, 0, W, sunDir[1]); E.clip(); E.fillStyle = '#FFD7A0'; E.beginPath(); E.arc(SUN[0], SUN[1], 54, 0, TAU); E.fill(); E.fillStyle = 'rgba(230,140,80,0.3)'; E.beginPath(); E.arc(SUN[0], SUN[1], 120, 0, TAU); E.fill(); E.restore();
        g.save(); g.beginPath(); g.rect(0, 0, W, sunDir[1] + 1); g.clip(); g.fillStyle = DUSK.sun; g.beginPath(); g.arc(SUN[0], SUN[1], 34, 0, TAU); g.fill(); g.fillStyle = DUSK.sunCore; g.beginPath(); g.arc(SUN[0], SUN[1], 23, 0, TAU); g.fill(); g.restore();
      },
      front(c, t, s) { },
      anchors: { remote: [1480, 820], remoteK: 2600, tail: (() => { const q = flankPt(cam, -1.93, 0.92); return [q[0], q[1]]; })(), sun: SUN, horizon: sunDir[1] },
      light: { x: SUN[0], y: SUN[1] - 80, color: DUSK.rim },
      at(s) { return Object.assign({}, view.anchors, { light: view.light }); },
    };
    return view;
  })();

  // ===============================================================================================================
  // CARPARK · the nursery car park, wide, from the entrance (Q11 68-84): his car alone, side on, its dark rear window
  // turned to us; the sun low behind its tail; the long shadow it lays across the empty tarmac. Daniel turns toward it,
  // and runs (anchors: ground(x, z) for any point on the tarmac; k there).
  // state: { tod: 'dusk' }
  // ===============================================================================================================
  const PARKV = (() => {
    const F = 1500, CX = 960, CY = 520;
    // world: the car at the origin (car coordinates), the camera on its right side, 10 m off, at eye height
    const cam = mkCam({ x: 10.5, y: 1.6, z: -0.8, yaw: -Math.PI / 2 + 0.06, pitch: -0.02, f: F, cx: CX, cy: CY });
    const SUN = [-700, cam.p(-300, 1.6, -0.8)[1] - 40];   // the sun stands off frame to the left (west), low behind the car's tail
    const groundAt = (x, z) => { const q = cam.p(x, 0, z); return { x: q[0], y: q[1], k: F / q[2] }; };
    const useCarSet = () => !!(window.SETS && SETS.car && typeof SETS.car.exterior === 'function');
    const skyOnly = (g, w) => { const b = w.box || w.pane; g.fillStyle = LC.lin(g, 0, b.y, 0, b.y + b.h, [[0, '#2A3242'], [0.6, '#4A4A5E'], [1, '#7A6270']]); g.fillRect(b.x - 20, b.y - 20, b.w + 40, b.h + 40);
      g.fillStyle = LC.lin(g, b.x, 0, b.x + b.w, 0, [[0, '#F0A060', 0.3], [0.55, '#F0A060', 0], [1, '#000000', 0]]); g.fillRect(b.x - 20, b.y - 20, b.w + 40, b.h + 40); };
    const carOpts = (blink, em) => ({ cam, at: [0, 0, 0], heading: 0, tod: 'dusk', sun: [-0.22, 0.05, -0.97], reflect: skyOnly, interior: false, indicators: blink || 0, em, rim: 0.8 });
    function world(g, c) {
      const hz = cam.p(-300, 1.6, -0.8)[1];
      g.fillStyle = LC.lin(g, 0, 0, 0, hz, [[0, '#1C2430'], [0.45, '#343A4C'], [0.78, '#5E5060'], [1, '#8A6460']]); g.fillRect(0, 0, W, hz + 2);
      sunGlow(g, -620, hz - 40, 0.9, 1700, [0, 0, W, hz + 2]);
      cloudStreaks(g, [[200, 150, 700, 6], [1100, 90, 600, 5], [700, 260, 420, 4], [1500, 230, 380, 3]], 'rgba(214,140,96,0.35)', 'rgba(40,44,58,0.3)');
      // beyond the car park: the street's low wall and railings, a lamp post, roofs and trees to the north
      g.fillStyle = '#2A2630'; g.beginPath(); g.moveTo(-10, hz + 2); for (let x = -10; x <= W + 10; x += 10) { const n = OTM.fbm(x * 0.004, 9, 31, 3); g.lineTo(x, hz - 30 - n * 60 - (x % 380 < 160 ? 26 : 0)); } g.lineTo(W + 10, hz + 2); g.closePath(); g.fill();
      rimCut(g, (() => { const p = new Path2D(); p.moveTo(-10, hz + 2); for (let x = -10; x <= W + 10; x += 10) { const n = OTM.fbm(x * 0.004, 9, 31, 3); p.lineTo(x, hz - 30 - n * 60 - (x % 380 < 160 ? 26 : 0)); } p.lineTo(W + 10, hz + 2); p.closePath(); return p; })(), '#C8845A', 2, 1.5, 0.5);
      const wq = groundAt(-14, 0); g.fillStyle = '#3A3238'; g.fillRect(0, wq.y - 0.9 * wq.k, W, 0.9 * wq.k + 2); g.fillStyle = 'rgba(232,150,92,0.35)'; g.fillRect(0, wq.y - 0.9 * wq.k, W, 2);
      g.fillStyle = '#1C1A20'; for (let z = -30; z < 30; z += 0.5) { const q = groundAt(-14, z); g.fillRect(q.x, q.y - 1.7 * q.k, Math.max(1, 0.03 * q.k), 0.8 * q.k); } const r0 = groundAt(-14, -30), r1 = groundAt(-14, 30); g.fillRect(0, r0.y - 1.72 * r0.k, W, Math.max(1, 0.04 * r0.k));
      { const q = groundAt(-12, 6); g.fillStyle = '#16141A'; g.fillRect(q.x - 0.06 * q.k, q.y - 5.5 * q.k, 0.12 * q.k, 5.5 * q.k); g.fillRect(q.x - 0.06 * q.k, q.y - 5.5 * q.k, 0.9 * q.k, 0.1 * q.k); }
      // the tarmac: copper toward the sun, cooling toward us; faded bay lines; long shadows of the posts and the car
      g.fillStyle = LC.lin(g, 0, hz, 0, H, [[0, '#B8784C'], [0.12, '#8A5A3E'], [0.4, '#5A4034'], [1, '#2A2224']]); g.fillRect(0, hz, W, H - hz);
      g.save(); g.globalCompositeOperation = 'screen'; g.translate(SUN[0], hz); g.scale(1, 0.18); g.fillStyle = LC.rad(g, 0, 0, 0, 900, [[0, '#FFC27E', 0.5], [0.4, '#E89A5E', 0.15], [1, '#E89A5E', 0]]); g.fillRect(-1000, -100, 2000, 4000); g.restore();
      g.strokeStyle = 'rgba(226,200,170,0.22)'; g.lineWidth = 2; for (let z = -9; z <= 9; z += 2.6) { const a = groundAt(-1.4, z), b = groundAt(-6.4, z); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
      { const sh = scratch('parkSh'); sh.fillStyle = DUSK.shadow;   // the sun low in the west: the car lays its shadow east along the tarmac, a little away from us
        if (!useCarSet()) sh.fill(cam.path([[0.86, 0, -1.7], [0.6, 0, 40], [-1.6, 0, 40], [-0.86, 0, -1.7]]));
        const lp = [-12, 6]; sh.fill(cam.path([[lp[0] + 0.06, 0, lp[1]], [lp[0] - 0.4, 0, lp[1] + 60], [lp[0] - 0.7, 0, lp[1] + 60], [lp[0] - 0.06, 0, lp[1]]]));
        g.save(); g.globalAlpha = 0.72; g.drawImage(LC.blurred(sh.canvas, 2, false), 0, 0); g.restore(); }
      // the car: in its own shade, the copper along its top edges, the glass giving back the violet sky and the nursery behind us
      // the car: the car set's model where it is loaded (one car for the whole film), else this set's own hatch. Its panes give
      // back only sky at this distance: no band that could read as anything inside.
      if (useCarSet()) SETS.car.exterior(g, carOpts(0));
      else { const r = scratch('parkRefl'), gy0 = cam.p(0.86, 1.41, 0)[1], gy1 = cam.p(0.86, 1.0, 0)[1]; r.fillStyle = LC.lin(r, 0, gy0, 0, gy1, [[0, '#2A3242'], [0.6, '#4A4A5E'], [1, '#7A6270']]); r.fillRect(0, 0, W, H);
        r.fillStyle = LC.lin(r, 0, 0, W, 0, [[0, '#F0A060', 0.3], [0.5, '#F0A060', 0], [1, '#000000', 0]]); r.fillRect(0, 0, W, H);
        drawHatch(g, cam, { body: '#141C1F', top: '#4A5266', low: '#000000', rim: '#F0A060', rimA: 0.75, roofTop: '#5A6070' }, r.canvas, 0.5); }
      g.fillStyle = LC.lin(g, 0, 860, 0, H, [[0, '#0C0C10', 0], [1, '#0C0C10', 0.55]]); g.fillRect(0, 860, W, H - 860);
    }
    const view = {
      back(c, t, s) { c.g.drawImage(cache(c, 'park|dusk', o => world(o, c)), 0, 0);
        const E = c.em, g = c.g; if (SUN[0] > -60) { E.save(); E.fillStyle = '#FFD7A0'; E.beginPath(); E.arc(SUN[0], SUN[1], 46, 0, TAU); E.fill(); E.restore(); g.save(); g.fillStyle = DUSK.sun; g.beginPath(); g.arc(SUN[0], SUN[1], 28, 0, TAU); g.fill(); g.restore(); }
        const b = (s && s.blink) || 0; if (b > 0.01) { if (useCarSet()) SETS.car.exterior(c.g, Object.assign(carOpts(b, c.em), { shadow: false })); else blinkLamps(c, cam, b, ['tail', 'head', 'mirror']); } },
      front(c, t, s) { },
      anchors: (() => { const d = groundAt(4.5, -0.4), w = flankPt(cam, -0.5, 1.2, true); return { daniel: [d.x, d.y], k: d.k, rearWindow: [w[0], w[1]], car: (() => { const q = groundAt(0.9, -0.5); return [q.x, q.y]; })(), sun: SUN }; })(),
      light: { x: SUN[0], y: SUN[1] - 60, color: DUSK.rim },
      ground: groundAt,
      at(s) { return Object.assign({}, view.anchors, { light: view.light }); },
    };
    return view;
  })();

  // ===============================================================================================================
  // the nursery's world for the wide exteriors. Metres: x = u along the street wall (east end 0, west end 32: screen-right
  // when you face the building), y up, z toward the building (the wall at z = 0, the car park and the street at z < 0).
  // The low sun stands west-north-west: toward +x, a little toward -z.
  // ===============================================================================================================
  // lay an elevation canvas (u0..u1, y0..y1, pxm) onto the wall plane z = zw through cam, in exact two-triangle strips
  function mapWall(g, cam, img, u0, u1, y0, y1, pxm, maxPx, zw) {
    maxPx = maxPx || 10; zw = zw || 0; const P = (u, y) => cam.proj(cam.cs(u, y, zw)), SH = (y1 - y0) * pxm;
    // adaptive strips: none wider than maxPx on screen, so the perspective inside each strip is negligible
    const us = [u0]; { let u = u0; const du = (u1 - u0) / 4000; let x0 = P(u0, y0)[0]; for (let i = 1; i <= 4000; i++) { u = u0 + du * i; const x = P(u, y0)[0]; if (Math.abs(x - x0) >= maxPx || i === 4000) { us.push(u); x0 = x; } } }
    // one quad per strip, overlapping the next by a pixel (no seams); the affine is exact on the strip's left edge and its top
    for (let i = 0; i < us.length - 1; i++) {
      const ua = us[i], ub = us[i + 1]; if (cam.cs(ua, y0, zw)[2] < 0.1 || cam.cs(ub, y0, zw)[2] < 0.1) continue;
      const X0 = (ua - u0) * pxm, X1 = (ub - u0) * pxm, tl = P(ua, y1), tr = P(ub, y1), bl = P(ua, y0), br = P(ub, y0), ov = 1.2;
      const ex = [(tr[0] - tl[0]) / (X1 - X0), (tr[1] - tl[1]) / (X1 - X0)], ey = [(bl[0] - tl[0]) / SH, (bl[1] - tl[1]) / SH];
      g.save(); g.beginPath(); g.moveTo(tl[0] - 0.3, tl[1] - 0.6); g.lineTo(tr[0] + ov, tr[1] - 0.6); g.lineTo(br[0] + ov, br[1] + 0.6); g.lineTo(bl[0] - 0.3, bl[1] + 0.6); g.closePath(); g.clip();
      g.transform(ex[0], ex[1], ey[0], ey[1], tl[0] - X0 * ex[0], tl[1] - X0 * ex[1]);
      const sx = Math.max(0, Math.floor(X0) - 2), sw = Math.min(img.width - sx, Math.ceil(X1 - X0) + 5); if (sw > 0) g.drawImage(img, sx, 0, sw, img.height, sx, 0, sw, img.height); g.restore();
    }
  }
  // the swing frame in 3D (as C3 draws it): an A-frame each end, a top bar, two chains and a seat for each swing
  function swingParts(x0, z0, len, top, ang) {
    // returns bars [[p, q, w], ...] in world metres; ang turns the frame about y (radians; 0 = along x)
    const c = Math.cos(ang || 0), s = Math.sin(ang || 0), P = (a, y, b) => [x0 + a * c - b * s, y, z0 + a * s + b * c];
    const bars = []; [0, len].forEach(a => { bars.push([P(a, top, 0), P(a - 0.25, 0, -0.85), 0.07]); bars.push([P(a, top, 0), P(a + 0.25, 0, 0.85), 0.07]); });
    bars.push([P(-0.08, top, 0), P(len + 0.08, top, 0), 0.08]);
    const seats = []; [len * 0.3, len * 0.7].forEach(a => { bars.push([P(a - 0.2, top, 0), P(a - 0.2, 0.45, 0), 0.02]); bars.push([P(a + 0.2, top, 0), P(a + 0.2, 0.45, 0), 0.02]); seats.push([P(a - 0.26, 0.45, -0.1), P(a + 0.26, 0.45, -0.1), P(a + 0.26, 0.42, 0.1), P(a - 0.26, 0.42, 0.1)]); });
    return { bars, seats };
  }
  // draw a bar between two world points as a quad of screen width w (metres at its depth)
  function bar3(g, cam, p, q, w) { const a = cam.clip([p, q, q, p]); if (a.length < 2) return; const A = cam.proj(cam.cs(p[0], p[1], p[2])), B = cam.proj(cam.cs(q[0], q[1], q[2])), da = cam.cs(p[0], p[1], p[2])[2], db = cam.cs(q[0], q[1], q[2])[2]; if (da < 0.1 || db < 0.1) return;
    const wa = w * cam.f / da / 2, wb = w * cam.f / db / 2, ang = Math.atan2(B[1] - A[1], B[0] - A[0]), nx = -Math.sin(ang), ny = Math.cos(ang);
    g.beginPath(); g.moveTo(A[0] + nx * wa, A[1] + ny * wa); g.lineTo(B[0] + nx * wb, B[1] + ny * wb); g.lineTo(B[0] - nx * wb, B[1] - ny * wb); g.lineTo(A[0] - nx * wa, A[1] - ny * wa); g.closePath(); g.fill(); }
  // the shadow of a world point on the ground for a sun at azimuth direction (sx, sz) (unit, horizontal) and elevation e
  const shadowPt = (p, sd, e, maxL) => { const L = Math.min(maxL || 30, p[1] / Math.tan(e)); return [p[0] - sd[0] * L, 0, p[2] - sd[1] * L]; };

  // ===============================================================================================================
  // BUILDING · the nursery at dusk (A080): the low brick building from the street, its painted animals along the wall in
  // true perspective, the wall running away to the west and the low sun beyond the playground at its far end
  // state: { tod: 'evening' | 'dusk' }
  // ===============================================================================================================
  const BUILDV = (() => {
    const F = 1300, CX = 960, CY = 560;
    const CAM = { x: -2.5, y: 1.45, z: -8.8 }, cam = mkCam({ x: CAM.x, y: CAM.y, z: CAM.z, yaw: 1.16, pitch: 0.0, f: F, cx: CX, cy: CY });
    const SD = [Math.cos(-0.2), Math.sin(-0.2)];       // toward the sun, on the ground: west, a little north
    const sunScr = cam.proj(cam.cs(CAM.x + SD[0] * 900, CAM.y + 900 * 0.045, CAM.z + SD[1] * 900));
    function world(g, c, tod) {
      const dusk = tod === 'dusk', hz = CY;
      g.fillStyle = LC.lin(g, 0, 0, 0, hz, dusk ? DUSK.skyNight : [[0, '#202A36'], [0.45, '#343A4A'], [0.75, '#56505E'], [1, '#86645E']]); g.fillRect(0, 0, W, hz + 2);
      g.fillStyle = LC.lin(g, 0, 0, W, 0, [[0, '#000000', 0], [0.55, '#E08A54', 0], [1, '#E8925A', dusk ? 0.15 : 0.42]]); g.fillRect(0, 0, W, hz + 2);
      sunGlow(g, sunScr[0], sunScr[1], dusk ? 0.35 : 0.95, 1300, [0, 0, W, hz + 2]);
      cloudStreaks(g, [[120, 120, 640, 6], [820, 70, 720, 6], [500, 250, 420, 4], [1260, 210, 560, 4], [1500, 330, 360, 3]], dusk ? 'rgba(150,96,100,0.25)' : 'rgba(214,140,96,0.4)', 'rgba(40,44,58,0.32)');
      // far trees beyond the playground, against the sun
      g.fillStyle = DUSK.far; g.beginPath(); g.moveTo(900, hz + 2); for (let x = 900; x <= W + 10; x += 10) g.lineTo(x, hz - 10 - OTM.fbm(x * 0.008, 2, 41, 3) * 40); g.lineTo(W + 10, hz + 2); g.closePath(); g.fill();
      // the ground: the car park and the street, copper toward the sun
      g.fillStyle = LC.lin(g, 0, hz, 0, H, dusk ? DUSK.tarNight : [[0, '#B87A4E'], [0.1, '#8A5C40'], [0.4, '#4E3A34'], [1, '#221C20']]); g.fillRect(0, hz, W, H - hz);
      if (!dusk) { g.save(); g.globalCompositeOperation = 'screen'; g.translate(sunScr[0], hz); g.scale(1, 0.18); g.fillStyle = LC.rad(g, 0, 0, 0, 1000, [[0, '#FFC27E', 0.5], [0.4, '#E89A5E', 0.15], [1, '#E89A5E', 0]]); g.fillRect(-1200, -100, 2400, 5000); g.restore(); }
      // the roof: its slope back to the ridge, its gable end to the east; then the wall with the mural
      const R = (pts, col) => { g.fillStyle = col; g.fill(cam.path(pts)); };
      R([[-0.4, 2.9, -0.45], [32.4, 2.9, -0.45], [32.4, 4.5, 5], [-0.4, 4.5, 5]], dusk ? '#1E1C22' : '#2A2628');
      R([[-0.4, 2.9, -0.45], [-0.4, 4.5, 5], [-0.4, 2.9, 10.4]], dusk ? '#1A181E' : '#221E22');
      R([[0, 0, 0], [0, 2.9, 0], [0, 2.9, 10], [0, 0, 10]], dusk ? '#2A1E1C' : '#3A2A26');           // the east end wall, in its own shade
      { g.save(); g.clip(cam.path([[0, 0, 0], [0, 2.9, 0], [0, 2.9, 10], [0, 0, 10]])); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0.15; y < 2.9; y += 0.15) { g.fill(cam.path([[0, y, 0], [0, y + 0.012, 0], [0, y + 0.012, 10], [0, y, 10]])); } g.restore(); }
      const ev = scratch('bldElev', MURAL.LEN * 160, Math.ceil(3.0 * 160)); elevation(ev, 0, MURAL.LEN, 160, tod, { ridge: 3.3, y1: 3.0 });
      mapWall(g, cam, ev.canvas, 0, MURAL.LEN, 0, 3.0, 160, 8);
      // the eaves' fascia catching the copper, the gutter
      R([[-0.4, 2.9, -0.45], [32.4, 2.9, -0.45], [32.4, 3.06, -0.45], [-0.4, 3.06, -0.45]], dusk ? '#4A4650' : '#7A6A62');
      if (!dusk) { g.fillStyle = 'rgba(232,150,92,0.5)'; g.fill(cam.path([[-0.4, 3.0, -0.46], [32.4, 3.0, -0.46], [32.4, 3.06, -0.46], [-0.4, 3.06, -0.46]])); }
      // the playground at the west end: its fence, the swing frame against the sun
      g.fillStyle = '#16131A'; for (let x = 32.5; x < 52; x += 0.5) bar3(g, cam, [x, 0, -1.4], [x, 1.1, -1.4], 0.035); bar3(g, cam, [32.5, 1.08, -1.4], [52, 1.08, -1.4], 0.05); bar3(g, cam, [32.5, 0.6, -1.4], [52, 0.6, -1.4], 0.04);
      const sw = swingParts(37.5, 2.2, 3.2, 2.3, 0.1); sw.bars.forEach(([p, q, w]) => bar3(g, cam, p, q, w)); sw.seats.forEach(st => g.fill(cam.path(st)));
      // the long shadows of the fence and the frame, thrown east across the copper
      if (!dusk) { const sh = scratch('bldSh'); sh.fillStyle = DUSK.shadow; const e = 0.05;
        for (let x = 32.5; x < 52; x += 0.5) { const a = [x, 0, -1.4], b = shadowPt([x, 1.1, -1.4], SD, e); sh.fill(cam.path([[a[0], 0, a[2] - 0.02], [b[0], 0, b[2] - 0.02], [b[0], 0, b[2] + 0.02], [a[0], 0, a[2] + 0.02]])); }
        sw.bars.forEach(([p, q, w]) => { const a = p[1] < 0.01 ? p : shadowPt(p, SD, e), b = q[1] < 0.01 ? q : shadowPt(q, SD, e); sh.fill(cam.path([[a[0], 0, a[2] - w], [b[0], 0, b[2] - w], [b[0], 0, b[2] + w], [a[0], 0, a[2] + w]])); });
        g.save(); g.globalAlpha = 0.7; g.drawImage(LC.blurred(sh.canvas, 1.5, false), 0, 0); g.restore(); }
      // a lamp post in the car park, and the kerb along the pavement
      R([[-6, 0, -1.6], [32.4, 0, -1.6], [32.4, 0.12, -1.6], [-6, 0.12, -1.6]], dusk ? '#3A3640' : '#4E4448');
      { const LP = [0.4, -3.6]; g.fillStyle = '#100E14'; bar3(g, cam, [LP[0], 0, LP[1]], [LP[0], 5.6, LP[1]], 0.13); bar3(g, cam, [LP[0], 5.55, LP[1]], [LP[0], 5.55, LP[1] + 1.0], 0.09); if (!dusk) { g.fillStyle = 'rgba(232,150,92,0.55)'; bar3(g, cam, [LP[0] + 0.05, 0.2, LP[1] - 0.05], [LP[0] + 0.05, 5.5, LP[1] - 0.05], 0.03); }
        if (!dusk) { const sh = scratch('bldSh2'); sh.fillStyle = DUSK.shadow; const b = shadowPt([LP[0], 5.6, LP[1]], SD, 0.05, 2.6); sh.fill(cam.path([[LP[0] - 0.08, 0, LP[1]], [b[0], 0, b[2] - 0.1], [b[0], 0, b[2] + 0.1], [LP[0] + 0.08, 0, LP[1]]])); g.save(); g.globalAlpha = 0.6; g.drawImage(LC.blurred(sh.canvas, 1.5, false), 0, 0); g.restore(); } }
      g.fillStyle = LC.lin(g, 0, 860, 0, H, [[0, '#0C0C10', 0], [1, '#0C0C10', 0.55]]); g.fillRect(0, 860, W, H - 860);
    }
    const view = {
      back(c, t, s) { s = s || {}; const tod = s.tod === 'dusk' ? 'dusk' : 'evening'; c.g.drawImage(cache(c, 'build|' + tod, o => world(o, c, tod)), 0, 0);
        const E = c.em; E.save(); E.globalAlpha = 0.5; E.fillStyle = '#FFC890'; E.beginPath(); E.arc(Math.min(W + 40, sunScr[0]), sunScr[1], 160, 0, TAU); E.fill(); E.restore(); },
      front(c, t, s) { },
      anchors: (() => { const d = cam.proj(cam.cs(12.5, 0, -1.0)), q = cam.cs(12.5, 0, -1.0); return { door: [d[0], d[1]], k: F / q[2], horizon: CY }; })(),
      light: { x: Math.min(W + 300, sunScr[0]), y: CY - 80, color: DUSK.rim },
      ground(x, z) { const q = cam.cs(x, 0, z), p = cam.proj(q); return { x: p[0], y: p[1], k: F / q[2] }; },
      at(s) { return Object.assign({}, view.anchors, { light: view.light }); },
    };
    return view;
  })();

  // ===============================================================================================================
  // ARRIVE · Daniel's car braking outside (A080), seen through its front passenger window: the same window the painted wall
  // slipped past this morning (Q06), now it slides in and stops, in focus, drained by the dusk. The frame's edges (door
  // frame, pillars) are flat silhouette; the glass shows the outside only. The wing mirror holds the road behind.
  // state: { slide: metres still to travel before he stops (0 = stopped; the wall slides left), blur: 0..1 (motion), dip:
  //          0..1 (the nose dipping as he brakes), tod }
  // ===============================================================================================================
  const ARRIVEV = (() => {
    const F = 1250, CX = 960, CY = 560, EYE = 1.15, ZC = -16, XS = 13.8, KW = F / -ZC, SPAN = 12, FU = 4.8, SL = 11;
    const sx = u => CX + (u - XS) * KW, sy = y => CY - (y - EYE) * KW;
    // the window's opening as the camera sees it (fixed to the car): rear (B-pillar) left, the raked A-pillar right
    const WIN = LC.smooth([[70, 78, 1], [1360, 60], [1560, 92], [1790, 300, 1], [1880, 838, 1], [60, 852, 1]]);
    function far(g, tod) {   // the southern sky over the roof, warmed from the west; never moves
      const dusk = tod === 'dusk';
      g.fillStyle = LC.lin(g, 0, 0, 0, sy(3.4), dusk ? [[0, '#1C2430'], [1, '#463E50']] : [[0, '#28303E'], [0.6, '#3E3E50'], [1, '#685666']]); g.fillRect(0, 0, W, H);
      g.fillStyle = LC.lin(g, 0, 0, W, 0, [[0, '#000000', 0], [0.6, '#E08A54', 0], [1, '#E8925A', dusk ? 0.12 : 0.32]]); g.fillRect(0, 0, W, H);
      cloudStreaks(g, [[160, 120, 600, 5], [900, 70, 700, 5], [1300, 210, 420, 3]], dusk ? 'rgba(150,96,100,0.22)' : 'rgba(214,140,96,0.36)', 'rgba(40,44,58,0.3)');
    }
    function wall(g, tod) {  // the wall, its roof, the pavement and the car park in front of it: one layer, it slides at the wall's rate
      const dusk = tod === 'dusk', w = Math.ceil((SPAN * 2 + 12) * KW), u0 = XS - SPAN - 10, X = u => (u - u0) * KW;
      const ev = scratch('arrElev', Math.ceil((SPAN * 2 + 12) * KW), Math.ceil(3.0 * KW)); elevation(ev, u0, u0 + SPAN * 2 + 12, KW, tod, { ridge: 3.25, y1: 3.0 });
      g.fillStyle = dusk ? '#1E1C22' : '#2A2628'; g.fillRect(0, sy(3.45), w, sy(3.0) - sy(3.45) + 2);           // the roof, glimpsed
      g.fillStyle = dusk ? '#4A4650' : '#7A6A62'; g.fillRect(0, sy(3.08), w, 0.16 * KW); if (!dusk) { g.fillStyle = 'rgba(232,150,92,0.5)'; g.fillRect(0, sy(3.08), w, 2); }
      g.drawImage(ev.canvas, 0, sy(3.0));
      if (u0 < 0) { g.fillStyle = 'rgba(20,18,24,0.0)'; g.clearRect(0, 0, X(-0.05), sy(0) + 1); }                 // beyond the east end: sky shows through (drawn by far())
      // the pavement and the near car park: copper where the sun reaches, the bay lines, a kerb
      g.fillStyle = dusk ? '#38343F' : '#4A4250'; g.fillRect(0, sy(0), w, (F / 14 - F / 16) * EYE + 2);
      g.fillStyle = LC.lin(g, 0, sy(0), 0, H, dusk ? [[0, '#2E2830'], [1, '#141216']] : [[0, '#6A4C3E'], [0.3, '#54403A'], [1, '#2A2226']]); g.fillRect(0, CY + EYE * F / 14, w, H);
      g.strokeStyle = dusk ? 'rgba(160,150,150,0.1)' : 'rgba(226,200,170,0.2)'; g.lineWidth = 2; for (let u = u0; u < u0 + SPAN * 2 + 12; u += 2.6) { const a = [X(u), CY + EYE * F / 14.5], b = [X(u) + (X(u) - (XS - u0) * KW) * 0.25, CY + EYE * F / 9]; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    }
    // the foreground: bollards along the car park's street edge, 6 m off: they slide faster, and frame the stop
    const KF = F / 6, FW = Math.ceil((FU * 2 + SL) * KF), FU0 = XS - FU - SL;
    function fore(g, tod) {
      const dusk = tod === 'dusk', yb = CY + EYE * KF, X = u => (u - FU0) * KF;
      for (let u = FU0 + 0.7; u < FU0 + FW / KF; u += 3.1) { g.fillStyle = '#121016'; g.fill(LC.rrect(X(u), yb - 0.82 * KF, 0.13 * KF, 0.82 * KF + 4, 0.05 * KF));
        g.fillStyle = 'rgba(214,190,160,0.35)'; g.fillRect(X(u), yb - 0.7 * KF, 0.13 * KF, 0.05 * KF);
        if (!dusk) { g.fillStyle = 'rgba(232,150,92,0.5)'; g.fillRect(X(u) + 0.1 * KF, yb - 0.8 * KF, 2.5, 0.8 * KF); } }
      g.fillStyle = dusk ? '#3A3640' : '#5A4E50'; g.fillRect(0, yb - 0.02 * KF, FW, 0.06 * KF);
    }
    const smear = smearH;
    function frameEdges(g) {   // the window's frame from inside: flat silhouette, no detail; the door's top at the foot
      g.save(); g.fillStyle = '#07090B'; const fr = new Path2D(); fr.rect(-10, -10, W + 20, H + 20); fr.addPath(WIN); g.fill(fr, 'evenodd'); g.restore();
      g.strokeStyle = 'rgba(232,150,92,0.25)'; g.lineWidth = 2; g.stroke(WIN);
      g.fillStyle = LC.lin(g, 0, 852, 0, H, [[0, '#0E1012'], [1, '#050607']]); g.fillRect(0, 852, W, H - 852);
      // the wing mirror outside the glass, at the A-pillar's foot: its glass holds the road behind (east), empty, dusk
      const M = LC.rrect(1530, 640, 300, 170, 50); g.fillStyle = '#0A0D10'; g.fill(LC.rrect(1515, 628, 330, 196, 60));
      g.save(); g.clip(M); g.fillStyle = LC.lin(g, 0, 640, 0, 810, [[0, '#3A4050'], [0.55, '#6A5C66'], [0.62, '#3E3A40'], [1, '#2A262A']]); g.fillRect(1530, 640, 300, 170);
      g.fillStyle = '#4A4448'; g.beginPath(); g.moveTo(1530, 810); g.lineTo(1700, 735); g.lineTo(1740, 735); g.lineTo(1830, 810); g.fill();
      g.strokeStyle = 'rgba(220,210,190,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(1715, 742); g.lineTo(1705, 810); g.stroke(); g.restore();
      g.strokeStyle = 'rgba(255,240,220,0.25)'; g.lineWidth = 2; g.stroke(M);
    }
    const view = {
      back(c, t, s) {
        s = s || {}; const g = c.g, tod = s.tod === 'dusk' ? 'dusk' : 'evening', sl = Math.max(0, s.slide || 0), bl = clamp(s.blur || 0, 0, 1), dip = clamp(s.dip || 0, 0, 1) * 10;
        g.save(); g.clip(WIN); g.translate(0, dip);
        g.drawImage(cache(c, 'arr|far|' + tod, o => far(o, tod)), 0, -dip);
        const wl = cache(c, 'arr|wall|' + tod, o => wall(o, tod), Math.ceil((SPAN * 2 + 12) * KW), H), wx = CX - (XS - (XS - SPAN - 10)) * KW + sl * KW;   // the wall layer's left edge on screen
        const slice = (img, x, a) => { const sx = Math.max(0, -x), sw = Math.min(img.width - sx, W + 2); if (sw <= 0) return; g.save(); if (a != null) g.globalAlpha = a; g.drawImage(img, sx, 0, sw, H, x + sx, 0, sw, H); g.restore(); };
        if (bl < 0.999) slice(wl, wx);
        if (bl > 0.001) slice(cache(c, 'arr|wallB|' + tod, o => o.drawImage(smear(wl, 46), 0, 0), wl.width, H), wx, bl);
        const fw = cache(c, 'arr|fore|' + tod, o => fore(o, tod), FW, H), fx = CX - (XS - FU0) * KF + sl * KF;
        if (bl < 0.999) slice(fw, fx);
        if (bl > 0.001) slice(cache(c, 'arr|foreB|' + tod, o => o.drawImage(smear(fw, 120), 0, 0), fw.width, H), fx, bl);
        g.restore();
        // the glass: a fine glare, dust lit from the west; it shows the outside, nothing of the inside
        LC.glare(g, WIN, { x: 1100, y: 420, angle: -1.1, color: '#FFE8CC', bands: [{ d: -160, w: 120, a: 0.035 }, { d: -90, w: 16, a: 0.05 }] });
        g.drawImage(cache(c, 'arr|edges', frameEdges), 0, 0);
      },
      front(c, t, s) { },
      anchors: { door: [sx(12.5), sy(1.0)], wallK: KW, horizon: CY, window: { x: 60, y: 60, w: 1820, h: 792 } },
      light: { x: 2400, y: 300, color: '#F2A468' },
      at(s) { return Object.assign({}, view.anchors, { light: view.light }); },
    };
    return view;
  })();

  // ===============================================================================================================
  // PLAYGROUND · silent (A081). Low, at the playground's edge, looking west into the last of the sun: the swings hanging
  // still against it, their long shadows raked across the tarmac toward us; the classroom wing on the left, its windows
  // turned to mirrors by the grazing light; the low fence; no one.
  // state: { tod: 'evening' | 'dusk' }
  // ===============================================================================================================
  const PLAYV = (() => {
    const F = 1250, CX = 960, CY = 600, CAM = { x: 33.2, y: 0.95, z: -4.2 };
    const cam = mkCam({ x: CAM.x, y: CAM.y, z: CAM.z, yaw: Math.PI / 2 - 0.05, pitch: 0.02, f: F, cx: CX, cy: CY });
    const SD = [Math.cos(-0.2), Math.sin(-0.2)], ELEV = 0.045, SHE = 0.085;   // SHE: the elevation the shadows are composed at, so the seats' blades lie on the tarmac in frame
    const sunScr = (() => { const q = cam.proj(cam.cs(CAM.x + SD[0] * 900, CAM.y + 900 * ELEV, CAM.z + SD[1] * 900)); return q; })();
    const hz = cam.proj(cam.cs(CAM.x + 900, CAM.y, CAM.z))[1];
    function world(g, tod) {
      const dusk = tod === 'dusk', L = dusk ? 0.35 : 1;
      g.fillStyle = LC.lin(g, 0, 0, 0, hz, dusk ? DUSK.skyNight : DUSK.sky); g.fillRect(0, 0, W, hz + 2);
      sunGlow(g, sunScr[0], sunScr[1], L, 1000, [0, 0, W, hz + 2]);
      cloudStreaks(g, [[140, hz - 300, 700, 7], [980, hz - 360, 620, 6], [1300, hz - 240, 480, 5], [520, hz - 150, 300, 3]], dusk ? 'rgba(150,96,100,0.25)' : 'rgba(214,140,96,0.4)', 'rgba(48,52,66,0.35)');
      g.fillStyle = DUSK.far; g.beginPath(); g.moveTo(-10, hz + 2); for (let x = -10; x <= W + 10; x += 12) g.lineTo(x, hz - 10 - OTM.fbm(x * 0.006, 5, 17, 3) * 44); g.lineTo(W + 10, hz + 2); g.closePath(); g.fill();
      g.fillStyle = LC.lin(g, 0, hz, 0, H, dusk ? DUSK.tarNight : DUSK.tar); g.fillRect(0, hz, W, H - hz);
      if (!dusk) { g.save(); g.globalCompositeOperation = 'screen'; g.translate(sunScr[0], hz); g.scale(1, 0.2); g.fillStyle = LC.rad(g, 0, 0, 0, 800, [[0, '#FFC27E', 0.62], [0.4, '#E89A5E', 0.18], [1, '#E89A5E', 0]]); g.fillRect(-900, -100, 1800, 3000); g.restore(); }
      // a painted ring on the playground, worn: the low sun skims it
      { const pts = []; for (let i = 0; i < 64; i++) { const a = i / 64 * TAU; pts.push([36.4 + Math.cos(a) * 1.4, 0.001, -6.4 + Math.sin(a) * 1.4]); } g.strokeStyle = dusk ? 'rgba(160,150,150,0.12)' : 'rgba(236,206,170,0.28)'; g.lineWidth = 3; const q = cam.clip(pts); if (q.length > 2) { g.beginPath(); q.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke(); } }
      // the classroom wing on the left: brick (mapped onto its wall), its windows mirrors of the sunset at this grazing angle
      { const pxm = 120, U0 = 32.2, U1 = 46, el = scratch('plWing', Math.ceil((U1 - U0) * pxm), Math.ceil(2.9 * pxm)), X = u => (u - U0) * pxm, Y = y => (2.9 - y) * pxm;
        MURAL.brickWall(el, 0, 0, (U1 - U0) * pxm, 2.9 * pxm, pxm, U0);
        el.fillStyle = dusk ? 'rgba(26,22,34,0.66)' : 'rgba(60,40,44,0.35)'; el.fillRect(0, 0, el.canvas.width, el.canvas.height);
        [[34.0, 36.4], [38.2, 40.6], [42.4, 44.8]].forEach(([a2, b2]) => { el.fillStyle = '#C8C4BA'; el.fillRect(X(a2 - 0.07), Y(2.37), (b2 - a2 + 0.14) * pxm, 1.54 * pxm);
          el.fillStyle = LC.lin(el, 0, Y(2.3), 0, Y(0.9), dusk ? [[0, '#3A3446'], [0.6, '#7A5050'], [1, '#2A2228']] : [[0, '#6A5E70'], [0.5, '#E8A070'], [0.62, '#FFD8A8'], [1, '#4A3430']]); el.fillRect(X(a2), Y(2.3), (b2 - a2) * pxm, 1.4 * pxm);
          el.fillStyle = '#C8C4BA'; el.fillRect(X((a2 + b2) / 2 - 0.035), Y(2.3), 0.07 * pxm, 1.4 * pxm); el.fillStyle = '#9A9488'; el.fillRect(X(a2 - 0.1), Y(0.9), (b2 - a2 + 0.2) * pxm, 0.06 * pxm); });
        if (!dusk) { el.fillStyle = 'rgba(232,150,92,0.55)'; el.fillRect(0, 0, el.canvas.width, 0.04 * pxm); }
        mapWall(g, cam, el.canvas, U0, U1, 0, 2.9, pxm, 6, 2.2);
        g.fillStyle = dusk ? '#1A1418' : '#22191A'; g.fill(cam.path([[32.2, 2.9, 2.0], [46, 2.9, 2.0], [46, 3.6, 4.5], [32.2, 3.6, 4.5]])); }
      // the fence along the far side, and the swings: dark against the sun, their copper edges
      const sw = swingParts(39.6, -1.9, 3.2, 2.3, -Math.PI / 2 + 0.06);
      g.fillStyle = '#16131A';
      for (let z = -9; z < 2; z += 0.4) bar3(g, cam, [47, 0, z], [47, 1.1, z], 0.04); bar3(g, cam, [47, 1.08, -9], [47, 1.08, 2.2], 0.05); bar3(g, cam, [47, 0.55, -9], [47, 0.55, 2.2], 0.04);
      for (let x = 33.6; x < 47; x += 0.4) bar3(g, cam, [x, 0, -9], [x, 1.1, -9], 0.04); bar3(g, cam, [33.6, 1.08, -9], [47, 1.08, -9], 0.05);
      // the long shadows: legs, chains, seats, fence; all toward us
      if (!dusk) { const sh = scratch('plSh'); sh.fillStyle = DUSK.shadow;
        const sq = (a, b, w) => sh.fill(cam.path([[a[0], 0, a[2] - w], [b[0], 0, b[2] - w], [b[0], 0, b[2] + w], [a[0], 0, a[2] + w]]));
        sw.bars.forEach(([p, q, w]) => sq(p[1] < 0.01 ? p : shadowPt(p, SD, SHE, 16), q[1] < 0.01 ? q : shadowPt(q, SD, SHE, 16), w * 1.4));
        sw.seats.forEach(st => { const q = st.map(p => shadowPt(p, SD, 0.16, 16)); sh.fill(cam.path([[q[0][0] + 0.2, 0, q[0][2] - 0.04], [q[1][0] + 0.2, 0, q[1][2] - 0.04], [q[1][0] - 1.4, 0, q[1][2] + 0.1], [q[0][0] - 1.4, 0, q[0][2] + 0.1]])); });   // as C3 lays them: two dark blades out on the tarmac
        for (let x = 33.6; x < 47; x += 0.4) sq([x, 0, -9], shadowPt([x, 1.1, -9], SD, SHE, 16), 0.03);
        g.save(); g.globalAlpha = 0.82; g.drawImage(LC.blurred(sh.canvas, 1.5, false), 0, 0); g.restore(); }
      const swp = new Path2D(); { const tmp = scratch('plSw'); tmp.fillStyle = '#16131A'; sw.bars.forEach(([p, q, w]) => bar3(tmp, cam, p, q, w)); sw.seats.forEach(st => tmp.fill(cam.path(st))); g.drawImage(tmp.canvas, 0, 0);
        if (!dusk) { const r = scratch('plRim'); r.drawImage(tmp.canvas, 0, 0); r.globalCompositeOperation = 'source-in'; r.fillStyle = '#F2A35E'; r.fillRect(0, 0, W, H); r.globalCompositeOperation = 'destination-out'; r.drawImage(tmp.canvas, -2.5, 1.2); g.drawImage(r.canvas, 0, 0); } }
      g.fillStyle = LC.lin(g, 0, 880, 0, H, [[0, '#0C0C10', 0], [1, '#0C0C10', 0.5]]); g.fillRect(0, 880, W, H - 880);
    }
    const view = {
      back(c, t, s) { s = s || {}; const tod = s.tod === 'dusk' ? 'dusk' : 'evening', g = c.g; g.drawImage(cache(c, 'play|' + tod, o => world(o, tod)), 0, 0);
        const E = c.em, L = tod === 'dusk' ? 0.4 : 1; E.save(); E.beginPath(); E.rect(0, 0, W, hz); E.clip(); E.globalAlpha = L; E.fillStyle = '#FFD7A0'; E.beginPath(); E.arc(sunScr[0], sunScr[1], 50, 0, TAU); E.fill(); E.fillStyle = 'rgba(230,140,80,0.3)'; E.beginPath(); E.arc(sunScr[0], sunScr[1], 120, 0, TAU); E.fill(); E.restore();
        g.save(); g.beginPath(); g.rect(0, 0, W, hz - 6); g.clip(); g.fillStyle = DUSK.sun; g.beginPath(); g.arc(sunScr[0], sunScr[1], 30, 0, TAU); g.fill(); g.fillStyle = DUSK.sunCore; g.beginPath(); g.arc(sunScr[0], sunScr[1], 20, 0, TAU); g.fill(); g.restore(); },
      front(c, t, s) { },
      anchors: { sun: sunScr, horizon: hz },
      light: { x: sunScr[0], y: sunScr[1] - 60, color: DUSK.rim },
      at(s) { return Object.assign({}, view.anchors, { light: view.light }); },
    };
    return view;
  })();

  // demo stand-in: a hand with a key fob, in the foreground (blink view)
  function standInRemote(g, a) {
    const [x, y] = a.remote, k = a.remoteK / 2600, P = (px, py) => [x + px * k, y + py * k];
    g.fillStyle = '#0C0A0A'; g.fill(LC.smooth([[260, 360], [120, 120], [20, 0], [-60, -60], [-120, -40], [-110, 30], [-30, 90], [40, 260], [120, 360]].map(q => P(q[0], q[1]))));
    g.fillStyle = '#1A1C1E'; g.fill(LC.rrect(P(-150, -110)[0], P(-150, -110)[1], 130 * k, 70 * k, 22 * k));
    g.fillStyle = 'rgba(240,160,100,0.6)'; g.fillRect(P(-140, -108)[0], P(-140, -108)[1], 110 * k, 3);
  }

  // demo stand-in: a hand gripping a handle (four fingers into the recess; drawn between back and front)
  function standInHand(g, a) {
    const [x, y] = a.handle, k = a.k / 2600, P = (px, py) => [x + px * k, y + py * k];
    g.fillStyle = '#5F3F33'; g.fill(LC.smooth([[-520, 260], [-300, 60], [-150, -30], [-40, -40], [60, -20], [120, 30], [60, 70], [-90, 90], [-260, 230], [-360, 420]].map(q => P(q[0], q[1]))));
    g.fillStyle = '#9C6D55'; g.fill(LC.smooth([[-500, 250], [-300, 70], [-160, -10], [-60, -16], [-30, 20], [-150, 60], [-300, 200]].map(q => P(q[0], q[1]))));
    g.fillStyle = '#16100D'; g.fill(LC.smooth([[-560, 330], [-420, 200], [-330, 330], [-460, 520]].map(q => P(q[0], q[1]))));
  }

  // demo stand-in: a whole figure front-on, small, as the dark glass gives it back
  function standInFigureFront(g, a) {
    const r = a.reflection, k = r.k, x = r.x, y = r.y, P = (px, py) => [x + px * k, y - py * k];
    const p = LC.smooth([[-0.18, 0], [-0.2, 0.85], [-0.24, 1.42], [-0.12, 1.5], [-0.07, 1.56], [-0.09, 1.68], [-0.06, 1.78], [0.06, 1.78], [0.09, 1.68], [0.07, 1.56], [0.12, 1.5], [0.24, 1.42], [0.2, 0.85], [0.18, 0]].map(q => P(q[0], q[1])));
    g.fillStyle = '#2A2226'; g.fill(p);
    g.fillStyle = 'rgba(232,150,92,0.6)'; g.fill(LC.smooth([[-0.24, 1.42], [-0.2, 0.9], [-0.15, 0.9], [-0.16, 1.4], [-0.08, 1.66], [-0.09, 1.7]].map(q => P(q[0], q[1]))));
  }

  // demo stand-in: a head and shoulders front-on, as a reflection (a dark shape rimmed copper on its right)
  function standInHeadFront(g, a) {
    const f = a.face || [a.reflection.x, a.reflection.y], s = (a.face ? a.k : a.reflection.k) / 1250 * (a.face ? 1 : 1.25), P = (x, y) => [f[0] + x * s, f[1] + y * s];
    const p = LC.smooth([[-330, 520], [-300, 330], [-170, 250], [-90, 210], [-86, 130], [-120, 40], [-122, -60], [-100, -150], [-40, -200], [40, -200], [100, -150], [122, -60], [120, 40], [86, 130], [90, 210], [170, 250], [300, 330], [330, 520]].map(q => P(q[0], q[1])));
    g.fillStyle = '#20181A'; g.fill(p);
    g.fillStyle = 'rgba(214,140,100,0.55)'; g.fill(LC.smooth([[30, -170], [96, -120], [116, -40], [110, 50], [80, 120], [50, 100], [70, 0], [60, -110]].map(q => P(q[0], q[1]))));
  }

  // demo stand-in for A106: Daniel stooped at the doorway, head and shoulders, seen from the door's front side
  function standInStoop(g, a) {
    // Daniel stooped into the doorway in profile, facing right, his head bowed so his eyes go down to the right, below the frame;
    // his near arm reaching down into the car behind the hinge band. Metres from his face, scaled by a.k (y down).
    const f = a.face, k = a.k, L = a.light, rot = 0.62, cr = Math.cos(rot), sr = Math.sin(rot);
    const H = (x, y) => { const px = -0.02 + (x + 0.02) * cr - (y - 0.1) * sr, py = 0.1 + (x + 0.02) * sr + (y - 0.1) * cr; return [px, py]; };   // the head, bowed about the neck
    const head = [[-0.05, -0.135], [0.06, -0.12], [0.115, -0.06], [0.13, 0.005], [0.15, 0.035, 1], [0.12, 0.06], [0.115, 0.095], [0.07, 0.125], [0.02, 0.13]].map(q => H(q[0], q[1]).concat(q[2] ? [1] : []));
    const back = [[-0.13, -0.03], [-0.1, -0.1]].map(q => H(q[0], q[1]));
    const P = (q) => [f[0] + q[0] * k, f[1] + q[1] * k].concat(q[2] ? [1] : []);
    const pts = [back[1]].concat(head).concat([[0.0, 0.24], [0.1, 0.32], [0.26, 0.4], [0.46, 0.44, 1], [0.46, 0.55, 1], [0.24, 0.52], [0.04, 0.46], [-0.04, 0.64, 1], [-0.5, 0.66, 1], [-0.46, 0.36], [-0.32, 0.17], [-0.18, 0.1], [-0.1, 0.1], back[0]]);
    const body = LC.smooth(pts.map(P));
    g.fillStyle = '#0A0E10'; g.fill(body);
    if (L.k > 0.01) { const b0 = P([-0.55, -0.2]), b1 = P([0.5, 0.7]); OTM.silhouette(g, body, { fill: false, light: { x: L.x, y: L.y }, rimColor: L.color, rimW: 3.4, rimSoft: true, spread: 1.15, rimAlpha: L.k, at: P([-0.05, 0.08]), bbox: { x: b0[0], y: b0[1], w: b1[0] - b0[0], h: b1[1] - b0[1] } }); }
    // the faint cool fill from the eastern sky behind the camera, on the face turned down and away
    g.fillStyle = 'rgba(120,138,160,0.15)'; g.fill(LC.smooth([[0.03, -0.1], [0.1, -0.05], [0.12, 0.02], [0.1, 0.08], [0.05, 0.11], [0.04, 0.0]].map(q => P(H(q[0], q[1])))));
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
  // ---------------------------------------------------------------------------------------------------------------
  // SETS.nursery.mural: the painted wall for other sets (Q06's passenger-window pass) and any view that needs it
  // ---------------------------------------------------------------------------------------------------------------
  const muralAPI = {
    length: MURAL.LEN, eaves: MURAL.EAVES, panel: MURAL.PANEL, colors: MURAL.COLORS, items: MURAL.ITEMS, scale: { elephant: 0.92, lion: 0.95, hippo: 0.95, giraffe: 0.82, flamingo: 0.9, whale: 0.9, zebra: 0.9, snail: 1.0 },
    notice: { text: NOTICE_TEXT, at: MURAL.NOTICE }, lock: MURAL.LOCK, entrance: MURAL.ENTRANCE,
    // paint the wall's elevation into g with its top-left at (x, y): u0..u1 and y0..y1 in metres at pxm px per metre, under a light
    paint(g, x, y, pxm, o) { o = o || {}; const u0 = o.u0 == null ? 0 : o.u0, u1 = o.u1 == null ? MURAL.LEN : o.u1; g.save(); g.translate(x, y); elevation(g, u0, u1, pxm, o.tod || 'morning', { ridge: o.ridge || 3.3, y0: o.y0 || 0, y1: o.y1 == null ? 3.3 : o.y1 }); g.restore(); },
    // the whole wall as a cached canvas (u 0..32 m, y 0..3.3 m) at pxm px per metre; blur (px) smears it horizontally (motion)
    canvas(c, tod, pxm, blur) {
      tod = tod || 'morning'; pxm = Math.round(pxm || 60); const bq = Math.round((blur || 0) / 8) * 8, w = Math.ceil(MURAL.LEN * pxm), h = Math.ceil(3.3 * pxm);
      const sharp = cache(c, 'mural|' + tod + '|' + pxm, o => elevation(o, 0, MURAL.LEN, pxm, tod, { ridge: 3.3, y1: 3.3 }), w, h);
      if (!bq) return sharp;
      return cache(c, 'mural|' + tod + '|' + pxm + '|b' + bq, o => o.drawImage(smearH(sharp, bq), 0, 0), w, h);
    },
    // draw the wall square on as it passes a side window: u = the wall's metre at screen x; yGround = the screen y of its foot
    pass(c, g, o) { o = o || {}; const pxm = Math.round(o.pxm || 60), cv = muralAPI.canvas(c, o.tod, pxm, o.blur); g.drawImage(cv, (o.x || 0) - (o.u || 0) * pxm, (o.yGround == null ? 700 : o.yGround) - 3.3 * pxm); },
  };

  SETS.nursery = {
    mural: muralAPI,
    views: { c3: C3, door: DOORV, entrance: ENTR, boarded: BOARD, notice: NOTE, window: WINV, handle: HANDLEV, blink: BLINKV, carpark: PARKV, building: BUILDV, arrive: ARRIVEV, playground: PLAYV },
    demos: [
      { name: 'mural: elevation (morning / evening / dusk)', draw(c, t) { const g = c.g; g.fillStyle = '#2A3440'; g.fillRect(0, 0, W, H);
        ['morning', 'evening', 'dusk'].forEach((tod, i) => { const cv = cache(c, 'test|elev|' + tod, o => elevation(o, 0, 32, 60, tod), 1920, 264); g.drawImage(cv, 0, 40 + i * 340); }); } },
      { name: 'mural: as Q06 blurs it past the window (morning)', draw(c, t) { const g = c.g; g.fillStyle = '#9AA8AC'; g.fillRect(0, 0, W, H); g.fillStyle = '#6E7A7C'; g.fillRect(0, 700, W, 380);
        muralAPI.pass(c, g, { tod: 'morning', pxm: 120, x: 0, u: 6 + t * 2, yGround: 520 }); muralAPI.pass(c, g, { tod: 'morning', pxm: 120, x: 0, u: 6 + t * 2, yGround: 1000, blur: 160 }); } },
      { name: 'mural: entrance detail (evening)', draw(c, t) { const g = c.g; g.fillStyle = '#2A3440'; g.fillRect(0, 0, W, H);
        const cv = cache(c, 'test|elevE', o => elevation(o, 8.4, 17.0, 220, 'evening', { ridge: 3.15 }), 1892, 968); g.drawImage(cv, 14, 50); } },
      { name: 'entrance: evening', draw(c, t) { const v = ENTR, s = { tod: 'evening' }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'entrance: dusk', draw(c, t) { const v = ENTR, s = { tod: 'dusk' }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'boarded: evening', draw(c, t) { const v = BOARD, s = { tod: 'evening' }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'notice: insert', post: { vig: 0.35 }, draw(c, t) { const v = NOTE, s = { tod: 'evening' }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'notice: his face in the sheen (stand-in)', post: { vig: 0.35 }, draw(c, t) { const v = NOTE, s = { tod: 'evening', reflect: standInHeadFront }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'window: the black mirror', post: { vig: 0.45 }, draw(c, t) { const v = WINV, s = {}; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'window: his reflection (stand-in)', post: { vig: 0.45 }, draw(c, t) { const v = WINV, s = { reflect: standInFigureFront, dist: 6 }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'handle: LOCKED, the yank (stand-ins)', post: { vig: 0.45 }, draw(c, t) { const v = HANDLEV, s = { pull: 1, jolt: 0.4, reflect: standInHeadFront }; v.back(c, t, s); standInHand(c.g, v.at(s)); v.front(c, t, s); } },
      { name: 'blink: BEEP, amber into the dusk', post: { vig: 0.45 }, draw(c, t) { const v = BLINKV, s = { blink: 1 }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'blink: the remote (focus on the hand)', post: { vig: 0.45 }, draw(c, t) { const v = BLINKV, s = { blink: 0.6, focus: 1 }; v.back(c, t, s); standInRemote(c.g, v.at(s)); v.front(c, t, s); } },
      { name: 'carpark: his car alone', post: { vig: 0.45 }, draw(c, t) { const v = PARKV, s = {}; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'carpark: the locks answer (blink)', post: { vig: 0.45 }, draw(c, t) { const v = PARKV, s = { blink: 1 }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'building: evening', draw(c, t) { const v = BUILDV, s = { tod: 'evening' }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'building: dusk', draw(c, t) { const v = BUILDV, s = { tod: 'dusk' }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'arrive: braking (slide 3 m, blur)', draw(c, t) { const v = ARRIVEV, s = { slide: 3, blur: 0.8, dip: 0.6 }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'arrive: stopped, in focus', draw(c, t) { const v = ARRIVEV, s = { slide: 0 }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'playground: silent', post: { vig: 0.45, halation: 0.6 }, draw(c, t) { const v = PLAYV, s = { tod: 'evening' }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'door: open 0 (he pulls)', post: { vig: 0.45 }, draw(c, t) { const v = DOORV, s = { open: 0 }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'door: open 0.5', post: { vig: 0.45 }, draw(c, t) { const v = DOORV, s = { open: 0.5 }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'door: open (A106, stand-in)', post: { vig: 0.45 }, draw(c, t) { const v = DOORV, s = { open: 1, figure: standInStoop }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'door: open, empty', post: { vig: 0.45 }, draw(c, t) { const v = DOORV, s = { open: 1 }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'rigtest: c3 kneel', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, t) { const s = { set: 0.3, figure: (g, a) => RIG.draw(g, 'daniel', { at: a.kneel, scale: a.k, view: 'profile', body: 'kneel', armR: 'reachIn', armL: 'down', head: { nod: 0.8 }, face: 'down', collar: 'crooked' }, { mode: 'silhouette', light: { x: a.light.x, y: a.light.y, color: a.light.color } }) }; C3.back(c, t, s); C3.front(c, t, s); } },
      { name: 'rigtest: door stoop', post: { vig: 0.45 }, draw(c, t) { const v = DOORV, s = { open: 1, figure: (g, a) => RIG.draw(g, 'daniel', { at: a.feet, scale: a.k * 0.86, view: 'profile', body: 'stand', lean: 0.9, armR: 'reachLow', armL: 'down', head: { nod: 0.7 }, face: 'down', eyes: 'down', collar: 'crooked' }, { light: { x: a.light.x, y: a.light.y, color: a.light.color, back: 0.85 } }) }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'rigtest: window reflection', post: { vig: 0.45 }, draw(c, t) { const v = WINV, s = { dist: 6, reflect: (g, a) => RIG.draw(g, 'daniel', { at: [a.reflection.x, a.reflection.y], scale: a.reflection.k, view: 'front', body: 'stand', face: 'drained' }, { light: { x: a.light.x, y: a.light.y, color: a.light.color, back: 0.6 } }) }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'c3: set 0 (the disc whole)', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, t) { const v = C3, s = { set: 0, figure: standInKneel }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'c3: set 0.3 (the style frame)', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, t) { const v = C3, s = { set: 0.3, figure: standInKneel }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'c3: set 0.55 (the last sliver)', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, t) { const v = C3, s = { set: 0.55, figure: standInKneel }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'c3: set 0.75 (afterglow)', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, t) { const v = C3, s = { set: 0.75, figure: standInKneel }; v.back(c, t, s); v.front(c, t, s); } },
      { name: 'c3: set 1 (teal-black)', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, t) { const v = C3, s = { set: 1, figure: standInKneel }; v.back(c, t, s); v.front(c, t, s); } },
    ],
  };
})();
