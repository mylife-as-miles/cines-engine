/* AUTOPILOT — LOOK A "WHITE HEAT" — helpers for the three style frames.
   Cut paper in daylight. The sun is the antagonist: it is drawn as hard white planes that eat into the paper.
   Built on the shared kit (kit/otm.js, kit/figures.js), which this file never modifies.
   Deterministic: no Math.random, no Date. */
(function (global) {
  'use strict';
  const O = global.OTM, { S, W, H } = O;

  // ---------- palette ----------
  const P = {
    // the sun and the bleached paper it leaves behind
    sun: '#FFFDF7', bleach: '#F6F1E7', bone: '#E9E0D1', bone2: '#D8CEBD',
    // morning shade (cool, quiet, still some colour in the world)
    m1: '#C3CBCC', m2: '#97A4AA', m3: '#66747D', m4: '#3B4851', mInk: '#1B242B',
    // the office: refrigerated blue-green (colour script only)
    o1: '#D2E5DF', o2: '#93B9B1', o3: '#4F7C75', oInk: '#1D3735',
    // evening copper, dusk, silence
    c0: '#F3C58A', c1: '#E39A5B', c2: '#BE6A3C', c3: '#874026', c4: '#4A2419',
    d1: '#5C557A', d2: '#3D3A5E', d3: '#272642', d4: '#16162A',
    // the two accents. ROSE belongs to Emily and appears nowhere else; GREEN is the phone's charging pulse.
    rose: '#E8A3AF', roseLt: '#F5CBD1', roseSh: '#B97B88', roseDk: '#8E5A66',
    green: '#62E394', greenHot: '#C9FFD9', greenDk: '#1F8F52',
    // cold type
    cold: '#D6E4EC', cold2: '#9DB3C1', cold3: '#5F7A8B',
    matte: '#07090B',
  };

  // ---------- small maths ----------
  const norm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  // ---------- pinhole camera (metres; x right, y up, z forward). yaw + turns right, pitch + looks up ----------
  function cam(o) {
    const cyw = Math.cos(o.yaw || 0), syw = Math.sin(o.yaw || 0), cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0), cr = Math.cos(o.roll || 0), sr = Math.sin(o.roll || 0);
    const f = o.f || (W / 2) / Math.tan((o.fov || 1.1) / 2);
    const cx = o.cx == null ? W / 2 : o.cx, cy = o.cy == null ? H / 2 : o.cy, e = o.eye;
    const view = p => {
      const x = p[0] - e[0], y = p[1] - e[1], z = p[2] - e[2];
      const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw;
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      return [x1 * cr + y2 * sr, -x1 * sr + y2 * cr, z2];
    };
    const P2 = p => { const v = view(p); return [cx + f * v[0] / v[2], cy - f * v[1] / v[2]]; };
    const proj = v => [cx + f * v[0] / v[2], cy - f * v[1] / v[2]];
    // a polygon clipped against the near plane before projection (ground planes that run past the lens)
    const poly = (a, near) => {
      near = near || 0.15; const V = a.map(view), out = [];
      for (let i = 0; i < V.length; i++) {
        const A = V[i], B = V[(i + 1) % V.length], ia = A[2] >= near, ib = B[2] >= near;
        if (ia) out.push(A);
        if (ia !== ib) { const t = (near - A[2]) / (B[2] - A[2]); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, near]); }
      }
      return out.map(proj);
    };
    return { f, view, P: P2, pts: a => a.map(P2), poly, scaleAt: z => f / z };
  }

  // ---------- paths ----------
  const polyS = pts => S().poly(pts);
  const polyP = (pts, rough, seed) => S().poly(pts).path(rough == null ? 0.8 : rough, seed == null ? 3 : seed);
  function fillP(g, path, color, alpha) { g.save(); if (alpha != null) g.globalAlpha = alpha; g.fillStyle = color; g.fill(path); g.restore(); }
  function fillPts(g, pts, color, rough, seed, alpha) { const p = polyP(pts, rough, seed); fillP(g, p, color, alpha); return p; }
  // the kit's printed dither seam, in any colour
  const _dith = {};
  function dither(g, color) {
    if (_dith[color]) return _dith[color];
    const c = O.makeCanvas(4, 4), q = c.getContext('2d'); q.fillStyle = color; [[0, 0], [2, 2], [2, 0], [0, 2], [1, 1], [3, 3]].forEach(([x, y]) => q.fillRect(x, y, 1, 1));
    return (_dith[color] = g.createPattern(c, 'repeat'));
  }
  function seam(g, path, color, w) { g.save(); g.strokeStyle = dither(g, color); g.lineWidth = w || 5; g.lineJoin = 'round'; g.stroke(path); g.restore(); }

  // Posterised bands that grow outward from a shape: layers [{w, color}] outer first. The core is filled last in `core`.
  // This is how a sun plane is drawn: a flat white core, one or two flat penumbra bands, a dither seam between them.
  function bands(g, path, layers, core, opts) {
    opts = opts || {};
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    if (opts.clip) g.clip(opts.clip);
    layers.forEach((L, i) => {
      g.strokeStyle = L.color; g.lineWidth = L.w * 2; g.stroke(path); g.fillStyle = L.color; g.fill(path);
      if (i > 0 && opts.seam !== false) { g.save(); g.strokeStyle = dither(g, layers[i - 1].color); g.lineWidth = 4; g.translate(0, 0); g.restore(); }
    });
    if (core) { g.fillStyle = core; g.fill(path); if (opts.seam !== false && layers.length) seam(g, path, layers[layers.length - 1].color, 4); }
    g.restore();
  }
  // A hard white sun plane: optional penumbra bands, a white core, its bloom written to the emissive buffer.
  function sunPlane(g, E, path, o) {
    o = o || {};
    const layers = o.layers || [];
    bands(g, path, layers, o.core || P.sun, { clip: o.clip, seam: o.seam });
    if (E && o.glow !== 0) { E.save(); if (o.clip) E.clip(o.clip); E.globalAlpha = o.glow == null ? 0.55 : o.glow; E.fillStyle = o.glowColor || '#FFFFFF'; E.fill(path); E.restore(); }
  }

  // ---------- rim light: a crisp crescent on the lit side only ----------
  const _tmp = { c: null };
  function tmp() { if (!_tmp.c) _tmp.c = O.makeCanvas(W, H); const t = _tmp.c.getContext('2d'); t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'source-over'; t.globalAlpha = 1; t.filter = 'none'; t.clearRect(0, 0, W, H); return t; }
  function rim(g, path, dir, w, color, clip, alpha) {
    const t = tmp(); t.fillStyle = color; t.fill(path); t.globalCompositeOperation = 'destination-out'; t.translate(-dir[0] * w, -dir[1] * w); t.fill(path);
    g.save(); if (clip) g.clip(clip); g.globalAlpha = alpha == null ? 1 : alpha; g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(_tmp.c, 0, 0); g.restore();
  }
  // inner shade: the shape's own core shadow, cut on the side away from the light (a second paper layer)
  function innerShade(g, path, dir, w, color, alpha, clip) {
    const t = tmp(); t.fillStyle = color; t.fill(path); t.globalCompositeOperation = 'destination-out'; t.translate(dir[0] * w, dir[1] * w); t.fill(path);
    t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'destination-in'; t.fill(path);
    g.save(); if (clip) g.clip(clip); g.globalAlpha = alpha == null ? 1 : alpha; g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(_tmp.c, 0, 0); g.restore();
  }
  // paint only inside a path (clip helper)
  function within(g, path, fn) { g.save(); g.clip(path); fn(); g.restore(); }
  // an opaque foreground shape must also block the bloom of whatever bright thing sits behind it
  function occlude(E, path) { if (!E) return; E.save(); E.globalCompositeOperation = 'destination-out'; E.fillStyle = '#000'; E.fill(path); E.restore(); }

  // ---------- type ----------
  // Time stamps: large, cold type. The digits are big; the A.M./P.M. is a smaller cap set on the same baseline.
  function stamp(g, digits, ampm, x, y, o) {
    o = o || {};
    const size = o.size || 200, fam = o.family || 'Oswald', wt = o.weight || 300, col = o.color || P.cold, a = o.alpha == null ? 1 : o.alpha;
    g.save(); g.globalAlpha = a; g.fillStyle = col; g.textBaseline = 'alphabetic';
    g.font = `${wt} ${size}px "${fam}"`; g.letterSpacing = (o.tracking == null ? size * 0.02 : o.tracking) + 'px';
    const dw = g.measureText(digits).width; let x0 = o.align === 'right' ? x - dw - (o.gap || size * 0.12) - (o.ampmW || size * 0.42) : x;
    g.fillText(digits, x0, y);
    const s2 = o.ampmSize || size * 0.25; g.font = `${o.ampmWeight || 400} ${s2}px "${o.ampmFamily || fam}"`; g.letterSpacing = (s2 * 0.18) + 'px';
    const ax = x0 + dw + (o.gap || size * 0.1); g.fillText(ampm, ax, o.ampmY == null ? y : y + o.ampmY);
    const aw = g.measureText(ampm).width; g.restore();
    return { x: x0, w: ax + aw - x0 };
  }
  function text(g, str, x, y, o) { return O.text(g, str, x, y, o); }

  // ---------- chrome: slate in the matte ----------
  function slate(ctx, left, right, aspect) {
    const a = O.liveArea(aspect || 2.0); const y = a.top > 40 ? a.top / 2 + 8 : 34;
    ctx.save(); ctx.globalAlpha = 0.5;
    O.text(ctx, left, 48, y, { family: 'Barlow Condensed', weight: 500, size: 22, color: '#E9EEF0', tracking: 3.2 });
    O.text(ctx, right, W - 48, y, { family: 'Barlow Condensed', weight: 500, size: 22, color: '#E9EEF0', tracking: 3.2, align: 'right' });
    ctx.restore();
  }

  // ---------- finish: the kit compositor with this look's own vignette and matte ----------
  // vig: {color, a, inner, outer, cx, cy}. Bright frames get a light, tinted vignette (the kit's default is ink brown).
  function finish(f, ctx, o) {
    o = o || {};
    const vig = o.vig;
    f.finish({
      letterbox: o.letterbox || 2.0, grain: o.grain == null ? 0.06 : o.grain, fibre: o.fibre == null ? 0.045 : o.fibre,
      halation: o.halation == null ? 0.5 : o.halation, vignette: 0, matteColor: P.matte, seed: o.seed || 1,
      beforePost: c => {
        if (vig) {
          const gr = c.createRadialGradient(vig.cx || W / 2, vig.cy || H / 2, H * (vig.inner || 0.35), vig.cx || W / 2, vig.cy || H / 2, H * (vig.outer || 1.1));
          gr.addColorStop(0, O.rgba(vig.color || P.mInk, 0)); gr.addColorStop(1, O.rgba(vig.color || P.mInk, vig.a == null ? 0.35 : vig.a));
          c.fillStyle = gr; c.fillRect(0, 0, W, H);
        }
        if (o.before) o.before(c);
      },
      afterPost: o.after,
    });
  }

  // ---------- shape helpers ----------
  const smooth = (pts, closed) => O.fig.smooth(pts, closed == null ? true : closed);
  // a rounded rectangle as a Shape (corner radius r)
  function rrect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); const s = S();
    s.M(x + r, y).L(x + w - r, y).Q(x + w, y, x + w, y + r).L(x + w, y + h - r).Q(x + w, y + h, x + w - r, y + h).L(x + r, y + h).Q(x, y + h, x, y + h - r).L(x, y + r).Q(x, y, x + r, y).Z();
    return s;
  }
  // transform a list of points by a 2x3 affine [a,b,c,d,e,f]
  const ap = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
  // convex hull (monotone chain) of 2D points
  function hull(pts) {
    const p = pts.map(a => [a[0], a[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    p.forEach(q => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  // a hard-edged translucent plane of light in the air (vellum): flat, never a gradient
  function vellum(g, pts, color, alpha, clipOut) {
    const path = polyP(hull(pts), 0.8, 9);
    g.save();
    if (clipOut) { const c = new Path2D(); c.rect(-10, -10, W + 20, H + 20); c.addPath(clipOut); g.clip(c, 'evenodd'); }
    g.globalAlpha = alpha; g.fillStyle = color; g.fill(path); g.restore();
    return path;
  }

  global.LA = { P, norm, lerp2, cam, polyS, polyP, fillP, fillPts, dither, seam, bands, sunPlane, rim, innerShade, within, occlude, stamp, text, slate, finish, smooth, rrect, ap, hull, vellum };
})(window);
