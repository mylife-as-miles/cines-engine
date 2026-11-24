// SCENES 4-6. INT. SHATTERED GATEHOUSE (bible p.6 key 4) / THE BREACH (p.7 key 6, "The open hand"; cover p.1)
// The command post inside the gatehouse (interior x 16..32, z -18..-3, floor y 0, ceiling 8.5). The north wall is
// mostly gone: the breach (x 24.2..31.3, y 0..7.9 at z = -18) looks out on the forecourt, the arch with the boy
// (bearing about 36 deg east of north from the south-west corner), the stair and the city. The whole city is
// instanced through it (same layout), so every through-the-breach shot is real. Lit only from the breach.
// Table: centre [20.4, 0.92, -10.6], 3.4 x 1.25 m, long axis turned 24 deg; seals A/B/C on it (see README).
// Door: west wall, z -10.7..-8.5 (state.door 0..1 swings it). Stretchers come in through it.
import { buildCity, updateCity, cityBeforeRender, CITY_MARKS } from './city.js';
import { L, SEALS, TABLE } from './solforiz.js';

const sealB = [SEALS[1].x, SEALS[1].y, SEALS[1].z];
const boyUnderArch = [L.arch.x, L.arch.z + 0.1];
const PRESETS = {
  // bible p.6 key 4: the frame inside the frame. Cael a shape against the dark, the envoy the one clean cloth.
  gatehouse: {
    state: {
      figures: {
        cael: { pos: [18.95, -9.0], face: [21.6, -11.8], pose: 'stand', lean: 12, reachR: sealB },
        envoy: { pos: [23.1, -12.9], face: [17.5, -7.5], pose: 'stand', look: 'cael.head' },
        boy: { pos: boyUnderArch, face: 200, pose: 'stand' },
      },
      door: 0,
    },
    cam: { pos: [16.75, 1.6, -3.55], target: [25.0, 2.05, -21.5], f: 32 },
  },
  // bible p.7 key 6 (and the cover): Cael in the breach, black against the gun-flash, hand open at the stalled shutter
  openHand: {
    t: 3,
    state: {
      look: 'burning', truce: 'gone', lamps: { level: 0 },
      crown: { shutter: 5.72, fire: 1, through: 0 },
      warp: [{ at: [0, L.crown.opening.y + 1.2, L.crown.z + L.crown.d / 2 + 2], r: 22, amp: 0.6 }],
      figures: { cael: { pos: [29.0, -14.1], face: [0, L.crown.z], pose: 'stand', aimR: [0, L.crown.opening.y + 1, L.crown.z + 32], palmR: 'out', handR: 1, shake: 0.6, blood: 0.7 } },
    },
    cam: { pos: [30.5, 0.9, -11.5], target: [-85.4, 104.3, -323.6], f: 21 },
  },
  // 6.3 the open hand, "it destroys": the insert, matched to 3.4, 10.3 and 10.10
  hand63: {
    state: {
      look: 'burning', truce: 'gone', lamps: { level: 0 }, crown: { shutter: 5.72, fire: 1 },
      figures: { cael: { pos: [29.0, -14.1], face: [0, L.crown.z], aimR: [0, L.crown.opening.y + 1, L.crown.z + 32], palmR: 'out', handR: 1, shake: 0.6, blood: 0.7 } },
      hand: { attach: 'cael', side: 'R', style: 'cael', open: 1, shake: 0.6, blood: 0.7 },
    },
    cam: { hand: true, f: 50 },
  },
  // 4.7 through the breach: the boy, small under the arch
  breachBoy: {
    state: { figures: { boy: { pos: boyUnderArch, face: 200, pose: 'stand' }, cael: { pos: [27.3, -15.8], face: 160, pose: 'stand' } } },
    cam: { pos: [25.2, 1.6, -9.5], target: [L.arch.x, 2.4, L.arch.z], f: 85 },
  },
};

export default {
  look: 'gatehouse',
  marks: { ...CITY_MARKS, table: [TABLE.x, TABLE.h, TABLE.z], sealA: [SEALS[0].x, SEALS[0].y, SEALS[0].z], sealB, sealC: [SEALS[2].x, SEALS[2].y, SEALS[2].z],
    door: [16, 0, -9.6], breachCentre: [27.8, 3.5, -18], stretcherA: [29.0, -6.2], stretcherB: [26.2, -5.0], boyUnderArch: [...boyUnderArch] },
  build(E, o = {}) { const ctx = buildCity(E, { ...o, interior: true }); ctx.presets = PRESETS; ctx.interior = { min: [15.4, -1, -18.7], max: [32.6, 8.6, -2.4], fill: 0.02 }; return ctx; },
  update(E, R, t, ctx) { updateCity(E, R, t, ctx); },
  beforeRender: cityBeforeRender,
};
