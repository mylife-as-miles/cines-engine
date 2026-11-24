// SCENE 3. EXT. GATE FORECOURT - FOOT OF THE GREAT STAIR - CONTINUOUS (bible p.6 key 3, "The held stone"; shots 3.1-3.9)
// Also used for scene 7's arch moments (the smashed lantern) before the fall. The whole city is built (shared layout);
// this set's own things are the block, the arch with its mirrored storm lantern, and the stair foot.
// Marks (metres): stair foot [54, 0, -84] (the lower flight climbs WEST to [30, 12, -84]); the block hangs over the foot
// at [52.4, 5.4, -85.4]; Liora under it [52.4, 0, -85]; Cael ten paces off [60.2, 0, -83.8]; the arch [70, 0, -76]
// (opening faces +z, toward the gatehouse and the truce lamp); the gatehouse breach [28, 3.5, -18].
import { buildCity, updateCity, cityBeforeRender, CITY_MARKS } from './city.js';
import { L } from './solforiz.js';

const B = L.block, A = L.arch;
const lioraAt = [B.x + 0.1, B.z + 0.4], caelAt = [B.x + 7.1, B.z + 5.9];
const PRESETS = {
  // bible p.6 key 3: Liora low under the stopped block, dust falling past it, Cael ten paces off with his hand open
  heldStone: {
    state: {
      block: { y: B.y, rot: [6, 18, -5] },
      dust: { center: [B.x + 0.5, 4, B.z + 1.5], size: [8, 8, 6], count: 420, opacity: 0.45 },
      warp: [{ at: [B.x, B.y, B.z], r: 2.2, amp: 0.5 }],
      figures: {
        liora: { pos: lioraAt, face: 160, pose: 'cower' },
        boy: { pos: [B.x - 0.9, B.z + 0.8], face: 140, pose: 'stand' },
        cael: { pos: caelAt, face: [B.x, B.z], pose: 'stand', aimR: [B.x, B.y, B.z], palmR: 'out', handR: 1, shake: 0.3, blood: 0 },
      },
    },
    cam: { pos: [B.x + 2.6, 0.95, B.z + 20.4], target: [B.x + 2.6, 3.45, B.z], f: 24 },
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
      block: { y: B.y, rot: [6, 18, -5] }, dust: { center: [B.x, 3, B.z + 1], size: [6, 6, 6], count: 300 },
      figures: {
        liora: { pos: lioraAt, face: 90, pose: 'crouch', joints: { shoulderL: [-20, 0, 0], elbowL: [30, 0, 0] }, look: 'cael.head' },
        cael: { pos: [B.x + 1.15, B.z + 0.55], face: -90, pose: 'crouch', lean: 10, reachR: 'liora.wristL', aimL: [B.x, B.y, B.z], palmL: 'out', handL: 1, look: 'liora.head' },
      },
      hand: { attach: 'cael', side: 'R', style: 'cael', open: 0.35, hideFigure: false },
    },
    cam: { pos: [B.x - 0.25, 1.45, B.z - 1.45], target: 'liora.wristL', f: 50, dof: { focus: 'liora.wristL', fstop: 2.2 } },
  },
};

export default {
  look: 'heldStone',
  marks: { ...CITY_MARKS, liora: [...lioraAt], cael: [...caelAt] },
  build(E, o = {}) { const ctx = buildCity(E, o); ctx.presets = PRESETS; return ctx; },
  update(E, R, t, ctx) { updateCity(E, R, t, ctx); },
  beforeRender: cityBeforeRender,
};
