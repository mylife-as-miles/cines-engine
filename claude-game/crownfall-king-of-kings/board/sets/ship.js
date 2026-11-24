// SCENES 9-10. EXT. THE FIRST SHIP / THE RUINS (bible p.9 keys 9 and 10, p.10 the banners; shots 9.1-9.2, 10.1-10.16)
// The ruins set plus the first ship, the fleet behind it, the ward, the bars of sunrise through the rigging, the army
// under its banners, and the masked ward officer behind the round observation glass.
// The first ship ("lifting envelopes over an armoured body, Kwind-09 iron hung with Korvenian silver; re-plated, built
// onto, year after year"): body 420 x 70 x 36 m, three lobed envelopes above, a keel 200 m long and 24 m deep below,
// silver points and hanging rings along the sides, rigging lines, 13 weapon housings, the observation pod (round
// glass) on the keel's south face, and the ward emitter at the keel's bottom centre. Its origin is the keel bottom
// centre; its long axis runs along x. Default hover: keel bottom 22 m over the arch, so the ward drops onto the arch.
import * as THREE from 'three';
import { buildRuins, updateRuins, ruinsBeforeRender, ARMY_PLAIN } from './ruins.js';
import { L, makePoints } from './solforiz.js';

export const SHIP = { len: 420, width: 70, keelH: 24, bodyTop: 60, hover: [L.arch.x, 17, L.arch.z], far: [L.arch.x - 60, 380, -5600],
  pod: { x: -36, y: 9, z: 9.5 }, housings: 13 };

function profileGeo(E, pts, len) {
  const g = E.extrude(pts, len); g.rotateY(Math.PI / 2); return g;   // extrude along x, profile in (z, y)
}
// the first ship (full detail) — returns handles; origin at the keel bottom centre
export function buildFirstShip(E, parent) {
  const g = new THREE.Group(); parent.add(g);
  const iron = E.mat('#2b2d31', { rough: 0.7, metal: 0.35, rim: true }), soot = E.mat('#141416', { rough: 0.9, rim: true });
  const plate = E.mat('#3B3D40', { rough: 0.6, metal: 0.4, rim: true }), patch = E.mat('#1d1f22', { rough: 0.8, rim: true });
  const silver = E.mat('#B9BEC3', { rough: 0.2, metal: 0.9, rim: true });
  const env = E.mat('#232427', { rough: 0.85, rim: true });
  const b = new E.Batch('ship');
  const K = SHIP.keelH, len = SHIP.len;
  // the armoured body: a hexagonal section, flat ends with chamfered plates
  b.add(profileGeo(E, [[-35, K + 36], [35, K + 36], [35, K + 18], [26, K + 2], [-26, K + 2], [-35, K + 18]], len), iron, E.M4(0, 0, 0));
  for (const sx of [-1, 1]) b.box(10, 30, 60, iron, sx * (len / 2 + 3), K + 20, 0, 0, 0, sx * 0.35);
  // the grid: strakes and frames, re-plated patches (built onto, year after year)
  for (const y of [K + 8, K + 14, K + 22, K + 30]) for (const sz of [-1, 1]) b.box(len, 0.7, 0.7, plate, 0, y, sz * (y > K + 18 ? 35.4 : 30.5 + (y - K) * 0.3));
  for (let x = -len / 2 + 8; x < len / 2; x += 15) for (const sz of [-1, 1]) b.box(0.9, 18, 0.7, plate, x, K + 27, sz * 35.4);
  const r = E.rng(1201);
  for (let i = 0; i < 46; i++) { const sz = r() < 0.5 ? -1 : 1; b.box(8 + r() * 26, 3 + r() * 9, 0.9, r() < 0.5 ? patch : plate, (r() - 0.5) * (len - 30), K + 20 + r() * 14, sz * 35.6); }
  // three lobed lifting envelopes over the body (the scalloped top in key p.9)
  for (const x of [-140, 0, 140]) { const e = new THREE.SphereGeometry(1, 36, 18); b.add(e, env, E.M4(x, K + 36 + 26, 0, 0, 0, 0, 84, 38, 40)); }
  for (const x of [-210, -70, 70, 210]) b.box(6, 22, 50, iron, x, K + 44, 0);
  // the keel: a trapezoid prism under the centre
  b.add(profileGeo(E, [[-15, K + 2], [15, K + 2], [5, 0], [-5, 0]], 200), soot, E.M4(0, 0, 0));
  // engines at the ends
  for (const x of [-len / 2 - 6, len / 2 + 6]) for (const sz of [-1, 1]) { const c = new THREE.CylinderGeometry(6, 7, 26, 16); c.rotateZ(Math.PI / 2); b.add(c, soot, E.M4(x, K + 14, sz * 22)); }
  b.build(g);
  // Korvenian silver: points along both sides and rings hung under them
  const sb = new E.Batch('ship-silver');
  for (let x = -len / 2 + 15; x < len / 2 - 10; x += 21) for (const sz of [-1, 1]) {
    sb.add(new THREE.SphereGeometry(1.6, 12, 8), silver, E.M4(x, K + 26, sz * 36));
    const ring = new THREE.TorusGeometry(2.2, 0.32, 8, 20); sb.add(ring, silver, E.M4(x, K + 21.6, sz * 36.2));
  }
  sb.build(g);
  // rigging: lines hanging from the body's lower edges, and stays from the envelopes
  const rb = new E.Batch('rigging');
  const rope = E.mat('#121214', { rim: true });
  for (let x = -len / 2 + 12; x < len / 2; x += 23) for (const sz of [-1, 1]) {
    const h = 8 + r() * 22;
    rb.add(new THREE.CylinderGeometry(0.28, 0.28, h, 4), rope, E.M4(x + (r() - 0.5) * 6, K + 2 - h / 2, sz * 26.5));
  }
  for (let i = 0; i < 18; i++) { const x = -len / 2 + 20 + i * 22, sz = i % 2 ? 1 : -1; const h = 40; rb.add(new THREE.CylinderGeometry(0.22, 0.22, h, 4), rope, E.M4(x, K + 50, sz * 36, sz * 0.5, 0, 0)); }
  rb.build(g, { cast: true });
  // weapon housings: hatches along the near (south, +z) lower chamfer; their points of amber open with `housings`
  const hb = new E.Batch('housings');
  const hpos = [];
  for (let i = 0; i < SHIP.housings; i++) { const x = -180 + i * 30; hb.box(6, 3.5, 1.2, patch, x, K + 9, 31.4, 0.5, 0, 0); hpos.push([x, K + 7.6, 33.6]); }
  hb.build(g);
  const housings = makePoints(E, g, hpos, { color: '#FFC070', px: 5, nearPx: 10, ref: 300, vary: 0.2 });
  // the observation pod: a short open cylinder out of the keel's south face, round glass, silver rim; the officer inside
  const P = SHIP.pod;
  const pod = new THREE.Group(); pod.position.set(P.x, P.y, P.z); pod.rotation.x = -0.45; g.add(pod);
  const shell = new THREE.CylinderGeometry(2.7, 2.9, 5.5, 32, 1, true); shell.rotateX(Math.PI / 2);
  E.mesh(shell, E.mat('#1a1a1d', { double: true, rim: true }), pod, 0, 0, 0);
  const back = new THREE.CircleGeometry(2.9, 32); E.mesh(back, E.mat('#0e0e10'), pod, 0, 0, -2.75);
  const rim = new THREE.TorusGeometry(2.75, 0.32, 10, 40); E.mesh(rim, silver, pod, 0, 0, 2.75);
  const glass = E.mesh(new THREE.CircleGeometry(2.7, 40), E.mat('#9aa4ab', { transparent: true, opacity: 0.18, rough: 0.05, metal: 0.2, depthWrite: false }), pod, 0, 0, 2.7, { cast: false });
  // the ward emitter at the keel's bottom centre: a small bright violet-white lamp (no halo)
  const emitter = new THREE.Group(); emitter.position.set(0, -0.2, 0); g.add(emitter);
  const emDisc = E.mesh(new THREE.CylinderGeometry(0.7, 1.0, 0.5, 20), E.lampMat('#b9a4ff', 1.6), emitter, 0, 0, 0, { cast: false });
  const emCore = E.mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12), E.lampMat('#ffffff', 4), emitter, 0, -0.35, 0, { cast: false });
  return { g, housings, pod, glass, emitter, emDisc, emCore };
}
// one merged far-LOD ship for the fleet (instanced)
function fleetGeometry(E) {
  const parts = [];
  const add = (geo, m) => { const q = geo.index ? geo.toNonIndexed() : geo; q.applyMatrix4(m); for (const k of Object.keys(q.attributes)) if (k !== 'position' && k !== 'normal') q.deleteAttribute(k); parts.push(q); };
  const K = SHIP.keelH;
  add(profileGeo(E, [[-35, K + 36], [35, K + 36], [35, K + 18], [26, K + 2], [-26, K + 2], [-35, K + 18]], SHIP.len), new THREE.Matrix4());
  for (const x of [-140, 0, 140]) add(new THREE.SphereGeometry(1, 24, 12), E.M4(x, K + 62, 0, 0, 0, 0, 84, 38, 40));
  add(profileGeo(E, [[-15, K + 2], [15, K + 2], [5, 0], [-5, 0]], 200), new THREE.Matrix4());
  return E.mergeGeometries(parts);
}
// the fleet: rows receding into the sunrise; reveal order = the two nearest first, then the formation, then more
export function fleetSlots() {
  const r = mulberry(4242), slots = [];
  slots.push({ x: -360, y: 70, z: -560, s: 0.95 }, { x: 330, y: 95, z: -700, s: 0.9 });
  for (let row = 1; row <= 7; row++) {
    const n = 3 + row * 2, z = -900 - row * 850, spread = 700 + row * 520;
    for (let i = 0; i < n; i++) slots.push({ x: -spread + (i + 0.5 + (r() - 0.5) * 0.5) * (2 * spread / n), y: 120 + r() * 160 + row * 22, z: z + (r() - 0.5) * 300, s: 0.55 + r() * 0.4 });
  }
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
    ctx.cone = new THREE.Mesh(cg, beamMaterial('#7C4DF0', { strength: 0.55, top: 0.5 })); ctx.cone.frustumCulled = false; ctx.cone.renderOrder = 30; W.add(ctx.cone);
    ctx.coneCore = new THREE.Mesh(cg, beamMaterial('#c8b6ff', { strength: 0.35, top: 0.8 })); ctx.coneCore.frustumCulled = false; ctx.coneCore.renderOrder = 31; W.add(ctx.coneCore);
    ctx.wardPool = E.pool('#7C4DF0', 1, 0.8, W, 0, 0.02, 0, { soft: 1.4 });
    ctx.wardLight = E.spotLight('#8a5cff', 0, 160, 0.4, 0.6);
    // bars of sunrise through the rigging: long soft shafts along the sun, and the one spot that crosses Liora
    ctx.bars = [];
    for (let i = 0; i < 10; i++) {
      const bg = new THREE.BoxGeometry(1, 1, 1); bg.translate(0, 0.5, 0);
      const uv = bg.attributes.uv; const pos = bg.attributes.position; for (let k = 0; k < uv.count; k++) uv.setY(k, pos.getY(k));
      const m = new THREE.Mesh(bg, beamMaterial('#FFD48A', { strength: 0.16, top: 0 })); m.frustumCulled = false; m.renderOrder = 25; W.add(m); ctx.bars.push(m);
    }
    ctx.barLight = E.spotLight('#FFD48A', 0, 300, 0.03, 0.4);
    ctx.flashLight = E.pointLight('#ffffff', 0, 12, 2);
    // marks that move with the ship: 'pod' (the officer's floor, inside the round glass), 'podOut' (outside the glass),
    // 'emitter' (the ward lamp under the keel), 'glass' (the centre of the round glass)
    const P = (x, y, z) => () => { ctx.ship.g.updateMatrixWorld(true); return ctx.ship.pod.localToWorld(new THREE.Vector3(x, y, z)); };
    ctx.dyn = { pod: P(0, -1.75, 0.2), podOut: P(0, -0.6, 14), glass: P(0, 0, 2.7),
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
    sh.housings.u.uLevel.value = 2.2 * (R.housings ?? 0); sh.housings.pts.visible = (R.housings ?? 0) > 0.01;
    sh.housings.u.uOn.value = R.housings ?? 0;
    // the fleet: the first `count` slots, flown in by fleet.approach (0 far .. 1 on station)
    const F = R.fleet ?? {}, n = Math.min(F.count ?? 0, ctx.slots.length), ap = F.approach ?? 1;
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const s = ctx.slots[i];
      m4.compose(new THREE.Vector3(s.x, s.y, s.z - (1 - ap) * 3000), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (s.x % 7) * 0.01, 0)), new THREE.Vector3(s.s, s.s, s.s));
      ctx.fleet.setMatrixAt(i, m4);
    }
    ctx.fleet.count = n; ctx.fleet.visible = n > 0; ctx.fleet.instanceMatrix.needsUpdate = true;
    // the ward: drop 0..1 lowers the violet cone from the emitter to the ground
    const Wd = R.ward ?? {}, drop = Wd.drop ?? 0, rad = Wd.radius ?? 8;
    const em = sh.emitter.getWorldPosition(new THREE.Vector3());
    const Hh = Math.max(em.y, 0.1);
    ctx.cone.visible = ctx.coneCore.visible = drop > 0.001;
    ctx.cone.position.copy(em); ctx.cone.scale.set(rad * drop, Hh * drop, rad * drop);
    ctx.coneCore.position.copy(em); ctx.coneCore.scale.set(rad * 0.45 * drop, Hh * drop, rad * 0.45 * drop);
    ctx.wardPool.position.set(em.x, 0.03, em.z); ctx.wardPool.scale.set(rad * 1.3, rad * 1.3, 1);
    ctx.wardPool.material.uniforms.uStrength.value = 0.7 * Math.max(0, drop - 0.85) / 0.15;
    ctx.wardLight.position.copy(em); ctx.wardLight.target.position.set(em.x, 0, em.z); ctx.wardLight.target.updateMatrixWorld();
    ctx.wardLight.angle = Math.atan(rad * 1.25 / Hh); ctx.wardLight.intensity = drop >= 0.98 ? (Wd.light ?? 9000) : 0;
    sh.emDisc.visible = sh.emCore.visible = (Wd.lamp ?? drop > 0) ? true : false;
    // bars of sunrise: {count, x0, spacing, z, width, strength, sweep (m/s)} landing along a line on the ground
    const Bs = R.bars, kd = (E.R.look && typeof E.R.look === 'object' && E.R.look.key?.dir) || (E.LOOKS[typeof R.look === 'string' ? R.look : 'ward']?.key.dir) || [-0.45, 0.35, -1];
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
    // the four flashes cross the mask: a white light in the pod (maskFlash 0..1)
    const pp = sh.pod.localToWorld(new THREE.Vector3(0, 0, 1.6));
    ctx.flashLight.position.copy(pp); ctx.flashLight.intensity = 400 * (R.maskFlash ?? 0);
  },
  beforeRender: ruinsBeforeRender,
};
