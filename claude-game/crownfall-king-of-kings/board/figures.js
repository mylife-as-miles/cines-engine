// Mannequin figures for the Crownfall board: articulated (pelvis, spine, neck, shoulders, elbows, wrists, hips, knees),
// dressed as silhouettes (bible p.16: "Nine figures, each readable in silhouette"). Built facing +z; their RIGHT is -x.
import * as THREE from 'three';

const V3 = THREE.Vector3, Q = THREE.Quaternion, DEG = Math.PI / 180;
const BOXG = new THREE.BoxGeometry(1, 1, 1);
const SPH = new THREE.SphereGeometry(1, 16, 12);
const SPHLO = new THREE.SphereGeometry(1, 10, 8);
const capCache = new Map();
function capsuleGeo(r, len) {
  const k = `${r.toFixed(3)}|${len.toFixed(3)}`;
  if (!capCache.has(k)) capCache.set(k, new THREE.CapsuleGeometry(r, len, 3, 8));
  return capCache.get(k);
}
// a square frustum (cloak, coat, robe): top [w, d], bottom [w, d], height; top at y=0, hanging down
const frCache = new Map();
function frustumGeo(top, bot, h, round = false) {
  const k = JSON.stringify([top, bot, h, round]);
  if (frCache.has(k)) return frCache.get(k);
  const g = new THREE.CylinderGeometry(1, 1, h, round ? 14 : 4, 1, false);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (!round) { const a = Math.atan2(z, x) + Math.PI / 4; const r = Math.hypot(x, z); x = Math.cos(a) * r; z = Math.sin(a) * r; x *= Math.SQRT1_2 * 2; z *= Math.SQRT1_2 * 2; }
    const u = (y + h / 2) / h;                      // 1 at the top
    const w = bot[0] + (top[0] - bot[0]) * u, d = bot[1] + (top[1] - bot[1]) * u;
    p.setXYZ(i, x * w / 2, y - h / 2, z * d / 2);
  }
  g.computeVertexNormals();
  frCache.set(k, g);
  return g;
}

// ---------------------------------------------------------------- the cast (bible pp.14-16; BREAKDOWN §4)
export const CAST = {
  cael: { h: 1.86, w: 1.28, skin: '#5f473a', body: '#1B1917', legs: '#141312', armour: '#211e1c', pauldrons: true, bandage: 'R',
    cloak: { color: '#121110', len: 'ground', top: [0.6, 0.34], bot: [1.04, 0.66] }, hair: '#0d0b0a', note: 'broad and cloaked, cinder black, no crown' },
  captain: { h: 1.82, w: 1.2, skin: '#62493b', body: '#2a2624', legs: '#1d1b1a', armour: '#3c3835', pauldrons: true, square: true,
    cloak: { color: '#1f1c1a', len: 'knee', top: [0.52, 0.3], bot: [0.62, 0.36] }, hair: '#151210', note: 'square and upright, the same plate kept in better order' },
  soldier: { h: 1.78, w: 1.08, skin: '#62493b', body: '#2b2826', legs: '#1d1b1a', armour: '#35312e', pauldrons: true, helmet: true },
  wounded: { h: 1.76, w: 1.05, skin: '#6a5546', body: '#6f6a62', legs: '#4e4a45', armour: '#77726a', pauldrons: true, bandageHead: true, bandage: 'L', note: 'grey with dust, bandaged' },
  guard: { h: 1.8, w: 1.1, skin: '#62493b', body: '#2b2826', legs: '#1d1b1a', armour: '#35312e', pauldrons: true, helmet: true, spear: true },
  gunner: { h: 1.76, w: 1.05, skin: '#62493b', body: '#2b2826', legs: '#1d1b1a', armour: '#35312e', helmet: true },
  bearer: { h: 1.74, w: 0.9, skin: '#6a4f40', body: '#2b2826', legs: '#1d1b1a', armour: '#35312e', thin: true, banner: 'shoulder', note: 'young and thin; pole 1.5x his height' },
  liora: { h: 1.62, w: 0.86, skin: '#71523f', body: '#5B4636', legs: '#3d3129', coat: { color: '#5B4636', len: 'calf', top: [0.4, 0.26], bot: [0.66, 0.46] },
    hood: 'back', hoodColor: '#8a8378', hair: '#17110e', note: 'slight, a long coat the boy can hold (ash and umber)' },
  boy: { h: 1.12, child: true, w: 0.82, skin: '#71523f', body: '#8E887D', legs: '#4d4339', respirator: true, hair: '#17110e', note: 'small; a respirator a size too big' },
  envoy: { h: 1.95, w: 0.86, skin: '#65503f', body: '#D9D2C2', legs: '#D9D2C2', robe: { color: '#D9D2C2', top: [0.42, 0.28], bot: [0.56, 0.42] }, collar: '#D9D2C2', hair: '#1a1513', note: 'tall and narrow; the one clean cloth' },
  navigator: { h: 1.76, w: 0.95, skin: '#6a5040', body: '#5B4636', legs: '#3d3129', hood: 'plated', hoodColor: '#6a5f52', eyes: true,
    coat: { color: '#615648', len: 'knee', top: [0.44, 0.27], bot: [0.62, 0.42] }, hair: '#17110e' },
  ward: { h: 1.74, w: 0.9, skin: '#E8E6E1', body: '#1B1630', legs: '#15112a', mask: true, collar: '#B9BEC3', gloves: '#E8E6E1',
    coat: { color: '#1d1833', len: 'calf', top: [0.42, 0.27], bot: [0.6, 0.42] }, note: 'pale mask, silver collar, pale gloves' },
  worker: { h: 1.78, w: 1.02, skin: '#0E0D0C', body: '#0E0D0C', legs: '#0E0D0C', cap: true, note: 'soot silhouette, no face' },
  civilian: { h: 1.66, w: 0.95, skin: '#66503f', body: '#7d766b', legs: '#5B4636', coat: { color: '#6f685d', len: 'calf', top: [0.42, 0.27], bot: [0.62, 0.44] }, hood: 'up', hoodColor: '#6f685d' },
  child: { h: 1.2, child: true, w: 0.85, skin: '#66503f', body: '#7d766b', legs: '#4d4339', hood: 'up', hoodColor: '#7d766b' },
};
const CIV_TONES = ['#7d766b', '#5B4636', '#8E887D', '#6b5d4c', '#9A9388', '#4f4439'];

// ---------------------------------------------------------------- hands
function makeHand(E, s, m, side, detail = true) {
  const g = new THREE.Group();
  const sx = side === 'R' ? 1 : -1;                    // palm faces local +x (R) / -x (L) at rest, fingers along -y, thumb +z
  const palm = new THREE.Mesh(BOXG, m); palm.scale.set(0.03 * s, 0.095 * s, 0.085 * s); palm.position.set(0, -0.05 * s, 0); g.add(palm);
  const fingers = [];
  if (detail) {
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Group(); f.position.set(0, -0.098 * s, (0.03 - i * 0.02) * s); g.add(f);
      const len = [0.075, 0.082, 0.077, 0.062][i] * s;
      const seg = new THREE.Mesh(BOXG, m); seg.scale.set(0.02 * s, len, 0.017 * s); seg.position.set(0, -len / 2, 0); f.add(seg);
      fingers.push(f);
    }
    const th = new THREE.Group(); th.position.set(0.006 * s * sx, -0.03 * s, 0.04 * s); g.add(th);
    const ts = new THREE.Mesh(BOXG, m); ts.scale.set(0.02 * s, 0.06 * s, 0.02 * s); ts.position.set(0, -0.03 * s, 0); th.add(ts);
    th.rotation.x = -0.55;
    g.userData.thumb = th;
  }
  g.userData.fingers = fingers; g.userData.side = side; g.userData.sx = sx;
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
function setHand(h, open = 1, shake = 0, t = 0, point = false) {
  const sx = h.userData.sx;
  const curl = (1 - open) * 1.65;
  h.userData.fingers.forEach((f, i) => {
    const tr = shake * 0.12 * Math.sin(t * 31 + i * 1.9) + shake * 0.06 * Math.sin(t * 53 + i);
    const c = point && i === 0 ? 0 : (point ? 1.65 : curl);
    f.rotation.set(0, 0, 0);
    f.rotation.z = sx * (c + tr);                       // curl toward the palm
    f.rotation.x = (i - 1.5) * 0.09 * open;             // spread when open
  });
  const th = h.userData.thumb;
  if (th) { th.rotation.set(-0.55 - 0.35 * open, 0, sx * (1 - open) * 1.1); }
}

// ---------------------------------------------------------------- build a figure
function jointAt(parent, x, y, z, name, f) { const j = new THREE.Group(); j.position.set(x, y, z); j.name = name; parent.add(j); f.j[name] = j; return j; }
function part(geo, m, parent, x, y, z, sx, sy, sz, f) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz);
  o.castShadow = true; o.receiveShadow = true; parent.add(o); if (f) f.meshes.push(o); return o;
}
export function makeFigure(E, kind, o = {}) {
  const base = CAST[kind] ?? CAST.soldier;
  const r = E.rng(9000 + (o.seed ?? 0));
  const spec = { ...base };
  if (kind === 'civilian' || kind === 'child') {
    const tone = CIV_TONES[Math.floor(r() * CIV_TONES.length)];
    spec.body = tone; spec.coat = spec.coat ? { ...spec.coat, color: CIV_TONES[Math.floor(r() * CIV_TONES.length)] } : undefined;
    spec.hood = r() < 0.6 ? 'up' : (r() < 0.5 ? 'back' : null); spec.hoodColor = tone;
  }
  if (o.color) spec.body = o.color;
  const h = (o.h ?? spec.h) * (o.scale ?? 1);
  const s = spec.child ? h / 1.5 : h / 1.75;          // children: shorter limbs, bigger heads
  const w = spec.w * (spec.thin ? 0.92 : 1);
  const lod = o.lod ?? 'full';
  const M = (c, extra = {}) => E.mat(c, { rim: true, ...extra });
  const mSkin = M(spec.gloves && false ? spec.gloves : spec.skin), mBody = M(spec.body), mLegs = M(spec.legs ?? spec.body);
  const mArm = M(spec.armour ?? spec.body, { rough: 0.7, metal: 0.25 });
  const f = { kind, spec, s, h, w, j: {}, meshes: [], props: {}, root: new THREE.Group(), lod };
  f.root.name = `fig:${o.id ?? kind}`;
  const body = new THREE.Group(); f.root.add(body); f.body = body;
  const legLen = spec.child ? 0.36 * s : 0.44 * s;
  const pelvisY = spec.child ? 0.8 * s : 0.95 * s;
  f.dims = { upper: 0.29 * s, fore: 0.26 * s, thigh: legLen, shin: legLen, pelvisY, hipDrop: 0.02 * s };
  const pelvis = jointAt(body, 0, pelvisY, 0, 'pelvis', f);
  part(BOXG, mLegs, pelvis, 0, 0, 0, 0.32 * w * s, 0.2 * s, 0.2 * s, f);
  const spine = jointAt(pelvis, 0, 0.06 * s, 0, 'spine', f);
  const torsoW = 0.36 * w * s * (spec.square ? 1.08 : 1);
  part(BOXG, mBody, spine, 0, 0.26 * s, 0, torsoW, 0.5 * s, 0.22 * s, f);
  if (spec.armour && lod === 'full') {
    part(BOXG, mArm, spine, 0, 0.31 * s, 0.012 * s, torsoW * 1.06, 0.34 * s, 0.235 * s, f);   // breastplate
    if (spec.pauldrons) for (const sx of [-1, 1]) {
      const pd = part(BOXG, mArm, spine, sx * (torsoW / 2 + 0.02 * s), 0.46 * s, 0, 0.14 * s * (spec.square ? 1.15 : 1), 0.07 * s, 0.2 * s, f);
      pd.rotation.z = sx * (spec.square ? -0.05 : -0.25);
    }
  }
  const neck = jointAt(spine, 0, 0.52 * s, 0, 'neck', f);
  const headR = 0.105 * s * (spec.child ? 1.3 : 1);
  part(capsuleGeo(0.045 * s, 0.05 * s), mSkin, neck, 0, 0.03 * s, 0, 1, 1, 1, f);
  const head = part(SPH, mSkin, neck, 0, 0.12 * s + headR - 0.105 * s, 0.005, headR * 0.9, headR * 1.1, headR, f);
  f.head = head;
  if (!spec.mask && lod === 'full') part(BOXG, mSkin, neck, 0, 0.11 * s + headR - 0.105 * s, headR * 0.95, 0.03 * s, 0.045 * s, 0.04 * s, f);   // nose: which way the face is
  if (spec.hair && lod === 'full' && !spec.helmet && spec.hood !== 'up') {
    const hair = part(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), M(spec.hair), neck, 0, 0.125 * s + headR - 0.105 * s, -0.008 * s, headR * 0.95, headR * 1.12, headR * 1.04, f);
    hair.rotation.x = -0.35;
  }
  const headY = 0.12 * s + headR - 0.105 * s;
  if (spec.helmet) {
    part(new THREE.CylinderGeometry(1, 1, 1, 12), mArm, neck, 0, headY + 0.07 * s, 0, 0.115 * s, 0.13 * s, 0.12 * s, f);
    part(new THREE.CylinderGeometry(1, 1, 1, 12), mArm, neck, 0, headY + 0.02 * s, 0, 0.155 * s, 0.018 * s, 0.155 * s, f);
  }
  if (spec.hood === 'up') part(new THREE.SphereGeometry(1, 14, 10, Math.PI * 0.15, Math.PI * 1.7), M(spec.hoodColor ?? spec.body), neck, 0, headY + 0.01 * s, -0.01 * s, headR * 1.22, headR * 1.3, headR * 1.25, f).rotation.y = Math.PI;
  if (spec.hood === 'back') part(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), M(spec.hoodColor ?? spec.body), neck, 0, headY - 0.07 * s, -0.11 * s, headR * 1.1, headR * 0.8, headR * 0.9, f).rotation.x = -1.9;
  if (spec.hood === 'plated') {                         // the Atlas qazrin: a plated respirator hood, pushed back
    const hm = M(spec.hoodColor, { rough: 0.6, metal: 0.3 });
    for (let i = 0; i < 3; i++) { const p = part(BOXG, hm, neck, 0, headY - 0.02 * s - i * 0.045 * s, -0.12 * s - i * 0.02 * s, 0.22 * s, 0.05 * s, 0.03 * s, f); p.rotation.x = -0.5 - i * 0.25; }
  }
  if (spec.eyes) for (const sx of [-1, 1]) part(SPHLO, E.mat('#c9cdc9', { rough: 0.2 }), neck, sx * 0.035 * s, headY + 0.015 * s, headR * 0.88, 0.016 * s, 0.012 * s, 0.008 * s, f);
  if (spec.respirator) {                                // too big for him: wider than his face, canisters to the sides
    const rm = M('#4e483d', { rough: 0.6, metal: 0.35 });
    part(BOXG, rm, neck, 0, headY - 0.035 * s, headR * 0.92, 0.15 * s, 0.12 * s, 0.1 * s, f);
    for (const sx of [-1, 1]) { const c = part(new THREE.CylinderGeometry(1, 1, 1, 10), rm, neck, sx * 0.1 * s, headY - 0.06 * s, headR * 0.85, 0.035 * s, 0.09 * s, 0.035 * s, f); c.rotation.z = Math.PI / 2 + sx * 0.5; c.rotation.y = sx * 0.6; }
    part(BOXG, M('#2e2a24'), neck, 0, headY + 0.01 * s, -0.005 * s, headR * 2.05, 0.025 * s, headR * 2.05, f);
  }
  if (spec.mask) {                                      // Korvenia: no faces. A pale mask, silver at the collar
    part(SPH, E.mat('#E8E6E1', { rough: 0.35, rim: true }), neck, 0, headY, headR * 0.35, headR * 0.98, headR * 1.18, headR * 0.75, f);
    part(SPH, M(spec.body), neck, 0, headY + 0.01 * s, -0.02 * s, headR * 1.08, headR * 1.2, headR * 1.05, f);
  }
  if (spec.collar) part(new THREE.CylinderGeometry(1, 1.1, 1, 16), E.mat(spec.collar, { rough: 0.3, metal: spec.collar === '#B9BEC3' ? 0.8 : 0, rim: true }), spine, 0, 0.52 * s, 0, 0.085 * s, 0.07 * s, 0.075 * s, f);
  if (spec.bandageHead) part(new THREE.CylinderGeometry(1, 1, 1, 12), E.mat('#D8CFBD', { rim: true }), neck, 0, headY + 0.04 * s, 0, headR * 1.03, 0.035 * s, headR * 1.03, f);
  if (spec.cap) part(new THREE.CylinderGeometry(1, 1.05, 1, 10), mBody, neck, 0, headY + 0.07 * s, 0.01 * s, headR * 1.05, 0.06 * s, headR * 1.1, f);
  // arms
  const sleeveM = spec.armour ? mArm : mBody;
  f.hands = {};
  for (const [side, sx] of [['R', -1], ['L', 1]]) {
    const sh = jointAt(spine, sx * (torsoW / 2 + 0.035 * s), 0.46 * s, 0, 'shoulder' + side, f);
    part(capsuleGeo(0.048 * s * (spec.armour ? 1.15 : 1), 0.2 * s), sleeveM, sh, 0, -0.14 * s, 0, 1, 1, 1, f);
    const el = jointAt(sh, 0, -f.dims.upper, 0, 'elbow' + side, f);
    part(capsuleGeo(0.043 * s * (spec.armour ? 1.1 : 1), 0.18 * s), sleeveM, el, 0, -0.12 * s, 0, 1, 1, 1, f);
    if (spec.bandage === side) {
      f.bandBands = [];
      for (let i = 0; i < 3; i++) f.bandBands.push(part(new THREE.CylinderGeometry(1, 1, 1, 12), E.mat('#D8CFBD', { rim: true }), el, 0, -0.07 * s - i * 0.055 * s, 0, 0.05 * s, 0.03 * s, 0.05 * s, f));
    }
    const wr = jointAt(el, 0, -f.dims.fore, 0, 'wrist' + side, f);
    const handM = spec.gloves ? E.mat(spec.gloves, { rough: 0.5, rim: true }) : mSkin;
    const hand = makeHand(E, s, handM, side, lod === 'full');
    wr.add(hand); f.hands[side] = hand;
  }
  // legs
  for (const [side, sx] of [['R', -1], ['L', 1]]) {
    const hip = jointAt(pelvis, sx * 0.095 * s * w, -f.dims.hipDrop, 0, 'hip' + side, f);
    part(capsuleGeo(0.07 * s, legLen - 0.12 * s), mLegs, hip, 0, -legLen / 2, 0, 1, 1, 1, f);
    const kn = jointAt(hip, 0, -legLen, 0, 'knee' + side, f);
    part(capsuleGeo(0.06 * s, legLen - 0.12 * s), mLegs, kn, 0, -legLen / 2, 0, 1, 1, 1, f);
    part(BOXG, M('#1a1715'), kn, 0, -legLen - 0.01 * s, 0.04 * s, 0.1 * s, 0.07 * s, 0.25 * s, f);
  }
  // long garments hang from the spine (they lean with the torso)
  const groundFromSpine = pelvisY + 0.06 * s;
  const garment = (g, y0, color, round = false) => {
    const len = g.len === 'ground' ? groundFromSpine + y0 - 0.02 : g.len === 'knee' ? groundFromSpine + y0 - 0.5 * s : groundFromSpine + y0 - 0.3 * s;
    const top = [g.top[0] * w * s, g.top[1] * s], bot = [g.bot[0] * w * s, g.bot[1] * s];
    const m = part(frustumGeo(top, bot, len, round), E.mat(color, { rim: true }), spine, 0, y0, -0.015 * s, 1, 1, 1, f);
    return m;
  };
  if (spec.cloak) f.props.cloak = garment(spec.cloak, 0.5 * s, spec.cloak.color);
  if (spec.coat) f.props.coat = garment(spec.coat, 0.46 * s, spec.coat.color);
  if (spec.robe) f.props.robe = garment({ ...spec.robe, len: 'ground' }, 0.5 * s, spec.robe.color, true);
  // props
  const poleH = 1.5 * h;
  if (spec.banner || o.banner) {                        // pole = half as tall again as he is (bible p.16)
    const bg = new THREE.Group(); f.root.add(bg); f.props.banner = bg;
    part(new THREE.CylinderGeometry(0.022, 0.026, poleH, 6), E.mat('#211d19', { rim: true }), bg, 0, poleH / 2, 0, 1, 1, 1);
    const bound = new THREE.Group(); bound.position.y = poleH - 0.62; bg.add(bound);
    part(new THREE.CylinderGeometry(0.075, 0.07, 1.05, 8), E.mat('#2c1513', { rim: true }), bound, 0, 0, 0, 1, 1, 1);
    for (let i = 0; i < 4; i++) part(new THREE.CylinderGeometry(0.082, 0.082, 0.025, 8), E.mat('#141110'), bound, 0, -0.42 + i * 0.28, 0, 1, 1, 1);
    const flag = new THREE.Group(); flag.position.y = poleH - 0.02; bg.add(flag);
    const fg = new THREE.PlaneGeometry(1, 1, 8, 6); fg.translate(0.5, -0.5, 0);
    const pos = fg.attributes.position;                 // ragged lower edge
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); if (y < -0.99) pos.setY(i, y + (0.12 * Math.sin(x * 23) + 0.08 * Math.sin(x * 51)) - 0.04); }
    fg.computeVertexNormals();
    const fm = part(fg, E.mat('#8E1B1B', { double: true, rim: true }), flag, 0.03, 0, 0, 1.15, 0.85, 1);
    f.props.bound = bound; f.props.flag = flag; f.props.flagMesh = fm; f.props.flagGeo = fg; f.props.flagBase = Float32Array.from(pos.array); f.poleH = poleH;
  }
  if (spec.spear) { const sp = new THREE.Group(); f.root.add(sp); f.props.spear = sp; part(new THREE.CylinderGeometry(0.02, 0.022, 2.4, 6), E.mat('#211d19', { rim: true }), sp, 0, 1.2, 0, 1, 1, 1); part(new THREE.ConeGeometry(0.035, 0.22, 4), E.mat('#3a3735', { metal: 0.6, rough: 0.4 }), sp, 0, 2.5, 0, 1, 1, 1); }
  if (o.mirror || kind === 'liora' || kind === 'ward') {   // her lantern's mirror; the officer's silver disc
    const mg = new THREE.Group(); f.props.mirror = mg; f.hands[kind === 'ward' ? 'L' : 'R'].add(mg);
    mg.position.set(0, -0.12 * s, 0);
    part(new THREE.CylinderGeometry(0.085, 0.085, 0.012, 20), E.mat('#B9BEC3', { metal: 0.85, rough: 0.25, rim: true }), mg, 0, 0, 0, 1, 1, 1).rotation.z = Math.PI / 2;
    const glass = part(new THREE.CircleGeometry(0.072, 20), E.lampMat('#F2F4F1', 6), mg, 0.008, 0, 0, 1, 1, 1);
    glass.rotation.y = Math.PI / 2; f.props.mirrorGlass = glass;
    mg.visible = false;
  }
  if (o.lamp) {                                         // civilians coming down the stair: "Lamps, moving down"
    const lg = new THREE.Group(); f.props.lamp = lg; f.hands.L.add(lg); lg.position.set(0, -0.16 * s, 0);
    part(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 4), E.mat('#1a1715'), lg, 0, 0.0, 0, 1, 1, 1);
    part(BOXG, E.lampMat('#E08A3A', 2.2), lg, 0, -0.08, 0, 0.07, 0.1, 0.07);
  }
  f.root.traverse(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  f.partWorld = (name) => partWorld(f, name);
  f.dispose = () => {};
  return f;
}
function partWorld(f, name) {
  const v = new V3();
  f.root.updateMatrixWorld(true);
  switch (name) {
    case 'head': return f.j.neck.localToWorld(new V3(0, 0.12 * f.s, 0.02));
    case 'eyes': return f.j.neck.localToWorld(new V3(0, 0.14 * f.s, 0.09 * f.s));
    case 'chest': return f.j.spine.localToWorld(new V3(0, 0.3 * f.s, 0.1 * f.s));
    case 'waist': return f.j.pelvis.localToWorld(new V3(0, 0.05 * f.s, 0.1 * f.s));
    case 'handR': case 'handL': return f.hands[name.slice(-1)].localToWorld(new V3(0, -0.06 * f.s, 0));
    case 'wristR': case 'wristL': return f.j['wrist' + name.slice(-1)].getWorldPosition(v);
    case 'shoulderR': case 'shoulderL': return f.j['shoulder' + name.slice(-1)].getWorldPosition(v);
    case 'mirror': return f.props.mirror ? f.props.mirror.getWorldPosition(v) : f.hands.R.getWorldPosition(v);
    case 'feet': return f.root.getWorldPosition(v);
    case 'mask': return f.j.neck.localToWorld(new V3(0, 0.13 * f.s, 0.12 * f.s));
    case 'bannerTop': return f.props.banner ? f.props.banner.localToWorld(new V3(0, f.poleH, 0)) : partWorld(f, 'head');
    default: return f.j.spine.localToWorld(new V3(0, 0.3 * f.s, 0));
  }
}

// ---------------------------------------------------------------- pose helpers
function rot(f, name, x = 0, y = 0, z = 0) { const j = f.j[name]; if (j) j.rotation.set(x, y, z); }
function addRot(f, name, x = 0, y = 0, z = 0) { const j = f.j[name]; if (j) { j.rotation.x += x; j.rotation.y += y; j.rotation.z += z; } }
function resetPose(f) {
  for (const j of Object.values(f.j)) { j.rotation.set(0, 0, 0); j.quaternion.identity(); }
  f.j.pelvis.position.y = f.dims.pelvisY;
  f.body.rotation.set(0, 0, 0); f.body.position.set(0, 0, 0);
  rot(f, 'shoulderR', 0, 0, -0.07); rot(f, 'shoulderL', 0, 0, 0.07);
  rot(f, 'elbowR', -0.12); rot(f, 'elbowL', -0.12);
}
// point a joint's local -y axis at a world target
function aimJoint(j, target) {
  j.parent.updateMatrixWorld(true);
  const jp = j.getWorldPosition(new V3());
  const dir = target.clone().sub(jp);
  if (dir.lengthSq() < 1e-8) return;
  dir.normalize().applyQuaternion(j.parent.getWorldQuaternion(new Q()).invert());
  j.quaternion.setFromUnitVectors(new V3(0, -1, 0), dir);
  j.updateMatrixWorld(true);
}
// two-bone IK: put the wrist of arm `side` at a world point; the elbow bends toward `pole` (world dir)
function ikArm(f, side, T, pole) {
  const sh = f.j['shoulder' + side], el = f.j['elbow' + side];
  f.root.updateMatrixWorld(true);
  const S = sh.getWorldPosition(new V3());
  const L1 = f.dims.upper, L2 = f.dims.fore;
  const toT = T.clone().sub(S); let d = toT.length();
  const dir = toT.clone().normalize();
  d = Math.min(Math.max(d, Math.abs(L1 - L2) + 1e-3), L1 + L2 - 1e-4);
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
  const bodyQ = f.root.getWorldQuaternion(new Q());
  const P = (pole ? new V3(...pole) : new V3(side === 'R' ? -0.6 : 0.6, -1, -0.5).applyQuaternion(bodyQ)).normalize();
  const ortho = P.sub(dir.clone().multiplyScalar(P.dot(dir)));
  if (ortho.lengthSq() < 1e-6) ortho.set(0, -1, 0); ortho.normalize();
  const Ew = S.clone().addScaledVector(dir, a).addScaledVector(ortho, hh);
  aimJoint(sh, Ew);
  aimJoint(el, S.clone().addScaledVector(dir, d));
}
// orient a hand so its palm faces a world point and its fingers point along `up` (world)
function palmAt(f, side, target, up = [0, 1, 0]) {
  const hand = f.hands[side], wr = f.j['wrist' + side];
  wr.updateMatrixWorld(true);
  const hp = wr.getWorldPosition(new V3());
  const N = target.clone().sub(hp).normalize();
  const F = new V3(...up).sub(N.clone().multiplyScalar(new V3(...up).dot(N))).normalize();   // fingers
  const Y = F.clone().negate();                         // local -y is the finger direction
  const X = N.clone().multiplyScalar(side === 'R' ? 1 : -1);
  const Z = new V3().crossVectors(X, Y).normalize();
  const m = new THREE.Matrix4().makeBasis(X, Y, Z);
  const qW = new Q().setFromRotationMatrix(m);
  const qP = wr.getWorldQuaternion(new Q()).invert();
  hand.quaternion.copy(qP.multiply(qW));
}

// ---------------------------------------------------------------- named poses
const POSES = {
  stand(f) {},
  walk(f, p, t) {
    const sp = p.speed ?? 1.3, stride = 1.45 * f.s;
    const ph = (t * sp / stride + (p.phase ?? 0)) * 2 * Math.PI;
    const A = 0.42;
    rot(f, 'hipL', -Math.sin(ph) * A); rot(f, 'hipR', Math.sin(ph) * A);
    rot(f, 'kneeL', 0.1 + 0.6 * Math.max(0, Math.sin(ph - 1.2))); rot(f, 'kneeR', 0.1 + 0.6 * Math.max(0, Math.sin(ph + Math.PI - 1.2)));
    rot(f, 'shoulderL', Math.sin(ph) * 0.32, 0, 0.07); rot(f, 'shoulderR', -Math.sin(ph) * 0.32, 0, -0.07);
    rot(f, 'elbowL', -0.3); rot(f, 'elbowR', -0.3);
    f.j.pelvis.position.y = f.dims.pelvisY - 0.015 * f.s + 0.015 * f.s * Math.cos(2 * ph);
    rot(f, 'spine', 0.05);
  },
  run(f, p, t) {
    const sp = p.speed ?? 3.6, stride = 2.4 * f.s;
    const ph = (t * sp / stride + (p.phase ?? 0)) * 2 * Math.PI;
    rot(f, 'hipL', -Math.sin(ph) * 0.75 - 0.15); rot(f, 'hipR', Math.sin(ph) * 0.75 - 0.15);
    rot(f, 'kneeL', 0.3 + 1.2 * Math.max(0, Math.sin(ph - 1.0))); rot(f, 'kneeR', 0.3 + 1.2 * Math.max(0, Math.sin(ph + Math.PI - 1.0)));
    rot(f, 'shoulderL', Math.sin(ph) * 0.7, 0, 0.12); rot(f, 'shoulderR', -Math.sin(ph) * 0.7, 0, -0.12);
    rot(f, 'elbowL', -1.4); rot(f, 'elbowR', -1.4);
    f.j.pelvis.position.y = f.dims.pelvisY - 0.06 * f.s + 0.04 * f.s * Math.abs(Math.cos(ph));
    rot(f, 'spine', 0.28);
  },
  kneel(f) {                                            // on the right knee, left foot forward
    f.j.pelvis.position.y = f.dims.thigh + 0.06 * f.s;
    rot(f, 'hipL', -1.45, 0, 0.05); rot(f, 'kneeL', 1.45);
    rot(f, 'hipR', 0.12, 0, -0.05); rot(f, 'kneeR', 1.5);
    rot(f, 'spine', 0.12);
  },
  crouch(f) {                                           // down at a child's level
    f.j.pelvis.position.y = f.dims.thigh * 0.85 + 0.02 * f.s;
    rot(f, 'hipL', -1.85, 0, 0.18); rot(f, 'kneeL', 2.15);
    rot(f, 'hipR', -1.6, 0, -0.18); rot(f, 'kneeR', 2.0);
    rot(f, 'spine', 0.4); rot(f, 'neck', -0.3);
    rot(f, 'shoulderR', -0.5, 0, -0.1); rot(f, 'shoulderL', -0.5, 0, 0.1); rot(f, 'elbowR', -0.7); rot(f, 'elbowL', -0.7);
  },
  cower(f) {                                            // crouched low, head down, arms over the head (Liora under the block)
    POSES.crouch(f);
    rot(f, 'spine', 0.75); rot(f, 'neck', 0.35);
    rot(f, 'shoulderR', -2.4, 0, -0.35); rot(f, 'elbowR', -1.6); rot(f, 'shoulderL', -2.4, 0, 0.35); rot(f, 'elbowL', -1.6);
  },
  sit(f) {                                              // sitting on the ground, knees up (sinks against a gun)
    f.j.pelvis.position.y = 0.14 * f.s;
    rot(f, 'hipL', -1.25, 0, 0.12); rot(f, 'kneeL', 1.3); rot(f, 'hipR', -1.4, 0, -0.1); rot(f, 'kneeR', 1.0);
    rot(f, 'spine', -0.22); rot(f, 'neck', 0.25);
    rot(f, 'shoulderR', -0.3, 0, -0.2); rot(f, 'shoulderL', -0.5, 0, 0.2); rot(f, 'elbowR', -0.6); rot(f, 'elbowL', -0.9);
  },
  sitUp(f) {                                            // bolt upright on a stretcher, legs out straight
    f.j.pelvis.position.y = 0.1 * f.s;
    rot(f, 'hipL', -1.5); rot(f, 'hipR', -1.5); rot(f, 'kneeL', 0.05); rot(f, 'kneeR', 0.05);
    rot(f, 'spine', -0.04);
    rot(f, 'shoulderR', -0.35, 0, -0.1); rot(f, 'elbowR', -0.9); rot(f, 'shoulderL', -0.2, 0, 0.1); rot(f, 'elbowL', -0.5);
  },
  lie(f) {                                              // on his back; the body pivots so the figure lies along -z (head) .. +z (feet)? no: head toward -z
    f.body.rotation.x = -Math.PI / 2;
    f.body.position.set(0, 0.13 * f.s, f.dims.pelvisY - 0.05);
    rot(f, 'shoulderR', 0.1, 0, -0.12); rot(f, 'shoulderL', 0.1, 0, 0.12); rot(f, 'elbowR', -0.2); rot(f, 'elbowL', -0.2);
  },
  carry(f) {                                            // a stretcher's poles in both hands, at hip height
    rot(f, 'shoulderR', -0.25, 0, -0.12); rot(f, 'shoulderL', -0.25, 0, 0.12); rot(f, 'elbowR', -0.35); rot(f, 'elbowL', -0.35);
    rot(f, 'spine', 0.08);
  },
  shelter(f) {                                          // Liora's shelter sign: her left hand raised, open, palm forward
    rot(f, 'shoulderL', -1.25, 0, 0.55); rot(f, 'elbowL', -1.35);
  },
  armRaised(f) {                                        // the open hand: right arm up and forward
    rot(f, 'shoulderR', -2.5, 0, -0.25); rot(f, 'elbowR', -0.08);
  },
  point(f) { rot(f, 'shoulderR', -1.45, 0, -0.1); rot(f, 'elbowR', -0.05); },
  gripTable(f) { rot(f, 'spine', 0.3); rot(f, 'shoulderR', -0.9, 0, -0.1); rot(f, 'shoulderL', -0.9, 0, 0.1); rot(f, 'elbowR', -0.25); rot(f, 'elbowL', -0.25); },
  slump(f) { rot(f, 'spine', 0.35); rot(f, 'neck', 0.4); rot(f, 'shoulderR', 0.05, 0, -0.05); rot(f, 'shoulderL', 0.05, 0, 0.05); rot(f, 'kneeL', 0.1); rot(f, 'kneeR', 0.1); },
  lookUp(f) { rot(f, 'neck', -0.55); rot(f, 'spine', -0.08); },
  handOverWrist(f) {                                    // Liora: her right hand settles over her left wrist, at the waist
    rot(f, 'shoulderL', -0.45, 0, 0.12); rot(f, 'elbowL', -1.25, 0, 0); rot(f, 'shoulderR', -0.5, 0, -0.05); rot(f, 'elbowR', -1.35);
  },
};
POSES.wrist = POSES.crouch;

// ---------------------------------------------------------------- pose a figure for time t
export function poseFigure(E, f, p, t, stretchers, second = false) {
  const s = f.s;
  f.root.visible = p.visible ?? true;
  if (!f.root.visible) return;
  resetPose(f);
  // where: pos [x,z] | [x,y,z]; walk: {to, from?, t0, speed} moves along a line; on: stretcher id
  let pos = p.pos ? [...p.pos] : null, yaw = null, walking = false;
  if (p.walk) {
    const from = p.walk.from ?? p.pos, to = p.walk.to;
    const a = from.length > 2 ? [from[0], from[2]] : from, b = to.length > 2 ? [to[0], to[2]] : to;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), sp = p.walk.speed ?? 1.3, el = Math.max(0, t - (p.walk.t0 ?? 0));
    const k = L > 0 ? Math.min(el * sp / L, 1) : 1;
    pos = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    if (from.length > 2 && to.length > 2) pos = [pos[0], from[1] + (to[1] - from[1]) * k, pos[1]];
    walking = k > 0 && k < 1 && t >= (p.walk.t0 ?? 0);
    yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
  }
  if (p.on && stretchers?.get(p.on)) {
    const st = stretchers.get(p.on);
    st.root.updateMatrixWorld(true);
    const top = st.root.localToWorld(new V3(0, st.top, 0.15));
    pos = [top.x, top.y, top.z];
    yaw = st.root.rotation.y;
  }
  if (pos && !p.keepPos) {
    if (pos.length > 2) f.root.position.set(pos[0], pos[1], pos[2]);
    else f.root.position.set(pos[0], p.y ?? E.groundAt(pos[0], pos[1]), pos[1]);
  } else if (p.keepPos && p.y !== undefined) f.root.position.y = p.y;
  // facing: degrees (0 = +z, 90 = +x), a point [x,z]/[x,y,z], or another figure's id
  if (p.face !== undefined && p.face !== null) {
    if (typeof p.face === 'number') yaw = p.face * DEG;
    else {
      const tp = E.where(p.face);
      if (typeof p.face === 'string' && E.figures.has(p.face.split('.')[0])) f.needsSecondPass = true;
      yaw = Math.atan2(tp.x - f.root.position.x, tp.z - f.root.position.z);
    }
  }
  if (yaw !== null) f.root.rotation.set(0, yaw, 0);
  // the base pose
  const name = walking ? (p.walkPose ?? 'walk') : (p.pose ?? 'stand');
  (POSES[name] ?? POSES.stand)(f, p, t);
  if (name === 'lie' && p.on) f.body.position.y = 0.11 * s;
  if (name === 'sitUp' && p.on) f.body.position.y = 0;
  // adjustments
  if (p.lean) addRot(f, 'spine', p.lean * DEG);
  if (p.turn) addRot(f, 'spine', 0, p.turn * DEG, 0);
  if (p.head) addRot(f, 'neck', -(p.head[1] ?? 0) * DEG, (p.head[0] ?? 0) * DEG, 0);
  for (const [jn, v] of Object.entries(p.joints ?? {})) addRot(f, jn, (v[0] ?? 0) * DEG, (v[1] ?? 0) * DEG, (v[2] ?? 0) * DEG);
  f.root.updateMatrixWorld(true);
  const tgt = (v) => { if (typeof v === 'string' && E.figures.has(v.split('.')[0])) f.needsSecondPass = true; return E.where(v); };
  // look: turn the head (and a little of the spine) toward a point
  if (p.look) {
    const L = tgt(p.look), hp = f.j.neck.getWorldPosition(new V3());
    const d = L.clone().sub(hp).applyQuaternion(f.j.spine.getWorldQuaternion(new Q()).invert());
    const yawL = Math.max(-1.3, Math.min(1.3, Math.atan2(d.x, d.z))), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
    addRot(f, 'neck', Math.max(-0.9, Math.min(0.7, -pitch)), yawL, 0);
  }
  f.root.updateMatrixWorld(true);
  // arms: aim (straight arm toward a point), reach (IK: wrist to a point), palm (palm faces a point)
  for (const side of ['R', 'L']) {
    if (p['aim' + side]) { aimJoint(f.j['shoulder' + side], tgt(p['aim' + side])); f.j['elbow' + side].rotation.set(-(p['bend' + side] ?? 0.06), 0, 0); }
    if (p['reach' + side]) ikArm(f, side, tgt(p['reach' + side]), p['pole' + side]);
  }
  f.root.updateMatrixWorld(true);
  for (const side of ['R', 'L']) {
    const pv = p['palm' + side];
    if (pv) {
      let target = pv === 'out' ? (p['aim' + side] ? tgt(p['aim' + side]) : f.partWorld('hand' + side).add(new V3(0, 0, 1).applyQuaternion(f.root.quaternion))) : tgt(pv);
      if (pv === 'out' && !p['aim' + side]) target = f.j['wrist' + side].getWorldPosition(new V3()).add(new V3(0, 0.2, 1).applyQuaternion(f.root.quaternion));
      palmAt(f, side, target, p['fingers' + side] ?? [0, 1, 0]);
    }
  }
  // hands: open 1 .. closed 0, shake (fingers tremble), 'point'
  const shake = p.shake ?? 0;
  for (const side of ['R', 'L']) {
    const hv = p['hand' + side];
    const open = hv === 'point' ? 0 : (typeof hv === 'number' ? hv : (name === 'armRaised' || name === 'shelter' ? 1 : 0.55));
    setHand(f.hands[side], open, side === (p.shakeSide ?? 'R') ? shake : 0, t, hv === 'point');
    if (shake && side === (p.shakeSide ?? 'R')) { f.hands[side].rotation.x += 0.04 * shake * Math.sin(t * 23); f.hands[side].rotation.z += 0.03 * shake * Math.sin(t * 17 + 1); }
    f.hands[side].visible = !(p.hideHand === side || p.hideHand === true);
  }
  // blood through the binding: 0..1 soaks the three bands one by one (dark, not banner red)
  if (f.bandBands) f.bandBands.forEach((b, i) => { b.material = E.mat((p.blood ?? 0) > i / 3 + 0.05 ? '#4a1714' : '#D8CFBD', { rim: true }); });
  // props
  if (f.props.banner) poseBanner(E, f, p, t);
  if (f.props.spear) { f.props.spear.position.set(-0.3 * s, 0, 0.18 * s); f.root.updateMatrixWorld(true); ikArm(f, 'R', f.props.spear.localToWorld(new V3(0, 1.15 * s, 0))); }
  if (f.props.mirror) {
    const show = p.mirror ?? (f.kind === 'ward' ? false : false);
    f.props.mirror.visible = !!show;
    if (show) f.props.mirrorGlass.material = E.lampMat('#F2F4F1', 0.35 + (p.flash ?? 0) * 8);
  }
  if (f.props.lamp) f.props.lamp.visible = p.lampOn ?? true;
  f.root.updateMatrixWorld(true);
}
function poseBanner(E, f, p, t) {
  const s = f.s, bg = f.props.banner, mode = p.banner ?? f.spec.banner ?? 'shoulder';
  const open = p.bannerOpen ?? (mode === 'open' ? 1 : 0);
  bg.visible = mode !== 'none';
  if (!bg.visible) return;
  bg.rotation.set(0, 0, 0);
  const L = f.poleH;
  let grip = 1.2;                                       // height along the pole of the right hand
  if (mode === 'shoulder') { bg.position.set(-0.17 * s, 0.75 * s, 0.32 * s); bg.rotation.set(-0.55, 0, 0.12); grip = 0.45 * s; }
  else if (mode === 'upright') { bg.position.set(-0.34 * s, 0.02, 0.1 * s); grip = 1.15 * s; }
  else if (mode === 'raised' || mode === 'open') { bg.position.set(-0.22 * s, 0.62 * s, 0.24 * s); grip = 0.55 * s; }
  else if (mode === 'lowered') { bg.position.set(-0.2 * s, 0.95 * s, 0.25 * s); bg.rotation.set(1.05, 0, 0); grip = 0.12 * s; }
  f.root.updateMatrixWorld(true);
  ikArm(f, 'R', bg.localToWorld(new V3(0, grip, 0)));
  if (mode === 'raised' || mode === 'open' || mode === 'lowered') ikArm(f, 'L', bg.localToWorld(new V3(0, grip + (mode === 'lowered' ? 0.35 : 0.42) * s, 0)));
  setHand(f.hands.R, 0.15); setHand(f.hands.L, mode === 'shoulder' || mode === 'upright' ? 0.6 : 0.15);
  // bound -> open: the roll shrinks as the cloth unfurls
  f.props.bound.visible = open < 0.98;
  f.props.bound.scale.set(1, Math.max(0.02, 1 - open), 1);
  f.props.flag.visible = open > 0.02;
  f.props.flag.scale.set(1, Math.max(0.02, open), 1);
  f.props.flag.rotation.y = (p.bannerWind ?? -60) * DEG - bg.rotation.y;
  // a little wave in the cloth
  const g = f.props.flagGeo, pos = g.attributes.position, b0 = f.props.flagBase;
  for (let i = 0; i < pos.count; i++) { const x = b0[i * 3], y = b0[i * 3 + 1]; pos.setZ(i, x * 0.18 * Math.sin(t * 3.1 + x * 4 + y * 1.5)); }
  pos.needsUpdate = true; g.computeVertexNormals();
}

// ---------------------------------------------------------------- stretchers
export function makeStretcher(E, spec) {
  const root = new THREE.Group();
  const wood = E.mat('#2a241e', { rim: true }), canvas = E.mat(spec.color ?? '#6f6a5f', { rim: true });
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.3, 6), wood); p.rotation.x = Math.PI / 2; p.position.set(sx * 0.3, 0, 0); root.add(p); }
  const c = new THREE.Mesh(BOXG, canvas); c.scale.set(0.58, 0.02, 1.85); root.add(c);
  for (const sx of [-1, 1]) for (const sz of [-0.8, 0.8]) { const l = new THREE.Mesh(BOXG, wood); l.scale.set(0.04, 0.18, 0.04); l.position.set(sx * 0.3, -0.1, sz); root.add(l); }
  const rail = new THREE.Mesh(BOXG, wood); rail.scale.set(0.62, 0.05, 0.04); rail.position.set(0, 0.03, -0.95); root.add(rail);   // the rail he strikes
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const bearers = [];
  if (spec.bearers) for (let i = 0; i < 2; i++) {
    const b = makeFigure(E, spec.bearerKind ?? 'soldier', { seed: 77 + i, lod: 'full' });
    E.actors.add(b.root); bearers.push(b);
  }
  const o = {
    root, top: 0.02, bearers,
    update(E2, st, t) {
      const p = st.pos ?? spec.pos ?? [0, 0];
      const carried = st.carried ?? spec.carried ?? false;
      const yaw = (st.face ?? spec.face ?? 0) * DEG;
      const gy = p.length > 2 ? p[1] : E.groundAt(p[0], p[1]);
      const x = p[0], z = p.length > 2 ? p[2] : p[1];
      root.position.set(x, gy + (carried ? 0.82 : 0.2), z);
      root.rotation.set(0, yaw, 0);
      root.updateMatrixWorld(true);
      bearers.forEach((b, i) => {
        b.root.visible = carried || (st.bearersStay ?? false);
        const end = root.localToWorld(new V3(0, 0, (i ? -1 : 1) * 1.32));
        poseFigure(E2, b, { pos: [end.x, gy, end.z], face: (yaw / DEG) + (i ? 0 : 0), pose: st.walking ? 'walk' : 'carry', speed: 1.0, phase: i * 0.5 }, t);
        b.root.updateMatrixWorld(true);
        for (const side of ['R', 'L']) ikArm(b, side, root.localToWorld(new V3(side === 'R' ? -0.3 : 0.3, 0, (i ? -1 : 1) * 1.15)));
      });
    },
  };
  return o;
}

// ---------------------------------------------------------------- the hero hand, for the four matching inserts (bible p.13)
// One gesture, four meanings: 3.4 open (saves), 6.3 open (destroys), 10.3 open (the ward officer), 10.10 closed (war).
// The same model, size and camera every time, so the four shots lay one over the other.
const HAND_STYLES = {
  cael: { skin: '#6a4e3e', sleeve: '#1b1917', bandage: true },
  ward: { skin: '#E8E6E1', sleeve: '#1d1833', cuff: '#B9BEC3' },
  liora: { skin: '#71523f', sleeve: '#5B4636' },
  worker: { skin: '#141210', sleeve: '#0E0D0C' },
};
export function makeHeroHand(E, spec) {
  const st = HAND_STYLES[spec.style ?? 'cael'] ?? HAND_STYLES.cael;
  const side = spec.side ?? 'R', sx = side === 'R' ? 1 : -1;
  const skin = E.mat(st.skin, { rough: st.cuff ? 0.45 : 0.75, rim: true }), sleeve = E.mat(st.sleeve, { rim: true });
  const root = new THREE.Group(), hand = new THREE.Group(); root.add(hand);
  // palm: a slab with a softened heel; local: fingers +y, palm normal +z (toward what the hand holds), thumb toward -x*sx
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.1, 0.03, 2, 2, 1), skin); palm.position.set(0, 0.05, 0); hand.add(palm);
  const heel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.043, 0.03, 12), skin); heel.rotation.x = Math.PI / 2; heel.scale.set(1.05, 1, 0.7); heel.position.set(0, 0.0, 0); hand.add(heel);
  const fingers = [];
  const lens = [[0.046, 0.028, 0.022], [0.05, 0.031, 0.024], [0.047, 0.029, 0.022], [0.037, 0.022, 0.019]];
  for (let i = 0; i < 4; i++) {
    const x = (0.032 - i * 0.0215) * sx;                // index next to the thumb (+x for a right hand)
    let parent = hand, y = 0.1;
    const segs = [];
    for (let k = 0; k < 3; k++) {
      const j = new THREE.Group(); j.position.set(k === 0 ? x : 0, k === 0 ? y : lens[i][k - 1], 0); parent.add(j);
      const r = 0.0098 - k * 0.0012 - (i === 3 ? 0.0012 : 0);
      const seg = new THREE.Mesh(new THREE.CapsuleGeometry(r, lens[i][k] - r * 1.4, 3, 8), skin); seg.position.y = lens[i][k] / 2; j.add(seg);
      segs.push(j); parent = j;
    }
    fingers.push(segs);
  }
  const thumb = [];
  { let parent = hand; const tl = [0.04, 0.032, 0.026];
    for (let k = 0; k < 3; k++) {
      const j = new THREE.Group(); j.position.set(k === 0 ? 0.04 * sx : 0, k === 0 ? 0.012 : tl[k - 1], k === 0 ? 0.008 : 0); parent.add(j);
      const r = 0.0125 - k * 0.0012; const seg = new THREE.Mesh(new THREE.CapsuleGeometry(r, tl[k] - r * 1.3, 3, 8), skin); seg.position.y = tl[k] / 2; j.add(seg);
      thumb.push(j); parent = j;
    } }
  // forearm and wrist
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 0.3, 14), skin); arm.position.set(0, -0.16, -0.005); hand.add(arm);
  const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.05, 0.3, 14), sleeve); sl.position.set(0, -0.36, -0.005); hand.add(sl);
  const bands = [];
  if (st.bandage) for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.036 + i * 0.002, 0.037 + i * 0.002, 0.026, 14), E.mat('#D8CFBD', { rim: true })); b.position.set(0, -0.07 - i * 0.045, -0.005); hand.add(b); bands.push(b); }
  if (st.cuff) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.042, 0.035, 18), E.mat(st.cuff, { metal: 0.85, rough: 0.25, rim: true })); c.position.set(0, -0.055, -0.005); hand.add(c); }
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, hand, fingers, thumb, bands, side, sx, N: new V3(0, 0, 1), P: new V3(), camera: null };
}
export function poseHeroHand(E, hh, p, t) {
  const side = p.side ?? hh.side, sx = hh.sx;
  // place: explicit pos, or attached to a figure's wrist (that figure's own hand is hidden)
  let P, N, F;
  if (p.attach && E.figures.get(p.attach)) {
    const f = E.figures.get(p.attach);
    f.hands[side].visible = false;
    f.root.updateMatrixWorld(true);
    const wq = f.hands[side].getWorldQuaternion(new Q());
    P = f.j['wrist' + side].getWorldPosition(new V3());
    // figure hand frame: fingers -y, palm normal +x (R) / -x (L)
    F = new V3(0, -1, 0).applyQuaternion(wq);
    N = new V3(side === 'R' ? 1 : -1, 0, 0).applyQuaternion(wq);
  } else {
    P = new V3(...(p.pos ?? [0, 1.6, 0]));
    const faceT = p.face ? E.where(p.face) : P.clone().add(new V3(0, 0, 1));
    N = faceT.clone().sub(P).normalize();
    const up = new V3(...(p.up ?? [0, 1, 0]));
    F = up.sub(N.clone().multiplyScalar(up.dot(N))).normalize();
  }
  // basis: +y fingers, +z palm normal, x = y cross z
  const X = new V3().crossVectors(F, N).normalize();
  const m = new THREE.Matrix4().makeBasis(X, F, N);
  hh.root.position.copy(P);
  hh.root.quaternion.setFromRotationMatrix(m);
  hh.root.updateMatrixWorld(true);
  hh.P.copy(P).addScaledVector(F, 0.07); hh.N.copy(N); hh.F = F.clone(); hh.X = X.clone();
  // fingers: open 1 .. closed 0 (a fist), shake trembles them
  const open = p.open ?? 1, shake = p.shake ?? 0;
  hh.fingers.forEach((segs, i) => segs.forEach((j, k) => {
    const tr = shake * (0.07 * Math.sin(t * 29 + i * 2.1 + k) + 0.04 * Math.sin(t * 47 + i));
    j.rotation.set(0, 0, 0);
    j.rotation.x = (1 - open) * [1.45, 1.6, 1.2][k] + tr;
    if (k === 0) j.rotation.z = (i - 1.5) * 0.085 * open * sx;
  }));
  hh.thumb.forEach((j, k) => { j.rotation.set(0, 0, 0); if (k === 0) { j.rotation.z = -sx * (0.75 * open + 0.25); j.rotation.x = (1 - open) * 0.6; } else j.rotation.x = (1 - open) * 0.7; });
  if (shake) { hh.hand.rotation.set(0.02 * shake * Math.sin(t * 19), 0, 0.015 * shake * Math.sin(t * 13 + 1)); } else hh.hand.rotation.set(0, 0, 0);
  hh.bands.forEach((b, i) => { b.material = E.mat((p.blood ?? 0) > i / 3 + 0.05 ? '#4a1714' : '#D8CFBD', { rim: true }); });
  hh.root.visible = p.visible ?? true;
  // the canonical insert camera: 'back' (behind the hand, toward what it holds) or 'palm' (facing the palm)
  hh.camera = (c = {}) => {
    const view = c.view ?? p.view ?? 'back', dist = c.dist ?? p.dist ?? 1.5;
    const dirToCam = view === 'palm' ? hh.N.clone() : hh.N.clone().negate();
    const off = c.offset ?? p.offset ?? [0, 0];
    const pos = hh.P.clone().addScaledVector(dirToCam, dist).addScaledVector(hh.X, off[0]).addScaledVector(hh.F, off[1]);
    return { pos: pos.toArray(), target: hh.P.toArray(), f: c.f ?? 50, near: 0.05 };
  };
}
