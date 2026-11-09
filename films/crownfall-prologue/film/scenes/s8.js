/* Scene 8: The Unreturned [V01, C04, V02, V03]. Black; a bell and a heartbeat in the mix. A hand on wet black stone in a
   pale light, its fingers moving. Cael rises onto his elbows as the voice says he remembers; he looks at his hands. Then
   the Wyrdmark: a vast colourless plain under a cold low sun, mist, and a long line of the dead walking slowly towards
   the light. The camera rises and draws back until he is a speck at its edge; on "it lets one walk back" he gets to his
   feet and turns against the flow, faint red veins of the curse in the grey ground beneath him. The Chapter One card
   fades in over the drifting picture. Registers window.SCENES[8]; see LOOK.md. */
(function () {
  'use strict';
  const K = window.KIT, W = K.W, H = K.H;
  const { clamp, lerp, smooth, ease, easeOut, span, rng } = K;
  const SCENES = window.SCENES = window.SCENES || {};
  const TAU = Math.PI * 2;

  // ================================================================ helpers
  const rgbs = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const rgb = c => `rgb(${clamp(c[0], 0, 255) | 0},${clamp(c[1], 0, 255) | 0},${clamp(c[2], 0, 255) | 0})`;
  const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
  function smoothPath(p, pts) {
    const n = pts.length; p.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    p.closePath();
  }
  function cap(ctx, ax, ay, bx, by, ra, rb) {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-6, nx = -dy / L, ny = dx / L;
    ctx.beginPath(); ctx.moveTo(ax + nx * ra, ay + ny * ra); ctx.lineTo(bx + nx * rb, by + ny * rb); ctx.lineTo(bx - nx * rb, by - ny * rb); ctx.lineTo(ax - nx * ra, ay - ny * ra); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(ax, ay, ra, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(bx, by, rb, 0, TAU); ctx.fill();
  }
  function glowImg(c) {
    return K.cached('s8:glow:' + c, () => {
      const s = 128, cv = K.canvas(s, s), x = cv.getContext('2d'), g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, rgbs(c, 1)); g.addColorStop(0.12, rgbs(c, 0.6)); g.addColorStop(0.35, rgbs(c, 0.2)); g.addColorStop(0.65, rgbs(c, 0.06)); g.addColorStop(1, rgbs(c, 0));
      x.fillStyle = g; x.fillRect(0, 0, s, s); return cv;
    });
  }
  function glow(ctx, c, x, y, r, a, mode = 'lighter') {
    if (a <= 0.004 || r < 0.5) return;
    ctx.save(); ctx.globalCompositeOperation = mode; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glowImg(c), x - r, y - r, 2 * r, 2 * r); ctx.restore();
  }
  // rimLit(ctx, draw, o): silhouettes lit along one edge (see S7). o.rim, o.mid, o.dark, o.dx, o.dy, o.box, o.key
  function rimLit(ctx, draw, o) {
    const n = o.steps || 4, bx = o.box ? Math.max(0, Math.floor(o.box[0])) : 0, by = o.box ? Math.max(0, Math.floor(o.box[1])) : 0;
    const bw = o.box ? Math.max(1, Math.min(W - bx, Math.ceil(o.box[2]))) : W, bh = o.box ? Math.max(1, Math.min(H - by, Math.ceil(o.box[3]))) : H;
    const L = K.layer(o.box ? 's8:rimb:' + (o.key || 'k') : 's8:rim', bw, bh), lc = L.getContext('2d'), m = ctx.getTransform();
    lc.setTransform(m.a, m.b, m.c, m.d, m.e - bx, m.f - by); draw(lc, o.rim);
    lc.globalCompositeOperation = 'source-atop';
    for (let i = 1; i <= n; i++) { const k = i / n; lc.setTransform(m.a, m.b, m.c, m.d, m.e - bx + o.dx * k, m.f - by + o.dy * k); lc.globalAlpha = i === n ? 1 : 0.45; draw(lc, i === 1 && o.mid ? o.mid : o.dark); }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); if (o.alpha != null) ctx.globalAlpha = o.alpha; ctx.drawImage(L, bx, by); ctx.restore();
  }
  function bloom(ctx, a = 0.3, th = 2) {
    if (a <= 0) return;
    const A = K.layer('s8:bl1', W / 4, H / 4), B = K.layer('s8:bl2', W / 8, H / 8), ax = A.getContext('2d'), bx = B.getContext('2d');
    ax.drawImage(ctx.canvas, 0, 0, W / 4, H / 4); bx.drawImage(A, 0, 0, W / 8, H / 8);
    bx.globalCompositeOperation = 'multiply'; for (let i = 0; i < th; i++) bx.drawImage(B, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = a; ctx.imageSmoothingQuality = 'medium'; ctx.drawImage(B, 0, 0, W, H); ctx.restore();
  }
  function vignetteImg(a, inner) {
    const qa = Math.round(a * 40) / 40, qi = Math.round(inner * 40) / 40;
    return K.cached(`s8:vig:${qa}:${qi}`, () => { const c = K.canvas(W, H), x = c.getContext('2d'); K.vignette(x, qa, '0,0,0', qi); return c; });
  }
  let MIXING = false;
  function finish(ctx, o = {}) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (o.bloom && !MIXING) bloom(ctx, o.bloom, o.bloomTh || 2);
    ctx.drawImage(vignetteImg(o.vig != null ? o.vig : 0.5, o.vigIn != null ? o.vigIn : 0.32), 0, 0);
    ctx.save(); ctx.globalAlpha = o.tooth != null ? o.tooth : 0.16; ctx.globalCompositeOperation = 'overlay'; K.tile(ctx, K.paperGrain(), 0, 0, W, H); ctx.restore();
  }
  // a band of mist (tileable), scrolled
  function fogTex(seed) {
    return K.cached('s8:fog:' + seed, () => {
      const w = 512, h = 128, c = K.canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const u = i / w, f = K.fbm(i / 70, j / 30, 4, seed) * (1 - u) + K.fbm((i - w) / 70, j / 30, 4, seed) * u, v = Math.sin(Math.PI * j / h);
        const k = (j * w + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = 255 * clamp((f - 0.28) * 2.2) * v * v;
      }
      x.putImageData(img, 0, 0); return c;
    });
  }
  function fog(ctx, seed, y, h, scroll, a, x0 = -300, w = W + 600) {
    if (a <= 0.003 || h < 1) return; const tex = fogTex(seed), tw = Math.max(h * 4, 200);
    ctx.save(); ctx.globalAlpha = Math.min(1, a); for (let X = x0 - (((scroll % tw) + tw) % tw); X < x0 + w; X += tw) ctx.drawImage(tex, X, y, tw + 1, h); ctx.restore();
  }

  // ================================================================ Cael (silhouettes): the head, prone, kneeling, standing
  function headPts(open) {
    const J = [-0.05, 0.08], ja = (open || 0) * 0.34, c = Math.cos(ja), s = Math.sin(ja);
    const jaw = p => [J[0] + (p[0] - J[0]) * c - (p[1] - J[1]) * s, J[1] + (p[0] - J[0]) * s + (p[1] - J[1]) * c];
    return [[-0.06, -0.56], [0.2, -0.5], [0.34, -0.36], [0.39, -0.2], [0.42, -0.13], [0.37, -0.07], [0.42, 0.0], [0.51, 0.1], [0.47, 0.135], [0.4, 0.14], [0.42, 0.19], [0.39, 0.225],
      [0.33 - (open || 0) * 0.06, 0.245], jaw([0.41, 0.27]), jaw([0.39, 0.36]), jaw([0.34, 0.44]), jaw([0.2, 0.47]), jaw([0.04, 0.41]),
      [-0.1, 0.28], [-0.32, 0.12], [-0.43, -0.1], [-0.4, -0.36], [-0.26, -0.52]];
  }
  const HAIR = [[0.3, -0.4], [0.24, -0.52], [0.08, -0.64], [-0.1, -0.68], [-0.32, -0.62], [-0.5, -0.46], [-0.6, -0.24], [-0.62, -0.02], [-0.57, 0.14], [-0.63, 0.32], [-0.5, 0.25], [-0.47, 0.42], [-0.38, 0.27], [-0.3, 0.4], [-0.24, 0.22], [-0.15, 0.27], [-0.1, 0.05], [0.04, -0.2], [0.16, -0.27], [0.26, -0.24], [0.24, -0.33], [0.36, -0.3]];
  function head(ctx, x, y, hh, ang, open) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(hh, hh);
    ctx.beginPath(); smoothPath(ctx, headPts(open)); ctx.fill();
    ctx.beginPath(); smoothPath(ctx, HAIR); ctx.fill();
    ctx.beginPath(); smoothPath(ctx, [[0.32, -0.36], [0.26, -0.52], [0.12, -0.64], [-0.06, -0.71], [-0.26, -0.69], [-0.44, -0.58], [-0.56, -0.4], [-0.6, -0.18], [-0.2, -0.05], [0.1, -0.28]]); ctx.fill();
    ctx.restore();
  }
  // prone on the stone (y the stone), hips at x, head towards +x, s his height; o.rise 0 (flat, face down) .. 1 (on his elbows,
  // head up). o.fill
  function caelProne(ctx, x, y, s, o = {}) {
    const r = clamp(o.rise || 0), ta = r * 0.5 + 0.02;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = o.fill || '#000';
    // legs out behind, a foot turned up
    cap(ctx, 0, -0.05, -0.24, -0.04, 0.05, 0.04); cap(ctx, -0.24, -0.04, -0.47, -0.03, 0.04, 0.028);
    cap(ctx, -0.02, -0.06, -0.25, -0.06, 0.045, 0.036); cap(ctx, -0.25, -0.06, -0.48, -0.05, 0.036, 0.026);
    ctx.beginPath(); ctx.moveTo(-0.47, -0.05); ctx.lineTo(-0.52, -0.09); ctx.lineTo(-0.535, -0.075); ctx.lineTo(-0.5, -0.02); ctx.closePath(); ctx.fill();
    // the torso, lifted from the hips
    const sh = rot([0.31, 0], -ta), shx = sh[0], shy = -0.07 + sh[1];
    ctx.save(); ctx.translate(0, -0.06); ctx.rotate(-ta);
    ctx.beginPath(); smoothPath(ctx, [[-0.05, 0.05], [0.1, 0.07], [0.24, 0.075], [0.32, 0.05], [0.35, -0.02], [0.33, -0.085], [0.26, -0.1], [0.16, -0.085], [0.06, -0.09], [-0.02, -0.085], [-0.07, -0.03]]); ctx.fill();
    // the cloak over his back, falling to the stone
    ctx.beginPath(); ctx.moveTo(0.32, -0.07); ctx.quadraticCurveTo(0.14, -0.1, -0.04, -0.06); ctx.quadraticCurveTo(-0.14, 0.0, -0.2, 0.065); ctx.lineTo(0.05, 0.07); ctx.closePath(); ctx.fill();
    ctx.restore();
    // arms: the elbow planted under the shoulder, the forearm along the stone
    const el = [shx + 0.02 * r - 0.04 * (1 - r), -0.025], hd = [el[0] + 0.19, -0.02];
    cap(ctx, shx, shy + 0.02, el[0], el[1], 0.034, 0.028); cap(ctx, el[0], el[1], hd[0], hd[1], 0.028, 0.022);
    ctx.beginPath(); ctx.ellipse(hd[0] + 0.03, -0.022, 0.035, 0.02, 0, 0, TAU); ctx.fill();
    // neck and head: face down when flat, lifted and looking ahead when risen
    const hh = 0.135, ang = lerp(1.25, -0.1, smooth(r)), nk = [shx + 0.03, shy - 0.01], hc = [nk[0] + 0.05 + 0.012 * r, nk[1] - lerp(-0.005, 0.045, r)];
    cap(ctx, shx, shy, hc[0] - 0.02, hc[1] + 0.02, 0.034, 0.03);
    head(ctx, hc[0], hc[1], hh, ang, o.open || 0);
    ctx.restore();
  }
  // kneeling, sitting back on his heels, seen from the side, facing +x; (x, y) the knee on the ground; o.hands: raised
  function caelKneel(ctx, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = o.fill || '#000';
    cap(ctx, 0, -0.03, -0.24, -0.04, 0.045, 0.04); cap(ctx, -0.24, -0.04, -0.2, -0.14, 0.05, 0.06);
    ctx.beginPath(); smoothPath(ctx, [[-0.27, -0.12], [-0.12, -0.13], [-0.06, -0.3], [-0.04, -0.5], [-0.1, -0.56], [-0.22, -0.55], [-0.26, -0.4], [-0.3, -0.2]]); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-0.2, -0.55); ctx.quadraticCurveTo(-0.36, -0.4, -0.42, -0.05); ctx.lineTo(-0.18, -0.03); ctx.closePath(); ctx.fill();
    head(ctx, -0.06, -0.63 + (o.bow || 0) * 0.02, 0.135, 0.18 + (o.bow || 0) * 0.35, 0);
    ctx.restore();
  }

  // ================================================================ the hand on the wet stone: palm down, seen low across it
  // (x, y) the wrist, s its size; the hand lies flat (squashed by the low view), fingers to +x; fold[i] pulls finger i back
  function handFlat(ctx, x, y, s, fold, lift) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.42); ctx.rotate(Math.PI / 2 - 0.08);
    palm(ctx, 0, 0, s, 0, 0.1, 0, false, fold, 1.6);
    ctx.restore();
    // the knuckles rising as the fingers grip, seen against the light
    ctx.save(); ctx.translate(x, y);
    for (let i = 0; i < 4; i++) { const f = clamp(fold[i]), kx = (0.5 + 0.02 * i) * s, ky = (-0.06 + 0.055 * (i - 1.5)) * s * 0.42; if (f > 0.05) { ctx.beginPath(); ctx.ellipse(kx + 0.12 * s * (1 - f), ky - 0.03 * s * f * lift, 0.06 * s, 0.05 * s * f + 0.012 * s, 0, 0, TAU); ctx.fill(); } }
    ctx.restore();
  }
  // open hands seen palm-on (raised before him): the palm, five fingers, spread a little; (x, y) the wrist, s the size, a tilt
  function palm(ctx, x, y, s, a, spread, curl, mirror, fold, arm) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s * (mirror ? -1 : 1), s);
    cap(ctx, 0, arm || 0.6, 0, 0.0, 0.16, 0.15);
    ctx.beginPath(); smoothPath(ctx, [[-0.18, 0.02], [-0.2, -0.25], [-0.17, -0.48], [0.0, -0.53], [0.19, -0.48], [0.22, -0.25], [0.19, 0.02], [0.0, 0.07]]); ctx.fill();
    const F = [[-0.15, -0.48, 0.42, -0.2], [-0.05, -0.53, 0.5, -0.06], [0.05, -0.53, 0.53, 0.04], [0.15, -0.48, 0.46, 0.16]];
    F.forEach(([bx, by, l, d], i) => {
      const fk = fold ? 1 - 0.55 * clamp(fold[3 - i]) : 1, ang = -Math.PI / 2 + d * (1 + spread), c = curl * (0.6 + i * 0.12), seg = [l * 0.45 * fk, l * 0.32 * fk, l * 0.23 * fk];
      let px = bx, py = by, aa = ang; const w0 = 0.065;
      for (let k = 0; k < 3; k++) { const nx = px + Math.cos(aa) * seg[k], ny = py + Math.sin(aa) * seg[k]; cap(ctx, px, py, nx, ny, w0 * (1 - k * 0.12), w0 * (0.9 - k * 0.12)); px = nx; py = ny; aa += c * 0.5; }
    });
    // the thumb, out to the side
    const ta = -2.3 - spread * 0.3; let px = -0.17, py = -0.1; for (let k = 0; k < 2; k++) { const l = [0.24, 0.2][k], nx = px + Math.cos(ta + k * 0.35) * l, ny = py + Math.sin(ta + k * 0.35) * l; cap(ctx, px, py, nx, ny, 0.075 - k * 0.012, 0.065 - k * 0.012); px = nx; py = ny; }
    ctx.restore();
  }

  // ================================================================ the near world: pale mist beyond, wet black stone below
  // horizon y (where the stone ends and the mist begins); sheen: the bright reflection band in the wet stone
  function nearWorld(ctx, c, hy, t, o = {}) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const y0 = (hy - H / 2 - c.y) * c.z + H / 2;
    // the mist beyond: almost white at the line, grey above
    let g = ctx.createLinearGradient(0, 0, 0, y0); g.addColorStop(0, '#8e949a'); g.addColorStop(0.55, '#c3c8cc'); g.addColorStop(0.9, '#e7e9ea'); g.addColorStop(1, '#f0f1f1'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, Math.max(0, y0));
    // the low sun's place in it, a cold brightness
    glow(ctx, [255, 255, 255], W * (o.sunX || 0.62) - c.x * 0.3, y0 - 60, 900, 0.35);
    // shapes far off in the mist: the line of the dead, barely there
    if (o.far) {
      ctx.save(); ctx.fillStyle = 'rgba(120,124,130,0.22)';
      const r = rng(801); for (let i = 0; i < 60; i++) { const fx = ((r() * 2400 + t * 6 - c.x * 0.2) % 2400) - 240, fh = 14 + r() * 10; ctx.fillRect(fx, y0 - fh - 4, 3, fh); ctx.beginPath(); ctx.arc(fx + 1.5, y0 - fh - 6, 2.4, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    fog(ctx, 811, y0 - 260, 260, t * 14 + c.x * 0.4, 0.55);
    fog(ctx, 812, y0 - 120, 160, -t * 9 + c.x * 0.6, 0.6);
    // the stone: black and wet, the mist's light lying in it
    g = ctx.createLinearGradient(0, y0, 0, H); g.addColorStop(0, '#8d9297'); g.addColorStop(0.04, '#3b3f44'); g.addColorStop(0.18, '#15171a'); g.addColorStop(0.5, '#0a0b0d'); g.addColorStop(1, '#050506'); ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0);
    // ripples of reflected light, streaks, droplets
    const r = rng(o.seed || 821);
    ctx.save();
    for (let i = 0; i < 70; i++) { const px = r() * W, py = y0 + Math.pow(r(), 2) * (H - y0), w = 40 + r() * 260 * (1 - (py - y0) / (H - y0) * 0.5), a = 0.05 + r() * 0.12 * (1 - (py - y0) / (H - y0)); ctx.fillStyle = rgbs([200, 206, 212], a); ctx.fillRect(px - w / 2, py, w, 1 + r() * 2); }
    for (let i = 0; i < 160; i++) { const px = r() * W, py = y0 + 10 + Math.pow(r(), 1.3) * (H - y0), rr = 0.6 + r() * 2.4 * (0.4 + (py - y0) / (H - y0)), tw = 0.6 + 0.4 * Math.sin(t * (0.5 + r()) + i); ctx.fillStyle = rgbs([235, 238, 242], (0.25 + r() * 0.45) * tw); ctx.beginPath(); ctx.ellipse(px, py, rr * 1.4, rr * 0.7, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    return y0;
  }

  // ================================================================ shots 1–2: black; the hand
  function shotHand(ctx, t, sh, sc) {
    const V01 = K.cue('V01'), u = span(t, sh.a - 0.4, sh.b + 0.6), lt = t - sh.a;
    const c = { x: lerp(-30, 40, ease(u)), y: lerp(10, -10, ease(u)), z: lerp(1.0, 1.06, ease(u)) };
    const y0 = nearWorld(ctx, c, 600, t, { sunX: 0.7, seed: 831 });
    // the hand, dark against the shine on the stone, lit along its edge by the pale sky; its reflection under it
    const wx = (420 - W / 2 - c.x) * c.z + W / 2, wy = (720 - H / 2 - c.y) * c.z + H / 2, L = 780 * c.z;
    const ph = t - (sc.start + 1.0);
    const fold = [0, 1, 2, 3].map(f => clamp(0.05 + 0.4 * smooth(span(ph, 0.5 + f * 0.22, 1.5 + f * 0.22)) + 0.15 * Math.max(0, Math.sin(ph * 2.0 - f * 0.9)) * smooth(span(ph, 0.3, 1)) + 0.3 * smooth(span(t, V01.start - 1.0, V01.start + 0.2))));
    { const Q = K.layer('s8:refl', W / 4, H / 4), q = Q.getContext('2d'); q.setTransform(0.25, 0, 0, -0.25, 0, wy * 0.5); q.fillStyle = '#060607'; handFlat(q, wx, wy, L, fold, 1); ctx.save(); ctx.globalAlpha = 0.5; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(Q, 0, 3, W, H); ctx.restore(); }
    rimLit(ctx, (cc, fill) => { cc.fillStyle = fill; handFlat(cc, wx, wy, L, fold, 1); }, { rim: '#e8ecef', mid: '#4a4e54', dark: '#0b0c0e', dx: 2, dy: 5, steps: 4, box: [0, 400, W, 560], key: 'hd' });
    // beads of water on the back of the hand
    ctx.save(); const r = rng(841); for (let i = 0; i < 14; i++) { const px = wx + (0.05 + r() * 0.45) * L, py = wy - (0.02 + r() * 0.06) * L; ctx.fillStyle = rgbs([230, 234, 240], 0.5 + r() * 0.4); ctx.beginPath(); ctx.arc(px, py, 1.2 + r() * 2.2, 0, TAU); ctx.fill(); } ctx.restore();
    // where the fingertips press, small rings in the film of water
    ctx.save(); ctx.strokeStyle = 'rgba(220,226,232,0.35)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) { const k = ((ph * 0.6 + i / 3) % 1 + 1) % 1, rx = 30 + k * 160; ctx.globalAlpha = (1 - k) * smooth(span(ph, 0.8, 1.6)); ctx.beginPath(); ctx.ellipse(wx + 0.9 * L, wy + 4, rx, rx * 0.1, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
    finish(ctx, { bloom: 0.25, vig: 0.62, vigIn: 0.28 });
    // out of black: the light comes up slowly, as if through closed eyes
    const fi = smooth(span(t, sc.start + 0.9, sc.start + 2.6));
    ctx.setTransform(1, 0, 0, 1, 0, 0); if (fi < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - fi})`; ctx.fillRect(0, 0, W, H); }
    void y0; void lt;
  }

  // ================================================================ shot 3, "You remember.": he rises onto his elbows
  function shotElbows(ctx, t, sh) {
    const V01 = K.cue('V01'), u = span(t, sh.a - 0.4, sh.b + 0.6);
    const c = { x: lerp(40, -30, ease(u)), y: lerp(10, -6, ease(u)), z: lerp(1.04, 1.1, ease(u)) };
    const y0 = nearWorld(ctx, c, 600, t, { sunX: 0.75, far: true, seed: 851 });
    const rise = smooth(span(t, V01.start - 0.2, V01.start + 1.7));
    const px = (1020 - W / 2 - c.x) * c.z + W / 2, py = (760 - H / 2 - c.y) * c.z + H / 2, s = 1350 * c.z;
    { const Q = K.layer('s8:refl', W / 4, H / 4), q = Q.getContext('2d'); q.setTransform(0.25, 0, 0, -0.25, 0, py * 0.5); caelProne(q, px, py, s, { rise, fill: '#08090a' }); ctx.save(); ctx.globalAlpha = 0.42; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(Q, 0, 2, W, H); ctx.restore(); }
    rimLit(ctx, (cc, fill) => caelProne(cc, px, py, s, { rise, fill }), { rim: '#e2e6ea', mid: '#3c4046', dark: '#0a0b0c', dx: -3, dy: 6, steps: 4, box: [0, 100, W, 860], key: 'el' });
    // his breath, a little mist from his mouth as he lifts his head
    if (rise > 0.4) { const hx = px + 0.47 * s, hy = py - 0.2 * s * rise; ctx.save(); for (let i = 0; i < 4; i++) { const k = ((t * 0.5 + i / 4) % 1); glow(ctx, [255, 255, 255], hx + k * 90, hy - k * 20, 30 + k * 40, 0.08 * (1 - k) * rise, 'source-over'); } ctx.restore(); }
    finish(ctx, { bloom: 0.25, vig: 0.55, vigIn: 0.3 });
    void y0;
  }

  // ================================================================ shot 4, "The fire. I remember the fire.": his hands
  function shotHands(ctx, t, sh) {
    const C04 = K.cue('C04'), lt = t - C04.start, u = span(t, sh.a - 0.3, sh.b + 0.5);
    const c = { x: lerp(-20, 30, ease(u)), y: lerp(-10, 12, ease(u)), z: lerp(1.0, 1.07, ease(u)) };
    nearWorld(ctx, c, 860, t, { sunX: 0.58, far: true, seed: 861 });
    // the memory of the fire: a warm flicker on his hands at "the fire", that cools back to grey
    const mem = Math.max(smooth(span(lt, -0.1, 0.3)) * (1 - smooth(span(lt, 0.6, 1.4))), 0.6 * smooth(span(lt, 2.4, 2.7)) * (1 - smooth(span(lt, 2.9, 3.6))));
    const fl = 0.75 + 0.25 * Math.sin(t * 17) * Math.sin(t * 7.3);
    const rimC = rgb(mix([226, 230, 234], [255, 150, 70], mem * fl));
    const tr = Math.sin(t * 9.1) * 3 + Math.sin(t * 13.7) * 2;
    const tz = c.z, X = v => (v - W / 2 - c.x) * tz + W / 2, Y = v => (v - H / 2 - c.y) * tz + H / 2;
    const lift = easeOut(span(t, sh.a - 0.2, sh.a + 0.9));
    rimLit(ctx, (cc, fill) => {
      cc.fillStyle = fill;
      palm(cc, X(1180) + tr, Y(860 - 120 * lift), 330 * tz, 0.18, 0.15, 0.25 + 0.15 * Math.sin(t * 0.9), false);
      palm(cc, X(1480) - tr * 0.7, Y(900 - 110 * lift), 310 * tz, -0.12, 0.2, 0.3 + 0.1 * Math.sin(t * 1.1 + 1), true);
      // his head and shoulder close at the left, from behind, bowed to look
      cc.beginPath(); smoothPath(cc, [[X(-80), Y(1300)], [X(-90), Y(930)], [X(140), Y(840)], [X(320), Y(835)], [X(560), Y(905)], [X(720), Y(1040)], [X(780), Y(1300)]]); cc.fill();
      cap(cc, X(300), Y(700), X(270), Y(880), 75 * tz, 95 * tz);
      head(cc, X(330), Y(560), 380 * tz, 0.32, 0);
    }, { rim: rimC, mid: '#3d4147', dark: '#0a0b0c', dx: 2, dy: 6, steps: 4 });
    if (mem > 0.02) { glow(ctx, [255, 110, 40], X(1330), Y(1050), 620, 0.22 * mem * fl); glow(ctx, [255, 170, 90], X(1330), Y(900), 260, 0.12 * mem * fl); }
    finish(ctx, { bloom: 0.28, vig: 0.55, vigIn: 0.3 });
  }

  // ================================================================ shot 5: the Wyrdmark
  // A 3D world: y up, metres. Cael at the front edge of a shelf of black stone (origin); the grey plain beyond it to the
  // horizon; the low sun ahead; the line of the dead coming from behind on the left, passing before the shelf and walking
  // away into the light.
  const FOC = 1150;
  function cam3(px, py, pz, pitch, yaw) {
    const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
    return {
      px, py, pz, cp, sp, cy, sy,
      p(x, y, z) { const dx = x - px, dy = y - py, dz = z - pz, x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy, y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp; return [W / 2 + FOC * x1 / z2, H / 2 - FOC * y2 / z2, z2]; },
      d(x, y, z) { const x1 = x * cy - z * sy, z1 = x * sy + z * cy, y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp; return [W / 2 + FOC * x1 / z2, H / 2 - FOC * y2 / z2, z2]; },
      c(x, y, z) { const dx = x - px, dy = y - py, dz = z - pz, x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy; return [x1, dy * cp - z1 * sp, dy * sp + z1 * cp]; },
    };
  }
  // a world polygon clipped to the near plane and projected
  function clipPoly(C, pts3, near = 0.3) {
    const cs = pts3.map(p => C.c(p[0], p[1], p[2])), out = [];
    for (let i = 0; i < cs.length; i++) {
      const a = cs[i], b = cs[(i + 1) % cs.length], ain = a[2] >= near, bin = b[2] >= near;
      if (ain) out.push(a);
      if (ain !== bin) { const k = (near - a[2]) / (b[2] - a[2]); out.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k), near]); }
    }
    return out.map(q => [W / 2 + FOC * q[0] / q[2], H / 2 - FOC * q[1] / q[2], q[2]]);
  }
  const PATH = (() => {
    const ctrl = [[-140, -90], [-60, -10], [-18, 7], [12, 10], [40, 40], [90, 170], [190, 650], [360, 2200], [520, 5200]];
    const pts = [ctrl[0]];
    for (let i = 1; i < ctrl.length; i++) { const a = ctrl[i - 1], b = ctrl[i], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4); for (let k = 1; k <= n; k++) pts.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]); }
    // smooth it
    for (let it = 0; it < 6; it++) for (let i = 1; i < pts.length - 1; i++) pts[i] = [(pts[i - 1][0] + pts[i][0] * 2 + pts[i + 1][0]) / 4, (pts[i - 1][1] + pts[i][1] * 2 + pts[i + 1][1]) / 4];
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, len: cum[cum.length - 1] };
  })();
  function pathAt(s) {
    const { pts, cum } = PATH; s = clamp(s, 0, PATH.len - 0.01);
    let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const k = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1), a = pts[lo], b = pts[hi];
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), b[0] - a[0], b[1] - a[1]];
  }
  const SUN = (() => { const az = Math.atan2(520, 5200) + 0.02, el = 0.05; return [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)]; })();
  // the shelf of black stone Cael woke on: an outline in x, z (it ends at a ragged edge just in front of him)
  const SHELF = (() => { const pts = [], cx = 1, rx = 48, rz = 70; const m = a => 1 + 0.08 * (K.fbm(Math.cos(a) * 3 + 3, Math.sin(a) * 3 + 3, 5, 872) - 0.5) * 2 + 0.012 * Math.sin(a * 37); for (let i = 0; i < 120; i++) { const a = -Math.PI / 2 + i / 120 * TAU, k = m(a), sn = Math.sin(a), ze = sn > 0 ? Math.pow(sn, 0.3) : sn; pts.push([cx + Math.cos(a) * rx * k, 0.7 - rz * (1 - ze) - (sn > 0 ? Math.abs(1 - k) * 4 : 0)]); } return pts; })();
  const GROUND = (() => { const r = rng(881), out = []; for (let i = 0; i < 1100; i++) { const R = 4 + Math.pow(r(), 1.6) * 260, a = r() * TAU, x = Math.cos(a) * R, z = Math.sin(a) * R * 1.4 + 60 * r(); out.push({ x, z, s: 0.3 + r() * 2.6 * (0.4 + R / 260), k: r(), a: r() * 3 }); } return out; })();
  const DVEINS = (() => {
    const r = rng(891), segs = [];
    const grow = (x, z, a, len, w, d, depth) => {
      const step = 0.35, n = Math.ceil(len / step);
      for (let i = 0; i < n; i++) { a += (r() - 0.5) * 0.6; const nx = x + Math.cos(a) * step, nz = z + Math.sin(a) * step; segs.push([x, z, nx, nz, d, w * (1 - 0.6 * i / n)]); x = nx; z = nz; d += step; if (depth < 2 && r() < 0.1) grow(x, z, a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), len * 0.4, w * 0.6, d, depth + 1); }
    };
    for (let k = 0; k < 7; k++) grow(0.3, 0.6, -0.25 + k / 6 * (Math.PI + 0.5) + (r() - 0.5) * 0.3, 14 + r() * 12, 1, 0, 0);
    for (let k = 0; k < 3; k++) grow(0.3, 0.4, Math.PI + 0.6 + k * 0.8, 5 + r() * 4, 0.7, 0, 1);
    return segs;
  })();
  // one of the dead: a grey, hooded, bowed shape walking slowly; (x, y) feet, h height, f facing (-1..1: sideways; 0 away), ph step
  function shade(ctx, x, y, h, f, ph, col) {
    ctx.fillStyle = col;
    if (h < 4) { ctx.fillRect(x - Math.max(0.6, h * 0.12), y - h, Math.max(1.2, h * 0.24), h); return; }
    const sd = Math.abs(f), d = f >= 0 ? 1 : -1, sw = Math.sin(ph) * 0.07, bob = Math.abs(Math.cos(ph)) * 0.012;
    const P = (bx, px) => lerp(bx, px * d, sd);     // back-view x .. profile x
    ctx.save(); ctx.translate(x, y - bob * h); ctx.scale(h, h);
    // legs stepping under the hem
    ctx.fillRect(P(-0.05, -0.02) + sw * sd, -0.14, 0.035, 0.14); ctx.fillRect(P(0.015, 0.0) - sw * sd, -0.14, 0.035, 0.14);
    ctx.beginPath();
    ctx.moveTo(P(-0.07, -0.02), -0.83);                                  // nape
    ctx.quadraticCurveTo(P(-0.13, -0.11), -0.76, P(-0.135, -0.12), -0.6);  // back of the shoulders
    ctx.quadraticCurveTo(P(-0.15, -0.14), -0.3, P(-0.16, -0.17 + sw * 0.6), -0.1);
    ctx.lineTo(P(0.16, 0.12 + sw * 0.6), -0.1);                           // hem
    ctx.quadraticCurveTo(P(0.15, 0.1), -0.4, P(0.135, 0.1), -0.65);         // front of the robe
    ctx.quadraticCurveTo(P(0.12, 0.09), -0.76, P(0.07, 0.07), -0.8);
    ctx.closePath(); ctx.fill();
    // the hooded head, bowed forward
    ctx.beginPath(); ctx.ellipse(P(0, 0.06), -0.86, P(0.07, 0.075), 0.08, P(0, 0.5 * d), 0, TAU); ctx.fill();
    ctx.restore();
  }
  function shotMark(ctx, t, sh, sc) {
    const C04 = K.cue('C04'), V02 = K.cue('V02'), V03 = K.cue('V03');
    // the camera: behind him, low; it rises and draws back through V02, then keeps drifting up and away
    const k1 = ease(span(t, sh.a + 1.1, V02.end + 0.8)), k2 = span(t, V02.end + 0.2, sc.end + 2.5), k2e = k2 * (0.6 + 0.4 * k2);
    const px = lerp(0.9, -2.5, k1) + 16 * k2e, py = lerp(1.15, 20, k1) + 14 * k2e, pz = lerp(-2.7, -46, k1) - 26 * k2e;
    const pitch = lerp(-0.02, -0.17, k1) - 0.05 * k2e, yaw = lerp(0.05, 0.1, k1) - 0.26 * k2e;
    const C = cam3(px, py, pz, pitch, yaw);
    // the sky: pale, almost white at the horizon; the cold low sun
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const hor = H / 2 + FOC * Math.tan(pitch) * -1 * -1 - FOC * Math.tan(-pitch) * 0;
    const hy = H / 2 - FOC * Math.tan(-pitch) * -1;
    let g = ctx.createLinearGradient(0, hy - 900, 0, hy); g.addColorStop(0, '#61686f'); g.addColorStop(0.55, '#a2a8ad'); g.addColorStop(0.9, '#d6d9db'); g.addColorStop(1, '#e8e9ea'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    void hor;
    const sp = C.d(SUN[0], SUN[1], SUN[2]);
    glow(ctx, [235, 240, 248], sp[0], sp[1], 900, 0.15); glow(ctx, [245, 248, 255], sp[0], sp[1], 200, 0.4);
    ctx.save(); ctx.fillStyle = '#fbfcfe'; ctx.globalAlpha = 0.92; ctx.beginPath(); ctx.arc(sp[0], sp[1], 17, 0, TAU); ctx.fill(); ctx.restore();
    // strata of cloud
    fog(ctx, 901, hy - 520, 200, t * 3 + px * 6, 0.18); fog(ctx, 902, hy - 300, 140, -t * 2 + px * 8, 0.22);
    // the plain: grey ground growing paler into the mist towards the horizon
    g = ctx.createLinearGradient(0, hy, 0, H); g.addColorStop(0, '#d9dbdc'); g.addColorStop(0.08, '#b7babc'); g.addColorStop(0.35, '#8c9093'); g.addColorStop(1, '#6a6e72'); ctx.fillStyle = g; ctx.fillRect(0, hy, W, H - hy);
    // the low light along the ground towards the sun
    glow(ctx, [250, 252, 255], sp[0], hy + 6, 600, 0.18);
    // ash drifts, stones, cracks on the plain
    for (const q of GROUND) {
      const a = C.p(q.x, 0, q.z); if (a[2] < 1) continue; const sz = q.s * FOC / a[2]; if (sz < 0.4 || a[1] < hy) continue;
      const fade = clamp(a[2] / 260), flat = Math.max(0.06, Math.abs(Math.sin(Math.atan2(py, a[2]))));
      if (q.k < 0.45) { ctx.fillStyle = rgbs(mix([58, 61, 65], [196, 199, 201], fade), 0.55); ctx.beginPath(); ctx.ellipse(a[0], a[1], sz * 0.35, sz * 0.35 * flat + 0.6, q.a, 0, TAU); ctx.fill(); }
      else if (q.k < 0.93) { ctx.fillStyle = rgbs(mix([170, 173, 176], [214, 216, 217], fade), 0.35); ctx.beginPath(); ctx.ellipse(a[0], a[1], sz * 2.4, sz * 0.5 * flat + 0.4, 0, 0, TAU); ctx.fill(); }
      else { ctx.strokeStyle = rgbs(mix([96, 99, 103], [196, 199, 201], fade), 0.28); ctx.lineWidth = Math.max(0.5, sz * 0.05); ctx.beginPath(); ctx.moveTo(a[0] - sz * 2, a[1]); ctx.quadraticCurveTo(a[0], a[1] + sz * flat * (q.a - 1.5) * 0.6, a[0] + sz * 2.2, a[1] - sz * flat * 0.3); ctx.stroke(); }
    }
    // the shelf of black stone, wet, with the light lying in it
    {
      const pr = clipPoly(C, SHELF.map(([x, z]) => [x, 0.12, z]));
      if (pr.length > 2) {
        ctx.beginPath(); pr.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath();
        g = ctx.createLinearGradient(0, hy, 0, H); g.addColorStop(0, '#45494e'); g.addColorStop(0.15, '#1a1c1f'); g.addColorStop(1, '#08090a'); ctx.fillStyle = g; ctx.fill();
        ctx.save(); ctx.clip();
        // the sun's road across the wet stone
        
        const rr = rng(873); ctx.fillStyle = 'rgba(220,224,230,0.2)'; for (let i = 0; i < 140; i++) { const q = C.p(lerp(-40, 30, rr()), 0.13, lerp(-120, 0.3, rr())); if (q[2] < 0.3) continue; const w = 1.5 * FOC / q[2]; ctx.fillRect(q[0] - w, q[1], w * 2, Math.max(1, 0.03 * FOC / q[2])); }
        ctx.restore();
        // its front edge, a dark step down to the plain
        const fr = SHELF.slice(60, 120).map(([x, z]) => [C.p(x, 0.12, z), C.p(x, 0, z + 0.05)]).filter(q => q[0][2] > 0.3 && q[1][2] > 0.3);
        ctx.fillStyle = '#060607'; ctx.beginPath(); fr.forEach((q, i) => i ? ctx.lineTo(q[0][0], q[0][1]) : ctx.moveTo(q[0][0], q[0][1])); for (let i = fr.length - 1; i >= 0; i--) ctx.lineTo(fr[i][1][0], fr[i][1][1] + 1); ctx.closePath(); ctx.fill();
      }
    }
    // the curse in the ground beneath him, faint, waking when he stands
    const walk = V03.start + 5.75, vfront = 26 * easeOut(span(t, walk - 0.4, walk + 4.6)), va = smooth(span(t, walk - 0.6, walk + 0.8));
    if (va > 0) {
      ctx.save(); ctx.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (const s of DVEINS) { if (s[4] > vfront) continue; const f = Math.min(1, (vfront - s[4]) / 0.35), A = C.p(s[0], 0.01, s[1]), B = C.p(lerp(s[0], s[2], f), 0.01, lerp(s[1], s[3], f)); if (A[2] < 0.5) continue; ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); }
        const zf = FOC / Math.hypot(px, py, pz);
        if (pass === 0) { ctx.strokeStyle = rgbs([70, 8, 6], 0.48 * va); ctx.lineWidth = Math.max(0.8, 0.065 * zf); ctx.stroke(); }
        else { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgbs([150, 20, 14], 0.1 * va * (0.8 + 0.2 * Math.sin(t * 2.4))); ctx.lineWidth = Math.max(2.5, 0.4 * zf); ctx.stroke(); }
      }
      ctx.restore();
    }
    // the dead: a long line walking slowly to the light (near ones shaped, far ones a thread of specks)
    {
      const sp0 = 0.55, spacing = 3.4, items = [];
      const nMax = Math.floor(PATH.len / spacing);
      for (let i = 0; i < nMax; i++) {
        const s = ((i * spacing + t * sp0) % PATH.len), jit = K.hash(i, 3, 5) - 0.5, [x, z, dx, dz] = pathAt(s), l = Math.hypot(dx, dz) || 1;
        const X = x - dz / l * jit * 2.4, Z = z + dx / l * jit * 2.4, q = C.p(X, 0, Z); if (q[2] < 1) continue;
        const hgt = (1.6 + 0.25 * K.hash(i, 7, 9)) * FOC / q[2]; if (q[0] < -40 || q[0] > W + 40) continue;
        items.push([q, hgt, i, dx / l, dz / l]);
      }
      items.sort((a, b) => b[0][2] - a[0][2]);
      for (const [q, hgt, i, ux, uz] of items) {
        const fade = clamp((q[2] - 20) / 900), col = rgb(mix([46, 49, 53], [196, 199, 201], Math.pow(fade, 0.6)));
        const fs = ux * C.cy - uz * C.sy;
        shade(ctx, q[0], q[1], hgt, clamp(fs * 1.4, -1, 1), t * 1.7 + i * 1.3, col);
      }
    }
    // mist lying across the plain, drifting; thicker at the start, thinning as it opens
    const thin = smooth(span(t, sh.a, V02.start + 1.0));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const [d, seed, a, hgt] of [[18, 911, 0.5, 1], [45, 912, 0.45, 1], [110, 913, 0.42, 1], [260, 914, 0.5, 1], [700, 915, 0.6, 1]]) {
      const q = C.p(px, 0, pz + d * Math.cos(yaw)); const yy = q[2] > 0 ? q[1] : H + 100, hh = Math.max(20, 260 * 30 / d * (0.4 + py / 30));
      fog(ctx, seed, yy - hh * 0.75, hh, t * (10 + d * 0.01) + px * 20, a * lerp(1.5, 0.75, thin) * (0.7 + 0.3 * smooth(span(yy, hy, hy + 200))));
    }
    // Cael, at the edge: kneeling with his back to us; on "it lets one walk back" he stands and turns against the line
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    {
      const up = smooth(span(t, walk - 0.1, walk + 1.4)), back = Math.max(0, t - (walk + 2.0)) * 0.5;
      const q = C.p(0.3 - back * 0.3, 0.12, 0.2 - back), hgt = 1.78 * FOC / q[2];
      const body = (cc, fill, russet) => {
        cc.save(); cc.translate(q[0], q[1]); cc.scale(hgt, hgt); cc.fillStyle = fill;
        const hk = 1;
        if (up < 0.5) {
          // kneeling, sitting back on his heels: the cloak pooled on the stone, the back bent, arms hanging, head bowed
          cc.beginPath(); cc.moveTo(-0.23, 0.005); cc.bezierCurveTo(-0.21, -0.08, -0.18, -0.16, -0.17, -0.27); cc.bezierCurveTo(-0.17, -0.38, -0.19, -0.48, -0.16, -0.555);
          cc.quadraticCurveTo(-0.15, -0.6, -0.05, -0.615); cc.lineTo(0.05, -0.615); cc.quadraticCurveTo(0.15, -0.6, 0.145, -0.54);
          cc.bezierCurveTo(0.19, -0.48, 0.17, -0.38, 0.175, -0.27); cc.bezierCurveTo(0.18, -0.16, 0.21, -0.08, 0.23, 0.005); cc.quadraticCurveTo(0, 0.02, -0.23, 0.005); cc.closePath(); cc.fill();
          for (const sx of [-1, 1]) cap(cc, sx * 0.14, -0.53, sx * 0.17, -0.3, 0.035, 0.03);
          cap(cc, 0, -0.6, 0, -0.66, 0.035, 0.03);
        } else {
          for (const sx of [-1, 1]) cc.fillRect(sx * 0.035 - 0.025, -0.32, 0.05, 0.32);
          cc.beginPath(); cc.moveTo(-0.17, -0.2); cc.bezierCurveTo(-0.16, -0.45, -0.15, -0.65, -0.12, -0.79); cc.quadraticCurveTo(0, -0.83, 0.12, -0.79); cc.bezierCurveTo(0.15, -0.65, 0.16, -0.45, 0.17, -0.2); cc.quadraticCurveTo(0, -0.17, -0.17, -0.2); cc.closePath(); cc.fill();
        }
        const hy0 = up < 0.5 ? -0.7 : -0.87;
        cc.beginPath(); cc.ellipse(0, hy0, 0.058, 0.07, 0, 0, TAU); cc.fill();
        cc.beginPath(); smoothPath(cc, [[-0.066, hy0 + 0.05], [-0.072, hy0 - 0.02], [-0.05, hy0 - 0.068], [0.0, hy0 - 0.082], [0.05, hy0 - 0.068], [0.072, hy0 - 0.02], [0.068, hy0 + 0.05], [0.05, hy0 + 0.075], [0.02, hy0 + 0.05], [-0.02, hy0 + 0.078], [-0.05, hy0 + 0.05]]); cc.fill();
        if (russet) { cc.fillStyle = 'rgba(110,82,54,0.16)'; cc.beginPath(); if (up < 0.5) { cc.moveTo(-0.13, -0.56); cc.quadraticCurveTo(0, -0.6, 0.13, -0.56); cc.lineTo(0.27, -0.01); cc.lineTo(-0.27, -0.01); } else { cc.moveTo(-0.12, -0.76); cc.quadraticCurveTo(0, -0.8, 0.12, -0.76); cc.lineTo(0.16, -0.22); cc.lineTo(-0.16, -0.22); } cc.closePath(); cc.fill(); }
        cc.restore();
      };
      if (hgt > 60) rimLit(ctx, (cc, fill) => body(cc, fill, false), { rim: '#eef0f2', mid: '#2e3034', dark: '#0d0e10', dx: 0, dy: Math.min(8, hgt * 0.012), steps: 3 });
      else body(ctx, '#121315', false);
      body(ctx, 'rgba(0,0,0,0)', true);
    }
    if (thin < 1) { ctx.fillStyle = `rgba(236,238,239,${0.45 * (1 - thin)})`; ctx.fillRect(0, 0, W, H); }
    finish(ctx, { bloom: 0.22, vig: 0.42, vigIn: 0.34, tooth: 0.14 });
    void C04;
  }

  // ================================================================ the cut
  let PLAN = null;
  function plan(sc) {
    if (PLAN) return PLAN;
    const V01 = K.cue('V01'), C04 = K.cue('C04');
    const b = [sc.start, V01.start - 0.15, C04.start - 0.2, C04.end + 0.45, sc.end + 3];
    const S = [
      { id: 'hand', fn: shotHand, x: 0.5 },
      { id: 'elbows', fn: shotElbows, x: 0.5 },
      { id: 'hands', fn: shotHands, x: 1.0 },
      { id: 'mark', fn: shotMark, x: 0 },
    ];
    S.forEach((s, i) => { s.a = b[i]; s.b = b[i + 1]; });
    PLAN = S; return S;
  }

  SCENES[8] = {
    join: 'cut',
    draw(ctx, t, sc) {
      const S = plan(sc);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (t < sc.start + 0.9) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); return; }
      let i = S.findIndex(s => t < s.b); if (i < 0) i = S.length - 1;
      const cur = S[i], prev = S[i - 1];
      const mixTwo = (A, B, k) => {
        MIXING = true; A.fn(ctx, t, A, sc);
        const L = K.layer('s8:next'), lx = L.getContext('2d'); B.fn(lx, t, B, sc);
        MIXING = false;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = k; ctx.drawImage(L, 0, 0); ctx.globalAlpha = 1;
        bloom(ctx, 0.22);
      };
      if (prev && t < cur.a + prev.x / 2) mixTwo(prev, cur, smooth((t - (cur.a - prev.x / 2)) / prev.x));
      else { const nxt = S[i + 1]; if (nxt && t > cur.b - cur.x / 2) mixTwo(cur, nxt, smooth((t - (cur.b - cur.x / 2)) / cur.x)); else cur.fn(ctx, t, cur, sc); }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },
  };
})();
