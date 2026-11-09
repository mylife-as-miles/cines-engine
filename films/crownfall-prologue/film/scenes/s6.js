/* Scene 6: The Road Home [L33–L38, A05]. Dawn under the north gate and the road ahead; a market stall, a small oak-leaf
   clasp turned in his hand, his smile told by light; the north road in autumn rain, an overturned cart, a wheel still
   turning, the arrows; hooded, masked men with torches closing in; his name torn from the Muster record and put to a
   torch; a fire built in a clearing and an iron grate set over it; the order ("Burn him. Not one bone."), the torch to
   the kindling; and Cael bound on his knees, rain on his face, looking up. Painted tableaux in parallax, after the
   intro's last scene (rim-lit silhouettes, rain, fire). Violence is told: streaks, silhouettes falling. Registers
   window.SCENES[6]; see LOOK.md. */
(function () {
  'use strict';
  const K = window.KIT, P = K.P, W = K.W, H = K.H;
  const { clamp, lerp, smooth, ease, easeOut, easeIn, span, win, rng } = K;
  const SCENES = window.SCENES = window.SCENES || {};
  const TAU = Math.PI * 2;
  const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const toHex = (r, g, b) => '#' + ((1 << 24) | (clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255)).toString(16).slice(1);
  const mixHex = (a, b, u) => { const A = hexRGB(a), B = hexRGB(b); return toHex(lerp(A[0], B[0], u), lerp(A[1], B[1], u), lerp(A[2], B[2], u)); };

  // ================================================================ helpers adapted from the intro's last scene (sky, ridges, fog, rain, fire, rim-lit silhouettes)
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
    return K.cached('p6:glow:' + rgb, () => {
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
    return K.cached('p6:tint:' + key + ':' + rgb, () => {
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
    const n = o.steps || 4, bx = o.box ? Math.max(0, Math.floor(o.box[0])) : 0, by = o.box ? Math.max(0, Math.floor(o.box[1])) : 0;
    const bw = o.box ? Math.max(1, Math.min(W - bx, Math.ceil(o.box[2]))) : W, bh = o.box ? Math.max(1, Math.min(H - by, Math.ceil(o.box[3]))) : H;
    const L = K.layer(o.box ? 'p6:rimb:' + (o.key || 'k') : 'p6:rim', bw, bh), lc = L.getContext('2d'), m = ctx.getTransform();
    lc.setTransform(m.a, m.b, m.c, m.d, m.e - bx, m.f - by); draw(lc, o.rim);
    lc.globalCompositeOperation = 'source-atop';
    // dark passes pushed progressively further from the light: the rim fades into the body instead of outlining it
    for (let i = 1; i <= n; i++) { const k = i / n; lc.setTransform(m.a, m.b, m.c, m.d, m.e - bx + o.dx * k, m.f - by + o.dy * k); lc.globalAlpha = i === n ? 1 : 0.42; draw(lc, i === 1 && o.mid ? o.mid : o.dark); }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); if (o.alpha != null) ctx.globalAlpha = o.alpha; ctx.drawImage(L, bx, by); ctx.restore();
  }
  // cheap bloom: the frame shrunk twice, its brights raised, laid back over it with screen
  function bloom(ctx, a = 0.3, th = 2) {
    if (a <= 0) return;
    const A = K.layer('p6:bl1', W / 4, H / 4), B = K.layer('p6:bl2', W / 8, H / 8), ax = A.getContext('2d'), bx = B.getContext('2d');
    ax.imageSmoothingQuality = 'low'; ax.drawImage(ctx.canvas, 0, 0, W / 4, H / 4);
    bx.drawImage(A, 0, 0, W / 8, H / 8);
    bx.globalCompositeOperation = 'multiply'; for (let i = 0; i < th; i++) bx.drawImage(B, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = a; ctx.imageSmoothingQuality = 'medium'; ctx.drawImage(B, 0, 0, W, H); ctx.restore();
  }
  // a horizontal band of mist (tileable texture), scrolled
  function fogTex(seed) {
    return K.cached('p6:fog:' + seed, () => {
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
    return K.cached('p6:sky:' + key, () => {
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
  function vignetteImg(a, inner) {
    const qa = Math.round(a * 40) / 40, qi = Math.round(inner * 40) / 40;
    return K.cached(`p6:vig:${qa}:${qi}`, () => { const c = K.canvas(W, H), x = c.getContext('2d'); K.vignette(x, qa, '0,0,0', qi); return c; });
  }
  let MIXING = false;   // while two shots dissolve, each skips its bloom and the mix gets one
  function finish(ctx, o = {}) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (o.bloom && !MIXING) bloom(ctx, o.bloom, o.bloomTh || 2);
    // a cold cast in the shadows: a pale wash multiplied over the frame (cheaper than a soft-light grade)
    if (o.shadow) { const n = parseInt(o.shadow.slice(1), 16), k = (o.shadowA || 0.3) * 0.55, m = (v) => Math.round(255 - (255 - v) * k); ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(${m(n >> 16 & 255) + 0},${m(n >> 8 & 255)},${m(n & 255)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (o.warm) K.grade(ctx, o.warm, 'overlay', o.warmA || 0.08);
    ctx.drawImage(vignetteImg(o.vig != null ? o.vig : 0.6, o.vigIn != null ? o.vigIn : 0.32), 0, 0);
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
    const L = K.layer('p6:fire' + (o.slot || ''), cw, ch), lx = L.getContext('2d');
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

  // ================================================================ the timeline, keyed to the voices
  let T = null;
  function TT() {
    if (T) return T;
    const sc = K.scene(6), c = K.cue; T = { s: sc.start, e: sc.end };
    for (const n of [33, 34, 35, 36, 37, 38]) { const q = c('L' + n); T['a' + n] = q.start; T['b' + n] = q.end; }
    const A05 = c('A05'), ok = A05 && A05.end > A05.start;
    T.a05 = ok ? A05.start : T.b37 + 0.4; T.b05 = ok ? A05.end : T.a05 + 2.4;
    const at = (n, u) => lerp(T['a' + n], T['b' + n], u);
    // shots
    T.s2a = T.a34 - 0.15; T.s2b = at(34, 0.56); T.s3a = T.a35 - 0.4; T.s3b = at(35, 0.5); T.s3c = at(35, 0.8);
    T.s4 = T.a36 - 0.25; T.s5a = T.a37 - 0.2; T.s5b = at(37, 0.4); T.s6a = T.a05 - 0.25; T.s6b = T.a05 + 1.35; T.s7 = T.a38 - 0.35;
    // events
    T.glint = at(33, 0.62);                                  // the star catches the first sun ("He wanted Edda to see the star")
    T.stop = at(35, 0.42);                                   // the riders halt before the cart
    T.arrow0 = at(35, 0.83);                                 // "Then the arrows."
    T.tear0 = T.a37 + 0.35; T.tear1 = T.a37 + 1.5; T.burn0 = T.a37 + 2.0;
    T.grate0 = at(37, 0.62); T.grate1 = at(37, 0.9);
    T.light0 = T.s6b + 0.15;                                 // the torch to the kindling: the fire catches
    return T;
  }

  // ================================================================ shared pieces
  // a single-colour silhouette with a rim of light: drawn once in the rim colour, offset toward the light, then dark over it
  function rimmed(ctx, draw, rim, dark, dx, dy) { ctx.save(); ctx.translate(-dx, -dy); draw(rim); ctx.restore(); draw(dark); }
  // a horse and rider in profile (K.horse / K.figure), walking or still
  function rider(ctx, x, y, h, face, ph, fill, o = {}) {
    K.horse(ctx, x, y, h, { face, walk: ph, fill, rider: Object.assign({ kind: 'cloak', head: o.head || 'hair', hold: o.hold || 'spear', arm: o.hold === 'none' ? 0.3 : undefined }, o.rider || {}) });
  }
  // forest: trunks and autumn crowns at one depth, as a wide cached strip; o.k mixes it toward the haze colour (distance),
  // o.dark sinks it toward night. Crowns are many small leaf-clusters gathered at branch ends, mostly dark, a few lit.
  function forest(key, seed, o) {
    return K.cached('p6:forest:' + key, () => {
      const w = o.w || W + 800, h = o.h || H + 200, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(seed), haze = o.haze, k = o.k, dk = o.dark || 0;
      const col = (hex, lift = 0) => mixHex(mixHex(hex, '#0a0806', dk), haze, clamp(k + lift));
      const n = o.n || 18, base = o.base || h, cs = o.crown || 160;
      const leaves = ['#7a3214', '#9a4a18', '#5a2a12', '#a8702a', '#4a3018', '#6a4020', '#30301c', '#8a5a22'];
      const trees = [];
      for (let i = 0; i < n; i++) trees.push({ tx: (i + 0.5 + (r() - 0.5) * 0.7) / n * w, tw: (o.trunk || 40) * (0.6 + r() * 0.8), lean: (r() - 0.5) * 0.06, top: h * ((o.crownY || 0.2) + r() * 0.15) });
      // crowns: clusters of leaves on the branch ends, back to front
      const cluster = (cx, cy, rad, lift) => {
        for (let q = 0; q < 26; q++) {
          const a = r() * TAU, d = Math.sqrt(r()) * rad, bx = cx + Math.cos(a) * d * 1.3, by = cy + Math.sin(a) * d * 0.8, br = rad * (0.08 + r() * 0.12);
          const lit = by < cy - rad * 0.2 ? 0.0 : 0.12;
          x.fillStyle = col(leaves[Math.floor(r() * leaves.length)], lift + lit); x.beginPath();
          x.moveTo(bx - br, by); x.quadraticCurveTo(bx - br * 0.2, by - br * 1.3, bx + br, by - br * 0.2); x.quadraticCurveTo(bx + br * 0.4, by + br * 0.9, bx - br, by); x.fill();
        }
      };
      for (const T0 of trees) for (let cI = 0; cI < 6; cI++) cluster(T0.tx + (r() - 0.5) * cs * 1.6, T0.top + r() * cs * 0.9, cs * (0.35 + r() * 0.35), 0.18);
      // trunks and their branches
      for (const T0 of trees) {
        const { tx, tw, lean } = T0;
        x.fillStyle = col(o.bark || '#1e1610'); x.beginPath(); x.moveTo(tx - tw / 2, base + 10); x.lineTo(tx - tw * 0.3 + lean * h, -20); x.lineTo(tx + tw * 0.3 + lean * h, -20); x.lineTo(tx + tw / 2, base + 10); x.closePath(); x.fill();
        x.strokeStyle = col(o.bark || '#1e1610'); x.lineCap = 'round';
        for (let bb = 0; bb < 4; bb++) { const by = T0.top + r() * (base - T0.top) * 0.4, s = r() < 0.5 ? -1 : 1, bl = tw * (1.0 + r() * 1.4), bx0 = tx + lean * (h - by); x.lineWidth = tw * (0.08 + r() * 0.06); x.beginPath(); x.moveTo(bx0, by); x.quadraticCurveTo(bx0 + s * bl * 0.3, by - bl * 0.5, bx0 + s * bl * 0.7, by - bl * 1.1); x.stroke(); cluster(bx0 + s * bl * 0.7, by - bl * 1.15, cs * 0.28, 0.08); }
        if (o.lit) { const g = x.createLinearGradient(tx - tw / 2, 0, tx + tw / 2, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.8, o.lit); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(tx - tw / 2, T0.top, tw, base - T0.top); }
      }
      // low crowns in front of some trunks
      for (let i = 0; i < n * 0.5; i++) { const T0 = trees[Math.floor(r() * n)]; cluster(T0.tx + (r() - 0.5) * cs, T0.top + cs * (0.6 + r() * 0.8), cs * 0.4, 0.0); }
      return c;
    });
  }
  // a hooded, masked man (no colours): a capsule silhouette; returns the torch point
  function killer(ctx, x, y, h, face, o = {}) {
    return person(ctx, Object.assign({ x, y, h, face, dress: 'cloak', hat: 'hood', fill: o.fill || '#080605', hold: o.torch ? 'torch' : o.hold || 'none' }, o));
  }
  function torchFire(ctx, p, h, t, seed, a = 1) {
    if (!p) return; const fl = flick(t, seed, 10);
    glow(ctx, [255, 150, 70], p[0], p[1], h * 1.3 * fl, 0.32 * a);
    glow(ctx, [255, 210, 140], p[0], p[1], h * 0.35 * fl, 0.55 * a);
    flame(ctx, p[0], p[1] + h * 0.02, h * 0.17 * fl, t, seed, a);
  }
  function rainOver(ctx, t, o) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); rain(ctx, t, o); ctx.restore(); }

  // ================================================================ L33: dawn; through the north gate, the road ahead
  const ROAD1 = g => { const u = clamp(g); return [lerp(960, 1180, Math.sin(u * 1.4)) + u * u * 260, lerp(1130, 640, Math.pow(u, 0.55))]; };
  function dawnStatic() {
    return K.cached('p6:dawn', () => {
      const OX = 300, OY = 200, c = K.canvas(W + 2 * OX, H + 2 * OY), x = c.getContext('2d');
      x.translate(OX, OY);
      const sk = sky('dawn', 480, 270, { top: [44, 52, 82], mid: [176, 120, 120], low: [255, 196, 140], glow: [255, 170, 110], glowY: 0.95, glowR: 0.6, cloud: [70, 56, 72], cover: 0.35, seed: 61 });
      x.imageSmoothingQuality = 'high'; x.drawImage(sk, -OX, -OY, W + 2 * OX, 700 + OY);
      // the low sun
      const sg = x.createRadialGradient(1290, 640, 0, 1290, 640, 520); sg.addColorStop(0, 'rgba(255,240,200,1)'); sg.addColorStop(0.06, 'rgba(255,220,160,0.9)'); sg.addColorStop(0.3, 'rgba(255,170,110,0.35)'); sg.addColorStop(1, 'rgba(255,150,100,0)'); x.fillStyle = sg; x.fillRect(-OX, -OY, W + 2 * OX, H + 2 * OY);
      // far hills, then nearer folds of land, each paler with distance
      fillRidge(x, ridge(-OX, W + OX, X => 640 - 40 * Math.sin(X * 0.002 + 1), 71, 40, 0.004, 5, 5), H + OY, '#8a7a8e');
      fillRidge(x, ridge(-OX, W + OX, X => 668 - 26 * Math.sin(X * 0.003 + 2), 72, 30, 0.005, 5, 5), H + OY, '#6e5e6a');
      fog(x, 4, [255, 214, 180], 600, 130, 0, 0.55, -OX, W + 2 * OX);
      fillRidge(x, ridge(-OX, W + OX, X => 700 - 20 * Math.sin(X * 0.004), 73, 22, 0.006, 5, 4), H + OY, '#4e4248');
      // fields: long strips of stubble and hedges catching the dawn
      const fg = x.createLinearGradient(0, 700, 0, H + OY); fg.addColorStop(0, '#5a4a40'); fg.addColorStop(1, '#2a2018'); x.fillStyle = fg; x.fillRect(-OX, 700, W + 2 * OX, H + OY - 700);
      const r = rng(74);
      for (let i = 0; i < 40; i++) { const y = 705 + Math.pow(r(), 1.6) * 420, w = 200 + r() * 700, px = -OX + r() * (W + 2 * OX); x.fillStyle = `rgba(${r() < 0.5 ? '255,200,140' : '20,14,10'},${0.06 + r() * 0.1})`; x.fillRect(px, y, w, 2 + (y - 700) * 0.02); }
      for (let i = 0; i < 14; i++) { const y = 712 + Math.pow(r(), 1.4) * 300, px = -OX + r() * (W + 2 * OX), w = 120 + r() * 400, hh = 4 + (y - 700) * 0.04; x.fillStyle = '#231a16'; for (let k = 0; k < w; k += hh * 0.8) { x.beginPath(); x.arc(px + k, y, hh * (0.7 + r() * 0.5), Math.PI, 0); x.fill(); } }
      // the road north, pale and rutted, winding toward the sun
      x.beginPath(); for (let i = 0; i <= 60; i++) { const g = i / 60, [px, py] = ROAD1(g), hw = lerp(330, 6, Math.pow(g, 0.5)); i ? x.lineTo(px - hw, py) : x.moveTo(px - hw, py); } for (let i = 60; i >= 0; i--) { const g = i / 60, [px, py] = ROAD1(g), hw = lerp(330, 6, Math.pow(g, 0.5)); x.lineTo(px + hw, py); } x.closePath();
      const rg = x.createLinearGradient(0, 640, 0, H + 80); rg.addColorStop(0, '#d8b088'); rg.addColorStop(0.3, '#8a6a50'); rg.addColorStop(1, '#3a2c22'); x.fillStyle = rg; x.fill();
      fog(x, 9, [255, 220, 190], 690, 110, 0, 0.5, -OX, W + 2 * OX);
      return { c, OX, OY };
    });
  }
  // the gate's arch: dark ashlar around a pointed opening, its inner edge lit by the dawn
  function gateArch() {
    return K.cached('p6:gate', () => {
      const w = W * 1.6, h = H * 1.6, c = K.canvas(w, h), x = c.getContext('2d'), cx = w / 2, by = h * 0.86, aw = 560, ah = 1020;
      const op = () => { x.beginPath(); x.moveTo(cx - aw, by); x.lineTo(cx - aw, by - ah * 0.55); x.quadraticCurveTo(cx - aw, by - ah * 0.95, cx, by - ah); x.quadraticCurveTo(cx + aw, by - ah * 0.95, cx + aw, by - ah * 0.55); x.lineTo(cx + aw, by); x.closePath(); };
      x.fillStyle = '#0e0a09'; x.fillRect(0, 0, w, h);
      const r = rng(81); x.strokeStyle = 'rgba(70,52,40,0.35)'; x.lineWidth = 3;
      for (let yy = 0; yy < h; yy += 70) { x.beginPath(); x.moveTo(0, yy); x.lineTo(w, yy); x.stroke(); for (let xx = (yy / 70 % 2) * 60; xx < w; xx += 120 + r() * 40) { x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx, yy + 70); x.stroke(); } }
      x.globalCompositeOperation = 'destination-out'; op(); x.fill(); x.globalCompositeOperation = 'source-over';
      // the reveal of the arch: a thick inner face lit warm from outside
      x.save(); op(); x.lineWidth = 60; x.strokeStyle = '#3a2418'; x.stroke(); x.lineWidth = 14; x.strokeStyle = 'rgba(255,170,110,0.75)'; x.stroke(); x.restore();
      x.save(); x.globalCompositeOperation = 'destination-out'; op(); x.fill(); x.restore();
      // the floor of the passage
      const fg = x.createLinearGradient(0, by - 40, 0, h); fg.addColorStop(0, '#2a1c14'); fg.addColorStop(1, '#0a0706'); x.fillStyle = fg; x.beginPath(); x.moveTo(cx - aw, by); x.lineTo(cx + aw, by); x.lineTo(w, h); x.lineTo(0, h); x.closePath(); x.fill();
      return { c, cx, by };
    });
  }
  function shot1(ctx, t, sh) {
    const T = TT(), u = span(t, sh.a, sh.b), lt = t - sh.a;
    const S = dawnStatic(), push = ease(span(t, T.s - 1.2, sh.b + 0.4));
    const c = { x: lerp(-30, 40, push), y: lerp(30, -30, push), z: lerp(1.0, 1.22, push) };
    view(ctx, c, 0.35); ctx.drawImage(S.c, -S.OX, -S.OY);
    // birds rising off the fields
    view(ctx, c, 0.5); ctx.fillStyle = '#2a1e1e';
    for (let i = 0; i < 9; i++) { const bx = 600 + i * 70 + lt * 30 + Math.sin(i * 3) * 40, by = 420 - i * 9 - lt * 8 + Math.sin(lt * 3 + i) * 6, fl = Math.sin(lt * 9 + i * 2); ctx.beginPath(); ctx.moveTo(bx - 9, by - fl * 4); ctx.quadraticCurveTo(bx - 3, by, bx, by + 1); ctx.quadraticCurveTo(bx + 3, by, bx + 9, by - fl * 4); ctx.lineWidth = 2; ctx.strokeStyle = '#2a1e1e'; ctx.stroke(); }
    // the riders: Cael ahead, two escorts behind, walking up the road toward the sun
    view(ctx, c, 0.9);
    const lead = lerp(0.02, 0.36, ease(span(t, T.s - 1.0, sh.b + 0.6)));
    const riders = [{ g: lead, cael: true }, { g: lead - 0.05, s: 1 }, { g: lead - 0.085, s: 2 }];
    for (const R of riders.slice().reverse()) {
      if (R.g < -0.02) continue;
      const [px, py] = ROAD1(Math.max(0, R.g)), hh = lerp(330, 20, Math.pow(clamp(R.g), 0.45)), ph = lt * 4.4 + (R.s || 0) * 1.7;
      const off = R.cael ? 0 : (R.s === 1 ? -0.25 : 0.25) * hh;
      rimmed(ctx, f => rider(ctx, px + off, py, hh, 1, ph, f, { hold: 'spear' }), '#ffbe86', '#100b09', hh * 0.012, hh * 0.006);
      if (R.cael) {
        const gl = win(t, T.glint - 0.15, T.glint + 0.9, 0.12, 0.6), gx = px + hh * 0.08, gy = py - hh * 1.62;
        if (gl > 0) { star4(ctx, gx, gy, hh * 0.5 * gl, 0.95 * gl); glow(ctx, [255, 240, 210], gx, gy, hh * 0.4, 0.5 * gl); }
      }
    }
    // the gate, rushing past as the camera goes out under it
    const G = gateArch(), gz = lerp(1.0, 5.5, Math.pow(span(t, T.s - 1.2, sh.b + 0.1), 2.2));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(W / 2 - c.x * 1.3, H * 0.62 - c.y * 1.3); ctx.scale(gz * 0.62, gz * 0.62); ctx.drawImage(G.c, -G.cx, -G.by + 120); ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    K.specks(ctx, t, { kind: 'dust', n: 40, alpha: 0.4, seed: 611 });
    finish(ctx, { bloom: 0.36, vig: 0.5, vigIn: 0.35, warm: '#ffb080', warmA: 0.1 });
  }
  function star4(ctx, x, y, r, a) {
    if (a <= 0 || r <= 0.5) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [rx, ry] of [[r, r * 0.06], [r * 0.06, r], [r * 0.45, r * 0.03], [r * 0.03, r * 0.45]]) { const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry)); g.addColorStop(0, `rgba(255,246,220,${a})`); g.addColorStop(1, 'rgba(255,220,160,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  // ================================================================ L34: the market; a small oak-leaf clasp turned in his hand; his smile
  function marketBokeh() {
    return K.cached('p6:mkt', () => {
      const c = K.canvas((W + 400) / 2, (H + 300) / 2), x = c.getContext('2d'), r = rng(341); x.scale(0.5, 0.5);
      const g = x.createLinearGradient(0, 0, 0, H + 300); g.addColorStop(0, '#5a3418'); g.addColorStop(0.5, '#8a5428'); g.addColorStop(1, '#2a160a'); x.fillStyle = g; x.fillRect(0, 0, W + 400, H + 300);
      x.filter = 'blur(10px)';
      // awnings and hanging cloth in warm colours, people passing as soft shapes
      for (let i = 0; i < 9; i++) { const px = i * 280 - 60, col = ['#a8541c', '#d8a050', '#6a2e14', '#c8b080', '#8a3a28'][i % 5]; x.fillStyle = col; x.beginPath(); x.moveTo(px, 60); x.lineTo(px + 300, 40); x.lineTo(px + 320, 230); x.quadraticCurveTo(px + 160, 270, px - 10, 240); x.closePath(); x.fill(); }
      for (let i = 0; i < 16; i++) { const px = r() * (W + 400), h = 380 + r() * 200; x.fillStyle = `rgba(20,10,4,${0.5 + r() * 0.3})`; x.beginPath(); x.ellipse(px, 760 - h * 0.35, 60, h * 0.42, 0, 0, TAU); x.fill(); x.beginPath(); x.arc(px, 760 - h * 0.82, 34, 0, TAU); x.fill(); }
      x.filter = 'none';
      x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 46; i++) { const px = r() * (W + 400), py = r() * 700, rad = 18 + r() * 60, col = [[255, 190, 110], [255, 220, 160], [255, 160, 80]][i % 3], a = 0.08 + r() * 0.18; const gg = x.createRadialGradient(px, py, 0, px, py, rad); gg.addColorStop(0, rgbs(col, a * 0.6)); gg.addColorStop(0.8, rgbs(col, a)); gg.addColorStop(1, rgbs(col, 0)); x.fillStyle = gg; x.beginPath(); x.arc(px, py, rad, 0, TAU); x.fill(); }
      return c;
    });
  }
  // the oak-leaf clasp: lobed, bronze-silver, veined; turned by an angle (cos squeezes it), a pin on its back
  function oakLeaf(ctx, x, y, s, turn, glint) {
    const cs = Math.cos(turn), back = cs < 0;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.5); ctx.scale(Math.max(0.06, Math.abs(cs)) * s, s);
    const path = () => {
      ctx.beginPath(); ctx.moveTo(0, 1.0);
      const lobes = [[0.18, 0.62, 0.42, 0.55], [0.2, 0.18, 0.5, 0.08], [0.18, -0.25, 0.46, -0.36], [0.1, -0.62, 0.3, -0.74]];
      for (const [a, b, cx, cy] of lobes) ctx.quadraticCurveTo(cx, cy + 0.12, a, b - 0.05);
      ctx.quadraticCurveTo(0.12, -0.95, 0, -1.0);
      for (const [a, b, cx, cy] of lobes.slice().reverse()) ctx.quadraticCurveTo(-cx, cy - 0.05, -a, b + 0.05);
      ctx.quadraticCurveTo(-0.1, 0.9, 0, 1.0); ctx.closePath();
    };
    ctx.save(); ctx.translate(0.06, 0.08); ctx.filter = 'blur(3px)'; ctx.fillStyle = 'rgba(10,6,2,0.5)'; path(); ctx.fill(); ctx.restore();
    const g = ctx.createLinearGradient(-0.5 * cs, -1, 0.5 * cs, 1); g.addColorStop(0, back ? '#6a6458' : '#e8dcc0'); g.addColorStop(0.45, back ? '#4a4034' : '#b0946a'); g.addColorStop(1, back ? '#2a2218' : '#6a5032');
    path(); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(40,26,12,0.8)'; ctx.lineWidth = 0.03; ctx.stroke();
    if (!back) { ctx.strokeStyle = 'rgba(60,40,18,0.6)'; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(0, 0.95); ctx.lineTo(0, -0.9); for (const yy of [0.5, 0.1, -0.3, -0.6]) { ctx.moveTo(0, yy + 0.1); ctx.lineTo(0.3, yy - 0.08); ctx.moveTo(0, yy + 0.1); ctx.lineTo(-0.3, yy - 0.08); } ctx.stroke(); }
    else { ctx.strokeStyle = '#9a948a'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(0, 0.6); ctx.lineTo(0, -0.6); ctx.stroke(); ctx.fillStyle = '#8a847a'; ctx.beginPath(); ctx.arc(0, 0.62, 0.07, 0, TAU); ctx.fill(); }
    // the stem
    ctx.strokeStyle = back ? '#3a3226' : '#a08a5a'; ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(0, 0.95); ctx.quadraticCurveTo(0.05, 1.15, 0.12, 1.25); ctx.stroke();
    ctx.restore();
    if (glint > 0) star4(ctx, x - s * 0.15, y - s * 0.25, s * 1.3 * glint, 0.9 * glint);
  }
  function shot2a(ctx, t, sh) {
    const T = TT(), u = span(t, sh.a - 0.2, sh.b + 0.2), lt = t - sh.a;
    const c = { x: lerp(-20, 20, ease(u)), y: lerp(10, -10, ease(u)), z: lerp(1.04, 1.12, ease(u)) };
    view(ctx, c, 0.4); ctx.drawImage(marketBokeh(), -200, -150, W + 400, H + 300);
    // the stall's cloth: dark green with trinkets in soft focus
    view(ctx, c, 0.85);
    const cg = ctx.createLinearGradient(0, 560, 0, H); cg.addColorStop(0, '#1e2a1e'); cg.addColorStop(1, '#0c120c'); ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(-200, 640); ctx.quadraticCurveTo(900, 560, W + 200, 600); ctx.lineTo(W + 200, H + 200); ctx.lineTo(-200, H + 200); ctx.closePath(); ctx.fill();
    ctx.drawImage(K.cached('p6:trinkets', () => {
      const c2 = K.canvas(W / 2, H / 2), x = c2.getContext('2d'), r = rng(345); x.scale(0.5, 0.5); x.filter = 'blur(4px)';
      for (let i = 0; i < 18; i++) { const px = r() * W, py = 660 + r() * 380, s2 = 14 + r() * 26, kd = r(); if (Math.hypot(px - 900, py - 640) < 260) continue; x.fillStyle = kd < 0.4 ? '#b8944a' : kd < 0.7 ? '#9a9a9a' : '#7a3a20'; x.beginPath(); kd < 0.4 ? x.arc(px, py, s2, 0, TAU) : x.ellipse(px, py, s2 * 1.3, s2 * 0.7, r(), 0, TAU); x.fill(); x.fillStyle = 'rgba(255,230,180,0.4)'; x.beginPath(); x.arc(px - s2 * 0.3, py - s2 * 0.3, s2 * 0.3, 0, TAU); x.fill(); }
      return c2;
    }), 0, 0, W, H);
    // his open hand from the right, the clasp lying in the palm; the fingers tip it over and it turns to the light
    const turn = 0.15 + Math.PI * (ease(span(lt, 0.9, 1.5)) + ease(span(lt, 2.0, 2.6))), tilt = Math.sin(lt * 0.9) * 0.03;
    ctx.save(); ctx.translate(1000, 640); ctx.rotate(-0.12 + tilt);
    const sk = ctx.createLinearGradient(-300, -200, 300, 200); sk.addColorStop(0, '#e2b28a'); sk.addColorStop(0.55, '#b07a54'); sk.addColorStop(1, '#5a3420');
    // the sleeve and its cuff at the right
    ctx.fillStyle = '#5e3a20'; ctx.beginPath(); ctx.moveTo(300, -160); ctx.lineTo(1100, -260); ctx.lineTo(1100, 400); ctx.lineTo(300, 220); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2e1c10'; ctx.beginPath(); ctx.moveTo(260, -170); ctx.lineTo(380, -185); ctx.lineTo(390, 235); ctx.lineTo(270, 215); ctx.closePath(); ctx.fill();
    ctx.fillStyle = sk;
    // the palm and the heel of the hand
    ctx.beginPath(); ctx.moveTo(280, -150); ctx.bezierCurveTo(150, -175, -80, -170, -170, -110); ctx.bezierCurveTo(-210, -40, -200, 60, -150, 110); ctx.bezierCurveTo(-40, 170, 160, 190, 280, 200); ctx.closePath(); ctx.fill();
    // four fingers, a little curled, toward the left
    const fingers = [[-150, -95, -360, -150, 52], [-185, -25, -410, -40, 54], [-180, 45, -390, 75, 50], [-140, 100, -320, 170, 44]];
    for (const [x0, y0, x1, y1, wd] of fingers) { ctx.lineCap = 'round'; ctx.strokeStyle = sk; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 - 10, (y0 + y1) / 2 - 22, x1, y1); ctx.stroke(); ctx.strokeStyle = 'rgba(90,46,24,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo((x0 + x1) / 2 - 8, (y0 + y1) / 2 - 22 - wd * 0.42); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 10, (x0 + x1) / 2 + 6, (y0 + y1) / 2 - 22 + wd * 0.42); ctx.stroke(); }
    // the thumb, along the top
    ctx.strokeStyle = sk; ctx.lineWidth = 62; ctx.beginPath(); ctx.moveTo(150, -150); ctx.quadraticCurveTo(20, -250, -110, -265); ctx.stroke();
    // lines of the palm, light on the mounds
    ctx.strokeStyle = 'rgba(100,52,28,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-150, -40); ctx.bezierCurveTo(-50, -10, 60, 40, 180, 30); ctx.moveTo(-140, 40); ctx.bezierCurveTo(-40, 50, 80, 100, 160, 150); ctx.stroke();
    const hl = ctx.createRadialGradient(-30, -60, 0, -30, -60, 220); hl.addColorStop(0, 'rgba(255,230,200,0.3)'); hl.addColorStop(1, 'rgba(255,230,200,0)'); ctx.fillStyle = hl; ctx.fillRect(-300, -300, 600, 500);
    ctx.restore();
    oakLeaf(ctx, 940 + Math.sin(lt) * 4, 610, 125, turn, win(lt, 2.5, 3.4, 0.15, 0.6));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    finish(ctx, { bloom: 0.34, vig: 0.62, vigIn: 0.3, warm: '#ffb070', warmA: 0.08 });
  }
  // his profile at the stall, amber light on it, the smile shown only in the lift of the cheek
  function shot2b(ctx, t, sh) {
    const T = TT(), u = span(t, sh.a - 0.2, sh.b + 0.2), lt = t - sh.a, smile = smooth(span(lt, 0.8, 1.8));
    const c = { x: lerp(20, -20, ease(u)), y: lerp(0, -10, ease(u)), z: lerp(1.06, 1.12, ease(u)) };
    view(ctx, c, 0.4); ctx.drawImage(marketBokeh(), -200, -150, W + 400, H + 300);
    view(ctx, c, 0.7);
    // the stallkeeper: a soft shape at the left with goods hanging between them
    ctx.drawImage(K.cached('p6:keeper', () => { const c2 = K.canvas(W / 2, H / 2), x = c2.getContext('2d'); x.scale(0.5, 0.5); x.filter = 'blur(3px)'; const L2 = K.canvas(W, H), lx = L2.getContext('2d'); person(lx, { x: 360, y: 1180, h: 900, face: 1, fill: '#1a0e08', dress: 'apron', hat: 'cap', armN: [1.2, 0.6], bulk: 1.2 }); x.drawImage(L2, 0, 0); L2.width = L2.height = 0; return c2; }), 0, 0, W, H);
    for (let i = 0; i < 5; i++) { const px = 520 + i * 110, py = 120 + (i % 2) * 40, sw = Math.sin(t * 1.3 + i) * 0.05; ctx.save(); ctx.translate(px, 0); ctx.rotate(sw); ctx.strokeStyle = '#2a1a0e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, py); ctx.stroke(); ctx.fillStyle = ['#a8541c', '#b8944a', '#6a6a6a'][i % 3]; ctx.beginPath(); ctx.ellipse(0, py + 30, 26, 34, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,220,170,0.4)'; ctx.beginPath(); ctx.ellipse(-8, py + 20, 8, 12, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    view(ctx, c, 1);
    caelProfile(ctx, 1220, 470, 430, t, smile, { look: -0.04, light: 'amber' });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    finish(ctx, { bloom: 0.36, vig: 0.6, vigIn: 0.3, warm: '#ffb070', warmA: 0.1 });
  }
  // Cael's head and shoulders in profile, facing left: dark hair to the jaw, a russet cloak with its hood bunched at the
  // nape. o.light 'amber' | 'fire' lights the face from the front (left); smile lifts the cheek and the mouth's corner;
  // o.look tilts the head (negative looks up); o.rainy wets it; o.bound puts the rope across him; o.star its glint
  function caelProfile(ctx, X, Y, S, t, smile, o = {}) {
    const fire = o.light === 'fire', key = fire ? [255, 150, 70] : [255, 200, 140], fl = fire ? flick(t, 4, 8) : 1, lift = o.lightA != null ? o.lightA : 1;
    ctx.save(); ctx.translate(X, Y); ctx.scale(S, S);
    // the cloak over the shoulder, the hood bunched behind the neck
    const cloak = () => { ctx.beginPath(); ctx.moveTo(-0.42, 1.5); ctx.bezierCurveTo(-0.38, 1.05, -0.28, 0.8, -0.14, 0.66); ctx.quadraticCurveTo(0.0, 0.58, 0.16, 0.52); ctx.bezierCurveTo(0.34, 0.5, 0.5, 0.66, 0.6, 0.86); ctx.bezierCurveTo(0.7, 1.05, 0.78, 1.3, 0.82, 1.5); ctx.closePath(); };
    cloak(); ctx.fillStyle = '#24160c'; ctx.fill();
    ctx.save(); cloak(); ctx.clip();
    const cg = ctx.createLinearGradient(-0.45, 0, 0.3, 0); cg.addColorStop(0, rgbs([134, 92, 54], 0.9 * lift)); cg.addColorStop(0.12, rgbs([110, 74, 44], 0.5 * lift)); cg.addColorStop(0.4, 'rgba(0,0,0,0)'); ctx.fillStyle = cg; ctx.fillRect(-0.5, 0.4, 1.4, 1.2);
    for (const fx of [-0.18, 0.1, 0.38]) { const g2 = ctx.createLinearGradient(fx - 0.08, 0, fx + 0.08, 0); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(0.5, rgbs(key, 0.07 * lift)); g2.addColorStop(0.75, 'rgba(0,0,0,0.25)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g2; ctx.save(); ctx.translate(fx, 1.0); ctx.rotate(0.08); ctx.fillRect(-0.08, -0.4, 0.16, 0.6); ctx.restore(); }
    ctx.fillStyle = '#1a0f08'; ctx.beginPath(); ctx.ellipse(0.28, 0.6, 0.22, 0.12, -0.3, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = rgbs(key, 0.6 * lift * fl); ctx.lineWidth = 0.01; ctx.beginPath(); ctx.moveTo(-0.42, 1.5); ctx.bezierCurveTo(-0.38, 1.05, -0.28, 0.8, -0.14, 0.66); ctx.stroke();
    if (o.bound) { ctx.strokeStyle = '#5a4a34'; ctx.lineWidth = 0.032; for (const yy of [1.02, 1.16]) { ctx.beginPath(); ctx.moveTo(-0.45, yy); ctx.quadraticCurveTo(0.15, yy + 0.07, 0.82, yy - 0.04); ctx.stroke(); } ctx.strokeStyle = rgbs(key, 0.45 * lift); ctx.lineWidth = 0.01; for (const yy of [1.0, 1.14]) { ctx.beginPath(); ctx.moveTo(-0.45, yy); ctx.quadraticCurveTo(0.15, yy + 0.07, 0.3, yy + 0.05); ctx.stroke(); } }
    // the silver star at the cloak's throat
    const sx = -0.13, sy = 0.7; ctx.save(); ctx.translate(sx, sy); ctx.fillStyle = '#c8c8d0'; ctx.beginPath(); for (let k = 0; k < 16; k++) { const rr = k % 2 ? 0.011 : 0.028, a = k / 16 * TAU; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.restore();
    if (o.star !== false) { const g = 0.5 + 0.5 * Math.sin(t * 2.2); star4(ctx, X + sx * S, Y + sy * S, S * 0.1 * (0.6 + 0.4 * g) * lift, 0.75 * lift); }
    ctx.save(); ctx.translate(X, Y); ctx.scale(S, S); ctx.translate(0, 0.2); ctx.rotate(o.look || 0); ctx.translate(0, -0.2);
    // the neck, a little forward
    ctx.fillStyle = '#140a06'; ctx.beginPath(); ctx.moveTo(-0.13, 0.3); ctx.quadraticCurveTo(-0.15, 0.46, -0.12, 0.62); ctx.lineTo(0.1, 0.58); ctx.quadraticCurveTo(0.06, 0.4, 0.08, 0.22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgbs(key, 0.55 * lift * fl); ctx.lineWidth = 0.009; ctx.beginPath(); ctx.moveTo(-0.13, 0.32); ctx.quadraticCurveTo(-0.15, 0.46, -0.12, 0.6); ctx.stroke();
    // the face in profile
    const sm = smile;
    const face = () => {
      ctx.beginPath(); ctx.moveTo(-0.02, -0.44);
      ctx.bezierCurveTo(-0.16, -0.44, -0.24, -0.34, -0.255, -0.2);                 // forehead
      ctx.quadraticCurveTo(-0.262, -0.13, -0.248, -0.095);                          // brow
      ctx.quadraticCurveTo(-0.245, -0.07, -0.252, -0.05);                           // bridge
      ctx.lineTo(-0.322, 0.065); ctx.quadraticCurveTo(-0.326, 0.09, -0.298, 0.096); // nose
      ctx.lineTo(-0.27, 0.104); ctx.quadraticCurveTo(-0.274, 0.125, -0.278, 0.14 - sm * 0.006); // upper lip
      ctx.quadraticCurveTo(-0.262, 0.152 - sm * 0.012, -0.27, 0.163);              // mouth, its corner lifting
      ctx.quadraticCurveTo(-0.276, 0.185, -0.258, 0.198);                           // lower lip
      ctx.bezierCurveTo(-0.255, 0.235, -0.25, 0.265, -0.21, 0.282);                 // chin
      ctx.bezierCurveTo(-0.15, 0.3, -0.05, 0.28, 0.06, 0.22);                       // jaw
      ctx.lineTo(0.16, 0.06); ctx.bezierCurveTo(0.2, -0.1, 0.2, -0.38, -0.02, -0.44); ctx.closePath();
    };
    face(); const fg = ctx.createLinearGradient(-0.33, 0, 0.16, 0);
    fg.addColorStop(0, fire ? '#8a4422' : '#8a5a3c'); fg.addColorStop(0.07, fire ? '#4a2212' : '#4a2e1e'); fg.addColorStop(0.2, '#1c0e08'); fg.addColorStop(1, '#0e0705');
    ctx.fillStyle = fg; ctx.fill();
    ctx.save(); face(); ctx.clip();
    const blob = (bx, by, rx, ry, rgb, a) => { const gg = ctx.createRadialGradient(bx, by, 0, bx, by, Math.max(rx, ry)); gg.addColorStop(0, rgbs(rgb, a)); gg.addColorStop(1, rgbs(rgb, 0)); ctx.save(); ctx.translate(bx, by); ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); ctx.translate(-bx, -by); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(bx, by, Math.max(rx, ry), 0, TAU); ctx.fill(); ctx.restore(); };
    blob(-0.2, -0.055, 0.06, 0.035, [10, 4, 2], 0.6);                               // the eye socket under the brow
    blob(-0.235, 0.07 - sm * 0.02, 0.045, 0.04, key, (0.12 + sm * 0.16) * lift * fl); // the cheek's edge, gathering as he smiles
    blob(-0.12, 0.2, 0.1, 0.06, [10, 4, 2], 0.4);                                   // under the cheekbone
    blob(-0.24, -0.26, 0.05, 0.08, key, 0.22 * lift * fl);                          // the brow catching the light
    ctx.strokeStyle = `rgba(30,12,4,${0.25 + sm * 0.4})`; ctx.lineWidth = 0.007; ctx.beginPath(); ctx.moveTo(-0.25, 0.08); ctx.quadraticCurveTo(-0.222 + sm * 0.01, 0.13 - sm * 0.01, -0.252 - sm * 0.004, 0.165 - sm * 0.012); ctx.stroke();
    // the eye: dark, a wet glint of the light
    ctx.fillStyle = '#0a0503'; ctx.beginPath(); ctx.ellipse(-0.212, -0.058 - sm * 0.003, 0.022, 0.011 - sm * 0.003, -0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = rgbs([255, 236, 200], 0.75 * lift); ctx.beginPath(); ctx.arc(-0.226, -0.061, 0.0045, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(14,6,2,0.8)'; ctx.lineWidth = 0.011; ctx.beginPath(); ctx.moveTo(-0.245, -0.098); ctx.quadraticCurveTo(-0.2, -0.116, -0.155, -0.1); ctx.stroke();
    ctx.restore();
    // light along the profile's edge
    ctx.strokeStyle = rgbs(key, 0.95 * lift * fl); ctx.lineWidth = 0.011; ctx.beginPath(); ctx.moveTo(-0.2, -0.4); ctx.bezierCurveTo(-0.24, -0.33, -0.255, -0.26, -0.255, -0.2); ctx.quadraticCurveTo(-0.262, -0.13, -0.248, -0.095); ctx.quadraticCurveTo(-0.245, -0.07, -0.252, -0.05); ctx.lineTo(-0.322, 0.065); ctx.moveTo(-0.258, 0.2); ctx.bezierCurveTo(-0.255, 0.235, -0.25, 0.265, -0.21, 0.282); ctx.stroke();
    // dark hair to the jaw: a mass over the crown and the back, locks falling in front of the ear to the jaw
    const hair = () => { ctx.beginPath(); ctx.moveTo(-0.215, -0.33); ctx.bezierCurveTo(-0.2, -0.5, 0.08, -0.56, 0.22, -0.4); ctx.bezierCurveTo(0.32, -0.26, 0.3, 0.0, 0.26, 0.2); ctx.lineTo(0.24, 0.3); ctx.lineTo(0.2, 0.24); ctx.lineTo(0.17, 0.32); ctx.lineTo(0.13, 0.25); ctx.lineTo(0.09, 0.31); ctx.lineTo(0.05, 0.24); ctx.quadraticCurveTo(0.06, 0.08, -0.01, -0.06); ctx.quadraticCurveTo(-0.06, -0.15, -0.12, -0.2); ctx.quadraticCurveTo(-0.17, -0.25, -0.215, -0.33); ctx.closePath(); };
    hair(); ctx.fillStyle = '#0c0705'; ctx.fill();
    ctx.save(); hair(); ctx.clip(); ctx.strokeStyle = rgbs(key, 0.22 * lift * fl); ctx.lineWidth = 0.006; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-0.2 + i * 0.02, -0.36 - i * 0.03); ctx.quadraticCurveTo(-0.12 + i * 0.02, -0.2, -0.06 + i * 0.03, 0.05 + i * 0.05); ctx.stroke(); } ctx.restore();
    ctx.strokeStyle = rgbs(key, 0.5 * lift * fl); ctx.lineWidth = 0.007; ctx.beginPath(); ctx.moveTo(-0.212, -0.34); ctx.bezierCurveTo(-0.2, -0.49, 0.06, -0.55, 0.2, -0.42); ctx.stroke();
    if (o.rainy) { const r = rng(7); for (let i = 0; i < 18; i++) { const dx = -0.3 + r() * 0.28, dy = -0.32 + r() * 0.6 + ((t * (0.15 + r() * 0.25) + r()) % 1) * 0.12; ctx.fillStyle = rgbs(dx < -0.2 ? key : [200, 210, 220], 0.6); ctx.beginPath(); ctx.ellipse(dx, dy, 0.004, 0.009, 0, 0, TAU); ctx.fill(); } }
    ctx.restore();
  }

  // ================================================================ L35: the north road in autumn rain; the cart; the arrows
  function roadStatic() {
    return K.cached('p6:road', () => {
      const OX = 300, OY = 200, c = K.canvas(W + 2 * OX, H + 2 * OY), x = c.getContext('2d'); x.translate(OX, OY);
      const sk = sky('rain', 480, 270, { top: [52, 56, 62], mid: [92, 96, 100], low: [130, 128, 122], glow: [80, 70, 60], glowY: 1, glowR: 0.6, cloud: [60, 62, 66], cover: 0.8, seed: 81 });
      x.drawImage(sk, -OX, -OY, W + 2 * OX, H * 0.8 + OY);
      x.drawImage(forest('far', 811, { haze: '#7a7a78', k: 0.72, n: 30, trunk: 16, crown: 90, crownY: 0.28, base: 720 }), -OX, -OY + 40);
      fog(x, 5, [150, 150, 146], 520, 220, 0, 0.55, -OX, W + 2 * OX);
      x.drawImage(forest('mid', 812, { haze: '#5a5a58', k: 0.4, n: 16, trunk: 34, crown: 150, crownY: 0.15, base: 820 }), -OX, -OY);
      // the ground: wet leaf-litter and mud, and the road running into the trees
      const gg = x.createLinearGradient(0, 700, 0, H + OY); gg.addColorStop(0, '#4a3e32'); gg.addColorStop(1, '#1c1610'); x.fillStyle = gg; x.fillRect(-OX, 720, W + 2 * OX, H + OY - 720);
      x.beginPath(); x.moveTo(-OX, H + OY); x.bezierCurveTo(300, 960, 800, 820, 1080, 740); x.lineTo(1180, 740); x.bezierCurveTo(1300, 820, 1700, 960, W + OX, H + OY); x.closePath();
      const rg = x.createLinearGradient(0, 740, 0, H + OY); rg.addColorStop(0, '#6a625a'); rg.addColorStop(1, '#2a241e'); x.fillStyle = rg; x.fill();
      // puddles holding the grey sky
      const r = rng(83); for (let i = 0; i < 18; i++) { const px = 300 + r() * 1400, py = 780 + Math.pow(r(), 1.3) * 320, w = 30 + (py - 740) * 0.5 * r(); x.fillStyle = `rgba(150,156,160,${0.22 + r() * 0.2})`; x.beginPath(); x.ellipse(px, py, w, w * 0.12, 0, 0, TAU); x.fill(); }
      for (let i = 0; i < 900; i++) { const px = -OX + r() * (W + 2 * OX), py = 730 + Math.pow(r(), 1.2) * (H + OY - 730), s = 1 + (py - 730) * 0.012; x.fillStyle = ['#7a3a18', '#a8541c', '#5a3014', '#b8782a'][Math.floor(r() * 4)]; x.globalAlpha = 0.5; x.beginPath(); x.ellipse(px, py, s * 2, s, r() * 3, 0, TAU); x.fill(); }
      x.globalAlpha = 1;
      fog(x, 7, [120, 120, 116], 680, 200, 0, 0.4, -OX, W + 2 * OX);
      return { c, OX, OY };
    });
  }
  // the overturned cart, on its side across the road, one wheel up
  function cart(ctx, x, y, s, t, spin) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#1a140f'; ctx.beginPath(); ctx.moveTo(-1.6, 0); ctx.lineTo(1.5, 0.02); ctx.lineTo(1.4, -0.85); ctx.lineTo(-1.5, -0.9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,110,96,0.4)'; ctx.lineWidth = 0.025; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-1.55, -i * 0.18); ctx.lineTo(1.45, -i * 0.175); ctx.stroke(); }
    // spilled sacks and a broken shaft
    ctx.fillStyle = '#2a2018'; for (const [px, r2] of [[-1.9, 0.22], [-2.3, 0.18], [1.8, 0.2]]) { ctx.beginPath(); ctx.ellipse(px, -r2 * 0.6, r2 * 1.3, r2 * 0.7, 0.2, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#1a140f'; ctx.lineWidth = 0.08; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(1.4, -0.3); ctx.lineTo(2.6, -0.05); ctx.stroke();
    // the upper wheel, still turning slowly
    wheel(ctx, -0.6, -1.25, 0.62, spin); wheel(ctx, 0.9, -1.2, 0.62, spin * 0.9 + 1);
    ctx.restore();
  }
  function wheel(ctx, x, y, r, a) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.35); ctx.strokeStyle = '#120e0b'; ctx.lineWidth = r * 0.16; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.lineWidth = r * 0.06; for (let k = 0; k < 8; k++) { const q = a + k / 8 * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(q) * r, Math.sin(q) * r); ctx.stroke(); }
    ctx.fillStyle = '#120e0b'; ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, TAU); ctx.fill(); ctx.restore();
  }
  // the riders on the road (profile), the cart, the near trees
  const RIDERS3 = [{ k: 0, off: 0 }, { k: 1, off: -110 }, { k: 2, off: -200 }];
  function riderPos3(t, k) {
    const T = TT(), go = span(t, T.s3a - 1.0, T.stop), x = lerp(-260, 820, easeOut(go)) - k * 170, moving = go < 1;
    return { x, y: 900 - k * 18 + (k === 1 ? 30 : 0), h: 250 - k * 14, moving };
  }
  function shot3a(ctx, t, sh) {
    const T = TT(), u = span(t, sh.a - 0.3, sh.b + 0.3), lt = t - sh.a;
    const c = { x: lerp(-40, 30, ease(u)), y: lerp(10, -5, ease(u)), z: lerp(1.02, 1.1, ease(u)) };
    const S = roadStatic();
    view(ctx, c, 0.5); ctx.drawImage(S.c, -S.OX, -S.OY);
    view(ctx, c, 0.8);
    cart(ctx, 1220, 905, 120, t, -t * 0.25);
    for (const R of RIDERS3) { const p = riderPos3(t, R.k), ph = p.moving ? t * 4.6 + R.k * 1.9 : 0.3; rimmed(ctx, f => rider(ctx, p.x, p.y, p.h, 1, p.moving ? ph : undefined, f, { hold: 'spear', head: R.k ? 'kettle' : 'hair' }), 'rgba(170,176,180,0.9)', '#0c0a09', p.h * 0.008, p.h * 0.008); }
    // near trunks at the edges, dark and wet, closing in
    view(ctx, c, 1.35);
    ctx.drawImage(forest('near', 813, { haze: '#2a2622', k: 0.1, n: 4, trunk: 120, crown: 260, crownY: 0.0, base: H + 200, w: W + 900 }), -450, -120);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    rainOver(ctx, t, { n: 460, angle: 0.16, speed: 1500, len: 54, alpha: 0.2, seed: 351 });
    finish(ctx, { bloom: 0.14, shadow: '#40506a', shadowA: 0.35, vig: 0.66, vigIn: 0.28 });
    void lt;
  }
  // "No driver. No horse." The upturned wheel still turning, rain running off it; an empty harness in the mud
  function shot3b(ctx, t, sh) {
    const u = span(t, sh.a - 0.3, sh.b + 0.3);
    const c = { x: lerp(-20, 20, ease(u)), y: lerp(-10, 10, ease(u)), z: lerp(1.08, 1.16, ease(u)) };
    view(ctx, c, 0.4);
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#5a5e62'); bg.addColorStop(1, '#2a2622'); ctx.fillStyle = bg; ctx.fillRect(-300, -200, W + 600, H + 400);
    ctx.save(); ctx.filter = 'blur(8px)'; ctx.drawImage(forest('mid', 812, { haze: '#5a5a58', k: 0.4, n: 16, trunk: 34, crown: 150, crownY: 0.15, base: 820 }), -300, -260); ctx.restore();
    view(ctx, c, 1);
    // the cart's side, seen close
    ctx.fillStyle = '#16110d'; ctx.beginPath(); ctx.moveTo(-200, 700); ctx.lineTo(1320, 760); ctx.lineTo(1300, 1300); ctx.lineTo(-200, 1300); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(140,128,110,0.3)'; ctx.lineWidth = 6; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-200, 780 + i * 110); ctx.lineTo(1310, 830 + i * 110); ctx.stroke(); }
    // the wheel, big, still turning
    const a = -t * 0.55, wx = 900, wy = 470, R = 330;
    ctx.save(); ctx.translate(wx, wy); ctx.scale(1, 0.92);
    ctx.strokeStyle = '#100c0a'; ctx.lineWidth = 46; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(180,186,190,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R + 18, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
    ctx.lineWidth = 18; ctx.strokeStyle = '#100c0a'; for (let k = 0; k < 10; k++) { const q = a + k / 10 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(q) * 40, Math.sin(q) * 40); ctx.lineTo(Math.cos(q) * R, Math.sin(q) * R); ctx.stroke(); }
    ctx.fillStyle = '#100c0a'; ctx.beginPath(); ctx.arc(0, 0, 64, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(170,176,180,0.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 60, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    ctx.restore();
    // drops flung from the rim and running down
    const r = rng(361); ctx.fillStyle = 'rgba(200,210,220,0.6)';
    for (let i = 0; i < 26; i++) { const q = r() * TAU, life = 0.8 + r() * 0.6, age = ((t + r() * life) % life) / life, px = wx + Math.cos(q) * R + age * 60 * Math.cos(q + 1), py = wy + Math.sin(q) * R * 0.92 + age * age * 300; ctx.beginPath(); ctx.ellipse(px, py, 3, 6, 0, 0, TAU); ctx.fill(); }
    // the broken trace lying in the mud: no horse at the end of it
    ctx.strokeStyle = '#1e1610'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(1320, 980); ctx.bezierCurveTo(1500, 1010, 1650, 960, 1980, 1040); ctx.stroke();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    rainOver(ctx, t, { n: 300, angle: 0.12, speed: 1400, len: 60, alpha: 0.22, seed: 362 });
    finish(ctx, { bloom: 0.1, shadow: '#40506a', shadowA: 0.4, vig: 0.7, vigIn: 0.25 });
  }
  // "Then the arrows." Streaks out of the dark trees; the escort falls; his horse goes down
  function shot3c(ctx, t, sh) {
    const T = TT(), u = span(t, sh.a - 0.3, sh.b + 0.3), lt = t - T.arrow0;
    const [sx, sy] = K.shake(t, 10 * win(lt, 0.15, 1.2, 0.05, 0.8), 371);
    const c = { x: lerp(-10, 20, ease(u)) + sx, y: sy, z: lerp(1.08, 1.14, ease(u)) };
    const S = roadStatic();
    view(ctx, c, 0.5); ctx.drawImage(S.c, -S.OX - 260, -S.OY);
    view(ctx, c, 0.8);
    cart(ctx, 1500, 905, 130, t, -t * 0.25);
    // the riders, halted: the escorts struck and falling, Cael's horse rearing and going down
    const fallE1 = smooth(span(lt, 0.35, 1.0)), fallE2 = smooth(span(lt, 0.55, 1.25)), rear = smooth(span(lt, 0.6, 1.0)) * (1 - smooth(span(lt, 1.1, 1.7))), down = smooth(span(lt, 1.15, 1.9));
    const base = [[1060, 900, 255], [880, 880, 240], [720, 912, 232]];
    for (let k = 2; k >= 0; k--) {
      const [px, py, hh] = base[k];
      ctx.save(); ctx.translate(px, py);
      if (k === 0) { ctx.rotate(-rear * 0.5 + down * 1.35); ctx.translate(0, down * hh * 0.25); }
      const draw = f => {
        K.horse(ctx, 0, 0, hh, { face: 1, fill: f, walk: k === 0 && rear > 0.05 ? 2.0 : undefined });
        // the rider: thrown back off the saddle (escorts), or flung as his horse falls (Cael)
        const fallA = k === 1 ? fallE1 : k === 2 ? fallE2 : down;
        ctx.save(); ctx.translate(-hh * 0.02, -hh * 0.97 + hh * 0.26); ctx.rotate(-fallA * (k === 0 ? 0.9 : 1.5)); ctx.translate(-fallA * hh * 0.4, fallA * hh * 0.55);
        K.figure(ctx, 0, hh * 0.27, hh * 1.1, { kind: 'cloak', head: k ? 'kettle' : 'hair', hold: k ? 'spear' : 'spear', face: 1, fill: f, seated: true });
        ctx.restore();
      };
      rimmed(ctx, draw, 'rgba(170,176,180,0.9)', '#0c0a09', hh * 0.008, hh * 0.008);
      ctx.restore();
    }
    view(ctx, c, 1.35);
    ctx.drawImage(forest('near2', 814, { haze: '#1a1816', k: 0.05, n: 3, trunk: 140, crown: 280, crownY: 0.0, base: H + 200, w: W + 900 }), -600, -120);
    // arrows: bright streaks out of the dark wood at the left, over everything, each leaving its shaft where it strikes
    view(ctx, c, 0.8);
    ctx.save(); ctx.lineCap = 'round';
    const shots = [[0.0, 1060, 790, 0], [0.1, 1110, 760, 1], [0.24, 900, 810, 2], [0.36, 960, 840, 3], [0.5, 760, 800, 4], [0.62, 1180, 740, 5], [0.78, 1000, 820, 6], [0.95, 1120, 800, 7], [1.1, 700, 840, 8]];
    for (const [d, tx, ty, i] of shots) {
      const a = span(lt, d, d + 0.24); if (a <= 0) continue;
      const x0 = 120 + (i % 3) * 110, y0 = 560 + (i % 4) * 45, px = lerp(x0, tx, Math.min(1, a)), py = lerp(y0, ty, Math.min(1, a)), L = 420;
      const dx = tx - x0, dy = ty - y0, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
      if (a < 1) {
        const tl = Math.min(L, Math.hypot(px - x0, py - y0) + 40), g = ctx.createLinearGradient(px - ux * tl, py - uy * tl, px, py); g.addColorStop(0, 'rgba(220,226,230,0)'); g.addColorStop(1, 'rgba(250,250,246,1)');
        ctx.strokeStyle = 'rgba(230,236,240,0.25)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(px - ux * tl * 0.5, py - uy * tl * 0.5); ctx.lineTo(px, py); ctx.stroke();
        ctx.strokeStyle = g; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px - ux * tl, py - uy * tl); ctx.lineTo(px, py); ctx.stroke();
      } else if (lt < 2.2) { ctx.strokeStyle = 'rgba(12,10,9,0.95)'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(tx - ux * 46, ty - uy * 46); ctx.lineTo(tx + ux * 4, ty + uy * 4); ctx.stroke(); ctx.strokeStyle = 'rgba(200,206,210,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx - ux * 46, ty - uy * 46 - 2); ctx.lineTo(tx - ux * 36, ty - uy * 36 - 6); ctx.stroke(); }
    }
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    rainOver(ctx, t, { n: 460, angle: 0.16, speed: 1500, len: 54, alpha: 0.2, seed: 372 });
    finish(ctx, { bloom: 0.12, shadow: '#40506a', shadowA: 0.38, vig: 0.7, vigIn: 0.26 });
  }

  // ================================================================ L36: hooded, masked men come out of the trees with torches and close round him
  const RING = [[-760, 0.0, 0.62], [-480, 0.15, 0.78], [-220, 0.45, 0.7], [260, 0.3, 0.74], [520, 0.05, 0.86], [790, 0.25, 0.66], [-620, 0.7, 1.05], [660, 0.6, 1.1]];
  function shot4(ctx, t, sh) {
    const T = TT(), u = span(t, sh.a - 0.3, sh.b + 0.3), lt = t - sh.a;
    const c = { x: lerp(40, 10, ease(u)), y: lerp(40, 60, ease(u)), z: lerp(1.08, 1.34, ease(u)), r: lerp(0.012, -0.01, u) };
    view(ctx, c, 0.3);
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2a2e34'); bg.addColorStop(0.6, '#3a3632'); bg.addColorStop(1, '#141210'); ctx.fillStyle = bg; ctx.fillRect(-400, -300, W + 800, H + 600);
    ctx.drawImage(forest('dusk', 821, { haze: '#30323a', k: 0.6, n: 26, trunk: 22, crown: 110, crownY: 0.2, base: 760 }), -400, -100);
    fog(ctx, 6, [70, 70, 76], 560, 220, t * 8, 0.5, -400, W + 800);
    view(ctx, c, 0.6);
    ctx.drawImage(forest('dusk2', 822, { haze: '#22201e', k: 0.35, n: 14, trunk: 44, crown: 160, crownY: 0.1, base: 860 }), -400, -150);
    // mud and the fallen horse behind him
    const gg = ctx.createLinearGradient(0, 760, 0, H + 100); gg.addColorStop(0, '#2a2420'); gg.addColorStop(1, '#0e0c0a'); ctx.fillStyle = gg; ctx.fillRect(-400, 780, W + 800, 500);
    view(ctx, c, 0.85);
    ctx.save(); ctx.translate(1240, 880); ctx.rotate(1.45); K.horse(ctx, 0, 0, 220, { face: -1, fill: '#0c0a09' }); ctx.restore();
    // the men: they step out of the dark wood toward him, torches flaring; firelight on the wet ground
    const torches = [];
    const step = (i) => smooth(span(lt, 0.2 + RING[i][1] * 1.6, 1.8 + RING[i][1] * 1.6));
    RING.forEach(([dx, d, sc], i) => {
      const s2 = step(i), hh = 420 * sc * lerp(0.88, 1, s2), x = 960 + dx * lerp(1.15, 0.92, s2), y = 820 + (sc - 0.62) * 600 + s2 * 20;
      const p = killer(ctx, x, y, hh, dx < 0 ? 1 : -1, { torch: i % 2 === 0 || i === 7, walk: s2 < 0.98 ? lt * 5 + i : undefined, fill: '#070505' });
      if (p.torch) torches.push([p.torch, hh, i]);
    });
    // Cael on foot in the mud, cloak and spear, facing them
    view(ctx, c, 0.95);
    const ch = 440, cx = 980, cy = 860;
    rimLit(ctx, (cc, fill) => person(cc, { x: cx, y: cy, h: ch, face: 1, fill, dress: 'cloak', hat: 'hair', hold: 'spear', armN: [0.5, 0.9], legN: [0.2, 0.15], legF: [-0.25, 0.1], lean: -0.05, t }), { rim: '#ffaa66', mid: '#4a2818', dark: '#0d0907', dx: 5, dy: 4, steps: 3, box: [cx - 320, cy - 640, 640, 680], key: 'c4' });
    view(ctx, c, 0.85);
    for (const [p, hh, i] of torches) torchFire(ctx, p, hh, t, i);
    // their light on the puddles
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const [p, hh] of torches) { const g = ctx.createRadialGradient(p[0], 900, 0, p[0], 900, hh * 0.6); g.addColorStop(0, 'rgba(255,140,60,0.18)'); g.addColorStop(1, 'rgba(255,140,60,0)'); ctx.fillStyle = g; ctx.fillRect(p[0] - hh, 860, hh * 2, 120); } ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    rainOver(ctx, t, { n: 380, angle: 0.15, speed: 1450, len: 50, alpha: 0.18, seed: 381, lights: torches.map(([p, hh]) => ({ x: p[0], y: p[1], r: hh * 0.8, rgb: [255, 160, 90], a: 1 })) });
    finish(ctx, { bloom: 0.3, shadow: '#30405a', shadowA: 0.3, vig: 0.72, vigIn: 0.26 });
  }

  // ================================================================ L37: his name torn from the Muster record and put to a torch
  function musterPage(other) {
    return K.cached('p6:page' + (other ? '2' : ''), () => {
      const w = 900, h = 1200, c = K.parchment(w, h, 3737, { stains: 2, edge: 0.9 }), x = c.getContext('2d');
      x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = 'rgba(120,80,40,0.3)'; x.lineWidth = 1.2; for (let i = 0; i < 14; i++) { const y = 120 + i * 74; x.beginPath(); x.moveTo(70, y); x.lineTo(w - 60, y); x.stroke(); }
      const r = rng(3838), scrib = (x0, y0, len, seed) => { const pts = []; for (let k = 0; k <= len; k += 3) pts.push([x0 + k, y0 - Math.abs(Math.sin(k * 0.21 + seed)) * 14 * (0.4 + 0.6 * K.noise(k * 0.05, seed, 7)) + 5 * Math.sin(k * 0.6 + seed)]); x.fillStyle = 'rgba(40,24,12,0.8)'; K.nib(x, pts, { w: 3.5, angle: -0.6, min: 0.25, taper: 0.04, jit: 0.3, seed }); };
      for (let i = 0; i < 14; i++) { if (!other && (i === 2 || i === 3)) continue; const y = 112 + i * 74; scrib(90, y, 160 + r() * 120, i * 5 + 1 + (other ? 50 : 0)); scrib(330, y, 220 + r() * 260, i * 5 + 2 + (other ? 50 : 0)); }
      if (!other) { x.font = 'italic 600 64px "EB Garamond"'; x.fillStyle = '#26160a'; x.fillText('Cael', 90, 268); x.font = 'italic 500 44px "EB Garamond"'; x.fillText('ward of Ealdholt', 320, 268); x.fillText('parentage: unknown', 320, 336); }
      x.restore();
      return c;
    });
  }
  function glove(ctx, x, y, s, rot, grip) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = '#120d0a'; ctx.beginPath(); ctx.moveTo(0.4, 0.2); ctx.lineTo(1.6, 0.4); ctx.lineTo(1.6, -0.5); ctx.lineTo(0.4, -0.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1e1612'; ctx.beginPath(); ctx.ellipse(0.25, -0.05, 0.32, 0.26, 0, 0, TAU); ctx.fill();
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(-0.05 - grip * 0.08, -0.22 + k * 0.12, 0.2 - grip * 0.06, 0.055, -0.2, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(0.1, 0.2, 0.18, 0.07, 0.8, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,170,90,0.35)'; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.ellipse(0.25, -0.05, 0.32, 0.26, 0, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    ctx.restore();
  }
  function shot5a(ctx, t, sh) {
    const T = TT(), u = span(t, sh.a - 0.3, sh.b + 0.3), lt = t - T.a37;
    const c = { x: lerp(-20, 30, ease(u)), y: lerp(0, -10, ease(u)), z: lerp(1.02, 1.12, ease(u)) };
    view(ctx, c, 0.4); ctx.fillStyle = '#0c0907'; ctx.fillRect(-300, -200, W + 600, H + 400);
    ctx.drawImage(K.cached('p6:pagebg', () => { const c2 = K.canvas(W / 2, H / 2), x = c2.getContext('2d'); x.scale(0.5, 0.5); x.filter = 'blur(6px)'; for (let i = 0; i < 9; i++) { const px = 200 + i * 220, py = 300 + (i % 3) * 120; glow(x, [255, 140, 60], px, py, 90, 0.12); x.fillStyle = '#060404'; x.fillRect(px - 30, 0, 60, H); } return c2; }), 0, 0, W, H);
    view(ctx, c, 1);
    // the record, bound in dark leather, held open
    const tear = smooth(span(t, T.tear0, T.tear1)), lift = smooth(span(t, T.tear1 - 0.1, T.burn0 + 0.3));
    ctx.save(); ctx.translate(700, 620); ctx.rotate(-0.12);
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(-620, -460, 1160, 900);
    const page = musterPage();
    ctx.drawImage(musterPage(true), -600, -440, 520, 860);           // the left page stays
    ctx.fillStyle = 'rgba(20,10,4,0.5)'; ctx.fillRect(-82, -440, 20, 860);
    ctx.restore();
    // the right page: torn from the top down along the binding, then lifted away toward the torch
    const px = lerp(1040, 1260, lift), py = lerp(620, 380, lift), pr = lerp(-0.12, 0.35, lift);
    const burn = span(t, T.burn0, T.burn0 + 2.4);
    ctx.save(); ctx.translate(px, py); ctx.rotate(pr);
    ctx.beginPath(); ctx.moveTo(-260, -440);
    for (let k = 0; k <= 20; k++) { const v = k / 20, yy = lerp(-440, 420, v), torn = v < tear; ctx.lineTo(-260 + (torn ? (K.noise(v * 30, 1, 5) - 0.5) * 14 + 6 : 0), yy); }
    ctx.lineTo(260, 420); ctx.lineTo(260, -440); ctx.closePath(); ctx.save(); ctx.clip();
    ctx.drawImage(page, -260, -440, 520, 860);
    // the fire eats it from the lower corner: char at the front, the page gone behind
    if (burn > 0) {
      const F = K.cached('p6:burnF', () => K.field(64, 106, [{ x: 0.95, y: 0.98, d: 0 }, { x: 0.7, y: 1.0, d: 0.12 }], 3741, { warp: 0.22 }));
      const m = K.mask(F, burn * 1.15, 0.04), rimc = K.rim(F, burn * 1.15, 0.06);
      ctx.globalCompositeOperation = 'destination-out'; ctx.drawImage(m, -260, -440, 520, 860); ctx.globalCompositeOperation = 'source-atop';
      ctx.globalCompositeOperation = 'source-over';
      const R = K.layer('p6:rim', 64, 106), rx = R.getContext('2d'); rx.drawImage(rimc, 0, 0); rx.globalCompositeOperation = 'source-in'; rx.fillStyle = '#1a0a04'; rx.fillRect(0, 0, 64, 106);
      ctx.drawImage(R, -260, -440, 520, 860);
      ctx.globalCompositeOperation = 'lighter'; const R2 = K.layer('p6:rim2', 64, 106), r2 = R2.getContext('2d'); r2.drawImage(K.rim(F, burn * 1.15 - 0.02, 0.025), 0, 0); r2.globalCompositeOperation = 'source-in'; r2.fillStyle = '#ff9a40'; r2.fillRect(0, 0, 64, 106); ctx.drawImage(R2, -260, -440, 520, 860);
    }
    ctx.restore();
    ctx.restore();
    // the gloved hands: one pins the book, one tears and lifts the page
    glove(ctx, 420, 760, 150, 0.4, 0.5);
    glove(ctx, px + 140 * Math.cos(pr) - 380 * Math.sin(pr) * 0, py - 400, 160, -0.6 + lift * 0.4, 1);
    // the torch at the right, the page's corner put to it
    const tp = [1560, 760]; ctx.fillStyle = '#1a120c'; ctx.save(); ctx.translate(tp[0], tp[1]); ctx.rotate(0.3); ctx.fillRect(-16, 0, 32, 600); ctx.restore();
    torchFire(ctx, tp, 900, t, 5, 1);
    if (burn > 0) { const fx = px + 200, fy = py + 360; for (let k = 0; k < 3; k++) flame(ctx, fx - k * 70 * burn, fy - k * 120 * burn, 60 + 60 * burn, t + k, 11 + k, 1); glow(ctx, [255, 150, 60], fx - 60, fy - 100, 360, 0.3 * Math.min(1, burn * 3)); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    K.embers(ctx, t, { n: burn > 0 ? 30 : 8, heat: 0.7, x: 1000, y: 200, w: 800, h: 700, seed: 371 });
    finish(ctx, { bloom: 0.34, vig: 0.7, vigIn: 0.25, warm: '#ff9a50', warmA: 0.06 });
  }

  // ================================================================ L37: a fire built in a clearing, an iron grate set over it on stones
  function clearingBG() {
    return K.cached('p6:clear', () => {
      const OX = 300, OY = 200, c = K.canvas(W + 2 * OX, H + 2 * OY), x = c.getContext('2d'); x.translate(OX, OY);
      const g = x.createLinearGradient(0, -OY, 0, H + OY); g.addColorStop(0, '#0a0c12'); g.addColorStop(0.55, '#16141a'); g.addColorStop(1, '#0a0806'); x.fillStyle = g; x.fillRect(-OX, -OY, W + 2 * OX, H + 2 * OY);
      x.drawImage(forest('night', 851, { haze: '#101216', k: 0.5, n: 28, trunk: 26, crown: 120, crownY: 0.15, base: 700 }), -OX, -OY);
      x.drawImage(forest('night2', 852, { haze: '#0a0a0c', k: 0.2, n: 12, trunk: 54, crown: 180, crownY: 0.05, base: 760, lit: 'rgba(255,140,60,0.18)' }), -OX, -OY - 60);
      const gg = x.createLinearGradient(0, 700, 0, H + OY); gg.addColorStop(0, '#1e1812'); gg.addColorStop(1, '#0a0806'); x.fillStyle = gg; x.beginPath(); x.ellipse(960, 980, 1500, 330, 0, 0, TAU); x.fill();
      return { c, OX, OY };
    });
  }
  // the gridiron: an iron grate in perspective (a parallelogram of bars), at (x, y) with half-width w, depth d
  function grate(ctx, x, y, w, d, glowA) {
    ctx.save(); ctx.lineCap = 'round';
    const P = (u, v) => [x + u * w + v * w * 0.12, y + v * d];
    ctx.strokeStyle = '#151210'; ctx.lineWidth = Math.max(2, w * 0.025);
    for (let i = 0; i <= 10; i++) { const u = -1 + i / 5, a = P(u, -1), b = P(u, 1); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    ctx.lineWidth = Math.max(3, w * 0.04); for (const v of [-1, 1]) { const a = P(-1.05, v), b = P(1.05, v); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    if (glowA > 0) { ctx.strokeStyle = `rgba(255,140,60,${glowA})`; ctx.lineWidth = Math.max(1, w * 0.008); for (let i = 0; i <= 10; i++) { const u = -1 + i / 5, a = P(u, -1), b = P(u, 1); ctx.beginPath(); ctx.moveTo(a[0], a[1] + 2); ctx.lineTo(b[0], b[1] + 2); ctx.stroke(); } }
    ctx.restore();
  }
  function woodPile(ctx, x, y, s, r0) {
    const r = rng(r0); ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) { const a = (r() - 0.5) * 1.2, l = s * (0.6 + r() * 0.6), cx = x + (r() - 0.5) * s * 0.6, cy = y - r() * s * 0.25; ctx.strokeStyle = r() < 0.5 ? '#1e1610' : '#2a1e14'; ctx.lineWidth = s * (0.05 + r() * 0.04); ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * l / 2, cy - Math.sin(a) * l / 2 * 0.4); ctx.lineTo(cx + Math.cos(a) * l / 2, cy + Math.sin(a) * l / 2 * 0.4); ctx.stroke(); }
    ctx.restore();
  }
  function stones(ctx, x, y, w) { ctx.fillStyle = '#26221e'; for (const [dx, dy, r] of [[-1, -0.6, 0.12], [1, -0.6, 0.12], [-1.05, 0.7, 0.14], [1.05, 0.7, 0.14]]) { ctx.beginPath(); ctx.ellipse(x + dx * w + dy * w * 0.12, y + dy * w * 0.3, r * w, r * w * 0.7, 0, 0, TAU); ctx.fill(); } }
  function shot5b(ctx, t, sh) {
    const T = TT(), u = span(t, sh.a - 0.3, sh.b + 0.3), lt = t - sh.a;
    const c = { x: lerp(-30, 30, ease(u)), y: lerp(90, 70, ease(u)), z: lerp(1.2, 1.3, ease(u)) };
    const B = clearingBG();
    view(ctx, c, 0.5); ctx.drawImage(B.c, -B.OX, -B.OY);
    view(ctx, c, 1);
    const fx = 960, fy = 860, gw = 230, gd = 70;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gl0 = ctx.createRadialGradient(fx, fy + 40, 0, fx, fy + 40, 760); gl0.addColorStop(0, 'rgba(150,80,40,0.35)'); gl0.addColorStop(1, 'rgba(150,80,40,0)'); ctx.fillStyle = gl0; ctx.beginPath(); ctx.ellipse(fx, fy + 40, 800, 240, 0, 0, TAU); ctx.fill(); ctx.restore();
    stones(ctx, fx, fy, gw);
    woodPile(ctx, fx, fy + 10, 420, 51);
    // two men carry the grate in and lower it onto the stones
    const g = smooth(span(t, T.grate0, T.grate1)), gy = lerp(fy - 300, fy - 20, g), gx = lerp(fx - 520, fx, smooth(span(t, T.grate0 - 1.0, T.grate1 - 0.4)));
    const torches = [];
    const men = [[gx - gw - 90, 1, 0], [gx + gw + 90, -1, 1]];
    for (const [mx, face, i] of men) { killer(ctx, mx, fy + 40, 470, face, { reachN: [mx + face * 110, gy + 10], reachF: [mx + face * 90, gy + 20], lean: 0.12 + 0.2 * (1 - g), walk: g < 0.5 ? lt * 5 + i : undefined }); }
    grate(ctx, gx, gy, gw, gd, 0);
    // the others stand round with torches; one stacks the last branches
    const ring = [[480, 820, 400, 1], [1440, 830, 410, -1], [300, 900, 470, 1], [1640, 905, 480, -1]];
    ring.forEach(([x, y, h, face], i) => { const p = killer(ctx, x, y, h, face, { torch: true, fill: '#070505' }); torches.push([p.torch, h, i]); });
    for (const [p, h, i] of torches) { torchFire(ctx, p, h, t, 20 + i); glow(ctx, [255, 130, 60], p[0], p[1] + h * 0.4, h * 1.6, 0.16); }
    // the clearing in their light; the pile and the iron catching it
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 800); lg.addColorStop(0, 'rgba(255,130,60,0.26)'); lg.addColorStop(1, 'rgba(255,130,60,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 200, W, 1000); ctx.restore();
    grate(ctx, gx, gy, gw, gd, 0.35);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    rainOver(ctx, t, { n: 200, angle: 0.15, speed: 1400, len: 46, alpha: 0.12, seed: 391, lights: torches.map(([p, h]) => ({ x: p[0], y: p[1], r: h * 0.8, rgb: [255, 160, 90], a: 1 })) });
    finish(ctx, { bloom: 0.32, shadow: '#30405a', shadowA: 0.25, vig: 0.72, vigIn: 0.26 });
  }

  // ================================================================ A05: "Burn him. Not one bone." The leader's order; the torch to the kindling
  function shot6a(ctx, t, sh) {
    const u = span(t, sh.a - 0.3, sh.b + 0.3);
    const c = { x: lerp(-10, 20, ease(u)), y: 0, z: lerp(1.08, 1.15, ease(u)) };
    const B = clearingBG();
    view(ctx, c, 0.5); ctx.save(); ctx.filter = 'blur(5px)'; ctx.drawImage(B.c, -B.OX, -B.OY); ctx.restore();
    view(ctx, c, 1);
    // the leader in profile, masked under his hood, torch raised beside him; he turns his head to his men
    const h = 1500, x = 820, y = 1520, turn = smooth(span(t, sh.a + 0.5, sh.a + 1.1));
    const pose = { x, y, h, face: 1, dress: 'cloak', hat: 'hood', armN: [0.9, 1.5], tilt: lerp(0.0, -0.08, turn), lean: 0.02 };
    const out = person(K.layer('p6:dummy', 4, 4).getContext('2d'), Object.assign({}, pose, { fill: '#000' }));
    const tp = [out.hand[0] + 40, out.hand[1] - 250];
    ctx.fillStyle = '#16100c'; ctx.save(); ctx.translate(out.hand[0], out.hand[1]); ctx.rotate(0.15); ctx.fillRect(-14, -260, 28, 330); ctx.restore();
    rimLit(ctx, (cc, fill) => person(cc, Object.assign({}, pose, { fill })), { rim: '#ff9a50', mid: '#3a1c10', dark: '#080505', dx: -9, dy: 5, steps: 4, box: [x - 900, y - 1600, 1500, 1200], key: 'lead' });
    // the mask: plain dark cloth over the face, its upper edge catching the fire
    const hd = out.head; ctx.strokeStyle = 'rgba(255,150,80,0.55)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hd[0] + h * 0.075, hd[1] - h * 0.005); ctx.quadraticCurveTo(hd[0] + h * 0.04, hd[1] + h * 0.004, hd[0] + h * 0.005, hd[1] - h * 0.002); ctx.stroke();
    ctx.fillStyle = 'rgba(255,190,120,0.75)'; ctx.beginPath(); ctx.ellipse(hd[0] + h * 0.055, hd[1] - h * 0.02, h * 0.006, h * 0.003, 0, 0, TAU); ctx.fill();
    torchFire(ctx, tp, 1200, t, 31);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    K.embers(ctx, t, { n: 24, heat: 0.6, x: tp[0] - 200, y: 0, w: 500, h: 500, seed: 611 });
    rainOver(ctx, t, { n: 160, angle: 0.15, speed: 1400, len: 60, alpha: 0.14, seed: 612, lights: [{ x: tp[0], y: tp[1], r: 700, rgb: [255, 160, 90], a: 1 }] });
    finish(ctx, { bloom: 0.34, vig: 0.74, vigIn: 0.24, warm: '#ff9a50', warmA: 0.06 });
  }
  function shot6b(ctx, t, sh) {
    const T = TT(), u = span(t, sh.a - 0.3, sh.b + 0.3), lt = t - T.light0;
    const c = { x: lerp(-10, 10, ease(u)), y: lerp(10, -20, ease(u)), z: lerp(1.1, 1.16, ease(u)) };
    view(ctx, c, 0.5); const B = clearingBG(); ctx.save(); ctx.filter = 'blur(4px)'; ctx.drawImage(B.c, -B.OX, -B.OY); ctx.restore();
    view(ctx, c, 1);
    // low and close: the stones, the kindling, the grate over it; the torch comes down and the fire takes
    const fx = 960, fy = 820, gw = 640, gd = 150, heat = clamp(lt / 1.6), catchA = smooth(span(lt, 0, 0.5));
    stones(ctx, fx, fy + 60, gw);
    woodPile(ctx, fx, fy + 110, 900, 52);
    if (lt > -0.1) fire(ctx, fx, fy + 120, 520 * (0.3 + 0.7 * heat), 560 * (0.25 + 0.75 * heat), t, 6, { heat: catchA, n: 9, slot: 'b' });
    glow(ctx, [255, 140, 60], fx, fy, 900 * (0.4 + heat * 0.6), 0.32 * catchA);
    grate(ctx, fx, fy - 60, gw, gd, 0.5 * catchA);
    // the torch, lowered into the kindling from the upper right
    const down = smooth(span(t, sh.a, T.light0 + 0.1)), tx = lerp(1500, 1060, down), ty = lerp(300, 830, down);
    ctx.save(); ctx.strokeStyle = '#120c08'; ctx.lineCap = 'round'; ctx.lineWidth = 30; ctx.beginPath(); ctx.moveTo(tx + 340, ty - 520); ctx.lineTo(tx, ty); ctx.stroke(); ctx.restore();
    torchFire(ctx, [tx, ty], 900, t, 41, 1);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    K.embers(ctx, t, { n: 20 + 40 * heat, heat: 0.8, x: 500, y: 100, w: 900, h: 800, seed: 621 });
    finish(ctx, { bloom: 0.4, vig: 0.72, vigIn: 0.25, warm: '#ff9a50', warmA: 0.08 });
  }

  // ================================================================ L38: "He did not beg." Bound, on his knees, rain on his face, looking up at them
  function shot7(ctx, t, sh) {
    const T = TT(), u = span(t, sh.a - 0.3, sh.b + 0.5), heat = 0.55 + 0.45 * smooth(span(t, T.light0, T.b38));
    const c = { x: lerp(10, -10, ease(u)), y: lerp(10, -10, ease(u)), z: lerp(1.04, 1.1, ease(u)) };
    view(ctx, c, 0.4);
    const bg = ctx.createLinearGradient(0, 0, W, 0); bg.addColorStop(0, '#0a0a0e'); bg.addColorStop(1, '#1e0e08'); ctx.fillStyle = bg; ctx.fillRect(-300, -200, W + 600, H + 400);
    ctx.save(); ctx.filter = 'blur(8px)'; ctx.drawImage(clearingBG().c, -400, -300); ctx.restore();
    // the fire's light from the right, breathing
    const fl = flick(t, 9, 7) * heat;
    glow(ctx, [255, 120, 50], -150, 820, 1400, 0.42 * fl);
    view(ctx, c, 1);
    // standing over him at the edges: the dark legs and torches of his killers
    killer(ctx, 120, 1520, 1900, 1, { fill: '#050404', torch: true }); killer(ctx, 1860, 1560, 2000, -1, { fill: '#050404' });
    caelProfile(ctx, 1060, 470, 560, t, 0, { look: -0.3, light: 'fire', rainy: true, bound: true, lightA: heat });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    rainOver(ctx, t, { n: 260, angle: 0.1, speed: 1300, len: 64, alpha: 0.18, seed: 701, lights: [{ x: 300, y: 500, r: 1000, rgb: [255, 150, 80], a: 0.9 * heat }] });
    finish(ctx, { bloom: 0.3, vig: 0.78, vigIn: 0.22, warm: '#ff8a40', warmA: 0.07 });
  }

  // ================================================================ the plan of shots, and the scene
  let PLAN = null;
  function plan() {
    if (PLAN) return PLAN; const T = TT();
    const S = [
      { id: '1', fn: shot1, x: 0 }, { id: '2a', fn: shot2a, x: 0.5 }, { id: '2b', fn: shot2b, x: 0.35 },
      { id: '3a', fn: shot3a, x: 0.6 }, { id: '3b', fn: shot3b, x: 0.3 }, { id: '3c', fn: shot3c, x: 0 },
      { id: '4', fn: shot4, x: 0.25 }, { id: '5a', fn: shot5a, x: 0.35 }, { id: '5b', fn: shot5b, x: 0.4 },
      { id: '6a', fn: shot6a, x: 0.3 }, { id: '6b', fn: shot6b, x: 0 }, { id: '7', fn: shot7, x: 0.3 },
    ];
    const b = [T.s - 3, T.s2a, T.s2b, T.s3a, T.s3b, T.s3c, T.s4, T.s5a, T.s5b, T.s6a, T.s6b, T.s7, T.e + 4];
    S.forEach((s, i) => { s.a = b[i]; s.b = b[i + 1]; });
    PLAN = S; return S;
  }
  SCENES[6] = {
    join: 'dissolve', joinDur: 1.2,
    draw(ctx, t, sc) {
      void sc; const S = plan();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
      let i = S.findIndex(s => t < s.b); if (i < 0) i = S.length - 1;
      const cur = S[i], nxt = S[i + 1];
      const into = cur.x > 0 && i > 0 && t < cur.a + cur.x / 2, out = nxt && nxt.x > 0 && t > nxt.a - nxt.x / 2;
      if (into || out) {
        const A = into ? S[i - 1] : cur, B = into ? cur : nxt, k = smooth((t - (B.a - B.x / 2)) / B.x);
        MIXING = true; A.fn(ctx, t, A);
        const Lr = K.layer('p6:next'), lx = Lr.getContext('2d'); B.fn(lx, t, B);
        MIXING = false;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = k; ctx.drawImage(Lr, 0, 0); ctx.globalAlpha = 1;
        bloom(ctx, 0.25);
      } else cur.fn(ctx, t, cur);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    },
  };
})();
