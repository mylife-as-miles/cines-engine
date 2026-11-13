/* Scene 7: The Fire [C01–C03, L39–L41]. Night in a forest clearing; the fire is the only light. Cael lies bound on an
   iron grate over the flames, head raised towards the ring of hooded, masked men, and mocks them. The fire roars; he looks
   at their leader and the torch lowers. Then the fire alone in the dark, the men walking away, the flames dying; the
   oak-leaf clasp in the mud in the rain; the curse's red veins glowing out under the ashes; the embers rising through the
   canopy to become stars while a First-Born crosses the moon. Told in silhouette, light and the killers' reaction: no
   wounds, no burning flesh. Registers window.SCENES[7]; see LOOK.md. */
(function () {
  'use strict';
  const K = window.KIT, W = K.W, H = K.H;
  const { clamp, lerp, smooth, ease, easeOut, easeIn, span, rng } = K;
  const SCENES = window.SCENES = window.SCENES || {};
  const TAU = Math.PI * 2;

  // ================================================================ helpers
  const rgbs = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const rgb = c => `rgb(${clamp(c[0], 0, 255) | 0},${clamp(c[1], 0, 255) | 0},${clamp(c[2], 0, 255) | 0})`;
  const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
  // firelight flicker, about 1
  const flick = (t, s, sp = 9) => 0.8 + 0.12 * Math.sin(t * sp + s * 3.7) + 0.08 * Math.sin(t * sp * 2.3 + s * 1.3) + 0.1 * (K.noise(t * 5.5, s * 7.1, 3) - 0.5) * 2;
  // view(ctx, c, d): a layer at depth d (1 the focal plane, smaller farther, larger nearer) seen by camera c {x, y, z, r}
  function view(ctx, c, d = 1) {
    const z = 1 + (c.z - 1) * d;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(W / 2, H / 2);
    if (c.r) ctx.rotate(c.r * Math.min(1, d)); ctx.scale(z, z); ctx.translate(-W / 2 - c.x * d, -H / 2 - c.y * d);
  }
  function proj(c, d, x, y) { const z = 1 + (c.z - 1) * d; return [W / 2 + (x - W / 2 - c.x * d) * z, H / 2 + (y - H / 2 - c.y * d) * z, z]; }
  function smoothPath(p, pts) {
    const n = pts.length; p.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    p.closePath();
  }
  // a tapered limb between two points, filled with the current fillStyle (quad and end discs filled apart, no holes)
  function cap(ctx, ax, ay, bx, by, ra, rb) {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-6, nx = -dy / L, ny = dx / L;
    ctx.beginPath(); ctx.moveTo(ax + nx * ra, ay + ny * ra); ctx.lineTo(bx + nx * rb, by + ny * rb); ctx.lineTo(bx - nx * rb, by - ny * rb); ctx.lineTo(ax - nx * ra, ay - ny * ra); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(ax, ay, ra, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(bx, by, rb, 0, TAU); ctx.fill();
  }
  // a soft round light (cached sprite), additive
  function glowImg(c) {
    return K.cached('s7:glow:' + c, () => {
      const s = 128, cv = K.canvas(s, s), x = cv.getContext('2d'), g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, rgbs(c, 1)); g.addColorStop(0.12, rgbs(c, 0.6)); g.addColorStop(0.35, rgbs(c, 0.2)); g.addColorStop(0.65, rgbs(c, 0.06)); g.addColorStop(1, rgbs(c, 0));
      x.fillStyle = g; x.fillRect(0, 0, s, s); return cv;
    });
  }
  function glow(ctx, c, x, y, r, a) {
    if (a <= 0.004 || r < 0.5) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glowImg(c), x - r, y - r, 2 * r, 2 * r); ctx.restore();
  }
  // a small flame (a torch): a teardrop with a hot core, licking; (x, y) its base, s its height
  function flame(ctx, x, y, s, t, seed, heat = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const ph = seed * 1.7 + k * 2.1, sw = Math.sin(t * 7.3 + ph) * 0.18 + (K.noise(t * 5, seed + k, 9) - 0.5) * 0.4;
      const hh = s * (1 - k * 0.22) * (0.85 + 0.3 * K.noise(t * 6.5 + k * 3, seed, 4)), ww = s * (0.3 - k * 0.06);
      const col = k === 0 ? [235, 96, 30] : k === 1 ? [255, 158, 60] : [255, 236, 190];
      ctx.globalAlpha = (k === 0 ? 0.6 : k === 1 ? 0.75 : 0.9) * heat; ctx.fillStyle = rgbs(col, 1);
      ctx.beginPath(); ctx.moveTo(x - ww, y);
      ctx.bezierCurveTo(x - ww * 1.1, y - hh * 0.45, x + sw * ww * 2 - ww * 0.3, y - hh * 0.7, x + sw * s * 0.5, y - hh);
      ctx.bezierCurveTo(x + sw * ww * 2 + ww * 0.3, y - hh * 0.7, x + ww * 1.1, y - hh * 0.45, x + ww, y);
      ctx.quadraticCurveTo(x, y + ww * 0.5, x - ww, y); ctx.fill();
    }
    ctx.restore();
  }
  function torchLight(ctx, p, s, t, seed, a = 1) {
    const f = flick(t, seed, 11);
    glow(ctx, [255, 120, 40], p[0], p[1] - s * 0.3, s * 5.5, 0.22 * f * a);
    glow(ctx, [255, 200, 120], p[0], p[1] - s * 0.35, s * 1.4, 0.5 * f * a);
    flame(ctx, p[0], p[1] + s * 0.1, s * f, t, seed, a);
  }
  // fire(ctx, x, y, w, h, t, seed, o): a living fire standing on (x, y): tongues that lick, split and sway, drawn small in a
  // scratch layer and enlarged so the edges stay soft. o.heat, o.n tongues, o.res (smaller is softer), o.hmax (the
  // tallest h the slot will see: the scratch layer keeps one size), o.slot
  function fire(ctx, x, y, w, h, t, seed, o = {}) {
    const heat = o.heat != null ? o.heat : 1, n = o.n || 8, res = o.res || 0.3, hm = o.hmax || Math.ceil(h * 1.3 / 50) * 50; h = Math.min(h, hm);
    const cw = Math.ceil(w * 2.4 * res) + 6, ch = Math.ceil(hm * 1.4 * res) + 6;
    const L = K.layer('s7:fire:' + (o.slot || 'a'), cw, ch), lx = L.getContext('2d');
    lx.translate(cw / 2, ch - 3); lx.scale(res, res); lx.globalCompositeOperation = 'lighter';
    const tongue = (bx, hh, ww, sway, col, a) => {
      const g = lx.createLinearGradient(0, 0, 0, -hh); g.addColorStop(0, rgbs(col, a)); g.addColorStop(0.55, rgbs(col, a * 0.85)); g.addColorStop(0.85, rgbs(col, a * 0.45)); g.addColorStop(1, rgbs(col, 0));
      lx.fillStyle = g; lx.beginPath(); lx.moveTo(bx - ww, 0);
      lx.bezierCurveTo(bx - ww * 1.1, -hh * 0.35, bx - ww * 0.35 + sway * 0.5, -hh * 0.62, bx + sway, -hh);
      lx.bezierCurveTo(bx + ww * 0.4 + sway * 0.5, -hh * 0.6, bx + ww * 1.1, -hh * 0.33, bx + ww, 0); lx.quadraticCurveTo(bx, ww * 0.35, bx - ww, 0); lx.fill();
    };
    const bg = lx.createRadialGradient(0, -h * 0.05, 0, 0, -h * 0.05, w * 0.7); bg.addColorStop(0, rgbs([255, 170, 70], 0.6 * heat)); bg.addColorStop(0.5, rgbs([230, 90, 20], 0.25 * heat)); bg.addColorStop(1, rgbs([200, 60, 10], 0)); lx.fillStyle = bg; if (o.bed !== false) { lx.beginPath(); lx.ellipse(0, -h * 0.05, w * 0.7, Math.min(w * 0.7, h * 0.5), 0, 0, TAU); lx.fill(); }
    for (let layer = 0; layer < 3; layer++) {
      const col = layer === 0 ? [230, 74, 18] : layer === 1 ? [255, 150, 46] : [255, 232, 170], al = (layer === 0 ? 0.55 : layer === 1 ? 0.6 : 0.8) * heat, shrink = 1 - layer * 0.3;
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n - 0.5, ph = seed * 3.3 + i * 2.17, nz = K.noise(t * 3.4 + i * 7.3, seed + layer * 0.5, 11);
        const lick = 0.5 + 0.7 * nz * (1 - Math.abs(k) * 1.1) + 0.12 * Math.sin(t * 10 + ph);
        const hh = h * lick * shrink * (1 - Math.abs(k) * 0.75), ww = w * (0.15 + 0.09 * (1 - Math.abs(k))) * shrink, sway = (K.noise(t * 2.6 + i, seed + 5, 12) - 0.5) * w * 0.7 + Math.sin(t * 7 + ph) * w * 0.05;
        tongue(k * w * 0.95 * shrink, hh, ww, sway, col, al);
      }
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(L, x - cw / res / 2, y - (ch - 3) / res, cw / res, ch / res); ctx.restore();
  }
  // rimLit(ctx, draw, o): silhouettes lit along one edge. draw(c, fill) paints them in one colour; dark passes shifted by
  // (o.dx, o.dy) screen px cover all but a sliver, which is the rim. o.rim, o.mid, o.dark, o.box [x, y, w, h] (screen)
  function rimLit(ctx, draw, o) {
    const n = o.steps || 4, bx = o.box ? Math.max(0, Math.floor(o.box[0])) : 0, by = o.box ? Math.max(0, Math.floor(o.box[1])) : 0;
    const bw = o.box ? Math.max(1, Math.min(W - bx, Math.ceil(o.box[2] - (bx - o.box[0])))) : W, bh = o.box ? Math.max(1, Math.min(H - by, Math.ceil(o.box[3] - (by - o.box[1])))) : H;
    const L = K.layer(o.box ? 's7:rimb:' + (o.key || 'k') : 's7:rim', o.box ? (o.lw || bw) : W, o.box ? (o.lh || bh) : H), lc = L.getContext('2d'), m = ctx.getTransform();
    lc.setTransform(m.a, m.b, m.c, m.d, m.e - bx, m.f - by); draw(lc, o.rim);
    lc.globalCompositeOperation = 'source-atop';
    for (let i = 1; i <= n; i++) { const k = i / n; lc.setTransform(m.a, m.b, m.c, m.d, m.e - bx + o.dx * k, m.f - by + o.dy * k); lc.globalAlpha = i === n ? 1 : 0.45; draw(lc, i === 1 && o.mid ? o.mid : o.dark); }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); if (o.alpha != null) ctx.globalAlpha = o.alpha; ctx.drawImage(L, 0, 0, bw, bh, bx, by, bw, bh); ctx.restore();
  }
  // a cheap bloom: the frame shrunk twice, its brights raised, laid back with screen
  function bloom(ctx, a = 0.3, th = 2) {
    if (a <= 0) return;
    const A = K.layer('s7:bl1', W / 4, H / 4), B = K.layer('s7:bl2', W / 8, H / 8), ax = A.getContext('2d'), bx = B.getContext('2d');
    ax.drawImage(ctx.canvas, 0, 0, W / 4, H / 4); bx.drawImage(A, 0, 0, W / 8, H / 8);
    bx.globalCompositeOperation = 'multiply'; for (let i = 0; i < th; i++) bx.drawImage(B, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = a; ctx.imageSmoothingQuality = 'medium'; ctx.drawImage(B, 0, 0, W, H); ctx.restore();
  }
  function vignetteImg(a, inner) {
    const qa = Math.round(a * 40) / 40, qi = Math.round(inner * 40) / 40;
    return K.cached(`s7:vig:${qa}:${qi}`, () => { const c = K.canvas(W, H), x = c.getContext('2d'); K.vignette(x, qa, '0,0,0', qi); return c; });
  }
  let MIXING = false;   // while two shots dissolve, each skips its bloom and the mix gets one
  function finish(ctx, o = {}) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (o.bloom && !MIXING) bloom(ctx, o.bloom, o.bloomTh || 2);
    if (o.shadow) { const n = parseInt(o.shadow.slice(1), 16), k = (o.shadowA || 0.3) * 0.55, m = v => Math.round(255 - (255 - v) * k); ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(${m(n >> 16 & 255)},${m(n >> 8 & 255)},${m(n & 255)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    ctx.drawImage(vignetteImg(o.vig != null ? o.vig : 0.6, o.vigIn != null ? o.vigIn : 0.32), 0, 0);
  }
  // heat haze: the region (screen px) re-laid in thin bands that waver, a little ghosted
  function haze(ctx, x, y, w, h, t, amp = 3) {
    x = Math.max(0, Math.floor(x)); y = Math.max(0, Math.floor(y)); w = Math.min(W - x, Math.ceil(w)); h = Math.min(H - y, Math.ceil(h));
    if (w < 8 || h < 8 || amp <= 0.1) return;
    const L = K.layer('s7:haze'), lx = L.getContext('2d'); lx.drawImage(ctx.canvas, x, y, w, h, 0, 0, w, h);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.8;
    const band = 5;
    for (let j = 0; j < h; j += band) {
      const v = j / h, k = Math.sin(Math.PI * v), yy = y + j;
      const dx = amp * k * (Math.sin(t * 8.5 + yy * 0.043) + 0.6 * Math.sin(t * 13.1 - yy * 0.105) + 0.5 * (K.noise(yy * 0.02, t * 3, 8) - 0.5));
      ctx.drawImage(L, 0, j, w, band, x + dx, yy, w, band);
    }
    ctx.restore();
  }
  // sparks: hot streaks thrown up from a fire. o.x, o.y source (spread o.w), o.h rise, o.n, o.heat, o.wind, o.seed, o.speed
  function sparks(ctx, t, o) {
    const r = rng(o.seed || 1), n = o.n || 40, heat = o.heat != null ? o.heat : 1, spd = o.speed || 1, zs = o.size || 1;
    if (heat <= 0.01) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const life = (1.4 + r() * 2.6) / spd, off = r() * life, sp = 0.45 + r() * 0.85, ph = r() * TAU, sw = 20 + r() * 80, sz = (1.2 + r() * 2.0) * zs, wob = r(), big = r() < 0.18;
      const cyc = Math.floor((t + off) / life), age = ((t + off) % life) / life, x0 = o.x + (K.hash(i, cyc, o.seed || 1) - 0.5) * o.w;
      const yy = o.y - age * o.h * sp * (1 + 0.3 * K.hash(i, cyc, 77));
      const xx = x0 + Math.sin(t * 2.1 * sp + ph) * sw * age + (o.wind || 0) * age * life + (K.noise(i * 1.7, t * 0.9, 5) - 0.5) * 140 * age * wob;
      const vy = -o.h * sp / life, vx = Math.cos(t * 2.1 * sp + ph) * sw * 2.1 * sp * age + (o.wind || 0);
      const a = (1 - age) * Math.min(1, age * 10) * heat * (0.6 + 0.4 * Math.sin(t * 19 + ph));
      if (a < 0.03) continue;
      const col = mix(age < 0.3 ? [255, 214, 140] : [255, 150, 64], [210, 70, 30], smooth(span(age, 0.3, 1))), Ls = 0.022;
      if (big) glow(ctx, col, xx, yy, sz * 6, 0.35 * a);
      ctx.strokeStyle = rgbs(col, Math.min(1, a)); ctx.lineWidth = sz;
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - vx * Ls, yy - vy * Ls); ctx.stroke();
    }
    ctx.restore();
  }
  // the mouth while he speaks: phrase windows (seconds into the take) from the takes themselves
  const PHRASES = { C01: [[0, 1.0], [1.4, 2.35], [2.75, 3.85], [4.4, 6.0]], C02: [[0, 0.45], [0.8, 2.45], [2.65, 3.65], [3.7, 5.0]], C03: [[0, 0.95], [1.25, 2.2], [2.95, 4.3]] };
  const LAUGHS = { C02: [[0, 0.45], [2.65, 3.65]] };
  function talk(t, id) {
    const c = K.cue(id); if (!c) return 0; const lt = t - c.start; let o = 0;
    for (const [a, b] of PHRASES[id] || []) if (lt > a - 0.05 && lt < b + 0.05) o = Math.max(o, 0.25 + 0.35 * Math.abs(Math.sin(lt * 13 + a * 5)) * (0.6 + 0.4 * K.noise(lt * 7, a, 3)));
    return o;
  }
  function laughing(t) { const c = K.cue('C02'), lt = t - c.start; let o = 0; for (const [a, b] of LAUGHS.C02) o = Math.max(o, smooth(span(lt, a - 0.1, a + 0.1)) * (1 - smooth(span(lt, b - 0.1, b + 0.25)))); return o; }

  // ================================================================ people
  // Cael's profile head, local units (head height 1, centre at 0,0; face towards +x, crown towards -y). open: the jaw.
  function headPts(open) {
    const J = [-0.05, 0.08], ja = (open || 0) * 0.34, c = Math.cos(ja), s = Math.sin(ja);
    const jaw = p => [J[0] + (p[0] - J[0]) * c - (p[1] - J[1]) * s, J[1] + (p[0] - J[0]) * s + (p[1] - J[1]) * c];
    return [[-0.06, -0.56], [0.2, -0.5], [0.34, -0.36], [0.39, -0.2], [0.42, -0.13], [0.37, -0.07], [0.42, 0.0], [0.51, 0.1], [0.47, 0.135], [0.4, 0.14], [0.42, 0.19], [0.39, 0.225],
      [0.33 - (open || 0) * 0.06, 0.245], jaw([0.41, 0.27]), jaw([0.39, 0.36]), jaw([0.34, 0.44]), jaw([0.2, 0.47]), jaw([0.04, 0.41]),
      [-0.1, 0.28], [-0.32, 0.12], [-0.43, -0.1], [-0.4, -0.36], [-0.26, -0.52]];
  }
  const HAIR = [[0.3, -0.4], [0.24, -0.52], [0.08, -0.64], [-0.1, -0.68], [-0.32, -0.62], [-0.5, -0.46], [-0.6, -0.24], [-0.62, -0.02], [-0.57, 0.14], [-0.63, 0.32], [-0.5, 0.25], [-0.47, 0.42], [-0.38, 0.27], [-0.3, 0.4], [-0.24, 0.22], [-0.15, 0.27], [-0.1, 0.05], [0.04, -0.2], [0.16, -0.27], [0.26, -0.24], [0.24, -0.33], [0.36, -0.3]];
  // caelLying(ctx, x, y, s, o): Cael on his back on the grate (its top at y), shoulders at x, feet towards +x, s his height.
  // His head is raised and looks along his body at the men beyond his feet. o.lift (0 flat .. 1 raised), o.tilt (more),
  // o.open (jaw), o.heave (chest), o.fill. Returns the head centre, the eye, the head's size and angle.
  function caelLying(ctx, x, y, s, o = {}) {
    const lift = o.lift != null ? o.lift : 1, hv = 1 + (o.heave || 0), a = lift * 0.95 + (o.tilt || 0), hh = 0.135;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = o.fill || '#000';
    // the far leg, the body, the near leg; the feet stand up at the end
    cap(ctx, 0.36, -0.05, 0.57, -0.075, 0.042, 0.034); cap(ctx, 0.57, -0.075, 0.8, -0.04, 0.034, 0.024);
    ctx.beginPath(); smoothPath(ctx, [[-0.03, -0.012], [0.18, -0.006], [0.37, -0.01], [0.395, -0.055], [0.36, -0.096], [0.27, -0.102 * hv], [0.15, -0.128 * hv], [0.06, -0.133 * hv], [0.0, -0.12], [-0.04, -0.078], [-0.046, -0.03]]); ctx.fill();
    cap(ctx, 0.35, -0.065, 0.58, -0.095, 0.046, 0.036); cap(ctx, 0.58, -0.095, 0.81, -0.05, 0.036, 0.025);
    for (const fx of [0.805, 0.79]) { ctx.beginPath(); ctx.moveTo(fx - 0.022, -0.03); ctx.lineTo(fx + 0.022, -0.035); ctx.quadraticCurveTo(fx + 0.04, -0.09, fx + 0.03, -0.125); ctx.lineTo(fx + 0.008, -0.13); ctx.quadraticCurveTo(fx - 0.01, -0.08, fx - 0.022, -0.03); ctx.fill(); }
    // the near arm along his side, the wrists bound across the belly
    cap(ctx, 0.02, -0.078, 0.165, -0.07 * hv, 0.03, 0.025); cap(ctx, 0.165, -0.07 * hv, 0.285, -0.108 * hv, 0.025, 0.022);
    ctx.beginPath(); ctx.ellipse(0.3, -0.112 * hv, 0.024, 0.02, 0.3, 0, TAU); ctx.fill();
    // neck and head
    const N = [-0.015, -0.076], off = rot([-0.105, -0.005], a), hc = [N[0] + off[0], N[1] + off[1]], hr = -Math.PI / 2 + a + (o.headRot || 0);
    const att = rot([-0.12 * hh, 0.35 * hh], hr);
    cap(ctx, N[0], N[1], hc[0] + att[0], hc[1] + att[1], 0.034, 0.03);
    const thr = rot([0.12 * hh, 0.42 * hh], hr); cap(ctx, N[0] + 0.02, N[1] - 0.01, hc[0] + thr[0], hc[1] + thr[1], 0.03, 0.022);
    ctx.save(); ctx.translate(hc[0], hc[1]); ctx.rotate(hr); ctx.scale(hh, hh);
    ctx.beginPath(); smoothPath(ctx, headPts(o.open || 0)); ctx.fill();
    ctx.beginPath(); HAIR.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
    ctx.beginPath(); smoothPath(ctx, HAIR.slice(0, 8).concat([[-0.2, 0.0], [0.1, -0.3]])); ctx.fill();
    ctx.restore();
    // the ropes: loops around chest, hips and ankles, down to the iron
    if (o.ropes) {
      ctx.lineWidth = 0.007; ctx.strokeStyle = o.fill || '#000';
      for (const [rx, top] of [[0.1, -0.13], [0.31, -0.1], [0.74, -0.06]]) { ctx.beginPath(); ctx.moveTo(rx - 0.012, top * hv); ctx.lineTo(rx - 0.03, 0.03); ctx.moveTo(rx + 0.012, top * hv); ctx.lineTo(rx + 0.03, 0.03); ctx.stroke(); }
    }
    ctx.restore();
    const eye = rot([0.29 * hh, -0.1 * hh], hr);
    return { head: [x + hc[0] * s, y + hc[1] * s], eye: [x + (hc[0] + eye[0]) * s, y + (hc[1] + eye[1]) * s], hh: hh * s, hr };
  }
  // hooded(ctx, x, y, h, o): one of the killers, facing us, standing on (x, y), h tall to the top of the hood: a near-black
  // cloak and deep cowl, a plain cloth mask with eye slits, and the fire's light only as a hot rim along the edges that face
  // it. o.lit (light, about 1), o.fx (where the fire is: -1 to his screen left, 1 to the right, 0 in front and below), o.turn
  // (-1..1, the head turned; ±1 away), o.bow (head lowered), o.hoodLow (the hood pulled down over the eyes), o.torch (-1 in
  // the hand on screen left, 1 on screen right, 0 none), o.low (0 torch raised .. 1 lowered), o.lean, o.bulk (shoulders),
  // o.t (the hem moves), o.seed; o.flat + o.fill (one colour, for rim-lit silhouettes; o.back: seen from behind).
  // Returns {torch, head}.
  const DARK = [7, 5, 4], WARM = [150, 66, 28], HOT = [255, 150, 70];
  function hooded(ctx, x, y, h, o = {}) {
    const lit = o.lit != null ? o.lit : 1, b = o.bulk || 1, turn = clamp(o.turn || 0, -1, 1), bow = o.bow || 0, ts = o.torch || 0, low = clamp(o.low || 0);
    const flat = !!o.flat, sway = o.sway || 0, lean = o.lean || 0, sd = o.seed || 1, t = o.t || 0, fx0 = clamp(o.fx || 0, -1, 1), hl = o.hoodLow || 0;
    ctx.save(); ctx.translate(x, y); if (lean) ctx.rotate(lean); ctx.scale(h, h);
    const body = flat ? o.fill : rgb([10 + 6 * lit, 7 + 3 * lit, 6 + 2 * lit]);
    ctx.fillStyle = body;
    // legs and boots
    for (const s2 of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s2 * 0.066, -0.24); ctx.lineTo(s2 * 0.016, -0.24); ctx.lineTo(s2 * 0.022, -0.04); ctx.lineTo(s2 * 0.064, -0.04); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(s2 * 0.072, -0.065); ctx.lineTo(s2 * 0.014, -0.065); ctx.lineTo(s2 * 0.01, 0); ctx.quadraticCurveTo(s2 * 0.06, 0.004, s2 * 0.09, -0.004); ctx.closePath(); ctx.fill();
    }
    // the cloak, from the shoulders to a ragged hem that stirs in the fire's draught
    const cloak = new Path2D(), hw = 0.19 * b;
    cloak.moveTo(-0.05, -0.83); cloak.bezierCurveTo(-0.11 * b, -0.835, -0.152 * b, -0.822, -0.16 * b, -0.772);
    cloak.bezierCurveTo(-0.17 * b, -0.68, -0.178 * b, -0.44, -hw + sway, -0.215);
    for (let k = 1; k < 12; k++) { const u = k / 12, jag = (K.hash(k, sd, 41) - 0.5) * 0.045 + Math.sin(t * 1.9 + k * 1.7 + sd) * 0.007 * (0.4 + Math.abs(u - 0.5)); cloak.lineTo(lerp(-hw, hw, u) + sway + (K.hash(k, sd, 43) - 0.5) * 0.012, -0.2 + jag + (k % 2 ? 0.012 : -0.006)); }
    cloak.lineTo(hw + sway, -0.217); cloak.bezierCurveTo(0.178 * b, -0.44, 0.17 * b, -0.68, 0.16 * b, -0.772); cloak.bezierCurveTo(0.152 * b, -0.822, 0.11 * b, -0.835, 0.05, -0.83); cloak.closePath();
    ctx.fill(cloak);
    // the light: a hot inner rim on the side the fire is on (both sides, softer, when it is in front)
    const side = Math.abs(fx0) > 0.2 ? Math.sign(fx0) : (sd % 2 ? 1 : -1), weak = Math.abs(fx0) > 0.2 ? 0.06 : 0.22;
    const rimGrad = (x0, x1, a) => { const g = ctx.createLinearGradient(x0, 0, x1, 0), al = side < 0 ? [a, weak * a] : [weak * a, a]; g.addColorStop(0, rgbs(HOT, al[0])); g.addColorStop(0.22, rgbs(HOT, al[0] * 0.12)); g.addColorStop(0.5, rgbs(HOT, 0)); g.addColorStop(0.78, rgbs(HOT, al[1] * 0.12)); g.addColorStop(1, rgbs(HOT, al[1])); return g; };
    const rimA = Math.min(1, 0.9 * lit);
    // strongest on the shoulders, the hood and the upper arm; fading down the cloak
    const rim = (path, x0, x1, w) => {
      for (const [y0, y1, k] of [[-1.1, -0.5, 1], [-0.5, 0.05, 0.4]]) {
        ctx.save(); ctx.beginPath(); ctx.rect(-0.4, y0, 0.8, y1 - y0); ctx.clip(); ctx.clip(path); ctx.strokeStyle = rimGrad(x0, x1, rimA * k); ctx.lineWidth = w; ctx.stroke(path); ctx.globalAlpha = 0.3; ctx.lineWidth = w * 3; ctx.stroke(path); ctx.restore();
      }
    };
    if (!flat) {
      ctx.save(); ctx.clip(cloak);
      // long folds: a dark crease beside a thread of light, brighter on the fire's side
      for (let k = 0; k < 3; k++) {
        const f = side * (0.04 + k * 0.045) * b + (K.hash(k, sd, 47) - 0.5) * 0.015, y0 = -0.74 + K.hash(k, sd, 49) * 0.12, la = (0.32 - k * 0.08) * rimA;
        ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 0.014; ctx.beginPath(); ctx.moveTo(f * 0.8 - side * 0.012, y0); ctx.quadraticCurveTo(f * 1.05 - side * 0.012, -0.48, f * 1.25 - side * 0.012 + sway, -0.2); ctx.stroke();
        ctx.strokeStyle = rgbs(HOT, la); ctx.lineWidth = 0.004; ctx.beginPath(); ctx.moveTo(f * 0.8, y0 + 0.03); ctx.quadraticCurveTo(f * 1.05, -0.48, f * 1.25 + sway, -0.23); ctx.stroke();
      }
      // a dull warmth low on the cloth, nearest the fire
      const lg = ctx.createLinearGradient(0, -0.2, 0, -0.5); lg.addColorStop(0, rgbs(WARM, 0.12 * lit)); lg.addColorStop(1, rgbs(WARM, 0)); ctx.fillStyle = lg; ctx.fillRect(-0.25, -0.55, 0.5, 0.37);
      ctx.restore();
      rim(cloak, -hw, hw, 0.011);
      ctx.fillStyle = body;
    }
    // the torch arm (raised .. lowered) and the torch
    let torch = null, top = null;
    if (ts) {
      const S = [ts * 0.14 * b, -0.77], E = [lerp(ts * 0.24, ts * 0.175, low), lerp(-0.6, -0.63, low)], Hd = [lerp(ts * 0.23, ts * 0.19, low), lerp(-0.735, -0.47, low)];
      cap(ctx, S[0], S[1], E[0], E[1], 0.034, 0.028); cap(ctx, E[0], E[1], Hd[0], Hd[1], 0.028, 0.023);
      ctx.beginPath(); ctx.arc(Hd[0], Hd[1], 0.026, 0, TAU); ctx.fill();
      const da = lerp(-0.16 * ts, 1.95 * ts, ease(low)), dir = [Math.sin(da), -Math.cos(da)];
      top = [Hd[0] + dir[0] * 0.17, Hd[1] + dir[1] * 0.17]; const butt = [Hd[0] - dir[0] * 0.07, Hd[1] - dir[1] * 0.07];
      ctx.fillStyle = flat ? body : '#0d0806'; cap(ctx, butt[0], butt[1], top[0], top[1], 0.008, 0.01);
      cap(ctx, Hd[0] + dir[0] * 0.13, Hd[1] + dir[1] * 0.13, top[0] + dir[0] * 0.012, top[1] + dir[1] * 0.012, 0.015, 0.017);
      if (!flat) {
        // the torch lights its own arm along the side towards the flame
        ctx.strokeStyle = rgbs(HOT, 0.75 * Math.min(1, lit + 0.3)); ctx.lineWidth = 0.007; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(S[0] + ts * 0.02, S[1] - 0.02); ctx.lineTo(E[0] + ts * 0.022, E[1] - 0.004); ctx.lineTo(Hd[0] + ts * 0.02, Hd[1] - 0.012); ctx.stroke();
        ctx.fillStyle = 'rgba(255,170,80,0.7)'; ctx.beginPath(); ctx.arc(top[0], top[1], 0.012, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = body;
      const tl = rot([top[0] * h, top[1] * h], lean); torch = [x + tl[0], y + tl[1]];
    }
    // the cowl: a deep rounded hood falling onto the shoulders (pulled low on some)
    const hx = turn * 0.016, hy = bow * 0.045 + hl * 0.02;
    if (o.back) { ctx.translate(0, -0.78); ctx.scale(0.86, 0.9); ctx.translate(0, 0.78); }
    const hood = new Path2D(), pk = hl * 0.03;
    hood.moveTo(-0.14, -0.768); hood.bezierCurveTo(-0.124 + hx * 0.4, -0.84 + hy, -0.106 + hx, -0.985 + hy - pk, -0.01 + hx + hl * 0.02, -1.0 + hy - pk);
    hood.bezierCurveTo(0.09 + hx, -0.99 + hy - pk, 0.124 + hx * 0.4, -0.86 + hy, 0.14, -0.768); hood.bezierCurveTo(0.07, -0.74, -0.07, -0.74, -0.14, -0.768); hood.closePath();
    ctx.fill(hood);
    if (o.back && o.brim) { const bs = o.brim; ctx.beginPath(); ctx.moveTo(bs * 0.06, -0.97 + hy); ctx.quadraticCurveTo(bs * 0.16, -0.95 + hy, bs * 0.165, -0.86 + hy); ctx.quadraticCurveTo(bs * 0.15, -0.8, bs * 0.1, -0.78); ctx.lineTo(bs * 0.05, -0.8); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(bs * 0.12, -0.8); ctx.quadraticCurveTo(bs * 0.14, -0.74, bs * 0.12, -0.7); ctx.lineTo(bs * 0.06, -0.72); ctx.closePath(); ctx.fill(); }
    if (!flat) {
      ctx.save(); ctx.clip(hood); ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 0.008;
      for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + s2 * 0.065, -0.84 + hy); ctx.quadraticCurveTo(s2 * 0.105, -0.8, s2 * 0.115, -0.77); ctx.stroke(); }
      ctx.restore();
      rim(hood, -0.14, 0.14, 0.01);
    }
    if (!flat && !o.back && Math.abs(turn) < 0.88) {
      const fxm = hx + turn * 0.03, fy = -0.872 + hy, rx = 0.056 * (1 - 0.6 * Math.abs(turn)), ry = 0.078;
      ctx.save(); ctx.translate(fxm, fy);
      // the hood's mouth, and in it the mask: plain cloth a shade lighter than the cloak, two dark slits for the eyes
      const rec = new Path2D(); rec.moveTo(-rx, ry * 0.6); rec.bezierCurveTo(-rx * 1.08, -ry * 0.4, -rx * 0.62, -ry, 0, -ry); rec.bezierCurveTo(rx * 0.62, -ry, rx * 1.08, -ry * 0.4, rx, ry * 0.6); rec.quadraticCurveTo(0, ry * 0.95, -rx, ry * 0.6); rec.closePath();
      ctx.fillStyle = '#020101'; ctx.fill(rec);
      const tk = top ? clamp(1 - Math.hypot(top[0] - fxm, top[1] - fy) / 0.35) : 0;
      const mask = new Path2D(); mask.moveTo(-rx * 0.86, ry * 0.5); mask.bezierCurveTo(-rx * 0.92, -ry * 0.3, -rx * 0.55, -ry * 0.82, 0, -ry * 0.86); mask.bezierCurveTo(rx * 0.55, -ry * 0.82, rx * 0.92, -ry * 0.3, rx * 0.86, ry * 0.5); mask.bezierCurveTo(rx * 0.5, ry * 0.9, -rx * 0.5, ry * 0.9, -rx * 0.86, ry * 0.5); mask.closePath();
      const mg = ctx.createLinearGradient(0, -ry, 0, ry); mg.addColorStop(0, rgb([18, 13, 11])); mg.addColorStop(0.55, rgb(mix([28, 21, 18], WARM, 0.1 * lit + 0.25 * tk))); mg.addColorStop(1, rgb(mix([34, 25, 21], WARM, 0.28 * lit + 0.3 * tk)));
      ctx.fillStyle = mg; ctx.fill(mask);
      ctx.save(); ctx.clip(mask);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 0.004; ctx.beginPath(); ctx.moveTo(-rx * 0.7, ry * 0.3); ctx.quadraticCurveTo(-rx * 0.2, ry * 0.5, rx * 0.15, ry * 0.85); ctx.stroke();
      // the eye slits
      ctx.fillStyle = '#010000'; const ey = -ry * 0.28 + hl * ry * 0.15;
      for (const s2 of [-1, 1]) { const ex = s2 * rx * 0.4 + turn * rx * 0.25; ctx.beginPath(); ctx.moveTo(ex - rx * 0.24, ey); ctx.quadraticCurveTo(ex, ey - ry * 0.12, ex + rx * 0.24, ey + s2 * ry * 0.02); ctx.quadraticCurveTo(ex, ey + ry * 0.07, ex - rx * 0.24, ey); ctx.closePath(); ctx.fill(); }
      // the brim's shadow over the brow (deeper when the hood is pulled low)
      const bg = ctx.createLinearGradient(0, -ry, 0, -ry * (0.15 - hl * 0.45)); bg.addColorStop(0, 'rgba(0,0,0,0.95)'); bg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = bg; ctx.fillRect(-rx * 1.2, -ry * 1.1, rx * 2.4, ry * 1.2);
      ctx.restore();
      ctx.restore();
      ctx.strokeStyle = rgbs(HOT, 0.3 * Math.min(1.2, lit)); ctx.lineWidth = 0.004; ctx.beginPath(); ctx.moveTo(fxm - rx * 1.0, fy + ry * 0.62); ctx.quadraticCurveTo(fxm, fy + ry * 1.0, fxm + rx * 1.0, fy + ry * 0.62); ctx.stroke();
    } else if (!flat && !o.back) {
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 0.01; ctx.beginPath(); ctx.moveTo(hx + turn * 0.07, -0.95 + hy); ctx.quadraticCurveTo(hx + turn * 0.1, -0.86 + hy, hx + turn * 0.08, -0.79); ctx.stroke();
    }
    // the torch's warm pool on his chest and mask
    if (!flat && top) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const pc = [top[0] * 0.55, top[1] + 0.1], pg = ctx.createRadialGradient(pc[0], pc[1], 0, pc[0], pc[1], 0.2); pg.addColorStop(0, rgbs([255, 140, 60], 0.24)); pg.addColorStop(0.5, rgbs([220, 90, 30], 0.08)); pg.addColorStop(1, 'rgba(200,80,30,0)');
      ctx.fillStyle = pg; ctx.save(); ctx.clip(cloak); ctx.fillRect(-0.3, -1.1, 0.6, 0.9); ctx.restore(); ctx.save(); ctx.clip(hood); ctx.fillRect(-0.3, -1.1, 0.6, 0.4); ctx.restore();
      ctx.restore();
    }
    ctx.restore();
    const hd = rot([hx * h, (-0.875 + hy) * h], lean);
    return { torch, head: [x + hd[0], y + hd[1]] };
  }

  // ================================================================ the forest behind the fire (cached)
  // o.fx the fire's x, o.ground the line where the far trunks stand, o.scale, o.light, o.spread (how far the light reaches),
  // o.gap (keep the middle clear of near trunks), o.seed
  function forest(key, o) {
    return K.cached('s7:forest:' + key, () => {
      const OX = 300, OY = 220, w = W + OX * 2, h = H + OY * 2, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(o.seed || 1);
      const fx = o.fx + OX, gy = o.ground + OY, sc = o.scale || 1, lt = o.light || 1;
      x.fillStyle = '#020101'; x.fillRect(0, 0, w, h);
      let g = x.createRadialGradient(fx, gy, 0, fx, gy, o.reach || 1300); g.addColorStop(0, 'rgba(84,34,14,0.55)'); g.addColorStop(0.3, 'rgba(44,17,8,0.4)'); g.addColorStop(0.7, 'rgba(14,6,3,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      const layers = [[16, 12, 0.14, -90], [11, 22, 0.26, -55], [7, 40, 0.45, -20], [4, 70, 0.7, 25]];
      layers.forEach(([n, wd0, lite0, dy], layer) => {
        const wd = wd0 * sc, lite = lite0 * lt, base = gy + dy * sc;
        for (let i = 0; i < n; i++) {
          const tx = (i + 0.15 + r() * 0.7) / n * w, tw = wd * (0.6 + r() * 0.9), d = Math.abs(tx - fx) / (o.spread || 1000), Lk = lite * Math.pow(Math.max(0, 1 - d), 1.3);
          if (o.gap && layer > 1 && Math.abs(tx - fx) < o.gap) continue;
          const bot = base + r() * 24 * sc, lean = (r() - 0.5) * 24, fl = 1 + r() * 0.5;
          const pts = []; for (let k = 0; k <= 10; k++) { const v = k / 10, yy = lerp(bot, -60, v), ww = tw * (1 + 0.5 * fl * Math.pow(1 - v, 9)) * (1 - v * 0.12); pts.push([tx + lean * v, yy, ww]); }
          x.beginPath(); pts.forEach((p, k) => k ? x.lineTo(p[0] - p[2] / 2, p[1]) : x.moveTo(p[0] - p[2] / 2, p[1])); for (let k = pts.length - 1; k >= 0; k--) x.lineTo(pts[k][0] + pts[k][2] / 2, pts[k][1]); x.closePath();
          const gg = x.createLinearGradient(0, bot, 0, bot - 1000 * sc), b0 = [5, 4, 3], warm = [140, 60, 26];
          gg.addColorStop(0, rgb(mix(b0, warm, Lk * 0.5))); gg.addColorStop(0.25, rgb(mix(b0, warm, Lk * 0.28))); gg.addColorStop(0.7, rgb(mix(b0, warm, Lk * 0.08))); gg.addColorStop(1, rgb(b0)); x.fillStyle = gg; x.fill();
          x.save(); x.clip(); const side = tx < fx ? 1 : -1, lg = x.createLinearGradient(tx - side * tw * 0.5, 0, tx + side * tw * 0.5, 0);
          lg.addColorStop(0, 'rgba(0,0,0,0.6)'); lg.addColorStop(0.6, 'rgba(0,0,0,0)'); lg.addColorStop(0.86, rgbs([210, 96, 40], 0.16 * Lk)); lg.addColorStop(1, rgbs([255, 150, 70], 0.32 * Lk)); x.fillStyle = lg; x.fillRect(tx - tw * 2, -80, tw * 4, bot + 100);
          x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = Math.max(1, tw * 0.05);
          for (let k = 0; k < 8; k++) { const bx = tx + (r() - 0.5) * tw * 0.8, by = bot - r() * 800 * sc; x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + (r() - 0.5) * 3, by - 30 - r() * 140 * sc); x.stroke(); }
          x.restore();
        }
        // mist between the depths: the warm smoke hanging in the trees
        const mg = x.createLinearGradient(0, base - 700 * sc, 0, base + 30); mg.addColorStop(0, 'rgba(30,13,7,0)'); mg.addColorStop(0.7, `rgba(40,17,9,${0.16 - layer * 0.03})`); mg.addColorStop(1, `rgba(52,22,11,${0.3 - layer * 0.06})`);
        x.fillStyle = mg; x.fillRect(0, base - 700 * sc, w, 730 * sc);
        // undergrowth: ferns and brush at the foot of the trunks
        x.fillStyle = rgb(mix([4, 3, 2], [70, 30, 12], lite * 0.3));
        for (let i = 0; i < 40; i++) { const bx = r() * w, d = Math.abs(bx - fx) / (o.spread || 1000); if (o.gap && layer > 1 && Math.abs(bx - fx) < o.gap * 0.8) continue; const bh = (14 + r() * 40) * sc * (0.6 + layer * 0.3), bw = bh * (1.2 + r()); x.beginPath(); x.moveTo(bx - bw, base + 30 * sc); for (let k = 0; k <= 8; k++) { const u = k / 8; x.lineTo(bx - bw + 2 * bw * u, base + 30 * sc - bh * Math.sin(Math.PI * u) * (0.6 + 0.4 * r())); } x.closePath(); x.fill(); void d; }
      });
      // the ground: mud and leaf litter, the fire's light on it
      const G = x.createLinearGradient(0, gy, 0, h); G.addColorStop(0, '#0d0705'); G.addColorStop(1, '#030202'); x.fillStyle = G; x.fillRect(0, gy + 20 * sc, w, h - gy);
      for (let i = 0; i < 1100; i++) { const px = r() * w, py = gy + 20 * sc + Math.pow(r(), 1.4) * (h - gy), d = Math.hypot((px - fx) / 900, (py - gy) / 320), Lk = Math.max(0, 1 - d); x.fillStyle = rgbs(mix([10, 7, 5], [130, 58, 26], Lk * 0.5 * r()), 0.6); x.beginPath(); x.ellipse(px, py, 2 + r() * 8, 1 + r() * 2.2, r() * 0.4, 0, TAU); x.fill(); }
      g = x.createRadialGradient(fx, gy + 40, 0, fx, gy + 40, 760); g.addColorStop(0, 'rgba(160,66,26,0.34)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.save(); x.translate(fx, gy + 40); x.scale(1, 0.3); x.translate(-fx, -gy - 40); x.fillStyle = g; x.fillRect(fx - 800, gy - 760, 1600, 1600); x.restore();
      // a painted tooth over it all
      x.save(); x.globalAlpha = 0.2; x.globalCompositeOperation = 'overlay'; K.tile(x, K.paperGrain(), 0, 0, w, h); x.restore();
      return { c, OX, OY };
    });
  }
  function drawForest(ctx, c, d, key, o) { const F = forest(key, o); view(ctx, c, d); ctx.imageSmoothingQuality = 'low'; ctx.drawImage(F.c, -F.OX, -F.OY); ctx.imageSmoothingQuality = 'low'; }

  // ================================================================ the pyre: stones, the fire bed, the grate (side view)
  const STONES = (() => {
    const r = rng(717), out = [];
    for (const side of [-1, 1]) {
      const rows = [[4, 0.06], [4, 0.058], [3, 0.055], [3, 0.05], [2, 0.045]];
      let yb = 0;
      rows.forEach(([n, sz], row) => {
        const ht = sz * (0.9 + r() * 0.2), wrow = n * sz * 1.05;
        for (let k = 0; k < n; k++) {
          const cx = side * 0.5 + (k - (n - 1) / 2) * sz * 1.05 + (r() - 0.5) * 0.012, cy = yb - ht / 2 + (r() - 0.5) * 0.006, w2 = sz * (0.55 + r() * 0.12);
          const pts = []; const nv = 6 + Math.floor(r() * 3); for (let q = 0; q < nv; q++) { const an = q / nv * TAU + r() * 0.4, rr = 0.85 + r() * 0.3; pts.push([cx + Math.cos(an) * w2 * rr, cy + Math.sin(an) * ht * 0.56 * rr]); }
          out.push({ pts, cx, cy, side, sz });
        }
        yb -= ht * 0.92; void wrow;
      });
    }
    return out;
  })();
  // the stone piles drawn once at a given scale: the stones dark, and a second image of their fire-lit faces
  function stoneSprite(s) {
    return K.cached('s7:stones:' + Math.round(s), () => {
      const w = Math.ceil(1.3 * s), h = Math.ceil(0.36 * s), ox = w / 2, oy = h - 4;
      const mk = lit => { const c = K.canvas(w, h), x = c.getContext('2d'); x.translate(ox, oy); x.scale(s, s);
        for (const st of STONES) {
          x.beginPath(); st.pts.forEach((p, k) => k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath();
          if (!lit) { x.fillStyle = rgb(mix([30, 23, 19], [58, 46, 38], K.hash(st.cx * 1000 | 0, st.cy * 1000 | 0, 3))); x.fill(); x.save(); x.clip(); x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(st.cx - 0.2, st.cy, 0.4, 0.1); x.restore(); x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 0.003; x.stroke(); }
          else { x.save(); x.clip(); const lg = x.createLinearGradient(st.cx + st.side * 0.08, 0, st.cx - st.side * 0.09, 0); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.55, rgbs([150, 60, 24], 0.18)); lg.addColorStop(1, rgbs([255, 130, 50], 0.9 * (1 - Math.abs(st.cx) * 0.5))); x.fillStyle = lg; x.fillRect(st.cx - 0.2, st.cy - 0.1, 0.4, 0.2);
            const tg = x.createLinearGradient(0, st.cy - st.sz * 0.5, 0, st.cy); tg.addColorStop(0, rgbs([255, 140, 60], 0.3)); tg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = tg; x.fillRect(st.cx - 0.2, st.cy - 0.1, 0.4, 0.2); x.restore(); }
        }
        return c; };
      return { c: mk(false), lit: mk(true), ox, oy };
    });
  }
  // the pyre in its own units: the grate is 1 long (x -0.5..0.5) at y = -0.33 (its top); the ground at y = 0; drawn at
  // (x, y) scale s. part 'back' (bed, far rail, cross bars) or 'front' (near rail, stones). heat lights the iron and stone
  function pyre(ctx, x, y, s, part, heat, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const gy = -0.33, dep = 0.022, hot = clamp(heat * 0.8, 0, 1.4);
    if (part === 'back') {
      // the bed of the fire: logs, coals
      ctx.fillStyle = '#080403';
      for (const [lx, ly, lw, la] of [[-0.18, -0.03, 0.42, 0.18], [0.12, -0.035, 0.46, -0.14], [0.0, -0.06, 0.38, 0.05], [-0.3, -0.02, 0.24, -0.3], [0.32, -0.02, 0.24, 0.35]]) {
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(la); ctx.beginPath(); ctx.roundRect(-lw / 2, -0.022, lw, 0.044, 0.02); ctx.fill();
        ctx.strokeStyle = rgbs([255, 120, 40], 0.5 * hot); ctx.lineWidth = 0.004; ctx.beginPath(); for (let k = 0; k < 5; k++) { const u = -lw / 2 + (k + 0.3) * lw / 5; ctx.moveTo(u, -0.018); ctx.lineTo(u + 0.02, 0.0); ctx.lineTo(u + 0.01, 0.018); } ctx.stroke();
        ctx.restore();
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const rr = rng(31); for (let i = 0; i < 26; i++) { const cx = (rr() - 0.5) * 0.8, cy = -0.01 - rr() * 0.04, pulse = 0.6 + 0.4 * Math.sin(t * (2 + rr() * 3) + i); ctx.fillStyle = rgbs([255, 150 + rr() * 60, 60], 0.35 * hot * pulse); ctx.beginPath(); ctx.ellipse(cx, cy, 0.012 + rr() * 0.02, 0.006 + rr() * 0.008, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
      // the far rail and the cross bars of the gridiron
      ctx.fillStyle = '#0a0605'; ctx.fillRect(-0.52, gy - dep - 0.006, 1.04, 0.009);
      ctx.strokeStyle = '#0a0605'; ctx.lineWidth = 0.007; ctx.beginPath(); for (let i = 0; i <= 26; i++) { const bx = -0.5 + i / 26; ctx.moveTo(bx + 0.006, gy - dep); ctx.lineTo(bx - 0.004, gy); } ctx.stroke();
      ctx.strokeStyle = rgbs([255, 110, 40], 0.35 * hot); ctx.lineWidth = 0.002; ctx.beginPath(); for (let i = 0; i <= 26; i++) { const bx = -0.5 + i / 26; ctx.moveTo(bx + 0.006, gy - dep + 0.004); ctx.lineTo(bx - 0.004, gy + 0.002); } ctx.stroke();
    } else {
      // the near rail: black iron, its underside lit by the fire, a dull heat along it
      ctx.fillStyle = '#0b0706'; ctx.fillRect(-0.53, gy, 1.06, 0.016);
      const rg = ctx.createLinearGradient(0, gy, 0, gy + 0.016); rg.addColorStop(0, rgbs([255, 120, 50], 0.3 * hot)); rg.addColorStop(0.4, 'rgba(0,0,0,0)'); rg.addColorStop(1, rgbs([255, 150, 70], 0.55 * hot)); ctx.fillStyle = rg; ctx.fillRect(-0.53, gy, 1.06, 0.016);
      ctx.fillStyle = '#0b0706'; for (const lx of [-0.5, 0.5]) ctx.fillRect(lx - 0.008, gy + 0.01, 0.016, 0.07);
      // the stones the grate stands on (a cached sprite), their inner faces lit by the fire
      ctx.restore();
      const S = stoneSprite(s), k = clamp(hot, 0, 1.4);
      ctx.save(); ctx.drawImage(S.c, x - S.ox, y - S.oy);
      ctx.globalAlpha = Math.min(1, 0.55 * k); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(S.lit, x - S.ox, y - S.oy);
      ctx.restore();
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    }
    ctx.restore();
  }

  // ================================================================ C01: low, across the fire, to the ring of masked men
  // The ring, behind the fire (depth 0.75); the ones in the middle stand beyond the flames, which hide their legs.
  const RING = [
    { x: 215, y: 905, h: 450, torch: 1, turn: 0.4, s: 1, b: 1.12 },
    { x: 430, y: 862, h: 395, torch: 0, turn: 0.3, s: 2, b: 0.92, hl: 1 },
    { x: 660, y: 838, h: 362, torch: 0, turn: 0.12, s: 3, b: 1.18 },
    { x: 860, y: 828, h: 345, torch: -1, turn: 0.04, s: 4, b: 0.96 },
    { x: 1090, y: 830, h: 350, torch: 0, turn: -0.08, s: 5, b: 1.05, hl: 0.7 },
    { x: 1310, y: 842, h: 368, torch: 0, turn: -0.2, s: 6, b: 0.9 },
    { x: 1535, y: 870, h: 410, torch: -1, turn: -0.32, s: 7, b: 1.22, leader: true },
    { x: 1750, y: 912, h: 455, torch: 0, turn: -0.42, s: 8, b: 1.0, hl: 1 },
  ];
  // the pyre's world: the master shot and the roar share it. o.heat, o.pose (for Cael), o.recoil (the men flinch)
  const PYRE = { x: 960, y: 905, s: 760 };  // the ground under the fire, and the grate's length
  function pyreWorld(ctx, t, c, o) {
    const heat = o.heat, fl = o.fl, gTop = PYRE.y - 0.33 * PYRE.s;
    drawForest(ctx, c, 0.3, 'master', { fx: 960, ground: 820, seed: 11, spread: 1100 });
    view(ctx, c, 0.3); glow(ctx, [190, 70, 26], 960, 780, 1000, 0.16 * fl * heat);
    // the ring
    view(ctx, c, 0.75);
    const torches = [];
    for (const m of RING) {
      const d = Math.abs(m.x - 960) / 900, lit = (1.25 - d * 0.7) * fl * Math.min(1.6, 0.55 + heat * 0.5) * (0.92 + 0.08 * Math.sin(t * 7 + m.s));
      const rc = (o.recoil || 0) * (0.6 + 0.4 * Math.sin(m.s * 2.1));
      const r = hooded(ctx, m.x + (m.x - 960) * 0.04 * rc, m.y - 18 * rc, m.h * (1 - 0.04 * rc), { lit, fx: clamp((960 - m.x) / 500, -1, 1), t, bulk: m.b, hoodLow: m.hl || 0, turn: m.turn + (m.s === 5 ? -0.6 * (o.away || 0) : 0), bow: m.s === 5 ? 0.6 * (o.away || 0) : 0, torch: m.torch, seed: m.s, lean: -0.05 * rc * Math.sign(m.x - 960 || 1), low: m.leader ? (o.low || 0) : 0 });
      if (r.torch) torches.push([r.torch, m.h * 0.075, m.s]);
    }
    for (const [p, s, sd] of torches) torchLight(ctx, p, s, t, sd);
    // smoke rising off the fire, lit from beneath
    view(ctx, c, 0.9);
    K.smoke(ctx, t, { n: 14, x: 640, y: -200, w: 640, h: 800, color: [150, 78, 40], alpha: 0.2 + 0.05 * heat, rise: 32 + heat * 10, size: 380, seed: 703, drift: 6 });
    K.smoke(ctx, t, { n: 8, x: 680, y: -420, w: 600, h: 700, color: [24, 16, 13], alpha: 0.45, rise: 24, size: 420, seed: 704, drift: 8 });
    // the fire: behind the grate, then Cael, then tongues in front of him
    view(ctx, c, 1);
    glow(ctx, [255, 110, 36], PYRE.x, PYRE.y - 140, 760 * (0.8 + 0.2 * heat), 0.34 * fl * Math.min(1.5, heat));
    pyre(ctx, PYRE.x, PYRE.y, PYRE.s, 'back', heat * fl, t);
    fire(ctx, PYRE.x, PYRE.y + 4, 700, 820 * heat * fl, t, 3, { n: 12, slot: 'w1', hmax: 1700, heat: 1.05 });
    const sx = PYRE.x - 0.33 * PYRE.s, sh = gTop - 2, cs = 0.86 * PYRE.s;
    const box = proj(c, 1, sx - 0.25 * cs, sh - 0.32 * cs), box2 = proj(c, 1, sx + 0.9 * cs, sh + 0.06 * cs);
    let pose = null;
    rimLit(ctx, (cc, fill) => { pose = caelLying(cc, sx, sh, cs, Object.assign({ fill }, o.pose)); }, { rim: rgb([255, 190 * Math.min(1.1, fl), 110 * fl]), mid: '#5e2a10', dark: '#070403', dx: 0, dy: 4.5 * box[2], steps: 4, box: [box[0], box[1], box2[0] - box[0], box2[1] - box[1]], key: 'cl', lw: 1500, lh: 520 });
    fire(ctx, PYRE.x + 20, PYRE.y + 18, 620, 300 * heat * fl * (o.front || 1), t + 0.6, 21, { n: 9, slot: 'w4', heat: 0.5 * Math.min(1.4, heat), hmax: 1100 });
    fire(ctx, PYRE.x - 60, PYRE.y - 0.3 * PYRE.s, 560, 120 * heat * fl * (o.front || 1), t + 3.3, 23, { n: 9, slot: 'w5', heat: 0.42 * Math.min(1.4, heat), hmax: 440, bed: false });
    pyre(ctx, PYRE.x, PYRE.y, PYRE.s, 'front', heat * fl, t);
    // the near ground, a dark bank of mud across the bottom
    view(ctx, c, 1.25);
    ctx.fillStyle = '#050303'; ctx.beginPath(); ctx.moveTo(-200, 1300); ctx.lineTo(-200, 1040); for (let k = 0; k <= 24; k++) { const xx = -200 + k * 100; ctx.lineTo(xx, 1030 + 18 * Math.sin(k * 1.7) + 10 * Math.sin(k * 4.1)); } ctx.lineTo(2300, 1300); ctx.closePath(); ctx.fill();
    { const g = ctx.createLinearGradient(0, 1020, 0, 1070); g.addColorStop(0, rgbs([200, 90, 40], 0.18 * fl * heat)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(-200, 1010, 2500, 70); }
    // two of them close to us, black against the fire, their edges lit
    view(ctx, c, 1.45);
    const rcF = o.recoil || 0;
    const fgL = proj(c, 1.45, -200, 120), fgR = proj(c, 1.45, 2160, 1500);
    let tFG = null;
    const rimO = { rim: rgb([255, 170 * fl, 90 * fl]), mid: '#4a200c', dark: '#040202', dx: 0, dy: 6, steps: 4 };
    { const p0 = proj(c, 1.45, -260, 360), p1 = proj(c, 1.45, 620, 1500); rimLit(ctx, (cc, fill) => { hooded(cc, 215 - 40 * rcF, 1330 + 30 * rcF, 860, { flat: true, fill, back: true, brim: 1, lean: -0.04 * rcF - 0.02, bulk: 1.28 }); }, Object.assign({ box: [p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1]], key: 'fgL', lw: 800, lh: 1080 }, rimO)); }
    { const p0 = proj(c, 1.45, 1300, 360), p1 = proj(c, 1.45, 2200, 1500); rimLit(ctx, (cc, fill) => { const r = hooded(cc, 1715 + 50 * rcF, 1310 + 30 * rcF, 820, { flat: true, fill, back: true, brim: -1, torch: -1, lean: 0.05 * rcF + 0.02, bulk: 1.22 }); tFG = r.torch; }, Object.assign({ box: [p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1]], key: 'fgR', lw: 800, lh: 1080 }, rimO)); }
    void fgL; void fgR;
    if (tFG) torchLight(ctx, tFG, 62, t, 31);
    // sparks and drifting embers
    view(ctx, c, 1);
    sparks(ctx, t, { x: PYRE.x, y: gTop + 10, w: 560, h: 760 + 300 * heat, n: Math.round(40 + 40 * heat), heat: Math.min(1.3, 0.6 + heat * 0.5), wind: 14, seed: 77, speed: 0.8 + heat * 0.3 });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    K.embers(ctx, t, { n: 26, heat: 0.5, seed: 78 });
    const hz = proj(c, 1, PYRE.x - 460, gTop - 420), hz2 = proj(c, 1, PYRE.x + 460, gTop + 20);
    haze(ctx, hz[0], hz[1], hz2[0] - hz[0], hz2[1] - hz[1], t, 2.5 + heat);
    return pose;
  }
  function shotMaster(ctx, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a - 0.3, sh.b + 0.3);
    const flare = lerp(0.3, 1, easeOut(span(lt, -0.1, 1.7))) + 0.25 * Math.sin(Math.PI * span(lt, 0.4, 2.4)), fl = flick(t, 1, 9);
    const c = { x: lerp(-40, 30, ease(u)), y: lerp(14, -10, ease(u)), z: lerp(1.0, 1.1, ease(u)), r: 0 };
    pyreWorld(ctx, t, c, { heat: flare, fl, pose: { lift: 0.95 + 0.05 * Math.sin(t * 0.7), open: talk(t, 'C01'), heave: 0.04 * Math.sin(t * 2.2) } });
    finish(ctx, { bloom: 0.42, vig: 0.62, vigIn: 0.3 });
  }

  // ================================================================ C01, "Is this how the Seven fight?": the masks
  function shotMasks(ctx, t, sh) {
    const u = span(t, sh.a - 0.2, sh.b + 0.2), fl = flick(t, 2, 10);
    const c = { x: lerp(0, 20, ease(u)), y: lerp(20, -20, ease(u)), z: lerp(1.02, 1.1, ease(u)), r: 0.004 };
    drawForest(ctx, c, 0.35, 'masks', { fx: 980, ground: 1240, seed: 23, spread: 900, scale: 1.4, light: 0.8, gap: 260 });
    view(ctx, c, 0.35); glow(ctx, [200, 80, 30], 980, 1250, 1100, 0.2 * fl);
    view(ctx, c, 0.8);
    const men = [
      { x: 1790, y: 1310, h: 880, turn: -0.45, torch: 1, s: 14, lit: 0.85, b: 0.92, hl: 1 },
      { x: 450, y: 1700, h: 1260, turn: 0.32, torch: 0, s: 11, lit: 1.15, b: 1.14 },
      { x: 1500, y: 1690, h: 1270, turn: -0.28, torch: 0, s: 13, lit: 1.15, b: 0.94, hl: 0.8 },
      { x: 985, y: 1760, h: 1430, turn: 0.02, torch: -1, s: 12, lit: 1.3, b: 1.2, leader: true },
    ];
    const tor = [];
    for (const m of men) { const r = hooded(ctx, m.x, m.y, m.h, { lit: m.lit * 1.2 * fl * (0.9 + 0.12 * Math.sin(t * 6.3 + m.s)), fx: clamp((960 - m.x) / 600, -1, 1), t, bulk: m.b, hoodLow: m.hl || 0, turn: m.turn, torch: m.torch, seed: m.s }); if (r.torch) tor.push([r.torch, m.h * 0.07, m.s]); }
    for (const [p, s, sd] of tor) torchLight(ctx, p, s, t, sd);
    // flicker crossing the masks: a warm light that breathes from below
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    { const g = ctx.createLinearGradient(0, H, 0, H * 0.5); g.addColorStop(0, rgbs([255, 120, 40], 0.07 * fl)); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    haze(ctx, 120, 160, 1680, 760, t, 3.2);
    // the fire close in front, out of focus
    view(ctx, c, 1.2);
    glow(ctx, [255, 120, 40], 900, 1180, 900, 0.4 * fl);
    fire(ctx, 960, 1260, 1500, 420 * fl, t, 41, { n: 12, slot: 'k1', res: 0.1, hmax: 600, heat: 0.95 });
    sparks(ctx, t, { x: 960, y: 1080, w: 1400, h: 1100, n: 40, heat: 1, wind: 20, seed: 42, size: 1.4 });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    K.embers(ctx, t, { n: 24, heat: 0.55, seed: 43 });
    finish(ctx, { bloom: 0.4, vig: 0.66, vigIn: 0.28 });
  }

  // ================================================================ C02: close on his silhouette against the flames; he laughs
  function shotLaugh(ctx, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a - 0.2, sh.b + 0.2), fl = flick(t, 3, 9), [kx, ky] = K.shake(t * 0.9, 5, 51);
    const c = { x: lerp(-20, 30, ease(u)) + kx, y: lerp(10, -6, u) + ky, z: lerp(1.0, 1.07, ease(u)), r: 0.004 * Math.sin(t * 0.8) };
    const lg = laughing(t), C02 = K.cue('C02'), llt = t - C02.start;
    // the fire behind him: a wall of light, smoke above
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    { const g = ctx.createLinearGradient(0, H, 0, 0); g.addColorStop(0, '#7a3010'); g.addColorStop(0.3, '#3e1206'); g.addColorStop(0.6, '#160503'); g.addColorStop(1, '#050101'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    view(ctx, c, 0.5);
    K.smoke(ctx, t, { n: 14, x: -100, y: -500, w: 2100, h: 800, color: [20, 8, 5], alpha: 0.55, rise: 40, size: 520, seed: 531, drift: 10 });
    glow(ctx, [255, 120, 40], 900, 900, 1100, 0.35 * fl);
    fire(ctx, 900, 1250, 1500, 1050 * fl, t, 51, { n: 12, slot: 'L1', res: 0.14, hmax: 1400 });
    fire(ctx, 1350, 1220, 1000, 800 * flick(t, 9, 8), t + 2, 52, { n: 9, slot: 'L2', res: 0.16, hmax: 1100, heat: 0.85 });
    fire(ctx, 450, 1220, 800, 700 * flick(t, 19, 8), t + 4, 56, { n: 8, slot: 'L4', res: 0.16, hmax: 950, heat: 0.75 });
    view(ctx, c, 0.7);
    K.smoke(ctx, t, { n: 10, x: 200, y: -300, w: 1600, h: 800, color: [120, 52, 24], alpha: 0.16, rise: 50, size: 400, seed: 532, drift: 14 });
    // Cael: head thrown back with the laugh, the chest heaving
    const heave = 0.05 * lg * Math.abs(Math.sin(llt * 19)) + 0.03 * Math.sin(t * 2.4);
    const pose = { lift: 1 - 0.28 * lg, tilt: -0.08 + 0.07 * lg * Math.sin(llt * 19), open: Math.max(talk(t, 'C02'), 0.75 * lg), heave };
    view(ctx, c, 1);
    const sx = 1060, sy = 905, cs = 2600;
    rimLit(ctx, (cc, fill) => caelLying(cc, sx, sy, cs, Object.assign({ fill }, pose)), { rim: rgb([255, 214 * fl, 140 * fl]), mid: '#7a3410', dark: '#060302', dx: -3, dy: 7, steps: 5 });
    // the grate's rail in front, glowing along its edge; tongues of fire close to the lens
    ctx.fillStyle = '#0a0605'; ctx.fillRect(-200, 905, 2400, 30);
    { const g = ctx.createLinearGradient(0, 905, 0, 935); g.addColorStop(0, rgbs([255, 130, 50], 0.5 * fl)); g.addColorStop(0.3, 'rgba(0,0,0,0)'); g.addColorStop(1, rgbs([255, 160, 70], 0.6 * fl)); ctx.fillStyle = g; ctx.fillRect(-200, 905, 2400, 30); }
    view(ctx, c, 1.3);
    fire(ctx, 1100, 1260, 1900, 330 * fl, t + 1.1, 53, { n: 13, slot: 'L3', res: 0.12, hmax: 480, heat: 0.6 });
    view(ctx, c, 1);
    sparks(ctx, t, { x: 1200, y: 960, w: 1500, h: 1100, n: 55, heat: 1.1, wind: -10, seed: 54, size: 1.3 });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    haze(ctx, 0, 0, W, 900, t, 3.5);
    K.embers(ctx, t, { n: 30, heat: 0.6, seed: 55 });
    finish(ctx, { bloom: 0.38, vig: 0.62, vigIn: 0.3 });
    void lt;
  }

  // ================================================================ C02: they step back, uneasy; one turns his face away
  function shotUneasy(ctx, t, sh) {
    const u = span(t, sh.a - 0.2, sh.b + 0.2), fl = flick(t, 4, 9), [kx, ky] = K.shake(t * 0.6, 3, 61);
    const c = { x: lerp(20, -20, ease(u)) + kx, y: lerp(-10, 10, u) + ky, z: lerp(1.07, 1.0, ease(u)), r: 0 };
    drawForest(ctx, c, 0.35, 'uneasy', { fx: 960, ground: 1080, seed: 37, spread: 1000, scale: 1.2, light: 1.1 });
    view(ctx, c, 0.35); glow(ctx, [200, 80, 30], 960, 1150, 1000, 0.18 * fl);
    view(ctx, c, 0.85);
    const C02 = K.cue('C02'), a0 = C02.start + 2.75;
    const men = [
      { x: 1660, y: 1300, h: 1000, turn: -0.3, torch: 1, s: 24, st: a0 + 0.35, b: 0.94 },
      { x: 360, y: 1320, h: 1060, turn: 0.35, torch: 0, s: 21, st: 1e9, leader: true, b: 1.22 },
      { x: 820, y: 1290, h: 980, turn: 0.15, torch: -1, s: 22, st: a0, b: 1.04, hl: 1 },
      { x: 1240, y: 1285, h: 965, turn: -0.06, torch: 0, s: 23, st: a0 + 0.18, away: true, b: 0.9 },
    ];
    const tor = [];
    for (const m of men) {
      const stp = easeOut(span(t, m.st, m.st + 1.0)), k = 1 - 0.1 * stp, bob = Math.sin(Math.PI * span(t, m.st, m.st + 0.8)) * 14;
      const aw = m.away ? ease(span(t, C02.start + 3.6, C02.start + 4.6)) : 0;
      const r = hooded(ctx, m.x + (m.x - 960) * 0.06 * stp, m.y - 60 * stp - bob, m.h * k, { lit: (1.35 - 0.4 * stp) * fl * (0.9 + 0.1 * Math.sin(t * 6 + m.s)), fx: clamp((960 - m.x) / 600, -1, 1), t, bulk: m.b, hoodLow: m.hl || 0, turn: m.turn * (1 - aw) - 0.98 * aw, bow: 0.7 * aw, torch: m.torch, seed: m.s, lean: -0.06 * Math.sin(Math.PI * span(t, m.st, m.st + 0.9)) });
      if (r.torch) tor.push([r.torch, m.h * k * 0.07, m.s]);
    }
    for (const [p, s, sd] of tor) torchLight(ctx, p, s, t, sd);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    haze(ctx, 0, 120, W, 820, t, 2.8);
    view(ctx, c, 1.25);
    glow(ctx, [255, 120, 40], 960, 1200, 900, 0.3 * fl);
    fire(ctx, 960, 1250, 1700, 300 * fl, t, 61, { n: 12, slot: 'U1', res: 0.1, hmax: 420, heat: 0.85 });
    view(ctx, c, 1);
    sparks(ctx, t, { x: 960, y: 1100, w: 1600, h: 1000, n: 34, heat: 0.9, wind: 16, seed: 62 });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    K.embers(ctx, t, { n: 22, heat: 0.5, seed: 63 });
    finish(ctx, { bloom: 0.36, vig: 0.66, vigIn: 0.28 });
  }

  // ================================================================ C03, "Burn the name. Burn the boy.": the fire roars up
  function shotRoar(ctx, t, sh) {
    const C03 = K.cue('C03'), ft = t - (C03.start + 0.1), u = span(t, sh.a - 0.2, sh.b + 0.2);
    const surge = ft < 0 ? 1 : 1 + 1.3 * easeOut(span(ft, 0, 0.35)) * (1 - 0.35 * smooth(span(ft, 0.6, 3.0)));
    const fl = flick(t, 5, 11), [kx, ky] = K.shake(t * 1.4, 4 + 12 * Math.exp(-Math.max(0, ft) * 2.5) * (ft > 0 ? 1 : 0), 71);
    const c = { x: lerp(-30, 0, ease(u)) + kx - 120, y: lerp(30, -40, ease(u)) + ky - 60, z: lerp(1.3, 1.46, ease(u)), r: 0.003 * Math.sin(t * 1.3) };
    const lt = t - C03.start, shout = (lt > -0.05 && lt < 0.95) || (lt > 1.2 && lt < 2.25) ? 1 : 0;
    const pose = { lift: 1, tilt: 0.1 + 0.12 * shout * smooth(span((lt % 1.25), 0, 0.2)), open: Math.max(talk(t, 'C03'), 0.3 * shout), heave: 0.06 * shout + 0.03 * Math.sin(t * 3) };
    pyreWorld(ctx, t, c, { heat: surge, fl, pose, recoil: smooth(span(ft, 0.05, 0.6)), front: 1.6 });
    // the surge: a pillar of flame through the grate that swallows the shape on it
    view(ctx, c, 1);
    if (ft > 0) {
      const k = easeOut(span(ft, 0, 0.3)) * (1 - 0.3 * smooth(span(ft, 0.8, 3)));
      fire(ctx, PYRE.x + 30, PYRE.y - 80, 700, 620 * k * fl, t + 0.4, 81, { n: 11, slot: 'R1', heat: 0.8, hmax: 700 });
      glow(ctx, [255, 170, 80], PYRE.x, PYRE.y - 300, 900, 0.3 * k * fl);
      sparks(ctx, t, { x: PYRE.x, y: PYRE.y - 250, w: 700, h: 1200, n: 70, heat: 1.4 * k, wind: 30, seed: 82, speed: 1.6, size: 1.2 });
    }
    finish(ctx, { bloom: 0.46, vig: 0.6, vigIn: 0.3 });
  }

  // ================================================================ C03, "I will come back for both.": he looks at the leader; the torch lowers
  function shotLook(ctx, t, sh) {
    const C03 = K.cue('C03'), lt = t - C03.start, u = span(t, sh.a - 0.2, sh.b + 0.3), fl = flick(t, 6, 9);
    const c = { x: lerp(-20, 90, ease(u)), y: lerp(10, -10, ease(u)), z: lerp(1.0, 1.1, ease(u)), r: 0 };
    drawForest(ctx, c, 0.35, 'look', { fx: 700, ground: 1100, seed: 47, spread: 1100, scale: 1.25, light: 0.9 });
    view(ctx, c, 0.35); glow(ctx, [200, 80, 30], 700, 1100, 1000, 0.18 * fl);
    // the others behind him, dimmer
    view(ctx, c, 0.6);
    hooded(ctx, 1840, 1150, 760, { lit: 0.55 * fl, fx: -1, t, turn: -0.3, seed: 41, bulk: 0.95, hoodLow: 1 });
    hooded(ctx, 980, 1100, 700, { lit: 0.6 * fl, fx: -0.6, t, turn: 0.2, seed: 42, bulk: 1.12 });
    // the leader: he holds the torch high; it lowers when he has heard him
    const low = ease(span(lt, 3.75, 5.1));
    view(ctx, c, 0.85);
    const L = hooded(ctx, 1400, 1760, 1500, { lit: 1.3 * fl * (0.92 + 0.08 * Math.sin(t * 5.1)), fx: -1, t, turn: 0.22, torch: -1, low, seed: 44, bulk: 1.18, bow: 0.25 * low });
    torchLight(ctx, L.torch, 100, t, 45); glow(ctx, [255, 140, 60], L.head[0], L.head[1] + 80, 420, 0.12 * fl);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    haze(ctx, 900, 100, 1020, 900, t, 2.6);
    // Cael's head in the foreground, the fire under him; on "I will come back for both" he looks straight at the leader
    view(ctx, c, 1.25);
    glow(ctx, [255, 120, 40], 600, 1150, 900, 0.36 * fl);
    fire(ctx, 700, 1180, 1300, 560 * fl, t, 91, { n: 11, slot: 'K1', res: 0.12, hmax: 760, heat: 0.9 });
    const look = smooth(span(lt, 2.85, 3.3));
    let pose = null;
    rimLit(ctx, (cc, fill) => { pose = caelLying(cc, 640, 1030, 1750, { fill, lift: 1, tilt: lerp(0.22, 0.4, look), open: talk(t, 'C03') * 0.8, heave: 0.03 * Math.sin(t * 2), ropes: false }); }, { rim: rgb([255, 196 * fl, 120 * fl]), mid: '#6a2c0e', dark: '#050302', dx: 2, dy: 6, steps: 5, box: [0, 260, 1500, 820], key: 'lk' });
    // the catchlight in his eye
    if (pose && look > 0) { const e = proj(c, 1.25, pose.eye[0], pose.eye[1]); ctx.setTransform(1, 0, 0, 1, 0, 0); glow(ctx, [255, 210, 150], e[0], e[1], 26, 0.55 * look * fl); ctx.fillStyle = rgbs([255, 236, 200], 0.9 * look); ctx.beginPath(); ctx.arc(e[0], e[1], 2.6, 0, TAU); ctx.fill(); }
    view(ctx, c, 1.4);
    fire(ctx, 700, 1300, 1400, 260 * fl, t + 0.9, 92, { n: 10, slot: 'K2', res: 0.1, hmax: 380, heat: 0.7 });
    view(ctx, c, 1);
    sparks(ctx, t, { x: 700, y: 1050, w: 1200, h: 1000, n: 34, heat: 0.9, wind: 20, seed: 93 });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    K.embers(ctx, t, { n: 20, heat: 0.5, seed: 94 });
    finish(ctx, { bloom: 0.38, vig: 0.66, vigIn: 0.28 });
  }

  // ================================================================ L39: wide: the fire alone in the dark; they walk away; it dies
  // Eye level, far back: the clearing small in the black forest, the fire its only light, a column of smoke. The men walk
  // off into the trees with their torches; the flames sink to embers and the dark closes in.
  const WP = { x: 960, y: 760, s: 250 };
  const WALKERS = [[-2.7, 1.0], [-2.25, 0.7], [-1.7, 1.15], [-0.6, 0.9], [-0.15, 1.05], [0.5, 0.8], [3.4, 1.1], [2.75, 0.85]];
  function shotWide(ctx, t, sh) {
    const L39 = K.cue('L39'), u = span(t, sh.a - 0.3, sh.b + 1.2), fl = flick(t, 7, 8);
    const die = smooth(span(t, L39.start + 0.3, L39.end + 1.5)), heat = lerp(1.0, 0.05, die);
    const c = { x: lerp(0, 12, ease(u)), y: lerp(30, -20, ease(u)), z: lerp(1.1, 0.98, ease(u)), r: 0 };
    drawForest(ctx, c, 0.45, 'wide', { fx: WP.x, ground: 690, seed: 57, spread: 760, scale: 0.55, light: 1.1, reach: 900 });
    view(ctx, c, 0.45); glow(ctx, [200, 80, 30], WP.x, WP.y - 60, 760, 0.2 * fl * heat);
    // the dark closing in as the light dies
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(1,1,1,${0.78 * die})`; ctx.fillRect(0, 0, W, H);
    view(ctx, c, 0.9);
    K.smoke(ctx, t, { n: 16, x: WP.x - 150, y: -380, w: 300, h: 1000, color: [110, 62, 36].map(v => v * (0.45 + 0.55 * heat)), alpha: 0.26, rise: 30, size: 260, seed: 105, drift: 16 });
    K.smoke(ctx, t, { n: 8, x: WP.x - 120, y: -600, w: 260, h: 800, color: [26, 20, 18], alpha: 0.4, rise: 22, size: 300, seed: 106, drift: 20 });
    // the men going, their backs to the fire, torches with them
    const L39s = sh.a - 0.6, tor = [];
    const men = WALKERS.map(([a, sp], i) => {
      const wk = Math.max(0, t - L39s - i * 0.15), R = 150 + wk * 70 * sp, dep = Math.sin(a);
      const mx = WP.x + Math.cos(a) * R * 1.6, my = WP.y - 14 + dep * R * 0.18, k = 1 + dep * R * 0.0016;
      return { i, a, mx, my, k, R, wk, dep };
    }).sort((p, q) => p.my - q.my);
    for (const m of men) {
      const hgt = 165 * m.k, fade = 1 - smooth(span(m.R, 420, 640));
      if (fade <= 0) continue;
      const bob = Math.abs(Math.sin(m.wk * 5.5 + m.i)) * 3 * m.k;
      ctx.save(); ctx.globalAlpha = fade;
      const r = hooded(ctx, m.mx, m.my - bob, hgt, { lit: (0.2 + 0.8 * heat) * Math.max(0.3, 1 - m.R / 700), turn: Math.cos(m.a) > 0 ? 0.95 : -0.95, torch: m.i % 3 === 0 ? (Math.cos(m.a) > 0 ? 1 : -1) : 0, low: 0.85, seed: 60 + m.i, back: m.dep < -0.3, bulk: 1.05 });
      ctx.restore();
      if (r.torch) tor.push([r.torch, 15 * m.k, 60 + m.i, fade]);
    }
    for (const [p, s2, sd, f] of tor) { torchLight(ctx, p, s2, t, sd, f); view(ctx, c, 0.9); glow(ctx, [255, 120, 40], p[0], p[1] + 60, 160, 0.12 * f); }
    // the pyre, small and alone: the flames, the shape on the iron lost in fire and smoke, then embers
    view(ctx, c, 1);
    glow(ctx, [255, 110, 36], WP.x, WP.y - 60, 420, 0.4 * fl * heat);
    glow(ctx, [170, 40, 16], WP.x, WP.y - 10, 200, 0.3 * (0.5 + 0.5 * die) * (0.8 + 0.2 * Math.sin(t * 1.6)));
    pyre(ctx, WP.x, WP.y, WP.s, 'back', Math.max(0.25, heat) * fl, t);
    fire(ctx, WP.x, WP.y + 2, 210, 240 * heat * fl, t, 101, { n: 9, slot: 'Wd', hmax: 300, heat: Math.min(1, heat * 1.15) });
    ctx.save(); ctx.globalAlpha = 1 - 0.85 * die;
    caelLying(ctx, WP.x - 0.3 * WP.s, WP.y - 0.33 * WP.s - 1, 0.84 * WP.s, { fill: '#080403', lift: lerp(0.9, 0.1, smooth(span(t, L39.start, L39.end))) });
    ctx.restore();
    fire(ctx, WP.x + 10, WP.y + 4, 230, 130 * heat * fl, t + 0.7, 102, { n: 8, slot: 'We', hmax: 160, heat: 0.6 * Math.min(1, heat * 1.2) });
    pyre(ctx, WP.x, WP.y, WP.s, 'front', Math.max(0.2, heat) * fl, t);
    K.smoke(ctx, t, { n: 7, x: WP.x - 150, y: WP.y - 260, w: 300, h: 200, color: [46, 34, 28], alpha: 0.3 + 0.35 * die, rise: 10, size: 200, seed: 109 });
    sparks(ctx, t, { x: WP.x, y: WP.y - 90, w: 160, h: 520, n: 28, heat: heat, wind: 12, seed: 107, size: 0.7 });
    // two great trunks close to us frame the clearing
    view(ctx, c, 1.35);
    for (const [tx, tw, sd] of [[60, 230, -1], [1890, 260, 1]]) {
      ctx.beginPath(); ctx.moveTo(tx - tw / 2, -300); ctx.lineTo(tx + tw / 2, -300); ctx.lineTo(tx + tw * 0.62, 1400); ctx.lineTo(tx - tw * 0.62, 1400); ctx.closePath(); ctx.fillStyle = '#030202'; ctx.fill();
      const g = ctx.createLinearGradient(tx - sd * tw * 0.5, 0, tx - sd * tw * 0.3, 0); g.addColorStop(0, rgbs([200, 90, 40], 0.18 * heat * fl)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fill();
    }
    ctx.fillStyle = '#030202'; ctx.beginPath(); ctx.moveTo(-300, 1400); for (let k = 0; k <= 30; k++) { const xx = -300 + k * 90; ctx.lineTo(xx, 1080 - 40 * Math.abs(Math.sin(k * 1.9)) - 30 * Math.abs(Math.sin(k * 0.7))); } ctx.lineTo(2400, 1400); ctx.closePath(); ctx.fill();
    // rain arriving as it dies
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const rn = smooth(span(t, L39.end - 0.2, L39.end + 2.0));
    if (rn > 0) K.rain(ctx, t, { n: 200, angle: 0.08, alpha: 0.1 * rn, len: 30, seed: 108, color: 'rgba(170,180,195,1)' });
    finish(ctx, { bloom: 0.36, vig: 0.72, vigIn: 0.26, shadow: '#1a2533', shadowA: 0.25 * die });
  }

  // ================================================================ L40: the oak-leaf clasp in the mud by the ashes, rain hissing on it
  function mudStatic() {
    return K.cached('s7:mud', () => {
      const w = W + 300, h = H + 220, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(1301);
      // a wet, churned ground painted per pixel at a quarter size: mud, standing water, the sky's grey and the ashes' red in it
      const qw = Math.ceil(w / 4), qh = Math.ceil(h / 4), q = K.canvas(qw, qh), qx = q.getContext('2d'), img = qx.createImageData(qw, qh);
      for (let j = 0; j < qh; j++) for (let i = 0; i < qw; i++) {
        const u = i / qw, v = j / qh, n = K.fbm(u * 7, v * 4.5, 5, 1303), n2 = K.fbm(u * 26, v * 16, 3, 1304), warmK = Math.max(0, 1 - Math.hypot(u - 0.9, (v - 0.08) * 0.8) / 0.55);
        let col;
        if (n < 0.4) { const k = smooth((0.4 - n) / 0.06), sky = 1 - v; col = mix([20, 18, 18], mix([30, 33, 40], [70, 28, 18], warmK * 0.6), k * (0.4 + 0.6 * sky)); }
        else { const ridge = clamp((n - 0.4) * 3); col = mix([14, 11, 10], [40, 34, 32], ridge * 0.6 + n2 * 0.35); col = mix(col, [90, 40, 22], warmK * 0.35 * n2); }
        const k = (j * qw + i) * 4; img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255;
      }
      qx.putImageData(img, 0, 0); x.imageSmoothingQuality = 'high'; x.drawImage(q, 0, 0, w, h);
      // grit, small stones catching the cold light, a boot print going away
      for (let i = 0; i < 1400; i++) { const px = r() * w, py = r() * h, rr = 1 + r() * 4 * (0.5 + py / h); x.fillStyle = rgbs(mix([20, 17, 16], [70, 68, 72], r()), 0.5); x.beginPath(); x.ellipse(px, py, rr * 1.5, rr, r() * 3, 0, TAU); x.fill(); if (r() < 0.3) { x.fillStyle = 'rgba(170,176,190,0.18)'; x.fillRect(px - rr * 0.5, py - rr * 0.6, rr, 1); } }
      x.save(); x.translate(w * 0.62, h * 0.74); x.rotate(-0.5); x.fillStyle = 'rgba(4,4,4,0.6)'; x.beginPath(); x.ellipse(0, 0, 120, 46, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(-170, 6, 62, 38, 0, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(150,156,170,0.12)'; x.lineWidth = 2; for (let k = -4; k <= 4; k++) { x.beginPath(); x.moveTo(k * 24, -36); x.lineTo(k * 24 + 6, 36); x.stroke(); } x.restore();
      // the edge of the ash bed at the upper right: grey ash, charcoal
      x.save(); x.translate(w * 0.92, h * 0.05);
      for (let i = 0; i < 700; i++) { const a = r() * TAU, rr = Math.pow(r(), 0.6) * 560; const px = Math.cos(a) * rr * 1.3, py = Math.sin(a) * rr * 0.5; x.fillStyle = r() < 0.55 ? rgbs([62 + r() * 40, 58 + r() * 36, 56 + r() * 30], 0.45) : rgbs([6, 5, 4], 0.75); x.beginPath(); x.ellipse(px, py, 3 + r() * 14, 2 + r() * 5, r() * 3, 0, TAU); x.fill(); }
      x.restore();
      return c;
    });
  }
  // the clasp: an oak leaf in tarnished bronze edged with silver, the pin behind; trodden half into the mud
  function claspSprite() {
    return K.cached('s7:clasp', () => {
      const w = 560, h = 420, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(1311);
      const cx = 280, cy = 200, L = 330, ang = -0.42;
      const env = u => Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.04)), 0.7) * (u < 0.12 ? u / 0.12 : 1);
      const pts = []; const N = 110;
      for (let k = 0; k <= N; k++) { const u = k / N, lob = 0.6 + 0.4 * Math.pow(Math.abs(Math.cos(u * Math.PI * 4.5 + 0.4)), 0.7); pts.push([(u - 0.5) * L, -env(u) * lob * 72]); }
      for (let k = N; k >= 0; k--) { const u = k / N, lob = 0.6 + 0.4 * Math.pow(Math.abs(Math.cos(u * Math.PI * 4.5 + 1.9)), 0.7); pts.push([(u - 0.5) * L, env(u) * lob * 68]); }
      x.save(); x.translate(cx, cy); x.rotate(ang);
      x.strokeStyle = '#2c2822'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(-L * 0.4, 20); x.lineTo(L * 0.36, 17); x.stroke();
      x.strokeStyle = '#7a756a'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(-L * 0.4, 18); x.lineTo(L * 0.36, 15); x.stroke();
      x.fillStyle = '#3e3022'; x.beginPath(); x.roundRect(-L * 0.6, -6, L * 0.13, 12, 6); x.fill();
      x.save(); x.translate(4, 7); x.beginPath(); pts.forEach((p, k) => k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fillStyle = 'rgba(0,0,0,0.65)'; x.filter = 'blur(5px)'; x.fill(); x.restore();
      x.beginPath(); pts.forEach((p, k) => k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath();
      const g = x.createLinearGradient(-L / 2, -80, L / 2, 80); g.addColorStop(0, '#3c2e1e'); g.addColorStop(0.32, '#6a573c'); g.addColorStop(0.44, '#b7aa8c'); g.addColorStop(0.5, '#e2dccb'); g.addColorStop(0.56, '#8c7a58'); g.addColorStop(0.8, '#4a3a26'); g.addColorStop(1, '#2a2016');
      x.fillStyle = g; x.fill(); x.save(); x.clip();
      const wg = x.createLinearGradient(L / 2, -70, 0, 40); wg.addColorStop(0, 'rgba(255,90,40,0.4)'); wg.addColorStop(1, 'rgba(255,90,40,0)'); x.fillStyle = wg; x.fillRect(-L, -150, 2 * L, 300);
      for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${r() < 0.6 ? '30,24,16' : '200,196,186'},${0.05 + r() * 0.1})`; x.beginPath(); x.arc((r() - 0.5) * L, (r() - 0.5) * 140, 1 + r() * 4, 0, TAU); x.fill(); }
      x.strokeStyle = 'rgba(28,20,12,0.8)'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(-L * 0.5, 0); x.quadraticCurveTo(0, -4, L * 0.47, -1); x.stroke();
      x.lineWidth = 1.5; for (let k = 0; k < 8; k++) { const u = 0.14 + k * 0.1, px = (u - 0.5) * L, sd = k % 2 ? 1 : -1; x.beginPath(); x.moveTo(px, -1); x.quadraticCurveTo(px + 16, sd * 20, px + 32, sd * 44); x.stroke(); }
      x.strokeStyle = 'rgba(240,236,222,0.3)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-L * 0.5, -2); x.quadraticCurveTo(0, -6, L * 0.47, -3); x.stroke();
      x.restore();
      x.strokeStyle = 'rgba(16,12,8,0.85)'; x.lineWidth = 2; x.stroke();
      x.strokeStyle = 'rgba(225,222,210,0.5)'; x.lineWidth = 1.3; x.beginPath(); pts.slice(0, N + 1).forEach((p, k) => k ? x.lineTo(p[0], p[1] + 1.5) : x.moveTo(p[0], p[1] + 1.5)); x.stroke();
      x.restore();
      // the lip of mud over its lower end
      x.save(); x.translate(cx - 110, cy + 110); x.rotate(-0.38);
      x.beginPath(); for (let q = 0; q <= 30; q++) { const an = Math.PI * (q / 30), rr = 120 + (r() - 0.5) * 24; x.lineTo(-Math.cos(an) * rr * 1.5, -Math.sin(an) * rr * 0.42 + 30); } x.lineTo(200, 160); x.lineTo(-200, 160); x.closePath();
      const mg = x.createLinearGradient(0, -30, 0, 100); mg.addColorStop(0, '#28221f'); mg.addColorStop(0.3, '#13100e'); mg.addColorStop(1, '#0d0b0a'); x.fillStyle = mg; x.fill();
      x.strokeStyle = 'rgba(150,156,172,0.2)'; x.lineWidth = 1.5; x.stroke();
      x.restore();
      return c;
    });
  }
  function shotClasp(ctx, t, sh) {
    const L40 = K.cue('L40'), u = span(t, sh.a - 0.8, sh.b + 0.8), lt = t - sh.a;
    const c = { x: lerp(-60, 40, ease(u)), y: lerp(40, -10, ease(u)), z: lerp(1.0, 1.2, ease(u)), r: lerp(-0.02, 0.004, ease(u)) };
    view(ctx, c, 1); ctx.drawImage(mudStatic(), -150, -110);
    // the ash bed's dying glow at the upper right, soft, breathing; steam where the rain lands on it
    const br = 0.8 + 0.2 * Math.sin(t * 1.3) + 0.1 * Math.sin(t * 3.7);
    view(ctx, c, 0.8);
    glow(ctx, [200, 50, 20], 1820, 60, 620, 0.32 * br); glow(ctx, [255, 110, 40], 1760, 40, 220, 0.3 * br);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const er = rng(1320); for (let i = 0; i < 30; i++) { const px = 1500 + er() * 520, py = -60 + er() * 220, rr = 6 + er() * 22, pu = 0.5 + 0.5 * Math.sin(t * (1 + er() * 2) + i); ctx.fillStyle = rgbs([255, 90 + er() * 60, 30], 0.18 * pu * br); ctx.beginPath(); ctx.ellipse(px, py, rr, rr * 0.5, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    K.smoke(ctx, t, { n: 12, x: 1350, y: -420, w: 700, h: 560, color: [120, 118, 122], alpha: 0.13, rise: 30, size: 260, seed: 1321, drift: -8 });
    // the clasp
    view(ctx, c, 1);
    const S = claspSprite(); ctx.drawImage(S, 470, 300, S.width * 1.3, S.height * 1.3);
    glow(ctx, [160, 170, 200], 840, 560, 300, 0.08);
    // its glint, which comes and goes with the rain on it
    glow(ctx, [230, 230, 240], 846, 552, 60, 0.18 + 0.1 * Math.sin(t * 2.1));
    // the fire's last red on the metal, going out as the rain cools it
    { const cool = smooth(span(t, sh.a, sh.b - 0.5)); glow(ctx, [255, 80, 30], 990, 470, 190, 0.32 * (1 - cool) * (0.85 + 0.15 * Math.sin(t * 3))); }
    // rain: drops landing as rings on the puddles and the mud, splashes on the metal
    const rr = rng(1330);
    ctx.save(); ctx.lineWidth = 1.4;
    for (let i = 0; i < 70; i++) {
      const px = rr() * 2100 - 90, py = rr() * 1250 - 80, per = 0.55 + rr() * 0.9, off = rr() * per, age = ((t + off) % per) / per, cyc = Math.floor((t + off) / per);
      const jx = px + (K.hash(i, cyc, 3) - 0.5) * 120, jy = py + (K.hash(i, cyc, 4) - 0.5) * 80, R = 6 + age * (26 + rr() * 30);
      ctx.strokeStyle = rgbs([170, 180, 200], 0.4 * (1 - age)); ctx.beginPath(); ctx.ellipse(jx, jy, R, R * 0.32, 0, 0, TAU); ctx.stroke();
      if (age < 0.12) { ctx.fillStyle = rgbs([210, 216, 228], 0.6 * (1 - age / 0.12)); for (let k = 0; k < 4; k++) { const a = Math.PI + k / 3 * Math.PI, d = age * 140; ctx.beginPath(); ctx.arc(jx + Math.cos(a) * d * 0.6, jy + Math.sin(a) * d * 0.5 - age * 60, 1.6, 0, TAU); ctx.fill(); } }
    }
    for (let i = 0; i < 8; i++) {
      const per = 0.7 + rr() * 0.8, off = rr() * per, age = ((t + off) % per) / per, cyc = Math.floor((t + off) / per);
      const px = 700 + K.hash(i, cyc, 9) * 260, py = 500 + K.hash(i, cyc, 10) * 90 - (K.hash(i, cyc, 9) - 0.5) * 90;
      if (age < 0.18) { const k = 1 - age / 0.18; glow(ctx, [230, 232, 245], px, py, 18, 0.5 * k); ctx.fillStyle = rgbs([235, 238, 245], 0.8 * k); for (let q = 0; q < 5; q++) { const a = -Math.PI * (0.15 + q * 0.17), d = age * 120; ctx.beginPath(); ctx.arc(px + Math.cos(a) * d, py + Math.sin(a) * d * 0.7, 1.5, 0, TAU); ctx.fill(); } }
    }
    ctx.restore();
    // falling rain across the lens
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    K.rain(ctx, t, { n: 200, angle: 0.06, alpha: 0.2, len: 46, seed: 1331, color: 'rgba(180,190,205,1)' });
    // soft foreground: mud close to the lens, out of focus
    view(ctx, c, 1.5);
    { const g = ctx.createLinearGradient(0, 960, 0, 1200); g.addColorStop(0, 'rgba(6,5,5,0)'); g.addColorStop(0.5, 'rgba(6,5,5,0.75)'); g.addColorStop(1, 'rgba(6,5,5,0.95)'); ctx.fillStyle = g; ctx.fillRect(-300, 940, 2600, 400); }
    finish(ctx, { bloom: 0.3, vig: 0.72, vigIn: 0.25, shadow: '#26344a', shadowA: 0.3 });
    void L40; void lt;
  }

  // ================================================================ L41: the curse wakes under the ashes; the embers rise; stars; a First-Born
  // A small 3D world: y up, metres; the dead fire at the origin. cam3(pos, pitch) looks along +z, tilted by pitch.
  const FOC = 1100;
  function cam3(px, py, pz, pitch, yaw = 0) {
    const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
    return {
      px, py, pz, cp, sp, cy, sy,
      p(x, y, z) { const dx = x - px, dy = y - py, dz = z - pz, x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy, y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp; return [W / 2 + FOC * x1 / z2, H / 2 - FOC * y2 / z2, z2]; },
      d(x, y, z) { const x1 = x * cy - z * sy, z1 = x * sy + z * cy, y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp; return [W / 2 + FOC * x1 / z2, H / 2 - FOC * y2 / z2, z2]; },
    };
  }
  // the forest floor seen from above (top-down texture, 28 m square)
  const FL = { x0: -14, z0: -14, size: 28, res: 36 };
  function floorTex() {
    return K.cached('s7:floor', () => {
      const n = FL.size * FL.res, c = K.canvas(n, n), x = c.getContext('2d'), r = rng(1401);
      const q = 252, qc = K.canvas(q, q), qx = qc.getContext('2d'), img = qx.createImageData(q, q);
      for (let j = 0; j < q; j++) for (let i = 0; i < q; i++) { const f = K.fbm(i / 22, j / 22, 5, 1402), g2 = K.fbm(i / 5, j / 5, 2, 1403), v = 8 + f * 24 + g2 * 10; const k = (j * q + i) * 4; img.data[k] = v * 1.15; img.data[k + 1] = v * 0.86; img.data[k + 2] = v * 0.7; img.data[k + 3] = 255; }
      qx.putImageData(img, 0, 0); x.imageSmoothingQuality = 'high'; x.drawImage(qc, 0, 0, n, n);
      for (let i = 0; i < 6000; i++) { const px = r() * n, py = r() * n, rr = 0.8 + r() * 3; x.fillStyle = rgbs(mix([12, 9, 7], [58, 44, 32], r()), 0.45); x.beginPath(); x.ellipse(px, py, rr * 1.8, rr, r() * 3, 0, TAU); x.fill(); }
      x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineCap = 'round';
      for (let i = 0; i < 60; i++) { let px = r() * n, py = r() * n, a = r() * TAU; x.lineWidth = 2 + r() * 7; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 14; k++) { a += (r() - 0.5) * 0.5; px += Math.cos(a) * 24; py += Math.sin(a) * 24; x.lineTo(px, py); } x.stroke(); }
      const cx = -FL.x0 * FL.res, cz = -FL.z0 * FL.res;
      let g = x.createRadialGradient(cx, cz, 0, cx, cz, 1.6 * FL.res); g.addColorStop(0, '#3a3532'); g.addColorStop(0.6, '#26211e'); g.addColorStop(1, 'rgba(20,16,14,0)'); x.fillStyle = g; x.fillRect(cx - 80, cz - 80, 160, 160);
      for (let i = 0; i < 260; i++) { const a = r() * TAU, rr = Math.pow(r(), 0.5) * 1.3 * FL.res; x.fillStyle = r() < 0.5 ? 'rgba(90,86,80,0.4)' : 'rgba(10,8,7,0.7)'; x.beginPath(); x.arc(cx + Math.cos(a) * rr, cz + Math.sin(a) * rr, 1 + r() * 4, 0, TAU); x.fill(); }
      return c;
    });
  }
  // the ground drawn row by row in perspective (the camera has no roll or yaw)
  function floor3(ctx, C, tint) {
    const T = floorTex(), top = Math.max(0, Math.ceil(H / 2 - FOC * Math.tan(-Math.atan2(C.sp, C.cp)) * 0 - 0));
    // the horizon: rows whose ray goes down
    for (let ys = H - 1; ys >= 0; ys -= 3) {
      const v = -(ys + 1.5 - H / 2) / FOC, dy = v * C.cp + C.sp, z1 = -v * C.sp + C.cp;
      if (dy > -0.004) break;
      const tt = -C.py / dy, wz = C.pz + tt * z1, xl = C.px + tt * (-W / 2 / FOC), xr = C.px + tt * (W / 2 / FOC);
      const sx = (xl - FL.x0) * FL.res, sy = (wz - FL.z0) * FL.res, sw = (xr - xl) * FL.res;
      if (sy < 0 || sy >= T.height) { ctx.fillStyle = '#050403'; ctx.fillRect(0, ys - 2, W, 3); continue; }
      ctx.drawImage(T, sx, sy, sw, 1, 0, ys - 2, W, 3);
      const fogk = clamp((tt * Math.hypot(z1, 1) - 7) / 9); if (fogk > 0) { ctx.fillStyle = `rgba(3,3,4,${fogk * 0.92})`; ctx.fillRect(0, ys - 2, W, 3); }
    }
    void top; void tint;
  }
  // the curse: red veins that branch out from under the ashes through the floor (world x, z; arrival distance d)
  const VEINS = (() => {
    const r = rng(1451), segs = [];
    const grow = (x, z, a, len, w, d, depth) => {
      const step = 0.22, n = Math.ceil(len / step);
      for (let i = 0; i < n; i++) {
        a += (r() - 0.5) * 0.55; const nx = x + Math.cos(a) * step, nz = z + Math.sin(a) * step;
        segs.push([x, z, nx, nz, d, w * (1 - 0.55 * i / n)]); x = nx; z = nz; d += step;
        if (depth < 3 && r() < 0.13) grow(x, z, a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.7), len * (0.3 + r() * 0.35), w * 0.6, d, depth + 1);
      }
    };
    for (let k = 0; k < 9; k++) grow(Math.cos(k * 0.7) * 0.3, Math.sin(k * 0.7) * 0.3, k / 9 * TAU + (r() - 0.5) * 0.5, 9 + r() * 6, 1, 0, 0);
    return segs;
  })();
  function veins3(ctx, C, front, a, t) {
    if (a <= 0 || front <= 0) return;
    const buckets = [[], [], []];
    for (const s of VEINS) {
      if (s[4] > front) continue;
      const f = Math.min(1, (front - s[4]) / 0.22), x1 = lerp(s[0], s[2], f), z1 = lerp(s[1], s[3], f);
      const A = C.p(s[0], 0, s[1]), B = C.p(x1, 0, z1); if (A[2] < 0.2 || B[2] < 0.2) continue;
      const w = s[5] * (0.5 + 0.5 * clamp(1 - (front - s[4]) / 9)); buckets[w > 0.6 ? 0 : w > 0.32 ? 1 : 2].push(A, B, w, s[4]);
    }
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pulse = 0.85 + 0.15 * Math.sin(t * 3.1);
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalCompositeOperation = pass ? 'lighter' : 'source-over';
      buckets.forEach((b, bi) => {
        if (!b.length) return; ctx.beginPath();
        for (let i = 0; i < b.length; i += 4) { ctx.moveTo(b[i][0], b[i][1]); ctx.lineTo(b[i + 1][0], b[i + 1][1]); }
        const z = FOC / Math.max(1, Math.abs(C.py) * 2.5), wpx = [2.6, 1.6, 0.9][bi] * Math.min(2.2, z / 160 + 0.6);
        if (pass === 0) { ctx.strokeStyle = rgbs([36, 4, 3], 0.85 * a); ctx.lineWidth = wpx + 2; ctx.stroke(); ctx.strokeStyle = rgbs([120, 18, 12], 0.95 * a); ctx.lineWidth = wpx * 0.55; ctx.stroke(); }
        else { ctx.strokeStyle = rgbs([150, 20, 12], 0.12 * a * pulse); ctx.lineWidth = wpx * 6; ctx.stroke(); ctx.strokeStyle = rgbs([230, 60, 40], 0.22 * a * pulse); ctx.lineWidth = Math.max(0.6, wpx * 0.3); ctx.stroke(); }
      });
    }
    // the front itself burns brighter as it travels
    ctx.globalCompositeOperation = 'lighter';
    for (const b of buckets) for (let i = 0; i < b.length; i += 4) if (front - b[i + 3] < 0.6) { const p = b[i + 1]; glow(ctx, [255, 60, 40], p[0], p[1], 14, 0.4 * a); }
    ctx.restore();
  }
  const TREES3 = (() => { const r = rng(1471), out = []; for (let i = 0; i < 80; i++) { const a = r() * TAU, R = 5.5 + Math.pow(r(), 0.7) * 13, x = Math.cos(a) * R, z = Math.sin(a) * R; if (Math.hypot(x, z + 5) < 4.5) continue; out.push({ x, z, rad: 0.2 + r() * 0.34, h: 16 + r() * 4 }); } return out; })();
  const CANOPY = (() => { const r = rng(1481), out = []; for (let i = 0; i < 130; i++) { const a = r() * TAU, R = 8.5 + r() * 14; out.push({ x: Math.cos(a) * R, z: Math.sin(a) * R + 1.5, y: 14 + r() * 12, rad: 2.0 + r() * 2.6, k: r() }); } return out; })();
  const STARS = (() => { const r = rng(1491), out = []; for (let i = 0; i < 520; i++) { const el = Math.asin(0.25 + 0.75 * r()), az = r() * TAU; out.push({ x: Math.cos(el) * Math.sin(az), y: Math.sin(el), z: Math.cos(el) * Math.cos(az), m: Math.pow(r(), 3), ph: r() * TAU }); } return out; })();
  const MOON = (() => { const el = 1.36, az = 0.42, v = [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)]; return v; })();
  function blobImg() {
    return K.cached('s7:blob', () => {
      const s = 160, c = K.canvas(s, s), x = c.getContext('2d'), r = rng(1499); x.fillStyle = '#000';
      for (let i = 0; i < 46; i++) { const a = r() * TAU, rr = Math.sqrt(r()) * 52; x.beginPath(); x.arc(80 + Math.cos(a) * rr, 80 + Math.sin(a) * rr, 8 + r() * 22, 0, TAU); x.fill(); }
      for (let i = 0; i < 120; i++) { const a = r() * TAU, rr = 60 + r() * 18; x.beginPath(); x.ellipse(80 + Math.cos(a) * rr, 80 + Math.sin(a) * rr, 3 + r() * 5, 1.5 + r() * 2, a + r(), 0, TAU); x.fill(); }
      return c;
    });
  }
  // the First-Born, a winged shape seen from below (after the intro's wyvern)
  const WY = (() => {
    const q = (a, c, b, n = 7) => { const out = []; for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } return out; };
    const wing = [[0.24, 0.08], [0.4, 0.5], [0.16, 1.0], [-0.04, 1.7], ...q([-0.04, 1.7], [-0.26, 1.42], [-0.52, 1.38]), ...q([-0.52, 1.38], [-0.5, 1.06], [-0.7, 0.9]), ...q([-0.7, 0.9], [-0.46, 0.56], [-0.5, 0.12])];
    return { wing };
  })();
  function wyvern(ctx, x, y, s, yaw, flap, t, fill) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), P = (lx, ly) => [x + (lx * cy - ly * sy) * s, y + (lx * sy + ly * cy) * s];
    ctx.save(); ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const spine = [], N = 30;
    for (let i = 0; i <= N; i++) { const u = i / N, lx = lerp(1.26, -1.62, u); const sw = (u > 0.45 ? Math.sin(t * 1.9 - u * 7) * 0.14 * Math.pow((u - 0.45) / 0.55, 1.5) : 0) + (u < 0.3 ? Math.sin(t * 1.6 + u * 6) * 0.05 : 0); spine.push([lx, sw]); }
    const wid = lx => lx > 1.1 ? 0.075 * (1.26 - lx) / 0.16 + 0.015 : lx > 0.96 ? 0.085 : lx > 0.32 ? lerp(0.1, 0.06, (lx - 0.32) / 0.64) : lx > -0.46 ? 0.1 + 0.11 * Math.sin((lx + 0.46) / 0.78 * Math.PI) : 0.1 * Math.pow(Math.max(0, (lx + 1.62) / 1.16), 1.3) + 0.01;
    const Lp = [], Rp = []; for (const [lx, sw] of spine) { const w = wid(lx); Lp.push(P(lx, sw - w)); Rp.push(P(lx, sw + w)); }
    ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]); for (const p of Lp) ctx.lineTo(p[0], p[1]); for (let i = Rp.length - 1; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]); ctx.closePath(); ctx.fill();
    const fold = 1 - 0.35 * Math.max(0, flap), sw = 0.75 + 0.25 * Math.cos(flap * 1.2);
    for (const sd of [-1, 1]) { ctx.beginPath(); WY.wing.forEach((p, k) => { const q = P(p[0] - 0.08 * flap * (p[1] > 0.6 ? 1 : 0), sd * p[1] * (p[1] > 0.6 ? fold : 1) * sw); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  function shotCurse(ctx, t, sh) {
    const L41 = K.cue('L41'), sc = K.scene(7), lt = t - L41.start;
    // the camera: low over the ashes while the veins spread, then it tilts up after the rising embers to the sky
    const up = ease(span(t, L41.start + 5.2, L41.start + 8.9)), dr = ease(span(t, sh.a - 1, L41.start + 5.4));
    const px = lerp(1.6, -0.2, dr), py = lerp(4.2, 2.2, dr) - 0.8 * up, pz = lerp(-7.6, -5.0, dr) + 1.3 * up, pitch = lerp(lerp(-0.5, -0.34, dr), 1.18, up) + 0.04 * up * Math.sin(t * 0.4);
    const C = cam3(px, py, pz, pitch, lerp(-0.12, 0.02, dr) * (1 - up));
    // the fire's last life, the curse's glow
    const ember = 0.35 + 0.1 * Math.sin(t * 1.7);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#030305'; ctx.fillRect(0, 0, W, H);
    // the sky: the horizon row, a deep blue-black, stars, the moon, a thinning cloud
    const sk = smooth(span(up, 0.15, 0.75)), m0 = C.d(MOON[0], MOON[1], MOON[2]);
    {
      const mx = m0[2] > 0 ? m0[0] : W / 2, my = m0[2] > 0 ? m0[1] : -2000, g = ctx.createRadialGradient(mx, my, 40, mx, my, 1500);
      g.addColorStop(0, '#2c3a56'); g.addColorStop(0.25, '#18223a'); g.addColorStop(0.6, '#0b1120'); g.addColorStop(1, '#05070d'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (sk > 0) {
      ctx.save(); ctx.fillStyle = '#dfe6f4';
      for (const s of STARS) { const q = C.d(s.x, s.y, s.z); if (q[2] <= 0 || q[0] < -5 || q[0] > W + 5 || q[1] < -5 || q[1] > H + 5) continue; ctx.globalAlpha = sk * (0.25 + 0.75 * s.m) * (0.7 + 0.3 * Math.sin(t * 2.3 + s.ph)); const z = 0.8 + s.m * 1.6; ctx.fillRect(q[0] - z / 2, q[1] - z / 2, z, z); }
      ctx.restore();
      const m = C.d(MOON[0], MOON[1], MOON[2]);
      if (m[2] > 0) {
        glow(ctx, [140, 160, 200], m[0], m[1], 520, 0.22 * sk); glow(ctx, [200, 214, 240], m[0], m[1], 170, 0.4 * sk);
        ctx.save(); ctx.globalAlpha = sk; const mg = ctx.createRadialGradient(m[0] - 18, m[1] - 18, 6, m[0], m[1], 64); mg.addColorStop(0, '#f4f6fb'); mg.addColorStop(0.8, '#d6dceb'); mg.addColorStop(1, '#b9c2d8'); ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(m[0], m[1], 62, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(120,130,160,0.22)'; for (const [dx, dy, rr] of [[-18, -10, 16], [14, 8, 20], [-4, 24, 10], [22, -20, 9]]) { ctx.beginPath(); ctx.arc(m[0] + dx, m[1] + dy, rr, 0, TAU); ctx.fill(); }
        ctx.restore();
        // thin cloud drifting off the moon
        K.smoke(ctx, t, { n: 7, x: m[0] - 600, y: m[1] - 260, w: 1200, h: 420, color: [70, 80, 100], alpha: 0.16 * sk, rise: 4, size: 380, seed: 1495, drift: 14 });
        // the First-Born crossing the moon, far above
        const fb = span(t, L41.start + 6.4, sc.end - 0.5);
        if (fb > 0 && fb < 1) { const fx = m[0] + lerp(-820, 760, fb), fy = m[1] + lerp(190, -170, fb) + Math.sin(fb * 3.2) * 16; wyvern(ctx, fx, fy, 105, -0.22, 0.35 * Math.sin(t * 2.2) - 0.2, t, '#020204'); }
      }
    }
    // the floor in perspective, darkened, its light the dying bed and then the curse
    floor3(ctx, C);
    // the ash bed glow
    const pc = C.p(0, 0, 0);
    if (pc[2] > 0.2) {
      const kz = FOC / pc[2];
      ctx.save(); ctx.translate(pc[0], pc[1]); ctx.scale(1, Math.max(0.2, Math.abs(C.cp * C.py) / Math.hypot(C.py, pc[2]) + 0.1));
      glow(ctx, [200, 50, 20], 0, 0, 2.4 * kz, 0.55 * ember); glow(ctx, [255, 120, 40], 0, 0, 0.8 * kz, 0.55 * ember * (1 - 0.6 * up));
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const er = rng(1461); for (let i = 0; i < 40; i++) { const a = er() * TAU, rr = Math.sqrt(er()) * 0.9, q = C.p(Math.cos(a) * rr, 0.02, Math.sin(a) * rr * 0.6); if (q[2] <= 0.2) continue; const pu = 0.4 + 0.6 * Math.max(0, Math.sin(t * (0.8 + er() * 2) + i)); ctx.fillStyle = rgbs([255, 80 + er() * 60, 30], 0.35 * pu); ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1, (0.02 + er() * 0.04) * FOC / q[2]), 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    // the veins spread out from under the ashes
    const front = 16 * Math.pow(smooth(span(t, L41.start - 0.2, L41.start + 6.2)), 0.8);
    veins3(ctx, C, front, smooth(span(t, L41.start - 0.6, L41.start + 0.6)), t);
    // the grate and its stones over the dead bed, black
    {
      ctx.save(); ctx.fillStyle = '#060404';
      const sr = rng(1463);
      for (const sx of [-1.05, 1.05]) for (let k = 0; k < 9; k++) { const q = C.p(sx + (sr() - 0.5) * 0.36, 0.06 + Math.floor(k / 3) * 0.13, (sr() - 0.5) * 0.5); if (q[2] < 0.2) continue; const rr = (0.08 + sr() * 0.04) * FOC / q[2]; ctx.fillStyle = rgb(mix([8, 6, 6], [40, 14, 10], sr() * 0.5)); ctx.beginPath(); ctx.ellipse(q[0], q[1], rr, rr * 0.7, sr(), 0, TAU); ctx.fill(); }
      const g0 = C.p(-1.0, 0.45, -0.35), g1 = C.p(1.0, 0.45, -0.35), g2 = C.p(1.0, 0.45, 0.35), g3 = C.p(-1.0, 0.45, 0.35);
      if (g0[2] > 0.2 && g2[2] > 0.2) {
        ctx.strokeStyle = '#080505'; ctx.lineWidth = Math.max(1.5, 0.03 * FOC / g0[2]);
        ctx.beginPath(); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]); ctx.lineTo(g2[0], g2[1]); ctx.lineTo(g3[0], g3[1]); ctx.closePath(); ctx.stroke();
        ctx.lineWidth *= 0.6; ctx.beginPath(); for (let i = 1; i < 14; i++) { const k = i / 14, a = C.p(lerp(-1, 1, k), 0.45, -0.35), b = C.p(lerp(-1, 1, k), 0.45, 0.35); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke();
        ctx.strokeStyle = rgbs([255, 80, 40], 0.18 * ember); ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.restore();
    }
    // the trees: trunks rising into the dark, the canopy closing over the clearing (sorted far to near)
    const items = [];
    for (const tr of TREES3) { const q = C.p(tr.x, 0, tr.z); items.push({ z: Math.hypot(tr.x - px, tr.z - pz), tr }); void q; }
    items.sort((a, b) => b.z - a.z);
    ctx.save();
    for (const it of items) {
      const tr = it.tr, dx = tr.x - px, dz = tr.z - pz, l = Math.hypot(dx, dz) || 1, rx = -dz / l, rz = dx / l;
      ctx.beginPath(); let started = false; const left = [], right = [];
      for (let k = 0; k <= 8; k++) { const y = tr.h * k / 8, rr = tr.rad * (1 - 0.4 * k / 8) * (k === 0 ? 1.35 : 1); const a = C.p(tr.x - rx * rr, y, tr.z - rz * rr), b = C.p(tr.x + rx * rr, y, tr.z + rz * rr); if (a[2] < 0.15 || b[2] < 0.15) continue; left.push(a); right.push(b); }
      if (left.length < 2) continue;
      left.forEach(p => { started ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); started = true; }); for (let k = right.length - 1; k >= 0; k--) ctx.lineTo(right[k][0], right[k][1]); ctx.closePath();
      const near = Math.hypot(tr.x, tr.z), Lk = Math.max(0, 1 - near / 13) * (0.18 * ember + 0.35 * smooth(span(front, near - 3, near)) * (1 - up * 0.5));
      const g = ctx.createLinearGradient(0, left[0][1], 0, left[left.length - 1][1]); g.addColorStop(0, rgb(mix([4, 3, 3], [90, 18, 12], Lk))); g.addColorStop(0.12, rgb(mix([3, 2, 2], [40, 8, 6], Lk))); g.addColorStop(0.4, '#020203'); g.addColorStop(1, '#010102');
      ctx.fillStyle = g; ctx.fill();
    }
    ctx.restore();
    // canopy masses
    {
      const B = blobImg(), cs = [];
      for (const cn of CANOPY) { const q = C.p(cn.x, cn.y, cn.z); if (q[2] < 0.5) continue; cs.push([q, cn]); }
      cs.sort((a, b) => b[0][2] - a[0][2]);
      ctx.save(); for (const [q, cn] of cs) { const s = cn.rad * FOC / q[2] * 1.15; if (s < 2) continue; ctx.globalAlpha = 0.96; ctx.drawImage(B, q[0] - s, q[1] - s, 2 * s, 2 * s); } ctx.restore();
    }
    // the embers lift off the dead fire and rise through the canopy, cooling, until they hang among the stars
    {
      const er = rng(1501), t0 = L41.start + 4.4;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 110; i++) {
        const tl = t0 + er() * 3.6, dur = 3.6 + er() * 2.4, a0 = er() * TAU, r0 = Math.sqrt(er()) * 0.8, el = 0.95 + er() * 0.45, az = (er() - 0.5) * 1.6, dist = 60 + er() * 120, ph = er() * TAU, sz = er();
        const tau = (t - tl) / dur; if (tau < 0) continue;
        const k = clamp(tau), e = 1 - Math.pow(1 - k, 2.4);
        const sx = Math.cos(a0) * r0, sz0 = Math.sin(a0) * r0 * 0.6, ex = Math.sin(az) * Math.cos(el) * dist + 0.3 * dist * MOON[0], ey = Math.sin(el) * dist, ez = Math.cos(az) * Math.cos(el) * dist * 0.5 + 0.35 * dist * MOON[2];
        const sw = Math.sin(t * 1.7 + ph) * 0.7 * (1 - k) * Math.min(1, k * 6);
        const q = C.p(lerp(sx, ex, e) + sw, lerp(0.3, ey, Math.pow(k, 1.25) * 0.4 + e * 0.6), lerp(sz0, ez, e) + sw * 0.5); if (q[2] <= 0.3) continue;
        const cool = smooth(span(k, 0.45, 1)), col = mix([255, 150, 60], [225, 232, 248], cool), s = lerp(2.6 + sz * 2, 0.9 + sz * 1.4, cool);
        const a = Math.min(1, tau * 4) * (cool > 0.9 ? 0.75 + 0.25 * Math.sin(t * 2.7 + ph) : 0.9) * (1 - 0.2 * cool);
        glow(ctx, col, q[0], q[1], s * (5 - 3 * cool), 0.45 * a); ctx.fillStyle = rgbs(mix(col, [255, 255, 255], 0.5), a); ctx.fillRect(q[0] - s / 2, q[1] - s / 2, s, s);
      }
      ctx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    finish(ctx, { bloom: 0.36, vig: 0.7, vigIn: 0.26 });
    // into black, for the otherworld
    const fo = smooth(span(t, sc.end - 1.4, sc.end - 0.05));
    if (fo > 0) { ctx.fillStyle = `rgba(0,0,0,${fo})`; ctx.fillRect(0, 0, W, H); }
    void lt;
  }

  // ================================================================ the cut: shots keyed to the lines
  let PLAN = null;
  function plan(sc) {
    if (PLAN) return PLAN;
    const c = K.cue, C01 = c('C01'), C02 = c('C02'), C03 = c('C03'), L39 = c('L39'), L40 = c('L40'), L41 = c('L41');
    const b = [sc.start, C01.start + 4.3, C02.start - 0.28, C02.start + 2.62, C03.start - 0.12, C03.start + 2.8, L39.start - 0.18, L40.start - 0.2, L41.start - 0.15, sc.end + 2];
    const S = [
      { id: 'master', fn: shotMaster, x: 0 },
      { id: 'masks', fn: shotMasks, x: 0 },
      { id: 'laugh', fn: shotLaugh, x: 0 },
      { id: 'uneasy', fn: shotUneasy, x: 0 },
      { id: 'roar', fn: shotRoar, x: 0 },
      { id: 'look', fn: shotLook, x: 0.4 },
      { id: 'wide', fn: shotWide, x: 1.0 },
      { id: 'clasp', fn: shotClasp, x: 1.3 },
      { id: 'curse', fn: shotCurse, x: 0 },
    ];
    S.forEach((s, i) => { s.a = b[i]; s.b = b[i + 1]; });
    PLAN = S; return S;
  }

  SCENES[7] = {
    join: 'cut',
    draw(ctx, t, sc) {
      const S = plan(sc);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      let i = S.findIndex(s => t < s.b); if (i < 0) i = S.length - 1;
      const cur = S[i], prev = S[i - 1];
      const mixTwo = (A, B, k) => {
        MIXING = true;
        A.fn(ctx, t, A);
        const L = K.layer('s7:next'), lx = L.getContext('2d'); B.fn(lx, t, B);
        MIXING = false;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = k; ctx.drawImage(L, 0, 0); ctx.globalAlpha = 1;
        bloom(ctx, 0.3);
      };
      if (prev && t < cur.a + prev.x / 2) mixTwo(prev, cur, smooth((t - (cur.a - prev.x / 2)) / prev.x));
      else {
        const nxt = S[i + 1];
        if (nxt && t > cur.b - cur.x / 2) mixTwo(cur, nxt, smooth((t - (cur.b - cur.x / 2)) / cur.x));
        else cur.fn(ctx, t, cur);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },
  };
})();
