// SCENE 3. EXT. GATE FORECOURT - FOOT OF THE GREAT STAIR - CONTINUOUS (bible p.6 key 3, "The held stone"; shots 3.1-3.9)
// Also used for scene 7's arch moments (the smashed lantern) before the fall. The whole city is built (shared layout);
// this set's own things are the block, the arch with its mirrored storm lantern, and the stair foot.
// Marks (metres): stair foot [54, 0, -84] (the lower flight climbs WEST to [30, 12, -84]); the block hangs over the foot
// at [52.4, 5.4, -85.4]; Liora under it [52.4, 0, -85]; Cael ten paces off [60.2, 0, -83.8]; the arch [70, 0, -76]
// (opening faces +z, toward the gatehouse and the truce lamp); the gatehouse breach [28, 3.5, -18].
import { buildCity, updateCity, cityBeforeRender, CITY_MARKS } from './city.js';
import { L } from './solforiz.js';

const B = L.block, A = L.arch;
const lioraAt = [B.x + 0.1, B.z + 0.4], caelAt = [B.x + 7.8, B.z + 1.6];
const PRESETS = {
  // bible p.6 key 3: Liora low under the stopped block, dust falling past it, Cael ten paces off with his hand open
  heldStone: {
    state: {
      block: { y: B.y, rot: [6, 18, -5] },
      dust: { center: [B.x, 6, B.z + 1], size: [9, 12, 8] },
      warp: [{ at: [B.x, B.y, B.z], r: 2.2, amp: 0.5 }],
      figures: {
        liora: { pos: lioraAt, face: 160, pose: 'cower' },
        boy: { pos: [B.x - 1.1, B.z + 0.9], face: 140, pose: 'stand', reachR: 'liora.waist' },
        cael: { pos: caelAt, face: [B.x, B.z], pose: 'stand', aimR: [B.x, B.y, B.z], palmR: 'out', handR: 1, shake: 0.3, blood: 0 },
      },
    },
    cam: { pos: [B.x + 0.2, 1.05, B.z + 26], target: [B.x + 1.6, 4.6, B.z], f: 32 },
  },
  // 3.4 the open hand, "it saves" (bible p.13): the same insert as 6.3, 10.3 and 10.10
  hand34: {
    state: {
      block: { y: B.y, rot: [6, 18, -5] }, dust: { center: [B.x, 6, B.z + 1], size: [9, 12, 8] },
      figures: { cael: { pos: caelAt, face: [B.x, B.z], aimR: [B.x, B.y, B.z], palmR: 'out', handR: 1 }, liora: { pos: lioraAt, face: 160, pose: 'cower' } },
      hand: { attach: 'cael', side: 'R', style: 'cael', open: 1, shake: 0.25 },
    },
    cam: { hand: true, f: 50 },
  },
  // 3.5 the wrist, in shallow focus, from Liora's eye level (the only time Cael is seen from below)
  wrist35: {
    state: {
      block: { y: B.y, rot: [6, 18, -5] }, dust: { center: [B.x, 3, B.z + 1], size: [6, 6, 6] },
      figures: {
        liora: { pos: lioraAt, face: 120, pose: 'cower', joints: { shoulderL: [70, 0, 30], elbowL: [10, 0, 0] } },
        cael: { pos: [B.x + 1.0, B.z + 0.85], face: [B.x, B.z], pose: 'crouch', reachR: 'liora.wristL', aimL: [B.x, B.y, B.z], palmL: 'out', handL: 1, handR: 0.15 },
      },
    },
    cam: { pos: [B.x - 0.75, 0.62, B.z + 1.1], target: 'liora.wristL', f: 50, dof: { focus: 'liora.wristL', fstop: 2 } },
  },
};

export default {
  look: 'heldStone',
  marks: { ...CITY_MARKS, liora: [...lioraAt], cael: [...caelAt] },
  build(E, o = {}) { const ctx = buildCity(E, o); ctx.presets = PRESETS; return ctx; },
  update(E, R, t, ctx) { updateCity(E, R, t, ctx); },
  beforeRender: cityBeforeRender,
};
