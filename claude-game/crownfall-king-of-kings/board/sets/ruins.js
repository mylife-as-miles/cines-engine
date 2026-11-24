// SCENES 8 and 10. EXT. FORECOURT - THE RUINS - SUNRISE (bible p.8 key 8; shots 8.1-8.6, and the ground of 9-10).
// The same layout after the fall: the gate towers broken to stumps, the outer wall low, the gatehouse roofless, the
// forecourt in rubble, the arch still standing (its right pier can break: arch.broken), the lantern smashed, the
// lower stair broken, and where the upper city stood a flat, jagged ruin line under an empty sky. Steam from broken
// pipes rises from the ruins. The first direct sun in the film, low behind the ruins (look 'sunrise').
import * as THREE from 'three';
import { L, buildPlain, buildCauseway, buildWallAndGate, buildGatehouse, buildForecourt, buildBattery, buildArch, poseArch,
  buildStair, buildInnerWall, buildZiggurat, buildCannon } from './solforiz.js';
import { puffMaterial } from './fall.js';
import { makeVeils, makeLightBars } from './fx.js';

const T = L.tiers;
function buildRuinLine(E, W) {
  // the flat ruined skyline: tilted slabs and broken blocks over the ziggurat's footprint, low (6-38 m)
  const b = new E.Batch('ruin-line');
  const stone = E.mat('#3a3631', { rough: 0.95 }), dark = E.mat('#2c2925', { rough: 0.95 });
  const r = E.rng(909);
  for (let i = 0; i < 520; i++) {
    const z = -100 - r() * 640, x = (r() - 0.5) * (660 - (Math.abs(z + 100) / 640) * 300);
    const h = 2 + r() * (z < -300 ? 15 : (z < -200 ? 8 : 3.5)), w = 8 + r() * 26, d = 6 + r() * 22;
    let tilt = (r() - 0.5) * 0.9;
    const mat = r() < 0.5 ? stone : dark;
    let rx = (r() - 0.5) * 0.5;
    // keep the skyline flat (key p.8): a slab may tilt, but its raised edge stays within a few metres
    const maxRise = z < -300 ? 5 : (z < -200 ? 3 : 1.6), rise = (w / 2) * Math.abs(Math.sin(tilt)) + (d / 2) * Math.abs(Math.sin(rx));
    if (rise > maxRise) { const k = maxRise / rise; tilt *= k; rx *= k; }
    b.box(w, h, d, mat, x, h * 0.35, z, rx, r() * 3, tilt);
  }
  // a few standing fragments: a broken tier face, stumps of towers (jagged teeth on the skyline)
  for (let i = 0; i < 14; i++) { const x = (r() - 0.5) * 520, z = -160 - r() * 520, h = 10 + r() * 14; b.box(2 + r() * 5, h, 2 + r() * 5, dark, x, h / 2, z, 0, r(), (r() - 0.5) * 0.5); }
  const meshes = b.build(W); meshes.forEach(m => { m.userData.ground = true; });
  return meshes;
}
export function buildRuins(E, o = {}) {
  const W = E.world, ctx = {};
  const ro = { ruined: true, stone: '#34312c', floor: '#3b3833', glass: '#26241f', road: '#4a453d' };
  buildPlain(E, W, ro); buildCauseway(E, W, ro); buildWallAndGate(E, W, ro);
  buildGatehouse(E, W, { stone: '#2e2b27' });
  buildForecourt(E, W, { ...ro, battery: false });
  ctx.guns = buildBattery(E, W, o);
  ctx.arch = buildArch(E, W, { stone: '#2a2724' });
  buildStair(E, W, ro);
  ctx.ruinLine = buildRuinLine(E, W);
  const cb = new E.Batch('ruin-guns');
  for (const [x, z, yaw] of [[-62, -24, 0.3], [44, -40, -0.6], [-98, -58, 0.9]]) buildCannon(E, cb, x, 0, z, yaw, { elev: 0.1, mat: E.mat('#141414', { rim: true }) });
  cb.build(W);
  // steam from broken pipes: soft columns that sway (state.steam 0..1)
  ctx.steam = [];
  const r = E.rng(311);
  const spots = [[-150, -260], [-40, -420], [30, -300], [120, -380], [210, -250], [-240, -480], [70, -560]];
  for (const [x, z] of spots) for (let k = 0; k < 4; k++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), puffMaterial(E, { lit: '#efe2c2', shade: '#8f8676', soft: 2.2 }));
    m.frustumCulled = false; W.add(m);
    ctx.steam.push({ m, x, z, k, ph: r() * 6, h: 18 + r() * 10 });
  }
  ctx.vents = buildVents(E, W);
  ctx.shade = buildShade(E, W);
  ctx.veils = makeVeils(E, W, 6);
  ctx.bars8 = makeLightBars(E, W, 3);
  return ctx;
}

// ---------------------------------------------------------------- scene 8 additions (all off unless a shot asks)
// vents: [{at: [x, z], yaw (deg, the way the broken end points), h (plume height m), rate (s per puff), size, opacity}]
//   a broken pipe on the ground venting steam (8.1: "a broken pipe vents steam 15 m from the lens").
const VENT_PUFFS = 26;
function buildVents(E, W) {
  const list = [];
  for (let v = 0; v < 2; v++) {
    const g = new THREE.Group(); g.visible = false; W.add(g);
    const b = new E.Batch('vent');
    const iron = E.mat('#1c1a17', { rough: 0.7, metal: 0.3, rim: true }), brass = E.mat('#3d3426', { rough: 0.6, metal: 0.4, rim: true });
    b.cyl(0.32, 0.32, 5.5, iron, -2.6, 0.32, 0, 14, 0, 0, Math.PI / 2);          // the pipe along the ground, broken end at x = 0
    b.cyl(0.4, 0.4, 0.22, brass, -4.2, 0.32, 0, 14, 0, 0, Math.PI / 2);          // a flange
    b.cyl(0.4, 0.4, 0.22, brass, -1.6, 0.32, 0, 14, 0, 0, Math.PI / 2);
    b.cyl(0.3, 0.3, 0.8, iron, -5.2, 0.6, 0, 12);                               // a riser going down into the rubble
    const r = E.rng(600 + v);
    for (let i = 0; i < 7; i++) b.box(0.3 + r() * 0.9, 0.2 + r() * 0.5, 0.3 + r() * 0.8, E.mat('#2e2b27', { rough: 0.95 }), -1 + r() * 2.5, 0.15, (r() - 0.5) * 2.6, r(), r() * 3, r());
    b.build(g);
    const puffs = [];
    for (let i = 0; i < VENT_PUFFS; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), puffMaterial(E, { lit: '#f1e4c4', shade: '#8d8576', soft: 2.0 }));
      m.visible = false; m.frustumCulled = false; m.renderOrder = 7; W.add(m); puffs.push(m);
    }
    list.push({ g, puffs, seed: r() * 10 });
  }
  return list;
}
function updateVents(E, specs = [], t) {
  return (vents) => vents.forEach((v, vi) => {
    const s = specs[vi];
    v.g.visible = !!s;
    v.puffs.forEach(m => { m.visible = false; });
    if (!s) return;
    const yaw = (s.yaw ?? 0) * Math.PI / 180;
    v.g.position.set(s.at[0], E.groundAt(s.at[0], s.at[1]), s.at[1]); v.g.rotation.set(0, yaw, 0);
    const out = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));             // the broken end's direction (local +x)
    const base = v.g.position.clone().add(new THREE.Vector3(0, 0.35, 0));
    const life = s.life ?? 4.2, H = s.h ?? 7, size = s.size ?? 1, n = v.puffs.length, wind = s.wind ?? [0.5, 0];
    v.puffs.forEach((m, i) => {
      const age = ((t + v.seed + i * life / n) % life + life) % life, k = age / life;
      const jet = Math.min(1, age / 0.5);                                         // a short jet out of the end, then it rises
      m.visible = true;
      const ph = i * 2.39;
      m.position.copy(base).addScaledVector(out, 0.4 + 1.6 * jet + Math.sin(ph) * 0.2)
        .add(new THREE.Vector3(wind[0] * age + Math.sin(age * 1.3 + ph) * 0.35 * k, H * Math.pow(k, 0.8), wind[1] * age + Math.cos(age * 1.1 + ph) * 0.35 * k));
      const R = size * (0.35 + 1.7 * Math.pow(k, 0.7));
      m.scale.set(R, R * 1.15, R);
      m.material.uniforms.uOpacity.value = (s.opacity ?? 0.6) * Math.min(1, age / 0.25) * Math.pow(1 - k, 1.4);
    });
  });
}
// shade: {edge: z on the ground where the shadow's leading edge lies (animatable), height, width, x}
//   the first ship's shadow before the ship is seen (8.6): an invisible curtain far up-sun that only casts a shadow;
//   it is placed so that the key light's shadow of its top edge falls on the ground at z = edge.
function buildShade(E, W) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  m.castShadow = true; m.receiveShadow = false; m.visible = false; m.frustumCulled = false; W.add(m);
  return m;
}
function updateShade(E, sh, m) {
  m.visible = !!sh;
  if (!sh) return;
  const d = E.key.userData.dir ?? new THREE.Vector3(0, 0.06, -1);
  const h = sh.height ?? 40, w = sh.width ?? 1600;
  // the top edge at y = h, z = zc throws its shadow to z = zc + h * (-d.z) / d.y
  const zc = (sh.edge ?? 0) - h * (-d.z) / Math.max(d.y, 1e-3);
  m.scale.set(w, h, 4); m.position.set(sh.x ?? 0, h / 2, zc);
}
// bannerBlend on the standard-bearer: {from: 'upright'|'raised'|'lowered'|'shoulder', to, k 0..1} moves the pole
//   smoothly between two of figures.js's banner modes (8.2 he lifts it; 8.3 he lowers it to the diagonal) and keeps
//   both hands on it (the same two-bone IK as figures.js).
const BANNER_MODES = {
  shoulder: { pos: [-0.17, 0.75, 0.32], rot: [-0.55, 0, 0.12], grip: 0.45, gripL: null },
  upright: { pos: [-0.34, 0.02 / 1.75, 0.1], rot: [0, 0, 0], grip: 1.15, gripL: null },
  raised: { pos: [-0.22, 0.62, 0.24], rot: [0, 0, 0], grip: 0.55, gripL: 0.42 },
  lowered: { pos: [-0.2, 0.95, 0.25], rot: [1.05, 0, 0], grip: 0.12, gripL: 0.35 },
};
function ik(f, side, T) {
  const V3 = THREE.Vector3, Q = THREE.Quaternion;
  const sh = f.j['shoulder' + side], el = f.j['elbow' + side];
  f.root.updateMatrixWorld(true);
  const S = sh.getWorldPosition(new V3()), L1 = f.dims.upper, L2 = f.dims.fore;
  const toT = T.clone().sub(S); let d = toT.length(); const dir = toT.clone().normalize();
  d = Math.min(Math.max(d, Math.abs(L1 - L2) + 1e-3), L1 + L2 - 1e-4);
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
  const P = new V3(side === 'R' ? -0.6 : 0.6, -1, -0.5).applyQuaternion(f.root.getWorldQuaternion(new Q())).normalize();
  const ortho = P.sub(dir.clone().multiplyScalar(P.dot(dir))); if (ortho.lengthSq() < 1e-6) ortho.set(0, -1, 0); ortho.normalize();
  const Ew = S.clone().addScaledVector(dir, a).addScaledVector(ortho, hh);
  const aim = (j, target) => { j.parent.updateMatrixWorld(true); const jp = j.getWorldPosition(new V3()); const v = target.clone().sub(jp);
    if (v.lengthSq() < 1e-8) return; v.normalize().applyQuaternion(j.parent.getWorldQuaternion(new Q()).invert()); j.quaternion.setFromUnitVectors(new V3(0, -1, 0), v); j.updateMatrixWorld(true); };
  aim(sh, Ew); aim(el, T);
}
function blendBanner(E, R) {
  const spec = R.figures?.bearer, bb = spec?.bannerBlend;
  const f = E.figures.get('bearer');
  if (!bb || !f || !f.props.banner) return;
  const A = BANNER_MODES[bb.from ?? 'raised'], B = BANNER_MODES[bb.to ?? 'lowered'], k = Math.min(1, Math.max(0, bb.k ?? 0));
  const s = f.s, L = (i) => A.pos[i] + (B.pos[i] - A.pos[i]) * k, Rr = (i) => A.rot[i] + (B.rot[i] - A.rot[i]) * k;
  const bg = f.props.banner;
  bg.position.set(L(0) * s, L(1) * s, L(2) * s); bg.rotation.set(Rr(0), Rr(1), Rr(2));
  const grip = (A.grip + (B.grip - A.grip) * k) * s;
  const gA = A.gripL ?? A.grip + 0.42, gB = B.gripL ?? B.grip + 0.42, gripL = grip + (gA + (gB - gA) * k) * s;
  f.root.updateMatrixWorld(true);
  ik(f, 'R', bg.localToWorld(new THREE.Vector3(0, grip, 0)));
  ik(f, 'L', bg.localToWorld(new THREE.Vector3(0, gripL, 0)));
  f.root.updateMatrixWorld(true);
}

export function updateRuins(E, R, t, ctx) {
  // ruinShadows: false lets the low sun reach the forecourt over the ruin line (8.6: the army sunlit before the
  // ship's shadow arrives); default true (unchanged)
  if (ctx.ruinLine) { const rs = R.ruinShadows ?? true; ctx.ruinLine.forEach(m => { m.castShadow = rs; }); }
  if (ctx.vents) updateVents(E, R.vents, t)(ctx.vents);
  if (ctx.shade) updateShade(E, R.shade, ctx.shade);
  if (ctx.veils) ctx.veils.update(E, R.veils, t);
  if (ctx.bars8) ctx.bars8.update(E, R.lightBars);
  poseArch(ctx.arch, { lantern: 'smashed', ...(R.arch ?? {}) }, t);
  const st = R.steam ?? 1;
  for (const s of ctx.steam) {
    const y = 8 + s.k * 9 + ((t * 3 + s.ph) % 9);
    s.m.visible = st > 0;
    s.m.position.set(s.x + Math.sin(t * 0.7 + s.ph + s.k) * 1.5 + s.k * 1.2, y, s.z);
    s.m.scale.set(3 + s.k * 1.6, 7 + s.k * 2, 3 + s.k * 1.6);
    s.m.material.uniforms.uOpacity.value = 0.55 * st * (1 - s.k / 5);
  }
  // the battery can stand where the shot needs it (same as the city: battery = {at, spacing, face})
  const bt = R.battery;
  ctx.guns.forEach((g, i) => {
    const home = L.battery[i];
    const at = bt?.at ? [bt.at[0] + (i - 1) * (bt.spacing?.[0] ?? 15), bt.at[1] + (i - 1) * (bt.spacing?.[1] ?? -4)] : home;
    const face = bt?.face ?? [0, L.crown.z];
    g.g.position.set(at[0], 0, at[1]); g.g.rotation.y = Math.atan2(face[0] - at[0], face[1] - at[1]);
    g.barrel.rotation.x = -(R.gunElev ?? 0.15);
  });
}
export function ruinsBeforeRender(E, R, t, ctx) {
  for (const s of ctx.steam) { s.m.material.uniforms.fogColor.value.copy(E.scene.fog.color); s.m.material.uniforms.fogDensity.value = E.scene.fog.density; }
  if (ctx.vents) for (const v of ctx.vents) if (v.g.visible) for (const m of v.puffs) { m.material.uniforms.fogColor.value.copy(E.scene.fog.color); m.material.uniforms.fogDensity.value = E.scene.fog.density; }
  if (ctx.veils) ctx.veils.beforeRender(E);
  blendBanner(E, R);
}
export const ARMY_PLAIN = { from: [-140, 330], to: [150, 330], rows: 3, spacing: 1.5, rowGap: 2.2, facing: 180, poles: 0.13 };

const PRESETS = {
  // bible p.8 key 8: a flat ruined skyline under an empty sky, a low sun; the army a band of small silhouettes with
  // bound, near-black banners; one pole lowered (the standard-bearer's)
  ruins: {
    t: 3,
    state: {
      battery: { at: [-130, -30], spacing: [8, -6] },
      army: { from: [-110, -52], to: [110, -52], rows: 3, spacing: 1.5, rowGap: 2.2, facing: 0, poles: 0.13, bannersOpen: 0 },
      figures: { bearer: { pos: [40, -50.5], face: 20, banner: 'lowered' }, s1: { kind: 'soldier', pos: [-22, -49], face: 160, pose: 'sit' } },
    },
    cam: { pos: [-20, 1.7, -14], target: [-20, 9.5, -400], f: 32 },
  },
};

export default {
  look: 'sunrise',
  marks: { arch: [L.arch.x, 0, L.arch.z], underArch: [L.arch.x, 0, L.arch.z + 0.2], gate: [0, 0, 0], towerW: [L.towers[0].x, 0, 0], towerE: [L.towers[1].x, 0, 0] },
  build(E, o = {}) { const ctx = buildRuins(E, o); ctx.presets = PRESETS; return ctx; },
  update: updateRuins,
  beforeRender: ruinsBeforeRender,
};
