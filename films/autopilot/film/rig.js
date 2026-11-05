/* AUTOPILOT — THE CHARACTERS (RIG)
   window.RIG = { draw(g, who, pose, opts), face(g, who, pose, opts), hand(g, who, pose, opts), demos, ... }  (film/api/rig.md)

   Construction (look_c.md, "Through Glass"): flat graphic realism. Every body part is a flat shape in three values
   (light / mid / shade) cut by hard terminators that follow its contour, plus a crisp rim on the side facing the shot's one
   motivated light. No outlines. Faces stay quiet.
   - A 3D skeleton in metres (x = the character's right, y up, z forward) is posed by `body` (cycles take `phase`) and seen
     by an orthographic camera at any yaw (`view` / `yaw`), so one figure serves front, three-quarter, profile and back.
   - Limbs, torso and neck are lofted from cross-sections and projected; heads are a ring model (silhouette by angular
     envelope), with features mapped onto the face surface, faceted planes for the light, and scalp-patch hair.
   - Modes: 'full', 'silhouette' (ink + rim, as C3), 'reflection' (in glass), 'blur' (behind fog), all deterministic.
   Never uses Math.random or Date. */
(function (G) {
  'use strict';
  const O = G.OTM, LC = G.LC, PAL = LC.P;
  const clamp = O.clamp, lerp = O.lerp, TAU = Math.PI * 2, D2R = Math.PI / 180;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const fract = x => x - Math.floor(x);

  // =====================================================================
  // vectors, matrices, colour
  // =====================================================================
  const v3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
    madd: (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: a => Math.hypot(a[0], a[1], a[2]),
    norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  };
  const M = {
    I: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    mul(A, B) { const R = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return R; },
    ap(A, v) { return [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]]; },
    tap(A, v) { return [A[0] * v[0] + A[3] * v[1] + A[6] * v[2], A[1] * v[0] + A[4] * v[1] + A[7] * v[2], A[2] * v[0] + A[5] * v[1] + A[8] * v[2]]; },
    rx(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; },   // + pitches forward (nod down)
    ry(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; },   // + turns forward toward +x (the character's right)
    rz(a) { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; },   // + rolls the top toward -x (the character's left)
    ypr(y, p, r) { return M.mul(M.ry(y), M.mul(M.rx(p), M.rz(r))); },
  };
  const rgb = h => O.hexToRgb(h);
  const hex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const mixc = (a, b, t) => O.mix(a, b, clamp(t, 0, 1));
  const mulc = (a, k) => { const c = rgb(a); return hex(c[0] * k, c[1] * k, c[2] * k); };
  const rgba = (h, a) => O.rgba(h, clamp(a, 0, 1));
  const lum = h => { const c = rgb(h); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; };
  const tri = (l, m, s) => [l, m, s];

  // =====================================================================
  // the cast
  // =====================================================================
  // head rings: [y, halfWidth, zCentre, zFront, zBack, frontExponent] in head space (y up from the eye line, z forward)
  const HEAD_ADULT_M = {
    rings: [
      [0.126, 0.012, -0.010, 0.012, 0.012, 2.0], [0.120, 0.040, -0.012, 0.042, 0.044, 2.0], [0.107, 0.059, -0.012, 0.069, 0.070, 2.0],
      [0.088, 0.070, -0.010, 0.086, 0.087, 2.1], [0.064, 0.075, -0.008, 0.095, 0.096, 2.2], [0.040, 0.0765, -0.007, 0.099, 0.099, 2.3],
      [0.021, 0.076, -0.005, 0.100, 0.100, 2.45], [0.004, 0.0735, -0.005, 0.094, 0.096, 2.6], [-0.014, 0.0715, -0.003, 0.091, 0.092, 2.6],
      [-0.030, 0.0685, 0.002, 0.088, 0.088, 2.5], [-0.046, 0.0645, 0.009, 0.083, 0.083, 2.4], [-0.062, 0.0605, 0.016, 0.077, 0.076, 2.3],
      [-0.078, 0.0560, 0.022, 0.069, 0.068, 2.2], [-0.092, 0.0500, 0.028, 0.061, 0.062, 2.1], [-0.104, 0.0405, 0.034, 0.053, 0.054, 2.0],
      [-0.113, 0.0290, 0.040, 0.042, 0.036, 2.0], [-0.119, 0.0160, 0.045, 0.029, 0.024, 2.0],
    ],
    // nose cross-sections: [y, zRidge, halfWidth, zBase]
    nose: [[0.012, 0.0925, 0.0068, 0.089], [0.000, 0.0975, 0.0072, 0.088], [-0.012, 0.1045, 0.0078, 0.0885], [-0.024, 0.1105, 0.0088, 0.089],
      [-0.034, 0.1165, 0.0108, 0.0905], [-0.041, 0.1205, 0.0135, 0.092], [-0.047, 0.117, 0.0168, 0.094], [-0.051, 0.1065, 0.0152, 0.095], [-0.054, 0.0975, 0.010, 0.095]],
    lips: [[-0.058, 0.0965, 0.021], [-0.0645, 0.0990, 0.024], [-0.0745, 0.0975, 0.0215], [-0.081, 0.0935, 0.019], [-0.103, 0.0905, 0.021]],
    eye: { x: 0.0315, y: 0.0, w: 0.0295, h: 0.0118, iris: 0.0060, droop: 0.0016 },
    brow: { x: 0.0335, y: 0.0215, len: 0.040, thick: 0.0042 },
    mouth: { y: -0.0695, w: 0.048 },
    noseTip: [-0.041, 0.1205], alaY: -0.0455, alaW: 0.0172,
    ear: { x: 0.0755, y: -0.012, z: -0.012, h: 0.062, w: 0.034 },
    scalp: { c: [0, 0.019, -0.006], r: [0.0825, 0.112, 0.106] },
    pivot: [0, -0.072, -0.022], top: 0.126, chin: -0.119,
  };
  // a woman's head: a little smaller and finer
  const scaleHead = (Hd, k, o) => {
    const S = JSON.parse(JSON.stringify(Hd)); const sc = a => a.map(v => typeof v === 'number' ? v * k : v);
    S.rings = S.rings.map(r => [r[0] * k, r[1] * k * (o && o.w || 1), r[2] * k, r[3] * k, r[4] * k, r[5]]);
    S.nose = S.nose.map(n => [n[0] * k, n[1] * k * (o && o.nose || 1), n[2] * k * (o && o.noseW || 1), n[3] * k]);
    S.lips = S.lips.map(l => [l[0] * k, l[1] * k, l[2] * k]);
    ['eye', 'brow', 'mouth', 'ear'].forEach(f => { for (const q in S[f]) if (typeof S[f][q] === 'number') S[f][q] *= k; });
    S.scalp.c = sc(S.scalp.c); S.scalp.r = sc(S.scalp.r); S.pivot = sc(S.pivot); S.top *= k; S.chin *= k; S.noseTip = sc(S.noseTip); S.alaY *= k; S.alaW *= k;
    return S;
  };
  const HEAD_CHILD = {
    rings: [
      [0.113, 0.014, -0.008, 0.012, 0.012, 2.0], [0.108, 0.042, -0.009, 0.044, 0.046, 2.0], [0.097, 0.063, -0.009, 0.068, 0.070, 2.0],
      [0.080, 0.075, -0.008, 0.084, 0.086, 2.05], [0.058, 0.0815, -0.007, 0.092, 0.094, 2.15], [0.034, 0.0835, -0.006, 0.094, 0.096, 2.25],
      [0.016, 0.083, -0.005, 0.092, 0.094, 2.3], [0.002, 0.0815, -0.004, 0.089, 0.091, 2.35], [-0.014, 0.0805, -0.002, 0.088, 0.086, 2.3],
      [-0.030, 0.0785, 0.004, 0.085, 0.077, 2.25], [-0.044, 0.0745, 0.011, 0.079, 0.066, 2.2], [-0.057, 0.0675, 0.017, 0.072, 0.054, 2.15],
      [-0.068, 0.0575, 0.023, 0.064, 0.042, 2.1], [-0.077, 0.0450, 0.028, 0.055, 0.031, 2.0], [-0.084, 0.0310, 0.032, 0.045, 0.020, 2.0],
      [-0.088, 0.0160, 0.035, 0.034, 0.012, 2.0],
    ],
    nose: [[0.006, 0.0905, 0.0060, 0.088], [-0.006, 0.0935, 0.0068, 0.088], [-0.016, 0.0975, 0.0084, 0.0885], [-0.024, 0.1005, 0.0104, 0.089],
      [-0.029, 0.1012, 0.0118, 0.0895], [-0.033, 0.0985, 0.0128, 0.090], [-0.036, 0.0935, 0.0108, 0.0905]],
    lips: [[-0.046, 0.0915, 0.016], [-0.0505, 0.0935, 0.0175], [-0.058, 0.0915, 0.0155], [-0.063, 0.0885, 0.014], [-0.077, 0.0835, 0.018]],
    eye: { x: 0.0300, y: 0.0, w: 0.0265, h: 0.0128, iris: 0.0066, droop: 0.0004 },
    brow: { x: 0.0315, y: 0.0215, len: 0.031, thick: 0.0028 },
    mouth: { y: -0.0535, w: 0.033 },
    noseTip: [-0.029, 0.1012], alaY: -0.032, alaW: 0.0128,
    ear: { x: 0.0805, y: -0.014, z: -0.010, h: 0.050, w: 0.030 },
    scalp: { c: [0, 0.016, -0.006], r: [0.0985, 0.112, 0.112] },
    pivot: [0, -0.058, -0.020], top: 0.113, chin: -0.088,
  };

  // body proportions (metres). torso sections: [u (0 = hip joints, 1 = neck base), halfWidth, front, back]
  const BODY_M = {
    hipH: 0.99, thigh: 0.47, shin: 0.445, ankle: 0.075, foot: 0.27, hipW: 0.185, shW: 0.385, shU: 0.86, ua: 0.315, fa: 0.27, hand: 0.19,
    spine: 0.56, neck: 0.085,
    torso: [[-0.16, 0.128, 0.068, 0.075], [-0.07, 0.165, 0.084, 0.104], [0.05, 0.168, 0.086, 0.090], [0.17, 0.152, 0.092, 0.076], [0.33, 0.150, 0.099, 0.080],
      [0.52, 0.162, 0.112, 0.092], [0.70, 0.175, 0.108, 0.098], [0.84, 0.196, 0.086, 0.088], [0.93, 0.128, 0.062, 0.072], [1.00, 0.064, 0.054, 0.054]],
    ua: [[0, 0.054, 0.052, 0.052], [0.35, 0.050, 0.050, 0.050], [0.75, 0.043, 0.044, 0.042], [1, 0.039, 0.040, 0.038]],
    fa: [[0, 0.040, 0.040, 0.038], [0.22, 0.042, 0.043, 0.040], [0.7, 0.032, 0.030, 0.028], [1, 0.027, 0.022, 0.022]],
    th: [[0, 0.088, 0.088, 0.086], [0.35, 0.078, 0.080, 0.074], [0.78, 0.062, 0.060, 0.056], [1, 0.054, 0.052, 0.050]],
    sh: [[0, 0.050, 0.050, 0.050], [0.28, 0.052, 0.042, 0.062], [0.72, 0.038, 0.034, 0.038], [1, 0.031, 0.030, 0.030]],
    neckR: [0.056, 0.058, 0.058],
  };
  const scaleBody = (B, k, o) => {
    const S = JSON.parse(JSON.stringify(B)); o = o || {};
    ['hipH', 'thigh', 'shin', 'ankle', 'foot', 'hipW', 'shW', 'ua', 'fa', 'hand', 'spine', 'neck'].forEach(q => { if (typeof S[q] === 'number') S[q] *= k; });
    const wk = o.w || 1, hk = o.hip || 1, ck = o.chest || 1;
    S.torso = S.torso.map(r => { const u = r[0]; const h = u < 0.25 ? hk : u > 0.45 && u < 0.8 ? ck : 1; return [u, r[1] * k * wk * h, r[2] * k * (u > 0.4 && u < 0.75 ? (o.bust || 1) : 1), r[3] * k]; });
    ['ua', 'fa', 'th', 'sh'].forEach(q => { S[q] = S[q].map(r => [r[0], r[1] * k * (o.limb || 1), r[2] * k * (o.limb || 1), r[3] * k * (o.limb || 1)]); });
    S.neckR = S.neckR.map(v => v * k * (o.neck || 1));
    return S;
  };

  // materials: [light, mid, shade]
  const MAT = {
    dSkin: tri('#BE8C6C', '#9C6D55', '#5F3F33'), eSkin: tri('#D6A47F', '#B27E62', '#7B5240'), sSkin: tri('#DDB08E', '#BA8B6B', '#7A5541'), pSkin: tri('#B4805F', '#8E5E45', '#56372A'),
    dHair: tri('#3B302A', '#1B1411', '#0C0908'), eHair: tri('#3A2A20', '#16100C', '#0A0706'), sHair: tri('#4A3428', '#21160F', '#100A07'), pHair: tri('#2C2422', '#0F0C0B', '#060505'),
    shirt: tri('#C8D6DD', '#9FB3BF', '#677C89'), tie: tri('#3C5576', '#22344A', '#131D2B'), trousers: tri('#4A5157', '#2F353A', '#1B1F23'),
    tee: tri('#A9B3B1', '#7D8A8A', '#4E5859'), pyjama: tri('#46596B', '#2B3A44', '#17212A'), shoes: tri('#5B4030', '#33251B', '#18110C'),
    cardigan: tri('#F0CC74', '#E0B34F', '#9C7629'), eTop: tri('#F1EBDD', '#D8D0BF', '#A1988A'), leggings: tri('#8796A0', '#5F6E79', '#3B4750'),
    sock: tri('#EDC665', '#E0B34F', '#A07B2E'), sockB: tri('#F3D27E', '#D9A944', '#9A7428'),
    blazer: tri('#404E62', '#262F3E', '#151B25'), blouse: tri('#F0E8D9', '#D6CBB7', '#9C9180'), sTrousers: tri('#43464D', '#2B2E34', '#17191D'),
    pTop: tri('#93596A', '#6E404D', '#43262F'), pTrousers: tri('#33363C', '#212429', '#131518'), coat: tri('#D3C7AD', '#B3A588', '#776B56'),
    belt: tri('#3A2A20', '#1E1612', '#0E0A08'), rabbit: tri('#DDD1B8', '#CBBDA2', '#9A8E75'), rabbitWorn: tri('#ADA08A', '#9C8E78', '#6E6352'),
  };
  const P_RIM = '#F6E3BC';

  const CHAR = {};
  CHAR.daniel = {
    name: 'daniel', H: 1.84, adult: true, male: true,
    skin: MAT.dSkin, hair: MAT.dHair, grey: '#7B746D', iris: '#2B1B13', sclera: tri('#E2DACF', '#C3B9AD', '#8C8178'), lip: '#80493B', brow: '#241A15',
    body: BODY_M, head: HEAD_ADULT_M, hairStyle: 'crop', stoop: 0.35, lidRest: 0.30, bags: 0.6, kind: 0.6,
    hairline: [[0, 0.071], [20, 0.070], [36, 0.062], [52, 0.054], [66, 0.036], [76, 0.006], [83, -0.006], [88, 0.006], [95, 0.024], [106, 0.030], [118, 0.020], [128, -0.006], [146, -0.036], [165, -0.052], [180, -0.057]],
    outfit: 'day', outfits: {
      day: { top: 'shirt', shirt: MAT.shirt, tie: MAT.tie, legs: 'trousers', trousers: MAT.trousers, feet: 'shoes', shoes: MAT.shoes, belt: MAT.belt },
      office: { top: 'shirt', shirt: MAT.shirt, tie: MAT.tie, legs: 'trousers', trousers: MAT.trousers, feet: 'shoes', shoes: MAT.shoes, belt: MAT.belt, tieDefault: 'loose' },
      night: { top: 'tee', tee: MAT.tee, legs: 'pyjama', trousers: MAT.pyjama, feet: 'bare' },
    },
  };
  CHAR.emily = {
    name: 'emily', H: 1.02, child: true,
    skin: MAT.eSkin, hair: MAT.eHair, iris: '#2A1A12', sclera: tri('#EAE2D6', '#CFC5B8', '#968B80'), lip: '#8E5546', brow: '#2A1D16',
    body: {
      hipH: 0.44, thigh: 0.205, shin: 0.19, ankle: 0.045, foot: 0.15, hipW: 0.105, shW: 0.205, shU: 0.84, ua: 0.15, fa: 0.13, hand: 0.095, spine: 0.33, neck: 0.035,
      torso: [[-0.18, 0.083, 0.055, 0.058], [-0.06, 0.106, 0.066, 0.074], [0.08, 0.108, 0.072, 0.066], [0.24, 0.104, 0.078, 0.060], [0.42, 0.106, 0.080, 0.062],
        [0.62, 0.110, 0.074, 0.064], [0.78, 0.118, 0.062, 0.060], [0.88, 0.090, 0.050, 0.052], [1.00, 0.042, 0.040, 0.040]],
      ua: [[0, 0.034, 0.034, 0.034], [0.4, 0.032, 0.033, 0.032], [1, 0.027, 0.027, 0.026]],
      fa: [[0, 0.028, 0.028, 0.027], [0.3, 0.029, 0.029, 0.027], [1, 0.021, 0.018, 0.018]],
      th: [[0, 0.058, 0.058, 0.058], [0.4, 0.052, 0.054, 0.050], [1, 0.039, 0.038, 0.037]],
      sh: [[0, 0.036, 0.036, 0.036], [0.3, 0.037, 0.032, 0.040], [1, 0.024, 0.024, 0.024]],
      neckR: [0.036, 0.040, 0.040],
    },
    head: HEAD_CHILD, hairStyle: 'curls', stoop: 0, lidRest: 0.42, bags: 0, kind: 0.2,
    hairline: [[0, 0.060], [24, 0.056], [44, 0.050], [62, 0.036], [76, 0.012], [86, 0.0], [96, 0.012], [108, 0.018], [124, 0.0], [146, -0.03], [166, -0.044], [180, -0.048]],
    outfit: 'day', outfits: { day: { top: 'cardigan', cardigan: MAT.cardigan, under: MAT.eTop, legs: 'leggings', trousers: MAT.leggings, feet: 'socks', sock: MAT.sock, sockB: MAT.sockB } },
  };
  CHAR.sarah = {
    name: 'sarah', H: 1.68, adult: true,
    skin: MAT.sSkin, hair: MAT.sHair, iris: '#2E1F16', sclera: tri('#E6DED3', '#C8BEB2', '#8E847A'), lip: '#9A5A4A', brow: '#2C1E16',
    body: scaleBody(BODY_M, 0.915, { w: 0.93, hip: 1.06, chest: 0.97, bust: 1.08, limb: 0.9, neck: 0.86 }),
    head: scaleHead(HEAD_ADULT_M, 0.94, { w: 0.97, nose: 0.97, noseW: 0.92 }), hairStyle: 'bun', stoop: 0.05, lidRest: 0.18, bags: 0.15, kind: 0.3,
    hairline: [[0, 0.068], [24, 0.066], [44, 0.058], [62, 0.042], [76, 0.016], [86, 0.002], [96, 0.020], [110, 0.026], [126, 0.004], [146, -0.03], [166, -0.05], [180, -0.055]],
    outfit: 'work', outfits: { work: { top: 'blazer', blazer: MAT.blazer, under: MAT.blouse, legs: 'trousers', trousers: MAT.sTrousers, feet: 'shoes', shoes: tri('#3A2C27', '#1E1714', '#0D0A09') } },
  };
  CHAR.priya = {
    name: 'priya', H: 1.63, adult: true,
    skin: MAT.pSkin, hair: MAT.pHair, iris: '#24160F', sclera: tri('#E4DCD0', '#C6BCAF', '#8A8076'), lip: '#7A3F38', brow: '#120D0B',
    body: scaleBody(BODY_M, 0.89, { w: 0.92, hip: 1.05, chest: 0.96, bust: 1.08, limb: 0.88, neck: 0.85 }),
    head: scaleHead(HEAD_ADULT_M, 0.93, { w: 0.98, nose: 0.98, noseW: 0.95 }), hairStyle: 'pony', stoop: 0.0, lidRest: 0.12, bags: 0.05, kind: 0.4,
    hairline: [[0, 0.066], [24, 0.064], [44, 0.056], [62, 0.040], [76, 0.014], [86, 0.0], [96, 0.018], [110, 0.024], [126, 0.002], [146, -0.03], [166, -0.05], [180, -0.056]],
    outfit: 'office', outfits: { office: { top: 'blouse', blouse: MAT.pTop, legs: 'trousers', trousers: MAT.pTrousers, feet: 'shoes', shoes: tri('#2C2422', '#171211', '#0A0808') },
      coat: { top: 'coat', coat: MAT.coat, under: MAT.pTop, legs: 'trousers', trousers: MAT.pTrousers, feet: 'shoes', shoes: tri('#2C2422', '#171211', '#0A0808') } },
  };

  // =====================================================================
  // poses: defaults, tweening helpers
  // =====================================================================
  const VIEW_YAW = { front: 0, three: 38, profile: 90, back: 180, threeBack: 142 };
  // FILM.key / FILM.mixv interpolate numbers; RIG.mix also snaps strings and booleans (at the segment's midpoint) so poses tween
  function mixPose(a, b, u) {
    if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * u;
    if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => i < b.length ? mixPose(v, b[i], u) : v);
    if (a && b && typeof a === 'object' && typeof b === 'object') { const o = {}; for (const k in a) o[k] = (k in b) ? mixPose(a[k], b[k], u) : a[k]; for (const k in b) if (!(k in a)) o[k] = b[k]; return o; }
    if (a === undefined) return b; if (b === undefined) return a;
    return u < 0.5 ? a : b;
  }
  function keyPose(t, ks) {
    if (t <= ks[0][0]) return ks[0][1]; const last = ks[ks.length - 1]; if (t >= last[0]) return last[1];
    let i = 0; while (i < ks.length - 1 && t > ks[i + 1][0]) i++;
    const [t0, v0] = ks[i], [t1, v1, e] = ks[i + 1]; let u = clamp((t - t0) / (t1 - t0 || 1e-6), 0, 1);
    const E = G.FILM && G.FILM.ease; const ef = typeof e === 'function' ? e : E && E[e || 'inOutSine']; if (ef) u = ef(u);
    return mixPose(v0, v1, u);
  }

  // =====================================================================
  // projection and lofting
  // =====================================================================
  // body space -> screen: orthographic, yaw a (0 = facing us, +90 = facing screen right)
  function makeView(at, s, a) {
    const ca = Math.cos(a), sa = Math.sin(a), ax = at[0], ay = at[1];
    return {
      a, ca, sa, s, ax, ay, cam: [sa, 0, ca],
      p(b) { return [ax + s * (-ca * b[0] + sa * b[2]), ay - s * b[1], sa * b[0] + ca * b[2]]; },
      v(w) { return [s * (-ca * w[0] + sa * w[2]), -s * w[1]]; },
      d(b) { return sa * b[0] + ca * b[2]; },
    };
  }
  // a cross-section frame for a bone: axis (unit), anterior hint -> {a: lateral, b: anterior}
  function boneFrame(axis, hint) {
    let b = v3.sub(hint, v3.mul(axis, v3.dot(hint, axis)));
    if (v3.len(b) < 1e-4) b = v3.sub([0, 1, 0.3], v3.mul(axis, v3.dot([0, 1, 0.3], axis)));
    b = v3.norm(b); const a = v3.norm(v3.cross(b, axis)); return { a, b };
  }
  // loft: secs [{c, a, b, w, f, k}] -> {path, pts, L, R, c2, wpx}. Caps: round unless opt.cap0/cap1 === false
  function loft(V, secs, opt) {
    opt = opt || {}; const n = secs.length, C2 = secs.map(q => V.p(q.c)), L = [], R = [], NS = opt.ns || 16;
    let wsum = 0;
    for (let i = 0; i < n; i++) {
      const q = secs[i], pa = C2[Math.max(0, i - 1)], pb = C2[Math.min(n - 1, i + 1)];
      let tx = pb[0] - pa[0], ty = pb[1] - pa[1]; const tl = Math.hypot(tx, ty);
      if (tl < 1e-6) { tx = 0; ty = 1; } else { tx /= tl; ty /= tl; }
      const nx = -ty, ny = tx; let mn = 1e9, mx = -1e9, pmn = C2[i], pmx = C2[i];
      for (let k = 0; k < NS; k++) {
        const t = k / NS * TAU, ct = Math.cos(t), st = Math.sin(t);
        const la = q.w * ct, an = st > 0 ? q.f * st : q.k * st;
        const p3 = [q.c[0] + q.a[0] * la + q.b[0] * an, q.c[1] + q.a[1] * la + q.b[1] * an, q.c[2] + q.a[2] * la + q.b[2] * an];
        const p2 = V.p(p3), d = (p2[0] - C2[i][0]) * nx + (p2[1] - C2[i][1]) * ny;
        if (d < mn) { mn = d; pmn = p2; } if (d > mx) { mx = d; pmx = p2; }
      }
      L.push(pmn); R.push(pmx); wsum += mx - mn;
    }
    const wpx = wsum / n, pts = [];
    const dir = (i, j) => { const dx = C2[j][0] - C2[i][0], dy = C2[j][1] - C2[i][1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
    if (opt.cap0 !== false && n > 1) { const d = dir(1, 0), w = Math.hypot(L[0][0] - R[0][0], L[0][1] - R[0][1]) * 0.42 * (opt.cap0k || 1); pts.push([C2[0][0] + d[0] * w, C2[0][1] + d[1] * w]); }
    for (let i = 0; i < n; i++) pts.push(L[i]);
    if (opt.cap1 !== false && n > 1) { const d = dir(n - 2, n - 1), w = Math.hypot(L[n - 1][0] - R[n - 1][0], L[n - 1][1] - R[n - 1][1]) * 0.42 * (opt.cap1k || 1); pts.push([C2[n - 1][0] + d[0] * w, C2[n - 1][1] + d[1] * w]); }
    for (let i = n - 1; i >= 0; i--) pts.push(R[i]);
    let cx = 0, cy = 0; C2.forEach(p => { cx += p[0]; cy += p[1]; });
    return { path: LC.smooth(pts.map(p => [p[0], p[1]])), pts, L, R, C2, c2: [cx / n, cy / n], wpx, depth: C2.reduce((s, p) => s + p[2], 0) / n };
  }
  // sections along a bone from A to B: prof [[t, w, f, k]] with an anterior hint
  function boneSecs(A, B, prof, hint, pad) {
    const ax = v3.norm(v3.sub(B, A)), fr = boneFrame(ax, hint); pad = pad || [0, 0, 0];
    return prof.map(r => ({ c: v3.lerp(A, B, r[0]), a: fr.a, b: fr.b, w: r[1] + pad[0], f: r[2] + pad[1], k: r[3] + pad[2] }));
  }
  const pathOf = pts => LC.smooth(pts.map(p => [p[0], p[1]]));
  const polyPath = pts => { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath(); return p; };

  // =====================================================================
  // flat light: three values cut along the contour, and the rim
  // =====================================================================
  // L: {x, y, color, back (0 = a key from our side, 0.5 = from the side, 1 = from behind: rim only)}
  function lightDir2(L, c2) { const dx = L.x - c2[0], dy = L.y - c2[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
  // paint a part: path, cols [light, mid, shade], c2 centre, w width px. o: {rim (0..1), lk, sk, flat (mid only), dark}
  function paintPart(g, R, part) {
    const p = part.path; let [cl, cm, cs] = part.cols;
    if (part.dark) { const k = part.dark; cl = mixc(cl, cm, k); cm = mixc(cm, cs, k * 0.7); cs = mixc(cs, '#000000', k * 0.25); }
    if (R.flat || part.flat) { g.fillStyle = R.grade(cm); g.fill(p); return; }
    const L = R.L, v = lightDir2(L, part.c2), back = L.back, w = Math.max(2, part.w || 20);
    const rimPx = part.rim === 0 ? 0 : R.rimPx * (part.rim == null ? 1 : part.rim);
    const dL = rimPx + w * lerp(0.30, 0.0, Math.min(1, back * 1.25)) * (part.lk == null ? 1 : part.lk);
    const dS = w * lerp(0.16, 1.15, back * back) * (part.sk == null ? 1 : part.sk);
    g.save(); g.clip(p);
    if (rimPx > 0) { g.fillStyle = R.rimCol(part.rimc); g.fill(p); g.translate(-v[0] * rimPx, -v[1] * rimPx); g.clip(p); g.translate(v[0] * rimPx, v[1] * rimPx); }
    g.fillStyle = R.grade(cl); g.fill(p);
    if (dL > 0.01) { g.translate(-v[0] * dL, -v[1] * dL); g.clip(p); g.translate(v[0] * dL, v[1] * dL); }
    g.fillStyle = R.grade(cs); g.fill(p);
    g.translate(v[0] * dS, v[1] * dS); g.fillStyle = R.grade(cm); g.fill(p);
    g.restore();
  }
  // fill a shape in one of the three values chosen by a 3D normal against the light (cel bands)
  function band3(R, n) { const t = v3.dot(n, R.Lb); return t > R.hi ? 0 : t < R.lo ? 2 : 1; }

  // =====================================================================
  // the skeleton
  // =====================================================================
  function ik2(A, T, l1, l2, pole) {
    let d = v3.sub(T, A); let dl = v3.len(d); const dn = dl > 1e-6 ? v3.mul(d, 1 / dl) : [0, -1, 0];
    dl = clamp(dl, Math.abs(l1 - l2) + 1e-4, (l1 + l2) * 0.9995);
    const a = (l1 * l1 - l2 * l2 + dl * dl) / (2 * dl), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    let pp = v3.sub(pole, v3.mul(dn, v3.dot(pole, dn))); if (v3.len(pp) < 1e-5) pp = [0, 0, 1]; pp = v3.norm(pp);
    return { mid: v3.add(v3.add(A, v3.mul(dn, a)), v3.mul(pp, h)), end: v3.add(A, v3.mul(dn, dl)) };
  }
  // named arm poses: hand target [outward, up, forward] from the shoulder in the chest frame, elbow pole [out, up, fwd], hand pitch
  const ARM = {
    down: { h: [0.06, -0.57, 0.05], pole: [0.3, 0, -1], bend: 0.12 },
    relaxed: { h: [0.07, -0.53, 0.09], pole: [0.3, 0, -1] },
    hold: { h: [0.05, -0.30, 0.30], pole: [0.4, -1, -0.3] },
    phone: { h: [-0.06, -0.24, 0.30], pole: [0.5, -1, -0.2], palm: 'up' },
    look: { h: [-0.08, -0.12, 0.33], pole: [0.6, -1, -0.1], palm: 'up' },
    ear: { h: [0.0, 0.17, 0.06], pole: [0.6, -1, 0.3] },
    pocket: { h: [0.10, -0.52, 0.0], pole: [0.8, -0.2, -0.6] },
    hip: { h: [0.16, -0.40, -0.02], pole: [1, 0.1, -0.5] },
    bag: { h: [0.10, -0.58, 0.02], pole: [0.3, 0, -1], grip: 1 },
    strap: { h: [-0.06, -0.12, 0.12], pole: [0.5, -1, 0] },
    reach: { h: [0.02, -0.06, 0.64], pole: [0.4, -1, -0.2] },
    reachLow: { h: [0.0, -0.36, 0.56], pole: [0.5, -0.6, -0.4] },
    reachUp: { h: [-0.02, 0.32, 0.36], pole: [0.6, -1, 0] },
    collar: { h: [-0.10, 0.05, 0.10], pole: [0.7, -1, 0.2] },
    tie: { h: [-0.12, -0.02, 0.13], pole: [0.7, -1, 0.1] },
    face: { h: [-0.10, 0.20, 0.13], pole: [0.6, -1, 0.1] },
    mug: { h: [-0.02, -0.28, 0.30], pole: [0.4, -1, -0.3] },
    sip: { h: [-0.08, 0.12, 0.16], pole: [0.6, -1, 0] },
    reports: { h: [-0.02, -0.40, 0.17], pole: [0.6, -0.6, -0.4] },
    rail: { h: [0.08, -0.12, 0.40], pole: [0.7, -0.6, -0.3] },
    wheel: { h: [-0.05, -0.17, 0.43], pole: [0.8, -1, -0.2] },
    desk: { h: [-0.06, -0.33, 0.34], pole: [0.8, -0.6, -0.4] },
    type: { h: [-0.09, -0.36, 0.30], pole: [0.8, -0.6, -0.4] },
    lap: { h: [-0.04, -0.46, 0.26], pole: [0.6, -0.4, -0.6] },
    knee: { h: [-0.02, -0.48, 0.34], pole: [0.7, -0.3, -0.5] },
    cross: { h: [-0.22, -0.30, 0.16], pole: [0.6, -1, -0.2] },
    wave: { h: [0.12, 0.25, 0.10], pole: [1, -0.5, -0.2] },
  };
  // pose fields every character understands, with their defaults
  const POSE0 = { at: [960, 980], scale: 300, view: 'front', facing: 1, body: 'stand', phase: 0, breath: 0, lean: 0, twist: 0, weight: 0,
    head: { tilt: 0, turn: 0, nod: 0 }, eyes: null, mouth: null, look: [0, 0] };

  function normPose(ch, pose) {
    const p = Object.assign({}, POSE0, pose || {}); p.head = Object.assign({ tilt: 0, turn: 0, nod: 0 }, pose && pose.head || {});
    const yawDeg = p.yaw != null ? p.yaw : (VIEW_YAW[p.view] != null ? VIEW_YAW[p.view] : 0);
    p._yaw = yawDeg * D2R * (p.facing < 0 ? -1 : 1);
    p.outfit = p.outfit || ch.outfit;
    return p;
  }

  // the body: returns joints in body space (metres) and frames
  function solveBody(ch, p) {
    const B = ch.body, body = p.body, fac = 1;
    const sk = { B, body };
    // ---- gait and posture parameters
    let pelvis = [0, B.hipH, 0], pPitch = 0, pYaw = 0, pRoll = 0, cPitch = 0, cYaw = 0, cRoll = 0;
    const stoop = (p.stoop != null ? p.stoop : ch.stoop) || 0;
    let legs = null, armsAuto = null, neckPitch = 0, headPitch = 0;
    const ph = fract(p.phase || 0);
    const lean = (p.lean || 0) * 0.5, twist = (p.twist || 0) * 0.5;
    const legLen = B.thigh + B.shin;
    if (body === 'walk' || body === 'hurry' || body === 'run') {
      const G0 = GAIT[body], k = legLen / 0.915;     // scale stride to the legs
      const stride = (p.stride || G0.stride) * k, duty = G0.duty;
      const bobPh = body === 'run' ? 1 : -1;
      const bob = G0.bob * k * 0.5 * (1 + bobPh * Math.cos(4 * Math.PI * (ph - duty / 2)));
      pelvis = [G0.sway * k * Math.sin(TAU * (ph - 0.02)), B.hipH - G0.drop * k - bob, 0];
      pYaw = G0.pyaw * Math.sin(TAU * ph); pRoll = G0.proll * Math.sin(TAU * ph + 0.6);
      cYaw = -G0.twist * Math.sin(TAU * ph); pPitch = G0.lean * 0.4; cPitch = G0.lean;
      legs = { R: gaitFoot(G0, stride, duty, ph, k, B), L: gaitFoot(G0, stride, duty, fract(ph + 0.5), k, B) };
      armsAuto = { R: -G0.arm * Math.cos(TAU * ph), L: G0.arm * Math.cos(TAU * ph), elbow: G0.elbow };
      sk.stride = stride;
    } else if (body === 'climb') {
      const k = legLen / 0.915, rise = p.rise || 0.19, going = p.going || 0.25;
      const bob = 0.012 * Math.cos(4 * Math.PI * (ph - 0.2));
      pelvis = [0.012 * Math.sin(TAU * ph), B.hipH - 0.06 * k + bob, 0]; pPitch = 0.08; cPitch = 0.16; cYaw = -0.05 * Math.sin(TAU * ph); pYaw = 0.05 * Math.sin(TAU * ph);
      legs = { R: climbFoot(fract(ph), rise, going, B), L: climbFoot(fract(ph + 0.5), rise, going, B) };
      armsAuto = { R: -0.12 * Math.cos(TAU * ph), L: 0.12 * Math.cos(TAU * ph), elbow: 0.3 };
      sk.rise = rise; sk.going = going;
    } else if (body === 'sit' || body === 'drive' || body === 'sitbed' || body === 'carseat') {
      const seat = p.seat != null ? p.seat : (body === 'drive' ? 0.30 : body === 'carseat' ? 0.0 : B.hipH * 0.47);
      const hipUp = 0.095 * (B.hipH / 0.99);
      pelvis = [0, hipUp, -0.02];
      if (body === 'drive') { pPitch = -0.28; cPitch = -0.12; }
      else if (body === 'sitbed') { pPitch = 0.05; cPitch = 0.42; }
      else if (body === 'carseat') { pPitch = -0.18; cPitch = -0.06; }
      else { pPitch = -0.05; cPitch = 0.04; }
      const kx = B.hipW / 2 + 0.01;
      if (body === 'drive') legs = { R: { an: [kx + 0.02, -seat + B.ankle + 0.08, B.thigh + B.shin * 0.62], ft: 0.55 }, L: { an: [-kx - 0.04, -seat + B.ankle + 0.06, B.thigh + B.shin * 0.48], ft: 0.4 } };
      else if (body === 'carseat') { const sw = Math.sin(TAU * ph) * (p.swing || 0); legs = { R: { an: [kx, -B.shin * 0.82, B.thigh * 0.95 + 0.04 + sw * 0.05], ft: 0.2, knee: [kx, 0.04, B.thigh * 0.95] }, L: { an: [-kx, -B.shin * 0.84, B.thigh * 0.95 + 0.03 - sw * 0.05], ft: 0.2 } }; }
      else { const sw = (p.swing || 0) * Math.sin(TAU * ph); const flr = -seat + B.ankle; legs = { R: { an: [kx + 0.01, Math.max(flr, -B.shin * 0.97 + 0.02), B.thigh * 0.98 + 0.04 + sw * 0.06], ft: 0 }, L: { an: [-kx - 0.01, Math.max(flr, -B.shin * 0.97 + 0.02), B.thigh * 0.98 + 0.02 - sw * 0.06], ft: 0 } }; }
      sk.seat = seat;
    } else if (body === 'kneel') {
      const kneeY = 0.055 * (B.hipH / 0.99);
      pelvis = [0, kneeY + B.thigh * 0.985, -0.03]; pPitch = 0.05; cPitch = 0.20;
      legs = { R: { an: [B.hipW / 2 + 0.01, 0.06, -B.shin * 0.92], ft: -1.35, knee: [B.hipW / 2 + 0.02, kneeY, 0.02] }, L: { an: [-B.hipW / 2 - 0.01, 0.06, -B.shin * 0.92], ft: -1.35, knee: [-B.hipW / 2 - 0.02, kneeY, 0.0] } };
    } else if (body === 'bust') {
      pelvis = [0, B.hipH, 0];
    } else {
      // stand: weight shift and contrapposto
      const wgt = clamp(p.weight || 0, -1, 1);
      pelvis = [wgt * 0.035, B.hipH - 0.012 - Math.abs(wgt) * 0.008 - (p.crouch || 0) * 0.25, 0]; pRoll = -wgt * 0.05; cRoll = wgt * 0.025;
      const kx = B.hipW / 2 + 0.03;
      legs = { R: { an: [kx + 0.005, B.ankle, 0.0 + (wgt < 0 ? 0.04 : 0)], ft: wgt < -0.3 ? 0.18 * -wgt : 0 }, L: { an: [-kx - 0.005, B.ankle, 0.025 + (wgt > 0 ? 0.04 : 0)], ft: wgt > 0.3 ? 0.18 * wgt : 0 } };
    }
    // breath: the chest and shoulders rise (px on screen, so it reads the same at every size)
    const br = (p.breathPx != null ? p.breathPx : 3) / p.scale * 0.5 * (1 - Math.cos(TAU * (p.breath || 0)));
    sk.breath = br;
    pPitch += lean * 0.4; cPitch += lean + stoop * 0.16; cYaw += twist; pYaw -= twist * 0.3;
    if (p.slump) { cPitch += p.slump * 0.35; }
    sk.pelvis = pelvis;
    sk.ang = { p: [pYaw, pPitch, pRoll], c: [cYaw, cPitch, cRoll] };
    // ---- spine: integrate sections from the pelvis to the neck base
    const frameAt = u => { const t = sstep(0.05, 0.8, u); return M.ypr(lerp(pYaw, cYaw, t), lerp(pPitch, cPitch, t) + (u > 0.75 ? stoop * 0.22 * (u - 0.75) / 0.25 : 0), lerp(pRoll, cRoll, t)); };
    sk.frameAt = frameAt;
    const spineAt = u => {   // position of the spine at u (integrated in 12 steps from 0)
      const n = 12; let pos = pelvis.slice(); const du = u / n;
      for (let i = 0; i < n; i++) { const uu = (i + 0.5) * du; const F = frameAt(uu); pos = v3.add(pos, M.ap(F, [0, du * B.spine, 0])); }
      return pos;
    };
    sk.spineAt = u => { const q = spineAt(u); if (u > 0.55) q[1] += br * sstep(0.55, 0.9, u); return q; };
    const Fp = frameAt(0), Fc = frameAt(0.86);
    sk.Fp = Fp; sk.Fc = Fc;
    sk.neckBase = sk.spineAt(1.0);
    const shC = sk.spineAt(B.shU);
    const shZ = -0.01 + stoop * 0.035;
    sk.sh = { R: v3.add(shC, M.ap(Fc, [B.shW / 2, -0.005 + br * 0.3, shZ])), L: v3.add(shC, M.ap(Fc, [-B.shW / 2, -0.005 + br * 0.3, shZ])) };
    sk.hip = { R: v3.add(pelvis, M.ap(Fp, [B.hipW / 2, 0, 0])), L: v3.add(pelvis, M.ap(Fp, [-B.hipW / 2, 0, 0])) };
    // ---- neck and head
    const Fn = M.mul(frameAt(1), M.rx(stoop * 0.55 + (p.neckPitch || 0)));
    sk.headPivot = v3.add(sk.neckBase, M.ap(Fn, [0, B.neck, 0]));
    const turn = (p.head.turn || 0) * 80 * D2R * -(p.facing < 0 ? -1 : 1), nod = (p.head.nod || 0) * 38 * D2R, tilt = (p.head.tilt || 0) * 26 * D2R * (p.facing < 0 ? -1 : 1);
    // the head stays level against the stoop (it looks ahead), then turns, nods and tilts
    sk.Rh = M.mul(M.mul(frameAt(1), M.ry(turn)), M.mul(M.rx(nod - stoop * 0.10 - cPitch * 0.55 + (body === 'drive' ? 0.25 : 0) + (body === 'carseat' ? 0.1 : 0)), M.rz(tilt)));
    const Hd = ch.head;
    sk.headC = v3.sub(sk.headPivot, M.ap(sk.Rh, Hd.pivot));
    // ---- legs
    sk.leg = {}; sk.foot = {};
    ['R', 'L'].forEach(sd => {
      const sg = sd === 'R' ? 1 : -1, H = sk.hip[sd], lg = legs && legs[sd];
      let an = lg ? lg.an.slice() : [sg * (B.hipW / 2 + 0.03), B.ankle, 0];
      let pole = v3.add(M.ap(Fp, [sg * 0.12, 0, 1]), [0, 0, 0]);
      if (lg && lg.knee) pole = v3.sub(lg.knee, v3.lerp(H, an, 0.5));
      const r = ik2(H, an, B.thigh, B.shin, pole);
      sk.leg[sd] = { hip: H, knee: r.mid, ankle: r.end };
      sk.foot[sd] = footOf(r.end, lg ? lg.ft || 0 : 0, sg, B, body, lg);
    });
    // ---- arms
    sk.arm = {};
    ['R', 'L'].forEach(sd => { sk.arm[sd] = solveArm(ch, p, sk, sd, armsAuto); });
    return sk;
  }
  const GAIT = {
    walk: { stride: 1.36, duty: 0.62, bob: 0.024, drop: 0.022, sway: 0.016, lift: 0.075, arm: 0.30, elbow: 0.32, lean: 0.03, twist: 0.07, pyaw: 0.06, proll: 0.035 },
    hurry: { stride: 1.64, duty: 0.58, bob: 0.032, drop: 0.03, sway: 0.014, lift: 0.10, arm: 0.48, elbow: 0.75, lean: 0.11, twist: 0.09, pyaw: 0.08, proll: 0.04 },
    run: { stride: 2.35, duty: 0.36, bob: 0.05, drop: 0.07, sway: 0.01, lift: 0.26, arm: 0.72, elbow: 1.45, lean: 0.20, twist: 0.12, pyaw: 0.10, proll: 0.03 },
  };
  // one foot of a gait cycle: q is that foot's phase (0 = heel strike). Returns {an: ankle target, ft: foot pitch (+ heel up)}
  function gaitFoot(G0, stride, duty, q, k, B) {
    const a = stride * duty / 2; let z, y = 0, ft = 0;
    if (q < duty) { const u = q / duty; z = a - 2 * a * u; ft = u < 0.12 ? -0.25 * (1 - u / 0.12) : u > 0.7 ? 0.55 * sstep(0.7, 1, u) * (G0.duty < 0.5 ? 1.3 : 1) : 0; if (G0.duty < 0.5) ft = u < 0.15 ? 0.08 : u > 0.55 ? 0.6 * sstep(0.55, 1, u) : 0.0; }
    else { const u = (q - duty) / (1 - duty), e = u * u * (3 - 2 * u); z = -a + 2 * a * e; y = G0.lift * k * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 1.1); ft = lerp(0.6, -0.2, sstep(0.0, 0.85, u)); if (G0.duty < 0.5) { y = G0.lift * k * Math.sin(Math.PI * Math.pow(u, 0.7)); ft = lerp(0.7, 0.05, u); } }
    return { an: [0, B.ankle + y, z], ft, gait: true };
  }
  function climbFoot(q, rise, going, B) {
    // stance: from +0.6 to -0.6 treads (q 0.4..1); swing: from -0.6 to +0.6 over the next nosing (q 0..0.4)
    let off, y, ft = 0;
    if (q >= 0.4) { off = 0.6 - 2 * (q - 0.4); y = off * rise; ft = q > 0.85 ? 0.5 * sstep(0.85, 1, q) : 0; }
    else { const u = q / 0.4, e = u * u * (3 - 2 * u); off = -0.6 + 1.2 * e; y = off * rise + (rise * 0.8 + 0.06) * Math.sin(Math.PI * u) + (e) * 0; ft = lerp(0.5, 0, sstep(0, 0.7, u)); }
    // the tread under the foot: in stance the foot is flat on its tread; heights are relative to the slope line through the root
    const stY = Math.round(off + 0.4) - 0.4;   // planted tread index relative to the root
    if (q >= 0.4) y = stY * rise;
    return { an: [0, B.ankle + y, off * going + 0.06], ft, stair: true };
  }
  function footOf(an, ft, sg, B, body, lg) {
    // heel and toe points (ankle-relative), the sole pitched by ft (+ heel up, rotating about the ball; - toe up, about the heel)
    const len = B.foot, hb = B.ankle, toeOut = sg * 0.12;
    const fwd = [Math.sin(toeOut), 0, Math.cos(toeOut)];
    let heel = v3.add(an, [fwd[0] * -0.055 * len / 0.27, -hb, fwd[2] * -0.055 * len / 0.27]);
    let ball = v3.add(heel, v3.mul(fwd, len * 0.72)), toe = v3.add(heel, v3.mul(fwd, len));
    const rotAbout = (pt, piv, a) => { const d = v3.sub(pt, piv); const c = Math.cos(a), s = Math.sin(a); const zz = d[0] * fwd[0] + d[2] * fwd[2]; const yy = d[1]; const zr = zz * c - yy * s, yr = zz * s + yy * c; return [piv[0] + fwd[0] * zr + (d[0] - fwd[0] * zz), piv[1] + yr, piv[2] + fwd[2] * zr + (d[2] - fwd[2] * zz)]; };
    if (ft > 0) { const a = -ft; heel = rotAbout(heel, ball, -a); toe = rotAbout(toe, ball, a * 0.25); }
    else if (ft < 0) { const a = -ft; ball = rotAbout(ball, heel, a); toe = rotAbout(toe, heel, a); }
    return { heel, ball, toe, an, fwd };
  }
  function solveArm(ch, p, sk, sd, auto) {
    const B = ch.body, sg = sd === 'R' ? 1 : -1, S = sk.sh[sd], Fc = sk.Fc;
    let spec = p['arm' + sd]; if (spec == null) spec = auto ? 'auto' : (p.body === 'drive' ? 'wheel' : p.body === 'sit' ? 'desk' : p.body === 'sitbed' ? 'knee' : p.body === 'carseat' ? 'hold' : 'down');
    if (typeof spec === 'string') spec = { pose: spec };
    const l1 = B.ua, l2 = B.fa;
    let hand, pole, palm = 'in', grip = 0;
    const toBody = (v) => M.ap(Fc, [v[0] * sg, v[1], v[2]]);
    const kk = (B.ua + B.fa) / 0.585;     // targets scale with arm length
    if (spec.pose === 'auto' && auto) {
      const th = auto[sd], e = auto.elbow;
      const up = toBody([0.07, -Math.cos(th), Math.sin(th)]);
      const el = v3.add(S, v3.mul(v3.norm(up), l1));
      const fd = toBody([0.02, -Math.cos(th + e), Math.sin(th + e)]);
      const wr = v3.add(el, v3.mul(v3.norm(fd), l2));
      return { sh: S, el, wr, dir: v3.norm(fd), palm: 'in', grip: p.body === 'run' ? 0.9 : 0.3, sd };
    }
    if (spec.to) {          // a screen point (in the drawing's coordinates); depth: metres toward the viewer from the shoulder
      const V = sk.V; const sx = spec.to[0], sy = spec.to[1];
      const wx = (sx - V.ax) / V.s, wy = (V.ay - sy) / V.s;
      const sw = [-V.ca * S[0] + V.sa * S[2], S[1], V.sa * S[0] + V.ca * S[2]];
      const d2 = Math.hypot(wx - sw[0], wy - sw[1]), Lm = (l1 + l2) * 0.97;
      const want = spec.depth != null ? spec.depth : 0.25 * Math.sign(V.ca * 1 + 0.0001);
      const dz = Math.sign(want || 1) * Math.min(Math.abs(want), Math.sqrt(Math.max(0, Lm * Lm - d2 * d2)));
      const wz = sw[2] + dz;
      hand = [-V.ca * wx + V.sa * wz, wy, V.sa * wx + V.ca * wz];
      pole = toBody(spec.pole || [0.5, -1, -0.3]); palm = spec.palm || 'in'; grip = spec.grip || 0;
    } else if (spec.hand) {
      hand = v3.add(S, toBody(v3.mul(spec.hand, 1))); pole = toBody(spec.pole || [0.5, -1, -0.3]); palm = spec.palm || 'in'; grip = spec.grip || 0;
    } else if (spec.at) {   // body space point
      hand = spec.at.slice(); pole = toBody(spec.pole || [0.5, -1, -0.3]); palm = spec.palm || 'in'; grip = spec.grip || 0;
    } else {
      const A = ARM[spec.pose] || ARM.down; let h = A.h.slice();
      if (spec.pose === 'wheel' && sk.wheel) { hand = sk.wheel[sd]; }
      else hand = v3.add(S, toBody([h[0] * kk, h[1] * kk, h[2] * kk]));
      if (spec.dx) hand = v3.add(hand, toBody([spec.dx * sg, spec.dy || 0, spec.dz || 0]));
      pole = toBody(A.pole); palm = A.palm || 'in'; grip = A.grip || (p['hold' + sd] || (sd === 'R' && typeof p.hold === 'string' ? p.hold : null) ? 1 : 0);
    }
    const r = ik2(S, hand, l1, l2, pole);
    return { sh: S, el: r.mid, wr: r.end, dir: v3.norm(v3.sub(r.end, r.mid)), palm, grip, sd };
  }

  // =====================================================================
  // heads
  // =====================================================================
  const _cloud = new Map();
  function interpRings(rings, y) {
    if (y >= rings[0][0]) return rings[0]; const n = rings.length; if (y <= rings[n - 1][0]) return rings[n - 1];
    let i = 0; while (i < n - 1 && rings[i + 1][0] > y) i++;
    const a = rings[i], b = rings[i + 1], t = (a[0] - y) / (a[0] - b[0]);
    const ss = t * t * (3 - 2 * t) * 0.35 + t * 0.65;
    return a.map((v, k) => k === 0 ? y : lerp(v, b[k], ss));
  }
  function ringZ(r, x) {   // the front surface z at x on ring r
    const w = r[1], e = r[5], u = clamp(Math.abs(x) / w, 0, 0.9999);
    return r[2] + r[3] * Math.pow(1 - Math.pow(u, e), 1 / e);
  }
  function headCloud(Hd, dense) {
    const key = Hd; let c = _cloud.get(key); if (!c) { c = {}; _cloud.set(key, c); }
    const k = dense ? 'd' : 's'; if (c[k]) return c[k];
    const pts = [], top = Hd.top, bot = Hd.chin, dy = dense ? 0.0025 : 0.006, NS = dense ? 72 : 36;
    for (let y = top; y >= bot - 1e-6; y -= dy) {
      const r = interpRings(Hd.rings, y);
      for (let k2 = 0; k2 < NS; k2++) {
        const t = k2 / NS * TAU, ct = Math.cos(t), st = Math.sin(t);
        const e = st > 0 ? r[5] : 2, ex = 2 / e;
        const x = r[1] * Math.sign(ct) * Math.pow(Math.abs(ct), ex), z = r[2] + (st > 0 ? r[3] : r[4]) * Math.sign(st) * Math.pow(Math.abs(st), ex);
        pts.push(x, y, z);
      }
    }
    // the nose: rounded triangles in front of the face
    Hd.nose.forEach((n, i) => { const NN = dense ? 15 : 7; for (let j = 0; j <= NN; j++) { const t = j / NN * 2 - 1; pts.push(n[2] * t, n[0], n[3] + (n[1] - n[3]) * (1 - Math.pow(Math.abs(t), 1.7))); } });
    for (let i = 0; i < Hd.nose.length - 1; i++) { const a = Hd.nose[i], b = Hd.nose[i + 1]; for (let j = 1; j < 4; j++) { const t = j / 4; pts.push(0, lerp(a[0], b[0], t), lerp(a[1], b[1], t)); } }
    Hd.lips.forEach(l => { const NN = dense ? 11 : 5; for (let j = 0; j <= NN; j++) { const t = j / NN * 2 - 1; const r = interpRings(Hd.rings, l[0]); pts.push(l[2] * t, l[0], Math.max(ringZ(r, l[2] * t), l[1] - (l[1] - ringZ(r, l[2])) * t * t)); } });
    c[k] = new Float32Array(pts); return c[k];
  }
  // head placement: local -> body -> screen
  function headXf(sk, V, Hd) {
    const R = sk.Rh, C = sk.headC;
    return {
      R, C, cam: M.tap(R, V.cam),
      b: loc => v3.add(C, M.ap(R, loc)),
      p: loc => V.p(v3.add(C, M.ap(R, loc))),
    };
  }
  function headOutline(Hd, X, V, pxH) {
    const dense = pxH > 70, cl = headCloud(Hd, dense), R = X.R, C = X.C;
    const nb = pxH > 260 ? 300 : pxH > 120 ? 200 : pxH > 50 ? 120 : 72;
    const ctr = X.p([0, -0.004, 0.0]); const rad = new Float32Array(nb), hit = new Uint8Array(nb);
    const r0 = R[0], r1 = R[1], r2 = R[2], r3 = R[3], r4 = R[4], r5 = R[5], r6 = R[6], r7 = R[7], r8 = R[8];
    const s = V.s, ca = V.ca, sa = V.sa;
    for (let i = 0; i < cl.length; i += 3) {
      const x = cl[i], y = cl[i + 1], z = cl[i + 2];
      const bx = C[0] + r0 * x + r1 * y + r2 * z, by = C[1] + r3 * x + r4 * y + r5 * z, bz = C[2] + r6 * x + r7 * y + r8 * z;
      const sx = V.ax + s * (-ca * bx + sa * bz) - ctr[0], sy = V.ay - s * by - ctr[1];
      let a = Math.atan2(sy, sx); let bi = Math.floor((a + Math.PI) / TAU * nb); if (bi >= nb) bi = nb - 1;
      const rr = Math.hypot(sx, sy); if (rr > rad[bi]) rad[bi] = rr; hit[bi] = 1;
    }
    for (let i = 0; i < nb; i++) if (!hit[i]) { let a = i, b = i; while (!hit[(a + nb) % nb] && a > i - nb) a--; while (!hit[b % nb] && b < i + nb) b++; const ra = rad[(a + nb) % nb], rb = rad[b % nb]; rad[i] = lerp(ra, rb, (i - a) / Math.max(1, b - a)); }
    const sm = new Float32Array(nb);
    for (let i = 0; i < nb; i++) sm[i] = Math.max(rad[(i - 1 + nb) % nb] * 0.985, rad[i], rad[(i + 1) % nb] * 0.985);
    const pts = [];
    for (let i = 0; i < nb; i++) { const r = (sm[(i - 1 + nb) % nb] + 2 * sm[i] + sm[(i + 1) % nb]) / 4; const a = (i + 0.5) / nb * TAU - Math.PI; pts.push([ctr[0] + Math.cos(a) * r, ctr[1] + Math.sin(a) * r]); }
    return { path: LC.smooth(pts), pts, ctr, r: sm.reduce((a, b) => Math.max(a, b), 0) };
  }
  // the face surface: (x, y) in head space -> 3D point on the ring model (+dz outward)
  function facePt(Hd, x, y, dz) {
    const r = interpRings(Hd.rings, y), w = r[1] * 0.999; const xx = clamp(x, -w, w);
    return [xx, y, ringZ(r, xx) + (dz || 0)];
  }
  function faceN(Hd, x, y) {
    const e = 0.002, a = facePt(Hd, x - e, y), b = facePt(Hd, x + e, y), c = facePt(Hd, x, y - e), d = facePt(Hd, x, y + e);
    return v3.norm(v3.cross(v3.sub(b, a), v3.sub(d, c)));
  }

  // hair: the visible region of the scalp above the hairline, by the boundary walk (visible hairline + limb arc)
  function hairlineFn(table) {
    return ph => { let d = Math.abs(ph) / D2R; if (d > 180) d = 360 - d; let i = 0; while (i < table.length - 2 && table[i + 1][0] < d) i++;
      const a = table[i], b = table[i + 1], t = clamp((d - a[0]) / (b[0] - a[0]), 0, 1); const ss = t * t * (3 - 2 * t); return lerp(a[1], b[1], ss); };
  }
  function scalpPatch(Hd, X, hl, opt) {
    opt = opt || {}; const c = Hd.scalp.c, r = opt.r || Hd.scalp.r, camH = X.cam, N = opt.n || 120;
    const loop = [];
    for (let i = 0; i < N; i++) {
      const ph = i / N * TAU - Math.PI, y = hl(ph), sl = clamp((y - c[1]) / r[1], -0.999, 0.999), cl = Math.sqrt(1 - sl * sl);
      const loc = [c[0] + r[0] * cl * Math.sin(ph), y, c[2] + r[2] * cl * Math.cos(ph)];
      const nrm = [(loc[0] - c[0]) / (r[0] * r[0]), (loc[1] - c[1]) / (r[1] * r[1]), (loc[2] - c[2]) / (r[2] * r[2])];
      loop.push({ p: X.p(loc), vis: v3.dot(nrm, camH) > 0, ph, loc });
    }
    const dp = v3.norm([camH[0] / r[0], camH[1] / r[1], camH[2] / r[2]]);
    const e1 = Math.abs(dp[1]) < 0.9 ? v3.norm(v3.cross(dp, [0, 1, 0])) : v3.norm(v3.cross(dp, [1, 0, 0])), e2 = v3.cross(dp, e1);
    const NL = opt.nl || 120, limb = [];
    for (let i = 0; i < NL; i++) {
      const t = i / NL * TAU, u = v3.add(v3.mul(e1, Math.cos(t)), v3.mul(e2, Math.sin(t)));
      const loc = [c[0] + r[0] * u[0], c[1] + r[1] * u[1], c[2] + r[2] * u[2]];
      limb.push({ p: X.p(loc), in: loc[1] > hl(Math.atan2(u[0], u[2])), loc });
    }
    // merge tiny gaps in visibility, then take the longest visible run
    const vis = loop.map(q => q.vis);
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < N; i++) if (!vis[i]) { let j = 1; while (j < 5 && !vis[(i + j) % N]) j++; if (j < 5 && vis[(i - 1 + N) % N] && vis[(i + j) % N]) for (let k = 0; k < j; k++) vis[(i + k) % N] = true; }
    const runs = []; { let st = -1; for (let i = 0; i < 2 * N; i++) { const v = vis[i % N]; if (v && st < 0) st = i; if ((!v || i === 2 * N - 1) && st >= 0) { runs.push([st, i - 1]); st = -1; } } }
    const allVis = vis.every(v => v), inLimb = limb.map(q => q.in), anyIn = inLimb.some(v => v);
    let outPts = [], limbIdx = [];
    if (allVis) outPts = loop.map(q => q.p);
    else {
      let best = null; runs.forEach(rn => { if (rn[0] < N && (!best || rn[1] - rn[0] > best[1] - best[0])) best = rn; });
      // limb run inside the patch
      const lr = []; { let st = -1; for (let i = 0; i < 2 * NL; i++) { const v = inLimb[i % NL]; if (v && st < 0) st = i; if ((!v || i === 2 * NL - 1) && st >= 0) { lr.push([st, i - 1]); st = -1; } } }
      let lbest = null; lr.forEach(rn => { if (rn[0] < NL && (!lbest || rn[1] - rn[0] > lbest[1] - lbest[0])) lbest = rn; });
      if (!best && !anyIn) return null;
      if (!best) { if (inLimb.every(v => v)) outPts = limb.map(q => q.p); else { for (let i = lbest[0]; i <= lbest[1]; i++) outPts.push(limb[i % NL].p); } }
      else {
        const run = []; for (let i = best[0]; i <= best[1]; i++) run.push(loop[i % N].p);
        outPts = run.slice();
        if (lbest && (lbest[1] - lbest[0]) < NL - 1) {
          const arc = []; for (let i = lbest[0]; i <= lbest[1]; i++) { arc.push(limb[i % NL].p); limbIdx.push(i % NL); }
          const e = run[run.length - 1], d0 = Math.hypot(arc[0][0] - e[0], arc[0][1] - e[1]), d1 = Math.hypot(arc[arc.length - 1][0] - e[0], arc[arc.length - 1][1] - e[1]);
          if (d1 < d0) { arc.reverse(); limbIdx.reverse(); }
          outPts = outPts.concat(arc);
        }
      }
    }
    return { pts: outPts, loop, limb, limbIdx, path: LC.smooth(outPts) };
  }

  // =====================================================================
  // export (filled in below)
  // =====================================================================
  const RIG = G.RIG = { CHAR, MAT, ARM, VIEW_YAW, mix: mixPose, key: keyPose, demos: [], _: { v3, M, makeView, loft, solveBody, headCloud, scalpPatch, facePt } };
  RIG._internal = { clamp, lerp, sstep, fract, mixc, mulc, rgba, lum, tri, TAU, D2R, boneSecs, boneFrame, pathOf, polyPath, paintPart, band3, lightDir2, ik2, headXf, headOutline, faceN, hairlineFn, interpRings, ringZ, footOf, solveArm, normPose, GAIT, P_RIM, scaleBody, scaleHead, BODY_M, HEAD_ADULT_M, HEAD_CHILD };
})(window);
