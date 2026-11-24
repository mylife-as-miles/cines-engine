// SCENE 6 (THE CROWN) and the guns in the high arcades: a close set at the summit (bible p.7; shots 6.1, 6.2, 6.9).
// The whole city is built (shared layout) and the summit gets its mechanism: the shutter housing with drive drums,
// chains down to each of the six plates, counterweights in the side rails, brass pipework, and a Solforiz gun crew
// at the arcade guns on tier 5. State: crown.shutter (0..6 plates down; 5.72 = the last one stalled), crown.fire,
// crown.through (fire through the plates), crown.towers [deg lean x4], crown.towerFall (0..1, tower 0 over the wall).
import * as THREE from 'three';
import { buildCity, updateCity, cityBeforeRender, CITY_MARKS } from './city.js';
import { L, crownFront, makePoints } from './solforiz.js';
import { chain } from './foundry.js';

const O = L.crown.opening, fz = crownFront();
const T5 = L.tiers[5], T4 = L.tiers[4];
function buildMechanism(E, W) {
  const b = new E.Batch('crown-mech');
  const iron = E.mat('#2a2e33', { rough: 0.6, metal: 0.5, rim: true }), brass = E.mat('#6a5530', { rough: 0.45, metal: 0.7, rim: true });
  const top = O.y + O.h + 22;
  // drive drums along the housing, one per plate, and the gearing at each end
  for (let i = 0; i < 6; i++) { const x = -O.w / 2 + 6 + i * (O.w - 12) / 5; const g = new THREE.CylinderGeometry(2.2, 2.2, 3.4, 16); g.rotateZ(Math.PI / 2); b.add(g, iron, E.M4(x, top + 3.2, fz + 3.4)); }
  for (const sx of [-1, 1]) { const g = new THREE.CylinderGeometry(5, 5, 1.4, 24); g.rotateZ(Math.PI / 2); b.add(g, brass, E.M4(sx * (O.w / 2 + 6), top + 2, fz + 3.4)); }
  // counterweights hanging in the side rails
  for (const sx of [-1, 1]) b.box(4.5, 9, 4.5, iron, sx * (O.w / 2 + 6.5), O.y + 10, fz + 4.5);
  // brass pipework across the face
  for (let i = 0; i < 4; i++) b.cyl(0.9, 0.9, 2 * L.crown.hw, brass, 0, O.y - 4 - i * 2.4, fz + 1.3, 10, 0, 0, Math.PI / 2);
  b.build(W);
  const ch = new E.Batch('crown-chains');
  for (let i = 0; i < 6; i++) { const x = -O.w / 2 + 6 + i * (O.w - 12) / 5; chain(E, ch, [x, top + 1, fz + 2.4], [x, O.y + O.h - 1, fz + 2.4], 1.3, iron); }
  ch.build(W);
}
// the Crown's gallery: a short iron balcony at the west end of the opening, at the sill, where the Solforiz gunners
// stand against the fire (6.1, 6.2); it stops short of the middle so the stalled slit stays in view from below
const CG = { y: O.y - 0.1, z0: fz + 2.3, z1: fz + 4.9, x0: -38, x1: -24 };
function buildCrownGallery(E, W) {
  const b = new E.Batch('crown-gallery');
  const iron = E.mat('#262b30', { rough: 0.6, metal: 0.5, rim: true });
  b.box(CG.x1 - CG.x0, 0.4, CG.z1 - CG.z0, iron, (CG.x0 + CG.x1) / 2, CG.y - 0.2, (CG.z0 + CG.z1) / 2);
  for (const x of [CG.x0 + 0.5, (CG.x0 + CG.x1) / 2, CG.x1 - 0.5]) b.box(0.4, 3.2, 0.4, iron, x, CG.y - 1.9, CG.z1 - 0.6);   // brackets
  b.box(CG.x1 - CG.x0, 0.12, 0.12, iron, (CG.x0 + CG.x1) / 2, CG.y + 1.05, CG.z1 - 0.1);                         // rail
  for (let x = CG.x0 + 0.5; x <= CG.x1; x += 2.6) b.box(0.1, 1.05, 0.1, iron, x, CG.y + 0.52, CG.z1 - 0.1);
  b.build(W).forEach(m => { m.userData.ground = true; });
}
function buildArcadeCrew(E, W) {
  // a gun platform in front of one arcade bay, west of the stair: the gun, shot racks, a powder chest
  const x0 = -90, y = T4.top, z = T5.front + 1;
  const b = new E.Batch('arcade-crew');
  const stone = E.mat('#2b343c'), iron = E.mat('#15181b', { rough: 0.6, metal: 0.5, rim: true }), wood = E.mat('#3a2e22', { rim: true });
  b.box(16, 0.6, 14, stone, x0, y + 0.3, z + 6);
  const g = new THREE.CylinderGeometry(0.45, 0.7, 7.5, 12); g.rotateX(Math.PI / 2); g.translate(0, 0, 3.4);
  b.add(g, iron, E.M4(x0, y + 2.3, z + 4, -0.18, 0, 0));
  b.box(2.2, 1.0, 3.6, wood, x0, y + 1.1, z + 3.6);
  for (const sx of [-1, 1]) { const w = new THREE.CylinderGeometry(1.0, 1.0, 0.25, 16); w.rotateZ(Math.PI / 2); b.add(w, wood, E.M4(x0 + sx * 1.3, y + 1.0, z + 3.4)); }
  for (let i = 0; i < 6; i++) b.add(new THREE.SphereGeometry(0.3, 8, 6), iron, E.M4(x0 - 5 + (i % 3) * 0.65, y + 0.9 + Math.floor(i / 3) * 0.55, z + 2));
  b.box(1.6, 0.9, 1.0, wood, x0 + 5, y + 1.05, z + 2.5);
  b.build(W).forEach(m => { m.userData.ground = true; });
  return { x0, y: y + 0.6, z };
}

// the gun gallery along the arcade bays west of the stair (2.4): a stone sill at the foot of the openings, the crews
// stand on it in front of the bays; state.arcadeGlow (0..1) lights the bays from inside (amber lamps), default off
const GAL = { y: T4.top + 6, z0: T5.front + 1.8, z1: T5.front + 6.5, x0: -134, x1: -46 };
function buildGallery(E, W) {
  const b = new E.Batch('arcade-gallery');
  const stone = E.mat('#2b343c', { rough: 0.95 }), dark = E.mat('#161b20');
  b.box(GAL.x1 - GAL.x0, 0.7, GAL.z1 - GAL.z0, stone, (GAL.x0 + GAL.x1) / 2, GAL.y - 0.35, (GAL.z0 + GAL.z1) / 2);
  for (let x = GAL.x0 + 2; x < GAL.x1; x += 6) b.box(1.0, 3.4, 1.2, dark, x, GAL.y - 2.4, GAL.z1 - 0.8);   // corbels
  b.build(W).forEach(m => { m.userData.ground = true; });
  // state.arcadeGlow (0..1): the bays read as an open arcade, pre-dawn sky seen through each round-topped opening
  // (pale at the sill, slate at the crown) with two amber lamps inside; the crews stand against it (2.4)
  const archShape = new THREE.Shape();                   // a round-topped opening, 6 m wide, 9.2 m to the crown
  archShape.moveTo(-3, 0); archShape.lineTo(3, 0); archShape.lineTo(3, 6.2); archShape.absarc(0, 6.2, 3, 0, Math.PI, false); archShape.lineTo(-3, 0);
  const archG = new THREE.ShapeGeometry(archShape, 12);
  const lo = new THREE.Color('#8D9797').convertSRGBToLinear(), hi = new THREE.Color('#374651').convertSRGBToLinear();
  const pos = archG.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const c = lo.clone().lerp(hi, Math.min(1, pos.getY(i) / 9.2)); col.set([c.r, c.g, c.b], i * 3); }
  archG.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const glowM = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true, toneMapped: true });
  glowM.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, E.U); };
  const glows = [], lampPos = [];
  for (const x of [-126, -108, -90, -72, -54]) {
    const m = new THREE.Mesh(archG, glowM); m.position.set(x, T4.top + 6 + 0.05, T5.front + 1.85); m.visible = false; W.add(m); glows.push(m);
    lampPos.push([x - 2.2, T4.top + 6 + 3.4, T5.front + 2.0], [x + 2.2, T4.top + 6 + 3.4, T5.front + 2.0]);
  }
  return { glows, glowM, lampPos };
}
const crew = { x0: -90, y: T4.top + 0.6, z: T5.front + 1 };
const PRESETS = {
  // 6.1-6.2: the works take the salvo; the last shutter stalls; the air warps at its edge (long lens, from the forecourt)
  shutter: {
    t: 1,
    state: {
      look: 'burning', truce: 'gone', lamps: { level: 1, breathe: 0.5 },
      crown: { shutter: 5.85, fire: 1, through: 0 },
      warp: [{ at: [0, O.y + 0.5, fz + 2], r: 20, amp: 0.7 }],
    },
    cam: { pos: [30, 1.7, -24], target: [0, O.y + 8, fz], f: 135 },
  },
  // the battery in the high arcades: a Solforiz gun crew at its gun, looking down over the forecourt to the gate
  arcade: {
    t: 0.5,
    state: {
      look: { base: 'breakCrown', exposure: 2.2, fill: { intensity: 1.4 } }, truce: 'lit', lamps: { level: 1, breathe: 0.4 },
      salvos: [{ side: 'arcade', t: 0.45, guns: 3, spread: 0.2, flight: 3, to: 'lines' }],
      figures: {
        g1: { kind: 'solgunner', pos: [crew.x0 - 1.8, crew.y, crew.z + 6.5], face: 0, pose: 'stand', reachR: [crew.x0 - 0.6, crew.y + 1.3, crew.z + 5.5] },
        g2: { kind: 'solgunner', pos: [crew.x0 + 2.4, crew.y, crew.z + 5.2], face: 300, pose: 'crouch' },
        g3: { kind: 'solgunner', pos: [crew.x0 - 4.6, crew.y, crew.z + 3.4], face: 90, pose: 'stand', aimR: [crew.x0, crew.y + 2, crew.z + 40], handR: 1 },
      },
    },
    cam: { pos: [crew.x0 + 15, crew.y + 1.7, crew.z + 9], target: [crew.x0 - 12, crew.y + 1.0, crew.z + 4], f: 28 },
  },
};

export default {
  look: 'burning',
  marks: { ...CITY_MARKS, shutterSlit: [0, O.y + 0.8, fz + 2], arcadeGun: [crew.x0, crew.y + 1.7, crew.z + 4], arcadeCrew: [crew.x0, crew.y, crew.z + 6],
    gallery: [-90, GAL.y, (GAL.z0 + GAL.z1) / 2], crownGallery: [0, CG.y, (CG.z0 + CG.z1) / 2] },
  build(E, o = {}) {
    const ctx = buildCity(E, o);
    buildMechanism(E, ctx.upper);                       // in the capital's group, so state.far carries it
    buildArcadeCrew(E, ctx.upper);
    buildCrownGallery(E, ctx.upper);
    ctx.gallery = buildGallery(E, ctx.upper);
    ctx.gallery.lamps = makePoints(E, ctx.upper, ctx.gallery.lampPos, { color: '#E08A3A', px: 3, nearPx: 6, ref: 400, vary: 0.2 });
    const up = (p) => () => ctx.upper.localToWorld(new THREE.Vector3(...p));
    Object.assign(ctx.dyn, { arcadeGun: up([crew.x0, crew.y + 1.7, crew.z + 4]), arcadeCrew: up([crew.x0, crew.y, crew.z + 6]) });
    ctx.presets = PRESETS;
    return ctx;
  },
  update(E, R, t, ctx) {
    updateCity(E, R, t, ctx);
    // tower 0's fall, turned (crown.towerFallYaw, degrees from +z toward +x) and carried past the horizontal
    // (crown.towerFallMax, default 88) so it topples across the retaining wall in profile from the forecourt (6.9)
    const cr = R.crown ?? {};
    if (cr.towerFallYaw !== undefined) {
      const tw = ctx.crown.towers[0], f = cr.towerFall ?? 0, lean0 = cr.towers?.[0] ?? 0;
      tw.piv.rotation.order = 'YXZ';
      tw.piv.rotation.set((lean0 + f * (cr.towerFallMax ?? 88)) * Math.PI / 180, cr.towerFallYaw * Math.PI / 180, 0);
    }
    const gl = R.arcadeGlow ?? 0;
    ctx.gallery.glows.forEach(m => { m.visible = gl > 0; });
    ctx.gallery.glowM.color.setScalar(gl);
    ctx.gallery.lamps.pts.visible = gl > 0; ctx.gallery.lamps.u.uLevel.value = 1.6 * gl;
  },
  beforeRender(E, R, t, ctx) {
    cityBeforeRender(E, R, t, ctx);
    const P = ctx.gallery.lamps; P.u.fogColor.value.copy(E.scene.fog.color); P.u.fogDensity.value = E.scene.fog.density;
  },
};
