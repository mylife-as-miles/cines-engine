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
      [0.022, 0.076, -0.005, 0.100, 0.100, 2.45], [0.004, 0.0735, -0.005, 0.094, 0.096, 2.6], [-0.013, 0.0715, -0.003, 0.091, 0.092, 2.6],
      [-0.028, 0.0688, 0.002, 0.088, 0.088, 2.5], [-0.043, 0.0648, 0.009, 0.083, 0.083, 2.4], [-0.058, 0.0605, 0.016, 0.077, 0.076, 2.3],
      [-0.073, 0.0558, 0.022, 0.069, 0.068, 2.2], [-0.086, 0.0498, 0.028, 0.061, 0.062, 2.1], [-0.098, 0.0405, 0.034, 0.053, 0.054, 2.0],
      [-0.106, 0.0290, 0.040, 0.042, 0.036, 2.0], [-0.112, 0.0160, 0.045, 0.029, 0.024, 2.0],
    ],
    // nose cross-sections: [y, zRidge, halfWidth, zBase]
    nose: [[0.013, 0.0925, 0.0068, 0.089], [0.002, 0.0972, 0.0072, 0.088], [-0.009, 0.1035, 0.0078, 0.0885], [-0.019, 0.1095, 0.0088, 0.089],
      [-0.028, 0.1150, 0.0106, 0.0905], [-0.0345, 0.1185, 0.0133, 0.092], [-0.0405, 0.1150, 0.0166, 0.094], [-0.0445, 0.1050, 0.0150, 0.095], [-0.0475, 0.0970, 0.010, 0.095]],
    lips: [[-0.053, 0.0960, 0.021], [-0.0595, 0.0985, 0.024], [-0.0695, 0.0970, 0.0215], [-0.0755, 0.0930, 0.019], [-0.097, 0.0900, 0.021]],
    eye: { x: 0.0318, y: 0.0, w: 0.0322, h: 0.0132, iris: 0.0065, droop: 0.0017 },
    brow: { x: 0.0335, y: 0.0238, len: 0.041, thick: 0.0052 },
    mouth: { y: -0.0645, w: 0.048 },
    noseTip: [-0.0345, 0.1185], alaY: -0.039, alaW: 0.0172,
    ear: { x: 0.0755, y: -0.010, z: -0.012, h: 0.060, w: 0.033 },
    scalp: { c: [0, 0.019, -0.006], r: [0.0825, 0.112, 0.106] },
    pivot: [0, -0.068, -0.022], top: 0.126, chin: -0.112,
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
    torso: [[-0.16, 0.128, 0.068, 0.080], [-0.07, 0.165, 0.084, 0.110], [0.05, 0.168, 0.088, 0.092], [0.17, 0.150, 0.096, 0.072], [0.33, 0.150, 0.102, 0.078],
      [0.52, 0.160, 0.118, 0.096], [0.70, 0.172, 0.112, 0.104], [0.84, 0.188, 0.088, 0.092], [0.93, 0.124, 0.064, 0.074], [1.00, 0.064, 0.054, 0.054]],
    uaP: [[0, 0.046, 0.046, 0.046], [0.35, 0.044, 0.045, 0.044], [0.75, 0.038, 0.040, 0.037], [1, 0.035, 0.036, 0.034]],
    faP: [[0, 0.036, 0.036, 0.034], [0.22, 0.038, 0.039, 0.036], [0.7, 0.029, 0.027, 0.025], [1, 0.024, 0.020, 0.020]],
    thP: [[0, 0.088, 0.088, 0.086], [0.35, 0.078, 0.080, 0.074], [0.78, 0.062, 0.060, 0.056], [1, 0.054, 0.052, 0.050]],
    shP: [[0, 0.050, 0.050, 0.050], [0.28, 0.052, 0.042, 0.062], [0.72, 0.038, 0.034, 0.038], [1, 0.031, 0.030, 0.030]],
    neckR: [0.056, 0.058, 0.058],
  };
  const scaleBody = (B, k, o) => {
    const S = JSON.parse(JSON.stringify(B)); o = o || {};
    ['hipH', 'thigh', 'shin', 'ankle', 'foot', 'hipW', 'shW', 'ua', 'fa', 'hand', 'spine', 'neck'].forEach(q => { if (typeof S[q] === 'number') S[q] *= k; });
    const wk = o.w || 1, hk = o.hip || 1, ck = o.chest || 1;
    S.torso = S.torso.map(r => { const u = r[0]; const h = u < 0.25 ? hk : u > 0.45 && u < 0.8 ? ck : 1; return [u, r[1] * k * wk * h, r[2] * k * (u > 0.4 && u < 0.75 ? (o.bust || 1) : 1), r[3] * k]; });
    ['uaP', 'faP', 'thP', 'shP'].forEach(q => { S[q] = S[q].map(r => [r[0], r[1] * k * (o.limb || 1), r[2] * k * (o.limb || 1), r[3] * k * (o.limb || 1)]); });
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
    body: BODY_M, head: (() => { const h = scaleHead(HEAD_ADULT_M, 1.05); h.scalp = { c: [0, 0.024, -0.008], r: [0.0895, 0.127, 0.1155] }; return h; })(), hairStyle: 'crop', stoop: 0.35, lidRest: 0.30, bags: 0.6, kind: 0.6,
    hairline: [[0, 0.069], [12, 0.070], [26, 0.066], [36, 0.060], [48, 0.057], [60, 0.046], [70, 0.024], [78, 0.004], [85, 0.0], [91, 0.012], [99, 0.026], [109, 0.031], [120, 0.021], [130, -0.008], [148, -0.050], [166, -0.062], [180, -0.066]], hairNoise: 0.0018,
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
      uaP: [[0, 0.034, 0.034, 0.034], [0.4, 0.032, 0.033, 0.032], [1, 0.027, 0.027, 0.026]],
      faP: [[0, 0.028, 0.028, 0.027], [0.3, 0.029, 0.029, 0.027], [1, 0.021, 0.018, 0.018]],
      thP: [[0, 0.058, 0.058, 0.058], [0.4, 0.052, 0.054, 0.050], [1, 0.039, 0.038, 0.037]],
      shP: [[0, 0.036, 0.036, 0.036], [0.3, 0.037, 0.032, 0.040], [1, 0.024, 0.024, 0.024]],
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
    head: scaleHead(HEAD_ADULT_M, 0.94, { w: 0.97, nose: 0.97, noseW: 0.92 }), hairK: 0.94, hairStyle: 'bun', stoop: 0.05, lidRest: 0.18, bags: 0.15, kind: 0.3,
    hairline: [[0, 0.068], [24, 0.066], [44, 0.058], [62, 0.042], [76, 0.016], [86, 0.002], [96, 0.020], [110, 0.026], [126, 0.004], [146, -0.03], [166, -0.05], [180, -0.055]],
    outfit: 'work', outfits: { work: { top: 'blazer', blazer: MAT.blazer, under: MAT.blouse, legs: 'trousers', trousers: MAT.sTrousers, feet: 'shoes', shoes: tri('#3A2C27', '#1E1714', '#0D0A09') } },
  };
  CHAR.priya = {
    name: 'priya', H: 1.63, adult: true,
    skin: MAT.pSkin, hair: MAT.pHair, iris: '#24160F', sclera: tri('#E4DCD0', '#C6BCAF', '#8A8076'), lip: '#7A3F38', brow: '#120D0B',
    body: scaleBody(BODY_M, 0.89, { w: 0.92, hip: 1.05, chest: 0.96, bust: 1.08, limb: 0.88, neck: 0.85 }),
    head: scaleHead(HEAD_ADULT_M, 0.93, { w: 0.98, nose: 0.98, noseW: 0.95 }), hairK: 0.93, hairStyle: 'pony', stoop: 0.0, lidRest: 0.12, bags: 0.05, kind: 0.4,
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
  // pitch: + = the camera above, looking down on the figure (laps, desks, the tops of heads)
  function makeView(at, s, a, pitch) {
    const ca = Math.cos(a), sa = Math.sin(a), ax = at[0], ay = at[1], pt = pitch || 0, cp = Math.cos(pt), sp = Math.sin(pt);
    return {
      a, ca, sa, s, ax, ay, cp, sp, cam: [sa * cp, sp, ca * cp],
      p(b) { const Z = sa * b[0] + ca * b[2]; return [ax + s * (-ca * b[0] + sa * b[2]), ay - s * (b[1] * cp - Z * sp), b[1] * sp + Z * cp]; },
      v(w) { const Z = sa * w[0] + ca * w[2]; return [s * (-ca * w[0] + sa * w[2]), -s * (w[1] * cp - Z * sp)]; },
      d(b) { return b[1] * sp + (sa * b[0] + ca * b[2]) * cp; },
      // a direction in camera space (x right, y up, z toward us) -> body space
      toBody(w) { const Yw = w[1] * cp + w[2] * sp, Zw = -w[1] * sp + w[2] * cp; return [-ca * w[0] + sa * Zw, Yw, sa * w[0] + ca * Zw]; },
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
    const c0 = opt.cap0 !== false, c1 = opt.cap1 !== false;
    if (c0 && n > 1) { const d = dir(1, 0), w = Math.hypot(L[0][0] - R[0][0], L[0][1] - R[0][1]) * 0.42 * (opt.cap0k || 1); pts.push([C2[0][0] + d[0] * w, C2[0][1] + d[1] * w]); }
    for (let i = 0; i < n; i++) pts.push([L[i][0], L[i][1], (!c0 && i === 0) || (!c1 && i === n - 1) ? 1 : 0]);
    if (c1 && n > 1) { const d = dir(n - 2, n - 1), w = Math.hypot(L[n - 1][0] - R[n - 1][0], L[n - 1][1] - R[n - 1][1]) * 0.42 * (opt.cap1k || 1); pts.push([C2[n - 1][0] + d[0] * w, C2[n - 1][1] + d[1] * w]); }
    for (let i = n - 1; i >= 0; i--) pts.push([R[i][0], R[i][1], (!c0 && i === 0) || (!c1 && i === n - 1) ? 1 : 0]);
    let cx = 0, cy = 0; C2.forEach(p => { cx += p[0]; cy += p[1]; });
    let plen = 0; for (let i = 1; i < n; i++) plen += Math.hypot(C2[i][0] - C2[i - 1][0], C2[i][1] - C2[i - 1][1]);
    let path;
    // seen end-on (a foot or a forearm pointing at us), the outline degenerates: use the projected sections themselves
    const ring = q => { const r = []; for (let k = 0; k < 14; k++) { const t = k / 14 * TAU, ct = Math.cos(t), st = Math.sin(t), la = q.w * ct, an = st > 0 ? q.f * st : q.k * st; r.push(V.p([q.c[0] + q.a[0] * la + q.b[0] * an, q.c[1] + q.a[1] * la + q.b[1] * an, q.c[2] + q.a[2] * la + q.b[2] * an])); } return LC.smooth(ccw(r.map(p => [p[0], p[1]]))); };
    if (plen < wpx * 0.35) { path = new Path2D(); secs.forEach(q => path.addPath(ring(q))); }
    else { path = LC.smooth(ccw(pts)); if (plen < wpx * 1.3) { if (c0) path.addPath(ring(secs[0])); if (c1) path.addPath(ring(secs[n - 1])); } }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(q => { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; });
    return { path, pts, L, R, C2, c2: [cx / n, cy / n], wpx, depth: C2.reduce((s, p) => s + p[2], 0) / n, plen, bb: [x1 - x0, y1 - y0], box: [x0, y0, x1, y1] };
  }
  const boxUnion = (...ls) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; ls.forEach(l => { if (!l || !l.box) return; x0 = Math.min(x0, l.box[0]); y0 = Math.min(y0, l.box[1]); x1 = Math.max(x1, l.box[2]); y1 = Math.max(y1, l.box[3]); }); return { box: [x0, y0, x1, y1], bb: [x1 - x0, y1 - y0] }; };
  // sections along a bone from A to B: prof [[t, w, f, k]] with an anterior hint
  function boneSecs(A, B, prof, hint, pad) {
    const ax = v3.norm(v3.sub(B, A)), fr = boneFrame(ax, hint); pad = pad || [0, 0, 0];
    return prof.map(r => ({ c: v3.lerp(A, B, r[0]), a: fr.a, b: fr.b, w: r[1] + pad[0], f: r[2] + pad[1], k: r[3] + pad[2] }));
  }
  function ccw(pts) { let a = 0; for (let i = 0, n = pts.length; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return a < 0 ? pts.slice().reverse() : pts; }
  const pathOf = pts => LC.smooth(ccw(pts.map(p => [p[0], p[1]])));
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
    if (R.flat === 2 && !part.flat) { const L = R.L, v = lightDir2(L, part.c2), w = Math.max(2, part.w || 20), dS = w * lerp(0.2, 1.0, L.back * L.back);
      g.save(); g.clip(p); g.fillStyle = R.grade(cs); g.fill(p); g.translate(v[0] * dS, v[1] * dS); g.fillStyle = R.grade(cm); g.fill(p); g.restore(); return; }
    if (R.flat || part.flat) { g.fillStyle = R.grade(cm); g.fill(p); return; }
    const L = R.L, v = lightDir2(L, part.c2), back = L.back, w = Math.max(2, part.w || 20);
    const ext = part.bb ? Math.max(w * 0.8, Math.abs(v[0]) * part.bb[0] + Math.abs(v[1]) * part.bb[1]) : w;
    const rimPx = part.rim === 0 ? 0 : R.rimPx * (part.rim == null ? 1 : part.rim);
    const dL = rimPx + ext * lerp(0.24, 0.0, Math.min(1, back * 1.3)) * (part.lk == null ? 1 : part.lk);
    const dS = ext * lerp(0.15, 0.97, back * back) * (part.sk == null ? 1 : part.sk);
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
    down: { h: [0.035, -0.575, 0.04], pole: [0.3, 0, -1], bend: 0.12 },
    relaxed: { h: [0.07, -0.53, 0.09], pole: [0.3, 0, -1] },
    hold: { h: [0.05, -0.30, 0.30], pole: [0.4, -1, -0.3] },
    phone: { h: [-0.06, -0.24, 0.30], pole: [0.5, -1, -0.2], palm: 'up' },
    look: { h: [-0.08, -0.12, 0.33], pole: [0.6, -1, -0.1], palm: 'up' },
    ear: { h: [0.0, 0.17, 0.06], pole: [0.6, -1, 0.3] },
    pocket: { h: [0.10, -0.52, 0.0], pole: [0.8, -0.2, -0.6] },
    hip: { h: [0.16, -0.40, -0.02], pole: [1, 0.1, -0.5] },
    bag: { h: [0.10, -0.58, 0.02], pole: [0.3, 0, -1], grip: 1 },
    strap: { h: [-0.06, -0.12, 0.12], pole: [0.5, -1, 0] },
    reach: { h: [0.02, 0.0, 0.64], pole: [0.4, -1, -0.2] },
    reachIn: { h: [-0.04, 0.02, 0.6], pole: [0.3, -1, -0.3] },
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
    desk: { h: [-0.05, -0.30, 0.36], pole: [0.8, -0.6, -0.4] },
    type: { h: [-0.08, -0.31, 0.40], pole: [0.8, -0.6, -0.4] },
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
  function solveBody(ch, p, V) {
    const B = ch.body, body = p.body;
    const sk = { B, body, V };
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
      pelvis = [0, kneeY + B.thigh * 0.97, -0.04]; pPitch = 0.04; cPitch = 0.12;
      const fk = B.foot / 0.27, feet = { heel: [0, 0.045 * fk, 0.02 * fk], ball: [0, -0.035 * fk, -0.15 * fk], toe: [0, -0.045 * fk, -0.21 * fk] };
      legs = { R: { an: [B.hipW / 2 + 0.01, 0.055 * fk, -B.shin * 0.93], feet, knee: [B.hipW / 2 + 0.02, kneeY, 0.02] }, L: { an: [-B.hipW / 2 - 0.01, 0.055 * fk, -B.shin * 0.93], feet, knee: [-B.hipW / 2 - 0.02, kneeY, 0.0] } };
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
    sk.sh = { R: v3.add(shC, M.ap(Fc, [B.shW / 2, -0.014 + br * 0.3, shZ])), L: v3.add(shC, M.ap(Fc, [-B.shW / 2, -0.014 + br * 0.3, shZ])) };
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
    // ---- the steering wheel (drive): its centre and the 10-and-2 grips, in body space
    if (body === 'drive') {
      const wc = p.wheelAt || [0, 0.40 * (B.hipH / 0.99), 0.41 * (B.hipH / 0.99)], wr = p.wheelR || 0.185, tiltW = 0.42;
      const upW = [0, Math.cos(tiltW), -Math.sin(tiltW)], rightW = [1, 0, 0];
      const onRim = a => v3.add(wc, v3.add(v3.mul(rightW, Math.sin(a) * wr), v3.mul(upW, Math.cos(a) * wr)));
      const turnW = (p.steer || 0) * 0.6;
      sk.wheel = { c: wc, r: wr, up: upW, right: rightW, n: v3.norm(v3.cross(rightW, upW)), R: onRim(62 * D2R + turnW), L: onRim(-62 * D2R + turnW), turn: turnW };
    }
    // ---- arms
    sk.arm = {};
    ['R', 'L'].forEach(sd => { sk.arm[sd] = solveArm(ch, p, sk, sd, armsAuto); });
    return sk;
  }
  const GAIT = {
    walk: { stride: 1.22, duty: 0.62, bob: 0.024, drop: 0.022, sway: 0.016, lift: 0.075, arm: 0.30, elbow: 0.32, lean: 0.03, twist: 0.07, pyaw: 0.06, proll: 0.035 },
    hurry: { stride: 1.5, duty: 0.58, bob: 0.032, drop: 0.03, sway: 0.014, lift: 0.10, arm: 0.48, elbow: 0.75, lean: 0.11, twist: 0.09, pyaw: 0.08, proll: 0.04 },
    run: { stride: 2.3, duty: 0.36, bob: 0.05, drop: 0.05, sway: 0.01, lift: 0.26, arm: 0.72, elbow: 1.45, lean: 0.20, twist: 0.12, pyaw: 0.10, proll: 0.03 },
  };
  // one foot of a gait cycle: q is that foot's phase (0 = heel strike). Returns {an: ankle target, ft: foot pitch (+ heel up)}
  // the ankle of a foot pitched by ft (+ heel up, pivoting on the ball; - toe up, pivoting on the heel) whose contact point is z
  function ankleOf(z, y, ft, B) {
    const L = B.foot, hb = B.ankle, k = L / 0.27, hz = -0.055 * k, bz = hz + 0.72 * L;
    const pz = ft > 0 ? z + bz : z + hz, dz = -(ft > 0 ? bz : hz), dy = hb, th = -ft;
    return [0, y + dz * Math.sin(th) + dy * Math.cos(th), pz + dz * Math.cos(th) - dy * Math.sin(th)];
  }
  function gaitFoot(G0, stride, duty, q, k, B) {
    const a = stride * duty / 2; let z, y = 0, ft = 0;
    if (q < duty) { const u = q / duty; z = a - 2 * a * u; ft = u < 0.12 ? -0.25 * (1 - u / 0.12) : u > 0.7 ? 0.55 * sstep(0.7, 1, u) * (G0.duty < 0.5 ? 1.3 : 1) : 0; if (G0.duty < 0.5) ft = u < 0.15 ? 0.08 : u > 0.55 ? 0.6 * sstep(0.55, 1, u) : 0.0; }
    else { const u = (q - duty) / (1 - duty), e = u * u * (3 - 2 * u); z = -a + 2 * a * e; y = G0.lift * k * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 1.1); ft = lerp(0.6, -0.2, sstep(0.0, 0.85, u)); if (G0.duty < 0.5) { y = G0.lift * k * Math.sin(Math.PI * Math.pow(u, 0.7)); ft = lerp(0.7, 0.05, u); } }
    if (y > 0.002) return { an: [0, B.ankle + y, z], ft, gait: true };
    return { an: ankleOf(z, 0, ft, B), ft, gait: true };
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
    // heel, ball and toe, rigid about the ankle, pitched by ft (+ toes down / heel up)
    if (lg && lg.feet) return { heel: v3.add(an, lg.feet.heel), ball: v3.add(an, lg.feet.ball), toe: v3.add(an, lg.feet.toe), an, fwd: v3.norm(lg.feet.toe) };
    const len = B.foot, hb = B.ankle, toeOut = sg * 0.12, k = len / 0.27;
    const fwd = [Math.sin(toeOut), 0, Math.cos(toeOut)];
    const P0 = (zz, yy) => { const th = -ft, c = Math.cos(th), s = Math.sin(th); const zr = zz * c - yy * s, yr = zz * s + yy * c; return [an[0] + fwd[0] * zr, an[1] + yr, an[2] + fwd[2] * zr]; };
    const hz = -0.055 * k;
    return { heel: P0(hz, -hb), ball: P0(hz + 0.72 * len, -hb), toe: P0(hz + len, -hb), an, fwd };
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
      const wx = (sx - V.ax) / V.s, wy = (V.ay - sy) / V.s / (V.cp || 1);
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
    const s = V.s, ca = V.ca, sa = V.sa, cp = V.cp, sp = V.sp;
    for (let i = 0; i < cl.length; i += 3) {
      const x = cl[i], y = cl[i + 1], z = cl[i + 2];
      const bx = C[0] + r0 * x + r1 * y + r2 * z, by = C[1] + r3 * x + r4 * y + r5 * z, bz = C[2] + r6 * x + r7 * y + r8 * z;
      const sx = V.ax + s * (-ca * bx + sa * bz) - ctr[0], sy = V.ay - s * (by * cp - (sa * bx + ca * bz) * sp) - ctr[1];
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
  // the head's base form as a grid of points and normals (no nose or lips), for the light's terminator
  const _grid = new Map();
  function headGrid(Hd) {
    let G0 = _grid.get(Hd); if (G0) return G0;
    const NR = 40, NS = 56, top = Hd.top - 0.004, bot = Hd.chin + 0.002, P0 = [], N0 = [];
    for (let j = 0; j < NR; j++) {
      const y = top + (bot - top) * j / (NR - 1), r = interpRings(Hd.rings, y), row = [];
      for (let i = 0; i < NS; i++) { const t = i / NS * TAU, ct = Math.cos(t), st = Math.sin(t), e = st > 0 ? r[5] : 2, ex = 2 / e;
        row.push([r[1] * Math.sign(ct) * Math.pow(Math.abs(ct), ex), y, r[2] + (st > 0 ? r[3] : r[4]) * Math.sign(st) * Math.pow(Math.abs(st), ex)]); }
      P0.push(row);
    }
    for (let j = 0; j < NR; j++) { const row = []; for (let i = 0; i < NS; i++) {
      const a = P0[j][(i + 1) % NS], b = P0[j][(i - 1 + NS) % NS], c = P0[Math.max(0, j - 1)][i], d = P0[Math.min(NR - 1, j + 1)][i];
      let n = v3.norm(v3.cross(v3.sub(a, b), v3.sub(c, d))); const o = v3.sub(P0[j][i], [0, P0[j][i][1], interpRings(Hd.rings, P0[j][i][1])[2]]); if (v3.dot(n, o) < 0) n = v3.mul(n, -1);
      row.push(n); } N0.push(row); }
    G0 = { P: P0, N: N0, NR, NS }; _grid.set(Hd, G0); return G0;
  }
  // regions of the visible head where the light's dot product is below (or above) a threshold: polygons in screen space.
  // Each ring contributes the intervals of its visible arc that are inside; intervals are chained ring to ring by overlap.
  function terminator(Hd, X, Lh, thr, below) {
    const G0 = headGrid(Hd), cam = X.cam, tracks = [];
    let open = [];
    for (let j = 0; j < G0.NR; j++) {
      const P0 = G0.P[j], N0 = G0.N[j], NS = G0.NS;
      const dv = N0.map(n => v3.dot(n, cam)), dl = N0.map(n => v3.dot(n, Lh));
      let st = -1; for (let i = 0; i < NS; i++) if (dv[i] > 0 && dv[(i - 1 + NS) % NS] <= 0) { st = i; break; }
      const allVis = dv.every(v => v > 0);
      const next = [];
      if (st >= 0 || allVis) {
        if (allVis) st = 0;
        const run = []; for (let k = 0; k < NS; k++) { const i = (st + k) % NS; if (!allVis && dv[i] <= 0) break; run.push(i); }
        const edge = (i0, i1) => { const f = clamp(dv[i0] / (dv[i0] - dv[i1] || 1e-6), 0, 1); return { p: v3.lerp(P0[i0], P0[i1], f), l: lerp(dl[i0], dl[i1], f) }; };
        const seq = [];
        if (!allVis) seq.push(edge((run[0] - 1 + NS) % NS, run[0]));
        run.forEach(i => seq.push({ p: P0[i], l: dl[i] }));
        if (!allVis) seq.push(edge(run[run.length - 1], (run[run.length - 1] + 1) % NS));
        const a2 = X.p(seq[0].p), b2 = X.p(seq[seq.length - 1].p); if (a2[0] > b2[0]) seq.reverse();
        const inside = q => below ? q.l < thr : q.l > thr, m = seq.length - 1;
        const at = (k0, k1) => { const f = clamp((thr - seq[k0].l) / ((seq[k1].l - seq[k0].l) || 1e-6), 0, 1); return X.p(v3.lerp(seq[k0].p, seq[k1].p, f)); };
        let k = 0;
        while (k <= m) {
          if (!inside(seq[k])) { k++; continue; }
          const s0 = k; while (k <= m && inside(seq[k])) k++; const s1 = k - 1;
          const A = s0 > 0 ? at(s0 - 1, s0) : X.p(seq[0].p), B = s1 < m ? at(s1, s1 + 1) : X.p(seq[m].p);
          const u0 = Math.max(0, s0 - 0.5) / m, u1 = Math.min(m, s1 + 0.5) / m;
          let tr = open.find(t => !t.used && t.u0 <= u1 + 0.04 && u0 <= t.u1 + 0.04);
          if (tr) tr.used = true; else { tr = { A: [], B: [] }; tracks.push(tr); }
          tr.A.push(A); tr.B.push(B); tr.u0 = u0; tr.u1 = u1; next.push(tr);
        }
      }
      next.forEach(t => { t.used = false; }); open = next;
    }
    return tracks.filter(t => t.A.length > 1).map(t => t.A.concat(t.B.slice().reverse()));
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
  function hairlineFn(table, k, nz) {
    k = k || 1;
    if (nz) { const f = hairlineFn(table, k); return ph => { const d = Math.abs(ph) / D2R; const w = d < 75 ? 1 : d < 95 ? 1 - (d - 75) / 20 : 0; return f(ph) + nz * w * (O.vnoise(ph * 9, 0.5, 13) * 2 - 1 + 0.5 * (O.vnoise(ph * 23, 2.5, 17) * 2 - 1)); }; }
    return ph => { let d = Math.abs(ph) / D2R; if (d > 180) d = 360 - d; let i = 0; while (i < table.length - 2 && table[i + 1][0] < d) i++;
      const a = table[i], b = table[i + 1], t = clamp((d - a[0]) / (b[0] - a[0]), 0, 1); const ss = t * t * (3 - 2 * t); return lerp(a[1], b[1], ss) * k; };
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
  // expressions
  // =====================================================================
  // numbers: lid 0 open..1 closed, squint 0..1 (lower lids up), down 0..1 (eyes lowered), brow -1..1, browIn 0..1 (inner ends up: kind, worried),
  // browKnit 0..1, smile -1..1, open 0..1 (lips apart), tight 0..1, gaze [x, y] -1..1
  const FACES = {
    rest: {}, neutral: {},
    tired: { lid: 0.36, browIn: 0.25, smile: -0.08, gaze: [0, -0.15] },
    squint: { lid: 0.5, squint: 0.85, brow: -0.45, browKnit: 0.45, smile: -0.12, tight: 0.2 },
    smile: { lid: 0.32, squint: 0.4, brow: 0.08, browIn: 0.15, smile: 0.6 },
    concentration: { lid: 0.32, squint: 0.2, brow: -0.25, browKnit: 0.6, smile: -0.04, tight: 0.45, gaze: [0, -0.25] },
    blank: { lid: 0.16, brow: 0.18, smile: 0, open: 0.05, gaze: [0, 0] },
    drained: { lid: 0.44, browIn: 0.6, smile: -0.25, open: 0.1, gaze: [0, -0.3] },
    understanding: { lid: 0.08, brow: 0.3, browIn: 0.7, smile: -0.25, open: 0.3, gaze: [0, -0.6] },
    down: { lid: 0.6, down: 1, browIn: 0.3, smile: -0.08 },
    closed: { lid: 1, browIn: 0.2 }, sleep: { lid: 1, brow: 0.06, open: 0.06, smile: 0.05 },
    laugh: { lid: 0.82, squint: 0.95, brow: 0.25, smile: 1, open: 0.55 },
    warm: { lid: 0.2, squint: 0.3, brow: 0.12, smile: 0.42 },
    past: { lid: 0.06, brow: 0.32, browIn: 0.3, smile: 0, open: 0.07, gaze: [0.85, 0.05] },
    solemn: { lid: 0.5, brow: -0.12, smile: -0.06, tight: 0.35 },
    sleepy: { lid: 0.55, browIn: 0.1, smile: 0 },
    pout: { lid: 0.45, brow: -0.15, browKnit: 0.3, smile: -0.3, tight: 0.5 },
  };
  const EYES = { open: {}, half: { lid: 0.62 }, closed: { lid: 1 }, squint: { lid: 0.52, squint: 0.85 }, down: { lid: 0.6, down: 1 }, wide: { lid: 0.0 } };
  const MOUTHS = { neutral: { smile: 0, open: 0, tight: 0 }, smile: { smile: 0.6 }, tight: { tight: 0.65, smile: -0.12 }, open: { open: 0.4 } };
  function exprOf(ch, p) {
    const e = { lid: ch.lidRest, squint: 0, down: 0, brow: 0, browIn: ch.kind * 0.25, browKnit: 0, smile: 0, open: 0, tight: 0, gaze: [0, 0] };
    const f = FACES[p.face]; if (f) Object.assign(e, f);
    if (p.eyes && EYES[p.eyes]) Object.assign(e, EYES[p.eyes]); if (p.eyes === 'open' && !f) e.lid = ch.lidRest;
    if (p.mouth && MOUTHS[p.mouth]) Object.assign(e, MOUTHS[p.mouth]);
    ['lid', 'squint', 'down', 'brow', 'browIn', 'browKnit', 'smile', 'open', 'tight'].forEach(k => { if (typeof p[k] === 'number') e[k] = p[k]; });
    if (p.gaze) e.gaze = p.gaze; else if (p.look && (p.look[0] || p.look[1])) e.gaze = p.look;
    e.lid = clamp(e.lid, 0, 1); return e;
  }

  // =====================================================================
  // the renderer's state for one figure
  // =====================================================================
  function makeR(ch, p, opts, V) {
    const L0 = opts.light || {};
    const L = { x: L0.x != null ? L0.x : V.ax - 2600, y: L0.y != null ? L0.y : V.ay - V.s * ch.H - 1800, color: L0.color || P_RIM, back: L0.back != null ? L0.back : 0.3 };
    const c2 = [V.ax, V.ay - V.s * ch.H * 0.6], d2 = lightDir2(L, c2), lz = lerp(0.72, -0.9, L.back), lxy = Math.sqrt(1 - lz * lz);
    const lw = [d2[0] * lxy, -d2[1] * lxy, lz];
    const Lb = V.toBody(lw);
    const gc = new Map(), amb = opts.ambient, ak = opts.ambientK || 0, ex = opts.exposure == null ? 1 : opts.exposure;
    const grade = h => { let c = gc.get(h); if (c) return c; c = h; if (amb && ak) c = mixc(c, amb, ak); if (ex !== 1) c = mulc(c, ex); gc.set(h, c); return c; };
    const rimPx = opts.rimW != null ? opts.rimW : clamp(V.s * 0.0042, 1.1, 4.5) * (opts.rimK || 1);
    return { L, Lb, lw, grade, rimPx, rimCol: c => grade(c ? mixc(L.color, c, 0.4) : L.color), hi: 0.42, lo: -0.08, flat: !!opts.flat, opts, V, detail: opts.detail == null ? 1 : opts.detail };
  }

  // =====================================================================
  // props (what a hand carries), small: drawn with the figure
  // =====================================================================
  // a box: centre, axes (unit) u, v, w with half sizes; faces culled and filled with three values by the light
  function box3(g, R, V, c, ax, hs, cols, opt) {
    opt = opt || {}; const corners = [];
    for (let i = 0; i < 8; i++) { const sx = i & 1 ? 1 : -1, sy = i & 2 ? 1 : -1, sz = i & 4 ? 1 : -1; corners.push(V.p(v3.add(c, v3.add(v3.mul(ax[0], sx * hs[0]), v3.add(v3.mul(ax[1], sy * hs[1]), v3.mul(ax[2], sz * hs[2])))))); }
    const faces = [[0, 1, 3, 2, ax[2], -1], [4, 5, 7, 6, ax[2], 1], [0, 1, 5, 4, ax[1], -1], [2, 3, 7, 6, ax[1], 1], [0, 2, 6, 4, ax[0], -1], [1, 3, 7, 5, ax[0], 1]];
    const out = [];
    faces.forEach(f => { const n = v3.mul(f[4], f[5]); const d = v3.dot(n, V.cam); if (d <= 0.001) return; const pts = [corners[f[0]], corners[f[1]], corners[f[2]], corners[f[3]]]; const b = band3(R, n);
      const col = (opt.faceCol && opt.faceCol(n, f)) || cols[b]; g.fillStyle = R.grade(col); g.fill(opt.round ? LC.rquad(pts, opt.round) : polyPath(pts)); out.push({ pts, n }); });
    return out;
  }
  function drawProp(g, R, V, kind, hand, s) {
    // hand: {c (palm centre, body space), ax (finger direction), n (palm normal), lat}
    const c = hand.c, A = hand.ax, N = hand.n, Lt = hand.lat;
    if (kind === 'phone') {
      const pc = v3.add(c, v3.mul(N, 0.012));
      box3(g, R, V, pc, [Lt, A, N], [0.036, 0.075, 0.004], ['#3A4042', '#202426', '#0E1011'], { round: 0.006 * s, faceCol: (n) => v3.dot(n, N) > 0.5 && hand.lit ? '#DCE8E4' : null });
    } else if (kind === 'remote') {
      box3(g, R, V, v3.add(c, v3.mul(N, 0.01)), [Lt, A, N], [0.016, 0.03, 0.007], ['#3A3E40', '#1E2123', '#0C0D0E'], { round: 0.004 * s });
    } else if (kind === 'reports') {
      const pc = v3.add(c, v3.add(v3.mul(N, 0.03), v3.mul(A, 0.02)));
      box3(g, R, V, pc, [Lt, [0, 1, 0], v3.norm(v3.cross(Lt, [0, 1, 0]))], [0.11, 0.15, 0.03], ['#F1EEE6', '#D9D5CB', '#A6A296']);
    } else if (kind === 'bag') {
      const top = v3.add(c, [0, -0.05, 0]);
      const bc = v3.add(top, [0, -0.17, 0]);
      const fw = v3.norm([V.sa, 0, V.ca]);
      box3(g, R, V, bc, [v3.norm(v3.cross([0, 1, 0], fw)), [0, 1, 0], fw], [0.2, 0.15, 0.06], ['#6B4426', '#43291A', '#24160D'], { round: 0.02 * s });
      const a = V.p(v3.add(top, [-0.06, -0.02, 0])), b = V.p(v3.add(top, [0.06, -0.02, 0])), h = V.p(top);
      g.strokeStyle = R.grade('#2A190E'); g.lineWidth = Math.max(1.5, 0.014 * s); g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(h[0], h[1] - 0.05 * s, b[0], b[1]); g.stroke();
    } else if (kind === 'mug' || kind === 'coffee') {
      const mc = v3.add(c, v3.add(v3.mul(N, 0.03), [0, 0.02, 0])); const r = 0.037, hh = 0.075;
      const top = V.p(v3.add(mc, [0, hh, 0])), bot = V.p(v3.add(mc, [0, -hh, 0])), rx = r * s, ry = r * s * 0.32;
      const body = new Path2D(); body.moveTo(top[0] - rx, top[1]); body.lineTo(bot[0] - rx * 0.93, bot[1]); body.ellipse(bot[0], bot[1], rx * 0.93, ry, 0, Math.PI, 0, true); body.lineTo(top[0] + rx, top[1]); body.closePath();
      paintPart(g, R, { path: body, cols: tri('#9AA6A6', '#5E6A6B', '#2E3637'), c2: [top[0], (top[1] + bot[1]) / 2], w: rx * 2 });
      g.fillStyle = R.grade('#1C2122'); g.beginPath(); g.ellipse(top[0], top[1], rx, ry, 0, 0, TAU); g.fill();
      g.fillStyle = R.grade('#3A4344'); g.beginPath(); g.ellipse(top[0], top[1] - ry * 0.3, rx * 0.86, ry * 0.8, 0, 0, TAU); g.fill();
    } else if (kind === 'keys') {
      const k0 = V.p(v3.add(c, v3.mul(A, 0.06))); const r = 0.012 * s;
      g.strokeStyle = R.grade('#B9B7AE'); g.lineWidth = Math.max(1, 0.003 * s); g.beginPath(); g.arc(k0[0], k0[1] + r, r, 0, TAU); g.stroke();
      [[-0.2, 0.05], [0.15, 0.06], [0.4, 0.045]].forEach(([a, l], i) => { g.save(); g.translate(k0[0], k0[1] + r * 2); g.rotate(a); g.fillStyle = R.grade(i === 2 ? '#2A2D30' : '#C9C6BA'); g.fill(LC.rrect(-0.006 * s, 0, 0.012 * s, l * s, 0.003 * s)); g.restore(); });
    } else if (kind === 'knife') {
      const a = V.p(c), b = V.p(v3.add(c, v3.mul(A, 0.17)));
      g.strokeStyle = R.grade('#D2D4CF'); g.lineWidth = Math.max(1.2, 0.012 * s); g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    } else if (kind === 'toast') {
      const pc = v3.add(c, v3.add(v3.mul(N, 0.01), v3.mul(A, 0.05)));
      box3(g, R, V, pc, [Lt, A, N], [0.05, 0.05, 0.006], ['#E2B57A', '#C38E4F', '#7E5530'], { round: 0.012 * s });
    } else if (kind === 'rabbit') {
      drawRabbit(g, R, V, v3.add(c, v3.add(v3.mul(N, 0.04), [0, 0.03, 0])), s, hand.sd);
    }
  }
  // Emily's rabbit: oatmeal felt, button eyes, a stitched nose; one ear up, the worn one lying almost flat
  function drawRabbit(g, R, V, c, s, sd, big) {
    const o = V.p(c), k = s * (big || 1);
    const S = (pts, col) => { g.fillStyle = R.grade(col); g.fill(LC.smooth(pts.map(q => [o[0] + q[0] * k, o[1] - q[1] * k]))); };
    const m = MAT.rabbit, w = MAT.rabbitWorn;
    S([[-0.045, -0.07], [-0.05, -0.02], [-0.035, 0.02], [0.035, 0.02], [0.05, -0.02], [0.045, -0.07], [0, -0.078]], m[1]);   // body
    S([[-0.02, -0.075], [-0.04, -0.06], [-0.045, -0.03], [-0.03, -0.02]], m[2]);
    S([[-0.04, 0.02], [-0.042, 0.055], [-0.025, 0.075], [0.025, 0.075], [0.042, 0.055], [0.04, 0.02], [0, 0.008]], m[1]);    // head
    S([[-0.03, 0.06], [-0.034, 0.10], [-0.03, 0.14], [-0.018, 0.15], [-0.012, 0.11], [-0.014, 0.07]], m[1]);                // the upright ear
    S([[-0.026, 0.075], [-0.028, 0.11], [-0.022, 0.135], [-0.018, 0.105], [-0.019, 0.08]], '#E3C8AE');
    S([[0.012, 0.068], [0.04, 0.074], [0.07, 0.07], [0.09, 0.058], [0.07, 0.054], [0.04, 0.058], [0.016, 0.06]], w[1]);       // the worn ear, flat
    g.fillStyle = R.grade('#120E0B'); [[-0.015, 0.045], [0.014, 0.045]].forEach(q => { g.beginPath(); g.arc(o[0] + q[0] * k, o[1] - q[1] * k, Math.max(0.8, 0.0045 * k), 0, TAU); g.fill(); });
    if (k > 600) { g.strokeStyle = R.grade('#3E332A'); g.lineWidth = Math.max(0.8, 0.002 * k); g.beginPath(); g.moveTo(o[0] - 0.004 * k, o[1] - 0.034 * k); g.lineTo(o[0], o[1] - 0.03 * k); g.lineTo(o[0] + 0.004 * k, o[1] - 0.034 * k); g.moveTo(o[0], o[1] - 0.03 * k); g.lineTo(o[0], o[1] - 0.024 * k); g.stroke(); }
  }

  // =====================================================================
  // hands at figure scale: a mitten with a thumb, curled by the grip
  // =====================================================================
  function handFrame(sk, arm, ch, p) {
    const sg = arm.sd === 'R' ? 1 : -1, Fc = sk.Fc, dir = arm.dir;
    const inward = M.ap(Fc, [-sg, 0, 0]), up = [0, 1, 0], fwd = M.ap(Fc, [0, 0, 1]);
    let n;
    if (arm.palm === 'up') n = v3.norm(v3.add(v3.mul(up, 0.8), v3.mul(inward, 0.4)));
    else if (arm.palm === 'down') n = [0, -1, 0];
    else if (arm.palm === 'back') n = v3.mul(fwd, -1);
    else if (arm.palm === 'fwd') n = fwd;
    else n = inward;
    n = v3.norm(v3.sub(n, v3.mul(dir, v3.dot(n, dir)))); if (v3.len(n) < 0.1) n = v3.norm(v3.cross(dir, [0, 0, 1]));
    const lat = v3.norm(v3.cross(n, dir));
    return { ax: dir, n, lat, sg };
  }
  function capsulePath(V, pts, rads) {
    const P = new Path2D(), Q = pts.map(q => V.p(q));
    for (let i = 0; i < Q.length - 1; i++) P.addPath(O.S().capsule(Q[i][0], Q[i][1], rads[i] * V.s, Q[i + 1][0], Q[i + 1][1], rads[i + 1] * V.s).path(0));
    return { path: P, Q, depth: pts.reduce((a, q) => a + V.d(q), 0) / pts.length };
  }
  // a hand: palm, four fingers curled by the grip (or a mitten when small), a thumb. Returns paintable pieces in draw order.
  function handParts(sk, V, ch, p, arm, R, out, hold) {
    const B = ch.body, hf = handFrame(sk, arm, ch, p), W = arm.wr, Lh = B.hand, k = Lh / 0.19;
    const grip = hold ? 1 : arm.grip || 0, curl = clamp(0.28 + 0.62 * grip + (arm.curl || 0), 0, 1.25);
    const A = hf.ax, N = hf.n, Lt = hf.lat, tdir = v3.mul(Lt, hf.sg);
    const px = Lh * V.s, hw = 0.042 * k, th = 0.0135 * k;
    const k0 = v3.add(W, v3.mul(A, Lh * 0.47));
    const palmC = v3.add(W, v3.add(v3.mul(A, Lh * 0.4), v3.mul(N, th)));
    out.hand = { c: palmC, ax: A, n: N, lat: Lt, sd: arm.sd, lit: p.phoneLit };
    const camB = V.cam, palmFacing = v3.dot(N, camB) > 0, thumbFront = v3.dot(tdir, camB) > -0.1;
    const pieces = [];
    if (px < 34) {
      const axC = v3.norm(v3.add(A, v3.mul(N, curl * 0.9))), tip = v3.add(k0, v3.mul(axC, Lh * 0.5 * (1 - curl * 0.42)));
      const lf = loft(V, [{ c: v3.add(W, v3.mul(A, -0.005)), a: Lt, b: N, w: hw * 0.62, f: th * 0.9, k: th * 0.9 }, { c: v3.add(W, v3.mul(A, Lh * 0.22)), a: Lt, b: N, w: hw * 0.92, f: th, k: th },
        { c: k0, a: Lt, b: N, w: hw, f: th * 0.85, k: th * 0.9 }, { c: v3.lerp(k0, tip, 0.55), a: Lt, b: N, w: hw * 0.9, f: th * 0.75, k: th * 0.8 }, { c: tip, a: Lt, b: N, w: hw * 0.68, f: th * 0.6, k: th * 0.6 }]);
      const t0 = v3.add(W, v3.add(v3.mul(A, Lh * 0.12), v3.mul(tdir, hw * 0.5))), t1 = v3.add(W, v3.add(v3.mul(A, Lh * 0.42), v3.add(v3.mul(tdir, hw * (1.05 - grip * 0.25)), v3.mul(N, Lh * (0.06 + grip * 0.08)))));
      const tf = capsulePath(V, [t0, t1], [0.011 * k, 0.008 * k]);
      const u = new Path2D(); u.addPath(lf.path); u.addPath(tf.path);
      pieces.push({ path: u, c2: lf.c2, w: lf.wpx, bb: lf.bb });
      return { pieces, depth: lf.depth, frame: out.hand };
    }
    const palm = loft(V, [{ c: v3.add(W, v3.mul(A, -0.01 * k)), a: Lt, b: N, w: hw * 0.6, f: th * 0.95, k: th * 0.95 }, { c: v3.add(W, v3.mul(A, Lh * 0.2)), a: Lt, b: N, w: hw * 0.92, f: th * 1.05, k: th },
      { c: k0, a: Lt, b: N, w: hw, f: th * 0.85, k: th * 0.9 }], { cap1k: 0.45 });
    const fingers = [];
    const fl = [0.92, 1.0, 0.95, 0.76], fo = [0.74, 0.25, -0.24, -0.72], spread = arm.spread || 0;
    for (let i = 0; i < 4; i++) {
      const base = v3.add(k0, v3.add(v3.mul(tdir, fo[i] * hw * 0.9), v3.mul(A, (i === 1 ? 0.004 : i === 3 ? -0.008 : 0) * k)));
      const L0 = [0.046, 0.028, 0.021].map(l => l * k * fl[i]), cu = curl * (1 + (i - 1.5) * 0.06), sp = (fo[i] * 0.09 + spread * fo[i] * 0.25);
      const ang = [cu * 0.82, cu * 1.25, cu * 0.78];
      let d = v3.norm(v3.add(A, v3.mul(tdir, sp))), q = base; const pts = [q];
      let acc = 0; for (let j = 0; j < 3; j++) { acc += ang[j]; const dj = v3.norm(v3.add(v3.mul(d, Math.cos(acc)), v3.mul(N, Math.sin(acc)))); q = v3.add(q, v3.mul(dj, L0[j])); pts.push(q); }
      const r0 = 0.0088 * k * (i === 3 ? 0.86 : 1);
      fingers.push(capsulePath(V, pts, [r0, r0 * 0.92, r0 * 0.84, r0 * 0.74]));
    }
    const t0 = v3.add(W, v3.add(v3.mul(A, 0.03 * k), v3.mul(tdir, hw * 0.45)));
    const td = v3.norm(v3.add(v3.add(v3.mul(A, 0.62), v3.mul(tdir, 0.55)), v3.mul(N, 0.25 + grip * 0.45)));
    const t1 = v3.add(t0, v3.mul(td, 0.045 * k)), td2 = v3.norm(v3.add(v3.mul(td, 1), v3.mul(N, 0.25 + grip * 0.6))), t2 = v3.add(t1, v3.mul(td2, 0.032 * k));
    const thumb = capsulePath(V, [t0, t1, t2], [0.0125 * k, 0.0098 * k, 0.0082 * k]);
    // order: what is turned from us first
    const fOrder = fingers.slice().sort((a2, b2) => a2.depth - b2.depth);
    if (!thumbFront) pieces.push({ path: thumb.path, c2: thumb.Q[1], w: 0.02 * k * V.s });
    if (!palmFacing) fOrder.forEach(f => pieces.push({ path: f.path, c2: f.Q[1], w: 0.018 * k * V.s, sk: 0.8 }));
    pieces.push({ path: palm.path, c2: palm.c2, w: palm.wpx, bb: palm.bb });
    if (palmFacing) fOrder.forEach(f => pieces.push({ path: f.path, c2: f.Q[1], w: 0.018 * k * V.s, sk: 0.8 }));
    if (thumbFront) pieces.push({ path: thumb.path, c2: thumb.Q[1], w: 0.02 * k * V.s });
    return { pieces, depth: palm.depth, frame: out.hand };
  }

  // =====================================================================
  // building a figure: parts in draw order
  // =====================================================================
  function torsoSecs(sk, B, uFrom, uTo, pad, profile) {
    const prof = profile || B.torso, secs = [];
    const rows = prof.filter(r => r[0] >= uFrom - 1e-6 && r[0] <= uTo + 1e-6);
    const at = u => { // interpolate the profile at u
      let i = 0; while (i < prof.length - 2 && prof[i + 1][0] < u) i++; const a = prof[i], b = prof[i + 1], t = clamp((u - a[0]) / (b[0] - a[0]), 0, 1); return [u, lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)]; };
    const us = [uFrom].concat(rows.map(r => r[0]).filter(u => u > uFrom + 0.01 && u < uTo - 0.01)).concat([uTo]);
    us.forEach(u => { const r = at(u), F = sk.frameAt(clamp(u, 0, 1)), c = sk.spineAt(Math.max(u, 0)); if (u < 0) { const d = M.ap(sk.frameAt(0), [0, u * B.spine, 0]); c[0] += d[0]; c[1] += d[1]; c[2] += d[2]; }
      const pp = typeof pad === 'function' ? pad(u) : pad;
      secs.push({ c, a: M.ap(F, [1, 0, 0]), b: M.ap(F, [0, 0, 1]), w: r[1] + pp[0], f: r[2] + pp[1], k: r[3] + pp[2], u }); });
    return secs;
  }
  // a horizontal band around the torso between u0 and u1, front half only (belts, hems, lapels): polygon in screen space
  function torsoBand(sk, B, V, u0, u1, pad, x0, x1) {
    const ring = (u, side) => { const s = torsoSecs(sk, B, u, u + 0.001, pad)[0]; const pts = []; const N = 18;
      for (let i = 0; i <= N; i++) { const t = (x0 == null ? 0 : x0) + ((x1 == null ? 1 : x1) - (x0 == null ? 0 : x0)) * i / N; const ang = Math.PI * t; const la = -Math.cos(ang) * s.w, an = Math.sin(ang) * s.f; pts.push(V.p([s.c[0] + s.a[0] * la + s.b[0] * an, s.c[1] + s.a[1] * la + s.b[1] * an, s.c[2] + s.a[2] * la + s.b[2] * an])); }
      return pts; };
    const a = ring(u1), b = ring(u0).reverse(); return a.concat(b);
  }
  // a point on the torso's front surface at (u, lateral fraction -1..1)
  function torsoFront(sk, B, u, lat, pad, out) {
    const s = torsoSecs(sk, B, u, u + 0.001, pad || [0, 0, 0])[0]; const ang = Math.acos(clamp(lat, -1, 1)); const la = Math.cos(ang) * s.w, an = Math.sin(ang) * s.f + (out || 0);
    return [s.c[0] + s.a[0] * la + s.b[0] * an, s.c[1] + s.a[1] * la + s.b[1] * an, s.c[2] + s.a[2] * la + s.b[2] * an];
  }

  function buildFigure(ch, p, opts) {
    const V = makeView(p.at, p.scale, p._yaw, (p.pitch || 0) * D2R);
    const sk = solveBody(ch, p, V); sk.V = V;
    const R = makeR(ch, p, opts, V);
    const B = ch.body, s = V.s, of = Object.assign({}, ch.outfits[p.outfit] || ch.outfits[ch.outfit]);
    const parts = [], push = (q) => { parts.push(q); return q; };
    const skin = ch.skin, camB = V.cam;
    const frontVis = v3.dot(M.ap(sk.Fc, [0, 0, 1]), camB);       // > 0: we see the chest
    const torsoD = V.d(sk.spineAt(0.5));
    const holdOf = sd => p['hold' + sd] || (p.hold && typeof p.hold === 'object' ? p.hold[sd.toLowerCase()] || p.hold[sd] : (sd === 'R' ? p.hold : null)) || null;
    const lod = s * (ch.head.top - ch.head.chin);   // head height in px
    R.lod = lod;
    // ---------- legs and feet ----------
    const legCol = of.legs === 'bare' ? skin : of.trousers;
    const legL = {}, bust = p.body === 'bust';
    if (!bust) ['R', 'L'].forEach(sd => {
      const lg = sk.leg[sd], ft = sk.foot[sd], sg = sd === 'R' ? 1 : -1;
      const hint = M.ap(sk.Fp, [0, 0, 1]);
      const knHint = v3.norm(v3.sub(v3.lerp(lg.hip, lg.ankle, 0.5), lg.knee)); const kn = v3.mul(knHint, -1);
      const loose = of.legs === 'trousers' ? [0.016, 0.016, 0.014] : of.legs === 'pyjama' ? [0.03, 0.028, 0.026] : [0.003, 0.003, 0.003];
      const thS = boneSecs(lg.hip, lg.knee, B.thP, hint, loose);
      const shProf = of.legs === 'trousers' || of.legs === 'pyjama' ? B.shP.map(r => [r[0], Math.max(r[1], B.shP[0][1] * 0.98) + loose[0] * 0.6, Math.max(r[2], B.shP[0][1] * 0.95) + loose[1] * 0.5, Math.max(r[3], B.shP[0][1] * 0.95) + loose[2] * 0.5]) : B.shP.map(r => [r[0], r[1] + loose[0], r[2] + loose[1], r[3] + loose[2]]);
      const hemDown = of.legs === 'pyjama' || of.legs === 'trousers' ? 0.035 : 0;
      const ankleLow = v3.add(lg.ankle, [0, -hemDown, 0]);
      const shS = boneSecs(lg.knee, ankleLow, shProf, kn.map((v, i) => v * 0 + (i === 2 ? 1 : 0)));
      const a = loft(V, thS, { cap0k: 0.6 }), b = loft(V, shS, { cap1: of.legs === 'trousers' || of.legs === 'pyjama' ? false : true });
      const path = new Path2D(); path.addPath(a.path); path.addPath(b.path);
      const depth = (a.depth + b.depth) / 2;
      const ub = boxUnion(a, b);
      legL[sd] = { path, depth, c2: [(a.c2[0] + b.c2[0]) / 2, (a.c2[1] + b.c2[1]) / 2], w: (a.wpx + b.wpx) / 2, lg, ft, sg, bb: ub.bb, box: ub.box };
    });
    // ---------- the trousers: one garment (pelvis and legs painted together); in side views the far leg apart, darker ----------
    const top = of.top;
    const lowerPad = of.legs === 'pyjama' ? [0.02, 0.016, 0.016] : [0.012, 0.01, 0.01];
    const lowS = torsoSecs(sk, B, -0.16, top === 'tee' ? 0.1 : 0.2, lowerPad);
    const low = loft(V, lowS, { ns: 20, cap1: false });
    const sideView = Math.abs(V.sa) > 0.35 || (!bust && Math.abs(legL.R.depth - legL.L.depth) > 0.07);
    if (!bust) {
    const farSd = legL.R.depth < legL.L.depth ? 'R' : 'L', nearSd = farSd === 'R' ? 'L' : 'R';
    const legPartOf = {};
    if (sideView) {
      legPartOf[farSd] = push({ key: 'leg' + farSd, z: -0.5, path: legL[farSd].path, cols: legCol, c2: legL[farSd].c2, w: legL[farSd].w, bb: legL[farSd].bb, kind: 'cloth', dark: 0.42 });
      const u = new Path2D(); u.addPath(low.path); u.addPath(legL[nearSd].path);
      legPartOf[nearSd] = push({ key: 'trousers', z: -0.45, path: u, cols: legCol, c2: [(low.c2[0] + legL[nearSd].c2[0]) / 2, (low.c2[1] + legL[nearSd].c2[1]) / 2], w: legL[nearSd].w * 1.1, bb: boxUnion(low, legL[nearSd]).bb, kind: 'cloth' });
    } else {
      const u = new Path2D(); u.addPath(low.path); u.addPath(legL.R.path); u.addPath(legL.L.path);
      legPartOf.R = legPartOf.L = push({ key: 'trousers', z: -0.45, path: u, cols: legCol, c2: low.c2, w: (legL.R.w + legL.L.w) / 2 * 1.1, bb: boxUnion(low, legL.R, legL.L).bb, kind: 'cloth' });
    }
    const lowPart = legPartOf[nearSd];
    if (R.lod > 120 || of.legs === 'pyjama') lowPart.post = (g2) => { if (of.legs === 'pyjama' && R.lod > 30) ['R', 'L'].forEach(sd => pyjamaStripes(g2, R, V, legL[sd], of, s, legPartOf[sd])); if (R.lod > 120) ['R', 'L'].forEach(sd => trouserFolds(g2, R, V, legL[sd].lg, of, s, sd)); };
    ['R', 'L'].forEach(sd => {
      const L2 = legL[sd], lp = legPartOf[sd];
      const fp = footPath(V, L2.ft, B, of, L2.sg);
      push({ key: 'foot' + sd, z: lp.z - 0.002, path: fp.path, cols: fp.cols, c2: fp.c2, w: fp.w, kind: 'cloth', dark: lp.dark || 0 });
      if (of.feet === 'socks') { const sp = sockPart(V, L2.lg, L2.ft, B, sd, of, push, 0, s); sp.z = lp.z + 0.001; sp.dark = lp.dark || 0; }
    });
    }
    let topCols = of.shirt || of.tee || of.cardigan || of.blazer || of.blouse || of.coat || MAT.shirt;
    const topFrom = top === 'tee' ? -0.06 : top === 'cardigan' ? -0.1 : top === 'blazer' ? -0.13 : top === 'coat' ? -0.2 : 0.1;
    const shirtPad = top === 'shirt' ? (u => [0.014 + (u < 0.3 ? 0.006 : 0), 0.012, 0.014]) : top === 'tee' ? (u => [0.012, 0.012, 0.012]) : top === 'cardigan' ? (u => [0.016, 0.016, 0.016]) : top === 'blazer' || top === 'coat' ? (u => [0.02 + (u < 0.1 ? 0.012 : 0), 0.02, 0.018]) : (u => [0.012, 0.012, 0.012]);
    const upS = torsoSecs(sk, B, bust ? Math.max(topFrom, 0.22) : topFrom, 1.0, shirtPad);
    const up = loft(V, upS, { ns: 24, cap0: false, cap1: false });
    const torso = push({ key: 'torso', z: 0, path: up.path, cols: topCols, c2: up.c2, w: up.wpx * 0.8, bb: up.bb, kind: 'cloth', lk: 0.9, sk: 0.9 });
    torso.post = (g2) => torsoDetails(g2, R, ch, p, sk, V, of, frontVis, up);
    // coat skirt (Priya's evening coat)
    if (top === 'coat') {
      const hips = torsoSecs(sk, B, -0.2, -0.2, [0.03, 0.03, 0.03])[0];
      const kneeY = (sk.leg.R.knee[1] + sk.leg.L.knee[1]) / 2 - 0.04;
      const F = sk.Fp, cc = v3.add(hips.c, M.ap(F, [0, kneeY - hips.c[1], 0.02]));
      const sk2 = [hips, { c: v3.lerp(hips.c, cc, 0.5), a: hips.a, b: hips.b, w: hips.w * 1.08, f: hips.f * 1.15, k: hips.k * 1.12 }, { c: cc, a: hips.a, b: hips.b, w: hips.w * 1.16, f: hips.f * 1.3, k: hips.k * 1.25 }];
      const cs = loft(V, sk2, { cap0: false, cap1: false });
      push({ key: 'coatskirt', z: -0.15, path: cs.path, cols: of.coat, c2: cs.c2, w: cs.wpx, kind: 'cloth' });
    }
    // ---------- neck, collar, head ----------
    const nb = sk.neckBase, hp = sk.headPivot, nr = B.neckR;
    const nAx = v3.norm(v3.sub(hp, nb)), nF = boneFrame(nAx, M.ap(sk.Fc, [0, 0, 1]));
    const neckSecs = [{ c: v3.add(nb, v3.mul(nAx, -0.02)), a: nF.a, b: nF.b, w: nr[0] * 1.3, f: nr[1] * 1.15, k: nr[2] * 1.2 }, { c: v3.lerp(nb, hp, 0.45), a: nF.a, b: nF.b, w: nr[0], f: nr[1], k: nr[2] }, { c: v3.add(hp, v3.mul(nAx, 0.03)), a: nF.a, b: nF.b, w: nr[0] * 0.96, f: nr[1] * 0.9, k: nr[2] * 1.05 }];
    const nl = loft(V, neckSecs, { cap0: false });
    const neck = push({ key: 'neck', z: 0.01, path: nl.path, cols: skin, c2: nl.c2, w: nl.wpx, kind: 'skin', lk: 0.6 });
    // collars and necklines are drawn with the neck: the back of the collar behind it, the front after
    if (top === 'shirt' || top === 'blouse' || top === 'blazer' || top === 'coat') push({ key: 'collarBack', z: 0.005, custom: (g2) => collar(g2, R, ch, p, sk, V, of, 'back') });
    push({ key: 'collarFront', z: 0.015, custom: (g2) => collar(g2, R, ch, p, sk, V, of, 'front') });
    const headD = V.d(sk.headC);
    const head = push({ key: 'head', z: 0.02, custom: (g2) => drawHead(g2, R, ch, p, sk, V) });
    neck.post = (g2) => neckShadow(g2, R, ch, sk, V, nl);
    // ---------- arms ----------
    ['R', 'L'].forEach(sd => {
      const arm = sk.arm[sd], sg = sd === 'R' ? 1 : -1;
      const hint = M.ap(sk.Fc, [0, 0, 1]);
      const sleeveFull = top === 'shirt' || top === 'blouse' || top === 'cardigan' || top === 'blazer' || top === 'coat';
      const sp = top === 'blazer' || top === 'coat' ? [0.018, 0.018, 0.018] : top === 'cardigan' ? [0.011, 0.011, 0.011] : [0.009, 0.009, 0.009];
      const uaS = boneSecs(arm.sh, arm.el, B.uaP, hint, sleeveFull || top === 'tee' ? sp : [0, 0, 0]);
      const faHint = v3.norm(v3.sub(arm.el, v3.lerp(arm.sh, arm.wr, 0.5)));
      const faS = boneSecs(arm.el, arm.wr, B.faP, v3.mul(faHint, -1), sleeveFull ? sp.map(v => v * 0.85) : [0, 0, 0]);
      const ua = loft(V, uaS, { cap0k: 0.5 }), fa = loft(V, faS);
      const depth = (ua.depth + fa.depth + V.d(arm.wr)) / 3;
      const hold = holdOf(sd);
      const hp2 = handParts(sk, V, ch, p, arm, R, {}, hold);
      const zArm = depth > torsoD + 0.04 ? 0.05 + depth : depth < torsoD - 0.06 ? -0.3 + depth : 0.04 + depth * 0.2;
      const cols = sleeveFull ? topCols : skin;
      const far = depth < torsoD - 0.05;
      const armPath = new Path2D(); armPath.addPath(ua.path); armPath.addPath(fa.path);
      const zz = (V.d(arm.wr) > headD + 0.06 && arm.wr[1] > sk.neckBase[1] - 0.05) ? 0.03 + (V.d(arm.wr) - headD) : zArm;
      const armPart = push({ key: 'arm' + sd, z: zz, path: armPath, cols, c2: [(ua.c2[0] + fa.c2[0]) / 2, (ua.c2[1] + fa.c2[1]) / 2], w: (ua.wpx + fa.wpx) / 2, bb: boxUnion(ua, fa).bb, kind: 'cloth', dark: far ? 0.4 : 0, sd, castOn: !far, lk: 0.55, rim: 0.8 });
      if (top === 'tee') {
        // bare arms under short sleeves
        armPart.cols = skin; armPart.kind = 'skin';
        const sl = loft(V, boneSecs(v3.add(arm.sh, v3.mul(v3.sub(arm.sh, arm.el), 0.02)), v3.lerp(arm.sh, arm.el, 0.48), [[0, B.uaP[0][1] + 0.011, B.uaP[0][2] + 0.011, B.uaP[0][3] + 0.011], [1, B.uaP[1][1] + 0.013, B.uaP[1][2] + 0.012, B.uaP[1][3] + 0.012]], hint), { cap0k: 0.45, cap1: false });
        armPart.sleeve = push({ key: 'sleeve' + sd, z: zz + 0.0005, path: sl.path, cols: of.tee, c2: sl.c2, w: sl.wpx, kind: 'cloth', dark: far ? 0.4 : 0 });
      }
      const handU = new Path2D(); hp2.pieces.forEach(q => handU.addPath(q.path));
      push({ key: 'hand' + sd, z: zz + 0.001, path: handU, kind: 'skin', custom: (g2) => {
        hp2.pieces.forEach(q => paintPart(g2, R, { path: q.path, cols: skin, c2: q.c2, w: q.w, bb: q.bb, dark: far ? 0.35 : 0, lk: 0.6, sk: q.sk, rim: 0.9 }));
        if (hold) drawProp(g2, R, V, hold, hp2.frame, s); if (sleeveFull) cuff(g2, R, V, arm, cols, s, B, far, of); } });
      if (sleeveFull) armPart.post = (g2) => sleeveFolds(g2, R, V, arm, cols, s, far);
    });
    // ---------- the steering wheel (drive), unless the set draws its own ----------
    if (sk.wheel && p.wheel !== false) {
      const W0 = sk.wheel, ring = (r) => { const pts = []; for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; pts.push(V.p(v3.add(W0.c, v3.add(v3.mul(W0.right, Math.sin(a) * r), v3.mul(W0.up, Math.cos(a) * r))))); } return pts; };
      const rim = ring(W0.r);
      const hub = ring(0.05), spokeA = V.p(v3.add(W0.c, v3.mul(W0.right, -W0.r))), spokeB = V.p(v3.add(W0.c, v3.mul(W0.right, W0.r))), spokeC = V.p(v3.add(W0.c, v3.mul(W0.up, -W0.r)));
      const wd = V.d(W0.c);
      push({ key: 'wheel', z: wd > torsoD ? 0.03 : -0.4, custom: (g2) => {
        g2.save(); g2.lineCap = 'round'; g2.strokeStyle = R.grade('#16191A'); g2.lineWidth = Math.max(2, 0.03 * s);
        const c0 = V.p(W0.c); [spokeA, spokeB, spokeC].forEach(q => { g2.beginPath(); g2.moveTo(c0[0], c0[1]); g2.lineTo(q[0], q[1]); g2.stroke(); });
        g2.fillStyle = R.grade('#1E2223'); g2.fill(pathOf(hub));
        const rp = new Path2D(); rim.forEach((q, i) => i ? rp.lineTo(q[0], q[1]) : rp.moveTo(q[0], q[1])); rp.closePath();
        g2.strokeStyle = R.grade('#1C2021'); g2.lineWidth = Math.max(2, 0.033 * s); g2.stroke(rp);
        const v = lightDir2(R.L, c0); g2.translate(-v[0] * 0.006 * s, -v[1] * 0.006 * s); g2.strokeStyle = R.grade('#4A5153'); g2.lineWidth = Math.max(0.8, 0.008 * s); g2.stroke(rp); g2.restore(); } });
    }
    // ---------- order ----------
    parts.sort((a, b) => a.z - b.z);
    return { parts, sk, V, R, p, ch, of };
  }

  function footPath(V, ft, B, of, sg) {
    const L = B.foot, up = [0, 1, 0];
    const ax = v3.norm(v3.sub(ft.toe, ft.heel)), fr = boneFrame(ax, up);
    const bare = of.feet === 'bare', sock = of.feet === 'socks', shoe = !bare && !sock;
    const h = B.ankle, kk = L / 0.27;
    const prof = shoe ? [[0, 0.033, 0.06, 0.012], [0.22, 0.04, 0.078, 0.012], [0.5, 0.045, 0.052, 0.012], [0.78, 0.046, 0.034, 0.012], [1, 0.03, 0.022, 0.012]]
      : [[0, 0.03, 0.05, 0.004], [0.25, 0.035, 0.066, 0.004], [0.55, 0.04, 0.036, 0.004], [0.82, 0.042, 0.022, 0.004], [1, 0.03, 0.012, 0.004]];
    const secs = prof.map(r => ({ c: v3.add(v3.lerp(ft.heel, ft.toe, r[0]), v3.mul(fr.b, 0.0)), a: fr.a, b: fr.b, w: r[1] * kk, f: r[2] * kk, k: r[3] * kk }));
    const lf = loft(V, secs, { cap0k: 0.9, cap1k: 0.7 });
    const cols = shoe ? (of.shoes || MAT.shoes) : sock ? (sg > 0 ? of.sock : of.sockB) : null;
    return { path: lf.path, cols: cols || null, c2: lf.c2, w: lf.wpx, lf, skin: bare };
  }
  function sockPart(V, lg, ft, B, sd, of, push, depth, s) {
    // uneven socks: the right one pulled up the shin, the left slouched round the ankle
    const up = sd === 'R';
    const a = lg.ankle, k = lg.knee, top = v3.lerp(a, k, up ? 0.42 : 0.12);
    const prof = up ? [[0, 0.03, 0.03, 0.03], [1, 0.032, 0.03, 0.034]] : [[0, 0.036, 0.034, 0.036], [0.5, 0.039, 0.037, 0.039], [1, 0.033, 0.032, 0.033]];
    const lf = loft(V, boneSecs(v3.add(a, [0, -0.02, 0]), top, prof, [0, 0, 1]), { cap1: false });
    return push({ key: 'sock' + sd, z: depth - 0.5 + 0.0008, path: lf.path, cols: up ? of.sock : of.sockB, c2: lf.c2, w: lf.wpx, kind: 'cloth',
      post: !up ? (g) => { const pp = lf.L.concat(lf.R.slice().reverse()); if (V.s * 0.03 < 6) return; g.save(); g.clip(lf.path); g.strokeStyle = 'rgba(80,58,20,0.35)'; g.lineWidth = Math.max(1, 0.003 * V.s); for (let i = 1; i < 3; i++) { const q = v3.lerp(a, top, i / 3), c = V.p(q); g.beginPath(); g.ellipse(c[0], c[1], 0.04 * V.s, 0.008 * V.s, 0, 0.2, Math.PI - 0.2); g.stroke(); } g.restore(); } : null });
  }

  // ---------- clothing details ----------
  function torsoDetails(g, R, ch, p, sk, V, of, frontVis, up) {
    const B = ch.body, s = V.s, top = of.top, lod = R.lod;
    const pad = top === 'shirt' ? [0.016, 0.013, 0.014] : [0.012, 0.012, 0.012];
    g.save(); g.clip(up.path);
    // folds: where the shirt gathers at the waist and under the arms (flat shade shapes)
    if (lod > 28 && top !== 'blazer' && top !== 'tee') {
      const sh = R.grade(of[top] ? of[top][2] : MAT.shirt[2]);
      g.fillStyle = rgba(sh, 0.55);
      [[-0.55, 0.16, 0.24], [0.5, 0.15, 0.22], [-0.15, 0.13, 0.18]].forEach(([lat, u0, u1], i) => {
        if (top === 'tee' && i === 2) return;
        const a = V.p(torsoFront(sk, B, u0, lat, pad)), b = V.p(torsoFront(sk, B, u1, lat + 0.12, pad)), c = V.p(torsoFront(sk, B, u0 + 0.01, lat + 0.2, pad));
        g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(b[0], b[1], c[0], c[1]); g.closePath(); g.fill();
      });
    }
    // shirt: placket, buttons, pocket; the tie
    if (top === 'shirt' && frontVis > -0.15) {
      const tieMode = p.tie || of.tieDefault || 'neat';
      if (lod > 40) {
        const pts = []; for (let u = 0.14; u <= 0.93; u += 0.05) pts.push(V.p(torsoFront(sk, B, u, 0.0, pad, 0.001)));
        g.strokeStyle = rgba(R.grade(of.shirt[2]), 0.7); g.lineWidth = Math.max(0.8, 0.0024 * s); g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
      }
      if (lod > 70) {   // the breast pocket on his left
        const q = [[-0.42, 0.62], [-0.78, 0.62], [-0.78, 0.47], [-0.6, 0.45], [-0.42, 0.47]].map(([l, u]) => V.p(torsoFront(sk, B, u, l, pad, 0.002)));
        g.fillStyle = rgba(R.grade(of.shirt[2]), 0.28); g.fill(polyPath(q));
        g.strokeStyle = rgba(R.grade(of.shirt[0]), 0.5); g.lineWidth = Math.max(0.7, 0.0018 * s); g.beginPath(); g.moveTo(q[0][0], q[0][1]); g.lineTo(q[1][0], q[1][1]); g.stroke();
      }
      if (p.tie !== 'none') drawTie(g, R, ch, p, sk, V, of, tieMode, pad);
    }
    if (top === 'cardigan' && frontVis > -0.2) {
      // the top showing between the open fronts of the cardigan, and its buttons
      const L = [], Rr = [];
      for (let u = -0.1; u <= 0.98; u += 0.07) { const op = lerp(0.42, 0.12, clamp(u / 0.9, 0, 1)); L.push(V.p(torsoFront(sk, B, u, -op, [0.016, 0.016, 0.016], 0.001))); Rr.push(V.p(torsoFront(sk, B, u, op, [0.016, 0.016, 0.016], 0.001))); }
      const poly = L.concat(Rr.reverse());
      g.fillStyle = R.grade(of.under[1]); g.fill(pathOf(poly));
      g.fillStyle = rgba(R.grade(of.under[2]), 0.6); const nk = V.p(torsoFront(sk, B, 0.98, 0, [0.016, 0.016, 0.016])); g.beginPath(); g.ellipse(nk[0], nk[1], 0.02 * s, 0.008 * s, 0, 0, TAU); g.fill();
      if (lod > 60) { g.fillStyle = R.grade('#B98F3A'); for (let u = 0.12; u < 0.8; u += 0.17) { const q = V.p(torsoFront(sk, B, u, -0.48, [0.016, 0.016, 0.016], 0.003)); g.beginPath(); g.arc(q[0], q[1], Math.max(0.8, 0.0045 * s), 0, TAU); g.fill(); } }
    }
    if ((top === 'blazer' || top === 'coat') && frontVis > -0.2) {
      const pd = [0.02, 0.02, 0.018];
      const L = [], Rr = [];
      for (let u = 0.35; u <= 0.99; u += 0.04) { const op = lerp(0.04, 0.32, clamp((u - 0.35) / 0.6, 0, 1)); L.push(V.p(torsoFront(sk, B, u, -op, pd, 0.001))); Rr.push(V.p(torsoFront(sk, B, u, op, pd, 0.001))); }
      g.fillStyle = R.grade(of.under[1]); g.fill(pathOf(L.concat(Rr.reverse())));
      // lapels
      const lap = sd => { const q = [[0.04, 0.36], [0.30, 0.97], [0.44, 0.9], [0.46, 0.74], [0.2, 0.52]].map(([l, u]) => V.p(torsoFront(sk, B, u, sd * l, pd, 0.004))); return pathOf(q); };
      g.fillStyle = R.grade(of[top][2]); g.fill(lap(-1)); g.fill(lap(1));
      if (lod > 60) { g.fillStyle = R.grade('#141414'); const q = V.p(torsoFront(sk, B, 0.3, -0.06, pd, 0.004)); g.beginPath(); g.arc(q[0], q[1], Math.max(0.9, 0.005 * s), 0, TAU); g.fill(); }
    }
    if (top === 'blouse' && frontVis > -0.2) {
      const pd = [0.012, 0.012, 0.012];
      const q = [[-0.22, 0.99], [0, 0.82], [0.22, 0.99]].map(([l, u]) => V.p(torsoFront(sk, B, u, l, pd, 0.001)));
      g.fillStyle = R.grade(ch.skin[1]); g.beginPath(); g.moveTo(q[0][0], q[0][1]); g.quadraticCurveTo(q[1][0], q[1][1] + 4, q[2][0], q[2][1]); g.closePath(); g.fill();
    }
    g.restore();
    // the belt over the tuck
    if (top === 'shirt' && of.belt) {
      const band = torsoBand(sk, B, V, 0.125, 0.165, [0.013, 0.011, 0.011]);
      g.fillStyle = R.grade(of.belt[1]); g.fill(polyPath(band));
      if (frontVis > 0.2 && lod > 30) { const q = V.p(torsoFront(sk, B, 0.145, 0, [0.013, 0.011, 0.011], 0.003)); g.fillStyle = R.grade('#8C8A80'); g.fillRect(q[0] - 0.012 * s, q[1] - 0.012 * s, 0.024 * s, 0.024 * s); g.fillStyle = R.grade(of.belt[1]); g.fillRect(q[0] - 0.007 * s, q[1] - 0.007 * s, 0.014 * s, 0.014 * s); }
    }
    if (top === 'tee' && lod > 30) {
      // the pyjama drawstring under the hem is hidden; the hem's own shade line
      const band = torsoBand(sk, B, V, -0.06, -0.045, [0.013, 0.013, 0.013]);
      g.fillStyle = rgba(R.grade(of.tee[2]), 0.6); g.fill(polyPath(band));
    }
  }
  function drawTie(g, R, ch, p, sk, V, of, mode, pad) {
    const B = ch.body, s = V.s, loose = mode === 'loose';
    const k1 = loose ? 0.83 : 0.93;
    const pts = [];
    const tw = u => lerp(0.13, 0.32, clamp((k1 - u) / 0.7, 0, 1));
    for (let u = k1; u >= 0.17; u -= 0.05) pts.push([u, tw(u)]);
    const left = pts.map(([u, w]) => V.p(torsoFront(sk, B, u, -w * (loose ? 1.05 : 1), pad, 0.006))), right = pts.map(([u, w]) => V.p(torsoFront(sk, B, u, w, pad, 0.006)));
    const tipP = V.p(torsoFront(sk, B, 0.13, 0, pad, 0.006));
    const blade = left.concat([tipP]).concat(right.reverse());
    const bp = polyPath(blade);
    paintPart(g, R, { path: bp, cols: of.tie, c2: tipP, w: 0.07 * s, rim: 0.7 });
    if (R.lod > 70) { g.save(); g.clip(bp); g.strokeStyle = rgba(R.grade(of.tie[0]), 0.25); g.lineWidth = Math.max(0.8, 0.003 * s); for (let u = 0.3; u < 0.85; u += 0.1) { const a = V.p(torsoFront(sk, B, u, -0.3, pad, 0.006)), b = V.p(torsoFront(sk, B, u - 0.1, 0.3, pad, 0.006)); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } g.restore(); }
  }
  function tieKnot(g, R, ch, p, sk, V, of) {
    const B = ch.body, s = V.s, loose = (p.tie || of.tieDefault || 'neat') === 'loose';
    // the knot, in the collar's opening
    const nb = sk.neckBase, F = sk.frameAt(1), nr = B.neckR[0], kN = nr / 0.056, rr = nr * 1.18;
    const kc = v3.add(nb, M.ap(F, [loose ? 0.006 * kN : 0, loose ? -0.045 * kN : 0.004 * kN, rr + 0.012 * kN]));
    const kp = (x, y) => V.p(v3.add(kc, M.ap(F, [x * kN, y * kN, 0])));
    const kn = [kp(-0.016, 0.014), kp(0.016, 0.015), kp(0.010, -0.022), kp(-0.010, -0.023)];
    paintPart(g, R, { path: LC.rquad(kn, 0.005 * s), cols: of.tie, c2: kn[0], w: 0.035 * s, rim: 0.8, sk: 0.5 });
  }
  function collar(g, R, ch, p, sk, V, of, which) {
    const B = ch.body, s = V.s, top = of.top, nb = sk.neckBase, F = sk.frameAt(1), nr = B.neckR[0];
    const camB = V.cam;
    const ringPt = (ang, dy, rr) => v3.add(nb, M.ap(F, [Math.sin(ang) * rr * 1.05, dy, Math.cos(ang) * rr]));
    const frontVis = v3.dot(M.ap(F, [0, 0, 1]), camB);
    if (top === 'tee') {
      // crew neck rib: a band round the base of the neck
      if (which !== 'front') return;
      const pts = [], N = 28; const r0 = nr * 1.18, r1 = nr * 1.42;
      for (let i = 0; i <= N; i++) { const a = -Math.PI / 2 + Math.PI * i / N + (frontVis < 0 ? Math.PI : 0); pts.push(V.p(ringPt(a, -0.006, r1))); }
      for (let i = N; i >= 0; i--) { const a = -Math.PI / 2 + Math.PI * i / N + (frontVis < 0 ? Math.PI : 0); pts.push(V.p(ringPt(a, 0.004, r0))); }
      g.fillStyle = R.grade(mixc(of.tee[1], of.tee[2], 0.55)); g.fill(pathOf(pts)); return;
    }
    if (top === 'cardigan') return;
    const cols = top === 'shirt' ? of.shirt : top === 'blouse' ? of.blouse : of.under || of.shirt;
    const mode = p.collar || 'crooked', loose = mode === 'loose' || (p.tie === 'loose' && top === 'shirt');
    const h = 0.034 * (nr / 0.056), rr = nr * 1.18;
    if (which === 'back') {
      // the collar band behind the neck
      const pts = [], N = 24;
      for (let i = 0; i <= N; i++) { const a = Math.PI / 2 + Math.PI * i / N; pts.push(V.p(ringPt(a, h, rr * 1.02))); }
      for (let i = N; i >= 0; i--) { const a = Math.PI / 2 + Math.PI * i / N; pts.push(V.p(ringPt(a, -0.004, rr * 1.12))); }
      paintPart(g, R, { path: pathOf(pts), cols, c2: V.p(nb), w: rr * 2 * s, rim: 0.8, lk: 0.5 });
      return;
    }
    if (top !== 'shirt' && top !== 'blouse') return;
    if (frontVis < -0.35) return;
    // the two wings: from the knot, down and out along the chest; the crooked one lifts its point off the chest
    const kN = nr / 0.056;
    const side = sd => {
      const sg = sd === 'R' ? 1 : -1, crook = mode === 'crooked' && sd === 'L';
      const open = loose ? 0.42 : 0.07;
      const tip = crook ? v3.add(nb, M.ap(F, [sg * 0.058 * kN, -0.024 * kN, rr + 0.034 * kN]))
        : v3.add(nb, M.ap(F, [sg * (loose ? 0.078 : 0.05) * kN, -0.054 * kN, rr * 0.93 + 0.02 * kN]));
      const root = v3.add(nb, M.ap(F, [sg * (loose ? 0.03 : 0.006) * kN, (loose ? -0.03 : -0.014) * kN, rr + 0.006]));
      const wing = [V.p(ringPt(sg * open, h * 0.86, rr + 0.002)), V.p(ringPt(sg * 0.72, h * 0.74, rr * 1.03)), V.p(tip), V.p(root)];
      return { wing, sg, crook };
    };
    if (loose && frontVis > 0) {
      const v0 = V.p(torsoFront(sk, B, 0.985, -0.2, [0.014, 0.012, 0.014], 0.004)), v1 = V.p(torsoFront(sk, B, 0.985, 0.2, [0.014, 0.012, 0.014], 0.004)), v2 = V.p(torsoFront(sk, B, 0.86, 0, [0.014, 0.012, 0.014], 0.004));
      g.fillStyle = R.grade(ch.skin[1]); g.beginPath(); g.moveTo(v0[0], v0[1]); g.lineTo(v1[0], v1[1]); g.lineTo(v2[0], v2[1]); g.closePath(); g.fill();
      g.fillStyle = rgba(R.grade(ch.skin[2]), 0.6); g.beginPath(); g.moveTo(v0[0], v0[1]); g.lineTo(v1[0], v1[1]); g.lineTo((v1[0] + v2[0]) / 2, (v1[1] + v2[1]) / 2 - 0.004 * s); g.closePath(); g.fill();
    }
    ['R', 'L'].forEach(sd => {
      const q = side(sd); const path = LC.rquad(q.wing, 0.0035 * s);
      paintPart(g, R, { path, cols, c2: q.wing[2], w: 0.03 * s, rim: 1, lk: 0.7, sk: q.crook ? 1.1 : 0.6 });
      if (R.lod > 50) { g.save(); g.clip(path); g.strokeStyle = rgba(R.grade(cols[2]), 0.5); g.lineWidth = Math.max(0.7, 0.0016 * s); g.beginPath(); g.moveTo(q.wing[0][0], q.wing[0][1]); g.lineTo(q.wing[3][0], q.wing[3][1]); g.stroke(); g.restore(); }
    });
    if (top === 'shirt' && p.tie !== 'none' && of.tie && frontVis > -0.15) tieKnot(g, R, ch, p, sk, V, of);
  }
  function neckShadow(g, R, ch, sk, V, nl) {
    // the jaw's shadow on the neck: the head's outline pushed down and away from the light
    const Hd = ch.head, X = headXf(sk, V, Hd), s = V.s;
    const chin = X.p([0, Hd.chin + 0.004, 0.03]), jawL = X.p([-0.05, -0.09, 0.0]), jawR = X.p([0.05, -0.09, 0.0]), back = X.p([0, -0.05, -0.07]);
    const v = lightDir2(R.L, nl.c2), dy = 0.022 * s;
    g.save(); g.clip(nl.path); g.fillStyle = R.grade(ch.skin[2]); g.globalAlpha = lerp(0.85, 1, R.L.back);
    g.translate(-v[0] * 0.006 * s, dy * 0.5);
    g.beginPath(); g.moveTo(jawL[0], jawL[1] - dy); g.quadraticCurveTo(chin[0], chin[1] + dy * 0.6, jawR[0], jawR[1] - dy); g.lineTo(back[0] + (jawR[0] - jawL[0]) * 0.3, back[1] - dy * 2); g.lineTo(back[0] - (jawR[0] - jawL[0]) * 0.3, back[1] - dy * 2); g.closePath(); g.fill();
    g.restore();
  }
  function cuff(g, R, V, arm, cols, s, B, far, of) {
    const a = v3.lerp(arm.el, arm.wr, 0.9), b = v3.add(arm.wr, v3.mul(arm.dir, 0.012));
    const lf = loft(V, boneSecs(a, b, [[0, B.faP[3][1] + 0.011, B.faP[3][2] + 0.010, B.faP[3][3] + 0.010], [1, B.faP[3][1] + 0.012, B.faP[3][2] + 0.011, B.faP[3][3] + 0.011]], [0, 1, 0]), { cap0: false, cap1: false });
    paintPart(g, R, { path: lf.path, cols: [cols[1], cols[1], cols[2]], c2: lf.c2, w: lf.wpx, dark: far ? 0.4 : 0, rim: 0.5, lk: 0, sk: 0.8 });
  }
  function sleeveFolds(g, R, V, arm, cols, s, far) {
    if (R.lod < 50) return;
    const e = V.p(arm.el), a = V.p(v3.lerp(arm.sh, arm.el, 0.78)), b = V.p(v3.lerp(arm.el, arm.wr, 0.22));
    g.save(); g.strokeStyle = rgba(R.grade(cols[2]), far ? 0.5 : 0.6); g.lineWidth = Math.max(1, 0.004 * s); g.lineCap = 'round';
    g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(e[0] + (b[0] - a[0]) * 0.1, e[1], b[0], b[1]); g.stroke(); g.restore();
  }
  function pyjamaStripes(g, R, V, L2, of, s, part) {
    const lg = L2.lg; g.save(); g.clip(L2.path); g.strokeStyle = rgba(R.grade(of.trousers[0]), part && part.dark ? 0.12 : 0.22); g.lineWidth = Math.max(0.8, 0.004 * s);
    const ax = v3.sub(lg.ankle, lg.hip), lat = v3.norm(v3.cross(ax, [0, 0, 1]));
    for (let i = -3; i <= 3; i++) { const a = V.p(v3.add(lg.hip, v3.mul(lat, i * 0.024))), m = V.p(v3.add(lg.knee, v3.mul(lat, i * 0.021))), b = V.p(v3.add(lg.ankle, v3.mul(lat, i * 0.022))); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(m[0], m[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    g.restore();
  }
  function trouserFolds(g, R, V, lg, of, s, sd) {
    const k = V.p(lg.knee), a = V.p(v3.lerp(lg.hip, lg.knee, 0.7)), b = V.p(v3.lerp(lg.knee, lg.ankle, 0.25));
    g.save(); g.strokeStyle = rgba(R.grade(of.trousers[2]), 0.55); g.lineWidth = Math.max(1, 0.004 * s); g.lineCap = 'round';
    g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(k[0] + 0.01 * s, k[1], b[0], b[1]); g.stroke();
    if (of.legs === 'trousers' && R.lod > 160) { const c0 = V.p(v3.lerp(lg.hip, lg.knee, 0.2)), c1 = V.p(v3.lerp(lg.knee, lg.ankle, 0.95)); g.strokeStyle = rgba(R.grade(of.trousers[0]), 0.18); g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(k[0], k[1]); g.lineTo(c1[0], c1[1]); g.stroke(); }
    g.restore();
  }

  // =====================================================================
  // the head: skin, planes, features, hair, ears
  // =====================================================================
  function drawHead(g, R, ch, p, sk, V) {
    const Hd = ch.head, X = headXf(sk, V, Hd), s = V.s, pxH = (Hd.top - Hd.chin) * s, lod = pxH * R.detail;
    const camH = X.cam, Lh = M.tap(X.R, R.Lb), skin = ch.skin;
    const out = headOutline(Hd, X, V, pxH);
    const hl = hairlineFn(ch.hairline, ch.hairK, ch.hairNoise);
    const hv = { X, Hd, s, camH, Lh, lod, out, hl };
    const RR = Object.assign({}, R, { Lb: Lh });   // light in head space for the planes
    // ---- back hair (behind the head) and the far ear
    hairBack(g, R, ch, p, hv);
    const ears = ['R', 'L'].map(sd => ({ sd, n: v3.norm([(sd === 'R' ? 1 : -1) * 0.92, 0, 0.38]) })).map(e => Object.assign(e, { vis: v3.dot(e.n, camH) }));
    ears.forEach(e => { if (e.vis < 0.3) drawEar(g, R, RR, ch, hv, e); });
    // ---- skin: mid with the rim, then the light's own shapes: shade where the form turns from it, light where it faces it
    const c2 = out.ctr;
    paintPart(g, R, { path: out.path, cols: skin, c2, w: out.r * 2, lk: 0.0, sk: 0.0, rim: 1.05 });
    if (!R.flat) {
      const v = lightDir2(R.L, c2), rimPx = R.rimPx * 1.05;
      g.save(); g.clip(out.path); g.translate(-v[0] * rimPx, -v[1] * rimPx); g.clip(out.path); g.translate(v[0] * rimPx, v[1] * rimPx);
      const thrS = lerp(-0.04, 0.12, R.L.back), thrL = 0.6;
      if (R.L.back < 0.7) terminator(Hd, X, Lh, thrL, false).forEach(poly => { g.fillStyle = R.grade(skin[0]); g.fill(pathOf(poly)); });
      terminator(Hd, X, Lh, thrS, true).forEach(poly => { g.fillStyle = R.grade(skin[2]); g.fill(pathOf(poly)); });
      g.restore();
    }
    // ---- features
    if (!R.flat && lod > 14) { g.save(); g.clip(out.path); drawFeatures(g, R, RR, ch, p, hv); g.restore(); }
    // ---- hair
    hairFront(g, R, ch, p, hv);
    ears.forEach(e => { if (e.vis >= 0.3) drawEar(g, R, RR, ch, hv, e); });
    return out;
  }
  function drawEar(g, R, RR, ch, hv, e) {
    const { X, Hd, s, lod } = hv, E = Hd.ear, sg = e.sd === 'R' ? 1 : -1;
    const c = [sg * E.x, E.y, E.z], n = e.n.slice(); n[0] = sg * Math.abs(n[0]);
    const vUp = v3.norm([0, 0.966, -0.259]), uF = v3.norm(v3.cross(vUp, n)); const uu = uF[2] < 0 ? v3.mul(uF, -1) : uF;
    const k = E.h / 0.062;
    const mp = (u, v) => X.p(v3.add(c, v3.add(v3.mul(uu, u * k), v3.mul(vUp, v * k))));
    const outer = [[0.006, 0.026], [-0.006, 0.032], [-0.02, 0.031], [-0.029, 0.018], [-0.031, 0.0], [-0.026, -0.016], [-0.016, -0.026], [-0.006, -0.032], [0.003, -0.028], [0.006, -0.016], [0.004, 0.0], [0.008, 0.012]].map(q => mp(q[0], q[1]));
    const path = pathOf(outer), b = band3(RR, n);
    paintPart(g, R, { path, cols: [ch.skin[Math.max(0, b - 1)], ch.skin[b], ch.skin[2]], c2: mp(-0.012, 0), w: E.w * s * Math.max(0.3, Math.abs(v3.dot(n, hv.camH))), lk: 0.15, sk: 0.6, rim: b === 2 ? 0.45 : 0.9 });
    if (lod > 40 && e.vis > 0.15) {
      const inner = [[-0.003, 0.016], [-0.016, 0.022], [-0.022, 0.008], [-0.019, -0.008], [-0.009, -0.014], [-0.002, -0.006]].map(q => mp(q[0], q[1]));
      g.fillStyle = R.grade(ch.skin[2]); g.fill(pathOf(inner));
      if (lod > 90) { const ah = [[-0.006, 0.012], [-0.014, 0.016], [-0.017, 0.004], [-0.012, -0.004], [-0.008, 0.002]].map(q => mp(q[0], q[1])); g.fillStyle = R.grade(ch.skin[1]); g.fill(pathOf(ah)); }
    }
  }
  // ---- eyes, brows, nose, mouth (mapped onto the face surface)
  function drawFeatures(g, R, RR, ch, p, hv) {
    const { X, Hd, s, camH, lod } = hv, ex = exprOf(ch, p), skin = ch.skin, fyk = (Hd.top - Hd.chin) / 0.245;
    const mp = (x, y, dz) => X.p(facePt(Hd, x, y, dz || 0.0006));
    const strip = (fn, n, th) => { const a = [], b = []; for (let i = 0; i <= n; i++) { const t = i / n, q = fn(t); a.push([q[0], q[1] + th(t) / 2]); b.push([q[0], q[1] - th(t) / 2]); } return a.concat(b.reverse()); };
    const fillMapped = (pts, col, sm) => { const sp = pts.map(q => mp(q[0], q[1], q[2])); g.fillStyle = col; g.fill(sm === false ? polyPath(sp) : pathOf(sp)); };
    // ---- the nose: shade side, underside, alae, nostrils
    const ns = Hd.nose, nside = Lh => (Lh[0] > 0 ? -1 : 1);
    const faceVis = v3.dot(faceN(Hd, 0, -0.03 * fyk), camH);
    if (faceVis > -0.12) { const sd = nside(RR.Lb), sideN = v3.norm([sd * 0.78, 0.08, 0.6]);
      const tone = band3(RR, sideN);
      if (tone > 0 && lod > 18) {
        const ridge = ns.slice(0, 6).map(n => X.p([0, n[0], n[1] - 0.0004])), base = ns.slice(0, 6).map(n => X.p([sd * n[2] * 0.98, n[0], n[3] + 0.002]));
        g.fillStyle = R.grade(skin[tone === 2 ? 2 : 2]); g.globalAlpha = tone === 2 ? 1 : 0.55; g.fill(pathOf(ridge.concat(base.reverse()))); g.globalAlpha = 1;
      }
      // the underside of the nose
      const under = [X.p([-Hd.alaW * 0.9, Hd.alaY - 0.002, ns[6][3] + 0.003]), X.p([0, ns[6][0] - 0.001, ns[6][1] - 0.003]), X.p([Hd.alaW * 0.9, Hd.alaY - 0.002, ns[6][3] + 0.003]), X.p([Hd.alaW * 0.55, ns[ns.length - 1][0] + 0.001, ns[ns.length - 1][3]]), X.p([0, ns[ns.length - 1][0], ns[ns.length - 1][1]]), X.p([-Hd.alaW * 0.55, ns[ns.length - 1][0] + 0.001, ns[ns.length - 1][3]])];
      const ut = band3(RR, [0, -0.85, 0.5]);
      g.fillStyle = R.grade(skin[Math.max(1, ut)]); g.globalAlpha = ut === 2 ? 1 : 0.6; g.fill(pathOf(under)); g.globalAlpha = 1;
      if (lod > 34) {
        // alae: the wings of the nose
        [-1, 1].forEach(sg => { const c = [sg * Hd.alaW * 0.82, Hd.alaY + 0.0015, ns[6][3] + 0.004]; const n = v3.norm([sg * 0.7, -0.1, 0.7]); if (v3.dot(n, camH) < -0.2) return;
          const pts = []; for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.15 + 1.25 * i / 10); pts.push(X.p([c[0] + sg * Math.cos(a) * 0.0058 * fyk, c[1] + Math.sin(a) * 0.0052 * fyk, c[2]])); }
          g.strokeStyle = R.grade(skin[2]); g.lineWidth = Math.max(0.8, 0.0016 * s); g.lineCap = 'round'; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); });
        // nostrils
        if (lod > 60) [-1, 1].forEach(sg => { const c = X.p([sg * 0.0068 * fyk, ns[6][0] - 0.0025, ns[6][3] + 0.006]); g.fillStyle = R.grade(mixc(skin[2], '#000000', 0.45)); g.beginPath(); g.ellipse(c[0], c[1], 0.0034 * s, 0.0017 * s, sg * 0.3, 0, TAU); g.fill(); });
        // light on the tip
        const tl = band3(RR, v3.norm([0.0, 0.3, 1]));
        if (tl === 0 && lod > 90) { const c = X.p([0, Hd.noseTip[0] + 0.006, Hd.noseTip[1] - 0.0005]); g.fillStyle = rgba(R.grade(skin[0]), 0.55); g.beginPath(); g.ellipse(c[0], c[1], 0.0032 * s, 0.0042 * s, 0, 0, TAU); g.fill(); }
      }
    }
    // ---- eyes
    ['R', 'L'].forEach(sd => {
      const sg = sd === 'R' ? 1 : -1, E = Hd.eye; const n = faceN(Hd, sg * E.x, E.y);
      const vis = v3.dot(n, camH); if (vis < 0.05) return;
      drawEye(g, R, RR, ch, hv, ex, sg, mp, strip, vis);
    });
    // ---- brows
    ['R', 'L'].forEach(sd => {
      const sg = sd === 'R' ? 1 : -1, Bw = Hd.brow, n = faceN(Hd, sg * Bw.x, Bw.y); if (v3.dot(n, camH) < 0.02) return;
      const len = Bw.len, inner = -0.013 * len / 0.04;
      const fn = t => { const x = inner + t * len; const raise = ex.brow * 0.0045 * fyk + ex.browIn * 0.004 * fyk * Math.pow(1 - t, 2) - ex.browKnit * 0.0035 * fyk * Math.pow(1 - t, 2) * 1.2;
        const arch = 0.0032 * fyk * Math.sin(Math.PI * Math.pow(t, 0.75)) - 0.0035 * fyk * t * t; return [sg * (Bw.x + x - ex.browKnit * 0.003 * (1 - t)), Bw.y + raise + arch]; };
      const th = t => Bw.thick * (1 - 0.7 * Math.pow(t, 1.5)) * (t < 0.06 ? 0.6 + t / 0.06 * 0.4 : 1);
      const pts = strip(fn, 12, th);
      fillMapped(pts.map(q => [q[0], q[1], 0.0012]), R.grade(mixc(ch.brow, skin[2], lod > 60 ? 0.18 : 0.0)));
    });
    // ---- mouth
    if (v3.dot(faceN(Hd, 0, Hd.mouth.y), camH) > 0.04) drawMouth(g, R, RR, ch, hv, ex, mp, strip);
  }
  function drawEye(g, R, RR, ch, hv, ex, sg, mp, strip, vis) {
    const { Hd, s, lod } = hv, E = Hd.eye, w = E.w, h = E.h, skin = ch.skin;
    const lid = clamp(ex.lid + ex.down * 0.0, 0, 1), sq = ex.squint, dn = ex.down;
    const ix = -0.47 * w, ox = 0.53 * w, iy = 0.0004, oy = -E.droop;
    const line = t => iy + (oy - iy) * t;
    const upOpen = t => line(t) + h * 0.6 * Math.sin(Math.PI * Math.pow(t, 0.85));
    const lowY = t => line(t) - h * 0.40 * Math.sin(Math.PI * Math.pow(t, 1.15)) * (1 - 0.72 * sq);
    const closedY = t => line(t) - h * 0.17 * Math.sin(Math.PI * t);
    const lidE = clamp(lid + sq * 0.12, 0, 1);
    const upY = t => { const o = upOpen(t), c = closedY(t); return Math.max(lerp(o, c, lidE), Math.min(lowY(t) + 0.0002, c)); };
    const ex2 = (t, y) => [sg * (E.x + ix + (ox - ix) * t), E.y + y];
    const N = lod > 120 ? 16 : 10;
    const closed = lidE > 0.93;
    const lashTh = t => (0.0009 + 0.0013 * Math.pow(t, 1.2)) * (lod > 70 ? 1 : 1.35);
    const px = w * s;
    if (!closed) {
      const open = []; for (let i = 0; i <= N; i++) { const t = i / N; open.push(ex2(t, upY(t))); } for (let i = N; i >= 0; i--) { const t = i / N; open.push(ex2(t, lowY(t))); }
      const op = pathOf(open.map(q => mp(q[0], q[1], 0)));
      if (px < 7) { g.fillStyle = R.grade(mixc(ch.iris, '#000000', 0.2)); g.fill(op); }
      else {
        g.save(); g.clip(op);
        const scl = ch.sclera; g.fillStyle = R.grade(scl[band3(RR, [sg * 0.2, 0.1, 0.97]) === 0 ? 0 : 1]); g.fill(op);
        // iris and pupil, lowered by the gaze and by downcast eyes
        const gx = clamp(ex.gaze[0], -1, 1) * sg * (sg > 0 ? 1 : 1), gy = clamp(ex.gaze[1], -1, 1);
        const icx = E.x + (ix + ox) / 2 - 0.03 * w + (ex.gaze[0] * -1) * 0.24 * w * 1, icy = E.y + gy * 0.22 * h - dn * 0.34 * h - 0.06 * h;
        const ir = E.iris;
        const circ = (cx, cy, r, n) => { const pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; pts.push(mp(sg * (cx - E.x) + E.x * sg + Math.cos(a) * r * sg, cy + Math.sin(a) * r, 0.0004)); } return polyPath(pts); };
        const icxL = (ix + ox) / 2 - 0.03 * w - sg * ex.gaze[0] * 0.24 * w;
        const cxW = E.x + icxL;
        g.fillStyle = R.grade(ch.iris); g.fill(circ(cxW, icy, ir, 22));
        if (px > 14) { g.fillStyle = R.grade(mixc(ch.iris, '#000000', 0.55)); g.fill(circ(cxW, icy, ir * 0.46, 16)); }
        // the upper lid's shadow on the eyeball
        if (px > 10) { const sh = []; for (let i = 0; i <= N; i++) { const t = i / N; sh.push(ex2(t, upY(t) + 0.0004)); } for (let i = N; i >= 0; i--) { const t = i / N; sh.push(ex2(t, upY(t) - h * (0.2 + 0.1 * (1 - lidE)))); }
          g.fillStyle = rgba(R.grade(mixc(ch.sclera[2], ch.iris, 0.3)), 0.55); g.fill(pathOf(sh.map(q => mp(q[0], q[1], 0.0003)))); }
        // a catchlight toward the light
        if (px > 22 && lidE < 0.75) { const v = lightDir2(R.L, mp(sg * cxW, icy)); const c = mp(sg * cxW, icy + ir * 0.35); g.fillStyle = 'rgba(255,248,236,0.85)'; g.beginPath(); g.arc(c[0] + v[0] * ir * s * 0.35, c[1] + v[1] * ir * s * 0.25, Math.max(0.7, ir * s * 0.17), 0, TAU); g.fill(); }
        g.restore();
      }
    }
    // the lash line (upper lid edge), heavier toward the outer corner
    const lashCol = R.grade(mixc(ch.brow, '#000000', 0.25));
    const lf = t => ex2(t, (closed ? closedY(t) : upY(t)) + lashTh(t) * 0.35);
    g.fillStyle = lashCol; g.fill(pathOf(strip(lf, N, t => lashTh(t) * (t < 0.08 ? 0.5 + t / 0.16 : 1)).map(q => mp(q[0], q[1], 0.0008))));
    if (closed && px > 16) {   // lashes, short, down and out
      g.strokeStyle = lashCol; g.lineWidth = Math.max(0.7, 0.0006 * s); g.lineCap = 'round';
      for (let i = 2; i <= 8; i++) { const t = i / 10, q = ex2(t, closedY(t)), a = mp(q[0], q[1], 0.0008), b = mp(q[0] + sg * 0.0012, q[1] - 0.0022, 0.0008); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    }
    if (px > 9) {
      // the lid crease above, the lower lid below
      const cr = t => ex2(t, upOpen(t) + h * (0.18 + 0.14 * (1 - lidE)) * Math.sin(Math.PI * t) + 0.0006 - lidE * 0.001);
      g.fillStyle = rgba(R.grade(skin[2]), closed ? 0.55 : 0.8); g.fill(pathOf(strip(cr, N, t => 0.00075 * Math.sin(Math.PI * t) + 0.0002).map(q => mp(q[0], q[1], 0.0006))));
      if (!closed) { const lw = t => ex2(t, lowY(t) - 0.0003); g.fillStyle = rgba(R.grade(skin[2]), 0.55); g.fill(pathOf(strip(lw, N, t => 0.0006 * Math.sin(Math.PI * t)).map(q => mp(q[0], q[1], 0.0006)))); }
      // tiredness under the eye
      if (ch.bags && px > 14) { const bg = t => ex2(0.12 + 0.8 * t, lowY(0.12 + 0.8 * t) - 0.0034 - 0.0008 * Math.sin(Math.PI * t)); g.fillStyle = rgba(R.grade(skin[2]), 0.26 * ch.bags); g.fill(pathOf(strip(bg, 10, t => 0.0016 * Math.sin(Math.PI * t)).map(q => mp(q[0], q[1], 0.0005)))); }
      if (sq > 0.3 && px > 16) { // the squint's small creases at the outer corner
        g.strokeStyle = rgba(R.grade(skin[2]), 0.5 * sq); g.lineWidth = Math.max(0.6, 0.0006 * s);
        [[-0.001, 0.0], [-0.003, -0.25]].forEach(([dy, ang]) => { const a = mp(sg * (E.x + ox + 0.002), E.y + dy, 0.0006), b = mp(sg * (E.x + ox + 0.007), E.y + dy - 0.002 + ang * 0.004, 0.0006); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); });
      }
    }
  }
  function drawMouth(g, R, RR, ch, hv, ex, mp, strip) {
    const { Hd, s, lod } = hv, Mo = Hd.mouth, skin = ch.skin, fyk = (Hd.top - Hd.chin) / 0.245;
    const hw = Mo.w / 2 * (1 + 0.1 * ex.smile - 0.06 * ex.tight), y0 = Mo.y;
    const smile = ex.smile, open = ex.open, tight = ex.tight;
    const lineY = x => { const u = x / hw; return y0 + smile * 0.0042 * fyk * Math.pow(Math.abs(u), 2.2) - (smile < 0 ? 0 : 0) + (1 - u * u) * 0.0004 * fyk; };
    const openH = open * 0.012 * fyk;
    const upTop = x => { const u = Math.abs(x / hw); const bow = Math.exp(-Math.pow((u - 0.18) / 0.16, 2)) * 0.0011 * fyk; return lineY(x) + (0.0038 * fyk * (1 - tight * 0.55)) * Math.pow(1 - Math.pow(u, 2.2), 0.7) + bow + openH * 0.15; };
    const loBot = x => { const u = Math.abs(x / hw); return lineY(x) - openH - (0.0056 * fyk * (1 - tight * 0.5)) * Math.pow(1 - Math.pow(u, 2), 0.8); };
    const N = lod > 120 ? 18 : 10, px = Mo.w * s;
    const lipCol = ch.lip;
    if (px < 9) {   // small: a short line, curved by the smile
      const ln = strip(t => { const x = -hw + 2 * hw * t; return [x, lineY(x)]; }, 8, t => 0.0016 * fyk * (1 + open * 2));
      g.fillStyle = R.grade(mixc(lipCol, skin[2], 0.4)); g.fill(pathOf(ln.map(q => mp(q[0], q[1], 0.001)))); return;
    }
    // the shadow under the lower lip
    { const sh = []; for (let i = 0; i <= N; i++) { const x = -hw * 0.6 + 1.2 * hw * i / N; sh.push([x, loBot(x) - 0.0004]); } for (let i = N; i >= 0; i--) { const x = -hw * 0.5 + hw * i / N; sh.push([x, loBot(x) - 0.004 * fyk * Math.sin(Math.PI * i / N) - 0.001]); }
      g.fillStyle = rgba(R.grade(skin[2]), 0.55); g.fill(pathOf(sh.map(q => mp(q[0], q[1], 0.0006)))); }
    // lower lip
    const lo = []; for (let i = 0; i <= N; i++) { const x = -hw + 2 * hw * i / N; lo.push([x, lineY(x) - openH]); } for (let i = N; i >= 0; i--) { const x = -hw + 2 * hw * i / N; lo.push([x, loBot(x)]); }
    const lt = band3(RR, [0, 0.35, 0.94]);
    g.fillStyle = R.grade(mixc(lipCol, skin[lt === 0 ? 0 : 1], 0.42)); g.fill(pathOf(lo.map(q => mp(q[0], q[1], 0.0012))));
    // upper lip (faces down: darker)
    const upP = []; for (let i = 0; i <= N; i++) { const x = -hw + 2 * hw * i / N; upP.push([x, upTop(x)]); } for (let i = N; i >= 0; i--) { const x = -hw + 2 * hw * i / N; upP.push([x, lineY(x) + openH * 0.0]); }
    g.fillStyle = R.grade(mixc(lipCol, skin[2], 0.3)); g.fill(pathOf(upP.map(q => mp(q[0], q[1], 0.0014))));
    // the mouth's opening (laughing, a breath caught)
    if (openH > 0.0006) {
      const op = []; for (let i = 0; i <= N; i++) { const x = -hw * 0.92 + 1.84 * hw * i / N; op.push([x, lineY(x) + 0.0002]); } for (let i = N; i >= 0; i--) { const x = -hw * 0.92 + 1.84 * hw * i / N; op.push([x, lineY(x) - openH * Math.pow(Math.sin(Math.PI * i / N), 0.7)]); }
      const opp = pathOf(op.map(q => mp(q[0], q[1], 0.0013)));
      g.fillStyle = R.grade('#2A1511'); g.fill(opp);
      if (open > 0.3 && lod > 60) { g.save(); g.clip(opp); const tt = []; for (let i = 0; i <= N; i++) { const x = -hw * 0.6 + 1.2 * hw * i / N; tt.push([x, lineY(x) + 0.0004]); } for (let i = N; i >= 0; i--) { const x = -hw * 0.6 + 1.2 * hw * i / N; tt.push([x, lineY(x) - openH * 0.32]); } g.fillStyle = R.grade('#D9CFC2'); g.fill(pathOf(tt.map(q => mp(q[0], q[1], 0.0013)))); g.restore(); }
    }
    // the line between the lips, darkest at the corners
    const ln = strip(t => { const x = -hw * 1.02 + 2.04 * hw * t; return [x, lineY(x)]; }, N, t => (0.0007 + 0.0007 * Math.pow(Math.abs(2 * t - 1), 3)) * fyk);
    g.fillStyle = R.grade(mixc(lipCol, '#000000', 0.5)); g.fill(pathOf(ln.map(q => mp(q[0], q[1], 0.0016))));
    if (lod > 90 && smile > 0.25) {   // smile: the cheeks lift, small creases at the corners
      [-1, 1].forEach(sg => { const a = mp(sg * (hw + 0.002), lineY(hw) + 0.004 * fyk, 0.0008), b = mp(sg * (hw + 0.004), lineY(hw) - 0.003 * fyk, 0.0008);
        g.strokeStyle = rgba(R.grade(skin[2]), 0.5 * smile); g.lineWidth = Math.max(0.7, 0.0011 * s); g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(a[0] + sg * 0.003 * s * 0, (a[1] + b[1]) / 2, b[0], b[1]); g.stroke(); });
    }
    if (lod > 140) {
      // the philtrum and the nasolabial folds, faint
      g.strokeStyle = rgba(R.grade(skin[2]), 0.28); g.lineWidth = Math.max(0.7, 0.0009 * s); g.lineCap = 'round';
      [-1, 1].forEach(sg => { const a = mp(sg * (Hd.alaW + 0.003), Hd.alaY - 0.002, 0.0006), b = mp(sg * (hw + 0.004), lineY(hw) - 0.002, 0.0006), c = mp(sg * (hw * 0.9 + 0.008), (Hd.alaY + lineY(hw)) / 2, 0.0006); g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(c[0], c[1], b[0], b[1]); g.stroke(); });
    }
  }
  // ---- hair
  function hairBack(g, R, ch, p, hv) {
    const st = p.hairStyle || ch.hairStyle, { X, Hd, s } = hv;
    if (st === 'bun') {
      const c = [0, -0.035 * (Hd.top / 0.126), -0.115 * (Hd.top / 0.126)], cp = X.p(c), r = 0.042 * s;
      if (V_dHead(hv, c) < 0) { const pth = new Path2D(); pth.arc(cp[0], cp[1], r, 0, TAU); paintPart(g, R, { path: pth, cols: ch.hair, c2: cp, w: r * 2 }); }
    }
    if (st === 'pony') {
      const pts = [[0, 0.0, -0.112], [0, -0.07, -0.122], [0, -0.16, -0.112], [0, -0.25, -0.1]].map(q => [q[0], q[1] * (Hd.top / 0.126), q[2] * (Hd.top / 0.126)]);
      if (V_dHead(hv, pts[0]) < 0.02) {
        const wl = [0.022, 0.026, 0.02, 0.008];
        const P2 = pts.map(q => X.p(q)); const path = new Path2D();
        for (let i = 0; i < P2.length - 1; i++) { const sh = O.S().capsule(P2[i][0], P2[i][1], wl[i] * s, P2[i + 1][0], P2[i + 1][1], wl[i + 1] * s); path.addPath(sh.path(0)); }
        paintPart(g, R, { path, cols: ch.hair, c2: P2[1], w: 0.05 * s });
      }
    }
  }
  function V_dHead(hv, loc) { return v3.dot(M.ap(hv.X.R, loc), hv.X.cam ? M.ap(hv.X.R, hv.X.cam) : [0, 0, 1]); }
  function hairFront(g, R, ch, p, hv) {
    const st = p.hairStyle || ch.hairStyle, { X, Hd, s, lod, hl } = hv;
    if (st === 'bald') return;
    const patch = scalpPatch(Hd, X, hl, { n: lod > 120 ? 160 : 90, nl: lod > 120 ? 140 : 80 });
    if (!patch) return;
    let path = patch.path;
    const hc = ch.hair;
    if (st === 'curls') {
      // a soft cloud of curls: circles along the outer edge, smaller ones framing the face; a puff at the crown
      const U = new Path2D(); U.addPath(path);
      const lim = patch.limbIdx.map(i => patch.limb[i]); const r0 = 0.016 * s;
      lim.forEach((q, i) => { if (i % 3) return; const c = q.p; const t = X.p([0, 0.0, -0.01]); const dx = c[0] - t[0], dy = c[1] - t[1], l = Math.hypot(dx, dy) || 1; const rr = r0 * (0.85 + 0.3 * O.vnoise(i * 0.7, 1, 5)); U.moveTo(c[0] - dx / l * rr * 0.35 + rr, c[1] - dy / l * rr * 0.35); U.arc(c[0] - dx / l * rr * 0.35, c[1] - dy / l * rr * 0.35, rr, 0, TAU); });
      const vis = patch.loop.filter(q => q.vis); vis.forEach((q, i) => { if (i % 4) return; const c = q.p, rr = 0.0085 * s; U.moveTo(c[0] + rr, c[1]); U.arc(c[0], c[1], rr, 0, TAU); });
      // the puff at the crown
      const pc = [0, Hd.top + 0.012, -0.03], ppc = X.p(pc), pr = 0.05 * s;
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, cc = [ppc[0] + Math.cos(a) * pr * 0.55, ppc[1] + Math.sin(a) * pr * 0.45]; U.moveTo(cc[0] + pr * 0.42, cc[1]); U.arc(cc[0], cc[1], pr * 0.42, 0, TAU); }
      path = U;
      paintPart(g, R, { path, cols: hc, c2: X.p([0, 0.06, -0.01]), w: 0.17 * s, lk: 0.5, sk: 0.7, rim: 1.1 });
      if (lod > 70) {   // spiral marks in the curls
        g.save(); g.clip(path); g.strokeStyle = rgba(R.grade(hc[0]), 0.6); g.lineWidth = Math.max(0.8, 0.0015 * s); g.lineCap = 'round';
        const rr = O.rng('curlmarks');
        for (let i = 0; i < 26; i++) { const ph = (rr() - 0.5) * TAU * 0.9, el = 0.2 + rr() * 1.1; const loc = [Math.sin(ph) * 0.09 * Math.cos(el - 0.6), Hd.scalp.c[1] + Math.sin(el) * 0.1, Math.cos(ph) * 0.1 * Math.cos(el - 0.6)];
          const n = v3.norm(loc); if (v3.dot(n, hv.camH) < 0.2) continue; const c = X.p(loc), r = (0.005 + rr() * 0.004) * s; g.beginPath(); g.arc(c[0], c[1], r, rr() * TAU, rr() * TAU + 3.6); g.stroke(); }
        g.restore();
      }
      return;
    }
    paintPart(g, R, { path, cols: hc, c2: X.p([0, 0.08, -0.01]), w: 0.16 * s, lk: 0.32, sk: 0.55, rim: 1.0 });
    if (lod > 46 && (st === 'crop' || st === 'short')) {
      // the crop's texture: short strands combed forward from the crown, lit on the light's side
      g.save(); g.clip(path); const rr = O.rng('crop' + ch.name), v = lightDir2(R.L, X.p([0, 0.08, 0]));
      const c = Hd.scalp.c, r = Hd.scalp.r;
      for (let i = 0; i < 46; i++) { const ph = (rr() - 0.5) * TAU * 0.92, el = 0.25 + rr() * 1.15; const loc = v3.add(c, [r[0] * Math.cos(el) * Math.sin(ph), r[1] * Math.sin(el), r[2] * Math.cos(el) * Math.cos(ph)]);
        const n = v3.norm(v3.sub(loc, c)); if (v3.dot(n, hv.camH) < 0.15) continue; if (loc[1] < hl(ph) + 0.006) continue;
        const loc2 = v3.add(loc, [0.004 * Math.sin(ph), -0.009, 0.012 * Math.cos(ph) + 0.004]);
        const a = X.p(loc), b = X.p(loc2); const lit = (b[0] - a[0]) * v[1] - (b[1] - a[1]) * v[0];
        g.strokeStyle = rgba(R.grade(i % 3 ? hc[0] : hc[2]), i % 3 ? 0.28 : 0.4); g.lineWidth = Math.max(0.8, 0.0022 * s); g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
      g.restore();
    }
    if (st === 'crop' && ch.grey && lod > 60) {
      // greying at the temples: short pale strands above the ears
      g.save(); g.clip(path); g.strokeStyle = rgba(R.grade(ch.grey), 0.55); g.lineWidth = Math.max(0.7, 0.0013 * s); g.lineCap = 'round';
      const c = Hd.scalp.c, r = Hd.scalp.r, rr = O.rng('greys');
      [-1, 1].forEach(sg => { for (let i = 0; i < 16; i++) { const ph = sg * (66 + 30 * rr()) * D2R, y0 = hl(ph) + 0.003 + rr() * 0.02, y1 = y0 + 0.008 + rr() * 0.008;
        const P3 = y => { const sl = clamp((y - c[1]) / r[1], -0.99, 0.99), cl = Math.sqrt(1 - sl * sl); return [c[0] + r[0] * cl * Math.sin(ph), y, c[2] + r[2] * cl * Math.cos(ph)]; };
        const n = v3.norm(v3.sub(P3(y0), c)); if (v3.dot(n, hv.camH) < 0.15) continue; const a2 = X.p(P3(y0)), b2 = X.p(P3(y1)); g.beginPath(); g.moveTo(a2[0], a2[1]); g.lineTo(b2[0] + sg * 0.002 * s, b2[1]); g.stroke(); } });
      g.restore();
    }
    if (st === 'bun' || st === 'pony') {
      // a soft parting sweep
      if (lod > 60) { g.save(); g.clip(path); g.strokeStyle = rgba(R.grade(hc[0]), 0.35); g.lineWidth = Math.max(0.8, 0.002 * s); for (let i = 0; i < 5; i++) { const a = X.p([-0.02 + i * 0.012, Hd.top - 0.004, 0.02]), b = X.p([0.05 + i * 0.008, 0.05, 0.07]), c = X.p([0.075, 0.0, 0.0]); g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(b[0], b[1], c[0], c[1]); g.stroke(); } g.restore(); }
    }
    if (st === 'bun') {
      const c = [0, -0.035 * (Hd.top / 0.126), -0.115 * (Hd.top / 0.126)], cp = X.p(c), r = 0.042 * s;
      if (V_dHead(hv, c) >= 0) { const pth = new Path2D(); pth.arc(cp[0], cp[1], r, 0, TAU); paintPart(g, R, { path: pth, cols: hc, c2: cp, w: r * 2 }); }
    }
  }

  // =====================================================================
  // rendering a built figure
  // =====================================================================
  function renderFull(g, fig) {
    const { parts, R } = fig;
    parts.forEach(q => {
      if (q.custom) { q.custom(g); return; }
      if (!q.path) return;
      if (q.castOn && !R.flat) castShadow(g, R, q, fig);
      if (!q.cols) { q.cols = fig.ch.skin; }
      paintPart(g, R, q);
      if (q.post && !R.flat) q.post(g, R);
    });
    return infoOf(fig);
  }
  function castShadow(g, R, q, fig) {
    // a near arm lays a soft-edged flat shadow on the torso behind it, away from the light
    const torso = fig.parts.find(t => t.key === 'torso'); if (!torso) return;
    const v = lightDir2(R.L, q.c2), d = q.w * 0.35;
    g.save(); g.clip(torso.path); g.translate(-v[0] * d, -v[1] * d + q.w * 0.1); g.fillStyle = rgba(R.grade(torso.cols[2]), 0.45); g.fill(q.path); g.restore();
  }
  function infoOf(fig) {
    const { sk, V } = fig, P2 = b => { const q = V.p(b); return [q[0], q[1]]; };
    const Hd = fig.ch.head, X = headXf(sk, V, Hd);
    return {
      head: P2(sk.headC), eyes: [X.p([Hd.eye.x, Hd.eye.y, 0.08]), X.p([-Hd.eye.x, Hd.eye.y, 0.08])].map(q => [q[0], q[1]]),
      chin: P2(X.b([0, Hd.chin, 0.05])), top: P2(X.b([0, Hd.top + 0.01, -0.01])), neck: P2(sk.neckBase),
      hands: { R: P2(sk.arm.R.wr), L: P2(sk.arm.L.wr) }, elbows: { R: P2(sk.arm.R.el), L: P2(sk.arm.L.el) }, shoulders: { R: P2(sk.sh.R), L: P2(sk.sh.L) },
      hips: P2(sk.pelvis), knees: { R: P2(sk.leg.R.knee), L: P2(sk.leg.L.knee) }, feet: { R: P2(sk.foot.R.ball), L: P2(sk.foot.L.ball) },
      stride: sk.stride, scale: V.s, yaw: V.a,
      bbox: bboxOf(fig),
    };
  }
  function bboxOf(fig) {
    const { sk, V } = fig; const pts = [sk.headC, sk.arm.R.wr, sk.arm.L.wr, sk.arm.R.el, sk.arm.L.el, sk.foot.R.toe, sk.foot.L.toe, sk.foot.R.heel, sk.foot.L.heel, sk.leg.R.knee, sk.leg.L.knee, sk.pelvis, sk.sh.R, sk.sh.L].map(b => V.p(b));
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(q => { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); });
    const m = 0.2 * V.s; return { x: x0 - m, y: y0 - m, w: x1 - x0 + 2 * m, h: y1 - y0 + 2 * m };
  }

  // =====================================================================
  // the public entry points
  // =====================================================================
  // a pooled scratch canvas for the modes that composite (reflection, blur)
  const _scr = {};
  function scratch(name, w, h) {
    let e = _scr[name]; w = Math.max(2, Math.ceil(w)); h = Math.max(2, Math.ceil(h));
    if (!e || e.c.width < w || e.c.height < h) { const c = O.makeCanvas(Math.max(w, e ? e.c.width : 0), Math.max(h, e ? e.c.height : 0)); e = _scr[name] = { c, g: c.getContext('2d') }; }
    const g = e.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, e.c.width, e.c.height); return e;
  }
  const devScale = g => { const m = g.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; };
  function figBox(fig, pad) {
    const b = bboxOf(fig), s = fig.V.s, m = (pad || 0.12) * s;
    return { x: Math.floor(b.x - m), y: Math.floor(b.y - m - 0.06 * s), w: Math.ceil(b.w + 2 * m), h: Math.ceil(b.h + 2 * m + 0.06 * s) };
  }
  // the whole figure as one outline (silhouettes, masks, the sun strip's clip)
  function unionPath(fig) {
    const U = new Path2D();
    fig.parts.forEach(q => { if (q.path) U.addPath(q.path); });
    const hs = headShapes(fig); hs.forEach(h => U.addPath(h));
    return U;
  }
  function headShapes(fig) {
    const { ch, sk, V, p } = fig, Hd = ch.head, X = headXf(sk, V, Hd), pxH = (Hd.top - Hd.chin) * V.s;
    const out = headOutline(Hd, X, V, pxH), hl = hairlineFn(ch.hairline, ch.hairK, ch.hairNoise);
    const res = [out.path];
    const patch = scalpPatch(Hd, X, hl, { n: 80, nl: 70 }); if (patch) res.push(patch.path);
    const st = p.hairStyle || ch.hairStyle;
    if (st === 'curls') { const pc = X.p([0, Hd.top + 0.012, -0.03]), pr = 0.05 * V.s; const c = new Path2D(); c.arc(pc[0], pc[1], pr * 0.85, 0, TAU); res.push(c); if (patch) { const lim = patch.limbIdx.map(i => patch.limb[i]); const r0 = 0.016 * V.s; const U = new Path2D(); lim.forEach((q, i) => { if (i % 3) return; U.moveTo(q.p[0] + r0, q.p[1]); U.arc(q.p[0], q.p[1], r0, 0, TAU); }); res.push(U); } }
    if (st === 'bun') { const c = X.p([0, -0.035 * (Hd.top / 0.126), -0.115 * (Hd.top / 0.126)]); const q = new Path2D(); q.arc(c[0], c[1], 0.042 * V.s, 0, TAU); res.push(q); }
    if (st === 'pony') { const pts = [[0, 0.0, -0.112], [0, -0.07, -0.122], [0, -0.16, -0.112], [0, -0.25, -0.1]].map(q => X.p([q[0], q[1] * (Hd.top / 0.126), q[2] * (Hd.top / 0.126)])); const wl = [0.022, 0.026, 0.02, 0.008]; for (let i = 0; i < 3; i++) res.push(O.S().capsule(pts[i][0], pts[i][1], wl[i] * V.s, pts[i + 1][0], pts[i + 1][1], wl[i + 1] * V.s).path(0)); }
    return res;
  }
  function renderSilhouette(g, fig, opts) {
    const U = unionPath(fig), L = fig.R.L, bb = figBox(fig, 0.05), Hd = fig.ch.head;
    const head = new Path2D(); headShapes(fig).forEach(h => head.addPath(h));
    const hc = fig.V.p(fig.sk.headC);
    O.silhouette(g, U, { fill: opts.ink || '#0A0E10', light: { x: L.x, y: L.y }, rimColor: opts.rimColor || L.color, rimW: opts.rimW != null ? opts.rimW : clamp(fig.V.s * 0.0085, 1.6, 6), rimSoft: opts.rimSoft !== false,
      spread: opts.spread != null ? opts.spread : 1.25, bbox: bb, at: fig.V.p(fig.sk.spineAt(0.5)), parts: [{ path: head, at: hc, w: 1.08, bbox: { x: hc[0] - 0.2 * fig.V.s, y: hc[1] - 0.22 * fig.V.s, w: 0.4 * fig.V.s, h: 0.44 * fig.V.s } }] });
    return infoOf(fig);
  }
  // seen in glass: lower contrast, cooler, the glass's tint, optionally mirrored, screened onto black glass by default
  function renderReflection(g, fig, opts) {
    const bb = figBox(fig), k = devScale(g) * (opts.res || 1);
    const e = scratch('refl', bb.w * k, bb.h * k), sg = e.g;
    sg.setTransform(k, 0, 0, k, -bb.x * k, -bb.y * k);
    renderFull(sg, fig);
    sg.setTransform(1, 0, 0, 1, 0, 0);
    const crush = opts.crush != null ? opts.crush : 0.55;
    if (crush > 0) { sg.globalCompositeOperation = 'multiply'; sg.globalAlpha = crush; sg.drawImage(e.c, 0, 0); sg.globalAlpha = 1; }
    sg.globalCompositeOperation = 'source-atop';
    sg.fillStyle = rgba(opts.tint || '#8FA9A6', opts.tintK != null ? opts.tintK : 0.32); sg.fillRect(0, 0, bb.w * k, bb.h * k);
    if (opts.lift) { sg.fillStyle = rgba('#000000', opts.lift); sg.fillRect(0, 0, bb.w * k, bb.h * k); }
    g.save(); g.globalAlpha = opts.alpha != null ? opts.alpha : 0.8; g.globalCompositeOperation = opts.blend || 'screen';
    if (opts.clip) g.clip(opts.clip);
    if (opts.mirror) { const ax = opts.mirrorX != null ? opts.mirrorX : fig.p.at[0]; g.translate(ax, 0); g.scale(-1, 1); g.translate(-ax, 0); }
    g.drawImage(e.c, 0, 0, bb.w * k, bb.h * k, bb.x, bb.y, bb.w, bb.h);
    g.restore();
    return infoOf(fig);
  }
  // behind fogged or steamed glass: simplified (two values, no features), rendered small, blurred small, scaled up
  function renderBlur(g, fig, opts) {
    const bb = figBox(fig, 0.3), soft = opts.soft != null ? opts.soft : 18, k = devScale(g) * clamp(3 / soft, 0.06, 0.5);
    const w = bb.w * k, h = bb.h * k, a = scratch('blurA', w, h), b = scratch('blurB', w, h);
    a.g.setTransform(k, 0, 0, k, -bb.x * k, -bb.y * k); renderFull(a.g, fig);
    if (opts.fog) { a.g.setTransform(1, 0, 0, 1, 0, 0); a.g.globalCompositeOperation = 'source-atop'; a.g.fillStyle = rgba(opts.fog, opts.fogK != null ? opts.fogK : 0.35); a.g.fillRect(0, 0, w, h); }
    b.g.filter = `blur(${Math.max(0.6, soft * k * 0.5).toFixed(2)}px)`; b.g.drawImage(a.c, 0, 0); b.g.filter = 'none';
    g.save(); g.globalAlpha = opts.alpha != null ? opts.alpha : 1; if (opts.blend) g.globalCompositeOperation = opts.blend; g.imageSmoothingQuality = 'high';
    if (opts.clip) g.clip(opts.clip);
    g.drawImage(b.c, 0, 0, w, h, bb.x, bb.y, bb.w, bb.h); g.restore();
    return infoOf(fig);
  }

  // =====================================================================
  // the public entry points
  // =====================================================================
  function draw(g, who, pose, opts) {
    opts = opts || {}; const ch = CHAR[who];
    if (!ch) { (G.FILM && G.FILM.warn ? G.FILM.warn : console.warn)('RIG: no character ' + who); return null; }
    if (ch.draw) return ch.draw(g, pose, opts);          // extras with their own drawing (the dog)
    const p = normPose(ch, pose), mode = opts.mode || 'full';
    const o2 = mode === 'blur' ? Object.assign({}, opts, { flat: opts.flat || 2 }) : mode === 'reflection' ? Object.assign({ rimK: 0.55 }, opts) : opts;
    const fig = buildFigure(ch, p, o2);
    let info;
    if (mode === 'silhouette') info = renderSilhouette(g, fig, opts);
    else if (mode === 'reflection') info = renderReflection(g, fig, opts);
    else if (mode === 'blur') info = renderBlur(g, fig, opts);
    else info = renderFull(g, fig);
    if (opts.band && mode !== 'silhouette') sunBand(g, fig, opts.band);
    return info;
  }
  // a hard band of light laid across the figure (the sun strip in the car): {y0, y1 (screen y at the band's left), x0, x1, slope, color, alpha, soft}
  function sunBand(g, fig, b) {
    const U = unionPath(fig), x0 = b.x0 != null ? b.x0 : -1e4, x1 = b.x1 != null ? b.x1 : 1e4, sl = b.slope || 0;
    g.save(); g.clip(U); g.globalCompositeOperation = 'screen';
    const band = new Path2D(); band.moveTo(x0, b.y0 + sl * (x0 - (b.x0 || 0))); band.lineTo(x1, b.y0 + sl * (x1 - (b.x0 || 0))); band.lineTo(x1, b.y1 + sl * (x1 - (b.x0 || 0))); band.lineTo(x0, b.y1 + sl * (x0 - (b.x0 || 0))); band.closePath();
    const c = b.color || '#FFF4DE';
    if (b.x1 != null && b.soft) { const gr = g.createLinearGradient(b.x1 - b.soft, 0, b.x1, 0); gr.addColorStop(0, rgba(c, b.alpha != null ? b.alpha : 0.92)); gr.addColorStop(1, rgba(c, 0)); g.fillStyle = gr; }
    else g.fillStyle = rgba(c, b.alpha != null ? b.alpha : 0.92);
    g.fill(band); g.restore();
  }
  // a close head-and-shoulders: pose.at is the point between the eyes, pose.size the head's height in px (vertex to chin)
  function face(g, who, pose, opts) {
    opts = opts || {}; const ch = CHAR[who]; if (!ch || !ch.head) return null;
    const Hd = ch.head, size = pose.size || 600, s = pose.scale || size / (Hd.top - Hd.chin);
    const p = normPose(ch, Object.assign({ body: 'bust' }, pose, { at: [0, 0], scale: s }));
    if (pose.body && pose.body !== 'bust') p.body = pose.body;
    const V0 = makeView([0, 0], s, p._yaw, (p.pitch || 0) * D2R), sk0 = solveBody(ch, p, V0), X0 = headXf(sk0, V0, Hd);
    const eye = X0.p([0, Hd.eye.y, Hd.rings[7][2] + Hd.rings[7][3]]);
    const at = pose.at || [960, 460], dx = at[0] - eye[0], dy = at[1] - eye[1];
    const o2 = Object.assign({}, opts); if (opts.light) o2.light = Object.assign({}, opts.light, { x: opts.light.x - dx, y: opts.light.y - dy });
    if (opts.band) o2.band = Object.assign({}, opts.band, { y0: opts.band.y0 - dy, y1: opts.band.y1 - dy, x0: opts.band.x0 != null ? opts.band.x0 - dx : null, x1: opts.band.x1 != null ? opts.band.x1 - dx : null });
    if (opts.clip) { const c = new Path2D(); c.addPath(opts.clip, new DOMMatrix([1, 0, 0, 1, -dx, -dy])); o2.clip = c; }
    if (opts.mirrorX != null) o2.mirrorX = opts.mirrorX - dx;
    g.save(); g.translate(dx, dy);
    const mode = o2.mode || 'full';
    const fig = buildFigure(ch, p, mode === 'blur' ? Object.assign({}, o2, { flat: o2.flat || 2 }) : o2);
    let info = mode === 'silhouette' ? renderSilhouette(g, fig, o2) : mode === 'reflection' ? renderReflection(g, fig, o2) : mode === 'blur' ? renderBlur(g, fig, o2) : renderFull(g, fig);
    if (o2.band && mode !== 'silhouette') sunBand(g, fig, o2.band);
    g.restore();
    const sh = q => [q[0] + dx, q[1] + dy];
    if (info) { ['head', 'chin', 'top', 'neck', 'hips'].forEach(k => { if (info[k]) info[k] = sh(info[k]); }); info.eyes = info.eyes.map(sh); ['hands', 'elbows', 'shoulders'].forEach(k => { info[k] = { R: sh(info[k].R), L: sh(info[k].L) }; }); info.bbox = Object.assign({}, info.bbox, { x: info.bbox.x + dx, y: info.bbox.y + dy }); }
    return info;
  }

  const RIG = G.RIG = { CHAR, MAT, ARM, FACES, VIEW_YAW, draw, face, mix: mixPose, key: keyPose, demos: [],
    _: { v3, M, makeView, loft, solveBody, headCloud, scalpPatch, facePt, buildFigure, normPose, terminator, headGrid, headXf } };

  // =====================================================================
  // demos (node tools/set.js rig 1)
  // =====================================================================
  const tw = t => (G.FILM ? G.FILM.twos(t) : t);
  function bgTeal(g, o) {
    o = o || {}; const W = 1920, H = 1080, fl = o.floor == null ? 960 : o.floor;
    g.fillStyle = LC.lin(g, 0, 0, 0, fl, [[0, o.top || '#1F3538'], [1, o.mid || '#30494A']]); g.fillRect(0, 0, W, fl);
    g.fillStyle = LC.lin(g, 0, fl, 0, H, [[0, o.floorC || '#142427'], [1, '#0D181A']]); g.fillRect(0, fl, W, H - fl);
    g.fillStyle = 'rgba(203,214,208,0.08)'; g.fillRect(0, fl - 2, W, 2);
  }
  const KEY = { x: -1500, y: -500, color: '#F6E3BC', back: 0.32 };
  RIG.demos.push({ name: 'daniel: four views, day', draw(c, t) {
    const g = c.g; bgTeal(g);
    const br = (tw(t) * 0.25) % 1;
    ['front', 'three', 'profile', 'back'].forEach((v, i) => draw(g, 'daniel', { at: [270 + i * 460, 960], scale: 455, view: v, breath: br }, { light: KEY }));
  } });
  RIG.demos.push({ name: 'daniel: dawn, tee and pyjamas', draw(c, t) {
    const g = c.g; bgTeal(g, { top: '#0D181A', mid: '#142427', floorC: '#0B1415' });
    const br = (tw(t) * 0.25) % 1, L = { x: 2600, y: 200, color: '#CFE3E6', back: 0.45 };
    ['front', 'three', 'profile', 'back'].forEach((v, i) => draw(g, 'daniel', { at: [270 + i * 460, 960], scale: 455, view: v, breath: br, outfit: 'night', face: 'tired' }, { light: L }));
  } });
  RIG.demos.push({ name: 'daniel: walk (top) and hurry (bottom), profile', draw(c, t) {
    const g = c.g; bgTeal(g, { floor: 2000 });
    g.fillStyle = 'rgba(203,214,208,0.1)'; g.fillRect(0, 528, 1920, 2); g.fillRect(0, 1058, 1920, 2);
    for (let i = 0; i < 8; i++) {
      draw(g, 'daniel', { at: [130 + i * 236, 528], scale: 255, view: 'profile', body: 'walk', phase: i / 8, face: 'tired' }, { light: KEY });
      draw(g, 'daniel', { at: [130 + i * 236, 1058], scale: 255, view: 'profile', body: 'hurry', phase: i / 8 }, { light: KEY });
    }
  } });
  RIG.demos.push({ name: 'daniel: run (top), walk three-quarter (bottom)', draw(c, t) {
    const g = c.g; bgTeal(g, { floor: 2000 });
    g.fillStyle = 'rgba(203,214,208,0.1)'; g.fillRect(0, 528, 1920, 2); g.fillRect(0, 1058, 1920, 2);
    for (let i = 0; i < 8; i++) {
      draw(g, 'daniel', { at: [130 + i * 236, 528], scale: 255, view: 'profile', body: 'run', phase: i / 8, face: 'blank' }, { light: KEY });
      draw(g, 'daniel', { at: [130 + i * 236, 1058], scale: 255, view: 'three', body: 'walk', phase: i / 8 }, { light: KEY });
    }
  } });
  RIG.demos.push({ name: 'daniel: climbing the stairs, back view (C1)', draw(c, t) {
    const g = c.g; g.fillStyle = '#100B08'; g.fillRect(0, 0, 1920, 1080);
    const L = { x: 960, y: -400, color: '#F6CD92', back: 0.92 };
    for (let k = 0; k < 4; k++) {
      const x0 = 250 + k * 470, base = 1000, s = 300, rise = 0.19, going = 0.25, ph = k / 4;
      for (let j = -2; j < 9; j++) { const y = base - (j - 0.4) * rise * s - ph * 2 * rise * s; if (y < 0 || y > 1080) continue; g.fillStyle = '#2A1C12'; g.fillRect(x0 - 150, y, 300, 4); g.fillStyle = OTM.rgba('#D9A466', 0.4); g.fillRect(x0 - 150, y, 300, 1.5); }
      draw(g, 'daniel', { at: [x0, base], scale: s, view: 'back', body: 'climb', phase: ph, outfit: 'night', armL: 'rail' }, { light: L });
    }
  } });
  RIG.demos.push({ name: 'daniel: driving, profile and through the windscreen', draw(c, t) {
    const g = c.g; bgTeal(g, { floor: 2000, top: '#2E3534', mid: '#4A4F4C' });
    const ph = tw(t);
    draw(g, 'daniel', { at: [520, 700], scale: 380, view: 'profile', body: 'drive', face: 'concentration', breath: (ph * 0.25) % 1 }, { light: { x: 1400, y: 200, color: '#FFF1D6', back: 0.4 } });
    // from the front, through the glass: the car's cabin dark, the windscreen catching the sky
    g.fillStyle = '#121617'; g.fillRect(1020, 120, 860, 860);
    draw(g, 'daniel', { at: [1450, 760], scale: 420, view: 'front', body: 'drive', face: 'tired', steer: 0.15 * Math.sin(ph) }, { light: { x: 1450, y: -300, color: '#FFF1D6', back: 0.25 } });
    g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.lin(g, 1020, 120, 1880, 980, [[0, '#BFD3D0', 0.32], [0.5, '#BFD3D0', 0.06], [1, '#BFD3D0', 0.2]]); g.fillRect(1020, 120, 860, 860); g.restore();
  } });
  RIG.demos.push({ name: 'daniel: at a desk (office), and on the bed\'s edge (dawn)', draw(c, t) {
    const g = c.g; bgTeal(g, { top: '#26373A', mid: '#3A4E50' });
    const br = (tw(t) * 0.25) % 1, s = 330, seatY = 790;
    // the chair and the desk, the desk 0.28 m above the seat
    const deskY = seatY - 0.29 * s;
    g.fillStyle = '#3B4446'; g.fillRect(250, seatY, 200, 14); g.fillRect(340, seatY + 14, 14, 960 - seatY - 14);
    g.fillStyle = '#2E3A3D'; g.fillRect(225, seatY - 0.55 * s, 22, 0.55 * s + 14);
    draw(g, 'daniel', { at: [350, seatY], scale: s, view: 'profile', facing: 1, body: 'sit', seat: 0.46, armR: 'type', armL: 'type', face: 'concentration', breath: br, outfit: 'office', pitch: 6 }, { light: { x: 1000, y: 380, color: '#DCEBEA', back: 0.15 } });
    g.fillStyle = '#20292B'; g.fillRect(470, deskY, 440, 16); g.fillRect(880, deskY + 16, 14, 960 - deskY - 16);
    g.fillStyle = '#B9C4C2'; g.beginPath(); g.moveTo(520, deskY); g.lineTo(650, deskY); g.lineTo(655, deskY - 6); g.lineTo(525, deskY - 6); g.closePath(); g.fill();
    g.fillStyle = '#2B3436'; g.beginPath(); g.moveTo(640, deskY - 4); g.lineTo(668, deskY - 120); g.lineTo(678, deskY - 120); g.lineTo(652, deskY - 4); g.closePath(); g.fill();
    // the bed's edge at dawn, seen a little from above
    g.fillStyle = '#0D181A'; g.fillRect(960, 0, 960, 1080);
    g.fillStyle = '#2A3B44'; g.fillRect(1050, 800, 800, 110); g.fillStyle = '#34495A'; g.fillRect(1050, 770, 800, 34);
    draw(g, 'daniel', { at: [1450, 800], scale: 330, view: 'front', body: 'sitbed', seat: 0.47, outfit: 'night', hold: 'phone', phoneLit: true, armR: 'knee', armL: 'knee', face: 'down', head: { nod: 0.5, tilt: 0.05, turn: 0 }, breath: br, pitch: 14 }, { light: { x: 1500, y: -200, color: '#C9DCE0', back: 0.85 } });
  } });
  RIG.demos.push({ name: 'daniel: kneeling at the door (C3), silhouette and full', draw(c, t) {
    const g = c.g; const W = 1920;
    g.fillStyle = LC.lin(g, 0, 0, 0, 700, [[0, '#232D38'], [0.4, '#3A4250'], [0.7, '#6A5A5C'], [0.9, '#B26E4A'], [1, '#E39A5C']]); g.fillRect(0, 0, W, 700);
    g.fillStyle = LC.lin(g, 0, 700, 0, 1080, [[0, '#CC8650'], [0.3, '#6C4935'], [1, '#2C2224']]); g.fillRect(0, 700, W, 380);
    const sun = [700, 690]; g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, sun[0], sun[1], 0, 600, [[0, '#FFD9A0', 0.9], [0.1, '#F7B877', 0.6], [1, '#C77A47', 0]]); g.fillRect(0, 0, W, 1080); g.restore();
    g.fillStyle = '#FFE3B0'; g.beginPath(); g.arc(sun[0], sun[1], 30, Math.PI, 0); g.fill();
    const pose = { at: [560, 930], scale: 330, view: 'profile', body: 'kneel', armR: 'reachIn', armL: 'down', head: { nod: 0.8, turn: 0, tilt: 0 }, face: 'down', collar: 'crooked', lean: 0.1 };
    draw(g, 'daniel', pose, { mode: 'silhouette', light: { x: sun[0] - 40, y: sun[1] - 110, color: '#F4AE72' } });
    draw(g, 'daniel', Object.assign({}, pose, { at: [1420, 930] }), { light: { x: sun[0], y: sun[1], color: '#F4AE72', back: 0.7 }, ambient: '#3A4250', ambientK: 0.2 });
  } });
  RIG.demos.push({ name: 'daniel: faces at close size', draw(c, t) {
    const g = c.g; g.fillStyle = '#142427'; g.fillRect(0, 0, 1920, 1080);
    const L = { x: -300, y: -200, color: '#F6E3BC', back: 0.3 };
    const faces = [['tired', 0, 0], ['squint', 0.0, 0.05], ['smile', 0.12, -0.05], ['concentration', -0.1, 0.2], ['blank', 0, -0.05], ['drained', 0.08, 0.15], ['understanding', 0.0, 0.35], ['down', 0.1, 0.5]];
    faces.forEach(([f, turn, nod], i) => { const x = 240 + (i % 4) * 480, y = i < 4 ? 250 : 790;
      g.save(); g.beginPath(); g.rect(x - 238, y - 248, 476, 528); g.clip();
      face(g, 'daniel', { at: [x, y], size: 330, view: 'front', face: f, head: { turn, nod, tilt: 0 }, outfit: i % 2 ? 'office' : 'day' }, { light: L });
      g.restore();
      g.fillStyle = 'rgba(230,224,210,0.7)'; g.font = '500 22px "Libre Franklin"'; g.fillText(f, x - 220, y + 260); });
  } });
  RIG.demos.push({ name: 'modes: silhouette, reflection (black glass), blur (fogged glass)', draw(c, t) {
    const g = c.g; g.fillStyle = '#0D181A'; g.fillRect(0, 0, 1920, 1080);
    const pose = { at: [330, 980], scale: 430, view: 'three', body: 'stand', face: 'tired' };
    g.fillStyle = LC.lin(g, 0, 0, 0, 1080, [[0, '#6A5A5C'], [1, '#E39A5C']]); g.fillRect(0, 0, 640, 1080);
    draw(g, 'daniel', pose, { mode: 'silhouette', light: { x: 560, y: 420, color: '#F4AE72' } });
    // black glass: the phone's screen
    g.fillStyle = '#030606'; g.fill(LC.rrect(700, 60, 520, 960, 50));
    g.save(); g.clip(LC.rrect(700, 60, 520, 960, 50));
    face(g, 'daniel', { at: [960, 420], size: 460, view: 'front', face: 'squint', outfit: 'night', head: { nod: 0.2, turn: -0.05, tilt: 0 } }, { mode: 'reflection', light: { x: 960, y: 1400, color: '#E8F4F2', back: 0.2 }, mirror: true, mirrorX: 960, tint: '#9FB4B0', tintK: 0.3, alpha: 0.85 });
    g.restore();
    LC.glare(g, LC.rrect(700, 60, 520, 960, 50), { x: 900, y: 500, angle: -1.1, color: '#FFFFFF', bands: [{ d: -60, w: 80, a: 0.05 }, { d: 64, w: 16, a: 0.06 }] });
    // fogged shower glass
    g.fillStyle = '#9DB2AE'; g.fillRect(1280, 0, 640, 1080);
    draw(g, 'daniel', { at: [1600, 1060], scale: 450, view: 'front', body: 'stand', armR: 'face', armL: 'face', outfit: 'night', head: { nod: 0.3, turn: 0, tilt: 0 } }, { mode: 'blur', soft: 26, light: { x: 1300, y: -200, back: 0.3 }, fog: '#B7C8C4', fogK: 0.4, alpha: 0.9 });
    g.save(); g.fillStyle = LC.lin(g, 0, 0, 0, 1080, [[0, '#D9E4E1', 0.15], [1, '#D9E4E1', 0.55]]); g.fillRect(1280, 0, 640, 1080); g.restore();
  } });
})(window);
