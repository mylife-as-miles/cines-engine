/* Scene 7: Your Legacy Begins [L43–L50]. The chronicle burns and the present is real: the Seven muster in the rain, the
   First-Born wheel over the peaks, a man is dragged from his door, a road is barred, a sealed challenge rides out, a page
   of history is scraped away. Then a small banner hall at night, a handful of people by the fire, and on the table a
   blank standard. Registers window.SCENES[7]; see LOOK.md. */
(function () {
  'use strict';
  const K = window.KIT, P = K.P, W = K.W, H = K.H;
  const { clamp, lerp, smooth, ease, easeOut, easeIn, span, win, rng } = K;
  const SCENES = window.SCENES = window.SCENES || {};
  const TAU = Math.PI * 2;

  // ================================================================ helpers
  // view(ctx, c, d): the transform for a layer at depth d (1 = the focal plane, smaller is farther, larger is nearer)
  function view(ctx, c, d = 1) {
    const z = 1 + (c.z - 1) * d;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(W / 2, H / 2);
    if (c.r) ctx.rotate(c.r * Math.min(1, d)); ctx.scale(z, z); ctx.translate(-W / 2 - c.x * d, -H / 2 - c.y * d);
  }
  // project a point of a layer at depth d to the screen (no roll)
  function proj(c, d, x, y) { const z = 1 + (c.z - 1) * d; return [W / 2 + (x - W / 2 - c.x * d) * z, H / 2 + (y - H / 2 - c.y * d) * z, z]; }
  const rgbs = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const flick = (t, s, sp = 9) => 0.78 + 0.14 * Math.sin(t * sp + s * 3.7) + 0.1 * Math.sin(t * sp * 2.3 + s * 1.3) + 0.06 * (K.noise(t * 6, s * 7.1, 3) - 0.5) * 2;

  // a soft round light, cached per colour; drawn additively
  function glowImg(rgb) {
    return K.cached('s7:glow:' + rgb, () => {
      const s = 128, c = K.canvas(s, s), x = c.getContext('2d'), g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, rgbs(rgb, 1)); g.addColorStop(0.12, rgbs(rgb, 0.62)); g.addColorStop(0.35, rgbs(rgb, 0.2)); g.addColorStop(0.65, rgbs(rgb, 0.06)); g.addColorStop(1, rgbs(rgb, 0));
      x.fillStyle = g; x.fillRect(0, 0, s, s); return c;
    });
  }
  function glow(ctx, rgb, x, y, r, a) {
    if (a <= 0.004 || r < 0.5) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glowImg(rgb), x - r, y - r, 2 * r, 2 * r); ctx.restore();
  }
  // a tinted copy of a white-alpha canvas
  function tinted(img, rgb, key) {
    return K.cached('s7:tint:' + key + ':' + rgb, () => {
      const c = K.canvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
      x.globalCompositeOperation = 'source-in'; x.fillStyle = `rgb(${rgb})`; x.fillRect(0, 0, c.width, c.height); return c;
    });
  }
  // a small flame: a teardrop of fire with a hot core, licking upward; (x, y) is its base, s its height
  function flame(ctx, x, y, s, t, seed, heat = 1) {
    if (s < 1.5) { glow(ctx, [255, 190, 110], x, y - s * 0.4, s * 2, 0.7 * heat); return; }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const ph = seed * 1.7 + k * 2.1, sw = Math.sin(t * 7.3 + ph) * 0.18 + (K.noise(t * 5, seed + k, 9) - 0.5) * 0.35;
      const hh = s * (1 - k * 0.22) * (0.85 + 0.25 * K.noise(t * 6.5 + k * 3, seed, 4)), ww = s * (0.36 - k * 0.07);
      const col = k === 0 ? [235, 96, 30] : k === 1 ? [255, 158, 60] : [255, 236, 190];
      ctx.globalAlpha = (k === 0 ? 0.6 : k === 1 ? 0.75 : 0.9) * heat;
      ctx.fillStyle = rgbs(col, 1);
      ctx.beginPath(); ctx.moveTo(x - ww, y);
      ctx.bezierCurveTo(x - ww * 1.1, y - hh * 0.45, x + sw * ww * 2 - ww * 0.3, y - hh * 0.7, x + sw * s * 0.5, y - hh);
      ctx.bezierCurveTo(x + sw * ww * 2 + ww * 0.3, y - hh * 0.7, x + ww * 1.1, y - hh * 0.45, x + ww, y);
      ctx.quadraticCurveTo(x, y + ww * 0.5, x - ww, y); ctx.fill();
    }
    ctx.restore();
  }
  // rimLit(ctx, draw, o): silhouettes lit along one edge. draw(c, fill) paints them in a colour; a dark pass shifted by
  // (o.dx, o.dy) screen px covers all but a sliver, which is the rim. o.rim, o.mid (an inner, dimmer rim), o.dark
  function rimLit(ctx, draw, o) {
    const L = K.layer('s7:rim'), lc = L.getContext('2d'), m = ctx.getTransform(), n = o.steps || 4;
    lc.setTransform(m); draw(lc, o.rim);
    lc.globalCompositeOperation = 'source-atop';
    // dark passes pushed progressively further from the light: the rim fades into the body instead of outlining it
    for (let i = 1; i <= n; i++) { const k = i / n; lc.setTransform(m.a, m.b, m.c, m.d, m.e + o.dx * k, m.f + o.dy * k); lc.globalAlpha = i === n ? 1 : 0.42; draw(lc, i === 1 && o.mid ? o.mid : o.dark); }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); if (o.alpha != null) ctx.globalAlpha = o.alpha; ctx.drawImage(L, 0, 0); ctx.restore();
  }
  // cheap bloom: the frame shrunk twice, its brights raised, laid back over it with screen
  function bloom(ctx, a = 0.3, th = 2) {
    if (a <= 0) return;
    const A = K.layer('s7:bl1', W / 4, H / 4), B = K.layer('s7:bl2', W / 8, H / 8), ax = A.getContext('2d'), bx = B.getContext('2d');
    ax.imageSmoothingQuality = 'low'; ax.drawImage(ctx.canvas, 0, 0, W / 4, H / 4);
    bx.drawImage(A, 0, 0, W / 8, H / 8);
    bx.globalCompositeOperation = 'multiply'; for (let i = 0; i < th; i++) bx.drawImage(B, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = a; ctx.imageSmoothingQuality = 'medium'; ctx.drawImage(B, 0, 0, W, H); ctx.restore();
  }
  // a horizontal band of mist (tileable texture), scrolled
  function fogTex(seed) {
    return K.cached('s7:fog:' + seed, () => {
      const w = 512, h = 128, c = K.canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const u = i / w, f = K.fbm(i / 70, j / 34, 4, seed) * (1 - u) + K.fbm((i - w) / 70, j / 34, 4, seed) * u, v = Math.sin(Math.PI * j / h);
        const k = (j * w + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = 255 * clamp((f - 0.3) * 2.4) * v * v;
      }
      x.putImageData(img, 0, 0); return c;
    });
  }
  function fog(ctx, seed, rgb, y, h, scroll, a, x0 = -200, w = W + 400) {
    if (a <= 0) return; const tex = tinted(fogTex(seed), rgb, 'fog' + seed), tw = h * 4;
    ctx.save(); ctx.globalAlpha = a; for (let X = x0 - (((scroll % tw) + tw) % tw); X < x0 + w; X += tw) ctx.drawImage(tex, X, y, tw + 1, h); ctx.restore();
  }
  // rain: streaks at three depths; near lights they warm and brighten. o.n, o.angle, o.speed, o.len, o.alpha, o.lights [{x,y,r,rgb,a}]
  function rain(ctx, t, o = {}) {
    const r = rng(o.seed || 77), n = o.n || 260, ang = o.angle != null ? o.angle : 0.18, sp = o.speed || 1400, L = o.len || 46, al = o.alpha != null ? o.alpha : 0.22;
    const lights = o.lights || [], sa = Math.sin(ang), ca = Math.cos(ang), cool = o.rgb || [170, 186, 204];
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const z = 0.25 + r() * 0.75, x0 = r() * (W + 600) - 300, y0 = r() * (H + 200), span2 = H + 200 + L * 2;
      const yy = ((y0 + t * sp * z) % span2 + span2) % span2 - L * 2 - 100, xx = x0 + (yy + 100) * sa / ca, len = L * (0.35 + z * 0.9);
      let lit = 0, wr = 0, wg = 0, wb = 0;
      for (const l of lights) { const d = Math.hypot(xx - l.x, yy - l.y) / l.r; if (d < 1) { const k = (1 - d) * (1 - d) * (l.a || 1); lit += k; wr += l.rgb[0] * k; wg += l.rgb[1] * k; wb += l.rgb[2] * k; } }
      const col = lit > 0 ? [lerp(cool[0], wr / lit, Math.min(1, lit)), lerp(cool[1], wg / lit, Math.min(1, lit)), lerp(cool[2], wb / lit, Math.min(1, lit))] : cool;
      ctx.strokeStyle = rgbs(col.map(v => v | 0), Math.min(0.9, al * z * (1 + lit * 3.5))); ctx.lineWidth = 0.6 + z * 1.1;
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - sa * len, yy - ca * len); ctx.stroke();
    }
    ctx.restore();
  }
  // a ridge line from x0 to x1: base(x) plus fractal relief
  function ridge(x0, x1, base, seed, amp, freq, step = 5, oct = 5) {
    const pts = []; for (let x = x0; x <= x1 + step; x += step) pts.push([x, base(x) - amp * (K.fbm(x * freq, 0.5, oct, seed) - 0.5) * 2]); return pts;
  }
  function fillRidge(ctx, pts, bottom, fill) { ctx.beginPath(); ctx.moveTo(pts[0][0], bottom); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.lineTo(pts[pts.length - 1][0], bottom); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
  // a cloudy night sky, painted per pixel at low resolution (cached). o.top, o.mid, o.low: the clear sky top to horizon;
  // o.glow [rgb]: fire-light from beneath, strongest near o.glowY (0..1); o.moon [rgb]: cold light on the cloud tops; o.cover
  function sky(key, w, h, o) {
    return K.cached('s7:sky:' + key, () => {
      const c = K.canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), sd = o.seed || 1, cov = o.cover != null ? o.cover : 0.5;
      const dens = (u, v) => { const wx = u * 2.6 + 0.7 * K.fbm(u * 1.8, v * 2.4, 3, sd + 3), wy = v * 4.4 + 0.9 * K.fbm(u * 1.6 + 4, v * 2.2, 3, sd + 7); return K.fbm(wx, wy, 6, sd); };
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const u = i / w, v = j / h, d = dens(u, v), d2 = dens(u, v + 0.018), d3 = dens(u, v - 0.018);
        const cl = smooth((d - 0.58 + cov * 0.22) * 4.2), under = clamp((d - d2) * 22), over = clamp((d - d3) * 18);
        const base = v < 0.55 ? mix(o.top, o.mid, v / 0.55) : mix(o.mid, o.low, (v - 0.55) / 0.45);
        const g = Math.pow(clamp(1 - Math.abs(v - (o.glowY || 0.95)) / (o.glowR || 0.75)), 2) * (o.glowA || 1);
        const dark = o.cloud || [10, 11, 14];
        let col = mix(base, mix(dark, base, 0.35), cl);
        const lit = (0.35 + under * 1.3) * g * cl, mo = o.moon ? over * cl * (1 - v) * 0.8 : 0;
        col = [col[0] + o.glow[0] * lit + (o.moon ? o.moon[0] * mo : 0), col[1] + o.glow[1] * lit + (o.moon ? o.moon[1] * mo : 0), col[2] + o.glow[2] * lit + (o.moon ? o.moon[2] * mo : 0)];
        col = [col[0] + o.glow[0] * g * 0.18, col[1] + o.glow[1] * g * 0.18, col[2] + o.glow[2] * g * 0.18];
        const k = (j * w + i) * 4; img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255;
      }
      x.putImageData(img, 0, 0); return c;
    });
  }
  // grade and finish a shot: a colour wash, a vignette, bloom
  function finish(ctx, o = {}) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (o.bloom) bloom(ctx, o.bloom, o.bloomTh || 2);
    if (o.shadow) K.grade(ctx, o.shadow, 'soft-light', o.shadowA || 0.3);
    if (o.warm) K.grade(ctx, o.warm, 'overlay', o.warmA || 0.08);
    K.vignette(ctx, o.vig != null ? o.vig : 0.6, '0,0,0', o.vigIn != null ? o.vigIn : 0.32);
    if (o.lift) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgbs(o.lift, 1); ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }

  // ================================================================ people: silhouettes built from rounded limbs
  // person(ctx, o): a person in profile standing on (o.x, o.y), o.h tall, facing o.face (1 right). The limbs are capsules
  // joined at round joints, so the outline stays organic at any size. Pose: o.lean (torso, + forward), o.tilt (head),
  // o.walk (phase) or o.legN / o.legF [hip angle, knee bend]; o.armN / o.armF [shoulder angle, elbow bend] or
  // o.reachN / o.reachF [x, y] (a target in the ctx's units: two-bone IK); o.sit (hips on a seat that high, in h).
  // Dress: o.dress 'tunic' | 'robe' | 'cloak' | 'apron' | 'gown'; o.hat 'bare' | 'hair' | 'hood' | 'kettle' | 'helm' |
  // 'cap' | 'veil'; o.beard; o.bulk (broader); o.stoop (an old back); o.hold 'spear' | 'staff' | 'torch' | 'hammer' |
  // 'fork' (in the near hand). o.fill. Returns { hand, handF, head, torch } in the ctx's units.
  function person(ctx, o) {
    const f = o.face || 1, h = o.h, bulk = o.bulk || 1, kid = !!o.child;
    const TH = kid ? 0.2 : 0.245, SH = kid ? 0.2 : 0.235, TOR = kid ? 0.29 : 0.31, UA = kid ? 0.15 : 0.175, FA = kid ? 0.13 : 0.155, HR = kid ? 0.085 : 0.062;
    // legs (forward kinematics from the hip; the lower foot is put on the ground)
    const legPose = (s) => {
      if (o.sit) return s ? [1.45, 1.5] : [1.35, 1.35];
      if (o.walk != null) { const ph = o.walk + (s ? Math.PI : 0); return [0.38 * Math.sin(ph), 0.08 + 0.75 * Math.max(0, Math.cos(ph + 0.4))]; }
      return (s ? o.legF : o.legN) || (s ? [-0.06, 0.04] : [0.07, 0.03]);
    };
    const legs = [0, 1].map(s => { const [a1, b1] = legPose(s), kx = Math.sin(a1) * TH, ky = Math.cos(a1) * TH, a2 = a1 - b1, ax = kx + Math.sin(a2) * SH, ay = ky + Math.cos(a2) * SH; return { kx, ky, ax, ay, a2 }; });
    const lowest = o.sit ? 0 : Math.max(legs[0].ay, legs[1].ay) + 0.03;
    const hipY = o.sit ? -o.sit : -lowest;          // hip height above the ground (in h)
    const lean = (o.lean || 0) + (o.stoop || 0) * 0.5, dir = [Math.sin(lean), -Math.cos(lean)];
    const P = (lx, ly) => [o.x + f * lx * h, o.y + ly * h];     // local (h units, x forward) to ctx units
    const hip = [0, hipY], neck = [hip[0] + dir[0] * TOR, hip[1] + dir[1] * TOR];
    const sh = [neck[0] - dir[0] * 0.035 - 0.012, neck[1] - dir[1] * 0.035];
    const fillC = o.fill || '#000';
    ctx.save(); ctx.fillStyle = fillC; ctx.strokeStyle = fillC; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const cap = (a, b, ra, rb) => {   // a tapered capsule between two local points (quad and end discs filled apart)
      const A = P(a[0], a[1]), B = P(b[0], b[1]), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, r1 = ra * h, r2 = rb * h;
      ctx.beginPath(); ctx.moveTo(A[0] + nx * r1, A[1] + ny * r1); ctx.lineTo(B[0] + nx * r2, B[1] + ny * r2); ctx.lineTo(B[0] - nx * r2, B[1] - ny * r2); ctx.lineTo(A[0] - nx * r1, A[1] - ny * r1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(A[0] + r1, A[1]); ctx.arc(A[0], A[1], r1, 0, TAU); ctx.moveTo(B[0] + r2, B[1]); ctx.arc(B[0], B[1], r2, 0, TAU); ctx.fill();
    };
    const poly = (pts) => { ctx.beginPath(); pts.forEach((p, i) => { const q = P(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fill(); };
    const curve = (pts) => { // closed smooth shape through local points (quadratic midpoints)
      const Q = pts.map(p => P(p[0], p[1])), n = Q.length; ctx.beginPath(); ctx.moveTo((Q[n - 1][0] + Q[0][0]) / 2, (Q[n - 1][1] + Q[0][1]) / 2);
      for (let i = 0; i < n; i++) { const a = Q[i], b = Q[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } ctx.closePath(); ctx.fill();
    };
    // arms: angles, or IK toward a target
    const armAt = (near) => {
      const S = [sh[0] + (near ? 0.01 : -0.02), sh[1] + (near ? 0 : 0.005)];
      const tgt = near ? o.reachN : o.reachF;
      if (tgt) {
        const T = [(tgt[0] - o.x) / (f * h), (tgt[1] - o.y) / h], dx = T[0] - S[0], dy = T[1] - S[1], d = clamp(Math.hypot(dx, dy), 0.05, UA + FA - 0.002);
        const base = Math.atan2(dx, dy), cosE = clamp((UA * UA + d * d - FA * FA) / (2 * UA * d), -1, 1), ang = base + Math.acos(cosE) * (o.elbowOut ? -1 : 1);
        const E = [S[0] + Math.sin(ang) * UA, S[1] + Math.cos(ang) * UA], el = Math.hypot(T[0] - E[0], T[1] - E[1]) || 1, wr = [E[0] + (T[0] - E[0]) / el * FA, E[1] + (T[1] - E[1]) / el * FA];
        return { S, E, wr };
      }
      const [a, b] = (near ? o.armN : o.armF) || (o.walk != null ? [(near ? -0.35 : 0.35) * Math.sin(o.walk), 0.25] : [near ? 0.08 : -0.06, 0.18]);
      const E = [S[0] + Math.sin(a) * UA, S[1] + Math.cos(a) * UA], wr = [E[0] + Math.sin(a + b) * FA, E[1] + Math.cos(a + b) * FA];
      return { S, E, wr };
    };
    const AN = armAt(true), AF = armAt(false);
    const limbW = (kid ? 0.03 : 0.037) * bulk, armW = (kid ? 0.027 : 0.033) * bulk;
    const drawArm = (A) => { cap(A.S, A.E, armW * 1.05, armW * 0.85); cap(A.E, A.wr, armW * 0.85, armW * 0.62); const hd = [A.wr[0] + (A.wr[0] - A.E[0]) * 0.18, A.wr[1] + (A.wr[1] - A.E[1]) * 0.18]; cap(A.wr, hd, armW * 0.75, armW * 0.62); };
    const drawLeg = (lg) => { const K2 = [hip[0] + lg.kx, hip[1] + lg.ky], A2 = [hip[0] + lg.ax, hip[1] + lg.ay]; cap([hip[0], hip[1] - 0.02], K2, limbW * 1.35, limbW); cap(K2, A2, limbW, limbW * 0.7); poly([[A2[0] - 0.03, A2[1] - 0.012], [A2[0] + 0.075, A2[1] + 0.006], [A2[0] + 0.08, A2[1] + 0.03], [A2[0] - 0.035, A2[1] + 0.03]]); return { K2, A2 }; };
    // the far side first: far leg, far arm, a cloak behind
    const farLeg = drawLeg(legs[1]);
    if (o.dress === 'cloak') { const sw = Math.sin((o.t || 0) * 1.3 + o.x * 0.01) * 0.02 + (o.wind || 0); curve([[sh[0] + 0.02, sh[1] - 0.01], [sh[0] - 0.09, sh[1] + 0.02], [hip[0] - 0.13 - sw, hip[1] + 0.05], [hip[0] - 0.17 - sw * 2, hip[1] + 0.36], [hip[0] + 0.03, hip[1] + 0.3], [hip[0] + 0.04, hip[1]]]); }
    drawArm(AF);
    // torso, with chest and back
    const nrm = [-dir[1], dir[0]], at = (k, w) => [hip[0] + dir[0] * TOR * k + nrm[0] * w, hip[1] + dir[1] * TOR * k + nrm[1] * w];
    const st = (o.stoop || 0);
    curve([at(-0.02, -0.07 * bulk), at(0.35, -0.066 * bulk), at(0.72, -0.08 * bulk - st * 0.06), at(0.97, -0.07 * bulk - st * 0.05), at(1.05, -0.01), at(1.0, 0.065 * bulk), at(0.74, 0.082 * bulk), at(0.42, 0.068 * bulk), at(-0.02, 0.072 * bulk)]);
    // neck and head
    const hd = [neck[0] + dir[0] * 0.07 + Math.sin(lean + (o.tilt || 0)) * 0.02 + st * 0.03, neck[1] + dir[1] * 0.06 - 0.02];
    cap(neck, [hd[0], hd[1] + 0.03], 0.028, 0.026);
    { const q = P(hd[0], hd[1]); ctx.save(); ctx.translate(q[0], q[1]); ctx.scale(f, 1); ctx.rotate(lean * 0.5 + (o.tilt || 0)); const r = HR * h;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.92, r * 1.12, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.8, -r * 0.25); ctx.lineTo(r * 1.12, r * 0.12); ctx.lineTo(r * 0.82, r * 0.38); ctx.quadraticCurveTo(r * 0.7, r * 0.95, r * 0.15, r * 1.08); ctx.lineTo(0, r * 0.5); ctx.closePath(); ctx.fill();
      if (o.beard) { ctx.beginPath(); ctx.moveTo(r * 0.85, r * 0.45); ctx.quadraticCurveTo(r * 0.75, r * (1.6 + o.beard), r * 0.1, r * (1.75 + o.beard * 1.4)); ctx.quadraticCurveTo(-r * 0.1, r * 0.9, -r * 0.2, r * 0.5); ctx.closePath(); ctx.fill(); }
      const hat = o.hat || 'bare';
      if (hat === 'hair' || hat === 'bare') { ctx.beginPath(); ctx.ellipse(-r * 0.18, -r * 0.18, r * 1.0, r * 1.02, -0.3, 0, TAU); ctx.fill(); if (o.long) { ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.2); ctx.quadraticCurveTo(-r * 1.3, r * 1.4, -r * 0.6, r * 2.4); ctx.lineTo(-r * 0.1, r * 1.2); ctx.closePath(); ctx.fill(); } }
      if (hat === 'hood') { ctx.beginPath(); ctx.moveTo(r * 0.95, r * 0.7); ctx.quadraticCurveTo(r * 1.5, -r * 1.25, -r * 0.1, -r * 1.42); ctx.quadraticCurveTo(-r * 1.6, -r * 1.3, -r * 1.75, r * 0.2); ctx.quadraticCurveTo(-r * 2.1, r * 1.6, -r * 1.2, r * 2.2); ctx.lineTo(r * 1.0, r * 1.7); ctx.closePath(); ctx.fill(); }
      if (hat === 'kettle') { ctx.beginPath(); ctx.moveTo(-r * 1.85, -r * 0.18); ctx.quadraticCurveTo(0, -r * 0.55, r * 1.85, -r * 0.18); ctx.lineTo(r * 0.95, -r * 0.55); ctx.quadraticCurveTo(0, -r * 1.85, -r * 0.95, -r * 0.55); ctx.closePath(); ctx.fill(); }
      if (hat === 'helm') { ctx.beginPath(); ctx.moveTo(-r * 1.08, r * 0.2); ctx.quadraticCurveTo(-r * 1.15, -r * 1.3, r * 0.05, -r * 1.75); ctx.quadraticCurveTo(r * 1.15, -r * 1.3, r * 1.08, r * 0.2); ctx.closePath(); ctx.fill(); ctx.fillRect(r * 0.62, -r * 0.3, r * 0.3, r * 1.1); }
      if (hat === 'cap') { ctx.beginPath(); ctx.ellipse(-r * 0.1, -r * 0.5, r * 1.1, r * 0.75, -0.15, Math.PI, 0); ctx.fill(); }
      if (hat === 'veil') { ctx.beginPath(); ctx.moveTo(r * 0.9, -r * 0.6); ctx.quadraticCurveTo(r * 0.2, -r * 1.6, -r * 1.0, -r * 0.8); ctx.quadraticCurveTo(-r * 2.0, r * 1.2, -r * 1.6, r * 3.2); ctx.lineTo(-r * 0.2, r * 2.6); ctx.quadraticCurveTo(r * 0.3, r * 1.0, r * 0.9, -r * 0.6); ctx.closePath(); ctx.fill(); }
      ctx.restore(); }
    // near leg, the dress over the legs, then the near arm
    const nearLeg = drawLeg(legs[0]);
    const kneeY = hip[1] + TH * 0.95, hemFront = Math.max(nearLeg.K2[0], farLeg.K2[0]) + 0.06, hemBack = Math.min(nearLeg.K2[0], farLeg.K2[0], 0) - 0.07;
    const waist = at(0.42, 0);
    if (o.sit && o.dress) {   // seated: the skirts lie along the thighs and fall from the knees
      const K2 = nearLeg.K2, A2 = nearLeg.A2, long = o.dress === 'robe' || o.dress === 'gown', hy2 = long ? A2[1] - 0.01 : K2[1] + 0.13;
      curve([at(0.55, 0.078 * bulk), [K2[0] + 0.035, K2[1] - 0.045], [K2[0] + 0.065, K2[1] + 0.02], [K2[0] + 0.07, hy2], [K2[0] - 0.07, hy2 + 0.01], [K2[0] - 0.05, K2[1] + 0.04], [hip[0] - 0.02, hip[1] + 0.05], [hip[0] - 0.095, hip[1] + 0.035], [hip[0] - 0.09, hip[1] - 0.06], at(0.55, -0.08 * bulk)]);
    } else if (o.dress === 'tunic' || o.dress === 'cloak' || o.dress === 'apron' || o.dress === 'mail') {
      const hy = o.dress === 'mail' ? kneeY - 0.04 : kneeY + 0.01;
      curve([at(0.5, 0.075 * bulk), [hemFront + 0.01, hy - 0.04], [hemFront + 0.025, hy + 0.01], [(hemFront + hemBack) / 2, hy + 0.03], [hemBack - 0.025, hy + 0.01], [hemBack - 0.005, hy - 0.05], at(0.5, -0.075 * bulk)]);
    }
    if (!o.sit && (o.dress === 'robe' || o.dress === 'gown')) {
      const hy = -0.02, fr = Math.max(nearLeg.A2[0], farLeg.A2[0]) + 0.09, bk = Math.min(nearLeg.A2[0], farLeg.A2[0]) - 0.08 - (o.dress === 'robe' ? 0.03 : 0);
      curve([at(0.55, 0.076 * bulk), [fr - 0.02, kneeY], [fr + 0.025, hy - 0.01], [(fr + bk) / 2, hy + 0.015], [bk - 0.035, hy], [bk, kneeY], at(0.55, -0.08 * bulk)]);
    }
    if (o.dress === 'apron') curve([at(0.85, 0.075), [hemFront + 0.04, kneeY - 0.05], [hemFront + 0.045, kneeY + 0.04], [hemFront - 0.06, kneeY + 0.05], at(0.5, 0.05)]);
    if (o.belt !== false && o.dress !== 'robe' && o.dress !== 'gown') { const w1 = at(0.42, 0.074 * bulk), w2 = at(0.42, -0.074 * bulk); cap(w1, w2, 0.012, 0.012); }
    void waist;
    // what the near hand holds
    const hand = AN.wr, out = { head: P(hd[0], hd[1]), hand: P(hand[0], hand[1]), handF: P(AF.wr[0], AF.wr[1]) };
    const pole = (top, bot, w) => cap(top, bot, w, w);
    if (o.hold === 'spear') { pole([hand[0], hand[1] - 0.8], [hand[0], hand[1] + 0.42], 0.008); poly([[hand[0], hand[1] - 0.94], [hand[0] + 0.022, hand[1] - 0.84], [hand[0], hand[1] - 0.78], [hand[0] - 0.022, hand[1] - 0.84]]); }
    if (o.hold === 'staff') { pole([hand[0] + 0.01, hand[1] - 0.12], [hand[0] + 0.05, -0.005 - hipY * 0], 0.012); ctx.lineWidth = 0.02 * h; const q = P(hand[0] + 0.01, hand[1] - 0.12), q2 = P(hand[0] + 0.07, hand[1] - 0.2); ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.quadraticCurveTo(q[0] + f * 0.05 * h, q[1] - 0.05 * h, q2[0], q2[1]); ctx.stroke(); }
    if (o.hold === 'torch') { const top = [hand[0] + 0.03, hand[1] - 0.26]; pole(top, [hand[0] - 0.01, hand[1] + 0.08], 0.011); out.torch = P(top[0], top[1] - 0.01); }
    if (o.hold === 'hammer') { const e = [hand[0] + 0.02, hand[1] + 0.2]; pole(hand, e, 0.009); poly([[e[0] - 0.05, e[1] - 0.02], [e[0] + 0.06, e[1] - 0.02], [e[0] + 0.06, e[1] + 0.04], [e[0] - 0.05, e[1] + 0.04]]); }
    if (o.hold === 'fork') { const top = [hand[0] + 0.08, hand[1] - 0.6]; pole(top, [hand[0] - 0.05, hand[1] + 0.4], 0.008); for (const dx of [-0.03, 0, 0.03]) pole([top[0] + dx * 0.5, top[1]], [top[0] + dx, top[1] - 0.12], 0.005); pole([top[0] - 0.032, top[1]], [top[0] + 0.032, top[1]], 0.006); }
    drawArm(AN);
    ctx.restore();
    return out;
  }
  // fire(ctx, x, y, w, h, t, seed, o): a living flame standing on (x, y): tongues that lick, split and sway, an orange
  // body, a yellow heart, a white core; drawn at half size and enlarged so the edges stay soft. o.heat, o.n
  function fire(ctx, x, y, w, h, t, seed, o = {}) {
    const heat = o.heat != null ? o.heat : 1, n = o.n || 8, sc2 = o.res || 0.3, cw = Math.ceil(w * 2.4 * sc2) + 6, ch = Math.ceil(h * 1.4 * sc2) + 6;
    const L = K.layer('s7:fire' + (o.slot || ''), cw, ch), lx = L.getContext('2d');
    lx.translate(cw / 2, ch - 3); lx.scale(sc2, sc2); lx.globalCompositeOperation = 'lighter';
    const tongue = (bx, hh, ww, sway, col, a) => {
      const g = lx.createLinearGradient(0, 0, 0, -hh); g.addColorStop(0, rgbs(col, a)); g.addColorStop(0.45, rgbs(col, a * 0.8)); g.addColorStop(1, rgbs(col, 0));
      lx.fillStyle = g; lx.beginPath(); lx.moveTo(bx - ww, 0);
      lx.bezierCurveTo(bx - ww * 1.1, -hh * 0.35, bx - ww * 0.35 + sway * 0.5, -hh * 0.62, bx + sway, -hh);
      lx.bezierCurveTo(bx + ww * 0.4 + sway * 0.5, -hh * 0.6, bx + ww * 1.1, -hh * 0.33, bx + ww, 0); lx.quadraticCurveTo(bx, ww * 0.35, bx - ww, 0); lx.fill();
    };
    // a glowing bed at the base
    const bg = lx.createRadialGradient(0, -h * 0.05, 0, 0, -h * 0.05, w * 0.7); bg.addColorStop(0, rgbs([255, 170, 70], 0.7 * heat)); bg.addColorStop(1, rgbs([200, 60, 10], 0)); lx.fillStyle = bg; lx.fillRect(-w, -h * 0.5, w * 2, h * 0.6);
    for (let layer = 0; layer < 3; layer++) {
      const col = layer === 0 ? [230, 74, 18] : layer === 1 ? [255, 150, 46] : [255, 232, 170], al = (layer === 0 ? 0.55 : layer === 1 ? 0.6 : 0.8) * heat, shrink = 1 - layer * 0.3;
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n - 0.5, ph = seed * 3.3 + i * 2.17, nz = K.noise(t * 3.4 + i * 7.3, seed + layer * 0.5, 11);
        const lick = 0.5 + 0.7 * nz * (1 - Math.abs(k) * 1.1) + 0.12 * Math.sin(t * 10 + ph);
        const hh = h * lick * shrink * (1 - Math.abs(k) * 0.75), ww = w * (0.15 + 0.09 * (1 - Math.abs(k))) * shrink, sway = (K.noise(t * 2.6 + i, seed + 5, 12) - 0.5) * w * 0.7 + Math.sin(t * 7 + ph) * w * 0.05;
        tongue(k * w * 0.95 * shrink, hh, ww, sway, col, al);
      }
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(L, x - cw / sc2 / 2, y - (ch - 3) / sc2, cw / sc2, ch / sc2); ctx.restore();
  }

  // ================================================================ soldiers, as sprites (rim-lit along the top) for crowds
  const RIM_DARK = '#0a0807';
  function soldierSprites(rimHex, key) {
    return K.cached('s7:soldiers:' + key, () => {
      const Hs = 120, variants = [
        { kind: 'armour', head: 'helm', hold: 'spear' }, { kind: 'armour', head: 'kettle', hold: 'spear' }, { kind: 'cloak', head: 'helm', hold: 'none', torch: true },
        { kind: 'armour', head: 'kettle', hold: 'none' }, { kind: 'tunic', head: 'hood', hold: 'spear' }, { kind: 'cloak', head: 'kettle', hold: 'spear' },
      ];
      return variants.map((v, vi) => {
        const ph = [];
        for (let k = 0; k < 8; k++) {
          const c = K.canvas(Hs * 0.95, Hs * 1.62), x = c.getContext('2d'), fx = c.width * 0.42, fy = Hs * 1.56;
          const o = Object.assign({}, v, { walk: k / 8 * TAU, face: 1, t: 0 }); if (v.torch) Object.assign(o, { arm: 0.32, bend: 1.25 });
          const body = (fill, dy) => { K.figure(x, fx, fy + dy, Hs, Object.assign({}, o, { fill })); if (v.torch) { x.fillStyle = fill; x.fillRect(fx + 0.285 * Hs, fy + dy - 0.92 * Hs, 0.022 * Hs, 0.42 * Hs); } };
          body(rimHex, 0); x.globalCompositeOperation = 'source-atop'; body('#2a1810', 1.4); body(RIM_DARK, 3.0);
          ph.push(c);
        }
        return { ph, fx: Hs * 0.42, fy: Hs * 1.56, Hs, torch: !!v.torch, spear: v.hold === 'spear' };
      });
    });
  }
  function horseSprites(rimHex, key) {
    return K.cached('s7:horses:' + key, () => {
      const Hs = 110, ph = [];
      for (let k = 0; k < 8; k++) {
        const c = K.canvas(Hs * 2.1, Hs * 2.7), x = c.getContext('2d'), fx = Hs * 0.9, fy = Hs * 2.6;
        const o = { walk: k / 8 * TAU, face: 1, rider: { kind: 'armour', head: 'helm', hold: 'spear' } };
        K.horse(x, fx, fy, Hs, Object.assign({}, o, { fill: rimHex })); x.globalCompositeOperation = 'source-atop';
        K.horse(x, fx, fy + 1.4, Hs, Object.assign({}, o, { fill: '#2a1810' })); K.horse(x, fx, fy + 3.0, Hs, Object.assign({}, o, { fill: RIM_DARK }));
        ph.push(c);
      }
      return { ph, fx: Hs * 0.9, fy: Hs * 2.6, Hs };
    });
  }
  // a house banner on a pole, lit from below by torchlight: drawn offscreen, multiplied by the light, then placed
  function poleBanner(ctx, x, y, h, house, t, seed, light) {
    const bw = Math.min(150, h * 0.36), bh = bw / 0.36 * 0.56, top = y - h, cw = 240, ch = 300;
    const B = K.layer('s7:pbB', cw, ch), bx = B.getContext('2d');
    K.banner(bx, cw / 2, 6, bw, bh, house, t * 1.3 + seed, { wind: 0.9, seed, key: 'pb' + house.key });
    const A = K.layer('s7:pbA', cw, ch), ax = A.getContext('2d'); ax.drawImage(B, 0, 0);
    ax.globalCompositeOperation = 'multiply';
    const g = ax.createLinearGradient(0, 6, 0, 6 + bh * 1.05); g.addColorStop(0, 'rgb(34,34,44)'); g.addColorStop(0.5, 'rgb(70,50,42)'); g.addColorStop(1, `rgb(${170 * light | 0},${100 * light | 0},${60 * light | 0})`);
    ax.fillStyle = g; ax.fillRect(0, 0, cw, ch);
    ax.globalCompositeOperation = 'destination-in'; ax.drawImage(B, 0, 0);
    ctx.save(); ctx.fillStyle = RIM_DARK; ctx.fillRect(x - Math.max(1, h * 0.007), top - h * 0.03, Math.max(2, h * 0.014), h);
    ctx.drawImage(A, 0, 0, cw, Math.ceil(bh * 1.1) + 12, x - cw / 2, top - 6, cw, Math.ceil(bh * 1.1) + 12); ctx.restore();
  }

  // ================================================================ the last page of the chronicle, and its burning
  function s6Frame() {
    return K.cached('s7:s6', () => {
      const c = K.canvas(W, H), x = c.getContext('2d'), sc = K.scene(6), m = SCENES[6];
      x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
      let ok = false;
      if (m && m.draw) { try { x.save(); m.draw(x, sc.end - 0.05, sc); x.restore(); ok = true; } catch (e) { ok = false; } }
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none';
      if (!ok) {   // the stand-in intro.js draws for a scene not yet written, so the cut is seamless either way
        x.fillStyle = '#1a1410'; x.fillRect(0, 0, W, H);
        K.text(x, `SCENE ${sc.n}`, W / 2, H / 2 - 30, '500 28px Cinzel', P.gold, 10, 'center', 0.8);
        K.text(x, sc.name, W / 2, H / 2 + 24, 'italic 400 40px "EB Garamond"', P.bone, 1, 'center', 0.8);
      }
      return c;
    });
  }
  const BW = 960, BH = 540;
  function burnField() {
    return K.cached('s7:burnF', () => {
      const r = rng(7707), seeds = [];
      for (let i = 0; i < 30; i++) {
        const side = i % 4, u = 0.04 + r() * 0.92;
        const s = side === 0 ? { x: u, y: -0.02 } : side === 1 ? { x: 1.02, y: u } : side === 2 ? { x: u, y: 1.02 } : { x: -0.02, y: u };
        s.d = r() * 0.1 + (side % 2 === 0 ? 0.13 : 0); seeds.push(s);   // the long edges are nearer the middle: hold them back
      }
      for (const [cx, cy, d] of [[0, 0, 0], [1, 1, 0.02], [1, 0, 0.05], [0, 1, 0.04]]) seeds.push({ x: cx, y: cy, d });
      const F = K.field(BW, BH, seeds, 77, { warp: 0.3, scale: 2.4, grain: 0.05 });
      // a ragged, fibrous edge: fine noise on the arrival times
      for (let j = 0; j < BH; j++) for (let i = 0; i < BW; i++) { const k = j * BW + i; F.f[k] += 0.022 * (K.fbm(i / 9, j / 9, 3, 91) - 0.5) + 0.009 * (K.noise(i / 2.1, j / 2.1, 93) - 0.5); }
      // spark and smoke sources: cells with the time the front reaches them
      const R = rng(4711), src = [];
      for (let i = 0; i < 2400; i++) { const gx = Math.floor(R() * BW), gy = Math.floor(R() * BH); src.push({ x: (gx + 0.5) / BW * W, y: (gy + 0.5) / BH * H, f: F.f[gy * BW + gx], r: R(), r2: R(), r3: R() }); }
      F.src = src; return F;
    });
  }
  // hot and dull stretches along the ember line: an alpha-noise canvas a little larger than the field, drifted slowly
  function emberNoise() {
    return K.cached('s7:emberN', () => {
      const w = 380, h = 220, c = K.canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = K.fbm(i / 6, j / 6, 4, 5), k = (j * w + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = 255 * clamp(0.1 + Math.pow(clamp((v - 0.32) * 2.3), 1.5) * 1.15); }
      x.putImageData(img, 0, 0); return c;
    });
  }
  // the front's progress over the burn, and its inverse (when the front reaches arrival f)
  const BURN = { a: 0.3, b: 3.35, e: 1.4 };
  function burnP(t, sc) { return lerp(-0.05, 1.06, Math.pow(span(t, sc.start + BURN.a, sc.start + BURN.b), BURN.e)); }
  function burnT(f, sc) { const a = sc.start + BURN.a, b = sc.start + BURN.b; return a + (b - a) * Math.pow(clamp((f + 0.05) / 1.11), 1 / BURN.e); }
  function drawBurn(ctx, t, sc) {
    const p = burnP(t, sc); if (p > 1.06) return;
    const F = burnField(), page = s6Frame();
    // the page: heat-browned ahead of the front, charred black at it, gone behind it
    const L = K.layer('s7:page'), lx = L.getContext('2d');
    lx.drawImage(page, 0, 0);
    lx.imageSmoothingEnabled = true; lx.imageSmoothingQuality = 'high';
    if (p > -0.05) {
      const m1 = K.mask(F, p + 0.14, 0.14); lx.globalCompositeOperation = 'source-atop'; lx.globalAlpha = 0.5;
      lx.drawImage(tintMask(m1, [112, 48, 16]), 0, 0, W, H);
      const m2 = K.mask(F, p + 0.022, 0.022); lx.globalAlpha = 0.92; lx.drawImage(m2, 0, 0, W, H);
      const m3 = K.mask(F, p, 0.003); lx.globalCompositeOperation = 'destination-out'; lx.globalAlpha = 1; lx.drawImage(m3, 0, 0, W, H);
    }
    ctx.drawImage(L, 0, 0);
    if (p <= -0.05) return;
    // the ember line along the paper's edge: broken into hot and dull stretches, a thin white-hot core, a low red glow
    const rm = K.rim(F, p + 0.008, 0.008, 0.002);
    const G = K.layer('s7:rimg', BW, BH), gx = G.getContext('2d'); gx.drawImage(rm, 0, 0);
    const en = emberNoise(), lt0 = t - sc.start, EW = BW * 380 / 320, EH = BH * 220 / 180;
    gx.globalCompositeOperation = 'destination-in'; gx.drawImage(en, -lt0 * 24, -lt0 * 10, EW, EH);
    gx.globalCompositeOperation = 'source-in'; gx.fillStyle = 'rgb(255,150,60)'; gx.fillRect(0, 0, BW, BH);
    const Q = K.layer('s7:rimq', BW / 6, BH / 6), qx = Q.getContext('2d'); qx.drawImage(G, 0, 0, BW / 6, BH / 6);
    const Q2 = K.layer('s7:rimq2', BW / 16, BH / 16), q2 = Q2.getContext('2d'); q2.drawImage(Q, 0, 0, BW / 16, BH / 16);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'medium';
    ctx.globalAlpha = 0.55; ctx.drawImage(tintMask(Q2, [200, 60, 20]), 0, 0, W, H); ctx.globalAlpha = 0.5; ctx.drawImage(Q, 0, 0, W, H);
    ctx.globalAlpha = 1; ctx.drawImage(G, 0, 0, W, H);
    const rm2 = K.rim(F, p + 0.0025, 0.0025, 0.0015); gx.globalCompositeOperation = 'copy'; gx.drawImage(rm2, 0, 0);
    gx.globalCompositeOperation = 'destination-in'; gx.drawImage(en, -(EW - BW) + lt0 * 30, -lt0 * 14, EW, EH);
    gx.globalCompositeOperation = 'source-in'; gx.fillStyle = 'rgb(255,232,180)'; gx.fillRect(0, 0, BW, BH);
    ctx.globalAlpha = 0.9; ctx.drawImage(G, 0, 0, W, H);
    ctx.restore();
    // smoke curling up from the front (lit from beneath), sparks and flakes of char lifting off it
    const src = F.src;
    ctx.save();
    const puff = tinted(K.puff(), [96, 78, 66], 'puffLit');
    for (let i = 0; i < src.length; i += 8) {
      const s = src[i], tb = burnT(s.f, sc), age = t - tb, life = 2.4 + s.r * 1.8; if (age < 0 || age > life) continue;
      const k = age / life, sz = (70 + s.r2 * 110) * (0.35 + k * 1.5), px = s.x + Math.sin(age * 1.3 + s.r * 9) * 26 * k + age * 14, py = s.y - age * (46 + s.r3 * 60) - k * k * 40;
      ctx.globalAlpha = 0.16 * Math.sin(Math.PI * Math.pow(k, 0.55)) * (0.6 + s.r * 0.4);
      ctx.save(); ctx.translate(px, py); ctx.rotate(s.r * TAU + age * (s.r2 - 0.5) * 0.8); ctx.drawImage(puff, -sz / 2, -sz / 2, sz, sz); ctx.restore();
    }
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < src.length; i += 3) {
      const s = src[i], tb = burnT(s.f, sc), age = t - tb, life = 0.5 + s.r * 1.4; if (age < 0 || age > life) continue;
      const k = age / life, vx = (s.r2 - 0.5) * 110 + 30, vy = 80 + s.r3 * 200, px = s.x + vx * age + Math.sin(age * 7 + s.r * 20) * 6, py = s.y - vy * age + 30 * age * age;
      const a = (1 - k) * (0.5 + 0.5 * Math.sin(t * 37 + s.r * 50)), dvx = vx, dvy = -vy + 60 * age, dl = 0.022;
      ctx.strokeStyle = `rgba(255,${170 + (s.r3 * 70 | 0)},${90 + (s.r2 * 60 | 0)},${clamp(a)})`; ctx.lineWidth = 1 + s.r2 * 1.4;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - dvx * dl, py - dvy * dl); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 1; i < src.length; i += 16) {      // flakes of char that lift and turn, their edges still glowing
      const s = src[i], tb = burnT(s.f, sc), age = t - tb, life = 1.6 + s.r * 1.6; if (age < 0 || age > life) continue;
      const k = age / life, px = s.x + (s.r2 - 0.4) * 80 * age + Math.sin(age * 3 + s.r * 9) * 16, py = s.y - (40 + s.r3 * 80) * age, sz = 2 + s.r * 5, rot = age * (2 + s.r2 * 5) + s.r * 9;
      ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.scale(1, Math.abs(Math.cos(age * 4 + s.r * 7)) * 0.8 + 0.2);
      ctx.globalAlpha = (1 - k) * 0.85; ctx.fillStyle = '#0e0a08'; ctx.beginPath();
      for (let q = 0; q < 6; q++) { const an = q / 6 * TAU, rr = sz * (0.5 + 0.5 * K.hash(i, q, 3)); q ? ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : ctx.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); }
      ctx.closePath(); ctx.fill();
      if (k < 0.5) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (0.5 - k) * 0.7; ctx.strokeStyle = 'rgba(255,120,40,1)'; ctx.lineWidth = 0.8; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
      ctx.restore();
    }
    ctx.restore();
  }
  function tintMask(m, rgb) {
    const T = K.layer('s7:tm' + m.width, m.width, m.height), x = T.getContext('2d');
    x.drawImage(m, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = `rgb(${rgb})`; x.fillRect(0, 0, m.width, m.height); return T;
  }

  // ================================================================ L43: the Seven muster on a hillside in the rain
  // the road the column climbs: a switchback up the face of the hill. Positions go by ground distance g, so the pace and
  // spacing shrink with distance; hAt(y) is a man's height at screen height y (the hill falls away below the horizon)
  const M_HOR = 300, hAt = y => 0.2 * (y - M_HOR);
  const MROAD = (() => {
    const pts = K.bez([[-240, 1260], [150, 1060], [250, 870], [620, 835], [1000, 805], [1270, 735], [1090, 690], [900, 652], [760, 612], [905, 580], [1110, 548], [1450, 500], [1760, 452], [1860, 438], [1960, 430], [2120, 424]], 40);
    const tab = [{ g: 0, x: pts[0][0], y: pts[0][1] }]; let g = 0;
    for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i]; g += Math.hypot(bx - ax, by - ay) / hAt((ay + by) / 2); tab.push({ g, x: bx, y: by }); }
    return { tab, G: g };
  })();
  function roadAt(g) {
    const T = MROAD.tab; let lo = 0, hi = T.length - 1; g = clamp(g, 0, MROAD.G);
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m].g < g) lo = m; else hi = m; }
    const a = T[lo], b = T[hi], f = (g - a.g) / ((b.g - a.g) || 1);
    return [lerp(a.x, b.x, f), lerp(a.y, b.y, f), b.x - a.x, b.y - a.y];
  }
  const HILL_SKY = x => 655 - 220 * smooth(clamp(x / 1750)) + 18 * Math.sin(x * 0.006);
  const TENTS = (() => { const r = rng(808), out = []; for (let i = 0; i < 18; i++) { const x = 1180 + r() * 800, y = 800 + r() * 260; out.push({ x, y, h: hAt(y) * (0.55 + r() * 0.25), sd: r() * 100, lit: 0.3 + r() * 0.7 }); } return out.sort((a, b) => a.y - b.y); })();
  const FIRES = [[1330, 905, 0.9], [1640, 860, 0.7], [1530, 990, 1.0], [1830, 950, 0.8]];
  function musterStatic() {
    return K.cached('s7:musterStatic', () => {
      const far = K.canvas(W + 300, 760), fx = far.getContext('2d');
      const m1 = ridge(0, W + 300, x => 470 - 60 * Math.sin(x * 0.0021 + 1.2), 31, 120, 0.0032, 4, 6);
      const g1 = fx.createLinearGradient(0, 330, 0, 760); g1.addColorStop(0, '#1a1c24'); g1.addColorStop(0.45, '#271f22'); g1.addColorStop(1, '#4e2c1d');
      fillRidge(fx, m1, 760, g1);
      const m2 = ridge(0, W + 300, x => 575 - 30 * Math.sin(x * 0.003 + 0.4), 32, 50, 0.004, 4, 5);
      const g2 = fx.createLinearGradient(0, 480, 0, 760); g2.addColorStop(0, '#141418'); g2.addColorStop(1, '#3c2119');
      fillRidge(fx, m2, 760, g2);
      // the hill: a dark face rising to the crest on the right; the road glows faintly where the torches pass
      const hill = K.canvas(W + 400, H + 300), hx = hill.getContext('2d'), OX = 200, OY = 150;
      const hr = ridge(-OX, W + 200, HILL_SKY, 33, 16, 0.008, 4, 5).map(p => [p[0] + OX, p[1] + OY]);
      const g3 = hx.createLinearGradient(0, 420 + OY, 0, H + OY); g3.addColorStop(0, '#0e0c0c'); g3.addColorStop(0.4, '#0b0a0a'); g3.addColorStop(1, '#070606');
      fillRidge(hx, hr, H + 300, g3);
      hx.save(); hx.globalCompositeOperation = 'source-atop';
      for (let i = 0; i <= 260; i++) { const [x, y] = roadAt(i / 260 * MROAD.G), h = hAt(y); glow(hx, [120, 52, 20], x + OX, y + OY + h * 0.05, h * 1.5, 0.2); }
      for (let i = 0; i <= 260; i++) { const [x, y] = roadAt(i / 260 * MROAD.G), h = hAt(y); glow(hx, [190, 100, 50], x + OX, y + OY + h * 0.06, h * 0.55, 0.16); }
      // tents on the lower slope: dark canvas, warm where the lamp inside shows through, a bright slit of a door
      for (const tn of TENTS) {
        const x = tn.x + OX, y = tn.y + OY, h = tn.h, w = h * 1.3, L2 = tn.lit;
        const path = () => { hx.beginPath(); hx.moveTo(x - w / 2, y); hx.quadraticCurveTo(x - w * 0.16, y - h * 0.62, x, y - h); hx.quadraticCurveTo(x + w * 0.16, y - h * 0.62, x + w / 2, y); hx.closePath(); };
        path(); hx.fillStyle = '#120b08'; hx.fill();
        hx.save(); path(); hx.clip();
        const g = hx.createRadialGradient(x, y - h * 0.1, 0, x, y - h * 0.25, h * 0.85);
        g.addColorStop(0, `rgba(200,110,48,${0.75 * L2})`); g.addColorStop(0.45, `rgba(120,58,24,${0.45 * L2})`); g.addColorStop(1, 'rgba(40,20,10,0)');
        hx.fillStyle = g; hx.fillRect(x - w, y - h * 1.2, w * 2, h * 1.3);
        hx.fillStyle = 'rgba(6,4,3,0.55)'; hx.fillRect(x - w, y - h * 1.2, w * 0.92, h * 1.3);
        hx.restore();
        hx.fillStyle = `rgba(255,${170 + 40 * L2 | 0},${90 + 40 * L2 | 0},${0.55 + 0.4 * L2})`; hx.beginPath(); hx.moveTo(x + w * 0.02, y); hx.lineTo(x + w * 0.05, y - h * 0.42); hx.lineTo(x + w * 0.12, y); hx.closePath(); hx.fill();
        hx.strokeStyle = '#070504'; hx.lineWidth = Math.max(1, h * 0.03); hx.beginPath(); hx.moveTo(x, y - h * 0.98); hx.lineTo(x, y - h * 1.2); hx.stroke();
      }
      // wet grass and stones, picked out where the light falls
      const r = rng(55);
      for (let i = 0; i < 3200; i++) { const x = r() * (W + 400), y = 420 + OY + r() * (H - 300), l = (3 + r() * 10) * (y - OY - M_HOR) / 400; hx.strokeStyle = `rgba(${r() < 0.55 ? '0,0,0' : '90,52,30'},${0.14 + r() * 0.22})`; hx.lineWidth = 1; hx.beginPath(); hx.moveTo(x, y); hx.lineTo(x + (r() - 0.5) * 4, y - l); hx.stroke(); }
      hx.restore();
      return { far, hill, OX, OY };
    });
  }
  function shotMuster(ctx, t, sh) {
    const u = span(t, sh.a, sh.b), lt = t - sh.a;
    const [sx, sy] = K.shake(t * 0.6, 2.5, 43);
    const c = { x: lerp(-70, 40, ease(u)) + sx, y: lerp(30, -15, ease(u)) + sy, z: lerp(1.02, 1.12, ease(u)), r: -0.006 + 0.004 * u };
    const S = musterStatic();
    ctx.save();
    // sky: storm clouds lit from beneath by the fires of the camps
    const sk = sky('muster', 480, 270, { top: [5, 7, 11], mid: [12, 13, 18], low: [40, 22, 16], glow: [170, 70, 28], glowY: 1.0, glowR: 0.8, cloud: [9, 10, 13], moon: [30, 38, 52], cover: 0.6, seed: 4 });
    view(ctx, c, 0.06); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(sk, -140 - lt * 7, -80, W + 380, 800);
    // lightning, far off inside the clouds
    const lt2 = lt - 3.3, lf = lt2 > 0 ? Math.max(0, Math.sin(lt2 * 40)) * Math.exp(-lt2 * 5) : 0;
    if (lf > 0) glow(ctx, [150, 160, 200], 1450, 160, 700, lf * 0.3);
    // far mountains with the camps' fires and smoke
    view(ctx, c, 0.16); ctx.drawImage(S.far, -150, 0);
    const r = rng(431);
    for (let i = 0; i < 16; i++) { const x = r() * W, y = 590 + r() * 120, s = 0.5 + r(); glow(ctx, [220, 100, 40], x, y, 30 * s, 0.32 * flick(t, i)); glow(ctx, [255, 200, 120], x, y, 4 * s, 0.8); }
    K.smoke(ctx, t, { n: 8, x: 0, y: 420, w: W, h: 260, color: [70, 40, 30], alpha: 0.14, rise: 6, size: 260, seed: 47 });
    // columns of torches winding over the far hills: other houses on the march
    for (let k = 0; k < 3; k++) {
      const rr = rng(900 + k), n = 80, x0 = 60 + k * 470 + rr() * 80, y0 = 560 + rr() * 50;
      for (let i = 0; i < n; i++) {
        const s = ((i / n + lt * 0.005 * (k % 2 ? 1 : -1)) % 1 + 1) % 1, x = x0 + s * 380 + Math.sin(s * 9 + k) * 40, y = y0 + s * 80 + Math.sin(s * 5 + k * 2) * 18;
        const fl = flick(t, i + k * 100, 11); glow(ctx, [255, 140, 60], x, y, 8, 0.45 * fl); ctx.fillStyle = `rgba(255,220,160,${0.75 * fl})`; ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
      }
    }
    view(ctx, c, 0.25); fog(ctx, 3, [74, 42, 30], 560, 150, lt * 14, 0.4);
    // the hill, its tents and its column
    view(ctx, c, 0.6); ctx.drawImage(S.hill, -S.OX, -S.OY);
    for (const tn of TENTS) glow(ctx, [230, 120, 50], tn.x, tn.y - tn.h * 0.25, tn.h * 1.2, 0.07 * tn.lit * flick(t, tn.sd, 6));
    for (const [fx0, fy0, k] of FIRES) {
      const h = hAt(fy0), fl = flick(t, fx0, 8);
      glow(ctx, [230, 100, 36], fx0, fy0 - h * 0.1, h * 2.6 * k, 0.2 * fl); flame(ctx, fx0, fy0, h * 0.42 * k * fl, t, fx0); flame(ctx, fx0 + h * 0.1, fy0, h * 0.3 * k * fl, t + 0.3, fx0 + 1);
      for (let q = 0; q < 3; q++) K.figure(ctx, fx0 + (q - 1) * h * 0.55 + h * 0.1, fy0 + h * 0.06 * (q % 2), h * (0.85 + 0.1 * q), { kind: q === 1 ? 'cloak' : 'armour', head: q === 2 ? 'hood' : 'kettle', hold: q === 0 ? 'spear' : 'none', face: q === 2 ? -1 : 1, fill: '#080605' });
    }
    const SP = soldierSprites('#d98a52', 'muster'), HS = horseSprites('#d98a52', 'muster');
    const items = [], torches = [];
    const rows = 120, spd = 0.55, gap = MROAD.G / rows;
    for (let i = 0; i < rows; i++) {
      const g = ((i * gap + lt * spd) % MROAD.G + MROAD.G) % MROAD.G, [x, y, dx, dy] = roadAt(g), h = hAt(y);
      if (y > 1300 || x > 2050) continue;
      const rr = rng(i * 13 + 5), wide = 4 + (i % 3), dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl, face = dx >= 0 ? 1 : -1;
      for (let j = 0; j < wide; j++) {
        const lat = (j - (wide - 1) / 2) * 0.42 * h, px = x + nx * lat * 1.6 + (rr() - 0.5) * h * 0.15, py = y + ny * lat * 0.35 + (rr() - 0.5) * h * 0.05, ph = hAt(py);
        const horse = i % 13 === 4 && j === 1, v = Math.floor(rr() * SP.length);
        items.push({ y: py, x: px, h: ph * (0.92 + rr() * 0.14), v, horse, face, ph: lt * 6 + rr() * 8 });
        if (!horse && SP[v].torch) torches.push({ x: px + 0.3 * ph * face, y: py - 0.96 * ph, h: ph, i: i * 7 + j });
      }
      if (i % 7 === 3) items.push({ y: y + 0.5, x: x + h * 0.3, h: h * 2.4, banner: K.HOUSES[[0, 3, 6, 5, 2, 0, 1, 4][(i / 7 | 0) % 8]], i });
    }
    items.sort((a, b) => a.y - b.y);
    for (const p of items) {
      if (p.banner) { poleBanner(ctx, p.x, p.y, p.h, p.banner, t, p.i, 0.9); continue; }
      const fr = Math.floor(((p.ph / TAU) % 1 + 1) % 1 * 8);
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.face, 1);
      if (p.horse) { const spr = HS.ph[fr], k = p.h * 0.62 / HS.Hs; ctx.drawImage(spr, -HS.fx * k, -HS.fy * k, spr.width * k, spr.height * k); }
      else { const S2 = SP[p.v], spr = S2.ph[fr], k = p.h / S2.Hs; ctx.drawImage(spr, -S2.fx * k, -S2.fy * k, spr.width * k, spr.height * k); }
      ctx.restore();
    }
    for (const o of torches) { const fl = flick(t, o.i); glow(ctx, [240, 110, 40], o.x, o.y, o.h * 1.5, 0.14 * fl); glow(ctx, [255, 190, 110], o.x, o.y, o.h * 0.32, 0.5 * fl); flame(ctx, o.x, o.y + o.h * 0.04, o.h * 0.16 * fl, t, o.i); }
    // the torches' smoke and the rain's haze, lit from beneath along the column
    for (let i = 0; i < 26; i++) { const [x, y] = roadAt((i + 0.5) / 26 * MROAD.G * 0.86), h = hAt(y); glow(ctx, [150, 66, 26], x, y - h * 1.1, h * 2.4, 0.09); }
    view(ctx, c, 0.7); K.smoke(ctx, t, { n: 12, x: 300, y: 420, w: 1500, h: 420, color: [88, 50, 32], alpha: 0.14, rise: 8, size: 340, seed: 43 });
    fog(ctx, 9, [60, 34, 24], 700, 260, -lt * 20, 0.3, -200, W + 400);
    // the near foreground: the lip of the slope and its wet grass, very dark
    view(ctx, c, 1.5);
    const fr2 = ridge(-300, W + 300, x => 1030 + 40 * Math.sin(x * 0.003 + 1), 61, 26, 0.01, 6, 4);
    fillRidge(ctx, fr2, H + 300, '#030202');
    const gr = rng(62); ctx.strokeStyle = '#040303'; ctx.lineCap = 'round';
    for (let i = 0; i < 200; i++) { const x = -300 + gr() * (W + 600), y = 1030 + 40 * Math.sin(x * 0.003 + 1) + gr() * 24, l = 30 + gr() * 80, sw = Math.sin(t * 1.6 + x * 0.01) * 12; ctx.lineWidth = 2 + gr() * 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw * 0.4, y - l * 0.6, x + sw + (gr() - 0.5) * 24, y - l); ctx.stroke(); }
    // two sentinels close to the lens, out of focus, watching the column pass: drawn small and enlarged (a soft blur)
    {
      const Q = K.layer('s7:fgq', W / 5, H / 5), qx = Q.getContext('2d'), q = proj(c, 1.9, 0, 0);
      qx.setTransform(q[2] / 5, 0, 0, q[2] / 5, q[0] / 5, q[1] / 5);
      const fl = flick(t, 5, 7), wob = Math.sin(t * 0.7) * 6;
      rimLit(qx, (cc, fill) => {
        K.figure(cc, 1660 + wob, 1500, 1080, { kind: 'cloak', head: 'helm', hold: 'spear', face: -1, fill });
        K.figure(cc, 1930 - wob * 0.5, 1560, 1120, { kind: 'armour', head: 'kettle', hold: 'none', face: -1, fill, arm: 0.1 });
      }, { rim: `rgb(${200 * fl | 0},${110 * fl | 0},${56 * fl | 0})`, mid: '#3a1c10', dark: '#030202', dx: 2.2, dy: 0.6 });
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(Q, 0, 0, W, H); ctx.restore();
    }
    // rain over everything, warmed near the torches
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const lights = torches.filter(o => o.h > 50).slice(0, 10).map(o => { const q = proj(c, 0.6, o.x, o.y); return { x: q[0], y: q[1], r: o.h * 2.4, rgb: [255, 170, 100], a: 1 }; });
    rain(ctx, t, { n: 420, angle: 0.2, speed: 1500, len: 52, alpha: 0.17, lights, seed: 431 });
    ctx.restore();
    finish(ctx, { bloom: 0.32, shadow: '#1d3040', shadowA: 0.3, vig: 0.7 });
  }

  // ================================================================ the First-Born: a wyvern built in 3D and projected
  // local frame: x forward (head), y to the right wing, z up. wyvern(ctx, o): o.x, o.y screen position, o.s scale (px per
  // unit; wingspan is about 3.3 units), o.yaw heading, o.bank roll, o.el view elevation (0 side-on, PI/2 from straight
  // below), o.flap -1..1 (up), o.t (neck and tail sway), o.fill, o.lit (lightning behind: membranes glow dull)
  const WY = (() => {
    const q = (a, c, b, n = 7) => { const out = []; for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } return out; };
    const wing = [[0.24, 0.08], [0.4, 0.5], [0.16, 1.0], [-0.04, 1.7], ...q([-0.04, 1.7], [-0.26, 1.42], [-0.52, 1.38]), ...q([-0.52, 1.38], [-0.5, 1.06], [-0.7, 0.9]), ...q([-0.7, 0.9], [-0.46, 0.56], [-0.5, 0.12])];
    const bones = [[[0.24, 0.08], [0.4, 0.5], [0.16, 1.0]], [[0.16, 1.0], [-0.04, 1.7]], [[0.16, 1.0], [-0.52, 1.38]], [[0.16, 1.0], [-0.7, 0.9]]];
    return { wing, bones };
  })();
  function wyvern(ctx, o) {
    const s = o.s, ce = Math.cos(o.el), se = Math.sin(o.el), cb = Math.cos(o.bank || 0), sb = Math.sin(o.bank || 0), cy = Math.cos(o.yaw), sy = Math.sin(o.yaw), t = o.t || 0;
    const P = (lx, ly, lz) => { const y1 = ly * cb - lz * sb, z1 = ly * sb + lz * cb, X = lx * cy - y1 * sy, Y = lx * sy + y1 * cy; return [o.x + X * s, o.y + (Y * se - z1 * ce) * s]; };
    const fl = o.flap || 0, wa = fl * 0.75, fold = 1 - 0.18 * Math.max(0, fl);
    const wingPt = (p, side) => { const y = p[1] * (p[1] > 0.6 ? fold : 1), z = Math.abs(y) * Math.sin(wa) * 0.9; return P(p[0] - 0.06 * fl * (p[1] > 0.6 ? 1 : 0), side * y * Math.cos(wa), z); };
    ctx.save(); ctx.fillStyle = o.fill || '#050506'; ctx.strokeStyle = o.fill || '#050506'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // the body: a spine with a width profile, the neck and tail swaying
    const spine = [], N = 34;
    for (let i = 0; i <= N; i++) { const u = i / N, x = lerp(1.26, -1.62, u); const sw = (u < 0.3 ? Math.sin(t * 1.6 + u * 6) * 0.06 * (0.3 - u) / 0.3 : 0) + (u > 0.45 ? Math.sin(t * 1.9 - u * 7) * 0.14 * Math.pow((u - 0.45) / 0.55, 1.5) : 0); spine.push([x, sw]); }
    const wid = x => x > 1.1 ? 0.075 * (1.26 - x) / 0.16 + 0.015 : x > 0.96 ? 0.085 : x > 0.32 ? lerp(0.1, 0.06, (x - 0.32) / 0.64) : x > -0.46 ? 0.1 + 0.11 * Math.sin((x + 0.46) / 0.78 * Math.PI) : 0.1 * Math.pow(Math.max(0, (x + 1.62) / 1.16), 1.3) + 0.01;
    const L = [], R = [];
    for (let i = 0; i <= N; i++) { const [x, y] = spine[i], w = wid(x); L.push(P(x, y - w, 0)); R.push(P(x, y + w, 0)); }
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (const p of L) ctx.lineTo(p[0], p[1]); for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath(); ctx.fill();
    // horns, a tail spade, legs drawn up with talons
    const hx = spine[2][0], hy = spine[2][1];
    for (const sd of [-1, 1]) { const a = P(hx - 0.04, hy + sd * 0.06, 0.02), b = P(hx - 0.3, hy + sd * 0.16, 0.08), c2 = P(hx - 0.12, hy + sd * 0.03, 0.02); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c2[0], c2[1]); ctx.closePath(); ctx.fill(); }
    const tt = spine[N]; { const pts = [[tt[0] - 0.02, tt[1]], [tt[0] + 0.12, tt[1] - 0.09], [tt[0] + 0.2, tt[1]], [tt[0] + 0.12, tt[1] + 0.09]].map(p => P(p[0], p[1], 0)); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill(); }
    for (const sd of [-1, 1]) { const a = P(-0.3, sd * 0.14, -0.02), b = P(-0.52, sd * 0.18, -0.1), c2 = P(-0.66, sd * 0.15, -0.08); ctx.lineWidth = Math.max(1, s * 0.07); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c2[0], c2[1]); ctx.stroke(); }
    // the wings: membrane, then the bones over it
    for (const sd of [-1, 1]) {
      const pts = WY.wing.map(p => wingPt(p, sd));
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill();
      if (o.lit > 0.02) { ctx.save(); ctx.clip(); ctx.globalAlpha = o.lit; ctx.fillStyle = o.litFill || 'rgba(70,40,46,1)'; ctx.fill(); ctx.restore(); }
      ctx.lineWidth = Math.max(1, s * 0.045);
      for (const bn of WY.bones) { const q2 = bn.map(p => wingPt(p, sd)); ctx.beginPath(); ctx.moveTo(q2[0][0], q2[0][1]); for (const p of q2) ctx.lineTo(p[0], p[1]); ctx.stroke(); ctx.lineWidth = Math.max(0.8, s * 0.025); }
    }
    ctx.restore();
  }

  // ================================================================ L44: the First-Born wheel over the heights in a storm
  const PEAK = { x: 1240, y: 230 };
  // storm peaks painted per pixel at half size: ridged rock lit from one side, snow on the high gentle faces, mist below.
  // Two lightings are kept: the dim night (moon-grey from the upper left) and the flash (blue-white from the upper right)
  function peaksImg() {
    return K.cached('s7:peaks', () => {
      const w = 1160, h = 640, S2 = 2, base = K.canvas(w, h), flash = K.canvas(w, h), bx = base.getContext('2d'), fx = flash.getContext('2d');
      const bi = bx.createImageData(w, h), fi = fx.createImageData(w, h);
      const cx = (PEAK.x + 200) / S2;
      const ranges = [
        { top: x => 300 - 70 * Math.sin(x * 0.006 + 2.2) - 40 * (K.fbm(x * 0.012, 1, 5, 81) - 0.5) * 2, sd: 82, fog: 0.55, k: 0.8 },
        { top: x => { const d = (x - cx) / 270; return PEAK.y / S2 + 300 * Math.pow(Math.abs(d), 0.85) + (d > 0 ? 30 * d : -12 * d) + 34 * (K.fbm(x * 0.02, 3.3, 5, 74) - 0.5) + 10 * (K.fbm(x * 0.09, 1.1, 3, 75) - 0.5); }, sd: 84, fog: 0.15, k: 1 },
        { top: x => 470 - 50 * Math.sin(x * 0.008 + 0.6) - 50 * (K.fbm(x * 0.015, 2, 5, 85) - 0.5) * 2, sd: 86, fog: 0.05, k: 1.1 },
      ];
      const tops = ranges.map(R => { const a = new Float32Array(w); for (let i = 0; i < w; i++) a[i] = R.top(i); return a; });
      // fluted faces: ridged noise stretched along the fall line, which leans with the slope of the skyline
      const rid = (u, v, sd) => { let val = 0, amp = 1, fu = 1 / 34, fv = 1 / 110; for (let o = 0; o < 3; o++) { const n = 1 - Math.abs(K.noise(u * fu, v * fv, sd + o) * 2 - 1); val += n * n * amp; amp *= 0.5; fu *= 2.0; fv *= 2.0; } return val / 1.75 + 0.12 * (K.fbm(u / 9, v / 9, 2, sd + 20) - 0.5); };
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        let ri = -1; for (let r = ranges.length - 1; r >= 0; r--) if (j >= tops[r][i]) { ri = r; break; }
        const k4 = (j * w + i) * 4;
        if (ri < 0) { bi.data[k4 + 3] = 0; fi.data[k4 + 3] = 0; continue; }
        const R = ranges[ri], T = tops[ri], depth = j - T[i], sd = R.sd;
        const sl = (T[Math.min(w - 1, i + 6)] - T[Math.max(0, i - 6)]) / 12, th = Math.atan(sl) * 0.7, ct = Math.cos(th), st = Math.sin(th);
        const uu = i * ct + j * st, vv = -i * st + j * ct;
        const H0 = rid(uu, vv, sd), H1 = rid(uu + 1.2, vv, sd), H2 = rid(uu, vv + 1.5, sd);
        const gx = (H1 - H0) * 5, gy = (H2 - H0) * 3;
        const moon = clamp(0.38 - gx * 0.9 + gy * 0.3), fl = clamp(0.3 + gx * 1.0 + gy * 0.3);
        const hi = clamp(1 - depth / (190 + 80 * K.fbm(i * 0.01, 2, 2, sd + 4)));
        const snow = smooth((H0 - 0.5) * 3.2) * hi * hi;
        const mist = clamp(depth / 320) * 0.7 + R.fog;
        const bc = mix(mix([14, 16, 21].map(v => v * (0.6 + moon * 1.1)), [92, 102, 120].map(v => v * (0.45 + moon * 0.8)), snow), [26, 30, 40], mist);
        const fc = mix(mix([40, 46, 60].map(v => v * fl), [190, 202, 230].map(v => v * fl), snow), [50, 58, 78], mist * 0.7).map(v => v * (1 - R.fog * 0.5) * R.k);
        bi.data[k4] = bc[0]; bi.data[k4 + 1] = bc[1]; bi.data[k4 + 2] = bc[2]; bi.data[k4 + 3] = 255;
        fi.data[k4] = fc[0]; fi.data[k4 + 1] = fc[1]; fi.data[k4 + 2] = fc[2]; fi.data[k4 + 3] = 255;
      }
      bx.putImageData(bi, 0, 0); fx.putImageData(fi, 0, 0);
      return { base, flash, S2 };
    });
  }
  function bolt(ctx, x0, y0, x1, y1, seed, a) {
    const r = rng(seed); const seg = (ax, ay, bx, by, w, depth) => {
      const pts = [[ax, ay]], n = 12; for (let i = 1; i < n; i++) { const u = i / n; pts.push([lerp(ax, bx, u) + (r() - 0.5) * 60 * (1 - u * 0.3), lerp(ay, by, u) + (r() - 0.5) * 16]); } pts.push([bx, by]);
      ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.stroke();
      if (depth < 2) for (let k = 0; k < 2; k++) { const p = pts[3 + Math.floor(r() * 6)]; seg(p[0], p[1], p[0] + (r() - 0.3) * 200, p[1] + 80 + r() * 160, w * 0.5, depth + 1); }
    };
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.strokeStyle = `rgba(200,215,255,${0.35 * a})`; seg(x0, y0, x1, y1, 9, 0);
    const r2 = rng(seed); void r2; ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(245,248,255,${a})`; const r3 = rng(seed); const seg2 = (ax, ay, bx, by, w, depth) => {
      const pts = [[ax, ay]], n = 12; for (let i = 1; i < n; i++) { const u = i / n; pts.push([lerp(ax, bx, u) + (r3() - 0.5) * 60 * (1 - u * 0.3), lerp(ay, by, u) + (r3() - 0.5) * 16]); } pts.push([bx, by]);
      ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.stroke();
      if (depth < 2) for (let k = 0; k < 2; k++) { const p = pts[3 + Math.floor(r3() * 6)]; seg2(p[0], p[1], p[0] + (r3() - 0.3) * 200, p[1] + 80 + r3() * 160, w * 0.5, depth + 1); }
    }; seg2(x0, y0, x1, y1, 2.6, 0); ctx.restore();
  }
  function shotFirstborn(ctx, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a - 0.2, sh.b + 0.2);
    const [sx, sy] = K.shake(t, 5, 44);
    const c = { x: lerp(40, -40, ease(u)) + sx, y: lerp(-40, 30, ease(u)) + sy, z: lerp(1.0, 1.06, u), r: 0.012 - 0.016 * u };
    // lightning: a strong double flash early, a weaker flicker late
    const pulse = (t0, k) => { const d = lt - t0; return d < 0 ? 0 : k * Math.exp(-d * 6) * (0.65 + 0.35 * Math.cos(d * 50)); };
    const L = clamp(pulse(0.12, 1) + pulse(0.3, 0.75) + pulse(1.3, 0.5));
    ctx.save();
    const sk = sky('storm', 480, 270, { top: [7, 9, 13], mid: [14, 17, 23], low: [24, 28, 36], glow: [56, 66, 88], glowY: 0.3, glowR: 0.9, glowA: 0.45, cloud: [8, 9, 12], moon: [46, 56, 76], cover: 0.8, seed: 9 });
    const skL = sky('stormL', 480, 270, { top: [50, 58, 82], mid: [84, 94, 124], low: [60, 70, 92], glow: [200, 210, 245], glowY: 0.15, glowR: 0.6, glowA: 1, cloud: [30, 34, 48], moon: [170, 180, 220], cover: 0.8, seed: 9 });
    view(ctx, c, 0.1); ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sk, -150 + lt * 22, -80, W + 400, H + 200);
    if (L > 0) { ctx.globalAlpha = L; ctx.drawImage(skL, -150 + lt * 22, -80, W + 400, H + 200); ctx.globalAlpha = 1; }
    if (L > 0.3) { ctx.setTransform(1, 0, 0, 1, 0, 0); const q = proj(c, 0.3, 1620, -60); bolt(ctx, q[0], q[1], q[0] - 200, q[1] + 460, 4401 + (lt > 1 ? 7 : 0), clamp((L - 0.3) * 1.8)); }
    view(ctx, c, 0.22); fog(ctx, 13, [40, 46, 58], 100, 300, lt * 140, 0.45);
    // First-Born wheeling around the summit: the far side of each circle passes behind the peak
    const beasts = [{ R: 300, ph: 0.9, w: 0.6, alt: -60, s: 52, el: 0.55 }, { R: 470, ph: 3.6, w: 0.45, alt: 30, s: 40, el: 0.5 }, { R: 620, ph: 5.2, w: 0.38, alt: -150, s: 30, el: 0.6 }];
    const drawBeast = (b, behind) => {
      const a = b.ph + lt * b.w, side = Math.sin(a); if ((side < 0) !== behind) return;
      const x = PEAK.x + Math.cos(a) * b.R, y = PEAK.y + b.alt + side * b.R * 0.16, s2 = b.s * (1 + side * 0.2);
      wyvern(ctx, { x, y, s: s2, yaw: a + Math.PI * 1.5, bank: 0.55, el: b.el, flap: Math.sin(lt * 4.4 + b.ph * 2), t: lt + b.ph, fill: behind ? '#0c0e13' : '#07080a', lit: L * 0.55 });
    };
    view(ctx, c, 0.32); for (const b of beasts) drawBeast(b, true);
    const PK = peaksImg();
    view(ctx, c, 0.32); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(PK.base, -200, 0, PK.base.width * PK.S2, PK.base.height * PK.S2);
    if (L > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L; ctx.drawImage(PK.flash, -200, 0, PK.flash.width * PK.S2, PK.flash.height * PK.S2); ctx.restore(); }
    for (const b of beasts) drawBeast(b, false);
    view(ctx, c, 0.5); fog(ctx, 15, [34, 38, 48], 560, 300, lt * 180, 0.5); fog(ctx, 16, [28, 32, 42], 800, 340, lt * 230, 0.55);
    // the great one: it passes over us out of the storm and dives toward the summit, shrinking into the distance
    {
      const k = span(lt, -0.3, 2.3), Z = lerp(40, 300, Math.pow(k, 1.6)), Yh = 36 - 8 * k, X = lerp(9, 22, k), f = 1000;
      const x = W / 2 + f * X / Z, y = 600 - f * Yh / Z, s2 = f * 8.5 / Z, el = Math.atan2(Yh, Z) + 0.35;
      view(ctx, c, 1.0);
      wyvern(ctx, { x, y, s: s2, yaw: Math.PI / 2 + 0.15 - 0.4 * k, bank: -0.15 - 0.35 * k, el, flap: Math.sin(lt * 3.1 + 0.6), t: lt, fill: '#040405', lit: L * 0.8, litFill: 'rgba(66,42,52,1)' });
    }
    // a black shoulder of rock close by, wet, framing the left
    view(ctx, c, 1.4);
    const fr = ridge(-300, 760, x => 760 + 300 * smooth(clamp((x + 300) / 1000)) + 30 * Math.sin(x * 0.01), 47, 60, 0.008, 5, 5);
    ctx.beginPath(); ctx.moveTo(-300, 1500); for (const p of fr) ctx.lineTo(p[0], p[1]); ctx.lineTo(760, 1500); ctx.closePath(); ctx.fillStyle = '#030304'; ctx.fill();
    if (L > 0) { ctx.save(); ctx.clip(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(150,165,200,${L * 0.5})`; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < fr.length; i++) { const p = fr[i]; i ? ctx.lineTo(p[0], p[1] + 2) : ctx.moveTo(p[0], p[1] + 2); } ctx.stroke(); ctx.restore(); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    rain(ctx, t, { n: 420, angle: 0.42, speed: 1700, len: 64, alpha: 0.16 + L * 0.3, rgb: [170, 182, 204], seed: 441 });
    if (L > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(110,120,160,${L * 0.1})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    ctx.restore();
    finish(ctx, { bloom: 0.22, shadow: '#203048', shadowA: 0.35, vig: 0.72 });
  }

  // ================================================================ L44: a suspected traitor dragged from his house by torchlight
  const DOOR = { x0: 1205, x1: 1395, top: 515, y: 930 };
  function streetStatic() {
    return K.cached('s7:street', () => {
      const c = K.canvas(W + 400, H + 300), x = c.getContext('2d'), OX = 200, OY = 150, r = rng(919);
      const gy0 = 820 + OY, dx0 = DOOR.x0 + OX, dx1 = DOOR.x1 + OX, dtop = DOOR.top + OY, dy = DOOR.y + OY, dcx = (dx0 + dx1) / 2;
      // night air, and the far street: house fronts receding into mist, a lamp in a window or two
      const sky2 = x.createLinearGradient(0, 0, 0, gy0); sky2.addColorStop(0, '#05060a'); sky2.addColorStop(1, '#141519'); x.fillStyle = sky2; x.fillRect(0, 0, c.width, c.height);
      for (let k = 6; k >= 0; k--) {
        const sc2 = Math.pow(0.76, k), bx = OX + 1150 - 1360 * (1 - sc2) - 20, w = 300 * sc2, top = gy0 - 660 * sc2, fogk = 1 - sc2;
        const col = mix([12, 11, 12], [30, 31, 36], fogk);
        x.fillStyle = rgbs(col.map(v => v | 0), 1);
        x.beginPath(); x.moveTo(bx - w, gy0 - 30 * sc2); x.lineTo(bx - w, top + 70 * sc2); x.lineTo(bx - w * 0.5, top); x.lineTo(bx, top + 70 * sc2); x.lineTo(bx, gy0 - 30 * sc2); x.closePath(); x.fill();
        x.fillStyle = rgbs(mix([6, 5, 5], col, 0.5).map(v => v | 0), 1); x.fillRect(bx - w, top + 70 * sc2, 10 * sc2, gy0 - top); x.fillRect(bx - w, top + 300 * sc2, w, 8 * sc2);
        if (k % 2 === 0 || k === 1) { const wx = bx - w * (0.35 + r() * 0.3), wy = top + 170 * sc2 + r() * 140 * sc2; x.fillStyle = `rgba(220,140,64,${0.55 * (1 - fogk * 0.7)})`; x.fillRect(wx, wy, 28 * sc2, 36 * sc2); glow(x, [200, 110, 50], wx + 14 * sc2, wy + 18 * sc2, 110 * sc2, 0.25 * (1 - fogk * 0.5)); }
      }
      // mist down the street
      const mg = x.createLinearGradient(0, gy0 - 500, 0, gy0); mg.addColorStop(0, 'rgba(40,42,48,0)'); mg.addColorStop(1, 'rgba(40,42,48,0.55)'); x.fillStyle = mg; x.fillRect(0, gy0 - 500, OX + 1100, 500);
      // the house: a jettied timber front; plaster lit by its own doorway, stained and uneven
      const hx0 = OX + 1010, hx1 = OX + 2120;
      const pl = x.createRadialGradient(dcx, dy - 160, 30, dcx, dy - 160, 760); pl.addColorStop(0, '#5a4130'); pl.addColorStop(0.35, '#33261d'); pl.addColorStop(1, '#100d0b');
      x.fillStyle = pl; x.fillRect(hx0, OY - 150, hx1 - hx0, dy - OY + 150);
      x.save(); x.globalCompositeOperation = 'multiply';
      for (let i = 0; i < 900; i++) { const px = hx0 + r() * (hx1 - hx0), py = OY - 150 + r() * (dy - OY + 150), rr = 4 + r() * 40; x.fillStyle = `rgba(${90 + r() * 60 | 0},${70 + r() * 50 | 0},${60 + r() * 40 | 0},${0.12 + r() * 0.2})`; x.beginPath(); x.ellipse(px, py, rr, rr * (0.4 + r()), r() * 3, 0, TAU); x.fill(); }
      x.restore();
      const beam = (x0, y0, x1, y1, wd) => { x.save(); x.strokeStyle = '#0d0907'; x.lineWidth = wd; x.lineCap = 'butt'; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); x.strokeStyle = 'rgba(70,46,30,0.35)'; x.lineWidth = 1.2; for (let k = 0; k < 3; k++) { const o2 = (k - 1) * wd * 0.25; x.beginPath(); x.moveTo(x0 + o2, y0 + o2 * 0.1); x.lineTo(x1 + o2, y1 + o2 * 0.1); x.stroke(); } x.restore(); };
      for (const bx of [hx0 + 16, hx0 + 140, dx0 - 14, dx1 + 16, dx1 + 226, dx1 + 436, hx1 - 24]) beam(bx, OY - 150, bx + (r() - 0.5) * 6, dy, 32);
      for (const by of [OY + 150, dtop - 46, dy - 6]) beam(hx0, by, hx1, by + (r() - 0.5) * 6, 28);
      for (const [a0, b0] of [[hx0 + 32, dx0 - 30], [dx1 + 32, dx1 + 210], [dx1 + 242, dx1 + 420]]) { beam(a0, dtop - 60, b0, OY + 166, 20); beam(a0, OY + 166, b0, dtop - 60, 20); }
      x.fillStyle = '#080605'; x.fillRect(hx0 - 40, OY + 112, hx1 - hx0 + 80, 40);
      for (let bx = hx0; bx < hx1; bx += 70) x.fillRect(bx, OY + 142, 22, 26);
      // an upstairs window, lit, a neighbour's shape behind the shutter
      const wx = dx1 + 262, wy = OY - 96; x.fillStyle = '#b8702f'; x.fillRect(wx, wy, 112, 150); glow(x, [210, 120, 50], wx + 56, wy + 75, 240, 0.28);
      x.fillStyle = '#120b07'; x.beginPath(); x.ellipse(wx + 72, wy + 64, 19, 23, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(wx + 70, wy + 128, 34, 46, 0, 0, TAU); x.fill();
      x.fillStyle = '#0a0605'; x.fillRect(wx, wy, 112, 9); x.fillRect(wx + 52, wy, 8, 150); x.fillRect(wx - 34, wy - 12, 34, 176); x.fillRect(wx, wy + 146, 112, 10);
      // the doorway: warm and deep, a hearth's glow within, the door leaf swung in
      const dg = x.createLinearGradient(0, dtop, 0, dy); dg.addColorStop(0, '#c98444'); dg.addColorStop(0.55, '#eda863'); dg.addColorStop(1, '#ffcf8e');
      x.fillStyle = dg; x.fillRect(dx0, dtop, dx1 - dx0, dy - dtop);
      x.fillStyle = 'rgba(70,34,14,0.5)'; x.fillRect(dx0 + 14, dtop + 30, 50, 180); x.fillRect(dx0 + 100, dtop + 70, 40, dy - dtop - 70);
      x.fillStyle = '#1c120b'; x.beginPath(); x.moveTo(dx1 - 4, dtop); x.lineTo(dx1 - 64, dtop + 28); x.lineTo(dx1 - 64, dy - 6); x.lineTo(dx1 - 4, dy); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2; for (let k = 1; k < 4; k++) { x.beginPath(); x.moveTo(dx1 - 4 - k * 15, dtop + k * 7); x.lineTo(dx1 - 4 - k * 15, dy - k * 1.5); x.stroke(); }
      x.fillStyle = '#0b0705'; x.fillRect(dx0 - 20, dtop - 28, dx1 - dx0 + 40, 30); x.fillRect(dx0 - 30, dy - 8, dx1 - dx0 + 60, 14);
      // the street: wet, irregular cobbles in perspective
      const G = x.createLinearGradient(0, gy0, 0, c.height); G.addColorStop(0, '#0c0b0c'); G.addColorStop(1, '#040404'); x.fillStyle = G; x.fillRect(0, gy0, c.width, c.height - gy0);
      let yy = gy0;
      for (let row = 0; yy < c.height + 40; row++) {
        const v = (yy - gy0) / (c.height - gy0), hh = 4 + 34 * Math.pow(v, 1.15);
        let X = -r() * hh * 2;
        while (X < c.width + hh * 2) {
          const ww = hh * (1.2 + r() * 0.9), cx2 = X + ww / 2, cy2 = yy + hh / 2 + (r() - 0.5) * hh * 0.2;
          const L2 = Math.pow(clamp(1 - Math.hypot((cx2 - dcx) / 820, (cy2 - dy) / 260)), 1.6);
          x.fillStyle = `rgb(${14 + 34 * L2 + r() * 6 | 0},${12 + 22 * L2 + r() * 5 | 0},${12 + 14 * L2 + r() * 5 | 0})`;
          x.beginPath(); for (let q = 0; q < 7; q++) { const an = q / 7 * TAU, rr = 0.5 + 0.12 * (r() - 0.5); const px = cx2 + Math.cos(an) * ww * 0.47 * rr * 2 * 0.95, py = cy2 + Math.sin(an) * hh * 0.44 * rr * 2; q ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.fill();
          if (L2 > 0.05) { x.fillStyle = `rgba(255,196,130,${0.05 + 0.3 * L2 * r()})`; x.beginPath(); x.ellipse(cx2 - ww * 0.08, cy2 - hh * 0.2, ww * 0.22, hh * 0.08, 0, 0, TAU); x.fill(); }
          X += ww * (0.98 + r() * 0.12);
        }
        yy += hh * 0.92;
      }
      // the doorway's light poured on the wet street in long streaks
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 46; i++) { const sx2 = lerp(dx0 + 6, dx1 - 6, r()), L2 = 0.08 + r() * 0.14, len = 100 + r() * 240; const g = x.createLinearGradient(0, dy, 0, dy + len); g.addColorStop(0, `rgba(255,180,100,${L2})`); g.addColorStop(1, 'rgba(255,180,100,0)'); x.fillStyle = g; x.fillRect(sx2 - 2 - r() * 5, dy + 4, 3 + r() * 9, len); }
      glow(x, [220, 130, 60], dcx, dy + 40, 460, 0.22);
      x.restore();
      return { c, OX, OY };
    });
  }
  function shotTraitor(ctx, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a - 0.2, sh.b + 0.2);
    const [sx, sy] = K.shake(t * 1.3, 6, 45);
    const c = { x: lerp(40, -50, ease(u)) + sx, y: lerp(10, -5, u) + sy, z: lerp(1.03, 1.1, ease(u)), r: 0.006 * Math.sin(t * 0.9) };
    const S = streetStatic(), tf = flick(t, 3, 10), df = flick(t, 9, 5) * 0.15 + 0.85;
    ctx.save();
    view(ctx, c, 0.95); ctx.drawImage(S.c, -S.OX, -S.OY);
    glow(ctx, [255, 170, 80], (DOOR.x0 + DOOR.x1) / 2, DOOR.y - 160, 280, 0.16 * df);
    // the man is hauled out over his threshold; his wife reaches after him from the door
    const pull = easeOut(span(lt, -0.3, 2.5)), mx = lerp(1230, 960, pull), gy = DOOR.y, hh = 340, st = Math.sin(lt * 5.3), jerk = Math.max(0, Math.sin(lt * 3.1)) * 0.06;
    const figs = (cc, fill) => {
      person(cc, { x: DOOR.x1 - 70, y: gy, h: hh * 0.95, face: -1, dress: 'gown', hat: 'veil', lean: 0.3 + 0.05 * Math.sin(lt * 3), armN: [1.5 + 0.1 * Math.sin(lt * 4), 0.1], armF: [1.2, 0.5], legN: [0.25, 0.05], legF: [-0.15, 0.1], fill });
      // the man: heels dug in toward his door, hauled backwards by the arms
      const m = person(cc, { x: mx, y: gy + 4, h: hh, face: 1, dress: 'tunic', hat: 'hair', lean: -0.32 - jerk + 0.04 * st, tilt: 0.35, armN: [-2.0 - 0.1 * st, 0.35], armF: [-2.25, 0.2], legN: [0.62 + 0.05 * st, 0.12], legF: [0.38, 0.3], fill });
      person(cc, { x: mx - 150, y: gy + 8, h: hh * 1.05, face: -1, dress: 'mail', hat: 'helm', lean: 0.28 + jerk, reachN: m.hand, reachF: m.handF, walk: lt * 6, bulk: 1.12, fill });
      person(cc, { x: mx + 120, y: gy + 2, h: hh * 1.03, face: -1, dress: 'mail', hat: 'kettle', lean: 0.22, reachN: [mx + 0.06 * hh, gy - 0.66 * hh], reachF: [mx + 0.0 * hh, gy - 0.56 * hh], walk: lt * 5 + 1.5, bulk: 1.12, fill });
      person(cc, { x: mx - 380, y: gy + 16, h: hh * 1.0, face: 1, dress: 'cloak', hat: 'helm', hold: 'spear', armN: [0.25, 0.9], fill });
    };
    view(ctx, c, 1.0);
    rimLit(ctx, figs, { rim: `rgb(${255 * df | 0},${178 * df | 0},${100 * df | 0})`, mid: '#5a2c10', dark: '#060504', dx: -5, dy: 1.5 });
    // rain sheeting off the eaves in front of the door
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,200,140,0.35)'; ctx.lineWidth = 1.5;
    const dr = rng(451); for (let i = 0; i < 26; i++) { const x0 = DOOR.x0 - 120 + dr() * 520, sp2 = 600 + dr() * 400, ph = dr() * 3, yy = ((lt + ph) * sp2) % 460; ctx.globalAlpha = 0.4 + dr() * 0.5; ctx.beginPath(); ctx.moveTo(x0, 340 + yy); ctx.lineTo(x0, 340 + yy + 40 + dr() * 40); ctx.stroke(); }
    ctx.restore();
    // the torch-bearer close to the lens, holding the light high; his torch is the key on the left
    const tx = 150 + Math.sin(t * 1.1) * 8, ty = 1190, th = 880;
    view(ctx, c, 1.25);
    let tor = null;
    rimLit(ctx, (cc, fill) => { tor = person(cc, { x: tx, y: ty, h: th, face: 1, dress: 'mail', hat: 'kettle', hold: 'torch', armN: [1.9, -0.9], bulk: 1.15, fill }); }, { rim: '#ffbf7a', mid: '#5a2c12', dark: '#040303', dx: 5, dy: 6 });
    const [tfx, tfy] = tor.torch;
    glow(ctx, [255, 120, 40], tfx, tfy - 40, 760, 0.28 * tf); glow(ctx, [255, 200, 120], tfx, tfy - 50, 140, 0.55 * tf);
    fire(ctx, tfx, tfy + 14, 70, 190 * tf, t, 7, { n: 6, slot: 't' });
    K.smoke(ctx, t, { n: 6, x: tfx - 140, y: tfy - 560, w: 260, h: 440, color: [72, 52, 42], alpha: 0.2, rise: 30, size: 200, seed: 451 });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const q1 = proj(c, 1.25, tfx, tfy), q2 = proj(c, 0.95, (DOOR.x0 + DOOR.x1) / 2, DOOR.y - 200);
    rain(ctx, t, { n: 460, angle: 0.12, speed: 1600, len: 50, alpha: 0.15, lights: [{ x: q1[0], y: q1[1], r: 560, rgb: [255, 170, 100], a: 1 }, { x: q2[0], y: q2[1], r: 420, rgb: [255, 190, 120], a: 0.9 }], seed: 452 });
    ctx.restore();
    finish(ctx, { bloom: 0.36, shadow: '#1b2c3c', shadowA: 0.3, vig: 0.7 });
  }

  // ================================================================ L46–L50: the hall's table: the map, the blank standard
  // A small software renderer. The table top is the plane Z = 0 (cm); a camera looks down on it. On it lie the creator's
  // map of Aethelgard (its corner curling, the other held by a candle, the home ringed in red ink) and the blank standard
  // (a height field: sleeve, storage creases, soft waves, hem). Every pixel is traced back to the table (refined for the
  // surface's height), shaded by two candles (point lights), the hearth (low raking light, with fold shadows marched on
  // a coarse grid) and a cool ambient; the candles and the hearth are kept in separate images so they can flicker.
  function camera3(C, T, f, cx0, cy0) {
    const Fv = [T[0] - C[0], T[1] - C[1], T[2] - C[2]], fl = Math.hypot(...Fv); Fv[0] /= fl; Fv[1] /= fl; Fv[2] /= fl;
    const rl = Math.hypot(Fv[1], Fv[0]) || 1, R = [Fv[1] / rl, -Fv[0] / rl, 0], U = [R[1] * Fv[2] - R[2] * Fv[1], R[2] * Fv[0] - R[0] * Fv[2], R[0] * Fv[1] - R[1] * Fv[0]];
    const proj3 = (X, Y, Z) => { const p = [X - C[0], Y - C[1], Z - C[2]], xc = p[0] * R[0] + p[1] * R[1] + p[2] * R[2], yc = p[0] * U[0] + p[1] * U[1] + p[2] * U[2], zc = p[0] * Fv[0] + p[1] * Fv[1] + p[2] * Fv[2]; return [cx0 + f * xc / zc, cy0 - f * yc / zc, zc]; };
    const ray = (sx, sy, h) => { const a = (sx - cx0) / f, b = -(sy - cy0) / f, d = [R[0] * a + U[0] * b + Fv[0], R[1] * a + U[1] * b + Fv[1], R[2] * a + U[2] * b + Fv[2]], tau = (h - C[2]) / d[2]; return [C[0] + d[0] * tau, C[1] + d[1] * tau, tau]; };
    return { C, T, f, cx0, cy0, F: Fv, R, U, proj3, ray };
  }
  const BC = (() => {
    const psi = 0.2, bc = [28, 2], A = [Math.cos(psi), Math.sin(psi)], B = [Math.sin(psi), -Math.cos(psi)], BW2 = 70, BL = 115, BV = 99;
    const toB = (X, Y) => { const dx = X - bc[0], dy = Y - bc[1]; return [dx * A[0] + dy * A[1] + BW2 / 2, dx * B[0] + dy * B[1] + BL / 2]; };
    const fromB = (a, b) => [bc[0] + (a - BW2 / 2) * A[0] + (b - BL / 2) * B[0], bc[1] + (a - BW2 / 2) * A[1] + (b - BL / 2) * B[1]];
    // the map: 62 cm across, north toward the back of the table
    const mu0 = -0.06, MC = [-60, 3], MW = 62, MH = 62 * 1650 / 2000, Au = [Math.cos(mu0), Math.sin(mu0)], Av = [Math.sin(mu0), -Math.cos(mu0)];
    const toM = (X, Y) => { const dx = X - MC[0], dy = Y - MC[1]; return [(dx * Au[0] + dy * Au[1]) / MW + 0.5, (dx * Av[0] + dy * Av[1]) / MH + 0.5]; };
    const fromM = (u, v) => [MC[0] + (u - 0.5) * MW * Au[0] + (v - 0.5) * MH * Av[0], MC[1] + (u - 0.5) * MW * Au[1] + (v - 0.5) * MH * Av[1]];
    const TABLE = { x0: -105, x1: 105, y0: -58, y1: 62 };
    const c1 = fromM(0.06, 0.08), CANDLES = [[c1[0], c1[1], 23, 1.0], [-20, 47, 27, 1.0]];
    const HEARTH = (() => { const v = [0.95, 0.55, 0.3], l = Math.hypot(...v); return v.map(q => q / l); })();
    const cam = camera3([0, -150, 135], [0, 15, 0], 1500, 960, 610);
    return { cam, proj3: cam.proj3, ray: cam.ray, toB, fromB, BW2, BL, BV, psi, A, B, toM, fromM, MW, MH, Au, Av, TABLE, CANDLES, HEARTH };
  })();
  const BN_E = (() => { const W2 = BC.BW2, L = BC.BL, V = BC.BV, l = Math.hypot(L - V, W2 / 2); return { W2, L, V, nx: (L - V) / l, ny: (W2 / 2) / l }; })();
  // signed distance (cm) to the banner's outline in its own frame (negative inside): the convex shape (0,0) (W,0) (W,V)
  // (W/2,L) (0,V), the largest of its edges' half-planes, with a slightly wavering edge
  function bannerSD(a, b) {
    const E = BN_E, wav = 0.45 * (K.noise(a * 0.12, b * 0.12, 61) - 0.5) + 0.3 * Math.sin(b * 0.21 + a * 0.05);
    return Math.max(-b, a - E.W2, -a, (a - E.W2) * E.nx + (b - E.V) * E.ny, -a * E.nx + (b - E.V) * E.ny) + wav;
  }
  function clothH(a, b, sd) {
    if (sd == null) sd = bannerSD(a, b); if (sd > 0) return 0;
    let h = 0.3;
    const sl = b - 2.2; h += 0.9 * Math.exp(-(sl * sl) / 3);                                           // the sleeve round the crossbar
    for (const ca of [23.3, 46.7]) { const d = a - ca + 0.8 * Math.sin(b * 0.09 + ca); h += 0.32 * Math.exp(-(d * d) / 1.4) + 0.4 * Math.exp(-(d * d) / 26) * (ca < 30 ? 1 : -0.7); }
    { const d = b - 54 + 0.9 * Math.sin(a * 0.1); h += -0.22 * Math.exp(-(d * d) / 1.8) + 0.55 * Math.exp(-(d * d) / 34); }
    const env = smooth(clamp(-sd / 8)) * smooth(clamp((b - 7) / 12));
    h += env * (1.9 * Math.sin((0.55 * a + 0.83 * b) * 0.12 + 0.7) * (0.55 + 0.45 * Math.sin(a * 0.05 + 1)) + 1.2 * Math.sin((-0.72 * a + 0.69 * b) * 0.16 + 2.1) * smooth(clamp((b - 38) / 30)));
    h += env * 1.6 * Math.exp(-((a - 50) * (a - 50) + (b - 86) * (b - 86)) / 180) * (0.6 + 0.4 * Math.sin(a * 0.5 - b * 0.22));
    h += 0.36 * (K.fbm(a / 6.5, b / 6.5, 3, 63) - 0.5);
    h = h * smooth(clamp(-sd / 1.4)) + 0.22 * Math.exp(-Math.pow((sd + 1.5) / 0.8, 2));
    return Math.max(0.04, h);
  }
  // the map's height: a sheet lying flat, its front-left corner curling up
  function mapH(u, v) {
    if (u < 0 || u > 1 || v < 0 || v > 1) return -1;
    const c = (0.24 - u) * BC.MW * 0.72 + (v - 0.74) * BC.MH * 0.72;
    return 0.06 + (c > 0 ? 0.0055 * c * c : 0) + 0.1 * (K.noise(u * 9, v * 9, 71) - 0.5);
  }
  // the surface at a table point: { h, m: 0 wood | 1 cloth | 2 map, and the material's own coordinates }
  function surf(X, Y) {
    const ab = BC.toB(X, Y), sd = bannerSD(ab[0], ab[1]);
    if (sd < 0.6) { const h = clothH(ab[0], ab[1], sd); return { h: sd < 0 ? h : 0, m: 1, a: ab[0], b: ab[1], sd }; }
    const uv = BC.toM(X, Y), mh = mapH(uv[0], uv[1]);
    if (mh >= 0 || (uv[0] > -0.02 && uv[0] < 1.02 && uv[1] > -0.02 && uv[1] < 1.02)) { const sdm = Math.max(-uv[0] * BC.MW, (uv[0] - 1) * BC.MW, -uv[1] * BC.MH, (uv[1] - 1) * BC.MH); return { h: mh >= 0 ? mh : 0, m: 2, u: uv[0], v: uv[1], sd: sdm }; }
    return { h: 0, m: 0, sd: Math.min(sd, 99) };
  }
  // the map as a texture with the home ringed in red ink (a hand's double stroke); two sizes, read back as pixel arrays
  function mapTex(scale) {
    return K.cached('s7:maptex' + scale, () => {
      const MP = K.map, w = Math.round(MP.W * scale), h = Math.round(MP.H * scale), c = K.canvas(w, h), x = c.getContext('2d');
      x.imageSmoothingQuality = 'high'; x.drawImage(MP.paper(), 0, 0, w, h); x.globalCompositeOperation = 'multiply'; x.drawImage(MP.ink(), 0, 0, w, h);
      x.save(); x.scale(scale, scale); redRing(x); x.restore();
      return { c, w, h, d: x.getImageData(0, 0, w, h).data };
    });
  }
  function redRing(x) {
    const hm = K.map.home, r = rng(626);
    x.save(); x.globalCompositeOperation = 'source-over'; x.fillStyle = 'rgba(168,30,20,0.86)';
    for (let pass = 0; pass < 2; pass++) {
      const a0 = -2.4 + pass * 0.9, sweep = TAU * (pass ? 0.93 : 1.12), pts = [], rot = (pass ? 0.06 : -0.04), ex = pass ? 1.05 : 0.98, ey = pass ? 0.94 : 1.03;
      for (let i = 0; i <= 90; i++) { const t = a0 + sweep * i / 90, wob = 1 + 0.035 * Math.sin(t * 3 + pass * 2) + 0.02 * (K.noise(i * 0.2, pass, 627) - 0.5); const ux = Math.cos(t) * hm.rx * ex * wob, uy = Math.sin(t) * hm.ry * ey * wob; pts.push([hm.x + 4 * pass + ux * Math.cos(rot) - uy * Math.sin(rot), hm.y - 3 * pass + ux * Math.sin(rot) + uy * Math.cos(rot)]); }
      K.nib(x, pts, { w: pass ? 5.5 : 7, angle: -0.6, min: 0.5, taper: 0.06, jit: 0.25, seed: 640 + pass });
    }
    x.globalAlpha = 0.25; x.beginPath(); x.arc(hm.x - hm.rx * 0.95, hm.y + 8, 4.5, 0, TAU); x.fill();
    void r; x.restore();
  }
  function texRGB(T, u, v, out) {   // bilinear lookup, u and v in 0..1
    const fx = clamp(u) * (T.w - 1.001), fy = clamp(v) * (T.h - 1.001), i = fx | 0, j = fy | 0, s = fx - i, t = fy - j, d = T.d, k = (j * T.w + i) * 4, k2 = k + T.w * 4;
    for (let c = 0; c < 3; c++) out[c] = ((d[k + c] * (1 - s) + d[k + 4 + c] * s) * (1 - t) + (d[k2 + c] * (1 - s) + d[k2 + 4 + c] * s) * t) / 255;
    return out;
  }
  // the old table's planks, painted once in table space (8 px per cm)
  function woodTex() {
    return K.cached('s7:wood', () => {
      const T0 = BC.TABLE, s = 6, w = (T0.x1 - T0.x0) * s, h = (T0.y1 - T0.y0) * s, d = new Float32Array(w * h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const X = T0.x0 + i / s, Y = T0.y0 + j / s, plank = Math.floor((Y - T0.y0) / 21), py2 = (Y - T0.y0) - plank * 21, seam = Math.exp(-Math.pow(Math.min(py2, 21 - py2) / 0.35, 2));
        const grain = K.fbm(X * 0.04 + plank * 7.3, (Y + plank * 3) * 0.7, 4, 66), fine = K.noise(X * 0.6 + plank * 9, Y * 3.5, 68), knot = Math.max(0, 1 - Math.hypot((X - 40 + plank * 31) * 0.22, (py2 - 9) * 0.5));
        const wear = 0.8 + 0.3 * K.fbm(X * 0.02, Y * 0.02, 3, 69), scratch = Math.max(0, K.noise(X * 0.9 + Y * 0.3, Y * 0.05, 70) - 0.82) * 2;
        d[j * w + i] = (0.55 + 0.6 * (grain - 0.5) + 0.12 * (fine - 0.5) - 0.38 * seam - 0.3 * knot + scratch * 0.4) * wear;
      }
      return { d, w, h, s };
    });
  }
  function woodAt(X, Y) { const T = woodTex(), T0 = BC.TABLE, fx = clamp((X - T0.x0) * T.s, 0, T.w - 1.001), fy = clamp((Y - T0.y0) * T.s, 0, T.h - 1.001), i = fx | 0, j = fy | 0, s = fx - i, t = fy - j, k = j * T.w + i; return (T.d[k] * (1 - s) + T.d[k + 1] * s) * (1 - t) + (T.d[k + T.w] * (1 - s) + T.d[k + T.w + 1] * s) * t; }
  // tableRender(key, cam, x0, y0, w, h, sc, o): the table seen by cam over the screen region (x0, y0, w, h), sc px per px.
  // o.feather fades the edges (for a sharp inset over a wider render); o.tex the map texture scale
  function tableRender(key, cam, x0, y0, w, h, sc, o = {}) {
    return K.cached('s7:tr:' + key, () => {
      const IW = Math.round(w * sc), IH = Math.round(h * sc), G = 5, GW = Math.ceil(IW / G) + 2, GH = Math.ceil(IH / G) + 2, N = GW * GH;
      const MT = mapTex(o.tex || 0.25), Lh = BC.HEARTH, A = BC.A, B = BC.B, Au = BC.Au, Av = BC.Av;
      const gh = new Float32Array(N), gx = new Float32Array(N), gy = new Float32Array(N), gnx = new Float32Array(N), gny = new Float32Array(N), gnz = new Float32Array(N), gcv = new Float32Array(N), gsd = new Float32Array(N), steep = new Uint8Array(N);
      const hAt = (X, Y) => surf(X, Y).h;
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const sx = x0 + (i * G) / sc, sy = y0 + (j * G) / sc, k = j * GW + i;
        let P = cam.ray(sx, sy, 0), S = surf(P[0], P[1]);
        if (S.h > 0.05) { P = cam.ray(sx, sy, S.h); S = surf(P[0], P[1]); if (S.h > 0.05) { P = cam.ray(sx, sy, S.h); S = surf(P[0], P[1]); } }
        gh[k] = S.h; gx[k] = P[0]; gy[k] = P[1]; gsd[k] = Math.abs(S.sd);
        const e = 0.5, hX = (hAt(P[0] + e, P[1]) - hAt(P[0] - e, P[1])) / (2 * e), hY = (hAt(P[0], P[1] + e) - hAt(P[0], P[1] - e)) / (2 * e), nl = Math.hypot(hX, hY, 1);
        gnx[k] = -hX / nl; gny[k] = -hY / nl; gnz[k] = 1 / nl;
      }
      // cells near a raised edge (the sleeve, the curled corner) are traced by marching: their silhouettes need it
      for (let j = 1; j < GH - 2; j++) for (let i = 1; i < GW - 2; i++) {
        let hm = 0, sm = 99; for (let dj = -1; dj <= 2; dj++) for (let di = -1; di <= 2; di++) { const q = (j + dj) * GW + i + di; if (gh[q] > hm) hm = gh[q]; if (gsd[q] < sm) sm = gsd[q]; }
        if (hm > 0.7 && sm < 5) steep[j * GW + i] = 1;
      }
      // raking shadows from the low hearth, marched over the height grid
      const shade = new Float32Array(N), lhh = Math.hypot(Lh[0], Lh[1]), tanE = Lh[2] / lhh, ux = Lh[0] / lhh, uy = Lh[1] / lhh;
      for (let k = 0; k < N; k++) {
        const h0 = gh[k]; let sh = 1;
        for (let st = 1; st <= 14; st++) {
          const d = st * 1.6, q = cam.proj3(gx[k] + ux * d, gy[k] + uy * d, 0), fi = (q[0] - x0) * sc / G, fj = (q[1] - y0) * sc / G;
          if (fi < 0 || fj < 0 || fi >= GW - 1 || fj >= GH - 1) break;
          const over = gh[(fj | 0) * GW + (fi | 0)] - (h0 + d * tanE); if (over > 0) { sh -= over * 0.8; if (sh <= 0) { sh = 0; break; } }
        }
        shade[k] = sh;
      }
      for (let pass = 0; pass < 2; pass++) { const tmp = shade.slice(); for (let j = 1; j < GH - 1; j++) for (let i = 1; i < GW - 1; i++) { const k = j * GW + i; shade[k] = (tmp[k] * 4 + tmp[k - 1] + tmp[k + 1] + tmp[k - GW] + tmp[k + GW]) / 8; } }
      const sample = (arr, fx, fy) => { const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, k = j * GW + i; return (arr[k] * (1 - u) + arr[k + 1] * u) * (1 - v) + (arr[k + GW] * (1 - u) + arr[k + GW + 1] * u) * v; };
      const mk = () => { const c = K.canvas(IW, IH); return [c, c.getContext('2d'), c.getContext('2d').createImageData(IW, IH)]; };
      const [cA, xA, dA] = mk(), [cC, xC, dC] = mk(), [cH, xH, dH] = mk();
      const T0 = BC.TABLE, rgb = [0, 0, 0], amb = [0.045, 0.052, 0.07];
      for (let py = 0; py < IH; py++) for (let px = 0; px < IW; px++) {
        const fx = px / G + 0.0001, fy = py / G + 0.0001, o4 = (py * IW + px) * 4, sxp = x0 + px / sc, syp = y0 + py / sc;
        let hh = sample(gh, fx, fy), P = cam.ray(sxp, syp, hh), S = surf(P[0], P[1]);
        if (steep[(fy | 0) * GW + (fx | 0)]) for (let it = 0; it < 2 && Math.abs(S.h - hh) > 0.05; it++) { hh = (hh + S.h) / 2; P = cam.ray(sxp, syp, hh); S = surf(P[0], P[1]); }
        const X = P[0], Y = P[1], inT = Math.min(X - T0.x0, T0.x1 - X, Y - T0.y0, T0.y1 - Y);
        let fe = 1; if (o.feather) fe = smooth(Math.min(px, IW - px, py, IH - py) / o.feather);
        if (inT < -0.6 || fe <= 0) { dA.data[o4 + 3] = dC.data[o4 + 3] = dH.data[o4 + 3] = 0; continue; }
        let nx = sample(gnx, fx, fy), ny = sample(gny, fx, fy), nz = sample(gnz, fx, fy);
        const wd = woodAt(X, Y) * (inT < 1.2 ? 0.75 + 0.2 * inT : 1), wood = [0.31 * wd, 0.19 * wd, 0.11 * wd];
        let albC = wood, cov = 0, isCloth = false, ao = 1;
        if (S.m === 1) {
          cov = clamp(0.5 - S.sd * 4); isCloth = cov > 0;
          const a = S.a, b = S.b, wv = 0.035 * Math.sin(a * 10.5) * Math.sin(b * 10.7) + 0.03 * (K.noise(a * 3.1, b * 0.9, 64) - 0.5) + 0.025 * (K.noise(a * 0.45, b * 2.9, 65) - 0.5) + 0.02 * (K.noise(a * 0.08, b * 0.08, 67) - 0.5);
          const hem = Math.exp(-Math.pow((S.sd + 1.7) / 0.2, 2)) * 0.14 + Math.exp(-Math.pow((S.sd + 0.2) / 0.3, 2)) * 0.08, v = 1 + wv - hem;
          albC = [0.92 * v, 0.885 * v, 0.81 * v].map((q, i) => q * cov + wood[i] * (1 - cov));
          ao = cov > 0 ? clamp(0.82 + 0.18 * smooth(-S.sd / 2.5)) : clamp(0.45 + 0.55 * smooth((S.sd - 0.2) / 4.5));
        } else if (S.m === 2) {
          cov = clamp(0.5 - S.sd * 6);
          texRGB(MT, S.u, S.v, rgb); const pap = [rgb[0] * 0.96, rgb[1] * 0.92, rgb[2] * 0.84];
          albC = pap.map((q, i) => q * cov + wood[i] * (1 - cov));
          ao = cov > 0 ? 1 : clamp(0.55 + 0.45 * smooth((S.sd - 0.1) / 2.5));
        } else {
          ao = clamp(0.5 + 0.5 * smooth((S.sd - 0.2) / 4.5));
          const uv = BC.toM(X, Y), dm = Math.max(-uv[0] * BC.MW, (uv[0] - 1) * BC.MW, -uv[1] * BC.MH, (uv[1] - 1) * BC.MH); ao *= clamp(0.6 + 0.4 * smooth((dm - 0.1) / 2.2));
        }
        if (cov <= 0) { nx = 0; ny = 0; nz = 1; }
        // lights: a cool dim ambient; the candles (points, falloff); the hearth (low, raking, shadowed by the folds)
        const Z = hh * (cov > 0 ? 1 : 0); let dc = 0, sheenC = 0, spec = 0;
        for (const L of BC.CANDLES) {
          const lcx = L[0] - X, lcy = L[1] - Y, lcz = L[2] - Z, ld = Math.hypot(lcx, lcy, lcz), fall = L[3] / (1 + Math.pow(ld / 40, 2)), wrap = isCloth ? 0.3 : 0.05;
          const ndc = (nx * lcx + ny * lcy + nz * lcz) / ld; dc += clamp((ndc + wrap) / (1 + wrap)) * fall; sheenC += fall;
          if (S.m === 0) spec += Math.pow(clamp(ndc), 30) * fall * 0.2;
        }
        const ndh = nx * Lh[0] + ny * Lh[1] + nz * Lh[2], sh = sample(shade, fx, fy), dh = clamp((ndh + (isCloth ? 0.25 : 0.05)) / 1.25) * (0.42 + 0.58 * sh);
        const sheen = isCloth ? Math.pow(1 - nz, 1.6) * 0.7 : 0;
        for (let ch = 0; ch < 3; ch++) {
          dA.data[o4 + ch] = clamp(albC[ch] * amb[ch] * ao * (0.7 + 0.3 * nz) * 3.4) * 255;
          dC.data[o4 + ch] = clamp((albC[ch] * (dc * 1.55 + sheen * 0.22 * sheenC) * ao + spec) * [1.0, 0.8, 0.54][ch]) * 255;
          dH.data[o4 + ch] = clamp(albC[ch] * [1.0, 0.6, 0.32][ch] * (dh * 0.75 + sheen * 0.3 * sh) * ao * (0.35 + 0.65 * clamp((X + 60) / 170))) * 255;
        }
        const al = clamp(inT + 0.6) * fe * 255; dA.data[o4 + 3] = dC.data[o4 + 3] = dH.data[o4 + 3] = al;
      }
      xA.putImageData(dA, 0, 0); xC.putImageData(dC, 0, 0); xH.putImageData(dH, 0, 0);
      return { amb: cA, cand: cC, hear: cH, x0, y0, w, h, sc };
    });
  }
  function drawBannerRender(ctx, R, ic, ih) {
    ctx.save(); ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(R.amb, R.x0, R.y0, R.w, R.h);
    ctx.globalCompositeOperation = 'lighter';
    for (const [img, I] of [[R.cand, ic], [R.hear, ih]]) { let k = I; while (k > 0.002) { ctx.globalAlpha = Math.min(1, k); ctx.drawImage(img, R.x0, R.y0, R.w, R.h); k -= 1; } }
    ctx.restore();
  }
  // ---------------------------------------------------------------- L45: the sealed challenge, close: red wax and a crown
  function sealImg() {
    return K.cached('s7:seal', () => {
      const S2 = 560, c = K.canvas(S2, S2), x = c.getContext('2d'), cx = S2 / 2, cy = S2 / 2, R = 190, r = rng(1801);
      const blob = (rad, jit, sd) => { x.beginPath(); for (let i = 0; i <= 90; i++) { const a = i / 90 * TAU, rr = rad * (1 + jit * (K.fbm(Math.cos(a) * 1.3 + sd, Math.sin(a) * 1.3, 4, 1802) - 0.5) * 2); const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.96; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); };
      // the spread of wax, its shadow, a rim pressed up round the die
      x.save(); x.translate(8, 14); blob(R * 1.08, 0.08, 1); x.fillStyle = 'rgba(0,0,0,0.55)'; x.filter = 'blur(10px)'; x.fill(); x.restore(); x.filter = 'none';
      blob(R * 1.08, 0.08, 1); let g = x.createRadialGradient(cx - 60, cy - 70, 10, cx, cy, R * 1.15); g.addColorStop(0, '#c23a2a'); g.addColorStop(0.5, '#8a1c14'); g.addColorStop(1, '#4a0a08'); x.fillStyle = g; x.fill();
      x.save(); blob(R * 1.08, 0.08, 1); x.clip();
      x.strokeStyle = 'rgba(255,170,140,0.35)'; x.lineWidth = 10; x.beginPath(); x.arc(cx, cy, R * 0.86, Math.PI * 0.95, Math.PI * 1.75); x.stroke();
      x.strokeStyle = 'rgba(30,0,0,0.6)'; x.lineWidth = 12; x.beginPath(); x.arc(cx, cy, R * 0.86, Math.PI * -0.05, Math.PI * 0.75); x.stroke();
      // the recessed field of the die
      g = x.createRadialGradient(cx + 30, cy + 40, 10, cx, cy, R * 0.8); g.addColorStop(0, '#7a160f'); g.addColorStop(1, '#5a0e0a'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R * 0.78, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(20,0,0,0.7)'; x.lineWidth = 5; x.beginPath(); x.arc(cx + 2, cy + 3, R * 0.78, Math.PI * 1.0, Math.PI * 1.8); x.stroke();
      x.strokeStyle = 'rgba(255,150,120,0.3)'; x.lineWidth = 4; x.beginPath(); x.arc(cx - 2, cy - 2, R * 0.78, Math.PI * 0.05, Math.PI * 0.85); x.stroke();
      // the crown in relief, with a ring of beads
      const crown = [[-1, 0.15], [-1, -0.55], [-0.62, -0.18], [-0.3, -0.82], [0, -0.3], [0.3, -0.82], [0.62, -0.18], [1, -0.55], [1, 0.15]], cs = R * 0.48;
      const crownPath = (ox, oy) => { x.beginPath(); crown.forEach((q, i) => { const px = cx + q[0] * cs + ox, py = cy - 10 + q[1] * cs + oy; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.lineTo(cx + cs + ox, cy - 10 + 0.42 * cs + oy); x.lineTo(cx - cs + ox, cy - 10 + 0.42 * cs + oy); x.closePath(); };
      crownPath(5, 6); x.fillStyle = 'rgba(25,0,0,0.75)'; x.fill();
      crownPath(-3, -3); x.fillStyle = 'rgba(255,160,130,0.55)'; x.fill();
      crownPath(0, 0); g = x.createLinearGradient(cx - cs, cy - cs, cx + cs, cy + cs); g.addColorStop(0, '#b02e20'); g.addColorStop(1, '#7c1810'); x.fillStyle = g; x.fill();
      for (const q of [crown[1], crown[3], crown[5], crown[7]]) { const px = cx + q[0] * cs, py = cy - 10 + q[1] * cs - 14; x.fillStyle = 'rgba(25,0,0,0.7)'; x.beginPath(); x.arc(px + 3, py + 4, 9, 0, TAU); x.fill(); x.fillStyle = '#b8342a'; x.beginPath(); x.arc(px, py, 9, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,200,170,0.6)'; x.beginPath(); x.arc(px - 3, py - 3, 3, 0, TAU); x.fill(); }
      x.fillStyle = 'rgba(30,0,0,0.5)'; x.fillRect(cx - cs, cy - 10 + 0.2 * cs, cs * 2, 5);
      for (let i = 0; i < 28; i++) { const a = i / 28 * TAU, px = cx + Math.cos(a) * R * 0.68, py = cy + Math.sin(a) * R * 0.68; x.fillStyle = 'rgba(25,0,0,0.6)'; x.beginPath(); x.arc(px + 1.5, py + 2, 4, 0, TAU); x.fill(); x.fillStyle = '#a42a1e'; x.beginPath(); x.arc(px, py, 4, 0, TAU); x.fill(); }
      // gloss
      x.globalCompositeOperation = 'lighter'; g = x.createRadialGradient(cx - 80, cy - 90, 0, cx - 80, cy - 90, 120); g.addColorStop(0, 'rgba(255,220,200,0.35)'); g.addColorStop(1, 'rgba(255,220,200,0)'); x.fillStyle = g; x.fillRect(0, 0, S2, S2);
      x.restore();
      void r; return c;
    });
  }
  function letterImg() {
    return K.cached('s7:letter', () => {
      const w = 1500, h = 900, c = K.canvas(w, h), x = c.getContext('2d');
      x.drawImage(K.parchment(w, h, 1811, { edge: 0.6, stains: 2, folds: [{ x: 0.33 }, { x: 0.66 }] }), 0, 0);
      x.fillStyle = 'rgba(60,40,20,0.25)'; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w / 2, h * 0.62); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(40,24,10,0.5)'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 0); x.lineTo(w / 2, h * 0.62); x.lineTo(w, 0); x.stroke();
      x.strokeStyle = 'rgba(255,240,210,0.25)'; x.lineWidth = 2; x.beginPath(); x.moveTo(4, 4); x.lineTo(w / 2, h * 0.62 - 4); x.lineTo(w - 4, 4); x.stroke();
      return c;
    });
  }
  function shotSeal(ctx, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a - 0.3, sh.b + 0.3);
    const [sx, sy] = K.shake(t * 2.2, 10, 48), rot = -0.08 + 0.03 * Math.sin(t * 5.1) + 0.02 * u;
    ctx.save();
    ctx.fillStyle = '#050405'; ctx.fillRect(0, 0, W, H);
    // the night streaming past: torches and lamps out of focus, rain
    const br = rng(1821);
    for (let i = 0; i < 26; i++) { const sp = 600 + br() * 900, x0 = br() * (W + 800), y0 = br() * H, rr = 30 + br() * 90, xx = ((x0 - lt * sp) % (W + 800) + W + 800) % (W + 800) - 400, warm = br() < 0.7; glow(ctx, warm ? [255, 150, 70] : [120, 150, 200], xx, y0, rr, (warm ? 0.25 : 0.12) * (0.5 + br() * 0.5)); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(180,190,210,0.25)'; ctx.lineWidth = 2; for (let i = 0; i < 70; i++) { const x0 = br() * W, y0 = ((br() * H + lt * 1600) % (H + 200)) - 100; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 - 160, y0 + 40); ctx.stroke(); } ctx.restore();
    // the letter and its seal, in a gloved hand
    ctx.translate(W / 2 + sx, H / 2 + sy); ctx.rotate(rot); const z = lerp(1.0, 1.08, u); ctx.scale(z, z);
    const L = letterImg(); ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 40; ctx.drawImage(L, -760, -470, 1500, 900); ctx.restore();
    // torchlight sweeping across it as he passes the barrier
    const sweep = lerp(-1200, 1400, span(lt, 0.1, 1.2));
    ctx.save(); ctx.beginPath(); ctx.rect(-760, -470, 1500, 900); ctx.clip(); ctx.globalCompositeOperation = 'multiply'; const sg = ctx.createLinearGradient(-760, 0, 740, 0); sg.addColorStop(0, '#5a4a40'); sg.addColorStop(0.5, '#9a8a7a'); sg.addColorStop(1, '#4a3c34'); ctx.fillStyle = sg; ctx.fillRect(-760, -470, 1500, 900); ctx.restore();
    glow(ctx, [255, 160, 80], sweep, -100, 700, 0.3);
    // the cord bound round it, under the seal
    ctx.fillStyle = '#2a1408'; ctx.fillRect(-760, 60, 1500, 18); ctx.fillStyle = 'rgba(255,170,120,0.25)'; ctx.fillRect(-760, 60, 1500, 4);
    // wet spots of rain on the parchment
    const wr = rng(1822); for (let i = 0; i < 40; i++) { const px = -740 + wr() * 1460, py = -450 + wr() * 860, rr = 4 + wr() * 12, born = wr() * 1.4; if (lt < born) continue; ctx.fillStyle = 'rgba(40,26,14,0.28)'; ctx.beginPath(); ctx.ellipse(px, py, rr, rr * 0.8, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,240,220,0.35)'; ctx.beginPath(); ctx.arc(px - rr * 0.3, py - rr * 0.3, rr * 0.25, 0, TAU); ctx.fill(); }
    const SI = sealImg(); ctx.drawImage(SI, -280, -220, 560, 560);
    // beads of rain on the wax, catching the torch
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const rb = rng(1823); for (let i = 0; i < 9; i++) { const a = rb() * TAU, rr = rb() * 150, px = Math.cos(a) * rr, py = 60 + Math.sin(a) * rr, s2 = 3 + rb() * 6; ctx.fillStyle = `rgba(255,220,200,${0.5 + 0.4 * Math.sin(t * 3 + i)})`; ctx.beginPath(); ctx.arc(px, py, s2 * 0.45, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,200,180,0.15)'; ctx.beginPath(); ctx.arc(px, py, s2 * 1.4, 0, TAU); ctx.fill(); } ctx.restore();
    // the gloved thumb and fingers at the letter's edge
    ctx.fillStyle = '#0e0a08';
    ctx.beginPath(); ctx.moveTo(-900, 260); ctx.bezierCurveTo(-760, 180, -640, 200, -560, 250); ctx.bezierCurveTo(-520, 280, -540, 330, -600, 340); ctx.bezierCurveTo(-680, 350, -760, 360, -900, 420); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-900, 430); ctx.lineTo(-760, 470); ctx.lineTo(-700, 520); ctx.lineTo(-900, 620); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,160,90,0.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-760, 200); ctx.bezierCurveTo(-680, 190, -600, 210, -560, 250); ctx.stroke();
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    finish(ctx, { bloom: 0.3, shadow: '#1c2a38', shadowA: 0.25, vig: 0.7 });
  }

  // ---------------------------------------------------------------- L45: in an archive, a page of history scraped away
  const ARC = { x: 330, y: 150, w: 1300, h: 860, line: 6 };
  function archivePage() {
    return K.cached('s7:arcPage', () => {
      const c = K.canvas(ARC.w, ARC.h), x = c.getContext('2d'), r = rng(1901);
      x.drawImage(K.parchment(ARC.w, ARC.h, 1902, { edge: 0.8, stains: 3, foxing: 40 }), 0, 0);
      // a red initial and lines of a careful hand
      K.ink(x, cc => { cc.font = '600 120px Cinzel'; cc.fillText('A', 90, 220); }, { color: P.vermilion, alpha: 0.85, bleed: 1 });
      const lines = [];
      for (let ln = 0; ln < 15; ln++) {
        const y = 110 + ln * 50, x0 = ln < 3 ? 210 : 90, words = [];
        let X = x0; while (X < ARC.w - 110) { const wl = 30 + r() * 110; if (X + wl > ARC.w - 90) break; words.push([X, wl]); X += wl + 16 + r() * 10; }
        lines.push({ y, words });
        for (const [wx, wl] of words) {
          const pts = []; for (let k = 0; k <= 24; k++) { const u = k / 24; pts.push([wx + u * wl, y + Math.sin(u * 40 + wx) * 7 * (k % 3 === 0 ? 1 : 0.4) - (k % 5 === 0 ? 8 : 0)]); }
          K.ink(x, cc => K.nib(cc, K.wobble(pts, 1.2, 0.08, wx), { w: 4.2, angle: -0.7, min: 0.3, taper: 0.1, jit: 0.3, seed: wx | 0 }), { color: P.ink, alpha: 0.82, bleed: 0.8 });
        }
      }
      return { c, lines };
    });
  }
  function shotArchive(ctx, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a - 0.5, sh.b + 0.5), sc7 = K.scene(7), L45 = K.cue('L45');
    const c = { x: lerp(-60, 120, ease(u)), y: lerp(-20, 60, ease(u)), z: lerp(1.0, 1.32, ease(u)), r: -0.03 + 0.02 * u };
    const fl = flick(t, 91, 7), AP = archivePage(), line = AP.lines[ARC.line], prog = smooth(span(t, sh.a + 0.2, L45.end + 0.1));
    void sc7;
    ctx.save();
    ctx.fillStyle = '#060504'; ctx.fillRect(0, 0, W, H);
    // the shelves behind, books and scroll cases in the dark
    view(ctx, c, 0.4);
    const sr = rng(1911);
    for (let row = 0; row < 4; row++) { const y0 = -80 + row * 260; ctx.fillStyle = '#0d0a08'; ctx.fillRect(-200, y0 + 220, W + 400, 20); let X = -200; while (X < W + 200) { const bw = 18 + sr() * 40, bh = 120 + sr() * 90, sh2 = sr(); ctx.fillStyle = `rgb(${20 + sh2 * 25 | 0},${14 + sh2 * 14 | 0},${10 + sh2 * 8 | 0})`; ctx.fillRect(X, y0 + 220 - bh, bw - 3, bh); if (sr() < 0.3) { ctx.fillStyle = 'rgba(180,140,60,0.25)'; ctx.fillRect(X + 2, y0 + 220 - bh * 0.7, bw - 7, 3); } X += bw; } }
    glow(ctx, [255, 150, 70], 260, 420, 700, 0.12 * fl);
    // the desk and the page, lit by the candle at its left
    view(ctx, c, 1.0);
    ctx.fillStyle = '#140d08'; ctx.fillRect(-300, ARC.y + ARC.h - 40, W + 600, 600);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 50; ctx.drawImage(AP.c, ARC.x, ARC.y); ctx.restore();
    // the scraped line: the ink lifted, the vellum roughened pale, crumbs of ink and skin
    const lx0 = ARC.x + line.words[0][0] - 10, lx1 = ARC.x + line.words[line.words.length - 1][0] + line.words[line.words.length - 1][1] + 10, ly = ARC.y + line.y, scr = lerp(lx0, lx1, prog);
    if (prog > 0) {
      ctx.save(); ctx.beginPath(); ctx.moveTo(lx0, ly - 26); for (let X = lx0; X <= scr; X += 6) ctx.lineTo(X, ly - 24 - 5 * K.noise(X * 0.05, 1, 1912)); for (let X = scr; X >= lx0; X -= 6) ctx.lineTo(X, ly + 18 + 5 * K.noise(X * 0.05, 2, 1912)); ctx.closePath(); ctx.clip();
      ctx.fillStyle = '#d8c39b'; ctx.fillRect(lx0 - 10, ly - 40, scr - lx0 + 20, 80);
      ctx.strokeStyle = 'rgba(120,90,60,0.25)'; ctx.lineWidth = 1; const kr = rng(1913); for (let i = 0; i < 220; i++) { const X = lx0 + kr() * (scr - lx0), Y = ly - 24 + kr() * 42; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + 10 + kr() * 26, Y + (kr() - 0.5) * 3); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,248,230,0.25)'; ctx.fillRect(lx0, ly - 10, scr - lx0, 8);
      ctx.fillStyle = 'rgba(40,26,14,0.12)'; for (let i = 0; i < 60; i++) { const X = lx0 + kr() * (scr - lx0), Y = ly - 20 + kr() * 34; ctx.fillRect(X, Y, 2 + kr() * 4, 1.5); }
      ctx.restore();
      const fr = rng(1914); ctx.fillStyle = 'rgba(30,20,12,0.85)'; for (let i = 0; i < 40; i++) { const born = fr() * 2.4, age = lt - born; if (age < 0 || age > 0.9) continue; const X = lerp(lx0, lx1, clamp(born / 2.4) * prog * 1.05) + age * 40 * (fr() - 0.2), Y = ly + 10 + age * 60 + age * age * 120; ctx.fillRect(X, Y, 2 + fr() * 3, 2 + fr() * 2); }
    }
    // the light over the page: the candle's pool, the dark beyond it
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; const lg = ctx.createRadialGradient(240, 300, 60, 420, 420, 1500); lg.addColorStop(0, '#ffe2b0'); lg.addColorStop(0.35, '#b2875a'); lg.addColorStop(0.75, '#3a2818'); lg.addColorStop(1, '#100a06'); ctx.fillStyle = lg; ctx.fillRect(-300, -200, W + 600, H + 600); ctx.restore();
    // the candle
    { const cx = 170, base = 760, top = 380; const g = ctx.createLinearGradient(cx - 26, 0, cx + 26, 0); g.addColorStop(0, '#4a3624'); g.addColorStop(0.4, '#e2c89a'); g.addColorStop(1, '#3a2a1a'); ctx.fillStyle = g; ctx.fillRect(cx - 26, top, 52, base - top); ctx.fillStyle = '#e8cf9e'; ctx.beginPath(); ctx.ellipse(cx, top, 26, 9, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#0c0806'; ctx.beginPath(); ctx.ellipse(cx, base, 70, 18, 0, 0, TAU); ctx.fill(); candleFlame(ctx, cx, top - 6, 70, t, 92, 1); }
    // the hand with the knife, scraping: small strokes along the line
    {
      const stroke = Math.sin(t * 22) * 10, hx = scr + 30 + stroke, hy = ly + 4;
      ctx.save();
      ctx.fillStyle = '#c9ccd2'; ctx.beginPath(); ctx.moveTo(hx - 34, hy - 2); ctx.lineTo(hx + 50, hy - 46); ctx.lineTo(hx + 62, hy - 34); ctx.lineTo(hx - 30, hy + 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,210,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx - 34, hy - 1); ctx.lineTo(hx + 50, hy - 45); ctx.stroke();
      ctx.fillStyle = '#3a2414'; ctx.save(); ctx.translate(hx + 56, hy - 40); ctx.rotate(-0.5); ctx.fillRect(0, -9, 120, 18); ctx.restore();
      rimLit(ctx, cc => {
        const capsule = (ax, ay, bx2, by2, ra, rb) => { const dx = bx2 - ax, dy = by2 - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L; cc.beginPath(); cc.moveTo(ax + nx * ra, ay + ny * ra); cc.lineTo(bx2 + nx * rb, by2 + ny * rb); cc.lineTo(bx2 - nx * rb, by2 - ny * rb); cc.lineTo(ax - nx * ra, ay - ny * ra); cc.closePath(); cc.fill(); cc.beginPath(); cc.arc(ax, ay, ra, 0, TAU); cc.fill(); cc.beginPath(); cc.arc(bx2, by2, rb, 0, TAU); cc.fill(); };
        // the sleeve and its cuff, the forearm, the fist round the handle, the index finger laid along it, the thumb
        cc.beginPath(); cc.moveTo(hx + 300, hy - 205); cc.lineTo(hx + 760, hy - 330); cc.lineTo(hx + 800, hy - 60); cc.lineTo(hx + 330, hy - 95); cc.closePath(); cc.fill();
        capsule(hx + 175, hy - 92, hx + 320, hy - 150, 42, 52);
        cc.save(); cc.translate(hx + 128, hy - 66); cc.rotate(-0.5); cc.beginPath(); cc.ellipse(0, 0, 58, 40, 0, 0, TAU); cc.fill(); for (let k = 0; k < 4; k++) { cc.beginPath(); cc.arc(-34 + k * 22, -34, 13, 0, TAU); cc.fill(); } cc.restore();
        capsule(hx + 150, hy - 92, hx + 70, hy - 50, 12, 9);
        capsule(hx + 112, hy - 34, hx + 76, hy - 30, 13, 10);
      }, { rim: '#ffbf80', mid: '#6a3a1c', dark: '#0c0806', dx: 7, dy: 5, steps: 4 });
      ctx.restore();
    }
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    K.specks(ctx, t, { kind: 'dust', n: 50, alpha: 0.4, seed: 1915 });
    finish(ctx, { bloom: 0.35, shadow: '#1c2a38', shadowA: 0.2, vig: 0.7 });
  }

  // ---------------------------------------------------------------- L46: the camera comes to a small banner hall in the rain
  const HALL = { x: 1080, y: 760, w: 640, h: 210, roof: 300 };
  function hallOutStatic() {
    return K.cached('s7:hallOut', () => {
      const w = W + 400, h = H + 300, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(1601), OX = 200, OY = 150;
      // hills and a black wood behind
      const hz = 640 + OY;
      const h1 = ridge(0, w, X => hz - 120 - 60 * Math.sin(X * 0.002 + 1), 1602, 50, 0.004, 5, 5); fillRidge(x, h1, h, '#0f1218');
      for (let i = 0; i < 160; i++) { const X = r() * w, base = hz - 40 + r() * 70, th = 60 + r() * 140, ww = th * 0.28; x.fillStyle = `rgb(${8 + r() * 5 | 0},${9 + r() * 5 | 0},${12 + r() * 6 | 0})`; x.beginPath(); x.moveTo(X, base - th); for (let k = 1; k <= 5; k++) { const yy = base - th + th * k / 5; x.lineTo(X + ww * k / 5 * (1 + (k % 2) * 0.3), yy); x.lineTo(X + ww * 0.25 * k / 5, yy - th * 0.06); } x.lineTo(X + 4, base); x.lineTo(X - 4, base); for (let k = 5; k >= 1; k--) { const yy = base - th + th * k / 5; x.lineTo(X - ww * 0.25 * k / 5, yy - th * 0.06); x.lineTo(X - ww * k / 5 * (1 + (k % 2) * 0.3), yy); } x.closePath(); x.fill(); }
      // the ground: mud, a path to the door with puddles
      const g = x.createLinearGradient(0, hz, 0, h); g.addColorStop(0, '#0b0c0e'); g.addColorStop(1, '#040404'); x.fillStyle = g; x.fillRect(0, hz + 10, w, h - hz);
      x.fillStyle = '#121214'; x.beginPath(); x.moveTo(HALL.x + OX - 30, HALL.y + OY); x.quadraticCurveTo(HALL.x + OX - 200, HALL.y + OY + 200, HALL.x + OX - 600, h); x.lineTo(HALL.x + OX + 350, h); x.quadraticCurveTo(HALL.x + OX + 90, HALL.y + OY + 200, HALL.x + OX + 50, HALL.y + OY); x.closePath(); x.fill();
      // the hall: a low timber longhouse under a steep dark roof, smoke hole at the ridge
      const X0 = HALL.x + OX - HALL.w / 2, Y0 = HALL.y + OY;
      x.fillStyle = '#16120f'; x.fillRect(X0, Y0 - HALL.h, HALL.w, HALL.h);
      for (let k = 0; k <= 12; k++) { x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(X0 + k * HALL.w / 12 - 3, Y0 - HALL.h, 6, HALL.h); }
      x.fillStyle = '#0a0908'; x.beginPath(); x.moveTo(X0 - 50, Y0 - HALL.h + 20); x.lineTo(X0 + 90, Y0 - HALL.h - HALL.roof); x.lineTo(X0 + HALL.w - 90, Y0 - HALL.h - HALL.roof); x.lineTo(X0 + HALL.w + 50, Y0 - HALL.h + 20); x.closePath(); x.fill();
      x.save(); x.beginPath(); x.moveTo(X0 - 50, Y0 - HALL.h + 20); x.lineTo(X0 + 90, Y0 - HALL.h - HALL.roof); x.lineTo(X0 + HALL.w - 90, Y0 - HALL.h - HALL.roof); x.lineTo(X0 + HALL.w + 50, Y0 - HALL.h + 20); x.closePath(); x.clip();
      for (let i = 0; i < 2600; i++) { const px = X0 - 50 + r() * (HALL.w + 100), py = Y0 - HALL.h - HALL.roof + r() * (HALL.roof + 20), L = 8 + r() * 22; x.strokeStyle = `rgba(${r() < 0.6 ? '0,0,0' : '60,62,70'},${0.15 + r() * 0.3})`; x.lineWidth = 1 + r(); x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 4, py + L); x.stroke(); }
      const rg = x.createLinearGradient(0, Y0 - HALL.h - HALL.roof, 0, Y0 - HALL.h); rg.addColorStop(0, 'rgba(70,80,100,0.18)'); rg.addColorStop(1, 'rgba(0,0,0,0.3)'); x.fillStyle = rg; x.fillRect(X0 - 60, Y0 - HALL.h - HALL.roof, HALL.w + 120, HALL.roof + 30); x.restore();
      x.strokeStyle = 'rgba(110,120,140,0.35)'; x.lineWidth = 3; x.beginPath(); x.moveTo(X0 + 90, Y0 - HALL.h - HALL.roof); x.lineTo(X0 + HALL.w - 90, Y0 - HALL.h - HALL.roof); x.stroke();
      // the door and the window, light leaking warm through the gaps
      const dx0 = X0 + 380, dw = 90, dtop = Y0 - 170;
      const dg = x.createLinearGradient(0, dtop, 0, Y0); dg.addColorStop(0, '#c97a36'); dg.addColorStop(1, '#ffc27a'); x.fillStyle = dg; x.fillRect(dx0, dtop, dw, 170);
      x.fillStyle = '#120d0a'; x.beginPath(); x.moveTo(dx0 + dw, dtop); x.lineTo(dx0 + dw - 38, dtop + 10); x.lineTo(dx0 + dw - 38, Y0 - 4); x.lineTo(dx0 + dw, Y0); x.closePath(); x.fill();
      x.fillStyle = '#0b0807'; x.fillRect(dx0 - 8, dtop - 10, dw + 16, 10);
      const wx0 = X0 + 150, wy0 = Y0 - 150, wgr = x.createRadialGradient(wx0 + 40, wy0 + 30, 4, wx0 + 40, wy0 + 30, 60); wgr.addColorStop(0, '#ffcf8a'); wgr.addColorStop(1, '#b8682a'); x.fillStyle = wgr; x.fillRect(wx0, wy0, 80, 60);
      x.fillStyle = '#100b08'; x.fillRect(wx0 + 36, wy0, 8, 60); x.fillRect(wx0, wy0 + 26, 80, 7); x.fillRect(wx0 - 6, wy0 - 8, 92, 8); x.fillRect(wx0 + 80, wy0 - 6, 46, 72);
      // the empty banner pole by the door: nothing flies from it yet
      x.fillStyle = '#060505'; x.fillRect(dx0 + dw + 60, Y0 - 520, 9, 520); x.fillRect(dx0 + dw + 30, Y0 - 520, 70, 7);
      // light on the wet ground and puddles before the door
      x.save(); x.globalCompositeOperation = 'lighter';
      const lg = x.createRadialGradient(dx0 + dw / 2, Y0 + 20, 10, dx0 + dw / 2, Y0 + 40, 420); lg.addColorStop(0, 'rgba(200,120,50,0.35)'); lg.addColorStop(1, 'rgba(200,120,50,0)'); x.fillStyle = lg; x.fillRect(0, Y0 - 50, w, 600);
      // the door's light thrown on the mud as a wedge, and long broken reflections in the puddles
      const wg = x.createLinearGradient(0, Y0, 0, Y0 + 360); wg.addColorStop(0, 'rgba(255,170,90,0.4)'); wg.addColorStop(1, 'rgba(255,170,90,0)'); x.fillStyle = wg; x.beginPath(); x.moveTo(dx0, Y0); x.lineTo(dx0 + dw - 38, Y0); x.lineTo(dx0 + dw + 130, Y0 + 360); x.lineTo(dx0 - 220, Y0 + 360); x.closePath(); x.fill();
      for (let i = 0; i < 70; i++) { const px = dx0 + dw / 2 + (r() - 0.5) * 380, py = Y0 + 30 + r() * 300, pw = 6 + r() * 40; x.fillStyle = `rgba(255,180,100,${0.06 + r() * 0.16})`; x.fillRect(px - pw / 2, py, pw, 1.5 + r() * 2); }
      for (let i = 0; i < 30; i++) { const px = wx0 + 40 + (r() - 0.5) * 120, py = Y0 + 30 + r() * 200; x.fillStyle = `rgba(255,170,90,${0.04 + r() * 0.1})`; x.fillRect(px - 10, py, 4 + r() * 24, 1.5); }
      x.restore();
      return { c, OX, OY, door: [dx0 - OX + dw / 2, dtop - OY + 85], win: [wx0 - OX + 40, wy0 - OY + 30], smoke: [HALL.x + 40, HALL.y - HALL.h - HALL.roof] };
    });
  }
  function shotHallOut(ctx, t, sh) {
    const u = span(t, sh.a - 0.4, sh.b + 0.7), lt = t - sh.a, S = hallOutStatic();
    const pu = Math.pow(u, 1.6), c = { x: lerp(-30, S.win[0] - W / 2, pu * 0.85), y: lerp(10, S.win[1] - H / 2, pu * 0.8), z: lerp(1.0, 2.6, pu), r: 0 };
    ctx.save();
    const sk = sky('hallNight', 480, 270, { top: [5, 7, 11], mid: [12, 15, 21], low: [22, 26, 34], glow: [60, 70, 90], glowY: 0.35, glowR: 0.7, glowA: 0.6, cloud: [8, 9, 12], moon: [60, 70, 92], cover: 0.7, seed: 21 });
    view(ctx, c, 0.15); ctx.drawImage(sk, -150 - lt * 8, -100, W + 400, 900);
    glow(ctx, [120, 140, 180], 520, 160, 300, 0.14);
    view(ctx, c, 1.0); ctx.drawImage(S.c, -S.OX, -S.OY);
    // smoke from the roof, lit from beneath by the hearth inside
    K.smoke(ctx, t, { n: 12, x: S.smoke[0] - 100, y: S.smoke[1] - 560, w: 200, h: 560, color: [96, 90, 86], alpha: 0.3, rise: 22, size: 220, seed: 1611, drift: -8 });
    glow(ctx, [200, 110, 50], S.smoke[0], S.smoke[1] + 10, 120, 0.25 * flick(t, 61, 5));
    const fl = flick(t, 62, 6);
    glow(ctx, [255, 160, 80], S.door[0], S.door[1], 260, 0.3 * fl); glow(ctx, [255, 170, 90], S.win[0], S.win[1], 200, 0.3 * fl);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const q1 = proj(c, 1, S.door[0], S.door[1]), q2 = proj(c, 1, S.win[0], S.win[1]);
    rain(ctx, t, { n: 520, angle: 0.15, speed: 1600, len: 54, alpha: 0.17, lights: [{ x: q1[0], y: q1[1], r: 300 * c.z, rgb: [255, 170, 100], a: 1 }, { x: q2[0], y: q2[1], r: 240 * c.z, rgb: [255, 170, 100], a: 1 }], seed: 1612 });
    ctx.restore();
    finish(ctx, { bloom: 0.38, shadow: '#1c2c40', shadowA: 0.35, vig: 0.75 });
  }

  // ---------------------------------------------------------------- L45: a road barred, a royal messenger rides past it
  function roadStatic() {
    return K.cached('s7:road', () => {
      const w = W + 400, h = H + 300, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(1701), OX = 200, OY = 150, hz = 600 + OY;
      const sk = sky('roadNight', 480, 270, { top: [5, 6, 9], mid: [11, 13, 18], low: [20, 22, 28], glow: [80, 50, 30], glowY: 0.9, glowR: 0.6, glowA: 0.6, cloud: [8, 9, 11], moon: [40, 48, 64], cover: 0.75, seed: 31 });
      x.drawImage(sk, 0, 0, w, hz + 40);
      // a wood on both sides, black against the sky
      for (let i = 0; i < 260; i++) { const side = i % 2, X = side ? lerp(1300, w, r()) : lerp(0, 760, r()), base = hz + r() * 40, th = 160 + r() * 380, ww = th * 0.26; x.fillStyle = `rgb(${6 + r() * 5 | 0},${7 + r() * 5 | 0},${9 + r() * 5 | 0})`; x.beginPath(); x.moveTo(X, base - th); for (let k = 1; k <= 6; k++) { const yy = base - th + th * k / 6; x.lineTo(X + ww * k / 6 * (1 + (k % 2) * 0.35), yy); x.lineTo(X + ww * 0.2 * k / 6, yy - th * 0.05); } x.lineTo(X + 5, base); x.lineTo(X - 5, base); for (let k = 6; k >= 1; k--) { const yy = base - th + th * k / 6; x.lineTo(X - ww * 0.2 * k / 6, yy - th * 0.05); x.lineTo(X - ww * k / 6 * (1 + (k % 2) * 0.35), yy); } x.closePath(); x.fill(); }
      // the road, rutted and wet, running away to the barrier
      const g = x.createLinearGradient(0, hz, 0, h); g.addColorStop(0, '#0d0d0f'); g.addColorStop(1, '#050505'); x.fillStyle = g; x.fillRect(0, hz + 20, w, h - hz);
      x.fillStyle = '#16161a'; x.beginPath(); x.moveTo(OX + 860, hz + 20); x.lineTo(OX + 1100, hz + 20); x.lineTo(w + 200, h); x.lineTo(-300, h); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(150,140,130,0.12)'; x.lineWidth = 3; for (const k of [-0.6, -0.2, 0.2, 0.6]) { x.beginPath(); x.moveTo(OX + 980 + k * 80, hz + 22); x.lineTo(OX + 980 + k * 1500, h); x.stroke(); }
      return { c, OX, OY, hz: hz - OY };
    });
  }
  function shotRoad(ctx, t, sh) {
    const u = span(t, sh.a - 0.3, sh.b + 0.3), lt = t - sh.a, S = roadStatic();
    const [sx, sy] = K.shake(t * 1.2, 4, 47);
    const c = { x: lerp(-20, 30, u) + sx, y: sy, z: lerp(1.02, 1.08, u), r: 0 };
    const fl = flick(t, 71, 8);
    ctx.save();
    view(ctx, c, 0.6); ctx.drawImage(S.c, -S.OX, -S.OY);
    // the barrier: a spiked beam on trestles, the roads-house banner over it, a brazier, guards; travellers turned back
    view(ctx, c, 0.75);
    const bx = 1000, by = S.hz + 120;
    glow(ctx, [255, 130, 50], bx + 230, by - 70, 420, 0.3 * fl);
    ctx.fillStyle = '#060505';
    for (const tx of [bx - 260, bx + 140]) { ctx.beginPath(); ctx.moveTo(tx - 40, by); ctx.lineTo(tx, by - 70); ctx.lineTo(tx + 40, by); ctx.lineTo(tx + 30, by); ctx.lineTo(tx, by - 50); ctx.lineTo(tx - 30, by); ctx.closePath(); ctx.fill(); }
    ctx.fillRect(bx - 330, by - 78, 560, 14);
    for (let k = 0; k < 9; k++) { const px = bx - 310 + k * 64; ctx.beginPath(); ctx.moveTo(px - 4, by - 70); ctx.lineTo(px + 26, by - 118); ctx.lineTo(px + 6, by - 66); ctx.closePath(); ctx.fill(); }
    poleBanner(ctx, bx - 60, by - 60, 300, K.HOUSES[2], t, 3, 1.0);
    ctx.fillStyle = '#080605'; ctx.fillRect(bx + 222, by - 46, 18, 46); ctx.beginPath(); ctx.moveTo(bx + 200, by - 48); ctx.lineTo(bx + 262, by - 48); ctx.lineTo(bx + 250, by - 66); ctx.lineTo(bx + 212, by - 66); ctx.closePath(); ctx.fill();
    fire(ctx, bx + 231, by - 62, 46, 90 * fl, t, 72, { n: 5, slot: 'rb' });
    const guards = (cc, fill) => {
      person(cc, { x: bx + 120, y: by + 6, h: 170, face: -1, dress: 'mail', hat: 'kettle', hold: 'spear', armN: [0.3, 0.9], fill });
      person(cc, { x: bx - 330, y: by + 4, h: 172, face: 1, dress: 'cloak', hat: 'helm', hold: 'spear', armN: [0.3, 0.9], fill });
      person(cc, { x: bx + 330, y: by + 8, h: 166, face: -1, dress: 'mail', hat: 'helm', armN: [0.9, 0.8], fill });
      // the turned-back: a man with a handcart, a woman, a child
      person(cc, { x: bx - 520, y: by + 40, h: 180, face: -1, dress: 'tunic', hat: 'hood', walk: 1.0 + lt * 2, lean: 0.1, armN: [0.6, 0.4], fill });
      person(cc, { x: bx - 610, y: by + 44, h: 172, face: -1, dress: 'gown', hat: 'veil', walk: 2.5 + lt * 2, fill });
      person(cc, { x: bx - 660, y: by + 46, h: 112, face: -1, child: true, dress: 'tunic', hat: 'hair', walk: 0.5 + lt * 2.4, fill });
      cc.save(); cc.fillStyle = fill; cc.fillRect(bx - 470, by - 20, 110, 36); cc.beginPath(); cc.arc(bx - 440, by + 26, 26, 0, TAU); cc.fill(); cc.fillRect(bx - 520, by - 30, 60, 6); cc.restore();
    };
    rimLit(ctx, guards, { rim: `rgb(${255 * fl | 0},${150 * fl | 0},${70 * fl | 0})`, mid: '#4a2410', dark: '#050404', dx: -3.5, dy: 1, steps: 4 });
    // the messenger gallops past in front of the barrier, cloak streaming, the sealed letter at his saddle
    {
      const k = span(lt, -0.15, 1.75), hx = lerp(1900, -200, k), hy = by + 150, hh = 210, ph = lt * 19;
      view(ctx, c, 0.85);
      for (let g2 = 2; g2 >= 0; g2--) {
        const off = g2 * 22;
        ctx.save(); ctx.globalAlpha = g2 ? 0.12 : 1;
        rimLit(ctx, (cc, fill) => {
          K.horse(cc, hx + off, hy, hh, { walk: ph - g2 * 0.4, face: -1, fill, rider: { kind: 'cloak', head: 'hood', hold: 'none', arm: 1.0, bend: 0.5, lean: 0.25, fill } });
          cc.save(); cc.fillStyle = fill; const cx2 = hx + off + hh * 0.02, cy2 = hy - hh * 1.5, wv = Math.sin(ph * 0.8) * 12; cc.beginPath(); cc.moveTo(cx2, cy2); cc.bezierCurveTo(cx2 + hh * 0.25, cy2 - hh * 0.06 + wv * 0.3, cx2 + hh * 0.45, cy2 + hh * 0.05 + wv, cx2 + hh * 0.62, cy2 + wv * 1.3); cc.lineTo(cx2 + hh * 0.5, cy2 + hh * 0.28 + wv * 0.5); cc.bezierCurveTo(cx2 + hh * 0.3, cy2 + hh * 0.3, cx2 + hh * 0.15, cy2 + hh * 0.34, cx2, cy2 + hh * 0.3); cc.closePath(); cc.fill(); cc.restore();
        }, { rim: '#ffb070', mid: '#5a2a12', dark: '#040303', dx: 3, dy: 1.5, steps: 3 });
        ctx.restore();
      }
      const mr = rng(1711); ctx.fillStyle = 'rgba(30,26,22,0.8)'; for (let i = 0; i < 20; i++) { const life = mr(), age = (lt * 3 + life) % 1, ax = hx + hh * (0.6 * mr() - 0.1) + age * 90, py = hy - age * 70 + age * age * 90; ctx.beginPath(); ctx.arc(ax, py, 1.5 + mr() * 3, 0, TAU); ctx.fill(); }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const qb = proj(c, 0.75, bx + 231, by - 70);
    rain(ctx, t, { n: 480, angle: 0.22, speed: 1700, len: 56, alpha: 0.17, lights: [{ x: qb[0], y: qb[1], r: 360, rgb: [255, 160, 90], a: 1 }], seed: 1712 });
    ctx.restore();
    finish(ctx, { bloom: 0.34, shadow: '#1c2c40', shadowA: 0.32, vig: 0.72 });
  }

  // ---------------------------------------------------------------- L47: a handful of people by the fire
  const HEARTH = { x: 1010, y: 880 };
  function hallBack() {
    return K.cached('s7:hallBack', () => {
      const w = W + 400, h = H + 200, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(1501), OX = 200, OY = 100, fx = HEARTH.x + OX, fy = HEARTH.y + OY;
      x.fillStyle = '#070505'; x.fillRect(0, 0, w, h);
      // the back wall: boards and posts, warmed from below by the fire
      const g = x.createRadialGradient(fx, fy - 120, 40, fx, fy - 200, 1100); g.addColorStop(0, '#5a3820'); g.addColorStop(0.35, '#2e1d12'); g.addColorStop(0.75, '#120c08'); g.addColorStop(1, '#070505');
      x.fillStyle = g; x.fillRect(0, 0, w, fy - 60);
      for (let X = 0; X < w; X += 52 + r() * 24) { x.strokeStyle = `rgba(0,0,0,${0.45 + r() * 0.3})`; x.lineWidth = 3; x.beginPath(); x.moveTo(X, 0); x.lineTo(X, fy - 60); x.stroke(); }
      x.fillStyle = '#060404'; for (const px of [OX + 180, OX + 1700]) x.fillRect(px, 0, 70, fy);
      // roof beams over everything, the smoke-hole's dark mouth
      x.save(); x.strokeStyle = '#050303'; x.lineWidth = 46; x.beginPath(); x.moveTo(-100, 330); x.lineTo(fx, -120); x.lineTo(w + 100, 330); x.stroke(); x.lineWidth = 30; x.beginPath(); x.moveTo(0, 120); x.lineTo(w, 120); x.stroke(); x.restore();
      // tools on the wall catch the light: a scythe, a coil of rope, a horse collar
      x.strokeStyle = '#0a0706'; x.lineWidth = 9; x.beginPath(); x.moveTo(OX + 380, 300); x.lineTo(OX + 420, 760); x.stroke(); x.lineWidth = 7; x.beginPath(); x.moveTo(OX + 380, 300); x.quadraticCurveTo(OX + 260, 290, OX + 200, 360); x.stroke();
      x.save(); x.translate(OX + 520, 830); x.rotate(0.08); x.fillStyle = '#0a0706'; x.fillRect(-5, -560, 10, 560); for (const dx of [-20, 0, 20]) x.fillRect(dx - 3, -650, 6, 100); x.fillRect(-24, -560, 48, 8); x.restore();
      x.lineWidth = 10; x.beginPath(); x.ellipse(OX + 1500, 460, 50, 64, 0, 0, TAU); x.stroke(); x.lineWidth = 5; x.beginPath(); x.ellipse(OX + 1610, 420, 28, 28, 0, 0, TAU); x.stroke();
      // the floor: beaten earth and rushes, lit around the fire
      const fg = x.createRadialGradient(fx, fy, 30, fx, fy, 900); fg.addColorStop(0, '#5a3a22'); fg.addColorStop(0.3, '#2a1b10'); fg.addColorStop(1, '#060404');
      x.fillStyle = fg; x.fillRect(0, fy - 70, w, h - fy + 70);
      for (let i = 0; i < 900; i++) { const X = r() * w, Y = fy - 60 + r() * (h - fy + 60), L = 4 + r() * 18; x.strokeStyle = `rgba(${r() < 0.5 ? '0,0,0' : '120,80,40'},${0.1 + r() * 0.2})`; x.lineWidth = 1; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + (r() - 0.5) * 20, Y + (r() - 0.5) * 3); x.stroke(); }
      // the hearth's ring of stones
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, sx = fx + Math.cos(a) * 170, sy = fy + 18 + Math.sin(a) * 40; x.fillStyle = Math.sin(a) > 0 ? '#1a120c' : '#3a2616'; x.beginPath(); x.ellipse(sx, sy, 30, 17, 0, 0, TAU); x.fill(); }
      x.fillStyle = '#0d0806'; x.beginPath(); x.ellipse(fx, fy + 10, 140, 30, 0, 0, TAU); x.fill();
      return { c, OX, OY };
    });
  }
  function shotHearth(ctx, t, sh) {
    const u = span(t, sh.a - 0.6, sh.b + 0.6), lt = t - sh.a;
    const c = { x: lerp(60, -70, ease(u)), y: lerp(10, -10, u) + Math.sin(t * 0.5) * 3, z: lerp(1.0, 1.06, u), r: 0.004 * Math.sin(t * 0.3) };
    const fl = flick(t, 51, 6), fl2 = 0.85 + 0.15 * K.noise(t * 3.1, 52, 7);
    ctx.save();
    const B = hallBack();
    view(ctx, c, 0.45); ctx.drawImage(B.c, -B.OX, -B.OY);
    // the people's shadows thrown up the back wall
    {
      const Q = K.layer('s7:hsh', W / 6, H / 6), qx = Q.getContext('2d'), sway = (K.noise(t * 2.5, 9, 3) - 0.5) * 30;
      qx.setTransform(1 / 6, 0, 0, 1 / 6, 0, 0); qx.translate(HEARTH.x, HEARTH.y - 60); qx.scale(1.7, 1.55); qx.translate(-HEARTH.x + sway, -HEARTH.y);
      person(qx, { x: 760, y: 880, h: 470, face: 1, sit: 0.27, dress: 'robe', hat: 'hood', stoop: 0.7, beard: 0.6, hold: 'staff', armN: [0.55, 0.9], fill: '#000' });
      person(qx, { x: 1270, y: 885, h: 520, face: -1, dress: 'apron', hat: 'bare', bulk: 1.3, beard: 0.3, hold: 'hammer', armN: [0.05, 0.12], armF: [0.5, 1.9], fill: '#000' });
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.55 * fl2; const q = proj(c, 0.45, 0, 0); ctx.drawImage(Q, q[0] - 0, q[1] - 0, W * q[2], H * q[2]); ctx.restore();
    }
    // the fire, its light and smoke
    view(ctx, c, 0.7);
    glow(ctx, [255, 120, 40], HEARTH.x, HEARTH.y - 120, 900, 0.32 * fl);
    K.smoke(ctx, t, { n: 10, x: HEARTH.x - 220, y: 120, w: 440, h: 640, color: [96, 66, 46], alpha: 0.12, rise: 22, size: 300, seed: 511 });
    fire(ctx, HEARTH.x, HEARTH.y + 6, 250, 340 * fl, t, 501, { n: 9, slot: 'h1' });
    fire(ctx, HEARTH.x - 60, HEARTH.y + 10, 120, 200 * fl2, t + 0.7, 502, { n: 6, slot: 'h2' });
    ctx.save(); ctx.fillStyle = '#0a0503'; for (const [dx, dy, w2, rot] of [[-90, 8, 150, 0.25], [60, 12, 170, -0.3], [0, 18, 190, 0.05]]) { ctx.save(); ctx.translate(HEARTH.x + dx, HEARTH.y + dy); ctx.rotate(rot); ctx.fillRect(-w2 / 2, -10, w2, 20); ctx.restore(); } ctx.restore();
    glow(ctx, [255, 190, 110], HEARTH.x, HEARTH.y - 60, 260, 0.5 * fl);
    // the people: an elder on a stool with a staff, a child at his knee, a mother, the smith with his arms folded
    const people = (cc, fill, side) => {
      if (side < 0) {
        person(cc, { x: 610, y: 896, h: 500, face: 1, dress: 'gown', hat: 'veil', lean: 0.05, armN: [0.9, 1.6], armF: [0.8, 1.7], fill });
        person(cc, { x: 770, y: 884, h: 470, face: 1, sit: 0.27, dress: 'robe', hat: 'hood', stoop: 0.7, beard: 0.6, hold: 'staff', armN: [0.55, 0.9], tilt: 0.15, fill });
        person(cc, { x: 905, y: 925, h: 290, face: 1, child: true, sit: 0.12, dress: 'tunic', hat: 'hair', lean: 0.4, armN: [1.1, 1.3], armF: [1.0, 1.4], tilt: -0.15, fill });
      } else person(cc, { x: 1265, y: 890, h: 525, face: -1, dress: 'apron', hat: 'bare', bulk: 1.3, beard: 0.3, hold: 'hammer', armN: [0.05, 0.12], armF: [0.5, 1.9], tilt: 0.12, fill });
    };
    const rimC = `rgb(${255 * fl | 0},${170 * fl | 0},${90 * fl | 0})`;
    rimLit(ctx, (cc, f) => people(cc, f, -1), { rim: rimC, mid: '#6a3216', dark: '#070404', dx: -7, dy: 1.5, steps: 5 });
    rimLit(ctx, (cc, f) => people(cc, f, 1), { rim: rimC, mid: '#6a3216', dark: '#070404', dx: 7, dy: 1.5, steps: 5 });
    K.embers(ctx, t, { n: 22, heat: 0.7, x: HEARTH.x - 260, y: 120, w: 520, h: 760, seed: 512 });
    // the farmer close to us on the bench, his back to the lens, black against the fire; his fork against the bench
    view(ctx, c, 1.45);
    rimLit(ctx, (cc, f) => { person(cc, { x: 260, y: 1720, h: 1150, face: 1, sit: 0.3, dress: 'tunic', hat: 'hood', lean: 0.28, armN: [0.35, 0.5], armF: [0.3, 0.5], tilt: 0.12, bulk: 1.15, fill: f }); }, { rim: rimC, mid: '#5a2a12', dark: '#030202', dx: -9, dy: 3, steps: 5 });
    // the table's edge at the right, out of focus, a candle on it soft as a coin of light
    view(ctx, c, 1.9);
    ctx.fillStyle = '#040303'; ctx.beginPath(); ctx.moveTo(1640, 980); ctx.lineTo(2300, 940); ctx.lineTo(2300, 1400); ctx.lineTo(1640, 1400); ctx.closePath(); ctx.fill();
    glow(ctx, [255, 190, 120], 1900, 760, 160, 0.4 * flick(t, 37, 8)); glow(ctx, [255, 220, 170], 1900, 760, 40, 0.5);
    { const g = ctx.createLinearGradient(1880, 790, 1880, 960); g.addColorStop(0, 'rgba(120,90,60,0.6)'); g.addColorStop(1, 'rgba(20,14,10,0.6)'); ctx.fillStyle = g; ctx.fillRect(1884, 790, 32, 190); }
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    finish(ctx, { bloom: 0.4, shadow: '#1c2a38', shadowA: 0.25, vig: 0.72 });
    void lt;
  }

  // ---------------------------------------------------------------- L46: the camera passes low over the map
  // The table as a texture laid flat in the camera's heading frame (drawn with canvas operations and lit by a light map:
  // the candles' pools, the hearth from the right, a cool dark ambient), then drawn in perspective one band of screen
  // rows at a time, so the camera can glide forward over it. The ring's ink catches the candle where its reflection falls.
  const PASS = (() => {
    const hm = K.map.home, ring = BC.fromM(hm.x / K.map.W, hm.y / K.map.H), cand = BC.CANDLES[0];
    const dx = cand[0] - ring[0], dy = cand[1] - ring[1], dl = Math.hypot(dx, dy), hd = [dx / dl, dy / dl], R = [hd[1], -hd[0]];
    return { ring, cand, hd, R, O: [ring[0] - 46 * R[0] - 50 * hd[0], ring[1] - 46 * R[1] - 50 * hd[1]], LW: 92, LF: 100, s: 24 };
  })();
  function passTex() {
    return K.cached('s7:passTex', () => {
      const P = PASS, w = Math.round(P.LW * P.s), h = Math.round(P.LF * P.s), c = K.canvas(w, h), x = c.getContext('2d');
      // table cm -> texture px: x along R, y against the heading (forward is up)
      const toT = (X, Y) => { const ox = X - P.O[0], oy = Y - P.O[1]; return [(ox * P.R[0] + oy * P.R[1]) * P.s, h - (ox * P.hd[0] + oy * P.hd[1]) * P.s]; };
      const setT = () => { const a = toT(1, 0), b = toT(0, 1), o = toT(0, 0); x.setTransform(a[0] - o[0], a[1] - o[1], b[0] - o[0], b[1] - o[1], o[0], o[1]); };
      x.fillStyle = '#050403'; x.fillRect(0, 0, w, h);
      // the planks
      const WT = woodTex(), T0 = BC.TABLE, wc = K.canvas(WT.w, WT.h), wx = wc.getContext('2d'), wi = wx.createImageData(WT.w, WT.h);
      for (let i = 0; i < WT.w * WT.h; i++) { const v = WT.d[i]; wi.data[i * 4] = clamp(0.31 * v) * 255; wi.data[i * 4 + 1] = clamp(0.19 * v) * 255; wi.data[i * 4 + 2] = clamp(0.11 * v) * 255; wi.data[i * 4 + 3] = 255; }
      wx.putImageData(wi, 0, 0);
      setT(); x.drawImage(wc, T0.x0, T0.y0, T0.x1 - T0.x0, T0.y1 - T0.y0);
      // the standard's pale edge, far to one side
      x.beginPath(); [[0, 0], [70, 0], [70, 99], [35, 115], [0, 99]].forEach(([a, b], i) => { const q = BC.fromB(a, b); i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); }); x.closePath(); x.fillStyle = '#d9cfba'; x.fill();
      // the map, its shadow on the wood, then the paper and ink with the red ring
      const MT = mapTex(0.75), mw = BC.MW, mh = BC.MH, m0 = BC.fromM(0, 0), Au = BC.Au, Av = BC.Av;
      x.save(); x.transform(Au[0], Au[1], Av[0], Av[1], m0[0], m0[1]);
      x.fillStyle = 'rgba(0,0,0,0.5)'; x.filter = 'blur(6px)'; x.fillRect(0.3, 0.4, mw, mh); x.filter = 'none';
      x.drawImage(MT.c, 0, 0, mw, mh);
      x.restore();
      // the light: a cool dark ambient, the candles' pools, the hearth from the right; multiplied over the albedo
      const L = K.canvas(w, h), lx = L.getContext('2d');
      lx.fillStyle = 'rgb(40,44,56)'; lx.fillRect(0, 0, w, h); lx.globalCompositeOperation = 'lighter';
      for (const C of BC.CANDLES) { const q = toT(C[0], C[1]), r = 70 * P.s; const g = lx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r); g.addColorStop(0, `rgba(255,214,150,${C[3]})`); g.addColorStop(0.2, `rgba(240,170,100,${0.7 * C[3]})`); g.addColorStop(0.55, `rgba(160,90,40,${0.25 * C[3]})`); g.addColorStop(1, 'rgba(0,0,0,0)'); lx.fillStyle = g; lx.fillRect(q[0] - r, q[1] - r, 2 * r, 2 * r); }
      const hA = toT(-110, 0), hB = toT(40, 0), hg = lx.createLinearGradient(hA[0], hA[1], hB[0], hB[1]); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(1, 'rgba(150,70,30,0.45)'); lx.fillStyle = hg; lx.fillRect(0, 0, w, h);
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'multiply'; x.drawImage(L, 0, 0);
      // the candle's foot on the map's corner
      x.globalCompositeOperation = 'source-over'; setT(); const cq = BC.CANDLES[0]; x.fillStyle = 'rgba(0,0,0,0.55)'; x.beginPath(); x.ellipse(cq[0] + 1.2, cq[1] - 0.6, 5.2, 4.2, 0, 0, TAU); x.fill();
      return { c, w, h, toT };
    });
  }
  // draw a texture laid on the plane Z = 0 through a heading camera, one band of rows at a time
  function mode7(ctx, tex, cam, y0, bands) {
    const P = PASS, s = P.s, step = bands || 3;
    for (let y = Math.max(0, Math.ceil(y0)); y < H; y += step) {
      const row = (yy) => { const k = -(yy - cam.cy0) / cam.f, d = [cam.F[0] + cam.U[0] * k, cam.F[1] + cam.U[1] * k, cam.F[2] + cam.U[2] * k]; if (d[2] >= -1e-4) return null; const tau = (0.05 - cam.C[2]) / d[2]; return { G: [cam.C[0] + d[0] * tau, cam.C[1] + d[1] * tau], tau }; };
      const a = row(y), b = row(Math.min(H, y + step)); if (!a || !b) continue;
      const ta = tex.toT(a.G[0], a.G[1]), tb = tex.toT(b.G[0], b.G[1]), half = cam.cx0 * a.tau / cam.f * s, halfR = (W - cam.cx0) * a.tau / cam.f * s;
      const sy = Math.min(ta[1], tb[1]), sh = Math.max(0.5, Math.abs(tb[1] - ta[1]));
      ctx.drawImage(tex.c, ta[0] - half, sy, half + halfR, sh, 0, y, W, Math.min(step, H - y) + 0.6);
    }
  }
  function shotPass(ctx, t, sh) {
    const P = PASS, u = span(t, sh.a - 0.5, sh.b + 0.6), k = ease(clamp(u / 0.8)), rise = smooth(span(u, 0.6, 1));
    // a glide toward the ring, a little to one side of the candle; the flame's reflection crosses the ink halfway; then up
    const yaw = 0.3, hd = [P.hd[0] * Math.cos(yaw) - P.hd[1] * Math.sin(yaw), P.hd[0] * Math.sin(yaw) + P.hd[1] * Math.cos(yaw)];
    const dist = lerp(46, 19, k) - rise * 4, lat = 2.5 + Math.sin(t * 0.8) * 0.3, hgt = lerp(17, 22, k) + rise * 26;
    const C = [P.ring[0] - hd[0] * dist + hd[1] * lat, P.ring[1] - hd[1] * dist - hd[0] * lat, hgt];
    const pitch = Math.atan2(hgt, dist + 7 - rise * 6) - 0.1 + rise * 0.12, dirv = [hd[0] * Math.cos(pitch), hd[1] * Math.cos(pitch), -Math.sin(pitch)];
    const cam = camera3(C, [C[0] + dirv[0] * 100, C[1] + dirv[1] * 100, C[2] + dirv[2] * 100], 1080, 960, 540);
    const tex = passTex(), fl = flick(t, 31, 8);
    ctx.save();
    ctx.fillStyle = '#060504'; ctx.fillRect(0, 0, W, H);
    // the wall beyond, with its window of rain, behind the candle
    const hz = cam.proj3(C[0] + P.hd[0] * 400, C[1] + P.hd[1] * 400, 0)[1];
    const WI = wallImg(); ctx.save(); ctx.translate(-700 + lat * 8, hz - 470); ctx.scale(1.15, 1.15); ctx.drawImage(WI.c, 0, 0); ctx.restore();
    // the table, in perspective, from just above the paper
    const edge = cam.proj3(C[0] + P.hd[0] * 160, C[1] + P.hd[1] * 160, 0)[1];
    mode7(ctx, tex, cam, Math.max(0, edge - 2), 3);
    // the far edge of the table, darker, and a haze over the distance
    { const g = ctx.createLinearGradient(0, hz - 40, 0, hz + 260); g.addColorStop(0, 'rgba(6,5,4,0.9)'); g.addColorStop(1, 'rgba(6,5,4,0)'); ctx.fillStyle = g; ctx.fillRect(0, hz - 40, W, 300); }
    // the ring's ink catches the candle: the glint follows the candle's reflection across the paper
    {
      const hm = K.map.home, Lc = [P.cand[0], P.cand[1], P.cand[2] + 2];
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 72; i++) {
        const t0 = -2.4 + pass * 0.9 + i / 72 * TAU * (pass ? 0.93 : 1.12), t1 = t0 + TAU / 72 * 1.05;
        const pt = (tt) => { const ex = pass ? 1.05 : 0.98, ey = pass ? 0.94 : 1.03, rot = pass ? 0.06 : -0.04, ux = Math.cos(tt) * hm.rx * ex, uy = Math.sin(tt) * hm.ry * ey; const mx2 = hm.x + 4 * pass + ux * Math.cos(rot) - uy * Math.sin(rot), my2 = hm.y - 3 * pass + ux * Math.sin(rot) + uy * Math.cos(rot); return BC.fromM(mx2 / K.map.W, my2 / K.map.H); };
        const A = pt(t0), B = pt(t1), M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
        const V = [C[0] - M[0], C[1] - M[1], C[2]], Ld = [Lc[0] - M[0], Lc[1] - M[1], Lc[2]], vl = Math.hypot(...V), ll = Math.hypot(...Ld), Hh = [V[0] / vl + Ld[0] / ll, V[1] / vl + Ld[1] / ll, V[2] / vl + Ld[2] / ll], hl = Math.hypot(...Hh);
        const cosH = Math.max(0, Hh[2] / hl), spec = Math.pow(cosH, 260) * fl, soft = Math.pow(cosH, 40) * fl;
        if (soft < 0.01) continue;
        const qa = cam.proj3(A[0], A[1], 0.06), qb = cam.proj3(B[0], B[1], 0.06); if (qa[2] < 1 || qb[2] < 1) continue;
        const wpx = 0.12 * cam.f / qa[2];
        ctx.lineCap = 'butt'; ctx.strokeStyle = `rgba(255,110,70,${clamp(soft * 0.3)})`; ctx.lineWidth = wpx * 1.8; ctx.beginPath(); ctx.moveTo(qa[0], qa[1]); ctx.lineTo(qb[0], qb[1]); ctx.stroke();
        ctx.strokeStyle = `rgba(255,236,200,${clamp(spec * 1.4)})`; ctx.lineWidth = wpx * 0.8; ctx.beginPath(); ctx.moveTo(qa[0], qa[1]); ctx.lineTo(qb[0], qb[1]); ctx.stroke();
      }
      // a broad sheen on the paper where the flame is mirrored
      const fr = C[2] / (C[2] + Lc[2]), mp = [C[0] + (Lc[0] - C[0]) * fr, C[1] + (Lc[1] - C[1]) * fr], q = cam.proj3(mp[0], mp[1], 0.05);
      if (q[2] > 1) { ctx.save(); ctx.translate(q[0], q[1]); ctx.scale(1, 0.32); glow(ctx, [255, 196, 130], 0, 0, 2400 / q[2] * 9, 0.16 * fl); ctx.restore(); }
      ctx.restore();
    }
    // the candle that weighs the corner down, close and huge, the other further off
    candle(ctx, cam, BC.CANDLES[1][0], BC.CANDLES[1][1], BC.CANDLES[1][2] - 3, t, 38, 0.9);
    candle(ctx, cam, P.cand[0], P.cand[1], P.cand[2] - 3, t, 31, 1);
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // dust in the light, a shallow focus: the near paper and the far wall soften
    K.specks(ctx, t, { kind: 'dust', n: 40, alpha: 0.35, seed: 461 });
    finish(ctx, { bloom: 0.34, shadow: '#1c2a38', shadowA: 0.25, vig: 0.75, vigIn: 0.25 });
  }

  // the hall's back wall behind the table: planks warmed from the right by the hearth, a small window of rain at the left
  const WALL = { win: [455, 96, 300, 196] };
  function wallImg() {
    return K.cached('s7:wall', () => {
      const w = W + 300, h = 760, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(1201), OX = 150;
      const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#0d0b0a'); g.addColorStop(0.45, '#1c140f'); g.addColorStop(0.8, '#3a2618'); g.addColorStop(1, '#4a2f1c');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      // vertical boards, converging a little toward the floor (we look down on the wall)
      for (let X = -40; X < w + 40; X += 58 + r() * 26) {
        const k = X / w; x.strokeStyle = `rgba(0,0,0,${0.5 + r() * 0.3})`; x.lineWidth = 3 + r() * 2;
        x.beginPath(); x.moveTo(X, 0); x.lineTo(X + (X - w / 2) * -0.06, h); x.stroke();
        x.strokeStyle = `rgba(255,190,120,${0.04 + 0.08 * k})`; x.lineWidth = 1; x.beginPath(); x.moveTo(X + 3, 0); x.lineTo(X + 3 + (X - w / 2) * -0.06, h); x.stroke();
        for (let q = 0; q < 6; q++) { const yy = r() * h, ll = 30 + r() * 120; x.strokeStyle = `rgba(0,0,0,${0.1 + r() * 0.12})`; x.beginPath(); x.moveTo(X + 10 + r() * 40, yy); x.lineTo(X + 10 + r() * 40, yy + ll); x.stroke(); }
      }
      // a heavy beam across, and a post
      x.fillStyle = '#080605'; x.fillRect(0, 26, w, 34); x.fillRect(OX + 1180, 0, 60, h);
      // the window: a deep reveal, a cold glow, its shutter half open
      const [wx, wy, ww, wh] = WALL.win, X0 = wx + OX;
      x.fillStyle = '#05070a'; x.fillRect(X0 - 16, wy - 14, ww + 32, wh + 28);
      const wg = x.createLinearGradient(0, wy, 0, wy + wh); wg.addColorStop(0, '#2a3446'); wg.addColorStop(1, '#141a24'); x.fillStyle = wg; x.fillRect(X0, wy, ww, wh);
      x.fillStyle = '#0a0705'; x.fillRect(X0 + ww * 0.48, wy, 12, wh); x.fillRect(X0, wy + wh * 0.5, ww, 10);
      x.fillStyle = '#100b08'; x.beginPath(); x.moveTo(X0 + ww, wy - 6); x.lineTo(X0 + ww + 120, wy + 10); x.lineTo(X0 + ww + 120, wy + wh - 6); x.lineTo(X0 + ww, wy + wh + 6); x.closePath(); x.fill();
      x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(X0 - 16, wy + wh + 14, ww + 32, 40);
      const fg = x.createLinearGradient(0, 380, 0, h); fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,0.85)'); x.fillStyle = fg; x.fillRect(0, 380, w, h - 380);
      return { c, OX };
    });
  }
  // the props on the table, drawn in screen space through the table camera
  // a candle flame: a teardrop with a white-hot heart, a yellow body, an orange tip and a blue root; it sways and stretches
  function candleFlame(ctx, x, y, h, t, seed, I = 1) {
    const st = 0.9 + 0.18 * K.noise(t * 5.5, seed, 81) + 0.06 * Math.sin(t * 13 + seed), sw = (K.noise(t * 2.2, seed, 82) - 0.5) * h * 0.25, hh = h * st, ww = h * 0.21;
    glow(ctx, [255, 160, 80], x, y - hh * 0.45, hh * 7, 0.2 * I);
    glow(ctx, [255, 205, 140], x, y - hh * 0.45, hh * 2.2, 0.5 * I);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const path = (k) => { ctx.beginPath(); ctx.moveTo(x, y + ww * 0.3 * k); ctx.bezierCurveTo(x - ww * 1.1 * k, y - hh * 0.05, x - ww * 0.8 * k + sw * 0.3, y - hh * 0.55 * k, x + sw, y - hh * k); ctx.bezierCurveTo(x + ww * 0.8 * k + sw * 0.3, y - hh * 0.55 * k, x + ww * 1.1 * k, y - hh * 0.05, x, y + ww * 0.3 * k); };
    let g = ctx.createLinearGradient(0, y, 0, y - hh); g.addColorStop(0, `rgba(90,110,200,${0.5 * I})`); g.addColorStop(0.15, `rgba(255,170,70,${0.6 * I})`); g.addColorStop(0.6, `rgba(255,140,50,${0.5 * I})`); g.addColorStop(1, 'rgba(255,90,20,0)');
    path(1.25); ctx.fillStyle = g; ctx.fill();
    g = ctx.createLinearGradient(0, y, 0, y - hh); g.addColorStop(0, `rgba(255,200,120,${0.4 * I})`); g.addColorStop(0.25, `rgba(255,236,190,${0.95 * I})`); g.addColorStop(0.75, `rgba(255,200,110,${0.7 * I})`); g.addColorStop(1, 'rgba(255,160,60,0)');
    path(0.85); ctx.fillStyle = g; ctx.fill();
    g = ctx.createRadialGradient(x, y - hh * 0.3, 0, x, y - hh * 0.3, ww * 0.9); g.addColorStop(0, `rgba(255,255,240,${0.9 * I})`); g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x + sw * 0.2, y - hh * 0.3, ww * 0.6, hh * 0.32, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function candle(ctx, cam, X, Y, hgt, t, seed, I) {
    const base = cam.proj3(X, Y, 0), top = cam.proj3(X, Y, hgt);
    if (base[2] < 3 || top[2] < 3) return top;
    const r = 1.35 * cam.f / base[2], rt = 1.35 * cam.f / top[2], dish = 3.8 * cam.f / base[2];
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(base[0] + dish * 0.3, base[1] + dish * 0.12, dish * 1.3, dish * 0.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0b0807'; ctx.beginPath(); ctx.ellipse(base[0], base[1], dish, dish * 0.52, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,170,90,${0.4 * Math.min(1, I)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(base[0], base[1] - 1, dish * 0.95, dish * 0.48, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    // the wax: a cylinder, its top glowing where the flame shows through it
    const quad = () => { ctx.beginPath(); ctx.moveTo(base[0] - r, base[1]); ctx.lineTo(top[0] - rt, top[1]); ctx.lineTo(top[0] + rt, top[1]); ctx.lineTo(base[0] + r, base[1]); ctx.quadraticCurveTo(base[0], base[1] + r * 0.55, base[0] - r, base[1]); ctx.closePath(); };
    quad(); const g = ctx.createLinearGradient(top[0] - rt, 0, top[0] + rt, 0); g.addColorStop(0, '#3a2a1c'); g.addColorStop(0.28, '#b9976c'); g.addColorStop(0.5, '#e2c79c'); g.addColorStop(0.78, '#8a6a46'); g.addColorStop(1, '#2a1c12'); ctx.fillStyle = g; ctx.fill();
    ctx.save(); quad(); ctx.clip(); const g2 = ctx.createLinearGradient(0, top[1], 0, base[1]); g2.addColorStop(0, `rgba(255,200,130,${0.75 * Math.min(1, I)})`); g2.addColorStop(0.25, `rgba(255,170,90,${0.25 * Math.min(1, I)})`); g2.addColorStop(1, 'rgba(0,0,0,0.35)'); ctx.fillStyle = g2; ctx.fillRect(top[0] - r * 2, top[1] - 4, r * 4, base[1] - top[1] + 8);
    const rr = rng(seed); ctx.fillStyle = 'rgba(230,200,150,0.55)'; for (let k = 0; k < 3; k++) { const dx = (rr() - 0.5) * rt * 1.4, L = (0.15 + rr() * 0.4) * (base[1] - top[1]); if (Math.abs(L) < 1) continue; ctx.beginPath(); ctx.ellipse(top[0] + dx, top[1] + L / 2, rt * 0.14, Math.abs(L) / 2, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = '#e8c48c'; ctx.beginPath(); ctx.ellipse(top[0], top[1], rt, rt * 0.42, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#140b06'; ctx.fillRect(top[0] - 0.9, top[1] - rt * 0.9, 1.8, rt * 0.9);
    ctx.restore();
    candleFlame(ctx, top[0], top[1] - rt * 0.55, 2.9 * cam.f / top[2], t, seed, I);
    return top;
  }
  function crossbar(ctx, cam, light = 1) {
    // a quad along the banner's top edge between a0 and a1 (banner coords), w cm wide, at height z
    const band = (a0, a1, bb, z, wcm) => { const p0 = BC.fromB(a0, bb), p1 = BC.fromB(a1, bb), A = cam.proj3(p0[0], p0[1], z), B = cam.proj3(p1[0], p1[1], z), w0 = wcm * cam.f / A[2], w1 = wcm * cam.f / B[2], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1; return { A, B, w0, w1, nx: -dy / L, ny: dx / L }; };
    const fillBand = (q, stops) => { const g = ctx.createLinearGradient(q.A[0] + q.nx * q.w0 / 2, q.A[1] + q.ny * q.w0 / 2, q.A[0] - q.nx * q.w0 / 2, q.A[1] - q.ny * q.w0 / 2); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(q.A[0] + q.nx * q.w0 / 2, q.A[1] + q.ny * q.w0 / 2); ctx.lineTo(q.B[0] + q.nx * q.w1 / 2, q.B[1] + q.ny * q.w1 / 2); ctx.lineTo(q.B[0] - q.nx * q.w1 / 2, q.B[1] - q.ny * q.w1 / 2); ctx.lineTo(q.A[0] - q.nx * q.w0 / 2, q.A[1] - q.ny * q.w0 / 2); ctx.closePath(); ctx.fill(); };
    ctx.save();
    // the rod, the whole length, then the cloth's sleeve wrapped over it
    const rod = band(-11, 81, 2.0, 1.6, 2.8);
    fillBand(rod, [[0, '#120a06'], [0.45, '#5c3c24'], [0.7, '#2a1a0e'], [1, '#0a0605']]);
    const k = clamp(light, 0, 1.4), cA = (v) => `rgb(${Math.min(255, v[0] * k) | 0},${Math.min(255, v[1] * k) | 0},${Math.min(255, v[2] * k) | 0})`;
    const sl = band(0.2, 69.8, 2.1, 1.7, 4.2);
    fillBand(sl, [[0, cA([60, 46, 36])], [0.3, cA([196, 168, 130])], [0.55, cA([226, 200, 160])], [0.85, cA([120, 98, 76])], [1, cA([40, 30, 24])]]);
    // the sleeve's stitched seam
    ctx.strokeStyle = `rgba(80,60,44,${0.5})`; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(sl.A[0] - sl.nx * sl.w0 * 0.35, sl.A[1] - sl.ny * sl.w0 * 0.35); ctx.lineTo(sl.B[0] - sl.nx * sl.w1 * 0.35, sl.B[1] - sl.ny * sl.w1 * 0.35); ctx.stroke(); ctx.setLineDash([]);
    // iron finials at the ends
    for (const [P, wd] of [[rod.A, rod.w0], [rod.B, rod.w1]]) { ctx.fillStyle = '#0a0a0b'; ctx.beginPath(); ctx.ellipse(P[0], P[1], wd * 0.85, wd * 0.7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,190,120,0.35)'; ctx.beginPath(); ctx.ellipse(P[0] - wd * 0.2, P[1] - wd * 0.2, wd * 0.25, wd * 0.15, 0, 0, TAU); ctx.fill(); }
    // the hanging cord, lying loose on the table behind the standard
    const c0 = BC.fromB(-9, 1.5), c1 = BC.fromB(79, 1.5), pts = [];
    for (let i = 0; i <= 30; i++) { const u = i / 30, p = [lerp(c0[0], c1[0], u), lerp(c0[1], c1[1], u)]; const off = Math.sin(u * Math.PI) * 9 + Math.sin(u * 9) * 1.2; pts.push(cam.proj3(p[0] + BC.B[0] * -off, p[1] + BC.B[1] * -off, 0.5)); }
    ctx.strokeStyle = '#3a120c'; ctx.lineWidth = 0.9 * cam.f / pts[15][2]; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,150,90,0.25)'; ctx.lineWidth *= 0.4; ctx.stroke();
    ctx.restore();
  }
  function threadAndNeedle(ctx, cam, t) {
    const sp = BC.fromB(82, 34), base = cam.proj3(sp[0], sp[1], 0), top = cam.proj3(sp[0], sp[1], 4.2), r = 1.7 * cam.f / base[2];
    ctx.save();
    // a little wooden spool wound with red thread
    ctx.fillStyle = '#2a190e'; ctx.beginPath(); ctx.ellipse(base[0], base[1], r * 1.35, r * 0.7, 0, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(top[0] - r, 0, top[0] + r, 0); g.addColorStop(0, '#4a0e08'); g.addColorStop(0.4, '#b5261a'); g.addColorStop(1, '#3a0a06');
    ctx.fillStyle = g; ctx.fillRect(top[0] - r, top[1], r * 2, base[1] - top[1]);
    ctx.fillStyle = '#3a2414'; ctx.beginPath(); ctx.ellipse(top[0], top[1], r * 1.35, r * 0.7, 0, 0, TAU); ctx.fill();
    // the thread running across onto the cloth, to a needle in its corner, where a device might one day be sewn
    const nd = BC.fromB(57, 17), nA = cam.proj3(nd[0], nd[1], 0.9), nB = cam.proj3(nd[0] + 2.4, nd[1] + 0.8, 0.5);
    ctx.strokeStyle = 'rgba(150,26,18,0.95)'; ctx.lineWidth = Math.max(1, 0.25 * cam.f / base[2]); ctx.beginPath(); ctx.moveTo(top[0] - r * 0.6, top[1] + r * 0.6);
    const mid = cam.proj3((sp[0] + nd[0]) / 2 + 2, (sp[1] + nd[1]) / 2 - 3, 0.4); ctx.quadraticCurveTo(mid[0], mid[1], nA[0], nA[1]); ctx.stroke();
    ctx.strokeStyle = '#c9c4bb'; ctx.lineWidth = Math.max(1, 0.18 * cam.f / nA[2]); ctx.beginPath(); ctx.moveTo(nA[0], nA[1]); ctx.lineTo(nB[0], nB[1]); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,220,170,${0.5 + 0.3 * Math.sin(t * 2)})`; ctx.lineWidth *= 0.6; ctx.beginPath(); ctx.moveTo(lerp(nA[0], nB[0], 0.3), lerp(nA[1], nB[1], 0.3)); ctx.lineTo(lerp(nA[0], nB[0], 0.6), lerp(nA[1], nB[1], 0.6)); ctx.stroke();
    ctx.restore();
  }
  // the people's shadows thrown on the wall by the hearth (soft, flickering)
  function wallShadows(ctx, t, a) {
    if (a <= 0) return;
    const Q = K.layer('s7:wsh', W / 6, H / 6), qx = Q.getContext('2d'), sway = Math.sin(t * 2.3) * 4 + (K.noise(t * 3, 1, 5) - 0.5) * 8;
    qx.scale(1 / 6, 1 / 6); qx.transform(1, 0, -0.18, 1, 0, 0);
    const f = '#000';
    person(qx, { x: 820 + sway, y: 560, h: 620, face: 1, sit: 0.27, dress: 'robe', hat: 'hood', stoop: 0.6, beard: 0.5, hold: 'staff', armN: [0.5, 0.9], fill: f });
    person(qx, { x: 1060 + sway * 1.2, y: 600, h: 400, face: -1, child: true, sit: 0.2, dress: 'tunic', hat: 'hair', lean: 0.3, armN: [0.6, 1.4], fill: f });
    person(qx, { x: 1380 + sway * 1.4, y: 640, h: 760, face: -1, dress: 'apron', hat: 'bare', bulk: 1.25, armN: [0.3, 1.9], armF: [0.25, 1.8], fill: f });
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = a; ctx.imageSmoothingQuality = 'high'; ctx.filter = 'none';
    ctx.drawImage(Q, 0, 0, W, H); ctx.restore();
  }
  function shotBanner(ctx, t, sh) {
    const lt = t - sh.a, sc7 = K.scene(7), L48 = K.cue('L48'), L49 = K.cue('L49'), L50 = K.cue('L50'), cam = BC.cam;
    // the camera: wide on the table, then a slow push down onto the standard as the light rises on it
    const k1 = ease(span(t, sh.a - 0.6, L48.end + 0.5)), k2 = ease(span(t, L48.end, L50.end + 1.5)), k3 = span(t, L50.end, sc7.end);
    const zz = lerp(lerp(1.05, 1.32, k1), 2.05, k2) + 0.05 * k3, cxv = lerp(lerp(915, 990, k1), 1060, k2) + Math.sin(t * 0.21) * 6, cyv = lerp(lerp(585, 650, k1), 700, k2) + Math.sin(t * 0.17) * 4;
    const c = { x: cxv - W / 2, y: cyv - H / 2, z: zz, r: -0.01 + 0.012 * k2 };
    const rise = smooth(span(t, L49.start - 0.5, L50.end + 0.5)), fade = smooth(span(t, L50.end + 0.6, sc7.end - 0.25));
    const fl = flick(t, 21, 7), hf = 0.85 + 0.15 * K.noise(t * 2.2, 3, 33) + 0.06 * Math.sin(t * 7.1);
    const RW = tableRender('wide', cam, -60, 300, 2040, 860, 1.12, { tex: 0.25 });
    const bb = (() => { const q = [[0, 0], [70, 0], [70, 99], [35, 115], [0, 99]].map(([a, b]) => { const p = BC.fromB(a, b); return cam.proj3(p[0], p[1], 0); }); const xs = q.map(v => v[0]), ys = q.map(v => v[1]); return [Math.min(...xs) - 70, Math.min(...ys) - 60, Math.max(...xs) - Math.min(...xs) + 140, Math.max(...ys) - Math.min(...ys) + 120]; })();
    const RC = tableRender('close', cam, Math.round(bb[0]), Math.round(bb[1]), Math.round(bb[2]), Math.round(bb[3]), 2.2, { tex: 0.5, feather: 60 });
    ctx.save();
    ctx.fillStyle = '#040303'; ctx.fillRect(0, 0, W, H);
    // the wall, its window of rain, the people's shadows on it
    view(ctx, c, 0.75);
    const WI = wallImg(); ctx.drawImage(WI.c, -WI.OX, 0);
    { const [wx, wy, ww, wh] = WALL.win; ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip(); ctx.strokeStyle = 'rgba(150,170,200,0.35)'; ctx.lineWidth = 1; const rr = rng(1301); for (let i = 0; i < 40; i++) { const x0 = wx + rr() * ww, sp = 300 + rr() * 300, yy = wy + ((rr() * wh + t * sp) % (wh + 40)) - 20; ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 - 4, yy + 18 + rr() * 14); ctx.stroke(); } glow(ctx, [90, 110, 150], wx + ww / 2, wy + wh / 2, ww * 0.9, 0.12); ctx.restore(); }
    wallShadows(ctx, t, 0.62 * (1 - rise * 0.5));
    glow(ctx, [255, 140, 60], 1900, 300, 900, 0.16 * hf);
    // the table, sharper over the standard
    view(ctx, c, 1.0);
    const ic = 0.95 * fl * (1 + 0.3 * rise), ih = 0.9 * hf * (1 + 0.45 * rise);
    drawBannerRender(ctx, RW, ic, ih);
    drawBannerRender(ctx, RC, ic, ih);
    // the table's front edge
    { const A = cam.proj3(-105, -58, 0), B = cam.proj3(105, -58, 0); ctx.fillStyle = '#060404'; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(B[0], B[1] + 200); ctx.lineTo(A[0], A[1] + 200); ctx.closePath(); ctx.fill(); }
    crossbar(ctx, cam, 0.62 * ic + 0.25); threadAndNeedle(ctx, cam, t);
    const tops = BC.CANDLES.map((L, i) => candle(ctx, cam, L[0], L[1], L[2] - 3, t, 31 + i * 7, (1 + 0.4 * rise) * (i ? 1 : 0.9)));
    // dust turning in the candlelight, embers drifting from the hearth
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const dr = rng(1401);
    for (let i = 0; i < 70; i++) { const T2 = tops[i % 2], ph = dr() * TAU, rad = 40 + dr() * 260, sp = 0.05 + dr() * 0.12, x = T2[0] + Math.cos(ph + t * sp) * rad, y = T2[1] + Math.sin(ph * 1.3 + t * sp * 0.8) * rad * 0.6 - 30; const a = 0.25 * (1 - rad / 300) * (0.5 + 0.5 * Math.sin(t * 1.3 + ph * 5)); ctx.fillStyle = `rgba(255,220,170,${clamp(a)})`; ctx.fillRect(x, y, 1.6, 1.6); }
    ctx.restore();
    // the light rises on the standard: a warm bloom gathers over the cloth
    if (rise > 0) { const ctr = BC.fromB(36, 52), q = cam.proj3(ctr[0], ctr[1], 1); glow(ctx, [255, 186, 110], q[0], q[1], 640, 0.16 * rise * fl); glow(ctx, [255, 220, 170], q[0] - 60, q[1] - 80, 300, 0.1 * rise * fl); }
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    K.embers(ctx, t, { n: 16, heat: 0.5 + 0.3 * rise, x: 900, y: 0, w: 1100, h: 900, seed: 77 });
    finish(ctx, { bloom: 0.3 + 0.1 * rise, shadow: '#1c2a38', shadowA: 0.22, vig: 0.62 + 0.25 * rise, vigIn: 0.3 - 0.08 * rise });
    // the light goes out of everything but the embers
    if (fade > 0) { ctx.fillStyle = `rgba(3,2,2,${fade * 0.97})`; ctx.fillRect(0, 0, W, H); K.embers(ctx, t, { n: 22, heat: 0.55 * fade, x: 0, y: 0, w: W, h: H, seed: 78 }); }
    void lt;
  }

  // ================================================================ stand-ins for shots still to be built
  function stand(label, rgb) {
    return (ctx, t, sh) => { ctx.fillStyle = `rgb(${rgb})`; ctx.fillRect(0, 0, W, H); K.text(ctx, label, W / 2, H / 2, '500 40px Cinzel', P.bone, 6, 'center', 0.7); K.text(ctx, (t - sh.a).toFixed(2), W / 2, H / 2 + 60, '400 28px Cinzel', P.ash, 2, 'center', 0.6); };
  }

  // ================================================================ the cut: shots keyed to the narration
  let PLAN = null;
  function plan(sc) {
    if (PLAN) return PLAN;
    const c = K.cue, L44 = c('L44'), L45 = c('L45'), L46 = c('L46'), L47 = c('L47'), L48 = c('L48');
    const b = [sc.start, L44.start - 0.1, lerp(L44.start, L44.end, 0.5), L45.start - 0.1, lerp(L45.start, L45.end, 0.36), lerp(L45.start, L45.end, 0.58), L45.end + 0.25, L46.start + 0.45, L47.start + 0.4, L48.start - 0.1, sc.end + 2];
    const S = [
      { id: 'muster', fn: shotMuster, x: 0.3 },
      { id: 'firstborn', fn: shotFirstborn, x: 0.3 },
      { id: 'traitor', fn: shotTraitor, x: 0.3 },
      { id: 'road', fn: shotRoad, x: 0.25 },
      { id: 'seal', fn: shotSeal, x: 0.25 },
      { id: 'archive', fn: shotArchive, x: 0.6 },
      { id: 'hallOut', fn: shotHallOut, x: 0.7 },
      { id: 'pass', fn: shotPass, x: 0.8 },
      { id: 'hearth', fn: shotHearth, x: 1.2 },
      { id: 'banner', fn: shotBanner, x: 0 },
    ];
    S.forEach((s, i) => { s.a = b[i]; s.b = b[i + 1]; });
    PLAN = S; return S;
  }

  SCENES[7] = {
    _dbg: { tableRender: (...a) => tableRender(...a), BC: () => BC, surf: (...a) => surf(...a), person: (...a) => person(...a), fire: (...a) => fire(...a), rimLit: (...a) => rimLit(...a), wyvern: (...a) => wyvern(...a) },
    join: 'cut',
    draw(ctx, t, sc) {
      const S = plan(sc);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // the shot on screen, and the next one dissolving in across their boundary
      let i = S.findIndex(s => t < s.b); if (i < 0) i = S.length - 1;
      const cur = S[i], prev = S[i - 1];
      const inPrev = prev && t < cur.a + prev.x / 2;
      if (inPrev) {
        prev.fn(ctx, t, prev);
        const L = K.layer('s7:next'), lx = L.getContext('2d'); cur.fn(lx, t, cur);
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = smooth((t - (cur.a - prev.x / 2)) / prev.x); ctx.drawImage(L, 0, 0); ctx.globalAlpha = 1;
      } else {
        const nxt = S[i + 1];
        if (nxt && t > cur.b - cur.x / 2) {
          cur.fn(ctx, t, cur);
          const L = K.layer('s7:next'), lx = L.getContext('2d'); nxt.fn(lx, t, nxt);
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = smooth((t - (cur.b - cur.x / 2)) / cur.x); ctx.drawImage(L, 0, 0); ctx.globalAlpha = 1;
        } else cur.fn(ctx, t, cur);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (t < sc.start + 3.6) drawBurn(ctx, t, sc);
    },
  };
})();
