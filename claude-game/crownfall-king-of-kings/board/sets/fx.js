// Atmosphere and debris effects for the forecourt (sc. 3) and the ruins (sc. 8): every one is off unless a shot's
// state asks for it, so the sets that build on these (gatehouse views, the ship set) are unchanged.
//   veils  [{at: [x,y,z] | mark, size: [w,h], opacity, yaw?, color?, grad?, noise?, soft?: [x,y]}]
//          soft dust curtains (cards that turn to the camera about y). They lift what is behind them toward the haze
//          colour, so a stair, a block or a man reads as a silhouette against the dust in front of a near wall.
//   shell  {t, at: [x,y,z], normal?: [x,y,z], power?}  a shell bursting on stone: an amber flash for two frames (a small
//          unlit shape and a short point light), stone spray falling under gravity, a puff of dust.
//   bursts [{t, at, n, r0, r1, life, rise, spread, opacity, lit, shade, ground}]  dust puffs (the block landing, 3.6).
import * as THREE from 'three';
import { puffMaterial } from './fall.js';

const SPH = new THREE.SphereGeometry(1, 16, 10);
const resolveAt = (E, a) => (Array.isArray(a) ? new THREE.Vector3(...a) : E.where(a));

// ---------------------------------------------------------------- veils
const VEIL_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const VEIL_FS = `uniform vec3 uColor; uniform float uOpacity, uGrad, uNoise, uTime; uniform vec2 uSoft, uSize; varying vec2 vUv;
  float h1(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h1(i), h1(i + vec2(1.0, 0.0)), f.x), mix(h1(i + vec2(0.0, 1.0)), h1(i + vec2(1.0, 1.0)), f.x), f.y); }
  void main(){
    float ex = smoothstep(0.0, uSoft.x, vUv.x) * smoothstep(0.0, uSoft.x, 1.0 - vUv.x);
    float ey = smoothstep(0.0, uSoft.y, vUv.y) * smoothstep(0.0, uSoft.y, 1.0 - vUv.y);
    float g = mix(1.0, 1.0 - 0.85 * vUv.y, uGrad);
    vec2 p = vUv * uSize;
    float nz = 0.6 * vn(p * 0.32 + vec2(uTime * 0.04, uTime * 0.1)) + 0.4 * vn(p * 0.9 + vec2(-uTime * 0.07, uTime * 0.25));
    float nn = mix(1.0, 0.45 + 1.1 * nz, uNoise);
    gl_FragColor = vec4(uColor, clamp(uOpacity * ex * ey * g * nn, 0.0, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
export function makeVeils(E, W, n = 8) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: 0 }, uGrad: { value: 0.4 }, uNoise: { value: 0.5 }, uTime: { value: 0 },
        uSoft: { value: new THREE.Vector2(0.3, 0.3) }, uSize: { value: new THREE.Vector2(1, 1) } },
      vertexShader: VEIL_VS, fragmentShader: VEIL_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }));
    m.visible = false; m.frustumCulled = false; m.renderOrder = 6; m.castShadow = false; m.receiveShadow = false;
    W.add(m); list.push({ m, spec: null });
  }
  return {
    update(E, specs = [], t = 0) {
      list.forEach((v, i) => {
        const s = specs[i];
        v.spec = s ?? null;
        v.m.visible = !!s && (s.opacity ?? 0.5) > 0.001;
        if (!v.m.visible) return;
        const at = resolveAt(E, s.at), size = s.size ?? [10, 8];
        v.m.position.copy(at); v.m.scale.set(size[0], size[1], 1);
        const u = v.m.material.uniforms;
        u.uOpacity.value = s.opacity ?? 0.5; u.uGrad.value = s.grad ?? 0.4; u.uNoise.value = s.noise ?? 0.5; u.uTime.value = t + i * 3.1;
        u.uSoft.value.set(...(s.soft ?? [0.3, 0.3])); u.uSize.value.set(size[0], size[1]);
        if (s.color) u.uColor.value.set(s.color);
      });
    },
    beforeRender(E) {
      for (const v of list) {
        if (!v.m.visible) continue;
        const s = v.spec;
        if (s.yaw !== undefined) v.m.rotation.set(0, s.yaw * Math.PI / 180, 0);
        else v.m.rotation.set(0, Math.atan2(E.camera.position.x - v.m.position.x, E.camera.position.z - v.m.position.z), 0);
        if (!s.color) v.m.material.uniforms.uColor.value.copy(E.scene.fog.color);
      }
    },
  };
}

// ---------------------------------------------------------------- dust puffs (pool shared by shells and bursts)
function makePuffPool(E, W, n, o = {}) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(SPH, puffMaterial(E, { lit: o.lit ?? '#b9bbb6', shade: o.shade ?? '#6c7074', soft: 1.8 }));
    m.visible = false; m.frustumCulled = false; m.renderOrder = 7; W.add(m); list.push(m);
  }
  return list;
}
// one burst of puffs at time t: deterministic per burst index
function placeBurst(E, pool, start, b, t, seed) {
  const n = Math.min(b.n ?? 10, pool.length - start);
  const age = t - (b.t ?? 0), life = b.life ?? 3;
  const at = resolveAt(E, b.at);
  let r = seed >>> 0;
  const rnd = () => { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; };
  for (let i = 0; i < n; i++) {
    const m = pool[start + i];
    const a = rnd() * Math.PI * 2, sp = (b.spread ?? 4) * (0.4 + 0.6 * rnd()), up = (b.rise ?? 1) * (0.3 + 0.7 * rnd());
    const delay = rnd() * (b.stagger ?? 0.25), k = Math.max(0, age - delay);
    m.visible = age >= delay && k < life;
    if (!m.visible) continue;
    const ease = 1 - Math.exp(-k * (b.drag ?? 1.6));            // fast out, then it hangs
    const dir = b.ground ? new THREE.Vector3(Math.cos(a), 0, Math.sin(a)) : new THREE.Vector3(Math.cos(a), (rnd() - 0.3) * 1.2, Math.sin(a)).normalize();
    if (b.normal) dir.add(new THREE.Vector3(...b.normal).multiplyScalar(b.push ?? 0.8)).normalize();
    const R = (b.r0 ?? 0.6) + ((b.r1 ?? 3) - (b.r0 ?? 0.6)) * Math.min(1, ease * 1.15) * (0.7 + 0.5 * rnd());
    m.position.set(at.x + dir.x * sp * ease, at.y + (b.ground ? R * 0.45 : 0) + dir.y * sp * ease + up * k * 0.6, at.z + dir.z * sp * ease);
    m.scale.set(R, R * (b.ground ? 0.62 : 0.9), R);
    const fade = Math.min(1, k / 0.12) * Math.max(0, 1 - Math.pow(k / life, 1.6));
    m.material.uniforms.uOpacity.value = (b.opacity ?? 0.6) * fade;
    if (b.lit) m.material.uniforms.uLit.value.set(b.lit);
    if (b.shade) m.material.uniforms.uShade.value.set(b.shade);
  }
  return n;
}

// ---------------------------------------------------------------- the shell, the spray, the bursts
export function makeImpacts(E, W, o = {}) {
  const pool = makePuffPool(E, W, o.puffs ?? 36, o);
  const flash = new THREE.Group(); W.add(flash); flash.visible = false;
  const core = E.mesh(new THREE.OctahedronGeometry(1, 0), E.lampMat('#FFF3D0', 5), flash, 0, 0, 0, { cast: false });
  const halo = E.mesh(new THREE.SphereGeometry(1, 12, 8), E.lampMat('#FF8A2E', 2.2), flash, 0, 0, 0, { cast: false });
  core.scale.set(0.5, 0.35, 0.5); halo.scale.set(0.9, 0.6, 0.9);
  const light = E.pointLight('#ffa060', 0, 22, 2);
  const N = o.chunks ?? 40;
  const chunks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), E.mat('#2a2d31', { rough: 0.95 }), N);
  chunks.frustumCulled = false; chunks.castShadow = true; chunks.visible = false; W.add(chunks);
  const r = E.rng(4242), seeds = Array.from({ length: N }, () => [r(), r(), r(), r(), r()]);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), EU = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3();
  return {
    update(E, R, t) {
      // the shell: flash for two frames, spray, a puff
      const sh = R.shell;
      flash.visible = false; light.intensity = 0; chunks.visible = false;
      let used = 0;
      pool.forEach(m => { m.visible = false; });
      if (sh) {
        const at = resolveAt(E, sh.at), dt = t - (sh.t ?? 0), nrm = new THREE.Vector3(...(sh.normal ?? [0, 0, 1])).normalize();
        if (dt >= 0 && dt < 2 / 24) {
          flash.visible = true; flash.position.copy(at).addScaledVector(nrm, 0.3);
          const s = (sh.power ?? 1) * (dt < 1 / 24 ? 1 : 0.6); flash.scale.setScalar(s);
          core.material = E.lampMat(dt < 1 / 24 ? '#FFFFFF' : '#FFF3D0', dt < 1 / 24 ? 8 : 4);
          light.position.copy(at).addScaledVector(nrm, 1.5); light.intensity = (sh.light ?? 600) * (dt < 1 / 24 ? 1 : 0.4);
        }
        if (dt >= 0 && dt < 3.5) {
          chunks.visible = true;
          seeds.forEach((sd, i) => {
            const k = Math.max(0, dt - sd[4] * 0.08);
            const sp = sh.spread ?? 1; const v = nrm.clone().multiplyScalar((3 + sd[0] * 5) * sp).add(new THREE.Vector3((sd[1] - 0.5) * 6 * sp, (0.5 + sd[2] * 3) * sp, (sd[3] - 0.5) * 3 * sp));
            P.copy(at).addScaledVector(v, k); P.y -= 0.5 * 9.81 * k * k;
            const floor = sh.floor ?? 0; if (P.y < floor) P.y = floor;
            const sz = (0.12 + sd[0] * 0.45) * (sh.size ?? 1);
            EU.set(k * (3 + sd[1] * 6), k * (2 + sd[2] * 5), k * sd[3] * 4); Q.setFromEuler(EU); S.set(sz, sz * (0.5 + sd[2] * 0.6), sz * (0.7 + sd[3] * 0.5));
            M.compose(P, Q, S); chunks.setMatrixAt(i, M);
          });
          chunks.instanceMatrix.needsUpdate = true;
        }
        if (dt >= 0) used += placeBurst(E, pool, used, { t: sh.t, at: sh.at, n: 10, r0: 0.6, r1: 4.5, spread: 5, rise: 1.4, life: 3.5, opacity: 0.75, normal: sh.normal ?? [0, 0, 1], push: 1.2, ...(sh.puff ?? {}) }, t, 77);
      }
      (R.bursts ?? []).forEach((b, i) => { if (t >= (b.t ?? 0)) used += placeBurst(E, pool, used, b, t, 1000 + i * 97); });
    },
    beforeRender(E) {
      for (const m of pool) if (m.visible) { m.material.uniforms.fogColor.value.copy(E.scene.fog.color); m.material.uniforms.fogDensity.value = E.scene.fog.density; }
    },
  };
}

// ---------------------------------------------------------------- light bars
// lightBars [{at: [x,y,z], size: [w,h], yaw (deg; the card faces +z rotated by yaw), color, strength, soft: [x,y]}]
//   a bar of low sun lying across stone (8.5: "a bar of sun lies across it, and grit falls through the bar"): an
//   additive soft-edged card a few centimetres off the surface. It colours the stone; it does not light figures.
export function makeLightBars(E, W, n = 3) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color() }, uStrength: { value: 0 }, uSoft: { value: new THREE.Vector2(0.2, 0.08) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uStrength; uniform vec2 uSoft; varying vec2 vUv;
        void main(){ float ex = smoothstep(0.0, uSoft.x, vUv.x) * smoothstep(0.0, uSoft.x, 1.0 - vUv.x);
          float ey = smoothstep(0.0, uSoft.y, vUv.y) * smoothstep(0.0, uSoft.y, 1.0 - vUv.y);
          gl_FragColor = vec4(uColor * uStrength * ex * ey, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    m.visible = false; m.frustumCulled = false; m.renderOrder = 5; W.add(m); list.push(m);
  }
  return {
    update(E, specs = []) {
      list.forEach((m, i) => {
        const s = specs[i]; m.visible = !!s && (s.strength ?? 1) > 0;
        if (!m.visible) return;
        m.position.copy(resolveAt(E, s.at)); m.scale.set(...(s.size ?? [0.6, 3]), 1);
        m.rotation.set(0, (s.yaw ?? 0) * Math.PI / 180, (s.roll ?? 0) * Math.PI / 180);
        const u = m.material.uniforms; u.uColor.value.set(s.color ?? '#ECD29A'); u.uStrength.value = s.strength ?? 1; u.uSoft.value.set(...(s.soft ?? [0.2, 0.08]));
      });
    },
  };
}
