/* RECOUNT - procedural cast: lit 2.5D paper heads (front -> profile turn), mouthless faces with eye glints,
   lid strokes and brow strokes, Fincher top-light sockets, signature hair silhouettes, hands. Device-space Path2Ds. */
(function (G) {
  'use strict';
  const { P, rgba, mix, clamp, lerp, lin, rad, paper, rim, polyPath, smooth } = RC;

  // head outline keys, head height = 1 (crown -0.5, chin +0.5). PROF faces screen-left.
  const FRONT = [[0, -0.5], [0.24, -0.46], [0.355, -0.26], [0.37, -0.02], [0.345, 0.16], [0.295, 0.29], [0.185, 0.42], [0.06, 0.49], [-0.06, 0.49], [-0.185, 0.42], [-0.295, 0.29], [-0.345, 0.16], [-0.37, 0.06], [-0.37, -0.02], [-0.355, -0.26], [-0.24, -0.46]];
  const PROF = [[0.04, -0.5], [0.3, -0.45], [0.44, -0.24], [0.43, 0.02], [0.32, 0.16], [0.18, 0.32], [0.02, 0.43], [-0.12, 0.5], [-0.25, 0.47], [-0.29, 0.37], [-0.318, 0.28], [-0.338, 0.205], [-0.405, 0.125], [-0.33, -0.02], [-0.34, -0.14], [-0.27, -0.38]];
  const lerpPts = (A, B, t) => A.map((p, i) => [lerp(p[0], B[i][0], t), lerp(p[1], B[i][1], t)]);

  function makeXf(o) {
    const s = o.s, c = Math.cos(o.tilt || 0), sn = Math.sin(o.tilt || 0), fx = o.facing > 0 ? -1 : 1;
    const f = (x, y) => { x *= fx; return [o.x + s * (x * c - y * sn), o.y + s * (x * sn + y * c)]; };
    f.v = (x, y) => { x *= fx; return [(x * c - y * sn), (x * sn + y * c)]; }; f.s = s; f.fx = fx; return f;
  }
  function headGeom(o) {
    const t = o.t || 0, xf = makeXf(o);
    const jaw = o.jaw || 1; const out = lerpPts(FRONT, PROF, t).map(p => { const k = clamp((p[1] - 0.05) / 0.4, 0, 1); const cx = lerp(0, -0.1, t); return xf(cx + (p[0] - cx) * lerp(1, jaw, k), p[1]); });
    const g = { xf, t, outline: out, path: polyPath(smooth(out, true, 8)) };
    const ey = o.eyeY == null ? 0.0 : o.eyeY;
    g.eyeN = xf(...[lerp(0.135, -0.215, t), ey]); g.eyeF = xf(...[lerp(-0.135, -0.355, t), ey]); g.eyeFw = clamp(1 - t * 1.3, 0, 1);
    g.earN = xf(lerp(0.375, 0.09, t), 0.05); g.earNw = lerp(0.25, 1, Math.min(1, t * 1.6));
    g.noseTop = xf(lerp(0, -0.315, t), -0.02); g.noseTip = xf(lerp(0, -0.395, t), lerp(0.16, 0.125, t)); g.noseBase = xf(lerp(0, -0.31, t), lerp(0.2, 0.19, t));
    g.center = xf(lerp(0, 0.05, t), 0); g.chin = xf(lerp(0, -0.18, t), 0.47); g.crown = xf(lerp(0, 0.06, t), -0.5);
    g.faceC = xf(lerp(0, -0.22, t), 0.08);
    return g;
  }
  const P2 = (a) => polyPath(a, true);

  // ---- hair styles: key sets FRONT/PROF (facing left), lerped by t ----
  // anatomical chain (18): 0 R sideburn outer,1 R side,2 R top,3 crown-front,4 crown,5 crown-L,6 L top/back,7 L side/back,8 nape,
  // 9 behind ear,10 above ear,11 L sideburn,12 L temple,13 L forehead,14 forehead centre,15 R forehead,16 R temple,17 R sideburn inner
  const HAIR = {
    scott: {
      F: [[-0.385, 0.03], [-0.395, -0.2], [-0.33, -0.43], [-0.12, -0.55], [0.06, -0.565], [0.22, -0.53], [0.36, -0.40], [0.40, -0.2], [0.40, -0.08], [0.392, -0.02], [0.385, 0.03], [0.345, 0.03], [0.345, -0.17], [0.24, -0.29], [0.03, -0.325], [-0.18, -0.30], [-0.32, -0.20], [-0.345, 0.02]],
      P: [[-0.282, -0.27], [-0.30, -0.33], [-0.31, -0.40], [-0.24, -0.51], [-0.06, -0.575], [0.16, -0.565], [0.38, -0.44], [0.48, -0.18], [0.44, 0.08], [0.29, 0.05], [0.17, -0.1], [0.04, 0.04], [-0.06, -0.16], [-0.17, -0.245], [-0.27, -0.285], [-0.28, -0.28], [-0.281, -0.276], [-0.282, -0.272]],
    },
    marina: {
      F: [[-0.375, 0.06], [-0.385, -0.2], [-0.33, -0.42], [-0.13, -0.53], [0.05, -0.545], [0.22, -0.515], [0.35, -0.40], [0.39, -0.2], [0.39, -0.06], [0.385, 0.0], [0.38, 0.06], [0.35, 0.06], [0.35, -0.16], [0.22, -0.31], [0.06, -0.355], [-0.04, -0.33], [-0.31, -0.22], [-0.345, 0.04]],
      P: [[-0.27, -0.3], [-0.29, -0.35], [-0.3, -0.42], [-0.23, -0.52], [-0.05, -0.56], [0.16, -0.55], [0.37, -0.44], [0.47, -0.18], [0.43, 0.1], [0.28, 0.07], [0.16, -0.09], [0.04, 0.03], [-0.07, -0.17], [-0.17, -0.27], [-0.255, -0.31], [-0.265, -0.305], [-0.268, -0.3], [-0.27, -0.298]],
    },
    angelo: { // slicked straight back, hugging the skull
      F: [[-0.372, 0.0], [-0.39, -0.22], [-0.35, -0.43], [-0.18, -0.555], [0.04, -0.575], [0.24, -0.545], [0.37, -0.43], [0.4, -0.22], [0.4, -0.1], [0.39, -0.04], [0.375, 0.0], [0.345, 0.0], [0.345, -0.18], [0.24, -0.31], [0.03, -0.35], [-0.18, -0.33], [-0.32, -0.22], [-0.345, -0.02]],
      P: [[-0.285, -0.3], [-0.31, -0.37], [-0.3, -0.47], [-0.2, -0.56], [-0.02, -0.585], [0.2, -0.55], [0.4, -0.44], [0.48, -0.2], [0.44, 0.06], [0.29, 0.03], [0.17, -0.1], [0.05, 0.0], [-0.05, -0.17], [-0.16, -0.26], [-0.27, -0.3], [-0.278, -0.298], [-0.281, -0.296], [-0.283, -0.294]],
    },
  };
  function hairPath(style, o, xf) {
    const H = HAIR[style]; const pts = lerpPts(H.F, H.P, o.t || 0).map(p => xf(p[0], p[1]));
    return polyPath(smooth(pts, true, 7));
  }

  // generic lit hair fill: dark mass, soft sheen band, light-side rim, sheen strands
  function shadeHair(g, path, o, xf, extra) {
    const base = o.hairColor, key = o.key, s = xf.s;
    paper(g, path, base, {
      shade: (h) => {
        // sheen from the key (top-light)
        if (key) {
          const c = o.hairSheenAt || xf(0.02, -0.42); const r = s * 0.42;
          h.save(); h.globalCompositeOperation = 'screen'; h.translate(c[0], c[1]); h.scale(1, 0.55); h.fillStyle = rad(h, 0, 0, 0, r, [[0, mix(base, key.color, 0.55), 0.55 * (key.k || 1)], [0.5, mix(base, key.color, 0.35), 0.18 * (key.k || 1)], [1, base, 0]]); h.fillRect(-r, -r, 2 * r, 2 * r); h.restore();
        }
        if (o.hairStrands) o.hairStrands(h, xf);
        if (extra) extra(h);
      },
      rim: o.hairRim || null,
      shadow: o.hairShadow || null,
    });
  }

  // ---- the head ----
  // o: x,y (head centre), s (head height px), t (0 front .. 1 profile), facing (-1 looks screen-left, +1 screen-right), tilt
  //    skin, hair (style id), hairColor, key {dx,dy,color,k}, fill {dx,dy,color,k}, under {color,k}, top (socket dark 0..1), rims [..]
  //    gaze [gx,gy], brow {raise,knit}, lid (0..1), soot (0..1), seed
  function head(g, o) {
    const geo = headGeom(o), xf = geo.xf, s = o.s, skin = o.skin, key = o.key || { dx: 0, dy: -1, color: P.tungsten, k: 1 };
    const dark = mix(skin, P.umber, o.ambientDark == null ? 0.7 : o.ambientDark), lit = mix(mix(skin, key.color, 0.28), '#FFFFFF', 0.08 * (key.k || 1));
    const L = Math.hypot(key.dx, key.dy) || 1, ux = key.dx / L, uy = key.dy / L;
    const C = geo.center;
    if (o.backHair) o.backHair(g, geo, o);
    // neck stub shadow handled by caller; head base
    paper(g, geo.path, dark, {
      shadow: o.shadow || null,
      shade: (h) => {
        // key light: broad lit side with soft terminator
        h.fillStyle = lin(h, C[0] + ux * s * 0.5, C[1] + uy * s * 0.5, C[0] - ux * s * 0.38, C[1] - uy * s * 0.38, [[0, lit, 1], [0.32 * (o.termK || 1), lit, 0.92], [0.62 * (o.termK || 1), lit, 0.0], [1, lit, 0]]);
        h.fillRect(C[0] - s, C[1] - s, s * 2, s * 2);
        // roundness: soft highlight towards the light
        const hx = C[0] + ux * s * 0.17, hy = C[1] + uy * s * 0.2 - s * 0.05; h.save(); h.globalCompositeOperation = 'screen';
        h.fillStyle = rad(h, hx, hy, 0, s * 0.5, [[0, mix(lit, '#ffffff', 0.25), 0.28 * (key.k || 1)], [1, lit, 0]]); h.fillRect(hx - s, hy - s, 2 * s, 2 * s); h.restore();
        // fill light (second source)
        if (o.fill) { const f = o.fill, fl = Math.hypot(f.dx, f.dy) || 1, fx = f.dx / fl, fy = f.dy / fl; h.save(); h.globalCompositeOperation = 'screen';
          h.fillStyle = lin(h, C[0] + fx * s * 0.48, C[1] + fy * s * 0.48, C[0] - fx * s * 0.1, C[1] - fy * s * 0.1, [[0, f.color, 0.75 * f.k], [0.45, f.color, 0.3 * f.k], [1, f.color, 0]]); h.fillRect(C[0] - s, C[1] - s, 2 * s, 2 * s); h.restore(); }
        // under-light (bounce from cards / phone)
        if (o.under) { const u = o.under, c = o.underAt || xf(0, 0.75); h.save(); h.globalCompositeOperation = 'screen'; h.fillStyle = rad(h, c[0], c[1], 0, s * 0.62, [[0, u.color, 0.55 * u.k], [0.6, u.color, 0.2 * u.k], [1, u.color, 0]]); h.fillRect(c[0] - s, c[1] - s, 2 * s, 2 * s); h.restore(); }
        // Fincher top-light: sockets fall into shadow; brow ridge catches
        const top = o.top == null ? 0.55 : o.top;
        [[geo.eyeN, 1], [geo.eyeF, geo.eyeFw]].forEach(([e, wf]) => { if (wf <= 0.02) return; h.save(); h.globalCompositeOperation = 'multiply'; h.translate(e[0], e[1] + s * 0.01); h.scale(Math.max(0.35, wf), 0.62);
          h.fillStyle = rad(h, 0, 0, 0, s * 0.13, [[0, P.umber, top], [0.55, P.umber, top * 0.6], [1, P.umber, 0]]); h.fillRect(-s * 0.2, -s * 0.2, s * 0.4, s * 0.4); h.restore(); });
        // nose: shadow away from key, highlight on bridge
        const nt = geo.noseTip, nb = geo.noseTop; h.save(); h.globalCompositeOperation = 'multiply'; h.filter = `blur(${s * 0.018}px)`;
        h.fillStyle = rgba(P.umber, 0.5); h.beginPath(); const sx = -ux * s * 0.05, sy = Math.abs(uy) * s * 0.035;
        h.moveTo(nb[0], nb[1]); h.quadraticCurveTo(nt[0] + sx * 0.5, nt[1] - s * 0.05, nt[0] + sx, nt[1] + sy); h.lineTo(nt[0] + sx * 1.6, nt[1] + sy + s * 0.04); h.lineTo(nt[0] - sx * 0.4, nt[1] + s * 0.045); h.closePath(); h.fill(); h.restore();
        h.save(); h.globalCompositeOperation = 'screen'; h.strokeStyle = rgba(mix(lit, '#ffffff', 0.3), 0.35 * (key.k || 1)); h.lineWidth = s * 0.018; h.lineCap = 'round'; h.filter = `blur(${s * 0.01}px)`;
        h.beginPath(); h.moveTo(nb[0] + ux * s * 0.012, nb[1] + s * 0.03); h.lineTo(nt[0] + ux * s * 0.012, nt[1] - s * 0.02); h.stroke(); h.restore();
        // jaw / under-chin shadow
        h.save(); h.globalCompositeOperation = 'multiply'; const ch = geo.chin; h.fillStyle = rad(h, ch[0], ch[1] + s * 0.08, 0, s * 0.3, [[0, P.umber, o.under ? 0.15 : 0.45], [1, P.umber, 0]]); h.fillRect(ch[0] - s, ch[1] - s, 2 * s, 2 * s); h.restore();
        if (o.model !== false) modelFace(h, geo, o, lit, dark, ux, uy);
        if (o.blush) { const b = xf(lerp(0.17, -0.12, o.t), 0.13); h.save(); h.globalCompositeOperation = 'soft-light'; h.fillStyle = rad(h, b[0], b[1], 0, s * 0.14, [[0, '#C0392B', o.blush], [1, '#C0392B', 0]]); h.fillRect(b[0] - s, b[1] - s, 2 * s, 2 * s); h.restore(); }
        if (o.soot) soot(h, geo, o);
        if (o.faceExtra) o.faceExtra(h, geo);
      },
    });
    // near ear
    const e = geo.earN, ew = s * 0.065 * geo.earNw + s * 0.02, eh = s * 0.12;
    const earP = new Path2D(); earP.ellipse(e[0], e[1], ew, eh, (o.tilt || 0) + xf.fx * -0.12, 0, Math.PI * 2);
    paper(g, earP, mix(skin, P.umber, 0.55), { shade: (h) => { h.fillStyle = lin(h, e[0] + ux * ew, e[1] + uy * eh, e[0] - ux * ew, e[1] - uy * eh, [[0, lit, 0.85], [0.6, lit, 0.1], [1, lit, 0]]); h.fillRect(e[0] - s, e[1] - s, 2 * s, 2 * s);
      h.strokeStyle = rgba(P.umber, 0.45); h.lineWidth = s * 0.012; h.beginPath(); h.ellipse(e[0] + xf.fx * -ew * 0.15, e[1], ew * 0.5, eh * 0.6, 0, -1.2, 1.9); h.stroke(); } });
    if (o.earExtra) o.earExtra(g, geo, e, ew, eh);
    // eyes: glints + lid strokes (no mouths)
    eyes(g, geo, o);
    // brows
    brows(g, geo, o);
    // rims on the head contour (back-key etc.), then hair over it with its own rims
    (o.rims || []).forEach(r => rim(g, geo.path, r));
    if (o.hair) {
      const hp = hairPath(o.hair, o, xf);
      if (o.hair === 'scott' && o.cowlick !== false) cowlick(g, o, xf);
      shadeHair(g, hp, o, xf);
      geo.hairPath = hp;
      (o.rims || []).forEach(r => { if (r.hair !== false) rim(g, hp, Object.assign({}, r, { alpha: (r.alpha == null ? 1 : r.alpha) * (r.hairA == null ? 0.9 : r.hairA) })); });
    }
    if (o.frontHair) o.frontHair(g, geo, o);
    if (o.after) o.after(g, geo);
    return geo;
  }
  // plane modelling so a mouthless face still reads as a skull under light, not a flat oval:
  // side terminators, brow ridge, cheekbones + hollows, nose ridge / tip / butterfly shadow / nostrils, chin ball, jaw underside, card bounce
  function modelFace(h, geo, o, lit, dark, ux, uy) {
    const s = o.s, xf = geo.xf, t = o.t || 0, k = (o.key && o.key.k) || 1, M = o.modelK == null ? 1 : o.modelK;
    const blob = (p, rx, ry, col, a, mode, rot) => { h.save(); h.globalCompositeOperation = mode; h.translate(p[0], p[1]); h.rotate(rot || 0); h.scale(1, ry / rx); h.fillStyle = rad(h, 0, 0, 0, rx, [[0, col, a], [0.55, col, a * 0.5], [1, col, 0]]); h.fillRect(-rx, -rx, rx * 2, rx * 2); h.restore(); };
    const nearVis = 1, farVis = clamp(1 - t * 1.25, 0, 1);
    // 1. side terminators: the cheeks and temples turn away from a top / front key
    const fc = geo.faceC; h.save(); h.globalCompositeOperation = 'multiply'; h.translate(fc[0] + xf.fx * -s * 0.04 * t, fc[1] - s * 0.04); h.scale(1, 1.35);
    h.fillStyle = rad(h, 0, 0, s * 0.17, s * 0.4, [[0, P.umber, 0], [0.55, P.umber, 0.28 * M], [1, P.umber, 0.72 * M]]); h.fillRect(-s, -s, 2 * s, 2 * s); h.restore();
    // 2. brow ridge catches the light (above the dark sockets)
    [[geo.eyeN, nearVis], [geo.eyeF, farVis]].forEach(([e, v]) => { if (v < 0.05) return; blob([e[0], e[1] - s * 0.1], s * 0.1 * Math.max(0.5, v), s * 0.035, mix(lit, '#FFFFFF', 0.15), 0.38 * k * v * M, 'screen'); });
    // 3. cheekbones + hollows under them
    [[lerp(0.17, -0.2, t), nearVis], [lerp(-0.17, -0.34, t), farVis]].forEach(([cx, v]) => { if (v < 0.05) return; const c = xf(cx, 0.1);
      blob(c, s * 0.085, s * 0.05, mix(lit, '#FFFFFF', 0.1), 0.42 * k * v * M, 'screen', -0.3 * xf.fx);
      const hl = xf(cx * 1.12, 0.27); blob(hl, s * 0.07, s * 0.11, P.umber, 0.16 * v * M, 'multiply', 0.25 * xf.fx); });
    // 4. nose: ridge highlight, tip highlight, side shadow, butterfly shadow below (top light), nostril darks
    const nt = geo.noseTip, nb = geo.noseTop, nbase = geo.noseBase;
    h.save(); h.globalCompositeOperation = 'screen'; h.lineCap = 'round'; h.filter = `blur(${s * 0.008}px)`; h.strokeStyle = rgba(mix(lit, '#FFFFFF', 0.35), 0.55 * k * M); h.lineWidth = s * 0.016;
    h.beginPath(); h.moveTo(nb[0], nb[1] - s * 0.02); h.quadraticCurveTo(lerp(nb[0], nt[0], 0.5) + xf.fx * s * 0.004, lerp(nb[1], nt[1], 0.5), nt[0], nt[1] - s * 0.03); h.stroke(); h.restore();
    blob([nt[0], nt[1] - s * 0.015], s * 0.026, s * 0.02, '#FFF3E4', 0.6 * k * M, 'screen');
    h.save(); h.globalCompositeOperation = 'multiply'; h.filter = `blur(${s * 0.012}px)`; h.fillStyle = rgba(P.umber, 0.42 * M);
    const sd = xf.fx * (t > 0.3 ? 1 : -1) * s * 0.03; // shadow side of the nose (away from the near cheek in 3/4)
    h.beginPath(); h.moveTo(nb[0], nb[1]); h.quadraticCurveTo(nt[0] + sd, nt[1] - s * 0.04, nt[0] + sd * 1.2, nt[1] + s * 0.01); h.lineTo(nt[0] + sd * 0.2, nt[1]); h.closePath(); h.fill(); h.restore();
    blob([nbase[0] - xf.fx * t * s * 0.02, nbase[1] + s * 0.018], s * 0.05 * (1 - t * 0.35), s * 0.02, '#0B0604', 0.42 * M * clamp(1.4 - t * 1.4, 0, 1), 'multiply');
    [-1, 1].forEach(sd2 => { const v = sd2 > 0 ? nearVis : farVis; if (v < 0.2) return; const p = xf(lerp(sd2 * 0.04, -0.33 + sd2 * 0.02, t), lerp(0.185, 0.165, t)); blob(p, s * 0.016, s * 0.01, '#050302', 0.65 * v * M * clamp(1.5 - t * 1.2, 0.2, 1), 'multiply'); });
    // 5. chin ball + jaw underside
    const ch = geo.chin; blob([ch[0], ch[1] - s * 0.1], s * 0.055, s * 0.04, mix(lit, '#FFFFFF', 0.1), 0.18 * k * M, 'screen');
    blob([ch[0], ch[1] - s * 0.02], s * 0.2, s * 0.05, P.umber, 0.35 * M, 'multiply');
    // 6. warm bounce from below (the cards / the table) on the chin, jaw and nose undersides
    if (o.under) { const u = o.under, uc = mix(u.color, '#F0A04B', 0.35); blob([ch[0], ch[1] + s * 0.01], s * 0.13, s * 0.035, uc, 0.4 * u.k, 'screen');
      const jl = xf(lerp(0.24, 0.06, t), 0.4); blob(jl, s * 0.09, s * 0.025, uc, 0.3 * u.k, 'screen', -0.6 * xf.fx); }
  }
  function eyes(g, geo, o) {
    const s = o.s, gz = o.gaze || [0, 0], lid = o.lid == null ? 0.8 : o.lid, gc = o.glint || P.card, ga = o.glintA == null ? 0.95 : o.glintA;
    [[geo.eyeN, 1, 1], [geo.eyeF, geo.eyeFw, 0]].forEach(([e, wf, near]) => {
      if (wf < 0.12) return; const w = s * 0.062 * Math.max(0.45, wf), x = e[0] + gz[0] * s * 0.02 * wf, y = e[1] + gz[1] * s * 0.012;
      // almond darkness (iris area in shadow)
      g.save(); g.fillStyle = rgba('#0B0705', 0.55 * lid); g.beginPath(); g.ellipse(x, y + s * 0.004, w * 0.95, s * 0.024 * lid + 0.5, o.tilt || 0, 0, Math.PI * 2); g.fill(); g.restore();
      // glint (3-5 px catchlight)
      const gr = Math.max(1.6, s * 0.016) * (near ? 1 : 0.85);
      g.save(); g.fillStyle = rgba(gc, ga); g.shadowColor = rgba(gc, 0.8); g.shadowBlur = gr * 2.5; g.beginPath(); g.ellipse(x + (o.glintDx || 0.2) * w, y - s * 0.004, gr * 1.15, gr * 0.9, 0, 0, Math.PI * 2); g.fill(); g.restore();
      // lid stroke
      g.save(); g.strokeStyle = rgba('#0A0605', 0.85); g.lineWidth = Math.max(1.4, s * 0.011); g.lineCap = 'round'; g.translate(x, y); g.rotate(o.tilt || 0);
      g.beginPath(); g.moveTo(-w, s * 0.004); g.quadraticCurveTo(0, -s * (0.03 + 0.012 * lid), w * 1.02, s * 0.0); g.stroke(); g.restore();
    });
  }
  function brows(g, geo, o) {
    const s = o.s, b = o.brow || {}, raise = b.raise || 0, knit = b.knit || 0, col = o.browColor || o.hairColor || '#1A1210';
    [[geo.eyeN, 1, 1], [geo.eyeF, geo.eyeFw, -1]].forEach(([e, wf, side]) => {
      if (wf < 0.12) return; const w = s * 0.075 * Math.max(0.5, wf); const dir = side * geo.xf.fx; // inner end toward nose
      const y = e[1] - s * (0.088 + raise * 0.02); const x = e[0];
      const inner = [x - dir * w * 0.95, y + knit * s * 0.018 - raise * s * 0.01], outer = [x + dir * w * 1.05, y + s * 0.006 + knit * -0.004 * s], mid = [x, y - s * 0.017 + knit * 0.004 * s];
      g.save(); g.strokeStyle = rgba(col, 0.95); g.lineCap = 'round'; g.lineWidth = Math.max(2, s * 0.022 * Math.max(0.6, wf));
      g.beginPath(); g.moveTo(inner[0], inner[1]); g.quadraticCurveTo(mid[0], mid[1], outer[0], outer[1]); g.stroke(); g.restore();
    });
  }
  function cowlick(g, o, xf) {
    // the upward flick at the crown that identifies Scott in silhouette (rooted inside the hair mass)
    const t = o.t || 0; const k = clamp(t / 0.6, 0, 1); // 0 = front view, 1 = 3/4+ view
    const b1 = xf(lerp(0.08, 0.1, k), lerp(-0.55, -0.54, k)), b0 = xf(lerp(0.22, 0.26, k), lerp(-0.52, -0.52, k));
    const tip = xf(lerp(0.36, 0.38, k), lerp(-0.615, -0.665, k)), c1 = xf(lerp(0.16, 0.16, k), lerp(-0.615, -0.64, k));
    const p = new Path2D(); p.moveTo(b1[0], b1[1]); p.quadraticCurveTo(c1[0], c1[1], tip[0], tip[1]); p.quadraticCurveTo(...xf(lerp(0.26, 0.29, k), lerp(-0.56, -0.58, k)), b0[0], b0[1]); p.closePath();
    paper(g, p, o.hairColor, {});
    (o.rims || []).forEach(r => rim(g, p, Object.assign({}, r, { w: (r.w || 2) * 0.8 })));
  }
  function soot(h, geo, o) {
    const s = o.s, r = OTM.rng(o.seed || 'soot'), c = geo.center; h.save(); h.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 26; i++) { const x = c[0] + (r() - 0.5) * s * 0.8, y = c[1] + (r() - 0.35) * s * 0.9, rr = s * (0.04 + r() * 0.1); h.fillStyle = rad(h, x, y, 0, rr, [[0, '#2A2420', 0.5 * o.soot], [1, '#2A2420', 0]]); h.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    h.restore();
  }

  // ---- hands ----
  // generic hand in local space (wrist at 0,0, fingers along +x, unit = hand length), returns device Path2D pieces
  // curl per finger 0..1 foreshortens (top view) ; spread radians; side = +1 thumb on -y (right hand palm down seen from above)
  function handShape(o) {
    const s = o.s, a = o.a || 0, c = Math.cos(a), sn = Math.sin(a), side = o.side || 1;
    const T = (x, y) => [o.x + s * (x * c - y * side * sn), o.y + s * (x * sn + y * side * c)];
    const curl = o.curl || [0.1, 0.1, 0.1, 0.1], spread = o.spread == null ? 0.08 : o.spread, thumb = o.thumb || { a: -0.75, l: 0.36, curl: 0.15 };
    const palm = OTM.S();
    const pp = [[0.0, -0.11], [0.16, -0.185], [0.47, -0.19], [0.535, -0.1], [0.535, 0.06], [0.49, 0.165], [0.22, 0.15], [0.02, 0.1]].map(p => T(p[0], p[1]));
    palm.poly(smooth(pp, true, 5));
    const bases = [[0.5, -0.155], [0.535, -0.05], [0.52, 0.055], [0.475, 0.145]], lens = [0.42, 0.47, 0.44, 0.34], wid = [0.05, 0.053, 0.05, 0.043];
    const fingers = [];
    bases.forEach((b, i) => {
      if (o.hide && o.hide[i]) return; const ang = (i - 1.5) * spread + (o.fingerA ? o.fingerA[i] : 0); const L = lens[i] * (1 - 0.62 * curl[i]);
      const bend = o.bend ? o.bend[i] : 0;
      const mid = [b[0] + Math.cos(ang) * L * 0.5, b[1] + Math.sin(ang) * L * 0.5]; const tip = [mid[0] + Math.cos(ang + bend) * L * 0.5, mid[1] + Math.sin(ang + bend) * L * 0.5];
      const A = T(b[0] - 0.04, b[1]), M = T(mid[0], mid[1]), B = T(tip[0], tip[1]);
      const f = OTM.S(); f.capsule(A[0], A[1], s * wid[i], M[0], M[1], s * wid[i] * 0.92); f.capsule(M[0], M[1], s * wid[i] * 0.92, B[0], B[1], s * wid[i] * 0.78);
      fingers.push({ shape: f, tip: B, mid: M, base: A, w: s * wid[i], ang: a + ang * side, curl: curl[i] });
    });
    let thumbS = null, thumbTip = null;
    if (!o.noThumb) {
      const tb = [0.13, -0.15], ta = thumb.a, tl = thumb.l * (1 - 0.5 * (thumb.curl || 0));
      const tm = [tb[0] + Math.cos(ta) * tl * 0.5, tb[1] + Math.sin(ta) * tl * 0.5], tt = [tb[0] + Math.cos(ta + (thumb.bend || 0.35)) * tl, tb[1] + Math.sin(ta + (thumb.bend || 0.35)) * tl];
      const A = T(tb[0], tb[1]), M = T(tm[0], tm[1]), B = T(tt[0], tt[1]);
      thumbS = OTM.S(); thumbS.capsule(A[0], A[1], s * 0.08, M[0], M[1], s * 0.06); thumbS.capsule(M[0], M[1], s * 0.06, B[0], B[1], s * 0.048); thumbTip = B;
    }
    return { palm, fingers, thumb: thumbS, thumbTip, T };
  }
  // draw a lit hand. o.key {dx,dy,color,k}; o.skin; o.nails color; o.rings [fingerIndex...]; o.shadow; o.sootA; o.blisters
  function hand(g, o) {
    const hs = handShape(o), s = o.s, key = o.key || { dx: 0, dy: -1, color: P.tungsten, k: 1 };
    const skin = o.skin, dark = mix(skin, P.umber, o.dark == null ? 0.62 : o.dark), lit = mix(mix(skin, key.color, 0.3), '#ffffff', 0.06);
    const L = Math.hypot(key.dx, key.dy) || 1, ux = key.dx / L, uy = key.dy / L;
    const all = OTM.S(); all.add(hs.palm); hs.fingers.forEach(f => all.add(f.shape)); if (hs.thumb && !o.thumbOver) all.add(hs.thumb);
    const path = all.path(0.15, 3);
    const c = hs.T(0.4, 0);
    const shadeFn = (h) => {
      h.fillStyle = lin(h, c[0] + ux * s * 0.35, c[1] + uy * s * 0.35, c[0] - ux * s * 0.3, c[1] - uy * s * 0.3, [[0, lit, 1], [0.45, lit, 0.55], [1, lit, 0]]); h.fillRect(c[0] - s * 1.5, c[1] - s * 1.5, s * 3, s * 3);
      if (o.under) { const u = o.under; h.save(); h.globalCompositeOperation = 'screen'; h.fillStyle = rad(h, c[0], c[1], 0, s * 0.8, [[0, u.color, 0.4 * u.k], [1, u.color, 0]]); h.fillRect(c[0] - s, c[1] - s, 2 * s, 2 * s); h.restore(); }
      // knuckle creases + finger separations
      h.save(); h.strokeStyle = rgba(P.umber, 0.42); h.lineWidth = Math.max(0.8, s * 0.012); h.lineCap = 'round';
      hs.fingers.forEach((f, i) => { const k1 = f.mid; h.beginPath(); h.moveTo(k1[0] - Math.sin(f.ang) * f.w * 0.6, k1[1] + Math.cos(f.ang) * f.w * 0.6); h.lineTo(k1[0] + Math.sin(f.ang) * f.w * 0.6, k1[1] - Math.cos(f.ang) * f.w * 0.6); h.stroke();
        if (i < hs.fingers.length - 1) { const n = hs.fingers[i + 1]; h.globalAlpha = 0.6; h.beginPath(); h.moveTo((f.base[0] + n.base[0]) / 2, (f.base[1] + n.base[1]) / 2); h.lineTo((f.mid[0] + n.mid[0]) / 2, (f.mid[1] + n.mid[1]) / 2); h.stroke(); h.globalAlpha = 1; } });
      h.restore();
      if (o.knuckles !== false) { h.save(); h.globalCompositeOperation = 'screen'; hs.fingers.forEach(f => { const k = f.base; h.fillStyle = rad(h, k[0], k[1], 0, f.w * 1.3, [[0, lit, 0.35], [1, lit, 0]]); h.fillRect(k[0] - f.w * 2, k[1] - f.w * 2, f.w * 4, f.w * 4); }); h.restore(); }
      if (o.sootA) { const r = OTM.rng(o.seed || 'hs'); h.save(); h.globalCompositeOperation = 'multiply'; for (let i = 0; i < 18; i++) { const x = c[0] + (r() - 0.5) * s * 0.9, y = c[1] + (r() - 0.5) * s * 0.6, rr = s * (0.05 + r() * 0.12); h.fillStyle = rad(h, x, y, 0, rr, [[0, '#2A2420', 0.55 * o.sootA], [1, '#2A2420', 0]]); h.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); } h.restore(); }
      if (o.extraShade) o.extraShade(h, hs);
    };
    paper(g, path, dark, { shadow: o.shadow || null, shade: shadeFn, rim: o.rim || null });
    if (hs.thumb && o.thumbOver) paper(g, hs.thumb.path(0.15, 4), dark, { shade: shadeFn, rim: o.rim || null, shadow: { dx: 0, dy: 2, blur: 5, alpha: 0.45 } });
    // nails
    if (o.nails !== false) hs.fingers.forEach(f => { if (f.curl > 0.75) return; const nx = f.tip[0] - Math.cos(f.ang) * f.w * 0.75, ny = f.tip[1] - Math.sin(f.ang) * f.w * 0.75;
      g.save(); g.translate(nx, ny); g.rotate(f.ang); g.fillStyle = o.nails ? o.nails : rgba(mix(skin, '#ffffff', 0.35), 0.55); g.beginPath(); g.ellipse(0, 0, f.w * 0.62, f.w * 0.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = rgba('#ffffff', o.nails ? 0.55 : 0.35); g.beginPath(); g.ellipse(-f.w * 0.1, -f.w * 0.18, f.w * 0.22, f.w * 0.1, 0, 0, Math.PI * 2); g.fill(); g.restore(); });
    // rings (Marina): ellipse strokes with a hot highlight
    if (o.rings) o.rings.forEach(i => { const f = hs.fingers[i]; if (!f) return; const x = lerp(f.base[0], f.mid[0], 0.62), y = lerp(f.base[1], f.mid[1], 0.62);
      g.save(); g.translate(x, y); g.rotate(f.ang); g.strokeStyle = '#C9CDD2'; g.lineWidth = Math.max(1.6, f.w * 0.42); g.beginPath(); g.ellipse(0, 0, f.w * 0.32, f.w * 1.08, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#FFFFFF'; g.shadowColor = '#FFF4DC'; g.shadowBlur = 8; g.beginPath(); g.arc(-f.w * 0.1, -f.w * 0.75, Math.max(1.4, f.w * 0.22), 0, Math.PI * 2); g.fill(); g.restore(); });
    return hs;
  }

  G.PPL = { FRONT, PROF, headGeom, head, modelFace, eyes, brows, hairPath, shadeHair, hand, handShape, makeXf, lerpPts };
})(window);
