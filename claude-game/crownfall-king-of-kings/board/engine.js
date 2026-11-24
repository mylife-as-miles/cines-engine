// Crownfall: King of Kings, blocking-storyboard engine.
// One three.js scene in real metres (y up). A set module (sets/<name>.js) builds the world and its colour key; a state
// object places figures, props and effects; setTime(t) evaluates everything that moves; renderShot(cam) renders a
// 2.39:1 picture through a Super 35 filmback. A post pass adds depth of field, heat warp, exposure, a clean clip and
// fine grain. There is no bloom, flare or glow anywhere: lamps are small bright shapes and nothing else.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeFigure, poseFigure, makeHeroHand, poseHeroHand, makeStretcher, CAST } from './figures.js';
import { compose, loadFonts } from './compose.js';
import { LOOKS } from './sets/looks.js';

export const W = 1280, H = 536;                  // picture: 2.39:1
export const SENSOR_W = 24.89;                    // Super 35 filmback width, mm
const SENSOR_H = SENSOR_W / (W / H);
const DEG = Math.PI / 180;

// ---------------------------------------------------------------- renderer and targets
// ?msaa=0 turns antialiasing off (about twice as fast under SwiftShader); the default is 4x.
const QUALITY = { samples: +(new URLSearchParams(location.search).get('msaa') ?? 4) };
const renderer = new THREE.WebGLRenderer({ antialias: QUALITY.samples > 0, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
// The usual path renders straight to the canvas: exposure, a clean clip (linear tone map = scale and clamp) and sRGB.
// Shots with depth of field or heat warp render to a float target and go through the post pass instead.
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setClearColor(0x000000, 1);
document.body.appendChild(renderer.domElement);
const rtMain = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: QUALITY.samples, depthBuffer: true });
const rtDepth = new THREE.WebGLRenderTarget(W / 2, H / 2, { type: THREE.UnsignedByteType });
const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });

// ---------------------------------------------------------------- fog: distance fog + ground haze + sun in-scatter
// Replaces three's fog chunks for every material: exponential distance fog (scene.fog = FogExp2), a height haze layer
// that thickens toward the ground, and the fog colour lifting toward the sun so silhouettes sit in a lit atmosphere.
const U = {
  uHaze: { value: new THREE.Vector4(0, 0, 30, 0) },          // x amount (per metre at base), y base height, z falloff m
  uHazeColor: { value: new THREE.Color(0x777777) },
  uFogSun: { value: new THREE.Vector4(0, 0.1, -1, 0) },      // xyz world dir toward the sun, w strength
  uFogSunColor: { value: new THREE.Color(0xffffff) },
  uRimColor: { value: new THREE.Color(0x000000) },
  uRimDir: { value: new THREE.Vector3(0, 0, -1) },           // view-space dir toward the back light
  uRimPow: { value: 4.0 },
};
THREE.ShaderChunk.fog_pars_vertex = `
#ifdef USE_FOG
  varying float vFogDepth;
  varying vec3 vFogWorld;
#endif`;
THREE.ShaderChunk.fog_vertex = `
#ifdef USE_FOG
  vFogDepth = length( mvPosition.xyz );
  vFogWorld = transpose( mat3( viewMatrix ) ) * ( mvPosition.xyz - viewMatrix[ 3 ].xyz );
#endif`;
THREE.ShaderChunk.fog_pars_fragment = `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vFogWorld;
  uniform vec4 uHaze;
  uniform vec3 uHazeColor;
  uniform vec4 uFogSun;
  uniform vec3 uFogSunColor;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`;
THREE.ShaderChunk.fog_fragment = `
#ifdef USE_FOG
  // distance per fragment (not per vertex: the plain is one huge quad)
  vec3 fogRay = vFogWorld - cameraPosition;
  float fogDist = length( fogRay );
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDist * fogDist );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, fogDist );
  #endif
  vec3 fogDir = fogRay / max( fogDist, 1e-4 );
  float fogSd = max( dot( fogDir, uFogSun.xyz ), 0.0 ); fogSd *= fogSd; float fogSunAmt = fogSd * fogSd * fogSd * uFogSun.w;
  vec3 fogCol = mix( fogColor, uFogSunColor, clamp( fogSunAmt, 0.0, 1.0 ) );
  if ( uHaze.x > 0.0 ) {
    float hc = max( cameraPosition.y - uHaze.y, 0.0 ), hp = max( vFogWorld.y - uHaze.y, 0.0 );
    float ec = exp( - hc / uHaze.z ), ep = exp( - hp / uHaze.z );
    float dh = hp - hc;
    float od = abs( dh ) > 0.01 ? uHaze.x * fogDist * uHaze.z * ( ec - ep ) / dh : uHaze.x * fogDist * ec;
    float hazeF = 1.0 - exp( - max( od, 0.0 ) );
    vec3 hazeCol = mix( uHazeColor, uFogSunColor, clamp( fogSunAmt * 0.7, 0.0, 1.0 ) );
    gl_FragColor.rgb = mix( gl_FragColor.rgb, hazeCol, hazeF );
  }
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogCol, fogFactor );
#endif`;
const RIM_DECL = 'uniform vec3 uRimColor;\nuniform vec3 uRimDir;\nuniform float uRimPow;\n';
const RIM_CODE = `{ vec3 rn = normalize( normal ); vec3 rv = normalize( vViewPosition );
  float rimE = pow( 1.0 - abs( dot( rn, rv ) ), uRimPow );
  float rimF = clamp( dot( rn, uRimDir ) * 0.6 + 0.4, 0.0, 1.0 );
  outgoingLight += uRimColor * rimE * rimF; }
#include <opaque_fragment>`;
function hookPlain(sh) { Object.assign(sh.uniforms, U); }
function hookRim(sh) {
  Object.assign(sh.uniforms, U);
  sh.fragmentShader = RIM_DECL + sh.fragmentShader.replace('#include <opaque_fragment>', RIM_CODE);
}

// ---------------------------------------------------------------- materials (cached so shader programs are reused)
const matCache = new Map();
export function mat(color, o = {}) {
  const key = JSON.stringify([color, o]);
  let m = matCache.get(key);
  if (m) return m;
  // Lambert (diffuse only: cloth, stone, figures, so silhouettes stay dark) unless the surface is metal or polished
  const std = o.std || (o.metal ?? 0) > 0 || (o.rough !== undefined && o.rough < 0.6);
  const common = {
    color: new THREE.Color(color), emissive: new THREE.Color(o.emissive ?? 0x000000), emissiveIntensity: o.ei ?? 1,
    side: o.double ? THREE.DoubleSide : THREE.FrontSide, transparent: !!o.transparent, opacity: o.opacity ?? 1,
    depthWrite: o.depthWrite ?? true, flatShading: !!o.flat, fog: o.fog ?? true,
  };
  m = std ? new THREE.MeshStandardMaterial({ ...common, roughness: o.rough ?? 0.92, metalness: o.metal ?? 0 }) : new THREE.MeshLambertMaterial(common);
  if (o.rim) m.onBeforeCompile = hookRim; else m.onBeforeCompile = hookPlain;
  if (o.envMap) m.envMap = o.envMap;
  if (o.blend === 'add') m.blending = THREE.AdditiveBlending;
  matCache.set(key, m);
  return m;
}
// a pool of light on a floor (furnace glow, a violet pool, a bar of sun): an additive soft disc, not a light, so it
// colours the floor without lighting the figures standing in it. Fades with the fog.
const POOLU = { uFogDensity: { value: 0 } };
export function pool(color, radius, strength, parent, x, y, z, o = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength }, uFogDensity: POOLU.uFogDensity, uSoft: { value: o.soft ?? 2.2 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vP; varying float vD; void main(){ vP = position.xy; vec4 mv = modelViewMatrix * vec4(position,1.0); vD = length(mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uStrength, uFogDensity, uSoft; varying vec2 vP; varying float vD;
      void main(){ float r = length(vP); float a = pow(max(1.0 - r, 0.0), uSoft); float f = exp(-uFogDensity*uFogDensity*vD*vD);
        gl_FragColor = vec4(uColor * a * uStrength * f, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const g = new THREE.CircleGeometry(1, 40);
  const p = new THREE.Mesh(g, m);
  p.rotation.x = -Math.PI / 2; p.scale.set(radius * (o.sx ?? 1), radius * (o.sz ?? 1), 1); p.position.set(x, y + 0.01, z);
  p.renderOrder = 5;
  parent.add(p);
  return p;
}

// a bright lamp: an unlit shape, brighter than 1.0 so it clips cleanly to its colour/white. No halo.
export function lampMat(color, intensity = 3, o = {}) {
  const key = JSON.stringify(['lamp', color, intensity, o]);
  let m = matCache.get(key);
  if (m) return m;
  m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), fog: o.fog ?? false,
    transparent: !!o.transparent, opacity: o.opacity ?? 1, depthWrite: o.depthWrite ?? true, side: o.double ? THREE.DoubleSide : THREE.FrontSide });
  m.onBeforeCompile = hookPlain;
  matCache.set(key, m);
  return m;
}

// ---------------------------------------------------------------- geometry helpers
export function rng(seed = 1) {                    // mulberry32: deterministic, the same on every worker
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// Batch: collect static pieces per material, merge to one mesh each (few draw calls for thousands of boxes).
export class Batch {
  constructor(name = 'batch') { this.name = name; this.parts = new Map(); }
  add(geo, material, matrix) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (matrix) g.applyMatrix4(matrix);
    if (!this.parts.has(material)) this.parts.set(material, []);
    this.parts.get(material).push(g);
    return g;
  }
  box(w, h, d, material, x, y, z, rx = 0, ry = 0, rz = 0) {
    return this.add(BOX, material, M4(x, y, z, rx, ry, rz, w, h, d));
  }
  cyl(rTop, rBot, h, material, x, y, z, seg = 12, rx = 0, ry = 0, rz = 0) {
    return this.add(new THREE.CylinderGeometry(rTop, rBot, h, seg), material, M4(x, y, z, rx, ry, rz));
  }
  build(parent, o = {}) {
    const out = [];
    for (const [m, list] of this.parts) {
      const g = mergeGeometries(list, false);
      list.forEach(x => x.dispose());
      const mesh = new THREE.Mesh(g, m);
      mesh.castShadow = o.cast ?? true; mesh.receiveShadow = o.receive ?? true;
      mesh.name = this.name;
      if (o.ground) mesh.userData.ground = true;
      parent.add(mesh); out.push(mesh);
    }
    this.parts.clear();
    return out;
  }
}
const BOX = new THREE.BoxGeometry(1, 1, 1);
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
export function M4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz));
}
export function mesh(geo, material, parent, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = o.cast ?? true; m.receiveShadow = o.receive ?? true;
  if (o.ground) m.userData.ground = true;
  parent.add(m);
  return m;
}
export function boxMesh(w, h, d, material, parent, x, y, z, o = {}) {
  const m = mesh(BOX, material, parent, x, y, z, o);
  m.scale.set(w, h, d);
  return m;
}
// extrude a 2D outline (array of [x,y]) along z by depth, centred
export function extrude(points, depth, o = {}) {
  const s = new THREE.Shape(points.map(p => new THREE.Vector2(p[0], p[1])));
  if (o.holes) for (const h of o.holes) s.holes.push(new THREE.Path(h.map(p => new THREE.Vector2(p[0], p[1]))));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: o.curve ?? 12 });
  g.translate(0, 0, -depth / 2);
  return g;
}

// ---------------------------------------------------------------- scene, sky, lights
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.001);
const world = new THREE.Group(); world.name = 'world'; scene.add(world);
const actors = new THREE.Group(); actors.name = 'actors'; scene.add(actors);

const skyU = {
  cZen: { value: new THREE.Color() }, cMid: { value: new THREE.Color() }, cHor: { value: new THREE.Color() },
  cGnd: { value: new THREE.Color() }, cSun: { value: new THREE.Color() }, cBand: { value: new THREE.Color() },
  sunDir: { value: new THREE.Vector3(0, 0.1, -1) }, sunDisc: { value: 0 }, sunSize: { value: 0.01 },
  sunGlow: { value: 0 }, sunGlowPow: { value: 8 }, mid: { value: 0.18 }, top: { value: 0.65 }, band: { value: 0 },
  bandWidth: { value: 0.01 }, uFogSun: U.uFogSun, uFogSunColor: U.uFogSunColor,
};
const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 48, 24), new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: true, depthFunc: THREE.LessEqualDepth, fog: false,
  vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
  fragmentShader: `
    uniform vec3 cZen, cMid, cHor, cGnd, cSun, cBand; uniform vec3 sunDir; uniform float sunDisc, sunSize, sunGlow, sunGlowPow, mid, top, band, bandWidth;
    uniform vec4 uFogSun; uniform vec3 uFogSunColor; varying vec3 vDir;
    void main(){
      vec3 d = normalize(vDir); float e = d.y;
      vec3 c;
      if (e >= 0.0) {
        c = mix(cHor, cMid, smoothstep(0.0, mid, e));
        c = mix(c, cZen, smoothstep(mid, top, e));
      } else c = mix(cHor, cGnd, smoothstep(0.0, 0.04, -e));
      float sd = max(dot(d, normalize(sunDir)), 0.0);
      // the same in-scatter as the fog, so the horizon and the fogged world meet without a seam
      float fs = pow(max(dot(d, uFogSun.xyz), 0.0), 6.0) * uFogSun.w * (1.0 - smoothstep(0.0, 0.5, abs(e)) * 0.5);
      c = mix(c, uFogSunColor, clamp(fs, 0.0, 1.0));
      c += cSun * sunGlow * pow(sd, sunGlowPow);
      c = mix(c, cBand, band * exp(-abs(e) / bandWidth));
      float disc = smoothstep(cos(sunSize * 1.15), cos(sunSize * 0.85), sd);
      c = mix(c, cSun * 4.0, disc * sunDisc);
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
sky.renderOrder = 1000; sky.frustumCulled = false; scene.add(sky);

const key = new THREE.DirectionalLight(0xffffff, 1);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0004;
key.shadow.radius = 3;
scene.add(key); scene.add(key.target);
const fill = new THREE.HemisphereLight(0x888888, 0x222222, 0.3);
scene.add(fill);

// ---------------------------------------------------------------- dust: falling motes / streaks / drifting haze
const dust = (() => {
  const N = 2400;
  const seeds = new Float32Array(N * 3), seeds2 = new Float32Array(N * 2 * 3), ends = new Float32Array(N * 2);
  const r = rng(77);
  for (let i = 0; i < N; i++) {
    const a = r(), b = r(), c = r();
    seeds.set([a, b, c], i * 3);
    seeds2.set([a, b, c, a, b, c], i * 6);
    ends[i * 2] = 0; ends[i * 2 + 1] = 1;
  }
  const du = {
    uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uSize: { value: new THREE.Vector3(20, 14, 20) },
    uSpeed: { value: 0.6 }, uDrift: { value: 0.2 }, uPx: { value: 2 }, uColor: { value: new THREE.Color(0xcccccc) },
    uOpacity: { value: 0.5 }, uStreak: { value: 0.5 }, uCount: { value: 1 }, fogColor: { value: new THREE.Color() },
    fogDensity: { value: 0 }, uRise: { value: 0 },
  };
  const vCommon = `
    attribute vec3 seed; uniform float uTime, uSpeed, uDrift, uCount, uRise; uniform vec3 uCenter, uSize; varying float vFade; varying float vDepth;
    vec3 dustPos(){
      vec3 p = uCenter + (seed - 0.5) * uSize;
      float fall = (uRise > 0.5 ? -1.0 : 1.0) * uTime * uSpeed * (0.7 + 0.6 * seed.z);
      p.y = uCenter.y - 0.5 * uSize.y + uSize.y * fract(seed.y - fall / uSize.y);
      p.x += sin(uTime * 0.31 + seed.x * 40.0) * uDrift + uTime * uDrift * 0.15;
      p.z += cos(uTime * 0.27 + seed.z * 37.0) * uDrift;
      float hy = fract(seed.y - fall / uSize.y);
      vFade = smoothstep(0.0, 0.1, hy) * smoothstep(1.0, 0.85, hy) * step(seed.x * 0.999, uCount);
      return p;
    }`;
  const fCommon = `uniform vec3 uColor, fogColor; uniform float uOpacity, fogDensity; varying float vFade; varying float vDepth;
    vec4 dustCol(float a){ float f = 1.0 - exp(-fogDensity * fogDensity * vDepth * vDepth); return vec4(mix(uColor, fogColor, f), a * uOpacity * vFade); }
`;
  const pts = new THREE.BufferGeometry();
  pts.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  pts.setAttribute('seed', new THREE.BufferAttribute(seeds, 3));
  const points = new THREE.Points(pts, new THREE.ShaderMaterial({
    uniforms: du, transparent: true, depthWrite: false,
    vertexShader: vCommon + `uniform float uPx; void main(){ vec3 p = dustPos(); vec4 mv = viewMatrix * vec4(p,1.0); vDepth = length(mv.xyz);
      gl_PointSize = clamp(uPx * 40.0 / max(-mv.z, 0.1), 1.0, 7.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: fCommon + `void main(){ vec2 c = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.15, length(c)); gl_FragColor = dustCol(a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  }));
  const ln = new THREE.BufferGeometry();
  ln.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
  ln.setAttribute('seed', new THREE.BufferAttribute(seeds2, 3));
  ln.setAttribute('endp', new THREE.BufferAttribute(ends, 1));
  const lines = new THREE.LineSegments(ln, new THREE.ShaderMaterial({
    uniforms: du, transparent: true, depthWrite: false,
    vertexShader: vCommon + `attribute float endp; uniform float uStreak; void main(){ vec3 p = dustPos(); p.y += endp * uStreak * (0.6 + 0.8 * seed.z);
      vec4 mv = viewMatrix * vec4(p,1.0); vDepth = length(mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: fCommon + `void main(){ gl_FragColor = dustCol(0.8);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  }));
  points.frustumCulled = lines.frustumCulled = false;
  points.renderOrder = lines.renderOrder = 10;
  scene.add(points); scene.add(lines);
  return { du, points, lines, N };
})();

// ---------------------------------------------------------------- camera
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 40000);
export function focalToVfov(f) { return 2 * Math.atan(SENSOR_H / 2 / f) / DEG; }
function placeCamera(c) {
  const pos = new THREE.Vector3(...c.pos), tgt = new THREE.Vector3(...c.target);
  const dist = pos.distanceTo(tgt);
  camera.fov = focalToVfov(c.f ?? 35);
  camera.near = c.near ?? Math.min(Math.max(0.01 * dist, 0.05), 3);
  camera.far = c.far ?? 40000;
  camera.position.copy(pos);
  camera.up.set(0, 1, 0);
  camera.lookAt(tgt);
  if (c.roll) camera.rotateZ(c.roll * DEG);
  if (c.shift) camera.setViewOffset(W, H, -c.shift[0] * W, c.shift[1] * H, W, H);   // [+right, +up]: moves the subject
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return { pos, tgt, dist };
}

// ---------------------------------------------------------------- post: DOF, warp, exposure, clip, sRGB, grain
const postU = {
  tColor: { value: rtMain.texture }, tDepth: { value: rtDepth.texture }, uRes: { value: new THREE.Vector2(W, H) },
  uExposure: { value: 1 }, uGrain: { value: 0.03 }, uSeed: { value: 0 }, uTime: { value: 0 },
  uDof: { value: 0 }, uFocus: { value: 10 }, uCoc: { value: 0 }, uNear: { value: 0.1 }, uFar: { value: 1000 }, uMaxCoc: { value: 14 },
  uWarp: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) }, uLift: { value: new THREE.Color(0, 0, 0) },
  uSat: { value: 1 },
};
const post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: postU, depthTest: false, depthWrite: false,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    #include <packing>
    uniform sampler2D tColor, tDepth; uniform vec2 uRes; uniform float uExposure, uGrain, uSeed, uTime, uDof, uFocus, uCoc, uNear, uFar, uMaxCoc, uSat;
    uniform vec4 uWarp[4]; uniform vec3 uLift; varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423) + uSeed); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    float viewZ(vec2 uv){ float d = unpackRGBAToDepth(texture2D(tDepth, uv)); return -perspectiveDepthToViewZ(d, uNear, uFar); }
    float coc(float z){ return min(uCoc * abs(z - uFocus) / max(z, 1e-3), uMaxCoc); }
    vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main(){
      vec2 uv = vUv; vec2 px = uv * uRes;
      for (int i = 0; i < 4; i++) { vec4 w = uWarp[i]; if (w.w > 0.0) {
        float d = length(px - w.xy); float ring = exp(-pow((d - w.z) / (0.45 * w.z + 2.0), 2.0));
        vec2 off = vec2(sin(px.y * 0.21 + uTime * 9.0 + float(i) * 1.7) + 0.5 * sin(px.y * 0.53 - uTime * 13.0),
                        cos(px.x * 0.19 + uTime * 7.0) + 0.5 * cos(px.x * 0.47 + uTime * 11.0)) * w.w * ring;
        uv += off / uRes; } }
      vec3 c = texture2D(tColor, uv).rgb;
      if (uDof > 0.5) {
        float z0 = viewZ(uv); float r0 = coc(z0); vec3 acc = c; float wsum = 1.0;
        for (int i = 0; i < 24; i++) {
          float a = float(i) * 2.39996; float rr = sqrt((float(i) + 0.5) / 24.0);
          vec2 o = vec2(cos(a), sin(a)) * rr * uMaxCoc / uRes;
          float zs = viewZ(uv + o); float rs = coc(zs); float need = rr * uMaxCoc;
          float rEff = zs > z0 ? min(rs, r0) : rs;      // a far blur never spreads over a nearer sharp pixel
          float w = smoothstep(need - 1.0, need + 1.0, rEff);
          acc += texture2D(tColor, uv + o).rgb * w; wsum += w;
        }
        c = acc / wsum;
      }
      c = c * uExposure + uLift;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, uSat);
      c = clamp(c, 0.0, 1.0);
      c = toSRGB(c);
      
      gl_FragColor = vec4(c, 1.0);
    }`,
}));
const postScene = new THREE.Scene(); postScene.add(post);
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// ---------------------------------------------------------------- look (colour key)
const C = (h) => new THREE.Color(h);
let LOOK = null;
function deepMerge(a, b) {
  if (b === undefined) return a;
  if (Array.isArray(b) || typeof b !== 'object' || b === null || typeof a !== 'object' || a === null || Array.isArray(a)) return b;
  const o = { ...a };
  for (const k of Object.keys(b)) o[k] = deepMerge(a[k], b[k]);
  return o;
}
function normDir(d) { return new THREE.Vector3(...d).normalize(); }
function applyLook(L) {
  LOOK = L;
  const s = L.sky;
  skyU.cZen.value.copy(C(s.zenith)); skyU.cMid.value.copy(C(s.mid ?? s.zenith)); skyU.cHor.value.copy(C(s.horizon));
  skyU.cGnd.value.copy(C(s.ground ?? s.horizon)); skyU.cSun.value.copy(C(s.sun?.color ?? '#ffffff'));
  skyU.cBand.value.copy(C(s.band?.color ?? s.horizon)); skyU.band.value = s.band?.amount ?? 0; skyU.bandWidth.value = s.band?.width ?? 0.01;
  skyU.mid.value = s.midAt ?? 0.18; skyU.top.value = s.topAt ?? 0.65;
  const sunDir = normDir(s.sun?.dir ?? L.key.dir);
  skyU.sunDir.value.copy(sunDir); skyU.sunDisc.value = s.sun?.disc ?? 0; skyU.sunSize.value = (s.sun?.size ?? 0.6) * DEG;
  skyU.sunGlow.value = s.sun?.glow ?? 0; skyU.sunGlowPow.value = s.sun?.glowPow ?? 8;
  scene.fog.color.copy(C(L.fog.color)); scene.fog.density = L.fog.density;
  const hz = L.haze ?? { amount: 0 };
  U.uHaze.value.set(hz.amount ?? 0, hz.base ?? 0, hz.falloff ?? 20, 0); U.uHazeColor.value.copy(C(hz.color ?? L.fog.color));
  const fsun = L.fog.sun ?? { amount: 0 };
  U.uFogSun.value.set(sunDir.x, sunDir.y, sunDir.z, fsun.amount ?? 0); U.uFogSunColor.value.copy(C(fsun.color ?? L.fog.color));
  key.color.copy(C(L.key.color)); key.intensity = L.key.intensity; key.userData.dir = normDir(L.key.dir);
  key.shadow.radius = L.key.soft ?? 3;
  fill.color.copy(C(L.fill.sky)); fill.groundColor.copy(C(L.fill.ground)); fill.intensity = L.fill.intensity;
  U.uRimColor.value.copy(C(L.rim?.color ?? '#000000')).multiplyScalar(L.rim?.strength ?? 0); U.uRimPow.value = L.rim?.power ?? 4;
  postU.uExposure.value = L.exposure ?? 1; postU.uGrain.value = L.grain ?? 0.03; renderer.toneMappingExposure = L.exposure ?? 1;
  E.grain = L.grain ?? 0.03;
  postU.uLift.value.copy(C(L.lift ?? '#000000')); postU.uSat.value = L.sat ?? 1;
  const D = L.dust ?? { mode: 'none' };
  dust.cfg = D;
}

// ---------------------------------------------------------------- state: keyframes, clocks, resolution
// Any value in a state may be animated:
//   {keys: [[t, v], [t, v], ...], ease: 'linear'|'smooth'|'in'|'out'}  -> interpolated (numbers or arrays)
//   {clock: v0, rate: 1}                                                -> v0 + rate * t
const EASE = { linear: u => u, smooth: u => u * u * (3 - 2 * u), in: u => u * u, out: u => 1 - (1 - u) * (1 - u), step: u => (u >= 1 ? 1 : 0) };
function lerpV(a, b, k) { return Array.isArray(a) ? a.map((x, i) => lerpV(x, b[i], k)) : (typeof a === 'number' ? a + (b - a) * k : (k < 1 ? a : b)); }
export function resolve(v, t) {
  if (Array.isArray(v)) return v.map(x => resolve(x, t));
  if (v && typeof v === 'object') {
    if (Array.isArray(v.keys) && v.keys.length && Array.isArray(v.keys[0])) {
      const ks = v.keys, ease = EASE[v.ease ?? 'smooth'] ?? EASE.smooth;
      if (t <= ks[0][0]) return resolve(ks[0][1], t);
      for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) {
        const k = ease((t - ks[i - 1][0]) / Math.max(ks[i][0] - ks[i - 1][0], 1e-6));
        return lerpV(resolve(ks[i - 1][1], t), resolve(ks[i][1], t), k);
      }
      return resolve(ks[ks.length - 1][1], t);
    }
    if (typeof v.clock === 'number' && Object.keys(v).every(k => k === 'clock' || k === 'rate')) return v.clock + (v.rate ?? 1) * t;
    const o = {};
    for (const k of Object.keys(v)) o[k] = resolve(v[k], t);
    return o;
  }
  return v;
}

// ---------------------------------------------------------------- ground raycast
const ray = new THREE.Raycaster();
let groundMeshes = [];
export function groundAt(x, z, fromY = 2000) {
  if (!groundMeshes.length) return 0;
  ray.set(new THREE.Vector3(x, fromY, z), new THREE.Vector3(0, -1, 0));
  ray.far = fromY + 100;
  const hit = ray.intersectObjects(groundMeshes, false)[0];
  return hit ? hit.point.y : 0;
}

// ---------------------------------------------------------------- engine object handed to sets
export const E = {
  THREE, W, H, SENSOR_W, DEG, scene, world, actors, renderer, camera, key, fill, sky, U, mat, lampMat, pool, Batch, M4, mesh,
  boxMesh, extrude, rng, resolve, groundAt, deepMerge, mergeGeometries, BOX, LOOKS,
  set: null, setName: null, ctx: null, state: {}, R: {}, t: 0, figures: new Map(), shotCam: null,
  // a set registers lights here at build time; their number stays fixed for the set (no shader recompiles)
  pointLight(color, intensity, distance, decay = 2, parent = world) {
    const l = new THREE.PointLight(color, intensity, distance, decay); parent.add(l); return l;
  },
  spotLight(color, intensity, distance, angle, penumbra = 0.5, parent = world) {
    const l = new THREE.SpotLight(color, intensity, distance, angle, penumbra, 2); parent.add(l); parent.add(l.target); return l;
  },
  markGround(m) { (Array.isArray(m) ? m : [m]).forEach(x => { x.userData.ground = true; }); },
  // world position of a named target: [x,y,z], a figure id ('liora'), or a figure part ('liora.head', 'cael.handR')
  where(v) {
    if (Array.isArray(v)) return new THREE.Vector3(v[0], v.length > 2 ? v[1] : groundAt(v[0], v[1]), v.length > 2 ? v[2] : v[1]);
    if (typeof v === 'string') {
      const [id, part] = v.split('.');
      const f = E.figures.get(id);
      if (f) { f.root.updateMatrixWorld(true); return f.partWorld(part || 'chest'); }
      const m = E.ctx?.marks?.[v] ?? E.set?.marks?.[v];
      if (m) return E.where(m);
    }
    return new THREE.Vector3();
  },
};
window.E = E;

// ---------------------------------------------------------------- figures, crowds, army, stretchers, hero hand
let crowdList = [], armyList = [], stretchers = new Map(), heroHand = null;
function clearActors() {
  for (const f of E.figures.values()) f.dispose?.();
  E.figures.clear(); crowdList = []; stretchers.clear();
  for (const a of armyList) a.dispose();
  armyList = [];
  heroHand = null;
  while (actors.children.length) actors.remove(actors.children[0]);
}
function buildActors(st) {
  clearActors();
  const figs = st.figures ?? {};
  for (const [id, spec] of Object.entries(figs)) {
    const kind = spec.kind ?? (CAST[id] ? id : 'soldier');
    const f = makeFigure(E, kind, { ...spec, id });
    f.id = id; f.spec = spec;
    actors.add(f.root); E.figures.set(id, f);
  }
  for (const s of st.stretchers ?? []) {
    const sObj = makeStretcher(E, s);
    actors.add(sObj.root); stretchers.set(s.id ?? `stretcher${stretchers.size}`, sObj);
  }
  for (const [ci, c] of (st.crowd ?? []).entries()) {
    const members = [];
    const r = rng(1000 + ci);
    for (let i = 0; i < (c.count ?? 8); i++) {
      const kind = Array.isArray(c.kind) ? c.kind[i % c.kind.length] : (c.kind ?? 'civilian');
      const f = makeFigure(E, kind, { lod: 'simple', lamp: c.lamps ? (r() < (c.lampShare ?? 0.6)) : false, scale: 0.92 + r() * 0.16, seed: i * 31 + ci, ...(c.figure ?? {}) });
      f.crowdPhase = r(); f.crowdLateral = (r() - 0.5) * (c.width ?? 2);
      actors.add(f.root); members.push(f);
    }
    crowdList.push({ c, members });
  }
  const armies = Array.isArray(st.army) ? st.army : (st.army ? [st.army] : []);
  for (const [ai, a] of armies.entries()) armyList.push(E.makeArmy(a, ai));
  if (st.hand) { heroHand = makeHeroHand(E, st.hand); actors.add(heroHand.root); }
}
function pathPoint(path, s) {
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (s <= acc + L || i === path.length - 1) {
      const k = Math.min(Math.max((s - acc) / Math.max(L, 1e-6), 0), 1);
      return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k], dir: [b[0] - a[0], b[2] - a[2]] };
    }
    acc += L;
  }
  return { p: path[0], dir: [0, 1] };
}
function pathLength(path) { let L = 0; for (let i = 1; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]); return L; }
function updateActors(R, t) {
  const figs = R.figures ?? {};
  // stretchers first (people lie on them)
  for (const [id, s] of stretchers) s.update(E, (R.stretchers ?? []).find(x => (x.id ?? '') === id) ?? {}, t);
  for (const [id, f] of E.figures) poseFigure(E, f, figs[id] ?? {}, t, stretchers);
  // a second pass resolves aims that point at other figures' parts
  for (const [id, f] of E.figures) if (f.needsSecondPass) poseFigure(E, f, figs[id] ?? {}, t, stretchers, true);
  for (const [ci, { c, members }] of crowdList.entries()) {
    const cr = R.crowd?.[ci] ?? c;
    const path = cr.path, L = pathLength(path), speed = cr.speed ?? 1.0, spacing = cr.spacing ?? 2.2;
    members.forEach((f, i) => {
      let s = (cr.start ?? 0) + speed * (t - (cr.t0 ?? 0)) - i * spacing + f.crowdPhase * spacing * 0.5;
      if (cr.loop) s = ((s % L) + L) % L;
      const visible = cr.loop || (s >= 0 && s <= L) || cr.hold;
      s = Math.min(Math.max(s, 0), L);
      const { p, dir } = pathPoint(path, s);
      const yaw = Math.atan2(dir[0], dir[1]);
      const lat = f.crowdLateral;
      f.root.visible = visible;
      f.root.position.set(p[0] + Math.cos(yaw) * lat, p[1], p[2] - Math.sin(yaw) * lat);
      poseFigure(E, f, { pose: s >= L || s <= 0 ? (cr.endPose ?? 'stand') : (cr.pose ?? 'walk'), face: yaw / DEG, y: p[1], pos: null, phase: f.crowdPhase, speed, keepPos: true, ...(cr.figure ?? {}) }, t, stretchers);
    });
  }
  for (const [ai, a] of armyList.entries()) {
    const ar = Array.isArray(R.army) ? R.army[ai] : R.army;
    a.update(ar ?? {}, t);
  }
  if (heroHand) poseHeroHand(E, heroHand, R.hand ?? {}, t);
}

// ---------------------------------------------------------------- the army: many instanced figures
E.makeArmy = function makeArmy(a, ai) {
  const r = rng(500 + ai + (a.seed ?? 0));
  const from = a.from ?? [-60, -20], to = a.to ?? [60, -20], rows = a.rows ?? 3, spacing = a.spacing ?? 1.4, rowGap = a.rowGap ?? 1.8;
  const dx = to[0] - from[0], dz = to[1] - from[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
  const nx = -uz, nz = ux;                                  // row normal (left of the line direction)
  const facing = (a.facing ?? (Math.atan2(nx, nz) / DEG)) * DEG;
  const perRow = Math.max(1, Math.floor(len / spacing));
  const n = perRow * rows;
  const bodyGeo = soldierGeometry(E), poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 5);
  const boundGeo = new THREE.CylinderGeometry(0.085, 0.085, 1, 6), flagGeo = flagGeometry();
  const body = new THREE.InstancedMesh(bodyGeo, mat(a.color ?? '#151413', { rim: true }), n);
  const poleShare = a.poles ?? 0.12;
  const poles = [];
  const m = new THREE.Matrix4();
  const items = [];
  let k = 0;
  for (let row = 0; row < rows; row++) for (let i = 0; i < perRow; i++) {
    const s = (i + 0.5 + (r() - 0.5) * (a.jitter ?? 0.5)) * spacing + (row % 2) * spacing * 0.5;
    if (s > len) continue;
    const x = from[0] + ux * s + nx * (row * rowGap + (r() - 0.5) * 0.4), z = from[1] + uz * s + nz * (row * rowGap + (r() - 0.5) * 0.4);
    const sc = (0.92 + r() * 0.16) * (a.scale ?? 1);
    const y = a.y ?? groundAt(x, z);
    const yaw = facing + (r() - 0.5) * 0.5;
    const lean = (r() - 0.5) * 0.08;
    m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(lean, yaw, 0, 'YXZ')), new THREE.Vector3(sc, sc, sc));
    body.setMatrixAt(k, m);
    if (r() < poleShare) poles.push({ x, y, z, sc, yaw, rank: r(), h: 1.75 * sc * (1.45 + r() * 0.2) });
    items.push({ x, y, z, sc, yaw });
    k++;
  }
  body.count = k;
  body.castShadow = true; body.receiveShadow = true;
  actors.add(body);
  const np = Math.max(poles.length, 1);
  const poleMesh = new THREE.InstancedMesh(poleGeo, mat('#1a1816'), np);
  const boundMesh = new THREE.InstancedMesh(boundGeo, mat(a.boundColor ?? '#2a1412', { rim: true }), np);
  const flagMesh = new THREE.InstancedMesh(flagGeo, mat(a.bannerColor ?? '#8E1B1B', { double: true, rim: true }), np);
  [poleMesh, boundMesh, flagMesh].forEach(x => { x.castShadow = true; x.receiveShadow = true; actors.add(x); });
  const Z = new THREE.Matrix4().makeScale(0, 0, 0);
  return {
    body, poles,
    update(st, t) {
      const open = st.bannersOpen ?? a.bannersOpen ?? 0;
      const maxShare = st.notAll ?? a.notAll ?? 0.82;
      body.visible = st.visible ?? true;
      poles.forEach((p, i) => {
        const pm = new THREE.Matrix4().compose(new THREE.Vector3(p.x + Math.sin(p.yaw) * 0.25, p.y + p.h / 2, p.z + Math.cos(p.yaw) * 0.25),
          new THREE.Quaternion(), new THREE.Vector3(1, p.h, 1));
        poleMesh.setMatrixAt(i, pm);
        const isOpen = p.rank < Math.min(open, maxShare) / Math.max(maxShare, 1e-6) * maxShare && p.rank < maxShare;
        const top = new THREE.Vector3(p.x + Math.sin(p.yaw) * 0.25, p.y + p.h, p.z + Math.cos(p.yaw) * 0.25);
        if (isOpen) {
          const wave = Math.sin(t * 2.1 + p.rank * 20) * 0.15;
          const fm = new THREE.Matrix4().compose(top, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (st.wind ?? a.wind ?? 90) * DEG + wave, 0)), new THREE.Vector3(1.25, 0.9, 1));
          flagMesh.setMatrixAt(i, fm); boundMesh.setMatrixAt(i, Z);
        } else {
          const bm = new THREE.Matrix4().compose(top.clone().add(new THREE.Vector3(0, -0.55, 0)), new THREE.Quaternion(), new THREE.Vector3(1, 1.0, 1));
          boundMesh.setMatrixAt(i, bm); flagMesh.setMatrixAt(i, Z);
        }
      });
      poleMesh.count = boundMesh.count = flagMesh.count = poles.length;
      poleMesh.instanceMatrix.needsUpdate = boundMesh.instanceMatrix.needsUpdate = flagMesh.instanceMatrix.needsUpdate = true;
    },
    dispose() { [body, poleMesh, boundMesh, flagMesh].forEach(x => { x.geometry.dispose(); x.dispose?.(); }); },
  };
};
function soldierGeometry() {
  // one merged silhouette: legs, cloaked body, shoulders, head, flat helmet (Aethelgard: verticals and straight cuts)
  const parts = [];
  const add = (g, x, y, z, sx = 1, sy = 1, sz = 1) => { const c = g.clone(); c.applyMatrix4(M4(x, y, z, 0, 0, 0, sx, sy, sz)); parts.push(c); };
  add(BOX, -0.1, 0.45, 0, 0.14, 0.9, 0.16); add(BOX, 0.1, 0.45, 0, 0.14, 0.9, 0.16);
  const body = new THREE.CylinderGeometry(0.21, 0.3, 0.95, 4, 1); body.rotateY(Math.PI / 4); body.scale(1, 1, 0.6);
  add(body, 0, 1.0, 0);
  add(BOX, 0, 1.42, 0, 0.5, 0.1, 0.24);
  add(new THREE.SphereGeometry(0.11, 10, 8), 0, 1.6, 0);
  add(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 10), 0, 1.69, 0);
  add(new THREE.CylinderGeometry(0.1, 0.11, 0.12, 10), 0, 1.74, 0);
  const g = mergeGeometries(parts.map(p => { const q = p.index ? p.toNonIndexed() : p; for (const k of Object.keys(q.attributes)) if (k !== 'position' && k !== 'normal') q.deleteAttribute(k); return q; }));
  return g;
}
function flagGeometry() {
  // a ragged rectangle hanging from the top of the pole, unit size (scaled per instance)
  const pts = [[0, 0], [1, 0], [1, -0.62], [0.86, -0.7], [0.74, -0.62], [0.55, -0.76], [0.38, -0.66], [0.2, -0.8], [0, -0.72]];
  const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ShapeGeometry(s); return g;
}

// ---------------------------------------------------------------- shadows follow the shot
function fitShadow(center, radius) {
  const d = key.userData.dir ?? new THREE.Vector3(0, 1, 0);
  const far = radius * 6 + 3000;
  key.target.position.copy(center);
  key.position.copy(center).addScaledVector(d, far * 0.5);
  const sc = key.shadow.camera;
  sc.left = -radius; sc.right = radius; sc.top = radius; sc.bottom = -radius; sc.near = 1; sc.far = far;
  sc.updateProjectionMatrix();
  key.shadow.normalBias = Math.max(0.02, radius / 600);
  key.target.updateMatrixWorld(); key.updateMatrixWorld();
}

// ---------------------------------------------------------------- public API
async function setScene(name, opts = {}) {
  const sig = name + JSON.stringify(opts);
  if (E.setSig === sig) return E.setName;
  const mod = await import(`./sets/${name}.js`);
  const set = mod.default;
  clearActors();
  // dispose the old world (materials are cached and shared; only geometry is freed)
  world.traverse(o => { if (o.geometry && o.geometry !== BOX) o.geometry.dispose(); });
  while (world.children.length) world.remove(world.children[0]);
  E.set = set; E.setName = name; E.setSig = sig; E.state = {};
  E.ctx = (await set.build(E, opts)) ?? {};
  groundMeshes = [];
  world.traverse(o => { if (o.isMesh && o.userData.ground) groundMeshes.push(o); });
  world.updateMatrixWorld(true);
  E.baseLook = typeof set.look === 'string' ? LOOKS[set.look] : set.look;
  applyLook(E.baseLook);
  setState({});
  return name;
}
function setState(st = {}) {
  if (st.preset) {
    const p = (E.ctx?.presets ?? E.set?.presets ?? {})[st.preset];
    if (p) st = deepMerge(p.state ?? {}, { ...st, preset: undefined });
  }
  E.state = st;
  buildActors(st);
  setTime(E.t);
  return true;
}
function setTime(t = 0) {
  E.t = t;
  const R = E.R = resolve(E.state, t);
  // the look: the set's own key, a named key from looks.js, and/or overrides
  let L = E.baseLook;
  if (typeof R.look === 'string') L = LOOKS[R.look] ?? L;
  else if (R.look && typeof R.look === 'object') L = deepMerge(R.look.base ? LOOKS[R.look.base] : L, R.look);
  if (L !== LOOK || (R.look && typeof R.look === 'object')) applyLook(L);
  E.set?.update?.(E, R, t, E.ctx);
  updateActors(R, t);
  // dust
  const D = deepMerge(LOOK.dust ?? {}, R.dust);
  const mode = D.mode ?? 'none';
  dust.points.visible = mode === 'motes' || mode === 'fall' || mode === 'drift' || mode === 'rise';
  dust.lines.visible = mode === 'streak';
  const du = dust.du;
  du.uTime.value = t + (D.phase ?? 0);
  du.uSize.value.set(...(D.size ?? [24, 14, 24]));
  du.uSpeed.value = D.speed ?? (mode === 'drift' ? 0.05 : 0.8);
  du.uDrift.value = D.drift ?? (mode === 'drift' ? 0.6 : 0.15);
  du.uPx.value = D.px ?? 2;
  du.uColor.value.copy(C(D.color ?? '#cfcbc0'));
  du.uOpacity.value = D.opacity ?? 0.45;
  du.uStreak.value = D.streak ?? 0.6;
  du.uCount.value = Math.min(1, (D.count ?? 1600) / dust.N);
  du.uRise.value = mode === 'rise' ? 1 : 0;
  dust.center = D.center;
  return true;
}
// camera dictionary -> rendered picture in the GL canvas
function drawShot(c) {
  let cam = c;
  if (cam.hand && heroHand) cam = { ...heroHand.camera(cam), ...Object.fromEntries(Object.entries(cam).filter(([k]) => ['f', 'roll', 'shift', 'dof'].includes(k))) };
  if (typeof cam.target === 'string') cam = { ...cam, target: E.where(cam.target).toArray() };
  if (typeof cam.pos === 'string') cam = { ...cam, pos: E.where(cam.pos).toArray() };
  E.shotCam = cam;
  const { pos, tgt, dist } = placeCamera(cam);
  sky.position.copy(camera.position);
  // shadows around what the shot looks at
  const sh = E.R.shadow ?? {};
  fitShadow(sh.center ? new THREE.Vector3(...sh.center) : tgt.clone().setY(Math.min(tgt.y, pos.y)), sh.radius ?? Math.min(Math.max(dist * 0.9, 14), 700));
  // rim light direction in view space
  const rimDir = (LOOK.rim?.dir ? normDir(LOOK.rim.dir) : key.userData.dir.clone()).transformDirection(camera.matrixWorldInverse);
  U.uRimDir.value.copy(rimDir);
  // dust volume follows the shot unless pinned
  const dc = dust.center;
  if (Array.isArray(dc)) dust.du.uCenter.value.set(...dc);
  else { const fwd = tgt.clone().sub(pos).normalize(); dust.du.uCenter.value.copy(pos).addScaledVector(fwd, Math.min(dist, (dust.du.uSize.value.z) * 0.6)); }
  dust.du.fogColor.value.copy(scene.fog.color); dust.du.fogDensity.value = scene.fog.density;
  POOLU.uFogDensity.value = scene.fog.density;
  E.set?.beforeRender?.(E, E.R, E.t, E.ctx, cam);
  // warp regions (heat shimmer at the edge of a held thing), projected to the screen
  const warps = (E.R.warp ?? []).slice(0, 4);
  postU.uWarp.value.forEach((v, i) => {
    const w = warps[i];
    if (!w) { v.set(0, 0, 0, 0); return; }
    const p = E.where(w.at), pp = p.clone().project(camera);
    const edge = p.clone().add(camera.up.clone().applyQuaternion(camera.quaternion).normalize().multiplyScalar(w.r ?? 2)).project(camera);
    const rpx = Math.hypot((edge.x - pp.x) * W / 2, (edge.y - pp.y) * H / 2);
    v.set((pp.x * 0.5 + 0.5) * W, (pp.y * 0.5 + 0.5) * H, rpx, pp.z < 1 ? (w.amp ?? 1) * 2.2 : 0);
  });
  postU.uTime.value = E.t; postU.uSeed.value = (E.t * 24.0 * 0.6180339) % 1;
  // depth of field: {focus: metres or a target, fstop}
  const dof = cam.dof;
  if (dof) {
    const fd = typeof dof.focus === 'number' ? dof.focus : E.where(dof.focus ?? cam.target).distanceTo(pos);
    const f = cam.f ?? 35, N = dof.fstop ?? 2;
    // circle of confusion in px = (f^2 / N) * |z - zf| / (z * (zf - f)) / sensor width * W (all in mm)
    postU.uDof.value = 1; postU.uFocus.value = fd;
    postU.uCoc.value = (f * f / N) / Math.max(fd * 1000 - f, 1) / SENSOR_W * W * 1000;
    postU.uNear.value = camera.near; postU.uFar.value = camera.far; postU.uMaxCoc.value = dof.max ?? 16;
    scene.overrideMaterial = depthMat;
    const vis = [sky.visible, dust.points.visible, dust.lines.visible];
    sky.visible = dust.points.visible = dust.lines.visible = false;
    renderer.setRenderTarget(rtDepth); renderer.render(scene, camera);
    scene.overrideMaterial = null;
    [sky.visible, dust.points.visible, dust.lines.visible] = vis;
  } else postU.uDof.value = 0;
  const usePost = dof || warps.length || E.R.post;
  if (usePost) {
    renderer.setRenderTarget(rtMain);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
  } else {
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  }
}
function renderShot(c, type = 'image/png', q = 0.92) {
  drawShot(c);
  return renderer.domElement.toDataURL(type, q);
}
// the bare picture with grain (what proof.js saves)
function pictureURL(type = 'image/png', q = 0.92) {
  compose(outCanvas, renderer.domElement, { mode: 'picture', t: E.t, grain: E.grain });
  return outCanvas.toDataURL(type, q);
}

// ---------------------------------------------------------------- shots: camera moves and the composed frame
const easeF = (n) => EASE[n ?? 'smooth'] ?? EASE.smooth;
export function camAt(s, t) {
  const dur = shotDur(s);
  const u = dur > 0 ? Math.min(Math.max(t / dur, 0), 1) : 0;
  let cam = JSON.parse(JSON.stringify(s.cam));
  if (s.camKeys && s.camKeys.length) {                         // [{t, pos, target, f?}] in shot seconds
    cam = { ...cam, ...resolve({ pos: { keys: s.camKeys.map(k => [k.t, k.pos]), ease: s.camEase ?? 'smooth' }, target: { keys: s.camKeys.map(k => [k.t, k.target]), ease: s.camEase ?? 'smooth' } }, t) };
  } else if (s.move && s.move.to) {
    const k = easeF(s.move.ease)(Math.min(1, Math.max(0, (u - (s.move.start ?? 0)) / ((s.move.end ?? 1) - (s.move.start ?? 0)))));
    const to = s.move.to;
    const asV = (v) => (typeof v === 'string' ? E.where(v).toArray() : v);
    cam.pos = lerpV(asV(s.cam.pos), asV(to.pos ?? s.cam.pos), k); cam.target = lerpV(asV(s.cam.target), asV(to.target ?? s.cam.target), k);
    if (to.roll !== undefined) cam.roll = (s.cam.roll ?? 0) + (to.roll - (s.cam.roll ?? 0)) * k;
  }
  if (s.handheld) {                                            // slow breathing drift: a few sines, no jitter
    const a = s.handheld, w = (f, p) => Math.sin((t + (s.handSeed ?? 0)) * f * 2 * Math.PI + p);
    const P = typeof cam.pos === 'string' ? E.where(cam.pos).toArray() : cam.pos, T = typeof cam.target === 'string' ? E.where(cam.target).toArray() : cam.target;
    cam.pos = [P[0] + a * (0.6 * w(0.23, 0) + 0.4 * w(0.61, 1) + 0.2 * w(1.7, 5)), P[1] + a * (0.5 * w(0.31, 2) + 0.3 * w(0.83, 3) + 0.25 * w(2.1, 7)), P[2] + a * 0.4 * w(0.19, 4)];
    cam.target = [T[0] + a * 0.5 * w(0.27, 5), T[1] + a * 0.4 * w(0.37, 6), T[2]];
    cam.roll = (cam.roll ?? 0) + a * 8 * w(0.21, 8);
  }
  return cam;
}
export function shotDur(s) {
  if (typeof s.dur === 'number') return s.dur;
  const m = String(s.time ?? '').match(/([\d.]+)\D+([\d.]+)/);
  return m ? +m[2] - +m[1] : 4;
}
let lastShotKey = null;
const outCanvas = document.createElement('canvas');
// frame(spec, shot, t, mode): the whole picture for a shot at shot time t, composed with matte, captions, subtitles.
async function frame(spec, s, t, mode = 'animatic', o = {}) {
  const sceneName = s.scene ?? spec.scene;
  if (!s.black) await setScene(sceneName, s.sceneOptions ?? spec.sceneOptions ?? {});
  const sk = o.shotKey ?? JSON.stringify([sceneName, s.state]);
  if (!s.black && sk !== lastShotKey) { setState(s.state ?? {}); lastShotKey = sk; }
  const clockT = t + (s.timeOffset ?? 0);
  if (!s.black) { setTime(clockT); drawShot(camAt(s, t)); }
  compose(outCanvas, s.black ? null : renderer.domElement, { spec, shot: s, t, mode, dur: shotDur(s), grain: s.grain ?? E.grain, ...o });
  return outCanvas.toDataURL(o.type ?? 'image/jpeg', o.quality ?? 0.9);
}

window.setScene = setScene;
window.setState = setState;
window.setTime = setTime;
window.renderShot = renderShot;
window.pictureURL = pictureURL;
window.drawShot = drawShot;
window.frame = frame;
window.shotDur = shotDur;
window.listScenes = () => ['foundry', 'city', 'forecourt', 'gatehouse', 'crown', 'fall', 'ruins', 'ship', 'hull'];
window.presets = () => Object.keys(E.ctx?.presets ?? E.set?.presets ?? {});
window.preset = (name) => (E.ctx?.presets ?? E.set?.presets ?? {})[name];
window.where = (v) => E.where(v).toArray();
await loadFonts();
window.ready = true;
