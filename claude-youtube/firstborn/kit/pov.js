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
   holding: clipboard | phone (+ mode or phoneMode: ear|front|show|out) | phone_ear | phone_front | phone_show | phone_out | mug | sip
     | laptop | box | peace (takes over only the arms/prop/head, never the legs; works with stand, walk, run, sit, sit_sofa).
   Poses added: run (phase 0..1, stride), peace (V sign beside the head; hand shape 'peace' is also usable in any arm), sit_sofa
     (three-quarter, deep in a sofa; also reached by pose 'sit' with turn >= 0.45 or view 'sofa'; opts seat (px above the floor,
     default 224), thigh (default 150), q (torso three-quarter 0..1)). seatAt: [x, y] or a set anchor {x, y} puts the seat contact
     exactly there (feet on y, default 224 px * scale below it). Expressions added: rude (side-eye, one brow up, tongue out), smug.
   Sitting returns extra anchors: seat (contact point), lap, knee/kneeL/kneeR, feet.
   Returns world anchors {head, headTop, headR, mouth, handL, handR, elbowL, elbowR, pelvis, knee, kneeL, kneeR, feet, seat, lap, scale}.
   Props (world space): POV.phone, phoneFlat, laptop, laptopSide, clipboard, box, mug, notif (kind mail|chat|bell|call|missed),
   chatBubble, bell, buzz, thought (plate icon), plateIcon, bulb (rays, glow, sparkle), clock, flash, shadow.
   In a tinted set (living-room evening) pass the set's tint to figure() so skin and clothes take the same multiply.

   FIRSTBORN additions (all backward compatible; the old ids, poses and props draw pixel-identically; see src/SHEET_family.html):
   who: fb_mum fb_dad fb_sister fb_brother fb_auntie fb_uncle1 fb_uncle2 fb_cousin1 fb_cousin2 fb_okafor_son (alias okafor_son).
     Dot tokens pick an age, an outfit or the school bag: 'hero.newborn' 'hero.kid' 'hero.teen' 'fb_sister.baby|kid|grown'
     'fb_brother.toddler|kid' 'fb_sister.grown.gown' 'fb_dad.labcoat' 'hero.party' 'hero.kid.bag'; or opts.age / opts.outfit / opts.bag.
     Ages: newborn (swaddled bundle: pose 'lie' default, or 'held'; opts fists, rot) | toddler | kid | teen | adult. Outfits: gown, labcoat, party.
   holding: baby (opts.baby = who, babyExpr/babyBlink/babyLook/babyMouth) baby_hero baby_sister baby_brother schoolbag holdall spoon calculator
     bucket bucket_head report report_out paintbrush cup cup_out book books coins akimbo pray wipe_eye.
   poses: cradle gavel (phase 0 raised..1 struck) praise pray akimbo wipe_eye sneeze (phase <0.5 'ah', >=0.5 'choo') clap (phase) swoon (phase)
     catch house house_small (phase given = trudging). POV.swoonPair(g, {x, y, scale, facing, t, mum, dad, tint, shadow}) draws Mum fainting into Dad.
   expr: happy_cry sneeze_pre sneeze faint serene stern sweet proud. Props: spoon calculator receipt bucket glass reportCard paintbrush palette
     schoolbag house sneezeBurst book books holdall coins baby. Anchors add bodyScale (a child's body scale). */
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
    scared: { brows: { lift: -0.01, tilt: 0.2, arch: 0.05, thick: 1.5 }, eyes: { r: 1.24, pupil: 0.6 }, sweat: 1, worry: 1, mouth: { k: 'scream', w: 0.3, h: 0.2 } },
    firm: { brows: { lift: -0.02, tilt: -0.03, arch: 0.05, thick: 1.1 }, eyes: { lid: 0.2, lidTilt: 0, pupil: 1 }, mouth: { k: 'flat', w: 0.14 } },
    guilty: { brows: { lift: 0.0, tilt: 0.13, arch: 0.06 }, eyes: { lid: 0.42, lidTilt: 0.3, pupil: 1 }, mouth: { k: 'frown', w: 0.13, c: 0.06 }, look: [0.45, 0.75] },
    tired_closed: { brows: { lift: 0.02, tilt: 0.11, arch: 0.1 }, eyes: { lid: 0.62, lidTilt: 0.1, lower: 0.12 }, circles: 1, mouth: { k: 'frown', w: 0.12, c: 0.05 } },
    worried: { brows: { lift: 0.03, tilt: 0.12, arch: 0.08 }, eyes: { r: 1.04, pupil: 0.95 }, mouth: { k: 'flat', w: 0.12 } },
    // cheeky, cartoon-rude: half-lidded side-eye, one brow up, tongue out (rude) or a lopsided smirk (smug)
    flat: null,
    rude: { browL: { lift: 0.1, tilt: 0, arch: 0.34 }, browR: { lift: -0.04, tilt: -0.07, arch: 0.08 }, eyes: { lid: 0.44, lidTilt: -0.05, pupil: 1 }, look: [0.75, -0.2], mouth: { k: 'tongue', w: 0.17 } },
    smug: { browL: { lift: 0.1, tilt: 0, arch: 0.34 }, browR: { lift: -0.04, tilt: -0.07, arch: 0.08 }, eyes: { lid: 0.44, lidTilt: -0.05, pupil: 1 }, look: [0.75, -0.2], mouth: { k: 'smirk', w: 0.17 } },
  };
  EXPR.flat = EXPR.firm;
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
  function eye(g, ex, ey, s, e, R, look, blink, skin, white, lw, kx) {
    const er = 0.2 * R * (e.r || 1), ew = er * (kx || 1);
    if (e.k === 'happy') { polyline(g, quadPts([ex - ew * 0.95, ey + er * 0.25], [ex, ey - er * 1.25], [ex + ew * 0.95, ey + er * 0.25], 10), lw * 1.15); return; }
    if (e.k === 'squeeze') { polyline(g, [[ex + s * ew * 0.85, ey - er * 0.75], [ex - s * ew * 0.75, ey], [ex + s * ew * 0.85, ey + er * 0.75]], lw * 1.15); return; }
    if (e.k === 'closed') { polyline(g, quadPts([ex - ew * 0.95, ey], [ex, ey + er * 0.85], [ex + ew * 0.95, ey], 10), lw * 1.1); if (e.lashes) [0.62, 0.95].forEach(t => { const px = ex + s * ew * t, py = ey + er * 0.85 * (1 - t * t) * 0.9; polyline(g, [[px, py], [px + s * er * 0.32, py + er * 0.22]], lw * 0.7); }); return; }
    if (blink >= 0.92) { polyline(g, quadPts([ex - ew * 0.95, ey + er * 0.05], [ex, ey + er * 0.6], [ex + ew * 0.95, ey + er * 0.05], 10), lw * 1.05); return; }
    const pr = 0.084 * R * (e.pupil || 1), lid = Math.max(e.lid || 0, blink || 0), lt = (e.lidTilt || 0) * er;
    const ball = ell(ex, ey, ew, er);
    g.fillStyle = white; g.fill(ball);
    g.save(); g.clip(ball);
    if (e.pool) { g.fillStyle = rgba(C.tear, 0.9); g.fill(ell(ex, ey + er * 0.95, er * 1.1, er * 0.5)); }
    // the pupil can travel to the rim, leaving a clear white on the far side (refs: eyelines read from the white)
    const ll = Math.hypot(look[0], look[1]), lk = ll > 1 ? 1 / ll : 1, mx = Math.max(0, ew - pr * 0.95), my = Math.max(0, er - pr * 1.15);
    const px = ex + look[0] * lk * mx, py = ey + look[1] * lk * my;
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
    if (m.k === 'tongue' || m.k === 'smirk') {   // lopsided closed smirk; 'tongue' adds a tongue poking out
      const p = new Path2D(); p.moveTo(mx - w, my + 0.01 * R); p.quadraticCurveTo(mx - w * 0.1, my + 0.06 * R, mx + w, my - 0.06 * R); 
      if (m.k === 'tongue') {
        const tx = mx + w * 0.12, tw = 0.075 * R, ty = my + 0.03 * R, tg = new Path2D();
        tg.moveTo(tx - tw, ty - 0.01 * R); tg.lineTo(tx - tw, ty + 0.07 * R); tg.arc(tx, ty + 0.07 * R, tw, PI, 0, true); tg.lineTo(tx + tw, ty - 0.02 * R); tg.closePath();
        fs(g, tg, C.tongue, lw * 0.8); polyline(g, [[tx, ty + 0.015 * R], [tx, ty + 0.09 * R]], lw * 0.5);
      }
      strokeP(g, p, lw * 0.85); polyline(g, [[mx + w, my - 0.06 * R], [mx + w * 1.12, my - 0.1 * R]], lw * 0.6);
    } else if (m.k === 'smile' || m.k === 'frown') {
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
      // ref 01 'scared': a wide open mouth, top lip arched up, the upper teeth showing, the tongue low
      p.moveTo(mx - w, my + h * 0.55); p.quadraticCurveTo(mx, my - h * 0.5, mx + w, my + h * 0.55); p.bezierCurveTo(mx + w * 1.02, my + h * 1.45, mx + w * 0.55, my + h * 1.9, mx, my + h * 1.9); p.bezierCurveTo(mx - w * 0.55, my + h * 1.9, mx - w * 1.02, my + h * 1.45, mx - w, my + h * 0.55); p.closePath();
      g.fillStyle = C.mouthIn; g.fill(p); g.save(); g.clip(p);
      const t = new Path2D(); t.moveTo(mx - w * 1.1, my + h * 0.98); t.quadraticCurveTo(mx, my - h * 0.1, mx + w * 1.1, my + h * 0.98); t.lineTo(mx + w * 1.1, my - h); t.lineTo(mx - w * 1.1, my - h); t.closePath();
      g.fillStyle = white; g.fill(t); g.fillStyle = C.tongue; g.fill(ell(mx, my + h * 1.85, w * 0.58, h * 0.45)); g.restore(); strokeP(g, p, lw * 0.85);
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
  // a three-quarter turn: the features slide toward the turn side of the head circle, the far eye narrows, the nose
  // hooks toward the turn side; turn is relative to the facing (+ = toward where the figure faces)
  function faceGeo(R, turn, nod) {
    const t = clamp(turn || 0, -1, 1), at = Math.abs(t), sd = t < 0 ? -1 : 1;
    const fx = t * 0.33 * R, ES = 0.385 * R * (1 - 0.2 * at), eyeY = 0.04 * R + (nod || 0) * 0.1 * R;
    return { t, at, sd, fx, ES, eyeY, kx: s => (at > 0.02 && s !== sd ? 1 - 0.3 * at : 1), ex: s => fx + s * ES,
      noseX: fx + t * 0.12 * R, noseDir: at > 0.12 ? sd : 1, mouthX: fx + t * 0.08 * R, mouthK: 1 - 0.18 * at };
  }
  function normLook(l) { return l == null ? null : typeof l === 'number' ? [l, 0] : Array.isArray(l) ? l : [l.x || 0, l.y || 0]; }
  function brows(g, R, o, F, E, G) {   // drawn after hair and hats, so a fringe or a brim never hides them
    const lw = F.lw;
    [-1, 1].forEach(s => { const b = Object.assign({}, E.brows, s < 0 ? E.browL : E.browR); g.save(); g.translate(G.ex(s), 0); g.scale(G.kx(s), 1); brow(g, s * 0.01 * R, G.eyeY - 0.36 * R, s, b, R, F.browC, F.ch.browLine); g.restore(); });
    if (E.crease) [-1, 1].forEach(s => polyline(g, [[G.fx + s * 0.05 * R, G.eyeY - 0.36 * R], [G.fx + s * 0.035 * R, G.eyeY - 0.24 * R]], lw * 0.55));
    if (E.worry) [-1, 1].forEach(s => { const x = G.fx + s * 0.085 * R, y = G.eyeY - 0.5 * R; polyline(g, quadPts([x - s * 0.04 * R, y + 0.02 * R], [x, y - 0.03 * R], [x + s * 0.035 * R, y + 0.035 * R], 5), lw * 0.5); });
  }
  function face(g, R, o, F, E, G) {
    E = E || resolveExpr(o.expr, o.face); G = G || faceGeo(R, o.turn, o.nod);
    const skin = F.skinC, white = mix('#FFFFFF', F.c('#FFFFFF'), 0.45), lw = F.lw;
    const turn = G.t, fx = G.fx, nod = o.nod || 0, eyeY = G.eyeY, ES = G.ES;
    const look = normLook(o.look) || E.look || [turn * 0.9, 0], blink = o.blink || 0;
    if (E.circles) [-1, 1].forEach(s => { g.fillStyle = C.circles; g.fill(ell(fx + s * ES, eyeY + 0.08 * R, 0.25 * R, 0.2 * R)); });
    [-1, 1].forEach(s => { const e = Object.assign({}, E.eyes, s < 0 ? E.eyeL : E.eyeR); eye(g, fx + s * ES, eyeY, s, e, R, look, blink, skin, white, lw, G.kx(s)); });
    // nose: a small hook, open toward the side the face is turned to
    { const nx = G.noseX + G.noseDir * 0.025 * R, ny = eyeY + 0.25 * R, r = 0.052 * R; g.save(); g.translate(nx, ny); g.scale(G.noseDir, 1); const p = new Path2D(); p.arc(0, 0, r, -PI / 2 - 0.5, PI / 2 - 0.15, true); strokeP(g, p, lw * 0.75); g.restore(); }
    g.save(); g.translate(G.mouthX, 0); g.scale(G.mouthK, 1); mouthDraw(g, 0, eyeY + 0.47 * R + nod * 0.03 * R, E, R, o.mouth || 0, lw / G.mouthK, white); g.restore();
    if (E.cheeks) [-1, 1].forEach(s => { const bx = fx + s * (ES + 0.25 * R), by = eyeY + 0.02 * R; [-1, 0, 1].forEach(k => polyline(g, [[bx, by + k * 0.055 * R], [bx + s * 0.065 * R, by + k * 0.075 * R]], lw * 0.55)); });
    if (E.tears === 2) [-1, 1].forEach(s => {   // tears of joy: a stream from each (closed) eye
      const er = 0.175 * R, x0 = fx + s * (ES + er * 0.55), y0 = eyeY + er * 0.35, p = new Path2D();
      p.moveTo(x0 - s * 0.03 * R, y0); p.bezierCurveTo(x0 - s * 0.035 * R, y0 + 0.12 * R, x0 - s * 0.02 * R, y0 + 0.2 * R, x0 - s * 0.05 * R, y0 + 0.28 * R); if (s > 0) p.arc(x0 - s * 0.005 * R, y0 + 0.29 * R, 0.048 * R, PI, 0, true); else p.arc(x0 - s * 0.005 * R, y0 + 0.29 * R, 0.048 * R, 0, PI, false); p.bezierCurveTo(x0 + s * 0.05 * R, y0 + 0.18 * R, x0 + s * 0.04 * R, y0 + 0.1 * R, x0 + s * 0.04 * R, y0); p.closePath();
      fs(g, p, C.tear, lw * 0.5);
    });
    else if (E.tears) {
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
    if (HAIR2[hr.k]) return HAIR2[hr.k](g, hr, F, back);   // the kinds added for the family (short, side, puffs, braids, headwrap, gele, curl)
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
      g.save(); g.translate(0, -9);
      const crown = spl([[-101, -38, 1], [-100, -70], [-74, -108], [0, -124], [74, -108], [100, -70], [101, -38, 1], [0, -56]], true, 0.9);
      fs(g, crown, c(hr.c), lw);
      g.save(); g.clip(crown); g.fillStyle = c(hr.sh); g.fill(spl([[40, -116], [92, -86], [104, -40], [70, -48], [64, -90]], true)); g.restore(); strokeP(g, crown, lw);
      [[[0, -122], [-30, -96], [-52, -56]], [[0, -122], [30, -96], [52, -56]]].forEach(q => strokeP(g, spl(q, false), ld));
      fs(g, circ(0, -124, 7), c(hr.c), ld);
      const brim = new Path2D(); brim.moveTo(-102, -44); brim.quadraticCurveTo(0, -66, 102, -44); brim.quadraticCurveTo(110, -36, 104, -30); brim.quadraticCurveTo(0, -42, -104, -30); brim.quadraticCurveTo(-110, -36, -102, -44); brim.closePath();
      fs(g, brim, c(hr.sh), lw);
      g.restore();
    } else if (hr.k === 'curly') {
      const r = rng('curls'), circles = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12, a = PI * (1.0 + 1.0 * t); circles.push([Math.cos(a) * 98, -30 + Math.sin(a) * 98, 23 + r() * 6]); }
      for (let i = 0; i < 7; i++) circles.push([-60 + i * 20, -82 + (i % 2) * 5, 14 + r() * 3]);
      circles.push([0, -92, 50], [-40, -97, 44], [40, -97, 44]);
      g.strokeStyle = INK; g.lineWidth = lw * 2; circles.forEach(q => g.stroke(circ(q[0], q[1], q[2])));
      g.fillStyle = c(hr.c); circles.forEach(q => g.fill(circ(q[0], q[1], q[2])));
      g.strokeStyle = c(hr.hi); g.lineWidth = ld * 0.9;
      circles.slice(0, 13).forEach((q, i) => { if (i % 2) return; const p = new Path2D(); p.arc(q[0] * 0.8, q[1] * 0.8 - 6, q[2] * 0.45, 0.6, 2.6); g.stroke(p); });
    } else if (hr.k === 'bucket') {
      g.save(); g.translate(0, -16);
      const crown = new Path2D(); crown.moveTo(-70, -52); crown.bezierCurveTo(-68, -86, -56, -106, -24, -108); crown.lineTo(24, -108); crown.bezierCurveTo(56, -106, 68, -86, 70, -52); crown.closePath();
      fs(g, crown, c(hr.c), lw);
      g.save(); g.clip(crown); g.fillStyle = c(hr.sh); g.fill(P([[30, -124], [76, -124], [76, -48], [44, -48]])); g.restore(); strokeP(g, crown, lw);
      const brim = new Path2D(); brim.moveTo(-72, -62); brim.quadraticCurveTo(0, -74, 72, -62); brim.quadraticCurveTo(110, -46, 134, -4); brim.quadraticCurveTo(136, 6, 124, 4); brim.quadraticCurveTo(0, -30, -124, 4); brim.quadraticCurveTo(-136, 6, -134, -4); brim.quadraticCurveTo(-110, -46, -72, -62); brim.closePath();
      fs(g, brim, c(hr.hi), lw);
      g.save(); g.clip(brim); g.fillStyle = c(hr.c); g.fill(spl([[-140, 8], [0, -22], [140, 8], [140, 24], [-140, 24]], true)); g.restore(); strokeP(g, brim, lw);
      polyline(g, quadPts([-68, -68], [0, -80], [68, -68], 10), ld);
      g.restore();
    }
  }
  function glasses(g, F, G) {
    const y = G.eyeY, r = 25, lw = F.lw * 0.85, rx = s => r * G.kx(s);
    [-1, 1].forEach(s => { const p = ell(G.ex(s), y, rx(s), r); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill(p); strokeP(g, p, lw); const ox = G.ex(s) + s * rx(s); if (s * (s * 97 - ox) > 2) polyline(g, [[ox, y - 4], [s * 97, y - 8]], lw * 0.8); });
    polyline(g, quadPts([G.ex(-1) + rx(-1), y - 2], [G.fx, y - 10], [G.ex(1) - rx(1), y - 2], 6), lw * 0.8);
  }
  function drawHead(g, ch, F, o) {   // head space, R = 100
    const E = resolveExpr(o.expr, o.face), G = faceGeo(100, o.turn, o.nod);
    hair(g, ch, F, true);
    fs(g, circ(0, 0, 100), F.skinC, F.lw);
    if (ch.beard) beardJaw(g, ch, F, G);
    face(g, 100, o, F, E, G);
    if (ch.beard || ch.moustache) moustache(g, ch.moustache || ch.beard, F, G, !!ch.beard);
    hair(g, ch, F, false);
    if (ch.hat) hat(g, ch, F);
    if (ch.earrings) earrings(g, ch.earrings, F);
    brows(g, 100, o, F, E, G);
    if (ch.glasses) glasses(g, F, G);
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
    peace: { f: [[10.5, 0.3, 32, 0], [3.5, -0.16, 33, 0], [-3.6, 0.12, 15, 1.7], [-10.6, 0.12, 13, 1.6]], t: [14, 13, -0.35, 17, 0.75] },
  };
  const FW = 11.8, TW = 12.6, HAND_K = 0.9, handCache = {};   // HAND_K: overall hand size (refs: a hand is ~0.3 of the head)
  function handParts(name) {
    if (handCache[name]) return handCache[name];
    const sh = HANDS[name] || HANDS.relax;
    const fingers = sh.f.map(([bx, fan, L, curl]) => { const B = [bx, 32], a1 = fan + curl * 0.35, a2 = fan + curl * 1.5, M = along(B, a1, L * 0.52); return [B, M, along(M, a2, L * 0.5)]; });
    const [tx, ty, ta, tl, tc] = sh.t, TB = [tx, ty], TM = along(TB, ta, tl * 0.55);
    return (handCache[name] = { fingers, thumb: [TB, TM, along(TM, ta - tc * 1.2, tl * 0.5)] });
  }
  // 'thumb' is drawn upright in body space whatever the forearm does: a fist with the knuckles toward the viewer, the curled
  // fingers stacked on the outer side, the thumb pointing straight up off the top (ref 04). Facing -1 mirrors it, up stays up.
  function drawThumbsUp(F, Wr, a, s) {
    const g = F.g, lw = F.lw * 0.9 * (F.hlk || 1), k = (s || 1) * HAND_K * 1.3, d = dir(a), sx = d[0] >= 0 ? 1 : -1;   // drawn big, as the ref does
    g.save(); g.translate(Wr[0] + d[0] * 15 * k, Wr[1] + d[1] * 15 * k); g.scale(sx * k, k);
    const fist = new Path2D();   // outer (+x) edge scalloped by the four curled fingers
    fist.moveTo(-16, -16); fist.quadraticCurveTo(-21, -15, -21, -6); fist.lineTo(-20, 12); fist.quadraticCurveTo(-19, 21, -9, 21);
    fist.lineTo(10, 21); [[15, 9], [15, -1], [15, -10], [14, -18]].forEach(([x, y], i) => fist.arc(x, y + 0.5, 5.6 - (i === 3 ? 0.6 : 0), PI / 2, -PI / 2, true));
    fist.lineTo(8, -23); fist.quadraticCurveTo(-4, -24, -16, -16); fist.closePath();
    const th = [[-9, -12], [-8, -30], [-5, -40]];
    g.strokeStyle = INK; g.lineWidth = lw * 2 / k; g.stroke(fist);
    g.lineWidth = 12.5 + 2 * lw / k; g.stroke(P(th, false));
    g.fillStyle = F.skinC; g.fill(fist); g.strokeStyle = F.skinC; g.lineWidth = 12.5; g.stroke(P(th, false));
    g.lineWidth = F.ld * 0.8 / k; g.strokeStyle = INK;
    [4.5, -5, -14].forEach(y => g.stroke(P([[17, y], [5, y + 0.5]], false)));          // the gaps between the curled fingers
    g.stroke(P([[-2, -19], [-1, -9], [5, -4]], false));                                    // the thumb's base crease over the index
    g.restore();
  }
  // 'stop': a flat hand held upright at the end of the arm, fingers together and up, thumb to the inner side: a polite no
  function drawStopHand(F, Wr, a, s) {
    const g = F.g, lw = F.lw * 0.9 * (F.hlk || 1), k = (s || 1) * HAND_K * 1.12, d = dir(a), sx = d[0] >= 0 ? 1 : -1;
    g.save(); g.translate(Wr[0] + d[0] * 9 * k, Wr[1] + d[1] * 9 * k); g.scale(sx * k, k);
    const palm = rrect(-15, -34, 33, 38, 10);
    const fingers = [[-8, -30, -8.5, -56], [0, -32, 0.5, -61], [8, -32, 9, -59], [15, -28, 16.5, -50]].map(([x0, y0, x1, y1]) => [[x0, y0], [x1, y1]]);
    const thumb = [[-11, -8], [-20, -20], [-27, -31]];
    g.strokeStyle = INK; g.lineWidth = lw * 2 / k; g.stroke(palm);
    g.lineWidth = 10.5 + 2 * lw / k; fingers.forEach(f => g.stroke(P(f, false))); g.lineWidth = 11.5 + 2 * lw / k; g.stroke(P(thumb, false));
    g.fillStyle = F.skinC; g.fill(palm); g.strokeStyle = F.skinC; g.lineWidth = 10.5; fingers.forEach(f => g.stroke(P(f, false))); g.lineWidth = 11.5; g.stroke(P(thumb, false));
    g.lineWidth = F.ld * 0.8 / k; g.strokeStyle = INK;
    [[-4, -50, -4, -36], [4.5, -52, 4.5, -37], [12, -48, 12, -36]].forEach(([x0, y0, x1, y1]) => g.stroke(P([[x0, y0], [x1, y1]], false)));
    g.stroke(P([[-9, -14], [-6, -24]], false));
    g.restore();
  }
  function drawHand(F, Wr, a, shape, flip, s) {
    if (!shape || shape === 'pocket' || shape === 'none') return;
    if (shape === 'thumb') return drawThumbsUp(F, Wr, a, s);
    if (shape === 'stop') return drawStopHand(F, Wr, a, s);
    if (shape === 'pray') return drawPrayHands(F, Wr, s);
    const g = F.g, pr = handParts(shape), lw = F.lw * 0.9 * (F.hlk || 1);
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
    const sk = F.shoeK || 1;
    g.save(); g.translate(A[0], A[1]); g.rotate(sgn * (footA || 0)); g.scale(sgn * (stance === 'front' ? 0.96 : 1) * sk, (stance === 'front' ? 0.94 : 1) * sk);
    fs(g, p, F.c(sp.c), 0);
    g.save(); g.clip(p);
    if (k === 'trainer') {
      if (sp.toe) { g.fillStyle = F.c(sp.toe); g.fill(ell(72, 42, 22, 22)); polyline(g, quadPts([52, 54], [50, 28], [70, 18], 6), F.ld); }
      g.fillStyle = F.c(sp.sole); g.fillRect(-40, 41, 130, 20); polyline(g, [[-40, 41], [90, 41]], F.ld);
      if (sp.stripes) [[2, 13, 15, 33], [14, 12, 27, 31]].forEach(([x0, y0, x1, y1]) => tube(g, [[x0, y0], [x1, y1]], 4.5, F.c(sp.stripes), F.ld * 0.55));
      if (sp.laces) [[18, 2, 30, 8], [27, 9, 38, 13], [36, 13, 46, 16]].forEach(([x0, y0, x1, y1]) => tube(g, [[x0, y0], [x1, y1]], 3.4, F.c(sp.laces), F.ld * 0.45));
    } else if (k === 'dress') { g.fillStyle = F.c(sp.sole || INK); g.fillRect(-40, 45, 130, 12); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill(ell(44, 30, 18, 6, -0.3)); }
    g.restore();
    strokeP(g, p, lw / sk);
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
      if (t.collar) [-1, 1].forEach(s => fs(g, spl([[s * 3, -236], [s * 26, -256], [s * 42, -244], [s * 34, -224], [s * 12, -224]], true), c(t.collar), lw * 0.75));   // a little round collar
    } else if (t.k === 'cardigan') {
      neck(F, 17, -246);
      const v = new Path2D(); v.moveTo(-30, -256); v.quadraticCurveTo(0, -246, 30, -256); v.quadraticCurveTo(14, -190, 0, -142); v.quadraticCurveTo(-14, -190, -30, -256); v.closePath();
      g.fillStyle = c(t.under); g.fill(v); polyline(g, quadPts([-18, -250], [0, -236], [18, -250], 6), ld);
      polyline(g, quadPts([-30, -256], [-14, -190], [0, -142], 8), lw * 0.8); polyline(g, quadPts([30, -256], [14, -190], [0, -142], 8), lw * 0.8);
      polyline(g, [[0, -142], [0, t.hem]], ld);
      g.save(); g.clip(F.torsoP); polyline(g, [[-t.hw - 5, t.hem - 16], [t.hw + 5, t.hem - 16]], ld); g.restore();
      [-122, -94, -66, -40].forEach(y => fs(g, circ(-1, y, 4.6), c(t.sh), ld * 0.75));
    } else if (t.k === 'buttonshirt' || t.k === 'schoolshirt') {
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
    } else if (t.k === 'buba') {   // the loose blouse: round neck with a trim band, a sparse print, coral beads if worn
      if (t.motif) { g.save(); g.clip(body); motif(g, c(t.motif), -t.hw - 10, -250, 2 * t.hw + 20, 280, 'dot', 36); g.restore(); }
      const u = new Path2D(); u.moveTo(-26, -300); u.lineTo(-26, -254); u.quadraticCurveTo(0, -228, 26, -254); u.lineTo(26, -300); u.closePath(); g.fillStyle = F.skinC; g.fill(u);
      polyline(g, [[-21, -282], [-21, -254]], lw * 0.8); polyline(g, [[21, -282], [21, -254]], lw * 0.8);
      const band = new Path2D(); band.moveTo(-30, -258); band.quadraticCurveTo(0, -222, 30, -258); band.lineTo(46, -258); band.quadraticCurveTo(0, -200, -46, -258); band.closePath();
      fs(g, band, c(t.trim || t.sh), lw * 0.8);
      if (ch.beads) quadPts([-27, -252], [0, -212], [27, -252], 9).forEach(q => fs(g, circ(q[0], q[1] + 4, 6), c(ch.beads), ld * 0.65));
      g.save(); g.clip(body); polyline(g, [[-t.hw - 5, t.hem - 16], [t.hw + 5, t.hem - 16]], ld); g.restore();
      [[-48, -130, -56, -44], [52, -120, 60, -36]].forEach(([x0, y0, x1, y1]) => polyline(g, [[x0, y0], [x1, y1]], ld * 0.75));
    } else if (t.k === 'kaftan') {   // round neck, a short placket, embroidery in thread
      const u = new Path2D(); u.moveTo(-22, -300); u.lineTo(-22, -255); u.quadraticCurveTo(0, -238, 22, -255); u.lineTo(22, -300); u.closePath(); g.fillStyle = F.skinC; g.fill(u);
      polyline(g, [[-20, -282], [-20, -254]], lw * 0.8); polyline(g, [[20, -282], [20, -254]], lw * 0.8);
      if (t.thread) { const th = c(t.thread); tubeFill(g, quadPts([-34, -259], [0, -222], [34, -259], 10), 5, th); [-9, 9].forEach(x => tubeFill(g, [[x, -232], [x, -176]], 4, th)); tubeFill(g, quadPts([-9, -176], [0, -164], [9, -176], 5), 4, th); [-150, -136].forEach(y => { g.fillStyle = th; g.fill(circ(0, y, 3.2)); }); }
      polyline(g, quadPts([-24, -256], [0, -236], [24, -256], 8), lw * 0.8);
      polyline(g, [[0, -238], [0, -186]], ld);
      [[-50, -140, -56, -40], [52, -130, 58, -30]].forEach(([x0, y0, x1, y1]) => polyline(g, [[x0, y0], [x1, y1]], ld * 0.75));
    } else if (t.k === 'gown') {   // graduation gown: a V neck and the stole
      const v = new Path2D(); v.moveTo(-20, -300); v.lineTo(-20, -255); v.lineTo(0, -224); v.lineTo(20, -255); v.lineTo(20, -300); v.closePath(); g.fillStyle = F.skinC; g.fill(v);
      polyline(g, [[-20, -282], [-20, -255]], lw * 0.8); polyline(g, [[20, -282], [20, -255]], lw * 0.8);
      fs(g, P([[-20, -255], [0, -224], [20, -255], [13, -262], [0, -240], [-13, -262]]), c(C.white), lw * 0.7);
      [-1, 1].forEach(s => fs(g, P([[s * 22, -264], [s * 48, -254], [s * 40, t.hem + 8], [s * 16, t.hem + 8], [s * 13, -232]]), c(t.stole || C.gold), lw * 0.75));
      polyline(g, [[0, -224], [0, t.hem]], ld * 0.8);
    } else if (t.k === 'labcoat') {   // open lab coat: lapels, what is worn underneath in the V, a pen in the pocket
      const v = new Path2D(); v.moveTo(-32, -260); v.lineTo(32, -260); v.lineTo(0, -150); v.closePath(); g.fillStyle = c(t.under || C.white); g.fill(v);
      g.fillStyle = F.skinC; g.fill(P([[-20, -300], [-20, -252], [0, -238], [20, -252], [20, -300]]));
      polyline(g, [[-20, -282], [-20, -252]], lw * 0.8); polyline(g, [[20, -282], [20, -252]], lw * 0.8); polyline(g, quadPts([-22, -253], [0, -234], [22, -253], 6), lw * 0.8);
      [-1, 1].forEach(s => fs(g, P([[s * 36, -264], [s * 8, -170], [s * 1, -150], [s * 30, -194], [s * 54, -212], [s * 42, -236]]), c(t.c), lw * 0.8));
      polyline(g, [[0, -150], [0, t.hem]], lw * 0.8);
      [-118, -78, -38].forEach(y => fs(g, circ(12, y, 4), c(t.sh), ld * 0.7));
      fs(g, P([[-64, -168], [-30, -168], [-30, -136], [-64, -136]]), c(t.c), ld); tube(g, [[-40, -184], [-40, -164]], 6, c('#4F7FB0'), ld * 0.6);
    } else if (t.k === 'dashiki') {   // the embroidered V panel at the neck
      const pn = new Path2D(); pn.moveTo(-52, -262); pn.quadraticCurveTo(0, -250, 52, -262); pn.lineTo(42, -228); pn.lineTo(0, -136); pn.lineTo(-42, -228); pn.closePath();
      fs(g, pn, c(t.panel || INK), lw * 0.8);
      if (t.motif) { g.save(); g.clip(pn); [0, 1].forEach(k => polyline(g, [[-46 + k * 9, -244], [0, -150 + k * 22], [46 - k * 9, -244]], 3.2, c(t.motif))); for (let i = -2; i <= 2; i++) { g.fillStyle = c(t.motif); g.fill(circ(i * 15, -232 + Math.abs(i) * 4, 3)); } g.restore(); }
      const u = new Path2D(); u.moveTo(-23, -300); u.lineTo(-23, -255); u.quadraticCurveTo(0, -236, 23, -255); u.lineTo(23, -300); u.closePath(); g.fillStyle = F.skinC; g.fill(u);
      polyline(g, [[-21, -282], [-21, -254]], lw * 0.8); polyline(g, [[21, -282], [21, -254]], lw * 0.8); polyline(g, quadPts([-24, -256], [0, -235], [24, -256], 8), lw * 0.8);
      [-1, 1].forEach(s => fs(g, P([[s * 50, -90], [s * 74, -90], [s * 72, -56], [s * 52, -56]]), c(t.c), ld));
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
    thumbs_up: o => Object.assign({ stance: 'front', armL: STAND_ARML, armR: { ik: [168, -156], bend: 1, ul: 0.92, fl: 0.82, hand: 'thumb', flip: -1 } }, STAND_LEGS),
    hand_mouth: o => Object.assign({ stance: 'front', armL: { ik: [-2, -268], bend: 1, ul: 0.6, hand: 'flat', flip: -1, hrot: 0.15 }, armR: STAND_ARMR }, STAND_LEGS),
    hold_phone: o => Object.assign({ stance: 'front', armL: STAND_ARML }, STAND_LEGS, phoneArms(o.mode || 'ear')),
    // a run: long strides, a flight phase, arms pumping with bent elbows, leaning in (the reference animatic's 0:26)
    run: o => {
      const p = o.phase || 0, s = sinA(TAU * p), c = cosA(TAU * p), A = o.stride || 0.62;
      const leg = (a, k) => ({ a, k, foot: 0.5 * k + 0.4 * Math.max(0, -a / A) - 0.2 * Math.max(0, a / A) });
      const sw = 0.5 - 0.5 * s;
      return { stance: 'side', ground: true, lift: 16 * Math.max(0, Math.abs(c) - 0.35) / 0.65, lean: 0.13, head: { turn: 0.35, tilt: 0.04 },
        legL: leg(-A * s, 0.3 + 1.35 * Math.pow(Math.max(0, -c), 1.2)), legR: Object.assign(leg(A * s, 0.3 + 1.35 * Math.pow(Math.max(0, c), 1.2)), { z: 'back' }),
        armR: { a: -0.25 + 0.95 * sw, e: 1.55 - 0.25 * sw, fl: 0.92, hand: 'fist', flip: -1, hrot: 0.2 },
        armL: { a: 0.2 - 0.9 * (1 - sw), e: 1.25 + 0.2 * (1 - sw), fl: 0.92, hand: 'fist', flip: 1, hrot: 0.1 } };
    },
    peace: o => Object.assign({ stance: 'front', armL: STAND_ARML, head: { tilt: 0.06 } }, STAND_LEGS, HOLD_ARMS.peace()),
    // the polite no: the near arm out toward the other person at chest height, the flat hand up like a stop sign; default face 'firm'
    no: o => Object.assign({ stance: 'front', armL: STAND_ARML, head: { tilt: -0.03 }, expr: 'firm' }, STAND_LEGS, HOLD_ARMS.no_palm()),
    // seated deep in a sofa, three-quarter: thighs forward along the seat, shins down, feet on the floor (refs 03, 07, 10)
    sit_sofa: o => {
      const seat = o.seat == null ? 224 : o.seat, py = -(seat + 28), floorY = -54 - py, th = o.thigh || 150;
      return { stance: 'side', ground: false, pelvis: { y: py }, seatH: seat, lean: -0.06, sit: 'sofa', torso3q: o.q == null ? 1 : o.q, head: { turn: 0.35 },
        legR: { pts: [[14, -6], [14 + th, -14], [th + 34, floorY]], z: 'back', foot: 0.04 },
        legL: { pts: [[-8, 4], [-8 + th, 2], [th - 4, floorY]], foot: 0 },
        armL: { ik: [96, -12], bend: 1, ul: 0.95, hand: 'flat', flip: -1, hrot: 0.75 },
        armR: { ik: [th + 6, -40], bend: -1, ul: 0.9, hand: 'flat', flip: -1, hrot: 0.5 } };
    },
    hold_laptop: o => Object.assign({ stance: 'front', armL: { ik: [62, -84], bend: 1, fl: 0.75, hand: 'flat', flip: -1, hrot: -0.55 }, armR: { ik: [236, -74], bend: -1, fl: 1, hand: 'hold', flip: -1, hrot: 0.9 },
      prop: { k: 'laptop', at: [150, -122], a: -0.05, s: 1.3, under: 'R' } }, STAND_LEGS),
    hold_clipboard: o => Object.assign({ stance: 'front', head: { nod: 0.4 }, armL: { ik: [-46, -70], bend: 1, fl: 0.5, hand: 'hold', flip: -1, hrot: -1.3 }, armR: { ik: [30, -128], bend: -1, fl: 0.55, hand: 'hold', flip: -1, hrot: 0.2 },
      prop: { k: 'clipboard', at: [-8, -112], a: -0.25, s: 0.95 } }, STAND_LEGS),
    hold_box: o => Object.assign({ stance: 'front', armL: { ik: [-62, -118], bend: 1, fl: 0.6, hand: 'flat', flip: -1, hrot: 0.4 }, armR: { ik: [76, -100], bend: -1, fl: 0.6, hand: 'hold', flip: -1, hrot: 1.2 },
      prop: { k: 'box', at: [10, -150], s: 1 } }, STAND_LEGS),
    sit: o => {
      if (o.view === 'sofa' || (o.view == null && (o.turn || 0) >= 0.45)) return POSES.sit_sofa(o);
      const seat = o.seat == null ? 200 : o.seat, view = o.view || 'side', py = -(seat + 24), floorY = -54 - py;
      const pose = { stance: view === 'side' ? 'side' : 'front', ground: false, pelvis: { y: py }, seatH: seat, lean: -0.03, sit: view };
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
  // phone arms by mode: ear (calls), front (reading it), show (held up beside the shoulder), out (held toward someone)
  function phoneArms(mode) {
    if (mode === 'ear') return { head: { tilt: 0.07 }, armR: { ik: [70, -322], bend: 1, ul: 0.85, hand: 'hold', flip: -1, hrot: 0.2 }, prop: { k: 'phone', at: [80, -362], a: 0.25, s: 0.9 } };
    if (mode === 'show') return { armL: { a: -0.14, e: -2.72, hand: 'hold', flip: 1, hrot: 0.1 }, armR: STAND_ARMR, prop: { k: 'phone', hand: 'L', along: 40, off: [-6, 0], a: -0.22, s: 1.05, screen: 1, over: true } };
    if (mode === 'out') return { armR: { ik: [168, -180], bend: 1, ul: 0.95, hand: 'hold', flip: 1, hrot: -0.35 }, prop: { k: 'phone', hand: 'R', along: 40, off: [4, 0], a: 0.28, s: 1, screen: 1 } };
    return { head: { nod: 0.6 }, armR: { ik: [40, -132], bend: -1, fl: 0.62, hand: 'hold', flip: -1, hrot: 0.35 }, prop: { k: 'phone', hand: 'R', along: 54, off: [0, 0], a: -0.1, s: 0.95, screen: 1 } };
  }
  const HOLD_ARMS = {
    peace: () => ({ armR: { a: 2.05, e: 0.85, hand: 'peace', flip: 1, hrot: -0.1, hs: 1.05 } }),   // V sign raised beside the head, palm out
    thumbs_up: () => ({ armR: { ik: [168, -156], bend: 1, ul: 0.92, fl: 0.82, hand: 'thumb', flip: -1 } }),
    no_palm: () => ({ armR: { ik: [184, -146], bend: 1, ul: 1, fl: 0.9, hand: 'stop', flip: -1 } }),
  };
  const armsOnly = p => { const o = {}; ['armL', 'armR', 'prop', 'head'].forEach(k => { if (p[k]) o[k] = p[k]; }); return o; };
  // the arms a held prop takes over (merged after the pose, so `holding` works with walk, run, stand, sit, sit_sofa...)
  const HOLD = {
    clipboard: p => p.stance === 'side'
      ? { armR: { ik: [34, -112], bend: -1, fl: 0.5, hand: 'hold', flip: -1, hrot: 0.3 }, prop: { k: 'clipboard', at: [10, -150], a: -0.32, s: 0.92 } }
      : { armL: { ik: [-50, -106], bend: 1, fl: 0.5, hand: 'hold', flip: -1, hrot: -0.9 }, prop: { k: 'clipboard', at: [-78, -122], a: 0.06, s: 0.92 } },
    phone: (p, o) => p.prop && p.prop.k === 'phone' ? {} : phoneArms((o && (o.phoneMode || (o.pose !== 'hold_phone' && o.mode))) || 'front'),
    phone_ear: p => phoneArms('ear'), phone_front: p => phoneArms('front'), phone_show: p => phoneArms('show'), phone_out: p => phoneArms('out'),
    peace: p => HOLD_ARMS.peace(),
    thumbs_up: p => HOLD_ARMS.thumbs_up(),
    no_palm: p => HOLD_ARMS.no_palm(),
    // the cup held in front of the chest by the near hand, handle toward the hand, the cup itself clear of the fingers (ref 03)
    mug: p => ({ armL: { ik: [-18, -100], bend: 1, fl: 0.58, hand: 'fist', flip: -1, hrot: -0.25, hs: 0.95 }, prop: { k: 'mug', hand: 'L', along: 0, off: [48, -26], s: 1.25, steam: 0.15, handle: -1, over: true } }),
    // raised to the mouth by the far hand, elbow out to the side, forearm up (ref 07)
    sip: p => ({ armR: { ik: [60, -292], bend: 1, ul: 0.2, hand: 'fist', flip: 1, hrot: 0.2, hs: 0.95 }, prop: { k: 'mug', hand: 'R', along: 0, off: [-44, -22], s: 1.2, steam: 0.15, handle: 1, over: true }, head: Object.assign({}, p.head, { tilt: -0.05 }) }),
    laptop: p => armsOnly(POSES.hold_laptop({})),
    box: p => armsOnly(POSES.hold_box({})),
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
    if (pr.k === 'baby') return drawBabyProp(F, pr, at);
    const o = Object.assign({ lw: F.lw * 0.9 }, pr, { s: pr.s || 1, tint: F.tint });
    o.lw = F.lw * 0.9 * (pr.s || 1);
    if (pr.align && pr.hand) o.a = (pr.a || 0) + PI - (pr.hand === 'L' ? J.armL : J.armR).ha;   // a stick prop (bowl/bristles toward -y) along the forearm
    const fn = PROPS[pr.k]; if (!fn) return;
    const m = g.getTransform();
    if (fn.unmirror && m.a * m.d - m.b * m.c < 0) { g.save(); g.translate(at[0], at[1]); g.scale(-1, 1); fn(g, 0, 0, Object.assign(o, { a: -(o.a || 0) })); g.restore(); }   // keep its print readable when facing -1
    else fn(g, at[0], at[1], o);
  }

  // ================================================================ the figure
  function resolvePose(opts) {
    let pose = opts.pose || 'stand';
    pose = typeof pose === 'function' ? pose(opts) : typeof pose === 'string' ? (POSES[pose] || POSES.stand)(opts) : pose;
    pose = Object.assign({}, pose);
    if (opts.holding && HOLD[opts.holding]) { const h = HOLD[opts.holding](pose, opts); for (const k in h) pose[k] = k === 'head' ? Object.assign({}, pose.head, h.head) : h[k]; }
    if (opts.override) for (const k in opts.override) pose[k] = Object.assign({}, pose[k], opts.override[k]);
    return pose;
  }
  // An age draws the same design smaller: the body (everything below the neck) in its own scale kb, the head in kh (bigger
  // relative to the body), the torso a little wider (wk), limbs, hands and shoes a little chunkier. Poses stay authored for the
  // adult: arm targets and props above the shoulders are carried over to the bigger head, props in the hands grow (AG.prop).
  function figure(g, who, opts) {
    opts = opts || {};
    const BW = buildWho(who, opts), ch = BW.ch, AG = BW.AG;
    if (BW.newborn) return newbornFigure(g, ch, opts, BW);
    const kb = AG ? AG.kb : 1, hr = AG ? AG.kh / AG.kb : 1, WK = (AG ? AG.wk : 1) * (ch.wk || 1), LK = AG ? AG.limb : 1, shoeK = AG ? AG.shoe : 1;
    if (opts.seatAt) {   // sit so the seat contact lands on a set anchor; y (the floor under the feet) defaults to 224 px below it
      const sa = Array.isArray(opts.seatAt) ? opts.seatAt : [opts.seatAt.x, opts.seatAt.y], s0 = (opts.scale || 1) * (ch.h || 1), fy = opts.y != null ? opts.y : sa[1] + 224 * s0;
      opts = Object.assign({}, opts, { x: sa[0], y: fy, seat: (fy - sa[1]) / (s0 * kb), pose: opts.pose || 'sit_sofa' });
    }
    const t = Object.assign({ k: ch.top.k }, TOPS[ch.top.k], ch.top);
    if (LK !== 1) { t.arm *= LK; if (t.sleeveW) t.sleeveW *= LK; }
    let pose = resolvePose(AG ? Object.assign({}, opts, { ankleH: 54 * shoeK }) : opts);
    const bagKind = pose.bag || BW.bag;
    if (bagKind) pose = Object.assign(pose, bagParts(pose, bagKind, AG));
    if (AG) pose = ageRemap(pose, AG, hr);
    const facing = opts.facing === -1 ? -1 : 1, sc = (opts.scale || 1) * (ch.h || 1);
    const tint = opts.tint || null, cache = {};
    const c = tint ? (h => cache[h] || (cache[h] = mul(h, tint))) : (h => h);
    const F = { g, ch, c, skinC: c(ch.skin), browC: c(ch.brow || INK), tint };
    F.lw = (opts.lw ? opts.lw / sc : LW.figure / (ch.h || 1)) / kb; F.ld = F.lw * LW.detail / LW.figure;
    if (AG) { F.hlk = 1 / AG.hand; F.shoeK = shoeK; }
    const light = (opts.light == null ? 1 : opts.light) * facing;   // screen side the light comes from, in body space
    const B = ch.bottom, isSkirt = B.k === 'skirt', isShorts = B.k === 'shorts', stance = pose.stance || 'front';
    g.save();
    g.translate(opts.x || 0, opts.y || 0); g.scale(sc * facing * kb, sc * kb); g.lineCap = 'round'; g.lineJoin = 'round';
    // ---- skeleton (body space: pelvis origin)
    let pel = [0, RIG.pelvisY - 54 * (shoeK - 1)]; if (pose.pelvis) { if (pose.pelvis.y != null) pel = [pose.pelvis.x || 0, pose.pelvis.y]; else pel = [pel[0] + (pose.pelvis[0] || 0), pel[1] + (pose.pelvis[1] || 0)]; }
    const hipX = (stance === 'side' ? RIG.hipXside : RIG.hipX) * WK, legW = (isSkirt ? RIG.skinLegW : isShorts ? RIG.skinLegW * 1.2 : (B.w || RIG.legW)) * LK, shinL = RIG.shin + (ch.shoes.k === 'flat' ? 26 : 0);
    const legs = {};
    ['L', 'R'].forEach((side, i) => {
      const sp = pose['leg' + side] || { a: 0, k: 0 }, sg = i ? 1 : -1;
      let Hp, K, A;
      if (sp.pts) { [Hp, K, A] = sp.pts; if (AG) { const d = dist(K, A), mx = shinL * 1.02; if (d > mx) A = lerp2(K, A, mx / d); } }   // a child's feet dangle
      else { Hp = [sg * hipX, RIG.hipY]; K = along(Hp, sp.a || 0, RIG.thigh); A = along(K, (sp.a || 0) - (sp.k || 0), shinL); }
      legs[side] = { H: Hp, K, A, z: sp.z, foot: sp.foot || 0, sg };
    });
    if (pose.ground) { const lowest = Math.max(legs.L.A[1], legs.R.A[1]); pel[1] += (RIG.hipY + RIG.thigh + shinL) - lowest - (pose.lift || 0); }
    // ground shadow (in feet space, before moving to the pelvis)
    if (opts.shadow && pose.ground !== false) { g.fillStyle = opts.shadow; g.fill(ell(pel[0] + (legs.L.A[0] + legs.R.A[0]) / 2 + 12 * (stance === 'side' ? 1 : 0), 0, (stance === 'side' ? 120 + Math.abs(legs.L.A[0] - legs.R.A[0]) * 0.45 : 104) * WK, 15 / Math.sqrt(kb))); }
    g.translate(pel[0], pel[1]);
    const lean = pose.lean || 0, hd = pose.head || {}, shR = pose.shoulders || 0, q3 = clamp(pose.torso3q || 0, 0, 1);
    // three-quarter torso: the silhouette narrows a little and shifts toward the facing side, its details (zip, hood, pocket) shift further
    const TX = { dx: q3 * 6, k: (1 - 0.12 * q3) * WK }, DX = { dx: q3 * 16, k: (1 - 0.22 * q3) / (1 - 0.12 * q3) }, headDX = q3 * 18;
    const torsoXf = () => { g.rotate(lean); g.translate(TX.dx, 0); g.scale(TX.k, 1); };
    const T = p => rot([p[0] * TX.k + TX.dx, p[1]], lean);
    const arms = {}, HK = AG ? AG.hand : 1;
    ['L', 'R'].forEach((side, i) => {
      const sp = pose['arm' + side] || (i ? STAND_ARMR : STAND_ARML), sg = i ? 1 : -1;
      const S = T([sg * RIG.sh[0], RIG.sh[1] - shR]), L1 = RIG.upper * (sp.ul || 1), L2 = RIG.fore * (sp.fl || 1);
      let E, Wr;
      if (sp.ik) [E, Wr] = ik2(S, sp.ik, L1, L2, sp.bend || 1, false);
      else { E = along(S, (sp.a || 0) + lean * 0, L1); Wr = along(E, (sp.a || 0) + (sp.e || 0), L2); }
      arms[side] = { S, E, Wr, z: sp.z, hand: sp.hand || 'relax', flip: sp.flip || -sg, hrot: sp.hrot || 0, hs: (sp.hs || 1) * HK, sg, ha: angOf(E, Wr) + (sp.hrot || 0) };
    });
    const J = { armL: arms.L, armR: arms.R, legL: legs.L, legR: legs.R };
    const front = o => o.z !== 'back';
    // ---- what is carried on the back (school bag, the house, a holdall): behind everything
    if (pose.back) pose.back.forEach(pr => drawBackProp(F, pr, lean, T));
    // ---- legs
    const legPts = L => [L.H, L.K, along(L.A, angOf(L.K, L.A) + PI, legW / 2)];
    const thighW = pose.sit ? legW * 1.22 : legW;   // seated thighs read as thick as the refs' (foreshortened)
    const legInk = L => { const p = legPts(L); tubeInk(g, p, legW, F.lw); if (thighW !== legW) tubeInk(g, [p[0], p[1]], thighW, F.lw); };
    const legFill = L => { const p = legPts(L); tubeFill(g, p, legW, legC); if (thighW !== legW) tubeFill(g, [p[0], p[1]], thighW, legC); };
    const legC = (isSkirt || isShorts) ? F.skinC : c(B.c);
    const pelvisPath = () => {
      if (isSkirt) return null;
      if (pose.sit === 'side') return ell(0, 4, 70 * WK, 30);
      if (stance === 'side') return rrect(-56 * WK, -20, 112 * WK, 46, 20);
      return P([[-58 * WK, -20], [58 * WK, -20], [59 * WK, 26], [0, 40], [-59 * WK, 26]]);
    };
    const legEnd = L => {
      const a = angOf(L.K, L.A);
      if (isSkirt || isShorts) return;
      if (B.cuff) fs(g, P(bandPts(L.K, L.A, 18, 1, legW / 2 + 2)), c(B.cuff), F.lw * 0.85);
      else { const b = bandPts(L.K, L.A, 10, 0, legW / 2); g.fillStyle = legC; g.fill(P(b)); polyline(g, [b[0], b[1], b[2], b[3]], F.lw); }
    };
    // shorts: a wide fabric tube over the top of the (bare) leg; socks: a band above the shoe
    const shortsPts = L => { const d = dist(L.H, L.K) || 1, u = [(L.K[0] - L.H[0]) / d, (L.K[1] - L.H[1]) / d]; return [[L.H[0] - u[0] * 8, L.H[1] - u[1] * 8], lerp2(L.H, L.K, B.len || 0.8)]; };
    const shortsInk = L => { if (isShorts) tubeInk(g, shortsPts(L), legW * 1.62, F.lw); };
    const shortsFill = L => { if (!isShorts) return; const p = shortsPts(L); tubeFill(g, p, legW * 1.62, c(B.c)); const b = bandPts(p[0], p[1], 4, 0, legW * 0.81); polyline(g, [b[1], b[2]], F.ld); };
    const socks = L => { if (!B.socks) return; const p0 = lerp2(L.K, L.A, 0.5); tube(g, [p0, along(L.A, angOf(L.K, L.A), 4)], legW + 4, c(B.socks), F.lw * 0.85); };
    const shoeFor = L => drawShoe(F, along(L.A, angOf(L.K, L.A), isSkirt ? 0 : 2), stance === 'front' ? L.sg : 1, stance, L.foot);
    ['L', 'R'].forEach(s => { const L = legs[s]; if (L.z === 'back') { shoeFor(L); legInk(L); legFill(L); socks(L); shortsInk(L); shortsFill(L); legEnd(L); } });
    const fl = ['L', 'R'].map(s => legs[s]).filter(front);
    fl.forEach(shoeFor);
    const pp = pelvisPath();
    g.strokeStyle = INK; if (pp) { g.lineWidth = F.lw * 2; g.stroke(pp); } fl.forEach(legInk);
    if (pp) { g.fillStyle = isShorts ? c(B.c) : legC; g.fill(pp); } fl.forEach(legFill);
    fl.forEach(socks);
    if (isShorts) { fl.forEach(shortsInk); if (pp) { g.fillStyle = c(B.c); g.fill(pp); } fl.forEach(shortsFill); }
    if (!isSkirt && !isShorts) {
      fl.forEach(L => { const sh = offsetLine([L.H, L.K, L.A], light * (legW / 2 - 6), 0.12, 0.9); tubeFill(g, sh, 9, c(B.sh)); });
      if (B.crease) fl.forEach(L => polyline(g, offsetLine([L.H, L.K, L.A], 0, 0.3, 0.92), F.ld * 0.7));
      if (B.fly && stance === 'front' && !pose.sit) polyline(g, quadPts([2, -4], [3, 22], [-8, 32], 6), F.ld);
    }
    ['L', 'R'].forEach(s => { if (front(legs[s])) legEnd(legs[s]); });
    const SL = B.len || 214, SF = B.flare || 86;   // skirt length and hem half-width (the last video's Mom: 214, 86)
    if (isSkirt && pose.sit) {   // seated: the skirt drapes from the waist over the thighs to the knees
      const K = (stance === 'side' ? legs.L : legs.R).K, sk = new Path2D();
      if (stance === 'side') { sk.moveTo(-62, -28); sk.lineTo(54, -28); sk.quadraticCurveTo(K[0] * 0.6, K[1] - 36, K[0] + 12, K[1] - 30); sk.quadraticCurveTo(K[0] + 26, K[1], K[0] + 16, K[1] + 32); sk.quadraticCurveTo(K[0] * 0.5, K[1] + 44, -40, 42); sk.quadraticCurveTo(-66, 20, -62, -28); }
      else { sk.moveTo(-60, -28); sk.lineTo(60, -28); sk.lineTo(80, 60); sk.quadraticCurveTo(0, 72, -80, 60); sk.closePath(); }
      sk.closePath(); fs(g, sk, c(B.c), F.lw); polyline(g, quadPts([10, 10], [K[0] * 0.45, K[1] - 4], [K[0] - 10, K[1] + 4], 6), F.ld);
      if (B.motif) { g.save(); g.clip(sk); motif(g, c(B.motif), -120, -40, 360, 140, 'dots'); g.restore(); strokeP(g, sk, F.lw); }
      if (SL > 230) sitHang(F, legs, stance, c(B.c), c(B.sh), B.motif ? c(B.motif) : null, SL - 150);
    } else if (isSkirt) {
      const sw = (legs.R.A[0] + legs.L.A[0]) * 0.25, L = SL;
      const sk = new Path2D(); sk.moveTo(-60, -28); sk.lineTo(60, -28); sk.quadraticCurveTo(76, 90 * L / 214, SF + sw, L); sk.quadraticCurveTo(sw, L + 12, -SF + sw, L); sk.quadraticCurveTo(-76, 90 * L / 214, -60, -28); sk.closePath();
      fs(g, sk, c(B.c), 0); g.save(); g.clip(sk); g.fillStyle = c(B.sh); g.fill(P([[light > 0 ? -90 : 90, -30], [light > 0 ? -50 : 50, -30], [light > 0 ? -60 + sw : 60 + sw, L + 16], [light > 0 ? -100 : 100, L + 16]]));
      if (B.motif) motif(g, c(B.motif), -110, -30, 220, L + 20, 'dots');
      g.restore();
      strokeP(g, sk, F.lw);
      if (B.wrap) {   // a wrapper: the overlapping front edge and the tuck at the waist
        polyline(g, quadPts([38, -24], [30, L * 0.5], [22 + sw, L + 6], 10), F.lw * 0.8);
        fs(g, ell(42, -16, 13, 9, 0.5), c(B.c), F.ld); polyline(g, quadPts([40, -10], [50, 14], [44, 36], 5), F.ld);
      } else { polyline(g, quadPts([-20, 60 * L / 214], [-26, 140 * L / 214], [-30, 210 * L / 214], 6), F.ld); polyline(g, quadPts([30, 80 * L / 214], [36, 150 * L / 214], [40, L], 6), F.ld); }
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
        if (t.bell) { const b = bandPts(A.E, A.Wr, 30, 1, t.arm / 2 + 1), e = bandPts(A.E, A.Wr, 4, 1, t.arm / 2 + 9); fs(g, P([b[0], e[1], e[2], b[3]]), c(t.c), F.lw * 0.85); polyline(g, [lerp2(b[0], e[1], 0.3), lerp2(b[3], e[2], 0.3)], F.ld * 0.7); }
        else fs(g, P(bandPts(A.E, A.Wr, t.cuff, 1, t.arm / 2 + 1)), c(t.cuffC || t.c), F.lw * 0.85);
      }
      drawHand(F, A.Wr, A.ha, A.hand, A.flip, A.hs);
    };
    ['L', 'R'].forEach(s => { if (arms[s].z === 'back') drawArm(arms[s], null); });
    // ---- torso (union with the front sleeves, so shoulders have no seam)
    const fa = ['L', 'R'].map(s => arms[s]).filter(front);
    F.torsoP = torsoPath(t);
    g.save(); torsoXf(); g.lineWidth = F.lw * 2 / TX.k; g.strokeStyle = INK; g.stroke(F.torsoP); g.restore();
    fa.forEach(A => { if (t.sleeve === 'short') strokeP(g, sleeveShort(A.S, A.E, t).p, F.lw * 2); else tubeInk(g, armTube(A), t.arm, F.lw); });
    g.save(); torsoXf(); g.fillStyle = c(t.c); g.fill(F.torsoP); g.restore();
    fa.forEach(A => { if (t.sleeve === 'short') { g.fillStyle = c(t.c); g.fill(sleeveShort(A.S, A.E, t).p); } else tubeFill(g, armTube(A), t.arm, c(t.c)); });
    // a long garment (kaftan, gown, lab coat) continues below the hem; the front arms are redrawn over it after the head
    if (t.long) drawRobe(F, t, legs, pose, stance, light, torsoXf, TX);
    g.save(); g.rotate(lean);
    g.save(); g.translate(TX.dx, 0); g.scale(TX.k, 1);
    g.save(); g.clip(F.torsoP); g.fillStyle = c(t.sh); g.fill(P([[light > 0 ? -t.hw - 10 : t.hw + 10, -150], [light > 0 ? -t.hw + 16 : t.hw - 16, -150], [light > 0 ? -t.hw + 18 : t.hw - 18, t.hem + 10], [light > 0 ? -t.hw - 10 : t.hw + 10, t.hem + 10]])); g.restore();
    g.save(); g.translate(DX.dx, 0); g.scale(DX.k, 1); torsoDetails(F, t); if (pose.straps) drawStraps(F, t, pose.straps, stance, LK); g.restore();
    g.restore();
    // ---- head (a child's is bigger than its body scale: drawn at hr, sitting on the same neck)
    g.save(); g.translate(headDX, RIG.neckY); g.rotate(hd.tilt || 0);
    const headCY = hr === 1 ? RIG.headDy : RIG.neckY - (8 + 100 * hr);
    g.translate(0, headCY - RIG.neckY + (hd.sink || 0)); if (hr !== 1) g.scale(hr, hr);
    let turn = opts.turn != null ? opts.turn : (hd.turn || 0), look = normLook(opts.look);
    if (opts.lookAt) {   // a point in the caller's space (same as x, y): turn the face and the eyes toward it
      const tp = normLook(opts.lookAt), hb = rot([headDX, headCY], lean), hx = (opts.x || 0) + facing * sc * kb * (pel[0] + hb[0]), hy = (opts.y || 0) + sc * kb * (pel[1] + hb[1]);
      const dxb = (tp[0] - hx) * facing, dy = tp[1] - hy, dd = Math.hypot(dxb, dy) || 1;
      if (opts.turn == null) turn = clamp(dxb / (240 * sc), -1, 1) * 0.62;
      if (opts.look == null) look = [dxb / dd, dy / dd];
    }
    const lw0 = F.lw, ld0 = F.ld; if (hr !== 1) { F.lw /= hr; F.ld /= hr; }
    drawHead(g, ch, F, { expr: opts.expr || pose.expr || 'neutral', face: opts.face || pose.face, look, blink: opts.blink, mouth: opts.mouth, turn, nod: opts.nod != null ? opts.nod : (hd.nod || 0), marks: opts.marks });
    F.lw = lw0; F.ld = ld0;
    J.head = g.getTransform();
    g.restore();
    g.restore();   // un-lean
    // ---- held props, then the front arms over them
    const shoulderClip = A => { const cl = new Path2D(); cl.rect(-3000, -3000, 6000, 6000); cl.arc(A.S[0], A.S[1], t.arm * 0.62, 0, TAU); return cl; };
    const allProps = [pose.prop, pose.prop2].filter(Boolean), props = opts.prop === false ? [] : allProps;
    const under = allProps.map(p => p.under || '').join('');
    fa.forEach(A => { if (under.includes(A.sg < 0 ? 'L' : 'R')) drawArm(A, shoulderClip(A)); });
    props.forEach(pr => { if (!pr.over) drawProp(F, pr, J); });
    if (opts.drawProp) opts.drawProp(g, J, F);
    fa.forEach(A => { if (under.includes(A.sg < 0 ? 'L' : 'R')) drawHand(F, A.Wr, A.ha, A.hand, A.flip, A.hs); else drawArm(A, shoulderClip(A)); });
    props.forEach(pr => { if (pr.over) drawProp(F, pr, J); });
    // ---- world-space anchors for the caller (bubbles, props)
    const M = g.getTransform(), wp = p => { const q = M.transformPoint(new DOMPoint(p[0], p[1])); return [q.x, q.y]; };
    const hm = J.head, hw = p => { const q = hm.transformPoint(new DOMPoint(p[0], p[1])); return [q.x, q.y]; };
    const near = stance === 'side' ? legs.L : legs.R, thW = (pose.sit ? legW * 1.22 : legW) / 2;
    const out = { head: hw([0, 0]), headTop: hw([0, -100]), headR: 100 * sc * (AG ? AG.kh : 1), mouth: hw([0, 50]), handL: wp(arms.L.Wr), handR: wp(arms.R.Wr), elbowL: wp(arms.L.E), elbowR: wp(arms.R.E), pelvis: wp([0, 0]), scale: sc, bodyScale: sc * kb,
      knee: wp(near.K), kneeL: wp(legs.L.K), kneeR: wp(legs.R.K), feet: wp([(legs.L.A[0] + legs.R.A[0]) / 2, Math.max(legs.L.A[1], legs.R.A[1]) + 54 * shoeK]),
      seat: pose.sit ? wp([0, pose.seatH != null ? -pel[1] - pose.seatH : RIG.hipY + thW]) : null, lap: pose.sit ? wp([(near.H[0] + near.K[0]) / 2, (near.H[1] + near.K[1]) / 2 - thW]) : null };
    g.restore();
    return out;
  }

  // ================================================================ FIRSTBORN additions (2026-11): ages, the family, outfits, props, poses.
  // Everything above keeps its meaning: the old ids, poses, expressions and props draw exactly as before.
  Object.assign(C, {
    fbBlack: '#231D1B', fbBlackHi: '#4A403C', fbGrey: '#A7A19B', fbGreyHi: '#CBC6C0', gold: '#E6B54A', goldSh: '#C99A35',
    // skin, in the range of the reference's coworker (#CBA17C)
    fbSkinMum: '#BC8E66', fbSkinDad: '#AD7F59', fbSkinSis: '#C69A74', fbSkinBro: '#C19169', fbSkinAunt: '#AF7D55', fbSkinU1: '#A87852',
    fbSkinU2: '#B88A62', fbSkinC1: '#C79E78', fbSkinC2: '#B98962', fbSkinOk: '#B0815B',
    mumBuba: '#EBA845', mumBubaSh: '#D49233', mumWrap: '#8E3B5E', mumWrapSh: '#77304F',
    dadKaftan: '#4069A0', dadKaftanSh: '#36598A', dadThread: '#E8C35C',
    sisCoral: '#E8776A', sisCoralSh: '#D06357', sisBlanket: '#EE9A8C', sisBlanketSh: '#DC8475',
    broTee: '#F2BE4A', broTeeSh: '#DCA738', broShorts: '#4F7FB0', broShortsSh: '#436D99', broBlanket: '#F3C65E', broBlanketSh: '#DDAE45',
    auntie: '#C2477E', auntieSh: '#A63A6B', auntieHi: '#D86B9A', coral: '#E2553F',
    u1Kaftan: '#8C3D45', u1KaftanSh: '#76323A', u2Dashiki: '#E07B39', u2DashikiSh: '#C96A2D', u2Panel: '#2E2926', u2Trousers: '#5E4636', u2TrousersSh: '#4E3A2C',
    c1Tee: '#7DB356', c1TeeSh: '#6A9C47', c1Jeans: '#56789B', c1JeansSh: '#4A6886', c2Top: '#9B7FC4', c2TopSh: '#8669AF',
    okShorts: '#3C4F7A', okShortsSh: '#33436A',
    gown: '#353A4C', gownSh: '#292D3C', labcoat: '#FFFFFF', labcoatSh: '#E3E6EA',
    bag: '#E06A4E', bagSh: '#C75A41', bagStrap: '#B44F39', wood: '#D9A86C', woodSh: '#BF8C55', bucketBlue: '#4F95C9', bucketBlueSh: '#3F80B2',
    water: '#9FD6EE', waterHi: '#D3EEF8', glass: '#E8F6FB', glassSh: '#CBE6F0', calc: '#4F5866', calcSh: '#424A56', calcKey: '#DADDE2', calcScreen: '#CFE5C8',
    reportPaper: '#FFFDF6', reportBand: '#5E9A55', gradeRed: '#D9463E', houseWall: '#F4D9A8', houseWallSh: '#E4C28C', houseRoof: '#C65A3E', houseRoofSh: '#A84A33',
    houseDoor: '#8B5A3C', holdall: '#5F7FA5', holdallSh: '#4F6D90', bookRed: '#C8574A', bookBlue: '#4F7FB0', bookGreen: '#5E9A55', bookYellow: '#E8B04B',
    paintRed: '#E5534B', paintBlue: '#4F95C9', paintYellow: '#F4BF54', paintGreen: '#6FA35A',
  });
  Object.assign(TOPS, {
    buba: { sw: 74, hw: 88, hem: 16, arm: 50, cuff: 22, sleeve: 'long' },                       // the loose blouse worn with a wrapper
    kaftan: { sw: 77, hw: 80, hem: 12, arm: 47, cuff: 16, sleeve: 'long', long: 172 },          // the tunic to the knee
    gown: { sw: 80, hw: 88, hem: 12, arm: 60, cuff: 0, sleeve: 'long', long: 236, bell: 1 },     // graduation gown, bell sleeves
    labcoat: { sw: 78, hw: 84, hem: 12, arm: 47, cuff: 14, sleeve: 'long', long: 118 },
    dashiki: { sw: 78, hw: 90, hem: 18, arm: 28, sleeveW: 62, sleeve: 'short' },
    schoolshirt: { sw: 76, hw: 78, hem: 8, arm: 28, sleeveW: 52, sleeve: 'short' },
  });
  // ---- the family (ids prefixed fb_; the last video's 'mum' stays the last video's Mom)
  Object.assign(CAST, {
    fb_mum: { skin: C.fbSkinMum, top: { k: 'buba', c: C.mumBuba, sh: C.mumBubaSh, trim: C.mumWrap }, bottom: { k: 'skirt', c: C.mumWrap, sh: C.mumWrapSh, len: 266, flare: 76, wrap: 1, motif: C.mumBuba },
      shoes: { k: 'flat', c: '#6E4A36' }, hair: { k: 'headwrap', c: C.mumWrap, sh: C.mumWrapSh, motif: C.mumBuba }, earrings: C.gold, brow: '#2A1E18', h: 0.95, wk: 1.04 },
    fb_dad: { skin: C.fbSkinDad, top: { k: 'kaftan', c: C.dadKaftan, sh: C.dadKaftanSh, thread: C.dadThread }, bottom: { k: 'trousers', c: C.dadKaftan, sh: C.dadKaftanSh },
      shoes: { k: 'dress', c: '#4A3426', sole: '#2E2018' }, hair: { k: 'short', c: C.fbBlack, hi: C.fbBlackHi, temples: C.fbGrey }, glasses: 1, moustache: C.fbBlack, brow: INK, h: 1.02, wk: 1.06 },
    fb_sister: { skin: C.fbSkinSis, age: 'kid', top: { k: 'tee', c: C.sisCoral, sh: C.sisCoralSh, collar: '#FFFFFF' }, bottom: { k: 'skirt', c: C.sisCoral, sh: C.sisCoralSh, len: 150, flare: 94 },
      shoes: { k: 'flat', c: '#8E4A3A' }, hair: { k: 'puffs', c: C.fbBlack, hi: C.fbBlackHi, ties: C.paintYellow }, brow: INK, h: 1,
      ages: { baby: { kind: 'newborn', blanket: C.sisBlanket, blanketSh: C.sisBlanketSh, hair: { k: 'curl', c: C.fbBlack } }, kid: {},
        grown: { kind: 'adult', h: 0.94, top: { k: 'tee', c: C.sisCoral, sh: C.sisCoralSh }, bottom: { k: 'jeans', c: C.jeans, sh: C.jeansSh, cuff: C.jeansCuff, fly: 1 },
          shoes: { k: 'trainer', c: C.sisCoral, sole: '#FFFFFF', toe: '#FFFFFF', laces: '#FFFFFF' }, hair: { k: 'braids', c: C.fbBlack, hi: C.fbBlackHi, style: 'down' }, earrings: C.gold } } },
    fb_brother: { skin: C.fbSkinBro, age: 'kid', top: { k: 'tee', c: C.broTee, sh: C.broTeeSh }, bottom: { k: 'shorts', c: C.broShorts, sh: C.broShortsSh, len: 0.78 },
      shoes: { k: 'trainer', c: '#E5534B', sole: '#FFFFFF', toe: '#FFFFFF', laces: '#FFFFFF' }, hair: { k: 'short', c: C.fbBlack, hi: C.fbBlackHi, low: 1 }, brow: INK, h: 1,
      ages: { baby: { kind: 'newborn', blanket: C.broBlanket, blanketSh: C.broBlanketSh, hair: null }, toddler: { kind: 'toddler' }, kid: {} } },
    fb_auntie: { skin: C.fbSkinAunt, top: { k: 'buba', c: C.auntie, sh: C.auntieSh, trim: C.gold }, bottom: { k: 'skirt', c: C.auntie, sh: C.auntieSh, len: 270, flare: 80, wrap: 1, motif: C.gold },
      shoes: { k: 'flat', c: C.goldSh }, hair: { k: 'gele', c: C.auntie, sh: C.auntieSh, hi: C.auntieHi, motif: C.gold }, earrings: C.gold, beads: C.coral, brow: '#2A1E18', h: 0.97, wk: 1.12 },
    fb_uncle1: { skin: C.fbSkinU1, top: { k: 'kaftan', c: C.u1Kaftan, sh: C.u1KaftanSh, thread: C.gold, long: 196 }, bottom: { k: 'trousers', c: C.u1Kaftan, sh: C.u1KaftanSh },
      shoes: { k: 'dress', c: '#3A2A20', sole: '#241A14' }, hair: { k: 'short', c: C.fbBlack, hi: C.fbBlackHi }, hat: { k: 'fila', c: C.u1Kaftan, sh: C.u1KaftanSh, band: C.gold }, brow: INK, h: 1.04, wk: 1.08 },
    fb_uncle2: { skin: C.fbSkinU2, top: { k: 'dashiki', c: C.u2Dashiki, sh: C.u2DashikiSh, panel: C.u2Panel, motif: C.gold, hw: 98 }, bottom: { k: 'trousers', c: C.u2Trousers, sh: C.u2TrousersSh, w: 50 },
      shoes: { k: 'dress', c: '#3A2A20', sole: '#241A14' }, hair: { k: 'side', c: C.fbGrey, hi: C.fbGreyHi }, beard: C.fbGrey, brow: '#77716B', h: 0.97, wk: 1.14 },
    fb_cousin1: { skin: C.fbSkinC1, top: { k: 'tee', c: C.c1Tee, sh: C.c1TeeSh }, bottom: { k: 'jeans', c: C.c1Jeans, sh: C.c1JeansSh, cuff: '#6A8BAD', fly: 1 },
      shoes: { k: 'trainer', c: '#303030', sole: '#FFFFFF', toe: '#FFFFFF', laces: '#FFFFFF' }, hair: { k: 'short', top: 'high', c: C.fbBlack, hi: C.fbBlackHi }, brow: INK, h: 0.99 },
    fb_cousin2: { skin: C.fbSkinC2, top: { k: 'tee', c: C.c2Top, sh: C.c2TopSh }, bottom: { k: 'skirt', c: C.jeans, sh: C.jeansSh, len: 196, flare: 84 },
      shoes: { k: 'flat', c: '#5A3E5E' }, hair: { k: 'braids', c: C.fbBlack, hi: C.fbBlackHi, style: 'down' }, earrings: C.gold, brow: INK, h: 0.95 },
    fb_okafor_son: { skin: C.fbSkinOk, age: 'kid', top: { k: 'schoolshirt', c: '#FFFFFF', sh: '#E4E4E4' }, bottom: { k: 'shorts', c: C.okShorts, sh: C.okShortsSh, len: 0.86, socks: '#FFFFFF' },
      shoes: { k: 'dress', c: '#2E2E2E', sole: '#1E1E1E' }, hair: { k: 'short', c: C.fbBlack, hi: C.fbBlackHi, part: 1 }, glasses: 1, brow: INK, h: 1.03 },
  });
  CAST.hero.ages = { newborn: { kind: 'newborn', blanket: C.hoodie, blanketSh: C.hoodieSh }, kid: { kind: 'kid' }, teen: { kind: 'teen' } };
  // ---- ages: proportion kinds. kb body scale, kh head scale, wk torso width, limb/hand/shoe chunkiness, prop (held props), bag (school bag)
  const AGES = {
    adult: null,
    teen: { kb: 0.85, kh: 0.94, wk: 1.03, limb: 1.05, hand: 1.03, shoe: 1.03, prop: 1.06, bag: 1.15 },
    kid: { kb: 0.56, kh: 0.8, wk: 1.14, limb: 1.28, hand: 1.18, shoe: 1.22, prop: 1.3, bag: 1.75 },
    toddler: { kb: 0.42, kh: 0.72, wk: 1.24, limb: 1.45, hand: 1.3, shoe: 1.32, prop: 1.5, bag: 1.9 },
    newborn: { newborn: 1, kh: 0.42 },
  };
  const AGE_KIND = { newborn: 'newborn', baby: 'newborn', infant: 'newborn', toddler: 'toddler', kid: 'kid', child: 'kid', six: 'kid', teen: 'teen', teenager: 'teen', adult: 'adult', grown: 'adult' };
  const AGE_SYN = { newborn: ['newborn', 'baby', 'infant'], toddler: ['toddler'], kid: ['kid', 'child', 'six'], teen: ['teen', 'teenager'], adult: ['adult', 'grown'] };
  // outfits put on over a character, keeping the face, skin, hair and shoes
  const OUTFITS = {
    gown: ch => Object.assign({}, ch, { top: { k: 'gown', c: C.gown, sh: C.gownSh, stole: C.gold }, hat: { k: 'mortar', c: C.gown, sh: C.gownSh, tassel: C.gold },
      hair: ch.hair && ch.hair.k === 'braids' ? Object.assign({}, ch.hair, { style: 'bun' }) : ch.hair }),
    labcoat: ch => Object.assign({}, ch, { top: { k: 'labcoat', c: C.labcoat, sh: C.labcoatSh, under: ch.top.c, underSh: ch.top.sh } }),
    party: ch => Object.assign({}, ch, { top: { k: 'kaftan', c: ch.top.c, sh: ch.top.sh, thread: C.gold }, hat: ch.hat || { k: 'fila', c: ch.top.c, sh: ch.top.sh, band: C.gold } }),
  };
  const WHO_ALIAS = { okafor_son: 'fb_okafor_son', fb_okafor: 'fb_okafor_son', fb_mom: 'fb_mum', fb_aunt: 'fb_auntie' };
  // who: 'hero' | 'fb_mum' | ... optionally with dot tokens for age, outfit and bag: 'hero.kid', 'hero.newborn', 'fb_sister.grown.gown',
  // 'fb_dad.labcoat', 'hero.kid.bag'. opts.age / opts.outfit / opts.bag win over the tokens.
  function buildWho(who, opts) {
    if (typeof who !== 'string') return { ch: who || CAST.hero, AG: null };
    const parts = who.split('.'), base = CAST[WHO_ALIAS[parts[0]] || parts[0]] || CAST.hero;
    let age = null, outfit = null, bag = null;
    parts.slice(1).forEach(tk => { if (AGE_KIND[tk] || (base.ages && base.ages[tk])) age = tk; else if (OUTFITS[tk]) outfit = tk; else if (tk === 'bag' || tk === 'schoolbag') bag = 'school'; });
    age = opts.age || age || base.age || 'adult'; outfit = opts.outfit || outfit; bag = opts.bag || bag;
    let entry = base.ages && base.ages[age], kind = entry && entry.kind;
    if (!entry && base.ages) { const syn = AGE_SYN[AGE_KIND[age]] || []; for (const k of syn) if (base.ages[k]) { entry = base.ages[k]; break; } }
    kind = (entry && entry.kind) || AGE_KIND[age] || 'adult';
    let ch = base;
    if (entry && Object.keys(entry).some(k => k !== 'kind')) { ch = Object.assign({}, base, entry); delete ch.kind; }
    if (outfit && OUTFITS[outfit]) ch = OUTFITS[outfit](ch);
    const AG = AGES[kind] || null;
    return { ch, AG: AG && !AG.newborn ? AG : null, newborn: AG && AG.newborn ? AG : null, age, kind, outfit, bag };
  }
  function ageRemap(pose, AG, hr) {   // carry adult-authored targets near the head over to the child's bigger head; grow held props
    const H0 = RIG.headDy, Hk = RIG.neckY - (8 + 100 * hr);
    const map = p => { const w = clamp((-200 - p[1]) / 62, 0, 1); if (!w) return p; return [lerp(p[0], p[0] * hr, w), lerp(p[1], Hk + (p[1] - H0) * hr, w)]; };
    const o = Object.assign({}, pose);
    ['armL', 'armR'].forEach(k => { if (o[k] && o[k].ik) o[k] = Object.assign({}, o[k], { ik: map(o[k].ik) }); });
    ['prop', 'prop2'].forEach(k => {
      const pr = o[k]; if (!pr) return; const q = Object.assign({}, pr);
      if (q.at) q.at = map(q.at); q.s = (q.s || 1) * AG.prop;
      if (q.hand) { if (q.off) q.off = [q.off[0] * AG.prop, q.off[1] * AG.prop]; q.along = (q.along != null ? q.along : 30) * AG.prop; }
      o[k] = q;
    });
    return o;
  }

  // ---- the newborn: the same bald round head and face, the body swaddled in a blanket (the hero's is teal)
  // baby space: head centre at the origin, R = 100, the bundle below it to y = 326
  function bundleDraw(g, ch, o, lw, c) {
    const F = { g, ch, c, lw, ld: lw * LW.detail / LW.figure, skinC: c(ch.skin), browC: c(ch.brow || INK) };
    const raw = ch.blanket || C.hoodie, bc = c(raw), bsh = c(ch.blanketSh || C.hoodieSh), bin = c(mix(raw, '#FFFFFF', 0.42));
    const body = spl([[-94, 76], [-112, 140], [-106, 224], [-82, 290], [-44, 320], [0, 326], [44, 320], [82, 290], [106, 224], [112, 140], [94, 76], [48, 58], [0, 54], [-48, 58]], true);
    fs(g, body, bc, 0);
    const flap = quadPts([114, 104], [6, 168], [-112, 274], 12);
    g.save(); g.clip(body);
    g.fillStyle = bsh; g.fill(P([[74, 40], [140, 40], [140, 390], [58, 390]]));
    tubeFill(g, offsetLine(flap, -8, 0.0, 1.0), 12, bsh);
    g.restore();
    strokeP(g, body, lw);
    polyline(g, flap, lw * 0.8);
    polyline(g, quadPts([-62, 296], [0, 280], [62, 296], 8), F.ld);
    g.save(); if (o.headRot) g.rotate(o.headRot);
    drawHead(g, ch, F, { expr: o.expr || 'neutral', face: o.face, look: normLook(o.look), blink: o.blink, mouth: o.mouth, turn: o.turn || 0, nod: o.nod || 0 });
    g.restore();
    const col = new Path2D(); col.moveTo(-104, 62); col.quadraticCurveTo(0, 112, 104, 62); col.quadraticCurveTo(118, 82, 108, 100); col.quadraticCurveTo(0, 150, -108, 100); col.quadraticCurveTo(-118, 82, -104, 62); col.closePath();
    fs(g, col, bin, lw);
    if (o.fists) [-1, 1].forEach(s => { const fx = s * 48, fy = 82; fs(g, ell(fx, fy, 19, 17), F.skinC, lw * 0.9); [-5, 4].forEach(dx => polyline(g, [[fx + dx, fy - 12], [fx + dx, fy - 3]], F.ld * 0.7)); });
  }
  // a newborn as a figure: pose 'lie' (default: lying, head toward the facing side, (x, y) = where the bundle rests) or 'held' / 'upright'
  // ((x, y) = the bottom of the bundle). opts: scale (1 = a newborn beside a scale-1 adult), facing, expr, blink, look, mouth, rot, fists, tint, shadow.
  function newbornFigure(g, ch, opts, BW) {
    const s = (opts.scale || 1) * (ch.h || 1) * BW.newborn.kh, facing = opts.facing === -1 ? -1 : 1;
    const pose = typeof opts.pose === 'string' ? opts.pose : 'lie', upright = /held|stand|upright|sit|cradle/.test(pose);
    const tint = opts.tint || null, cache = {}, c = tint ? (h => cache[h] || (cache[h] = mul(h, tint))) : (h => h);
    const lw = (opts.lw || LW.figure * 0.85 * (opts.scale || 1)) / s;
    g.save(); g.translate(opts.x || 0, opts.y || 0); g.scale(facing, 1); g.lineCap = 'round'; g.lineJoin = 'round';
    if (opts.shadow) { g.fillStyle = opts.shadow; g.fill(ell(0, 0, (upright ? 90 : 210) * s, 12)); }
    let headRot;
    if (upright) { g.rotate(opts.rot != null ? opts.rot : 0.08); g.scale(s, s); g.translate(0, -326); headRot = 0; }
    else { g.translate(0, -112 * s); g.rotate(PI / 2 + (opts.rot || 0)); g.scale(s, s); g.translate(0, -113); headRot = -(PI / 2 + (opts.rot || 0)) * 0.72; }
    if (opts.headRot != null) headRot = opts.headRot;
    bundleDraw(g, ch, Object.assign({}, opts, { headRot }), lw, c);
    const M = g.getTransform(), wp = p => { const q = M.transformPoint(new DOMPoint(p[0], p[1])); return [q.x, q.y]; }, wh = p => wp(rot(p, headRot));
    const out = { head: wp([0, 0]), headTop: wh([0, -100]), headR: 100 * s, mouth: wh([0, 50]), handL: wp([-48, 84]), handR: wp([48, 84]), elbowL: wp([-96, 150]), elbowR: wp([96, 150]),
      pelvis: wp([0, 200]), scale: s, bodyScale: s, knee: wp([0, 270]), kneeL: wp([0, 270]), kneeR: wp([0, 270]), feet: [opts.x || 0, opts.y || 0], seat: null, lap: null };
    g.restore();
    return out;
  }
  // the newborn in someone's arms (pose prop k: 'baby'): at = the middle of the bundle, a = its rotation (0 = head up), s = size
  function drawBabyProp(F, pr, at) {
    const g = F.g, bw = buildWho(pr.who || 'hero', { age: 'newborn' }), k = AGES.newborn.kh * (pr.s || 1);
    g.save(); g.translate(at[0], at[1]); g.rotate(pr.a || 0); g.scale(k, k); g.translate(0, -113);
    bundleDraw(g, bw.ch, { expr: pr.expr, blink: pr.blink, look: pr.look, mouth: pr.mouth, headRot: pr.headRot || 0, fists: pr.fists }, F.lw * 0.85 / k, F.c);
    g.restore();
  }
  PROPS.baby = function (g, x, y, o) {   // world space: a newborn bundle centred at x, y; o.who, o.s, o.a, o.expr, o.blink, o.look, o.mouth, o.fists
    o = o || {}; const s = o.s || 1, F = { g, c: o.tint ? (h => mul(h, o.tint)) : (h => h), lw: (o.lw || LW.figure) / s };
    drawBabyProp(F, Object.assign({}, o, { s }), [x, y]);
  };

  // ---- things carried on the back, straps, long garments, prints
  function bagParts(pose, kind, AG) {
    const k = AG ? AG.bag : 1, side = pose.stance === 'side', hold = kind === 'holdall';
    const pr = hold ? { k: 'holdall', at: side ? [-70, -20] : [-96, -24], s: 1.15, torso: false }
      : { k: 'schoolbag', at: side ? [-66 - 34 * k, -146] : [0, -150 + 12 * (k - 1)], s: (side ? 1.0 : 1.08) * k, sx: side ? 0.66 : 1, torso: true };
    return { back: (pose.back || []).concat([pr]), straps: { c: hold ? C.holdallSh : C.bagStrap, side, diag: hold } };
  }
  function drawBackProp(F, pr, lean, T) {   // pr.at in torso space (pr.torso) or pelvis space; pr.torsoAt: a torso point, the prop upright-ish (pr.a) in pelvis space
    const g = F.g, fn = PROPS[pr.k]; if (!fn) return;
    g.save();
    if (pr.torsoAt) { const q = T(pr.torsoAt), off = pr.off || [0, 0]; g.translate(q[0] + off[0], q[1] + off[1]); }
    else { if (pr.torso) g.rotate(lean); g.translate(pr.at[0], pr.at[1]); }
    if (pr.sx) g.scale(pr.sx, 1);
    fn(g, 0, 0, Object.assign({}, pr, { s: pr.s || 1, lw: F.lw * 0.9 * (pr.s || 1), tint: F.tint }));
    g.restore();
  }
  function drawStraps(F, t, st, stance, LK) {   // torso detail space
    const g = F.g, w = 15 * (LK || 1), col = F.c(st.c || C.bagStrap);
    if (st.diag) { tube(g, quadPts([52, -250], [10, -140], [-70, -14], 8), w, col, F.ld); return; }
    if (st.side) { tube(g, quadPts([4, -266], [22, -200], [30, -116], 8), w, col, F.ld); return; }
    [-1, 1].forEach(s => tube(g, quadPts([s * 44, -264], [s * 56, -200], [s * 66, -110], 8), w, col, F.ld));
  }
  function motif(g, col, x0, y0, w, h, kind, step) {   // a sparse print (dots, rings, or the two alternating)
    step = step || 30; g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 2.4;
    for (let j = 0, y = y0; y < y0 + h; y += step * 0.86, j++) for (let i = 0, x = x0 + (j % 2) * step / 2; x < x0 + w; x += step, i++) {
      const k = kind === 'mix' ? ((i + j) % 2 ? 'ring' : 'dot') : kind;
      if (k === 'ring') g.stroke(circ(x, y, 5.2)); else if (k === 'diamond') g.fill(P([[x, y - 6], [x + 5, y], [x, y + 6], [x - 5, y]])); else g.fill(circ(x, y, 3.6));
    }
  }
  function sitHang(F, legs, stance, col, sh, motifC, len) {   // a long skirt or robe falling from the knee toward the floor when seated
    const g = F.g, p = new Path2D();
    if (stance === 'side') { const K = legs.L.K, A = legs.L.A, y1 = Math.min(K[1] + len, A[1] - 2); p.moveTo(K[0] - 44, K[1] + 14); p.lineTo(K[0] + 24, K[1] + 6); p.quadraticCurveTo(K[0] + 34, (K[1] + y1) / 2, K[0] + 38, y1); p.quadraticCurveTo(K[0] - 6, y1 + 6, K[0] - 48, y1); p.closePath(); }
    else { p.moveTo(-82, 56); p.lineTo(82, 56); p.lineTo(88, 56 + len); p.quadraticCurveTo(0, 64 + len, -88, 56 + len); p.closePath(); }
    fs(g, p, col, F.lw);
    if (motifC) { g.save(); g.clip(p); motif(g, motifC, -200, 0, 500, 400, 'dot'); g.restore(); strokeP(g, p, F.lw); }
  }
  function drawRobe(F, t, legs, pose, stance, light, torsoXf, TX) {
    const g = F.g, c = F.c, L = t.long, hw = t.hw;
    if (pose.sit) {
      const K = (pose.sit === 'front' ? legs.R : legs.L).K, sk = new Path2D();
      if (pose.sit === 'front') { sk.moveTo(-hw, -20); sk.lineTo(hw, -20); sk.lineTo(hw + 10, 60); sk.quadraticCurveTo(0, 70, -hw - 10, 60); sk.closePath(); }
      else { sk.moveTo(-hw * 0.8, -20); sk.lineTo(hw * 0.7, -20); sk.quadraticCurveTo(K[0] * 0.6, K[1] - 40, K[0] + 14, K[1] - 32); sk.quadraticCurveTo(K[0] + 28, K[1], K[0] + 18, K[1] + 34); sk.quadraticCurveTo(K[0] * 0.5, K[1] + 46, -40, 44); sk.quadraticCurveTo(-hw * 0.9, 24, -hw * 0.8, -20); sk.closePath(); }
      fs(g, sk, c(t.c), F.lw);
      if (L > 150) sitHang(F, legs, pose.sit === 'front' ? 'front' : 'side', c(t.c), c(t.sh), null, Math.min(L - 120, 150));
      return;
    }
    const ax = legs.L.A[0], bx = legs.R.A[0], mid = (ax + bx) * 0.25 / TX.k, half = Math.max(hw + 6, Math.abs(ax - bx) / 2 / TX.k + 44);
    g.save(); torsoXf();
    const top = t.hem - 30, path = sd => { const p = new Path2D(); p.moveTo(-hw, top); p.lineTo(-hw, t.hem - 4); p.quadraticCurveTo(-hw - 3, L * 0.45, mid - half, L); p.quadraticCurveTo(mid, L + 10, mid + half, L); p.quadraticCurveTo(hw + 3, L * 0.45, hw, t.hem - 4); p.lineTo(hw, top); if (sd) p.closePath(); return p; };
    const fill = path(true); g.fillStyle = c(t.c); g.fill(fill);
    g.save(); g.clip(fill);
    const sx = light > 0 ? -1 : 1; g.fillStyle = c(t.sh); g.fill(P([[sx * (hw + 30), top], [sx * (hw - 18), top], [mid + sx * (half - 22), L + 20], [mid + sx * (half + 40), L + 20]]));
    if (t.k === 'labcoat') {
      polyline(g, [[0, top], [mid * 0.9, L + 8]], F.lw * 0.8);
      [-1, 1].forEach(s => { const px = s * hw * 0.52 + mid * 0.4, py = L * 0.3; fs(g, P([[px - 22, py], [px + 22, py], [px + 21, py + 36], [px - 21, py + 36]]), c(t.c), F.ld); });
    } else if (t.k === 'kaftan') {
      [-1, 1].forEach(s => polyline(g, [[mid + s * (half - 6), L - 2], [mid + s * (half - 10), L - 58]], F.ld));
      if (t.thread) tube(g, [[mid - half - 10, L - 12], [mid + half + 10, L - 12]], 4, c(t.thread), 0);
    } else if (t.k === 'gown') {
      [[-34, 40, -44], [8, 48, 10], [48, 40, 60]].forEach(([x0, y0, x1]) => polyline(g, quadPts([x0, y0], [x0 + (x1 - x0) * 0.4, L * 0.55], [mid + x1, L - 6], 6), F.ld * 0.85));
      [-1, 1].forEach(s => fs(g, P([[s * 16, top], [s * 40, top], [s * 40 + mid * 0.3, L * 0.5], [s * 28 + mid * 0.3, L * 0.5 + 12], [s * 16 + mid * 0.3, L * 0.5]]), c(t.stole), F.ld));
    }
    g.restore();
    strokeP(g, path(false), F.lw);
    g.restore();
  }

  // ---- hair, headwraps, hats, facial hair, jewellery (head space, R = 100)
  const HAIR2 = {};
  function hairCap(g, F, hr, outer, line, part) {
    const p = spl(outer.concat(line), true, 0.9);
    fs(g, p, F.c(hr.c), F.lw);
    g.save(); g.clip(p);
    if (hr.temples) { g.fillStyle = F.c(hr.temples); [-1, 1].forEach(s => g.fill(P([[s * 120, -60], [s * 84, -50], [s * 80, 10], [s * 120, 10]]))); }
    if (hr.hi) { g.strokeStyle = F.c(hr.hi); g.lineWidth = F.ld * 0.9; [[[-50, -88], [-22, -98], [6, -98]], [[34, -90], [58, -80]]].forEach(q => g.stroke(spl(q, false))); }
    g.restore(); strokeP(g, p, F.lw);
    if (part) polyline(g, quadPts([-34, -62], [-40, -84], [-46, -104], 5), F.ld);
    return p;
  }
  HAIR2.short = function (g, hr, F, back) {   // close-cropped (low: a lower cut; top 'high': a high-top)
    if (back) return;
    const outer = hr.top === 'high'
      ? [[-100, 4, 1], [-104, -40], [-102, -92], [-92, -128], [-56, -140], [0, -143], [56, -140], [92, -128], [102, -92], [104, -40], [100, 4, 1]]
      : [[-100, 4, 1], [-104, -40], [-92, -82], [-56, -106], [0, -114], [56, -106], [92, -82], [104, -40], [100, 4, 1]];
    const line = hr.low ? [[94, 2, 1], [92, -36], [82, -64], [50, -76], [0, -80], [-50, -76], [-82, -64], [-92, -36], [-94, 2, 1]]
      : [[93, 2, 1], [91, -30], [82, -54], [52, -62], [0, -66], [-52, -62], [-82, -54], [-91, -30], [-93, 2, 1]];
    hairCap(g, F, hr, outer, line, hr.part);
    if (hr.top === 'high') { g.save(); g.strokeStyle = F.c(hr.hi || hr.c); g.lineWidth = F.ld * 0.85; [[-62, -122], [-22, -130], [20, -130], [60, -122]].forEach(([x, y]) => { const q = new Path2D(); q.arc(x, y + 8, 9, PI * 1.1, PI * 1.9); g.stroke(q); }); g.restore(); }
  };
  HAIR2.side = function (g, hr, F, back) {   // bald on top, short at the sides
    if (back) return;
    [-1, 1].forEach(s => { const p = spl([[s * 100, 8, 1], [s * 105, -26], [s * 100, -54], [s * 90, -68], [s * 86, -50], [s * 90, -26], [s * 92, 8, 1]], true, 0.9); fs(g, p, F.c(hr.c), F.lw); });
  };
  function puff(g, F, cx, cy, r, col, hi, seed) {   // a scalloped round puff of hair
    const q = rng(seed), cs = [[cx, cy, r * 0.82]];
    for (let i = 0; i < 11; i++) { const a = TAU * i / 11; cs.push([cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78, r * (0.3 + q() * 0.06)]); }
    g.strokeStyle = INK; g.lineWidth = F.lw * 2; cs.forEach(k => g.stroke(circ(k[0], k[1], k[2])));
    g.fillStyle = col; cs.forEach(k => g.fill(circ(k[0], k[1], k[2])));
    g.strokeStyle = hi; g.lineWidth = F.ld * 0.9; [0.6, 2.2, 3.9].forEach(a => { const p = new Path2D(); p.arc(cx + Math.cos(a) * r * 0.35, cy + Math.sin(a) * r * 0.35, r * 0.3, a - 0.9, a + 0.6); g.stroke(p); });
  }
  HAIR2.puffs = function (g, hr, F, back) {   // two puffs with bobbles
    if (back) { [-1, 1].forEach(s => puff(g, F, s * 82, -84, 42, F.c(hr.c), F.c(hr.hi || hr.c), 'puff' + s)); return; }
    hairCap(g, F, hr, [[-100, 2, 1], [-104, -40], [-92, -82], [-56, -106], [0, -114], [56, -106], [92, -82], [104, -40], [100, 2, 1]],
      [[93, 0, 1], [90, -32], [80, -56], [50, -64], [0, -66], [-50, -64], [-80, -56], [-90, -32], [-93, 0, 1]]);
    polyline(g, [[0, -66], [0, -112]], F.ld);
    [-1, 1].forEach(s => { fs(g, circ(s * 66, -74, 11), F.c(hr.ties || C.paintYellow), F.lw * 0.8); fs(g, circ(s * 80, -66, 9), F.c(hr.ties || C.paintYellow), F.lw * 0.8); });
  };
  HAIR2.braids = function (g, hr, F, back) {   // box braids: 'down' (falling over the shoulders) or 'bun'
    const col = F.c(hr.c), hi = F.c(hr.hi || hr.c);
    if (back) {
      if (hr.style === 'bun') { const b = circ(0, -120, 38); fs(g, b, col, F.lw); g.save(); g.strokeStyle = hi; g.lineWidth = F.ld * 0.9; [16, 27].forEach(r => { const p = new Path2D(); p.arc(0, -120, r, 0.4, 5.6); g.stroke(p); }); g.restore(); return; }
      const strands = []; [-1, 1].forEach(s => { for (let i = 0; i < 4; i++) strands.push(quadPts([s * (66 + i * 10), -20], [s * (96 + i * 8), 70], [s * (80 + i * 13), 196 - i * 8], 10)); });
      g.strokeStyle = INK; g.lineWidth = 15 + F.lw * 2; strands.forEach(p => g.stroke(P(p, false)));
      g.strokeStyle = col; g.lineWidth = 15; strands.forEach(p => g.stroke(P(p, false)));
      g.strokeStyle = hi; g.lineWidth = F.ld * 0.7; strands.forEach(p => { for (let k = 4; k < p.length - 1; k += 1) { const a = p[k], b = p[k + 1], d = [(b[0] - a[0]), (b[1] - a[1])], l = Math.hypot(d[0], d[1]) || 1; g.stroke(P([[a[0] - d[1] / l * 5, a[1] + d[0] / l * 5 - 4], [a[0] + d[1] / l * 5, a[1] - d[0] / l * 5 + 4]], false)); } });
      return;
    }
    hairCap(g, F, hr, [[-100, 4, 1], [-104, -40], [-92, -84], [-56, -108], [0, -116], [56, -108], [92, -84], [104, -40], [100, 4, 1]],
      [[93, 2, 1], [90, -30], [80, -54], [50, -62], [10, -66], [-50, -62], [-80, -54], [-90, -30], [-93, 2, 1]]);
    g.save(); g.strokeStyle = hi; g.lineWidth = F.ld * 0.85; [[-70, -56], [-36, -63], [0, -66], [36, -63], [70, -56]].forEach(([x, y]) => g.stroke(spl([[x, y], [x * 0.7, (y - 108) / 2], [x * 0.25, -110]], false))); g.restore();
  };
  HAIR2.headwrap = function (g, hr, F, back) {   // Mum's everyday headwrap: a dome over the head, a knot at the front
    if (back) return;
    const p = spl([[-103, -16, 1], [-113, -72], [-98, -130], [-58, -166], [0, -178], [58, -166], [98, -130], [113, -72], [103, -16, 1], [64, -52], [0, -61], [-64, -52]], true, 0.9);
    fs(g, p, F.c(hr.c), 0);
    g.save(); g.clip(p);
    g.fillStyle = F.c(hr.sh); g.fill(spl([[60, -170], [118, -110], [118, 0], [90, -20], [88, -90]], true));
    if (hr.motif) motif(g, F.c(hr.motif), -120, -180, 240, 170, 'dot', 34);
    g.restore(); strokeP(g, p, F.lw);
    [[[-100, -40], [-46, -112], [34, -152]], [[-84, -30], [-6, -90], [88, -120]], [[-34, -56], [40, -82], [104, -76]]].forEach(q => strokeP(g, spl(q, false), F.ld));
    const kn = [ell(14, -160, 27, 15, -0.55), ell(58, -160, 25, 14, 0.5)];
    kn.forEach(k => { fs(g, k, F.c(hr.c), F.lw * 0.9); g.save(); g.clip(k); if (hr.motif) motif(g, F.c(hr.motif), -20, -190, 120, 60, 'dot', 26); g.restore(); strokeP(g, k, F.lw * 0.9); });
    fs(g, ell(36, -150, 13, 11), F.c(hr.sh), F.lw * 0.9);
  };
  HAIR2.gele = function (g, hr, F, back) {   // the auntie's big occasion headwrap: a pleated fan above a wrapped band
    if (back) {
      const cx = 14, cy = -92, rx = 186, ry = 176, n = 10, a0 = -PI * 0.93, a1 = -PI * 0.07;
      const pt = (a, k) => [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
      const outline = new Path2D(); outline.moveTo(cx, cy);
      for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); if (!i) outline.lineTo(...pt(a, 1)); else { const am = lerp(a0, a1, (i - 0.5) / n); const cp = pt(am, 1.07); outline.quadraticCurveTo(cp[0], cp[1], ...pt(a, 1)); } }
      outline.closePath();
      g.lineWidth = F.lw * 2; g.strokeStyle = INK; g.stroke(outline);
      for (let i = 0; i < n; i++) {
        const aa = lerp(a0, a1, i / n), ab = lerp(a0, a1, (i + 1) / n), am = (aa + ab) / 2, w = new Path2D();
        w.moveTo(cx, cy); w.lineTo(...pt(aa, 1)); const cp = pt(am, 1.07); w.quadraticCurveTo(cp[0], cp[1], ...pt(ab, 1)); w.closePath();
        g.fillStyle = F.c(i % 2 ? hr.c : (hr.hi || hr.c)); g.fill(w);
        g.save(); g.clip(w); g.fillStyle = F.c(hr.sh); g.fill(P([[cx, cy], pt(aa + (ab - aa) * 0.62, 1.2), pt(ab, 1.2)])); g.restore();
        if (i) polyline(g, [lerp2([cx, cy], pt(aa, 1), 0.3), pt(aa, 0.995)], F.ld);
      }
      if (hr.motif) { g.save(); g.clip(outline); g.fillStyle = F.c(hr.motif); for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, (i + 0.5) / n); g.fill(circ(...pt(a, 0.86), 4.5)); } g.restore(); }
      return;
    }
    const p = spl([[-104, -16, 1], [-114, -68], [-100, -114], [-54, -138], [0, -144], [56, -138], [100, -114], [114, -68], [104, -16, 1], [64, -52], [0, -61], [-64, -52]], true, 0.9);
    fs(g, p, F.c(hr.c), 0);
    g.save(); g.clip(p); g.fillStyle = F.c(hr.sh); g.fill(spl([[64, -140], [120, -90], [118, 0], [92, -24], [90, -90]], true));
    if (hr.motif) motif(g, F.c(hr.motif), -120, -150, 240, 140, 'dot', 30);
    g.restore(); strokeP(g, p, F.lw);
    [[[-102, -40], [-30, -96], [60, -128]], [[-70, -40], [10, -80], [104, -96]]].forEach(q => strokeP(g, spl(q, false), F.ld));
    fs(g, spl([[-8, -136], [22, -152], [52, -138], [40, -112], [8, -112]], true), F.c(hr.hi || hr.c), F.lw * 0.85);
  };
  HAIR2.curl = function (g, hr, F, back) {   // a baby's single curl
    if (back) return;
    const p = new Path2D(); p.moveTo(-4, -97); p.bezierCurveTo(-24, -132, 28, -146, 22, -116); p.bezierCurveTo(18, -100, -2, -106, 6, -120);
    strokeP(g, p, F.lw * 1.9, INK); strokeP(g, p, F.lw * 0.9, F.c(hr.c));
  };
  function hat(g, ch, F) {
    const h = ch.hat, c = F.c, lw = F.lw, ld = F.ld;
    if (h.k === 'fila') {   // the soft cap, its crown folded over to one side
      const p = spl([[-100, -38, 1], [-101, -86], [-90, -128], [-50, -152], [10, -158], [72, -150], [118, -132], [128, -108, 1], [104, -98], [101, -70], [100, -38, 1], [50, -56], [0, -60], [-50, -56]], true, 0.9);
      fs(g, p, c(h.c), 0);
      g.save(); g.clip(p); g.fillStyle = c(h.sh); g.fill(spl([[30, -160], [130, -140], [130, -96], [96, -90], [70, -130]], true));
      if (h.band) { g.fillStyle = c(h.band); g.fill(spl([[-104, -34, 1], [-104, -50], [0, -72], [104, -50], [104, -34, 1], [0, -56]], true)); polyline(g, quadPts([-104, -50], [0, -94], [104, -50], 10), ld); }
      g.restore(); strokeP(g, p, lw);
      strokeP(g, spl([[18, -156], [70, -128], [104, -98]], false), ld);
    } else if (h.k === 'mortar') {   // the graduation cap: skull cap, flat board, tassel
      fs(g, spl([[-99, -28, 1], [-99, -70], [-72, -100], [0, -110], [72, -100], [99, -70], [99, -28, 1], [0, -48]], true, 0.9), c(h.c), lw);
      fs(g, P([[-150, -104], [0, -68], [150, -104], [150, -95], [0, -58], [-150, -95]]), c(h.sh), lw);
      fs(g, P([[-150, -104], [0, -140], [150, -104], [0, -68]]), c(h.c), lw);
      fs(g, circ(0, -104, 7), c(h.c), ld);
      tube(g, [[0, -104], [96, -92], [112, -84]], 4.5, c(h.tassel || C.gold), ld * 0.6); tube(g, [[112, -84], [114, -30]], 4.5, c(h.tassel || C.gold), ld * 0.6);
      fs(g, P([[109, -34], [119, -34], [124, -2], [104, -2]]), c(h.tassel || C.gold), ld * 0.8);
    }
  }
  function beardJaw(g, ch, F, G) {   // a short full beard below the mouth, round the jaw
    const mx = G.mouthX, p = spl([[97, 10, 1], [98, 40], [84, 78], [48, 104], [mx, 114], [-48, 104], [-84, 78], [-98, 40], [-97, 10, 1], [-88, 12, 1], [-82, 44], [-56, 74], [mx, 84], [56, 74], [82, 44], [88, 12, 1]], true, 0.9);
    fs(g, p, F.c(ch.beard), F.lw);
  }
  function moustache(g, col, F, G, small) {
    const mx = G.mouthX, y = G.eyeY + 0.37 * 100 - (small ? 2 : 0), w = (small ? 22 : 27) * G.mouthK, p = new Path2D();
    p.moveTo(mx - 3, y - 6); p.quadraticCurveTo(mx - w * 0.7, y - 9, mx - w, y + 7); p.quadraticCurveTo(mx - w * 0.5, y + 4, mx, y + 2); p.quadraticCurveTo(mx + w * 0.5, y + 4, mx + w, y + 7); p.quadraticCurveTo(mx + w * 0.7, y - 9, mx + 3, y - 6); p.closePath();
    fs(g, p, F.c(col), F.lw * 0.75);
  }
  function earrings(g, col, F) { [-1, 1].forEach(s => { fs(g, circ(s * 99, 30, 6.5), F.c(col), F.lw * 0.6); fs(g, circ(s * 100, 45, 5.5), F.c(col), F.lw * 0.6); }); }

  // ---- expressions added
  Object.assign(EXPR, {
    happy_cry: { brows: { lift: 0.07, tilt: 0.13, arch: 0.18 }, eyes: { k: 'happy' }, mouth: { k: 'grin', w: 0.28 }, tears: 2 },   // tears of joy
    sneeze_pre: { brows: { lift: 0.13, tilt: 0.1, arch: 0.3 }, eyes: { lid: 0.6, lidTilt: -0.1, pupil: 0.9 }, look: [0, -0.85], mouth: { k: 'o', w: 0.1, h: 0.13 } },   // 'ah...'
    sneeze: { brows: { lift: -0.03, tilt: 0.16, arch: 0.05, thick: 1.2 }, eyes: { k: 'squeeze' }, mouth: { k: 'o', w: 0.17, h: 0.15 }, crease: 1 },   // '...choo'
    faint: { brows: { lift: 0.07, tilt: 0.14, arch: 0.1 }, eyes: { k: 'closed', lashes: 1 }, mouth: { k: 'o', w: 0.07, h: 0.08 } },
    serene: { brows: { lift: 0.08, tilt: 0.06, arch: 0.3 }, eyes: { k: 'closed' }, mouth: { k: 'smile', w: 0.25, c: 0.11 } },   // praise, prayer
    stern: { browL: { lift: 0.07, tilt: -0.02, arch: 0.2 }, browR: { lift: -0.05, tilt: -0.09, arch: 0.04, thick: 1.15 }, eyes: { lid: 0.36, lidTilt: -0.12, pupil: 1 }, look: [0.6, 0.05], mouth: { k: 'flat', w: 0.13 } },   // 'the look'
    sweet: { brows: { lift: 0.08, tilt: 0.05, arch: 0.32 }, eyes: { k: 'happy' }, mouth: { k: 'smile', w: 0.22, c: 0.12 }, cheeks: 1 },
    proud: { brows: { lift: 0.06, tilt: 0.09, arch: 0.26 }, eyes: { r: 1, pupil: 1.3, gloss: 1, pool: 1, lower: 0.1 }, mouth: { k: 'smile', w: 0.28, c: 0.12 } },   // moved, eyes wet
  });

  // ---- props added (world space, s = scale, a = rotation; o.tint like the others)
  PROPS.spoon = function (g, x, y, o) {   // the wooden spoon (Mum's gavel), bowl toward -y; x, y = the grip
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.85) / s;
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    const hd = new Path2D(); hd.moveTo(-6.5, 48); hd.quadraticCurveTo(-7, -20, -5, -70); hd.lineTo(5, -70); hd.quadraticCurveTo(7, -20, 6.5, 48); hd.quadraticCurveTo(0, 55, -6.5, 48); hd.closePath();
    fs(g, hd, tc(o, C.wood), lw);
    const bowl = ell(0, -104, 22, 36); fs(g, bowl, tc(o, C.wood), 0); g.save(); g.clip(bowl); g.fillStyle = tc(o, C.woodSh); g.fill(ell(7, -100, 14, 28)); g.restore(); strokeP(g, bowl, lw);
    g.restore();
  };
  PROPS.calculator = function (g, x, y, o) {   // o.text: the display (default '0')
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.85) / s;
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    const b = rrect(-36, -52, 72, 104, 9); fs(g, b, tc(o, C.calc), 0); g.save(); g.clip(b); g.fillStyle = tc(o, C.calcSh); g.fillRect(22, -60, 20, 120); g.restore(); strokeP(g, b, lw);
    const sc = rrect(-27, -43, 54, 22, 4); fs(g, sc, tc(o, C.calcScreen), lw * 0.6);
    g.fillStyle = '#2E3A2C'; g.font = '700 15px "Inter", "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(o.text || '0', 22, -31.5);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) fs(g, rrect(-26 + k * 14, -13 + r * 15, 10, 10, 2.5), tc(o, r === 3 && k === 3 ? '#F0A04B' : C.calcKey), lw * 0.45);
    g.restore();
  };
  PROPS.calculator.unmirror = true;
  PROPS.receipt = function (g, x, y, o) {   // a long till receipt hanging down from x, y (o.len)
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.8) / s, L = o.len || 160, w = 23;
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    const p = new Path2D(); p.moveTo(-w, 0); p.lineTo(w, 0); p.bezierCurveTo(w + 4, L * 0.35, w - 8, L * 0.7, w + 6, L);
    for (let i = 0; i <= 8; i++) p.lineTo(w + 6 - (i / 8) * (2 * w), L + (i % 2 ? 7 : 0));
    p.bezierCurveTo(-w - 8, L * 0.7, -w + 4, L * 0.35, -w, 0); p.closePath();
    fs(g, p, tc(o, '#FFFFFF'), lw);
    g.save(); g.clip(p); for (let i = 0; i < Math.floor(L / 16); i++) { const yy = 14 + i * 16; polyline(g, [[-w + 8, yy], [w - 12 - (i % 3) * 6, yy]], 2.2 / s, '#A4ABB2'); } polyline(g, [[-w + 8, L - 12], [w - 4, L - 12]], 3 / s, '#6D747B'); g.restore();
    g.restore();
  };
  PROPS.bucket = function (g, x, y, o) {   // a plastic bucket of water; x, y = the grip on its handle (o.anchor 'base': the bottom centre)
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.85) / s;
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s); if (o.anchor === 'base') g.translate(0, -122);
    const col = tc(o, o.c || C.bucketBlue), sh = tc(o, o.sh || C.bucketBlueSh);
    const hdl = new Path2D(); hdl.moveTo(-46, 42); hdl.quadraticCurveTo(-44, -10, 0, -6); hdl.quadraticCurveTo(44, -10, 46, 42); strokeP(g, hdl, 5 + 2 * lw); strokeP(g, hdl, 5, tc(o, '#9AA3AB'));
    const b = new Path2D(); b.moveTo(-50, 42); b.lineTo(50, 42); b.lineTo(38, 122); b.quadraticCurveTo(0, 130, -38, 122); b.closePath();
    fs(g, b, col, 0); g.save(); g.clip(b); g.fillStyle = sh; g.fill(P([[24, 30], [60, 30], [50, 140], [16, 140]])); [62, 98].forEach(yy => polyline(g, [[-60, yy], [60, yy]], LW.detail * 0.7 / s)); g.restore(); strokeP(g, b, lw);
    const rim = ell(0, 42, 51, 11); fs(g, rim, col, lw);
    if (o.water !== false) { const wtr = ell(0, 43, 43, 7.5); fs(g, wtr, tc(o, C.water), lw * 0.5); g.fillStyle = tc(o, C.waterHi); g.fill(ell(-14, 41.5, 12, 2.6)); }
    g.restore();
  };
  PROPS.glass = function (g, x, y, o) {   // a glass of water; x, y = its centre
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.85) / s;
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    const b = new Path2D(); b.moveTo(-23, -34); b.lineTo(23, -34); b.lineTo(18, 32); b.quadraticCurveTo(0, 36, -18, 32); b.closePath();
    fs(g, b, tc(o, C.glass), 0);
    g.save(); g.clip(b); g.fillStyle = tc(o, C.water); g.fillRect(-30, -12, 60, 50); g.fillStyle = tc(o, C.waterHi); g.fill(ell(0, -12, 22, 4)); g.fillStyle = 'rgba(255,255,255,0.75)'; g.fill(P([[-15, -30], [-9, -30], [-11, 26], [-15, 26]])); g.restore();
    strokeP(g, b, lw); strokeP(g, ell(0, -34, 23, 4.5), lw * 0.7);
    g.restore();
  };
  PROPS.reportCard = function (g, x, y, o) {   // o.grade (default 'A'), o.back: the plain back
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.85) / s;
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    const b = rrect(-56, -72, 112, 144, 5); fs(g, b, tc(o, C.reportPaper), lw);
    if (!o.back) {
      g.save(); g.clip(b); g.fillStyle = tc(o, C.reportBand); g.fillRect(-60, -76, 120, 30); g.restore(); strokeP(g, b, lw); polyline(g, [[-56, -46], [56, -46]], LW.detail * 0.8 / s);
      fs(g, circ(-36, -60, 8), tc(o, '#FFFFFF'), LW.detail * 0.7 / s); polyline(g, [[-20, -62], [30, -62]], 3 / s, '#FFFFFF');
      for (let i = 0; i < 5; i++) { const yy = -30 + i * 15; polyline(g, [[-44, yy], [6 - (i % 2) * 10, yy]], 2.4 / s, '#A4ABB2'); polyline(g, [[18, yy], [30, yy]], 2.4 / s, '#A4ABB2'); }
      g.fillStyle = tc(o, C.gradeRed); g.font = '800 40px "Inter", "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.grade || 'A', 30, 50);
      strokeP(g, ell(30, 50, 22, 20, -0.2), 3 / s, tc(o, C.gradeRed));
    }
    g.restore();
  };
  PROPS.reportCard.unmirror = true;
  PROPS.paintbrush = function (g, x, y, o) {   // bristles toward -y; x, y = the grip; o.paint
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.85) / s;
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    const hd = new Path2D(); hd.moveTo(-5, 62); hd.quadraticCurveTo(-7, 10, -6, -22); hd.lineTo(6, -22); hd.quadraticCurveTo(7, 10, 5, 62); hd.quadraticCurveTo(0, 68, -5, 62); hd.closePath(); fs(g, hd, tc(o, '#C9503F'), lw);
    fs(g, P([[-7, -22], [7, -22], [8, -40], [-8, -40]]), tc(o, '#B9BEC4'), lw);
    const br = new Path2D(); br.moveTo(-8, -40); br.lineTo(8, -40); br.quadraticCurveTo(10, -60, 0, -76); br.quadraticCurveTo(-10, -60, -8, -40); br.closePath(); fs(g, br, tc(o, '#8A6A4A'), 0);
    g.save(); g.clip(br); g.fillStyle = tc(o, o.paint || C.paintBlue); g.fillRect(-12, -80, 24, 22); g.restore(); strokeP(g, br, lw);
    g.restore();
  };
  PROPS.palette = function (g, x, y, o) {   // a painter's palette with dabs of colour; x, y = its centre
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.85) / s;
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    const p = spl([[-60, -10], [-40, -40], [10, -46], [56, -26], [62, 12], [36, 40], [-6, 42], [-14, 20], [-36, 24], [-58, 14]], true);
    fs(g, p, tc(o, C.wood), 0); g.save(); g.clip(p); g.fillStyle = tc(o, C.woodSh); g.fill(ell(26, 34, 50, 20)); g.restore(); strokeP(g, p, lw);
    fs(g, ell(-34, 8, 9, 7), tc(o, C.woodSh), lw * 0.8);
    [[-30, -22, C.paintRed], [0, -30, C.paintYellow], [30, -18, C.paintBlue], [38, 10, C.paintGreen]].forEach(([dx, dy, col]) => fs(g, spl([[dx - 10, dy], [dx, dy - 8], [dx + 10, dy - 1], [dx + 4, dy + 8], [dx - 7, dy + 6]], true), tc(o, col), lw * 0.6));
    g.restore();
  };
  PROPS.schoolbag = function (g, x, y, o) {   // a backpack seen from the back; x, y = its centre
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.85) / s, col = tc(o, o.c || C.bag), sh = tc(o, o.sh || C.bagSh);
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    const hdl = new Path2D(); hdl.moveTo(-18, -96); hdl.quadraticCurveTo(0, -126, 18, -96); strokeP(g, hdl, 7 + 2 * lw); strokeP(g, hdl, 7, sh);
    const b = rrect(-76, -100, 152, 196, 34); fs(g, b, col, 0); g.save(); g.clip(b); g.fillStyle = sh; g.fillRect(48, -110, 40, 220); g.restore(); strokeP(g, b, lw);
    const pk = rrect(-52, 6, 104, 74, 16); fs(g, pk, col, lw * 0.9); polyline(g, quadPts([-44, 22], [0, 14], [44, 22], 6), LW.detail / s); fs(g, rrect(30, 16, 8, 16, 3), tc(o, C.paintYellow), LW.detail * 0.7 / s);
    polyline(g, quadPts([-64, -66], [0, -84], [64, -66], 8), LW.detail / s);
    g.restore();
  };
  PROPS.house = function (g, x, y, o) {   // a small house; x, y = the bottom centre of its walls
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.9) / s;
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    fs(g, P([[68, -260], [96, -260], [96, -196], [68, -176]]), tc(o, C.houseRoofSh), lw);   // chimney
    const wall = P([[-118, 0], [-118, -150], [118, -150], [118, 0]]); fs(g, wall, tc(o, C.houseWall), 0);
    g.save(); g.clip(wall); g.fillStyle = tc(o, C.houseWallSh); g.fillRect(80, -160, 50, 170); g.restore(); strokeP(g, wall, lw);
    const roof = P([[-144, -140], [0, -258], [144, -140]]); fs(g, roof, tc(o, C.houseRoof), 0); g.save(); g.clip(roof); g.fillStyle = tc(o, C.houseRoofSh); g.fill(P([[0, -258], [150, -136], [70, -136]])); g.restore(); strokeP(g, roof, lw);
    fs(g, rrect(-26, -86, 52, 86, 4), tc(o, C.houseDoor), lw); fs(g, circ(14, -42, 4), tc(o, '#E6B54A'), lw * 0.5);
    [-1, 1].forEach(sd => { const wx = sd * 72; fs(g, rrect(wx - 22, -116, 44, 40, 3), tc(o, C.phoneScreen), lw * 0.85); polyline(g, [[wx, -116], [wx, -76]], LW.detail / s); polyline(g, [[wx - 22, -96], [wx + 22, -96]], LW.detail / s); });
    fs(g, circ(0, -186, 15), tc(o, C.phoneScreen), lw * 0.8);
    g.restore();
  };
  PROPS.sneezeBurst = function (g, x, y, o) {   // the spray of a sneeze from the mouth at x, y toward o.dir (1 = +x)
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.8) / s, d = o.dir || 1;
    g.save(); g.translate(x, y); g.scale(s * d, s);
    [[-0.5, 46, 84], [-0.18, 52, 100], [0.14, 50, 96], [0.45, 44, 80]].forEach(([a, r0, r1]) => polyline(g, [[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * r1, Math.sin(a) * r1]], lw * 0.8));
    [[70, -22, 6], [92, 10, 7.5], [64, 28, 5.5], [108, -12, 5], [84, 42, 5], [116, 24, 4.5]].forEach(([dx, dy, r]) => drop(g, dx, dy, r, C.sweat, lw * 0.5, -1.2 - dy * 0.01));
    const puffs = [[24, -4, 13], [40, -16, 12], [44, 8, 11], [58, -4, 9]]; g.strokeStyle = INK; g.lineWidth = lw * 1.6; puffs.forEach(q => g.stroke(circ(q[0], q[1], q[2]))); g.fillStyle = '#FFFFFF'; puffs.forEach(q => g.fill(circ(q[0], q[1], q[2])));
    g.restore();
  };
  PROPS.book = function (g, x, y, o) {   // a book: o.open (covers seen from the front, held open) or closed; o.c cover colour
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.85) / s, col = tc(o, o.c || C.bookBlue);
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    if (o.open !== false) { [-1, 1].forEach(sd => fs(g, P([[0, -54], [sd * 78, -60], [sd * 82, 50], [0, 56]]), col, lw)); fs(g, P([[-6, -56], [6, -56], [6, 56], [-6, 56]]), tc(o, mix(o.c || C.bookBlue, '#000000', 0.18)), lw * 0.8); polyline(g, [[-62, -64], [62, -64]], LW.detail * 0.8 / s, '#FFFFFF'); }
    else { fs(g, rrect(-44, -58, 88, 116, 4), col, lw); fs(g, rrect(-44, -58, 14, 116, 3), tc(o, mix(o.c || C.bookBlue, '#000000', 0.18)), lw * 0.8); fs(g, rrect(-18, -36, 48, 16, 2), tc(o, '#FFFFFF'), LW.detail * 0.6 / s); }
    g.restore();
  };
  PROPS.books = function (g, x, y, o) {   // a stack of three books seen from the side; x, y = the stack's centre
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.85) / s;
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    [[C.bookGreen, -34, 0.04, 92], [C.bookRed, -6, -0.03, 100], [C.bookYellow, 22, 0.02, 88]].forEach(([col, yy, a, w]) => { g.save(); g.translate(0, yy); g.rotate(a); fs(g, rrect(-w / 2, -13, w, 26, 4), tc(o, col), lw); fs(g, P([[-w / 2 + 8, -8], [w / 2 - 4, -8], [w / 2 - 4, 8], [-w / 2 + 8, 8]]), tc(o, '#FFFDF6'), LW.detail * 0.6 / s); g.restore(); });
    g.restore();
  };
  PROPS.holdall = function (g, x, y, o) {   // a big travel bag (the hospital bag); x, y = its centre
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.85) / s, col = tc(o, o.c || C.holdall), sh = tc(o, o.sh || C.holdallSh);
    g.save(); g.translate(x, y); g.rotate(o.a || 0); g.scale(s, s);
    const b = rrect(-110, -62, 220, 124, 54); fs(g, b, col, 0); g.save(); g.clip(b); g.fillStyle = sh; g.fillRect(-120, 26, 240, 50); g.restore(); strokeP(g, b, lw);
    polyline(g, quadPts([-80, -50], [0, -64], [80, -50], 8), LW.detail / s); fs(g, rrect(54, -60, 10, 18, 3), tc(o, '#C9CED3'), LW.detail * 0.6 / s);
    [-1, 1].forEach(sd => fs(g, rrect(sd * 98 - 10, -24, 20, 48, 6), sh, lw * 0.8));
    g.restore();
  };
  PROPS.coins = function (g, x, y, o) {   // a few coins on an open palm's height; x, y = the centre
    o = o || {}; const s = o.s || 1, lw = (o.lw || LW.figure * 0.7) / s;
    g.save(); g.translate(x, y); g.scale(s, s);
    [[-16, 4], [10, 6], [-2, -6], [20, -6]].forEach(([dx, dy]) => { fs(g, ell(dx, dy, 13, 6), tc(o, '#C9CED3'), lw); fs(g, ell(dx, dy - 3, 13, 6), tc(o, '#E3E6E9'), lw); });
    g.restore();
  };

  // ---- hand shapes added: 'pray' (both palms pressed together, drawn at the wrist of the arm that carries it)
  function drawPrayHands(F, Wr, s) {
    const g = F.g, lw = F.lw * 0.9 * (F.hlk || 1), k = (s || 1) * HAND_K * 1.1;
    g.save(); g.translate(Wr[0], Wr[1] + 4 * k); g.scale(k, k);
    const p = new Path2D(); p.moveTo(-17, 6); p.quadraticCurveTo(-20, -30, -4, -64); p.quadraticCurveTo(0, -70, 4, -64); p.quadraticCurveTo(20, -30, 17, 6); p.quadraticCurveTo(0, 14, -17, 6); p.closePath();
    fs(g, p, F.skinC, lw * 1.0 / k * 1.1);
    g.lineWidth = F.ld * 0.8 / k; g.strokeStyle = INK; g.stroke(P([[0, -62], [0, 4]], false));
    [-1, 1].forEach(sd => g.stroke(P([[sd * 6, -8], [sd * 13, -22]], false)));
    g.restore();
  }

  // ---- poses and holdings added (adult body space; children get them through ageRemap)
  const HOLD2 = {
    // the baby in the arms: head toward the facing side, in the crook of the near arm; o.baby = who (default the hero), babyExpr/Blink/Look/Mouth
    baby: (p, o) => ({ head: Object.assign({}, p.head, { nod: 0.35, tilt: 0.05 }),
      armR: { ik: [-46, -112], bend: -1, ul: 1, fl: 1, hand: 'flat', flip: -1, hrot: 0.2 },
      armL: { ik: [52, -128], bend: 1, ul: 1, fl: 1, hand: 'flat', flip: 1, hrot: -0.2 },
      prop: { k: 'baby', at: [10, -168], a: PI / 2 - 0.26, headRot: -(PI / 2 - 0.26) * 0.85, s: 1.2, over: true, who: o.baby || 'hero', expr: o.babyExpr, blink: o.babyBlink, look: o.babyLook, mouth: o.babyMouth, fists: o.babyFists } }),
    baby_hero: (p, o) => HOLD2.baby(p, Object.assign({}, o, { baby: 'hero' })),
    baby_sister: (p, o) => HOLD2.baby(p, Object.assign({}, o, { baby: 'fb_sister' })),
    baby_brother: (p, o) => HOLD2.baby(p, Object.assign({}, o, { baby: 'fb_brother' })),
    // the school bag worn on the back; standing, the thumbs hook the straps
    schoolbag: p => Object.assign({ bag: 'school' }, p.stance === 'side' || p.sit ? {} : { armL: { ik: [-64, -186], bend: 1, fl: 0.75, hand: 'fist', flip: 1, hrot: 0.6 }, armR: { ik: [64, -186], bend: -1, fl: 0.75, hand: 'fist', flip: -1, hrot: -0.6 } }),
    holdall: p => ({ bag: 'holdall', armR: { ik: [52, -196], bend: -1, fl: 0.62, hand: 'fist', flip: -1, hrot: 0.5 } }),
    // the wooden spoon raised in front like a sceptre (pose 'gavel' brings it down)
    spoon: p => ({ armR: { ik: [104, -230], bend: 1, ul: 0.92, fl: 0.9, hand: 'fist', flip: 1, hrot: 0 }, prop: { k: 'spoon', hand: 'R', along: 18, align: true, a: 0, s: 1 } }),
    calculator: p => ({ head: Object.assign({}, p.head, { nod: 0.5 }),
      armR: { ik: [42, -136], bend: -1, fl: 0.62, hand: 'hold', flip: -1, hrot: 0.35 }, prop: { k: 'calculator', hand: 'R', along: 48, a: -0.12, s: 0.95, text: '0.00' },
      armL: { ik: [-84, -92], bend: 1, fl: 0.82, hand: 'hold', flip: 1, hrot: -0.2 }, prop2: { k: 'receipt', hand: 'L', along: 16, off: [0, 2], len: 176, s: 1, a: 0.06 } }),
    bucket: p => ({ lean: (p.lean || 0) - 0.04, armR: { a: 0.22, e: -0.03, hand: 'fist', flip: -1, hrot: 0 }, prop: { k: 'bucket', hand: 'R', along: 20, s: 1 } }),
    // balanced on the head, hands on the hips (this rig's arms are too short to reach above the head)
    bucket_head: p => ({ head: Object.assign({}, p.head, { nod: -0.05 }), armL: { ik: [-80, -30], bend: 1, fl: 0.82, hand: 'fist', flip: 1, hrot: -0.9 }, armR: { ik: [80, -30], bend: -1, fl: 0.82, hand: 'fist', flip: -1, hrot: 0.9 },
      prop: { k: 'bucket', at: [0, -470], anchor: 'base', s: 1.05 } }),
    report: p => ({ head: Object.assign({}, p.head, { nod: 0.25 }), armL: { ik: [-70, -150], bend: 1, fl: 0.62, hand: 'hold', flip: -1, hrot: -1.1 }, armR: { ik: [70, -150], bend: -1, fl: 0.62, hand: 'hold', flip: 1, hrot: 1.1 },
      prop: { k: 'reportCard', at: [0, -178], s: 1.28 } }),
    report_out: p => ({ armR: { ik: [176, -176], bend: 1, ul: 0.95, hand: 'hold', flip: 1, hrot: -0.35 }, prop: { k: 'reportCard', hand: 'R', along: 34, off: [18, -34], a: 0.1, s: 0.85 } }),
    paintbrush: p => ({ armR: { ik: [176, -262], bend: 1, ul: 1, hand: 'fist', flip: 1, hrot: 0 }, prop: { k: 'paintbrush', hand: 'R', along: 16, align: true, a: 0.35, s: 1.15 },
      armL: { ik: [-64, -112], bend: 1, fl: 0.64, hand: 'hold', flip: -1, hrot: -1.1 }, prop2: { k: 'palette', at: [-34, -126], a: 0.2, s: 0.9, under: 'L' } }),
    cup: p => ({ armR: { ik: [44, -138], bend: -1, fl: 0.62, hand: 'hold', flip: -1, hrot: 0.35 }, prop: { k: 'glass', hand: 'R', along: 30, off: [2, -10], s: 0.95 } }),
    cup_out: p => ({ armR: { ik: [178, -176], bend: 1, ul: 0.95, hand: 'hold', flip: 1, hrot: -0.4 }, prop: { k: 'glass', hand: 'R', along: 28, off: [6, -12], s: 0.95 } }),
    book: p => ({ head: Object.assign({}, p.head, { nod: 0.55 }), armL: { ik: [-64, -150], bend: 1, fl: 0.6, hand: 'hold', flip: -1, hrot: -1.2 }, armR: { ik: [64, -150], bend: -1, fl: 0.6, hand: 'hold', flip: 1, hrot: 1.2 },
      prop: { k: 'book', at: [0, -168], s: 1, c: C.bookBlue } }),
    books: p => ({ armL: { ik: [-46, -128], bend: 1, fl: 0.7, hand: 'flat', flip: -1, hrot: -0.4 }, armR: { ik: [50, -150], bend: -1, fl: 0.7, hand: 'flat', flip: 1, hrot: 0.4 }, prop: { k: 'books', at: [0, -150], a: -0.06, s: 1.1, under: 'LR' } }),
    coins: p => ({ armR: { ik: [150, -140], bend: 1, fl: 0.9, hand: 'flat', flip: 1, hrot: -1.45 }, prop: { k: 'coins', hand: 'R', along: 22, off: [0, -18], s: 0.9, over: true } }),
    akimbo: p => ({ armL: { ik: [-80, -30], bend: 1, fl: 0.82, hand: 'fist', flip: 1, hrot: -0.9 }, armR: { ik: [80, -30], bend: -1, fl: 0.82, hand: 'fist', flip: -1, hrot: 0.9 } }),
    pray: p => ({ armL: { ik: [-3, -172], bend: 1, fl: 0.95, hand: 'pray' }, armR: { ik: [3, -172], bend: -1, fl: 0.95, hand: 'none' } }),
    wipe_eye: p => ({ armR: { ik: [52, -320], bend: 1, ul: 0.95, hand: 'fist', flip: 1, hrot: 0.25 }, head: Object.assign({}, p.head, { tilt: 0.05 }) }),
  };
  Object.assign(HOLD, HOLD2);
  Object.assign(POSES, {
    cradle: o => Object.assign(POSES.stand(o), HOLD2.baby({ stance: 'front' }, o)),
    // Mum's gavel: phase 0 the spoon raised, 1 struck down
    gavel: o => {
      const k = clamp(o.phase == null ? 0 : o.phase, 0, 1), e = k * k * (3 - 2 * k);
      return Object.assign({ stance: 'front', expr: 'stern', head: { tilt: 0.03 * e, nod: 0.1 + 0.25 * e }, armL: STAND_ARML,
        armR: { a: lerp(2.75, 0.55, e), e: lerp(0.35, -2.12, e), hand: 'fist', flip: 1, hrot: 0 }, prop: { k: 'spoon', hand: 'R', along: 14, align: true, a: -lerp(0, PI / 2, e), s: 1.05 } }, STAND_LEGS);
    },
    praise: o => Object.assign({ stance: 'front', expr: 'serene', head: { nod: -0.32 }, armL: { a: -2.6, e: -0.12, hand: 'open', flip: -1, hrot: 0.1 }, armR: { a: 2.6, e: 0.12, hand: 'open', flip: 1, hrot: -0.1 } }, STAND_LEGS),
    pray: o => Object.assign({ stance: 'front', expr: 'serene', head: { nod: 0.15 } }, STAND_LEGS, HOLD2.pray({})),
    akimbo: o => Object.assign({ stance: 'front', expr: 'stern' }, STAND_LEGS, HOLD2.akimbo({})),   // hands on hips
    wipe_eye: o => Object.assign({ stance: 'front', expr: 'happy_cry', armL: STAND_ARML }, STAND_LEGS, HOLD2.wipe_eye({ head: {} })),
    // a sneeze: phase 0..0.5 'ah' (head back, eyes half shut), 0.5..1 'choo' (head forward, eyes squeezed, the spray)
    sneeze: o => {
      const k = clamp(o.phase == null ? 1 : o.phase, 0, 1), choo = k >= 0.5;
      return Object.assign({ stance: 'front', expr: choo ? 'sneeze' : 'sneeze_pre', shoulders: choo ? 4 : 12, lean: choo ? 0.06 : -0.03,
        head: choo ? { tilt: 0.12, nod: 0.2, turn: 0.4 } : { tilt: -0.08, nod: -0.4 },
        armL: choo ? { ik: [-46, -146], bend: 1, fl: 0.7, hand: 'fist', flip: 1, hrot: 0.3 } : { a: -0.16, e: 0.5, hand: 'relax', hs: 1.1 },
        armR: choo ? { ik: [60, -140], bend: -1, fl: 0.7, hand: 'fist', flip: -1, hrot: -0.3 } : { a: 0.16, e: -0.5, hand: 'relax', hs: 1.1 },
        prop: choo ? { k: 'sneezeBurst', at: [96, -314], s: 1 } : null }, STAND_LEGS);
    },
    clap: o => {
      const k = 0.5 - 0.5 * cosA(TAU * (o.phase || 0)), gap = 4 + 54 * (1 - k);
      return Object.assign({ stance: 'front', expr: 'happy', armL: { ik: [-gap, -170], bend: 1, fl: 0.9, hand: 'stop' }, armR: { ik: [gap, -170], bend: -1, fl: 0.9, hand: 'stop' } }, STAND_LEGS);
    },
    // swoon: phase 0 upright and startled .. 1 fainting back, the back of the hand to the forehead (POV.swoonPair adds the catch)
    swoon: o => {
      const k = clamp(o.phase == null ? 1 : o.phase, 0, 1), e = k * k * (3 - 2 * k);
      return { stance: 'front', ground: true, expr: e > 0.35 ? 'faint' : 'surprised', lean: -0.1 * e, shoulders: 6 * e, head: { tilt: -0.28 * e, nod: -0.15 * e },
        armR: { ik: lerp2([96, 26], [44, -404], e), bend: 1, ul: 1, hand: 'flat', flip: 1, hrot: lerp(0, -0.6, e) },
        armL: { a: lerp(-0.1, -0.62, e), e: lerp(0.03, 0.35, e), hand: 'relax', flip: 1 },
        legL: { a: lerp(-0.02, 0.08, e), k: lerp(0, 0.2, e) }, legR: { a: lerp(0.02, 0.2, e), k: lerp(0, 0.32, e) } };
    },
    catch: o => Object.assign({ stance: 'front', expr: 'scared', lean: 0.1, armL: { ik: [130, -220], bend: 1, hand: 'flat', flip: -1 }, armR: { ik: [160, -250], bend: -1, hand: 'flat', flip: -1 } }, { legL: { a: -0.12, k: 0.08 }, legR: { a: 0.08, k: 0.1 } }),
    // carrying the whole house on his back, bent over; phase given = trudging (a slow walk)
    house: o => housePose(o, 1),
    house_small: o => housePose(o, 0.55),
  });
  function housePose(o, hs) {
    const walking = o.phase != null, big = hs >= 1, lean = big ? 0.78 : 0.42;
    const base = walking ? POSES.walk(Object.assign({}, o, { stride: 0.24 })) : { legL: { a: big ? 0.42 : 0.2, k: big ? 0.72 : 0.36, foot: 0.1 }, legR: { a: big ? 0.2 : 0.06, k: big ? 0.55 : 0.26, foot: 0.06, z: 'back' } };
    return Object.assign({}, base, { stance: 'side', ground: true, lean, head: { tilt: -lean * 0.72, turn: 0.35 }, expr: 'tired', face: { mouth: { k: 'grit', w: 0.17, h: 0.09 }, sweat: big ? 1 : 0, circles: 0 },
      armL: big ? { ik: [86, 58], bend: 1, fl: 0.95, hand: 'flat', flip: -1, hrot: 0.9 } : { ik: [70, -150], bend: -1, fl: 0.7, hand: 'fist', flip: -1, hrot: 0.3 },
      armR: big ? { ik: [54, 64], bend: 1, fl: 0.95, hand: 'flat', flip: -1, hrot: 0.9, z: 'back' } : { ik: [46, -150], bend: -1, fl: 0.7, hand: 'fist', flip: -1, z: 'back' },
      back: [{ k: 'house', torsoAt: [-84, -160], off: big ? [-34, -40] : [-24, -34], a: big ? 0.3 : 0.16, s: 1.08 * hs }] });
  }

  // ---- Mum swoons into Dad's arms: one call draws the pair. t: 0 (upright, startled) .. 1 (fainted back, caught).
  // o: x, y (Mum's feet), scale, facing (the way Mum faces; Dad stands behind her), mum, dad (ids), tint, shadow, blink, dadExpr.
  function swoonPair(g, o) {
    o = o || {};
    const k = clamp(o.t == null ? 1 : o.t, 0, 1), e = k * k * (3 - 2 * k), f = o.facing === -1 ? -1 : 1, s = o.scale || 1;
    const x = o.x == null ? 960 : o.x, y = o.y == null ? 960 : o.y, mumId = o.mum || 'fb_mum', dadId = o.dad || 'fb_dad';
    const mumH = (CAST[mumId] && CAST[mumId].h) || 1, dadH = (CAST[dadId] && CAST[dadId].h) || 1;
    const th = -f * 0.46 * e, dadX = x - f * 232 * s, ms = s * mumH, ds = s * dadH;
    const mumPt = p => { const q = rot([f * p[0] * ms, (p[1] - 330) * ms], th); return [x + q[0], y + q[1]]; };   // Mum's body space -> world
    const toDad = w => [(w[0] - dadX) * f / ds, (w[1] - y) / ds + 330];
    const rest = { R: [92, 27], L: [-92, 27] };
    const tR = lerp2(rest.R, toDad(mumPt([-74, -176])), e), tL = lerp2(rest.L, toDad(mumPt([-70, -80])), e);
    const dadOpts = { x: dadX, y, scale: s, facing: f, pose: 'stand', expr: o.dadExpr || (e > 0.2 ? 'scared' : 'surprised'), look: [0.9, -0.1 + 0.3 * e], tint: o.tint, shadow: o.shadow, blink: o.blink,
      override: { armR: { ik: tR, bend: -1, ul: 1, fl: 1, hand: 'flat', flip: -1, hrot: 0.3 }, armL: { ik: tL, bend: 1, hand: 'flat', flip: -1, hrot: -0.2 }, head: { tilt: 0.06 * e } } };
    const dadOut = figure(g, dadId, dadOpts);
    if (o.shadow) { g.fillStyle = o.shadow; g.fill(ell(x - f * 40 * s * e, y, 100 * s, 15 * s)); }
    g.save(); g.translate(x, y); g.rotate(th);
    const mumOut = figure(g, mumId, { x: 0, y: 0, scale: s, facing: f, pose: 'swoon', phase: e, tint: o.tint, blink: o.blink, mouth: o.mouth });
    g.restore();
    if (e > 0.05) {   // his near hand on her shoulder, over her
      const dch = buildWho(dadId, {}).ch, toB = w => [(w[0] - dadX) * f / ds, (w[1] - y) / ds + 330], Wb = toB(dadOut.handR), Eb = toB(dadOut.elbowR);
      const Fh = { g, c: o.tint ? (h2 => mul(h2, o.tint)) : (h2 => h2), lw: LW.figure / dadH }; Fh.skinC = Fh.c(dch.skin); Fh.ld = Fh.lw * LW.detail / LW.figure;
      g.save(); g.translate(dadX, y); g.scale(f * ds, ds); g.translate(0, -330); g.lineCap = 'round'; g.lineJoin = 'round';
      drawHand(Fh, Wb, angOf(Eb, Wb) + 0.3, 'flat', -1, 1.1); g.restore();
    }
    return { mum: mumOut, dad: dadOut };
  }

  // ================================================================ export
  const POV = global.POV || {};
  Object.assign(POV, { W, H, C, LW, INK, rng, hashStr, lerp, clamp, mix, mul, rgba, P, spl, ell, circ, rrect, fs, polyline, tube, stage,
    CAST, TOPS, RIG, EXPR, POSES, HOLD, HANDS, PROPS, figure, drawHand, drawShoe, face, resolveExpr,
    AGES, OUTFITS, buildWho, swoonPair, baby: PROPS.baby, motif });
  Object.assign(POV, PROPS);   // POV.phone, POV.clock, POV.notif, ... for convenience
  global.POV = POV;
})(typeof window !== 'undefined' ? window : globalThis);
