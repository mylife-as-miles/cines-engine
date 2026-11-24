// SCENE 3. EXT. GATE FORECOURT - FOOT OF THE GREAT STAIR - CONTINUOUS (bible p.6 key 3, "The held stone"; shots 3.1-3.9)
// Also used for scene 7's arch moments (the smashed lantern) before the fall. The whole city is built (shared layout);
// this set's own things are the block, the arch with its mirrored storm lantern, and the stair foot.
// Marks (metres): stair foot [54, 0, -84] (the lower flight climbs WEST to [30, 12, -84]); the block hangs over the foot
// at [52.4, 5.4, -85.4]; Liora under it [52.4, 0, -85]; Cael ten paces off [60.2, 0, -83.8]; the arch [70, 0, -76]
// (opening faces +z, toward the gatehouse and the truce lamp); the gatehouse breach [28, 3.5, -18].
import * as THREE from 'three';
import { buildCity, updateCity, cityBeforeRender, CITY_MARKS } from './city.js';
import { L } from './solforiz.js';
import { makeVeils, makeImpacts } from './fx.js';

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

// the gallery after the shell (gallery.broken): where the block tore out of its front edge, a dark socket in the
// parapet, broken stones hanging from the slab's lip and a sheared, sagging corner (key p.6: "the broken overhang")
function buildBrokenGallery(E) {
  const g = new THREE.Group(); E.world.add(g); g.visible = false;
  const b = new E.Batch('gallery-broken');
  const stone = E.mat('#2f3439', { rough: 0.95 }), dark = E.mat('#151618', { rough: 0.95 });
  const r = E.rng(3131);
  b.box(3.4, 1.05, 0.25, dark, 55.0, 7.85, -82.55);                       // the socket the block came out of
  b.box(3.0, 0.5, 2.6, dark, 55.0, 6.45, -84.0);                          // its scar on the underside
  for (let i = 0; i < 9; i++) {                                           // teeth along the torn lip
    const x = 52.6 + i * 0.55 + r() * 0.3, h = 0.35 + r() * 0.9, w = 0.35 + r() * 0.6;
    b.box(w, h, 0.5 + r() * 0.7, i % 3 ? stone : dark, x, 6.6 - h / 2 + 0.1, -82.9 - r() * 0.6, (r() - 0.5) * 0.4, r(), (r() - 0.5) * 0.5);
  }
  b.box(2.2, 0.9, 5.2, stone, 57.6, 6.75, -85.6, 0.05, 0.08, -0.42);       // the sheared east corner, sagging
  b.box(1.4, 0.7, 1.6, stone, 58.3, 6.0, -83.6, 0.3, 0.6, -0.7);
  for (let i = 0; i < 6; i++) b.box(0.3 + r() * 0.5, 0.2 + r() * 0.3, 0.3 + r() * 0.5, stone, 53 + r() * 4, 8.45, -82.9 - r() * 0.4, r(), r() * 3, r());
  b.build(g);
  return g;
}

// Forecourt-only additions (all off unless a shot asks): veils (dust curtains), the shell burst and spray, dust
// bursts (the block landing), and the signal lantern: a small warm point (shot list 3.1: "dimmer than the truce
// lamp"), which can hang lower on its chain (lanternDrop, metres) so a low camera keeps it under the arch's crown.
export default {
  look: 'heldStone',
  marks: { ...CITY_MARKS, liora: [...lioraAt], cael: [...caelAt] },
  build(E, o = {}) {
    const ctx = buildCity(E, o); ctx.presets = PRESETS;
    ctx.veils = makeVeils(E, E.world, 8);
    ctx.fx = makeImpacts(E, E.world, { lit: '#b9bbb6', shade: '#6c7074' });
    ctx.arch.flame.material = E.lampMat('#E9A35E', 3.2);
    ctx.lanternHome = ctx.arch.lantern.position.y;
    ctx.breakEdge = buildBrokenGallery(E);
    return ctx;
  },
  update(E, R, t, ctx) {
    updateCity(E, R, t, ctx);
    ctx.veils.update(E, R.veils, t);
    ctx.fx.update(E, R, t);
    ctx.arch.lantern.position.y = ctx.lanternHome - (R.lanternDrop ?? 0);
    ctx.breakEdge.visible = !!R.gallery?.broken;
  },
  beforeRender(E, R, t, ctx) { cityBeforeRender(E, R, t, ctx); ctx.veils.beforeRender(E); ctx.fx.beforeRender(E); },
};
