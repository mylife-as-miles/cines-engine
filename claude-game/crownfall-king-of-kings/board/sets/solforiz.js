// SOLFORIZ: one shared layout in real metres for the city, forecourt, gatehouse, crown, fall, ruins and ship sets, so
// every sightline the script needs is real: breach -> arch -> boy; stair -> breach; stretcher -> truce lamp; the
// forecourt -> the Crown; the gatehouse -> the open causeway behind.
//
// Axes: y up. +z points OUT of the city (the gate, the causeway, the plain, the army's rear); -z points IN (the stair,
// the terraces, the Crown, and at sunrise the sun and the fleet). +x is east (right, looking into the city from the
// gate). The ground of the forecourt and the causeway top is y = 0; the glass plain lies at y = -1.2.
import * as THREE from 'three';

export const L = {
  plainY: -1.2,
  wall: { z: 0, thick: 6, h: 16 },                       // the outer wall, broken, along z = 0
  gate: { x: 0, z: 0, w: 12 },                           // the broken gate: opening x -6..6
  towers: [{ x: -11.5, z: 0, w: 10, h: 27 }, { x: 11.5, z: 0, w: 10, h: 22 }],   // the two gate towers (broken tops)
  gatehouse: { x0: 16, x1: 32, z0: -18, z1: -3, h: 8.5 },  // interior footprint; the breach is in the north wall (z = -18)
  truceLamp: [24, 15.6, -10.5],                          // the white truce lamp on its mast over the gatehouse
  causeway: { w: 14, len: 3200 },                        // from the gate (z = 0) out along +z
  forecourt: { x0: -140, x1: 140, z0: -90, z1: -3 },
  stairFoot: [54, 0, -84], stairTop: [30, 12, -84], stairZ: [-90, -78],  // lower flight climbs west along the tier-0 face
  arch: { x: 70, z: -76, span: 3.4, h: 5.6, depth: 1.3 },   // the signal station: opening faces +z (the gate)
  block: { x: 52.4, z: -85.4, y: 5.4, w: 3.2, h: 1.8, d: 2.4 },  // held over Liora at the stair foot; from the parapet above
  innerWall: { z: -92, y: 12, h: 10, gateX: 24, gateW: 8 },  // on the lip of tier 0, gate at the top of the lower flight
  tiers: Array.from({ length: 8 }, (_, k) => ({ k, hw: 330 - 31 * k, front: -90 - 45 * k, back: -790 + 45 * k, top: 12 + 24 * k })),
  greatStair: { hw: 12 },                                // the central flights, x -12..12, from tier 0 up to tier 7
  crown: { z: -442, hw: 70, d: 64, y: 180, h: 46, opening: { w: 76, h: 17, y: 191 } },   // pressureworks at the summit
  crownTowers: [[-98, -414], [98, -414], [-96, -466], [96, -466]],   // four tall towers with cross-arms by the Crown
  arcades: { tier: 5, n: 15 },                           // the battery in the high arcades: tier-5 face
  battery: [[-62, -15], [-47, -19], [-32, -23]],         // Aethelgard's three guns, just inside the outer wall
  cannon: [[22, 120, 2.6], [-34, 260, -0.4], [58, 470, 1.1], [-12, 52, 0.4], [25, 1466, 2.3], [36, 2086, 2.2]],   // abandoned on the plain [x, z, yaw]
};
const T = L.tiers;
export const crownFront = () => L.crown.z + L.crown.d / 2;

// ---------------------------------------------------------------- the plain of fused glass and the causeway
export function buildPlain(E, W, o = {}) {
  const env = o.envMap ?? null;
  const glass = E.mat(o.glass ?? (o.ruined ? '#262624' : '#141c22'));
  const g = new THREE.PlaneGeometry(30000, 30000, 1, 1);
  const m = E.mesh(g, glass, W, 0, L.plainY, 0, { cast: false });
  m.rotation.x = -Math.PI / 2;
  m.userData.ground = true;
  // faint fused seams on the glass (horizontals that catch the light)
  const b = new E.Batch('plain-seams');
  const r = E.rng(11);
  const seam = E.mat('#3a4750', { rough: 0.3, metal: 0.3 });
  for (let i = 0; i < 90; i++) { const z = 40 + r() * 2600, x = (r() - 0.5) * 1400; b.box(30 + r() * 160, 0.02, 0.5, seam, x, L.plainY + 0.01, z, 0, (r() - 0.5) * 0.08, 0); }
  b.build(W, { cast: false });
  return m;
}
export function buildCauseway(E, W, o = {}) {
  const b = new E.Batch('causeway');
  const road = E.mat(o.road ?? (o.ruined ? '#3e3a34' : '#3e4a52')), side = E.mat('#1d252b');
  const len = L.causeway.len, w = L.causeway.w;
  b.box(w, 1.2, len, road, 0, -0.6, len / 2 + 2);
  b.box(w + 5, 0.9, len, side, 0, -0.75, len / 2 + 2);          // the embankment shoulder
  const post = E.mat('#1a1f23');
  for (let z = 30; z < len; z += 38) for (const sx of [-1, 1]) b.box(0.35, 1.5, 0.35, post, sx * (w / 2 - 0.3), 0.75, z);
  const out = b.build(W);
  out.forEach(m => { m.userData.ground = true; });
  return out;
}
export function buildCannon(E, b, x, y, z, yaw, o = {}) {
  const iron = o.mat ?? E.mat('#1a1d20', { rough: 0.6, metal: 0.5 });
  const elev = o.elev ?? 0.35, len = o.len ?? 5.5;
  const g = new THREE.CylinderGeometry(0.28, 0.42, len, 12); g.rotateX(Math.PI / 2); g.translate(0, 0, len * 0.3);
  b.add(g, iron, E.M4(x, y + 1.25, z, -elev, yaw, 0));
  b.box(1.4, 0.7, 2.6, iron, x, y + 0.75, z, 0, yaw, 0);
  for (const sx of [-1, 1]) { const wg = new THREE.CylinderGeometry(0.85, 0.85, 0.18, 16); wg.rotateZ(Math.PI / 2); b.add(wg, iron, E.M4(x + Math.cos(yaw) * sx * 0.85, y + 0.85, z - Math.sin(yaw) * sx * 0.85, 0, yaw, 0)); }
}

// ---------------------------------------------------------------- the outer wall, the broken gate, the towers
export function buildWallAndGate(E, W, o = {}) {
  const b = new E.Batch('wall');
  const stone = E.mat(o.stone ?? '#2b3238', { rough: 0.95 }), dark = E.mat('#1c2126');
  const r = E.rng(21);
  const z = L.wall.z, th = L.wall.thick;
  // the wall, broken into stretches with gaps and jagged tops
  let x = -330;
  while (x < 330) {
    const len = 18 + r() * 30;
    const x0 = x, x1 = Math.min(x + len, 330);
    x = x1 + (r() < 0.25 ? 6 + r() * 14 : 0);
    if (x1 > -6 - 0.01 && x0 < 6 + 0.01) continue;       // the gate opening
    if (x0 < -6 && x1 > -6) { segment(x0, -6); continue; }
    if (x0 < 6 && x1 > 6) { segment(6, x1); continue; }
    segment(x0, x1);
  }
  function segment(a, c) {
    const h = L.wall.h * (o.ruined ? 0.35 + r() * 0.4 : 0.7 + r() * 0.3);
    b.box(c - a, h, th, stone, (a + c) / 2, h / 2, z);
    if (!o.ruined) for (let k = a + 1; k < c - 1; k += 3.2) b.box(1.6, 1.4, th * 0.4, stone, k + 0.8, h + 0.7, z + th * 0.3);
  }
  // the two gate towers, their tops broken
  for (const [i, tw] of L.towers.entries()) {
    const h = o.ruined ? tw.h * 0.8 : tw.h;
    b.box(tw.w, h, tw.w, stone, tw.x, h / 2, tw.z);
    for (let k = 0; k < 4; k++) b.box(tw.w * (0.25 + r() * 0.3), 1.5 + r() * 5, tw.w * (0.3 + r() * 0.4), stone, tw.x + (r() - 0.5) * tw.w * 0.6, h + 1, tw.z + (r() - 0.5) * tw.w * 0.6);
    b.box(1.2, 3, 0.4, dark, tw.x, h * 0.62, tw.z + tw.w / 2 + 0.05);     // a slit
  }
  // the fallen gate: leaves on the ground, the lintel down
  b.box(5.5, 0.6, 8, dark, -3.2, 0.3, 3, 0, 0.35, 0.05);
  b.box(5.0, 0.6, 7.5, dark, 3.6, 0.5, -4, 0.1, -0.5, 0.12);
  b.box(14, 2.2, 2.4, stone, 1, 1.0, 9, 0, 0.18, 0.22);
  // rubble at the breach
  for (let i = 0; i < 40; i++) b.box(0.6 + r() * 2.2, 0.4 + r() * 1.2, 0.6 + r() * 2.2, stone, (r() - 0.5) * 22, 0.3, (r() - 0.5) * 22, r(), r() * 3, r());
  return b.build(W);
}

// ---------------------------------------------------------------- the gatehouse (shell; interior detail optional)
// Interior footprint x 16..32, z -18..-3. The north wall (z = -18) is mostly gone: the breach, a jagged opening over
// x 18.5..31, y 0.4..7.6, looking out at the forecourt, the arch, the stair and the city. Door in the west wall.
export function breachOutline() {
  return [[24.2, 0.0], [24.9, 1.3], [24.3, 3.1], [25.2, 4.5], [24.7, 6.2], [25.9, 7.4], [27.4, 6.9], [28.5, 7.9], [29.8, 7.2],
    [30.9, 6.4], [31.3, 5.0], [30.8, 3.4], [31.35, 1.8], [30.9, 0.0]];
}
export function buildGatehouse(E, W, o = {}) {
  const G = L.gatehouse, b = new E.Batch('gatehouse');
  const stone = E.mat(o.stone ?? '#26292c', { rough: 0.95 }), inner = E.mat(o.inner ?? '#1d1e20', { rough: 0.95 });
  const th = 1.2, h = G.h;
  // west wall with the door (z -10.5 .. -8.5)
  b.box(th, h, 7.3, stone, G.x0 - th / 2, h / 2, -14.35); b.box(th, h, 5.5, stone, G.x0 - th / 2, h / 2, -5.75);
  b.box(th, h - 2.6, 2.2, stone, G.x0 - th / 2, 2.6 + (h - 2.6) / 2, -9.6);
  // east wall, south wall (the outer wall side, with a tall slit toward the causeway)
  b.box(th, h, G.z1 - G.z0 + 2 * th, stone, G.x1 + th / 2, h / 2, (G.z0 + G.z1) / 2);
  b.box(8.8, h, th, stone, G.x0 + 4.4, h / 2, G.z1 + th / 2); b.box(6.4, h, th, stone, G.x1 - 3.2, h / 2, G.z1 + th / 2);
  b.box(0.8, h - 5.4, th, stone, G.x0 + 9.2, 5.4 + (h - 5.4) / 2, G.z1 + th / 2); b.box(0.8, 1.0, th, stone, G.x0 + 9.2, 0.5, G.z1 + th / 2);
  // the north wall with the breach: an extruded outline with a jagged hole
  const outline = [[G.x0 - th, 0], [G.x1 + th, 0], [G.x1 + th, h], [G.x0 - th, h]];
  const hole = breachOutline();
  const wallGeo = E.extrude(outline.map(p => [p[0], p[1]]), th, { holes: [hole.slice().reverse()] });
  b.add(wallGeo, stone, E.M4(0, 0, G.z0 - th / 2));
  // floor and a broken roof (open over the breach side)
  b.box(G.x1 - G.x0 + 2 * th, 0.3, G.z1 - G.z0 + 2 * th, inner, (G.x0 + G.x1) / 2, -0.15, (G.z0 + G.z1) / 2);
  b.box(G.x1 - G.x0 + 2 * th, 0.8, 9.5, stone, (G.x0 + G.x1) / 2, h + 0.4, G.z1 - 3.6);
  b.box(6, 0.8, 6.4, stone, G.x0 + 2.4, h + 0.4, G.z0 + 2.6, 0.05, 0.1, 0.03);
  b.box(4.2, 0.6, 3.2, stone, G.x1 - 3.3, h + 0.2, G.z0 + 1.2, 0.18, -0.2, 0.25);   // a slab sagging into the room
  // roof beams, two of them broken
  for (let i = 0; i < 5; i++) b.box(G.x1 - G.x0, 0.35, 0.35, inner, (G.x0 + G.x1) / 2, h - 0.2, G.z0 + 1.5 + i * 3);
  // the truce lamp mast on the roof
  b.box(0.3, 6.4, 0.3, E.mat('#15181b'), L.truceLamp[0], h + 3.2, L.truceLamp[2]);
  b.box(1.6, 0.18, 0.18, E.mat('#15181b'), L.truceLamp[0] + 0.7, h + 6.4, L.truceLamp[2]);
  const meshes = b.build(W);
  meshes.forEach(m => { m.userData.ground = m.material === inner; });
  // interior props
  const ctx = { meshes };
  if (o.interior) Object.assign(ctx, buildGatehouseInterior(E, W, o));
  return ctx;
}
// the table and campaign map, three judgments under three different seals (bible p.17: paper is the only old thing)
export const TABLE = { x: 20.4, z: -10.6, w: 3.4, d: 1.25, h: 0.92, yaw: -24 };   // long axis turned 24 deg (SW-NE)
const tl = (lx, lz) => { const a = TABLE.yaw * Math.PI / 180; return [TABLE.x + Math.cos(a) * lx + Math.sin(a) * lz, TABLE.z - Math.sin(a) * lx + Math.cos(a) * lz]; };
export const SEALS = [
  { id: 'A', local: [-0.8, -0.1], shape: 'round', color: '#5e2c1e', note: 'round wax seal, umber-red' },
  { id: 'B', local: [0.0, -0.12], shape: 'square', color: '#1b1917', note: 'square black seal' },
  { id: 'C', local: [0.8, -0.1], shape: 'ring', color: '#8a7040', note: 'brass ring seal' },
].map(s => { const [x, z] = tl(...s.local); return { ...s, x, z, y: TABLE.h + 0.07 }; });
export function buildGatehouseInterior(E, W, o = {}) {
  const b = new E.Batch('gh-interior');
  const wood = E.mat('#2e2924', { rough: 0.9 }), dark = E.mat('#141414');
  const tb = TABLE, ya = tb.yaw * Math.PI / 180;
  b.box(tb.w, 0.08, tb.d, E.mat('#3a3836', { rough: 0.9 }), tb.x, tb.h, tb.z, 0, ya, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const [x, z] = tl(sx * (tb.w / 2 - 0.12), sz * (tb.d / 2 - 0.12)); b.box(0.1, tb.h, 0.1, wood, x, tb.h / 2, z, 0, ya, 0); }
  // the campaign map
  { const [x, z] = tl(-0.1, 0.12); b.box(2.4, 0.005, 0.8, E.mat('#5f594d', { rough: 1 }), x, tb.h + 0.045, z, 0, ya, 0); }
  // three judgments (bone), folds mended many times, each under its own seal
  const paper = E.mat('#D8CFB8', { rough: 1 });
  for (const s of SEALS) {
    b.box(0.52, 0.006, 0.36, paper, s.x, tb.h + 0.052, s.z, 0, ya + s.local[0] * 0.06, 0);
    b.box(0.5, 0.008, 0.012, E.mat('#a89f88'), s.x, tb.h + 0.056, s.z, 0, ya, 0);
    const sm = E.mat(s.color, { rough: 0.6, metal: s.shape === 'ring' ? 0.5 : 0.05 });
    const [x, z] = tl(s.local[0], s.local[1] + 0.09);
    if (s.shape === 'round') b.cyl(0.05, 0.05, 0.016, sm, x, tb.h + 0.064, z, 16);
    if (s.shape === 'square') b.box(0.085, 0.016, 0.085, sm, x, tb.h + 0.064, z, 0, ya + 0.3, 0);
    if (s.shape === 'ring') { const rg = new THREE.TorusGeometry(0.045, 0.014, 6, 18); rg.rotateX(Math.PI / 2); b.add(rg, sm, E.M4(x, tb.h + 0.064, z)); }
  }
  // stools, a chest, a weapon rack, debris on the floor
  b.box(0.45, 0.45, 0.45, wood, 17.3, 0.225, -12.6);
  b.box(1.2, 0.7, 0.6, wood, 30.6, 0.35, -5.2);
  b.box(0.08, 2.2, 1.6, dark, 31.6, 1.1, -7.5);
  const r = E.rng(44);
  for (let i = 0; i < 26; i++) b.box(0.2 + r() * 0.7, 0.1 + r() * 0.3, 0.2 + r() * 0.7, E.mat('#26292c'), 24 + r() * 7.5, 0.08, -17.2 + r() * 3.5, r(), r() * 3, r());
  b.build(W);
  // the door: a heavy plank leaf, hinged at the north jamb, swung in (door angle in update)
  const door = new THREE.Group(); door.position.set(L.gatehouse.x0 - 0.05, 0, -10.7); W.add(door);
  const leaf = E.boxMesh(0.12, 2.5, 2.1, wood, door, 0, 1.25, 1.05);
  return { door, leaf };
}

// ---------------------------------------------------------------- forecourt: floor, rubble, guns, arch, stair, block
export function buildForecourt(E, W, o = {}) {
  const F = L.forecourt, b = new E.Batch('forecourt');
  const flag = E.mat(o.floor ?? '#3a3f43', { rough: 0.95 }), dark = E.mat('#23272a'), stone = E.mat(o.stone ?? '#30363b');
  const r = E.rng(31);
  b.box(F.x1 - F.x0, 0.4, F.z1 - F.z0 + 6, flag, (F.x0 + F.x1) / 2, -0.2, (F.z0 + F.z1) / 2 - 3);
  for (let i = 0; i < 70; i++) b.box(0.08, 0.02, 12 + r() * 40, dark, F.x0 + r() * (F.x1 - F.x0), 0.005, F.z0 + r() * (F.z1 - F.z0), 0, r() * Math.PI, 0);
  const floor = b.build(W, { cast: false });
  floor.forEach(m => { m.userData.ground = true; });
  // rubble and debris, more of it after the fall
  const rb = new E.Batch('rubble');
  const n = o.ruined ? 320 : 110;
  for (let i = 0; i < n; i++) {
    const x = F.x0 + 10 + r() * (F.x1 - F.x0 - 20), z = F.z0 + 4 + r() * (F.z1 - F.z0 - 8);
    if (Math.abs(x - L.arch.x) < 6 && Math.abs(z - L.arch.z) < 5) continue;
    const s = o.ruined ? 0.5 + r() * 3.5 : 0.3 + r() * 1.6;
    rb.box(s, s * (0.3 + r() * 0.5), s * (0.6 + r() * 0.8), stone, x, s * 0.15, z, r() * 0.6, r() * 3, r() * 0.6);
  }
  // Aethelgard's battery: three heavy guns aimed at the Crown (key 5)
  if (o.battery !== false) for (const [x, z] of L.battery) {
    const yaw = Math.atan2(0 - x, L.crown.z - z);
    buildCannon(E, rb, x, 0, z, yaw, { elev: 0.5, len: 9, mat: E.mat('#141618', { rough: 0.6, metal: 0.5, rim: true }) });
  }
  rb.build(W);
  return { floor };
}
// the gun barrels of the battery as separate meshes so they can recoil and flash
export function buildBattery(E, W, o = {}) {
  const guns = [];
  // state.battery = {at: [x, z], spacing: [dx, dz], face: [x, z]} moves the three guns (default: the forecourt)
  const iron = E.mat('#121416', { rough: 0.55, metal: 0.55, rim: true });
  for (const [x, z] of L.battery) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(0 - x, L.crown.z - z); W.add(g);
    const b = new E.Batch('gun');
    b.box(2.4, 1.1, 4.2, iron, 0, 0.9, 0);
    for (const sx of [-1, 1]) { const wg = new THREE.CylinderGeometry(1.3, 1.3, 0.3, 20); wg.rotateZ(Math.PI / 2); b.add(wg, iron, E.M4(sx * 1.4, 1.3, -0.3)); }
    b.build(g);
    const barrel = new THREE.Group(); barrel.position.set(0, 1.9, 0); barrel.rotation.x = -(o.elev ?? 0.55); g.add(barrel);
    const bg = new THREE.CylinderGeometry(0.36, 0.6, 9.5, 14); bg.rotateX(Math.PI / 2); bg.translate(0, 0, 3.6);
    E.mesh(bg, iron, barrel);
    const flash = new THREE.Group(); flash.position.set(0, 0, 8.6); barrel.add(flash);
    const fm = E.mesh(new THREE.OctahedronGeometry(1, 0), E.lampMat('#FFF3D0', 6), flash, 0, 0, 0.6, { cast: false });
    fm.scale.set(0.3, 0.3, 1.3);
    const core = E.mesh(new THREE.SphereGeometry(1, 10, 8), E.lampMat('#FF8A2E', 4), flash, 0, 0, 0.7, { cast: false });
    core.scale.set(0.55, 0.55, 0.9);
    flash.visible = false;
    guns.push({ g, barrel, flash, muzzle: () => flash.getWorldPosition(new THREE.Vector3()) });
  }
  return guns;
}

// the stone arch at the foot of the stair: the signal station with its mirrored storm lantern (opening faces +z).
// Round-topped; seven voussoirs that can come loose (arch.broken / arch.stones) and hang in the ward.
export function buildArch(E, W, o = {}) {
  const A = L.arch, g = new THREE.Group(); g.position.set(A.x, 0, A.z); W.add(g);
  const stone = E.mat(o.stone ?? '#2a2f33', { rough: 0.95, rim: true });
  const pw = 0.95, R = A.span / 2;
  const pierL = E.boxMesh(pw, A.h - R, A.depth, stone, g, -(R + pw / 2), (A.h - R) / 2, 0);
  const pierR = E.boxMesh(pw, A.h - R, A.depth, stone, g, R + pw / 2, (A.h - R) / 2, 0);
  const stones = [];
  const N = 7, springY = A.h - R;
  for (let i = 0; i < N; i++) {
    const a0 = Math.PI - (i / N) * Math.PI, a1 = Math.PI - ((i + 1) / N) * Math.PI;
    const pts = [];
    for (let k = 0; k <= 4; k++) { const a = a0 + (a1 - a0) * k / 4; pts.push([Math.cos(a) * R, Math.sin(a) * R]); }
    for (let k = 4; k >= 0; k--) { const a = a0 + (a1 - a0) * k / 4; pts.push([Math.cos(a) * (R + pw), Math.sin(a) * (R + pw)]); }
    const geo = E.extrude(pts, A.depth, { curve: 4 });
    const am = (a0 + a1) / 2, c = [Math.cos(am) * (R + pw / 2), Math.sin(am) * (R + pw / 2)];
    geo.translate(-c[0], -c[1], 0);
    const piv = new THREE.Group(); piv.position.set(c[0], springY + c[1], 0); g.add(piv);
    const m = E.mesh(geo, stone, piv);
    stones.push({ piv, home: piv.position.clone(), angle: am });
  }
  // the lantern: a storm lantern with an inverted flame and a mirror, hung inside the crown of the arch
  const lantern = new THREE.Group(); lantern.position.set(0, A.h - R + R * 0.55, 0); g.add(lantern);
  const iron = E.mat('#1a1c1e', { rim: true });
  E.boxMesh(0.03, 0.5, 0.03, iron, lantern, 0, 0.35, 0);
  E.boxMesh(0.42, 0.06, 0.42, iron, lantern, 0, 0.1, 0);
  E.boxMesh(0.42, 0.06, 0.42, iron, lantern, 0, -0.5, 0);
  const glassL = E.boxMesh(0.34, 0.5, 0.34, E.mat('#8a9094', { transparent: true, opacity: 0.35, rough: 0.2, metal: 0.1 }), lantern, 0, -0.2, 0, { cast: false });
  const flame = E.mesh(new THREE.ConeGeometry(0.07, 0.22, 10), E.lampMat('#F2F4F1', 5), lantern, 0, -0.12, 0, { cast: false });
  flame.rotation.x = Math.PI;                             // the inverted flame
  const mirror = E.mesh(new THREE.CircleGeometry(0.16, 20), E.mat('#B9BEC3', { rough: 0.12, metal: 0.95, double: true }), lantern, 0, -0.2, -0.16, { cast: false });
  // the smashed lantern on the ground (scene 7 onward)
  const smashed = new THREE.Group(); smashed.position.set(0.9, 0, 1.0); g.add(smashed);
  const sb = new E.Batch('smashed');
  sb.box(0.42, 0.06, 0.42, iron, 0, 0.03, 0, 0.2, 0.4, 0.1); sb.box(0.3, 0.05, 0.2, iron, 0.4, 0.03, 0.2, 0, 1, 0.3);
  const rr = E.rng(7); for (let i = 0; i < 14; i++) sb.box(0.05 + rr() * 0.1, 0.01, 0.05 + rr() * 0.1, E.mat('#8a9094'), (rr() - 0.5) * 1.2, 0.01, (rr() - 0.5) * 1.2, 0, rr() * 3, 0);
  sb.build(smashed);
  return { g, pierL, pierR, stones, lantern, flame, mirror, smashed, glassL, springY, R };
}
export function poseArch(arch, st = {}, t = 0) {
  // broken 0..1: the right pier shortens; stones 0..1: the voussoirs come loose and drift up and right (key p.9)
  const br = st.broken ?? 0, sp = st.stones ?? 0, drop = st.drop ?? 0;
  arch.pierR.scale.y = 1 - 0.38 * br; arch.pierR.position.y = (arch.springY * (1 - 0.38 * br)) / 2;
  arch.stones.forEach((s, i) => {
    const k = Math.max(0, (i - 2) / 4);                  // the right half breaks; the left stays
    const lift = sp * k;
    s.piv.position.set(s.home.x + lift * (0.6 + i * 0.35), s.home.y + lift * (0.4 + i * 0.25) - drop * k, s.home.z);
    s.piv.rotation.set(0, 0, -lift * (0.4 + i * 0.25));
    s.piv.visible = !(br > 0.5 && i === 6 && sp === 0);
  });
  arch.lantern.visible = (st.lantern ?? 'lit') !== 'gone' && (st.lantern ?? 'lit') !== 'smashed';
  arch.flame.visible = (st.lantern ?? 'lit') === 'lit';
  arch.smashed.visible = (st.lantern ?? 'lit') === 'smashed';
}

// the lower flight of the great stair, climbing along the tier-0 face from the foot (x 30) west to the top (x 6),
// a solid stepped mass whose flank reads as a saw-tooth (key p.6). Damaged: steps broken out, rubble.
export function buildStair(E, W, o = {}) {
  const b = new E.Batch('stair');
  const stone = E.mat(o.stone ?? '#3a4046', { rough: 0.95 }), worn = E.mat('#2f353a');
  const [zf, zb] = L.stairZ, foot = L.stairFoot[0], top = L.stairTop[0], rise = L.stairTop[1];
  const n = 40, run = (foot - top) / n, h = rise / n;
  const r = E.rng(41);
  for (let i = 0; i < n; i++) {
    const x = foot - (i + 0.5) * run, y = (i + 1) * h;
    const broken = o.ruined ? r() < 0.35 : (r() < 0.08);
    const d = zb - zf;
    if (broken) { b.box(run, y - h * 2, d * (0.4 + r() * 0.5), worn, x, (y - h * 2) / 2, zb - d * 0.3); continue; }
    b.box(run, y, d, stone, x, y / 2, (zf + zb) / 2);
  }
  // the landing at the top, and the stair's parapet on the outer edge (low)
  b.box(14, rise, 14, stone, top - 7, rise / 2, (zf + zb) / 2 - 1);
  const meshes = b.build(W);
  meshes.forEach(m => { m.userData.ground = true; });
  return meshes;
}
// the falling block: a dressed parapet stone, posable at any height and rotation (block.y, block.rot, or block.fall)
export function buildBlock(E, W) {
  const B = L.block;
  const g = new THREE.Group(); W.add(g);
  const m = E.boxMesh(B.w, B.h, B.d, E.mat('#1f2124', { rough: 0.95, rim: true }), g, 0, 0, 0);
  // a broken face: two chips
  E.boxMesh(B.w * 0.5, B.h * 0.4, 0.3, E.mat('#2a2d31'), g, B.w * 0.2, -B.h * 0.35, B.d / 2 + 0.05).rotation.set(0.3, 0.2, 0.1);
  E.boxMesh(0.5, 0.5, 0.5, E.mat('#2a2d31'), g, -B.w * 0.45, B.h * 0.45, -0.3).rotation.set(0.5, 0.4, 0.2);
  return { g, m };
}
export function poseBlock(blk, st = {}, t = 0) {
  const B = L.block;
  let y = st.y ?? B.y;
  if (st.fall) {                                         // {t0, y0, y1}: from y0 at t0, under gravity, to rest at y1
    const f = st.fall, dt = Math.max(0, t - (f.t0 ?? 0));
    const y0 = f.y0 ?? B.y, y1 = f.y1 ?? B.h / 2;
    y = Math.max(y1, y0 - 0.5 * 9.81 * dt * dt);
  }
  blk.g.position.set(st.x ?? B.x, y, st.z ?? B.z);
  const rot = st.rot ?? [8, 22, -6];
  blk.g.rotation.set(rot[0] * Math.PI / 180, rot[1] * Math.PI / 180, rot[2] * Math.PI / 180);
  blk.g.visible = st.visible ?? true;
}

// ---------------------------------------------------------------- the inner wall on the lip of tier 0
export function buildInnerWall(E, W, o = {}) {
  const I = L.innerWall, b = new E.Batch('inner-wall');
  const stone = E.mat(o.stone ?? '#2c3338', { rough: 0.95 });
  const hw = T[0].hw;
  const gx0 = I.gateX - I.gateW / 2, gx1 = I.gateX + I.gateW / 2;
  const h = o.ruined ? I.h * 0.35 : I.h;
  b.box(gx0 + hw, h, 3, stone, (-hw + gx0) / 2, I.y + h / 2, I.z);
  b.box(hw - gx1, h, 3, stone, (gx1 + hw) / 2, I.y + h / 2, I.z);
  b.box(I.gateW + 2, 3, 3.4, stone, I.gateX, I.y + h - 1.5, I.z);           // lintel over the gate
  if (!o.ruined) for (let x = -hw + 2; x < hw; x += 4) b.box(2, 1.6, 3.2, stone, x, I.y + h + 0.8, I.z);   // merlons
  // the parapet cornice over the stair foot: the block tears loose from here (key p.6, top left)
  b.box(34, 1.4, 6.5, stone, 46, I.y - 0.2, -88.6);
  b.box(34, 3.2, 3, stone, 46, I.y + 1.6, -89.6);
  for (let x = 30; x < 63; x += 3.4) b.box(0.8, 1.6, 0.8, stone, x, I.y - 1.4, -86.2);   // corbels under it
  b.build(W);
  // the gate leaves (shut / open 0..1)
  const leaves = [];
  for (const sx of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(I.gateX + sx * I.gateW / 2, I.y, I.z + 1.2); W.add(piv);
    E.boxMesh(I.gateW / 2, I.h - 3, 0.4, E.mat('#1d2125', { rough: 0.8 }), piv, -sx * I.gateW / 4, (I.h - 3) / 2, 0);
    leaves.push({ piv, sx });
  }
  return { leaves };
}

// ---------------------------------------------------------------- the ziggurat: eight terraces, houses, the stair
// Tier k: x -hw..hw, z back..front, top at y = 12 + 22k. The great stair climbs the centre (x -12..12), one flight
// per tier face. Houses crowd the front of each terrace. Returns per-tier meshes so the fall can break them up.
export function buildZiggurat(E, W, o = {}) {
  const stone = E.mat(o.stone ?? '#2b343c', { rough: 0.95 }), face = E.mat(o.face ?? '#26303a', { rough: 0.95 });
  const house = E.mat(o.house ?? '#2e3740', { rough: 0.95 }), houseD = E.mat(o.houseDark ?? '#232b33', { rough: 0.95 });
  const r = E.rng(51);
  const tiers = [];
  const fromTier = o.fromTier ?? 0, toTier = o.toTier ?? 7;
  for (let k = fromTier; k <= toTier; k++) {
    const t = T[k], b = new E.Batch(`tier${k}`), hb = new E.Batch(`houses${k}`);
    const base = k === 0 ? 0 : T[k - 1].top, hgt = t.top - base;
    // the terrace mass (front face slightly battered), pilasters on the front face
    b.box(2 * t.hw, hgt, t.front - t.back, stone, 0, base + hgt / 2, (t.front + t.back) / 2);
    for (let x = -t.hw + 6; x < t.hw - 4; x += 12) b.box(2.2, hgt, 1.4, face, x, base + hgt / 2, t.front + 0.5);
    b.box(2 * t.hw + 2, 1.6, 3, face, 0, t.top + 0.2, t.front + 0.8);                 // the cornice along the lip
    // the great stair flight up this tier's face (tier 0 has the lower flight instead)
    if (k > 0) {
      const z0 = t.front + 26, z1 = t.front;                                            // from the terrace below up to this lip
      const n = 30, run = (z0 - z1) / n, h = hgt / n;
      for (let i = 0; i < n; i++) b.box(2 * L.greatStair.hw, (i + 1) * h, run, o.stairMat ?? face, 0, base + (i + 1) * h / 2, z0 - (i + 0.5) * run);
      for (const sx of [-1, 1]) b.box(2, hgt + 1.5, z0 - z1, face, sx * (L.greatStair.hw + 1), base + (hgt + 1.5) / 2 - 0.4, (z0 + z1) / 2);
    }
    // houses on the terrace: stacked boxes in rows behind the lip (not on the stair avenue)
    const next = T[k + 1];
    const zMax = t.front - 7, zMin = next ? next.front + 4 : t.back + 20;
    const count = Math.round((t.hw / 330) * (k < 7 ? 110 : 30));
    for (let i = 0; i < count; i++) {
      const x = (r() * 2 - 1) * (t.hw - 10), z = zMin + r() * (zMax - zMin);
      if (Math.abs(x) < L.greatStair.hw + 6) continue;
      if (k === 0 && z > L.innerWall.z - 6) continue;
      if (k === 7 && Math.abs(x) < L.crown.hw + 30 && z < L.crown.z + 60 && z > L.crown.z - 60) continue;
      const w = 6 + r() * 12, d = 6 + r() * 10, hh = 3 + r() * (k < 3 ? 9 : 7) * (1 - 0.6 * Math.abs(x) / t.hw);
      hb.box(w, hh, d, r() < 0.5 ? house : houseD, x, t.top + hh / 2, z, 0, (r() < 0.2 ? 0.2 : 0), 0);
      if (r() < 0.35) hb.box(w * 0.6, hh * 0.6, d * 0.6, house, x + (r() - 0.5) * 2, t.top + hh + hh * 0.3, z);
    }
    const meshes = [...b.build(W), ...hb.build(W)];
    tiers.push({ k, meshes });
  }
  return { tiers };
}

// ---------------------------------------------------------------- the Crown: works, shutters, fire, towers
// The works block on the summit; its front face (z = crownFront) has one opening closed by six armoured plates that
// drop one after another (crown.shutter = plates down, 0..6; fractional = the moving plate). Fire glows inside.
export function buildCrown(E, W, o = {}) {
  const C = L.crown, g = new THREE.Group(); W.add(g);
  const stone = E.mat(o.stone ?? '#2a333b', { rough: 0.95 }), plate = E.mat(o.plate ?? '#30363c', { rough: 0.6, metal: 0.5, rim: true });
  const brass = E.mat('#5d4a2c', { rough: 0.5, metal: 0.6 });
  const fz = crownFront(), Op = C.opening;
  const b = new E.Batch('crown');
  // the works: a stacked block (Solforiz: steps and horizontals), a frame around the opening
  b.box(2 * C.hw, Op.y - C.y, C.d, stone, 0, (C.y + Op.y) / 2, C.z);
  b.box(2 * C.hw, C.y + C.h - (Op.y + Op.h), C.d, stone, 0, (Op.y + Op.h + C.y + C.h) / 2, C.z);
  b.box(C.hw - Op.w / 2, Op.h, C.d, stone, -(C.hw + Op.w / 2) / 2, Op.y + Op.h / 2, C.z);
  b.box(C.hw - Op.w / 2, Op.h, C.d, stone, (C.hw + Op.w / 2) / 2, Op.y + Op.h / 2, C.z);
  b.box(2 * C.hw - 24, 12, C.d - 20, stone, 0, C.y + C.h + 6, C.z - 4);
  b.box(2 * C.hw - 60, 9, C.d - 40, stone, 0, C.y + C.h + 16, C.z - 8);
  // crenellated prongs on top (the Crown's silhouette in key p.5)
  for (const x of [-38, -16, 6, 28, 46]) b.box(7, 16 + (Math.abs(x) % 9), 8, stone, x, C.y + C.h + 20 + 8, C.z - 6);
  // brass pipework down the faces
  for (let i = 0; i < 9; i++) b.cyl(1.2, 1.2, C.h + 4, brass, -60 + i * 15, C.y + C.h / 2, fz + 1.5, 10);
  // the shutter rails either side of the opening
  for (const sx of [-1, 1]) b.box(3, Op.h + 22, 3, plate, sx * (Op.w / 2 + 1.5), Op.y + Op.h / 2 + 9, fz + 2.2);
  b.box(Op.w + 6, 3, 3.6, plate, 0, Op.y + Op.h + 22, fz + 2.2);                      // the housing the plates drop from
  b.build(g);
  // fire inside: a recessed wall behind the opening (its brightness is crown.fire)
  const fireMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#E08A3A').multiplyScalar(3), fog: true });
  fireMat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, E.U); };
  const fire = E.boxMesh(Op.w - 0.5, Op.h - 0.5, 1, fireMat, g, 0, Op.y + Op.h / 2, fz - 6, { cast: false });
  // a dark interior box around the fire so the opening reads as depth
  E.boxMesh(Op.w + 1, Op.h + 1, 0.5, E.mat('#0b0806'), g, 0, Op.y + Op.h / 2, fz - 7, { cast: false });
  // six plates, each a sixth of the opening, dropping from the housing above
  const plates = [];
  const ph = Op.h / 6;
  for (let i = 0; i < 6; i++) {
    const p = E.boxMesh(Op.w + 1.6, ph + 0.15, 1.2, plate, g, 0, 0, fz + 1.6);
    // rivet lines across each plate
    for (let k = 0; k < 2; k++) E.boxMesh(Op.w + 1.6, 0.2, 0.15, E.mat('#20252a', { rough: 0.6, metal: 0.4 }), p, 0, (k - 0.5) * 0.5 / (ph + 0.15) , 0.62).scale.set(1, 0.2 / (ph + 0.15), 1);
    plates.push(p);
  }
  // cracks that glow when the fire comes through (crown.through 0..1)
  const crackMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FF8A2E').multiplyScalar(4), fog: true });
  crackMat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, E.U); };
  const cracks = new THREE.Group(); g.add(cracks);
  const cr = E.rng(61);
  for (let i = 0; i < 26; i++) { const c = E.boxMesh(1 + cr() * 7, 0.35, 0.2, crackMat, cracks, (cr() - 0.5) * Op.w, Op.y + cr() * Op.h, fz + 2.3, { cast: false }); c.rotation.z = (cr() - 0.5) * 1.6; }
  // the four tall towers with cross-arms; tower i leans by towers[i] degrees (falls across the retaining wall)
  const towers = [];
  for (const [i, [x, z]] of L.crownTowers.entries()) {
    const piv = new THREE.Group(); piv.position.set(x, T[7].top, z); g.add(piv);
    const tb = new E.Batch('tower');
    const tm = E.mat(o.tower ?? '#283038', { rough: 0.9, rim: true });
    const th = 74 + (i % 2) * 8;
    tb.add(new THREE.CylinderGeometry(2.2, 4.2, th, 4), tm, E.M4(0, th / 2, 0, 0, Math.PI / 4, 0));
    for (let k = 0; k < 5; k++) tb.box(16 - k * 1.6, 1.0, 1.0, tm, 0, 20 + k * 11, 0);
    tb.add(new THREE.ConeGeometry(2.4, 7, 4), tm, E.M4(0, th + 3.5, 0, 0, Math.PI / 4, 0));
    tb.build(piv);
    towers.push({ piv, x, z, h: th });
  }
  return { g, plates, fire, fireMat, cracks, crackMat, towers, ph, fz };
}
export function poseCrown(c, st = {}, t = 0) {
  const Op = L.crown.opening;
  const n = st.shutter ?? 0;                             // plates down, 0..6 (6 = shut)
  c.plates.forEach((p, i) => {
    // plate i lands at the top of the opening first (i = 0), then the next below it ... the last covers the bottom
    const k = Math.max(0, Math.min(1, n - i));
    const yRest = Op.y + Op.h - (i + 0.5) * c.ph, yUp = Op.y + Op.h + 12 + c.ph / 2;
    p.position.y = yUp + (yRest - yUp) * k;
    p.visible = k > 0.001 || i === Math.floor(n);
  });
  const fire = st.fire ?? 0.6;
  c.fireMat.color.set('#E08A3A').multiplyScalar(0.2 + 4 * fire);
  c.fire.visible = fire > 0;
  const th = st.through ?? 0;
  c.cracks.visible = th > 0;
  c.crackMat.color.set('#FF8A2E').multiplyScalar(4 * th);
  // the towers: lean in degrees about the base (toward +z, over the retaining wall), or fall 0..1 (to 90 degrees)
  c.towers.forEach((tw, i) => {
    const lean = (st.towers?.[i] ?? 0) + (i === 0 ? (st.towerFall ?? 0) * 88 : 0);
    tw.piv.rotation.set(lean * Math.PI / 180, 0, (i % 2 ? -1 : 1) * lean * 0.15 * Math.PI / 180);
  });
}

// ---------------------------------------------------------------- the high arcades: the Solforiz battery
export function buildArcades(E, W, o = {}) {
  const t = T[L.arcades.tier], prev = T[L.arcades.tier - 1];
  const b = new E.Batch('arcades');
  const dark = E.mat('#0e1114'), stone = E.mat(o.stone ?? '#2b343c'), iron = E.mat('#15181b', { rough: 0.6, metal: 0.5 });
  const guns = [];
  const n = L.arcades.n, span = 2 * (t.hw - 40);
  for (let i = 0; i < n; i++) {
    const x = -span / 2 + (i + 0.5) * span / n;
    if (Math.abs(x) < 22) continue;
    const y = prev.top + 6, z = t.front + 0.8;
    b.box(9, 11, 2, dark, x, y + 5.5, z);                // the arch opening (dark recess)
    const g = new THREE.CylinderGeometry(0.4, 0.6, 7, 10); g.rotateX(Math.PI / 2); g.translate(0, 0, 3);
    b.add(g, iron, E.M4(x, y + 2.8, z, -0.25, 0, 0));
    guns.push([x, y + 3.6, z + 6.4]);
  }
  b.build(W);
  return { guns };
}

// ---------------------------------------------------------------- lamps as small bright points (constant pixel size)
// The city's amber lamps, the truce lamp, figures' lamps: GL points, depth-tested, a few pixels at any distance.
// No halo: the brightest thing is always small.
export function makePoints(E, parent, positions, o = {}) {
  const n = positions.length;
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  const r = E.rng(o.seed ?? 3);
  positions.forEach((p, i) => { pos.set(p, i * 3); seed[i] = r(); });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const u = { uColor: { value: new THREE.Color(o.color ?? '#E08A3A') }, uLevel: { value: 1 }, uPx: { value: o.px ?? 3 }, uNearPx: { value: o.nearPx ?? 6 },
    uRef: { value: o.ref ?? 300 }, fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 }, uVary: { value: o.vary ?? 0.35 }, uOn: { value: 1 } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: false, depthWrite: false,
    vertexShader: `attribute float seed; uniform float uPx, uNearPx, uRef, uOn; varying float vD; varying float vS;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = length(mv.xyz); vS = seed;
        gl_PointSize = step(seed, uOn) * clamp(uPx * uRef / max(vD, 1.0), uPx, uNearPx); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor, fogColor; uniform float uLevel, fogDensity, uVary; varying float vD; varying float vS;
      void main(){ vec2 c = gl_PointCoord - 0.5; if (dot(c, c) > 0.25) discard;
        float f = 1.0 - exp(-fogDensity * fogDensity * vD * vD);
        vec3 col = uColor * uLevel * (1.0 - uVary + uVary * vS);
        gl_FragColor = vec4(mix(col, fogColor, f * 0.85), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false; pts.renderOrder = 20;
  parent.add(pts);
  pts.userData.isLampPoints = true;
  return { pts, u, g };
}
export function cityLampPositions(E, o = {}) {
  const r = E.rng(71), out = [];
  for (const t of T) {
    if (o.maxTier !== undefined && t.k > o.maxTier) continue;
    const n = Math.round(t.hw / 330 * 70);
    for (let i = 0; i < n; i++) {
      const x = (r() * 2 - 1) * (t.hw - 6), side = r();
      if (Math.abs(x) < L.greatStair.hw + 2 && r() < 0.7) continue;
      const next = T[t.k + 1];
      const z = side < 0.55 ? t.front + 1.5 : (next ? next.front + 4 + r() * (t.front - next.front - 12) : t.front - r() * 40);
      out.push([x, t.top + 1.5 + r() * (side < 0.55 ? 1 : 9), z]);
    }
  }
  // lamps along the great stair flights
  for (let k = 1; k < 8; k++) { const t = T[k], prev = T[k - 1]; for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) { const u = (i + 0.5) / 4; out.push([sx * 13.5, prev.top + (t.top - prev.top) * u + 1.5, t.front + 26 * (1 - u)]); } }
  return out;
}
// the four-beat pulse (bible p.14, PROPOSED): the city's lamps breathe four beats, rest one, and go out together
export function pulseLevel(t, o = {}) {
  const beat = o.beat ?? 0.62, group = o.group ?? 4;
  if (o.outAt !== undefined && t >= o.outAt) return 0;
  const cycle = beat * (group + 1), u = ((t + (o.phase ?? 0)) % cycle + cycle) % cycle, i = Math.floor(u / beat);
  if (i >= group) return 0;
  const v = (u - i * beat) / beat;
  return Math.exp(-v * 5);
}
