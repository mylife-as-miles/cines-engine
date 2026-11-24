// SCENE 2 (and every exterior of the besieged city): EXT. SOLFORIZ - THE FALLEN GATE - PRE-DAWN (bible p.5 key 2).
// The glass plain, the causeway as a long diagonal to the broken gate and its two towers, the gatehouse with the white
// truce lamp, the forecourt with Aethelgard's battery, the arch and the lower flight of the great stair, the inner
// wall, the stepped ziggurat of eight terraces with amber lamps, the battery in the high arcades, and the Crown.
// buildCity/updateCity are shared by the forecourt, gatehouse and crown sets.
import * as THREE from 'three';
import { L, buildPlain, buildCauseway, buildWallAndGate, buildGatehouse, buildForecourt, buildBattery, buildArch, poseArch,
  buildStair, buildBlock, poseBlock, buildInnerWall, buildZiggurat, buildCrown, poseCrown, buildArcades, buildCannon,
  makePoints, cityLampPositions, pulseLevel, crownFront, buildMidTowers, poseMidTowers } from './solforiz.js';
import { buildPuffs, updatePuffs } from './fall.js';

// The ziggurat as one group (tiers, the lower flight, the inner wall and gallery, the block, the Crown, the towers, the
// arcades and the city's lamps), so a shot can push the whole capital back into the haze: state.far = {z, y, x, s}
// (metres of offset, and a uniform scale about the tier-0 front centre [0, 0, -90]). The bible's distant silhouette
// (cover, keys p.5 and p.7) from inside the walls, where the real capital is close and steep. Default: no change.
export const FAR_PIVOT = [0, 0, -90];
const PUFF_N = 48;

export function buildCity(E, o = {}) {
  const W = E.world;
  const ctx = {};
  const U = new THREE.Group(); U.name = 'upper-city'; W.add(U); ctx.upper = U;
  buildPlain(E, W, o);
  buildCauseway(E, W, o);
  const cb = new E.Batch('cannon');
  for (const [x, z, yaw] of L.cannon) buildCannon(E, cb, x, L.plainY, z, yaw, { elev: 0.15 + (Math.abs(x) % 3) * 0.08, mat: E.mat('#121518', { rough: 0.6, metal: 0.5, rim: true }) });
  cb.build(W);
  buildWallAndGate(E, W, o);
  ctx.gatehouse = buildGatehouse(E, W, { interior: o.interior });
  ctx.forecourt = buildForecourt(E, W, { ...o, battery: false });
  ctx.guns = buildBattery(E, W, o);
  ctx.arch = buildArch(E, W, o);
  ctx.stair = buildStair(E, U, o);
  ctx.inner = buildInnerWall(E, U, o);
  ctx.zig = buildZiggurat(E, U, o);
  ctx.crown = buildCrown(E, U, o);
  ctx.midTowers = buildMidTowers(E, U, o);
  ctx.arcades = buildArcades(E, U, o);
  ctx.block = buildBlock(E, U);
  // lamps: the city's amber lamps (they breathe on the pulse), the arcade muzzle flashes, impacts, the truce lamp
  ctx.lamps = makePoints(E, U, cityLampPositions(E), { color: '#E08A3A', px: 3.4, nearPx: 7, ref: 500, vary: 0.45 });
  ctx.truce = makePoints(E, W, [L.truceLamp], { color: '#F2F4F1', px: 8, nearPx: 14, ref: 300, vary: 0 });
  const tl = new THREE.Group(); tl.position.set(...L.truceLamp); W.add(tl);
  // the lantern's cage: cap, base and four corner posts (a solid box here hid the glass and the point from ~100 m)
  const cage = E.mat('#15181b', { rim: true });
  E.boxMesh(0.6, 0.1, 0.6, cage, tl, 0, 0.42, 0); E.boxMesh(0.6, 0.08, 0.6, cage, tl, 0, -0.27, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) E.boxMesh(0.05, 0.7, 0.05, cage, tl, sx * 0.27, 0.07, sz * 0.27);
  ctx.truceGlass = E.boxMesh(0.42, 0.55, 0.42, E.lampMat('#F2F4F1', 7), tl, 0, 0.05, 0, { cast: false });
  ctx.truceMesh = tl;
  ctx.arcFlash = makePoints(E, U, ctx.arcades.guns, { color: '#FFF3D0', px: 5, nearPx: 14, ref: 500, vary: 0 });
  ctx.impacts = makePoints(E, W, Array.from({ length: 24 }, () => [0, -999, 0]), { color: '#FF8A2E', px: 5, nearPx: 18, ref: 600, vary: 0 });
  ctx.impacts.g.attributes.position.setUsage(THREE.DynamicDrawUsage);
  // tracer arcs: a pool of lines reused by salvos
  ctx.tracers = [];
  const trMat = new THREE.LineBasicMaterial({ color: new THREE.Color('#d6cfbd').multiplyScalar(1.4), fog: true, transparent: true, opacity: 0.8 });
  trMat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, E.U); };
  for (let i = 0; i < 16; i++) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 3), 3));
    const line = new THREE.Line(g, trMat); line.frustumCulled = false; line.visible = false; W.add(line); ctx.tracers.push(line);
  }
  // the one light that flashes: the battery's muzzle flash lighting the crews and the ground
  ctx.flashLight = E.pointLight('#ffb070', 0, 60, 2);
  const c = L.battery.reduce((a, p) => [a[0] + p[0] / 3, a[1] + p[1] / 3], [0, 0]);
  ctx.flashLight.position.set(c[0] + 4, 7, c[1] - 9);
  // extra abandoned cannon, hidden unless a shot places them: state.cannons = [{at: [x, y, z], yaw, elev, len}]
  ctx.cannons = [0, 1].map(() => {
    const g = new THREE.Group(); g.visible = false; W.add(g);
    const b = new E.Batch('extra-cannon');
    buildCannon(E, b, 0, 0, 0, 0, { elev: 0.22, len: 6.5, mat: E.mat('#101215', { rough: 0.6, metal: 0.5, rim: true }) });
    b.build(g);
    return g;
  });
  // smoke and dust puffs (soft spheres lit from above), hidden unless a shot asks: state.puffs = [{at, t0, n, spread,
  // r0, r1, rise, drift: [dx, dy, dz], grow, life, opacity, lit, shade, seed, upper}] (upper: at is in the capital's frame)
  ctx.puffs = buildPuffs(E, W, PUFF_N);
  // a thread of hand lamps walking a path (the civilians' lamps coming down the stair, readable at any distance):
  // state.lampThread = {path: [[x,y,z],...], count, spacing, speed, start, t0, jitter, px, color, level, upper}
  ctx.thread = makePoints(E, W, Array.from({ length: 96 }, () => [0, -9999, 0]), { color: '#E08A3A', px: 2.6, nearPx: 5, ref: 300, vary: 0.35, seed: 9 });
  ctx.thread.g.attributes.position.setUsage(THREE.DynamicDrawUsage);
  ctx.thread.pts.visible = false;
  // the stalled shutter's slit as a row of fixed-size points, so it reads as the one bright dash at any distance
  // (the real slit is under a metre tall: sub-pixel from the gatehouse once the capital is pushed back). Opt-in:
  // state.slitMark = {px, level, color}
  const O0 = L.crown.opening;
  ctx.slit = makePoints(E, U, Array.from({ length: 33 }, (_, i) => [-O0.w / 2 + 2 + i * (O0.w - 4) / 32, O0.y + 0.4, crownFront() + 2.4]),
    { color: '#FFE2B0', px: 2.5, nearPx: 3, ref: 100, vary: 0.25, seed: 12 });
  ctx.slit.pts.visible = false;
  // dynamic marks: the capital's marks follow state.far (identical to the static marks when far is unset)
  const up = (p) => () => U.localToWorld(new THREE.Vector3(...p));
  const O = L.crown.opening;
  ctx.dyn = {
    crownShutter: up([0, O.y + O.h / 2, crownFront()]), crown: up([0, L.crown.y + 30, L.crown.z]),
    shutterSlit: up([0, O.y + 0.8, crownFront() + 2]), innerGate: up([L.innerWall.gateX, 12, L.innerWall.z]),
    stairFoot: up(L.stairFoot), stairTop: up(L.stairTop),
  };
  return ctx;
}
// state.far -> the capital's transform; returns true when it moved
function placeUpper(ctx, far) {
  const U = ctx.upper; if (!U) return false;
  const f = far ?? {}, s = f.s ?? 1;
  U.scale.setScalar(s);
  U.position.set((1 - s) * FAR_PIVOT[0] + (f.x ?? 0), (1 - s) * FAR_PIVOT[1] + (f.y ?? 0), (1 - s) * FAR_PIVOT[2] + (f.z ?? 0));
  U.updateMatrixWorld(true);
  return !!far;
}

// the target of a salvo: 'crown' (the shutter opening), 'lines' (Aethelgard's lines in the forecourt), 'truce', [x,y,z]
function targetOf(to, i) {
  if (Array.isArray(to)) return new THREE.Vector3(...to);
  if (to === 'lines') return new THREE.Vector3(-70 + i * 23, 0.5, -22 + (i % 3) * 7);
  if (to === 'truce') return new THREE.Vector3(...L.truceLamp);
  const O = L.crown.opening;
  return new THREE.Vector3(-24 + (i % 3) * 24, O.y + 4 + (i % 2) * 6, crownFront());
}
export function updateCity(E, R, t, ctx) {
  placeUpper(ctx, R.far);
  // the city's lamps: level, breathing on the four-beat pulse, out together at lamps.outAt
  const lp = R.lamps ?? {};
  const pulse = pulseLevel(t, { beat: lp.beat, outAt: lp.outAt, phase: lp.phase });
  const breathe = lp.breathe ?? 0.6, lvl = (lp.level ?? 1) * (lp.outAt !== undefined && t >= lp.outAt ? 0 : 1);
  ctx.lamps.u.uLevel.value = 1.7 * lvl * (1 - breathe * 0.55 + breathe * 0.55 * pulse);
  ctx.lamps.u.uOn.value = lp.share ?? 1;
  ctx.lamps.pts.visible = lvl > 0;
  // the truce lamp: lit until truceBurstAt (5.3: a single shot from the terraces; white leaves the film)
  const burst = R.truceBurstAt, lit = (R.truce ?? 'lit') === 'lit' && !(burst !== undefined && t >= burst + 1 / 24);
  const flashNow = burst !== undefined && t >= burst && t < burst + 2 / 24;
  ctx.truce.u.uLevel.value = flashNow ? 9 : 4;
  ctx.truce.pts.visible = lit || flashNow;
  ctx.truceGlass.visible = lit || flashNow;
  ctx.truceMesh.visible = (R.truce ?? 'lit') !== 'gone';
  // the crown, the arch, the block, the inner gate
  poseCrown(ctx.crown, R.crown ?? {}, t);
  poseMidTowers(ctx.midTowers, R.midTowers ?? []);
  poseArch(ctx.arch, R.arch ?? {}, t);
  poseBlock(ctx.block, { visible: !!R.block, ...(R.block ?? {}) }, t);
  const ig = R.innerGate ?? 0;
  ctx.inner.leaves.forEach(l => { l.piv.rotation.y = l.sx * ig * 1.3; });
  if (ctx.gatehouse.door) ctx.gatehouse.door.rotation.y = -(R.door ?? 0.2) * 1.5;
  // salvos: muzzle flash (clips to white for a frame, then amber), recoil, tracer arcs, impacts
  // the battery can be moved: battery = {at: [x, z], spacing: [dx, dz], face: [x, z]}
  const bt = R.battery;
  ctx.guns.forEach((g, i) => {
    const home = L.battery[i];
    const at = bt?.at ? [bt.at[0] + (i - 1) * (bt.spacing?.[0] ?? 15), bt.at[1] + (i - 1) * (bt.spacing?.[1] ?? -4)] : home;
    const face = bt?.face ?? [0, L.crown.z];
    g.g.position.set(at[0], bt?.y ?? 0, at[1]);
    g.g.rotation.y = Math.atan2(face[0] - at[0], face[1] - at[1]);
  });
  const gc = ctx.guns.reduce((a, g) => a.add(g.g.position), new THREE.Vector3()).multiplyScalar(1 / 3);
  ctx.flashLight.position.set(gc.x + 3, gc.y + 6, gc.z - 8);
  const salvos = R.salvos ?? [];
  let flashSum = 0;
  ctx.guns.forEach(g => { g.flash.visible = false; g.barrel.position.z = 0; g.barrel.rotation.x = -(R.gunElev ?? 0.55); });
  const arcLevel = new Float32Array(ctx.arcades.guns.length);
  let tr = 0, im = 0;
  const impPos = ctx.impacts.g.attributes.position;
  for (let i = 0; i < impPos.count; i++) impPos.setXYZ(i, 0, -9999, 0);
  for (const sv of salvos) {
    const side = sv.side ?? 'aethelgard';
    const n = side === 'aethelgard' ? ctx.guns.length : (sv.guns ?? 6);
    for (let i = 0; i < n; i++) {
      const ti = (sv.t ?? 0) + i * (sv.spread ?? 0.35), dt = t - ti;
      if (dt < 0) continue;
      let from;
      if (side === 'aethelgard') {
        const g = ctx.guns[i];
        const f = dt < 1 / 24 ? 1 : Math.exp(-(dt - 1 / 24) * 14);
        if (dt < 0.4) { g.flash.visible = true; g.flash.scale.setScalar(0.6 + 0.7 * f); g.flash.children.forEach(c => { c.material = dt < 1 / 24 ? E.lampMat('#FFFFFF', 12) : (c.geometry.type === 'OctahedronGeometry' ? E.lampMat('#FFF3D0', 1 + 3 * f) : E.lampMat('#FF8A2E', 1.2 + 0.6 * f)); }); }
        g.barrel.position.z = -0.9 * Math.exp(-dt * 3) * Math.min(1, dt * 40);
        flashSum += f * (dt < 1 / 24 ? 1.6 : 1);
        g.barrel.updateMatrixWorld(true);
        from = g.muzzle();
      } else {
        const gi = (sv.gunIndex ?? 0) + i * 3;
        const gp = ctx.arcades.guns[gi % ctx.arcades.guns.length];
        arcLevel[gi % arcLevel.length] = Math.max(arcLevel[gi % arcLevel.length], dt < 1 / 24 ? 1 : Math.exp(-(dt - 1 / 24) * 10));
        from = new THREE.Vector3(...gp);
        if (R.far) ctx.upper.localToWorld(from);
      }
      const toName = sv.to ?? (side === 'aethelgard' ? 'crown' : 'lines');
      const to = targetOf(toName, i + (sv.seed ?? 0));
      if (toName === 'crown' && R.far) ctx.upper.localToWorld(to);
      const flight = sv.flight ?? 2.4;
      if (sv.tracers !== false && dt < flight + 0.8 && tr < ctx.tracers.length) {
        const line = ctx.tracers[tr++], pos = line.geometry.attributes.position;
        const d = from.distanceTo(to), apex = d * (sv.arc ?? 0.16);
        for (let k = 0; k < 64; k++) { const u = k / 63; const p = from.clone().lerp(to, u); p.y += apex * 4 * u * (1 - u); pos.setXYZ(k, p.x, p.y, p.z); }
        pos.needsUpdate = true;
        const head = Math.min(1, dt / flight), tail = Math.max(0, head - 0.45 - Math.max(0, dt - flight) * 0.8);
        line.geometry.setDrawRange(Math.floor(tail * 63), Math.max(2, Math.ceil((head - tail) * 63)));
        line.visible = head > tail;
      }
      if (dt >= flight && dt < flight + 0.9 && im < impPos.count) impPos.setXYZ(im++, to.x, to.y, to.z);
    }
  }
  for (let i = tr; i < ctx.tracers.length; i++) ctx.tracers[i].visible = false;
  impPos.needsUpdate = true;
  ctx.impacts.u.uLevel.value = 3;
  // the arcade flash clips to white for one frame, then a small amber point that dies away (as the battery's)
  const arcMax = Math.max(0, ...arcLevel);
  ctx.arcFlash.u.uColor.value.set(arcMax >= 0.999 ? '#FFF3D0' : '#FF8A2E');
  ctx.arcFlash.u.uLevel.value = arcMax >= 0.999 ? 8 : 1.5 + 3 * arcMax; ctx.arcFlash.pts.visible = arcLevel.some(v => v > 0.05);
  ctx.arcFlash.u.uOn.value = arcLevel.some(v => v > 0.05) ? 1 : 0;
  // only the guns that are firing show a flash (the points used to light every gun in the arcades at once)
  const ap = ctx.arcFlash.g.attributes.position;
  ctx.arcades.guns.forEach((gp, i) => { if (arcLevel[i] > 0.05) ap.setXYZ(i, gp[0], gp[1], gp[2]); else ap.setXYZ(i, 0, -9999, 0); });
  ap.needsUpdate = true;
  ctx.flashLight.intensity = Math.min(flashSum, 2) * (R.flashPower ?? 9000);
  // the slit marker
  const SM = R.slitMark;
  ctx.slit.pts.visible = !!SM;
  if (SM) { ctx.slit.u.uPx.value = SM.px ?? 2.5; ctx.slit.u.uNearPx.value = SM.px ?? 2.5; ctx.slit.u.uLevel.value = SM.level ?? 2; ctx.slit.u.uColor.value.set(SM.color ?? '#FFE2B0'); }
  // the lamp thread
  const LT = R.lampThread, tp = ctx.thread.g.attributes.position;
  ctx.thread.pts.visible = !!LT;
  if (LT) {
    const path = LT.path, seg = [];
    let tot = 0;
    for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]); seg.push(d); tot += d; }
    const rr = E.rng(LT.seed ?? 4);
    for (let i = 0; i < tp.count; i++) {
      const jx = (rr() - 0.5) * (LT.width ?? 6), jy = 0.9 + rr() * 0.3, ph = rr();
      let sArc = (LT.start ?? 0) + (LT.speed ?? 1) * (t - (LT.t0 ?? 0)) - i * (LT.spacing ?? 2) + ph * (LT.spacing ?? 2) * (LT.jitter ?? 0.6);
      if (i >= (LT.count ?? 30) || sArc < 0 || sArc > tot) { tp.setXYZ(i, 0, -9999, 0); continue; }
      let k = 0; while (k < seg.length - 1 && sArc > seg[k]) { sArc -= seg[k]; k++; }
      const a = path[k], b = path[k + 1], u = Math.min(1, sArc / seg[k]);
      const p = new THREE.Vector3(a[0] + (b[0] - a[0]) * u + jx, a[1] + (b[1] - a[1]) * u + jy, a[2] + (b[2] - a[2]) * u);
      if (LT.upper) ctx.upper.localToWorld(p);
      tp.setXYZ(i, p.x, p.y, p.z);
    }
    tp.needsUpdate = true;
    ctx.thread.u.uLevel.value = LT.level ?? 1.4; ctx.thread.u.uPx.value = LT.px ?? 2.6;
    ctx.thread.u.uColor.value.set(LT.color ?? '#E08A3A');
  }
  // extra cannon
  ctx.cannons.forEach((g, i) => {
    const c = (R.cannons ?? [])[i];
    g.visible = !!c;
    if (!c) return;
    g.position.set(...c.at); g.rotation.set(0, (c.yaw ?? 0) * Math.PI / 180, 0); g.scale.setScalar(c.scale ?? 1);
  });
  updatePuffs(E, ctx.puffs, R.puffs, t, ctx.upper);
}
export function cityBeforeRender(E, R, t, ctx) {
  for (const P of [ctx.lamps, ctx.truce, ctx.arcFlash, ctx.impacts, ctx.thread, ctx.slit]) { P.u.fogColor.value.copy(E.scene.fog.color); P.u.fogDensity.value = E.scene.fog.density; }
  for (const m of ctx.puffs ?? []) if (m.visible) { m.material.uniforms.fogColor.value.copy(E.scene.fog.color); m.material.uniforms.fogDensity.value = E.scene.fog.density; }
}

export const CITY_MARKS = {
  gate: [0, 0, 0], truceLamp: L.truceLamp, arch: [L.arch.x, 0, L.arch.z], underArch: [L.arch.x, 0, L.arch.z + 0.2],
  stairFoot: L.stairFoot, stairTop: L.stairTop, block: [L.block.x, L.block.y, L.block.z], lioraUnderBlock: [L.block.x, 0, L.block.z + 0.4],
  caelTenPaces: [L.block.x + 7.8, 0, L.block.z + 1.6], innerGate: [L.innerWall.gateX, 12, L.innerWall.z],
  crownShutter: [0, L.crown.opening.y + L.crown.opening.h / 2, crownFront()], crown: [0, L.crown.y + 30, L.crown.z],
  breach: [25, 3.5, -18], battery: [-44, 0, -46], causewayNear: [0, 0, 120], causewayFar: [0, 0, 1500],
};

const PRESETS = {
  // bible p.5 key 2: the fallen gate. Two-thirds sky; the causeway a long diagonal from the corner to the gate;
  // the truce lamp the brightest point; amber lamps on the terraces; an abandoned cannon at the lower right.
  gate: {
    state: { lamps: { level: 1, breathe: 0.3 }, crown: { shutter: 0, fire: 0 } },
    cam: { pos: [24, 4.6, 2150], target: [-3, 78, -300], f: 50 },
  },
  // bible p.7 key 5: "Break the Crown!" Three barrels at lower left; shells arcing to the ziggurat; a raised arm.
  breakCrown: {
    t: 2.42,
    state: {
      look: 'breakCrown', truce: 'gone', lamps: { level: 1, breathe: 0 }, crown: { shutter: 0, fire: 0 }, flashPower: 1600,
      battery: { at: [-52.5, 492], spacing: [0.6, -10.5] },
      salvos: [{ side: 'aethelgard', t: 2.3, spread: 0.04, flight: 2.6, to: 'crown' }, { side: 'aethelgard', t: 0.8, spread: 0.2, flight: 2.6, to: 'crown', seed: 1 },
        { side: 'arcade', t: 2.0, guns: 5, spread: 0.07, flight: 2.0, to: 'lines', tracers: false }],
      figures: {
        captain: { pos: [-45.2, 476.5], face: [0, -440], pose: 'stand', aimR: [-30, 200, -440], palmR: 'out', handR: 1 },
        bearer: { pos: [-43.4, 475.6], face: [0, -440], banner: 'upright' },
      },
    },
    cam: { pos: [-40, 1.0, 520], target: [-110, 62.6, -277], f: 24 },
  },
};

export default {
  look: 'predawn',
  marks: CITY_MARKS,
  build(E, o = {}) { const ctx = buildCity(E, o); ctx.presets = PRESETS; return ctx; },
  update: updateCity,
  beforeRender: cityBeforeRender,
};
