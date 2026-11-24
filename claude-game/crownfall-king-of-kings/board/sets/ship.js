// SCENES 9-10. EXT. THE FIRST SHIP / THE RUINS (bible p.9 keys 9 and 10, p.10 the banners; shots 9.1-9.2, 10.1-10.16)
// The ruins set plus the first ship, the fleet behind it, the ward, the bars of sunrise through the rigging, the army
// under its banners, and the masked ward officer behind the round observation glass.
// The first ship ("lifting envelopes over an armoured body, Kwind-09 iron hung with Korvenian silver; re-plated, built
// onto, year after year"): body 420 x 70 x 36 m, three long lobed envelopes above (the scalloped top of key p.9), a keel
// 200 m long and 26 m deep below, a plated belly (frames, girders, patches), Korvenian silver points and rings hung on
// lines under both edges, rigging lines, a battery of 13 weapon housings on the south chamfer, the observation glass (a
// round glass ball half sunk in the belly, silver-rimmed: the officer stands in its lower half) at the west end of the
// battery, and the ward emitter at the keel's bottom centre. Origin = keel bottom centre; long axis along x.
// Default hover: keel bottom 17 m over the arch, so the ward drops onto the arch.
// State keys (all optional, all animatable):
//   ship: {pos | approach 0..1, yaw, roll, visible}   housings 0..1 (opens the 13 amber points left to right, west first)
//   shipLights 0..1 (small pale lights along the hull: 9.1 "lights in the dust")
//   fleet: {count, approach 0..1, ramp, depth}   the first `count` slots; a fractional count brings the next ships out of
//          the haze one after another (each slides in from `depth` m further back over `ramp` slots of count)
//   ward: {drop 0..1, radius, light, lamp, core, glow}   bars: {count, x0, spacing, z, width, strength, sweep, top}
//   bar: 'liora' | [x,y,z] (+ barPower)   maskFlash 0..1   flashes: [{at: [x,y,z], t0, t1, size}] (white spots on the belly)
//   glint: {at, level} (the mirror's one white point)   podLight 0..1   glass (opacity of the observation glass)
//   hands2: up to two free detailed hands [{style, side, pos, face, up, open, shake, visible}] (10.6: her hand over her wrist)
import * as THREE from 'three';
import { buildRuins, updateRuins, ruinsBeforeRender } from './ruins.js';
import { L, makePoints } from './solforiz.js';
import { makeHeroHand, poseHeroHand } from '../figures.js';

export const SHIP = { len: 420, width: 70, keelH: 24, bodyTop: 60, hover: [L.arch.x, 17, L.arch.z], far: [L.arch.x - 60, 380, -5600],
  pod: { x: -30, z: 23, r: 2.3 }, housings: 13, battery: { x0: -24.5, dx: 3.6 } };

function profileGeo(E, pts, len) {
  const g = E.extrude(pts, len); g.rotateY(Math.PI / 2); return g;   // extrude along x, profile in (z, y)
}
const BODY = (K) => [[-35, K + 36], [35, K + 36], [35, K + 18], [26, K + 2], [-26, K + 2], [-35, K + 18]];
const KEEL = (K) => [[-15, K + 2], [15, K + 2], [5, 0], [-5, 0]];
const LOBES = [-142, 0, 142], LOBE = { y: 38, rx: 74, ry: 27, rz: 33 };
// the first ship (full detail) — returns handles; origin at the keel bottom centre
export function buildFirstShip(E, parent) {
  const g = new THREE.Group(); parent.add(g);
  const iron = E.mat('#2b2d31', { rough: 0.7, metal: 0.35, rim: true }), soot = E.mat('#141416', { rough: 0.9, rim: true });
  const plate = E.mat('#3B3D40', { rough: 0.6, metal: 0.4, rim: true }), patch = E.mat('#1d1f22', { rough: 0.8, rim: true });
  const rust = E.mat('#2a2522', { rough: 0.85, rim: true });
  const silver = E.mat('#B9BEC3', { rough: 0.2, metal: 0.9, rim: true });
  const env = E.mat('#26272a', { rough: 0.85, rim: true });
  const b = new E.Batch('ship');
  const K = SHIP.keelH, len = SHIP.len, r = E.rng(1201);
  // the armoured body: a hexagonal section, chamfered end plates
  b.add(profileGeo(E, BODY(K), len), iron, E.M4(0, 0, 0));
  for (const sx of [-1, 1]) b.box(10, 30, 60, iron, sx * (len / 2 + 3), K + 20, 0, 0, 0, sx * 0.35);
  // the grid: strakes and frames on the sides, re-plated patches (built onto, year after year)
  for (const y of [K + 8, K + 14, K + 22, K + 30]) for (const sz of [-1, 1]) b.box(len, 0.7, 0.7, plate, 0, y, sz * (y > K + 18 ? 35.4 : 26.6 + (y - K - 2) * 0.56));
  for (let x = -len / 2 + 8; x < len / 2; x += 15) for (const sz of [-1, 1]) b.box(0.9, 18, 0.7, plate, x, K + 27, sz * 35.4);
  for (let i = 0; i < 46; i++) { const sz = r() < 0.5 ? -1 : 1; b.box(8 + r() * 26, 3 + r() * 9, 0.9, r() < 0.5 ? patch : plate, (r() - 0.5) * (len - 30), K + 20 + r() * 14, sz * 35.6); }
  // the belly, seen from below in every shot of scene 10: transverse frames, longitudinal girders, patches of new plate
  for (let x = -len / 2 + 7; x < len / 2; x += 14) b.box(0.9, 1.2, 52, plate, x, K + 1.4, 0);
  for (const z of [-20, -10, 10, 20]) b.box(len - 4, 0.9, 0.9, iron, 0, K + 1.55, z);
  for (let i = 0; i < 60; i++) { const w = 9 + r() * 30, d = 5 + r() * 14; b.box(w, 0.35, d, r() < 0.55 ? patch : (r() < 0.5 ? rust : plate), (r() - 0.5) * (len - 40), K + 1.8, (r() - 0.5) * (50 - d)); }
  // three long lifting envelopes over the body: the scalloped top of key p.9 (their lower halves sink into the body)
  for (const x of LOBES) b.add(new THREE.SphereGeometry(1, 48, 20), env, E.M4(x, K + LOBE.y, 0, 0, 0, 0, LOBE.rx, LOBE.ry, LOBE.rz));
  for (const x of [-213, -71, 71, 213]) b.box(5, 16, 46, iron, x, K + 44, 0);      // the saddles between the lobes
  for (const x of LOBES) for (const dx of [-44, -22, 22, 44]) {                     // straps over each lobe
    const k = Math.sqrt(Math.max(0, 1 - (dx / LOBE.rx) ** 2));
    b.add(new THREE.SphereGeometry(1, 28, 10), iron, E.M4(x + dx, K + LOBE.y, 0, 0, 0, 0, 0.7, LOBE.ry * k + 0.45, LOBE.rz * k + 0.45));
  }
  // the keel: a trapezoid prism under the centre, ribbed
  b.add(profileGeo(E, KEEL(K), 200), soot, E.M4(0, 0, 0));
  for (let x = -96; x <= 96; x += 12) for (const sz of [-1, 1]) b.box(0.8, 26.2, 0.8, iron, x, 13, sz * 10.2, sz * 0.37, 0, 0);
  b.box(200, 0.8, 4, iron, 0, -0.3, 0);
  // engines at the ends
  for (const x of [-len / 2 - 6, len / 2 + 6]) for (const sz of [-1, 1]) { const c = new THREE.CylinderGeometry(6, 7, 26, 16); c.rotateZ(Math.PI / 2); b.add(c, soot, E.M4(x, K + 14, sz * 22)); }
  b.build(g);
  // Korvenian silver: points along both sides, and points and rings hung on lines under the belly edges
  const sb = new E.Batch('ship-silver');
  const lines = new E.Batch('ship-lines');
  const rope = E.mat('#121214', { rim: true });
  for (let x = -len / 2 + 15; x < len / 2 - 10; x += 21) for (const sz of [-1, 1]) {
    sb.add(new THREE.SphereGeometry(1.4, 12, 8), silver, E.M4(x, K + 26, sz * 36));
    const hx = x + 10.5, drop = 4 + r() * 6;
    lines.add(new THREE.CylinderGeometry(0.1, 0.1, drop, 4), rope, E.M4(hx, K + 2 - drop / 2, sz * 25.6));
    sb.add(new THREE.SphereGeometry(0.9, 12, 8), silver, E.M4(hx, K + 2 - drop - 0.6, sz * 25.6));
    sb.add(new THREE.TorusGeometry(1.5, 0.2, 8, 20), silver, E.M4(hx, K + 2 - drop - 2.4, sz * 25.6, 0, sz * 0.3, 0));
  }
  sb.build(g);
  // rigging: lines hanging from the belly edges and the keel, and stays from the envelopes
  for (let x = -len / 2 + 12; x < len / 2; x += 23) for (const sz of [-1, 1]) {
    const h = 8 + r() * 26;
    if (Math.abs(x) < 30) continue;                       // the ward's air under the keel stays clear
    if (sz > 0 && x > SHIP.pod.x - 26 && x < SHIP.battery.x0 + 13 * SHIP.battery.dx + 6) continue;   // and the glass's view
    lines.add(new THREE.CylinderGeometry(0.13, 0.13, h, 4), rope, E.M4(x + (r() - 0.5) * 6, K + 2 - h / 2, sz * (19 + r() * 6)));
  }
  for (let i = 0; i < 18; i++) { const x = -len / 2 + 20 + i * 22, sz = i % 2 ? 1 : -1; lines.add(new THREE.CylinderGeometry(0.12, 0.12, 40, 4), rope, E.M4(x, K + 50, sz * 36, sz * 0.5, 0, 0)); }
  lines.build(g, { cast: true });
  // the battery: 13 weapon housings on the south (+z) chamfer, close together, west to east; the points open in order
  const hb = new E.Batch('housings');
  const hpos = [], B = SHIP.battery, ang = Math.atan2(9, 16);
  for (let i = 0; i < SHIP.housings; i++) {
    const x = B.x0 + i * B.dx;
    hb.box(2.6, 2.2, 0.6, patch, x, K + 9, 29.6, -ang, 0, 0);
    hb.box(2.9, 0.35, 0.9, plate, x, K + 10.3, 29.9, -ang, 0, 0);
    hpos.push([x, K + 8.6, 30.6]);
  }
  hb.box(B.dx * 13 + 4, 0.6, 0.8, plate, B.x0 + B.dx * 6, K + 11.5, 30.8, -ang, 0, 0);
  hb.build(g);
  const housings = makePoints(E, g, hpos, { color: '#FFC070', px: 4, nearPx: 9, ref: 300, vary: 0.15 });
  const hs = housings.g.attributes.seed;
  for (let i = 0; i < hs.count; i++) hs.setX(i, (i + 0.5) / hs.count);       // left to right (west first)
  hs.needsUpdate = true;
  // small pale lights along the hull (seen first, "lights in the dust", 9.1)
  const lp = [];
  for (let x = -len / 2 + 10; x < len / 2; x += 34) for (const sz of [-1, 1]) lp.push([x, K + 17, sz * 35.6]);
  for (const x of [-len / 2 - 4, len / 2 + 4]) lp.push([x, K + 26, 0], [x, K + 8, 0]);
  const runLights = makePoints(E, g, lp, { color: '#E2D2AC', px: 2.5, nearPx: 5, ref: 900, vary: 0.4, seed: 9 });
  // the observation glass: a round glass ball half sunk in the belly, a silver rim; the officer stands in its lower half
  const P = SHIP.pod;
  const pod = new THREE.Group(); pod.position.set(P.x, K + 2, P.z); g.add(pod);
  const glassMat = E.mat('#e6e4df', { std: true, rough: 0.1, metal: 0.1, transparent: true, opacity: 0.3, depthWrite: false, double: true });
  const glass = E.mesh(new THREE.SphereGeometry(P.r, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glassMat, pod, 0, 0, 0, { cast: false, receive: false });
  glass.renderOrder = 15;
  const rim = new THREE.TorusGeometry(P.r + 0.12, 0.26, 10, 48); rim.rotateX(Math.PI / 2); E.mesh(rim, silver, pod, 0, -0.1, 0);
  E.mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.12, 20), E.mat('#1a1726', { rim: true }), pod, 0, -2.04, 0, { cast: false });   // her footplate
  // the ward emitter at the keel's bottom centre: a small bright violet-white lamp (no halo)
  const emitter = new THREE.Group(); emitter.position.set(0, -0.7, 0); g.add(emitter);
  const emDisc = E.mesh(new THREE.CylinderGeometry(0.9, 1.3, 0.5, 24), E.lampMat('#b9a4ff', 1.6), emitter, 0, 0, 0, { cast: false });
  const emCore = E.mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16), E.lampMat('#ffffff', 4), emitter, 0, -0.35, 0, { cast: false });
  return { g, housings, runLights, pod, glass, glassMat, emitter, emDisc, emCore };
}
// one merged far-LOD ship for the fleet (instanced): the same silhouette, fewer pieces
function fleetGeometry(E) {
  const parts = [];
  const add = (geo, m) => { const q = geo.index ? geo.toNonIndexed() : geo; q.applyMatrix4(m); for (const k of Object.keys(q.attributes)) if (k !== 'position' && k !== 'normal') q.deleteAttribute(k); parts.push(q); };
  const K = SHIP.keelH;
  add(profileGeo(E, BODY(K), SHIP.len), new THREE.Matrix4());
  for (const x of LOBES) add(new THREE.SphereGeometry(1, 28, 12), E.M4(x, K + LOBE.y, 0, 0, 0, 0, LOBE.rx, LOBE.ry, LOBE.rz));
  add(profileGeo(E, KEEL(K), 200), new THREE.Matrix4());
  for (const x of [-SHIP.len / 2 - 6, SHIP.len / 2 + 6]) { const c = new THREE.CylinderGeometry(6, 7, 26, 10); c.rotateZ(Math.PI / 2); add(c, E.M4(x, K + 14, 0)); }
  return E.mergeGeometries(parts);
}
// the fleet: the two ships close behind the first, then the formation in layers, each row further, smaller and paler
export function fleetSlots() {
  const r = mulberry(4242), slots = [];
  slots.push({ x: -170, y: 75, z: -480, s: 0.92, yaw: 0.12 }, { x: 240, y: 95, z: -680, s: 0.88, yaw: -0.18 });
  // rows at nearly one altitude, so each further row sits lower toward the horizon with a band of sky between rows
  const rows = [[4, -1650, 255, 1150], [6, -2550, 245, 1650], [8, -3650, 230, 2300], [12, -5050, 210, 3200], [16, -7050, 190, 4400]];
  rows.forEach(([n, z, y, spread], k) => {
    for (let i = 0; i < n; i++) slots.push({ x: -spread + (i + 0.5 + (r() - 0.5) * 0.3) * (2 * spread / n) + (k % 2 ? 0.5 : 0) * (spread / n), y: y + (r() - 0.5) * 16, z: z + (r() - 0.5) * 140, s: 0.82 + r() * 0.14, yaw: (r() - 0.5) * 0.5 });
  });
  return slots;
}
function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// a soft additive shaft (the bars of sunrise, the ward cone)
function beamMaterial(color, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: o.strength ?? 0.2 }, uTop: { value: o.top ?? 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vH; void main(){ vH = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uStrength, uTop; varying vec3 vN; varying vec3 vV; varying float vH;
      void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float a = pow(f, 2.0) * uStrength * mix(1.0, smoothstep(0.0, 1.0, vH), uTop) * smoothstep(0.0, 0.08, vH);
        gl_FragColor = vec4(uColor * a, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
// an open prism (no end caps: a cap facing the lens reads as a bright card), uv.y = 0 at the foot .. 1 at the top
function shaftGeometry(seg = 8) {
  const g = new THREE.CylinderGeometry(0.5, 0.5, 1, seg, 1, true); g.translate(0, 0.5, 0);
  const uv = g.attributes.uv, pos = g.attributes.position; for (let k = 0; k < uv.count; k++) uv.setY(k, pos.getY(k));
  return g;
}

const A = L.arch, H = SHIP.hover;
const survivors = (n = 11) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`sv${i}`, { kind: i % 4 === 3 ? 'child' : 'civilian', pos: [A.x - 1.5 + (i % 6) * 0.62, A.z - 0.3 + Math.floor(i / 6) * 0.8], face: 180 + (i % 3 - 1) * 20, pose: i % 5 === 2 ? 'lookUp' : 'stand' }]));
const PRESETS = {
  // bible p.9 key 9: out of the sunrise a dark mass; the broken gate towers give its size; the army line below
  firstShip: {
    t: 2,
    state: { look: { base: 'ship', fog: { density: 0.00016 }, haze: { amount: 0.0005, falloff: 10 } }, ship: { pos: [40, 40, -1100] }, fleet: { count: 0 },
      army: { from: [-150, 600], to: [150, 600], rows: 2, spacing: 1.6, rowGap: 2.2, facing: 0, poles: 0.1 } },
    cam: { pos: [-10, 1.7, 1230], target: [-10, 50, -1100], f: 100 },
  },
  // bible p.9 key 10: the ward. Violet from the keel on the survivors, gold everywhere else; bars of sun through the
  // rigging; the arch stopped above their heads; soldiers with poles at the left
  ward: {
    t: 3,
    state: {
      look: 'ward', ship: { pos: H }, fleet: { count: 0 }, ward: { drop: 1, radius: 8 },
      arch: { broken: 1, stones: 1 },
      bars: { count: 6, x0: A.x - 50, spacing: 16, z: A.z + 4, width: 3.0, strength: 0.09, sweep: 0.6 },
      figures: { ...survivors(11), liora: { pos: [A.x + 1.9, A.z + 1.6], face: 160, mirror: true, flash: 0 }, boy: { pos: [A.x - 0.4, A.z + 0.4], face: 200, pose: 'lookUp' },
        s1: { kind: 'soldier', pos: [A.x - 22, A.z + 22], face: 60 }, s2: { kind: 'guard', pos: [A.x - 20, A.z + 25], face: 60 }, s3: { kind: 'soldier', pos: [A.x - 17.5, A.z + 21], face: 70 },
        s4: { kind: 'guard', pos: [A.x - 15.5, A.z + 24], face: 70 }, s5: { kind: 'soldier', pos: [A.x - 13, A.z + 22], face: 80 } },
    },
    cam: { pos: [A.x - 4, 1.8, A.z + 46], target: [A.x - 4, 9.5, A.z], f: 22 },
  },
  // bible p.10: the banners. The army under its banners, the ruined capital between, the coalition filling the sky
  banners: {
    t: 4,
    state: {
      look: 'banners', ship: { pos: [-150, 28, 300] }, fleet: { count: 60 }, housings: 1,
      army: { from: [-120, 532], to: [120, 532], rows: 3, spacing: 1.45, rowGap: 2.0, facing: 0, poles: 0.16, bannersOpen: 0.8, notAll: 0.72 },
      figures: { cael: { pos: [0, 527], face: 0, pose: 'stand' } },
    },
    cam: { pos: [0, 1.5, 612], target: [0, 54, -300], f: 28 },
  },
  // 10.3 the open hand, "another protects": the ward officer's left hand, palm on, behind the round glass
  hand103: {
    state: { look: 'ward', ship: { pos: H }, ward: { drop: 0 }, maskFlash: 0.6, figures: { ward: { pos: 'pod', face: 'podOut', pose: 'stand', aimL: 'podOut', palmL: 'podOut', handL: 1 } },
      hand: { attach: 'ward', side: 'L', style: 'ward', open: 1, view: 'palm' } },
    cam: { hand: true, f: 50 },
  },
  // 10.10 closed: war. Cael forces the hand shut (the same size and angle)
  hand1010: {
    state: { look: 'banners', ship: { pos: [-150, 28, 300] }, fleet: { count: 60 }, housings: 1,
      figures: { cael: { pos: [0, 527], face: 0, pose: 'stand', aimR: [0, 30, -300], palmR: 'out', handR: 0 } },
      hand: { attach: 'cael', side: 'R', style: 'cael', open: 0, shake: 0.2 } },
    cam: { hand: true, f: 50 },
  },
};

export default {
  look: 'ward',
  marks: { arch: [A.x, 0, A.z], underArch: [A.x, 0, A.z + 0.2], hover: H, emitter: H, gate: [0, 0, 0], towerW: [L.towers[0].x, 0, 0], towerE: [L.towers[1].x, 0, 0] },
  build(E, o = {}) {
    const ctx = buildRuins(E, o);
    const W = E.world;
    ctx.ship = buildFirstShip(E, W);
    // the fleet
    const slots = fleetSlots();
    const fg = fleetGeometry(E);
    ctx.fleet = new THREE.InstancedMesh(fg, E.mat('#2a2b2e', { rough: 0.85, rim: true }), slots.length);
    ctx.fleet.castShadow = true; ctx.fleet.receiveShadow = false; ctx.fleet.frustumCulled = false;
    W.add(ctx.fleet); ctx.slots = slots;
    // the ward: a cone of violet light from the emitter, a violet pool on the ground, and its spot light
    const cg = new THREE.CylinderGeometry(0.02, 1, 1, 48, 1, true); cg.translate(0, -0.5, 0);
    ctx.cone = new THREE.Mesh(cg, beamMaterial('#7C4DF0', { strength: 0.42, top: 0.5 })); ctx.cone.frustumCulled = false; ctx.cone.renderOrder = 30; W.add(ctx.cone);
    ctx.coneCore = new THREE.Mesh(cg, beamMaterial('#b49cff', { strength: 0.16, top: 0.8 })); ctx.coneCore.frustumCulled = false; ctx.coneCore.renderOrder = 31; W.add(ctx.coneCore);
    ctx.wardPool = E.pool('#7C4DF0', 1, 0.8, W, 0, 0.02, 0, { soft: 1.4 });
    ctx.wardLight = E.spotLight('#8a5cff', 0, 160, 0.4, 0.6);
    // bars of sunrise through the rigging: long soft shafts along the sun, and the one spot that crosses Liora
    ctx.bars = [];
    const sg = shaftGeometry();
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(sg, beamMaterial('#FFD48A', { strength: 0.16, top: 0 })); m.frustumCulled = false; m.renderOrder = 25; W.add(m); ctx.bars.push(m);
    }
    ctx.barLight = E.spotLight('#FFD48A', 0, 300, 0.03, 0.4);
    ctx.flashLight = E.pointLight('#ffffff', 0, 12, 2);
    ctx.podLight = E.pointLight('#efe3cc', 0, 8, 2);
    // two free detailed hands (the hero-hand model) for inserts that need both of someone's hands
    ctx.hands2 = [['liora', 'L'], ['liora', 'R']].map(([style, side]) => { const h = makeHeroHand(E, { style, side }); h.root.visible = false; W.add(h.root); return { h, style, side }; });          // sunrise bounced up into the glass (keeps her glove pale)
    // the glint: the one point of white when the mirror catches a bar of sun (10.1); a fixed-size point at any distance
    ctx.glint = makePoints(E, W, [[0, 0, 0]], { color: '#ffffff', px: 4, nearPx: 7, ref: 60, vary: 0 });
    ctx.glint.pts.renderOrder = 40; ctx.glint.pts.material.depthTest = false;
    // the fleet's housings: 13 amber points along each fleet ship's south chamfer, opening west to east like the first's
    const fh = [], seeds = [];
    for (let i = 0; i < slots.length; i++) for (let k = 0; k < 13; k++) { fh.push([0, 0, 0]); seeds.push((k + 0.5) / 13); }
    ctx.fleetHousings = makePoints(E, W, fh, { color: '#FFC070', px: 2.5, nearPx: 5, ref: 900, vary: 0.2 });
    const fs = ctx.fleetHousings.g.attributes.seed; seeds.forEach((v, i) => fs.setX(i, v)); fs.needsUpdate = true;
    // the four white points the mirror throws on the belly (10.2): small unlit discs facing down
    ctx.flashes = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), E.lampMat('#ffffff', 3, { double: true }));
      m.rotation.x = Math.PI / 2; m.visible = false; m.frustumCulled = false; W.add(m); ctx.flashes.push(m);
    }
    // marks that move with the ship: 'pod' (the officer's footplate inside the glass), 'podOut' (below the glass, toward
    // the arch), 'glass' (the centre of the glass), 'emitter' (the ward lamp under the keel)
    const P = (x, y, z) => () => { ctx.ship.g.updateMatrixWorld(true); return ctx.ship.pod.localToWorld(new THREE.Vector3(x, y, z)); };
    ctx.dyn = { pod: P(0, -1.98, 0), podOut: P(9, -12.3, -6.9), glass: P(0, -1.2, 0), podEye: P(0, -0.42, 0),
      emitter: () => ctx.ship.emitter.getWorldPosition(new THREE.Vector3()) };
    ctx.presets = PRESETS;
    return ctx;
  },
  update(E, R, t, ctx) {
    updateRuins(E, R, t, ctx);
    const S = R.ship ?? {};
    // the first ship: explicit pos, or approach 0 (far, in the sunrise) .. 1 (the hover over the arch)
    let pos = S.pos;
    if (!pos) { const k = S.approach ?? 1, e = k * k * (3 - 2 * k); pos = SHIP.far.map((v, i) => v + (H[i] - v) * e); }
    const sh = ctx.ship;
    sh.g.position.set(...pos); sh.g.rotation.set(0, (S.yaw ?? 0) * Math.PI / 180, (S.roll ?? 0) * Math.PI / 180);
    sh.g.visible = S.visible ?? true;
    sh.g.updateMatrixWorld(true);
    const hl = Math.max(0, Math.min(1, R.housings ?? 0));
    sh.housings.u.uLevel.value = 2.2; sh.housings.pts.visible = hl > 0.001; sh.housings.u.uOn.value = hl;
    sh.glassMat.opacity = R.glass ?? 0.3;
    const rl = R.shipLights ?? 0;
    sh.runLights.pts.visible = rl > 0.01; sh.runLights.u.uLevel.value = 1.6 * rl;
    // the fleet: the first `count` slots; a fractional count brings the next ones out of the haze one after another
    const F = R.fleet ?? {}, cnt = Math.max(0, F.count ?? 0), ap = F.approach ?? 1, ramp = Math.max(F.ramp ?? 1, 1e-3), depth = F.depth ?? 2200;
    const n = Math.min(Math.ceil(cnt), ctx.slots.length);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const s = ctx.slots[i], k = Math.max(0, Math.min(1, (cnt - i) / ramp)), e = k * k * (3 - 2 * k);
      m4.compose(new THREE.Vector3(s.x, s.y, s.z - (1 - ap) * 3000 - (1 - e) * depth), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s.yaw ?? 0, 0)), new THREE.Vector3(s.s, s.s, s.s));
      ctx.fleet.setMatrixAt(i, m4);
      const hp = ctx.fleetHousings.g.attributes.position;
      for (let k = 0; k < 13; k++) { const v = new THREE.Vector3(-180 + k * 30, SHIP.keelH + 8.6, 31).applyMatrix4(m4); hp.setXYZ(i * 13 + k, v.x, v.y, v.z); }
      hp.needsUpdate = true;
    }
    ctx.fleet.count = n; ctx.fleet.visible = n > 0; ctx.fleet.instanceMatrix.needsUpdate = true;
    ctx.fleetHousings.g.setDrawRange(0, n * 13);
    const fhl = Math.max(0, Math.min(1, R.fleetHousings ?? R.housings ?? 0));
    ctx.fleetHousings.pts.visible = n > 0 && fhl > 0.001; ctx.fleetHousings.u.uOn.value = fhl; ctx.fleetHousings.u.uLevel.value = 2.0;
    // the ward: drop 0..1 lowers the violet cone from the emitter to the ground
    const Wd = R.ward ?? {}, drop = Wd.drop ?? 0, rad = Wd.radius ?? 8;
    const em = sh.emitter.getWorldPosition(new THREE.Vector3());
    const Hh = Math.max(em.y, 0.1);
    ctx.cone.visible = ctx.coneCore.visible = drop > 0.001;
    ctx.cone.position.copy(em); ctx.cone.scale.set(rad * drop, Hh * drop, rad * drop);
    ctx.coneCore.position.copy(em); ctx.coneCore.scale.set(rad * 0.45 * drop, Hh * drop, rad * 0.45 * drop);
    ctx.cone.material.uniforms.uStrength.value = Wd.glow ?? 0.42;
    ctx.coneCore.material.uniforms.uStrength.value = Wd.core ?? 0.16;
    ctx.wardPool.position.set(em.x, 0.03, em.z); ctx.wardPool.scale.set(rad * 1.3, rad * 1.3, 1);
    ctx.wardPool.material.uniforms.uStrength.value = (Wd.pool ?? 0.7) * Math.max(0, drop - 0.85) / 0.15;
    ctx.wardLight.position.copy(em); ctx.wardLight.target.position.set(em.x, 0, em.z); ctx.wardLight.target.updateMatrixWorld();
    ctx.wardLight.angle = Math.atan(rad * 1.25 / Hh); ctx.wardLight.intensity = drop >= 0.98 ? (Wd.light ?? 9000) : 0;
    sh.emDisc.visible = sh.emCore.visible = (Wd.lamp ?? drop > 0) ? true : false;
    // bars of sunrise: {count, x0, spacing, z, width, strength, sweep (m/s)} landing along a line on the ground
    const Bs = R.bars, kd = (E.R.look && typeof E.R.look === 'object' && E.R.look.key?.dir) || (E.LOOKS[typeof R.look === 'string' ? R.look : (R.look?.base ?? 'ward')]?.key.dir) || [-0.45, 0.35, -1];
    const sun = new THREE.Vector3(...kd).normalize();
    ctx.bars.forEach((m, i) => {
      const on = Bs && i < (Bs.count ?? 6);
      m.visible = !!on;
      if (!on) return;
      const x = (Bs.x0 ?? A.x - 40) + i * (Bs.spacing ?? 12) + (Bs.sweep ?? 0) * t, z = (Bs.z ?? A.z) + ((i * 7) % 5 - 2) * 2;
      const len = (Bs.top ?? 70) / Math.max(sun.y, 0.05);
      m.position.set(x, 0, z);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sun);
      m.scale.set(Bs.width ?? 3, len, (Bs.width ?? 3) * 0.6);
      m.material.uniforms.uStrength.value = (Bs.strength ?? 0.16) * (0.7 + 0.3 * ((i * 5) % 3) / 2);
    });
    // the bar that crosses Liora: a gold spot along the sun onto a target (bar: 'liora' or [x,y,z])
    if (R.bar) {
      const p = E.where(R.bar);
      ctx.barLight.position.copy(p).addScaledVector(sun, 80); ctx.barLight.target.position.copy(p); ctx.barLight.target.updateMatrixWorld();
      ctx.barLight.intensity = R.barPower ?? 60000;
    } else ctx.barLight.intensity = 0;
    // the four flashes cross the mask: a white light in the glass (maskFlash 0..1)
    const pp = sh.pod.localToWorld(new THREE.Vector3(0, -0.6, 0));
    ctx.flashLight.position.copy(pp); ctx.flashLight.intensity = 400 * (R.maskFlash ?? 0);
    ctx.podLight.position.copy(sh.pod.localToWorld(new THREE.Vector3(0.4, -1.0, 0.6))); ctx.podLight.intensity = 60 * (R.podLight ?? 0);
    // the free hands: rebuilt only if a shot asks for another style or side
    const H2 = R.hands2 ?? [];
    ctx.hands2.forEach((slot, i) => {
      const p = H2[i];
      if (!p || p.visible === false) { slot.h.root.visible = false; return; }
      if ((p.style ?? slot.style) !== slot.style || (p.side ?? slot.side) !== slot.side) {
        E.world.remove(slot.h.root); slot.style = p.style ?? slot.style; slot.side = p.side ?? slot.side;
        slot.h = makeHeroHand(E, { style: slot.style, side: slot.side }); E.world.add(slot.h.root);
      }
      poseHeroHand(E, slot.h, { ...p, attach: undefined, side: slot.side }, t);
    });
    // the glint: {at: mark | [x,y,z], level 0..1}
    const G = R.glint;
    ctx.glint.pts.visible = !!G && (G.level ?? 1) > 0.02;
    if (ctx.glint.pts.visible) { const p = E.where(G.at ?? 'liora.mirror'); ctx.glint.g.attributes.position.setXYZ(0, p.x, p.y, p.z); ctx.glint.g.attributes.position.needsUpdate = true; ctx.glint.u.uLevel.value = 3 * (G.level ?? 1); }
    // the four white points on the belly: [{at, t0, t1, size}] (shot seconds), on for t0..t1
    const FL = R.flashes ?? [];
    ctx.flashes.forEach((m, i) => {
      const f = FL[i];
      m.visible = !!f && t >= (f.t0 ?? 0) && t <= (f.t1 ?? 1e9);
      if (!m.visible) return;
      m.position.set(...f.at); const s = f.size ?? 1; m.scale.set(s, s, s);
    });
  },
  beforeRender(E, R, t, ctx, cam) {
    ruinsBeforeRender(E, R, t, ctx, cam);
    for (const P of [ctx.ship.housings, ctx.ship.runLights, ctx.glint, ctx.fleetHousings]) { P.u.fogColor.value.copy(E.scene.fog.color); P.u.fogDensity.value = E.scene.fog.density; }
  },
};
