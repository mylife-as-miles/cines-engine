// SCENE 7. EXT. SOLFORIZ - THE FALL - CONTINUOUS (bible p.8 key 7; shots 7.1-7.4), and 6.9-6.10 if wanted.
// The same city, but every terrace above tier 1, the Crown and the towers are built as loose chunks driven by one
// clock: state.collapse = seconds since the collapse began (animate it: {clock: 0} or {keys: [[0, 0], [8, 8]]}).
//   c < 0      the city stands (the tower over the retaining wall is already down: crown.towerFall = 1)
//   c 0..4     the four pressure towers on tier 3 topple east like dominoes; the summit towers go
//   c 1..10    the terraces settle from the top down; houses lean together and go into dust; the stair goes
//   c 6..14    the whole upper city comes down; dust rises faster than the buildings fall, lit from above
//   c 14..26   the dust thins; the skyline is gone (state.dustThin multiplies the dust opacity)
// No fireball. Ochre enters the film here (look 'fall').
import * as THREE from 'three';
import { L, buildPlain, buildCauseway, buildWallAndGate, buildGatehouse, buildForecourt, buildBattery, buildArch, poseArch,
  buildStair, buildInnerWall, buildZiggurat, buildTower, crownFront } from './solforiz.js';

const T = L.tiers;
const FAR_PIVOT = [0, 0, -90];
// soft dust puffs: a sphere whose edges fade, lit from above (bible p.8: "the cloud is lit from above")
export function puffMaterial(E, o = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uLit: { value: new THREE.Color(o.lit ?? '#d9c69c') }, uShade: { value: new THREE.Color(o.shade ?? '#5e5546') }, uOpacity: { value: 0 },
      fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 }, uSoft: { value: o.soft ?? 1.6 } },
    transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vD; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vD = length(mv.xyz);
      vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uLit, uShade, fogColor; uniform float uOpacity, fogDensity, uSoft; varying vec3 vN; varying vec3 vV; varying float vD;
      void main(){ vec3 nv = normalize((viewMatrix * vec4(vN, 0.0)).xyz); float facing = abs(dot(nv, normalize(vV)));
        float a = pow(facing, uSoft) * uOpacity;
        vec3 c = mix(uShade, uLit, smoothstep(-0.4, 0.9, vN.y));
        float f = 1.0 - exp(-fogDensity * fogDensity * vD * vD); c = mix(c, fogColor, f * 0.8);
        gl_FragColor = vec4(c, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  return m;
}
const SPHG = new THREE.SphereGeometry(1, 18, 12);

// a pool of puffs a shot places by state (smoke at a muzzle, dust rolling down a flight, dust where a wall gives):
// puffs = [{at, t0, n, spread, r0, r1, rise, riseTau, drift: [dx, dy, dz], grow, stagger, jitter, life, fadeIn,
// opacity, lit, shade, soft, seed, upper}] (upper: `at` is in the capital's frame, state.far, city sets only)
export function buildPuffs(E, W, n = 48) {
  return Array.from({ length: n }, () => {
    const m = new THREE.Mesh(SPHG, puffMaterial(E)); m.frustumCulled = false; m.visible = false; m.renderOrder = 5; W.add(m); return m;
  });
}
export function updatePuffs(E, pool, list, t, upper) {
  let pi = 0;
  for (const P of list ?? []) {
    const r = E.rng(P.seed ?? 5), n = P.n ?? 6, sp = P.spread ?? [6, 3, 6];
    for (let k = 0; k < n && pi < pool.length; k++) {
      const m = pool[pi++];
      const dt0 = (P.stagger ?? 0.25) * k + r() * (P.jitter ?? 0.2);
      const tau = t - (P.t0 ?? 0) - dt0;
      const ox = (r() - 0.5) * sp[0], oy = r() * sp[1], oz = (r() - 0.5) * sp[2];
      const rs = 0.75 + 0.5 * r();
      if (tau <= 0) { m.visible = false; continue; }
      m.visible = true;
      const grow = 1 - Math.exp(-tau / (P.grow ?? 1.6));
      const rad = (P.r0 ?? 2) + ((P.r1 ?? 8) - (P.r0 ?? 2)) * grow * rs;
      const d = P.drift ?? [0, 0, 0], rise = (P.rise ?? 1) * (P.riseTau ?? 3) * (1 - Math.exp(-tau / (P.riseTau ?? 3)));
      const p = new THREE.Vector3(P.at[0] + ox + d[0] * tau, P.at[1] + oy + rise + d[1] * tau, P.at[2] + oz + d[2] * tau);
      if (P.upper && upper) upper.localToWorld(p);
      m.position.copy(p); m.scale.set(rad * 1.15, rad, rad);
      const life = P.life ?? 99, fadeIn = Math.min(1, tau / (P.fadeIn ?? 0.5)), fadeOut = 1 - Math.min(1, Math.max(0, tau - life) / 2);
      const u = m.material.uniforms;
      u.uOpacity.value = (P.opacity ?? 0.8) * fadeIn * fadeOut;
      u.uLit.value.set(P.lit ?? '#d9c69c'); u.uShade.value.set(P.shade ?? '#5e5546'); u.uSoft.value = P.soft ?? 1.6;
    }
  }
  for (; pi < pool.length; pi++) pool[pi].visible = false;
}

function buildChunks(E, W) {
  const chunks = [];
  const stone = E.mat('#2b3138', { rough: 0.95 }), face = E.mat('#262c33'), house = E.mat('#30363d'), houseD = E.mat('#24292f');
  const r = E.rng(707);
  for (let k = 2; k <= 7; k++) {
    const t = T[k], base = T[k - 1].top, hgt = t.top - base, next = T[k + 1];
    const width = 46, n = Math.ceil((2 * t.hw) / width);
    for (let i = 0; i < n; i++) {
      const xa = -t.hw + i * (2 * t.hw / n), xb = xa + 2 * t.hw / n, cx = (xa + xb) / 2;
      const piv = new THREE.Group(); piv.position.set(cx, base, t.front); W.add(piv);
      const b = new E.Batch(`chunk${k}_${i}`);
      // only the front 70 m of each terrace is modelled as loose; the core behind is hidden by the dust
      const depth = Math.min(t.front - t.back, 70);
      b.box(xb - xa - 0.6, hgt, depth, stone, 0, hgt / 2, -depth / 2);
      for (let x = xa + 6; x < xb - 3; x += 12) b.box(2.2, hgt, 1.4, face, x - cx, hgt / 2, 0.5);
      b.box(xb - xa, 1.6, 3, face, 0, hgt + 0.2, 0.8);
      if (xa < 14 && xb > -14) {                         // this chunk carries part of the great stair's flight
        const nn = 22, run = 26 / nn, h = hgt / nn;
        for (let s = 0; s < nn; s++) b.box(24, (s + 1) * h, run, face, -cx, (s + 1) * h / 2, 26 - (s + 0.5) * run);
      }
      const zMax = -7, zMin = next ? (next.front - t.front) + 4 : -depth + 10;
      const cnt = Math.round((xb - xa) / 330 * 110);
      for (let h = 0; h < cnt; h++) {
        const x = xa + 4 + r() * (xb - xa - 8), z = zMin + r() * (zMax - zMin);
        if (Math.abs(x) < (k <= 3 ? 96 : 42)) continue;  // a plaza around the great stair
        const w = 6 + r() * 10, d = 6 + r() * 9, hh = 3 + r() * 8;
        b.box(w, hh, d, r() < 0.5 ? house : houseD, x - cx, hgt + hh / 2, z);
      }
      b.build(piv);
      const delay = { 7: 1.2, 6: 2.4, 5: 4.0, 4: 5.6, 3: 7.0, 2: 8.6 }[k] + r() * 1.6 + Math.abs(cx) / 260;
      chunks.push({ piv, home: piv.position.clone(), delay, hgt: hgt + 30, tilt: [(r() - 0.3) * 0.5, (r() - 0.5) * 0.3, (r() - 0.5) * 0.5], slide: 0.12 + r() * 0.2, k });
    }
  }
  // the Crown in three pieces, and its towers
  const C = L.crown, cm = E.mat('#2a3037', { rough: 0.95 });
  for (let i = 0; i < 3; i++) {
    const piv = new THREE.Group(); piv.position.set(-C.hw + (i + 0.5) * (2 * C.hw / 3), C.y, C.z + C.d / 2); W.add(piv);
    const b = new E.Batch('crownchunk');
    b.box(2 * C.hw / 3 - 0.5, C.h, C.d, cm, 0, C.h / 2, -C.d / 2);
    if (i === 1) for (const x of [-16, 6]) b.box(7, 18, 8, cm, x, C.h + 9, -C.d / 2);
    b.build(piv);
    chunks.push({ piv, home: piv.position.clone(), delay: 0.6 + i * 0.5, hgt: C.h + 60, tilt: [0.3 * (i - 1), 0.1, 0.25 * (i - 1)], slide: 0.25, k: 8 });
  }
  return chunks;
}

const PRESETS = {
  // bible p.8 key 7: the stair at left with small figures; four towers with cross-arms toppling right into a lit cloud
  fall: {
    t: 0,
    state: {
      collapse: 3.7,
      crowd: [{ kind: ['civilian', 'civilian', 'child', 'civilian'], path: [[30, 8, -84], [54, 0, -84], [60, 0, -80]], count: 7, spacing: 3.1, speed: 1.8, start: 20, width: 5, pose: 'walk' }],
      figures: { liora: { pos: [33.5, 6.85, -84.5], face: 90, pose: 'run' } },
    },
    cam: { pos: [70, 1.5, -10], target: [60, 70, -200], f: 24 },
  },
};

export default {
  look: 'fall',
  marks: { stairFlight3Top: [0, T[3].top, T[3].front], stairFlight3Foot: [0, T[2].top, T[3].front + 26], arch: [L.arch.x, 0, L.arch.z], midTowers: L.midTowers.map(([x, z]) => [x, T[3].top, z]) },
  build(E, o = {}) {
    const W0 = E.world;
    buildPlain(E, W0, o); buildCauseway(E, W0, o); buildWallAndGate(E, W0, o);
    buildGatehouse(E, W0, {});
    buildForecourt(E, W0, { ...o, battery: false });
    const guns = buildBattery(E, W0, o);
    const arch = buildArch(E, W0, o);
    // the capital (everything inward of the forecourt) as one group that state.far can push back into the dust and
    // turn about the tier-0 front centre: far = {x, y, z, s, rotY (deg)}. Default: no change.
    const farOuter = new THREE.Group(), W = new THREE.Group(); farOuter.add(W); W0.add(farOuter);
    farOuter.position.set(...FAR_PIVOT); W.position.set(-FAR_PIVOT[0], -FAR_PIVOT[1], -FAR_PIVOT[2]);
    buildStair(E, W, o); buildInnerWall(E, W, o);
    buildZiggurat(E, W, { fromTier: 0, toTier: 1 });
    const chunks = buildChunks(E, W);
    // towers: the four on tier 3 (domino, east) and the three summit towers still standing (the fourth is down)
    const towers = [];
    L.midTowers.forEach(([x, z], i) => { const piv = new THREE.Group(); piv.position.set(x, T[3].top, z); W.add(piv); buildTower(E, piv, 56 + (i % 2) * 6); towers.push({ piv, start: 0.4 + (3 - i) * 0.75, dur: 3.6, dir: 1, axis: 'z' }); });
    L.crownTowers.forEach(([x, z], i) => { const piv = new THREE.Group(); piv.position.set(x, T[7].top, z); W.add(piv); buildTower(E, piv, 74 + (i % 2) * 8); towers.push({ piv, start: i === 0 ? -99 : 1.6 + i * 0.9, dur: 3.4, dir: i % 2 ? -1 : 1, axis: 'x' }); });
    // dust puffs: two per chunk, more around the towers
    const puffs = [];
    const r = E.rng(808);
    for (const ch of chunks) for (let k = 0; k < 4; k++) {
      const m = new THREE.Mesh(SPHG, puffMaterial(E)); m.frustumCulled = false; W.add(m);
      puffs.push({ m, at: ch.home.clone().add(new THREE.Vector3((r() - 0.5) * 44, ch.hgt * 0.3 + r() * 24, -r() * 40)), t0: ch.delay + r() * 1.4, v: 12 + r() * 12, r0: 8 + r() * 8, r1: 24 + r() * 22, drift: (r() - 0.5) * 3 });
    }
    for (const tw of towers) for (let k = 0; k < 3; k++) {
      const m = new THREE.Mesh(SPHG, puffMaterial(E)); m.frustumCulled = false; W.add(m);
      puffs.push({ m, at: tw.piv.position.clone().add(new THREE.Vector3(10 + k * 18, 10 + r() * 20, (r() - 0.5) * 20)), t0: Math.max(0, tw.start) + 1.2 + k * 0.7, v: 10 + r() * 6, r0: 10, r1: 35 + r() * 20, drift: 2 + r() * 2, tower: tw.start > -50 });
    }
    const extra = buildPuffs(E, W0, 40);
    return { guns, arch, chunks, towers, puffs, extra, farOuter, presets: PRESETS };
  },
  update(E, R, t, ctx) {
    const f = R.far ?? {};
    ctx.farOuter.position.set(FAR_PIVOT[0] + (f.x ?? 0), FAR_PIVOT[1] + (f.y ?? 0), FAR_PIVOT[2] + (f.z ?? 0));
    ctx.farOuter.rotation.set(0, (f.rotY ?? 0) * Math.PI / 180, 0); ctx.farOuter.scale.setScalar(f.s ?? 1);
    ctx.farOuter.updateMatrixWorld(true);
    const c = R.collapse ?? 0, g = 4.2;
    for (const ch of ctx.chunks) {
      const tau = Math.max(0, c - ch.delay);
      const sink = Math.min(0.5 * g * tau * tau, ch.hgt);
      const k = sink / ch.hgt;
      ch.piv.position.set(ch.home.x, ch.home.y - sink, ch.home.z + sink * ch.slide);
      ch.piv.rotation.set(ch.tilt[0] * k, ch.tilt[1] * k, ch.tilt[2] * k);
      ch.piv.visible = k < 0.999;
    }
    const shift = R.towerShift ?? 0;                     // seconds added to every tower's start (they topple later)
    for (const tw0 of ctx.towers) {
      const tw = tw0.start < -50 ? tw0 : { ...tw0, start: tw0.start + shift };
      const u = Math.min(1, Math.max(0, (c - tw.start) / tw.dur));
      const a = (tw.start < -50 ? 1 : u * u) * 1.45 * tw.dir;
      if (tw.axis === 'z') tw.piv.rotation.set(0, 0, -a); else tw.piv.rotation.set(a, 0, 0);
      tw.piv.position.y = (tw.axis === 'z' ? T[3].top : T[7].top) - Math.max(0, c - tw.start - tw.dur) * 6;
      tw.piv.visible = c - tw.start < tw.dur + 6 || tw.start < -50 ? true : false;
      tw.piv.scale.setScalar(tw.axis === 'z' ? (R.towerScale ?? 1) : 1);   // the four pressure towers, taller for a far wide (7.3)
    }
    const thin = R.dustThin ?? 1;
    for (const p of ctx.puffs) {
      const tau = c - p.t0 - (p.tower ? shift : 0);
      if (tau <= 0) { p.m.visible = false; continue; }
      p.m.visible = true;
      const rise = p.v * 4 * (1 - Math.exp(-tau / 4));
      const rad = p.r0 + (p.r1 - p.r0) * (1 - Math.exp(-tau / 3));
      p.m.position.set(p.at.x + p.drift * tau, p.at.y + rise, p.at.z + tau * 1.5);
      p.m.scale.set(rad * 1.15, rad, rad);
      const fadeIn = Math.min(1, tau / 0.6), fadeOut = 1 - Math.min(1, Math.max(0, tau - 12) / 12);
      p.m.material.uniforms.uOpacity.value = 0.85 * fadeIn * fadeOut * thin;
    }
    poseArch(ctx.arch, { lantern: 'smashed', ...(R.arch ?? {}) }, t);
    updatePuffs(E, ctx.extra, R.puffs, t, null);
  },
  beforeRender(E, R, t, ctx) {
    for (const m of ctx.extra) if (m.visible) { m.material.uniforms.fogColor.value.copy(E.scene.fog.color); m.material.uniforms.fogDensity.value = E.scene.fog.density; }
    for (const p of ctx.puffs) { p.m.material.uniforms.fogColor.value.copy(E.scene.fog.color); p.m.material.uniforms.fogDensity.value = E.scene.fog.density; }
  },
};
