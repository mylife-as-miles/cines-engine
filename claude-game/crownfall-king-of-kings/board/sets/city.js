// SCENE 2 (and every exterior of the besieged city): EXT. SOLFORIZ - THE FALLEN GATE - PRE-DAWN (bible p.5 key 2).
// The glass plain, the causeway as a long diagonal to the broken gate and its two towers, the gatehouse with the white
// truce lamp, the forecourt with Aethelgard's battery, the arch and the lower flight of the great stair, the inner
// wall, the stepped ziggurat of eight terraces with amber lamps, the battery in the high arcades, and the Crown.
// buildCity/updateCity are shared by the forecourt, gatehouse and crown sets.
import * as THREE from 'three';
import { L, buildPlain, buildCauseway, buildWallAndGate, buildGatehouse, buildForecourt, buildBattery, buildArch, poseArch,
  buildStair, buildBlock, poseBlock, buildInnerWall, buildZiggurat, buildCrown, poseCrown, buildArcades, buildCannon,
  makePoints, cityLampPositions, pulseLevel, crownFront } from './solforiz.js';

export function buildCity(E, o = {}) {
  const W = E.world;
  const ctx = {};
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
  ctx.stair = buildStair(E, W, o);
  ctx.inner = buildInnerWall(E, W, o);
  ctx.zig = buildZiggurat(E, W, o);
  ctx.crown = buildCrown(E, W, o);
  ctx.arcades = buildArcades(E, W, o);
  ctx.block = buildBlock(E, W);
  // lamps: the city's amber lamps (they breathe on the pulse), the arcade muzzle flashes, impacts, the truce lamp
  ctx.lamps = makePoints(E, W, cityLampPositions(E), { color: '#E08A3A', px: 3.4, nearPx: 7, ref: 500, vary: 0.45 });
  ctx.truce = makePoints(E, W, [L.truceLamp], { color: '#F2F4F1', px: 8, nearPx: 14, ref: 300, vary: 0 });
  const tl = new THREE.Group(); tl.position.set(...L.truceLamp); W.add(tl);
  E.boxMesh(0.55, 0.75, 0.55, E.mat('#15181b', { rim: true }), tl, 0, 0.1, 0);
  ctx.truceGlass = E.boxMesh(0.42, 0.55, 0.42, E.lampMat('#F2F4F1', 7), tl, 0, 0.05, 0, { cast: false });
  ctx.truceMesh = tl;
  ctx.arcFlash = makePoints(E, W, ctx.arcades.guns, { color: '#FFF3D0', px: 5, nearPx: 14, ref: 500, vary: 0 });
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
  return ctx;
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
      }
      const to = targetOf(sv.to ?? (side === 'aethelgard' ? 'crown' : 'lines'), i + (sv.seed ?? 0));
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
  ctx.arcFlash.u.uLevel.value = 8; ctx.arcFlash.pts.visible = arcLevel.some(v => v > 0.05);
  ctx.arcFlash.u.uOn.value = arcLevel.some(v => v > 0.05) ? 1 : 0;
  ctx.flashLight.intensity = Math.min(flashSum, 2) * (R.flashPower ?? 9000);
}
export function cityBeforeRender(E, R, t, ctx) {
  for (const P of [ctx.lamps, ctx.truce, ctx.arcFlash, ctx.impacts]) { P.u.fogColor.value.copy(E.scene.fog.color); P.u.fogDensity.value = E.scene.fog.density; }
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
