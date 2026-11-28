/* SEVEN DAYS OF NO · POV kit (global POV) · Claude YouTube
   The author's reference look in Canvas 2D: flat cartoon, an even ink outline (5 px on a full-body figure at 1080p) with round
   caps and joins, flat fills, one flat shadow tone per material, big round bald-ish heads with dot-and-curve faces.

   Figures are rigs. Every part (head, torso, upper/lower arm, hand, thigh/shin, shoe) is drawn on its own from joint angles or
   IK targets, so poses, walk cycles, blinks and lip-sync are numbers:
     POV.figure(g, who, {x, y (feet), scale, facing: 1|-1, pose, phase, expr, look:[x,y], blink, mouth, turn, holding, tint, shadow})
   who: hero | boss | friend | mum | coworker | stranger.   pose: a name in POV.POSES or a pose object (see POSES for the format).
   Body coordinates: origin at the pelvis, y down, scale 1 = 800 px from soles to head top; angles: 0 = straight down,
   + swings toward the facing side. Everything drawn for facing 1 and mirrored for facing -1.
   Deterministic: never Math.random or the clock (POV.rng(seed) for variation). No filters on figures (~0.5 ms each in Chromium).

   More figure opts: face (per-expression overrides, e.g. {brows:{lift:.1}, mouth:{k:'flat'}}), nod (-1..1 features down), marks
   (confused '??', sheet only), light (1|-1: side the light comes from; shade strips go opposite), lw (screen px), override
   ({armR:{ik:[x,y]}, head:{tilt}} merged into the pose), drawProp(g, joints, F) (custom prop in the hand layer), prop:false.
   holding: clipboard | phone | mug | sip | laptop | box (takes over the arms the prop needs; works with walk/stand/sit).
   Returns world anchors {head, headTop, headR, mouth, handL, handR, elbowL, elbowR, pelvis, scale} for bubbles and props.
   Props (world space): POV.phone, phoneFlat, laptop, laptopSide, clipboard, box, mug, notif (kind mail|chat|bell|call|missed),
   chatBubble, bell, buzz, thought (plate icon), plateIcon, bulb (rays, glow, sparkle), clock, flash, shadow.
   In a tinted set (living-room evening) pass the set's tint to figure() so skin and clothes take the same multiply. */
(function (global) {
  'use strict';
  const W = 1920, H = 1080, TAU = Math.PI * 2, PI = Math.PI;

  // ================================================================ palette (sampled from design/refs) and line widths
  const C = {
    ink: '#1c1c1c',
    // hero
    skin: '#FCEBCB', skinSh: '#EED8B4', hoodie: '#3A8594', hoodieSh: '#2F7280', hoodieIn: '#28606C',
    white: '#FFFFFF', whiteSh: '#E6E6E6', shoeTeal: '#3A8594', sole: '#FFFFFF',
    // cast
    bossHair: '#A6A6A6', bossHairHi: '#D2D2D2', bossHairSh: '#8E8E8E', bossTrousers: '#7B7C7C', bossTrousersSh: '#696A6A',
    tie: '#3A3A3A', belt: '#2E2E2E', buckle: '#BDBDBD', shoeBlack: '#393939',
    friendTee: '#D14A44', friendTeeSh: '#B63E39', cap: '#3A3A3A', capSh: '#2A2A2A', jeans: '#5D8FAE', jeansSh: '#4E7D9A', jeansCuff: '#6E9DBA',
    mumCardigan: '#EC9547', mumCardiganSh: '#D6833A', mumSkirt: '#7E5C43', mumSkirtSh: '#6B4C36', mumHair: '#755438', mumHairSh: '#5E432C', shoeBrown: '#6E5340',
    cwSkin: '#CBA17C', cwSkinSh: '#B68B67', cwShirt: '#6EA179', cwShirtSh: '#5C8C67', khaki: '#DBC39E', khakiSh: '#C6AD86', lanyard: '#3E6FA6', badge: '#4988BC', shoeDark: '#5E4937',
    strJacket: '#6E5893', strJacketSh: '#5B4880', bucket: '#DAC7A2', bucketSh: '#C2AE87', bucketHi: '#E9DBBE', strJeans: '#6191AF', strJeansSh: '#517E9B', strShoe: '#777093',
    // faces
    mouthIn: '#5E2323', tongue: '#E58A8E', tear: '#8ACDEB', sweat: '#8FD3F0', circles: 'rgba(96,78,96,0.30)',
    // props
    phone: '#3D3F48', phoneScreen: '#BFE3F2', phoneGlow: '#DFF6FF', laptop: '#C1C1C5', laptopSh: '#A3A3A9', clipboard: '#876245', clipboardSh: '#74533A', clip: '#A9ADB2', paper: '#FFFFFF',
    box: '#C9995F', boxSh: '#B0834E', boxTop: '#D8AC74', tape: '#E3C38E', mug: '#FFFFFF', coffee: '#7A4A30', steam: '#B9B2AE',
    bubRed: '#E37F78', bubGreen: '#77CC81', bubBlue: '#7BAFE1', bubYellow: '#F4BF54', badgeRed: '#E5534B', bell: '#F2C04E',
    bulb: '#F7D25A', bulbBase: '#9AA0A6', clockRim: '#A3ADB8', clockFace: '#FDFEFA', steak: '#8E5A3C', herb: '#6FA35A', carrot: '#E98A3C', cutlery: '#C9CED3',
    // sets (sampled from the refs, for the set agent to match)
    officeWallSide: '#FCC374', officeWallSideSh: '#E9A46B', officeWallBack: '#FBEABF', officeWallBackSh: '#F1C6A3', officeFloor: '#FDB569', officeFloorShadow: '#DC9967',
    officeDesk: '#EE8E5C', officeDeskLeg: '#B4C9DC', officeMonitor: '#B6CEE6', officeChair: '#DE875B', officePot: '#B6D0EA', leaf: '#87A26A', leafSh: '#6F8C57',
    windowFrame: '#FBB973', glassTop: '#FDCDB0', glassLow: '#FFE3B5', cloud: '#FEE6CC', cloudBlue: '#C9D3E3',
    livWall: '#C19280', livWallSh: '#B28173', livLampLight: '#EFC995', livFloor: '#B9714B', livFloorShadow: '#9A5E4C', livRug: '#BE917A',
    sofa: '#A9684C', sofaMid: '#915647', sofaSh: '#764540', pillow: '#DA9855', pillowSh: '#BC8157', lampShade: '#FCB953', lampPole: '#9B8981',
    curtain: '#B98E7F', door: '#935A47', doorFrame: '#AE7156', table: '#CD8B5F', tableSh: '#9C6752', livPot: '#8085A7', livLeaf: '#5F7357',
    stBrickBldg: '#B5714A', stBrickWin: '#854C32', stTan: '#BD8249', stOrange: '#F5A454', stSky: '#FCE9A7', stPier: '#C2753E', stRight: '#E77944',
    stDoorFrame: '#C45831', stDoor: '#88553B', stDoorGlass: '#5E9695', stLedgeTop: '#F4D780', stLedgeFace: '#9F9079', stPave: '#FBE689', stPaveLine: '#D9C26E',
    stTree: '#81A73A', stTreeSh: '#6D9233', stTrunk: '#9D6B3B', stPost: '#A9A8A3', stShadow: '#E2BF69',
    // evening multiply for figures in the living room (ref 07: white -> #D2B9C2, skin -> #CEA596)
    tintEvening: '#D2B9C2',
  };
  // px at 1920x1080. figure: silhouettes of a full-body figure (scale 1); detail: pocket, zip, fingers, drawstrings;
  // set: background outlines (the refs draw sets lighter than figures); setDetail: inner set lines.
  const LW = { figure: 4.6, detail: 2.8, set: 3.4, setDetail: 2.3 };
  const INK = C.ink;

  // ================================================================ determinism, colour, geometry
  function hashStr(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function rng(seed) { return mulberry32(typeof seed === 'number' ? seed : hashStr(seed)); }
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function h2r(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function r2h(r, g, b) { return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
  function mix(a, b, t) { const x = h2r(a), y = h2r(b); return r2h(lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)); }
  function mul(a, b) { const x = h2r(a), y = h2r(b); return r2h(x[0] * y[0] / 255, x[1] * y[1] / 255, x[2] * y[2] / 255); }
  function rgba(h, a) { const x = h2r(h); return `rgba(${x[0]},${x[1]},${x[2]},${a})`; }
  const sinA = Math.sin, cosA = Math.cos;
  const dir = a => [sinA(a), cosA(a)];                                  // 0 = down, + toward +x
  const along = (p, a, l) => [p[0] + sinA(a) * l, p[1] + cosA(a) * l];
  const angOf = (p, q) => Math.atan2(q[0] - p[0], q[1] - p[1]);         // inverse of dir
  const dist = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);
  const lerp2 = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const rot = (p, a) => [p[0] * cosA(a) - p[1] * sinA(a), p[0] * sinA(a) + p[1] * cosA(a)];   // canvas-style rotation

  function P(pts, close) { const p = new Path2D(); for (let i = 0; i < pts.length; i++) i ? p.lineTo(pts[i][0], pts[i][1]) : p.moveTo(pts[i][0], pts[i][1]); if (close !== false) p.closePath(); return p; }
  // smooth curve through points (Catmull-Rom); a point [x, y, 1] is a corner
  function spl(pts, closed, tension) {
    const p = new Path2D(), n = pts.length, k = (tension == null ? 1 : tension) / 6;
    const Q = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = Q(i - 1), p1 = Q(i), p2 = Q(i + 1), p3 = Q(i + 2);
      const c1 = p1[2] ? p1 : [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
      const c2 = p2[2] ? p2 : [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
      p.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
    }
    if (closed) p.closePath();
    return p;
  }
  function ell(x, y, rx, ry, r) { const p = new Path2D(); p.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), r || 0, 0, TAU); return p; }
  function circ(x, y, r) { const p = new Path2D(); p.arc(x, y, Math.max(0.1, r), 0, TAU); return p; }
  function rrect(x, y, w, h, r) { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; }
  function quadPts(a, c, b, n) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } return o; }
  function fs(g, p, fill, lw) { if (fill) { g.fillStyle = fill; g.fill(p); } if (lw) { g.lineWidth = lw; g.strokeStyle = INK; g.stroke(p); } }
  function strokeP(g, p, lw, col) { g.lineWidth = lw; g.strokeStyle = col || INK; g.stroke(p); }
  function polyline(g, pts, lw, col) { strokeP(g, P(pts, false), lw, col); }
  function tubeInk(g, pts, w, lw) { g.lineWidth = w + 2 * lw; g.strokeStyle = INK; g.stroke(P(pts, false)); }
  function tubeFill(g, pts, w, col) { g.lineWidth = w; g.strokeStyle = col; g.stroke(P(pts, false)); }
  function tube(g, pts, w, col, lw) { tubeInk(g, pts, w, lw); tubeFill(g, pts, w, col); }
  // a polyline offset sideways by d (positive = to the left of travel, i.e. -x when travelling +y), trimmed at both ends
  function offsetLine(pts, d, t0, t1) {
    const segs = []; let tot = 0;
    for (let i = 0; i < pts.length - 1; i++) { const l = dist(pts[i], pts[i + 1]); segs.push(l); tot += l; }
    const pointAt = s => { let acc = 0; for (let i = 0; i < segs.length; i++) { if (s <= acc + segs[i] || i === segs.length - 1) { const t = clamp((s - acc) / (segs[i] || 1), 0, 1), a = pts[i], b = pts[i + 1], dx = (b[0] - a[0]) / (segs[i] || 1), dy = (b[1] - a[1]) / (segs[i] || 1); return [a[0] + (b[0] - a[0]) * t - dy * d, a[1] + (b[1] - a[1]) * t + dx * d]; } acc += segs[i]; } };
    const out = [], n = 10; for (let i = 0; i <= n; i++) out.push(pointAt(lerp(t0, t1, i / n) * tot)); return out;
  }
  // rectangle band across a limb near its end: from `back` px before point E to `fwd` px past it, half-width hw
  function bandPts(A, E, back, fwd, hw) {
    const a = angOf(A, E), d = dir(a), n = [d[1], -d[0]];
    const p0 = [E[0] - d[0] * back, E[1] - d[1] * back], p1 = [E[0] + d[0] * fwd, E[1] + d[1] * fwd];
    return [[p0[0] + n[0] * hw, p0[1] + n[1] * hw], [p1[0] + n[0] * hw, p1[1] + n[1] * hw], [p1[0] - n[0] * hw, p1[1] - n[1] * hw], [p0[0] - n[0] * hw, p0[1] - n[1] * hw]];
  }
  // 2-bone IK. bend +1 puts the joint clockwise (on screen) of the line from S to T. k scales both bones (foreshortening).
  function ik2(S, T, L1, L2, bend, stretch) {
    const dx = T[0] - S[0], dy = T[1] - S[1], d = Math.hypot(dx, dy) || 1;
    let l1 = L1, l2 = L2;
    if (stretch && d > l1 + l2 - 1) { const k = d / (l1 + l2 - 1); l1 *= k; l2 *= k; }
    const dd = clamp(d, Math.abs(l1 - l2) + 1, l1 + l2 - 1);
    const base = Math.atan2(dy, dx), off = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
    const a = base + (bend >= 0 ? off : -off), E = [S[0] + Math.cos(a) * l1, S[1] + Math.sin(a) * l1];
    const ex = T[0] - E[0], ey = T[1] - E[1], el = Math.hypot(ex, ey) || 1;
    return [E, [E[0] + ex / el * l2, E[1] + ey / el * l2]];
  }

  // ================================================================ stage
  function stage(bg) {
    document.documentElement.style.cssText = 'margin:0;background:' + (bg || '#222');
    document.body.style.cssText = 'margin:0;background:' + (bg || '#222') + ';overflow:hidden';
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    c.style.cssText = 'display:block;width:100vw;height:56.25vw';
    document.body.appendChild(c);
    const g = c.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round';
    return g;
  }

  // ================================================================ the cast
  const CAST = {
    hero: { skin: C.skin, top: { k: 'hoodie', c: C.hoodie, sh: C.hoodieSh, inner: C.hoodieIn, under: C.white }, bottom: { k: 'trousers', c: C.white, sh: C.whiteSh, cuff: C.white, fly: 1 },
      shoes: { k: 'trainer', c: C.shoeTeal, sole: C.sole, stripes: C.white }, hair: null, brow: INK, h: 1 },
    boss: { skin: C.skin, top: { k: 'shirt', c: C.white, sh: C.whiteSh, cuffC: C.white }, tie: C.tie, belt: C.belt, buckle: C.buckle,
      bottom: { k: 'trousers', c: C.bossTrousers, sh: C.bossTrousersSh, crease: 1, w: 52 }, shoes: { k: 'dress', c: C.shoeBlack, sole: '#262626' },
      hair: { k: 'boss', c: C.bossHair, hi: C.bossHairHi, sh: C.bossHairSh }, brow: '#8E8E8E', browLine: 1, h: 1.01 },
    friend: { skin: C.skin, top: { k: 'tee', c: C.friendTee, sh: C.friendTeeSh }, bottom: { k: 'jeans', c: C.jeans, sh: C.jeansSh, cuff: C.jeansCuff, fly: 1 },
      shoes: { k: 'trainer', c: '#303030', sole: C.white, toe: C.white, laces: C.white }, hair: { k: 'cap', c: C.cap, sh: C.capSh }, brow: INK, h: 1 },
    mum: { skin: C.skin, top: { k: 'cardigan', c: C.mumCardigan, sh: C.mumCardiganSh, under: C.white }, bottom: { k: 'skirt', c: C.mumSkirt, sh: C.mumSkirtSh },
      shoes: { k: 'flat', c: C.shoeBrown }, hair: { k: 'bun', c: C.mumHair, sh: C.mumHairSh }, glasses: 1, brow: '#4A3424', h: 0.965 },
    coworker: { skin: C.cwSkin, top: { k: 'buttonshirt', c: C.cwShirt, sh: C.cwShirtSh }, lanyard: C.lanyard, bottom: { k: 'trousers', c: C.khaki, sh: C.khakiSh },
      shoes: { k: 'dress', c: C.shoeDark, sole: '#3E2F23' }, hair: { k: 'curly', c: '#1A1A1A', hi: '#3C3C3C' }, brow: INK, h: 1.01 },
    stranger: { skin: C.skin, top: { k: 'jacket', c: C.strJacket, sh: C.strJacketSh, under: C.white }, bottom: { k: 'jeans', c: C.strJeans, sh: C.strJeansSh, cuff: '#71A0BD', fly: 1 },
      shoes: { k: 'trainer', c: C.strShoe, sole: C.white, toe: C.white, laces: C.white }, hair: { k: 'bucket', c: C.bucket, sh: C.bucketSh, hi: C.bucketHi }, brow: INK, h: 0.99 },
  };
  // torso geometry per top: shoulder/hem half-widths, hem y, sleeve width, cuff length
  const TOPS = {
    hoodie: { sw: 76, hw: 84, hem: 12, arm: 46, cuff: 20, sleeve: 'long' },
    shirt: { sw: 74, hw: 72, hem: -4, arm: 41, cuff: 15, sleeve: 'long' },
    tee: { sw: 76, hw: 78, hem: 8, arm: 28, sleeveW: 52, sleeve: 'short' },
    cardigan: { sw: 71, hw: 79, hem: -18, arm: 41, cuff: 16, sleeve: 'long' },
    buttonshirt: { sw: 77, hw: 80, hem: 10, arm: 44, cuff: 14, sleeve: 'long' },
    jacket: { sw: 80, hw: 86, hem: 14, arm: 48, cuff: 18, sleeve: 'long' },
  };
  const RIG = { pelvisY: -330, headDy: -370, neckY: -262, R: 100, sh: [72, -200], upper: 118, fore: 110, hipX: 31, hipY: 4, hipXside: 14, thigh: 136, shin: 136, legW: 46, skinLegW: 26 };

  // ================================================================ expressions (as in design/refs/01_expressions.jpg, plus 'guilty' from ref 05)
  // brows: lift / tilt (+ = inner ends up, worried) / arch / thick, in head radii. eyes: r, pupil, lid (upper lid cover 0..1),
  // lidTilt (+ = outer end lower), lower (lower lid), gloss, k:'happy' (closed arcs). mouth: k = smile|frown|grin|o|yawn|grit|scream|wavy|flat.
  const EXPR = {
    neutral: { brows: { lift: 0, tilt: 0, arch: 0.22 }, eyes: { r: 1, pupil: 1 }, mouth: { k: 'smile', w: 0.27, c: 0.09 } },
    happy: { brows: { lift: 0.06, tilt: 0, arch: 0.34 }, eyes: { k: 'happy' }, mouth: { k: 'grin', w: 0.34 }, cheeks: 1 },
    surprised: { brows: { lift: 0.12, tilt: 0.02, arch: 0.34 }, eyes: { r: 1.12, pupil: 0.78 }, mouth: { k: 'o', w: 0.085, h: 0.11 } },
    confused: { browL: { lift: -0.06, tilt: -0.11, arch: 0.04, crease: 1, thick: 1.1 }, browR: { lift: 0.07, tilt: 0, arch: 0.32 }, eyeL: { lid: 0.34, lidTilt: -0.22 }, eyes: { r: 1, pupil: 0.95 }, mouth: { k: 'wavy', w: 0.12 }, look: [-0.15, -0.1] },
    tired: { brows: { lift: 0.02, tilt: 0.11, arch: 0.1 }, eyes: { lid: 0.52, lidTilt: 0.12, lower: 0.12, pupil: 1 }, circles: 1, mouth: { k: 'yawn', w: 0.14, h: 0.18 } },
    angry: { brows: { lift: -0.07, tilt: -0.18, arch: 0.0, thick: 1.4 }, eyes: { lid: 0.3, lidTilt: -0.55, pupil: 1 }, crease: 1, mouth: { k: 'grit', w: 0.19, h: 0.1 } },
    sad: { brows: { lift: 0.02, tilt: 0.14, arch: 0.08 }, eyes: { lid: 0.2, lidTilt: 0.35, pupil: 1.6, gloss: 1, lower: 0.1, pool: 1 }, tears: 1, mouth: { k: 'frown', w: 0.17, c: 0.08 } },
    scared: { brows: { lift: 0.07, tilt: 0.15, arch: 0.1 }, eyes: { r: 1.18, pupil: 0.72 }, sweat: 1, mouth: { k: 'scream', w: 0.26, h: 0.19 } },
    guilty: { brows: { lift: 0.0, tilt: 0.13, arch: 0.06 }, eyes: { lid: 0.42, lidTilt: 0.3, pupil: 1 }, mouth: { k: 'frown', w: 0.13, c: 0.06 }, look: [0.45, 0.75] },
    tired_closed: { brows: { lift: 0.02, tilt: 0.11, arch: 0.1 }, eyes: { lid: 0.62, lidTilt: 0.1, lower: 0.12 }, circles: 1, mouth: { k: 'frown', w: 0.12, c: 0.05 } },
    worried: { brows: { lift: 0.03, tilt: 0.12, arch: 0.08 }, eyes: { r: 1.04, pupil: 0.95 }, mouth: { k: 'flat', w: 0.12 } },
  };
  function resolveExpr(e, over) {
    const base = typeof e === 'object' && e ? e : (EXPR[e] || EXPR.neutral);
    if (!over) return base;
    const o = Object.assign({}, base);
    for (const k in over) o[k] = (typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k]) ? Object.assign({}, base[k], over[k]) : over[k];
    return o;
  }

  // ================================================================ face (drawn in head space: origin = head centre, R = radius)
  function brow(g, cx, cy, s, b, R, col, line) {
    if (!b) return;
    const bw = 0.205 * R, th = 0.08 * R * (b.thick || 1), lift = (b.lift || 0) * R, tilt = (b.tilt || 0) * R, arch = (b.arch || 0) * R;
    const inner = [cx - s * bw, cy - lift - tilt], outer = [cx + s * bw, cy - lift + tilt * 0.45];
    const ctrl = [cx, cy - lift - arch * 0.65 - tilt * 0.3];
    const pts = quadPts(inner, ctrl, outer, 12), top = [], bot = [];
    for (let i = 0; i < pts.length; i++) {
      const t = i / (pts.length - 1), a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)];
      const dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      const w = th * (0.42 + 0.58 * Math.sin(PI * clamp(t * 0.9 + 0.05, 0, 1))) * 0.5;
      top.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); bot.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    }
    const p = P(top.concat(bot.reverse()));
    g.fillStyle = col; g.fill(p);
    if (line) { g.lineWidth = R * 0.016; g.strokeStyle = INK; g.stroke(p); }
    if (b.crease) polyline(g, quadPts([inner[0] - s * 0.015 * R, inner[1] - 0.05 * R], [inner[0] + s * 0.03 * R, inner[1] - 0.1 * R], [inner[0] + s * 0.02 * R, inner[1] - 0.17 * R], 6), R * 0.022);
  }
  function eye(g, ex, ey, s, e, R, look, blink, skin, white, lw) {
    const er = 0.2 * R * (e.r || 1);
    if (e.k === 'happy') { polyline(g, quadPts([ex - er * 0.95, ey + er * 0.25], [ex, ey - er * 1.25], [ex + er * 0.95, ey + er * 0.25], 10), lw * 1.15); return; }
    if (blink >= 0.92) { polyline(g, quadPts([ex - er * 0.95, ey + er * 0.05], [ex, ey + er * 0.6], [ex + er * 0.95, ey + er * 0.05], 10), lw * 1.05); return; }
    const pr = 0.084 * R * (e.pupil || 1), lid = Math.max(e.lid || 0, blink || 0), lt = (e.lidTilt || 0) * er;
    const ball = circ(ex, ey, er);
    g.fillStyle = white; g.fill(ball);
    g.save(); g.clip(ball);
    if (e.pool) { g.fillStyle = rgba(C.tear, 0.9); g.fill(ell(ex, ey + er * 0.95, er * 1.1, er * 0.5)); }
    const m = Math.max(0, er - pr - lw * 0.55) * 0.9, px = ex + clamp(look[0], -1, 1) * m, py = ey + clamp(look[1], -1, 1) * m;
    g.fillStyle = INK; g.fill(circ(px, py, pr));
    if (e.gloss) { g.fillStyle = '#FFFFFF'; g.fill(circ(px - pr * 0.36, py - pr * 0.38, pr * 0.3)); g.fill(circ(px + pr * 0.35, py + pr * 0.3, pr * 0.14)); }
    if (lid > 0) {   // upper lid: skin above a (tilted) line
      const y0 = ey - er + 2 * er * lid, a = [ex - s * er * 1.3, y0 - lt], b = [ex + s * er * 1.3, y0 + lt];
      g.fillStyle = skin; g.fill(P([[a[0], ey - er * 2], [b[0], ey - er * 2], b, a]));
      polyline(g, [a, b], lw * 1.05);
    }
    if (e.lower) { const y1 = ey + er - 2 * er * e.lower; g.fillStyle = skin; g.fill(P([[ex - er * 1.3, y1], [ex + er * 1.3, y1], [ex + er * 1.3, ey + er * 2], [ex - er * 1.3, ey + er * 2]])); polyline(g, quadPts([ex - er * 1.2, y1 + er * 0.1], [ex, y1 - er * 0.12], [ex + er * 1.2, y1 + er * 0.1], 6), lw * 0.7); }
    g.restore();
    strokeP(g, ball, lw * 0.95);
  }
  function mouthDraw(g, mx, my, E, R, open, lw, white) {
    let m = E.mouth || { k: 'smile', w: 0.27, c: 0.09 };
    const openKinds = { grin: 1, o: 1, yawn: 1, scream: 1, grit: 1 };
    if (open > 0.04 && !openKinds[m.k]) {               // talking: an open mouth whose height follows `open`
      const up = m.k === 'smile' ? 1 : m.k === 'frown' ? -1 : 0;
      const w = 0.1 * R + 0.035 * R * open, h = 0.04 * R + 0.15 * R * open, cy = my - 0.02 * R;
      const p = new Path2D(); p.moveTo(mx - w, cy - up * 0.02 * R); p.quadraticCurveTo(mx, cy - h * 0.18 + up * 0.01 * R, mx + w, cy - up * 0.02 * R); p.quadraticCurveTo(mx + w * 0.7, cy + h * 1.15, mx, cy + h * 1.2); p.quadraticCurveTo(mx - w * 0.7, cy + h * 1.15, mx - w, cy - up * 0.02 * R); p.closePath();
      g.fillStyle = C.mouthIn; g.fill(p); g.save(); g.clip(p); g.fillStyle = C.tongue; g.fill(ell(mx + w * 0.1, cy + h * 1.15, w * 0.62, h * 0.5)); g.restore(); strokeP(g, p, lw * 0.85);
      return;
    }
    const w = (m.w || 0.2) * R;
    if (m.k === 'smile' || m.k === 'frown') {
      const c = (m.c || 0.08) * R * (m.k === 'smile' ? 1 : -1);
      polyline(g, quadPts([mx - w, my - c * 0.25], [mx, my + c * 1.5], [mx + w, my - c * 0.25], 12), lw * 0.85);
      if (m.k === 'frown') { [-1, 1].forEach(s => polyline(g, [[mx + s * w * 1.0, my - c * 0.25], [mx + s * w * 1.12, my - c * 0.25 + 0.035 * R]], lw * 0.6)); }
    } else if (m.k === 'flat') {
      polyline(g, quadPts([mx - w, my + 0.01 * R], [mx, my - 0.015 * R], [mx + w, my + 0.01 * R], 8), lw * 0.85);
    } else if (m.k === 'wavy') {
      const p = new Path2D(); p.moveTo(mx - w, my + 0.03 * R); p.bezierCurveTo(mx - w * 0.35, my - 0.045 * R, mx + w * 0.2, my + 0.07 * R, mx + w, my - 0.01 * R); strokeP(g, p, lw * 0.85);
    } else if (m.k === 'grin') {
      const p = new Path2D(); p.moveTo(mx - w, my - 0.04 * R); p.quadraticCurveTo(mx, my + 0.05 * R, mx + w, my - 0.04 * R); p.quadraticCurveTo(mx + w * 0.75, my + 0.32 * R, mx, my + 0.33 * R); p.quadraticCurveTo(mx - w * 0.75, my + 0.32 * R, mx - w, my - 0.04 * R); p.closePath();
      g.fillStyle = C.mouthIn; g.fill(p); g.save(); g.clip(p);
      const t = new Path2D(); t.moveTo(mx - w * 1.2, my - 0.2 * R); t.lineTo(mx + w * 1.2, my - 0.2 * R); t.lineTo(mx + w * 1.2, my + 0.06 * R); t.quadraticCurveTo(mx, my + 0.3 * R, mx - w * 1.2, my + 0.06 * R); t.closePath();
      g.fillStyle = white; g.fill(t); polyline(g, quadPts([mx - w, my + 0.06 * R], [mx, my + 0.26 * R], [mx + w, my + 0.06 * R], 10), lw * 0.55); g.restore();
      strokeP(g, p, lw * 0.85);
      [-1, 1].forEach(s => polyline(g, [[mx + s * w * 0.98, my - 0.08 * R], [mx + s * w * 1.1, my - 0.01 * R]], lw * 0.6));
    } else if (m.k === 'o' || m.k === 'yawn') {
      const h = (m.h || 0.12) * R, p = ell(mx, my + h * 0.15, w, h);
      g.fillStyle = C.mouthIn; g.fill(p); g.save(); g.clip(p); g.fillStyle = C.tongue; g.fill(ell(mx + w * 0.1, my + h * 1.0, w * 0.8, h * 0.55)); g.restore(); strokeP(g, p, lw * 0.85);
    } else if (m.k === 'grit') {
      const h = (m.h || 0.1) * R, p = new Path2D();
      p.moveTo(mx - w, my + h * 0.15); p.quadraticCurveTo(mx, my - h * 0.75, mx + w, my + h * 0.15); p.quadraticCurveTo(mx + w * 1.05, my + h * 0.75, mx + w * 0.8, my + h * 0.9); p.quadraticCurveTo(mx, my + h * 0.55, mx - w * 0.8, my + h * 0.9); p.quadraticCurveTo(mx - w * 1.05, my + h * 0.75, mx - w, my + h * 0.15); p.closePath();
      g.fillStyle = white; g.fill(p); g.save(); g.clip(p);
      polyline(g, quadPts([mx - w, my + h * 0.42], [mx, my + h * 0.05], [mx + w, my + h * 0.42], 8), lw * 0.55);
      [-0.55, -0.18, 0.18, 0.55].forEach(t => polyline(g, [[mx + t * w, my - h], [mx + t * w, my + h]], lw * 0.5)); g.restore(); strokeP(g, p, lw * 0.85);
    } else if (m.k === 'scream') {
      const h = (m.h || 0.14) * R, p = new Path2D();
      p.moveTo(mx - w, my + h * 0.75); p.quadraticCurveTo(mx, my - h * 0.75, mx + w, my + h * 0.75); p.quadraticCurveTo(mx + w * 0.55, my + h * 1.25, mx, my + h * 1.22); p.quadraticCurveTo(mx - w * 0.55, my + h * 1.25, mx - w, my + h * 0.75); p.closePath();
      g.fillStyle = C.mouthIn; g.fill(p); g.save(); g.clip(p);
      const t = new Path2D(); t.moveTo(mx - w * 1.2, my - h); t.lineTo(mx + w * 1.2, my - h); t.lineTo(mx + w * 1.2, my + h * 1.05); t.quadraticCurveTo(mx, my - h * 0.2, mx - w * 1.2, my + h * 1.05); t.closePath();
      g.fillStyle = white; g.fill(t); g.fillStyle = C.tongue; g.fill(ell(mx, my + h * 1.2, w * 0.42, h * 0.3)); g.restore(); strokeP(g, p, lw * 0.85);
    }
  }
  function drop(g, x, y, r, col, lw, a) {   // a tear or sweat drop, point up
    g.save(); g.translate(x, y); g.rotate(a || 0);
    const p = new Path2D(); p.moveTo(0, -r * 1.9); p.bezierCurveTo(r * 0.5, -r * 0.9, r * 1.05, -r * 0.3, r, r * 0.25); p.arc(0, r * 0.25, r, 0, PI); p.bezierCurveTo(-r * 1.05, -r * 0.3, -r * 0.5, -r * 0.9, 0, -r * 1.9); p.closePath();
    fs(g, p, col, lw); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill(ell(-r * 0.35, -r * 0.05, r * 0.2, r * 0.32, 0.3)); g.restore();
  }
  function questionMark(g, x, y, s, lw) {
    const p = new Path2D(); p.moveTo(x - 0.5 * s, y - 0.5 * s); p.bezierCurveTo(x - 0.5 * s, y - 1.15 * s, x + 0.55 * s, y - 1.15 * s, x + 0.5 * s, y - 0.45 * s); p.bezierCurveTo(x + 0.45 * s, y - 0.05 * s, x, y - 0.05 * s, x, y + 0.35 * s);
    strokeP(g, p, lw); g.fillStyle = INK; g.fill(circ(x, y + 0.8 * s, lw * 0.75));
  }
  function face(g, R, o, F) {
    const E = resolveExpr(o.expr, o.face), skin = F.skinC, white = mix('#FFFFFF', F.c('#FFFFFF'), 0.45), lw = F.lw;
    const turn = clamp(o.turn || 0, -1, 1), fx = turn * 0.2 * R, nod = o.nod || 0;
    const eyeY = 0.04 * R + nod * 0.1 * R, ES = 0.385 * R * (1 - 0.12 * Math.abs(turn));
    const look = o.look || E.look || [0, 0], blink = o.blink || 0;
    if (E.circles) [-1, 1].forEach(s => { g.fillStyle = C.circles; g.fill(ell(fx + s * ES, eyeY + 0.08 * R, 0.25 * R, 0.2 * R)); });
    [-1, 1].forEach(s => {
      const e = Object.assign({}, E.eyes, s < 0 ? E.eyeL : E.eyeR), b = Object.assign({}, E.brows, s < 0 ? E.browL : E.browR);
      eye(g, fx + s * ES, eyeY, s, e, R, look, blink, skin, white, lw);
      brow(g, fx + s * ES + s * 0.01 * R, eyeY - 0.36 * R, s, b, R, F.browC, F.ch.browLine);
    });
    if (E.crease) [-1, 1].forEach(s => polyline(g, [[fx + s * 0.05 * R, eyeY - 0.36 * R], [fx + s * 0.035 * R, eyeY - 0.24 * R]], lw * 0.55));
    // nose: a small hook, open toward the facing side
    { const nx = fx + 0.025 * R + turn * 0.04 * R, ny = eyeY + 0.25 * R, r = 0.052 * R; const p = new Path2D(); p.arc(nx, ny, r, -PI / 2 - 0.5, PI / 2 - 0.15, true); strokeP(g, p, lw * 0.75); }
    mouthDraw(g, fx + turn * 0.03 * R, eyeY + 0.47 * R + nod * 0.03 * R, E, R, o.mouth || 0, lw, white);
    if (E.cheeks) [-1, 1].forEach(s => { const bx = fx + s * (ES + 0.25 * R), by = eyeY + 0.02 * R; [-1, 0, 1].forEach(k => polyline(g, [[bx, by + k * 0.055 * R], [bx + s * 0.065 * R, by + k * 0.075 * R]], lw * 0.55)); });
    if (E.tears) {
      const er = 0.175 * R;
      drop(g, fx - ES + er * 0.7, eyeY + er * 0.95, 0.045 * R, C.tear, lw * 0.5, 0.25);
      const x0 = fx + ES + er * 0.25, y0 = eyeY + er * 0.75, p = new Path2D();
      p.moveTo(x0 - 0.03 * R, y0); p.bezierCurveTo(x0 - 0.035 * R, y0 + 0.12 * R, x0 - 0.02 * R, y0 + 0.2 * R, x0 - 0.05 * R, y0 + 0.28 * R); p.arc(x0 - 0.005 * R, y0 + 0.29 * R, 0.048 * R, PI, 0, true); p.bezierCurveTo(x0 + 0.05 * R, y0 + 0.18 * R, x0 + 0.04 * R, y0 + 0.1 * R, x0 + 0.04 * R, y0); p.closePath();
      fs(g, p, C.tear, lw * 0.5);
    }
    if (E.sweat) [[-0.72, -0.28, -0.3, 0.055], [-0.18, -0.86, 0, 0.045], [0.55, -0.74, 0.2, 0.05], [0.9, -0.12, 0.35, 0.055], [-0.88, 0.22, -0.4, 0.045]].forEach(([x, y, a, r]) => drop(g, x * R, y * R, r * R, C.sweat, lw * 0.5, a));
    if (o.marks && E === EXPR.confused || o.marks === true) { questionMark(g, 0.88 * R, -1.05 * R, 0.17 * R, lw * 0.95); questionMark(g, 1.18 * R, -0.85 * R, 0.14 * R, lw * 0.85); }
  }

  // ================================================================ hair and hats (authored at R = 100, head centre origin)
  function hair(g, ch, F, back) {
    const hr = ch.hair; if (!hr) return;
    const lw = F.lw, ld = F.ld, c = F.c;
    if (hr.k === 'bun') {
      if (back) { const b = circ(4, -112, 30); fs(g, b, c(hr.c), lw); polyline(g, quadPts([-18, -118], [4, -96], [26, -116], 6), ld); return; }
      const p = spl([[-103, 34], [-108, -18], [-96, -66], [-62, -100], [-4, -112], [58, -102], [96, -68], [108, -18], [104, 34, 1], [90, 34, 1], [90, -8], [78, -44], [46, -64], [14, -70, 1], [-12, -58], [-46, -56], [-76, -40], [-88, -8], [-90, 34, 1]], true, 0.9);
      fs(g, p, c(hr.c), lw);
      g.save(); g.clip(p); g.fillStyle = c(hr.sh); g.fill(spl([[60, -100], [100, -66], [110, 0], [92, 40], [86, -20], [70, -60]], true)); g.restore(); strokeP(g, p, lw);
      [[[14, -70], [-30, -96], [-70, -82]], [[22, -72], [60, -86], [86, -58]], [[-60, -76], [-86, -40], [-94, 10]]].forEach(q => strokeP(g, spl(q, false), ld));
      return;
    }
    if (back) return;
    if (hr.k === 'boss') {
      const p = spl([[-101, 4], [-107, -42], [-94, -84], [-62, -110], [-16, -120], [30, -122], [66, -116], [94, -102], [100, -84], [106, -50], [104, -14], [100, 6, 1], [88, 6, 1], [86, -30], [78, -54], [58, -66], [34, -56], [14, -66], [-16, -62], [-50, -58], [-76, -44], [-88, -14], [-90, 4, 1]], true, 0.9);
      fs(g, p, c(hr.c), lw);
      g.save(); g.clip(p);
      g.fillStyle = c(hr.hi); g.fill(spl([[70, -60], [96, -70], [108, -20], [104, 10], [88, 6], [86, -30]], true)); g.fill(spl([[-70, -56], [-98, -60], [-108, -10], [-104, 10], [-88, 6], [-86, -26]], true));
      g.fillStyle = c(hr.sh); g.fill(spl([[-40, -110], [20, -118], [70, -104], [30, -96], [-10, -92]], true));
      g.restore(); strokeP(g, p, lw);
      [[[-56, -98], [-20, -90], [12, -68]], [[14, -108], [50, -100], [74, -72]], [[56, -116], [86, -96]], [[-86, -62], [-74, -50]]].forEach(q => strokeP(g, spl(q, false), ld));
    } else if (hr.k === 'cap') {
      const crown = spl([[-101, -38, 1], [-100, -70], [-74, -108], [0, -124], [74, -108], [100, -70], [101, -38, 1], [0, -56]], true, 0.9);
      fs(g, crown, c(hr.c), lw);
      g.save(); g.clip(crown); g.fillStyle = c(hr.sh); g.fill(spl([[40, -116], [92, -86], [104, -40], [70, -48], [64, -90]], true)); g.restore(); strokeP(g, crown, lw);
      [[[0, -122], [-30, -96], [-52, -56]], [[0, -122], [30, -96], [52, -56]]].forEach(q => strokeP(g, spl(q, false), ld));
      fs(g, circ(0, -124, 7), c(hr.c), ld);
      const brim = new Path2D(); brim.moveTo(-102, -44); brim.quadraticCurveTo(0, -66, 102, -44); brim.quadraticCurveTo(110, -36, 104, -30); brim.quadraticCurveTo(0, -42, -104, -30); brim.quadraticCurveTo(-110, -36, -102, -44); brim.closePath();
      fs(g, brim, c(hr.sh), lw);
    } else if (hr.k === 'curly') {
      const r = rng('curls'), circles = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12, a = PI * (1.0 + 1.0 * t); circles.push([Math.cos(a) * 98, -30 + Math.sin(a) * 98, 23 + r() * 6]); }
      for (let i = 0; i < 7; i++) circles.push([-60 + i * 20, -82 + (i % 2) * 5, 14 + r() * 3]);
      circles.push([0, -78, 56], [-40, -86, 48], [40, -86, 48]);
      g.strokeStyle = INK; g.lineWidth = lw * 2; circles.forEach(q => g.stroke(circ(q[0], q[1], q[2])));
      g.fillStyle = c(hr.c); circles.forEach(q => g.fill(circ(q[0], q[1], q[2])));
      g.strokeStyle = c(hr.hi); g.lineWidth = ld * 0.9;
      circles.slice(0, 13).forEach((q, i) => { if (i % 2) return; const p = new Path2D(); p.arc(q[0] * 0.8, q[1] * 0.8 - 6, q[2] * 0.45, 0.6, 2.6); g.stroke(p); });
    } else if (hr.k === 'bucket') {
      const crown = new Path2D(); crown.moveTo(-70, -52); crown.bezierCurveTo(-68, -86, -56, -106, -24, -108); crown.lineTo(24, -108); crown.bezierCurveTo(56, -106, 68, -86, 70, -52); crown.closePath();
      fs(g, crown, c(hr.c), lw);
      g.save(); g.clip(crown); g.fillStyle = c(hr.sh); g.fill(P([[30, -124], [76, -124], [76, -48], [44, -48]])); g.restore(); strokeP(g, crown, lw);
      const brim = new Path2D(); brim.moveTo(-72, -62); brim.quadraticCurveTo(0, -74, 72, -62); brim.quadraticCurveTo(110, -46, 134, -4); brim.quadraticCurveTo(136, 6, 124, 4); brim.quadraticCurveTo(0, -30, -124, 4); brim.quadraticCurveTo(-136, 6, -134, -4); brim.quadraticCurveTo(-110, -46, -72, -62); brim.closePath();
      fs(g, brim, c(hr.hi), lw);
      g.save(); g.clip(brim); g.fillStyle = c(hr.c); g.fill(spl([[-140, 8], [0, -22], [140, 8], [140, 24], [-140, 24]], true)); g.restore(); strokeP(g, brim, lw);
      polyline(g, quadPts([-68, -68], [0, -80], [68, -68], 10), ld);
    }
  }
  function glasses(g, F, turn) {
    const fx = (turn || 0) * 20, ES = 37 * (1 - 0.12 * Math.abs(turn || 0)), y = 4, r = 25, lw = F.lw * 0.85;
    [-1, 1].forEach(s => { const p = circ(fx + s * ES, y, r); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill(p); strokeP(g, p, lw); polyline(g, [[fx + s * (ES + r), y - 4], [s * 97, y - 8]], lw * 0.8); });
    polyline(g, quadPts([fx - ES + r, y - 2], [fx, y - 10], [fx + ES - r, y - 2], 6), lw * 0.8);
  }
  function drawHead(g, ch, F, o) {   // head space, R = 100
    hair(g, ch, F, true);
    fs(g, circ(0, 0, 100), F.skinC, F.lw);
    face(g, 100, o, F);
    hair(g, ch, F, false);
    if (ch.glasses) glasses(g, F, o.turn);
  }

  // ================================================================ hands (wrist at origin, fingers toward +y, thumb toward +x)
  // f: [base x, fan angle, length, curl]; t: [base x, base y, angle, length, curl]
  const HANDS = {
    relax: { f: [[10.5, 0.08, 26, 0.38], [3.5, 0.03, 28, 0.44], [-3.6, -0.04, 27, 0.46], [-10.6, -0.1, 23, 0.4]], t: [15, 11, 0.5, 21, 0.25] },
    flat: { f: [[10.5, 0.03, 29, 0.06], [3.5, 0, 31, 0.06], [-3.6, -0.02, 30, 0.06], [-10.6, -0.05, 26, 0.06]], t: [15, 11, 0.3, 21, 0.05] },
    open: { f: [[10.5, 0.36, 29, 0], [3.5, 0.12, 31, 0], [-3.6, -0.12, 30, 0], [-10.6, -0.36, 25, 0]], t: [16, 12, 1.15, 23, -0.05] },
    point: { f: [[10.5, 0.02, 34, 0], [3.5, 0.1, 17, 1.7], [-3.6, 0.1, 16, 1.7], [-10.6, 0.1, 14, 1.6]], t: [14, 13, -0.15, 18, 0.7] },
    fist: { f: [[10.5, 0.1, 17, 1.7], [3.5, 0.1, 18, 1.7], [-3.6, 0.1, 17, 1.7], [-10.6, 0.1, 15, 1.6]], t: [14, 12, -0.2, 17, 0.6] },
    hold: { f: [[10.5, 0.1, 26, 0.95], [3.5, 0.08, 28, 1.0], [-3.6, 0.06, 27, 1.0], [-10.6, 0.04, 23, 0.95]], t: [15, 10, 0.2, 21, -0.35] },
    chin: { f: [[10.5, 0.45, 28, 1.05], [3.5, 0.1, 17, 1.7], [-3.6, 0.1, 16, 1.7], [-10.6, 0.1, 14, 1.6]], t: [15, 10, 1.25, 22, 0.1] },
    thumb: { f: [[10.5, 0.1, 17, 1.7], [3.5, 0.1, 18, 1.7], [-3.6, 0.1, 17, 1.7], [-10.6, 0.1, 15, 1.6]], t: [12, 8, 2.75, 24, 0] },
    clasp: { f: [[10.5, 0.3, 24, 1.1], [3.5, 0.25, 26, 1.1], [-3.6, 0.2, 25, 1.1], [-10.6, 0.15, 22, 1.05]], t: [15, 9, -0.55, 21, 0.2] },
  };
  const FW = 11.8, TW = 12.6, HAND_K = 0.9, handCache = {};   // HAND_K: overall hand size (refs: a hand is ~0.3 of the head)
  function handParts(name) {
    if (handCache[name]) return handCache[name];
    const sh = HANDS[name] || HANDS.relax;
    const fingers = sh.f.map(([bx, fan, L, curl]) => { const B = [bx, 32], a1 = fan + curl * 0.35, a2 = fan + curl * 1.5, M = along(B, a1, L * 0.52); return [B, M, along(M, a2, L * 0.5)]; });
    const [tx, ty, ta, tl, tc] = sh.t, TB = [tx, ty], TM = along(TB, ta, tl * 0.55);
    return (handCache[name] = { fingers, thumb: [TB, TM, along(TM, ta - tc * 1.2, tl * 0.5)] });
  }
  function drawHand(F, Wr, a, shape, flip, s) {
    if (!shape || shape === 'pocket' || shape === 'none') return;
    const g = F.g, pr = handParts(shape), lw = F.lw * 0.9;
    const k = (s || 1) * HAND_K;
    g.save(); g.translate(Wr[0], Wr[1]); g.rotate(-a); g.scale((flip || 1) * k, k);
    const palm = ell(0, 21, 19, 21);
    g.strokeStyle = INK; g.lineWidth = lw * 2; g.stroke(palm);
    g.lineWidth = FW + 2 * lw; pr.fingers.forEach(f => g.stroke(P(f, false)));
    g.lineWidth = TW + 2 * lw; g.stroke(P(pr.thumb, false));
    g.fillStyle = F.skinC; g.fill(palm); g.strokeStyle = F.skinC;
    g.lineWidth = FW; pr.fingers.forEach(f => g.stroke(P(f, false)));
    g.lineWidth = TW; g.stroke(P(pr.thumb, false));
    g.lineWidth = F.ld * 0.8; g.strokeStyle = INK;
    for (let i = 0; i < 3; i++) {   // short lines in the gaps, from between the tips back toward the knuckles
      const a = pr.fingers[i], b = pr.fingers[i + 1], tip = [(a[2][0] + b[2][0]) / 2, (a[2][1] + b[2][1]) / 2], mid = [(a[1][0] + b[1][0]) / 2, (a[1][1] + b[1][1]) / 2];
      const L = dist(tip, mid) || 1, k0 = 4 / L, k1 = 0.62;
      g.stroke(P([[lerp(tip[0], mid[0], k0), lerp(tip[1], mid[1], k0)], [lerp(tip[0], mid[0], k1), lerp(tip[1], mid[1], k1)]], false));
    }
    { const t = pr.thumb; g.stroke(P([lerp2(t[0], t[1], 0.35), lerp2(t[1], t[2], 0.3)], false)); }
    g.restore();
  }

  // ================================================================ shoes (ankle at origin, toe toward +x, y down)
  const SHOE = {
    trainer: 'M -20,-6 C -30,4 -33,26 -31,38 L -31,46 Q -31,54 -23,54 L 64,54 Q 78,54 78,40 C 78,24 66,15 50,12 C 36,9 26,4 18,-6 Z',
    dress: 'M -19,-6 C -27,6 -30,28 -29,42 L -29,47 Q -29,52 -24,52 L 64,52 Q 74,52 73,43 C 71,31 60,25 46,21 C 33,17 24,6 17,-6 Z',
    flat: 'M -14,-2 C -20,6 -22,16 -21,22 Q -21,27 -16,27 L 48,27 Q 56,27 55,20 C 53,13 43,10 33,9 C 24,8 18,3 13,-2 Z',
  };
  function drawShoe(F, A, sgn, stance, footA) {
    const g = F.g, sp = F.ch.shoes, k = sp.k || 'trainer', lw = F.lw;
    if (typeof SHOE[k] === 'string') SHOE[k] = new Path2D(SHOE[k]);
    const p = SHOE[k];
    g.save(); g.translate(A[0], A[1]); g.rotate(sgn * (footA || 0)); g.scale(sgn * (stance === 'front' ? 0.96 : 1), stance === 'front' ? 0.94 : 1);
    fs(g, p, F.c(sp.c), 0);
    g.save(); g.clip(p);
    if (k === 'trainer') {
      if (sp.toe) { g.fillStyle = F.c(sp.toe); g.fill(ell(72, 42, 22, 22)); polyline(g, quadPts([52, 54], [50, 28], [70, 18], 6), F.ld); }
      g.fillStyle = F.c(sp.sole); g.fillRect(-40, 41, 130, 20); polyline(g, [[-40, 41], [90, 41]], F.ld);
      if (sp.stripes) [[2, 13, 15, 33], [14, 12, 27, 31]].forEach(([x0, y0, x1, y1]) => tube(g, [[x0, y0], [x1, y1]], 4.5, F.c(sp.stripes), F.ld * 0.55));
      if (sp.laces) [[18, 2, 30, 8], [27, 9, 38, 13], [36, 13, 46, 16]].forEach(([x0, y0, x1, y1]) => tube(g, [[x0, y0], [x1, y1]], 3.4, F.c(sp.laces), F.ld * 0.45));
    } else if (k === 'dress') { g.fillStyle = F.c(sp.sole || INK); g.fillRect(-40, 45, 130, 12); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill(ell(44, 30, 18, 6, -0.3)); }
    g.restore();
    strokeP(g, p, lw);
    g.restore();
  }

  // ================================================================ torsos (torso space: origin = pelvis, rotated by lean)
  function torsoPath(t) {
    const sw = t.sw, hw = t.hw, hem = t.hem, ny = -258, sy = -214, nw = 36, p = new Path2D();
    p.moveTo(-nw, ny); p.bezierCurveTo(-nw - 26, ny + 2, -sw + 1, sy - 6, -sw, sy + 16); p.lineTo(-hw, hem - 10); p.quadraticCurveTo(-hw, hem, -hw + 10, hem);
    p.lineTo(hw - 10, hem); p.quadraticCurveTo(hw, hem, hw, hem - 10); p.lineTo(sw, sy + 16); p.bezierCurveTo(sw - 1, sy - 6, nw + 26, ny + 2, nw, ny); p.closePath();
    return p;
  }
  function neck(F, w, y1) { const g = F.g, p = P([[-w, -300], [-w, y1], [w, y1], [w, -300]]); g.fillStyle = F.skinC; g.fill(p); polyline(g, [[-w, -282], [-w, y1]], F.lw * 0.8); polyline(g, [[w, -282], [w, y1]], F.lw * 0.8); }
  function torsoDetails(F, t) {
    const g = F.g, lw = F.lw, ld = F.ld, c = F.c, ch = F.ch, body = F.torsoP;
    if (t.k === 'hoodie') {
      g.save(); g.clip(body); polyline(g, [[-t.hw - 5, -10], [t.hw + 5, -10]], ld); g.restore();
      const pk = new Path2D(); pk.moveTo(-62, -10); pk.quadraticCurveTo(-58, -52, -40, -66); pk.lineTo(40, -66); pk.quadraticCurveTo(58, -52, 62, -10); strokeP(g, pk, ld);
      polyline(g, [[0, -188], [0, t.hem]], ld);
      // the hood: a thick roll sitting on the shoulders, its U-shaped opening around the neck closing to a V at the zip
      const hood = spl([[-76, -204, 1], [-84, -236], [-68, -264], [-36, -282], [0, -288], [36, -282], [68, -264], [84, -236], [76, -204, 1], [40, -214], [0, -222], [-40, -214]], true, 0.9);
      fs(g, hood, c(t.c), lw);
      const open = spl([[-48, -276], [-47, -240], [-30, -208], [0, -186, 1], [30, -208], [47, -240], [48, -276], [0, -290]], true, 0.85);
      g.save(); g.clip(open);
      g.fillStyle = c(t.inner); g.fillRect(-60, -300, 120, 120);
      const tee = new Path2D(); tee.moveTo(-60, -246); tee.quadraticCurveTo(-30, -250, -24, -252); tee.lineTo(24, -252); tee.quadraticCurveTo(30, -250, 60, -246); tee.lineTo(60, -170); tee.lineTo(-60, -170); tee.closePath();
      g.fillStyle = c(t.under); g.fill(tee); strokeP(g, P([[-60, -246], [-24, -252]], false), ld * 0.8); strokeP(g, P([[60, -246], [24, -252]], false), ld * 0.8);
      g.fillStyle = F.skinC; g.fill(P([[-24, -300], [-24, -252], [24, -252], [24, -300]]));
      const nl = new Path2D(); nl.moveTo(-24, -253); nl.quadraticCurveTo(0, -232, 24, -253); g.fillStyle = F.skinC; g.fill(nl); strokeP(g, nl, lw * 0.8);
      polyline(g, [[-24, -290], [-24, -252]], lw * 0.8); polyline(g, [[24, -290], [24, -252]], lw * 0.8);
      g.restore();
      strokeP(g, open, lw);
      [-1, 1].forEach(s => { const pts = quadPts([s * 22, -206], [s * 24, -166], [s * 23, -120], 6); tube(g, pts, 6.5, c(C.white), ld * 0.8); tube(g, [[s * 23, -126], [s * 23, -112]], 8.5, c(C.white), ld * 0.8); });
    } else if (t.k === 'shirt') {
      neck(F, 18, -246);
      [[[-52, -150], [-44, -100]], [[50, -160], [44, -110]], [[-30, -40], [-20, -16]]].forEach(q => polyline(g, q, ld * 0.75));
      [-1, 1].forEach(s => fs(g, P([[s * 38, -266], [s * 4, -248], [s * 27, -213]]), c(t.c), lw * 0.8));
      fs(g, P([[-11, -252], [11, -252], [8, -228], [-8, -228]]), c(ch.tie), lw * 0.75);
      const blade = P([[-8, -229], [8, -229], [17, -66], [0, -46], [-17, -66]]); fs(g, blade, c(ch.tie), lw * 0.8);
      g.save(); g.clip(blade); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(-20, -240, 18, 200); g.restore();
      const belt = new Path2D(); belt.moveTo(-t.hw - 1, -14); belt.quadraticCurveTo(0, -10, t.hw + 1, -14); belt.lineTo(t.hw + 1, 6); belt.quadraticCurveTo(0, 10, -t.hw - 1, 6); belt.closePath();
      fs(g, belt, c(ch.belt), lw * 0.8); fs(g, rrect(-16, -13, 32, 20, 3), c(ch.buckle), lw * 0.6); fs(g, rrect(-8, -7, 16, 8, 2), c(ch.belt), 0);
    } else if (t.k === 'tee') {
      const u = new Path2D(); u.moveTo(-23, -300); u.lineTo(-23, -255); u.quadraticCurveTo(0, -234, 23, -255); u.lineTo(23, -300); u.closePath(); g.fillStyle = F.skinC; g.fill(u);
      polyline(g, [[-21, -282], [-21, -254]], lw * 0.8); polyline(g, [[21, -282], [21, -254]], lw * 0.8);
      polyline(g, quadPts([-24, -255], [0, -233], [24, -255], 8), lw * 0.8); polyline(g, quadPts([-36, -257], [0, -224], [36, -257], 8), ld);
    } else if (t.k === 'cardigan') {
      neck(F, 17, -246);
      const v = new Path2D(); v.moveTo(-30, -256); v.quadraticCurveTo(0, -246, 30, -256); v.quadraticCurveTo(14, -190, 0, -142); v.quadraticCurveTo(-14, -190, -30, -256); v.closePath();
      g.fillStyle = c(t.under); g.fill(v); polyline(g, quadPts([-18, -250], [0, -236], [18, -250], 6), ld);
      polyline(g, quadPts([-30, -256], [-14, -190], [0, -142], 8), lw * 0.8); polyline(g, quadPts([30, -256], [14, -190], [0, -142], 8), lw * 0.8);
      polyline(g, [[0, -142], [0, t.hem]], ld);
      g.save(); g.clip(F.torsoP); polyline(g, [[-t.hw - 5, t.hem - 16], [t.hw + 5, t.hem - 16]], ld); g.restore();
      [-122, -94, -66, -40].forEach(y => fs(g, circ(-1, y, 4.6), c(t.sh), ld * 0.75));
    } else if (t.k === 'buttonshirt') {
      const v = new Path2D(); v.moveTo(-19, -300); v.lineTo(-19, -255); v.lineTo(0, -226); v.lineTo(19, -255); v.lineTo(19, -300); v.closePath(); g.fillStyle = F.skinC; g.fill(v);
      polyline(g, [[-19, -282], [-19, -255]], lw * 0.8); polyline(g, [[19, -282], [19, -255]], lw * 0.8);
      polyline(g, [[0, -228], [0, t.hem]], ld);
      [-200, -160, -120, -80, -40].forEach(y => fs(g, circ(5, y, 3.6), c(t.sh), ld * 0.7));
      fs(g, P([[24, -178], [56, -178], [56, -146], [40, -140], [24, -146]]), c(t.c), ld); polyline(g, [[24, -168], [56, -168]], ld * 0.8);
      [-1, 1].forEach(s => fs(g, P([[s * 38, -264], [s * 6, -244], [s * 3, -228], [s * 30, -214]]), c(t.c), lw * 0.8));
      if (ch.lanyard) {
        [[-26, -252], [22, -250]].forEach(q => tube(g, quadPts(q, [q[0] * 0.6, -170], [-4, -132], 8), 5.5, c(ch.lanyard), ld * 0.55));
        fs(g, rrect(-8, -136, 8, 8, 2), c(C.clip), ld * 0.6);
        fs(g, rrect(-19, -128, 30, 40, 3), c(C.white), ld); fs(g, rrect(-13, -120, 18, 15, 2), c(C.badge), ld * 0.6);
        polyline(g, [[-12, -98], [4, -98]], ld * 0.6);
      }
    } else if (t.k === 'jacket') {
      neck(F, 18, -246);
      const strip = new Path2D(); strip.moveTo(-30, -252); strip.quadraticCurveTo(0, -240, 30, -252); strip.quadraticCurveTo(26, -120, 24, t.hem); strip.lineTo(-22, t.hem); strip.quadraticCurveTo(-26, -120, -30, -252); strip.closePath();
      g.fillStyle = c(t.under); g.fill(strip); polyline(g, quadPts([-19, -250], [0, -235], [19, -250], 6), ld);
      polyline(g, quadPts([-30, -252], [-25, -120], [-22, t.hem], 8), lw * 0.85); polyline(g, quadPts([30, -252], [26, -120], [24, t.hem], 8), lw * 0.85);
      g.save(); g.clip(F.torsoP); polyline(g, [[-t.hw - 5, t.hem - 18], [-22, t.hem - 18]], ld); polyline(g, [[24, t.hem - 18], [t.hw + 5, t.hem - 18]], ld); g.restore();
      [-1, 1].forEach(s => polyline(g, [[s * 64, -84], [s * 54, -54]], ld));
      [-1, 1].forEach(s => fs(g, P([[s * 54, -256], [s * 31, -266], [s * 24, -212], [s * 38, -224]]), c(t.c), lw * 0.8));
    }
  }
  function sleeveShort(S, E, t) { // tee sleeve polygon over the upper arm
    const a = angOf(S, E), d = dir(a), n = [d[1], -d[0]], M = along(S, a, dist(S, E) * 0.58), w0 = t.sleeveW / 2, w1 = t.sleeveW / 2 + 2;
    const p = new Path2D(); p.moveTo(S[0] + n[0] * w0, S[1] + n[1] * w0); p.lineTo(M[0] + n[0] * w1, M[1] + n[1] * w1); p.lineTo(M[0] - n[0] * w1, M[1] - n[1] * w1); p.lineTo(S[0] - n[0] * w0, S[1] - n[1] * w0);
    p.arc(S[0], S[1], w0, Math.atan2(-n[1], -n[0]), Math.atan2(n[1], n[0])); p.closePath();
    return { p, M };
  }

  // ================================================================ poses
  // A pose: { stance: 'front'|'side', pelvis: [dx, dy] or {seat}, lean, shoulders (raise px), head: {tilt, turn, nod, sink},
  //   armL/armR: {a, e} (upper-arm angle, elbow bend) or {ik: [x, y], bend: ±1}, ul/fl (bone length factors), hand, flip, hrot, hs, z: 'back'
  //   legL/legR: {a, k, foot} or {pts: [hip, knee, ankle]}, z: 'back' }  — all in body space for facing 1.
  const STAND_ARML = { a: -0.1, e: 0.03, hand: 'relax', hs: 1.1 }, STAND_ARMR = { a: 0.1, e: -0.03, hand: 'relax', hs: 1.1 };
  const STAND_LEGS = { legL: { a: -0.02, k: 0 }, legR: { a: 0.02, k: 0 } };
  const POSES = {
    stand: o => Object.assign({ stance: 'front', armL: STAND_ARML, armR: STAND_ARMR }, STAND_LEGS),
    walk: o => {
      const p = o.phase || 0, s = sinA(TAU * p), c = cosA(TAU * p), A = o.stride || 0.4;
      const leg = (a, k) => ({ a, k, foot: 0.45 * k + 0.32 * Math.max(0, -a / A) - 0.14 * Math.max(0, a / A) });
      const aL = -A * s, aR = A * s;
      return { stance: 'side', ground: true, lean: 0.03, head: { turn: 0.3 },
        legL: leg(aL, 0.06 + 0.85 * Math.pow(Math.max(0, -c), 1.5)), legR: Object.assign(leg(aR, 0.06 + 0.85 * Math.pow(Math.max(0, c), 1.5)), { z: 'back' }),
        armR: { a: 0.05 + 0.34 * (0.5 - 0.5 * s), e: 0.12 + 0.3 * (0.5 - 0.5 * s), hand: 'relax', hs: 1.1 }, armL: { a: -0.05 - 0.32 * (0.5 + 0.5 * s), e: 0.1 + 0.12 * (0.5 + 0.5 * s), hand: 'relax', hs: 1.1 } };
    },
    think: o => Object.assign({ stance: 'front', head: { tilt: -0.05 },
      armL: { ik: [-6, -236], bend: 1, ul: 0.62, hand: 'chin', flip: -1, hrot: 0.1 }, armR: { ik: [46, -46], bend: -1, ul: 0.9, hand: 'pocket' } }, STAND_LEGS),
    point: o => Object.assign({ stance: 'front', armL: STAND_ARML, armR: { a: 1.62, e: 0.12, hand: 'point', flip: -1 } }, STAND_LEGS),
    wave: o => Object.assign({ stance: 'front', armL: STAND_ARML, armR: { a: 2.5 + 0.12 * sinA(TAU * (o.phase || 0)), e: 0.5, hand: 'open', flip: 1 } }, STAND_LEGS),
    shrug: o => Object.assign({ stance: 'front', shoulders: 12, head: { tilt: 0.1, sink: 8 },
      armL: { a: -0.16, e: -1.62, fl: 0.62, hand: 'open', flip: -1, hrot: -0.2 }, armR: { a: 0.16, e: 1.62, fl: 0.62, hand: 'open', flip: 1, hrot: 0.2 } }, STAND_LEGS),
    hands_clasped: o => Object.assign({ stance: 'front', head: { tilt: 0.05 },
      armL: { ik: [-6, 22], bend: 1, hand: 'flat', flip: 1, hrot: 0.2 }, armR: { ik: [8, 30], bend: -1, hand: 'clasp', flip: -1, hrot: -0.5 } }, { legL: { a: -0.005, k: 0 }, legR: { a: 0.005, k: 0 } }),
    thumbs_up: o => Object.assign({ stance: 'front', armL: STAND_ARML, armR: { a: 0.55, e: 2.15, hand: 'thumb', flip: -1 } }, STAND_LEGS),
    hand_mouth: o => Object.assign({ stance: 'front', armL: { ik: [-2, -268], bend: 1, ul: 0.6, hand: 'flat', flip: -1, hrot: 0.15 }, armR: STAND_ARMR }, STAND_LEGS),
    hold_phone: o => {
      const mode = o.mode || 'ear', base = Object.assign({ stance: 'front', armL: STAND_ARML }, STAND_LEGS);
      if (mode === 'ear') return Object.assign(base, { head: { tilt: 0.07 }, armR: { ik: [70, -322], bend: 1, ul: 0.85, hand: 'hold', flip: -1, hrot: 0.2 }, prop: { k: 'phone', at: [80, -362], a: 0.25, s: 0.9 } });
      if (mode === 'show') return Object.assign(base, { armL: { a: -0.14, e: -2.72, hand: 'hold', flip: 1, hrot: 0.1 }, armR: STAND_ARMR, prop: { k: 'phone', hand: 'L', along: 40, off: [-6, 0], a: -0.22, s: 1.05, screen: 1, over: true } });
      if (mode === 'out') return Object.assign(base, { armR: { ik: [168, -180], bend: 1, ul: 0.95, hand: 'hold', flip: 1, hrot: -0.35 }, prop: { k: 'phone', hand: 'R', along: 40, off: [4, 0], a: 0.28, s: 1, screen: 1 } });
      return Object.assign(base, { head: { nod: 0.6 }, armR: { ik: [40, -132], bend: -1, fl: 0.62, hand: 'hold', flip: -1, hrot: 0.35 }, prop: { k: 'phone', hand: 'R', along: 54, off: [0, 0], a: -0.1, s: 0.95, screen: 1 } });
    },
    hold_laptop: o => Object.assign({ stance: 'front', armL: { ik: [62, -84], bend: 1, fl: 0.75, hand: 'flat', flip: -1, hrot: -0.55 }, armR: { ik: [236, -74], bend: -1, fl: 1, hand: 'hold', flip: -1, hrot: 0.9 },
      prop: { k: 'laptop', at: [150, -122], a: -0.05, s: 1.3, under: 'R' } }, STAND_LEGS),
    hold_clipboard: o => Object.assign({ stance: 'front', head: { nod: 0.4 }, armL: { ik: [-46, -70], bend: 1, fl: 0.5, hand: 'hold', flip: -1, hrot: -1.3 }, armR: { ik: [30, -128], bend: -1, fl: 0.55, hand: 'hold', flip: -1, hrot: 0.2 },
      prop: { k: 'clipboard', at: [-8, -112], a: -0.25, s: 0.95 } }, STAND_LEGS),
    hold_box: o => Object.assign({ stance: 'front', armL: { ik: [-62, -118], bend: 1, fl: 0.6, hand: 'flat', flip: -1, hrot: 0.4 }, armR: { ik: [76, -100], bend: -1, fl: 0.6, hand: 'hold', flip: -1, hrot: 1.2 },
      prop: { k: 'box', at: [10, -150], s: 1 } }, STAND_LEGS),
    sit: o => {
      const seat = o.seat == null ? 200 : o.seat, view = o.view || 'side', py = -(seat + 24), floorY = -54 - py;
      const pose = { stance: view === 'side' ? 'side' : 'front', ground: false, pelvis: { y: py }, lean: -0.03, sit: view };
      if (view === 'side') {
        const kneeY = 6;
        pose.legR = { pts: [[12, -4], [168, kneeY - 6], [184, floorY]], z: 'back', foot: 0 };
        pose.legL = { pts: [[-10, 4], [156, kneeY + 4], [168, floorY]], foot: 0 };
        pose.armL = { ik: [98, -28], bend: 1, ul: 0.9, hand: 'flat', flip: -1, hrot: 0.6 };
        pose.armR = { ik: [130, -40], bend: -1, ul: 0.85, hand: 'flat', flip: -1, hrot: 0.4 };
      } else {
        pose.legL = { pts: [[-34, 4], [-40, 42], [-42, floorY]] }; pose.legR = { pts: [[34, 4], [40, 42], [42, floorY]] };
        pose.armL = { ik: [-40, 8], bend: 1, ul: 0.85, hand: 'flat', flip: 1, hrot: 0.1 }; pose.armR = { ik: [40, 8], bend: -1, ul: 0.85, hand: 'flat', flip: -1, hrot: -0.1 };
      }
      return pose;
    },
  };
  // the arms a held prop takes over (merged after the pose, so `holding` works with walk, stand, sit...)
  const HOLD = {
    clipboard: p => p.stance === 'side'
      ? { armR: { ik: [34, -112], bend: -1, fl: 0.5, hand: 'hold', flip: -1, hrot: 0.3 }, prop: { k: 'clipboard', at: [10, -150], a: -0.32, s: 0.92 } }
      : { armL: { ik: [-50, -106], bend: 1, fl: 0.5, hand: 'hold', flip: -1, hrot: -0.9 }, prop: { k: 'clipboard', at: [-78, -122], a: 0.06, s: 0.92 } },
    phone: p => p.prop && p.prop.k === 'phone' ? {} : POSES.hold_phone({ mode: 'front' }),
    // the cup held in front of the chest by the near hand, handle toward the hand, the cup itself clear of the fingers (ref 03)
    mug: p => ({ armL: { ik: [-18, -100], bend: 1, fl: 0.58, hand: 'fist', flip: -1, hrot: -0.25, hs: 0.95 }, prop: { k: 'mug', hand: 'L', along: 0, off: [48, -26], s: 1.25, steam: 0.15, handle: -1, over: true } }),
    // raised to the mouth by the far hand, elbow out to the side, forearm up (ref 07)
    sip: p => ({ armR: { ik: [60, -292], bend: 1, ul: 0.2, hand: 'fist', flip: 1, hrot: 0.2, hs: 0.95 }, prop: { k: 'mug', hand: 'R', along: 0, off: [-44, -22], s: 1.2, steam: 0.15, handle: 1, over: true }, head: Object.assign({}, p.head, { tilt: -0.05 }) }),
    laptop: p => POSES.hold_laptop({}),
    box: p => POSES.hold_box({}),
  };

  // ================================================================ props (world space; s = scale, a = rotation)
  const PROPS = {};
  const tc = (o, h) => (o && o.tint ? mul(h, o.tint) : h);   // props take the scene's multiply tint too
  PROPS.phone = function (g, x, y, o) {
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.85) / s;
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    if (o.glow) { const gr = g.createRadialGradient(0, 0, 10, 0, 0, 90); gr.addColorStop(0, rgba(C.phoneGlow, 0.7 * o.glow)); gr.addColorStop(1, rgba(C.phoneGlow, 0)); g.fillStyle = gr; g.fillRect(-90, -90, 180, 180); }
    const body = rrect(-20, -37, 40, 74, 8); fs(g, body, tc(o, C.phone), lw);
    if (o.screen !== 0) { const sc = rrect(-15, -31, 30, 60, 4); g.fillStyle = o.glow ? mix(C.phoneScreen, '#FFFFFF', 0.35 * o.glow) : C.phoneScreen; g.fill(sc); g.save(); g.clip(sc); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill(P([[-20, 6], [20, -26], [20, -14], [-20, 18]])); g.restore(); strokeP(g, sc, lw * 0.5); }
    g.restore();
  };
  PROPS.phoneFlat = function (g, x, y, o) {   // lying on a table, seen from above at an angle
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.85) / s;
    g.save(); g.translate(x, y); g.scale(s, s);
    if (o.glow) { g.save(); g.scale(1, 0.42); const gr = g.createRadialGradient(0, -10, 10, 0, -10, 120); gr.addColorStop(0, rgba(C.phoneGlow, 0.5 * o.glow)); gr.addColorStop(1, rgba(C.phoneGlow, 0)); g.fillStyle = gr; g.fill(circ(0, -10, 120)); g.restore(); }
    const q = [[-58, -10], [44, -26], [64, 2], [-38, 18]], th = [[-38, 18], [64, 2], [64, 9], [-38, 25]];
    fs(g, P(th), tc(o, '#2A2B31'), lw); fs(g, spl(q.map(p => [p[0], p[1], 1]), true), tc(o, C.phone), lw);
    const sc = P([[-48, -8], [40, -21], [55, 0], [-33, 13]]); g.fillStyle = o.glow ? mix(C.phoneScreen, '#FFFFFF', 0.4 * o.glow) : C.phoneScreen; g.fill(sc);
    g.save(); g.clip(sc); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill(P([[-20, -20], [0, -24], [-12, 20], [-30, 20]])); g.restore(); strokeP(g, sc, lw * 0.5);
    g.restore();
  };
  PROPS.laptop = function (g, x, y, o) {   // the lid's back toward us, base below it
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.9) / s;
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    fs(g, P([[-94, 34], [88, 22], [100, 31], [-82, 45]]), C.laptopSh, lw);
    const lid = new Path2D(); lid.moveTo(-94, 34); lid.lineTo(-81, -56); lid.quadraticCurveTo(-80, -62, -73, -63); lid.lineTo(88, -74); lid.quadraticCurveTo(95, -74, 94, -67); lid.lineTo(88, 22); lid.closePath();
    fs(g, lid, C.laptop, lw); g.save(); g.clip(lid); g.fillStyle = C.laptopSh; g.fill(P([[-96, 36], [90, 24], [90, 14], [-95, 26]])); g.restore(); strokeP(g, lid, lw); g.fillStyle = '#FFFFFF'; g.fill(ell(4, -20, 8, 8.5));
    g.restore();
  };
  PROPS.laptopSide = function (g, x, y, o) {   // on a lap or desk, seen from the side: lid opening away from us
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.9) / s;
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    fs(g, P([[-70, 0], [70, -8], [74, 4], [-66, 12]]), C.laptopSh, lw);
    fs(g, P([[-70, 0], [-90, -84], [46, -96], [70, -8]]), C.laptop, lw); g.fillStyle = '#FFFFFF'; g.fill(ell(-10, -46, 8, 9));
    g.restore();
  };
  PROPS.clipboard = function (g, x, y, o) {
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.9) / s;
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    const b = rrect(-48, -62, 96, 124, 7); fs(g, b, C.clipboard, 0);
    if (o.front) { fs(g, P([[-40, -50], [40, -50], [40, 54], [-40, 54]]), C.paper, LW.detail / s); for (let i = 0; i < 6; i++) polyline(g, [[-30, -32 + i * 14], [30 - (i % 3) * 10, -32 + i * 14]], 2.2 / s, '#9AA1A8'); }
    else { g.save(); g.clip(b); g.fillStyle = C.clipboardSh; g.fillRect(28, -70, 30, 140); g.restore(); }
    strokeP(g, b, lw);
    fs(g, rrect(-20, -74, 40, 20, 5), C.clip, lw * 0.8); fs(g, circ(0, -76, 5), C.clip, lw * 0.6);
    g.restore();
  };
  PROPS.box = function (g, x, y, o) {   // cardboard box, centre of the front face at x, y
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.9) / s, w = 74, h = 54, dx = 26, dy = 18;
    g.save(); g.translate(x, y); g.scale(s, s);
    fs(g, P([[-w, -h], [w, -h], [w, h], [-w, h]]), C.box, lw);
    fs(g, P([[w, -h], [w + dx, -h - dy], [w + dx, h - dy], [w, h]]), C.boxSh, lw);
    fs(g, P([[-w, -h], [-w + dx, -h - dy], [w + dx, -h - dy], [w, -h]]), C.boxTop, lw);
    polyline(g, [[-w + dx * 0.5, -h - dy * 0.5], [w + dx * 0.5, -h - dy * 0.5]], LW.detail / s);
    fs(g, P([[-10, -h - dy], [12, -h - dy], [-4, -h], [-26, -h]]), C.tape, LW.detail * 0.8 / s);
    fs(g, P([[-26, -h], [-4, -h], [-4, -h + 24], [-10, -h + 30], [-16, -h + 24], [-26, -h + 28]]), C.tape, LW.detail * 0.8 / s);
    g.restore();
  };
  PROPS.mug = function (g, x, y, o) {   // a white cup; x, y = its centre
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.85) / s;
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    if (o.steam != null) { const t = o.steam; g.lineCap = 'round'; [-12, 0, 12].forEach((sx, i) => { const p = new Path2D(), ph = TAU * (t + i * 0.37), n = i === 1 ? 10 : 7; p.moveTo(sx, -28); for (let k = 1; k <= n; k++) p.lineTo(sx + sinA(ph + k * 0.8) * 5.5, -28 - k * 6); strokeP(g, p, 3.2 / s, tc(o, C.steam)); }); }
    const hs = o.handle || 1, mugC = tc(o, C.mug), hdl = new Path2D(); if (hs > 0) hdl.arc(24, 2, 11, -PI / 2, PI / 2); else hdl.arc(-24, 2, 11, PI / 2, PI * 1.5); g.lineWidth = 7 + 2 * lw; g.strokeStyle = INK; g.stroke(hdl); g.lineWidth = 7; g.strokeStyle = mugC; g.stroke(hdl);
    const b = new Path2D(); b.moveTo(-26, -18); b.lineTo(26, -18); b.quadraticCurveTo(26, 22, 6, 24); b.lineTo(-6, 24); b.quadraticCurveTo(-26, 22, -26, -18); b.closePath();
    fs(g, b, mugC, lw); g.save(); g.clip(b); g.fillStyle = tc(o, '#E4E1DE'); g.fillRect(-28 * hs, -20, 12 * hs, 50); g.restore(); strokeP(g, b, lw); fs(g, ell(0, -18, 26, 7), mugC, lw); g.fillStyle = tc(o, C.coffee); g.fill(ell(0, -17, 20, 4.5));
    g.restore();
  };
  function bellPath() { const p = new Path2D(); p.moveTo(-14, 10); p.quadraticCurveTo(-11, 6, -11, -2); p.bezierCurveTo(-11, -14, -6, -18, 0, -18); p.bezierCurveTo(6, -18, 11, -14, 11, -2); p.quadraticCurveTo(11, 6, 14, 10); p.closePath(); return p; }
  function icon(g, kind, lw, col) {   // icons at ~40 px, white with ink lines
    col = col || '#FFFFFF';
    if (kind === 'mail') { fs(g, rrect(-17, -12, 34, 24, 3), col, lw); polyline(g, [[-16, -10], [0, 3], [16, -10]], lw); }
    else if (kind === 'chat') { const p = new Path2D(); p.ellipse(0, -2, 16, 12, 0, 0.75 * PI, 0.62 * PI); p.lineTo(-14, 14); p.closePath(); fs(g, p, col, lw); [-6, 0, 6].forEach(x => { g.fillStyle = INK; g.fill(circ(x, -2, 1.9)); }); }
    else if (kind === 'bell') { fs(g, bellPath(), col, lw); fs(g, circ(0, 13, 3.5), col, lw * 0.8); polyline(g, [[0, -18], [0, -21]], lw); }
    else if (kind === 'call' || kind === 'missed') {
      g.save(); g.translate(-3, 1); g.rotate(-2.36);
      const arc = new Path2D(); arc.arc(0, 9, 16, PI * 1.12, PI * 1.88);
      const e1 = rrect(-24, -2, 14, 16, 6), e2 = rrect(10, -2, 14, 16, 6);
      g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 10 + 2 * lw; g.stroke(arc); g.lineWidth = 2 * lw; g.stroke(e1); g.stroke(e2);
      g.strokeStyle = col; g.lineWidth = 10; g.stroke(arc); g.fillStyle = col; g.fill(e1); g.fill(e2);
      g.restore();
      if (kind === 'missed') { const ar = [[23, -21], [12, -10]], hd = [[12, -18], [12, -10], [20, -10]]; [ar, hd].forEach(q => { strokeP(g, P(q, false), 4 + 2 * lw, INK); }); [ar, hd].forEach(q => strokeP(g, P(q, false), 4, col)); }
    }
  }
  PROPS.notif = function (g, x, y, o) {   // an app notification: coloured rounded square with a tail and a white icon, no words
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.8) / s, tail = o.tail == null ? -1 : o.tail;
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    const p = new Path2D(); p.roundRect(-32, -28, 64, 54, 10);
    const tp = P([[tail * 4, 22], [tail * 16, 22], [tail * 8, 40]]);
    g.lineWidth = lw * 2; g.strokeStyle = INK; g.stroke(p); g.stroke(tp); g.fillStyle = o.bg || C.bubRed; g.fill(p); g.fill(tp);
    icon(g, o.kind || 'mail', LW.detail * 0.8 / s);
    if (o.badge) { fs(g, circ(28, -26, 9), C.badgeRed, lw * 0.8); }
    g.restore();
  };
  PROPS.chatBubble = function (g, x, y, o) {   // the white 'typing' speech bubble from ref 06
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.8) / s, tail = o.tail == null ? -1 : o.tail;
    g.save(); g.translate(x, y); g.scale(s, s);
    const p = new Path2D(); p.roundRect(-34, -22, 68, 42, 9); const tp = P([[tail * 2, 18], [tail * 16, 18], [tail * 4, 34]]);
    g.lineWidth = lw * 2; g.strokeStyle = INK; g.stroke(p); g.stroke(tp); g.fillStyle = '#FFFFFF'; g.fill(p); g.fill(tp);
    [-13, 0, 13].forEach(cx => { g.fillStyle = '#7F8C9B'; g.fill(circ(cx, -1, 4.5)); });
    if (o.badge !== false) fs(g, circ(-tail * 32, -22, 8), C.badgeRed, lw * 0.8);
    g.restore();
  };
  PROPS.bell = function (g, x, y, o) {   // a yellow bell, ringing
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.8) / s;
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s * 1.3, s * 1.3);
    fs(g, bellPath(), C.bell, lw / 1.3); fs(g, circ(0, 13, 4), C.bell, lw / 1.3 * 0.8); polyline(g, [[0, -18], [0, -22]], lw / 1.3);
    if (o.ring !== false) [-1, 1].forEach(sd => { [0, 1].forEach(k => { const p = new Path2D(); p.arc(0, -2, 20 + k * 6, sd > 0 ? -0.55 : PI - 0.55, sd > 0 ? 0.55 : PI + 0.55); strokeP(g, p, LW.detail * 0.75 / s / 1.3); }); });
    g.restore();
  };
  PROPS.buzz = function (g, x, y, o) {   // vibration marks either side of an object (rx: half width)
    o = o || {}; const rx = o.rx || 70, lw = o.lw || LW.detail * 0.9, t = o.t || 0;
    [-1, 1].forEach(sd => [0, 1].forEach(k => { const jx = sinA(TAU * (t * 3 + k * 0.3)) * 3; const p = new Path2D(); p.arc(x + sd * (rx - 30) + jx, y, 30 + k * 10, sd > 0 ? -0.5 : PI - 0.5, sd > 0 ? 0.5 : PI + 0.5); strokeP(g, p, lw); }));
    [[-0.6, 1], [0.7, 1], [-0.85, -0.9], [0.9, -0.8]].forEach(([fx, fy]) => { const cx = x + fx * (rx + 10), cy = y + fy * 22; polyline(g, [[cx - 7, cy - 3], [cx - 2, cy + 3], [cx + 3, cy - 3], [cx + 8, cy + 3]], lw * 0.85); });
  };
  PROPS.thought = function (g, x, y, o) {   // a thought cloud with an icon inside; tail: list of [x, y, r] puffs toward the thinker
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.8) / s, w = o.w || 150, h = o.h || 100;
    g.save(); g.translate(x, y); g.scale(s, s);
    const puffs = []; const n = 9; for (let i = 0; i < n; i++) { const a = TAU * i / n + 0.2; puffs.push([Math.cos(a) * w * 0.78, Math.sin(a) * h * 0.72, (i % 2 ? 0.36 : 0.42) * h]); }
    (o.tail || []).forEach(t => fs(g, circ((t[0] - x) / s, (t[1] - y) / s, t[2] / s), '#FFFFFF', lw));
    g.strokeStyle = INK; g.lineWidth = lw * 2; puffs.forEach(q => g.stroke(circ(q[0], q[1], q[2]))); g.stroke(ell(0, 0, w * 0.8, h * 0.75));
    g.fillStyle = '#FFFFFF'; puffs.forEach(q => g.fill(circ(q[0], q[1], q[2]))); g.fill(ell(0, 0, w * 0.8, h * 0.75));
    if (o.icon === 'plate' || !o.icon) PROPS.plateIcon(g, 0, 4, { s: h / 110, lw: lw * 0.8 });
    g.restore();
  };
  PROPS.plateIcon = function (g, x, y, o) {
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.detail) / s;
    g.save(); g.translate(x, y); g.scale(s, s);
    fs(g, circ(0, 0, 40), '#FFFFFF', lw); strokeP(g, circ(0, 0, 30), lw * 0.6, '#B8BEC4');
    fs(g, spl([[-22, -4], [-12, -16], [8, -14], [18, -2], [10, 12], [-14, 12]], true), C.steak, lw); [[-12, -6, 4, -10], [-10, 4, 8, 0]].forEach(([a, b, c, d]) => polyline(g, [[a, b], [c, d]], lw * 0.6, '#6B3F27'));
    fs(g, ell(14, -14, 8, 5, -0.6), C.herb, lw * 0.7); fs(g, ell(20, -6, 7, 4.5, 0.4), C.herb, lw * 0.7);
    [[16, 12], [24, 6], [22, 16]].forEach(([cx, cy]) => fs(g, circ(cx, cy, 4.2), C.carrot, lw * 0.6));
    fs(g, P([[-58, -36], [-56, -2], [-60, 34], [-52, 34], [-54, -2], [-52, -36]]), C.cutlery, lw * 0.8); [-58, -55, -52].forEach(fx => polyline(g, [[fx, -36], [fx, -20]], lw * 0.5));
    const kn = new Path2D(); kn.moveTo(54, -38); kn.quadraticCurveTo(64, -20, 58, 0); kn.lineTo(58, 34); kn.lineTo(52, 34); kn.lineTo(52, -38); kn.closePath(); fs(g, kn, C.cutlery, lw * 0.8);
    g.restore();
  };
  PROPS.bulb = function (g, x, y, o) {   // the idea bulb with rays (and an optional glow and sparkles)
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.85) / s;
    g.save(); g.translate(x, y); g.scale(s, s);
    if (o.glow) { const gr = g.createRadialGradient(0, -10, 10, 0, -10, 130); gr.addColorStop(0, rgba('#FFF4B8', 0.85 * o.glow)); gr.addColorStop(1, rgba('#FFF4B8', 0)); g.fillStyle = gr; g.fill(circ(0, -10, 130)); }
    if (o.rays !== false) for (let i = 0; i < 9; i++) { const a = -PI + i * PI / 8 - PI * 0.0, r0 = 52, r1 = 70; const dx = Math.cos(a - 0), dy = Math.sin(a); if (dy > 0.3) continue; polyline(g, [[dx * r0, -12 + dy * r0], [dx * r1, -12 + dy * r1]], lw * 0.8); }
    for (let i = 0; i < 2; i++) { const a = PI * (0.18 + 0.64 * i); polyline(g, [[Math.cos(a) * 52, -12 + Math.sin(a) * 30], [Math.cos(a) * 68, -12 + Math.sin(a) * 38]], lw * 0.8); }
    const glass = new Path2D(); glass.arc(0, -14, 34, PI * 0.78, PI * 0.22); glass.quadraticCurveTo(16, 12, 15, 26); glass.lineTo(-15, 26); glass.quadraticCurveTo(-16, 12, -26, 7.5); glass.closePath();
    fs(g, glass, C.bulb, lw);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill(ell(-14, -26, 6, 10, 0.5));
    polyline(g, [[-7, 26], [-7, 2], [-12, -10], [-4, -14], [0, -6], [4, -14], [12, -10], [7, 2], [7, 26]], lw * 0.55);
    fs(g, rrect(-16, 26, 32, 22, 4), C.bulbBase, lw); polyline(g, [[-16, 33], [16, 33]], lw * 0.55); polyline(g, [[-16, 40], [16, 40]], lw * 0.55); fs(g, rrect(-8, 48, 16, 7, 3), '#7C8288', lw * 0.8);
    if (o.sparkle) [[-80, -40, 9], [84, -60, 7], [70, 20, 6], [-64, 30, 6]].forEach(([sx, sy, r]) => { const p = new Path2D(); p.moveTo(sx, sy - r); p.quadraticCurveTo(sx, sy, sx + r, sy); p.quadraticCurveTo(sx, sy, sx, sy + r); p.quadraticCurveTo(sx, sy, sx - r, sy); p.quadraticCurveTo(sx, sy, sx, sy - r); fs(g, p, '#FFF2A8', lw * 0.5); });
    g.restore();
  };
  PROPS.clock = function (g, x, y, o) {   // wall clock; h, m set the hands; numerals as in the ref
    o = o || {}; const r = o.r || 95, lw = o.lw || LW.set, hh = o.h == null ? 5 : o.h, mm = o.m || 0;
    if (o.shadow) { g.fillStyle = o.shadow; g.fill(circ(x + r * 0.07, y + r * 0.1, r)); }
    fs(g, circ(x, y, r), C.clockRim, lw); fs(g, circ(x, y, r * 0.82), C.clockFace, lw * 0.7);
    g.fillStyle = '#2A2A2A'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 ${Math.round(r * 0.17)}px "Inter", "Helvetica Neue", Arial, sans-serif`;
    for (let i = 1; i <= 12; i++) { const a = TAU * i / 12; g.fillText(String(i), x + sinA(a) * r * 0.64, y - cosA(a) * r * 0.64 + r * 0.01); }
    const ha = TAU * ((hh % 12) + mm / 60) / 12, ma = TAU * mm / 60;
    g.lineCap = 'round'; polyline(g, [[x, y], [x + sinA(ha) * r * 0.4, y - cosA(ha) * r * 0.4]], r * 0.065); polyline(g, [[x, y], [x + sinA(ma) * r * 0.6, y - cosA(ma) * r * 0.6]], r * 0.042);
    g.fillStyle = INK; g.fill(circ(x, y, r * 0.05));
  };
  PROPS.flash = function (g, x, y, o) {   // a camera-flash star
    o = o || {}; const r = o.r || 50, lw = o.lw || LW.figure * 0.8, p = new Path2D();
    for (let i = 0; i < 16; i++) { const a = TAU * i / 16, rr = i % 2 ? r * 0.45 : r * (i % 4 ? 0.8 : 1); i ? p.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : p.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    p.closePath(); fs(g, p, '#FFFFFF', lw);
  };
  PROPS.shadow = function (g, x, y, rx, col) { g.fillStyle = col || 'rgba(140,70,20,0.2)'; g.fill(ell(x, y, rx, rx * 0.14)); };

  function drawProp(F, pr, J) {
    const g = F.g; let at = pr.at;
    if (pr.hand) { const arm = pr.hand === 'L' ? J.armL : J.armR, d = dir(arm.ha), off = pr.off || [0, 0], k = pr.along != null ? pr.along : 30; at = [arm.Wr[0] + d[0] * k + off[0], arm.Wr[1] + d[1] * k + off[1]]; }
    if (!at) return;
    const o = Object.assign({ lw: F.lw * 0.9 }, pr, { s: pr.s || 1, tint: F.tint });
    o.lw = F.lw * 0.9 * (pr.s || 1);
    if (pr.k === 'phone') PROPS.phone(g, at[0], at[1], o);
    else if (pr.k === 'laptop') PROPS.laptop(g, at[0], at[1], o);
    else if (pr.k === 'clipboard') PROPS.clipboard(g, at[0], at[1], o);
    else if (pr.k === 'box') PROPS.box(g, at[0], at[1], o);
    else if (pr.k === 'mug') PROPS.mug(g, at[0], at[1], o);
  }

  // ================================================================ the figure
  function resolvePose(opts) {
    let pose = opts.pose || 'stand';
    pose = typeof pose === 'function' ? pose(opts) : typeof pose === 'string' ? (POSES[pose] || POSES.stand)(opts) : pose;
    pose = Object.assign({}, pose);
    if (opts.holding && HOLD[opts.holding]) { const h = HOLD[opts.holding](pose); for (const k in h) pose[k] = h[k]; }
    if (opts.override) for (const k in opts.override) pose[k] = Object.assign({}, pose[k], opts.override[k]);
    return pose;
  }
  function figure(g, who, opts) {
    opts = opts || {};
    const ch = typeof who === 'string' ? (CAST[who] || CAST.hero) : who;
    const t = Object.assign({ k: ch.top.k }, TOPS[ch.top.k], ch.top);
    const pose = resolvePose(opts), facing = opts.facing === -1 ? -1 : 1, sc = (opts.scale || 1) * (ch.h || 1);
    const tint = opts.tint || null, cache = {};
    const c = tint ? (h => cache[h] || (cache[h] = mul(h, tint))) : (h => h);
    const lw = (opts.lw || LW.figure) / sc * (opts.scale || 1) / (opts.scale || 1) * 1, F = { g, ch, c, lw: lw, ld: lw * LW.detail / LW.figure, skinC: c(ch.skin), browC: c(ch.brow || INK) };
    F.lw = (opts.lw ? opts.lw / sc : LW.figure / (ch.h || 1)); F.ld = F.lw * LW.detail / LW.figure; F.tint = tint;
    const light = (opts.light == null ? 1 : opts.light) * facing;   // screen side the light comes from, in body space
    const B = ch.bottom, isSkirt = B.k === 'skirt', stance = pose.stance || 'front';
    g.save();
    g.translate(opts.x || 0, opts.y || 0); g.scale(sc * facing, sc); g.lineCap = 'round'; g.lineJoin = 'round';
    // ---- skeleton (body space: pelvis origin)
    let pel = [0, RIG.pelvisY]; if (pose.pelvis) { if (pose.pelvis.y != null) pel = [pose.pelvis.x || 0, pose.pelvis.y]; else pel = [pel[0] + (pose.pelvis[0] || 0), pel[1] + (pose.pelvis[1] || 0)]; }
    const hipX = stance === 'side' ? RIG.hipXside : RIG.hipX, legW = isSkirt ? RIG.skinLegW : (ch.bottom.w || RIG.legW), shinL = RIG.shin + (ch.shoes.k === 'flat' ? 26 : 0);
    const legs = {};
    ['L', 'R'].forEach((side, i) => {
      const sp = pose['leg' + side] || { a: 0, k: 0 }, sg = i ? 1 : -1;
      let Hp, K, A;
      if (sp.pts) [Hp, K, A] = sp.pts;
      else { Hp = [sg * hipX, RIG.hipY]; K = along(Hp, sp.a || 0, RIG.thigh); A = along(K, (sp.a || 0) - (sp.k || 0), shinL); }
      legs[side] = { H: Hp, K, A, z: sp.z, foot: sp.foot || 0, sg };
    });
    if (pose.ground) { const lowest = Math.max(legs.L.A[1], legs.R.A[1]); pel[1] += (RIG.hipY + RIG.thigh + shinL) - lowest; }
    // ground shadow (in feet space, before moving to the pelvis)
    if (opts.shadow && pose.ground !== false) { g.fillStyle = opts.shadow; g.fill(ell(pel[0] + (legs.L.A[0] + legs.R.A[0]) / 2 + 12 * (stance === 'side' ? 1 : 0), 0, stance === 'side' ? 120 + Math.abs(legs.L.A[0] - legs.R.A[0]) * 0.45 : 104, 15)); }
    g.translate(pel[0], pel[1]);
    const lean = pose.lean || 0, hd = pose.head || {}, shR = pose.shoulders || 0;
    const T = p => rot(p, lean);
    const arms = {};
    ['L', 'R'].forEach((side, i) => {
      const sp = pose['arm' + side] || (i ? STAND_ARMR : STAND_ARML), sg = i ? 1 : -1;
      const S = T([sg * RIG.sh[0], RIG.sh[1] - shR]), L1 = RIG.upper * (sp.ul || 1), L2 = RIG.fore * (sp.fl || 1);
      let E, Wr;
      if (sp.ik) [E, Wr] = ik2(S, sp.ik, L1, L2, sp.bend || 1, false);
      else { E = along(S, (sp.a || 0) + lean * 0, L1); Wr = along(E, (sp.a || 0) + (sp.e || 0), L2); }
      arms[side] = { S, E, Wr, z: sp.z, hand: sp.hand || 'relax', flip: sp.flip || -sg, hrot: sp.hrot || 0, hs: sp.hs || 1, sg, ha: angOf(E, Wr) + (sp.hrot || 0) };
    });
    const J = { armL: arms.L, armR: arms.R, legL: legs.L, legR: legs.R };
    const front = o => o.z !== 'back';
    // ---- legs
    const legPts = L => [L.H, L.K, along(L.A, angOf(L.K, L.A) + PI, legW / 2)];
    const thighW = pose.sit ? legW * 1.22 : legW;   // seated thighs read as thick as the refs' (foreshortened)
    const legInk = L => { const p = legPts(L); tubeInk(g, p, legW, F.lw); if (thighW !== legW) tubeInk(g, [p[0], p[1]], thighW, F.lw); };
    const legFill = L => { const p = legPts(L); tubeFill(g, p, legW, legC); if (thighW !== legW) tubeFill(g, [p[0], p[1]], thighW, legC); };
    const legC = isSkirt ? F.skinC : c(B.c);
    const pelvisPath = () => {
      if (isSkirt) return null;
      if (pose.sit === 'side') return ell(0, 4, 70, 30);
      if (stance === 'side') return rrect(-56, -20, 112, 46, 20);
      return P([[-58, -20], [58, -20], [59, 26], [0, 40], [-59, 26]]);
    };
    const legEnd = L => {
      const a = angOf(L.K, L.A);
      if (isSkirt) return;
      if (B.cuff) fs(g, P(bandPts(L.K, L.A, 18, 1, legW / 2 + 2)), c(B.cuff), F.lw * 0.85);
      else { const b = bandPts(L.K, L.A, 10, 0, legW / 2); g.fillStyle = legC; g.fill(P(b)); polyline(g, [b[0], b[1], b[2], b[3]], F.lw); }
    };
    const shoeFor = L => drawShoe(F, along(L.A, angOf(L.K, L.A), isSkirt ? 0 : 2), stance === 'front' ? L.sg : 1, stance, L.foot);
    ['L', 'R'].forEach(s => { const L = legs[s]; if (L.z === 'back') { shoeFor(L); legInk(L); legFill(L); legEnd(L); } });
    const fl = ['L', 'R'].map(s => legs[s]).filter(front);
    fl.forEach(shoeFor);
    const pp = pelvisPath();
    g.strokeStyle = INK; if (pp) { g.lineWidth = F.lw * 2; g.stroke(pp); } fl.forEach(legInk);
    if (pp) { g.fillStyle = legC; g.fill(pp); } fl.forEach(legFill);
    if (!isSkirt) {
      fl.forEach(L => { const sh = offsetLine([L.H, L.K, L.A], light * (legW / 2 - 6), 0.12, 0.9); tubeFill(g, sh, 9, c(B.sh)); });
      if (B.crease) fl.forEach(L => polyline(g, offsetLine([L.H, L.K, L.A], 0, 0.3, 0.92), F.ld * 0.7));
      if (B.fly && stance === 'front' && !pose.sit) polyline(g, quadPts([2, -4], [3, 22], [-8, 32], 6), F.ld);
    }
    ['L', 'R'].forEach(s => { if (front(legs[s])) legEnd(legs[s]); });
    if (isSkirt) {
      const sw = pose.sit ? 0 : (legs.R.A[0] + legs.L.A[0]) * 0.25;
      const sk = new Path2D(); sk.moveTo(-60, -28); sk.lineTo(60, -28); sk.quadraticCurveTo(76, 90, 86 + sw, 214); sk.quadraticCurveTo(sw, 226, -86 + sw, 214); sk.quadraticCurveTo(-76, 90, -60, -28); sk.closePath();
      fs(g, sk, c(B.c), 0); g.save(); g.clip(sk); g.fillStyle = c(B.sh); g.fill(P([[light > 0 ? -90 : 90, -30], [light > 0 ? -50 : 50, -30], [light > 0 ? -60 + sw : 60 + sw, 230], [light > 0 ? -100 : 100, 230]])); g.restore();
      strokeP(g, sk, F.lw); polyline(g, quadPts([-20, 60], [-26, 140], [-30, 210], 6), F.ld); polyline(g, quadPts([30, 80], [36, 150], [40, 214], 6), F.ld);
    }
    // ---- arms behind the torso
    const sleeveEnd = A => along(A.Wr, angOf(A.E, A.Wr) + PI, t.arm / 2 + 2);
    const armTube = A => [A.S, A.E, sleeveEnd(A)];
    const drawArm = (A, clipped) => {
      if (t.sleeve === 'short') {
        const sv = sleeveShort(A.S, A.E, t);
        tube(g, [sv.M, A.E, along(A.Wr, angOf(A.E, A.Wr) + PI, 2)], t.arm, F.skinC, F.lw);
        if (clipped) { g.save(); g.clip(clipped, 'evenodd'); g.lineWidth = F.lw * 2; g.strokeStyle = INK; g.stroke(sv.p); g.restore(); } else strokeP(g, sv.p, F.lw * 2);
        g.fillStyle = c(t.c); g.fill(sv.p);
        { const b = bandPts(A.S, sv.M, 9, 0, t.sleeveW / 2 + 1); polyline(g, [b[0], b[3]], F.ld); }
      } else {
        const pts = armTube(A);
        if (clipped) { g.save(); g.clip(clipped, 'evenodd'); tubeInk(g, pts, t.arm, F.lw); g.restore(); } else tubeInk(g, pts, t.arm, F.lw);
        tubeFill(g, pts, t.arm, c(t.c));
        fs(g, P(bandPts(A.E, A.Wr, t.cuff, 1, t.arm / 2 + 1)), c(t.cuffC || t.c), F.lw * 0.85);
      }
      drawHand(F, A.Wr, A.ha, A.hand, A.flip, A.hs);
    };
    ['L', 'R'].forEach(s => { if (arms[s].z === 'back') drawArm(arms[s], null); });
    // ---- torso (union with the front sleeves, so shoulders have no seam)
    const fa = ['L', 'R'].map(s => arms[s]).filter(front);
    F.torsoP = torsoPath(t);
    g.save(); g.rotate(lean); g.lineWidth = F.lw * 2; g.strokeStyle = INK; g.stroke(F.torsoP); g.restore();
    fa.forEach(A => { if (t.sleeve === 'short') strokeP(g, sleeveShort(A.S, A.E, t).p, F.lw * 2); else tubeInk(g, armTube(A), t.arm, F.lw); });
    g.save(); g.rotate(lean); g.fillStyle = c(t.c); g.fill(F.torsoP); g.restore();
    fa.forEach(A => { if (t.sleeve === 'short') { g.fillStyle = c(t.c); g.fill(sleeveShort(A.S, A.E, t).p); } else tubeFill(g, armTube(A), t.arm, c(t.c)); });
    g.save(); g.rotate(lean);
    g.save(); g.clip(F.torsoP); g.fillStyle = c(t.sh); g.fill(P([[light > 0 ? -t.hw - 10 : t.hw + 10, -150], [light > 0 ? -t.hw + 16 : t.hw - 16, -150], [light > 0 ? -t.hw + 18 : t.hw - 18, t.hem + 10], [light > 0 ? -t.hw - 10 : t.hw + 10, t.hem + 10]])); g.restore();
    torsoDetails(F, t);
    // ---- head
    g.save(); g.translate(0, RIG.neckY); g.rotate(hd.tilt || 0); g.translate(0, RIG.headDy - RIG.neckY + (hd.sink || 0));
    drawHead(g, ch, F, { expr: opts.expr || 'neutral', face: opts.face, look: opts.look, blink: opts.blink, mouth: opts.mouth, turn: opts.turn != null ? opts.turn : (hd.turn || 0), nod: opts.nod != null ? opts.nod : (hd.nod || 0), marks: opts.marks });
    J.head = g.getTransform();
    g.restore();
    g.restore();   // un-lean
    // ---- held prop, then the front arms over it
    const shoulderClip = A => { const cl = new Path2D(); cl.rect(-3000, -3000, 6000, 6000); cl.arc(A.S[0], A.S[1], t.arm * 0.62, 0, TAU); return cl; };
    const under = (pose.prop && pose.prop.under) || '';
    fa.forEach(A => { if (under.includes(A.sg < 0 ? 'L' : 'R')) drawArm(A, shoulderClip(A)); });
    const over = pose.prop && pose.prop.over;
    if (pose.prop && opts.prop !== false && !over) drawProp(F, pose.prop, J);
    if (opts.drawProp) opts.drawProp(g, J, F);
    fa.forEach(A => { if (under.includes(A.sg < 0 ? 'L' : 'R')) drawHand(F, A.Wr, A.ha, A.hand, A.flip, A.hs); else drawArm(A, shoulderClip(A)); });
    if (pose.prop && opts.prop !== false && over) drawProp(F, pose.prop, J);
    // ---- world-space anchors for the caller (bubbles, props)
    const M = g.getTransform(), wp = p => { const q = M.transformPoint(new DOMPoint(p[0], p[1])); return [q.x, q.y]; };
    const hm = J.head, hw = p => { const q = hm.transformPoint(new DOMPoint(p[0], p[1])); return [q.x, q.y]; };
    const out = { head: hw([0, 0]), headTop: hw([0, -100]), headR: 100 * sc, mouth: hw([0, 50]), handL: wp(arms.L.Wr), handR: wp(arms.R.Wr), elbowL: wp(arms.L.E), elbowR: wp(arms.R.E), pelvis: wp([0, 0]), scale: sc };
    g.restore();
    return out;
  }

  // ================================================================ export
  const POV = global.POV || {};
  Object.assign(POV, { W, H, C, LW, INK, rng, hashStr, lerp, clamp, mix, mul, rgba, P, spl, ell, circ, rrect, fs, polyline, tube, stage,
    CAST, TOPS, RIG, EXPR, POSES, HOLD, HANDS, PROPS, figure, drawHand, drawShoe, face, resolveExpr });
  Object.assign(POV, PROPS);   // POV.phone, POV.clock, POV.notif, ... for convenience
  global.POV = POV;
})(typeof window !== 'undefined' ? window : globalThis);
