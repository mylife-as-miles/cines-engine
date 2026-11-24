// SCENE 6 (THE CROWN) and the guns in the high arcades: a close set at the summit (bible p.7; shots 6.1, 6.2, 6.9).
// The whole city is built (shared layout) and the summit gets its mechanism: the shutter housing with drive drums,
// chains down to each of the six plates, counterweights in the side rails, brass pipework, and a Solforiz gun crew
// at the arcade guns on tier 5. State: crown.shutter (0..6 plates down; 5.72 = the last one stalled), crown.fire,
// crown.through (fire through the plates), crown.towers [deg lean x4], crown.towerFall (0..1, tower 0 over the wall).
import * as THREE from 'three';
import { buildCity, updateCity, cityBeforeRender, CITY_MARKS } from './city.js';
import { L, crownFront } from './solforiz.js';
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
  marks: { ...CITY_MARKS, shutterSlit: [0, O.y + 0.8, fz + 2], arcadeGun: [crew.x0, crew.y + 1.7, crew.z + 4], arcadeCrew: [crew.x0, crew.y, crew.z + 6] },
  build(E, o = {}) {
    const ctx = buildCity(E, o);
    buildMechanism(E, E.world);
    buildArcadeCrew(E, E.world);
    ctx.presets = PRESETS;
    return ctx;
  },
  update(E, R, t, ctx) { updateCity(E, R, t, ctx); },
  beforeRender: cityBeforeRender,
};
