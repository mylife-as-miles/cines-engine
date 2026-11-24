// SCENE 1. INT. KWIND-09 - FOUNDRY - NIGHT (bible p.5 key 1; shots 1.1-1.4)
// A black void. The hero coupling hangs on two chains at the origin; it is four times the worker's height (1.78 m ->
// 7.12 m), a banded copper drum 1.5x as tall as it is wide, with the silver ring a third of the way down and the
// violet seam under it. Rows of couplings recede into the dark to the left (-x) and back (-z). The furnace slot in
// the floor glows from below: the only under-lighting in the film.
import * as THREE from 'three';

export const COUPLING = { height: 7.12, radius: 2.35, ringFromTop: 7.12 / 3 };

// the coupling: a banded copper drum, the silver ring (two halves that close), the violet seam, rivet lines.
// Local origin at the bottom centre. Returned handles let a set open/close the ring and run the seam.
export function buildCoupling(E, parent, o = {}) {
  const { height: Hc, radius: Rc } = COUPLING;
  const g = new THREE.Group(); parent.add(g);
  const copper = E.mat(o.scarred ? '#9a5a2f' : '#B66A35', { rough: 0.42, metal: 0.65, rim: true });
  const dark = E.mat('#4a2814', { rough: 0.7, metal: 0.4 });
  const drum = E.mesh(new THREE.CylinderGeometry(Rc, Rc, Hc, 48, 1), copper, g, 0, Hc / 2, 0);
  const capT = E.mesh(new THREE.CylinderGeometry(Rc * 0.96, Rc, 0.25, 48), dark, g, 0, Hc + 0.12, 0);
  // bands: shallow dark grooves, and the grid of rivet lines (Kwind-09: rows, rivets, plating)
  const b = new E.Batch('coupling-bands');
  const bandYs = [0.9, 1.9, 3.0, Hc - 1.05, Hc - 0.35, 5.6];
  for (const y of bandYs) b.add(new THREE.CylinderGeometry(Rc + 0.03, Rc + 0.03, 0.09, 48, 1, true), dark, E.M4(0, y, 0));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    for (let k = 0; k < 9; k++) b.box(0.07, 0.07, 0.05, dark, Math.sin(a) * (Rc + 0.02), 0.45 + k * 0.78, Math.cos(a) * (Rc + 0.02), 0, a, 0);
  }
  if (o.scarred) {                                      // 9.3: scarred now; re-plated patches and gouges
    const scar = E.mat('#3b2a1f', { rough: 0.9 });
    const r = E.rng(93);
    for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, y = 0.5 + r() * (Hc - 1); b.box(0.3 + r() * 0.9, 0.04 + r() * 0.12, 0.05, scar, Math.sin(a) * (Rc + 0.02), y, Math.cos(a) * (Rc + 0.02), 0, a, (r() - 0.5) * 0.8); }
    for (let i = 0; i < 5; i++) { const a = r() * Math.PI * 2, y = 0.8 + r() * (Hc - 2); b.box(0.9, 0.7, 0.06, E.mat('#3B3D40', { rough: 0.6, metal: 0.5 }), Math.sin(a) * (Rc + 0.04), y, Math.cos(a) * (Rc + 0.04), 0, a, 0); }
  }
  b.build(g);
  // the silver ring: two halves hinged at +x; ring = 1 closed, 0 open (halves swung 70 degrees apart)
  const silver = E.mat('#B9BEC3', { rough: 0.22, metal: 0.9, rim: true });
  const ringY = Hc - COUPLING.ringFromTop;
  const hinge = new THREE.Group(); hinge.position.set(0, ringY, 0); g.add(hinge);
  const halves = [];
  for (const k of [0, 1]) {
    const piv = new THREE.Group(); piv.position.set(Rc + 0.16, 0, 0); hinge.add(piv);
    const geo = new THREE.CylinderGeometry(Rc + 0.16, Rc + 0.16, 0.42, 40, 1, true, k ? 0 : Math.PI, Math.PI);
    const inner = new THREE.CylinderGeometry(Rc + 0.02, Rc + 0.02, 0.42, 40, 1, true, k ? 0 : Math.PI, Math.PI);
    const ring = new THREE.Group(); ring.position.set(-(Rc + 0.16), 0, 0); piv.add(ring);
    const m1 = new THREE.Mesh(geo, silver), m2 = new THREE.Mesh(inner, E.mat('#7f8489', { rough: 0.4, metal: 0.8, double: true }));
    ring.add(m1); ring.add(m2);
    for (const y of [-0.21, 0.21]) { const lip = new THREE.Mesh(new THREE.RingGeometry(Rc + 0.02, Rc + 0.16, 40, 1, k ? 0 : Math.PI, Math.PI), silver); lip.rotation.x = -Math.PI / 2; lip.position.y = y; lip.material = E.mat('#B9BEC3', { rough: 0.22, metal: 0.9, double: true, rim: true }); ring.add(lip); }
    ring.traverse(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
    halves.push(piv);
  }
  // the violet seam: a thin line of light under the ring that runs around (seam 0..1 = fraction lit)
  const SEG = 96;
  const seamGeo = new THREE.CylinderGeometry(Rc + 0.035, Rc + 0.035, 0.045, SEG, 1, true);
  const seam = new THREE.Mesh(seamGeo, E.lampMat('#7C4DF0', 3.2, { fog: true }));
  seam.position.y = ringY - 0.26; g.add(seam);
  return {
    group: g, drum, halves, seam, seamGeo, ringY, SEG,
    set(st = {}) {
      const ring = st.ring ?? 1, sm = st.seam ?? 1;
      halves[0].rotation.y = (1 - ring) * 1.2; halves[1].rotation.y = -(1 - ring) * 1.2;
      const n = Math.round(Math.max(0, Math.min(1, sm)) * SEG);
      seam.visible = n > 0;
      seamGeo.setDrawRange(0, n * 6);
    },
  };
}
// a chain of links from a to b (world), merged into a batch
export function chain(E, batch, a, b, link = 0.32, m) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length(), n = Math.floor(L / (link * 0.78));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const tor = new THREE.TorusGeometry(link * 0.32, link * 0.07, 5, 10); tor.scale(1, 1.45, 1);
  for (let i = 0; i < n; i++) {
    const p = A.clone().addScaledVector(d, (i + 0.5) / n);
    const qi = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (i % 2) * Math.PI / 2));
    batch.add(tor, m, new THREE.Matrix4().compose(p, qi, new THREE.Vector3(1, 1, 1)));
  }
}

export default {
  look: 'foundry',
  marks: {
    coupling: [0, 0, 0], ring: [0, 4.75, 0], seam: [0, 4.49, 0], worker: [-3.4, 0, 1.6], furnace: [-6, 0, 4.5],
    rowStart: [-7.5, 0, -2], rowEnd: [-34, 0, -40],
  },
  build(E, opts = {}) {
    const W = E.world;
    // floor: soot-black iron, a grid of plates
    const floor = E.mesh(new THREE.PlaneGeometry(400, 400), E.mat('#120d0a', { rough: 0.75, metal: 0.3 }), W, 0, 0, 0, { ground: true });
    floor.rotation.x = -Math.PI / 2;
    const b = new E.Batch('foundry');
    const seamM = E.mat('#070504', { rough: 0.9 });
    for (let i = -30; i <= 30; i++) { b.box(0.05, 0.01, 200, seamM, i * 3, 0.004, -60); b.box(200, 0.01, 0.05, seamM, 0, 0.004, -60 + i * 3); }
    // the furnace slot: a long glowing gap in the floor beside the rows (the only light from below)
    const glow = E.lampMat('#ff7a2a', 2.2, { fog: true });
    const ROW0 = [-18.4, -25], ROW1 = [1.8, -112];
    const rowAng = Math.atan2(ROW1[0] - ROW0[0], ROW1[1] - ROW0[1]);
    const slot = E.boxMesh(0.35, 0.05, 130, glow, W, (ROW0[0] + ROW1[0]) / 2 + 4.2, 0.005, (ROW0[1] + ROW1[1]) / 2 + 22, { cast: false });
    slot.rotation.y = rowAng;
    b.build(W, { cast: false });
    // pools of furnace light on the floor (they colour the floor, not the figures: a silhouette stays black)
    E.pool('#ff6a1e', 7, 0.55, W, -3.6, 0, 3.5, { sx: 1.6, soft: 2.4 });
    E.pool('#ff6a1e', 14, 0.35, W, -9, 0, -24, { sx: 0.8, sz: 2.4, soft: 2 });
    const vpool = E.pool('#7C4DF0', 3.2, 0.5, W, 0.3, 0, 1.2, { sx: 1.4, soft: 2.5 });
    // rows of identical couplings waiting in the dark, receding from the front left toward the worker
    const rows = new E.Batch('rows');
    const cop = E.mat('#B66A35', { rough: 0.45, metal: 0.65, rim: true }), copDark = E.mat('#4a2814', { rough: 0.7, metal: 0.4 });
    for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) {
      const k = i / 8, x = ROW0[0] + (ROW1[0] - ROW0[0]) * k - row * 14, z = ROW0[1] + (ROW1[1] - ROW0[1]) * k - row * 22;
      rows.add(new THREE.CylinderGeometry(2.35, 2.35, 7.12, 28, 1), cop, E.M4(x, 0.6 + 3.56, z));
      for (const y of [1.5, 2.5, 3.6, 6.1, 6.8]) rows.add(new THREE.CylinderGeometry(2.38, 2.38, 0.09, 28, 1, true), copDark, E.M4(x, y, z));
      rows.add(new THREE.CylinderGeometry(0.06, 0.06, 30, 5), E.mat('#141210'), E.M4(x - 1, 22.6, z));
      rows.add(new THREE.CylinderGeometry(0.06, 0.06, 30, 5), E.mat('#141210'), E.M4(x + 1, 22.6, z));
    }
    rows.build(W);
    // gantry rails high overhead, lost in the dark
    const g2 = new E.Batch('gantry');
    for (let k = 0; k < 6; k++) g2.box(0.6, 0.8, 140, E.mat('#191512', { metal: 0.4 }), -40 + k * 14, 34, -30);
    g2.build(W);
    // the hero coupling on two chains
    const hang = new THREE.Group(); W.add(hang);
    const cp = buildCoupling(E, hang);
    const chains = new E.Batch('chains');
    const ironM = E.mat('#2b2724', { rough: 0.55, metal: 0.7, rim: true });
    chain(E, chains, [-1.6, COUPLING.height + 0.2, 0], [0, COUPLING.height + 30, 0], 0.36, ironM);
    chain(E, chains, [1.6, COUPLING.height + 0.2, 0], [0, COUPLING.height + 30, 0], 0.36, ironM);
    chains.build(hang);
    // lights: the furnace pool (low, orange), a violet pool under the seam; the key comes from the look
    const furnace = E.pointLight('#ff7a30', 260, 60, 2); furnace.position.set(-6, 0.25, -16);
    const furnace2 = E.pointLight('#ff6a20', 120, 40, 2); furnace2.position.set(2.5, 0.25, -6);
    const violet = E.pointLight('#7C4DF0', 3, 5, 2); violet.position.set(0.3, 0.6, 2.8);
    return { hang, cp, furnace, furnace2, violet, vpool, presets: PRESETS };
  },
  update(E, R, t, ctx) {
    const st = R.coupling ?? {};
    ctx.hang.position.set(0, st.y ?? 0.6, 0);         // y = the coupling's bottom above the floor (it descends on chains)
    ctx.hang.rotation.y = (st.turn ?? 0) * Math.PI / 180;
    ctx.cp.set({ ring: st.ring ?? 1, seam: st.seam ?? 1 });
    const sm = Math.max(0, Math.min(1, st.seam ?? 1)) * (st.violet ?? 1);
    ctx.violet.intensity = 3 * sm; ctx.vpool.material.uniforms.uStrength.value = 0.5 * sm;
    ctx.furnace.intensity = 260 * (R.furnace ?? 1); ctx.furnace2.intensity = 120 * (R.furnace ?? 1);
  },
};

const PRESETS = {
  // bible p.5 key 1: the anchor. The worker at the foot of the rows, the coupling right of centre.
  key: {
    state: { coupling: { y: 0.6, ring: 1, seam: 1 }, figures: { worker: { pos: [-3.3, 2.2], face: 200 } } },
    cam: { pos: [-5.5, 1.6, 31], target: [-2.4, 3.9, 0], f: 36, shift: [0.0, 0.0] },
  },
};
