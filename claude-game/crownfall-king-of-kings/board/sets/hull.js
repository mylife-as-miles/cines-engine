// 9.3 INSIDE THE HULL (bible p.9; shot 9.3, "the same angle and framing as 1.2 and 1.3"): the copper coupling from the
// foundry, scarred now, turning under load, with the same silver ring. The coupling stands where the foundry's hung
// (origin), same size, so the foundry's cameras work unchanged; iron ribs arch over it and recede into the dark where
// the foundry's rows were; gold light through slots in the plating. State: coupling.turn (degrees; animate it with
// {clock: 0, rate: 9} for a slow turn), coupling.y (bottom height, default 0.6), coupling.ring / .seam as in foundry.
import * as THREE from 'three';
import { buildCoupling, chain, COUPLING } from './foundry.js';

const PRESETS = {
  key: {
    state: { coupling: { y: 0.6, turn: { clock: 0, rate: 9 }, seam: 0 }, figures: { worker: { pos: [-3.3, 2.2], face: 200 } } },
    cam: { pos: [-5.5, 1.6, 31], target: [-2.4, 3.9, 0], f: 36 },
  },
};
export default {
  look: 'hull',
  marks: { coupling: [0, 0, 0], ring: [0, 5.35, 0], worker: [-3.3, 0, 2.2] },
  build(E) {
    const W = E.world;
    const floor = E.mesh(new THREE.PlaneGeometry(400, 400), E.mat('#141416', { rough: 0.7, metal: 0.3 }), W, 0, 0, 0, { ground: true });
    floor.rotation.x = -Math.PI / 2;
    const b = new E.Batch('hull-ribs');
    const iron = E.mat('#2B2D31', { rough: 0.6, metal: 0.45, rim: true }), dark = E.mat('#141416', { rough: 0.8 });
    // ribs: arched frames across the hold, every 7 m, receding back and to the left like the foundry's rows
    for (let i = 0; i < 22; i++) {
      const z = 10 - i * 7;
      const arc = new THREE.TorusGeometry(26, 0.9, 6, 40, Math.PI); arc.scale(1, 0.85, 1);
      b.add(arc, iron, E.M4(-4, 0, z));
      b.box(1.8, 0.8, 7, dark, -4 - 26, 0.4, z - 3.5); b.box(1.8, 0.8, 7, dark, -4 + 26, 0.4, z - 3.5);
      for (let k = 0; k < 6; k++) { const a = (k + 0.5) / 6 * Math.PI; b.box(0.5, 0.5, 7, dark, -4 + Math.cos(a) * 26, Math.sin(a) * 22, z - 3.5); }
    }
    // plating over the ribs with slots of light (gold, the sun outside)
    for (let i = 0; i < 22; i++) for (let k = 0; k < 9; k++) {
      const a = (k + 0.5) / 9 * Math.PI, z = 24 - i * 7 - 3.5;
      if (z > -12 || (i * 7 + k * 3) % 5 === 0 || (k >= 6 && i % 2 === 0)) continue;   // an open bay over the coupling; slots elsewhere
      b.box(0.3, 7.6, 6.6, iron, -4 + Math.cos(a) * 26.6, Math.sin(a) * 22.6, z, 0, 0, a - Math.PI / 2);
    }
    b.build(W);
    // the drive: shafts into the coupling from above and below, a cradle
    const hang = new THREE.Group(); W.add(hang);
    const cp = buildCoupling(E, hang, { scarred: true });
    const sh = new E.Batch('drive');
    sh.cyl(0.6, 0.6, 24, iron, 0, COUPLING.height + 12, 0, 16);
    sh.box(9, 0.8, 1.2, iron, 0, 0.3, 0); sh.box(1.2, 0.8, 9, iron, 0, 0.3, 0);
    sh.build(W);
    // gold light slots on the floor where the sun comes through the plating
    E.pool('#F3C77A', 5, 0.35, W, -16, 0, -10, { sx: 0.5, sz: 3, soft: 1.8 });
    E.pool('#F3C77A', 4, 0.3, W, 8, 0, -24, { sx: 0.4, sz: 3, soft: 1.8 });
    return { hang, cp, presets: PRESETS };
  },
  update(E, R, t, ctx) {
    const st = R.coupling ?? {};
    ctx.hang.position.set(0, st.y ?? 0.6, 0);
    ctx.hang.rotation.y = (st.turn ?? 0) * Math.PI / 180;
    ctx.cp.set({ ring: st.ring ?? 1, seam: st.seam ?? 0 });
  },
};
