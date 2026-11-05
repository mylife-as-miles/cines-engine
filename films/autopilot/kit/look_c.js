/* AUTOPILOT — LOOK C: "THROUGH GLASS"
   Helpers for Look C only (never edit kit/otm.js or kit/figures.js: three looks share them).
   - P: the palette (desaturated teal + amber, one green for the phone, one warm yellow for Emily)
   - camera(): a pinhole camera so sets are laid out in true perspective (x right, y up, z forward)
   - flat fills, stepped (posterised) gradients, soft beams
   - the glass kit: glare streaks, specks of dust, refraction bands, fresnel ramps
   - chrome(): environment-mapped reflections on any surface whose normal we can describe
   - matte typography: words are never written on the world; dialogue and V.O. sit in the letterbox, outside the glass
   Deterministic: no Math.random, no Date. Uses OTM.rng / OTM.vnoise / OTM.fbm only. */
(function (G) {
  'use strict';
  const { W, H } = OTM;
  const P = {
    // teal family: shadow, glass, distance
    ink: '#081011', night: '#0D181A', deep: '#142427', teal: '#1F3538', tealMid: '#30494A', tealGrey: '#506A69',
    sage: '#7A918C', mist: '#A9BAB4', glassPale: '#CBD6D0', frost: '#E3E9E3',
    // amber family: the sun, wood, skin of the light
    umber: '#24170F', amberDeep: '#563720', amber: '#9A6535', amberLight: '#CF9A5C', honey: '#EBC68D',
    sunCream: '#F6E3BC', sunWhite: '#FFF6E6', copper: '#B25F2D', copperHot: '#E4894A', ember: '#F2A65E',
    // neutrals
    bone: '#E6E0D2', paper: '#F1ECE1', concrete: '#8B8780', graphite: '#1B1E1F',
    // people
    dSkin: '#9C6D55', dSkinLight: '#BE8C6C', dSkinShadow: '#5F3F33', hair: '#15100D',
    eSkin: '#B27E62', eSkinLight: '#D6A47F', eSkinShadow: '#7B5240',
    shirt: '#9FB3BF', tee: '#7D8A8A', pyjama: '#2B3A44', tie: '#22344A',
    // accents (each lives in one place only)
    charge: '#7BE6A0', chargeDeep: '#2FA866',         // the phone's charging green: the film's key object
    emily: '#E0B34F', rabbit: '#CBBDA2', rabbitWorn: '#9C8E78',
    matte: '#040808',
  };

  const clamp = OTM.clamp, lerp = OTM.lerp, mix = OTM.mix, rgba = OTM.rgba, hexToRgb = OTM.hexToRgb;

  // ---------- canvases ----------
  function layer(w, h) { return OTM.makeCanvas(w || W, h || H).getContext('2d'); }
  function blurred(src, px, base) {
    const c = OTM.makeCanvas(src.width, src.height), g = c.getContext('2d');
    if (base !== false) g.drawImage(src, 0, 0);          // keeps opaque layers solid at the canvas edges
    g.filter = `blur(${px}px)`; g.drawImage(src, 0, 0); g.filter = 'none'; return c;
  }
  function flipX(src) { const c = OTM.makeCanvas(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }

  // ---------- gradients ----------
  function stops(gr, st) { st.forEach(s => gr.addColorStop(clamp(s[0], 0, 1), s.length > 2 ? rgba(s[1], s[2]) : s[1])); return gr; }
  const lin = (g, x0, y0, x1, y1, st) => stops(g.createLinearGradient(x0, y0, x1, y1), st);
  const rad = (g, x, y, r0, r1, st, fx, fy) => stops(g.createRadialGradient(fx == null ? x : fx, fy == null ? y : fy, r0, x, y, r1), st);

  // ---------- paths ----------
  function pathPts(pts, open) { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); if (!open) p.closePath(); return p; }
  function rrect(x, y, w, h, r) {
    const p = new Path2D(); r = Math.min(r, w / 2, h / 2);
    p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r); p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r); p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); p.closePath(); return p;
  }
  // a rounded quad: four corners (tl, tr, br, bl) and a corner radius as a fraction of the shorter side
  function rquad(q, k) {
    const p = new Path2D(); const n = q.length;
    const pt = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    for (let i = 0; i < n; i++) {
      const a = q[(i - 1 + n) % n], b = q[i], c = q[(i + 1) % n];
      const la = Math.hypot(b[0] - a[0], b[1] - a[1]), lc = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const r = Math.min(k, la * 0.49, lc * 0.49);
      const p0 = pt(b, a, r / la), p1 = pt(b, c, r / lc);
      if (i === 0) p.moveTo(p0[0], p0[1]); else p.lineTo(p0[0], p0[1]);
      p.quadraticCurveTo(b[0], b[1], p1[0], p1[1]);
    }
    p.closePath(); return p;
  }
  function fillPts(g, pts, style, alpha) { g.save(); if (alpha != null) g.globalAlpha = alpha; g.fillStyle = style; g.fill(pathPts(pts)); g.restore(); }
  // smooth closed curve through points (Catmull-Rom -> bezier); [x,y,1] is a hard corner
  function smooth(pts, open) {
    const p = new Path2D(), n = pts.length; const Q = i => open ? pts[clamp(i, 0, n - 1)] : pts[(i + n) % n];
    p.moveTo(pts[0][0], pts[0][1]); const last = open ? n - 1 : n;
    for (let i = 0; i < last; i++) {
      const p0 = Q(i - 1), p1 = Q(i), p2 = Q(i + 1), p3 = Q(i + 2), k = 1 / 6;
      const c1 = p1[2] ? [p1[0], p1[1]] : [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
      const c2 = p2[2] ? [p2[0], p2[1]] : [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
      p.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
    }
    if (!open) p.closePath(); return p;
  }

  // ---------- camera ----------
  // camera({x,y,z, yaw (+ = turn right), pitch (+ = look up), f (px), cx, cy}).p(x,y,z) -> [sx, sy, depth]
  function camera(o) {
    const cyw = Math.cos(o.yaw || 0), syw = Math.sin(o.yaw || 0), cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0), cr = Math.cos(o.roll || 0), sr = Math.sin(o.roll || 0);
    const px = o.x || 0, py = o.y || 0, pz = o.z || 0;
    function p(x, y, z) {
      if (Array.isArray(x)) { z = x[2]; y = x[1]; x = x[0]; }
      const dx = x - px, dy = y - py, dz = z - pz;
      const x1 = dx * cyw - dz * syw, z1 = dx * syw + dz * cyw;
      const y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp;
      const x3 = x1 * cr + y2 * sr, y3 = -x1 * sr + y2 * cr;
      const zz = Math.max(z2, 0.02);
      return [o.cx + o.f * x3 / zz, o.cy - o.f * y3 / zz, z2];
    }
    return { p, pts: a => a.map(q => p(q)), f: o.f, cx: o.cx, cy: o.cy, k: z => o.f / z };
  }
  function quad(g, cam, pts3, style, alpha) { fillPts(g, cam.pts(pts3), style, alpha); }

  // ---------- flat light ----------
  // fill a path with flat posterised bands stepping from colors[0] at p0 to colors[n-1] at p1
  function stepGrad(g, path, p0, p1, colors, soft) {
    g.save(); g.clip(path);
    const n = colors.length, dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const big = 6000; g.translate(p0[0], p0[1]); g.rotate(Math.atan2(uy, ux));
    g.fillStyle = colors[0]; g.fillRect(-big, -big, big + L / n * 0.5, big * 2);
    for (let i = 0; i < n; i++) { g.fillStyle = colors[i]; g.fillRect(L * i / n, -big, i === n - 1 ? big : L / n + 1, big * 2); }
    if (soft) { g.filter = 'none'; }
    g.restore();
  }
  // a soft beam of light in the air (screen blend): polygon filled with a gradient from a to b
  function beam(g, pts, color, a0, a1, from, to) {
    g.save(); g.globalCompositeOperation = 'screen';
    g.fillStyle = lin(g, from[0], from[1], to[0], to[1], [[0, color, a0], [1, color, a1]]); g.fill(pathPts(pts)); g.restore();
  }

  // ---------- glass ----------
  // glare streaks: soft parallel bands across a clip region. o = {angle, x, y (a point the bands pass near), bands:[{d, w, a}], color, mode}
  function glare(g, clip, o) {
    g.save(); if (clip) g.clip(clip); g.globalCompositeOperation = o.mode || 'screen';
    g.translate(o.x, o.y); g.rotate(o.angle);
    (o.bands || []).forEach(b => {
      const gr = g.createLinearGradient(0, b.d - b.w / 2, 0, b.d + b.w / 2);
      const c = b.color || o.color || '#FFFFFF', e = b.edge == null ? 0.5 : b.edge;
      gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(e * 0.5, rgba(c, b.a)); gr.addColorStop(1 - e * 0.5, rgba(c, b.a)); gr.addColorStop(1, rgba(c, 0));
      g.fillStyle = gr; g.fillRect(-4000, b.d - b.w / 2, 8000, b.w);
    });
    g.restore();
  }
  // dust and fine scratches on glass. o = {n, color, rMin, rMax, aMin, aMax, scratch (fraction), near:{x,y,r} (denser and brighter near a light)}
  function specks(g, clip, box, seed, o) {
    const r = OTM.rng(seed); g.save(); if (clip) g.clip(clip); g.globalCompositeOperation = o.mode || 'screen';
    for (let i = 0; i < o.n; i++) {
      let x = box.x + r() * box.w, y = box.y + r() * box.h; let k = 1;
      if (o.near) { const d = Math.hypot(x - o.near.x, y - o.near.y); k = clamp(1.25 - d / o.near.r, 0.12, 1.25); if (r() > k) continue; }
      const a = (o.aMin + r() * (o.aMax - o.aMin)) * k;
      g.fillStyle = rgba(o.color || '#FFFFFF', clamp(a, 0, 1)); g.strokeStyle = g.fillStyle;
      if (r() < (o.scratch || 0)) { const L = 4 + r() * 22, an = (o.scratchAngle == null ? r() * Math.PI : o.scratchAngle + (r() - 0.5) * 0.5); g.lineWidth = 0.6 + r() * 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * L, y + Math.sin(an) * L); g.stroke(); }
      else { const s = o.rMin + r() * (o.rMax - o.rMin); g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill(); }
    }
    g.restore();
  }
  // a soft smudge (finger mark, dried water) as a ring of faint arcs
  function smudge(g, x, y, rx, ry, rot, seed, color, a) {
    const r = OTM.rng(seed); g.save(); g.translate(x, y); g.rotate(rot); g.globalCompositeOperation = 'screen'; g.lineCap = 'round';
    for (let i = 0; i < 26; i++) { const s = 0.25 + i / 26 * 0.85; g.strokeStyle = rgba(color, a * (0.35 + r() * 0.65)); g.lineWidth = 0.8 + r() * 1.4; const a0 = r() * Math.PI * 2; g.beginPath(); g.ellipse(0, 0, rx * s, ry * s, 0, a0, a0 + 0.6 + r() * 1.6); g.stroke(); }
    g.restore();
  }

  // ---------- chrome ----------
  // equirectangular environment: env(w, h, draw(g, X, Y)) where X(phiDeg) and Y(thetaDeg) map angles to pixels.
  // phi = 0 is straight back toward the viewer (behind the camera), +-180 is behind the object; theta = 0 is the horizon.
  function env(w, h, draw) { const c = OTM.makeCanvas(w, h), g = c.getContext('2d'); const X = a => (a / 360 + 0.5) * w, Y = t => (0.5 - t / 180) * h; draw(g, X, Y); return c; }
  function sampler(envC) {
    const w = envC.width, h = envC.height, d = envC.getContext('2d').getImageData(0, 0, w, h).data;
    return function (phi, th) {
      let u = (phi / (2 * Math.PI) + 0.5) * w - 0.5, v = (0.5 - th / Math.PI) * h - 0.5;
      u = ((u % w) + w) % w; v = clamp(v, 0, h - 1.001);
      const x0 = Math.floor(u), y0 = Math.floor(v), x1 = (x0 + 1) % w, y1 = y0 + 1, fx = u - x0, fy = v - y0;
      const a = (y0 * w + x0) * 4, b = (y0 * w + x1) * 4, c = (y1 * w + x0) * 4, e = (y1 * w + x1) * 4;
      return [0, 1, 2].map(k => (d[a + k] * (1 - fx) + d[b + k] * fx) * (1 - fy) + (d[c + k] * (1 - fx) + d[e + k] * fx) * fy);
    };
  }
  // chrome(g, box, normalAt(x,y)->[nx,ny,nz] (y up, z toward viewer) | null, sample, {ss, gain, fresnel, tint, tintK, clip})
  function chrome(g, box, normalAt, sample, o) {
    o = o || {}; box = { x: Math.floor(box.x), y: Math.floor(box.y), w: Math.ceil(box.w), h: Math.ceil(box.h) };
    const c = OTM.makeCanvas(box.w, box.h), cg = c.getContext('2d'), img = cg.createImageData(box.w, box.h), d = img.data;
    const ss = o.ss || 2, gain = o.gain == null ? 1 : o.gain, fr = o.fresnel || 0, tint = o.tint ? hexToRgb(o.tint) : null, tk = o.tintK || 0;
    for (let j = 0; j < box.h; j++) for (let i = 0; i < box.w; i++) {
      let r0 = 0, g0 = 0, b0 = 0, n = 0;
      for (let sj = 0; sj < ss; sj++) for (let si = 0; si < ss; si++) {
        const N = normalAt(box.x + i + (si + 0.5) / ss, box.y + j + (sj + 0.5) / ss); if (!N) continue;
        const vn = -N[2], rx = -2 * vn * N[0], ry = -2 * vn * N[1], rz = -1 - 2 * vn * N[2];
        const s = sample(Math.atan2(rx, rz), Math.asin(clamp(ry, -1, 1)));
        const k = gain * (1 + fr * Math.pow(1 - Math.abs(N[2]), 3));
        r0 += s[0] * k; g0 += s[1] * k; b0 += s[2] * k; n++;
      }
      if (!n) continue; const q = (j * box.w + i) * 4; let v = [r0 / n, g0 / n, b0 / n];
      if (tint) v = v.map((x, k) => x * (1 - tk) + x * tint[k] / 255 * tk);
      d[q] = clamp(v[0], 0, 255); d[q + 1] = clamp(v[1], 0, 255); d[q + 2] = clamp(v[2], 0, 255); d[q + 3] = 255;
    }
    cg.putImageData(img, 0, 0);
    g.save(); if (o.clip) g.clip(o.clip); if (o.alpha != null) g.globalAlpha = o.alpha; g.drawImage(c, box.x, box.y); g.restore();
    return c;
  }

  // ---------- post ----------
  function vignette(ctx, strength, color, cx, cy, r0, r1) {
    const a = OTM.liveArea(2.39); cx = cx == null ? W / 2 : cx; cy = cy == null ? (a.top + a.bottom) / 2 : cy;
    ctx.save(); ctx.fillStyle = rad(ctx, cx, cy, r0 == null ? H * 0.28 : r0, r1 == null ? W * 0.62 : r1, [[0, color || P.ink, 0], [1, color || P.ink, strength]]);
    ctx.fillRect(0, a.top, W, a.h); ctx.restore();
  }

  // ---------- matte typography (outside the glass) ----------
  const FONT = (o) => `${o.style || 'normal'} ${o.weight || 400} ${o.size || 30}px "${o.family}"`;
  // runs: [{text, color, family, weight, style, size, tracking}] laid out on one centred line in the bottom matte
  function subtitle(ctx, runs, o) {
    o = o || {}; const a = OTM.liveArea(2.39); const y = o.y || Math.round(a.bottom + (H - a.bottom) * 0.5 + (o.dy || 10)); const gap = o.gap == null ? 34 : o.gap;
    ctx.save(); ctx.textBaseline = 'alphabetic';
    const ws = runs.map(r => { ctx.font = FONT(r); ctx.letterSpacing = (r.tracking || 0) + 'px'; return ctx.measureText(r.text).width; });
    const total = ws.reduce((s, w) => s + w, 0) + gap * (runs.length - 1);
    let x = o.align === 'left' ? (o.x || 96) : (W - total) / 2;
    runs.forEach((r, i) => { ctx.font = FONT(r); ctx.letterSpacing = (r.tracking || 0) + 'px'; ctx.fillStyle = r.color; ctx.globalAlpha = r.alpha == null ? 1 : r.alpha; ctx.fillText(r.text, x, y); x += ws[i] + gap; });
    ctx.restore();
  }
  function slate(ctx, left, right) {
    const a = OTM.liveArea(2.39), y = Math.round(a.top / 2 + 8);
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = P.bone; ctx.textBaseline = 'alphabetic'; ctx.font = '500 21px "Barlow Condensed"'; ctx.letterSpacing = '3.5px';
    ctx.textAlign = 'left'; ctx.fillText(left, 56, y); ctx.textAlign = 'right'; ctx.fillText(right, W - 56, y); ctx.restore();
  }

  G.LC = { P, clamp, lerp, mix, rgba, hexToRgb, layer, blurred, flipX, lin, rad, pathPts, rrect, rquad, fillPts, smooth, camera, quad, stepGrad, beam,
    glare, specks, smudge, env, sampler, chrome, vignette, subtitle, slate, FONT };
})(window);
