/* Scene 1: The Broken Seal [L01–L10].
   Out of the dark, a crane down through a moonlit sea of cloud onto the capital under its volcano, where the First-Born
   circle; the council chamber, seven seats around the Blood-Throne; Oswyn at his window; the reform and its six seals,
   the seventh place empty; the rookery bells; a First-Born falls on the city and the city looks up; the knife, told as a
   shadow on the wall; vermilion ink across the decree; at dawn a scribe strikes the names; and in the dark, the infant,
   alive. Every shot is keyed to the narration cues (and to the pauses inside the takes); nothing reads the clock.
   The helpers at the top are shared with scene 2 (SCENES[1].lib). */
(function () {
  'use strict';
  const K = window.KIT, P = K.P, W = K.W, H = K.H;
  const { clamp, lerp, smooth, ease, easeOut, easeIn, span, win, rng } = K;
  const SCENES = window.SCENES = window.SCENES || {};
  const TAU = Math.PI * 2;

  // ================================================================ small helpers
  const rgbs = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const hexc = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const fract = v => v - Math.floor(v);
  const flick = (t, s, sp = 9) => 0.78 + 0.14 * Math.sin(t * sp + s * 3.7) + 0.1 * Math.sin(t * sp * 2.3 + s * 1.3) + 0.06 * (K.noise(t * 6, s * 7.1, 3) - 0.5) * 2;
  // every drawing property back to its default, so a frame never depends on the one drawn before it
  function cleanState(x) {
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none';
    x.lineCap = 'butt'; x.lineJoin = 'miter'; x.lineWidth = 1; x.miterLimit = 10; x.setLineDash([]); x.lineDashOffset = 0;
    x.fillStyle = '#000'; x.strokeStyle = '#000'; x.shadowBlur = 0; x.shadowColor = 'rgba(0,0,0,0)'; x.shadowOffsetX = 0; x.shadowOffsetY = 0;
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'low'; x.font = '10px sans-serif'; x.textAlign = 'start'; x.textBaseline = 'alphabetic';
    return x;
  }
  function scratch(name, w, h) { const c = w ? K.layer(name, w, h) : K.layer(name); cleanState(c.getContext('2d')); return c; }
  // view(ctx, c, d): the transform for a layer at depth d (1 = the focal plane, smaller is farther, larger is nearer)
  function view(ctx, c, d = 1) {
    const z = 1 + (c.z - 1) * d;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(W / 2, H / 2);
    if (c.r) ctx.rotate(c.r * Math.min(1, d)); ctx.scale(z, z); ctx.translate(-W / 2 - c.x * d, -H / 2 - c.y * d);
  }
  function proj(c, d, x, y) { const z = 1 + (c.z - 1) * d; return [W / 2 + (x - W / 2 - c.x * d) * z, H / 2 + (y - H / 2 - c.y * d) * z, z]; }
  // a soft round light, cached per colour; drawn additively
  function glowImg(rgb) {
    return K.cached('s12:glow:' + rgb, () => {
      const s = 128, c = K.canvas(s, s), x = c.getContext('2d'), g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, rgbs(rgb, 1)); g.addColorStop(0.12, rgbs(rgb, 0.62)); g.addColorStop(0.35, rgbs(rgb, 0.2)); g.addColorStop(0.65, rgbs(rgb, 0.06)); g.addColorStop(1, rgbs(rgb, 0));
      x.fillStyle = g; x.fillRect(0, 0, s, s); return c;
    });
  }
  function glow(ctx, rgb, x, y, r, a) {
    if (a <= 0.004 || r < 0.5) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glowImg(rgb), x - r, y - r, 2 * r, 2 * r); ctx.restore();
  }
  function tinted(img, rgb, key) {
    return K.cached('s12:tint:' + key + ':' + rgb, () => {
      const c = K.canvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
      x.globalCompositeOperation = 'source-in'; x.fillStyle = `rgb(${rgb})`; x.fillRect(0, 0, c.width, c.height); return c;
    });
  }
  // a tapered stroke along pts (filled with the current fillStyle)
  function taper(x, pts, w0, w1 = 0) {
    if (pts.length < 2) return; const Lp = [], Rp = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, u = i / (pts.length - 1), w = lerp(w0, w1, u);
      Lp.push([pts[i][0] - dy / l * w / 2, pts[i][1] + dx / l * w / 2]); Rp.push([pts[i][0] + dy / l * w / 2, pts[i][1] - dx / l * w / 2]);
    }
    x.beginPath(); x.moveTo(Lp[0][0], Lp[0][1]); for (const q of Lp) x.lineTo(q[0], q[1]); for (let i = Rp.length - 1; i >= 0; i--) x.lineTo(Rp[i][0], Rp[i][1]); x.closePath(); x.fill();
  }
  // a small flame: a teardrop with a hot core; (x, y) its base, s its height
  function flame(ctx, x, y, s, t, seed, heat = 1) {
    if (s < 1.5) { glow(ctx, [255, 190, 110], x, y - s * 0.4, s * 2, 0.7 * heat); return; }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const ph = seed * 1.7 + k * 2.1, sw = Math.sin(t * 7.3 + ph) * 0.18 + (K.noise(t * 5, seed + k, 9) - 0.5) * 0.35;
      const hh = s * (1 - k * 0.22) * (0.85 + 0.25 * K.noise(t * 6.5 + k * 3, seed, 4)), ww = s * (0.36 - k * 0.07);
      const col = k === 0 ? [235, 96, 30] : k === 1 ? [255, 158, 60] : [255, 236, 190];
      ctx.globalAlpha = (k === 0 ? 0.6 : k === 1 ? 0.75 : 0.9) * heat; ctx.fillStyle = rgbs(col, 1);
      ctx.beginPath(); ctx.moveTo(x - ww, y);
      ctx.bezierCurveTo(x - ww * 1.1, y - hh * 0.45, x + sw * ww * 2 - ww * 0.3, y - hh * 0.7, x + sw * s * 0.5, y - hh);
      ctx.bezierCurveTo(x + sw * ww * 2 + ww * 0.3, y - hh * 0.7, x + ww * 1.1, y - hh * 0.45, x + ww, y);
      ctx.quadraticCurveTo(x, y + ww * 0.5, x - ww, y); ctx.fill();
    }
    ctx.restore();
  }
  // a candle flame: a slim teardrop that leans with the draught (lean in -1..1), a halo; returns nothing
  function candleFlame(ctx, x, y, h, t, seed, I = 1, lean = 0) {
    const fl = flick(t, seed, 11), hh = h * (0.85 + 0.2 * fl) * (0.6 + 0.4 * I), sw = Math.sin(t * 5.1 + seed) * 0.06 + lean * 0.5;
    glow(ctx, [255, 170, 80], x, y - hh * 0.5, h * 9 * (0.7 + 0.3 * I), 0.22 * fl * I);
    glow(ctx, [255, 214, 150], x, y - hh * 0.45, h * 2.4, 0.5 * fl * I);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 2; k++) {
      const w = h * (k ? 0.13 : 0.22), q = hh * (k ? 0.7 : 1);
      ctx.fillStyle = k ? `rgba(255,246,220,${0.9 * I})` : `rgba(255,170,70,${0.75 * I})`;
      ctx.beginPath(); ctx.moveTo(x - w, y); ctx.bezierCurveTo(x - w, y - q * 0.5, x + sw * h * 2, y - q * 0.8, x + sw * h * 3, y - q);
      ctx.bezierCurveTo(x + sw * h * 2 + w * 0.3, y - q * 0.7, x + w, y - q * 0.4, x + w, y); ctx.quadraticCurveTo(x, y + w * 0.6, x - w, y); ctx.fill();
    }
    ctx.restore();
  }
  // fire(ctx, x, y, w, h, t, seed, o): a living flame standing on (x, y), drawn at reduced size and enlarged (soft edges)
  function fire(ctx, x, y, w, h, t, seed, o = {}) {
    const heat = o.heat != null ? o.heat : 1, n = o.n || 8, sc2 = o.res || 0.3, cw = Math.ceil(w * 2.4 * sc2) + 6, ch = Math.ceil(h * 1.4 * sc2) + 6;
    const L = K.layer('s12:fire' + (o.slot || ''), cw, ch), lx = L.getContext('2d');
    lx.translate(cw / 2, ch - 3); lx.scale(sc2, sc2); lx.globalCompositeOperation = 'lighter';
    const tongue = (bx, hh, ww, sway, col, a) => {
      const g = lx.createLinearGradient(0, 0, 0, -hh); g.addColorStop(0, rgbs(col, a)); g.addColorStop(0.45, rgbs(col, a * 0.8)); g.addColorStop(1, rgbs(col, 0));
      lx.fillStyle = g; lx.beginPath(); lx.moveTo(bx - ww, 0);
      lx.bezierCurveTo(bx - ww * 1.1, -hh * 0.35, bx - ww * 0.35 + sway * 0.5, -hh * 0.62, bx + sway, -hh);
      lx.bezierCurveTo(bx + ww * 0.4 + sway * 0.5, -hh * 0.6, bx + ww * 1.1, -hh * 0.33, bx + ww, 0); lx.quadraticCurveTo(bx, ww * 0.35, bx - ww, 0); lx.fill();
    };
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
  // rimLit(ctx, draw, o): silhouettes lit along one edge. draw(c, fill, pass) paints them (pass 0 = the rim colour, then
  // the dark passes); a dark pass shifted by (o.dx, o.dy) screen px covers all but a sliver, which is the rim.
  function rimLit(ctx, draw, o) {
    const n = o.steps || 4, bx = o.box ? Math.max(0, Math.floor(o.box[0])) : 0, by = o.box ? Math.max(0, Math.floor(o.box[1])) : 0;
    const bw = o.box ? Math.max(1, Math.min(W - bx, Math.ceil(o.box[2]))) : W, bh = o.box ? Math.max(1, Math.min(H - by, Math.ceil(o.box[3]))) : H;
    const L = K.layer(o.box ? 's12:rimb:' + (o.key || 'k') : 's12:rim', bw, bh), lc = cleanState(L.getContext('2d')), m = ctx.getTransform();
    lc.clearRect(0, 0, bw, bh);
    lc.setTransform(m.a, m.b, m.c, m.d, m.e - bx, m.f - by); draw(lc, o.rim, 0);
    lc.globalCompositeOperation = 'source-atop';
    for (let i = 1; i <= n; i++) { const k = i / n; lc.setTransform(m.a, m.b, m.c, m.d, m.e - bx + o.dx * k, m.f - by + o.dy * k); lc.globalAlpha = i === n ? 1 : 0.42; draw(lc, i === 1 && o.mid ? o.mid : o.dark, i); }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); if (o.alpha != null) ctx.globalAlpha = o.alpha; ctx.drawImage(L, bx, by); ctx.restore();
  }
  // cheap bloom: the frame shrunk twice, its brights raised, laid back over it with screen
  function bloom(ctx, a = 0.3, th = 2) {
    if (a <= 0) return;
    const A = K.layer('s12:bl1', W / 4, H / 4), B = K.layer('s12:bl2', W / 8, H / 8), ax = A.getContext('2d'), bx = B.getContext('2d');
    ax.imageSmoothingQuality = 'low'; ax.drawImage(ctx.canvas, 0, 0, W / 4, H / 4);
    bx.drawImage(A, 0, 0, W / 8, H / 8);
    bx.globalCompositeOperation = 'multiply'; for (let i = 0; i < th; i++) bx.drawImage(B, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = a; ctx.imageSmoothingQuality = 'medium'; ctx.drawImage(B, 0, 0, W, H); ctx.restore();
  }
  // a horizontal band of mist (tileable texture), scrolled
  function fogTex(seed) {
    return K.cached('s12:fog:' + seed, () => {
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
    ctx.save(); ctx.globalAlpha = Math.min(1, a); for (let X = x0 - (((scroll % tw) + tw) % tw); X < x0 + w; X += tw) ctx.drawImage(tex, X, y, tw + 1, h); ctx.restore();
  }
  function vignetteImg(a, inner) {
    const qa = Math.round(a * 40) / 40, qi = Math.round(inner * 40) / 40;
    return K.cached(`s12:vig:${qa}:${qi}`, () => { const c = K.canvas(W, H), x = c.getContext('2d'); K.vignette(x, qa, '0,0,0', qi); return c; });
  }
  let MIXING = false;   // while two shots dissolve, each skips its bloom and the mix gets one
  // finish(ctx, o): bloom, a cold cast in the shadows, a warm overlay, the vignette, a lift, the tooth of the paint
  function finish(ctx, o = {}) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    if (o.bloom && !MIXING) bloom(ctx, o.bloom, o.bloomTh || 2);
    if (o.shadow) { const n = parseInt(o.shadow.slice(1), 16), k = (o.shadowA || 0.3) * 0.55, m = (v) => Math.round(255 - (255 - v) * k); ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(${m(n >> 16 & 255)},${m(n >> 8 & 255)},${m(n & 255)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (o.warm) K.grade(ctx, o.warm, 'overlay', o.warmA || 0.08);
    ctx.drawImage(vignetteImg(o.vig != null ? o.vig : 0.6, o.vigIn != null ? o.vigIn : 0.32), 0, 0);
    if (o.lift) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgbs(o.lift, 1); ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (!MIXING) K.paperTooth(ctx, o.tooth != null ? o.tooth : 0.07);
  }

  // ================================================================ people: silhouettes built from rounded limbs
  // person(ctx, o): a person in profile standing on (o.x, o.y), o.h tall, facing o.face (1 right). Pose: o.lean, o.tilt
  // (head), o.walk (phase), o.run (0..1, longer stride), or o.legN / o.legF [hip angle, knee bend]; o.armN / o.armF
  // [shoulder angle, elbow bend] or o.reachN / o.reachF [x, y] (two-bone IK in the ctx's units); o.sit (hip height, in h).
  // Dress: o.dress 'tunic' | 'robe' | 'cloak' | 'mail' | 'gown'; o.hat 'bare' | 'hair' | 'hood' | 'helm' | 'kettle' | 'cap';
  // o.beard; o.bulk; o.stoop; o.hold 'spear' | 'torch' | 'sword' | 'knife' | 'bundle' (carried in both arms at the chest).
  // o.fill, o.fill2 (the bundle). Returns { hand, handF, head, torch, blade:[a,b], bundle:[x,y,r] } in the ctx's units.
  function person(ctx, o) {
    const f = o.face || 1, h = o.h, bulk = o.bulk || 1, kid = !!o.child;
    const TH = kid ? 0.2 : 0.245, SH = kid ? 0.2 : 0.235, TOR = kid ? 0.29 : 0.31, UA = kid ? 0.15 : 0.175, FA = kid ? 0.13 : 0.155, HR = kid ? 0.085 : 0.062;
    const run = o.run || 0;
    const legPose = (s) => {
      if (o.sit) return s ? [1.45, 1.5] : [1.35, 1.35];
      if (o.walk != null) { const ph = o.walk + (s ? Math.PI : 0); return [(0.38 + run * 0.3) * Math.sin(ph), 0.08 + (0.75 + run * 0.6) * Math.max(0, Math.cos(ph + 0.4))]; }
      return (s ? o.legF : o.legN) || (s ? [-0.06, 0.04] : [0.07, 0.03]);
    };
    const legs = [0, 1].map(s => { const [a1, b1] = legPose(s), kx = Math.sin(a1) * TH, ky = Math.cos(a1) * TH, a2 = a1 - b1, ax = kx + Math.sin(a2) * SH, ay = ky + Math.cos(a2) * SH; return { kx, ky, ax, ay, a2 }; });
    const lowest = o.sit ? 0 : Math.max(legs[0].ay, legs[1].ay) + 0.03;
    const hipY = o.sit ? -o.sit : -lowest;
    const lean = (o.lean || 0) + (o.stoop || 0) * 0.5 + run * 0.25, dir = [Math.sin(lean), -Math.cos(lean)];
    const Pt = (lx, ly) => [o.x + f * lx * h, o.y + ly * h];
    const hip = [0, hipY], neck = [hip[0] + dir[0] * TOR, hip[1] + dir[1] * TOR];
    const sh = [neck[0] - dir[0] * 0.035 - 0.012, neck[1] - dir[1] * 0.035];
    const fillC = o.fill || '#000';
    ctx.save(); ctx.fillStyle = fillC; ctx.strokeStyle = fillC; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const cap = (a, b, ra, rb) => {
      const A = Pt(a[0], a[1]), B = Pt(b[0], b[1]), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, r1 = ra * h, r2 = rb * h;
      ctx.beginPath(); ctx.moveTo(A[0] + nx * r1, A[1] + ny * r1); ctx.lineTo(B[0] + nx * r2, B[1] + ny * r2); ctx.lineTo(B[0] - nx * r2, B[1] - ny * r2); ctx.lineTo(A[0] - nx * r1, A[1] - ny * r1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(A[0] + r1, A[1]); ctx.arc(A[0], A[1], r1, 0, TAU); ctx.moveTo(B[0] + r2, B[1]); ctx.arc(B[0], B[1], r2, 0, TAU); ctx.fill();
    };
    const poly = (pts) => { ctx.beginPath(); pts.forEach((p, i) => { const q = Pt(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fill(); };
    const curve = (pts) => {
      const Q = pts.map(p => Pt(p[0], p[1])), n = Q.length; ctx.beginPath(); ctx.moveTo((Q[n - 1][0] + Q[0][0]) / 2, (Q[n - 1][1] + Q[0][1]) / 2);
      for (let i = 0; i < n; i++) { const a = Q[i], b = Q[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } ctx.closePath(); ctx.fill();
    };
    const nrm = [-dir[1], dir[0]], at = (k, w) => [hip[0] + dir[0] * TOR * k + nrm[0] * w, hip[1] + dir[1] * TOR * k + nrm[1] * w];
    // the bundle sits against the chest, in front; the arms reach for it unless told otherwise
    let bundle = null;
    if (o.hold === 'bundle') { const c0 = at(0.66, 0.1 * bulk + 0.045); bundle = { c: c0, rx: 0.085, ry: 0.058 }; }
    const armAt = (near) => {
      const S = [sh[0] + (near ? 0.01 : -0.02), sh[1] + (near ? 0 : 0.005)];
      let tgt = near ? o.reachN : o.reachF;
      let T = null;
      if (tgt) T = [(tgt[0] - o.x) / (f * h), (tgt[1] - o.y) / h];
      else if (bundle && !(near ? o.armN : o.armF)) T = near ? [bundle.c[0] + 0.035, bundle.c[1] + 0.045] : [bundle.c[0] + 0.05, bundle.c[1] - 0.04];
      if (T) {
        const dx = T[0] - S[0], dy = T[1] - S[1], d = clamp(Math.hypot(dx, dy), 0.05, UA + FA - 0.002);
        const base = Math.atan2(dx, dy), cosE = clamp((UA * UA + d * d - FA * FA) / (2 * UA * d), -1, 1), ang = base + Math.acos(cosE) * (o.elbowOut ? -1 : 1);
        const E = [S[0] + Math.sin(ang) * UA, S[1] + Math.cos(ang) * UA], el = Math.hypot(T[0] - E[0], T[1] - E[1]) || 1, wr = [E[0] + (T[0] - E[0]) / el * FA, E[1] + (T[1] - E[1]) / el * FA];
        return { S, E, wr };
      }
      const sw = o.walk != null ? Math.sin(o.walk) * (0.35 + run * 0.6) : 0;
      const [a, b] = (near ? o.armN : o.armF) || (o.walk != null ? [(near ? -1 : 1) * sw, 0.25 + run * 0.9] : [near ? 0.08 : -0.06, 0.18]);
      const E = [S[0] + Math.sin(a) * UA, S[1] + Math.cos(a) * UA], wr = [E[0] + Math.sin(a + b) * FA, E[1] + Math.cos(a + b) * FA];
      return { S, E, wr };
    };
    const AN = armAt(true), AF = armAt(false);
    const limbW = (kid ? 0.03 : 0.037) * bulk, armW = (kid ? 0.027 : 0.033) * bulk;
    const drawArm = (A) => { cap(A.S, A.E, armW * 1.05, armW * 0.85); cap(A.E, A.wr, armW * 0.85, armW * 0.62); const hd = [A.wr[0] + (A.wr[0] - A.E[0]) * 0.18, A.wr[1] + (A.wr[1] - A.E[1]) * 0.18]; cap(A.wr, hd, armW * 0.75, armW * 0.62); };
    const drawLeg = (lg) => { const K2 = [hip[0] + lg.kx, hip[1] + lg.ky], A2 = [hip[0] + lg.ax, hip[1] + lg.ay]; cap([hip[0], hip[1] - 0.02], K2, limbW * 1.35, limbW); cap(K2, A2, limbW, limbW * 0.7); poly([[A2[0] - 0.03, A2[1] - 0.012], [A2[0] + 0.075, A2[1] + 0.006], [A2[0] + 0.08, A2[1] + 0.03], [A2[0] - 0.035, A2[1] + 0.03]]); return { K2, A2 }; };
    const farLeg = drawLeg(legs[1]);
    const t0 = o.t || 0;
    if (o.dress === 'cloak') {
      const sw = Math.sin(t0 * 1.3 + o.x * 0.01) * 0.02 + (o.wind || 0) + run * 0.12, fl = run ? Math.sin(t0 * 9 + o.x * 0.02) * 0.03 : 0;
      curve([[sh[0] + 0.02, sh[1] - 0.01], [sh[0] - 0.1, sh[1] + 0.02], [hip[0] - 0.15 - sw, hip[1] + 0.05 + fl], [hip[0] - 0.2 - sw * 2, hip[1] + 0.4 - run * 0.08 + fl], [hip[0] + 0.03, hip[1] + 0.34], [hip[0] + 0.04, hip[1]]]);
    }
    drawArm(AF);
    const st = (o.stoop || 0);
    curve([at(-0.02, -0.07 * bulk), at(0.35, -0.066 * bulk), at(0.72, -0.08 * bulk - st * 0.06), at(0.97, -0.07 * bulk - st * 0.05), at(1.05, -0.01), at(1.0, 0.065 * bulk), at(0.74, 0.082 * bulk), at(0.42, 0.068 * bulk), at(-0.02, 0.072 * bulk)]);
    const hd = [neck[0] + dir[0] * 0.07 + Math.sin(lean + (o.tilt || 0)) * 0.02 + st * 0.03, neck[1] + dir[1] * 0.06 - 0.02];
    cap(neck, [hd[0], hd[1] + 0.03], 0.028, 0.026);
    { const q = Pt(hd[0], hd[1]); ctx.save(); ctx.translate(q[0], q[1]); ctx.scale(f, 1); ctx.rotate(lean * 0.5 + (o.tilt || 0)); const r = HR * h;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.92, r * 1.12, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.8, -r * 0.25); ctx.lineTo(r * 1.12, r * 0.12); ctx.lineTo(r * 0.82, r * 0.38); ctx.quadraticCurveTo(r * 0.7, r * 0.95, r * 0.15, r * 1.08); ctx.lineTo(0, r * 0.5); ctx.closePath(); ctx.fill();
      if (o.beard) { ctx.beginPath(); ctx.moveTo(r * 0.85, r * 0.45); ctx.quadraticCurveTo(r * 0.75, r * (1.6 + o.beard), r * 0.1, r * (1.75 + o.beard * 1.4)); ctx.quadraticCurveTo(-r * 0.1, r * 0.9, -r * 0.2, r * 0.5); ctx.closePath(); ctx.fill(); }
      const hat = o.hat || 'bare';
      if (hat === 'hair' || hat === 'bare') { ctx.beginPath(); ctx.ellipse(-r * 0.18, -r * 0.18, r * 1.0, r * 1.02, -0.3, 0, TAU); ctx.fill(); if (o.long) { ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.2); ctx.quadraticCurveTo(-r * 1.3, r * 1.4, -r * 0.6, r * 2.4); ctx.lineTo(-r * 0.1, r * 1.2); ctx.closePath(); ctx.fill(); } }
      if (hat === 'hood') { const fl = run ? Math.sin(t0 * 9) * 0.15 : 0; ctx.beginPath(); ctx.moveTo(r * 1.05, r * 0.7); ctx.quadraticCurveTo(r * 1.6, -r * 1.3, -r * 0.1, -r * 1.45); ctx.quadraticCurveTo(-r * 1.7, -r * 1.3, -r * (1.85 + run * 0.6), r * (0.2 + fl)); ctx.quadraticCurveTo(-r * 2.2, r * 1.6, -r * 1.2, r * 2.3); ctx.lineTo(r * 1.0, r * 1.7); ctx.closePath(); ctx.fill(); }
      if (hat === 'kettle') { ctx.beginPath(); ctx.moveTo(-r * 1.85, -r * 0.18); ctx.quadraticCurveTo(0, -r * 0.55, r * 1.85, -r * 0.18); ctx.lineTo(r * 0.95, -r * 0.55); ctx.quadraticCurveTo(0, -r * 1.85, -r * 0.95, -r * 0.55); ctx.closePath(); ctx.fill(); }
      if (hat === 'helm') { ctx.beginPath(); ctx.moveTo(-r * 1.08, r * 0.2); ctx.quadraticCurveTo(-r * 1.15, -r * 1.3, r * 0.05, -r * 1.75); ctx.quadraticCurveTo(r * 1.15, -r * 1.3, r * 1.08, r * 0.2); ctx.closePath(); ctx.fill(); ctx.fillRect(r * 0.62, -r * 0.3, r * 0.3, r * 1.1); }
      if (hat === 'cap') { ctx.beginPath(); ctx.ellipse(-r * 0.1, -r * 0.5, r * 1.1, r * 0.75, -0.15, Math.PI, 0); ctx.fill(); }
      ctx.restore(); }
    const nearLeg = drawLeg(legs[0]);
    const kneeY = hip[1] + TH * 0.95, hemFront = Math.max(nearLeg.K2[0], farLeg.K2[0]) + 0.06, hemBack = Math.min(nearLeg.K2[0], farLeg.K2[0], 0) - 0.07;
    if (o.sit && o.dress) {
      const K2 = nearLeg.K2, A2 = nearLeg.A2, long = o.dress === 'robe' || o.dress === 'gown', hy2 = long ? A2[1] - 0.01 : K2[1] + 0.13;
      curve([at(0.55, 0.078 * bulk), [K2[0] + 0.035, K2[1] - 0.045], [K2[0] + 0.065, K2[1] + 0.02], [K2[0] + 0.07, hy2], [K2[0] - 0.07, hy2 + 0.01], [K2[0] - 0.05, K2[1] + 0.04], [hip[0] - 0.02, hip[1] + 0.05], [hip[0] - 0.095, hip[1] + 0.035], [hip[0] - 0.09, hip[1] - 0.06], at(0.55, -0.08 * bulk)]);
    } else if (o.dress === 'tunic' || o.dress === 'cloak' || o.dress === 'mail') {
      const hy = o.dress === 'mail' ? kneeY - 0.04 : kneeY + 0.01 + (o.dress === 'cloak' ? 0.06 : 0);
      curve([at(0.5, 0.075 * bulk), [hemFront + 0.01, hy - 0.04], [hemFront + 0.025, hy + 0.01], [(hemFront + hemBack) / 2, hy + 0.03], [hemBack - 0.025, hy + 0.01], [hemBack - 0.005, hy - 0.05], at(0.5, -0.075 * bulk)]);
    }
    if (!o.sit && (o.dress === 'robe' || o.dress === 'gown')) {
      const hy = -0.02, fr = Math.max(nearLeg.A2[0], farLeg.A2[0]) + 0.09, bk = Math.min(nearLeg.A2[0], farLeg.A2[0]) - 0.08 - (o.dress === 'robe' ? 0.04 : 0);
      curve([at(0.55, 0.076 * bulk), [fr - 0.02, kneeY], [fr + 0.025, hy - 0.01], [(fr + bk) / 2, hy + 0.015], [bk - 0.035, hy], [bk, kneeY], at(0.55, -0.08 * bulk)]);
    }
    if (o.belt !== false && o.dress !== 'robe' && o.dress !== 'gown' && o.dress !== 'cloak') { const w1 = at(0.42, 0.074 * bulk), w2 = at(0.42, -0.074 * bulk); cap(w1, w2, 0.012, 0.012); }
    const hand = AN.wr, out = { head: Pt(hd[0], hd[1]), hand: Pt(hand[0], hand[1]), handF: Pt(AF.wr[0], AF.wr[1]) };
    const pole = (top, bot, w) => cap(top, bot, w, w);
    if (bundle) {
      ctx.save(); if (o.fill2) ctx.fillStyle = o.fill2;
      const q = Pt(bundle.c[0], bundle.c[1]); ctx.beginPath(); ctx.ellipse(q[0], q[1], bundle.rx * h, bundle.ry * h, f * (lean * 0.5 - 0.35), 0, TAU); ctx.fill();
      const q2 = Pt(bundle.c[0] + 0.06, bundle.c[1] - 0.03); ctx.beginPath(); ctx.ellipse(q2[0], q2[1], 0.04 * h, 0.036 * h, 0, 0, TAU); ctx.fill();
      ctx.restore(); out.bundle = [q[0], q[1], bundle.rx * h];
    }
    if (o.hold === 'spear') { pole([hand[0], hand[1] - 0.8], [hand[0], hand[1] + 0.42], 0.008); poly([[hand[0], hand[1] - 0.94], [hand[0] + 0.022, hand[1] - 0.84], [hand[0], hand[1] - 0.78], [hand[0] - 0.022, hand[1] - 0.84]]); }
    if (o.hold === 'torch') { const top = [hand[0] + 0.03, hand[1] - 0.26]; pole(top, [hand[0] - 0.01, hand[1] + 0.08], 0.011); out.torch = Pt(top[0], top[1] - 0.01); }
    if (o.hold === 'sword' || o.hold === 'knife') {
      const a = o.bladeAng != null ? o.bladeAng : -0.5, L = o.hold === 'sword' ? 0.42 : 0.17, d = [Math.sin(a), -Math.cos(a)], tip = [hand[0] + d[0] * L, hand[1] + d[1] * L];
      cap([hand[0] - d[1] * 0.04, hand[1] + d[0] * 0.04], [hand[0] + d[1] * 0.04, hand[1] - d[0] * 0.04], 0.008, 0.008);
      poly([[hand[0] - d[1] * 0.012, hand[1] + d[0] * 0.012], [tip[0], tip[1]], [hand[0] + d[1] * 0.012, hand[1] - d[0] * 0.012]]);
      out.blade = [Pt(hand[0], hand[1]), Pt(tip[0], tip[1])];
    }
    drawArm(AN);
    ctx.restore();
    return out;
  }

  // ================================================================ the First-Born: a membrane wing, and a far glider
  // wingPts(o): the bones and membrane of a great wing in local units (shoulder at 0,0; it reaches toward +x, the
  // leading edge on top). o.spread 0..1, o.flap (radians, + raises it), o.curl (trailing edge billow)
  function wingPts(o = {}) {
    const sp = o.spread != null ? o.spread : 1, fl = o.flap || 0, rot = (a, l) => [Math.cos(a) * l, Math.sin(a) * l];
    const a1 = -0.35 - fl, E = rot(a1, 0.3), a2 = a1 + 0.5 - 0.35 * sp, Wr = [E[0] + rot(a2, 0.42)[0], E[1] + rot(a2, 0.42)[1]];
    const fing = [0.98, 0.9, 0.78, 0.62], fa = [0.12, 0.55, 0.98, 1.42];
    const tips = fing.map((L, k) => { const a = a2 + fa[k] * (0.45 + 0.55 * sp) - 0.1, mid = rot(a - 0.06, L * 0.55), tip = rot(a + 0.05, L); return { mid: [Wr[0] + mid[0], Wr[1] + mid[1]], tip: [Wr[0] + tip[0], Wr[1] + tip[1]] }; });
    const thumb = [Wr[0] + rot(a2 - 1.1, 0.09)[0], Wr[1] + rot(a2 - 1.1, 0.09)[1]];
    return { E, Wr, tips, thumb, body: [-0.12, 0.42] };
  }
  // wing(ctx, o): draw it filled with o.col; o.back: a backlight colour seen through the membrane (rgb), o.backA
  function wing(ctx, o = {}) {
    const p = wingPts(o), curl = o.curl != null ? o.curl : 0.12, col = o.col || '#050506';
    const memb = (c) => {
      c.beginPath(); c.moveTo(0, -0.03); c.quadraticCurveTo(p.E[0] * 0.5, p.E[1] - 0.06, p.E[0], p.E[1] - 0.02); c.lineTo(p.Wr[0], p.Wr[1] - 0.02);
      c.lineTo(p.tips[0].tip[0], p.tips[0].tip[1]);
      for (let k = 1; k < 4; k++) { const a = p.tips[k - 1].tip, b = p.tips[k].tip, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = p.Wr[0] - mx, dy = p.Wr[1] - my; c.quadraticCurveTo(mx + dx * (curl + 0.1), my + dy * (curl + 0.1), b[0], b[1]); }
      const a = p.tips[3].tip, b = p.body, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; c.quadraticCurveTo(mx + (p.Wr[0] - mx) * 0.25, my + (p.Wr[1] - my) * 0.25, b[0], b[1]);
      c.lineTo(-0.18, 0.1); c.closePath();
    };
    ctx.save(); ctx.translate(o.x || 0, o.y || 0); ctx.rotate(o.rot || 0); ctx.scale((o.mirror ? -1 : 1) * (o.s || 1), (o.s || 1) * (o.squash || 1));
    ctx.fillStyle = col; ctx.globalAlpha = o.membA != null ? o.membA : 1; memb(ctx); ctx.fill(); ctx.globalAlpha = 1;
    if (o.back) {   // light through the membrane: warm where it is thin, veins dark
      ctx.save(); memb(ctx); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(o.backX || 0.5, o.backY || 0.2, 0, o.backX || 0.5, o.backY || 0.2, o.backR || 0.6);
      g.addColorStop(0, rgbs(o.back, o.backA || 0.5)); g.addColorStop(0.5, rgbs(o.back, (o.backA || 0.5) * 0.35)); g.addColorStop(1, rgbs(o.back, 0)); ctx.fillStyle = g; ctx.fillRect(-1, -1, 3, 3);
      ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = col; ctx.lineCap = 'round';
      const vr = rng(o.seed || 5);
      for (let k = 0; k < 4; k++) { const tp = p.tips[k]; for (let v = 0; v < 3; v++) { const s0 = 0.25 + vr() * 0.5, a = [lerp(p.Wr[0], tp.tip[0], s0), lerp(p.Wr[1], tp.tip[1], s0)], nb = p.tips[Math.min(3, k + 1)].tip; ctx.lineWidth = 0.004 + vr() * 0.004; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(lerp(a[0], nb[0], 0.3), lerp(a[1], nb[1], 0.5), lerp(a[0], nb[0], 0.55 + vr() * 0.3), lerp(a[1], nb[1], 0.6 + vr() * 0.3)); ctx.stroke(); } }
      ctx.restore();
    }
    ctx.fillStyle = col;
    taper(ctx, [[0, 0], p.E, p.Wr], 0.075, 0.04);
    taper(ctx, [p.Wr, p.thumb], 0.035, 0.004);
    for (const tp of p.tips) taper(ctx, [p.Wr, tp.mid, tp.tip], 0.03, 0.006);
    if (o.rim) { ctx.strokeStyle = o.rim; ctx.lineWidth = o.rimW || 0.006; ctx.beginPath(); ctx.moveTo(0, -0.035); ctx.quadraticCurveTo(p.E[0] * 0.5, p.E[1] - 0.065, p.E[0], p.E[1] - 0.025); ctx.lineTo(p.Wr[0], p.Wr[1] - 0.025); ctx.lineTo(p.tips[0].tip[0], p.tips[0].tip[1]); ctx.stroke(); }
    ctx.restore();
  }
  // glider(ctx, x, y, s, ang, flap, col): a First-Born seen far off, soaring: body, neck, tail, two wings (s ~ wingspan/2)
  function glider(ctx, x, y, s, ang, flap, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = col;
    const sq = 0.55 + 0.45 * Math.cos(flap);
    for (const m of [1, -1]) { ctx.save(); ctx.scale(1, m); wing(ctx, { s, col, spread: 0.9, flap: -0.2 + Math.sin(flap) * 0.5, squash: sq, rot: -1.45, x: 0, y: 0, curl: 0.18 }); ctx.restore(); }
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.22, s * 0.07, 0, 0, TAU); ctx.fill();
    taper(ctx, [[s * 0.15, 0], [s * 0.42, -s * 0.03 * Math.sin(flap)], [s * 0.6, 0]], s * 0.07, s * 0.035);
    ctx.beginPath(); ctx.moveTo(s * 0.58, -s * 0.04); ctx.lineTo(s * 0.74, 0); ctx.lineTo(s * 0.58, s * 0.04); ctx.closePath(); ctx.fill();
    taper(ctx, [[-s * 0.15, 0], [-s * 0.5, s * 0.04 * Math.sin(flap + 1)], [-s * 0.95, -s * 0.02]], s * 0.06, s * 0.008);
    ctx.restore();
  }

  // ================================================================ writing: asemic script (no words), and its strokes
  // a line of a scribe's hand that reads as writing at a glance but spells nothing. Returns words [{x0, x1, pts}] in
  // local units (baseline at y = 0, x-height = size). Draw with drawScript(), which can draw it on (p) and strike words.
  function scriptLine(seed, width, size, o = {}) {
    return K.cached(`s12:script:${seed}:${width}:${size}:${o.slant || 0}`, () => {
      const r = rng(seed), words = []; let x = 0;
      while (x < width) {
        const nl = 2 + Math.floor(r() * 6), pts = [], x0 = x; let px = x, py = 0;
        pts.push([px, py - size * 0.2]);
        for (let i = 0; i < nl; i++) {
          const kind = r(), w = size * (0.55 + r() * 0.4);
          if (kind < 0.18) {          // a tall loop (l, b, h)
            pts.push([px + w * 0.2, py - size * 0.6], [px + w * 0.45, py - size * 1.9], [px + w * 0.25, py - size * 2.05], [px + w * 0.15, py - size * 1.6], [px + w * 0.35, py], [px + w * 0.75, py - size * 0.5]);
          } else if (kind < 0.3) {    // a descender (g, p, y)
            pts.push([px + w * 0.3, py - size * 0.9], [px + w * 0.55, py - size * 0.4], [px + w * 0.5, py + size * 0.9], [px + w * 0.2, py + size * 1.05], [px + w * 0.45, py + size * 0.2], [px + w * 0.85, py - size * 0.5]);
          } else if (kind < 0.55) {   // an arch (n, m, h)
            pts.push([px + w * 0.15, py - size * 0.95], [px + w * 0.35, py], [px + w * 0.5, py - size * 0.95], [px + w * 0.8, py - size * 0.8], [px + w * 0.85, py]);
          } else if (kind < 0.78) {   // a round letter (o, a, e)
            pts.push([px + w * 0.6, py - size * 0.95], [px + w * 0.15, py - size * 0.8], [px + w * 0.1, py - size * 0.15], [px + w * 0.55, py - size * 0.05], [px + w * 0.7, py - size * 0.85], [px + w * 0.8, py - size * 0.2], [px + w, py - size * 0.4]);
          } else {                    // a short stroke (i, u, r)
            pts.push([px + w * 0.2, py - size * 0.9], [px + w * 0.3, py - size * 0.1], [px + w * 0.55, py - size * 0.2], [px + w * 0.6, py - size * 0.95], [px + w * 0.7, py - size * 0.1], [px + w * 0.9, py - size * 0.4]);
          }
          px += w;
        }
        const sl = o.slant != null ? o.slant : 0.22, sm = K.bez ? null : null; void sm;
        // smooth the polyline (Chaikin) and slant it
        let q = pts.map(p => [p[0] - p[1] * sl, p[1]]);
        for (let it = 0; it < 2; it++) { const n2 = [q[0]]; for (let i = 0; i < q.length - 1; i++) { const a = q[i], b = q[i + 1]; n2.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } n2.push(q[q.length - 1]); q = n2; }
        words.push({ x0, x1: px, pts: q });
        x = px + size * (0.9 + r() * 0.8);
      }
      return words.filter(w => w.x1 <= width + size * 2);
    });
  }
  // drawScript(ctx, words, x, y, o): o.p (0..1 drawn on, across the whole line), o.w nib width, o.col, o.angle
  function drawScript(ctx, words, x, y, o = {}) {
    const p = o.p != null ? o.p : 1, tot = words.length ? words[words.length - 1].x1 : 1;
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = o.col || P.ink;
    for (const wd of words) {
      const wp = clamp((p * tot - wd.x0) / Math.max(1, wd.x1 - wd.x0));
      if (wp <= 0) break;
      K.nib(ctx, wd.pts, { w: o.w || 2.6, angle: o.angle != null ? o.angle : -0.7, min: 0.25, taper: 0.05, p: wp, jit: 0.25, seed: (wd.x0 | 0) + 3 });
    }
    ctx.restore();
  }
  // the tip of the pen while drawing a line on (in the line's local units)
  function scriptTip(words, p) {
    const tot = words.length ? words[words.length - 1].x1 : 1, X = p * tot;
    for (const wd of words) {
      if (X <= wd.x1) {
        if (X < wd.x0) return [X, 0];
        const wp = (X - wd.x0) / Math.max(1, wd.x1 - wd.x0), i = Math.min(wd.pts.length - 1, Math.floor(wp * (wd.pts.length - 1)));
        return wd.pts[i];
      }
    }
    return [tot, 0];
  }

  // ================================================================ the edit: shots, cuts and dissolves
  // shots: [{ id, a, b, draw(x, t, sh), tin: { kind: 'cut' | 'dissolve', d } }]; a shot draws from a until the next has
  // dissolved in. While two shots mix, each skips its bloom and paper; the mix gets them once.
  function runEdit(ctx, t, shots, key) {
    let i = shots.findIndex(s => t >= s.a && t < s.b); if (i < 0) i = t < shots[0].a ? 0 : shots.length - 1;
    const sh = shots[i], tin = sh.tin || { kind: 'cut' }, prev = shots[i - 1];
    const drawShot = (x, s) => { cleanState(x); x.save(); try { s.draw(x, t, s); } finally { x.restore(); } cleanState(x); };
    if (prev && tin.kind === 'dissolve' && t < sh.a + tin.d) {
      const u = (t - sh.a) / tin.d;
      MIXING = true;
      drawShot(ctx, prev);
      const B = scratch(key + ':B'), bx = B.getContext('2d'); drawShot(bx, sh);
      MIXING = false;
      ctx.globalAlpha = smooth(u); ctx.drawImage(B, 0, 0); ctx.globalAlpha = 1;
      bloom(ctx, 0.25); K.paperTooth(ctx, 0.07);
      return sh;
    }
    drawShot(ctx, sh);
    return sh;
  }
  // a line's point at share f of its length (f may run past 0..1)
  const at = (id, f) => { const c = K.cue(id); return lerp(c.start, c.end, f); };


  // ================================================================ the curse: red veins (scene 1 starts it; later scenes bring it back)
  // veinTree(seed, o): roots that branch outward from (0, 0) in a plane, like cracks filling with blood. o.roots, o.len
  //   (reach), o.step, o.width, o.spread (branch angle), o.dir + o.arc (keep the roots in a fan), o.branch (chance per step),
  //   o.decay (width kept per step), o.max (branches). Returns branches [{ pts: [[x, y, d, w]] }] with .len; d is the
  //   distance from the source, so a front at d = prog * len grows them out.
  function veinTree(seed, o = {}) {
    return K.cached(`s12:veins:${seed}:${JSON.stringify(o)}`, () => {
      const r = rng(seed), out = [], len = o.len || 1000, step = o.step || 14, nR = o.roots || 7, dec = o.decay || 0.988, mx = o.max || 380;
      const grow = (x, y, a, d, w, gen) => {
        const pts = [[x, y, d, w]], maxD = len * (gen ? 0.5 + r() * 0.5 : 0.8 + r() * 0.2), id = out.length + 1;
        let cur = a, X = x, Y = y, D = d, Wd = w;
        out.push({ pts, gen });
        while (D < maxD && Wd > 0.45) {
          cur += (K.noise(D * 0.01, id * 3.7, seed) - 0.5) * 0.7 + (r() - 0.5) * 0.4;
          if (o.dir != null && o.arc != null) { let da = Math.atan2(Math.sin(cur - o.dir), Math.cos(cur - o.dir)); if (Math.abs(da) > o.arc) cur -= da * 0.3; }
          const st = step * (0.7 + r() * 0.6); X += Math.cos(cur) * st; Y += Math.sin(cur) * st; D += st; Wd *= dec;
          pts.push([X, Y, D, Wd]);
          if (gen < 6 && r() < (o.branch || 0.08) * (gen ? 0.8 : 1) && out.length < mx) { const sd = r() < 0.5 ? -1 : 1; grow(X, Y, cur + sd * (o.spread || 0.75) * (0.5 + r() * 0.7), D, Wd * (0.5 + r() * 0.2), gen + 1); }
        }
      };
      for (let k = 0; k < nR; k++) { const a = o.dir != null ? o.dir + (nR > 1 ? (k / (nR - 1) - 0.5) * 2 * (o.arc || 0.5) : 0) : (k + r() * 0.6) / nR * TAU; grow(0, 0, a, 0, (o.width || 7) * (0.7 + r() * 0.5), 0); }
      out.len = len; return out;
    });
  }
  // drawVeins(ctx, tree, prog, o): the veins grown out to prog (0..1 of their reach). o.map(x, y) -> [sx, sy, s] places a
  //   point on screen (default as is); o.t the time (a slow heartbeat runs outward along them); o.fade (0..1 dims them back
  //   into the stone); o.scale (widths); o.alpha; o.hot (0..1, the burning thread at their heart); o.tips (glowing fronts)
  function drawVeins(ctx, tree, prog, o = {}) {
    const front = prog * tree.len, map = o.map || ((x, y) => [x, y, 1]), sw = o.scale || 1, fade = clamp(o.fade || 0), t = o.t || 0, al = (o.alpha != null ? o.alpha : 1) * (1 - fade * 0.85);
    if (front <= 0 || al <= 0) return;
    const beat = d => { const ph = fract(t * 0.85 - d / 900); return Math.pow(Math.max(0, 1 - ph * 3.2), 2); };
    const vis = [];
    for (const b of tree) {
      if (b.pts[0][2] >= front) continue;
      const pts = [];
      for (let i = 0; i < b.pts.length; i++) {
        const p = b.pts[i]; let q = p, end = false;
        if (p[2] > front) { const a = b.pts[i - 1], u = (front - a[2]) / ((p[2] - a[2]) || 1); q = [lerp(a[0], p[0], u), lerp(a[1], p[1], u), front, lerp(a[3], p[3], u)]; end = true; }
        const s = map(q[0], q[1]); if (!s) { if (pts.length) break; else continue; }
        const near = clamp((front - q[2]) / 120);           // the growing tip thins to a point
        pts.push([s[0], s[1], q[3] * sw * s[2] * (0.25 + 0.75 * near), q[2]]);
        if (end) break;
      }
      if (pts.length > 1) vis.push(pts);
    }
    const strip = (pts, wk, add) => {
      const Lp = [], Rp = [];
      for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = Math.max(0.35, pts[i][2] * wk + add) / 2; Lp.push([pts[i][0] - dy / l * w, pts[i][1] + dx / l * w]); Rp.push([pts[i][0] + dy / l * w, pts[i][1] - dx / l * w]); }
      ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]); for (const q of Lp) ctx.lineTo(q[0], q[1]); for (let i = Rp.length - 1; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]); ctx.closePath(); ctx.fill();
    };
    ctx.save();
    // a dark bleed into the stone around each vein
    ctx.globalAlpha = 0.55 * al; ctx.fillStyle = 'rgb(26,3,3)'; for (const v of vis) strip(v, 2.8, 1.5);
    // the vein: deep, dried red
    ctx.globalAlpha = al; ctx.fillStyle = fade > 0 ? rgbs(mix([128, 16, 12], [44, 8, 8], fade)) : 'rgb(128,16,12)'; for (const v of vis) strip(v, 1, 0.3);
    // the live thread at its heart: hot at the front, and wherever the heartbeat passes
    const hot = (o.hot != null ? o.hot : 1) * (1 - fade);
    if (hot > 0) {
      ctx.globalCompositeOperation = 'lighter';
      for (const v of vis) {
        for (let i = 0; i < v.length - 1; i += 4) {
          const seg = v.slice(i, Math.min(v.length, i + 6)), d = seg[0][3], e = Math.exp(-(front - d) / 160) + beat(d) * 0.7;
          const a = clamp(0.12 + e) * hot * al; if (a < 0.03) continue;
          ctx.fillStyle = `rgba(255,${70 + 90 * clamp(e - 0.5) | 0},40,${a})`; strip(seg, 0.38, 0);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    if (o.tips !== false && hot > 0) for (const v of vis) { const p = v[v.length - 1]; if (front - p[3] < 2 && p[2] > 0.6) glow(ctx, [255, 80, 40], p[0], p[1], 10 + p[2] * 5, 0.35 * hot * al); }
  }

  // ================================================================ 3D: a small projector for the council chamber
  const v3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  };
  // cam3(pos, target, f, roll): a pinhole camera (y up)
  function cam3(pos, tgt, f, roll = 0) {
    const fw = v3.norm(v3.sub(tgt, pos)); let rt = v3.norm(v3.cross([0, 1, 0], fw)), up = v3.cross(fw, rt);
    if (roll) { const c = Math.cos(roll), s = Math.sin(roll), r2 = v3.add(v3.mul(rt, c), v3.mul(up, s)), u2 = v3.add(v3.mul(up, c), v3.mul(rt, -s)); rt = r2; up = u2; }
    return { pos, fw, rt, up, f };
  }
  const toCam = (C, p) => { const d = v3.sub(p, C.pos); return [v3.dot(d, C.rt), v3.dot(d, C.up), v3.dot(d, C.fw)]; };
  const scr = (C, q) => [W / 2 + C.f * q[0] / q[2], H / 2 - C.f * q[1] / q[2], C.f / q[2]];
  const p3 = (C, p) => { const q = toCam(C, p); return q[2] > 4 ? scr(C, q) : null; };
  function clipNear(qs, near) {
    const out = [];
    for (let i = 0; i < qs.length; i++) {
      const a = qs[i], b = qs[(i + 1) % qs.length], ia = a[2] >= near, ib = b[2] >= near;
      if (ia) out.push(a);
      if (ia !== ib) { const u = (near - a[2]) / (b[2] - a[2]); out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u), near]); }
    }
    return out;
  }
  function path3(x, C, pts, near = 6) {
    const qs = clipNear(pts.map(p => toCam(C, p)), near); if (qs.length < 3) return false;
    x.beginPath(); for (let i = 0; i < qs.length; i++) { const s = scr(C, qs[i]); i ? x.lineTo(s[0], s[1]) : x.moveTo(s[0], s[1]); } x.closePath(); return true;
  }
  // an object's frame: at (ox, oz), its front facing the angle a (F = (sin a, 0, cos a))
  const frame3 = (ox, oz, a, oy = 0) => { const F = [Math.sin(a), 0, Math.cos(a)], R = [Math.cos(a), 0, -Math.sin(a)]; return (u, v, w) => [ox + R[0] * u + F[0] * w, oy + v, oz + R[2] * u + F[2] * w]; };
  // extrude(face2d, depth, fr, mat): a prism from a polygon in the object's (u, v) plane, depth along its front axis
  function extrude(poly, d, fr, mat, out) {
    const front = poly.map(([u, v]) => fr(u, v, d / 2)), back = poly.map(([u, v]) => fr(u, v, -d / 2)).reverse();
    out.push({ pts: front, mat, front: true }); out.push({ pts: back, mat });
    for (let i = 0; i < poly.length; i++) { const j = (i + 1) % poly.length; out.push({ pts: [fr(poly[j][0], poly[j][1], d / 2), fr(poly[i][0], poly[i][1], d / 2), fr(poly[i][0], poly[i][1], -d / 2), fr(poly[j][0], poly[j][1], -d / 2)], mat }); }
  }
  const boxPoly = (hu, v0, v1) => [[-hu, v0], [hu, v0], [hu, v1], [-hu, v1]];
  function faceNormal(pts) { const a = v3.sub(pts[1], pts[0]), b = v3.sub(pts[2], pts[0]); return v3.norm(v3.cross(b, a)); }
  // drawFaces(x, C, faces, shade): cull, sort far to near, fill. shade(face, n, centre) -> css colour (or a function(x) to fill)
  function drawFaces(x, C, faces, shade) {
    const vis = [];
    for (const f of faces) {
      if (!f.n) { f.n = faceNormal(f.pts); f.c = f.pts.reduce((s, p) => v3.add(s, v3.mul(p, 1 / f.pts.length)), [0, 0, 0]); }
      if (!f.two && v3.dot(f.n, v3.sub(C.pos, f.c)) <= 0) continue;
      const q = toCam(C, f.c); if (q[2] < -200) continue;
      vis.push([q[2], f]);
    }
    vis.sort((a, b) => b[0] - a[0]);
    for (const [, f] of vis) { if (!path3(x, C, f.pts)) continue; const s = shade(f, f.n, f.c); if (typeof s === 'function') s(x, f); else { x.fillStyle = s; x.fill(); } }
  }

  // ================================================================ a hand writing with a quill
  // quillHand(x, tx, ty, o): the nib at (tx, ty); o.ang the quill's lean from upright (+ leans right), o.scale, o.skin,
  //   o.sleeve, o.trim (cuff), o.lit (0..1 light from the upper left), o.old (an old hand: knuckles, thinner)
  function quillHand(x, tx, ty, o = {}) {
    const s = o.scale || 1, a = o.ang != null ? o.ang : 0.5, skin = o.skin || [196, 150, 112], lit = o.lit != null ? o.lit : 1;
    const sh = mix(skin, [40, 24, 16], 0.62), sk = mix(sh, skin, lit);
    x.save(); x.translate(tx, ty); x.rotate(a); x.scale(s, s); x.lineCap = 'round'; x.lineJoin = 'round';
    // the feather (behind the hand)
    x.fillStyle = 'rgba(214,206,190,0.95)';
    x.beginPath(); x.moveTo(0, -120); x.bezierCurveTo(-34, -190, -30, -300, -6, -380); x.lineTo(0, -378); x.lineTo(2, -120); x.closePath(); x.fill();
    x.fillStyle = 'rgba(180,170,152,0.95)'; x.beginPath(); x.moveTo(1, -130); x.bezierCurveTo(22, -200, 20, -300, 2, -378); x.lineTo(0, -130); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(90,80,66,0.5)'; x.lineWidth = 0.8; for (let k = 0; k < 18; k++) { const y0 = -140 - k * 13; x.beginPath(); x.moveTo(0, y0); x.lineTo(-22 + Math.abs(k - 9) * 1.4, y0 - 16); x.stroke(); x.beginPath(); x.moveTo(0, y0); x.lineTo(15 - Math.abs(k - 9) * 0.9, y0 - 12); x.stroke(); }
    x.strokeStyle = '#e8e0cc'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -4); x.lineTo(0, -380); x.stroke();
    x.fillStyle = '#2a1c10'; x.beginPath(); x.moveTo(-2.5, -14); x.lineTo(0, 0); x.lineTo(2.5, -14); x.closePath(); x.fill();
    // the sleeve, off to the lower right
    const sleeve = o.sleeve || [60, 22, 18];
    const g = x.createLinearGradient(80, -60, 260, 160); g.addColorStop(0, rgbs(mix(sleeve, [0, 0, 0], 0.1 + 0.4 * (1 - lit)))); g.addColorStop(1, rgbs(mix(sleeve, [0, 0, 0], 0.7)));
    x.fillStyle = g; x.beginPath(); x.moveTo(118, -70); x.bezierCurveTo(190, -80, 300, 40, 340, 180); x.lineTo(150, 260); x.bezierCurveTo(120, 140, 84, 40, 80, -10); x.closePath(); x.fill();
    if (o.trim) { x.strokeStyle = rgbs(o.trim); x.lineWidth = 9; x.beginPath(); x.moveTo(116, -66); x.bezierCurveTo(100, -30, 86, 0, 82, 10); x.stroke(); }
    // the hand: the back of it, the wrist, fingers round the shaft, the thumb
    const hg = x.createLinearGradient(-20, -110, 120, 40); hg.addColorStop(0, rgbs(sk)); hg.addColorStop(0.6, rgbs(mix(sk, sh, 0.45))); hg.addColorStop(1, rgbs(sh));
    x.fillStyle = hg;
    x.beginPath(); x.moveTo(6, -86); x.bezierCurveTo(40, -112, 96, -100, 122, -64); x.bezierCurveTo(132, -40, 116, -4, 92, 8); x.bezierCurveTo(60, 18, 26, 6, 14, -14); x.closePath(); x.fill();
    const fing = (pts, w) => { x.fillStyle = hg; taper(x, pts, w, w * 0.8); };
    fing([[16, -14], [6, -26], [2, -34]], o.old ? 11 : 14);                          // index, along the shaft to the nib end
    fing([[34, -4], [18, -6], [8, -10]], o.old ? 11 : 13);                           // middle, under it
    fing([[50, 4], [34, 6], [24, 2]], o.old ? 10 : 12);
    fing([[60, -84], [30, -70], [8, -50]], o.old ? 12 : 15);                          // thumb
    if (o.old) { x.strokeStyle = rgbs(sh, 0.6); x.lineWidth = 1.4; for (const [kx, ky] of [[64, -60], [80, -44], [92, -26]]) { x.beginPath(); x.arc(kx, ky, 7, -0.6, 1.6); x.stroke(); } }
    x.strokeStyle = rgbs(mix(sh, [0, 0, 0], 0.4), 0.5); x.lineWidth = 1.2; x.beginPath(); x.moveTo(14, -14); x.bezierCurveTo(26, 6, 60, 18, 92, 8); x.stroke();
    x.restore();
  }

  // ================================================================ the capital (seen through Oswyn's window)
  function moonDisc(x, cx, cy, r, a = 1) {
    x.save(); x.globalAlpha = a;
    const g = x.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.1, cx, cy, r); g.addColorStop(0, '#f4f2ea'); g.addColorStop(0.7, '#dcdcd4'); g.addColorStop(1, '#b8bcc0');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
    x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(150,150,150,0.35)';
    for (const [dx, dy, rr] of [[-0.3, -0.1, 0.28], [0.2, 0.25, 0.22], [0.35, -0.3, 0.14], [-0.1, 0.4, 0.12]]) { x.beginPath(); x.arc(cx + dx * r, cy + dy * r, rr * r, 0, TAU); x.fill(); }
    x.restore(); glow(x, [200, 214, 240], cx, cy, r * 5, 0.32 * a);
  }
  function volcanoImg() {
    return K.cached('s1:volcano', () => {
      const w = 1700, h = 900, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(1120), cx = 850, top = 120;
      const prof = X => { const s = Math.abs((X - cx) / 760); let y = top + Math.pow(s, 0.8) * (h - top) * 0.95; if (s < 0.06) y += 18 * (1 - s / 0.06); y += (K.fbm(X * 0.01, 1, 4, 1121) - 0.5) * 60 * s + (K.fbm(X * 0.04, 2, 3, 1122) - 0.5) * 14; return y; };
      x.beginPath(); x.moveTo(0, h); for (let X = 0; X <= w; X += 4) x.lineTo(X, prof(X)); x.lineTo(w, h); x.closePath();
      const g = x.createLinearGradient(0, top, 0, h); g.addColorStop(0, '#1d1418'); g.addColorStop(0.4, '#14131b'); g.addColorStop(1, '#0e1119'); x.fillStyle = g; x.fill();
      x.save(); x.clip();
      for (let k = 0; k < 46; k++) {
        const X0 = cx + (r() - 0.5) * 160, side = X0 < cx ? -1 : 1, L = 200 + r() * 600, pts = []; let X = X0, Y = prof(X0) + 6;
        for (let i = 0; i <= 14; i++) { pts.push([X, Y]); X += side * (L / 14) * (0.55 + r() * 0.2); Y += (L / 14) * 0.95; }
        x.fillStyle = side < 0 ? `rgba(90,104,136,${0.05 + r() * 0.1})` : `rgba(0,0,0,${0.15 + r() * 0.2})`; taper(x, pts, 4 + r() * 10, 1);
      }
      for (let k = 0; k < 9; k++) {
        const X0 = cx + (r() - 0.5) * 120, side = r() < 0.5 ? -1 : 1, L = 80 + r() * 260, pts = []; let X = X0, Y = prof(X0) + 4;
        for (let i = 0; i <= 12; i++) { pts.push([X, Y]); X += side * (L / 12) * (0.3 + r() * 0.5) + (r() - 0.5) * 8; Y += (L / 12); }
        x.fillStyle = `rgba(255,${90 + r() * 60 | 0},30,${0.35 + r() * 0.4})`; taper(x, pts, 3 + r() * 3, 0.5);
        x.fillStyle = 'rgba(255,90,30,0.08)'; taper(x, pts, 16, 4);
      }
      const cg = x.createRadialGradient(cx, top + 30, 10, cx, top + 30, 300); cg.addColorStop(0, 'rgba(255,110,40,0.55)'); cg.addColorStop(0.3, 'rgba(180,50,20,0.25)'); cg.addColorStop(1, 'rgba(80,20,10,0)'); x.fillStyle = cg; x.fillRect(0, 0, w, h);
      x.restore();
      return { c, cx, top };
    });
  }
  // the capital: rows of houses climbing a hill, towers and walls, window lights, a moonlit edge (a cached canvas)
  function cityLayer(key, o) {
    return K.cached('s1:city:' + key, () => {
      const w = o.w, h = o.h, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(o.seed);
      const ground = o.ground, body = o.body, rim = o.rim, win = o.win, lights = [];
      const house = (X, Y, bw, bh, roof, colk) => {
        x.fillStyle = rgbs(mix(body[0], body[1], colk)); x.fillRect(X, Y - bh, bw, bh + 60);
        x.beginPath();
        if (roof === 0) { x.moveTo(X - 3, Y - bh); x.lineTo(X + bw / 2, Y - bh - bw * 0.55); x.lineTo(X + bw + 3, Y - bh); }
        else if (roof === 1) { x.moveTo(X - 2, Y - bh); x.lineTo(X + bw * 0.5, Y - bh - bw * 1.1); x.lineTo(X + bw + 2, Y - bh); }
        else x.rect(X - 2, Y - bh - 6, bw + 4, 6);
        x.closePath(); x.fill();
        x.fillStyle = rgbs(rim, 0.5); x.fillRect(X, Y - bh, Math.max(1.2, bw * 0.06), bh);
        if (roof < 2) { x.strokeStyle = rgbs(rim, 0.7); x.lineWidth = 1.4; x.beginPath(); x.moveTo(X - 2, Y - bh); x.lineTo(X + bw / 2, Y - bh - bw * (roof ? 1.1 : 0.55)); x.stroke(); }
        const nw = Math.floor(bw / 16), nr = Math.floor(bh / 26);
        for (let a = 0; a < nr; a++) for (let b = 0; b < nw; b++) if (r() < o.winP) { const wx = X + 6 + b * 16 + r() * 3, wy = Y - bh + 10 + a * 26; x.fillStyle = rgbs(mix(win, [255, 230, 170], r() * 0.5), 0.6 + r() * 0.4); x.fillRect(wx, wy, 4 + r() * 2, 6 + r() * 3); if (r() < 0.25) lights.push([wx + 2, wy + 4, r()]); }
      };
      const tower = (X, Y, tw, th, kind, colk) => {
        x.fillStyle = rgbs(mix(body[0], body[1], colk)); x.fillRect(X - tw / 2, Y - th, tw, th + 60);
        if (kind === 'spire') { x.beginPath(); x.moveTo(X - tw / 2 - 4, Y - th); x.lineTo(X, Y - th - tw * 2.2); x.lineTo(X + tw / 2 + 4, Y - th); x.closePath(); x.fill(); x.strokeStyle = rgbs(rim, 0.8); x.lineWidth = 1.6; x.beginPath(); x.moveTo(X - tw / 2 - 4, Y - th); x.lineTo(X, Y - th - tw * 2.2); x.stroke(); }
        else { const n = Math.max(3, Math.floor(tw / 10)); for (let k = 0; k < n; k++) if (k % 2 === 0) x.fillRect(X - tw / 2 - 3 + k * (tw + 6) / n, Y - th - 10, (tw + 6) / n, 10); x.fillRect(X - tw / 2 - 3, Y - th - 2, tw + 6, 4); }
        x.fillStyle = rgbs(rim, 0.6); x.fillRect(X - tw / 2, Y - th, Math.max(1.5, tw * 0.07), th);
        for (let k = 0; k < th / 60; k++) if (r() < 0.5) { const wy = Y - th + 30 + k * 60; x.fillStyle = rgbs(win, 0.85); x.fillRect(X - 3 + (r() - 0.5) * tw * 0.4, wy, 5, 10); lights.push([X, wy + 5, r()]); }
      };
      for (let row = 0; row < o.rows; row++) {
        const k = row / Math.max(1, o.rows - 1);
        for (let X = -40; X < w + 40;) {
          const bw = (o.bw[0] + r() * o.bw[1]) * (1 + k * 0.3), Y = ground(X + bw / 2) + row * o.rowStep + r() * 12, bh = (o.bh[0] + r() * o.bh[1]) * (1 + k * 0.2);
          if (Y < h + 30) house(X, Y, bw, bh, r() < 0.55 ? 0 : r() < 0.6 ? 1 : 2, clamp(k * 0.8 + r() * 0.3));
          X += bw * (0.7 + r() * 0.35);
        }
      }
      if (o.extra) o.extra(x, r, tower, house, lights);
      if (o.mist) { const g = x.createLinearGradient(0, h - o.mist[0], 0, h); g.addColorStop(0, rgbs(o.mist[1], 0)); g.addColorStop(1, rgbs(o.mist[1], o.mist[2])); x.globalCompositeOperation = 'source-atop'; x.fillStyle = g; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over'; }
      c.lights = lights; return c;
    });
  }
  const CITY = {
    far: () => cityLayer('far', { w: 2400, h: 700, seed: 1131, rows: 5, rowStep: 30, bw: [26, 30], bh: [24, 40], winP: 0.08, ground: X => 230 + 120 * Math.pow(Math.abs((X - 1350) / 900), 1.6) + 30 * Math.sin(X * 0.004), body: [[24, 27, 40], [30, 33, 46]], rim: [96, 110, 140], win: [240, 160, 90], mist: [300, [44, 48, 66], 0.9] }),
    mid: () => cityLayer('mid', { w: 2600, h: 900, seed: 1132, rows: 6, rowStep: 46, bw: [38, 46], bh: [40, 60], winP: 0.12, ground: X => 330 + 200 * Math.pow(Math.abs((X - 1250) / 1000), 1.5) + 40 * Math.sin(X * 0.003 + 1),
      body: [[14, 16, 26], [20, 22, 33]], rim: [110, 126, 160], win: [255, 170, 90], mist: [380, [36, 40, 56], 0.85],
      extra: (x, r, tower, house, lights) => {
        const wallY = X => 300 + 130 * Math.pow(Math.abs((X - 1250) / 800), 1.6);
        x.fillStyle = '#10121c'; x.beginPath(); x.moveTo(380, wallY(380)); for (let X = 380; X <= 2120; X += 10) x.lineTo(X, wallY(X) - 70); x.lineTo(2120, 900); x.lineTo(380, 900); x.closePath(); x.fill();
        for (let X = 380; X <= 2120; X += 22) x.fillRect(X, wallY(X) - 84, 12, 16);
        x.strokeStyle = 'rgba(120,136,170,0.5)'; x.lineWidth = 2; x.beginPath(); for (let X = 380; X <= 2120; X += 10) X === 380 ? x.moveTo(X, wallY(X) - 70) : x.lineTo(X, wallY(X) - 70); x.stroke();
        for (const [X, tw, th, kd] of [[520, 60, 120, 'cren'], [820, 54, 170, 'spire'], [1020, 70, 230, 'cren'], [1450, 66, 210, 'spire'], [1700, 58, 150, 'cren'], [1960, 60, 120, 'spire']]) tower(X, wallY(X) - 60, tw, th, kd, 0.2);
        x.fillStyle = '#0e1019'; x.fillRect(1100, 20, 300, 320); for (let k = 0; k < 14; k++) if (k % 2 === 0) x.fillRect(1094 + k * 22, 6, 22, 16);
        x.fillStyle = 'rgba(120,136,170,0.55)'; x.fillRect(1100, 20, 4, 320);
        x.fillStyle = 'rgba(255,190,110,0.9)'; for (const [wx, wy] of [[1140, 80], [1180, 150], [1330, 110], [1360, 200]]) x.fillRect(wx, wy, 8, 14);
      } }),
    near: () => cityLayer('near', { w: 2800, h: 600, seed: 1133, rows: 3, rowStep: 70, bw: [70, 90], bh: [70, 110], winP: 0.1, ground: X => 160 + 60 * Math.sin(X * 0.0025) + 40 * Math.sin(X * 0.007), body: [[7, 8, 13], [9, 10, 15]], rim: [80, 92, 120], win: [255, 160, 80] }),
  };
  // the rookery tower, small and far (the north of the city)
  function rookerySmall(x, X, Y, s) {
    x.fillStyle = '#0d0f18'; x.fillRect(X - 24 * s, Y - 520 * s, 48 * s, 520 * s); x.fillRect(X - 34 * s, Y - 600 * s, 68 * s, 80 * s);
    x.beginPath(); x.moveTo(X - 40 * s, Y - 600 * s); x.lineTo(X, Y - 700 * s); x.lineTo(X + 40 * s, Y - 600 * s); x.closePath(); x.fill();
    x.fillStyle = 'rgba(120,136,170,0.55)'; x.fillRect(X - 24 * s, Y - 520 * s, 2.5 * s, 520 * s);
    x.fillStyle = 'rgba(255,180,100,0.5)'; x.fillRect(X - 20 * s, Y - 585 * s, 12 * s, 40 * s); x.fillRect(X + 8 * s, Y - 585 * s, 12 * s, 40 * s);
  }
  // capital(x, c, t, o): the whole night view of the capital (moon, cloud, volcano and its circling shapes, the city in
  //   layers) under the parallax camera c; o.dawn (0..1) turns it grey with smoke columns, o.fire (0..1) sets it burning
  function capital(x, c, t, o = {}) {
    const dawn = o.dawn || 0;
    const g = x.createLinearGradient(0, 0, 0, H);
    if (dawn > 0) { g.addColorStop(0, '#6a6e78'); g.addColorStop(0.55, '#a4a29c'); g.addColorStop(1, '#8a8780'); }
    else { g.addColorStop(0, '#07080e'); g.addColorStop(0.45, '#141726'); g.addColorStop(0.7, '#2a2230'); g.addColorStop(1, '#141420'); }
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    view(x, c, 0.06);
    if (!dawn) { moonDisc(x, 560, 150, 46); fog(x, 1165, [52, 48, 66], -60, 300, t * 14, 0.6); fog(x, 1166, [80, 44, 40], 170, 260, -t * 10 + 300, 0.45); }
    else fog(x, 1165, [150, 150, 150], 0, 360, t * 10, 0.5);
    const V = volcanoImg();
    view(x, c, 0.22); x.save(); if (dawn) x.filter = 'grayscale(0.85) brightness(2.3) contrast(0.6)'; x.drawImage(V.c, 1380 - V.cx, 270 - V.top, V.c.width, V.c.height); x.restore();
    if (!dawn) { const vf = flick(t, 4, 1.2); glow(x, [255, 96, 36], 1380, 300, 420, 0.35 * vf); glow(x, [255, 170, 90], 1380, 290, 90, 0.5 * vf); }
    K.smoke(x, t, { n: 12, x: 1180, y: -420, w: 360, h: 720, color: dawn ? [120, 116, 112] : [60, 30, 26], alpha: 0.35, rise: 12, size: 320, seed: 1152, drift: -8 });
    if (!dawn) for (let i = 0; i < 3; i++) { const a = t * (0.32 + i * 0.07) + i * 2.1, rx = 300 + i * 90, gx = 1380 + Math.cos(a) * rx, gy = 150 + Math.sin(a) * rx * 0.22 - i * 30; glider(x, gx, gy, 26 - i * 4 + 6 * Math.sin(a), Math.sin(a) > 0 ? Math.PI + 0.1 : -0.1, t * 2.4 + i, `rgba(8,6,10,${0.9 - i * 0.15})`); }
    view(x, c, 0.35);
    x.fillStyle = dawn ? '#6e6c6a' : '#1a1c2a'; x.beginPath(); x.moveTo(-300, 760); for (let X = -300; X <= W + 400; X += 20) x.lineTo(X, 600 - 50 * K.fbm(X * 0.003, 1, 4, 1170) + 20 * Math.sin(X * 0.002)); x.lineTo(W + 400, 1000); x.lineTo(-300, 1000); x.closePath(); x.fill();
    fog(x, 1171, dawn ? [150, 148, 144] : [44, 46, 64], 520, 200, t * 8, 0.7);
    const flt = dawn ? 'grayscale(0.9) brightness(3.2) contrast(0.55)' : 'none';
    view(x, c, 0.5); x.save(); x.filter = flt; x.drawImage(CITY.far(), -240, 380); x.restore();
    if (!dawn) rookerySmall(x, 250, 660, 0.9);
    fog(x, 1172, dawn ? [140, 138, 134] : [40, 42, 60], 610, 160, -t * 12, 0.65);
    view(x, c, 0.7); const CM = CITY.mid(); x.save(); x.filter = flt; x.drawImage(CM, -340, 360); x.restore();
    if (!dawn) {
      // the High Seat's tower, its lit window
      x.fillStyle = '#0e1019'; x.fillRect(1250 - 340 - 48, 40 + 360 - 360, 96, 400); x.beginPath(); x.moveTo(1250 - 340 - 52, 40); x.lineTo(1250 - 340, 40 - 210); x.lineTo(1250 - 340 + 52, 40); x.closePath(); x.fill();
      x.fillStyle = 'rgba(120,136,170,0.55)'; x.fillRect(1250 - 340 - 48, 40, 4, 400);
      x.fillStyle = '#ffb868'; x.fillRect(1250 - 340 - 12, 90, 24, 40); glow(x, [255, 170, 90], 1250 - 340, 110, 60, 0.5 * flick(t, 9, 2));
      for (const [lx, ly, s] of CM.lights) if (s > 0.85) glow(x, [255, 170, 90], lx - 340, ly + 360, 22, 0.25 * flick(t, lx, 2));
    }
    if (o.fire) for (let k = 0; k < 9; k++) { const fx = 120 + k * 210 + (k * 37 % 50), fy = 700 + (k % 3) * 40; fire(x, fx, fy, 60 + (k % 2) * 30, (140 + (k % 3) * 60) * o.fire, t, k + 30, { slot: 'c' + (k % 3), n: 5 }); glow(x, [255, 110, 40], fx, fy - 60, 260, 0.25 * o.fire); }
    fog(x, 1173, dawn ? [130, 128, 124] : [34, 36, 52], 760, 220, t * 16, 0.7);
    view(x, c, 1.05); x.save(); x.filter = flt; x.drawImage(CITY.near(), -440, 830); x.restore();
    if (dawn) for (let k = 0; k < 5; k++) K.smoke(x, t, { n: 7, x: 200 + k * 360, y: -200, w: 160, h: 900, color: [70, 68, 66], alpha: 0.45 * dawn, rise: 20, size: 260, seed: 1180 + k, drift: 10 });
    x.setTransform(1, 0, 0, 1, 0, 0);
  }

  const LIB = { TAU, rgbs, mix, hexc, fract, flick, cleanState, scratch, view, proj, glowImg, glow, tinted, taper, flame, candleFlame, fire, rimLit, bloom, fogTex, fog, vignetteImg, finish, person, wingPts, wing, glider, scriptLine, drawScript, scriptTip, runEdit, at, veinTree, drawVeins, v3, cam3, toCam, p3, path3, frame3, extrude, drawFaces, quillHand, moonDisc, capital };

  // ================================================================ L01: the chronicle, at speed (what the opening told)
  // Full-page illuminations in the chronicle's own manner (vellum, ink, gold), cut hard on the rhythm of the line: the
  // crown on its dais, the crown breaking, the rulers reaching for the empty seat, a First-Born's wing over burning roofs,
  // seven fires lit at seven halls, seven banners about the Blood-Throne.
  const INK = a => K.rgba(P.ink, a);
  function pageBase(seed) { return K.cached('s1:pagebase:' + seed, () => K.parchment(W, H, seed, { edge: 1.4, foxing: 36, stains: 2 })); }
  function newPage(key, seed, paint) {
    return K.cached('s1:page:' + key, () => {
      const c = K.canvas(W, H), x = c.getContext('2d'); x.drawImage(pageBase(seed), 0, 0);
      paint(x, rng(seed + 7));
      // a ruled frame of red and gold
      x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = K.rgba(P.vermilion, 0.7); x.lineWidth = 3; x.strokeRect(70, 60, W - 140, H - 120); x.restore();
      K.gold(x, cc => { cc.beginPath(); cc.rect(52, 42, W - 104, H - 84); cc.rect(62, 52, W - 124, H - 104); }, 52, 42, W - 52, H - 42, { sheen: 0.4, rule: 'evenodd', outlineW: 1 });
      return c;
    });
  }
  // the crown, alone, in gold leaf on a transparent sheet (so it can break)
  function crownImg() {
    return K.cached('s1:crown', () => {
      const c = K.canvas(720, 480), x = c.getContext('2d');
      const path = cc => { cc.beginPath(); cc.moveTo(130, 380); cc.lineTo(130, 318); cc.lineTo(96, 120); cc.lineTo(214, 246); cc.lineTo(262, 70); cc.lineTo(318, 236); cc.lineTo(360, 30); cc.lineTo(402, 236); cc.lineTo(458, 70); cc.lineTo(506, 246); cc.lineTo(624, 120); cc.lineTo(590, 318); cc.lineTo(590, 380); cc.quadraticCurveTo(360, 410, 130, 380); cc.closePath(); };
      K.gold(x, path, 96, 30, 624, 400, { sheen: 0.42, outlineW: 2.2 });
      x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = INK(0.7); x.lineWidth = 2; x.beginPath(); x.moveTo(130, 318); x.quadraticCurveTo(360, 345, 590, 318); x.stroke(); x.restore();
      for (const [gx, col, rr] of [[200, P.vermilion, 18], [290, P.ultramarine, 15], [360, P.vermilion, 22], [430, P.ultramarine, 15], [520, P.vermilion, 18]]) { x.fillStyle = col; x.beginPath(); x.ellipse(gx, 352, rr, rr * 0.8, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,240,220,0.5)'; x.beginPath(); x.ellipse(gx - rr * 0.3, 346, rr * 0.3, rr * 0.2, 0, 0, TAU); x.fill(); x.strokeStyle = INK(0.8); x.lineWidth = 1.5; x.beginPath(); x.ellipse(gx, 352, rr, rr * 0.8, 0, 0, TAU); x.stroke(); }
      for (const [px, py] of [[96, 120], [262, 70], [360, 30], [458, 70], [624, 120]]) { x.fillStyle = P.bone; x.beginPath(); x.arc(px, py - 12, 13, 0, TAU); x.fill(); x.strokeStyle = INK(0.8); x.lineWidth = 1.5; x.stroke(); }
      return c;
    });
  }
  const PG = {
    crown: () => newPage('crown', 1301, (x, r) => {
      // rays of ink about the crown, a cushion and the dais
      x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = INK(0.35); x.lineWidth = 1.2;
      for (let k = 0; k < 90; k++) { const a = k / 90 * TAU, r0 = 300 + r() * 20, r1 = 520 + r() * 200; x.beginPath(); x.moveTo(960 + Math.cos(a) * r0, 470 + Math.sin(a) * r0 * 0.8); x.lineTo(960 + Math.cos(a) * r1, 470 + Math.sin(a) * r1 * 0.8); x.stroke(); }
      x.restore();
      K.wash(x, cc => { cc.beginPath(); cc.ellipse(960, 690, 330, 60, 0, 0, TAU); }, P.vermilion, 0.75, { bbox: [600, 600, 720, 180] });
      for (let s = 0; s < 3; s++) { const w = 900 - s * 160, y0 = 760 + (2 - s) * 60; K.wash(x, cc => { cc.beginPath(); cc.rect(960 - w / 2, y0, w, 60); }, P.parchDark, 0.55, { bbox: [960 - w / 2, y0, w, 60] }); x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = INK(0.8); x.lineWidth = 2; x.strokeRect(960 - w / 2, y0, w, 60); x.restore(); }
    }),
    rulers: () => newPage('rulers', 1302, (x, r) => {
      K.wash(x, cc => { cc.beginPath(); cc.rect(140, 120, W - 280, 760); }, P.ultramarine, 0.32, { bbox: [140, 120, W - 280, 760] });
      for (let s = 0; s < 3; s++) { const w = 520 - s * 120, y0 = 820 - s * 50; x.fillStyle = s % 2 ? '#c9b48a' : '#d8c6a0'; x.fillRect(960 - w / 2, y0, w, 50); x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = INK(0.8); x.lineWidth = 2; x.strokeRect(960 - w / 2, y0, w, 50); x.restore(); }
      // the empty seat: only light where the King stood
      x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = INK(0.3); x.lineWidth = 1.2; for (let k = 0; k < 40; k++) { const a = -Math.PI / 2 + (k / 39 - 0.5) * 2.2; x.beginPath(); x.moveTo(960 + Math.cos(a) * 80, 640 + Math.sin(a) * 80); x.lineTo(960 + Math.cos(a) * 420, 640 + Math.sin(a) * 420); x.stroke(); } x.restore();
      const heads = ['crown', 'crown', 'cap', 'hood', 'crown', 'veil', 'crown', 'mitre'], robes = [P.vermilion, P.verdigris, '#7a4a8a', P.ochre, P.ultramarine, '#8a3b2a', P.green, '#6d5a3a'];
      for (let i = 0; i < 8; i++) { const left = i < 4, k = i % 4, fx = left ? 300 + k * 120 : W - 300 - k * 120; K.figure(x, fx, 900, 330 - k * 8, { kind: i % 3 === 2 ? 'gown' : 'robe', head: heads[i], style: 'painted', robe: robes[i], hose: '#4a3626', skin: '#e2c4a0', hairCol: '#4a3220', face: left ? 1 : -1, lean: (left ? 1 : -1) * 0.1, arm: 2.2 + r() * 0.3, bend: 0.15, outline: 1.6, sheen: 0.5 }); }
    }),
    wing: () => newPage('wing', 1303, (x, r) => {
      // an ink-wash night over a village burning
      for (let k = 0; k < 4; k++) K.wash(x, cc => { cc.beginPath(); cc.ellipse(300 + k * 450, 260 + r() * 100, 520, 200, 0, 0, TAU); }, P.inkBlue, 0.28, { bbox: [0, 0, W, 600] });
      for (let k = 0; k < 9; k++) {
        const hx = 160 + k * 190 + r() * 40, hw = 110 + r() * 60, hy = 860 + r() * 30, hh = 90 + r() * 50;
        x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = INK(0.85); x.beginPath(); x.moveTo(hx, hy); x.lineTo(hx, hy - hh); x.lineTo(hx + hw / 2, hy - hh - hw * 0.6); x.lineTo(hx + hw, hy - hh); x.lineTo(hx + hw, hy); x.closePath(); x.fill(); x.restore();
        const fx = hx + hw * (0.3 + r() * 0.4), fy = hy - hh - hw * 0.3;
        for (let j = 0; j < 4; j++) { x.fillStyle = j < 2 ? K.rgba(P.vermilion, 0.85) : K.rgba(P.gold, 0.9); x.beginPath(); x.moveTo(fx - 26 + j * 6, fy + 10); x.quadraticCurveTo(fx - 20 + j * 8, fy - 60 - j * 14, fx + (j - 1.5) * 10, fy - 110 + j * 20); x.quadraticCurveTo(fx + 10 + j * 4, fy - 50, fx + 26 - j * 6, fy + 10); x.closePath(); x.fill(); }
      }
      x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = INK(0.7); x.fillRect(70, 880, W - 140, 140); x.restore();
    }),
    halls: () => newPage('halls', 1304, (x, r) => {
      // a strip of the land: mountains, a river, seven halls
      for (let k = 0; k < 26; k++) K.mountain(x, 160 + k * 62 + r() * 30, 420 + r() * 60, 50 + r() * 40, 1400 + k);
      x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = K.rgba(P.inkBlue, 0.7); x.lineWidth = 4; x.beginPath(); x.moveTo(120, 760); for (let X = 120; X < W - 100; X += 20) x.lineTo(X, 760 + 50 * Math.sin(X * 0.006) + 20 * Math.sin(X * 0.017)); x.stroke(); x.restore();
      for (let k = 0; k < 30; k++) K.tree(x, 200 + r() * 1500, 860 + r() * 120, 26 + r() * 12, r() < 0.5 ? 'pine' : 'oak');
      HALLS.forEach(([hx, hy]) => { x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = INK(0.9); x.fillRect(hx - 22, hy - 50, 44, 50); x.beginPath(); x.moveTo(hx - 30, hy - 50); x.lineTo(hx, hy - 90); x.lineTo(hx + 30, hy - 50); x.closePath(); x.fill(); x.restore(); });
    }),
    throne: () => newPage('throne', 1305, (x, r) => {
      K.wash(x, cc => { cc.beginPath(); cc.ellipse(960, 640, 700, 380, 0, 0, TAU); }, P.crimson, 0.18, { bbox: [260, 260, 1400, 760] });
      // the Blood-Throne: black stone, veined red
      const tp = cc => { cc.beginPath(); cc.moveTo(840, 900); cc.lineTo(840, 520); cc.lineTo(870, 380); cc.lineTo(910, 470); cc.lineTo(960, 330); cc.lineTo(1010, 470); cc.lineTo(1050, 380); cc.lineTo(1080, 520); cc.lineTo(1080, 900); cc.closePath(); };
      x.save(); tp(x); x.fillStyle = '#17110e'; x.fill(); x.clip(); x.strokeStyle = K.rgba(P.vermilion, 0.9);
      for (let k = 0; k < 14; k++) { x.lineWidth = 1 + r() * 2.5; x.beginPath(); let px = 850 + r() * 220, py = 900; x.moveTo(px, py); for (let i = 0; i < 12; i++) { px += (r() - 0.5) * 40; py -= 30 + r() * 20; x.lineTo(px, py); } x.stroke(); }
      x.restore(); x.strokeStyle = INK(0.9); x.lineWidth = 2.5; tp(x); x.stroke();
      x.fillStyle = '#2a1e18'; x.fillRect(800, 900, 320, 40); x.fillRect(760, 940, 400, 40);
    }),
  };
  const HALLS = [[300, 640], [520, 560], [760, 690], [980, 600], [1200, 700], [1420, 580], [1640, 660]];
  // a page on screen: a short, quick move; hard cuts; the first frames slide in like a page turned
  function showPage(x, img, t, sh, o = {}) {
    const lt = t - sh.a, d = sh.b - sh.a, u = clamp(lt / d), slide = (1 - easeOut(clamp(lt / 0.12))) * (o.slide != null ? o.slide : 90);
    const z = lerp(o.z0 || 1.05, o.z1 || 1.12, u), cx = lerp(o.x0 || 0, o.x1 || 0, u) + slide, cy = lerp(o.y0 || 0, o.y1 || 0, u);
    x.fillStyle = '#0a0705'; x.fillRect(0, 0, W, H);
    x.setTransform(z, 0, 0, z, W / 2 - (W / 2 + cx) * z, H / 2 - (H / 2 + cy) * z);
    x.drawImage(img, 0, 0);
    if (o.over) o.over(x, u, lt);
    x.setTransform(1, 0, 0, 1, 0, 0);
    // candlelight on the vellum: warm at the heart, falling off into the dark of the room
    x.save(); x.globalCompositeOperation = 'multiply'; const g = x.createRadialGradient(W * 0.42, H * 0.38, 100, W * 0.5, H * 0.5, W * 0.75); g.addColorStop(0, 'rgb(255,240,214)'); g.addColorStop(0.6, 'rgb(190,150,108)'); g.addColorStop(1, 'rgb(60,40,26)'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore();
    finish(x, { bloom: 0.18, vig: 0.7, vigIn: 0.25, tooth: 0.09 });
  }
  function shotPageCrown(x, t, sh) { showPage(x, PG.crown(), t, sh, { z0: 1.04, z1: 1.14, y0: 10, y1: -20, over: (c) => { c.drawImage(crownImg(), 960 - 360, 470 - 330); } }); }
  function shotPageShatter(x, t, sh) {
    const brk = sh.a + 0.12, p = easeOut(span(t, brk, sh.b + 0.3));
    const [sx, sy] = K.shake(t * 3, 26 * Math.exp(-Math.max(0, t - brk) * 5) * (t > brk ? 1 : 0), 1311);
    showPage(x, PG.crown(), t, sh, { z0: 1.32, z1: 1.4, x0: sx, x1: sx, y0: -60 + sy, y1: -70 + sy, slide: 0, over: (c) => {
      const C = crownImg(), cx = 960, cy = 470;
      if (t < brk) { c.drawImage(C, cx - 360, cy - 330); return; }
      // ink cracks run out across the vellum from the break
      c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = INK(0.85); const r = rng(1312);
      for (let k = 0; k < 12; k++) { const a = r() * TAU, L = (200 + r() * 520) * p, pts = []; let X = cx, Y = cy - 120, A = a; for (let i = 0; i <= 10; i++) { pts.push([X, Y]); A += (r() - 0.5) * 0.6; X += Math.cos(A) * L / 10; Y += Math.sin(A) * L / 10; } taper(c, pts, 5, 0.5); }
      c.restore();
      // the pieces fly apart
      const n = 9;
      for (let k = 0; k < n; k++) {
        const a0 = k / n * TAU + 0.2, a1 = (k + 1) / n * TAU + 0.2, am = (a0 + a1) / 2, dist = p * (260 + (k * 53 % 140)), rot = p * ((k % 2 ? 1 : -1) * (0.6 + (k % 3) * 0.3));
        c.save(); c.translate(cx + Math.cos(am) * dist, cy - 120 + Math.sin(am) * dist + p * p * 120); c.rotate(rot);
        c.beginPath(); c.moveTo(0, 0); for (let j = 0; j <= 4; j++) { const a = lerp(a0, a1, j / 4), rr = 600 + 60 * Math.sin(j * 2.3 + k); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.clip();
        c.drawImage(C, -360, -330 + 120); c.restore();
      }
      // gold dust
      c.save(); c.globalCompositeOperation = 'lighter'; const r2 = rng(1313); for (let k = 0; k < 80; k++) { const a = r2() * TAU, d2 = p * (100 + r2() * 600); c.fillStyle = `rgba(255,220,140,${(1 - p) * 0.8})`; c.fillRect(cx + Math.cos(a) * d2, cy - 120 + Math.sin(a) * d2 + p * p * 200, 3, 3); } c.restore();
    } });
  }
  function shotPageRulers(x, t, sh) { showPage(x, PG.rulers(), t, sh, { z0: 1.12, z1: 1.04, y0: -30, y1: 0 }); }
  function shotPageWing(x, t, sh) {
    showPage(x, PG.wing(), t, sh, { z0: 1.05, z1: 1.1, x0: 20, x1: -20, over: (c, u) => {
      c.save(); c.globalCompositeOperation = 'multiply';
      wing(c, { x: lerp(1500, 520, u), y: lerp(120, 260, u), s: 1100, rot: lerp(0.5, -0.05, u), mirror: true, flap: lerp(0.5, -0.3, u), col: INK(0.92), curl: 0.16 });
      c.restore();
    } });
  }
  function shotPageHalls(x, t, sh) {
    showPage(x, PG.halls(), t, sh, { z0: 1.1, z1: 1.16, x0: -30, x1: 30, over: (c, u, lt) => {
      HALLS.forEach(([hx, hy], i) => { const on = smooth(span(lt, 0.04 + i * 0.06, 0.16 + i * 0.06)); if (on <= 0) return; flame(c, hx, hy - 92, 46 * on, t, i + 3, 1); glow(c, [255, 170, 80], hx, hy - 110, 90 * on, 0.4 * on); });
    } });
  }
  function shotPageThrone(x, t, sh) {
    showPage(x, PG.throne(), t, sh, { z0: 1.0, z1: 1.08, y0: 0, y1: 20, over: (c, u, lt) => {
      const H7 = [0, 1, 2, 3, 4, 5, 6].map(i => K.HOUSES[i]);
      H7.forEach((hs, i) => { const a = Math.PI + (i + 0.5) / 7 * Math.PI, bx = 960 + Math.cos(a) * 640, by = 640 + Math.sin(a) * 420 - 80, on = easeOut(span(lt, i * 0.04, 0.2 + i * 0.04)); if (on <= 0) return; c.save(); c.globalAlpha = on; K.banner(c, bx, by - 130 * (1 - on), 120, 230 * on + 1, hs, t + i, { wind: 0.5, seed: i }); c.restore(); });
    } });
  }

  // ================================================================ the book: the chronicle open, riffling; then slammed shut
  const BK = { cx: 960, top: 250, bot: 870, pw: 560 };
  function bookRoom() {
    return K.cached('s1:bookroom', () => {
      const c = K.canvas(W, H), x = c.getContext('2d'), r = rng(1320);
      x.fillStyle = '#080605'; x.fillRect(0, 0, W, H);
      const g = x.createRadialGradient(560, 300, 20, 700, 500, 1200); g.addColorStop(0, 'rgba(120,76,40,0.55)'); g.addColorStop(0.4, 'rgba(50,30,18,0.4)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      // the lectern's slanted board under the book
      x.fillStyle = '#1c120b'; x.beginPath(); x.moveTo(300, 230); x.lineTo(1620, 230); x.lineTo(1720, 960); x.lineTo(200, 960); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(120,80,46,0.35)'; x.lineWidth = 2; for (let k = 0; k < 30; k++) { const y0 = 240 + r() * 700; x.beginPath(); x.moveTo(260, y0); x.bezierCurveTo(700, y0 + (r() - 0.5) * 30, 1200, y0 + (r() - 0.5) * 30, 1680, y0 + (r() - 0.5) * 20); x.stroke(); }
      x.fillStyle = '#100a06'; x.fillRect(180, 950, 1560, 60); x.fillRect(820, 1000, 280, 80);
      return c;
    });
  }
  // a page quad between the spine and an edge at angle th (0 = lying right, PI = lying left); lift from the board
  function pageQuad(th, inset = 0) {
    const ex = BK.cx + Math.cos(th) * (BK.pw - inset), lift = Math.sin(th) * BK.pw * 0.36, curl = Math.sin(th) * 40;
    return { st: [BK.cx, BK.top + 6], sb: [BK.cx, BK.bot - 6], et: [ex, BK.top + 24 - lift - Math.abs(Math.cos(th)) * 14], eb: [ex + curl * Math.sign(Math.cos(th) || 1) * 0.3, BK.bot + 6 - lift * 0.7 + Math.abs(Math.cos(th)) * 14], curl };
  }
  function pagePath(x, q) { x.beginPath(); x.moveTo(q.st[0], q.st[1]); x.quadraticCurveTo((q.st[0] + q.et[0]) / 2, q.st[1] - 30 + q.curl * 0.2, q.et[0], q.et[1]); x.lineTo(q.eb[0], q.eb[1]); x.quadraticCurveTo((q.sb[0] + q.eb[0]) / 2, q.sb[1] + 26 + q.curl * 0.2, q.sb[0], q.sb[1]); x.closePath(); }
  // paint an illumination onto a page quad (affine from the quad's corners), shaded toward the spine
  function pageImg(x, q, img, flip, shadeK) {
    x.save(); pagePath(x, q); x.clip();
    const [ax, ay] = flip ? q.et : q.st, [bx, by] = flip ? q.st : q.et, [cx2, cy2] = flip ? q.eb : q.sb;
    x.fillStyle = '#d9c6a0'; x.fill();
    x.transform((bx - ax) / W, (by - ay) / W, (cx2 - ax) / H, (cy2 - ay) / H, ax, ay); x.drawImage(img, 0, 0); x.restore();
    x.save(); pagePath(x, q); x.clip(); x.globalCompositeOperation = 'multiply';
    const g = x.createLinearGradient(q.st[0], 0, q.et[0], 0); g.addColorStop(0, 'rgb(90,64,40)'); g.addColorStop(0.18, `rgb(${200 * shadeK | 0},${176 * shadeK | 0},${140 * shadeK | 0})`); g.addColorStop(1, `rgb(${235 * shadeK | 0},${215 * shadeK | 0},${180 * shadeK | 0})`); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore();
  }
  function bookBlock(x, side, thick) {
    // the stacked edges of the pages under one half
    const ex = BK.cx + side * BK.pw;
    x.fillStyle = '#b8a27a'; x.beginPath(); x.moveTo(ex, BK.top + 24); x.lineTo(ex + side * 4, BK.top + 24 + thick); x.lineTo(ex + side * 4, BK.bot + 6 + thick); x.lineTo(BK.cx, BK.bot + thick); x.lineTo(BK.cx, BK.bot); x.lineTo(ex, BK.bot + 6); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(90,64,40,0.5)'; x.lineWidth = 1; for (let k = 2; k < thick; k += 3) { x.beginPath(); x.moveTo(BK.cx, BK.bot + k); x.lineTo(ex, BK.bot + 6 + k); x.stroke(); }
    x.fillStyle = '#3a1a10'; x.beginPath(); x.moveTo(ex + side * 4, BK.top + 18 + thick); x.lineTo(ex + side * 14, BK.top + 18 + thick); x.lineTo(ex + side * 14, BK.bot + 14 + thick); x.lineTo(BK.cx, BK.bot + 10 + thick); x.lineTo(BK.cx, BK.bot + thick); x.closePath(); x.fill();
  }
  const MONTAGE = ['crown', 'rulers', 'wing', 'halls', 'throne'];
  function shotBook(x, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a, sh.b);
    const c = { x: lerp(0, 160, ease(u)), y: lerp(40, -40, ease(u)), z: lerp(1.0, 1.55, easeIn(u)) };
    view(x, c, 0.6); x.drawImage(bookRoom(), -60, -40, W + 120, H + 80);
    view(x, c, 1);
    bookBlock(x, -1, 22); bookBlock(x, 1, 22);
    // the open spread, and the pages riffling over from right to left, faster and faster
    const rate = 2.2 + 9 * easeIn(u), ph = lt * 2.2 + 4.5 * easeIn(u) * lt, idx = Math.floor(ph), th = Math.PI * ease(fract(ph));
    const im = k => PG[MONTAGE[((k % 5) + 5) % 5]]();
    void rate;
    pageImg(x, pageQuad(Math.PI), im(idx), true, 0.9);
    pageImg(x, pageQuad(0), im(idx + 2), false, 1);
    const q = pageQuad(th);
    if (th < Math.PI / 2) pageImg(x, q, im(idx + 1), false, 0.75 + 0.25 * Math.cos(th)); else pageImg(x, q, im(idx + 1), true, 0.6 + 0.4 * -Math.cos(th));
    // the gutter's shadow
    const gg = x.createLinearGradient(BK.cx - 60, 0, BK.cx + 60, 0); gg.addColorStop(0, 'rgba(40,24,12,0)'); gg.addColorStop(0.5, 'rgba(40,24,12,0.55)'); gg.addColorStop(1, 'rgba(40,24,12,0)'); x.fillStyle = gg; x.fillRect(BK.cx - 60, BK.top, 120, BK.bot - BK.top);
    // the candle
    const I = 1;
    x.fillStyle = '#d8ccb0'; x.fillRect(372, 150, 34, 150); x.fillStyle = '#2a1c10'; x.fillRect(352, 296, 74, 14);
    candleFlame(x, 389, 150, 30, t, 3, I, -0.2 + 0.15 * Math.sin(t * 2));
    x.setTransform(1, 0, 0, 1, 0, 0);
    K.specks(x, t, { kind: 'dust', n: 40, alpha: 0.4, seed: 1321 });
    finish(x, { bloom: 0.3, vig: 0.75, warm: '#a0602a', warmA: 0.06 });
  }
  function shotSlam(x, t, sh) {
    const lt = t - sh.a, C02 = sh.a + 0.47, close = easeIn(span(t, sh.a, C02)), after = Math.max(0, t - C02);
    const [sx, sy] = K.shake(t * 2.5, 30 * Math.exp(-after * 6) * (t > C02 ? 1 : 0), 1331);
    const c = { x: 60 + sx, y: -10 + sy, z: lerp(1.12, 1.18, span(t, sh.a, sh.b)) };
    // the candle: knocked flat by the gust, then out
    const I = t < C02 ? 1 : Math.max(0, 1 - smooth(span(after, 0.05, 0.8))) * (0.6 + 0.4 * Math.abs(Math.sin(after * 30)));
    const room = 1 - smooth(span(after, 0.3, 1.4));
    view(x, c, 0.6); x.globalAlpha = room; x.drawImage(bookRoom(), -60, -40, W + 120, H + 80); x.globalAlpha = 1;
    view(x, c, 1);
    x.save(); x.globalAlpha = Math.max(0.04, room);
    bookBlock(x, 1, 22);
    pageImg(x, pageQuad(0), PG.throne(), false, 1);
    const th = Math.PI * (1 - close);
    if (th > 0.02) {
      const q = pageQuad(th);
      if (th > Math.PI / 2) pageImg(x, q, PG.halls(), true, 0.6 + 0.4 * -Math.cos(th));
      else { pagePath(x, q); x.fillStyle = '#2a120c'; x.fill(); x.save(); x.clip(); x.globalCompositeOperation = 'multiply'; const gq = x.createLinearGradient(q.st[0], 0, q.et[0], 0); gq.addColorStop(0, 'rgb(80,60,50)'); gq.addColorStop(1, 'rgb(220,200,180)'); x.fillStyle = gq; x.fillRect(0, 0, W, H); x.restore(); }
    } else {
      // closed: the cover, leather and gold tooling
      const q = pageQuad(0, -10); pagePath(x, q); x.fillStyle = '#2c130c'; x.fill();
      x.save(); x.clip(); const gq = x.createRadialGradient(700, 400, 50, 1100, 600, 900); gq.addColorStop(0, 'rgba(120,60,40,0.4)'); gq.addColorStop(1, 'rgba(0,0,0,0.5)'); x.fillStyle = gq; x.fillRect(0, 0, W, H); x.restore();
      x.strokeStyle = 'rgba(201,161,74,0.75)'; x.lineWidth = 4; x.strokeRect(BK.cx + 50, BK.top + 60, BK.pw - 110, BK.bot - BK.top - 110); x.lineWidth = 1.5; x.strokeRect(BK.cx + 66, BK.top + 76, BK.pw - 142, BK.bot - BK.top - 142);
      x.save(); x.fillStyle = 'rgba(201,161,74,0.8)'; x.translate(BK.cx + BK.pw / 2 - 10, (BK.top + BK.bot) / 2); x.rotate(Math.PI / 4); x.fillRect(-60, -60, 120, 120); x.fillStyle = '#2c130c'; x.fillRect(-48, -48, 96, 96); x.restore();
    }
    x.restore();
    x.globalAlpha = Math.max(0.05, room); x.fillStyle = '#d8ccb0'; x.fillRect(372, 150, 34, 150); x.fillStyle = '#2a1c10'; x.fillRect(352, 296, 74, 14); x.globalAlpha = 1;
    if (I > 0.01) candleFlame(x, 389, 150, 30, t, 3, I, t < C02 ? -0.2 - close * 0.8 : -1 + after);
    // a curl of smoke from the wick, and dust thrown up by the slam
    if (after > 0.2) K.smoke(x, t, { n: 5, x: 360, y: -120, w: 60, h: 260, color: [90, 80, 70], alpha: 0.3 * (1 - smooth(span(after, 1.2, 2))), rise: 30, size: 60, seed: 1332 });
    if (t > C02) { const dp = after; for (let k = 0; k < 12; k++) { const sx2 = BK.cx + (k / 11 - 0.2) * BK.pw * 1.3, a = (1 - smooth(span(dp, 0, 1.6))) * 0.18 * room; if (a > 0) { x.globalAlpha = a; x.drawImage(tinted(K.puff(), [160, 140, 110], 'dust'), sx2 - 80 - dp * 40, BK.top + 40 + (k % 3) * 200 - dp * 60, 160 + dp * 200, 160 + dp * 200); } } x.globalAlpha = 1; }
    x.setTransform(1, 0, 0, 1, 0, 0);
    finish(x, { bloom: 0.3 * room, vig: 0.8, warm: '#a0602a', warmA: 0.06 });
    const dark = smooth(span(after, 0.6, 1.5)); if (dark > 0) { x.fillStyle = `rgba(0,0,0,${dark})`; x.fillRect(0, 0, W, H); }
    if (I > 0.01 || (after > 0.6 && after < 1.6)) glow(x, [255, 120, 50], 389 * c.z + (W / 2 - (W / 2 + c.x) * c.z), 150 * c.z + (H / 2 - (H / 2 + c.y) * c.z), 6, 0.6 * (1 - smooth(span(after, 0.8, 1.6))));
  }

  // ================================================================ L03: Oswyn at his window, the city below
  // We open on the capital at night, through the glass, and draw back out of the window to find Lord Oswyn standing at
  // it, his back to us; his wife Elswyth by the hearth with the bundle, a soft shape in the firelight.
  const WIN = { x0: 1010, x1: 1450, top: 96, spring: 360, sill: 900, mull: 1230 };
  function winPath(x, inset = 0) { const { x0, x1, top, spring, sill } = WIN, cx = (x0 + x1) / 2; x.beginPath(); x.moveTo(x0 + inset, sill); x.lineTo(x0 + inset, spring); x.quadraticCurveTo(x0 + inset, top + 60 + inset, cx, top + inset); x.quadraticCurveTo(x1 - inset, top + 60 + inset, x1 - inset, spring); x.lineTo(x1 - inset, sill); x.closePath(); }
  function roomWall() {
    return K.cached('s1:roomwall', () => {
      const c = K.canvas(W + 400, H + 300), x = c.getContext('2d'), r = rng(1340), OX = 200, OY = 150;
      x.fillStyle = '#16120f'; x.fillRect(0, 0, c.width, c.height);
      for (let row = 0; row * 62 < c.height; row++) for (let X = -((row % 2) * 70); X < c.width; X += 140 + r() * 30) { const v = 18 + r() * 10; x.fillStyle = `rgb(${v + 4 | 0},${v | 0},${v - 3 | 0})`; x.fillRect(X + 3, row * 62 + 3, 134, 56); }
      x.globalCompositeOperation = 'multiply'; for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.2})`; x.beginPath(); x.ellipse(r() * c.width, r() * c.height, 10 + r() * 60, 6 + r() * 30, r() * 3, 0, TAU); x.fill(); }
      x.globalCompositeOperation = 'source-over';
      // the window's deep reveal, splayed, catching the moon
      x.save(); x.translate(OX, OY);
      const { x0, x1, top, spring, sill } = WIN, cx = (x0 + x1) / 2;
      x.fillStyle = '#2c3140'; x.beginPath(); x.moveTo(x0 - 70, sill + 40); x.lineTo(x0 - 70, spring); x.quadraticCurveTo(x0 - 70, top - 10, cx, top - 70); x.quadraticCurveTo(x1 + 70, top - 10, x1 + 70, spring); x.lineTo(x1 + 70, sill + 40); x.closePath(); x.fill();
      const rg = x.createLinearGradient(x0 - 70, 0, x0, 0); rg.addColorStop(0, '#1a1c26'); rg.addColorStop(1, '#3c4456'); x.fillStyle = rg; x.fillRect(x0 - 70, spring, 70, sill - spring + 40);
      x.fillStyle = '#4a5468'; x.fillRect(x0 - 60, sill, x1 - x0 + 120, 30);
      x.restore();
      return { c, OX, OY };
    });
  }
  // Oswyn from behind: a heavy robe falling to the floor, grey hair, hands clasped at the small of the back; the tower
  // of his house worked on the robe in tarnished gold
  function oswynBack(x, cx, fy, h, o = {}) {
    const col = o.col || '#2a0c09', s = h;
    x.save(); x.translate(cx, fy); x.scale(s, s);
    x.fillStyle = col;
    x.beginPath(); x.moveTo(-0.07, -0.86); x.quadraticCurveTo(-0.17, -0.85, -0.2, -0.78); x.bezierCurveTo(-0.23, -0.6, -0.2, -0.3, -0.25, 0); x.lineTo(0.25, 0); x.bezierCurveTo(0.2, -0.3, 0.23, -0.6, 0.2, -0.78); x.quadraticCurveTo(0.17, -0.85, 0.07, -0.86); x.closePath(); x.fill();
    x.beginPath(); x.ellipse(0, -0.92, 0.062, 0.075, 0, 0, TAU); x.fill();
    x.fillRect(-0.035, -0.88, 0.07, 0.05);
    if (o.hair) { x.fillStyle = o.hair; x.beginPath(); x.ellipse(0, -0.935, 0.064, 0.066, 0, Math.PI * 1.05, Math.PI * 1.95); x.lineTo(0.05, -0.87); x.quadraticCurveTo(0, -0.89, -0.05, -0.87); x.closePath(); x.fill(); }
    // folds
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 0.006; for (const fx of [-0.12, -0.05, 0.04, 0.11]) { x.beginPath(); x.moveTo(fx * 0.6, -0.6); x.quadraticCurveTo(fx * 1.1, -0.3, fx * 1.4, 0); x.stroke(); }
    if (o.device) { x.fillStyle = o.device; K.device(x, 'tower', 0, -0.62, 0.11); }
    x.restore();
  }
  function shotWindow(x, t, sh) {
    const lt = t - sh.a, pull = ease(span(t, sh.a, sh.a + 2.9)), push = span(t, sh.a + 2.9, sh.b + 0.3);
    const c = { x: lerp(270, 0, pull) + lerp(0, 60, push), y: lerp(-150, 0, pull) + lerp(0, -20, push), z: lerp(2.7, 1.0, pull) * (1 + 0.06 * push), r: 0 };
    const S = roomWall();
    // the capital through the glass (its own slow drift; parallax against the room)
    const CL = scratch('s1:citywin'), cx2 = CL.getContext('2d');
    capital(cx2, { x: -c.x * 0.15 + 40, y: -c.y * 0.15 - 20 + 30 * (1 - pull), z: 1 + 0.05 * (1 - pull) }, t);
    view(x, c, 1);
    x.drawImage(S.c, -S.OX, -S.OY);
    x.save(); winPath(x); x.clip(); x.drawImage(CL, 180, 96, W * 0.84, H * 0.84);
    // the glass: leading, the mullion, a little moonlit haze on the panes
    x.fillStyle = 'rgba(120,140,180,0.06)'; x.fillRect(WIN.x0, WIN.top, WIN.x1 - WIN.x0, WIN.sill - WIN.top);
    x.strokeStyle = 'rgba(8,8,12,0.75)'; x.lineWidth = 2;
    for (let k = -12; k < 20; k++) { x.beginPath(); x.moveTo(WIN.x0 + k * 46, WIN.top); x.lineTo(WIN.x0 + k * 46 + 500, WIN.sill + 30); x.stroke(); x.beginPath(); x.moveTo(WIN.x0 + k * 46, WIN.top); x.lineTo(WIN.x0 + k * 46 - 500, WIN.sill + 30); x.stroke(); }
    x.restore();
    x.fillStyle = '#0c0b0d'; x.fillRect(WIN.mull - 9, WIN.top + 40, 18, WIN.sill - WIN.top); x.fillRect(WIN.x0, 560, WIN.x1 - WIN.x0, 12);
    x.save(); winPath(x); x.lineWidth = 16; x.strokeStyle = '#0c0b0d'; x.stroke(); x.restore();
    // moonlight on the floor below the window
    x.save(); x.globalCompositeOperation = 'lighter'; const mg = x.createLinearGradient(0, 930, 0, 1180); mg.addColorStop(0, 'rgba(90,110,150,0.22)'); mg.addColorStop(1, 'rgba(90,110,150,0)'); x.fillStyle = mg; x.beginPath(); x.moveTo(WIN.x0 - 40, 930); x.lineTo(WIN.x1 + 40, 930); x.lineTo(WIN.x1 + 340, 1200); x.lineTo(WIN.x0 - 140, 1200); x.closePath(); x.fill(); x.restore();
    // the hearth, far left, and Elswyth by it with the bundle: soft, out of focus
    const hf = flick(t, 7, 7);
    glow(x, [255, 130, 50], 200, 900, 700 * hf, 0.28); glow(x, [255, 170, 80], 200, 930, 200, 0.4 * hf);
    const EL = scratch('s1:elswyth', 480, 360), ex = EL.getContext('2d');
    ex.setTransform(0.5, 0, 0, 0.5, -60, -380); ex.fillStyle = '#000';
    rimLit(ex, (cc, fill, pass) => person(cc, { x: 520, y: 1110, h: 470, face: -1, sit: 0.29, dress: 'gown', hat: 'hair', long: true, hold: 'bundle', lean: 0.12, tilt: 0.35, fill, fill2: pass === 0 ? '#ffd0a0' : '#4a4644' }), { rim: '#ff9a50', mid: '#5a2c18', dark: '#120a08', dx: 3, dy: 1 });
    fire(ex, 240, 1150, 150, 240 * hf, t, 4, { n: 6, slot: 'h' });
    const EB = scratch('s1:elswythB', 480, 360), eb = EB.getContext('2d'); eb.filter = 'blur(3px)'; eb.drawImage(EL, 0, 0);
    x.drawImage(EB, 120, 760, 960, 720);
    // Oswyn at the glass: backlit by the moon, warmed on his left by the hearth
    const ox = 1180, oy = 1012, oh = 700;
    const OL = scratch('s1:oswyn'), ol = OL.getContext('2d'); ol.setTransform(x.getTransform());
    oswynBack(ol, ox, oy, oh, { col: '#c9d2e6' });
    ol.globalCompositeOperation = 'source-atop'; ol.save(); ol.translate(-5, 3); oswynBack(ol, ox, oy, oh, { col: '#ff9a58' }); ol.restore();
    ol.save(); ol.translate(-2, 6); ol.globalAlpha = 0.9; oswynBack(ol, ox, oy, oh, { col: '#3a120d' }); ol.restore();
    ol.save(); ol.translate(1, 9); oswynBack(ol, ox, oy, oh, { col: '#1e0907', hair: '#6a6866', device: 'rgba(150,118,60,0.55)' }); ol.restore();
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(OL, 0, 0); x.restore();
    x.setTransform(1, 0, 0, 1, 0, 0);
    K.specks(x, t, { kind: 'dust', n: 30, alpha: 0.25, seed: 1341 });
    finish(x, { bloom: 0.4, vig: 0.7, shadow: '#26304a', shadowA: 0.25 });
    const fin = 1 - smooth(span(lt, 0, 0.8)); if (fin > 0) { x.fillStyle = `rgba(0,0,0,${fin})`; x.fillRect(0, 0, W, H); }
  }

  // ================================================================ L03 (end): the old law struck through; L05: six seals, and the seventh place empty
  const DEC = { w: 1700, h: 1240 };
  function decreePage() {
    return K.cached('s1:decree', () => {
      const c = K.canvas(DEC.w, DEC.h), x = c.getContext('2d'); x.drawImage(K.parchment(DEC.w, DEC.h, 1350, { edge: 0.8, foxing: 20, stains: 1 }), 0, 0);
      // an illuminated initial
      x.fillStyle = P.ultramarine; x.fillRect(140, 130, 190, 190); x.fillStyle = P.vermilion; x.fillRect(158, 148, 154, 154);
      K.gold(x, cc => { cc.beginPath(); cc.moveTo(190, 290); cc.lineTo(235, 165); cc.lineTo(280, 290); cc.lineTo(262, 290); cc.lineTo(250, 255); cc.lineTo(220, 255); cc.lineTo(208, 290); cc.closePath(); }, 190, 165, 280, 290, { sheen: 0.5 });
      x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = K.rgba(P.vermilion, 0.4); x.lineWidth = 1; for (let k = 0; k < 22; k++) { x.beginPath(); x.moveTo(380, 150 + k * 46); x.lineTo(DEC.w - 140, 150 + k * 46); x.stroke(); } x.restore();
      for (let k = 0; k < 22; k++) { const x0 = k < 4 ? 380 : 140, wds = scriptLine(1360 + k, DEC.w - 140 - x0 - (k % 5 === 4 ? 400 : 0), 15); drawScript(x, wds, x0, 142 + k * 46, { w: 3, col: P.ink }); }
      return c;
    });
  }
  const STRIKES = [[[300, 330], [1500, 520]], [[360, 560], [1480, 380]]];
  function shotDecree(x, t, sh) {
    const u = span(t, sh.a, sh.b), L = K.cue('L03');
    const c = { x: lerp(-40, 40, u), y: lerp(10, -20, u), z: lerp(1.0, 1.1, ease(u)), r: lerp(-0.03, 0.01, u) };
    x.fillStyle = '#120c08'; x.fillRect(0, 0, W, H);
    view(x, c, 1);
    x.save(); x.translate(110, -60); x.rotate(-0.04);
    x.drawImage(decreePage(), 0, 0);
    // two strokes through the old law
    const s1 = smooth(span(t, at('L03', 0.56), at('L03', 0.66))), s2 = smooth(span(t, at('L03', 0.7), at('L03', 0.8)));
    let tip = null;
    STRIKES.forEach(([a, b], i) => { const p = i ? s2 : s1; if (p <= 0) return; const pts = K.resample([a, [lerp(a[0], b[0], 0.5) + 10, lerp(a[1], b[1], 0.5) - 14], b], 8); K.ink(x, cc => K.nib(cc, pts, { w: 14, angle: -0.6, p, taper: 0.06, jit: 0.2, seed: 7 + i }), { color: '#1a100a', bleed: 1.5 }); if (p > 0 && p < 1) tip = [lerp(a[0], b[0], p), lerp(a[1], b[1], p) - 14 * Math.sin(p * Math.PI)]; });
    // then a new line beneath
    const wds = scriptLine(1371, 900, 17), pw = span(t, at('L03', 0.84), L.end + 0.1);
    if (pw > 0) { drawScript(x, wds, 220, 1120, { p: pw, w: 3.4, col: '#1a100a' }); if (pw < 1) { const q = scriptTip(wds, pw); tip = [220 + q[0], 1120 + q[1]]; } }
    if (!tip) tip = s1 <= 0 ? [lerp(300, 280, u * 3), 330 - 40 * (1 - u * 3)] : s2 <= 0 && s1 >= 1 ? [lerp(1500, 360, smooth(span(t, at('L03', 0.66), at('L03', 0.7)))), lerp(520, 560, smooth(span(t, at('L03', 0.66), at('L03', 0.7)))) - 30] : [lerp(1480, 220, smooth(span(t, at('L03', 0.8), at('L03', 0.84)))), lerp(380, 1120, smooth(span(t, at('L03', 0.8), at('L03', 0.84)))) - 20];
    // the hand's shadow, then the hand (Oswyn's: an old hand, a dark red sleeve with gold at the cuff)
    x.save(); x.globalAlpha = 0.35; x.filter = 'blur(6px)'; quillHand(x, tip[0] + 40, tip[1] + 50, { ang: 0.5, scale: 1.5, skin: [0, 0, 0], sleeve: [0, 0, 0] }); x.restore();
    quillHand(x, tip[0], tip[1], { ang: 0.5, scale: 1.5, skin: [200, 160, 126], sleeve: [80, 18, 14], trim: [190, 150, 70], old: true, lit: 0.9 });
    x.restore();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.save(); x.globalCompositeOperation = 'multiply'; const g = x.createRadialGradient(300, 160, 50, 700, 500, 1500); g.addColorStop(0, 'rgb(255,236,200)'); g.addColorStop(0.5, 'rgb(170,120,80)'); g.addColorStop(1, 'rgb(30,18,10)'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore();
    glow(x, [255, 170, 80], 200, 100, 500, 0.18 * flick(t, 2, 8));
    finish(x, { bloom: 0.3, vig: 0.65, tooth: 0.06 });
  }
  // the seals: wax in each house's colour, the device pressed into it
  const SEALS = [0, 1, 2, 3, 4, 5, 6].map(i => ({ house: K.HOUSES[i], x: 330 + i * 300, y: 690 }));
  function sealTimes() { const a = K.cue('L05').start - 0.15, b = at('L05', 0.33); return SEALS.slice(0, 6).map((_, i) => lerp(a, b, i / 5)); }
  function waxDisc(x, cx, cy, r, house, p, t) {
    // p: 0 molten blob .. 1 pressed
    const col = hexc(house.field), lit = mix(col, [255, 240, 220], 0.35), dk = mix(col, [0, 0, 0], 0.55);
    const rr = r * lerp(0.75, 1, easeOut(p));
    x.save();
    x.fillStyle = rgbs(mix(dk, [0, 0, 0], 0.4), 0.6); x.beginPath(); x.ellipse(cx + 6, cy + 8, rr * 1.05, rr * 1.0, 0, 0, TAU); x.fill();
    x.fillStyle = rgbs(col); x.beginPath(); for (let k = 0; k <= 24; k++) { const a = k / 24 * TAU, e = rr * (1 + 0.08 * Math.sin(a * 5 + cx) * (1 - p * 0.5)); k ? x.lineTo(cx + Math.cos(a) * e, cy + Math.sin(a) * e) : x.moveTo(cx + Math.cos(a) * e, cy + Math.sin(a) * e); } x.closePath(); x.fill();
    if (p > 0.5) {
      const k = smooth(span(p, 0.5, 1));
      x.strokeStyle = rgbs(dk, 0.8 * k); x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, rr * 0.72, 0, TAU); x.stroke();
      x.strokeStyle = rgbs(lit, 0.5 * k); x.lineWidth = 2; x.beginPath(); x.arc(cx - 1.5, cy - 1.5, rr * 0.72, Math.PI, Math.PI * 1.8); x.stroke();
      x.globalAlpha = k; x.fillStyle = rgbs(lit, 0.7); K.device(x, house.device, cx - 2, cy - 2, rr * 0.9); x.fillStyle = rgbs(dk); K.device(x, house.device, cx + 1.5, cy + 1.5, rr * 0.9); x.fillStyle = rgbs(col); K.device(x, house.device, cx, cy, rr * 0.88); x.globalAlpha = 1;
    } else { const g = x.createRadialGradient(cx - rr * 0.3, cy - rr * 0.35, 2, cx, cy, rr); g.addColorStop(0, rgbs(lit, 0.9)); g.addColorStop(0.4, rgbs(col, 0)); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rr, 0, TAU); x.fill(); }
    // a glint of the candle on the wax
    x.fillStyle = 'rgba(255,240,210,0.35)'; x.beginPath(); x.ellipse(cx - rr * 0.35, cy - rr * 0.4, rr * 0.18, rr * 0.08, -0.6, 0, TAU); x.fill();
    x.restore();
  }
  function shotSeals(x, t, sh) {
    const L5 = K.cue('L05'), T = sealTimes(), u = span(t, sh.a, sh.b);
    // pan along the row following the stamps, then settle on the seventh and push in
    const follow = clamp((t - T[0]) / (T[5] - T[0] + 0.6)), settle = ease(span(t, T[5] + 0.2, at('L05', 0.5)));
    let camX = lerp(SEALS[0].x, SEALS[5].x, ease(follow)); camX = lerp(camX, SEALS[6].x, settle);
    let hit = 0; for (const ti of T) { const d = t - ti - 0.08; if (d > 0) hit += Math.exp(-d * 18) * (d < 0.4 ? 1 : 0); }
    const [sx, sy] = K.shake(t * 4, 10 * hit, 1361);
    const zin = ease(span(t, at('L05', 0.5), sh.b + 0.4));
    const c = { x: camX - W / 2 + sx, y: lerp(0, 40, zin) + sy, z: lerp(1.25, 1.75, zin) };
    // the candle gutters on "keepers of the First-Born", and a great wing's shadow crosses the page
    const gut = win(t, at('L05', 0.6), sh.b + 1, 0.3, 1.0), I = (1 - 0.6 * gut) * flick(t, 5, gut > 0.1 ? 22 : 9);
    x.fillStyle = '#0e0906'; x.fillRect(0, 0, W, H);
    view(x, c, 1);
    // the table, the foot of the decree, the ribbons
    x.fillStyle = '#20150d'; x.fillRect(-400, -400, 3200, 2000);
    x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 3; for (let k = 0; k < 40; k++) { x.beginPath(); x.moveTo(-400, -300 + k * 50); x.bezierCurveTo(600, -280 + k * 50, 1600, -320 + k * 50, 2800, -300 + k * 50); x.stroke(); } x.restore();
    x.drawImage(decreePage(), 0, 0, DEC.w, 360, 120, 120, 2200, 360 * 2200 / DEC.w);
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(120, 120 + 360 * 2200 / DEC.w, 2200, 12);
    SEALS.forEach((s, i) => {
      const col = hexc(s.house.field);
      x.fillStyle = rgbs(mix(col, [20, 14, 10], 0.25)); x.beginPath(); x.moveTo(s.x - 26, 520); x.lineTo(s.x + 26, 520); x.quadraticCurveTo(s.x + 34, 700, s.x + 22 + (i % 2 ? 10 : -6), 860); x.lineTo(s.x - 22 + (i % 2 ? 10 : -6), 860); x.quadraticCurveTo(s.x - 34, 700, s.x - 26, 520); x.closePath(); x.fill();
      x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(s.x - 26, 520, 52, 10);
      x.fillStyle = '#0a0604'; x.fillRect(s.x - 30, 512, 60, 8);
      if (i < 6) {
        const ti = T[i]; if (t < ti - 0.14) return;
        const drop = smooth(span(t, ti - 0.14, ti)), p = smooth(span(t, ti + 0.04, ti + 0.1));
        // the signet's shadow comes down, then lifts away
        const sd = win(t, ti - 0.06, ti + 0.22, 0.08, 0.12);
        waxDisc(x, s.x, s.y, 66 * (0.3 + 0.7 * drop), s.house, p, t);
        if (sd > 0) { x.save(); x.globalAlpha = 0.5 * sd; x.fillStyle = '#000'; x.filter = 'blur(10px)'; x.beginPath(); x.ellipse(s.x + 30 * (1 - sd), s.y + 20 * (1 - sd), 90, 80, 0, 0, TAU); x.fill(); x.restore(); }
      } else {
        // the seventh place: Sorn's ribbon, bare; the faint ring where a seal should be
        x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = 'rgba(40,20,40,0.35)'; x.setLineDash([6, 8]); x.lineWidth = 2; x.beginPath(); x.arc(s.x, s.y, 64, 0, TAU); x.stroke(); x.restore();
      }
    });
    // the wing's shadow
    const ws = span(t, at('L05', 0.62), at('L05', 0.86));
    if (ws > 0 && ws < 1) { x.save(); x.globalAlpha = 0.55 * Math.sin(ws * Math.PI); x.filter = 'blur(18px)'; wing(x, { x: lerp(SEALS[6].x + 900, SEALS[6].x - 1300, ws), y: 300, s: 1400, rot: 0.3, mirror: true, col: '#000' }); x.restore(); }
    x.setTransform(1, 0, 0, 1, 0, 0);
    // candlelight from above left; the candle itself at the corner of the frame
    x.save(); x.globalCompositeOperation = 'multiply'; const g = x.createRadialGradient(260, 120, 40, 700, 500, 1500 * (0.7 + 0.3 * I)); g.addColorStop(0, `rgb(${255 * I | 0},${232 * I | 0},${196 * I | 0})`); g.addColorStop(0.45, `rgb(${170 * I | 0},${118 * I | 0},${76 * I | 0})`); g.addColorStop(1, 'rgb(14,9,6)'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore();
    x.fillStyle = '#cfc2a4'; x.fillRect(160, -10, 54, 150); x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(196, -10, 18, 150);
    candleFlame(x, 187, -6, 36, t, 6, (0.5 + 0.5 * I), gut * Math.sin(t * 7) * 0.8);
    finish(x, { bloom: 0.3, vig: 0.7, tooth: 0.06 });
  }

  // ================================================================ the cut: shots keyed to the narration (and the pauses inside it)
  const TODO = id => (x) => { x.fillStyle = '#101010'; x.fillRect(0, 0, W, H); K.text(x, id, W / 2, H / 2, '500 40px Cinzel', '#555', 4); };
  let EDL = null;
  function edl(sc) {
    if (EDL) return EDL;
    const c = K.cue, L01 = c('L01'), L02 = c('L02'), L05 = c('L05'), L06 = c('L06'), L07 = c('L07'), L08 = c('L08'), L09 = c('L09'), L9a = c('L09a'), L10 = c('L10');
    const D = d => ({ kind: 'dissolve', d });
    const shots = [
      { id: 'book', a: sc.start, draw: shotBook },
      { id: 'crown', a: L01.start - 0.2, draw: shotPageCrown },
      { id: 'shatter', a: at('L01', 0.128), draw: shotPageShatter },
      { id: 'rulers', a: at('L01', 0.353), draw: shotPageRulers },
      { id: 'pwing', a: at('L01', 0.512), draw: shotPageWing },
      { id: 'halls', a: at('L01', 0.671), draw: shotPageHalls },
      { id: 'pthrone', a: at('L01', 0.83), draw: shotPageThrone },
      { id: 'slam', a: L02.start - 0.18, draw: shotSlam },
      { id: 'window', a: L02.end - 0.25, draw: shotWindow },
      { id: 'decree', a: at('L03', 0.5), draw: shotDecree, tin: D(0.35) },
      { id: 'seals', a: L05.start - 0.3, draw: shotSeals, tin: D(0.3) },
      { id: 'rookery', a: L06.start - 0.25, draw: typeof shotRookery === 'function' ? shotRookery : TODO('rookery'), tin: D(0.3) },
      { id: 'wingsky', a: L07.start - 0.05, draw: typeof shotWingSky === 'function' ? shotWingSky : TODO('wingsky') },
      { id: 'lookup', a: L07.start + 2.2, draw: typeof shotLookup === 'function' ? shotLookup : TODO('lookup') },
      { id: 'shadow', a: L08.start - 0.1, draw: typeof shotShadow === 'function' ? shotShadow : TODO('shadow') },
      { id: 'spill', a: L08.end - 0.05, draw: typeof shotSpill === 'function' ? shotSpill : TODO('spill') },
      { id: 'dawn', a: L09.start - 0.25, draw: typeof shotDawn === 'function' ? shotDawn : TODO('dawn'), tin: D(0.8) },
      { id: 'ledger', a: at('L09', 0.3), draw: typeof shotLedger === 'function' ? shotLedger : TODO('ledger'), tin: D(0.25) },
      { id: 'blood', a: L9a.start - 0.25, draw: typeof shotBlood === 'function' ? shotBlood : TODO('blood'), tin: D(0.4) },
      { id: 'drink', a: at('L09a', 0.33), draw: typeof shotDrink === 'function' ? shotDrink : TODO('drink'), tin: D(0.25) },
      { id: 'veins', a: at('L09a', 0.54), draw: typeof shotVeins === 'function' ? shotVeins : TODO('veins') },
      { id: 'land', a: at('L09a', 0.72), draw: typeof shotLand === 'function' ? shotLand : TODO('land'), tin: D(0.2) },
      { id: 'feast', a: at('L09a', 0.86), draw: typeof shotFeast === 'function' ? shotFeast : TODO('feast'), tin: D(0.3) },
      { id: 'ledger2', a: L10.start - 0.15, draw: typeof shotLedger2 === 'function' ? shotLedger2 : TODO('ledger2'), tin: D(0.35) },
      { id: 'bundle', a: at('L10', 0.5), draw: typeof shotBundle === 'function' ? shotBundle : TODO('bundle') },
    ];
    for (let i = 0; i < shots.length; i++) shots[i].b = i + 1 < shots.length ? shots[i + 1].a : sc.end + 2.5;
    EDL = shots; return EDL;
  }

  SCENES[1] = {
    join: 'dissolve', joinDur: 1.6,
    lib: LIB,
    draw(ctx, t, sc) {
      t = clamp(t, sc.start, sc.end + 2.5);
      cleanState(ctx);
      runEdit(ctx, t, edl(sc), 's1');
    },
  };
})();
