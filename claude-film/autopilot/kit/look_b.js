/* AUTOPILOT — LOOK B "BRIGHT DAY" helpers (sits on top of kit/otm.js; never edits it).
   The idiom of the big story-animation channels: round-headed near-black characters with big white eyes,
   bright flat worlds, soft two-tone cel shading, chunky clean vector shapes (no cut-paper roughness).
   Deterministic: no Math.random / Date anywhere. */
(function (global) {
  'use strict';
  const O = global.OTM;
  const { W, H, rng, vnoise, fbm, clamp, lerp, hexToRgb, rgba, mix, makeCanvas } = O;
  const LB = {};

  // ---------- master palette (see design/look_b.md) ----------
  LB.C = {
    ink: '#1D1B29',        // every character: near-black with a violet lean, never pure black
    inkDeep: '#121019',    // cel shade on the characters
    inkLift: '#2E2B40',    // lit side of the characters (soft cel)
    eye: '#FFFDF6', pupil: '#15131D',
    collar: '#FFFFFF', tie: '#F2B23A', tieStripe: '#D88D1C',
    bobble: '#FFD23F', sockPink: '#FF8FB4', sockBlue: '#62C3FF',
    rabbit: '#FFA9C6', rabbitBelly: '#FFD6E4', rabbitEar: '#FF7DA7', rabbitShade: '#E9819F',
    phoneGreen: '#45E27C', phoneGlow: '#A6FFC4',
  };

  // ---------- colour utils ----------
  const toHex = a => '#' + a.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  LB.toHex = toHex;
  LB.lum = hex => { const [r, g, b] = hexToRgb(hex); return 0.299 * r + 0.587 * g + 0.114 * b; };
  // desaturate toward luminance by k (0..1), then pull toward a tint by t
  LB.desat = (hex, k, tint, t) => {
    const c = hexToRgb(hex), L = LB.lum(hex); let o = c.map(v => lerp(v, L, k));
    if (tint) { const q = hexToRgb(tint); o = o.map((v, i) => lerp(v, q[i], t || 0)); }
    return toHex(o);
  };
  LB.mul = (hex, k) => toHex(hexToRgb(hex).map(v => v * k));
  LB.mix = mix; LB.rgba = rgba;

  // ---------- paths (clean vector) ----------
  LB.rr = function (x, y, w, h, r) {
    const p = new Path2D(); const rs = Array.isArray(r) ? r : [r, r, r, r];
    const [a, b, c, d] = rs.map(v => Math.max(0, Math.min(v, w / 2, h / 2)));
    p.moveTo(x + a, y); p.lineTo(x + w - b, y); p.arcTo(x + w, y, x + w, y + b, b); p.lineTo(x + w, y + h - c); p.arcTo(x + w, y + h, x + w - c, y + h, c);
    p.lineTo(x + d, y + h); p.arcTo(x, y + h, x, y + h - d, d); p.lineTo(x, y + a); p.arcTo(x, y, x + a, y, a); p.closePath(); return p;
  };
  // polygon with rounded corners: pts [[x,y,r?],...], r default
  LB.roundPoly = function (pts, r, path) {
    const p = path || new Path2D(); const n = pts.length;
    const R = i => (pts[i][2] != null ? pts[i][2] : r);
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m0 = mid(pts[n - 1], pts[0]); p.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; const mb = mid(a, b); p.arcTo(a[0], a[1], mb[0], mb[1], R(i)); }
    p.closePath(); return p;
  };
  // Catmull-Rom spline through points (closed or open). A point [x,y,1] is a hard corner.
  LB.spline = function (pts, closed, path, tension) {
    const p = path || new Path2D(); const n = pts.length; const k = (tension == null ? 1 : tension) / 6;
    const P = i => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)];
    p.moveTo(pts[0][0], pts[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const c1 = p1[2] ? [p1[0], p1[1]] : [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
      const c2 = p2[2] ? [p2[0], p2[1]] : [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
      p.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
    }
    if (closed) p.closePath(); return p;
  };
  LB.poly = function (pts, path) { const p = path || new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; };
  LB.ell = function (cx, cy, rx, ry, rot, path) { const p = path || new Path2D(); const r = rot || 0; p.moveTo(cx + rx * Math.cos(r), cy + rx * Math.sin(r)); p.ellipse(cx, cy, rx, ry || rx, r, 0, Math.PI * 2); p.closePath(); return p; };
  // tapered capsule (limb) between two circles
  LB.capsule = function (x1, y1, r1, x2, y2, r2, path) {
    const p = path || new Path2D(); const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 0.001;
    if (d <= Math.abs(r1 - r2)) { const big = r1 > r2; p.moveTo((big ? x1 : x2) + Math.max(r1, r2), big ? y1 : y2); p.arc(big ? x1 : x2, big ? y1 : y2, Math.max(r1, r2), 0, Math.PI * 2); p.closePath(); return p; }
    const a = Math.atan2(dy, dx), off = Math.acos(clamp((r1 - r2) / d, -1, 1));
    p.moveTo(x1 + Math.cos(a + off) * r1, y1 + Math.sin(a + off) * r1);
    p.arc(x1, y1, r1, a + off, a - off + Math.PI * 2, false);
    p.arc(x2, y2, r2, a - off, a + off, false);
    p.closePath(); return p;
  };
  // a thick bent limb through 3 joints as two capsules (shoulder r1, elbow r2, wrist r3)
  LB.limb = function (A, B, Cc, r1, r2, r3, path) { const p = path || new Path2D(); LB.capsule(A[0], A[1], r1, B[0], B[1], r2, p); LB.capsule(B[0], B[1], r2, Cc[0], Cc[1], r3, p); return p; };

  // ---------- perspective camera (metres -> pixels) ----------
  // cam({x,y,z, f, cx, cy}) : looks down +z, y up, horizon at cy. P(x,y,z) -> [X,Y]
  LB.cam = function (o) {
    const c = Object.assign({ x: 0, y: 1.2, z: 0, f: 1300, cx: W / 2, cy: H / 2 }, o);
    const P = (x, y, z) => { const d = Math.max(0.05, z - c.z); return [c.cx + c.f * (x - c.x) / d, c.cy - c.f * (y - c.y) / d]; };
    P.c = c; P.k = z => c.f / Math.max(0.05, z - c.z);   // pixels per metre at depth z
    P.quad = (pts3) => pts3.map(q => P(q[0], q[1], q[2]));
    return P;
  };

  // ---------- layers and masks ----------
  LB.layer = function (w, h) { return makeCanvas(w || W, h || H).getContext('2d'); };
  // fill a canvas's alpha with a colour (returns a new canvas)
  LB.tint = function (src, color, alpha) {
    const g = LB.layer(src.width, src.height); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in';
    g.fillStyle = color; g.globalAlpha = alpha == null ? 1 : alpha; g.fillRect(0, 0, src.width, src.height); return g.canvas;
  };
  // crescent of a mask on the side facing (dx,dy) (rim) — mask minus mask shifted against the light
  LB.crescent = function (mask, dx, dy, blur) {
    const g = LB.layer(mask.width, mask.height); g.drawImage(mask, 0, 0);
    g.globalCompositeOperation = 'destination-out'; if (blur) g.filter = `blur(${blur}px)`; g.drawImage(mask, -dx, -dy); g.filter = 'none';
    return g.canvas;
  };
  // draw a near-black character from Path2D parts: base ink, soft cel shade on the far side, crisp rim on the lit side
  //   o: {ink, shade, lift, rim, light:{dx,dy} (unit-ish), shadeW, liftW, rimW, rimAlpha, shadeBlur, clip}
  LB.figure = function (g, parts, o) {
    o = Object.assign({ ink: LB.C.ink, shade: LB.C.inkDeep, lift: LB.C.inkLift, rim: null, light: { dx: 1, dy: -0.4 }, shadeW: 14, liftW: 10, rimW: 3, rimAlpha: 1, shadeBlur: 3, liftBlur: 4, liftAlpha: 1 }, o || {});
    // the mask is built in device space under the caller's transform (so figures can be drawn inside a rotated mirror, a camera, ...)
    const m = LB.layer(); m.setTransform(g.getTransform()); m.fillStyle = '#fff'; parts.forEach(p => m.fill(p));
    if (o.extraMask) o.extraMask(m);
    m.setTransform(1, 0, 0, 1, 0, 0);
    const L = Math.hypot(o.light.dx, o.light.dy) || 1, ux = o.light.dx / L, uy = o.light.dy / L;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(LB.tint(m.canvas, o.ink), 0, 0);
    // shade: the part of the figure far from the light (mask minus mask shifted away from the light)
    if (o.shade && o.shadeW) { const cr = LB.crescent(m.canvas, -ux * o.shadeW, -uy * o.shadeW, o.shadeBlur); g.drawImage(LB.tint(cr, o.shade), 0, 0); }
    if (o.lift && o.liftW) { const cr = LB.crescent(m.canvas, ux * o.liftW, uy * o.liftW, o.liftBlur); g.save(); g.globalAlpha = o.liftAlpha; g.drawImage(LB.tint(cr, o.lift), 0, 0); g.restore(); }
    if (o.rim && o.rimW) { const cr = LB.crescent(m.canvas, ux * o.rimW, uy * o.rimW, 0); g.save(); g.globalAlpha = o.rimAlpha; g.drawImage(LB.tint(cr, o.rim), 0, 0); g.restore(); }
    g.restore();
    return m.canvas;   // device-space mask
  };

  // ---------- eyes: big white ovals, lids, pupils ----------
  //   o: {x, y, rx, ry, rot, lid 0..1 (upper lid closure), lidTilt (radians, + = outer corner down), lower 0..1,
  //       px, py (pupil offset in eye radii), pr (pupil radius in rx), glint, white, ink, lash}
  LB.eye = function (g, o) {
    const rx = o.rx, ry = o.ry || o.rx * 1.18; const lid = o.lid || 0, lower = o.lower || 0;
    g.save(); g.translate(o.x, o.y); g.rotate(o.rot || 0);
    const eyeP = new Path2D(); eyeP.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    g.save(); g.clip(eyeP);
    // the lids are SUBTRACTED from the white (the character's own head shows through as the lid): no seams
    const cut = new Path2D(); cut.rect(-rx * 3, -ry * 4, rx * 6, ry * 8);
    if (lid > 0) {
      const yy = -ry + lid * 2 * ry, a = o.lidTilt || 0, c = Math.cos(a), s = Math.sin(a), R2 = (x, y) => [x * c - y * s, x * s + y * c];
      const p0 = R2(-rx * 2, -ry * 3), p1 = R2(rx * 2, -ry * 3), p2 = R2(rx * 2, yy), q = R2(0, yy + ry * (o.lidCurve == null ? 0.18 : o.lidCurve)), p3 = R2(-rx * 2, yy);
      cut.moveTo(p0[0], p0[1]); cut.lineTo(p3[0], p3[1]); cut.quadraticCurveTo(q[0], q[1], p2[0], p2[1]); cut.lineTo(p1[0], p1[1]); cut.closePath();
    }
    if (lower > 0) { const yy = ry - lower * 2 * ry; cut.moveTo(-rx * 2, ry * 3); cut.lineTo(-rx * 2, yy); cut.quadraticCurveTo(0, yy - ry * 0.25, rx * 2, yy); cut.lineTo(rx * 2, ry * 3); cut.closePath(); }
    g.clip(cut, 'evenodd');
    g.fillStyle = o.white || LB.C.eye; g.fillRect(-rx * 2, -ry * 2, rx * 4, ry * 4);
    if (o.whiteShade) { g.fillStyle = o.whiteShade; g.beginPath(); g.ellipse(0, -ry * 0.25, rx * 1.3, ry * 0.9, 0, Math.PI, 0); g.rect(-rx * 2, -ry * 2, rx * 4, ry * 1.2); g.fill(); }
    // pupil
    const pr = (o.pr == null ? 0.42 : o.pr) * rx, px = (o.px || 0) * rx, py = (o.py || 0) * ry;
    g.fillStyle = o.ink || LB.C.pupil; g.beginPath(); g.ellipse(px, py, pr, pr * 1.12, 0, 0, Math.PI * 2); g.fill();
    if (o.glint !== false) { g.fillStyle = o.white || LB.C.eye; g.beginPath(); g.arc(px - pr * 0.38, py - pr * 0.42, pr * 0.3, 0, Math.PI * 2); g.fill(); }
    g.restore();
    g.restore();
  };

  // ---------- light ----------
  // soft blurred blob (contact shadows, ambient occlusion)
  LB.blob = function (g, path, color, alpha, blur) { g.save(); g.globalAlpha = alpha == null ? 0.5 : alpha; g.filter = `blur(${blur || 12}px)`; g.fillStyle = color; g.fill(path); g.restore(); };
  // a translucent sun shaft (screen) with a soft edge
  LB.shaft = function (g, pts, color, alpha, blur) { g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = alpha == null ? 0.18 : alpha; g.filter = `blur(${blur || 10}px)`; g.fillStyle = color; g.fill(LB.poly(pts)); g.restore(); };
  // vertical / any linear gradient fill of a path
  LB.grad = function (g, path, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fill(path); };
  LB.radial = function (g, path, x, y, r0, r1, stops) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fill(path); };
  // motes floating in a shaft
  LB.motes = function (g, poly, n, color, seed, rmax) { const r = rng(seed || 'motes'); const p = LB.poly(poly); const xs = poly.map(q => q[0]), ys = poly.map(q => q[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); let k = 0, t = 0; g.save(); g.fillStyle = color;
    while (k < n && t < n * 30) { t++; const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0); if (!g.isPointInPath(p, x, y)) continue; g.globalAlpha = 0.25 + r() * 0.6; g.beginPath(); g.arc(x, y, 0.8 + r() * (rmax || 2.4), 0, 7); g.fill(); k++; }
    g.restore(); };

  // ---------- type ----------
  // caption in the channel idiom: bold sentence case, white, soft dark halo (no box). lines: [{t, color}] or strings
  LB.caption = function (g, lines, o) {
    o = Object.assign({ x: W / 2, y: H - 92, size: 46, lead: 1.28, family: 'Libre Franklin', weight: 700, color: '#FFFFFF', halo: 'rgba(20,16,32,0.55)', haloBlur: 14, outline: 'rgba(20,16,32,0.85)', outlineW: 0, align: 'center', tracking: 0 }, o || {});
    g.save(); g.font = `${o.style || 'normal'} ${o.weight} ${o.size}px "${o.family}"`; g.textAlign = o.align; g.textBaseline = 'alphabetic'; g.letterSpacing = o.tracking + 'px';
    const L = lines.map(l => typeof l === 'string' ? { t: l } : l); const n = L.length;
    L.forEach((l, i) => {
      const y = o.y - (n - 1 - i) * o.size * o.lead;
      if (o.halo) { g.save(); g.filter = `blur(${o.haloBlur}px)`; g.fillStyle = o.halo; g.fillText(l.t, o.x, y); g.fillText(l.t, o.x, y); g.restore(); }
      if (o.outlineW) { g.lineJoin = 'round'; g.lineWidth = o.outlineW; g.strokeStyle = o.outline; g.strokeText(l.t, o.x, y); }
      g.fillStyle = l.color || o.color; g.globalAlpha = l.alpha == null ? 1 : l.alpha; g.fillText(l.t, o.x, y); g.globalAlpha = 1;
    });
    g.restore();
  };

  // ---------- finish ----------
  // coloured vignette + optional colour grade, applied before the kit's grain
  LB.vignette = function (ctx, color, amt, inner, outer) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * (inner == null ? 0.42 : inner), W / 2, H / 2, H * (outer == null ? 1.1 : outer));
    g.addColorStop(0, rgba(color, 0)); g.addColorStop(1, rgba(color, amt)); ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  };
  // small label in the corner so frames read as a style deck
  LB.slate = function (ctx, left, right, o) {
    o = Object.assign({ color: '#FFFFFF', alpha: 0.5, y: 40 }, o || {});
    ctx.save(); ctx.globalAlpha = o.alpha; ctx.font = '500 22px "Barlow Condensed"'; ctx.letterSpacing = '3px'; ctx.fillStyle = o.color; ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left'; ctx.fillText(left, 44, o.y); ctx.textAlign = 'right'; ctx.fillText(right, W - 44, o.y); ctx.restore();
  };

  global.LB = LB;
})(window);
