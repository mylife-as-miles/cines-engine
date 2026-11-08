/* Scene 5, "A Kingdom Divided" [L25-L30]. Illuminated miniatures under real light.
   The chronicle's pages: a capital and its council hall painted in one cutaway miniature; a folio of the blood registries
   (a line of descent running through arched miniatures, one picture for each clause of L26); a frieze of the commons
   under an arcade (L27); then the council hall again as the Seven turn on one another (L28-L30).
   Every beat is keyed to the narration through K.cue(); nothing here hard-codes a second. */
(function () {
  'use strict';
  const K = window.KIT, P = K.P, W = K.W, H = K.H;
  const { clamp, lerp, smooth, ease, easeOut, easeIn, span, rng } = K;
  const SCENES = window.SCENES = window.SCENES || {};
  const DBG = {}, Q = { low: false };
  const TAU = Math.PI * 2;
  const rgba = K.rgba;

  // ---------------------------------------------------------------- palette: mineral pigments, iron-gall ink, lead white, leaf
  const M = {
    ink: '#2a190e', inkSoft: '#4a3424',
    ultra: '#2b3d84', ultraD: '#1b2758', azure: '#4b70a6', azureL: '#9ab6d2',
    verm: '#b5402a', vermD: '#86281b', rose: '#b4566b', madder: '#87304a',
    mal: '#3f7a5a', verd: '#3d6656', sap: '#66803c',
    ochre: '#c08a3a', leadtin: '#e2c15e', umber: '#6a4a2a', sienna: '#9a5a32',
    lead: '#f3ecdc', bone: '#e9e0cb', grey: '#8d9096', slate: '#56616d',
    wool: '#8e8069', woolD: '#665a4a', woolB: '#6c7b89', woolG: '#717a5f', woolR: '#8a6656', linen: '#d6caae',
    skin: '#efd4b6', skinD: '#d2a383', cheek: 'rgba(212,104,90,0.32)', hair: ['#5a3a20', '#7a4f26', '#3e2a1a', '#a8742e', '#6e6258'],
    steel: '#9aa0a8', steelD: '#5d636c', wood: '#6a4a2c', woodD: '#45301c',
  };
  const shade = (hex, k) => K.shade(hex, k);

  // ---------------------------------------------------------------- timing: phrases inside a narration line
  // at(id, phrase): the moment a phrase is spoken, estimated by its character position in the line (a comma weighs like
  // a short pause). Keyed to the cue, so a new voice re-times it.
  const AT = {};
  function at(id, phrase) {
    const key = id + '|' + phrase; if (AT[key] != null) return AT[key];
    const L = K.cue(id), s = L.text, idx = Math.max(0, s.indexOf(phrase));
    const wgt = ch => (ch === ',' ? 7 : ch === '.' || ch === ';' || ch === ':' ? 9 : 1);
    let tot = 0, pos = 0; for (let i = 0; i < s.length; i++) { if (i === idx) pos = tot; tot += wgt(s[i]); }
    return (AT[key] = L.start + (pos / tot) * (L.end - L.start));
  }

  // ---------------------------------------------------------------- small geometry
  // spline(c, pts, closed): a smooth curve through the points (Catmull-Rom as cubic Béziers)
  function spline(c, pts, closed = true, move = true) {
    const n = pts.length; if (n < 2) return;
    const Q = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    if (move) c.moveTo(pts[0][0], pts[0][1]);
    const m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const p0 = Q(i - 1), p1 = Q(i), p2 = Q(i + 1), p3 = Q(i + 2);
      c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    if (closed) c.closePath();
  }
  // a tapered stroke along points with widths (filled polygon)
  function taper(c, pts, wd) {
    const Lp = [], Rp = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = (typeof wd === 'number' ? wd : wd[i]) / 2;
      Lp.push([pts[i][0] - dy / l * w, pts[i][1] + dx / l * w]); Rp.push([pts[i][0] + dy / l * w, pts[i][1] - dx / l * w]);
    }
    c.beginPath(); c.moveTo(Lp[0][0], Lp[0][1]); for (const q of Lp) c.lineTo(q[0], q[1]); for (let i = Rp.length - 1; i >= 0; i--) c.lineTo(Rp[i][0], Rp[i][1]); c.closePath();
  }
  const bez3 = (a, b, cc, d, t) => { const u = 1 - t; return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * cc[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * cc[1] + t * t * t * d[1]]; };

  // ---------------------------------------------------------------- textures and patterns (built once)
  function noiseTex(key, s, fn) {
    return K.cached('s5:tex:' + key, () => {
      const c = K.canvas(s, s), x = c.getContext('2d'), img = x.createImageData(s, s);
      for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { const v = fn(i, j), k = (j * s + i) * 4; img.data[k] = v[0]; img.data[k + 1] = v[1]; img.data[k + 2] = v[2]; img.data[k + 3] = v[3]; }
      x.putImageData(img, 0, 0); return c;
    });
  }
  // tileable value noise: wrap the lattice at period p
  const tnoise = (x, y, p, s) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const h = (a, b) => K.hash(((a % p) + p) % p, ((b % p) + p) % p, s);
    const A = h(xi, yi), B = h(xi + 1, yi), C = h(xi, yi + 1), D = h(xi + 1, yi + 1);
    return A + (B - A) * u + (C - A) * v + (A - B - C + D) * u * v;
  };
  const tfbm = (x, y, p, s, oct = 3) => { let f = 0, a = 0.5, n = 0; for (let i = 0; i < oct; i++) { f += a * tnoise(x, y, p, s + i * 13); n += a; x *= 2; y *= 2; p *= 2; a *= 0.5; } return f / n; };
  const TEX = {
    // burnished leaf: soft mottling and fine scratches
    gold: () => noiseTex('gold', 256, (i, j) => { const r = K.hash(i, j, 515); const v = 128 + (tfbm(i / 32, j / 32, 8, 8) - 0.5) * 150 + (r - 0.5) * 38; const g = Math.max(0, Math.min(255, v)); return [g, g, g, 255]; }),
    // pigment granulation for paint (multiply)
    paint: () => noiseTex('paint', 256, (i, j) => { const r = K.hash(i, j, 77); const v = 255 - Math.pow(r, 3) * 70 - (tfbm(i / 16, j / 16, 16, 21) - 0.5) * 50; const g = Math.max(0, Math.min(255, v)); return [g, g * 0.98, g * 0.95, 255]; }),
    // woven cloth (multiply)
    weave: () => noiseTex('weave', 64, (i, j) => { const v = 236 - ((i % 4 === 0) ? 26 : 0) - ((j % 4 === 0) ? 22 : 0) - K.hash(i, j, 5) * 24; return [v, v, v, 255]; }),
  };
  const PATS = new WeakMap();
  function pat(c, name) {
    let m = PATS.get(c); if (!m) PATS.set(c, m = {});
    return m[name] || (m[name] = c.createPattern(TEX[name](), 'repeat'));
  }
  // a soft round sprite for dust and glints
  const softDot = () => K.cached('s5:softdot', () => { const s = 32, c = K.canvas(s, s), x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); return c; });

  // ---------------------------------------------------------------- gold leaf (gradient + burnish texture), cheap enough for every frame
  function goldGrad(c, x0, y0, x1, y1, s = 0.45, dim = 1) {
    const g = c.createLinearGradient(x0, y0, x1, y1), d = v => Math.round(v * dim);
    const col = (r, gg, b) => `rgb(${d(r)},${d(gg)},${d(b)})`;
    g.addColorStop(0, col(94, 64, 22)); g.addColorStop(clamp(s - 0.32), col(156, 118, 40)); g.addColorStop(clamp(s - 0.1), col(210, 174, 90));
    g.addColorStop(clamp(s), col(244, 222, 156)); g.addColorStop(clamp(s + 0.12), col(201, 160, 76)); g.addColorStop(clamp(s + 0.38), col(138, 102, 36)); g.addColorStop(1, col(92, 63, 21));
    return g;
  }
  function goldFill(c, pathFn, x0, y0, x1, y1, o = {}) {
    c.save(); pathFn(c); c.fillStyle = goldGrad(c, x0, y0, x1, y1, o.sheen != null ? o.sheen : 0.45, o.dim || 1); c.fill();
    if (o.tex !== false) { c.globalCompositeOperation = 'overlay'; c.globalAlpha *= 0.5; c.fillStyle = pat(c, 'gold'); c.fill(); }
    c.restore();
    if (o.outline !== false) { c.save(); c.globalCompositeOperation = 'multiply'; c.strokeStyle = rgba(M.ink, o.outA || 0.7); c.lineWidth = o.lw || 1.2; pathFn(c); c.stroke(); c.restore(); }
  }

  // ---------------------------------------------------------------- pseudo-script: lines of minims that read as a hand, never as words
  function script(c, x, y, w, size, seed, o = {}) {
    const r = rng(seed); let px = x; const end = x + w;
    c.save(); c.fillStyle = o.color || rgba(M.ink, 0.85); c.strokeStyle = c.fillStyle; c.lineCap = 'round';
    while (px < end - size) {
      const n = 2 + Math.floor(r() * 6);
      if (px + n * size * 0.42 > end) break;
      for (let k = 0; k < n; k++) {
        const kind = r(), h = size * (kind < 0.12 ? 1.55 : 1), dy = kind > 0.92 ? size * 0.5 : 0, top = y - h + (kind < 0.12 ? 0 : 0);
        c.lineWidth = size * 0.16; c.beginPath(); c.moveTo(px, top + size * 0.12); c.lineTo(px + size * 0.06, top); c.lineTo(px + size * 0.04, y + dy); c.lineTo(px + size * 0.16, y - size * 0.08); c.stroke();
        if (r() < 0.25) { c.lineWidth = size * 0.07; c.beginPath(); c.moveTo(px - size * 0.05, top + size * 0.35); c.lineTo(px + size * 0.28, top + size * 0.3); c.stroke(); }
        px += size * (0.3 + r() * 0.12);
      }
      px += size * (0.45 + r() * 0.3);
    }
    c.restore();
  }

  // ---------------------------------------------------------------- figures in the manner of gothic miniatures
  // fig(c, x, y, s, o): a painted person standing on (x, y), s tall (soles to crown), drawn in local units (soles 0, crown -1).
  //   o.face 1|-1, o.kind robe|gown|tunic|child|armour, o.robe colour (o.robe2 under-colour for sleeves/hose), o.mantle colour,
  //   o.fur, o.sash colour (a registry sash, with its seal), o.seal (a seal on a cord), o.hat crown|coronet|circlet|hood|coif|veil|
  //   judge|tall|kettle|chaperon|none, o.hairCol, o.beard, o.turn (head: 1 toward facing, 0 frontal, -1 the other way),
  //   o.away (0..1 turned from us), o.armN / o.armF {a, b, hand: open|point|fist|palm|hold, front}, o.sleeve 'hang',
  //   o.sway, o.lean, o.walk (phase), o.carry sack|beam|basket|bundle|book|staff|spear|halberd|bread|bowl|baby, o.light (-1 light from
  //   screen-left), o.lit (0..1 tone), o.cold (0..1 blue-grey of the commons' light), o.cut (y below which nothing is drawn, local)
  const PR = {
    adult: { hy: -0.92, hrx: 0.047, hry: 0.057, nk0: -0.868, nk1: -0.832, sh: -0.81, shw: 0.097, ch: -0.745, chw: 0.083, wy: -0.585, ww: 0.063, hpy: -0.5, hpw: 0.08, ax: 0.05, ua: 0.172, fa: 0.152, hand: 0.058, lx: 0.034, th: 0.245, sn: 0.235, foot: 0.072, sl: [0.074, 0.056, 0.042] },
    child: { hy: -0.872, hrx: 0.08, hry: 0.094, nk0: -0.785, nk1: -0.755, sh: -0.74, shw: 0.108, ch: -0.672, chw: 0.096, wy: -0.505, ww: 0.084, hpy: -0.43, hpw: 0.093, ax: 0.058, ua: 0.152, fa: 0.136, hand: 0.064, lx: 0.042, th: 0.2, sn: 0.19, foot: 0.088, sl: [0.078, 0.062, 0.048] },
  };
  const HEM = { robe: [-0.004, 0.205, 4], gown: [-0.004, 0.175, 3], tunic: [-0.27, 0.13, 3], child: [-0.215, 0.14, 3], armour: [-0.29, 0.13, 3], short: [-0.33, 0.12, 3] };
  function mixHex(a, b, k) { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const m = s => Math.round(lerp(A >> s & 255, B >> s & 255, k)); return `rgb(${m(16)},${m(8)},${m(0)})`; }
  function toHex(col) { if (col[0] === '#') return col; const m = col.match(/\d+/g).map(Number); return '#' + m.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join(''); }
  // the commons' cold light: pull a colour toward blue-grey
  const coldC = (col, k) => k > 0 ? toHex(mixHex(toHex(col), '#7f8fa3', k * 0.45)) : toHex(col);
  const darker = (col, k) => toHex(shade(toHex(col), -k)), lighter = (col, k) => toHex(mixHex(toHex(col), '#fff6e6', k));

  const TONES = new Map();
  function tones(col, kl, kd) {
    const key = col + kl + '|' + kd; let v = TONES.get(key); if (v) return v;
    const h = toHex(col), n = parseInt(h.slice(1), 16), R = n >> 16 & 255, Gc = n >> 8 & 255, Bc = n & 255;
    const mix = (a, b, k) => Math.round(a + (b - a) * k);
    v = [`rgb(${mix(R, 255, kl)},${mix(Gc, 244, kl)},${mix(Bc, 222, kl)})`, `rgb(${R},${Gc},${Bc})`, `rgb(${mix(R, 26, kd)},${mix(Gc, 12, kd)},${mix(Bc, 6, kd)})`];
    TONES.set(key, v); return v;
  }
  function fig(c, x, y, s, o = {}) {
    const f = o.face || 1, kind = o.kind || 'robe', child = kind === 'child', R = child ? PR.child : PR.adult, hem = HEM[kind] || HEM.robe;
    const cold = o.cold || 0, lt = (o.light != null ? o.light : -1) * f, lw = (o.lw || 1.5) / s, rr = rng(o.seed || 7);
    const CC = col => coldC(col, cold);
    const robeBase = toHex(o.robe || M.verm), robe = CC(robeBase), skin = CC(M.skin), hairCol = CC(o.hairCol || M.hair[0]);
    const walk = o.walk, wv = walk != null ? Math.sin(walk) : 0, bob = walk != null ? -Math.abs(Math.cos(walk)) * 0.01 : 0;
    const sway = o.sway != null ? o.sway : 0.016, lean = o.lean || 0, legsShow = ['tunic', 'child', 'armour', 'short'].includes(kind);
    const hipX = sway;
    const T = (px, py) => {
      let dx; if (py > R.hpy) dx = lerp(sway * 0.3, sway, py / R.hpy); else dx = lerp(sway, -sway * 0.5, clamp((py - R.hpy) / (R.hy - R.hpy)));
      let X = px + dx, Y = py;
      if (lean && py < R.hpy + 0.05) { const k = clamp((R.hpy + 0.05 - py) / 0.12), a = lean * k, ddx = X - hipX, ddy = Y - R.hpy; X = hipX + ddx * Math.cos(a) - ddy * Math.sin(a); Y = R.hpy + ddx * Math.sin(a) + ddy * Math.cos(a); }
      if (py < R.hpy) Y += bob;
      return [X, Y];
    };
    const fast = !!o.fast, paintPat = fast ? null : pat(c, 'paint'); if (paintPat) paintPat.setTransform(new DOMMatrix([1 / (s * f), 0, 0, 1 / s, 0, 0]));
    const ink = (alpha = 0.85, w = lw) => { c.save(); c.strokeStyle = rgba(M.ink, alpha); c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); c.restore(); };
    // fill the current path in a pigment, model it from the lit side, granulate it, rim it with light
    const paint = (col, x0, x1, o2 = {}) => {
      const st = tones(col, o2.lit != null ? o2.lit : 0.2, o2.dark != null ? o2.dark : 0.32), g = c.createLinearGradient(x0, 0, x1, 0);
      if (lt > 0) { g.addColorStop(0, st[2]); g.addColorStop(0.55, st[1]); g.addColorStop(1, st[0]); } else { g.addColorStop(0, st[0]); g.addColorStop(0.45, st[1]); g.addColorStop(1, st[2]); }
      c.fillStyle = g; c.fill();
      if (o2.extra) { c.save(); c.clip(); o2.extra(); c.restore(); }
      if (paintPat) { c.save(); c.globalCompositeOperation = 'multiply'; c.globalAlpha *= (o2.gran != null ? o2.gran : 0.6); c.fillStyle = paintPat; c.fill(); c.restore(); }
    };
    const rim = (pathFn, w = 0.022, a = 0.3) => {
      if (fast) return;
      c.save(); pathFn(); c.clip(); pathFn();
      const g = c.createLinearGradient(-0.25, 0, 0.25, 0); if (lt > 0) { g.addColorStop(0.55, 'rgba(255,236,200,0)'); g.addColorStop(1, `rgba(255,236,200,${a})`); } else { g.addColorStop(0, `rgba(255,236,200,${a})`); g.addColorStop(0.45, 'rgba(255,236,200,0)'); }
      c.strokeStyle = g; c.lineWidth = w; c.stroke(); c.restore();
    };
    c.save(); c.translate(x, y); c.scale(s * f, s);
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (o.cut != null) { c.beginPath(); c.rect(-1, -1.6, 2, 1.6 + o.cut); c.clip(); }
    const armsOnly = o.part === 'arms';
    if (o.shadow !== false && o.cut == null && !armsOnly) { c.save(); c.translate(-lt * 0.08, 0); c.scale(1, 0.11); const g = c.createRadialGradient(0, 0, 0, 0, 0, 0.27); g.addColorStop(0, 'rgba(25,14,8,0.34)'); g.addColorStop(1, 'rgba(25,14,8,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 0.27, 0, TAU); c.fill(); c.restore(); }

    // ------- legs and shoes
    const hemY = hem[0], hw = hem[1] * (o.hemW || 1);
    if (armsOnly) { /* only the arms are wanted */ } else if (legsShow) {
      const legs = [];
      for (const sd of [0, 1]) {
        const ph = (walk != null ? walk : 0) + (sd ? Math.PI : 0), th = walk != null ? 0.36 * Math.sin(ph) : (sd ? -0.035 : 0.045), flex = walk != null ? 0.05 + 0.55 * Math.max(0, Math.cos(ph)) : 0.02;
        const hx = hipX + (sd ? -R.lx : R.lx) * 0.6, kx = hx + Math.sin(th) * R.th, ky = R.hpy + Math.cos(th) * R.th, sa = th - flex;
        legs.push({ sd, hx, kx, ky, ax: kx + Math.sin(sa) * R.sn, ay: ky + Math.cos(sa) * R.sn });
      }
      const lift = -0.028 - Math.max(legs[0].ay, legs[1].ay);
      for (const lg of legs) { lg.ky += lift; lg.ay += lift; }
      const hose = CC(o.hose || (child ? M.woolD : darker(robeBase, 0.45)));
      for (const lg of [legs[1], legs[0]]) {
        const col = lg.sd ? darker(hose, 0.28) : hose;
        taper(c, [[lg.hx, R.hpy - 0.03], [lg.kx, lg.ky], [lg.ax, lg.ay]], child ? [0.066, 0.05, 0.036] : [0.06, 0.044, 0.032]); paint(col, -0.12, 0.12, { lit: 0.12, dark: 0.25 }); ink(0.75);
        c.beginPath(); c.moveTo(lg.ax - 0.022, lg.ay - 0.014); c.quadraticCurveTo(lg.ax + R.foot * 0.6, lg.ay - 0.006, lg.ax + R.foot, lg.ay + 0.024); c.lineTo(lg.ax - 0.026, lg.ay + 0.027); c.closePath(); c.fillStyle = CC(o.shoe || '#2e2016'); c.fill(); ink(0.7);
      }
    } else if (o.cut == null) {
      for (const sd of [1, 0]) { const fx = (sd ? -0.035 : 0.052) + (sd ? -1 : 1) * wv * 0.035 + sway * 0.3; c.beginPath(); c.moveTo(fx - 0.026, -0.02); c.quadraticCurveTo(fx + 0.04, -0.03, fx + 0.07, 0.003); c.lineTo(fx - 0.03, 0.005); c.closePath(); c.fillStyle = CC(o.shoe || '#2e2016'); c.fill(); ink(0.6); }
    }

    // ------- mantle behind the body
    if (o.mantle && !armsOnly) {
      const mc = CC(o.mantle), mb = legsShow ? hemY + 0.05 : -0.035;
      const pts = [T(-R.shw - 0.012, R.sh + 0.014), T(-R.chw - 0.04, R.ch + 0.07), T(-R.hpw - 0.065, -0.34), T(-hw - 0.04 + wv * 0.01, mb), T(-hw * 0.4, mb + 0.014), T(hw * 0.3, mb + 0.006), T(hw + 0.035 + wv * 0.01, mb - 0.012), T(R.hpw + 0.06, -0.34), T(R.chw + 0.035, R.ch + 0.07), T(R.shw + 0.012, R.sh + 0.014), T(0, R.sh - 0.014)];
      const mp = () => { c.beginPath(); spline(c, pts, true); };
      mp(); paint(mc, -0.32, 0.32, { lit: 0.14, dark: 0.42 }); mp(); ink(0.8);
      if (o.lining) { c.save(); mp(); c.clip(); c.fillStyle = CC(o.lining); for (const sd of [-1, 1]) { const q = [T(sd * (R.chw + 0.012), R.ch + 0.05), T(sd * (R.hpw + 0.04), -0.34), T(sd * (hw + 0.026), mb), T(sd * (hw - 0.012), mb), T(sd * (R.hpw + 0.004), -0.34), T(sd * (R.chw - 0.012), R.ch + 0.06)]; c.beginPath(); spline(c, q, true); c.fill(); } c.restore(); }
    }
    // ------- arms (the far arm goes behind the body)
    const arm = (near) => {
      const A = near ? (o.armN || {}) : (o.armF || {});
      const a = A.a != null ? A.a : (walk != null ? (near ? -0.32 : 0.3) * wv : (near ? 0.1 : -0.06));
      const b = A.b != null ? A.b : (walk != null ? 0.28 : 0.16);
      const ul = R.ua * (A.ul || 1), fl = R.fa * (A.fl || 1);
      const sh = T(near ? R.ax : -R.ax * 0.8, R.sh + 0.03), ex = sh[0] + Math.sin(a + lean) * ul, ey = sh[1] + Math.cos(a + lean) * ul;
      return { sh, e: [ex, ey], w: [ex + Math.sin(a + b + lean) * fl, ey + Math.cos(a + b + lean) * fl], dir: a + b + lean, hand: A.hand || 'open', front: A.front, col: A.col };
    };
    const armF = arm(false), armN = arm(true);
    const sleeveBase = toHex(o.sleeveCol || robeBase);
    const drawHand = (A, col) => {
      const d = [Math.sin(A.dir), Math.cos(A.dir)], n = [-d[1], d[0]], L = R.hand, w0 = A.w, P2 = (u, v) => [w0[0] + d[0] * L * u + n[0] * L * v, w0[1] + d[1] * L * u + n[1] * L * v];
      c.save(); c.fillStyle = col;
      if (A.hand === 'point') {
        c.beginPath(); spline(c, [P2(0, -0.28), P2(0.3, -0.36), P2(0.62, -0.25), P2(0.62, 0.25), P2(0.3, 0.34), P2(0.02, 0.26)], true); c.fill(); ink(0.75, lw * 0.8);
        taper(c, [P2(0.5, -0.18), P2(0.95, -0.2), P2(1.32, -0.18)], [L * 0.2, L * 0.17, L * 0.13]); c.fill(); ink(0.75, lw * 0.75);
        c.beginPath(); c.ellipse(...P2(0.5, 0.33), L * 0.18, L * 0.1, A.dir + 1.2, 0, TAU); c.fill(); ink(0.6, lw * 0.6);
      } else if (A.hand === 'fist') {
        c.beginPath(); c.ellipse(...P2(0.32, 0), L * 0.36, L * 0.32, A.dir, 0, TAU); c.fill(); ink(0.75, lw * 0.8);
      } else {
        const spr = A.hand === 'palm' ? 0.36 : 0.28;
        c.beginPath(); spline(c, [P2(0, -0.25), P2(0.45, -spr), P2(0.95, -spr * 0.8), P2(1.12, 0), P2(0.95, spr * 0.85), P2(0.45, spr), P2(0.02, 0.25)], true); c.fill(); ink(0.75, lw * 0.8);
        c.beginPath(); spline(c, [P2(0.15, spr * 0.6), P2(0.42, spr + 0.22), P2(0.62, spr + 0.24), P2(0.5, spr * 0.6)], true); c.fill(); ink(0.65, lw * 0.7);
        if (L * s > 9) { c.strokeStyle = rgba(M.ink, 0.35); c.lineWidth = lw * 0.5; for (const v of [-0.1, 0.08]) { c.beginPath(); c.moveTo(...P2(0.62, v)); c.lineTo(...P2(1.0, v * 1.1)); c.stroke(); } }
      }
      c.restore();
    };
    const drawArm = (A, near) => {
      const col = A.col ? CC(A.col) : (near ? CC(sleeveBase) : CC(darker(sleeveBase, 0.22)));
      if (o.sleeve === 'hang') {
        const m = [lerp(A.e[0], A.w[0], 0.5), lerp(A.e[1], A.w[1], 0.5)], dl = 0.26;
        const pts = [[A.e[0] + 0.01, A.e[1] - 0.01], m, [m[0] + 0.015, m[1] + dl], [m[0] - 0.03, m[1] + dl + 0.03], [A.e[0] - 0.045, A.e[1] + dl * 0.8], [A.e[0] - 0.04, A.e[1] + 0.06]];
        c.beginPath(); spline(c, pts, true); paint(CC(o.lining || darker(robeBase, 0.3)), -0.2, 0.2, { lit: 0.1 }); c.beginPath(); spline(c, pts, true); ink(0.75);
      }
      const sp = () => { taper(c, [A.sh, A.e, A.w], R.sl); };
      if (near) { c.beginPath(); c.arc(A.sh[0], A.sh[1] + 0.004, R.sl[0] * 0.5, 0, TAU); c.fillStyle = col; c.fill(); }
      sp(); paint(col, -0.22, 0.26, { lit: 0.2, dark: 0.3 }); sp(); ink(0.8);
      const d = [Math.sin(A.dir), Math.cos(A.dir)], cw = R.sl[2] * 0.55;
      c.save(); c.strokeStyle = CC(o.cuff || lighter(robeBase, 0.35)); c.lineWidth = 0.011; c.beginPath(); c.moveTo(A.w[0] - d[1] * cw - d[0] * 0.006, A.w[1] + d[0] * cw - d[1] * 0.006); c.lineTo(A.w[0] + d[1] * cw - d[0] * 0.006, A.w[1] - d[0] * cw - d[1] * 0.006); c.stroke(); c.restore();
      drawHand(A, o.glove ? CC(o.glove) : skin);
    };
    const carryBehind = () => {
      if (o.carry === 'sack') { const p = T(-0.085, R.sh - 0.03); c.save(); c.translate(p[0], p[1]); c.rotate(-0.4 + lean); c.scale(1.25, 1.25); const sp = () => { c.beginPath(); spline(c, [[-0.14, 0.02], [-0.1, -0.07], [0.04, -0.09], [0.14, -0.03], [0.12, 0.06], [-0.02, 0.09]], true); }; sp(); paint(CC('#a68f66'), -0.14, 0.14, { dark: 0.4 }); sp(); ink(0.8); c.strokeStyle = rgba(M.ink, 0.55); c.lineWidth = lw * 0.8; c.beginPath(); c.moveTo(-0.07, -0.06); c.quadraticCurveTo(-0.03, 0.0, -0.09, 0.06); c.stroke(); c.restore(); }
      if (o.carry === 'bundle') { const p = T(-0.09, R.sh + 0.09); c.beginPath(); c.ellipse(p[0], p[1], 0.075, 0.095, -0.3, 0, TAU); paint(CC('#8a7a5e'), p[0] - 0.08, p[0] + 0.08); c.beginPath(); c.ellipse(p[0], p[1], 0.075, 0.095, -0.3, 0, TAU); ink(0.8); }
      if (o.carry === 'beam') { const p = T(0, R.sh + 0.004); c.save(); c.translate(p[0], p[1]); c.rotate(-0.12 + lean * 0.5); c.beginPath(); c.rect(-0.34, -0.032, 0.66, 0.046); paint(CC(M.wood), -0.3, 0.3, { lit: 0.25 }); c.beginPath(); c.rect(-0.34, -0.032, 0.66, 0.046); ink(0.8); c.restore(); }
    };
    const carryFront = () => {
      const w0 = armN.w;
      if (o.carry === 'basket') { const p = T(0.005, R.hy - R.hry * 1.3); c.beginPath(); c.moveTo(p[0] - 0.09, p[1] - 0.06); c.lineTo(p[0] + 0.09, p[1] - 0.06); c.lineTo(p[0] + 0.065, p[1] + 0.012); c.lineTo(p[0] - 0.065, p[1] + 0.012); c.closePath(); c.fillStyle = CC('#9a7a46'); c.fill(); c.save(); c.clip(); c.strokeStyle = 'rgba(60,40,20,0.5)'; c.lineWidth = 0.006; for (let k = -6; k <= 6; k++) { c.beginPath(); c.moveTo(p[0] + k * 0.015, p[1] - 0.07); c.lineTo(p[0] + k * 0.015 + 0.02, p[1] + 0.02); c.stroke(); } c.restore(); c.beginPath(); c.moveTo(p[0] - 0.09, p[1] - 0.06); c.lineTo(p[0] + 0.09, p[1] - 0.06); c.lineTo(p[0] + 0.065, p[1] + 0.012); c.lineTo(p[0] - 0.065, p[1] + 0.012); c.closePath(); ink(0.8); }
      if (o.carry === 'book') { c.save(); c.translate(w0[0] + 0.012, w0[1] - 0.02); c.rotate(-0.15); c.beginPath(); c.rect(-0.042, -0.055, 0.08, 0.095); c.fillStyle = CC(o.bookCol || M.vermD); c.fill(); ink(0.8); c.fillStyle = CC('#e8d9b0'); c.fillRect(-0.042, -0.055, 0.013, 0.095); c.restore(); }
      if (o.carry === 'bread') { c.beginPath(); c.ellipse(w0[0] + 0.022, w0[1] - 0.004, 0.042, 0.027, 0.3, 0, TAU); paint(CC('#b8864a'), w0[0] - 0.02, w0[0] + 0.06, { lit: 0.3 }); c.beginPath(); c.ellipse(w0[0] + 0.022, w0[1] - 0.004, 0.042, 0.027, 0.3, 0, TAU); ink(0.75); }
      if (o.carry === 'bowl') { c.beginPath(); c.moveTo(w0[0] - 0.035, w0[1] - 0.012); c.quadraticCurveTo(w0[0] + 0.01, w0[1] + 0.05, w0[0] + 0.058, w0[1] - 0.012); c.closePath(); c.fillStyle = CC('#7a5a3a'); c.fill(); ink(0.75); }
      if (o.carry === 'baby') { const p = T(0.055, R.ch + 0.055); c.beginPath(); c.ellipse(p[0], p[1], 0.062, 0.088, 0.4, 0, TAU); paint(CC('#ddd3bd'), p[0] - 0.06, p[0] + 0.06); c.beginPath(); c.ellipse(p[0], p[1], 0.062, 0.088, 0.4, 0, TAU); ink(0.75); c.beginPath(); c.arc(p[0] + 0.02, p[1] - 0.075, 0.032, 0, TAU); c.fillStyle = skin; c.fill(); ink(0.7); }
      if (['staff', 'spear', 'halberd'].includes(o.carry)) {
        const top = o.carry === 'staff' ? -1.02 : -1.3;
        c.beginPath(); c.rect(w0[0] - 0.009, top, 0.018, -top - 0.008); c.fillStyle = CC(M.wood); c.fill(); ink(0.7);
        if (o.carry === 'spear') { c.beginPath(); c.moveTo(w0[0], top - 0.11); c.quadraticCurveTo(w0[0] + 0.03, top - 0.04, w0[0] + 0.012, top + 0.01); c.lineTo(w0[0] - 0.012, top + 0.01); c.quadraticCurveTo(w0[0] - 0.03, top - 0.04, w0[0], top - 0.11); c.fillStyle = CC(M.steel); c.fill(); ink(0.75); }
        if (o.carry === 'halberd') { c.beginPath(); c.moveTo(w0[0], top - 0.1); c.lineTo(w0[0] + 0.012, top); c.lineTo(w0[0] + 0.1, top + 0.02); c.quadraticCurveTo(w0[0] + 0.11, top + 0.09, w0[0] + 0.07, top + 0.13); c.lineTo(w0[0] + 0.012, top + 0.1); c.lineTo(w0[0] - 0.05, top + 0.06); c.lineTo(w0[0] - 0.012, top + 0.04); c.closePath(); paint(CC(M.steel), w0[0] - 0.05, w0[0] + 0.11, { lit: 0.4 }); c.beginPath(); c.moveTo(w0[0], top - 0.1); c.lineTo(w0[0] + 0.012, top); c.lineTo(w0[0] + 0.1, top + 0.02); c.quadraticCurveTo(w0[0] + 0.11, top + 0.09, w0[0] + 0.07, top + 0.13); c.lineTo(w0[0] + 0.012, top + 0.1); c.lineTo(w0[0] - 0.05, top + 0.06); c.lineTo(w0[0] - 0.012, top + 0.04); c.closePath(); ink(0.75); }
      }
    };
    if (o.part === 'arms') { if (armF.front) drawArm(armF, false); carryFront(); drawArm(armN, true); c.restore(); return; }
    carryBehind();
    if (!armF.front) drawArm(armF, false);

    // ------- the robe: an S-curved body, a hem broken into folds, tubular folds from the belt
    let sR;
    if (legsShow) sR = [[0.022, R.nk1 + 0.004], [0.062, R.sh - 0.012], [R.shw, R.sh + 0.014], [R.shw - 0.004, R.sh + 0.05], [R.chw, R.ch], [R.ww + 0.008, R.wy - 0.05], [R.ww, R.wy], [R.hpw, R.hpy], [hw * 0.97, lerp(R.hpy, hemY, 0.6)], [hw + wv * 0.012, hemY]];
    else sR = [[0.022, R.nk1 + 0.004], [0.062, R.sh - 0.012], [R.shw, R.sh + 0.014], [R.shw - 0.004, R.sh + 0.05], [R.chw, R.ch], [R.ww + 0.008, R.wy - 0.05], [R.ww, R.wy], [R.hpw, R.hpy], [R.hpw + 0.03, -0.38], [hw * 0.72, -0.2], [hw * 0.93 + wv * 0.01, -0.07], [hw + wv * 0.022, hemY]];
    const far = 0.9, sL = sR.map(p => [-p[0] * far, p[1]]); sL[sL.length - 1][0] += wv * 0.03;
    const hr = sR[sR.length - 1][0], hl = sL[sL.length - 1][0], nF = hem[2] + (rr() < 0.5 ? 1 : 0), folds = [];
    for (let k = 0; k < nF; k++) folds.push(clamp((k + 0.5 + (rr() - 0.5) * 0.45) / nF, 0.06, 0.94));
    const hemPts = [];
    for (let k = 0; k < nF; k++) {
      const u = folds[k], ux = lerp(hr, hl, u), un = k + 1 < nF ? (folds[k] + folds[k + 1]) / 2 : null;
      hemPts.push([ux + wv * 0.012, hemY + 0.004 + rr() * 0.003]);
      if (un != null) hemPts.push([lerp(hr, hl, un) + wv * 0.012, hemY - 0.007 - rr() * 0.006 - (walk != null ? Math.max(0, wv) * 0.02 * (1 - un) : 0)]);
    }
    const body = sR.map(p => T(p[0], p[1])).concat(hemPts.map(p => T(p[0], p[1]))).concat(sL.slice().reverse().map(p => T(p[0], p[1])));
    const bp = () => { c.beginPath(); spline(c, body, true); };
    bp();
    paint(robe, -0.27, 0.27, { lit: 0.22, dark: 0.36, extra: () => {
      const g2 = c.createLinearGradient(0, R.wy, 0, R.wy + 0.09); g2.addColorStop(0, 'rgba(20,10,5,0.3)'); g2.addColorStop(1, 'rgba(20,10,5,0)'); c.fillStyle = g2; c.fillRect(-0.4, R.wy, 0.8, 0.09);
      const top = legsShow ? R.hpy - 0.02 : R.wy + 0.015;
      for (let i = 0; i < nF; i++) {
        const u = folds[i], xw = lerp(R.ww, -R.ww * far, u) * 0.8 + (rr() - 0.5) * 0.01, xh = lerp(hr, hl, u) + wv * 0.012, bend = (rr() - 0.5) * 0.04;
        const a = T(xw, top), b = T(lerp(xw, xh, 0.45) + bend, lerp(top, hemY, 0.5)), d = T(xh, hemY + 0.004);
        const crest = (off, wdt, col) => { c.save(); c.translate(off, 0); c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(b[0], b[1], d[0], d[1]); c.strokeStyle = col; c.lineWidth = wdt; c.stroke(); c.restore(); };
        if (fast) { crest(-lt * 0.014, 0.04, 'rgba(24,12,6,0.18)'); crest(lt * 0.016, 0.022, 'rgba(255,246,228,0.14)'); }
        else { crest(-lt * 0.02, 0.05, 'rgba(24,12,6,0.12)'); crest(-lt * 0.008, 0.018, 'rgba(24,12,6,0.12)'); crest(lt * 0.016, 0.032, 'rgba(255,246,228,0.1)'); crest(lt * 0.014, 0.008, 'rgba(255,250,238,0.14)'); }
        c.beginPath(); const m1 = bez3(a, b, b, d, 0.25); c.moveTo(m1[0], m1[1]); c.quadraticCurveTo(b[0], b[1], d[0], d[1]); c.strokeStyle = rgba(M.ink, 0.42); c.lineWidth = lw * 0.7; c.stroke();
      }
      const g3 = c.createLinearGradient(0, hemY - 0.09, 0, hemY + 0.01); g3.addColorStop(0, 'rgba(20,10,5,0)'); g3.addColorStop(1, 'rgba(20,10,5,0.26)'); c.fillStyle = g3; c.fillRect(-0.4, hemY - 0.09, 0.8, 0.1);
      if (o.trim) { c.strokeStyle = CC(o.trim); c.lineWidth = 0.014; c.beginPath(); spline(c, hemPts.map(p => T(p[0], p[1] - 0.01)), false); c.stroke(); }
    } });
    rim(bp, 0.026, 0.3);
    bp(); ink(0.9, lw * 1.15);

    // ------- belt, sash and seal, collar, cape, device
    if (o.belt !== false) { const a = T(-R.ww * far - 0.004, R.wy), b = T(R.ww + 0.004, R.wy); c.save(); c.strokeStyle = CC(o.beltCol || '#3a2614'); c.lineWidth = 0.016; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); if (o.beltGold) { c.strokeStyle = 'rgba(232,200,120,0.9)'; c.lineWidth = 0.005; c.stroke(); } c.restore(); }
    if (o.sash) {
      const p0 = T(-R.shw * 0.72, R.sh + 0.012), p1 = T(R.ww * 0.95, R.wy + 0.03);
      c.save(); bp(); c.clip();
      taper(c, [p0, [lerp(p0[0], p1[0], 0.5) + 0.006, lerp(p0[1], p1[1], 0.5)], p1], child ? 0.05 : 0.036); c.fillStyle = CC(o.sash); c.fill();
      c.strokeStyle = 'rgba(236,206,128,0.9)'; c.lineWidth = 0.0045; c.stroke();
      c.restore();
      sealDisc(c, p1[0] - 0.004, p1[1] + 0.006, child ? 0.034 : 0.025, cold, o.sealGlint || 0);
    }
    if (o.seal) {
      const nk = T(0, R.nk1 + 0.012), p = T(0.012, R.ch + (child ? 0.075 : 0.06));
      c.save(); c.strokeStyle = CC('#9a2a1c'); c.lineWidth = child ? 0.008 : 0.006; c.beginPath(); c.moveTo(nk[0] - 0.036, nk[1]); c.quadraticCurveTo(p[0] - 0.03, p[1] - 0.012, p[0], p[1] - 0.02); c.quadraticCurveTo(p[0] + 0.03, p[1] - 0.012, nk[0] + 0.036, nk[1]); c.stroke(); c.restore();
      sealDisc(c, p[0], p[1], child ? 0.038 : 0.027, cold, o.sealGlint || 0);
    }
    if (o.fur || o.collar) {
      const pts = [T(-R.shw * far - 0.006, R.sh + 0.018), T(-R.shw * 0.5, R.sh - 0.012), T(0, R.nk1 - 0.002), T(R.shw * 0.5, R.sh - 0.012), T(R.shw + 0.006, R.sh + 0.018), T(R.shw * 0.55, R.sh + 0.052), T(0.01, R.sh + 0.078), T(-R.shw * 0.5, R.sh + 0.052)];
      c.beginPath(); spline(c, pts, true); paint(CC(o.fur ? '#efe9dc' : o.collar), -0.1, 0.1, { lit: 0.25, dark: 0.25 });
      if (o.fur) { c.save(); c.beginPath(); spline(c, pts, true); c.clip(); c.strokeStyle = 'rgba(120,110,95,0.35)'; c.lineWidth = 0.004; const r = rng(9); for (let k = 0; k < 26; k++) { const q = T(lerp(-R.shw, R.shw, r()), R.sh + r() * 0.06); c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(q[0] + 0.006, q[1] + 0.014); c.stroke(); } c.restore(); }
      c.beginPath(); spline(c, pts, true); ink(0.75);
    }
    if (o.cape) {
      const pts = [T(-R.shw * far - 0.022, R.sh + 0.075), T(-R.shw * 0.7, R.sh - 0.012), T(0, R.nk1 - 0.012), T(R.shw * 0.7, R.sh - 0.012), T(R.shw + 0.022, R.sh + 0.075), T(R.shw * 0.5, R.sh + 0.11), T(0, R.sh + 0.12), T(-R.shw * 0.55, R.sh + 0.105)];
      const cp = () => { c.beginPath(); spline(c, pts, true); };
      cp(); paint(CC(o.cape), -0.16, 0.16, { lit: 0.16, dark: 0.32 }); rim(cp, 0.02, 0.25); cp(); ink(0.8);
    }
    if (o.device) { const p = T(0.008, R.ch + 0.065); c.save(); c.fillStyle = CC(o.device.charge); K.device(c, o.device.device, p[0], p[1], 0.075); c.restore(); }

    // ------- near arm, what is held
    if (armF.front) drawArm(armF, false);
    carryFront();
    drawArm(armN, true);

    // ------- neck and head
    const turn = o.turn != null ? o.turn : 0.7, away = o.away || 0, sd = Math.sign(turn || 1);
    const nb = T(0, R.nk1 + 0.012), nt = T(0, R.nk0 - 0.01);
    c.beginPath(); c.moveTo(nb[0] - 0.019, nb[1]); c.lineTo(nt[0] - 0.017, nt[1]); c.lineTo(nt[0] + 0.021, nt[1]); c.lineTo(nb[0] + 0.021, nb[1]); c.closePath(); c.fillStyle = darker(skin, 0.12); c.fill();
    const hc = T(0.004, R.hy), hx = hc[0] + 0.006 * turn, hy = hc[1], rx = R.hrx, ry = R.hry;
    const hat = o.hat || 'none', covered = hat === 'hood' || hat === 'coif' || hat === 'kettle' || hat === 'veil';
    if (hat === 'veil') { const pts = [[hx - rx * 1.25, hy - ry * 0.3], [hx - rx * 0.2, hy - ry * 1.32], [hx + rx * 1.2, hy - ry * 0.45], [hx + rx * 0.9, hy + ry * 1.1], [hx + rx * 0.4, hy + ry * 2.6], [hx - rx * 1.6, hy + ry * 2.9], [hx - rx * 1.6, hy + ry * 0.9]]; c.beginPath(); spline(c, pts, true); paint(CC(o.veilCol || M.lead), hx - rx * 1.6, hx + rx * 1.3, { lit: 0.12, dark: 0.25 }); c.beginPath(); spline(c, pts, true); ink(0.75); }
    const long = o.long || (child && o.long !== false) ? 1 : 0;
    if (!covered) {
      // hair: a rounded cap with curled ends at the nape
      const back = -sd, pts = [[hx + sd * rx * 0.92, hy - ry * 0.42], [hx + sd * rx * 0.45, hy - ry * 1.08], [hx - sd * rx * 0.5, hy - ry * 1.12], [hx + back * rx * 1.2, hy - ry * 0.3], [hx + back * rx * 1.16, hy + ry * (0.55 + long * 0.55)], [hx + back * rx * 0.75, hy + ry * (0.95 + long * 0.5)], [hx + back * rx * 0.25, hy + ry * (0.62 + long * 0.45)], [hx + back * rx * 0.1, hy - ry * 0.25]];
      const hp = () => { c.beginPath(); spline(c, pts, true); };
      hp(); paint(hairCol, hx - rx * 1.2, hx + rx * 1.2, { lit: 0.25, dark: 0.3 }); hp(); ink(0.75);
      c.save(); c.strokeStyle = rgba(M.ink, 0.4); c.lineWidth = lw * 0.6; for (let k = 0; k < 3; k++) { const yy = hy + ry * (0.2 + k * 0.28 + long * 0.3); c.beginPath(); c.arc(hx + back * rx * (0.82 - k * 0.12), yy, rx * 0.17, 0, Math.PI * 1.4); c.stroke(); } c.restore();
    }
    const face = () => { c.beginPath(); c.ellipse(hx, hy, rx, ry, 0, 0, TAU); if (Math.abs(turn) > 0.35 && away < 0.5) { const k = clamp((Math.abs(turn) - 0.35) / 0.65); c.moveTo(hx + sd * rx * 0.88, hy - ry * 0.16); c.quadraticCurveTo(hx + sd * rx * (1.04 + 0.16 * k), hy + ry * 0.08, hx + sd * rx * (1.02 + 0.08 * k), hy + ry * 0.22); c.lineTo(hx + sd * rx * 0.84, hy + ry * 0.36); c.closePath(); } };
    face(); paint(skin, hx - rx, hx + rx, { lit: 0.18, dark: 0.2, gran: 0.18, extra: () => { const g = c.createLinearGradient(0, hy + ry * 0.4, 0, hy + ry); g.addColorStop(0, 'rgba(150,80,50,0)'); g.addColorStop(1, 'rgba(150,80,50,0.18)'); c.fillStyle = g; c.fillRect(hx - rx * 1.3, hy, rx * 2.6, ry * 1.2); } });
    c.beginPath(); c.ellipse(hx, hy, rx, ry, 0, 0, TAU); ink(0.8);
    const fa = 1 - smooth(away * 1.6);
    if (fa > 0.02) {
      c.save(); c.globalAlpha *= fa;
      const fx = hx + rx * 0.42 * turn;
      c.fillStyle = M.cheek; c.beginPath(); c.ellipse(fx + rx * 0.12 * sd, hy + ry * 0.32, rx * 0.3, ry * 0.18, 0, 0, TAU); c.fill();
      for (const [ex, sz] of [[fx + rx * 0.3, 1 - 0.25 * Math.max(0, -turn)], [fx - rx * 0.38, 1 - 0.5 * Math.max(0, turn)]]) {
        if (sz < 0.45) continue; const ew = rx * 0.17 * sz, ey = hy - ry * 0.06;
        c.beginPath(); c.moveTo(ex - ew, ey); c.quadraticCurveTo(ex, ey - ry * 0.12, ex + ew, ey); c.quadraticCurveTo(ex, ey + ry * 0.07, ex - ew, ey); c.fillStyle = 'rgba(250,244,232,0.95)'; c.fill();
        c.fillStyle = rgba(M.ink, 0.92); c.beginPath(); c.arc(ex + ew * 0.25 * sd, ey - ry * 0.005, rx * 0.07, 0, TAU); c.fill();
        c.strokeStyle = rgba(M.ink, 0.7); c.lineWidth = lw * 0.6; c.beginPath(); c.moveTo(ex - ew, ey); c.quadraticCurveTo(ex, ey - ry * 0.12, ex + ew, ey); c.stroke();
        c.beginPath(); c.moveTo(ex - ew * 1.1, ey - ry * 0.2); c.quadraticCurveTo(ex, ey - ry * 0.32, ex + ew * 1.15, ey - ry * 0.22); c.stroke();
      }
      c.strokeStyle = rgba(M.ink, 0.55); c.lineWidth = lw * 0.65;
      c.beginPath(); c.moveTo(fx - rx * 0.02, hy - ry * 0.1); c.quadraticCurveTo(fx + rx * 0.1 + rx * 0.25 * turn, hy + ry * 0.2, fx + rx * 0.02 + rx * 0.16 * turn, hy + ry * 0.3); c.quadraticCurveTo(fx - rx * 0.06, hy + ry * 0.31, fx - rx * 0.1, hy + ry * 0.26); c.stroke();
      c.fillStyle = 'rgba(168,58,46,0.85)'; c.beginPath(); c.ellipse(fx + rx * 0.02, hy + ry * 0.53, rx * 0.15, ry * 0.045, 0, 0, TAU); c.fill();
      if (o.beard) { const pts = [[hx - sd * rx * 0.95, hy + ry * 0.05], [hx - sd * rx * 0.7, hy + ry * 0.62], [fx - sd * rx * 0.2, hy + ry * 0.7], [fx + sd * rx * 0.25, hy + ry * 0.62], [fx + sd * rx * 0.55, hy + ry * 0.55], [fx + sd * rx * 0.45, hy + ry * 1.05], [fx + sd * rx * 0.1, hy + ry * 1.42], [hx - sd * rx * 0.5, hy + ry * 1.05]]; const bp2 = () => { c.beginPath(); spline(c, pts, true); }; bp2(); paint(hairCol, hx - rx, hx + rx, { lit: 0.2 }); bp2(); ink(0.7); }
      c.restore();
    }
    if (away > 0 && !covered) { c.save(); c.globalAlpha *= smooth(away); c.beginPath(); c.ellipse(hx, hy - ry * 0.04, rx * 1.05, ry * 1.04, 0, 0, TAU); paint(hairCol, hx - rx, hx + rx, { lit: 0.22 }); c.beginPath(); c.ellipse(hx, hy - ry * 0.04, rx * 1.05, ry * 1.04, 0, 0, TAU); ink(0.75); c.restore(); }
    // headgear
    const gold = (pathFn, x0, y0, x1, y1) => goldFill(c, pathFn, x0, y0, x1, y1, { sheen: o.sheen != null ? o.sheen : 0.5, lw: lw * 0.9, dim: 1 - cold * 0.3 });
    if (hat === 'crown' || hat === 'coronet' || hat === 'circlet') {
      const cy0 = hy - ry * 0.6, cw = rx * 1.1, chh = ry * (hat === 'crown' ? 0.78 : hat === 'coronet' ? 0.46 : 0.18), np = hat === 'circlet' ? 0 : 5;
      gold(cc => { cc.beginPath(); cc.moveTo(hx - cw, cy0 + ry * 0.12); cc.lineTo(hx - cw, cy0 - chh * 0.55);
        for (let k = 0; k < np; k++) { const u0 = k / np, u1 = (k + 0.5) / np, u2 = (k + 1) / np; cc.lineTo(lerp(hx - cw, hx + cw, u0), cy0 - chh * 0.55); cc.quadraticCurveTo(lerp(hx - cw, hx + cw, u1) - cw * 0.08, cy0 - chh * 0.8, lerp(hx - cw, hx + cw, u1), cy0 - chh * (k % 2 ? 0.95 : 1.22)); cc.quadraticCurveTo(lerp(hx - cw, hx + cw, u1) + cw * 0.08, cy0 - chh * 0.8, lerp(hx - cw, hx + cw, u2), cy0 - chh * 0.55); }
        cc.lineTo(hx + cw, cy0 - chh * 0.55); cc.lineTo(hx + cw, cy0 + ry * 0.12); cc.quadraticCurveTo(hx, cy0 + ry * 0.26, hx - cw, cy0 + ry * 0.12); cc.closePath(); }, hx - cw, cy0 - chh, hx + cw, cy0);
      if (hat !== 'circlet') { c.save(); c.fillStyle = CC(M.verm); c.beginPath(); c.arc(hx, cy0 - chh * 0.12, rx * 0.12, 0, TAU); c.fill(); c.fillStyle = CC(M.ultra); for (const k of [-0.6, 0.6]) { c.beginPath(); c.arc(hx + cw * k, cy0 - chh * 0.1, rx * 0.08, 0, TAU); c.fill(); } c.restore(); }
    } else if (hat === 'hood' || hat === 'chaperon') {
      const hc2 = CC(o.hoodCol || o.cape || M.wool);
      const pts = [[hx + sd * rx * 1.08, hy + ry * 0.9], [hx + sd * rx * 1.36, hy - ry * 0.7], [hx + sd * rx * 0.2, hy - ry * 1.48], [hx - sd * rx * 1.42, hy - ry * 0.9], [hx - sd * rx * 1.78, hy + ry * 0.6], [hx - sd * rx * 1.1, hy + ry * 1.62], [hx + sd * rx * 0.5, hy + ry * 1.46]];
      const hp = () => { c.beginPath(); spline(c, pts, true); c.moveTo(hx + sd * rx * 0.97, hy + ry * 0.78); c.bezierCurveTo(hx + sd * rx * 1.12, hy - ry * 0.4, hx + sd * rx * 0.4, hy - ry * 1.02, hx - sd * rx * 0.28, hy - ry * 0.78); c.bezierCurveTo(hx - sd * rx * 0.62, hy - ry * 0.1, hx - sd * rx * 0.1, hy + ry * 0.92, hx + sd * rx * 0.97, hy + ry * 0.78); };
      hp(); c.fillStyle = hc2; c.fill('evenodd'); c.save(); hp(); c.clip('evenodd'); { const g = c.createLinearGradient(hx - rx * 1.6, 0, hx + rx * 1.6, 0); g.addColorStop(lt > 0 ? 0 : 1, 'rgba(26,12,6,0.34)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(lt > 0 ? 1 : 0, 'rgba(255,240,220,0.14)'); c.fillStyle = g; c.fillRect(hx - rx * 2, hy - ry * 2, rx * 4, ry * 4); if (paintPat) { c.globalCompositeOperation = 'multiply'; c.globalAlpha *= 0.6; c.fillStyle = paintPat; c.fillRect(hx - rx * 2, hy - ry * 2, rx * 4, ry * 4); } } c.restore();
      hp(); ink(0.8);
      if (hat === 'chaperon') { c.beginPath(); c.ellipse(hx - sd * rx * 0.1, hy - ry * 1.0, rx * 1.3, ry * 0.42, 0, 0, TAU); paint(hc2, hx - rx * 1.3, hx + rx * 1.3, { lit: 0.2 }); c.beginPath(); c.ellipse(hx - sd * rx * 0.1, hy - ry * 1.0, rx * 1.3, ry * 0.42, 0, 0, TAU); ink(0.8); }
    } else if (hat === 'coif') {
      const cp = () => { c.beginPath(); c.moveTo(hx + sd * rx * 0.86, hy - ry * 0.42); c.bezierCurveTo(hx + sd * rx * 0.7, hy - ry * 1.3, hx - sd * rx * 1.3, hy - ry * 1.3, hx - sd * rx * 1.18, hy + ry * 0.2); c.quadraticCurveTo(hx - sd * rx * 1.05, hy + ry * 0.95, hx - sd * rx * 0.2, hy + ry * 1.05); c.lineTo(hx + sd * rx * 0.3, hy + ry * 1.0); c.quadraticCurveTo(hx - sd * rx * 0.25, hy + ry * 0.4, hx - sd * rx * 0.2, hy - ry * 0.35); c.quadraticCurveTo(hx + sd * rx * 0.2, hy - ry * 0.62, hx + sd * rx * 0.86, hy - ry * 0.42); c.closePath(); };
      cp(); paint(CC(M.lead), hx - rx * 1.2, hx + rx, { lit: 0.12, dark: 0.22 }); cp(); ink(0.75);
    } else if (hat === 'veil') {
      c.beginPath(); c.moveTo(hx - rx * 1.2, hy - ry * 0.3); c.quadraticCurveTo(hx, hy - ry * 1.5, hx + rx * 1.15, hy - ry * 0.45); c.quadraticCurveTo(hx + rx * 0.7, hy - ry * 0.85, hx, hy - ry * 0.95); c.quadraticCurveTo(hx - rx * 0.8, hy - ry * 0.8, hx - rx * 1.2, hy - ry * 0.3); c.closePath(); c.fillStyle = CC(o.veilCol || M.lead); c.fill(); ink(0.7);
      c.beginPath(); c.moveTo(hx - rx * 0.95, hy + ry * 0.2); c.quadraticCurveTo(hx, hy + ry * 1.45, hx + rx * 0.95, hy + ry * 0.35); c.lineTo(hx + rx * 0.9, hy + ry * 1.2); c.quadraticCurveTo(hx, hy + ry * 1.7, hx - rx * 1.0, hy + ry * 1.2); c.closePath(); c.fillStyle = CC(M.lead); c.fill(); ink(0.65);
      if (o.circlet) gold(cc => { cc.beginPath(); cc.ellipse(hx, hy - ry * 0.72, rx * 1.05, ry * 0.16, 0, 0, TAU); }, hx - rx, hy - ry, hx + rx, hy - ry * 0.5);
    } else if (hat === 'judge') {
      const jp = () => { c.beginPath(); c.ellipse(hx, hy - ry * 0.7, rx * 1.12, ry * 0.62, 0, Math.PI, TAU); c.lineTo(hx + rx * 1.12, hy - ry * 0.55); c.lineTo(hx - rx * 1.12, hy - ry * 0.55); c.closePath(); };
      jp(); paint(CC(o.hatCol || M.vermD), hx - rx * 1.1, hx + rx * 1.1, { lit: 0.22 }); jp(); ink(0.8);
      c.save(); c.strokeStyle = CC('#e9dcc0'); c.lineWidth = ry * 0.22; c.beginPath(); c.moveTo(hx - rx * 1.14, hy - ry * 0.6); c.lineTo(hx + rx * 1.14, hy - ry * 0.6); c.stroke(); c.restore();
    } else if (hat === 'tall') {
      const tp = () => { c.beginPath(); c.moveTo(hx - rx * 1.0, hy - ry * 0.55); c.lineTo(hx - rx * 0.85, hy - ry * 2.0); c.quadraticCurveTo(hx, hy - ry * 2.25, hx + rx * 0.85, hy - ry * 2.0); c.lineTo(hx + rx * 1.0, hy - ry * 0.55); c.closePath(); };
      tp(); paint(CC(o.hatCol || M.ink), hx - rx, hx + rx, { lit: 0.2, dark: 0.2 }); tp(); ink(0.8);
    } else if (hat === 'kettle') {
      const mp = () => { c.beginPath(); c.moveTo(hx - rx * 1.05, hy - ry * 0.4); c.lineTo(hx - rx * 1.25, hy + ry * 1.4); c.quadraticCurveTo(hx, hy + ry * 1.9, hx + rx * 1.2, hy + ry * 1.3); c.lineTo(hx + rx * 0.98, hy + ry * 0.8); c.quadraticCurveTo(hx + rx * 0.3, hy + ry * 1.1, hx - rx * 0.2, hy + ry * 0.7); c.lineTo(hx - rx * 0.5, hy - ry * 0.4); c.closePath(); };
      mp(); paint(CC(M.steelD), hx - rx, hx + rx, { lit: 0.25 }); c.save(); mp(); c.clip(); c.strokeStyle = 'rgba(20,20,26,0.35)'; c.lineWidth = 0.003; for (let k = -12; k < 20; k++) { c.beginPath(); c.moveTo(hx - rx * 1.4, hy - ry * 0.4 + k * 0.008); c.lineTo(hx + rx * 1.4, hy - ry * 0.4 + k * 0.008); c.stroke(); } c.restore(); mp(); ink(0.75);
      const kp = () => { c.beginPath(); c.moveTo(hx - rx * 1.95, hy - ry * 0.32); c.quadraticCurveTo(hx, hy - ry * 0.64, hx + rx * 1.95, hy - ry * 0.32); c.lineTo(hx + rx * 1.06, hy - ry * 0.62); c.quadraticCurveTo(hx, hy - ry * 1.9, hx - rx * 1.06, hy - ry * 0.62); c.closePath(); };
      kp(); paint(CC(M.steel), hx - rx * 1.9, hx + rx * 1.9, { lit: 0.45, dark: 0.4 }); kp(); ink(0.85);
    }
    c.restore();
  }
  // a registry seal: a gold disc with a red wax heart, and a glint when the light finds it
  function sealDisc(c, x, y, r, cold = 0, glint = 0) {
    goldFill(c, cc => { cc.beginPath(); cc.arc(x, y, r, 0, TAU); }, x - r, y - r, x + r, y + r, { sheen: 0.4, lw: r * 0.12, dim: 1 - cold * 0.25 });
    c.save(); c.fillStyle = coldC('#a32a1e', cold); c.beginPath(); c.arc(x, y, r * 0.52, 0, TAU); c.fill(); c.restore();
    if (glint > 0) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, 0, x - r * 0.3, y - r * 0.35, r * 2.2); g.addColorStop(0, `rgba(255,236,180,${0.85 * glint})`); g.addColorStop(1, 'rgba(255,236,180,0)'); c.fillStyle = g; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.35, r * 2.2, 0, TAU); c.fill(); c.restore(); }
  }


  // ---------------------------------------------------------------- frames, pages, architecture (used while building caches)
  // archPath(c, x, y, w, h, ah): a rectangle whose top is a pointed (gothic) arch ah tall, apex at y
  function archPath(c, x, y, w, h, ah, begin = true) {
    const sy = y + ah, mx = x + w / 2;
    if (begin) c.beginPath();
    c.moveTo(x, y + h); c.lineTo(x, sy);
    c.bezierCurveTo(x, sy - ah * 0.56, mx - w * 0.27, y + ah * 0.1, mx, y);
    c.bezierCurveTo(mx + w * 0.27, y + ah * 0.1, x + w, sy - ah * 0.56, x + w, sy);
    c.lineTo(x + w, y + h); c.closePath();
  }
  // a gold-leaf frame band on raised gesso: shadow on the vellum, burnished band, ink rules and a coloured fillet inside
  function frameBand(B, x, y, w, h, ah, bw, o = {}) {
    const c = B.x, outer = cc => archPath(cc, x, y, w, h, ah), inner = cc => archPath(cc, x + bw, y + bw * 1.15, w - 2 * bw, h - 2 * bw, ah - bw * 0.6, false);
    const band = cc => { outer(cc); inner(cc); };
    c.save(); c.filter = 'blur(6px)'; c.translate(7, 9); band(c); c.fillStyle = 'rgba(40,24,10,0.45)'; c.fill('evenodd'); c.restore();
    c.save(); band(c); c.clip('evenodd');
    c.fillStyle = goldGrad(c, x, y, x + w, y + h, 0.38); c.fillRect(x - 20, y - 20, w + 40, h + 40);
    c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.5; c.fillStyle = pat(c, 'gold'); c.fillRect(x - 20, y - 20, w + 40, h + 40);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    // bevel: light on the upper-left faces of the raised band, shade on the lower-right
    c.lineWidth = bw * 0.5; c.strokeStyle = 'rgba(255,240,200,0.35)'; c.save(); c.translate(-bw * 0.18, -bw * 0.18); outer(c); c.stroke(); c.restore();
    c.strokeStyle = 'rgba(60,36,10,0.35)'; c.save(); c.translate(bw * 0.2, bw * 0.2); archPath(c, x + bw, y + bw * 1.15, w - 2 * bw, h - 2 * bw, ah - bw * 0.6); c.stroke(); c.restore();
    // punched dots along the middle of the band
    c.fillStyle = 'rgba(80,50,16,0.45)';
    c.restore();
    if (B.m) { B.m.save(); band(B.m); B.m.fillStyle = '#fff'; B.m.fill('evenodd'); B.m.restore(); }
    c.save(); c.strokeStyle = rgba(M.ink, 0.85); c.lineWidth = 2; outer(c); c.stroke(); archPath(c, x + bw, y + bw * 1.15, w - 2 * bw, h - 2 * bw, ah - bw * 0.6); c.stroke();
    c.strokeStyle = o.fillet || M.verm; c.lineWidth = 5; archPath(c, x + bw + 4, y + bw * 1.15 + 4, w - 2 * bw - 8, h - 2 * bw - 8, ah - bw * 0.6 - 3); c.stroke();
    c.strokeStyle = rgba(M.ink, 0.6); c.lineWidth = 1.2; archPath(c, x - 9, y - 10, w + 18, h + 19, ah + 6); c.stroke();
    c.restore();
  }
  // gold drawn into a cache and its sheen mask
  function G(B, pathFn, x0, y0, x1, y1, o = {}) { goldFill(B.x, pathFn, x0, y0, x1, y1, o); if (B.m) { B.m.save(); pathFn(B.m); B.m.fillStyle = o.maskA ? `rgba(255,255,255,${o.maskA})` : '#fff'; B.m.fill(); B.m.restore(); } }
  // a cache with a gold mask: world size w x h at resolution rs (mask at rsm)
  function makeCache(w, h, rs, rsm) {
    const c = K.canvas(w * rs, h * rs), x = c.getContext('2d'); x.scale(rs, rs);
    let m = null, mx = null; if (rsm) { m = K.canvas(w * rsm, h * rsm); mx = m.getContext('2d'); mx.scale(rsm, rsm); }
    return { c, x, m, mx: mx, w, h, B: { x, m: mx } };
  }
  // granulate a whole painted area (multiply), as pigment on skin
  function granulate(c, pathFn, a = 0.35) { c.save(); pathFn(c); c.clip(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = a; c.fillStyle = pat(c, 'paint'); c.fillRect(-5000, -5000, 10000, 10000); c.restore(); }
  // a flat painted shape: pigment, modelling gradient, ink outline
  function painted(c, pathFn, col, o = {}) {
    c.save(); pathFn(c); c.fillStyle = col; c.fill(o.evenodd ? 'evenodd' : 'nonzero');
    if (o.grad) { c.clip(o.evenodd ? 'evenodd' : 'nonzero'); const [x0, y0, x1, y1] = o.grad; const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, `rgba(255,244,222,${o.lit != null ? o.lit : 0.18})`); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(24,12,6,${o.dark != null ? o.dark : 0.3})`); c.fillStyle = g; c.fillRect(Math.min(x0, x1) - 2000, Math.min(y0, y1) - 2000, 4000, 4000); }
    c.restore();
    if (o.ink !== false) { c.save(); pathFn(c); c.strokeStyle = rgba(M.ink, o.inkA || 0.8); c.lineWidth = o.lw || 1.6; c.lineJoin = 'round'; c.stroke(); c.restore(); }
  }
  // stained glass in a pointed lancet
  function lancet(c, cx, top, w, h, seed, o = {}) {
    const p = cc => archPath(cc, cx - w / 2, top, w, h, w * 0.75);
    c.save(); p(c); c.fillStyle = '#1b2240'; c.fill(); c.clip();
    const r = rng(seed), cols = o.cols || ['#3f63b4', '#2b3f86', '#9b2f2a', '#c49a3a', '#4d7fbf', '#7a2a4a'];
    const st = w / 3.2;
    for (let j = -1; j < h / st + 2; j++) for (let i = -2; i < 4; i++) { const px = cx - w / 2 + i * st + (j % 2) * st / 2, py = top + j * st * 0.9; c.beginPath(); c.moveTo(px, py - st * 0.5); c.lineTo(px + st / 2, py); c.lineTo(px, py + st * 0.5); c.lineTo(px - st / 2, py); c.closePath(); c.fillStyle = cols[Math.floor(r() * cols.length)]; c.globalAlpha = 0.75 + r() * 0.25; c.fill(); c.globalAlpha = 1; c.strokeStyle = 'rgba(20,16,20,0.9)'; c.lineWidth = Math.max(1, w * 0.035); c.stroke(); }
    const g = c.createRadialGradient(cx, top + h * 0.35, 0, cx, top + h * 0.35, h * 0.8); g.addColorStop(0, 'rgba(255,250,230,0.35)'); g.addColorStop(1, 'rgba(255,250,230,0)'); c.fillStyle = g; c.fillRect(cx - w, top, w * 2, h);
    c.restore();
    c.save(); p(c); c.strokeStyle = o.stone || '#8f8270'; c.lineWidth = Math.max(3, w * 0.12); c.stroke(); c.strokeStyle = rgba(M.ink, 0.85); c.lineWidth = 1.4; c.stroke(); c.restore();
  }
  // diaper: a lozenge lattice with dots, as behind a miniature's figures
  function diaper(c, x, y, w, h, base, line, dot, step = 36) {
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.fillStyle = base; c.fillRect(x, y, w, h);
    c.strokeStyle = line; c.lineWidth = Math.max(1.2, step * 0.06);
    for (let k = -h / step - 2; k < w / step + h / step + 2; k++) { c.beginPath(); c.moveTo(x + k * step, y); c.lineTo(x + k * step + h, y + h); c.stroke(); c.beginPath(); c.moveTo(x + k * step, y); c.lineTo(x + k * step - h, y + h); c.stroke(); }
    c.fillStyle = dot;
    for (let j = 0; j <= h / step * 2 + 1; j++) for (let i = 0; i <= w / step + 1; i++) { const px = x + i * step + (j % 2) * step / 2, py = y + j * step / 2; c.beginPath(); c.arc(px, py, step * 0.07, 0, TAU); c.fill(); for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2; c.beginPath(); c.arc(px + Math.cos(a) * step * 0.13, py + Math.sin(a) * step * 0.13, step * 0.045, 0, TAU); c.fill(); } }
    c.restore();
  }
  // ashlar: stone courses with a little colour variation
  function ashlar(c, x, y, w, h, base, seed, ch = 40, cw = 70) {
    const r = rng(seed); c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.fillStyle = base; c.fillRect(x, y, w, h);
    for (let j = 0; j * ch < h; j++) { const off = (j % 2) * cw / 2; for (let i = -1; i * cw < w + cw; i++) { const px = x + i * cw + off, py = y + j * ch; c.fillStyle = `rgba(${r() < 0.5 ? '255,248,232' : '60,40,24'},${0.04 + r() * 0.07})`; c.fillRect(px + 1, py + 1, cw - 2, ch - 2); } }
    c.strokeStyle = 'rgba(70,50,32,0.35)'; c.lineWidth = 1.3;
    for (let j = 0; j * ch < h; j++) { c.beginPath(); c.moveTo(x, y + j * ch); c.lineTo(x + w, y + j * ch); c.stroke(); const off = (j % 2) * cw / 2; for (let i = -1; i * cw < w + cw; i++) { c.beginPath(); c.moveTo(x + i * cw + off, y + j * ch); c.lineTo(x + i * cw + off, y + (j + 1) * ch); c.stroke(); } }
    c.restore();
  }
  // a parchment tile for pages (mirrored when tiled, so no seams show)
  const vellumTile = () => K.cached('s5:vellum', () => K.parchment(1024, 1024, 5150, { edge: 0, stains: 2, foxing: 10 }));
  function vellum(c, x0, y0, x1, y1, o = {}) {
    const T = vellumTile(), s = o.scale || 1, tw = T.width * s, th = T.height * s;
    for (let j = Math.floor(y0 / th); j * th < y1; j++) for (let i = Math.floor(x0 / tw); i * tw < x1; i++) {
      c.save(); c.translate(i * tw + (i & 1 ? tw : 0), j * th + (j & 1 ? th : 0)); c.scale(i & 1 ? -s : s, j & 1 ? -s : s); c.drawImage(T, 0, 0); c.restore();
    }
  }
  // a page: vellum with darkened, deckled edges and its shadow on the desk beneath
  function page(B, x, y, w, h, seed) {
    const c = B.x;
    c.save(); c.fillStyle = 'rgba(0,0,0,0.5)'; c.filter = 'blur(18px)'; c.fillRect(x + 14, y + 22, w, h); c.restore();
    const r = rng(seed), edge = [];
    const N = 60; for (let k = 0; k < N; k++) edge.push([x + w * k / N, y + (r() - 0.5) * 5]); for (let k = 0; k < N; k++) edge.push([x + w + (r() - 0.5) * 5, y + h * k / N]); for (let k = 0; k < N; k++) edge.push([x + w - w * k / N, y + h + (r() - 0.5) * 5]); for (let k = 0; k < N; k++) edge.push([x + (r() - 0.5) * 5, y + h - h * k / N]);
    c.save(); c.beginPath(); c.moveTo(edge[0][0], edge[0][1]); for (const q of edge) c.lineTo(q[0], q[1]); c.closePath(); c.clip();
    vellum(c, x, y, x + w, y + h, { scale: 1.3 });
    const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, 'rgba(90,60,30,0.35)'); g.addColorStop(0.06, 'rgba(90,60,30,0)'); g.addColorStop(0.94, 'rgba(90,60,30,0)'); g.addColorStop(1, 'rgba(90,60,30,0.35)'); c.fillStyle = g; c.fillRect(x, y, w, h);
    const g2 = c.createLinearGradient(0, y, 0, y + h); g2.addColorStop(0, 'rgba(90,60,30,0.3)'); g2.addColorStop(0.05, 'rgba(90,60,30,0)'); g2.addColorStop(0.95, 'rgba(90,60,30,0)'); g2.addColorStop(1, 'rgba(90,60,30,0.32)'); c.fillStyle = g2; c.fillRect(x, y, w, h);
    c.restore();
    c.save(); c.beginPath(); c.moveTo(edge[0][0], edge[0][1]); for (const q of edge) c.lineTo(q[0], q[1]); c.closePath(); c.strokeStyle = 'rgba(70,46,22,0.5)'; c.lineWidth = 1.5; c.stroke(); c.restore();
  }
  // marginal vine: an ink tendril with ivy leaves in gold and colour (bas-de-page work)
  function vine(B, pts, seed, o = {}) {
    const c = B.x, r = rng(seed), line = K.bez(pts, 24);
    c.save(); c.strokeStyle = rgba(M.ink, 0.8); c.lineWidth = o.w || 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(line[0][0], line[0][1]); for (const q of line) c.lineTo(q[0], q[1]); c.stroke(); c.restore();
    for (let i = 4; i < line.length - 2; i += o.every || 7) {
      const q = line[i], a = Math.atan2(line[i + 1][1] - q[1], line[i + 1][0] - q[0]) + (i % 2 ? 1 : -1) * (0.8 + r() * 0.6), L = (o.leaf || 22) * (0.7 + r() * 0.5);
      const tip = [q[0] + Math.cos(a) * L * 1.6, q[1] + Math.sin(a) * L * 1.6];
      c.save(); c.strokeStyle = rgba(M.ink, 0.7); c.lineWidth = 1.2; c.beginPath(); c.moveTo(q[0], q[1]); c.quadraticCurveTo(q[0] + Math.cos(a + 0.4) * L, q[1] + Math.sin(a + 0.4) * L, tip[0], tip[1]); c.stroke(); c.restore();
      const leaf = cc => { cc.beginPath(); cc.save(); cc.translate(tip[0], tip[1]); cc.rotate(a); cc.moveTo(-L * 0.1, 0); cc.bezierCurveTo(L * 0.2, -L * 0.55, L * 0.7, -L * 0.45, L * 0.85, 0); cc.bezierCurveTo(L * 0.7, L * 0.45, L * 0.2, L * 0.55, -L * 0.1, 0); cc.restore(); };
      const kind = r();
      if (kind < 0.45) G(B, leaf, tip[0] - L, tip[1] - L, tip[0] + L, tip[1] + L, { lw: 1 });
      else painted(c, leaf, kind < 0.75 ? M.verm : M.ultra, { lw: 1, inkA: 0.7 });
    }
  }

  // ---------------------------------------------------------------- camera and screen-space light
  const CAM = { x: 0, y: 0, z: 1, r: 0 };
  function setCam(c, v) { c.setTransform(1, 0, 0, 1, 0, 0); K.cam(c, v.x, v.y, v.z, v.r || 0); }
  function scr(v, x, y) { const dx = x - v.x, dy = y - v.y, co = Math.cos(v.r || 0), si = Math.sin(v.r || 0); return [W / 2 + v.z * (co * dx - si * dy), H / 2 + v.z * (si * dx + co * dy)]; }
  // camera from keys, plus a slow breathing drift so it is never parked
  function camAt(t, keys, seed = 1, amp = 1) {
    const v = K.camPath(t, keys);
    v.x += amp * (10 * Math.sin(t * 0.23 + seed) + 6 * Math.sin(t * 0.41 + seed * 2)) / v.z;
    v.y += amp * (7 * Math.sin(t * 0.19 + seed * 3) + 4 * Math.sin(t * 0.37 + seed)) / v.z;
    v.r = (v.r || 0) + amp * 0.0035 * Math.sin(t * 0.13 + seed);
    return v;
  }
  // light: the page darkens away from a pool of light (one gradient, multiplied), and a soft haze where it is brightest
  function pool(c, x, y, r, col, amb, haze = 0.0, sx = 1) {
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'multiply';
    c.translate(x, y); c.scale(sx, 1);
    const g = c.createRadialGradient(0, 0, r * 0.05, 0, 0, r * 1.5); g.addColorStop(0, `rgb(${col})`); g.addColorStop(0.3, `rgb(${col.map((v, i) => Math.round(lerp(v, amb[i], 0.35)))})`); g.addColorStop(0.667, `rgb(${amb})`); g.addColorStop(1, `rgb(${amb.map(v => Math.round(v * 0.45))})`);
    c.fillStyle = g; c.fillRect(-x / sx - 10, -y - 10, W / sx + 20, H + 20); c.restore();
    if (haze > 0) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'screen'; const g2 = c.createRadialGradient(x, y, 0, x, y, r * 0.7); g2.addColorStop(0, `rgba(${col},${haze})`); g2.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g2; c.fillRect(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4); c.restore(); }
  }
  // a shaft of light through the air, with the dust that drifts in it
  function beam(c, t, x0, y0, x1, y1, w0, w1, col, a, seed, nDust = 90) {
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'screen';
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.6, `rgba(${col},${a * 0.55})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.filter = 'none';
    for (const k of [1, 0.5]) { c.globalAlpha = 0.6; c.beginPath(); c.moveTo(x0 + nx * w0 * k, y0 + ny * w0 * k); c.lineTo(x1 + nx * w1 * k, y1 + ny * w1 * k); c.lineTo(x1 - nx * w1 * k, y1 - ny * w1 * k); c.lineTo(x0 - nx * w0 * k, y0 - ny * w0 * k); c.closePath(); c.fill(); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'lighter';
    const r = rng(seed), dot = softDot();
    for (let i = 0; i < nDust; i++) {
      const u = r(), v = (r() - 0.5) * 2, sp = 0.004 + r() * 0.01, ph = r() * TAU, z = 0.4 + r() * 0.6;
      const uu = (u + t * sp) % 1, vv = v + 0.18 * Math.sin(t * 0.35 * z + ph);
      const wd = lerp(w0, w1, uu), px = x0 + dx * uu + nx * wd * vv + 6 * Math.sin(t * 0.5 + ph), py = y0 + dy * uu + ny * wd * vv + 4 * Math.cos(t * 0.4 + ph);
      const inb = clamp(1 - Math.abs(vv)) * (1 - uu * 0.7), tw = 0.55 + 0.45 * Math.sin(t * (1.1 + z) + ph * 3);
      const s = (1.2 + z * 2.6);
      c.globalAlpha = clamp(inb * tw * 0.85 * a * 6);
      c.drawImage(dot, px - s * 2, py - s * 2, s * 4, s * 4);
    }
    c.restore();
  }
  // a gold glint: the leaf (from a mask cache) catches the light around a moving spot. Built at a third of the resolution.
  function sheen(c, mask, rx, ry, rw, rh, v, sx, sy, sr, a, col = '255,232,170') {
    if (a <= 0.01) return;
    const q = 3, L = K.layer('s5:sheen', W / q, H / q), x = L.getContext('2d');
    const bx = Math.max(0, sx - sr), by = Math.max(0, sy - sr), bw = Math.min(W, sx + sr) - bx, bh = Math.min(H, sy + sr) - by; if (bw <= 0 || bh <= 0) return;
    x.save(); x.scale(1 / q, 1 / q); x.beginPath(); x.rect(bx, by, bw, bh); x.clip(); K.cam(x, v.x, v.y, v.z, v.r || 0); x.drawImage(mask, rx, ry, rw, rh); x.restore();
    x.save(); x.scale(1 / q, 1 / q); x.globalCompositeOperation = 'source-in'; const g = x.createRadialGradient(sx, sy, 0, sx, sy, sr); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.5, `rgba(${col},${a * 0.35})`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore();
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'lighter'; c.drawImage(L, bx / q, by / q, bw / q, bh / q, bx, by, bw, bh); c.restore();
  }
  // a candle near the lens, out of focus: a soft bloom and a blurred flame at a corner of the frame (screen space)
  function readerCandle(c, t, x, y, a) {
    const fl = 1 + 0.08 * (K.noise(t * 6, 4, 8) - 0.5) + 0.05 * Math.sin(t * 11), dot = softDot();
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'lighter';
    const R = 760 * fl, g = c.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(255,170,80,${0.17 * a})`); g.addColorStop(0.3, `rgba(230,120,50,${0.07 * a})`); g.addColorStop(1, 'rgba(160,60,20,0)'); c.fillStyle = g; c.fillRect(Math.max(0, x - R), Math.max(0, y - R), 2 * R, 2 * R);
    c.restore();
  }
  // a candle flame (screen-independent: drawn in world units), with its halo
  function flame(c, x, y, s, t, seed, o = {}) {
    const fl = K.noise(t * 7 + seed, seed, 3) - 0.5, fl2 = K.noise(t * 13 + seed * 2, 1, 4) - 0.5, lean = (o.lean || 0) + fl * 0.25, hgt = s * (1 + fl2 * 0.25) * (o.k != null ? o.k : 1);
    if (hgt <= 0.5) return;
    c.save(); c.translate(x, y); c.rotate(lean * 0.3);
    c.globalCompositeOperation = 'lighter';
    const hg = c.createRadialGradient(0, -hgt * 0.45, 0, 0, -hgt * 0.45, hgt * 3.2); hg.addColorStop(0, `rgba(255,190,110,${0.35 * (o.glow || 1)})`); hg.addColorStop(1, 'rgba(255,150,60,0)'); c.fillStyle = hg; c.beginPath(); c.arc(0, -hgt * 0.45, hgt * 3.2, 0, TAU); c.fill();
    c.globalCompositeOperation = 'source-over';
    const w = hgt * 0.32;
    c.beginPath(); c.moveTo(0, -hgt); c.bezierCurveTo(w * 0.5 + lean * hgt * 0.3, -hgt * 0.55, w, -hgt * 0.15, 0, 0); c.bezierCurveTo(-w, -hgt * 0.15, -w * 0.5 + lean * hgt * 0.3, -hgt * 0.55, 0, -hgt); c.closePath();
    const g = c.createLinearGradient(0, -hgt, 0, 0); g.addColorStop(0, 'rgba(255,200,110,0.0)'); g.addColorStop(0.25, 'rgba(255,190,100,0.9)'); g.addColorStop(0.7, 'rgba(255,244,210,1)'); g.addColorStop(0.92, 'rgba(120,140,220,0.85)'); g.addColorStop(1, 'rgba(60,60,160,0.4)');
    c.fillStyle = g; c.fill();
    c.restore();
  }

  // ================================================================ THE HALL: the capital above, the council chamber cut open below
  const HW = 1400, HH = 1640, HARCH = 320, HB = 28;
  const HALLP = { x: -180, y: -170, w: 1760, h: 2000 };
  const LORD_X = i => 700 + (i - 3) * 160;
  const TABLE = { x0: 180, x1: 1220, top: 1192, front: 1224, base: 1402 };
  const ROD_Y = 754, BAN_W = 112, BAN_H = 232;
  const CANDLES = [300, 460, 620, 780, 940, 1100];
  const hallInner = (cc, begin = true) => archPath(cc, HB, HB * 1.15, HW - 2 * HB, HH - 2 * HB, HARCH - HB * 0.6, begin);
  const VPX = 700, VPY = 880;

  function hallPage() {
    return K.cached('s5:hall:page', () => {
      const C = makeCache(HALLP.w, HALLP.h, 0.62, 0), x = C.x; x.translate(-HALLP.x, -HALLP.y);
      page(C.B, HALLP.x, HALLP.y, HALLP.w, HALLP.h, 31);
      // ruling and the text block beneath the miniature
      x.save(); x.strokeStyle = 'rgba(150,90,60,0.18)'; x.lineWidth = 1; for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(0, 1702 + k * 26); x.lineTo(HW, 1702 + k * 26); x.stroke(); } x.restore();
      for (let k = 0; k < 4; k++) script(x, k ? 10 : 70, 1724 + k * 26, k === 3 ? 700 : HW - 20, 15, 400 + k, { color: rgba(M.ink, 0.8) });
      painted(x, cc => { cc.beginPath(); cc.rect(4, 1690, 52, 56); }, M.ultra, { lw: 1.2 });
      G(C.B, cc => { cc.beginPath(); cc.moveTo(16, 1736); cc.lineTo(30, 1698); cc.lineTo(44, 1736); cc.lineTo(38, 1736); cc.lineTo(30, 1714); cc.lineTo(22, 1736); cc.closePath(); }, 10, 1690, 50, 1740, { lw: 0.8 });
      vine(C.B, [[-70, 1760], [-120, 1400], [-40, 1100], [-100, 760], [-150, 500], [-60, 260], [-110, 40], [-60, -80], [20, -110], [80, -60]], 77, { leaf: 20 });
      vine(C.B, [[1470, -80], [1530, 200], [1440, 520], [1500, 880], [1550, 1200], [1450, 1500], [1520, 1700], [1400, 1790], [1250, 1770], [1200, 1700]], 78, { leaf: 20 });
      return C.c;
    });
  }

  // the capital: towers with conical roofs, a wall, roofs in ultramarine slate and vermilion tile
  function tower(B, cx, top, base, w, roofH, wall, roof, seed, o = {}) {
    const x = B.x, r = rng(seed);
    painted(x, cc => { cc.beginPath(); cc.rect(cx - w / 2, top, w, base - top); }, wall, { grad: [cx - w / 2, 0, cx + w / 2, 0], lit: 0.25, dark: 0.35, lw: 1.4 });
    x.save(); x.strokeStyle = 'rgba(70,50,30,0.3)'; x.lineWidth = 1; for (let yy = top + 16; yy < base; yy += 16) { x.beginPath(); x.moveTo(cx - w / 2, yy); x.lineTo(cx + w / 2, yy); x.stroke(); } x.restore();
    for (let k = 0; k < (o.win || 2); k++) { const wy = top + 30 + k * (base - top - 50) / Math.max(1, (o.win || 2)), ww = Math.max(5, w * 0.16); painted(x, cc => archPath(cc, cx - ww / 2, wy, ww, ww * 2.4, ww * 0.7), '#1e1a24', { lw: 1 }); }
    if (o.crenel) { for (let k = 0; k < 5; k++) painted(x, cc => { cc.beginPath(); cc.rect(cx - w / 2 - 4 + k * (w + 8) / 5, top - 14, (w + 8) / 5 * 0.6, 16); }, wall, { lw: 1.2 }); return; }
    const rp = cc => { cc.beginPath(); cc.moveTo(cx - w / 2 - 8, top + 4); cc.quadraticCurveTo(cx - w * 0.18, top - roofH * 0.45, cx, top - roofH); cc.quadraticCurveTo(cx + w * 0.18, top - roofH * 0.45, cx + w / 2 + 8, top + 4); cc.closePath(); };
    painted(x, rp, roof, { grad: [cx - w / 2, 0, cx + w / 2, 0], lit: 0.3, dark: 0.4, lw: 1.4 });
    x.save(); rp(x); x.clip(); x.strokeStyle = 'rgba(40,20,10,0.35)'; x.lineWidth = 1.1; for (let yy = top - roofH; yy < top + 6; yy += 9) { for (let xx = cx - w; xx < cx + w; xx += 12) { x.beginPath(); x.arc(xx + ((yy / 9) % 2) * 6, yy, 6, 0, Math.PI); x.stroke(); } } x.restore();
    G(B, cc => { cc.beginPath(); cc.arc(cx, top - roofH - 6, Math.max(4, w * 0.07), 0, TAU); }, cx - 8, top - roofH - 14, cx + 8, top - roofH, { lw: 1 });
  }
  function hallBack() {
    return K.cached('s5:hall:back', () => {
      const C = makeCache(HW, HH, 1.2, 0.5), x = C.x, B = C.B;
      x.save(); hallInner(x); x.clip(); if (C.mx) { C.mx.save(); hallInner(C.mx); C.mx.clip(); }
      // ---- the gold sky, tooled with punched dots and faint rays
      G(B, cc => { cc.beginPath(); cc.rect(0, 0, HW, 660); }, 0, 60, HW, 600, { sheen: 0.5, outline: false });
      x.save(); x.globalCompositeOperation = 'multiply';
      x.strokeStyle = 'rgba(120,78,24,0.2)'; x.lineWidth = 2.2; for (let k = 0; k < 46; k++) { const a = Math.PI * (0.02 + 0.96 * k / 45); x.beginPath(); x.moveTo(700, 40); x.lineTo(700 + Math.cos(a) * 1500, 40 + Math.sin(a) * 1500); x.stroke(); }
      x.fillStyle = 'rgba(105,66,18,0.42)'; for (let j = 0; j < 32; j++) for (let i = 0; i < 58; i++) { const px = i * 25 + (j % 2) * 12.5, py = 20 + j * 21; x.beginPath(); x.arc(px, py, 1.7, 0, TAU); x.fill(); }
      x.restore();
      // ---- far towers, pale with distance
      const far = [[120, 520, 50, 250], [235, 540, 36, 170], [395, 500, 46, 280], [560, 520, 36, 210], [845, 505, 44, 270], [1000, 530, 38, 190], [1160, 500, 48, 260], [1285, 540, 38, 180]];
      far.forEach(([cx, base, w, h], i) => tower(B, cx, base - h, base, w, w * 1.7, '#bfc3c0', ['#8b9db0', '#7d9a8c', '#a07c6a'][i % 3], 20 + i, { win: 1 }));
      // houses and the city wall
      const r = rng(41);
      for (let i = 0; i < 16; i++) { const cx = 60 + i * 85 + r() * 20, w = 60 + r() * 30, top = 470 + r() * 30, rh = 40 + r() * 25; painted(x, cc => { cc.beginPath(); cc.rect(cx - w / 2, top, w, 120); }, '#d8cbb0', { grad: [cx - w / 2, 0, cx + w / 2, 0], lw: 1.2 }); painted(x, cc => { cc.beginPath(); cc.moveTo(cx - w / 2 - 6, top + 2); cc.lineTo(cx, top - rh); cc.lineTo(cx + w / 2 + 6, top + 2); cc.closePath(); }, i % 3 ? M.verm : M.vermD, { grad: [cx - w / 2, 0, cx + w / 2, 0], lit: 0.25, lw: 1.2 }); painted(x, cc => archPath(cc, cx - 6, top + 22, 12, 22, 6), '#2a2028', { lw: 0.8 }); }
      painted(x, cc => { cc.beginPath(); cc.rect(0, 548, HW, 70); }, '#cbb68e', { grad: [0, 548, 0, 618], lit: 0.2, dark: 0.3, lw: 1.4 });
      for (let k = 0; k < 40; k++) painted(x, cc => { cc.beginPath(); cc.rect(k * 36 + 4, 532, 22, 18); }, '#cbb68e', { lw: 1.1 });
      // ---- the hall's roof, its flanking towers and lantern spire
      const roof = cc => { cc.beginPath(); cc.moveTo(210, 612); cc.lineTo(700, 318); cc.lineTo(1190, 612); cc.closePath(); };
      painted(x, roof, M.ultra, { grad: [300, 330, 1100, 612], lit: 0.25, dark: 0.35, lw: 1.8 });
      x.save(); roof(x); x.clip(); x.strokeStyle = 'rgba(160,190,230,0.32)'; x.lineWidth = 1.4; for (let k = -40; k < 40; k++) { x.beginPath(); x.moveTo(700 + k * 26, 300); x.lineTo(700 + k * 26 + 330, 640); x.stroke(); x.beginPath(); x.moveTo(700 + k * 26, 300); x.lineTo(700 + k * 26 - 330, 640); x.stroke(); } x.restore();
      for (let k = 0; k < 3; k++) { const dx = 480 + k * 220, dy = 520 - (k === 1 ? 70 : 0); painted(x, cc => { cc.beginPath(); cc.rect(dx - 24, dy, 48, 50); }, '#d6c7a6', { lw: 1.2 }); painted(x, cc => { cc.beginPath(); cc.moveTo(dx - 32, dy + 4); cc.lineTo(dx, dy - 34); cc.lineTo(dx + 32, dy + 4); cc.closePath(); }, M.ultraD, { lw: 1.2 }); painted(x, cc => archPath(cc, dx - 9, dy + 12, 18, 30, 9), '#2a2232', { lw: 0.9 }); }
      for (let k = 0; k < 18; k++) { const u = k / 17, px = lerp(210, 700, u), py = lerp(612, 318, u); if (k % 2 === 0) G(B, cc => { cc.beginPath(); cc.moveTo(px - 6, py); cc.lineTo(px, py - 16); cc.lineTo(px + 6, py); cc.closePath(); }, px - 6, py - 16, px + 6, py, { lw: 0.8 }); const qx = lerp(1190, 700, u), qy = lerp(612, 318, u); if (k % 2 === 0) G(B, cc => { cc.beginPath(); cc.moveTo(qx - 6, qy); cc.lineTo(qx, qy - 16); cc.lineTo(qx + 6, qy); cc.closePath(); }, qx - 6, qy - 16, qx + 6, qy, { lw: 0.8 }); }
      tower(B, 700, 290, 340, 64, 160, '#ddd0b0', M.ultraD, 63, { win: 1 });
      // the facade gable before the roof, with an oculus of tracery
      const gab = cc => { cc.beginPath(); cc.moveTo(470, 614); cc.lineTo(470, 520); cc.lineTo(700, 372); cc.lineTo(930, 520); cc.lineTo(930, 614); cc.closePath(); };
      painted(x, gab, '#d8c9a6', { grad: [470, 0, 930, 0], lit: 0.3, dark: 0.3, lw: 1.8 });
      x.save(); gab(x); x.clip(); ashlar(x, 460, 360, 480, 260, 'rgba(0,0,0,0)', 64, 26, 52); x.restore();
      painted(x, cc => { cc.beginPath(); cc.arc(700, 512, 62, 0, TAU); }, '#1d2448', { lw: 2 });
      x.save(); x.beginPath(); x.arc(700, 512, 60, 0, TAU); x.clip(); for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + k * TAU / 7; x.fillStyle = K.HOUSES[k].field; x.beginPath(); x.moveTo(700, 512); x.arc(700, 512, 60, a, a + TAU / 7); x.closePath(); x.fill(); x.fillStyle = K.HOUSES[k].charge; K.device(x, K.HOUSES[k].device, 700 + Math.cos(a + TAU / 14) * 40, 512 + Math.sin(a + TAU / 14) * 40, 15); } x.restore();
      x.save(); x.strokeStyle = '#cbb991'; x.lineWidth = 5; for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + k * TAU / 7; x.beginPath(); x.moveTo(700, 512); x.lineTo(700 + Math.cos(a) * 60, 512 + Math.sin(a) * 60); x.stroke(); } x.beginPath(); x.arc(700, 512, 22, 0, TAU); x.stroke(); x.beginPath(); x.arc(700, 512, 62, 0, TAU); x.stroke(); x.strokeStyle = rgba(M.ink, 0.8); x.lineWidth = 1.4; x.stroke(); x.restore();
      for (const gx of [520, 880]) painted(x, cc => archPath(cc, gx - 16, 548, 32, 60, 16), '#1e1a28', { lw: 1.2 });
      G(B, cc => { cc.beginPath(); cc.arc(700, 362, 8, 0, TAU); }, 692, 354, 708, 370, { lw: 1 });
      tower(B, 200, 360, 640, 150, 140, '#d9cba9', M.verm, 61, { win: 3 });
      tower(B, 1200, 330, 640, 150, 120, '#d9cba9', M.verd, 62, { win: 3 });
      // ---- the cut: a carved cornice where the front wall is taken away
      painted(x, cc => { cc.beginPath(); cc.rect(0, 612, HW, 48); }, '#bfae8c', { grad: [0, 612, 0, 660], lit: 0.25, dark: 0.35, lw: 1.6 });
      for (let k = 0; k < 28; k++) { const px = 16 + k * 50; painted(x, cc => { cc.beginPath(); cc.moveTo(px, 660); cc.lineTo(px, 640); cc.quadraticCurveTo(px + 25, 618, px + 50, 640); cc.lineTo(px + 50, 660); cc.closePath(); }, '#a89676', { lw: 1 }); }
      x.save(); x.fillStyle = M.vermD; x.fillRect(0, 656, HW, 8); x.restore();
      // ---- the interior: a starred vault, side walls, the back wall, a floor in perspective
      const vault = cc => { cc.beginPath(); cc.moveTo(0, 664); cc.lineTo(HW, 664); cc.lineTo(1232, 712); cc.lineTo(168, 712); cc.closePath(); };
      painted(x, vault, '#1d2a5c', { grad: [0, 664, 0, 712], lit: 0.1, lw: 1.4 });
      x.save(); vault(x); x.clip(); for (let k = 0; k < 70; k++) { const px = 20 + (k * 97) % 1360, py = 668 + (k * 37) % 42; G(B, cc => { cc.beginPath(); for (let q = 0; q < 8; q++) { const a = q * Math.PI / 4, rr2 = q % 2 ? 1.4 : 4; cc.lineTo(px + Math.cos(a) * rr2, py + Math.sin(a) * rr2); } cc.closePath(); }, px - 4, py - 4, px + 4, py + 4, { outline: false }); } x.restore();
      // side walls
      const lw2 = cc => { cc.beginPath(); cc.moveTo(0, 664); cc.lineTo(168, 712); cc.lineTo(168, 1302); cc.lineTo(0, 1430); cc.closePath(); };
      const rw2 = cc => { cc.beginPath(); cc.moveTo(HW, 664); cc.lineTo(1232, 712); cc.lineTo(1232, 1302); cc.lineTo(HW, 1430); cc.closePath(); };
      x.save(); lw2(x); x.clip(); ashlar(x, 0, 660, 170, 780, '#a8987c', 81, 34, 44); x.fillStyle = 'rgba(40,24,12,0.32)'; x.fillRect(0, 660, 170, 780); x.restore();
      x.save(); rw2(x); x.clip(); ashlar(x, 1230, 660, 170, 780, '#b3a385', 82, 34, 44); x.fillStyle = 'rgba(40,24,12,0.2)'; x.fillRect(1230, 660, 170, 780); x.restore();
      lancet(x, 104, 800, 64, 300, 91);
      lancet(x, 1296, 820, 56, 260, 92, { cols: ['#2b3f86', '#3f63b4', '#6b2a3a', '#a07a30'] });
      x.save(); x.strokeStyle = rgba(M.ink, 0.6); x.lineWidth = 1.4; lw2(x); x.stroke(); rw2(x); x.stroke(); x.restore();
      // back wall: stone above, a frieze, the rod; a cloth of honour behind the chairs
      ashlar(x, 168, 712, 1064, 600, '#c7b591', 83, 38, 76);
      x.save(); const gw = x.createLinearGradient(0, 712, 0, 1300); gw.addColorStop(0, 'rgba(40,24,12,0.3)'); gw.addColorStop(1, 'rgba(40,24,12,0)'); x.fillStyle = gw; x.fillRect(168, 712, 1064, 600); x.restore();
      x.save(); x.fillStyle = M.vermD; x.fillRect(168, 712, 1064, 22); x.restore();
      for (let k = 0; k < 26; k++) G(B, cc => { cc.beginPath(); cc.arc(188 + k * 41, 723, 4, 0, TAU); }, 0, 715, 0, 731, { lw: 0.6 });
      diaper(x, 168, 1004, 1064, 300, '#1f2d66', 'rgba(214,176,90,0.55)', '#d8b25a', 40);
      x.save(); const gc = x.createLinearGradient(0, 1004, 0, 1300); gc.addColorStop(0, 'rgba(10,6,4,0.35)'); gc.addColorStop(0.3, 'rgba(10,6,4,0)'); x.fillStyle = gc; x.fillRect(168, 1004, 1064, 300); x.restore();
      G(B, cc => { cc.beginPath(); cc.rect(168, 998, 1064, 9); }, 168, 998, 1232, 1007, { lw: 1, maskA: 0.25 });
      for (let k = 0; k < 53; k++) { x.save(); x.fillStyle = k % 2 ? M.verm : '#d8b25a'; x.fillRect(170 + k * 20, 1007, 10, 14); x.restore(); }
      // floor
      const fl = cc => { cc.beginPath(); cc.moveTo(168, 1302); cc.lineTo(1232, 1302); cc.lineTo(HW, 1430); cc.lineTo(HW, HH); cc.lineTo(0, HH); cc.lineTo(0, 1430); cc.closePath(); };
      x.save(); fl(x); x.clip(); x.fillStyle = '#d4c19a'; x.fillRect(0, 1300, HW, 360);
      const NR = 18, NC = 26, rowsY = []; for (let j = 0; j <= NR; j++) { const u = j / NR, yy = 1302 + (HH - 1302) * Math.pow(u, 1.3); rowsY.push(yy); }
      for (let j = 0; j < NR; j++) for (let i = -NC; i < NC; i++) {
        const y0 = rowsY[j], y1 = rowsY[j + 1];
        const xa = k => VPX + (168 + (k + NC / 2) * (1064 / NC) - VPX) * (y0 - VPY) / (1302 - VPY), xb = k => VPX + (168 + (k + NC / 2) * (1064 / NC) - VPX) * (y1 - VPY) / (1302 - VPY);
        const kind = ((i + j) % 2 + 2) % 2;
        x.beginPath(); x.moveTo(xa(i), y0); x.lineTo(xa(i + 1), y0); x.lineTo(xb(i + 1), y1); x.lineTo(xb(i), y1); x.closePath(); x.fillStyle = kind === 2 ? '#2f4a66' : kind ? '#9a4b30' : '#d9c79d'; x.fill(); x.strokeStyle = 'rgba(40,24,12,0.25)'; x.lineWidth = 0.8; x.stroke();
      }
      const gf = x.createLinearGradient(0, 1302, 0, HH); gf.addColorStop(0, 'rgba(30,18,10,0.5)'); gf.addColorStop(0.5, 'rgba(30,18,10,0.1)'); gf.addColorStop(1, 'rgba(30,18,10,0.25)'); x.fillStyle = gf; x.fillRect(0, 1300, HW, 360);
      x.restore();
      // the seven chairs, carved and gilded at the edges
      for (let i = 0; i < 7; i++) {
        const cx = LORD_X(i), w = 120, top = 1030;
        const back = cc => { cc.beginPath(); cc.moveTo(cx - w / 2, 1300); cc.lineTo(cx - w / 2, top + 20); cc.lineTo(cx - w * 0.3, top - 4); cc.lineTo(cx, top - 26); cc.lineTo(cx + w * 0.3, top - 4); cc.lineTo(cx + w / 2, top + 20); cc.lineTo(cx + w / 2, 1300); cc.closePath(); };
        painted(x, back, M.woodD, { grad: [cx - w / 2, 0, cx + w / 2, 0], lit: 0.2, dark: 0.35, lw: 1.6 });
        painted(x, cc => archPath(cc, cx - w * 0.36, top + 14, w * 0.72, 290, w * 0.3), M.vermD, { grad: [cx - w / 2, 0, cx + w / 2, 0], lit: 0.18, dark: 0.3, lw: 1.2 });
        for (const k of [-1, 0, 1]) G(B, cc => { cc.beginPath(); cc.arc(cx + k * w * 0.42, top + (k ? 6 : -24), 5, 0, TAU); }, cx - 6, top - 30, cx + 6, top + 12, { lw: 0.8 });
      }
      // front columns framing the hall
      for (const cx of [52, HW - 52]) {
        painted(x, cc => { cc.beginPath(); cc.rect(cx - 17, 664, 34, HH - 664); }, '#cdbd9a', { grad: [cx - 17, 0, cx + 17, 0], lit: 0.35, dark: 0.45, lw: 1.6 });
        G(B, cc => { cc.beginPath(); cc.moveTo(cx - 28, 664); cc.lineTo(cx + 28, 664); cc.lineTo(cx + 17, 700); cc.lineTo(cx - 17, 700); cc.closePath(); }, cx - 28, 664, cx + 28, 700, { lw: 1.2 });
      }
      granulate(x, cc => hallInner(cc), 0.3);
      x.restore(); if (C.mx) C.mx.restore();
      frameBand(B, 0, 0, HW, HH, HARCH, HB, { fillet: M.verm });
      K.cached('s5:hall:gold', () => C.m);
      return C.c;
    });
  }
  // the table and all that stands on it (drawn in front of the lords)
  const TF = { x: 150, y: 1120, w: 1100, h: 300 };
  function hallFront() {
    return K.cached('s5:hall:front', () => {
      const C = makeCache(TF.w, TF.h, 1.25, 0.5), x = C.x, B = C.B; x.translate(-TF.x, -TF.y); if (C.mx) C.mx.translate(-TF.x, -TF.y);
      const { x0, x1, top, front, base } = TABLE;
      // the cloth: top surface and the drop, with folds and an embroidered band
      painted(x, cc => { cc.beginPath(); cc.moveTo(x0 + 10, top); cc.lineTo(x1 - 10, top); cc.lineTo(x1, front); cc.lineTo(x0, front); cc.closePath(); }, '#efe6d2', { grad: [0, top, 0, front], lit: 0.2, dark: 0.12, lw: 1.4 });
      const drop = cc => { cc.beginPath(); cc.moveTo(x0, front); cc.lineTo(x1, front); cc.lineTo(x1 + 6, base); for (let k = 0; k <= 26; k++) cc.lineTo(x1 + 6 - (x1 - x0 + 12) * k / 26, base + (k % 2 ? 6 : 0)); cc.closePath(); };
      painted(x, drop, '#e6dcc4', { grad: [x0, 0, x1, 0], lit: 0.12, dark: 0.18, lw: 1.6 });
      x.save(); drop(x); x.clip();
      for (let k = 0; k < 22; k++) { const px = x0 + 20 + k * (x1 - x0 - 40) / 21; const g = x.createLinearGradient(px - 22, 0, px + 22, 0); g.addColorStop(0, 'rgba(40,24,12,0)'); g.addColorStop(0.5, 'rgba(40,24,12,0.16)'); g.addColorStop(1, 'rgba(40,24,12,0)'); x.fillStyle = g; x.fillRect(px - 22, front + 30, 44, base - front); x.strokeStyle = 'rgba(42,25,14,0.3)'; x.lineWidth = 1.1; x.beginPath(); x.moveTo(px, front + 40); x.lineTo(px + 3, base); x.stroke(); }
      x.fillStyle = M.vermD; x.fillRect(x0, front + 8, x1 - x0, 30);
      x.restore();
      G(B, cc => { cc.beginPath(); cc.rect(x0, front + 6, x1 - x0, 4); cc.rect(x0, front + 36, x1 - x0, 4); }, x0, front, x1, front + 40, { lw: 0.6 });
      for (let k = 0; k < 34; k++) { const px = x0 + 15 + k * (x1 - x0 - 30) / 33; G(B, cc => { cc.beginPath(); cc.moveTo(px, front + 13); cc.lineTo(px + 8, front + 23); cc.lineTo(px, front + 33); cc.lineTo(px - 8, front + 23); cc.closePath(); }, px - 8, front + 13, px + 8, front + 33, { lw: 0.6 }); }
      x.save(); x.fillStyle = 'rgba(30,16,8,0.35)'; x.fillRect(x0, front, x1 - x0, 6); x.restore();
      granulate(x, drop, 0.3);
      for (let i = 0; i < 7; i++) { const sx = LORD_X(i); x.save(); x.fillStyle = 'rgba(30,16,8,0.3)'; x.filter = 'blur(3px)'; K.shieldPath(x, sx + 4, front + 88, 30); x.fill(); x.restore(); K.shield(x, sx, front + 82, 30, K.HOUSES[i]); if (C.mx) { C.mx.save(); C.mx.lineWidth = 3; K.shieldPath(C.mx, sx, front + 82, 30); C.mx.strokeStyle = '#fff'; C.mx.stroke(); C.mx.restore(); } }
      // the blood registry, open on the table, its seal on a cord over the edge
      const bx = 700, by = top + 14;
      painted(x, cc => { cc.beginPath(); cc.moveTo(bx - 78, by + 12); cc.lineTo(bx - 70, by - 10); cc.lineTo(bx + 70, by - 10); cc.lineTo(bx + 78, by + 12); cc.closePath(); }, M.vermD, { lw: 1.2 });
      painted(x, cc => { cc.beginPath(); cc.moveTo(bx - 70, by + 8); cc.quadraticCurveTo(bx - 35, by - 2, bx, by + 6); cc.quadraticCurveTo(bx + 35, by - 2, bx + 70, by + 8); cc.lineTo(bx + 64, by - 12); cc.quadraticCurveTo(bx + 32, by - 20, bx, by - 12); cc.quadraticCurveTo(bx - 32, by - 20, bx - 64, by - 12); cc.closePath(); }, '#efe4c8', { lw: 1 });
      for (let k = 0; k < 3; k++) { script(x, bx - 58, by - 8 + k * 5, 50, 3.2, 600 + k); script(x, bx + 8, by - 8 + k * 5, 50, 3.2, 610 + k); }
      x.save(); x.strokeStyle = '#8f2a1c'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(bx + 10, by + 8); x.quadraticCurveTo(bx + 20, front + 30, bx + 14, front + 58); x.stroke(); x.restore();
      sealDisc(x, bx + 14, front + 66, 11, 0, 0);
      // gold candlesticks and goblets
      for (const cx of CANDLES) {
        G(B, cc => { cc.beginPath(); cc.ellipse(cx, top + 16, 16, 5, 0, 0, TAU); }, cx - 16, top + 10, cx + 16, top + 22, { lw: 1 });
        G(B, cc => { cc.beginPath(); cc.moveTo(cx - 4, top + 14); cc.lineTo(cx - 3, top - 6); cc.lineTo(cx - 11, top - 12); cc.lineTo(cx + 11, top - 12); cc.lineTo(cx + 3, top - 6); cc.lineTo(cx + 4, top + 14); cc.closePath(); }, cx - 11, top - 12, cx + 11, top + 14, { lw: 1 });
        painted(x, cc => { cc.beginPath(); cc.rect(cx - 5, top - 58, 10, 47); }, '#efe6cf', { grad: [cx - 5, 0, cx + 5, 0], lit: 0.3, dark: 0.3, lw: 1 });
        x.save(); x.fillStyle = '#efe6cf'; x.beginPath(); x.ellipse(cx + 4, top - 40, 2.5, 7, 0, 0, TAU); x.fill(); x.restore();
      }
      for (const [gx, sc2] of [[245, 1], [520, 0.9], [880, 1], [1150, 0.9]]) G(B, cc => { cc.beginPath(); cc.moveTo(gx - 9 * sc2, top - 14); cc.quadraticCurveTo(gx - 8 * sc2, top + 2, gx - 2, top + 4); cc.lineTo(gx - 2, top + 12); cc.lineTo(gx - 7, top + 15); cc.lineTo(gx + 7, top + 15); cc.lineTo(gx + 2, top + 12); cc.lineTo(gx + 2, top + 4); cc.quadraticCurveTo(gx + 8 * sc2, top + 2, gx + 9 * sc2, top - 14); cc.closePath(); }, gx - 9, top - 14, gx + 9, top + 15, { lw: 1 });
      K.cached('s5:hall:frontGold', () => C.m);
      return C.c;
    });
  }

  // banners: woven cloth with the house's arms, a gold border and a fringe (cached flat; hung and moved every frame)
  function bannerTex(house, w, h) {
    return K.cached(`s5:ban:${house.key}:${w}x${h}`, () => {
      const c = K.canvas(w, h + 12), x = c.getContext('2d');
      const shape = cc => { cc.beginPath(); cc.moveTo(0, 0); cc.lineTo(w, 0); cc.lineTo(w, h * 0.78); cc.lineTo(w * 0.75, h * 0.9); cc.lineTo(w * 0.5, h); cc.lineTo(w * 0.25, h * 0.9); cc.lineTo(0, h * 0.78); cc.closePath(); };
      shape(x); x.fillStyle = house.field; x.fill();
      x.save(); shape(x); x.clip();
      x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.4; x.fillStyle = pat(x, 'weave'); x.fillRect(0, 0, w, h); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      x.fillStyle = 'rgba(0,0,0,0.35)'; K.device(x, house.device, w / 2 + 1.5, h * 0.42 + 2, w * 0.33);
      x.fillStyle = house.charge; K.device(x, house.device, w / 2, h * 0.42, w * 0.33);
      x.strokeStyle = '#d2ac56'; x.lineWidth = 4; x.beginPath(); x.moveTo(5, 0); x.lineTo(5, h * 0.78 - 2); x.moveTo(w - 5, 0); x.lineTo(w - 5, h * 0.78 - 2); x.stroke();
      x.strokeStyle = 'rgba(60,36,10,0.6)'; x.lineWidth = 1; x.stroke();
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(0.15, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.restore();
      x.save(); shape(x); x.strokeStyle = rgba(M.ink, 0.8); x.lineWidth = 1.4; x.stroke(); x.restore();
      // fringe of gold tassels along the dagged edge
      x.save(); x.strokeStyle = '#c9a14a'; x.lineWidth = 1.6;
      const edge = [[0, h * 0.78], [w * 0.25, h * 0.9], [w * 0.5, h], [w * 0.75, h * 0.9], [w, h * 0.78]];
      for (let k = 0; k < 4; k++) for (let q = 0; q <= 10; q++) { const u = q / 10, px = lerp(edge[k][0], edge[k + 1][0], u), py = lerp(edge[k][1], edge[k + 1][1], u); x.beginPath(); x.moveTo(px, py); x.lineTo(px, py + 9); x.stroke(); }
      x.restore();
      return c;
    });
  }
  // hang a banner from (x, y): rippling strips, drawn into a small layer at screen resolution (o.z) and set down once.
  //   o.wind, o.gust, o.tear {at: y fraction, tau: seconds since the tear, seed}
  const BLW = 300, BLH = 560;
  function hangBanner(c, tex, x, y, w, h, t, o = {}) {
    const n = 20, wind = o.wind != null ? o.wind : 0.15, th = tex.height, tw = tex.width, ph0 = o.seed || 0, z = Math.min(o.z || 1, BLW / (w * 1.7), BLH / (h * 1.45));
    const tear = o.tear, jag = u => tear ? (tear.at + 0.06 * (K.hash(Math.floor(u * n), 3, tear.seed) - 0.5) + 0.03 * Math.sin(u * 17 + tear.seed)) : 2;
    const ox = w * 0.85, oy = h * 0.06;
    const L = K.layer('s5:banL', BLW, BLH), lx = L.getContext('2d'); lx.scale(z, z); lx.translate(ox, oy);
    const geo = (i) => { const u = i / n, ph = t * 1.6 + u * 4.2 + ph0; return { u, ph, dy: Math.sin(ph) * wind * h * 0.055 * (0.4 + u), dx: Math.sin(ph * 0.8 + 1) * wind * w * 0.05 + (o.gust || 0) * w * 0.14 * u * u }; };
    for (let i = 0; i < n; i++) {
      const { u, ph, dy, dx } = geo(i), sx = u * tw, sw = tw / n + 0.8, y1f = tear ? jag(u) : 1.2, sy1 = Math.min(th, y1f * th); if (sy1 < 1) continue;
      const X = -w / 2 + u * w + dx, Y = dy, dh = sy1 * h / (th - 12);
      lx.drawImage(tex, sx, 0, sw, sy1, X, Y, sw * w / tw, dh);
      const sh = Math.cos(ph) * (0.12 + wind * 0.35);
      lx.globalCompositeOperation = 'source-atop'; lx.fillStyle = sh > 0 ? `rgba(255,236,200,${sh * 0.4})` : `rgba(10,5,2,${-sh * 0.9})`; lx.fillRect(X, Y, sw * w / tw, dh); lx.globalCompositeOperation = 'source-over';
    }
    c.drawImage(L, 0, 0, BLW, BLH, x - ox, y - oy, BLW / z, BLH / z);
    // the torn-away part falls: gravity, a turn, the cloth bunching (straight onto the page; it is gone in a moment)
    if (tear && tear.tau > 0 && tear.tau < 1.4) {
      const tau = tear.tau, d = 0.5 * 2600 * tau * tau, rot = (tear.seed % 2 ? 1 : -1) * tau * 0.85, cx = x, cy = y + h * (tear.at + 0.3);
      c.save(); c.translate(cx + (tear.seed % 2 ? 1 : -1) * tau * 20, cy + d); c.rotate(rot); c.translate(-cx, -cy);
      for (let i = 0; i < n; i += 1) { const { u, dx } = geo(i), sx = u * tw, sw = tw / n + 0.8, sy0 = jag(u) * th; if (th - sy0 < 1) continue; c.drawImage(tex, sx, sy0, sw, th - sy0, x - w / 2 + u * w + dx - (u - 0.5) * tau * 30 * w / 100, y + sy0 * h / (th - 12) + Math.sin(u * 9 + tau * 12) * tau * 14, sw * w / tw, (th - sy0) * h / (th - 12)); }
      c.restore();
    }
    c.save(); c.fillStyle = '#3a2614'; c.fillRect(x - w / 2 - 10, y - 5, w + 20, 7); c.fillStyle = '#c9a14a'; c.beginPath(); c.arc(x - w / 2 - 12, y - 1.5, 5, 0, TAU); c.arc(x + w / 2 + 12, y - 1.5, 5, 0, TAU); c.fill(); c.restore();
  }
  // a torn banner lying on the floor, foreshortened, its folds in shadow
  function lyingBanner(c, tex, x, y, w, rot, seed, part = 0.45, sy = 0.42) {
    const th = tex.height - 12, tw = tex.width, r = rng(seed);
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(1, sy);
    const sy0 = th * part, hh = (th - sy0) * w / tw;
    c.save(); c.translate(-w / 2, -hh / 2);
    c.beginPath(); c.moveTo(0, 0); for (let k = 0; k <= 12; k++) c.lineTo(w * k / 12, (r() - 0.5) * 14); c.lineTo(w, hh * 1.05); c.lineTo(0, hh * 1.05); c.closePath(); c.clip();
    c.drawImage(tex, 0, sy0, tw, tex.height - sy0, 0, 0, w, (tex.height - sy0) * w / tw);
    for (let k = 0; k < 4; k++) { const px = r() * w, g = c.createLinearGradient(px - 40, 0, px + 40, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, 'rgba(10,5,2,0.28)'); g.addColorStop(0.6, 'rgba(255,230,190,0.1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(px - 40, -20, 80, hh + 40); }
    c.restore(); c.restore();
  }

  // the Seven, each under the house's banner (shown by arms and colours only)
  const MANTLE = ['#26304f', '#3d6656', '#7a2a20', '#6d7178', '#86281b', '#5c4026', '#1a1424'];
  const LORDS = K.HOUSES.map((h, i) => ({
    house: h, x: LORD_X(i), face: i < 3 ? 1 : -1, lady: i === 2 || i === 5, beard: i === 0 || i === 3 || i === 6, hair: M.hair[(i * 3) % 5], mantle: MANTLE[i], seed: 100 + i,
  }));
  // accusations: the screen direction each one points (some at a neighbour, some across the table)
  // [pointing arm angle, its bend, the other arm angle, its bend, other hand]
  const ACC = [[2.42, 0.08, 2.75, 0.4, 'fist'], [2.5, 0.04, 0.3, 1.2, 'open'], [1.22, 0.1, 0.5, 1.6, 'open'], null, [1.2, 0.1, 0.4, 1.5, 'open'], [2.46, 0.05, 0.3, 1.3, 'open'], [2.38, 0.1, 2.7, 0.45, 'fist']];
  const TEAR_ORDER = [2, 5, 0, 4, 6, 1, 3], TEAR_AT = [0.42, 0.36, 0.48, 0.4, 0.34, 0.46, 0.38];
  const LS = 372;
  function lordOpts(L, i, t, T) {
    const rise = smooth(span(t, T.rise + i * 0.09, T.rise + 0.75 + i * 0.09));
    const look = smooth(span(t, T.rise + 0.3 + i * 0.06, T.rise + 1.0 + i * 0.06));
    const acc = easeOut(span(t, T.acc + 0.12 * ((i * 5) % 7) / 2, T.acc + 0.5 + 0.12 * ((i * 5) % 7) / 2));
    const A = ACC[i];
    const o = { kind: L.lady ? 'gown' : 'robe', robe: L.house.field, mantle: L.mantle, fur: true, hat: L.lady ? 'veil' : 'coronet', circlet: L.lady, beard: L.beard, hairCol: L.hair, face: L.face, seed: L.seed, device: L.house, sleeve: L.lady ? undefined : 'hang', light: L.x < 700 ? 1 : -1, sway: 0.01 };
    const turn0 = i === 3 ? 0.15 : 0.55;
    o.turn = i === 3 ? lerp(turn0, lerp(0.9, -0.6, smooth(span(t, T.acc + 0.3, T.acc + 1.2))), look) : lerp(turn0, 0.95, Math.max(look * 0.8, acc));
    const rest = { a: 0.1, b: 1.5, hand: 'open' };
    if (A) { o.armN = { a: lerp(rest.a, A[0], acc), b: lerp(rest.b, A[1], acc), hand: acc > 0.4 ? 'point' : 'open', fl: lerp(0.22, 0.88, acc), ul: lerp(0.82, 0.95, acc) }; o.armF = { a: lerp(0.15, A[2], acc), b: lerp(1.1, A[3], acc), hand: A[4], fl: lerp(0.5, 1, acc) }; }
    else { o.armN = { a: lerp(rest.a, 2.5, acc), b: lerp(rest.b, 0.55, acc), hand: acc > 0.3 ? 'palm' : 'open', fl: lerp(0.22, 1, acc), ul: lerp(0.82, 1, acc) }; o.armF = { a: lerp(0.15, 2.2, acc), b: lerp(1.1, 0.8, acc), hand: 'palm', fl: lerp(0.5, 1, acc) }; o.lean = -0.06 * acc; }
    o.y = TABLE.top + lerp(0.56, 0.3, rise) * LS;
    return o;
  }
  const SEV = { x: 40, y: 940, w: 1320, h: 480 };
  function seatedSeven(T, arms) {
    return K.cached('s5:hall:seven:' + (arms ? 'a' : 'b'), () => {
      const C = makeCache(SEV.w, SEV.h, 1.25, 0), x = C.x; x.translate(-SEV.x, -SEV.y);
      if (arms) { x.beginPath(); x.rect(0, 0, HW, TABLE.front + 1); x.clip(); }
      for (let i = 0; i < 7; i++) { const o = lordOpts(LORDS[i], i, T.L25.start, T); fig(x, LORDS[i].x, o.y, LS, arms ? Object.assign({}, o, { part: 'arms' }) : o); }
      return C.c;
    });
  }
  function hallTimes() {
    return K.cached('s5:hall:T', () => {
      const L25 = K.cue('L25'), L28 = K.cue('L28'), L29 = K.cue('L29'), L30 = K.cue('L30');
      const T = { L25, L28, L29, L30, rise: L28.start + 0.35, acc: L29.start - 0.05, gal: at('L29', 'executions. Executions') - 0.3, rep: at('L29', 'Executions became reprisals') };
      T.tears = TEAR_ORDER.map((k, j) => T.rep + 0.15 + j * (L29.end - T.rep - 0.35) / 6.5);
      T.tearOf = []; TEAR_ORDER.forEach((k, j) => { T.tearOf[k] = T.tears[j]; });
      T.dark0 = L29.end - 0.05; T.dark1 = L29.end + 0.4; T.light = L30.start - 0.15;
      return T;
    });
  }
  // the gallows' shadow: crisp core, soft penumbra (layered strokes), multiplied onto the page
  function gallowsShadow(c, gx, gy, k, a) {
    const shapes = cc => {
      cc.beginPath(); cc.rect(0, 0, 34, 800); cc.rect(-30, 0, 470, 30); cc.rect(-46, 770, 126, 30);
      cc.save(); cc.translate(17, 150); cc.rotate(-0.78); cc.rect(0, -11, 200, 22); cc.restore();
    };
    const rope = cc => { cc.beginPath(); cc.moveTo(392, 26); cc.quadraticCurveTo(396, 200, 392, 330); cc.moveTo(392 + 26, 372); cc.ellipse(392, 372, 26, 40, 0, 0, TAU); };
    c.save(); c.translate(gx, gy); c.scale(k, k); c.globalCompositeOperation = 'multiply'; c.lineJoin = 'round';
    for (const [w, al] of [[34, 0.16], [18, 0.22], [0, 0.75]]) {
      c.globalAlpha = a * al; c.fillStyle = '#1a0c06'; c.strokeStyle = '#1a0c06';
      shapes(c); c.fill(); if (w) { c.lineWidth = w; c.stroke(); }
      rope(c); c.lineWidth = 7 + w; c.stroke();
    }
    c.restore();
  }
  function vermDensity() { return K.cached('s5:verm:dens', () => { const c = K.canvas(240, 280), x = c.getContext('2d'), img = x.createImageData(240, 280); for (let j = 0; j < 280; j++) for (let i = 0; i < 240; i++) { const v = 200 + 55 * K.fbm(i / 18, j / 18, 4, 88), k = (j * 240 + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = Math.min(255, v); img.data[k + 3] = 255; } x.putImageData(img, 0, 0); return c; }); }
  function vermField() { return K.cached('s5:verm:F', () => K.field(240, 280, [{ x: 0.24, y: 0.0 }, { x: 0.62, y: 0.0, d: 0.04 }, { x: 0.42, y: 0.32, d: 0.03 }, { x: 0.05, y: 0.24, d: 0.1 }, { x: 0.95, y: 0.3, d: 0.07 }, { x: 0.8, y: 0.05, d: 0.06 }], 717, { warp: 0.3, scale: 3.2, grain: 0.07 })); }
  function smokeWisp(c, x, y, t, age, seed) {
    if (age <= 0 || age > 5) return;
    const r = rng(seed), dot = softDot();
    c.save(); c.globalCompositeOperation = 'screen';
    for (let k = 0; k < 26; k++) { const u = k / 26, a = age - u * 1.4; if (a < 0) continue; const py = y - a * 34 - u * 26, px = x + Math.sin(a * 1.8 + seed + u * 5) * (3 + a * 6) + (r() - 0.5) * 3; const s2 = 2.5 + a * 4; c.globalAlpha = 0.07 * clamp(1 - a / 4.5) * clamp(a * 4); c.drawImage(dot, px - s2 * 0.6, py - s2 * 1.6, s2 * 1.2, s2 * 3.2); }
    c.restore();
  }
  // draw the hall shot. view v; t clamped by the caller
  function drawHall(c, t, v) {
    const T = hallTimes(), back = hallBack(), front = hallFront(), gold = K.cached('s5:hall:gold', () => null), fgold = K.cached('s5:hall:frontGold', () => null);
    const late = t > T.L28.start - 1.5, dark = smooth(span(t, T.dark0, T.dark1)), empty = t > T.dark1 - 0.1, relight = easeOut(span(t, T.light, T.light + 0.9));
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#0b0806'; c.fillRect(0, 0, W, H);
    setCam(c, v);
    c.save(); c.beginPath(); c.rect(HALLP.x, HALLP.y, HALLP.w, HARCH + 20 - HALLP.y); c.rect(HALLP.x, HARCH, -HALLP.x + 12, HALLP.h); c.rect(HW - 12, HARCH, HALLP.x + HALLP.w - HW + 12, HALLP.h); c.rect(0, HH - 12, HW, HALLP.y + HALLP.h - HH + 12); c.clip();
    c.drawImage(hallPage(), HALLP.x, HALLP.y, HALLP.w, HALLP.h); c.restore();
    c.drawImage(back, 0, 0, HW, HH);
    // ---- pennants over the towers and swallows in the gold
    if (!late) {
      c.save(); hallInner(c); c.clip();
      for (const [px, py, hs, ph] of [[200, 212, 0, 0], [1200, 202, 6, 1.7], [700, 122, 4, 0.9], [395, 214, 1, 2.4], [1160, 234, 2, 3.1], [845, 229, 5, 0.4], [560, 304, 3, 1.2]]) {
        c.save(); c.strokeStyle = '#3a2614'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(px, py); c.lineTo(px, py - 44); c.stroke();
        const pl = hs === 4 ? 120 : 90, pts = []; for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push([px + u * pl, py - 44 + u * 10 + Math.sin(t * 4.2 + ph - u * 5) * 7 * u]); }
        const bot = pts.map(q => [q[0], q[1] + 20 * (1 - (q[0] - px) / (pl + 5))]).reverse();
        c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts) c.lineTo(q[0], q[1]); for (const q of bot) c.lineTo(q[0], q[1]); c.closePath(); c.fillStyle = K.HOUSES[hs].field; c.fill(); c.strokeStyle = rgba(M.ink, 0.8); c.lineWidth = 1.3; c.stroke(); c.restore();
      }
      c.save(); c.strokeStyle = rgba(M.ink, 0.75); c.lineWidth = 2; c.lineCap = 'round';
      for (let k = 0; k < 7; k++) { const a = t * (0.35 + k * 0.03) + k * 1.9, bx = 700 + Math.cos(a) * (260 + k * 40), by = 200 + Math.sin(a * 1.3) * 70 + k * 12, fl = Math.sin(t * 9 + k) * 5; c.beginPath(); c.moveTo(bx - 11, by - fl); c.quadraticCurveTo(bx - 5, by - 6, bx, by); c.quadraticCurveTo(bx + 5, by - 6, bx + 11, by - fl); c.stroke(); }
      c.restore();
      c.restore();
    }
    // ---- banners
    const wind = lerp(0.12, 0.75, smooth(span(t, T.L28.start, T.L28.start + 1.5))) * (1 - 0.85 * dark) + 0.2 * smooth(span(t, T.acc, T.rep));
    const gust = late ? Math.max(0, K.noise(t * 1.3, 4, 9) - 0.45) * 1.2 * (1 - dark) : 0;
    if (!DBG.noBan) for (let i = 0; i < 7; i++) {
      const tt = T.tearOf[i], tear = t > tt ? { at: TEAR_AT[i], tau: t - tt, seed: 900 + i } : null;
      const jerk = tear ? Math.exp(-tear.tau * 5) * Math.sin(tear.tau * 40) * 0.6 : 0;
      hangBanner(c, bannerTex(K.HOUSES[i], BAN_W, BAN_H), LORD_X(i), ROD_Y, BAN_W, BAN_H, t, { wind: wind + Math.abs(jerk), gust: gust + jerk, seed: i * 1.7, tear, z: v.z });
    }
    // ---- the lords
    if (!empty) {
      const opts = LORDS.map((L, i) => lordOpts(L, i, t, T)), still = t < T.rise - 0.05;
      if (still) c.drawImage(seatedSeven(T, false), SEV.x, SEV.y, SEV.w, SEV.h);
      else if (!DBG.noLords) for (let i = 0; i < 7; i++) fig(c, LORDS[i].x, opts[i].y, LS, Object.assign({ fast: true }, opts[i]));
      c.drawImage(front, TF.x, TF.y, TF.w, TF.h);
      c.save(); c.beginPath(); c.rect(0, 0, HW, TABLE.front + 1); c.clip();
      if (still) c.drawImage(seatedSeven(T, true), SEV.x, SEV.y, SEV.w, SEV.h);
      else if (!DBG.noLords) for (let i = 0; i < 7; i++) fig(c, LORDS[i].x, opts[i].y, LS, Object.assign({}, opts[i], { part: 'arms' }));
      c.restore();
      // the gallows' shadow is thrown across the whole page, as if the gallows stood between the light and the book
      const gs = smooth(span(t, T.gal, T.gal + 1.3));
      if (gs > 0) gallowsShadow(c, lerp(-760, 130, easeOut(gs)), lerp(600, 636, gs), lerp(1.22, 1.45, gs), 0.8 * gs * (1 - dark));
    } else {
      c.drawImage(front, TF.x, TF.y, TF.w, TF.h);
      // torn banners on the floor
      const pieces = [[250, 1470, 200, -0.2, 0, 0.3], [470, 1560, 250, 0.12, 6, 0.22], [790, 1490, 230, -0.08, 4, 0.18], [1040, 1575, 210, 0.22, 2, 0.3], [640, 1630, 200, 0.4, 5, 0.34], [1180, 1470, 170, -0.3, 1, 0.4]];
      for (const [px, py, w2, rot, hs, part] of pieces) lyingBanner(c, bannerTex(K.HOUSES[hs], BAN_W, BAN_H), px, py, w2, rot, 300 + hs, part);
    }
    // ---- vermilion ink spreads over the page
    const vp = t < T.rep - 0.2 ? 0 : lerp(0, 0.5, easeOut(span(t, T.rep - 0.2, T.L30.start)));
    if (vp > 0.005 && !DBG.noVerm) {
      c.save(); hallInner(c); c.clip();
      const F = vermField(), m = K.mask(F, vp, 0.012), L = K.layer('s5:verm', F.w, F.h), lx = L.getContext('2d');
      const dried = smooth(span(t, T.L30.start - 0.5, T.L30.start + 1));
      lx.fillStyle = dried > 0 ? mixHex('#bc3620', '#7e2618', dried) : '#bc3620'; lx.fillRect(0, 0, F.w, F.h);
      lx.globalCompositeOperation = 'multiply'; lx.drawImage(vermDensity(), 0, 0, F.w, F.h);
      lx.globalCompositeOperation = 'destination-in'; lx.drawImage(m, 0, 0);
      const rimC = K.rim(F, vp, 0.022, 0.008), R2 = K.layer('s5:vermRim', F.w, F.h), rx2 = R2.getContext('2d');
      rx2.drawImage(rimC, 0, 0); rx2.globalCompositeOperation = 'source-in'; rx2.fillStyle = 'rgba(92,16,10,0.85)'; rx2.fillRect(0, 0, F.w, F.h);
      lx.globalCompositeOperation = 'source-over'; lx.drawImage(R2, 0, 0);
      c.save(); c.globalCompositeOperation = 'multiply'; c.drawImage(L, 0, 0, HW, HH);
      // the ink runs down the page in drips, each with its bead
      const drips = K.cached('s5:drips', () => { const r = rng(66); return Array.from({ length: 18 }, () => ({ x: 120 + r() * 1160, y0: 640 + r() * 200, len: 180 + r() * 420, t0: r() * 1.7, w: 4 + r() * 7, ph: r() * 9 })); });
      c.fillStyle = dried > 0 ? mixHex('#a82a18', '#6e2016', dried) : '#a82a18';
      for (const d of drips) {
        const g = easeOut(span(t, T.rep + d.t0, T.rep + d.t0 + 2.4)); if (g <= 0) continue;
        const y1 = d.y0 + d.len * g, pts = []; for (let k = 0; k <= 10; k++) { const u = k / 10, yy = lerp(d.y0, y1, u); pts.push([d.x + 3 * Math.sin(yy * 0.03 + d.ph), yy]); }
        taper(c, pts, pts.map((q, k) => d.w * (0.5 + 0.5 * k / 10))); c.fill();
        c.beginPath(); c.ellipse(pts[10][0], y1 + d.w * 0.4, d.w * 0.95, d.w * 1.25, 0, 0, TAU); c.fill();
      }
      c.restore();
      c.restore();
    }

    // ---- light: the candles' pool, the window's shaft, gold catching the light
    const tableS = scr(v, 700, 1150), sky = 1 - smooth(span(v.y, 520, 900));
    let px = lerp(tableS[0], scr(v, 700, 360)[0], sky), py = lerp(tableS[1], scr(v, 700, 360)[1], sky);
    const flick = late ? 1 + 0.06 * (K.noise(t * 6, 2, 5) - 0.5) : 1;
    if (!empty) {
      const amb = [Math.round(lerp(48, 8, dark)), Math.round(lerp(36, 6, dark)), Math.round(lerp(28, 5, dark))];
      const col = [Math.round(255 * lerp(1, 0.08, dark) * flick), Math.round(lerp(232, 218, sky) * lerp(1, 0.07, dark) * flick), Math.round(lerp(192, 196, sky) * lerp(1, 0.06, dark) * flick)].map(q => Math.min(255, q));
      pool(c, px, py, 1150 * v.z, col, amb, 0.07 * (1 - dark), 1.35);
    } else {
      const cs = scr(v, 640, 1290), k = relight, fl = 1 + 0.05 * (K.noise(t * 5, 1, 3) - 0.5);
      pool(c, cs[0], cs[1], (140 + 400 * k) * v.z * fl, [Math.round(lerp(24, 255, k)), Math.round(lerp(18, 206, k)), Math.round(lerp(12, 140, k))], [4, 3, 2], 0.08 * k, 1.3);
    }
    // flames over the darkened page
    setCam(c, v);
    for (let j = 0; j < CANDLES.length; j++) {
      const cx = CANDLES[j], top = TABLE.top - 58, out = smooth(span(t, T.dark0 - 0.25 + j * 0.06, T.dark0 + 0.12 + j * 0.06));
      if (!empty) { const lean = late ? (K.noise(t * 2 + j, 7, 2) - 0.5) * (0.8 + 1.5 * gust) : 0; flame(c, cx, top, 21, t, j * 3.1, { k: 1 - out, lean }); }
      if (t > T.dark0 - 0.2) smokeWisp(c, cx, top - 6, t, t - (T.dark0 + j * 0.06), 40 + j);
      if (empty && cx === 620) { flame(c, cx, top, 24, t, 9.3, { k: relight, glow: 1.8 }); K.glow(c, cx, top - 10, 230 * relight, [255, 190, 110], 0.22 * relight); }
    }
    // the window's shaft and its dust; the gold's glint
    const wl = scr(v, 104, 900), wl2 = scr(v, 760, 1560);
    if (!empty && !DBG.noBeam && !Q.low) beam(c, t, wl[0], wl[1], wl2[0], wl2[1], 40 * v.z, 260 * v.z, '255,226,170', 0.13 * (1 - dark) * (1 - sky * 0.6), 501, 120);
    else if (!Q.low) { const cs = scr(v, 620, 1150); beam(c, t, cs[0] - 10, cs[1] - 260 * v.z, cs[0] + 40, cs[1] + 200 * v.z, 120 * v.z, 260 * v.z, '255,214,150', 0.04 * relight, 502, 70); }
    const sp = empty ? scr(v, 620, 1150) : [px + 260 * Math.sin(t * 0.21) - (v.x - 700) * 0.6 * v.z, py - 120 + 140 * Math.sin(t * 0.17)];
    if (gold && !DBG.noSheen && !empty && !Q.low) sheen(c, gold, 0, 0, HW, HH, v, sp[0], sp[1], 480 * v.z, 0.6 * (1 - dark));
    if (fgold && !DBG.noSheen && empty && !Q.low) sheen(c, fgold, TF.x, TF.y, TF.w, TF.h, v, sp[0], sp[1], 420 * v.z, 0.6 * relight);
  }


  // ================================================================ panels: arched miniatures cached with their gold masks
  const BW = 24;
  const innerOf = P => cc => archPath(cc, BW, BW * 1.15, P.w - 2 * BW, P.h - 2 * BW, P.ah - BW * 0.6);
  function panel(key, P, back, front, o = {}) {
    return K.cached('s5:pan:' + key, () => {
      const rs = o.rs || 1.12, mk = () => { const C = makeCache(P.w + 40, P.h + 40, rs, 0.45); C.x.translate(20, 20); C.mx.translate(20, 20); return C; };
      const C = mk(), inner = innerOf(P);
      C.x.save(); inner(C.x); C.x.clip(); C.mx.save(); inner(C.mx); C.mx.clip();
      back(C.B, P.w, P.h); granulate(C.x, inner, 0.26);
      C.x.restore(); C.mx.restore();
      frameBand(C.B, 0, 0, P.w, P.h, P.ah, BW, { fillet: o.fillet || M.verm });
      let F = null;
      if (front) { const D = mk(); D.x.save(); inner(D.x); D.x.clip(); front({ x: D.x, m: C.mx }, P.w, P.h); D.x.restore(); F = D.c; }
      return { c: C.c, m: C.m, f: F };
    });
  }
  const drawPanelLayer = (c, P, img) => c.drawImage(img, P.x - 20, P.y - 20, P.w + 40, P.h + 40);
  // gold-rimmed roundel, painted inside by fn
  function roundel(B, cx, cy, r, ground, fn, o = {}) {
    const x = B.x, rimW = o.rim || r * 0.12;
    x.save(); x.fillStyle = 'rgba(40,24,10,0.4)'; x.filter = 'blur(5px)'; x.beginPath(); x.arc(cx + 5, cy + 7, r + rimW, 0, TAU); x.fill(); x.restore();
    G(B, cc => { cc.beginPath(); cc.arc(cx, cy, r + rimW, 0, TAU); cc.arc(cx, cy, r, 0, TAU, true); }, cx - r, cy - r, cx + r, cy + r, { lw: 1.4 });
    x.save(); x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fillStyle = ground; x.fill(); x.clip();
    if (o.diaper) diaper(x, cx - r, cy - r, r * 2, r * 2, ground, 'rgba(230,200,120,0.35)', 'rgba(230,200,120,0.7)', r * 0.3);
    if (fn) fn(x);
    const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,245,225,0.12)'); g.addColorStop(1, 'rgba(20,10,5,0.25)'); x.fillStyle = g; x.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    x.restore();
    x.save(); x.strokeStyle = rgba(M.ink, 0.8); x.lineWidth = 1.4; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.stroke(); x.restore();
  }
  // a speech scroll (banderole) along a curve; p unrolls it, ta is the script's ink, droop bends it down
  function banderole(c, pts, w, p, ta, seed, droop = 0) {
    if (p <= 0.01) return;
    const line = K.bez(pts, 20), L = K.polyLen(line), cut = L * p, out = []; let acc = 0;
    for (let i = 0; i < line.length; i++) { if (i) acc += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]); if (acc > cut) break; const u = acc / L; out.push([line[i][0], line[i][1] + droop * u * u * 120]); }
    if (out.length < 2) return;
    const top = [], bot = [];
    for (let i = 0; i < out.length; i++) { const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, tw = 1 - 0.25 * Math.abs(Math.sin(i * 0.18 + seed)); top.push([out[i][0] - dy / l * w / 2 * tw, out[i][1] + dx / l * w / 2 * tw]); bot.push([out[i][0] + dy / l * w / 2 * tw, out[i][1] - dx / l * w / 2 * tw]); }
    c.save(); c.beginPath(); c.moveTo(top[0][0], top[0][1]); for (const q of top) c.lineTo(q[0], q[1]); for (let i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]); c.closePath();
    c.fillStyle = '#efe6cf'; c.fill(); c.save(); c.clip();
    const g = c.createLinearGradient(out[0][0], out[0][1] - w, out[0][0], out[0][1] + w); g.addColorStop(0, 'rgba(255,250,235,0.3)'); g.addColorStop(1, 'rgba(60,40,20,0.25)'); c.fillStyle = g; c.fillRect(-1e4, -1e4, 2e4, 2e4);
    if (ta > 0.01) { c.globalAlpha = ta; c.strokeStyle = rgba(M.ink, 0.85); c.lineWidth = w * 0.09; c.lineCap = 'round'; const r = rng(seed); for (let i = 3; i < out.length - 3; i += 1) { if (r() < 0.2) { i += 1; continue; } const q = out[i]; c.beginPath(); c.moveTo(q[0], q[1] - w * 0.18); c.lineTo(q[0] + w * 0.04, q[1] + w * 0.18); c.stroke(); } }
    c.restore();
    c.strokeStyle = rgba(M.ink, 0.8); c.lineWidth = 1.3; c.stroke();
    // the curl at its end
    const e = out[out.length - 1]; c.beginPath(); c.ellipse(e[0], e[1], w * 0.22, w * 0.55, 0.3, 0, TAU); c.fillStyle = '#e2d6b8'; c.fill(); c.stroke();
    c.restore();
  }
  // snow inside a picture: painted flakes drifting, within a rect (world units)
  function snowIn(c, t, x0, y0, w, h, n, seed, a = 0.85) {
    const r = rng(seed); c.save(); c.fillStyle = '#f4f6f8';
    for (let i = 0; i < n; i++) { const z = 0.5 + r() * 0.5, px = x0 + ((r() * w + Math.sin(t * 0.7 + i) * 10 + t * 8 * z) % w + w) % w, py = y0 + ((r() * h + t * (26 + 30 * z)) % h + h) % h, s2 = 1.6 + z * 2.4; c.globalAlpha = a * z; c.beginPath(); c.arc(px, py, s2, 0, TAU); c.fill(); }
    c.restore();
  }

  // ================================================================ THE FOLIO OF THE BLOOD REGISTRIES (L26)
  const FY0 = -70, FY1 = 1370, LINE_Y = 590;
  const PAN = {
    lived: { x: 1240, y: 120, w: 1380, h: 1020, ah: 250 },
    married: { x: 2780, y: 120, w: 1120, h: 1020, ah: 240 },
    court: { x: 4920, y: 120, w: 1380, h: 1020, ah: 250 },
  };
  const HEAD = { x: 580, y: 500, r: 230 };
  const KIDS = { f: [4170, 380], m: [4570, 380], c: [[4150, 830], [4370, 870], [4590, 830]], r: 96, cr: 82, struck: 1 };
  const LAWS = K.HOUSES[4];
  // an illuminated tree of lineage: ink trunk and boughs, crimson leafage with lead-white veins, gold fruit (the houses' device made a family tree)
  function lineageTree(B, cc, hx, hy, r) {
    const trunk = c2 => { c2.beginPath(); c2.moveTo(hx - 26, hy + r * 0.92); c2.bezierCurveTo(hx - 16, hy + r * 0.5, hx - 18, hy + r * 0.2, hx - 10, hy - r * 0.05); c2.lineTo(hx + 10, hy - r * 0.05); c2.bezierCurveTo(hx + 18, hy + r * 0.2, hx + 16, hy + r * 0.5, hx + 26, hy + r * 0.92); c2.closePath(); };
    painted(cc, trunk, '#5a3a22', { grad: [hx - 26, 0, hx + 26, 0], lit: 0.25, dark: 0.4, lw: 1.6 });
    cc.save(); cc.strokeStyle = rgba(M.ink, 0.8); cc.lineCap = 'round';
    const boughs = [[-0.05, -0.62, 0.14], [-0.15, -0.95, 0.12], [-0.3, -1.2, 0.1], [-0.08, 0.62, 0.14], [-0.18, 0.95, 0.12], [-0.32, 1.2, 0.1], [-0.5, 0.1, 0.08]];
    for (const [yy, a, wd] of boughs) { const by = hy + r * yy, ex = hx + Math.sin(a) * r * 0.6, ey = by - Math.cos(a) * r * 0.42; cc.lineWidth = wd * 60; cc.strokeStyle = '#5a3a22'; cc.beginPath(); cc.moveTo(hx, by); cc.quadraticCurveTo((hx + ex) / 2, by - 20, ex, ey); cc.stroke(); cc.lineWidth = 1.2; cc.strokeStyle = rgba(M.ink, 0.7); cc.stroke(); }
    cc.restore();
    const rr = rng(2024);
    for (let k = 0; k < 74; k++) {
      const a = rr() * TAU, d = Math.sqrt(rr()) * r * 0.6, lx = hx + Math.cos(a) * d * 1.1, ly = hy - r * 0.32 + Math.sin(a) * d * 0.78, s2 = 16 + rr() * 14, rot = rr() * TAU;
      const leaf = c2 => { c2.beginPath(); c2.save(); c2.translate(lx, ly); c2.rotate(rot); c2.moveTo(-s2, 0); c2.bezierCurveTo(-s2 * 0.4, -s2 * 0.6, s2 * 0.5, -s2 * 0.55, s2, 0); c2.bezierCurveTo(s2 * 0.5, s2 * 0.55, -s2 * 0.4, s2 * 0.6, -s2, 0); c2.restore(); };
      painted(cc, leaf, k % 5 === 0 ? '#6e1a12' : LAWS.charge, { grad: [lx - s2, ly - s2, lx + s2, ly + s2], lit: 0.22, dark: 0.3, lw: 1 });
      cc.save(); cc.strokeStyle = 'rgba(255,240,220,0.35)'; cc.lineWidth = 1; cc.beginPath(); cc.moveTo(lx - Math.cos(rot) * s2 * 0.7, ly - Math.sin(rot) * s2 * 0.7); cc.lineTo(lx + Math.cos(rot) * s2 * 0.7, ly + Math.sin(rot) * s2 * 0.7); cc.stroke(); cc.restore();
    }
    for (let k = 0; k < 18; k++) { const a = rr() * TAU, d = Math.sqrt(rr()) * r * 0.56, fx = hx + Math.cos(a) * d * 1.1, fy = hy - r * 0.32 + Math.sin(a) * d * 0.75; G({ x: cc, m: B.m }, c2 => { c2.beginPath(); c2.arc(fx, fy, 9, 0, TAU); }, fx - 9, fy - 9, fx + 9, fy + 9, { lw: 1 }); }
    painted(cc, c2 => { c2.beginPath(); c2.moveTo(hx - r * 0.7, hy + r * 0.92); c2.quadraticCurveTo(hx, hy + r * 0.8, hx + r * 0.7, hy + r * 0.92); c2.lineTo(hx + r, hy + r * 1.2); c2.lineTo(hx - r, hy + r * 1.2); c2.closePath(); }, '#5d7a3c', { grad: [0, hy + r * 0.8, 0, hy + r], lit: 0.2, lw: 1.2 });
  }
  // the registry's head: its emblem in a great roundel, crowned ancestors, the great seal hanging below on silk cords
  function folioHead() {
    return K.cached('s5:folio:head', () => {
      const C = makeCache(1240, 1440, 1.05, 0.45), x = C.x, B = C.B; x.translate(0, -FY0); C.mx.translate(0, -FY0);
      const { x: hx, y: hy, r } = HEAD;
      // cords
      x.save(); x.lineCap = 'round';
      for (const [dx, col] of [[-26, '#8f2a1c'], [26, '#2f5a46'], [-8, '#a8781e'], [10, '#8f2a1c']]) { x.strokeStyle = col; x.lineWidth = 6; x.beginPath(); x.moveTo(hx + dx * 1.6, hy + r * 0.9); x.bezierCurveTo(hx + dx * 1.2, hy + r * 1.4, hx + dx * 0.4, hy + r * 1.8, hx + dx * 0.2, hy + r * 2.1); x.stroke(); x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 1.2; x.stroke(); }
      x.restore();
      roundel(B, hx, hy, r, LAWS.field, cc => {
        cc.fillStyle = '#e4d9bf'; cc.fillRect(hx - r, hy - r, 2 * r, 2 * r);
        diaper(cc, hx - r, hy - r, 2 * r, 2 * r, '#e9dfc8', 'rgba(160,110,60,0.18)', 'rgba(160,60,40,0.35)', 40);
        lineageTree(B, cc, hx, hy, r);
      }, { rim: 30 });
      // a ring of script about the roundel
      x.save(); x.font = 'italic 400 22px "EB Garamond"';
      x.restore();
      // the great seal: red wax, the tree impressed, a gloss, its shadow on the page
      const sx = hx, sy = hy + r * 2.4, sr = 92;
      x.save(); x.fillStyle = 'rgba(30,14,6,0.45)'; x.filter = 'blur(10px)'; x.beginPath(); x.ellipse(sx + 18, sy + 24, sr * 1.05, sr, 0, 0, TAU); x.fill(); x.restore();
      const wax = cc => { cc.beginPath(); for (let k = 0; k < 48; k++) { const a = k / 48 * TAU, rr2 = sr * (1 + 0.06 * Math.sin(a * 5 + 1) + 0.03 * Math.sin(a * 11)); cc.lineTo(sx + Math.cos(a) * rr2, sy + Math.sin(a) * rr2); } cc.closePath(); };
      painted(x, wax, '#9a2418', { grad: [sx - sr, sy - sr, sx + sr, sy + sr], lit: 0.25, dark: 0.45, lw: 1.4 });
      x.save(); x.strokeStyle = 'rgba(60,8,4,0.6)'; x.lineWidth = 5; x.beginPath(); x.arc(sx, sy, sr * 0.78, 0, TAU); x.stroke(); x.strokeStyle = 'rgba(255,170,140,0.25)'; x.lineWidth = 2; x.beginPath(); x.arc(sx - 2, sy - 2, sr * 0.8, Math.PI, Math.PI * 1.7); x.stroke(); x.restore();
      x.save(); x.fillStyle = 'rgba(255,190,160,0.35)'; K.device(x, 'tree', sx - 2, sy - 2, sr * 0.95); x.fillStyle = 'rgba(70,8,4,0.7)'; K.device(x, 'tree', sx + 1.5, sy + 1.5, sr * 0.95); x.fillStyle = '#8c2016'; K.device(x, 'tree', sx, sy, sr * 0.95); x.restore();
      x.save(); const gl = x.createRadialGradient(sx - sr * 0.4, sy - sr * 0.45, 0, sx - sr * 0.4, sy - sr * 0.45, sr * 0.7); gl.addColorStop(0, 'rgba(255,230,210,0.45)'); gl.addColorStop(1, 'rgba(255,230,210,0)'); x.fillStyle = gl; x.beginPath(); x.arc(sx, sy, sr, 0, TAU); x.fill(); x.restore();
      // crowned ancestors along the line
      for (const [ax, ay, k] of [[900, LINE_Y - 150, 0], [1080, LINE_Y + 150, 6]]) {
        roundel(B, ax, ay, 66, K.HOUSES[k].field, cc => { fig(cc, ax, ay + 66 * 3.6, 66 * 4.1, { kind: 'robe', robe: K.HOUSES[k].charge === '#e8dcbc' ? M.ultra : M.verm, hat: 'crown', fur: true, turn: 0.4, shadow: false, beard: k === 0, hairCol: M.hair[1], light: -1, lw: 1.4 }); }, { rim: 10 });
      }
      // script beneath the emblem
      for (let k = 0; k < 3; k++) script(x, 160, 1210 + k * 30, 840, 17, 700 + k, { color: rgba(M.ink, 0.75) });
      return C.c;
    });
  }
  // portrait bust in a roundel
  const bust = (cc, cx, cy, r, o) => fig(cc, cx, cy + r * 3.45, r * 4.0, Object.assign({ shadow: false, light: -1, lw: 1.3, turn: 0.5 }, o));
  function folioKids() {
    return K.cached('s5:folio:kids', () => {
      const X0 = 3900, Y0 = 160, C = makeCache(940, 1000, 1.25, 0.45), x = C.x, B = C.B; x.translate(-X0, -Y0); C.mx.translate(-X0, -Y0);
      const { f, m, c: ch, r, cr } = KIDS;
      roundel(B, f[0], f[1], r, '#3a557f', cc => bust(cc, f[0], f[1], r, { robe: M.woolB, hat: 'hood', cape: M.wool, beard: true, hairCol: M.hair[0] }), { diaper: true });
      roundel(B, m[0], m[1], r, '#7a2a2a', cc => bust(cc, m[0], m[1], r, { kind: 'gown', robe: M.woolG, hat: 'veil', veilCol: '#ece4d0', turn: -0.5 }), { diaper: true });
      const kidO = [{ robe: '#c9b38a', hairCol: M.hair[3] }, { robe: M.woolR, hairCol: M.hair[1] }, { robe: '#8e9a7a', hairCol: M.hair[0] }];
      ch.forEach(([cx, cy], i) => {
        roundel(B, cx, cy, cr, ['#33507a', '#6e2a24', '#3d6656'][i], cc => bust(cc, cx, cy + cr * 0.12, cr * 0.9, Object.assign({ kind: 'child', turn: i === 1 ? 0.2 : (i ? -0.5 : 0.5) }, kidO[i])), { diaper: true });
        // the name ribbon beneath
        const ry = cy + cr + 34; painted(x, cc => { cc.beginPath(); cc.moveTo(cx - 92, ry - 15); cc.quadraticCurveTo(cx, ry - 24, cx + 92, ry - 15); cc.lineTo(cx + 104, ry); cc.lineTo(cx + 92, ry + 15); cc.quadraticCurveTo(cx, ry + 6, cx - 92, ry + 15); cc.lineTo(cx - 104, ry); cc.closePath(); }, '#efe6cf', { grad: [0, ry - 20, 0, ry + 20], lit: 0.2, dark: 0.18, lw: 1.3 });
        script(x, cx - 70, ry + 5, 140, 13, 800 + i, { color: rgba(M.ink, 0.85) });
      });
      vine(B, [[3930, 1140], [3990, 1010], [3940, 880], [3990, 720], [3930, 560], [3990, 420], [3940, 270], [4010, 180]], 501, { leaf: 18, w: 1.8 });
      vine(B, [[4810, 180], [4760, 330], [4820, 470], [4770, 640], [4820, 800], [4760, 960], [4820, 1120]], 502, { leaf: 18, w: 1.8 });
      for (let k = 0; k < 3; k++) script(x, 4150, 1080 + k * 26, 520, 14, 840 + k, { color: rgba(M.ink, 0.7) });
      // the parents' ribbons
      for (const [cx, cy] of [f, m]) { const ry = cy + r + 34; painted(x, cc => { cc.beginPath(); cc.moveTo(cx - 100, ry - 15); cc.quadraticCurveTo(cx, ry - 24, cx + 100, ry - 15); cc.lineTo(cx + 112, ry); cc.lineTo(cx + 100, ry + 15); cc.quadraticCurveTo(cx, ry + 6, cx - 100, ry + 15); cc.lineTo(cx - 112, ry); cc.closePath(); }, '#efe6cf', { grad: [0, ry - 20, 0, ry + 20], lit: 0.2, dark: 0.18, lw: 1.3 }); script(x, cx - 78, ry + 5, 156, 13, 820 + cx, { color: rgba(M.ink, 0.85) }); }
      return C.c;
    });
  }
  // the line of descent: a double rule in vermilion, drawn on as the camera travels
  function descentPath() {
    return K.cached('s5:folio:path', () => {
      const { f, m, c: ch } = KIDS;
      const main = K.bez([[HEAD.x + HEAD.r + 30, LINE_Y - 40], [800, LINE_Y - 60], [860, LINE_Y - 150], [900, LINE_Y - 150], [960, LINE_Y - 150], [1000, LINE_Y + 150], [1080, LINE_Y + 150], [1160, LINE_Y + 150], [1180, LINE_Y], [PAN.lived.x + 40, LINE_Y]], 18)
        .concat([[PAN.lived.x + PAN.lived.w - 40, LINE_Y]])
        .concat(K.bez([[PAN.lived.x + PAN.lived.w - 40, LINE_Y], [2700, LINE_Y], [2700, LINE_Y], [PAN.married.x + 40, LINE_Y]], 8))
        .concat([[PAN.married.x + PAN.married.w - 40, LINE_Y]])
        .concat(K.bez([[PAN.married.x + PAN.married.w - 40, LINE_Y], [3980, LINE_Y], [3990, f[1] + 120], [f[0] - KIDS.r - 16, f[1]]], 16));
      const wed = [[f[0] + KIDS.r + 16, f[1]], [m[0] - KIDS.r - 16, m[1]]];
      const mid = [(f[0] + m[0]) / 2, f[1]], fork = [mid[0], 640];
      const kids = ch.map(([cx, cy]) => K.bez([mid, [mid[0], 560], fork, fork, [fork[0], 700], [cx, 680], [cx, cy - KIDS.cr - 14]], 14));
      const tail = K.bez([[m[0] + KIDS.r + 16, m[1]], [4800, m[1]], [4800, LINE_Y], [PAN.court.x + 40, LINE_Y]], 16);
      return { main, wed, kids, tail };
    });
  }
  function rule(c, pts, p, col, w = 3.2, gap = 7) {
    if (p <= 0) return;
    c.save(); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.globalCompositeOperation = 'multiply';
    const offs = (o) => pts.map((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [q[0] - dy / l * o, q[1] + dx / l * o]; });
    K.line(c, offs(-gap / 2), p); K.line(c, offs(gap / 2), p);
    c.restore();
  }

  // ---- "where he lived": a noble family dining in a bright hall | families queueing for bread in the cold
  const LIV = { mid: 676, table: 640, fam: [[214, 1], [352, 1], [478, -1]], q: [[800, 'man'], [904, 'mother'], [1012, 'old'], [1104, 'child'], [1206, 'woman']], hatch: [700, 560] };
  function livedBack(B, w, h) {
    const x = B.x, mid = LIV.mid;
    // ---- the hall (left)
    x.save(); x.beginPath(); x.rect(0, 0, mid, h); x.clip();
    G(B, cc => { cc.beginPath(); cc.rect(0, 0, mid, 330); }, 0, 40, mid, 320, { sheen: 0.5, outline: false });
    x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(105,66,18,0.4)'; for (let j = 0; j < 16; j++) for (let i = 0; i < 30; i++) { x.beginPath(); x.arc(i * 24 + (j % 2) * 12, j * 21, 1.6, 0, TAU); x.fill(); } x.restore();
    painted(x, cc => { cc.beginPath(); cc.rect(0, 300, mid, 30); }, '#b8a27c', { grad: [0, 300, 0, 330], lw: 1.2 });
    diaper(x, 0, 330, mid, 480, '#7d2019', 'rgba(222,184,100,0.5)', '#e0b860', 34);
    painted(x, cc => { cc.beginPath(); cc.rect(110, 360, 460, 330); }, '#24336e', { lw: 1.4 });
    diaper(x, 112, 362, 456, 326, '#24336e', 'rgba(222,184,100,0.45)', '#dcb35a', 30);
    G(B, cc => { cc.beginPath(); cc.rect(106, 352, 468, 10); }, 106, 352, 574, 362, { lw: 1 });
    for (let k = 0; k < 23; k++) { x.save(); x.fillStyle = k % 2 ? M.verm : '#dcb35a'; x.fillRect(112 + k * 20, 362, 10, 14); x.restore(); }
    // warm floor
    x.fillStyle = '#b07a4a'; x.fillRect(0, 800, mid, 220);
    for (let j = 0; j < 7; j++) for (let i = 0; i < 20; i++) if ((i + j) % 2) { x.fillStyle = '#e0c89a'; x.fillRect(i * 36, 800 + j * 34, 36, 34); }
    x.fillStyle = 'rgba(40,20,8,0.25)'; x.fillRect(0, 800, mid, 220);
    // the family at their table (seated behind it)
    const fam = [{ kind: 'robe', robe: '#7a2a20', mantle: '#24336e', fur: true, hat: 'coronet', beard: true, hairCol: M.hair[1], sash: '#9a2a1c', armN: { a: 0.9, b: 0.9, hand: 'open', fl: 0.7 } },
      { kind: 'gown', robe: '#2f5a46', mantle: '#7a2a20', hat: 'veil', circlet: true, sash: '#9a2a1c', armN: { a: 0.4, b: 1.3, hand: 'open', fl: 0.5 } },
      { kind: 'child', robe: '#c39a43', seal: true, armN: { a: 0.5, b: 1.2, hand: 'open', fl: 0.6 }, turn: 0.7 }];
    LIV.fam.forEach(([fx, fc], i) => { const sz = i === 2 ? 230 : 330; fig(x, fx, LIV.table + (i === 2 ? 0.48 : 0.56) * sz, sz, Object.assign({ face: fc, light: 1, seed: 30 + i }, fam[i])); });
    // the table, the feast, the candlesticks
    painted(x, cc => { cc.beginPath(); cc.moveTo(84, LIV.table); cc.lineTo(600, LIV.table); cc.lineTo(612, LIV.table + 26); cc.lineTo(72, LIV.table + 26); cc.closePath(); }, '#f0e8d4', { grad: [0, LIV.table, 0, LIV.table + 26], lit: 0.2, dark: 0.1, lw: 1.3 });
    const drop = cc => { cc.beginPath(); cc.moveTo(72, LIV.table + 26); cc.lineTo(612, LIV.table + 26); cc.lineTo(616, 800); for (let k = 0; k <= 16; k++) cc.lineTo(616 - 548 * k / 16, 800 + (k % 2 ? 5 : 0)); cc.closePath(); };
    painted(x, drop, '#e6dcc4', { grad: [72, 0, 616, 0], lit: 0.12, dark: 0.2, lw: 1.4 });
    x.save(); drop(x); x.clip(); for (let k = 0; k < 12; k++) { const px = 90 + k * 46; x.strokeStyle = 'rgba(42,25,14,0.28)'; x.lineWidth = 1.1; x.beginPath(); x.moveTo(px, LIV.table + 40); x.lineTo(px + 2, 800); x.stroke(); } x.fillStyle = M.vermD; x.fillRect(72, LIV.table + 34, 544, 18); x.restore();
    G(B, cc => { cc.beginPath(); cc.ellipse(300, LIV.table + 8, 44, 10, 0, 0, TAU); }, 256, LIV.table, 344, LIV.table + 18, { lw: 1 });
    painted(x, cc => { cc.beginPath(); cc.ellipse(300, LIV.table - 6, 30, 16, 0, Math.PI, TAU); cc.closePath(); }, '#9a5a2a', { grad: [270, 0, 330, 0], lit: 0.35, lw: 1.2 });
    for (const gx of [170, 420, 540]) G(B, cc => { cc.beginPath(); cc.moveTo(gx - 9, LIV.table - 22); cc.quadraticCurveTo(gx - 8, LIV.table - 4, gx - 2, LIV.table - 2); cc.lineTo(gx - 2, LIV.table + 6); cc.lineTo(gx - 8, LIV.table + 9); cc.lineTo(gx + 8, LIV.table + 9); cc.lineTo(gx + 2, LIV.table + 6); cc.lineTo(gx + 2, LIV.table - 2); cc.quadraticCurveTo(gx + 8, LIV.table - 4, gx + 9, LIV.table - 22); cc.closePath(); }, gx - 9, LIV.table - 22, gx + 9, LIV.table + 9, { lw: 1 });
    for (const bx of [380, 230]) painted(x, cc => { cc.beginPath(); cc.ellipse(bx, LIV.table + 2, 22, 12, 0, 0, TAU); }, '#b8864a', { grad: [bx - 20, 0, bx + 20, 0], lit: 0.3, lw: 1.1 });
    for (const cx of [110, 590]) { G(B, cc => { cc.beginPath(); cc.moveTo(cx - 14, LIV.table + 10); cc.lineTo(cx + 14, LIV.table + 10); cc.lineTo(cx + 4, LIV.table - 4); cc.lineTo(cx + 3, LIV.table - 40); cc.lineTo(cx + 10, LIV.table - 46); cc.lineTo(cx - 10, LIV.table - 46); cc.lineTo(cx - 3, LIV.table - 40); cc.lineTo(cx - 4, LIV.table - 4); cc.closePath(); }, cx - 14, LIV.table - 46, cx + 14, LIV.table + 10, { lw: 1 }); painted(x, cc => { cc.beginPath(); cc.rect(cx - 5, LIV.table - 92, 10, 46); }, '#efe6cf', { grad: [cx - 5, 0, cx + 5, 0], lit: 0.3, lw: 1 }); }
    // a servant brings a dish
    fig(x, 46, 960, 330, { kind: 'tunic', robe: '#6a5a7a', hat: 'coif', face: 1, light: 1, walk: 0.6, armN: { a: 1.2, b: 0.9, hand: 'open' }, seed: 41, turn: 0.8 });
    painted(x, cc => { cc.beginPath(); cc.ellipse(140, 692, 34, 9, 0, 0, TAU); }, '#cfc6b4', { lw: 1.1 });
    // a crown of candles hangs over the feast
    x.save(); x.strokeStyle = '#3a2614'; x.lineWidth = 2; x.beginPath(); x.moveTo(340, 0); x.lineTo(340, 205); x.stroke(); x.restore();
    G(B, cc => { cc.beginPath(); cc.ellipse(340, 230, 120, 18, 0, 0, TAU); cc.ellipse(340, 226, 106, 12, 0, 0, TAU, true); }, 220, 212, 460, 248, { lw: 1.2 });
    for (let k = 0; k < 6; k++) { const px = 340 + Math.cos(k / 6 * TAU + 0.3) * 110, py = 230 + Math.sin(k / 6 * TAU + 0.3) * 16; painted(x, cc => { cc.beginPath(); cc.rect(px - 4, py - 34, 8, 30); }, '#efe6cf', { lw: 0.9 }); }
    // the hall glows with candle-light
    x.save(); x.globalCompositeOperation = 'soft-light'; const gw = x.createRadialGradient(340, 560, 30, 340, 560, 560); gw.addColorStop(0, 'rgba(255,200,120,0.75)'); gw.addColorStop(1, 'rgba(120,60,20,0.2)'); x.fillStyle = gw; x.fillRect(0, 0, mid, h); x.restore();
    x.restore();
    // ---- outside, in the cold (right)
    x.save(); x.beginPath(); x.rect(mid, 0, w - mid, h); x.clip();
    const sky = x.createLinearGradient(0, 0, 0, 640); sky.addColorStop(0, '#26303f'); sky.addColorStop(0.6, '#5d6b7c'); sky.addColorStop(1, '#a7b1bc'); x.fillStyle = sky; x.fillRect(mid, 0, w - mid, 660);
    const r = rng(55); x.fillStyle = 'rgba(240,244,248,0.75)'; for (let k = 0; k < 160; k++) { x.beginPath(); x.arc(mid + r() * (w - mid), r() * 640, 1 + r() * 2.2, 0, TAU); x.fill(); }
    painted(x, cc => { cc.beginPath(); cc.moveTo(mid, 640); for (let k = 0; k <= 14; k++) cc.lineTo(mid + (w - mid) * k / 14, 590 - 34 * Math.sin(k * 0.8) - 18 * Math.sin(k * 2.1)); cc.lineTo(w, 660); cc.lineTo(mid, 660); cc.closePath(); }, '#c3ccd4', { grad: [0, 560, 0, 660], lit: 0.2, dark: 0.2, lw: 1.2 });
    painted(x, cc => { cc.beginPath(); cc.moveTo(mid, 650); cc.quadraticCurveTo(1000, 630, w, 655); cc.lineTo(w, h); cc.lineTo(mid, h); cc.closePath(); }, '#e2e7ec', { grad: [0, 640, 0, h], lit: 0.1, dark: 0.22, lw: 1.3 });
    x.save(); x.strokeStyle = 'rgba(80,100,130,0.25)'; x.lineWidth = 2; for (let k = 0; k < 9; k++) { x.beginPath(); x.moveTo(mid + 60 + k * 70, 700 + k * 30); x.quadraticCurveTo(mid + 200 + k * 60, 690 + k * 32, mid + 340 + k * 50, 712 + k * 30); x.stroke(); } x.restore();
    // a bare tree, ink on the cold sky
    x.save(); x.strokeStyle = rgba(M.ink, 0.9); x.lineCap = 'round';
    const br = (bx, by, a, L, wd, d) => { if (d > 6 || L < 6) return; const ex = bx + Math.cos(a) * L, ey = by + Math.sin(a) * L; x.lineWidth = wd; x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo((bx + ex) / 2 + 6, (by + ey) / 2, ex, ey); x.stroke(); br(ex, ey, a - 0.45 - K.hash(d, L | 0, 3) * 0.3, L * 0.72, wd * 0.68, d + 1); br(ex, ey, a + 0.38 + K.hash(L | 0, d, 4) * 0.3, L * 0.66, wd * 0.66, d + 1); };
    br(1270, 860, -1.62, 170, 16, 0); x.restore();
    // the queue, cold and waiting, facing the hatch
    const qo = { man: { kind: 'tunic', robe: M.woolB, hat: 'hood', cape: M.wool, carry: 'bowl', armN: { a: 1.9, b: 0.4, hand: 'open' }, turn: 0.6 },
      mother: { kind: 'gown', robe: M.woolR, hat: 'veil', veilCol: '#cfc6b2', carry: 'baby', turn: 0.3 },
      old: { kind: 'robe', robe: M.wool, hat: 'hood', cape: M.woolD, carry: 'staff', beard: true, hairCol: M.hair[4], lean: 0.12, turn: 0.4 },
      child: { kind: 'child', robe: M.woolG, turn: -0.4, armN: { a: 0.3, b: 0.5 } },
      woman: { kind: 'gown', robe: M.woolD, hat: 'hood', cape: M.woolB, turn: 0.5, armN: { a: 0.5, b: 1.5, hand: 'open', fl: 0.7 } } };
    for (const [qx, k] of LIV.q.slice().reverse()) fig(x, qx, 930 + (k === 'child' ? 6 : 0), k === 'child' ? 220 : 330, Object.assign({ face: -1, cold: 1, light: -1, seed: qx }, qo[k]));
    // the cold light
    x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(150,170,200,0.55)'; x.fillRect(mid, 0, w - mid, h); x.restore();
    // warm spill from the hatch onto the snow
    x.save(); x.globalCompositeOperation = 'screen'; const sp = x.createRadialGradient(760, 780, 10, 760, 780, 230); sp.addColorStop(0, 'rgba(255,190,110,0.35)'); sp.addColorStop(1, 'rgba(255,190,110,0)'); x.fillStyle = sp; x.fillRect(mid, 560, 360, 440); x.restore();
    x.restore();
    // ---- the wall between: the hall's outer wall, a hatch where bread is handed out
    ashlar(x, mid - 34, 0, 92, h, '#b9a888', 71, 40, 46);
    x.save(); const gp = x.createLinearGradient(mid - 34, 0, mid + 58, 0); gp.addColorStop(0, 'rgba(40,24,12,0.35)'); gp.addColorStop(0.5, 'rgba(255,240,220,0.1)'); gp.addColorStop(1, 'rgba(40,40,60,0.4)'); x.fillStyle = gp; x.fillRect(mid - 34, 0, 92, h); x.restore();
    x.save(); x.strokeStyle = rgba(M.ink, 0.85); x.lineWidth = 1.8; x.strokeRect(mid - 34, -10, 92, h + 20); x.restore();
    painted(x, cc => archPath(cc, mid + 6, 520, 52, 110, 26), '#3a2410', { lw: 1.4 });
    x.save(); x.globalCompositeOperation = 'screen'; const hg = x.createRadialGradient(mid + 32, 590, 0, mid + 32, 590, 60); hg.addColorStop(0, 'rgba(255,200,120,0.9)'); hg.addColorStop(1, 'rgba(255,160,80,0)'); x.fillStyle = hg; x.fillRect(mid - 30, 530, 120, 120); x.restore();
    // a hand through the hatch with a loaf
    fig(x, mid + 4, 1000, 400, { kind: 'robe', robe: '#7a5a3a', part: 'arms', face: 1, armN: { a: 2.0, b: -0.35, hand: 'open', ul: 0.4, fl: 0.9 }, light: 1 });
    painted(x, cc => { cc.beginPath(); cc.ellipse(mid + 88, 586, 22, 14, 0.3, 0, TAU); }, '#b8864a', { grad: [mid + 66, 0, mid + 110, 0], lit: 0.3, lw: 1.2 });
  }
  // ---- "whom he married": the registry desk refuses a marriage
  const MAR = { desk: [600, 1010, 556], reg: 812, man: 318, wom: 444 };
  function marriedBack(B, w, h) {
    const x = B.x;
    ashlar(x, 0, 0, w, 800, '#c2b08e', 91, 40, 74);
    x.save(); const g = x.createLinearGradient(0, 0, 0, 800); g.addColorStop(0, 'rgba(40,24,12,0.3)'); g.addColorStop(1, 'rgba(40,24,12,0)'); x.fillStyle = g; x.fillRect(0, 0, w, 800); x.restore();
    G(B, cc => { cc.beginPath(); cc.rect(0, 0, w, 250); }, 0, 30, w, 240, { sheen: 0.45, outline: false });
    x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(105,66,18,0.4)'; for (let j = 0; j < 12; j++) for (let i = 0; i < 48; i++) { x.beginPath(); x.arc(i * 24 + (j % 2) * 12, j * 21, 1.6, 0, TAU); x.fill(); } x.restore();
    painted(x, cc => { cc.beginPath(); cc.rect(0, 232, w, 26); }, '#a8946e', { grad: [0, 232, 0, 258], lw: 1.2 });
    // shelves of the registry: ledgers, rolls
    const r = rng(92);
    for (let sh = 0; sh < 3; sh++) {
      const sy = 360 + sh * 130; painted(x, cc => { cc.beginPath(); cc.rect(40, sy, 330, 12); }, M.woodD, { lw: 1.1 });
      let bx = 46; while (bx < 360) { const bw = 14 + r() * 16, bh = 70 + r() * 40, col = [M.vermD, M.ultra, '#5a3a20', M.verd, '#7a5a2a', '#3a2a3a'][Math.floor(r() * 6)]; painted(x, cc => { cc.beginPath(); cc.rect(bx, sy - bh, bw, bh); }, col, { grad: [bx, 0, bx + bw, 0], lit: 0.25, dark: 0.35, lw: 1 }); G(B, cc => { cc.beginPath(); cc.rect(bx + 2, sy - bh + 10, bw - 4, 3); }, bx, sy - bh, bx + bw, sy - bh + 14, { outline: false }); bx += bw + 2; }
    }
    lancet(x, 494, 290, 74, 300, 93);
    // the cloth of the registry behind the desk
    painted(x, cc => { cc.beginPath(); cc.rect(612, 268, 400, 420); }, LAWS.field, { grad: [612, 0, 1012, 0], lit: 0.15, dark: 0.3, lw: 1.4 });
    x.save(); x.beginPath(); x.rect(612, 268, 400, 420); x.clip(); x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.35; x.fillStyle = pat(x, 'weave'); x.fillRect(612, 268, 400, 420); x.restore();
    x.save(); x.fillStyle = 'rgba(60,20,10,0.3)'; K.device(x, 'tree', 815, 349, 104); x.fillStyle = LAWS.charge; K.device(x, 'tree', 812, 345, 104); x.restore();
    G(B, cc => { cc.beginPath(); cc.rect(606, 262, 412, 10); }, 606, 262, 1018, 272, { lw: 1 });
    for (let k = 0; k < 20; k++) { x.save(); x.fillStyle = k % 2 ? M.verm : '#dcb35a'; x.fillRect(614 + k * 20, 688, 10, 14); x.restore(); }
    // floor
    x.fillStyle = '#d6c49a'; x.fillRect(0, 790, w, 240);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 34; i++) if ((i + j) % 2) { x.fillStyle = '#3d6656'; x.fillRect(i * 34, 790 + j * 32, 34, 32); }
    x.fillStyle = 'rgba(40,20,8,0.22)'; x.fillRect(0, 790, w, 240);
  }
  function marriedFront(B, w, h) {
    const x = B.x, [x0, x1, top] = MAR.desk;
    // the registrar's high desk, carved, with the great ledger, ink and seals
    const front = cc => { cc.beginPath(); cc.moveTo(x0, top + 30); cc.lineTo(x1, top + 30); cc.lineTo(x1 - 6, 900); cc.lineTo(x0 + 6, 900); cc.closePath(); };
    painted(x, front, M.wood, { grad: [x0, 0, x1, 0], lit: 0.2, dark: 0.4, lw: 1.6 });
    for (let k = 0; k < 4; k++) { const px = x0 + 30 + k * 94; painted(x, cc => archPath(cc, px, top + 70, 72, 220, 34), M.woodD, { grad: [px, 0, px + 72, 0], lit: 0.12, dark: 0.3, lw: 1.1 }); G(B, cc => { cc.beginPath(); cc.arc(px + 36, top + 160, 9, 0, TAU); }, px + 27, top + 151, px + 45, top + 169, { lw: 0.8 }); }
    painted(x, cc => { cc.beginPath(); cc.moveTo(x0 - 16, top + 30); cc.lineTo(x1 + 16, top + 30); cc.lineTo(x1 + 6, top); cc.lineTo(x0 - 6, top); cc.closePath(); }, M.woodD, { lw: 1.4 });
    // the ledger, open
    painted(x, cc => { cc.beginPath(); cc.moveTo(660, top + 6); cc.lineTo(960, top + 6); cc.lineTo(950, top - 26); cc.lineTo(670, top - 26); cc.closePath(); }, M.vermD, { lw: 1.2 });
    painted(x, cc => { cc.beginPath(); cc.moveTo(672, top); cc.quadraticCurveTo(740, top - 12, 810, top - 2); cc.quadraticCurveTo(880, top - 12, 948, top); cc.lineTo(940, top - 32); cc.quadraticCurveTo(875, top - 44, 810, top - 34); cc.quadraticCurveTo(745, top - 44, 680, top - 32); cc.closePath(); }, '#f0e6cc', { lw: 1.1 });
    for (let k = 0; k < 4; k++) { script(x, 690, top - 24 + k * 6, 110, 4, 900 + k); script(x, 822, top - 24 + k * 6, 110, 4, 910 + k); }
    // inkwell and quill, seal and wax
    painted(x, cc => { cc.beginPath(); cc.ellipse(980, top - 6, 14, 8, 0, 0, TAU); }, '#1d1a18', { lw: 1 });
    x.save(); x.strokeStyle = '#e8e0cc'; x.lineWidth = 3; x.beginPath(); x.moveTo(982, top - 10); x.quadraticCurveTo(996, top - 60, 1010, top - 100); x.stroke(); x.restore();
    sealDisc(x, 636, top - 6, 13, 0, 0);
    painted(x, cc => { cc.beginPath(); cc.rect(1012, top - 70, 10, 56); }, '#efe6cf', { grad: [1012, 0, 1022, 0], lit: 0.3, lw: 1 });
  }
  // ---- "whether his words were believed before a court"
  const CRT = { bench: [560, 1300, 470], judges: [742, 940, 1140], wit: 296 };
  function courtBack(B, w, h) {
    const x = B.x;
    // the witness's side: plain stone and a high window of cold light
    ashlar(x, 0, 0, 560, 820, '#a99a80', 101, 40, 70);
    x.save(); const g = x.createLinearGradient(0, 0, 560, 0); g.addColorStop(0, 'rgba(30,30,50,0.35)'); g.addColorStop(1, 'rgba(30,30,50,0.05)'); x.fillStyle = g; x.fillRect(0, 0, 560, 820); x.restore();
    lancet(x, 250, 200, 70, 230, 102, { cols: ['#5a7aa8', '#8fa8c8', '#3f5f8f', '#b0c0d4'] });
    // the tribunal: a gold-tooled ground, an arcade, a canopy
    diaper(x, 560, 0, w - 560, 820, '#1f2d66', 'rgba(222,184,100,0.5)', '#dcb35a', 38);
    for (let k = 0; k < 4; k++) { const cx = 600 + k * 236; painted(x, cc => { cc.beginPath(); cc.rect(cx - 13, 250, 26, 520); }, '#cdbd9a', { grad: [cx - 13, 0, cx + 13, 0], lit: 0.35, dark: 0.4, lw: 1.3 }); G(B, cc => { cc.beginPath(); cc.moveTo(cx - 22, 250); cc.lineTo(cx + 22, 250); cc.lineTo(cx + 13, 278); cc.lineTo(cx - 13, 278); cc.closePath(); }, cx - 22, 250, cx + 22, 278, { lw: 1 }); }
    for (let k = 0; k < 3; k++) { const ax = 600 + k * 236; x.save(); x.strokeStyle = '#cdbd9a'; x.lineWidth = 16; x.beginPath(); x.moveTo(ax, 252); x.quadraticCurveTo(ax + 118, 120, ax + 236, 252); x.stroke(); x.strokeStyle = rgba(M.ink, 0.7); x.lineWidth = 1.3; x.stroke(); x.restore(); }
    const can = cc => { cc.beginPath(); cc.moveTo(560, 0); cc.lineTo(w, 0); cc.lineTo(w, 190); for (let k = 0; k <= 16; k++) cc.lineTo(w - (w - 560) * k / 16, 190 + (k % 2 ? 22 : 0)); cc.closePath(); };
    painted(x, can, M.vermD, { grad: [0, 0, 0, 210], lit: 0.2, dark: 0.35, lw: 1.4 });
    for (let k = 0; k < 16; k++) G(B, cc => { const px = 560 + (w - 560) * (k + 0.5) / 16; cc.beginPath(); cc.arc(px, 200, 6, 0, TAU); }, 0, 194, 0, 206, { lw: 0.6 });
    // dais steps and floor
    painted(x, cc => { cc.beginPath(); cc.rect(500, 730, w - 500, 70); }, '#bfae8c', { grad: [0, 730, 0, 800], lit: 0.25, dark: 0.3, lw: 1.3 });
    x.fillStyle = '#cbb894'; x.fillRect(0, 800, w, 230);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 44; i++) if ((i + j) % 2) { x.fillStyle = '#7d3a2a'; x.fillRect(i * 32, 800 + j * 32, 32, 32); }
    x.fillStyle = 'rgba(40,20,8,0.22)'; x.fillRect(0, 800, w, 230);
    // the guard behind the witness, the scribe at the foot of the dais
    fig(x, 108, 930, 372, { kind: 'armour', robe: LAWS.field, device: LAWS, hat: 'kettle', carry: 'halberd', glove: M.steel, face: 1, light: -1, cold: 0.6, seed: 7, armN: { a: 0.3, b: 0.95, hand: 'fist' }, turn: 0.6 });
    fig(x, 470, 990, 300, { kind: 'robe', robe: '#3a3a52', hat: 'chaperon', hoodCol: '#2a2a3a', face: 1, light: 1, seed: 8, armN: { a: 0.9, b: 1.0, hand: 'fist', fl: 0.8 }, turn: 0.8 });
    painted(x, cc => { cc.beginPath(); cc.moveTo(480, 812); cc.lineTo(600, 812); cc.lineTo(590, 836); cc.lineTo(490, 836); cc.closePath(); }, M.wood, { lw: 1.2 });
    painted(x, cc => { cc.beginPath(); cc.rect(498, 836, 10, 150); cc.rect(572, 836, 10, 150); }, M.woodD, { lw: 1 });
    painted(x, cc => { cc.beginPath(); cc.rect(500, 804, 70, 10); }, '#efe6cc', { lw: 0.9 });
    // the window's cold light lies on the floor where the witness stands
    x.save(); x.globalCompositeOperation = 'screen'; const wl = x.createRadialGradient(300, 900, 20, 300, 900, 260); wl.addColorStop(0, 'rgba(170,190,220,0.35)'); wl.addColorStop(1, 'rgba(170,190,220,0)'); x.fillStyle = wl; x.fillRect(0, 600, 600, 420); x.restore();
    x.save(); x.globalCompositeOperation = 'soft-light'; const wj = x.createRadialGradient(940, 420, 40, 940, 420, 520); wj.addColorStop(0, 'rgba(255,200,120,0.7)'); wj.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = wj; x.fillRect(560, 0, w - 560, h); x.restore();
  }
  function courtFront(B, w, h) {
    const x = B.x, [x0, x1, top] = CRT.bench;
    const bench = cc => { cc.beginPath(); cc.moveTo(x0, top); cc.lineTo(x1, top); cc.lineTo(x1, 740); cc.lineTo(x0, 740); cc.closePath(); };
    painted(x, bench, M.vermD, { grad: [x0, 0, x1, 0], lit: 0.18, dark: 0.35, lw: 1.6 });
    x.save(); bench(x); x.clip(); for (let k = 0; k < 18; k++) { const px = x0 + 20 + k * 42; x.strokeStyle = 'rgba(30,10,6,0.3)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(px, top + 30); x.lineTo(px + 3, 740); x.stroke(); } x.restore();
    G(B, cc => { cc.beginPath(); cc.rect(x0, top, x1 - x0, 12); }, x0, top, x1, top + 12, { lw: 1 });
    for (let k = 0; k < 37; k++) { x.save(); x.fillStyle = k % 2 ? '#e0c070' : M.verm; x.fillRect(x0 + 4 + k * 20, top + 12, 10, 16); x.restore(); }
    roundel(B, 940, 610, 74, LAWS.field, cc => { cc.fillStyle = LAWS.charge; K.device(cc, 'tree', 940, 614, 96); }, { rim: 12 });
  }

  // the people of the folio who move
  function marriedActors(c, t, k) {
    // k.refuse 0..1: the registrar's palm; k.part 0..1: the couple's hands part
    const rf = k.refuse, pt = k.part;
    fig(c, MAR.reg, MAR.desk[2] + 0.5 * 372, 372, { kind: 'robe', robe: LAWS.field, mantle: '#86281b', hat: 'tall', hatCol: '#3a1410', face: -1, light: 1, seed: 61, turn: lerp(0.6, 0.95, rf), sway: 0.005,
      armN: { a: lerp(0.5, 2.5, rf), b: lerp(1.2, 0.5, rf), hand: rf > 0.3 ? 'palm' : 'open', fl: lerp(0.6, 1, rf) }, armF: { a: 0.6, b: 1.1, hand: 'open', fl: 0.6 }, beard: true, hairCol: M.hair[4] });
    // the couple: he carries no seal; she wears the registry's sash
    const join = 1 - pt;
    fig(c, MAR.man - pt * 14, 920, 380, { kind: 'tunic', robe: M.woolB, hose: M.woolD, hat: 'none', hairCol: M.hair[2], face: 1, light: 1, seed: 62, turn: lerp(0.7, 0.2, pt),
      armN: { a: lerp(1.15, 0.25, pt), b: lerp(0.15, 0.25, pt), hand: 'open' } });
    fig(c, MAR.wom + pt * 8, 920, 360, { kind: 'gown', robe: '#2b3d84', mantle: '#7a2a20', hat: 'circlet', long: true, hairCol: M.hair[3], sash: '#9a2a1c', face: 1, light: 1, seed: 63, turn: lerp(-0.7, -0.9, pt), circlet: true,
      armF: { a: lerp(-1.0, -0.1, pt), b: lerp(-0.25, 1.3, pt), hand: 'open', front: join > 0.5 }, armN: { a: lerp(0.4, 1.0, pt), b: lerp(1.3, 1.5, pt), hand: 'open', fl: 0.7 } });
  }
  function courtActors(c, t, k) {
    // k.speak 0..1 (the scroll unrolls), k.turn 0..1 (the judges turn away), k.fade 0..1 (the words fade, the scroll droops)
    fig(c, CRT.wit, 930, 386, { kind: 'tunic', robe: M.woolB, hose: M.woolD, hat: 'none', cape: M.wool, hairCol: M.hair[0], beard: true, face: 1, light: -1, cold: 0.85, seed: 71, turn: lerp(0.85, 0.6, k.fade),
      armN: { a: lerp(0.4, 2.55, smooth(k.speak * 1.6)), b: lerp(0.4, 0.35, k.speak), hand: 'palm' }, armF: { a: 0.6, b: 1.4, hand: 'open', fl: 0.7, front: true } });
    const J = CRT.judges;
    J.forEach((jx, i) => {
      const tw = smooth(span(k.turn, i * 0.15, 0.7 + i * 0.15));
      const o = { kind: 'robe', robe: '#86281b', fur: true, hat: 'judge', hatCol: '#5a1410', face: -1, light: 1, seed: 80 + i, beard: i !== 1, hairCol: M.hair[(i + 2) % 5], sway: 0.004,
        turn: lerp(0.8, -0.95, tw), away: smooth(span(tw, 0.45, 1)) * 0.9, lean: 0.05 * tw,
        armN: i === 2 ? { a: lerp(0.5, 2.2, smooth(span(k.turn, 0.5, 0.9))), b: lerp(1.0, 0.4, smooth(span(k.turn, 0.5, 0.9))), hand: 'palm' } : { a: 0.5, b: 1.1, hand: 'open', fl: 0.6 } };
      fig(c, jx, CRT.bench[2] + 0.48 * 380, 380, o);
    });
  }

  // ---- the folio, drawn
  const visRect = (v, m = 0) => ({ x0: v.x - W / (2 * v.z) - m, x1: v.x + W / (2 * v.z) + m, y0: v.y - H / (2 * v.z) - m, y1: v.y + H / (2 * v.z) + m });
  const sees = (R, x, y, w, h) => x < R.x1 && x + w > R.x0 && y < R.y1 && y + h > R.y0;
  function folioTimes() {
    return K.cached('s5:folio:T', () => {
      const L26 = K.cue('L26');
      const T = { L26, where: at('L26', 'where he lived'), whom: at('L26', 'whom he married'), child: at('L26', 'whether his children'), inh: at('L26', 'inherited his name'), words: at('L26', 'and whether his words'), bel: at('L26', 'believed before a court') };
      T.strike = T.inh + 0.12;
      return T;
    });
  }
  function folioCam(t) {
    const T = folioTimes(), L = T.L26, cx = P => P.x + P.w / 2;
    return camAt(t, [
      { t: L.start - 0.6, x: HEAD.x - 10, y: HEAD.y + 30, z: 1.55 },
      { t: L.start + 1.0, x: HEAD.x + 40, y: 690, z: 1.12 },
      { t: T.where - 0.6, x: 1180, y: 650, z: 0.9 },
      { t: T.where + 0.2, x: cx(PAN.lived), y: 640, z: 0.93 },
      { t: T.whom - 0.5, x: cx(PAN.lived) + 80, y: 636, z: 0.95 },
      { t: T.whom - 0.05, x: (cx(PAN.lived) + cx(PAN.married)) / 2 + 60, y: 630, z: 0.82 },
      { t: T.whom + 0.4, x: cx(PAN.married), y: 640, z: 0.95 },
      { t: T.child - 0.42, x: cx(PAN.married) + 60, y: 640, z: 0.98 },
      { t: T.child - 0.02, x: 3980, y: 650, z: 0.9 },
      { t: T.child + 0.45, x: 4372, y: 660, z: 1.2 },
      { t: T.words - 0.5, x: 4378, y: 676, z: 1.34 },
      { t: T.words - 0.05, x: 4980, y: 650, z: 0.92 },
      { t: T.words + 0.42, x: cx(PAN.court), y: 640, z: 1.0 },
      { t: L.end + 0.6, x: cx(PAN.court) + 30, y: 628, z: 1.1 },
      { t: L.end + 2, x: cx(PAN.court) + 40, y: 624, z: 1.14 },
    ], 3);
  }
  // how far along a polyline the ink has run when it has reached world x
  function upToX(pts, xLead) {
    let L = 0, at2 = -1, tot = 0; for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (pts[i][0] > xLead) { const f = clamp((xLead - pts[i - 1][0]) / ((pts[i][0] - pts[i - 1][0]) || 1)); at2 = L + d * f; break; } L += d; }
    return at2 < 0 ? 1 : at2 / tot;
  }
  function drawFolio(c, t, v) {
    const T = folioTimes(), R = visRect(v, 60);
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#0b0806'; c.fillRect(0, 0, W, H);
    setCam(c, v);
    // the page
    c.save(); c.beginPath(); c.rect(-260, FY0, 6800, FY1 - FY0); c.clip();
    vellum(c, Math.max(R.x0, -260), Math.max(R.y0, FY0), Math.min(R.x1, 6540), Math.min(R.y1, FY1), { scale: 1.3 });
    for (const [y0, y1, a0, a1] of [[FY0, FY0 + 120, 0.45, 0], [FY1 - 120, FY1, 0, 0.45]]) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, `rgba(80,52,24,${a0})`); g.addColorStop(1, `rgba(80,52,24,${a1})`); c.fillStyle = g; c.fillRect(R.x0, y0, R.x1 - R.x0, y1 - y0); }
    c.save(); c.strokeStyle = 'rgba(150,90,60,0.16)'; c.lineWidth = 1; for (const yy of [60, 90, 1190, 1220, 1250, 1280]) { c.beginPath(); c.moveTo(R.x0, yy); c.lineTo(R.x1, yy); c.stroke(); } c.restore();
    c.restore();
    // the line of descent, the ink leading the camera
    const D = descentPath(), lead = v.x + W / (2 * v.z) * 0.55 + 200;
    rule(c, D.main, upToX(D.main, lead), '#a8321f');
    const pk = smooth(span(t, T.child - 0.35, T.child + 0.55)), pw = smooth(span(t, T.child - 0.6, T.child - 0.05));
    rule(c, D.wed, pw, '#a8321f');
    const sk = smooth(span(t, T.strike + 0.05, T.strike + 0.6));
    D.kids.forEach((pts, i) => { if (i === KIDS.struck) { c.save(); c.globalAlpha = 1 - 0.75 * sk; rule(c, pts, pk, '#a8321f'); c.restore(); } else rule(c, pts, pk, '#a8321f'); });
    rule(c, D.tail, upToX(D.tail, lead), '#a8321f');
    // the head, the children's roundels
    if (sees(R, 0, FY0, 1240, 1440)) c.drawImage(folioHead(), 0, FY0, 1240, 1440);
    if (sees(R, 3900, 160, 940, 1000)) {
      c.drawImage(folioKids(), 3900, 160, 940, 1000);
      // the name struck from the tree: a knife-straight line of ink, then the bleed, the portrait greying
      const [cx, cy] = KIDS.c[KIDS.struck], ps = easeIn(span(t, T.strike, T.strike + 0.16));
      if (ps > 0) {
        const a0 = [cx - 150, cy - 126], a1 = [cx + 168, cy + KIDS.cr + 92], pts = [a0, a1];
        c.save(); c.globalCompositeOperation = 'multiply';
        c.globalAlpha = 0.5 * sk; c.fillStyle = 'rgba(70,64,60,1)'; c.beginPath(); c.arc(cx, cy, KIDS.cr, 0, TAU); c.fill();
        const bl = smooth(span(t, T.strike + 0.1, T.strike + 1.6));
        for (const [wd, al] of [[34, 0.07], [22, 0.1], [14, 0.14]]) { c.globalAlpha = al * bl; c.fillStyle = '#1c1008'; K.nib(c, K.resample(pts, 8), { w: wd, angle: -0.2, min: 0.85, taper: 0.06, p: ps }); }
        c.globalAlpha = 1; c.fillStyle = '#1c1008'; K.nib(c, K.resample(pts, 6), { w: 17, angle: 0.75, min: 0.75, taper: 0.035, p: ps, jit: 0.12, seed: 5 }); c.fillStyle = 'rgba(28,16,8,0.6)'; K.nib(c, K.resample([[a0[0] + 3, a0[1] + 5], [a1[0] + 3, a1[1] + 5]], 6), { w: 6, angle: 0.75, min: 0.8, taper: 0.1, p: ps * 0.97 });
        const r = rng(77); c.fillStyle = '#1c1008';
        for (let k = 0; k < 9; k++) { const u = r() * 0.15, d = (r() - 0.5) * 50, px = lerp(a0[0], a1[0], u) + d, py = lerp(a0[1], a1[1], u) + (r() - 0.5) * 40, rr = 1.5 + r() * 4; if (ps > u + 0.05) { c.beginPath(); c.arc(px, py, rr * (0.6 + 0.4 * bl), 0, TAU); c.fill(); } }
        c.restore();
      }
    }
    // the panels and their people
    const Lv = PAN.lived, Mr = PAN.married, Ct = PAN.court;
    if (sees(R, Lv.x, Lv.y, Lv.w, Lv.h)) {
      const pc = panel('lived', Lv, livedBack); drawPanelLayer(c, Lv, pc.c);
      c.save(); c.translate(Lv.x, Lv.y); innerOf(Lv)(c); c.clip();
      for (const cx of [110, 590]) flame(c, cx, LIV.table - 92, 18, t, cx, { glow: 1.2 });
      for (let k = 0; k < 6; k++) flame(c, 340 + Math.cos(k / 6 * TAU + 0.3) * 110, 230 + Math.sin(k / 6 * TAU + 0.3) * 16 - 34, 13, t, 20 + k, { glow: 0.9 });
      snowIn(c, t, LIV.mid + 60, 0, Lv.w - LIV.mid - 60, 940, 70, 12, 0.8);
      c.restore();
    }
    if (sees(R, Mr.x, Mr.y, Mr.w, Mr.h)) {
      const pc = panel('married', Mr, marriedBack, marriedFront); drawPanelLayer(c, Mr, pc.c);
      c.save(); c.translate(Mr.x, Mr.y); innerOf(Mr)(c); c.clip();
      marriedActors(c, t, { refuse: smooth(span(t, T.whom - 0.05, T.whom + 0.4)), part: smooth(span(t, T.whom + 0.3, T.whom + 0.95)) });
      c.restore(); drawPanelLayer(c, Mr, pc.f);
      c.save(); c.translate(Mr.x, Mr.y); flame(c, 1017, MAR.desk[2] - 70, 16, t, 4.4); c.restore();
    }
    if (sees(R, Ct.x, Ct.y, Ct.w, Ct.h)) {
      const pc = panel('court', Ct, courtBack, courtFront); drawPanelLayer(c, Ct, pc.c);
      const speak = smooth(span(t, T.words - 0.1, T.words + 1.2)), turn = span(t, T.bel - 0.45, T.bel + 0.75), fade = smooth(span(t, T.bel + 0.2, T.L26.end + 0.7));
      c.save(); c.translate(Ct.x, Ct.y); innerOf(Ct)(c); c.clip();
      courtActors(c, t, { speak, turn, fade });
      c.restore(); drawPanelLayer(c, Ct, pc.f);
      c.save(); c.translate(Ct.x, Ct.y); innerOf(Ct)(c); c.clip();
      banderole(c, [[372, 452], [430, 330], [560, 300], [640, 360], [700, 410], [760, 330], [800, 280]], 30, speak, 1 - fade, 51, fade * 0.9);
      c.restore();
    }
    // light: a candle's pool that follows the reading, a shaft of window light with its dust, the leaf catching it
    pool(c, W * 0.47, H * 0.44, 1050, [255, 230, 190], [40, 30, 22], 0.06, 1.45);
    if (!Q.low) beam(c, t, 120, -160, 1180, 1250, 90, 380, '255,228,180', 0.08, 611, 110);
    readerCandle(c, t, -60, 1150, 1);
    if (!Q.low) for (const [P, key] of [[Lv, 'lived'], [Mr, 'married'], [Ct, 'court']]) if (sees(R, P.x, P.y, P.w, P.h)) { const pc = panel(key, P); if (pc && pc.m) sheen(c, pc.m, P.x - 20, P.y - 20, P.w + 40, P.h + 40, v, W * 0.42 + 300 * Math.sin(t * 0.3 + P.x) - (v.x - P.x - P.w / 2) * 0.5 * v.z, H * 0.32, 640, 0.45); }
  }

  // ================================================================ THE COMMONS (L27): a frieze of three bays, cold light, warm doorways
  const CY0 = -170, CY1 = 1290;
  const BAY = [{ x: 0, y: 0, w: 1500, h: 1100, ah: 260 }, { x: 1530, y: 0, w: 1500, h: 1100, ah: 260 }, { x: 3060, y: 0, w: 1500, h: 1100, ah: 260 }];
  const GRAIN = K.HOUSES[1];
  function coldSky(x, x0, w, y1, seed) {
    const sky = x.createLinearGradient(0, 0, 0, y1); sky.addColorStop(0, '#2a3444'); sky.addColorStop(0.55, '#64717f'); sky.addColorStop(1, '#a9b2bb'); x.fillStyle = sky; x.fillRect(x0, 0, w, y1);
    const r = rng(seed); x.fillStyle = 'rgba(240,244,248,0.7)'; for (let k = 0; k < w * y1 / 4000; k++) { x.beginPath(); x.arc(x0 + r() * w, r() * y1, 0.8 + r() * 2, 0, TAU); x.fill(); }
  }
  function snowGround(B, x0, w, y0, h, seed) {
    painted(B.x, cc => { cc.beginPath(); cc.moveTo(x0, y0 + 10); cc.quadraticCurveTo(x0 + w / 2, y0 - 12, x0 + w, y0 + 6); cc.lineTo(x0 + w, y0 + h); cc.lineTo(x0, y0 + h); cc.closePath(); }, '#e0e5ea', { grad: [0, y0, 0, y0 + h], lit: 0.1, dark: 0.25, lw: 1.3 });
    const r = rng(seed); B.x.save(); B.x.strokeStyle = 'rgba(80,100,130,0.22)'; B.x.lineWidth = 2; for (let k = 0; k < w / 120; k++) { const px = x0 + r() * w, py = y0 + 30 + r() * (h - 40); B.x.beginPath(); B.x.moveTo(px, py); B.x.quadraticCurveTo(px + 60, py - 8, px + 140, py + 4); B.x.stroke(); } B.x.restore();
  }
  function house(B, x0, top, w, base, roof, seed) {
    const x = B.x, r = rng(seed), wall = ['#d9d2c0', '#cfc4ae', '#d6cdb8'][seed % 3];
    painted(x, cc => { cc.beginPath(); cc.rect(x0, top, w, base - top); }, wall, { grad: [x0, 0, x0 + w, 0], lit: 0.18, dark: 0.32, lw: 1.3 });
    // timber framing
    x.save(); x.beginPath(); x.rect(x0, top, w, base - top); x.clip(); x.strokeStyle = '#4a3624'; x.lineCap = 'square';
    const fl = Math.max(2, Math.round((base - top) / 120));
    for (let k = 0; k <= fl; k++) { const yy = top + (base - top) * k / fl; x.lineWidth = 7; x.beginPath(); x.moveTo(x0, yy); x.lineTo(x0 + w, yy); x.stroke(); }
    const cols = Math.max(2, Math.round(w / 70));
    for (let i = 0; i <= cols; i++) { const xx = x0 + w * i / cols; x.lineWidth = 6; x.beginPath(); x.moveTo(xx, top); x.lineTo(xx, base); x.stroke(); }
    for (let k = 0; k < fl; k++) for (let i = 0; i < cols; i++) if (r() < 0.45) { const ax = x0 + w * i / cols, bx = x0 + w * (i + 1) / cols, ay = top + (base - top) * k / fl, by = top + (base - top) * (k + 1) / fl; x.lineWidth = 4; x.beginPath(); if (r() < 0.5) { x.moveTo(ax, ay); x.lineTo(bx, by); } else { x.moveTo(bx, ay); x.lineTo(ax, by); } x.stroke(); }
    x.restore();
    // a door, shuttered windows
    painted(x, cc => archPath(cc, x0 + w * 0.14, base - 96, 42, 96, 21), '#3a2a1e', { lw: 1.1 });
    for (let k = 0; k < 2; k++) { const wx = x0 + w * (0.5 + k * 0.24), wy = top + 50 + (k % 2) * 30; if (wx + 30 > x0 + w) continue; painted(x, cc => { cc.beginPath(); cc.rect(wx, wy, 24, 30); }, '#222026', { lw: 1 }); painted(x, cc => { cc.beginPath(); cc.rect(wx - 12, wy, 11, 30); cc.rect(wx + 25, wy, 11, 30); }, ['#5d6f5a', '#6d4a3a', '#4f5f74'][seed % 3], { lw: 0.9 }); }
    // roof, snow on it, a chimney
    const rp = cc => { cc.beginPath(); cc.moveTo(x0 - 16, top + 4); cc.lineTo(x0 + w / 2, top - roof); cc.lineTo(x0 + w + 16, top + 4); cc.closePath(); };
    painted(x, rp, '#5a4436', { grad: [x0, 0, x0 + w, 0], lit: 0.2, dark: 0.35, lw: 1.3 });
    x.save(); rp(x); x.clip(); x.strokeStyle = 'rgba(30,20,12,0.35)'; x.lineWidth = 1.2; for (let yy = top - roof; yy < top + 6; yy += 12) { x.beginPath(); x.moveTo(x0 - 20, yy); x.lineTo(x0 + w + 20, yy); x.stroke(); } x.restore();
    painted(x, cc => { cc.beginPath(); cc.moveTo(x0 - 16, top + 4); cc.lineTo(x0 + w / 2, top - roof); cc.lineTo(x0 + w + 16, top + 4); cc.lineTo(x0 + w + 4, top - 8); cc.quadraticCurveTo(x0 + w * 0.75, top - roof * 0.5 - 6, x0 + w / 2, top - roof - 14); cc.quadraticCurveTo(x0 + w * 0.25, top - roof * 0.5 - 4, x0 - 4, top - 8); cc.closePath(); }, '#eef1f4', { lw: 1 });
    const chx = x0 + w * 0.7; painted(x, cc => { cc.beginPath(); cc.rect(chx, top - roof * 0.62 - 20, 22, roof * 0.5); }, '#8a7a6a', { lw: 1 });
  }
  // ---- bay 1: "Those without recognized bloodlines": the school procession at the gate of the registry's school
  const SCH = { portal: [1040, 1330, 380], guard: 952, ground: 930 };
  function bay1Back(B, w, h) {
    const x = B.x;
    coldSky(x, 0, w, 700, 301);
    painted(x, cc => { cc.beginPath(); cc.moveTo(0, 640); for (let k = 0; k <= 10; k++) cc.lineTo(w * k / 10, 600 - 30 * Math.sin(k * 1.1) - 16 * Math.sin(k * 2.7)); cc.lineTo(w, 700); cc.lineTo(0, 700); cc.closePath(); }, '#b9c2cb', { grad: [0, 560, 0, 700], lit: 0.2, dark: 0.2, lw: 1.1 });
    house(B, 30, 560, 170, 900, 110, 1); house(B, 228, 610, 150, 900, 96, 2); house(B, 404, 540, 190, 900, 120, 3); house(B, 620, 600, 150, 900, 100, 4); house(B, 790, 640, 96, 900, 80, 5);
    snowGround(B, 0, w, 860, 260, 311);
    const [p0, p1, ptop] = SCH.portal;
    ashlar(x, 900, 240, w - 900, 680, '#c4b393', 321, 40, 70);
    x.save(); const gw = x.createLinearGradient(900, 0, w, 0); gw.addColorStop(0, 'rgba(30,30,50,0.35)'); gw.addColorStop(1, 'rgba(30,30,50,0.1)'); x.fillStyle = gw; x.fillRect(900, 240, w - 900, 680); x.restore();
    for (let k = 0; k < 9; k++) painted(x, cc => { cc.beginPath(); cc.rect(904 + k * 66, 212, 40, 30); }, '#c4b393', { lw: 1.1 });
    x.save(); x.fillStyle = '#eef1f4'; for (let k = 0; k < 9; k++) x.fillRect(902 + k * 66, 208, 44, 6); x.restore();
    x.save(); archPath(x, p0, ptop, p1 - p0, SCH.ground - ptop, 150); x.clip();
    const wc = x.createLinearGradient(0, ptop, 0, SCH.ground); wc.addColorStop(0, '#ffcf82'); wc.addColorStop(0.6, '#f0a050'); wc.addColorStop(1, '#a8582a'); x.fillStyle = wc; x.fillRect(p0, ptop, p1 - p0, SCH.ground - ptop);
    for (let k = 0; k < 4; k++) { const cx = p0 + 40 + k * 80; painted(x, cc => { cc.beginPath(); cc.rect(cx - 8, 540, 16, 300); }, '#e8c890', { grad: [cx - 8, 0, cx + 8, 0], lit: 0.3, lw: 1 }); x.save(); x.strokeStyle = '#e8c890'; x.lineWidth = 10; x.beginPath(); x.moveTo(cx, 545); x.quadraticCurveTo(cx + 40, 490, cx + 80, 545); x.stroke(); x.restore(); }
    x.restore();
    painted(x, cc => { archPath(cc, p0 - 26, ptop - 30, p1 - p0 + 52, SCH.ground - ptop + 30, 170); archPath(cc, p0, ptop, p1 - p0, SCH.ground - ptop, 150, false); }, '#b8a684', { lw: 1.6, evenodd: true });
    K.shield(x, (p0 + p1) / 2, 300, 38, LAWS);
    if (B.m) { B.m.save(); B.m.lineWidth = 5; K.shieldPath(B.m, (p0 + p1) / 2, 300, 38); B.m.strokeStyle = '#fff'; B.m.stroke(); B.m.restore(); }
    x.save(); x.globalCompositeOperation = 'screen'; const sp = x.createRadialGradient((p0 + p1) / 2, 960, 20, (p0 + p1) / 2, 960, 380); sp.addColorStop(0, 'rgba(255,190,110,0.45)'); sp.addColorStop(1, 'rgba(255,190,110,0)'); x.fillStyle = sp; x.fillRect(700, 760, 800, 360); x.restore();
    x.save(); x.globalCompositeOperation = 'multiply'; const ct = x.createLinearGradient(0, 0, w, 0); ct.addColorStop(0, 'rgba(160,178,205,0.55)'); ct.addColorStop(0.55, 'rgba(160,178,205,0.4)'); ct.addColorStop(0.8, 'rgba(160,178,205,0.12)'); ct.addColorStop(1, 'rgba(160,178,205,0.05)'); x.fillStyle = ct; x.fillRect(0, 0, w, h); x.restore();
  }
  function bay1Front(B, w, h) {
    const x = B.x, [p0, p1, ptop] = SCH.portal;
    painted(x, cc => { cc.beginPath(); cc.moveTo(p0 - 30, SCH.ground + 20); cc.lineTo(p0 - 30, ptop + 80); cc.quadraticCurveTo(p0 - 20, ptop + 10, p0 + 30, ptop - 10); cc.lineTo(p0 + 30, ptop + 40); cc.quadraticCurveTo(p0 + 6, ptop + 90, p0 + 6, ptop + 160); cc.lineTo(p0 + 6, SCH.ground + 20); cc.closePath(); }, '#ad9b79', { grad: [p0 - 30, 0, p0 + 6, 0], lit: 0.3, dark: 0.3, lw: 1.5 });
  }
  // ---- bay 2: "were expected to serve the very houses": labourers carry for a great house
  const GRN = { steps: [[620, 960], [1010, 720]], door: [1060, 1300, 420, 720] };
  function bay2Back(B, w, h) {
    const x = B.x;
    coldSky(x, 0, w, 700, 401);
    snowGround(B, 0, w, 880, 240, 411);
    const [d0, d1, dt, db] = GRN.door;
    ashlar(x, 900, 200, w - 900, 720, '#c9b797', 421, 42, 76);
    painted(x, cc => { cc.beginPath(); cc.moveTo(880, 214); cc.lineTo(1200, 40); cc.lineTo(w + 20, 214); cc.closePath(); }, M.vermD, { grad: [880, 0, w, 0], lit: 0.25, dark: 0.35, lw: 1.5 });
    painted(x, cc => { cc.beginPath(); cc.moveTo(880, 214); cc.lineTo(1200, 40); cc.lineTo(w + 20, 214); cc.lineTo(w + 20, 200); cc.lineTo(1200, 26); cc.lineTo(880, 200); cc.closePath(); }, '#eef1f4', { lw: 1 });
    x.save(); archPath(x, d0, dt, d1 - d0, db - dt, 110); x.clip(); const wc = x.createLinearGradient(0, dt, 0, db); wc.addColorStop(0, '#f4c878'); wc.addColorStop(1, '#a8642e'); x.fillStyle = wc; x.fillRect(d0, dt, d1 - d0, db - dt);
    for (let k = 0; k < 7; k++) painted(x, cc => { cc.beginPath(); cc.ellipse(d0 + 40 + (k % 4) * 52, db - 30 - Math.floor(k / 4) * 50, 30, 24, 0, 0, TAU); }, '#c49a5a', { grad: [d0, 0, d1, 0], lit: 0.3, lw: 1 });
    x.restore();
    painted(x, cc => { archPath(cc, d0 - 22, dt - 26, d1 - d0 + 44, db - dt + 26, 128); archPath(cc, d0, dt, d1 - d0, db - dt, 110, false); }, '#b6a482', { lw: 1.5, evenodd: true });
    const st = cc => { cc.beginPath(); cc.moveTo(560, 1000); cc.lineTo(GRN.steps[0][0], GRN.steps[0][1]); cc.lineTo(GRN.steps[1][0], GRN.steps[1][1]); cc.lineTo(d1 + 30, GRN.steps[1][1]); cc.lineTo(d1 + 30, 1000); cc.closePath(); };
    painted(x, st, '#b3a383', { grad: [560, 700, 1300, 1000], lit: 0.2, dark: 0.3, lw: 1.5 });
    x.save(); st(x); x.clip(); x.strokeStyle = 'rgba(50,40,30,0.45)'; x.lineWidth = 2; for (let k = 0; k < 9; k++) { const u = k / 9, px = lerp(GRN.steps[0][0], GRN.steps[1][0], u), py = lerp(GRN.steps[0][1], GRN.steps[1][1], u); x.beginPath(); x.moveTo(px, py); x.lineTo(px, py + 26); x.lineTo(d1 + 40, py + 26); x.stroke(); } x.restore();
    painted(x, cc => { cc.beginPath(); cc.rect(110, 800, 380, 70); }, M.wood, { grad: [0, 800, 0, 870], lit: 0.2, dark: 0.35, lw: 1.4 });
    for (let k = 0; k < 7; k++) painted(x, cc => { cc.beginPath(); cc.ellipse(140 + (k % 5) * 70 + Math.floor(k / 5) * 35, 780 - Math.floor(k / 5) * 46, 42, 30, 0, 0, TAU); }, '#a68f66', { grad: [100, 740, 500, 820], lit: 0.25, dark: 0.35, lw: 1.2 });
    for (const wx of [170, 430]) { painted(x, cc => { cc.beginPath(); cc.arc(wx, 890, 56, 0, TAU); }, M.woodD, { lw: 1.4 }); x.save(); x.strokeStyle = M.wood; x.lineWidth = 6; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; x.beginPath(); x.moveTo(wx, 890); x.lineTo(wx + Math.cos(a) * 50, 890 + Math.sin(a) * 50); x.stroke(); } x.restore(); }
    x.save(); x.globalCompositeOperation = 'screen'; const sp = x.createRadialGradient(1180, 760, 20, 1180, 760, 360); sp.addColorStop(0, 'rgba(255,190,110,0.4)'); sp.addColorStop(1, 'rgba(255,190,110,0)'); x.fillStyle = sp; x.fillRect(800, 400, 700, 700); x.restore();
    x.save(); x.globalCompositeOperation = 'multiply'; const ct = x.createLinearGradient(0, 0, w, 0); ct.addColorStop(0, 'rgba(160,178,205,0.5)'); ct.addColorStop(0.5, 'rgba(160,178,205,0.38)'); ct.addColorStop(0.8, 'rgba(160,178,205,0.1)'); ct.addColorStop(1, 'rgba(160,178,205,0.05)'); x.fillStyle = ct; x.fillRect(0, 0, w, h); x.restore();
  }
  // ---- bay 3: "that denied them protection": refugees before the city's gate as it closes
  const GT = { o: [600, 1000, 360, 905] };
  function bay3Back(B, w, h) {
    const x = B.x, [g0, g1, gt, gb] = GT.o;
    coldSky(x, 0, w, 760, 501);
    x.save(); archPath(x, g0, gt, g1 - g0, gb - gt, 200); x.clip();
    const wc = x.createLinearGradient(0, gt, 0, gb); wc.addColorStop(0, '#f6cc84'); wc.addColorStop(1, '#a0602c'); x.fillStyle = wc; x.fillRect(g0, gt, g1 - g0, gb - gt);
    for (let k = 0; k < 5; k++) { const hx = g0 + 20 + k * 80, ht = 520 + (k % 2) * 40; x.fillStyle = 'rgba(150,90,40,0.55)'; x.fillRect(hx, ht, 64, gb - ht); x.beginPath(); x.moveTo(hx - 6, ht); x.lineTo(hx + 32, ht - 40); x.lineTo(hx + 70, ht); x.fill(); x.fillStyle = 'rgba(255,230,160,0.9)'; x.fillRect(hx + 22, ht + 40, 14, 20); }
    x.restore();
    ashlar(x, 0, 330, g0, 600, '#b4a688', 521, 44, 80); ashlar(x, g1, 330, w - g1, 600, '#b4a688', 522, 44, 80);
    for (const [cx, tw] of [[470, 260], [1130, 260]]) {
      painted(x, cc => { cc.beginPath(); cc.rect(cx - tw / 2, 200, tw, 730); }, '#bcae90', { grad: [cx - tw / 2, 0, cx + tw / 2, 0], lit: 0.3, dark: 0.45, lw: 1.6 });
      x.save(); x.beginPath(); x.rect(cx - tw / 2, 200, tw, 730); x.clip(); x.strokeStyle = 'rgba(60,46,30,0.35)'; x.lineWidth = 1.4; for (let yy = 230; yy < 930; yy += 40) { x.beginPath(); x.moveTo(cx - tw / 2, yy); x.quadraticCurveTo(cx, yy + 10, cx + tw / 2, yy); x.stroke(); } x.restore();
      for (let k = 0; k < 5; k++) painted(x, cc => { cc.beginPath(); cc.rect(cx - tw / 2 - 8 + k * (tw + 16) / 5, 166, (tw + 16) / 5 * 0.62, 36); }, '#bcae90', { lw: 1.2 });
      x.save(); x.fillStyle = '#eef1f4'; x.fillRect(cx - tw / 2 - 8, 160, tw + 16, 8); x.restore();
      painted(x, cc => archPath(cc, cx - 9, 330, 18, 60, 9), '#1e1a20', { lw: 1 }); painted(x, cc => archPath(cc, cx - 9, 560, 18, 60, 9), '#1e1a20', { lw: 1 });
    }
    painted(x, cc => { archPath(cc, g0 - 30, gt - 40, g1 - g0 + 60, gb - gt + 40, 230); archPath(cc, g0, gt, g1 - g0, gb - gt, 200, false); }, '#b0a080', { lw: 1.6, evenodd: true });
    for (let k = 0; k < 7; k++) K.shield(x, g0 + 30 + k * (g1 - g0 - 60) / 6, 270, 22, K.HOUSES[k]);
    for (let k = 0; k < 12; k++) painted(x, cc => { cc.beginPath(); cc.rect(g0 - 30 + k * 40, 296, 24, 34); }, '#b4a688', { lw: 1 });
    for (const gx2 of [250, 420, 1090, 1300]) fig(x, gx2, 336, 150, { kind: 'armour', robe: '#5a5a62', hat: 'kettle', carry: 'spear', face: gx2 < 700 ? 1 : -1, cold: 1, shadow: false, lw: 1.2, seed: gx2 });
    snowGround(B, 0, w, 900, 220, 511);
  }
  function commonsTimes() {
    return K.cached('s5:commons:T', () => {
      const L27 = K.cue('L27');
      return { L27, those: L27.start, serve: at('L27', 'were expected'), houses: at('L27', 'the very houses'), denied: at('L27', 'that denied') };
    });
  }
  function commonsCam(t) {
    const T = commonsTimes(), L = T.L27;
    return camAt(t, [
      { t: L.start - 0.7, x: 690, y: 640, z: 1.3 },
      { t: T.serve - 0.45, x: 830, y: 652, z: 1.4 },
      { t: T.serve + 0.3, x: BAY[1].x + 760, y: 600, z: 1.1 },
      { t: T.denied - 0.4, x: BAY[1].x + 860, y: 610, z: 1.16 },
      { t: T.denied + 0.35, x: BAY[2].x + 790, y: 620, z: 1.08 },
      { t: L.end + 0.4, x: BAY[2].x + 800, y: 660, z: 1.32 },
      { t: L.end + 2, x: BAY[2].x + 800, y: 670, z: 1.4 },
    ], 4);
  }
  function drawCommons(c, t, v) {
    const T = commonsTimes(), R = visRect(v, 60);
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#080a0c'; c.fillRect(0, 0, W, H);
    setCam(c, v);
    c.save(); c.beginPath(); c.rect(-300, CY0, 5200, CY1 - CY0); c.clip();
    vellum(c, Math.max(R.x0, -300), Math.max(R.y0, CY0), Math.min(R.x1, 4900), Math.min(R.y1, CY1), { scale: 1.3 });
    for (const [y0, y1, a0, a1] of [[CY0, CY0 + 120, 0.45, 0], [CY1 - 120, CY1, 0, 0.45]]) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, `rgba(80,52,24,${a0})`); g.addColorStop(1, `rgba(80,52,24,${a1})`); c.fillStyle = g; c.fillRect(R.x0, y0, R.x1 - R.x0, y1 - y0); }
    c.restore();
    const snowAll = (P, n, seed) => { c.save(); c.translate(P.x, P.y); innerOf(P)(c); c.clip(); snowIn(c, t, 0, 0, P.w, P.h, n, seed, 0.85); c.restore(); };
    // ---- bay 1
    const B1 = BAY[0];
    if (sees(R, B1.x, B1.y, B1.w, B1.h)) {
      const pc = panel('bay1', B1, bay1Back, bay1Front); drawPanelLayer(c, B1, pc.c);
      c.save(); c.translate(B1.x, B1.y); innerOf(B1)(c); c.clip();
      const t0 = T.L27.start - 0.9, sp = 150, stopAt = SCH.guard - 80, stop = T.L27.start + 0.8, x0last = stopAt - sp * (stop - t0);
      const kids = [];
      for (let k = 0; k < 6; k++) {
        const last = k === 5, x0 = x0last + (5 - k) * 102;
        let xk = x0 + (t - t0) * sp, moving = true;
        if (last && t > stop) { const d = t - stop; xk = stopAt + sp * 0.2 * (1 - Math.exp(-d * 5)); moving = d < 0.3; }
        kids.push({ k, x: xk, last, moving, ph: (t - t0) * 7.2 + k * 1.3 });
      }
      const mx = x0last + 5 * 102 + 120 + (t - t0) * sp * 0.92;
      if (mx < SCH.portal[0] + 260) fig(c, mx, SCH.ground + 4, 400, { kind: 'robe', robe: '#3a3f6a', mantle: '#24336e', hat: 'chaperon', hoodCol: '#2a2a40', carry: 'book', face: 1, walk: (t - t0) * 6, light: 1, seed: 90, turn: 0.8, sway: 0.01 });
      const ga = smooth(span(t, stop - 0.55, stop + 0.05));
      fig(c, SCH.guard, SCH.ground + 6, 410, { kind: 'armour', robe: LAWS.field, device: LAWS, hat: 'kettle', carry: 'halberd', glove: M.steel, face: -1, light: 1, cold: 0.3, seed: 91, turn: lerp(0.7, 0.95, ga), lean: 0.1 * ga,
        armF: { a: lerp(0.3, 0.62, ga), b: lerp(0.4, 0.32, ga), hand: 'palm', front: true, fl: 1.1 }, armN: { a: 0.3, b: 0.95, hand: 'fist' } });
      for (const kd of kids.slice().reverse()) {
        if (kd.x > SCH.portal[0] + 260) continue;
        const inLight = smooth(span(kd.x, 700, 980));
        fig(c, kd.x, SCH.ground + 10, 250, { kind: 'child', robe: ['#c9b38a', '#8e9a7a', '#b08a6a', '#8a8fa0', '#a8906a', M.woolB][kd.k], hairCol: M.hair[(kd.k * 2) % 5], seal: !kd.last, sealGlint: kd.last ? 0 : inLight * (0.6 + 0.4 * Math.sin(t * 5 + kd.k)),
          face: 1, light: 1, cold: kd.last ? 1 : lerp(0.9, 0.1, inLight), walk: kd.moving ? kd.ph : undefined, seed: 200 + kd.k, turn: kd.last && !kd.moving ? lerp(0.6, 0.95, smooth(span(t, stop, stop + 0.6))) : 0.7,
          armN: kd.last && !kd.moving ? { a: 0.2, b: 1.9, hand: 'open', fl: 0.8 } : undefined, long: kd.k % 2 === 0 });
      }
      c.restore(); drawPanelLayer(c, B1, pc.f);
      snowAll(B1, 70, 31);
      // the warm court beyond the portal, glowing against the cold street
      { const [p0, p1, ptop] = SCH.portal, gx = B1.x + (p0 + p1) / 2, gy = B1.y + 650; c.save(); c.globalCompositeOperation = 'screen'; const g = c.createRadialGradient(gx, gy, 20, gx, gy, 420); g.addColorStop(0, 'rgba(255,170,80,0.32)'); g.addColorStop(1, 'rgba(255,170,80,0)'); c.fillStyle = g; c.fillRect(gx - 420, gy - 420, 840, 840); c.restore(); }
    }
    // ---- bay 2
    const B2 = BAY[1];
    if (sees(R, B2.x, B2.y, B2.w, B2.h)) {
      const pc = panel('bay2', B2, bay2Back); drawPanelLayer(c, B2, pc.c);
      c.save(); c.translate(B2.x, B2.y); innerOf(B2)(c); c.clip();
      hangBanner(c, bannerTex(GRAIN, BAN_W, BAN_H), 1180, 300, 104, 214, t, { wind: 0.5, seed: 2, z: v.z });
      fig(c, 1250, GRN.steps[1][1] + 2, 400, { kind: 'robe', robe: GRAIN.field, mantle: '#3d6656', fur: true, device: GRAIN, hat: 'chaperon', hoodCol: '#5a4020', carry: 'staff', face: -1, light: 1, seed: 95, turn: 0.8, armF: { a: -1.3, b: -0.2, hand: 'point', front: true } });
      const t0 = T.serve - 1.2, stepY = px => { const [[ax, ay], [bx, by]] = GRN.steps; return px < ax ? 990 : px > bx ? by : lerp(ay, by, (px - ax) / (bx - ax)); };
      const lab = [[200, 'sack'], [420, 'sack'], [640, 'beam'], [860, 'sack'], [1000, 'sack']];
      lab.forEach(([x0, load], k) => {
        const px = x0 + (t - t0) * 55, py = Math.min(990, stepY(px));
        if (px > GRN.door[0] + 60) return;
        fig(c, px, py, 380, { kind: 'tunic', robe: [M.woolD, M.wool, M.woolB, M.woolG, M.woolR][k], hose: '#4a4038', hat: k % 2 ? 'coif' : 'hood', cape: M.woolD, carry: load, lean: load === 'beam' ? 0.18 : 0.32, face: 1, light: 1, cold: 0.85, walk: (t - t0) * 4.2 + k * 1.7, seed: 300 + k, turn: 0.6,
          armN: load === 'sack' ? { a: 0.55, b: 1.7, hand: 'fist', fl: 0.8 } : { a: -2.0, b: -0.9, hand: 'fist' }, armF: load === 'sack' ? { a: 0.4, b: 1.9, hand: 'fist', fl: 0.7 } : undefined });
      });
      c.restore();
      snowAll(B2, 60, 32);
    }
    // ---- bay 3
    const B3 = BAY[2];
    if (sees(R, B3.x, B3.y, B3.w, B3.h)) {
      const pc = panel('bay3', B3, bay3Back); drawPanelLayer(c, B3, pc.c);
      c.save(); c.translate(B3.x, B3.y); innerOf(B3)(c); c.clip();
      const [g0, g1, gt, gb] = GT.o, cl = easeIn(span(t, T.denied + 0.1, T.denied + 1.35)), warm = 1 - cl;
      const half = (g1 - g0) / 2;
      for (const sd of [-1, 1]) {
        const hinge = sd < 0 ? g0 : g1, wv = half * lerp(0.12, 1, cl), x0 = sd < 0 ? hinge : hinge - wv;
        c.save(); archPath(c, g0, gt, g1 - g0, gb - gt, 200); c.clip();
        painted(c, cc => { cc.beginPath(); cc.rect(x0, gt - 10, wv, gb - gt + 10); }, '#5a3e24', { grad: [x0, 0, x0 + wv, 0], lit: sd < 0 ? 0.15 : 0.05, dark: sd < 0 ? 0.25 : 0.45, lw: 1.6 });
        c.strokeStyle = 'rgba(30,20,10,0.55)'; c.lineWidth = 2; for (let k = 1; k < 6; k++) { const px = x0 + wv * k / 6; c.beginPath(); c.moveTo(px, gt); c.lineTo(px, gb); c.stroke(); }
        c.fillStyle = '#2a2a2e'; for (const yy of [gt + 140, gt + 300, gt + 450]) c.fillRect(x0, yy, wv, 14);
        c.restore();
      }
      const ref = [[260, { kind: 'gown', robe: M.woolR, hat: 'veil', veilCol: '#cfc6b2', carry: 'baby', turn: 0.5 }], [420, { kind: 'tunic', robe: M.woolB, hat: 'hood', cape: M.wool, carry: 'bundle', armN: { a: lerp(1.9, 1.3, cl), b: 0.25, hand: 'open' }, turn: 0.8 }],
        [560, { kind: 'child', robe: M.woolG, turn: 0.9 }], [680, { kind: 'robe', robe: M.wool, hat: 'hood', cape: M.woolD, carry: 'staff', beard: true, hairCol: M.hair[4], lean: 0.1, turn: 0.6 }],
        [1110, { kind: 'gown', robe: M.woolD, hat: 'hood', cape: M.woolB, face: -1, carry: 'bundle', turn: 0.4 }], [1240, { kind: 'tunic', robe: '#7a6a58', hat: 'coif', face: -1, armN: { a: lerp(2.3, 0.6, cl), b: 0.3, hand: 'open' }, turn: 0.9 }]];
      for (const [rx, o] of ref) fig(c, rx, 1010, o.kind === 'child' ? 240 : 390, Object.assign({ face: 1, light: rx < 800 ? 1 : -1, cold: lerp(0.55, 1, cl), seed: rx }, o));
      if (warm > 0.01) { c.save(); c.globalCompositeOperation = 'screen'; const g = c.createRadialGradient(800, 960, 10, 800, 960, 520 * (0.3 + 0.7 * warm)); g.addColorStop(0, `rgba(255,190,110,${0.45 * warm})`); g.addColorStop(1, 'rgba(255,190,110,0)'); c.fillStyle = g; c.fillRect(200, 500, 1200, 600); c.restore(); }
      c.restore();
      snowAll(B3, 80, 33);
    }
    const close = smooth(span(t, T.L27.end - 0.2, T.L27.end + 0.5));
    pool(c, W * 0.5, H * 0.42, 1100 * (1 - 0.35 * close), [Math.round(lerp(236, 120, close)), Math.round(lerp(232, 120, close)), Math.round(lerp(226, 130, close))], [28, 30, 36], 0.04, 1.4);
    if (!Q.low) beam(c, t, 1500, -200, 700, 1250, 120, 360, '205,220,240', 0.06 * (1 - close), 621, 90);
    if (!Q.low) for (const [P, key] of [[B1, 'bay1'], [B2, 'bay2'], [B3, 'bay3']]) if (sees(R, P.x, P.y, P.w, P.h)) { const pc = panel(key, P); if (pc && pc.m) sheen(c, pc.m, P.x - 20, P.y - 20, P.w + 40, P.h + 40, v, W * 0.4 - (v.x - P.x - P.w / 2) * 0.5 * v.z, H * 0.3, 600, 0.35); }
  }

  // ================================================================ the scene: shots, joins, finish
  function sceneTimes(sc) {
    return K.cached('s5:T', () => {
      const L25 = K.cue('L25'), L26 = K.cue('L26'), L27 = K.cue('L27'), L28 = K.cue('L28'), L29 = K.cue('L29'), L30 = K.cue('L30');
      return { sc, L25, L26, L27, L28, L29, L30 };
    });
  }
  function hallCam1(t, T) {
    return camAt(t, [
      { t: T.sc.start, x: 700, y: 330, z: 1.32 },
      { t: T.L25.start - 0.45, x: 700, y: 410, z: 1.25 },
      { t: T.L25.start + 1.3, x: 700, y: 1060, z: 1.0 },
      { t: T.L26.start + 0.6, x: 700, y: 1130, z: 1.22 },
    ], 2);
  }
  function hallCam2(t, T) {
    const TT = hallTimes();
    const v = camAt(t, [
      { t: T.L28.start - 1.2, x: 700, y: 1010, z: 1.02 },
      { t: T.L28.end, x: 700, y: 1050, z: 1.16 },
      { t: TT.acc + 0.9, x: 700, y: 1080, z: 1.42 },
      { t: TT.gal + 1.0, x: 690, y: 1010, z: 1.12 },
      { t: TT.dark0, x: 700, y: 990, z: 1.04 },
      { t: TT.dark1, x: 660, y: 1330, z: 1.3 },
      { t: T.sc.end, x: 640, y: 1290, z: 1.72 },
      { t: T.sc.end + 1.5, x: 636, y: 1286, z: 1.8 },
    ], 5);
    // a jolt as each banner is torn down
    let j = 0; for (const tt of TT.tears) { const d = t - tt; if (d > 0 && d < 0.45) j += Math.exp(-d * 9) * 9; }
    if (j > 0) { const [dx, dy] = K.shake(t, j, 33); v.x += dx / v.z; v.y += dy / v.z; }
    return v;
  }
  SCENES[5] = {
    join: 'dissolve', joinDur: 1.4,
    _dev: { fig, M, goldFill, script, sealDisc, at, spline, DBG },
    draw(ctx, t, sc) {
      t = clamp(t, sc.start, sc.end + 1.4);
      const T = sceneTimes(sc);
      const shots = [
        { a: sc.start - 1, b: T.L26.start + 0.3, draw: (c, tt) => drawHall(c, tt, hallCam1(tt, T)) },  // order matters: see the dissolve below
        { a: T.L26.start - 0.5, b: T.L27.start + 0.25, draw: (c, tt) => drawFolio(c, tt, folioCam(tt)) },
        { a: T.L27.start - 0.55, b: T.L28.start + 0.2, draw: (c, tt) => drawCommons(c, tt, commonsCam(tt)) },
        { a: T.L28.start - 0.6, b: sc.end + 2, draw: (c, tt) => drawHall(c, tt, hallCam2(tt, T)) },
      ];
      const on = shots.filter(S => t >= S.a && t < S.b);
      const draw1 = (c, S, tt) => { c.save(); S.draw(c, tt); c.restore(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; };
      if (on.length > 1) {
        // a dissolve: the outgoing shot is frozen once at the dissolve's start (always the same instant, so the picture is
        // deterministic) and keeps a slow push while the incoming shot is drawn live over it
        const A = on[0], S = on[1], i = shots.indexOf(A), tA = S.a, u = smooth(span(t, S.a, A.b));
        const still = K.cached('s5:freeze:' + i, () => { const c = K.canvas(W, H), x = c.getContext('2d'); draw1(x, A, tA); return c; });
        const k = 1 + 0.035 * (t - tA);
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.drawImage(still, -W / 2, -H / 2); ctx.restore();
        const L = K.layer('s5:shot'), lc = L.getContext('2d'); draw1(lc, S, t);
        ctx.globalAlpha = u; ctx.drawImage(L, 0, 0); ctx.globalAlpha = 1;
      } else draw1(ctx, on[0], t);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },
  };
})();
