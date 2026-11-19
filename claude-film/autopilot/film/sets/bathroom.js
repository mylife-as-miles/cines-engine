/* AUTOPILOT — set: THE BATHROOM (Q03, the routine: a montage on a mechanical rhythm), and the wardrobe's mirrored door.
   Look C, "Through Glass". A cool teal room, tiled, its own frosted window giving a flat cool light. The morning sun reaches
   it only as a reflection: the landing window, blazing through the open bathroom door behind the lens, laid warm in the
   shower glass, until the steam burns it off. Every view is a pane: the shower door's glass, the steamed mirror with its
   wiped band, the chrome of the mixer, the gloss of the door round the towel hook, the wardrobe's mirror sliding away.
   Bathroom space (metres): x across, y up, z away from the lens. The set draws the environment only: characters come
   from RIG and are drawn by the sequences between back() and front(); figures seen THROUGH fogged glass go through
   v.behind(c, s, fn) so they blur, figures seen IN a mirror or chrome go through v.inGlass(c, s, fn).
   See film/api/bathroom.md. Deterministic: OTM.rng / OTM.vnoise / OTM.fbm only. */
(function () {
  'use strict';
  const { W, H } = OTM, P = LC.P;
  const M = 32;
  const clamp = OTM.clamp, lerp = OTM.lerp, mix = OTM.mix, rgba = OTM.rgba;
  const seg = (t, a, b) => clamp((t - a) / (b - a || 1e-6), 0, 1);
  const sstep = (t, a, b) => { const u = seg(t, a, b); return u * u * (3 - 2 * u); };

  // ---------------------------------------------------------------------------------------------------------------
  // small kit
  // ---------------------------------------------------------------------------------------------------------------
  const bigCache = (c, key, fn) => c.cache(key, g => { g.translate(M, M); fn(g); }, W + 2 * M, H + 2 * M);
  const drawBig = (c, cv, a) => { if (a != null && a < 1) { c.g.save(); c.g.globalAlpha = Math.max(0, a); c.g.drawImage(cv, -M, -M); c.g.restore(); } else c.g.drawImage(cv, -M, -M); };
  const mkCam = o => Object.assign(LC.camera(o), { pos: o });
  const kAt = (cam, x, y, z) => cam.f / Math.max(0.05, cam.p(x, y, z)[2]);
  function clipPts(cam, pts) {
    const NEAR = 0.06, d = pts.map(q => cam.p(q)[2]), out = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], da = d[i], db = d[(i + 1) % pts.length];
      if (da >= NEAR) out.push(a);
      if ((da >= NEAR) !== (db >= NEAR)) { const u = (NEAR - da) / (db - da); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]); } }
    return out.map(q => cam.p(q));
  }
  function Qc(g, cam, pts, col) { const q = clipPts(cam, pts); if (q.length < 3) return null; const p = LC.pathPts(q); g.fillStyle = col; g.fill(p); return p; }
  const seg2 = (g, cam, a, b, w, col) => { const p = cam.p(a), q = cam.p(b); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); };
  const mirrorZ = (cam, zp) => { const p = (x, y, z) => { if (Array.isArray(x)) { z = x[2]; y = x[1]; x = x[0]; } return cam.p(x, y, 2 * zp - z); }; return { p, pts: a => a.map(q => p(q)), f: cam.f, cx: cam.cx, cy: cam.cy, pos: cam.pos, mirror: true }; };
  const _scr = {};
  function scratch(name, w, h) { let c = _scr[name]; if (!c || c.width !== w || c.height !== h) c = _scr[name] = OTM.makeCanvas(w, h); const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, w, h); return g; }
  // tiles on a plane: a flat field with grout lines (three values: the field, a darker grout, a lit edge where told)
  function tiles(g, cam, corners, nu, nv, col, grout, o) {
    o = o || {}; const p = Qc(g, cam, corners, col); if (!p) return; g.save(); g.clip(p);
    const L = (u, v) => { const a = corners[0], b = corners[1], c2 = corners[2], d = corners[3]; return [0, 1, 2].map(k => lerp(lerp(a[k], b[k], u), lerp(d[k], c2[k], u), v)); };
    g.strokeStyle = grout; g.lineWidth = o.w || 1.2;
    for (let i = 1; i < nu; i++) { const u = i / nu; for (let j = 0; j < nv; j++) { const off = o.brick && j % 2 ? 0.5 / nu : 0; seg2(g, cam, L(u + off, j / nv), L(u + off, (j + 1) / nv), o.w || 1.2, grout); } }
    for (let j = 1; j < nv; j++) { const v = j / nv; seg2(g, cam, L(0, v), L(1, v), o.w || 1.2, grout); }
    g.restore();
  }
  // a mottled fog texture (quarter resolution, smooth when scaled up), made once
  let _fogTex = null;
  function fogTex() {
    if (_fogTex) return _fogTex; const w = W / 4, h = H / 4, c = OTM.makeCanvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = OTM.fbm(x * 0.025, y * 0.04, 77, 4), m = OTM.fbm(x * 0.16, y * 0.12, 91, 2), v = clamp(0.55 + (n - 0.5) * 0.55 + (m - 0.5) * 0.16, 0, 1), o = (y * w + x) * 4;
      d[o] = 214 + v * 30; d[o + 1] = 224 + v * 24; d[o + 2] = 224 + v * 22; d[o + 3] = Math.round(255 * clamp(0.74 + 0.26 * v, 0, 1)); }
    g.putImageData(img, 0, 0); return (_fogTex = c);
  }
  // fog on a pane: density 0..1, rising from the bottom (rise 0..1 how high it has climbed), clear runnels cut through it
  function fogLayer(region, density, rise, runnels, t, seed) {
    if (density <= 0.001) return null; const g = scratch('fog', W / 2, H / 2); g.scale(0.5, 0.5);
    g.save(); g.clip(region); g.imageSmoothingEnabled = true; g.drawImage(fogTex(), 0, 0, W, H); g.restore();
    // the steam climbs: full below its front, a thin breath above it
    g.globalCompositeOperation = 'destination-in';
    const top = H * (1 - rise * 1.2); g.fillStyle = LC.lin(g, 0, top - 300, 0, top + 160, [[0, '#000000', 0.18 * density * clamp(rise * 1.5, 0, 1)], [1, '#000000', density]]); g.fillRect(0, 0, W, H);
    // runnels: water has run down through it, nearly straight, leaving clear lines that widen to a bead at the foot
    if (runnels && runnels.n > 0) { const R = OTM.rng(seed || 'runnels'); g.lineCap = 'round'; const lines = [];
      for (let i = 0; i < runnels.n; i++) { const x0 = runnels.x0 + R() * (runnels.x1 - runnels.x0), y0 = runnels.y0 + R() * 220, len = (0.35 + R() * 0.65) * (runnels.y1 - y0) * clamp(runnels.grow, 0, 1), w = 4 + R() * 5, ph = R() * 9; lines.push([x0, y0, len, w, ph]); }
      g.globalCompositeOperation = 'destination-out';
      lines.forEach(([x0, y0, len, w, ph]) => { g.strokeStyle = 'rgba(0,0,0,0.95)'; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); for (let y = y0; y <= y0 + len; y += 24) g.lineTo(x0 + 2.5 * Math.sin(y * 0.013 + ph), y); g.stroke();
        g.fillStyle = '#000000'; g.beginPath(); g.ellipse(x0 + 2.5 * Math.sin((y0 + len) * 0.013 + ph), y0 + len, w * 0.9, w * 1.2, 0, 0, Math.PI * 2); g.fill(); });
      g.globalCompositeOperation = 'source-over';
      lines.forEach(([x0, y0, len, w, ph]) => { g.strokeStyle = 'rgba(240,248,246,0.55)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0 - w / 2, y0); for (let y = y0; y <= y0 + len; y += 24) g.lineTo(x0 - w / 2 + 2.5 * Math.sin(y * 0.013 + ph), y); g.stroke(); }); }
    g.globalCompositeOperation = 'source-over'; return g.canvas;
  }
  const drawFog = (g, fog) => { g.save(); g.imageSmoothingEnabled = true; g.drawImage(fog, 0, 0, W, H); g.restore(); };
  // droplets on glass: beads with a dark lower rim and a bright fleck, some running (t)
  function droplets(g, region, box, n, seed, t, run) {
    const R = OTM.rng(seed); g.save(); g.clip(region);
    for (let i = 0; i < n; i++) { let x = box.x + R() * box.w, y = box.y + R() * box.h; const r = 1.5 + Math.pow(R(), 3) * 7, sp = R(), runs = run && sp > 0.82;
      if (runs) { y = box.y + ((y - box.y + t * (60 + 140 * R()) * run) % box.h); g.strokeStyle = 'rgba(214,226,224,0.18)'; g.lineWidth = r * 0.8; g.beginPath(); g.moveTo(x, y - 60 - 80 * R()); g.lineTo(x + 2, y); g.stroke(); }
      g.fillStyle = 'rgba(24,34,36,0.35)'; g.beginPath(); g.ellipse(x, y + r * 0.25, r, r * 1.1, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(214,226,224,0.28)'; g.beginPath(); g.ellipse(x, y, r * 0.9, r, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.35, Math.max(0.6, r * 0.25), 0, Math.PI * 2); g.fill(); }
    g.restore();
  }

  // palette for the room
  const TILE = '#A3B4AE', TILE_SH = '#7E918C', GROUT = 'rgba(70,88,86,0.55)', WALLP = '#8FA29E', WOOD_W = '#C9D2CE';

  // =================================================================================================================
  // VIEW: the shower door's glass (Q03 2-15): water streaks; steam blooming from the bottom and fogging over; a figure behind
  // =================================================================================================================
  const showerCam = mkCam({ x: 0.05, y: 1.45, z: -1.75, yaw: 0, pitch: 0.0, f: 1300, cx: W / 2, cy: H / 2 });
  const CUB = { x0: -0.48, x1: 0.48, z0: 0, z1: 0.92, h: 2.05 };
  function cubicle(g, cam) {
    const Q = (pts, col) => Qc(g, cam, pts, col);
    g.fillStyle = '#1E2A2A'; g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
    // the bathroom wall either side (tiles to 1.2 m, paint above), the cubicle's interior beyond the glass
    tiles(g, cam, [[-2.2, 1.25, 0.02], [CUB.x0 - 0.05, 1.25, 0.02], [CUB.x0 - 0.05, 0, 0.02], [-2.2, 0, 0.02]], 9, 6, TILE_SH, GROUT, { brick: true });
    tiles(g, cam, [[CUB.x1 + 0.05, 1.25, 0.02], [2.2, 1.25, 0.02], [2.2, 0, 0.02], [CUB.x1 + 0.05, 0, 0.02]], 9, 6, TILE_SH, GROUT, { brick: true });
    Q([[-2.2, 1.25, 0.02], [CUB.x0 - 0.05, 1.25, 0.02], [CUB.x0 - 0.05, 2.5, 0.02], [-2.2, 2.5, 0.02]], '#6E827E'); Q([[CUB.x1 + 0.05, 1.25, 0.02], [2.2, 1.25, 0.02], [2.2, 2.5, 0.02], [CUB.x1 + 0.05, 2.5, 0.02]], '#647874');
    // inside: back wall and side walls tiled to the ceiling, the tray, the riser rail and the rose, the mixer on the right wall
    tiles(g, cam, [[CUB.x0, CUB.h, CUB.z1], [CUB.x1, CUB.h, CUB.z1], [CUB.x1, 0.1, CUB.z1], [CUB.x0, 0.1, CUB.z1]], 5, 10, TILE, GROUT, { brick: true });
    tiles(g, cam, [[CUB.x0, CUB.h, 0], [CUB.x0, CUB.h, CUB.z1], [CUB.x0, 0.1, CUB.z1], [CUB.x0, 0.1, 0]], 5, 10, '#91A39E', GROUT, { brick: true });
    tiles(g, cam, [[CUB.x1, CUB.h, CUB.z1], [CUB.x1, CUB.h, 0], [CUB.x1, 0.1, 0], [CUB.x1, 0.1, CUB.z1]], 5, 10, '#B5C4BF', GROUT, { brick: true });
    Q([[CUB.x0, 0.1, 0], [CUB.x1, 0.1, 0], [CUB.x1, 0.1, CUB.z1], [CUB.x0, 0.1, CUB.z1]], '#C6D0CC');
    Q([[CUB.x0, 0.0, 0], [CUB.x1, 0.0, 0], [CUB.x1, 0.1, 0], [CUB.x0, 0.1, 0]], '#E2E8E4');
    seg2(g, cam, [0.12, 1.0, CUB.z1 - 0.03], [0.12, 2.0, CUB.z1 - 0.03], 6, '#C9D2D0'); seg2(g, cam, [0.128, 1.0, CUB.z1 - 0.03], [0.128, 2.0, CUB.z1 - 0.03], 2, '#FFFFFF');
    { const c0 = cam.p(0.12, 1.98, CUB.z1 - 0.12), k = kAt(cam, 0.12, 1.98, 0.8); g.fillStyle = '#5E6A6A'; g.beginPath(); g.ellipse(c0[0], c0[1], 0.1 * k, 0.03 * k, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#E6EEEC'; g.beginPath(); g.ellipse(c0[0], c0[1] - 0.005 * k, 0.1 * k, 0.025 * k, 0, Math.PI, Math.PI * 2); g.fill(); }
    { const c0 = cam.p(CUB.x1 - 0.01, 1.1, 0.45), k = kAt(cam, CUB.x1, 1.1, 0.45); g.fillStyle = '#B9C4C2'; g.beginPath(); g.ellipse(c0[0], c0[1], 0.02 * k, 0.07 * k, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#F2F6F4'; g.beginPath(); g.ellipse(c0[0] - 0.004 * k, c0[1] - 0.02 * k, 0.008 * k, 0.03 * k, 0, 0, Math.PI * 2); g.fill(); }
    // the cubicle's light: a cool wash from the frosted window over the left wall's top
    g.save(); g.globalCompositeOperation = 'screen'; const a = cam.p(CUB.x0, 2.0, 0.4); g.fillStyle = LC.rad(g, a[0], a[1], 0, 700, [[0, '#DCE8E6', 0.18], [1, '#DCE8E6', 0]]); g.fillRect(-M, -M, W + 2 * M, H + 2 * M); g.restore();
  }
  const glassRegion = cam => LC.pathPts(clipPts(cam, [[CUB.x0, CUB.h, 0], [CUB.x1, CUB.h, 0], [CUB.x1, 0.1, 0], [CUB.x0, 0.1, 0]]));
  const shower = {
    cam: showerCam,
    back(c, t, s) {
      s = s || {}; const g = c.g, cam = showerCam, water = clamp(s.water == null ? 1 : s.water, 0, 1);
      drawBig(c, bigCache(c, 'bathroom:cubicle', gg => cubicle(gg, cam)));
      // the spray: fine falling lines from the rose, a splash at the tray (on ones)
      if (water > 0) { const R = OTM.rng('spray'), top = cam.p(0.12, 1.96, CUB.z1 - 0.12), k = kAt(cam, 0.12, 1.5, 0.75); g.save(); g.clip(glassRegion(cam)); g.lineCap = 'round';
        for (let i = 0; i < 90; i++) { const ang = (R() - 0.5) * 0.5, ph = R(), sp = 1.6 + R(), u = (t * sp + ph) % 1, x = top[0] + Math.sin(ang) * u * 1.6 * k, y = top[1] + u * 1.75 * k, L = 0.08 * k;
          g.strokeStyle = rgba('#E8F0EE', (0.18 + 0.3 * R()) * water); g.lineWidth = 1 + R() * 1.5; g.beginPath(); g.moveTo(x, y - L); g.lineTo(x + Math.sin(ang) * L * 0.4, y); g.stroke(); }
        g.restore(); }
    },
    // a figure behind the fogged glass: fn(g) draws it in frame coordinates; it is blurred (quarter resolution) and veiled
    behind(c, s, fn) {
      s = s || {}; const steam = clamp(s.steam == null ? 0.6 : s.steam, 0, 1), q = scratch('showerFig', W / 4, H / 4); q.save(); q.scale(0.25, 0.25); fn(q); q.restore();
      const b = scratch('showerFigB', W / 4, H / 4); b.filter = `blur(${(0.8 + steam * 2.0).toFixed(1)}px)`; b.drawImage(q.canvas, 0, 0); b.filter = 'none';
      // through the condensation a body reads as a darker, warmer mass: deepen it before it goes under the fog
      b.globalCompositeOperation = 'source-atop'; b.fillStyle = 'rgba(70,46,36,0.35)'; b.fillRect(0, 0, W / 4, H / 4); b.globalCompositeOperation = 'source-over';
      const g = c.g; g.save(); g.clip(glassRegion(showerCam)); g.imageSmoothingEnabled = true; g.drawImage(b.canvas, 0, 0, W, H); g.restore();
    },
    front(c, t, s) {
      s = s || {}; const g = c.g, cam = showerCam, steam = clamp(s.steam == null ? 0.5 : s.steam, 0, 1), water = clamp(s.water == null ? 1 : s.water, 0, 1), streams = clamp(s.streams || 0, 0, 1);
      const reg = glassRegion(cam), box = (() => { const a = cam.p(CUB.x0, CUB.h, 0), b = cam.p(CUB.x1, 0.1, 0); return { x: a[0], y: a[1], w: b[0] - a[0], h: b[1] - a[1] }; })();
      // the landing window, blazing through the open door behind us, laid warm in the glass, and burnt off as the steam climbs
      const warm = 1 - sstep(steam, 0.15, 0.85);
      if (warm > 0) { g.save(); g.clip(reg); g.globalCompositeOperation = 'screen';
        const r0 = cam.p(-0.32, 1.95, 0), r1 = cam.p(0.05, 1.05, 0); g.globalAlpha = 0.55 * warm; g.fillStyle = LC.lin(g, 0, r0[1], 0, r1[1], [[0, P.sunWhite], [0.6, P.sunCream], [1, P.honey]]); g.fillRect(r0[0], r0[1], r1[0] - r0[0], r1[1] - r0[1]);
        g.fillStyle = rgba('#2A1C12', 1); g.globalCompositeOperation = 'multiply'; const m = (r0[0] + r1[0]) / 2; g.fillRect(m - 6, r0[1], 12, r1[1] - r0[1]); g.fillRect(r0[0], (r0[1] + r1[1]) / 2 - 6, r1[0] - r0[0], 12);
        g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.25 * warm; g.fillStyle = LC.rad(g, (r0[0] + r1[0]) / 2, (r0[1] + r1[1]) / 2, 0, 520, [[0, P.honey, 1], [1, P.honey, 0]]); g.fillRect(box.x, box.y, box.w, box.h); g.restore();
        const E = c.em; E.save(); E.globalAlpha = 0.5 * warm; E.fillStyle = P.sunCream; E.fillRect(r0[0], r0[1], r1[0] - r0[0], r1[1] - r0[1]); E.restore(); }
      // the steam, its runnels, the glow it takes from the light; water beads and runs
      const fog = fogLayer(reg, 0.8 * sstep(steam, 0, 0.9), clamp(steam * 1.15, 0, 1), { n: Math.round(16 * streams), x0: box.x + 30, x1: box.x + box.w - 30, y0: box.y + box.h * 0.12, y1: box.y + box.h, grow: streams }, t, 'showerRun');
      if (fog) { drawFog(g, fog); if (warm < 1) { g.save(); g.clip(reg); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.35 * sstep(steam, 0.3, 1); const r = cam.p(-0.14, 1.5, 0); g.fillStyle = LC.rad(g, r[0], r[1], 0, 600, [[0, '#F6E3BC', 0.6], [1, '#F6E3BC', 0]]); g.fillRect(box.x, box.y, box.w, box.h); g.restore(); } }
      droplets(g, reg, box, Math.round(60 + 160 * water), 'showerDrops', t, water);
      // the glass's edges, its chrome handle bar and hinges, a long faint sheen
      LC.glare(g, reg, { x: box.x + box.w * 0.6, y: box.y + box.h * 0.5, angle: -1.15, color: '#FFFFFF', bands: [{ d: -60, w: 70, a: 0.04 }, { d: 20, w: 12, a: 0.06 }] });
      g.save(); g.strokeStyle = 'rgba(214,232,228,0.55)'; g.lineWidth = 4; g.stroke(reg); g.restore();
      const h0 = cam.p(CUB.x1 - 0.1, 1.35, -0.04), h1 = cam.p(CUB.x1 - 0.1, 0.85, -0.04), k = kAt(cam, CUB.x1, 1.1, 0); g.lineCap = 'round';
      g.strokeStyle = '#3E4848'; g.lineWidth = 0.028 * k; g.beginPath(); g.moveTo(h0[0], h0[1]); g.lineTo(h1[0], h1[1]); g.stroke(); g.strokeStyle = '#E6EEEC'; g.lineWidth = 0.008 * k; g.beginPath(); g.moveTo(h0[0] - 0.006 * k, h0[1]); g.lineTo(h1[0] - 0.006 * k, h1[1]); g.stroke();
      [1.85, 0.35].forEach(y => { const p = cam.p(CUB.x0 + 0.02, y, -0.01); g.fillStyle = '#C9D2D0'; g.fill(LC.rrect(p[0] - 0.02 * k, p[1] - 0.05 * k, 0.05 * k, 0.1 * k, 4)); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(p[0] - 0.012 * k, p[1] - 0.04 * k, 0.008 * k, 0.08 * k); });
      // the bottom of the frame stays dark (the tray's lip, the floor): calm for type
      g.fillStyle = LC.lin(g, 0, 880, 0, H, [[0, '#0A0F10', 0], [1, '#0A0F10', 0.5]]); g.fillRect(0, 880, W, H - 880);
    },
    anchors: (() => { const cam = showerCam, p = (x, y, z) => cam.p(x, y, z).slice(0, 2).map(Math.round);
      return { glass: [p(CUB.x0, CUB.h, 0), p(CUB.x1, CUB.h, 0), p(CUB.x1, 0.1, 0), p(CUB.x0, 0.1, 0)], figureFeet: p(0.0, 0.1, 0.45), figureHead: p(0.0, 1.78, 0.45), pxPerM: Math.round(kAt(cam, 0, 1, 0.45)), rose: p(0.12, 1.98, CUB.z1 - 0.12) }; })(),
    light: { x: 560, y: 120, color: '#DCE8E6', note: 'the frosted window, high on the left (cool); behind the glass the figure is a soft shape' },
  };

  // =================================================================================================================
  // VIEW: the mirror over the sink (Q03 10-17, 39-42): steamed; a band wiped clear; half a face, foam, the toothbrush;
  //       as he leaves, the door behind in the glass and the band fogging over
  // =================================================================================================================
  const mirCam = mkCam({ x: 0.22, y: 1.5, z: -0.62, yaw: -0.16, pitch: -0.05, f: 1350, cx: W / 2, cy: H / 2 });
  const MIR = { x0: -0.42, x1: 0.42, y0: 1.08, y1: 1.88, z: 0 };
  // the bathroom behind the lens, as the mirror gives it back: the door (left, open on the landing's light), the towel rail, the shower glass
  function bathBehind(g, cam, s) {
    const Q = (pts, col) => Qc(g, cam, pts, col), door = clamp(s.door == null ? 0.35 : s.door, 0, 1);
    const ZB = -2.3;     // the wall behind the lens (in mirror space it lies beyond the glass)
    g.fillStyle = '#2E3E3E'; g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
    Q([[-1.4, 0, ZB], [1.4, 0, ZB], [1.4, 2.4, ZB], [-1.4, 2.4, ZB]], '#6E827E');
    tiles(g, cam, [[-1.4, 1.2, ZB + 0.001], [1.4, 1.2, ZB + 0.001], [1.4, 0, ZB + 0.001], [-1.4, 0, ZB + 0.001]], 12, 6, '#8EA09B', GROUT, { brick: true });
    Q([[-1.4, 2.4, 0], [1.4, 2.4, 0], [1.4, 2.4, ZB], [-1.4, 2.4, ZB]], '#56686A');
    Q([[-1.4, 0, 0], [-1.4, 2.4, 0], [-1.4, 2.4, ZB], [-1.4, 0, ZB]], '#5E7270'); Q([[1.4, 0, 0], [1.4, 2.4, 0], [1.4, 2.4, ZB], [1.4, 0, ZB]], '#54686A');
    // the door (left): the opening onto the landing, warm; the leaf swung open toward the room
    const dx0 = -1.1, dx1 = -0.3;
    Q([[dx0, 0, ZB + 0.002], [dx1, 0, ZB + 0.002], [dx1, 2.02, ZB + 0.002], [dx0, 2.02, ZB + 0.002]], door > 0.02 ? '#C98F55' : '#B9C4C0');
    if (door > 0.02) { Q([[dx0 + 0.1, 0.3, ZB - 0.8], [dx1 - 0.15, 0.3, ZB - 0.8], [dx1 - 0.15, 1.6, ZB - 0.8], [dx0 + 0.1, 1.6, ZB - 0.8]], '#F2D7A6'); }
    const ang = door * 1.4, L = (u, y) => [dx1 - Math.cos(ang) * (dx1 - dx0) * u, y, ZB + Math.sin(ang) * (dx1 - dx0) * u];
    Q([L(0, 0), L(1, 0), L(1, 2.0), L(0, 2.0)], '#C3CCC8'); Q([L(0.08, 0.15), L(0.92, 0.15), L(0.92, 0.95), L(0.08, 0.95)], '#B4BEBA'); Q([L(0.08, 1.05), L(0.92, 1.05), L(0.92, 1.85), L(0.08, 1.85)], '#B4BEBA');
    { const hk = L(0.5, 1.72), k = kAt(cam, hk[0], hk[1], hk[2]); const c0 = cam.p(hk[0], hk[1], hk[2]); g.fillStyle = '#E6ECEA'; g.beginPath(); g.arc(c0[0], c0[1], 0.02 * k, 0, Math.PI * 2); g.fill(); }
    // the towel rail and a towel; the shower's glass (right), fogged
    Q([[0.0, 1.1, ZB + 0.06], [0.6, 1.1, ZB + 0.06], [0.6, 0.5, ZB + 0.06], [0.0, 0.5, ZB + 0.06]], '#D8DEDA');
    Q([[0.75, 0.05, ZB + 0.9], [1.38, 0.05, ZB + 0.9], [1.38, 2.0, ZB + 0.9], [0.75, 2.0, ZB + 0.9]], '#B9C8C4');
    // the warm light from the landing through the door, on the floor
    if (door > 0.02) Q([[dx0, 0.002, ZB], [dx1, 0.002, ZB], [dx1 + 0.4, 0.002, ZB + 1.4], [dx0 + 0.2, 0.002, ZB + 1.4]], '#9C7A54');
  }
  const mirRegion = cam => LC.pathPts(clipPts(cam, [[MIR.x0, MIR.y1, MIR.z], [MIR.x1, MIR.y1, MIR.z], [MIR.x1, MIR.y0, MIR.z], [MIR.x0, MIR.y0, MIR.z]]));
  const mirBand = (cam, s) => {      // the wiped band (frame coords) and how far the wipe has got (0..1, left to right)
    const yc = s.bandY == null ? 1.52 : s.bandY, hh = s.bandH == null ? 0.17 : s.bandH, w = clamp(s.wipe == null ? 1 : s.wipe, 0, 1);
    const xa = MIR.x0 + 0.03, xb = xa + (MIR.x1 - 0.03 - xa) * w, N = 22, nz = (i, k) => 0.006 * (OTM.vnoise(i * 0.7, k, 13) - 0.5) + 0.004 * (OTM.vnoise(i * 2.3, k + 5, 13) - 0.5);
    const pts = []; for (let i = 0; i <= N; i++) { const u = i / N, x = lerp(xa, xb, u), arch = 0.012 * Math.sin(Math.PI * u); pts.push(cam.p(x, yc + hh / 2 + arch + nz(i, 1), MIR.z)); }
    const endR = cam.p(xb + 0.025, yc, MIR.z); pts.push([endR[0], endR[1]]);
    for (let i = N; i >= 0; i--) { const u = i / N, x = lerp(xa, xb, u), arch = 0.008 * Math.sin(Math.PI * u); pts.push(cam.p(x, yc - hh / 2 + arch + nz(i, 7), MIR.z)); }
    const endL = cam.p(xa - 0.025, yc, MIR.z); pts.push([endL[0], endL[1]]);
    return { path: LC.smooth(pts.map(q => [q[0], q[1]])), w };
  };
  const mirror = {
    cam: mirCam,
    back(c, t, s) {
      s = s || {}; const g = c.g, cam = mirCam, mc = mirrorZ(cam, MIR.z), dq = Math.round(clamp(s.door == null ? 0.35 : s.door, 0, 1) * 16) / 16;
      drawBig(c, bigCache(c, 'bathroom:mirrorRoom', gg => {
        gg.fillStyle = '#26332F'; gg.fillRect(-M, -M, W + 2 * M, H + 2 * M);
        tiles(gg, cam, [[-1.2, 1.25, 0.002], [1.2, 1.25, 0.002], [1.2, 0.0, 0.002], [-1.2, 0.0, 0.002]], 10, 6, TILE_SH, GROUT, { brick: true });
        Qc(gg, cam, [[-1.2, 1.25, 0.002], [1.2, 1.25, 0.002], [1.2, 2.4, 0.002], [-1.2, 2.4, 0.002]], '#6E827E');
        // the sink: a white basin on a shelf, the chrome mixer, a glass with the toothbrush, soap
        Qc(gg, cam, [[-0.5, 0.9, -0.02], [0.5, 0.9, -0.02], [0.5, 0.92, -0.48], [-0.5, 0.92, -0.48]], '#D4DCD8');
        Qc(gg, cam, [[-0.5, 0.78, -0.48], [0.5, 0.78, -0.48], [0.5, 0.92, -0.48], [-0.5, 0.92, -0.48]], '#A9B6B2');
        { const c0 = cam.p(0, 0.92, -0.26), k = kAt(cam, 0, 0.92, -0.26); gg.fillStyle = '#9AA8A4'; gg.beginPath(); gg.ellipse(c0[0], c0[1], 0.2 * k, 0.05 * k, 0, 0, Math.PI * 2); gg.fill(); gg.fillStyle = '#6E7E7A'; gg.beginPath(); gg.ellipse(c0[0], c0[1] + 0.006 * k, 0.16 * k, 0.035 * k, 0, 0, Math.PI * 2); gg.fill(); }
        { const b0 = cam.p(0, 0.92, -0.06), b1 = cam.p(0, 1.06, -0.06), sp = cam.p(0, 1.06, -0.16), k = kAt(cam, 0, 1, -0.08); gg.strokeStyle = '#7A8886'; gg.lineWidth = 0.03 * k; gg.lineCap = 'round'; gg.beginPath(); gg.moveTo(b0[0], b0[1]); gg.lineTo(b1[0], b1[1]); gg.lineTo(sp[0], sp[1]); gg.stroke();
          gg.strokeStyle = '#EEF4F2'; gg.lineWidth = 0.008 * k; gg.beginPath(); gg.moveTo(b0[0] - 0.008 * k, b0[1]); gg.lineTo(b1[0] - 0.008 * k, b1[1] + 0.01 * k); gg.stroke(); }
        { const c0 = cam.p(0.36, 0.92, -0.1), k = kAt(cam, 0.36, 1, -0.1); gg.fillStyle = 'rgba(200,214,212,0.55)'; gg.fillRect(c0[0] - 0.035 * k, c0[1] - 0.1 * k, 0.07 * k, 0.1 * k); gg.strokeStyle = '#4E6A8A'; gg.lineWidth = 0.008 * k; gg.beginPath(); gg.moveTo(c0[0], c0[1] - 0.05 * k); gg.lineTo(c0[0] + 0.02 * k, c0[1] - 0.2 * k); gg.stroke(); gg.fillStyle = '#E2E8E6'; gg.fillRect(c0[0] + 0.012 * k, c0[1] - 0.225 * k, 0.014 * k, 0.03 * k); }
        { const c0 = cam.p(-0.36, 0.92, -0.12), k = kAt(cam, -0.36, 1, -0.12); gg.fillStyle = '#C8C2B4'; gg.beginPath(); gg.ellipse(c0[0], c0[1] - 0.012 * k, 0.045 * k, 0.018 * k, 0, 0, Math.PI * 2); gg.fill(); }
        // the mirror's frame (a thin dark edge), the glass's bevel
        Qc(gg, cam, [[MIR.x0 - 0.02, MIR.y1 + 0.02, -0.003], [MIR.x1 + 0.02, MIR.y1 + 0.02, -0.003], [MIR.x1 + 0.02, MIR.y0 - 0.02, -0.003], [MIR.x0 - 0.02, MIR.y0 - 0.02, -0.003]], '#1E2828');
      }));
      // the room in the glass (the door's state changes it)
      const room = bigCache(c, 'bathroom:mirrorRefl:' + dq, gg => bathBehind(gg, mc, { door: dq }));
      const reg = mirRegion(cam); g.save(); g.clip(reg); g.drawImage(room, -M, -M);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(198,212,208)'; g.fillRect(0, 0, W, H); g.restore();
    },
    // the reflected face (half of it, in the band), the hand, the razor, the toothbrush: fn(g) in frame coordinates, clipped
    inGlass(c, s, fn) { const g = c.g; g.save(); g.clip(mirRegion(mirCam)); fn(g, mirrorZ(mirCam, MIR.z)); g.restore(); },
    front(c, t, s) {
      s = s || {}; const g = c.g, cam = mirCam, steam = clamp(s.steam == null ? 0.85 : s.steam, 0, 1), refog = clamp(s.refog || 0, 0, 1), reg = mirRegion(cam);
      const fog = fogLayer(reg, 0.9 * steam, 1, null, t, 'mirRun');
      if (fog) { const b = mirBand(cam, s), q = scratch('mirFog', W / 2, H / 2); q.drawImage(fog, 0, 0); q.scale(0.5, 0.5);
        if (s.band !== false && b.w > 0) { q.globalCompositeOperation = 'destination-out'; q.globalAlpha = 1 - refog; q.fillStyle = '#000'; q.fill(b.path); q.globalAlpha = 1;
          // the wipe's wet rim: a brighter lip of gathered condensation at the band's edge
          q.globalCompositeOperation = 'source-over'; q.strokeStyle = rgba('#EEF4F2', 0.5 * (1 - refog)); q.lineWidth = 5; q.stroke(b.path); }
        drawFog(g, q.canvas); }
      droplets(g, reg, { x: 600, y: 120, w: 760, h: 620 }, 70, 'mirDrops', t, 0.4);
      LC.glare(g, reg, { x: 900, y: 420, angle: -1.2, color: '#FFFFFF', bands: [{ d: -80, w: 60, a: 0.035 }, { d: 10, w: 10, a: 0.05 }] });
      g.save(); g.strokeStyle = 'rgba(230,240,236,0.45)'; g.lineWidth = 2; g.stroke(reg); g.restore();
      g.fillStyle = LC.lin(g, 0, 880, 0, H, [[0, '#0A0F10', 0], [1, '#0A0F10', 0.45]]); g.fillRect(0, 880, W, H - 880);
    },
    anchors: (() => { const cam = mirCam, mc = mirrorZ(cam, MIR.z), p = (q, x, y, z) => q.p(x, y, z).slice(0, 2).map(Math.round);
      return { glass: [p(cam, MIR.x0, MIR.y1, 0), p(cam, MIR.x1, MIR.y1, 0), p(cam, MIR.x1, MIR.y0, 0), p(cam, MIR.x0, MIR.y0, 0)], band: [p(cam, MIR.x0, 1.6, 0), p(cam, MIR.x1, 1.44, 0)],
        faceInMirror: p(mc, 0.12, 1.55, -0.35), facePxPerM: Math.round(kAt(mc, 0.12, 1.55, -0.35)), doorInMirror: p(mc, -0.7, 1.0, -2.3), toothbrushInMirror: p(mc, 0.16, 1.42, -0.32) }; })(),
    light: { x: 300, y: 200, color: '#DCE8E6', note: 'the frosted window high on the left; in the glass, the landing light through the door is warm' },
  };

  // =================================================================================================================
  // VIEW: the chrome mixer (Q03 0-2 on, 17-19 off): a dome escutcheon and its lever on wet tiles; water; his reflection in it
  // =================================================================================================================
  const TAP = { cx: 900, cy: 520, r: 230 };
  function tapEnv() { return LC.env(512, 256, (e, X, Y) => {
    e.fillStyle = '#5E7270'; e.fillRect(0, 0, 512, 256); e.fillStyle = LC.lin(e, 0, 0, 0, Y(20), [[0, '#C9D4D0'], [1, '#7E928E']]); e.fillRect(0, 0, 512, Y(20));
    const R = (a0, a1, t1, t0, c) => { e.fillStyle = c; e.fillRect(X(a0), Y(t1), X(a1) - X(a0), Y(t0) - Y(t1)); };
    R(-60, -20, 50, 10, '#EEF2F0'); R(-30, 10, 30, -40, '#2A3434'); R(-14, -2, 24, -10, '#3E4A48'); R(20, 70, 40, -40, '#9AACA8'); R(30, 42, 30, -20, '#E8C79A');   // the window, the dark doorway behind him, the landing's warm slot
    e.fillStyle = LC.lin(e, 0, Y(-10), 0, 256, [[0, '#8EA09C'], [1, '#3A4646']]); e.fillRect(0, Y(-10), 512, 256); }); }
  const tap = {
    back(c, t, s) {
      s = s || {}; const g = c.g, lever = clamp(s.lever == null ? 1 : s.lever, 0, 1), flow = clamp(s.flow == null ? lever : s.flow, 0, 1);
      drawBig(c, bigCache(c, 'bathroom:tap', gg => {
        gg.fillStyle = '#5E706C'; gg.fillRect(-M, -M, W + 2 * M, H + 2 * M);
        // big wet tiles, close: three values, grout, beads of water
        for (let y = -M; y < H + M; y += 210) for (let x = -M - ((y / 210) % 2 ? 160 : 0); x < W + M; x += 320) { gg.fillStyle = mix('#8EA29D', '#9DB0AB', OTM.vnoise(x * 0.01, y * 0.01, 3)); gg.fillRect(x + 3, y + 3, 314, 204); gg.fillStyle = 'rgba(255,255,255,0.1)'; gg.fillRect(x + 3, y + 3, 314, 6); }
        gg.save(); gg.globalCompositeOperation = 'screen'; gg.fillStyle = LC.rad(gg, 200, 0, 0, 1400, [[0, '#E6F0EE', 0.3], [1, '#E6F0EE', 0]]); gg.fillRect(-M, -M, W + 2 * M, H + 2 * M); gg.restore();
        droplets(gg, new Path2D('M-40 -40 H2000 V1120 H-40 Z'), { x: 0, y: 0, w: W, h: H }, 220, 'tapTileDrops', 0, 0);
        // the escutcheon's shadow and the dome itself, environment-mapped
        gg.fillStyle = 'rgba(20,30,30,0.5)'; gg.beginPath(); gg.arc(TAP.cx + 18, TAP.cy + 26, TAP.r * 1.02, 0, Math.PI * 2); gg.fill();
        const dome = new Path2D(); dome.arc(TAP.cx, TAP.cy, TAP.r, 0, Math.PI * 2);
        LC.chrome(gg, { x: TAP.cx - TAP.r, y: TAP.cy - TAP.r, w: TAP.r * 2, h: TAP.r * 2 }, (x, y) => { const dx = (x - TAP.cx) / TAP.r, dy = (y - TAP.cy) / TAP.r, r2 = dx * dx + dy * dy; if (r2 >= 1) return null;
          const nz = Math.sqrt(1 - r2 * 0.75), n = [dx * 0.6, -dy * 0.6, nz], l = Math.hypot(n[0], n[1], n[2]); return [n[0] / l, n[1] / l, n[2] / l]; }, LC.sampler(tapEnv()), { ss: 2, gain: 0.95, fresnel: 0.3, clip: dome });
        gg.strokeStyle = 'rgba(240,246,244,0.6)'; gg.lineWidth = 4; gg.beginPath(); gg.arc(TAP.cx, TAP.cy, TAP.r - 2, Math.PI * 0.95, Math.PI * 1.6); gg.stroke();
        gg.fillStyle = '#B9C4C2'; gg.beginPath(); gg.arc(TAP.cx, TAP.cy, 62, 0, Math.PI * 2); gg.fill(); gg.fillStyle = '#E8EEEC'; gg.beginPath(); gg.arc(TAP.cx - 10, TAP.cy - 12, 40, 0, Math.PI * 2); gg.fill();
      }));
      // the lever: a chrome bar from the hub; off points down, on swings it up and round (on ones: the hand turns it)
      const a = lerp(Math.PI / 2, -0.35, sstep(lever, 0, 1)), L = 380, x1 = TAP.cx + Math.cos(a) * L, y1 = TAP.cy + Math.sin(a) * L, nx = -Math.sin(a), ny = Math.cos(a);
      g.save(); g.fillStyle = 'rgba(20,30,30,0.35)'; g.beginPath(); g.moveTo(TAP.cx + nx * 34 + 18, TAP.cy + ny * 34 + 26); g.lineTo(x1 + nx * 22 + 18, y1 + ny * 22 + 26); g.lineTo(x1 - nx * 22 + 18, y1 - ny * 22 + 26); g.lineTo(TAP.cx - nx * 34 + 18, TAP.cy - ny * 34 + 26); g.closePath(); g.fill();
      const bar = new Path2D(); bar.moveTo(TAP.cx + nx * 34, TAP.cy + ny * 34); bar.lineTo(x1 + nx * 22, y1 + ny * 22); bar.arc(x1, y1, 22, a + Math.PI / 2, a - Math.PI / 2, true); bar.lineTo(TAP.cx - nx * 34, TAP.cy - ny * 34); bar.closePath();
      g.fillStyle = LC.lin(g, TAP.cx + nx * 34, TAP.cy + ny * 34, TAP.cx - nx * 34, TAP.cy - ny * 34, [[0, '#2E3838'], [0.22, '#F2F6F4'], [0.38, '#9AAAA6'], [0.6, '#3E4A48'], [0.82, '#B9A486'], [1, '#262E2E']]); g.fill(bar);
      g.strokeStyle = 'rgba(10,16,16,0.45)'; g.lineWidth = 1.5; g.stroke(bar); g.restore();
      // the water (from the rose, out of frame above): sheets of fine streaks down the tiles behind, beads splashing
      if (flow > 0) { const R = OTM.rng('tapflow'); g.save(); g.globalCompositeOperation = 'screen'; g.lineCap = 'round';
        for (let i = 0; i < 70; i++) { const x = 1250 + R() * 600, sp = 1.4 + R(), ph = R(), u = (t * sp + ph) % 1, y = -100 + u * 1300; g.strokeStyle = rgba('#E8F0EE', (0.12 + 0.25 * R()) * flow); g.lineWidth = 1 + R() * 2; g.beginPath(); g.moveTo(x, y - 90); g.lineTo(x + 3, y); g.stroke(); } g.restore(); }
      // the last drips after it is turned off
      const drips = clamp(s.drips || 0, 0, 1); if (drips > 0) { const R = OTM.rng('drips'); for (let i = 0; i < 4; i++) { const x = 1350 + R() * 400, ph = R(), u = ((t * 0.9 + ph) % 1); if (R() > drips) continue; const y = -40 + u * 1150; g.fillStyle = 'rgba(232,240,238,0.8)'; g.beginPath(); g.ellipse(x, y, 5, 9, 0, 0, Math.PI * 2); g.fill(); } }
    },
    // his reflection in the dome: fn(g) draws him (small) in frame coordinates; it is clipped to the dome and pinched toward its rim
    inGlass(c, s, fn) { const q = scratch('tapRefl', W, H); fn(q); const g = c.g; g.save(); const d = new Path2D(); d.arc(TAP.cx, TAP.cy, TAP.r - 4, 0, Math.PI * 2); g.clip(d); g.globalCompositeOperation = 'multiply';
      g.globalAlpha = 0.6; g.drawImage(q.canvas, TAP.cx - TAP.r, TAP.cy - TAP.r, TAP.r * 2, TAP.r * 2, TAP.cx - TAP.r * 0.85, TAP.cy - TAP.r * 0.85, TAP.r * 1.7, TAP.r * 1.7); g.restore(); },
    front(c, t, s) {
      const g = c.g; g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, TAP.cx - 70, TAP.cy - 90, 0, 60, [[0, '#FFFFFF', 0.85], [1, '#FFFFFF', 0]]); g.beginPath(); g.arc(TAP.cx - 70, TAP.cy - 90, 60, 0, Math.PI * 2); g.fill(); g.restore();
      const E = c.em; E.save(); E.fillStyle = 'rgba(255,255,255,0.6)'; E.beginPath(); E.arc(TAP.cx - 70, TAP.cy - 90, 26, 0, Math.PI * 2); E.fill(); E.restore();
      g.fillStyle = LC.lin(g, 0, 880, 0, H, [[0, '#0A0F10', 0], [1, '#0A0F10', 0.4]]); g.fillRect(0, 880, W, H - 880);
    },
    anchors: { hub: [TAP.cx, TAP.cy], leverTipOff: [TAP.cx, TAP.cy + 380], leverTipOn: [Math.round(TAP.cx + Math.cos(-0.35) * 380), Math.round(TAP.cy + Math.sin(-0.35) * 380)], dome: [TAP.cx, TAP.cy, TAP.r], pxPerM: 3200 },
    light: { x: 200, y: 0, color: '#E6F0EE', note: 'the frosted window, top left' },
  };
  tap.leverTipAt = lever => { const a = lerp(Math.PI / 2, -0.35, sstep(clamp(lever, 0, 1), 0, 1)); return [Math.round(TAP.cx + Math.cos(a) * 380), Math.round(TAP.cy + Math.sin(a) * 380)]; };

  // =================================================================================================================
  // VIEW: the towel hook (Q03 34-37): chrome on the door's gloss paint, the paint worn pale where the towel always goes
  // =================================================================================================================
  const HOOK = { x: 960, y: 330 };
  const hook = {
    back(c, t, s) {
      s = s || {}; const g = c.g, towel = clamp(s.towel || 0, 0, 1);
      drawBig(c, bigCache(c, 'bathroom:hook', gg => {
        // the door: gloss white gone teal-grey in the cool light, its panel mouldings, the frosted window's light sliding down it
        gg.fillStyle = '#9EAFAB'; gg.fillRect(-M, -M, W + 2 * M, H + 2 * M);
        gg.fillStyle = '#93A4A0'; gg.fill(LC.rrect(380, 120, 1160, 820, 6)); gg.strokeStyle = '#B7C6C2'; gg.lineWidth = 6; gg.stroke(LC.rrect(380, 120, 1160, 820, 6)); gg.strokeStyle = '#7A8C88'; gg.lineWidth = 4; gg.stroke(LC.rrect(396, 136, 1128, 788, 4));
        gg.save(); gg.globalCompositeOperation = 'screen'; gg.fillStyle = LC.lin(gg, 0, 0, 1920, 1080, [[0, '#E6F0EE', 0.3], [0.5, '#E6F0EE', 0.06], [1, '#E6F0EE', 0]]); gg.fillRect(-M, -M, W + 2 * M, H + 2 * M); gg.restore();
        // the worn patch: an oval under the hook where the towel rubs, paler and duller, its gloss gone; fine scuffs
        gg.save(); const R = OTM.rng('wear'); gg.fillStyle = 'rgba(214,222,214,0.55)'; gg.beginPath(); gg.ellipse(HOOK.x + 4, HOOK.y + 230, 140, 230, 0.02, 0, Math.PI * 2); gg.fill();
        gg.fillStyle = 'rgba(226,230,220,0.35)'; gg.beginPath(); gg.ellipse(HOOK.x, HOOK.y + 180, 95, 170, 0, 0, Math.PI * 2); gg.fill();
        gg.strokeStyle = 'rgba(120,130,122,0.25)'; gg.lineWidth = 1.2; for (let i = 0; i < 40; i++) { const x = HOOK.x - 110 + R() * 220, y = HOOK.y + 40 + R() * 400; gg.beginPath(); gg.moveTo(x, y); gg.lineTo(x + (R() - 0.5) * 10, y + 20 + R() * 40); gg.stroke(); }
        gg.restore();
        // condensation beads on the gloss
        droplets(gg, new Path2D('M-40 -40 H2000 V1120 H-40 Z'), { x: 0, y: 0, w: W, h: H }, 140, 'hookDrops', 0, 0);
        // the hook: a chrome plate and a curved arm, its highlight from the window
        gg.fillStyle = 'rgba(30,40,40,0.35)'; gg.beginPath(); gg.ellipse(HOOK.x + 14, HOOK.y + 18, 44, 44, 0, 0, Math.PI * 2); gg.fill();
        gg.fillStyle = LC.lin(gg, HOOK.x - 40, HOOK.y - 40, HOOK.x + 40, HOOK.y + 40, [[0, '#F2F6F4'], [0.4, '#9AAAA6'], [0.7, '#4A5654'], [1, '#C9D2D0']]); gg.beginPath(); gg.arc(HOOK.x, HOOK.y, 40, 0, Math.PI * 2); gg.fill();
        const arm = new Path2D(); arm.moveTo(HOOK.x - 14, HOOK.y); arm.bezierCurveTo(HOOK.x - 14, HOOK.y + 70, HOOK.x + 50, HOOK.y + 110, HOOK.x + 70, HOOK.y + 60); arm.lineTo(HOOK.x + 50, HOOK.y + 52); arm.bezierCurveTo(HOOK.x + 40, HOOK.y + 80, HOOK.x + 12, HOOK.y + 60, HOOK.x + 14, HOOK.y); arm.closePath();
        gg.fillStyle = LC.lin(gg, HOOK.x - 20, 0, HOOK.x + 70, 0, [[0, '#E8EEEC'], [0.5, '#7A8886'], [1, '#2E3838']]); gg.fill(arm); gg.strokeStyle = 'rgba(255,255,255,0.7)'; gg.lineWidth = 3; gg.beginPath(); gg.moveTo(HOOK.x - 12, HOOK.y + 6); gg.bezierCurveTo(HOOK.x - 12, HOOK.y + 66, HOOK.x + 30, HOOK.y + 100, HOOK.x + 56, HOOK.y + 80); gg.stroke();
        gg.fillStyle = LC.lin(gg, 0, H - 200, 0, H, [[0, '#0A0F10', 0], [1, '#0A0F10', 0.5]]); gg.fillRect(-M, H - 200, W + 2 * M, 200 + M);
      }));
      // the towel: dropped onto the hook (towel 0..1: it falls the last few centimetres and settles), white cotton in its folds
      if (towel > 0) { const drop = (1 - sstep(towel, 0, 0.7)) * 120, sw = Math.sin(t * 2.6) * 6 * (1 - sstep(towel, 0.7, 1));
        const x = HOOK.x + 30 + sw, y = HOOK.y + 60 - drop, a = clamp(towel * 3, 0, 1);
        g.save(); g.globalAlpha = a;
        const tw = LC.smooth([[x - 30, y - 20], [x + 40, y - 22], [x + 160, y + 120], [x + 200, y + 520], [x + 120, y + 600], [x - 30, y + 610], [x - 190, y + 590], [x - 240, y + 500], [x - 190, y + 110]]);
        g.fillStyle = 'rgba(20,30,30,0.35)'; g.save(); g.translate(22, 18); g.fill(tw); g.restore();
        g.fillStyle = '#B4C2BE'; g.fill(tw); g.save(); g.clip(tw);
        g.fillStyle = '#98A8A4'; [[x - 120, y + 80, 40, 520], [x + 60, y + 100, 34, 500], [x - 20, y + 140, 22, 460]].forEach(([fx, fy, fw, fh]) => { g.beginPath(); g.ellipse(fx, fy + fh / 2, fw, fh / 2, 0.03, 0, Math.PI * 2); g.fill(); });
        g.fillStyle = 'rgba(232,240,238,0.5)'; g.beginPath(); g.ellipse(x - 150, y + 300, 24, 260, 0.05, 0, Math.PI * 2); g.fill();
        { const R = OTM.rng('terry'); for (let i = 0; i < 900; i++) { const px = x - 250 + R() * 470, py = y + R() * 620; g.fillStyle = R() < 0.5 ? 'rgba(60,76,72,0.16)' : 'rgba(240,246,244,0.16)'; g.fillRect(px, py, 2, 2); } }     // the terry's nap
        g.fillStyle = '#8A9A96'; g.fillRect(x - 260, y + 530, 480, 34); g.fillStyle = 'rgba(232,240,238,0.4)'; g.fillRect(x - 260, y + 530, 480, 3); g.restore(); g.restore(); }
    },
    front(c, t, s) {      // steam drifting across, slow
      const g = c.g; g.save(); g.globalCompositeOperation = 'screen'; const R = OTM.rng('hookSteam');
      for (let i = 0; i < 5; i++) { const x = ((R() * 2400 + t * (20 + R() * 30)) % 2600) - 300, y = 200 + R() * 700; g.fillStyle = LC.rad(g, x, y, 0, 360, [[0, '#E6EEEC', 0.07], [1, '#E6EEEC', 0]]); g.fillRect(x - 360, y - 360, 720, 720); }
      g.restore();
    },
    anchors: { hook: [HOOK.x + 50, HOOK.y + 60], hookPlate: [HOOK.x, HOOK.y], wornPatch: [HOOK.x, HOOK.y + 230], towelFrom: [HOOK.x + 400, HOOK.y - 300], pxPerM: 2200 },
    light: { x: 0, y: 0, color: '#E6F0EE', note: 'the frosted window, upper left, cool' },
  };

  // =================================================================================================================
  // VIEW: the wardrobe's mirrored door (Q03 37-39): it slides away to a row of identical pale-blue shirts
  // =================================================================================================================
  const wardCam = mkCam({ x: 0.1, y: 1.35, z: -1.3, yaw: 0, pitch: -0.02, f: 1250, cx: W / 2, cy: H / 2 });
  const WD = { x0: -1.0, x1: 1.0, y0: 0.05, y1: 2.15, z: 0 };
  function wardInterior(g, cam) {
    const Q = (pts, col) => Qc(g, cam, pts, col);
    g.fillStyle = '#1A2224'; g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
    Q([[WD.x0, WD.y0, 0.6], [WD.x1, WD.y0, 0.6], [WD.x1, WD.y1, 0.6], [WD.x0, WD.y1, 0.6]], '#20292A');
    Q([[WD.x0, WD.y1 - 0.25, 0.01], [WD.x1, WD.y1 - 0.25, 0.01], [WD.x1, WD.y1 - 0.25, 0.6], [WD.x0, WD.y1 - 0.25, 0.6]], '#3A4644');
    seg2(g, cam, [WD.x0, 1.86, 0.3], [WD.x1, 1.86, 0.3], 8, '#8E9A98'); seg2(g, cam, [WD.x0, 1.865, 0.29], [WD.x1, 1.865, 0.29], 2, '#E2EAE8');
    // the shirts: the same pale-blue oxford, again and again, on the same hangers; the light from the room on their shoulders
    for (let i = 0; i < 11; i++) { const x = WD.x0 + 0.16 + i * 0.165, z = 0.3, top = cam.p(x, 1.86, z), k = kAt(cam, x, 1.5, z), lean = 0.012 * Math.sin(i * 2.3);
      // the hanger's hook and its shoulder, then the shirt edge-on: the shoulder's slope, the sleeve down its side, the cuff, the tail's curve
      g.strokeStyle = '#2A3232'; g.lineWidth = Math.max(1.5, 0.007 * k); g.beginPath(); g.moveTo(top[0], top[1] - 0.01 * k); g.quadraticCurveTo(top[0] + 0.02 * k, top[1] - 0.03 * k, top[0] + 0.012 * k, top[1] + 0.045 * k); g.stroke();
      const X = (u, v) => [top[0] + (u + lean * v) * k, top[1] + v * k];
      const sh = LC.smooth([X(-0.05, 0.06), X(0.05, 0.065), X(0.075, 0.13), X(0.072, 0.6), X(0.068, 0.9, 1), X(0.02, 0.96), X(-0.04, 0.93), X(-0.07, 0.9, 1), X(-0.074, 0.5), X(-0.072, 0.12)]);
      g.fillStyle = '#7C909C'; g.fill(sh); g.save(); g.clip(sh);
      g.fillStyle = '#9FB3BF'; g.beginPath(); const s0 = X(-0.075, 0.1), s1 = X(-0.008, 0.08), s2 = X(-0.012, 0.98), s3 = X(-0.08, 0.98); g.moveTo(s0[0], s0[1]); g.lineTo(s1[0], s1[1]); g.lineTo(s2[0], s2[1]); g.lineTo(s3[0], s3[1]); g.closePath(); g.fill();   // the lit side
      g.fillStyle = '#6A7E8A'; const sl = X(0.02, 0.14); g.fill(LC.rrect(sl[0], sl[1], 0.045 * k, 0.56 * k, 0.015 * k)); const cf = X(0.02, 0.68); g.fillStyle = '#B9CAD3'; g.fill(LC.rrect(cf[0], cf[1], 0.047 * k, 0.07 * k, 0.01 * k));   // the sleeve and its cuff
      g.restore();
      const cl = X(-0.035, 0.06), cr = X(0.035, 0.06), cb = X(0.0, 0.12); g.fillStyle = '#C9D6DC'; g.beginPath(); g.moveTo(cl[0], cl[1]); g.lineTo(cb[0], cb[1]); g.lineTo(cr[0], cr[1]); g.closePath(); g.fill();     // the collar
    }
    // the light comes in from the room (left), across the shoulders
    g.save(); g.globalCompositeOperation = 'screen'; const a = cam.p(WD.x0, 1.7, 0.2); g.fillStyle = LC.rad(g, a[0], a[1], 0, 1200, [[0, '#DCE8EC', 0.22], [1, '#DCE8EC', 0]]); g.fillRect(-M, -M, W + 2 * M, H + 2 * M); g.restore();
  }
  // the bedroom in morning light as the mirror gives it back: the blind up, the window bright, the bed made on her side
  function bedroomBehind(g, cam) {
    const Q = (pts, col) => Qc(g, cam, pts, col), ZB = -3.2;
    g.fillStyle = '#5E6E6E'; g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
    Q([[-2, 0, ZB], [2, 0, ZB], [2, 2.4, ZB], [-2, 2.4, ZB]], '#7A8A88'); Q([[-2, 2.4, 0], [2, 2.4, 0], [2, 2.4, ZB], [-2, 2.4, ZB]], '#647472'); Q([[-2, 0, 0], [2, 0, 0], [2, 0, ZB], [-2, 0, ZB]], '#4A4640');
    Q([[-2, 0, 0], [-2, 2.4, 0], [-2, 2.4, ZB], [-2, 0, ZB]], '#6E7E7C'); Q([[2, 0, 0], [2, 2.4, 0], [2, 2.4, ZB], [2, 0, ZB]], '#566664');
    Q([[-0.9, 0.85, ZB + 0.01], [0.5, 0.85, ZB + 0.01], [0.5, 2.1, ZB + 0.01], [-0.9, 2.1, ZB + 0.01]], '#E8EEEA'); Q([[-0.9, 1.9, ZB + 0.02], [0.5, 1.9, ZB + 0.02], [0.5, 2.1, ZB + 0.02], [-0.9, 2.1, ZB + 0.02]], '#C9CCBE');
    seg2(g, cam, [-0.2, 0.85, ZB + 0.02], [-0.2, 1.9, ZB + 0.02], 4, '#9AA6A2');
    Q([[-1.2, 0.3, ZB + 1.2], [0.6, 0.3, ZB + 1.2], [0.6, 0.6, ZB + 1.2], [-1.2, 0.6, ZB + 1.2]], '#9CAAA8'); Q([[-1.2, 0.6, ZB + 1.2], [0.6, 0.6, ZB + 1.2], [0.6, 0.62, ZB + 0.2], [-1.2, 0.62, ZB + 0.2]], '#B9C4C2');
  }
  const wardSt = {};
  const wardrobe = {
    cam: wardCam,
    back(c, t, s) {
      s = s || {}; const g = c.g, cam = wardCam, slide = clamp(s.slide == null ? 0.6 : s.slide, 0, 1);
      drawBig(c, bigCache(c, 'bathroom:wardInside', gg => wardInterior(gg, cam)));
      // the mirrored door: a panel that slides left on its track; in it the bedroom behind the lens
      const dx = -slide * 1.05, d0 = WD.x0 + 0.02 + dx, d1 = 0.02 + dx + 0.02, dz = -0.03;
      const pane = clipPts(cam, [[d0, WD.y1, dz], [d1, WD.y1, dz], [d1, WD.y0, dz], [d0, WD.y0, dz]]);
      const room = bigCache(c, 'bathroom:wardRefl', gg => bedroomBehind(gg, mirrorZ(cam, dz)));
      g.save(); g.clip(LC.pathPts(pane)); g.drawImage(room, -M, -M); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(196,210,208)'; g.fillRect(0, 0, W, H); g.restore();
      // the second door (fixed, right half) is mirror too
      const pane2 = clipPts(cam, [[0.04, WD.y1, dz - 0.03], [WD.x1 - 0.02, WD.y1, dz - 0.03], [WD.x1 - 0.02, WD.y0, dz - 0.03], [0.04, WD.y0, dz - 0.03]]);
      if (d1 < 0.04) { g.save(); g.clip(LC.pathPts(pane2)); g.drawImage(room, -M, -M); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(190,204,202)'; g.fillRect(0, 0, W, H); g.restore(); }
      wardSt.panes = [pane, d1 < 0.04 ? pane2 : null];
      // the frames: the moving door's edge (aluminium), the track
      const ed = clipPts(cam, [[d1 - 0.012, WD.y1, dz], [d1 + 0.004, WD.y1, dz], [d1 + 0.004, WD.y0, dz], [d1 - 0.012, WD.y0, dz]]); g.fillStyle = '#B9C4C2'; g.fill(LC.pathPts(ed));
      Qc(g, cam, [[WD.x0 - 0.06, WD.y1, -0.06], [WD.x1 + 0.06, WD.y1, -0.06], [WD.x1 + 0.06, WD.y1 + 0.06, -0.06], [WD.x0 - 0.06, WD.y1 + 0.06, -0.06]], '#2A3434');
      Qc(g, cam, [[WD.x0 - 0.06, -0.02, -0.06], [WD.x1 + 0.06, -0.02, -0.06], [WD.x1 + 0.06, WD.y0, -0.06], [WD.x0 - 0.06, WD.y0, -0.06]], '#2A3434');
      Qc(g, cam, [[WD.x0 - 0.3, -0.5, -0.07], [WD.x0 - 0.06, -0.5, -0.07], [WD.x0 - 0.06, 2.6, -0.07], [WD.x0 - 0.3, 2.6, -0.07]], '#3E4C4C'); Qc(g, cam, [[WD.x1 + 0.06, -0.5, -0.07], [WD.x1 + 0.3, -0.5, -0.07], [WD.x1 + 0.3, 2.6, -0.07], [WD.x1 + 0.06, 2.6, -0.07]], '#344242');
    },
    inGlass(c, s, fn) { const g = c.g; (wardSt.panes || []).forEach(p => { if (!p) return; g.save(); g.clip(LC.pathPts(p)); fn(g, mirrorZ(wardCam, -0.03)); g.restore(); }); },
    front(c, t, s) {
      const g = c.g; (wardSt.panes || []).forEach(p => { if (!p) return; const r = LC.pathPts(p); LC.glare(g, r, { x: 760, y: 500, angle: -1.15, color: '#FFFFFF', bands: [{ d: -60, w: 60, a: 0.04 }, { d: 20, w: 10, a: 0.05 }] });
        LC.specks(g, r, { x: 0, y: 0, w: W, h: H }, 'wardDust', { n: 160, color: '#FFFFFF', rMin: 0.5, rMax: 1.2, aMin: 0.04, aMax: 0.18, scratch: 0.1 }); });
      g.fillStyle = LC.lin(g, 0, 880, 0, H, [[0, '#0A0F10', 0], [1, '#0A0F10', 0.45]]); g.fillRect(0, 880, W, H - 880);
    },
    anchors: (() => { const cam = wardCam, p = (x, y, z) => cam.p(x, y, z).slice(0, 2).map(Math.round); const sx = WD.x0 + 0.16 + 4 * 0.165;
      return { theShirt: p(sx, 1.72, 0.3), hanger: p(sx, 1.86, 0.3), shirtsPxPerM: Math.round(kAt(cam, sx, 1.5, 0.3)), doorEdgeAt: sl => p(0.04 - clamp(sl, 0, 1) * 1.05, 1.1, -0.03) }; })(),
    light: { x: 0, y: 380, color: '#DCE8EC', note: 'the bedroom window, morning, off to the left' },
  };

  // =================================================================================================================
  // demo stand-ins (the sequences draw RIG's people)
  const figureBehind = (g, A, arms) => { if (window.RIG && RIG.draw) { RIG.draw(g, 'daniel', { at: A.figureFeet, scale: A.pxPerM, view: 'front', outfit: 'night', face: 'closed', armR: arms ? { hand: [0.02, 0.4, 0.06] } : 'relaxed', armL: arms ? { hand: [0.02, 0.4, 0.06] } : 'relaxed', head: { nod: arms ? 0.25 : -0.2, turn: 0, tilt: 0 } }, { light: { x: 560, y: 120, color: '#DCE8E6' } }); return true; } return false; };
  const blob = (g, cx, cy, k, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy - 1.62 * k, 0.11 * k, 0.13 * k, 0, 0, Math.PI * 2); g.fill(); g.fill(LC.rrect(cx - 0.22 * k, cy - 1.48 * k, 0.44 * k, 0.7 * k, 0.12 * k)); g.fill(LC.rrect(cx - 0.18 * k, cy - 0.8 * k, 0.36 * k, 0.8 * k, 0.08 * k));
    g.fill(LC.rrect(cx - 0.3 * k, cy - 1.75 * k, 0.1 * k, 0.4 * k, 0.05 * k)); g.fill(LC.rrect(cx + 0.2 * k, cy - 1.75 * k, 0.1 * k, 0.4 * k, 0.05 * k)); };
  window.SETS = window.SETS || {};
  SETS.bathroom = {
    views: { shower, mirror, tap, hook, wardrobe },
    demos: [
      { name: 'tap: turned on (lever 0 -> 1), water', draw(c, t) { const s = { lever: clamp(t / 0.8, 0, 1) }; tap.back(c, t, s); tap.front(c, t, s); } },
      { name: 'shower: water on the glass, steam starting, the sun in it', draw(c, t) { const s = { water: 1, steam: 0.12 + t * 0.04 }; shower.back(c, t, s); shower.front(c, t, s); } },
      { name: 'shower: fogged, his shape behind (shampoo)', draw(c, t) { const s = { water: 1, steam: 0.62 }; shower.back(c, t, s); shower.behind(c, s, g => { const A = shower.anchors; if (!figureBehind(g, A, true)) blob(g, A.figureFeet[0], A.figureFeet[1], A.pxPerM, '#6E5446'); }); shower.front(c, t, s); } },
      { name: 'shower: rinse, streams clearing lines', draw(c, t) { const s = { water: 1, steam: 0.8, streams: 0.4 + t * 0.15 }; shower.back(c, t, s); shower.behind(c, s, g => { const A = shower.anchors; if (!figureBehind(g, A, false)) blob(g, A.figureFeet[0], A.figureFeet[1], A.pxPerM, '#6E5446'); }); shower.front(c, t, s); } },
      { name: 'mirror: steamed, the band wiped', draw(c, t) { const s = { steam: 0.9, wipe: clamp(t / 1.2, 0, 1), door: 0 }; mirror.back(c, t, s); mirror.front(c, t, s); } },
      { name: 'mirror: he leaves, the door in it, the band fogging', draw(c, t) { const s = { steam: 0.9, wipe: 1, refog: 0.3 + t * 0.12, door: 0.7 }; mirror.back(c, t, s); mirror.front(c, t, s); } },
      { name: 'tap: off, the last drips', draw(c, t) { const s = { lever: 0, flow: 0, drips: 1 }; tap.back(c, t, s); tap.front(c, t, s); } },
      { name: 'hook: worn pale, the towel hung', draw(c, t) { const s = { towel: clamp(t / 1.2, 0, 1) }; hook.back(c, t, s); hook.front(c, t, s); } },
      { name: 'wardrobe: the mirror slides to the shirts', draw(c, t) { const s = { slide: clamp(t / 1.6, 0, 1) }; wardrobe.back(c, t, s); wardrobe.front(c, t, s); } },
    ],
  };
})();
