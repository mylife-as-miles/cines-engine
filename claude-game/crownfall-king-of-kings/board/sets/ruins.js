// SCENES 8 and 10. EXT. FORECOURT - THE RUINS - SUNRISE (bible p.8 key 8; shots 8.1-8.6, and the ground of 9-10).
// The same layout after the fall: the gate towers broken to stumps, the outer wall low, the gatehouse roofless, the
// forecourt in rubble, the arch still standing (its right pier can break: arch.broken), the lantern smashed, the
// lower stair broken, and where the upper city stood a flat, jagged ruin line under an empty sky. Steam from broken
// pipes rises from the ruins. The first direct sun in the film, low behind the ruins (look 'sunrise').
import * as THREE from 'three';
import { L, buildPlain, buildCauseway, buildWallAndGate, buildGatehouse, buildForecourt, buildBattery, buildArch, poseArch,
  buildStair, buildInnerWall, buildZiggurat, buildCannon } from './solforiz.js';
import { puffMaterial } from './fall.js';

const T = L.tiers;
function buildRuinLine(E, W) {
  // the flat ruined skyline: tilted slabs and broken blocks over the ziggurat's footprint, low (6-38 m)
  const b = new E.Batch('ruin-line');
  const stone = E.mat('#3a3631', { rough: 0.95 }), dark = E.mat('#2c2925', { rough: 0.95 });
  const r = E.rng(909);
  for (let i = 0; i < 520; i++) {
    const z = -100 - r() * 640, x = (r() - 0.5) * (660 - (Math.abs(z + 100) / 640) * 300);
    const h = 2 + r() * (z < -300 ? 15 : (z < -200 ? 8 : 3.5)), w = 8 + r() * 26, d = 6 + r() * 22;
    const tilt = (r() - 0.5) * 0.9;
    b.box(w, h, d, r() < 0.5 ? stone : dark, x, h * 0.35, z, (r() - 0.5) * 0.5, r() * 3, tilt);
  }
  // a few standing fragments: a broken tier face, stumps of towers (jagged teeth on the skyline)
  for (let i = 0; i < 14; i++) { const x = (r() - 0.5) * 520, z = -160 - r() * 520, h = 10 + r() * 14; b.box(2 + r() * 5, h, 2 + r() * 5, dark, x, h / 2, z, 0, r(), (r() - 0.5) * 0.5); }
  b.build(W).forEach(m => { m.userData.ground = true; });
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
  buildRuinLine(E, W);
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
  return ctx;
}
export function updateRuins(E, R, t, ctx) {
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
