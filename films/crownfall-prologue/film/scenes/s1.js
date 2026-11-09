/* Scene 1: The Broken Seal [L01–L10, with D01 and A01, and the curse, L09a].
   The chronicle open by candlelight, riffling; a speed run through what the opening told (the crown on its dais and its
   breaking, the rulers reaching for the empty seat, a First-Born's wing over burning roofs, seven fires at seven halls,
   seven banners about the Blood-Throne); the book slams shut. Then the part it left out: the capital through Oswyn's
   window and Oswyn at it; the old law struck through; six seals pressed and the seventh place bare as the candle gutters;
   the rookery's bells and its birds; the Sorn rider on the First-Born against the moon ("Varrath-ath vaha-esh!
   Searyn-esh!") and the dive; the fall on the city and the city looking up; the knife told as a shadow on the wall
   ("Taesa, cyning"), with a cutaway to the burning city where no one was watching; vermilion across the decree; at dawn
   a scribe strikes the names; the curse: his blood drunk by the stone, red veins rooting through the chamber, up the
   walls and the Blood-Throne, out across the land, and under the feet of the six lords who never knew; then the
   infant's struck name, and a match cut to the bundle in the dark, alive.
   Every shot is keyed to the cues (and to the pauses inside the takes); nothing reads the clock. The helpers in the
   first part are shared with scene 2 through SCENES[1].lib (veinTree / drawVeins draw the curse's red veins, for any
   scene that brings them back). */
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
          cur += ((K.noise(D * 0.01, id * 3.7, seed) - 0.5) * 0.7 + (r() - 0.5) * 0.4) * (o.wiggle != null ? o.wiggle : 1);
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
  // quillHand(x, tx, ty, o): the nib at (tx, ty). Drawn with the quill upright (nib at 0,0, the feather up), the hand to its
  //   right, the forearm and sleeve running off along +x; then turned by o.ang (+ leans the feather right, the arm down).
  //   o.scale, o.skin, o.sleeve, o.trim (cuff), o.lit (0..1 light from the upper left), o.old, o.shadow (all one dark fill)
  function quillHand(x, tx, ty, o = {}) {
    const s = o.scale || 1, a = o.ang != null ? o.ang : 0.5, skin = o.skin || [196, 150, 112], lit = o.lit != null ? o.lit : 1, shd = !!o.shadow;
    const sh = mix(skin, [30, 18, 12], 0.62), sk = mix(sh, skin, lit), dark = 'rgba(0,0,0,1)';
    x.save(); x.translate(tx, ty); x.rotate(a); x.scale(s, s); x.lineCap = 'round'; x.lineJoin = 'round';
    // the feather, the shaft, the cut nib
    x.fillStyle = shd ? dark : 'rgb(222,214,198)';
    x.beginPath(); x.moveTo(0, -150); x.bezierCurveTo(-36, -220, -32, -330, -6, -410); x.lineTo(0, -408); x.lineTo(2, -150); x.closePath(); x.fill();
    if (!shd) x.fillStyle = 'rgb(176,166,148)'; x.beginPath(); x.moveTo(1, -160); x.bezierCurveTo(22, -230, 20, -330, 2, -408); x.lineTo(0, -160); x.closePath(); x.fill();
    if (!shd) { x.strokeStyle = 'rgba(90,80,66,0.45)'; x.lineWidth = 0.8; for (let k = 0; k < 18; k++) { const y0 = -168 - k * 13; x.beginPath(); x.moveTo(0, y0); x.lineTo(-22 + Math.abs(k - 9) * 1.4, y0 - 16); x.stroke(); x.beginPath(); x.moveTo(0, y0); x.lineTo(15 - Math.abs(k - 9) * 0.9, y0 - 12); x.stroke(); } }
    x.strokeStyle = shd ? dark : '#ebe3cf'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, -6); x.lineTo(0, -410); x.stroke();
    x.fillStyle = shd ? dark : '#24180e'; x.beginPath(); x.moveTo(-3, -16); x.lineTo(0, 0); x.lineTo(3, -16); x.closePath(); x.fill();
    // the sleeve, along the forearm
    const sl = o.sleeve || [60, 22, 18];
    if (shd) x.fillStyle = dark; else { const g = x.createLinearGradient(0, -120, 0, 130); g.addColorStop(0, rgbs(mix(sl, [255, 240, 220], 0.12 * lit))); g.addColorStop(0.5, rgbs(sl)); g.addColorStop(1, rgbs(mix(sl, [0, 0, 0], 0.6))); x.fillStyle = g; }
    x.beginPath(); x.moveTo(150, -78); x.bezierCurveTo(260, -110, 380, -130, 520, -150); x.lineTo(540, 150); x.bezierCurveTo(400, 120, 260, 70, 150, 34); x.closePath(); x.fill();
    if (o.trim && !shd) { x.strokeStyle = rgbs(o.trim); x.lineWidth = 10; x.beginPath(); x.moveTo(156, -80); x.quadraticCurveTo(144, -20, 156, 36); x.stroke(); }
    // the back of the hand
    let hg = dark;
    if (!shd) { hg = x.createLinearGradient(20, -100, 140, 40); hg.addColorStop(0, rgbs(sk)); hg.addColorStop(0.55, rgbs(mix(sk, sh, 0.4))); hg.addColorStop(1, rgbs(sh)); }
    x.fillStyle = hg;
    x.beginPath(); x.moveTo(10, -62); x.bezierCurveTo(30, -88, 70, -100, 110, -92); x.bezierCurveTo(134, -86, 152, -72, 160, -60); x.lineTo(160, 26); x.bezierCurveTo(130, 36, 90, 38, 56, 26); x.bezierCurveTo(30, 18, 14, 0, 10, -20); x.closePath(); x.fill();
    // the curled fingers under it, the index along the shaft, the thumb across it
    for (const [fx, fy, rr] of [[34, 14, 15], [58, 26, 15], [84, 32, 14]]) { x.beginPath(); x.ellipse(fx, fy, rr, rr * 0.8, 0.3, 0, TAU); x.fill(); }
    x.fillStyle = hg; taper(x, [[96, -84], [40, -60], [10, -36], [3, -24]], o.old ? 15 : 18, o.old ? 10 : 12);
    taper(x, [[70, -96], [30, -84], [-4, -64]], o.old ? 16 : 19, o.old ? 11 : 13);
    if (!shd) {
      x.strokeStyle = rgbs(mix(sh, [0, 0, 0], 0.4), 0.55); x.lineWidth = 1.3;
      x.beginPath(); x.moveTo(12, -40); x.bezierCurveTo(40, -62, 70, -74, 96, -80); x.stroke();
      x.beginPath(); x.moveTo(-2, -64); x.bezierCurveTo(24, -80, 50, -90, 72, -94); x.stroke();
      if (o.old) { x.strokeStyle = rgbs(sh, 0.6); for (const [kx, ky] of [[110, -70], [122, -50], [128, -28]]) { x.beginPath(); x.arc(kx, ky, 7, -0.5, 1.5); x.stroke(); } x.strokeStyle = rgbs(mix(sk, [80, 90, 120], 0.3), 0.5); x.beginPath(); x.moveTo(150, -40); x.bezierCurveTo(130, -30, 120, -10, 108, 6); x.stroke(); }
      x.fillStyle = rgbs([255, 240, 220], 0.12 * lit); x.beginPath(); x.ellipse(70, -80, 40, 8, -0.2, 0, TAU); x.fill();
    }
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
    const dk = (key, img, f) => dawn ? K.cached('s1:dawn:' + key, () => { const cc = K.canvas(img.width, img.height), cx = cc.getContext('2d'); cx.filter = f; cx.drawImage(img, 0, 0); return cc; }) : img;
    const g = x.createLinearGradient(0, 0, 0, H);
    if (dawn > 0) { g.addColorStop(0, '#6a6e78'); g.addColorStop(0.55, '#a4a29c'); g.addColorStop(1, '#8a8780'); }
    else { g.addColorStop(0, '#07080e'); g.addColorStop(0.45, '#141726'); g.addColorStop(0.7, '#2a2230'); g.addColorStop(1, '#141420'); }
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    view(x, c, 0.06);
    if (!dawn) { moonDisc(x, 560, 150, 46); fog(x, 1165, [52, 48, 66], -60, 300, t * 14, 0.6); fog(x, 1166, [80, 44, 40], 170, 260, -t * 10 + 300, 0.45); }
    else fog(x, 1165, [150, 150, 150], 0, 360, t * 10, 0.5);
    const V = volcanoImg();
    view(x, c, 0.22); x.drawImage(dk('volc', V.c, 'grayscale(0.9) brightness(2.6) contrast(0.6)'), 1380 - V.cx, 270 - V.top, V.c.width, V.c.height);
    if (!dawn) { const vf = flick(t, 4, 1.2); glow(x, [255, 96, 36], 1380, 300, 420, 0.35 * vf); glow(x, [255, 170, 90], 1380, 290, 90, 0.5 * vf); }
    K.smoke(x, t, { n: 12, x: 1180, y: -420, w: 360, h: 720, color: dawn ? [120, 116, 112] : [60, 30, 26], alpha: 0.35, rise: 12, size: 320, seed: 1152, drift: -8 });
    if (!dawn) for (let i = 0; i < 3; i++) { const a = t * (0.32 + i * 0.07) + i * 2.1, rx = 300 + i * 90, gx = 1380 + Math.cos(a) * rx, gy = 150 + Math.sin(a) * rx * 0.22 - i * 30; glider(x, gx, gy, 26 - i * 4 + 6 * Math.sin(a), Math.sin(a) > 0 ? Math.PI + 0.1 : -0.1, t * 2.4 + i, `rgba(8,6,10,${0.9 - i * 0.15})`); }
    view(x, c, 0.35);
    x.fillStyle = dawn ? '#6e6c6a' : '#1a1c2a'; x.beginPath(); x.moveTo(-300, 760); for (let X = -300; X <= W + 400; X += 20) x.lineTo(X, 600 - 50 * K.fbm(X * 0.003, 1, 4, 1170) + 20 * Math.sin(X * 0.002)); x.lineTo(W + 400, 1000); x.lineTo(-300, 1000); x.closePath(); x.fill();
    fog(x, 1171, dawn ? [150, 148, 144] : [44, 46, 64], 520, 200, t * 8, 0.7);
    view(x, c, 0.5); x.drawImage(dk('far', CITY.far(), 'grayscale(0.85) brightness(2.1)'), -240, 380);
    if (!dawn) rookerySmall(x, 250, 660, 0.9);
    fog(x, 1172, dawn ? [140, 138, 134] : [40, 42, 60], 610, 160, -t * 12, 0.65);
    view(x, c, 0.7); const CM = CITY.mid(); x.drawImage(dk('mid', CM, 'grayscale(0.85) brightness(1.6)'), -340, 360);
    if (!dawn) {
      // the High Seat's tower, its lit window
      x.fillStyle = '#0e1019'; x.fillRect(1250 - 340 - 48, 40 + 360 - 360, 96, 400); x.beginPath(); x.moveTo(1250 - 340 - 52, 40); x.lineTo(1250 - 340, 40 - 210); x.lineTo(1250 - 340 + 52, 40); x.closePath(); x.fill();
      x.fillStyle = 'rgba(120,136,170,0.55)'; x.fillRect(1250 - 340 - 48, 40, 4, 400);
      x.fillStyle = '#ffb868'; x.fillRect(1250 - 340 - 12, 90, 24, 40); glow(x, [255, 170, 90], 1250 - 340, 110, 60, 0.5 * flick(t, 9, 2));
      for (const [lx, ly, s] of CM.lights) if (s > 0.85) glow(x, [255, 170, 90], lx - 340, ly + 360, 22, 0.25 * flick(t, lx, 2));
    }
    if (o.fire) for (let k = 0; k < 9; k++) { const fx = 120 + k * 210 + (k * 37 % 50), fy = 700 + (k % 3) * 40; fire(x, fx, fy, 60 + (k % 2) * 30, (140 + (k % 3) * 60) * o.fire, t, k + 30, { slot: 'c' + (k % 3), n: 5 }); glow(x, [255, 110, 40], fx, fy - 60, 260, 0.25 * o.fire); }
    fog(x, 1173, dawn ? [130, 128, 124] : [34, 36, 52], 760, 220, t * 16, 0.7);
    view(x, c, 1.05); x.drawImage(dk('near', CITY.near(), 'grayscale(0.8) brightness(1.2)'), -440, 830);
    if (dawn) for (let k = 0; k < 5; k++) K.smoke(x, t, { n: 7, x: 200 + k * 360, y: -200, w: 160, h: 900, color: [70, 68, 66], alpha: 0.45 * dawn, rise: 20, size: 260, seed: 1180 + k, drift: 10 });
    x.setTransform(1, 0, 0, 1, 0, 0);
  }

  // softDraw(x, fn, blur, alpha, mode): draw fn() at quarter resolution under x's transform, blurred, and lay it back over
  //   x (a soft shadow or glow without blurring the whole frame)
  function softDraw(x, fn, blur = 4, alpha = 1, mode = 'source-over') {
    const L = scratch('s12:soft', W / 4, H / 4), lc = L.getContext('2d'), m = x.getTransform();
    lc.setTransform(m.a / 4, m.b / 4, m.c / 4, m.d / 4, m.e / 4, m.f / 4); fn(lc);
    const B = scratch('s12:softB', W / 4, H / 4), bc = B.getContext('2d'); bc.filter = `blur(${blur}px)`; bc.drawImage(L, 0, 0);
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha *= alpha; x.globalCompositeOperation = mode; x.imageSmoothingQuality = 'medium'; x.drawImage(B, 0, 0, W, H); x.restore();
  }
  const LIB = { softDraw, TAU, rgbs, mix, hexc, fract, flick, cleanState, scratch, view, proj, glowImg, glow, tinted, taper, flame, candleFlame, fire, rimLit, bloom, fogTex, fog, vignetteImg, finish, person, wingPts, wing, glider, scriptLine, drawScript, scriptTip, runEdit, at, veinTree, drawVeins, v3, cam3, toCam, p3, path3, frame3, extrude, drawFaces, quillHand, moonDisc, capital };

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
      x.save(); x.globalCompositeOperation = 'multiply'; for (let k = 0; k < 9; k++) { const gx = r() * W, gy = 120 + r() * 520, R = 260 + r() * 340, g = x.createRadialGradient(gx, gy, 0, gx, gy, R); g.addColorStop(0, K.rgba(P.inkBlue, 0.32)); g.addColorStop(1, K.rgba(P.inkBlue, 0)); x.fillStyle = g; x.fillRect(gx - R, gy - R, 2 * R, 2 * R); } x.restore();
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
      wing(c, { x: lerp(1500, 520, u), y: lerp(120, 260, u), s: 1100, rot: lerp(0.5, -0.05, u), mirror: true, flap: lerp(0.5, -0.3, u), col: INK(0.95), membA: 0.62, curl: 0.16 });
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
    const col = o.col || '#2a0c09';
    x.save(); x.translate(cx, fy); x.scale(h, h); x.fillStyle = col;
    // the robe, falling heavy to the floor, a little train
    x.beginPath(); x.moveTo(-0.055, -0.858); x.quadraticCurveTo(-0.13, -0.85, -0.165, -0.8); x.bezierCurveTo(-0.19, -0.7, -0.17, -0.45, -0.2, -0.2); x.quadraticCurveTo(-0.22, -0.06, -0.26, 0.005);
    x.quadraticCurveTo(0, 0.02, 0.27, 0.005); x.quadraticCurveTo(0.225, -0.06, 0.205, -0.2); x.bezierCurveTo(0.175, -0.45, 0.195, -0.7, 0.17, -0.8); x.quadraticCurveTo(0.135, -0.85, 0.055, -0.858); x.closePath(); x.fill();
    // a mantle over the shoulders, its hem in a shallow curve
    x.beginPath(); x.moveTo(-0.06, -0.865); x.quadraticCurveTo(-0.16, -0.86, -0.19, -0.79); x.quadraticCurveTo(-0.205, -0.7, -0.19, -0.62); x.quadraticCurveTo(0, -0.57, 0.19, -0.62); x.quadraticCurveTo(0.205, -0.7, 0.19, -0.79); x.quadraticCurveTo(0.16, -0.86, 0.06, -0.865); x.closePath(); x.fill();
    // the neck, the head, the ears
    x.fillRect(-0.03, -0.885, 0.06, 0.04);
    x.beginPath(); x.ellipse(0, -0.918, 0.052, 0.064, 0, 0, TAU); x.fill();
    for (const sd of [-1, 1]) { x.beginPath(); x.ellipse(sd * 0.052, -0.912, 0.011, 0.02, sd * 0.2, 0, TAU); x.fill(); }
    if (o.hair) {
      // grey hair, the back of the head, cut at the nape; moonlight in it
      x.fillStyle = o.hair; x.beginPath(); x.moveTo(-0.05, -0.9); x.quadraticCurveTo(-0.06, -0.975, 0, -0.985); x.quadraticCurveTo(0.06, -0.975, 0.05, -0.9); x.quadraticCurveTo(0.046, -0.872, 0.03, -0.866); x.quadraticCurveTo(0, -0.874, -0.03, -0.866); x.quadraticCurveTo(-0.046, -0.872, -0.05, -0.9); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(190,196,210,0.35)'; x.lineWidth = 0.003; for (let k = 0; k < 9; k++) { const u = (k / 8 - 0.5) * 0.08; x.beginPath(); x.moveTo(u * 0.5, -0.982); x.quadraticCurveTo(u * 1.1, -0.93, u * 0.9, -0.872); x.stroke(); }
    }
    // folds in the robe, and the mantle's edge
    if (o.folds) { x.strokeStyle = o.folds; x.lineWidth = 0.005; for (const fx of [-0.13, -0.06, 0.02, 0.09, 0.15]) { x.beginPath(); x.moveTo(fx * 0.85, -0.6); x.quadraticCurveTo(fx * 1.15, -0.3, fx * 1.45 + 0.01, 0); x.stroke(); } x.beginPath(); x.moveTo(-0.19, -0.62); x.quadraticCurveTo(0, -0.57, 0.19, -0.62); x.stroke(); }
    if (o.device) { x.fillStyle = o.device; K.device(x, 'tower', 0, -0.71, 0.075); }
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
    const ox = 1150, oy = 1012, oh = 640;
    const OL = scratch('s1:oswyn'), ol = OL.getContext('2d'); ol.setTransform(x.getTransform());
    oswynBack(ol, ox, oy, oh, { col: '#c9d2e6' });
    ol.globalCompositeOperation = 'source-atop'; ol.save(); ol.translate(-5, 3); oswynBack(ol, ox, oy, oh, { col: '#ff9a58' }); ol.restore();
    ol.save(); ol.translate(-2, 6); ol.globalAlpha = 0.9; oswynBack(ol, ox, oy, oh, { col: '#3a120d' }); ol.restore();
    ol.save(); ol.translate(1, 9); oswynBack(ol, ox, oy, oh, { col: '#1e0907', hair: '#4c4a4a', device: 'rgba(150,118,60,0.4)', folds: 'rgba(0,0,0,0.5)' }); ol.restore();
    ol.save(); ol.globalCompositeOperation = 'source-atop'; const og = ol.createLinearGradient(ox - 200, 0, ox + 200, 0); og.addColorStop(0, 'rgba(120,40,20,0.35)'); og.addColorStop(0.5, 'rgba(0,0,0,0)'); og.addColorStop(1, 'rgba(60,70,100,0.25)'); ol.fillStyle = og; ol.fillRect(ox - 300, oy - 700, 600, 720); ol.restore();
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
      for (let k = 0; k < 17; k++) { const x0 = k < 4 ? 380 : 140, wds = scriptLine(1360 + k, DEC.w - 140 - x0 - (k % 5 === 4 ? 400 : 0), 15); drawScript(x, wds, x0, 142 + k * 46, { w: 3, col: P.ink }); }
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
    STRIKES.forEach(([a, b], i) => { const p = i ? s2 : s1; if (p <= 0) return; const pts = K.resample([a, [lerp(a[0], b[0], 0.5) + 10, lerp(a[1], b[1], 0.5) - 14], b], 8); K.ink(x, cc => K.nib(cc, pts, { w: 14, angle: -0.6, p, taper: 0.06, jit: 0.2, seed: 7 + i }), { color: '#1a100a' }); if (p > 0 && p < 1) tip = [lerp(a[0], b[0], p), lerp(a[1], b[1], p) - 14 * Math.sin(p * Math.PI)]; });
    // then a new line beneath
    const wds = scriptLine(1371, 900, 17), pw = span(t, at('L03', 0.84), L.end + 0.1);
    if (pw > 0) { drawScript(x, wds, 220, 930, { p: pw, w: 3.4, col: '#1a100a' }); if (pw < 1) { const q = scriptTip(wds, pw); tip = [220 + q[0], 930 + q[1]]; } }
    if (!tip) tip = s1 <= 0 ? [lerp(300, 280, u * 3), 330 - 40 * (1 - u * 3)] : s2 <= 0 && s1 >= 1 ? [lerp(1500, 360, smooth(span(t, at('L03', 0.66), at('L03', 0.7)))), lerp(520, 560, smooth(span(t, at('L03', 0.66), at('L03', 0.7)))) - 30] : [lerp(1480, 220, smooth(span(t, at('L03', 0.8), at('L03', 0.84)))), lerp(380, 930, smooth(span(t, at('L03', 0.8), at('L03', 0.84)))) - 20];
    // the hand's shadow, then the hand (Oswyn's: an old hand, a dark red sleeve with gold at the cuff)
    x.save(); x.globalAlpha = 0.18; quillHand(x, tip[0] + 30, tip[1] + 40, { ang: 0.5, scale: 1.15, shadow: true }); quillHand(x, tip[0] + 42, tip[1] + 52, { ang: 0.5, scale: 1.15, shadow: true }); x.restore();
    quillHand(x, tip[0], tip[1], { ang: 0.5, scale: 1.15, skin: [200, 160, 126], sleeve: [80, 18, 14], trim: [190, 150, 70], lit: 0.9 });
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
    const c = { x: camX - W / 2 + sx, y: lerp(120, 170, zin) + sy, z: lerp(1.55, 2.1, zin) };
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
        waxDisc(x, s.x, s.y, 80 * (0.3 + 0.7 * drop), s.house, p, t);
        if (sd > 0) { const gx = s.x + 30 * (1 - sd), gy = s.y + 20 * (1 - sd), gg = x.createRadialGradient(gx, gy, 10, gx, gy, 110); gg.addColorStop(0, `rgba(0,0,0,${0.6 * sd})`); gg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gg; x.fillRect(gx - 120, gy - 120, 240, 240); }
      } else {
        // the seventh place: Sorn's ribbon, bare; the faint ring where a seal should be
        x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = 'rgba(40,20,40,0.35)'; x.setLineDash([6, 8]); x.lineWidth = 2; x.beginPath(); x.arc(s.x, s.y, 64, 0, TAU); x.stroke(); x.restore();
      }
    });
    // the wing's shadow
    const ws = span(t, at('L05', 0.62), at('L05', 0.86));
    if (ws > 0 && ws < 1) softDraw(x, cc => wing(cc, { x: lerp(SEALS[6].x + 900, SEALS[6].x - 1300, ws), y: 300, s: 1400, rot: 0.3, mirror: true, col: '#000' }), 5, 0.6 * Math.sin(ws * Math.PI));
    x.setTransform(1, 0, 0, 1, 0, 0);
    // candlelight from above left; the candle itself at the corner of the frame
    x.save(); x.globalCompositeOperation = 'multiply'; const g = x.createRadialGradient(500, 200, 60, 900, 520, 1500 * (0.75 + 0.25 * I)); g.addColorStop(0, `rgb(${255 * I | 0},${236 * I | 0},${204 * I | 0})`); g.addColorStop(0.55, `rgb(${210 * I | 0},${160 * I | 0},${112 * I | 0})`); g.addColorStop(1, 'rgb(26,16,10)'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore();
    // the candle itself, near the lens and out of focus: a soft flame at the corner of the frame, guttering
    glow(x, [255, 170, 80], 150, 90, 260 * (0.6 + 0.4 * I), 0.35 * I); glow(x, [255, 220, 160], 150 + gut * Math.sin(t * 7) * 30, 90, 70 * (0.5 + 0.5 * I), 0.6 * I);
    finish(x, { bloom: 0.3, vig: 0.7, tooth: 0.06 });
  }

  // ================================================================ L06: the rookery's bells; the birds burst from it
  const ROOK = { x: 960, base: 2200, top: -160, bell: 250 };
  const rookW = y => lerp(330, 210, clamp((ROOK.base - y) / (ROOK.base - ROOK.top)));     // half-width at height y (keystone)
  function rookeryImg() {
    return K.cached('s1:rookery', () => {
      const OY = 400, c = K.canvas(800, 2800), x = c.getContext('2d'), r = rng(1401), X = v => v - (ROOK.x - 400), Y = v => v + OY;
      const body = (y0, y1) => { x.beginPath(); x.moveTo(X(ROOK.x - rookW(y1)), Y(y1)); x.lineTo(X(ROOK.x + rookW(y1)), Y(y1)); x.lineTo(X(ROOK.x + rookW(y0)), Y(y0)); x.lineTo(X(ROOK.x - rookW(y0)), Y(y0)); x.closePath(); };
      body(470, ROOK.base + 300); const g = x.createLinearGradient(X(ROOK.x - 330), 0, X(ROOK.x + 330), 0); g.addColorStop(0, '#0b0c12'); g.addColorStop(0.7, '#151824'); g.addColorStop(1, '#2a3246'); x.fillStyle = g; x.fill();
      x.save(); body(470, ROOK.base + 300); x.clip();
      for (let y = 480; y < ROOK.base + 300; y += 46) { x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(X(ROOK.x - 400), Y(y)); x.lineTo(X(ROOK.x + 400), Y(y)); x.stroke(); for (let k = 0; k < 8; k++) { const bx = ROOK.x - 330 + ((k * 90 + (y / 46 % 2) * 45) % 660); x.beginPath(); x.moveTo(X(bx), Y(y)); x.lineTo(X(bx), Y(y + 46)); x.stroke(); } }
      for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.2})`; x.fillRect(X(ROOK.x - 330 + r() * 660), Y(480 + r() * 1900), 10 + r() * 50, 4 + r() * 20); }
      for (const [sx, sy] of [[-90, 760], [100, 1100], [-40, 1450], [80, 1800]]) { x.fillStyle = '#050508'; x.fillRect(X(ROOK.x + sx - 9), Y(sy), 18, 90); }
      x.restore();
      // a cornice, the belfry, the roof
      x.fillStyle = '#0e1018'; x.fillRect(X(ROOK.x - 250), Y(440), 500, 40); x.fillRect(X(ROOK.x - 240), Y(160), 480, 30);
      x.fillStyle = '#121520'; x.fillRect(X(ROOK.x - 225), Y(190), 450, 250);
      x.fillStyle = '#04040a'; for (const ox of [-145, 0, 145]) { x.beginPath(); x.moveTo(X(ROOK.x + ox - 50), Y(430)); x.lineTo(X(ROOK.x + ox - 50), Y(260)); x.quadraticCurveTo(X(ROOK.x + ox), Y(200), X(ROOK.x + ox + 50), Y(260)); x.lineTo(X(ROOK.x + ox + 50), Y(430)); x.closePath(); x.fill(); }
      x.fillStyle = '#0c0e16'; x.beginPath(); x.moveTo(X(ROOK.x - 260), Y(165)); x.lineTo(X(ROOK.x), Y(-120)); x.lineTo(X(ROOK.x + 260), Y(165)); x.closePath(); x.fill();
      x.fillRect(X(ROOK.x - 4), Y(-200), 8, 90);
      x.strokeStyle = 'rgba(150,166,200,0.6)'; x.lineWidth = 3; x.beginPath(); x.moveTo(X(ROOK.x), Y(-120)); x.lineTo(X(ROOK.x + 260), Y(165)); x.stroke();
      x.fillStyle = 'rgba(150,166,200,0.45)'; x.fillRect(X(ROOK.x + 222), Y(190), 4, 250); x.beginPath(); x.moveTo(X(ROOK.x + rookW(470) - 6), Y(470)); x.lineTo(X(ROOK.x + rookW(2400) - 6), Y(2400)); x.lineTo(X(ROOK.x + rookW(2400)), Y(2400)); x.lineTo(X(ROOK.x + rookW(470)), Y(470)); x.fill();
      // perches with nests, and the great rings and chains of the roost
      for (const [py, side] of [[600, -1], [640, 1], [980, -1], [1020, 1]]) { const px = ROOK.x + side * (rookW(py) - 10); x.fillStyle = '#1a120c'; x.fillRect(X(Math.min(px, px + side * 160)), Y(py), 160, 14); x.fillStyle = '#0a0806'; x.beginPath(); x.ellipse(X(px + side * 110), Y(py - 6), 40, 16, 0, Math.PI, TAU); x.fill(); }
      for (const side of [-1, 1]) {
        const rx = ROOK.x + side * (rookW(1250) - 4), ry = 1250;
        x.strokeStyle = '#1c1c22'; x.lineWidth = 14; x.beginPath(); x.ellipse(X(rx + side * 30), Y(ry), 46, 60, 0, 0, TAU); x.stroke();
        x.strokeStyle = 'rgba(150,166,200,0.4)'; x.lineWidth = 3; x.beginPath(); x.ellipse(X(rx + side * 30), Y(ry), 46, 60, 0, -1.2, 0.4); x.stroke();
        for (let k = 0; k < 22; k++) { const u = k / 21, lx = rx + side * (60 + u * 420), ly = ry + 50 + Math.sin(u * Math.PI) * 220 + u * 260; x.strokeStyle = '#17171c'; x.lineWidth = 9; x.beginPath(); x.ellipse(X(lx), Y(ly), k % 2 ? 9 : 22, k % 2 ? 22 : 12, side * (0.5 + u), 0, TAU); x.stroke(); }
      }
      return { c, OY };
    });
  }
  function bell(x, px, py, s, ang, col) {
    x.save(); x.translate(px, py); x.rotate(ang);
    x.fillStyle = '#0a0806'; x.fillRect(-s * 0.08, -s * 0.12, s * 0.16, s * 0.14);
    const g = x.createLinearGradient(-s * 0.5, 0, s * 0.5, 0); g.addColorStop(0, '#2a1a0c'); g.addColorStop(0.65, col); g.addColorStop(1, '#3a2410');
    x.fillStyle = g; x.beginPath(); x.moveTo(-s * 0.2, 0); x.quadraticCurveTo(-s * 0.26, s * 0.5, -s * 0.48, s * 0.9); x.lineTo(s * 0.48, s * 0.9); x.quadraticCurveTo(s * 0.26, s * 0.5, s * 0.2, 0); x.closePath(); x.fill();
    x.fillStyle = '#0a0604'; x.beginPath(); x.ellipse(Math.sin(-ang) * s * 0.18, s * 0.95, s * 0.07, s * 0.09, 0, 0, TAU); x.fill();
    x.restore();
  }
  // a rook: two strokes of wing and a body; flap is the beat
  function rook(x, px, py, s, flap, ang = 0) {
    const w = Math.sin(flap) * 0.9;
    x.save(); x.translate(px, py); x.rotate(ang); x.beginPath();
    x.moveTo(-s, -w * s * 0.8); x.quadraticCurveTo(-s * 0.4, -s * 0.2 - w * s * 0.3, 0, 0); x.quadraticCurveTo(s * 0.4, -s * 0.2 - w * s * 0.3, s, -w * s * 0.8);
    x.quadraticCurveTo(s * 0.45, s * 0.05 - w * s * 0.2, 0, s * 0.22); x.quadraticCurveTo(-s * 0.45, s * 0.05 - w * s * 0.2, -s, -w * s * 0.8); x.fill();
    x.restore();
  }
  function shotRookery(x, t, sh) {
    const L6 = K.cue('L06'), u = span(t, sh.a, sh.b), t0 = at('L06', 0.66), burst = L6.end - 0.95;
    const swing = smooth(span(t, t0, t0 + 0.9)), per = 1.3;
    let hit = 0; if (t > t0) { const n = Math.floor((t - t0) / (per / 2)); const dt = (t - t0) - n * per / 2; hit = swing * Math.exp(-dt * 7); }
    const [sx, sy] = K.shake(t * 5, 9 * hit, 1411);
    const c = { x: sx, y: lerp(980, 60, ease(u)) + sy, z: lerp(1.0, 1.12, u) };
    // night sky and cloud, the moon behind the tower's shoulder
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a0e18'); g.addColorStop(1, '#2a3248'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    view(x, c, 0.18); moonDisc(x, 1420, 300, 80); glow(x, [120, 140, 190], 1300, 360, 900, 0.25);
    fog(x, 1412, [70, 78, 100], 160, 300, t * 18, 0.55); fog(x, 1413, [40, 46, 62], 420, 360, -t * 12, 0.6);
    view(x, c, 1);
    const R = rookeryImg(); x.drawImage(R.c, ROOK.x - 400, -R.OY);
    // the bells
    for (const [ox, ph, s] of [[-145, 0.0, 120], [0, 1.1, 140], [145, 2.0, 120]]) bell(x, ROOK.x + ox, ROOK.bell, s, swing * 0.6 * Math.sin((t - t0) / per * TAU + ph), '#9a6a30');
    // the toll made visible: rings of shaken air, dust and snow shaken from the ledges
    if (t > t0) for (let k = 0; k < 8; k++) { const tk = t0 + k * per / 2, a = t - tk; if (a < 0 || a > 1.4) continue; x.strokeStyle = `rgba(190,200,230,${0.22 * (1 - a / 1.4) * swing})`; x.lineWidth = 3 + a * 6; x.beginPath(); x.ellipse(ROOK.x, ROOK.bell + 80, 120 + a * 900, 60 + a * 500, 0, 0, TAU); x.stroke(); }
    if (t > t0) { x.save(); const r = rng(1414); for (let i = 0; i < 90; i++) { const sx2 = ROOK.x + (r() - 0.5) * 520, y0 = 160 + r() * 900, sp = 200 + r() * 300, a = ((t - t0) * sp + r() * 600) % 900; x.fillStyle = `rgba(210,214,224,${0.5 * swing * (1 - a / 900)})`; x.fillRect(sx2 + Math.sin(t + i) * 6, y0 + a, 2, 2); } x.restore(); }
    // the birds burst out of the belfry and the perches
    if (t > burst) {
      const r = rng(1415); x.fillStyle = '#05050a';
      for (let i = 0; i < 130; i++) {
        const st = burst + r() * 0.7, a = t - st; if (a < 0) { r(); r(); r(); r(); continue; }
        const ang = -Math.PI / 2 + (r() - 0.5) * 2.8, sp = 300 + r() * 500, ox = (r() - 0.5) * 400, oy = 220 + r() * 800, s0 = 15 + r() * 16;
        const zoom = 1 + a * (0.4 + r() * 1.2);
        x.save(); x.translate(ROOK.x + ox + Math.cos(ang) * sp * a, oy + Math.sin(ang) * sp * a - a * a * 60); rook(x, 0, 0, s0 * zoom, t * (14 + i % 5) + i, Math.cos(ang) * 0.3); x.restore();
      }
    }
    x.setTransform(1, 0, 0, 1, 0, 0);
    finish(x, { bloom: 0.35, vig: 0.7, shadow: '#26304a', shadowA: 0.35 });
  }

  // ================================================================ D01: the Sorn rider on the First-Born, against the moon
  // A small armoured shape on the beast's neck. On "vaha-esh!" he throws his arm down at the city; on "Searyn-esh!" the
  // beast folds its wings and tips into the dive. The beast is drawn here in side view: neck, horned head, gold eye.
  function beastSide(x, o) {
    // local units: the shoulder at (0, 0), facing +x, ~1 unit = 1 px at s = 1. o.s scale, o.face, o.flap (beat), o.fold (0..1),
    // o.col, o.rider (pose 0..1 arm thrown), o.t
    const s = o.s || 1, f = o.face || 1, fold = o.fold || 0, t = o.t || 0, col = o.col || '#06060a', fl = o.flap || 0;
    x.save(); x.translate(o.x, o.y); x.rotate(o.rot || 0); x.scale(f * s, s); x.fillStyle = col; x.strokeStyle = col; x.lineCap = 'round'; x.lineJoin = 'round';
    // the far wing, behind
    x.save(); wing(x, { x: 30, y: -40, s: 470 * (1 - fold * 0.45), rot: -1.75 - fl * 0.5 + fold * 1.25, squash: -0.6, col, curl: 0.16, flap: 0 }); x.restore();
    // tail with a slow wave, ending in a spade
    const tw = k => Math.sin(t * 2.2 - k * 2.5) * 30 * k;
    const tail = []; for (let k = 0; k <= 10; k++) { const u = k / 10; tail.push([-240 - u * 560, 20 + tw(u) + u * 40 - fold * u * 120]); }
    taper(x, tail, 78, 8);
    const tp = tail[10]; x.beginPath(); x.moveTo(tp[0] + 10, tp[1]); x.lineTo(tp[0] - 40, tp[1] - 28); x.lineTo(tp[0] - 70, tp[1] + 6); x.lineTo(tp[0] - 36, tp[1] + 30); x.closePath(); x.fill();
    // the body, the hind leg tucked
    x.beginPath(); x.moveTo(40, -40); x.bezierCurveTo(-60, -80, -200, -60, -270, -10); x.bezierCurveTo(-280, 40, -200, 80, -100, 75); x.bezierCurveTo(-20, 70, 50, 40, 60, 0); x.closePath(); x.fill();
    taper(x, [[-200, 50], [-150, 120], [-210, 160]], 46, 22); taper(x, [[-210, 160], [-150, 175]], 18, 8);
    taper(x, [[20, 40], [50, 100], [10, 130]], 30, 14);
    // spines along the back
    for (let k = 0; k < 9; k++) { const u = k / 8, px = lerp(30, -260, u), py = lerp(-58, -30, u) - Math.sin(u * Math.PI) * 18; x.beginPath(); x.moveTo(px - 10, py + 4); x.lineTo(px - 4, py - 24 + u * 8); x.lineTo(px + 8, py + 4); x.closePath(); x.fill(); }
    // the neck, curving up to the head
    const nk = [[40, -20], [110, -70 + fold * 40], [170, -130 + fold * 90], [230, -160 + fold * 140]];
    taper(x, nk, 92, 46);
    const hx = nk[3][0], hy = nk[3][1];
    x.save(); x.translate(hx, hy); x.rotate(0.25 + fold * 0.55);
    x.beginPath(); x.moveTo(-20, -24); x.bezierCurveTo(30, -40, 90, -26, 140, -6); x.lineTo(150, 4); x.bezierCurveTo(110, 8, 70, 20, 40, 34); x.bezierCurveTo(10, 40, -20, 30, -30, 10); x.closePath(); x.fill();
    taper(x, [[10, -28], [-50, -70], [-120, -80]], 18, 3); taper(x, [[30, -24], [-20, -80], [-80, -110]], 14, 2);
    x.beginPath(); x.moveTo(40, 30); x.lineTo(130, 14); x.lineTo(60, 44); x.closePath(); x.fill();
    if (o.eye !== false) { x.fillStyle = '#e8b048'; x.beginPath(); x.ellipse(52, -10, 8, 5, 0.1, 0, TAU); x.fill(); x.fillStyle = '#000'; x.fillRect(51, -14, 2.5, 8); }
    x.restore();
    // the near wing
    x.fillStyle = col;
    wing(x, { x: -20, y: -46, s: 520 * (1 - fold * 0.4), rot: -2.05 - fl * 0.6 + fold * 1.3, squash: -1, col, curl: 0.14, flap: 0, seed: 3 });
    // the rider, astride the root of the neck: helm, cloak streaming, the arm thrown down at the city
    if (o.rider != null) {
      const arm = o.rider, ry = -78;
      x.save(); x.translate(60, ry + 10); x.scale(1.55, 1.55); x.translate(-60, -(ry + 10));
      const sh = [56, ry - 50];
      x.beginPath(); x.moveTo(sh[0] - 6, sh[1]); x.quadraticCurveTo(sh[0] - 60, sh[1] + 10 + Math.sin(t * 9) * 6, sh[0] - 110, sh[1] + 30 + Math.sin(t * 7) * 10); x.lineTo(sh[0] - 70, sh[1] + 46); x.lineTo(sh[0] - 4, sh[1] + 40); x.closePath(); x.fill();
      taper(x, [[44, ry + 10], [56, ry - 50]], 34, 30);
      x.beginPath(); x.ellipse(60, ry - 66, 13, 15, 0, 0, TAU); x.fill();
      x.beginPath(); x.moveTo(46, ry - 70); x.quadraticCurveTo(58, ry - 98, 74, ry - 72); x.closePath(); x.fill();
      taper(x, [[30, ry + 6], [70, ry + 28], [64, ry + 54]], 16, 10);
      const a1 = lerp(-2.4, 0.9, arm), a2 = a1 + lerp(0.5, 0.15, arm), e = [sh[0] + Math.cos(a1) * 36, sh[1] + Math.sin(a1) * 36], w2 = [e[0] + Math.cos(a2) * 34, e[1] + Math.sin(a2) * 34];
      taper(x, [sh, e, w2], 12, 8);
      x.restore();
    }
    x.restore();
  }
  // beastBelow(x, o): the First-Born from beneath: wings spread with their fingers, the long neck and horned head, the
  //   tail; o.s is about the length of one wing. o.flap (beat), o.col, o.t
  function beastBelow(x, o) {
    const s = o.s, col = o.col || '#050508', fl = o.flap || 0, t = o.t || 0;
    x.save(); x.translate(o.x, o.y); x.rotate(o.rot || 0); x.fillStyle = col;
    const sq = 0.8 + 0.2 * Math.cos(fl);
    wing(x, { x: -0.02 * s, y: 0.05 * s, s: s * sq, rot: Math.PI / 2 + 0.3, col, curl: 0.15, membA: o.membA, back: o.back, backA: o.backA, backX: o.backX, backY: o.backY, backR: o.backR, seed: 4 });
    wing(x, { x: -0.02 * s, y: -0.05 * s, s: s * sq, rot: -Math.PI / 2 - 0.3, squash: -1, col, curl: 0.15, membA: o.membA, seed: 5 });
    x.fillStyle = col;
    x.beginPath(); x.ellipse(-0.05 * s, 0, 0.3 * s, 0.11 * s, 0, 0, TAU); x.fill();
    taper(x, [[0.2 * s, 0], [0.42 * s, Math.sin(t * 1.5) * 0.03 * s], [0.62 * s, 0.01 * s]], 0.1 * s, 0.05 * s);
    x.beginPath(); x.moveTo(0.6 * s, -0.05 * s); x.lineTo(0.82 * s, -0.015 * s); x.lineTo(0.84 * s, 0.015 * s); x.lineTo(0.6 * s, 0.05 * s); x.closePath(); x.fill();
    taper(x, [[0.66 * s, -0.03 * s], [0.56 * s, -0.12 * s], [0.44 * s, -0.16 * s]], 0.022 * s, 0.003 * s); taper(x, [[0.66 * s, 0.03 * s], [0.56 * s, 0.12 * s], [0.44 * s, 0.16 * s]], 0.022 * s, 0.003 * s);
    const tl = []; for (let k = 0; k <= 10; k++) { const u = k / 10; tl.push([-0.3 * s - u * 0.95 * s, Math.sin(t * 2 - u * 3) * 0.06 * s * u]); } taper(x, tl, 0.09 * s, 0.01 * s);
    const tp = tl[10]; x.beginPath(); x.moveTo(tp[0], tp[1]); x.lineTo(tp[0] - 0.06 * s, tp[1] - 0.04 * s); x.lineTo(tp[0] - 0.1 * s, tp[1]); x.lineTo(tp[0] - 0.06 * s, tp[1] + 0.04 * s); x.closePath(); x.fill();
    for (const sd of [-1, 1]) taper(x, [[-0.2 * s, sd * 0.08 * s], [-0.32 * s, sd * 0.14 * s], [-0.4 * s, sd * 0.12 * s]], 0.05 * s, 0.02 * s);
    x.restore();
  }
  function shotRider(x, t, sh) {
    const D = K.cue('D01'), lt = t - sh.a, cmd = D.start + 1.43, dive = D.start + 2.64;
    const thrown = easeOut(span(t, cmd - 0.08, cmd + 0.25)) - 0.0 * 0, raise = smooth(span(t, D.start + 0.3, cmd - 0.15));
    const dv = easeIn(span(t, dive - 0.1, sh.b + 0.2));
    const [sx, sy] = K.shake(t * 3, 6 + 14 * dv, 1421);
    const c = { x: lerp(-20, 30, span(t, sh.a, sh.b)) + sx, y: lerp(0, 160, dv) + sy, z: lerp(1.0, 1.12, span(t, sh.a, sh.b)) };
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05060c'); g.addColorStop(0.7, '#141a2a'); g.addColorStop(1, '#2a1c20'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    view(x, c, 0.12); moonDisc(x, 1060, 400, 230);
    fog(x, 1422, [90, 100, 124], 330, 220, t * 40, 0.45); fog(x, 1423, [50, 56, 74], 560, 300, -t * 30, 0.5);
    // the city far below: a band of lights and the first fires
    view(x, c, 0.3);
    const r = rng(1424); for (let i = 0; i < 160; i++) { const lx = r() * W * 1.3 - 200, ly = 1000 + r() * 160; x.fillStyle = `rgba(255,${150 + r() * 60 | 0},80,${0.3 + r() * 0.5})`; x.fillRect(lx, ly, 2 + r() * 2, 2); }
    glow(x, [255, 100, 40], 900, 1120, 600, 0.25);
    fog(x, 1425, [30, 32, 44], 900, 300, t * 20, 0.6);
    // the beast and its rider: gliding, the command, the dive
    view(x, c, 1);
    const flap = Math.sin(t * 2.4) * (1 - dv) * 0.6, bx = lerp(1180, 860, span(t, sh.a, dive)) - dv * 500, by = 470 + Math.sin(t * 1.2) * 12 + dv * 520;
    const opts = { x: bx, y: by + 120, s: 0.72 + dv * 0.8, face: -1, rot: dv * 0.95, flap, fold: dv, t, col: '#06060a', rider: t < cmd ? -0.2 + raise * 0.3 : lerp(0.1, 1, thrown), back: [255, 170, 130], backA: 0.4 * (1 - dv) };
    rimLit(x, (cc, fill) => beastSide(cc, Object.assign({}, opts, { col: fill, eye: fill !== opts.col ? false : true, back: undefined })), { rim: '#b8c4dc', mid: '#3a4256', dark: '#06060a', dx: -3, dy: 3, steps: 3 });
    // the gold eye: the one warm note
    x.setTransform(1, 0, 0, 1, 0, 0);
    const ex = proj(c, 1, bx - (230 + 52) * opts.s, by + 120 - 160 * opts.s); glow(x, [255, 190, 90], ex[0], ex[1], 18, 0.5 * (1 - dv * 0.5));
    // the wind of the dive
    if (dv > 0) { x.save(); x.strokeStyle = `rgba(200,210,230,${0.25 * dv})`; x.lineWidth = 2; const r2 = rng(1426); for (let i = 0; i < 40; i++) { const lx = r2() * W, ly = ((r2() * H - lt * 1600 * (0.5 + r2())) % H + H) % H; x.beginPath(); x.moveTo(lx, ly); x.lineTo(lx + 30, ly + 160 + r2() * 120); x.stroke(); } x.restore(); }
    finish(x, { bloom: 0.4, vig: 0.68, shadow: '#26304a', shadowA: 0.3 });
  }

  // ================================================================ L07: the First-Born falls on the city; the city looks up
  function shotWingSky(x, t, sh) {
    const lt = t - sh.a, d = sh.b - sh.a, u = clamp(lt / d);
    const pass = span(t, sh.a, sh.a + d * 0.7), tilt = ease(span(t, sh.a + d * 0.45, sh.b));
    const [sx, sy] = K.shake(t * 3, 10 + 22 * Math.sin(pass * Math.PI), 1431);
    const c = { x: sx, y: lerp(-80, 520, tilt) + sy, z: 1.02 };
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05060c'); g.addColorStop(1, '#2a1a1c'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    view(x, c, 0.2); moonDisc(x, 760, 300, 170); fog(x, 1432, [80, 70, 80], 240, 260, t * 30, 0.4);
    // the wing sweeps over, close, the moon through its membrane
    view(x, c, 0.6);
    if (pass > 0 && pass < 1) {
      const bx = lerp(2500, -900, pass), by = lerp(-80, 260, pass), s = 1500, rot = Math.PI - 0.35;
      // where the moon sits in the near wing's own units (for the light through it)
      const wr = rot + Math.PI / 2 + 0.3, ox = bx + Math.cos(rot) * (-0.02 * s) - Math.sin(rot) * (0.05 * s), oy = by + Math.sin(rot) * (-0.02 * s) + Math.cos(rot) * (0.05 * s);
      const dx = 760 - ox, dy = 300 - oy, cr = Math.cos(-wr), sr = Math.sin(-wr);
      beastBelow(x, { x: bx, y: by, s, rot, flap: Math.sin(t * 3) * 0.5, col: '#040406', t, membA: 0.9, back: [255, 160, 120], backA: 0.55, backX: (dx * cr - dy * sr) / s, backY: (dx * sr + dy * cr) / s, backR: 0.16 });
    }
    // the roofs below, and fire falling onto them
    view(x, c, 1);
    const CN = CITY.near(); x.drawImage(CN, -440, 1100);
    const r = rng(1433);
    for (let i = 0; i < 26; i++) {
      const st = sh.a + 0.6 + r() * 1.4, a = t - st, fx = 100 + r() * 1700; if (a < 0) { r(); continue; }
      const fy = 300 + a * (900 + r() * 400), land = 1350 + r() * 120;
      if (fy < land) { x.save(); x.globalCompositeOperation = 'lighter'; const gg = x.createLinearGradient(fx, fy - 180, fx, fy); gg.addColorStop(0, 'rgba(255,120,40,0)'); gg.addColorStop(1, 'rgba(255,200,120,0.9)'); x.strokeStyle = gg; x.lineWidth = 6; x.beginPath(); x.moveTo(fx - 30, fy - 180); x.lineTo(fx, fy); x.stroke(); x.restore(); glow(x, [255, 160, 70], fx, fy, 40, 0.6); }
      else { const k = clamp((fy - land) / 900); fire(x, fx, land, 70 + 60 * k, 60 + 220 * k, t, i + 50, { n: 5, slot: 'w' + (i % 4) }); glow(x, [255, 110, 40], fx, land - 60, 260, 0.3 * k); }
    }
    x.setTransform(1, 0, 0, 1, 0, 0);
    const dark = Math.sin(clamp(span(pass, 0.25, 0.75)) * Math.PI); if (dark > 0) { x.fillStyle = `rgba(0,0,0,${0.45 * dark})`; x.fillRect(0, 0, W, H); }
    K.embers(x, t, { n: 40, heat: 0.7 * tilt, seed: 1434 });
    finish(x, { bloom: 0.45, vig: 0.7, warm: '#a04a1a', warmA: 0.08 * tilt });
  }
  // a street of the capital burning, seen from the crowd
  function streetImg() {
    return K.cached('s1:street', () => {
      const c = K.canvas(W + 300, H + 200), x = c.getContext('2d'), r = rng(1440), OX = 150, OY = 100, vx = 960 + OX, vy = 560 + OY;
      const g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, '#1a0c08'); g.addColorStop(0.45, '#5a2410'); g.addColorStop(0.62, '#2a1410'); g.addColorStop(1, '#0a0605'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
      for (const side of [-1, 1]) for (let k = 0; k < 8; k++) {
        const d0 = Math.pow(0.78, k), d1 = Math.pow(0.78, k + 1), x0 = vx + side * 1500 * d0, x1 = vx + side * 1500 * d1, top0 = vy - 1100 * d0 * (0.8 + r() * 0.4), top1 = vy - 1100 * d1 * (0.8 + r() * 0.4), b0 = vy + 700 * d0, b1 = vy + 700 * d1;
        x.fillStyle = `rgb(${10 + k * 3},${7 + k * 2},${6 + k * 2})`;
        x.beginPath(); x.moveTo(x0, b0); x.lineTo(x0, top0); x.lineTo((x0 + x1) / 2, Math.min(top0, top1) - 160 * d0); x.lineTo(x1, top1); x.lineTo(x1, b1); x.closePath(); x.fill();
        for (let w = 0; w < 3; w++) if (r() < 0.6) { const wx = lerp(x0, x1, 0.25 + w * 0.25), wy = lerp(top0, b0, 0.35 + r() * 0.3); x.fillStyle = `rgba(255,${120 + r() * 60 | 0},40,0.8)`; x.fillRect(wx - 12 * d0, wy, 24 * d0, 40 * d0); }
      }
      const fg = x.createLinearGradient(0, vy, 0, c.height); fg.addColorStop(0, '#2a140c'); fg.addColorStop(1, '#0a0605'); x.fillStyle = fg; x.beginPath(); x.moveTo(vx - 1500 * 0.17, vy + 700 * 0.17); x.lineTo(vx + 1500 * 0.17, vy + 700 * 0.17); x.lineTo(c.width + 200, c.height); x.lineTo(-200, c.height); x.closePath(); x.fill();
      return { c, OX, OY };
    });
  }
  function shotLookup(x, t, sh) {
    const u = span(t, sh.a, sh.b), [sx, sy] = K.shake(t * 2, 5, 1441);
    const c = { x: lerp(30, -30, u) + sx, y: lerp(40, -50, ease(u)) + sy, z: lerp(1.04, 1.12, u) };
    const S = streetImg();
    view(x, c, 0.5); x.drawImage(S.c, -S.OX, -S.OY);
    // the fires along the roofs, the smoke lit from below
    K.smoke(x, t, { n: 16, x: -100, y: -200, w: W + 200, h: 700, color: [90, 40, 24], alpha: 0.45, rise: 30, size: 380, seed: 1442 });
    for (const [fx, fy, fs] of [[300, 330, 1], [560, 420, 0.7], [1380, 400, 0.8], [1640, 300, 1.1], [860, 470, 0.5], [1100, 460, 0.5]]) { fire(x, fx, fy, 140 * fs, 260 * fs, t, fx, { n: 6, slot: 'l' + (fx % 3) }); glow(x, [255, 110, 40], fx, fy - 80, 420 * fs, 0.25); }
    // the beast's belly passing over, lit from beneath
    view(x, c, 0.7);
    const bp = span(t, sh.a - 0.3, sh.b + 0.8);
    rimLit(x, (cc, fill) => beastBelow(cc, { x: lerp(2400, -700, bp), y: 60, s: 900, rot: Math.PI - 0.2, flap: Math.sin(t * 2.6), col: fill, t }), { rim: '#ff8a40', mid: '#5a2010', dark: '#0c0605', dx: 0, dy: -8, steps: 3 });
    // the crowd, faces turned up, lit from above
    view(x, c, 1);
    const ppl = K.cached('s1:crowdlook', () => { const r = rng(1443), out = []; for (let i = 0; i < 26; i++) { const row = i < 9 ? 0 : i < 18 ? 1 : 2, d = [0.62, 0.8, 1.0][row]; out.push({ X: 60 + r() * 1800, Y: 830 + row * 150, h: 430 * d * (0.85 + r() * 0.25), face: r() < 0.5 ? 1 : -1, dress: ['cloak', 'tunic', 'gown', 'robe'][Math.floor(r() * 4)], hat: ['hood', 'bare', 'cap', 'hair'][Math.floor(r() * 4)], point: r() < 0.25, child: r() < 0.08, ph: r() * 6 }); } return out.sort((a, b) => a.Y - b.Y); });
    rimLit(x, (cc, fill) => { for (const p of ppl) person(cc, { x: p.X + Math.sin(t * 0.7 + p.ph) * 4, y: p.Y, h: p.child ? p.h * 0.6 : p.h, face: p.face, child: p.child, dress: p.dress, hat: p.hat, tilt: -0.75 - 0.1 * Math.sin(t + p.ph), lean: -0.12, armN: p.point ? [2.7, 0.1] : undefined, armF: p.point ? undefined : [0.4, 0.8], fill, t }); }, { rim: '#ffae60', mid: '#6a2c12', dark: '#0a0605', dx: 0, dy: 6 });
    x.setTransform(1, 0, 0, 1, 0, 0);
    K.embers(x, t, { n: 60, heat: 0.8, seed: 1444 });
    K.specks(x, t, { kind: 'ash', n: 60, alpha: 0.5, wind: 30, seed: 1445 });
    finish(x, { bloom: 0.45, vig: 0.7, warm: '#b05020', warmA: 0.08 });
  }

  // ================================================================ A01 + L08: the knife, told as a shadow on the wall
  function chamberWall() {
    return K.cached('s1:cwall', () => {
      const c = K.canvas(W + 300, H + 200), x = c.getContext('2d'), r = rng(1450);
      x.fillStyle = '#5a4030'; x.fillRect(0, 0, c.width, c.height);
      for (let row = 0; row * 70 < c.height; row++) for (let X = -((row % 2) * 80); X < c.width; X += 160 + r() * 40) { const v = r() * 18; x.fillStyle = `rgb(${86 + v | 0},${64 + v | 0},${48 + v * 0.7 | 0})`; x.fillRect(X + 3, row * 70 + 3, 154, 64); }
      x.globalCompositeOperation = 'multiply'; for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(80,60,46,${0.1 + r() * 0.25})`; x.beginPath(); x.ellipse(r() * c.width, r() * c.height, 8 + r() * 40, 4 + r() * 20, r() * 3, 0, TAU); x.fill(); }
      x.globalCompositeOperation = 'source-over';
      // a tall narrow window at the left, its reveal
      x.fillStyle = '#1e140e'; x.beginPath(); x.moveTo(170, 900); x.lineTo(170, 280); x.quadraticCurveTo(170, 160, 260, 120); x.quadraticCurveTo(350, 160, 350, 280); x.lineTo(350, 900); x.closePath(); x.fill();
      return c;
    });
  }
  function shotShadow(x, t, sh) {
    const A = K.cue('A01'), L8 = K.cue('L08'), close = sh.id === 'shadow2';
    const strike = at('L08', 0.86), raise = smooth(span(t, at('L08', 0.5), strike - 0.25)), stab = easeIn(span(t, strike - 0.12, strike)), fall = easeOut(span(t, strike + 0.05, strike + 0.7));
    const rise = smooth(span(t, A.start - 0.4, A.start + 1.2)), hear = win(t, A.end - 0.9, A.end + 1.5, 0.4, 0.8);
    const fl = flick(t, 11, 7), lx = Math.sin(t * 5.3) * 6 * fl;
    const u = span(t, sh.a, sh.b);
    const c = close ? { x: lerp(120, 160, u), y: lerp(-60, -40, u), z: lerp(1.35, 1.45, u) } : { x: lerp(0, 40, u), y: 0, z: lerp(1.04, 1.1, u) };
    view(x, c, 1);
    x.drawImage(chamberWall(), -150, -100);
    // the window: the burning city flashing beyond
    const fx = 0.5 + 0.5 * Math.sin(t * 3.1) * Math.sin(t * 1.7 + 1), ws = span(t, A.start + 0.2, A.start + 1.4);
    x.save(); x.beginPath(); x.moveTo(170, 900); x.lineTo(170, 280); x.quadraticCurveTo(170, 160, 260, 120); x.quadraticCurveTo(350, 160, 350, 280); x.lineTo(350, 900); x.closePath(); x.clip();
    const wg = x.createLinearGradient(0, 120, 0, 900); wg.addColorStop(0, `rgb(${60 + 80 * fx | 0},${20 + 30 * fx | 0},14)`); wg.addColorStop(1, `rgb(${160 + 90 * fx | 0},${60 + 50 * fx | 0},20)`); x.fillStyle = wg; x.fillRect(170, 120, 180, 780);
    if (ws > 0 && ws < 1) { x.fillStyle = '#000'; wing(x, { x: lerp(500, -100, ws), y: 300, s: 300, rot: 0.4, mirror: true, col: '#000' }); }
    x.fillStyle = '#120c08'; x.fillRect(255, 120, 10, 780); x.restore();
    // the shadows, cast large and soft by the candle on the table
    const SL = scratch('s1:shad', 960, 540), sx = SL.getContext('2d');
    sx.setTransform(x.getTransform()); sx.scale(0.5, 0.5); sx.translate(0, 0);
    const T = sx.getTransform(); sx.setTransform(T.a * 0.5 / 0.5, 0, 0, T.d, T.e * 0.5, T.f * 0.5);
    sx.setTransform(x.getTransform().a * 0.5, 0, 0, x.getTransform().d * 0.5, x.getTransform().e * 0.5, x.getTransform().f * 0.5);
    sx.translate(lx, 0);
    const oswyn = { x: 1000, y: 1180, h: 900, face: -1, sit: 0.33, dress: 'robe', hat: 'hair', beard: 0.5, lean: lerp(0.55, 0.35, hear) - fall * 0.0, tilt: lerp(0.4, 0.1, hear), armN: [1.3 + 0.1 * Math.sin(t * 6) * (1 - hear), 0.6], armF: [1.0, 0.8], fill: '#000' };
    if (stab > 0 && fall <= 0) { oswyn.lean = -0.25 * stab; oswyn.tilt = -0.5 * stab; oswyn.armN = [2.0, 0.3]; oswyn.armF = [2.4, 0.2]; }
    if (fall > 0) { oswyn.lean = lerp(-0.25, 1.35, fall); oswyn.tilt = lerp(-0.5, 0.6, fall); oswyn.armN = [lerp(2.0, 1.6, fall), 0.2]; oswyn.armF = [lerp(2.4, 1.8, fall), 0.2]; oswyn.y = 1180 + fall * 120; }
    person(sx, oswyn);
    // the captain rises behind him, steps in; the knife
    const capX = lerp(1520, 1300, rise) + stab * 30, capH = lerp(980, 1150, rise);
    person(sx, { x: capX, y: 1220 + (1 - rise) * 260, h: capH, face: -1, dress: 'mail', hat: 'helm', lean: 0.12 + stab * 0.25, hold: raise > 0.02 ? 'sword' : undefined, bladeAng: lerp(Math.PI * 0.95, Math.PI * 1.05, raise), armN: raise > 0 ? [lerp(0.3, 2.9, raise) - stab * 1.9, lerp(0.3, 0.2, raise)] : [0.2, 0.3], armF: [0.6, 0.6], fill: '#000' });
    // the table's shadow
    sx.fillStyle = '#000'; sx.fillRect(500, 1010, 1300, 40); sx.fillRect(560, 1050, 30, 300); sx.fillRect(1700, 1050, 30, 300);
    const SB = scratch('s1:shadB', 960, 540), sb = SB.getContext('2d'); sb.filter = 'blur(4px)'; sb.drawImage(SL, 0, 0);
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.78; x.drawImage(SB, 0, 0, W, H); x.restore();
    // the candle on the table edge, in the foreground: the light, the table top in silhouette
    view(x, c, 1.3);
    x.fillStyle = '#0a0705'; x.fillRect(-200, 1010, 2400, 300);
    x.fillStyle = '#d8ccb0'; x.fillRect(930, 860, 26, 150); candleFlame(x, 943, 860, 34, t, 4, 1, Math.sin(t * 2) * 0.3);
    x.setTransform(1, 0, 0, 1, 0, 0);
    // the candlelight falls off across the wall
    x.save(); x.globalCompositeOperation = 'multiply'; const lg = x.createRadialGradient(W * 0.5 + lx * 3, H * 0.75, 60, W * 0.5, H * 0.6, W * 0.8 * fl); lg.addColorStop(0, 'rgb(255,226,180)'); lg.addColorStop(0.5, 'rgb(150,96,60)'); lg.addColorStop(1, 'rgb(24,14,10)'); x.fillStyle = lg; x.fillRect(0, 0, W, H); x.restore();
    if (stab >= 1 && fall < 0.3) { x.fillStyle = `rgba(150,20,10,${0.25 * (1 - fall / 0.3)})`; x.fillRect(0, 0, W, H); }
    finish(x, { bloom: 0.3, vig: 0.75, tooth: 0.08 });
  }
  // L08 "No one was watching the council chamber": the High Seat's tower, one lit window, the city burning around it
  function shotTower(x, t, sh) {
    const u = span(t, sh.a, sh.b), [sx, sy] = K.shake(t * 1.5, 6, 1460);
    const c = { x: lerp(-60, -80, u) + sx, y: lerp(-560, -600, u) + sy, z: lerp(2.0, 2.4, ease(u)) };
    capital(x, c, t, { fire: 1 });
    view(x, c, 0.7);
    for (const [fx, fy, s] of [[640, 300, 1], [780, 360, 0.7], [1090, 330, 0.9], [1220, 400, 0.6], [500, 400, 0.8]]) { fire(x, fx, fy, 70 * s, 160 * s, t, fx, { n: 6, slot: 'tw' + (fx % 3) }); glow(x, [255, 110, 40], fx, fy - 40, 220 * s, 0.25); }
    K.smoke(x, t, { n: 14, x: 400, y: -500, w: 1000, h: 900, color: [60, 30, 22], alpha: 0.45, rise: 24, size: 300, seed: 1461, drift: 10 });
    // the beast wheeling through the smoke, its belly lit by the fires
    const gp = span(t, sh.a - 0.4, sh.b + 0.6); rimLit(x, (cc, fill) => beastBelow(cc, { x: lerp(1400, 300, gp), y: lerp(-170, -60, gp), s: 190, rot: Math.PI + 0.25, flap: Math.sin(t * 3), col: fill, t }), { rim: '#ff7a30', mid: '#4a1808', dark: '#080506', dx: 0, dy: -3, steps: 2 });
    x.setTransform(1, 0, 0, 1, 0, 0);
    K.embers(x, t, { n: 50, heat: 0.8, seed: 1462 });
    finish(x, { bloom: 0.45, vig: 0.7, warm: '#a04a1a', warmA: 0.06 });
  }
  // the decree falls from the table; the vermilion runs across it
  function bloodField() { return K.cached('s1:bloodfield', () => K.field(480, 270, [{ x: 0.12, y: 0.1 }, { x: 0.3, y: 0.05, d: 0.08 }, { x: 0.05, y: 0.4, d: 0.12 }], 1471, { warp: 0.3, scale: 3.5, grain: 0.05 })); }
  function floorImg() {
    return K.cached('s1:floor', () => {
      const c = K.canvas(W + 200, H + 200), x = c.getContext('2d'), r = rng(1472);
      x.fillStyle = '#2a2420'; x.fillRect(0, 0, c.width, c.height);
      for (let j = 0; j < 8; j++) for (let i = 0; i < 10; i++) { const v = r() * 16; x.fillStyle = `rgb(${52 + v | 0},${46 + v | 0},${40 + v | 0})`; x.fillRect(i * 220 + (j % 2) * 110 - 110 + 4, j * 170 - 60 + 4, 212, 162); }
      x.globalCompositeOperation = 'multiply'; for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(60,50,44,${0.15 + r() * 0.25})`; x.beginPath(); x.ellipse(r() * c.width, r() * c.height, 6 + r() * 50, 4 + r() * 30, r() * 3, 0, TAU); x.fill(); }
      return c;
    });
  }
  function shotSpill(x, t, sh) {
    const lt = t - sh.a, land = easeOut(clamp(lt / 0.4)), [sx, sy] = K.shake(t * 4, 12 * Math.exp(-lt * 8), 1473);
    const c = { x: sx, y: sy, z: lerp(1.05, 1.15, span(t, sh.a, sh.b + 0.8)) };
    view(x, c, 1); x.drawImage(floorImg(), -100, -100);
    // the page lands, skewed; the seals scatter off it
    const pw = 1100, ph = pw * DEC.h / DEC.w;
    x.save(); x.translate(lerp(900, 980, land), lerp(-300, 540, land)); x.rotate(lerp(-0.5, 0.12, land));
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(-pw / 2 + 14, -ph / 2 + 18, pw, ph);
    const PL = scratch('s1:spillpage', 550, Math.ceil(ph / 2)), pl = PL.getContext('2d'); pl.drawImage(decreePage(), 0, 0, 550, ph / 2);
    STRIKES.forEach(([a, b]) => { pl.fillStyle = '#1a100a'; K.nib(pl, K.resample([[a[0] * 550 / DEC.w, a[1] * 550 / DEC.w], [b[0] * 550 / DEC.w, b[1] * 550 / DEC.w]], 6), { w: 4.5, angle: -0.6 }); });
    // vermilion from the corner where he fell
    const bp = ease(span(t, sh.a + 0.25, sh.a + 1.8)), F = bloodField(), m = K.mask(F, bp * 0.85, 0.06);
    const BL = scratch('s1:spillred', 480, 270), bl = BL.getContext('2d'); bl.fillStyle = '#7a1208'; bl.fillRect(0, 0, 480, 270); bl.globalCompositeOperation = 'destination-in'; bl.drawImage(m, 0, 0);
    pl.save(); pl.globalCompositeOperation = 'multiply'; pl.drawImage(BL, 0, 0, 550, ph / 2); pl.restore();
    x.drawImage(PL, -pw / 2, -ph / 2, pw, ph);
    x.restore();
    SEALS.slice(0, 6).forEach((s, i) => { const a = (i / 6) * TAU + 0.4, d = 560 + (i * 37 % 90), k = easeOut(clamp((lt - 0.05) / 0.5)); waxDisc(x, 980 + Math.cos(a) * d * k * 1.1, 560 + Math.sin(a) * d * k * 0.75, 46, s.house, 1, t); });
    // the red runs off the page onto the stone
    x.save(); x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.9; x.translate(0, 0); x.drawImage(BL, -100, -160, 1200, 675); x.restore();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.save(); x.globalCompositeOperation = 'multiply'; const g = x.createRadialGradient(400, 200, 50, 800, 500, 1400); g.addColorStop(0, 'rgb(255,226,180)'); g.addColorStop(0.5, 'rgb(150,100,64)'); g.addColorStop(1, 'rgb(20,12,8)'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore();
    finish(x, { bloom: 0.25, vig: 0.75 });
  }

  // ================================================================ L09: by dawn the histories are written
  function scriptoriumImg() {
    return K.cached('s1:scriptorium', () => {
      const c = K.canvas(W + 300, H + 400), x = c.getContext('2d'), r = rng(1480);
      x.fillStyle = '#3a3d44'; x.fillRect(0, 0, c.width, c.height);
      for (let row = 0; row * 64 < c.height; row++) for (let X = -((row % 2) * 70); X < c.width; X += 150 + r() * 30) { const v = r() * 12; x.fillStyle = `rgb(${56 + v | 0},${58 + v | 0},${64 + v | 0})`; x.fillRect(X + 3, row * 64 + 3, 144, 58); }
      // the window opening (the view is drawn through it), deep reveal
      x.fillStyle = '#7c8088'; x.beginPath(); x.moveTo(250, 1060); x.lineTo(250, 420); x.quadraticCurveTo(250, 200, 560, 140); x.quadraticCurveTo(870, 200, 870, 420); x.lineTo(870, 1060); x.closePath(); x.fill();
      x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.moveTo(320, 1000); x.lineTo(320, 440); x.quadraticCurveTo(320, 250, 560, 200); x.quadraticCurveTo(800, 250, 800, 440); x.lineTo(800, 1000); x.closePath(); x.fill();
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = '#2a2c32'; x.fillRect(553, 200, 14, 800); x.fillRect(320, 600, 480, 12);
      // the desk
      x.fillStyle = '#2a2018'; x.beginPath(); x.moveTo(980, 980); x.lineTo(2100, 940); x.lineTo(2100, 1020); x.lineTo(980, 1060); x.closePath(); x.fill();
      x.fillStyle = '#1a140e'; x.fillRect(1020, 1050, 40, 400); x.fillRect(2000, 1010, 40, 400);
      return c;
    });
  }
  function shotDawn(x, t, sh) {
    const u = span(t, sh.a, sh.b + 0.3);
    const c = { x: lerp(-170, 230, ease(u)), y: lerp(-170, 20, ease(u)), z: lerp(1.12, 1.18, u) };
    // through the window: a pale sky, the city's dark roofs, the smoke of the night still rising
    view(x, c, 1);
    x.save(); x.beginPath(); x.moveTo(170, 800); x.lineTo(170, 240); x.quadraticCurveTo(170, 50, 410, 0); x.quadraticCurveTo(650, 50, 650, 240); x.lineTo(650, 800); x.closePath(); x.clip();
    const sg0 = x.createLinearGradient(0, 0, 0, 800); sg0.addColorStop(0, '#9aa0a8'); sg0.addColorStop(0.7, '#d4d2ca'); sg0.addColorStop(1, '#bcb8ae'); x.fillStyle = sg0; x.fillRect(100, -50, 640, 900);
    x.save(); x.translate(-120 - c.x * 0.15, 520); x.scale(0.55, 0.55); x.globalAlpha = 0.55; x.drawImage(CITY.far(), 0, 0); x.globalAlpha = 1; x.translate(0, 220); x.drawImage(CITY.near(), -200, 0); x.restore();
    x.fillStyle = 'rgba(30,30,34,0.55)'; x.fillRect(100, 640, 640, 200);
    for (let k = 0; k < 4; k++) K.smoke(x, t, { n: 7, x: 200 + k * 120, y: -200, w: 70, h: 820, color: [60, 58, 58], alpha: 0.55, rise: 22, size: 150, seed: 1482 + k, drift: 12 });
    x.restore();
    x.drawImage(scriptoriumImg(), -150, -200);
    // a shaft of grey light across the room, dust in it
    x.save(); x.globalCompositeOperation = 'lighter'; const sg = x.createLinearGradient(400, 300, 1500, 1000); sg.addColorStop(0, 'rgba(200,206,214,0.16)'); sg.addColorStop(1, 'rgba(200,206,214,0)'); x.fillStyle = sg; x.beginPath(); x.moveTo(170, 50); x.lineTo(650, 0); x.lineTo(1900, 900); x.lineTo(1100, 1100); x.closePath(); x.fill(); x.restore();
    // the scribe at the desk, writing
    rimLit(x, (cc, fill) => { person(cc, { x: 1330, y: 1200, h: 680, face: -1, sit: 0.33, dress: 'robe', hat: 'cap', lean: 0.5, tilt: 0.35, reachN: [1110 + Math.sin(t * 7) * 10, 900], armF: [1.1, 0.9], fill }); cc.fillStyle = fill; cc.beginPath(); cc.moveTo(880, 905); cc.lineTo(1800, 880); cc.lineTo(1800, 940); cc.lineTo(880, 965); cc.closePath(); cc.fill(); cc.fillRect(920, 960, 30, 300); cc.fillRect(1700, 935, 30, 300); }, { rim: '#c8ccd4', mid: '#4a4c54', dark: '#1a1b20', dx: 5, dy: 3 });
    x.fillStyle = 'rgba(230,226,214,0.5)'; x.save(); x.translate(1060, 892); x.rotate(-0.03); x.fillRect(-90, -8, 180, 10); x.restore();
    x.setTransform(1, 0, 0, 1, 0, 0);
    K.specks(x, t, { kind: 'dust', n: 50, alpha: 0.35, seed: 1481 });
    finish(x, { bloom: 0.3, vig: 0.6, shadow: '#6a7080', shadowA: 0.3 });
  }
  // the ledger of the dead: names struck through, a line added
  const LED = { w: 1500, h: 1000, x0: 150, y0: 170, dy: 92 };
  function ledgerPage() {
    return K.cached('s1:ledger', () => {
      const c = K.canvas(LED.w, LED.h), x = c.getContext('2d'); x.drawImage(K.parchment(LED.w, LED.h, 1490, { edge: 0.7, foxing: 14, stains: 1, base: [214, 204, 180] }), 0, 0);
      x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = 'rgba(120,60,50,0.35)'; x.lineWidth = 1.2; for (let k = 0; k < 9; k++) { x.beginPath(); x.moveTo(90, LED.y0 + 18 + k * LED.dy); x.lineTo(LED.w - 90, LED.y0 + 18 + k * LED.dy); x.stroke(); } x.beginPath(); x.moveTo(480, 100); x.lineTo(480, LED.h - 80); x.stroke(); x.restore();
      for (let k = 0; k < 6; k++) { drawScript(x, scriptLine(1500 + k, 260 + (k * 37 % 60), 19), LED.x0, LED.y0 + k * LED.dy, { w: 3.6, col: '#22160c' }); drawScript(x, scriptLine(1520 + k, 760 - (k * 53 % 200), 16), 520, LED.y0 + k * LED.dy, { w: 3, col: '#22160c' }); }
      return c;
    });
  }
  function ledgerScene(x, t, c, o = {}) {
    x.fillStyle = '#18161a'; x.fillRect(0, 0, W, H);
    view(x, c, 1);
    x.save(); x.translate(200, 40); x.rotate(-0.025);
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(16, 20, LED.w, LED.h);
    x.drawImage(ledgerPage(), 0, 0);
    const strikeAt = (row, p) => { if (p <= 0) return null; const wds = scriptLine(1500 + row, 260 + (row * 37 % 60), 19), x1 = LED.x0 + wds[wds.length - 1].x1 + 16, y = LED.y0 + row * LED.dy - 8; const pts = K.resample([[LED.x0 - 16, y + 3], [lerp(LED.x0, x1, 0.5), y - 2], [x1, y + 1]], 6); x.fillStyle = '#140c06'; K.nib(x, pts, { w: 6, angle: -1.2, p, taper: 0.04, jit: 0.2, seed: row }); return [lerp(LED.x0 - 16, x1, p), y]; };
    const nl = scriptLine(1531, 900, 17);
    let tip = null;
    const S = o.strikes || [0, 0, 0], pn = o.newLine || 0;
    [1, 2, 3].forEach((row, i) => { const q = strikeAt(row, S[i]); if (q && S[i] < 1) tip = q; });
    if (pn > 0) { drawScript(x, nl, LED.x0, LED.y0 + 6 * LED.dy, { p: pn, w: 3.4, col: '#140c06' }); if (pn < 1) { const q = scriptTip(nl, pn); tip = [LED.x0 + q[0], LED.y0 + 6 * LED.dy + q[1]]; } }
    if (o.hand !== false) { const hp = tip || o.rest || [LED.x0 + 700, LED.y0 + 5 * LED.dy]; x.save(); x.globalAlpha = 0.28; x.fillStyle = '#000'; quillHand(x, hp[0] + 36, hp[1] + 44, { ang: 0.45, scale: 1.05, skin: [0, 0, 0], sleeve: [0, 0, 0] }); x.restore(); quillHand(x, hp[0], hp[1], { ang: 0.45, scale: 1.05, skin: [170, 140, 120], sleeve: [52, 54, 60], lit: 0.75 }); }
    x.restore();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.save(); x.globalCompositeOperation = 'multiply'; const g = x.createRadialGradient(300, 100, 50, 800, 500, 1500); g.addColorStop(0, 'rgb(236,238,240)'); g.addColorStop(0.6, 'rgb(150,152,160)'); g.addColorStop(1, 'rgb(30,30,36)'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore();
  }
  // where a ledger row sits on screen for a camera (rows 1-3: the lord, the wife, the infant)
  function shotLedger(x, t, sh) {
    const S = [smooth(span(t, at('L09', 0.33), at('L09', 0.41))), smooth(span(t, at('L09', 0.73), at('L09', 0.79))), smooth(span(t, at('L09', 0.84), at('L09', 0.9)))];
    const pn = span(t, at('L09', 0.5), at('L09', 0.66));
    const u = span(t, sh.a, sh.b), k1 = ease(span(t, at('L09', 0.46), at('L09', 0.52))), k2 = ease(span(t, at('L09', 0.68), at('L09', 0.73)));
    const c = { x: lerp(lerp(-120, -60, k1), 80, k2), y: lerp(lerp(-140, 120, k1), -120, k2) - 10 * u, z: lerp(1.2, 1.35, u) };
    ledgerScene(x, t, c, { strikes: S, newLine: pn });
    finish(x, { bloom: 0.2, vig: 0.65, shadow: '#5a6070', shadowA: 0.25 });
  }
  function rowWorld(row) {
    const wds = scriptLine(1500 + row, 260 + (row * 37 % 60), 19), px = (LED.x0 - 16 + LED.x0 + wds[wds.length - 1].x1 + 16) / 2, py = LED.y0 + row * LED.dy - 8, a = -0.025;
    return [200 + px * Math.cos(a) - py * Math.sin(a), 40 + px * Math.sin(a) + py * Math.cos(a)];
  }
  function shotLedger2(x, t, sh) {
    const u = span(t, sh.a, sh.b), [rx, ry] = rowWorld(3);
    // close on the infant's struck name; at the cut it sits at the frame's centre, for the match to the bundle
    const c = { x: rx - W / 2 + lerp(70, 0, ease(u)), y: ry - H / 2 + lerp(-40, 0, ease(u)), z: lerp(1.7, 2.3, ease(u)) };
    ledgerScene(x, t, c, { strikes: [1, 1, 1], newLine: 1, hand: false });
    finish(x, { bloom: 0.2, vig: 0.75, shadow: '#5a6070', shadowA: 0.3 });
  }


  // ================================================================ L09a: the curse. The council chamber in 3D: the Blood-Throne on its dais, seven
  // high seats about a ring of stone table, the banners behind them, tall windows. Oswyn's blood runs from his place at
  // the table into the stone; red veins root out through the floor, climb the walls, crack the throne, and go out
  // across the land; under the feet of the six lords who never knew, they pass and fade.
  const CH = { R: 560, tR: 420, wallR: 950, wallH: 1050, pool: [0, -322] };
  const seatAng = i => (i / 7) * TAU + Math.PI / 7;          // seat 3 is Oswyn's, toward -z
  const THRONE_BACK = frame3(0, 58, Math.PI, 66);
  const WINDOWS = [-0.36, 0.36, Math.PI - 0.5, Math.PI + 0.5];
  function chamberGeo() {
    return K.cached('s1:chgeo', () => {
      const F = [], ban = [];
      for (let s = 0; s < 3; s++) { const hw = 170 - s * 36; extrude(boxPoly(hw, s * 22, s * 22 + 22), hw * 2, frame3(0, 0, Math.PI), 'dais', F); }
      extrude(boxPoly(62, 0, 58), 90, frame3(0, 0, Math.PI, 66), 'throne', F);
      for (const sx of [-72, 72]) extrude(boxPoly(10, 0, 96), 92, frame3(sx, 0, Math.PI, 66), 'throne', F);
      extrude([[-66, 0], [66, 0], [66, 230], [44, 292], [24, 250], [0, 334], [-24, 250], [-44, 292], [-66, 230]], 28, THRONE_BACK, 'throneB', F);
      for (let i = 0; i < 7; i++) {
        const a = seatAng(i), s = Math.sin(a), co = Math.cos(a);
        extrude(boxPoly(48, 0, 52), 80, frame3(CH.R * s, CH.R * co, a + Math.PI), 'seat', F);
        extrude([[-54, 0], [54, 0], [54, 270], [0, 340], [-54, 270]], 18, frame3((CH.R + 48) * s, (CH.R + 48) * co, a + Math.PI), 'seat', F);
        ban.push({ fr: frame3(735 * s, 735 * co, a + Math.PI), house: K.HOUSES[(i + 4) % 7], i });
      }
      for (let k = 0; k < 28; k++) {
        const p = (k + 0.5) / 28 * TAU, s = Math.sin(p), co = Math.cos(p);
        extrude(boxPoly(48, 66, 82), 80, frame3(CH.tR * s, CH.tR * co, p + Math.PI), 'table', F);
        if (k % 2 === 0) extrude(boxPoly(7, 0, 66), 14, frame3(CH.tR * s, CH.tR * co, p + Math.PI), 'leg', F);
      }
      const walls = [];
      for (let k = 0; k < 44; k++) {
        const a0 = k / 44 * TAU, a1 = (k + 1) / 44 * TAU, am = (a0 + a1) / 2, R = CH.wallR;
        walls.push({ pts: [[R * Math.sin(a1), 0, R * Math.cos(a1)], [R * Math.sin(a0), 0, R * Math.cos(a0)], [R * Math.sin(a0), CH.wallH, R * Math.cos(a0)], [R * Math.sin(a1), CH.wallH, R * Math.cos(a1)]], n: [-Math.sin(am), 0, -Math.cos(am)], c: [R * Math.sin(am), CH.wallH / 2, R * Math.cos(am)], mat: k % 4 === 0 ? 'pier' : 'wall' });
      }
      return { F, ban, walls };
    });
  }
  const MAT = { dais: [40, 38, 44], throne: [16, 10, 12], throneB: [16, 10, 12], seat: [30, 30, 36], table: [34, 28, 26], leg: [22, 18, 16], wall: [26, 26, 32], pier: [32, 32, 40] };
  function chamberShade(C, o) {
    const L1 = v3.norm([0.15, 0.55, 0.82]), L2 = v3.norm([-0.1, 0.5, -0.86]), cands = o.candles || [];
    return (f, n, c) => {
      const b = MAT[f.mat] || [40, 40, 40];
      const lm = 0.2 + 0.55 * Math.max(0, v3.dot(n, L1)) * (o.moon1 != null ? o.moon1 : 1) + 0.4 * Math.max(0, v3.dot(n, L2)) * (o.moon2 != null ? o.moon2 : 1);
      let r = b[0] * lm * 0.85, g = b[1] * lm * 0.92, bl = b[2] * lm * 1.18;
      for (const cd of cands) { const d = v3.sub(cd.p, c), dl = Math.hypot(d[0], d[1], d[2]) || 1, k = cd.i / (1 + (dl * dl) / (cd.r * cd.r)) * Math.max(0, v3.dot(n, [d[0] / dl, d[1] / dl, d[2] / dl])); r += 200 * k * 0.4; g += 110 * k * 0.4; bl += 60 * k * 0.4; }
      if (o.red) { const d = Math.hypot(c[0] - CH.pool[0], c[2] - CH.pool[1]), k = o.red * Math.max(0, 1 - d / 900) * (c[1] < 120 ? 1 : 0.25); r += 60 * k; g += 4 * k; bl += 2 * k; }
      const z = toCam(C, c)[2], fogk = clamp((z - 600) / 2600) * 0.6;
      r = lerp(r, 8, fogk); g = lerp(g, 9, fogk); bl = lerp(bl, 14, fogk);
      return `rgb(${clamp(r, 0, 255) | 0},${clamp(g, 0, 255) | 0},${clamp(bl, 0, 255) | 0})`;
    };
  }
  // where things sit on the floor (y up; the pool at the inner edge of Oswyn's place at the table)
  const onFloor = (C, fx, fz, y = 0.4) => p3(C, [fx, y, fz]);
  function poolPath(x, C, rad, seed) {
    const n = 28; x.beginPath(); let ok = 0;
    for (let k = 0; k <= n; k++) { const a = k / n * TAU, e = rad * (1 + 0.28 * (K.fbm(Math.cos(a) * 1.3 + seed, Math.sin(a) * 1.3, 3, 1501) - 0.5) * 2) * (a > Math.PI ? 1.25 : 1), s = onFloor(C, CH.pool[0] + Math.cos(a) * e * 1.3, CH.pool[1] + Math.sin(a) * e); if (!s) continue; ok++; ok === 1 ? x.moveTo(s[0], s[1]) : x.lineTo(s[0], s[1]); }
    x.closePath(); return ok > 2;
  }
  const VEIN_FLOOR = () => veinTree(1510, { roots: 10, len: 1500, step: 16, width: 10, branch: 0.085, spread: 0.8, decay: 0.991, max: 420, wiggle: 0.7 });
  const VEIN_WALL = () => veinTree(1511, { roots: 3, len: 900, step: 14, width: 7, branch: 0.1, dir: -Math.PI / 2, arc: 0.55, decay: 0.99, max: 120 });
  const VEIN_CRACK = () => veinTree(1512, { roots: 1, len: 340, step: 8, width: 6, branch: 0.12, dir: -Math.PI / 2, arc: 0.22, spread: 0.6, decay: 0.993, max: 30 });
  function drawChamber(x, C, t, o = {}) {
    const G = chamberGeo(), shade = chamberShade(C, o);
    x.fillStyle = '#060608'; x.fillRect(0, 0, W, H);
    // the walls; the windows, moonlit (and red from the burning city on the far side)
    drawFaces(x, C, G.walls, shade);
    for (const wa of WINDOWS) {
      const R = CH.wallR - 4, pts = [];
      for (let k = 0; k <= 10; k++) { const u = k / 10, a = wa + (u - 0.5) * 0.12, y = u < 0.5 ? lerp(820, 900, Math.sin(u * Math.PI)) : lerp(820, 900, Math.sin(u * Math.PI)); pts.push([R * Math.sin(a), y + (Math.abs(u - 0.5) < 0.05 ? 40 : 0), R * Math.cos(a)]); }
      pts.push([R * Math.sin(wa + 0.06), 300, R * Math.cos(wa + 0.06)], [R * Math.sin(wa - 0.06), 300, R * Math.cos(wa - 0.06)]);
      if (path3(x, C, pts)) { x.fillStyle = Math.cos(wa) > 0 ? 'rgb(96,110,146)' : 'rgb(120,70,60)'; x.fill(); x.strokeStyle = '#0a0a0e'; x.lineWidth = 3; x.stroke(); }
    }
    // the floor: dark stone, its joints
    const fl = []; for (let k = 0; k < 48; k++) { const a = k / 48 * TAU; fl.push([CH.wallR * Math.sin(a), 0, CH.wallR * Math.cos(a)]); }
    if (path3(x, C, fl)) { x.fillStyle = 'rgb(24,23,28)'; x.fill(); }
    x.save(); x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 1.4;
    for (let k = -10; k <= 10; k++) for (const ax of [0, 1]) { const v = k * 95, L = Math.sqrt(Math.max(0, CH.wallR * CH.wallR - v * v)); const a = ax ? [v, 0.2, -L] : [-L, 0.2, v], b = ax ? [v, 0.2, L] : [L, 0.2, v]; const qa = toCam(C, a), qb = toCam(C, b); let A = qa, B = qb; if (A[2] < 6 && B[2] < 6) continue; if (A[2] < 6) { const u = (6 - A[2]) / (B[2] - A[2]); A = [lerp(A[0], B[0], u), lerp(A[1], B[1], u), 6]; } if (B[2] < 6) { const u = (6 - B[2]) / (A[2] - B[2]); B = [lerp(B[0], A[0], u), lerp(B[1], A[1], u), 6]; } const sa = scr(C, A), sb = scr(C, B); x.beginPath(); x.moveTo(sa[0], sa[1]); x.lineTo(sb[0], sb[1]); x.stroke(); }
    x.restore();
    // moonlight pooled on the floor under the windows
    x.save(); x.globalCompositeOperation = 'lighter';
    for (const wa of WINDOWS) { const pts = [[880, -90], [880, 90], [380, 170], [380, -170]].map(([r, w]) => [r * Math.sin(wa) + w * Math.cos(wa), 0.5, r * Math.cos(wa) - w * Math.sin(wa)]); if (path3(x, C, pts)) { x.fillStyle = Math.cos(wa) > 0 ? 'rgba(90,110,160,0.12)' : 'rgba(150,80,60,0.1)'; x.fill(); } }
    x.restore();
    // the blood: a pool at his place, drips from the table's edge
    if (o.pool) {
      x.save(); if (poolPath(x, C, o.pool, 0)) { x.fillStyle = '#2a0404'; x.fill(); x.clip(); const s = onFloor(C, CH.pool[0] - 30, CH.pool[1] + 20); if (s) { const g = x.createRadialGradient(s[0], s[1], 2, s[0], s[1], 120 * s[2]); g.addColorStop(0, 'rgba(110,14,10,0.5)'); g.addColorStop(1, 'rgba(60,6,4,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); } const m = onFloor(C, CH.pool[0] + 40, CH.pool[1] + 30); if (m) { x.fillStyle = 'rgba(150,160,190,0.12)'; x.beginPath(); x.ellipse(m[0], m[1], 26 * m[2], 5 * m[2], 0, 0, TAU); x.fill(); } } x.restore();
    }
    if (o.veins) drawVeins(x, VEIN_FLOOR(), o.veins, { map: (fx, fz) => onFloor(C, CH.pool[0] + fx, CH.pool[1] + fz), t, scale: 1, hot: o.hot != null ? o.hot : 1, fade: o.fade || 0 });
    // the banners behind the seats
    for (const b of G.ban) {
      const tl = p3(C, b.fr(-62, 660, 0)), tr = p3(C, b.fr(62, 660, 0)), bl = p3(C, b.fr(-62, 340, 0)), br = p3(C, b.fr(62, 340, 0));
      if (!tl || !tr || !bl || !br) continue;
      const facing = v3.dot([Math.sin(seatAng(b.i)), 0, Math.cos(seatAng(b.i))], v3.sub(C.pos, b.fr(0, 500, 0))) < 0;
      x.save(); x.beginPath(); x.moveTo(tl[0], tl[1]); x.lineTo(tr[0], tr[1]); x.lineTo(br[0], br[1]); x.lineTo(bl[0], bl[1]); x.closePath();
      if (facing) { x.clip(); x.setTransform((tr[0] - tl[0]) / 124, (tr[1] - tl[1]) / 124, (bl[0] - tl[0]) / 320, (bl[1] - tl[1]) / 320, tl[0], tl[1]); x.drawImage(K.bannerCloth(b.house, 124, 320), 0, 0); x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, 0, W, H); }
      else { x.fillStyle = '#100c0c'; x.fill(); }
      x.restore();
    }
    // the stone: dais, throne, seats, table
    drawFaces(x, C, G.F, shade);
    // a crack runs up the Blood-Throne
    if (o.crack) drawVeins(x, VEIN_CRACK(), o.crack, { map: (fx, fy) => p3(C, THRONE_BACK(fx * 0.9, 10 - fy, 14.6)), t, scale: 0.8, hot: 1 });
    // the veins up the far walls
    if (o.wall) for (const [wa, del] of [[0.25, 0], [-0.55, 0.12], [0.9, 0.2], [-1.2, 0.3]]) { const p = clamp((o.wall - del) / (1 - del)); if (p > 0) drawVeins(x, VEIN_WALL(), p, { map: (u, v) => { const a = wa + u / CH.wallR; return p3(C, [(CH.wallR - 3) * Math.sin(a), -v, (CH.wallR - 3) * Math.cos(a)]); }, t, scale: 1.1, hot: 1 }); }
    // what candles still burn
    for (const cd of o.candles || []) { const s = p3(C, [cd.p[0], cd.p[1] + 22, cd.p[2]]), b0 = p3(C, cd.p); if (s && b0) { x.fillStyle = '#8a806e'; x.fillRect(s[0] - 3.5 * s[2], s[1], 7 * s[2], b0[1] - s[1]); candleFlame(x, s[0], s[1], 9 * s[2], t, cd.p[0], cd.i, 0); } }
    // shafts of moonlight from the windows, dust in them
    x.save(); x.globalCompositeOperation = 'lighter';
    for (const wa of WINDOWS) { const top = p3(C, [920 * Math.sin(wa), 860, 920 * Math.cos(wa)]), bot = p3(C, [520 * Math.sin(wa), 0, 520 * Math.cos(wa)]); if (!top || !bot) continue; const wdt = 70 * top[2], wdb = 160 * bot[2]; const g = x.createLinearGradient(top[0], top[1], bot[0], bot[1]); const col = Math.cos(wa) > 0 ? '110,130,180' : '170,100,80'; g.addColorStop(0, `rgba(${col},0.1)`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.beginPath(); x.moveTo(top[0] - wdt, top[1]); x.lineTo(top[0] + wdt, top[1]); x.lineTo(bot[0] + wdb, bot[1]); x.lineTo(bot[0] - wdb, bot[1]); x.closePath(); x.fill(); }
    x.restore();
  }
  const OSWYN_CANDLES = [{ p: [420 * Math.sin(Math.PI + 0.28), 82, 420 * Math.cos(Math.PI + 0.28)], i: 1, r: 420 }, { p: [420 * Math.sin(Math.PI - 0.4), 82, 420 * Math.cos(Math.PI - 0.4)], i: 0.7, r: 300 }];
  // "murdered a sworn lord at his own council table": low on the floor, under the table's edge, the pool of him
  function shotBlood(x, t, sh) {
    const u = span(t, sh.a, sh.b), e = ease(u);
    const C = cam3([lerp(-120, -70, e), lerp(40, 30, e), lerp(-190, -232, e)], [lerp(30, 10, e), lerp(70, 50, e), -520], 980, 0.03);
    const cands = OSWYN_CANDLES.map((c, i) => ({ p: c.p, i: c.i * (i ? 0.5 : 0.8) * flick(t, i + 3, 9), r: c.r }));
    drawChamber(x, C, t, { pool: lerp(30, 38, smooth(u)), candles: cands, moon1: 0.6, moon2: 1 });
    // drips from the table's inner edge, falling
    const r = rng(1520);
    for (let k = 0; k < 4; k++) { const a = Math.PI + (r() - 0.5) * 0.18, top = p3(C, [376 * Math.sin(a), 66, 376 * Math.cos(a)]); if (!top) continue; const ph = fract(t * 0.7 + k * 0.31), bot = p3(C, [376 * Math.sin(a), 66 - ph * 66, 376 * Math.cos(a)]); x.strokeStyle = 'rgba(120,14,10,0.9)'; x.lineWidth = 2.5 * top[2]; x.beginPath(); x.moveTo(top[0], top[1]); x.lineTo(top[0], top[1] + 14 * top[2]); x.stroke(); if (bot) { x.fillStyle = 'rgba(150,20,12,0.9)'; x.beginPath(); x.ellipse(bot[0], bot[1], 2.5 * bot[2], 4 * bot[2], 0, 0, TAU); x.fill(); } }
    K.specks(x, t, { kind: 'dust', n: 30, alpha: 0.3, seed: 1521 });
    finish(x, { bloom: 0.35, vig: 0.75, shadow: '#26304a', shadowA: 0.2 });
  }
  // "and the land drank his blood": from above, the pool sinking into the joints of the stone
  function flagstones() {
    return K.cached('s1:flags', () => {
      const r = rng(1530), cols = 14, rows = 9, sp = 170, V = [];
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) V.push([i * sp - 230 + (i && i < cols ? (r() - 0.5) * 60 : 0), j * sp - 230 + (j && j < rows ? (r() - 0.5) * 60 : 0)]);
      const id = (i, j) => j * (cols + 1) + i, E = [];
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { if (i < cols) E.push([id(i, j), id(i + 1, j)]); if (j < rows) E.push([id(i, j), id(i, j + 1)]); }
      // arrival distance from the pool along the joints
      const P0 = [960, 540], D = V.map(v => Math.hypot(v[0] - P0[0], v[1] - P0[1]) < 260 ? Math.max(0, Math.hypot(v[0] - P0[0], v[1] - P0[1]) - 120) : 1e9);
      for (let it = 0; it < 40; it++) for (const [a, b] of E) { const l = Math.hypot(V[a][0] - V[b][0], V[a][1] - V[b][1]); if (D[a] + l < D[b]) D[b] = D[a] + l; if (D[b] + l < D[a]) D[a] = D[b] + l; }
      const c = K.canvas(W + 200, H + 200), x = c.getContext('2d');
      x.fillStyle = '#141316'; x.fillRect(0, 0, c.width, c.height);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const p = [V[id(i, j)], V[id(i + 1, j)], V[id(i + 1, j + 1)], V[id(i, j + 1)]], v = r() * 14; x.fillStyle = `rgb(${38 + v | 0},${37 + v | 0},${42 + v | 0})`; x.beginPath(); p.forEach((q, k) => { const ix = q[0] + 100 + (k === 0 || k === 3 ? 4 : -4), iy = q[1] + 100 + (k < 2 ? 4 : -4); k ? x.lineTo(ix, iy) : x.moveTo(ix, iy); }); x.closePath(); x.fill(); }
      x.globalCompositeOperation = 'multiply'; for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(50,50,56,${0.15 + r() * 0.25})`; x.beginPath(); x.ellipse(r() * c.width, r() * c.height, 6 + r() * 40, 4 + r() * 20, r() * 3, 0, TAU); x.fill(); }
      return { c, V, E, D };
    });
  }
  function shotDrink(x, t, sh) {
    const u = span(t, sh.a, sh.b + 0.3), F = flagstones();
    const c = { x: 0, y: 0, z: lerp(1.05, 1.25, ease(u)), r: lerp(0.06, -0.02, u) };
    view(x, c, 1); x.drawImage(F.c, -100, -100);
    const sink = smooth(span(t, sh.a + 0.2, sh.b - 0.1)), front = lerp(40, 1150, Math.pow(span(t, sh.a, sh.b + 0.2), 1.3));
    // the joints fill with red, outward from the pool
    x.save(); x.lineCap = 'round';
    for (const pass of [0, 1, 2]) for (const [a, b] of F.E) {
      let da = F.D[a], db = F.D[b]; if (Math.min(da, db) > front) continue;
      let A = F.V[a], B = F.V[b]; if (da > db) { [A, B] = [B, A]; [da, db] = [db, da]; }
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]), p = clamp((front - da) / L), ex = lerp(A[0], B[0], p), ey = lerp(A[1], B[1], p);
      const w = Math.max(1, 7 - da / 260);
      if (pass === 0) { x.strokeStyle = 'rgba(30,2,2,0.6)'; x.lineWidth = w * 3; }
      else if (pass === 1) { x.strokeStyle = 'rgb(120,14,10)'; x.lineWidth = w; }
      else { const hot = Math.exp(-(front - da) / 260); if (hot < 0.05) continue; x.globalCompositeOperation = 'lighter'; x.strokeStyle = `rgba(255,80,40,${hot})`; x.lineWidth = w * 0.4; }
      x.beginPath(); x.moveTo(A[0], A[1]); x.lineTo(ex, ey); x.stroke(); x.globalCompositeOperation = 'source-over';
    }
    x.restore();
    // the pool itself, sinking away into the stone
    const pr = 250 * (1 - sink);
    if (pr > 2) {
      x.save(); x.beginPath(); for (let k = 0; k <= 40; k++) { const a = k / 40 * TAU, e = pr * (1 + 0.3 * (K.fbm(Math.cos(a) * 1.4, Math.sin(a) * 1.4 + sink * 2, 3, 1531) - 0.5) * 2); k ? x.lineTo(960 + Math.cos(a) * e * 1.2, 540 + Math.sin(a) * e) : x.moveTo(960 + Math.cos(a) * e * 1.2, 540 + Math.sin(a) * e); } x.closePath();
      x.fillStyle = `rgb(${lerp(110, 60, sink) | 0},10,8)`; x.fill(); x.clip();
      x.fillStyle = 'rgba(200,210,235,0.22)'; x.beginPath(); x.ellipse(900, 470, pr * 0.5, pr * 0.12, -0.3, 0, TAU); x.fill(); x.restore();
    }
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.save(); x.globalCompositeOperation = 'multiply'; const g = x.createRadialGradient(500, 200, 60, 900, 500, 1400); g.addColorStop(0, 'rgb(200,210,236)'); g.addColorStop(0.6, 'rgb(110,112,130)'); g.addColorStop(1, 'rgb(20,20,26)'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore();
    finish(x, { bloom: 0.35, vig: 0.75 });
  }
  // "From that night...": high over the chamber, the veins root out through the floor, crack the throne, climb the walls
  function shotVeins(x, t, sh) {
    const u = span(t, sh.a, sh.b + 0.2), e = ease(u);
    const C = cam3([lerp(-60, 120, e), lerp(980, 1180, e), lerp(-1480, -1380, e)], [0, lerp(80, 120, e), lerp(-60, 0, e)], 1000);
    const vp = lerp(0.12, 0.95, easeOut(span(t, sh.a - 0.2, sh.b + 0.3)));
    drawChamber(x, C, t, { veins: vp, crack: smooth(span(t, sh.a + 0.3, sh.b)), wall: smooth(span(t, sh.a + 0.5, sh.b + 0.3)), red: vp * 0.6, candles: OSWYN_CANDLES.map(c => ({ p: c.p, i: c.i * 0.6, r: c.r })), moon1: 1, moon2: 0.7 });
    finish(x, { bloom: 0.45, vig: 0.75, shadow: '#26304a', shadowA: 0.2 });
  }
  // "...Aethelgard was cursed": the land at night from high above; the veins race out from the capital under it all
  function landImg() {
    return K.cached('s1:land', () => {
      const w = 720, h = 405, c = K.canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
      const hgt = (u, v) => K.fbm(u * 3.2, v * 3.2, 6, 1540) * 0.8 + K.fbm(u * 9, v * 9, 3, 1541) * 0.2;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const u = i / w, v = j / w, h0 = hgt(u, v), hx = hgt(u + 0.002, v), hy = hgt(u, v + 0.002), sl = (h0 - hx) * 260 + (h0 - hy) * 160;
        const lit = clamp(0.45 + sl), riv = Math.abs(K.fbm(u * 2.2 + 5, v * 2.2, 4, 1542) - 0.5) < 0.005, forest = K.fbm(u * 14, v * 14, 3, 1543) > 0.58 && h0 < 0.6;
        let col = mix([10, 16, 20], [52, 62, 70], lit * (0.4 + h0));
        if (forest) col = mix(col, [6, 12, 10], 0.6);
        if (h0 > 0.66) col = mix(col, [120, 130, 146], (h0 - 0.66) * 3 * lit);
        if (riv) col = mix(col, [44, 54, 72], 0.7);
        const k = (j * w + i) * 4; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
      }
      x.putImageData(img, 0, 0); return c;
    });
  }
  function shotLand(x, t, sh) {
    const u = span(t, sh.a, sh.b + 0.3), e = easeOut(u);
    const c = { x: 0, y: lerp(60, 0, e), z: lerp(1.5, 1.05, e), r: lerp(0.04, 0, e) };
    view(x, c, 1); x.imageSmoothingQuality = 'high'; x.drawImage(landImg(), -120, -70, W + 240, H + 140);
    // the capital: lights and the last fires, the volcano's glow beside it
    const cx = 980, cy = 660;
    const r = rng(1544); for (let i = 0; i < 60; i++) { const a = r() * TAU, d = r() * r() * 40; x.fillStyle = `rgba(255,${140 + r() * 80 | 0},70,${0.5 + r() * 0.5})`; x.fillRect(cx + Math.cos(a) * d * 1.4, cy + Math.sin(a) * d, 2, 2); }
    glow(x, [255, 110, 40], cx, cy, 120, 0.4); glow(x, [255, 80, 30], cx + 90, cy - 50, 60, 0.4);
    drawVeins(x, veinTree(1545, { roots: 22, len: 1500, step: 18, width: 6, branch: 0.05, spread: 0.6, decay: 0.994, max: 300, wiggle: 0.4 }), lerp(0.2, 1, span(t, sh.a - 0.1, sh.b + 0.25)), { map: (fx, fy) => [cx + fx * 1.4, cy + fy, 1], t, scale: 1, hot: 1 });
    x.setTransform(1, 0, 0, 1, 0, 0);
    fog(x, 1546, [60, 66, 84], 100, 500, t * 60, 0.35); fog(x, 1547, [40, 44, 58], 600, 500, -t * 50, 0.3);
    finish(x, { bloom: 0.45, vig: 0.75, shadow: '#26304a', shadowA: 0.2 });
  }
  // "The Seven never knew it": the six lords at their feast; the veins pass under their feet and fade
  function feastImg() {
    return K.cached('s1:feast', () => {
      const c = K.canvas(W + 200, H + 100), x = c.getContext('2d'), r = rng(1550);
      x.fillStyle = '#1e140e'; x.fillRect(0, 0, c.width, c.height);
      for (let row = 0; row * 66 < 760; row++) for (let X = -((row % 2) * 75); X < c.width; X += 150 + r() * 30) { const v = r() * 14; x.fillStyle = `rgb(${40 + v | 0},${30 + v | 0},${24 + v | 0})`; x.fillRect(X + 3, row * 66 + 3, 144, 60); }
      const g = x.createLinearGradient(0, 760, 0, c.height); g.addColorStop(0, '#2a1e16'); g.addColorStop(1, '#0c0806'); x.fillStyle = g; x.fillRect(0, 760, c.width, c.height - 760);
      x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2; for (let k = 0; k < 8; k++) { const y = 780 + Math.pow(k / 7, 1.6) * 320; x.beginPath(); x.moveTo(0, y); x.lineTo(c.width, y); x.stroke(); } for (let k = -12; k <= 12; k++) { x.beginPath(); x.moveTo(1060 + k * 70, 770); x.lineTo(1060 + k * 210, c.height); x.stroke(); }
      return c;
    });
  }
  const LORDS = [{ x: 330, face: 1, hat: 'hair', pose: 'cup' }, { x: 610, face: -1, hat: 'cap', pose: 'laugh' }, { x: 860, face: 1, hat: 'hood', pose: 'sleep' }, { x: 1110, face: -1, hat: 'hair', pose: 'talk', beard: 0.6 }, { x: 1370, face: 1, hat: 'cap', pose: 'eat' }, { x: 1630, face: -1, hat: 'hair', pose: 'cup', beard: 0.4 }];
  function shotFeast(x, t, sh) {
    const u = span(t, sh.a, sh.b + 0.3), c = { x: lerp(-60, 60, u), y: 0, z: lerp(1.04, 1.1, u) };
    view(x, c, 0.85); x.drawImage(feastImg(), -100, -50);
    [1, 2, 3, 4, 5, 6].forEach((hi, i) => K.banner(x, 300 + i * 264, 120, 150, 330, K.HOUSES[hi], t + i, { wind: 0.25, seed: i }));
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(-100, 0, W + 300, 500);
    view(x, c, 1);
    // the veins, under the floor, toward the table: they pass beneath the lords and die away
    const vp = easeOut(span(t, sh.a - 0.4, sh.a + 1.6)), fade = smooth(span(t, sh.a + 1.0, sh.b + 0.6));
    drawVeins(x, veinTree(1551, { roots: 5, len: 2400, step: 16, width: 9, branch: 0.07, dir: -0.25, arc: 0.45, decay: 0.993, max: 140 }), vp, { map: (fx, fy) => [-120 + fx * 0.85, 1045 - Math.pow(clamp(fx / 2400), 0.7) * 190 + fy * 0.45, 1], t, fade, hot: 0.8 });
    // the table, the lords, the candles
    const fl = flick(t, 8, 8);
    rimLit(x, (cc, fill) => {
      for (const L of LORDS) {
        const o = { x: L.x, y: 860, h: 470, face: L.face, sit: 0.32, dress: 'robe', hat: L.hat, beard: L.beard, fill, t };
        if (L.pose === 'cup') { o.armN = [2.0 + 0.2 * Math.sin(t * 2 + L.x), 0.9]; o.tilt = -0.2; }
        if (L.pose === 'laugh') { o.lean = -0.18; o.tilt = -0.6 + 0.1 * Math.sin(t * 9); o.armN = [1.2, 1.1]; }
        if (L.pose === 'sleep') { o.lean = 0.75; o.tilt = 0.7; o.armN = [1.5, 0.2]; o.armF = [1.3, 0.4]; }
        if (L.pose === 'talk') { o.armN = [1.4 + 0.3 * Math.sin(t * 3), 0.6 + 0.3 * Math.sin(t * 5)]; o.lean = 0.12; }
        if (L.pose === 'eat') { o.lean = 0.3; o.armN = [1.1 + 0.25 * Math.sin(t * 4), 1.4]; }
        const P2 = person(cc, o);
        if (L.pose === 'cup') { cc.fillStyle = fill; cc.fillRect(P2.hand[0] - 9, P2.hand[1] - 34, 18, 30); cc.fillRect(P2.hand[0] - 3, P2.hand[1] - 6, 6, 14); }
      }
      cc.fillStyle = fill; cc.fillRect(160, 700, 1660, 30);
      cc.fillStyle = fill === '#ffb070' ? '#5a3a24' : fill; cc.fillRect(170, 730, 1640, 140);
    }, { rim: '#ffb070', mid: '#6a3a1c', dark: '#120a07', dx: 0, dy: -5 });
    for (let k = 0; k < 7; k++) { const cx2 = 260 + k * 250; x.fillStyle = '#cfc2a4'; x.fillRect(cx2 - 6, 650, 12, 50); candleFlame(x, cx2, 650, 22, t, k, fl, 0); }
    x.setTransform(1, 0, 0, 1, 0, 0);
    finish(x, { bloom: 0.4, vig: 0.7, warm: '#a0602a', warmA: 0.06 });
  }

  // ================================================================ L10: one witness lived; she was carrying the son
  // A match cut from the infant's struck name to a grey bundle held in the dark, a torch passing; a small hand moves.
  function woolTex() {
    return K.cached('s1:wooltex', () => {
      const w = 512, c = K.canvas(w, w), x = c.getContext('2d'), r = rng(1560);
      x.fillStyle = '#77736e'; x.fillRect(0, 0, w, w);
      for (let i = 0; i < 7000; i++) { const px = r() * w, py = r() * w, a = r() * TAU, L = 3 + r() * 9; x.strokeStyle = r() < 0.5 ? `rgba(255,250,240,${0.05 + r() * 0.08})` : `rgba(0,0,0,${0.06 + r() * 0.09})`; x.lineWidth = 0.6 + r() * 0.8; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + 1) * L * 0.5, py + Math.sin(a + 1) * L * 0.5, px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); }
      return c;
    });
  }
  // the swaddle, lying across her arm, its head end up to the right; returns the opening's centre
  function swaddle(x, t, br) {
    const pat = x.createPattern(woolTex(), 'repeat');
    const shape = (c) => { c.beginPath(); c.moveTo(560, 760); c.bezierCurveTo(500, 600, 640, 420, 880, 330); c.bezierCurveTo(1060, 260, 1290, 240, 1380, 330); c.bezierCurveTo(1460, 420, 1400, 560, 1260, 640); c.bezierCurveTo(1060, 760, 760, 860, 560, 760); c.closePath(); };
    x.save(); x.translate(960, 560); x.scale(br, br); x.translate(-960, -560);
    shape(x); x.fillStyle = pat; x.fill();
    x.save(); shape(x); x.clip();
    // the wraps: bands of cloth across it, each with a lit edge and a fold's shadow
    for (const [k, y0] of [[0, 0], [1, 1], [2, 2], [3, 3]]) {
      const ox = 640 + k * 170, top = 300 + k * 20; void y0;
      x.fillStyle = 'rgba(0,0,0,0.38)'; x.beginPath(); x.moveTo(ox - 60, 900); x.bezierCurveTo(ox - 10, 700, ox + 60, 480, ox + 170, top); x.lineTo(ox + 196, top); x.bezierCurveTo(ox + 90, 480, ox + 26, 700, ox - 26, 900); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,246,230,0.12)'; x.beginPath(); x.moveTo(ox - 26, 900); x.bezierCurveTo(ox + 26, 700, ox + 90, 480, ox + 196, top); x.lineTo(ox + 206, top); x.bezierCurveTo(ox + 102, 480, ox + 40, 700, ox - 12, 900); x.closePath(); x.fill();
    }
    // the fold the strike became: a crease straight across the middle
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(640, 548, 640, 12); x.fillStyle = 'rgba(255,246,230,0.1)'; x.fillRect(640, 538, 640, 8);
    // light and shade: dark to the left, the torch's warmth on the right
    const g = x.createLinearGradient(560, 700, 1420, 300); g.addColorStop(0, 'rgba(0,0,0,0.8)'); g.addColorStop(0.55, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(400, 200, 1200, 800);
    x.restore();
    // the hood of the wrap and the dark where his head lies
    x.fillStyle = pat; x.beginPath(); x.ellipse(1250, 380, 190, 150, -0.35, 0, TAU); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(1250, 380, 190, 150, -0.35, 0, TAU); x.fill();
    x.fillStyle = '#0b0807'; x.beginPath(); x.ellipse(1262, 392, 112, 86, -0.35, 0, TAU); x.fill();
    x.fillStyle = '#2a1c16'; x.beginPath(); x.ellipse(1272, 404, 72, 54, -0.35, 0, TAU); x.fill();
    x.restore();
    return [1190, 436];
  }
  function shotBundle(x, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a, sh.b), br = 1 + 0.01 * Math.sin(t * 2.6), sw = K.shake(t * 0.6, 10, 1561);
    const c = { x: sw[0] + lerp(0, 30, u), y: sw[1] + lerp(0, -20, u), z: lerp(1.0, 1.07, ease(u)) };
    x.fillStyle = '#030303'; x.fillRect(0, 0, W, H);
    view(x, c, 1);
    // her cloak and the arm beneath the bundle
    x.fillStyle = '#18181a'; x.beginPath(); x.moveTo(-200, 1200); x.lineTo(-200, 700); x.bezierCurveTo(200, 640, 520, 700, 760, 820); x.bezierCurveTo(1100, 900, 1500, 800, 1800, 900); x.lineTo(1800, 1200); x.closePath(); x.fill();
    const hd = swaddle(x, t, br);
    // a small hand, out of the wrap, its fingers opening and closing
    const op = 0.5 + 0.5 * Math.sin(lt * 2.1), hx = hd[0], hy = hd[1];
    x.fillStyle = '#8a6a56'; x.beginPath(); x.ellipse(hx, hy, 24, 20, -0.4, 0, TAU); x.fill();
    for (let k = 0; k < 4; k++) { const a = -2.4 + k * 0.3 - op * 0.35; x.save(); x.translate(hx + Math.cos(a) * 14, hy + Math.sin(a) * 14); x.rotate(a); x.beginPath(); x.ellipse(6 + op * 4, 0, 8 + op * 4, 5, 0, 0, TAU); x.fill(); x.restore(); }
    x.fillStyle = '#6a5040'; x.beginPath(); x.ellipse(hx + 14, hy + 18, 12, 16, -0.4, 0, TAU); x.fill();
    // her hand round the wrap, and at her wrist the unsworn cord
    x.fillStyle = '#4a3a30'; x.beginPath(); x.moveTo(600, 760); x.bezierCurveTo(640, 660, 720, 600, 800, 610); x.bezierCurveTo(830, 640, 790, 690, 760, 720); x.bezierCurveTo(720, 780, 660, 800, 620, 800); x.closePath(); x.fill();
    for (let k = 0; k < 4; k++) { x.save(); x.translate(760 + k * 20, 612 + k * 12); x.rotate(0.1 + k * 0.18); x.beginPath(); x.ellipse(30, 0, 34 - k * 3, 9, 0, 0, TAU); x.fill(); x.restore(); }
    x.fillStyle = '#18181a'; x.beginPath(); x.moveTo(380, 820); x.bezierCurveTo(470, 760, 560, 740, 610, 750); x.lineTo(640, 830); x.bezierCurveTo(560, 860, 470, 880, 400, 900); x.closePath(); x.fill();
    x.strokeStyle = '#7a7670'; x.lineWidth = 6; for (let k = 0; k < 2; k++) { x.beginPath(); x.moveTo(598 + k * 11, 744 + k * 3); x.quadraticCurveTo(618 + k * 11, 790, 614 + k * 11, 832); x.stroke(); }
    x.fillStyle = '#7a7670'; x.beginPath(); x.arc(622, 790, 8, 0, TAU); x.fill(); x.fillRect(619, 790, 4, 30); x.fillRect(625, 792, 4, 24);
    x.setTransform(1, 0, 0, 1, 0, 0);
    // a torch passing: warm light sweeping across from the right
    const tp = fract(lt * 0.3 + 0.15), tf = flick(t, 13, 9), lxp = lerp(2000, 500, tp);
    x.save(); x.globalCompositeOperation = 'multiply'; const g = x.createRadialGradient(lxp, 250, 60, lxp, 400, 1400); g.addColorStop(0, `rgb(255,${210 * tf | 0},${160 * tf | 0})`); g.addColorStop(0.45, 'rgb(150,110,84)'); g.addColorStop(1, 'rgb(14,11,9)'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore();
    glow(x, [255, 140, 60], lxp + 200, 160, 520, 0.1 * tf);
    finish(x, { bloom: 0.3, vig: 0.8 });
  }

  // ================================================================ the cut: shots keyed to the narration (and to the pauses inside the takes)
  let EDL = null;
  function edl(sc) {
    if (EDL) return EDL;
    const c = K.cue, L01 = c('L01'), L02 = c('L02'), L05 = c('L05'), L06 = c('L06'), D01 = c('D01'), L07 = c('L07'), A01 = c('A01'), L08 = c('L08'), L09 = c('L09'), L9a = c('L09a'), L10 = c('L10');
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
      { id: 'rookery', a: L06.start - 0.25, draw: shotRookery, tin: D(0.3) },
      { id: 'rider', a: D01.start - 0.3, draw: shotRider, tin: D(0.25) },
      { id: 'wingsky', a: L07.start - 0.05, draw: shotWingSky },
      { id: 'lookup', a: L07.start + 2.3, draw: shotLookup },
      { id: 'shadow1', a: A01.start - 0.15, draw: shotShadow, tin: D(0.3) },
      { id: 'tower', a: L08.start - 0.1, draw: shotTower },
      { id: 'shadow2', a: at('L08', 0.42), draw: shotShadow },
      { id: 'spill', a: L08.end - 0.05, draw: shotSpill },
      { id: 'dawn', a: L09.start - 0.25, draw: shotDawn, tin: D(0.8) },
      { id: 'ledger', a: at('L09', 0.3), draw: shotLedger, tin: D(0.25) },
      { id: 'blood', a: L9a.start - 0.25, draw: shotBlood, tin: D(0.4) },
      { id: 'drink', a: at('L09a', 0.33), draw: shotDrink, tin: D(0.25) },
      { id: 'veins', a: at('L09a', 0.54), draw: shotVeins },
      { id: 'land', a: at('L09a', 0.72), draw: shotLand, tin: D(0.2) },
      { id: 'feast', a: at('L09a', 0.86), draw: shotFeast, tin: D(0.3) },
      { id: 'ledger2', a: L10.start - 0.15, draw: shotLedger2, tin: D(0.35) },
      { id: 'bundle', a: at('L10', 0.5), draw: shotBundle },
    ];
    for (let i = 0; i < shots.length; i++) shots[i].b = i + 1 < shots.length ? shots[i + 1].a : sc.end + 2.5;
    EDL = shots; return EDL;
  }

  Object.assign(LIB, { woolTex, swaddle, beastBelow, beastSide, rook, moonDisc, bell });

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
