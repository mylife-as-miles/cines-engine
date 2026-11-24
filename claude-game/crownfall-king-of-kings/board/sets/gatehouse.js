// SCENES 4-6. INT. SHATTERED GATEHOUSE (bible p.6 key 4) / THE BREACH (p.7 key 6, "The open hand"; cover p.1)
// The command post inside the gatehouse (interior x 16..32, z -18..-3, floor y 0, ceiling 8.5). The north wall is
// mostly gone: the breach (x 24.2..31.3, y 0..7.9 at z = -18) looks out on the forecourt, the arch with the boy
// (bearing about 36 deg east of north from the south-west corner), the stair and the city. The whole city is
// instanced through it (same layout), so every through-the-breach shot is real. Lit only from the breach.
// Table: centre [20.4, 0.92, -10.6], 3.4 x 1.25 m, long axis turned 24 deg; seals A/B/C on it (see README).
// Door: west wall, z -10.7..-8.5 (state.door 0..1 swings it). Stretchers come in through it.
//
// Looks registered by this set (bible p.6 key 4 and p.7 key 5, for the room):
//   'gatehouseBreach' (the default here): key 4 as the bible paints it. The breach is a pale, bright shape of the city
//       (high exterior fill, pale fog), the room about two stops under (interior fill cut to a few per cent), Cael a
//       black shape, the envoy's robe the one clean cloth. The engine's 'gatehouse' key is unchanged in looks.js.
//   'gatehouseSlate': scene 5 inside the room, key 5 ("Break the Crown!"): slate sky through the breach, the room darker.
// State keys added here (all off by default, so scene 6 and the presets are unchanged):
//   truceLight 0..1   the truce lamp's white falling through the broken roof onto the north wall and the breach
//                     stones (5.1, 5.2); it goes out with the lamp (truce / truceBurstAt). truceLightAt [x,y,z] re-aims it.
//   doorLight 0..1    the doorway's grey daylight on the floor inside the west door (4.4, 5.4, 5.8); doorLightAt re-aims it
//   breachRubble      fallen wall blocks heaped in the mouth of the breach (scene 5: the barrage brought more down);
//                     its top is a standing place about 1.6 m up at x 27..29, z -18.1 (5.6)
//   terraceFire       {t0, t1, rate, count, seed}: gun flashes rippling along the terrace lips through the breach,
//                     each one white for a frame, then amber (5.5, 5.8)
//   archDark 0..1     darkens the arch's stone so it reads as a dark shape against the pale city (bible key 4)
import * as THREE from 'three';
import { buildCity, updateCity, cityBeforeRender, CITY_MARKS } from './city.js';
import { L, SEALS, TABLE, makePoints } from './solforiz.js';

const sealB = [SEALS[1].x, SEALS[1].y, SEALS[1].z];
const boyUnderArch = [L.arch.x, L.arch.z + 0.1];
const INTERIOR = { min: [15.4, -1, -18.7], max: [32.6, 8.6, -2.4] };

// key 4 as painted (bible p.6): pale city in the breach, charcoal room
const GH_BREACH = {
  palette: ['#0A0A0C', '#424445', '#A3A9A9', '#8A8C88', '#D8CFB8'],
  sky: { zenith: '#8a9194', mid: '#9ca2a2', horizon: '#a9afaf', midAt: 0.15, topAt: 0.6 },
  fog: { color: '#a9afaf', density: 0.0095 },
  haze: { amount: 0.004, base: 0, falloff: 3, color: '#a3a8a8' },
  key: { color: '#c7cdce', intensity: 4, dir: [0.6, 0.5, -1], soft: 4 },
  fill: { sky: '#a3a9a9', ground: '#808280', intensity: 20 },
  interior: { ...INTERIOR, fill: 0.016 },
  exposure: 1, grain: 0.05,
  dust: { mode: 'none' },
};
// key 5 seen from the room (bible p.7 top): slate sky, amber gun-flash; the room darker still
const GH_SLATE = {
  palette: ['#161D26', '#2E3A44', '#5D696E', '#FF8A2E', '#FFF3D0'],
  sky: { zenith: '#1a222c', mid: '#2c3742', horizon: '#56636a', ground: '#161D26', midAt: 0.1, topAt: 0.45 },
  fog: { color: '#4f5c64', density: 0.0019 },
  haze: { amount: 0.0015, base: 0, falloff: 4, color: '#46535b' },
  key: { color: '#8b9aa6', intensity: 2.6, dir: [0.4, 0.45, -1], soft: 4 },
  fill: { sky: '#5d6d79', ground: '#2e3a44', intensity: 6 },
  interior: { ...INTERIOR, fill: 0.04 },
  exposure: 1, grain: 0.05,
  dust: { mode: 'none' },
};

const PRESETS = {
  // bible p.6 key 4: the frame inside the frame. Cael a shape against the dark, the envoy the one clean cloth, the
  // boy small under the arch in the breach (the 4.1 camera).
  gatehouse: {
    state: {
      archDark: 1,
      figures: {
        cael: { pos: [19.45, -9.95], face: [21.4, -11.6], pose: 'stand', lean: 8, reachL: [20.15, 0.99, -10.95] },
        envoy: { pos: [22.6, -14.6], face: [19.45, -9.95], pose: 'stand', look: 'cael.head' },
        boy: { pos: boyUnderArch, face: 200, pose: 'stand' },
      },
      door: 0,
    },
    cam: { pos: [17.9, 1.6, -2.55], target: [23.9, 1.75, -17.4], f: 32 },
  },
  // bible p.7 key 6 (and the cover): Cael in the breach, black against the gun-flash, hand open at the stalled shutter
  openHand: {
    t: 3,
    state: {
      look: 'burning', truce: 'gone', lamps: { level: 0 },
      crown: { shutter: 5.85, fire: 1, through: 0 },
      warp: [{ at: [0, L.crown.opening.y + 1.2, L.crown.z + L.crown.d / 2 + 2], r: 22, amp: 0.6 }],
      figures: { cael: { pos: [29.0, -13.9], face: [0, L.crown.z], pose: 'stand', aimR: [0, L.crown.opening.y + 1, L.crown.z + 32], palmR: 'out', handR: 1, shake: 0.6, blood: 0.7 } },
    },
    cam: { pos: [30.5, 1.05, -11.2], target: [-85.4, 102, -323.6], f: 21 },
  },
  // 6.3 the open hand, "it destroys": the insert, matched to 3.4, 10.3 and 10.10
  hand63: {
    state: {
      look: 'burning', truce: 'gone', lamps: { level: 0 }, crown: { shutter: 5.85, fire: 1 },
      figures: { cael: { pos: [29.0, -14.1], face: [0, L.crown.z], aimR: [0, L.crown.opening.y + 1, L.crown.z + 32], palmR: 'out', handR: 1, shake: 0.6, blood: 0.7 } },
      hand: { attach: 'cael', side: 'R', style: 'cael', open: 1, shake: 0.6, blood: 0.7 },
    },
    cam: { hand: true, f: 50 },
  },
  // 4.7 through the breach: the boy, small under the arch
  breachBoy: {
    state: { figures: { boy: { pos: boyUnderArch, face: 200, pose: 'stand' } } },
    cam: { pos: [23.0, 1.6, -8.0], target: [L.arch.x, 2.4, L.arch.z], f: 85 },
  },
};

// ---------------------------------------------------------------- this set's own pieces
// gun positions along the terrace lips (tiers 1-4), clear of the great stair; seen through the breach
function terraceGunPositions(E) {
  const r = E.rng(404), out = [];
  for (let k = 0; k <= 4; k++) {
    const t = L.tiers[k], n = k === 0 ? 10 : 16 - k * 2;
    for (let i = 0; i < n; i++) {
      let x = (r() * 2 - 1) * (t.hw - 20);
      if (Math.abs(x) < 20) x += Math.sign(x || 1) * 24;
      out.push([x, t.top - 1.6 - r() * 2.5, t.front + 1.2]);
    }
  }
  return out;
}
function buildExtras(E, W, ctx) {
  const X = {};
  // the truce lamp's white: a spot from the lamp down through the open roof onto the north wall and the breach stones
  // (aimed north of the roof slab's edge at z -11.35 so the room under the roof stays dark)
  X.truce = E.spotLight('#F2F4F1', 0, 26, 0.42, 0.55, W);
  X.truce.position.set(L.truceLamp[0] + 0.4, L.truceLamp[1] - 0.6, L.truceLamp[2] - 0.6);
  X.truce.target.position.set(27.2, 2.5, -17.6);
  X.truce.target.updateMatrixWorld();
  // the doorway's daylight: a soft grey spot from just outside the west door onto the floor inside it
  X.door = E.spotLight('#a3a9a9', 0, 16, 0.62, 0.8, W);
  X.door.position.set(14.2, 2.4, -9.6);
  X.door.target.position.set(20.5, 0, -8.4);
  X.door.target.updateMatrixWorld();
  // fallen wall blocks in the mouth of the breach (scene 5)
  const rb = new THREE.Group(); rb.visible = false; W.add(rb);
  const st = E.mat('#26292c', { rough: 0.95, rim: true }), st2 = E.mat('#2b2f33', { rough: 0.95, rim: true });
  const blocks = [
    [4.4, 0.95, 2.2, 27.6, 0.42, -18.4, 0.03, 0.06, 0.02, st], [1.6, 0.8, 1.3, 25.4, 0.35, -17.2, 0.2, 0.5, 0.1, st2],
    [1.9, 1.1, 1.5, 30.2, 0.45, -17.6, -0.1, -0.4, 0.15, st2], [1.2, 0.6, 1.0, 26.6, 1.0, -19.3, 0.3, 0.2, -0.2, st],
    [1.4, 0.7, 1.1, 29.3, 1.05, -19.0, -0.2, 0.7, 0.2, st2], [0.9, 0.5, 0.8, 24.8, 0.2, -16.0, 0.4, 0.9, 0.2, st],
    [1.0, 0.55, 0.9, 31.0, 0.25, -16.2, 0.1, 1.2, -0.3, st], [2.6, 0.6, 1.4, 28.0, 0.95, -18.1, 0, 0.12, 0.03, st],
    [2.3, 0.42, 1.25, 28.02, 1.42, -18.12, 0.02, -0.05, 0.0, st2], [1.1, 0.7, 1.0, 26.2, 0.75, -18.9, 0.3, 0.6, 0.2, st],
  ];
  for (const [w, h, d, x, y, z, rx, ry, rz, m] of blocks) E.boxMesh(w, h, d, m, rb, x, y, z).rotation.set(rx, ry, rz);
  X.rubble = rb;
  // gun flashes along the terrace lips: white for a frame, then amber (two point sets, positions set per frame)
  X.guns = terraceGunPositions(E);
  const hidden = X.guns.map(() => [0, -9999, 0]);
  X.flashW = makePoints(E, ctx.upper ?? W, hidden, { color: '#FFF3D0', px: 5, nearPx: 10, ref: 400, vary: 0 });
  X.flashA = makePoints(E, ctx.upper ?? W, hidden, { color: '#FF8A2E', px: 4, nearPx: 9, ref: 400, vary: 0 });
  for (const P of [X.flashW, X.flashA]) P.g.attributes.position.setUsage(THREE.DynamicDrawUsage);
  // the arch's stone, darkened on request (it keeps its own material otherwise)
  const a = ctx.arch;
  X.archMeshes = [a.pierL, a.pierR, ...a.stones.map(s => s.piv.children[0])].filter(Boolean);
  X.archMat = X.archMeshes.map(m => m.material);
  X.archDarkMat = E.mat('#101214', { rough: 0.95, rim: true });
  return X;
}
function updateExtras(E, R, t, ctx) {
  const X = ctx.extras;
  // the truce lamp's light lives and dies with the lamp
  const burst = R.truceBurstAt, lit = (R.truce ?? 'lit') === 'lit' && !(burst !== undefined && t >= burst + 1 / 24);
  const flashNow = burst !== undefined && t >= burst && t < burst + 2 / 24;
  X.truce.intensity = (R.truceLight ?? 0) * (flashNow ? 9000 : lit ? 3500 : 0);
  const ta = R.truceLightAt ?? [27.2, 2.5, -17.6];
  if (X.truce.target.position.x !== ta[0] || X.truce.target.position.y !== ta[1] || X.truce.target.position.z !== ta[2]) {
    X.truce.target.position.set(...ta); X.truce.target.updateMatrixWorld();
  }
  X.door.intensity = (R.doorLight ?? 0) * 160;
  const da = R.doorLightAt ?? [20.5, 0, -8.4];
  if (X.door.target.position.x !== da[0] || X.door.target.position.y !== da[1] || X.door.target.position.z !== da[2]) {
    X.door.target.position.set(...da); X.door.target.updateMatrixWorld();
  }
  X.rubble.visible = !!R.breachRubble;
  // the terrace guns: each gun fires on its own period between t0 and t1
  const tf = R.terraceFire;
  const pw = X.flashW.g.attributes.position, pa = X.flashA.g.attributes.position;
  let anyW = false, anyA = false;
  for (let i = 0; i < X.guns.length; i++) {
    pw.setXYZ(i, 0, -9999, 0); pa.setXYZ(i, 0, -9999, 0);
    if (!tf || i >= (tf.count ?? X.guns.length)) continue;
    const r = E.rng((tf.seed ?? 1) * 977 + i * 13);
    const period = 1 / Math.max(tf.rate ?? 0.8, 0.05) * (0.7 + 0.6 * r()), first = (tf.t0 ?? 0) + r() * period * (tf.ripple ?? 1);
    if (t < first || t > (tf.t1 ?? 999)) continue;
    const dt = (t - first) % period;
    const g = X.guns[i];
    if (dt < 1 / 24) { pw.setXYZ(i, ...g); anyW = true; } else if (dt < 0.2) { pa.setXYZ(i, ...g); anyA = true; }
  }
  pw.needsUpdate = pa.needsUpdate = true;
  X.flashW.u.uLevel.value = 9; X.flashA.u.uLevel.value = 3.2;
  X.flashW.pts.visible = anyW; X.flashA.pts.visible = anyA;
  // the arch
  const dark = (R.archDark ?? 0) > 0.5;
  X.archMeshes.forEach((m, i) => { m.material = dark ? X.archDarkMat : X.archMat[i]; });
}

export default {
  look: 'gatehouseBreach',
  marks: { ...CITY_MARKS, table: [TABLE.x, TABLE.h, TABLE.z], sealA: [SEALS[0].x, SEALS[0].y, SEALS[0].z], sealB, sealC: [SEALS[2].x, SEALS[2].y, SEALS[2].z],
    door: [16, 0, -9.6], breachCentre: [27.8, 3.5, -18], stretcherA: [29.0, -6.2], stretcherB: [26.2, -5.0], boyUnderArch: [...boyUnderArch],
    // where the two stretchers lie in scene 5 (laid out east-west, heads east): the navigator's and the Aethelgard soldier's
    navStretcher: [22.4, -8.6], aethStretcher: [20.6, -7.6] },
  build(E, o = {}) {
    E.LOOKS.gatehouseBreach = E.deepMerge(E.LOOKS.gatehouse, GH_BREACH);
    E.LOOKS.gatehouseSlate = E.deepMerge(E.LOOKS.breakCrown, GH_SLATE);
    const ctx = buildCity(E, { ...o, interior: true });
    ctx.presets = PRESETS;
    ctx.interior = { ...INTERIOR, fill: 0.2 };
    ctx.extras = buildExtras(E, E.world, ctx);
    return ctx;
  },
  update(E, R, t, ctx) { updateCity(E, R, t, ctx); updateExtras(E, R, t, ctx); },
  beforeRender(E, R, t, ctx, cam) {
    cityBeforeRender(E, R, t, ctx, cam);
    for (const P of [ctx.extras.flashW, ctx.extras.flashA]) { P.u.fogColor.value.copy(E.scene.fog.color); P.u.fogDensity.value = E.scene.fog.density; }
  },
};
