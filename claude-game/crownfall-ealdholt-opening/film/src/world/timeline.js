// The film's single source of timing: the shots, the hour the sky stands at, and the camera in every frame.
//
// The film is shot in the game's own village (tools/shoot.mjs), so there is no lighting or grading here: the look is
// the game's. What this file decides is where the camera is, what it looks at, and what time of the village's
// morning it is.
//
// The low run and the climb through the crowns are the camera moves of FIRST BLOOM (github.com/Leonxlnx/first-bloom,
// src/world/timeline.js), which the creator asked for, re-plotted on Ealdholt's ground and cut at its times. The
// opening (the watch) and everything after the climb (the spiral round the church, the rise, the title) are this
// film's own.
import * as THREE from 'three';
import * as L from './layout.js';
import { groundFromGrid } from './ground.js';
import { key, smoothstep, lerp, easeInOut, easeOut, shake, clamp01 } from './keys.js';

export const TIMES = {
  cut2: 4.6,         // the low run begins
  join: 7.52,        // it joins first-bloom's run (which begins here in first-bloom)
  pond: 10.55, hop: 11.77, sunward: 12.09,
  skim: 12.5,        // over the treetops (the row between the pond and the long houses stands about 15 m)
  dive: 13.9,        // past the last tall tree, down into the lane between the long houses
  lane: 14.5,
  cut3: 15.4,        // the climb through the crowns
  cut4: 16.79,       // the spiral begins: the swoop down on the church
  cut5: 20.72,       // round the towers
  cut6: 23.7,        // drawing back and up to the last frame
  title: 25.3,       // the dark gathers for the title (tools/title.html)
  end: 30.0,
};

export const SHOTS = [
  { id: 'watch', start: 0, end: TIMES.cut2 },
  { id: 'run', start: TIMES.cut2, end: TIMES.cut3 },
  { id: 'canopy', start: TIMES.cut3, end: TIMES.cut4 },
  { id: 'swoop', start: TIMES.cut4, end: TIMES.cut5 },
  { id: 'flyby', start: TIMES.cut5, end: TIMES.cut6 },
  { id: 'rise', start: TIMES.cut6, end: TIMES.end + 1 },
];
export function shotAt(t) {
  for (const s of SHOTS) if (t >= s.start && t < s.end) return { id: s.id, t0: s.start, t1: s.end, local: t - s.start };
  return { id: 'rise', t0: TIMES.cut6, t1: TIMES.end, local: t - TIMES.cut6 };
}

// The hour, as the minute of the village's day. The sun in the game rises at 06:00 a little south of east and is
// warm until mid-morning. The first shot runs the last of the night into sunrise (05:48 to 06:16); the film then
// cuts to the full morning (07:08) and stays in it: time inside a shot barely moves, as it would for someone there.
export function minuteAt(t) {
  const T = TIMES;
  return key([[0, 350], [2.2, 361], [T.cut2 - 0.001, 378],
    [T.cut2, 426], [T.cut3 - 0.001, 436], [T.cut3, 436], [T.cut4 - 0.001, 438],
    [T.cut4, 444], [T.end, 453]], t);
}

const DEG = Math.PI / 180;

export function makeFilm(grid) {
  const { heightAt: H, pondY } = groundFromGrid(grid);
  const runCurve = new THREE.CatmullRomCurve3([...L.RUN_LEAD, ...L.RUN_PLAN].map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  // where along the whole run the lead ends: the fractions in layout.js are of first-bloom's part only
  const joinU = (() => { let best = 0, d = Infinity; for (let i = 0; i <= 2000; i++) { const p = runCurve.getPointAt(i / 2000), e = Math.hypot(p.x - L.RUN_PLAN[0][0], p.z - L.RUN_PLAN[0][1]); if (e < d) { d = e; best = i / 2000; } } return best; })();
  const part = u => joinU + u * (1 - joinU);
  const groveCurve = new THREE.CatmullRomCurve3(L.GROVE_PLAN.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const out = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 40, roll: 0, near: 0.15, reach: 40 };
  const U = L.RUN_U, T = TIMES;
  const runU = t => key([[T.cut2, 0.0], [T.join, joinU], [T.pond, part(U.pond)], [T.hop - 0.19, part(U.stream)], [T.sunward, part(U.sunward)], [T.cut3, part(U.grove)], [T.cut3 + 0.2, 1.0]], t);

  // ---- the opening: the watch before dawn. From the dark under the trees on the pond's far shore, low over the
  // still water toward the sleeping houses; the sky pales, then the sun's rim clears the trees and the light runs
  // across the water toward the lens.
  function watch(t) {
    const W = L.WATCH, s = clamp01(t / T.cut2), e = easeInOut(Math.pow(s, 1.15));
    out.pos.set(lerp(W.from[0], W.to[0], e), lerp(W.from[1], W.to[1], e), lerp(W.from[2], W.to[2], e));
    const sk = shake(t * 0.35, 11);
    out.pos.x += sk[0] * 0.03; out.pos.y += sk[1] * 0.025;
    out.target.set(lerp(W.look[0][0], W.look[1][0], e), lerp(W.look[0][1], W.look[1][1], e), lerp(W.look[0][2], W.look[1][2], e));
    out.roll = sk[2] * 0.0015; out.fov = lerp(W.fov[0], W.fov[1], e); out.near = 0.3; out.reach = 75;
    return out;
  }

  // ---- the low run: round the churchyard by its lanes (this film's lead), then first-bloom's FPV: up the fenced lane,
  // through the compound's gate, over the pond and a hop over its fence (so far first-bloom's), then this film's own
  // leap: up over the row of trees east of the pond, along their tops toward the mountains and the sun, and a dive
  // into the lane between the long houses
  function run(t) {
    const u = runU(t);
    runCurve.getPointAt(clamp01(u), tmp);
    const ahead = runCurve.getPointAt(clamp01(u + 0.03), tmp2.clone());
    const clear = key([[T.cut2, 2.1], [T.join - 0.4, 2.0], [T.join + 0.3, 1.2], [T.pond - 0.5, 1.0], [T.pond + 0.2, 0.5], [T.hop - 0.3, 0.5], [T.hop, 3.0], [T.skim, 15.2], [T.dive, 16.2], [T.lane, 3.0], [T.cut3, 2.2]], t);
    out.pos.set(tmp.x, H(tmp.x, tmp.z) + clear, tmp.z);
    const sk = shake(t * 1.4, 3);
    out.pos.x += sk[0] * 0.04; out.pos.y += sk[1] * 0.035; out.pos.z += sk[2] * 0.04;
    // off the pond the lens lifts with the leap, looks out over the treetops at the mountains and the sun, tips down
    // into the dive and levels out in the lane
    const pitch = key([[T.cut2, -3], [T.join, -4], [9.55, -7], [T.hop - 0.19, -5], [T.hop + 0.15, 9], [T.skim, -5], [T.dive - 0.1, -9], [T.dive + 0.3, -33], [T.lane, -8], [T.lane + 0.3, -1], [T.cut3, -1]], t) * DEG;
    const dir = new THREE.Vector3(ahead.x - tmp.x, 0, ahead.z - tmp.z).normalize();
    out.target.copy(out.pos).add(dir.multiplyScalar(10)); out.target.y += Math.tan(pitch) * 10;
    const a0 = runCurve.getTangentAt(clamp01(u)), a1 = runCurve.getTangentAt(clamp01(u + 0.02));
    const turn = Math.atan2(a0.x * a1.z - a0.z * a1.x, a0.x * a1.x + a0.z * a1.z);
    out.roll = THREE.MathUtils.clamp(turn * 3, -0.07, 0.07) + sk[2] * 0.008;
    out.fov = 62; out.near = 0.1; out.reach = 36;
    // the water ride: just above the pond, looking a little down at the sky it mirrors
    const w = smoothstep(T.pond - 0.25, T.pond + 0.25, t) * (1 - smoothstep(T.hop - 0.29, T.hop - 0.05, t));
    if (w > 0) {
      const py = Math.max(H(out.pos.x, out.pos.z) + 0.3, pondY + 0.55);
      const look = out.target.clone().sub(out.pos); look.y = lerp(look.y, Math.tan(-6 * DEG) * 10, w);
      out.pos.y = lerp(out.pos.y, py, w);
      out.target.copy(out.pos).add(look);
      out.roll *= 1 - 0.6 * w;
    }
    return out;
  }

  // ---- the climb through the crowns, continuing the run
  function canopy(t) {
    const u = key([[T.cut3, 0.0], [T.cut4, 1.0]], t);
    groveCurve.getPointAt(clamp01(u), tmp);
    const clear = key([[T.cut3, 2.1], [T.cut3 + 0.6, 16], [T.cut4, 23]], t);
    out.pos.set(tmp.x, H(tmp.x, tmp.z) + clear, tmp.z);
    const sk = shake(t * 1.6, 5);
    out.pos.x += sk[0] * 0.06; out.pos.y += sk[1] * 0.05;
    const dir = groveCurve.getTangentAt(clamp01(Math.min(u + 0.05, 1)));
    const pitch = key([[T.cut3, 5], [T.cut3 + 0.35, 25], [T.cut3 + 0.8, 4], [T.cut4, -2]], t) * DEG;
    out.target.copy(out.pos).add(new THREE.Vector3(dir.x, 0, dir.z).normalize().multiplyScalar(10)); out.target.y += Math.tan(pitch) * 10;
    out.roll = sk[2] * 0.015; out.fov = 64; out.near = 0.1; out.reach = 36;
    return out;
  }

  // ---- the spiral: one flight from the top of the climb to the last frame. It swoops down on the church out of the
  // east, whips round the towers above the crowns (north about, to the south-west), then draws back and up, slowing,
  // until Ealdholt lies in its woods under the mountain and the dark of the title gathers. The cuts at cut5 and cut6
  // fall inside it and are not seen. Bearings are degrees about the church (0 = east, 90 = south).
  const churchGround = H(L.CHURCH.x, L.CHURCH.z);
  const S = L.SPIRAL;
  const spiralAt = (t) => {
    const th = key(S.bearing, t) * DEG, r = key(S.radius, t), h = key(S.height, t);
    return [L.CHURCH.x + Math.cos(th) * r, churchGround + h, L.CHURCH.z + Math.sin(th) * r];
  };
  function spiral(t) {
    const p = spiralAt(t), q = spiralAt(t + 0.05);
    out.pos.set(p[0], p[1], p[2]);
    const sk = shake(t * 0.9, 7); out.pos.y += sk[1] * 0.07;
    // the lens holds the church's roof, led a little along the flight while it is still far out, and lifts to the
    // mountain as the camera draws back
    const lead = key(S.lead, t), away = easeInOut(clamp01((t - S.lift[0]) / (S.lift[1] - S.lift[0])));
    const vx = q[0] - p[0], vz = q[2] - p[2], vn = Math.hypot(vx, vz) || 1;
    out.target.set(L.CHURCH.x + vx / vn * lead, churchGround + L.CHURCH.top * 0.9, L.CHURCH.z + vz / vn * lead);
    out.target.lerp(tmp.set(S.last[0], S.last[1], S.last[2]), away);
    // banked into the turn, by how fast the bearing is changing
    const rate = (key(S.bearing, t + 0.05) - key(S.bearing, t - 0.05)) / 0.1;       // degrees a second
    out.roll = THREE.MathUtils.clamp(rate * 0.0034, -0.2, 0.2) + sk[2] * 0.006;
    out.fov = key(S.fov, t); out.near = 0.4; out.reach = 70;
    return out;
  }

  const rigs = { watch, run, canopy, swoop: spiral, flyby: spiral, rise: spiral };
  const fwd = new THREE.Vector3();
  return {
    runCurve, groveCurve, heightAt: H, pondY, joinU, runU,
    /** The camera and the hour at film time t (seconds): plain arrays, ready for the game's film hook. */
    at(t) {
      const c = rigs[shotAt(t).id](t);
      fwd.copy(c.target).sub(c.pos).normalize();
      // the point the game centres its shadows and detail on: a reach ahead of the lens (the look-at point itself for
      // the shots that hold a subject)
      const focus = c.pos.clone().addScaledVector(fwd, c.reach);
      return { pos: c.pos.toArray(), target: c.target.toArray(), roll: c.roll, fov: c.fov, near: c.near, focus: focus.toArray(), minute: minuteAt(t), cloud: 0.34 };
    },
  };
}
